export type DialogQuotaObservation = Readonly<{
  remainingQuota: number;
  resetAtMs: number;
  quotaVersion: number;
}>;

const safeNonNegative = (value: unknown): number => (
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0
);

export function nextDialogQuotaConsumption(
  current: Readonly<Record<string, unknown>>,
  nowMs: number,
  dailyCapInput: number,
  nextResetAtMs: (nowMs: number) => number,
): Readonly<{
  exhausted: boolean;
  dailyCount: number;
  extraCapToday: number;
  resetAtMs: number;
  quotaVersion: number;
  observation: DialogQuotaObservation;
}> {
  const priorResetAtMs = safeNonNegative(current.resetAtMs);
  const fresh = nowMs >= priorResetAtMs;
  const dailyCount = fresh ? 0 : safeNonNegative(current.dailyCount);
  const extraCapToday = fresh ? 0 : safeNonNegative(current.extraCapToday);
  const dailyCap = safeNonNegative(dailyCapInput);
  const effectiveCap = dailyCap + extraCapToday;
  const resetAtMs = fresh ? nextResetAtMs(nowMs) : priorResetAtMs;
  const quotaVersion = safeNonNegative(current.quotaVersion) + 1;
  const exhausted = dailyCount >= effectiveCap;
  const nextDailyCount = exhausted ? dailyCount : dailyCount + 1;
  return Object.freeze({
    exhausted,
    dailyCount: nextDailyCount,
    extraCapToday,
    resetAtMs,
    quotaVersion,
    observation: Object.freeze({
      remainingQuota: Math.max(0, effectiveCap - nextDailyCount),
      resetAtMs,
      quotaVersion,
    }),
  });
}

export function nextDialogQuotaRelease(
  current: Readonly<Record<string, unknown>>,
  expectedResetAtMs: number,
): Readonly<{ dailyCount: number; quotaVersion: number }> | null {
  const resetAtMs = safeNonNegative(current.resetAtMs);
  const dailyCount = safeNonNegative(current.dailyCount);
  if (!Number.isSafeInteger(expectedResetAtMs) || expectedResetAtMs <= 0
    || resetAtMs !== expectedResetAtMs || dailyCount <= 0) return null;
  return Object.freeze({
    dailyCount: dailyCount - 1,
    quotaVersion: safeNonNegative(current.quotaVersion) + 1,
  });
}
