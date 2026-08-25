import {
  ARENA_OPPONENT_POST_ANSWER_MAX_MS,
  ARENA_OPPONENT_POST_ANSWER_MIN_MS,
  arenaOpponentRevealDelayMs,
} from '../modules/arena/opponent_timing';
import {
  arenaLocalMatchInit,
  arenaLocalMatchReduce,
  type ArenaLocalMatchState,
} from '../modules/arena/match_machine';

const plan = {
  matchId: 'm1',
  seat: 'a' as const,
  mode: 'quick' as const,
  planHash: 'h1',
  tasks: [
    { taskIndex: 0, mode: 'guess_phrase' as const },
    { taskIndex: 1, mode: 'fill_gap' as const },
  ],
};

const exactTick = {
  taskIndex: 0,
  correct: true,
  raceElapsedMs: 5_000,
  exact: true as const,
};

function toFirstAnswer(): ArenaLocalMatchState {
  const initial = arenaLocalMatchInit(plan, {
    monoNowMs: 0,
    wallNowMs: 10_000,
    monoEpochId: 'e1',
    countdownRemainingMs: 0,
  });
  return arenaLocalMatchReduce(plan, initial, { type: 'tick', monoNowMs: 1_500 });
}

describe('Arena opponent presentation timing', () => {
  test('an exact opponent waits for its own response time', () => {
    const state = toFirstAnswer();
    expect(state.phase).toBe('answer');
    expect(arenaOpponentRevealDelayMs(state, exactTick, 3_000)).toBe(3_500);
  });

  test('an opponent slower than the player lands perceptibly inside reveal', () => {
    const answering = toFirstAnswer();
    const state = arenaLocalMatchReduce(plan, answering, {
      type: 'answer',
      monoNowMs: 4_000,
      wallNowMs: 14_000,
      correct: true,
      answer: 0,
    });

    expect(state.phase).toBe('reveal');
    expect(arenaOpponentRevealDelayMs(state, exactTick, 4_000))
      .toBe(ARENA_OPPONENT_POST_ANSWER_MAX_MS);
    expect(ARENA_OPPONENT_POST_ANSWER_MIN_MS).toBeGreaterThanOrEqual(200);
  });

  test('a slightly slower opponent remains visibly after the player', () => {
    const answering = toFirstAnswer();
    const state = arenaLocalMatchReduce(plan, answering, {
      type: 'answer',
      monoNowMs: 4_000,
      wallNowMs: 14_000,
      correct: true,
      answer: 0,
    });
    const slightlySlower = { ...exactTick, raceElapsedMs: 2_550 };

    expect(arenaOpponentRevealDelayMs(state, slightlySlower, 4_000))
      .toBe(ARENA_OPPONENT_POST_ANSWER_MIN_MS);
  });

  test('countdown includes both countdown and reading before the rival clock', () => {
    const state = arenaLocalMatchInit(plan, {
      monoNowMs: 100,
      wallNowMs: 10_000,
      monoEpochId: 'e1',
      countdownRemainingMs: 3_000,
    });

    expect(arenaOpponentRevealDelayMs(state, exactTick, 100)).toBe(9_500);
  });

  test('past tasks reveal immediately and future tasks stay hidden', () => {
    const state = { ...toFirstAnswer(), taskIndex: 1 };
    expect(arenaOpponentRevealDelayMs(state, exactTick, state.phaseStartedAtMonoMs)).toBe(0);
    expect(arenaOpponentRevealDelayMs(
      state,
      { ...exactTick, taskIndex: 2 },
      state.phaseStartedAtMonoMs,
    )).toBeNull();
  });

  test('a live tick is visible immediately because arrival proves the answer happened', () => {
    const state = toFirstAnswer();
    expect(arenaOpponentRevealDelayMs(
      state,
      { taskIndex: 0, correct: true, raceElapsedMs: 7_000 },
      state.phaseStartedAtMonoMs,
    )).toBe(0);
  });

  test('cold-restored timing is rebased before an exact reveal delay is calculated', () => {
    let restored = arenaLocalMatchInit(plan, {
      monoNowMs: 100_000,
      wallNowMs: 10_000,
      monoEpochId: 'old-process',
      countdownRemainingMs: 0,
    });
    restored = arenaLocalMatchReduce(plan, restored, {
      type: 'tick',
      monoNowMs: 100_000,
    });
    restored = arenaLocalMatchReduce(plan, restored, {
      type: 'opponent_answered',
      monoNowMs: 100_000,
      tick: exactTick,
    });
    const rebased = arenaLocalMatchReduce(plan, restored, {
      type: 'resume',
      monoNowMs: 50,
      wallNowMs: 10_500,
      monoEpochId: 'new-process',
    });

    expect(rebased.phase).toBe('reading');
    expect(rebased.phaseStartedAtMonoMs).toBe(-450);
    expect(arenaOpponentRevealDelayMs(rebased, exactTick, 50)).toBe(6_000);
  });
});
