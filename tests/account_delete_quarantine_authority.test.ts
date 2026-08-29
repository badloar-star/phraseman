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
    phase: 'old_stable_cleared',
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

test('historical v1 mirror without phase migrates before durable server enqueue', async () => {
  const asyncStorage = require('@react-native-async-storage/async-storage');
  await asyncStorage.setItem(MIRROR_KEY, JSON.stringify({
    providerUid: 'deleted-provider',
    stableId: 'deleted-stable',
    createdAt: 1_000,
    expiresAt: 10_000,
  }));
  const quarantine = require('../app/account_delete_quarantine');

  const raw = await quarantine.readAccountDeletePendingAuthRaw();

  expect(JSON.parse(raw).phase).toBe('local_data_cleared');
});

test('server_enqueued is a durable parsed phase distinct from old_stable_cleared', async () => {
  const secure = require('expo-secure-store');
  secure.__rows[RECORD_KEY] = JSON.stringify(lock({ phase: 'server_enqueued' }));
  secure.__rows[ANCHOR_KEY] = JSON.stringify(anchor());
  const quarantine = require('../app/account_delete_quarantine');

  const raw = await quarantine.readAccountDeletePendingAuthRaw();

  expect(JSON.parse(raw).phase).toBe('server_enqueued');
});

test('post-signout phases block only the retired provider and never a fresh anonymous identity', () => {
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

test('legacy local_cleared secure record migrates before durable server enqueue', async () => {
  const secure = require('expo-secure-store');
  secure.__rows[RECORD_KEY] = JSON.stringify(lock({ phase: 'local_cleared' }));
  secure.__rows[ANCHOR_KEY] = JSON.stringify(anchor());
  const quarantine = require('../app/account_delete_quarantine');

  const raw = await quarantine.readAccountDeletePendingAuthRaw();

  expect(JSON.parse(raw).phase).toBe('local_data_cleared');
});

test('transition phases advance exactly once and preserve the immutable retired anchor', async () => {
  const quarantine = require('../app/account_delete_quarantine');
  const prepared = lock({ phase: 'prepared' });
  await expect(quarantine.persistAccountDeletePendingAuthLock(prepared)).resolves.toBe(true);

  const advanced = await quarantine.advanceAccountDeletePendingAuthLock(
    prepared,
    'local_data_cleared',
  );

  expect(advanced).toMatchObject({ ok: true, lock: { phase: 'local_data_cleared' } });
  await expect(quarantine.advanceAccountDeletePendingAuthLock(
    prepared,
    'server_enqueued',
  )).resolves.toEqual({ ok: false, code: 'transition_phase_conflict' });
  const secure = require('expo-secure-store');
  expect(JSON.parse(secure.__rows[ANCHOR_KEY])).toEqual(anchor());
});

test('concurrent identical phase advances join one durable write and cannot regress a later phase', async () => {
  const secure = require('expo-secure-store');
  const quarantine = require('../app/account_delete_quarantine');
  const prepared = lock({ phase: 'prepared' });
  await expect(quarantine.persistAccountDeletePendingAuthLock(prepared)).resolves.toBe(true);
  let releaseFirstWrite!: () => void;
  let delayed = false;
  secure.setItemAsync.mockImplementation(async (key: string, value: string) => {
    if (!delayed && key === RECORD_KEY && value.includes('"phase":"local_data_cleared"')) {
      delayed = true;
      await new Promise<void>((resolve) => { releaseFirstWrite = resolve; });
    }
    secure.__rows[key] = value;
  });

  const first = quarantine.advanceAccountDeletePendingAuthLock(prepared, 'local_data_cleared');
  for (let attempt = 0; attempt < 20 && !releaseFirstWrite; attempt += 1) await Promise.resolve();
  const retry = quarantine.advanceAccountDeletePendingAuthLock(prepared, 'local_data_cleared');
  await Promise.resolve();
  const phaseWriteCount = secure.setItemAsync.mock.calls.filter(
    ([key, value]: [string, string]) => key === RECORD_KEY && value.includes('"phase":"local_data_cleared"'),
  ).length;
  expect(phaseWriteCount).toBe(1);

  releaseFirstWrite();
  const [firstResult, retryResult] = await Promise.all([first, retry]);
  expect(firstResult).toEqual(expect.objectContaining({
    ok: true,
    lock: expect.objectContaining({ phase: 'local_data_cleared' }),
  }));
  expect(retryResult).toEqual(firstResult);
  const serverEnqueued = await quarantine.advanceAccountDeletePendingAuthLock(
    firstResult.lock,
    'server_enqueued',
  );
  expect(serverEnqueued).toMatchObject({ ok: true, lock: { phase: 'server_enqueued' } });
  expect(JSON.parse(secure.__rows[RECORD_KEY]).phase).toBe('server_enqueued');
});

test('fresh identity proofs are required and cannot reuse a retired anchor', async () => {
  const quarantine = require('../app/account_delete_quarantine');
  const oldCleared = lock({ phase: 'old_stable_cleared' });
  await expect(quarantine.persistAccountDeletePendingAuthLock(oldCleared)).resolves.toBe(true);

  await expect(quarantine.advanceAccountDeletePendingAuthLock(
    oldCleared,
    'anonymous_authenticated',
    { freshAuthUid: 'deleted-provider', freshStableId: 'fresh-stable' },
  )).resolves.toEqual({ ok: false, code: 'transition_retired_auth_reuse' });
  await expect(quarantine.advanceAccountDeletePendingAuthLock(
    oldCleared,
    'anonymous_authenticated',
    { freshAuthUid: 'fresh-auth', freshStableId: 'deleted-stable' },
  )).resolves.toEqual({ ok: false, code: 'transition_retired_stable_reuse' });
});

test('stable-only remote guard never self-blocks the fresh live provider uid', () => {
  const quarantine = require('../app/account_delete_quarantine');
  const raw = JSON.stringify(lock({
    providerUid: 'stable-only:retired-stable',
    retiredSubject: 'stable',
    source: 'remote',
    phase: 'server_enqueued',
  }));

  expect(quarantine.shouldQuarantineAccountDeleteIdentity(
    raw,
    { uid: 'fresh-live-provider', isAnonymous: false },
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

test('terminal clear deletes anchor before ready record and never reconstructs prepared after a crash cut', async () => {
  const secure = require('expo-secure-store');
  const asyncStorage = require('@react-native-async-storage/async-storage');
  const quarantine = require('../app/account_delete_quarantine');
  const ready = lock({
    phase: 'ready',
    freshAuthUid: 'fresh-auth',
    freshStableId: 'fresh-stable',
    cleanupAuthorized: true,
  });
  await expect(quarantine.persistAccountDeletePendingAuthLock(ready)).resolves.toBe(true);
  expect(JSON.parse(secure.__rows[ANCHOR_KEY])).toMatchObject({
    version: 3,
    terminalPhase: 'ready',
    freshAuthUid: 'fresh-auth',
    freshStableId: 'fresh-stable',
    cleanupAuthorized: true,
  });
  secure.deleteItemAsync.mockImplementation(async (key: string) => {
    if (key === RECORD_KEY) throw new Error('crash cut point');
    delete secure.__rows[key];
  });

  await expect(quarantine.clearAccountDeletePendingAuthLock()).rejects.toThrow('crash cut point');
  expect(await asyncStorage.getItem(MIRROR_KEY)).toBeNull();
  const raw = await quarantine.readAccountDeletePendingAuthRaw();
  expect(JSON.parse(raw)).toMatchObject({
    phase: 'ready',
    freshAuthUid: 'fresh-auth',
    freshStableId: 'fresh-stable',
    cleanupAuthorized: true,
  });
});

test('ready record without anchor resumes terminal clear without wiping or creating another identity', async () => {
  const secure = require('expo-secure-store');
  const quarantine = require('../app/account_delete_quarantine');
  secure.__rows[RECORD_KEY] = JSON.stringify(lock({
    phase: 'ready',
    freshAuthUid: 'fresh-auth',
    freshStableId: 'fresh-stable',
    cleanupAuthorized: true,
  }));
  const parsed = JSON.parse(await quarantine.readAccountDeletePendingAuthRaw());
  const wipeLocal = jest.fn(async () => true);
  const authenticateAnonymously = jest.fn(async () => ({
    ok: true,
    authUid: 'another-auth',
    stableId: 'another-stable',
    isAnonymous: true,
  }));
  const clearTransition = jest.fn(async () => true);

  await expect(quarantine.runPostDeleteFreshIdentityTransition(parsed, {
    wipeLocal,
    enqueueDeletion: jest.fn(async () => true),
    signOutProvider: jest.fn(async () => true),
    clearOldStable: jest.fn(async () => true),
    authenticateAnonymously,
    linkAuthoritatively: jest.fn(async () => ({ ok: true, authUid: '', stableId: '' })),
    adoptAuthoritativeStable: jest.fn(async () => true),
    beginAccountGeneration: jest.fn(),
    persistPhase: jest.fn(),
    clearTransition,
    emitReady: jest.fn(),
  })).resolves.toEqual({
    status: 'ready',
    authUid: 'fresh-auth',
    stableId: 'fresh-stable',
  });
  expect(wipeLocal).not.toHaveBeenCalled();
  expect(authenticateAnonymously).not.toHaveBeenCalled();
  expect(clearTransition).toHaveBeenCalledTimes(1);
});
