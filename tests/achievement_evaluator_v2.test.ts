import {
  evaluateFoundationAchievements,
  type AchievementFoundationSnapshot,
} from '../app/achievement_evaluator_v2';

const snapshot = (
  patch: Partial<AchievementFoundationSnapshot> = {},
): AchievementFoundationSnapshot => ({
  streakDays: 0,
  cleanStreakDays: 0,
  maxEligibleShardBalance: 0,
  foregroundMs: 0,
  paidAccess: { plus: false, pro: false },
  activeDaysTotal: 0,
  accountAgeDays: 0,
  comebackQualified: false,
  ...patch,
});

describe('foundation achievement evaluator v2', () => {
  it('evaluates clean streak independently of the ordinary streak', () => {
    const ids = evaluateFoundationAchievements(snapshot({ streakDays: 365, cleanStreakDays: 364 }));
    expect(ids).toContain('streak_365');
    expect(ids).not.toContain('streak_clean_365');
    expect(evaluateFoundationAchievements(snapshot({ streakDays: 365, cleanStreakDays: 365 })))
      .toContain('streak_clean_365');
  });

  it('keeps confirmed paid-access achievements without league awards', () => {
    const ids = evaluateFoundationAchievements(snapshot({
      paidAccess: { plus: true, pro: true },
    }));
    expect(ids).toContain('access_plus_paid');
    expect(ids).toContain('access_pro_paid');
    expect(ids.some((id) => id.startsWith('league_'))).toBe(false);
  });

  it('evaluates all composite legend conjunctions', () => {
    const ids = evaluateFoundationAchievements(snapshot({
      streakDays: 1000,
      cleanStreakDays: 365,
      maxEligibleShardBalance: 10_000,
      foregroundMs: 1000 * 60 * 60_000,
      paidAccess: { plus: true, pro: true },
      activeDaysTotal: 500,
      accountAgeDays: 3 * 365,
      comebackQualified: true,
    }));
    expect(ids.filter((id) => id.startsWith('legend_'))).toEqual([
      'legend_second_wind',
      'legend_patient_capital',
      'legend_founder_era',
    ]);
  });
});
