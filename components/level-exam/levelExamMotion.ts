export const COUNTDOWN_STEP_MS = 600;
export const COUNTDOWN_TOTAL_MS = COUNTDOWN_STEP_MS * 3;

export function getCountdownStep(elapsedMs: number): 3 | 2 | 1 | null {
  if (elapsedMs < 0) return 3;
  if (elapsedMs < COUNTDOWN_STEP_MS) return 3;
  if (elapsedMs < COUNTDOWN_STEP_MS * 2) return 2;
  if (elapsedMs < COUNTDOWN_TOTAL_MS) return 1;
  return null;
}
