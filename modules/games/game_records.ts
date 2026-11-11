// ═══════════════════════════════════════════════════════════════════════════
// game_records.ts — лучший результат по каждой игре на устройстве (блок «Рекорды игр» в статистике).
//
// зачем (владелец 11.11.2026: «продолжать реализовывать в приложении всё с макетов»; макет elevate-flow.js /
// elevate-real2.js, панель «Рекорды игр»): игра сообщает результат одной функцией noteGameResult, блок читает
// рекорды из памяти процесса (peek) без ожидания диска.
//   • Хранение — AsyncStorage на устройстве, ключ на владельца. В сеть ничего не уходит.
//   • Изменения идут через одну очередь — два результата подряд не затирают друг друга.
//   • Рекорд только улучшается; худший результат запись не меняет и на диск не идёт.
//   • Сбой записи не теряет рекорд: он держится в памяти и дописывается при следующем событии.
// Логи — префикс [GAME-RECORDS] на каждом раннем выходе и catch.
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

import { onAccountOwnerChanged } from '../../app/account_owner_change';

const LOG = '[GAME-RECORDS]';
const STATE_KEY_PREFIX = 'game_records_v1:';
const ANON_OWNER = 'anon';

/** Строки блока в порядке макета: Блиц, Поток, Лишнее слово, Смахни. */
export const GAME_RECORD_IDS = ['blitz', 'flow', 'odd_word', 'swipe'] as const;
export type GameRecordId = (typeof GAME_RECORD_IDS)[number];

export interface GameRecordRule {
  /** `max` — больше значит лучше (верных, темп, серия); `min` — меньше значит лучше (секунд на ответ). */
  readonly better: 'max' | 'min';
  /** Знаков после запятой в показе: 0 — «26», 1 — «×1,9» и «0,8 с». */
  readonly decimals: 0 | 1;
  readonly prefix: string;
  readonly suffix: string;
}

// Формат числа — как в макете: «26», «×1,9», «14», «0,8 с».
export const GAME_RECORD_RULES: Readonly<Record<GameRecordId, GameRecordRule>> = {
  blitz: { better: 'max', decimals: 0, prefix: '', suffix: '' },
  flow: { better: 'max', decimals: 1, prefix: '×', suffix: '' },
  odd_word: { better: 'max', decimals: 0, prefix: '', suffix: '' },
  swipe: { better: 'min', decimals: 1, prefix: '', suffix: ' с' },
};

export type GameBests = Readonly<Partial<Record<GameRecordId, number>>>;

export interface GameRecordsState {
  readonly ownerKey: string;
  readonly best: GameBests;
}

export type GameRecordsDeps = Readonly<{
  /** stableId активного аккаунта или null. */
  ownerStableId: () => Promise<string | null>;
}>;

export interface GameResultOutcome {
  /** Результат стал новым рекордом. */
  readonly improved: boolean;
  /** Рекорд после события; null — рекорда нет (результат не принят). */
  readonly best: number | null;
  /** false — рекорд показан, но на диск пока не лёг (повтор при следующем событии). */
  readonly saved: boolean;
}

async function defaultOwnerStableId(): Promise<string | null> {
  const { captureAccountGeneration } = await import('../../app/account_generation');
  const token = captureAccountGeneration();
  return token.phase === 'active' && token.stableId ? token.stableId : null;
}

const DEFAULT_DEPS: GameRecordsDeps = Object.freeze({ ownerStableId: defaultOwnerStableId });

let deps: GameRecordsDeps = DEFAULT_DEPS;
let current: GameRecordsState | null = null;
let unsaved = false;
let queue: Promise<unknown> = Promise.resolve();
const listeners = new Set<(state: GameRecordsState | null) => void>();

// зачем: память модуля принадлежит владельцу — без сброса следующий аккаунт увидел бы чужие рекорды.
onAccountOwnerChanged('game_records', () => {
  const previous = current;
  if (unsaved && previous) void persist(previous).then((ok) => log('owner_change:unsaved_flushed', { ok }));
  unsaved = false;
  current = null;
  listeners.forEach((listener) => listener(null));
});

function log(event: string, fields: Record<string, unknown>): void {
  console.log(`${LOG} ${event} ${JSON.stringify(fields)}`); // guard-ok: одна строка на событие хранилища
}

function errText(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isGameRecordId(value: unknown): value is GameRecordId {
  return typeof value === 'string' && (GAME_RECORD_IDS as readonly string[]).includes(value);
}

/** Годится ли число как результат игры: конечное и больше нуля (ноль верных и ноль секунд — не рекорд). */
function isValidResult(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/** Лучше ли `candidate`, чем уже записанный `best`, по правилу игры. Нет записи — любой годный результат лучше. */
export function isBetterGameResult(game: GameRecordId, candidate: number, best: number | undefined): boolean {
  if (!isValidResult(candidate)) return false;
  if (best === undefined) return true;
  return GAME_RECORD_RULES[game].better === 'max' ? candidate > best : candidate < best;
}

/** Число рекорда в виде макета: «26», «×1,9», «0,8 с». Запятая — как в макете, для всех языков интерфейса. */
export function formatGameRecord(game: GameRecordId, value: number): string {
  const rule = GAME_RECORD_RULES[game];
  const text = rule.decimals === 0 ? String(Math.round(value)) : value.toFixed(rule.decimals).replace('.', ',');
  return `${rule.prefix}${text}${rule.suffix}`;
}

/** Разбор содержимого диска: неизвестная игра, не число, не конечное или не больше нуля — отбрасывается. */
export function parseGameRecordsState(raw: string | null, ownerKey: string): GameRecordsState {
  const empty: GameRecordsState = { ownerKey, best: {} };
  if (!raw) return empty;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn(`${LOG} parse:bad_json ${JSON.stringify({ error: errText(error), action: 'start_empty' })}`);
    return empty;
  }
  if (!isRecord(parsed) || !isRecord(parsed.best)) {
    console.warn(`${LOG} parse:wrong_shape ${JSON.stringify({ action: 'start_empty' })}`);
    return empty;
  }
  const rawBest = parsed.best;
  const best = Object.fromEntries(GAME_RECORD_IDS.flatMap((game) => (isValidResult(rawBest[game]) ? [[game, rawBest[game]]] : [])));
  return { ownerKey, best };
}

function serialized<T>(work: () => Promise<T>): Promise<T> {
  const run = queue.then(work, work);
  queue = run.catch((error: unknown) => {
    console.warn(`${LOG} queue:previous_failed ${JSON.stringify({ error: errText(error) })}`);
  });
  return run;
}

function publish(next: GameRecordsState | null): void {
  current = next;
  for (const listener of listeners) {
    try {
      listener(next);
    } catch (error) {
      console.warn(`${LOG} listener:failed ${JSON.stringify({ error: errText(error) })}`);
    }
  }
}

async function persist(state: GameRecordsState): Promise<boolean> {
  try {
    await AsyncStorage.setItem(`${STATE_KEY_PREFIX}${state.ownerKey}`, JSON.stringify({ v: 1, best: state.best }));
    return true;
  } catch (error) {
    console.warn(`${LOG} persist:failed ${JSON.stringify({ ownerKey: state.ownerKey.slice(0, 8), error: errText(error), status: 'stays_in_memory' })}`);
    return false;
  }
}

/** Состояние текущего владельца: из памяти, иначе с диска. Вызывать только внутри serialized. */
async function ensureLoaded(): Promise<GameRecordsState> {
  const ownerKey = (await deps.ownerStableId()) ?? ANON_OWNER;
  if (current && current.ownerKey === ownerKey) return current;
  // зачем: владелец сменился без события смены — несохранённый рекорд прежнего дописываем в ЕГО ключ, а не теряем
  if (unsaved && current) log('load:previous_owner_flushed', { ok: await persist(current) });
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(`${STATE_KEY_PREFIX}${ownerKey}`);
  } catch (error) {
    // зачем: сбой чтения не должен ронять игру — начинаем с пустого, причина видна в журнале
    console.warn(`${LOG} load:read_failed ${JSON.stringify({ ownerKey: ownerKey.slice(0, 8), error: errText(error), action: 'start_empty' })}`);
  }
  const state = parseGameRecordsState(raw, ownerKey);
  unsaved = false;
  publish(state);
  return state;
}

/** Сообщить результат игры. Рекорд виден сразу, запись на диск — следом. */
export function recordGameResult(game: GameRecordId, value: number): Promise<GameResultOutcome> {
  return serialized(async () => {
    const before = await ensureLoaded();
    const prev = before.best[game];
    if (!isGameRecordId(game) || !isValidResult(value)) {
      log('record:rejected', { game, value: String(value) });
      return { improved: false, best: prev ?? null, saved: !unsaved };
    }
    if (!isBetterGameResult(game, value, prev)) {
      // зачем: «не рекорд» — штатный исход почти каждой игры, журнал им не засоряем; несохранённый прежний рекорд дописываем
      if (unsaved) unsaved = !(await persist(before));
      return { improved: false, best: prev ?? null, saved: !unsaved };
    }
    const next: GameRecordsState = { ownerKey: before.ownerKey, best: { ...before.best, [game]: value } };
    publish(next);
    const saved = await persist(next);
    unsaved = !saved;
    log('record:new_best', { game, value, previous: prev ?? null, saved });
    return { improved: true, best: value, saved };
  });
}

/**
 * То же для экранов игр: ничего не ждёт и никогда не бросает — игра продолжает работать, даже если запись не удалась.
 * Причина сбоя остаётся в журнале.
 */
export function noteGameResult(game: GameRecordId, value: number): void {
  recordGameResult(game, value).catch((error: unknown) => {
    console.warn(`${LOG} note:failed ${JSON.stringify({ game, error: errText(error) })}`);
  });
}

/** Догрузить рекорды с диска (вход на экран, прогрев после первого кадра) и дописать несохранённое. */
export function refreshGameRecords(): Promise<GameRecordsState> {
  return serialized(async () => {
    const state = await ensureLoaded();
    if (unsaved) {
      unsaved = !(await persist(state));
      log('refresh:unsaved_retry', { saved: !unsaved });
    }
    return state;
  });
}

/** Мгновенное чтение для первого кадра; null — диск ещё не читали. */
export function peekGameRecords(): GameRecordsState | null {
  return current;
}

export function subscribeGameRecords(listener: (state: GameRecordsState | null) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const __gameRecordsTestHooks = Object.freeze({
  reset(): void {
    deps = DEFAULT_DEPS;
    current = null;
    unsaved = false;
    queue = Promise.resolve();
    listeners.clear();
  },
  setDeps(next: GameRecordsDeps): void {
    deps = next;
  },
});
