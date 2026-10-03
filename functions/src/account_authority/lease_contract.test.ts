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
  ACCOUNT_LEASE_DEFAULT_RECEIPT_MAX_ENTRIES,
  ACCOUNT_LEASE_DEFAULT_RECEIPT_RETENTION_MS,
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
    // S2a раунд 5: продление без квитанции; повтор после потерянного ответа —
    // ещё одно продление с тем же результатом, без отказа.
    expect(retried).toEqual(renewed);
    expect(harness.store.read().receiptLedger.entries).toHaveLength(1);
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

/*
 * S2a раунд 5 (HIGH, блокер cutover): журнал квитанций аренды.
 * Продление — без квитанции; переполнение — вытеснение старейших (FIFO), а не
 * отказ входа; срок хранения 60 минут, ёмкость 64.
 */
describe('bounded lease receipt ledger (S2a round 5)', () => {
  const DEVICE_B = asDeviceId('device-b');

  test('defaults: 60 minutes retention, 64 entries', () => {
    expect(ACCOUNT_LEASE_DEFAULT_RECEIPT_RETENTION_MS).toBe(60 * 60_000);
    expect(ACCOUNT_LEASE_DEFAULT_RECEIPT_MAX_ENTRIES).toBe(64);
    expect(emptyState().receiptLedger).toMatchObject({ maxEntries: 64, retentionMs: 60 * 60_000 });
  });

  test('a same-device renewal writes no receipt; a lost-response retry renews again with the same session', () => {
    const retirement = retirementFake();
    const acquired = startOrRenewAccountLease(emptyState(), command(), retirement.lookup);
    const renew = command({ operationId: asOperationId('operation-renew'), expectedRevision: 1, serverNowMs: 2_000 });
    const renewed = startOrRenewAccountLease(acquired.state, renew, retirement.lookup);
    expect(renewed.result).toMatchObject({ type: 'renewed', idempotent: false });
    expect(renewed.state.receiptLedger.entries).toHaveLength(1);
    expect(renewed.state.revision).toBe(1);
    const retried = startOrRenewAccountLease(renewed.state, renew, retirement.lookup);
    expect(retried.result.lease.sessionId).toBe(renewed.result.lease.sessionId);
    expect(retried.state.receiptLedger.entries).toHaveLength(1);
  });

  test('a renewal retry after another device took the lease is refused by expectedRevision', () => {
    const retirement = retirementFake();
    const acquired = startOrRenewAccountLease(emptyState(), command(), retirement.lookup);
    const other = startOrRenewAccountLease(acquired.state, command({
      principal: { ...command().principal, authEpoch: 2_000 },
      deviceId: DEVICE_B,
      sessionId: asSessionId('session-b'),
      operationId: asOperationId('operation-b'),
      expectedRevision: 1,
      serverNowMs: 2_000,
    }), retirement.lookup);
    other.retirements.forEach(({ sessionId }) => retirement.retired.add(sessionId));
    expect(() => startOrRenewAccountLease(other.state, command({
      operationId: asOperationId('operation-renew'), expectedRevision: 1, serverNowMs: 3_000,
    }), retirement.lookup)).toThrow(expect.objectContaining({ code: 'revision_mismatch' }));
  });

  test('overflow evicts the oldest live receipts (FIFO) instead of refusing the acquire', () => {
    const retirement = retirementFake();
    const initial = emptyState({ maxEntries: 2, retentionMs: 1_000_000 });
    const first = startOrRenewAccountLease(initial, command({ serverNowMs: 1 }), retirement.lookup);
    const released = releaseActiveAccountLease(first.state, {
      accountId: ACCOUNT_A, tenantId: TENANT_A, deviceId: DEVICE_A, sessionId: asSessionId('session-a'),
      operationId: asOperationId('release-a'), expectedRevision: 1, serverNowMs: 2,
    }, retirement.lookup);
    released.retirements.forEach(({ sessionId }) => retirement.retired.add(sessionId));
    const third = startOrRenewAccountLease(released.state, command({
      principal: { ...command().principal, authEpoch: 2_000 },
      sessionId: asSessionId('session-c'),
      operationId: asOperationId('operation-c'),
      expectedRevision: 2,
      serverNowMs: 3,
    }), retirement.lookup);
    expect(third.state.receiptLedger.entries.map((entry) => entry.operationId)).toEqual(['release-a', 'operation-c']);
    expect(third.evictedReceipts).toBe(1);
    // Повтор вытесненной операции защищён ревизией: квитанции нет, ревизия ушла вперёд.
    expect(() => startOrRenewAccountLease(third.state, command({ serverNowMs: 4 }), retirement.lookup))
      .toThrow(expect.objectContaining({ code: 'revision_mismatch' }));
  });

  test('receipts still expire after their retention', () => {
    const retirement = retirementFake();
    const initial = emptyState({ maxEntries: 2, retentionMs: 100 });
    const first = startOrRenewAccountLease(initial, command({ serverNowMs: 1 }), retirement.lookup);
    const renewed = startOrRenewAccountLease(first.state, command({
      operationId: asOperationId('operation-b'), expectedRevision: 1, serverNowMs: 102,
    }), retirement.lookup);
    expect(renewed.state.receiptLedger.entries).toHaveLength(0);
  });

  // Сторож: 2 устройства, 200 входов/продлений/выходов за сутки, из них 120 —
  // плотной пачкой за первый час (больше ёмкости журнала). Ни одного отказа.
  test('sentinel: two devices, 200 acquires/renewals/releases in 24h, zero refusals', () => {
    const retired = new Set<string>();
    const lookup: AccountRetiredSessionLookup = { isRetired: (sessionId) => retired.has(sessionId) };
    let state = emptyState();
    const devices = [DEVICE_A, DEVICE_B];
    const epochs = new Map<string, number>();
    const refusals: string[] = [];
    let session = 0;
    let renewals = 0;
    for (let step = 0; step < 200; step += 1) {
      const nowMs = step < 120 ? 10_000 + step * 25_000 : 10_000 + 3_600_000 + (step - 120) * 1_000_000;
      const device = devices[Math.floor(step / 5) % 2] as typeof DEVICE_A;
      const active = state.activeLease;
      try {
        if (active !== null && active.deviceId === device && step % 6 === 0) {
          const released = releaseActiveAccountLease(state, {
            accountId: ACCOUNT_A, tenantId: TENANT_A, deviceId: device, sessionId: active.sessionId,
            operationId: asOperationId(`release-${step}`), expectedRevision: state.revision, serverNowMs: nowMs,
          }, lookup);
          released.retirements.forEach(({ sessionId }) => retired.add(sessionId));
          state = released.state;
        } else {
          const holds = active !== null && active.deviceId === device;
          // Новый вход другого устройства идёт со свежей ротацией привязки (эпоха = сейчас).
          if (!holds) epochs.set(device, nowMs);
          if (holds) renewals += 1;
          const outcome = startOrRenewAccountLease(state, command({
            principal: { ...command().principal, authEpoch: epochs.get(device) ?? nowMs },
            deviceId: device,
            sessionId: asSessionId(`session-${session += 1}`),
            operationId: asOperationId(`operation-${step}`),
            expectedRevision: state.revision,
            serverNowMs: nowMs,
          }), lookup);
          outcome.retirements.forEach(({ sessionId }) => retired.add(sessionId));
          state = outcome.state;
        }
      } catch (error) {
        refusals.push(`${step}:${(error as { code?: string }).code ?? 'unknown'}`);
      }
      expect(state.receiptLedger.entries.length).toBeLessThanOrEqual(64);
    }
    expect(refusals).toEqual([]);
    expect(renewals).toBeGreaterThan(0);
  });
});

