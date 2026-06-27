import AsyncStorage from '@react-native-async-storage/async-storage';
import { addShardsRaw, awardOneTime, getShardAchievementEligibleBalance, getShardsBalance, replaceShardsBalanceLocal, spendShards } from '../app/shards_system';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) =>
    Promise.resolve(mockStorage[k] ?? null)
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((k: string, v: string) => {
    mockStorage[k] = v;
    return Promise.resolve();
  });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation((pairs: Array<[string, string]>) => {
    for (const [k, v] of pairs) mockStorage[k] = v;
    return Promise.resolve();
  });
});

describe('shards_system guards and one-time awards', () => {
  it('rejects non-positive spend values', async () => {
    mockStorage.shards_balance = '10';
    await expect(spendShards(0)).resolves.toBe(false);
    await expect(spendShards(-3)).resolves.toBe(false);
    await expect(spendShards(Number.NaN)).resolves.toBe(false);
    await expect(getShardsBalance()).resolves.toBe(10);
  });

  it('does not allow spending above balance', async () => {
    mockStorage.shards_balance = '2';
    await expect(spendShards(3)).resolves.toBe(false);
    await expect(getShardsBalance()).resolves.toBe(2);
  });

  it('awards one-time source only once', async () => {
    await expect(awardOneTime('diagnostic_test')).resolves.toBe(1);
    await expect(awardOneTime('diagnostic_test')).resolves.toBe(0);
    await expect(getShardsBalance()).resolves.toBe(1);
  });

  it('excludes store-purchased shards from achievement balance', async () => {
    await expect(addShardsRaw(80, 'shards_store_purchase', { skipServerAwait: true })).resolves.toBe(80);
    await expect(addShardsRaw(5, 'daily_tasks_all', { skipServerAwait: true })).resolves.toBe(5);

    await expect(getShardsBalance()).resolves.toBe(85);
    await expect(getShardAchievementEligibleBalance()).resolves.toBe(5);
  });

  it('does not keep spent store shards excluded forever', async () => {
    await expect(addShardsRaw(80, 'shards_store_purchase', { skipServerAwait: true })).resolves.toBe(80);
    await expect(spendShards(80, 'card_pack')).resolves.toBe(true);
    await expect(addShardsRaw(100, 'daily_tasks_all', { skipServerAwait: true })).resolves.toBe(100);

    await expect(getShardsBalance()).resolves.toBe(100);
    await expect(getShardAchievementEligibleBalance()).resolves.toBe(100);
  });

  it('ignores an older server replace over a newer local shard operation', async () => {
    mockStorage.shards_balance = '80';
    mockStorage.shards_balance_meta_v1 = JSON.stringify({
      updatedAtMs: 2_000,
      op: 'earn',
      reason: 'daily_tasks_all',
    });

    await replaceShardsBalanceLocal(30, {
      updatedAtMs: 1_000,
      op: 'earn',
      reason: 'friend_quest_reward',
    });

    await expect(getShardsBalance()).resolves.toBe(80);
    expect(JSON.parse(mockStorage.shards_balance_meta_v1).updatedAtMs).toBe(2_000);
  });

  it('applies a newer server replace even when the balance decreases after a spend', async () => {
    mockStorage.shards_balance = '80';
    mockStorage.shards_balance_meta_v1 = JSON.stringify({
      updatedAtMs: 2_000,
      op: 'earn',
      reason: 'daily_tasks_all',
    });

    await replaceShardsBalanceLocal(30, {
      updatedAtMs: 3_000,
      op: 'spend',
      reason: 'friend_gift',
    });

    await expect(getShardsBalance()).resolves.toBe(30);
    expect(JSON.parse(mockStorage.shards_balance_meta_v1)).toMatchObject({
      updatedAtMs: 3_000,
      op: 'spend',
      reason: 'friend_gift',
    });
  });
});
