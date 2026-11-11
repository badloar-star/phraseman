const durablePremiumStore = globalThis as typeof globalThis & {
  __premiumRealStorageTestValues?: Map<string, string>;
};

jest.mock('../app/config', () => ({
  FORCE_PREMIUM: false,
  IS_EXPO_GO: true,
  IS_STORE_RELEASE: true,
}));

jest.mock('../app/cloud_sync', () => ({
  syncToCloud: jest.fn(async () => undefined),
  restoreFromCloud: jest.fn(async () => false),
  peekCloudRestoreInFlight: () => null,
  lastCloudRestoreCompletedAt: () => 0,
}));

jest.mock('../app/gift_access_cloud', () => ({
  readGiftAccessFromCloud: jest.fn(async () => null),
}));

jest.mock('../app/revenuecat_projection_sync', () => ({
  syncRevenueCatProjectionForAccount: jest.fn(async () => true),
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  const values = durablePremiumStore.__premiumRealStorageTestValues
    ??= new Map<string, string>();
  const api = {
    getItem: jest.fn(async (key: string) => values.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { values.set(key, String(value)); }),
    removeItem: jest.fn(async (key: string) => { values.delete(key); }),
    multiGet: jest.fn(async (keys: string[]) => keys.map((key) => [key, values.get(key) ?? null])),
    multiSet: jest.fn(async (pairs: Array<[string, string]>) => {
      pairs.forEach(([key, value]) => values.set(key, String(value)));
    }),
    multiRemove: jest.fn(async (keys: string[]) => { keys.forEach((key) => values.delete(key)); }),
    getAllKeys: jest.fn(async () => [...values.keys()]),
    clear: jest.fn(async () => { values.clear(); }),
    __reset: () => values.clear(),
    __dump: () => Object.fromEntries(values),
  };
  return { __esModule: true, default: api, ...api };
});

type StorageModule = typeof import('../app/premium_real_storage');
type GenerationModule = typeof import('../app/account_generation');

const ACTIVE_INPUT = Object.freeze({
  active: true,
  plan: 'lifetime' as const,
  premiumExpiryMs: 0,
  rcExpiryMs: 0,
  rcLastSeenAtMs: 1_700_000_000_000,
  rcProductId: 'phraseman_lifetime',
  rcPeriodType: 'NORMAL',
  rcStore: 'APP_STORE',
  rcPurchasedAtMs: 1_600_000_000_000,
  rcUpdatedAtMs: 1_700_000_000_000,
  evidenceSource: 'store_purchase' as const,
});

function loadModules(owner: string): {
  generation: GenerationModule;
  storage: StorageModule;
  token: ReturnType<GenerationModule['captureAccountGeneration']>;
} {
  const generation = require('../app/account_generation') as GenerationModule;
  generation.__resetAccountGenerationForTests();
  const token = generation.beginAccountGeneration(owner);
  const storage = require('../app/premium_real_storage') as StorageModule;
  return { generation, storage, token };
}

function validSnapshot(ownerStableId = 'account-A'): Record<string, unknown> {
  return {
    version: 1,
    ownerStableId,
    ...ACTIVE_INPUT,
    updatedAtMs: 1_700_000_000_001,
  };
}

function preparedJournal(
  ownerStableId: string,
  previousRaw: string | null,
  candidateRaw: string,
): string {
  return JSON.stringify({
    journalVersion: 1,
    ownerStableId,
    operationId: 'test-operation-1',
    startedGeneration: 1,
    previousRaw,
    candidateRaw,
    preparedAtMs: 1_700_000_000_002,
  });
}

describe('owner-bound real Premium storage', () => {
  beforeEach(() => {
    const asyncStorage = require('@react-native-async-storage/async-storage').default;
    asyncStorage.__reset();
    jest.clearAllMocks();
    jest.resetModules();
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  });

  test('constructs an encoded key only for a bounded non-empty stable owner', () => {
    const { storage } = loadModules('account-A');
    expect(storage.realPremiumSnapshotStorageKey(' owner/a+b '))
      .toBe('premium_real_snapshot_v1:owner%2Fa%2Bb');
    expect(storage.isRealPremiumSnapshotStorageKey('premium_real_snapshot_v1:account-A')).toBe(true);
    expect(() => storage.realPremiumSnapshotStorageKey('   ')).toThrow('premium_real_snapshot_owner_invalid');
    expect(() => storage.realPremiumSnapshotStorageKey('x'.repeat(161))).toThrow('premium_real_snapshot_owner_invalid');
  });

  test('strictly parses valid active and inactive records', () => {
    const { storage } = loadModules('account-A');
    expect(storage.parseRealPremiumSnapshot(JSON.stringify(validSnapshot()), 'account-A'))
      .toEqual(validSnapshot());
    const inactive = {
      ...validSnapshot(),
      active: false,
      plan: null,
      rcProductId: null,
      rcPeriodType: null,
      rcStore: null,
    };
    expect(storage.parseRealPremiumSnapshot(JSON.stringify(inactive), 'account-A')).toEqual(inactive);
  });

  test.each([
    ['malformed JSON', '{'],
    ['wrong owner', JSON.stringify(validSnapshot('account-B'))],
    ['missing owner', JSON.stringify({ ...validSnapshot(), ownerStableId: undefined })],
    ['wrong version', JSON.stringify({ ...validSnapshot(), version: 2 })],
    ['invalid plan', JSON.stringify({ ...validSnapshot(), plan: 'annual' })],
    ['active without plan', JSON.stringify({ ...validSnapshot(), plan: null })],
    ['negative time', JSON.stringify({ ...validSnapshot(), rcExpiryMs: -1 })],
    ['non-finite time', JSON.stringify({ ...validSnapshot(), rcExpiryMs: 'NaN' })],
    ['unsafe time', JSON.stringify({ ...validSnapshot(), rcExpiryMs: Number.MAX_VALUE })],
    ['oversize product', JSON.stringify({ ...validSnapshot(), rcProductId: 'p'.repeat(257) })],
  ])('fails closed without rewriting %s', (_label, raw) => {
    const { storage } = loadModules('account-A');
    expect(storage.parseRealPremiumSnapshot(raw, 'account-A')).toBeNull();
  });

  test('A record is unreadable to B and a fresh A generation recovers it', async () => {
    const { generation, storage, token: tokenA } = loadModules('account-A');
    await expect(storage.replaceRealPremiumSnapshotForGeneration(tokenA, ACTIVE_INPUT)).resolves.toBe(true);

    const tokenB = generation.beginAccountGeneration('account-B');
    await expect(storage.readRealPremiumSnapshotForGeneration(tokenB)).resolves.toBeNull();

    const tokenAReturned = generation.beginAccountGeneration('account-A');
    await expect(storage.readRealPremiumSnapshotForGeneration(tokenAReturned))
      .resolves.toEqual(expect.objectContaining({ ownerStableId: 'account-A', active: true, plan: 'lifetime' }));
  });

  test('ownerless mirrors remain unchanged and never become a scoped record', async () => {
    const asyncStorage = require('@react-native-async-storage/async-storage').default;
    await asyncStorage.multiSet([
      ['premium_active', 'true'],
      ['premium_plan', 'lifetime'],
      ['premium_expiry', '0'],
    ]);
    const { storage, token } = loadModules('account-B');

    await expect(storage.readRealPremiumSnapshotForGeneration(token)).resolves.toBeNull();
    await expect(asyncStorage.multiGet(['premium_active', 'premium_plan', 'premium_expiry']))
      .resolves.toEqual([
        ['premium_active', 'true'],
        ['premium_plan', 'lifetime'],
        ['premium_expiry', '0'],
      ]);
  });

  test('a stale deferred read returns null while the new same-owner generation stays usable', async () => {
    const asyncStorage = require('@react-native-async-storage/async-storage').default;
    const { generation, storage, token: oldToken } = loadModules('account-A');
    await storage.replaceRealPremiumSnapshotForGeneration(oldToken, ACTIVE_INPUT);

    let releaseRead!: () => void;
    const originalGet = asyncStorage.getItem.getMockImplementation();
    asyncStorage.getItem.mockImplementationOnce(async (key: string) => {
      await new Promise<void>((resolve) => { releaseRead = resolve; });
      return originalGet(key);
    });
    const staleRead = storage.readRealPremiumSnapshotForGeneration(oldToken);
    await Promise.resolve();
    const freshToken = generation.beginAccountGeneration('account-A');
    releaseRead();

    await expect(staleRead).resolves.toBeNull();
    await expect(storage.readRealPremiumSnapshotForGeneration(freshToken))
      .resolves.toEqual(expect.objectContaining({ ownerStableId: 'account-A', active: true }));
  });

  test('a stale deferred write returns false and never creates a B-owned record', async () => {
    const asyncStorage = require('@react-native-async-storage/async-storage').default;
    const { generation, storage, token: oldToken } = loadModules('account-A');
    let releaseWrite!: () => void;
    const originalSet = asyncStorage.setItem.getMockImplementation();
    asyncStorage.setItem.mockImplementationOnce(async (key: string, value: string) => {
      await new Promise<void>((resolve) => { releaseWrite = resolve; });
      return originalSet(key, value);
    });
    const staleWrite = storage.replaceRealPremiumSnapshotForGeneration(oldToken, ACTIVE_INPUT);
    for (let spin = 0; !releaseWrite && spin < 20; spin += 1) await Promise.resolve();
    expect(releaseWrite).toBeDefined();
    generation.beginAccountGeneration('account-B');
    releaseWrite();

    await expect(staleWrite).resolves.toBe(false);
    expect(asyncStorage.__dump()).not.toHaveProperty(
      storage.realPremiumSnapshotStorageKey('account-B'),
    );
  });

  test('an old A native commit cannot grant a later A generation after A to B to A', async () => {
    const asyncStorage = require('@react-native-async-storage/async-storage').default;
    const { generation, storage, token: oldA } = loadModules('account-A');
    let releaseWrite!: () => void;
    const originalSet = asyncStorage.setItem.getMockImplementation();
    asyncStorage.setItem.mockImplementationOnce(async (key: string, value: string) => {
      await new Promise<void>((resolve) => { releaseWrite = resolve; });
      return originalSet(key, value);
    });

    const staleWrite = storage.replaceRealPremiumSnapshotForGeneration(oldA, ACTIVE_INPUT);
    for (let spin = 0; !releaseWrite && spin < 20; spin += 1) await Promise.resolve();
    expect(releaseWrite).toBeDefined();
    generation.beginAccountGeneration('account-B');
    const returnedA = generation.beginAccountGeneration('account-A');
    releaseWrite();

    await expect(staleWrite).resolves.toBe(false);
    await expect(storage.readRealPremiumSnapshotForGeneration(returnedA)).resolves.toBeNull();
  });

  test('stale A rollback restores the exact prior valid A snapshot', async () => {
    const asyncStorage = require('@react-native-async-storage/async-storage').default;
    const { generation, storage, token: oldA } = loadModules('account-A');
    const prior = { ...ACTIVE_INPUT, rcProductId: 'prior_lifetime', evidenceSource: 'server_projection' as const };
    await expect(storage.replaceRealPremiumSnapshotForGeneration(oldA, prior)).resolves.toBe(true);

    let releaseWrite!: () => void;
    const originalSet = asyncStorage.setItem.getMockImplementation();
    asyncStorage.setItem.mockImplementationOnce(async (key: string, value: string) => {
      await new Promise<void>((resolve) => { releaseWrite = resolve; });
      return originalSet(key, value);
    });
    const staleWrite = storage.replaceRealPremiumSnapshotForGeneration(oldA, {
      ...ACTIVE_INPUT,
      plan: 'monthly',
      rcProductId: 'stale_monthly',
    });
    for (let spin = 0; !releaseWrite && spin < 20; spin += 1) await Promise.resolve();
    generation.beginAccountGeneration('account-B');
    const returnedA = generation.beginAccountGeneration('account-A');
    releaseWrite();

    await expect(staleWrite).resolves.toBe(false);
    await expect(storage.readRealPremiumSnapshotForGeneration(returnedA)).resolves.toEqual(
      expect.objectContaining({ plan: 'lifetime', rcProductId: 'prior_lifetime', evidenceSource: 'server_projection' }),
    );
  });

  test('stale rollback cannot overwrite a newer legitimate A commit queued on the transition lock', async () => {
    const asyncStorage = require('@react-native-async-storage/async-storage').default;
    const { generation, storage, token: oldA } = loadModules('account-A');
    let releaseWrite!: () => void;
    const originalSet = asyncStorage.setItem.getMockImplementation();
    asyncStorage.setItem.mockImplementationOnce(async (key: string, value: string) => {
      await new Promise<void>((resolve) => { releaseWrite = resolve; });
      return originalSet(key, value);
    });
    const staleWrite = storage.replaceRealPremiumSnapshotForGeneration(oldA, {
      ...ACTIVE_INPUT,
      plan: 'monthly',
      rcProductId: 'stale_monthly',
    });
    for (let spin = 0; !releaseWrite && spin < 20; spin += 1) await Promise.resolve();
    generation.beginAccountGeneration('account-B');
    const returnedA = generation.beginAccountGeneration('account-A');
    const freshWrite = storage.replaceRealPremiumSnapshotForGeneration(returnedA, {
      ...ACTIVE_INPUT,
      rcProductId: 'fresh_lifetime',
      evidenceSource: 'server_projection',
    });
    releaseWrite();

    await expect(staleWrite).resolves.toBe(false);
    await expect(freshWrite).resolves.toBe(true);
    await expect(storage.readRealPremiumSnapshotForGeneration(returnedA)).resolves.toEqual(
      expect.objectContaining({ plan: 'lifetime', rcProductId: 'fresh_lifetime', evidenceSource: 'server_projection' }),
    );
  });

  test('returned A cannot read the stale candidate while native cleanup is pending', async () => {
    const asyncStorage = require('@react-native-async-storage/async-storage').default;
    const { generation, storage, token: oldA } = loadModules('account-A');
    let releaseWrite!: () => void;
    let releaseCleanup!: () => void;
    const originalSet = asyncStorage.setItem.getMockImplementation();
    const originalRemove = asyncStorage.removeItem.getMockImplementation();
    const snapshotKey = storage.realPremiumSnapshotStorageKey('account-A');
    asyncStorage.setItem.mockImplementation(async (key: string, value: string) => {
      if (key === snapshotKey && !releaseWrite) {
        await new Promise<void>((resolve) => { releaseWrite = resolve; });
      }
      return originalSet(key, value);
    });
    asyncStorage.removeItem.mockImplementationOnce(async (key: string) => {
      await new Promise<void>((resolve) => { releaseCleanup = resolve; });
      return originalRemove(key);
    });
    const staleWrite = storage.replaceRealPremiumSnapshotForGeneration(oldA, ACTIVE_INPUT);
    for (let spin = 0; !releaseWrite && spin < 20; spin += 1) await Promise.resolve();
    generation.beginAccountGeneration('account-B');
    const returnedA = generation.beginAccountGeneration('account-A');
    releaseWrite();
    for (let spin = 0; !releaseCleanup && spin < 20; spin += 1) await Promise.resolve();
    expect(releaseCleanup).toBeDefined();

    await expect(storage.readRealPremiumSnapshotForGeneration(returnedA)).resolves.toBeNull();
    releaseCleanup();
    await expect(staleWrite).resolves.toBe(false);
    await expect(storage.readRealPremiumSnapshotForGeneration(returnedA)).resolves.toBeNull();
  });

  test('stale update native commit rolls back to the prior A snapshot', async () => {
    const asyncStorage = require('@react-native-async-storage/async-storage').default;
    const { generation, storage, token: oldA } = loadModules('account-A');
    await expect(storage.replaceRealPremiumSnapshotForGeneration(oldA, ACTIVE_INPUT)).resolves.toBe(true);
    let releaseWrite!: () => void;
    const originalSet = asyncStorage.setItem.getMockImplementation();
    const snapshotKey = storage.realPremiumSnapshotStorageKey('account-A');
    asyncStorage.setItem.mockImplementation(async (key: string, value: string) => {
      if (key === snapshotKey && !releaseWrite) {
        await new Promise<void>((resolve) => { releaseWrite = resolve; });
      }
      return originalSet(key, value);
    });
    const staleUpdate = storage.updateRealPremiumSnapshotForGeneration(oldA, (current) => ({
      ...current,
      plan: 'monthly',
      rcProductId: 'stale_update',
    }));
    for (let spin = 0; !releaseWrite && spin < 20; spin += 1) await Promise.resolve();
    generation.beginAccountGeneration('account-B');
    const returnedA = generation.beginAccountGeneration('account-A');
    releaseWrite();

    await expect(staleUpdate).resolves.toBe(false);
    await expect(storage.readRealPremiumSnapshotForGeneration(returnedA)).resolves.toEqual(
      expect.objectContaining({ plan: 'lifetime', rcProductId: 'phraseman_lifetime' }),
    );
  });

  test('uncertain native failure after committing stale A is rolled back across a JS restart', async () => {
    const asyncStorage = require('@react-native-async-storage/async-storage').default;
    const { generation, storage, token: oldA } = loadModules('account-A');
    let releaseWrite!: () => void;
    const originalSet = asyncStorage.setItem.getMockImplementation();
    asyncStorage.setItem.mockImplementationOnce(async (key: string, value: string) => {
      await new Promise<void>((resolve) => { releaseWrite = resolve; });
      await originalSet(key, value);
      throw new Error('native_commit_uncertain');
    });
    const staleWrite = storage.replaceRealPremiumSnapshotForGeneration(oldA, ACTIVE_INPUT);
    for (let spin = 0; !releaseWrite && spin < 20; spin += 1) await Promise.resolve();
    generation.beginAccountGeneration('account-B');
    generation.beginAccountGeneration('account-A');
    releaseWrite();
    await expect(staleWrite).rejects.toThrow('native_commit_uncertain');

    jest.resetModules();
    const restartedGeneration = require('../app/account_generation') as GenerationModule;
    restartedGeneration.__resetAccountGenerationForTests();
    const restartedA = restartedGeneration.beginAccountGeneration('account-A');
    const restartedStorage = require('../app/premium_real_storage') as StorageModule;
    await expect(restartedStorage.readRealPremiumSnapshotForGeneration(restartedA)).resolves.toBeNull();
  });

  test('cleanup failure quarantines an uncertain stale candidate from returned A readers', async () => {
    const asyncStorage = require('@react-native-async-storage/async-storage').default;
    const { generation, storage, token: oldA } = loadModules('account-A');
    let releaseWrite!: () => void;
    const originalSet = asyncStorage.setItem.getMockImplementation();
    const snapshotKey = storage.realPremiumSnapshotStorageKey('account-A');
    asyncStorage.setItem.mockImplementation(async (key: string, value: string) => {
      if (key === snapshotKey && !releaseWrite) {
        await new Promise<void>((resolve) => { releaseWrite = resolve; });
      }
      return originalSet(key, value);
    });
    asyncStorage.removeItem.mockRejectedValueOnce(new Error('rollback_storage_unavailable'));
    const staleWrite = storage.replaceRealPremiumSnapshotForGeneration(oldA, ACTIVE_INPUT);
    for (let spin = 0; !releaseWrite && spin < 20; spin += 1) await Promise.resolve();
    generation.beginAccountGeneration('account-B');
    const returnedA = generation.beginAccountGeneration('account-A');
    releaseWrite();

    await expect(staleWrite).rejects.toThrow('rollback_storage_unavailable');
    await expect(storage.readRealPremiumSnapshotForGeneration(returnedA)).resolves.toBeNull();

    jest.resetModules();
    const restartedGeneration = require('../app/account_generation') as GenerationModule;
    restartedGeneration.__resetAccountGenerationForTests();
    const restartedA = restartedGeneration.beginAccountGeneration('account-A');
    const restartedStorage = require('../app/premium_real_storage') as StorageModule;
    await expect(restartedStorage.readRealPremiumSnapshotForGeneration(restartedA)).resolves.toBeNull();
  });

  test('durable prepared journal exposes only prior valid A evidence across restart', async () => {
    const asyncStorage = require('@react-native-async-storage/async-storage').default;
    const { generation, storage } = loadModules('account-A');
    const snapshotKey = storage.realPremiumSnapshotStorageKey('account-A');
    const pendingKey = storage.realPremiumPendingStorageKey('account-A');
    const priorRaw = JSON.stringify({
      ...validSnapshot(),
      rcProductId: 'prior_lifetime',
      evidenceSource: 'server_projection',
    });
    const candidateRaw = JSON.stringify({
      ...validSnapshot(),
      plan: 'monthly',
      rcProductId: 'stale_monthly',
    });
    await asyncStorage.multiSet([
      [snapshotKey, candidateRaw],
      [pendingKey, preparedJournal('account-A', priorRaw, candidateRaw)],
    ]);
    const tokenA = generation.captureAccountGeneration();
    await expect(storage.readRealPremiumSnapshotForGeneration(tokenA)).resolves.toEqual(
      expect.objectContaining({ plan: 'lifetime', rcProductId: 'prior_lifetime', evidenceSource: 'server_projection' }),
    );

    jest.resetModules();
    const restartedGeneration = require('../app/account_generation') as GenerationModule;
    restartedGeneration.__resetAccountGenerationForTests();
    const restartedA = restartedGeneration.beginAccountGeneration('account-A');
    const restartedStorage = require('../app/premium_real_storage') as StorageModule;
    await expect(restartedStorage.readRealPremiumSnapshotForGeneration(restartedA)).resolves.toEqual(
      expect.objectContaining({ plan: 'lifetime', rcProductId: 'prior_lifetime', evidenceSource: 'server_projection' }),
    );
  });

  test('malformed prepared journal masks the live candidate', async () => {
    const asyncStorage = require('@react-native-async-storage/async-storage').default;
    const { storage, token } = loadModules('account-A');
    await asyncStorage.multiSet([
      [storage.realPremiumSnapshotStorageKey('account-A'), JSON.stringify(validSnapshot())],
      [storage.realPremiumPendingStorageKey('account-A'), '{'],
    ]);
    await expect(storage.readRealPremiumSnapshotForGeneration(token)).resolves.toBeNull();
  });

  test('final removal commit-then-reject is classified as committed', async () => {
    const asyncStorage = require('@react-native-async-storage/async-storage').default;
    const { storage, token } = loadModules('account-A');
    const pendingKey = storage.realPremiumPendingStorageKey('account-A');
    const originalRemove = asyncStorage.removeItem.getMockImplementation();
    asyncStorage.removeItem.mockImplementationOnce(async (key: string) => {
      await originalRemove(key);
      throw new Error('native_remove_commit_then_reject');
    });

    await expect(storage.replaceRealPremiumSnapshotForGeneration(token, ACTIVE_INPUT)).resolves.toBe(true);
    expect(asyncStorage.removeItem).toHaveBeenCalledWith(pendingKey);
    await expect(asyncStorage.getItem(pendingKey)).resolves.toBeNull();
    await expect(storage.readRealPremiumSnapshotForGeneration(token)).resolves.toEqual(
      expect.objectContaining({ active: true, plan: 'lifetime' }),
    );
  });

  test('final removal rejection with journal still present remains uncommitted after restart', async () => {
    const asyncStorage = require('@react-native-async-storage/async-storage').default;
    const { storage, token } = loadModules('account-A');
    const pendingKey = storage.realPremiumPendingStorageKey('account-A');
    asyncStorage.removeItem.mockRejectedValueOnce(new Error('native_remove_rejected_present'));

    await expect(storage.replaceRealPremiumSnapshotForGeneration(token, ACTIVE_INPUT)).resolves.toBe(false);
    await expect(asyncStorage.getItem(pendingKey)).resolves.not.toBeNull();
    jest.resetModules();
    const restartedGeneration = require('../app/account_generation') as GenerationModule;
    restartedGeneration.__resetAccountGenerationForTests();
    const restartedA = restartedGeneration.beginAccountGeneration('account-A');
    const restartedStorage = require('../app/premium_real_storage') as StorageModule;
    await expect(restartedStorage.readRealPremiumSnapshotForGeneration(restartedA)).resolves.toBeNull();
  });

  test('unavailable final removal readback fails explicitly without exposing the candidate', async () => {
    const asyncStorage = require('@react-native-async-storage/async-storage').default;
    const { storage, token } = loadModules('account-A');
    const pendingKey = storage.realPremiumPendingStorageKey('account-A');
    const originalGet = asyncStorage.getItem.getMockImplementation();
    let pendingReads = 0;
    asyncStorage.getItem.mockImplementation(async (key: string) => {
      if (key === pendingKey && (pendingReads += 1) === 3) {
        throw new Error('native_pending_readback_unavailable');
      }
      return originalGet(key);
    });
    asyncStorage.removeItem.mockRejectedValueOnce(new Error('native_remove_indeterminate'));

    await expect(storage.replaceRealPremiumSnapshotForGeneration(token, ACTIVE_INPUT))
      .rejects.toThrow('premium_real_snapshot_commit_indeterminate');
    await expect(storage.readRealPremiumSnapshotForGeneration(token)).resolves.toBeNull();
  });

  test('post-permit A to B to A stays synchronous while pending removal masks candidate', async () => {
    const asyncStorage = require('@react-native-async-storage/async-storage').default;
    const { generation, storage, token: oldA } = loadModules('account-A');
    const pendingKey = storage.realPremiumPendingStorageKey('account-A');
    let releaseRemove!: () => void;
    const originalRemove = asyncStorage.removeItem.getMockImplementation();
    asyncStorage.removeItem.mockImplementationOnce(async (key: string) => {
      expect(key).toBe(pendingKey);
      await new Promise<void>((resolve) => { releaseRemove = resolve; });
      return originalRemove(key);
    });
    const write = storage.replaceRealPremiumSnapshotForGeneration(oldA, ACTIVE_INPUT);
    for (let spin = 0; !releaseRemove && spin < 30; spin += 1) await Promise.resolve();
    expect(releaseRemove).toBeDefined();

    const tokenB = generation.beginAccountGeneration('account-B');
    expect(generation.isCurrentAccountGeneration(tokenB, 'account-B')).toBe(true);
    const returnedA = generation.beginAccountGeneration('account-A');
    expect(generation.isCurrentAccountGeneration(returnedA, 'account-A')).toBe(true);
    await expect(storage.readRealPremiumSnapshotForGeneration(returnedA)).resolves.toBeNull();

    releaseRemove();
    await expect(write).resolves.toBe(true);
    await expect(storage.readRealPremiumSnapshotForGeneration(returnedA)).resolves.toEqual(
      expect.objectContaining({ active: true, plan: 'lifetime' }),
    );
  });

  test('disk state survives a JS module restart but remains owner scoped', async () => {
    const first = loadModules('account-A');
    await first.storage.replaceRealPremiumSnapshotForGeneration(first.token, ACTIVE_INPUT);

    jest.resetModules();
    const generation = require('../app/account_generation') as GenerationModule;
    generation.__resetAccountGenerationForTests();
    const tokenB = generation.beginAccountGeneration('account-B');
    const storage = require('../app/premium_real_storage') as StorageModule;
    await expect(storage.readRealPremiumSnapshotForGeneration(tokenB)).resolves.toBeNull();

    const tokenA = generation.beginAccountGeneration('account-A');
    await expect(storage.readRealPremiumSnapshotForGeneration(tokenA))
      .resolves.toEqual(expect.objectContaining({ ownerStableId: 'account-A', plan: 'lifetime' }));
  });

  test.each(['store_purchase', 'server_projection'] as const)(
    'current owner can recover from fresh %s evidence',
    async (evidenceSource) => {
      const { storage, token } = loadModules('account-A');
      await expect(storage.replaceRealPremiumSnapshotForGeneration(token, {
        ...ACTIVE_INPUT,
        evidenceSource,
      })).resolves.toBe(true);
      await expect(storage.readRealPremiumSnapshotForGeneration(token))
        .resolves.toEqual(expect.objectContaining({ ownerStableId: 'account-A', evidenceSource }));
    },
  );

  test('current B is Free when only ownerless lifetime mirrors survive', async () => {
    const asyncStorage = require('@react-native-async-storage/async-storage').default;
    const { generation } = loadModules('account-B');
    await asyncStorage.multiSet([
      ['premium_active', 'true'],
      ['premium_plan', 'lifetime'],
      ['premium_expiry', '0'],
    ]);
    const guard = require('../app/premium_guard');

    await expect(guard.getVerifiedRealPremiumStatus({ bypassCache: true })).resolves.toBe(false);
    await expect(guard.isLifetimePlanLocal()).resolves.toBe(false);
    expect(generation.captureAccountGeneration().stableId).toBe('account-B');
    await expect(asyncStorage.multiGet(['premium_active', 'premium_plan', 'premium_expiry']))
      .resolves.toEqual([
        ['premium_active', 'true'],
        ['premium_plan', 'lifetime'],
        ['premium_expiry', '0'],
      ]);
  });

  test('partial wipe leaving A scoped and global records cannot grant B', async () => {
    const asyncStorage = require('@react-native-async-storage/async-storage').default;
    const { generation, token: tokenA } = loadModules('account-A');
    const state = require('../app/premium_revenuecat_state');
    await state.persistStorePremiumLocally(
      tokenA,
      'lifetime',
      { productId: 'phraseman_lifetime' },
      'store_purchase',
      false,
    );
    await asyncStorage.removeItem('premium_active');
    generation.beginAccountGeneration('account-B');
    const guard = require('../app/premium_guard');
    guard.invalidatePremiumCache();

    await expect(guard.getVerifiedRealPremiumStatus({ bypassCache: true })).resolves.toBe(false);
    await expect(guard.isLifetimePlanLocal()).resolves.toBe(false);
    expect(asyncStorage.__dump()).toHaveProperty('premium_real_snapshot_v1:account-A');
    expect(asyncStorage.__dump()).not.toHaveProperty('premium_real_snapshot_v1:account-B');
  });

  test('JS restart with B active cannot adopt A legacy mirrors', async () => {
    const asyncStorage = require('@react-native-async-storage/async-storage').default;
    loadModules('account-A');
    await asyncStorage.multiSet([
      ['premium_active', 'true'],
      ['premium_plan', 'lifetime'],
      ['premium_rc_product_id', 'phraseman_lifetime'],
    ]);

    jest.resetModules();
    const generation = require('../app/account_generation') as GenerationModule;
    generation.__resetAccountGenerationForTests();
    generation.beginAccountGeneration('account-B');
    const guard = require('../app/premium_guard');

    await expect(guard.getVerifiedRealPremiumStatus({ bypassCache: true })).resolves.toBe(false);
    await expect(guard.isLifetimePlanLocal()).resolves.toBe(false);
  });
});

