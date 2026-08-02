import {
  bucketRawEventsByDay,
  classifyRevenueEvent,
  dayKeyFromMs,
  dayKeyToStartMs,
  enumerateDayKeys,
  nextDayKey,
  parseMixedTimestampMs,
  revenueProxyOf,
} from './business_tier_history';

describe('parseMixedTimestampMs — users.created_at / revenuecat createdAt are stored as mixed types', () => {
  test('accepts a finite number as milliseconds', () => {
    expect(parseMixedTimestampMs(1_722_000_000_000)).toBe(1_722_000_000_000);
  });

  test('parses an ISO date string', () => {
    expect(parseMixedTimestampMs('2026-07-01T00:00:00.000Z')).toBe(Date.parse('2026-07-01T00:00:00.000Z'));
  });

  test('accepts a Firestore Timestamp-like object with toMillis()', () => {
    const fakeTimestamp = { toMillis: () => 1_700_000_000_000 };
    expect(parseMixedTimestampMs(fakeTimestamp)).toBe(1_700_000_000_000);
  });

  test('rejects null/undefined/garbage — fails closed to null, never a fabricated zero', () => {
    expect(parseMixedTimestampMs(null)).toBeNull();
    expect(parseMixedTimestampMs(undefined)).toBeNull();
    expect(parseMixedTimestampMs('not a date')).toBeNull();
    expect(parseMixedTimestampMs({})).toBeNull();
    expect(parseMixedTimestampMs(NaN)).toBeNull();
  });
});

describe('day key helpers — UTC day bucketing for business_tier_history/{day} documents', () => {
  test('dayKeyFromMs produces a stable UTC YYYY-MM-DD key', () => {
    expect(dayKeyFromMs(Date.parse('2026-08-02T23:59:59.000Z'))).toBe('2026-08-02');
    expect(dayKeyFromMs(Date.parse('2026-08-03T00:00:00.000Z'))).toBe('2026-08-03');
  });

  test('dayKeyToStartMs and nextDayKey round-trip correctly', () => {
    const start = dayKeyToStartMs('2026-08-02');
    expect(dayKeyFromMs(start)).toBe('2026-08-02');
    expect(nextDayKey('2026-08-02')).toBe('2026-08-03');
  });

  test('enumerateDayKeys lists the half-open range [from, toExclusive)', () => {
    expect(enumerateDayKeys('2026-08-01', '2026-08-04')).toEqual(['2026-08-01', '2026-08-02', '2026-08-03']);
  });

  test('enumerateDayKeys returns empty for an empty or inverted range', () => {
    expect(enumerateDayKeys('2026-08-04', '2026-08-01')).toEqual([]);
    expect(enumerateDayKeys('2026-08-01', '2026-08-01')).toEqual([]);
  });
});

describe('classifyRevenueEvent — copy of admin_daily_digest.ts:406-414 / money_source_reader.ts classification', () => {
  test.each([
    ['NON_RENEWING_PURCHASE', null, 'new_paying'],
    ['INITIAL_PURCHASE', 'NORMAL', 'new_paying'],
    ['INITIAL_PURCHASE', 'TRIAL', 'trial'],
    ['RENEWAL', null, 'renewal'],
    ['REFUND', null, 'refund'],
    ['CANCELLATION', null, 'other'],
    ['EXPIRATION', null, 'other'],
    [null, null, 'other'],
  ])('eventType=%s periodType=%s -> %s', (eventType, periodType, expected) => {
    expect(classifyRevenueEvent(eventType, periodType)).toBe(expected);
  });

  test('is case-insensitive on both fields', () => {
    expect(classifyRevenueEvent('renewal', 'normal')).toBe('renewal');
    expect(classifyRevenueEvent('initial_purchase', 'trial')).toBe('trial');
  });
});

describe('revenueProxyOf — honest proxy, not a fabricated MRR', () => {
  test('adds new paying and renewals, subtracts refunds', () => {
    expect(revenueProxyOf(10, 5, 2)).toBe(13);
  });

  test('can go negative on a bad refund day — never clamped, that would hide a real signal', () => {
    expect(revenueProxyOf(0, 0, 4)).toBe(-4);
  });
});

describe('bucketRawEventsByDay — builds per-day counts from raw timestamps', () => {
  test('buckets new users by their created_at day', () => {
    const day1 = Date.parse('2026-08-01T10:00:00.000Z');
    const day2 = Date.parse('2026-08-02T05:00:00.000Z');
    const result = bucketRawEventsByDay([day1, day1, day2], []);
    expect(result.get('2026-08-01')?.newUsers).toBe(2);
    expect(result.get('2026-08-02')?.newUsers).toBe(1);
  });

  test('buckets revenue events by day and classification, ignoring trials and unknown events', () => {
    const day1 = Date.parse('2026-08-01T10:00:00.000Z');
    const result = bucketRawEventsByDay([], [
      { atMs: day1, eventType: 'NON_RENEWING_PURCHASE', periodType: null },
      { atMs: day1, eventType: 'RENEWAL', periodType: null },
      { atMs: day1, eventType: 'REFUND', periodType: null },
      { atMs: day1, eventType: 'INITIAL_PURCHASE', periodType: 'TRIAL' },
      { atMs: day1, eventType: 'CANCELLATION', periodType: null },
    ]);
    const row = result.get('2026-08-01');
    expect(row?.newPaying).toBe(1);
    expect(row?.renewals).toBe(1);
    expect(row?.refunds).toBe(1);
  });

  test('rows with a null timestamp are skipped entirely, not bucketed under a fake day', () => {
    const result = bucketRawEventsByDay([null], [{ atMs: null, eventType: 'RENEWAL', periodType: null }]);
    expect(result.size).toBe(0);
  });

  test('days with zero of a metric are still real entries once touched by another metric', () => {
    const day1 = Date.parse('2026-08-01T10:00:00.000Z');
    const result = bucketRawEventsByDay([day1], []);
    const row = result.get('2026-08-01');
    // зачем 'unavailable' на дне без денежных событий: это НЕ «ноль дохода»,
    // а «денег в этот день не наблюдалось вовсе» — UI обязан различать.
    expect(row).toEqual({
      newUsers: 1, newPaying: 0, renewals: 0, refunds: 0,
      grossUsdMicros: 0, mrrEquivalentProceedsUsdMicros: 0, dayMoneyCoverage: 'unavailable',
    });
  });
});

describe('bucketRawEventsByDay — honest money from pre-normalized RevenueCat fields', () => {
  const day1 = Date.parse('2026-08-01T10:00:00.000Z');

  test('sums gross only from events that actually carry an amount', () => {
    const result = bucketRawEventsByDay([], [
      { atMs: day1, eventType: 'RENEWAL', periodType: null, grossUsdMicros: 4_990_000, estimatedProceedsUsdMicros: 3_493_000, financialCoverage: 'complete', billingCadence: 'monthly' },
      { atMs: day1, eventType: 'RENEWAL', periodType: null, grossUsdMicros: null, estimatedProceedsUsdMicros: null, financialCoverage: 'unavailable', billingCadence: 'unknown' },
    ]);
    const row = result.get('2026-08-01');
    expect(row?.renewals).toBe(2);
    expect(row?.grossUsdMicros).toBe(4_990_000);
  });

  test('a yearly subscription contributes one twelfth to the MRR equivalent', () => {
    const result = bucketRawEventsByDay([], [
      { atMs: day1, eventType: 'INITIAL_PURCHASE', periodType: 'NORMAL', grossUsdMicros: 47_990_000, estimatedProceedsUsdMicros: 12_000_000, financialCoverage: 'complete', billingCadence: 'yearly' },
    ]);
    expect(result.get('2026-08-01')?.mrrEquivalentProceedsUsdMicros).toBe(1_000_000);
  });

  test('lifetime purchases are excluded from MRR — one-off revenue is not a subscription stream', () => {
    const result = bucketRawEventsByDay([], [
      { atMs: day1, eventType: 'NON_RENEWING_PURCHASE', periodType: null, grossUsdMicros: 99_000_000, estimatedProceedsUsdMicros: 69_000_000, financialCoverage: 'complete', billingCadence: 'lifetime' },
    ]);
    const row = result.get('2026-08-01');
    expect(row?.grossUsdMicros).toBe(99_000_000);
    expect(row?.mrrEquivalentProceedsUsdMicros).toBe(0);
  });

  test.each([
    ['complete', 'complete'],
    ['partial', 'partial'],
    ['unavailable', 'unavailable'],
  ])('a single %s event yields day coverage %s', (eventCoverage, expected) => {
    const result = bucketRawEventsByDay([], [
      { atMs: day1, eventType: 'RENEWAL', periodType: null, grossUsdMicros: 1, estimatedProceedsUsdMicros: 1, financialCoverage: eventCoverage as 'complete' | 'partial' | 'unavailable', billingCadence: 'monthly' },
    ]);
    expect(result.get('2026-08-01')?.dayMoneyCoverage).toBe(expected);
  });

  test('one incomplete event downgrades the whole day to partial — never silently report complete', () => {
    const result = bucketRawEventsByDay([], [
      { atMs: day1, eventType: 'RENEWAL', periodType: null, grossUsdMicros: 4_990_000, estimatedProceedsUsdMicros: 3_493_000, financialCoverage: 'complete', billingCadence: 'monthly' },
      { atMs: day1, eventType: 'RENEWAL', periodType: null, grossUsdMicros: null, estimatedProceedsUsdMicros: null, financialCoverage: 'unavailable', billingCadence: 'unknown' },
    ]);
    expect(result.get('2026-08-01')?.dayMoneyCoverage).toBe('partial');
  });

  test('missing money fields entirely (legacy events) do not crash and count as unavailable', () => {
    const result = bucketRawEventsByDay([], [
      { atMs: day1, eventType: 'RENEWAL', periodType: null },
    ]);
    const row = result.get('2026-08-01');
    expect(row?.renewals).toBe(1);
    expect(row?.grossUsdMicros).toBe(0);
    expect(row?.dayMoneyCoverage).toBe('unavailable');
  });
});
