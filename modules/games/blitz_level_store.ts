// ═══════════════════════════════════════════════════════════════════════════
// blitz_level_store.ts — уровень «Блица» на устройстве (макет «Уровни игры · на примере „Блица“»).
//
// зачем (владелец 11.11.2026: «продолжать реализовывать в приложении всё с макетов»; макет elevate-games.js,
// `levels()`: «Уровень человек не выбирает»): «Блиц» сообщает итог захода одной функцией recordBlitzRun, лестница
// читает уровень из памяти процесса (peek) без ожидания диска.
//   • Хранение — AsyncStorage на устройстве, ключ на владельца. В сеть ничего не уходит.
//   • Изменения идут через одну очередь — два захода подряд не затирают друг друга.
//   • Сбой записи не теряет уровень: он держится в памяти и дописывается при следующем событии.
//   • Празднование не durable (правило владельца 01.09): сдвиг уровня возвращается вызывающему как факт этого
//     захода и нигде не хранится.
// Логи — префикс [BLITZ-LEVEL] на каждом раннем выходе и catch.
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

import { onAccountOwnerChanged } from '../../app/account_owner_change';
import {
  INITIAL_LEVELS_STATE, applyLevelRun, levelRunVerdict, normalizeLevelsState, type LevelRunVerdict, type LevelsState,
} from './levels_core';

const LOG = '[BLITZ-LEVEL]';
const STATE_KEY_PREFIX = 'blitz_level_v1:';
const ANON_OWNER = 'anon';

export interface BlitzLevelState {
  readonly ownerKey: string;
  readonly levels: LevelsState;
}

export type BlitzLevelDeps = Readonly<{
  /** stableId активного аккаунта или null. */
  ownerStableId: () => Promise<string | null>;
}>;

export interface BlitzRunOutcome {
  readonly verdict: LevelRunVerdict;
  /** Уровень до захода и после. */
  readonly before: LevelsState;
  readonly after: LevelsState;
  /** +1 — вверх, −1 — вниз, 0 — на месте. */
  readonly moved: -1 | 0 | 1;
  /** false — уровень показан, но на диск пока не лёг (повтор при следующем событии). */
  readonly saved: boolean;
}

async function defaultOwnerStableId(): Promise<string | null> {
  const { captureAccountGeneration } = await import('../../app/account_generation');
  const token = captureAccountGeneration();
  return token.phase === 'active' && token.stableId ? token.stableId : null;
}

const DEFAULT_DEPS: BlitzLevelDeps = Object.freeze({ ownerStableId: defaultOwnerStableId });

let deps: BlitzLevelDeps = DEFAULT_DEPS;
let current: BlitzLevelState | null = null;
let unsaved = false;
let queue: Promise<unknown> = Promise.resolve();
const listeners = new Set<(state: BlitzLevelState | null) => void>();

// зачем: память модуля принадлежит владельцу — без сброса следующий аккаунт увидел бы чужой уровень.
onAccountOwnerChanged('blitz_level', () => {
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

/** Разбор содержимого диска: битое или чужой формы — начинаем с первой ступени, причина в журнале. */
export function parseBlitzLevelState(raw: string | null, ownerKey: string): BlitzLevelState {
  const empty: BlitzLevelState = { ownerKey, levels: INITIAL_LEVELS_STATE };
  if (!raw) return empty;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn(`${LOG} parse:bad_json ${JSON.stringify({ error: errText(error), action: 'start_level_1' })}`);
    return empty;
  }
  if (!isRecord(parsed) || !isRecord(parsed.levels)) {
    console.warn(`${LOG} parse:wrong_shape ${JSON.stringify({ action: 'start_level_1' })}`);
    return empty;
  }
  return { ownerKey, levels: normalizeLevelsState(parsed.levels) };
}

function serialized<T>(work: () => Promise<T>): Promise<T> {
  const run = queue.then(work, work);
  queue = run.catch((error: unknown) => {
    console.warn(`${LOG} queue:previous_failed ${JSON.stringify({ error: errText(error) })}`);
  });
  return run;
}

function publish(next: BlitzLevelState | null): void {
  current = next;
  for (const listener of listeners) {
    try {
      listener(next);
    } catch (error) {
      console.warn(`${LOG} listener:failed ${JSON.stringify({ error: errText(error) })}`);
    }
  }
}

async function persist(state: BlitzLevelState): Promise<boolean> {
  try {
    await AsyncStorage.setItem(`${STATE_KEY_PREFIX}${state.ownerKey}`, JSON.stringify({ v: 1, levels: state.levels }));
    return true;
  } catch (error) {
    console.warn(`${LOG} persist:failed ${JSON.stringify({ ownerKey: state.ownerKey.slice(0, 8), error: errText(error), status: 'stays_in_memory' })}`);
    return false;
  }
}

/** Состояние текущего владельца: из памяти, иначе с диска. Вызывать только внутри serialized. */
async function ensureLoaded(): Promise<BlitzLevelState> {
  const ownerKey = (await deps.ownerStableId()) ?? ANON_OWNER;
  if (current && current.ownerKey === ownerKey) return current;
  // зачем: владелец сменился без события смены — несохранённый уровень прежнего дописываем в ЕГО ключ
  if (unsaved && current) log('load:previous_owner_flushed', { ok: await persist(current) });
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(`${STATE_KEY_PREFIX}${ownerKey}`);
  } catch (error) {
    // зачем: сбой чтения не должен ронять «Блиц» — начинаем с первой ступени, причина видна в журнале
    console.warn(`${LOG} load:read_failed ${JSON.stringify({ ownerKey: ownerKey.slice(0, 8), error: errText(error), action: 'start_level_1' })}`);
  }
  const state = parseBlitzLevelState(raw, ownerKey);
  unsaved = false;
  publish(state);
  return state;
}

/** Засчитать итог захода «Блица». Уровень виден сразу, запись на диск — следом. */
export function recordBlitzRun(correct: number, total: number): Promise<BlitzRunOutcome> {
  return serialized(async () => {
    const before = await ensureLoaded();
    const verdict = levelRunVerdict(correct, total);
    if (verdict === 'skip') {
      console.warn(`${LOG} run:skipped ${JSON.stringify({ correct, total, reason: 'too_few_answers_or_bad_input' })}`);
      if (unsaved) unsaved = !(await persist(before));
      return { verdict, before: before.levels, after: before.levels, moved: 0, saved: !unsaved };
    }
    const { state: levels, moved } = applyLevelRun(before.levels, verdict === 'good');
    const next: BlitzLevelState = { ownerKey: before.ownerKey, levels };
    publish(next);
    const saved = await persist(next);
    unsaved = !saved;
    log('run:counted', { verdict, correct, total, from: before.levels, to: levels, moved, saved });
    return { verdict, before: before.levels, after: levels, moved, saved };
  });
}

/** Догрузить уровень с диска (вход в «Блиц») и дописать несохранённое. */
export function refreshBlitzLevel(): Promise<BlitzLevelState> {
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
export function peekBlitzLevel(): BlitzLevelState | null {
  return current;
}

export function subscribeBlitzLevel(listener: (state: BlitzLevelState | null) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const __blitzLevelTestHooks = Object.freeze({
  reset(): void {
    deps = DEFAULT_DEPS;
    current = null;
    unsaved = false;
    queue = Promise.resolve();
    listeners.clear();
  },
  setDeps(next: BlitzLevelDeps): void {
    deps = next;
  },
});
