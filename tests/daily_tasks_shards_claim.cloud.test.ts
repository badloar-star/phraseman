import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { claimDailyTasksAllShardsReward, loadShardsFromCloud } from '../app/shards_system';

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
    expect(mockStorage.shards_balance).toBe('9');

    await expect(claimDailyTasksAllShardsReward('2026-08-10')).resolves.toBe(false);
    expect(mockStorage.shards_balance).toBe('9');
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

describe('loadShardsFromCloud balance freshness', () => {
  it('does not restore an older cloud balance over a newer local spend', async () => {
    const fs = firestore as any;
    fs.__testState.userDocExists = true;
    fs.__testState.userShards = 100;
    fs.__testState.userShardsUpdatedAtMs = 1_000;
    fs.__testState.userShardsUpdatedOp = 'earn';
    fs.__testState.userShardsUpdatedReason = 'legacy';

    mockStorage.shards_balance = '50';
    mockStorage.shards_balance_meta_v1 = JSON.stringify({
      updatedAtMs: 2_000,
      op: 'spend',
      reason: 'card_pack',
    });

    await loadShardsFromCloud();

    expect(mockStorage.shards_balance).toBe('50');
    expect(fs.__testState.userShards).toBe(50);
    expect(fs.__testState.userShardsUpdatedOp).toBe('spend');
  });

  it('applies a newer cloud balance to local storage', async () => {
    const fs = firestore as any;
    fs.__testState.userDocExists = true;
    fs.__testState.userShards = 20;
    fs.__testState.userShardsUpdatedAtMs = 3_000;
    fs.__testState.userShardsUpdatedOp = 'spend';
    fs.__testState.userShardsUpdatedReason = 'lesson_replay';

    mockStorage.shards_balance = '50';
    mockStorage.shards_balance_meta_v1 = JSON.stringify({
      updatedAtMs: 2_000,
      op: 'earn',
      reason: 'lesson_perfect',
    });

    await loadShardsFromCloud();

    expect(mockStorage.shards_balance).toBe('20');
    expect(JSON.parse(mockStorage.shards_balance_meta_v1).updatedAtMs).toBe(3_000);
  });
});
