const AUTHORITY_ID_BRAND: unique symbol = Symbol('account-authority-server-id');
const VERIFIED_AUTH_CONTEXT_BRAND: unique symbol = Symbol('verified-auth-context');

type AuthorityId<Kind extends string> = string & {
  readonly [AUTHORITY_ID_BRAND]: Kind;
};

export type AccountId = AuthorityId<'account_id'>;
export type FirebaseAuthUid = AuthorityId<'firebase_auth_uid'>;
export type ProviderSubject = AuthorityId<'provider_subject'>;
export type TenantId = AuthorityId<'tenant_id'>;
export type DeviceId = AuthorityId<'device_id'>;
export type SessionId = AuthorityId<'session_id'>;
export type OperationId = AuthorityId<'operation_id'>;
export type ClaimId = AuthorityId<'claim_id'>;

export type AccountLeaseErrorCode =
  | 'invalid_input'
  | 'account_mismatch'
  | 'identity_mismatch'
  | 'account_lifecycle_blocked'
  | 'operation_reused'
  | 'revision_mismatch'
  | 'stale_auth_epoch'
  | 'session_reused'
  | 'stale_lease'
  | 'receipt_capacity_exhausted'
  | 'clock_rollback';

export class AccountLeaseError extends Error {
  readonly code: AccountLeaseErrorCode;

  constructor(code: AccountLeaseErrorCode) {
    super(`account_authority_${code}`);
    this.name = 'AccountLeaseError';
    this.code = code;
  }
}

function parseId<Kind extends string>(value: unknown, _kind: Kind): AuthorityId<Kind> {
  if (
    typeof value !== 'string'
    || value.length === 0
    || value.length > 256
    || value.trim() !== value
    || value.includes('..')
    || /[\\/\u0000-\u001f\u007f]/.test(value)
    || /%2e|%2f|%5c/i.test(value)
  ) {
    throw new AccountLeaseError('invalid_input');
  }
  return value as AuthorityId<Kind>;
}

export const asAccountId = (value: unknown): AccountId => parseId(value, 'account_id');
export const asFirebaseAuthUid = (value: unknown): FirebaseAuthUid => parseId(value, 'firebase_auth_uid');
export const asProviderSubject = (value: unknown): ProviderSubject => parseId(value, 'provider_subject');
export const asTenantId = (value: unknown): TenantId => parseId(value, 'tenant_id');
export const asDeviceId = (value: unknown): DeviceId => parseId(value, 'device_id');
export const asSessionId = (value: unknown): SessionId => parseId(value, 'session_id');
export const asOperationId = (value: unknown): OperationId => parseId(value, 'operation_id');
export const asClaimId = (value: unknown): ClaimId => parseId(value, 'claim_id');

function safeNonNegativeInteger(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new AccountLeaseError('invalid_input');
  }
  return value;
}

function safePositiveInteger(value: unknown): number {
  const parsed = safeNonNegativeInteger(value);
  if (parsed < 1) throw new AccountLeaseError('invalid_input');
  return parsed;
}

function safeDeadline(nowMs: number, durationMs: number): number {
  const deadline = nowMs + durationMs;
  if (!Number.isSafeInteger(deadline)) throw new AccountLeaseError('invalid_input');
  return deadline;
}

export type VerifiedAuthContext = Readonly<{
  tenantId: TenantId;
  firebaseAuthUid: FirebaseAuthUid;
  /** Trusted device binding derived from auth/App Check or a server-side resolver. */
  deviceId: DeviceId;
  authEpoch: number;
  readonly [VERIFIED_AUTH_CONTEXT_BRAND]: true;
}>;

export function verifiedAuthContext(input: Readonly<{
  tenantId: TenantId;
  firebaseAuthUid: FirebaseAuthUid;
  deviceId: DeviceId;
  authEpoch: number;
}>): VerifiedAuthContext {
  return Object.freeze({
    tenantId: asTenantId(input.tenantId),
    firebaseAuthUid: asFirebaseAuthUid(input.firebaseAuthUid),
    deviceId: asDeviceId(input.deviceId),
    authEpoch: safeNonNegativeInteger(input.authEpoch),
    [VERIFIED_AUTH_CONTEXT_BRAND]: true as const,
  });
}

export type ResolvedAccountPrincipal = Readonly<{
  accountId: AccountId;
  providerSubject: ProviderSubject;
}>;

export type ResolvedLeasePrincipal = Readonly<ResolvedAccountPrincipal & {
  tenantId: TenantId;
  firebaseAuthUid: FirebaseAuthUid;
  authEpoch: number;
}>;

export interface AuthenticatedRequestContextPort<RequestContext> {
  requireAuthenticated(context: RequestContext): Promise<VerifiedAuthContext>;
}

export interface AccountPrincipalResolverPort {
  /** Resolves account/provider ownership from trusted server identity data only. */
  resolvePrincipal(context: VerifiedAuthContext): Promise<ResolvedAccountPrincipal>;
}

export interface ServerClockPort {
  nowMs(): number;
}

export interface ServerSessionIdPort {
  issueSessionId(): Promise<SessionId>;
}

export interface ServerClaimIdPort {
  issueClaimId(): ClaimId;
}

export interface AccountRetiredSessionLookup {
  /** Must be a keyed durable existence lookup scoped to the transaction identity. */
  isRetired(sessionId: SessionId): boolean;
}

export type AccountSessionRetirementOperation = Readonly<{
  type: 'retire_session';
  sessionId: SessionId;
}>;

export type AccountLease = Readonly<ResolvedLeasePrincipal & {
  deviceId: DeviceId;
  sessionId: SessionId;
  issuedAtMs: number;
  renewedAtMs: number;
  revision: number;
}>;

export type RevokedAccountLease = Readonly<AccountLease & { revokedAtMs: number }>;

export type AccountLeaseAcquireCommand = Readonly<{
  principal: ResolvedLeasePrincipal;
  deviceId: DeviceId;
  sessionId: SessionId;
  operationId: OperationId;
  expectedRevision: number;
  serverNowMs: number;
}>;

export type AccountLeaseReleaseCommand = Readonly<{
  accountId: AccountId;
  tenantId: TenantId;
  deviceId: DeviceId;
  sessionId: SessionId;
  operationId: OperationId;
  expectedRevision: number;
  serverNowMs: number;
}>;

export type AccountLeaseFence = Readonly<{
  accountId: AccountId;
  tenantId: TenantId;
  deviceId: DeviceId;
  sessionId: SessionId;
}>;

export type AccountLeaseAcquireResult = Readonly<{
  type: 'acquired' | 'renewed';
  lease: AccountLease;
  revokedLease: RevokedAccountLease | null;
  idempotent: boolean;
}>;

export type AccountLeaseReleaseResult = Readonly<{
  type: 'released';
  revision: number;
  idempotent: boolean;
}>;

type AcquireReceipt = Readonly<{
  kind: 'acquire';
  operationId: OperationId;
  accountId: AccountId;
  tenantId: TenantId;
  firebaseAuthUid: FirebaseAuthUid;
  providerSubject: ProviderSubject;
  authEpoch: number;
  deviceId: DeviceId;
  expectedRevision: number;
  expiresAtMs: number;
  result: AccountLeaseAcquireResult;
}>;

type ReleaseReceipt = Readonly<{
  kind: 'release';
  operationId: OperationId;
  accountId: AccountId;
  tenantId: TenantId;
  deviceId: DeviceId;
  sessionId: SessionId;
  expectedRevision: number;
  expiresAtMs: number;
  result: AccountLeaseReleaseResult;
}>;

export type AccountLeaseOperationReceipt = AcquireReceipt | ReleaseReceipt;

export type AccountLeaseReceiptLedger = Readonly<{
  maxEntries: number;
  retentionMs: number;
  entries: readonly AccountLeaseOperationReceipt[];
}>;

export type AccountLifecycleTombstone =
  | Readonly<{ status: 'active' }>
  | Readonly<{
    status: 'deleting' | 'deleted';
    jobId: string;
    changedAtMs: number;
  }>;

export type AccountLeaseState = Readonly<{
  accountId: AccountId;
  tenantId: TenantId;
  lifecycle: AccountLifecycleTombstone;
  revision: number;
  activeLease: AccountLease | null;
  latestAuthEpoch: number | null;
  receiptLedger: AccountLeaseReceiptLedger;
  lastServerNowMs: number;
}>;

export type AccountLeaseTransition<T> = Readonly<{
  state: AccountLeaseState;
  result: T;
  /** Adapter must apply keyed retirements atomically with state. */
  retirements: readonly AccountSessionRetirementOperation[];
}>;

export const ACCOUNT_LEASE_DEFAULT_RECEIPT_MAX_ENTRIES = 64;
export const ACCOUNT_LEASE_DEFAULT_RECEIPT_RETENTION_MS = 24 * 60 * 60_000;

export function createEmptyAccountLeaseState(
  accountId: AccountId,
  tenantId: TenantId,
  policy: Readonly<{ maxEntries?: number; retentionMs?: number }> = {},
): AccountLeaseState {
  const maxEntries = safePositiveInteger(policy.maxEntries ?? ACCOUNT_LEASE_DEFAULT_RECEIPT_MAX_ENTRIES);
  const retentionMs = safePositiveInteger(policy.retentionMs ?? ACCOUNT_LEASE_DEFAULT_RECEIPT_RETENTION_MS);
  return Object.freeze({
    accountId: asAccountId(accountId),
    tenantId: asTenantId(tenantId),
    lifecycle: Object.freeze({ status: 'active' as const }),
    revision: 0,
    activeLease: null,
    latestAuthEpoch: null,
    receiptLedger: Object.freeze({ maxEntries, retentionMs, entries: Object.freeze([]) }),
    lastServerNowMs: 0,
  });
}

function assertMonotonicClock(state: AccountLeaseState, serverNowMs: number): number {
  const now = safeNonNegativeInteger(serverNowMs);
  if (now < state.lastServerNowMs) throw new AccountLeaseError('clock_rollback');
  return now;
}

function liveReceipts(state: AccountLeaseState, nowMs: number): readonly AccountLeaseOperationReceipt[] {
  return state.receiptLedger.entries.filter((entry) => entry.expiresAtMs > nowMs);
}

function findReceipt(
  receipts: readonly AccountLeaseOperationReceipt[],
  operationId: OperationId,
): AccountLeaseOperationReceipt | undefined {
  return receipts.find((receipt) => receipt.operationId === operationId);
}

function appendReceipt(
  state: AccountLeaseState,
  live: readonly AccountLeaseOperationReceipt[],
  receipt: AccountLeaseOperationReceipt,
): AccountLeaseReceiptLedger {
  if (live.length >= state.receiptLedger.maxEntries) {
    throw new AccountLeaseError('receipt_capacity_exhausted');
  }
  return Object.freeze({
    ...state.receiptLedger,
    entries: Object.freeze([...live, Object.freeze(receipt)]),
  });
}

function acquireReceiptMatches(receipt: AcquireReceipt, command: AccountLeaseAcquireCommand): boolean {
  return receipt.accountId === command.principal.accountId
    && receipt.tenantId === command.principal.tenantId
    && receipt.firebaseAuthUid === command.principal.firebaseAuthUid
    && receipt.providerSubject === command.principal.providerSubject
    && receipt.authEpoch === command.principal.authEpoch
    && receipt.deviceId === command.deviceId
    && receipt.expectedRevision === command.expectedRevision;
}

function releaseReceiptMatches(receipt: ReleaseReceipt, command: AccountLeaseReleaseCommand): boolean {
  return receipt.accountId === command.accountId
    && receipt.tenantId === command.tenantId
    && receipt.deviceId === command.deviceId
    && receipt.sessionId === command.sessionId
    && receipt.expectedRevision === command.expectedRevision;
}

function principalMatchesLease(principal: ResolvedLeasePrincipal, lease: AccountLease): boolean {
  return principal.accountId === lease.accountId
    && principal.tenantId === lease.tenantId
    && principal.firebaseAuthUid === lease.firebaseAuthUid
    && principal.providerSubject === lease.providerSubject;
}

function freezeLease(lease: AccountLease): AccountLease {
  return Object.freeze({ ...lease });
}

function noRetirements(): readonly AccountSessionRetirementOperation[] {
  return Object.freeze([]);
}

function retirement(sessionId: SessionId): readonly AccountSessionRetirementOperation[] {
  return Object.freeze([Object.freeze({ type: 'retire_session' as const, sessionId })]);
}

function assertStateIdentity(state: AccountLeaseState, accountId: AccountId, tenantId: TenantId): void {
  if (state.accountId !== accountId) throw new AccountLeaseError('account_mismatch');
  if (state.tenantId !== tenantId) throw new AccountLeaseError('identity_mismatch');
}

export function assertActiveAccountLease(
  state: AccountLeaseState,
  fence: AccountLeaseFence,
  retiredSessions: AccountRetiredSessionLookup,
): AccountLease {
  assertStateIdentity(state, fence.accountId, fence.tenantId);
  const active = state.activeLease;
  if (
    active === null
    || active.deviceId !== fence.deviceId
    || active.sessionId !== fence.sessionId
    || retiredSessions.isRetired(fence.sessionId)
  ) {
    throw new AccountLeaseError('stale_lease');
  }
  return active;
}

export function startOrRenewAccountLease(
  state: AccountLeaseState,
  command: AccountLeaseAcquireCommand,
  retiredSessions: AccountRetiredSessionLookup,
): AccountLeaseTransition<AccountLeaseAcquireResult> {
  const nowMs = assertMonotonicClock(state, command.serverNowMs);
  const expectedRevision = safeNonNegativeInteger(command.expectedRevision);
  assertStateIdentity(state, command.principal.accountId, command.principal.tenantId);
  if (state.lifecycle.status !== 'active') throw new AccountLeaseError('account_lifecycle_blocked');

  const live = liveReceipts(state, nowMs);
  const prior = findReceipt(live, command.operationId);
  if (prior !== undefined) {
    if (prior.kind !== 'acquire' || !acquireReceiptMatches(prior, command)) {
      throw new AccountLeaseError('operation_reused');
    }
    const active = state.activeLease;
    if (
      active === null
      || active.sessionId !== prior.result.lease.sessionId
      || retiredSessions.isRetired(active.sessionId)
    ) {
      throw new AccountLeaseError('stale_lease');
    }
    return Object.freeze({
      state,
      result: Object.freeze({ ...prior.result, idempotent: true }),
      retirements: noRetirements(),
    });
  }
  if (expectedRevision !== state.revision) throw new AccountLeaseError('revision_mismatch');

  const active = state.activeLease;
  let result: AccountLeaseAcquireResult;
  let revision = state.revision;
  let retirements = noRetirements();
  if (active !== null && active.deviceId === command.deviceId) {
    if (!principalMatchesLease(command.principal, active)) throw new AccountLeaseError('identity_mismatch');
    if (retiredSessions.isRetired(active.sessionId)) throw new AccountLeaseError('stale_lease');
    if (command.principal.authEpoch < active.authEpoch) throw new AccountLeaseError('stale_auth_epoch');
    const lease = freezeLease({
      ...active,
      authEpoch: command.principal.authEpoch,
      renewedAtMs: nowMs,
    });
    result = Object.freeze({ type: 'renewed', lease, revokedLease: null, idempotent: false });
  } else {
    if (state.latestAuthEpoch !== null && command.principal.authEpoch <= state.latestAuthEpoch) {
      throw new AccountLeaseError('stale_auth_epoch');
    }
    if (retiredSessions.isRetired(command.sessionId) || active?.sessionId === command.sessionId) {
      throw new AccountLeaseError('session_reused');
    }
    revision += 1;
    const revokedLease = active === null
      ? null
      : Object.freeze({ ...active, revokedAtMs: nowMs });
    if (active !== null) retirements = retirement(active.sessionId);
    const lease = freezeLease({
      ...command.principal,
      deviceId: command.deviceId,
      sessionId: command.sessionId,
      issuedAtMs: nowMs,
      renewedAtMs: nowMs,
      revision,
    });
    result = Object.freeze({ type: 'acquired', lease, revokedLease, idempotent: false });
  }

  const receipt: AcquireReceipt = {
    kind: 'acquire',
    operationId: command.operationId,
    accountId: command.principal.accountId,
    tenantId: command.principal.tenantId,
    firebaseAuthUid: command.principal.firebaseAuthUid,
    providerSubject: command.principal.providerSubject,
    authEpoch: command.principal.authEpoch,
    deviceId: command.deviceId,
    expectedRevision,
    expiresAtMs: safeDeadline(nowMs, state.receiptLedger.retentionMs),
    result,
  };
  const nextState = Object.freeze({
    ...state,
    revision,
    activeLease: result.lease,
    latestAuthEpoch: Math.max(state.latestAuthEpoch ?? 0, command.principal.authEpoch),
    receiptLedger: appendReceipt(state, live, receipt),
    lastServerNowMs: nowMs,
  });
  return Object.freeze({ state: nextState, result, retirements });
}

export function releaseActiveAccountLease(
  state: AccountLeaseState,
  command: AccountLeaseReleaseCommand,
  retiredSessions: AccountRetiredSessionLookup,
): AccountLeaseTransition<AccountLeaseReleaseResult> {
  const nowMs = assertMonotonicClock(state, command.serverNowMs);
  const expectedRevision = safeNonNegativeInteger(command.expectedRevision);
  assertStateIdentity(state, command.accountId, command.tenantId);
  const live = liveReceipts(state, nowMs);
  const prior = findReceipt(live, command.operationId);
  if (prior !== undefined) {
    if (prior.kind !== 'release' || !releaseReceiptMatches(prior, command)) {
      throw new AccountLeaseError('operation_reused');
    }
    return Object.freeze({
      state,
      result: Object.freeze({ ...prior.result, idempotent: true }),
      retirements: noRetirements(),
    });
  }
  if (expectedRevision !== state.revision) throw new AccountLeaseError('revision_mismatch');
  const active = assertActiveAccountLease(state, command, retiredSessions);
  const revision = state.revision + 1;
  const result: AccountLeaseReleaseResult = Object.freeze({
    type: 'released', revision, idempotent: false,
  });
  const receipt: ReleaseReceipt = {
    kind: 'release',
    operationId: command.operationId,
    accountId: command.accountId,
    tenantId: command.tenantId,
    deviceId: command.deviceId,
    sessionId: command.sessionId,
    expectedRevision,
    expiresAtMs: safeDeadline(nowMs, state.receiptLedger.retentionMs),
    result,
  };
  const nextState = Object.freeze({
    ...state,
    revision,
    activeLease: null,
    receiptLedger: appendReceipt(state, live, receipt),
    lastServerNowMs: nowMs,
  });
  return Object.freeze({ state: nextState, result, retirements: retirement(active.sessionId) });
}
