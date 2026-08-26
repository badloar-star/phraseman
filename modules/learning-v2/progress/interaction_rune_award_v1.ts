/**
 * Canonical Learning V2 base-rune ladder. Session quality stars are separate.
 */
export function projectLearningV2InteractionRuneAwardV1(input: Readonly<{
  learnerAttempts: number;
  hintUsed: boolean;
  skipped?: boolean;
}>): 0 | 1 | 2 | 3 {
  if (input.skipped) return 0;
  if (input.hintUsed) return 1;
  if (input.learnerAttempts <= 1) return 3;
  if (input.learnerAttempts === 2) return 2;
  return 1;
}
