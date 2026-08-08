import AsyncStorage from '@react-native-async-storage/async-storage';
import { httpsCallable } from '@react-native-firebase/functions';
import { beginAccountGeneration } from '../app/account_generation';
import { placeWager } from '../app/streak_wager';
import { replaceShardsBalanceLocalWithOutcomeWhileAccountTransitionLocked } from '../app/shards_system';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(),
}));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn().mockResolvedValue('account-a') }));
jest.mock('../app/shards_system', () => ({
  replaceShardsBalanceLocalWithOutcomeWhileAccountTransitionLocked: jest.fn().mockResolvedValue('applied'),
  addShardsRaw: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../app/xp_manager', () => ({ registerXP: jest.fn().mockResolvedValue({ finalDelta: 0 }) }));
jest.mock('../app/premium_guard', () => ({ getVerifiedPremiumStatus: jest.fn().mockResolvedValue(false) }));
jest.mock('../app/app_activity', () => ({ trackActivity: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../app/app_health', () => ({ logAppWarning: jest.fn().mockResolvedValue(undefined) }));

const storage: Record<string, string> = {};
const receipt = {
  ok: true,
  alreadyApplied: false,
  balanceAfter: 17,
  shardsUpdatedAtMs: 1234,
  wagerDiscountCountAfter: 0,
  wager: {
    active: true,
    startDate: '2026-08-08',
    startStreak: 12,
    tierIdx: 3,
    betShards: 3,
    daysRequired: 30,
    rewardShards: 0,
    rewardXP: 4000,
    daysKept: 0,
    lastChecked: '2026-08-08',
    result: 'pending',
    placementId: 'wager_abcdefgh',
  },
};

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
});

test('uses a durable account-scoped key and replays a lost response without local spend fallback', async () => {
  const invoke = jest.fn()
    .mockRejectedValueOnce(new Error('internal after commit'))
    .mockResolvedValueOnce({ data: { ...receipt, alreadyApplied: true } });
  (httpsCallable as jest.Mock).mockReturnValue(invoke);

  await expect(placeWager(12, 3)).resolves.toBe(false);
  const pendingKey = Object.keys(storage).find((key) => key.startsWith('streak_wager_pending_place_v1::account-a'));
  expect(pendingKey).toBeDefined();
  const firstIdempotencyKey = storage[pendingKey!];

  await expect(placeWager(12, 3)).resolves.toBe(true);
  expect(invoke).toHaveBeenCalledTimes(2);
  expect(invoke.mock.calls[0][0].idempotencyKey).toBe(firstIdempotencyKey);
  expect(invoke.mock.calls[1][0].idempotencyKey).toBe(firstIdempotencyKey);
  expect(storage[pendingKey!]).toBeUndefined();
  expect(JSON.parse(storage.streak_wager_v2)).toMatchObject({ placementId: 'wager_abcdefgh', betShards: 3 });
  expect(replaceShardsBalanceLocalWithOutcomeWhileAccountTransitionLocked).toHaveBeenCalledWith(
    17,
    expect.objectContaining({ stableId: 'account-a' }),
    expect.objectContaining({ updatedAtMs: 1234, op: 'spend', reason: 'wager_bet' }),
  );
});

test('hydrates the exact server voucher count and rejects malformed receipts without clearing retry state', async () => {
  storage.wager_discount = '0.25';
  storage.wager_discount_uses_v1 = '9';
  const invoke = jest.fn().mockResolvedValue({ data: { ...receipt, wagerDiscountCountAfter: 1 } });
  (httpsCallable as jest.Mock).mockReturnValue(invoke);

  await expect(placeWager(12, 3)).resolves.toBe(true);
  expect(storage.wager_discount).toBe('0.25');
  expect(storage.wager_discount_uses_v1).toBe('1');
});
