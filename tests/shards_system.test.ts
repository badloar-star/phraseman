import AsyncStorage from '@react-native-async-storage/async-storage';
import { addShardsRaw, awardOneTime, getShardAchievementEligibleBalance, getShardsBalance, spendShards } from '../app/shards_system';

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
});
