import {
  asAccountId,
  asDeviceId,
  asFirebaseAuthUid,
  asOperationId,
  asProviderSubject,
  asSessionId,
  asTenantId,
  createEmptyAccountLeaseState,
  releaseActiveAccountLease,
  startOrRenewAccountLease,
  verifiedAuthContext,
  type AccountLeaseState,
  type AccountRetiredSessionLookup,
  type ResolvedAccountPrincipal,
} from './lease_contract';
import {
  acquireAuthenticatedAccountLease,
  type AccountLeaseHandlerPorts,
  type AccountLeaseTransactionPort,
} from './lease_handlers';

const ACCOUNT_A = asAccountId('account-a');
const FIREBASE_A = asFirebaseAuthUid('firebase-a');
const PROVIDER_A = asProviderSubject('provider-a');
const TENANT_A = asTenantId('tenant-a');
const DEVICE_A = asDeviceId('device-a');
const PRINCIPAL_A: ResolvedAccountPrincipal = Object.freeze({
  accountId: ACCOUNT_A,
  providerSubject: PROVIDER_A,
});

function emptyState(policy: Readonly<{ maxEntries?: number; retentionMs?: number }> = {}) {
  return createEmptyAccountLeaseState(ACCOUNT_A, TENANT_A, policy);
}

function retirementFake(initial: readonly string[] = []) {
  const retired = new Set(initial);
  const lookup: AccountRetiredSessionLookup = {
    isRetired: (sessionId) => retired.has(sessionId),
  };
  return { retired, lookup };
}

function leaseStore(initial = emptyState()): AccountLeaseTransactionPort & {
  read(): AccountLeaseState;
  isRetired(sessionId: string): boolean;
  retirementReads(): readonly string[];
} {
  let state = initial;
  const retirements = retirementFake();
  const retirementReads: string[] = [];
  return {
    read: () => state,
    isRetired: (sessionId) => retirements.retired.has(sessionId),
    retirementReads: () => retirementReads,
    async transact(identity, retirementSessionIds, transition) {
      expect(identity).toEqual({ accountId: ACCOUNT_A, tenantId: TENANT_A });
      const loaded = new Set(retirementSessionIds);
      if (state.activeLease !== null) loaded.add(state.activeLease.sessionId);
      const keyedLookup: AccountRetiredSessionLookup = {
        isRetired(sessionId) {
          if (!loaded.has(sessionId)) throw new Error(`unloaded_retirement_key:${sessionId}`);
          retirementReads.push(sessionId);
          return retirements.retired.has(sessionId);
        },
      };
      const outcome = transition({ state, retiredSessions: keyedLookup });
      outcome.retirements.forEach(({ sessionId }) => retirements.retired.add(sessionId));
      state = outcome.state;
      return outcome.result;
    },
  };
}

function handlerHarness(options: Readonly<{
  authEpoch?: number;
  nowMs?: number;
  sessions?: string[];
}> = {}) {
  let authEpoch = options.authEpoch ?? 1_000;
  let nowMs = options.nowMs ?? 1_000;
  let trustedDeviceId = DEVICE_A;
  const sessions = [...(options.sessions ?? ['server-session-a', 'server-session-b', 'server-session-c'])];
  const store = leaseStore();
  const ports: AccountLeaseHandlerPorts<unknown> = {
    auth: {
      async requireAuthenticated() {
        return verifiedAuthContext({
          tenantId: TENANT_A,
          firebaseAuthUid: FIREBASE_A,
          deviceId: trustedDeviceId,
          authEpoch,
        });
      },
    },
    principals: { resolvePrincipal: jest.fn(async () => PRINCIPAL_A) },
    sessions: {
      issueSessionId: jest.fn(async () => asSessionId(sessions.shift() ?? 'server-session-fallback')),
    },
    clock: { nowMs: () => nowMs },
    transactions: store,
  };
  return {
    ports,
    store,
    setAuthEpoch(value: number) { authEpoch = value; },
    setNowMs(value: number) { nowMs = value; },
    setTrustedDevice(value: string) { trustedDeviceId = asDeviceId(value); },
  };
}

function command(overrides: Partial<Parameters<typeof startOrRenewAccountLease>[1]> = {}) {
  return {
    principal: {
      ...PRINCIPAL_A,
      tenantId: TENANT_A,
      firebaseAuthUid: FIREBASE_A,
      authEpoch: 1_000,
    },
    deviceId: DEVICE_A,
    sessionId: asSessionId('session-a'),
    operationId: asOperationId('operation-a'),
    expectedRevision: 0,
    serverNowMs: 1_000,
    ...overrides,
  };
}

describe('Account Authority authenticated lease handler', () => {
  test('derives ownership and device identity from trusted server ports and issues the session server-side', async () => {
    const harness = handlerHarness({ sessions: ['server-session'] });
    const maliciousRequest = {
      operationId: 'operation-a',
      expectedRevision: 0,
      accountId: 'spoof-account',
      firebaseAuthUid: 'spoof-firebase',
      providerSubject: 'spoof-provider',
      deviceId: 'spoof-device',
      candidateSessionId: 'caller-session',
    } as never;

    const result = await acquireAuthenticatedAccountLease(harness.ports, {}, maliciousRequest);

    expect(result.lease).toMatchObject({
      accountId: ACCOUNT_A,
      tenantId: TENANT_A,
      firebaseAuthUid: FIREBASE_A,
      providerSubject: PROVIDER_A,
      deviceId: DEVICE_A,
      sessionId: asSessionId('server-session'),
    });
    expect(result.lease.deviceId).not.toBe('spoof-device');
    expect(result.lease.sessionId).not.toBe('caller-session');
  });

  test('caller cannot impersonate the active device when trusted context identifies another device', async () => {
    const harness = handlerHarness();
    await acquireAuthenticatedAccountLease(harness.ports, {}, {
      operationId: 'operation-a', expectedRevision: 0,
    });
    harness.setTrustedDevice('device-b');
    harness.setAuthEpoch(2_000);
    harness.setNowMs(2_000);

    const takeover = await acquireAuthenticatedAccountLease(harness.ports, {}, {
      operationId: 'operation-b', expectedRevision: 1, deviceId: 'device-a',
    } as never);

    expect(takeover.lease.deviceId).toBe(asDeviceId('device-b'));
    expect(takeover.revokedLease?.deviceId).toBe(DEVICE_A);
  });

  test('transaction adapter performs keyed retirement reads for issued and active sessions only', async () => {
    const harness = handlerHarness();
    await acquireAuthenticatedAccountLease(harness.ports, {}, {
      operationId: 'operation-a', expectedRevision: 0,
    });
    harness.setTrustedDevice('device-b');
    harness.setAuthEpoch(2_000);
    harness.setNowMs(2_000);

    await acquireAuthenticatedAccountLease(harness.ports, {}, {
      operationId: 'operation-b', expectedRevision: 1,
    });

    expect(new Set(harness.store.retirementReads())).toEqual(new Set([
      'server-session-a',
      'server-session-b',
    ]));
  });

  test('renews the trusted same device idempotently without rotating session', async () => {
    const harness = handlerHarness();
    const first = await acquireAuthenticatedAccountLease(harness.ports, {}, {
      operationId: 'operation-a', expectedRevision: 0,
    });
    harness.setNowMs(2_000);
    const renewed = await acquireAuthenticatedAccountLease(harness.ports, {}, {
      operationId: 'operation-renew', expectedRevision: 1,
    });
    const retried = await acquireAuthenticatedAccountLease(harness.ports, {}, {
      operationId: 'operation-renew', expectedRevision: 1,
    });

    expect(renewed.lease.sessionId).toBe(first.lease.sessionId);
    expect(retried).toEqual({ ...renewed, idempotent: true });
  });

  test('revoked device cannot reacquire with stale revision or auth epoch', async () => {
    const harness = handlerHarness();
    await acquireAuthenticatedAccountLease(harness.ports, {}, {
      operationId: 'operation-a', expectedRevision: 0,
    });
    harness.setTrustedDevice('device-b');
    harness.setAuthEpoch(2_000);
    harness.setNowMs(2_000);
    await acquireAuthenticatedAccountLease(harness.ports, {}, {
      operationId: 'operation-b', expectedRevision: 1,
    });
    expect(harness.store.isRetired('server-session-a')).toBe(true);

    harness.setTrustedDevice('device-a');
    harness.setAuthEpoch(1_000);
    harness.setNowMs(3_000);
    await expect(acquireAuthenticatedAccountLease(harness.ports, {}, {
      operationId: 'operation-c', expectedRevision: 1,
    })).rejects.toMatchObject({ code: 'revision_mismatch' });
    await expect(acquireAuthenticatedAccountLease(harness.ports, {}, {
      operationId: 'operation-d', expectedRevision: 2,
    })).rejects.toMatchObject({ code: 'stale_auth_epoch' });
  });
});

describe('persistent lifecycle, tenant, and keyed retirement contract', () => {
  test.each(['deleting', 'deleted'] as const)(
    'rejects acquisition while lifecycle is %s even with no active lease',
    (status) => {
      const retirement = retirementFake();
      const state: AccountLeaseState = Object.freeze({
        ...emptyState(),
        lifecycle: Object.freeze({ status, jobId: 'job-a', changedAtMs: 1_000 }),
      });
      expect(() => startOrRenewAccountLease(state, command(), retirement.lookup))
        .toThrow(expect.objectContaining({ code: 'account_lifecycle_blocked' }));
    },
  );

  test('checks persistent tenant identity even when active lease is null', () => {
    const retirement = retirementFake();
    expect(() => startOrRenewAccountLease(emptyState(), command({
      principal: {
        ...PRINCIPAL_A,
        tenantId: asTenantId('tenant-b'),
        firebaseAuthUid: FIREBASE_A,
        authEpoch: 2_000,
      },
    }), retirement.lookup)).toThrow(expect.objectContaining({ code: 'identity_mismatch' }));
  });

  test('emits one keyed retirement operation and never materializes retired sessions in lease state', () => {
    const retirement = retirementFake();
    const first = startOrRenewAccountLease(emptyState(), command(), retirement.lookup);
    const released = releaseActiveAccountLease(first.state, {
      accountId: ACCOUNT_A,
      tenantId: TENANT_A,
      deviceId: DEVICE_A,
      sessionId: asSessionId('session-a'),
      operationId: asOperationId('release-a'),
      expectedRevision: 1,
      serverNowMs: 2_000,
    }, retirement.lookup);

    expect(released.retirements).toEqual([
      { type: 'retire_session', sessionId: asSessionId('session-a') },
    ]);
    expect(released.state).not.toHaveProperty('retiredSessionIds');
  });

  test('rejects a server-generated session when keyed durable lookup says it was retired', () => {
    const retirement = retirementFake(['retired-session']);
    expect(() => startOrRenewAccountLease(emptyState(), command({
      sessionId: asSessionId('retired-session'),
    }), retirement.lookup)).toThrow(expect.objectContaining({ code: 'session_reused' }));
  });
});

describe('bounded lease receipt ledger', () => {
  test('refuses overflow and permits reuse only after declared expiry', () => {
    const retirement = retirementFake();
    const initial = emptyState({ maxEntries: 2, retentionMs: 100 });
    const first = startOrRenewAccountLease(initial, command({ serverNowMs: 1 }), retirement.lookup);
    const second = startOrRenewAccountLease(first.state, command({
      operationId: asOperationId('operation-b'), expectedRevision: 1, serverNowMs: 2,
    }), retirement.lookup);
    expect(() => startOrRenewAccountLease(second.state, command({
      operationId: asOperationId('operation-c'), expectedRevision: 1, serverNowMs: 50,
    }), retirement.lookup)).toThrow(expect.objectContaining({ code: 'receipt_capacity_exhausted' }));

    const afterExpiry = startOrRenewAccountLease(second.state, command({
      operationId: asOperationId('operation-c'), expectedRevision: 1, serverNowMs: 102,
    }), retirement.lookup);
    expect(afterExpiry.state.receiptLedger.entries).toHaveLength(1);
  });
});
