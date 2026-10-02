/**
 * Account V2, Пакет 8M — списки сохранённых карточек при серверном слиянии аккаунтов.
 *
 * зачем: после 8H/8H-2 списки карточек живут в подколлекции users/{id}/flashcard_pages,
 * а поле progress.<ключ> в документе = null (или отсутствует). Старое поле-за-полем
 * слияние (mergeUserProgress) видело у победителя null/отсутствие и подставляло СПИСОК
 * проигравшего прямо в документ победителя — затеняющая копия: restore берёт поле
 * документа вместо страниц, и человек терял новые карточки / получал удалённые.
 *
 * Здесь:
 *  - чистый план объединения: карточки победителя (страницы ∪ поле документа) + карточки
 *    проигравшего, которых у победителя нет (по id, как клиентский 8J);
 *  - шаг outbox-джоба, который ДО публикации слияния пишет объединение в страницы
 *    победителя тем же форматом, что клиент (writeFlashcardPages), одной транзакцией;
 *  - решение для транзакции публикации, какие поля документа можно обнулить: только
 *    если объединение записано ЭТИМ проходом джоба и поле победителя не менялось с тех пор.
 *
 * Журнал удалений карточек — клиентский (7D), серверу недоступен. Поэтому карточка,
 * удалённая на одном аккаунте и живая на другом, после слияния «воскреснет». Это
 * сознательный выбор: воскрешение исправимо одним свайпом, потеря — нет.
 *
 * Логи: префикс [AUTH-MERGE], без uid и без содержимого карточек (только счётчики).
 */
import { createHash } from 'crypto';

const LOG = '[AUTH-MERGE]';
const USERS = 'users';
const ACCOUNT_DELETE_TOMBSTONES_COLLECTION = 'account_deletion_tombstones';

/** Подколлекция страниц (как app/flashcards_cloud_pages.ts FLASHCARD_PAGES_COLLECTION). */
export const FLASHCARD_PAGES_COLLECTION = 'flashcard_pages';
/** Карточек на страницу — как у клиента (CARDS_PER_PAGE). */
export const FLASHCARD_CARDS_PER_PAGE = 200;
/**
 * Потолок байт сериализованных карточек на одну страницу.
 * зачем: лимит документа Firestore 1 МиБ; клиент считает худший случай 200×2105 Б ≈ 410 КБ.
 * Сервер страхуется явно — страница закрывается раньше, если карточки крупнее обычного.
 */
export const FLASHCARD_PAGE_MAX_BYTES = 700_000;
/**
 * Потолок байт всех страниц, записываемых одной транзакцией.
 * зачем: запрос коммита Firestore ограничен ~10 МиБ; 8 МБ оставляет запас на служебное.
 * Не помещается — язык пропускается целиком (поле документа не обнуляется, ничего не теряем).
 */
export const FLASHCARD_MERGE_TX_MAX_BYTES = 8_000_000;
/** Сколько страниц одной стороны читаем максимум (самый тяжёлый аккаунт ≈ 14). */
export const FLASHCARD_MERGE_MAX_PAGES_PER_SIDE = 100;

export type FlashcardMergeTarget = 'en' | 'fr';

export type FlashcardListKeySpec = Readonly<{
  key: string;
  target: FlashcardMergeTarget;
  role: 'primary' | 'legacy';
}>;

/**
 * Ключи progress, хранящие СПИСОК сохранённых карточек.
 * primary — как app/flashcards_cloud_upload.ts FLASHCARD_CLOUD_KEYS
 *   (flashcardsSavedKey('fr') = targetKey('flashcards','fr','flashcards_v1')).
 * legacy  — древний двойник английского списка: restore берёт его, только если
 *   flashcards_v1 в документе нет вовсе и страниц нет (клиент 1.6.25+), а клиент 1.6.24 —
 *   всякий раз, когда flashcards_v1 «ложно» (null/пусто), ПОВЕРХ страниц. Поэтому после
 *   слияния он тоже обнуляется — но только если его карточки вошли в объединение (ревью C-1).
 */
export const FLASHCARD_LIST_KEY_SPECS: readonly FlashcardListKeySpec[] = [
  { key: 'flashcards_v1', target: 'en', role: 'primary' },
  { key: 'flashcards_v2::fr::flashcards_v1', target: 'fr', role: 'primary' },
  { key: 'flashcards', target: 'en', role: 'legacy' },
];

export const FLASHCARD_LIST_PROGRESS_KEYS: ReadonlySet<string> = new Set(
  FLASHCARD_LIST_KEY_SPECS.map((spec) => spec.key),
);

const TARGETS: readonly FlashcardMergeTarget[] = ['en', 'fr'];

type ProgressLike = Readonly<Record<string, unknown>> | undefined;

export type FlashcardPageDoc = Readonly<{ id: string; data: Readonly<Record<string, unknown>> }>;

/** Вид значения поля для логов: без содержимого. */
export function describeFlashcardField(progress: ProgressLike, key: string): 'field' | 'null' | 'absent' {
  const value = progress?.[key];
  if (value === undefined) return 'absent';
  if (value === null) return 'null';
  return 'field';
}

/**
 * Отпечаток поля победителя: шаг outbox запоминает его, транзакция публикации сверяет.
 * зачем: обнулять поле можно, только если его содержимое уже вошло в записанные страницы.
 */
export function flashcardFieldFingerprint(value: unknown): string {
  if (value === undefined) return 'absent';
  if (value === null) return 'null';
  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  return `h:${createHash('sha256').update(raw).digest('hex').slice(0, 32)}`;
}

/** Идентичность карточки — как app/flashcard_pages_read_result.ts cardIdentity. */
function cardIdentity(card: unknown): string {
  const id = (card as { id?: unknown } | null)?.id;
  return typeof id === 'string' && id.length > 0 ? `id:${id}` : `json:${JSON.stringify(card)}`;
}

type ParsedList = { ok: true; cards: unknown[] } | { ok: false };

function parseListValue(value: unknown): ParsedList {
  if (value === undefined || value === null) return { ok: true, cards: [] };
  if (Array.isArray(value)) return { ok: true, cards: value };
  if (typeof value !== 'string') return { ok: false };
  if (value.trim() === '') return { ok: true, cards: [] };
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? { ok: true, cards: parsed } : { ok: false };
  } catch {
    // зачем без лога здесь: причина печатается вызывающим (side/key/reason=field_unparsable).
    return { ok: false };
  }
}

function pageBelongsToTarget(page: FlashcardPageDoc, target: FlashcardMergeTarget): boolean {
  if (page.data.target === target) return true;
  return page.data.target === undefined && page.id.startsWith(`${target}_`);
}

type SideCards =
  | {
    ok: true; cards: unknown[]; pages: number; fromPages: number; fromField: number; fromLegacy: number;
    /** Древнее поле стороны целиком вошло в объединение (или его нет / оно пустое). */
    legacyCovered: boolean;
  }
  | { ok: false; reason: string };

/**
 * Все карточки одной стороны для языка: страницы ∪ поле документа (∪ древнее поле,
 * всегда, если разбирается — см. ревью C-1 ниже).
 * зачем объединение, а не «что выбрал бы restore»: страница и поле могли разойтись
 * (затеняющая копия из прошлого слияния) — берём обе, чтобы ничего не потерять.
 */
function collectSideCards(
  progress: ProgressLike,
  pages: readonly FlashcardPageDoc[],
  target: FlashcardMergeTarget,
  side: 'winner' | 'loser',
): SideCards {
  const own = pages
    .filter((page) => pageBelongsToTarget(page, target))
    .map((page) => ({ page, index: typeof page.data.index === 'number' ? page.data.index : Number.NaN }))
    .sort((a, b) => (a.index - b.index) || a.page.id.localeCompare(b.page.id));
  const fromPages: unknown[] = [];
  for (const { page } of own) {
    const raw = page.data.cards;
    const parsed = typeof raw === 'string' ? parseListValue(raw) : { ok: false as const };
    if (!parsed.ok) return { ok: false, reason: `${side}_page_unusable` };
    fromPages.push(...parsed.cards);
  }
  const primary = FLASHCARD_LIST_KEY_SPECS.find((spec) => spec.target === target && spec.role === 'primary');
  const field = parseListValue(primary ? progress?.[primary.key] : undefined);
  if (!field.ok) return { ok: false, reason: `${side}_field_unparsable` };
  // зачем (ревью 8M, C-1): древний список берём ВСЕГДА, когда он разбирается, — не только
  // по правилу restore («flashcards_v1 нет и страниц нет»). Иначе при обнулении `flashcards`
  // у победителя с flashcards_v1=null/'[]'/страницами единственная копия этих карточек
  // уничтожалась бы. Воскрешение по id принято политикой пакета; потеря — нет.
  // Неразборный древний список язык не роняет: он просто не входит, и поле не обнуляется
  // (legacyCovered=false → публикация оставит его как было).
  let fromLegacy: unknown[] = [];
  let legacyCovered = true;
  const legacy = FLASHCARD_LIST_KEY_SPECS.find((spec) => spec.target === target && spec.role === 'legacy');
  if (legacy) {
    const legacyParsed = parseListValue(progress?.[legacy.key]);
    if (legacyParsed.ok) {
      fromLegacy = legacyParsed.cards;
    } else {
      legacyCovered = false;
      console.warn(`${LOG} flashcard_lists target=${target} side=${side} legacy=unparsable decision=not_merged_field_kept`);
    }
  }
  return {
    ok: true,
    cards: [...fromPages, ...field.cards, ...fromLegacy],
    pages: own.length,
    fromPages: fromPages.length,
    fromField: field.cards.length,
    fromLegacy: fromLegacy.length,
    legacyCovered,
  };
}

/** Объединение без дублей: сначала карточки победителя, затем недостающие у него карточки проигравшего. */
export function unionFlashcards(
  winnerCards: readonly unknown[],
  loserCards: readonly unknown[],
): { cards: unknown[]; loserAdded: number } {
  const seen = new Set<string>();
  const cards: unknown[] = [];
  for (const card of winnerCards) {
    const identity = cardIdentity(card);
    if (seen.has(identity)) continue;
    seen.add(identity);
    cards.push(card);
  }
  let loserAdded = 0;
  for (const card of loserCards) {
    const identity = cardIdentity(card);
    if (seen.has(identity)) continue;
    seen.add(identity);
    cards.push(card);
    loserAdded += 1;
  }
  return { cards, loserAdded };
}

/** Страницы по ≤200 карточек и ≤FLASHCARD_PAGE_MAX_BYTES; null — одна карточка крупнее страницы. */
export function chunkFlashcardsForPages(cards: readonly unknown[]): string[] | null {
  const pages: string[] = [];
  let current: string[] = [];
  let currentBytes = 2;
  for (const card of cards) {
    const serialized = JSON.stringify(card);
    const bytes = Buffer.byteLength(serialized, 'utf8') + 1;
    if (bytes + 2 > FLASHCARD_PAGE_MAX_BYTES) return null;
    if (current.length >= FLASHCARD_CARDS_PER_PAGE || currentBytes + bytes > FLASHCARD_PAGE_MAX_BYTES) {
      pages.push(`[${current.join(',')}]`);
      current = [];
      currentBytes = 2;
    }
    current.push(serialized);
    currentBytes += bytes;
  }
  if (current.length > 0) pages.push(`[${current.join(',')}]`);
  return pages;
}

/** Идентификатор страницы — как клиентский flashcardPageDocId. */
export function flashcardMergePageDocId(target: FlashcardMergeTarget, index: number): string {
  return `${target}_${String(index).padStart(4, '0')}`;
}

export type FlashcardTargetPlan =
  | Readonly<{
    status: 'merged';
    target: FlashcardMergeTarget;
    pages: readonly Readonly<{ id: string; index: number; count: number; cards: string }>[];
    staleIds: readonly string[];
    bytes: number;
    winnerCards: number;
    loserAdded: number;
    total: number;
    /** Древнее поле ПОБЕДИТЕЛЯ вошло в объединение — только тогда его можно обнулить. */
    winnerLegacyCovered: boolean;
  }>
  | Readonly<{ status: 'empty'; target: FlashcardMergeTarget; winnerLegacyCovered: boolean }>
  | Readonly<{ status: 'unchanged'; target: FlashcardMergeTarget; total: number; winnerLegacyCovered: boolean }>
  | Readonly<{ status: 'skipped'; target: FlashcardMergeTarget; reason: string }>;

export type FlashcardListsMergePlanInput = Readonly<{
  winnerProgress: ProgressLike;
  loserProgress: ProgressLike;
  winnerPages: readonly FlashcardPageDoc[];
  loserPages: readonly FlashcardPageDoc[];
}>;

function countFromJson(raw: string): number {
  return (JSON.parse(raw) as unknown[]).length;
}

/**
 * Чистый план: что записать в страницы победителя по каждому языку.
 * 'unchanged' — у победителя уже ровно эти карточки в страницах и в поле ничего лишнего
 * (повторный проход джоба): ничего не пишем, но поле обнулять можно.
 */
export function planFlashcardListsMerge(input: FlashcardListsMergePlanInput): FlashcardTargetPlan[] {
  const plans: FlashcardTargetPlan[] = [];
  let txBytes = 0;
  for (const target of TARGETS) {
    const winnerSide = collectSideCards(input.winnerProgress, input.winnerPages, target, 'winner');
    if (!winnerSide.ok) {
      plans.push({ status: 'skipped', target, reason: winnerSide.reason });
      continue;
    }
    const loserSide = collectSideCards(input.loserProgress, input.loserPages, target, 'loser');
    if (!loserSide.ok) {
      plans.push({ status: 'skipped', target, reason: loserSide.reason });
      continue;
    }
    const union = unionFlashcards(winnerSide.cards, loserSide.cards);
    if (union.cards.length === 0) {
      plans.push({ status: 'empty', target, winnerLegacyCovered: winnerSide.legacyCovered });
      continue;
    }
    const chunks = chunkFlashcardsForPages(union.cards);
    if (!chunks) {
      plans.push({ status: 'skipped', target, reason: 'card_too_large' });
      continue;
    }
    const winnerTargetPages = input.winnerPages.filter((page) => pageBelongsToTarget(page, target));
    const sameLayout = winnerTargetPages.length === chunks.length
      && chunks.every((cards, index) => winnerTargetPages.some((page) => (
        page.id === flashcardMergePageDocId(target, index) && page.data.cards === cards
      )));
    if (sameLayout) {
      // зачем: повторный проход джоба — страницы победителя уже ровно это объединение;
      // лишние записи не делаем (Firebase-экономия), но поле документа обнулять можно.
      plans.push({ status: 'unchanged', target, total: union.cards.length, winnerLegacyCovered: winnerSide.legacyCovered });
      continue;
    }
    const bytes = chunks.reduce((sum, chunk) => sum + Buffer.byteLength(chunk, 'utf8'), 0);
    if (txBytes + bytes > FLASHCARD_MERGE_TX_MAX_BYTES) {
      plans.push({ status: 'skipped', target, reason: 'too_large_for_transaction' });
      continue;
    }
    txBytes += bytes;
    const pages = chunks.map((cards, index) => ({
      id: flashcardMergePageDocId(target, index),
      index,
      count: countFromJson(cards),
      cards,
    }));
    const newIds = new Set(pages.map((page) => page.id));
    const staleIds = input.winnerPages
      .filter((page) => pageBelongsToTarget(page, target) && !newIds.has(page.id))
      .map((page) => page.id);
    plans.push({
      status: 'merged',
      target,
      pages,
      staleIds,
      bytes,
      winnerCards: union.cards.length - union.loserAdded,
      loserAdded: union.loserAdded,
      total: union.cards.length,
      winnerLegacyCovered: winnerSide.legacyCovered,
    });
  }
  return plans;
}

export type FlashcardListsMergeRecord = Readonly<{
  leaseToken: string;
  mergedAt: number;
  targets: Readonly<Record<string, Readonly<{
    status: string; reason?: string; total?: number; loserAdded?: number; winnerLegacyCovered?: boolean;
  }>>>;
  winnerFieldFingerprints: Readonly<Record<string, string>>;
}>;

/**
 * Какие ключи списков транзакция публикации может обнулить в документе победителя.
 * Условия (все): запись outbox сделана ЭТИМ проходом джоба (leaseToken), язык ключа
 * объединён в страницы (merged/unchanged/empty), поле победителя не менялось с шага.
 * Не выполнено — ключ остаётся как был у победителя (список проигравшего не берётся никогда).
 */
export function confirmedFlashcardKeysToNull(
  record: unknown,
  leaseToken: string | null | undefined,
  winnerProgress: ProgressLike,
): Set<string> {
  const out = new Set<string>();
  const data = record as Partial<FlashcardListsMergeRecord> | null | undefined;
  if (!data || typeof data !== 'object') {
    console.log(`${LOG} flashcard_lists null_confirm=none reason=no_merge_record`);
    return out;
  }
  if (!leaseToken || data.leaseToken !== leaseToken) {
    console.log(`${LOG} flashcard_lists null_confirm=none reason=stale_merge_record`);
    return out;
  }
  for (const spec of FLASHCARD_LIST_KEY_SPECS) {
    const status = data.targets?.[spec.target]?.status ?? 'missing';
    const recorded = data.winnerFieldFingerprints?.[spec.key];
    const current = flashcardFieldFingerprint(winnerProgress?.[spec.key]);
    if (status !== 'merged' && status !== 'unchanged' && status !== 'empty') {
      console.log(`${LOG} flashcard_lists key=${spec.key} null_confirm=no reason=target_${status}`);
      continue;
    }
    if (recorded !== current) {
      console.log(`${LOG} flashcard_lists key=${spec.key} null_confirm=no reason=winner_field_changed_since_pages`);
      continue;
    }
    // зачем (ревью 8M, C-1): древнее поле обнуляем, только если его карточки реально
    // вошли в объединение (флаг шага); иначе обнуление уничтожило бы единственную копию.
    if (spec.role === 'legacy' && data.targets?.[spec.target]?.winnerLegacyCovered !== true) {
      console.log(`${LOG} flashcard_lists key=${spec.key} null_confirm=no reason=legacy_not_in_union`);
      continue;
    }
    out.add(spec.key);
  }
  return out;
}

type MinimalDb = FirebaseFirestore.Firestore;

export type FlashcardListsMergeStepResult = Readonly<{
  plans: readonly FlashcardTargetPlan[];
}>;

/**
 * Шаг outbox-джоба (до публикации слияния): объединение карточек в страницах победителя.
 * Одна транзакция: чтения (outbox, оба документа, удаление, страницы обеих сторон) →
 * запись страниц победителя + отметка в outbox. Страницы проигравшего и его документ
 * НЕ трогаются — при любом сбое данные проигравшего остаются целы для повтора.
 */
export async function mergeFlashcardListsIntoWinnerPages(
  db: MinimalDb,
  params: Readonly<{
    winner: string;
    loser: string;
    outboxRef: FirebaseFirestore.DocumentReference;
    leaseToken: string;
    now: number;
  }>,
): Promise<FlashcardListsMergeStepResult> {
  const { winner, loser, outboxRef, leaseToken, now } = params;
  const started = Date.now();
  const winnerRef = db.collection(USERS).doc(winner); // guard-ok: ссылки; чтение страниц ниже с limit() в транзакции
  const loserRef = db.collection(USERS).doc(loser); // guard-ok: ссылки; чтение страниц ниже с limit() в транзакции
  const winnerPagesCol = db.collection(`${USERS}/${winner}/${FLASHCARD_PAGES_COLLECTION}`); // guard-ok: ссылки; чтение страниц ниже с limit() в транзакции
  const loserPagesCol = db.collection(`${USERS}/${loser}/${FLASHCARD_PAGES_COLLECTION}`); // guard-ok: ссылки; чтение страниц ниже с limit() в транзакции
  return db.runTransaction(async (tx) => {
    const [outboxSnap, winnerSnap, loserSnap, winnerTomb, loserTomb, winnerPagesSnap, loserPagesSnap] =
      await Promise.all([
        tx.get(outboxRef),
        tx.get(winnerRef),
        tx.get(loserRef),
        tx.get(db.collection(ACCOUNT_DELETE_TOMBSTONES_COLLECTION).doc(winner)),
        tx.get(db.collection(ACCOUNT_DELETE_TOMBSTONES_COLLECTION).doc(loser)),
        tx.get(winnerPagesCol.limit(FLASHCARD_MERGE_MAX_PAGES_PER_SIDE + 1)),
        tx.get(loserPagesCol.limit(FLASHCARD_MERGE_MAX_PAGES_PER_SIDE + 1)),
      ]);
    if (!outboxSnap.exists || outboxSnap.data()?.leaseToken !== leaseToken) {
      throw new Error('account_merge_outbox_lease_lost');
    }
    if (!winnerSnap.exists || !loserSnap.exists) throw new Error('account_merge_flashcards_identity_missing');
    if (winnerTomb.exists || loserTomb.exists) throw new Error('account_merge_flashcards_delete_pending');
    if (winnerPagesSnap.size > FLASHCARD_MERGE_MAX_PAGES_PER_SIDE
      || loserPagesSnap.size > FLASHCARD_MERGE_MAX_PAGES_PER_SIDE) {
      throw new Error('account_merge_flashcards_too_many_pages');
    }
    const toPages = (snap: FirebaseFirestore.QuerySnapshot): FlashcardPageDoc[] =>
      snap.docs.map((doc) => ({ id: doc.id, data: (doc.data() ?? {}) as Record<string, unknown> }));
    const winnerProgress = (winnerSnap.data()?.progress ?? undefined) as ProgressLike;
    const loserProgress = (loserSnap.data()?.progress ?? undefined) as ProgressLike;
    const plans = planFlashcardListsMerge({
      winnerProgress,
      loserProgress,
      winnerPages: toPages(winnerPagesSnap),
      loserPages: toPages(loserPagesSnap),
    });

    const targets: Record<string, {
      status: string; reason?: string; total?: number; loserAdded?: number; winnerLegacyCovered?: boolean;
    }> = {};
    for (const plan of plans) {
      if (plan.status === 'merged') {
        for (const page of plan.pages) {
          // зачем ровно эти поля: формат клиентского writeFlashcardPages — restore любого клиента читает их.
          tx.set(winnerPagesCol.doc(page.id), { // guard-ok: запись внутри runTransaction; merge:false = формат клиента writeFlashcardPages
            target: plan.target,
            index: page.index,
            count: page.count,
            cards: page.cards,
            updatedAt: now,
          }, { merge: false });
        }
        for (const staleId of plan.staleIds) tx.delete(winnerPagesCol.doc(staleId)); // guard-ok: внутри runTransaction
        targets[plan.target] = {
          status: 'merged', total: plan.total, loserAdded: plan.loserAdded, winnerLegacyCovered: plan.winnerLegacyCovered,
        };
        console.log(`${LOG} flashcard_lists target=${plan.target} decision=merged winner_cards=${plan.winnerCards} loser_added=${plan.loserAdded} total=${plan.total} pages=${plan.pages.length} stale_removed=${plan.staleIds.length} bytes=${plan.bytes}`);
      } else if (plan.status === 'skipped') {
        targets[plan.target] = { status: 'skipped', reason: plan.reason };
        // Ранний выход по языку: страницы не пишем, поле документа не обнулится.
        console.warn(`${LOG} flashcard_lists target=${plan.target} decision=skipped reason=${plan.reason}`);
      } else if (plan.status === 'unchanged') {
        targets[plan.target] = { status: 'unchanged', total: plan.total, winnerLegacyCovered: plan.winnerLegacyCovered };
        console.log(`${LOG} flashcard_lists target=${plan.target} decision=unchanged total=${plan.total}`);
      } else {
        targets[plan.target] = { status: 'empty', winnerLegacyCovered: plan.winnerLegacyCovered };
        console.log(`${LOG} flashcard_lists target=${plan.target} decision=empty`);
      }
    }
    const winnerFieldFingerprints: Record<string, string> = {};
    for (const spec of FLASHCARD_LIST_KEY_SPECS) {
      winnerFieldFingerprints[spec.key] = flashcardFieldFingerprint(winnerProgress?.[spec.key]);
      console.log(`${LOG} flashcard_lists key=${spec.key} winner=${describeFlashcardField(winnerProgress, spec.key)} loser=${describeFlashcardField(loserProgress, spec.key)} target_status=${targets[spec.target]?.status ?? 'missing'}`);
    }
    const record: FlashcardListsMergeRecord = { leaseToken, mergedAt: now, targets, winnerFieldFingerprints };
    tx.set(outboxRef, { flashcardListsMerge: record, updatedAt: now }, { merge: true });
    console.log(`${LOG} flashcard_lists step=done ms=${Date.now() - started}`);
    return { plans };
  });
}
