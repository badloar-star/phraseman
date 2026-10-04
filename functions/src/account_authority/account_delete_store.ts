import { FieldValue, type Firestore, type Transaction } from 'firebase-admin/firestore';
import {
  accountAuthorityLogError,
  accountAuthorityLogInfo,
  accountAuthorityLogWarn,
  accountAuthorityServerErrorCode,
  accountAuthorityServerErrorKind,
} from './account_authority_log';
import { AA_DELETE_JOBS_COLLECTION } from './account_authority_collections';
import { accountAuthorityUidFingerprint } from './account_authority_policy';
import {
  asAccountId,
  asClaimId,
  asDeviceId,
  asFirebaseAuthUid,
  asOperationId,
  asProviderSubject,
  asSessionId,
  asTenantId,
  type AccountId,
  type TenantId,
} from './lease_contract';
import type {
  AccountDeleteContractState,
  AccountDeleteExpirySchedule,
  AccountDeleteJob,
  AccountDeleteStatus,
  ProviderIdentityReleasePort,
} from './delete_contract';
import type { AccountDeleteStateStorePort } from './firebase_lease_callable';

/*
 * Account Authority 2.0, этап S3, пункт 1: Firestore-хранилище состояния
 * удаления для шва `AccountDeleteStateStorePort` (S2a раунд 3).
 *
 * зачем: контракт удаления (delete_contract.ts) уже описывает job, claim,
 * курсор purge и срок квитанции; здесь только перевод в документ и обратно.
 * Чтение и запись идут ВНУТРИ транзакции адаптера (firebase_lease_callable),
 * поэтому подготовка удаления остаётся одной транзакцией.
 *
 * Расписание истечения (`expirySchedules`) хранится в том же документе полем
 * `expirySweepAtMs` — атомарно с терминальным состоянием, как требует
 * контракт. Плановый воркер (S4/S8) выбирает просроченные запросом
 * `listDueAccountDeleteExpirySweeps` и вызывает `sweepExpiredAccountDeleteJob`.
 */

const DELETE_STATE_SCHEMA = 'account-authority-delete-state.v1';
const STATUSES: ReadonlySet<AccountDeleteStatus> = new Set([
  'identity_release_pending', 'identity_release_failed', 'purge_queued', 'purge_failed', 'purged', 'expired',
]);

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalid(): Error {
  return new Error('account_authority_delete_state_invalid');
}

function count(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw invalid();
  return value as number;
}

function nullableCount(value: unknown): number | null {
  return value === null ? null : count(value);
}

function nullableString(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || value.length === 0) throw invalid();
  return value;
}

function parseClaim(value: unknown): AccountDeleteJob['purgeClaim'] {
  if (value === null) return null;
  if (!isRecord(value) || typeof value.idempotencyKey !== 'string') throw invalid();
  return Object.freeze({
    claimId: asClaimId(value.claimId),
    leaseExpiresAtMs: count(value.leaseExpiresAtMs),
    idempotencyKey: value.idempotencyKey,
  });
}

function parsePendingIdentity(value: unknown): AccountDeleteJob['pendingProviderIdentity'] {
  if (value === null) return null;
  if (!isRecord(value)) throw invalid();
  return Object.freeze({
    tenantId: asTenantId(value.tenantId),
    firebaseAuthUid: asFirebaseAuthUid(value.firebaseAuthUid),
    providerSubject: asProviderSubject(value.providerSubject),
  });
}

function parseJob(value: unknown, accountId: AccountId, tenantId: TenantId): AccountDeleteJob | null {
  if (value === null) return null;
  if (!isRecord(value) || typeof value.jobId !== 'string' || value.jobId.length === 0) throw invalid();
  if (!STATUSES.has(value.status as AccountDeleteStatus)) throw invalid();
  if (!Array.isArray(value.recentPurgeCursors) || !value.recentPurgeCursors.every((item) => typeof item === 'string')) {
    throw invalid();
  }
  if (asAccountId(value.accountId) !== accountId || asTenantId(value.tenantId) !== tenantId) throw invalid();
  return Object.freeze({
    jobId: value.jobId,
    accountId,
    tenantId,
    firstOperationId: value.firstOperationId === null ? null : asOperationId(value.firstOperationId),
    deviceId: value.deviceId === null ? null : asDeviceId(value.deviceId),
    sessionId: value.sessionId === null ? null : asSessionId(value.sessionId),
    status: value.status as AccountDeleteStatus,
    createdAtMs: count(value.createdAtMs),
    updatedAtMs: count(value.updatedAtMs),
    pendingProviderIdentity: parsePendingIdentity(value.pendingProviderIdentity),
    identityReleaseAttemptsStarted: count(value.identityReleaseAttemptsStarted),
    identityReleaseAttemptsCompleted: count(value.identityReleaseAttemptsCompleted),
    identityReleaseFailuresCompleted: count(value.identityReleaseFailuresCompleted),
    identityReleaseClaim: parseClaim(value.identityReleaseClaim),
    identityReleasedAtMs: nullableCount(value.identityReleasedAtMs),
    purgeCursor: nullableString(value.purgeCursor),
    recentPurgeCursors: Object.freeze([...(value.recentPurgeCursors as string[])]),
    purgeAttempts: count(value.purgeAttempts),
    purgeFailures: count(value.purgeFailures),
    purgeClaim: parseClaim(value.purgeClaim),
    purgedItems: count(value.purgedItems),
    completedAtMs: nullableCount(value.completedAtMs),
    receiptExpiresAtMs: nullableCount(value.receiptExpiresAtMs),
  });
}

/** Разбор документа состояния удаления; чужой аккаунт/тенант или порча — ошибка. */
export function parseAccountDeleteState(
  value: unknown,
  identity: Readonly<{ accountId: AccountId; tenantId: TenantId }>,
): AccountDeleteContractState {
  if (!isRecord(value) || value.schemaVersion !== DELETE_STATE_SCHEMA) throw invalid();
  if (asAccountId(value.accountId) !== identity.accountId || asTenantId(value.tenantId) !== identity.tenantId) {
    throw invalid();
  }
  return Object.freeze({
    accountId: identity.accountId,
    tenantId: identity.tenantId,
    job: parseJob(value.job, identity.accountId, identity.tenantId),
    lastServerNowMs: count(value.lastServerNowMs),
  });
}

/**
 * Срок, когда воркер должен вызвать sweep. Берётся из расписаний перехода;
 * переход без расписания сохраняет срок job (квитанция ещё ждёт истечения),
 * а `expired`/нет job — срока нет.
 */
function expirySweepAtMs(
  state: AccountDeleteContractState,
  schedules: readonly AccountDeleteExpirySchedule[],
): number | null {
  const job = state.job;
  if (job === null || job.status === 'expired') return null;
  const scheduled = schedules.filter((item) => item.jobId === job.jobId).map((item) => item.expiresAtMs);
  if (scheduled.length > 0) return Math.max(...scheduled);
  return job.receiptExpiresAtMs;
}

/**
 * S4a: когда задаче нужен фоновый шаг (повтор освобождения Auth или проход
 * purge). зачем: незавершённая задача (`identity_release_pending`,
 * `purge_queued`) не имеет срока квитанции, и без отдельного поля фоновый
 * обработчик нашёл бы её только выкачиванием коллекции. Одно числовое поле —
 * один запрос `where <= now` + `limit` на автоматическом индексе.
 * Занятая задача (живой claim) становится «должной» по истечении claim.
 */
export function accountDeletePendingWorkAtMs(state: AccountDeleteContractState): number | null {
  const job = state.job;
  if (job === null) return null;
  if (job.status === 'identity_release_pending') {
    if (job.identityReleaseClaim !== null) return job.identityReleaseClaim.leaseExpiresAtMs;
    // S4a раунд 2 (LOW-1): после сбоя освобождения Auth — нарастающая пауза.
    return job.updatedAtMs + accountDeleteIdentityRetryDelayMs(job.identityReleaseFailuresCompleted);
  }
  if (job.status === 'purge_queued') return job.purgeClaim?.leaseExpiresAtMs ?? job.updatedAtMs;
  return null;
}

/** S4a раунд 2 (LOW-1): база и потолок паузы между повторами освобождения Auth. */
export const ACCOUNT_DELETE_IDENTITY_RETRY_BASE_MS = 60_000;
export const ACCOUNT_DELETE_IDENTITY_RETRY_MAX_MS = 30 * 60_000;

/**
 * зачем (S4a раунд 2, LOW-1): без паузы задача после сбоя Auth сразу снова
 * «должна» — фоновый проход дёргал бы провайдера подряд и сжёг бы 4 попытки
 * контракта за секунды. Первая попытка (сбоев 0) — сразу; дальше 1, 2, 4 мин…
 * не больше 30 мин. Число попыток контракта (4) не меняется.
 */
export function accountDeleteIdentityRetryDelayMs(failuresCompleted: number): number {
  if (!Number.isSafeInteger(failuresCompleted) || failuresCompleted < 1) return 0;
  const exponent = Math.min(failuresCompleted - 1, 20);
  return Math.min(ACCOUNT_DELETE_IDENTITY_RETRY_BASE_MS * 2 ** exponent, ACCOUNT_DELETE_IDENTITY_RETRY_MAX_MS);
}

/** Полный закрытый список ключей job в документе (раунд 3, L-3). */
export const ACCOUNT_DELETE_JOB_KEYS: readonly (keyof AccountDeleteJob)[] = Object.freeze([
  'jobId', 'accountId', 'tenantId', 'firstOperationId', 'deviceId', 'sessionId', 'status',
  'createdAtMs', 'updatedAtMs', 'pendingProviderIdentity', 'identityReleaseAttemptsStarted',
  'identityReleaseAttemptsCompleted', 'identityReleaseFailuresCompleted', 'identityReleaseClaim',
  'identityReleasedAtMs', 'purgeCursor', 'recentPurgeCursors', 'purgeAttempts', 'purgeFailures',
  'purgeClaim', 'purgedItems', 'completedAtMs', 'receiptExpiresAtMs',
]);

function assertClosedJobShape(job: AccountDeleteJob): void {
  const keys = Object.keys(job).sort();
  const expected = [...ACCOUNT_DELETE_JOB_KEYS].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    accountAuthorityLogWarn('delete_state write refused', { stage: 'delete_state', reason: 'job_shape_open' });
    throw invalid();
  }
}

export function storedAccountDeleteState(
  state: AccountDeleteContractState,
  schedules: readonly AccountDeleteExpirySchedule[],
): UnknownRecord {
  const job = state.job;
  if (job !== null) assertClosedJobShape(job);
  return {
    schemaVersion: DELETE_STATE_SCHEMA,
    accountId: state.accountId,
    tenantId: state.tenantId,
    lastServerNowMs: state.lastServerNowMs,
    job: job === null ? null : {
      ...job,
      pendingProviderIdentity: job.pendingProviderIdentity === null ? null : { ...job.pendingProviderIdentity },
      identityReleaseClaim: job.identityReleaseClaim === null ? null : { ...job.identityReleaseClaim },
      purgeClaim: job.purgeClaim === null ? null : { ...job.purgeClaim },
      recentPurgeCursors: [...job.recentPurgeCursors],
    },
    expirySweepAtMs: expirySweepAtMs(state, schedules),
    // S4a: срок фонового шага (null — шагов нет); см. accountDeletePendingWorkAtMs.
    pendingWorkAtMs: accountDeletePendingWorkAtMs(state),
  };
}

/**
 * S3 раунд 2: поле с СЫРЫМ uid в задаче удаления. Живёт только пока личность
 * у провайдера не освобождена (job.pendingProviderIdentity !== null); любая
 * запись после освобождения стирает его FieldValue.delete() (образец —
 * account_delete_job.ts, authUid). Коллекция — deny-all для клиентов.
 */
export const ACCOUNT_DELETE_PENDING_AUTH_UID_FIELD = 'pendingAuthUid';

/**
 * Сырой uid хранится, только если он — именно тот, чей субъект ждёт
 * освобождения. зачем (раунд 3, L-1): у аккаунта может быть несколько uid;
 * повторный delete_begin от ДРУГОГО uid (U) предлагает свой uid, но удаление
 * начал V — U не подходит по хешу, и uid V из документа не перетирается.
 */
function pendingAuthUidFor(state: AccountDeleteContractState, candidates: readonly string[]): string | null {
  const pending = state.job?.pendingProviderIdentity ?? null;
  if (pending === null) return null;
  return candidates.find((rawUid) => accountAuthorityUidFingerprint(rawUid) === pending.firebaseAuthUid) ?? null;
}

export function createFirestoreAccountDeleteStateStore(db: Firestore): AccountDeleteStateStorePort {
  const ref = (accountId: AccountId) => db.collection(AA_DELETE_JOBS_COLLECTION).doc(accountId);
  // зачем: сырой uid переносится от чтения/подготовки к записи ВНУТРИ одной
  // транзакции; повтор транзакции Firestore получает новый объект — новая карта.
  const pendingUids = new WeakMap<Transaction, Map<string, readonly string[]>>();
  // S4a раунд 2 (M-S4a-1): снятая с очереди задача («требует внимания») не
  // возвращается в очередь записью контракта — до разбора человеком.
  const quarantined = new WeakMap<Transaction, Set<string>>();
  const remember = (transaction: Transaction, accountId: AccountId, rawUid: string): void => {
    const map = pendingUids.get(transaction) ?? new Map<string, readonly string[]>();
    map.set(accountId, [...(map.get(accountId) ?? []), rawUid]);
    pendingUids.set(transaction, map);
  };
  return Object.freeze({
    async read(transaction: Transaction, identity: Readonly<{ accountId: AccountId; tenantId: TenantId }>) {
      const snapshot = await transaction.get(ref(identity.accountId));
      if (!snapshot.exists) {
        accountAuthorityLogInfo('delete_state read', { stage: 'delete_state', status: 'absent' });
        return null;
      }
      const data = snapshot.data();
      const stored = isRecord(data) ? data[ACCOUNT_DELETE_PENDING_AUTH_UID_FIELD] : undefined;
      if (typeof stored === 'string' && stored.length > 0) remember(transaction, identity.accountId, stored);
      if (isRecord(data) && typeof data[ACCOUNT_DELETE_WORK_QUARANTINED_AT_FIELD] === 'number') {
        const set = quarantined.get(transaction) ?? new Set<string>();
        set.add(identity.accountId);
        quarantined.set(transaction, set);
        accountAuthorityLogWarn('[AA-S4] delete_state read', { stage: 'delete_state', reason: 'work_quarantined' });
      }
      const state = parseAccountDeleteState(data, identity);
      accountAuthorityLogInfo('delete_state read', {
        stage: 'delete_state', status: state.job?.status ?? 'no_job', pendingAuthUid: typeof stored === 'string',
      });
      return state;
    },
    rememberProviderUid(
      transaction: Transaction,
      identity: Readonly<{ accountId: AccountId; tenantId: TenantId }>,
      rawUid: string,
    ) {
      remember(transaction, identity.accountId, rawUid);
    },
    write(
      transaction: Transaction,
      identity: Readonly<{ accountId: AccountId; tenantId: TenantId }>,
      state: AccountDeleteContractState,
      schedules: readonly AccountDeleteExpirySchedule[],
    ) {
      if (state.accountId !== identity.accountId || state.tenantId !== identity.tenantId) throw invalid();
      const rawUid = pendingAuthUidFor(state, pendingUids.get(transaction)?.get(identity.accountId) ?? []);
      // зачем (раунд 3, L-3): merge нужен ради FieldValue.delete(). Слияние
      // вложенной карты job безопасно, только пока job — ЗАКРЫТАЯ форма: каждый
      // ключ пишется каждый раз (иначе старый ключ пережил бы запись).
      // storedAccountDeleteState отказывает при ключе вне ACCOUNT_DELETE_JOB_KEYS,
      // сторож в s3_delete_rules_ttl.test.ts сверяет список с типом и разбором.
      const isQuarantined = quarantined.get(transaction)?.has(identity.accountId) === true;
      const record = storedAccountDeleteState(state, schedules);
      transaction.set(ref(identity.accountId), {
        ...record,
        // S4a раунд 2: задача «требует внимания» — в очередь фонового шага не возвращается.
        pendingWorkAtMs: isQuarantined ? null : record.pendingWorkAtMs,
        [ACCOUNT_DELETE_PENDING_AUTH_UID_FIELD]: rawUid ?? FieldValue.delete(),
      }, { merge: true });
      accountAuthorityLogInfo('delete_state write', {
        stage: 'delete_state', status: state.job?.status ?? 'no_job', schedules: schedules.length,
        pendingAuthUid: rawUid !== null,
      });
    },
  });
}

/**
 * Просроченные квитанции для планового sweep (S4/S8 подключит расписание).
 * Один запрос с лимитом; поле одно — хватает автоматического индекса.
 */
export async function listDueAccountDeleteExpirySweeps(
  db: Firestore,
  nowMs: number,
  limit: number,
): Promise<readonly Readonly<{ accountId: AccountId; tenantId: TenantId; jobId: string }>[]> {
  // guard-ok: where + limit ниже (многострочная цепочка).
  const snapshot = await db.collection(AA_DELETE_JOBS_COLLECTION)
    .where('expirySweepAtMs', '<=', nowMs)
    .limit(Math.max(1, Math.min(limit, 100)))
    .get();
  const due: Readonly<{ accountId: AccountId; tenantId: TenantId; jobId: string }>[] = [];
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const job = isRecord(data) && isRecord(data.job) ? data.job : null;
    if (job === null || typeof job.jobId !== 'string') {
      accountAuthorityLogWarn('delete_state sweep skipped', { stage: 'delete_state', reason: 'job_missing' });
      continue;
    }
    try {
      due.push(Object.freeze({ accountId: asAccountId(data.accountId), tenantId: asTenantId(data.tenantId), jobId: job.jobId }));
    } catch (error) {
      accountAuthorityLogWarn('delete_state sweep skipped', {
        stage: 'delete_state', reason: 'identity_invalid', causeKind: accountAuthorityServerErrorKind(error), causeCode: accountAuthorityServerErrorCode(error),
      });
    }
  }
  accountAuthorityLogInfo('delete_state sweep listed', { stage: 'delete_state', due: due.length });
  return Object.freeze(due);
}

export type AccountDeletePendingWork = Readonly<{
  accountId: AccountId;
  tenantId: TenantId;
  jobId: string;
  status: 'identity_release_pending' | 'purge_queued';
  /** S4a раунд 2: сбои фонового шага подряд (служебное поле вне job). */
  workFailures: number;
  /** S4a раунд 3 (M-A1): срок шага, увиденный при выборке (сверка перед записью сбоя). */
  observedPendingWorkAtMs: number;
}>;

/** S4a раунд 3 (M-A1): что видела выборка — запись сбоя сверяет это в транзакции. */
export type AccountDeleteWorkObservation = Readonly<{
  jobId: unknown;
  status: unknown;
  pendingWorkAtMs: unknown;
}>;

/*
 * S4a раунд 2 (M-S4a-1): служебные поля фонового шага — ВНЕ job (закрытая
 * форма job и её сторож не затронуты). Пишутся точечным merge только этих
 * полей, без разбора job: задача, чей документ не разбирается, всё равно
 * отодвигается и после ACCOUNT_DELETE_WORK_MAX_FAILURES снимается с очереди.
 */
export const ACCOUNT_DELETE_WORK_FAILURES_FIELD = 'workFailures';
export const ACCOUNT_DELETE_WORK_LAST_FAILURE_CODE_FIELD = 'workLastFailureCode';
export const ACCOUNT_DELETE_WORK_QUARANTINED_AT_FIELD = 'workQuarantinedAtMs';
export const ACCOUNT_DELETE_WORK_MAX_FAILURES = 8;
export const ACCOUNT_DELETE_WORK_RETRY_BASE_MS = 60_000;
export const ACCOUNT_DELETE_WORK_RETRY_MAX_MS = 6 * 60 * 60_000;

/** Пауза после n-го сбоя подряд: 1, 2, 4 … мин, не больше 6 ч. */
export function accountDeleteWorkRetryDelayMs(failures: number): number {
  const exponent = Math.min(Math.max(failures - 1, 0), 20);
  return Math.min(ACCOUNT_DELETE_WORK_RETRY_BASE_MS * 2 ** exponent, ACCOUNT_DELETE_WORK_RETRY_MAX_MS);
}

function workFailuresOf(data: unknown): number {
  const value = isRecord(data) ? data[ACCOUNT_DELETE_WORK_FAILURES_FIELD] : undefined;
  return Number.isSafeInteger(value) && (value as number) >= 0 ? value as number : 0;
}

/** Код сбоя для служебного поля: только безопасный машинный код. */
function safeFailureCode(code: string): string {
  return /^[a-z0-9_.:-]{1,80}$/.test(code) ? code : 'other';
}

function observationOf(data: unknown): AccountDeleteWorkObservation {
  const job = isRecord(data) && isRecord(data.job) ? data.job : null;
  return Object.freeze({
    jobId: job?.jobId,
    status: job?.status,
    pendingWorkAtMs: isRecord(data) ? data.pendingWorkAtMs : undefined,
  });
}

function sameObservation(left: AccountDeleteWorkObservation, right: AccountDeleteWorkObservation): boolean {
  return left.jobId === right.jobId && left.status === right.status && left.pendingWorkAtMs === right.pendingWorkAtMs;
}

export type AccountDeleteWorkFailureOutcome = Readonly<{
  outcome: 'backoff' | 'quarantined' | 'stale';
  failures: number;
  nextAtMs: number | null;
}>;

/**
 * Сбой фонового шага задачи: счётчик +1 и пауза; на ACCOUNT_DELETE_WORK_MAX_FAILURES
 * — снятие с очереди (pendingWorkAtMs=null, workQuarantinedAtMs) и заметная
 * строка лога (error) для владельца. Документ находится по id (= accountId).
 *
 * зачем (S4a раунд 3, M-A1): между выборкой и записью сбоя контракт мог
 * продвинуть задачу (например, purge завершился). Поэтому запись — в
 * транзакции и только если jobId, статус и pendingWorkAtMs те же, что видела
 * выборка; иначе «состояние ушло вперёд» и ничего не пишется (задача не
 * воскресает в очереди и не снимается ложно).
 */
export async function recordAccountDeleteWorkFailure(
  db: Firestore,
  docId: string,
  observed: AccountDeleteWorkObservation,
  nowMs: number,
  failureCode: string,
  options: Readonly<{ forceQuarantine?: boolean }> = {},
): Promise<AccountDeleteWorkFailureOutcome> {
  const code = safeFailureCode(failureCode);
  const ref = db.collection(AA_DELETE_JOBS_COLLECTION).doc(docId);
  const result = await db.runTransaction(async (transaction): Promise<AccountDeleteWorkFailureOutcome> => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.exists ? snapshot.data() : undefined;
    if (!snapshot.exists || !sameObservation(observationOf(data), observed)) {
      accountAuthorityLogInfo('[AA-S4] delete_worker failure_skipped', {
        stage: 'delete_worker', reason: snapshot.exists ? 'state_moved_on' : 'job_gone', causeCode: code,
      });
      return Object.freeze({ outcome: 'stale' as const, failures: workFailuresOf(data), nextAtMs: null });
    }
    const failures = options.forceQuarantine === true
      ? ACCOUNT_DELETE_WORK_MAX_FAILURES
      : workFailuresOf(data) + 1;
    const quarantinedNow = failures >= ACCOUNT_DELETE_WORK_MAX_FAILURES;
    const nextAtMs = quarantinedNow ? null : nowMs + accountDeleteWorkRetryDelayMs(failures);
    transaction.set(ref, {
      pendingWorkAtMs: nextAtMs,
      [ACCOUNT_DELETE_WORK_FAILURES_FIELD]: failures,
      [ACCOUNT_DELETE_WORK_LAST_FAILURE_CODE_FIELD]: code,
      ...(quarantinedNow ? { [ACCOUNT_DELETE_WORK_QUARANTINED_AT_FIELD]: nowMs } : {}),
    }, { merge: true });
    return Object.freeze({ outcome: quarantinedNow ? 'quarantined' as const : 'backoff' as const, failures, nextAtMs });
  });
  if (result.outcome === 'stale') return result;
  const failures = result.failures;
  if (result.outcome === 'quarantined') {
    accountAuthorityLogError('[AA-S4] delete_worker job_quarantined', {
      stage: 'delete_worker', reason: 'max_failures', failures, causeCode: code,
    });
  } else {
    accountAuthorityLogWarn('[AA-S4] delete_worker job_backoff', {
      stage: 'delete_worker', failures, delayMs: accountDeleteWorkRetryDelayMs(failures), causeCode: code,
    });
  }
  return result;
}

/**
 * S4a раунд 3 (L-A2): число снятых с очереди задач («требует внимания») —
 * серверная агрегация `.count()`, документы не выкачиваются, id не
 * возвращаются. Индекс: одно поле `workQuarantinedAtMs` с неравенством —
 * хватает автоматического однополевого индекса, составной не нужен.
 * К Джарвису и тревогам НЕ подключено (чужой контур — решает координатор).
 */
export async function countQuarantinedAccountDeleteJobs(db: Firestore): Promise<number> {
  const snapshot = await db.collection(AA_DELETE_JOBS_COLLECTION)
    .where(ACCOUNT_DELETE_WORK_QUARANTINED_AT_FIELD, '>', 0)
    .count()
    .get();
  const count = snapshot.data().count;
  accountAuthorityLogInfo('[AA-S4] delete_worker quarantined_count', { stage: 'delete_worker', count });
  return count;
}

/** Шаг задачи прошёл — счётчик сбоев подряд обнуляется (pendingWorkAtMs ведёт контракт). */
export async function clearAccountDeleteWorkFailures(db: Firestore, docId: string): Promise<void> {
  await db.collection(AA_DELETE_JOBS_COLLECTION).doc(docId).set({
    [ACCOUNT_DELETE_WORK_FAILURES_FIELD]: FieldValue.delete(),
    [ACCOUNT_DELETE_WORK_LAST_FAILURE_CODE_FIELD]: FieldValue.delete(),
  }, { merge: true });
  accountAuthorityLogInfo('[AA-S4] delete_worker failures_cleared', { stage: 'delete_worker' });
}

async function quarantineMalformed(
  db: Firestore,
  docId: string,
  observed: AccountDeleteWorkObservation,
  nowMs: number,
  reason: string,
): Promise<void> {
  try {
    await recordAccountDeleteWorkFailure(db, docId, observed, nowMs, `malformed_${reason}`, { forceQuarantine: true });
  } catch (error) {
    accountAuthorityLogWarn('[AA-S4] delete_work quarantine_failed', {
      stage: 'delete_worker', reason, causeCode: accountAuthorityServerErrorCode(error),
    });
  }
}

/**
 * S4a: задачи, ждущие фонового шага (повтор освобождения Auth / проход purge).
 * Один запрос с лимитом по полю `pendingWorkAtMs`; статус перепроверяет
 * контракт в своей транзакции (здесь — только маршрут шага).
 */
export async function listDueAccountDeletePendingWork(
  db: Firestore,
  nowMs: number,
  limit: number,
): Promise<readonly AccountDeletePendingWork[]> {
  const boundedLimit = Math.max(1, Math.min(limit, 100));
  accountAuthorityLogInfo('[AA-S4] delete_work list_start', { stage: 'delete_worker', limit: boundedLimit });
  // guard-ok: where + limit ниже (многострочная цепочка).
  const snapshot = await db.collection(AA_DELETE_JOBS_COLLECTION)
    .where('pendingWorkAtMs', '<=', nowMs)
    .limit(boundedLimit)
    .get();
  const due: AccountDeletePendingWork[] = [];
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const job = isRecord(data) && isRecord(data.job) ? data.job : null;
    const status = job?.status;
    // зачем (S4a раунд 2, M-S4a-1): испорченный документ, оставленный в
    // выборке, каждый проход занимал бы место в limit и закрыл бы очередь.
    // Его сразу снимаем с очереди служебной записью (без разбора job).
    if (job === null || typeof job.jobId !== 'string' || (status !== 'identity_release_pending' && status !== 'purge_queued')) {
      const reason = job === null ? 'job_missing' : 'status_not_pending';
      accountAuthorityLogWarn('[AA-S4] delete_work skipped', { stage: 'delete_worker', reason });
      await quarantineMalformed(db, doc.id, observationOf(data), nowMs, reason);
      continue;
    }
    try {
      due.push(Object.freeze({
        accountId: asAccountId(data.accountId),
        tenantId: asTenantId(data.tenantId),
        jobId: job.jobId,
        status,
        workFailures: workFailuresOf(data),
        observedPendingWorkAtMs: data.pendingWorkAtMs as number,
      }));
    } catch (error) {
      accountAuthorityLogWarn('[AA-S4] delete_work skipped', {
        stage: 'delete_worker', reason: 'identity_invalid', causeCode: accountAuthorityServerErrorCode(error),
      });
      await quarantineMalformed(db, doc.id, observationOf(data), nowMs, 'identity_invalid');
    }
  }
  accountAuthorityLogInfo('[AA-S4] delete_work listed', { stage: 'delete_worker', due: due.length });
  return Object.freeze(due);
}

/**
 * S3 пункт 2 + раунд 2: освобождение личности у провайдера (Firebase Auth).
 *
 * Сырой uid берётся ТОЛЬКО из задачи удаления (`pendingAuthUid`): его пишет
 * подготовка delete_begin из проверенного request.auth.uid в той же
 * транзакции, что и job. Поэтому в самом запросе Auth удаляется сразу, а при
 * сбое фоновый повтор находит uid там же. Перед удалением uid сверяется с
 * субъектом аренды из контракта (хеш). После успеха следующая запись задачи
 * стирает поле. «Пользователя уже нет» — успех только с uid из задачи.
 */
export function createFirebaseProviderIdentityReleasePort(deps: Readonly<{
  readPendingAuthUid: (accountId: AccountId) => Promise<string | null>;
  deleteAuthUser: (rawUid: string) => Promise<void>;
}>): ProviderIdentityReleasePort {
  const port: ProviderIdentityReleasePort = {
    async releaseProviderIdentity(request) {
      const rawUid = await deps.readPendingAuthUid(request.accountId);
      if (rawUid === null) {
        accountAuthorityLogWarn('delete identity_release refused', { stage: 'identity', reason: 'raw_uid_unresolved' });
        throw new Error('account_authority_delete_identity_unresolved');
      }
      if (accountAuthorityUidFingerprint(rawUid) !== request.firebaseAuthUid) {
        accountAuthorityLogWarn('delete identity_release refused', { stage: 'identity', reason: 'raw_uid_mismatch' });
        throw new Error('account_authority_delete_identity_mismatch');
      }
      try {
        await deps.deleteAuthUser(rawUid);
        accountAuthorityLogInfo('delete identity_release done', { stage: 'identity', status: 'deleted' });
      } catch (error) {
        const code = isRecord(error) ? error.code : undefined;
        if (code === 'auth/user-not-found') {
          accountAuthorityLogInfo('delete identity_release done', { stage: 'identity', status: 'already_absent' });
          return;
        }
        // S4a: поля без разворота (сторож логов запрещает `...x` в аргументах лога).
        accountAuthorityLogWarn('delete identity_release error', {
          stage: 'identity', kind: accountAuthorityServerErrorKind(error), code: accountAuthorityServerErrorCode(error),
        });
        throw error;
      }
    },
  };
  return Object.freeze(port);
}

/** Чтение `pendingAuthUid` из задачи удаления (одно чтение документа). */
export function firestorePendingAuthUidReader(db: Firestore): (accountId: AccountId) => Promise<string | null> {
  return async (accountId) => {
    // guard-ok: чтение одного документа по id, не коллекции.
    const snapshot = await db.collection(AA_DELETE_JOBS_COLLECTION).doc(accountId).get();
    const data = snapshot.exists ? snapshot.data() : undefined;
    const value = isRecord(data) ? data[ACCOUNT_DELETE_PENDING_AUTH_UID_FIELD] : undefined;
    const present = typeof value === 'string' && value.length > 0;
    accountAuthorityLogInfo('delete identity_release uid_read', { stage: 'identity', status: present ? 'present' : 'absent' });
    return present ? value : null;
  };
}
