import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __cloudSyncTestHooks,
  ensureStableAuthLinkForStableIdDetailed,
} from '../app/cloud_sync';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  captureAccountGeneration,
} from '../app/account_generation';

const mockCallable = jest.fn(async () => ({
  data: { ok: true, stableUid: 'stable-a', authUid: 'provider-a', identityReady: true },
}));
const mockSetStableId = jest.fn<Promise<void>, [string]>(async () => undefined);

jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false, IS_STORE_RELEASE: false }));
jest.mock('../app/app_check_init', () => ({ initFirebaseAppCheckIfAvailable: jest.fn(async () => true) }));
jest.mock('../app/user_id_policy', () => ({
  getAuthUserId: jest.fn(() => 'provider-a'),
  getCanonicalUserId: jest.fn(async () => 'stable-a'),
}));
jest.mock('../app/stable_id', () => ({ setStableId: (stableId: string) => mockSetStableId(stableId) }));
jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => ({ currentUser: { uid: 'provider-a', isAnonymous: false } }),
}));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => mockCallable),
}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage> & { __reset?: () => void };

describe('cloud sync identity anchor', () => {
  beforeEach(() => {
    storage.__reset?.();
    jest.clearAllMocks();
    __resetAccountGenerationForTests();
    beginAccountGeneration('stable-a');
  });

  it('bypasses a fresh local cache when authoritative confirmation is required', async () => {
    await ensureStableAuthLinkForStableIdDetailed('stable-a');
    await ensureStableAuthLinkForStableIdDetailed('stable-a', undefined, { requireAuthoritative: true });

    expect(mockCallable).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['identity_retired', 'identity_retired'],
    ['account_delete_pending', 'identity_retired'],
  ])('classifies failed-precondition %s as %s', (message, expected) => {
    expect(__cloudSyncTestHooks.classifyCloudAccessFailure({
      code: 'functions/failed-precondition',
      message,
    }, true)).toBe(expected);
  });

  it('opens the authoritative identity gate only when the server confirms identityReady', async () => {
    await expect(ensureStableAuthLinkForStableIdDetailed(
      'stable-a',
      undefined,
      { requireAuthoritative: true },
    )).resolves.toMatchObject({ ok: true, source: 'callable' });

    mockCallable.mockResolvedValueOnce({
      data: { ok: true, stableUid: 'stable-a', authUid: 'provider-a' },
    } as any);
    await expect(ensureStableAuthLinkForStableIdDetailed(
      'stable-a',
      undefined,
      { requireAuthoritative: true },
    )).resolves.toMatchObject({
      ok: false,
      source: 'callable',
      failure: 'identity_unavailable',
    });
  });

  it('wipes account-scoped storage before adopting a different server canonical id', async () => {
    await AsyncStorage.setItem('user_total_xp', '999999999');

    await expect(
      __cloudSyncTestHooks.adoptAuthoritativeStableIdentity('stable-a', 'stable-b'),
    ).resolves.toBe(true);

    expect(await AsyncStorage.getItem('user_total_xp')).toBeNull();
    expect(mockSetStableId).toHaveBeenCalledWith('stable-b');
    expect(captureAccountGeneration()).toMatchObject({ stableId: 'stable-b', phase: 'active' });
  });
});
