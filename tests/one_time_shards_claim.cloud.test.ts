import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { awardOneTime, claimReferralSpinPearls, SHARD_REWARDS } from '../app/shards_system';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
jest.mock('../app/stable_id', () => ({ getStableId: jest.fn(async () => 'uid-1') }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  (firestore as any).__resetTestState?.();
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => mockStorage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    mockStorage[key] = value;
  });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: readonly (readonly [string, string])[]) => {
    pairs.forEach(([key, value]) => { mockStorage[key] = value; });
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    delete mockStorage[key];
  });
  __resetAccountGenerationForTests();
  beginAccountGeneration('uid-1');
  SHARD_REWARDS.exam_excellent = 3;
  SHARD_REWARDS.diagnostic_test = 1;
});

afterEach(() => {
  SHARD_REWARDS.exam_excellent = 0;
  SHARD_REWARDS.diagnostic_test = 0;
});

describe('client-authoritative one-time rewards', () => {
  it('commits the result and credit locally once without a Firestore balance transaction', async () => {
    await expect(awardOneTime('exam_excellent')).resolves.toBe(3);
    await expect(awardOneTime('exam_excellent')).resolves.toBe(0);

    expect(mockStorage.shards_balance).toBe('3');
    expect(JSON.parse(mockStorage.shards_one_time_events)).toContain('exam_excellent');
    expect((firestore as any).__testState.runTransactionCalls).toBe(0);
    expect(Object.keys(mockStorage).some((key) => key.includes('one-time:exam_excellent'))).toBe(true);
  });

  it('honors an existing local marker without asking the server for permission', async () => {
    mockStorage.shards_balance = '7';
    mockStorage.shards_one_time_events = JSON.stringify(['diagnostic_test']);

    await expect(awardOneTime('diagnostic_test')).resolves.toBe(0);

    expect(mockStorage.shards_balance).toBe('7');
    expect((firestore as any).__testState.runTransactionCalls).toBe(0);
  });

  it('cannot finish an account A reward after the active account changes to B', async () => {
    beginAccountGeneration('uid-1');
    let releaseRead!: () => void;
    const blocked = new Promise<void>((resolve) => { releaseRead = resolve; });
    (AsyncStorage.getItem as jest.Mock).mockImplementationOnce(async (key: string) => {
      await blocked;
      return mockStorage[key] ?? null;
    });

    const request = awardOneTime('exam_excellent');
    await Promise.resolve();
    beginAccountGeneration('uid-2');
    releaseRead();

    await expect(request).resolves.toBe(0);
    expect(mockStorage.shards_balance).toBeUndefined();
    expect((firestore as any).__testState.runTransactionCalls).toBe(0);
  });

  it('applies a server-confirmed referral event idempotently without writing users.shards', async () => {
    await expect(claimReferralSpinPearls('request-12345678', 2)).resolves.toBe(2);
    await expect(claimReferralSpinPearls('request-12345678', 2)).resolves.toBe(0);

    expect(mockStorage.shards_balance).toBe('2');
    expect((firestore as any).__testState.runTransactionCalls).toBe(0);
    expect((firestore as any).__testState.userShards).toBe(0);
  });
});
