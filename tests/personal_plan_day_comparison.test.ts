jest.mock('../app/daily_analytics_sync', () => ({
  loadPercentileData: jest.fn(),
}));

import { loadPlanDayComparison, planDayComparisonLine } from '../app/personal_plan_day_comparison';
import { loadPercentileData } from '../app/daily_analytics_sync';

const loadPercentileDataMock = loadPercentileData as jest.MockedFunction<typeof loadPercentileData>;

function withDaily7xp(daily7xp: number | null, totalUsers = 1000) {
  loadPercentileDataMock.mockResolvedValue({
    myXp7: 0,
    myTime7ms: 0,
    percentiles: {
      xp: null, streak: null, weekXp: null,
      daily7xp, daily7timeMs: null, arenaXp: null, totalUsers,
    } as any,
  });
}

describe('plan day comparison', () => {
  beforeEach(() => loadPercentileDataMock.mockReset());

  it('returns top percent as the complement of the ahead-of percentile', async () => {
    withDaily7xp(77, 2000);
    const c = await loadPlanDayComparison();
    expect(c).not.toBeNull();
    expect(c!.aheadOfPercent).toBe(77);
    expect(c!.topPercent).toBe(23); // 100 - 77
    expect(c!.totalUsers).toBe(2000);
  });

  it('returns null when the learner is below the percentile sample (daily7xp null)', async () => {
    withDaily7xp(null);
    expect(await loadPlanDayComparison()).toBeNull();
  });

  it('clamps top percent to at least 1', async () => {
    withDaily7xp(99);
    const c = await loadPlanDayComparison();
    expect(c!.topPercent).toBe(1);
  });

  it('returns null on error', async () => {
    loadPercentileDataMock.mockRejectedValue(new Error('offline'));
    expect(await loadPlanDayComparison()).toBeNull();
  });

  it('formats an encouraging line', async () => {
    expect(planDayComparisonLine({ aheadOfPercent: 77, topPercent: 23, totalUsers: 2000 }))
      .toBe('Ты в топ 23% за сегодня');
  });
});
