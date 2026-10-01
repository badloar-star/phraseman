import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureAccountGeneration, isCurrentAccountGeneration } from '../account_generation';

/*
 * Account V2, Пакет 7D (TG-7768603E99DD) — локальный журнал удалений карточек.
 *
 * зачем: до V2 удаление карточки просто убирало её из списка — факта «человек
 * удалил X в момент T» не оставалось. Поэтому карточка, удалённая на телефоне,
 * «воскресала»: перенос старого облака в V2 (OD21) или старый restore приносили
 * её обратно, а гидрация (add-only) добавляла. Журнал хранит ТОЛЬКО факт явного
 * удаления человеком: `<язык>:<saved|custom>:<id>` → время удаления (часы телефона).
 *
 * Правила:
 *  - пишется только из явных удалений (removeFlashcard*, deleteCustomCard) ПОСЛЕ
 *    успешной записи списка; «Вернуть» (undo) запись снимает;
 *  - пишется всегда (и при выключенном V2): это инертная локальная запись, читает её
 *    только гидрация V2 — так удаления, сделанные до включения V2, тоже учтутся;
 *  - ограничен CARD_DELETION_JOURNAL_MAX записями (самые старые вытесняются);
 *  - аккаунтный ключ: в инвентаре accountLocalDataKeysForToday (cloud_sync.ts) —
 *    стирается вместе с данными аккаунта при выходе/смене/удалении; в старое облако
 *    НЕ уходит (не в SYNC_KEYS); не считается «значимыми данными» (local_account_data.ts);
 *  - все записи — через одну очередь (удаление → «Вернуть» не перепутаются);
 *  - никогда не бросает: сбой = журнал не дописан (прежнее поведение), с логом.
 * Новых данных нет: id карточек и время. Без uid/PII в логах.
 */

export const CARD_DELETION_JOURNAL_KEY = 'accounts_v2_card_deletions_v1';
export const CARD_DELETION_JOURNAL_MAX = 500;

const LOG = '[ACCOUNT-V2]';
export type CardDeletionList = 'saved' | 'custom';
/** Ключ записи журнала = id сущности карточки V2 (`<target>:<list>:<id>`). */
export function cardDeletionKey(target: string, list: CardDeletionList, id: string): string {
  return `${target}:${list}:${id}`;
}

type Entry = readonly [string, number];

let queue: Promise<unknown> = Promise.resolve();

function serial<T>(work: () => Promise<T>): Promise<T> {
  const result = queue.then(work, work);
  queue = result.then(() => undefined, () => undefined);
  return result;
}

function kindOf(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}

/** Разбор хранимого журнала; null — битый (вызывающий решает). */
function parseEntries(raw: string | null): Entry[] | null {
  if (raw === null) return [];
  try {
    const parsed = JSON.parse(raw) as { v?: unknown; e?: unknown };
    if (parsed?.v !== 1 || !Array.isArray(parsed.e)) return null;
    const out: Entry[] = [];
    for (const item of parsed.e as unknown[]) {
      if (!Array.isArray(item) || typeof item[0] !== 'string' || item[0].length === 0
        || !Number.isSafeInteger(item[1]) || (item[1] as number) <= 0) return null;
      out.push([item[0], item[1] as number]);
    }
    return out;
  } catch (error) {
    console.warn(`${LOG} journal parse_failed kind=${kindOf(error)}`);
    return null;
  }
}

async function rewrite(
  label: string,
  isCurrent: () => boolean,
  change: (entries: Entry[]) => Entry[] | null,
): Promise<boolean> {
  // зачем (7E): итог нужен «Вернуть» — не снялась запись → вызывающий освежает время карточки.
  try {
    if (!isCurrent()) {
      console.warn(`${LOG} journal ${label}_skip reason=account_changed`);
      return false;
    }
    let entries = parseEntries(await AsyncStorage.getItem(CARD_DELETION_JOURNAL_KEY));
    if (entries === null) {
      // зачем: журнал — наша производная запись; битый = как будто его не было (прежнее поведение).
      console.warn(`${LOG} journal corrupt -> reset label=${label}`);
      entries = [];
    }
    const next = change(entries);
    if (next === null) return true;
    if (!isCurrent()) {
      console.warn(`${LOG} journal ${label}_skip reason=account_changed_midway`);
      return false;
    }
    await AsyncStorage.setItem(CARD_DELETION_JOURNAL_KEY, JSON.stringify({ v: 1, e: next }));
    return true;
  } catch (error) {
    console.warn(`${LOG} journal ${label}_failed kind=${kindOf(error)}`);
    return false;
  }
}

function currentGuard(): () => boolean {
  const token = captureAccountGeneration();
  return () => isCurrentAccountGeneration(token);
}

/** Записать явное удаление карточек человеком. Никогда не бросает. */
export function recordCardDeletions(
  target: string, list: CardDeletionList, ids: readonly string[], nowMs: number = Date.now(),
): Promise<void> {
  const keys = [...new Set(ids.filter((id) => typeof id === 'string' && id.length > 0))].map((id) => cardDeletionKey(target, list, id));
  if (keys.length === 0 || !Number.isSafeInteger(nowMs) || nowMs <= 0) return Promise.resolve();
  const isCurrent = currentGuard();
  return serial(async () => { await rewrite('record', isCurrent, (entries) => {
    const fresh = new Set(keys);
    const kept = entries.filter(([key]) => !fresh.has(key));
    const next = [...kept, ...keys.map((key): Entry => [key, nowMs])];
    // зачем: предел размера — вытесняем самые старые удаления (их «воскрешение» уже маловероятно).
    const dropped = Math.max(0, next.length - CARD_DELETION_JOURNAL_MAX);
    if (dropped > 0) console.log(`${LOG} journal evicted count=${dropped}`);
    console.log(`${LOG} journal record list=${list} count=${keys.length} size=${next.length - dropped}`);
    return next.slice(dropped);
  }); });
}

/**
 * Снять записи (undo «Вернуть» или гидрация решила, что сервер свежее). Никогда не бросает.
 * true — записей больше нет (сняты или их не было); false — не снялись (сбой / сменился аккаунт).
 */
export function forgetCardDeletions(target: string, list: CardDeletionList, ids: readonly string[]): Promise<boolean> {
  return forgetCardDeletionKeys(ids.map((id) => cardDeletionKey(target, list, id)));
}

export function forgetCardDeletionKeys(keys: readonly string[]): Promise<boolean> {
  const gone = new Set(keys);
  if (gone.size === 0) return Promise.resolve(true);
  const isCurrent = currentGuard();
  return serial(() => rewrite('forget', isCurrent, (entries) => {
    const next = entries.filter(([key]) => !gone.has(key));
    if (next.length === entries.length) return null;
    console.log(`${LOG} journal forget count=${entries.length - next.length} size=${next.length}`);
    return next;
  }));
}

/** Журнал: ключ → время удаления. null — нечитаем (лог); вызывающий ведёт себя как без журнала. */
export function readCardDeletionJournal(): Promise<ReadonlyMap<string, number> | null> {
  return serial(async () => {
    try {
      const entries = parseEntries(await AsyncStorage.getItem(CARD_DELETION_JOURNAL_KEY));
      if (entries === null) {
        console.warn(`${LOG} journal read corrupt`);
        return null;
      }
      return new Map(entries);
    } catch (error) {
      console.warn(`${LOG} journal read_failed kind=${kindOf(error)}`);
      return null;
    }
  });
}

/** Только для тестов. */
export function __resetCardDeletionJournalQueueForTests(): void {
  queue = Promise.resolve();
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
