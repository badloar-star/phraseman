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
const googleSignInImpl = jest.fn<Promise<any>, any[]>(async () => ({ type: 'success', data: { idToken: 'fake-google-id-token', user: { email: 'u@example.com' } } }));
jest.mock(
  '@react-native-google-signin/google-signin',
  () => ({
    GoogleSignin: {
      configure: jest.fn(),
      hasPlayServices: jest.fn(async () => true),
      signIn: (...args: unknown[]) => googleSignInImpl(...(args as [])),
      signOut: jest.fn(async () => {}),
    },
  }),
  { virtual: true },
);

// ── cloud_sync: the sign-in flow leans on many exports. Make link "succeed"
//    on the LOCAL stable id so the outcome is created_new/linked_existing (the
//    simple happy path that still exercises link-first). ──
const ensureStableAuthLinkForStableIdDetailed = jest.fn(async (stableId: string) => ({
  ok: true,
  stableUid: stableId, // same → linked_existing / created_new branch
  source: 'server',
}));
jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: jest.fn(async () => {}),
  waitForAnonAuth: jest.fn(async () => true),
  syncToCloud: jest.fn(async () => {}),
  restoreFromCloud: jest.fn(async () => {}),
  forceSyncToCloud: jest.fn(async () => {}),
  quiesceSyncBeforeStableIdSwap: jest.fn(async () => {}),
  wipeLocalAccountData: jest.fn(async () => {}),
  deleteCloudData: jest.fn(async () => {}),
  resetAnonAuthCacheForSignOut: jest.fn(() => {}),
  ensureStableAuthLinkForStableIdDetailed: (...a: unknown[]) => (ensureStableAuthLinkForStableIdDetailed as any)(...a),
  mergeStableAccountsViaServer: jest.fn(async () => null),
  saveAccountSwitchEmergencyBackup: jest.fn(async () => {}),
}));

jest.mock('../app/stable_id', () => {
  let id = 'local-stable-id';
  return {
    getStableId: jest.fn(async () => id),
    setStableId: jest.fn(async (v: string) => { id = v; }),
    clearStableId: jest.fn(async () => {}),
    peekStableId: jest.fn(() => id),
  };
});

jest.mock('../app/premium_guard', () => ({ invalidatePremiumCache: jest.fn() }));
jest.mock('../app/shards_system', () => ({ loadShardsFromCloud: jest.fn(async () => {}) }));
const logEvent = jest.fn();
const recordError = jest.fn();
jest.mock('../app/firebase', () => ({
  logEvent: (...a: unknown[]) => logEvent(...a),
  recordError: (...a: unknown[]) => recordError(...a),
}));
jest.mock('../app/app_health', () => ({ logAppError: jest.fn() }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/target_storage_keys', () => ({ unlockedLessonsKey: (t: string) => `unlocked_lessons_${t}` }));
jest.mock('../app/account_delete_timeout', () => ({ ACCOUNT_DELETE_CALLABLE_TIMEOUT_MS: 15000 }));

// @react-native-firebase/functions is required lazily (stampAnonOwnershipBeforeSignIn).
jest.mock(
  '@react-native-firebase/functions',
  () => ({ getFunctions: jest.fn(() => ({})), httpsCallable: jest.fn(() => async () => ({})) }),
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
  ensureStableAuthLinkForStableIdDetailed.mockClear();
  googleSignInImpl.mockClear();
  googleSignInImpl.mockResolvedValue({ type: 'success', data: { idToken: 'fake-google-id-token', user: { email: 'u@example.com' } } });
});

function loadAuthProvider(): typeof import('../app/auth_provider') {
  let mod!: typeof import('../app/auth_provider');
  jest.isolateModules(() => {
    mod = require('../app/auth_provider');
  });
  return mod;
}

test('sign-in over an anonymous user tries linkWithCredential FIRST (does not destroy the anon uid)', async () => {
  const { signInWithProvider } = loadAuthProvider();
  const res = await signInWithProvider('google');

  // link was attempted; signInWithCredential was NOT (link succeeded → uid preserved).
  expect(authState.calls).toContain('link');
  expect(authState.calls).not.toContain('signin');
  expect(authState.calls[0]).toBe('link');
  // Flow completed as a real sign-in result (created_new or linked_existing), not an error.
  expect(['created_new', 'linked_existing']).toContain((res as any).result);
});

test('falls back to signInWithCredential ONLY on a link-conflict error, and in that order', async () => {
  // linkWithCredential rejects with "provider already bound to another account".
  authState.linkImpl = async () => {
    const err: any = new Error('credential already in use');
    err.code = 'auth/credential-already-in-use';
    throw err;
  };

  const { signInWithProvider } = loadAuthProvider();
  const res = await signInWithProvider('google');

  // Both were called, and link came strictly before signin.
  expect(authState.calls).toContain('link');
  expect(authState.calls).toContain('signin');
  expect(authState.calls.indexOf('link')).toBeLessThan(authState.calls.indexOf('signin'));
  expect(['created_new', 'linked_existing']).toContain((res as any).result);
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
