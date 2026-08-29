// Tests for stable_id — verifies UUID persists across simulated reinstalls

// In-memory AsyncStorage mock
const asyncStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem:  jest.fn(async (k: string) => asyncStore[k] ?? null),
  setItem:  jest.fn(async (k: string, v: string) => { asyncStore[k] = v; }),
  removeItem: jest.fn(async (k: string) => { delete asyncStore[k]; }),
  multiGet: jest.fn(async (keys: string[]) => keys.map(k => [k, asyncStore[k] ?? null])),
  multiSet: jest.fn(async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => { asyncStore[k] = v; }); }),
}));

// In-memory SecureStore mock that persists across jest.resetModules()
const secureStore: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => secureStore[k] ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => { secureStore[k] = v; }),
  deleteItemAsync: jest.fn(async (k: string) => { delete secureStore[k]; }),
}));

jest.mock('./app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }), { virtual: true });
jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));

let uuidCounter = 0;
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => `uuid-${++uuidCounter}`),
}));

function clearAll() {
  Object.keys(asyncStore).forEach(k => delete asyncStore[k]);
  Object.keys(secureStore).forEach(k => delete secureStore[k]);
}

beforeEach(() => {
  jest.resetModules();
  clearAll();
  const AS = require('@react-native-async-storage/async-storage');
  AS.getItem.mockReset().mockImplementation(async (k: string) => asyncStore[k] ?? null);
  AS.setItem.mockReset().mockImplementation(async (k: string, v: string) => { asyncStore[k] = v; });
  AS.removeItem.mockReset().mockImplementation(async (k: string) => { delete asyncStore[k]; });
  const SS = require('expo-secure-store');
  SS.getItemAsync.mockReset().mockImplementation(async (k: string) => secureStore[k] ?? null);
  SS.setItemAsync.mockReset().mockImplementation(async (k: string, v: string) => { secureStore[k] = v; });
  SS.deleteItemAsync.mockReset().mockImplementation(async (k: string) => { delete secureStore[k]; });
});

test('generates a UUID on first launch', async () => {
  const { getStableId } = require('../app/stable_id');
  const id = await getStableId();
  expect(typeof id).toBe('string');
  expect(id.length).toBeGreaterThan(0);
});

test('returns same UUID on second call (in-memory cache)', async () => {
  const { getStableId } = require('../app/stable_id');
  const id1 = await getStableId();
  const id2 = await getStableId();
  expect(id1).toBe(id2);
});

test('restores UUID from SecureStore after module reset — simulates reinstall', async () => {
  // First launch
  const { getStableId: first } = require('../app/stable_id');
  const originalId = await first();
  expect(secureStore['phraseman_stable_uid']).toBe(originalId);

  // Simulate reinstall: AsyncStorage wiped, module cache reset, SecureStore (Keychain) survives
  jest.resetModules();
  Object.keys(asyncStore).forEach(k => delete asyncStore[k]); // wipe AsyncStorage only

  const { getStableId: second } = require('../app/stable_id');
  const restoredId = await second();

  expect(restoredId).toBe(originalId);
});

test('restores UUID from AsyncStorage when SecureStore is empty (upgrade migration)', async () => {
  asyncStore['phraseman_stable_uid_cache'] = 'migrated-uuid-123';

  const { getStableId } = require('../app/stable_id');
  const id = await getStableId();
  expect(id).toBe('migrated-uuid-123');
  // Also written to SecureStore for future reinstalls
  expect(secureStore['phraseman_stable_uid']).toBe('migrated-uuid-123');
});

test('repeated stable id reads keep one active generation', async () => {
  const { getStableId } = require('../app/stable_id');
  const generation = require('../app/account_generation');
  const id = await getStableId();
  const first = generation.captureAccountGeneration();
  await getStableId();
  expect(generation.captureAccountGeneration()).toEqual(first);
  expect(generation.isCurrentAccountGeneration(first, id)).toBe(true);
});

test('post-delete clear proves every stable-id storage layer empty before rotation', async () => {
  const stable = require('../app/stable_id');
  const oldId = await stable.getStableId();

  await stable.clearStableId();

  expect(stable.peekStableId()).toBeNull();
  expect(secureStore['phraseman_stable_uid']).toBeUndefined();
  expect(asyncStore['phraseman_stable_uid_cache']).toBeUndefined();
  await expect(stable.getStableId()).resolves.not.toBe(oldId);
});

test('cached stable id read cannot implicitly finish an account transition', async () => {
  const stable = require('../app/stable_id');
  const generation = require('../app/account_generation');
  const id = await stable.getStableId();
  generation.invalidateAccountGeneration();
  await expect(stable.getStableId()).resolves.toBe(id);
  expect(generation.captureAccountGeneration()).toMatchObject({ stableId: null, phase: 'transitioning' });
});

test('setStableId changes generation only when the identity changes', async () => {
  const { getStableId, setStableId } = require('../app/stable_id');
  const generation = require('../app/account_generation');
  const id = await getStableId();
  const first = generation.captureAccountGeneration();
  await setStableId(id);
  expect(generation.captureAccountGeneration()).toEqual(first);
  await setStableId('remote-account');
  expect(generation.isCurrentAccountGeneration(first)).toBe(false);
  expect(generation.captureAccountGeneration().phase).toBe('transitioning');
  generation.beginAccountGeneration('remote-account');
  expect(generation.captureAccountGeneration().stableId).toBe('remote-account');
});

test('clearStableId invalidates captured work before storage removal completes', async () => {
  const storage = require('expo-secure-store');
  let release!: () => void;
  storage.deleteItemAsync.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }));
  const { getStableId, clearStableId } = require('../app/stable_id');
  const generation = require('../app/account_generation');
  await getStableId();
  const captured = generation.captureAccountGeneration();
  const clearing = clearStableId();
  expect(generation.isCurrentAccountGeneration(captured)).toBe(false);
  await new Promise<void>((resolve) => setImmediate(resolve));
  release();
  await clearing;
});

test('concurrent getStableId calls share one generated identity and generation', async () => {
  const SS = require('expo-secure-store');
  let release!: () => void;
  SS.getItemAsync.mockImplementationOnce(() => new Promise<null>((resolve) => {
    release = () => resolve(null);
  }));
  const { getStableId } = require('../app/stable_id');
  const generation = require('../app/account_generation');
  const first = getStableId();
  const second = getStableId();
  release();
  const [a, b] = await Promise.all([first, second]);
  expect(a).toBe(b);
  expect(generation.captureAccountGeneration()).toMatchObject({ generation: 1, stableId: a, phase: 'active' });
});

test('failed set invalidates old generation instead of leaving split-brain identity', async () => {
  const AS = require('@react-native-async-storage/async-storage');
  const SS = require('expo-secure-store');
  const { getStableId, setStableId } = require('../app/stable_id');
  const generation = require('../app/account_generation');
  await getStableId();
  const captured = generation.captureAccountGeneration();
  SS.setItemAsync.mockRejectedValueOnce(new Error('secure failed'));
  AS.setItem.mockRejectedValueOnce(new Error('async failed'));
  await setStableId('unpersisted-account');
  expect(generation.isCurrentAccountGeneration(captured)).toBe(false);
  expect(generation.captureAccountGeneration().phase).toBe('transitioning');
  expect(await getStableId()).not.toBe('unpersisted-account');
});

test('cache reset invalidates work captured for the previous in-memory identity', async () => {
  const { getStableId, _resetStableIdCache } = require('../app/stable_id');
  const generation = require('../app/account_generation');
  await getStableId();
  const captured = generation.captureAccountGeneration();
  _resetStableIdCache();
  expect(generation.isCurrentAccountGeneration(captured)).toBe(false);
  expect(generation.captureAccountGeneration().phase).toBe('transitioning');
});

test('failed clear remains transitioning and invalidates captured work', async () => {
  const AS = require('@react-native-async-storage/async-storage');
  const SS = require('expo-secure-store');
  const { getStableId, clearStableId } = require('../app/stable_id');
  const generation = require('../app/account_generation');
  await getStableId();
  const captured = generation.captureAccountGeneration();
  SS.deleteItemAsync.mockRejectedValue(new Error('secure delete failed'));
  AS.removeItem.mockRejectedValueOnce(new Error('async delete failed'));
  await expect(clearStableId()).rejects.toThrow('secure delete failed');
  expect(generation.isCurrentAccountGeneration(captured)).toBe(false);
  expect(generation.captureAccountGeneration().phase).toBe('transitioning');
});

test('prepared deletion guard makes a concurrent set wait and reject instead of resurrecting identity', async () => {
  const SS = require('expo-secure-store');
  const quarantine = require('../app/account_delete_quarantine');
  const stable = require('../app/stable_id');
  const deletedId = await stable.getStableId();
  const createdAt = Date.now();
  const lock = {
    operationId: 'delete-op-race',
    providerUid: 'provider-race',
    stableId: deletedId,
    source: 'local',
    phase: 'prepared',
    createdAt,
    expiresAt: createdAt + 60_000,
  };
  await expect(quarantine.persistAccountDeletePendingAuthLock(lock)).resolves.toBe(true);

  let release!: () => void;
  SS.deleteItemAsync.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }));
  const clearing = stable.clearStableId();
  await new Promise<void>((resolve) => setImmediate(resolve));
  const setting = stable.setStableId('foreign-after-delete');

  release();
  await expect(clearing).resolves.toBeUndefined();
  await expect(setting).rejects.toThrow('account_delete_identity_quarantined');
  expect(secureStore['phraseman_stable_uid']).toBeUndefined();
  expect(asyncStore['phraseman_stable_uid_cache']).toBeUndefined();
  expect(JSON.parse(secureStore['account_delete_pending_auth_v2']).phase).toBe('prepared');
});

test('strict clear drains a paused stable-id load before verifying every storage layer empty', async () => {
  const SS = require('expo-secure-store');
  secureStore['phraseman_stable_uid'] = 'stale-loading-account';
  let release!: () => void;
  const originalGet = SS.getItemAsync.getMockImplementation();
  let paused = false;
  SS.getItemAsync.mockImplementation((key: string, ...args: unknown[]) => {
    if (key === 'phraseman_stable_uid' && !paused) {
      paused = true;
      return new Promise<string | null>((resolve) => {
        release = () => resolve('stale-loading-account');
      });
    }
    return originalGet(key, ...args);
  });
  const stable = require('../app/stable_id');
  const loading = stable.getStableId();
  await new Promise<void>((resolve) => setImmediate(resolve));
  const clearing = stable.clearStableId();
  const beforeRelease = await Promise.race([clearing.then(() => 'cleared'), Promise.resolve('pending')]);
  expect(beforeRelease).toBe('pending');

  release();
  await expect(loading).rejects.toThrow('stable_id_read_superseded');
  await expect(clearing).resolves.toBeUndefined();
  expect(secureStore['phraseman_stable_uid']).toBeUndefined();
  expect(asyncStore['phraseman_stable_uid_cache']).toBeUndefined();
  expect(stable.peekStableId()).toBeNull();
});

test('paused load then set then clear cannot orphan a late identity write', async () => {
  const SS = require('expo-secure-store');
  secureStore['phraseman_stable_uid'] = 'account-a';
  let release!: () => void;
  const baseGet = SS.getItemAsync.getMockImplementation();
  let paused = false;
  SS.getItemAsync.mockImplementation((key: string, ...args: unknown[]) => {
    if (key === 'phraseman_stable_uid' && !paused) {
      paused = true;
      return new Promise<string | null>((resolve) => {
        release = () => resolve('account-a');
      });
    }
    return baseGet(key, ...args);
  });
  const stable = require('../app/stable_id');
  const loadingA = stable.getStableId();
  await new Promise<void>((resolve) => setImmediate(resolve));
  const settingC = stable.setStableId('account-c');
  const clearing = stable.clearStableId();

  release();
  await expect(loadingA).rejects.toThrow('stable_id_read_superseded');
  await expect(settingC).resolves.toBeUndefined();
  await expect(clearing).resolves.toBeUndefined();
  expect(secureStore['phraseman_stable_uid']).toBeUndefined();
  expect(asyncStore['phraseman_stable_uid_cache']).toBeUndefined();
  expect(stable.peekStableId()).toBeNull();
});

test.each(['set', 'clear', 'reset'] as const)(
  'pending get cannot commit after %s mutation',
  async (mutation) => {
    const SS = require('expo-secure-store');
    let release!: () => void;
    const baseGet = SS.getItemAsync.getMockImplementation();
    let paused = false;
    SS.getItemAsync.mockImplementation((key: string, ...args: unknown[]) => {
      if (key === 'phraseman_stable_uid' && !paused) {
        paused = true;
        return new Promise<string | null>((resolve) => {
          release = () => resolve('stale-account');
        });
      }
      return baseGet(key, ...args);
    });
    const stable = require('../app/stable_id');
    const generation = require('../app/account_generation');
    const pending = stable.getStableId();
    await new Promise<void>((resolve) => setImmediate(resolve));

    let mutationPromise: Promise<void> | null = null;
    if (mutation === 'set') mutationPromise = stable.setStableId('new-account');
    else if (mutation === 'clear') mutationPromise = stable.clearStableId();
    else stable._resetStableIdCache();

    release();
    await mutationPromise;
    await expect(pending).rejects.toThrow('stable_id_read_superseded');
    expect(generation.captureAccountGeneration().stableId).not.toBe('stale-account');
    expect(stable.peekStableId()).not.toBe('stale-account');
  },
);

test('getStableId waits behind a pending identity set and resolves the new account', async () => {
  const SS = require('expo-secure-store');
  const stable = require('../app/stable_id');
  const generation = require('../app/account_generation');
  await stable.getStableId();
  const oldToken = generation.captureAccountGeneration();
  let release!: () => void;
  SS.setItemAsync.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }));
  const setting = stable.setStableId('new-account');
  expect(generation.isCurrentAccountGeneration(oldToken)).toBe(false);
  const reading = stable.getStableId();
  const beforeRelease = await Promise.race([reading.then(() => 'resolved'), Promise.resolve('pending')]);
  expect(beforeRelease).toBe('pending');
  await new Promise<void>((resolve) => setImmediate(resolve));
  release();
  await setting;
  await expect(reading).resolves.toBe('new-account');
  expect(generation.captureAccountGeneration().phase).toBe('transitioning');
  generation.beginAccountGeneration('new-account');
  expect(generation.captureAccountGeneration()).toMatchObject({ stableId: 'new-account', phase: 'active' });
});

test('getStableId waits behind pending clear and never reactivates the deleted identity', async () => {
  const SS = require('expo-secure-store');
  const stable = require('../app/stable_id');
  await stable.getStableId();
  const oldId = stable.peekStableId();
  let release!: () => void;
  SS.deleteItemAsync.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }));
  const clearing = stable.clearStableId();
  const reading = stable.getStableId();
  const beforeRelease = await Promise.race([reading.then(() => 'resolved'), Promise.resolve('pending')]);
  expect(beforeRelease).toBe('pending');
  await new Promise<void>((resolve) => setImmediate(resolve));
  release();
  await clearing;
  await expect(reading).resolves.not.toBe(oldId);
});

test('queued set after paused set determines the final identity and waiting read', async () => {
  const SS = require('expo-secure-store');
  const stable = require('../app/stable_id');
  await stable.getStableId();
  let release!: () => void;
  SS.setItemAsync.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }));
  const first = stable.setStableId('first-account');
  await new Promise<void>((resolve) => setImmediate(resolve));
  const second = stable.setStableId('second-account');
  const reading = stable.getStableId();
  release();
  await Promise.all([first, second]);
  await expect(reading).resolves.toBe('second-account');
});

test('queued clear after paused set leaves a cleared post-mutation identity', async () => {
  const SS = require('expo-secure-store');
  const stable = require('../app/stable_id');
  await stable.getStableId();
  let release!: () => void;
  SS.setItemAsync.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }));
  const setting = stable.setStableId('superseded-account');
  await new Promise<void>((resolve) => setImmediate(resolve));
  const clearing = stable.clearStableId();
  const reading = stable.getStableId();
  release();
  await Promise.all([setting, clearing]);
  await expect(reading).resolves.not.toBe('superseded-account');
});

test('queued set after paused clear determines the final identity', async () => {
  const SS = require('expo-secure-store');
  const stable = require('../app/stable_id');
  await stable.getStableId();
  let release!: () => void;
  SS.deleteItemAsync.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }));
  const clearing = stable.clearStableId();
  await new Promise<void>((resolve) => setImmediate(resolve));
  const setting = stable.setStableId('after-clear-account');
  const reading = stable.getStableId();
  release();
  await Promise.all([clearing, setting]);
  await expect(reading).resolves.toBe('after-clear-account');
});

test('reset during a pending mutation prevents its late memory/generation commit', async () => {
  const SS = require('expo-secure-store');
  const stable = require('../app/stable_id');
  const generation = require('../app/account_generation');
  await stable.getStableId();
  let release!: () => void;
  SS.setItemAsync.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }));
  const setting = stable.setStableId('late-account');
  await new Promise<void>((resolve) => setImmediate(resolve));
  stable._resetStableIdCache();
  release();
  await setting;
  expect(stable.peekStableId()).toBeNull();
  expect(generation.captureAccountGeneration().phase).toBe('transitioning');
});
