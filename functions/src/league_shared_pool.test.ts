import {
  SHARED_POOL_MARKER,
  SHARED_POOL_REAL_SOFT_CAP,
  SHARED_POOL_START_WEEK,
  chooseSharedPoolRoom,
  compareWeekIds,
  countMembers,
  isSharedPoolWeekId,
  isoWeekStartMs,
  leagueRoomMatches,
  sharedPoolDocId,
} from './league_shared_pool';

describe('league shared pool helpers', () => {
  it('activates strictly from the start week, including year rollover', () => {
    expect(isSharedPoolWeekId('2026-W32')).toBe(false);
    expect(isSharedPoolWeekId('2026-W33')).toBe(true);
    expect(isSharedPoolWeekId('2026-W52')).toBe(true);
    expect(isSharedPoolWeekId('2027-W01')).toBe(true);
  });

  it('compares week ids across year boundaries numerically', () => {
    expect(compareWeekIds('2026-W53', '2027-W01')).toBeLessThan(0);
    expect(compareWeekIds('2027-W01', '2026-W53')).toBeGreaterThan(0);
    expect(compareWeekIds('2026-W33', '2026-W33')).toBe(0);
  });

  it('computes ISO week start (Monday 00:00 UTC)', () => {
    const start = isoWeekStartMs(SHARED_POOL_START_WEEK);
    const date = new Date(start);
    expect(date.getUTCDay()).toBe(1);
    expect(date.toISOString()).toBe('2026-08-10T00:00:00.000Z');
  });

  it('builds admin-safe deterministic pool doc ids', () => {
    expect(sharedPoolDocId('2026-W33', 1)).toBe('pool_2026-W33_01');
    expect(sharedPoolDocId('2026-W33', 12)).toBe('pool_2026-W33_12');
    expect(/^[A-Za-z0-9._-]{2,180}$/.test(sharedPoolDocId('2026-W33', 1))).toBe(true);
  });

  it('counts members excluding hidden entries', () => {
    const members = {
      real1: { points: 10 },
      real2: { points: 5, identityHidden: true },
      real3: { points: 3 },
    };
    expect(countMembers(members)).toBe(2);
  });

  it('matches pool rooms for any personal league, legacy rooms only for their own', () => {
    const pool = { weekId: '2026-W33', leagueId: 0, pool: SHARED_POOL_MARKER };
    const legacy = { weekId: '2026-W33', leagueId: 4 };
    expect(leagueRoomMatches(pool, '2026-W33', 9)).toBe(true);
    expect(leagueRoomMatches(pool, '2026-W34', 9)).toBe(false);
    expect(leagueRoomMatches(legacy, '2026-W33', 4)).toBe(true);
    expect(leagueRoomMatches(legacy, '2026-W33', 5)).toBe(false);
  });

  it('prefers the room already containing the user, then first with real space', () => {
    const mine = {
      id: 'pool_2026-W33_02',
      data: { members: { me: { points: 1 } } },
    };
    const other = {
      id: 'pool_2026-W33_01',
      data: { members: { someone: { points: 1 } } },
    };
    expect(chooseSharedPoolRoom([other, mine], 'me')).toBe('pool_2026-W33_02');
    expect(chooseSharedPoolRoom([other, mine], 'newcomer')).toBe('pool_2026-W33_01');
  });

  it('skips rooms at the soft cap and asks for a new one when all are full', () => {
    const fullMembers: Record<string, { points: number }> = {};
    for (let i = 0; i < SHARED_POOL_REAL_SOFT_CAP; i++) fullMembers[`u${i}`] = { points: i };
    const fullRoom = { id: 'pool_2026-W33_01', data: { members: fullMembers } };
    expect(chooseSharedPoolRoom([fullRoom], 'newcomer')).toBe(null);
    const openRoom = { id: 'pool_2026-W33_02', data: { members: { real: { points: 1 } } } };
    expect(chooseSharedPoolRoom([fullRoom, openRoom], 'newcomer')).toBe('pool_2026-W33_02');
  });
});
