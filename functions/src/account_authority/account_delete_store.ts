import { FieldValue, type Firestore, type Transaction } from 'firebase-admin/firestore';
import {
  accountAuthorityLogInfo,
  accountAuthorityLogWarn,
  accountAuthorityServerErrorFields,
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
      transaction.set(ref(identity.accountId), {
        ...storedAccountDeleteState(state, schedules),
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
        stage: 'delete_state', reason: 'identity_invalid', ...accountAuthorityServerErrorFields(error),
      });
    }
  }
  accountAuthorityLogInfo('delete_state sweep listed', { stage: 'delete_state', due: due.length });
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
        accountAuthorityLogWarn('delete identity_release error', { stage: 'identity', ...accountAuthorityServerErrorFields(error) });
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
