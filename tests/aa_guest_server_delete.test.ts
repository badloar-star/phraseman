// ════════════════════════════════════════════════════════════════════════════
// aa_guest_server_delete.test.ts — пакет TG-20707BD701DC (🔴 релиза 2.0.0).
//
// Живой прогон 10.10 (§AA-34, находка 2): гость (анонимный вход) жал «Удалить
// аккаунт», телефон стирался и уходил на онбординг, а запрос на удаление
// серверных данных НЕ уходил никогда: замок удаления гостю не создавался,
// у постановки не было ключа → `account_delete_credential_proof_missing`.
//
// Здесь — ПОВЕДЕНЧЕСКИЕ проверки настоящего app/auth_provider.ts (натив замокан
// так же, как в auth_provider_behavior.test.ts):
//   1. замок записан → постановка accountDeleteEnqueue получает proof;
//   2. замок не записался → прямой accountDeleteMine, пока гость ещё вошедший;
//   3. оба пути не задерживают переход на онбординг (быстрая фаза не ждёт сеть);
//   4. сетевые отказы ловятся — ни одного необработанного отказа промиса;
//   5. после перезапуска гостевой замок дожимается (одна ограниченная попытка),
//      а старт приложения не ждёт квитанцию связанных аккаунтов.
// ════════════════════════════════════════════════════════════════════════════

process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'test-web-client-id.apps.googleusercontent.com';
jest.setTimeout(15_000);

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
  ensureAnonIdentityDetailed: async () => ({
    ok: true as const,
    authUid: authState.anonUid,
    stableId: ensureTestStableId(),
    isAnonymous: true as const,
  }),
  waitForAnonAuth: async () => true,
  syncToCloud: async () => undefined,
  restoreFromCloud: async () => undefined,
  restoreFromCloudDetailed: async () => 'restored',
  forceSyncToCloud: async () => true,
  quiesceSyncBeforeStableIdSwap: async () => undefined,
  quiesceCloudSyncForAccountTransition: async () => true,
  enqueueCloudDeletion: async () => okAck(),
  startCloudDeletionEnqueue: (...a: unknown[]) => (startCloudDeletionEnqueue as any)(...a),
  startCloudDeletionDirect: (...a: unknown[]) => (startCloudDeletionDirect as any)(...a),
  waitForAccountDeletionCredentialSafe: (...a: unknown[]) => waitForAccountDeletionCredentialSafe(...a),
  wipeLocalAccountData: () => wipeLocalAccountData(),
  deleteCloudData: async () => undefined,
  resetAnonAuthCacheForSignOut: () => undefined,
  ensureStableAuthLinkForStableIdDetailed: async (stableId: string) => ({
    ok: true, stableUid: stableId, authUid: authState.anonUid, source: 'server',
  }),
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

let consoleLines: string[] = [];
let consoleSpies: jest.SpyInstance[] = [];
let unhandled: unknown[] = [];
const onUnhandled = (reason: unknown) => { unhandled.push(reason); };

function loadAuthProvider(initialStorage?: Record<string, string>): typeof import('../app/auth_provider') {
  let mod!: typeof import('../app/auth_provider');
  jest.isolateModules(() => {
    const asyncStorage = require('@react-native-async-storage/async-storage');
    for (const [key, value] of Object.entries(initialStorage ?? {})) {
      void asyncStorage.setItem(key, value);
    }
    mod = require('../app/auth_provider');
  });
  return mod;
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

function failGuestLockWrite(): void {
  const asyncStorage = require('@react-native-async-storage/async-storage');
  const secureStore = require('expo-secure-store');
  secureStore.setItemAsync.mockRejectedValueOnce(new Error('secure store unavailable'));
  asyncStorage.setItem.mockRejectedValueOnce(new Error('async storage unavailable'));
}

const accMutLines = (): string[] => consoleLines.filter((line) => line.includes('[ACC-MUT]'));
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

beforeEach(() => {
  (globalThis as any).__DEV__ = false;
  authFactory.default = originalAuthFactoryDefault;
  authFactory.__resetTestState();
  authState.isAnonymous = true;
  mockStableId = 'local-stable-id';
  consoleLines = [];
  unhandled = [];
  process.on('unhandledRejection', onUnhandled);
  consoleSpies = (['log', 'warn', 'info'] as const).map((level) => (
    jest.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      consoleLines.push(args.map(String).join(' '));
    })
  ));
  enqueueAck.mockReset();
  enqueueAck.mockImplementation(async () => okAck());
  startCloudDeletionEnqueue.mockClear();
  directAck.mockReset();
  directAck.mockImplementation(async () => ({ ok: true, authDeleted: true }));
  startCloudDeletionDirect.mockClear();
  waitForAccountDeletionCredentialSafe.mockReset();
  waitForAccountDeletionCredentialSafe.mockResolvedValue(false);
  wipeLocalAccountData.mockClear();
  require('@react-native-async-storage/async-storage').__reset();
  require('expo-secure-store').__reset();
  let seed = 0;
  expoGetRandomBytesAsyncImpl.mockReset();
  expoGetRandomBytesAsyncImpl.mockImplementation(async (length: number) => {
    const start = seed;
    seed += length;
    return Uint8Array.from({ length }, (_, index) => (start + index) % 256);
  });
});

afterEach(async () => {
  // Даём фоновым хвостам доиграть, чтобы поймать поздний необработанный отказ.
  await settle();
  process.off('unhandledRejection', onUnhandled);
  for (const spy of consoleSpies) spy.mockRestore();
});

describe('удаление гостя: серверные данные (TG-20707BD701DC)', () => {
  test('замок записан → постановка accountDeleteEnqueue получает proof, прямой вызов не нужен', async () => {
    rotateAnonUidOnSignOut();
    const authProvider = loadAuthProvider();

    const handoff = await authProvider.beginAccountDeletion();
    expect(handoff.ok).toBe(true);
    if (!handoff.ok) throw new Error(handoff.reason);
    const result = await handoff.completion;

    expect(startCloudDeletionEnqueue).toHaveBeenCalledTimes(1);
    const [stableId, proof] = startCloudDeletionEnqueue.mock.calls[0];
    expect(stableId).toBe('local-stable-id');
    expect(proof).toEqual({
      operationId: expect.any(String),
      capability: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(startCloudDeletionDirect).not.toHaveBeenCalled();
    // Постановка ушла ДО выхода гостя: сервер принимает её только от вошедшей личности.
    expect(authCalls().indexOf('enqueue')).toBeLessThan(authCalls().indexOf('signout'));
    // Гость не ждёт квитанцию связанных аккаунтов и не попадает в их ветки отказа.
    expect(waitForAccountDeletionCredentialSafe).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, cloudDeleted: false });
    expect(accMutLines()).toEqual(expect.arrayContaining([
      expect.stringContaining('delete:anon_lock=ok'),
      expect.stringContaining('delete:anon_server=enqueue ack=ok'),
    ]));
    expect(unhandled).toEqual([]);
  });

  test('замок не записался → прямой accountDeleteMine, пока гость ещё вошедший; гостю не отказываем', async () => {
    failGuestLockWrite();
    const authProvider = loadAuthProvider();

    const handoff = await authProvider.beginAccountDeletion();
    expect(handoff.ok).toBe(true);
    if (!handoff.ok) throw new Error(handoff.reason);
    await handoff.completion;

    expect(startCloudDeletionEnqueue).not.toHaveBeenCalled();
    expect(startCloudDeletionDirect).toHaveBeenCalledWith('local-stable-id');
    expect(authCalls().indexOf('direct')).toBeGreaterThan(-1);
    expect(authCalls().indexOf('direct')).toBeLessThan(authCalls().indexOf('signout'));
    expect(accMutLines()).toEqual(expect.arrayContaining([
      expect.stringContaining('delete:anon_lock=failed'),
      expect.stringContaining('delete:anon_server=direct reason=no_lock'),
    ]));
    expect(unhandled).toEqual([]);
  });

  test('быстрая фаза не ждёт сеть: онбординг открывается, пока ответа сервера ещё нет', async () => {
    let releaseAck: ((ack: EnqueueAck) => void) | null = null;
    enqueueAck.mockImplementationOnce(() => new Promise<EnqueueAck>((resolve) => { releaseAck = resolve; }));
    const authProvider = loadAuthProvider();

    const handoff = await authProvider.beginAccountDeletion();

    expect(handoff.ok).toBe(true);
    expect(startCloudDeletionEnqueue).toHaveBeenCalledTimes(1);
    expect(releaseAck).not.toBeNull();
    expect(authCalls()).not.toContain('signout');
    releaseAck!(okAck());
    if (handoff.ok) await handoff.completion;
    expect(unhandled).toEqual([]);
  });

  test('без замка фон ждёт ОТВЕТ прямого вызова (с потолком) до выхода из Firebase — запрос ушёл с токеном', async () => {
    // зачем (security-ревью REVISE): «вызов начат» ≠ «запрос ушёл с токеном»; выход раньше дал бы unauthenticated.
    failGuestLockWrite();
    directAck.mockImplementationOnce(() => new Promise<DirectAck>((resolve) => {
      setTimeout(() => resolve({ ok: true, authDeleted: true }), 50);
    }));
    const authProvider = loadAuthProvider();

    const handoff = await authProvider.beginAccountDeletion();
    expect(handoff.ok).toBe(true);
    if (!handoff.ok) throw new Error(handoff.reason);
    await expect(handoff.completion).resolves.toMatchObject({ ok: expect.any(Boolean) });
    await settle();
    const lines = accMutLines();
    const ackAt = lines.findIndex((line) => line.includes('delete:anon_server_direct ack=ok'));
    const beforeSignoutAt = lines.findIndex((line) => line.includes('delete:anon_server_direct before_signout=ack'));
    expect(ackAt).toBeGreaterThanOrEqual(0);
    expect(beforeSignoutAt).toBeGreaterThan(ackAt);
    expect(unhandled).toEqual([]);
  });

  test('постановка упала и квитанции нет → запасной прямой вызов, отказ сети не всплывает', async () => {
    enqueueAck.mockImplementationOnce(async () => { throw new Error('offline'); });
    directAck.mockImplementationOnce(async () => { throw new Error('still offline'); });
    const authProvider = loadAuthProvider();

    const handoff = await authProvider.beginAccountDeletion();
    expect(handoff.ok).toBe(true);
    if (!handoff.ok) throw new Error(handoff.reason);
    await expect(handoff.completion).resolves.toMatchObject({ ok: expect.any(Boolean) });
    await settle();

    expect(waitForAccountDeletionCredentialSafe).toHaveBeenCalledTimes(1);
    expect(startCloudDeletionDirect).toHaveBeenCalledWith('local-stable-id');
    expect(authCalls().indexOf('direct')).toBeLessThan(authCalls().indexOf('signout'));
    expect(accMutLines()).toEqual(expect.arrayContaining([
      expect.stringContaining('delete:anon_server=enqueue ack=failed reason=offline'),
      expect.stringContaining('delete:anon_server=direct reason=enqueue_failed'),
      expect.stringContaining('delete:anon_server_direct ack=failed reason=still offline'),
    ]));
    expect(unhandled).toEqual([]);
  });

  test('ответ постановки потерян, но квитанция есть → прямой вызов НЕ дублирует удаление', async () => {
    enqueueAck.mockImplementationOnce(async () => { throw new Error('lost response'); });
    waitForAccountDeletionCredentialSafe.mockResolvedValueOnce(true);
    const authProvider = loadAuthProvider();

    const handoff = await authProvider.beginAccountDeletion();
    if (!handoff.ok) throw new Error(handoff.reason);
    await handoff.completion;

    expect(startCloudDeletionDirect).not.toHaveBeenCalled();
    expect(accMutLines()).toEqual(expect.arrayContaining([
      expect.stringContaining('delete:anon_server=enqueue receipt=credential_safe'),
    ]));
    expect(unhandled).toEqual([]);
  });

  test('перезапуск: гостевой замок дожимается одной попыткой, без квитанции связанных', async () => {
    const now = Date.now();
    enqueueAck.mockImplementationOnce(async () => { throw new Error('offline at startup'); });
    const { resumePendingAccountDeleteLocalExit } = loadAuthProvider({
      account_delete_pending_auth_v1: JSON.stringify({
        providerUid: 'anon-uid-1',
        stableId: 'deleted-guest-stable',
        source: 'local',
        phase: 'local_data_cleared',
        createdAt: now - 60_000,
        expiresAt: now + 60_000,
      }),
    });

    const recovered = await resumePendingAccountDeleteLocalExit();

    expect(startCloudDeletionEnqueue).toHaveBeenCalledTimes(1);
    expect(startCloudDeletionEnqueue.mock.calls[0][0]).toBe('deleted-guest-stable');
    expect(startCloudDeletionEnqueue.mock.calls[0][1]).toEqual({
      operationId: expect.any(String),
      capability: expect.any(String),
    });
    // Гостевая ветка не ждёт 15-секундную квитанцию связанных аккаунтов.
    expect(waitForAccountDeletionCredentialSafe).not.toHaveBeenCalled();
    expect(typeof recovered).toBe('boolean');
    expect(accMutLines()).toEqual(expect.arrayContaining([
      expect.stringContaining('delete:anon_server=enqueue_retry ack=failed reason=offline at startup'),
    ]));
    expect(unhandled).toEqual([]);
  });
});
