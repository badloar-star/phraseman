import {
  beginAccountGeneration,
  captureAccountGeneration,
} from '../app/account_generation';
import { withBackgroundNetworkLease } from '../app/interactive_network_quiet';
import {
  attemptWarmLearningV2CompletionCredentialsCachePreferred,
  clearLearningV2CompletionCredentialHandleIfCurrent,
  learningV2CompletionCredentialCacheState,
  peekLearningV2CompletionCredentialHandle,
} from '../app/learning_v2_completion_credential_cache';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));

const mockAuthState: { currentUser: { uid: string } | null } = { currentUser: null };
const mockGetIdTokenResult = jest.fn();
const mockGetAppCheckToken = jest.fn();
const mockAppCheckReady = { value: true };

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
  getApp: () => ({ options: { projectId: 'phraseman-ea0b3' } }),
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

let authToken = '';
let appCheckToken = '';

const configureNativePair = (uid: string) => {
  authToken = jwt({
    aud: 'phraseman-ea0b3',
    iss: 'https://securetoken.google.com/phraseman-ea0b3',
    sub: uid,
    exp: EXP_MS / 1_000,
  });
  appCheckToken = jwt({ exp: EXP_MS / 1_000 });
  mockAuthState.currentUser = { uid };
  mockGetIdTokenResult.mockResolvedValue({
    token: authToken,
    expirationTime: new Date(EXP_MS).toISOString(),
  });
  mockGetAppCheckToken.mockResolvedValue({ token: appCheckToken });
};

const warmPair = async (stableId: string) => {
  const account = captureAccountGeneration();
  expect(account.stableId).toBe(stableId);
  await expect(withBackgroundNetworkLease('completion.credentials_test', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(account, lease),
  )).resolves.toBe('published');
  const handle = peekLearningV2CompletionCredentialHandle(account);
  expect(handle).not.toBeNull();
  return { account, handle: handle! };
};

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
  mockGetIdTokenResult.mockReset();
  mockGetAppCheckToken.mockReset();
  mockAppCheckReady.value = true;
});

afterEach(() => jest.restoreAllMocks());

test('publishes one opaque memory-only credential pair', async () => {
  configureNativePair('firebase-auth-a');
  beginAccountGeneration('credential-user-a');
  const { account, handle } = await warmPair('credential-user-a');
  expect(peekLearningV2CompletionCredentialHandle(account)).toBe(handle);
  expect(Reflect.ownKeys(handle)).toEqual([]);
  expect(JSON.stringify(handle)).toBe('{}');
  expect({ ...handle }).toEqual({});
  expect(learningV2CompletionCredentialCacheState()).toMatchObject({
    hasCredentialPair: true,
  });
  expect(JSON.stringify(learningV2CompletionCredentialCacheState())).not.toContain(authToken);
  expect(JSON.stringify(learningV2CompletionCredentialCacheState())).not.toContain(appCheckToken);
  expect(mockGetIdTokenResult).toHaveBeenCalledWith(mockAuthState.currentUser, false);
  expect(mockGetAppCheckToken).toHaveBeenCalledWith(false);
});

test('account switch clears tokens and makes a detached old handle unusable', async () => {
  configureNativePair('firebase-auth-b');
  beginAccountGeneration('credential-user-b');
  const { handle: oldHandle } = await warmPair('credential-user-b');
  const oldEpoch = learningV2CompletionCredentialCacheState().epoch;
  const current = beginAccountGeneration('credential-user-c');
  expect(learningV2CompletionCredentialCacheState()).toMatchObject({
    hasCredentialPair: false,
    epoch: oldEpoch + 1,
  });
  expect(Reflect.ownKeys(oldHandle)).toEqual([]);
  expect(peekLearningV2CompletionCredentialHandle(current)).toBeNull();
});

test('a late rejection cannot clear a newer credential pair', async () => {
  configureNativePair('firebase-auth-current');
  beginAccountGeneration('credential-user-current');
  const { account, handle: oldHandle } = await warmPair('credential-user-current');
  const { handle: refreshedHandle } = await warmPair('credential-user-current');

  expect(refreshedHandle).not.toBe(oldHandle);
  expect(clearLearningV2CompletionCredentialHandleIfCurrent(oldHandle)).toBe(false);
  expect(peekLearningV2CompletionCredentialHandle(account)).toBe(refreshedHandle);
  expect(clearLearningV2CompletionCredentialHandleIfCurrent(refreshedHandle)).toBe(true);
  expect(peekLearningV2CompletionCredentialHandle(account)).toBeNull();
});

test('late old account and forged account capability fail without native calls or traps', async () => {
  configureNativePair('firebase-auth-d');
  const oldAccount = beginAccountGeneration('credential-user-d');
  beginAccountGeneration('credential-user-e');
  await expect(withBackgroundNetworkLease('completion.credentials_test', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(oldAccount, lease),
  )).resolves.toBe('unavailable');

  const account = beginAccountGeneration('credential-user-f');
  let getterCalls = 0;
  const forgedAccount = new Proxy(account, {
    get: (target, key, receiver) => {
      getterCalls += 1;
      return Reflect.get(target, key, receiver);
    },
  });
  await expect(withBackgroundNetworkLease('completion.credentials_test', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(forgedAccount, lease),
  )).resolves.toBe('unavailable');
  expect(getterCalls).toBe(0);
  expect(mockGetIdTokenResult).not.toHaveBeenCalled();
  expect(mockGetAppCheckToken).not.toHaveBeenCalled();
  expect(learningV2CompletionCredentialCacheState()).toMatchObject({ hasCredentialPair: false });
});
