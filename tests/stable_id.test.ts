// Tests for stable_id — verifies UUID persists across simulated reinstalls

// In-memory AsyncStorage mock
const asyncStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem:  jest.fn(async (k: string) => asyncStore[k] ?? null),
  setItem:  jest.fn(async (k: string, v: string) => { asyncStore[k] = v; }),
  multiGet: jest.fn(async (keys: string[]) => keys.map(k => [k, asyncStore[k] ?? null])),
  multiSet: jest.fn(async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => { asyncStore[k] = v; }); }),
}));

// In-memory SecureStore mock that persists across jest.resetModules()
const secureStore: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => secureStore[k] ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => { secureStore[k] = v; }),
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
