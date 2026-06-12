export type AchievementProgress = readonly [number, number];

export type NearestAchievementItem<TAchievement extends { id: string }> = {
  achievement: TAchievement;
  current: number;
  target: number;
  remaining: number;
  progressPct: number;
};

export function getNearestLockedAchievements<TAchievement extends { id: string }>(
  achievements: readonly TAchievement[],
  unlockedIds: ReadonlySet<string>,
  getProgress: (id: string) => AchievementProgress | null,
  limit = 3,
): NearestAchievementItem<TAchievement>[] {
  return achievements
    .filter(achievement => !unlockedIds.has(achievement.id))
    .map(achievement => {
      const progress = getProgress(achievement.id);
      if (!progress) return null;
      const target = Math.max(0, Math.floor(progress[1]));
      const current = Math.max(0, Math.min(target, Math.floor(progress[0])));
      if (target <= 0 || current <= 0) return null;
      const progressPct = Math.round((current / target) * 100);
      return {
        achievement,
        current,
        target,
        remaining: Math.max(0, target - current),
        progressPct,
      };
    })
    .filter((item): item is NearestAchievementItem<TAchievement> => item !== null)
    .sort((a, b) =>
      b.progressPct - a.progressPct ||
      a.remaining - b.remaining ||
      a.target - b.target ||
      a.achievement.id.localeCompare(b.achievement.id),
    )
    .slice(0, Math.max(0, limit));
}
