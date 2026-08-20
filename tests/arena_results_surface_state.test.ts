import type { ArenaMatch, ArenaMatchReward } from '../modules/arena/contract';
import { arenaResultReplayMode, arenaResultSurfaceKind } from '../modules/arena/result_surface_state';

const reward: ArenaMatchReward = { starsEarned: 0, xpEarned: 12 };

function match(state: 'task_active' | 'settled', mode: 'quick' | 'ranked' = 'quick'): ArenaMatch {
  return {
    matchId: 'm1', mode, opponentKind: 'human', players: [], acceptedBy: [],
    currentTaskIndex: 0, submittedBy: [], scores: { a: 0, b: 0 },
    stateStartedAtMs: 1, stateDeadlineAtMs: 2, version: state === 'settled' ? 2 : 1,
    state, terminal: state === 'settled',
    ...(state === 'settled' ? { result: { winnerUid: 'a', rewards: { a: reward } } } : {}),
  } as ArenaMatch;
}

describe('Arena results first-render surface', () => {
  it('uses a neutral pending surface before listener and sync resolve the match mode', () => {
    expect(arenaResultSurfaceKind({
      matchId: 'm1', match: null, quickKnown: false, quickReady: false,
    })).toBe('neutral_pending');
  });

  it('never routes an active listener snapshot through the legacy draw surface', () => {
    expect(arenaResultSurfaceKind({
      matchId: 'm1', match: match('task_active'), quickKnown: true, quickReady: false,
    })).toBe('quick_pending');
    expect(arenaResultSurfaceKind({
      matchId: 'm1', match: match('task_active', 'ranked'), quickKnown: false, quickReady: false,
    })).toBe('neutral_pending');
  });

  it('selects quick only after a coherent latch and standard only for a terminal non-quick match', () => {
    expect(arenaResultSurfaceKind({
      matchId: 'm1', match: match('settled'), quickKnown: true, quickReady: true,
    })).toBe('quick_ready');
    expect(arenaResultSurfaceKind({
      matchId: 'm1', match: match('settled', 'ranked'), quickKnown: false, quickReady: false,
    })).toBe('standard');
  });

  it('never invents quick replay while mode is unresolved', () => {
    expect(arenaResultReplayMode(null, null)).toBeNull();
    expect(arenaResultReplayMode('quick', null)).toBe('quick');
    expect(arenaResultReplayMode(null, match('settled', 'ranked'))).toBe('ranked');
  });
});
