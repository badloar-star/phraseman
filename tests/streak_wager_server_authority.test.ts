import AsyncStorage from '@react-native-async-storage/async-storage';
import { beginAccountGeneration } from '../app/account_generation';
import { placeWager } from '../app/streak_wager';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn().mockResolvedValue('account-a') }));
const mockCompositeCommit = jest.fn();
jest.mock('../app/shards_system', () => ({
  commitShardCompositeOperation: (...args: unknown[]) => mockCompositeCommit(...args),
  addShardsRaw: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../app/xp_manager', () => ({ registerXP: jest.fn().mockResolvedValue({ finalDelta: 0 }) }));
jest.mock('../app/premium_guard', () => ({ getVerifiedPremiumStatus: jest.fn().mockResolvedValue(false) }));
jest.mock('../app/app_activity', () => ({ trackActivity: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../app/app_health', () => ({ logAppWarning: jest.fn().mockResolvedValue(undefined) }));

const storage: Record<string, string> = {};
beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  beginAccountGeneration('account-a');
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => { storage[key] = value; });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => { delete storage[key]; });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    for (const [key, value] of pairs) storage[key] = value;
  });
  (AsyncStorage.multiRemove as jest.Mock).mockImplementation(async (keys: string[]) => {
    for (const key of keys) delete storage[key];
  });
  mockCompositeCommit.mockImplementation(async (input: { localWrites: [string, string][] }) => {
    for (const [key, value] of input.localWrites) storage[key] = value;
    return { status: 'applied', balanceBefore: 20, balanceAfter: 17 };
  });
});

test('commits the wager state as the exact result of one local debit', async () => {
  await expect(placeWager(12, 3)).resolves.toBe(true);
  expect(mockCompositeCommit).toHaveBeenCalledWith(expect.objectContaining({
    amount: 5,
    reason: 'wager_bet',
    grant: expect.objectContaining({ kind: 'streak_wager' }),
  }));
  expect(JSON.parse(storage.streak_wager_v2)).toMatchObject({ tierIdx: 3, betShards: 5 });
});

test('consumes the exact local voucher count in the same composite operation', async () => {
  storage.wager_discount = '0.25';
  storage.wager_discount_uses_v1 = '9';
  await expect(placeWager(12, 3)).resolves.toBe(true);
  expect(storage.wager_discount).toBe('0.25');
  expect(storage.wager_discount_uses_v1).toBe('8');
});
