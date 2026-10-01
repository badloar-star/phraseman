import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';
import {
  __resetInteractiveNetworkQuietForTests,
  beginInteractiveNetworkQuiet,
  releaseInteractiveNetworkQuiet,
} from '../app/interactive_network_quiet';
import { attemptLearningV2CompletionCredentialAdmission } from
  '../app/learning_v2_completion_credential_admission';
import { clearLearningV2CompletionCredentialCache } from
  '../app/learning_v2_completion_credential_cache';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));

const mockAuthState: { currentUser: { uid: string } | null } = { currentUser: null };
const mockGetIdTokenResult = jest.fn();
jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => mockAuthState,
  getIdTokenResult: (...args: unknown[]) => mockGetIdTokenResult(...args),
}));
jest.mock('@react-native-firebase/app', () => ({
  getApp: () => ({ options: { projectId: 'phraseman-ea0b3' } }),
}));

const NOW = 1_000_000;
const EXP_MS = NOW + 600_000;
const jwt = (payload: Record<string, unknown>) => [
  Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url'),
  Buffer.from(JSON.stringify(payload)).toString('base64url'),
  'signature',
].join('.');

beforeEach(() => {
  __resetInteractiveNetworkQuietForTests();
  __resetAccountGenerationForTests();
  clearLearningV2CompletionCredentialCache();
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
  const uid = 'firebase-admission-user';
  mockAuthState.currentUser = { uid };
  mockGetIdTokenResult.mockReset().mockResolvedValue({
    token: jwt({
      aud: 'phraseman-ea0b3',
      iss: 'https://securetoken.google.com/phraseman-ea0b3',
      sub: uid,
      exp: EXP_MS / 1_000,
    }),
    expirationTime: new Date(EXP_MS).toISOString(),
  });
  beginAccountGeneration('stable-admission-user');
});

afterEach(() => jest.restoreAllMocks());

test('publishes once and a later admission is a zero-native ready hit', async () => {
  await expect(attemptLearningV2CompletionCredentialAdmission()).resolves.toBe('published');
  await expect(attemptLearningV2CompletionCredentialAdmission()).resolves.toBe('ready');
  expect(mockGetIdTokenResult).toHaveBeenCalledTimes(1);
  expect(mockGetIdTokenResult).toHaveBeenCalledWith(mockAuthState.currentUser, false);
});

test('interactive quiet defers admission and starts zero native token work', async () => {
  const quiet = beginInteractiveNetworkQuiet();
  await expect(attemptLearningV2CompletionCredentialAdmission()).resolves.toBe('deferred');
  expect(mockGetIdTokenResult).not.toHaveBeenCalled();
  releaseInteractiveNetworkQuiet(quiet);
  await Promise.resolve();
});
