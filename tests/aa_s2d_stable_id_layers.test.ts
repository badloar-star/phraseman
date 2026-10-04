/*
 * AA S2d 🔴3 (§127): «после перезапуска уровень 13↔12, дни 155↔52».
 *
 * Причина (S2c, H6-1, app/stable_id.ts persistStableId): запись stable_id
 * считалась успешной, если удался ХОТЯ БЫ один слой, а старт читает SecureStore
 * первым. SecureStore не записался → новый профиль жил только в AsyncStorage →
 * холодный старт поднимал старый профиль → облако снова переключало (adopt).
 *
 * Контракт после правки:
 *  - успех записи = записаны ВСЕ слои (с одним повтором на слой);
 *  - слой, не принявший запись, обезврежен (удалён) и помечен в рабочем слое
 *    меткой «устарел», иначе setStableId явно падает `stable_id_persist_failed`;
 *  - старт при расхождении слоёв выбирает значение последней намеренной записи
 *    (метку), чинит отставший слой, пишет `layersDiverge` без сырых id.
 */
const asyncStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => asyncStore[k] ?? null),
  setItem: jest.fn(async (k: string, v: string) => { asyncStore[k] = v; }),
  removeItem: jest.fn(async (k: string) => { delete asyncStore[k]; }),
  multiGet: jest.fn(async (keys: string[]) => keys.map((k) => [k, asyncStore[k] ?? null])),
  multiSet: jest.fn(async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => { asyncStore[k] = v; }); }),
}));

const secureStore: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => secureStore[k] ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => { secureStore[k] = v; }),
  deleteItemAsync: jest.fn(async (k: string) => { delete secureStore[k]; }),
}));
jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'uuid-generated') }));
const mockPersisted: string[] = [];
jest.mock('../app/debug-logger', () => ({
  DebugLogger: {
    error: jest.fn((context: string) => { mockPersisted.push(context); }),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

const SECURE_KEY = 'phraseman_stable_uid';
const ASYNC_KEY = 'phraseman_stable_uid_cache';
const STALE_MARKER_KEY = 'phraseman_stable_uid_secure_stale_v1';
const STABLE_A = '0f8fad5b-d9cb-469f-a165-70867728950e';
const STABLE_B = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const STABLE_C = '16fd2706-8baf-433b-82eb-8c7fada847da';

function traceLines(spy: jest.SpyInstance): string[] {
  return spy.mock.calls
    .map((call) => String(call[0]))
    .filter((line) => line.startsWith('[PROFILE-FLIP]'));
}

function secureMock() {
  return require('expo-secure-store') as {
    getItemAsync: jest.Mock; setItemAsync: jest.Mock; deleteItemAsync: jest.Mock;
  };
}

function asyncMock() {
  return require('@react-native-async-storage/async-storage') as {
    getItem: jest.Mock; setItem: jest.Mock; removeItem: jest.Mock;
  };
}

function breakSecureWrites(): void {
  secureMock().setItemAsync.mockImplementation(async () => { throw new Error('keystore_unavailable'); });
}

function healSecureWrites(): void {
  secureMock().setItemAsync.mockImplementation(async (k: string, v: string) => { secureStore[k] = v; });
}

/**
 * Холодный старт: свежие модули. resetModules пересоздаёт моки хранилищ с
 * рабочими реализациями, поэтому «сломанный Keystore» задаётся в `prepare`.
 */
async function coldStart(prepare?: () => void): Promise<string> {
  jest.resetModules();
  prepare?.();
  const stable = require('../app/stable_id');
  return stable.getStableId();
}

let warn: jest.SpyInstance;

beforeEach(() => {
  jest.resetModules();
  for (const key of Object.keys(asyncStore)) delete asyncStore[key];
  for (const key of Object.keys(secureStore)) delete secureStore[key];
  mockPersisted.length = 0;
  const SS = secureMock();
  SS.getItemAsync.mockReset().mockImplementation(async (k: string) => secureStore[k] ?? null);
  SS.setItemAsync.mockReset().mockImplementation(async (k: string, v: string) => { secureStore[k] = v; });
  SS.deleteItemAsync.mockReset().mockImplementation(async (k: string) => { delete secureStore[k]; });
  const AS = asyncMock();
  AS.getItem.mockReset().mockImplementation(async (k: string) => asyncStore[k] ?? null);
  AS.setItem.mockReset().mockImplementation(async (k: string, v: string) => { asyncStore[k] = v; });
  AS.removeItem.mockReset().mockImplementation(async (k: string) => { delete asyncStore[k]; });
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  warn.mockRestore();
});

test('SecureStore refuses the switch → every following cold start keeps the NEW profile (no flip)', async () => {
  secureStore[SECURE_KEY] = STABLE_A;
  asyncStore[ASYNC_KEY] = STABLE_A;
  const stable = require('../app/stable_id');
  await stable.getStableId();
  breakSecureWrites();
  await stable.setStableId(STABLE_B);
  await expect(stable.getStableId()).resolves.toBe(STABLE_B);

  // Keystore остаётся сломанным на запись: три перезапуска подряд — всегда B.
  for (let restart = 0; restart < 3; restart += 1) {
    await expect(coldStart(breakSecureWrites)).resolves.toBe(STABLE_B);
  }
  const persistLine = traceLines(warn).find((line) => line.includes('persist result'));
  expect(persistLine).toContain('"outcome":"async_authoritative"');
  expect(persistLine).toContain('"layersDiverge":true');
  expect(traceLines(warn).join('\n')).not.toContain(STABLE_A);
  expect(traceLines(warn).join('\n')).not.toContain(STABLE_B);
});

test('stale SecureStore value is neutralised (deleted) when its write failed', async () => {
  secureStore[SECURE_KEY] = STABLE_A;
  asyncStore[ASYNC_KEY] = STABLE_A;
  const stable = require('../app/stable_id');
  await stable.getStableId();
  breakSecureWrites();
  await stable.setStableId(STABLE_B);

  expect(secureStore[SECURE_KEY]).toBeUndefined();
  expect(asyncStore[ASYNC_KEY]).toBe(STABLE_B);
  expect(asyncStore[STALE_MARKER_KEY]).toBe(STABLE_B);
});

test('even when the stale SecureStore value cannot be deleted, the marker keeps the new profile and the layer is repaired once writable', async () => {
  secureStore[SECURE_KEY] = STABLE_A;
  asyncStore[ASYNC_KEY] = STABLE_A;
  const stable = require('../app/stable_id');
  await stable.getStableId();
  breakSecureWrites();
  secureMock().deleteItemAsync.mockImplementation(async () => { throw new Error('keystore_unavailable'); });
  await stable.setStableId(STABLE_B);
  expect(secureStore[SECURE_KEY]).toBe(STABLE_A);
  expect(asyncStore[STALE_MARKER_KEY]).toBe(STABLE_B);

  warn.mockClear();
  await expect(coldStart(breakSecureWrites)).resolves.toBe(STABLE_B);
  const diverge = traceLines(warn).find((line) => line.includes('startup layersDiverge'));
  expect(diverge).toContain('"chosen":"async"');
  expect(diverge).toContain('"reason":"secure_marked_stale"');
  expect(diverge).toContain('"repair":"failed"');
  expect(diverge).not.toContain(STABLE_A);
  expect(mockPersisted).toContain('[PROFILE-FLIP] startup layersDiverge');

  // Keystore ожил (свежие моки после resetModules пишут) → старт чинит слой и снимает метку.
  warn.mockClear();
  await expect(coldStart()).resolves.toBe(STABLE_B);
  expect(secureStore[SECURE_KEY]).toBe(STABLE_B);
  expect(asyncStore[STALE_MARKER_KEY]).toBeUndefined();
  const repaired = traceLines(warn).find((line) => line.includes('startup layersDiverge'));
  expect(repaired).toContain('"repair":"ok"');
  await expect(coldStart()).resolves.toBe(STABLE_B);
});

test('a transient SecureStore failure is retried once: full write, no marker', async () => {
  const stable = require('../app/stable_id');
  let failures = 1;
  secureMock().setItemAsync.mockImplementation(async (k: string, v: string) => {
    if (k === SECURE_KEY && failures > 0) { failures -= 1; throw new Error('keystore_busy'); }
    secureStore[k] = v;
  });
  await stable.setStableId(STABLE_B);
  expect(secureStore[SECURE_KEY]).toBe(STABLE_B);
  expect(asyncStore[ASYNC_KEY]).toBe(STABLE_B);
  expect(asyncStore[STALE_MARKER_KEY]).toBeUndefined();
  const persistLine = traceLines(warn).find((line) => line.includes('persist result'));
  expect(persistLine).toContain('"outcome":"complete"');
  expect(persistLine).toContain('"secureAttempts":2');
});

test('a full write clears a marker left by an earlier failed write', async () => {
  secureStore[SECURE_KEY] = STABLE_A;
  asyncStore[ASYNC_KEY] = STABLE_A;
  const stable = require('../app/stable_id');
  await stable.getStableId();
  breakSecureWrites();
  await stable.setStableId(STABLE_B);
  expect(asyncStore[STALE_MARKER_KEY]).toBe(STABLE_B);
  healSecureWrites();
  await stable.setStableId(STABLE_C);
  expect(asyncStore[STALE_MARKER_KEY]).toBeUndefined();
  await expect(coldStart()).resolves.toBe(STABLE_C);
});

test('AsyncStorage refuses the switch, SecureStore accepts → next start keeps the new profile and repairs AsyncStorage', async () => {
  secureStore[SECURE_KEY] = STABLE_A;
  asyncStore[ASYNC_KEY] = STABLE_A;
  const stable = require('../app/stable_id');
  await stable.getStableId();
  const AS = asyncMock();
  AS.setItem.mockImplementation(async (k: string, v: string) => {
    if (k === ASYNC_KEY) throw new Error('sqlite_full');
    asyncStore[k] = v;
  });
  await stable.setStableId(STABLE_B);
  await expect(stable.getStableId()).resolves.toBe(STABLE_B);
  const persistLine = traceLines(warn).find((line) => line.includes('persist result'));
  expect(persistLine).toContain('"outcome":"secure_authoritative"');

  AS.setItem.mockImplementation(async (k: string, v: string) => { asyncStore[k] = v; });
  await expect(coldStart()).resolves.toBe(STABLE_B);
  expect(asyncStore[ASYNC_KEY]).toBe(STABLE_B);
});

test('both layers refuse → explicit failure, nothing half-switched in memory', async () => {
  secureStore[SECURE_KEY] = STABLE_A;
  asyncStore[ASYNC_KEY] = STABLE_A;
  const stable = require('../app/stable_id');
  await stable.getStableId();
  breakSecureWrites();
  asyncMock().setItem.mockImplementation(async () => { throw new Error('sqlite_full'); });

  await expect(stable.setStableId(STABLE_B)).rejects.toThrow('stable_id_persist_failed');
  expect(stable.peekStableId()).toBeNull();
  const persistLine = traceLines(warn).find((line) => line.includes('persist result'));
  expect(persistLine).toContain('"outcome":"failed"');
  expect(mockPersisted).toContain('[PROFILE-FLIP] persist result');
});

test('unmarked divergence (devices broken before the fix) keeps SecureStore, repairs AsyncStorage and logs layersDiverge', async () => {
  secureStore[SECURE_KEY] = STABLE_A;
  asyncStore[ASYNC_KEY] = STABLE_B;
  await expect(coldStart()).resolves.toBe(STABLE_A);
  expect(asyncStore[ASYNC_KEY]).toBe(STABLE_A);
  const diverge = traceLines(warn).find((line) => line.includes('startup layersDiverge'));
  expect(diverge).toContain('"chosen":"secure"');
  expect(diverge).toContain('"reason":"no_marker"');
  expect(diverge).not.toContain(STABLE_A);
  expect(diverge).not.toContain(STABLE_B);
});

test('a marker that does not match the AsyncStorage value is ignored (no stale override)', async () => {
  secureStore[SECURE_KEY] = STABLE_C;
  asyncStore[ASYNC_KEY] = STABLE_A;
  asyncStore[STALE_MARKER_KEY] = STABLE_B;
  await expect(coldStart()).resolves.toBe(STABLE_C);
  const diverge = traceLines(warn).find((line) => line.includes('startup layersDiverge'));
  expect(diverge).toContain('"reason":"marker_mismatch"');
  expect(asyncStore[STALE_MARKER_KEY]).toBeUndefined();
});

test('ownership-only read (recovery/quarantine) follows the same marker rule', async () => {
  secureStore[SECURE_KEY] = STABLE_A;
  asyncStore[ASYNC_KEY] = STABLE_B;
  asyncStore[STALE_MARKER_KEY] = STABLE_B;
  jest.resetModules();
  const stable = require('../app/stable_id');
  await expect(stable.readExistingStableId()).resolves.toBe(STABLE_B);
});

test('clearStableId removes the marker together with both layers', async () => {
  secureStore[SECURE_KEY] = STABLE_A;
  asyncStore[ASYNC_KEY] = STABLE_B;
  asyncStore[STALE_MARKER_KEY] = STABLE_B;
  jest.resetModules();
  const stable = require('../app/stable_id');
  await stable.clearStableId();
  expect(asyncStore[STALE_MARKER_KEY]).toBeUndefined();
  expect(asyncStore[ASYNC_KEY]).toBeUndefined();
  expect(secureStore[SECURE_KEY]).toBeUndefined();
});
