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

  it('does not treat an active sync as permission to present a public terminal listener reward', () => {
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
    expect(state.presentation).toBeNull();
  });

  it('prefers a later private terminal sync after a public terminal listener arrived first', () => {
    const currentTerminal = match({
      state: 'settled', version: 11, result: { winnerUid: 'a', rewards: { a: publicReward } },
    });
    let state = arenaQuickResultInitialState('match-1', 'a');
    state = arenaQuickResultReduce(state, { type: 'live', matchId: 'match-1', match: currentTerminal });
    state = arenaQuickResultReduce(state, {
      type: 'sync', matchId: 'match-1', version: 10, match: match({ state: 'task_active', version: 10 }), viewerSeat: 'a',
    });
    expect(state.presentation).toBeNull();

    const privateTerminal = match({
      state: 'settled', version: 12, result: { winnerUid: 'a', rewards: { a: publicReward } },
    });
    state = arenaQuickResultReduce(state, {
      type: 'sync', matchId: 'match-1', version: 12, match: privateTerminal,
      viewerSeat: 'a', viewerReward: privateReward,
    });
    expect(state.presentation).toEqual({ match: privateTerminal, reward: privateReward, viewerSeat: 'a' });
  });

  it('uses public reward only after a terminal sync proves a legacy response has no private breakdown', () => {
    const terminal = match({
      state: 'settled', version: 11, result: { winnerUid: 'a', rewards: { a: publicReward } },
    });
    let state = arenaQuickResultInitialState('match-1', 'a');
    state = arenaQuickResultReduce(state, { type: 'live', matchId: 'match-1', match: terminal });
    state = arenaQuickResultReduce(state, {
      type: 'sync', matchId: 'match-1', version: 11, match: terminal, viewerSeat: 'a',
    });
    const firstPresentation = state.presentation;
    expect(firstPresentation).toEqual({ match: terminal, reward: publicReward, viewerSeat: 'a' });

    state = arenaQuickResultReduce(state, {
      type: 'sync', matchId: 'match-1', version: 12, match: terminal, viewerSeat: 'a', viewerReward: privateReward,
    });
    expect(state.presentation).toBe(firstPresentation);
    expect(state.presentation?.reward).toBe(publicReward);
  });

  it('waits through active sync and freezes the first later terminal private presentation', () => {
    let state = arenaQuickResultInitialState('match-1', 'a');
    state = arenaQuickResultReduce(state, {
      type: 'sync', matchId: 'match-1', version: 4,
      match: match({ state: 'task_active', version: 4 }), viewerSeat: 'a',
    });
    expect(state.presentation).toBeNull();

    const terminal = match({
      state: 'settled', version: 5, result: { winnerUid: 'a', rewards: { a: publicReward } },
    });
    state = arenaQuickResultReduce(state, {
      type: 'sync', matchId: 'match-1', version: 5, match: terminal,
      viewerSeat: 'a', viewerReward: privateReward,
    });
    const frozen = state.presentation;
    expect(frozen?.reward).toBe(privateReward);

    state = arenaQuickResultReduce(state, {
      type: 'sync', matchId: 'match-1', version: 6, match: terminal,
      viewerSeat: 'a', viewerReward: publicReward,
    });
    expect(state.presentation).toBe(frozen);
  });
});
