const mockGetCanonicalUserId = jest.fn(async () => 'new-stable-id');
const mockGetAuthUserId = jest.fn(() => 'provider-uid-1');
const mockSignInAnonymously = jest.fn(async () => ({ user: { uid: 'anon-uid-2', isAnonymous: true } }));
const mockFirestoreSet = jest.fn(async () => undefined);
const mockFirestoreCollection = jest.fn(() => ({
  doc: jest.fn(() => ({ set: mockFirestoreSet })),
}));
const mockCallable = jest.fn(async () => ({ data: { ok: true, stableUid: 'new-stable-id', authUid: 'provider-uid-1' } }));
const mockHttpsCallable = jest.fn((..._args: unknown[]) => mockCallable);

const mockAuth: {
  currentUser: { uid: string; isAnonymous: boolean } | null;
  signInAnonymously: typeof mockSignInAnonymously;
} = {
  currentUser: { uid: 'provider-uid-1', isAnonymous: false },
  signInAnonymously: mockSignInAnonymously,
};

jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false, IS_STORE_RELEASE: false }));
jest.mock('../app/app_check_init', () => ({ initFirebaseAppCheckIfAvailable: jest.fn(async () => true) }));
jest.mock('../app/daily_tasks', () => ({
  getTodayKey: jest.fn(() => '2026-07-18'),
  getTodayTasksSafe: jest.fn(async () => []),
  loadTodayProgress: jest.fn(async () => undefined),
}));
jest.mock('../app/user_id_policy', () => ({
  clearArenaAuthUidCache: jest.fn(),
  getAuthUserId: () => mockGetAuthUserId(),
  getCanonicalUserId: () => mockGetCanonicalUserId(),
}));
jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => mockAuth,
}));
jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: () => ({ collection: mockFirestoreCollection }),
  FieldValue: { serverTimestamp: jest.fn(), increment: jest.fn() },
}));
jest.mock('@react-native-firebase/functions', () => ({
  __esModule: true,
  getFunctions: jest.fn(() => ({})),
  httpsCallable: mockHttpsCallable,
}));

describe('pending account-deletion quarantine after process restart', () => {
  beforeEach(() => {
    jest.resetModules();
    mockGetCanonicalUserId.mockClear();
    mockGetAuthUserId.mockClear();
    mockSignInAnonymously.mockClear();
    mockFirestoreSet.mockClear();
    mockFirestoreCollection.mockClear();
    mockCallable.mockClear();
    mockHttpsCallable.mockClear();
    mockAuth.currentUser = { uid: 'provider-uid-1', isAnonymous: false };
  });

  it('blocks identity generation, anonymous binding, stable-link calls, and sync writes for the still-signed-in deleted provider', async () => {
    // Fresh module load after the pending record exists models an app restart.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const storage = require('@react-native-async-storage/async-storage');
    storage.__reset();
    await storage.setItem('account_delete_pending_auth_v1', JSON.stringify({
      providerUid: 'provider-uid-1',
      stableId: 'deleted-stable-id',
      createdAt: Date.now() - 1_000,
      expiresAt: Date.now() + 60_000,
    }));
    let cloudSync: typeof import('../app/cloud_sync');
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      cloudSync = require('../app/cloud_sync') as typeof import('../app/cloud_sync');
    } catch (error) {
      throw new Error(`cloud_sync fresh load failed: ${String(error)}`);
    }

    const anonResult = await cloudSync.ensureAnonUser();
    expect(anonResult).toBeNull();
    const stableLinkResult = await cloudSync.ensureStableAuthLinkForStableIdDetailed('new-stable-id');
    expect(stableLinkResult).toMatchObject({
      ok: false,
      failure: 'identity_unavailable',
    });
    const mergeResult = await cloudSync.mergeStableAccountsViaServer('deleted-stable-id', 'new-stable-id');
    await cloudSync.deleteCloudData();
    await cloudSync.saveAccountSwitchEmergencyBackup('quarantined_restart');
    await cloudSync.syncToCloud({ forceNow: true });

    expect(mergeResult).toBeNull();
    expect(mockGetCanonicalUserId).not.toHaveBeenCalled();
    expect(mockSignInAnonymously).not.toHaveBeenCalled();
    expect(mockHttpsCallable).not.toHaveBeenCalled();
    expect(mockFirestoreSet).not.toHaveBeenCalled();
  });

  it.each([
    ['signed out', null],
    ['anonymous', { uid: 'anon-uid-2', isAnonymous: true }],
  ])('prepared guard blocks identity resurrection after restart while auth is %s', async (_case, currentUser) => {
    const storage = require('@react-native-async-storage/async-storage');
    storage.__reset();
    mockAuth.currentUser = currentUser;
    await storage.setItem('account_delete_pending_auth_v1', JSON.stringify({
      providerUid: 'provider-uid-1',
      stableId: 'deleted-stable-id',
      phase: 'prepared',
      createdAt: Date.now() - 1_000,
      expiresAt: Date.now() + 60_000,
    }));
    const cloudSync = require('../app/cloud_sync') as typeof import('../app/cloud_sync');

    await expect(cloudSync.ensureAnonUser()).resolves.toBeNull();

    expect(mockGetCanonicalUserId).not.toHaveBeenCalled();
    expect(mockSignInAnonymously).not.toHaveBeenCalled();
    expect(mockHttpsCallable).not.toHaveBeenCalled();
  });
});
