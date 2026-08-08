import {
  BUSINESS_TIER_ORDER,
  BUSINESS_TIER_MONEY_THRESHOLDS_USD,
  BUSINESS_TIER_ACTIVE_THRESHOLDS,
  BUSINESS_TIER_THRESHOLDS,
  classifyBusinessTier,
  classifyBusinessTierByHealth,
  computeBusinessTierProgress,
  computeBusinessHealth,
} from './business_tier';

describe('Business tier classification — visible owner-facing scale, separate from internal Jarvis AppTier', () => {
  test.each([
    [0, 'pre_seed'],
    [499, 'pre_seed'],
    [500, 'seed'],
    [1_999, 'seed'],
    [2_000, 'early_growth'],
    [9_999, 'early_growth'],
    [10_000, 'growth'],
    [49_999, 'growth'],
    [50_000, 'scale_up'],
    [199_999, 'scale_up'],
    [200_000, 'mature'],
    [1_000_000, 'mature'],
  ])('%i registered users classifies as %s', (total, expected) => {
    expect(classifyBusinessTier(total)).toBe(expected);
  });

  test('negative or non-finite input fails closed to the earliest tier', () => {
    expect(classifyBusinessTier(-5)).toBe('pre_seed');
    expect(classifyBusinessTier(NaN)).toBe('pre_seed');
    expect(classifyBusinessTier(Infinity)).toBe('pre_seed');
  });

  test('tier order is monotonically increasing by threshold', () => {
    for (let i = 1; i < BUSINESS_TIER_ORDER.length; i += 1) {
      const prev = BUSINESS_TIER_THRESHOLDS[BUSINESS_TIER_ORDER[i - 1]];
      const curr = BUSINESS_TIER_THRESHOLDS[BUSINESS_TIER_ORDER[i]];
      expect(curr).toBeGreaterThan(prev);
    }
  });
});

describe('Business tier progress bar math', () => {
  test('midway through seed shows ~60% progress to early_growth', () => {
    // seed floor=500, early_growth floor=2000, span=1500; at 1400 -> 900/1500=0.6
    const progress = computeBusinessTierProgress(1_400);
    expect(progress.tier).toBe('seed');
    expect(progress.nextTier).toBe('early_growth');
    expect(progress.progressToNext).toBeCloseTo(0.6, 5);
    expect(progress.usersIntoTier).toBe(900);
    expect(progress.usersToNextTier).toBe(600);
  });

  test('exactly at a threshold shows 0% progress into the new tier', () => {
    const progress = computeBusinessTierProgress(2_000);
    expect(progress.tier).toBe('early_growth');
    expect(progress.progressToNext).toBeCloseTo(0, 5);
  });

  test('mature tier has no next tier and full progress', () => {
    const progress = computeBusinessTierProgress(500_000);
    expect(progress.tier).toBe('mature');
    expect(progress.nextTier).toBeNull();
    expect(progress.progressToNext).toBe(1);
    expect(progress.usersToNextTier).toBeNull();
  });

  test('negative input is treated as zero, not a crash', () => {
    const progress = computeBusinessTierProgress(-10);
    expect(progress.tier).toBe('pre_seed');
    expect(progress.usersIntoTier).toBe(0);
  });
});

describe('classifyBusinessTierByHealth — two-factor gate (money AND active users)', () => {
  // зачем два фактора (владелец 2026-08-02): один платящий кит на мёртвой
  // базе не должен рисовать 'growth'. Тир = МИНИМУМ из того, куда указывает
  // каждая метрика по отдельности — узкое место определяет реальную стадию.
  test('one strong metric alone does not lift the tier — the weaker one binds', () => {
    // деньги тянут на growth, активных всего на seed → итог seed
    const tier = classifyBusinessTierByHealth({ mrrUsd: 6_000, activeUsers: 600 });
    expect(tier).toBe('seed');
  });

  test('both metrics strong lift the tier together', () => {
    expect(classifyBusinessTierByHealth({ mrrUsd: 6_000, activeUsers: 12_000 })).toBe('growth');
  });

  test('zero money pins the tier to pre_seed regardless of a large active base', () => {
    expect(classifyBusinessTierByHealth({ mrrUsd: 0, activeUsers: 100_000 })).toBe('pre_seed');
  });

  test('invalid inputs fail closed to pre_seed, never optimistic', () => {
    expect(classifyBusinessTierByHealth({ mrrUsd: NaN, activeUsers: 100_000 })).toBe('pre_seed');
    expect(classifyBusinessTierByHealth({ mrrUsd: -5, activeUsers: -5 })).toBe('pre_seed');
  });

  test('money and active thresholds are monotonically increasing like the user thresholds', () => {
    for (let i = 1; i < BUSINESS_TIER_ORDER.length; i += 1) {
      expect(BUSINESS_TIER_MONEY_THRESHOLDS_USD[BUSINESS_TIER_ORDER[i]])
        .toBeGreaterThan(BUSINESS_TIER_MONEY_THRESHOLDS_USD[BUSINESS_TIER_ORDER[i - 1]]);
      expect(BUSINESS_TIER_ACTIVE_THRESHOLDS[BUSINESS_TIER_ORDER[i]])
        .toBeGreaterThan(BUSINESS_TIER_ACTIVE_THRESHOLDS[BUSINESS_TIER_ORDER[i - 1]]);
    }
  });
});

describe('computeBusinessHealth — ratchet: the tier never drops, the dip is shown honestly instead', () => {
  // зачем храповик (владелец 2026-08-02): экран не должен прыгать назад от
  // одной плохой недели с возвратами. Достигнутый максимум остаётся, но
  // просадка НЕ замалчивается — отдельным честным флагом.
  test('reaching a new high raises the tier and reports no dip', () => {
    const health = computeBusinessHealth({ mrrUsd: 6_000, activeUsers: 12_000 }, 'seed');
    expect(health.tier).toBe('growth');
    expect(health.peakTier).toBe('growth');
    expect(health.belowPeak).toBe(false);
  });

  test('a dip keeps the peak tier but flags belowPeak with the current honest tier', () => {
    const health = computeBusinessHealth({ mrrUsd: 100, activeUsers: 600 }, 'growth');
    expect(health.tier).toBe('growth'); // показываем достигнутое, не роняем экран
    expect(health.peakTier).toBe('growth');
    expect(health.currentTier).toBe('seed'); // но честно говорим, где метрики сейчас
    expect(health.belowPeak).toBe(true);
  });

  test('no prior peak means the current tier is the peak', () => {
    const health = computeBusinessHealth({ mrrUsd: 600, activeUsers: 2_600 }, null);
    expect(health.tier).toBe(health.currentTier);
    expect(health.belowPeak).toBe(false);
  });

  test('an unknown/garbage stored peak is ignored rather than trusted', () => {
    const health = computeBusinessHealth({ mrrUsd: 600, activeUsers: 2_600 }, 'not_a_tier' as never);
    expect(health.peakTier).toBe(health.currentTier);
    expect(health.belowPeak).toBe(false);
  });
});
