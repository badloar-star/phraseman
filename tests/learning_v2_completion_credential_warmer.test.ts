import {
  beginAccountGeneration,
  captureAccountGeneration,
} from '../app/account_generation';
import {
  __resetInteractiveNetworkQuietForTests,
  beginInteractiveNetworkQuiet,
  releaseInteractiveNetworkQuiet,
  waitForInteractiveNetworkQuiet,
  withBackgroundNetworkLease,
  type BackgroundNetworkLease,
} from '../app/interactive_network_quiet';
import {
  attemptWarmLearningV2CompletionCredentialsCachePreferred,
  clearLearningV2CompletionCredentialCache,
  peekLearningV2CompletionCredentialHandle,
} from '../app/learning_v2_completion_credential_cache';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));

const mockAuthState: { currentUser: { uid: string } | null } = { currentUser: null };
const mockGetIdTokenResult = jest.fn();
const mockGetAppCheckToken = jest.fn();
const mockAppCheckReady = { value: true };
const mockProject = { value: 'phraseman-ea0b3' };

jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => mockAuthState,
  getIdTokenResult: (...args: unknown[]) => mockGetIdTokenResult(...args),
}));
jest.mock('@react-native-firebase/app-check', () => ({
  __esModule: true,
  default: () => ({ getToken: (...args: unknown[]) => mockGetAppCheckToken(...args) }),
}));
jest.mock('@react-native-firebase/app', () => ({
  getApp: () => ({ options: { projectId: mockProject.value } }),
}));
jest.mock('../app/app_check_init', () => ({
  isFirebaseAppCheckReady: () => mockAppCheckReady.value,
}));

const NOW = 1_000_000;
const EXP_MS = NOW + 600_000;
const jwt = (payload: Record<string, unknown>) => [
  Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url'),
  Buffer.from(JSON.stringify(payload)).toString('base64url'),
  'signature',
].join('.');
const authResult = (uid: string, expiresAtMs = EXP_MS) => ({
  token: jwt({
    aud: 'phraseman-ea0b3',
    iss: 'https://securetoken.google.com/phraseman-ea0b3',
    sub: uid,
    exp: expiresAtMs / 1_000,
  }),
  expirationTime: new Date(expiresAtMs).toISOString(),
});
const appCheckResult = (expiresAtMs = EXP_MS) => ({
  token: jwt({ exp: expiresAtMs / 1_000 }),
});

beforeEach(() => {
  __resetInteractiveNetworkQuietForTests();
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
  mockAuthState.currentUser = { uid: 'firebase-auth-warm' };
  mockAppCheckReady.value = true;
  mockProject.value = 'phraseman-ea0b3';
  mockGetIdTokenResult.mockReset().mockResolvedValue(authResult('firebase-auth-warm'));
  mockGetAppCheckToken.mockReset().mockResolvedValue(appCheckResult());
  beginAccountGeneration('stable-warm');
});

afterEach(() => jest.restoreAllMocks());

test('missing readiness or user performs zero native token calls', async () => {
  const account = captureAccountGeneration();
  mockAppCheckReady.value = false;
  await expect(withBackgroundNetworkLease('completion.credentials_test', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(account, lease),
  )).resolves.toBe('unavailable');
  mockAppCheckReady.value = true;
  mockAuthState.currentUser = null;
  await expect(withBackgroundNetworkLease('completion.credentials_test', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(account, lease),
  )).resolves.toBe('unavailable');
  expect(mockGetIdTokenResult).not.toHaveBeenCalled();
  expect(mockGetAppCheckToken).not.toHaveBeenCalled();
});

test('oversized current stable identity starts zero native token calls', async () => {
  const account = beginAccountGeneration('x'.repeat(257));
  await expect(withBackgroundNetworkLease('completion.credentials_test', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(account, lease),
  )).resolves.toBe('unavailable');
  expect(mockGetIdTokenResult).not.toHaveBeenCalled();
  expect(mockGetAppCheckToken).not.toHaveBeenCalled();
});

test('forged lease or foreign Firebase project starts zero native token calls', async () => {
  const account = captureAccountGeneration();
  await expect(attemptWarmLearningV2CompletionCredentialsCachePreferred(
    account,
    Object.freeze({}) as BackgroundNetworkLease,
  )).resolves.toBe('unavailable');
  mockProject.value = 'foreign-project';
  await expect(withBackgroundNetworkLease('completion.credentials_test', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(account, lease),
  )).resolves.toBe('unavailable');
  expect(mockGetIdTokenResult).not.toHaveBeenCalled();
  expect(mockGetAppCheckToken).not.toHaveBeenCalled();
});

test('quiet waits for a non-cancellable auth call to really settle and publishes nothing', async () => {
  let settleAuth!: (value: unknown) => void;
  mockGetIdTokenResult.mockReturnValue(new Promise((resolve) => { settleAuth = resolve; }));
  const account = captureAccountGeneration();
  const warm = withBackgroundNetworkLease('completion.credentials_test', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(account, lease));
  await Promise.resolve();
  const quiet = beginInteractiveNetworkQuiet();
  const ready = waitForInteractiveNetworkQuiet(quiet);
  let readySettled = false;
  void ready.finally(() => { readySettled = true; });
  await Promise.resolve();
  expect(readySettled).toBe(false);
  settleAuth(authResult('firebase-auth-warm'));
  await expect(warm).rejects.toEqual(expect.objectContaining({
    message: 'interactive_network_deferred',
  }));
  await expect(ready).resolves.toBeUndefined();
  expect(mockGetAppCheckToken).not.toHaveBeenCalled();
  expect(peekLearningV2CompletionCredentialHandle(account)).toBeNull();
  releaseInteractiveNetworkQuiet(quiet);
  await Promise.resolve();
});

test('quiet also waits for a non-cancellable App Check call to really settle', async () => {
  let settleAppCheck!: (value: unknown) => void;
  mockGetAppCheckToken.mockReturnValue(new Promise((resolve) => { settleAppCheck = resolve; }));
  const account = captureAccountGeneration();
  const warm = withBackgroundNetworkLease('completion.credentials_test', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(account, lease));
  while (mockGetAppCheckToken.mock.calls.length === 0) await Promise.resolve();
  const quiet = beginInteractiveNetworkQuiet();
  const ready = waitForInteractiveNetworkQuiet(quiet);
  let readySettled = false;
  void ready.finally(() => { readySettled = true; });
  await Promise.resolve();
  expect(readySettled).toBe(false);
  settleAppCheck(appCheckResult());
  await expect(warm).rejects.toEqual(expect.objectContaining({
    message: 'interactive_network_deferred',
  }));
  await expect(ready).resolves.toBeUndefined();
  expect(peekLearningV2CompletionCredentialHandle(account)).toBeNull();
  releaseInteractiveNetworkQuiet(quiet);
  await Promise.resolve();
});

test('uid drift after auth settlement is stale and starts no App Check call', async () => {
  let settleAuth!: (value: unknown) => void;
  mockGetIdTokenResult.mockReturnValue(new Promise((resolve) => { settleAuth = resolve; }));
  const account = captureAccountGeneration();
  const warm = withBackgroundNetworkLease('completion.credentials_test', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(account, lease));
  await Promise.resolve();
  mockAuthState.currentUser = { uid: 'firebase-auth-other' };
  settleAuth(authResult('firebase-auth-warm'));
  await expect(warm).resolves.toBe('stale');
  expect(mockGetAppCheckToken).not.toHaveBeenCalled();
  expect(peekLearningV2CompletionCredentialHandle(account)).toBeNull();
});

test('same UID with a replaced RNFirebase User wrapper remains valid', async () => {
  let settleAuth!: (value: unknown) => void;
  mockGetIdTokenResult.mockReturnValue(new Promise((resolve) => { settleAuth = resolve; }));
  const account = captureAccountGeneration();
  const warm = withBackgroundNetworkLease('completion.credentials_test', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(account, lease));
  await Promise.resolve();
  mockAuthState.currentUser = { uid: 'firebase-auth-warm' };
  settleAuth(authResult('firebase-auth-warm'));
  await expect(warm).resolves.toBe('published');
  expect(mockGetAppCheckToken).toHaveBeenCalledTimes(1);
});

test('a stalled old-account warm does not block or erase the new account', async () => {
  let settleOldAuth!: (value: unknown) => void;
  let authCall = 0;
  mockGetIdTokenResult.mockImplementation(() => {
    authCall += 1;
    if (authCall === 1) return new Promise((resolve) => { settleOldAuth = resolve; });
    return Promise.resolve(authResult('firebase-auth-new'));
  });
  const oldAccount = captureAccountGeneration();
  const oldWarm = withBackgroundNetworkLease('completion.credentials_old', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(oldAccount, lease));
  await Promise.resolve();

  const newAccount = beginAccountGeneration('stable-new');
  mockAuthState.currentUser = { uid: 'firebase-auth-new' };
  await expect(withBackgroundNetworkLease('completion.credentials_new', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(newAccount, lease),
  )).resolves.toBe('published');
  const newHandle = peekLearningV2CompletionCredentialHandle(newAccount);
  expect(newHandle).not.toBeNull();

  settleOldAuth(authResult('firebase-auth-warm'));
  await expect(oldWarm).resolves.toBe('stale');
  expect(peekLearningV2CompletionCredentialHandle(newAccount)).toBe(newHandle);
});

test('explicit cache clear fences a pending auth or App Check result', async () => {
  let settleAuth!: (value: unknown) => void;
  mockGetIdTokenResult.mockReturnValue(new Promise((resolve) => { settleAuth = resolve; }));
  const account = captureAccountGeneration();
  const authWarm = withBackgroundNetworkLease('completion.credentials_test', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(account, lease));
  await Promise.resolve();
  clearLearningV2CompletionCredentialCache();
  settleAuth(authResult('firebase-auth-warm'));
  await expect(authWarm).resolves.toBe('stale');
  expect(mockGetAppCheckToken).not.toHaveBeenCalled();

  mockGetIdTokenResult.mockResolvedValue(authResult('firebase-auth-warm'));
  let settleAppCheck!: (value: unknown) => void;
  mockGetAppCheckToken.mockReturnValue(new Promise((resolve) => { settleAppCheck = resolve; }));
  const appCheckWarm = withBackgroundNetworkLease('completion.credentials_test', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(account, lease));
  while (mockGetAppCheckToken.mock.calls.length === 0) await Promise.resolve();
  clearLearningV2CompletionCredentialCache();
  settleAppCheck(appCheckResult());
  await expect(appCheckWarm).resolves.toBe('stale');
  expect(peekLearningV2CompletionCredentialHandle(account)).toBeNull();
});

test('project drift while App Check is pending prevents publication', async () => {
  let settleAppCheck!: (value: unknown) => void;
  mockGetAppCheckToken.mockReturnValue(new Promise((resolve) => { settleAppCheck = resolve; }));
  const account = captureAccountGeneration();
  const warm = withBackgroundNetworkLease('completion.credentials_test', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(account, lease));
  while (mockGetAppCheckToken.mock.calls.length === 0) await Promise.resolve();
  mockProject.value = 'foreign-project';
  settleAppCheck(appCheckResult());
  await expect(warm).resolves.toBe('stale');
  expect(peekLearningV2CompletionCredentialHandle(account)).toBeNull();
});

test('invalid App Check result leaves the previous opaque pair unchanged', async () => {
  const account = captureAccountGeneration();
  await expect(withBackgroundNetworkLease('completion.credentials_test', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(account, lease),
  )).resolves.toBe('published');
  const previous = peekLearningV2CompletionCredentialHandle(account);
  mockGetAppCheckToken.mockResolvedValue({ token: 'not-a-jwt' });
  await expect(withBackgroundNetworkLease('completion.credentials_test', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(account, lease),
  )).resolves.toBe('unavailable');
  expect(peekLearningV2CompletionCredentialHandle(account)).toBe(previous);
});

test('concurrent warm is single-flight and starts no second native read', async () => {
  let settleAuth!: (value: unknown) => void;
  mockGetIdTokenResult.mockReturnValue(new Promise((resolve) => { settleAuth = resolve; }));
  const account = captureAccountGeneration();
  const first = withBackgroundNetworkLease('completion.credentials_test', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(account, lease));
  await Promise.resolve();
  await expect(withBackgroundNetworkLease('completion.credentials_test', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(account, lease),
  )).resolves.toBe('in_flight');
  expect(mockGetIdTokenResult).toHaveBeenCalledTimes(1);
  settleAuth(authResult('firebase-auth-warm'));
  await expect(first).resolves.toBe('published');
  expect(mockGetAppCheckToken).toHaveBeenCalledTimes(1);
});

test('eight stalled old generations report honest capacity for the current owner', async () => {
  const pending: { uid: string; settle(value: unknown): void }[] = [];
  mockGetIdTokenResult.mockImplementation((user: { uid: string }) =>
    new Promise((resolve) => { pending.push({ uid: user.uid, settle: resolve }); }));
  const oldWarms: Promise<unknown>[] = [];
  for (let index = 0; index < 8; index += 1) {
    const uid = `firebase-auth-old-${index}`;
    mockAuthState.currentUser = { uid };
    const account = beginAccountGeneration(`stable-old-${index}`);
    oldWarms.push(withBackgroundNetworkLease(`completion.credentials_old_${index}`, (lease) =>
      attemptWarmLearningV2CompletionCredentialsCachePreferred(account, lease)));
    while (pending.length <= index) await Promise.resolve();
  }
  mockAuthState.currentUser = { uid: 'firebase-auth-current' };
  const current = beginAccountGeneration('stable-current');
  await expect(withBackgroundNetworkLease('completion.credentials_current', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(current, lease),
  )).resolves.toBe('capacity_exhausted');
  expect(mockGetIdTokenResult).toHaveBeenCalledTimes(8);

  pending.forEach(({ uid, settle }) => settle(authResult(uid)));
  await expect(Promise.all(oldWarms)).resolves.toEqual(Array(8).fill('stale'));
  expect(mockGetAppCheckToken).not.toHaveBeenCalled();
});

test('near-expiry and mismatched Auth expiration fail before App Check', async () => {
  const account = captureAccountGeneration();
  mockGetIdTokenResult.mockResolvedValue(authResult('firebase-auth-warm', NOW + 119_000));
  await expect(withBackgroundNetworkLease('completion.credentials_test', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(account, lease),
  )).resolves.toBe('unavailable');
  expect(mockGetAppCheckToken).not.toHaveBeenCalled();

  mockGetIdTokenResult.mockResolvedValue({
    ...authResult('firebase-auth-warm'),
    expirationTime: new Date(EXP_MS + 60_000).toISOString(),
  });
  await expect(withBackgroundNetworkLease('completion.credentials_test', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(account, lease),
  )).resolves.toBe('unavailable');
  expect(mockGetAppCheckToken).not.toHaveBeenCalled();
});

test('hostile native accessors are never executed and malformed claims fail closed', async () => {
  const account = captureAccountGeneration();
  let getterCalls = 0;
  const hostileAuth = {};
  Object.defineProperty(hostileAuth, 'token', {
    enumerable: true,
    get: () => { getterCalls += 1; return authResult('firebase-auth-warm').token; },
  });
  Object.defineProperty(hostileAuth, 'expirationTime', {
    enumerable: true,
    get: () => { getterCalls += 1; return new Date(EXP_MS).toISOString(); },
  });
  mockGetIdTokenResult.mockResolvedValue(hostileAuth);
  await expect(withBackgroundNetworkLease('completion.credentials_test', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(account, lease),
  )).resolves.toBe('unavailable');
  expect(getterCalls).toBe(0);
  expect(mockGetAppCheckToken).not.toHaveBeenCalled();

  mockGetIdTokenResult.mockResolvedValue({
    token: jwt({
      aud: 'foreign-project',
      iss: 'https://securetoken.google.com/phraseman-ea0b3',
      sub: 'firebase-auth-warm',
      exp: EXP_MS / 1_000,
    }),
    expirationTime: new Date(EXP_MS).toISOString(),
  });
  await expect(withBackgroundNetworkLease('completion.credentials_test', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(account, lease),
  )).resolves.toBe('unavailable');
  expect(mockGetAppCheckToken).not.toHaveBeenCalled();
});

test.each([
  ['fractional', (NOW + 600_000) / 1_000 + 0.5],
  ['too soon', (NOW + 119_000) / 1_000],
  ['too far', (NOW + 9 * 24 * 60 * 60 * 1_000) / 1_000],
] as const)('rejects %s App Check expiration without replacing credentials', async (_label, exp) => {
  const account = captureAccountGeneration();
  mockGetAppCheckToken.mockResolvedValue({ token: jwt({ exp }) });
  await expect(withBackgroundNetworkLease('completion.credentials_test', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(account, lease),
  )).resolves.toBe('unavailable');
  expect(peekLearningV2CompletionCredentialHandle(account)).toBeNull();
});
