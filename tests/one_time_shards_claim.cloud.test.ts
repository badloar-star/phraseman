import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { awardOneTime, claimReferralSpinPearls, SHARD_REWARDS } from '../app/shards_system';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';
import { getCanonicalUserId } from '../app/user_id_policy';

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
  __resetAccountGenerationForTests();
  beginAccountGeneration('uid-1');
  (getCanonicalUserId as jest.Mock).mockResolvedValue('uid-1');
  SHARD_REWARDS.exam_excellent = 3;
  SHARD_REWARDS.diagnostic_test = 1;
});

afterEach(() => {
  SHARD_REWARDS.exam_excellent = 0;
  SHARD_REWARDS.diagnostic_test = 0;
});

describe('awardOneTime (Firestore claim)', () => {
  it('does not enter Firestore when account A changes while canonical uid is resolving', async () => {
    let releaseUid!: (value: string | null) => void;
    (getCanonicalUserId as jest.Mock).mockReturnValueOnce(new Promise((resolve) => { releaseUid = resolve; }));
    beginAccountGeneration('account-a');

    const request = awardOneTime('exam_excellent');
    for (let i = 0; i < 20 && (getCanonicalUserId as jest.Mock).mock.calls.length === 0; i += 1) await Promise.resolve();
    beginAccountGeneration('account-b');
    releaseUid('account-a');

    await expect(request).resolves.toBe(0);
    expect((firestore as any).__testState.runTransactionCalls).toBe(0);
    expect(mockStorage.shards_balance).toBeUndefined();
  });

  it('does not commit a cloud award when account A changes during the transaction read', async () => {
    let releaseGet!: () => void;
    (firestore as any).__testState.transactionGetBarrier = new Promise<void>((resolve) => { releaseGet = resolve; });
    beginAccountGeneration('account-a');
    (getCanonicalUserId as jest.Mock).mockResolvedValue('account-a');

    const request = awardOneTime('exam_excellent');
    for (let i = 0; i < 20 && (firestore as any).__testState.runTransactionCalls === 0; i += 1) await Promise.resolve();
    beginAccountGeneration('account-b');
    releaseGet();

    await expect(request).resolves.toBe(0);
    expect((firestore as any).__testState.rewardClaimExists).toBe(false);
    expect((firestore as any).__testState.userShards).toBe(0);
    expect(mockStorage.shards_balance).toBeUndefined();
  });

  it('does not mirror a referral award into B after A transaction committed', async () => {
    let releaseTransaction!: () => void;
    const fs = firestore as any;
    fs.__testState.transactionReturnBarrier = new Promise<void>((resolve) => { releaseTransaction = resolve; });
    fs.__testState.userShards = 5;
    beginAccountGeneration('account-a');
    (getCanonicalUserId as jest.Mock).mockResolvedValue('account-a');

    const request = claimReferralSpinPearls('request-12345678', 2);
    for (let i = 0; i < 20 && !fs.__testState.rewardClaimExists; i += 1) await Promise.resolve();
    expect(fs.__testState.rewardClaimExists).toBe(true);
    beginAccountGeneration('account-b');
    releaseTransaction();

    await expect(request).resolves.toBe(0);
    expect(fs.__testState.userDocPaths).toContain('users/account-a');
    expect(mockStorage.shards_balance).toBeUndefined();
  });
  it('awards exam_excellent once across devices', async () => {
    const fs = firestore as any;
    fs.__testState.rewardClaimExists = false;
    fs.__testState.userDocExists = true;
    fs.__testState.userShards = 10;
    mockStorage.shards_balance = '4';

    await expect(awardOneTime('exam_excellent')).resolves.toBe(3);
    expect(mockStorage.shards_balance).toBe('13');
    expect(JSON.parse(mockStorage.shards_one_time_events)).toContain('exam_excellent');
    expect(fs.__testState.rewardClaimExists).toBe(true);
    expect(fs.__testState.userShards).toBe(13);

    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    mockStorage.shards_balance = '0';

    await expect(awardOneTime('exam_excellent')).resolves.toBe(0);
    expect(mockStorage.shards_balance).toBe('0');
    expect(JSON.parse(mockStorage.shards_one_time_events)).toContain('exam_excellent');
  });

  it('migrates an existing local one-time marker to cloud without awarding again', async () => {
    const fs = firestore as any;
    fs.__testState.rewardClaimExists = false;
    fs.__testState.userDocExists = true;
    fs.__testState.userShards = 7;
    mockStorage.shards_balance = '7';
    mockStorage.shards_one_time_events = JSON.stringify(['diagnostic_test']);

    await expect(awardOneTime('diagnostic_test')).resolves.toBe(0);
    expect(mockStorage.shards_balance).toBe('7');
    expect(fs.__testState.rewardClaimExists).toBe(true);
    expect(fs.__testState.userShards).toBe(7);
  });

  it('does not let an older cloud claim mirror overwrite a newer local wallet', async () => {
    const fs = firestore as any;
    fs.__testState.rewardClaimExists = false;
    fs.__testState.userDocExists = true;
    fs.__testState.userShards = 10;
    mockStorage.shards_balance = '80';
    mockStorage.shards_balance_meta_v1 = JSON.stringify({
      updatedAtMs: 9_000_000_000_000,
      op: 'earn',
      reason: 'newer_local_reward',
    });

    await expect(awardOneTime('exam_excellent')).resolves.toBe(3);

    expect(mockStorage.shards_balance).toBe('80');
    expect(JSON.parse(mockStorage.shards_one_time_events)).toContain('exam_excellent');
    expect(fs.__testState.rewardClaimExists).toBe(true);
    expect(fs.__testState.userShards).toBe(83);
  });
});
