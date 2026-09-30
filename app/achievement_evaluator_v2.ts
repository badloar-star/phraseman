import { ACTIVE_FOUNDATION_IDS } from './achievement_catalog_v2';

export const STREAK_THRESHOLDS = {
  streak_3: 3,
  streak_7: 7,
  streak_14: 14,
  streak_30: 30,
  streak_60: 60,
  streak_100: 100,
  streak_150: 150,
  streak_200: 200,
  streak_250: 250,
  streak_365: 365,
  streak_500: 500,
  streak_750: 750,
  streak_1000: 1000,
} as const;

export const SHARD_MAX_THRESHOLDS = {
  shards_100: 100,
  shards_250: 250,
  shards_500: 500,
  shards_1000: 1_000,
  shards_2500: 2_500,
  shards_5000: 5_000,
  shards_10000: 10_000,
} as const;

export const FOREGROUND_THRESHOLDS_MS = {
  time_foreground_10h: 10 * 60 * 60_000,
  time_foreground_50h: 50 * 60 * 60_000,
  time_foreground_100h: 100 * 60 * 60_000,
  time_foreground_250h: 250 * 60 * 60_000,
  time_foreground_500h: 500 * 60 * 60_000,
  time_foreground_1000h: 1000 * 60 * 60_000,
} as const;

export interface AchievementFoundationSnapshot {
  streakDays: number;
  cleanStreakDays: number;
  maxEligibleShardBalance: number;
  foregroundMs: number;
  paidAccess: Readonly<{ plus: boolean; pro: boolean }>;
  activeDaysTotal: number;
  accountAgeDays: number;
  comebackQualified: boolean;
}

const finiteFloor = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
};

const addThresholds = (
  output: Set<string>,
  value: number,
  thresholds: Readonly<Record<string, number>>,
): void => {
  for (const [id, threshold] of Object.entries(thresholds)) {
    if (value >= threshold) output.add(id);
  }
};

export function evaluateFoundationAchievements(
  input: AchievementFoundationSnapshot,
): string[] {
  const base = new Set<string>();
  const streak = finiteFloor(input.streakDays);
  const cleanStreak = finiteFloor(input.cleanStreakDays);
  const maxShards = finiteFloor(input.maxEligibleShardBalance);
  const foregroundMs = finiteFloor(input.foregroundMs);
  const activeDays = finiteFloor(input.activeDaysTotal);
  const accountAgeDays = finiteFloor(input.accountAgeDays);

  addThresholds(base, streak, STREAK_THRESHOLDS);
  if (cleanStreak >= 365) base.add('streak_clean_365');
  addThresholds(base, maxShards, SHARD_MAX_THRESHOLDS);
  addThresholds(base, foregroundMs, FOREGROUND_THRESHOLDS_MS);

  if (input.paidAccess.plus) base.add('access_plus_paid');
  if (input.paidAccess.pro) base.add('access_pro_paid');

  const legends = new Set<string>();
  if (input.comebackQualified) legends.add('legend_second_wind');
  if (maxShards >= 10_000 && activeDays >= 100) legends.add('legend_patient_capital');
  if (accountAgeDays >= 3 * 365 && activeDays >= 500) legends.add('legend_founder_era');

  return ACTIVE_FOUNDATION_IDS.filter((id) => base.has(id) || legends.has(id));
}
