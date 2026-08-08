jest.mock('expo-secure-store');
jest.mock('@react-native-async-storage/async-storage');

const RECORD_KEY = 'account_delete_pending_auth_v2';
const ANCHOR_KEY = 'account_delete_pending_auth_anchor_v2';
const MIRROR_KEY = 'account_delete_pending_auth_v1';

function lock(overrides: Record<string, unknown> = {}) {
  return {
    operationId: 'delete-op-1',
    providerUid: 'deleted-provider',
    stableId: 'deleted-stable',
    source: 'local',
    phase: 'local_cleared',
    createdAt: 1_000,
    expiresAt: 10_000,
    ...overrides,
  };
}

function anchor(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    operationId: 'delete-op-1',
    providerUid: 'deleted-provider',
    deletedStableId: 'deleted-stable',
    source: 'local',
    createdAt: 1_000,
    ...overrides,
  };
}

beforeEach(() => {
  jest.resetModules();
  const secure = require('expo-secure-store');
  secure.__reset();
  secure.getItemAsync.mockReset();
  secure.setItemAsync.mockReset();
  secure.deleteItemAsync.mockReset();
  const secureRows: Record<string, string> = {};
  secure.getItemAsync.mockImplementation(async (key: string) => secureRows[key] ?? null);
  secure.setItemAsync.mockImplementation(async (key: string, value: string) => { secureRows[key] = value; });
  secure.deleteItemAsync.mockImplementation(async (key: string) => { delete secureRows[key]; });
  secure.__rows = secureRows;

  const asyncStorage = require('@react-native-async-storage/async-storage');
  asyncStorage.__reset();
});

test('valid immutable anchor reconstructs a malformed mutable record conservatively as prepared', async () => {
  const secure = require('expo-secure-store');
  secure.__rows[ANCHOR_KEY] = JSON.stringify(anchor());
  secure.__rows[RECORD_KEY] = '{broken';
  const quarantine = require('../app/account_delete_quarantine');

  const raw = await quarantine.readAccountDeletePendingAuthRaw();

  expect(JSON.parse(raw)).toMatchObject({
    operationId: 'delete-op-1',
    providerUid: 'deleted-provider',
    stableId: 'deleted-stable',
    phase: 'prepared',
  });
});

test.each([
  ['missing', null],
  ['malformed', '{broken'],
])('valid mutable record with %s anchor fails closed', async (_case, anchorRaw) => {
  const secure = require('expo-secure-store');
  secure.__rows[RECORD_KEY] = JSON.stringify(lock());
  if (anchorRaw !== null) secure.__rows[ANCHOR_KEY] = anchorRaw;
  const quarantine = require('../app/account_delete_quarantine');

  await expect(quarantine.readAccountDeletePendingAuthRaw()).rejects.toThrow(
    /account_delete_guard_(anchor_required|secure_read_failed)/,
  );
});

test('valid mutable record with unreadable anchor fails closed', async () => {
  const secure = require('expo-secure-store');
  secure.__rows[RECORD_KEY] = JSON.stringify(lock());
  const baseGet = secure.getItemAsync.getMockImplementation();
  secure.getItemAsync.mockImplementation((key: string) => {
    if (key === ANCHOR_KEY) return Promise.reject(new Error('keystore unavailable'));
    return baseGet(key);
  });
  const quarantine = require('../app/account_delete_quarantine');

  await expect(quarantine.readAccountDeletePendingAuthRaw()).rejects.toThrow(
    /account_delete_guard_(anchor_required|secure_read_failed)/,
  );
});

test('matching records are required; disagreement fails closed', async () => {
  const secure = require('expo-secure-store');
  secure.__rows[RECORD_KEY] = JSON.stringify(lock());
  secure.__rows[ANCHOR_KEY] = JSON.stringify(anchor({ deletedStableId: 'other-stable' }));
  const quarantine = require('../app/account_delete_quarantine');

  await expect(quarantine.readAccountDeletePendingAuthRaw()).rejects.toThrow(
    'account_delete_guard_disagreement',
  );
});

test('both unreadable authoritative records fail closed even when AsyncStorage is empty', async () => {
  const secure = require('expo-secure-store');
  secure.getItemAsync.mockRejectedValue(new Error('keystore unavailable'));
  const quarantine = require('../app/account_delete_quarantine');

  await expect(quarantine.readAccountDeletePendingAuthRaw()).rejects.toThrow(
    'account_delete_guard_secure_read_failed',
  );
});

test('historical v1 mirror without phase migrates as local_cleared', async () => {
  const asyncStorage = require('@react-native-async-storage/async-storage');
  await asyncStorage.setItem(MIRROR_KEY, JSON.stringify({
    providerUid: 'deleted-provider',
    stableId: 'deleted-stable',
    createdAt: 1_000,
    expiresAt: 10_000,
  }));
  const quarantine = require('../app/account_delete_quarantine');

  const raw = await quarantine.readAccountDeletePendingAuthRaw();

  expect(JSON.parse(raw).phase).toBe('local_cleared');
});

test('local_cleared blocks only the deleted provider after verified local exit', () => {
  const quarantine = require('../app/account_delete_quarantine');
  const raw = JSON.stringify(lock());

  expect(quarantine.shouldQuarantineAccountDeleteIdentity(
    raw,
    { uid: 'deleted-provider', isAnonymous: false },
    2_000,
  )).toBe(true);
  expect(quarantine.shouldQuarantineAccountDeleteIdentity(
    raw,
    { uid: 'different-provider', isAnonymous: false },
    2_000,
  )).toBe(false);
  expect(quarantine.shouldQuarantineAccountDeleteIdentity(
    raw,
    { uid: 'anon', isAnonymous: true },
    2_000,
  )).toBe(false);
});

test('exact record read-back mismatch rejects guard persistence before deletion can start', async () => {
  const secure = require('expo-secure-store');
  const baseGet = secure.getItemAsync.getMockImplementation();
  secure.getItemAsync.mockImplementation(async (key: string) => {
    if (key === RECORD_KEY) return null;
    return baseGet(key);
  });
  const quarantine = require('../app/account_delete_quarantine');

  await expect(quarantine.persistAccountDeletePendingAuthLock(lock({ phase: 'prepared' }))).resolves.toBe(false);
});

test('anchor rejects a non-string deleted stable id instead of normalizing it to null', async () => {
  const secure = require('expo-secure-store');
  secure.__rows[RECORD_KEY] = JSON.stringify(lock());
  secure.__rows[ANCHOR_KEY] = JSON.stringify(anchor({ deletedStableId: 42 }));
  const quarantine = require('../app/account_delete_quarantine');

  await expect(quarantine.readAccountDeletePendingAuthRaw()).rejects.toThrow(
    'account_delete_guard_anchor_required',
  );
});

test('empty stable id in secure mutable record is malformed and reconstructed prepared from anchor', async () => {
  const secure = require('expo-secure-store');
  secure.__rows[RECORD_KEY] = JSON.stringify(lock({ stableId: '' }));
  secure.__rows[ANCHOR_KEY] = JSON.stringify(anchor());
  const quarantine = require('../app/account_delete_quarantine');

  const raw = await quarantine.readAccountDeletePendingAuthRaw();

  expect(JSON.parse(raw)).toMatchObject({ phase: 'prepared', stableId: 'deleted-stable' });
});

test('clear cut-point cannot re-migrate stale v1 mirror after one secure record was deleted', async () => {
  const secure = require('expo-secure-store');
  const asyncStorage = require('@react-native-async-storage/async-storage');
  const quarantine = require('../app/account_delete_quarantine');
  await expect(quarantine.persistAccountDeletePendingAuthLock(lock({ phase: 'local_cleared' }))).resolves.toBe(true);
  secure.deleteItemAsync.mockImplementation(async (key: string) => {
    if (key === ANCHOR_KEY) throw new Error('crash cut point');
    delete secure.__rows[key];
  });

  await expect(quarantine.clearAccountDeletePendingAuthLock()).rejects.toThrow('crash cut point');
  expect(await asyncStorage.getItem(MIRROR_KEY)).toBeNull();
  const raw = await quarantine.readAccountDeletePendingAuthRaw();
  expect(JSON.parse(raw).phase).toBe('prepared');
});
