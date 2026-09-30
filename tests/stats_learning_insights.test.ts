import { buildStatsLearningInsights, formatCompactDuration } from '../app/stats_learning_insights';

const daysWithFourteenDailyRows = Array.from({ length: 14 }, (_, index) => ({
  date: `2026-07-${String(index + 1).padStart(2, '0')}`,
  foregroundMs: (index === 0 ? 20 : index === 7 ? 40 : 30) * 60_000,
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

    expect(insights.weekComparison.currentMinutes).toBe(220);
    expect(insights.weekComparison.previousMinutes).toBe(200);
    expect(insights.bestWeek.minutes).toBe(220);
    expect(insights).not.toHaveProperty('speed');
  });

  it('returns an unavailable best-time insight without hourly observations', () => {
    expect(buildStatsLearningInsights(daysWithFourteenDailyRows).bestTime.status).toBe('unavailable');
  });
});
