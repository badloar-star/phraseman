import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  computeReviveCost,
  getReviveCostPerLostStreakDay,
  markStreakLost,
  getReviveOffer,
  reviveStreak,
  dismissReviveOffer,
  REVIVE_WINDOW_MS,
} from '../app/streak_revive';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/lifetime_profile_stats', () => ({
  bumpLifetimeShardsEarned: jest.fn(),
  bumpLifetimeShardsSpent: jest.fn(),
}));

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) =>
    Promise.resolve(mockStorage[k] ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((k: string, v: string) => {
    mockStorage[k] = v;
    return Promise.resolve();
  });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation((pairs: Array<[string, string]>) => {
    for (const [k, v] of pairs) mockStorage[k] = v;
    return Promise.resolve();
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((k: string) => {
    delete mockStorage[k];
    return Promise.resolve();
  });
});

describe('streak_revive — cost ladder', () => {
  it('starts at 15 total shards and reaches 100 total shards at 100 lost streak days', () => {
    expect(computeReviveCost(0)).toBe(15);
    expect(computeReviveCost(1)).toBe(15);
    expect(computeReviveCost(10)).toBe(23);
    expect(computeReviveCost(25)).toBe(36);
    expect(computeReviveCost(50)).toBe(57);
    expect(computeReviveCost(75)).toBe(79);
    expect(computeReviveCost(100)).toBe(100);
    expect(computeReviveCost(150)).toBe(100);
  });

  it('makes the average per-day price cheaper as the lost streak gets closer to 100 days', () => {
    expect(getReviveCostPerLostStreakDay(0)).toBe(15);
    expect(getReviveCostPerLostStreakDay(1)).toBe(15);
    expect(getReviveCostPerLostStreakDay(10)).toBe(2.3);
    expect(getReviveCostPerLostStreakDay(25)).toBe(1.4);
    expect(getReviveCostPerLostStreakDay(50)).toBe(1.1);
    expect(getReviveCostPerLostStreakDay(75)).toBe(1.1);
    expect(getReviveCostPerLostStreakDay(100)).toBe(1);
  });

  it('grows total price monotonically until the 100-shard ceiling', () => {
    const points = [1, 10, 25, 50, 75, 100, 150];
    let prev = 0;
    for (const s of points) {
      const c = computeReviveCost(s);
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
  });

  it('keeps 100+ day streaks at 100 total shards', () => {
    expect(computeReviveCost(100)).toBe(100);
    expect(computeReviveCost(200)).toBe(100);
    expect(computeReviveCost(365)).toBe(100);
    expect(computeReviveCost(10_000)).toBe(100);
  });

  it('matches known ladder values', () => {
    expect(computeReviveCost(1)).toBe(15);
    expect(computeReviveCost(10)).toBe(23);
    expect(computeReviveCost(25)).toBe(36);
    expect(computeReviveCost(40)).toBe(48);
    expect(computeReviveCost(50)).toBe(57);
    expect(computeReviveCost(60)).toBe(66);
    expect(computeReviveCost(100)).toBe(100);
  });
});

describe('streak_revive — offer lifecycle', () => {
  it('does not create offer for streak < 2', async () => {
    await markStreakLost(1);
    const o = await getReviveOffer();
    expect(o).toBeNull();
  });

  it('creates offer with correct cost for streaks >= 2', async () => {
    await markStreakLost(47);
    const o = await getReviveOffer();
    expect(o).not.toBeNull();
    expect(o?.lostStreak).toBe(47);
    expect(o?.costShards).toBe(54);
  });

  it('expires after REVIVE_WINDOW_MS', async () => {
    const past = Date.now() - REVIVE_WINDOW_MS - 1000;
    mockStorage['streak_revive_v1'] = JSON.stringify({
      lostStreak: 30,
      lostAt: past,
      used: false,
    });
    const o = await getReviveOffer();
    expect(o).toBeNull();
  });

  it('dismiss marks offer as used', async () => {
    await markStreakLost(20);
    await dismissReviveOffer();
    const o = await getReviveOffer();
    expect(o).toBeNull();
  });

  it('does not downgrade offer when already-active higher streak exists', async () => {
    await markStreakLost(100);
    await markStreakLost(5);
    const o = await getReviveOffer();
    expect(o?.lostStreak).toBe(100);
  });
});

describe('streak_revive — reviveStreak', () => {
  it('fails with no_offer if there is no active offer', async () => {
    const r = await reviveStreak();
    expect(r.ok).toBe(false);
    expect((r as { reason: string }).reason).toBe('no_offer');
  });

  it('fails with insufficient_shards when balance < cost', async () => {
    mockStorage.shards_balance = '2';
    await markStreakLost(30); // cost = 40
    const r = await reviveStreak();
    expect(r.ok).toBe(false);
    expect((r as { reason: string }).reason).toBe('insufficient_shards');
  });

  it('on success: spends shards, restores streak_count, sets last_active to yesterday', async () => {
    mockStorage.shards_balance = '50';
    await markStreakLost(30); // cost = 40
    const r = await reviveStreak();
    expect(r.ok).toBe(true);
    expect((r as { restoredStreak: number }).restoredStreak).toBe(30);
    expect((r as { spent: number }).spent).toBe(40);
    expect(mockStorage.shards_balance).toBe('10');
    expect(mockStorage.streak_count).toBe('30');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(mockStorage.last_active_date).toBe(yesterday.toISOString().split('T')[0]);
  });

  it('cannot be revived twice (offer marked used after revive)', async () => {
    mockStorage.shards_balance = '100';
    await markStreakLost(10);
    const first = await reviveStreak();
    expect(first.ok).toBe(true);
    const second = await reviveStreak();
    expect(second.ok).toBe(false);
    expect((second as { reason: string }).reason).toBe('no_offer');
  });
});
