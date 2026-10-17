// ════════════════════════════════════════════════════════════════════════════
// auth_provider_behavior.test.ts — BEHAVIORAL test (real import, EXECUTES code).
//
// Drives the real app/auth_provider.ts signInWithProvider('google') flow and pins
// the CRITICAL account-not-lost invariant (root cause of the weekly "sign-in makes
// a brand-new account" outage, memory 2026-06-29):
//
//   • On sign-in over an anonymous Firebase session, the flow MUST attempt
//     currentUser.linkWithCredential() FIRST (this preserves the anonymous uid and
//     all data bound to it). signInWithCredential() DESTROYS the anonymous uid, so
//     it may only be used as a FALLBACK when the provider is already bound to a
//     different account (auth/credential-already-in-use and friends).
//
//   • When linkWithCredential SUCCEEDS, signInWithCredential must NOT be called.
//   • When linkWithCredential FAILS, the flow preserves the anonymous account
//     and requires an explicit account-switch handoff. It must never mutate to
//     provider B and continue syncing anonymous A under B auth.
//
// This is a genuinely behavioral test: the real module code runs. All native /
// side-effecting dependencies are mocked:
//   - @react-native-firebase/auth        → tests/__mocks__ (records link/signin order)
//   - @react-native-google-signin/...    → returns a fake credential
//   - cloud_sync / firebase / shards / events / revenuecat / premium_guard → mocked
//
// NOTE (transitional file): app/auth_provider.ts is being reworked in a parallel
// session. We assert only the STABLE invariant above (link-first, conflict
// fallback) which the rework explicitly preserves; we do not pin swap/merge return
// details that may still be in flux.
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

test('keeps Google sign-in visible when the Android Play Services preflight is temporarily unavailable', async () => {
  googleHasPlayServicesImpl.mockResolvedValueOnce(false);

  const { isGoogleSignInAvailable } = loadAuthProvider(undefined, 'android');

  await expect(isGoogleSignInAvailable()).resolves.toBe(true);
});

test('sign-in over an anonymous user tries linkWithCredential FIRST (does not destroy the anon uid)', async () => {
  const { signInWithProvider } = loadAuthProvider();
  const res = await signInWithProvider('google');

  // link was attempted; signInWithCredential was NOT (link succeeded → uid preserved).
  expect(authState.calls).toContain('link');
  expect(authState.calls).not.toContain('signin');
  expect(authState.calls[0]).toBe('link');
  // Flow completed as a real sign-in result (created_new or linked_existing), not an error.
  expect(['created_new', 'linked_existing']).toContain((res as any).result);
  // зачем (координатор и Ядро 15.10, [LOGIN-STAMP]): метка запрашивается предвыборкой ещё на тапе, пока открыто окно выбора;
  // без конфликта её ответ не принимается (nonce не кладётся), повторной метки нет — не больше одного вызова.
  expect(authStampAnonOwnership.mock.calls.length).toBeLessThanOrEqual(1);
});

test('preserves anonymous identity when the credential belongs to an existing provider account', async () => {
  // зачем: XP снят в 2.0 и прогрессом не считается — локальные данные изображаем
  // живым ключом прогресса (unlocked_lessons), а не user_total_xp.
  // linkWithCredential rejects with "provider already bound to another account".
  authState.linkImpl = async () => {
    const err: any = new Error('credential already in use');
    err.code = 'auth/credential-already-in-use';
    throw err;
  };

  const { signInWithProvider } = loadAuthProvider({ unlocked_lessons: '[1,2]' });
  const res = await signInWithProvider('google');

  expect(authState.calls).toContain('link');
  expect(authState.calls).not.toContain('signin');
  expect(res).toEqual({ result: 'error', error: 'account_switch_required' });
  // зачем (координатор и Ядро 15.10, [LOGIN-STAMP]): метка запрашивается предвыборкой ещё на тапе, пока открыто окно выбора;
  // без конфликта её ответ не принимается (nonce не кладётся), повторной метки нет — не больше одного вызова.
  expect(authStampAnonOwnership.mock.calls.length).toBeLessThanOrEqual(1);
});

test('unsynced MAX outbox makes anonymous account meaningful and blocks provider replacement', async () => {
  authState.linkImpl = async () => {
    const err: any = new Error('credential already in use');
    err.code = 'auth/credential-already-in-use';
    throw err;
  };

  const { signInWithProvider } = loadAuthProvider({
    'max_voice_finalize_outbox_v1:local-stable-id': JSON.stringify([{ operationId: 'max-1' }]),
  });
  const result = await signInWithProvider('google');

  expect(result).toEqual({ result: 'error', error: 'account_switch_required' });
  expect(authState.calls).not.toContain('signin');
  // зачем (координатор и Ядро 15.10, [LOGIN-STAMP]): метка запрашивается предвыборкой ещё на тапе, пока открыто окно выбора;
  // без конфликта её ответ не принимается (nonce не кладётся), повторной метки нет — не больше одного вызова.
  expect(authStampAnonOwnership.mock.calls.length).toBeLessThanOrEqual(1);
});

test('fresh install hands a proven-empty anonymous identity to an existing Google account', async () => {
  authState.linkImpl = async () => {
    const err: any = new Error('credential already in use');
    err.code = 'auth/credential-already-in-use';
    throw err;
  };

  const { signInWithProvider } = loadAuthProvider();
  const result = await signInWithProvider('google');

  expect(result.result).not.toBe('error');
  expect(authState.calls).toEqual(expect.arrayContaining(['link', 'signin']));
  expect(authState.calls.indexOf('link')).toBeLessThan(authState.calls.indexOf('signin'));
  expect(authStampAnonOwnership).toHaveBeenCalledTimes(1);
  await expect(lastLoadedAuthProviderStorage.getItem('account_provider_handoff_v1'))
    .resolves.toBeNull();
});

test('holds one account-transition lease from clean proof through provider handoff finalization', async () => {
  authState.linkImpl = async () => {
    const err: any = new Error('credential already in use');
    err.code = 'auth/credential-already-in-use';
    throw err;
  };
  const generation = require('../app/account_generation') as {
    withAccountTransitionLockWithDeadline: jest.Mock;
  };
  let leaseActive = false;
  generation.withAccountTransitionLockWithDeadline.mockImplementationOnce(
    async (work: (lease: object) => Promise<unknown>) => {
      leaseActive = true;
      try {
        return {
          completed: true,
          value: await work(Object.freeze({ providerHandoffLease: true })),
        };
      }
      finally { leaseActive = false; }
    },
  );
  authState.signInImpl = async () => {
    expect(leaseActive).toBe(true);
    authState.isAnonymous = false;
    return { user: authFactory().currentUser };
  };
  ensureStableAuthLinkForStableIdDetailed.mockImplementation(async (stableId: string) => {
    expect(leaseActive).toBe(true);
    return { ok: true, stableUid: stableId, authUid: authState.providerUid, source: 'server' };
  });

  const { signInWithProvider } = loadAuthProvider();
  const result = await signInWithProvider('google');

  expect(result.result).not.toBe('error');
  expect(generation.withAccountTransitionLockWithDeadline).toHaveBeenCalled();
  expect(leaseActive).toBe(false);
  await expect(lastLoadedAuthProviderStorage.getItem('account_provider_handoff_v1'))
    .resolves.toBeNull();
});

test('provider handoff fails retryably when transition-lock acquisition reaches its deadline', async () => {
  authState.linkImpl = async () => {
    const err: any = new Error('credential already in use');
    err.code = 'auth/credential-already-in-use';
    throw err;
  };
  const generation = require('../app/account_generation') as {
    withAccountTransitionLockWithDeadline: jest.Mock;
  };
  generation.withAccountTransitionLockWithDeadline.mockResolvedValueOnce({ completed: false });

  const { signInWithProvider } = loadAuthProvider();
  const result = await signInWithProvider('google');

  expect(result).toEqual({ result: 'error', error: 'firebase_provider_handoff_lock_timeout' });
  expect(authState.calls).toContain('link');
  expect(authState.calls).not.toContain('signin');
  await expect(lastLoadedAuthProviderStorage.getItem('account_provider_handoff_v1'))
    .resolves.not.toBeNull();
});

test('clean post-switch anonymous identity can enter an existing Apple account', async () => {
  authState.linkImpl = async () => {
    const err: any = new Error('credential already in use');
    err.code = 'auth/credential-already-in-use';
    throw err;
  };
  authState.signInImpl = async () => {
    authState.isAnonymous = false;
    return { user: authFactory().currentUser };
  };

  const { signInWithProvider } = loadAuthProvider();
  const result = await signInWithProvider('apple');

  expect(result.result).not.toBe('error');
  expect(authState.calls).toContain('link');
  expect(authState.calls).toContain('signin');
  expect(authStampAnonOwnership).toHaveBeenCalledTimes(1);
});

test('iOS Apple sign-in sends SHA256(raw nonce) to Apple and the exact raw nonce to Firebase', async () => {
  let firebaseCredential: any = null;
  authState.linkImpl = async (credential) => {
    firebaseCredential = credential;
    authState.isAnonymous = false;
    return { user: authFactory().currentUser };
  };
  const expectedRawNonce = Array.from(
    { length: 32 },
    (_, index) => index.toString(16).padStart(2, '0'),
  ).join('');

  const { signInWithProvider } = loadAuthProvider(undefined, 'ios');
  const result = await signInWithProvider('apple');

  expect(result.result).not.toBe('error');
  expect(expoGetRandomBytesAsyncImpl).toHaveBeenCalledWith(32);
  expect(expoDigestStringAsyncImpl).toHaveBeenCalledWith(
    'SHA256',
    expectedRawNonce,
    { encoding: 'hex' },
  );
  expect(appleSignInImpl).toHaveBeenCalledWith(expect.objectContaining({
    nonce: `sha256:${expectedRawNonce}`,
  }));
  expect(firebaseCredential).toMatchObject({
    providerId: 'apple.com',
    idToken: 'fake-apple-id-token',
    nonce: expectedRawNonce,
  });
});

test('iOS retries ERR_REQUEST_UNKNOWN once before continuing Apple sign-in', async () => {
  jest.useFakeTimers();
  try {
    const unknownError: any = new Error('The authorization attempt failed for an unknown reason');
    unknownError.code = 'ERR_REQUEST_UNKNOWN';
    appleSignInImpl
      .mockRejectedValueOnce(unknownError)
      .mockResolvedValueOnce({
        identityToken: 'fake-apple-id-token-after-retry',
        email: 'apple@example.com',
        fullName: { givenName: 'Apple', familyName: 'User' },
      });
    const { signInWithProvider } = loadAuthProvider(undefined, 'ios');

    const pending = signInWithProvider('apple');
    await jest.advanceTimersByTimeAsync(700);
    const result = await pending;

    expect(result.result).not.toBe('error');
    expect(appleSignInImpl).toHaveBeenCalledTimes(2);
    expect(logEvent).toHaveBeenCalledWith('auth_signin_apple_unknown_retry', {});
    expect(authState.calls.filter((call) => call === 'link')).toHaveLength(1);
    expect(authState.calls).not.toContain('signin');
  } finally {
    jest.useRealTimers();
  }
});

test('iOS surfaces a second ERR_REQUEST_UNKNOWN without retrying forever', async () => {
  jest.useFakeTimers();
  try {
    const unknownError: any = new Error('The authorization attempt failed for an unknown reason');
    unknownError.code = 'ERR_REQUEST_UNKNOWN';
    appleSignInImpl.mockRejectedValue(unknownError);
    const { signInWithProvider } = loadAuthProvider(undefined, 'ios');

    const pending = signInWithProvider('apple');
    await jest.advanceTimersByTimeAsync(700);
    const result = await pending;

    expect(result).toEqual({
      result: 'error',
      error: expect.stringContaining('ERR_REQUEST_UNKNOWN'),
    });
    expect(appleSignInImpl).toHaveBeenCalledTimes(2);
    expect(authState.calls).not.toContain('signin');
    expect(authState.calls).not.toContain('link');
  } finally {
    jest.useRealTimers();
  }
});

test('an iOS Apple cancellation mutates no Firebase identity and the retry uses a fresh nonce', async () => {
  const cancelled: any = new Error('cancelled');
  cancelled.code = 'ERR_REQUEST_CANCELED';
  appleSignInImpl.mockRejectedValueOnce(cancelled);
  const { signInWithProvider } = loadAuthProvider(undefined, 'ios');

  await expect(signInWithProvider('apple')).resolves.toEqual({ result: 'cancelled' });
  expect(authState.calls).not.toContain('signin');
  expect(authState.calls).not.toContain('link');

  const retry = await signInWithProvider('apple');
  expect(retry.result).not.toBe('error');
  const firstNonce = appleSignInImpl.mock.calls[0]?.[0]?.nonce;
  const retryNonce = appleSignInImpl.mock.calls[1]?.[0]?.nonce;
  expect(firstNonce).toEqual(expect.any(String));
  expect(retryNonce).toEqual(expect.any(String));
  expect(retryNonce).not.toBe(firstNonce);
  expect(authState.calls.filter((call) => call === 'link')).toHaveLength(1);
  expect(authState.calls).not.toContain('signin');
});

test('iOS Apple sign-in fails closed before Apple and Firebase when a raw nonce cannot be produced', async () => {
  expoGetRandomBytesAsyncImpl.mockResolvedValueOnce(new Uint8Array());
  const { signInWithProvider } = loadAuthProvider(undefined, 'ios');

  const result = await signInWithProvider('apple');

  expect(result).toEqual({ result: 'error', error: expect.stringContaining('apple_signin_nonce_unavailable') });
  expect(appleSignInImpl).not.toHaveBeenCalled();
  expect(authState.calls).not.toContain('signin');
  expect(authState.calls).not.toContain('link');
});

test('concurrent iOS Apple callers share one native attempt and consume its credential exactly once', async () => {
  let resolveApple!: (credential: any) => void;
  appleSignInImpl.mockReturnValueOnce(new Promise((resolve) => {
    resolveApple = resolve;
  }));
  const { signInWithProvider } = loadAuthProvider(undefined, 'ios');

  const first = signInWithProvider('apple');
  const replay = signInWithProvider('apple');
  for (let i = 0; i < 10 && appleSignInImpl.mock.calls.length === 0; i += 1) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  expect(appleSignInImpl).toHaveBeenCalledTimes(1);

  resolveApple({
    identityToken: 'one-time-apple-token',
    email: 'apple@example.com',
    fullName: { givenName: 'Apple', familyName: 'User' },
  });
  const [firstResult, replayResult] = await Promise.all([first, replay]);

  expect(replayResult).toEqual(firstResult);
  expect(authState.calls.filter((call) => call === 'link')).toHaveLength(1);
  expect(authState.calls).not.toContain('signin');
});

test('refreshes the Firebase token after credential mutation before calling the stable-link server', async () => {
  const { signInWithProvider } = loadAuthProvider();
  const result = await signInWithProvider('google');

  expect(result.result).not.toBe('error');
  expect(authState.calls).toContain('token-refresh');
  expect(authState.calls.indexOf('token-refresh')).toBeLessThan(
    authState.calls.indexOf('signin') >= 0 ? authState.calls.indexOf('signin') + 1 : authState.calls.length,
  );
});

test('first same-provider tap after a pending local deletion creates a new empty profile in one picker', async () => {
  authState.linkImpl = async () => {
    const err: any = new Error('credential already in use');
    err.code = 'auth/credential-already-in-use';
    throw err;
  };
  const now = Date.now();
  const { signInWithProvider } = loadAuthProvider({
    account_delete_pending_auth_v1: JSON.stringify({
      providerUid: 'provider-uid-1',
      stableId: 'deleted-stable-id',
      createdAt: now - 60_000,
      expiresAt: now + 60_000,
    }),
  });
  (enqueueCloudDeletion as jest.Mock).mockResolvedValueOnce({
    ok: true,
    jobId: 'job-1',
    status: 'queued',
    created: false,
    authReleased: true,
    credentialSafe: true,
  });

  const result = await signInWithProvider('google');

  expect(result).toMatchObject({ result: 'created_new', email: 'u@example.com' });
  expect(enqueueCloudDeletion).toHaveBeenCalledWith('deleted-stable-id');
  expect(googleSignInImpl).toHaveBeenCalledTimes(1);
  expect(clearStableId).toHaveBeenCalledTimes(1);
  expect(restoreFromCloud).not.toHaveBeenCalled();
  expect(mergeStableAccountsViaServer).not.toHaveBeenCalled();
  expect(await lastLoadedAuthProviderStorage.getItem('account_delete_pending_auth_v1')).toBeNull();
});

test('idempotent completed deletion proof continues the same provider attempt without a second picker', async () => {
  authState.linkImpl = async () => {
    const err: any = new Error('credential already in use');
    err.code = 'auth/credential-already-in-use';
    throw err;
  };
  (enqueueCloudDeletion as jest.Mock).mockResolvedValueOnce({
    ok: true,
    jobId: 'job-1',
    status: 'completed',
    created: false,
    authReleased: true,
    credentialSafe: true,
  });
  const now = Date.now();
  const { signInWithProvider } = loadAuthProvider({
    account_delete_pending_auth_v1: JSON.stringify({
      providerUid: 'provider-uid-1',
      stableId: 'deleted-stable-id',
      createdAt: now - 60_000,
      expiresAt: now + 60_000,
    }),
  });

  const result = await signInWithProvider('google');

  expect(result).toMatchObject({ result: 'created_new' });
  expect(googleSignInImpl).toHaveBeenCalledTimes(1);
  // The completed receipt may be resumed from an already-anonymous Firebase
  // session; there is no provider session to sign out a second time.
  expect(authState.calls).not.toContain('signout');
  expect(clearStableId).toHaveBeenCalledTimes(1);
  expect(restoreFromCloud).not.toHaveBeenCalled();
  expect(await lastLoadedAuthProviderStorage.getItem('account_delete_pending_auth_v1')).toBeNull();
});

test('offline pending deletion fails closed before provider picker and preserves the durable guard', async () => {
  authState.isAnonymous = false;
  enqueueCloudDeletion.mockRejectedValueOnce(new Error('offline'));
  const now = Date.now();
  const { signInWithProvider } = loadAuthProvider({
    account_delete_pending_auth_v1: JSON.stringify({
      providerUid: 'provider-uid-1',
      stableId: 'deleted-stable-id',
      source: 'local',
      phase: 'local_data_cleared',
      createdAt: now - 1_000,
      expiresAt: now + 60_000,
    }),
  });

  await expect(signInWithProvider('google')).resolves.toEqual({
    result: 'error',
    error: 'account_delete_pending',
  });
  expect(googleSignInImpl).not.toHaveBeenCalled();
  expect(restoreFromCloud).not.toHaveBeenCalled();
  expect(await lastLoadedAuthProviderStorage.getItem('account_delete_pending_auth_v1'))
    .toContain('"phase":"local_data_cleared"');
});

test('provider sign-in rotates a stale local stable id instead of returning auth_link_failed', async () => {
  ensureStableAuthLinkForStableIdDetailed
    .mockResolvedValueOnce({
      ok: false,
      requestedStableId: 'local-stable-id',
      stableUid: null,
      authUid: 'provider-uid-1',
      source: 'unavailable',
      failure: 'stable_id_mismatch',
    })
    .mockResolvedValueOnce({
      ok: true,
      requestedStableId: 'rotated-stable-id',
      stableUid: 'rotated-stable-id',
      authUid: 'provider-uid-1',
      source: 'callable',
    });

  const { signInWithProvider } = loadAuthProvider();
  const result = await signInWithProvider('google');

  expect(result.result).not.toBe('error');
  expect(clearStableId).toHaveBeenCalledTimes(1);
  expect(quiesceSyncBeforeStableIdSwap).toHaveBeenCalledTimes(1);
  expect(ensureStableAuthLinkForStableIdDetailed.mock.calls[0][0]).toBe('local-stable-id');
  expect(ensureStableAuthLinkForStableIdDetailed.mock.calls[1][0]).toBe('rotated-stable-id');
});

test('stable-only retirement creates a new empty profile in the same provider attempt', async () => {
  authState.linkImpl = async () => {
    authState.isAnonymous = false;
    return { user: { uid: authState.providerUid, isAnonymous: false } };
  };
  ensureStableAuthLinkForStableIdDetailed
    .mockResolvedValueOnce({
      ok: false,
      requestedStableId: 'local-stable-id',
      stableUid: null,
      authUid: authState.providerUid,
      source: 'callable',
      failure: 'identity_retired',
      retiredSubject: 'stable',
    })
    .mockImplementation(async (stableId: string) => ({
      ok: true,
      requestedStableId: stableId,
      stableUid: stableId,
      authUid: authState.providerUid,
      source: 'callable',
    }));

  const { signInWithProvider } = loadAuthProvider();
  const result = await signInWithProvider('google');

  expect(result).toMatchObject({ result: 'created_new', email: 'u@example.com' });
  expect(startCloudDeletionEnqueue).not.toHaveBeenCalled();
  expect(enqueueCloudDeletion).not.toHaveBeenCalled();
  expect(authState.calls).not.toContain('signout');
  expect(clearStableId).toHaveBeenCalledTimes(1);
  expect(wipeLocalAccountData).toHaveBeenCalledTimes(1);
  expect(restoreFromCloud).not.toHaveBeenCalled();
  expect(syncToCloud).not.toHaveBeenCalled();
});

test('auth retirement fails closed to a fresh anonymous identity without restoring old data', async () => {
  authState.linkImpl = async () => {
    authState.isAnonymous = false;
    return { user: { uid: authState.providerUid, isAnonymous: false } };
  };
  ensureStableAuthLinkForStableIdDetailed
    .mockResolvedValueOnce({
      ok: false,
      requestedStableId: 'local-stable-id',
      stableUid: null,
      authUid: authState.providerUid,
      source: 'callable',
      failure: 'identity_retired',
      retiredSubject: 'auth',
    })
    .mockImplementation(async (stableId: string) => ({
      ok: true,
      requestedStableId: stableId,
      stableUid: stableId,
      authUid: authState.anonUid,
      source: 'callable',
    }));

  const { signInWithProvider } = loadAuthProvider();
  const result = await signInWithProvider('google');

  expect(result).toEqual({ result: 'error', error: 'identity_retired' });
  expect(startCloudDeletionEnqueue).not.toHaveBeenCalled();
  expect(authState.calls).toContain('signout');
  expect(clearStableId).toHaveBeenCalledTimes(1);
  expect(ensureAnonIdentityDetailed).toHaveBeenCalledTimes(1);
  expect(restoreFromCloud).not.toHaveBeenCalled();
  expect(syncToCloud).not.toHaveBeenCalled();
});

test('same-stable-id sign-in resolves before non-critical cloud hydration finishes', async () => {
  let releaseRestore!: () => void;
  restoreFromCloudDetailed.mockImplementationOnce(() => new Promise<'restored'>((resolve) => {
    releaseRestore = () => resolve('restored');
  }));

  const { signInWithProvider } = loadAuthProvider();
  const signInPromise = signInWithProvider('google');
  const observed = await Promise.race([
    signInPromise,
    new Promise<'blocked'>((resolve) => setTimeout(() => resolve('blocked'), 50)),
  ]);

  expect(observed).not.toBe('blocked');
  expect(['created_new', 'linked_existing']).toContain((observed as any).result);
  releaseRestore();
  await new Promise<void>((resolve) => setImmediate(resolve));
  expect(emitAppEvent).toHaveBeenCalledWith('cloud_profile_hydrated');
});

test('failed background restore never pushes local state over an existing cloud profile', async () => {
  restoreFromCloudDetailed.mockResolvedValueOnce('failed');

  const { signInWithProvider } = loadAuthProvider({ user_total_xp: '10' });
  const result = await signInWithProvider('google');
  await new Promise<void>((resolve) => setImmediate(resolve));

  expect(['created_new', 'linked_existing']).toContain(result.result);
  expect(syncToCloud).not.toHaveBeenCalled();
  expect(emitAppEvent).not.toHaveBeenCalledWith('cloud_profile_hydrated');
});

test('missing cloud document is distinct from restore failure and may safely upload local account data', async () => {
  restoreFromCloudDetailed.mockResolvedValueOnce('not_found');

  const { signInWithProvider } = loadAuthProvider({ unlocked_lessons: '[1,2]' });
  const result = await signInWithProvider('google');
  await new Promise<void>((resolve) => setImmediate(resolve));

  expect(['created_new', 'linked_existing']).toContain(result.result);
  expect(syncToCloud).toHaveBeenCalledTimes(1);
  expect(emitAppEvent).not.toHaveBeenCalledWith('cloud_profile_hydrated');
});

test('processed cloud document still permits upload when newer local progress needed no restore writes', async () => {
  restoreFromCloudDetailed.mockResolvedValueOnce('restored');

  const { signInWithProvider } = loadAuthProvider({ unlocked_lessons: '[1,2]' });
  const result = await signInWithProvider('google');
  await new Promise<void>((resolve) => setImmediate(resolve));

  expect(['created_new', 'linked_existing']).toContain(result.result);
  expect(syncToCloud).toHaveBeenCalledTimes(1);
  expect(emitAppEvent).toHaveBeenCalledWith('cloud_profile_hydrated');
});

// зачем (PM-289, D70/D84): жемчуг удалён в 2.0 — вход больше не открывает его журнал
// (минус шаг и до двух чтений Firestore на первом входе с устройства). Страж: шаг не
// вернётся незаметно, а на его месте остаётся лог [AUTH-SHARDS] ровно один раз за вход.
test('sign-in background refresh no longer loads the retired pearl journal (PM-289)', async () => {
  restoreFromCloudDetailed.mockResolvedValueOnce('restored');
  const logSpy = jest.spyOn(console, 'log');
  try {
    const { signInWithProvider } = loadAuthProvider({ unlocked_lessons: '[1,2]' });
    const result = await signInWithProvider('google');
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(['created_new', 'linked_existing']).toContain(result.result);
    // Фон дошёл до конца цепочки (иначе «не вызван» ничего бы не доказывал).
    expect(syncToCloud).toHaveBeenCalledTimes(1);
    expect(mockLoadShardsFromCloud).not.toHaveBeenCalled();
    const shardLines = logSpy.mock.calls
      .map((args) => String(args[0]))
      .filter((line) => line.startsWith('[AUTH-SHARDS]'));
    expect(shardLines).toHaveLength(1);
    expect(shardLines[0]).toContain('шаг шардов снят');
    expect(logSpy.mock.calls.some((args) => String(args[0]).includes(':loadShards '))).toBe(false);
  } finally {
    logSpy.mockRestore();
  }
});

test('concurrent taps share one provider sign-in instead of starting overlapping identity mutations', async () => {
  let releaseGoogle!: (value: any) => void;
  googleSignInImpl.mockImplementationOnce(() => new Promise((resolve) => { releaseGoogle = resolve; }));

  const { signInWithProvider } = loadAuthProvider();
  const first = signInWithProvider('google');
  const second = signInWithProvider('google');
  await new Promise<void>((resolve) => setImmediate(resolve));

  expect(googleSignInImpl).toHaveBeenCalledTimes(1);
  releaseGoogle({ type: 'success', data: { idToken: 'fake-google-id-token', user: { email: 'u@example.com', name: 'Test User' } } });
  const [firstResult, secondResult] = await Promise.all([first, second]);
  expect(secondResult).toEqual(firstResult);
});

test('a different provider cannot attach to an in-flight provider result', async () => {
  let releaseGoogle!: (value: any) => void;
  googleSignInImpl.mockImplementationOnce(() => new Promise((resolve) => { releaseGoogle = resolve; }));

  const { signInWithProvider } = loadAuthProvider();
  const google = signInWithProvider('google');
  await new Promise<void>((resolve) => setImmediate(resolve));
  const apple = await signInWithProvider('apple');

  expect(apple).toEqual({ result: 'error', error: 'auth_signin_in_progress_google' });
  releaseGoogle({ type: 'cancelled' });
  await google;
});

test('recovery acquires one Google native credential without mutating default account state', async () => {
  const { acquireAuthRecoveryNativeCredential } = loadAuthProvider(undefined, 'android');

  await expect(acquireAuthRecoveryNativeCredential('google')).resolves.toEqual({
    idToken: 'fake-google-id-token',
    email: 'u@example.com',
    displayName: 'Test User',
  });
  expect(googleSignInImpl).toHaveBeenCalledTimes(1);
  expect(authState.calls).toEqual([]);
  expect(ensureAnonUser).not.toHaveBeenCalled();
  expect(syncToCloud).not.toHaveBeenCalled();
  expect(restoreFromCloud).not.toHaveBeenCalled();
});

test('recovery routes Apple to native iOS and browser Android exactly once', async () => {
  const ios = loadAuthProvider(undefined, 'ios');
  await expect(ios.acquireAuthRecoveryNativeCredential('apple')).resolves.toMatchObject({
    idToken: 'fake-apple-id-token',
    email: 'apple@example.com',
    displayName: 'Apple User',
    appleNonce: expect.any(String),
  });
  expect(appleSignInImpl).toHaveBeenCalledTimes(1);

  process.env.EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID = 'com.phraseman.test';
  const openAuthSessionAsync = require('expo-web-browser').openAuthSessionAsync as jest.Mock;
  openAuthSessionAsync.mockClear();
  const android = loadAuthProvider(undefined, 'android');
  await expect(android.acquireAuthRecoveryNativeCredential('apple')).resolves.toEqual({ cancelled: true });
  expect(openAuthSessionAsync).toHaveBeenCalledTimes(1);
  expect(appleSignInImpl).toHaveBeenCalledTimes(1);
  delete process.env.EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID;
});

test('recovery reservation releases after cancellation and native error', async () => {
  googleSignInImpl
    .mockResolvedValueOnce({ type: 'cancelled' })
    .mockRejectedValueOnce(new Error('native-broke'))
    .mockResolvedValueOnce({
      type: 'success',
      data: { idToken: 'retry-token', user: { email: 'retry@example.com', name: 'Retry User' } },
    });
  const { acquireAuthRecoveryNativeCredential } = loadAuthProvider(undefined, 'android');

  await expect(acquireAuthRecoveryNativeCredential('google')).resolves.toEqual({ cancelled: true });
  await expect(acquireAuthRecoveryNativeCredential('google')).rejects.toThrow('native-broke');
  await expect(acquireAuthRecoveryNativeCredential('google')).resolves.toMatchObject({ idToken: 'retry-token' });
  expect(googleSignInImpl).toHaveBeenCalledTimes(3);
});

test('normal sign-in and recovery acquisition exclude each other in both directions', async () => {
  let releaseNormal!: (value: any) => void;
  googleSignInImpl.mockImplementationOnce(() => new Promise(resolve => { releaseNormal = resolve; }));
  const firstModule = loadAuthProvider(undefined, 'ios');
  const normal = firstModule.signInWithProvider('google');
  await new Promise<void>(resolve => setImmediate(resolve));
  await expect(firstModule.acquireAuthRecoveryNativeCredential('apple'))
    .rejects.toThrow('auth_recovery_credential_blocked_signin_google');
  releaseNormal({ type: 'cancelled' });
  await normal;

  let releaseRecovery!: (value: any) => void;
  googleSignInImpl.mockImplementationOnce(() => new Promise(resolve => { releaseRecovery = resolve; }));
  const secondModule = loadAuthProvider(undefined, 'ios');
  const recovery = secondModule.acquireAuthRecoveryNativeCredential('google');
  await new Promise<void>(resolve => setImmediate(resolve));
  await expect(secondModule.signInWithProvider('apple')).resolves.toEqual({
    result: 'error',
    error: 'auth_signin_in_progress_recovery_google',
  });
  await expect(secondModule.acquireAuthRecoveryNativeCredential('apple'))
    .rejects.toThrow('auth_recovery_credential_in_progress_google');
  releaseRecovery({ type: 'cancelled' });
  await expect(recovery).resolves.toEqual({ cancelled: true });
});

test('a timed-out recovery Google picker keeps blocking normal sign-in until native settlement', async () => {
  jest.useFakeTimers();
  try {
    let releaseRecovery!: (value: any) => void;
    googleSignInImpl.mockImplementationOnce(() => new Promise(resolve => { releaseRecovery = resolve; }));
    const mod = loadAuthProvider(undefined, 'ios');
    const recovery = mod.acquireAuthRecoveryNativeCredential('google');
    const recoveryTimedOut = expect(recovery).rejects.toThrow('google_signin_timeout');

    await jest.advanceTimersByTimeAsync(30_001);
    await recoveryTimedOut;
    await expect(mod.signInWithProvider('apple')).resolves.toEqual({
      result: 'error',
      error: 'auth_signin_in_progress_recovery_google',
    });
    expect(authState.calls).toEqual([]);

    releaseRecovery({ type: 'cancelled' });
    await Promise.resolve();
    await Promise.resolve();
    googleSignInImpl.mockResolvedValueOnce({ type: 'cancelled' });
    await expect(mod.acquireAuthRecoveryNativeCredential('google'))
      .resolves.toEqual({ cancelled: true });
  } finally {
    jest.useRealTimers();
  }
});

test('a timed-out normal Google picker keeps blocking recovery until native settlement', async () => {
  jest.useFakeTimers();
  try {
    let releaseNormal!: (value: any) => void;
    googleSignInImpl.mockImplementationOnce(() => new Promise(resolve => { releaseNormal = resolve; }));
    const mod = loadAuthProvider(undefined, 'ios');
    const normal = mod.signInWithProvider('google');

    await jest.advanceTimersByTimeAsync(30_001);
    await expect(normal).resolves.toMatchObject({
      result: 'error',
      error: expect.stringContaining('google_signin_timeout'),
    });
    await expect(mod.acquireAuthRecoveryNativeCredential('apple'))
      .rejects.toThrow('auth_recovery_credential_blocked_signin_google');

    releaseNormal({ type: 'cancelled' });
    await Promise.resolve();
    await Promise.resolve();
    await expect(mod.acquireAuthRecoveryNativeCredential('apple')).resolves.toMatchObject({
      idToken: 'fake-apple-id-token',
      appleNonce: expect.any(String),
    });
  } finally {
    jest.useRealTimers();
  }
});

// зачем: боевой баг владельца (2026-07-27) — «вход сработал только с 5 попытки,
// обязано с первой». Нативный промис Google переиспользовался, чтобы не открыть
// второй пикер поверх первого, но снимался лишь в следующем микротаске. Если
// вызов ОТКЛОНЁН, повторное нажатие цеплялось к мёртвому промису и получало
// мгновенную ошибку без пикера — пока очистка наконец не отработает.
test('a rejected native Google sign-in does not poison the next attempt', async () => {
  // Воспроизводим ГОНКУ: нативный вызов отклоняется не мгновенно, поэтому между
  // отказом и очисткой в `.then` есть окно, в которое попадает второе нажатие.
  let rejectNative!: (reason: unknown) => void;
  googleSignInImpl.mockImplementationOnce(
    () => new Promise((_resolve, reject) => { rejectNative = reject; }),
  );
  const { signInWithProvider } = loadAuthProvider();

  const first = signInWithProvider('google');
  await new Promise<void>((resolve) => setImmediate(resolve));
  rejectNative(new Error('transient native failure'));
  expect((await first).result).toBe('error');

  // Вторая попытка обязана ОТКРЫТЬ НОВЫЙ пикер, а не упасть на мёртвом промисе.
  const callsBefore = googleSignInImpl.mock.calls.length;
  const second = await signInWithProvider('google');
  expect(googleSignInImpl.mock.calls.length).toBeGreaterThan(callsBefore);
  expect(second.result).not.toBe('error');
});

test('an over-deadline provider operation reports still-running instead of wedging every retry', async () => {
  let releaseGoogle!: (value: any) => void;
  googleSignInImpl.mockImplementationOnce(() => new Promise((resolve) => { releaseGoogle = resolve; }));
  const now = jest.spyOn(Date, 'now').mockReturnValueOnce(1_000).mockReturnValue(46_001);

  const { signInWithProvider } = loadAuthProvider();
  const first = signInWithProvider('google');
  await new Promise<void>((resolve) => setImmediate(resolve));
  const retry = await signInWithProvider('google');

  expect(retry).toEqual({ result: 'error', error: 'auth_signin_still_running_google' });
  releaseGoogle({ type: 'cancelled' });
  await first;
  now.mockRestore();
});

test('provider display name is forwarded to the stable-link server metadata', async () => {
  const { signInWithProvider } = loadAuthProvider();
  await signInWithProvider('google');

  expect(ensureStableAuthLinkForStableIdDetailed).toHaveBeenCalledWith(
    'local-stable-id',
    expect.objectContaining({ email: 'u@example.com', displayName: 'Test User' }),
  );
});

test('returning account conflict on a proven-empty device switches without A-scoped sync or merge', async () => {
  authState.linkImpl = async () => {
    const err: any = new Error('credential already in use');
    err.code = 'auth/credential-already-in-use';
    throw err;
  };
  ensureStableAuthLinkForStableIdDetailed.mockResolvedValueOnce({
    ok: true,
    stableUid: 'remote-stable-id',
    source: 'server',
  });

  const { signInWithProvider } = loadAuthProvider();
  const result = await signInWithProvider('google');

  expect(result).toMatchObject({ result: 'merged_devices' });
  expect(syncToCloud).not.toHaveBeenCalled();
  expect(mergeStableAccountsViaServer).not.toHaveBeenCalled();
  expect(ensureStableAuthLinkForStableIdDetailed).toHaveBeenCalled();
  expect(quiesceSyncBeforeStableIdSwap).toHaveBeenCalled();
  expect(wipeLocalAccountData).toHaveBeenCalled();
  expect(beginPremiumAccountTransition).toHaveBeenCalled();
});

test('Apple uses the same premium transition boundary when it swaps to a returning account', async () => {
  ensureStableAuthLinkForStableIdDetailed.mockResolvedValueOnce({
    ok: true,
    stableUid: 'remote-stable-id',
    source: 'server',
  });

  const { signInWithProvider } = loadAuthProvider(undefined, 'ios');
  const result = await signInWithProvider('apple');

  expect(result).toMatchObject({ result: 'merged_devices' });
  expect(beginPremiumAccountTransition).toHaveBeenCalled();
});

test('an enqueue rejection keeps a linked deletion quarantined for a later retry', async () => {
  authState.isAnonymous = false;
  enqueueCloudDeletion.mockRejectedValueOnce(new Error('offline'));
  const authProvider = loadAuthProvider();

  const handoff = await authProvider.beginAccountDeletion();
  expect(handoff.ok).toBe(true);
  if (!handoff.ok) throw new Error(handoff.reason);
  const result = await handoff.completion;

  expect(result).toEqual({ ok: false, reason: 'account_delete_enqueue_failed' });
  expect(authState.calls).not.toContain('signout');
  expect(wipeLocalAccountData).toHaveBeenCalledTimes(1);
  expect(clearStableId).not.toHaveBeenCalled();
  expect(await lastLoadedAuthProviderStorage.getItem('account_delete_pending_auth_v1'))
    .toContain('"phase":"local_data_cleared"');
  expect(logEvent.mock.calls.some(([name]) => name === 'auth_account_delete_enqueue_failed')).toBe(true);
});

// A linked account must retain a durable local quarantine before any wipe.
// Anonymous deletion remains fail-open because it has no provider identity that
// could immediately re-bind the deleted stable account.
test('linked account deletion fails before wiping when the durable guard cannot be saved', async () => {
  authState.isAnonymous = false;
  const storage = require('@react-native-async-storage/async-storage');
  const secureStore = require('expo-secure-store');
  // Ровно один отказ: лишние mockRejectedValueOnce протекали в следующий тест
  // (cold restart pending guard) и валили его.
  secureStore.setItemAsync.mockRejectedValueOnce(new Error('secure store unavailable'));
  storage.setItem.mockRejectedValueOnce(new Error('async storage unavailable'));
  const authProvider = loadAuthProvider();

  const result = await authProvider.deleteAccountAndWipe();

  expect(result).toEqual({ ok: false, reason: 'pending_guard_persist_failed' });
  // No local identity state changes before the required quarantine exists.
  expect(wipeLocalAccountData).not.toHaveBeenCalled();
  expect(startCloudDeletionEnqueue).not.toHaveBeenCalled();
});

test('linked deletion remains prepared and fails closed when the local privacy wipe throws', async () => {
  authState.isAnonymous = false;
  wipeLocalAccountData.mockRejectedValueOnce(new Error('wipe unavailable'));
  const accountGeneration = require('../app/account_generation');
  const authProvider = loadAuthProvider();

  const handoff = await authProvider.beginAccountDeletion();

  expect(handoff).toEqual({ ok: false, reason: 'local_wipe_unverified' });
  expect(startCloudDeletionEnqueue).not.toHaveBeenCalled();
  expect(accountGeneration.beginAccountGeneration).not.toHaveBeenCalled();
  expect(await lastLoadedAuthProviderStorage.getItem('account_delete_pending_auth_v1'))
    .toContain('"phase":"prepared"');
});

test('partial AsyncStorage residue cannot advance deletion or create a fresh generation', async () => {
  authState.isAnonymous = false;
  const accountGeneration = require('../app/account_generation');
  const authProvider = loadAuthProvider({ user_total_xp: '99' });
  const storage = lastLoadedAuthProviderStorage as typeof import('@react-native-async-storage/async-storage').default & {
    clear: jest.Mock;
    getAllKeys: jest.Mock;
  };
  const originalClear = storage.clear.getMockImplementation();
  const originalGetAllKeys = storage.getAllKeys.getMockImplementation();
  storage.clear.mockImplementation(async () => {
    // Simulate the production failure mode where clear resolves but old account
    // data remains on disk. Verification, not the return value, is authoritative.
  });
  storage.getAllKeys.mockResolvedValue([
    'user_total_xp',
    'account_delete_pending_auth_v1',
  ]);
  let handoff: Awaited<ReturnType<typeof authProvider.beginAccountDeletion>>;
  try {
    handoff = await authProvider.beginAccountDeletion();
  } finally {
    storage.clear.mockImplementation(originalClear);
    storage.getAllKeys.mockImplementation(originalGetAllKeys);
  }

  expect(handoff).toEqual({ ok: false, reason: 'local_wipe_unverified' });
  expect(startCloudDeletionEnqueue).not.toHaveBeenCalled();
  expect(accountGeneration.beginAccountGeneration).not.toHaveBeenCalled();
  expect(await lastLoadedAuthProviderStorage.getItem('account_delete_pending_auth_v1'))
    .toContain('"phase":"prepared"');
});

test('unreadable post-wipe storage is not accepted as an empty account', async () => {
  authState.isAnonymous = false;
  const authProvider = loadAuthProvider();
  const storage = lastLoadedAuthProviderStorage as typeof import('@react-native-async-storage/async-storage').default & {
    getAllKeys: jest.Mock;
  };
  storage.getAllKeys.mockRejectedValueOnce(new Error('storage unreadable'));
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

  let handoff: Awaited<ReturnType<typeof authProvider.beginAccountDeletion>>;
  let warnLines: string[];
  try {
    handoff = await authProvider.beginAccountDeletion();
  } finally {
    warnLines = warn.mock.calls.map((call) => String(call[0]));
    warn.mockRestore();
  }

  expect(handoff).toEqual({ ok: false, reason: 'local_wipe_unverified' });
  expect(startCloudDeletionEnqueue).not.toHaveBeenCalled();
  expect(await lastLoadedAuthProviderStorage.getItem('account_delete_pending_auth_v1'))
    .toContain('"phase":"prepared"');
  // зачем (хвост security-ревью PM-289, L-2): отказ проверки стирания больше не немой —
  // причина в логе, поведение прежнее (закрыто).
  expect(warnLines.some((line) => line.startsWith('[AUTH-DELETE] wipe_verify_failed code='))).toBe(true);
});

// зачем (хвост security-ревью PM-289, L-1): отдельный снос pending_shard_grants_* при удалении снят —
// его покрывает проверенная полная очистка (verifyPostDeleteLocalWipe). Значит, любой посторонний
// ключ после неё, в том числе pending_shard_grants_*, обязан остановить удаление.
test.each([
  'pending_shard_grants_v2:stable-a',
  'pending_shard_grants_delete_cleanup_v1:stable-a',
  'pending_shard_grants_v1',
  'some_unknown_account_key_v9',
])('post-delete wipe residue %s → local_wipe_unverified, deletion does not continue (PM-289 L-1)', async (residue) => {
  authState.isAnonymous = false;
  const accountGeneration = require('../app/account_generation');
  const authProvider = loadAuthProvider();
  const storage = lastLoadedAuthProviderStorage as typeof import('@react-native-async-storage/async-storage').default & {
    getAllKeys: jest.Mock;
  };
  const originalGetAllKeys = storage.getAllKeys.getMockImplementation();
  storage.getAllKeys.mockResolvedValue([residue, 'account_delete_pending_auth_v1']);
  let handoff: Awaited<ReturnType<typeof authProvider.beginAccountDeletion>>;
  try {
    handoff = await authProvider.beginAccountDeletion();
  } finally {
    storage.getAllKeys.mockImplementation(originalGetAllKeys);
  }

  expect(handoff).toEqual({ ok: false, reason: 'local_wipe_unverified' });
  expect(startCloudDeletionEnqueue).not.toHaveBeenCalled();
  expect(accountGeneration.beginAccountGeneration).not.toHaveBeenCalled();
  expect(await lastLoadedAuthProviderStorage.getItem('account_delete_pending_auth_v1'))
    .toContain('"phase":"prepared"');
});

test('phone-state lineage retirement failure keeps the guard prepared and blocks fresh identity', async () => {
  authState.isAnonymous = false;
  mockRetirePhoneStateAfterDeletion.mockRejectedValueOnce(new Error('sqlcipher key unavailable'));
  const accountGeneration = require('../app/account_generation');
  const authProvider = loadAuthProvider();

  const handoff = await authProvider.beginAccountDeletion();

  expect(handoff).toEqual({ ok: false, reason: 'local_wipe_unverified' });
  expect(wipeLocalAccountData).not.toHaveBeenCalled();
  expect(startCloudDeletionEnqueue).not.toHaveBeenCalled();
  expect(accountGeneration.beginAccountGeneration).not.toHaveBeenCalled();
  expect(await lastLoadedAuthProviderStorage.getItem('account_delete_pending_auth_v1'))
    .toContain('"phase":"prepared"');
});

test('timed-out local wipe remains a single joined flight and cannot clear a fresh generation later', async () => {
  jest.useFakeTimers();
  authState.isAnonymous = false;
  let resolveWipe!: () => void;
  wipeLocalAccountData.mockImplementationOnce(() => new Promise<void>((resolve) => {
    resolveWipe = resolve;
  }));
  const accountGeneration = require('../app/account_generation');
  const authProvider = loadAuthProvider({ user_total_xp: '73' });
  try {
    const first = authProvider.beginAccountDeletion();
    await waitForCall(wipeLocalAccountData, 'wipeLocalAccountData');
    // зачем: полный локальный wipe — цепочка нативных шагов, и её бюджет
    // намеренно поднят до 5 с (одна секунда давала ложный таймаут на реальном
    // iOS). Тест обязан перематывать ВЕСЬ бюджет, иначе висит на первом await.
    await jest.advanceTimersByTimeAsync(LOCAL_WIPE_DEADLINE_MS + LOCAL_WIPE_GRACE_MS);
    await expect(first).resolves.toEqual({ ok: false, reason: 'local_wipe_unverified' });

    const retry = authProvider.beginAccountDeletion();
    await Promise.resolve();
    expect(wipeLocalAccountData).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(LOCAL_WIPE_DEADLINE_MS + LOCAL_WIPE_GRACE_MS);
    await expect(retry).resolves.toEqual({ ok: false, reason: 'local_wipe_unverified' });
    expect(startCloudDeletionEnqueue).not.toHaveBeenCalled();
    expect(accountGeneration.beginAccountGeneration).not.toHaveBeenCalled();

    resolveWipe();
    await jest.runAllTimersAsync();
    await Promise.resolve();
    expect(wipeLocalAccountData).toHaveBeenCalledTimes(1);
    expect(startCloudDeletionEnqueue).not.toHaveBeenCalled();
    expect(accountGeneration.beginAccountGeneration).not.toHaveBeenCalled();
    expect(await lastLoadedAuthProviderStorage.getItem('account_delete_pending_auth_v1'))
      .toContain('"phase":"prepared"');
  } finally {
    jest.useRealTimers();
  }
});

test('a hung local_data_cleared guard write cannot freeze the deletion handoff', async () => {
  jest.useFakeTimers();
  authState.isAnonymous = false;
  const secureStore = require('expo-secure-store') as {
    setItemAsync: jest.Mock;
  };
  const originalSetItem = secureStore.setItemAsync.getMockImplementation();
  secureStore.setItemAsync.mockImplementation((key: string, value: string, options?: unknown) => {
    if (value.includes('"phase":"local_data_cleared"')) return new Promise<void>(() => {});
    return originalSetItem?.(key, value, options);
  });
  const authProvider = loadAuthProvider();
  try {
    // зачем: смысл теста — «зависшая запись НЕ морозит UI навсегда», а не
    // «уложились в 1.3 с». Сторож даёт зависшей записи бюджет локального wipe
    // (5 с), поэтому гонку ведём с запасом поверх бюджета. Часы фальшивые:
    // на реальных тест честно спал бы 5 секунд, а при следующем изменении
    // бюджета снова ВИСЕЛ бы вместо падения по assert.
    const race = Promise.race([
      authProvider.beginAccountDeletion(),
      new Promise<'ui_timeout'>((resolve) => (
        setTimeout(() => resolve('ui_timeout'), LOCAL_WIPE_DEADLINE_MS + 1_500)
      )),
    ]);
    await jest.advanceTimersByTimeAsync(LOCAL_WIPE_DEADLINE_MS + 1_500);
    const outcome = await race;
    expect(outcome).toEqual({ ok: false, reason: 'local_wipe_unverified' });
    expect(startCloudDeletionEnqueue).not.toHaveBeenCalled();
    expect(await lastLoadedAuthProviderStorage.getItem('account_delete_pending_auth_v1'))
      .toContain('"phase":"prepared"');
  } finally {
    secureStore.setItemAsync.mockImplementation(originalSetItem);
    jest.useRealTimers();
  }
});

test('a concurrent delete tap cannot treat a prepared guard as a completed local wipe', async () => {
  authState.isAnonymous = false;
  let rejectRetirement!: (error: Error) => void;
  mockRetirePhoneStateAfterDeletion.mockImplementationOnce(() => new Promise<void>((_resolve, reject) => {
    rejectRetirement = reject;
  }));
  const accountGeneration = require('../app/account_generation');
  const authProvider = loadAuthProvider();

  const first = authProvider.beginAccountDeletion();
  for (let attempt = 0; attempt < 20 && !rejectRetirement; attempt += 1) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  expect(rejectRetirement).toBeDefined();

  const second = await authProvider.beginAccountDeletion();
  expect(second).toEqual({ ok: false, reason: 'local_wipe_unverified' });
  expect(wipeLocalAccountData).not.toHaveBeenCalled();
  expect(startCloudDeletionEnqueue).not.toHaveBeenCalled();
  expect(accountGeneration.beginAccountGeneration).not.toHaveBeenCalled();

  rejectRetirement(new Error('sqlcipher retirement failed'));
  await expect(first).resolves.toEqual({ ok: false, reason: 'local_wipe_unverified' });
  expect(await lastLoadedAuthProviderStorage.getItem('account_delete_pending_auth_v1'))
    .toContain('"phase":"prepared"');
  expect(wipeLocalAccountData).not.toHaveBeenCalled();
  expect(startCloudDeletionEnqueue).not.toHaveBeenCalled();
  expect(accountGeneration.beginAccountGeneration).not.toHaveBeenCalled();
});

test('cold restart local_data_cleared repairs credential safety before exactly one provider picker', async () => {
  authState.isAnonymous = true;
  const wrappedDefault = Object.assign(
    () => {
      const base = originalAuthFactoryDefault();
      return {
        ...base,
        currentUser: null,
        onAuthStateChanged: (listener: (user: unknown) => void) => {
          queueMicrotask(() => listener(null));
          return jest.fn();
        },
      };
    },
    originalAuthFactoryDefault,
  );
  authFactory.default = wrappedDefault;
  enqueueCloudDeletion.mockRejectedValueOnce(new Error('lost response after closure'));
  waitForAccountDeletionCredentialSafe.mockResolvedValueOnce(true);
  const now = Date.now();
  const { signInWithProvider } = loadAuthProvider({
    account_delete_pending_auth_v1: JSON.stringify({
      providerUid: 'provider-uid-1',
      stableId: 'deleted-stable-id',
      source: 'local',
      phase: 'local_data_cleared',
      createdAt: now - 60_000,
      expiresAt: now + 60_000,
    }),
  });

  const result = await signInWithProvider('google');

  expect(result).toMatchObject({ result: 'created_new' });
  expect(waitForAccountDeletionCredentialSafe).toHaveBeenCalledTimes(1);
  expect(googleSignInImpl).toHaveBeenCalledTimes(1);
  expect(clearStableId).toHaveBeenCalledTimes(1);
  expect(restoreFromCloud).not.toHaveBeenCalled();
  expect(mergeStableAccountsViaServer).not.toHaveBeenCalled();
  expect(await lastLoadedAuthProviderStorage.getItem('account_delete_pending_auth_v1')).toBeNull();
});

it.each([
  ['local_data_cleared', 'null', 'google'],
  ['local_data_cleared', 'null', 'apple'],
  ['local_data_cleared', 'anonymous', 'google'],
  ['local_data_cleared', 'anonymous', 'apple'],
  ['server_enqueued', 'null', 'google'],
  ['server_enqueued', 'null', 'apple'],
  ['server_enqueued', 'anonymous', 'google'],
  ['server_enqueued', 'anonymous', 'apple'],
] as const)(
  'same-call restart convergence: phase=%s auth=%s provider=%s opens exactly one picker',
  async (phase, authKind, provider) => {
    authState.isAnonymous = true;
    if (authKind === 'null') {
      const wrappedDefault = Object.assign(
        () => {
          const base = originalAuthFactoryDefault();
          return {
            ...base,
            currentUser: null,
            onAuthStateChanged: (listener: (user: unknown) => void) => {
              queueMicrotask(() => listener(null));
              return jest.fn();
            },
          };
        },
        originalAuthFactoryDefault,
      );
      authFactory.default = wrappedDefault;
    }
    if (phase === 'local_data_cleared') {
      waitForAccountDeletionCredentialSafe.mockResolvedValueOnce(true);
    }
    const now = Date.now();
    const { signInWithProvider } = loadAuthProvider({
      account_delete_pending_auth_v1: JSON.stringify({
        providerUid: 'provider-uid-1',
        stableId: 'deleted-stable-id',
        source: 'local',
        phase,
        createdAt: now - 60_000,
        expiresAt: now + 60_000,
      }),
    }, 'ios');

    const result = await signInWithProvider(provider);

    expect(result).toMatchObject({ result: 'created_new' });
    expect(provider === 'google' ? googleSignInImpl : appleSignInImpl).toHaveBeenCalledTimes(1);
    expect(provider === 'google' ? appleSignInImpl : googleSignInImpl).not.toHaveBeenCalled();
    expect(restoreFromCloud).not.toHaveBeenCalled();
    expect(mergeStableAccountsViaServer).not.toHaveBeenCalled();
  },
);

test('startup pending-delete recovery waits for auth hydration before treating null as signed out', async () => {
  let hydrated = false;
  let releaseAuth!: () => void;
  const wrappedDefault = Object.assign(
    () => {
      const base = originalAuthFactoryDefault();
      const wrapped = {
        ...base,
        onAuthStateChanged: (listener: (user: unknown) => void) => {
          releaseAuth = () => {
            hydrated = true;
            authState.isAnonymous = false;
            listener(base.currentUser);
          };
          return jest.fn();
        },
      };
      Object.defineProperty(wrapped, 'currentUser', {
        get: () => hydrated ? base.currentUser : null,
      });
      return wrapped;
    },
    originalAuthFactoryDefault,
  );
  authFactory.default = wrappedDefault;
  const now = Date.now();
  const { resumePendingAccountDeleteLocalExit } = loadAuthProvider({
    account_delete_pending_auth_v1: JSON.stringify({
      providerUid: 'provider-uid-1',
      stableId: 'deleted-stable-id',
      phase: 'prepared',
      createdAt: now - 1_000,
      expiresAt: now + 60_000,
    }),
  });

  const recovery = resumePendingAccountDeleteLocalExit();
  await new Promise<void>((resolve) => setImmediate(resolve));
  expect(startCloudDeletionEnqueue).not.toHaveBeenCalled();
  expect(wipeLocalAccountData).not.toHaveBeenCalled();
  expect(clearStableId).not.toHaveBeenCalled();

  releaseAuth();
  await expect(recovery).resolves.toBe(true);
  expect(startCloudDeletionEnqueue).toHaveBeenCalledWith(
    'deleted-stable-id',
    expect.objectContaining({ operationId: expect.any(String), capability: expect.any(String) }),
  );
  expect(authState.calls).toContain('signout');
  expect(wipeLocalAccountData).toHaveBeenCalledTimes(1);
  expect(clearStableId).toHaveBeenCalledTimes(1);
});

test('expired same-provider guard with terminal server proof creates the fresh profile in the same tap', async () => {
  authState.isAnonymous = false;
  const now = Date.now();
  const { signInWithProvider } = loadAuthProvider({
    account_delete_pending_auth_v1: JSON.stringify({
      providerUid: 'provider-uid-1',
      stableId: 'deleted-stable-id',
      createdAt: now - 60_000,
      expiresAt: now - 1,
    }),
  });

  const result = await signInWithProvider('google');

  expect(result).toMatchObject({ result: 'created_new' });
  expect(googleSignInImpl).toHaveBeenCalledTimes(1);
  expect(enqueueCloudDeletion).toHaveBeenCalledWith('deleted-stable-id');
  expect(clearStableId).toHaveBeenCalledTimes(1);
  expect(await lastLoadedAuthProviderStorage.getItem('account_delete_pending_auth_v1')).toBeNull();
});

it.each(['null', 'anonymous'] as const)(
  'expired irreversible receipt resumes from %s auth and opens exactly one provider picker',
  async (authKind) => {
    if (authKind === 'null') {
      const wrappedDefault = Object.assign(
        () => {
          const base = originalAuthFactoryDefault();
          return {
            ...base,
            currentUser: null,
            onAuthStateChanged: (listener: (user: unknown) => void) => {
              queueMicrotask(() => listener(null));
              return jest.fn();
            },
          };
        },
        originalAuthFactoryDefault,
      );
      authFactory.default = wrappedDefault;
    } else {
      authState.isAnonymous = true;
    }
    enqueueCloudDeletion.mockRejectedValueOnce(new Error('lost response after irreversible fence'));
    waitForAccountDeletionCredentialSafe.mockResolvedValueOnce(true);
    const now = Date.now();
    const { signInWithProvider } = loadAuthProvider({
      account_delete_pending_auth_v1: JSON.stringify({
        providerUid: 'provider-uid-1',
        stableId: 'deleted-stable-id',
        source: 'local',
        phase: 'local_data_cleared',
        createdAt: now - 8 * 24 * 60 * 60_000,
        expiresAt: now - 24 * 60 * 60_000,
      }),
    });

    await expect(signInWithProvider('google')).resolves.toMatchObject({ result: 'created_new' });
    expect(waitForAccountDeletionCredentialSafe).toHaveBeenCalledTimes(1);
    expect(googleSignInImpl).toHaveBeenCalledTimes(1);
    expect(restoreFromCloud).not.toHaveBeenCalled();
    expect(await lastLoadedAuthProviderStorage.getItem('account_delete_pending_auth_v1')).toBeNull();
  },
);

test('a foreign delete guard never bypasses the explicit provider account-switch boundary', async () => {
  authState.isAnonymous = false;
  const now = Date.now();
  const { signInWithProvider } = loadAuthProvider({
    account_delete_pending_auth_v1: JSON.stringify({
      providerUid: 'different-provider-uid',
      stableId: 'deleted-stable-id',
      createdAt: now - 60_000,
      expiresAt: now + 60_000,
    }),
  });

  const result = await signInWithProvider('google');

  expect(result).toEqual({ result: 'error', error: 'account_switch_required' });
  expect(googleSignInImpl).not.toHaveBeenCalled();
  expect(enqueueCloudDeletion).not.toHaveBeenCalled();
});

test('an authenticated provider account cannot open another provider picker without a confirmed switch', async () => {
  authState.isAnonymous = false;
  const { signInWithProvider } = loadAuthProvider();

  await expect(signInWithProvider('google')).resolves.toEqual({
    result: 'error',
    error: 'account_switch_required',
  });
  expect(googleSignInImpl).not.toHaveBeenCalled();
  expect(authState.calls).toHaveLength(0);
});

test('Firebase sign-out failure is rethrown without resetting anonymous auth state or logging success', async () => {
  authState.isAnonymous = false;
  rejectFirebaseSignOut(new Error('firebase signout failed'));
  const { signOutCurrentProvider } = loadAuthProvider();

  await expect(signOutCurrentProvider()).rejects.toThrow('firebase signout failed');

  expect(resetAnonAuthCacheForSignOut).not.toHaveBeenCalled();
  expect(logEvent.mock.calls.some(([name]) => name === 'auth_signout')).toBe(false);
});

test('account switch writes its owner marker before Firebase sign-out and stays quarantined on failure', async () => {
  authState.isAnonymous = false;
  rejectFirebaseSignOut(new Error('firebase signout failed'));
  const { signOutAndWipeForAccountSwitch } = loadAuthProvider();

  const result = await signOutAndWipeForAccountSwitch();

  expect(result).toMatchObject({ ok: false });
  const markerRaw = await lastLoadedAuthProviderStorage.getItem('account_switch_quarantine_v1');
  expect(JSON.parse(markerRaw!)).toMatchObject({
    version: 1,
    phase: 'prepared',
    ownerStableId: 'local-stable-id',
    ownerAuthUid: 'provider-uid-1',
  });
  const accountGeneration = require('../app/account_generation');
  expect(accountGeneration.invalidateAccountGeneration).toHaveBeenCalled();
  expect(wipeLocalAccountData).not.toHaveBeenCalled();
  expect(clearStableId).not.toHaveBeenCalled();
  expect(ensureAnonUser).not.toHaveBeenCalled();
});

test('account switch cannot force-bypass an unresolved owner-scoped spend', async () => {
  authState.isAnonymous = false;
  preparePendingShardDeltasForAccountSwitch.mockResolvedValueOnce({
    resolved: 0,
    pending: 1,
    pendingEarn: 0,
    pendingSpend: 1,
    ownerStableId: mockStableId,
    stale: false,
  });
  const accountGeneration = require('../app/account_generation');
  const { signOutAndWipeForAccountSwitch } = loadAuthProvider();

  await expect(signOutAndWipeForAccountSwitch({ allowWipeWithoutSync: true })).resolves.toEqual({
    ok: false,
    reason: 'pending_shard_spend',
  });
  expect(accountGeneration.invalidateAccountGeneration).not.toHaveBeenCalled();
  expect(wipeLocalAccountData).not.toHaveBeenCalled();
});

test('account switch reports a spend that appears during the final queue check without offering a force path', async () => {
  authState.isAnonymous = false;
  pendingShardQueue = [{ type: 'spend' }];
  const accountGeneration = require('../app/account_generation');
  const { signOutAndWipeForAccountSwitch } = loadAuthProvider();

  await expect(signOutAndWipeForAccountSwitch()).resolves.toEqual({
    ok: false,
    reason: 'pending_shard_spend',
  });
  expect(accountGeneration.invalidateAccountGeneration).not.toHaveBeenCalled();
  expect(wipeLocalAccountData).not.toHaveBeenCalled();
});

test('account switch cannot force-bypass an owner or legacy shard queue quarantine', async () => {
  authState.isAnonymous = false;
  quarantinedShardQueue = true;
  const accountGeneration = require('../app/account_generation');
  const { signOutAndWipeForAccountSwitch } = loadAuthProvider();

  await expect(signOutAndWipeForAccountSwitch({ allowWipeWithoutSync: true })).resolves.toEqual({
    ok: false,
    reason: 'shard_queue_quarantined',
  });
  expect(accountGeneration.invalidateAccountGeneration).not.toHaveBeenCalled();
  expect(wipeLocalAccountData).not.toHaveBeenCalled();
});

test('account switch with confirmed discard backs up and proceeds despite unresolved spend', async () => {
  authState.isAnonymous = false;
  preparePendingShardDeltasForAccountSwitch.mockResolvedValueOnce({
    resolved: 0,
    pending: 1,
    pendingEarn: 0,
    pendingSpend: 1,
    ownerStableId: mockStableId,
    stale: false,
  });
  pendingShardQueue = [{ type: 'spend' }];
  const accountGeneration = require('../app/account_generation');
  const { signOutAndWipeForAccountSwitch } = loadAuthProvider();

  await expect(
    signOutAndWipeForAccountSwitch({ allowWipeWithoutSync: true, allowPendingShardSpendDiscard: true }),
  ).resolves.toEqual({ ok: true, synced: true });

  // зачем (TG-0AE4918142EE): выход из аккаунта всегда откладывает чужую копию на
  // полку (её вернёт владелец при входе); причина в логе — какой путь отложил.
  expect(saveAccountSwitchEmergencyBackup).toHaveBeenCalledWith(
    'pending_shard_spend_discard_before_account_switch',
    'local-stable-id',
    { allowShelveOtherOwnerBackup: true, shelveReason: 'forced_switch' },
  );
  expect(accountGeneration.invalidateAccountGeneration).toHaveBeenCalled();
  expect(beginPremiumAccountTransition).toHaveBeenCalled();
  expect(wipeLocalAccountData).toHaveBeenCalledTimes(1);
});

test('account switch with confirmed discard backs up and proceeds despite quarantined queue', async () => {
  authState.isAnonymous = false;
  quarantinedShardQueue = true;
  const accountGeneration = require('../app/account_generation');
  const { signOutAndWipeForAccountSwitch } = loadAuthProvider();

  await expect(
    signOutAndWipeForAccountSwitch({ allowWipeWithoutSync: true, allowPendingShardSpendDiscard: true }),
  ).resolves.toEqual({ ok: true, synced: true });

  // зачем (TG-0AE4918142EE): выход из аккаунта всегда откладывает чужую копию на
  // полку (её вернёт владелец при входе); причина в логе — какой путь отложил.
  expect(saveAccountSwitchEmergencyBackup).toHaveBeenCalledWith(
    'pending_shard_spend_discard_before_account_switch',
    'local-stable-id',
    { allowShelveOtherOwnerBackup: true, shelveReason: 'forced_switch' },
  );
  expect(accountGeneration.invalidateAccountGeneration).toHaveBeenCalled();
  expect(wipeLocalAccountData).toHaveBeenCalledTimes(1);
});

test('account switch discard aborts before wipe when its emergency backup fails', async () => {
  authState.isAnonymous = false;
  preparePendingShardDeltasForAccountSwitch.mockResolvedValueOnce({
    resolved: 0,
    pending: 1,
    pendingEarn: 0,
    pendingSpend: 1,
    ownerStableId: mockStableId,
    stale: false,
  });
  saveAccountSwitchEmergencyBackup.mockRejectedValueOnce(new Error('backup unavailable'));
  const accountGeneration = require('../app/account_generation');
  const { signOutAndWipeForAccountSwitch } = loadAuthProvider();

  const result = await signOutAndWipeForAccountSwitch({
    allowWipeWithoutSync: true,
    allowPendingShardSpendDiscard: true,
  });

  // зачем (TG-0AE4918142EE): detail несёт только код ошибки, не её текст (в тексте бывает почта).
  expect(result).toEqual({ ok: false, reason: 'backup_failed', detail: 'error_without_code' });
  expect(accountGeneration.invalidateAccountGeneration).not.toHaveBeenCalled();
  expect(wipeLocalAccountData).not.toHaveBeenCalled();
  expect(clearStableId).not.toHaveBeenCalled();
  expect(ensureAnonUser).not.toHaveBeenCalled();
});

test('account switch may preserve a pending earn only after its exact owner queue is backed up', async () => {
  authState.isAnonymous = false;
  preparePendingShardDeltasForAccountSwitch.mockResolvedValueOnce({
    resolved: 0,
    pending: 1,
    pendingEarn: 1,
    pendingSpend: 0,
    ownerStableId: mockStableId,
    stale: false,
  });
  pendingShardQueue = [{ type: 'earn' }];
  const { signOutAndWipeForAccountSwitch } = loadAuthProvider();

  await expect(signOutAndWipeForAccountSwitch()).resolves.toEqual({
    ok: true,
    synced: true,
  });
  // зачем (TG-0AE4918142EE): штатный выход тоже откладывает чужую копию на полку
  // (раньше false → отказ other_owner_pending и форсированный выход без синхронизации).
  expect(saveAccountSwitchEmergencyBackup).toHaveBeenCalledWith(
    'pending_shard_earn_before_account_switch',
    'local-stable-id',
    { allowShelveOtherOwnerBackup: true, shelveReason: 'normal_switch' },
  );
  expect(wipeLocalAccountData).toHaveBeenCalledTimes(1);
});

// зачем (вариант Б мгновенного выхода, 12.10): зависшая синхронизация не держит выход дольше потолка.
test('signout with a sync deadline continues through the emergency backup when the cloud hangs', async () => {
  authState.isAnonymous = false;
  forceSyncToCloud.mockImplementationOnce(() => new Promise<boolean>(() => undefined));
  const { signOutAndWipeForAccountSwitch } = loadAuthProvider();

  const result = await signOutAndWipeForAccountSwitch({ syncDeadlineMs: 30, allowWipeWithoutSync: true });

  expect(result.ok).toBe(true);
  // A1 (координатор 12.10): первая копия пропущена, вторая — под замком — обязательна и сделана до стирания.
  expect(saveAccountSwitchEmergencyBackup).not.toHaveBeenCalledWith('force_sync_failed_before_account_switch', expect.anything(), expect.anything());
  expect(saveAccountSwitchEmergencyBackup).toHaveBeenCalledWith(
    'final_account_snapshot_before_switch',
    expect.anything(),
    expect.anything(),
  );
  expect(saveAccountSwitchEmergencyBackup.mock.invocationCallOrder[0]).toBeLessThan(wipeLocalAccountData.mock.invocationCallOrder[0]);
  expect(wipeLocalAccountData).toHaveBeenCalledTimes(1);
});

// зачем (A1, координатор 12.10): без первой копии сбой второй (под замком) отменяет выход ДО маркера и стирания.
test('A1: when the only emergency backup under the lock fails, signout stops without a marker or a wipe', async () => {
  authState.isAnonymous = false;
  forceSyncToCloud.mockResolvedValueOnce(false);
  saveAccountSwitchEmergencyBackup.mockResolvedValueOnce(false);
  const { signOutAndWipeForAccountSwitch } = loadAuthProvider();

  const result = await signOutAndWipeForAccountSwitch({ syncDeadlineMs: 30, allowWipeWithoutSync: true });

  expect(result).toEqual({ ok: false, reason: 'backup_failed', detail: 'account_switch_backup_unavailable' });
  expect(saveAccountSwitchEmergencyBackup).toHaveBeenCalledTimes(1);
  expect(saveAccountSwitchEmergencyBackup.mock.calls[0][0]).toBe('final_account_snapshot_before_switch');
  expect(await lastLoadedAuthProviderStorage.getItem('account_switch_quarantine_v1')).toBeNull();
  expect(authState.calls).not.toContain('signout');
  expect(wipeLocalAccountData).not.toHaveBeenCalled();
});

test('A1: the pending-spend discard path keeps the first emergency backup', async () => {
  authState.isAnonymous = false;
  forceSyncToCloud.mockResolvedValueOnce(false);
  const { signOutAndWipeForAccountSwitch } = loadAuthProvider();

  const result = await signOutAndWipeForAccountSwitch({ allowWipeWithoutSync: true, allowPendingShardSpendDiscard: true });

  expect(result.ok).toBe(true);
  expect(saveAccountSwitchEmergencyBackup.mock.calls.map((call) => call[0])).toEqual([
    'pending_shard_spend_discard_before_account_switch',
    'force_sync_failed_before_account_switch',
    'final_account_snapshot_before_switch',
  ]);
});

test('signout with a sync deadline but without force aborts with sync_failed instead of waiting', async () => {
  authState.isAnonymous = false;
  forceSyncToCloud.mockImplementationOnce(() => new Promise<boolean>(() => undefined));
  const { signOutAndWipeForAccountSwitch } = loadAuthProvider();

  await expect(signOutAndWipeForAccountSwitch({ syncDeadlineMs: 30 })).resolves.toEqual({ ok: false, reason: 'sync_failed' });
  expect(wipeLocalAccountData).not.toHaveBeenCalled();
});

test('account switch aborts before invalidation when the required emergency backup fails', async () => {
  authState.isAnonymous = false;
  forceSyncToCloud.mockResolvedValueOnce(false);
  saveAccountSwitchEmergencyBackup.mockRejectedValueOnce(new Error('backup unavailable'));
  const accountGeneration = require('../app/account_generation');
  const { signOutAndWipeForAccountSwitch } = loadAuthProvider();

  const result = await signOutAndWipeForAccountSwitch({ allowWipeWithoutSync: true });

  // зачем (TG-0AE4918142EE): detail несёт только код ошибки, не её текст (в тексте бывает почта).
  expect(result).toEqual({ ok: false, reason: 'backup_failed', detail: 'error_without_code' });
  expect(accountGeneration.invalidateAccountGeneration).not.toHaveBeenCalled();
  expect(authState.calls).not.toContain('signout');
  expect(wipeLocalAccountData).not.toHaveBeenCalled();
  expect(clearStableId).not.toHaveBeenCalled();
  expect(ensureAnonUser).not.toHaveBeenCalled();
});

test('account switch stays transitioning and does not create account B when local wipe fails', async () => {
  authState.isAnonymous = false;
  wipeLocalAccountData.mockRejectedValueOnce(new Error('wipe unavailable'));
  const accountGeneration = require('../app/account_generation');
  const { signOutAndWipeForAccountSwitch } = loadAuthProvider();

  const result = await signOutAndWipeForAccountSwitch();

  expect(result).toEqual({ ok: false, reason: 'wipe_failed', detail: 'wipe unavailable' });
  expect(accountGeneration.invalidateAccountGeneration).toHaveBeenCalled();
  expect(accountGeneration.beginAccountGeneration).not.toHaveBeenCalled();
  expect(authState.calls).toContain('signout');
  expect(clearStableId).not.toHaveBeenCalled();
  expect(ensureAnonUser).not.toHaveBeenCalled();
});

test('pending-delete recovery does not rebind or rotate identity after Firebase sign-out failure', async () => {
  authState.linkImpl = async () => {
    const err: any = new Error('credential already in use');
    err.code = 'auth/credential-already-in-use';
    throw err;
  };
  enqueueCloudDeletion.mockRejectedValueOnce(new Error('offline'));
  rejectFirebaseSignOut(new Error('firebase signout failed'));
  const now = Date.now();
  const { signInWithProvider } = loadAuthProvider({
    account_delete_pending_auth_v1: JSON.stringify({
      providerUid: 'provider-uid-1',
      stableId: 'deleted-stable-id',
      createdAt: now - 60_000,
      expiresAt: now + 60_000,
    }),
  });

  await expect(signInWithProvider('google')).resolves.toEqual({
    result: 'error',
    error: 'account_delete_pending',
  });

  // Credential safety failed before the picker, so no anonymous identity may
  // be prepared or rebound at all.
  expect(ensureAnonUser).not.toHaveBeenCalled();
  expect(clearStableId).not.toHaveBeenCalled();
});

test('UI handoff is fast but linked background deletion waits for server acknowledgement', async () => {
  authState.isAnonymous = false;
  let resolveDispatch!: () => void;
  let resolveAcknowledgement!: (value: {
    ok: true;
    jobId: string;
    status: 'queued';
    created: true;
    authReleased: true;
    credentialSafe: true;
  }) => void;
  const dispatchSettled = new Promise<void>((resolve) => { resolveDispatch = resolve; });
  const acknowledgment = new Promise<{
    ok: true;
    jobId: string;
    status: 'queued';
    created: true;
    authReleased: true;
    credentialSafe: true;
  }>((resolve) => {
    resolveAcknowledgement = resolve;
  });
  startCloudDeletionEnqueue.mockReturnValueOnce({ dispatchSettled, acknowledgment });
  const authProvider = loadAuthProvider();

  const handoff = await authProvider.beginAccountDeletion();
  expect(handoff.ok).toBe(true);
  if (!handoff.ok) throw new Error(handoff.reason);
  const secureStore = require('expo-secure-store');
  const secureLock = JSON.parse(await secureStore.getItemAsync('account_delete_pending_auth_v2'));
  expect(secureLock.credentialSafeCapability).toHaveLength(64);
  expect(await lastLoadedAuthProviderStorage.getItem('account_delete_pending_auth_v1'))
    .not.toContain('credentialSafeCapability');
  expect(authState.calls).not.toContain('signout');

  const signIn = authProvider.signInWithProvider('google');
  const signInBeforeAck = await Promise.race([
    signIn,
    new Promise<'blocked'>((resolve) => setTimeout(() => resolve('blocked'), 100)),
  ]);
  expect(signInBeforeAck).toBe('blocked');
  expect(googleSignInImpl).not.toHaveBeenCalled();

  resolveDispatch();
  const result = await Promise.race([
    handoff.completion,
    new Promise<'blocked'>((resolve) => setTimeout(() => resolve('blocked'), 100)),
  ]);

  expect(startCloudDeletionEnqueue).toHaveBeenCalledWith(
    'local-stable-id',
    expect.objectContaining({ operationId: expect.any(String), capability: expect.any(String) }),
  );
  expect(result).toBe('blocked');
  expect(authState.calls).not.toContain('signout');
  expect(wipeLocalAccountData).toHaveBeenCalledTimes(1);
  expect(beginPremiumAccountTransition).toHaveBeenCalledTimes(1);

  resolveAcknowledgement({
    ok: true,
    jobId: 'job-1',
    status: 'queued',
    created: true,
    authReleased: true,
    credentialSafe: true,
  });
  await expect(handoff.completion).resolves.toEqual({ ok: true, cloudDeleted: false });
  await expect(signIn).resolves.toMatchObject({ result: 'created_new' });
  expect(googleSignInImpl).toHaveBeenCalledTimes(1);
  expect(authState.calls).toContain('signout');
});

test('cold restart retries a local_cleared linked deletion before allowing recovery', async () => {
  authState.isAnonymous = false;
  const now = Date.now();
  const authProvider = loadAuthProvider({
    account_delete_pending_auth_v1: JSON.stringify({
      providerUid: 'provider-uid-1',
      stableId: 'deleted-stable-id',
      source: 'local',
      phase: 'local_cleared',
      createdAt: now - 1_000,
      expiresAt: now + 60_000,
    }),
  });

  await expect(authProvider.resumePendingAccountDeleteLocalExit()).resolves.toBe(true);

  expect(startCloudDeletionEnqueue).toHaveBeenCalledWith(
    'deleted-stable-id',
    expect.objectContaining({ operationId: expect.any(String), capability: expect.any(String) }),
  );
  expect(enqueueCloudDeletion).toHaveBeenCalledWith('deleted-stable-id');
  expect(authState.calls).toContain('signout');
});

test('cold restart keeps a local_cleared linked deletion retryable when enqueue is offline', async () => {
  authState.isAnonymous = false;
  enqueueCloudDeletion.mockRejectedValueOnce(new Error('offline'));
  const now = Date.now();
  const authProvider = loadAuthProvider({
    account_delete_pending_auth_v1: JSON.stringify({
      providerUid: 'provider-uid-1',
      stableId: 'deleted-stable-id',
      source: 'local',
      phase: 'local_cleared',
      createdAt: now - 1_000,
      expiresAt: now + 60_000,
    }),
  });

  await expect(authProvider.resumePendingAccountDeleteLocalExit()).resolves.toBe(false);

  expect(startCloudDeletionEnqueue).toHaveBeenCalledWith(
    'deleted-stable-id',
    expect.objectContaining({ operationId: expect.any(String), capability: expect.any(String) }),
  );
  expect(await lastLoadedAuthProviderStorage.getItem('account_delete_pending_auth_v1'))
    .toContain('"phase":"local_data_cleared"');
});

test('cold restart completes server_enqueued deletion without enqueueing or signing out fresh anon', async () => {
  authState.isAnonymous = true;
  const now = Date.now();
  const authProvider = loadAuthProvider({
    account_delete_pending_auth_v1: JSON.stringify({
      providerUid: 'provider-uid-1',
      stableId: 'deleted-stable-id',
      source: 'local',
      phase: 'server_enqueued',
      createdAt: now - 1_000,
      expiresAt: now + 60_000,
    }),
  });

  await expect(authProvider.resumePendingAccountDeleteLocalExit()).resolves.toBe(true);

  expect(startCloudDeletionEnqueue).not.toHaveBeenCalled();
  expect(authState.calls).not.toContain('signout');
  expect(clearStableId).toHaveBeenCalledTimes(1);
  expect(await lastLoadedAuthProviderStorage.getItem('account_delete_pending_auth_v1')).toBeNull();
});

test('account switch holds the clean-recovery exclusion until its async work finishes', async () => {
  authState.isAnonymous = false;
  let resolveSync!: (value: boolean) => void;
  forceSyncToCloud.mockImplementationOnce(() => new Promise(resolve => { resolveSync = resolve; }));
  const authProvider = loadAuthProvider();

  const switching = authProvider.signOutAndWipeForAccountSwitch();
  await waitForCall(forceSyncToCloud, 'forceSyncToCloud');
  const deletion = authProvider.deleteAccountAndWipe();
  resolveSync(true);

  await expect(deletion).resolves.toEqual({
    ok: false,
    reason: 'clean_recovery_transition_active',
  });
  await switching;
});

test('account deletion holds the clean-recovery exclusion until local exit finishes', async () => {
  authState.isAnonymous = false;
  let resolveAcknowledgement!: (value: {
    ok: true;
    jobId: string;
    status: 'queued';
    created: true;
    authReleased: true;
    credentialSafe: true;
  }) => void;
  startCloudDeletionEnqueue.mockReturnValueOnce({
    dispatchSettled: Promise.resolve(),
    acknowledgment: new Promise(resolve => { resolveAcknowledgement = resolve; }),
  });
  const authProvider = loadAuthProvider();

  const handoff = await authProvider.beginAccountDeletion();
  expect(handoff.ok).toBe(true);
  if (!handoff.ok) throw new Error(handoff.reason);
  const deleting = handoff.completion;
  expect(startCloudDeletionEnqueue).toHaveBeenCalledTimes(1);
  const switching = authProvider.signOutAndWipeForAccountSwitch();

  await expect(switching).resolves.toEqual({
    ok: false,
    reason: 'clean_recovery_transition_active',
  });
  resolveAcknowledgement({
    ok: true,
    jobId: 'job-1',
    status: 'queued',
    created: true,
    authReleased: true,
    credentialSafe: true,
  });
  await deleting;
});

test('account deletion fails closed before wipe when old premium writes cannot be drained', async () => {
  authState.isAnonymous = false;
  waitForPremiumAccountWorkIdleWithDeadline.mockResolvedValueOnce(false);
  const authProvider = loadAuthProvider();

  await expect(authProvider.deleteAccountAndWipe()).resolves.toEqual({
    ok: false,
    reason: 'local_wipe_unverified',
  });

  expect(waitForPremiumAccountWorkIdleWithDeadline).toHaveBeenCalledWith(1_500);
  expect(wipeLocalAccountData).not.toHaveBeenCalled();
  expect(startCloudDeletionEnqueue).not.toHaveBeenCalled();
  expect(authState.calls).not.toContain('signout');
  expect(clearStableId).not.toHaveBeenCalled();
  expect(await lastLoadedAuthProviderStorage.getItem('account_delete_pending_auth_v1'))
    .toContain('"phase":"prepared"');
});

test.each([
  ['restore', () => waitForRestoreApplicationIdleWithDeadline.mockResolvedValueOnce(false)],
  ['cloud', () => quiesceCloudSyncForAccountTransition.mockResolvedValueOnce(false)],
] as const)('account deletion fails closed before clear when the %s writer drain times out', async (_name, failDrain) => {
  authState.isAnonymous = false;
  failDrain();
  const authProvider = loadAuthProvider({ user_total_xp: '91' });

  await expect(authProvider.beginAccountDeletion()).resolves.toEqual({
    ok: false,
    reason: 'local_wipe_unverified',
  });

  expect(wipeLocalAccountData).not.toHaveBeenCalled();
  expect(startCloudDeletionEnqueue).not.toHaveBeenCalled();
  expect(await lastLoadedAuthProviderStorage.getItem('user_total_xp')).toBe('91');
  expect(await lastLoadedAuthProviderStorage.getItem('account_delete_pending_auth_v1'))
    .toContain('"phase":"prepared"');
});

test('account switch preserves sign-out-before-wipe after the bounded premium drain times out', async () => {
  authState.isAnonymous = false;
  waitForPremiumAccountWorkIdleWithDeadline.mockResolvedValueOnce(false);
  wipeLocalAccountData.mockImplementationOnce(async () => { authState.calls.push('wipe'); });
  const { signOutAndWipeForAccountSwitch } = loadAuthProvider();

  await expect(signOutAndWipeForAccountSwitch()).resolves.toEqual({ ok: true, synced: true });

  // зачем (TG-0AE4918142EE): штатный выход тоже откладывает чужую копию на полку
  // (раньше false → отказ other_owner_pending и форсированный выход без синхронизации).
  expect(saveAccountSwitchEmergencyBackup).toHaveBeenCalledWith(
    'final_account_snapshot_before_switch',
    'local-stable-id',
    { allowShelveOtherOwnerBackup: true, shelveReason: 'normal_switch' },
  );
  expect(waitForPremiumAccountWorkIdleWithDeadline).toHaveBeenCalledWith(1_500);
  expect(authState.calls.indexOf('signout')).toBeLessThan(authState.calls.indexOf('wipe'));
  expect(clearStableId).toHaveBeenCalledTimes(1);
});

test('account switch never wipes a pending Learning V2 snapshot after general sync success', async () => {
  authState.isAnonymous = false;
  saveAccountSwitchEmergencyBackup.mockRejectedValueOnce(new Error('completion snapshot unavailable'));
  const accountGeneration = require('../app/account_generation');
  const { signOutAndWipeForAccountSwitch } = loadAuthProvider();

  await expect(signOutAndWipeForAccountSwitch()).resolves.toEqual({
    ok: false,
    reason: 'backup_failed',
    // зачем (TG-0AE4918142EE): detail несёт только код ошибки, не её текст.
    detail: 'error_without_code',
  });
  expect(forceSyncToCloud).toHaveBeenCalled();
  expect(accountGeneration.invalidateAccountGeneration).not.toHaveBeenCalled();
  expect(wipeLocalAccountData).not.toHaveBeenCalled();
});

test('account switch aborts boundedly when an earlier native transition lock is still held', async () => {
  authState.isAnonymous = false;
  const accountGeneration = require('../app/account_generation');
  accountGeneration.withAccountTransitionLockWithDeadline.mockResolvedValueOnce({ completed: false });
  const { signOutAndWipeForAccountSwitch } = loadAuthProvider();

  await expect(signOutAndWipeForAccountSwitch()).resolves.toEqual({ ok: false, reason: 'sync_failed' });

  expect(authState.calls).not.toContain('signout');
  expect(wipeLocalAccountData).not.toHaveBeenCalled();
  expect(clearStableId).not.toHaveBeenCalled();
  expect(logEvent).toHaveBeenCalledWith('auth_signout_wipe_sync_failed_aborted', {
    stage: 'account_transition_lock_timeout',
  });
});

test('recovery mismatch returns a recoverable error without anonymous rebind when Firebase sign-out fails', async () => {
  ensureStableAuthLinkForStableIdDetailed.mockResolvedValueOnce({
    ok: false,
    stableUid: null,
    source: 'unavailable',
    failure: 'stable_id_mismatch',
  });
  rejectFirebaseSignOut(new Error('firebase signout failed'));
  const { signInWithProvider } = loadAuthProvider();

  const result = await signInWithProvider('google', { requireCurrentStableIdOwnership: true });

  expect(result).toEqual({ result: 'error', error: 'recovery_signout_failed' });
  // One call is the normal pre-picker warmup; mismatch recovery must not rebind.
  expect(ensureAnonUser).toHaveBeenCalledTimes(1);
  expect(clearStableId).not.toHaveBeenCalled();
});

test('account deletion exits locally but never binds anonymous identity when Firebase sign-out fails', async () => {
  authState.isAnonymous = false;
  rejectFirebaseSignOut(new Error('firebase signout failed'));
  const authProvider = loadAuthProvider();

  const result = await authProvider.deleteAccountAndWipe();

  expect(result).toEqual({ ok: false, reason: 'firebase_signout_failed' });
  expect(wipeLocalAccountData).toHaveBeenCalledTimes(1);
  // Exact ordering is sign-out before stable rotation. A failed sign-out keeps
  // the old stable guard intact and must not create/bind an anonymous identity.
  expect(clearStableId).not.toHaveBeenCalled();
  // These two calls are the existing pre-signout notification/push-token
  // cleanup paths while the provider is still current; failure must not add a
  // third post-signout anonymous bind.
  expect(ensureAnonUser).toHaveBeenCalledTimes(2);
  expect(authState.isAnonymous).toBe(false);
  expect(logEvent.mock.calls.some(([name]) => name === 'auth_account_deleted')).toBe(false);
  expect(logEvent.mock.calls.some(([name]) => name === 'auth_account_delete_quarantined')).toBe(true);
});

test('remote account deletion wipes this device without creating another deletion request', async () => {
  authState.isAnonymous = false;
  const authProvider = loadAuthProvider() as typeof import('../app/auth_provider') & {
    handleAccountDeletedOnAnotherDevice: () => Promise<void>;
  };

  await expect(authProvider.handleAccountDeletedOnAnotherDevice()).resolves.toEqual({ ok: true });

  expect(enqueueCloudDeletion).not.toHaveBeenCalled();
  expect(authState.calls).toContain('signout');
  expect(wipeLocalAccountData).toHaveBeenCalledTimes(1);
  expect(clearStableId).toHaveBeenCalledTimes(1);
  expect(await lastLoadedAuthProviderStorage.getItem('remote_account_deleted_notice_v1')).toBe('1');
});

test('the initiating device suppresses its own remote-deletion marker until local exit finishes', async () => {
  authState.isAnonymous = false;
  let resolveDispatch!: () => void;
  startCloudDeletionEnqueue.mockReturnValueOnce({
    dispatchSettled: new Promise<void>((resolve) => { resolveDispatch = resolve; }),
    acknowledgment: Promise.resolve({
      ok: true,
      jobId: 'job-1',
      status: 'queued' as const,
      created: true as const,
      authReleased: true as const,
      credentialSafe: true as const,
    }),
  });
  const authProvider = loadAuthProvider();

  const deletion = authProvider.deleteAccountAndWipe();
  for (let i = 0; i < 10 && typeof resolveDispatch !== 'function'; i += 1) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  expect(authProvider.isLocalAccountDeletionInProgress()).toBe(true);

  resolveDispatch();
  await deletion;

  expect(authProvider.isLocalAccountDeletionInProgress()).toBe(false);
});

test('account data without XP is never synced under a conflicting provider auth', async () => {
  authState.linkImpl = async () => {
    const err: any = new Error('credential already in use');
    err.code = 'auth/credential-already-in-use';
    throw err;
  };
  ensureStableAuthLinkForStableIdDetailed.mockResolvedValueOnce({
    ok: true,
    stableUid: 'remote-stable-id',
    source: 'server',
  });

  const { signInWithProvider } = loadAuthProvider({
    custom_flashcards_v2: JSON.stringify([{ front: 'hello', back: 'привет' }]),
  });
  const result = await signInWithProvider('google');

  expect(result).toEqual({ result: 'error', error: 'account_switch_required' });
  expect(syncToCloud).not.toHaveBeenCalled();
  expect(mergeStableAccountsViaServer).not.toHaveBeenCalled();
});

test('a user-cancelled native sign-in returns { result: "cancelled" } and never touches Firebase auth', async () => {
  googleSignInImpl.mockResolvedValueOnce({ type: 'cancelled' });
  const { signInWithProvider } = loadAuthProvider();
  const res = await signInWithProvider('google');
  expect(res).toEqual({ result: 'cancelled' });
  // No link/signin attempted for a cancelled flow.
  expect(authState.calls).toHaveLength(0);
});

test('an unexpected anonymous-link error fails closed without replacing Firebase auth', async () => {
  authState.linkImpl = async () => {
    const err: any = new Error('transient');
    err.code = 'auth/network-request-failed';
    throw err;
  };
  const { signInWithProvider } = loadAuthProvider();
  const res = await signInWithProvider('google');
  expect(authState.calls).toContain('link');
  expect(authState.calls).not.toContain('signin');
  expect(res).toEqual({ result: 'error', error: 'firebase_auth/network-request-failed:transient' });
});

// ── AA S2d 🔴2 (§127): presync перед свапом на remote ─────────────────────────
// зачем: presync обязан ВЫГРУЗИТЬ свежий локальный прогресс до стирания; adopt и
// восстановление чужого профиля внутри 20-секундного окна запрещены. Раунд 2
// (H-S2d-2, вариант б): выгрузка не подтверждена → проверенная аварийная копия A
// (без откладывания чужой копии) и тот же серверный merge(A, B); копия не
// сохранилась → отказ local_progress_not_uploaded без стирания.
function presyncSwapToRemote(): void {
  ensureStableAuthLinkForStableIdDetailed.mockResolvedValueOnce({
    ok: true,
    stableUid: 'remote-stable-id',
    source: 'server',
  });
}

function presyncRefusesWith(code: string): void {
  forceSyncToCloud.mockImplementationOnce((async (...args: unknown[]) => {
    const options = args[0] as { onRefusal?: (refusal: string) => void } | undefined;
    options?.onRefusal?.(code);
    return false;
  }) as any);
}

test('S2d 🔴2: guest with progress joins an existing account — upload impossible, verified backup of A, then the same server merge', async () => {
  presyncSwapToRemote();
  presyncRefusesWith('identity_mismatch');
  readAccountSwitchEmergencyBackupSummary.mockResolvedValueOnce({ stableId: 'local-stable-id', pairCount: 7, bytes: 2048 });
  const { signInWithProvider } = loadAuthProvider({ unlocked_lessons: '[1,2]' }, 'ios');
  const warnSpy = jest.spyOn(console, 'warn');

  const result = await signInWithProvider('apple');

  expect(result).toMatchObject({ result: 'merged_devices' });
  // §134: в лог — размер копии (ключи и байты), без значений и сырых id.
  const savedLine = warnSpy.mock.calls.map((call) => String(call[0])).find((line) => line.includes('swap presync_backup_saved'));
  warnSpy.mockRestore();
  expect(savedLine).toContain('"backupPairs":7');
  expect(savedLine).toContain('"backupBytes":2048');
  expect(savedLine).not.toContain('local-stable-id');
  expect(forceSyncToCloud).toHaveBeenCalledWith(expect.objectContaining({ adoptOnIdentityMismatch: false }));
  // Копия — только для A и без права отодвинуть чужую копию.
  expect(saveAccountSwitchEmergencyBackup).toHaveBeenCalledTimes(1);
  expect(saveAccountSwitchEmergencyBackup.mock.calls[0]).toEqual([
    'sign_in_presync_not_uploaded_before_swap',
    'local-stable-id',
  ]);
  expect(readAccountSwitchEmergencyBackupSummary).toHaveBeenCalled();
  expect(saveAccountSwitchEmergencyBackup.mock.invocationCallOrder[0]).toBeLessThan(
    wipeLocalAccountData.mock.invocationCallOrder[0],
  );
  expect(mergeStableAccountsViaServer).toHaveBeenCalledWith('local-stable-id', 'remote-stable-id');
});

// Раунд 3 (§135 ❓1): «копию сделать нельзя» → local_progress_backup_blocked (кнопка
// «Сменить аккаунт»), сбой записи/личности → local_progress_not_uploaded («Повторить»).
test.each([
  ['account_switch_backup_other_owner_pending', 'local_progress_backup_blocked'],
  ['account_switch_backup_capacity', 'local_progress_backup_blocked'],
  ['account_switch_backup_history_upgrade_required', 'local_progress_backup_blocked'],
  ['account_switch_backup_identity_unavailable', 'local_progress_not_uploaded'],
])('S2d 🔴2: backup refusal %s → %s, nothing wiped', async (code, expectedError) => {
  presyncSwapToRemote();
  presyncRefusesWith('identity_mismatch');
  saveAccountSwitchEmergencyBackup.mockRejectedValueOnce(new Error(code));
  const { signInWithProvider } = loadAuthProvider({ unlocked_lessons: '[1,2]' }, 'ios');
  const stableModule = require('../app/stable_id');
  (stableModule.setStableId as jest.Mock).mockClear();

  const result = await signInWithProvider('apple');

  expect(result).toEqual({ result: 'error', error: expectedError });
  expect(wipeLocalAccountData).not.toHaveBeenCalled();
  expect(stableModule.setStableId).not.toHaveBeenCalled();
  expect(mergeStableAccountsViaServer).not.toHaveBeenCalled();
});

test('S2d 🔴2: a backup that reports success but is not readable as A is not trusted', async () => {
  presyncSwapToRemote();
  presyncRefusesWith('identity_mismatch');
  readAccountSwitchEmergencyBackupSummary.mockResolvedValueOnce({ stableId: 'someone-else', pairCount: 7, bytes: 2048 });
  const { signInWithProvider } = loadAuthProvider({ unlocked_lessons: '[1,2]' }, 'ios');

  const result = await signInWithProvider('apple');

  expect(result).toEqual({ result: 'error', error: 'local_progress_not_uploaded' });
  expect(wipeLocalAccountData).not.toHaveBeenCalled();
});

test('S2d 🔴2: confirmed presync upload happens before the wipe, no emergency backup needed', async () => {
  presyncSwapToRemote();
  forceSyncToCloud.mockResolvedValueOnce(true);
  const { signInWithProvider } = loadAuthProvider({ unlocked_lessons: '[1,2]' }, 'ios');

  const result = await signInWithProvider('apple');

  expect(result).toMatchObject({ result: 'merged_devices' });
  expect(forceSyncToCloud).toHaveBeenCalledTimes(1);
  expect(saveAccountSwitchEmergencyBackup).not.toHaveBeenCalled();
  expect(forceSyncToCloud.mock.invocationCallOrder[0]).toBeLessThan(
    wipeLocalAccountData.mock.invocationCallOrder[0],
  );
});

test('S2d 🔴2: presync slower than its 20 s budget and no backup → refused without wipe; a late upload does not resume the swap', async () => {
  jest.useFakeTimers();
  try {
    presyncSwapToRemote();
    let releaseUpload!: (value: boolean) => void;
    forceSyncToCloud.mockImplementationOnce(() => new Promise<boolean>((resolve) => { releaseUpload = resolve; }));
    saveAccountSwitchEmergencyBackup.mockRejectedValueOnce(new Error('account_switch_backup_capacity'));
    const { signInWithProvider } = loadAuthProvider({ unlocked_lessons: '[1,2]' }, 'ios');

    const pending = signInWithProvider('apple');
    await jest.advanceTimersByTimeAsync(20_001);
    await expect(pending).resolves.toEqual({ result: 'error', error: 'local_progress_backup_blocked' });

    releaseUpload(true);
    await jest.advanceTimersByTimeAsync(10);
    expect(wipeLocalAccountData).not.toHaveBeenCalled();
    expect(mergeStableAccountsViaServer).not.toHaveBeenCalled();
  } finally {
    jest.useRealTimers();
  }
});

// ── AA S2d раунд 3 (§135 ❓2): жизнь копии гостя после свапа ──────────────────
const MERGE_ALIAS_KEY = 'account_switch_backup_merge_alias_v1';

test('S2d 🔴2 r3: confirmed merge(A→B) writes the alias {from:A,to:B} under the swap lock; copy is not shelved', async () => {
  presyncSwapToRemote();
  presyncRefusesWith('identity_mismatch');
  readAccountSwitchEmergencyBackupSummary.mockResolvedValueOnce({ stableId: 'local-stable-id', pairCount: 3, bytes: 99 });
  mergeStableAccountsViaServer.mockResolvedValueOnce({ ok: true, canonicalStableId: 'remote-stable-id' } as any);
  const { signInWithProvider } = loadAuthProvider({ unlocked_lessons: '[1,2]' }, 'ios');

  const result = await signInWithProvider('apple');

  expect(result).toMatchObject({ result: 'merged_devices' });
  const alias = JSON.parse(String(await (lastLoadedAuthProviderStorage as any).getItem(MERGE_ALIAS_KEY)));
  expect(alias).toMatchObject({ from: 'local-stable-id', to: 'remote-stable-id' });
  expect(typeof alias.at).toBe('number');
  expect(shelveAccountSwitchEmergencyBackupOf).not.toHaveBeenCalled();
});

test('S2d 🔴2 r3: merge NOT confirmed → no alias, the guest copy is shelved right away (does not block «Сменить аккаунт»)', async () => {
  presyncSwapToRemote();
  presyncRefusesWith('identity_mismatch');
  readAccountSwitchEmergencyBackupSummary.mockResolvedValueOnce({ stableId: 'local-stable-id', pairCount: 3, bytes: 99 });
  const { signInWithProvider } = loadAuthProvider({ unlocked_lessons: '[1,2]' }, 'ios');

  const result = await signInWithProvider('apple');

  expect(result).toMatchObject({ result: 'merged_devices' });
  expect(await (lastLoadedAuthProviderStorage as any).getItem(MERGE_ALIAS_KEY)).toBeNull();
  expect(shelveAccountSwitchEmergencyBackupOf).toHaveBeenCalledWith('local-stable-id');
});

test('S2d 🔴2 r3: a confirmed upload does not touch the copy lifecycle (no alias, no shelve)', async () => {
  presyncSwapToRemote();
  forceSyncToCloud.mockResolvedValueOnce(true);
  mergeStableAccountsViaServer.mockResolvedValueOnce({ ok: true, canonicalStableId: 'remote-stable-id' } as any);
  const { signInWithProvider } = loadAuthProvider({ unlocked_lessons: '[1,2]' }, 'ios');

  await signInWithProvider('apple');

  expect(await (lastLoadedAuthProviderStorage as any).getItem(MERGE_ALIAS_KEY)).toBeNull();
  expect(shelveAccountSwitchEmergencyBackupOf).not.toHaveBeenCalled();
});

// ── Раунд 4 (L-R3-2): метка-псевдоним не записалась → копию сразу отложить ──────
test('S2d r4 L-R3-2: alias write failure after a confirmed merge shelves the guest copy (does not block «Сменить аккаунт»)', async () => {
  presyncSwapToRemote();
  presyncRefusesWith('identity_mismatch');
  readAccountSwitchEmergencyBackupSummary.mockResolvedValueOnce({ stableId: 'local-stable-id', pairCount: 3, bytes: 99 });
  mergeStableAccountsViaServer.mockResolvedValueOnce({ ok: true, canonicalStableId: 'remote-stable-id' } as any);
  const { signInWithProvider } = loadAuthProvider({ unlocked_lessons: '[1,2]' }, 'ios');
  const storage = lastLoadedAuthProviderStorage as any;
  const realSetItem = storage.setItem.getMockImplementation?.() ?? storage.setItem;
  const setItemSpy = jest.spyOn(storage, 'setItem').mockImplementation(async (...args: unknown[]) => {
    if (args[0] === MERGE_ALIAS_KEY) throw new Error('storage_full');
    return realSetItem(...args);
  });
  try {
    const result = await signInWithProvider('apple');
    expect(result).toMatchObject({ result: 'merged_devices' });
  } finally {
    setItemSpy.mockRestore();
  }
  expect(await storage.getItem(MERGE_ALIAS_KEY)).toBeNull();
  expect(shelveAccountSwitchEmergencyBackupOf).toHaveBeenCalledWith('local-stable-id');
});

// ── Шаг 3 пакета auth-legacy-google-not-found: вход продолжается после смены аккаунта ──
// зачем (прогон 11.10): гость → Google → конфликт → «Сменить аккаунт» → после стирания
// человек открывал окно Google второй раз и выбирал тот же аккаунт. Пропуск, выбранный
// в первом окне, живёт только в памяти, одноразово и ≤ 10 минут.
describe('resume sign-in after a confirmed account switch', () => {
  const conflictOnLink = () => {
    authState.linkImpl = async () => {
      const err: any = new Error('credential already in use');
      err.code = 'auth/credential-already-in-use';
      throw err;
    };
  };

  // Пропуск сохраняет только онбординг — явным флагом (ревью L-1).
  const CAPTURE = { captureAccountSwitchResume: true } as const;
  const providerSignedIn = () => {
    authState.signInImpl = async () => {
      authState.isAnonymous = false;
      return { user: authFactory().currentUser };
    };
  };

  test('continues with the credential chosen before the switch, without a second picker, once', async () => {
    conflictOnLink();
    const auth = loadAuthProvider({ unlocked_lessons: '[1,2]' });

    await expect(auth.signInWithProvider('google', CAPTURE)).resolves.toEqual({ result: 'error', error: 'account_switch_required' });
    expect(googleSignInImpl).toHaveBeenCalledTimes(1);
    expect(authState.calls).not.toContain('signin');

    // Смена стёрла телефон: прогресса гостя больше нет.
    await lastLoadedAuthProviderStorage.removeItem('unlocked_lessons');
    const signedInWith: unknown[] = [];
    authState.signInImpl = async (credential) => {
      signedInWith.push(credential);
      authState.isAnonymous = false;
      return { user: authFactory().currentUser };
    };

    const resumed = await auth.resumeSignInAfterAccountSwitch('google');

    expect(resumed).not.toBeNull();
    expect(resumed!.result).not.toBe('error');
    expect(googleSignInImpl).toHaveBeenCalledTimes(1);
    expect(signedInWith).toEqual([{ providerId: 'google.com', idToken: 'fake-google-id-token' }]);

    // Одноразовый: второй раз без окна выбора не войти.
    await expect(auth.signInWithProvider('google', { resumeAfterAccountSwitch: true }))
      .resolves.toEqual({ result: 'error', error: 'resume_credential_missing' });
    expect(googleSignInImpl).toHaveBeenCalledTimes(1);
  });

  test('without a stored credential the caller falls back to the old text and no picker opens', async () => {
    const auth = loadAuthProvider();

    await expect(auth.resumeSignInAfterAccountSwitch('google')).resolves.toBeNull();
    expect(googleSignInImpl).not.toHaveBeenCalled();
    expect(authState.calls).toHaveLength(0);
  });

  test('a credential older than 10 minutes is refused and erased', async () => {
    conflictOnLink();
    const auth = loadAuthProvider({ unlocked_lessons: '[1,2]' });
    await auth.signInWithProvider('google', CAPTURE);
    await lastLoadedAuthProviderStorage.removeItem('unlocked_lessons');
    const realNow = Date.now();
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(realNow + 10 * 60_000 + 1);
    try {
      await expect(auth.signInWithProvider('google', { resumeAfterAccountSwitch: true }))
        .resolves.toEqual({ result: 'error', error: 'resume_credential_expired' });
    } finally {
      nowSpy.mockRestore();
    }
    await expect(auth.signInWithProvider('google', { resumeAfterAccountSwitch: true }))
      .resolves.toEqual({ result: 'error', error: 'resume_credential_missing' });
    expect(googleSignInImpl).toHaveBeenCalledTimes(1);
    expect(authState.calls).not.toContain('signin');
  });

  test('a cancelled switch or a fresh picker erases the credential', async () => {
    conflictOnLink();
    const auth = loadAuthProvider({ unlocked_lessons: '[1,2]' });
    await auth.signInWithProvider('google', CAPTURE);
    auth.discardAccountSwitchResumeCredential('switch_cancelled');
    await expect(auth.resumeSignInAfterAccountSwitch('google')).resolves.toBeNull();

    // Пропуск под другого провайдера не подходит и тоже сгорает.
    await auth.signInWithProvider('google', CAPTURE);
    expect(googleSignInImpl).toHaveBeenCalledTimes(2);
    await expect(auth.signInWithProvider('apple', { resumeAfterAccountSwitch: true }))
      .resolves.toEqual({ result: 'error', error: 'resume_credential_provider_mismatch' });
    await expect(auth.resumeSignInAfterAccountSwitch('google')).resolves.toBeNull();

    // Новый обычный вход (окно открыто заново) стирает пропуск предыдущего окна.
    await auth.signInWithProvider('google', CAPTURE);
    expect(googleSignInImpl).toHaveBeenCalledTimes(3);
    authState.linkImpl = null;
    await expect(auth.signInWithProvider('google')).resolves.not.toEqual(expect.objectContaining({ result: 'error' }));
    expect(googleSignInImpl).toHaveBeenCalledTimes(4);
    await expect(auth.resumeSignInAfterAccountSwitch('google')).resolves.toBeNull();
    expect(googleSignInImpl).toHaveBeenCalledTimes(4);
    expect(authState.calls).not.toContain('signin');
  });

  test('a resumed attempt that still needs a switch does not re-store the credential', async () => {
    conflictOnLink();
    const auth = loadAuthProvider({ unlocked_lessons: '[1,2]' });
    await auth.signInWithProvider('google', CAPTURE);

    // Телефон НЕ стёрт и смены не было — повтор из пропуска снова упирается в смену.
    await expect(auth.signInWithProvider('google', { resumeAfterAccountSwitch: true, ...CAPTURE }))
      .resolves.toEqual({ result: 'error', error: 'account_switch_required' });
    await expect(auth.signInWithProvider('google', { resumeAfterAccountSwitch: true }))
      .resolves.toEqual({ result: 'error', error: 'resume_credential_missing' });
    expect(googleSignInImpl).toHaveBeenCalledTimes(1);
    expect(authState.calls).not.toContain('signin');
  });

  test('L-1: a caller without the capture flag (sign-in modal, Settings) never stores the credential', async () => {
    conflictOnLink();
    const auth = loadAuthProvider({ unlocked_lessons: '[1,2]' });
    // Ровно так зовёт RegistrationPromptModal: без captureAccountSwitchResume.
    await expect(auth.signInWithProvider('google', { requireCurrentStableIdOwnership: false }))
      .resolves.toEqual({ result: 'error', error: 'account_switch_required' });
    await lastLoadedAuthProviderStorage.removeItem('unlocked_lessons');
    providerSignedIn();

    await expect(auth.resumeSignInAfterAccountSwitch('google')).resolves.toBeNull();
    expect(googleSignInImpl).toHaveBeenCalledTimes(1);
    expect(authState.calls).not.toContain('signin');
  });

  test('(b) Apple never stores a resume credential: its token is bound to a one-time nonce', async () => {
    conflictOnLink();
    const auth = loadAuthProvider({ unlocked_lessons: '[1,2]' }, 'ios');
    await expect(auth.signInWithProvider('apple', CAPTURE))
      .resolves.toEqual({ result: 'error', error: 'account_switch_required' });
    expect(appleSignInImpl).toHaveBeenCalledTimes(1);
    await lastLoadedAuthProviderStorage.removeItem('unlocked_lessons');
    providerSignedIn();

    await expect(auth.signInWithProvider('apple', { resumeAfterAccountSwitch: true }))
      .resolves.toEqual({ result: 'error', error: 'resume_credential_missing' });
    await expect(auth.resumeSignInAfterAccountSwitch('apple')).resolves.toBeNull();
    expect(appleSignInImpl).toHaveBeenCalledTimes(1);
    expect(authState.calls).not.toContain('signin');
  });

  test('(e) M-2: identity_retired after the switch is passed through, not hidden as "sign in again"', async () => {
    conflictOnLink();
    const auth = loadAuthProvider({ unlocked_lessons: '[1,2]' });
    await auth.signInWithProvider('google', CAPTURE);
    await lastLoadedAuthProviderStorage.removeItem('unlocked_lessons');
    providerSignedIn();
    ensureStableAuthLinkForStableIdDetailed.mockResolvedValueOnce({
      ok: false,
      requestedStableId: 'local-stable-id',
      stableUid: null,
      authUid: authState.providerUid,
      source: 'callable',
      failure: 'identity_retired',
      retiredSubject: 'auth',
    });

    await expect(auth.resumeSignInAfterAccountSwitch('google'))
      .resolves.toEqual({ result: 'error', error: 'identity_retired' });
    expect(googleSignInImpl).toHaveBeenCalledTimes(1);
    // Пропуск сгорел вместе с попыткой.
    await expect(auth.signInWithProvider('google', { resumeAfterAccountSwitch: true }))
      .resolves.toEqual({ result: 'error', error: 'resume_credential_missing' });
  });

  test('ordinary provider sign-out erases the credential, the switch’s own sign-out keeps it', async () => {
    conflictOnLink();
    const auth = loadAuthProvider({ unlocked_lessons: '[1,2]' });
    await auth.signInWithProvider('google', CAPTURE);
    await auth.signOutCurrentProvider();
    await expect(auth.signInWithProvider('google', { resumeAfterAccountSwitch: true }))
      .resolves.toEqual({ result: 'error', error: 'resume_credential_missing' });

    // Смена аккаунта: её шаг выхода пропуск не трогает — ради него смена и делается.
    authState.isAnonymous = true;
    await auth.signInWithProvider('google', CAPTURE);
    expect(googleSignInImpl).toHaveBeenCalledTimes(2);
    authState.isAnonymous = false;
    await expect(auth.signOutAndWipeForAccountSwitch()).resolves.toEqual({ ok: true, synced: true });
    expect(authState.calls).toContain('signout');
    await lastLoadedAuthProviderStorage.removeItem('unlocked_lessons');
    providerSignedIn();
    const resumed = await auth.resumeSignInAfterAccountSwitch('google');
    expect(resumed).not.toBeNull();
    expect(googleSignInImpl).toHaveBeenCalledTimes(2);
  });

  test('account deletion erases the credential', async () => {
    conflictOnLink();
    const auth = loadAuthProvider({ unlocked_lessons: '[1,2]' });
    await auth.signInWithProvider('google', CAPTURE);
    await auth.beginAccountDeletion().catch(() => undefined);
    await expect(auth.signInWithProvider('google', { resumeAfterAccountSwitch: true }))
      .resolves.toEqual({ result: 'error', error: 'resume_credential_missing' });
  });
});
