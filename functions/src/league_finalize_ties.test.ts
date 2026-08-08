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
});
