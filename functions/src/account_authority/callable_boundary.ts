import {
  AccountLeaseError,
  asDeviceId,
  asFirebaseAuthUid,
  asOperationId,
  asSessionId,
  asTenantId,
  releaseActiveAccountLease,
  startOrRenewAccountLease,
  verifiedAuthContext,
  type AccountId,
  type AccountPrincipalResolverPort,
  type DeviceId,
  type FirebaseAuthUid,
  type ServerClockPort,
  type ServerSessionIdPort,
  type SessionId,
  type TenantId,
  type VerifiedAuthContext,
} from './lease_contract';
import {
  acquireAuthenticatedAccountLease,
  type AccountLeaseHandlerPorts,
  type AccountLeaseTransactionPort,
} from './lease_handlers';
import {
  beginAuthenticatedAccountDeletion,
  type AccountDeleteHandlerPorts,
  type AccountDeleteTransactionPort,
  type AccountDeleteStatus,
  type ProviderIdentityReleasePort,
} from './delete_contract';
import {
  accountAuthorityLogInfo,
  accountAuthorityServerCauseFields,
  accountAuthorityServerElapsedMs,
  accountAuthorityServerErrorCode,
  attachAccountAuthorityFailureDetail,
  isTransientAccountAuthorityStorageError,
  logAccountAuthorityFailureOnce,
} from './account_authority_log';

export type AccountAuthorityCallableErrorCode =
  | 'unauthenticated'
  | 'invalid-argument'
  | 'failed-precondition'
  // зачем (AA S0): временный сбой хранилища (contention, deadline, сеть) обязан
  // отличаться от «отклонено». Клиент повторяет unavailable, а отказ — нет.
  | 'unavailable'
  | 'internal';

/** Public, deliberately detail-free error contract for a future Firebase adapter. */
export class AccountAuthorityCallableError extends Error {
  readonly code: AccountAuthorityCallableErrorCode;

  constructor(code: AccountAuthorityCallableErrorCode, message: string) {
    super(message);
    this.name = 'AccountAuthorityCallableError';
    this.code = code;
  }
}

type UnknownRecord = Readonly<Record<string, unknown>>;

export type AccountAuthorityCallableRequest = Readonly<{
  auth?: Readonly<{ uid?: unknown; token?: unknown }> | null;
  /** Optional because App Check enforcement is owner-sealed off in this project. */
  app?: Readonly<{ appId?: unknown; token?: unknown }> | null;
  data: unknown;
}>;

export type AccountAuthorityCallableIdentitySource = Readonly<{
  firebaseAuthUid: FirebaseAuthUid;
  authToken: UnknownRecord;
  app: Readonly<{ appId: string; token: UnknownRecord }> | null;
}>;

/**
 * Returned only by a server adapter that resolves device/session binding from
 * trusted Firebase callable metadata or durable server state. Request data is
 * intentionally absent from AccountAuthorityCallableIdentitySource.
 */
export type AccountAuthorityCallableIdentityResolution = Readonly<{
  tenantId: TenantId;
  deviceId: DeviceId;
  authEpoch: number;
  activeSessionId?: SessionId;
}>;

export interface AccountAuthorityCallableIdentityPort {
  resolve(
    source: AccountAuthorityCallableIdentitySource,
    bindingToken: string | null,
  ): Promise<AccountAuthorityCallableIdentityResolution>;
}

type LeaseBoundaryPorts = Readonly<{
  principals: AccountPrincipalResolverPort;
  sessions: ServerSessionIdPort;
  clock: ServerClockPort;
  transactions: AccountLeaseTransactionPort;
}>;

type DeleteBoundaryPorts = Readonly<{
  principals: AccountPrincipalResolverPort;
  clock: ServerClockPort;
  claims: AccountDeleteHandlerPorts<AccountAuthorityCallableRequest>['claims'];
  transactions: AccountDeleteTransactionPort;
  identity: ProviderIdentityReleasePort;
}>;

export type AccountAuthorityCallableBoundaryPorts = Readonly<{
  identities: AccountAuthorityCallableIdentityPort;
  lease: LeaseBoundaryPorts;
  deletion: DeleteBoundaryPorts;
}>;

export type AccountAuthorityLeaseCallableResponse = Readonly<{
  schemaVersion: 'account-authority-lease.v1';
  type: 'acquired' | 'renewed';
  accountId: AccountId;
  sessionId: SessionId;
  revision: number;
  idempotent: boolean;
  previousLeaseRevoked: boolean;
}>;

export type AccountAuthorityLeaseReleaseCallableResponse = Readonly<{
  schemaVersion: 'account-authority-lease-release.v1';
  type: 'released';
  revision: number;
  idempotent: boolean;
}>;

export type AccountAuthorityDeleteCallableResponse = Readonly<{
  schemaVersion: 'account-authority-delete.v1';
  jobId: string;
  status: AccountDeleteStatus;
  createdAtMs: number;
  updatedAtMs: number;
}>;

type ParsedOperationRequest = Readonly<{
  operationId: string;
  expectedRevision: number;
}>;

type ParsedLeaseRequest = Readonly<{
  operationId: string;
  expectedRevision: number | null;
  bindingToken: string;
}>;

type ParsedReleaseRequest = Readonly<{
  operationId: string;
  expectedRevision: number;
  sessionId: SessionId;
  bindingToken: string;
}>;

function publicError(
  code: AccountAuthorityCallableErrorCode,
  message: string,
): AccountAuthorityCallableError {
  return new AccountAuthorityCallableError(code, message);
}

type BoundaryOperation = 'lease_acquire' | 'lease_release' | 'delete_begin';

// зачем (AA S1, ревью L4): отказ разбора запроса не пишет свою строку, а
// прикрепляет к ошибке этап и причину. Итоговая строка вызова выведет их одной
// записью. Значения полей (operationId, sessionId, токен) в лог не уходят.
function invalidRequest(
  reason: string,
  error?: unknown,
): AccountAuthorityCallableError {
  const failure = publicError('invalid-argument', 'account_authority_request_invalid');
  attachAccountAuthorityFailureDetail(failure, { stage: 'parse', reason });
  return error === undefined
    ? failure
    : attachAccountAuthorityFailureDetail(failure, accountAuthorityServerCauseFields(error));
}

function rejectedAt(
  code: AccountAuthorityCallableErrorCode,
  message: string,
  stage: string,
  reason: string,
): AccountAuthorityCallableError {
  return attachAccountAuthorityFailureDetail(publicError(code, message), { stage, reason });
}

/**
 * Неизвестный сбой (не публичная ошибка и не отказ контракта). зачем (AA S1):
 * раньше всё уходило в `internal` без следа. Временный сбой хранилища
 * (contention/deadline/unavailable) становится повторяемым `unavailable`,
 * остальное — `internal`. Вид и код причины прикрепляются к ошибке, и итоговая
 * строка внешнего слоя пишет их одной записью (для internal — уровнем error).
 * Наружу текст ошибки не уходит.
 */
export function mapUnknownAccountAuthorityFailure(
  error: unknown,
  operation: string,
  stage: string,
): AccountAuthorityCallableError {
  const transient = isTransientAccountAuthorityStorageError(error);
  const failure = transient
    ? publicError('unavailable', 'account_authority_unavailable')
    : publicError('internal', 'account_authority_unavailable');
  return attachAccountAuthorityFailureDetail(
    failure,
    { operation, stage, mappedTo: failure.code },
    accountAuthorityServerCauseFields(error),
  );
}

/**
 * Итоговая строка вызова: ровно одна на ошибку (ревью L4). Публичная ошибка
 * уходит как есть, неизвестная проходит через mapUnknownAccountAuthorityFailure.
 */
export function finalizeAccountAuthorityCallableFailure(
  error: unknown,
  operation: string,
  startedAt: number,
): AccountAuthorityCallableError {
  const mapped = error instanceof AccountAuthorityCallableError
    ? error
    : mapUnknownAccountAuthorityFailure(error, operation, 'boundary');
  logAccountAuthorityFailureOnce('callable failed', {
    operation,
    code: mapped.code,
    durationMs: accountAuthorityServerElapsedMs(startedAt),
  }, [error, mapped]);
  return mapped;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function frozenRecord(value: unknown): UnknownRecord | null {
  if (!isRecord(value)) return null;
  return Object.freeze({ ...value });
}

function validMetadataId(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= 256
    && value.trim() === value
    && !value.includes('..')
    && !/[\\/\u0000-\u001f\u007f]/.test(value)
    && !/%2e|%2f|%5c/i.test(value);
}

function parseOperationRequest(data: unknown): ParsedOperationRequest {
  if (!isRecord(data)) {
    throw invalidRequest('not_object');
  }
  const keys = Object.keys(data).sort();
  if (keys.length !== 2 || keys[0] !== 'expectedRevision' || keys[1] !== 'operationId') {
    throw invalidRequest('keys_mismatch');
  }
  if (!Number.isSafeInteger(data.expectedRevision) || (data.expectedRevision as number) < 0) {
    throw invalidRequest('expected_revision_invalid');
  }
  try {
    return Object.freeze({
      operationId: asOperationId(data.operationId),
      expectedRevision: data.expectedRevision as number,
    });
  } catch (error) {
    throw invalidRequest('operation_id_invalid', error);
  }
}

function parseLeaseRequest(data: unknown): ParsedLeaseRequest {
  if (!isRecord(data)) {
    throw invalidRequest('not_object');
  }
  const keys = Object.keys(data).sort();
  if (
    keys.length !== 3
    || keys[0] !== 'bindingToken'
    || keys[1] !== 'expectedRevision'
    || keys[2] !== 'operationId'
    || (
      data.expectedRevision !== null
      && (!Number.isSafeInteger(data.expectedRevision) || (data.expectedRevision as number) < 0)
    )
    || typeof data.bindingToken !== 'string'
    || data.bindingToken.length < 1
    || data.bindingToken.length > 512
    || data.bindingToken.trim() !== data.bindingToken
  ) {
    throw invalidRequest('shape_invalid');
  }
  try {
    return Object.freeze({
      operationId: asOperationId(data.operationId),
      expectedRevision: data.expectedRevision as number | null,
      bindingToken: data.bindingToken,
    });
  } catch (error) {
    throw invalidRequest('operation_id_invalid', error);
  }
}

function parseReleaseRequest(data: unknown): ParsedReleaseRequest {
  if (!isRecord(data)) {
    throw invalidRequest('not_object');
  }
  const keys = Object.keys(data).sort();
  if (
    keys.length !== 4
    || keys[0] !== 'bindingToken'
    || keys[1] !== 'expectedRevision'
    || keys[2] !== 'operationId'
    || keys[3] !== 'sessionId'
    || !Number.isSafeInteger(data.expectedRevision)
    || (data.expectedRevision as number) < 0
    || typeof data.bindingToken !== 'string'
    || data.bindingToken.length < 1
    || data.bindingToken.length > 512
    || data.bindingToken.trim() !== data.bindingToken
  ) {
    throw invalidRequest('shape_invalid');
  }
  try {
    return Object.freeze({
      operationId: asOperationId(data.operationId),
      expectedRevision: data.expectedRevision as number,
      sessionId: asSessionId(data.sessionId),
      bindingToken: data.bindingToken,
    });
  } catch (error) {
    throw invalidRequest('ids_invalid', error);
  }
}

function parseIdentitySource(request: AccountAuthorityCallableRequest): AccountAuthorityCallableIdentitySource {
  const authToken = frozenRecord(request.auth?.token);
  if (request.auth == null || authToken === null) {
    throw rejectedAt(
      'unauthenticated',
      'account_authority_auth_required',
      'auth',
      request.auth == null ? 'no_auth' : 'no_token',
    );
  }
  let firebaseAuthUid: FirebaseAuthUid;
  try {
    firebaseAuthUid = asFirebaseAuthUid(request.auth.uid);
  } catch (error) {
    throw attachAccountAuthorityFailureDetail(
      rejectedAt('unauthenticated', 'account_authority_auth_invalid', 'auth', 'uid_invalid'),
      accountAuthorityServerCauseFields(error),
    );
  }

  let app: AccountAuthorityCallableIdentitySource['app'] = null;
  if (request.app != null) {
    const appToken = frozenRecord(request.app.token);
    if (!validMetadataId(request.app.appId) || appToken === null) {
      throw rejectedAt('unauthenticated', 'account_authority_auth_invalid', 'auth', 'app_metadata_invalid');
    }
    app = Object.freeze({ appId: request.app.appId, token: appToken });
  }
  return Object.freeze({ firebaseAuthUid, authToken, app });
}

async function resolveIdentity(
  port: AccountAuthorityCallableIdentityPort,
  source: AccountAuthorityCallableIdentitySource,
  bindingToken: string | null,
): Promise<Readonly<{
  auth: VerifiedAuthContext;
  activeSessionId: SessionId | null;
}>> {
  try {
    const resolved = await port.resolve(source, bindingToken);
    const auth = verifiedAuthContext({
      tenantId: asTenantId(resolved.tenantId),
      firebaseAuthUid: source.firebaseAuthUid,
      deviceId: asDeviceId(resolved.deviceId),
      authEpoch: resolved.authEpoch,
    });
    const activeSessionId = resolved.activeSessionId === undefined
      ? null
      : asSessionId(resolved.activeSessionId);
    return Object.freeze({ auth, activeSessionId });
  } catch (error) {
    // Отказ резолвера уже несёт свои подробности; дописываем только этап.
    if (error instanceof AccountAuthorityCallableError) {
      throw attachAccountAuthorityFailureDetail(error, { stage: 'identity' });
    }
    // Битые данные от доверенного резолвера (в т.ч. AccountLeaseError
    // invalid_input) — это сбой сервера, а не плохой ввод клиента: internal.
    throw mapUnknownAccountAuthorityFailure(error, 'identity', 'resolve');
  }
}

async function acquireWithServerRevision(
  ports: LeaseBoundaryPorts,
  auth: VerifiedAuthContext,
  request: Readonly<{ operationId: string }>,
) {
  const principal = await ports.principals.resolvePrincipal(auth);
  const sessionId = await ports.sessions.issueSessionId();
  const operationId = asOperationId(request.operationId);
  const serverNowMs = ports.clock.nowMs();
  return ports.transactions.transact(
    { accountId: principal.accountId, tenantId: auth.tenantId },
    Object.freeze([sessionId]),
    ({ state, retiredSessions }) => {
      const prior = state.receiptLedger.entries.find(
        (receipt) => receipt.operationId === operationId,
      );
      return startOrRenewAccountLease(state, {
      principal: Object.freeze({
        accountId: principal.accountId,
        providerSubject: principal.providerSubject,
        tenantId: auth.tenantId,
        firebaseAuthUid: auth.firebaseAuthUid,
        authEpoch: auth.authEpoch,
      }),
      deviceId: auth.deviceId,
      sessionId,
      operationId,
      // Explicit null bootstrap is resolved from the serialized server state.
      // Existing accounts therefore never receive a client-invented revision 0.
      expectedRevision: prior?.kind === 'acquire'
        ? prior.expectedRevision
        : state.revision,
      serverNowMs,
      }, retiredSessions);
    },
  );
}

function fixedAuthPort(
  context: VerifiedAuthContext,
): AccountLeaseHandlerPorts<AccountAuthorityCallableRequest>['auth'] {
  return Object.freeze({
    async requireAuthenticated() {
      return context;
    },
  });
}

function mapContractError(error: unknown, operation: BoundaryOperation): AccountAuthorityCallableError {
  if (error instanceof AccountAuthorityCallableError) {
    return attachAccountAuthorityFailureDetail(error, { stage: 'contract' });
  }
  if (error instanceof AccountLeaseError) {
    // зачем (ревью M1): внутри контракта invalid_input почти всегда означает
    // испорченные данные Firestore (разбор аренды, принципала, срока), а не
    // ошибку клиента. Плохой ввод клиента отсекает разбор запроса
    // (invalid-argument) ещё до контракта. Поэтому здесь это сбой сервера:
    // internal и error-строка с видом и кодом.
    if (error.code === 'invalid_input') {
      return mapUnknownAccountAuthorityFailure(error, operation, 'contract');
    }
    return attachAccountAuthorityFailureDetail(
      publicError('failed-precondition', 'account_authority_request_rejected'),
      { stage: 'contract', leaseCode: error.code, mappedTo: 'failed-precondition' },
    );
  }
  if (error instanceof Error && error.message.startsWith('account_authority_delete_')) {
    return attachAccountAuthorityFailureDetail(
      publicError('failed-precondition', 'account_authority_request_rejected'),
      {
        stage: 'contract',
        // Свой код account_authority_delete_* или none — текст ошибки в лог не идёт.
        deleteCode: accountAuthorityServerErrorCode(error),
        mappedTo: 'failed-precondition',
      },
    );
  }
  return mapUnknownAccountAuthorityFailure(error, operation, 'contract');
}

export async function handleAccountLeaseAcquireCallable(
  ports: AccountAuthorityCallableBoundaryPorts,
  request: AccountAuthorityCallableRequest,
): Promise<AccountAuthorityLeaseCallableResponse> {
  const startedAt = Date.now();
  accountAuthorityLogInfo('callable start', { operation: 'lease_acquire' });
  try {
    return await runLeaseAcquire(ports, request, startedAt);
  } catch (error) {
    throw finalizeAccountAuthorityCallableFailure(error, 'lease_acquire', startedAt);
  }
}

async function runLeaseAcquire(
  ports: AccountAuthorityCallableBoundaryPorts,
  request: AccountAuthorityCallableRequest,
  startedAt: number,
): Promise<AccountAuthorityLeaseCallableResponse> {
  const data = parseLeaseRequest(request.data);
  const source = parseIdentitySource(request);
  const identity = await resolveIdentity(ports.identities, source, data.bindingToken);
  accountAuthorityLogInfo('callable branch', {
    operation: 'lease_acquire',
    revision: data.expectedRevision === null ? 'server_bootstrap' : 'client_expected',
  });
  try {
    const result = data.expectedRevision === null
      ? await acquireWithServerRevision(ports.lease, identity.auth, data)
      : await acquireAuthenticatedAccountLease({
        ...ports.lease,
        auth: fixedAuthPort(identity.auth),
      }, request, {
        operationId: data.operationId,
        expectedRevision: data.expectedRevision,
      });
    accountAuthorityLogInfo('callable done', {
      operation: 'lease_acquire',
      type: result.type,
      idempotent: result.idempotent,
      previousLeaseRevoked: result.revokedLease !== null,
      durationMs: accountAuthorityServerElapsedMs(startedAt),
    });
    return Object.freeze({
      schemaVersion: 'account-authority-lease.v1' as const,
      type: result.type,
      accountId: result.lease.accountId,
      sessionId: result.lease.sessionId,
      revision: result.lease.revision,
      idempotent: result.idempotent,
      previousLeaseRevoked: result.revokedLease !== null,
    });
  } catch (error) {
    throw mapContractError(error, 'lease_acquire');
  }
}

export async function handleAccountLeaseReleaseCallable(
  ports: AccountAuthorityCallableBoundaryPorts,
  request: AccountAuthorityCallableRequest,
): Promise<AccountAuthorityLeaseReleaseCallableResponse> {
  const startedAt = Date.now();
  accountAuthorityLogInfo('callable start', { operation: 'lease_release' });
  try {
    return await runLeaseRelease(ports, request, startedAt);
  } catch (error) {
    throw finalizeAccountAuthorityCallableFailure(error, 'lease_release', startedAt);
  }
}

async function runLeaseRelease(
  ports: AccountAuthorityCallableBoundaryPorts,
  request: AccountAuthorityCallableRequest,
  startedAt: number,
): Promise<AccountAuthorityLeaseReleaseCallableResponse> {
  const data = parseReleaseRequest(request.data);
  const source = parseIdentitySource(request);
  const identity = await resolveIdentity(ports.identities, source, data.bindingToken);
  if (identity.activeSessionId !== null && identity.activeSessionId !== data.sessionId) {
    throw rejectedAt('failed-precondition', 'account_authority_request_rejected', 'session', 'session_not_active');
  }
  accountAuthorityLogInfo('callable branch', {
    operation: 'lease_release',
    activeSession: identity.activeSessionId === null ? 'none' : 'matches',
  });
  try {
    const principal = await ports.lease.principals.resolvePrincipal(identity.auth);
    const operationId = asOperationId(data.operationId);
    const serverNowMs = ports.lease.clock.nowMs();
    const result = await ports.lease.transactions.transact(
      { accountId: principal.accountId, tenantId: identity.auth.tenantId },
      Object.freeze([data.sessionId]),
      ({ state, retiredSessions }) => releaseActiveAccountLease(state, {
        accountId: principal.accountId,
        tenantId: identity.auth.tenantId,
        deviceId: identity.auth.deviceId,
        sessionId: data.sessionId,
        operationId,
        expectedRevision: data.expectedRevision,
        serverNowMs,
      }, retiredSessions),
    );
    accountAuthorityLogInfo('callable done', {
      operation: 'lease_release',
      type: result.type,
      idempotent: result.idempotent,
      durationMs: accountAuthorityServerElapsedMs(startedAt),
    });
    return Object.freeze({
      schemaVersion: 'account-authority-lease-release.v1' as const,
      type: result.type,
      revision: result.revision,
      idempotent: result.idempotent,
    });
  } catch (error) {
    throw mapContractError(error, 'lease_release');
  }
}

export async function handleAccountDeleteBeginCallable(
  ports: AccountAuthorityCallableBoundaryPorts,
  request: AccountAuthorityCallableRequest,
): Promise<AccountAuthorityDeleteCallableResponse> {
  const startedAt = Date.now();
  accountAuthorityLogInfo('callable start', { operation: 'delete_begin' });
  try {
    return await runDeleteBegin(ports, request, startedAt);
  } catch (error) {
    throw finalizeAccountAuthorityCallableFailure(error, 'delete_begin', startedAt);
  }
}

async function runDeleteBegin(
  ports: AccountAuthorityCallableBoundaryPorts,
  request: AccountAuthorityCallableRequest,
  startedAt: number,
): Promise<AccountAuthorityDeleteCallableResponse> {
  const data = parseOperationRequest(request.data);
  const source = parseIdentitySource(request);
  const identity = await resolveIdentity(ports.identities, source, null);
  if (identity.activeSessionId === null) {
    throw rejectedAt('failed-precondition', 'account_authority_request_rejected', 'session', 'no_active_session');
  }
  try {
    const result = await beginAuthenticatedAccountDeletion({
      ...ports.deletion,
      auth: fixedAuthPort(identity.auth),
    }, request, {
      operationId: data.operationId,
      expectedRevision: data.expectedRevision,
      sessionId: identity.activeSessionId,
    });
    accountAuthorityLogInfo('callable done', {
      operation: 'delete_begin',
      status: result.status,
      durationMs: accountAuthorityServerElapsedMs(startedAt),
    });
    return Object.freeze({
      schemaVersion: 'account-authority-delete.v1' as const,
      jobId: result.jobId,
      status: result.status,
      createdAtMs: result.createdAtMs,
      updatedAtMs: result.updatedAtMs,
    });
  } catch (error) {
    throw mapContractError(error, 'delete_begin');
  }
}
