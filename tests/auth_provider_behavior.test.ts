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
//   • When linkWithCredential FAILS with a link-conflict code, the flow degrades
//     to signInWithCredential (order: link THEN signin).
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
  Promise<{ ok: true; jobId: string; status: 'queued'; created: true }>,
  [string | null]
>(async () => ({ ok: true as const, jobId: 'job-1', status: 'queued' as const, created: true }));
const startCloudDeletionEnqueue = jest.fn((stableId: string | null) => ({
  dispatchSettled: Promise.resolve(),
  acknowledgment: enqueueCloudDeletion(stableId),
}));
const wipeLocalAccountData = jest.fn(async () => {});
const ensureAnonUser = jest.fn(async () => mockStableId);
const forceSyncToCloud = jest.fn(async () => true);
const saveAccountSwitchEmergencyBackup = jest.fn(async () => true);
const resetAnonAuthCacheForSignOut = jest.fn();
jest.mock('../app/cloud_sync', () => ({
  SYNC_KEYS: ['user_total_xp', 'streak_count', 'unlocked_lessons', 'unlocked_lessons::fr', 'user_name', 'custom_flashcards_v2'],
  ensureAnonUser: (...a: unknown[]) => (ensureAnonUser as any)(...a),
  waitForAnonAuth: jest.fn(async () => true),
  syncToCloud: (...a: unknown[]) => (syncToCloud as any)(...a),
  restoreFromCloud: (...a: unknown[]) => (restoreFromCloud as any)(...a),
  restoreFromCloudDetailed: (...a: unknown[]) => (restoreFromCloudDetailed as any)(...a),
  forceSyncToCloud: (...a: unknown[]) => (forceSyncToCloud as any)(...a),
  quiesceSyncBeforeStableIdSwap: (...a: unknown[]) => (quiesceSyncBeforeStableIdSwap as any)(...a),
  quiesceCloudSyncForAccountTransition: (...a: unknown[]) => (quiesceCloudSyncForAccountTransition as any)(...a),
  enqueueCloudDeletion: (...a: unknown[]) => (enqueueCloudDeletion as any)(...a),
  startCloudDeletionEnqueue: (...a: unknown[]) => (startCloudDeletionEnqueue as any)(...a),
  wipeLocalAccountData: (...a: unknown[]) => (wipeLocalAccountData as any)(...a),
  deleteCloudData: jest.fn(async () => {}),
  resetAnonAuthCacheForSignOut: (...a: unknown[]) => (resetAnonAuthCacheForSignOut as any)(...a),
  ensureStableAuthLinkForStableIdDetailed: (...a: unknown[]) => (ensureStableAuthLinkForStableIdDetailed as any)(...a),
  mergeStableAccountsViaServer: (...a: unknown[]) => (mergeStableAccountsViaServer as any)(...a),
  saveAccountSwitchEmergencyBackup: (...a: unknown[]) => (saveAccountSwitchEmergencyBackup as any)(...a),
}));

let mockStableId = 'local-stable-id';
const clearStableId = jest.fn(async () => { mockStableId = 'rotated-stable-id'; });
jest.mock('../app/stable_id', () => {
  return {
    getStableId: jest.fn(async () => mockStableId),
    setStableId: jest.fn(async (v: string) => { mockStableId = v; }),
    clearStableId: (...a: unknown[]) => (clearStableId as any)(...a),
    peekStableId: jest.fn(() => mockStableId),
  };
});

const beginPremiumAccountTransition = jest.fn();
const waitForPremiumAccountWorkIdleWithDeadline = jest.fn(async (_timeoutMs: number) => true);
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
  captureAccountGeneration: jest.fn(() => ({
    generation: 1,
    stableId: mockStableId,
    phase: 'active',
  })),
  invalidateAccountGeneration: jest.fn(),
  isCurrentAccountGeneration: jest.fn(() => true),
  waitForRestoreApplicationIdleWithDeadline: jest.fn(async () => true),
  withAccountTransitionLockWithDeadline: jest.fn(async (work: () => Promise<unknown>) => ({
    completed: true,
    value: await work(),
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
  enqueueCloudDeletion.mockResolvedValue({ ok: true, jobId: 'job-1', status: 'queued', created: true });
  startCloudDeletionEnqueue.mockReset();
  startCloudDeletionEnqueue.mockImplementation((stableId: string | null) => ({
    dispatchSettled: Promise.resolve(),
    acknowledgment: enqueueCloudDeletion(stableId),
  }));
  wipeLocalAccountData.mockReset();
  wipeLocalAccountData.mockResolvedValue(undefined);
  ensureAnonUser.mockReset();
  ensureAnonUser.mockImplementation(async () => mockStableId);
  forceSyncToCloud.mockReset();
  forceSyncToCloud.mockResolvedValue(true);
  saveAccountSwitchEmergencyBackup.mockReset();
  saveAccountSwitchEmergencyBackup.mockResolvedValue(true);
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
    async (work: () => Promise<unknown>) => ({ completed: true, value: await work() }),
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
});

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
  expect(authStampAnonOwnership).not.toHaveBeenCalled();
});

test('falls back to signInWithCredential ONLY on a link-conflict error, and in that order', async () => {
  // linkWithCredential rejects with "provider already bound to another account".
  authState.linkImpl = async () => {
    const err: any = new Error('credential already in use');
    err.code = 'auth/credential-already-in-use';
    throw err;
  };

  const { signInWithProvider } = loadAuthProvider({ user_total_xp: '10' });
  const res = await signInWithProvider('google');

  // Both were called, and link came strictly before signin.
  expect(authState.calls).toContain('link');
  expect(authState.calls).toContain('signin');
  expect(authState.calls.indexOf('link')).toBeLessThan(authState.calls.indexOf('signin'));
  expect(['created_new', 'linked_existing']).toContain((res as any).result);
  expect(authStampAnonOwnership).toHaveBeenCalledTimes(1);
});

test('stamps anonymous ownership even when an empty account must fall back to provider sign-in', async () => {
  authState.linkImpl = async () => {
    const err: any = new Error('credential already in use');
    err.code = 'auth/credential-already-in-use';
    throw err;
  };

  const { signInWithProvider } = loadAuthProvider();
  const result = await signInWithProvider('google');

  expect(result.result).not.toBe('error');
  expect(authStampAnonOwnership).toHaveBeenCalledTimes(1);
});

test('Apple sign-in does not consume the one-time credential in linkWithCredential before provider sign-in', async () => {
  let consumedByLink = false;
  authState.linkImpl = async () => {
    consumedByLink = true;
    const err: any = new Error('credential already in use');
    err.code = 'auth/credential-already-in-use';
    throw err;
  };
  authState.signInImpl = async () => {
    if (consumedByLink) {
      const err: any = new Error('Duplicate credential received. Please try again with a new credential.');
      err.code = 'auth/unknown';
      throw err;
    }
    authState.isAnonymous = false;
    return { user: authFactory().currentUser };
  };

  const { signInWithProvider } = loadAuthProvider();
  const result = await signInWithProvider('apple');

  expect(result.result).not.toBe('error');
  expect(authState.calls).not.toContain('link');
  expect(authState.calls).toContain('signin');
});

test('iOS Apple sign-in sends SHA256(raw nonce) to Apple and the exact raw nonce to Firebase', async () => {
  let firebaseCredential: any = null;
  authState.signInImpl = async (credential) => {
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
  expect(authState.calls.filter((call) => call === 'signin')).toHaveLength(1);
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
  expect(authState.calls.filter((call) => call === 'signin')).toHaveLength(1);
  expect(authState.calls).not.toContain('link');
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

test('pending provider deletion rotates away without rebinding the deleted stable id', async () => {
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

  const result = await signInWithProvider('google');

  expect(result).toEqual({ result: 'error', error: 'account_delete_pending' });
  expect(enqueueCloudDeletion).toHaveBeenCalledWith('deleted-stable-id');
  expect(clearStableId).not.toHaveBeenCalled();
  expect(ensureStableAuthLinkForStableIdDetailed).not.toHaveBeenCalled();
});

test('completed pending-delete enqueue retry still quarantines the matching provider before auth-link work', async () => {
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

  expect(result).toEqual({ result: 'error', error: 'account_delete_pending' });
  expect(authState.calls).toContain('signout');
  expect(ensureAnonUser).toHaveBeenCalledTimes(2);
  expect(clearStableId).not.toHaveBeenCalled();
  expect(ensureStableAuthLinkForStableIdDetailed).not.toHaveBeenCalled();
  expect(await lastLoadedAuthProviderStorage.getItem('account_delete_pending_auth_v1')).not.toBeNull();
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

  const { signInWithProvider } = loadAuthProvider({ user_total_xp: '10' });
  const result = await signInWithProvider('google');
  await new Promise<void>((resolve) => setImmediate(resolve));

  expect(['created_new', 'linked_existing']).toContain(result.result);
  expect(syncToCloud).toHaveBeenCalledTimes(1);
  expect(emitAppEvent).not.toHaveBeenCalledWith('cloud_profile_hydrated');
});

test('processed cloud document still permits upload when newer local progress needed no restore writes', async () => {
  restoreFromCloudDetailed.mockResolvedValueOnce('restored');

  const { signInWithProvider } = loadAuthProvider({ user_total_xp: '25' });
  const result = await signInWithProvider('google');
  await new Promise<void>((resolve) => setImmediate(resolve));

  expect(['created_new', 'linked_existing']).toContain(result.result);
  expect(syncToCloud).toHaveBeenCalledTimes(1);
  expect(emitAppEvent).toHaveBeenCalledWith('cloud_profile_hydrated');
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

test('returning account on an empty device skips pointless local upload and account merge', async () => {
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

  expect(result.result).toBe('merged_devices');
  expect(syncToCloud).not.toHaveBeenCalled();
  expect(mergeStableAccountsViaServer).not.toHaveBeenCalled();
  expect(quiesceSyncBeforeStableIdSwap).toHaveBeenCalledTimes(1);
  expect(wipeLocalAccountData).toHaveBeenCalledTimes(1);
  expect(beginPremiumAccountTransition).toHaveBeenCalledTimes(1);
});

test('Apple uses the same premium transition boundary when it swaps to a returning account', async () => {
  ensureStableAuthLinkForStableIdDetailed.mockResolvedValueOnce({
    ok: true,
    stableUid: 'remote-stable-id',
    source: 'server',
  });

  const { signInWithProvider } = loadAuthProvider(undefined, 'ios');
  const result = await signInWithProvider('apple');

  expect(result.result).toBe('merged_devices');
  expect(beginPremiumAccountTransition).toHaveBeenCalledTimes(1);
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
    .toContain('"phase":"prepared"');
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

test('cold restart pending guard blocks before native sign-in, stable id, or auth callables', async () => {
  authState.isAnonymous = false;
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

  expect(result).toEqual({ result: 'error', error: 'account_delete_pending' });
  expect(googleSignInImpl).not.toHaveBeenCalled();
  expect(authStampAnonOwnership).not.toHaveBeenCalled();
  expect(ensureStableAuthLinkForStableIdDetailed).not.toHaveBeenCalled();
  expect(enqueueCloudDeletion).toHaveBeenCalledWith('deleted-stable-id');
  expect(authState.calls).toContain('signout');
  expect(clearStableId).not.toHaveBeenCalled();
});

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
  expect(startCloudDeletionEnqueue).toHaveBeenCalledWith('deleted-stable-id');
  expect(authState.calls).toContain('signout');
  expect(wipeLocalAccountData).toHaveBeenCalledTimes(1);
  expect(clearStableId).toHaveBeenCalledTimes(1);
});

test('expired same-provider guard stays quarantined without re-clearing the stable id', async () => {
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

  expect(result).toEqual({ result: 'error', error: 'account_delete_pending' });
  expect(googleSignInImpl).not.toHaveBeenCalled();
  expect(enqueueCloudDeletion).toHaveBeenCalledWith('deleted-stable-id');
  expect(clearStableId).not.toHaveBeenCalled();
  expect(await lastLoadedAuthProviderStorage.getItem('account_delete_pending_auth_v1')).not.toBeNull();
});

test('local-cleared guard for another provider allows a verified different provider', async () => {
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

  expect(['created_new', 'linked_existing']).toContain(result.result);
  expect(googleSignInImpl).toHaveBeenCalledTimes(1);
  expect(enqueueCloudDeletion).not.toHaveBeenCalled();
});

test('Firebase sign-out failure is rethrown without resetting anonymous auth state or logging success', async () => {
  authState.isAnonymous = false;
  rejectFirebaseSignOut(new Error('firebase signout failed'));
  const { signOutCurrentProvider } = loadAuthProvider();

  await expect(signOutCurrentProvider()).rejects.toThrow('firebase signout failed');

  expect(resetAnonAuthCacheForSignOut).not.toHaveBeenCalled();
  expect(logEvent.mock.calls.some(([name]) => name === 'auth_signout')).toBe(false);
});

test('account switch leaves local identity intact when Firebase sign-out fails', async () => {
  authState.isAnonymous = false;
  rejectFirebaseSignOut(new Error('firebase signout failed'));
  const { signOutAndWipeForAccountSwitch } = loadAuthProvider();

  const result = await signOutAndWipeForAccountSwitch();

  expect(result).toEqual({ ok: false, reason: 'unknown', detail: 'firebase signout failed' });
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

  expect(saveAccountSwitchEmergencyBackup).toHaveBeenCalledWith(
    'pending_shard_spend_discard_before_account_switch',
    'local-stable-id',
  );
  expect(accountGeneration.invalidateAccountGeneration).toHaveBeenCalled();
  expect(beginPremiumAccountTransition).toHaveBeenCalledTimes(1);
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

  expect(saveAccountSwitchEmergencyBackup).toHaveBeenCalledWith(
    'pending_shard_spend_discard_before_account_switch',
    'local-stable-id',
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

  expect(result).toEqual({ ok: false, reason: 'backup_failed', detail: 'backup unavailable' });
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
  expect(saveAccountSwitchEmergencyBackup).toHaveBeenCalledWith(
    'pending_shard_earn_before_account_switch',
    'local-stable-id',
  );
  expect(wipeLocalAccountData).toHaveBeenCalledTimes(1);
});

test('account switch aborts before invalidation when the required emergency backup fails', async () => {
  authState.isAnonymous = false;
  forceSyncToCloud.mockResolvedValueOnce(false);
  saveAccountSwitchEmergencyBackup.mockRejectedValueOnce(new Error('backup unavailable'));
  const accountGeneration = require('../app/account_generation');
  const { signOutAndWipeForAccountSwitch } = loadAuthProvider();

  const result = await signOutAndWipeForAccountSwitch({ allowWipeWithoutSync: true });

  expect(result).toEqual({ ok: false, reason: 'backup_failed', detail: 'backup unavailable' });
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
  expect(accountGeneration.invalidateAccountGeneration).toHaveBeenCalledTimes(1);
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

  // One call is the normal pre-picker warmup; pending-delete recovery must not rebind.
  expect(ensureAnonUser).toHaveBeenCalledTimes(1);
  expect(clearStableId).not.toHaveBeenCalled();
});

test('UI handoff is fast but linked background deletion waits for server acknowledgement', async () => {
  authState.isAnonymous = false;
  let resolveDispatch!: () => void;
  let resolveAcknowledgement!: (value: { ok: true; jobId: string; status: 'queued'; created: true }) => void;
  const dispatchSettled = new Promise<void>((resolve) => { resolveDispatch = resolve; });
  const acknowledgment = new Promise<{ ok: true; jobId: string; status: 'queued'; created: true }>((resolve) => {
    resolveAcknowledgement = resolve;
  });
  startCloudDeletionEnqueue.mockReturnValueOnce({ dispatchSettled, acknowledgment });
  const authProvider = loadAuthProvider();

  const handoff = await authProvider.beginAccountDeletion();
  expect(handoff.ok).toBe(true);
  if (!handoff.ok) throw new Error(handoff.reason);
  expect(authState.calls).not.toContain('signout');

  resolveDispatch();
  const result = await Promise.race([
    handoff.completion,
    new Promise<'blocked'>((resolve) => setTimeout(() => resolve('blocked'), 100)),
  ]);

  expect(startCloudDeletionEnqueue).toHaveBeenCalledWith('local-stable-id');
  expect(result).toBe('blocked');
  expect(authState.calls).not.toContain('signout');
  expect(wipeLocalAccountData).toHaveBeenCalledTimes(1);
  expect(beginPremiumAccountTransition).toHaveBeenCalledTimes(1);

  resolveAcknowledgement({ ok: true, jobId: 'job-1', status: 'queued', created: true });
  await expect(handoff.completion).resolves.toEqual({ ok: true, cloudDeleted: false });
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

  expect(startCloudDeletionEnqueue).toHaveBeenCalledWith('deleted-stable-id');
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

  expect(startCloudDeletionEnqueue).toHaveBeenCalledWith('deleted-stable-id');
  expect(await lastLoadedAuthProviderStorage.getItem('account_delete_pending_auth_v1'))
    .toContain('"phase":"local_cleared"');
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
  expect(await lastLoadedAuthProviderStorage.getItem('account_delete_pending_auth_v1'))
    .toContain('"phase":"local_cleared"');
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
  let resolveAcknowledgement!: (value: { ok: true; jobId: string; status: 'queued'; created: true }) => void;
  startCloudDeletionEnqueue.mockReturnValueOnce({
    dispatchSettled: Promise.resolve(),
    acknowledgment: new Promise(resolve => { resolveAcknowledgement = resolve; }),
  });
  const authProvider = loadAuthProvider();

  const deleting = authProvider.deleteAccountAndWipe();
  await waitForCall(startCloudDeletionEnqueue, 'startCloudDeletionEnqueue');
  const switching = authProvider.signOutAndWipeForAccountSwitch();

  await expect(switching).resolves.toEqual({
    ok: false,
    reason: 'clean_recovery_transition_active',
  });
  resolveAcknowledgement({ ok: true, jobId: 'job-1', status: 'queued', created: true });
  await deleting;
});

test('account deletion completes local privacy exit after the bounded premium drain times out', async () => {
  authState.isAnonymous = false;
  waitForPremiumAccountWorkIdleWithDeadline.mockResolvedValueOnce(false);
  const authProvider = loadAuthProvider();

  await expect(authProvider.deleteAccountAndWipe()).resolves.toEqual({ ok: true, cloudDeleted: false });

  expect(waitForPremiumAccountWorkIdleWithDeadline).toHaveBeenCalledWith(1_500);
  expect(authState.calls).toContain('signout');
  expect(wipeLocalAccountData).toHaveBeenCalledTimes(1);
  expect(clearStableId).toHaveBeenCalledTimes(1);
  expect(await lastLoadedAuthProviderStorage.getItem('account_delete_pending_auth_v1'))
    .toContain('provider-uid-1');
  expect(logEvent).toHaveBeenCalledWith('auth_premium_account_work_drain_timed_out', {
    timeoutMs: 1_500,
  });
});

test('account switch preserves sign-out-before-wipe after the bounded premium drain times out', async () => {
  authState.isAnonymous = false;
  waitForPremiumAccountWorkIdleWithDeadline.mockResolvedValueOnce(false);
  wipeLocalAccountData.mockImplementationOnce(async () => { authState.calls.push('wipe'); });
  const { signOutAndWipeForAccountSwitch } = loadAuthProvider();

  await expect(signOutAndWipeForAccountSwitch()).resolves.toEqual({ ok: true, synced: true });

  expect(saveAccountSwitchEmergencyBackup).toHaveBeenCalledWith(
    'final_account_snapshot_before_switch',
    'local-stable-id',
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
    detail: 'completion snapshot unavailable',
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
  expect(clearStableId).toHaveBeenCalledTimes(1);
  // Both calls are the intentional pre-signout notification/push-token cleanup
  // paths. The failed Firebase sign-out must not add a third call for identity
  // rotation or turn the still-provider session into an anonymous account.
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

  await authProvider.handleAccountDeletedOnAnotherDevice();

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

test('account data without XP is still preserved before a remote account swap', async () => {
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

  expect(result.result).toBe('merged_devices');
  expect(syncToCloud).toHaveBeenCalledWith({ forceNow: true });
  expect(mergeStableAccountsViaServer).toHaveBeenCalledTimes(1);
});

test('a user-cancelled native sign-in returns { result: "cancelled" } and never touches Firebase auth', async () => {
  googleSignInImpl.mockResolvedValueOnce({ type: 'cancelled' });
  const { signInWithProvider } = loadAuthProvider();
  const res = await signInWithProvider('google');
  expect(res).toEqual({ result: 'cancelled' });
  // No link/signin attempted for a cancelled flow.
  expect(authState.calls).toHaveLength(0);
});

test('an unexpected link error still degrades to signInWithCredential (does not abort sign-in)', async () => {
  // A non-conflict link error must not break sign-in: the code logs and still
  // attempts signInWithCredential so the user is not stuck.
  authState.linkImpl = async () => {
    const err: any = new Error('transient');
    err.code = 'auth/network-request-failed';
    throw err;
  };
  const { signInWithProvider } = loadAuthProvider();
  const res = await signInWithProvider('google');
  expect(authState.calls).toContain('link');
  expect(authState.calls).toContain('signin');
  expect(authState.calls.indexOf('link')).toBeLessThan(authState.calls.indexOf('signin'));
  expect((res as any).result).not.toBe('error');
});
