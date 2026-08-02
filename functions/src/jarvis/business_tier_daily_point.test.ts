import { buildDailyHistoryPoint } from './business_tier_daily_point';

const DAY = Date.parse('2026-08-02T09:00:00.000Z');

describe('buildDailyHistoryPoint — the cron point, unlike backfill, has a real active-user measurement', () => {
  test('writes today as the day key in UTC', () => {
    const point = buildDailyHistoryPoint({
      nowMs: DAY, totalUsers: 1_000, activeUsers: 600, previousCumulativeUsers: 995, revenueRows: [],
    });
    expect(point.dayKey).toBe('2026-08-02');
  });

  test('newUsers is the growth since the previous cumulative, never negative', () => {
    const point = buildDailyHistoryPoint({
      nowMs: DAY, totalUsers: 1_000, activeUsers: 600, previousCumulativeUsers: 995, revenueRows: [],
    });
    expect(point.cumulativeUsers).toBe(1_000);
    expect(point.newUsers).toBe(5);
  });

  test('a shrinking total (deletions) yields zero new users, not a negative count', () => {
    // зачем: аккаунты удаляются, тотал может уменьшиться. Отрицательные
    // "новые пользователи" на графике — бессмыслица, честнее ноль.
    const point = buildDailyHistoryPoint({
      nowMs: DAY, totalUsers: 990, activeUsers: 600, previousCumulativeUsers: 1_000, revenueRows: [],
    });
    expect(point.newUsers).toBe(0);
    expect(point.cumulativeUsers).toBe(990);
  });

  test('carries the real active-user measurement — this is what backfill cannot do', () => {
    const point = buildDailyHistoryPoint({
      nowMs: DAY, totalUsers: 1_000, activeUsers: 642, previousCumulativeUsers: 1_000, revenueRows: [],
    });
    expect(point.activeUsers).toBe(642);
  });

  test('an unavailable active count is stored as null, never as zero', () => {
    const point = buildDailyHistoryPoint({
      nowMs: DAY, totalUsers: 1_000, activeUsers: null, previousCumulativeUsers: 1_000, revenueRows: [],
    });
    expect(point.activeUsers).toBeNull();
  });

  test('aggregates the day money from the pre-normalized revenue rows', () => {
    const point = buildDailyHistoryPoint({
      nowMs: DAY, totalUsers: 1_000, activeUsers: 600, previousCumulativeUsers: 1_000,
      revenueRows: [{
        atMs: DAY, eventType: 'RENEWAL', periodType: null,
        grossUsdMicros: 4_990_000, estimatedProceedsUsdMicros: 3_493_000,
        financialCoverage: 'complete', billingCadence: 'monthly',
      }],
    });
    expect(point.renewals).toBe(1);
    expect(point.grossUsdMicros).toBe(4_990_000);
    expect(point.mrrEquivalentProceedsUsdMicros).toBe(3_493_000);
    expect(point.dayMoneyCoverage).toBe('complete');
  });

  test('a day with no revenue events is unavailable, not a confident zero-revenue day', () => {
    const point = buildDailyHistoryPoint({
      nowMs: DAY, totalUsers: 1_000, activeUsers: 600, previousCumulativeUsers: 1_000, revenueRows: [],
    });
    expect(point.grossUsdMicros).toBe(0);
    expect(point.dayMoneyCoverage).toBe('unavailable');
  });

  test('revenue events from other days are ignored — the point describes one day only', () => {
    const otherDay = Date.parse('2026-07-30T10:00:00.000Z');
    const point = buildDailyHistoryPoint({
      nowMs: DAY, totalUsers: 1_000, activeUsers: 600, previousCumulativeUsers: 1_000,
      revenueRows: [{
        atMs: otherDay, eventType: 'RENEWAL', periodType: null,
        grossUsdMicros: 9_000_000, estimatedProceedsUsdMicros: 9_000_000,
        financialCoverage: 'complete', billingCadence: 'monthly',
      }],
    });
    expect(point.renewals).toBe(0);
    expect(point.grossUsdMicros).toBe(0);
  });
});
