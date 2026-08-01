import AsyncStorage from '@react-native-async-storage/async-storage';
import { __resetAccountGenerationForTests, beginAccountGeneration } from '../app/account_generation';
import {
  getShardsBalance,
  refreshShardsBalanceFromCloudAuthoritative,
  replaceShardsBalanceLocal,
} from '../app/shards_system';

const mockGetServerDoc = jest.fn();

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn(async () => 'wallet-owner') }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({ get: mockGetServerDoc })),
    })),
  })),
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

describe('authoritative tournament wallet reconciliation', () => {
  it('uses the newer document version when deployed leave has a stale shard version', async () => {
    await replaceShardsBalanceLocal(5, { updatedAtMs: 150, op: 'spend', reason: 'tournament_entry_server' });
    mockGetServerDoc.mockResolvedValue({
      data: () => ({ shards: 8, shards_updated_at_ms: 100, updatedAt: 200 }),
    });

    await expect(refreshShardsBalanceFromCloudAuthoritative()).resolves.toBe(8);
    await expect(getShardsBalance()).resolves.toBe(8);
    expect(JSON.parse(storage.shards_balance_meta_v1)).toMatchObject({
      updatedAtMs: 200,
      reason: 'tournament_server_reconcile',
    });
  });

  it('keeps the dedicated shard version when it is newer', async () => {
    mockGetServerDoc.mockResolvedValue({
      data: () => ({ shards: 7, shards_updated_at_ms: 300, updatedAt: 200 }),
    });

    await expect(refreshShardsBalanceFromCloudAuthoritative()).resolves.toBe(7);
    expect(JSON.parse(storage.shards_balance_meta_v1).updatedAtMs).toBe(300);
  });

  it('refuses an older authoritative snapshot when the local wallet is newer', async () => {
    await replaceShardsBalanceLocal(11, { updatedAtMs: 400, op: 'earn', reason: 'newer_local' });
    mockGetServerDoc.mockResolvedValue({
      data: () => ({ shards: 2, shards_updated_at_ms: 300, updatedAt: 200 }),
    });

    await expect(refreshShardsBalanceFromCloudAuthoritative()).resolves.toBeNull();
    await expect(getShardsBalance()).resolves.toBe(11);
    expect(JSON.parse(storage.shards_balance_meta_v1)).toMatchObject({
      updatedAtMs: 400,
      reason: 'newer_local',
    });
  });

  it('refuses an unversioned snapshot instead of inventing authority', async () => {
    await replaceShardsBalanceLocal(11, { updatedAtMs: 400, op: 'earn', reason: 'newer_local' });
    mockGetServerDoc.mockResolvedValue({ data: () => ({ shards: 2 }) });

    await expect(refreshShardsBalanceFromCloudAuthoritative()).resolves.toBeNull();
    await expect(getShardsBalance()).resolves.toBe(11);
  });
});
