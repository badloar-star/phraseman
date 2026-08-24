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

export const XP_THRESHOLDS = {
  xp_100: 100,
  xp_250: 250,
  xp_500: 500,
  xp_1000: 1_000,
  xp_2500: 2_500,
  xp_5000: 5_000,
  xp_10000: 10_000,
  xp_20000: 20_000,
  xp_50000: 50_000,
  xp_75000: 75_000,
  xp_100000: 100_000,
  xp_150000: 150_000,
  xp_250000: 250_000,
  xp_500000: 500_000,
  xp_750000: 750_000,
  xp_1000000: 1_000_000,
  xp_2000000: 2_000_000,
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

export const LEAGUE_REACHED_IDS = [
  'league_reached_copper',
  'league_reached_bronze',
  'league_reached_silver',
  'league_reached_gold',
  'league_reached_platinum',
  'league_reached_emerald',
  'league_reached_sapphire',
  'league_reached_ruby',
  'league_reached_diamond',
  'league_reached_black_diamond',
  'league_reached_ether',
  'league_reached_supreme',
] as const;

export interface AchievementFoundationSnapshot {
  streakDays: number;
  cleanStreakDays: number;
  totalXpBeforeAchievementRewards: number;
  maxEligibleShardBalance: number;
  reachedLeagueIds: readonly number[];
  championCount: number;
  championLeagueIds: readonly number[];
  diamondPlusConsecutiveWeeks: number;
  foregroundMs: number;
  paidAccess: Readonly<{ plus: boolean; pro: boolean }>;
  activeDaysTotal: number;
  accountAgeDays: number;
  comebackQualified: boolean;
  unlockedBeforeBatch: ReadonlySet<string>;
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

const validLeagueIds = (values: readonly number[]): Set<number> => new Set(
  values
    .map(Number)
    .filter((id) => Number.isInteger(id) && id >= 0 && id <= 11),
);

export function evaluateFoundationAchievements(
  input: AchievementFoundationSnapshot,
): string[] {
  const base = new Set<string>();
  const streak = finiteFloor(input.streakDays);
  const cleanStreak = finiteFloor(input.cleanStreakDays);
  const xp = finiteFloor(input.totalXpBeforeAchievementRewards);
  const maxShards = finiteFloor(input.maxEligibleShardBalance);
  const foregroundMs = finiteFloor(input.foregroundMs);
  const activeDays = finiteFloor(input.activeDaysTotal);
  const accountAgeDays = finiteFloor(input.accountAgeDays);
  const reached = validLeagueIds(input.reachedLeagueIds);
  const championLeagues = validLeagueIds(input.championLeagueIds);

  addThresholds(base, streak, STREAK_THRESHOLDS);
  if (cleanStreak >= 365) base.add('streak_clean_365');
  addThresholds(base, xp, XP_THRESHOLDS);
  addThresholds(base, maxShards, SHARD_MAX_THRESHOLDS);
  addThresholds(base, foregroundMs, FOREGROUND_THRESHOLDS_MS);

  reached.forEach((leagueId) => base.add(LEAGUE_REACHED_IDS[leagueId]!));
  const championCount = finiteFloor(input.championCount);
  if (championCount >= 1) base.add('league_champion');
  if (championCount >= 5) base.add('league_champion_5');
  if (championCount >= 10) base.add('league_champion_10');
  if (finiteFloor(input.diamondPlusConsecutiveWeeks) >= 4) base.add('league_diamond_4_weeks');
  if (input.paidAccess.plus) base.add('access_plus_paid');
  if (input.paidAccess.pro) base.add('access_pro_paid');

  // Legends are one non-recursive second pass. Cabinet count includes base awards
  // earned in this batch and achievements already durable before the batch, but it
  // cannot be inflated by other legends produced by this same pass.
  const before = new Set(
    [...input.unlockedBeforeBatch].filter((id) => ACTIVE_FOUNDATION_IDS.includes(id)),
  );
  const cabinet = new Set([...before, ...base]);
  const legends = new Set<string>();
  if (input.comebackQualified) legends.add('legend_second_wind');
  if (activeDays >= 365 && xp >= 100_000) legends.add('legend_long_game');
  if (reached.size === 12) legends.add('legend_every_league');
  if (championLeagues.has(11)) legends.add('legend_supreme_champion');
  if (cabinet.size >= 50) legends.add('legend_full_cabinet');
  if (streak >= 1000 && xp >= 1_000_000) legends.add('legend_one_more_zero');
  if (maxShards >= 10_000 && activeDays >= 100) legends.add('legend_patient_capital');
  if (accountAgeDays >= 3 * 365 && activeDays >= 500) legends.add('legend_founder_era');

  return ACTIVE_FOUNDATION_IDS.filter((id) => base.has(id) || legends.has(id));
}
