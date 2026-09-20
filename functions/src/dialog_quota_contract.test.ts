import {
  nextDialogQuotaConsumption,
  nextDialogQuotaRelease,
} from './dialog_quota_contract';

test('exhaustion advances and returns a versioned state that the server can persist', () => {
  const resetAtMs = Date.UTC(2026, 8, 21);
  expect(nextDialogQuotaConsumption({
    dailyCount: 10,
    extraCapToday: 0,
    resetAtMs,
    quotaVersion: 7,
  }, resetAtMs - 1, 10, () => 0)).toEqual({
    exhausted: true,
    dailyCount: 10,
    extraCapToday: 0,
    resetAtMs,
    quotaVersion: 8,
    observation: { remainingQuota: 0, resetAtMs, quotaVersion: 8 },
  });
});

test('fresh UTC day clears old usage before consuming one reply', () => {
  const nowMs = Date.UTC(2026, 8, 21, 1);
  const nextResetAtMs = Date.UTC(2026, 8, 22);
  expect(nextDialogQuotaConsumption({
    dailyCount: 10,
    extraCapToday: 20,
    resetAtMs: nowMs - 1,
    quotaVersion: 7,
  }, nowMs, 10, () => nextResetAtMs)).toEqual({
    exhausted: false,
    dailyCount: 1,
    extraCapToday: 0,
    resetAtMs: nextResetAtMs,
    quotaVersion: 8,
    observation: { remainingQuota: 9, resetAtMs: nextResetAtMs, quotaVersion: 8 },
  });
});

test('rollback never decrements a newer reset period', () => {
  const oldResetAtMs = Date.UTC(2026, 8, 21);
  const currentResetAtMs = Date.UTC(2026, 8, 22);
  const current = { dailyCount: 1, resetAtMs: currentResetAtMs, quotaVersion: 8 };
  expect(nextDialogQuotaRelease(current, oldResetAtMs)).toBeNull();
  expect(nextDialogQuotaRelease(current, currentResetAtMs)).toEqual({
    dailyCount: 0,
    quotaVersion: 9,
  });
});
