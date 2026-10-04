import {
  parseAccountId,
  parseDeviceId,
  parseSessionId,
} from './account_authority_ids';
import type {
  AccountId,
  DeviceId,
  FirebaseAuthUid,
  SessionId,
} from './account_authority_ids';
import type { AccountAuthorityLeasePort } from './account_authority_runtime';
import {
  ACCOUNT_AUTHORITY_EVICTION_LEASE_CODES,
  ACCOUNT_AUTHORITY_LEASE_EVICTED_CODE,
  ACCOUNT_AUTHORITY_RELEASE_DONE_LEASE_CODES,
  ACCOUNT_AUTHORITY_RETRY_MAX_ATTEMPTS,
  ACCOUNT_AUTHORITY_ROTATE_LEASE_CODES,
  accountAuthorityRetryDelayMs,
  classifyAccountAuthorityFailure,
  planAccountAuthorityAcquireReplay,
  type AccountAuthorityFailureClass,
  type AccountAuthorityFinalReason,
} from './account_authority_failure_policy';
import {
  accountAuthorityElapsedMs,
  accountAuthorityErrorCode,
  accountAuthorityErrorKind,
  safeAccountAuthorityLogger,
  type AccountAuthorityLogger,
} from './account_authority_logger';

export const ACCOUNT_AUTHORITY_LEASE_ACQUIRE_CALLABLE = 'accountAuthorityLeaseAcquire';
export const ACCOUNT_AUTHORITY_LEASE_RELEASE_CALLABLE = 'accountAuthorityLeaseRelease';
export const ACCOUNT_AUTHORITY_INSTALLATION_BINDING_CALLABLE = 'accountAuthorityInstallationBindingCreate';
/** S4a: начало удаления аккаунта (сервер: firebase_lease_callable.ts, rollout выключен). */
export const ACCOUNT_AUTHORITY_DELETE_BEGIN_CALLABLE = 'accountAuthorityDeleteBegin';
const FUNCTIONS_REGION = 'us-central1';
const CALLABLE_TIMEOUT_MS = 30_000;

export type AccountAuthorityCallableInvoker = (
  name: string,
  data: Readonly<Record<string, unknown>>,
) => Promise<unknown>;

/**
 * Revision is durable state, not a guessed transport default. A missing value
 * must fail closed until bootstrap proves this is a brand-new server account or
 * hydrates the current revision from the server.
 */
export interface AccountAuthorityLeaseRevisionStore {
  read(firebaseAuthUid: FirebaseAuthUid): Promise<number | null>;
  write(firebaseAuthUid: FirebaseAuthUid, revision: number): Promise<void>;
  readLease(owner: Readonly<{ accountId: AccountId; sessionId: SessionId }>): Promise<number | null>;
  bindLease(
    firebaseAuthUid: FirebaseAuthUid,
    owner: Readonly<{ accountId: AccountId; sessionId: SessionId }>,
    revision: number,
  ): Promise<void>;
  writeLease(
    owner: Readonly<{ accountId: AccountId; sessionId: SessionId }>,
    revision: number,
  ): Promise<void>;
  /**
   * зачем (AA S2c, L-S2b-3): «выход выполнен» на повторе (S2b-R4) — допущение.
   * Чтобы при следующем входе ТОГО ЖЕ uid проверить оставшуюся аренду, транспорт
   * должен знать, что эта аренда принадлежала именно ему. Сравнение — по хешу uid
   * в записи аренды; сам uid не хранится. Нет метода → проверка не выполняется (лог).
   */
  leaseOwnedBy?(
    owner: Readonly<{ accountId: AccountId; sessionId: SessionId }>,
    firebaseAuthUid: FirebaseAuthUid,
  ): Promise<boolean>;
}

export type AccountAuthorityInstallationBinding = Readonly<{
  bindingToken: string;
  deviceBindingId: DeviceId;
}>;

export type AccountAuthorityLeaseOwnerRef = Readonly<{ accountId: AccountId; sessionId: SessionId }>;

/**
 * зачем (AA S2b, пункт 8): привязка установки хранится ПО UID, а не одна на
 * установку. Прежде вход B на устройстве после A предъявлял токен A → сервер
 * отвечал binding_mismatch → (повтор) снова токен A → цикл. Теперь у каждого
 * uid своя привязка; окончательный отказ привязки сбрасывает именно её.
 * Выход ищет привязку по записи своей аренды (тот uid, что её брал).
 */
export interface AccountAuthorityInstallationBindingPort {
  obtain(firebaseAuthUid: FirebaseAuthUid): Promise<AccountAuthorityInstallationBinding>;
  readPersistedForLease(owner: AccountAuthorityLeaseOwnerRef): Promise<AccountAuthorityInstallationBinding | null>;
  /** S2b-R3: новая привязка вместо сохранённой (новая эпоха устройства). */
  rotate(firebaseAuthUid: FirebaseAuthUid): Promise<AccountAuthorityInstallationBinding>;
  /** Окончательный отказ привязки (binding_missing/binding_mismatch) — забыть её. */
  reset(firebaseAuthUid: FirebaseAuthUid): Promise<void>;
  resetForLease(owner: AccountAuthorityLeaseOwnerRef): Promise<void>;
}

export type AccountAuthorityInstallationBindingCredentials = Readonly<{
  bindingToken: string;
  deviceBindingId: string;
}>;

export interface AccountAuthorityInstallationBindingCredentialStore {
  read(firebaseAuthUid: FirebaseAuthUid): Promise<AccountAuthorityInstallationBindingCredentials | null>;
  readForLease(owner: AccountAuthorityLeaseOwnerRef): Promise<AccountAuthorityInstallationBindingCredentials | null>;
  write(firebaseAuthUid: FirebaseAuthUid, credentials: AccountAuthorityInstallationBindingCredentials): Promise<void>;
  clear(firebaseAuthUid: FirebaseAuthUid): Promise<void>;
  clearForLease(owner: AccountAuthorityLeaseOwnerRef): Promise<void>;
  /**
   * зачем (AA S2c, L-S2b-2): ключ промисов привязки в памяти — хеш uid (тот же,
   * что в SecureStore), а не сырой uid. По нему resetForLease сбрасывает ТОЛЬКО
   * запись владельца аренды, не трогая привязки других uid этого устройства.
   */
  uidKey?(firebaseAuthUid: FirebaseAuthUid): Promise<string>;
  /** Хеш uid владельца аренды по её записи; null — записи нет. */
  leaseOwnerKey?(owner: AccountAuthorityLeaseOwnerRef): Promise<string | null>;
}

type LeaseResponse = Readonly<{
  accountId: ReturnType<typeof parseAccountId>;
  sessionId: ReturnType<typeof parseSessionId>;
  revision: number;
  previousLeaseRevoked: boolean;
  /** S2c (L-S2b-3): «renewed» после проверки = сервер ещё держал нашу аренду. */
  type: 'acquired' | 'renewed';
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// зачем (AA S1, «немой catch запрещён»): разбор ответа сервера переупаковывает
// любую поломку в свой код, но вид исходной ошибки и место разбора пишутся в лог.
function parseOrThrow<T>(
  log: AccountAuthorityLogger,
  event: string,
  failureCode: string,
  parse: () => T,
): T {
  try {
    return parse();
  } catch (error) {
    log.warn(event, {
      kind: accountAuthorityErrorKind(error),
      code: accountAuthorityErrorCode(error),
      mappedTo: failureCode,
    });
    throw new Error(failureCode);
  }
}

function unwrapCallableData(value: unknown): unknown {
  if (!isRecord(value) || !Object.prototype.hasOwnProperty.call(value, 'data')) {
    throw new Error('account_authority_lease_invalid');
  }
  return value.data;
}

function parseLeaseResponse(
  log: AccountAuthorityLogger,
  value: unknown,
  expectedRevision: number | null,
): LeaseResponse {
  const data = unwrapCallableData(value);
  if (!isRecord(data)) throw new Error('account_authority_lease_invalid');
  const keys = Object.keys(data).sort();
  const expectedKeys = [
    'accountId',
    'idempotent',
    'previousLeaseRevoked',
    'revision',
    'schemaVersion',
    'sessionId',
    'type',
  ].sort();
  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) {
    throw new Error('account_authority_lease_invalid');
  }
  if (
    data.schemaVersion !== 'account-authority-lease.v1'
    || (data.type !== 'acquired' && data.type !== 'renewed')
    || typeof data.idempotent !== 'boolean'
    || typeof data.previousLeaseRevoked !== 'boolean'
    || !Number.isSafeInteger(data.revision)
  ) {
    throw new Error('account_authority_lease_invalid');
  }
  if (expectedRevision === null) {
    if ((data.revision as number) < 1) throw new Error('account_authority_lease_invalid');
  } else {
    const requiredRevision = data.type === 'acquired'
      ? expectedRevision + 1
      : expectedRevision;
    if (!Number.isSafeInteger(requiredRevision) || data.revision !== requiredRevision) {
      throw new Error('account_authority_lease_invalid');
    }
  }
  const previousLeaseRevoked = data.previousLeaseRevoked;
  const type: 'acquired' | 'renewed' = data.type;
  return parseOrThrow(log, 'lease parse_ids_invalid', 'account_authority_lease_invalid', () => Object.freeze({
    accountId: parseAccountId(data.accountId),
    sessionId: parseSessionId(data.sessionId),
    revision: data.revision as number,
    previousLeaseRevoked,
    type,
  }));
}

function parseReleaseResponse(value: unknown, expectedRevision: number): number {
  const data = unwrapCallableData(value);
  if (!isRecord(data)) throw new Error('account_authority_lease_invalid');
  const keys = Object.keys(data).sort();
  const expectedKeys = ['idempotent', 'revision', 'schemaVersion', 'type'].sort();
  if (
    keys.length !== expectedKeys.length
    || keys.some((key, index) => key !== expectedKeys[index])
    || data.schemaVersion !== 'account-authority-lease-release.v1'
    || data.type !== 'released'
    || typeof data.idempotent !== 'boolean'
    || !Number.isSafeInteger(data.revision)
    || data.revision !== expectedRevision + 1
  ) throw new Error('account_authority_lease_invalid');
  return data.revision as number;
}

const DELETE_STATUSES: ReadonlySet<string> = new Set([
  'identity_release_pending', 'identity_release_failed', 'purge_queued', 'purge_failed', 'purged', 'expired',
]);

/**
 * S4a: ответ начала удаления — закрытая форма (как у входа/выхода). Наружу
 * идёт только статус задачи: jobId и время клиенту не нужны и в лог не идут.
 */
function parseDeleteBeginResponse(value: unknown): string {
  const data = unwrapCallableData(value);
  if (!isRecord(data)) throw new Error('account_authority_lease_invalid');
  const keys = Object.keys(data).sort();
  const expectedKeys = ['createdAtMs', 'jobId', 'schemaVersion', 'status', 'updatedAtMs'].sort();
  if (
    keys.length !== expectedKeys.length
    || keys.some((key, index) => key !== expectedKeys[index])
    || data.schemaVersion !== 'account-authority-delete.v1'
    || typeof data.jobId !== 'string'
    || data.jobId.length < 1
    || typeof data.status !== 'string'
    || !DELETE_STATUSES.has(data.status)
    || !Number.isSafeInteger(data.createdAtMs)
    || !Number.isSafeInteger(data.updatedAtMs)
  ) throw new Error('account_authority_lease_invalid');
  return data.status;
}

function parseInstallationBindingCredentials(
  log: AccountAuthorityLogger,
  value: unknown,
): AccountAuthorityInstallationBinding {
  if (!isRecord(value)) throw new Error('account_authority_installation_binding_invalid');
  const keys = Object.keys(value).sort();
  if (
    keys.length !== 2
    || keys[0] !== 'bindingToken'
    || keys[1] !== 'deviceBindingId'
    || typeof value.bindingToken !== 'string'
    || value.bindingToken.length < 1
    || value.bindingToken.length > 512
    || value.bindingToken.trim() !== value.bindingToken
  ) {
    throw new Error('account_authority_installation_binding_invalid');
  }
  const bindingToken = value.bindingToken;
  return parseOrThrow(
    log,
    'installation_binding parse_device_id_invalid',
    'account_authority_installation_binding_invalid',
    () => Object.freeze({ bindingToken, deviceBindingId: parseDeviceId(value.deviceBindingId) }),
  );
}

function parseInstallationBindingResponse(
  log: AccountAuthorityLogger,
  value: unknown,
): AccountAuthorityInstallationBinding {
  return parseInstallationBindingCredentials(log, unwrapCallableData(value));
}

/** Публичный код ошибки транспорта для окончательного отказа сервера. */
function finalFailureCode(reason: AccountAuthorityFinalReason): string {
  switch (reason) {
    case 'binding_missing':
    case 'binding_mismatch':
      return 'account_authority_lease_binding_rejected';
    case 'deletion_pending': return 'account_authority_lease_deletion_pending';
    case 'identity_unresolved': return 'account_authority_lease_identity_unresolved';
    case 'provider_rejected':
    case 'anonymous_rejected':
      return 'account_authority_lease_provider_rejected';
    case 'disabled': return 'account_authority_lease_disabled';
    case 'request_invalid': return 'account_authority_lease_request_invalid';
    default: return 'account_authority_lease_unavailable';
  }
}

function mapFailure(error: unknown, failure: AccountAuthorityFailureClass): Error {
  if (error instanceof Error && error.message === 'account_authority_lease_invalid') return error;
  switch (failure.kind) {
    case 'unauthenticated': return new Error('account_authority_lease_unauthenticated');
    case 'final': return new Error(finalFailureCode(failure.reason));
    case 'contract_rejected': return new Error('account_authority_lease_rejected');
    default: return new Error('account_authority_lease_unavailable');
  }
}

function failureReason(failure: AccountAuthorityFailureClass): string {
  if (failure.kind === 'final' || failure.kind === 'retryable') return failure.reason;
  if (failure.kind === 'contract_rejected') return failure.leaseCode ?? 'lease_code_missing';
  return failure.kind;
}

export type AccountAuthorityTransportRetryOptions = Readonly<{
  /** Попыток на один вызов (1 — без автоповтора). */
  maxAttempts?: number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  nowMs?: () => number;
}>;

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => {
  const timer = setTimeout(resolve, ms);
  (timer as { unref?: () => void }).unref?.();
});

export function createAccountAuthorityFirebaseLeasePort(input: Readonly<{
  invoke: AccountAuthorityCallableInvoker;
  revisionStore: AccountAuthorityLeaseRevisionStore;
  installationBinding: AccountAuthorityInstallationBindingPort;
  logger?: AccountAuthorityLogger;
  retry?: AccountAuthorityTransportRetryOptions;
}>): AccountAuthorityLeasePort {
  const log = safeAccountAuthorityLogger(input.logger);
  const maxAttempts = Math.max(1, Math.floor(input.retry?.maxAttempts ?? ACCOUNT_AUTHORITY_RETRY_MAX_ATTEMPTS));
  const sleep = input.retry?.sleep ?? defaultSleep;
  const random = input.retry?.random ?? Math.random;
  const nowMs = input.retry?.nowMs ?? Date.now;
  // зачем (S2b-R2): время первой попытки начального входа (без ревизии) по
  // operationId — чтобы не повторять его дольше жизни квитанции (60 мин).
  const initialAcquireFirstAttemptAt = new Map<string, number>();
  // зачем (S2b-R4): выходы, чей ответ уже терялся. Отказ контракта на повторе
  // такого выхода значит «первая попытка дошла», а не ошибку.
  const releaseResponseLost = new Set<string>();
  // зачем (AA S2c, L-S2b-3): аренды, чей выход засчитан «выполненным» на повторе
  // (S2b-R4) БЕЗ подтверждения сервера. Если первая попытка на самом деле не
  // дошла, сервер держит старую ревизию, а клиент уже сдвинул свою на +1 — и
  // следующий вход того же uid упал бы в revision_mismatch навсегда. Поэтому при
  // следующем входе этого uid — одна проверка: на revision_mismatch вход
  // повторяется с ревизией сервера (expectedRevision=null), и сервер сам
  // продлевает или отзывает оставшуюся аренду. Живёт в памяти процесса (как R2/R4).
  const presumedReleases = new Map<string, AccountAuthorityLeaseOwnerRef>();
  const leaseMapKey = (owner: AccountAuthorityLeaseOwnerRef): string => (
    `${owner.accountId.value}\u0000${owner.sessionId.value}`
  );
  const findPresumedRelease = async (firebaseAuthUid: FirebaseAuthUid): Promise<string | null> => {
    if (presumedReleases.size === 0) return null;
    const leaseOwnedBy = input.revisionStore.leaseOwnedBy;
    if (leaseOwnedBy === undefined) {
      log.warn('lease acquire_presumed_release_unverifiable', {
        reason: 'owner_match_unavailable',
        count: presumedReleases.size,
      });
      return null;
    }
    for (const [key, owner] of presumedReleases) {
      try {
        if (await leaseOwnedBy(owner, firebaseAuthUid)) {
          log.info('lease acquire_presumed_release_pending', { count: presumedReleases.size });
          return key;
        }
      } catch (error) {
        log.warn('lease acquire_presumed_release_owner_check_failed', {
          kind: accountAuthorityErrorKind(error),
          code: accountAuthorityErrorCode(error),
        });
      }
    }
    log.info('lease acquire_presumed_release_other_owner', { count: presumedReleases.size });
    return null;
  };

  const backoff = async (
    event: string,
    attempt: number,
    reason: 'unavailable' | 'network' | 'throttled',
  ): Promise<void> => {
    const delayMs = accountAuthorityRetryDelayMs(attempt, reason, random);
    log.info(event, { attempt, reason, delayMs });
    await sleep(delayMs);
  };

  // зачем (AA S1): каждый вызов аренды пишет вход, ветку, ушедший запрос, код
  // ответа и длительность. Ни uid, ни id аренды, ни токена привязки — только
  // факт наличия ревизии и коды.
  const acquire: AccountAuthorityLeasePort['acquire'] = async (request) => {
    const startedAt = Date.now();
    // зачем (S2b-R2): ревизия читается ОДИН раз — все повторы этого вызова
    // идут с тем же expectedRevision и тем же operationId.
    const expectedRevision = await input.revisionStore.read(request.firebaseAuthUid);
    log.info('lease acquire_start', { expectedRevision: expectedRevision === null ? 'none' : 'stored' });
    if (
      expectedRevision !== null
      && (
        !Number.isSafeInteger(expectedRevision)
        || expectedRevision < 0
        || expectedRevision >= Number.MAX_SAFE_INTEGER
      )
    ) {
      log.warn('lease acquire_revision_invalid', { code: 'account_authority_lease_revision_unavailable' });
      throw new Error('account_authority_lease_revision_unavailable');
    }
    const operationKey = request.operationId.value;
    if (expectedRevision === null) {
      const firstAttemptAtMs = initialAcquireFirstAttemptAt.get(operationKey) ?? nowMs();
      initialAcquireFirstAttemptAt.set(operationKey, firstAttemptAtMs);
      const plan = planAccountAuthorityAcquireReplay({ expectedRevision, firstAttemptAtMs, nowMs: nowMs() });
      if (plan === 'requires_user_action') {
        initialAcquireFirstAttemptAt.delete(operationKey);
        log.warn('lease acquire_replay_expired', { reason: 'initial_window_elapsed' });
        throw new Error('account_authority_lease_replay_expired');
      }
    }
    // S2c (L-S2b-3): своя оставшаяся аренда после «выход выполнен» на повторе.
    const presumedKey = await findPresumedRelease(request.firebaseAuthUid);
    let requestRevision = expectedRevision;
    let presumedChecked = false;
    let rotated = false;
    let takeoverTried = false;
    for (let attempt = 1; ; attempt += 1) {
      try {
        const binding = await input.installationBinding.obtain(request.firebaseAuthUid);
        log.info('lease acquire_call', { callable: ACCOUNT_AUTHORITY_LEASE_ACQUIRE_CALLABLE, attempt });
        const response = await input.invoke(ACCOUNT_AUTHORITY_LEASE_ACQUIRE_CALLABLE, Object.freeze({
          operationId: request.operationId.value,
          expectedRevision: requestRevision,
          bindingToken: binding.bindingToken,
        }));
        const parsed = parseLeaseResponse(log, response, requestRevision);
        const owner = Object.freeze({ accountId: parsed.accountId, sessionId: parsed.sessionId });
        await input.revisionStore.bindLease(request.firebaseAuthUid, owner, parsed.revision);
        initialAcquireFirstAttemptAt.delete(operationKey);
        if (presumedKey !== null) {
          presumedReleases.delete(presumedKey);
          let outcome = 'release_confirmed';
          if (presumedChecked) {
            if (parsed.type === 'renewed') outcome = 'leftover_lease_reclaimed';
            else if (parsed.previousLeaseRevoked) outcome = 'leftover_lease_revoked';
            else outcome = 'server_revision_adopted';
          }
          log.info('lease acquire_presumed_release_resolved', { result: outcome, attempt });
        }
        log.info('lease acquire_ok', {
          previousLeaseRevoked: parsed.previousLeaseRevoked,
          attempt,
          durationMs: accountAuthorityElapsedMs(startedAt),
        });
        return Object.freeze({ ...owner, previousLeaseRevoked: parsed.previousLeaseRevoked });
      } catch (error) {
        const failure = classifyAccountAuthorityFailure(error);
        log.warn('lease acquire_failed', {
          kind: accountAuthorityErrorKind(error),
          code: accountAuthorityErrorCode(error),
          branch: failure.kind,
          reason: failureReason(failure),
          attempt,
          durationMs: accountAuthorityElapsedMs(startedAt),
        });
        if (failure.kind === 'retryable' && attempt < maxAttempts) {
          await backoff('lease acquire_retry_scheduled', attempt, failure.reason);
          continue;
        }
        // зачем (S2c, L-S2b-3): ревизия этого uid сдвинута допущением R4. Если
        // сервер её не признал — ОДНА проверка с ревизией сервера; второй отказ
        // окончательный (без цикла). Старый сервер без кода — та же трактовка.
        const revisionSuspect = failure.kind === 'contract_rejected'
          && (failure.leaseCode === null || failure.leaseCode === 'revision_mismatch');
        if (presumedKey !== null && !presumedChecked && revisionSuspect) {
          presumedChecked = true;
          requestRevision = null;
          log.warn('lease acquire_presumed_release_check', {
            reason: failureReason(failure),
            attempt,
          });
          continue;
        }
        // зачем (S2b-R3, раунд 2): аренду перехватило другое устройство — эпоха
        // этой привязки устарела. Ротация ТОЛЬКО при leaseCode=stale_auth_epoch:
        // ОДНА на попытку и ОДИН повтор; второй отказ окончательный, без цикла.
        // Старый сервер без кода — прежняя грубая трактовка (любой отказ
        // контракта) с логом lease_code_missing. Прочие коды — окончательно.
        if (failure.kind === 'contract_rejected' && failure.leaseCode === null) {
          log.warn('lease acquire_lease_code_missing', { reason: 'lease_code_missing', attempt });
        }
        const rotateForEpoch = failure.kind === 'contract_rejected'
          && (failure.leaseCode === null || ACCOUNT_AUTHORITY_ROTATE_LEASE_CODES.has(failure.leaseCode));
        if (rotateForEpoch && !rotated) {
          rotated = true;
          try {
            await input.installationBinding.rotate(request.firebaseAuthUid);
          } catch (rotateError) {
            log.warn('lease acquire_rotate_failed', {
              kind: accountAuthorityErrorKind(rotateError),
              code: accountAuthorityErrorCode(rotateError),
            });
            throw new Error('account_authority_lease_rejected');
          }
          log.info('lease acquire_rotated_retry', { reason: 'contract_rejected', attempt });
          continue;
        }
        if (failure.kind === 'final' && failure.resetBinding) {
          // зачем (пункт 8): привязку этого uid сервер не признаёт — забыть её;
          // следующий вход по действию человека создаст новую. Сами не
          // повторяем (S2b-R5).
          try {
            await input.installationBinding.reset(request.firebaseAuthUid);
            log.info('lease acquire_binding_reset', { reason: failure.reason });
          } catch (resetError) {
            log.warn('lease acquire_binding_reset_failed', {
              kind: accountAuthorityErrorKind(resetError),
              code: accountAuthorityErrorCode(resetError),
            });
          }
        }
        // зачем (AA S4b): продление уже известной аренды (ревизия есть, проверка
        // «допущенного выхода» не идёт) отклонено кодом из закрытого списка —
        // аренду забрало другое устройство. Это не «ошибка входа», а вытеснение:
        // отдельный код, чтобы runtime сохранил записи и не выходил из провайдера.
        if (
          failure.kind === 'contract_rejected'
          && requestRevision !== null
          && presumedKey === null
          && failure.leaseCode !== null
          && ACCOUNT_AUTHORITY_EVICTION_LEASE_CODES.has(failure.leaseCode)
        ) {
          // Явный вход человека — его выбор «войти здесь»: ОДИН повтор с ревизией
          // сервера (сервер сам заберёт аренду у другого устройства). Продление —
          // никогда: иначе устройства отбирали бы аренду друг у друга по кругу.
          if (request.intent === 'sign_in' && !takeoverTried) {
            takeoverTried = true;
            requestRevision = null;
            log.warn('[AA-S4] lease acquire_takeover_retry', { reason: failure.leaseCode, attempt });
            continue;
          }
          log.warn('[AA-S4] lease acquire_evicted', { reason: failure.leaseCode, attempt });
          throw new Error(ACCOUNT_AUTHORITY_LEASE_EVICTED_CODE);
        }
        if (presumedKey !== null && presumedChecked) {
          // Проверка выполнена и не помогла — отметку снимаем, чтобы не крутить её
          // на каждом входе; дальше решает обычная политика отказов.
          presumedReleases.delete(presumedKey);
          log.warn('lease acquire_presumed_release_unresolved', { reason: failureReason(failure), attempt });
        }
        const mapped = mapFailure(error, failure);
        log.warn('lease acquire_gave_up', {
          branch: failure.kind,
          reason: failureReason(failure),
          mappedTo: accountAuthorityErrorCode(mapped),
          attempt,
        });
        throw mapped;
      }
    }
  };

  const release: AccountAuthorityLeasePort['release'] = async (request) => {
    const startedAt = Date.now();
    const owner = Object.freeze({ accountId: request.accountId, sessionId: request.sessionId });
    const expectedRevision = await input.revisionStore.readLease(owner);
    log.info('lease release_start', { expectedRevision: expectedRevision === null ? 'none' : 'stored' });
    if (
      expectedRevision === null
      || !Number.isSafeInteger(expectedRevision)
      || expectedRevision < 0
      || expectedRevision >= Number.MAX_SAFE_INTEGER
    ) {
      log.warn('lease release_revision_unavailable', {
        reason: expectedRevision === null ? 'missing' : 'invalid',
      });
      throw new Error('account_authority_lease_revision_unavailable');
    }
    const operationKey = request.operationId.value;
    for (let attempt = 1; ; attempt += 1) {
      try {
        const binding = await input.installationBinding.readPersistedForLease(owner);
        if (binding === null) throw new Error('account_authority_installation_binding_unavailable');
        log.info('lease release_call', { callable: ACCOUNT_AUTHORITY_LEASE_RELEASE_CALLABLE, attempt });
        const response = await input.invoke(ACCOUNT_AUTHORITY_LEASE_RELEASE_CALLABLE, Object.freeze({
          operationId: request.operationId.value,
          expectedRevision,
          sessionId: request.sessionId.value,
          bindingToken: binding.bindingToken,
        }));
        const revision = parseReleaseResponse(response, expectedRevision);
        await input.revisionStore.writeLease(owner, revision);
        releaseResponseLost.delete(operationKey);
        log.info('lease release_ok', { attempt, durationMs: accountAuthorityElapsedMs(startedAt) });
        return;
      } catch (error) {
        const failure = classifyAccountAuthorityFailure(error);
        log.warn('lease release_failed', {
          kind: accountAuthorityErrorKind(error),
          code: accountAuthorityErrorCode(error),
          branch: failure.kind,
          reason: failureReason(failure),
          attempt,
          durationMs: accountAuthorityElapsedMs(startedAt),
        });
        if (failure.kind === 'retryable') {
          releaseResponseLost.add(operationKey);
          if (attempt < maxAttempts) {
            await backoff('lease release_retry_scheduled', attempt, failure.reason);
            continue;
          }
        }
        // зачем (S2b-R4): ответ на этот выход уже терялся, а повтор получил отказ
        // контракта (revision_mismatch/stale_lease: первая попытка дошла, её
        // квитанция вытеснена или истекла). Выход выполнен — ошибку не
        // показываем, ревизию сдвигаем так, как сдвинула бы первая попытка.
        if (failure.kind === 'contract_rejected' && failure.leaseCode === null) {
          log.warn('lease release_lease_code_missing', { reason: 'lease_code_missing', attempt });
        }
        // Раунд 2: «выполнено» только при revision_mismatch/stale_lease на повторе
        // (или без кода от старого сервера — прежняя трактовка); прочее окончательно.
        const releaseDone = failure.kind === 'contract_rejected'
          && (failure.leaseCode === null || ACCOUNT_AUTHORITY_RELEASE_DONE_LEASE_CODES.has(failure.leaseCode));
        if (releaseDone && releaseResponseLost.has(operationKey)) {
          releaseResponseLost.delete(operationKey);
          await input.revisionStore.writeLease(owner, expectedRevision + 1);
          // S2c (L-S2b-3): допущение без подтверждения — следующий вход этого
          // uid проверит оставшуюся аренду (см. presumedReleases).
          presumedReleases.set(leaseMapKey(owner), owner);
          log.info('lease release_presumed_done', { reason: 'replay_rejected_after_lost_response', attempt });
          return;
        }
        if (failure.kind === 'final' && failure.resetBinding) {
          try {
            await input.installationBinding.resetForLease(owner);
            log.info('lease release_binding_reset', { reason: failure.reason });
          } catch (resetError) {
            log.warn('lease release_binding_reset_failed', {
              kind: accountAuthorityErrorKind(resetError),
              code: accountAuthorityErrorCode(resetError),
            });
          }
        }
        const mapped = mapFailure(error, failure);
        log.warn('lease release_gave_up', {
          branch: failure.kind,
          reason: failureReason(failure),
          mappedTo: accountAuthorityErrorCode(mapped),
          attempt,
        });
        throw mapped;
      }
    }
  };
  /*
   * S4a: начало удаления на сервере. Сервер в одной транзакции снимает аренду,
   * ставит надгробие и задачу удаления, затем удаляет учётку Auth. Повтор с
   * тем же или новым operationId идемпотентен: сервер отдаёт уже созданную
   * задачу (в том числе после потерянного ответа). Сюда приходит уже ПОСЛЕ
   * локального удаления (local-first): ни один исход не меняет локальное
   * состояние — им распоряжается исходящая очередь адаптера.
   */
  const deleteAccount: AccountAuthorityLeasePort['deleteAccount'] = async (request) => {
    const startedAt = Date.now();
    const owner = Object.freeze({ accountId: request.accountId, sessionId: request.sessionId });
    const expectedRevision = await input.revisionStore.readLease(owner);
    log.info('[AA-S4] lease delete_start', { expectedRevision: expectedRevision === null ? 'none' : 'stored' });
    if (
      expectedRevision === null
      || !Number.isSafeInteger(expectedRevision)
      || expectedRevision < 0
      || expectedRevision >= Number.MAX_SAFE_INTEGER
    ) {
      log.warn('[AA-S4] lease delete_revision_unavailable', { reason: expectedRevision === null ? 'missing' : 'invalid' });
      throw new Error('account_authority_lease_revision_unavailable');
    }
    for (let attempt = 1; ; attempt += 1) {
      try {
        const binding = await input.installationBinding.readPersistedForLease(owner);
        if (binding === null) {
          log.warn('[AA-S4] lease delete_binding_missing', { attempt });
          throw new Error('account_authority_installation_binding_unavailable');
        }
        log.info('[AA-S4] lease delete_call', { attempt });
        const response = await input.invoke(ACCOUNT_AUTHORITY_DELETE_BEGIN_CALLABLE, Object.freeze({
          operationId: request.operationId.value,
          expectedRevision,
          bindingToken: binding.bindingToken,
        }));
        const status = parseDeleteBeginResponse(response);
        try {
          // Сервер снял аренду этой попыткой (или первой) — ревизия +1, как у выхода.
          await input.revisionStore.writeLease(owner, expectedRevision + 1);
        } catch (writeError) {
          log.warn('[AA-S4] lease delete_revision_write_failed', {
            kind: accountAuthorityErrorKind(writeError),
            code: accountAuthorityErrorCode(writeError),
          });
        }
        log.info('[AA-S4] lease delete_ok', { result: status, attempt, durationMs: accountAuthorityElapsedMs(startedAt) });
        return;
      } catch (error) {
        const failure = classifyAccountAuthorityFailure(error);
        log.warn('[AA-S4] lease delete_failed', {
          kind: accountAuthorityErrorKind(error),
          code: accountAuthorityErrorCode(error),
          branch: failure.kind,
          reason: failureReason(failure),
          attempt,
          durationMs: accountAuthorityElapsedMs(startedAt),
        });
        if (failure.kind === 'retryable' && attempt < maxAttempts) {
          await backoff('[AA-S4] lease delete_retry_scheduled', attempt, failure.reason);
          continue;
        }
        const mapped = mapFailure(error, failure);
        log.warn('[AA-S4] lease delete_gave_up', {
          branch: failure.kind,
          reason: failureReason(failure),
          mappedTo: accountAuthorityErrorCode(mapped),
          attempt,
        });
        throw mapped;
      }
    }
  };
  const port: AccountAuthorityLeasePort = {
    acquire,
    release,
    deleteAccount,
  };
  return Object.freeze(port);
}

export function createAccountAuthorityFirebaseInstallationBindingPort(input: Readonly<{
  invoke: AccountAuthorityCallableInvoker;
  installationId: string;
  credentials: AccountAuthorityInstallationBindingCredentialStore;
  logger?: AccountAuthorityLogger;
  /**
   * зачем (AA S2c, L-S2b-1): текущий uid Firebase на устройстве. Привязку,
   * созданную для uid A, нельзя сохранять, если за время вызова вошёл B: сервер
   * выдаёт привязку вызывающему uid, и запись под чужим ключом вернула бы цикл
   * binding_mismatch. Не передан — сверка не выполняется (тестовые фейки).
   */
  currentAuthUid?: () => string | null;
}>): AccountAuthorityInstallationBindingPort {
  const log = safeAccountAuthorityLogger(input.logger);
  // Один промис на uid: повтор операции не ротирует доказательство (AA S0).
  // S2c (L-S2b-2): ключ — хеш uid (credentials.uidKey), а не сырой uid.
  const bindings = new Map<string, Promise<AccountAuthorityInstallationBinding>>();
  const uidMapKey = async (firebaseAuthUid: FirebaseAuthUid): Promise<string> => {
    const uidKey = input.credentials.uidKey;
    if (uidKey === undefined) return `uid:${firebaseAuthUid.value}`;
    return `hash:${await uidKey(firebaseAuthUid)}`;
  };
  const parsePersisted = (
    persisted: AccountAuthorityInstallationBindingCredentials | null,
  ): AccountAuthorityInstallationBinding | null => (
    persisted === null ? null : parseInstallationBindingCredentials(log, persisted)
  );
  // S2c (L-S2b-1): сверка uid до вызова и перед сохранением. Не читается —
  // отказ закрыто (лучше ещё одна привязка, чем чужая под этим ключом).
  const assertCurrentUid = (firebaseAuthUid: FirebaseAuthUid, stage: 'before_call' | 'before_store'): void => {
    const readCurrent = input.currentAuthUid;
    if (readCurrent === undefined) return;
    const event = stage === 'before_call'
      ? 'installation_binding binding_create_skipped'
      : 'installation_binding binding_store_skipped';
    let current: string | null;
    try {
      current = readCurrent();
    } catch (error) {
      log.warn(event, { reason: 'current_uid_unreadable', kind: accountAuthorityErrorKind(error) });
      throw new Error('account_authority_installation_binding_uid_changed');
    }
    if (current === firebaseAuthUid.value) return;
    log.warn(event, { reason: current === null ? 'signed_out' : 'uid_changed' });
    throw new Error('account_authority_installation_binding_uid_changed');
  };
  const createOnServer = async (
    firebaseAuthUid: FirebaseAuthUid,
    startedAt: number,
    source: 'network' | 'rotation',
  ): Promise<AccountAuthorityInstallationBinding> => {
    assertCurrentUid(firebaseAuthUid, 'before_call');
    log.info('installation_binding create_call', { callable: ACCOUNT_AUTHORITY_INSTALLATION_BINDING_CALLABLE, source });
    const response = await input.invoke(
      ACCOUNT_AUTHORITY_INSTALLATION_BINDING_CALLABLE,
      Object.freeze({ installationId: input.installationId }),
    );
    const binding = parseInstallationBindingResponse(log, response);
    assertCurrentUid(firebaseAuthUid, 'before_store');
    await input.credentials.write(firebaseAuthUid, {
      bindingToken: binding.bindingToken,
      deviceBindingId: binding.deviceBindingId.value,
    });
    log.info('installation_binding obtain_ok', { source, durationMs: accountAuthorityElapsedMs(startedAt) });
    return binding;
  };
  const track = (
    mapKey: string,
    startedAt: number,
    event: string,
    work: () => Promise<AccountAuthorityInstallationBinding>,
  ): Promise<AccountAuthorityInstallationBinding> => {
    const guarded: Promise<AccountAuthorityInstallationBinding> = Promise.resolve().then(work).catch((error: unknown) => {
      if (bindings.get(mapKey) === guarded) bindings.delete(mapKey);
      // зачем (AA S0): наружу по-прежнему один код «привязка недоступна»
      // (fail-closed, без утечки токена), но вид исходного сбоя — сеть,
      // отказ callable или битые сохранённые данные — виден в логе.
      log.warn(event, {
        kind: accountAuthorityErrorKind(error),
        code: accountAuthorityErrorCode(error),
        durationMs: accountAuthorityElapsedMs(startedAt),
      });
      throw new Error('account_authority_installation_binding_unavailable');
    });
    bindings.set(mapKey, guarded);
    return guarded;
  };
  const port: AccountAuthorityInstallationBindingPort = {
    readPersistedForLease: async (owner) => {
      const persisted = await input.credentials.readForLease(owner);
      log.info('installation_binding read_for_lease', { result: persisted === null ? 'missing' : 'found' });
      return parsePersisted(persisted);
    },
    obtain: async (firebaseAuthUid) => {
      const startedAt = Date.now();
      const mapKey = await uidMapKey(firebaseAuthUid);
      // Проверка и запись в Map идут синхронно после await — два параллельных
      // obtain одного uid получают один промис (второй видит запись первого).
      const existing = bindings.get(mapKey);
      if (existing !== undefined) {
        log.info('installation_binding obtain_shared_in_flight');
        return existing;
      }
      return track(mapKey, startedAt, 'installation_binding obtain_failed', async () => {
        const persisted = parsePersisted(await input.credentials.read(firebaseAuthUid));
        if (persisted !== null) {
          log.info('installation_binding obtain_ok', { source: 'secure_store' });
          return persisted;
        }
        return createOnServer(firebaseAuthUid, startedAt, 'network');
      });
    },
    rotate: async (firebaseAuthUid) => {
      const startedAt = Date.now();
      log.info('installation_binding rotate_start');
      const mapKey = await uidMapKey(firebaseAuthUid);
      return track(
        mapKey,
        startedAt,
        'installation_binding rotate_failed',
        () => createOnServer(firebaseAuthUid, startedAt, 'rotation'),
      );
    },
    reset: async (firebaseAuthUid) => {
      bindings.delete(await uidMapKey(firebaseAuthUid));
      await input.credentials.clear(firebaseAuthUid);
      log.info('installation_binding reset', { source: 'uid' });
    },
    resetForLease: async (owner) => {
      // зачем (S2c, L-S2b-2): сбрасываем в памяти ТОЛЬКО промис владельца аренды
      // (по хешу uid из её записи). Прежде сбрасывались все — чужой вход на том
      // же устройстве терял свой промис посреди операции.
      const leaseOwnerKey = input.credentials.leaseOwnerKey;
      if (leaseOwnerKey === undefined) {
        bindings.clear();
        log.warn('installation_binding reset_memory', { result: 'all', reason: 'owner_key_unavailable' });
      } else {
        const ownerHash = await leaseOwnerKey(owner);
        if (ownerHash === null) {
          log.info('installation_binding reset_memory', { result: 'none', reason: 'lease_record_missing' });
        } else {
          const removed = bindings.delete(`hash:${ownerHash}`);
          log.info('installation_binding reset_memory', { result: 'owner', removed });
        }
      }
      await input.credentials.clearForLease(owner);
      log.info('installation_binding reset', { source: 'lease' });
    },
  };
  return Object.freeze(port);
}

async function invokeFirebaseCallable(
  name: string,
  data: Readonly<Record<string, unknown>>,
): Promise<unknown> {
  // Keep native Firebase modules out of source tests and legacy startup while
  // the global cutover remains hardcoded off.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  const callable = httpsCallable(
    getFunctions(getApp(), FUNCTIONS_REGION),
    name,
    { timeout: CALLABLE_TIMEOUT_MS },
  ) as (payload: Readonly<Record<string, unknown>>) => Promise<unknown>;
  return callable(data);
}

/** Real Firebase transport; installation into bootstrap remains a separate gate. */
export function createProductionAccountAuthorityFirebaseLeasePort(
  revisionStore: AccountAuthorityLeaseRevisionStore,
  installationBinding: AccountAuthorityInstallationBindingPort,
  logger?: AccountAuthorityLogger,
): AccountAuthorityLeasePort {
  return createAccountAuthorityFirebaseLeasePort({
    invoke: invokeFirebaseCallable,
    revisionStore,
    installationBinding,
    logger,
  });
}

/**
 * зачем (AA S2c, L-S2b-1): текущий uid Firebase для сверки перед сохранением
 * привязки. Модуль грузится лениво (как invokeFirebaseCallable) — в тестах и на
 * старте legacy-пути нативный Firebase не тянется. null — никто не вошёл.
 */
function readFirebaseCurrentAuthUid(): string | null {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const authModule = require('@react-native-firebase/auth');
  const uid = authModule.default().currentUser?.uid;
  return typeof uid === 'string' && uid.length > 0 ? uid : null;
}

export function createProductionAccountAuthorityFirebaseInstallationBindingPort(input: Readonly<{
  installationId: string;
  credentials: AccountAuthorityInstallationBindingCredentialStore;
  logger?: AccountAuthorityLogger;
}>): AccountAuthorityInstallationBindingPort {
  return createAccountAuthorityFirebaseInstallationBindingPort({
    invoke: invokeFirebaseCallable,
    installationId: input.installationId,
    credentials: input.credentials,
    logger: input.logger,
    currentAuthUid: readFirebaseCurrentAuthUid,
  });
}
