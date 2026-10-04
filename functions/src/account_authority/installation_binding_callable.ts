import { createHash, randomUUID } from 'crypto';
import * as admin from 'firebase-admin';
import { Timestamp, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from '../callable_options';
import {
  AccountAuthorityCallableError,
  mapUnknownAccountAuthorityFailure,
} from './callable_boundary';
import {
  accountAuthorityLogInfo,
  accountAuthorityServerCauseFields,
  accountAuthorityServerElapsedMs,
  attachAccountAuthorityFailureDetail,
  logAccountAuthorityFailureOnce,
} from './account_authority_log';
import { asDeviceId, asTenantId, type DeviceId, type TenantId } from './lease_contract';
import {
  AA_PRIMARY_TENANT_ID,
  AA_INSTALLATION_BINDING_QUOTA_COLLECTION,
  AA_INSTALLATION_BINDING_TOKENS_COLLECTION,
  AA_INSTALLATION_BINDINGS_COLLECTION,
} from './account_authority_collections';
import {
  createInstallationBinding,
  installationBindingEvictionCandidates,
  InstallationBindingError,
  type InstallationBindingLiveness,
  type InstallationBindingPorts,
  type InstallationBindingQuota,
  type InstallationBindingRecord,
  type InstallationBindingResponse,
  type InstallationBindingStorePort,
} from './installation_binding_contract';
import {
  ACCOUNT_AUTHORITY_RECORD_TTL_MS,
  accountAuthorityAuthUidHash,
  accountAuthorityExpireAtMs,
  classifySignInProvider,
  shouldRefreshAccountAuthorityExpireAt,
} from './account_authority_policy';

// зачем (S3): имена коллекций — из единого списка AA (удаление, правила, TTL).
const INSTALLATION_BINDINGS_COLLECTION = AA_INSTALLATION_BINDINGS_COLLECTION;
const INSTALLATION_BINDING_TOKENS_COLLECTION = AA_INSTALLATION_BINDING_TOKENS_COLLECTION;
// зачем (AA S2a, пункт 2): счётчик привязок одного uid; ключ — хеш uid.
const INSTALLATION_BINDING_QUOTA_COLLECTION = AA_INSTALLATION_BINDING_QUOTA_COLLECTION;
const PRIMARY_TENANT_ID = asTenantId(AA_PRIMARY_TENANT_ID);
const INSTALLATION_BINDING_RECORD_FIELDS = [
  'schemaVersion',
  'authUidHash',
  'installationIdHash',
  'bindingTokenHash',
  'deviceBindingId',
  'createdAtMs',
  'rotatedAtMs',
  'revokedAtMs',
] as const;
/** D-AA4 (S2a): необязательное поле срока жизни; у записей до S2a его нет. */
const EXPIRE_AT_FIELD = 'expireAt';
const HEX_64 = /^[0-9a-f]{64}$/;

type UnknownRecord = Record<string, unknown>;

type InstallationBindingIndex = Readonly<{
  schemaVersion: 'account-authority-installation-binding-index.v1';
  bindingKey: string;
  bindingTokenHash: string;
  authUidHash: string;
  rotatedAtMs: number;
}>;

export type InstallationBindingCallableRequest = Readonly<{
  // зачем (AA S2a, пункт 1): токен нужен, чтобы отказать анонимному входу.
  auth: Readonly<{ uid: string; token?: unknown }> | null;
  data: unknown;
}>;

type InstallationBindingCallableGateDependencies = Readonly<{
  rolloutEnabled?: boolean;
}>;

export type InstallationBindingCallableDependencies =
  InstallationBindingCallableGateDependencies & (
    | Readonly<{
      ports: InstallationBindingPorts;
      getPorts?: never;
    }>
    | Readonly<{
      ports?: never;
      getPorts: () => InstallationBindingPorts;
    }>
  );

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyTrimmedString(value: unknown): value is string {
  return typeof value === 'string'
    && value.length >= 1
    && value.length <= 512
    && value.trim() === value;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function invalidStoredRecord(): Error {
  return new Error('account_authority_installation_binding_record_invalid');
}

function parseInstallationBindingRecord(value: unknown): InstallationBindingRecord {
  if (!isRecord(value)) throw invalidStoredRecord();
  const keys = Object.keys(value).filter((key) => key !== EXPIRE_AT_FIELD);
  if (
    keys.length !== INSTALLATION_BINDING_RECORD_FIELDS.length
    || INSTALLATION_BINDING_RECORD_FIELDS.some((field) => !Object.prototype.hasOwnProperty.call(value, field))
    || !validStoredExpireAt(value[EXPIRE_AT_FIELD])
    || value.schemaVersion !== 'account-authority-installation-binding-record.v1'
    || !isNonEmptyTrimmedString(value.authUidHash)
    || !isNonEmptyTrimmedString(value.installationIdHash)
    || !isNonEmptyTrimmedString(value.bindingTokenHash)
    || !isNonEmptyTrimmedString(value.deviceBindingId)
    || !isNonNegativeSafeInteger(value.createdAtMs)
    || !isNonNegativeSafeInteger(value.rotatedAtMs)
    || (value.revokedAtMs !== null && !isNonNegativeSafeInteger(value.revokedAtMs))
  ) {
    throw invalidStoredRecord();
  }
  return Object.freeze({
    schemaVersion: value.schemaVersion,
    authUidHash: value.authUidHash,
    installationIdHash: value.installationIdHash,
    bindingTokenHash: value.bindingTokenHash,
    deviceBindingId: value.deviceBindingId,
    createdAtMs: value.createdAtMs,
    rotatedAtMs: value.rotatedAtMs,
    revokedAtMs: value.revokedAtMs,
  });
}

/** Момент последнего использования привязки: срок минус TTL, иначе ротация. */
function bindingLastUsedMs(record: InstallationBindingRecord, data: UnknownRecord): number {
  const expireMs = storedExpireAtMs(data.expireAt);
  return expireMs === null ? record.rotatedAtMs : expireMs - ACCOUNT_AUTHORITY_RECORD_TTL_MS;
}

/** Timestamp, null или отсутствует (запись до S2a). Иное — порча. */
function validStoredExpireAt(value: unknown): boolean {
  return value === undefined || value === null || value instanceof Timestamp;
}

/** Срок жизни записи в мс; null — срока нет (запись до S2a). */
export function storedExpireAtMs(value: unknown): number | null {
  return value instanceof Timestamp ? value.toMillis() : null;
}

export function accountAuthorityExpireAtTimestamp(touchedAtMs: number): Timestamp {
  return Timestamp.fromMillis(accountAuthorityExpireAtMs(touchedAtMs));
}

function storedInstallationBindingRecord(record: InstallationBindingRecord, expireAt: Timestamp): UnknownRecord {
  return {
    schemaVersion: record.schemaVersion,
    authUidHash: record.authUidHash,
    installationIdHash: record.installationIdHash,
    bindingTokenHash: record.bindingTokenHash,
    deviceBindingId: record.deviceBindingId,
    createdAtMs: record.createdAtMs,
    rotatedAtMs: record.rotatedAtMs,
    revokedAtMs: record.revokedAtMs,
    // зачем (D-AA4): TTL-поле; продлевается созданием, ротацией и арендой.
    expireAt,
  };
}

function storedInstallationBindingIndex(
  bindingKey: string,
  record: Pick<InstallationBindingRecord, 'bindingTokenHash' | 'authUidHash' | 'rotatedAtMs'>,
  expireAt: Timestamp,
): UnknownRecord {
  return {
    schemaVersion: 'account-authority-installation-binding-index.v1',
    bindingKey,
    bindingTokenHash: record.bindingTokenHash,
    authUidHash: record.authUidHash,
    rotatedAtMs: record.rotatedAtMs,
    expireAt,
  };
}

function parseInstallationBindingQuota(value: unknown): InstallationBindingQuota {
  if (
    !isRecord(value)
    || value.schemaVersion !== 'account-authority-installation-binding-quota.v1'
    || !isRecord(value.bindings)
    || !Array.isArray(value.recentCallsAtMs)
    || !Object.entries(value.bindings).every(([key, at]) => HEX_64.test(key) && isNonNegativeSafeInteger(at))
    || !value.recentCallsAtMs.every(isNonNegativeSafeInteger)
  ) throw invalidStoredRecord();
  return Object.freeze({
    bindings: Object.freeze({ ...(value.bindings as Record<string, number>) }),
    recentCallsAtMs: Object.freeze([...(value.recentCallsAtMs as number[])]),
  });
}

export function createFirestoreInstallationBindingStore(
  db: Firestore,
): InstallationBindingStorePort {
  const store: InstallationBindingStorePort = {
    async transact(bindingKey, transition, options) {
      if (!HEX_64.test(options.quotaKey)) throw invalidStoredRecord();
      const ref = db.collection(INSTALLATION_BINDINGS_COLLECTION).doc(bindingKey);
      const quotaRef = db.collection(INSTALLATION_BINDING_QUOTA_COLLECTION).doc(options.quotaKey);
      return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        const quotaSnapshot = await transaction.get(quotaRef);
        const current = snapshot.exists
          ? parseInstallationBindingRecord(snapshot.data())
          : null;
        const quota = quotaSnapshot.exists ? parseInstallationBindingQuota(quotaSnapshot.data()) : null;
        // зачем (раунд 2, M2/M3): только когда места нет, читаем записи
        // привязок счётчика (≤ 5) — живость по факту (expireAt, отзыв).
        const candidates = installationBindingEvictionCandidates(
          quota, bindingKey, current !== null && current.revokedAtMs === null,
        );
        const candidateRecords = new Map<string, Readonly<{ record: InstallationBindingRecord; data: UnknownRecord }>>();
        const liveness: Record<string, number | null> = {};
        for (const key of candidates) {
          const candidate = await transaction.get(db.collection(INSTALLATION_BINDINGS_COLLECTION).doc(key));
          const data = candidate.exists ? candidate.data() : undefined;
          const record = isRecord(data) ? parseInstallationBindingRecord(data) : null;
          if (record !== null && isRecord(data)) candidateRecords.set(key, Object.freeze({ record, data }));
          liveness[key] = record === null || record.revokedAtMs !== null || !isRecord(data) ? null : bindingLastUsedMs(record, data);
        }
        const result = transition(current, quota, candidates.length > 0 ? Object.freeze(liveness) as InstallationBindingLiveness : undefined);
        const expireAt = accountAuthorityExpireAtTimestamp(result.record.rotatedAtMs);
        transaction.set(ref, storedInstallationBindingRecord(result.record, expireAt));
        if (result.evictedBindingKey !== null) {
          const evicted = candidateRecords.get(result.evictedBindingKey);
          if (evicted === undefined) throw invalidStoredRecord();
          // Отзыв: запись остаётся (повторный вход по токену → mismatch), индекс
          // токена удаляется (вход по токену → binding_missing).
          transaction.set(
            db.collection(INSTALLATION_BINDINGS_COLLECTION).doc(result.evictedBindingKey),
            storedInstallationBindingRecord(
              Object.freeze({ ...evicted.record, revokedAtMs: result.record.rotatedAtMs }),
              evicted.data.expireAt instanceof Timestamp ? evicted.data.expireAt : expireAt,
            ),
          );
          transaction.delete(db.collection(INSTALLATION_BINDING_TOKENS_COLLECTION).doc(evicted.record.bindingTokenHash));
          accountAuthorityLogInfo('installation_binding evicted', { stage: 'quota', reason: 'least_recently_used' });
        }
        if (current !== null && current.bindingTokenHash !== result.record.bindingTokenHash) {
          const previousTokenRef = db.collection(INSTALLATION_BINDING_TOKENS_COLLECTION)
            .doc(current.bindingTokenHash);
          transaction.delete(previousTokenRef);
        }
        const tokenRef = db.collection(INSTALLATION_BINDING_TOKENS_COLLECTION)
          .doc(result.record.bindingTokenHash);
        transaction.set(tokenRef, storedInstallationBindingIndex(bindingKey, result.record, expireAt));
        transaction.set(quotaRef, {
          schemaVersion: 'account-authority-installation-binding-quota.v1',
          bindings: { ...result.quota.bindings },
          recentCallsAtMs: [...result.quota.recentCallsAtMs],
          updatedAtMs: result.record.rotatedAtMs,
          expireAt,
        });
        return result.response;
      });
    },
  };
  return Object.freeze(store);
}

function parseInstallationBindingIndex(value: unknown): InstallationBindingIndex {
  if (!isRecord(value)) throw invalidStoredRecord();
  const keys = Object.keys(value).filter((key) => key !== EXPIRE_AT_FIELD).sort();
  const expected = [
    'authUidHash',
    'bindingKey',
    'bindingTokenHash',
    'rotatedAtMs',
    'schemaVersion',
  ];
  if (
    keys.length !== expected.length
    || keys.some((key, index) => key !== expected[index])
    || value.schemaVersion !== 'account-authority-installation-binding-index.v1'
    || !/^[0-9a-f]{64}$/.test(String(value.bindingKey))
    || !/^[0-9a-f]{64}$/.test(String(value.bindingTokenHash))
    || !/^[0-9a-f]{64}$/.test(String(value.authUidHash))
    || !isNonNegativeSafeInteger(value.rotatedAtMs)
    || !validStoredExpireAt(value[EXPIRE_AT_FIELD])
  ) throw invalidStoredRecord();
  return Object.freeze({
    schemaVersion: value.schemaVersion,
    bindingKey: value.bindingKey as string,
    bindingTokenHash: value.bindingTokenHash as string,
    authUidHash: value.authUidHash as string,
    rotatedAtMs: value.rotatedAtMs,
  });
}

type BindingRejectReason =
  | 'token_malformed'
  | 'token_unknown'
  | 'binding_missing'
  | 'binding_mismatch'
  | 'binding_expired'
  | 'record_invalid';

/**
 * зачем (AA S2a, пункт 4): клиент должен отличать окончательные отказы от
 * повторяемых. Оба отказа ниже окончательные (повтор не поможет), но требуют
 * разного действия: `binding_missing` — привязки нет (токен неизвестен или
 * запись удалена), `binding_mismatch` — токен есть, но не для этого uid, отозван,
 * ротирован или запись испорчена. В обоих случаях клиент сбрасывает свою
 * привязку и получает новую. Повторяемый сбой — отдельный код `unavailable`.
 */
const BINDING_REJECT_MESSAGE: Readonly<Record<BindingRejectReason, string>> = Object.freeze({
  token_malformed: 'account_authority_binding_mismatch',
  token_unknown: 'account_authority_binding_missing',
  binding_missing: 'account_authority_binding_missing',
  binding_mismatch: 'account_authority_binding_mismatch',
  // Раунд 2, M3: истёкшая привязка — как удалённая по TTL (окончательно, перепривязать).
  binding_expired: 'account_authority_binding_missing',
  record_invalid: 'account_authority_binding_mismatch',
});

function bindingRejected(reason: BindingRejectReason): AccountAuthorityCallableError {
  return new AccountAuthorityCallableError('failed-precondition', BINDING_REJECT_MESSAGE[reason]);
}

// зачем (AA S0/S1, «сперва логи», ревью L4): каждая ветка отказа несёт свою
// причину, чтобы по логу отличать подделанный или устаревший токен от
// отозванной привязки. Резолвер — промежуточный слой: он не пишет отдельную
// строку, а прикрепляет причину к ошибке, и итоговая строка вызова выводит её.
// Ни uid, ни токена, ни их хешей — только код ветки.
function rejectBinding(reason: BindingRejectReason, cause?: unknown): AccountAuthorityCallableError {
  const rejected = attachAccountAuthorityFailureDetail(bindingRejected(reason), { stage: 'binding', reason });
  return cause === undefined
    ? rejected
    : attachAccountAuthorityFailureDetail(rejected, accountAuthorityServerCauseFields(cause));
}


export type VerifiedInstallationBinding = Readonly<{
  tenantId: TenantId;
  deviceId: DeviceId;
  authEpoch: number;
  /**
   * D-AA4 (S2a): продлить срок жизни привязки и индекса токена, если он
   * подходит к концу. null — продлевать не нужно (экономия записи). Вызывать
   * только после всех чтений транзакции (правило транзакций Firestore).
   */
  refreshExpireAt: ((transaction: Transaction) => void) | null;
}>;

/**
 * Проверка привязки ВНУТРИ чужой транзакции. зачем (AA S2a, пункт 3): аренда
 * выдаётся в той же транзакции, где проверена привязка. Раньше это были две
 * транзакции, и отзыв привязки между ними не мешал получить аренду; теперь
 * изменение прочитанной привязки заставит Firestore повторить транзакцию, и
 * повтор увидит отзыв.
 *
 * Отказ — AccountAuthorityCallableError с причиной (rejectBinding). Сбой
 * хранилища пробрасывается как есть: вызывающий слой решает, повторяемый ли он.
 */
export async function verifyInstallationBindingInTransaction(
  db: Firestore,
  transaction: Transaction,
  firebaseAuthUid: string,
  bindingToken: string | null,
  nowMs: number,
): Promise<VerifiedInstallationBinding> {
  if (
    typeof bindingToken !== 'string'
    || bindingToken.length < 1
    || bindingToken.length > 512
    || bindingToken.trim() !== bindingToken
  ) throw rejectBinding('token_malformed');
  const tokenHash = sha256(`account-authority-binding-token.v1\u0000${bindingToken}`);
  const authUidHash = accountAuthorityAuthUidHash(firebaseAuthUid);
  const indexRef = db.collection(INSTALLATION_BINDING_TOKENS_COLLECTION).doc(tokenHash);
  const indexSnapshot = await transaction.get(indexRef);
  if (!indexSnapshot.exists) throw rejectBinding('token_unknown');
  const indexData = indexSnapshot.data();
  const index = parseStoredOrReject(() => parseInstallationBindingIndex(indexData));
  const bindingRef = db.collection(INSTALLATION_BINDINGS_COLLECTION).doc(index.bindingKey);
  const bindingSnapshot = await transaction.get(bindingRef);
  if (!bindingSnapshot.exists) throw rejectBinding('binding_missing');
  const bindingData = bindingSnapshot.data();
  const binding = parseStoredOrReject(() => parseInstallationBindingRecord(bindingData));
  if (
    index.bindingTokenHash !== tokenHash
    || binding.bindingTokenHash !== tokenHash
    || index.authUidHash !== authUidHash
    || binding.authUidHash !== authUidHash
    || index.rotatedAtMs !== binding.rotatedAtMs
    || binding.revokedAtMs !== null
  ) throw rejectBinding('binding_mismatch');
  // зачем (раунд 2, M3): TTL Firestore удаляет запись с опозданием до суток;
  // истёкшая, но ещё не удалённая привязка аренду не даёт.
  const bindingExpireMs = storedExpireAtMs((bindingData as UnknownRecord).expireAt);
  if (bindingExpireMs !== null && bindingExpireMs <= nowMs) throw rejectBinding('binding_expired');
  const storedExpire = Math.min(
    storedExpireAtMs((bindingData as UnknownRecord).expireAt) ?? 0,
    storedExpireAtMs((indexData as UnknownRecord).expireAt) ?? 0,
  );
  const refreshExpireAt = shouldRefreshAccountAuthorityExpireAt(storedExpire === 0 ? null : storedExpire, nowMs)
    ? (write: Transaction) => {
      const expireAt = accountAuthorityExpireAtTimestamp(nowMs);
      write.set(bindingRef, storedInstallationBindingRecord(binding, expireAt));
      write.set(indexRef, storedInstallationBindingIndex(index.bindingKey, binding, expireAt));
    }
    : null;
  return Object.freeze({
    tenantId: PRIMARY_TENANT_ID,
    deviceId: asDeviceId(binding.deviceBindingId),
    // The epoch is server-issued with the binding rotation. Client or
    // Firebase token timestamps are not installation proof.
    authEpoch: binding.rotatedAtMs,
    refreshExpireAt,
  });
}

// Повреждённая запись не лечится повтором: это отказ, а не временный сбой.
function parseStoredOrReject<T>(parse: () => T): T {
  try {
    return parse();
  } catch (error) {
    throw rejectBinding('record_invalid', error);
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function createFirebaseInstallationBindingPorts(db: Firestore): InstallationBindingPorts {
  return Object.freeze({
    hash: Object.freeze({ digest: sha256 }),
    ids: Object.freeze({
      issueBindingToken: () => randomUUID(),
      issueDeviceBindingId: () => randomUUID(),
    }),
    clock: Object.freeze({ nowMs: () => Date.now() }),
    store: createFirestoreInstallationBindingStore(db),
  });
}

function resolvePorts(dependencies: InstallationBindingCallableDependencies): InstallationBindingPorts {
  if (dependencies.ports !== undefined) return dependencies.ports;
  return dependencies.getPorts();
}

/** Ветка отказа контракта привязки — фиксированный код, без текста ошибки. */
function installationBindingRefusalReason(error: InstallationBindingError): string {
  switch (error.message) {
    case 'account_authority_installation_binding_limit': return 'binding_limit';
    case 'account_authority_installation_binding_throttled': return 'binding_throttled';
    case 'account_authority_installation_request_invalid': return 'request_invalid';
    default: return 'binding_invalid';
  }
}

// зачем (AA S1, ревью L4): итог вызова — одна строка с кодом, длительностью и
// подробностями. Неизвестный сбой: временный (contention/deadline) →
// повторяемый unavailable, иначе internal (уровень error). Публичный текст
// прежний, без деталей.
function mapCallableError(error: unknown, startedAt: number): HttpsError {
  let mapped: HttpsError;
  let related: readonly unknown[] = [error];
  if (error instanceof HttpsError) {
    mapped = error;
  } else if (error instanceof InstallationBindingError) {
    // зачем (S2a, пункт 2): причина отказа (limit/throttled/invalid) видна в
    // итоговой строке как causeCode — это собственный код account_authority_*.
    mapped = attachAccountAuthorityFailureDetail(
      new HttpsError(error.code, error.message),
      { stage: 'contract', reason: installationBindingRefusalReason(error) },
    );
  } else {
    const unknownMapped = mapUnknownAccountAuthorityFailure(error, 'installation_binding_create', 'adapter');
    related = [error, unknownMapped];
    mapped = new HttpsError(unknownMapped.code, 'account_authority_installation_binding_unavailable');
  }
  logAccountAuthorityFailureOnce('installation_binding create_failed', {
    code: mapped.code,
    durationMs: accountAuthorityServerElapsedMs(startedAt),
  }, [...related, mapped]);
  return mapped;
}

export async function handleInstallationBindingCallable(
  dependencies: InstallationBindingCallableDependencies,
  request: InstallationBindingCallableRequest,
): Promise<InstallationBindingResponse> {
  const startedAt = Date.now();
  accountAuthorityLogInfo('installation_binding create_start');
  try {
    if (dependencies.rolloutEnabled !== true) {
      throw attachAccountAuthorityFailureDetail(
        new HttpsError('failed-precondition', 'account_authority_installation_binding_disabled'),
        { stage: 'gate', reason: 'rollout_disabled' },
      );
    }
    const firebaseAuthUid = request.auth?.uid;
    if (typeof firebaseAuthUid !== 'string' || firebaseAuthUid.length === 0) {
      throw attachAccountAuthorityFailureDetail(
        new HttpsError('unauthenticated', 'account_authority_auth_required'),
        { stage: 'auth', reason: 'no_uid' },
      );
    }
    // зачем (AA S2a, пункт 1): анонимный вход не получает привязку установки.
    // Проверка до фабрики портов: отказ не стоит ни одного обращения к Firestore.
    const provider = classifySignInProvider(request.auth?.token);
    if (provider !== 'allowed') {
      throw attachAccountAuthorityFailureDetail(
        new HttpsError(
          'permission-denied',
          provider === 'anonymous'
            ? 'account_authority_anonymous_rejected'
            : 'account_authority_sign_in_provider_rejected',
        ),
        { stage: 'auth', reason: provider },
      );
    }
    const response = await createInstallationBinding(
      resolvePorts(dependencies),
      firebaseAuthUid,
      request.data,
    );
    accountAuthorityLogInfo('installation_binding create_done', {
      durationMs: accountAuthorityServerElapsedMs(startedAt),
    });
    return response;
  } catch (error) {
    throw mapCallableError(error, startedAt);
  }
}

export const accountAuthorityInstallationBindingCreate = onCall(
  HOT_CALLABLE_OPTIONS,
  (request) => handleInstallationBindingCallable(
    {
      getPorts: () => createFirebaseInstallationBindingPorts(admin.firestore()),
      rolloutEnabled: false,
    },
    {
      auth: request.auth === undefined ? null : { uid: request.auth.uid, token: request.auth.token },
      data: request.data,
    },
  ),
);
