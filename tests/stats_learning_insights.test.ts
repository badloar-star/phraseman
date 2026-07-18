import { buildStatsLearningInsights, formatCompactDuration } from '../app/stats_learning_insights';

const daysWithFourteenDailyRows = Array.from({ length: 14 }, (_, index) => ({
  date: `2026-07-${String(index + 1).padStart(2, '0')}`,
  xp: index < 7 ? (index === 0 ? 20 : 120) : (index === 7 ? 80 : 140),
  foregroundMs: 30 * 60_000,
  active: index !== 6,
}));

describe('stats learning insights', () => {
  it('formats duration without seconds and pads hour minutes', () => {
    expect(formatCompactDuration(64 * 60_000, 'ru')).toBe('1 ч 04 мин');
    expect(formatCompactDuration(42 * 60_000, 'ru')).toBe('42 мин');
    expect(formatCompactDuration(10_000, 'ru')).toBe('0 мин');
  });

  it('compares current week with the preceding seven days', () => {
    const insights = buildStatsLearningInsights(daysWithFourteenDailyRows);

    expect(insights.weekComparison.currentXp).toBe(920);
    expect(insights.weekComparison.previousXp).toBe(740);
  });

  it('returns an unavailable best-time insight without hourly observations', () => {
    expect(buildStatsLearningInsights(daysWithFourteenDailyRows).bestTime.status).toBe('unavailable');
  });
});
