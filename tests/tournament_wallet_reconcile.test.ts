import AsyncStorage from '@react-native-async-storage/async-storage';
import { __resetAccountGenerationForTests, beginAccountGeneration } from '../app/account_generation';
import {
  getShardsBalance,
  refreshShardsBalanceFromCloudAuthoritative,
  replaceShardsBalanceLocal,
} from '../app/shards_system';

const syncConfirmedExternalShardEventsFromCloud = jest.fn(async () => ({
  applied: 0,
  skipped: 0,
  invalid: 0,
}));
const firestoreCollection = jest.fn(() => {
  throw new Error('legacy users.shards reconciliation is forbidden');
});

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn(async () => 'wallet-owner') }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/economy/external_shard_event_sync', () => ({
  syncConfirmedExternalShardEventsFromCloud,
}));
jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: jest.fn(() => ({ collection: firestoreCollection })),
}));

const storage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    storage[key] = value;
  });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    for (const [key, value] of pairs) storage[key] = value;
  });
  __resetAccountGenerationForTests();
  beginAccountGeneration('wallet-owner');
});

describe('competition wallet external-event refresh', () => {
  it('imports immutable competition events and returns the client projection', async () => {
    await replaceShardsBalanceLocal(5, {
      updatedAtMs: 150,
      op: 'spend',
      reason: 'competition_external_event',
    });

    await expect(refreshShardsBalanceFromCloudAuthoritative()).resolves.toBe(5);
    await expect(getShardsBalance()).resolves.toBe(5);
    expect(syncConfirmedExternalShardEventsFromCloud).toHaveBeenCalledTimes(1);
    expect(firestoreCollection).not.toHaveBeenCalled();
  });

  it('never installs a legacy users.shards snapshot over newer local history', async () => {
    await replaceShardsBalanceLocal(11, {
      updatedAtMs: 400,
      op: 'earn',
      reason: 'newer_local',
    });

    await expect(refreshShardsBalanceFromCloudAuthoritative()).resolves.toBe(11);
    expect(JSON.parse(storage.shards_balance_meta_v1)).toMatchObject({
      updatedAtMs: 400,
      reason: 'newer_local',
    });
    expect(firestoreCollection).not.toHaveBeenCalled();
  });
});
