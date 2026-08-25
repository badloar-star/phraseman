/** The existing shared count-up finishes in 620 ms; reserve one readable beat. */
export const ARENA_FINAL_SCORE_COUNT_MS = 680;
export const ARENA_FINAL_SCORE_MAX_BEATS = 6;

export function arenaFinalScore(score: number): number {
  return Number.isFinite(score) ? Math.max(0, Math.trunc(score)) : 0;
}

/** Same ease-out curve used by the shared visual counter, exposed for tests. */
export function arenaFinalScoreValue(score: number, progress: number): number {
  const target = arenaFinalScore(score);
  const normalizedProgress = Number.isFinite(progress)
    ? Math.max(0, Math.min(1, progress))
    : 0;
  const eased = 1 - Math.pow(1 - normalizedProgress, 3);
  return Math.round(target * eased);
}

/**
 * At most six audible landings. The number itself may cross more integers,
 * but requesting a sound for all of them would turn the count into a rattle.
 */
export function arenaFinalScoreBeatValues(score: number): readonly number[] {
  const target = arenaFinalScore(score);
  if (target === 0) return [];
  const count = Math.min(target, ARENA_FINAL_SCORE_MAX_BEATS);
  return [...new Set(Array.from(
    { length: count },
    (_, index) => Math.max(1, Math.round(((index + 1) * target) / count)),
  ))];
}
