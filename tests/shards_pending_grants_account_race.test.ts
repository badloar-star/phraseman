const storage = new Map<string, string>();
const mockGetItem = jest.fn(async (key: string) => storage.get(key) ?? null);
const mockSetItem = jest.fn(async (key: string, value: string) => { storage.set(key, value); });
const mockRemoveItem = jest.fn(async (key: string) => { storage.delete(key); });
const mockMultiGet = jest.fn(async (keys: string[]) => keys.map((key) => [key, storage.get(key) ?? null]));
const mockMultiSet = jest.fn(async (entries: [string, string][]) => {
  entries.forEach(([key, value]) => storage.set(key, value));
});
const getAppUserID = jest.fn(async () => 'stable-A');

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: mockGetItem,
    setItem: mockSetItem,
    removeItem: mockRemoveItem,
    multiGet: mockMultiGet,
    multiSet: mockMultiSet,
  },
}));
jest.mock('../app/storage_mutex', () => ({ withStorageLock: (work: () => Promise<unknown>) => work() }));
jest.mock('../app/debug-logger', () => ({ reportSwallowed: jest.fn(), swallowError: jest.fn(() => jest.fn()), DebugLogger: { error: jest.fn() } }));
jest.mock('react-native-purchases', () => ({ __esModule: true, default: { getAppUserID } }));

const grant = {
  journalId: 'journal-A',
  storeTransactionId: 'store-tx-A',
  productId: 'shards_100',
  expectedShards: 100,
  beforeBalance: 0,
  createdAtMs: Date.now(),
};

const envelope = (ownerStableId: string, grants = [grant]) => JSON.stringify({
  version: 2,
  ownerStableId,
  grants,
});

describe('pending shard grants v2 account ownership', () => {
  beforeEach(async () => {
    storage.clear();
    jest.clearAllMocks();
    mockGetItem.mockImplementation(async (key: string) => storage.get(key) ?? null);
    mockSetItem.mockImplementation(async (key: string, value: string) => { storage.set(key, value); });
    mockRemoveItem.mockImplementation(async (key: string) => { storage.delete(key); });
    mockMultiGet.mockImplementation(async (keys: string[]) => keys.map((key) => [key, storage.get(key) ?? null]));
    mockMultiSet.mockImplementation(async (entries: [string, string][]) => {
      entries.forEach(([key, value]) => storage.set(key, value));
    });
    const accounts = await import('../app/account_generation');
    accounts.__resetAccountGenerationForTests();
    accounts.beginAccountGeneration('stable-A');
    getAppUserID.mockImplementation(async () => accounts.captureAccountGeneration().stableId ?? '');
  });

  // зачем (PM-289 этап 2, D70/D78): запись/чтение журнала ожиданий удалены вместе с
  // жемчугом; остался только снос ключей удаляемого аккаунта (зовёт auth_provider).
  it('removes every owner-scoped key of the deleted account and nothing of another owner', async () => {
    const pending = await import('../app/shards_pending_grants');
    storage.set('pending_shard_grants_v2:stable-A', envelope('stable-A'));
    storage.set('pending_shard_grants_quarantine_v1:stable-A', '{}');
    storage.set('pending_shard_grants_recovery_needed_v1:stable-A', '1');
    storage.set('pending_shard_grants_v2:stable-B', envelope('stable-B'));

    await expect(pending.removePendingShardGrantsForAccount('stable-A')).resolves.toBe('cleaned');
    expect(storage.has('pending_shard_grants_v2:stable-A')).toBe(false);
    expect(storage.has('pending_shard_grants_quarantine_v1:stable-A')).toBe(false);
    expect(storage.has('pending_shard_grants_recovery_needed_v1:stable-A')).toBe(false);
    expect(storage.has('pending_shard_grants_delete_cleanup_v1:stable-A')).toBe(false);
    expect(storage.has('pending_shard_grants_v2:stable-B')).toBe(true);
    expect(pending).not.toHaveProperty('recordPendingShardGrant');
    expect(pending).not.toHaveProperty('listPendingShardGrants');
  });

  it('leaves a verified delete marker on failure and finishes on the next removal', async () => {
    const pending = await import('../app/shards_pending_grants');
    storage.set('pending_shard_grants_v2:stable-A', envelope('stable-A'));
    mockRemoveItem.mockRejectedValueOnce(new Error('remove failed'));

    await expect(pending.removePendingShardGrantsForAccount('stable-A')).resolves.toBe('cleanup_pending');
    const markerKey = 'pending_shard_grants_delete_cleanup_v1:stable-A';
    expect(JSON.parse(storage.get(markerKey) ?? '{}')).toMatchObject({ version: 1, ownerStableId: 'stable-A' });

    await expect(pending.removePendingShardGrantsForAccount('stable-A')).resolves.toBe('cleaned');
    expect(storage.has(markerKey)).toBe(false);
    expect(storage.has('pending_shard_grants_v2:stable-A')).toBe(false);
  });

  it('refuses an empty owner', async () => {
    const pending = await import('../app/shards_pending_grants');
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(pending.removePendingShardGrantsForAccount('  ')).resolves.toBe('cleanup_pending');
  });
});
