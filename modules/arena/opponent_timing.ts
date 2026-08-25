import {
  ARENA_LOCAL_READING_MS,
  type ArenaLocalMatchState,
  type ArenaOpponentTick,
} from './match_machine';

/**
 * When the player wins the race, keep the rival's later answer perceptible
 * without holding the fixed 1.2 s reveal phase open.
 */
export const ARENA_OPPONENT_POST_ANSWER_MIN_MS = 240;
export const ARENA_OPPONENT_POST_ANSWER_MAX_MS = 650;

function remaining(dueMs: number, nowMs: number): number {
  return Math.max(0, Math.round(dueMs - nowMs));
}

/**
 * Delay until an opponent tick may become visible.
 *
 * Live ticks are already evidence that the rival answered, so they surface
 * immediately. Exact scripted ticks are known early for deterministic star
 * math, but their presentation follows their own race clock.
 */
export function arenaOpponentRevealDelayMs(
  state: ArenaLocalMatchState,
  tick: ArenaOpponentTick,
  monoNowMs: number,
): number | null {
  if (!tick.exact) return 0;
  if (tick.taskIndex < state.taskIndex) return 0;
  if (tick.taskIndex > state.taskIndex) return null;

  const raceElapsedMs = Math.max(0, tick.raceElapsedMs);
  if (state.phase === 'countdown') {
    const answerStartsAt = state.phaseStartedAtMonoMs
      + state.phaseBudgetMs
      + ARENA_LOCAL_READING_MS;
    return remaining(answerStartsAt + raceElapsedMs, monoNowMs);
  }
  if (state.phase === 'reading') {
    const answerStartsAt = state.phaseStartedAtMonoMs + state.phaseBudgetMs;
    return remaining(answerStartsAt + raceElapsedMs, monoNowMs);
  }
  if (state.phase === 'answer') {
    return remaining(state.phaseStartedAtMonoMs + raceElapsedMs, monoNowMs);
  }

  const ownOutcome = [...state.outcomes]
    .reverse()
    .find((outcome) => outcome.taskIndex === tick.taskIndex);
  if (!ownOutcome || raceElapsedMs <= ownOutcome.raceElapsedMs) return 0;

  const postAnswerMs = Math.max(
    ARENA_OPPONENT_POST_ANSWER_MIN_MS,
    Math.min(
      ARENA_OPPONENT_POST_ANSWER_MAX_MS,
      raceElapsedMs - ownOutcome.raceElapsedMs,
    ),
  );
  return remaining(state.phaseStartedAtMonoMs + postAnswerMs, monoNowMs);
}
