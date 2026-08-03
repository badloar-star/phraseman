jest.mock('firebase-admin', () => ({
  firestore: jest.fn(),
}));

jest.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: jest.fn((_options, handler) => handler),
}));

import { computeGroupResults } from './league_finalize_cron';

// Сводный пул: одна комната содержит игроков разных личных лиг (умное
// слияние). Каждый повышается/понижается от СВОЕЙ лиги, а не от лиги комнаты.
describe('league finalization for the shared weekly pool (smart merge)', () => {
  const rankMode = { enabled: false, threshold: 1000 };

  it('promotes and demotes each member relative to their OWN league', () => {
    const results = computeGroupResults({
      grinder: { uid: 'grinder', points: 900, leagueId: 7 },
      middle: { uid: 'middle', points: 400, leagueId: 3 },
      newbie: { uid: 'newbie', points: 10, leagueId: 0 },
    }, 0, rankMode);

    expect(results.grinder).toMatchObject({ promoted: true, prevLeagueId: 7, newLeagueId: 8 });
    expect(results.middle).toMatchObject({ promoted: false, demoted: false, prevLeagueId: 3, newLeagueId: 3 });
    // Низ зоны, но лига 0 вниз не понижается.
    expect(results.newbie).toMatchObject({ promoted: false, demoted: false, prevLeagueId: 0, newLeagueId: 0 });
  });

  it('keeps legacy per-league rooms byte-compatible (no leagueId on members)', () => {
    const results = computeGroupResults({
      a: { uid: 'a', points: 100 },
      b: { uid: 'b', points: 50 },
      c: { uid: 'c', points: 10 },
      d: { uid: 'd', points: 0 },
    }, 5, rankMode);

    expect(results.a).toMatchObject({ rank: 1, total: 4, promoted: true, prevLeagueId: 5, newLeagueId: 6 });
    expect(results.d).toMatchObject({ demoted: true, prevLeagueId: 5, newLeagueId: 4 });
  });

  it('respects the top league cap and xp mode for mixed rooms', () => {
    const xpMode = { enabled: true, threshold: 300 };
    const results = computeGroupResults({
      top: { uid: 'top', points: 900, leagueId: 11 },
      mid: { uid: 'mid', points: 500, leagueId: 4 },
      low: { uid: 'low', points: 50, leagueId: 1 },
    }, 0, xpMode);

    expect(results.top).toMatchObject({ promoted: false, newLeagueId: 11 });
    expect(results.mid).toMatchObject({ promoted: true, newLeagueId: 5 });
    expect(results.low).toMatchObject({ promoted: false, demoted: false, newLeagueId: 1 });
  });
});
