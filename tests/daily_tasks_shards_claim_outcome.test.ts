const mockCallable = jest.fn();

jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: true,
  IS_EXPO_GO: false,
}));

jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => 'stable-abc-123'),
}));

jest.mock('@react-native-firebase/functions', () => ({
  __esModule: true,
  getFunctions: () => ({}),
  httpsCallable: () => mockCallable,
}));

jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  getApp: () => ({}),
}));

jest.mock('../app/debug-logger', () => ({
  DebugLogger: { error: jest.fn(), log: jest.fn(), warn: jest.fn() },
}));

jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/lifetime_profile_stats', () => ({
  bumpLifetimeShardsEarned: jest.fn(),
  bumpLifetimeShardsSpent: jest.fn(),
}));
jest.mock('../app/storage_mutex', () => ({
  withStorageLock: jest.fn(async (fn: () => Promise<unknown>) => fn()),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  claimDailyTasksAllShardsRewardDetailed,
  resumePendingDailyTasksAllShardsClaims,
  SHARD_REWARDS,
} from '../app/shards_system';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';

const DAY = '2026-06-21';
const REWARD_KEY = `daily_tasks_all_shards_${DAY}`;
const PENDING_KEY = `daily_tasks_all_shards_pending_${DAY}`;

const flushAsync = async (turns = 6) => {
  for (let i = 0; i < turns; i += 1) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
};

beforeEach(async () => {
  mockCallable.mockReset();
  __resetAccountGenerationForTests();
  beginAccountGeneration('stable-abc-123');
  await AsyncStorage.clear();
  // Экономика «Монеты и Звёзды» (docs/plans/2026-07-20) обнулила игровые начисления
  // монет (в проде daily_tasks_all = 0). Тесты проверяют механику claim, а не каталог,
  // поэтому поднимаем награду до 1, как было до миграции.
  SHARD_REWARDS.daily_tasks_all = 1;
});

afterEach(() => {
  SHARD_REWARDS.daily_tasks_all = 0;
});

describe('claimDailyTasksAllShardsRewardDetailed', () => {
  it('alreadyClaimed from the server still resolves optimistically and then reconciles', async () => {
    mockCallable.mockResolvedValue({ data: { alreadyClaimed: true, newBalance: 42 } });

    const outcome = await claimDailyTasksAllShardsRewardDetailed(DAY);

    expect(outcome).toBe('granted');
    expect(await AsyncStorage.getItem(REWARD_KEY)).toBe('1');
    expect(await AsyncStorage.getItem(PENDING_KEY)).toBe('1');
    expect(await AsyncStorage.getItem('shards_balance')).toBe('1');

    await flushAsync();
    expect(await AsyncStorage.getItem('shards_balance')).toBe('42');
    expect(await AsyncStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('real server grant keeps the optimistic outcome and later mirrors the server balance', async () => {
    mockCallable.mockResolvedValue({ data: { alreadyClaimed: false, newBalance: 10 } });

    const outcome = await claimDailyTasksAllShardsRewardDetailed(DAY);

    expect(outcome).toBe('granted');
    expect(await AsyncStorage.getItem(REWARD_KEY)).toBe('1');
    expect(await AsyncStorage.getItem('shards_balance')).toBe('1');

    await flushAsync();
    expect(await AsyncStorage.getItem('shards_balance')).toBe('10');
    expect(await AsyncStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('passes stableId to the Cloud Function in the background payload', async () => {
    mockCallable.mockResolvedValue({ data: { alreadyClaimed: false, newBalance: 1 } });

    await claimDailyTasksAllShardsRewardDetailed(DAY);
    await flushAsync();

    expect(mockCallable).toHaveBeenCalledWith(
      expect.objectContaining({ dayKey: DAY, stableId: 'stable-abc-123' }),
    );
  });

  it('keeps the optimistic local claim pending when the Cloud Function fails', async () => {
    mockCallable.mockRejectedValue(new Error('network'));

    const outcome = await claimDailyTasksAllShardsRewardDetailed(DAY);

    expect(outcome).toBe('granted');
    expect(await AsyncStorage.getItem(REWARD_KEY)).toBe('1');
    expect(await AsyncStorage.getItem(PENDING_KEY)).toBe('1');
    expect(await AsyncStorage.getItem('shards_balance')).toBe('1');

    await flushAsync();
    expect(await AsyncStorage.getItem(REWARD_KEY)).toBe('1');
    expect(await AsyncStorage.getItem(PENDING_KEY)).toBe('1');
  });

  it('repeat call after successful sync returns "already" without a second Cloud Function call', async () => {
    mockCallable.mockResolvedValue({ data: { alreadyClaimed: false, newBalance: 5 } });
    await claimDailyTasksAllShardsRewardDetailed(DAY);
    await flushAsync();
    mockCallable.mockClear();

    const outcome = await claimDailyTasksAllShardsRewardDetailed(DAY);
    await flushAsync();

    expect(outcome).toBe('already');
    expect(mockCallable).not.toHaveBeenCalled();
  });

  it('resumes pending optimistic claims later without another user action', async () => {
    mockCallable.mockRejectedValueOnce(new Error('offline'));
    await claimDailyTasksAllShardsRewardDetailed(DAY);
    await flushAsync();
    expect(await AsyncStorage.getItem(PENDING_KEY)).toBe('1');

    mockCallable.mockReset();
    mockCallable.mockResolvedValue({ data: { alreadyClaimed: false, newBalance: 8 } });

    await expect(resumePendingDailyTasksAllShardsClaims()).resolves.toEqual({ resolved: 1, pending: 0 });
    expect(mockCallable).toHaveBeenCalledWith(
      expect.objectContaining({ dayKey: DAY, stableId: 'stable-abc-123' }),
    );
    expect(await AsyncStorage.getItem(PENDING_KEY)).toBeNull();
    expect(await AsyncStorage.getItem('shards_balance')).toBe('8');
  });
});
