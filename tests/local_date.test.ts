import {
  addLocalDays,
  getLocalDayKey,
  getLocalYesterdayKey,
  getUtcDayKey,
  isDayBeforeYesterdayFlexible,
  isSameLocalOrUtcDay,
  isYesterdayFlexible,
  localDayKeyForTimeZone,
} from '../app/local_date';

describe('local_date: getLocalDayKey / getUtcDayKey', () => {
  it('getUtcDayKey always extracts the UTC calendar day regardless of machine TZ', () => {
    // 23:30 UTC on 2026-07-04 — UTC day is still 07-04.
    expect(getUtcDayKey(new Date('2026-07-04T23:30:00.000Z'))).toBe('2026-07-04');
  });

  it('getLocalDayKey extracts the day using the machine wall-clock (getFullYear/getMonth/getDate)', () => {
    // This assertion only pins down the CONTRACT (uses local getters, not UTC getters).
    // We verify by comparing against a manually constructed local Date at local midnight.
    const d = new Date(2026, 6, 4, 10, 0, 0); // 2026-07-04 10:00 local time
    expect(getLocalDayKey(d)).toBe('2026-07-04');
  });

  it('addLocalDays shifts a YYYY-MM-DD key by N calendar days regardless of key origin', () => {
    expect(addLocalDays('2026-07-04', 1)).toBe('2026-07-05');
    expect(addLocalDays('2026-07-04', -1)).toBe('2026-07-03');
    expect(addLocalDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addLocalDays('2026-02-28', 1)).toBe('2026-03-01'); // 2026 is not a leap year
  });

  it('getLocalYesterdayKey is local-today minus one calendar day', () => {
    const d = new Date(2026, 6, 4, 23, 59, 0); // 2026-07-04 23:59 local
    expect(getLocalYesterdayKey(d)).toBe('2026-07-03');
  });
});

describe('local_date: localDayKeyForTimeZone (deterministic per-zone simulation for tests)', () => {
  it('resolves the same UTC instant into different calendar days depending on the zone', () => {
    // 2026-07-04T23:00:00Z: already 2026-07-05 morning in UTC+10 (Sydney-ish), still
    // 2026-07-04 evening in UTC-8 (Los Angeles-ish, no DST edge here).
    const instant = new Date('2026-07-04T23:00:00.000Z');
    expect(localDayKeyForTimeZone(instant, 'Pacific/Auckland')).toBe('2026-07-05'); // UTC+12 (NZ, winter no DST in Jul)
    expect(localDayKeyForTimeZone(instant, 'America/Los_Angeles')).toBe('2026-07-04');
    expect(localDayKeyForTimeZone(instant, 'UTC')).toBe('2026-07-04');
  });

  it('an evening UTC+10 user is already "tomorrow" while UTC is still "today"', () => {
    // 14:00 UTC = 00:00 next day at UTC+10 (evening practice session at local midnight boundary)
    const instant = new Date('2026-07-04T14:00:00.000Z');
    expect(localDayKeyForTimeZone(instant, 'Australia/Brisbane')).toBe('2026-07-05'); // UTC+10, no DST
    expect(getUtcDayKey(instant)).toBe('2026-07-04');
  });

  it('a morning UTC-8 user is still "yesterday" while UTC has already rolled over', () => {
    // 02:00 UTC = 18:00 previous day at UTC-8
    const instant = new Date('2026-07-05T02:00:00.000Z');
    expect(localDayKeyForTimeZone(instant, 'America/Los_Angeles')).toBe('2026-07-04');
    expect(getUtcDayKey(instant)).toBe('2026-07-05');
  });
});

describe('local_date: transition comparators (accept both UTC and local "yesterday"/"today")', () => {
  // Reference "now": 2026-07-05T02:00:00Z. At this instant:
  //  - UTC day is 2026-07-05.
  //  - A UTC-8 device's LOCAL day is still 2026-07-04 (evening before midnight there).
  const REF = new Date('2026-07-05T02:00:00.000Z');

  it('isSameLocalOrUtcDay accepts both the UTC-today key and the local-today key', () => {
    expect(isSameLocalOrUtcDay('2026-07-05', REF)).toBe(true); // UTC day
    // We can't force getLocalDayKey(REF) to be a specific zone in this test process,
    // but we CAN assert the UTC branch works, which is the machine-independent part.
    expect(isSameLocalOrUtcDay('2020-01-01', REF)).toBe(false);
    expect(isSameLocalOrUtcDay(null, REF)).toBe(false);
  });

  it('isYesterdayFlexible accepts the UTC-yesterday key', () => {
    expect(isYesterdayFlexible('2026-07-04', REF)).toBe(true); // UTC yesterday
    expect(isYesterdayFlexible('2026-07-03', REF)).toBe(false);
    expect(isYesterdayFlexible(null, REF)).toBe(false);
  });

  it('isDayBeforeYesterdayFlexible accepts the UTC-day-before-yesterday key', () => {
    expect(isDayBeforeYesterdayFlexible('2026-07-03', REF)).toBe(true); // UTC day-before-yesterday
    expect(isDayBeforeYesterdayFlexible('2026-07-04', REF)).toBe(false); // that's "yesterday", not "day before"
    expect(isDayBeforeYesterdayFlexible('2026-07-05', REF)).toBe(false); // that's "today"
    expect(isDayBeforeYesterdayFlexible(null, REF)).toBe(false);
  });
});
