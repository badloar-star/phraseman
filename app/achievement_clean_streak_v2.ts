export type CleanStreakResolution = Readonly<{
  cleanStreakDays: number;
  resetDetected: boolean;
}>;

const safeDays = (value: unknown): number =>
  Math.max(0, Math.floor(Number(value) || 0));

/**
 * Resolves the current safety-free streak segment.
 * A smaller current streak proves that the streak counted at the last safety use
 * has ended, so that old marker must not penalize the new streak generation.
 */
export function resolveCleanStreakDays(
  currentStreakDays: unknown,
  lastSafetyStreakDays: unknown,
): CleanStreakResolution {
  const current = safeDays(currentStreakDays);
  const lastSafety = safeDays(lastSafetyStreakDays);
  if (lastSafety === 0) return { cleanStreakDays: current, resetDetected: false };
  if (current < lastSafety) return { cleanStreakDays: current, resetDetected: true };
  return { cleanStreakDays: current - lastSafety, resetDetected: false };
}
