import { accountAuthorityGeneration } from '../modules/account-authority-v2/account_authority_contract';
import {
  parseAccountId,
  parseDeviceId,
  parseSessionId,
} from '../modules/account-authority-v2/account_authority_ids';
import type {
  AccountAuthorityLocalScope,
  AccountAuthorityLocalStorePort,
  AccountAuthorityOperationKind,
} from '../modules/account-authority-v2/account_authority_local_store';

function localStore(openFailure?: Error, closeFailure?: Error): AccountAuthorityLocalStorePort {
  let generation = accountAuthorityGeneration(0);
  let scope: AccountAuthorityLocalScope | null = null;
  const operations = new Map<string, AccountAuthorityOperationKind>();
  return {
    getAuthorityGeneration: () => generation,
    advanceAuthorityGeneration: (next) => {
      if (next.value > generation.value) generation = next;
      return generation;
    },
    getOperationKind: (operationId) => operations.get(operationId.value) ?? null,
    getDestructiveOperation: () => null,
    reserveOperation: (operationId, kind) => { operations.set(operationId.value, kind); },
    bindDeferredDestructiveOperation: () => { throw new Error('unexpected_destructive_operation'); },
    markDestructiveOperationLocalApplied: () => { throw new Error('unexpected_destructive_operation'); },
    completeDestructiveOperation: () => { throw new Error('unexpected_destructive_operation'); },
    getOpenScope: () => scope,
    openScope: jest.fn(async (next) => {
      if (openFailure) throw openFailure;
      scope = next;
    }),
    closeScope: jest.fn(async () => {
      if (closeFailure) throw closeFailure;
      scope = null;
    }),
    clearAccountData: () => undefined,
    commitPreservedWrite: async () => undefined,
  };
}

function loadBridge(input: Readonly<{
  acquire: jest.Mock;
  store: AccountAuthorityLocalStorePort;
  providerSignOut: jest.Mock;
  currentUid?: () => string | null;
  release?: jest.Mock;
}>) {
  jest.resetModules();
  let operationIndex = 0;
  jest.doMock('expo-crypto', () => ({ randomUUID: () => `operation-${operationIndex += 1}` }));
  jest.doMock('@react-native-firebase/auth', () => ({
    default: () => {
      const uid = input.currentUid ? input.currentUid() : 'firebase-uid-a';
      return { currentUser: uid === null ? null : { uid, isAnonymous: false } };
    },
  }));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const runtime = require('../modules/account-session-v2/accounts_v2_client_runtime') as
    typeof import('../modules/account-session-v2/accounts_v2_client_runtime');
  runtime.installAccountAuthorityClientBootstrap({
    deviceId: parseDeviceId('device-a'),
    lease: {
      acquire: input.acquire,
      release: input.release ?? jest.fn(async () => undefined),
      deleteAccount: jest.fn(async () => undefined),
    },
    localStore: input.store,
    providerSignOut: input.providerSignOut,
  });
  return runtime;
}

afterEach(() => {
  jest.dontMock('expo-crypto');
  jest.dontMock('@react-native-firebase/auth');
});

describe('Account Authority provider bridge fail-closed cleanup', () => {
  test.each(['acquire', 'open'] as const)('%s failure signs out the real provider exactly once', async (failure) => {
    const providerSignOut = jest.fn(async () => undefined);
    const acquire = failure === 'acquire'
      ? jest.fn(async () => { throw new Error('lease_acquire_failed'); })
      : jest.fn(async () => ({ accountId: parseAccountId('account-a'), sessionId: parseSessionId('session-a') }));
    const runtime = loadBridge({
      acquire,
      store: localStore(failure === 'open' ? new Error('scope_open_failed') : undefined),
      providerSignOut,
    });

    await expect(runtime.runAccountAuthorityProviderSignInTransition(async () => ({
      result: 'linked_existing',
    }))).rejects.toThrow(failure === 'acquire' ? 'lease_acquire_failed' : 'scope_open_failed');
    expect(providerSignOut).toHaveBeenCalledTimes(1);
  });

  // зачем (AA S6b, 6b4adc6e4, security-ревью APPROVE): на продлении из провайдера
  // выходим ТОЛЬКО при доказанном отзыве доступа; прочий сбой (сеть, сервер,
  // нераспознанный код — iOS «нет интернета») вход сохраняет.
  test('startup resume: unproven lease failure keeps the real provider signed in', async () => {
    const providerSignOut = jest.fn(async () => undefined);
    const runtime = loadBridge({
      acquire: jest.fn(async () => { throw new Error('startup_lease_failed'); }),
      store: localStore(),
      providerSignOut,
    });

    await expect(runtime.resumeAccountAuthorityProviderSession()).resolves.not.toThrow();
    expect(providerSignOut).not.toHaveBeenCalled();
  });

  test('startup resume: proven access revocation signs out the real provider exactly once', async () => {
    const providerSignOut = jest.fn(async () => undefined);
    const runtime = loadBridge({
      acquire: jest.fn(async () => { throw new Error('account_authority_lease_binding_rejected'); }),
      store: localStore(),
      providerSignOut,
    });

    await expect(runtime.resumeAccountAuthorityProviderSession()).rejects.toThrow('account_authority_lease_binding_rejected');
    expect(providerSignOut).toHaveBeenCalledTimes(1);
  });

  test('provider error is not reduced as user cancellation', async () => {
    const providerSignOut = jest.fn(async () => undefined);
    const runtime = loadBridge({
      acquire: jest.fn(),
      store: localStore(),
      providerSignOut,
    });

    await expect(runtime.runAccountAuthorityProviderSignInTransition(async () => ({
      result: 'error', error: 'provider_changed',
    }))).resolves.toEqual({ result: 'error', error: 'provider_changed' });
    expect(providerSignOut).not.toHaveBeenCalled();
  });

  test('provider identity change followed by error fails closed instead of restoring account A', async () => {
    const identity: { uid: string | null } = { uid: 'firebase-uid-a' };
    const store = localStore();
    const release = jest.fn(async () => undefined);
    const providerSignOut = jest.fn(async () => { identity.uid = null; });
    const acquire = jest.fn(async () => ({
      accountId: parseAccountId('account-a'),
      sessionId: parseSessionId('session-a'),
    }));
    const runtime = loadBridge({
      acquire,
      store,
      providerSignOut,
      currentUid: () => identity.uid,
      release,
    });
    await runtime.runAccountAuthorityProviderSignInTransition(async () => ({
      result: 'linked_existing' as const,
    }));
    expect(store.getOpenScope()).toMatchObject({ accountId: parseAccountId('account-a') });

    const result = await runtime.runAccountAuthorityProviderSignInTransition(async () => {
      identity.uid = 'firebase-uid-b';
      return { result: 'error' as const, error: 'post_sign_in_uid_validation_failed' };
    });

    expect(result).toEqual({ result: 'error', error: 'post_sign_in_uid_validation_failed' });
    expect(store.getOpenScope()).toBeNull();
    expect(providerSignOut).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledWith(expect.objectContaining({
      accountId: parseAccountId('account-a'),
      sessionId: parseSessionId('session-a'),
    }));
    await runtime.resumeAccountAuthorityProviderSession();
    expect(acquire).toHaveBeenCalledTimes(1);
    expect(store.getOpenScope()).toBeNull();
  });

  test.each(['close', 'signOut', 'release'] as const)(
    '%s compensation failure is rethrown instead of being masked by the provider error result',
    async (failedStep) => {
      const identity: { uid: string | null } = { uid: 'firebase-uid-a' };
      const cleanupFailure = new Error(`${failedStep}_compensation_failed`);
      const store = localStore(undefined, failedStep === 'close' ? cleanupFailure : undefined);
      const providerSignOut = failedStep === 'signOut'
        ? jest.fn(async () => { throw cleanupFailure; })
        : jest.fn(async () => { identity.uid = null; });
      const release = failedStep === 'release'
        ? jest.fn(async () => { throw cleanupFailure; })
        : jest.fn(async () => undefined);
      const runtime = loadBridge({
        acquire: jest.fn(async () => ({
          accountId: parseAccountId('account-a'),
          sessionId: parseSessionId('session-a'),
        })),
        store,
        providerSignOut,
        currentUid: () => identity.uid,
        release,
      });
      await runtime.runAccountAuthorityProviderSignInTransition(async () => ({
        result: 'linked_existing' as const,
      }));

      await expect(runtime.runAccountAuthorityProviderSignInTransition(async () => {
        identity.uid = 'firebase-uid-b';
        return { result: 'error' as const, error: 'provider_changed' };
      })).rejects.toThrow(`${failedStep}_compensation_failed`);

      expect(providerSignOut).toHaveBeenCalledTimes(1);
      expect(release).toHaveBeenCalledTimes(1);
    },
  );
});
