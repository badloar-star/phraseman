import {
  arenaLocalMatchInit, arenaLocalMatchReduce,
  ARENA_LOCAL_REVEAL_MS, type ArenaMatchPlan,
} from '../modules/arena/match_machine';
import { ARENA_ANSWER_MS } from '../modules/arena/stars';

const modes = ['guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match'] as const;
const planFor = (mode: typeof modes[number]): ArenaMatchPlan => ({
  matchId: 'immediate-input', seat: 'a', mode: 'ranked', planHash: 'test',
  tasks: [{ taskIndex: 0, mode }, { taskIndex: 1, mode }],
});

describe('Arena accepts input as soon as a question appears', () => {
  test.each(modes)('%s starts with the full answer window and no dead input period', mode => {
    const plan = planFor(mode);
    const initial = arenaLocalMatchInit(plan, {
      monoNowMs: 0, wallNowMs: 1000, monoEpochId: 'test', countdownRemainingMs: 100,
    });
    const active = arenaLocalMatchReduce(plan, initial, { type: 'tick', monoNowMs: 100 });
    expect(active.phase).toBe('answer');
    expect(active.phaseBudgetMs).toBe(ARENA_ANSWER_MS[mode]);
    const answered = arenaLocalMatchReduce(plan, active, mode === 'speed_match'
      ? { type: 'speed_attempt', monoNowMs: 101, pairIndex: 0, selectedIndex: 0, correct: true }
      : { type: 'answer', monoNowMs: 101, wallNowMs: 1101, correct: true, answer: 0 });
    if (mode === 'speed_match') {
      expect(answered.pairFirstAttemptCorrect[0]).toBe(true);
    } else {
      expect(answered.outcomes[0]).toMatchObject({ status: 'correct', raceElapsedMs: 1 });
    }
  });

  test('the next question is also immediately interactive after the result phase', () => {
    const plan = planFor('guess_phrase');
    let state = arenaLocalMatchInit(plan, {
      monoNowMs: 0, wallNowMs: 1000, monoEpochId: 'test', countdownRemainingMs: 0,
    });
    state = arenaLocalMatchReduce(plan, state, { type: 'tick', monoNowMs: 0 });
    expect(state.phase).toBe('answer');
    state = arenaLocalMatchReduce(plan, state, { type: 'answer', monoNowMs: 10, wallNowMs: 1010, correct: true, answer: 0 });
    expect(state.phase).toBe('reveal');
    state = arenaLocalMatchReduce(plan, state, { type: 'tick', monoNowMs: 10 + ARENA_LOCAL_REVEAL_MS });
    expect(state).toMatchObject({ phase: 'answer', taskIndex: 1, phaseBudgetMs: ARENA_ANSWER_MS.guess_phrase });
  });
});
