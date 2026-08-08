import {
  GROWTH_DAILY_COLLECTION,
  buildGrowthDailyAggregateWrite,
  utcDayKey,
} from './growth_daily_aggregate';

describe('server-owned daily growth aggregate contract', () => {
  test('uses a stable UTC day key at midnight boundaries', () => {
    expect(utcDayKey(Date.parse('2026-08-08T23:59:59.999Z'))).toBe('2026-08-08');
    expect(utcDayKey(Date.parse('2026-08-09T00:00:00.000Z'))).toBe('2026-08-09');
  });

  test('contains no uid or other per-user value', () => {
    const write = buildGrowthDailyAggregateWrite(1_777_000_000_000, { increment: (value) => ({ increment: value }) });

    expect(GROWTH_DAILY_COLLECTION).toBe('jarvis_growth_daily');
    expect(write).toEqual({
      dayKey: '2026-04-24',
      schemaVersion: 1,
      newUsers: { increment: 1 },
      lastObservedAtMs: 1_777_000_000_000,
      source: 'authEnsureStableLink:first_auth_link',
    });
    expect(Object.keys(write).join(' ')).not.toMatch(/uid|email|stable/i);
  });
});
