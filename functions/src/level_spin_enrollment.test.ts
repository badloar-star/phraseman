import { prepareLevelSpinEnrollment } from './level_spin_enrollment';

describe('level Spin v1 enrollment', () => {
  test('snapshots the current authoritative level without credits or balance changes', () => {
    expect(prepareLevelSpinEnrollment({
      levelSpinServerState: { levelBaseline: 2, balance: 3, activeRequestId: null },
      progressServerState: { totalXp: 5_100 },
      progress: { user_total_xp: '50' },
    })).toEqual({
      changed: true,
      state: { protocol: 'v1', levelBaseline: 5, balance: 3, activeRequestId: null },
    });
  });

  test('keeps sticky v1 state byte-stable and never advances its baseline during enrollment', () => {
    const state = { protocol: 'v1', levelBaseline: 4, balance: 2, activeRequestId: 'request-1' };
    expect(prepareLevelSpinEnrollment({
      levelSpinServerState: state,
      progressServerState: { totalXp: 9_000 },
      progress: { user_total_xp: '9000' },
    })).toEqual({ changed: false, state });
  });

  test('fails closed to bounded server values for malformed legacy state', () => {
    expect(prepareLevelSpinEnrollment({
      levelSpinServerState: { levelBaseline: 99, balance: -5, activeRequestId: 42 },
      progressServerState: { totalXp: -1 },
      progress: { user_total_xp: '0' },
    })).toEqual({
      changed: true,
      state: { protocol: 'v1', levelBaseline: 1, balance: 0, activeRequestId: null },
    });
  });
});
