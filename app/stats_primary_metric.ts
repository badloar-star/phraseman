export const STATS_PRIMARY_METRICS = ['xp', 'time', 'year'] as const;

export type StatsPrimaryMetric = (typeof STATS_PRIMARY_METRICS)[number];

export const DEFAULT_STATS_PRIMARY_METRIC: StatsPrimaryMetric = 'xp';

export function isStatsPrimaryMetric(value: unknown): value is StatsPrimaryMetric {
  return typeof value === 'string' &&
    (STATS_PRIMARY_METRICS as readonly string[]).includes(value);
}

export function normalizeStatsPrimaryMetric(value: unknown): StatsPrimaryMetric {
  if (value === 'activity' || value === 'rhythm' || value === 'learned') return 'xp';
  return isStatsPrimaryMetric(value) ? value : DEFAULT_STATS_PRIMARY_METRIC;
}

type UnlockState = {
  id: string;
  unlockedAt: string | null;
};

export function recentUnlockedAchievementIds(
  states: readonly UnlockState[],
  limit = 4,
): string[] {
  const safeLimit = Math.max(0, Math.floor(limit));
  return states
    .filter((state): state is UnlockState & { unlockedAt: string } => state.unlockedAt !== null)
    .sort((a, b) => {
      const aTime = Date.parse(a.unlockedAt);
      const bTime = Date.parse(b.unlockedAt);
      const safeATime = Number.isFinite(aTime) ? aTime : 0;
      const safeBTime = Number.isFinite(bTime) ? bTime : 0;
      return safeBTime - safeATime || a.id.localeCompare(b.id);
    })
    .slice(0, safeLimit)
    .map((state) => state.id);
}
