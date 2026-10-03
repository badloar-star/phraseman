import {
  createAccountAuthorityFirebaseInstallationBindingPort,
  createAccountAuthorityFirebaseLeasePort,
  type AccountAuthorityCallableInvoker,
  type AccountAuthorityInstallationBindingCredentialStore,
  type AccountAuthorityInstallationBindingPort,
  type AccountAuthorityLeaseRevisionStore,
} from '../modules/account-authority-v2/account_authority_lease_transport';
import {
  parseAccountId,
  parseDeviceId,
  parseFirebaseAuthUid,
  parseOperationId,
  parseSessionId,
} from '../modules/account-authority-v2/account_authority_ids';

function memoryRevisions(initial: number | null = null): AccountAuthorityLeaseRevisionStore & {
  current(): number | null;
  seedLease(accountId: string, sessionId: string, revision: number): void;
} {
  let revision = initial;
  const leases = new Map<string, number>();
  const key = (accountId: string, sessionId: string) => `${accountId}\u0000${sessionId}`;
  return {
    current: () => revision,
    seedLease: (accountId, sessionId, next) => { leases.set(key(accountId, sessionId), next); },
    read: async () => revision,
    write: async (_firebaseAuthUid, next) => { revision = next; },
    readLease: async (owner) => leases.get(key(owner.accountId.value, owner.sessionId.value)) ?? null,
    bindLease: async (_firebaseAuthUid, owner, next) => {
      revision = next;
      leases.set(key(owner.accountId.value, owner.sessionId.value), next);
    },
    writeLease: async (owner, next) => {
      revision = next;
      leases.set(key(owner.accountId.value, owner.sessionId.value), next);
    },
  };
}

function bindingPort(
  bindingToken = 'opaque-binding-token',
): AccountAuthorityInstallationBindingPort {
  const binding = Object.freeze({
    bindingToken,
    deviceBindingId: parseDeviceId('server-device-binding-a'),
  });
  return {
    obtain: async () => binding,
    readPersisted: async () => binding,
  };
}

function memoryBindingCredentials(
  initial: Awaited<ReturnType<AccountAuthorityInstallationBindingCredentialStore['read']>> = null,
): AccountAuthorityInstallationBindingCredentialStore {
  let current = initial;
  return {
    read: async () => current,
    write: async (credentials) => { current = Object.freeze({ ...credentials }); },
  };
}

describe('Account Authority Firebase lease transport', () => {
  test('sends only operationId and the durable expectedRevision to the callable', async () => {
    const revisionStore = memoryRevisions(7);
    const invoke: jest.MockedFunction<AccountAuthorityCallableInvoker> = jest.fn(async (_name, _data) => ({
      data: {
        schemaVersion: 'account-authority-lease.v1',
        type: 'acquired',
        accountId: 'account-server-a',
        sessionId: 'session-server-a',
        revision: 8,
        idempotent: false,
        previousLeaseRevoked: true,
      },
    }));
    const port = createAccountAuthorityFirebaseLeasePort({
      invoke,
      revisionStore,
      installationBinding: bindingPort(),
    });

    const result = await port.acquire({
      firebaseAuthUid: parseFirebaseAuthUid('firebase-client-a'),
      deviceId: parseDeviceId('device-client-a'),
      operationId: parseOperationId('operation-client-a'),
    });

    expect(invoke).toHaveBeenCalledWith('accountAuthorityLeaseAcquire', {
      operationId: 'operation-client-a',
      expectedRevision: 7,
      bindingToken: 'opaque-binding-token',
    });
    expect(JSON.stringify(invoke.mock.calls[0]?.[1])).not.toMatch(/firebase-client-a|device-client-a/);
    expect(result).toEqual({
      accountId: parseAccountId('account-server-a'),
      sessionId: parseSessionId('session-server-a'),
      previousLeaseRevoked: true,
    });
    expect(revisionStore.current()).toBe(8);
  });

  test('fails closed on auth failure and does not advance durable revision', async () => {
    const revisionStore = memoryRevisions(4);
    const authFailure = Object.assign(new Error('unauthenticated'), { code: 'functions/unauthenticated' });
    const invoke: AccountAuthorityCallableInvoker = async () => { throw authFailure; };
    const port = createAccountAuthorityFirebaseLeasePort({
      invoke,
      revisionStore,
      installationBinding: bindingPort(),
    });

    await expect(port.acquire({
      firebaseAuthUid: parseFirebaseAuthUid('firebase-client-a'),
      deviceId: parseDeviceId('device-client-a'),
      operationId: parseOperationId('operation-client-a'),
    })).rejects.toThrow('account_authority_lease_unauthenticated');
    expect(revisionStore.current()).toBe(4);
  });

  test('uses explicit null bootstrap when durable revision is absent and persists the returned revision', async () => {
    const invoke: jest.MockedFunction<AccountAuthorityCallableInvoker> = jest.fn(async (_name, _data) => ({
      data: {
        schemaVersion: 'account-authority-lease.v1',
        type: 'acquired',
        accountId: 'account-server-a',
        sessionId: 'session-server-a',
        revision: 6,
        idempotent: false,
        previousLeaseRevoked: true,
      },
    }));
    const revisionStore = memoryRevisions(null);
    const port = createAccountAuthorityFirebaseLeasePort({
      invoke,
      revisionStore,
      installationBinding: bindingPort(),
    });

    await expect(port.acquire({
      firebaseAuthUid: parseFirebaseAuthUid('firebase-client-a'),
      deviceId: parseDeviceId('device-client-a'),
      operationId: parseOperationId('operation-client-a'),
    })).resolves.toEqual({
      accountId: parseAccountId('account-server-a'),
      sessionId: parseSessionId('session-server-a'),
      previousLeaseRevoked: true,
    });
    expect(invoke).toHaveBeenCalledWith('accountAuthorityLeaseAcquire', {
      operationId: 'operation-client-a',
      expectedRevision: null,
      bindingToken: 'opaque-binding-token',
    });
    expect(revisionStore.current()).toBe(6);
  });

  test('rejects malformed responses without persisting a server revision', async () => {
    const revisionStore = memoryRevisions(2);
    const invoke: AccountAuthorityCallableInvoker = async () => ({
      data: {
        schemaVersion: 'account-authority-lease.v1',
        accountId: 'account-server-a',
        sessionId: 'session-server-a',
        revision: 3,
      },
    });
    const port = createAccountAuthorityFirebaseLeasePort({
      invoke,
      revisionStore,
      installationBinding: bindingPort(),
    });

    await expect(port.acquire({
      firebaseAuthUid: parseFirebaseAuthUid('firebase-client-a'),
      deviceId: parseDeviceId('device-client-a'),
      operationId: parseOperationId('operation-client-a'),
    })).rejects.toThrow('account_authority_lease_invalid');
    expect(revisionStore.current()).toBe(2);
  });

  test.each([
    ['acquired', 4, 6],
    ['renewed', 4, 5],
  ] as const)('rejects inflated %s revision without poisoning durable state', async (type, expected, returned) => {
    const revisionStore = memoryRevisions(expected);
    const port = createAccountAuthorityFirebaseLeasePort({
      revisionStore,
      installationBinding: bindingPort(),
      invoke: async () => ({
        data: {
          schemaVersion: 'account-authority-lease.v1',
          type,
          accountId: 'account-server-a',
          sessionId: 'session-server-a',
          revision: returned,
          idempotent: false,
          previousLeaseRevoked: type === 'acquired',
        },
      }),
    });

    await expect(port.acquire({
      firebaseAuthUid: parseFirebaseAuthUid('firebase-client-a'),
      deviceId: parseDeviceId('device-client-a'),
      operationId: parseOperationId('operation-client-a'),
    })).rejects.toThrow('account_authority_lease_invalid');
    expect(revisionStore.current()).toBe(expected);
  });

  test('rejects an acquired transition at max safe revision without invoking or writing', async () => {
    const revisionStore = memoryRevisions(Number.MAX_SAFE_INTEGER);
    const invoke = jest.fn(async () => ({ data: null }));
    const port = createAccountAuthorityFirebaseLeasePort({
      invoke,
      revisionStore,
      installationBinding: bindingPort(),
    });

    await expect(port.acquire({
      firebaseAuthUid: parseFirebaseAuthUid('firebase-client-a'),
      deviceId: parseDeviceId('device-client-a'),
      operationId: parseOperationId('operation-client-a'),
    })).rejects.toThrow('account_authority_lease_revision_unavailable');
    expect(invoke).not.toHaveBeenCalled();
    expect(revisionStore.current()).toBe(Number.MAX_SAFE_INTEGER);
  });

  test('sends the exact persisted-binding release payload and advances its durable lease revision', async () => {
    const revisions = memoryRevisions();
    revisions.seedLease('account-server-a', 'session-server-a', 8);
    const invoke: jest.MockedFunction<AccountAuthorityCallableInvoker> = jest.fn(async (_name, _data) => ({
      data: {
        schemaVersion: 'account-authority-lease-release.v1',
        type: 'released',
        revision: 9,
        idempotent: false,
      },
    }));
    const port = createAccountAuthorityFirebaseLeasePort({
      invoke,
      revisionStore: revisions,
      installationBinding: bindingPort('persisted-binding-token'),
    });
    const request = {
      accountId: parseAccountId('account-server-a'),
      sessionId: parseSessionId('session-server-a'),
      deviceId: parseDeviceId('device-client-a'),
      operationId: parseOperationId('release-operation-a'),
    };

    await expect(port.release(request)).resolves.toBeUndefined();

    expect(invoke).toHaveBeenCalledWith('accountAuthorityLeaseRelease', {
      operationId: 'release-operation-a',
      expectedRevision: 8,
      sessionId: 'session-server-a',
      bindingToken: 'persisted-binding-token',
    });
    expect(JSON.stringify(invoke.mock.calls[0]?.[1])).not.toMatch(
      /account-server-a|device-client-a|stable_id|auth_time/,
    );
    expect(revisions.current()).toBe(9);
  });

  test('retries the same release operation after response loss and restart without inventing revision', async () => {
    const revisions = memoryRevisions();
    revisions.seedLease('account-server-a', 'session-server-a', 8);
    let serverReleased = false;
    const invoke = jest.fn(async (_name: string, data: Readonly<Record<string, unknown>>) => {
      expect(data).toMatchObject({ operationId: 'release-operation-a', expectedRevision: 8 });
      if (!serverReleased) {
        serverReleased = true;
        throw new Error('response_lost');
      }
      return {
        data: {
          schemaVersion: 'account-authority-lease-release.v1',
          type: 'released',
          revision: 9,
          idempotent: true,
        },
      };
    });
    const input = {
      invoke,
      revisionStore: revisions,
      installationBinding: bindingPort('persisted-binding-token'),
    };
    const request = {
      accountId: parseAccountId('account-server-a'),
      sessionId: parseSessionId('session-server-a'),
      deviceId: parseDeviceId('device-client-a'),
      operationId: parseOperationId('release-operation-a'),
    };

    await expect(createAccountAuthorityFirebaseLeasePort(input).release(request))
      .rejects.toThrow('account_authority_lease_unavailable');
    expect(revisions.current()).toBeNull();
    await expect(createAccountAuthorityFirebaseLeasePort(input).release(request))
      .resolves.toBeUndefined();
    expect(revisions.current()).toBe(9);
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  test('rejects malformed release responses without poisoning durable revision', async () => {
    const revisions = memoryRevisions();
    revisions.seedLease('account-server-a', 'session-server-a', 8);
    const port = createAccountAuthorityFirebaseLeasePort({
      invoke: async () => ({
        data: {
          schemaVersion: 'account-authority-lease-release.v1',
          type: 'released',
          revision: 10,
          idempotent: false,
        },
      }),
      revisionStore: revisions,
      installationBinding: bindingPort(),
    });

    await expect(port.release({
      accountId: parseAccountId('account-server-a'),
      sessionId: parseSessionId('session-server-a'),
      deviceId: parseDeviceId('device-client-a'),
      operationId: parseOperationId('release-operation-a'),
    })).rejects.toThrow('account_authority_lease_invalid');
    expect(revisions.current()).toBeNull();
  });

  test('keeps delete fail-closed and rejects release when durable credentials are unavailable', async () => {
    const invoke = jest.fn(async () => { throw new Error('must_not_call'); });
    const port = createAccountAuthorityFirebaseLeasePort({
      invoke,
      revisionStore: memoryRevisions(),
      installationBinding: {
        obtain: bindingPort().obtain,
        readPersisted: async () => null,
      },
    });
    const request = {
      accountId: parseAccountId('account-server-a'),
      sessionId: parseSessionId('session-server-a'),
      deviceId: parseDeviceId('device-client-a'),
      operationId: parseOperationId('operation-client-a'),
    };

    await expect(port.release(request)).rejects.toThrow('account_authority_lease_revision_unavailable');
    await expect(port.deleteAccount(request)).rejects.toThrow('account_authority_delete_not_wired');
    expect(invoke).not.toHaveBeenCalled();
  });

  test('creates an exact installation binding request, validates the response, and persists only opaque credentials', async () => {
    const invoke = jest.fn(async () => ({
      data: {
        bindingToken: 'opaque-binding-token',
        deviceBindingId: 'server-device-binding-a',
      },
    }));
    const write = jest.fn(async () => undefined);
    const port = createAccountAuthorityFirebaseInstallationBindingPort({
      invoke,
      installationId: '550e8400-e29b-41d4-a716-446655440000',
      credentials: { read: async () => null, write },
    });

    await expect(port.obtain(parseFirebaseAuthUid('firebase-client-a'))).resolves.toEqual({
      bindingToken: 'opaque-binding-token',
      deviceBindingId: parseDeviceId('server-device-binding-a'),
    });
    expect(invoke).toHaveBeenCalledWith('accountAuthorityInstallationBindingCreate', {
      installationId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(write).toHaveBeenCalledWith({
      bindingToken: 'opaque-binding-token',
      deviceBindingId: 'server-device-binding-a',
    });
    expect(JSON.stringify(invoke.mock.calls)).not.toContain('firebase-client-a');
  });

  test('reuses one in-memory binding per Firebase uid so an operation retry does not rotate its proof', async () => {
    const invoke = jest.fn(async () => ({
      data: {
        bindingToken: 'opaque-binding-token',
        deviceBindingId: 'server-device-binding-a',
      },
    }));
    const port = createAccountAuthorityFirebaseInstallationBindingPort({
      invoke,
      installationId: '550e8400-e29b-41d4-a716-446655440000',
      credentials: { read: async () => null, write: async () => undefined },
    });
    const uid = parseFirebaseAuthUid('firebase-client-a');

    const first = await port.obtain(uid);
    const replay = await port.obtain(uid);

    expect(replay).toBe(first);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  test('replays a response-lost lease after restart with persisted binding credentials and no rotation', async () => {
    const credentials = memoryBindingCredentials();
    const revisionStore = memoryRevisions(null);
    const bindingInvoke = jest.fn(async () => ({
      data: {
        bindingToken: 'opaque-restart-token',
        deviceBindingId: 'server-device-binding-restart',
      },
    }));
    let committed = false;
    const leaseInvoke = jest.fn(async (_name: string, data: Readonly<Record<string, unknown>>) => {
      if (!committed) {
        committed = true;
        throw new Error('response_lost_after_commit');
      }
      return {
        data: {
          schemaVersion: 'account-authority-lease.v1',
          type: 'acquired',
          accountId: 'account-server-a',
          sessionId: 'session-server-a',
          revision: 1,
          idempotent: true,
          previousLeaseRevoked: true,
        },
      };
    });
    const uid = parseFirebaseAuthUid('firebase-client-a');
    const request = {
      firebaseAuthUid: uid,
      deviceId: parseDeviceId('device-client-a'),
      operationId: parseOperationId('operation-restart-replay'),
    };
    const first = createAccountAuthorityFirebaseLeasePort({
      invoke: leaseInvoke,
      revisionStore,
      installationBinding: createAccountAuthorityFirebaseInstallationBindingPort({
        invoke: bindingInvoke,
        installationId: '550e8400-e29b-41d4-a716-446655440000',
        credentials,
      }),
    });

    await expect(first.acquire(request)).rejects.toThrow('account_authority_lease_unavailable');
    expect(revisionStore.current()).toBeNull();

    const afterRestart = createAccountAuthorityFirebaseLeasePort({
      invoke: leaseInvoke,
      revisionStore,
      installationBinding: createAccountAuthorityFirebaseInstallationBindingPort({
        invoke: bindingInvoke,
        installationId: '550e8400-e29b-41d4-a716-446655440000',
        credentials,
      }),
    });

    await expect(afterRestart.acquire(request)).resolves.toEqual({
      accountId: parseAccountId('account-server-a'),
      sessionId: parseSessionId('session-server-a'),
      previousLeaseRevoked: true,
    });
    expect(bindingInvoke).toHaveBeenCalledTimes(1);
    expect(leaseInvoke).toHaveBeenNthCalledWith(1, 'accountAuthorityLeaseAcquire', {
      operationId: 'operation-restart-replay',
      expectedRevision: null,
      bindingToken: 'opaque-restart-token',
    });
    expect(leaseInvoke).toHaveBeenNthCalledWith(2, 'accountAuthorityLeaseAcquire', {
      operationId: 'operation-restart-replay',
      expectedRevision: null,
      bindingToken: 'opaque-restart-token',
    });
    expect(revisionStore.current()).toBe(1);
  });

  test.each([
    ['whitespace token', { bindingToken: ' raw-secret-token ', deviceBindingId: 'server-device-binding-a' }],
    ['invalid device binding id', { bindingToken: 'raw-secret-token', deviceBindingId: '../stable_id' }],
  ])('rejects persisted %s without rotating or leaking the raw token', async (_case, stored) => {
    const invoke = jest.fn(async () => { throw new Error('must_not_rotate'); });
    const port = createAccountAuthorityFirebaseInstallationBindingPort({
      invoke,
      installationId: '550e8400-e29b-41d4-a716-446655440000',
      credentials: {
        read: async () => stored,
        write: async () => { throw new Error('must_not_write'); },
      },
    });

    const failure = await port.obtain(parseFirebaseAuthUid('firebase-client-a')).catch((error: unknown) => error);

    expect(failure).toEqual(new Error('account_authority_installation_binding_unavailable'));
    expect(String(failure)).not.toContain('raw-secret-token');
    expect(JSON.stringify(failure)).not.toContain('raw-secret-token');
    expect(invoke).not.toHaveBeenCalled();
  });

  // зачем (AA S0): раньше причина сбоя привязки терялась в немом catch.
  test('logs the safe cause of an installation binding failure without leaking the token or uid', async () => {
    const invoke = jest.fn(async () => {
      throw Object.assign(new Error('raw-secret-token firebase-client-a'), { code: 'functions/unavailable' });
    });
    // зачем (AA S1): логгер теперь порт — проверяем его записи напрямую, а
    // формат строки console (с durationMs) — в тесте порта-логгера.
    const logger = { info: jest.fn(), warn: jest.fn() };
    const port = createAccountAuthorityFirebaseInstallationBindingPort({
      invoke,
      installationId: '550e8400-e29b-41d4-a716-446655440000',
      credentials: memoryBindingCredentials(),
      logger,
    });
    await expect(port.obtain(parseFirebaseAuthUid('firebase-client-a')))
      .rejects.toThrow('account_authority_installation_binding_unavailable');
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith('installation_binding obtain_failed', expect.objectContaining({
      kind: 'Error',
      code: 'unavailable',
    }));
    const everything = JSON.stringify([logger.info.mock.calls, logger.warn.mock.calls]);
    expect(everything).not.toContain('raw-secret-token');
    expect(everything).not.toContain('firebase-client-a');
    expect(everything).not.toContain('550e8400');
  });

  test('fails closed before lease acquisition when binding bootstrap is unavailable', async () => {
    const invoke = jest.fn(async () => ({ data: null }));
    const port = createAccountAuthorityFirebaseLeasePort({
      invoke,
      revisionStore: memoryRevisions(null),
      installationBinding: {
        obtain: async () => { throw new Error('account_authority_installation_binding_unavailable'); },
        readPersisted: async () => null,
      },
    });

    await expect(port.acquire({
      firebaseAuthUid: parseFirebaseAuthUid('firebase-client-a'),
      deviceId: parseDeviceId('device-client-a'),
      operationId: parseOperationId('operation-client-a'),
    })).rejects.toThrow('account_authority_lease_unavailable');
    expect(invoke).not.toHaveBeenCalled();
  });
});
