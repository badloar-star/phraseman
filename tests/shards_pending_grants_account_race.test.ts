const storage = new Map<string, string>();
const mockGetItem = jest.fn(async (key: string) => storage.get(key) ?? null);
const mockSetItem = jest.fn(async (key: string, value: string) => { storage.set(key, value); });
const mockRemoveItem = jest.fn(async (key: string) => { storage.delete(key); });
const mockMultiGet = jest.fn(async (keys: string[]) => keys.map((key) => [key, storage.get(key) ?? null]));
const mockMultiSet = jest.fn(async (entries: [string, string][]) => {
  entries.forEach(([key, value]) => storage.set(key, value));
});
const emitAppEvent = jest.fn();
const loadShardsFromCloud = jest.fn<Promise<void>, [(() => boolean)?]>(async () => {});
const getShardsBalance = jest.fn(async () => 100);
const getAppUserID = jest.fn(async () => 'stable-A');
const listConfirmedRevenueCatPurchaseEventsFromCloud = jest.fn(async () => [] as Array<Record<string, unknown>>);

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
jest.mock('../app/shards_system', () => ({
  getShardsBalance,
  loadShardsFromCloud,
  getShardAchievementEligibleBalance: jest.fn(async (balance: number) => balance),
}));
jest.mock('../app/events', () => ({ emitAppEvent }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('react-native-purchases', () => ({ __esModule: true, default: { getAppUserID } }));
jest.mock('../app/economy/external_shard_event_sync', () => ({
  listConfirmedRevenueCatPurchaseEventsFromCloud,
}));

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
    listConfirmedRevenueCatPurchaseEventsFromCloud.mockResolvedValue([]);
    getShardsBalance.mockResolvedValue(100);
    const accounts = await import('../app/account_generation');
    accounts.__resetAccountGenerationForTests();
    accounts.beginAccountGeneration('stable-A');
    getAppUserID.mockImplementation(async () => accounts.captureAccountGeneration().stableId ?? '');
  });

  it('stores journals only under the exact current owner and B cannot read A', async () => {
    const accounts = await import('../app/account_generation');
    const pending = await import('../app/shards_pending_grants');
    const tokenA = accounts.captureAccountGeneration();
    await expect(pending.recordPendingShardGrant(tokenA, grant)).resolves.toMatchObject({ status: 'recorded' });
    expect(storage.has('pending_shard_grants_v2:stable-A')).toBe(true);

    accounts.beginAccountGeneration('stable-B');
    const tokenB = accounts.captureAccountGeneration();
    await expect(pending.listPendingShardGrants(tokenB)).resolves.toEqual([]);
    expect(storage.has('pending_shard_grants_v2:stable-A')).toBe(true);
  });

  it('quarantines raw ownerless v1 without adoption', async () => {
    const raw = JSON.stringify([grant]);
    storage.set('pending_shard_grants_v1', raw);
    const accounts = await import('../app/account_generation');
    const pending = await import('../app/shards_pending_grants');

    await expect(pending.listPendingShardGrants(accounts.captureAccountGeneration())).resolves.toEqual([]);
    const evidence = JSON.parse(storage.get('pending_shard_grants_quarantine_v1:stable-A') ?? '{}');
    expect(evidence).toMatchObject({ ownerStableId: 'stable-A', reason: 'ownerless_v1', raw });
    expect(storage.has('pending_shard_grants_v1')).toBe(true);
  });

  it('quarantines a mismatched v2 owner and hard-fails an occupied different evidence slot', async () => {
    const raw = envelope('stable-B');
    storage.set('pending_shard_grants_v2:stable-A', raw);
    const accounts = await import('../app/account_generation');
    const pending = await import('../app/shards_pending_grants');
    const tokenA = accounts.captureAccountGeneration();

    await expect(pending.recordPendingShardGrant(tokenA, grant)).resolves.toMatchObject({ status: 'quarantined' });
    const evidenceKey = 'pending_shard_grants_quarantine_v1:stable-A';
    expect(JSON.parse(storage.get(evidenceKey) ?? '{}')).toMatchObject({ reason: 'owner_mismatch', raw });

    storage.set(evidenceKey, JSON.stringify({ version: 1, ownerStableId: 'stable-A', reason: 'other', raw: 'other' }));
    await expect(pending.recordPendingShardGrant(tokenA, grant)).resolves.toMatchObject({ status: 'conflict' });
  });

  it('reports journal storage failure instead of claiming durable recovery', async () => {
    const accounts = await import('../app/account_generation');
    const pending = await import('../app/shards_pending_grants');
    mockSetItem.mockRejectedValueOnce(new Error('disk full'));

    await expect(pending.recordPendingShardGrant(accounts.captureAccountGeneration(), grant))
      .resolves.toMatchObject({ status: 'storage_unavailable' });
    expect(storage.has('pending_shard_grants_v2:stable-A')).toBe(false);
  });

  it('cancels queued A record and clear after generation changes to B', async () => {
    const accounts = await import('../app/account_generation');
    const pending = await import('../app/shards_pending_grants');
    const tokenA = accounts.captureAccountGeneration();
    storage.set('pending_shard_grants_v2:stable-A', envelope('stable-A'));
    let release!: () => void;
    let started!: () => void;
    const acquired = new Promise<void>((resolve) => { started = resolve; });
    const held = accounts.withAccountTransitionLock(async () => {
      started();
      await new Promise<void>((resolve) => { release = resolve; });
    });
    await acquired;
    const queuedRecord = pending.recordPendingShardGrant(tokenA, { ...grant, journalId: 'journal-new' });
    const queuedClear = pending.clearPendingShardGrant(tokenA, grant.journalId);
    accounts.invalidateAccountGeneration();
    accounts.beginAccountGeneration('stable-B');
    release();
    await held;

    await expect(queuedRecord).resolves.toMatchObject({ status: 'stale' });
    await expect(queuedClear).resolves.toBe(false);
    expect(storage.get('pending_shard_grants_v2:stable-A')).toBe(envelope('stable-A'));
  });

  it('deduplicates concurrent resume and emits/clears exactly once', async () => {
    const accounts = await import('../app/account_generation');
    const pending = await import('../app/shards_pending_grants');
    const tokenA = accounts.captureAccountGeneration();
    storage.set('pending_shard_grants_v2:stable-A', envelope('stable-A'));
    listConfirmedRevenueCatPurchaseEventsFromCloud.mockResolvedValueOnce([{
      eventId: 'rc-event-A',
      source: 'revenuecat_purchase',
      kind: 'real_money_shard_pack',
      delta: 100,
      subjectId: 'shards_100',
      createdAtMs: grant.createdAtMs,
      payload: { transactionId: 'store-tx-A' },
    }]);
    let release!: () => void;
    loadShardsFromCloud.mockImplementationOnce(async () => new Promise<void>((resolve) => { release = resolve; }));

    const first = pending.resumePendingShardGrants(tokenA);
    const second = pending.resumePendingShardGrants(tokenA);
    expect(second).toBe(first);
    while (!release) await Promise.resolve();
    release();
    await Promise.all([first, second]);

    expect(emitAppEvent.mock.calls.filter(([name]) => name === 'action_toast')).toHaveLength(1);
    expect(JSON.parse(storage.get('pending_shard_grants_v2:stable-A') ?? '{}')).toMatchObject({ grants: [] });
  });

  it('persists consumed RevenueCat correlation so a later purchase cannot reuse the old event', async () => {
    const accounts = await import('../app/account_generation');
    const pending = await import('../app/shards_pending_grants');
    const tokenA = accounts.captureAccountGeneration();
    const event = {
      eventId: 'rc-event-A',
      source: 'revenuecat_purchase',
      kind: 'real_money_shard_pack',
      delta: 100,
      subjectId: 'shards_100',
      createdAtMs: grant.createdAtMs,
      payload: { transactionId: 'store-tx-A' },
    };
    storage.set('pending_shard_grants_v2:stable-A', envelope('stable-A'));
    listConfirmedRevenueCatPurchaseEventsFromCloud.mockResolvedValue([event]);

    await pending.resumePendingShardGrants(tokenA);
    await pending.recordPendingShardGrant(tokenA, {
      ...grant,
      journalId: 'journal-B',
      storeTransactionId: null,
      createdAtMs: grant.createdAtMs + 1,
    });
    await pending.resumePendingShardGrants(tokenA);

    await expect(pending.listPendingShardGrants(tokenA)).resolves.toEqual([
      expect.objectContaining({ journalId: 'journal-B' }),
    ]);
    expect(emitAppEvent.mock.calls.filter(([name]) => name === 'action_toast')).toHaveLength(1);
  });

  it('leaves a verified delete marker on failure, retries for A, and B cannot process it', async () => {
    const accounts = await import('../app/account_generation');
    const pending = await import('../app/shards_pending_grants');
    storage.set('pending_shard_grants_v2:stable-A', envelope('stable-A'));
    mockRemoveItem.mockRejectedValueOnce(new Error('remove failed'));

    await expect(pending.removePendingShardGrantsForAccount('stable-A')).resolves.toBe('cleanup_pending');
    const markerKey = 'pending_shard_grants_delete_cleanup_v1:stable-A';
    expect(JSON.parse(storage.get(markerKey) ?? '{}')).toMatchObject({ version: 1, ownerStableId: 'stable-A' });

    accounts.beginAccountGeneration('stable-B');
    await expect(pending.retryPendingShardGrantDeleteCleanup(accounts.captureAccountGeneration(), 'stable-A'))
      .resolves.toBe('not_owner');
    expect(storage.has(markerKey)).toBe(true);

    accounts.beginAccountGeneration('stable-A');
    await expect(pending.retryPendingShardGrantDeleteCleanup(accounts.captureAccountGeneration(), 'stable-A'))
      .resolves.toBe('cleaned');
    expect(storage.has(markerKey)).toBe(false);
    expect(storage.has('pending_shard_grants_v2:stable-A')).toBe(false);
  });
});
