import { downsampleBusinessHistory, RECENT_DAILY_DAYS } from './business_tier_downsampling';
import type { RecentHistoryPoint } from './business_tier_history_store';

function point(dayKey: string, overrides: Partial<RecentHistoryPoint> = {}): RecentHistoryPoint {
  return {
    dayKey,
    cumulativeUsers: 100,
    newUsers: 3,
    newPaying: 1,
    renewals: 1,
    refunds: 0,
    revenueProxy: 2,
    grossUsdMicros: 1_000_000,
    mrrEquivalentProceedsUsdMicros: 700_000,
    dayMoneyCoverage: 'complete',
    activeUsers: 50,
    writtenAtMs: 1,
    ...overrides,
  };
}

const NOW = Date.parse('2026-08-02T12:00:00.000Z');

describe('downsampleBusinessHistory — recent days stay daily, older days collapse to weeks', () => {
  test('empty history yields empty buckets, not a fabricated point', () => {
    expect(downsampleBusinessHistory([], NOW)).toEqual({ daily: [], weekly: [] });
  });

  test('points inside the recent window stay daily and untouched', () => {
    const result = downsampleBusinessHistory([point('2026-08-01'), point('2026-08-02')], NOW);
    expect(result.daily.map((p) => p.dayKey)).toEqual(['2026-08-01', '2026-08-02']);
    expect(result.weekly).toEqual([]);
  });

  test('points older than the window are grouped into ISO weeks', () => {
    const old1 = '2026-01-05'; // ISO week 2026-W02
    const old2 = '2026-01-07';
    const result = downsampleBusinessHistory([point(old1), point(old2), point('2026-08-02')], NOW);
    expect(result.daily.map((p) => p.dayKey)).toEqual(['2026-08-02']);
    expect(result.weekly).toHaveLength(1);
    expect(result.weekly[0].weekKey).toBe('2026-W02');
  });

  test('flow metrics sum across the week, stock metrics take the last value', () => {
    // зачем: кумулятив нельзя суммировать — это уровень, а не поток.
    // Классическая ошибка, из-за которой график роста «взлетает» втрое.
    const result = downsampleBusinessHistory([
      point('2026-01-05', { cumulativeUsers: 100, grossUsdMicros: 1_000_000, activeUsers: 40 }),
      point('2026-01-06', { cumulativeUsers: 110, grossUsdMicros: 2_000_000, activeUsers: 45 }),
    ], NOW);
    const week = result.weekly[0];
    expect(week.grossUsdMicros).toBe(3_000_000); // поток — сумма
    expect(week.cumulativeUsers).toBe(110); // уровень — последнее
    expect(week.activeUsers).toBe(45);
  });

  test('the worst coverage in a week wins — one partial day makes the week partial', () => {
    const result = downsampleBusinessHistory([
      point('2026-01-05', { dayMoneyCoverage: 'complete' }),
      point('2026-01-06', { dayMoneyCoverage: 'partial' }),
    ], NOW);
    expect(result.weekly[0].dayMoneyCoverage).toBe('partial');
  });

  test('a week with no measurement at all reports null, never a fabricated zero', () => {
    const result = downsampleBusinessHistory([
      point('2026-01-05', { activeUsers: null }),
      point('2026-01-06', { activeUsers: null }),
    ], NOW);
    expect(result.weekly[0].activeUsers).toBeNull();
  });

  test('falls back to the last known activeUsers when only the tail is null', () => {
    // зачем: у бэкфилла хвост недели может быть null, но если в неделе есть
    // реальное измерение — честнее показать его, чем схлопнуть неделю в «нет данных».
    const result = downsampleBusinessHistory([
      point('2026-01-05', { activeUsers: null }),
      point('2026-01-06', { activeUsers: 42 }),
      point('2026-01-07', { activeUsers: null }),
    ], NOW);
    expect(result.weekly[0].activeUsers).toBe(42);
  });

  test('input order does not matter — points are sorted by day before bucketing', () => {
    const result = downsampleBusinessHistory([point('2026-08-02'), point('2026-08-01')], NOW);
    expect(result.daily.map((p) => p.dayKey)).toEqual(['2026-08-01', '2026-08-02']);
  });

  test('the recent window length is exported so the panel can label it honestly', () => {
    expect(RECENT_DAILY_DAYS).toBeGreaterThan(0);
  });
});
