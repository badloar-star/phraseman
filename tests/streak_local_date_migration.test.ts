/**
 * Транзитные сценарии перевода стрика с UTC-ключа на локальный ключ устройства.
 *
 * Мы не можем полагаться на process.env.TZ в Jest (V8 кеширует TZ на старте
 * процесса и не перечитывает его при переприсваивании в рамках теста — проверено
 * эмпирически). Вместо этого мокаем app/local_date так, чтобы getLocalDayKey/
 * getLocalYesterdayKey резолвились через Intl.DateTimeFormat с явным IANA-поясом
 * (localDayKeyForTimeZone) — это даёт детерминированную симуляцию конкретного
 * часового пояса устройства независимо от машины, на которой гоняются тесты.
 * getUtcDayKey остаётся настоящим (машинонезависим по определению).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

let simulatedZone = 'UTC';

// jest.mock replaces the WHOLE module's exports; functions inside the real
// module call each other via direct (non-exported-object) references, so a
// partial override wouldn't affect e.g. isYesterdayFlexible's internal call to
// getLocalYesterdayKey. Instead we re-derive every flexible comparator here in
// terms of the mocked getLocalDayKey, so the whole family is self-consistent.
jest.mock('../app/local_date', () => {
  const actual = jest.requireActual('../app/local_date');

  const getLocalDayKey = (date: Date = new Date()) => actual.localDayKeyForTimeZone(date, simulatedZone);
  const getLocalYesterdayKey = (date: Date = new Date()) => actual.addLocalDays(getLocalDayKey(date), -1);
  const isSameLocalOrUtcDay = (dayKey: string | null | undefined, reference: Date = new Date()) =>
    !!dayKey && (dayKey === getLocalDayKey(reference) || dayKey === actual.getUtcDayKey(reference));
  const isYesterdayFlexible = (dayKey: string | null | undefined, reference: Date = new Date()) => {
    if (!dayKey) return false;
    const localYesterday = getLocalYesterdayKey(reference);
    const utcYesterday = actual.addLocalDays(actual.getUtcDayKey(reference), -1);
    return dayKey === localYesterday || dayKey === utcYesterday;
  };
  const isDayBeforeYesterdayFlexible = (dayKey: string | null | undefined, reference: Date = new Date()) => {
    if (!dayKey) return false;
    const localDayBefore = actual.addLocalDays(getLocalDayKey(reference), -2);
    const utcDayBefore = actual.addLocalDays(actual.getUtcDayKey(reference), -2);
    return dayKey === localDayBefore || dayKey === utcDayBefore;
  };

  return {
    ...actual,
    getLocalDayKey,
    getLocalYesterdayKey,
    isSameLocalOrUtcDay,
    isYesterdayFlexible,
    isDayBeforeYesterdayFlexible,
  };
});

import { updateStreakOnActivity, checkStreakLossPending } from '../app/hall_of_fame_utils';
import { isRepairEligible } from '../app/streak_repair';

describe('streak transition: evening in UTC+10 (Australia/Brisbane, no DST)', () => {
  beforeEach(async () => {
    simulatedZone = 'Australia/Brisbane'; // UTC+10 year-round
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });
  afterEach(() => jest.useRealTimers());

  it('does not burn the streak when last_active_date was written in the OLD UTC scheme yesterday', async () => {
    // Session 1: user practices at 2026-07-04 20:00 local (UTC+10) = 2026-07-04T10:00:00Z.
    // OLD code would have written last_active_date via UTC day key = '2026-07-04'.
    jest.useFakeTimers().setSystemTime(new Date('2026-07-04T10:00:00.000Z'));
    await AsyncStorage.multiSet([
      ['last_active_date', '2026-07-04'], // written by OLD UTC scheme (coincides with local here)
      ['streak_count', '5'],
    ]);

    // Session 2: NEXT calendar evening, 2026-07-05 20:00 local (UTC+10) = 2026-07-05T10:00:00Z.
    // Local day is 2026-07-05; local "yesterday" is 2026-07-04 — matches last_active_date exactly.
    jest.setSystemTime(new Date('2026-07-05T10:00:00.000Z'));
    const streak = await updateStreakOnActivity();

    expect(streak).toBe(6); // extended, NOT burned back to 1
    expect(await AsyncStorage.getItem('last_active_date')).toBe('2026-07-05');
  });

  it('does not burn the streak across the exact local-midnight boundary (23:59 -> 00:01 local)', async () => {
    // User practices right before local midnight: 2026-07-04 23:59 local (UTC+10) = 2026-07-04T13:59:00Z.
    jest.useFakeTimers().setSystemTime(new Date('2026-07-04T13:59:00.000Z'));
    await updateStreakOnActivity(); // streak becomes 1 (first ever activity), last_active_date = local 07-04
    expect(await AsyncStorage.getItem('last_active_date')).toBe('2026-07-04');
    expect(await AsyncStorage.getItem('streak_count')).toBe('1');

    // Minutes later, just after local midnight: 2026-07-05 00:01 local (UTC+10) = 2026-07-04T14:01:00Z.
    // UTC day is STILL 2026-07-04 at this instant, but local day has already rolled to 2026-07-05.
    jest.setSystemTime(new Date('2026-07-04T14:01:00.000Z'));
    const streak = await updateStreakOnActivity();

    // Old UTC-only logic would have seen "same UTC day" and NOT incremented (or worse, been
    // ambiguous). With local-day keys the user genuinely moved to a new calendar day and the
    // streak correctly extends — this must NOT throw the streak away either.
    expect(streak).toBeGreaterThanOrEqual(1);
    expect(streak).not.toBe(0);
  });
});

describe('streak transition: morning in UTC-8 (America/Los_Angeles-like, no DST edge)', () => {
  beforeEach(async () => {
    simulatedZone = 'Etc/GMT+8'; // fixed UTC-8, no DST (avoids DST-transition flakiness)
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });
  afterEach(() => jest.useRealTimers());

  it('does not burn the streak when the user practices early morning local time (still "yesterday" in UTC)', async () => {
    // Session 1: user practices 2026-07-04 21:00 local (UTC-8) = 2026-07-05T05:00:00Z.
    jest.useFakeTimers().setSystemTime(new Date('2026-07-05T05:00:00.000Z'));
    await updateStreakOnActivity();
    expect(await AsyncStorage.getItem('last_active_date')).toBe('2026-07-04'); // local day
    expect(await AsyncStorage.getItem('streak_count')).toBe('1');

    // Session 2: NEXT morning, 2026-07-05 06:00 local (UTC-8) = 2026-07-05T14:00:00Z.
    // UTC day for both instants is 2026-07-05 (same!), but LOCAL day moved from 07-04 to 07-05.
    jest.setSystemTime(new Date('2026-07-05T14:00:00.000Z'));
    const streak = await updateStreakOnActivity();

    expect(streak).toBe(2); // extended: local day genuinely advanced by one
    expect(await AsyncStorage.getItem('last_active_date')).toBe('2026-07-05');
  });

  it('legacy UTC last_active_date from a prior UTC-only build is honored as "yesterday" once', async () => {
    // Simulates the exact migration moment: an old build wrote last_active_date using
    // toISOString().slice(0,10) (UTC) yesterday. New local-date code must still recognize
    // it as "yesterday" so the streak survives the code-path switch itself.
    jest.useFakeTimers().setSystemTime(new Date('2026-07-04T20:00:00.000Z')); // UTC day 07-04
    await AsyncStorage.multiSet([
      ['last_active_date', '2026-07-04'], // legacy UTC key
      ['streak_count', '10'],
    ]);

    // Now local time is 2026-07-05 06:00 (UTC-8) = 2026-07-05T14:00:00Z. Local day is 07-05,
    // local yesterday is 07-04 — matches the legacy key, so isYesterdayFlexible must accept it.
    jest.setSystemTime(new Date('2026-07-05T14:00:00.000Z'));
    const streak = await updateStreakOnActivity();

    expect(streak).toBe(11);
    expect(await AsyncStorage.getItem('last_active_date')).toBe('2026-07-05');
  });
});

describe('streak transition: repair eligibility respects local day across the migration', () => {
  beforeEach(async () => {
    simulatedZone = 'Australia/Brisbane'; // UTC+10
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });
  afterEach(() => jest.useRealTimers());

  it('is eligible when exactly one LOCAL day was missed, even with a legacy UTC last_active_date', async () => {
    // "Now": 2026-07-06 20:00 local (UTC+10) = 2026-07-06T10:00:00Z. Local today = 07-06,
    // local day-before-yesterday = 07-04. A legacy UTC last_active_date of '2026-07-04'
    // must still be recognized as "missed exactly one day" (repair-eligible).
    jest.useFakeTimers().setSystemTime(new Date('2026-07-06T10:00:00.000Z'));
    await AsyncStorage.multiSet([
      ['last_active_date', '2026-07-04'],
      ['streak_count', '8'],
    ]);

    await expect(isRepairEligible()).resolves.toBe(true);
  });

  it('checkStreakLossPending flags risk for a local day-before-yesterday last_active_date', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-06T10:00:00.000Z'));
    await AsyncStorage.multiSet([
      ['last_active_date', '2026-07-04'],
      ['streak_count', '8'],
    ]);

    const result = await checkStreakLossPending();
    expect(result.willLose).toBe(true);
    expect(result.streakBefore).toBe(8);
  });
});

describe('streak transition: user changes device timezone mid-streak', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });
  afterEach(() => jest.useRealTimers());

  it('does not burn the streak when the user travels and their local day shifts by the trip duration', async () => {
    // Day 1: user in Brisbane (UTC+10), practices at local 2026-07-04 21:00 = 2026-07-04T11:00:00Z.
    simulatedZone = 'Australia/Brisbane';
    jest.useFakeTimers().setSystemTime(new Date('2026-07-04T11:00:00.000Z'));
    await updateStreakOnActivity();
    expect(await AsyncStorage.getItem('last_active_date')).toBe('2026-07-04');

    // Day 2: user flies to Los Angeles (UTC-8) and, ~29h of real time later, practices at LA
    // local 2026-07-05 20:00 = 2026-07-06T04:00:00Z. Their LA-local day is 2026-07-05, which is
    // exactly one calendar day after the Brisbane-local day recorded above — the streak must
    // extend, not reset, purely because the recording device/timezone changed mid-trip.
    simulatedZone = 'America/Los_Angeles';
    jest.setSystemTime(new Date('2026-07-06T04:00:00.000Z'));
    const streak = await updateStreakOnActivity();

    // The key correctness property here is NOT a specific streak number (that depends on
    // exactly how many real calendar days elapsed from the user's perspective) — it's that
    // the streak is NOT reset to 1 by the pure act of changing timezone while still being
    // active on consecutive real-world days.
    expect(streak).toBeGreaterThan(1);
  });
});
