import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { withStorageLock } from './storage_mutex';

export const ACHIEVEMENT_FOUNDATION_PROGRESS_KEY = 'achievement_foundation_progress_v2';
export const ACHIEVEMENT_ACCESS_PLUS_PAID_KEY = 'achievement_access_plus_paid_v1';
export const ACHIEVEMENT_ACCESS_PRO_PAID_KEY = 'achievement_access_pro_paid_v1';
const MAX_WEEK_HISTORY = 1_000;
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
  reachedLeagueIds: number[];
  processedLeagueWeeks: string[];
  championWeeks: string[];
  championLeagueIds: number[];
  legacyChampionCount: number;
  diamondPlusWeeks: string[];
  legacyDiamondPlusConsecutiveWeeks: number;
  diamondPlusConsecutiveWeeks: number;
  lastDiamondPlusWeekId: string | null;
  activeDates: string[];
  comeback: FoundationComebackProgress | null;
  paidAccess: { plus: boolean; pro: boolean };
}

export interface FoundationLeagueEvidence {
  weekId: string;
  points: number;
  prevLeagueId: number;
  newLeagueId: number;
  myRank: number;
  totalInGroup: number;
  confirmed: boolean;
}

export const createEmptyFoundationProgress = (): AchievementFoundationProgressV2 => ({
  version: 2,
  maxEligibleShardBalance: 0,
  reachedLeagueIds: [],
  processedLeagueWeeks: [],
  championWeeks: [],
  championLeagueIds: [],
  legacyChampionCount: 0,
  diamondPlusWeeks: [],
  legacyDiamondPlusConsecutiveWeeks: 0,
  diamondPlusConsecutiveWeeks: 0,
  lastDiamondPlusWeekId: null,
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

const weekKey = (value: unknown): string | null => {
  const text = String(value ?? '').trim();
  const match = /^(\d{4})-W(\d{2})$/.exec(text);
  if (!match) return null;
  const week = Number(match[2]);
  return week >= 1 && week <= 53 ? text : null;
};

const uniqueSorted = <T extends string | number>(values: readonly T[], max: number): T[] =>
  [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b))).slice(-max);

const leagueId = (value: unknown): number | null => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const normalized = Math.floor(n);
  return normalized >= 0 && normalized <= 11 ? normalized : null;
};

const normalizeLeagueIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return uniqueSorted(value.map(leagueId).filter((row): row is number => row !== null), 12)
    .sort((a, b) => a - b);
};

const normalizeWeeks = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return uniqueSorted(value.map(weekKey).filter((row): row is string => row !== null), MAX_WEEK_HISTORY);
};

const normalizeDates = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return uniqueSorted(
    value.map(dateKey).filter((row): row is string => row !== null),
    MAX_ACTIVE_DATE_HISTORY,
  );
};

const isoWeekOrdinal = (value: string): number | null => {
  const valid = weekKey(value);
  if (!valid) return null;
  const [yearText, weekText] = valid.split('-W');
  const year = Number(yearText);
  const week = Number(weekText);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const monday = Date.UTC(year, 0, 4 - jan4Day + 1 + (week - 1) * 7);
  return Math.floor(monday / (7 * 24 * 60 * 60_000));
};

const consecutiveTail = (weeks: readonly string[]): { count: number; last: string | null } => {
  const ordered = uniqueSorted(weeks.map(weekKey).filter((row): row is string => row !== null), MAX_WEEK_HISTORY)
    .map((week) => ({ week, ordinal: isoWeekOrdinal(week) }))
    .filter((row): row is { week: string; ordinal: number } => row.ordinal !== null)
    .sort((a, b) => a.ordinal - b.ordinal);
  if (ordered.length === 0) return { count: 0, last: null };
  let count = 1;
  for (let i = ordered.length - 1; i > 0; i -= 1) {
    if (ordered[i]!.ordinal - ordered[i - 1]!.ordinal !== 1) break;
    count += 1;
  }
  return { count, last: ordered[ordered.length - 1]!.week };
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
  } catch { /* defaults */ }

  const diamondPlusWeeks = normalizeWeeks(row.diamondPlusWeeks);
  const streak = consecutiveTail(diamondPlusWeeks);
  const paid = row.paidAccess && typeof row.paidAccess === 'object'
    ? row.paidAccess as Record<string, unknown>
    : {};
  return {
    version: 2,
    maxEligibleShardBalance: int(row.maxEligibleShardBalance),
    reachedLeagueIds: normalizeLeagueIds(row.reachedLeagueIds),
    processedLeagueWeeks: normalizeWeeks(row.processedLeagueWeeks),
    championWeeks: normalizeWeeks(row.championWeeks),
    championLeagueIds: normalizeLeagueIds(row.championLeagueIds),
    legacyChampionCount: int(row.legacyChampionCount, 10_000),
    diamondPlusWeeks,
    legacyDiamondPlusConsecutiveWeeks: int(row.legacyDiamondPlusConsecutiveWeeks, 1_000),
    diamondPlusConsecutiveWeeks: Math.max(int(row.legacyDiamondPlusConsecutiveWeeks, 1_000), streak.count),
    lastDiamondPlusWeekId: streak.last,
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

export function reduceFoundationLeagueResult(
  value: AchievementFoundationProgressV2,
  evidence: FoundationLeagueEvidence,
): AchievementFoundationProgressV2 {
  const state = normalizeFoundationProgress(value);
  const weekId = weekKey(evidence.weekId);
  if (!evidence.confirmed || !weekId || state.processedLeagueWeeks.includes(weekId)) return state;
  const points = int(evidence.points);
  const prevLeagueId = leagueId(evidence.prevLeagueId);
  const newLeagueId = leagueId(evidence.newLeagueId);
  if (prevLeagueId === null || newLeagueId === null) return state;
  const reached = new Set(state.reachedLeagueIds);
  if (points > 0 || prevLeagueId > 0) reached.add(prevLeagueId);
  if (points > 0 || newLeagueId > 0) reached.add(newLeagueId);

  const champion = int(evidence.totalInGroup) >= 2 && int(evidence.myRank) === 1;
  const championWeeks = champion
    ? uniqueSorted([...state.championWeeks, weekId], MAX_WEEK_HISTORY)
    : state.championWeeks;
  const championLeagueIds = champion
    ? normalizeLeagueIds([...state.championLeagueIds, prevLeagueId])
    : state.championLeagueIds;
  const diamondPlusWeeks = prevLeagueId >= 8
    ? uniqueSorted([...state.diamondPlusWeeks, weekId], MAX_WEEK_HISTORY)
    : state.diamondPlusWeeks;
  const diamondStreak = consecutiveTail(diamondPlusWeeks);

  return {
    ...state,
    reachedLeagueIds: normalizeLeagueIds([...reached]),
    processedLeagueWeeks: uniqueSorted([...state.processedLeagueWeeks, weekId], MAX_WEEK_HISTORY),
    championWeeks,
    championLeagueIds,
    legacyChampionCount: state.legacyChampionCount,
    diamondPlusWeeks,
    legacyDiamondPlusConsecutiveWeeks: state.legacyDiamondPlusConsecutiveWeeks,
    diamondPlusConsecutiveWeeks: Math.max(state.legacyDiamondPlusConsecutiveWeeks, diamondStreak.count),
    lastDiamondPlusWeekId: diamondStreak.last,
  };
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

export function reduceFoundationLegacyCounters(
  value: AchievementFoundationProgressV2,
  legacy: Readonly<{ championCount?: unknown; diamondPlusWeeks?: unknown }>,
): AchievementFoundationProgressV2 {
  const state = normalizeFoundationProgress(value);
  const legacyChampionCount = Math.max(state.legacyChampionCount, int(legacy.championCount, 10_000));
  const legacyDiamondPlusConsecutiveWeeks = Math.max(
    state.legacyDiamondPlusConsecutiveWeeks,
    int(legacy.diamondPlusWeeks, 1_000),
  );
  return {
    ...state,
    legacyChampionCount,
    legacyDiamondPlusConsecutiveWeeks,
    diamondPlusConsecutiveWeeks: Math.max(
      state.diamondPlusConsecutiveWeeks,
      legacyDiamondPlusConsecutiveWeeks,
    ),
  };
}

export function mergeFoundationProgress(
  leftValue: unknown,
  rightValue: unknown,
): AchievementFoundationProgressV2 {
  const left = normalizeFoundationProgress(leftValue);
  const right = normalizeFoundationProgress(rightValue);
  const diamondPlusWeeks = uniqueSorted([...left.diamondPlusWeeks, ...right.diamondPlusWeeks], MAX_WEEK_HISTORY);
  const streak = consecutiveTail(diamondPlusWeeks);
  const activeDates = normalizeDates([...left.activeDates, ...right.activeDates]);
  const comeback = left.comeback?.qualified
    ? left.comeback
    : right.comeback?.qualified
      ? right.comeback
      : comebackFromHistory(activeDates) ?? normalizeComeback(left.comeback ?? right.comeback);
  return normalizeFoundationProgress({
    version: 2,
    maxEligibleShardBalance: Math.max(left.maxEligibleShardBalance, right.maxEligibleShardBalance),
    reachedLeagueIds: [...left.reachedLeagueIds, ...right.reachedLeagueIds],
    processedLeagueWeeks: [...left.processedLeagueWeeks, ...right.processedLeagueWeeks],
    championWeeks: [...left.championWeeks, ...right.championWeeks],
    championLeagueIds: [...left.championLeagueIds, ...right.championLeagueIds],
    legacyChampionCount: Math.max(left.legacyChampionCount, right.legacyChampionCount),
    diamondPlusWeeks,
    legacyDiamondPlusConsecutiveWeeks: Math.max(
      left.legacyDiamondPlusConsecutiveWeeks,
      right.legacyDiamondPlusConsecutiveWeeks,
    ),
    diamondPlusConsecutiveWeeks: Math.max(
      left.legacyDiamondPlusConsecutiveWeeks,
      right.legacyDiamondPlusConsecutiveWeeks,
      streak.count,
    ),
    lastDiamondPlusWeekId: streak.last,
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
