import {
  createAccountsV2AuthTransitionCoordinator,
  type AccountsV2ProviderSignInResult,
  type AccountsV2SessionUidResult,
} from '../modules/account-session-v2/account_v2_auth_transition';

function sessionResult(uid: string | null, hydrationScheduled = true): AccountsV2SessionUidResult {
  return uid === null
    ? { outcome: 'closed', uid: null }
    : { outcome: 'opened', uid, hydrationScheduled };
}

describe('Account V2 provider auth transition coordinator', () => {
  test('first listener observation opens the provider scope even when Firebase already reports that uid', async () => {
    const sessions: (string | null)[] = [];
    const coordinator = createAccountsV2AuthTransitionCoordinator({
      currentAuthUid: () => 'uid-a',
      setSessionUid: async (uid) => { sessions.push(uid); return sessionResult(uid); },
    });

    await expect(coordinator.observeAuthUid('uid-a')).resolves.toEqual({
      outcome: 'opened', uid: 'uid-a', hydrationScheduled: true,
    });
    expect(sessions).toEqual(['uid-a']);
  });

  test('A to B closes A before authentication, then opens B and schedules hydration', async () => {
    let authUid: string | null = 'uid-a';
    const trace: string[] = [];
    const coordinator = createAccountsV2AuthTransitionCoordinator({
      currentAuthUid: () => authUid,
      setSessionUid: async (uid) => {
        trace.push(uid === null ? 'close-old' : `open:${uid}`);
        return sessionResult(uid);
      },
      onStateChange: (state) => { trace.push(`state:${state.phase}`); },
    });

    const result = await coordinator.runProviderSignIn(async () => {
      trace.push('authenticate');
      authUid = 'uid-b';
      return { result: 'linked_existing' } satisfies AccountsV2ProviderSignInResult;
    });

    expect(result).toEqual({ result: 'linked_existing' });
    expect(trace).toEqual([
      'state:closing_old',
      'close-old',
      'state:authenticating',
      'authenticate',
      'state:opening_new',
      'open:uid-b',
      'state:hydrating',
    ]);
    expect(coordinator.status()).toEqual({ phase: 'hydrating', uid: 'uid-b', error: null });
  });

  test.each([
    ['cancelled', { result: 'cancelled' }],
    ['error', { result: 'error', error: 'provider_failed' }],
  ] as const)('%s sign-in restores the still-authenticated old scope and preserves terminal state', async (phase, outcome) => {
    let authUid: string | null = 'uid-a';
    const sessions: (string | null)[] = [];
    const coordinator = createAccountsV2AuthTransitionCoordinator({
      currentAuthUid: () => authUid,
      setSessionUid: async (uid) => { sessions.push(uid); return sessionResult(uid); },
    });

    await expect(coordinator.runProviderSignIn(async () => outcome)).resolves.toEqual(outcome);

    expect(sessions).toEqual([null, 'uid-a']);
    expect(coordinator.status()).toEqual({
      phase,
      uid: 'uid-a',
      error: phase === 'error' ? 'provider_failed' : null,
    });
  });

  test.each([
    [
      'cancelled',
      { result: 'cancelled' } as const,
      { outcome: 'not_opened', uid: null, reason: 'scope_not_opened' } as const,
      { phase: 'error', uid: null, error: 'scope_not_opened' },
    ],
    [
      'error',
      { result: 'error', error: 'provider_failed' } as const,
      { outcome: 'opened', uid: 'uid-a', hydrationScheduled: false } as const,
      { phase: 'error', uid: null, error: 'hydration_not_scheduled' },
    ],
  ])('%s result reports recovery failure instead of claiming the old scope was restored', async (
    _providerPhase,
    outcome,
    reopenResult,
    expectedState,
  ) => {
    const coordinator = createAccountsV2AuthTransitionCoordinator({
      currentAuthUid: () => 'uid-a',
      setSessionUid: async (uid) => uid === null ? sessionResult(null) : reopenResult,
    });

    await expect(coordinator.runProviderSignIn(async () => outcome)).resolves.toEqual(outcome);

    expect(coordinator.status()).toEqual(expectedState);
  });

  test('provider sign-out closes the account scope before Firebase sign-out', async () => {
    let authUid: string | null = 'uid-a';
    const trace: string[] = [];
    const coordinator = createAccountsV2AuthTransitionCoordinator({
      currentAuthUid: () => authUid,
      setSessionUid: async (uid) => {
        trace.push(uid === null ? 'close-old' : `open:${uid}`);
        return sessionResult(uid);
      },
      onStateChange: (state) => { trace.push(`state:${state.phase}`); },
    });

    await coordinator.runProviderSignOut(async () => {
      trace.push('authenticate');
      authUid = null;
    });

    expect(trace).toEqual([
      'state:closing_old',
      'close-old',
      'state:authenticating',
      'authenticate',
      'state:signed_out',
    ]);
    expect(coordinator.status()).toEqual({ phase: 'signed_out', uid: null, error: null });
  });

  test('thrown provider failure reopens the current authenticated scope and records error state', async () => {
    let authUid: string | null = 'uid-a';
    const sessions: (string | null)[] = [];
    const coordinator = createAccountsV2AuthTransitionCoordinator({
      currentAuthUid: () => authUid,
      setSessionUid: async (uid) => { sessions.push(uid); return sessionResult(uid); },
    });

    await expect(coordinator.runProviderSignOut(async () => {
      throw new Error('firebase_sign_out_failed');
    })).rejects.toThrow('firebase_sign_out_failed');

    expect(sessions).toEqual([null, 'uid-a']);
    expect(coordinator.status()).toEqual({ phase: 'error', uid: 'uid-a', error: 'firebase_sign_out_failed' });
  });

  test('does not claim hydration when the session controller swallowed an unavailable scope open', async () => {
    let authUid: string | null = 'uid-a';
    const coordinator = createAccountsV2AuthTransitionCoordinator({
      currentAuthUid: () => authUid,
      setSessionUid: async (uid) => uid === null
        ? sessionResult(null)
        : { outcome: 'not_opened', uid: null, reason: 'scope_not_opened' },
    });

    const result = await coordinator.runProviderSignIn(async () => {
      authUid = 'uid-b';
      return { result: 'linked_existing' } satisfies AccountsV2ProviderSignInResult;
    });

    expect(result).toEqual({ result: 'linked_existing' });
    expect(coordinator.status()).toEqual({ phase: 'error', uid: 'uid-b', error: 'scope_not_opened' });
  });

  test('Firebase listener UID is deferred until the active provider callback settles', async () => {
    jest.resetModules();
    let authUid: string | null = 'uid-a';
    let controllerUid: string | null = 'uid-a';
    const trace: string[] = [];
    const setAuthUid = jest.fn(async (uid: string | null) => {
      controllerUid = uid;
      trace.push(uid === null ? 'close-old' : `open:${uid}`);
    });
    jest.doMock('@react-native-firebase/auth', () => ({
      default: () => ({ currentUser: authUid === null ? null : { uid: authUid, isAnonymous: false } }),
    }));
    jest.doMock('../modules/account-session-v2/account_v2_client_session', () => ({
      createAccountsV2ClientController: () => ({
        setAuthUid,
        status: () => ({
          uid: controllerUid,
          sending: controllerUid !== null,
          serverDisabled: false,
          timerArmed: false,
          hydrationArmed: controllerUid !== null,
        }),
      }),
    }));
    const runtime = require('../modules/account-session-v2/accounts_v2_client_runtime') as
      typeof import('../modules/account-session-v2/accounts_v2_client_runtime');
    let settle!: () => void;
    const callbackPending = new Promise<void>((resolve) => { settle = resolve; });
    const transition = runtime.runAccountsV2ProviderSignInTransition(async () => {
      trace.push('authenticate');
      await callbackPending;
      return { result: 'linked_existing' };
    }, () => true);
    await Promise.resolve();
    await Promise.resolve();

    authUid = 'uid-b';
    runtime.syncAccountsV2ClientAuthUid('uid-b', () => true);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(trace).toEqual(['close-old', 'authenticate']);

    settle();
    await transition;
    expect(trace).toEqual(['close-old', 'authenticate', 'open:uid-b']);
    jest.dontMock('@react-native-firebase/auth');
    jest.dontMock('../modules/account-session-v2/account_v2_client_session');
  });

  test('overlapping provider transitions are serialized through one FIFO', async () => {
    let authUid: string | null = 'uid-a';
    const trace: string[] = [];
    let releaseFirst!: () => void;
    const firstCallback = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const coordinator = createAccountsV2AuthTransitionCoordinator({
      currentAuthUid: () => authUid,
      setSessionUid: async (uid) => {
        trace.push(uid === null ? 'close' : `open:${uid}`);
        return sessionResult(uid);
      },
    });

    const first = coordinator.runProviderSignIn(async () => {
      trace.push('authenticate:first');
      await firstCallback;
      authUid = 'uid-b';
      return { result: 'linked_existing' } satisfies AccountsV2ProviderSignInResult;
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
    const second = coordinator.runProviderSignOut(async () => {
      trace.push('authenticate:second');
      authUid = null;
    });
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(trace).toEqual(['close', 'authenticate:first']);
    releaseFirst();
    await first;
    await second;
    expect(trace).toEqual([
      'close', 'authenticate:first', 'open:uid-b', 'close', 'authenticate:second',
    ]);
  });

  test('same linked UID observation closes the live scope when the client gate turns off', async () => {
    let enabled = true;
    const sessions: (string | null)[] = [];
    const coordinator = createAccountsV2AuthTransitionCoordinator({
      currentAuthUid: () => 'uid-a',
      isEnabled: () => enabled,
      setSessionUid: async (uid) => {
        sessions.push(uid);
        return sessionResult(uid);
      },
    });

    await expect(coordinator.observeAuthUid('uid-a')).resolves.toMatchObject({ outcome: 'opened', uid: 'uid-a' });
    enabled = false;

    await expect(coordinator.observeAuthUid('uid-a')).resolves.toEqual({ outcome: 'closed', uid: null });
    expect(sessions).toEqual(['uid-a', null]);
  });

  test('cancelled provider sign-in reports an error when the old scope cannot be reopened', async () => {
    let authUid: string | null = 'uid-a';
    const coordinator = createAccountsV2AuthTransitionCoordinator({
      currentAuthUid: () => authUid,
      setSessionUid: async (uid) => {
        if (uid === null) return sessionResult(null);
        return { outcome: 'not_opened', uid: null, reason: 'scope_not_opened' };
      },
    });

    await expect(coordinator.runProviderSignIn(async () => ({ result: 'cancelled' }))).resolves.toEqual({ result: 'cancelled' });
    expect(coordinator.status()).toEqual({ phase: 'error', uid: null, error: 'scope_not_opened' });
  });

  test('listener UID stays deferred across a waiting FIFO transition slot', async () => {
    let authUid: string | null = 'uid-a';
    const trace: string[] = [];
    let releaseFirst!: () => void;
    const firstCallback = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const coordinator = createAccountsV2AuthTransitionCoordinator({
      currentAuthUid: () => authUid,
      setSessionUid: async (uid) => {
        trace.push(uid === null ? 'close' : `open:${uid}`);
        return sessionResult(uid);
      },
    });

    const first = coordinator.runProviderSignIn(async () => {
      trace.push('authenticate:first');
      await firstCallback;
      authUid = 'uid-b';
      return { result: 'linked_existing' } satisfies AccountsV2ProviderSignInResult;
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
    const second = coordinator.runProviderSignOut(async () => {
      trace.push('authenticate:second');
      authUid = null;
    });

    await expect(coordinator.observeAuthUid('uid-c')).resolves.toEqual({ outcome: 'deferred' });
    releaseFirst();
    await first;
    await second;
    expect(trace).toEqual([
      'close', 'authenticate:first', 'open:uid-b', 'close', 'authenticate:second',
    ]);
  });

  test('back-to-back idle listener observations are serialized and use the latest Firebase UID', async () => {
    let authUid: string | null = 'uid-a';
    const trace: string[] = [];
    let releaseFirst!: () => void;
    const firstOpen = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const coordinator = createAccountsV2AuthTransitionCoordinator({
      currentAuthUid: () => authUid,
      setSessionUid: async (uid) => {
        trace.push(`start:${uid ?? 'closed'}`);
        if (uid === 'uid-b') await firstOpen;
        trace.push(`finish:${uid ?? 'closed'}`);
        return sessionResult(uid);
      },
    });

    const first = coordinator.observeAuthUid('uid-b');
    await new Promise<void>((resolve) => setImmediate(resolve));
    authUid = 'uid-c';
    const second = coordinator.observeAuthUid('uid-c');

    expect(trace).toEqual(['start:uid-b']);
    releaseFirst();
    await expect(first).resolves.toEqual({
      outcome: 'opened', uid: 'uid-b', hydrationScheduled: true,
    });
    await expect(second).resolves.toEqual({
      outcome: 'opened', uid: 'uid-c', hydrationScheduled: true,
    });
    expect(trace).toEqual([
      'start:uid-b', 'finish:uid-b', 'start:uid-c', 'finish:uid-c',
    ]);
  });

  test('anonymous Firebase UID is never opened as an Account V2 account scope', async () => {
    jest.resetModules();
    const setAuthUid = jest.fn(async () => undefined);
    jest.doMock('@react-native-firebase/auth', () => ({
      default: () => ({ currentUser: { uid: 'anon-uid', isAnonymous: true } }),
    }));
    jest.doMock('../modules/account-session-v2/account_v2_client_session', () => ({
      createAccountsV2ClientController: () => ({
        setAuthUid,
        status: () => ({
          uid: null,
          sending: false,
          serverDisabled: false,
          timerArmed: false,
          hydrationArmed: false,
        }),
      }),
    }));
    const runtime = require('../modules/account-session-v2/accounts_v2_client_runtime') as
      typeof import('../modules/account-session-v2/accounts_v2_client_runtime');

    await expect(runtime.runAccountsV2ProviderSignInTransition(
      async () => ({ result: 'linked_existing' }),
      () => true,
    )).rejects.toThrow('accounts_v2_authenticated_uid_missing');
    expect(setAuthUid).toHaveBeenCalledTimes(1);
    expect(setAuthUid).toHaveBeenCalledWith(null);
    jest.dontMock('@react-native-firebase/auth');
    jest.dontMock('../modules/account-session-v2/account_v2_client_session');
  });

  test('listener observation uses authoritative linked provider state instead of the raw UI uid', async () => {
    jest.resetModules();
    let controllerUid: string | null = null;
    const setAuthUid = jest.fn(async (uid: string | null) => {
      controllerUid = uid;
    });
    jest.doMock('@react-native-firebase/auth', () => ({
      default: () => ({ currentUser: { uid: 'uid-linked', isAnonymous: false } }),
    }));
    jest.doMock('../modules/account-session-v2/account_v2_client_session', () => ({
      createAccountsV2ClientController: () => ({
        setAuthUid,
        status: () => ({
          uid: controllerUid,
          sending: controllerUid !== null,
          serverDisabled: false,
          timerArmed: false,
          hydrationArmed: controllerUid !== null,
        }),
      }),
    }));
    const runtime = require('../modules/account-session-v2/accounts_v2_client_runtime') as
      typeof import('../modules/account-session-v2/accounts_v2_client_runtime');

    runtime.syncAccountsV2ClientAuthUid('stale-ui-uid', () => true);
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(setAuthUid).toHaveBeenCalledTimes(1);
    expect(setAuthUid).toHaveBeenCalledWith('uid-linked');
    jest.dontMock('@react-native-firebase/auth');
    jest.dontMock('../modules/account-session-v2/account_v2_client_session');
  });

  test('enabled same-uid foreground sync reapplies the uid so a stopped controller resumes', async () => {
    jest.resetModules();
    let controllerUid: string | null = null;
    let sending = false;
    const setAuthUid = jest.fn(async (uid: string | null) => {
      controllerUid = uid;
      sending = uid !== null;
    });
    jest.doMock('@react-native-firebase/auth', () => ({
      default: () => ({ currentUser: { uid: 'uid-a', isAnonymous: false } }),
    }));
    jest.doMock('../modules/account-session-v2/account_v2_client_session', () => ({
      createAccountsV2ClientController: () => ({
        setAuthUid,
        status: () => ({
          uid: controllerUid,
          sending,
          serverDisabled: false,
          timerArmed: sending,
          hydrationArmed: sending,
        }),
      }),
    }));
    const runtime = require('../modules/account-session-v2/accounts_v2_client_runtime') as
      typeof import('../modules/account-session-v2/accounts_v2_client_runtime');

    runtime.syncAccountsV2ClientAuthUid('uid-a', () => true);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(setAuthUid).toHaveBeenCalledTimes(1);
    expect(runtime.accountsV2OpenScopeUid()).toBe('uid-a');

    // A transient reauth/fail-closed path can stop the runner without changing
    // the authoritative uid. Foreground re-sync must resume that same scope.
    sending = false;
    runtime.syncAccountsV2ClientAuthUid('uid-a', () => true);
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(setAuthUid).toHaveBeenCalledTimes(2);
    expect(setAuthUid).toHaveBeenLastCalledWith('uid-a');
    expect(sending).toBe(true);
    expect(runtime.accountsV2OpenScopeUid()).toBe('uid-a');
    jest.dontMock('@react-native-firebase/auth');
    jest.dontMock('../modules/account-session-v2/account_v2_client_session');
  });

  test('live flag OFF reapplies the same authoritative uid so the runtime stops, then can reopen', async () => {
    jest.resetModules();
    let enabled = true;
    let controllerUid: string | null = null;
    let timerArmed = false;
    const setAuthUid = jest.fn(async (uid: string | null) => {
      if (!enabled) {
        controllerUid = null;
        timerArmed = false;
        return;
      }
      controllerUid = uid;
      timerArmed = uid !== null;
    });
    jest.doMock('@react-native-firebase/auth', () => ({
      default: () => ({ currentUser: { uid: 'uid-a', isAnonymous: false } }),
    }));
    jest.doMock('../modules/account-session-v2/account_v2_client_session', () => ({
      createAccountsV2ClientController: () => ({
        setAuthUid,
        status: () => ({
          uid: controllerUid,
          sending: controllerUid !== null,
          serverDisabled: false,
          timerArmed,
          hydrationArmed: timerArmed,
        }),
      }),
    }));
    const runtime = require('../modules/account-session-v2/accounts_v2_client_runtime') as
      typeof import('../modules/account-session-v2/accounts_v2_client_runtime');
    const isEnabled = () => enabled;

    runtime.syncAccountsV2ClientAuthUid('uid-a', isEnabled);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(runtime.accountsV2OpenScopeUid()).toBe('uid-a');
    expect(timerArmed).toBe(true);

    enabled = false;
    runtime.syncAccountsV2ClientAuthUid('uid-a', isEnabled);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(runtime.accountsV2OpenScopeUid()).toBeNull();
    expect(timerArmed).toBe(false);

    enabled = true;
    runtime.syncAccountsV2ClientAuthUid('uid-a', isEnabled);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(runtime.accountsV2OpenScopeUid()).toBe('uid-a');
    expect(timerArmed).toBe(true);
    expect(setAuthUid.mock.calls.map(([uid]) => uid)).toEqual(['uid-a', null, 'uid-a']);
    jest.dontMock('@react-native-firebase/auth');
    jest.dontMock('../modules/account-session-v2/account_v2_client_session');
  });
});
