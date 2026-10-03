import { createHash } from 'crypto';
import { accountAuthorityLogWarn, accountAuthorityServerErrorFields } from './account_authority_log';
import {
  asOperationId,
  asSessionId,
  assertActiveAccountLease,
  releaseActiveAccountLease,
  type AccountId,
  type AccountLeaseState,
  type AccountPrincipalResolverPort,
  type AccountRetiredSessionLookup,
  type AccountSessionRetirementOperation,
  type AuthenticatedRequestContextPort,
  type ClaimId,
  type DeviceId,
  type FirebaseAuthUid,
  type OperationId,
  type ProviderSubject,
  type ResolvedAccountPrincipal,
  type ResolvedLeasePrincipal,
  type ServerClaimIdPort,
  type ServerClockPort,
  type SessionId,
  type TenantId,
} from './lease_contract';

export const ACCOUNT_DELETE_PURGE_MAX_ITEMS_PER_RUN = 450;
export const ACCOUNT_DELETE_IDENTITY_MAX_ATTEMPTS = 4;
export const ACCOUNT_DELETE_PURGE_MAX_ATTEMPTS = 64;
export const ACCOUNT_DELETE_WORKER_CLAIM_MS = 30_000;
export const ACCOUNT_DELETE_RECEIPT_RETENTION_MS = 90 * 24 * 60 * 60_000;
export const ACCOUNT_DELETE_PURGE_CURSOR_MAX_LENGTH = 512;
export const ACCOUNT_DELETE_PURGE_CURSOR_HISTORY_MAX_ENTRIES = 16;

export type AccountDeleteStatus =
  | 'identity_release_pending'
  | 'identity_release_failed'
  | 'purge_queued'
  | 'purge_failed'
  | 'purged'
  | 'expired';

type PendingProviderIdentity = Readonly<{
  tenantId: TenantId;
  firebaseAuthUid: FirebaseAuthUid;
  providerSubject: ProviderSubject;
}>;

type WorkerClaim = Readonly<{
  claimId: ClaimId;
  leaseExpiresAtMs: number;
  idempotencyKey: string;
}>;

export type AccountDeleteJob = Readonly<{
  jobId: string;
  accountId: AccountId;
  tenantId: TenantId;
  firstOperationId: OperationId | null;
  deviceId: DeviceId | null;
  sessionId: SessionId | null;
  status: AccountDeleteStatus;
  createdAtMs: number;
  updatedAtMs: number;
  pendingProviderIdentity: PendingProviderIdentity | null;
  identityReleaseAttemptsStarted: number;
  identityReleaseAttemptsCompleted: number;
  identityReleaseFailuresCompleted: number;
  identityReleaseClaim: WorkerClaim | null;
  identityReleasedAtMs: number | null;
  purgeCursor: string | null;
  recentPurgeCursors: readonly string[];
  purgeAttempts: number;
  purgeFailures: number;
  purgeClaim: WorkerClaim | null;
  purgedItems: number;
  completedAtMs: number | null;
  receiptExpiresAtMs: number | null;
}>;

export type AccountDeleteContractState = Readonly<{
  accountId: AccountId;
  tenantId: TenantId;
  job: AccountDeleteJob | null;
  lastServerNowMs: number;
}>;

export type AccountDeleteTransactionContext = Readonly<{
  leaseState: AccountLeaseState;
  deleteState: AccountDeleteContractState;
  retiredSessions: AccountRetiredSessionLookup;
}>;

export type AccountDeleteTransition<T> = Readonly<{
  state: AccountDeleteTransactionContext;
  result: T;
  retirements: readonly AccountSessionRetirementOperation[];
  /** Adapter must durably schedule this sweep atomically with terminal state. */
  expirySchedules: readonly AccountDeleteExpirySchedule[];
}>;

export type AccountDeleteExpirySchedule = Readonly<{
  type: 'schedule_delete_job_expiry';
  jobId: string;
  expiresAtMs: number;
}>;

export type AccountDeleteTransactionIdentity = Readonly<{
  accountId: AccountId;
  tenantId: TenantId;
}>;

export interface AccountDeleteTransactionPort {
  /**
   * Must serialize by tenantId plus accountId and atomically persist lease state,
   * lifecycle tombstones, delete state, expiry schedules, and keyed retirement
   * operations. The lookup must contain supplied keys plus the active session.
   */
  transact<T>(
    identity: AccountDeleteTransactionIdentity,
    retirementSessionIds: readonly SessionId[],
    transition: (context: AccountDeleteTransactionContext) => AccountDeleteTransition<T>,
  ): Promise<T>;
}

export interface ProviderIdentityReleasePort {
  /** Must be idempotent by the stable server-owned idempotencyKey. */
  releaseProviderIdentity(request: Readonly<{
    accountId: AccountId;
    tenantId: TenantId;
    firebaseAuthUid: FirebaseAuthUid;
    providerSubject: ProviderSubject;
    idempotencyKey: string;
  }>): Promise<void>;
}

export interface AccountDeletePurgePort {
  /** Must be idempotent by idempotencyKey and cursor. */
  purge(request: Readonly<{
    accountId: AccountId;
    tenantId: TenantId;
    cursor: string | null;
    maxItems: number;
    idempotencyKey: string;
  }>): Promise<Readonly<{
    done: boolean;
    cursor: string | null;
    purgedItems: number;
  }>>;
}

export type AccountDeleteHandlerPorts<RequestContext> = Readonly<{
  auth: AuthenticatedRequestContextPort<RequestContext>;
  principals: AccountPrincipalResolverPort;
  clock: ServerClockPort;
  claims: ServerClaimIdPort;
  transactions: AccountDeleteTransactionPort;
  identity: ProviderIdentityReleasePort;
}>;

export type AuthenticatedAccountDeleteRequest = Readonly<{
  sessionId: string;
  operationId: string;
  expectedRevision: number;
}>;

type PreparedDeleteCommand = Readonly<{
  principal: ResolvedLeasePrincipal;
  deviceId: DeviceId;
  sessionId: SessionId;
  operationId: OperationId;
  expectedRevision: number;
  serverNowMs: number;
}>;

export type AccountDeleteWorkerRequest = Readonly<{
  accountId: AccountId;
  tenantId: TenantId;
  jobId: string;
}>;

export type AccountDeletePurgeRequest = Readonly<AccountDeleteWorkerRequest & {
  maxItems?: number;
}>;

export type AccountDeleteAttemptResult = Readonly<{
  type: 'released' | 'progressed' | 'retry_scheduled' | 'busy' | 'stale' | 'terminal';
  job: AccountDeleteJob;
}>;

function deleteError(code: string): Error {
  return new Error(`account_authority_delete_${code}`);
}

function safeNonNegativeInteger(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw deleteError('invalid_input');
  }
  return value;
}

function safeIncrement(value: number): number {
  return safeNonNegativeInteger(value + 1);
}

function safeDeadline(nowMs: number, durationMs: number): number {
  const value = nowMs + durationMs;
  if (!Number.isSafeInteger(value)) throw deleteError('invalid_input');
  return value;
}

function assertMonotonicClock(state: AccountDeleteContractState, serverNowMs: number): number {
  const now = safeNonNegativeInteger(serverNowMs);
  if (now < state.lastServerNowMs) throw deleteError('clock_rollback');
  return now;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function stableDeleteJobId(accountId: AccountId, tenantId: TenantId): string {
  return `aadel_${sha256(`${tenantId.length}:${tenantId}|${accountId.length}:${accountId}`).slice(0, 40)}`;
}

function identityIdempotencyKey(jobId: string): string {
  return `identity_release:${jobId}`;
}

function purgeIdempotencyKey(jobId: string, attempt: number): string {
  return `purge:${jobId}:${attempt}`;
}

function freezeClaim(claim: WorkerClaim | null): WorkerClaim | null {
  return claim === null ? null : Object.freeze({ ...claim });
}

function freezeJob(job: AccountDeleteJob): AccountDeleteJob {
  return Object.freeze({
    ...job,
    pendingProviderIdentity: job.pendingProviderIdentity === null
      ? null
      : Object.freeze({ ...job.pendingProviderIdentity }),
    identityReleaseClaim: freezeClaim(job.identityReleaseClaim),
    recentPurgeCursors: Object.freeze([...job.recentPurgeCursors]),
    purgeClaim: freezeClaim(job.purgeClaim),
  });
}

function noRetirements(): readonly AccountSessionRetirementOperation[] {
  return Object.freeze([]);
}

function transition<T>(
  state: AccountDeleteTransactionContext,
  result: T,
  retirements: readonly AccountSessionRetirementOperation[] = noRetirements(),
  expirySchedules: readonly AccountDeleteExpirySchedule[] = Object.freeze([]),
): AccountDeleteTransition<T> {
  return Object.freeze({ state, result, retirements, expirySchedules });
}

function expirySchedule(job: AccountDeleteJob): readonly AccountDeleteExpirySchedule[] {
  if (job.receiptExpiresAtMs === null) return Object.freeze([]);
  return Object.freeze([Object.freeze({
    type: 'schedule_delete_job_expiry' as const,
    jobId: job.jobId,
    expiresAtMs: job.receiptExpiresAtMs,
  })]);
}

function stateWithJob(
  context: AccountDeleteTransactionContext,
  job: AccountDeleteJob,
  serverNowMs: number,
  leaseState = context.leaseState,
): AccountDeleteTransactionContext {
  return Object.freeze({
    leaseState,
    retiredSessions: context.retiredSessions,
    deleteState: Object.freeze({
      ...context.deleteState,
      job,
      lastServerNowMs: serverNowMs,
    }),
  });
}

function assertContextIdentity(
  context: AccountDeleteTransactionContext,
  accountId: AccountId,
  tenantId: TenantId,
): void {
  if (context.deleteState.accountId !== accountId || context.leaseState.accountId !== accountId) {
    throw deleteError('account_mismatch');
  }
  if (context.deleteState.tenantId !== tenantId || context.leaseState.tenantId !== tenantId) {
    throw deleteError('identity_mismatch');
  }
}

function requireJob(
  context: AccountDeleteTransactionContext,
  request: AccountDeleteWorkerRequest,
): AccountDeleteJob {
  assertContextIdentity(context, request.accountId, request.tenantId);
  const job = context.deleteState.job;
  if (job === null || job.jobId !== request.jobId) throw deleteError('job_missing');
  if (job.accountId !== request.accountId || job.tenantId !== request.tenantId) {
    throw deleteError('identity_mismatch');
  }
  return job;
}

function principalMatchesLease(principal: ResolvedLeasePrincipal, lease: AccountLeaseState['activeLease']): boolean {
  return lease !== null
    && lease.accountId === principal.accountId
    && lease.tenantId === principal.tenantId
    && lease.firebaseAuthUid === principal.firebaseAuthUid
    && lease.providerSubject === principal.providerSubject;
}

function isRetentionTerminal(status: AccountDeleteStatus): boolean {
  return status === 'identity_release_failed' || status === 'purge_failed' || status === 'purged';
}

function expireTerminalJob(job: AccountDeleteJob, nowMs: number): AccountDeleteJob {
  if (
    !isRetentionTerminal(job.status)
    || job.receiptExpiresAtMs === null
    || nowMs < job.receiptExpiresAtMs
  ) {
    return job;
  }
  return freezeJob({
    ...job,
    firstOperationId: null,
    deviceId: null,
    sessionId: null,
    status: 'expired',
    updatedAtMs: nowMs,
    pendingProviderIdentity: null,
    identityReleaseClaim: null,
    purgeCursor: null,
    recentPurgeCursors: Object.freeze([]),
    purgeClaim: null,
  });
}

export function createEmptyDeleteContractState(
  accountId: AccountId,
  tenantId: TenantId,
): AccountDeleteContractState {
  return Object.freeze({ accountId, tenantId, job: null, lastServerNowMs: 0 });
}

function prepareAccountDeletion(
  context: AccountDeleteTransactionContext,
  command: PreparedDeleteCommand,
): AccountDeleteTransition<AccountDeleteJob> {
  const nowMs = assertMonotonicClock(context.deleteState, command.serverNowMs);
  assertContextIdentity(context, command.principal.accountId, command.principal.tenantId);
  const existing = context.deleteState.job;
  if (existing !== null) {
    if (
      existing.accountId !== command.principal.accountId
      || existing.tenantId !== command.principal.tenantId
    ) {
      throw deleteError('identity_mismatch');
    }
    const retained = expireTerminalJob(existing, nowMs);
    if (retained === existing) return transition(context, existing);
    return transition(stateWithJob(context, retained, nowMs), retained);
  }

  const active = assertActiveAccountLease(context.leaseState, {
    accountId: command.principal.accountId,
    tenantId: command.principal.tenantId,
    deviceId: command.deviceId,
    sessionId: command.sessionId,
  }, context.retiredSessions);
  if (!principalMatchesLease(command.principal, active)) throw deleteError('identity_mismatch');

  const released = releaseActiveAccountLease(context.leaseState, {
    accountId: command.principal.accountId,
    tenantId: command.principal.tenantId,
    deviceId: command.deviceId,
    sessionId: command.sessionId,
    operationId: asOperationId(`delete_lease_${sha256(command.operationId).slice(0, 40)}`),
    expectedRevision: command.expectedRevision,
    serverNowMs: nowMs,
  }, context.retiredSessions);
  const jobId = stableDeleteJobId(command.principal.accountId, command.principal.tenantId);
  const leaseState: AccountLeaseState = Object.freeze({
    ...released.state,
    lifecycle: Object.freeze({ status: 'deleting' as const, jobId, changedAtMs: nowMs }),
  });
  const job = freezeJob({
    jobId,
    accountId: command.principal.accountId,
    tenantId: command.principal.tenantId,
    firstOperationId: command.operationId,
    deviceId: command.deviceId,
    sessionId: command.sessionId,
    status: 'identity_release_pending',
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
    pendingProviderIdentity: Object.freeze({
      tenantId: command.principal.tenantId,
      firebaseAuthUid: command.principal.firebaseAuthUid,
      providerSubject: command.principal.providerSubject,
    }),
    identityReleaseAttemptsStarted: 0,
    identityReleaseAttemptsCompleted: 0,
    identityReleaseFailuresCompleted: 0,
    identityReleaseClaim: null,
    identityReleasedAtMs: null,
    purgeCursor: null,
    recentPurgeCursors: Object.freeze([]),
    purgeAttempts: 0,
    purgeFailures: 0,
    purgeClaim: null,
    purgedItems: 0,
    completedAtMs: null,
    receiptExpiresAtMs: null,
  });
  return transition(stateWithJob(context, job, nowMs, leaseState), job, released.retirements);
}

type ClaimResult = Readonly<{
  type: 'claimed' | 'busy' | 'terminal';
  job: AccountDeleteJob;
  claim: WorkerClaim | null;
}>;

function claimIdentityRelease(
  context: AccountDeleteTransactionContext,
  request: AccountDeleteWorkerRequest,
  claimId: ClaimId,
  serverNowMs: number,
): AccountDeleteTransition<ClaimResult> {
  const nowMs = assertMonotonicClock(context.deleteState, serverNowMs);
  const raw = requireJob(context, request);
  const current = expireTerminalJob(raw, nowMs);
  if (current !== raw) {
    const state = stateWithJob(context, current, nowMs);
    return transition(state, { type: 'terminal', job: current, claim: null });
  }
  if (current.status !== 'identity_release_pending') {
    return transition(context, { type: 'terminal', job: current, claim: null });
  }
  if (current.identityReleaseClaim !== null && current.identityReleaseClaim.leaseExpiresAtMs > nowMs) {
    return transition(context, { type: 'busy', job: current, claim: null });
  }
  if (current.identityReleaseFailuresCompleted >= ACCOUNT_DELETE_IDENTITY_MAX_ATTEMPTS) {
    const terminal = freezeJob({
      ...current,
      status: 'identity_release_failed',
      updatedAtMs: nowMs,
      identityReleaseClaim: null,
      receiptExpiresAtMs: safeDeadline(nowMs, ACCOUNT_DELETE_RECEIPT_RETENTION_MS),
    });
    return transition(
      stateWithJob(context, terminal, nowMs),
      { type: 'terminal', job: terminal, claim: null },
      noRetirements(),
      expirySchedule(terminal),
    );
  }
  const claim = Object.freeze({
    claimId,
    leaseExpiresAtMs: safeDeadline(nowMs, ACCOUNT_DELETE_WORKER_CLAIM_MS),
    idempotencyKey: identityIdempotencyKey(current.jobId),
  });
  const job = freezeJob({
    ...current,
    updatedAtMs: nowMs,
    identityReleaseAttemptsStarted: safeIncrement(current.identityReleaseAttemptsStarted),
    identityReleaseClaim: claim,
  });
  return transition(
    stateWithJob(context, job, nowMs),
    { type: 'claimed', job, claim },
  );
}

function finishIdentityRelease(
  context: AccountDeleteTransactionContext,
  request: AccountDeleteWorkerRequest,
  claimId: ClaimId,
  serverNowMs: number,
  succeeded: boolean,
): AccountDeleteTransition<AccountDeleteJob> {
  const nowMs = assertMonotonicClock(context.deleteState, serverNowMs);
  const current = requireJob(context, request);
  const ownsClaim = current.identityReleaseClaim?.claimId === claimId;
  if (!ownsClaim && !succeeded) return transition(context, current);
  if (!ownsClaim && current.pendingProviderIdentity === null) return transition(context, current);

  const attemptsCompleted = safeIncrement(current.identityReleaseAttemptsCompleted);
  const failuresCompleted = succeeded
    ? current.identityReleaseFailuresCompleted
    : safeIncrement(current.identityReleaseFailuresCompleted);
  const exhausted = failuresCompleted >= ACCOUNT_DELETE_IDENTITY_MAX_ATTEMPTS;
  const status: AccountDeleteStatus = succeeded
    ? 'purge_queued'
    : exhausted ? 'identity_release_failed' : 'identity_release_pending';
  const job = freezeJob({
    ...current,
    status,
    updatedAtMs: nowMs,
    identityReleaseAttemptsCompleted: attemptsCompleted,
    identityReleaseFailuresCompleted: failuresCompleted,
    identityReleaseClaim: null,
    pendingProviderIdentity: succeeded ? null : current.pendingProviderIdentity,
    identityReleasedAtMs: succeeded ? nowMs : null,
    receiptExpiresAtMs: !succeeded && exhausted
      ? safeDeadline(nowMs, ACCOUNT_DELETE_RECEIPT_RETENTION_MS)
      : null,
  });
  return transition(
    stateWithJob(context, job, nowMs),
    job,
    noRetirements(),
    expirySchedule(job),
  );
}

export async function runIdentityReleaseAttempt<RequestContext>(
  ports: Pick<AccountDeleteHandlerPorts<RequestContext>, 'clock' | 'claims' | 'transactions' | 'identity'>,
  request: AccountDeleteWorkerRequest,
): Promise<AccountDeleteAttemptResult> {
  const nowMs = ports.clock.nowMs();
  const claimId = ports.claims.issueClaimId();
  const identity = { accountId: request.accountId, tenantId: request.tenantId };
  const claimed = await ports.transactions.transact(
    identity,
    Object.freeze([]),
    (context) => claimIdentityRelease(context, request, claimId, nowMs),
  );
  if (claimed.type === 'busy') return Object.freeze({ type: 'busy', job: claimed.job });
  if (claimed.type === 'terminal') return Object.freeze({ type: 'terminal', job: claimed.job });
  const providerIdentity = claimed.job.pendingProviderIdentity;
  if (providerIdentity === null || claimed.claim === null) throw deleteError('identity_payload_missing');

  try {
    await ports.identity.releaseProviderIdentity({
      accountId: claimed.job.accountId,
      ...providerIdentity,
      idempotencyKey: claimed.claim.idempotencyKey,
    });
  } catch (error) {
    // зачем (AA S1): сбой освобождения личности у провайдера раньше глушился
    // без следа; повтор/терминал решает транзакция ниже, вид сбоя — в логе.
    accountAuthorityLogWarn('delete identity_release_failed', accountAuthorityServerErrorFields(error));
    const failureNowMs = ports.clock.nowMs();
    const job = await ports.transactions.transact(
      identity,
      Object.freeze([]),
      (context) => finishIdentityRelease(context, request, claimId, failureNowMs, false),
    );
    return Object.freeze({
      type: job.status === 'identity_release_failed' ? 'terminal' : 'retry_scheduled',
      job,
    });
  }

  // Persistence failure after external success must escape unchanged. The claim
  // remains recoverable and the stable provider idempotency key makes retry safe.
  const completionNowMs = ports.clock.nowMs();
  const job = await ports.transactions.transact(
    identity,
    Object.freeze([]),
    (context) => finishIdentityRelease(context, request, claimId, completionNowMs, true),
  );
  return Object.freeze({ type: 'released', job });
}

export async function beginAuthenticatedAccountDeletion<RequestContext>(
  ports: AccountDeleteHandlerPorts<RequestContext>,
  requestContext: RequestContext,
  request: AuthenticatedAccountDeleteRequest,
): Promise<AccountDeleteJob> {
  const auth = await ports.auth.requireAuthenticated(requestContext);
  const resolved = await ports.principals.resolvePrincipal(auth);
  const serverNowMs = ports.clock.nowMs();
  const identity = { accountId: resolved.accountId, tenantId: auth.tenantId };
  const sessionId = asSessionId(request.sessionId);
  const prepared = await ports.transactions.transact(
    identity,
    Object.freeze([sessionId]),
    (context) => prepareAccountDeletion(context, {
      principal: Object.freeze({
        accountId: resolved.accountId,
        providerSubject: resolved.providerSubject,
        tenantId: auth.tenantId,
        firebaseAuthUid: auth.firebaseAuthUid,
        authEpoch: auth.authEpoch,
      }),
      deviceId: auth.deviceId,
      sessionId,
      operationId: asOperationId(request.operationId),
      expectedRevision: request.expectedRevision,
      serverNowMs,
    }),
  );
  if (prepared.status !== 'identity_release_pending') return prepared;
  return (await runIdentityReleaseAttempt(ports, {
    ...identity,
    jobId: prepared.jobId,
  })).job;
}

/**
 * Что адаптер отдаёт подготовке удаления внутри ЕДИНОЙ транзакции (S2a раунд 3,
 * L-R2-4): привязка установки уже проверена, принципал прочитан (не создан),
 * состояния аренды и удаления прочитаны в той же транзакции.
 */
export type AccountDeleteBoundPrepareContext = Readonly<AccountDeleteTransactionContext & {
  principal: Readonly<ResolvedAccountPrincipal & { tenantId: TenantId }>;
  deviceId: DeviceId;
  authEpoch: number;
}>;

export interface AccountDeleteBoundPreparePort {
  /**
   * Одна транзакция: привязка → принципал (только чтение) → аренда и удаление →
   * переход → атомарные записи (аренда, удаление, расписания, отметки сессий).
   */
  transactPrepare(
    transition: (context: AccountDeleteBoundPrepareContext) => AccountDeleteTransition<AccountDeleteJob>,
  ): Promise<AccountDeleteJob>;
}

/**
 * S2a раунд 3, L-R2-4: начало удаления без окна между проверкой привязки и
 * подготовкой. Сессия удаления — активная сессия аренды из того же чтения;
 * субъект аренды (хеш uid) приходит от границы (раунд 2, M1). Освобождение
 * личности у провайдера — как раньше, отдельными транзакциями после подготовки.
 */
export async function beginBoundAccountDeletion(
  ports: Pick<AccountDeleteHandlerPorts<unknown>, 'clock' | 'claims' | 'transactions' | 'identity'> & Readonly<{
    bound: AccountDeleteBoundPreparePort;
  }>,
  request: Readonly<{ operationId: string; expectedRevision: number; leaseSubject: FirebaseAuthUid }>,
): Promise<AccountDeleteJob> {
  const serverNowMs = ports.clock.nowMs();
  const operationId = asOperationId(request.operationId);
  const prepared = await ports.bound.transactPrepare((context) => {
    const sessionId = context.leaseState.activeLease?.sessionId;
    if (sessionId === undefined) throw deleteError('no_active_session');
    return prepareAccountDeletion(context, {
      principal: Object.freeze({
        accountId: context.principal.accountId,
        providerSubject: context.principal.providerSubject,
        tenantId: context.principal.tenantId,
        firebaseAuthUid: request.leaseSubject,
        authEpoch: context.authEpoch,
      }),
      deviceId: context.deviceId,
      sessionId,
      operationId,
      expectedRevision: request.expectedRevision,
      serverNowMs,
    });
  });
  if (prepared.status !== 'identity_release_pending') return prepared;
  return (await runIdentityReleaseAttempt(ports, {
    accountId: prepared.accountId,
    tenantId: prepared.tenantId,
    jobId: prepared.jobId,
  })).job;
}

function purgeBudget(value: number | undefined): number {
  if (value === undefined) return ACCOUNT_DELETE_PURGE_MAX_ITEMS_PER_RUN;
  if (!Number.isSafeInteger(value) || value < 1) throw deleteError('purge_budget_invalid');
  return Math.min(value, ACCOUNT_DELETE_PURGE_MAX_ITEMS_PER_RUN);
}

function completedPurgeAttempts(job: AccountDeleteJob): number {
  const total = job.purgeAttempts + job.purgeFailures;
  if (!Number.isSafeInteger(total)) throw deleteError('invalid_state');
  return total;
}

function terminalPurgeFailure(job: AccountDeleteJob, nowMs: number): AccountDeleteJob {
  return freezeJob({
    ...job,
    status: 'purge_failed',
    updatedAtMs: nowMs,
    purgeClaim: null,
    completedAtMs: nowMs,
    receiptExpiresAtMs: safeDeadline(nowMs, ACCOUNT_DELETE_RECEIPT_RETENTION_MS),
  });
}

function claimPurge(
  context: AccountDeleteTransactionContext,
  request: AccountDeleteWorkerRequest,
  claimId: ClaimId,
  serverNowMs: number,
): AccountDeleteTransition<ClaimResult> {
  const nowMs = assertMonotonicClock(context.deleteState, serverNowMs);
  const raw = requireJob(context, request);
  const current = expireTerminalJob(raw, nowMs);
  if (current !== raw) {
    const state = stateWithJob(context, current, nowMs);
    return transition(state, { type: 'terminal', job: current, claim: null });
  }
  if (current.status === 'purged' || current.status === 'purge_failed' || current.status === 'expired') {
    return transition(context, { type: 'terminal', job: current, claim: null });
  }
  if (current.status !== 'purge_queued') throw deleteError('identity_not_released');
  if (current.purgeClaim !== null && current.purgeClaim.leaseExpiresAtMs > nowMs) {
    return transition(context, { type: 'busy', job: current, claim: null });
  }
  if (completedPurgeAttempts(current) >= ACCOUNT_DELETE_PURGE_MAX_ATTEMPTS) {
    const terminal = terminalPurgeFailure(current, nowMs);
    return transition(
      stateWithJob(context, terminal, nowMs),
      { type: 'terminal', job: terminal, claim: null },
      noRetirements(),
      expirySchedule(terminal),
    );
  }
  const claim = Object.freeze({
    claimId,
    leaseExpiresAtMs: safeDeadline(nowMs, ACCOUNT_DELETE_WORKER_CLAIM_MS),
    idempotencyKey: purgeIdempotencyKey(current.jobId, current.purgeAttempts + 1),
  });
  const job = freezeJob({ ...current, updatedAtMs: nowMs, purgeClaim: claim });
  return transition(
    stateWithJob(context, job, nowMs),
    { type: 'claimed', job, claim },
  );
}

function clearFailedPurgeClaim(
  context: AccountDeleteTransactionContext,
  request: AccountDeleteWorkerRequest,
  claimId: ClaimId,
  serverNowMs: number,
): AccountDeleteTransition<Readonly<{
  type: 'cleared' | 'stale';
  job: AccountDeleteJob;
}>> {
  const nowMs = assertMonotonicClock(context.deleteState, serverNowMs);
  const current = requireJob(context, request);
  if (current.purgeClaim?.claimId !== claimId) {
    return transition(context, { type: 'stale', job: current });
  }
  const failed = freezeJob({
    ...current,
    updatedAtMs: nowMs,
    purgeFailures: safeIncrement(current.purgeFailures),
    purgeClaim: null,
  });
  const job = completedPurgeAttempts(failed) >= ACCOUNT_DELETE_PURGE_MAX_ATTEMPTS
    ? terminalPurgeFailure(failed, nowMs)
    : failed;
  return transition(
    stateWithJob(context, job, nowMs),
    { type: 'cleared', job },
    noRetirements(),
    expirySchedule(job),
  );
}

function validCursor(value: string | null): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= ACCOUNT_DELETE_PURGE_CURSOR_MAX_LENGTH
    && value.trim() === value
    && !/[\u0000-\u001f\u007f]/.test(value);
}

function validatePurgeResult(
  job: AccountDeleteJob,
  maxItems: number,
  result: Readonly<{ done: boolean; cursor: string | null; purgedItems: number }>,
): void {
  if (
    typeof result.done !== 'boolean'
    || !Number.isSafeInteger(result.purgedItems)
    || result.purgedItems < 0
    || result.purgedItems > maxItems
  ) {
    throw deleteError('purge_result_invalid');
  }
  if (result.done) {
    if (result.cursor !== null) throw deleteError('purge_result_invalid');
    return;
  }
  if (!validCursor(result.cursor) || result.cursor === job.purgeCursor || result.purgedItems < 1) {
    throw deleteError('purge_result_invalid');
  }
  if (job.recentPurgeCursors.includes(result.cursor)) throw deleteError('purge_cursor_cycle');
}

function appendRecentCursor(job: AccountDeleteJob, cursor: string | null): readonly string[] {
  if (cursor === null) return job.recentPurgeCursors;
  return Object.freeze(
    [...job.recentPurgeCursors, cursor].slice(-ACCOUNT_DELETE_PURGE_CURSOR_HISTORY_MAX_ENTRIES),
  );
}

function finishPurge(
  context: AccountDeleteTransactionContext,
  request: AccountDeleteWorkerRequest,
  claimId: ClaimId,
  serverNowMs: number,
  result: Readonly<{ done: boolean; cursor: string | null; purgedItems: number }>,
): AccountDeleteTransition<Readonly<{
  type: 'applied' | 'stale';
  job: AccountDeleteJob;
}>> {
  const nowMs = assertMonotonicClock(context.deleteState, serverNowMs);
  const current = requireJob(context, request);
  if (current.purgeClaim?.claimId !== claimId) {
    return transition(context, { type: 'stale', job: current });
  }
  const purgedItems = current.purgedItems + result.purgedItems;
  if (!Number.isSafeInteger(purgedItems)) throw deleteError('purge_result_invalid');
  const job = freezeJob({
    ...current,
    status: result.done ? 'purged' : 'purge_queued',
    updatedAtMs: nowMs,
    purgeCursor: result.cursor,
    recentPurgeCursors: appendRecentCursor(current, result.cursor),
    purgeAttempts: safeIncrement(current.purgeAttempts),
    purgeClaim: null,
    purgedItems,
    completedAtMs: result.done ? nowMs : null,
    receiptExpiresAtMs: result.done
      ? safeDeadline(nowMs, ACCOUNT_DELETE_RECEIPT_RETENTION_MS)
      : null,
  });
  const leaseState: AccountLeaseState = result.done
    ? Object.freeze({
      ...context.leaseState,
      lifecycle: Object.freeze({
        status: 'deleted' as const,
        jobId: current.jobId,
        changedAtMs: nowMs,
      }),
    })
    : context.leaseState;
  return transition(
    stateWithJob(context, job, nowMs, leaseState),
    { type: 'applied', job },
    noRetirements(),
    expirySchedule(job),
  );
}

export async function runBoundedDeletePurge<RequestContext>(
  ports: Pick<AccountDeleteHandlerPorts<RequestContext>, 'clock' | 'claims' | 'transactions'>,
  purge: AccountDeletePurgePort,
  request: AccountDeletePurgeRequest,
): Promise<AccountDeleteAttemptResult> {
  const nowMs = ports.clock.nowMs();
  const maxItems = purgeBudget(request.maxItems);
  const claimId = ports.claims.issueClaimId();
  const identity = { accountId: request.accountId, tenantId: request.tenantId };
  const claimed = await ports.transactions.transact(
    identity,
    Object.freeze([]),
    (context) => claimPurge(context, request, claimId, nowMs),
  );
  if (claimed.type === 'busy') return Object.freeze({ type: 'busy', job: claimed.job });
  if (claimed.type === 'terminal') return Object.freeze({ type: 'terminal', job: claimed.job });
  if (claimed.claim === null) throw deleteError('purge_claim_missing');

  let result: Readonly<{ done: boolean; cursor: string | null; purgedItems: number }>;
  try {
    result = await purge.purge({
      accountId: claimed.job.accountId,
      tenantId: claimed.job.tenantId,
      cursor: claimed.job.purgeCursor,
      maxItems,
      idempotencyKey: claimed.claim.idempotencyKey,
    });
  } catch (error) {
    accountAuthorityLogWarn('delete purge_failed', accountAuthorityServerErrorFields(error));
    const failureNowMs = ports.clock.nowMs();
    const cleared = await ports.transactions.transact(
      identity,
      Object.freeze([]),
      (context) => clearFailedPurgeClaim(context, request, claimId, failureNowMs),
    );
    if (cleared.type === 'stale') return Object.freeze({ type: 'stale', job: cleared.job });
    return Object.freeze({
      type: cleared.job.status === 'purge_failed' ? 'terminal' : 'retry_scheduled',
      job: cleared.job,
    });
  }

  const completionNowMs = ports.clock.nowMs();
  try {
    validatePurgeResult(claimed.job, maxItems, result);
  } catch (error) {
    accountAuthorityLogWarn('delete purge_result_invalid', accountAuthorityServerErrorFields(error));
    const cleared = await ports.transactions.transact(
      identity,
      Object.freeze([]),
      (context) => clearFailedPurgeClaim(context, request, claimId, completionNowMs),
    );
    if (cleared.type === 'stale') {
      return Object.freeze({ type: 'stale', job: cleared.job });
    }
    throw error;
  }
  const finished = await ports.transactions.transact(
    identity,
    Object.freeze([]),
    (context) => finishPurge(context, request, claimId, completionNowMs, result),
  );
  return Object.freeze({
    type: finished.type === 'stale' ? 'stale' : 'progressed',
    job: finished.job,
  });
}

function sweepExpiredDeleteJob(
  context: AccountDeleteTransactionContext,
  request: AccountDeleteWorkerRequest,
  serverNowMs: number,
): AccountDeleteTransition<AccountDeleteJob> {
  const nowMs = assertMonotonicClock(context.deleteState, serverNowMs);
  const current = requireJob(context, request);
  const expired = expireTerminalJob(current, nowMs);
  if (expired === current) return transition(context, current);
  return transition(stateWithJob(context, expired, nowMs), expired);
}

/**
 * Entry point for the durable TTL/scheduled worker. Adapters must invoke it at
 * the emitted expiry timestamp; it does not depend on user authentication or a
 * later request touching the account.
 */
export async function sweepExpiredAccountDeleteJob<RequestContext>(
  ports: Pick<AccountDeleteHandlerPorts<RequestContext>, 'clock' | 'transactions'>,
  request: AccountDeleteWorkerRequest,
): Promise<AccountDeleteJob> {
  return ports.transactions.transact(
    { accountId: request.accountId, tenantId: request.tenantId },
    Object.freeze([]),
    (context) => sweepExpiredDeleteJob(context, request, ports.clock.nowMs()),
  );
}
