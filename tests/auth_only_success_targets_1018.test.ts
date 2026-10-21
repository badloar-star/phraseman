// ════════════════════════════════════════════════════════════════════════════
// auth_only_success_targets_1018.test.ts — приёмочные цели правила владельца «вход/выход — только успех» (18.10).
//
// зачем (координатор 18.10, матрица 08c1e7cd9 раздел D): для каждой красной строки (A5, A9, A11, A12, B5, B8) — проверка
// «человек не видит ошибку, а действие доведено». Пока исполнители не закоммитят правки, часть красная НАМЕРЕННО.
// Обвязка моков — копия auth_provider_behavior.test.ts (строки 31–494), без изменений.
// ════════════════════════════════════════════════════════════════════════════

process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'test-web-client-id.apps.googleusercontent.com';
// Each case isolates the real auth provider module; on a loaded repository
// ts-jest compilation can exceed Jest's 5s default before assertions run.
jest.setTimeout(15_000);

// ── expo native modules imported at the top of auth_provider are ESM: stub them. ──
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

const mockRetirePhoneStateAfterDeletion = jest.fn<Promise<void>, [string]>(async () => {});
jest.mock('../app/phone_state_bootstrap', () => ({
  retirePhoneStateAfterDeletion: (stableId: string) => mockRetirePhoneStateAfterDeletion(stableId),
}));

// ── Native Google sign-in: return a fake credential with an idToken. ──
const expoGetRandomBytesAsyncImpl = jest.fn<Promise<Uint8Array>, [number]>();
const expoDigestStringAsyncImpl = jest.fn<Promise<string>, [string, string, unknown?]>();
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  CryptoEncoding: { HEX: 'hex' },
  getRandomBytesAsync: (length: number) => expoGetRandomBytesAsyncImpl(length),
  digestStringAsync: (algorithm: string, value: string, options?: unknown) => (
    expoDigestStringAsyncImpl(algorithm, value, options)
  ),
  randomUUID: jest.fn(() => 'test-random-uuid'),
}));

const googleSignInImpl = jest.fn<Promise<any>, any[]>(async () => ({ type: 'success', data: { idToken: 'fake-google-id-token', user: { email: 'u@example.com', name: 'Test User' } } }));
const googleHasPlayServicesImpl = jest.fn<Promise<boolean>, any[]>(async () => true);
jest.mock(
  '@react-native-google-signin/google-signin',
  () => ({
    GoogleSignin: {
      configure: jest.fn(),
      hasPlayServices: (...args: unknown[]) => googleHasPlayServicesImpl(...(args as [])),
      signIn: (...args: unknown[]) => googleSignInImpl(...(args as [])),
      signOut: jest.fn(async () => {}),
    },
  }),
  { virtual: true },
);

const appleSignInImpl = jest.fn<Promise<any>, any[]>(async () => ({
  identityToken: 'fake-apple-id-token',
  email: 'apple@example.com',
  fullName: { givenName: 'Apple', familyName: 'User' },
}));
jest.mock(
  'expo-apple-authentication',
  () => ({
    AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
    signInAsync: (...args: unknown[]) => appleSignInImpl(...(args as [])),
  }),
  { virtual: true },
);

// ── cloud_sync: the sign-in flow leans on many exports. Make link "succeed"
//    on the LOCAL stable id so the outcome is created_new/linked_existing (the
//    simple happy path that still exercises link-first). ──
const ensureStableAuthLinkForStableIdDetailed = jest.fn<Promise<any>, [string, any?]>(async (stableId: string) => ({
  ok: true,
  stableUid: stableId, // same → linked_existing / created_new branch
  source: 'server',
}));
const restoreFromCloud = jest.fn(async () => {});
const restoreFromCloudDetailed = jest.fn<Promise<'restored' | 'not_found' | 'failed'>, any[]>(async () => 'restored');
const syncToCloud = jest.fn(async () => {});
const mergeStableAccountsViaServer = jest.fn(async () => null);
const quiesceSyncBeforeStableIdSwap = jest.fn(async () => {});
const quiesceCloudSyncForAccountTransition = jest.fn(async () => true);
const enqueueCloudDeletion = jest.fn<
  Promise<{ ok: true; jobId: string; status: 'queued'; created: true; authReleased: true; credentialSafe: true }>,
  [string | null]
>(async () => ({
  ok: true as const,
  jobId: 'job-1',
  status: 'queued' as const,
  created: true,
  authReleased: true as const,
  credentialSafe: true as const,
}));
const startCloudDeletionEnqueue = jest.fn((stableId: string | null) => ({
  dispatchSettled: Promise.resolve(),
  acknowledgment: enqueueCloudDeletion(stableId),
}));
const waitForAccountDeletionCredentialSafe = jest.fn(async () => false);
const wipeLocalAccountData = jest.fn(async () => {});
const ensureTestStableId = (): string => {
  if (!mockStableId) mockStableId = 'rotated-stable-id';
  return mockStableId;
};
const ensureAnonUser = jest.fn(async () => ensureTestStableId());
const ensureAnonIdentityDetailed = jest.fn(async () => ({
  ok: true as const,
  authUid: authState.anonUid,
  stableId: ensureTestStableId(),
  isAnonymous: true as const,
}));
const forceSyncToCloud = jest.fn(async () => true);
const saveAccountSwitchEmergencyBackup = jest.fn(async () => true);
// AA S2d раунд 2 (H-S2d-2): сводка сохранённой аварийной копии (владелец + размер; проверка до стирания).
type BackupSummaryMock = { stableId: string; pairCount: number; bytes: number } | null;
const readAccountSwitchEmergencyBackupSummary = jest.fn<Promise<BackupSummaryMock>, []>(async () => null);
// AA S2d раунд 3 (§135 ❓2): merge не подтверждён → копия гостя откладывается.
const shelveAccountSwitchEmergencyBackupOf = jest.fn<Promise<boolean>, [string]>(async () => true);
const pruneShelvedAccountSwitchBackups = jest.fn<Promise<number>, [number?]>(async () => 0);
const resetAnonAuthCacheForSignOut = jest.fn();
jest.mock('../app/cloud_sync', () => ({
  SYNC_KEYS: ['user_total_xp', 'streak_count', 'unlocked_lessons', 'unlocked_lessons::fr', 'user_name', 'custom_flashcards_v2'],
  ensureAnonUser: (...a: unknown[]) => (ensureAnonUser as any)(...a),
  ensureAnonIdentityDetailed: (...a: unknown[]) => (ensureAnonIdentityDetailed as any)(...a),
  waitForAnonAuth: jest.fn(async () => true),
  syncToCloud: (...a: unknown[]) => (syncToCloud as any)(...a),
  restoreFromCloud: (...a: unknown[]) => (restoreFromCloud as any)(...a),
  restoreFromCloudDetailed: (...a: unknown[]) => (restoreFromCloudDetailed as any)(...a),
  forceSyncToCloud: (...a: unknown[]) => (forceSyncToCloud as any)(...a),
  quiesceSyncBeforeStableIdSwap: (...a: unknown[]) => (quiesceSyncBeforeStableIdSwap as any)(...a),
  quiesceCloudSyncForAccountTransition: (...a: unknown[]) => (quiesceCloudSyncForAccountTransition as any)(...a),
  enqueueCloudDeletion: (...a: unknown[]) => (enqueueCloudDeletion as any)(...a),
  startCloudDeletionEnqueue: (...a: unknown[]) => (startCloudDeletionEnqueue as any)(...a),
  waitForAccountDeletionCredentialSafe: (...a: unknown[]) => (
    waitForAccountDeletionCredentialSafe as any
  )(...a),
  wipeLocalAccountData: (...a: unknown[]) => (wipeLocalAccountData as any)(...a),
  deleteCloudData: jest.fn(async () => {}),
  resetAnonAuthCacheForSignOut: (...a: unknown[]) => (resetAnonAuthCacheForSignOut as any)(...a),
  ensureStableAuthLinkForStableIdDetailed: (...a: unknown[]) => (ensureStableAuthLinkForStableIdDetailed as any)(...a),
  rememberSwapConfirmedStableAuthLink: jest.fn(async () => true),
  mergeStableAccountsViaServer: (...a: unknown[]) => (mergeStableAccountsViaServer as any)(...a),
  saveAccountSwitchEmergencyBackup: (...a: unknown[]) => (saveAccountSwitchEmergencyBackup as any)(...a),
  readAccountSwitchEmergencyBackupSummary: () => readAccountSwitchEmergencyBackupSummary(),
  shelveAccountSwitchEmergencyBackupOf: (owner: string) => shelveAccountSwitchEmergencyBackupOf(owner),
  pruneShelvedAccountSwitchBackups: (now?: number) => pruneShelvedAccountSwitchBackups(now),
  accountOwnedStorageKeysFrom: (keys: readonly string[]) => Array.from(new Set([
    'user_total_xp', 'streak_count', 'unlocked_lessons', 'unlocked_lessons::fr',
    'user_name', 'custom_flashcards_v2', 'shards_balance', 'shards_balance_meta_v1',
    'shards_store_purchased_total_v1',
    'pending_shard_grants_v1', 'pending_shard_grants_v1_quarantine_owner_v1',
    ...keys.filter((key) => [
      'v2:outbox:', 'client_shard_', 'shards_delta_queue_v2:',
      'shards_delta_queue_v2_quarantine:', 'max_voice_finalize_outbox_v1:',
      'max_voice_feedback_outbox_v1:', 'max_voice_review_receipt_v1:',
      'max_voice_review_receipts_v1:',
      'pending_shard_grants_v2:', 'pending_shard_grants_quarantine_v1:',
      'pending_shard_grants_delete_cleanup_v1:', 'pending_shard_grants_recovery_needed_v1:',
      'pending_shard_grants_correlated_event_v1:',
    ].some((prefix) => key.startsWith(prefix))),
  ])),
  isAccountLocalJournalStorageKey: (key: string) => [
    'v2:outbox:',
    'client_shard_',
    'shards_delta_queue_v2:',
    'shards_delta_queue_v2_quarantine:',
    'max_voice_finalize_outbox_v1:',
    'max_voice_feedback_outbox_v1:',
    'max_voice_review_receipt_v1:',
    'max_voice_review_receipts_v1:',
    'pending_shard_grants_v2:', 'pending_shard_grants_quarantine_v1:',
    'pending_shard_grants_delete_cleanup_v1:', 'pending_shard_grants_recovery_needed_v1:',
    'pending_shard_grants_correlated_event_v1:',
  ].some((prefix) => key.startsWith(prefix)),
}));

let mockStableId: string | null = 'local-stable-id';
const clearStableId = jest.fn(async () => { mockStableId = null; });
jest.mock('../app/stable_id', () => {
  return {
    getStableId: jest.fn(async () => ensureTestStableId()),
    setStableId: jest.fn(async (v: string) => { mockStableId = v; }),
    clearStableId: (...a: unknown[]) => (clearStableId as any)(...a),
    peekStableId: jest.fn(() => mockStableId),
    readExistingStableId: jest.fn(async () => mockStableId),
  };
});

const beginPremiumAccountTransition = jest.fn();
const waitForPremiumAccountWorkIdleWithDeadline = jest.fn(async (_timeoutMs: number) => true);
const waitForRestoreApplicationIdleWithDeadline = jest.fn(async (_timeoutMs: number) => true);
jest.mock('../app/premium_guard', () => ({
  invalidatePremiumCache: jest.fn(),
  beginPremiumAccountTransition: (...args: unknown[]) => beginPremiumAccountTransition(...args),
  waitForPremiumAccountWorkIdleWithDeadline: (timeoutMs: number) => (
    waitForPremiumAccountWorkIdleWithDeadline(timeoutMs)
  ),
}));
const mockLoadShardsFromCloud = jest.fn(async () => {});
const preparePendingShardDeltasForAccountSwitch = jest.fn(async () => ({
  resolved: 0,
  pending: 0,
  pendingEarn: 0,
  pendingSpend: 0,
  ownerStableId: mockStableId,
  stale: false,
}));
jest.mock('../app/shards_system', () => ({
  loadShardsFromCloud: () => mockLoadShardsFromCloud(),
  forceSyncShardsToCloud: jest.fn(async () => {}),
  preparePendingShardDeltasForAccountSwitch: () => preparePendingShardDeltasForAccountSwitch(),
}));
let pendingShardQueue: { type: 'earn' | 'spend' }[] = [];
let quarantinedShardQueue = false;
jest.mock('../app/shards_delta_queue', () => ({
  readShardDeltaQueue: jest.fn(async () => pendingShardQueue),
  hasQuarantinedShardDeltaQueue: jest.fn(async () => quarantinedShardQueue),
}));
const logEvent = jest.fn();
const recordError = jest.fn();
jest.mock('../app/firebase', () => ({
  logEvent: (...a: unknown[]) => logEvent(...a),
  recordError: (...a: unknown[]) => recordError(...a),
}));
jest.mock('../app/app_health', () => ({ logAppError: jest.fn() }));
const emitAppEvent = jest.fn();
jest.mock('../app/events', () => ({ emitAppEvent: (...a: unknown[]) => emitAppEvent(...a) }));
jest.mock('../app/target_storage_keys', () => ({ unlockedLessonsKey: (t: string) => `unlocked_lessons_${t}` }));
jest.mock('../app/account_delete_timeout', () => ({
  ACCOUNT_DELETE_CALLABLE_TIMEOUT_MS: 15000,
  ACCOUNT_DELETE_ENQUEUE_TIMEOUT_MS: 8000,
  runAccountDeleteEnqueueWithDeadline: async (_warm: unknown, call: () => Promise<unknown>) => call(),
}));
jest.mock('../app/account_generation', () => ({
  beginAccountGeneration: jest.fn(),
  subscribeAccountGeneration: jest.fn(() => ({ remove: jest.fn() })),
  captureAccountGeneration: jest.fn(() => ({
    generation: 1,
    stableId: mockStableId,
    phase: 'active',
  })),
  invalidateAccountGeneration: jest.fn(),
  isCurrentAccountGeneration: jest.fn(() => true),
  waitForRestoreApplicationIdleWithDeadline: (timeoutMs: number) => (
    waitForRestoreApplicationIdleWithDeadline(timeoutMs)
  ),
  withAccountTransitionLock: jest.fn(async (work: (lease: unknown) => Promise<unknown>) => (
    work({ generation: 1, stableId: mockStableId, phase: 'transitioning' })
  )),
  withAccountTransitionLockWithDeadline: jest.fn(async (work: (lease: unknown) => Promise<unknown>) => ({
    completed: true,
    value: await work({ generation: 1, stableId: mockStableId, phase: 'transitioning' }),
  })),
}));

// @react-native-firebase/functions is required lazily (stampAnonOwnershipBeforeSignIn).
const authStampAnonOwnership = jest.fn(async () => ({}));
jest.mock(
  '@react-native-firebase/functions',
  () => ({
    getFunctions: jest.fn(() => ({})),
    httpsCallable: jest.fn((_functions: unknown, name: string) =>
      name === 'authStampAnonOwnership' ? authStampAnonOwnership : async () => ({})),
  }),
  { virtual: true },
);

// config: force a non-Expo-Go standalone build so getAuth()/getFirestore() resolve
// to the mapped mocks and the full flow runs.
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));

// Pull the auth mock so we can drive/inspect link vs signin ordering.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const authFactory = require('@react-native-firebase/auth');
const originalAuthFactoryDefault = authFactory.default;
const authState = authFactory.__testState as {
  calls: string[];
  linkImpl: null | ((c: unknown) => Promise<unknown>);
  signInImpl: null | ((c: unknown) => Promise<unknown>);
  isAnonymous: boolean;
  anonUid: string;
  providerUid: string;
};

function rejectFirebaseSignOut(error: Error): void {
  const wrappedDefault = Object.assign(
    () => {
      const base = originalAuthFactoryDefault();
      const wrapped = {
        ...base,
        signOut: async () => {
        authState.calls.push('signout');
        throw error;
        },
      };
      Object.defineProperty(wrapped, 'currentUser', { get: () => base.currentUser });
      return wrapped;
    },
    originalAuthFactoryDefault,
  );
  authFactory.default = wrappedDefault;
}

beforeEach(() => {
  (globalThis as any).__DEV__ = false;
  authFactory.default = originalAuthFactoryDefault;
  authFactory.__resetTestState();
  mockStableId = 'local-stable-id';
  ensureStableAuthLinkForStableIdDetailed.mockReset();
  ensureStableAuthLinkForStableIdDetailed.mockImplementation(async (stableId: string) => ({
    ok: true,
    stableUid: stableId,
    authUid: authState.isAnonymous ? authState.anonUid : authState.providerUid,
    source: 'server',
  }));
  restoreFromCloud.mockReset();
  restoreFromCloud.mockResolvedValue(undefined);
  restoreFromCloudDetailed.mockReset();
  restoreFromCloudDetailed.mockResolvedValue('restored');
  authStampAnonOwnership.mockClear();
  emitAppEvent.mockClear();
  logEvent.mockClear();
  recordError.mockClear();
  syncToCloud.mockClear();
  mergeStableAccountsViaServer.mockClear();
  quiesceSyncBeforeStableIdSwap.mockClear();
  quiesceCloudSyncForAccountTransition.mockClear();
  enqueueCloudDeletion.mockReset();
  enqueueCloudDeletion.mockResolvedValue({
    ok: true,
    jobId: 'job-1',
    status: 'queued',
    created: true,
    authReleased: true,
    credentialSafe: true,
  });
  waitForAccountDeletionCredentialSafe.mockReset();
  waitForAccountDeletionCredentialSafe.mockResolvedValue(false);
  startCloudDeletionEnqueue.mockReset();
  startCloudDeletionEnqueue.mockImplementation((stableId: string | null) => ({
    dispatchSettled: Promise.resolve(),
    acknowledgment: enqueueCloudDeletion(stableId),
  }));
  wipeLocalAccountData.mockReset();
  wipeLocalAccountData.mockResolvedValue(undefined);
  mockRetirePhoneStateAfterDeletion.mockReset();
  mockRetirePhoneStateAfterDeletion.mockResolvedValue(undefined);
  ensureAnonUser.mockReset();
  ensureAnonUser.mockImplementation(async () => ensureTestStableId());
  ensureAnonIdentityDetailed.mockClear();
  forceSyncToCloud.mockReset();
  forceSyncToCloud.mockResolvedValue(true);
  saveAccountSwitchEmergencyBackup.mockReset();
  saveAccountSwitchEmergencyBackup.mockResolvedValue(true);
  readAccountSwitchEmergencyBackupSummary.mockReset();
  readAccountSwitchEmergencyBackupSummary.mockResolvedValue(null);
  shelveAccountSwitchEmergencyBackupOf.mockReset();
  shelveAccountSwitchEmergencyBackupOf.mockResolvedValue(true);
  pruneShelvedAccountSwitchBackups.mockReset();
  pruneShelvedAccountSwitchBackups.mockResolvedValue(0);
  preparePendingShardDeltasForAccountSwitch.mockReset();
  preparePendingShardDeltasForAccountSwitch.mockImplementation(async () => ({
    resolved: 0,
    pending: 0,
    pendingEarn: 0,
    pendingSpend: 0,
    ownerStableId: mockStableId,
    stale: false,
  }));
  pendingShardQueue = [];
  quarantinedShardQueue = false;
  const accountGeneration = require('../app/account_generation');
  accountGeneration.beginAccountGeneration.mockClear();
  accountGeneration.captureAccountGeneration.mockClear();
  accountGeneration.invalidateAccountGeneration.mockClear();
  accountGeneration.isCurrentAccountGeneration.mockClear();
  accountGeneration.isCurrentAccountGeneration.mockReturnValue(true);
  accountGeneration.withAccountTransitionLockWithDeadline.mockClear();
  accountGeneration.withAccountTransitionLockWithDeadline.mockImplementation(
    async (work: (lease: unknown) => Promise<unknown>) => ({
      completed: true,
      value: await work({ generation: 1, stableId: mockStableId, phase: 'transitioning' }),
    }),
  );
  resetAnonAuthCacheForSignOut.mockClear();
  clearStableId.mockClear();
  mockLoadShardsFromCloud.mockReset();
  mockLoadShardsFromCloud.mockResolvedValue(undefined);
  require('@react-native-async-storage/async-storage').__reset();
  require('expo-secure-store').__reset();
  googleSignInImpl.mockClear();
  googleSignInImpl.mockResolvedValue({ type: 'success', data: { idToken: 'fake-google-id-token', user: { email: 'u@example.com', name: 'Test User' } } });
  googleHasPlayServicesImpl.mockClear();
  googleHasPlayServicesImpl.mockResolvedValue(true);
  appleSignInImpl.mockClear();
  appleSignInImpl.mockResolvedValue({
    identityToken: 'fake-apple-id-token',
    email: 'apple@example.com',
    fullName: { givenName: 'Apple', familyName: 'User' },
  });
  let randomByteSeed = 0;
  expoGetRandomBytesAsyncImpl.mockReset();
  expoGetRandomBytesAsyncImpl.mockImplementation(async (length: number) => {
    const start = randomByteSeed;
    randomByteSeed += length;
    return Uint8Array.from({ length }, (_, index) => (start + index) % 256);
  });
  expoDigestStringAsyncImpl.mockReset();
  expoDigestStringAsyncImpl.mockImplementation(async (_algorithm, value) => `sha256:${value}`);
  beginPremiumAccountTransition.mockClear();
  waitForPremiumAccountWorkIdleWithDeadline.mockReset();
  waitForPremiumAccountWorkIdleWithDeadline.mockResolvedValue(true);
  waitForRestoreApplicationIdleWithDeadline.mockReset();
  waitForRestoreApplicationIdleWithDeadline.mockResolvedValue(true);
});

/**
 * Бюджет локального wipe (ACCOUNT_DELETE_LOCAL_WIPE_TIMEOUT_MS).
 *
 * зачем читать из исходника, а не дублировать числом: 01.09.2026 бюджет
 * подняли с 1 с до 5 с (одна секунда давала ложный таймаут на реальном iOS),
 * а тесты остались перематывать 1 с — и 23 теста начали ВИСЕТЬ до жестокого
 * таймаута jest вместо честного падения по assert, утаскивая за собой
 * незавершённый flight удаления и роняя ещё 21 соседний тест. Константа не
 * экспортируется (внутренняя деталь), поэтому берём её значение из файла:
 * следующее изменение бюджета тесты переживут сами.
 */
// зачем (11.10, решение координатора): после потолка быстрая фаза ждёт ИДУЩИЙ полёт стирания ещё до 10 с
// (окно сбоя не должно показываться поверх уже стираемых данных) — зависший wipe отказывает после обоих.
const LOCAL_WIPE_GRACE_MS = 10_000;
const LOCAL_WIPE_DEADLINE_MS = (() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const source = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'app', 'auth_provider.ts'),
    'utf8',
  ) as string;
  const match = source.match(/const ACCOUNT_DELETE_LOCAL_WIPE_TIMEOUT_MS\s*=\s*([\d_]+);/);
  if (!match) throw new Error('ACCOUNT_DELETE_LOCAL_WIPE_TIMEOUT_MS not found in auth_provider.ts');
  return Number(match[1].replaceAll('_', ''));
})();

let lastLoadedAuthProviderStorage: { getItem: (key: string) => Promise<string | null> };

function loadAuthProvider(
  initialStorage?: Record<string, string>,
  platformOS?: 'ios' | 'android',
): typeof import('../app/auth_provider') {
  let mod!: typeof import('../app/auth_provider');
  jest.isolateModules(() => {
    if (platformOS) {
      require('react-native').Platform.OS = platformOS;
    }
    const storage = require('@react-native-async-storage/async-storage');
    lastLoadedAuthProviderStorage = storage;
    for (const [key, value] of Object.entries(initialStorage ?? {})) {
      void storage.setItem(key, value);
    }
    mod = require('../app/auth_provider');
  });
  return mod;
}

async function waitForCall(mock: jest.Mock, label: string): Promise<void> {
  for (let attempt = 0; attempt < 50 && mock.mock.calls.length === 0; attempt += 1) {
    await Promise.resolve();
  }
  if (mock.mock.calls.length === 0) throw new Error(`${label} was not called`);
}

// ════════════════════════════════════════════════════════════════════════════
// ЦЕЛИ ПРАВИЛА «ТОЛЬКО УСПЕХ» (владелец 18.10, матрица 08c1e7cd9, раздел D)
// «Ни один сценарий входа/выхода не заканчивается ошибкой; исключение — нет сети, понятный текст».
// Каждая проверка — «человек не видит ошибку, а действие доведено». Строки A5/A9/A11/R4 — Авторизация,
// A12/B5/B8 — Дизайн (координатор 18.10). Красное здесь — цель, не коммитится до правок исполнителей.
// ════════════════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-require-imports
const readSource = (relativePath: string): string => require('fs').readFileSync(
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('path').join(__dirname, '..', relativePath),
  'utf8',
) as string;

// Цели, ждущие решений (координатор 21.10): A5 — вопрос №24 (приватность при сбое очистки), A9 — №25 (правило для
// удаления), A11-сервис — №26 (серверный запрет на uid, Ядро). Включаются (skip → test), когда цель реализована.
describe('A5 — выход: двойной сбой очистки не показывает окно, выход доводится до шторки входа', () => {
  test.skip('экран выхода не рисует «Не удалось выйти» и «Перезапусти приложение»', () => {
    const flow = readSource('components/account/AccountLogoutFlow.tsx');
    expect(flow).not.toContain("'Не удалось выйти'");
    expect(flow).not.toContain('Перезапусти приложение');
    // стадии «failed» больше нет: после второй попытки — onSignedOut, а не окно отказа
    expect(flow).not.toMatch(/onStageChange\('failed'\)/);
  });
});

describe('A9 — удаление: сбой не показывает окно «Не получилось», удаление доводится фоном', () => {
  test.skip('окно удаления не рисует тексты отказа', () => {
    const modal = readSource('components/DeleteAccountConfirmModal.tsx');
    for (const text of [
      'Не удалось подготовить удаление',
      'Выход не завершился',
      'Удаление не завершилось',
    ]) {
      expect(modal).not.toContain(text);
    }
  });
});

describe('A11 — вход в навсегда удалённый аккаунт (не «stable»): чистый профиль вместо окна «Аккаунт удалён»', () => {
  test.skip('signInWithProvider при identity_retired с subject=auth заканчивается входом, не ошибкой', async () => {
    ensureStableAuthLinkForStableIdDetailed.mockImplementation(async () => ({
      ok: false,
      failure: 'identity_retired',
      retiredSubject: 'auth',
    }));
    const { signInWithProvider } = loadAuthProvider();

    const result = await signInWithProvider('google');

    expect(result).not.toEqual({ result: 'error', error: 'identity_retired' });
    expect(result.result).not.toBe('error');
  });

  test('шторка входа не открывает окно «Аккаунт удалён безвозвратно» на этот исход', () => {
    const sheet = readSource('components/RegistrationPromptModal.tsx');
    expect(sheet).not.toMatch(/identity_retired[\s\S]{0,400}(showAccountDeletedRestorePrompt|AccountRetiredPrompt|удалён безвозвратно)/);
  });
});

describe('A12 — переустановка: сбой восстановления не показывает тост «Облако сейчас недоступно»', () => {
  test('_layout не выводит тост про облако; восстановление повторяется фоном', () => {
    const layout = readSource('app/_layout.tsx');
    expect(layout).not.toContain('Облако сейчас недоступно');
    expect(layout).not.toMatch(/cloud_unavailable_toast'\)\s*\{[\s\S]{0,600}emitAppEvent\('action_toast'/);
  });
});

describe('B5 — убили приложение посреди смены: после запуска смена доведена, без «Перезапусти приложение»', () => {
  test('Настройки и онбординг не рисуют «Перезапусти приложение» и «Смена аккаунта не началась/не закончилась»', () => {
    const settings = readSource('app/(tabs)/settings.tsx');
    const onboardingSwitch = readSource('app/onboarding_account_switch_confirm.ts');
    for (const source of [settings, onboardingSwitch]) {
      expect(source).not.toContain('Перезапусти приложение');
      expect(source).not.toContain('Смена аккаунта не началась');
      expect(source).not.toContain('Смена аккаунта не закончилась');
    }
  });
});

// зачем (решение (а) координатора 21.10 по матрице 08c1e7cd9, строка B8 «Нет сети → понятный текст, ничего не стёрто»):
// исключение владельца «нет сети → понятный текст» — без сети смену в Настройках НЕ доводим стиранием, а говорим «Связь пропала».
describe('B8 — нет сети при смене из Настроек: ничего не стёрто, понятный текст «Связь пропала»', () => {
  test('сервис: без сети смена по умолчанию отменяется (sync_failed), аварийная копия есть, стирания нет', async () => {
    authState.isAnonymous = false;
    forceSyncToCloud.mockResolvedValue(false);
    const { signOutAndWipeForAccountSwitch } = loadAuthProvider({ unlocked_lessons: '[1,2]' });

    const result = await signOutAndWipeForAccountSwitch();

    expect(result).toEqual({ ok: false, reason: 'sync_failed' });
    expect(saveAccountSwitchEmergencyBackup).toHaveBeenCalled();
    expect(wipeLocalAccountData).not.toHaveBeenCalled();
  });

  test('экран: на sync_failed Настройки показывают «Связь пропала», а не окно «Прогресс не сохранён… смена отменена»', () => {
    const settings = readSource('app/(tabs)/settings.tsx');
    const onboardingSwitch = readSource('app/onboarding_account_switch_confirm.ts');
    expect(settings).not.toContain("L('Прогресс не сохранён'");
    expect(onboardingSwitch).not.toContain("ru: 'Прогресс не сохранён'");
    const syncBranch = settings.slice(settings.indexOf("res.reason === 'sync_failed'"));
    const branchBody = syncBranch.slice(0, syncBranch.indexOf('return;'));
    expect(branchBody).toContain("L('Связь пропала'");
    expect(branchBody).toContain('[AUTH-SWITCH] settings sync_failed');
  });
});
