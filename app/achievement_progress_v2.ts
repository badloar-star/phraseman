import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { withStorageLock } from './storage_mutex';
import { DebugLogger } from './debug-logger';

export const ACHIEVEMENT_FOUNDATION_PROGRESS_KEY = 'achievement_foundation_progress_v2';
export const ACHIEVEMENT_ACCESS_PLUS_PAID_KEY = 'achievement_access_plus_paid_v1';
export const ACHIEVEMENT_ACCESS_PRO_PAID_KEY = 'achievement_access_pro_paid_v1';
const MAX_COMEBACK_DATES = 10;
const MAX_ACTIVE_DATE_HISTORY = 5_000;

export interface FoundationComebackProgress {
  returnDate: string;
  windowEndDate: string;
  activeDates: string[];
  qualified: boolean;
}

export interface AchievementFoundationProgressV2 {
  version: 2;
  maxEligibleShardBalance: number;
  activeDates: string[];
  comeback: FoundationComebackProgress | null;
  paidAccess: { plus: boolean; pro: boolean };
}

export const createEmptyFoundationProgress = (): AchievementFoundationProgressV2 => ({
  version: 2,
  maxEligibleShardBalance: 0,
  activeDates: [],
  comeback: null,
  paidAccess: { plus: false, pro: false },
});

const int = (value: unknown, max = Number.MAX_SAFE_INTEGER): number => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(0, Math.floor(n))) : 0;
};

const dateKey = (value: unknown): string | null => {
  const text = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && Number.isFinite(Date.parse(`${text}T00:00:00.000Z`))
    ? text
    : null;
};

const uniqueSorted = <T extends string | number>(values: readonly T[], max: number): T[] =>
  [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b))).slice(-max);

const normalizeDates = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return uniqueSorted(
    value.map(dateKey).filter((row): row is string => row !== null),
    MAX_ACTIVE_DATE_HISTORY,
  );
};

const normalizeComeback = (value: unknown): FoundationComebackProgress | null => {
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<FoundationComebackProgress>;
  const returnDate = dateKey(row.returnDate);
  const windowEndDate = dateKey(row.windowEndDate);
  if (!returnDate || !windowEndDate || windowEndDate < returnDate) return null;
  const activeDates = uniqueSorted(
    (Array.isArray(row.activeDates) ? row.activeDates : [])
      .map(dateKey)
      .filter((day): day is string => day !== null && day >= returnDate && day <= windowEndDate),
    MAX_COMEBACK_DATES,
  );
  return { returnDate, windowEndDate, activeDates, qualified: row.qualified === true || activeDates.length >= 7 };
};

export function normalizeFoundationProgress(value: unknown): AchievementFoundationProgressV2 {
  let row: Record<string, unknown> = {};
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) row = parsed as Record<string, unknown>;
  } catch (e) {
      // defaults
      DebugLogger.error('achievement_progress_v2:parsed', e instanceof Error ? e : new Error(String(e)), 'warning');
    }

  const paid = row.paidAccess && typeof row.paidAccess === 'object'
    ? row.paidAccess as Record<string, unknown>
    : {};
  return {
    version: 2,
    maxEligibleShardBalance: int(row.maxEligibleShardBalance),
    activeDates: normalizeDates(row.activeDates),
    comeback: normalizeComeback(row.comeback),
    paidAccess: { plus: paid.plus === true, pro: paid.pro === true },
  };
}

export function reduceFoundationShardBalance(
  value: AchievementFoundationProgressV2,
  eligibleBalance: unknown,
): AchievementFoundationProgressV2 {
  const state = normalizeFoundationProgress(value);
  const maxEligibleShardBalance = Math.max(state.maxEligibleShardBalance, int(eligibleBalance));
  return maxEligibleShardBalance === state.maxEligibleShardBalance
    ? state
    : { ...state, maxEligibleShardBalance };
}

const utcDayDelta = (from: string, to: string): number =>
  Math.floor((Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86_400_000);

const plusUtcDays = (day: string, count: number): string =>
  new Date(Date.parse(`${day}T00:00:00.000Z`) + count * 86_400_000).toISOString().slice(0, 10);

export function reduceFoundationActiveDay(
  value: AchievementFoundationProgressV2,
  activeDateValue: unknown,
  previousActiveDateValue: unknown,
): AchievementFoundationProgressV2 {
  const state = normalizeFoundationProgress(value);
  const activeDate = dateKey(activeDateValue);
  const previous = dateKey(previousActiveDateValue);
  if (!activeDate) return state;
  const activeDates = normalizeDates([...state.activeDates, activeDate]);

  let comeback = state.comeback;
  if (previous && utcDayDelta(previous, activeDate) >= 30 && !comeback?.qualified) {
    comeback = {
      returnDate: activeDate,
      windowEndDate: plusUtcDays(activeDate, 9),
      activeDates: [activeDate],
      qualified: false,
    };
  } else if (comeback && activeDate >= comeback.returnDate && activeDate <= comeback.windowEndDate) {
    const activeDates = uniqueSorted([...comeback.activeDates, activeDate], MAX_COMEBACK_DATES);
    comeback = { ...comeback, activeDates, qualified: comeback.qualified || activeDates.length >= 7 };
  }
  return { ...state, activeDates, comeback };
}

const comebackFromHistory = (activeDates: readonly string[]): FoundationComebackProgress | null => {
  const ordered = normalizeDates(activeDates);
  for (let i = 1; i < ordered.length; i += 1) {
    const previous = ordered[i - 1]!;
    const returned = ordered[i]!;
    if (utcDayDelta(previous, returned) < 30) continue;
    const windowEndDate = plusUtcDays(returned, 9);
    const windowDates = ordered.filter((day) => day >= returned && day <= windowEndDate);
    if (windowDates.length >= 7) {
      return {
        returnDate: returned,
        windowEndDate,
        activeDates: windowDates.slice(0, MAX_COMEBACK_DATES),
        qualified: true,
      };
    }
  }
  return null;
};

export function reduceFoundationActiveDateHistory(
  value: AchievementFoundationProgressV2,
  dates: readonly string[],
): AchievementFoundationProgressV2 {
  const state = normalizeFoundationProgress(value);
  const activeDates = normalizeDates([...state.activeDates, ...dates]);
  const comeback = state.comeback?.qualified
    ? state.comeback
    : comebackFromHistory(activeDates) ?? state.comeback;
  return { ...state, activeDates, comeback };
}

export function reduceFoundationPaidAccess(
  value: AchievementFoundationProgressV2,
  paid: Readonly<{ plus?: boolean; pro?: boolean }>,
): AchievementFoundationProgressV2 {
  const state = normalizeFoundationProgress(value);
  return {
    ...state,
    paidAccess: {
      plus: state.paidAccess.plus || paid.plus === true,
      pro: state.paidAccess.pro || paid.pro === true,
    },
  };
}

export function mergeFoundationProgress(
  leftValue: unknown,
  rightValue: unknown,
): AchievementFoundationProgressV2 {
  const left = normalizeFoundationProgress(leftValue);
  const right = normalizeFoundationProgress(rightValue);
  const activeDates = normalizeDates([...left.activeDates, ...right.activeDates]);
  const comeback = left.comeback?.qualified
    ? left.comeback
    : right.comeback?.qualified
      ? right.comeback
      : comebackFromHistory(activeDates) ?? normalizeComeback(left.comeback ?? right.comeback);
  return normalizeFoundationProgress({
    version: 2,
    maxEligibleShardBalance: Math.max(left.maxEligibleShardBalance, right.maxEligibleShardBalance),
    activeDates,
    comeback,
    paidAccess: {
      plus: left.paidAccess.plus || right.paidAccess.plus,
      pro: left.paidAccess.pro || right.paidAccess.pro,
    },
  });
}

export const mergeFoundationProgressStorageValue = (
  localRaw: string | null | undefined,
  cloudRaw: string,
): string => JSON.stringify(mergeFoundationProgress(localRaw, cloudRaw));

export async function loadFoundationProgress(
  token: AccountGenerationToken = captureAccountGeneration(),
): Promise<AchievementFoundationProgressV2> {
  if (!token.stableId || !isCurrentAccountGeneration(token)) return createEmptyFoundationProgress();
  try {
    const raw = await AsyncStorage.getItem(ACHIEVEMENT_FOUNDATION_PROGRESS_KEY);
    return isCurrentAccountGeneration(token)
      ? normalizeFoundationProgress(raw)
      : createEmptyFoundationProgress();
  } catch {
    return createEmptyFoundationProgress();
  }
}

export async function updateFoundationProgress(
  reducer: (current: AchievementFoundationProgressV2) => AchievementFoundationProgressV2,
  token: AccountGenerationToken = captureAccountGeneration(),
): Promise<AchievementFoundationProgressV2> {
  if (!token.stableId || !isCurrentAccountGeneration(token)) return createEmptyFoundationProgress();
  return withAccountTransitionLock(async () => withStorageLock(async () => {
    if (!isCurrentAccountGeneration(token)) return createEmptyFoundationProgress();
    const raw = await AsyncStorage.getItem(ACHIEVEMENT_FOUNDATION_PROGRESS_KEY);
    if (!isCurrentAccountGeneration(token)) return createEmptyFoundationProgress();
    const next = normalizeFoundationProgress(reducer(normalizeFoundationProgress(raw)));
    await AsyncStorage.setItem(ACHIEVEMENT_FOUNDATION_PROGRESS_KEY, JSON.stringify(next));
    return isCurrentAccountGeneration(token) ? next : createEmptyFoundationProgress();
  }));
}
