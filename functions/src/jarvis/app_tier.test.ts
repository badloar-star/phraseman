import { classifyAppTier, APP_TIER_THRESHOLDS, tierThresholdMultiplier, tierAbsoluteThresholdMultiplier } from './app_tier';

describe('Jarvis app tier — classify by active user count', () => {
  test.each([
    [0, 'seed'],
    [999, 'seed'],
    [1_000, 'growth'],
    [4_999, 'growth'],
    [5_000, 'scale'],
    [19_999, 'scale'],
    [20_000, 'mature'],
    [1_000_000, 'mature'],
  ])('%i active users classifies as %s', (count, expectedTier) => {
    expect(classifyAppTier(count)).toBe(expectedTier);
  });

  test('negative or non-finite counts fail closed to the most cautious tier (seed)', () => {
    expect(classifyAppTier(-5)).toBe('seed');
    expect(classifyAppTier(NaN)).toBe('seed');
  });

  test('thresholds are exported so the panel can render them without duplicating numbers', () => {
    expect(APP_TIER_THRESHOLDS).toEqual({ seed: 0, growth: 1_000, scale: 5_000, mature: 20_000 });
  });
});

describe('Jarvis app tier — threshold multiplier scales spike sensitivity', () => {
  test('seed tier uses the tightest multiplier — small bases need a bigger relative signal to matter less', () => {
    // зачем владелец попросил именно так, 2026-08-02: "просадка на 5% при 5 тыс.
    // юзеров — не трагедия" → на маленькой базе важен рост абсолютного порога,
    // не понижение чувствительности. seed получает multiplier > 1 (порог выше).
    expect(tierThresholdMultiplier('seed')).toBeGreaterThan(tierThresholdMultiplier('mature'));
  });

  test('multipliers are monotonically non-increasing as the tier grows', () => {
    const tiers = ['seed', 'growth', 'scale', 'mature'] as const;
    const multipliers: number[] = tiers.map(tierThresholdMultiplier);
    for (let i = 1; i < multipliers.length; i += 1) {
      expect(multipliers[i]).toBeLessThanOrEqual(multipliers[i - 1]);
    }
  });

  test('every multiplier is a positive finite number', () => {
    for (const tier of ['seed', 'growth', 'scale', 'mature'] as const) {
      const m = tierThresholdMultiplier(tier);
      expect(Number.isFinite(m)).toBe(true);
      expect(m).toBeGreaterThan(0);
    }
  });
});

describe('Jarvis app tier — absolute threshold multiplier scales the OPPOSITE way', () => {
  // зачем: абсолютное число событий (репортов) — заметный сигнал на маленькой
  // базе, капля в море на большой. Порог должен РАСТИ с тиром, не убывать.
  test('seed uses the smallest absolute multiplier — mature the largest', () => {
    expect(tierAbsoluteThresholdMultiplier('seed')).toBeLessThan(tierAbsoluteThresholdMultiplier('mature'));
  });

  test('absolute multipliers are monotonically non-decreasing as the tier grows', () => {
    const tiers = ['seed', 'growth', 'scale', 'mature'] as const;
    const multipliers: number[] = tiers.map(tierAbsoluteThresholdMultiplier);
    for (let i = 1; i < multipliers.length; i += 1) {
      expect(multipliers[i]).toBeGreaterThanOrEqual(multipliers[i - 1]);
    }
  });

  test('every absolute multiplier is a positive finite number', () => {
    for (const tier of ['seed', 'growth', 'scale', 'mature'] as const) {
      const m = tierAbsoluteThresholdMultiplier(tier);
      expect(Number.isFinite(m)).toBe(true);
      expect(m).toBeGreaterThan(0);
    }
  });
});
