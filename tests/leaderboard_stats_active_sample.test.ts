import AsyncStorage from '@react-native-async-storage/async-storage';

const mockFirestoreGet = jest.fn();

jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({ get: mockFirestoreGet })),
    })),
  })),
}));

import {
  clearMockLeaderboardStats,
  computeAllPercentiles,
  isLeaderboardStatsSourceStale,
  LEADERBOARD_STATS_MAX_SOURCE_AGE_MS,
  LEADERBOARD_STATS_MAX_FUTURE_SKEW_MS,
  type GlobalLeaderboardStats,
  lookupPercentile,
  MIN_PERCENTILE_SAMPLE_XP,
} from '../app/leaderboard_stats';

const highMetricOpts = {
  myStreak: 99,
  myWeekXp: 9999,
  myDaily7xp: 9999,
  myDaily7timeMs: 9999,
  myArenaXp: 9999,
};

const thresholds = (value: number): number[] => new Array(99).fill(value);

const stats: GlobalLeaderboardStats = {
  totalUsers: 12_847,
  updatedAt: 1_725_000_000_000,
  minimumSampleXp: MIN_PERCENTILE_SAMPLE_XP,
  xpThresholds: thresholds(MIN_PERCENTILE_SAMPLE_XP - 1),
  streakThresholds: thresholds(1),
  weekXpThresholds: thresholds(1),
  daily7xpThresholds: thresholds(1),
  daily7timeMsThresholds: thresholds(1),
  arenaXpThresholds: thresholds(1),
};

describe('leaderboard percentile active sample floor', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
    clearMockLeaderboardStats();
    mockFirestoreGet.mockReset().mockRejectedValue(new Error('offline'));
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
    expect(mockFirestoreGet).toHaveBeenCalledTimes(1);
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

  it('keeps app-wide percentiles unavailable for an arena-only zero-user sample', async () => {
    const now = 1_800_000_000_000;
    jest.useFakeTimers().setSystemTime(now);
    await AsyncStorage.setItem('leaderboard_stats_cache_v2', JSON.stringify({
      data: { ...stats, totalUsers: 0 },
      fetchedAt: now - 2 * 60 * 60 * 1000,
    }));

    const percentiles = await computeAllPercentiles({
      myXp: MIN_PERCENTILE_SAMPLE_XP,
      ...highMetricOpts,
    });

    expect(percentiles.xp).toBeNull();
    expect(percentiles.streak).toBeNull();
    expect(percentiles.sample.status).toBe('unavailable');
    expect(percentiles.sample.totalUsers).toBe(0);
    expect(percentiles.sample.isStale).toBe(true);
    expect(percentiles.arenaXp).toBe(99);
  });

  it('rejects an expired cache whose populated thresholds exceed 99 entries', async () => {
    const now = 1_800_000_000_000;
    jest.useFakeTimers().setSystemTime(now);
    await AsyncStorage.setItem('leaderboard_stats_cache_v2', JSON.stringify({
      data: { ...stats, xpThresholds: thresholds(1).concat(1) },
      fetchedAt: now - 2 * 60 * 60 * 1000,
    }));

    const percentiles = await computeAllPercentiles({
      myXp: MIN_PERCENTILE_SAMPLE_XP,
      ...highMetricOpts,
    });

    expect(percentiles.sample.status).toBe('unavailable');
    expect(percentiles.totalUsers).toBe(0);
  });

  it('never returns a percentile above 99 for malformed direct input', () => {
    expect(lookupPercentile(new Array(100).fill(1), 2)).toBe(99);
  });

  it('prefers a valid fresh Firestore response over an expired cache', async () => {
    const now = 1_800_000_000_000;
    const freshStats = { ...stats, totalUsers: 22_000, updatedAt: now };
    jest.useFakeTimers().setSystemTime(now);
    await AsyncStorage.setItem('leaderboard_stats_cache_v2', JSON.stringify({
      data: stats,
      fetchedAt: now - 2 * 60 * 60 * 1000,
    }));
    mockFirestoreGet.mockResolvedValue({
      exists: true,
      data: () => freshStats,
    });

    const percentiles = await computeAllPercentiles({
      myXp: MIN_PERCENTILE_SAMPLE_XP,
      ...highMetricOpts,
    });

    expect(percentiles.totalUsers).toBe(freshStats.totalUsers);
    expect(percentiles.sample.updatedAtMs).toBe(freshStats.updatedAt);
    expect(percentiles.sample.isStale).toBe(false);
    expect(mockFirestoreGet).toHaveBeenCalledTimes(1);
  });

  it('defines source freshness independently from the local cache age', () => {
    const now = 1_800_000_000_000;

    expect(isLeaderboardStatsSourceStale(
      now - LEADERBOARD_STATS_MAX_SOURCE_AGE_MS + 1,
      now,
    )).toBe(false);
    expect(isLeaderboardStatsSourceStale(
      now - LEADERBOARD_STATS_MAX_SOURCE_AGE_MS,
      now,
    )).toBe(false);
    expect(isLeaderboardStatsSourceStale(
      now - LEADERBOARD_STATS_MAX_SOURCE_AGE_MS - 1,
      now,
    )).toBe(true);
  });

  it('tolerates small server clock skew but treats a materially future source as stale', () => {
    const now = 1_800_000_000_000;

    expect(isLeaderboardStatsSourceStale(
      now + LEADERBOARD_STATS_MAX_FUTURE_SKEW_MS,
      now,
    )).toBe(false);
    expect(isLeaderboardStatsSourceStale(
      now + LEADERBOARD_STATS_MAX_FUTURE_SKEW_MS + 1,
      now,
    )).toBe(true);
  });

  it('marks a newly fetched old Firestore document stale and caches it', async () => {
    const now = 1_800_000_000_000;
    const oldStats = {
      ...stats,
      updatedAt: now - LEADERBOARD_STATS_MAX_SOURCE_AGE_MS - 1,
    };
    jest.useFakeTimers().setSystemTime(now);
    mockFirestoreGet.mockResolvedValue({ exists: true, data: () => oldStats });

    const percentiles = await computeAllPercentiles({
      myXp: MIN_PERCENTILE_SAMPLE_XP,
      ...highMetricOpts,
    });

    expect(percentiles.sample.isStale).toBe(true);
    expect(JSON.parse((await AsyncStorage.getItem('leaderboard_stats_cache_v2'))!)).toEqual({
      data: oldStats,
      fetchedAt: now,
    });

    const cachedPercentiles = await computeAllPercentiles({
      myXp: MIN_PERCENTILE_SAMPLE_XP,
      ...highMetricOpts,
    });
    expect(cachedPercentiles.sample.isStale).toBe(true);
    expect(mockFirestoreGet).toHaveBeenCalledTimes(1);
  });

  it('marks a fresh local cache stale when its source document is old', async () => {
    const now = 1_800_000_000_000;
    const oldStats = {
      ...stats,
      updatedAt: now - LEADERBOARD_STATS_MAX_SOURCE_AGE_MS - 1,
    };
    jest.useFakeTimers().setSystemTime(now);
    await AsyncStorage.setItem('leaderboard_stats_cache_v2', JSON.stringify({
      data: oldStats,
      fetchedAt: now - 1_000,
    }));

    const percentiles = await computeAllPercentiles({
      myXp: MIN_PERCENTILE_SAMPLE_XP,
      ...highMetricOpts,
    });

    expect(percentiles.sample.isStale).toBe(true);
    expect(mockFirestoreGet).not.toHaveBeenCalled();
  });

  it('keeps an offline expired cache stale even when its source document is fresh', async () => {
    const now = 1_800_000_000_000;
    const freshSourceStats = { ...stats, updatedAt: now - 1_000 };
    jest.useFakeTimers().setSystemTime(now);
    await AsyncStorage.setItem('leaderboard_stats_cache_v2', JSON.stringify({
      data: freshSourceStats,
      fetchedAt: now - 2 * 60 * 60 * 1000,
    }));

    const percentiles = await computeAllPercentiles({
      myXp: MIN_PERCENTILE_SAMPLE_XP,
      ...highMetricOpts,
    });

    expect(percentiles.sample.isStale).toBe(true);
    expect(mockFirestoreGet).toHaveBeenCalledTimes(1);
  });
});
