import {
  arenaForgetResultHandoff,
  arenaPeekResultHandoff,
  arenaRememberResultHandoff,
  arenaResultHandoffReady,
} from '../modules/arena/result_handoff';
import { arenaFinishRetryDelay } from '../modules/arena/finish_retry';

const match = {
  matchId: 'm1',
  mode: 'quick',
  state: 'settled',
  version: 7,
  players: [],
  taskCount: 5,
} as never;

describe('Arena coherent result handoff', () => {
  it('bounds in-match report retries instead of polling forever', () => {
    expect([0, 1, 2, 3].map(arenaFinishRetryDelay)).toEqual([1_500, 4_500, 16_000, null]);
  });

  it('requires a terminal match, seat and authoritative quick reward', () => {
    expect(arenaResultHandoffReady({ settled: false, match, viewerSeat: 'a', viewerReward: { starsEarned: 0 } }, 'quick')).toBe(false);
    expect(arenaResultHandoffReady({ settled: true, match, viewerSeat: 'a' }, 'quick')).toBe(false);
    expect(arenaResultHandoffReady({ settled: true, match, viewerSeat: 'a', viewerReward: { starsEarned: 0 } }, 'quick')).toBe(true);
  });

  it('isolates the first result frame by account generation and match', () => {
    arenaRememberResultHandoff({ ownerKey: 'user-a:1', matchId: 'm1', match, viewerSeat: 'a', viewerReward: {} as never });
    expect(arenaPeekResultHandoff('user-a:1', 'm1')?.match).toBe(match);
    expect(arenaPeekResultHandoff('user-a:2', 'm1')).toBeNull();
    expect(arenaPeekResultHandoff('user-a:1', 'm2')).toBeNull();
  });

  it('retains at most one private handoff and forgets it after state hydration', () => {
    arenaRememberResultHandoff({ ownerKey: 'user-a:10', matchId: 'm10', match, viewerSeat: 'a', viewerReward: {} as never });
    arenaRememberResultHandoff({ ownerKey: 'user-b:11', matchId: 'm11', match: { matchId: 'm11', mode: 'quick', state: 'settled', version: 8, players: [], taskCount: 5 } as never, viewerSeat: 'b', viewerReward: {} as never });

    expect(arenaPeekResultHandoff('user-a:10', 'm10')).toBeNull();
    expect(arenaPeekResultHandoff('user-b:11', 'm11')).not.toBeNull();
    arenaForgetResultHandoff('user-b:11', 'm11');
    expect(arenaPeekResultHandoff('user-b:11', 'm11')).toBeNull();
  });
});
