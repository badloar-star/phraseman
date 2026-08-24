import { buildWeeklyChestModel, type WeeklyChestFriendInput } from '../app/friends_together/weekly_chest_model';
import {
  FRIENDS_CHEST_CAP_PER_FRIEND,
  FRIENDS_CHEST_TIERS,
  FRIENDS_CHEST_TOP_N,
} from '../app/friends_together/together_config';

const friend = (uid: string, weeklyXp: number, pairLevel = 2, boostActive = false): WeeklyChestFriendInput => ({
  uid,
  weeklyXp,
  pairLevel,
  boostActive,
});

/** 3 friends at the cap (2000 each) = 6000 progress = tier 1 reached — reusable fixture. */
const tier1Friends = (): WeeklyChestFriendInput[] => [
  friend('a', FRIENDS_CHEST_CAP_PER_FRIEND, 2),
  friend('b', FRIENDS_CHEST_CAP_PER_FRIEND, 2),
  friend('c', FRIENDS_CHEST_CAP_PER_FRIEND, 2),
];

describe('buildWeeklyChestModel', () => {
  it('uses the hydrated remote cap, boost and tier thresholds', () => {
    const model = buildWeeklyChestModel({
      friends: [friend('boosted', 900, 2, true)],
      myDays: 5,
      myWeeklyXp: 1000,
      weekKey: '2026-W34',
      claimedWeekKey: null,
      isClaimDay: true,
      config: {
        levelThresholds: [0, 3, 10, 30, 100],
        chestTiers: [1500, 3000, 6000],
        chestCapPerFriend: 600,
        chestTopN: 10,
        chestMinPairLevel: 2,
        chestMinDays: 5,
        chestMinWeeklyXp: 1000,
        chestBoostMultiplier: 3,
        chestClaimAnyDay: false,
      },
    });
    expect(model.progress).toBe(1800);
    expect(model.tier).toBe(1);
  });
  it('excludes friends below level 2 from progress', () => {
    const model = buildWeeklyChestModel({
      friends: [friend('a', 1500, 1), friend('b', 1500, 2)],
      myDays: 5,
      myWeeklyXp: 1000,
      weekKey: '2026-W33',
      claimedWeekKey: null,
    });
    expect(model.progress).toBe(1500); // only 'b' counts, below the cap so it's exact
  });

  it('caps a single friend contribution at FRIENDS_CHEST_CAP_PER_FRIEND', () => {
    const model = buildWeeklyChestModel({
      friends: [friend('a', FRIENDS_CHEST_CAP_PER_FRIEND + 5000, 2)],
      myDays: 5,
      myWeeklyXp: 1000,
      weekKey: '2026-W33',
      claimedWeekKey: null,
    });
    expect(model.progress).toBe(FRIENDS_CHEST_CAP_PER_FRIEND);
  });

  it('only counts the top N contributors', () => {
    const friends = Array.from({ length: FRIENDS_CHEST_TOP_N + 5 }, (_, i) => friend(`f${i}`, 1000, 2));
    const model = buildWeeklyChestModel({
      friends,
      myDays: 5,
      myWeeklyXp: 1000,
      weekKey: '2026-W33',
      claimedWeekKey: null,
    });
    expect(model.progress).toBe(1000 * FRIENDS_CHEST_TOP_N);
  });

  it('doubles contribution when boostActive (referral first-week boost)', () => {
    const model = buildWeeklyChestModel({
      friends: [friend('a', 1000, 2, true)],
      myDays: 5,
      myWeeklyXp: 1000,
      weekKey: '2026-W33',
      claimedWeekKey: null,
    });
    expect(model.progress).toBe(2000);
  });

  it('boost still respects the per-friend cap', () => {
    const model = buildWeeklyChestModel({
      friends: [friend('a', FRIENDS_CHEST_CAP_PER_FRIEND, 2, true)],
      myDays: 5,
      myWeeklyXp: 1000,
      weekKey: '2026-W33',
      claimedWeekKey: null,
    });
    // Cap applied BEFORE doubling per contributionFor() — cap*2.
    expect(model.progress).toBe(FRIENDS_CHEST_CAP_PER_FRIEND * 2);
  });

  it('computes tier reached against FRIENDS_CHEST_TIERS', () => {
    expect(FRIENDS_CHEST_TIERS).toEqual([6000, 12000, 20000]);
    const below = buildWeeklyChestModel({
      friends: [friend('a', 1500, 2)],
      myDays: 5,
      myWeeklyXp: 1000,
      weekKey: '2026-W33',
      claimedWeekKey: null,
    });
    expect(below.tier).toBe(0);

    // 3 friends x 2000 (cap) = 6000 — exactly tier 1.
    const tier1 = buildWeeklyChestModel({
      friends: [friend('a', 2000, 2), friend('b', 2000, 2), friend('c', 2000, 2)],
      myDays: 5,
      myWeeklyXp: 1000,
      weekKey: '2026-W33',
      claimedWeekKey: null,
    });
    expect(tier1.tier).toBe(1);

    const tier3 = buildWeeklyChestModel({
      friends: Array.from({ length: 10 }, (_, i) => friend(`f${i}`, 2000, 2)),
      myDays: 5,
      myWeeklyXp: 1000,
      weekKey: '2026-W33',
      claimedWeekKey: null,
    });
    expect(tier3.progress).toBe(20000);
    expect(tier3.tier).toBe(3);
    expect(tier3.nextTierGoal).toBeNull();
    expect(tier3.percent).toBe(100);
  });

  it('canClaim requires eligibility AND at least tier 1 reached AND not already claimed', () => {
    const notEligibleDays = buildWeeklyChestModel({
      friends: tier1Friends(),
      myDays: 4, // below FRIENDS_CHEST_MIN_DAYS
      myWeeklyXp: 1000,
      weekKey: '2026-W33',
      claimedWeekKey: null,
    });
    expect(notEligibleDays.canClaim).toBe(false);
    expect(notEligibleDays.state).toBe('active');

    const notEligibleXp = buildWeeklyChestModel({
      friends: tier1Friends(),
      myDays: 5,
      myWeeklyXp: 500, // below FRIENDS_CHEST_MIN_WEEKLY_XP
      weekKey: '2026-W33',
      claimedWeekKey: null,
    });
    expect(notEligibleXp.canClaim).toBe(false);

    const zeroTier = buildWeeklyChestModel({
      friends: [],
      myDays: 5,
      myWeeklyXp: 1000,
      weekKey: '2026-W33',
      claimedWeekKey: null,
    });
    expect(zeroTier.canClaim).toBe(false);
    expect(zeroTier.state).toBe('locked');

    // зачем: сундук открывается только в воскресенье — до этого кнопки нет.
    const weekday = buildWeeklyChestModel({
      friends: tier1Friends(),
      myDays: 5,
      myWeeklyXp: 1000,
      weekKey: '2026-W33',
      claimedWeekKey: null,
      isClaimDay: false,
    });
    expect(weekday.canClaim).toBe(false);
    expect(weekday.state).toBe('active');

    const ready = buildWeeklyChestModel({
      friends: tier1Friends(),
      myDays: 5,
      myWeeklyXp: 1000,
      weekKey: '2026-W33',
      claimedWeekKey: null,
      isClaimDay: true,
    });
    expect(ready.canClaim).toBe(true);
    expect(ready.state).toBe('ready');

    const claimed = buildWeeklyChestModel({
      friends: tier1Friends(),
      myDays: 5,
      myWeeklyXp: 1000,
      weekKey: '2026-W33',
      claimedWeekKey: '2026-W33',
      isClaimDay: true,
    });
    expect(claimed.canClaim).toBe(false);
    expect(claimed.state).toBe('claimed');
  });

  it('multiplier follows my active days this week (5→1, 6→1.25, 7→1.5)', () => {
    const at5 = buildWeeklyChestModel({
      friends: [friend('a', 10000, 2)],
      myDays: 5,
      myWeeklyXp: 1000,
      weekKey: '2026-W33',
      claimedWeekKey: null,
    });
    expect(at5.multiplier).toBe(1);

    const at6 = buildWeeklyChestModel({
      friends: [friend('a', 10000, 2)],
      myDays: 6,
      myWeeklyXp: 1000,
      weekKey: '2026-W33',
      claimedWeekKey: null,
    });
    expect(at6.multiplier).toBe(1.25);

    const at7 = buildWeeklyChestModel({
      friends: [friend('a', 10000, 2)],
      myDays: 7,
      myWeeklyXp: 1000,
      weekKey: '2026-W33',
      claimedWeekKey: null,
    });
    expect(at7.multiplier).toBe(1.5);
  });

  it('topContributors returns at most 3, sorted by contribution desc', () => {
    const model = buildWeeklyChestModel({
      friends: [friend('low', 100, 2), friend('high', 2000, 2), friend('mid', 1000, 2), friend('extra', 500, 2)],
      myDays: 5,
      myWeeklyXp: 1000,
      weekKey: '2026-W33',
      claimedWeekKey: null,
    });
    expect(model.topContributors.map((c) => c.uid)).toEqual(['high', 'mid', 'extra']);
  });
});
