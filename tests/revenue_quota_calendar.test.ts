import {
  canonicalizeRevenueQuotaTimeZone,
  nextLocalMidnightMs,
  resolveRevenueQuotaDailyWindow,
} from '../app/revenue_quota_calendar';

describe('Revenue VNext daily quota calendar', () => {
  test('canonicalizes real IANA zones and rejects invented zones', () => {
    expect(canonicalizeRevenueQuotaTimeZone(' Europe/Dublin ')).toBe('Europe/Dublin');
    expect(() => canonicalizeRevenueQuotaTimeZone('Mars/Olympus')).toThrow('revenue_quota_timezone_invalid');
  });

  test.each([
    ['spring DST', '2026-03-29T12:00:00.000Z', '2026-03-29T23:00:00.000Z'],
    ['autumn DST', '2026-10-25T12:00:00.000Z', '2026-10-26T00:00:00.000Z'],
  ])('finds %s next local midnight without adding a fixed 24 hours', (_label, nowIso, expectedIso) => {
    expect(new Date(nextLocalMidnightMs(Date.parse(nowIso), 'Europe/Dublin')).toISOString()).toBe(expectedIso);
  });

  test('retains the current window zone until its boundary despite timezone hopping', () => {
    const active = {
      period: '2026-03-29@Europe/Dublin',
      timeZone: 'Europe/Dublin',
      resetAt: Date.parse('2026-03-29T23:00:00.000Z'),
      observedAtMs: Date.parse('2026-03-29T12:00:00.000Z'),
    };
    expect(resolveRevenueQuotaDailyWindow({
      nowMs: Date.parse('2026-03-29T13:00:00.000Z'),
      requestedTimeZone: 'Asia/Tokyo',
      observations: [active],
    })).toEqual({ ...active, effectiveNowMs: Date.parse('2026-03-29T13:00:00.000Z') });
  });

  test('uses immutable observation high-water time so clock rollback cannot reopen allowance', () => {
    const active = {
      period: '2026-03-29@Europe/Dublin',
      timeZone: 'Europe/Dublin',
      resetAt: Date.parse('2026-03-29T23:00:00.000Z'),
      observedAtMs: Date.parse('2026-03-29T18:00:00.000Z'),
    };
    expect(resolveRevenueQuotaDailyWindow({
      nowMs: Date.parse('2026-03-29T09:00:00.000Z'),
      requestedTimeZone: 'America/Los_Angeles',
      observations: [active],
    })).toEqual({ ...active, effectiveNowMs: active.observedAtMs });
  });

  test('applies the current timezone only after the retained boundary', () => {
    const old = {
      period: '2026-03-29@Europe/Dublin',
      timeZone: 'Europe/Dublin',
      resetAt: Date.parse('2026-03-29T23:00:00.000Z'),
      observedAtMs: Date.parse('2026-03-29T18:00:00.000Z'),
    };
    const result = resolveRevenueQuotaDailyWindow({
      nowMs: Date.parse('2026-03-30T01:00:00.000Z'),
      requestedTimeZone: 'Asia/Tokyo',
      observations: [old],
    });
    expect(result.timeZone).toBe('Asia/Tokyo');
    expect(result.period).toBe('2026-03-30@Asia/Tokyo');
    expect(new Date(result.resetAt).toISOString()).toBe('2026-03-30T15:00:00.000Z');
  });
});
