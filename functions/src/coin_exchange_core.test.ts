import {
  DEFAULT_COIN_EXCHANGE_CONFIG,
  clampRateToCorridor,
  computeExchangeOutcome,
  computeNextExchangeRate,
  computeNextRecalcAtMs,
  normalizeCoinExchangeConfig,
  previousUtcExchangeDayKey,
  utcExchangeDayKey,
  validateAdminSetRateInput,
  validateExchangeCoinsAmount,
  validateExchangeHistoryDays,
  validateExchangeIdempotencyKey,
  type CoinExchangeConfig,
} from './coin_exchange_core';

// Биржа «монеты → звёзды» (план 2026-07-20, §6). Здесь — чистая математика
// курса: суточный кап ±10%, коридор, дрейф к базе при падении спроса,
// нулевой объём, округление.

const cfg = (over: Partial<CoinExchangeConfig> = {}): CoinExchangeConfig =>
  Object.freeze({ ...DEFAULT_COIN_EXCHANGE_CONFIG, ...over });

describe('computeNextExchangeRate', () => {
  it('demand above baseline raises the rate proportionally', () => {
    // ratio = 750/500 = 1.5 → рост на 0.5 × 10% = 5%: 80 → 84
    const r = computeNextExchangeRate({ config: cfg(), yesterdayVolumeCoins: 750 });
    expect(r.nextRate).toBe(84);
    expect(r.direction).toBe('demand_up');
    expect(r.demandRatio).toBeCloseTo(1.5);
  });

  it('caps daily growth at maxDailyChangePct even on extreme demand', () => {
    // ratio = 5000/500 = 10 → зажато в min(ratio, 2): рост ровно +10%: 80 → 88
    const r = computeNextExchangeRate({ config: cfg(), yesterdayVolumeCoins: 5000 });
    expect(r.nextRate).toBe(88);
  });

  it('ratio exactly 2x gives the full daily step', () => {
    const r = computeNextExchangeRate({ config: cfg(), yesterdayVolumeCoins: 1000 });
    expect(r.nextRate).toBe(88);
  });

  it('clamps the raised rate to corridorMax', () => {
    const r = computeNextExchangeRate({
      config: cfg({ currentRate: 98 }),
      yesterdayVolumeCoins: 5000,
    });
    expect(r.nextRate).toBe(100);
  });

  it('drifts down toward baseRate when demand is below baseline', () => {
    // Курс вырос до 95, спрос просел (100/500 = 0.2 ≤ 1) → шаг к базе 80,
    // ограниченный 10% от 95 = 9.5 → 95 − 9.5 = 85.5 → 86 (round)
    const r = computeNextExchangeRate({
      config: cfg({ currentRate: 95 }),
      yesterdayVolumeCoins: 100,
    });
    expect(r.nextRate).toBe(86);
    expect(r.direction).toBe('drift_to_base');
  });

  it('zero volume still drifts toward base, never to zero', () => {
    const r = computeNextExchangeRate({
      config: cfg({ currentRate: 95 }),
      yesterdayVolumeCoins: 0,
    });
    expect(r.direction).toBe('drift_to_base');
    expect(r.nextRate).toBe(86);
    expect(r.nextRate).toBeGreaterThan(cfg().baseRate);
  });

  it('drifts UP toward base when current rate is below base and demand is low', () => {
    const r = computeNextExchangeRate({
      config: cfg({ currentRate: 70 }),
      yesterdayVolumeCoins: 0,
    });
    // gap = 80 − 70 = 10; шаг ≤ 7 (10% от 70) → 77
    expect(r.nextRate).toBe(77);
    expect(r.direction).toBe('drift_to_base');
  });

  it('is flat when already at base with no excess demand', () => {
    const r = computeNextExchangeRate({ config: cfg(), yesterdayVolumeCoins: 250 });
    expect(r.nextRate).toBe(80);
    expect(r.direction).toBe('flat');
  });

  it('never leaves the corridor on the low side', () => {
    const r = computeNextExchangeRate({
      config: cfg({ currentRate: 62, baseRate: 60 }),
      yesterdayVolumeCoins: 0,
    });
    expect(r.nextRate).toBe(60);
    expect(r.nextRate).toBeGreaterThanOrEqual(60);
  });

  it('treats zero baseline as zero demand (drift to base)', () => {
    const r = computeNextExchangeRate({
      config: cfg({ baselineDailyCoins: 0, currentRate: 90 }),
      yesterdayVolumeCoins: 9999,
    });
    expect(r.demandRatio).toBe(0);
    expect(r.direction).toBe('drift_to_base');
  });
});

describe('clampRateToCorridor', () => {
  it('clamps and rounds', () => {
    expect(clampRateToCorridor(85.5, 60, 100)).toBe(86);
    expect(clampRateToCorridor(10, 60, 100)).toBe(60);
    expect(clampRateToCorridor(1000, 60, 100)).toBe(100);
  });
});

describe('normalizeCoinExchangeConfig', () => {
  it('returns defaults for empty/broken input', () => {
    expect(normalizeCoinExchangeConfig(undefined)).toEqual(DEFAULT_COIN_EXCHANGE_CONFIG);
    expect(normalizeCoinExchangeConfig({ baseRate: 'x' })).toEqual(DEFAULT_COIN_EXCHANGE_CONFIG);
  });

  it('clamps a stored currentRate into the corridor', () => {
    const c = normalizeCoinExchangeConfig({ currentRate: 999 });
    expect(c.currentRate).toBe(100);
  });

  it('falls back to defaults on an inverted corridor', () => {
    const c = normalizeCoinExchangeConfig({ corridorMin: 100, corridorMax: 60 });
    expect(c.corridorMin).toBe(60);
    expect(c.corridorMax).toBe(100);
  });
});

describe('computeExchangeOutcome', () => {
  const base = { coinBalance: 100, starBalance: 5, coins: 3, rate: 80 };

  it('debits coins and credits stars 1:rate', () => {
    const o = computeExchangeOutcome({ ...base, existingTrade: null });
    expect(o).toEqual({
      kind: 'write',
      coins: 3,
      starsGranted: 240,
      rateUsed: 80,
      nextCoinBalance: 97,
      nextStarBalance: 245,
    });
  });

  it('rejects insufficient balance without touching anything', () => {
    const o = computeExchangeOutcome({ ...base, coins: 101, existingTrade: null });
    expect(o).toEqual({ kind: 'insufficient', balance: 100 });
  });

  it('replays an existing trade without double-spending', () => {
    const o = computeExchangeOutcome({
      ...base,
      existingTrade: { stars: 240, rate: 80 },
    });
    expect(o).toEqual({ kind: 'replay', starsGranted: 240, rateUsed: 80 });
  });
});

describe('validators', () => {
  it('coins must be a positive bounded integer', () => {
    expect(validateExchangeCoinsAmount(10)).toEqual({ ok: true, value: 10 });
    expect(validateExchangeCoinsAmount(0).ok).toBe(false);
    expect(validateExchangeCoinsAmount(-5).ok).toBe(false);
    expect(validateExchangeCoinsAmount(1.5).ok).toBe(false);
    expect(validateExchangeCoinsAmount('10').ok).toBe(false);
    expect(validateExchangeCoinsAmount(100001).ok).toBe(false);
  });

  it('idempotencyKey format', () => {
    expect(validateExchangeIdempotencyKey('abcd-1234:XYZ_')).toEqual({
      ok: true,
      value: 'abcd-1234:XYZ_',
    });
    expect(validateExchangeIdempotencyKey('short').ok).toBe(false);
    expect(validateExchangeIdempotencyKey('has space inside').ok).toBe(false);
    expect(validateExchangeIdempotencyKey('has/slash/inside').ok).toBe(false);
  });

  it('history days default and cap', () => {
    expect(validateExchangeHistoryDays(undefined)).toBe(14);
    expect(validateExchangeHistoryDays(0)).toBe(14);
    expect(validateExchangeHistoryDays(7)).toBe(7);
    expect(validateExchangeHistoryDays(500)).toBe(90);
  });

  it('admin rate must sit inside the corridor with a reason', () => {
    expect(validateAdminSetRateInput({ rate: 90, reason: 'promo week' }, 60, 100)).toEqual({
      ok: true,
      value: { rate: 90, reason: 'promo week' },
    });
    expect(validateAdminSetRateInput({ rate: 59, reason: 'x' }, 60, 100).ok).toBe(false);
    expect(validateAdminSetRateInput({ rate: 101, reason: 'x' }, 60, 100).ok).toBe(false);
    expect(validateAdminSetRateInput({ rate: 90, reason: '  ' }, 60, 100).ok).toBe(false);
    expect(validateAdminSetRateInput({ rate: 8.5, reason: 'x' }, 60, 100).ok).toBe(false);
  });
});

describe('day keys and schedule', () => {
  it('utc day key and previous day key', () => {
    const ms = Date.UTC(2026, 6, 21, 4, 17, 0); // 2026-07-21 04:17 UTC
    expect(utcExchangeDayKey(ms)).toBe('2026-07-21');
    expect(previousUtcExchangeDayKey(ms)).toBe('2026-07-20');
  });

  it('next recalc is the next 04:17 UTC', () => {
    const before = Date.UTC(2026, 6, 21, 3, 0, 0);
    expect(computeNextRecalcAtMs(before)).toBe(Date.UTC(2026, 6, 21, 4, 17, 0));
    const after = Date.UTC(2026, 6, 21, 5, 0, 0);
    expect(computeNextRecalcAtMs(after)).toBe(Date.UTC(2026, 6, 22, 4, 17, 0));
  });
});

// ── Центр монет Admin V2: проекции и агрегация adminGetCoinExchangeCenter ───

import {
  aggregateCoinTradeStats,
  normalizeCoinCenterManualOverride,
  projectCoinCenterHistoryPoint,
  projectCoinCenterOverrideAudit,
} from './coin_exchange_core';

describe('projectCoinCenterHistoryPoint', () => {
  it('maps a full history row with manual source', () => {
    expect(projectCoinCenterHistoryPoint('2026-07-20', {
      date: '2026-07-20',
      rate: 90,
      volumeCoins: 120,
      volumeStars: 10800,
      reason: 'manual',
    })).toEqual({
      date: '2026-07-20',
      rate: 90,
      volumeCoins: 120,
      volumeStars: 10800,
      source: 'manual',
    });
  });

  it('falls back to doc id and zeros, source defaults to auto', () => {
    expect(projectCoinCenterHistoryPoint('2026-07-21', undefined)).toEqual({
      date: '2026-07-21',
      rate: 0,
      volumeCoins: 0,
      volumeStars: 0,
      source: 'auto',
    });
  });
});

describe('aggregateCoinTradeStats', () => {
  it('sums volumes and counts unique users', () => {
    const stats = aggregateCoinTradeStats([
      { coins: 3, stars: 240, uid: 'u1' },
      { coins: 2, stars: 160, uid: 'u2' },
      { coins: 1, stars: 80, uid: 'u1' },
    ]);
    expect(stats).toEqual({ volumeCoins: 6, volumeStars: 480, trades: 3, uniqueUsers: 2 });
  });

  it('handles empty and malformed rows', () => {
    expect(aggregateCoinTradeStats([])).toEqual({
      volumeCoins: 0,
      volumeStars: 0,
      trades: 0,
      uniqueUsers: 0,
    });
    const stats = aggregateCoinTradeStats([{ coins: 'x', stars: null }]);
    expect(stats).toEqual({ volumeCoins: 0, volumeStars: 0, trades: 1, uniqueUsers: 0 });
  });
});

describe('normalizeCoinCenterManualOverride', () => {
  it('maps byUid/at to author/atMs', () => {
    expect(normalizeCoinCenterManualOverride({
      rate: 95,
      reason: 'promo',
      byUid: 'admin1',
      at: '2026-07-20T10:00:00.000Z',
    })).toEqual({
      rate: 95,
      reason: 'promo',
      author: 'admin1',
      atMs: Date.parse('2026-07-20T10:00:00.000Z'),
    });
  });

  it('returns null for missing or rate-less override', () => {
    expect(normalizeCoinCenterManualOverride(null)).toBeNull();
    expect(normalizeCoinCenterManualOverride({ reason: 'x' })).toBeNull();
  });
});

describe('projectCoinCenterOverrideAudit', () => {
  it('maps an admin_log row into an override entry', () => {
    expect(projectCoinCenterOverrideAudit({
      after: { currentRate: 90 },
      reason: 'season start',
      actorUid: 'owner1',
      timestamp: '2026-07-19T04:17:00.000Z',
    })).toEqual({
      rate: 90,
      reason: 'season start',
      author: 'owner1',
      atMs: Date.parse('2026-07-19T04:17:00.000Z'),
    });
  });

  it('returns null without a valid after.currentRate', () => {
    expect(projectCoinCenterOverrideAudit({ reason: 'x' })).toBeNull();
    expect(projectCoinCenterOverrideAudit(undefined)).toBeNull();
  });
});

// ── Миграция осколков → монет 20:1 (решение владельца 2026-07-21) ───────────

import { COIN_MIGRATION_RATE, computeCoinMigration } from './coin_exchange_core';

describe('computeCoinMigration (20 shards = 1 coin, ceil, min 1)', () => {
  it('exact multiples convert without rounding loss', () => {
    expect(computeCoinMigration(20)).toBe(1);
    expect(computeCoinMigration(100)).toBe(5);
    expect(computeCoinMigration(400)).toBe(20);
  });

  it('rounds UP on non-multiples', () => {
    expect(computeCoinMigration(21)).toBe(2);
    expect(computeCoinMigration(39)).toBe(2);
    expect(computeCoinMigration(41)).toBe(3);
    expect(computeCoinMigration(1)).toBe(1);
    expect(computeCoinMigration(19)).toBe(1);
  });

  it('min 1 coin for any positive balance', () => {
    expect(computeCoinMigration(1)).toBe(1);
    expect(computeCoinMigration(5)).toBe(1);
  });

  it('zero and garbage balances give 0 (no flag-worthy grant)', () => {
    expect(computeCoinMigration(0)).toBe(0);
    expect(computeCoinMigration(-50)).toBe(0);
    expect(computeCoinMigration(NaN)).toBe(0);
    expect(computeCoinMigration(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('huge balances stay safe integers', () => {
    expect(computeCoinMigration(1_000_000)).toBe(50_000);
    expect(computeCoinMigration(1_000_001)).toBe(50_001);
    expect(Number.isSafeInteger(computeCoinMigration(9_007_199_254_740_991))).toBe(true);
  });

  it('rate constant is 20', () => {
    expect(COIN_MIGRATION_RATE).toBe(20);
  });
});
