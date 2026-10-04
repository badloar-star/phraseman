/**
 * AA S6b: тесты на выживших мутантов контракта удаления (DC3, DC6, DC7, DC10).
 * DC2 (граница `>=` при захвате освобождения) — эквивалентен при согласованном
 * состоянии: исчерпывающая неудача сразу ставит identity_release_failed.
 */
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
  ACCOUNT_DELETE_PURGE_MAX_ITEMS_PER_RUN,
  beginAuthenticatedAccountDeletion,
  createEmptyDeleteContractState,
  runBoundedDeletePurge,
  runIdentityReleaseAttempt,
  sweepExpiredAccountDeleteJob,
  type AccountDeleteContractState,
  type AccountDeleteHandlerPorts,
  type AccountDeletePurgePort,
  type AccountDeleteTransactionPort,
  type ProviderIdentityReleasePort,
} from './delete_contract';

const ACCOUNT_A = asAccountId('account-a');
const FIREBASE_A = asFirebaseAuthUid('firebase-a');
const PROVIDER_A = asProviderSubject('provider-a');
const TENANT_A = asTenantId('tenant-a');
const DEVICE_A = asDeviceId('device-a');
const SESSION_A = asSessionId('session-a');
const PRINCIPAL_A: ResolvedAccountPrincipal = Object.freeze({ accountId: ACCOUNT_A, providerSubject: PROVIDER_A });

function activeLease(): AccountLeaseState {
  const lookup: AccountRetiredSessionLookup = { isRetired: () => false };
  return startOrRenewAccountLease(createEmptyAccountLeaseState(ACCOUNT_A, TENANT_A), {
    principal: { ...PRINCIPAL_A, tenantId: TENANT_A, firebaseAuthUid: FIREBASE_A, authEpoch: 1_000 },
    deviceId: DEVICE_A,
    sessionId: SESSION_A,
    operationId: asOperationId('lease-operation-a'),
    expectedRevision: 0,
    serverNowMs: 500,
  }, lookup).state;
}

function store(): AccountDeleteTransactionPort & { read(): AccountDeleteContractState } {
  let deleteState = createEmptyDeleteContractState(ACCOUNT_A, TENANT_A);
  let leaseState = activeLease();
  const retired = new Set<string>();
  return {
    read: () => deleteState,
    async transact(_identity, _keys, transition) {
      const outcome = transition({
        leaseState,
        deleteState,
        retiredSessions: { isRetired: (sessionId) => retired.has(sessionId) },
      });
      outcome.retirements.forEach(({ sessionId }) => retired.add(sessionId));
      leaseState = outcome.state.leaseState;
      deleteState = outcome.state.deleteState;
      return outcome.result;
    },
  };
}

function harness(identity: ProviderIdentityReleasePort, principal: ResolvedAccountPrincipal = PRINCIPAL_A) {
  let nowMs = 1_000;
  let claimSequence = 0;
  const transactions = store();
  const ports: AccountDeleteHandlerPorts<unknown> = {
    auth: {
      async requireAuthenticated() {
        return verifiedAuthContext({ tenantId: TENANT_A, firebaseAuthUid: FIREBASE_A, deviceId: DEVICE_A, authEpoch: 1_000 });
      },
    },
    principals: { resolvePrincipal: jest.fn(async () => principal) },
    clock: { nowMs: () => nowMs },
    claims: { issueClaimId: jest.fn(() => asClaimId(`claim-${++claimSequence}`)) },
    transactions,
    identity,
  };
  return { ports, transactions, setNowMs(value: number) { nowMs = value; } };
}

const DELETE_REQUEST = Object.freeze({ sessionId: 'session-a', operationId: 'delete-operation-a', expectedRevision: 1 });
const workerRequest = (jobId: string) => ({ accountId: ACCOUNT_A, tenantId: TENANT_A, jobId });

describe('AA-S6b delete contract: убийцы выживших мутантов', () => {
  test('DC10: удаление с личностью, не совпадающей с активной арендой, отклоняется до освобождения', async () => {
    const identity: ProviderIdentityReleasePort = { releaseProviderIdentity: jest.fn(async () => undefined) };
    const other = Object.freeze({ accountId: ACCOUNT_A, providerSubject: asProviderSubject('provider-other') });
    const test = harness(identity, other);
    await expect(beginAuthenticatedAccountDeletion(test.ports, {}, DELETE_REQUEST))
      .rejects.toThrow('account_authority_delete_identity_mismatch');
    expect(identity.releaseProviderIdentity).not.toHaveBeenCalled();
    expect(test.transactions.read().job).toBeNull();
  });

  test('DC3: живой захват освобождения — второй обработчик получает busy и провайдера не зовёт', async () => {
    let release!: () => void;
    const identity: ProviderIdentityReleasePort = {
      releaseProviderIdentity: jest.fn(() => new Promise<void>((resolve) => { release = resolve; })),
    };
    const test = harness(identity);
    const deleting = beginAuthenticatedAccountDeletion(test.ports, {}, DELETE_REQUEST);
    for (let i = 0; i < 30 && test.transactions.read().job?.identityReleaseClaim == null; i += 1) await Promise.resolve();
    const jobId = test.transactions.read().job!.jobId;

    const concurrent = await runIdentityReleaseAttempt(test.ports, workerRequest(jobId));
    expect(concurrent.type).toBe('busy');
    expect(identity.releaseProviderIdentity).toHaveBeenCalledTimes(1);
    release();
    await deleting;
  });

  test('DC6: очистка, сообщившая больше удалённого, чем разрешено за проход, — отказ', async () => {
    const identity: ProviderIdentityReleasePort = { releaseProviderIdentity: jest.fn(async () => undefined) };
    const test = harness(identity);
    const job = await beginAuthenticatedAccountDeletion(test.ports, {}, DELETE_REQUEST);
    const purge: AccountDeletePurgePort = {
      purge: jest.fn(async () => ({ done: false, cursor: 'next', purgedItems: ACCOUNT_DELETE_PURGE_MAX_ITEMS_PER_RUN + 1 })),
    };
    test.setNowMs(2_000);
    await expect(runBoundedDeletePurge(test.ports, purge, workerRequest(job.jobId)))
      .rejects.toThrow('account_authority_delete_purge_result_invalid');
  });

  test('DC7: окончательная квитанция до срока хранения НЕ истекает', async () => {
    const identity: ProviderIdentityReleasePort = {
      releaseProviderIdentity: jest.fn(async () => { throw new Error('still-offline'); }),
    };
    const test = harness(identity);
    let job = await beginAuthenticatedAccountDeletion(test.ports, {}, DELETE_REQUEST);
    for (let attempt = 1; attempt < ACCOUNT_DELETE_IDENTITY_MAX_ATTEMPTS; attempt += 1) {
      test.setNowMs(1_000 + attempt);
      job = (await runIdentityReleaseAttempt(test.ports, workerRequest(job.jobId))).job;
    }
    expect(job.status).toBe('identity_release_failed');
    test.setNowMs(job.receiptExpiresAtMs! - 1);
    const swept = await sweepExpiredAccountDeleteJob(test.ports, workerRequest(job.jobId));
    expect(swept.status).toBe('identity_release_failed');
    expect(swept.deviceId).toBe(DEVICE_A);
  });
});
