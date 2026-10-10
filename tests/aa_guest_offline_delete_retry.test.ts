// ════════════════════════════════════════════════════════════════════════════
// aa_guest_offline_delete_retry.test.ts — пакет TG-F5939EAC5D97 (🔴 релиза).
//
// Живой прогон 10.10 22:05: гость удалил аккаунт БЕЗ сети → телефон стёрт →
// при перезапуске с сетью удаление серверных данных так и не дожалось
// (`enqueue_retry` не было), а замок удаления выбросили как «сломанный»
// (`disagreement anchorV=3 phase=stable_link_verified`). Плюс необработанный
// отказ `Uncaught (in promise) UNAVAILABLE`.
//
// Поведенческий сценарий настоящего app/auth_provider.ts (натив замокан как в
// aa_guest_server_delete.test.ts):
//   1. сети нет: постановка и прямой вызов падают UNAVAILABLE;
//   2. «перезапуск» (новый реестр модулей, тот же SecureStore/AsyncStorage),
//      сеть есть: старт обязан отправить постановку с ключом;
//   3. повтор упал — замок остаётся до следующего старта;
//   4. чтение замка во время записи (между якорем и записью) не выбрасывает замок;
//   5. ни одного необработанного (даже поздно обработанного) отказа промиса.
// Диагностика ([ACC-MUT], [ACCOUNT-DELETE-GUARD]) дописывается в файл, если задан
// AA_DUMP — так снят «Факт воспроизведения» для пакета.
// ════════════════════════════════════════════════════════════════════════════

process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'test-web-client-id.apps.googleusercontent.com';
jest.setTimeout(20_000);

jest.mock('expo-linking', () => ({
  createURL: jest.fn((p: string) => `phraseman://${p}`),
  parse: jest.fn(() => ({ queryParams: {} })),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  openURL: jest.fn(async () => {}),
}), { virtual: true });
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(async () => ({ type: 'cancel' })),
  dismissAuthSession: jest.fn(),
}), { virtual: true });
jest.mock('../app/phone_state_bootstrap', () => ({
  retirePhoneStateAfterDeletion: async () => {},
}));

const expoGetRandomBytesAsyncImpl = jest.fn<Promise<Uint8Array>, [number]>();
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  CryptoEncoding: { HEX: 'hex' },
  getRandomBytesAsync: (length: number) => expoGetRandomBytesAsyncImpl(length),
  digestStringAsync: async (_algorithm: string, value: string) => `sha256:${value}`,
  randomUUID: () => 'test-random-uuid',
}));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: () => undefined,
    hasPlayServices: async () => true,
    signIn: async () => ({ type: 'cancelled' }),
    signOut: async () => undefined,
  },
}), { virtual: true });
jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  signInAsync: async () => { throw new Error('not used'); },
}), { virtual: true });

type EnqueueAck = {
  ok: true; jobId: string; status: 'queued'; created: boolean; authReleased: true; credentialSafe: true;
};
type DirectAck = { ok: true; authDeleted: boolean };
type Operation<T> = { dispatchSettled: Promise<void>; acknowledgment: Promise<T> };

const okAck = (): EnqueueAck => ({
  ok: true, jobId: 'job-guest', status: 'queued', created: true, authReleased: true, credentialSafe: true,
});

/** Состояние «сети» сценария: без сети каждый серверный вызов падает UNAVAILABLE. */
const network = { online: true };
const unavailable = (): Error => new Error('UNAVAILABLE');
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const enqueueAck = jest.fn<Promise<EnqueueAck>, [string | null]>();
const startCloudDeletionEnqueue = jest.fn((stableId: string | null, _proof?: unknown): Operation<EnqueueAck> => {
  authCalls().push('enqueue');
  return { dispatchSettled: Promise.resolve(), acknowledgment: enqueueAck(stableId) };
});
const directAck = jest.fn<Promise<DirectAck>, [string | null]>();
const startCloudDeletionDirect = jest.fn((stableId: string | null): Operation<DirectAck> => {
  authCalls().push('direct');
  return { dispatchSettled: Promise.resolve(), acknowledgment: directAck(stableId) };
});
const waitForAccountDeletionCredentialSafe = jest.fn<Promise<boolean>, unknown[]>();
const wipeLocalAccountData = jest.fn(async () => {});
let mockStableId: string | null = 'local-stable-id';
const ensureTestStableId = (): string => {
  if (!mockStableId) mockStableId = 'rotated-stable-id';
  return mockStableId;
};

jest.mock('../app/cloud_sync', () => ({
  SYNC_KEYS: ['user_total_xp'],
  ensureAnonUser: async () => ensureTestStableId(),
  // Без сети новый анонимный вход невозможен — как на живом прогоне.
  ensureAnonIdentityDetailed: async () => (network.online
    ? {
      ok: true as const,
      authUid: authState.anonUid,
      stableId: ensureTestStableId(),
      isAnonymous: true as const,
    }
    : { ok: false as const, failure: 'network_unavailable' }),
  waitForAnonAuth: async () => true,
  syncToCloud: async () => undefined,
  restoreFromCloud: async () => undefined,
  restoreFromCloudDetailed: async () => 'restored',
  forceSyncToCloud: async () => true,
  quiesceSyncBeforeStableIdSwap: async () => undefined,
  // зачем: на живом прогоне между запуском постановки (быстрая фаза) и подпиской
  // фона на её ответ проходили секунды (уведомления, push-токен, дренажи). Пауза
  // здесь даёт отказу сети случиться ДО подписки — как на телефоне.
  quiesceCloudSyncForAccountTransition: async () => { await delay(15); return true; },
  enqueueCloudDeletion: async () => okAck(),
  startCloudDeletionEnqueue: (...a: unknown[]) => (startCloudDeletionEnqueue as any)(...a),
  startCloudDeletionDirect: (...a: unknown[]) => (startCloudDeletionDirect as any)(...a),
  waitForAccountDeletionCredentialSafe: (...a: unknown[]) => waitForAccountDeletionCredentialSafe(...a),
  wipeLocalAccountData: () => wipeLocalAccountData(),
  deleteCloudData: async () => undefined,
  resetAnonAuthCacheForSignOut: () => undefined,
  ensureStableAuthLinkForStableIdDetailed: async (stableId: string) => (network.online
    ? { ok: true, stableUid: stableId, authUid: authState.anonUid, source: 'server' }
    : { ok: false, stableUid: null, authUid: null, source: 'offline' }),
  mergeStableAccountsViaServer: async () => null,
  saveAccountSwitchEmergencyBackup: async () => true,
  readAccountSwitchEmergencyBackupSummary: async () => null,
  shelveAccountSwitchEmergencyBackupOf: async () => true,
  pruneShelvedAccountSwitchBackups: async () => 0,
  accountOwnedStorageKeysFrom: (keys: readonly string[]) => Array.from(new Set(['user_total_xp', ...keys])),
  isAccountLocalJournalStorageKey: () => false,
}));

jest.mock('../app/stable_id', () => ({
  getStableId: async () => ensureTestStableId(),
  setStableId: async (v: string) => { mockStableId = v; },
  clearStableId: async () => { mockStableId = null; },
  peekStableId: () => mockStableId,
  readExistingStableId: async () => mockStableId,
}));
jest.mock('../app/premium_guard', () => ({
  invalidatePremiumCache: () => undefined,
  beginPremiumAccountTransition: () => undefined,
  waitForPremiumAccountWorkIdleWithDeadline: async () => true,
}));
jest.mock('../app/shards_system', () => ({
  loadShardsFromCloud: async () => undefined,
  forceSyncShardsToCloud: async () => undefined,
  preparePendingShardDeltasForAccountSwitch: async () => ({
    resolved: 0, pending: 0, pendingEarn: 0, pendingSpend: 0, ownerStableId: mockStableId, stale: false,
  }),
}));
jest.mock('../app/shards_delta_queue', () => ({
  readShardDeltaQueue: async () => [],
  hasQuarantinedShardDeltaQueue: async () => false,
}));
jest.mock('../app/firebase', () => ({ logEvent: () => undefined, recordError: () => undefined }));
jest.mock('../app/app_health', () => ({ logAppError: () => undefined }));
jest.mock('../app/events', () => ({ emitAppEvent: () => undefined }));
jest.mock('../app/target_storage_keys', () => ({ unlockedLessonsKey: (t: string) => `unlocked_lessons_${t}` }));
jest.mock('../app/account_delete_timeout', () => ({
  ACCOUNT_DELETE_CALLABLE_TIMEOUT_MS: 15000,
  ACCOUNT_DELETE_ENQUEUE_TIMEOUT_MS: 8000,
  runAccountDeleteEnqueueWithDeadline: async (_warm: unknown, call: () => Promise<unknown>) => call(),
}));
jest.mock('../app/account_generation', () => ({
  beginAccountGeneration: () => undefined,
  subscribeAccountGeneration: () => ({ remove: () => undefined }),
  captureAccountGeneration: () => ({ generation: 1, stableId: mockStableId, phase: 'active' }),
  invalidateAccountGeneration: () => undefined,
  isCurrentAccountGeneration: () => true,
  waitForRestoreApplicationIdleWithDeadline: async () => true,
  withAccountTransitionLock: async (work: (lease: unknown) => Promise<unknown>) => (
    work({ generation: 1, stableId: mockStableId, phase: 'transitioning' })
  ),
  withAccountTransitionLockWithDeadline: async (work: (lease: unknown) => Promise<unknown>) => ({
    completed: true,
    value: await work({ generation: 1, stableId: mockStableId, phase: 'transitioning' }),
  }),
}));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: () => async () => ({}),
}), { virtual: true });
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const authFactory = require('@react-native-firebase/auth');
const originalAuthFactoryDefault = authFactory.default;
const authState = authFactory.__testState as {
  calls: string[];
  isAnonymous: boolean;
  anonUid: string;
  providerUid: string;
};
function authCalls(): string[] {
  return authState.calls;
}

// SecureStore — общий на все «запуски» (как Keychain телефона): модуль замка
// берёт его ленивым require уже вне isolateModules.
type SecureStoreMock = {
  getItemAsync: jest.Mock;
  setItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
  __reset(): void;
};
const secureStore = require('expo-secure-store') as SecureStoreMock;
const secureOriginalSet = secureStore.setItemAsync.getMockImplementation()!;

const SECURE_RECORD_KEY = 'account_delete_pending_auth_v2';
const SECURE_ANCHOR_KEY = 'account_delete_pending_auth_anchor_v2';
const MIRROR_KEY = 'account_delete_pending_auth_v1';

type Loaded = {
  auth: typeof import('../app/auth_provider');
  quarantine: typeof import('../app/account_delete_quarantine');
  asyncStorage: { getItem(k: string): Promise<string | null>; setItem(k: string, v: string): Promise<void> };
};

/** «Запуск приложения»: новый реестр модулей; AsyncStorage засеваем тем, что осталось на телефоне. */
function launchApp(asyncSeed: Record<string, string> = {}): Loaded {
  let loaded!: Loaded;
  jest.isolateModules(() => {
    const asyncStorage = require('@react-native-async-storage/async-storage');
    for (const [key, value] of Object.entries(asyncSeed)) void asyncStorage.setItem(key, value);
    loaded = {
      auth: require('../app/auth_provider'),
      quarantine: require('../app/account_delete_quarantine'),
      asyncStorage,
    };
  });
  return loaded;
}

/** В моке Firebase после выхода гость остаётся тем же uid — в жизни приходит новый аноним. */
function rotateAnonUidOnSignOut(): void {
  authFactory.default = Object.assign(
    () => {
      const base = originalAuthFactoryDefault();
      const wrapped = {
        ...base,
        signOut: async () => {
          await base.signOut();
          authState.anonUid = 'anon-uid-fresh';
        },
      };
      Object.defineProperty(wrapped, 'currentUser', {
        get: () => (authState.anonUid === 'anon-uid-fresh'
          ? { ...base.currentUser, uid: 'anon-uid-fresh', isAnonymous: true }
          : base.currentUser),
      });
      return wrapped;
    },
    originalAuthFactoryDefault,
  );
}

async function readSecurePhase(): Promise<{ record: string | null; anchorVersion: number | null }> {
  const recordRaw = await secureStore.getItemAsync(SECURE_RECORD_KEY);
  const anchorRaw = await secureStore.getItemAsync(SECURE_ANCHOR_KEY);
  return {
    record: recordRaw ? (JSON.parse(recordRaw) as { phase: string }).phase : null,
    anchorVersion: anchorRaw ? (JSON.parse(anchorRaw) as { version: number }).version : null,
  };
}

/**
 * Параллельный читатель замка в момент записи (как getStableId → проверка замка
 * на старте): срабатывает сразу после записи якоря нужной версии, ДО записи самой
 * записи. Запись записи «медленная» (натив), чтобы окно между половинами было реальным.
 */
function readGuardBetweenAnchorAndRecord(loaded: Loaded, anchorVersion: number): { results: string[] } {
  const box = { results: [] as string[] };
  secureStore.setItemAsync.mockImplementation(async (key: string, value: string) => {
    if (key === SECURE_RECORD_KEY) await delay(5);
    await secureOriginalSet(key, value);
    if (key === SECURE_ANCHOR_KEY && (JSON.parse(value) as { version: number }).version === anchorVersion) {
      consoleLines.push(`[TEST] concurrent_read:start anchorV=${anchorVersion}`);
      void loaded.quarantine.readAccountDeletePendingAuthRaw().then(
        (raw) => {
          const phase = raw ? (JSON.parse(raw) as { phase: string }).phase : 'null';
          box.results.push(phase);
          consoleLines.push(`[TEST] concurrent_read:done phase=${phase}`);
        },
        (e: unknown) => {
          box.results.push(`threw:${String(e)}`);
          consoleLines.push(`[TEST] concurrent_read:threw ${String(e)}`);
        },
      );
    }
  });
  return box;
}

let consoleLines: string[] = [];
let consoleSpies: jest.SpyInstance[] = [];
let unhandled: unknown[] = [];
let lateHandled: unknown[] = [];
const onUnhandled = (reason: unknown) => {
  unhandled.push(reason);
  consoleLines.push(`[TEST] unhandledRejection reason=${String((reason as any)?.message ?? reason)}`);
};
const onHandledLate = (promise: unknown) => {
  lateHandled.push(promise);
  consoleLines.push('[TEST] rejectionHandled (поздний обработчик)');
};

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));
const diagLines = (): string[] => consoleLines.filter((line) => (
  line.includes('[ACC-MUT]') || line.includes('[ACCOUNT-DELETE-GUARD]') || line.includes('[TEST]')
  || line.includes('account_delete_quarantine')
));

function dump(name: string): void {
  const target = process.env.AA_DUMP;
  if (!target) return;
  require('fs').appendFileSync(target, `\n===== ${name} =====\n${diagLines().join('\n')}\n`);
}

beforeEach(() => {
  (globalThis as any).__DEV__ = false;
  authFactory.default = originalAuthFactoryDefault;
  authFactory.__resetTestState();
  authState.isAnonymous = true;
  mockStableId = 'local-stable-id';
  network.online = true;
  consoleLines = [];
  unhandled = [];
  lateHandled = [];
  process.on('unhandledRejection', onUnhandled);
  process.on('rejectionHandled', onHandledLate);
  consoleSpies = (['log', 'warn', 'info', 'error'] as const).map((level) => (
    jest.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      consoleLines.push(args.map(String).join(' '));
    })
  ));
  enqueueAck.mockReset();
  enqueueAck.mockImplementation(async () => {
    if (!network.online) throw unavailable();
    return okAck();
  });
  startCloudDeletionEnqueue.mockClear();
  directAck.mockReset();
  directAck.mockImplementation(async () => {
    if (!network.online) throw unavailable();
    return { ok: true, authDeleted: true };
  });
  startCloudDeletionDirect.mockClear();
  waitForAccountDeletionCredentialSafe.mockReset();
  waitForAccountDeletionCredentialSafe.mockResolvedValue(false);
  wipeLocalAccountData.mockClear();
  require('@react-native-async-storage/async-storage').__reset();
  secureStore.__reset();
  secureStore.setItemAsync.mockImplementation(secureOriginalSet);
  let seed = 0;
  expoGetRandomBytesAsyncImpl.mockReset();
  expoGetRandomBytesAsyncImpl.mockImplementation(async (length: number) => {
    const start = seed;
    seed += length;
    return Uint8Array.from({ length }, (_, index) => (start + index) % 256);
  });
});

afterEach(async () => {
  await settle();
  await delay(30);
  process.off('unhandledRejection', onUnhandled);
  process.off('rejectionHandled', onHandledLate);
  for (const spy of consoleSpies) spy.mockRestore();
});

/** Удаление гостя без сети (как на живом прогоне). */
async function deleteGuestOffline(): Promise<Loaded> {
  rotateAnonUidOnSignOut();
  network.online = false;
  const loaded = launchApp();
  const handoff = await loaded.auth.beginAccountDeletion();
  consoleLines.push(`[TEST] handoff ok=${handoff.ok}`);
  if (!handoff.ok) throw new Error(handoff.reason);
  const result = await handoff.completion;
  consoleLines.push(`[TEST] completion=${JSON.stringify(result)}`);
  await settle();
  await delay(30);
  const after = await readSecurePhase();
  consoleLines.push(`[TEST] after_offline record_phase=${after.record} anchorV=${after.anchorVersion} currentUser=${authFactory.default().currentUser?.uid ?? 'null'} signout_calls=${authCalls().filter((c) => c === 'signout').length}`);
  return loaded;
}

async function restartOnline(previous: Loaded): Promise<Loaded> {
  network.online = true;
  const mirror = await previous.asyncStorage.getItem(MIRROR_KEY);
  return launchApp(mirror ? { [MIRROR_KEY]: mirror } : {});
}

describe('гость удалил аккаунт без сети → повтор на сервере при старте с сетью (TG-F5939EAC5D97)', () => {
  test('старт с сетью отправляет постановку с ключом; новая личность выдаётся после неё', async () => {
    const offline = await deleteGuestOffline();
    // Без сети сервер не получил ничего, а телефон стёрт сразу.
    expect(wipeLocalAccountData).toHaveBeenCalled();
    const enqueueBefore = startCloudDeletionEnqueue.mock.calls.length;

    const restarted = await restartOnline(offline);
    const concurrent = readGuardBetweenAnchorAndRecord(restarted, 3);
    const fresh = await restarted.auth.ensureFreshPostDeletionIdentity('startup');
    consoleLines.push(`[TEST] restart fresh=${JSON.stringify(fresh)}`);
    await settle();
    await delay(30);
    const afterRestart = await readSecurePhase();
    consoleLines.push(`[TEST] after_restart record_phase=${afterRestart.record} anchorV=${afterRestart.anchorVersion}`);
    dump('online_retry');

    const retryCalls = startCloudDeletionEnqueue.mock.calls.slice(enqueueBefore);
    expect(retryCalls).toHaveLength(1);
    expect(retryCalls[0][0]).toBe('local-stable-id');
    expect(retryCalls[0][1]).toEqual({
      operationId: expect.any(String),
      capability: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(diagLines()).toEqual(expect.arrayContaining([
      expect.stringContaining('delete:anon_server=enqueue_retry ack=ok'),
    ]));
    // Постановка ушла от старого гостя, и только ПОСЛЕ неё — выход и новая личность.
    const calls = authCalls();
    expect(calls.lastIndexOf('enqueue')).toBeLessThan(calls.lastIndexOf('signout'));
    expect(fresh.status).toBe('ready');
    // Чтение посреди записи не выбросило замок как «сломанный».
    expect(diagLines().some((line) => line.includes('disagreement'))).toBe(false);
    expect(concurrent.results.length).toBeGreaterThan(0);
    expect(unhandled).toEqual([]);
    expect(lateHandled).toEqual([]);
  });

  test('повтор при старте снова упал → замок остаётся, следующий старт пробует снова', async () => {
    const offline = await deleteGuestOffline();
    const enqueueBefore = startCloudDeletionEnqueue.mock.calls.length;

    // Первый старт: сеть «есть», но сервер ответил отказом.
    const first = await restartOnline(offline);
    enqueueAck.mockImplementationOnce(async () => { throw unavailable(); });
    const firstFresh = await first.auth.ensureFreshPostDeletionIdentity('startup');
    consoleLines.push(`[TEST] first_restart fresh=${JSON.stringify(firstFresh)}`);
    const kept = await readSecurePhase();
    consoleLines.push(`[TEST] after_failed_retry record_phase=${kept.record} anchorV=${kept.anchorVersion}`);

    // Второй старт: сеть есть — постановка уходит.
    const second = await restartOnline(first);
    const secondFresh = await second.auth.ensureFreshPostDeletionIdentity('startup');
    consoleLines.push(`[TEST] second_restart fresh=${JSON.stringify(secondFresh)}`);
    dump('retry_failed_then_ok');

    expect(firstFresh.status).not.toBe('ready');
    expect(kept.record).toBe('local_data_cleared');
    const retryCalls = startCloudDeletionEnqueue.mock.calls.slice(enqueueBefore);
    expect(retryCalls).toHaveLength(2);
    expect(diagLines()).toEqual(expect.arrayContaining([
      expect.stringContaining('delete:anon_server=enqueue_retry ack=failed reason=UNAVAILABLE'),
      expect.stringContaining('delete:anon_server=enqueue_retry ack=ok'),
    ]));
    expect(secondFresh.status).toBe('ready');
    expect(unhandled).toEqual([]);
    expect(lateHandled).toEqual([]);
  });

  test('удаление без сети: ни одного необработанного или поздно обработанного отказа', async () => {
    await deleteGuestOffline();
    dump('offline_only');
    expect(diagLines()).toEqual(expect.arrayContaining([
      expect.stringContaining('delete:anon_server=enqueue ack=failed reason=UNAVAILABLE'),
      expect.stringContaining('delete:anon_server_direct ack=failed reason=UNAVAILABLE'),
    ]));
    expect(unhandled).toEqual([]);
    expect(lateHandled).toEqual([]);
  });
});
