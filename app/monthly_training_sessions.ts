import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';

/** A single local calendar-month allowance shared by every card training mode for Free users. */
export const MONTHLY_TRAINING_SESSION_LIMIT = 30;
export const MONTHLY_TRAINING_SESSION_STORAGE_PREFIX = 'training_sessions:v1:';

export type MonthlyTrainingSessionMode = 'swipe' | 'blitz' | 'recall' | 'speaking';
export type MonthlyTrainingSessionStatus = 'waiting' | 'allowed' | 'exhausted' | 'unavailable' | 'stale_account';
export type MonthlyTrainingSessionBypass = 'idempotent' | 'local_storage' | null;

export type MonthlyTrainingSessionQuotaResult = Readonly<{
  status: MonthlyTrainingSessionStatus;
  used: number;
  limit: number;
  resetAt: number | null;
  period: string | null;
  bypass: MonthlyTrainingSessionBypass;
}>;

type StoredMonthlySessions = Readonly<{
  version: 1;
  period: string;
  starts: readonly string[];
}>;

type KeyValueStore = Readonly<{
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}>;

type Dependencies = Readonly<{
  now: () => number;
  timeZone: () => string;
  isCurrentAccount: (token: AccountGenerationToken) => boolean;
  storage: KeyValueStore;
}>;

type PreviewInput = Readonly<{
  token: AccountGenerationToken;
  /** Kept for callers during the paid-gate removal; it deliberately has no effect. */
  accessResolved?: boolean;
  /** Kept for callers during the paid-gate removal; it deliberately has no effect. */
  hasPremiumAccess?: boolean;
}>;

type ConsumeInput = Readonly<{
  token: AccountGenerationToken;
  /** Kept for callers during the paid-gate removal; it deliberately has no effect. */
  accessResolved?: boolean;
  /** Plus users have unlimited training sessions. */
  hasPremiumAccess?: boolean;
  receiptId: string;
  mode: MonthlyTrainingSessionMode;
}>;

const mutationTails = new Map<string, Promise<void>>();

function result(status: MonthlyTrainingSessionStatus, used = 0, window?: MonthlyWindow, bypass: MonthlyTrainingSessionBypass = null): MonthlyTrainingSessionQuotaResult {
  return Object.freeze({
    status,
    used,
    limit: MONTHLY_TRAINING_SESSION_LIMIT,
    resetAt: window?.resetAt ?? null,
    period: window?.period ?? null,
    bypass,
  });
}

function validToken(deps: Dependencies, token: AccountGenerationToken): token is AccountGenerationToken & { stableId: string } {
  return token.phase === 'active'
    && typeof token.stableId === 'string'
    && token.stableId.length > 0
    && deps.isCurrentAccount(token);
}

type MonthlyWindow = Readonly<{ period: string; resetAt: number }>;

function localMonthParts(nowMs: number, timeZone: string): Readonly<{ year: number; month: number }> {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date(nowMs));
  const take = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  const year = take('year');
  const month = take('month');
  if (!Number.isSafeInteger(year) || !Number.isSafeInteger(month) || month < 1 || month > 12) {
    throw new Error('monthly_training_sessions_calendar_invalid');
  }
  return Object.freeze({ year, month });
}

function monthKeyAt(nowMs: number, timeZone: string): string {
  const { year, month } = localMonthParts(nowMs, timeZone);
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

/** Finds the first instant formatted in the next local calendar month (DST-safe). */
export function resolveMonthlyTrainingSessionWindow(nowMs: number, timeZone: string): MonthlyWindow {
  if (!Number.isFinite(nowMs)) throw new Error('monthly_training_sessions_time_invalid');
  const period = monthKeyAt(nowMs, timeZone);
  let low = Math.floor(nowMs) + 1;
  let high = Math.floor(nowMs) + 33 * 24 * 60 * 60 * 1000;
  if (monthKeyAt(high, timeZone) === period) throw new Error('monthly_training_sessions_boundary_not_found');
  while (low < high) {
    const mid = low + Math.floor((high - low) / 2);
    if (monthKeyAt(mid, timeZone) === period) low = mid + 1;
    else high = mid;
  }
  return Object.freeze({ period, resetAt: low });
}

function normalizeStored(value: string | null, period: string): StoredMonthlySessions {
  if (!value) return Object.freeze({ version: 1, period, starts: [] });
  try {
    const parsed = JSON.parse(value) as Partial<StoredMonthlySessions>;
    if (parsed.version !== 1 || parsed.period !== period || !Array.isArray(parsed.starts)) {
      return Object.freeze({ version: 1, period, starts: [] });
    }
    const starts = [...new Set(parsed.starts.filter((item): item is string => typeof item === 'string' && item.trim().length > 0))]
      .slice(0, MONTHLY_TRAINING_SESSION_LIMIT);
    return Object.freeze({ version: 1, period, starts: Object.freeze(starts) });
  } catch (error) {
    // зачем: запрет немого catch — битая запись счётчика сбрасывается, но причина видна.
    console.warn('[FC-TRAIN-ENTRY] monthly_sessions:corrupt_record — считаем с нуля', error instanceof Error ? error.message : String(error));
    return Object.freeze({ version: 1, period, starts: [] });
  }
}

function storageKey(stableId: string): string {
  return `${MONTHLY_TRAINING_SESSION_STORAGE_PREFIX}${encodeURIComponent(stableId)}`;
}

async function serialize<T>(key: string, work: () => Promise<T>): Promise<T> {
  const previous = mutationTails.get(key) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((resolve) => { release = resolve; });
  const tail = previous.then(() => next);
  mutationTails.set(key, tail);
  await previous;
  try {
    return await work();
  } finally {
    release();
    if (mutationTails.get(key) === tail) mutationTails.delete(key);
  }
}

export function createMonthlyTrainingSessionAccess(deps: Dependencies) {
  return Object.freeze({
    async preview(input: PreviewInput): Promise<MonthlyTrainingSessionQuotaResult> {
      if (!validToken(deps, input.token)) return result('stale_account');
      let window: MonthlyWindow;
      try {
        window = resolveMonthlyTrainingSessionWindow(deps.now(), deps.timeZone());
        const stored = normalizeStored(await deps.storage.getItem(storageKey(input.token.stableId)), window.period);
        if (!deps.isCurrentAccount(input.token)) return result('stale_account');
        if (input.hasPremiumAccess === true) return result('allowed', stored.starts.length, window, 'idempotent');
        return result(stored.starts.length >= MONTHLY_TRAINING_SESSION_LIMIT ? 'exhausted' : 'allowed', stored.starts.length, window);
      } catch (error) {
        // Local persistence must never turn this free feature into a remote gate.
        console.warn('[FC-TRAIN-ENTRY] monthly_sessions:preview_failed — пускаем (local_storage)', error instanceof Error ? error.message : String(error));
        return result('allowed', 0, undefined, 'local_storage');
      }
    },

    async consume(input: ConsumeInput): Promise<MonthlyTrainingSessionQuotaResult> {
      if (!input.receiptId.trim() || !validToken(deps, input.token)) return result('stale_account');
      // Modes share the same allowance by product decision; the field documents the caller.
      void input.mode;
      const key = storageKey(input.token.stableId);
      return serialize(key, async () => {
        if (!validToken(deps, input.token)) return result('stale_account');
        let window: MonthlyWindow;
        try {
          window = resolveMonthlyTrainingSessionWindow(deps.now(), deps.timeZone());
          const stored = normalizeStored(await deps.storage.getItem(key), window.period);
          if (!deps.isCurrentAccount(input.token)) return result('stale_account');
          if (input.hasPremiumAccess === true) return result('allowed', stored.starts.length, window, 'idempotent');
          if (stored.starts.includes(input.receiptId)) {
            return result('allowed', stored.starts.length, window, 'idempotent');
          }
          if (stored.starts.length >= MONTHLY_TRAINING_SESSION_LIMIT) {
            return result('exhausted', stored.starts.length, window);
          }
          const next = Object.freeze({ version: 1 as const, period: window.period, starts: [...stored.starts, input.receiptId] });
          await deps.storage.setItem(key, JSON.stringify(next));
          if (!deps.isCurrentAccount(input.token)) return result('stale_account');
          return result('allowed', next.starts.length, window);
        } catch (error) {
          // зачем: запрет немого catch — счётчик не записался, тренировку всё равно пускаем.
          console.warn('[FC-TRAIN-ENTRY] monthly_sessions:consume_failed — пускаем (local_storage)', error instanceof Error ? error.message : String(error));
          return result('allowed', 0, undefined, 'local_storage');
        }
      });
    },
  });
}

const defaultAccess = createMonthlyTrainingSessionAccess({
  now: () => Date.now(),
  timeZone: () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  isCurrentAccount: isCurrentAccountGeneration,
  storage: AsyncStorage,
});

export const previewMonthlyTrainingSessions = defaultAccess.preview;
export const consumeMonthlyTrainingSession = defaultAccess.consume;
export { captureAccountGeneration };
