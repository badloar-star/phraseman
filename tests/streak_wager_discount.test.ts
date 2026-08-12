import AsyncStorage from '@react-native-async-storage/async-storage';
import { placeWager, loadWager } from '../app/streak_wager';
import { readWagerDiscount, WAGER_DISCOUNT_KEY } from '../app/wager_discount';
import { spendShards } from '../app/shards_system';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/premium_guard', () => ({ getVerifiedPremiumStatus: jest.fn().mockResolvedValue(false) }));
jest.mock('../app/shards_system', () => ({
  spendShards: jest.fn().mockResolvedValue(true),
  addShardsRaw: jest.fn().mockResolvedValue(0),
}));
jest.mock('../app/xp_manager', () => ({ registerXP: jest.fn().mockResolvedValue({ finalDelta: 0 }) }));
jest.mock('../app/app_activity', () => ({ trackActivity: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../app/firebase', () => ({}));
jest.mock('../app/config', () => ({
  ...jest.requireActual<typeof import('../app/config')>('../app/config'),
  IS_EXPO_GO: true,
  CLOUD_SYNC_ENABLED: false,
}));

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-05-19T12:00:00.000Z'));
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) =>
    Promise.resolve(mockStorage[k] ?? null)
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((k: string, v: string) => {
    mockStorage[k] = v;
    return Promise.resolve();
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((k: string) => {
    delete mockStorage[k];
    return Promise.resolve();
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('streak wager discount', () => {
  it('migrates legacy 25% discount to a timed discount', async () => {
    mockStorage[WAGER_DISCOUNT_KEY] = '0.25';

    const discount = await readWagerDiscount();

    expect(discount?.percent).toBe(0.25);
    expect(discount?.expiresAt).toBe(Date.now() + 24 * 60 * 60 * 1000);
    expect(JSON.parse(mockStorage[WAGER_DISCOUNT_KEY])).toMatchObject({
      percent: 0.25,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });
  });

  it('places a wager using the discounted shard cost and consumes the gift', async () => {
    mockStorage[WAGER_DISCOUNT_KEY] = JSON.stringify({
      percent: 0.25,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    const ok = await placeWager(12, 3);
    const wager = await loadWager();

    expect(ok).toBe(true);
    expect(spendShards).toHaveBeenCalledWith(3, 'wager_bet', { skipServerAwait: true });
    expect(wager?.betShards).toBe(3);
    expect(mockStorage[WAGER_DISCOUNT_KEY]).toBeUndefined();
  });
});
