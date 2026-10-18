/*
 * AA S2b, пункты 9 и 12, через настоящий app/cloud_sync.ts:
 *  - nonce M-1 уходит в authEnsureStableLink и authMergeStableAccounts для того
 *    же stableId, не уходит для чужого, стирается после слияния, не попадает
 *    ни в AsyncStorage, ни в SecureStore, ни в консоль; без nonce (старый
 *    сервер) всё работает по-старому;
 *  - stable_auth_link_cache_v1 читается из хранилища один раз за холодный
 *    старт, дальше — из памяти снапшота (замер до/после).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ensureStableAuthLinkForStableIdDetailed,
  mergeStableAccountsViaServer,
  resetAnonAuthCacheForSignOut,
} from '../app/cloud_sync';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';
import {
  ANON_MERGE_NONCE_TTL_MS,
  acceptAnonMergeStampResponse,
  anonMergeNonceCountForTests,
  forgetAllAnonMergeNonces,
  peekAnonMergeNonce,
} from '../modules/account-authority-v2/account_authority_anon_merge_nonce';
import { resetStorageSnapshotForTests } from '../app/storage_snapshot';
import '../app/async_storage_null_bind_guard';

const SECRET = ['fixture', 'merge', 'marker'].join('-');
const CACHE_KEY = 'stable_auth_link_cache_v1';

const mockCallable = jest.fn(async (name: string, _data: Record<string, unknown>) => {
  if (name === 'authMergeStableAccounts') {
    return { data: { ok: true, canonicalStableId: 'stable-local', mergedFromStableId: 'stable-remote' } };
  }
  return { data: { ok: true, stableUid: 'stable-local', authUid: 'provider-a', identityReady: true } };
});
const mockSecureSet = jest.fn(async (_key: string, _value: string) => undefined);

jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false, IS_STORE_RELEASE: false }));
jest.mock('../app/user_id_policy', () => ({
  getAuthUserId: jest.fn(() => 'provider-a'),
  getCanonicalUserId: jest.fn(async () => 'stable-local'),
}));
jest.mock('../app/stable_id', () => ({ setStableId: jest.fn(async () => undefined) }));
jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => ({ currentUser: { uid: 'provider-a', isAnonymous: false } }),
}));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn((_functions: unknown, name: string) => (data: Record<string, unknown>) => mockCallable(name, data)),
}));
jest.mock('expo-secure-store', () => ({
  setItemAsync: (key: string, value: string) => mockSecureSet(key, value),
  getItemAsync: jest.fn(async () => null),
  deleteItemAsync: jest.fn(async () => undefined),
}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage> & { __reset?: () => void };
const metadata = { provider: 'google' as const, email: null, displayName: null, lastSignInAt: 1, devicePlatform: 'android' as const };

function callsTo(name: string): Array<Record<string, unknown>> {
  return mockCallable.mock.calls.filter(([callName]) => callName === name).map(([, data]) => data);
}

describe('AA S2b — anon merge nonce through cloud_sync (пункт 9)', () => {
  let consoleSpies: jest.SpyInstance[] = [];
  beforeEach(() => {
    storage.__reset?.();
    resetStorageSnapshotForTests();
    jest.clearAllMocks();
    __resetAccountGenerationForTests();
    beginAccountGeneration('stable-local');
    resetAnonAuthCacheForSignOut();
    forgetAllAnonMergeNonces('tests');
    consoleSpies = (['log', 'info', 'warn', 'error', 'debug'] as const)
      .map((method) => jest.spyOn(console, method).mockImplementation(() => undefined));
  });
  afterEach(() => {
    for (const spy of consoleSpies) spy.mockRestore();
  });

  test('the same stableId gets the nonce in ensureLink and merge; another stableId does not; merge clears it', async () => {
    expect(acceptAnonMergeStampResponse('stable-local', { data: { ok: true, stableUid: 'stable-local', mergeNonce: SECRET } }))
      .toBe('issued');

    await ensureStableAuthLinkForStableIdDetailed('stable-local', metadata);
    await ensureStableAuthLinkForStableIdDetailed('stable-remote', metadata);
    await mergeStableAccountsViaServer('stable-local', 'stable-remote');

    const links = callsTo('authEnsureStableLink');
    expect(links[0]).toMatchObject({ stableId: 'stable-local', anonMergeNonce: SECRET });
    expect(links[1]).toMatchObject({ stableId: 'stable-remote' });
    expect(links[1]).not.toHaveProperty('anonMergeNonce');
    expect(callsTo('authMergeStableAccounts')[0]).toEqual({
      stableIdA: 'stable-local', stableIdB: 'stable-remote', anonMergeNonce: SECRET, clientMergeContract: 2,
    });
    expect(anonMergeNonceCountForTests()).toBe(0);
    expect(peekAnonMergeNonce('stable-local')).toBeNull();
  });

  test('the nonce never reaches AsyncStorage, SecureStore or the console', async () => {
    const setItem = jest.spyOn(AsyncStorage, 'setItem');
    const multiSet = jest.spyOn(AsyncStorage, 'multiSet');
    acceptAnonMergeStampResponse('stable-local', { data: { ok: true, mergeNonce: SECRET } });
    await ensureStableAuthLinkForStableIdDetailed('stable-local', metadata);
    await mergeStableAccountsViaServer('stable-remote', 'stable-local');

    const written = JSON.stringify([setItem.mock.calls, multiSet.mock.calls, mockSecureSet.mock.calls]);
    expect(setItem).toHaveBeenCalled();
    expect(written).not.toContain(SECRET);
    const printed = JSON.stringify(consoleSpies.map((spy) => spy.mock.calls));
    expect(printed).toContain('anon_merge_nonce');
    expect(printed).not.toContain(SECRET);
  });

  test('an old server without mergeNonce keeps the legacy path: no nonce field anywhere', async () => {
    expect(acceptAnonMergeStampResponse('stable-local', { data: { ok: true, stableUid: 'stable-local' } })).toBe('absent');
    await expect(ensureStableAuthLinkForStableIdDetailed('stable-local', metadata)).resolves.toMatchObject({ ok: true });
    await expect(mergeStableAccountsViaServer('stable-local', 'stable-remote')).resolves.toMatchObject({ ok: true });
    expect(callsTo('authEnsureStableLink')[0]).not.toHaveProperty('anonMergeNonce');
    // зачем (владелец 18.10, правило 2): новый клиент всегда шлёт договор слияния 2.
    expect(callsTo('authMergeStableAccounts')[0]).toEqual({ stableIdA: 'stable-local', stableIdB: 'stable-remote', clientMergeContract: 2 });
  });

  test('the nonce expires after 10 minutes and is not sent', async () => {
    const issuedAt = Date.now() - ANON_MERGE_NONCE_TTL_MS - 1;
    acceptAnonMergeStampResponse('stable-local', { data: { ok: true, mergeNonce: SECRET } }, issuedAt);
    await ensureStableAuthLinkForStableIdDetailed('stable-local', metadata);
    expect(callsTo('authEnsureStableLink')[0]).not.toHaveProperty('anonMergeNonce');
    expect(anonMergeNonceCountForTests()).toBe(0);
  });

  test('a malformed nonce is ignored (works without it)', () => {
    expect(acceptAnonMergeStampResponse('stable-local', { data: { mergeNonce: 'x'.repeat(129) } })).toBe('invalid');
    expect(acceptAnonMergeStampResponse('stable-local', { data: { mergeNonce: 42 } })).toBe('invalid');
    expect(anonMergeNonceCountForTests()).toBe(0);
  });
});

describe('AA S2b — stable_auth_link_cache_v1 through the storage snapshot (пункт 12)', () => {
  beforeEach(() => {
    storage.__reset?.();
    resetStorageSnapshotForTests();
    jest.clearAllMocks();
    __resetAccountGenerationForTests();
    beginAccountGeneration('stable-local');
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  test('cold start: 16 consumers read the key from storage once, then from memory', async () => {
    resetAnonAuthCacheForSignOut();
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ key: 'stable-local:provider-a', linkedAt: Date.now() }));
    resetStorageSnapshotForTests();
    const getItem = jest.spyOn(AsyncStorage, 'getItem');

    for (let consumer = 0; consumer < 16; consumer += 1) {
      await expect(ensureStableAuthLinkForStableIdDetailed('stable-local')).resolves.toMatchObject({ ok: true, source: 'cache' });
    }

    const storageReads = getItem.mock.calls.filter(([key]) => key === CACHE_KEY).length;
    // Замер для отчёта: до S2b было 16 чтений (по одному на потребителя).
    console.log(`[AA-S2B-MEASURE] stable_auth_link_cache_v1 storage reads on cold start = ${storageReads}`);
    expect(storageReads).toBe(1);
    expect(callsTo('authEnsureStableLink')).toHaveLength(0);
  });

  test('write goes through the snapshot: the fresh link is served from memory without a storage read', async () => {
    resetAnonAuthCacheForSignOut();
    const getItem = jest.spyOn(AsyncStorage, 'getItem');
    await ensureStableAuthLinkForStableIdDetailed('stable-local', metadata);
    await new Promise((resolve) => setImmediate(resolve));
    const readsAfterWrite = getItem.mock.calls.filter(([key]) => key === CACHE_KEY).length;
    await expect(ensureStableAuthLinkForStableIdDetailed('stable-local')).resolves.toMatchObject({ source: 'cache' });
    expect(getItem.mock.calls.filter(([key]) => key === CACHE_KEY).length).toBe(readsAfterWrite);
    await expect(AsyncStorage.getItem(CACHE_KEY)).resolves.toContain('stable-local:provider-a');
  });

  test('sign-out removal is never served stale from memory', async () => {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ key: 'stable-local:provider-a', linkedAt: Date.now() }));
    await ensureStableAuthLinkForStableIdDetailed('stable-local');
    resetAnonAuthCacheForSignOut();
    await new Promise((resolve) => setImmediate(resolve));
    mockCallable.mockClear();
    await ensureStableAuthLinkForStableIdDetailed('stable-local');
    expect(callsTo('authEnsureStableLink')).toHaveLength(1);
  });
});
