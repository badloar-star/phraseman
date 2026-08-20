import type { ArenaMatch, ArenaMatchReward } from '../modules/arena/contract';
import {
  arenaQuickResultInitialState,
  arenaQuickResultReduce,
} from '../modules/arena/quick_result_state';

function match(input: Partial<ArenaMatch> & Pick<ArenaMatch, 'state' | 'version'>): ArenaMatch {
  return {
    matchId: 'match-1',
    mode: 'quick',
    opponentKind: 'human',
    players: [
      { uid: 'a', name: 'You', rank: 1, score: input.state === 'settled' ? 5 : 0, correct: 0 },
      { uid: 'b', name: 'Rival', rank: 1, score: input.state === 'settled' ? 2 : 0, correct: 0 },
    ],
    acceptedBy: ['a', 'b'],
    currentTaskIndex: 4,
    submittedBy: [],
    scores: input.state === 'settled' ? { a: 5, b: 2 } : { a: 0, b: 0 },
    stateStartedAtMs: 1,
    stateDeadlineAtMs: 2,
    terminal: input.state === 'settled',
    ...input,
  } as ArenaMatch;
}

const publicReward: ArenaMatchReward = { starsEarned: 0, xpEarned: 14 };
const privateReward: ArenaMatchReward = {
  ...publicReward,
  xpBreakdown: {
    schemaVersion: 'arena-xp-breakdown.v1',
    baseXp: 10,
    correctBonusXp: 2,
    outcomeBonusXp: 2,
    totalXp: 14,
  },
};

describe('quick result terminal presentation latch', () => {
  it('uses terminal sync match and reward atomically despite stale active 0:0 listener snapshots', () => {
    let state = arenaQuickResultInitialState('match-1', 'a');
    state = arenaQuickResultReduce(state, { type: 'live', matchId: 'match-1', match: match({ state: 'task_active', version: 3 }) });
    expect(state.quickKnown).toBe(true);
    expect(state.presentation).toBeNull();

    const terminal = match({ state: 'settled', version: 5, result: { winnerUid: 'a', rewards: { a: publicReward } } });
    state = arenaQuickResultReduce(state, {
      type: 'sync', matchId: 'match-1', version: 5, match: terminal, viewerSeat: 'a', viewerReward: privateReward,
    });
    const presentation = state.presentation;
    expect(presentation).toEqual({ match: terminal, reward: privateReward, viewerSeat: 'a' });

    state = arenaQuickResultReduce(state, { type: 'live', matchId: 'match-1', match: match({ state: 'task_active', version: 3 }) });
    expect(state.presentation).toBe(presentation);
    expect(state.presentation?.match.scores).toEqual({ a: 5, b: 2 });
  });

  it('gates live fallback by sync resolution and rejects a terminal snapshot older than the sync version floor', () => {
    const oldTerminal = match({
      state: 'settled', version: 9, result: { winnerUid: 'a', rewards: { a: publicReward } },
    });
    let state = arenaQuickResultInitialState('match-1', 'a');
    state = arenaQuickResultReduce(state, { type: 'live', matchId: 'match-1', match: oldTerminal });
    expect(state.presentation).toBeNull();

    state = arenaQuickResultReduce(state, {
      type: 'sync', matchId: 'match-1', version: 10, match: match({ state: 'task_active', version: 10 }), viewerSeat: 'a',
    });
    expect(state.presentation).toBeNull();

    const currentTerminal = match({
      state: 'settled', version: 11, result: { winnerUid: 'a', rewards: { a: publicReward } },
    });
    state = arenaQuickResultReduce(state, { type: 'live', matchId: 'match-1', match: currentTerminal });
    expect(state.presentation).toEqual({ match: currentTerminal, reward: publicReward, viewerSeat: 'a' });
  });

  it('accepts a newer coherent terminal live snapshot already queued when sync resolves', () => {
    const currentTerminal = match({
      state: 'settled', version: 11, result: { winnerUid: 'a', rewards: { a: publicReward } },
    });
    let state = arenaQuickResultInitialState('match-1', 'a');
    state = arenaQuickResultReduce(state, { type: 'live', matchId: 'match-1', match: currentTerminal });
    state = arenaQuickResultReduce(state, {
      type: 'sync', matchId: 'match-1', version: 10, match: match({ state: 'task_active', version: 10 }), viewerSeat: 'a',
    });
    expect(state.presentation).toEqual({ match: currentTerminal, reward: publicReward, viewerSeat: 'a' });
  });

  it('freezes the first coherent presentation so a later private upgrade cannot replay XP or SFX', () => {
    const terminal = match({
      state: 'settled', version: 11, result: { winnerUid: 'a', rewards: { a: publicReward } },
    });
    let state = arenaQuickResultInitialState('match-1', 'a');
    state = arenaQuickResultReduce(state, {
      type: 'sync', matchId: 'match-1', version: 10, match: match({ state: 'task_active', version: 10 }), viewerSeat: 'a',
    });
    state = arenaQuickResultReduce(state, { type: 'live', matchId: 'match-1', match: terminal });
    const firstPresentation = state.presentation;

    state = arenaQuickResultReduce(state, {
      type: 'sync', matchId: 'match-1', version: 12, match: terminal, viewerSeat: 'a', viewerReward: privateReward,
    });
    expect(state.presentation).toBe(firstPresentation);
    expect(state.presentation?.reward).toBe(publicReward);
  });
});
