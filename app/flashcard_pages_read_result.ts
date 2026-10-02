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

import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { FLASHCARD_PAGES_COLLECTION } from './flashcards_cloud_pages';
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
}>;

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
 */
export function mergeLockedFlashcardsWithPages(
  localRaw: string | null,
  pagesRaw: string,
  deletedIds: ReadonlySet<string>,
): LockedFlashcardsMerge {
  const cloudCards = parseCardArray(pagesRaw) ?? [];
  const localCards = parseCardArray(localRaw);
  if (localCards === null) {
    return { value: pagesRaw, cloud: cloudCards.length, localOnly: 0, deletedSkipped: 0, localUnparsable: true };
  }
  const isDeleted = (card: unknown): boolean => {
    const id = (card as { id?: unknown } | null)?.id;
    return typeof id === 'string' && deletedIds.has(id);
  };
  const keptCloud = cloudCards.filter((card) => !isDeleted(card));
  const seen = new Set(keptCloud.map(cardIdentity));
  const localOnly = localCards.filter((card) => !seen.has(cardIdentity(card)) && !isDeleted(card));
  return {
    value: JSON.stringify([...keptCloud, ...localOnly]),
    cloud: keptCloud.length,
    localOnly: localOnly.length,
    deletedSkipped: cloudCards.length - keptCloud.length,
    localUnparsable: false,
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
    const keys = parseLockKeys(raw);
    await writeLockKeys(keys.includes(key) ? keys : [...keys, key]);
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
    const keys = parseLockKeys(raw);
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

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
