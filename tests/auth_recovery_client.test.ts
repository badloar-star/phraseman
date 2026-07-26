const mockCallableInvoke = jest.fn<Promise<{ data: unknown }>, [string, unknown]>();
let mockCurrentAuthUid: string | null = 'provider-a';
const mockHttpsCallable = jest.fn(
  (_functions: unknown, name: string) => (payload: unknown) => mockCallableInvoke(name, payload),
);

jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: true,
  IS_EXPO_GO: false,
  IS_STORE_RELEASE: false,
}));
jest.mock('../app/app_check_init', () => ({
  initFirebaseAppCheckIfAvailable: jest.fn(async () => true),
}));
jest.mock('../app/user_id_policy', () => ({
  clearArenaAuthUidCache: jest.fn(),
  getAuthUserId: () => mockCurrentAuthUid,
  getCanonicalUserId: jest.fn(async () => 'stable-1'),
}));
jest.mock('../app/account_delete_quarantine', () => ({
  isAccountDeleteIdentityQuarantined: jest.fn(async () => false),
  isAccountDeleteIdentityQuarantinedFromKnownState: jest.fn(() => false),
}));
jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => ({
    get currentUser() {
      return mockCurrentAuthUid ? { uid: mockCurrentAuthUid } : null;
    },
  }),
}));
jest.mock('@react-native-firebase/functions', () => ({
  __esModule: true,
  getFunctions: jest.fn(() => ({ region: 'us-central1' })),
  httpsCallable: mockHttpsCallable,
}));

describe('auth recovery client callables', () => {
  beforeEach(() => {
    mockCallableInvoke.mockReset();
    mockHttpsCallable.mockClear();
    mockCurrentAuthUid = 'provider-a';
  });

  it('requests a recovery code through the exact server callable and returns its contract', async () => {
    const response = {
      ok: true,
      maskedEmail: 'use***@example.com',
      expiresInSec: 600,
      provider: 'google' as const,
    };
    mockCallableInvoke.mockResolvedValueOnce({ data: response });
    const { requestAuthRecoveryCode } = require('../app/cloud_sync') as typeof import('../app/cloud_sync');

    await expect(requestAuthRecoveryCode('  stable-1  ')).resolves.toEqual(response);
    expect(mockCallableInvoke).toHaveBeenCalledWith('authRequestRecoveryCode', {
      stableId: 'stable-1',
    });
  });

  it('confirms a recovery code through the exact server callable and trims its payload', async () => {
    const response = {
      ok: true,
      stableId: 'stable-1',
      recoveryEventId: 'event-1',
      handoffEligibleUntil: Date.now() + 60_000,
    };
    mockCallableInvoke.mockResolvedValueOnce({ data: response });
    const { confirmAuthRecoveryCode } = require('../app/cloud_sync') as typeof import('../app/cloud_sync');

    await expect(confirmAuthRecoveryCode(' stable-1 ', ' 123456 ')).resolves.toEqual(response);
    expect(mockCallableInvoke).toHaveBeenCalledWith('authConfirmRecoveryCode', {
      stableId: 'stable-1',
      code: '123456',
    });
  });

  it('preserves the original Firebase HttpsError code for recovery UI decisions', async () => {
    const rateLimited = {
      code: 'functions/resource-exhausted',
      message: 'recovery_rate_limited',
    };
    mockCallableInvoke.mockRejectedValueOnce(rateLimited);
    const { requestAuthRecoveryCode } = require('../app/cloud_sync') as typeof import('../app/cloud_sync');

    await expect(requestAuthRecoveryCode('stable-1')).rejects.toBe(rateLimited);
  });

  it.each([
    ['request', (cloudSync: typeof import('../app/cloud_sync')) => cloudSync.requestAuthRecoveryCode('stable-1')],
    ['confirm', (cloudSync: typeof import('../app/cloud_sync')) => cloudSync.confirmAuthRecoveryCode('stable-1', '123456')],
  ] as const)('rejects %s success when the Firebase auth session changes during the callable', async (_name, invoke) => {
    let resolveCallable!: (value: { data: unknown }) => void;
    mockCallableInvoke.mockImplementationOnce(() => new Promise((resolve) => {
      resolveCallable = resolve;
    }));
    const cloudSync = require('../app/cloud_sync') as typeof import('../app/cloud_sync');

    const pending = invoke(cloudSync);
    for (let i = 0; i < 10 && mockCallableInvoke.mock.calls.length === 0; i += 1) {
      await Promise.resolve();
    }
    mockCurrentAuthUid = 'provider-b';
    resolveCallable({
      data: _name === 'request'
        ? { ok: true, maskedEmail: 'use***@example.com', expiresInSec: 600, provider: 'google' }
        : {
          ok: true,
          stableId: 'stable-1',
          recoveryEventId: 'event-1',
          handoffEligibleUntil: Date.now() + 60_000,
        },
    });

    await expect(pending).rejects.toMatchObject({
      name: 'AuthSessionChangedError',
      code: 'auth_session_changed',
    });
  });

  it('completes a handoff through the exact default-auth callable contract', async () => {
    mockCallableInvoke.mockResolvedValueOnce({ data: {
      ok: true,
      recoveryEventId: 'event-1',
      completed: true,
    } });
    const { completeAuthRecoveryHandoffViaServer } = require('../app/cloud_sync') as typeof import('../app/cloud_sync');

    await expect(completeAuthRecoveryHandoffViaServer(' event-1 ')).resolves.toEqual({
      ok: true,
      recoveryEventId: 'event-1',
      completed: true,
    });
    expect(mockCallableInvoke).toHaveBeenCalledWith('authCompleteRecoveryHandoff', {
      recoveryEventId: 'event-1',
    });
  });

  it('rejects malformed ack success and default-auth UID drift', async () => {
    const { completeAuthRecoveryHandoffViaServer } = require('../app/cloud_sync') as typeof import('../app/cloud_sync');
    mockCallableInvoke.mockResolvedValueOnce({ data: {
      ok: true,
      recoveryEventId: 'different-event',
      completed: true,
    } });
    await expect(completeAuthRecoveryHandoffViaServer('event-1'))
      .rejects.toThrow('auth_recovery_handoff_response_invalid');

    mockCallableInvoke.mockImplementationOnce(async () => {
      mockCurrentAuthUid = 'provider-b';
      return { data: { ok: true, recoveryEventId: 'event-1', completed: true } };
    });
    await expect(completeAuthRecoveryHandoffViaServer('event-1'))
      .rejects.toMatchObject({ name: 'AuthSessionChangedError', code: 'auth_session_changed' });
  });

  it.each([
    ['request', { ok: true, maskedEmail: '', expiresInSec: 600, provider: 'google' }],
    ['request', { ok: true, maskedEmail: 'u***@x.com', expiresInSec: 0, provider: 'google' }],
    ['request', { ok: true, maskedEmail: 'u***@x.com', expiresInSec: 600, provider: 'github' }],
    ['confirm', { ok: true, stableId: 'other-stable', recoveryEventId: 'event-1', handoffEligibleUntil: Date.now() + 60_000 }],
    ['confirm', { ok: true, stableId: 'stable-1', recoveryEventId: 'bad/event', handoffEligibleUntil: Date.now() + 60_000 }],
    ['confirm', { ok: true, stableId: 'stable-1', recoveryEventId: 'event-1', handoffEligibleUntil: 1 }],
  ] as const)('rejects malformed legacy %s success response', async (kind, data) => {
    mockCallableInvoke.mockResolvedValueOnce({ data });
    const cloudSync = require('../app/cloud_sync') as typeof import('../app/cloud_sync');
    const operation = kind === 'request'
      ? cloudSync.requestAuthRecoveryCode('stable-1')
      : cloudSync.confirmAuthRecoveryCode('stable-1', '123456');
    await expect(operation).rejects.toThrow(`auth_recovery_${kind}_response_invalid`);
  });
});
