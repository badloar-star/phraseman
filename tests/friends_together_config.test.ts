import { friendsTogetherClientConfigFromNumbers } from '../app/friends_together/together_config';

describe('friendsTogetherClientConfigFromNumbers', () => {
  it('hydrates the same remote numeric handles used by the server', () => {
    const config = friendsTogetherClientConfigFromNumbers({
      friends_level_thresholds: [0, 4, 12, 40, 120],
      friends_chest_tiers: [7000, 14000, 21000],
      friends_chest_cap_per_friend: 2500,
      friends_chest_top_n: 8,
      friends_chest_min_days: 4,
      friends_chest_min_xp: 800,
      friends_chest_boost_multiplier: 3,
      friends_chest_claim_any_day: 1,
    });

    expect(config).toMatchObject({
      levelThresholds: [0, 4, 12, 40, 120],
      chestTiers: [7000, 14000, 21000],
      chestCapPerFriend: 2500,
      chestTopN: 8,
      chestMinDays: 4,
      chestMinWeeklyXp: 800,
      chestBoostMultiplier: 3,
      chestClaimAnyDay: true,
    });
  });

  it('rejects malformed or descending arrays and keeps safe defaults', () => {
    const config = friendsTogetherClientConfigFromNumbers({
      friends_level_thresholds: [0, 10, 3, 30, 100],
      friends_chest_tiers: 'bad',
    });
    expect(config.levelThresholds).toEqual([0, 3, 10, 30, 100]);
    expect(config.chestTiers).toEqual([6000, 12000, 20000]);
  });
});
