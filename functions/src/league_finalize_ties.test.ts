jest.mock('firebase-admin', () => ({
  firestore: jest.fn(),
}));

jest.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: jest.fn((_options, handler) => handler),
}));

import { computeGroupResults } from './league_finalize_cron';

describe('league finalization ties', () => {
  const rankMode = { enabled: false, threshold: 1000 };

  it('promotes every member tied at the top-zone boundary', () => {
    const results = computeGroupResults({
      a: { uid: 'a', points: 100 },
      b: { uid: 'b', points: 100 },
      c: { uid: 'c', points: 50 },
      d: { uid: 'd', points: 0 },
    }, 2, rankMode);

    expect(results.a).toMatchObject({ rank: 1, promoted: true, demoted: false });
    expect(results.b).toMatchObject({ rank: 1, promoted: true, demoted: false });
  });

  it('demotes every member tied at the bottom-zone boundary', () => {
    const results = computeGroupResults({
      a: { uid: 'a', points: 100 },
      b: { uid: 'b', points: 50 },
      c: { uid: 'c', points: 0 },
      d: { uid: 'd', points: 0 },
    }, 2, rankMode);

    expect(results.c).toMatchObject({ rank: 3, promoted: false, demoted: true });
    expect(results.d).toMatchObject({ rank: 3, promoted: false, demoted: true });
  });

  it('reports the real 28-person room including residents but never rewards them', () => {
    const members: Record<string, { uid: string; points: number; isResident?: boolean }> = {
      live_a: { uid: 'live_a', points: 10_000 },
      live_b: { uid: 'live_b', points: 200 },
      live_c: { uid: 'live_c', points: 100 },
      live_d: { uid: 'live_d', points: 0 },
    };
    for (let slot = 0; slot < 24; slot += 1) {
      const uid = `res_${String(slot).padStart(2, '0')}`;
      members[uid] = { uid, points: 5_000 - slot, isResident: true };
    }

    const results = computeGroupResults(members, 2, rankMode);

    expect(results.live_a).toMatchObject({ rank: 1, total: 28 });
    expect(results.live_b).toMatchObject({ rank: 26, total: 28 });
    expect(Object.keys(results)).toEqual(['live_a', 'live_b', 'live_c', 'live_d']);
  });
});
