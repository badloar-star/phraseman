import AsyncStorage from '@react-native-async-storage/async-storage';

const computeAllPercentiles = jest.fn(async (opts) => ({
  xp: null,
  streak: null,
  weekXp: opts.myWeekXp,
  daily7xp: null,
  daily7timeMs: null,
  arenaXp: null,
  totalUsers: 0,
  sample: {
    status: 'unavailable',
    userTotalXp: 0,
    minimumSampleXp: 5000,
    totalUsers: 0,
    updatedAtMs: null,
    isStale: false,
  },
}));

jest.mock('../app/leaderboard_stats', () => ({
  computeAllPercentiles: (opts: unknown) => computeAllPercentiles(opts),
}));

jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: false,
  IS_EXPO_GO: true,
}));

jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: jest.fn(async () => 'test-user'),
  ensureStableAuthLinkForStableId: jest.fn(async () => true),
}));

jest.mock('../app/foreground_usage_ms', () => ({
  getForegroundDailyMsMap: jest.fn(async () => ({})),
}));

describe('loadPercentileData weekly XP', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
    computeAllPercentiles.mockClear();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-25T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('ignores stale week_points_v2 when calculating the weekly percentile', async () => {
    await AsyncStorage.multiSet([
      ['user_total_xp', '6000'],
      ['streak_count', '4'],
      ['week_points_v2', JSON.stringify({ weekKey: '2026-W21', points: 9999 })],
    ]);

    const { loadPercentileData } = require('../app/daily_analytics_sync');
    await loadPercentileData();

    expect(computeAllPercentiles).toHaveBeenCalledWith(expect.objectContaining({
      myWeekXp: 0,
    }));
  });
});
