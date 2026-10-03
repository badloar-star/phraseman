import { createHash, randomUUID } from 'crypto';
import * as admin from 'firebase-admin';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from '../callable_options';
import {
  accountAuthorityExpireAtTimestamp,
  verifyInstallationBindingInTransaction,
} from './installation_binding_callable';
import {
  createEmptyDeleteContractState,
  type AccountDeleteContractState,
  type AccountDeleteExpirySchedule,
} from './delete_contract';
import {
  accountAuthorityLogInfo,
  accountAuthorityLogWarn,
  accountAuthorityServerErrorCode,
  accountAuthorityServerErrorKind,
  accountAuthorityServerCauseFields,
  accountAuthorityServerElapsedMs,
  attachAccountAuthorityFailureDetail,
  logAccountAuthorityFailureOnce,
} from './account_authority_log';
import { accountAuthorityUidFingerprint } from './account_authority_policy';
import {
  assertAuthNotDeletingInTransaction,
  identityUnresolved,
  readPrincipalInTransaction,
  resolvePrincipalForAcquire,
} from './account_principal_store';
import {
  AccountAuthorityCallableError,
  mapUnknownAccountAuthorityFailure,
  handleAccountLeaseAcquireCallable,
  handleAccountLeaseReleaseCallable,
  type AccountAuthorityCallableBoundaryPorts,
  type AccountAuthorityCallableRequest,
  type AccountAuthorityLeaseCallableResponse,
  type AccountAuthorityLeaseReleaseCallableResponse,
} from './callable_boundary';
import {
  asAccountId,
  asDeviceId,
  asFirebaseAuthUid,
  asOperationId,
  asProviderSubject,
  asSessionId,
  asTenantId,
  createEmptyAccountLeaseState,
  releaseActiveAccountLease,
  type AccountId,
  type AccountLeaseAcquireResult,
  type AccountLeaseOperationReceipt,
  type AccountLeaseState,
  type AccountRetiredSessionLookup,
  type FirebaseAuthUid,
  type ProviderSubject,
  type ResolvedAccountPrincipal,
  type SessionId,
  type TenantId,
} from './lease_contract';

const ACCOUNTS_COLLECTION = 'account_authority_accounts_v1';
const RETIRED_SESSIONS_COLLECTION = 'retired_sessions';
type UnknownRecord = Record<string, unknown>;

/** Подмена часов и генератора id — только для тестов. */
/**
 * S2a раунд 3, L-R2-4: шов хранения состояния удаления. Сама Firestore-схема
 * удаления (job, расписания истечения) — этап S4; до него адаптер отказывает
 * в удалении как «не подключено». Тесты подставляют хранилище в памяти.
 */
export interface AccountDeleteStateStorePort {
  read(
    transaction: Transaction,
    identity: Readonly<{ accountId: AccountId; tenantId: TenantId }>,
  ): Promise<AccountDeleteContractState | null>;
  write(
    transaction: Transaction,
    identity: Readonly<{ accountId: AccountId; tenantId: TenantId }>,
    state: AccountDeleteContractState,
    expirySchedules: readonly AccountDeleteExpirySchedule[],
  ): void;
}

const DELETE_STATE_STORE_NOT_WIRED: AccountDeleteStateStorePort = Object.freeze({
  read: async () => { throw new Error('account_authority_deletion_store_not_wired'); },
  write: () => { throw new Error('account_authority_deletion_store_not_wired'); },
});

/** Подмена часов, генератора id и шва S4 — только для тестов. */
export type FirebaseLeasePortsOverrides = Readonly<{
  nowMs?: () => number;
  newAccountId?: () => string;
  deleteStateStore?: AccountDeleteStateStorePort;
}>;

type FirebaseAccountAuthorityLeaseGateDependencies = Readonly<{
  rolloutEnabled?: boolean;
  trustedInstallationBindingAvailable?: boolean;
}>;

export type FirebaseAccountAuthorityLeaseDependencies =
  FirebaseAccountAuthorityLeaseGateDependencies & (
    | Readonly<{
      ports: AccountAuthorityCallableBoundaryPorts;
      getPorts?: never;
    }>
    | Readonly<{
      ports?: never;
      getPorts: () => AccountAuthorityCallableBoundaryPorts;
    }>
  );

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonNegativeInteger(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error('account_authority_firestore_state_invalid');
  }
  return value as number;
}

function positiveInteger(value: unknown): number {
  const parsed = nonNegativeInteger(value);
  if (parsed < 1) throw new Error('account_authority_firestore_state_invalid');
  return parsed;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function activeLease(value: unknown): AccountLeaseState['activeLease'] {
  if (value === null) return null;
  if (!isRecord(value)) throw new Error('account_authority_firestore_state_invalid');
  return Object.freeze({
    accountId: asAccountId(value.accountId),
    tenantId: asTenantId(value.tenantId),
    firebaseAuthUid: asFirebaseAuthUid(value.firebaseAuthUid),
    providerSubject: asProviderSubject(value.providerSubject),
    authEpoch: nonNegativeInteger(value.authEpoch),
    deviceId: asDeviceId(value.deviceId),
    sessionId: asSessionId(value.sessionId),
    issuedAtMs: nonNegativeInteger(value.issuedAtMs),
    renewedAtMs: nonNegativeInteger(value.renewedAtMs),
    revision: nonNegativeInteger(value.revision),
  });
}

function acquireResult(value: unknown): AccountLeaseAcquireResult {
  if (!isRecord(value) || (value.type !== 'acquired' && value.type !== 'renewed')) {
    throw new Error('account_authority_firestore_state_invalid');
  }
  if (typeof value.idempotent !== 'boolean') {
    throw new Error('account_authority_firestore_state_invalid');
  }
  const lease = activeLease(value.lease);
  if (lease === null) throw new Error('account_authority_firestore_state_invalid');
  const revoked = value.revokedLease;
  let revokedLease: AccountLeaseAcquireResult['revokedLease'] = null;
  if (revoked !== null) {
    if (!isRecord(revoked)) throw new Error('account_authority_firestore_state_invalid');
    const parsed = activeLease(revoked);
    if (parsed === null) throw new Error('account_authority_firestore_state_invalid');
    revokedLease = Object.freeze({ ...parsed, revokedAtMs: nonNegativeInteger(revoked.revokedAtMs) });
  }
  return Object.freeze({ type: value.type, lease, revokedLease, idempotent: value.idempotent });
}

function operationReceipt(value: unknown): AccountLeaseOperationReceipt {
  if (!isRecord(value) || (value.kind !== 'acquire' && value.kind !== 'release')) {
    throw new Error('account_authority_firestore_state_invalid');
  }
  const common = {
    operationId: asOperationId(value.operationId),
    accountId: asAccountId(value.accountId),
    tenantId: asTenantId(value.tenantId),
    deviceId: asDeviceId(value.deviceId),
    expectedRevision: nonNegativeInteger(value.expectedRevision),
    expiresAtMs: nonNegativeInteger(value.expiresAtMs),
  };
  if (value.kind === 'acquire') {
    return Object.freeze({
      kind: 'acquire' as const,
      ...common,
      firebaseAuthUid: asFirebaseAuthUid(value.firebaseAuthUid),
      providerSubject: asProviderSubject(value.providerSubject),
      authEpoch: nonNegativeInteger(value.authEpoch),
      result: acquireResult(value.result),
    });
  }
  if (!isRecord(value.result) || value.result.type !== 'released' || typeof value.result.idempotent !== 'boolean') {
    throw new Error('account_authority_firestore_state_invalid');
  }
  return Object.freeze({
    kind: 'release' as const,
    ...common,
    sessionId: asSessionId(value.sessionId),
    result: Object.freeze({
      type: 'released' as const,
      revision: nonNegativeInteger(value.result.revision),
      idempotent: value.result.idempotent,
    }),
  });
}

function leaseState(value: unknown, accountId: AccountId, tenantId: TenantId): AccountLeaseState {
  if (!isRecord(value) || value.schemaVersion !== 'account-authority-firestore-lease.v1') {
    throw new Error('account_authority_firestore_state_invalid');
  }
  if (!isRecord(value.lifecycle) || !isRecord(value.receiptLedger)) {
    throw new Error('account_authority_firestore_state_invalid');
  }
  const storedAccountId = asAccountId(value.accountId);
  const storedTenantId = asTenantId(value.tenantId);
  if (storedAccountId !== accountId || storedTenantId !== tenantId) {
    throw new Error('account_authority_firestore_state_invalid');
  }
  let lifecycle: AccountLeaseState['lifecycle'];
  if (value.lifecycle.status === 'active') {
    lifecycle = Object.freeze({ status: 'active' as const });
  } else if (value.lifecycle.status === 'deleting' || value.lifecycle.status === 'deleted') {
    if (typeof value.lifecycle.jobId !== 'string') throw new Error('account_authority_firestore_state_invalid');
    lifecycle = Object.freeze({
      status: value.lifecycle.status,
      jobId: value.lifecycle.jobId,
      changedAtMs: nonNegativeInteger(value.lifecycle.changedAtMs),
    });
  } else {
    throw new Error('account_authority_firestore_state_invalid');
  }
  if (!Array.isArray(value.receiptLedger.entries)) {
    throw new Error('account_authority_firestore_state_invalid');
  }
  const latestAuthEpoch = value.latestAuthEpoch === null
    ? null
    : nonNegativeInteger(value.latestAuthEpoch);
  return Object.freeze({
    accountId,
    tenantId,
    lifecycle,
    revision: nonNegativeInteger(value.revision),
    activeLease: activeLease(value.activeLease),
    latestAuthEpoch,
    receiptLedger: Object.freeze({
      maxEntries: positiveInteger(value.receiptLedger.maxEntries),
      retentionMs: positiveInteger(value.receiptLedger.retentionMs),
      entries: Object.freeze(value.receiptLedger.entries.map(operationReceipt)),
    }),
    lastServerNowMs: nonNegativeInteger(value.lastServerNowMs),
  });
}

// зачем (D-AA4, S2a пункт 7): каждый вход/выход переписывает документ аренды,
// поэтому срок жизни продлевается здесь бесплатно. У удаляемого/удалённого
// аккаунта срока нет (null): его надгробие не должно исчезнуть по TTL.
function storedLeaseState(state: AccountLeaseState, nowMs: number): UnknownRecord {
  return {
    schemaVersion: 'account-authority-firestore-lease.v1',
    ...state,
    expireAt: state.lifecycle.status === 'active' ? accountAuthorityExpireAtTimestamp(nowMs) : null,
  };
}

async function readRetiredSessions(
  transaction: Transaction,
  accountRef: FirebaseFirestore.DocumentReference,
  state: AccountLeaseState,
  retirementSessionIds: readonly SessionId[],
): Promise<AccountRetiredSessionLookup> {
  const sessionIds = new Map<string, SessionId>();
  for (const sessionId of retirementSessionIds) sessionIds.set(sessionId, sessionId);
  if (state.activeLease !== null) sessionIds.set(state.activeLease.sessionId, state.activeLease.sessionId);
  const retired = new Set<string>();
  for (const sessionId of sessionIds.values()) {
    const retirement = await transaction.get(accountRef.collection(RETIRED_SESSIONS_COLLECTION).doc(sessionId));
    if (retirement.exists) retired.add(sessionId);
  }
  return Object.freeze({ isRetired: (sessionId: SessionId) => retired.has(sessionId) });
}

function writeLeaseTransition(
  transaction: Transaction,
  accountRef: FirebaseFirestore.DocumentReference,
  identity: Readonly<{ accountId: AccountId; tenantId: TenantId }>,
  result: Readonly<{ state: AccountLeaseState; retirements: readonly Readonly<{ sessionId: SessionId }>[] }>,
  nowMs: number,
): void {
  transaction.set(accountRef, storedLeaseState(result.state, nowMs));
  for (const operation of result.retirements) {
    transaction.create(accountRef.collection(RETIRED_SESSIONS_COLLECTION).doc(operation.sessionId), {
      schemaVersion: 'account-authority-retired-session.v1',
      accountId: identity.accountId,
      tenantId: identity.tenantId,
      sessionId: operation.sessionId,
      retiredAtMs: result.state.lastServerNowMs,
      // D-AA4: отметка нужна против повтора сессии; сессии случайные, 90 дней хватает.
      expireAt: accountAuthorityExpireAtTimestamp(nowMs),
    });
  }
}

function isAlreadyExists(error: unknown): boolean {
  const code = isRecord(error) ? error.code : undefined;
  return code === 6 || code === 'already-exists' || code === 'ALREADY_EXISTS';
}

/**
 * Раунд 2, L3: параллельный первый вход того же uid может проиграть гонку
 * создания принципала (ALREADY_EXISTS). Это не сбой сервера, а повод повторить:
 * повтор прочитает уже созданный принципал. Поэтому `unavailable`, не `internal`.
 */
function retryableOnAlreadyExists(error: unknown): unknown {
  if (!isAlreadyExists(error)) return error;
  return attachAccountAuthorityFailureDetail(
    new AccountAuthorityCallableError('unavailable', 'account_authority_unavailable'),
    { stage: 'principal', reason: 'already_exists' },
    accountAuthorityServerCauseFields(error),
  );
}

/**
 * Раунд 2, H1: при перепривязке принципала аренда этого uid на СТАРОМ
 * accountId освобождается в той же транзакции (контрактом выхода, с
 * квитанцией и отметкой сессии). Чужую аренду на старом аккаунте не трогаем.
 * Чтения: документ старого аккаунта и отметка его активной сессии (только при
 * перепривязке — редкий путь).
 */
async function prepareReboundLeaseRelease(
  db: Firestore,
  transaction: Transaction,
  input: Readonly<{ accountId: AccountId; tenantId: TenantId; leaseSubject: string; serverNowMs: number }>,
): Promise<((target: Transaction) => void) | null> {
  const accountRef = db.collection(ACCOUNTS_COLLECTION).doc(input.accountId);
  const snapshot = await transaction.get(accountRef);
  if (!snapshot.exists) {
    accountAuthorityLogInfo('principal_rebound lease skipped', { stage: 'principal', reason: 'no_account' });
    return null;
  }
  // зачем (раунд 3, L-R2-3): старый аккаунт — не повод ронять вход в новый.
  // Испорченное состояние или отказ контракта: не освобождаем, пишем причину.
  let state: AccountLeaseState;
  try {
    state = leaseState(snapshot.data(), input.accountId, input.tenantId);
  } catch (error) {
    accountAuthorityLogWarn('principal_rebound lease skipped', {
      stage: 'principal', reason: 'state_invalid',
      causeKind: accountAuthorityServerErrorKind(error),
      causeCode: accountAuthorityServerErrorCode(error),
    });
    return null;
  }
  if (state.lifecycle.status !== 'active') {
    accountAuthorityLogInfo('principal_rebound lease skipped', { stage: 'principal', reason: `lifecycle_${state.lifecycle.status}` });
    return null;
  }
  const active = state.activeLease;
  // Только аренда ЭТОГО uid (субъект совпадает); чужую на старом аккаунте не трогаем.
  if (active === null || active.firebaseAuthUid !== input.leaseSubject) {
    accountAuthorityLogInfo('principal_rebound lease skipped', { stage: 'principal', reason: active === null ? 'no_lease' : 'foreign_lease' });
    return null;
  }
  const retiredSessions = await readRetiredSessions(transaction, accountRef, state, []);
  const nowMs = Math.max(input.serverNowMs, state.lastServerNowMs);
  let result: ReturnType<typeof releaseActiveAccountLease>;
  try {
    result = releaseActiveAccountLease(state, {
      accountId: input.accountId,
      tenantId: input.tenantId,
      deviceId: active.deviceId,
      sessionId: active.sessionId,
      operationId: asOperationId(`rebind-${sha256(`${active.sessionId}\u0000${nowMs}`).slice(0, 40)}`),
      expectedRevision: state.revision,
      serverNowMs: nowMs,
    }, retiredSessions);
  } catch (error) {
    accountAuthorityLogWarn('principal_rebound lease skipped', {
      stage: 'principal', reason: 'release_rejected',
      causeKind: accountAuthorityServerErrorKind(error),
      causeCode: accountAuthorityServerErrorCode(error),
    });
    return null;
  }
  accountAuthorityLogInfo('principal_rebound lease', { stage: 'principal', status: 'released' });
  return (target: Transaction) => {
    writeLeaseTransition(target, accountRef, { accountId: input.accountId, tenantId: input.tenantId }, result, nowMs);
  };
}

export function createFirebaseLeasePorts(
  db: Firestore,
  overrides: FirebaseLeasePortsOverrides = {},
): AccountAuthorityCallableBoundaryPorts {
  const nowMs = overrides.nowMs ?? (() => Date.now());
  const newAccountId = overrides.newAccountId ?? (() => `acct-${randomUUID()}`);
  const deleteStateStore = overrides.deleteStateStore ?? DELETE_STATE_STORE_NOT_WIRED;

  const transactions: AccountAuthorityCallableBoundaryPorts['lease']['transactions'] = {
    transact: async (identity, retirementSessionIds, transition) => {
      const accountRef = db.collection(ACCOUNTS_COLLECTION).doc(identity.accountId);
      return db.runTransaction(async (transaction) => {
        const accountSnapshot = await transaction.get(accountRef);
        const state = accountSnapshot.exists
          ? leaseState(accountSnapshot.data(), identity.accountId, identity.tenantId)
          : createEmptyAccountLeaseState(identity.accountId, identity.tenantId);
        const lookup = await readRetiredSessions(transaction, accountRef, state, retirementSessionIds);
        const result = transition({ state, retiredSessions: lookup });
        writeLeaseTransition(transaction, accountRef, identity, result, nowMs());
        return result.result;
      });
    },
  };

  /*
   * Вход — ОДНА транзакция. Чтения в установившемся режиме (раунд 2):
   *   индекс токена 1 + запись привязки 1 (S2a п.3)
   *   + метка удаления uid и постоянный отказ 2 (H2)
   *   + принципал 1 + auth_links 1 (H1)
   *   + документ аренды 1 + отметки сессий 1–2
   *   = 8–9 чтений у принципала без якоря, 1 транзакция (до S2a: 4 и 7–8).
   * Раунд 3 (M-R2-1/L-R2-1): у привязанного к stableId принципала на каждом
   * входе + надгробие и постоянный отказ аккаунта (2) + users (1) = 11–12.
   * Первый вход с якорем — те же 11; скрытый дубль +3; перепривязка + старый
   * аккаунт и его отметка сессии (2).
   */
  const bound: AccountAuthorityCallableBoundaryPorts['lease']['bound'] = {
    transactAcquire: async (request, transition) => {
      const rawUid = request.source.firebaseAuthUid;
      const leaseSubject = asFirebaseAuthUid(accountAuthorityUidFingerprint(rawUid));
      try {
        return await db.runTransaction(async (transaction) => {
          const binding = await verifyInstallationBindingInTransaction(
            db, transaction, rawUid, request.bindingToken, request.serverNowMs,
          );
          await assertAuthNotDeletingInTransaction(db, transaction, rawUid, request.serverNowMs);
          const principalRead = await resolvePrincipalForAcquire(db, transaction, {
            tenantId: binding.tenantId, rawUid, leaseSubject, nowMs: request.serverNowMs, newAccountId,
          });
          const releaseOld = principalRead.reboundFrom === null
            ? null
            : await prepareReboundLeaseRelease(db, transaction, {
              accountId: principalRead.reboundFrom,
              tenantId: binding.tenantId,
              leaseSubject,
              serverNowMs: request.serverNowMs,
            });
          const accountId = principalRead.principal.accountId;
          const accountRef = db.collection(ACCOUNTS_COLLECTION).doc(accountId);
          const accountSnapshot = await transaction.get(accountRef);
          const state = accountSnapshot.exists
            ? leaseState(accountSnapshot.data(), accountId, binding.tenantId)
            : createEmptyAccountLeaseState(accountId, binding.tenantId);
          const retiredSessions = await readRetiredSessions(transaction, accountRef, state, request.retirementSessionIds);
          const result = transition({
            principal: Object.freeze({
              accountId,
              providerSubject: principalRead.principal.providerSubject,
              tenantId: binding.tenantId,
            }),
            deviceId: binding.deviceId,
            authEpoch: binding.authEpoch,
            state,
            retiredSessions,
          });
          // Все записи — после всех чтений (правило транзакций Firestore).
          principalRead.write?.(transaction);
          releaseOld?.(transaction);
          binding.refreshExpireAt?.(transaction);
          writeLeaseTransition(transaction, accountRef, { accountId, tenantId: binding.tenantId }, result, request.serverNowMs);
          accountAuthorityLogInfo('bound acquire prepared', {
            stage: 'bound_transaction',
            principalWrite: principalRead.write !== null,
            rebound: principalRead.reboundFrom !== null,
            bindingRefresh: binding.refreshExpireAt !== null,
            retirements: result.retirements.length,
          });
          return result.result;
        });
      } catch (error) {
        throw retryableOnAlreadyExists(error);
      }
    },

    /*
     * Раунд 2, L5: выход — одна транзакция без создания принципала. Чтения:
     * индекс токена 1 + привязка 1 + принципал 1 + аренда 1 + отметка сессии 1
     * = 5 (до раунда 2: 4 транзакции и 7 чтений). Нет принципала — null.
     */
    transactRelease: async (request, transition) => {
      const rawUid = request.source.firebaseAuthUid;
      const leaseSubject = asFirebaseAuthUid(accountAuthorityUidFingerprint(rawUid));
      return db.runTransaction(async (transaction) => {
        const binding = await verifyInstallationBindingInTransaction(
          db, transaction, rawUid, request.bindingToken, request.serverNowMs,
        );
        const stored = await readPrincipalInTransaction(db, transaction, binding.tenantId, leaseSubject);
        if (stored === null) {
          accountAuthorityLogInfo('bound release skipped', { stage: 'principal', reason: 'no_principal' });
          return null;
        }
        const accountRef = db.collection(ACCOUNTS_COLLECTION).doc(stored.accountId);
        const accountSnapshot = await transaction.get(accountRef);
        const state = accountSnapshot.exists
          ? leaseState(accountSnapshot.data(), stored.accountId, binding.tenantId)
          : createEmptyAccountLeaseState(stored.accountId, binding.tenantId);
        const retiredSessions = await readRetiredSessions(transaction, accountRef, state, [request.sessionId]);
        const result = transition({
          accountId: stored.accountId,
          tenantId: binding.tenantId,
          deviceId: binding.deviceId,
          state,
          retiredSessions,
        });
        writeLeaseTransition(
          transaction, accountRef, { accountId: stored.accountId, tenantId: binding.tenantId }, result, request.serverNowMs,
        );
        return result.result;
      });
    },
  };

  /*
   * Удаление (раунд 3, L-R2-4). Подготовка — одна транзакция: индекс токена 1
   * + привязка 1 + принципал 1 + аренда 1 + отметка активной сессии 1 = 5
   * чтений (+ состояние удаления из шва S4). Было: 3 транзакции и 7 чтений.
   */
  const deletionBound: AccountAuthorityCallableBoundaryPorts['deletion']['bound'] = {
    transactPrepare: async (request, transition) => {
      const rawUid = request.source.firebaseAuthUid;
      const leaseSubject = asFirebaseAuthUid(accountAuthorityUidFingerprint(rawUid));
      return db.runTransaction(async (transaction) => {
        const serverNowMs = nowMs();
        const binding = await verifyInstallationBindingInTransaction(
          db, transaction, rawUid, request.bindingToken, serverNowMs,
        );
        const stored = await readPrincipalInTransaction(db, transaction, binding.tenantId, leaseSubject);
        if (stored === null) throw identityUnresolved('principal_missing');
        const identity = { accountId: stored.accountId, tenantId: binding.tenantId };
        const accountRef = db.collection(ACCOUNTS_COLLECTION).doc(stored.accountId);
        const accountSnapshot = await transaction.get(accountRef);
        const state = accountSnapshot.exists
          ? leaseState(accountSnapshot.data(), stored.accountId, binding.tenantId)
          : createEmptyAccountLeaseState(stored.accountId, binding.tenantId);
        const retiredSessions = await readRetiredSessions(transaction, accountRef, state, []);
        const deleteState = await deleteStateStore.read(transaction, identity)
          ?? createEmptyDeleteContractState(stored.accountId, binding.tenantId);
        const result = transition({
          principal: Object.freeze({
            accountId: stored.accountId,
            providerSubject: stored.providerSubject,
            tenantId: binding.tenantId,
          }),
          deviceId: binding.deviceId,
          authEpoch: binding.authEpoch,
          leaseState: state,
          deleteState,
          retiredSessions,
        });
        writeLeaseTransition(transaction, accountRef, identity, {
          state: result.state.leaseState,
          retirements: result.retirements,
        }, serverNowMs);
        deleteStateStore.write(transaction, identity, result.state.deleteState, result.expirySchedules);
        return result.result;
      });
    },
  };

  // Шаги освобождения личности после подготовки: аренда — Firestore, состояние
  // удаления — шов S4 (до S4 — «не подключено»).
  const deletionTransactions: AccountAuthorityCallableBoundaryPorts['deletion']['transactions'] = {
    transact: async (identity, retirementSessionIds, transition) => {
      const accountRef = db.collection(ACCOUNTS_COLLECTION).doc(identity.accountId);
      return db.runTransaction(async (transaction) => {
        const accountSnapshot = await transaction.get(accountRef);
        const state = accountSnapshot.exists
          ? leaseState(accountSnapshot.data(), identity.accountId, identity.tenantId)
          : createEmptyAccountLeaseState(identity.accountId, identity.tenantId);
        const retiredSessions = await readRetiredSessions(transaction, accountRef, state, retirementSessionIds);
        const deleteState = await deleteStateStore.read(transaction, identity)
          ?? createEmptyDeleteContractState(identity.accountId, identity.tenantId);
        const result = transition({ leaseState: state, deleteState, retiredSessions });
        const serverNowMs = nowMs();
        writeLeaseTransition(transaction, accountRef, identity, {
          state: result.state.leaseState,
          retirements: result.retirements,
        }, serverNowMs);
        deleteStateStore.write(transaction, identity, result.state.deleteState, result.expirySchedules);
        return result.result;
      });
    },
  };

  return Object.freeze({
    lease: {
      sessions: { issueSessionId: async () => asSessionId(`session-${randomUUID()}`) },
      clock: { nowMs },
      transactions,
      bound,
    },
    deletion: {
      clock: { nowMs },
      claims: { issueClaimId: () => { throw new Error('account_authority_delete_not_wired'); } },
      transactions: deletionTransactions,
      bound: deletionBound,
      identity: {
        releaseProviderIdentity: async () => { throw new Error('account_authority_delete_not_wired'); },
      },
    },
  });
}

// зачем (AA S1, ревью L4): одна ошибка — одна итоговая строка. Если граница
// callable уже записала свою итоговую строку, адаптер второй не пишет. Сбои
// самого адаптера (ворота, getPorts) пишутся здесь, тоже одной строкой со
// всеми подробностями. Неизвестный сбой: временный → unavailable, иначе internal.
function mapCallableError(error: unknown, operation: string, startedAt: number): HttpsError {
  let mapped: HttpsError;
  let related: readonly unknown[] = [error];
  if (error instanceof HttpsError) {
    mapped = error;
  } else if (error instanceof AccountAuthorityCallableError) {
    mapped = new HttpsError(error.code, error.message);
  } else {
    const unknownMapped = mapUnknownAccountAuthorityFailure(error, operation, 'adapter');
    related = [error, unknownMapped];
    mapped = new HttpsError(unknownMapped.code, unknownMapped.message);
  }
  logAccountAuthorityFailureOnce('lease_callable failed', {
    operation,
    code: mapped.code,
    durationMs: accountAuthorityServerElapsedMs(startedAt),
  }, [...related, mapped]);
  return mapped;
}

function rejectGate(reason: 'rollout_disabled' | 'binding_unavailable'): HttpsError {
  const gate = reason === 'rollout_disabled'
    ? new HttpsError('failed-precondition', 'account_authority_disabled')
    : new HttpsError('failed-precondition', 'account_authority_installation_binding_unavailable');
  return attachAccountAuthorityFailureDetail(gate, { stage: 'gate', reason });
}

function resolveCallablePorts(
  dependencies: FirebaseAccountAuthorityLeaseDependencies,
): AccountAuthorityCallableBoundaryPorts {
  if (dependencies.ports !== undefined) return dependencies.ports;
  return dependencies.getPorts();
}

export async function handleFirebaseAccountAuthorityLeaseAcquire(
  dependencies: FirebaseAccountAuthorityLeaseDependencies,
  request: AccountAuthorityCallableRequest,
): Promise<AccountAuthorityLeaseCallableResponse> {
  const startedAt = Date.now();
  try {
    if (dependencies.rolloutEnabled !== true) throw rejectGate('rollout_disabled');
    if (dependencies.trustedInstallationBindingAvailable !== true) {
      throw rejectGate('binding_unavailable');
    }
    return await handleAccountLeaseAcquireCallable(resolveCallablePorts(dependencies), request);
  } catch (error) {
    throw mapCallableError(error, 'lease_acquire', startedAt);
  }
}

export async function handleFirebaseAccountAuthorityLeaseRelease(
  dependencies: FirebaseAccountAuthorityLeaseDependencies,
  request: AccountAuthorityCallableRequest,
): Promise<AccountAuthorityLeaseReleaseCallableResponse> {
  const startedAt = Date.now();
  try {
    if (dependencies.rolloutEnabled !== true) throw rejectGate('rollout_disabled');
    if (dependencies.trustedInstallationBindingAvailable !== true) {
      throw rejectGate('binding_unavailable');
    }
    return await handleAccountLeaseReleaseCallable(resolveCallablePorts(dependencies), request);
  } catch (error) {
    throw mapCallableError(error, 'lease_release', startedAt);
  }
}

export const accountAuthorityLeaseAcquire = onCall(HOT_CALLABLE_OPTIONS, (request) => (
  handleFirebaseAccountAuthorityLeaseAcquire(
    {
      getPorts: () => createFirebaseLeasePorts(admin.firestore()),
      rolloutEnabled: false,
      trustedInstallationBindingAvailable: false,
    },
    {
      auth: request.auth ?? null,
      app: request.app ?? null,
      data: request.data,
    },
  )
));

export const accountAuthorityLeaseRelease = onCall(HOT_CALLABLE_OPTIONS, (request) => (
  handleFirebaseAccountAuthorityLeaseRelease(
    {
      getPorts: () => createFirebaseLeasePorts(admin.firestore()),
      rolloutEnabled: false,
      trustedInstallationBindingAvailable: false,
    },
    {
      auth: request.auth ?? null,
      app: request.app ?? null,
      data: request.data,
    },
  )
));
