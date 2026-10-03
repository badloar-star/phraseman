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
  verifiedAuthContext,
  type AccountLeaseState,
  type AccountRetiredSessionLookup,
  type ResolvedAccountPrincipal,
} from './lease_contract';
import {
  ACCOUNT_DELETE_IDENTITY_MAX_ATTEMPTS,
  ACCOUNT_DELETE_PURGE_MAX_ATTEMPTS,
  ACCOUNT_DELETE_PURGE_MAX_ITEMS_PER_RUN,
  ACCOUNT_DELETE_RECEIPT_RETENTION_MS,
  ACCOUNT_DELETE_WORKER_CLAIM_MS,
  beginAuthenticatedAccountDeletion,
  createEmptyDeleteContractState,
  runBoundedDeletePurge,
  runIdentityReleaseAttempt,
  sweepExpiredAccountDeleteJob,
  type AccountDeleteContractState,
  type AccountDeleteHandlerPorts,
  type AccountDeletePurgePort,
  type AccountDeleteTransition,
  type AccountDeleteTransactionPort,
  type ProviderIdentityReleasePort,
} from './delete_contract';

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

function retirementFake(initial: readonly string[] = []) {
  const retired = new Set(initial);
  const lookup: AccountRetiredSessionLookup = {
    isRetired: (sessionId) => retired.has(sessionId),
  };
  return { retired, lookup };
}

function activeLease(): AccountLeaseState {
  const retired = retirementFake();
  return startOrRenewAccountLease(createEmptyAccountLeaseState(ACCOUNT_A, TENANT_A), {
    principal: {
      ...PRINCIPAL_A,
      tenantId: TENANT_A,
      firebaseAuthUid: FIREBASE_A,
      authEpoch: 1_000,
    },
    deviceId: DEVICE_A,
    sessionId: SESSION_A,
    operationId: asOperationId('lease-operation-a'),
    expectedRevision: 0,
    serverNowMs: 500,
  }, retired.lookup).state;
}

function deleteStore(initialLease = activeLease()): AccountDeleteTransactionPort & {
  read(): AccountDeleteContractState;
  readLease(): AccountLeaseState;
  isRetired(sessionId: string): boolean;
  expiryAt(jobId: string): number | undefined;
  failNextCommitWhen(predicate: (outcome: AccountDeleteTransition<unknown>) => boolean): void;
} {
  let deleteState = createEmptyDeleteContractState(ACCOUNT_A, TENANT_A);
  let leaseState = initialLease;
  const retirements = retirementFake();
  const expirySchedules = new Map<string, number>();
  let failNextCommit: ((outcome: AccountDeleteTransition<unknown>) => boolean) | null = null;
  return {
    read: () => deleteState,
    readLease: () => leaseState,
    isRetired: (sessionId) => retirements.retired.has(sessionId),
    expiryAt: (jobId) => expirySchedules.get(jobId),
    failNextCommitWhen(predicate) { failNextCommit = predicate; },
    async transact(identity, retirementSessionIds, transition) {
      expect(identity).toEqual({ accountId: ACCOUNT_A, tenantId: TENANT_A });
      const loaded = new Set(retirementSessionIds);
      if (leaseState.activeLease !== null) loaded.add(leaseState.activeLease.sessionId);
      const keyedLookup: AccountRetiredSessionLookup = {
        isRetired(sessionId) {
          if (!loaded.has(sessionId)) throw new Error(`unloaded_retirement_key:${sessionId}`);
          return retirements.retired.has(sessionId);
        },
      };
      const outcome = transition({
        leaseState,
        deleteState,
        retiredSessions: keyedLookup,
      });
      if (failNextCommit?.(outcome)) {
        failNextCommit = null;
        throw new Error('injected_commit_failure');
      }
      outcome.retirements.forEach(({ sessionId }) => retirements.retired.add(sessionId));
      outcome.expirySchedules.forEach(({ jobId, expiresAtMs }) => {
        expirySchedules.set(jobId, expiresAtMs);
      });
      leaseState = outcome.state.leaseState;
      deleteState = outcome.state.deleteState;
      return outcome.result;
    },
  };
}

function harness(identity: ProviderIdentityReleasePort) {
  let nowMs = 1_000;
  let claimSequence = 0;
  let trustedDeviceId = DEVICE_A;
  const store = deleteStore();
  const ports: AccountDeleteHandlerPorts<unknown> = {
    auth: {
      async requireAuthenticated() {
        return verifiedAuthContext({
          tenantId: TENANT_A,
          firebaseAuthUid: FIREBASE_A,
          deviceId: trustedDeviceId,
          authEpoch: 1_000,
        });
      },
    },
    principals: { resolvePrincipal: jest.fn(async () => PRINCIPAL_A) },
    clock: { nowMs: () => nowMs },
    claims: { issueClaimId: jest.fn(() => asClaimId(`claim-${++claimSequence}`)) },
    transactions: store,
    identity,
  };
  return {
    ports,
    store,
    setNowMs(value: number) { nowMs = value; },
    setTrustedDevice(value: string) { trustedDeviceId = asDeviceId(value); },
  };
}

const DELETE_REQUEST = Object.freeze({
  sessionId: 'session-a',
  operationId: 'delete-operation-a',
  expectedRevision: 1,
});

function workerRequest(jobId: string) {
  return { accountId: ACCOUNT_A, tenantId: TENANT_A, jobId };
}

async function waitForClaim(test: ReturnType<typeof harness>): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (test.store.read().job?.identityReleaseClaim != null) return;
    await Promise.resolve();
  }
  throw new Error('identity claim was not acquired');
}

describe('authenticated account deletion lifecycle and provider release', () => {
  test('releases provider identity before the authenticated delete call returns', async () => {
    const events: string[] = [];
    const identity: ProviderIdentityReleasePort = {
      async releaseProviderIdentity(request) {
        events.push(`released:${request.idempotencyKey}`);
      },
    };
    const test = harness(identity);

    const job = await beginAuthenticatedAccountDeletion(test.ports, {}, DELETE_REQUEST);
    events.push(`returned:${job.status}`);

    expect(events).toEqual([
      `released:identity_release:${job.jobId}`,
      'returned:purge_queued',
    ]);
    expect(job.pendingProviderIdentity).toBeNull();
  });

  test('atomically fences the lease and persists a tenant-scoped deleting tombstone with the job', async () => {
    let release!: () => void;
    const identity: ProviderIdentityReleasePort = {
      releaseProviderIdentity: jest.fn(() => new Promise<void>((resolve) => { release = resolve; })),
    };
    const test = harness(identity);
    const deleting = beginAuthenticatedAccountDeletion(test.ports, {}, {
      ...DELETE_REQUEST,
      deviceId: 'spoof-device',
      accountId: 'spoof-account',
      providerSubject: 'spoof-provider',
    } as never);
    await waitForClaim(test);

    const job = test.store.read().job!;
    expect(test.store.readLease()).toMatchObject({
      tenantId: TENANT_A,
      activeLease: null,
      lifecycle: { status: 'deleting', jobId: job.jobId, changedAtMs: 1_000 },
    });
    expect(test.store.isRetired(SESSION_A)).toBe(true);
    expect(job.deviceId).toBe(DEVICE_A);
    expect(job.pendingProviderIdentity).toMatchObject({ providerSubject: PROVIDER_A });

    release();
    await deleting;
  });

  test('rejects deletion when caller tries to impersonate the active device through request data', async () => {
    const identity: ProviderIdentityReleasePort = {
      releaseProviderIdentity: jest.fn(async () => undefined),
    };
    const test = harness(identity);
    test.setTrustedDevice('device-b');

    await expect(beginAuthenticatedAccountDeletion(test.ports, {}, {
      ...DELETE_REQUEST,
      deviceId: 'device-a',
    } as never)).rejects.toMatchObject({ code: 'stale_lease' });
    expect(identity.releaseProviderIdentity).not.toHaveBeenCalled();
  });

  test('uses one stable server job across authenticated retries', async () => {
    const identity: ProviderIdentityReleasePort = {
      releaseProviderIdentity: jest.fn(async () => undefined),
    };
    const test = harness(identity);
    const first = await beginAuthenticatedAccountDeletion(test.ports, {}, DELETE_REQUEST);
    test.setNowMs(2_000);
    const retried = await beginAuthenticatedAccountDeletion(test.ports, {}, {
      ...DELETE_REQUEST,
      operationId: 'different-client-retry',
      expectedRevision: 2,
    });

    expect(retried.jobId).toBe(first.jobId);
    expect(retried.createdAtMs).toBe(first.createdAtMs);
    expect(identity.releaseProviderIdentity).toHaveBeenCalledTimes(1);
  });

  test('reclaims an expired identity claim without counting the abandoned claim as a completed failure', async () => {
    let releaseFirst!: () => void;
    const identity: ProviderIdentityReleasePort = {
      releaseProviderIdentity: jest.fn()
        .mockImplementationOnce(() => new Promise<void>((resolve) => { releaseFirst = resolve; }))
        .mockRejectedValueOnce(new Error('replacement-failed')),
    };
    const test = harness(identity);
    const first = beginAuthenticatedAccountDeletion(test.ports, {}, DELETE_REQUEST);
    await waitForClaim(test);
    const jobId = test.store.read().job!.jobId;
    expect(test.store.read().job).toMatchObject({
      identityReleaseAttemptsStarted: 1,
      identityReleaseAttemptsCompleted: 0,
      identityReleaseFailuresCompleted: 0,
    });

    test.setNowMs(1_000 + ACCOUNT_DELETE_WORKER_CLAIM_MS);
    const replacement = await runIdentityReleaseAttempt(test.ports, workerRequest(jobId));
    expect(replacement.type).toBe('retry_scheduled');
    expect(replacement.job).toMatchObject({
      status: 'identity_release_pending',
      identityReleaseAttemptsStarted: 2,
      identityReleaseAttemptsCompleted: 1,
      identityReleaseFailuresCompleted: 1,
    });

    releaseFirst();
    const recovered = await first;
    expect(recovered).toMatchObject({ status: 'purge_queued', pendingProviderIdentity: null });
  });

  test('does not convert provider success into a provider failure when success persistence fails', async () => {
    const identity: ProviderIdentityReleasePort = {
      releaseProviderIdentity: jest.fn(async () => undefined),
    };
    const test = harness(identity);
    test.store.failNextCommitWhen((outcome) => (
      outcome.state.deleteState.job?.status === 'purge_queued'
    ));

    await expect(beginAuthenticatedAccountDeletion(test.ports, {}, DELETE_REQUEST))
      .rejects.toThrow('injected_commit_failure');
    const recoverable = test.store.read().job!;
    expect(recoverable).toMatchObject({
      status: 'identity_release_pending',
      identityReleaseAttemptsStarted: 1,
      identityReleaseAttemptsCompleted: 0,
      identityReleaseFailuresCompleted: 0,
    });
    expect(recoverable.identityReleaseClaim).not.toBeNull();

    test.setNowMs(1_000 + ACCOUNT_DELETE_WORKER_CLAIM_MS);
    const recovered = await runIdentityReleaseAttempt(test.ports, workerRequest(recoverable.jobId));

    expect(recovered).toMatchObject({
      type: 'released',
      job: {
        status: 'purge_queued',
        identityReleaseAttemptsCompleted: 1,
        identityReleaseFailuresCompleted: 0,
      },
    });
    const keys = jest.mocked(identity.releaseProviderIdentity).mock.calls
      .map(([request]) => request.idempotencyKey);
    expect(keys).toEqual([
      `identity_release:${recoverable.jobId}`,
      `identity_release:${recoverable.jobId}`,
    ]);
  });

  test('bounds completed provider failures, independent of abandoned claims', async () => {
    const identity: ProviderIdentityReleasePort = {
      releaseProviderIdentity: jest.fn(async () => { throw new Error('still-offline'); }),
    };
    const test = harness(identity);
    let job = await beginAuthenticatedAccountDeletion(test.ports, {}, DELETE_REQUEST);
    for (let attempt = 1; attempt < ACCOUNT_DELETE_IDENTITY_MAX_ATTEMPTS; attempt += 1) {
      test.setNowMs(1_000 + attempt);
      job = (await runIdentityReleaseAttempt(test.ports, workerRequest(job.jobId))).job;
    }

    expect(job).toMatchObject({
      status: 'identity_release_failed',
      identityReleaseAttemptsCompleted: ACCOUNT_DELETE_IDENTITY_MAX_ATTEMPTS,
      identityReleaseFailuresCompleted: ACCOUNT_DELETE_IDENTITY_MAX_ATTEMPTS,
      receiptExpiresAtMs: 1_000 + ACCOUNT_DELETE_IDENTITY_MAX_ATTEMPTS - 1
        + ACCOUNT_DELETE_RECEIPT_RETENTION_MS,
    });
  });

  test('schedules and enforces no-touch retention redaction at terminal receipt expiry', async () => {
    const identity: ProviderIdentityReleasePort = {
      releaseProviderIdentity: jest.fn(async () => { throw new Error('still-offline'); }),
    };
    const test = harness(identity);
    let job = await beginAuthenticatedAccountDeletion(test.ports, {}, DELETE_REQUEST);
    for (let attempt = 1; attempt < ACCOUNT_DELETE_IDENTITY_MAX_ATTEMPTS; attempt += 1) {
      test.setNowMs(1_000 + attempt);
      job = (await runIdentityReleaseAttempt(test.ports, workerRequest(job.jobId))).job;
    }
    const calls = jest.mocked(identity.releaseProviderIdentity).mock.calls.length;
    expect(test.store.expiryAt(job.jobId)).toBe(job.receiptExpiresAtMs);
    test.setNowMs(job.receiptExpiresAtMs!);

    const expired = await sweepExpiredAccountDeleteJob(test.ports, workerRequest(job.jobId));

    expect(expired).toMatchObject({
      jobId: job.jobId,
      status: 'expired',
      pendingProviderIdentity: null,
      firstOperationId: null,
      deviceId: null,
      sessionId: null,
    });
    expect(test.store.readLease().lifecycle.status).toBe('deleting');
    expect(identity.releaseProviderIdentity).toHaveBeenCalledTimes(calls);

    const idempotent = await beginAuthenticatedAccountDeletion(test.ports, {}, DELETE_REQUEST);
    expect(idempotent).toEqual(expired);
  });
});

describe('claimed bounded async purge', () => {
  async function queuedHarness(purge: AccountDeletePurgePort) {
    const identity: ProviderIdentityReleasePort = {
      releaseProviderIdentity: jest.fn(async () => undefined),
    };
    const test = harness(identity);
    const job = await beginAuthenticatedAccountDeletion(test.ports, {}, DELETE_REQUEST);
    return { ...test, purge, job };
  }

  test('claims before the external call, caps work, and prevents duplicate concurrent calls', async () => {
    let release!: () => void;
    const purge: AccountDeletePurgePort = {
      purge: jest.fn(() => new Promise((resolve) => {
        release = () => resolve({ done: false, cursor: 'after-first', purgedItems: 5 });
      })),
    };
    const test = await queuedHarness(purge);
    test.setNowMs(2_000);
    const first = runBoundedDeletePurge(test.ports, purge, {
      ...workerRequest(test.job.jobId), maxItems: Number.MAX_SAFE_INTEGER,
    });
    await Promise.resolve();
    await Promise.resolve();

    const concurrent = await runBoundedDeletePurge(test.ports, purge, workerRequest(test.job.jobId));
    expect(concurrent.type).toBe('busy');
    expect(purge.purge).toHaveBeenCalledTimes(1);
    expect(purge.purge).toHaveBeenCalledWith(expect.objectContaining({
      maxItems: ACCOUNT_DELETE_PURGE_MAX_ITEMS_PER_RUN,
      idempotencyKey: `purge:${test.job.jobId}:1`,
    }));
    release();
    const completed = await first;
    expect(completed.job).toMatchObject({ purgeCursor: 'after-first', purgeAttempts: 1 });
  });

  test('reports stale when an expired purge claim is replaced before its completion persists', async () => {
    const releases: (() => void)[] = [];
    const purge: AccountDeletePurgePort = {
      purge: jest.fn(() => new Promise((resolve) => {
        const callNumber = releases.length + 1;
        releases.push(() => resolve({
          done: false,
          cursor: `after-${callNumber}`,
          purgedItems: 1,
        }));
      })),
    };
    const test = await queuedHarness(purge);
    test.setNowMs(2_000);
    const first = runBoundedDeletePurge(test.ports, purge, workerRequest(test.job.jobId));
    await Promise.resolve();
    await Promise.resolve();
    test.setNowMs(2_000 + ACCOUNT_DELETE_WORKER_CLAIM_MS);
    const replacement = runBoundedDeletePurge(test.ports, purge, workerRequest(test.job.jobId));
    await Promise.resolve();
    await Promise.resolve();

    releases[0]();
    await expect(first).resolves.toMatchObject({ type: 'stale' });
    releases[1]();
    await expect(replacement).resolves.toMatchObject({ type: 'progressed' });
  });

  test('reuses one stable purge idempotency key after an external failure', async () => {
    const purge: AccountDeletePurgePort = {
      purge: jest.fn()
        .mockRejectedValueOnce(new Error('purge-offline'))
        .mockResolvedValueOnce({ done: false, cursor: 'after-five', purgedItems: 5 }),
    };
    const test = await queuedHarness(purge);
    test.setNowMs(2_000);
    await runBoundedDeletePurge(test.ports, purge, workerRequest(test.job.jobId));
    test.setNowMs(3_000);
    await runBoundedDeletePurge(test.ports, purge, workerRequest(test.job.jobId));

    expect(jest.mocked(purge.purge).mock.calls.map(([request]) => request.idempotencyKey))
      .toEqual([`purge:${test.job.jobId}:1`, `purge:${test.job.jobId}:1`]);
  });

  test.each([
    [{ done: false, cursor: '', purgedItems: 1 }, 'empty cursor'],
    [{ done: false, cursor: 'x'.repeat(513), purgedItems: 1 }, 'oversized cursor'],
    [{ done: false, cursor: 'next', purgedItems: 0 }, 'no progress'],
    [{ done: true, cursor: 'unexpected', purgedItems: 1 }, 'terminal cursor'],
  ])('rejects invalid purge progress: %s (%s)', async (response) => {
    const purge: AccountDeletePurgePort = { purge: jest.fn(async () => response) };
    const test = await queuedHarness(purge);
    test.setNowMs(2_000);

    await expect(runBoundedDeletePurge(test.ports, purge, workerRequest(test.job.jobId)))
      .rejects.toThrow('account_authority_delete_purge_result_invalid');
    expect(test.store.read().job).toMatchObject({ purgeClaim: null, purgeAttempts: 0 });
  });

  test('rejects an A to B to A cursor cycle and clears the claim', async () => {
    const purge: AccountDeletePurgePort = {
      purge: jest.fn()
        .mockResolvedValueOnce({ done: false, cursor: 'A', purgedItems: 1 })
        .mockResolvedValueOnce({ done: false, cursor: 'B', purgedItems: 1 })
        .mockResolvedValueOnce({ done: false, cursor: 'A', purgedItems: 1 }),
    };
    const test = await queuedHarness(purge);
    test.setNowMs(2_000);
    await runBoundedDeletePurge(test.ports, purge, workerRequest(test.job.jobId));
    test.setNowMs(3_000);
    await runBoundedDeletePurge(test.ports, purge, workerRequest(test.job.jobId));
    test.setNowMs(4_000);

    await expect(runBoundedDeletePurge(test.ports, purge, workerRequest(test.job.jobId)))
      .rejects.toThrow('account_authority_delete_purge_cursor_cycle');
    expect(test.store.read().job).toMatchObject({
      purgeCursor: 'B', purgeClaim: null, purgeAttempts: 2, purgeFailures: 1,
    });
  });

  test('terminates after the maximum completed purge attempts without another external call', async () => {
    const purge: AccountDeletePurgePort = {
      purge: jest.fn(async ({ cursor }) => ({
        done: false,
        cursor: `cursor-${cursor === null ? 1 : Number(cursor.slice(7)) + 1}`,
        purgedItems: 1,
      })),
    };
    const test = await queuedHarness(purge);
    for (let attempt = 0; attempt < ACCOUNT_DELETE_PURGE_MAX_ATTEMPTS; attempt += 1) {
      test.setNowMs(2_000 + attempt);
      await runBoundedDeletePurge(test.ports, purge, workerRequest(test.job.jobId));
    }
    test.setNowMs(3_000 + ACCOUNT_DELETE_PURGE_MAX_ATTEMPTS);

    const terminal = await runBoundedDeletePurge(test.ports, purge, workerRequest(test.job.jobId));

    expect(terminal).toMatchObject({ type: 'terminal', job: { status: 'purge_failed' } });
    expect(purge.purge).toHaveBeenCalledTimes(ACCOUNT_DELETE_PURGE_MAX_ATTEMPTS);
    expect(test.store.readLease().lifecycle.status).toBe('deleting');
  });

  test('marks the lifecycle deleted atomically with successful purge completion', async () => {
    const purge: AccountDeletePurgePort = {
      purge: jest.fn(async () => ({ done: true, cursor: null, purgedItems: 7 })),
    };
    const test = await queuedHarness(purge);
    test.setNowMs(2_000);

    const completed = await runBoundedDeletePurge(test.ports, purge, workerRequest(test.job.jobId));

    expect(completed.job).toMatchObject({
      status: 'purged',
      completedAtMs: 2_000,
      receiptExpiresAtMs: 2_000 + ACCOUNT_DELETE_RECEIPT_RETENTION_MS,
    });
    expect(test.store.readLease().lifecycle).toEqual({
      status: 'deleted', jobId: test.job.jobId, changedAtMs: 2_000,
    });
  });

  test('rejects server clock rollback before acquiring a purge claim', async () => {
    const purge: AccountDeletePurgePort = {
      purge: jest.fn(async () => ({ done: true, cursor: null, purgedItems: 1 })),
    };
    const test = await queuedHarness(purge);
    test.setNowMs(999);

    await expect(runBoundedDeletePurge(test.ports, purge, workerRequest(test.job.jobId)))
      .rejects.toThrow('account_authority_delete_clock_rollback');
    expect(purge.purge).not.toHaveBeenCalled();
  });
});
