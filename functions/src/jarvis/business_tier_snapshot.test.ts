import { buildBusinessTierSnapshot, MRR_WINDOW_DAYS } from './business_tier_snapshot';
import type { RecentHistoryPoint } from './business_tier_history_store';

function point(dayKey: string, overrides: Partial<RecentHistoryPoint> = {}): RecentHistoryPoint {
  return {
    dayKey,
    cumulativeUsers: 1_000,
    newUsers: 5,
    newPaying: 1,
    renewals: 2,
    refunds: 0,
    revenueProxy: 3,
    grossUsdMicros: 0,
    mrrEquivalentProceedsUsdMicros: 0,
    dayMoneyCoverage: 'complete',
    activeUsers: 600,
    writtenAtMs: 1,
    ...overrides,
  };
}

const NOW = Date.parse('2026-08-02T12:00:00.000Z');

describe('buildBusinessTierSnapshot — current state derived from already-read history, no extra queries', () => {
  test('empty history yields an honest empty snapshot, not fabricated zeros', () => {
    const snapshot = buildBusinessTierSnapshot({ history: [], totalUsers: 0, activeUsers: null, storedPeakTier: null, nowMs: NOW });
    expect(snapshot.hasData).toBe(false);
    expect(snapshot.mrrUsd).toBeNull();
    expect(snapshot.moneyCoverage).toBe('unavailable');
  });

  test('MRR sums the monthly-equivalent proceeds across the trailing window', () => {
    const history = [
      point('2026-08-01', { mrrEquivalentProceedsUsdMicros: 3_000_000 }),
      point('2026-08-02', { mrrEquivalentProceedsUsdMicros: 2_000_000 }),
    ];
    const snapshot = buildBusinessTierSnapshot({ history, totalUsers: 1_000, activeUsers: 600, storedPeakTier: null, nowMs: NOW });
    expect(snapshot.mrrUsd).toBeCloseTo(5, 5); // 5_000_000 micros = $5
  });

  test('days older than the MRR window are excluded from the money sum', () => {
    const history = [
      point('2026-01-01', { mrrEquivalentProceedsUsdMicros: 99_000_000 }), // далеко за окном
      point('2026-08-02', { mrrEquivalentProceedsUsdMicros: 1_000_000 }),
    ];
    const snapshot = buildBusinessTierSnapshot({ history, totalUsers: 1_000, activeUsers: 600, storedPeakTier: null, nowMs: NOW });
    expect(snapshot.mrrUsd).toBeCloseTo(1, 5);
  });

  test('one partial day in the window downgrades the reported money coverage', () => {
    const history = [
      point('2026-08-01', { mrrEquivalentProceedsUsdMicros: 1_000_000, dayMoneyCoverage: 'complete' }),
      point('2026-08-02', { mrrEquivalentProceedsUsdMicros: 1_000_000, dayMoneyCoverage: 'partial' }),
    ];
    const snapshot = buildBusinessTierSnapshot({ history, totalUsers: 1_000, activeUsers: 600, storedPeakTier: null, nowMs: NOW });
    expect(snapshot.moneyCoverage).toBe('partial');
  });

  test('the tier comes from the two-factor health scale, not from registrations alone', () => {
    // деньги ~$5 тянут только на pre_seed, хотя регистраций 1000 и активных 600
    const history = [point('2026-08-02', { mrrEquivalentProceedsUsdMicros: 5_000_000 })];
    const snapshot = buildBusinessTierSnapshot({ history, totalUsers: 1_000, activeUsers: 600, storedPeakTier: null, nowMs: NOW });
    expect(snapshot.tier).toBe('pre_seed');
    expect(snapshot.currentTier).toBe('pre_seed');
  });

  test('a stored peak keeps the displayed tier while flagging the dip honestly', () => {
    const history = [point('2026-08-02', { mrrEquivalentProceedsUsdMicros: 5_000_000 })];
    const snapshot = buildBusinessTierSnapshot({ history, totalUsers: 1_000, activeUsers: 600, storedPeakTier: 'growth', nowMs: NOW });
    expect(snapshot.tier).toBe('growth');
    expect(snapshot.currentTier).toBe('pre_seed');
    expect(snapshot.belowPeak).toBe(true);
  });

  test('null activeUsers is carried through as null — never coerced to zero', () => {
    const history = [point('2026-08-02')];
    const snapshot = buildBusinessTierSnapshot({ history, totalUsers: 1_000, activeUsers: null, storedPeakTier: null, nowMs: NOW });
    expect(snapshot.activeUsers).toBeNull();
  });

  test('totalUsers is reported as read, independent of the tier scale', () => {
    const snapshot = buildBusinessTierSnapshot({ history: [point('2026-08-02')], totalUsers: 9_954, activeUsers: 600, storedPeakTier: null, nowMs: NOW });
    expect(snapshot.totalUsers).toBe(9_954);
  });

  test('the MRR window length is exported so the panel can label the number honestly', () => {
    expect(MRR_WINDOW_DAYS).toBe(30);
  });
});
