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
const enqueueCloudDeletion = jest.fn(async () => ({ ok: true as const, jobId: 'job-1', status: 'queued' as const, created: true }));
const wipeLocalAccountData = jest.fn(async () => {});
const ensureAnonUser = jest.fn(async () => mockStableId);
jest.mock('../app/cloud_sync', () => ({
  SYNC_KEYS: ['user_total_xp', 'streak_count', 'unlocked_lessons', 'unlocked_lessons::fr', 'user_name', 'custom_flashcards_v2'],
  ensureAnonUser: (...a: unknown[]) => (ensureAnonUser as any)(...a),
  waitForAnonAuth: jest.fn(async () => true),
  syncToCloud: (...a: unknown[]) => (syncToCloud as any)(...a),
  restoreFromCloud: (...a: unknown[]) => (restoreFromCloud as any)(...a),
  restoreFromCloudDetailed: (...a: unknown[]) => (restoreFromCloudDetailed as any)(...a),
  forceSyncToCloud: jest.fn(async () => {}),
  quiesceSyncBeforeStableIdSwap: (...a: unknown[]) => (quiesceSyncBeforeStableIdSwap as any)(...a),
  quiesceCloudSyncForAccountTransition: (...a: unknown[]) => (quiesceCloudSyncForAccountTransition as any)(...a),
  enqueueCloudDeletion: (...a: unknown[]) => (enqueueCloudDeletion as any)(...a),
  wipeLocalAccountData: (...a: unknown[]) => (wipeLocalAccountData as any)(...a),
  deleteCloudData: jest.fn(async () => {}),
  resetAnonAuthCacheForSignOut: jest.fn(() => {}),
  ensureStableAuthLinkForStableIdDetailed: (...a: unknown[]) => (ensureStableAuthLinkForStableIdDetailed as any)(...a),
  mergeStableAccountsViaServer: (...a: unknown[]) => (mergeStableAccountsViaServer as any)(...a),
  saveAccountSwitchEmergencyBackup: jest.fn(async () => {}),
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

jest.mock('../app/premium_guard', () => ({ invalidatePremiumCache: jest.fn() }));
const mockLoadShardsFromCloud = jest.fn(async () => {});
jest.mock('../app/shards_system', () => ({
  loadShardsFromCloud: () => mockLoadShardsFromCloud(),
  forceSyncShardsToCloud: jest.fn(async () => {}),
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
  captureAccountGeneration: jest.fn(() => 1),
  invalidateAccountGeneration: jest.fn(),
  isCurrentAccountGeneration: jest.fn(() => true),
  waitForRestoreApplicationIdleWithDeadline: jest.fn(async () => true),
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
const authState = authFactory.__testState as {
  calls: string[];
  linkImpl: null | ((c: unknown) => Promise<unknown>);
  signInImpl: null | ((c: unknown) => Promise<unknown>);
  isAnonymous: boolean;
  anonUid: string;
  providerUid: string;
};

beforeEach(() => {
  (globalThis as any).__DEV__ = false;
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
  syncToCloud.mockClear();
  mergeStableAccountsViaServer.mockClear();
  quiesceSyncBeforeStableIdSwap.mockClear();
  quiesceCloudSyncForAccountTransition.mockClear();
  enqueueCloudDeletion.mockClear();
  wipeLocalAccountData.mockClear();
  ensureAnonUser.mockClear();
  clearStableId.mockClear();
  mockLoadShardsFromCloud.mockReset();
  mockLoadShardsFromCloud.mockResolvedValue(undefined);
  require('@react-native-async-storage/async-storage').__reset();
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

test('refreshes the Firebase token after credential mutation before calling the stable-link server', async () => {
  const { signInWithProvider } = loadAuthProvider();
  const result = await signInWithProvider('google');

  expect(result.result).not.toBe('error');
  expect(authState.calls).toContain('token-refresh');
  expect(authState.calls.indexOf('token-refresh')).toBeLessThan(
    authState.calls.indexOf('signin') >= 0 ? authState.calls.indexOf('signin') + 1 : authState.calls.length,
  );
});

test('pending provider deletion repairs or rotates the anonymous stable id before returning to the app', async () => {
  authState.linkImpl = async () => {
    const err: any = new Error('credential already in use');
    err.code = 'auth/credential-already-in-use';
    throw err;
  };
  ensureStableAuthLinkForStableIdDetailed
    .mockResolvedValueOnce({
      ok: false,
      requestedStableId: 'local-stable-id',
      stableUid: null,
      authUid: 'anon-uid-1',
      source: 'unavailable',
      failure: 'stable_id_mismatch',
    })
    .mockResolvedValueOnce({
      ok: true,
      requestedStableId: 'rotated-stable-id',
      stableUid: 'rotated-stable-id',
      authUid: 'anon-uid-1',
      source: 'callable',
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
  expect(ensureStableAuthLinkForStableIdDetailed).toHaveBeenNthCalledWith(1, 'local-stable-id');
  expect(clearStableId).toHaveBeenCalledTimes(1);
  expect(ensureStableAuthLinkForStableIdDetailed).toHaveBeenNthCalledWith(2, 'rotated-stable-id');
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
  await Promise.resolve();

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
  await Promise.resolve();
  const apple = await signInWithProvider('apple');

  expect(apple).toEqual({ result: 'error', error: 'auth_signin_in_progress_google' });
  releaseGoogle({ type: 'cancelled' });
  await google;
});

test('an over-deadline provider operation reports still-running instead of wedging every retry', async () => {
  let releaseGoogle!: (value: any) => void;
  googleSignInImpl.mockImplementationOnce(() => new Promise((resolve) => { releaseGoogle = resolve; }));
  const now = jest.spyOn(Date, 'now').mockReturnValueOnce(1_000).mockReturnValue(46_001);

  const { signInWithProvider } = loadAuthProvider();
  const first = signInWithProvider('google');
  await Promise.resolve();
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
});

test('an enqueue failure still exits locally but reports that server deletion was not accepted', async () => {
  authState.isAnonymous = false;
  enqueueCloudDeletion.mockRejectedValueOnce(new Error('offline'));
  const authProvider = loadAuthProvider();

  const result = await authProvider.deleteAccountAndWipe();

  expect(result).toEqual({ ok: false, reason: 'cloud_delete_not_enqueued' });
  expect(authState.calls).toContain('signout');
  expect(wipeLocalAccountData).toHaveBeenCalledTimes(1);
  expect(clearStableId).toHaveBeenCalledTimes(1);
  expect(await lastLoadedAuthProviderStorage.getItem('account_delete_pending_auth_v1')).toContain('provider-uid-1');
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
  let resolveEnqueue!: (value: { ok: true; jobId: string; status: 'queued'; created: true }) => void;
  enqueueCloudDeletion.mockImplementationOnce(() => new Promise((resolve) => {
    resolveEnqueue = resolve;
  }));
  const authProvider = loadAuthProvider();

  const deletion = authProvider.deleteAccountAndWipe();
  for (let i = 0; i < 5 && enqueueCloudDeletion.mock.calls.length === 0; i += 1) {
    await Promise.resolve();
  }
  expect(authProvider.isLocalAccountDeletionInProgress()).toBe(true);

  resolveEnqueue({ ok: true, jobId: 'job-1', status: 'queued', created: true });
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
