/**
 * Account V2, Пакет 8J — чтение страниц карточек с ТРЁХЗНАЧНЫМ результатом и
 * локальный замок записи страниц до подтверждённого чтения.
 *
 * зачем: прежний readFlashcardPages (app/flashcards_cloud_pages.ts) отдаёт null и
 * при «страниц нет», и при ошибке/офлайне. После 8H-2 restore обнулённого аккаунта
 * зависит ТОЛЬКО от страниц: сорвалось чтение → restore считал «карточек нет», а первая
 * же новая карточка уезжала в writeFlashcardPages списком из одной карточки — хвост
 * страниц удалялся в том же батче. Потеря всех карточек одним тапом.
 *
 * Поэтому restore читает через readFlashcardPagesResult и различает:
 *   ok    — страницы есть, подтверждены сервером;
 *   empty — сервер подтвердил: страниц нет (обычный путь «нового» аккаунта);
 *   error — сеть/права/кэш без сервера/битые страницы: правды мы не знаем.
 * На error ключ запирается (lockFlashcardPagesWrite): doSyncToCloud не пишет ни
 * страницы, ни поле документа этого ключа, пока следующий restore не прочитает
 * страницы успешно (unlockFlashcardPagesWrite). Лучше подождать связь, чем затереть.
 *
 * Модуль отдельный, а не правка flashcards_cloud_pages.ts: тот файл параллельно
 * переводится на модульный API в другой сессии; прежний readFlashcardPages оставлен
 * байт-в-байт (контракт null для прежних вызовов не меняется).
 *
 * Логи: префикс [FLASHCARD-PAGES], без uid и без содержимого карточек.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { canonicalJson } from '../modules/account-session-v2/account_sync_producer_plan';
import { comparableCardFields } from './accounts_v2_hydration_conflicts';
import { cardEditTime, compareCardEditTimes, isCardEditTimeFromFuture, type CardEditTimeOrder } from './card_edit_time';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { FLASHCARD_PAGES_COLLECTION } from './flashcards_cloud_pages';
import { readCardDeletionJournal } from './flashcards/card_deletion_journal';
import { rnfbInstance } from './rnfb_modular';
import type { StudyTarget } from './study_target';

const LOG = '[FLASHCARD-PAGES]';

export type FlashcardPagesReadFrom = 'server' | 'cache' | 'unknown';

export type FlashcardPagesReadResult =
  | Readonly<{ status: 'ok'; value: string; pages: number; cards: number; from: 'server' }>
  | Readonly<{ status: 'empty'; from: 'server' }>
  | Readonly<{ status: 'error'; code: string; from: FlashcardPagesReadFrom }>;

/** Минимальная форма QuerySnapshot (RN Firebase и web SDK совпадают в этих полях). */
export type FlashcardPagesSnapshotLike = Readonly<{
  empty: boolean;
  size?: number;
  metadata?: { fromCache?: unknown } | null;
  forEach: (cb: (doc: { id: string; data: () => Record<string, unknown> | undefined }) => void) => void;
}>;

function snapshotFrom(snap: FlashcardPagesSnapshotLike): FlashcardPagesReadFrom {
  const fromCache = snap.metadata?.fromCache;
  if (fromCache === false) return 'server';
  if (fromCache === true) return 'cache';
  return 'unknown';
}

/**
 * Разобрать снимок запроса страниц. Чистая функция — ради тестов.
 *
 * зачем (источник правды): чтение идёт через getDocs(...) RN Firebase с source 'default',
 * а он при офлайне МОЛЧА отдаёт локальный кэш Firestore — пустой на новой установке и,
 * возможно, неполный (только закэшированные страницы) на старой. Отличить такой ответ
 * от ответа сервера можно только по snapshot.metadata.fromCache. Поэтому:
 *   - empty засчитывается ТОЛЬКО при fromCache === false (сервер подтвердил пустоту);
 *   - и ok тоже только с сервера: неполный список из кэша, записанный обратно,
 *     удалил бы хвост страниц так же, как пустой;
 *   - нет метаданных — подтверждения нет, значит error, а не empty.
 */
export function classifyFlashcardPagesSnapshot(snap: FlashcardPagesSnapshotLike): FlashcardPagesReadResult {
  const from = snapshotFrom(snap);
  if (from !== 'server') {
    return { status: 'error', code: from === 'cache' ? 'from_cache' : 'no_metadata', from };
  }
  if (snap.empty) return { status: 'empty', from: 'server' };

  const rows: Array<{ index: number; cards: unknown[] }> = [];
  let skipped = 0;
  snap.forEach((doc) => {
    const data = doc.data() ?? {};
    const index = typeof data.index === 'number' ? data.index : Number.NaN;
    const raw = data.cards;
    if (typeof raw !== 'string') {
      skipped += 1;
      console.warn(`${LOG} read page_skipped page=${doc.id} reason=cards_type_${typeof raw}`);
      return;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        skipped += 1;
        console.warn(`${LOG} read page_skipped page=${doc.id} reason=not_array`);
        return;
      }
      rows.push({ index: Number.isFinite(index) ? index : rows.length, cards: parsed });
    } catch (error) {
      skipped += 1;
      console.warn(`${LOG} read page_skipped page=${doc.id} reason=unparsable (${String(error).slice(0, 80)})`);
    }
  });

  // зачем: страницы ЕСТЬ, но ни одной годной — это не «пусто». Прежний путь отдавал
  // null, и restore брал древнее поле / синк перезаписывал страницы. Теперь — error.
  if (rows.length === 0) {
    return { status: 'error', code: `pages_unusable_${skipped}`, from: 'server' };
  }
  rows.sort((a, b) => a.index - b.index);
  const merged = rows.flatMap((row) => row.cards);
  // Часть страниц битая — остальные отдаём, как и прежний readFlashcardPages: иначе одна
  // испорченная страница навсегда заперла бы синк карточек человека.
  if (skipped > 0) console.warn(`${LOG} read partial pages_ok=${rows.length} pages_skipped=${skipped}`);
  return { status: 'ok', value: JSON.stringify(merged), pages: rows.length, cards: merged.length, from: 'server' };
}

function errorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && code.length > 0) return code.slice(0, 64);
  return error instanceof Error ? error.name : typeof error;
}

function logReadResult(target: StudyTarget, result: FlashcardPagesReadResult, ms: number): void {
  const code = result.status === 'error' ? result.code : '-';
  const sizes = result.status === 'ok' ? ` pages=${result.pages} cards=${result.cards}` : '';
  console.log(`${LOG} read result=${result.status} code=${code} from=${result.from} target=${target}${sizes} ms=${ms}`);
}

/**
 * Прочитать страницы одного языка с трёхзначным результатом. Никогда не бросает.
 * Тот же запрос, что в readFlashcardPages (collection + where target, getDocs) —
 * одно чтение на страницу, без дополнительных обращений к Firestore.
 */
export async function readFlashcardPagesResult(
  stableId: string,
  target: StudyTarget,
): Promise<FlashcardPagesReadResult> {
  const started = Date.now();
  const finish = (result: FlashcardPagesReadResult): FlashcardPagesReadResult => {
    logReadResult(target, result, Date.now() - started);
    return result;
  };
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
    return finish({ status: 'error', code: 'cloud_disabled', from: 'unknown' });
  }
  if (!stableId) return finish({ status: 'error', code: 'empty_stable_id', from: 'unknown' });
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fsMod = require('@react-native-firebase/firestore');
    const db = rnfbInstance(fsMod, 'getFirestore');
    if (!db) return finish({ status: 'error', code: 'firestore_unavailable', from: 'unknown' });
    const snap = await fsMod.getDocs(
      fsMod.query(
        fsMod.collection(db, 'users', stableId, FLASHCARD_PAGES_COLLECTION),
        fsMod.where('target', '==', target),
      ),
    ) as FlashcardPagesSnapshotLike;
    return finish(classifyFlashcardPagesSnapshot(snap));
  } catch (error) {
    return finish({ status: 'error', code: errorCode(error), from: 'unknown' });
  }
}

// ── Слияние при снятии замка ───────────────────────────────────────────────────

export type LockedFlashcardsMerge = Readonly<{
  value: string;
  cloud: number;
  localOnly: number;
  deletedSkipped: number;
  localUnparsable: boolean;
  /** S1b: общие id с разными версиями, где осталась локальная / победила облачная. */
  localWon: number;
  remoteWon: number;
  /** S1b: облачные версии, победившие локальные (их надо положить и в локальный список). */
  remoteWonCards: readonly unknown[];
  /**
   * S1d R2: облачные версии «из будущего», оставленные в объединении вместо локальной (только с
   * keepRemoteFromFuture). Локальный список их НЕ получает — на телефоне остаётся своя версия.
   */
  remoteFutureKept: number;
}>;

/**
 * S1c (§116): режим объединения. `active` — активное устройство перед записью (8N): правило §100,
 * без времени / в пределах запаса остаётся локальная. `restore` — восстановление из облака (8J):
 * облако и есть правда, без времени / в пределах запаса побеждает облачная.
 *
 * Сейчас `restore` в рабочем коде НЕ вызывается (S1c R2): запертые ключи restore 8J в cloud_sync.ts —
 * активное устройство, им нужен `active`. Подключать `restore` только к слиянию с действительно
 * пустым/новым локальным списком (новое устройство); правило держат тесты-якоря §116.
 */
export type CardMergeMode = 'active' | 'restore';

export type CardVersionWinner = Readonly<{
  winner: 'local' | 'remote';
  reason: CardEditTimeOrder;
}>;

/**
 * S1b/S1c — чья версия одной и той же карточки (тот же id) остаётся при объединении.
 * Чистая функция — ради тестов.
 *
 * зачем (§100 координатора): раньше при совпадении id всегда побеждало облако, и правка,
 * сделанная на телефоне между синками, откатывалась к облачной.
 * зачем (S1c): время правки и запас по часам — ОДНО правило с 8E (app/card_edit_time.ts):
 * max(updatedAt, addedAt), новее — только на ≥ запаса (1 час). Раньше S1b сравнивал голый
 * updatedAt точно, и разница в миллисекунду между часами двух устройств решала спор.
 * Новее на ≥ запаса — та сторона и побеждает (в любом режиме). Иначе (в пределах запаса /
 * времени нет хоть у одной стороны): `active` → локальная, `restore` → облачная (§116).
 * S1d: `now` — часы устройства в точке вызова; время правки позже now + запас — «нет времени».
 */
export function pickCardVersion(local: unknown, remote: unknown, mode: CardMergeMode, now: number): CardVersionWinner {
  const reason = compareCardEditTimes(cardEditTime(local), cardEditTime(remote), now);
  if (reason === 'local_newer') return { winner: 'local', reason };
  if (reason === 'remote_newer') return { winner: 'remote', reason };
  return { winner: mode === 'restore' ? 'remote' : 'local', reason };
}

/**
 * S1c: тот же ли текст карточки (сравнение 8E: без SRS, нормализация 8B, порядок полей не важен).
 * Только для сводки конфликтов в логах — выбор версии от этого не зависит.
 */
function sameCardContent(local: unknown, remote: unknown, target: string | undefined): boolean {
  if (local === null || typeof local !== 'object' || remote === null || typeof remote !== 'object') return false;
  const language = target ?? '';
  return canonicalJson(comparableCardFields(language, 'saved', local as Record<string, unknown>))
    === canonicalJson(comparableCardFields(language, 'saved', remote as Record<string, unknown>));
}

function cardIdentity(card: unknown): string {
  const id = (card as { id?: unknown } | null)?.id;
  return typeof id === 'string' && id.length > 0 ? `id:${id}` : `json:${JSON.stringify(card)}`;
}

function parseCardArray(raw: string | null): unknown[] | null {
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    // Без текста карточек: только причина разбора.
    console.warn(`${LOG} merge unparsable_list reason=${String(error).slice(0, 80)}`);
    return null;
  }
}

/**
 * Объединить локальный список и подтверждённые страницы, когда ключ БЫЛ заперт.
 * Чистая функция — ради тестов.
 *
 * зачем (8J, ревью координатора): замок означал «облако не подтверждено», и всё это время
 * локальный список был единственной правдой о новых карточках. Прежний restore при снятии
 * замка заменял локальное страницами — карточка, добавленная под замком, пропадала (тот же
 * класс потери, что закрывает 8J). Поэтому: облачные карточки + локальные, которых в облаке
 * нет (по id). Облачная карточка, которую человек явно удалил на этом телефоне (журнал
 * удалений 7D, deletedIds = id), не возвращается. Удаление под замком без журнала даст
 * «воскрешение» — это безопаснее потери. Локальное не читается → берём страницы как раньше.
 *
 * S1b/S1c: одна карточка (тот же id) есть и там, и там в разных версиях → версия по pickCardVersion
 * (общее с 8E время правки и запас по часам; режим ОБЯЗАТЕЛЕН: `active` — активное устройство,
 * включая запертые ключи restore в cloud_sync.ts и путь 8N; `restore` — только слияние с
 * действительно пустым/новым локальным списком, §116). Победитель — карточка целиком.
 * Лог — ОДНА сводная строка на ключ (merge_conflicts …): только количества, без id и содержимого.
 * «Ложный» конфликт (тот же текст, другой порядок полей / нормализация 8B / только SRS) в сводку
 * не попадает — сравнение как в 8E (comparableCardFields); на выбор версии это не влияет.
 * `logKey` — ключ списка в хранилище (flashcards_v1 …), только для логов; `target` — язык списка,
 * только для нормализации при сравнении (без него — нормализация без языка, сводка осторожнее).
 */
export function mergeLockedFlashcardsWithPages(
  localRaw: string | null,
  pagesRaw: string,
  deletedIds: ReadonlySet<string>,
  logKey: string,
  options: Readonly<{ mode: CardMergeMode; target?: string; now?: number; keepRemoteFromFuture?: boolean }>,
): LockedFlashcardsMerge {
  // зачем (S1c R2): режим обязателен — значение по умолчанию 'restore' молча откатывало правки
  // под замком на активном устройстве (вызовы cloud_sync.ts); ошибиться выбором нельзя.
  const mode = options.mode;
  // зачем (S1d): одно «сейчас» на всё объединение — часы устройства в точке вызова (тесты передают явно).
  const now = options.now ?? Date.now();
  const cloudCards = parseCardArray(pagesRaw) ?? [];
  const localCards = parseCardArray(localRaw);
  if (localCards === null) {
    return {
      value: pagesRaw, cloud: cloudCards.length, localOnly: 0, deletedSkipped: 0, localUnparsable: true,
      localWon: 0, remoteWon: 0, remoteWonCards: [], remoteFutureKept: 0,
    };
  }
  const isDeleted = (card: unknown): boolean => {
    const id = (card as { id?: unknown } | null)?.id;
    return typeof id === 'string' && deletedIds.has(id);
  };
  const localByIdentity = new Map<string, unknown>();
  for (const card of localCards) {
    const identity = cardIdentity(card);
    if (!localByIdentity.has(identity)) localByIdentity.set(identity, card);
  }
  let localWon = 0;
  let remoteFutureKept = 0;
  const remoteWonCards: unknown[] = [];
  const conflicts: Record<CardEditTimeOrder, number> = { local_newer: 0, remote_newer: 0, within_clock_margin: 0, time_unknown: 0 };
  const keptCloud = cloudCards.filter((card) => !isDeleted(card)).map((cloudCard) => {
    const localCard = localByIdentity.get(cardIdentity(cloudCard));
    if (localCard === undefined || JSON.stringify(localCard) === JSON.stringify(cloudCard)) return cloudCard;
    const pick = pickCardVersion(localCard, cloudCard, mode, now);
    // зачем (S1c): в сводку — только настоящие расхождения текста (как 8E), не порядок полей.
    if (!sameCardContent(localCard, cloudCard, options.target)) conflicts[pick.reason] += 1;
    // зачем (S1d R2, решение AA): на пути записи страниц (8N, active) облачная правка «из будущего»
    // значит, что часы ЭТОГО телефона отстают — затереть её локальной = потерять свежую правку.
    // В объединение (страницы) идёт облачная, локальный список не трогаем (не в remoteWonCards).
    // Будущее у локальной (свои часы спешат) — прежнее правило режима.
    if (options.keepRemoteFromFuture === true && mode === 'active' && pick.winner === 'local'
      && isCardEditTimeFromFuture(cardEditTime(cloudCard), now)) {
      remoteFutureKept += 1;
      return cloudCard;
    }
    if (pick.winner === 'local') {
      localWon += 1;
      return localCard;
    }
    remoteWonCards.push(cloudCard);
    return cloudCard;
  });
  if (conflicts.local_newer + conflicts.remote_newer + conflicts.within_clock_margin + conflicts.time_unknown > 0) {
    // S1d R2: remote_future_kept — только когда > 0 (прежний формат строки сводки не меняется).
    const futureKept = remoteFutureKept > 0 ? ` remote_future_kept=${remoteFutureKept}` : '';
    console.log(`${LOG} merge_conflicts key=${logKey} mode=${mode} local_newer=${conflicts.local_newer} remote_newer=${conflicts.remote_newer} within_margin=${conflicts.within_clock_margin} time_unknown=${conflicts.time_unknown}${futureKept}`);
  }
  const seen = new Set(keptCloud.map(cardIdentity));
  const localOnly = localCards.filter((card) => !seen.has(cardIdentity(card)) && !isDeleted(card));
  return {
    value: JSON.stringify([...keptCloud, ...localOnly]),
    cloud: keptCloud.length,
    localOnly: localOnly.length,
    deletedSkipped: cloudCards.length - keptCloud.length,
    localUnparsable: false,
    localWon,
    remoteWon: remoteWonCards.length,
    remoteWonCards,
    remoteFutureKept,
  };
}

// ── Замок записи страниц до подтверждённого чтения ─────────────────────────────

/**
 * Локальный ключ замка. НЕ входит в SYNC_KEYS: замок принадлежит устройству.
 * зачем без владельца (uid): restore каждого аккаунта перезаписывает замок по своим
 * ключам (ошибка → запереть, ok/empty/поле документа → отпереть). Чужой «застрявший»
 * замок может только ПОМЕШАТЬ записи до следующего удачного чтения, но никогда не
 * разрешит перезапись — ошибка всегда в безопасную сторону.
 */
export const FLASHCARD_PAGES_WRITE_LOCK_KEY = 'flashcard_pages_write_lock_v1';

// зачем: если AsyncStorage не принял замок, защита не должна пропасть хотя бы
// до перезапуска процесса — держим запасную копию в памяти.
const memoryFallbackLocks = new Set<string>();

function parseLockKeys(raw: string | null): string[] {
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  const keys = (parsed as { keys?: unknown } | null)?.keys;
  return Array.isArray(keys) ? keys.filter((key): key is string => typeof key === 'string') : [];
}

/**
 * Тот же разбор, но испорченное значение — не исключение, а null.
 * зачем (8K, 🟡 ревью 8J): parseLockKeys бросает на битом JSON; read тогда запирает ВСЁ
 * (так и надо — правды нет), но lock/unlock падали на том же разборе и не могли значение
 * перезаписать — все ключи оставались запертыми навсегда. lock/unlock разбирают через эту
 * функцию и на null перезаписывают замок корректным значением (самопочинка).
 */
function parseLockKeysOrCorrupt(raw: string | null): string[] | null {
  try {
    return parseLockKeys(raw);
  } catch (error) {
    // Без содержимого значения: только причина и длина.
    console.warn(`${LOG} write_lock value_unparsable len=${raw?.length ?? 0} reason=${String(error).slice(0, 80)}`);
    return null;
  }
}

async function writeLockKeys(keys: readonly string[]): Promise<void> {
  if (keys.length === 0) await AsyncStorage.removeItem(FLASHCARD_PAGES_WRITE_LOCK_KEY);
  else await AsyncStorage.setItem(FLASHCARD_PAGES_WRITE_LOCK_KEY, JSON.stringify({ keys: [...keys] }));
}

/** Какие ключи сейчас заперты. Сбой чтения замка — запираем все известные (безопасно). */
export async function readFlashcardPagesWriteLocks(knownKeys: Iterable<string>): Promise<ReadonlySet<string>> {
  try {
    const raw = await AsyncStorage.getItem(FLASHCARD_PAGES_WRITE_LOCK_KEY);
    return new Set([...parseLockKeys(raw), ...memoryFallbackLocks]);
  } catch (error) {
    const all = new Set(knownKeys);
    console.warn(`${LOG} lock_read_failed reason=${String(error).slice(0, 120)} locked_all=${all.size}`);
    return all;
  }
}

/** Запереть запись страниц ключа: чтение не подтвердило, что лежит в облаке. */
export async function lockFlashcardPagesWrite(key: string, reason: string): Promise<void> {
  memoryFallbackLocks.add(key);
  try {
    const raw = await AsyncStorage.getItem(FLASHCARD_PAGES_WRITE_LOCK_KEY);
    const parsed = parseLockKeysOrCorrupt(raw);
    // зачем (8K): битое значение заменяем замком ТОЛЬКО этого ключа. Остальные ключи restore
    // перечитывает в том же проходе (битый замок читается как «заперто всё») и сам запрёт
    // или отопрёт каждый по факту чтения.
    const keys = parsed ?? [];
    await writeLockKeys(keys.includes(key) ? keys : [...keys, key]);
    if (parsed === null) console.warn(`${LOG} write_lock lock_value_repaired key=${key} via=lock reason=${reason} kept=1`);
    // Запись удалась — запасная копия не нужна (иначе unlock в том же процессе её бы не снял).
    memoryFallbackLocks.delete(key);
    console.log(`${LOG} write_lock set key=${key} reason=${reason}`);
  } catch (error) {
    console.warn(`${LOG} write_lock set_failed key=${key} reason=${reason} error=${String(error).slice(0, 120)} memory_only=true`);
  }
}

/** Снять замок: страницы прочитаны успешно (или источник — поле документа). */
export async function unlockFlashcardPagesWrite(key: string, reason: string): Promise<void> {
  const hadMemory = memoryFallbackLocks.delete(key);
  try {
    const raw = await AsyncStorage.getItem(FLASHCARD_PAGES_WRITE_LOCK_KEY);
    const parsed = parseLockKeysOrCorrupt(raw);
    if (parsed === null) {
      // зачем (8K): unlock зовётся только после подтверждённого чтения (или поля документа).
      // Если в этом же проходе другой ключ не прочитался, lock уже перезаписал значение
      // корректным — сюда мы попадаем, только когда запирать некого. Значит, пустой набор.
      await writeLockKeys([]);
      console.warn(`${LOG} write_lock lock_value_repaired key=${key} via=unlock reason=${reason} kept=0`);
      return;
    }
    const keys = parsed;
    if (!keys.includes(key)) {
      if (hadMemory) console.log(`${LOG} write_lock cleared key=${key} reason=${reason} memory_only=true`);
      return;
    }
    await writeLockKeys(keys.filter((entry) => entry !== key));
    console.log(`${LOG} write_lock cleared key=${key} reason=${reason}`);
  } catch (error) {
    // Замок остаётся в хранилище: запись страниц подождёт следующего restore — это безопасно.
    console.warn(`${LOG} write_lock clear_failed key=${key} reason=${reason} error=${String(error).slice(0, 120)}`);
  }
}

/** Только для тестов: сбросить запасную копию замка в памяти. */
export function __resetFlashcardPagesWriteLockMemoryForTests(): void {
  memoryFallbackLocks.clear();
}

// ── Слияние перед записью страниц (8N) ─────────────────────────────────────────

/**
 * Account V2, Пакет 8N — объединить локальный список карточек с текущими страницами
 * flashcard_pages ПЕРЕД их заменой.
 *
 * зачем: writeFlashcardPages заменяет страницы ключа целиком локальным списком. После
 * серверного слияния 8M в страницах победителя лежат карточки проигравшего; любое
 * устройство, у которого их нет локально (другое устройство; устройство входа, если
 * restore пошёл sticky-веткой без чтения страниц), при первом же изменении списка
 * стёрло бы их из облака. То же для любого второго устройства одного аккаунта:
 * страницы были «последний записавший побеждает».
 *
 * Как решаем (без единого лишнего чтения Firestore):
 *   - снимок страниц берётся из того же col.get(), который writeFlashcardPages и так
 *     делает ради удаления хвоста;
 *   - объединяем ТОЛЬКО когда облако изменил кто-то другой: в AsyncStorage хранится
 *     отпечаток (длина + хеш) списка, который ЭТО устройство последним записало для
 *     аккаунта. Совпал с облаком → в страницах ровно наша прошлая запись, объединять
 *     нечего, и локальные удаления уходят в облако как раньше. Не совпал (сервер 8M,
 *     другое устройство, первый запуск после обновления) → облако ∪ локальное − журнал
 *     удалений 7D, а пришедшие из облака карточки кладутся и в локальный список.
 *   - зачем отпечаток, а не identityMergedAt из документа: синк документ не читает
 *     (отдельное чтение = +1 на каждый такт), а отпечаток ловит и слияние 8M, и второе
 *     устройство, и sticky-restore — по уже прочитанным страницам, бесплатно.
 *   - страницы прочитаны не с сервера (кэш/без метаданных/все битые) → НЕ пишем: правды
 *     нет, запись затёрла бы хвост (как замок 8J).
 *
 * Технический долг (принят пакетом, «безопаснее потери»): удаление без журнала на ЭТОМ
 * телефоне (сбой журнала) и удаление, сделанное на ДРУГОМ устройстве (его журнал живёт
 * там), могут «воскреснуть», если это устройство объединит раньше, чем узнает об удалении.
 * При включённом Account V2 такие карточки убирает гидрация надгробий 7D.
 *
 * Логи: префикс [FLASHCARD-PAGES], без uid и без содержимого карточек (только числа).
 */

/** Локальный ключ отпечатков. НЕ входит в SYNC_KEYS: принадлежит устройству. */
export const FLASHCARD_PAGES_WRITE_FINGERPRINT_KEY = 'flashcard_pages_write_fingerprint_v1';

export type FlashcardPagesPreWriteDecision =
  | Readonly<{
    kind: 'write';
    cardsJson: string;
    merged: boolean;
    addedFromRemote: readonly unknown[];
    /** S1b: облачные версии общих карточек, победившие локальные (новее updatedAt). */
    replacedFromRemote: readonly unknown[];
    /** Отпечаток того, что будет лежать в страницах после записи. */
    fingerprint: string;
    /**
     * S1d R2: сколько облачных правок «из будущего» оставлено в страницах при локальной версии на
     * телефоне. > 0 → отпечаток не сохраняется (иначе следующий синк записал бы локальную поверх).
     */
    remoteFutureKept?: number;
  }>
  | Readonly<{ kind: 'skip'; reason: string }>;

export type FlashcardPagesPreWriteStore = Readonly<{
  readFingerprint: (owner: string, key: string) => Promise<string | null>;
  writeFingerprint: (owner: string, key: string, fingerprint: string) => Promise<boolean>;
  readDeletedIds: (target: StudyTarget) => Promise<ReadonlySet<string>>;
}>;

/** Добавить карточки в локальный список (через очередь записи хука). Число добавленных; -1 — не вышло. */
export type FlashcardLocalMerge = (target: StudyTarget, cards: readonly unknown[]) => Promise<number>;

/**
 * S1b: заменить локальные версии карточек облачными (через очередь записи хука). Число заменённых;
 * -1 — не вышло. Заменяет только если СВЕЖАЯ локальная карточка всё ещё проигрывает облачной.
 */
export type FlashcardLocalReplace = (target: StudyTarget, cards: readonly unknown[]) => Promise<number>;

// ── Отпечаток ──────────────────────────────────────────────────────────────────

/** Длина + FNV-1a 32 бит. Не криптография: только «то же ли это, что мы записали». */
export function fingerprintCardsJson(json: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < json.length; index += 1) {
    hash ^= json.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${json.length}:${hash.toString(16)}`;
}

type FingerprintRecord = { owner: string; keys: Record<string, string> };

function parseFingerprintRecord(raw: string | null): FingerprintRecord | null {
  if (!raw) return null;
  const parsed: unknown = JSON.parse(raw);
  const owner = (parsed as { owner?: unknown } | null)?.owner;
  const keys = (parsed as { keys?: unknown } | null)?.keys;
  if (typeof owner !== 'string' || !keys || typeof keys !== 'object' || Array.isArray(keys)) return null;
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(keys as Record<string, unknown>)) {
    if (typeof value === 'string') clean[key] = value;
  }
  return { owner, keys: clean };
}

async function readFingerprint(owner: string, key: string): Promise<string | null> {
  try {
    const record = parseFingerprintRecord(await AsyncStorage.getItem(FLASHCARD_PAGES_WRITE_FINGERPRINT_KEY));
    // зачем: отпечаток чужого аккаунта ничего не говорит о наших страницах → как «нет отпечатка».
    if (!record || record.owner !== owner) return null;
    return record.keys[key] ?? null;
  } catch (error) {
    // Нет отпечатка → объединим (безопасная сторона), причину пишем.
    console.warn(`${LOG} fingerprint read_failed key=${key} reason=${String(error).slice(0, 80)}`);
    return null;
  }
}

async function writeFingerprint(owner: string, key: string, fingerprint: string): Promise<boolean> {
  try {
    let record: FingerprintRecord | null = null;
    try {
      record = parseFingerprintRecord(await AsyncStorage.getItem(FLASHCARD_PAGES_WRITE_FINGERPRINT_KEY));
    } catch (error) {
      // Битое значение перезаписываем целиком (самопочинка), причину пишем.
      console.warn(`${LOG} fingerprint value_unparsable key=${key} reason=${String(error).slice(0, 80)}`);
    }
    const keys = record && record.owner === owner ? { ...record.keys, [key]: fingerprint } : { [key]: fingerprint };
    await AsyncStorage.setItem(FLASHCARD_PAGES_WRITE_FINGERPRINT_KEY, JSON.stringify({ owner, keys }));
    return true;
  } catch (error) {
    // Отпечаток не сохранился → следующая запись просто объединит ещё раз (безопасно).
    console.warn(`${LOG} fingerprint write_failed key=${key} reason=${String(error).slice(0, 80)}`);
    return false;
  }
}

/** id карточек, явно удалённых на этом телефоне (журнал 7D), для языка — как restore 8J. */
async function readDeletedIds(target: StudyTarget): Promise<ReadonlySet<string>> {
  const journal = await readCardDeletionJournal();
  if (!journal) return new Set();
  const prefix = `${target}:saved:`;
  const ids = new Set<string>();
  for (const entryKey of journal.keys()) {
    if (entryKey.startsWith(prefix)) ids.add(entryKey.slice(prefix.length));
  }
  return ids;
}

export const DEFAULT_PRE_WRITE_STORE: FlashcardPagesPreWriteStore = {
  readFingerprint,
  writeFingerprint,
  readDeletedIds,
};

/** Добавить облачные карточки в локальный список через хук (кэш + очередь записи, без спиннеров). */
export const defaultFlashcardLocalMerge: FlashcardLocalMerge = async (target, cards) => {
  // зачем require: хук тянет UI-зависимости; синк грузит его только когда есть что добавить.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const store = require('../hooks/use-flashcards') as typeof import('../hooks/use-flashcards');
  return store.mergeSavedFlashcardsFromAccountsV2(target, cards as unknown as import('../hooks/use-flashcards').Flashcard[]);
};

/** S1b: облачная версия победила — кладём её и в локальный список (кэш + очередь записи хука). */
export const defaultFlashcardLocalReplace: FlashcardLocalReplace = async (target, cards) => {
  const byId = new Map<string, unknown>();
  for (const card of cards) {
    const id = (card as { id?: unknown } | null)?.id;
    if (typeof id === 'string') byId.set(id, card);
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const store = require('../hooks/use-flashcards') as typeof import('../hooks/use-flashcards');
  // зачем (S1d): часы устройства в точке вызова — одно «сейчас» на всю замену.
  const now = Date.now();
  return store.replaceSavedFlashcardsFromAccountsV2(target, (fresh) => {
    const remote = byId.get(fresh.id);
    if (remote === undefined) return null;
    // зачем: между решением и записью человек мог изменить карточку — свежая правка новее облака
    // остаётся (гонка), а финал не сохранит отпечаток, и следующий синк объединит заново.
    return pickCardVersion(fresh, remote, 'active', now).winner === 'remote'
      ? remote as import('../hooks/use-flashcards').Flashcard
      : null;
  });
};

// ── Снимок страниц одного языка ────────────────────────────────────────────────

type PagesDoc = { id: string; data: () => Record<string, unknown> | undefined };

/**
 * col.get() читает ВСЮ подколлекцию (оба языка). Оставляем страницы языка так же, как
 * сервер 8M (pageBelongsToTarget): поле target, а без поля — префикс id.
 */
export function filterPagesSnapshotForTarget(
  existing: FlashcardPagesSnapshotLike,
  target: StudyTarget,
): FlashcardPagesSnapshotLike {
  const docs: PagesDoc[] = [];
  existing.forEach((doc) => {
    const pageTarget = doc.data()?.target;
    if (pageTarget === target || (pageTarget === undefined && doc.id.startsWith(`${target}_`))) docs.push(doc);
  });
  return {
    empty: docs.length === 0,
    size: docs.length,
    metadata: existing.metadata,
    forEach: (cb) => docs.forEach(cb),
  };
}

function countCards(json: string): number {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.length : -1;
  } catch (error) {
    console.warn(`${LOG} pre_write_merge count_unparsable reason=${String(error).slice(0, 80)}`);
    return -1;
  }
}

function normalizedJson(json: string): string {
  return JSON.stringify(JSON.parse(json));
}

/**
 * Порядок объединённого списка: как в ЛОКАЛЬНОМ списке, карточки, пришедшие только из облака, — в конце.
 * Чистая функция — ради тестов.
 *
 * зачем (долг ревью 8N, S3; TG-622DD6E4BD75): `mergeLockedFlashcardsWithPages` отдаёт «облако, потом
 * локальные», а локальный список после дозаписи (`mergeSavedFlashcardsFromAccountsV2`) выглядит как
 * «локальные, потом пришедшие». Если писать в страницы первый порядок, страницы и телефон расходятся
 * по порядку, и каждое объединение переставляет карточки. Состав карточек и версии при совпадении
 * id (берётся версия из объединения) не меняются — только порядок. Не удаётся разобрать — возвращаем
 * объединение как есть (порядок хуже, но данные целы).
 */
export function orderMergedLikeLocal(localJson: string, mergedJson: string): string {
  try {
    const local: unknown = JSON.parse(localJson);
    const merged: unknown = JSON.parse(mergedJson);
    if (!Array.isArray(local) || !Array.isArray(merged)) return mergedJson;
    const mergedByIdentity = new Map<string, unknown>();
    for (const card of merged) {
      const identity = cardIdentity(card);
      if (!mergedByIdentity.has(identity)) mergedByIdentity.set(identity, card);
    }
    const localIdentities = new Set(local.map(cardIdentity));
    // Локальные карточки, которых в объединении нет (отброшены журналом удалений), не возвращаются.
    const inLocalOrder = local.filter((card) => mergedByIdentity.has(cardIdentity(card)))
      .map((card) => mergedByIdentity.get(cardIdentity(card)));
    const fromRemoteOnly = merged.filter((card) => !localIdentities.has(cardIdentity(card)));
    return JSON.stringify([...inLocalOrder, ...fromRemoteOnly]);
  } catch (error) {
    console.warn(`${LOG} order_merge unparsable reason=${String(error).slice(0, 80)}`);
    return mergedJson;
  }
}

export type PreWriteInput = Readonly<{
  owner: string;
  key: string;
  target: StudyTarget;
  localJson: string;
  existing: FlashcardPagesSnapshotLike;
  store: FlashcardPagesPreWriteStore;
}>;

/**
 * Решить, что писать в страницы ключа. Никогда не бросает: сбой → skip (не писать).
 */
export async function decideFlashcardPagesPreWrite(input: PreWriteInput): Promise<FlashcardPagesPreWriteDecision> {
  const { owner, key, target, localJson, existing, store } = input;
  try {
    const local = countCards(localJson);
    const read = classifyFlashcardPagesSnapshot(filterPagesSnapshotForTarget(existing, target));
    if (read.status === 'error') {
      console.log(`${LOG} pre_write_merge key=${key} local=${local} remote=unknown added_from_remote=0 dropped_by_journal=0 decision=skip_write reason=read_${read.code} from=${read.from}`);
      return { kind: 'skip', reason: `read_${read.code}` };
    }
    const localNormalized = normalizedJson(localJson);
    if (read.status === 'empty') {
      console.log(`${LOG} pre_write_merge key=${key} local=${local} remote=0 added_from_remote=0 dropped_by_journal=0 decision=local reason=remote_empty`);
      return { kind: 'write', cardsJson: localNormalized, merged: false, addedFromRemote: [], replacedFromRemote: [], fingerprint: fingerprintCardsJson(localNormalized) };
    }
    const remoteFingerprint = fingerprintCardsJson(read.value);
    const lastWritten = await store.readFingerprint(owner, key);
    if (lastWritten === remoteFingerprint) {
      // В облаке ровно наша прошлая запись: объединять нечего, локальные удаления уходят как раньше.
      console.log(`${LOG} pre_write_merge key=${key} local=${local} remote=${read.cards} added_from_remote=0 dropped_by_journal=0 decision=local reason=remote_is_own_last_write`);
      return { kind: 'write', cardsJson: localNormalized, merged: false, addedFromRemote: [], replacedFromRemote: [], fingerprint: fingerprintCardsJson(localNormalized) };
    }
    const deletedIds = await store.readDeletedIds(target);
    // зачем (S1d R2): пишем в страницы — облачную правку «из будущего» не затираем (keepRemoteFromFuture).
    const merge = mergeLockedFlashcardsWithPages(localNormalized, read.value, deletedIds, key, { mode: 'active', target, keepRemoteFromFuture: true });
    // зачем (S1c, §116): перед записью на активном устройстве — правило §100 (без времени / в пределах
    // запаса остаётся локальная); restore в cloud_sync.ts зовёт без режима и получает 'restore'.
    if (merge.localUnparsable) {
      // Ранний выход: без локального списка объединение отдало бы одно облако — не пишем.
      console.log(`${LOG} pre_write_merge key=${key} local=${local} remote=${read.cards} added_from_remote=0 dropped_by_journal=${merge.deletedSkipped} decision=skip_write reason=local_unparsable`);
      return { kind: 'skip', reason: 'local_unparsable' };
    }
    const localIds = new Set((JSON.parse(localNormalized) as unknown[]).map(cardIdentity));
    const addedFromRemote = (JSON.parse(merge.value) as unknown[]).filter((card) => !localIds.has(cardIdentity(card)));
    // Ничего не пришло из облака → пишем локальное как есть (порядок списка не меняется).
    // S3: порядок как в локальном списке, пришедшие из облака — в конце (см. orderMergedLikeLocal).
    // S1b: облачная версия общей карточки победила (новее updatedAt) → тоже пишем объединение;
    // где победила локальная, в объединении уже локальная версия.
    const mergedAny = addedFromRemote.length > 0 || merge.remoteWon > 0 || merge.remoteFutureKept > 0;
    const cardsJson = mergedAny ? orderMergedLikeLocal(localNormalized, merge.value) : localNormalized;
    console.log(`${LOG} pre_write_merge key=${key} local=${local} remote=${read.cards} added_from_remote=${addedFromRemote.length} dropped_by_journal=${merge.deletedSkipped} decision=${mergedAny ? 'merged' : 'local'} reason=${lastWritten === null ? 'no_own_fingerprint' : 'remote_changed_elsewhere'}`);
    if (merge.localWon > 0 || merge.remoteWon > 0 || merge.remoteFutureKept > 0) {
      const futureKept = merge.remoteFutureKept > 0 ? ` remote_future_kept=${merge.remoteFutureKept}` : '';
      console.log(`${LOG} pre_write_merge_versions key=${key} local_won=${merge.localWon} remote_won=${merge.remoteWon}${futureKept}`);
    }
    return {
      kind: 'write',
      cardsJson,
      merged: mergedAny,
      addedFromRemote,
      replacedFromRemote: merge.remoteWonCards,
      fingerprint: fingerprintCardsJson(cardsJson),
      remoteFutureKept: merge.remoteFutureKept,
    };
  } catch (error) {
    console.warn(`${LOG} pre_write_merge key=${key} decision=skip_write reason=decide_error error=${String(error).slice(0, 120)}`);
    return { kind: 'skip', reason: 'decide_error' };
  }
}

// ── После записи ───────────────────────────────────────────────────────────────

export type PreWriteFinishInput = Readonly<{
  owner: string;
  key: string;
  target: StudyTarget;
  decision: FlashcardPagesPreWriteDecision | null;
  pagesWritten: number | null;
  /** force (перенос/выход): локальное вот-вот сотрут, а очередь хука ждёт смену аккаунта. */
  mode: 'sync' | 'force';
  store: FlashcardPagesPreWriteStore;
  mergeLocal: FlashcardLocalMerge;
  /** S1b: замена локальных версий облачными; по умолчанию — через хук. */
  replaceLocal?: FlashcardLocalReplace;
}>;

/**
 * Страницы записаны → облачные карточки в локальный список, затем отпечаток.
 *
 * зачем порядок: отпечаток говорит «в облаке ровно наше». Если сохранить его, а локальное
 * не дописалось, следующий синк счёл бы облако своим и записал бы локальный список без
 * этих карточек — та самая потеря. Поэтому отпечаток — только после удачного локального шага.
 */
export async function finishFlashcardPagesPreWrite(input: PreWriteFinishInput): Promise<void> {
  const { owner, key, target, decision, pagesWritten, mode, store, mergeLocal } = input;
  if (!decision || decision.kind !== 'write') return;
  if (pagesWritten === null) {
    console.log(`${LOG} pre_write_merge_finish key=${key} result=pages_not_written fingerprint=not_saved`);
    return;
  }
  if (mode === 'force') {
    // Ранний выход: локальное при переносе не трогаем, отпечаток не сохраняем —
    // следующий обычный синк этого аккаунта (если он будет) объединит заново.
    console.log(`${LOG} pre_write_merge_finish key=${key} result=force_skip_local added_from_remote=${decision.addedFromRemote.length} fingerprint=not_saved`);
    return;
  }
  if (decision.addedFromRemote.length > 0) {
    const valid = decision.addedFromRemote.filter((card) => {
      const shape = card as { id?: unknown; en?: unknown } | null;
      return typeof shape?.id === 'string' && typeof shape.en === 'string';
    });
    let added = -1;
    try {
      added = valid.length > 0 ? await mergeLocal(target, valid) : 0;
    } catch (error) {
      console.warn(`${LOG} pre_write_merge_finish key=${key} result=local_merge_error error=${String(error).slice(0, 120)} fingerprint=not_saved`);
      return;
    }
    if (added < 0) {
      console.warn(`${LOG} pre_write_merge_finish key=${key} result=local_merge_failed fingerprint=not_saved`);
      return;
    }
    console.log(`${LOG} pre_write_merge_finish key=${key} local_added=${added} remote_new=${decision.addedFromRemote.length} invalid_shape=${decision.addedFromRemote.length - valid.length}`);
    // зачем (ревью 8N, C1): локально отброшенная карточка (дубль по фразе с другим id или
    // неверная форма) осталась в страницах, но не в локальном списке. Сохрани мы отпечаток —
    // следующий синк счёл бы облако «нашим» и записал локальный список без неё: тихая потеря
    // перевода/контекста/прогресса. Без отпечатка следующий синк снова объединит — карточка живёт.
    const droppedLocally = decision.addedFromRemote.length - added;
    if (droppedLocally > 0) {
      console.warn(`${LOG} pre_write_merge_finish key=${key} result=ok fingerprint=not_saved reason=local_dedup_dropped=${droppedLocally}`);
      return;
    }
  }
  if (decision.replacedFromRemote.length > 0) {
    // S1b: облачная версия общей карточки победила — без этого шага следующий синк счёл бы
    // облако «своим» (отпечаток) и записал бы локальную старую версию поверх: откат облачной правки.
    const replaceLocal = input.replaceLocal ?? defaultFlashcardLocalReplace;
    let replaced = -1;
    try {
      replaced = await replaceLocal(target, decision.replacedFromRemote);
    } catch (error) {
      console.warn(`${LOG} pre_write_merge_finish key=${key} result=local_replace_error error=${String(error).slice(0, 120)} fingerprint=not_saved`);
      return;
    }
    if (replaced < 0) {
      console.warn(`${LOG} pre_write_merge_finish key=${key} result=local_replace_failed fingerprint=not_saved`);
      return;
    }
    console.log(`${LOG} pre_write_merge_finish key=${key} local_replaced=${replaced} remote_newer=${decision.replacedFromRemote.length}`);
    const skipped = decision.replacedFromRemote.length - replaced;
    if (skipped > 0) {
      // Человек успел изменить карточку (новее облака) или её уже нет: локальное не трогаем,
      // отпечаток не сохраняем — следующий синк объединит заново и решит по свежим версиям.
      console.warn(`${LOG} pre_write_merge_finish key=${key} result=ok fingerprint=not_saved reason=local_replace_skipped=${skipped}`);
      return;
    }
  }
  const futureKept = decision.remoteFutureKept ?? 0;
  if (futureKept > 0) {
    // Ранний выход (S1d R2): в страницах облачная правка «из будущего», на телефоне — своя версия.
    // Отпечаток не сохраняем: иначе следующий синк счёл бы облако «своим» и записал локальную поверх.
    console.warn(`${LOG} pre_write_merge_finish key=${key} result=ok fingerprint=not_saved reason=remote_future_kept=${futureKept}`);
    return;
  }
  const saved = await store.writeFingerprint(owner, key, decision.fingerprint);
  console.log(`${LOG} pre_write_merge_finish key=${key} result=ok merged=${decision.merged} fingerprint=${saved ? 'saved' : 'not_saved'}`);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
