import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearMockLeaderboardStats,
  computeAllPercentiles,
  type GlobalLeaderboardStats,
  MIN_PERCENTILE_SAMPLE_XP,
} from '../app/leaderboard_stats';

const highMetricOpts = {
  myStreak: 99,
  myWeekXp: 9999,
  myDaily7xp: 9999,
  myDaily7timeMs: 9999,
  myArenaXp: 9999,
};

const stats: GlobalLeaderboardStats = {
  totalUsers: 12_847,
  updatedAt: 1_725_000_000_000,
  minimumSampleXp: MIN_PERCENTILE_SAMPLE_XP,
  xpThresholds: [MIN_PERCENTILE_SAMPLE_XP - 1],
  streakThresholds: [1],
  weekXpThresholds: [1],
  daily7xpThresholds: [1],
  daily7timeMsThresholds: [1],
  arenaXpThresholds: [1],
};

describe('leaderboard percentile active sample floor', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
    clearMockLeaderboardStats();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('hides app-wide percentiles before the active XP floor', async () => {
    const percentiles = await computeAllPercentiles({
      myXp: MIN_PERCENTILE_SAMPLE_XP - 1,
      ...highMetricOpts,
    }, stats);

    expect(percentiles.xp).toBeNull();
    expect(percentiles.streak).toBeNull();
    expect(percentiles.weekXp).toBeNull();
    expect(percentiles.daily7xp).toBeNull();
    expect(percentiles.daily7timeMs).toBeNull();
    expect(percentiles.arenaXp).not.toBeNull();
    expect(percentiles.sample).toEqual({
      status: 'below_sample_floor',
      userTotalXp: MIN_PERCENTILE_SAMPLE_XP - 1,
      minimumSampleXp: MIN_PERCENTILE_SAMPLE_XP,
      totalUsers: stats.totalUsers,
      updatedAtMs: stats.updatedAt,
      isStale: false,
    });
  });

  it('shows app-wide percentiles once the active XP floor is reached', async () => {
    const percentiles = await computeAllPercentiles({
      myXp: MIN_PERCENTILE_SAMPLE_XP,
      ...highMetricOpts,
    }, stats);

    expect(percentiles.xp).not.toBeNull();
    expect(percentiles.streak).not.toBeNull();
    expect(percentiles.weekXp).not.toBeNull();
    expect(percentiles.daily7xp).not.toBeNull();
    expect(percentiles.daily7timeMs).not.toBeNull();
    expect(percentiles.sample).toEqual({
      status: 'available',
      userTotalXp: MIN_PERCENTILE_SAMPLE_XP,
      minimumSampleXp: MIN_PERCENTILE_SAMPLE_XP,
      totalUsers: stats.totalUsers,
      updatedAtMs: stats.updatedAt,
      isStale: false,
    });
  });

  it('reports unavailable when global stats cannot be loaded', async () => {
    const percentiles = await computeAllPercentiles({
      myXp: MIN_PERCENTILE_SAMPLE_XP,
      ...highMetricOpts,
    }, null);

    expect(percentiles.xp).toBeNull();
    expect(percentiles.arenaXp).toBeNull();
    expect(percentiles.sample).toEqual({
      status: 'unavailable',
      userTotalXp: MIN_PERCENTILE_SAMPLE_XP,
      minimumSampleXp: MIN_PERCENTILE_SAMPLE_XP,
      totalUsers: 0,
      updatedAtMs: null,
      isStale: false,
    });
  });

  it('uses a valid expired cache as stale when global stats are unavailable', async () => {
    const now = 1_800_000_000_000;
    jest.useFakeTimers().setSystemTime(now);
    await AsyncStorage.setItem('leaderboard_stats_cache_v2', JSON.stringify({
      data: stats,
      fetchedAt: now - 2 * 60 * 60 * 1000,
    }));

    const percentiles = await computeAllPercentiles({
      myXp: MIN_PERCENTILE_SAMPLE_XP,
      ...highMetricOpts,
    });

    expect(percentiles.sample.status).toBe('available');
    expect(percentiles.sample.isStale).toBe(true);
    expect(percentiles.totalUsers).toBe(stats.totalUsers);
  });

  it('does not use a corrupted expired cache', async () => {
    const now = 1_800_000_000_000;
    jest.useFakeTimers().setSystemTime(now);
    await AsyncStorage.setItem('leaderboard_stats_cache_v2', JSON.stringify({
      data: { ...stats, xpThresholds: [] },
      fetchedAt: now - 2 * 60 * 60 * 1000,
    }));

    const percentiles = await computeAllPercentiles({
      myXp: MIN_PERCENTILE_SAMPLE_XP,
      ...highMetricOpts,
    });

    expect(percentiles.sample.status).toBe('unavailable');
    expect(percentiles.sample.isStale).toBe(false);
    expect(percentiles.totalUsers).toBe(0);
  });
});
