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
  type AccountLeaseReleaseResult,
  type AccountLeaseState,
  type AccountLeaseTransition,
  type AccountPrincipalResolverPort,
  type AccountRetiredSessionLookup,
  type DeviceId,
  type FirebaseAuthUid,
  type ResolvedAccountPrincipal,
  type ServerClockPort,
  type ServerSessionIdPort,
  type SessionId,
  type TenantId,
  type VerifiedAuthContext,
} from './lease_contract';
import {
  type AccountLeaseHandlerPorts,
  type AccountLeaseTransactionPort,
} from './lease_handlers';
import {
  accountAuthorityUidFingerprint,
  classifySignInProvider,
  isStrictAccountSessionId,
} from './account_authority_policy';
import {
  beginBoundAccountDeletion,
  type AccountDeleteBoundPrepareContext,
  type AccountDeleteJob,
  type AccountDeleteTransition,
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
  readAccountAuthorityFailureDetail,
} from './account_authority_log';

export type AccountAuthorityCallableErrorCode =
  | 'unauthenticated'
  | 'invalid-argument'
  | 'failed-precondition'
  // зачем (AA S0): временный сбой хранилища (contention, deadline, сеть) обязан
  // отличаться от «отклонено». Клиент повторяет unavailable, а отказ — нет.
  | 'unavailable'
  // зачем (AA S2a, пункт 1): анонимному входу аренда не положена — это отказ
  // по правам, а не «не вошёл», поэтому отдельный код.
  | 'permission-denied'
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

/**
 * Что адаптер отдаёт переходу аренды внутри ЕДИНОЙ транзакции (AA S2a,
 * пункт 3). Субъект аренды (хеш uid) адаптер НЕ задаёт: его строит граница
 * одной функцией для входа, выхода и удаления (раунд 2, M1).
 */
export type AccountAuthorityBoundLeaseContext = Readonly<{
  principal: Readonly<ResolvedAccountPrincipal & { tenantId: TenantId }>;
  deviceId: DeviceId;
  authEpoch: number;
  state: AccountLeaseState;
  retiredSessions: AccountRetiredSessionLookup;
}>;

export type AccountAuthorityBoundLeaseRequest = Readonly<{
  source: AccountAuthorityCallableIdentitySource;
  bindingToken: string;
  retirementSessionIds: readonly SessionId[];
  serverNowMs: number;
}>;

export type AccountAuthorityBoundReleaseRequest = Readonly<{
  source: AccountAuthorityCallableIdentitySource;
  bindingToken: string;
  sessionId: SessionId;
  serverNowMs: number;
}>;

export type AccountAuthorityBoundReleaseContext = Readonly<{
  accountId: AccountId;
  tenantId: TenantId;
  deviceId: DeviceId;
  state: AccountLeaseState;
  retiredSessions: AccountRetiredSessionLookup;
}>;

export interface AccountAuthorityBoundLeaseTransactionPort {
  /**
   * Одна транзакция на вход: проверка привязки установки → принципал (с D-AA1)
   * → состояние аренды → отметки отозванных сессий → переход → записи.
   * Отказ привязки — AccountAuthorityCallableError; сбой хранилища — как есть.
   */
  transactAcquire<T>(
    request: AccountAuthorityBoundLeaseRequest,
    transition: (context: AccountAuthorityBoundLeaseContext) => AccountLeaseTransition<T>,
  ): Promise<T>;

  /**
   * Раунд 2, L5: выход — тоже одна транзакция (привязка → принципал → аренда).
   * Выход НИКОГДА не создаёт принципал: нет принципала — null («нечего
   * освобождать»), ничего не пишется.
   */
  transactRelease(
    request: AccountAuthorityBoundReleaseRequest,
    transition: (context: AccountAuthorityBoundReleaseContext) => AccountLeaseTransition<AccountLeaseReleaseResult>,
  ): Promise<AccountLeaseReleaseResult | null>;
}

type LeaseBoundaryPorts = Readonly<{
  sessions: ServerSessionIdPort;
  clock: ServerClockPort;
  transactions: AccountLeaseTransactionPort;
  // зачем (AA S2a, пункт 3): вход идёт только через единую транзакцию.
  bound: AccountAuthorityBoundLeaseTransactionPort;
}>;

export type AccountAuthorityBoundDeleteRequest = Readonly<{
  source: AccountAuthorityCallableIdentitySource;
  bindingToken: string;
}>;

export interface AccountAuthorityBoundDeletePort {
  /**
   * S2a раунд 3, L-R2-4: подготовка удаления — одна транзакция (привязка →
   * принципал без создания → аренда и удаление → переход → записи), как вход
   * и выход. Хранение состояния удаления в Firestore — шов S4.
   */
  transactPrepare(
    request: AccountAuthorityBoundDeleteRequest,
    transition: (context: AccountDeleteBoundPrepareContext) => AccountDeleteTransition<AccountDeleteJob>,
  ): Promise<AccountDeleteJob>;
}

type DeleteBoundaryPorts = Readonly<{
  clock: ServerClockPort;
  claims: AccountDeleteHandlerPorts<AccountAuthorityCallableRequest>['claims'];
  transactions: AccountDeleteTransactionPort;
  identity: ProviderIdentityReleasePort;
  bound: AccountAuthorityBoundDeletePort;
}>;

// зачем (S2a раунд 3): прежний двухшаговый путь удаления (резолвер личности,
// затем отдельные транзакции) и неиспользуемые резолверы принципала удалены —
// все три операции идут через единые транзакции порта `bound`.
export type AccountAuthorityCallableBoundaryPorts = Readonly<{
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
  bindingToken: string;
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
  // зачем (раунд 2, M1): удаление проверяет привязку установки так же, как
  // вход и выход; прежний путь с bindingToken = null отклонялся всегда.
  const keys = Object.keys(data).sort();
  if (
    keys.length !== 3
    || keys[0] !== 'bindingToken'
    || keys[1] !== 'expectedRevision'
    || keys[2] !== 'operationId'
  ) {
    throw invalidRequest('keys_mismatch');
  }
  if (!Number.isSafeInteger(data.expectedRevision) || (data.expectedRevision as number) < 0) {
    throw invalidRequest('expected_revision_invalid');
  }
  if (
    typeof data.bindingToken !== 'string'
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
      bindingToken: data.bindingToken,
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
  // зачем (AA S2a, пункт 5): sessionId выдаёт только сервер, и только в форме
  // session-<uuid v4>. Любая иная строка — подделка или порча; отказ до Firestore.
  if (!isStrictAccountSessionId(data.sessionId)) {
    throw invalidRequest('session_id_invalid');
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
  // зачем (AA S2a, пункт 1): анонимному входу не положены ни аренда, ни
  // удаление аккаунта AA. Нет вида входа в проверенном токене — тоже отказ
  // (fail closed). Отказ до любого обращения к резолверу и Firestore.
  const provider = classifySignInProvider(authToken);
  if (provider !== 'allowed') {
    throw rejectedAt(
      'permission-denied',
      provider === 'anonymous'
        ? 'account_authority_anonymous_rejected'
        : 'account_authority_sign_in_provider_rejected',
      'auth',
      provider,
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

/**
 * зачем (раунд 2, M1): субъект аренды — хеш uid — строится ЗДЕСЬ, одной
 * функцией для входа, выхода и удаления. Раньше вход хранил хеш, а удаление
 * сравнивало сырой uid → identity_mismatch.
 */
function leaseSubjectOf(source: AccountAuthorityCallableIdentitySource): FirebaseAuthUid {
  return asFirebaseAuthUid(accountAuthorityUidFingerprint(source.firebaseAuthUid));
}


/**
 * зачем (AA S2a, пункт 3): вход — одна транзакция. Привязка установки,
 * принципал и аренда читаются и пишутся атомарно, поэтому отзыв привязки
 * «между шагами» невозможен: Firestore повторит транзакцию и повтор увидит
 * отзыв. Прежние две транзакции (привязка, затем аренда) и лишние чтения
 * принципала/аккаунта убраны: минус 3 транзакции и минус 2 чтения на вход.
 *
 * `expectedRevision === null` — первый вход: ревизия берётся из серверного
 * состояния (или из квитанции той же операции при повторе после потери ответа).
 */
async function acquireInBoundTransaction(
  ports: LeaseBoundaryPorts,
  source: AccountAuthorityCallableIdentitySource,
  request: ParsedLeaseRequest,
) {
  const sessionId = await ports.sessions.issueSessionId();
  const operationId = asOperationId(request.operationId);
  const serverNowMs = ports.clock.nowMs();
  return ports.bound.transactAcquire({
    source,
    bindingToken: request.bindingToken,
    retirementSessionIds: Object.freeze([sessionId]),
    serverNowMs,
  }, ({ principal, deviceId, authEpoch, state, retiredSessions }) => {
    // Данные адаптера проверяются так же строго, как раньше данные резолвера:
    // порча → AccountLeaseError(invalid_input) → internal (ревью M1).
    const auth = verifiedAuthContext({
      tenantId: asTenantId(principal.tenantId),
      firebaseAuthUid: leaseSubjectOf(source),
      deviceId: asDeviceId(deviceId),
      authEpoch,
    });
    const prior = state.receiptLedger.entries.find((receipt) => receipt.operationId === operationId);
    let expectedRevision: number;
    if (request.expectedRevision !== null) expectedRevision = request.expectedRevision;
    else if (prior?.kind === 'acquire') expectedRevision = prior.expectedRevision;
    else expectedRevision = state.revision;
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
      expectedRevision,
      serverNowMs,
    }, retiredSessions);
  });
}


function mapContractError(error: unknown, operation: BoundaryOperation): AccountAuthorityCallableError {
  if (error instanceof AccountAuthorityCallableError) {
    // зачем (S2a): отказ привязки/принципала из единой транзакции уже несёт свой
    // этап (binding/principal) — не затираем его общим «contract».
    if (readAccountAuthorityFailureDetail(error).stage !== undefined) return error;
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
  accountAuthorityLogInfo('callable branch', {
    operation: 'lease_acquire',
    revision: data.expectedRevision === null ? 'server_bootstrap' : 'client_expected',
    stage: 'bound_transaction',
  });
  try {
    const result = await acquireInBoundTransaction(ports.lease, source, data);
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
  accountAuthorityLogInfo('callable branch', { operation: 'lease_release', stage: 'bound_transaction' });
  try {
    const operationId = asOperationId(data.operationId);
    const serverNowMs = ports.lease.clock.nowMs();
    // зачем (раунд 2, L5): одна транзакция — привязка, принципал, аренда.
    // Несовпадение сессии с активной ловит контракт (stale_lease → отказ).
    const result = await ports.lease.bound.transactRelease({
      source,
      bindingToken: data.bindingToken,
      sessionId: data.sessionId,
      serverNowMs,
    }, ({ accountId, tenantId, deviceId, state, retiredSessions }) => releaseActiveAccountLease(state, {
      accountId,
      tenantId: asTenantId(tenantId),
      deviceId: asDeviceId(deviceId),
      sessionId: data.sessionId,
      operationId,
      expectedRevision: data.expectedRevision,
      serverNowMs,
    }, retiredSessions));
    if (result === null) {
      // Ранний выход: у uid нет принципала — выпускать нечего; ничего не записано.
      accountAuthorityLogInfo('callable done', {
        operation: 'lease_release',
        type: 'released',
        status: 'no_principal',
        idempotent: true,
        durationMs: accountAuthorityServerElapsedMs(startedAt),
      });
      return Object.freeze({
        schemaVersion: 'account-authority-lease-release.v1' as const,
        type: 'released' as const,
        revision: 0,
        idempotent: true,
      });
    }
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
  accountAuthorityLogInfo('callable branch', { operation: 'delete_begin', stage: 'bound_transaction' });
  try {
    const result = await beginBoundAccountDeletion({
      clock: ports.deletion.clock,
      claims: ports.deletion.claims,
      transactions: ports.deletion.transactions,
      identity: ports.deletion.identity,
      bound: {
        transactPrepare: (transition) => ports.deletion.bound.transactPrepare(
          { source, bindingToken: data.bindingToken },
          transition,
        ),
      },
    }, {
      operationId: data.operationId,
      expectedRevision: data.expectedRevision,
      leaseSubject: leaseSubjectOf(source),
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
