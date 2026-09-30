import {
  nextDialogueV2TurnQuotaRelease,
  nextDialogueV2TurnQuotaReservation,
  nextDialogQuotaConsumption,
  nextDialogQuotaRelease,
} from './dialog_quota_contract';

const SEPTEMBER_RESET = Date.UTC(2026, 9, 1);
const OCTOBER_RESET = Date.UTC(2026, 10, 1);
const V2_TURN_KEY = 'a'.repeat(64);

function nextMonth(nowMs: number): number {
  const now = new Date(nowMs);
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
}

test('same V2 session/turn quota reservation replays without incrementing twice', () => {
  const nowMs = Date.UTC(2026, 8, 27, 12);
  const first = nextDialogueV2TurnQuotaReservation(
    {}, nowMs, 30, false, V2_TURN_KEY, nextMonth,
  );
  const replay = nextDialogueV2TurnQuotaReservation(
    first.document, nowMs + 1_000, 30, false, V2_TURN_KEY, nextMonth,
  );

  expect(first).toMatchObject({
    replayed: false,
    exhausted: false,
    reservation: { consumed: true, remainingQuota: 29 },
    document: { monthlyCount: 1, dailyCount: 1 },
  });
  expect(replay).toMatchObject({
    replayed: true,
    exhausted: false,
    reservation: first.reservation,
    document: { monthlyCount: 1, dailyCount: 1 },
  });
});

test('V2 rollback releases only the exact reservation once and permits a proven-absent retry', () => {
  const nowMs = Date.UTC(2026, 8, 27, 12);
  const reserved = nextDialogueV2TurnQuotaReservation(
    {}, nowMs, 30, false, V2_TURN_KEY, nextMonth,
  );
  const wrongKey = nextDialogueV2TurnQuotaRelease(
    reserved.document, 'b'.repeat(64), reserved.reservation.resetAtMs,
  );
  const released = nextDialogueV2TurnQuotaRelease(
    reserved.document, V2_TURN_KEY, reserved.reservation.resetAtMs,
  );
  if (!released) throw new Error('expected exact release');
  const duplicateRelease = nextDialogueV2TurnQuotaRelease(
    released.document, V2_TURN_KEY, reserved.reservation.resetAtMs,
  );
  const retry = nextDialogueV2TurnQuotaReservation(
    released.document, nowMs + 2_000, 30, false, V2_TURN_KEY, nextMonth,
  );

  expect(wrongKey).toBeNull();
  expect(released.document).toMatchObject({ monthlyCount: 0, dailyCount: 0 });
  expect(duplicateRelease).toBeNull();
  expect(retry).toMatchObject({
    replayed: false,
    reservation: { consumed: true, remainingQuota: 29 },
    document: { monthlyCount: 1, dailyCount: 1 },
  });
});

test('V2 Plus reservation is idempotent without consuming the monthly counter', () => {
  const nowMs = Date.UTC(2026, 8, 27, 12);
  const first = nextDialogueV2TurnQuotaReservation(
    { monthlyCount: 7, dailyCount: 7 }, nowMs, 30, true, V2_TURN_KEY, nextMonth,
  );
  const replay = nextDialogueV2TurnQuotaReservation(
    first.document, nowMs + 1, 30, true, V2_TURN_KEY, nextMonth,
  );

  expect(first.reservation.consumed).toBe(false);
  expect(first.document.monthlyCount).toBe(7);
  expect(replay.replayed).toBe(true);
  expect(replay.document.monthlyCount).toBe(7);
});

test('calendar-month exhaustion returns versioned state plus rollback-compatible aliases', () => {
  expect(nextDialogQuotaConsumption({
    quotaPeriod: 'calendar_month',
    periodKey: '2026-09',
    monthlyCount: 30,
    extraCapThisMonth: 0,
    dailyCount: 30,
    extraCapToday: 0,
    resetAtMs: SEPTEMBER_RESET,
    quotaVersion: 7,
  }, SEPTEMBER_RESET - 1, 30, () => OCTOBER_RESET)).toEqual({
    exhausted: true,
    quotaPeriod: 'calendar_month',
    periodKey: '2026-09',
    monthlyCap: 30,
    monthlyCount: 30,
    extraCapThisMonth: 0,
    dailyCount: 30,
    extraCapToday: 0,
    resetAtMs: SEPTEMBER_RESET,
    quotaVersion: 8,
    observation: { remainingQuota: 0, resetAtMs: SEPTEMBER_RESET, quotaVersion: 8 },
  });
});

test('a new UTC calendar month clears usage and consumes the first of 30 replies', () => {
  const nowMs = Date.UTC(2026, 9, 1, 1);
  expect(nextDialogQuotaConsumption({
    quotaPeriod: 'calendar_month',
    periodKey: '2026-09',
    monthlyCount: 30,
    extraCapThisMonth: 20,
    dailyCount: 30,
    extraCapToday: 20,
    resetAtMs: SEPTEMBER_RESET,
    quotaVersion: 7,
  }, nowMs, 30, () => OCTOBER_RESET)).toEqual({
    exhausted: false,
    quotaPeriod: 'calendar_month',
    periodKey: '2026-10',
    monthlyCap: 30,
    monthlyCount: 1,
    extraCapThisMonth: 0,
    dailyCount: 1,
    extraCapToday: 0,
    resetAtMs: OCTOBER_RESET,
    quotaVersion: 8,
    observation: { remainingQuota: 29, resetAtMs: OCTOBER_RESET, quotaVersion: 8 },
  });
});

test('legacy active-day quota preserves unused paid replies as a current-month grant', () => {
  const nowMs = Date.UTC(2026, 8, 20, 12);
  expect(nextDialogQuotaConsumption({
    dailyCap: 10,
    dailyCount: 12,
    extraCapToday: 10,
    resetAtMs: Date.UTC(2026, 8, 21),
    quotaVersion: 4,
  }, nowMs, 30, () => SEPTEMBER_RESET)).toEqual({
    exhausted: false,
    quotaPeriod: 'calendar_month',
    periodKey: '2026-09',
    monthlyCap: 30,
    monthlyCount: 11,
    extraCapThisMonth: 8,
    dailyCount: 11,
    extraCapToday: 8,
    resetAtMs: SEPTEMBER_RESET,
    quotaVersion: 5,
    observation: { remainingQuota: 27, resetAtMs: SEPTEMBER_RESET, quotaVersion: 5 },
  });
});

test('expired legacy daily extras do not resurrect in a later period', () => {
  const nowMs = Date.UTC(2026, 8, 20, 12);
  expect(nextDialogQuotaConsumption({
    dailyCap: 10,
    dailyCount: 4,
    extraCapToday: 10,
    resetAtMs: nowMs - 1,
    quotaVersion: 4,
  }, nowMs, 30, () => SEPTEMBER_RESET)).toMatchObject({
    monthlyCount: 1,
    extraCapThisMonth: 0,
    observation: { remainingQuota: 29 },
  });
});

test('rollback decrements the current month and both schema aliases', () => {
  const current = {
    quotaPeriod: 'calendar_month',
    periodKey: '2026-09',
    monthlyCount: 1,
    dailyCount: 1,
    resetAtMs: SEPTEMBER_RESET,
    quotaVersion: 8,
  };
  expect(nextDialogQuotaRelease(current, OCTOBER_RESET)).toBeNull();
  expect(nextDialogQuotaRelease(current, SEPTEMBER_RESET)).toEqual({
    monthlyCount: 0,
    dailyCount: 0,
    quotaVersion: 9,
  });
});
