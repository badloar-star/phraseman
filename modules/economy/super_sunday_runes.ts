export const SUPER_SUNDAY_MULTIPLIER = 2;

export function isSuperSundayUtc(earnedAtMs: number): boolean {
  return Number.isFinite(earnedAtMs) && new Date(earnedAtMs).getUTCDay() === 0;
}

export function applySuperSundayRuneMultiplier(baseAmount: number, earnedAtMs: number): number {
  if (!Number.isSafeInteger(baseAmount) || baseAmount < 0) {
    throw new Error('invalid rune amount');
  }

  const multiplier = isSuperSundayUtc(earnedAtMs) ? SUPER_SUNDAY_MULTIPLIER : 1;
  if (baseAmount > Number.MAX_SAFE_INTEGER / multiplier) {
    throw new Error('rune amount overflow');
  }

  return baseAmount * multiplier;
}

export function superSundayEndsAtUtcMs(nowMs: number): number {
  if (!isSuperSundayUtc(nowMs)) {
    throw new Error('Super Sunday is not active');
  }

  const end = new Date(nowMs);
  end.setUTCHours(24, 0, 0, 0);
  return end.getTime();
}
