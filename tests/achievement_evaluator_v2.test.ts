import {
  evaluateFoundationAchievements,
  type AchievementFoundationSnapshot,
} from '../app/achievement_evaluator_v2';

const snapshot = (
  patch: Partial<AchievementFoundationSnapshot> = {},
): AchievementFoundationSnapshot => ({
  streakDays: 0,
  cleanStreakDays: 0,
  totalXpBeforeAchievementRewards: 0,
  maxEligibleShardBalance: 0,
  reachedLeagueIds: [],
  championCount: 0,
  championLeagueIds: [],
  diamondPlusConsecutiveWeeks: 0,
  foregroundMs: 0,
  paidAccess: { plus: false, pro: false },
  activeDaysTotal: 0,
  accountAgeDays: 0,
  comebackQualified: false,
  unlockedBeforeBatch: new Set<string>(),
  ...patch,
});

describe('foundation achievement evaluator v2', () => {
  it('uses inclusive boundaries without borrowing reward XP', () => {
    expect(evaluateFoundationAchievements(snapshot({ totalXpBeforeAchievementRewards: 99 })))
      .not.toContain('xp_100');
    expect(evaluateFoundationAchievements(snapshot({ totalXpBeforeAchievementRewards: 100 })))
      .toContain('xp_100');
    expect(evaluateFoundationAchievements(snapshot({ totalXpBeforeAchievementRewards: 99 })))
      .not.toContain('xp_250');
  });

  it('evaluates clean streak independently of the ordinary streak', () => {
    const ids = evaluateFoundationAchievements(snapshot({ streakDays: 365, cleanStreakDays: 364 }));
    expect(ids).toContain('streak_365');
    expect(ids).not.toContain('streak_clean_365');
    expect(evaluateFoundationAchievements(snapshot({ streakDays: 365, cleanStreakDays: 365 })))
      .toContain('streak_clean_365');
  });

  it('maps all reached leagues and confirmed paid access', () => {
    const ids = evaluateFoundationAchievements(snapshot({
      reachedLeagueIds: Array.from({ length: 12 }, (_, i) => i),
      paidAccess: { plus: true, pro: true },
    }));
    expect(ids).toContain('league_reached_copper');
    expect(ids).toContain('league_reached_supreme');
    expect(ids).toContain('access_plus_paid');
    expect(ids).toContain('access_pro_paid');
    expect(ids).toContain('legend_every_league');
  });

  it('evaluates all composite legend conjunctions', () => {
    const ids = evaluateFoundationAchievements(snapshot({
      streakDays: 1000,
      cleanStreakDays: 365,
      totalXpBeforeAchievementRewards: 1_000_000,
      maxEligibleShardBalance: 10_000,
      reachedLeagueIds: Array.from({ length: 12 }, (_, i) => i),
      championCount: 10,
      championLeagueIds: [11],
      diamondPlusConsecutiveWeeks: 4,
      foregroundMs: 1000 * 60 * 60_000,
      paidAccess: { plus: true, pro: true },
      activeDaysTotal: 500,
      accountAgeDays: 3 * 365,
      comebackQualified: true,
      unlockedBeforeBatch: new Set<string>(),
    }));
    expect(ids.filter((id) => id.startsWith('legend_'))).toEqual([
      'legend_second_wind',
      'legend_long_game',
      'legend_every_league',
      'legend_supreme_champion',
      'legend_full_cabinet',
      'legend_one_more_zero',
      'legend_patient_capital',
      'legend_founder_era',
    ]);
  });
});
