import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { claimDailyTasksAllShardsReward } from '../app/shards_system';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => 'uid-1'),
}));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  (firestore as any).__resetTestState?.();
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
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
});

describe('claimDailyTasksAllShardsReward (Firestore transaction)', () => {
  it('commits claim + balance once; second call is no-op', async () => {
    const fs = firestore as any;
    fs.__testState.rewardClaimExists = false;
    fs.__testState.userDocExists = true;
    fs.__testState.userShards = 4;

    mockStorage.shards_balance = '2';

    await expect(claimDailyTasksAllShardsReward('2026-08-10')).resolves.toBe(true);
    expect(mockStorage['daily_tasks_all_shards_2026-08-10']).toBe('1');
    expect(mockStorage.shards_balance).toBe('5');

    await expect(claimDailyTasksAllShardsReward('2026-08-10')).resolves.toBe(false);
    expect(mockStorage.shards_balance).toBe('5');
  });

  it('returns false when reward claim already exists on server', async () => {
    const fs = firestore as any;
    fs.__testState.rewardClaimExists = true;
    fs.__testState.userDocExists = true;
    fs.__testState.userShards = 10;

    mockStorage.shards_balance = '1';

    await expect(claimDailyTasksAllShardsReward('2026-08-11')).resolves.toBe(false);
    expect(mockStorage['daily_tasks_all_shards_2026-08-11']).toBeUndefined();
    expect(mockStorage.shards_balance).toBe('1');
  });
});
