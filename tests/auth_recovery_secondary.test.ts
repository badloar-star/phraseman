const mockDefaultApp = {
  name: '[DEFAULT]',
  options: {
    apiKey: 'api-key',
    appId: 'app-id',
    projectId: 'project-id',
    messagingSenderId: 'sender-id',
    storageBucket: 'bucket',
  } as Record<string, unknown>,
};
const mockSecondaryApp = { name: 'phraseman-auth-recovery-secondary', options: {} };
const mockStaleApp = { name: 'phraseman-auth-recovery-secondary', options: {} };
const mockDefaultAuth = { currentUser: { uid: 'default-anon-uid' } };
const mockSecondaryAuth = { currentUser: null as null | { uid: string } };
const mockStaleAuth = { currentUser: { uid: 'stale-secondary-uid' } };
const mockFunctions = { owner: mockSecondaryApp, region: 'us-central1' };
const mockEvents: string[] = [];
let mockApps: any[] = [mockDefaultApp, mockStaleApp];

const mockInitializeApp = jest.fn(async (options: unknown, name: string) => {
  mockEvents.push(`initialize:${name}`);
  mockSecondaryApp.options = options as Record<string, unknown>;
  mockApps = [mockDefaultApp, mockSecondaryApp];
  return mockSecondaryApp;
});
const mockDeleteApp = jest.fn(async (app: any) => {
  mockEvents.push(`delete:${app === mockStaleApp ? 'stale' : 'secondary'}`);
  mockApps = mockApps.filter(candidate => candidate !== app);
});

jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(() => mockDefaultApp),
  getApps: jest.fn(() => mockApps),
  initializeApp: (options: unknown, name: string) => mockInitializeApp(options, name),
  deleteApp: (app: unknown) => mockDeleteApp(app),
}), { virtual: true });

const mockGetAuth = jest.fn((app: any) => {
  if (app === mockDefaultApp) return mockDefaultAuth;
  if (app === mockStaleApp) return mockStaleAuth;
  if (app === mockSecondaryApp) return mockSecondaryAuth;
  throw new Error('auth_called_without_known_app');
});
const mockSignOut = jest.fn(async (auth: any) => {
  mockEvents.push(`signout:${auth === mockStaleAuth ? 'stale' : 'secondary'}`);
  auth.currentUser = null;
});
const mockGoogleCredential = { kind: 'google-credential' };
const mockAppleCredential = { kind: 'apple-credential' };
const mockGoogleNativeCredential = {
  idToken: 'google-token',
  email: 'verified@example.com',
  displayName: 'Verified User',
};
const mockCustomToken = `${'a'.repeat(40)}.${'b'.repeat(40)}.${'c'.repeat(40)}`;
const mockGoogleCredentialFactory = jest.fn((_token: unknown) => mockGoogleCredential);
const mockAppleCredentialFactory = jest.fn((_token: unknown, _nonce: unknown) => mockAppleCredential);
const mockSignInWithCredential = jest.fn(async (auth: any, credential: unknown) => {
  if (auth !== mockSecondaryAuth) throw new Error('default_auth_mutation_attempt');
  mockEvents.push('signin:secondary');
  const user = { uid: 'verified-provider-uid' };
  auth.currentUser = user;
  return { user, credential };
});
let mockClaims: Record<string, unknown> = {
  firebase: { sign_in_provider: 'google.com' },
  email_verified: true,
};
const mockGetIdTokenResult = jest.fn(async (_user: unknown, _forceRefresh: boolean) => ({ claims: mockClaims }));

jest.mock('@react-native-firebase/auth', () => ({
  default: {
    GoogleAuthProvider: { credential: (token: unknown) => mockGoogleCredentialFactory(token) },
    AppleAuthProvider: {
      credential: (token: unknown, nonce: unknown) => mockAppleCredentialFactory(token, nonce),
    },
  },
  getAuth: (app: unknown) => mockGetAuth(app),
  signOut: (auth: unknown) => mockSignOut(auth),
  signInWithCredential: (auth: unknown, credential: unknown) => mockSignInWithCredential(auth, credential),
  getIdTokenResult: (user: unknown, forceRefresh: boolean) => mockGetIdTokenResult(user, forceRefresh),
}), { virtual: true });

const mockProviderConfigure = jest.fn();
class MockAppCheckProvider {
  configure(options: unknown): void {
    mockProviderConfigure(options);
  }
}
const mockAppCheckInstance = { owner: mockSecondaryApp };
const mockInitializeAppCheck = jest.fn(async (app: unknown, _options: unknown) => {
  if (app !== mockSecondaryApp) throw new Error('appcheck_not_secondary');
  return mockAppCheckInstance;
});
let mockAppCheckToken = `${'a'.repeat(40)}.${'b'.repeat(40)}.${'c'.repeat(40)}`;
const mockGetAppCheckToken = jest.fn(async (_appCheck: unknown, _forceRefresh: boolean) => ({ token: mockAppCheckToken }));
const mockSetAppCheckAutoRefresh = jest.fn();
jest.mock('@react-native-firebase/app-check', () => ({
  ReactNativeFirebaseAppCheckProvider: MockAppCheckProvider,
  initializeAppCheck: (app: unknown, options: unknown) => mockInitializeAppCheck(app, options),
  getToken: (appCheck: unknown, forceRefresh: boolean) => mockGetAppCheckToken(appCheck, forceRefresh),
  setTokenAutoRefreshEnabled: (appCheck: unknown, enabled: boolean) => (
    mockSetAppCheckAutoRefresh(appCheck, enabled)
  ),
}), { virtual: true });

const mockGetFunctions = jest.fn((app: unknown, region: string) => {
  if (app !== mockSecondaryApp) throw new Error('functions_not_secondary');
  return mockFunctions;
});
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: (app: unknown, region: string) => mockGetFunctions(app, region),
}), { virtual: true });

jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: true,
  IS_EXPO_GO: false,
  IS_STORE_RELEASE: true,
}));

import {
  SECONDARY_AUTH_RECOVERY_APP_NAME,
  SECONDARY_AUTH_RECOVERY_DATABASE_URL,
  startSecondaryAuthRecoverySession,
} from '../app/auth_recovery_secondary';

describe('secondary Firebase auth recovery session foundation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEvents.length = 0;
    mockApps = [mockDefaultApp, mockStaleApp];
    mockDefaultAuth.currentUser = { uid: 'default-anon-uid' };
    mockSecondaryAuth.currentUser = null;
    mockStaleAuth.currentUser = { uid: 'stale-secondary-uid' };
    mockDefaultApp.options = {
      apiKey: 'api-key',
      appId: 'app-id',
      projectId: 'project-id',
      messagingSenderId: 'sender-id',
      storageBucket: 'bucket',
    };
    mockClaims = {
      firebase: { sign_in_provider: 'google.com' },
      email_verified: true,
    };
    mockAppCheckToken = `${'a'.repeat(40)}.${'b'.repeat(40)}.${'c'.repeat(40)}`;
  });

  it('starts only a fixed named secondary Auth/AppCheck/Functions session', async () => {
    const acquireCredential = jest.fn(async () => ({
      idToken: 'google-token', email: 'verified@example.com', displayName: 'Verified User',
    }));

    const result = await startSecondaryAuthRecoverySession('google', acquireCredential);

    expect(result.result).toBe('ready');
    if (result.result !== 'ready') throw new Error('expected_ready');
    expect(result.session).toEqual(expect.objectContaining({
      authUid: 'verified-provider-uid', provider: 'google', functions: mockFunctions,
    }));
    expect(SECONDARY_AUTH_RECOVERY_APP_NAME).toBe('phraseman-auth-recovery-secondary');
    expect(SECONDARY_AUTH_RECOVERY_DATABASE_URL).toMatch(/^https:\/\/[^/]+\.invalid$/);
    expect(mockEvents.slice(0, 3)).toEqual([
      'signout:stale', 'delete:stale', `initialize:${SECONDARY_AUTH_RECOVERY_APP_NAME}`,
    ]);
    expect(mockInitializeApp).toHaveBeenCalledWith(expect.objectContaining({
      apiKey: 'api-key', appId: 'app-id', projectId: 'project-id',
      databaseURL: SECONDARY_AUTH_RECOVERY_DATABASE_URL,
    }), SECONDARY_AUTH_RECOVERY_APP_NAME);
    expect(mockInitializeAppCheck).toHaveBeenCalledWith(mockSecondaryApp, expect.any(Object));
    expect(mockSetAppCheckAutoRefresh).toHaveBeenCalledWith(mockAppCheckInstance, true);
    expect(acquireCredential).toHaveBeenCalledTimes(1);
    expect(mockSignInWithCredential).toHaveBeenCalledWith(mockSecondaryAuth, mockGoogleCredential);
    expect(mockGetIdTokenResult).toHaveBeenCalledWith(expect.objectContaining({ uid: 'verified-provider-uid' }), true);
    expect(mockGetFunctions).toHaveBeenCalledWith(mockSecondaryApp, 'us-central1');
    expect(mockDefaultAuth.currentUser?.uid).toBe('default-anon-uid');

    await result.session.cleanup();
    await result.session.cleanup();
    expect(mockEvents.slice(-2)).toEqual(['signout:secondary', 'delete:secondary']);
    expect(mockSignOut).toHaveBeenCalledTimes(2); // stale + one idempotent live cleanup
    expect(mockDeleteApp).toHaveBeenCalledTimes(2);
  });

  it('uses the one acquired Apple token and nonce on secondary Auth', async () => {
    mockClaims = { firebase: { sign_in_provider: 'apple.com' }, email_verified: true };
    const acquireCredential = jest.fn(async () => ({
      idToken: 'apple-token', appleNonce: 'apple-nonce', email: null, displayName: null,
    }));

    const result = await startSecondaryAuthRecoverySession('apple', acquireCredential);

    expect(result.result).toBe('ready');
    expect(acquireCredential).toHaveBeenCalledTimes(1);
    expect(mockAppleCredentialFactory).toHaveBeenCalledWith('apple-token', 'apple-nonce');
    expect(mockSignInWithCredential).toHaveBeenCalledWith(mockSecondaryAuth, mockAppleCredential);
    if (result.result === 'ready') await result.session.cleanup();
  });

  it('returns cancelled and cleans the newly-created secondary app', async () => {
    const acquireCredential = jest.fn(async () => ({ cancelled: true as const }));

    await expect(startSecondaryAuthRecoverySession('google', acquireCredential))
      .resolves.toEqual({ result: 'cancelled' });

    expect(mockSignInWithCredential).not.toHaveBeenCalled();
    expect(mockEvents.slice(-2)).toEqual(['signout:secondary', 'delete:secondary']);
  });

  it.each([
    [{ firebase: { sign_in_provider: 'apple.com' }, email_verified: true }, 'secondary_provider_claim_mismatch'],
    [{ firebase: { sign_in_provider: 'google.com' }, email_verified: false }, 'secondary_email_not_verified'],
    [{ firebase: {} }, 'secondary_provider_claim_mismatch'],
  ])('fails closed for untrusted claims %# and cleans secondary state', async (claims, code) => {
    mockClaims = claims;

    await expect(startSecondaryAuthRecoverySession('google', async () => ({
      idToken: 'google-token', email: null, displayName: null,
    }))).rejects.toThrow(code);

    expect(mockGetFunctions).not.toHaveBeenCalled();
    expect(mockEvents.slice(-2)).toEqual(['signout:secondary', 'delete:secondary']);
  });

  it('fails closed for an invalid per-app App Check token and cleans secondary state', async () => {
    mockAppCheckToken = 'not-a-jwt';

    await expect(startSecondaryAuthRecoverySession('google', async () => ({
      idToken: 'google-token', email: null, displayName: null,
    }))).rejects.toThrow('secondary_app_check_unavailable');

    expect(mockSignInWithCredential).not.toHaveBeenCalled();
    expect(mockEvents.slice(-2)).toEqual(['signout:secondary', 'delete:secondary']);
  });

  it('detects a concurrent default Auth UID change and cleans secondary state', async () => {
    await expect(startSecondaryAuthRecoverySession('google', async () => {
      mockDefaultAuth.currentUser = { uid: 'different-default-uid' };
      return { idToken: 'google-token', email: null, displayName: null };
    })).rejects.toThrow('default_auth_session_changed');

    expect(mockEvents.slice(-2)).toEqual(['signout:secondary', 'delete:secondary']);
  });

  it.each(['apiKey', 'appId', 'projectId', 'messagingSenderId', 'storageBucket'] as const)(
    'rejects missing required Firebase option %s before credential acquisition',
    async missing => {
      delete mockDefaultApp.options[missing];
      const acquireCredential = jest.fn(async () => ({
        idToken: 'google-token', email: null, displayName: null,
      }));

      await expect(startSecondaryAuthRecoverySession('google', acquireCredential))
        .rejects.toThrow(`secondary_firebase_option_missing_${missing}`);

      expect(mockInitializeApp).not.toHaveBeenCalled();
      expect(acquireCredential).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['messagingSenderId', '   '],
    ['storageBucket', 123],
  ])('rejects invalid required Firebase option %s before init', async (key, value) => {
    mockDefaultApp.options[key] = value;
    const acquireCredential = jest.fn(async () => ({
      idToken: 'google-token', email: null, displayName: null,
    }));

    await expect(startSecondaryAuthRecoverySession('google', acquireCredential))
      .rejects.toThrow(`secondary_firebase_option_missing_${key}`);

    expect(mockInitializeApp).not.toHaveBeenCalled();
    expect(acquireCredential).not.toHaveBeenCalled();
  });

  it('holds a module-level reservation through cleanup and rejects concurrent providers', async () => {
    let releaseCredential!: () => void;
    let markCredentialStarted!: () => void;
    const credentialStarted = new Promise<void>((resolve) => {
      markCredentialStarted = resolve;
    });
    const acquireCredential = jest.fn(() => new Promise<any>((resolve) => {
      markCredentialStarted();
      releaseCredential = () => resolve({
        idToken: 'google-token', email: null, displayName: null,
      });
    }));
    const secondAcquire = jest.fn(async () => ({
      idToken: 'apple-token', appleNonce: 'nonce', email: null, displayName: null,
    }));

    const first = startSecondaryAuthRecoverySession('google', acquireCredential);
    await credentialStarted;
    await expect(startSecondaryAuthRecoverySession('apple', secondAcquire))
      .rejects.toThrow('recovery_session_in_progress');
    expect(secondAcquire).not.toHaveBeenCalled();
    expect(mockInitializeApp).toHaveBeenCalledTimes(1);

    releaseCredential();
    const firstResult = await first;
    expect(firstResult.result).toBe('ready');
    await expect(startSecondaryAuthRecoverySession('google', secondAcquire))
      .rejects.toThrow('recovery_session_in_progress');
    expect(secondAcquire).not.toHaveBeenCalled();

    if (firstResult.result === 'ready') await firstResult.session.cleanup();
    mockClaims = { firebase: { sign_in_provider: 'apple.com' }, email_verified: true };
    const afterCleanup = await startSecondaryAuthRecoverySession('apple', secondAcquire);
    expect(afterCleanup.result).toBe('ready');
    expect(secondAcquire).toHaveBeenCalledTimes(1);
    if (afterCleanup.result === 'ready') await afterCleanup.session.cleanup();
  });

  it('uses exact secondary callable names/payloads and validates all response contracts', async () => {
    const callables = {
      authRequestRecoveryCode: jest.fn(async () => ({ data: {
        ok: true, maskedEmail: 'o***@example.invalid', expiresInSec: 600, provider: 'google',
      } })),
      authConfirmRecoveryCode: jest.fn(async () => ({ data: {
        ok: true, stableId: 'stable-1', recoveryEventId: 'event-1', handoffEligibleUntil: 123456,
      } })),
      authRequestCleanInstallRecoveryCode: jest.fn(async () => ({ data: {
        ok: true, challengeId: 'clean_challenge_1234567890', expiresInSec: 600, retryAfterSec: 0,
      } })),
      authConfirmCleanInstallRecoveryCode: jest.fn(async () => ({ data: {
        ok: true, stableId: 'stable-1', recoveryEventId: 'clean-event-1', handoffEligibleUntil: 223456,
      } })),
      authIssueRecoveryHandoffToken: jest.fn(async () => ({ data: {
        ok: true,
        recoveryEventId: 'event-1',
        customToken: mockCustomToken,
        stableId: 'stable-1',
        handoffAcknowledgeUntil: 789012,
      } })),
    };
    const callableFactory = jest.fn((_functions: unknown, name: keyof typeof callables) => callables[name]);
    const result = await startSecondaryAuthRecoverySession(
      'google',
      async () => mockGoogleNativeCredential,
      callableFactory,
    );
    if (result.result !== 'ready') throw new Error('expected_ready');

    await expect(result.session.requestCode('stable-1')).resolves.toEqual({
      maskedEmail: 'o***@example.invalid', expiresInSec: 600, provider: 'google',
    });
    await expect(result.session.confirmCode('stable-1', '123456')).resolves.toEqual({
      stableId: 'stable-1', recoveryEventId: 'event-1', handoffEligibleUntil: 123456,
    });
    await expect(result.session.requestCleanInstallCode(' Owner@Example.com ', 'clean-request-1'))
      .resolves.toEqual({
        challengeId: 'clean_challenge_1234567890', expiresInSec: 600, retryAfterSec: 0,
      });
    await expect(result.session.confirmCleanInstallCode(
      'clean_challenge_1234567890', '123456', 'clean-confirm-1',
    )).resolves.toEqual({
      stableId: 'stable-1', recoveryEventId: 'clean-event-1', handoffEligibleUntil: 223456,
    });
    await expect(result.session.issueHandoffToken('event-1', 'request-1')).resolves.toEqual({
      customToken: mockCustomToken, stableId: 'stable-1', handoffAcknowledgeUntil: 789012,
    });
    expect(callableFactory.mock.calls.map(call => call[1])).toEqual([
      'authRequestRecoveryCode', 'authConfirmRecoveryCode',
      'authRequestCleanInstallRecoveryCode', 'authConfirmCleanInstallRecoveryCode',
      'authIssueRecoveryHandoffToken',
    ]);
    expect(callables.authRequestRecoveryCode).toHaveBeenCalledWith({ stableId: 'stable-1' });
    expect(callables.authConfirmRecoveryCode).toHaveBeenCalledWith({ stableId: 'stable-1', code: '123456' });
    expect(callables.authRequestCleanInstallRecoveryCode).toHaveBeenCalledWith({
      email: 'owner@example.com', clientRequestId: 'clean-request-1',
    });
    expect(callables.authConfirmCleanInstallRecoveryCode).toHaveBeenCalledWith({
      challengeId: 'clean_challenge_1234567890', code: '123456', clientRequestId: 'clean-confirm-1',
    });
    expect(callables.authIssueRecoveryHandoffToken).toHaveBeenCalledWith({
      recoveryEventId: 'event-1', requestId: 'request-1',
    });
    expect(JSON.stringify(mockEvents)).not.toContain(mockCustomToken);
    expect(JSON.stringify(mockSecondaryApp.options)).not.toContain(mockCustomToken);
    await result.session.cleanup();
  });

  it('rejects extra fields in clean-install callable responses without changing legacy contracts', async () => {
    const request = jest.fn(async () => ({ data: {
      ok: true,
      challengeId: 'clean_challenge_1234567890',
      expiresInSec: 600,
      retryAfterSec: 0,
      maskedEmail: 'must-not-enumerate@example.invalid',
    } }));
    const confirm = jest.fn(async () => ({ data: {
      ok: true,
      stableId: 'stable-1',
      recoveryEventId: 'clean-event-1',
      handoffEligibleUntil: 223456,
      email: 'must-not-enumerate@example.invalid',
    } }));
    const factory = jest.fn((_functions: unknown, name: string) => (
      name === 'authRequestCleanInstallRecoveryCode' ? request : confirm
    ));
    const result = await startSecondaryAuthRecoverySession(
      'google', async () => mockGoogleNativeCredential, factory,
    );
    if (result.result !== 'ready') throw new Error('expected_ready');

    await expect(result.session.requestCleanInstallCode(
      'owner@example.invalid', 'clean-request-1',
    )).rejects.toThrow('secondary_recovery_response_invalid');
    await expect(result.session.confirmCleanInstallCode(
      'clean_challenge_1234567890', '123456', 'clean-confirm-1',
    )).rejects.toThrow('secondary_recovery_response_invalid');
    await result.session.cleanup();
  });

  it('rejects duplicate calls while one callable is in flight', async () => {
    let release!: () => void;
    const requestCallable = jest.fn(() => new Promise<any>((resolve) => {
      release = () => resolve({ data: {
        ok: true, maskedEmail: 'o***@x.invalid', expiresInSec: 600, provider: 'google',
      } });
    }));
    const factory = jest.fn((_functions: unknown, name: string) => (
      name === 'authRequestRecoveryCode' ? requestCallable : jest.fn()
    ));
    const result = await startSecondaryAuthRecoverySession(
      'google', async () => mockGoogleNativeCredential, factory,
    );
    if (result.result !== 'ready') throw new Error('expected_ready');

    const first = result.session.requestCode('stable-1');
    await Promise.resolve();
    await expect(result.session.confirmCode('stable-1', '123456'))
      .rejects.toThrow('recovery_session_call_in_progress');
    release();
    await first;
    await result.session.cleanup();
  });

  it('rejects UID or provider drift after a callable await', async () => {
    const driftingCallable = jest.fn(async () => {
      mockSecondaryAuth.currentUser = { uid: 'different-secondary-uid' };
      mockClaims = { firebase: { sign_in_provider: 'apple.com' }, email_verified: true };
      return { data: {
        ok: true, maskedEmail: 'o***@x.invalid', expiresInSec: 600, provider: 'google',
      } };
    });
    const result = await startSecondaryAuthRecoverySession(
      'google',
      async () => mockGoogleNativeCredential,
      jest.fn(() => driftingCallable),
    );
    if (result.result !== 'ready') throw new Error('expected_ready');

    await expect(result.session.requestCode('stable-1'))
      .rejects.toThrow('secondary_auth_session_changed');
    await result.session.cleanup();
  });

  it('cleanup closes the session immediately but waits for an active call before signOut/delete', async () => {
    let release!: () => void;
    const requestCallable = jest.fn(() => new Promise<any>((resolve) => {
      release = () => resolve({ data: {
        ok: true, maskedEmail: 'o***@x.invalid', expiresInSec: 600, provider: 'google',
      } });
    }));
    const result = await startSecondaryAuthRecoverySession(
      'google',
      async () => mockGoogleNativeCredential,
      jest.fn((_functions: unknown, name: string) => (
        name === 'authRequestRecoveryCode' ? requestCallable : jest.fn()
      )),
    );
    if (result.result !== 'ready') throw new Error('expected_ready');
    const active = result.session.requestCode('stable-1');
    await Promise.resolve();
    const secondarySignOutsBefore = mockEvents.filter(event => event === 'signout:secondary').length;
    const cleanup = result.session.cleanup();
    await expect(result.session.requestCode('stable-2')).rejects.toThrow('recovery_session_closed');
    expect(mockEvents.filter(event => event === 'signout:secondary')).toHaveLength(secondarySignOutsBefore);

    release();
    await active;
    await cleanup;
    expect(mockEvents.filter(event => event === 'signout:secondary')).toHaveLength(secondarySignOutsBefore + 1);
  });

  it.each([
    ['request', 'authRequestRecoveryCode', { data: { ok: true, maskedEmail: 7, expiresInSec: 600, provider: 'google' } }],
    ['confirm', 'authConfirmRecoveryCode', { data: { ok: true, stableId: 'stable-1' } }],
    ['issue', 'authIssueRecoveryHandoffToken', { data: {
      ok: true, recoveryEventId: 'event-1', customToken: '', stableId: 'stable-1',
      handoffAcknowledgeUntil: 123,
    } }],
  ])('fails closed for malformed %s response', async (kind, targetName, malformed) => {
    const result = await startSecondaryAuthRecoverySession(
      'google',
      async () => mockGoogleNativeCredential,
      jest.fn((_functions: unknown, name: string) => jest.fn(async () => (
        name === targetName ? malformed : { data: {} }
      ))),
    );
    if (result.result !== 'ready') throw new Error('expected_ready');

    const operation = kind === 'request'
      ? result.session.requestCode('stable-1')
      : kind === 'confirm'
        ? result.session.confirmCode('stable-1', '123456')
        : result.session.issueHandoffToken('event-1', 'request-1');
    await expect(operation).rejects.toThrow('secondary_recovery_response_invalid');
    await result.session.cleanup();
  });

  it.each(['12345', '1234567', '123 456', '１２３４５６'])(
    'rejects a non-six-ASCII-digit recovery code %p before the callable',
    async (invalidCode) => {
      const confirmCallable = jest.fn();
      const result = await startSecondaryAuthRecoverySession(
        'google',
        async () => mockGoogleNativeCredential,
        jest.fn(() => confirmCallable),
      );
      if (result.result !== 'ready') throw new Error('expected_ready');

      try {
        await expect(result.session.confirmCode('stable-1', invalidCode))
          .rejects.toThrow('secondary_recovery_code_invalid');
        expect(confirmCallable).not.toHaveBeenCalled();
      } finally {
        await result.session.cleanup();
      }
    },
  );

  it.each(['short.token.value', `${'a'.repeat(4096)}.${'b'.repeat(4096)}.${'c'.repeat(4096)}`])(
    'rejects an unbounded or malformed custom token response',
    async (customToken) => {
      const result = await startSecondaryAuthRecoverySession(
        'google',
        async () => mockGoogleNativeCredential,
        jest.fn(() => jest.fn(async () => ({ data: {
          ok: true,
          recoveryEventId: 'event-1',
          customToken,
          stableId: 'stable-1',
          handoffAcknowledgeUntil: 789012,
        } }))),
      );
      if (result.result !== 'ready') throw new Error('expected_ready');

      try {
        await expect(result.session.issueHandoffToken('event-1', 'request-1'))
          .rejects.toThrow('secondary_recovery_response_invalid');
      } finally {
        await result.session.cleanup();
      }
    },
  );

  it.each([
    ['event', 'x'.repeat(161), 'request-1'],
    ['event', 'bad/event', 'request-1'],
    ['request', 'event-1', 'x'.repeat(161)],
    ['request', 'event-1', 'bad/request'],
  ])('rejects malformed %s identifiers before token callable', async (_kind, eventId, requestId) => {
    const issueCallable = jest.fn();
    const result = await startSecondaryAuthRecoverySession(
      'google',
      async () => mockGoogleNativeCredential,
      jest.fn(() => issueCallable),
    );
    if (result.result !== 'ready') throw new Error('expected_ready');

    try {
      await expect(result.session.issueHandoffToken(eventId, requestId))
        .rejects.toThrow(/secondary_recovery_(event_id|request_id)_invalid/);
      expect(issueCallable).not.toHaveBeenCalled();
    } finally {
      await result.session.cleanup();
    }
  });
});
