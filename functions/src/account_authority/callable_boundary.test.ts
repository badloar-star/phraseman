import { readFileSync } from 'fs';
import path from 'path';
import {
  asAccountId,
  asClaimId,
  asDeviceId,
  asFirebaseAuthUid,
  asOperationId,
  asProviderSubject,
  asSessionId,
  asTenantId,
  createEmptyAccountLeaseState,
  startOrRenewAccountLease,
  type AccountLeaseState,
  type AccountRetiredSessionLookup,
  type ResolvedAccountPrincipal,
  type SessionId,
} from './lease_contract';
import {
  createEmptyDeleteContractState,
  type AccountDeleteContractState,
  type AccountDeleteTransition,
  type AccountDeleteTransactionPort,
} from './delete_contract';
import {
  AccountAuthorityCallableError,
  handleAccountDeleteBeginCallable,
  handleAccountLeaseAcquireCallable,
  handleAccountLeaseReleaseCallable,
  type AccountAuthorityCallableBoundaryPorts,
  type AccountAuthorityCallableIdentityResolution,
  type AccountAuthorityCallableRequest,
} from './callable_boundary';

const ACCOUNT_A = asAccountId('account-a');
const FIREBASE_A = asFirebaseAuthUid('firebase-a');
const PROVIDER_A = asProviderSubject('provider-a');
const TENANT_A = asTenantId('tenant-a');
const DEVICE_A = asDeviceId('device-a');
const SESSION_A = asSessionId('session-a');
const PRINCIPAL_A: ResolvedAccountPrincipal = Object.freeze({
  accountId: ACCOUNT_A,
  providerSubject: PROVIDER_A,
});

const CALLABLE_REQUEST = Object.freeze({
  auth: Object.freeze({
    uid: FIREBASE_A,
    token: Object.freeze({ auth_time: 1_000, provider_id: 'google.com' }),
  }),
  app: Object.freeze({
    appId: '1:123:ios:trusted-app',
    token: Object.freeze({ app_id: '1:123:ios:trusted-app' }),
  }),
});

function retirementStore() {
  const retired = new Set<string>();
  const lookup: AccountRetiredSessionLookup = {
    isRetired: (sessionId) => retired.has(sessionId),
  };
  return { retired, lookup };
}

function activeLeaseState(): AccountLeaseState {
  const retirements = retirementStore();
  return startOrRenewAccountLease(createEmptyAccountLeaseState(ACCOUNT_A, TENANT_A), {
    principal: Object.freeze({
      ...PRINCIPAL_A,
      tenantId: TENANT_A,
      firebaseAuthUid: FIREBASE_A,
      authEpoch: 1_000,
    }),
    deviceId: DEVICE_A,
    sessionId: SESSION_A,
    operationId: asOperationId('lease-operation-a'),
    expectedRevision: 0,
    serverNowMs: 500,
  }, retirements.lookup).state;
}

function deleteStore(initialLease = activeLeaseState()): AccountDeleteTransactionPort & {
  readDelete(): AccountDeleteContractState;
  readLease(): AccountLeaseState;
} {
  let leaseState = initialLease;
  let deleteState = createEmptyDeleteContractState(ACCOUNT_A, TENANT_A);
  const retirements = retirementStore();
  return {
    readDelete: () => deleteState,
    readLease: () => leaseState,
    async transact(identity, retirementSessionIds, transition) {
      expect(identity).toEqual({ accountId: ACCOUNT_A, tenantId: TENANT_A });
      const readable = new Set(retirementSessionIds);
      if (leaseState.activeLease !== null) readable.add(leaseState.activeLease.sessionId);
      const outcome = transition({
        leaseState,
        deleteState,
        retiredSessions: {
          isRetired(sessionId) {
            if (!readable.has(sessionId)) throw new Error('retirement_key_not_loaded');
            return retirements.retired.has(sessionId);
          },
        },
      });
      (outcome as AccountDeleteTransition<unknown>).retirements.forEach(({ sessionId }) => {
        retirements.retired.add(sessionId);
      });
      leaseState = outcome.state.leaseState;
      deleteState = outcome.state.deleteState;
      return outcome.result;
    },
  };
}

function boundaryHarness(options: Readonly<{
  identity?: AccountAuthorityCallableIdentityResolution;
  identityError?: Error;
  throwFromLeaseTransaction?: Error;
  initialLeaseState?: AccountLeaseState;
  retiredSessionIds?: readonly SessionId[];
}> = {}) {
  let leaseState = options.initialLeaseState ?? createEmptyAccountLeaseState(ACCOUNT_A, TENANT_A);
  const leaseRetirements = retirementStore();
  const deletionTransactions = deleteStore();
  const identity: AccountAuthorityCallableIdentityResolution = options.identity ?? Object.freeze({
    tenantId: TENANT_A,
    deviceId: DEVICE_A,
    authEpoch: 1_000,
    activeSessionId: SESSION_A,
  });
  options.retiredSessionIds?.forEach((sessionId) => leaseRetirements.retired.add(sessionId));
  const resolve = jest.fn(async () => {
    if (options.identityError !== undefined) throw options.identityError;
    return identity;
  });
  const releaseProviderIdentity = jest.fn(async () => undefined);
  const leaseTransact = jest.fn(async (_identity, retirementSessionIds, transition) => {
    if (options.throwFromLeaseTransaction !== undefined) throw options.throwFromLeaseTransaction;
    const readable = new Set(retirementSessionIds);
    if (leaseState.activeLease !== null) readable.add(leaseState.activeLease.sessionId);
    const outcome = transition({
      state: leaseState,
      retiredSessions: {
        isRetired(sessionId: SessionId) {
          if (!readable.has(sessionId)) throw new Error('retirement_key_not_loaded');
          return leaseRetirements.retired.has(sessionId);
        },
      },
    });
    outcome.retirements.forEach(({ sessionId }: { sessionId: SessionId }) => {
      leaseRetirements.retired.add(sessionId);
    });
    leaseState = outcome.state;
    return outcome.result;
  });
  let claim = 0;
  const ports: AccountAuthorityCallableBoundaryPorts = {
    identities: { resolve },
    lease: {
      principals: { resolvePrincipal: jest.fn(async () => PRINCIPAL_A) },
      sessions: { issueSessionId: jest.fn(async () => asSessionId('server-session-a')) },
      clock: { nowMs: () => 1_000 },
      transactions: { transact: leaseTransact },
    },
    deletion: {
      principals: { resolvePrincipal: jest.fn(async () => PRINCIPAL_A) },
      clock: { nowMs: () => 1_000 },
      claims: { issueClaimId: () => asClaimId(`claim-${++claim}`) },
      transactions: deletionTransactions,
      identity: { releaseProviderIdentity },
    },
  };
  return {
    ports,
    resolve,
    leaseTransact,
    readLease: () => leaseState,
    deletionTransactions,
    releaseProviderIdentity,
  };
}

function leaseRequest(data: unknown): AccountAuthorityCallableRequest {
  return { ...CALLABLE_REQUEST, data };
}

function deleteRequest(data: unknown): AccountAuthorityCallableRequest {
  return { ...CALLABLE_REQUEST, data };
}

function releaseRequest(data: unknown): AccountAuthorityCallableRequest {
  return { ...CALLABLE_REQUEST, data };
}

async function caught(promise: Promise<unknown>): Promise<AccountAuthorityCallableError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof AccountAuthorityCallableError) return error;
    throw error;
  }
  throw new Error('expected_rejection');
}

describe('Account Authority callable boundary', () => {
  test('remains a pure source contract and is not activated as a production callable', () => {
    const boundarySource = readFileSync(path.join(__dirname, 'callable_boundary.ts'), 'utf8');
    const indexSource = readFileSync(path.join(__dirname, '..', 'index.ts'), 'utf8');

    expect(boundarySource).not.toMatch(/firebase-admin|firebase-functions|\bonCall\s*\(/);
    expect(indexSource).not.toMatch(/account_authority\/callable_boundary/);
  });

  test('requires valid Firebase auth metadata and validates optional App Check metadata before resolution', async () => {
    const test = boundaryHarness();
    const missing = await caught(handleAccountLeaseAcquireCallable(test.ports, {
      auth: null,
      data: { operationId: 'operation-a', expectedRevision: 0, bindingToken: 'binding-token-a' },
    }));
    const malformedApp = await caught(handleAccountLeaseAcquireCallable(test.ports, {
      ...CALLABLE_REQUEST,
      app: { appId: '../spoof', token: {} },
      data: { operationId: 'operation-a', expectedRevision: 0, bindingToken: 'binding-token-a' },
    }));

    expect({ code: missing.code, message: missing.message }).toEqual({
      code: 'unauthenticated',
      message: 'account_authority_auth_required',
    });
    expect({ code: malformedApp.code, message: malformedApp.message }).toEqual({
      code: 'unauthenticated',
      message: 'account_authority_auth_invalid',
    });
    expect(test.resolve).not.toHaveBeenCalled();
    expect(test.leaseTransact).not.toHaveBeenCalled();
  });

  test('rejects every client-supplied account, device, provider, tenant, or session ownership field', async () => {
    const forbidden = [
      'accountId',
      'deviceId',
      'firebaseAuthUid',
      'providerSubject',
      'tenantId',
      'sessionId',
    ] as const;

    for (const field of forbidden) {
      const test = boundaryHarness();
      const error = await caught(handleAccountLeaseAcquireCallable(test.ports, leaseRequest({
        operationId: 'operation-a',
        expectedRevision: 0,
        bindingToken: 'binding-token-a',
        [field]: 'spoofed-owner',
      })));
      expect({ field, code: error.code, message: error.message }).toEqual({
        field,
        code: 'invalid-argument',
        message: 'account_authority_request_invalid',
      });
      expect(test.resolve).not.toHaveBeenCalled();
      expect(test.leaseTransact).not.toHaveBeenCalled();
    }
  });

  test('maps a lease request through trusted callable identity and returns only the public authority receipt', async () => {
    const test = boundaryHarness();
    const result = await handleAccountLeaseAcquireCallable(test.ports, leaseRequest({
      operationId: 'operation-a',
      expectedRevision: 0,
      bindingToken: 'binding-token-a',
    }));

    expect(test.resolve).toHaveBeenCalledWith(
      {
        firebaseAuthUid: FIREBASE_A,
        authToken: CALLABLE_REQUEST.auth.token,
        app: {
          appId: CALLABLE_REQUEST.app.appId,
          token: CALLABLE_REQUEST.app.token,
        },
      },
      'binding-token-a',
    );
    expect(result).toEqual({
      schemaVersion: 'account-authority-lease.v1',
      type: 'acquired',
      accountId: ACCOUNT_A,
      sessionId: asSessionId('server-session-a'),
      revision: 1,
      idempotent: false,
      previousLeaseRevoked: false,
    });
    expect(JSON.stringify(result)).not.toMatch(/firebase-a|provider-a|tenant-a|device-a/);
  });

  test('derives the active delete session from the trusted resolver and rejects a client session claim', async () => {
    const rejected = boundaryHarness();
    const spoof = await caught(handleAccountDeleteBeginCallable(rejected.ports, deleteRequest({
      operationId: 'delete-operation-a',
      expectedRevision: 1,
      sessionId: 'session-a',
    })));
    expect({ code: spoof.code, message: spoof.message }).toEqual({
      code: 'invalid-argument',
      message: 'account_authority_request_invalid',
    });
    expect(rejected.resolve).not.toHaveBeenCalled();

    const test = boundaryHarness();
    const result = await handleAccountDeleteBeginCallable(test.ports, deleteRequest({
      operationId: 'delete-operation-a',
      expectedRevision: 1,
    }));

    expect(result).toMatchObject({
      schemaVersion: 'account-authority-delete.v1',
      status: 'purge_queued',
    });
    expect(result.jobId).toMatch(/^aadel_[0-9a-f]{40}$/);
    expect(test.deletionTransactions.readLease()).toMatchObject({
      activeLease: null,
      lifecycle: { status: 'deleting', jobId: result.jobId },
    });
    expect(test.releaseProviderIdentity).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toMatch(/"(?:account-a|firebase-a|provider-a|tenant-a|device-a|session-a)"/);
  });

  test('fails closed when the trusted resolver returns malformed identity data', async () => {
    const test = boundaryHarness({
      identity: {
        tenantId: TENANT_A,
        deviceId: '../spoof-device' as never,
        authEpoch: 1_000,
        activeSessionId: SESSION_A,
      },
    });
    const error = await caught(handleAccountLeaseAcquireCallable(test.ports, leaseRequest({
      operationId: 'operation-a', expectedRevision: 0, bindingToken: 'binding-token-a',
    })));

    expect({ code: error.code, message: error.message }).toEqual({
      code: 'internal',
      message: 'account_authority_unavailable',
    });
    expect(test.leaseTransact).not.toHaveBeenCalled();
  });

  test('redacts pure-contract and unexpected adapter errors without exposing identifiers or raw messages', async () => {
    const stale = boundaryHarness();
    const staleError = await caught(handleAccountDeleteBeginCallable(stale.ports, deleteRequest({
      operationId: 'delete-operation-a', expectedRevision: 0,
    })));
    expect({ code: staleError.code, message: staleError.message }).toEqual({
      code: 'failed-precondition',
      message: 'account_authority_request_rejected',
    });

    const raw = boundaryHarness({
      throwFromLeaseTransaction: new Error('secret path users/account-a provider-a'),
    });
    const rawError = await caught(handleAccountLeaseAcquireCallable(raw.ports, leaseRequest({
      operationId: 'operation-a', expectedRevision: 0, bindingToken: 'binding-token-a',
    })));
    expect({ code: rawError.code, message: rawError.message }).toEqual({
      code: 'internal',
      message: 'account_authority_unavailable',
    });
    expect(JSON.stringify(rawError)).not.toMatch(/users\/account-a|provider-a|secret path/);
  });

  test('accepts only the exact binding-token lease payload', async () => {
    for (const data of [
      { operationId: 'operation-a', expectedRevision: 0 },
      { operationId: 'operation-a', expectedRevision: 0, bindingToken: '' },
      { operationId: 'operation-a', expectedRevision: 0, bindingToken: 'binding-token-a', deviceId: 'spoof' },
    ]) {
      const test = boundaryHarness();
      await expect(handleAccountLeaseAcquireCallable(test.ports, leaseRequest(data)))
        .rejects.toMatchObject({
          code: 'invalid-argument',
          message: 'account_authority_request_invalid',
        });
      expect(test.resolve).not.toHaveBeenCalled();
    }
  });

  test('explicit null bootstrap uses the current server revision instead of inventing revision zero', async () => {
    const existing = activeLeaseState();
    const test = boundaryHarness({
      initialLeaseState: existing,
      identity: Object.freeze({
        tenantId: TENANT_A,
        deviceId: asDeviceId('device-b'),
        authEpoch: 2_000,
      }),
    });

    await expect(handleAccountLeaseAcquireCallable(test.ports, leaseRequest({
      operationId: 'operation-b',
      expectedRevision: null,
      bindingToken: 'binding-token-b',
    }))).resolves.toMatchObject({
      type: 'acquired',
      revision: 2,
      previousLeaseRevoked: true,
    });
  });

  test('replays an explicit null bootstrap operation idempotently after response loss', async () => {
    const test = boundaryHarness();
    const request = leaseRequest({
      operationId: 'operation-bootstrap-a',
      expectedRevision: null,
      bindingToken: 'binding-token-a',
    });

    const first = await handleAccountLeaseAcquireCallable(test.ports, request);
    const replay = await handleAccountLeaseAcquireCallable(test.ports, request);

    expect(first).toMatchObject({ type: 'acquired', revision: 1, idempotent: false });
    expect(replay).toMatchObject({ type: 'acquired', revision: 1, idempotent: true });
  });

  test('accepts only the exact release payload and rejects client-derived identity fields', async () => {
    const forbidden = [
      'accountId',
      'deviceId',
      'firebaseAuthUid',
      'providerSubject',
      'tenantId',
      'stable_id',
      'auth_time',
    ] as const;
    for (const field of forbidden) {
      const test = boundaryHarness({ initialLeaseState: activeLeaseState() });
      await expect(handleAccountLeaseReleaseCallable(test.ports, releaseRequest({
        operationId: 'release-operation-a',
        expectedRevision: 1,
        sessionId: SESSION_A,
        bindingToken: 'binding-token-a',
        [field]: 'spoofed-owner',
      }))).rejects.toMatchObject({
        code: 'invalid-argument',
        message: 'account_authority_request_invalid',
      });
      expect(test.resolve).not.toHaveBeenCalled();
      expect(test.leaseTransact).not.toHaveBeenCalled();
    }
  });

  test('releases only the server-resolved active session and advances the durable revision', async () => {
    const test = boundaryHarness({ initialLeaseState: activeLeaseState() });
    const result = await handleAccountLeaseReleaseCallable(test.ports, releaseRequest({
      operationId: 'release-operation-a',
      expectedRevision: 1,
      sessionId: SESSION_A,
      bindingToken: 'binding-token-a',
    }));

    expect(test.resolve).toHaveBeenCalledWith(expect.objectContaining({
      firebaseAuthUid: FIREBASE_A,
    }), 'binding-token-a');
    expect(result).toEqual({
      schemaVersion: 'account-authority-lease-release.v1',
      type: 'released',
      revision: 2,
      idempotent: false,
    });
    expect(test.readLease()).toMatchObject({ revision: 2, activeLease: null });
    expect(JSON.stringify(result)).not.toMatch(/"(?:account-a|session-a|device-a|firebase-a|provider-a|tenant-a)"/);
  });

  test('replays release idempotently after response loss without advancing revision twice', async () => {
    const test = boundaryHarness({ initialLeaseState: activeLeaseState() });
    const request = releaseRequest({
      operationId: 'release-operation-a',
      expectedRevision: 1,
      sessionId: SESSION_A,
      bindingToken: 'binding-token-a',
    });

    const first = await handleAccountLeaseReleaseCallable(test.ports, request);
    const replay = await handleAccountLeaseReleaseCallable(test.ports, request);

    expect(first).toMatchObject({ revision: 2, idempotent: false });
    expect(replay).toMatchObject({ revision: 2, idempotent: true });
    expect(test.readLease().revision).toBe(2);
  });

  test.each([
    ['wrong session', Object.freeze({
      identity: Object.freeze({
        tenantId: TENANT_A,
        deviceId: DEVICE_A,
        authEpoch: 1_000,
        activeSessionId: SESSION_A,
      }),
      requestedSessionId: asSessionId('session-spoofed'),
      retiredSessionIds: Object.freeze([]),
    })],
    ['revoked session', Object.freeze({
      identity: Object.freeze({
        tenantId: TENANT_A,
        deviceId: DEVICE_A,
        authEpoch: 1_000,
        activeSessionId: SESSION_A,
      }),
      requestedSessionId: SESSION_A,
      retiredSessionIds: Object.freeze([SESSION_A]),
    })],
  ] as const)('rejects a %s without leaking authority details', async (_name, options) => {
    const test = boundaryHarness({
      identity: options.identity,
      initialLeaseState: activeLeaseState(),
      retiredSessionIds: options.retiredSessionIds,
    });
    await expect(handleAccountLeaseReleaseCallable(test.ports, releaseRequest({
      operationId: 'release-operation-a',
      expectedRevision: 1,
      sessionId: options.requestedSessionId,
      bindingToken: 'binding-token-a',
    }))).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'account_authority_request_rejected',
    });
  });

  test('preserves a public unknown-token rejection from the trusted binding resolver', async () => {
    const test = boundaryHarness({
      initialLeaseState: activeLeaseState(),
      identityError: new AccountAuthorityCallableError(
        'failed-precondition',
        'account_authority_request_rejected',
      ),
    });
    await expect(handleAccountLeaseReleaseCallable(test.ports, releaseRequest({
      operationId: 'release-operation-a',
      expectedRevision: 1,
      sessionId: SESSION_A,
      bindingToken: 'unknown-binding-token',
    }))).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'account_authority_request_rejected',
    });
    expect(test.leaseTransact).not.toHaveBeenCalled();
  });
});
