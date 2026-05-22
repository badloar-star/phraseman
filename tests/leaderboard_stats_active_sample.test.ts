import {
  clearMockLeaderboardStats,
  computeAllPercentiles,
  injectMockLeaderboardStats,
  MIN_PERCENTILE_SAMPLE_XP,
} from '../app/leaderboard_stats';

const highMetricOpts = {
  myStreak: 99,
  myWeekXp: 9999,
  myDaily7xp: 9999,
  myDaily7timeMs: 9999,
  myArenaXp: 9999,
};

describe('leaderboard percentile active sample floor', () => {
  afterEach(() => {
    clearMockLeaderboardStats();
  });

  it('hides app-wide percentiles before the active XP floor', async () => {
    injectMockLeaderboardStats();

    const percentiles = await computeAllPercentiles({
      myXp: MIN_PERCENTILE_SAMPLE_XP - 1,
      ...highMetricOpts,
    });

    expect(percentiles.xp).toBeNull();
    expect(percentiles.streak).toBeNull();
    expect(percentiles.weekXp).toBeNull();
    expect(percentiles.daily7xp).toBeNull();
    expect(percentiles.daily7timeMs).toBeNull();
    expect(percentiles.arenaXp).not.toBeNull();
  });

  it('shows app-wide percentiles once the active XP floor is reached', async () => {
    injectMockLeaderboardStats();

    const percentiles = await computeAllPercentiles({
      myXp: MIN_PERCENTILE_SAMPLE_XP,
      ...highMetricOpts,
    });

    expect(percentiles.xp).not.toBeNull();
    expect(percentiles.streak).not.toBeNull();
    expect(percentiles.weekXp).not.toBeNull();
    expect(percentiles.daily7xp).not.toBeNull();
    expect(percentiles.daily7timeMs).not.toBeNull();
  });
});
