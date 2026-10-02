import {
  sameSessionFence,
  type AccountScope,
  type SessionFence,
} from './account_session';
import { noteSwallowed } from '../../app/swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

export type ScopeJson =
  | null
  | boolean
  | number
  | string
  | readonly ScopeJson[]
  | Readonly<{ [key: string]: ScopeJson }>;

export type ScopeRecord = Readonly<{ key: string; value: ScopeJson }>;

export interface AccountScopeTransaction {
  readRecord(key: string): Promise<ScopeRecord | null>;
  putRecord(record: ScopeRecord): Promise<void>;
  deleteRecord(key: string): Promise<void>;
}

export interface ScopeStorageConnection {
  readRecord(key: string): Promise<ScopeRecord | null>;
  withGuardedTransaction(
    work: (transaction: AccountScopeTransaction) => Promise<void>,
    mayPublishNow: () => boolean,
  ): Promise<void>;
  revoke(): undefined;
  close(): Promise<void>;
}

export type ScopeEraseEvidence = Readonly<{
  scopeKey: `account:${string}`;
  outcome: 'erased' | 'already_absent';
  evidenceKind: 'memory_reference_only' | 'native_manifest';
  erasedRecordCount: number;
  manifestVersion: number | null;
}>;

export interface ScopeStorageAdapter {
  open(scope: AccountScope): Promise<ScopeStorageConnection>;
  eraseClosedAccountScope(
    scope: Extract<AccountScope, { kind: 'account' }>,
  ): Promise<ScopeEraseEvidence>;
}

export interface AccountScopeHandle {
  readonly scope: AccountScope;
  readonly fence: SessionFence;
  readRecord(key: string): Promise<ScopeRecord | null>;
  withTransaction(
    work: (transaction: AccountScopeTransaction) => Promise<void>,
  ): Promise<void>;
}

export type CloseScopeResult = Readonly<{
  outcome: 'closed' | 'already_closed';
  fence: SessionFence;
}>;

export interface AccountScopeStore {
  open(scope: AccountScope, fence: SessionFence): Promise<AccountScopeHandle>;
  close(fence: SessionFence): Promise<CloseScopeResult>;
  eraseClosedAccountScope(
    scope: Extract<AccountScope, { kind: 'account' }>,
  ): Promise<ScopeEraseEvidence>;
}

export type AccountScopeStoreErrorCode =
  | 'account_scope_invalid_input'
  | 'account_scope_stale'
  | 'account_scope_busy'
  | 'account_scope_not_open'
  | 'account_scope_open_failed'
  | 'account_scope_read_failed'
  | 'account_scope_transaction_failed'
  | 'account_scope_close_failed'
  | 'account_scope_transaction_closed'
  | 'account_scope_erase_active'
  | 'account_scope_erase_failed'
  | 'account_scope_erase_proof_invalid';

export class AccountScopeStoreError extends Error {
  readonly code: AccountScopeStoreErrorCode;
  /**
   * Код адаптера, из-за которого упала операция (только безопасная форма кода).
   * зачем (Пакет 6D, хвост 6C P3): клиенту нужно отличить «повтор не поможет»
   * (чужой манифест метки) от временного сбоя, а обёртка стора код терял.
   */
  readonly causeCode: string | null;

  constructor(code: AccountScopeStoreErrorCode, causeCode: string | null = null) {
    super(code);
    this.name = 'AccountScopeStoreError';
    this.code = code;
    this.causeCode = causeCode;
  }
}

function safeCauseCode(error: unknown): string | null {
  const raw = typeof error === 'object' && error !== null && 'code' in error ? (error as { code: unknown }).code : null;
  return typeof raw === 'string' && /^[\w/-]{1,96}$/.test(raw) ? raw : null;
}

type AttemptStatus = 'opening' | 'open' | 'closing' | 'failed_open' | 'failed_close';

type ScopeAttempt = {
  readonly scope: AccountScope;
  readonly fence: SessionFence;
  revision: number;
  status: AttemptStatus;
  adapterOpenPromise: Promise<ScopeStorageConnection> | null;
  openPromise: Promise<AccountScopeHandle> | null;
  closePromise: Promise<CloseScopeResult> | null;
  connection: ScopeStorageConnection | null;
  handle: AccountScopeHandle | null;
  pendingUnexpectedRevokeResult: boolean;
};

class AdapterTransactionOperationFailure extends AccountScopeStoreError {
  constructor() {
    super('account_scope_transaction_failed');
  }
}

function fail(code: AccountScopeStoreErrorCode): never {
  throw new AccountScopeStoreError(code);
}

function assertTrimExact(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    fail('account_scope_invalid_input');
  }
}

function snapshotScope(value: AccountScope): AccountScope {
  if (typeof value !== 'object' || value === null) fail('account_scope_invalid_input');
  if (value.kind === 'guest') {
    const installationId = value.installationId;
    const scopeKey = value.scopeKey;
    assertTrimExact(installationId);
    if (scopeKey !== `guest:${installationId}`) fail('account_scope_invalid_input');
    return Object.freeze({ kind: 'guest', installationId, scopeKey });
  }
  if (value.kind === 'account') {
    const uid = value.uid;
    const scopeKey = value.scopeKey;
    assertTrimExact(uid);
    if (scopeKey !== `account:${uid}`) fail('account_scope_invalid_input');
    return Object.freeze({ kind: 'account', uid, scopeKey });
  }
  return fail('account_scope_invalid_input');
}

function snapshotFence(value: SessionFence, scope?: AccountScope): SessionFence {
  if (typeof value !== 'object' || value === null) fail('account_scope_invalid_input');
  const { scopeKey, uid, generation, nonce } = value;
  assertTrimExact(scopeKey);
  if (uid !== null) assertTrimExact(uid);
  if (uid === null) {
    if (!scopeKey.startsWith('guest:')) fail('account_scope_invalid_input');
    assertTrimExact(scopeKey.slice('guest:'.length));
  } else if (scopeKey !== `account:${uid}`) {
    fail('account_scope_invalid_input');
  }
  if (!Number.isSafeInteger(generation) || generation < 0) fail('account_scope_invalid_input');
  assertTrimExact(nonce);
  if (scope) {
    const expectedUid = scope.kind === 'account' ? scope.uid : null;
    if (scopeKey !== scope.scopeKey || uid !== expectedUid) fail('account_scope_invalid_input');
  }
  return Object.freeze({ scopeKey, uid, generation, nonce });
}

function snapshotKey(value: string): string {
  assertTrimExact(value);
  return value;
}

function cloneJson(value: unknown, ancestors = new Set<object>()): ScopeJson {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('account_scope_invalid_input');
    return value;
  }
  if (typeof value !== 'object') fail('account_scope_invalid_input');
  if (ancestors.has(value)) fail('account_scope_invalid_input');
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) fail('account_scope_invalid_input');
      const descriptors = Object.getOwnPropertyDescriptors(value);
      const result: ScopeJson[] = [];
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) fail('account_scope_invalid_input');
        result.push(cloneJson(descriptor.value, ancestors));
      }
      const allowed = new Set([...Array.from({ length: value.length }, (_, index) => String(index)), 'length']);
      if (Reflect.ownKeys(value).some((key) => typeof key !== 'string' || !allowed.has(key))) {
        fail('account_scope_invalid_input');
      }
      return result;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) fail('account_scope_invalid_input');
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== 'string')) fail('account_scope_invalid_input');
    const result: { [key: string]: ScopeJson } = {};
    for (const key of ownKeys as string[]) {
      const descriptor = descriptors[key];
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) fail('account_scope_invalid_input');
      Object.defineProperty(result, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: cloneJson(descriptor.value, ancestors),
      });
    }
    return result;
  } finally {
    ancestors.delete(value);
  }
}

function deepFreezeJson(value: ScopeJson): ScopeJson {
  if (typeof value === 'object' && value !== null) {
    for (const child of Object.values(value)) deepFreezeJson(child);
    Object.freeze(value);
  }
  return value;
}

function snapshotRecord(value: ScopeRecord): ScopeRecord {
  if (typeof value !== 'object' || value === null) fail('account_scope_invalid_input');
  return { key: snapshotKey(value.key), value: cloneJson(value.value) };
}

function returnedRecord(value: ScopeRecord | null): ScopeRecord | null {
  if (value === null) return null;
  const record = snapshotRecord(value);
  deepFreezeJson(record.value);
  return Object.freeze(record);
}

function frozenClose(outcome: CloseScopeResult['outcome'], fence: SessionFence): CloseScopeResult {
  return Object.freeze({ outcome, fence });
}

function observeUnexpectedRevokeResult(
  value: object | ((...args: never[]) => unknown),
  onSettled: () => void,
): void {
  const observation = new Promise<void>((resolve) => {
    const settle = (): void => resolve();
    try {
      Reflect.apply(Promise.prototype.then, value, [settle, settle]);
      return;
    } catch (swallowedError) {
      // A non-Promise thenable is adopted by an owned Promise below.
      noteSwallowed('account_scope_store:catch_1', swallowedError);
}
    try {
      const adopted = new Promise<unknown>((adopt) => adopt(value));
      void adopted.then(settle, settle);
    } catch {
      settle();
    }
  });
  void observation.then(onSettled, onSettled);
}

function snapshotEraseEvidence(
  value: ScopeEraseEvidence,
  expectedScopeKey: `account:${string}`,
): ScopeEraseEvidence {
  if (typeof value !== 'object' || value === null) fail('account_scope_erase_proof_invalid');
  const { scopeKey, outcome, evidenceKind, erasedRecordCount, manifestVersion } = value;
  if (
    scopeKey !== expectedScopeKey ||
    (outcome !== 'erased' && outcome !== 'already_absent') ||
    (evidenceKind !== 'memory_reference_only' && evidenceKind !== 'native_manifest') ||
    !Number.isSafeInteger(erasedRecordCount) || erasedRecordCount < 0
  ) fail('account_scope_erase_proof_invalid');
  if (
    (evidenceKind === 'memory_reference_only' && manifestVersion !== null) ||
    (evidenceKind === 'native_manifest' && (!Number.isSafeInteger(manifestVersion) || (manifestVersion as number) <= 0))
  ) fail('account_scope_erase_proof_invalid');
  return Object.freeze({ scopeKey, outcome, evidenceKind, erasedRecordCount, manifestVersion });
}

export function createAccountScopeStore(
  adapter: ScopeStorageAdapter,
): AccountScopeStore {
  if (typeof adapter !== 'object' || adapter === null) fail('account_scope_invalid_input');

  let revision = 0;
  let highestAcceptedGeneration = -1;
  let current: ScopeAttempt | null = null;
  let lastClosedFence: SessionFence | null = null;
  const eraseReservations = new Map<`account:${string}`, Promise<ScopeEraseEvidence>>();

  const isHandleCurrent = (attempt: ScopeAttempt, handleRevision: number): boolean =>
    current === attempt && attempt.status === 'open' && attempt.revision === handleRevision;

  const assertHandleCurrent = (attempt: ScopeAttempt, handleRevision: number): void => {
    if (!isHandleCurrent(attempt, handleRevision)) fail('account_scope_stale');
  };

  const makeHandle = (attempt: ScopeAttempt, handleRevision: number): AccountScopeHandle => {
    const readRecord = async (rawKey: string): Promise<ScopeRecord | null> => {
      const key = snapshotKey(rawKey);
      assertHandleCurrent(attempt, handleRevision);
      try {
        const value = await (attempt.connection as ScopeStorageConnection).readRecord(key);
        assertHandleCurrent(attempt, handleRevision);
        return returnedRecord(value);
      } catch {
        if (!isHandleCurrent(attempt, handleRevision)) fail('account_scope_stale');
        fail('account_scope_read_failed');
      }
    };

    const withTransaction = async (
      work: (transaction: AccountScopeTransaction) => Promise<void>,
    ): Promise<void> => {
      if (typeof work !== 'function') fail('account_scope_invalid_input');
      assertHandleCurrent(attempt, handleRevision);
      let callbackRejected = false;
      let callbackError: unknown;
      let adapterOperationFailure: AdapterTransactionOperationFailure | null = null;
      const latchAdapterOperationFailure = (): never => {
        adapterOperationFailure ??= new AdapterTransactionOperationFailure();
        throw adapterOperationFailure;
      };
      try {
        await (attempt.connection as ScopeStorageConnection).withGuardedTransaction(
          async (adapterTransaction) => {
            let live = true;
            const assertLive = (): void => {
              if (!live) fail('account_scope_transaction_closed');
            };
            const transaction: AccountScopeTransaction = {
              async readRecord(rawKey): Promise<ScopeRecord | null> {
                assertLive();
                const key = snapshotKey(rawKey);
                assertHandleCurrent(attempt, handleRevision);
                try {
                  const value = await adapterTransaction.readRecord(key);
                  assertLive();
                  assertHandleCurrent(attempt, handleRevision);
                  return returnedRecord(value);
                } catch {
                  if (!live) fail('account_scope_transaction_closed');
                  if (!isHandleCurrent(attempt, handleRevision)) fail('account_scope_stale');
                  return latchAdapterOperationFailure();
                }
              },
              async putRecord(rawRecord): Promise<void> {
                assertLive();
                const record = snapshotRecord(rawRecord);
                assertHandleCurrent(attempt, handleRevision);
                try {
                  await adapterTransaction.putRecord(record);
                  assertLive();
                  assertHandleCurrent(attempt, handleRevision);
                } catch {
                  if (!live) fail('account_scope_transaction_closed');
                  if (!isHandleCurrent(attempt, handleRevision)) fail('account_scope_stale');
                  return latchAdapterOperationFailure();
                }
              },
              async deleteRecord(rawKey): Promise<void> {
                assertLive();
                const key = snapshotKey(rawKey);
                assertHandleCurrent(attempt, handleRevision);
                try {
                  await adapterTransaction.deleteRecord(key);
                  assertLive();
                  assertHandleCurrent(attempt, handleRevision);
                } catch {
                  if (!live) fail('account_scope_transaction_closed');
                  if (!isHandleCurrent(attempt, handleRevision)) fail('account_scope_stale');
                  return latchAdapterOperationFailure();
                }
              },
            };
            try {
              await work(transaction);
              if (adapterOperationFailure) throw adapterOperationFailure;
            } catch (error) {
              if (adapterOperationFailure) throw adapterOperationFailure;
              callbackRejected = true;
              callbackError = error;
              throw error;
            } finally {
              live = false;
            }
          },
          () => isHandleCurrent(attempt, handleRevision),
        );
        assertHandleCurrent(attempt, handleRevision);
      } catch (error) {
        if (!isHandleCurrent(attempt, handleRevision)) fail('account_scope_stale');
        if (callbackRejected && error === callbackError) throw error;
        fail('account_scope_transaction_failed');
      }
    };

    return Object.freeze({ scope: attempt.scope, fence: attempt.fence, readRecord, withTransaction });
  };

  const beginOpen = (attempt: ScopeAttempt): Promise<AccountScopeHandle> => {
    revision += 1;
    attempt.revision = revision;
    attempt.status = 'opening';
    attempt.connection = null;
    attempt.handle = null;
    attempt.closePromise = null;
    const openRevision = attempt.revision;
    const adapterOpenPromise = Promise.resolve().then(() => adapter.open(attempt.scope));
    attempt.adapterOpenPromise = adapterOpenPromise;
    const openPromise = (async (): Promise<AccountScopeHandle> => {
      try {
        const connection = await adapterOpenPromise;
        if (current !== attempt || attempt.status !== 'opening' || attempt.revision !== openRevision) {
          fail('account_scope_stale');
        }
        attempt.connection = connection;
        attempt.status = 'open';
        const handle = makeHandle(attempt, openRevision);
        attempt.handle = handle;
        return handle;
      } catch {
        if (current !== attempt || attempt.status !== 'opening' || attempt.revision !== openRevision) {
          fail('account_scope_stale');
        }
        attempt.status = 'failed_open';
        attempt.adapterOpenPromise = null;
        fail('account_scope_open_failed');
      }
    })();
    attempt.openPromise = openPromise;
    return openPromise;
  };

  const settleClosed = (
    attempt: ScopeAttempt,
    resolve: (result: CloseScopeResult) => void,
  ): void => {
    current = null;
    attempt.connection = null;
    attempt.adapterOpenPromise = null;
    attempt.closePromise = null;
    attempt.pendingUnexpectedRevokeResult = false;
    lastClosedFence = attempt.fence;
    resolve(frozenClose('closed', attempt.fence));
  };

  const settleCloseFailure = (
    attempt: ScopeAttempt,
    reject: (error: AccountScopeStoreError) => void,
    reason: string,
    cause: unknown = null,
  ): void => {
    attempt.status = 'failed_close';
    attempt.closePromise = null;
    const causeCode = cause === null ? null : safeCauseCode(cause) ?? (cause instanceof Error ? cause.name : typeof cause);
    // зачем (Пакет 6E, логи сначала): на телефоне смена аккаунта упала close_failed без
    // причины. Какая ветка и чем — обязано быть видно (ветка + код адаптера, без данных).
    console.warn(`[ACCOUNT-V2] store close_failed reason=${reason} cause=${causeCode ?? 'none'}`);
    reject(new AccountScopeStoreError('account_scope_close_failed', causeCode));
  };

  const revokeThenClose = (
    attempt: ScopeAttempt,
    connection: ScopeStorageConnection,
    resolve: (result: CloseScopeResult) => void,
    reject: (error: AccountScopeStoreError) => void,
  ): void => {
    attempt.connection = connection;
    let revokeResult: unknown;
    try {
      revokeResult = connection.revoke();
    } catch (error) {
      settleCloseFailure(attempt, reject, 'revoke_threw', error);
      return;
    }
    if (revokeResult !== undefined) {
      if (
        (typeof revokeResult !== 'object' || revokeResult === null) &&
        typeof revokeResult !== 'function'
      ) {
        settleCloseFailure(attempt, reject, `revoke_returned_${typeof revokeResult}`);
        return;
      }
      attempt.pendingUnexpectedRevokeResult = true;
      observeUnexpectedRevokeResult(revokeResult, () => {
        attempt.pendingUnexpectedRevokeResult = false;
      });
      settleCloseFailure(attempt, reject, 'revoke_returned_object');
      return;
    }
    void Promise.resolve()
      .then(() => connection.close())
      .then(
        () => settleClosed(attempt, resolve),
        (error: unknown) => settleCloseFailure(attempt, reject, 'close_rejected', error),
      );
  };

  const closeAttempt = (attempt: ScopeAttempt): Promise<CloseScopeResult> => {
    revision += 1;
    attempt.revision = revision;
    const priorStatus = attempt.status;
    attempt.status = 'closing';
    let resolveClose!: (result: CloseScopeResult) => void;
    let rejectClose!: (error: AccountScopeStoreError) => void;
    const closePromise = new Promise<CloseScopeResult>((resolve, reject) => {
      resolveClose = resolve;
      rejectClose = reject;
    });
    attempt.closePromise = closePromise;
    if (priorStatus === 'opening') {
      const pending = attempt.adapterOpenPromise as Promise<ScopeStorageConnection>;
      void pending.then(
        (connection) => revokeThenClose(attempt, connection, resolveClose, rejectClose),
        () => settleClosed(attempt, resolveClose),
      );
      return closePromise;
    }
    const connection = attempt.connection;
    if (connection === null) {
      settleCloseFailure(attempt, rejectClose, 'no_connection');
      return closePromise;
    }
    revokeThenClose(attempt, connection, resolveClose, rejectClose);
    return closePromise;
  };

  return {
    open(rawScope, rawFence): Promise<AccountScopeHandle> {
      const scope = snapshotScope(rawScope);
      const fence = snapshotFence(rawFence, scope);
      if (scope.kind === 'account' && eraseReservations.has(scope.scopeKey)) {
        return Promise.reject(new AccountScopeStoreError('account_scope_busy'));
      }
      if (current) {
        const exact = sameSessionFence(current.fence, fence) && current.scope.scopeKey === scope.scopeKey;
        if (fence.generation < highestAcceptedGeneration || (fence.generation === highestAcceptedGeneration && !exact)) {
          return Promise.reject(new AccountScopeStoreError('account_scope_stale'));
        }
        if (exact) {
          if (current.status === 'opening') return current.openPromise as Promise<AccountScopeHandle>;
          if (current.status === 'open') return current.openPromise as Promise<AccountScopeHandle>;
          if (current.status === 'failed_open') return beginOpen(current);
          return Promise.reject(new AccountScopeStoreError('account_scope_busy'));
        }
        if (current.status !== 'failed_open') {
          return Promise.reject(new AccountScopeStoreError('account_scope_busy'));
        }
      } else if (fence.generation <= highestAcceptedGeneration) {
        return Promise.reject(new AccountScopeStoreError('account_scope_stale'));
      }
      if (fence.generation <= highestAcceptedGeneration) {
        return Promise.reject(new AccountScopeStoreError('account_scope_stale'));
      }
      highestAcceptedGeneration = fence.generation;
      lastClosedFence = null;
      const attempt: ScopeAttempt = {
        scope,
        fence,
        revision,
        status: 'opening',
        adapterOpenPromise: null,
        openPromise: null,
        closePromise: null,
        connection: null,
        handle: null,
        pendingUnexpectedRevokeResult: false,
      };
      current = attempt;
      return beginOpen(attempt);
    },

    close(rawFence): Promise<CloseScopeResult> {
      const fence = snapshotFence(rawFence);
      if (current && sameSessionFence(current.fence, fence)) {
        if (current.status === 'closing') return current.closePromise as Promise<CloseScopeResult>;
        if (current.pendingUnexpectedRevokeResult) {
          return Promise.reject(new AccountScopeStoreError('account_scope_close_failed'));
        }
        if (current.status === 'failed_close') return closeAttempt(current);
        if (current.status === 'opening' || current.status === 'open') return closeAttempt(current);
        return Promise.reject(new AccountScopeStoreError('account_scope_not_open'));
      }
      if (lastClosedFence && sameSessionFence(lastClosedFence, fence)) {
        return Promise.resolve(frozenClose('already_closed', lastClosedFence));
      }
      if (fence.generation <= highestAcceptedGeneration) {
        return Promise.reject(new AccountScopeStoreError('account_scope_stale'));
      }
      return Promise.reject(new AccountScopeStoreError('account_scope_not_open'));
    },

    eraseClosedAccountScope(rawScope): Promise<ScopeEraseEvidence> {
      const scope = snapshotScope(rawScope);
      if (scope.kind !== 'account') return Promise.reject(new AccountScopeStoreError('account_scope_invalid_input'));
      if (current?.scope.scopeKey === scope.scopeKey && current.status !== 'failed_open') {
        return Promise.reject(new AccountScopeStoreError('account_scope_erase_active'));
      }
      const duplicate = eraseReservations.get(scope.scopeKey);
      if (duplicate) return duplicate;
      let operation: Promise<ScopeEraseEvidence>;
      operation = Promise.resolve()
        .then(() => adapter.eraseClosedAccountScope(scope))
        .then(
          (evidence) => {
            try {
              return snapshotEraseEvidence(evidence, scope.scopeKey);
            } catch {
              fail('account_scope_erase_proof_invalid');
            }
          },
          (error: unknown) => { throw new AccountScopeStoreError('account_scope_erase_failed', safeCauseCode(error)); },
        )
        .finally(() => {
          if (eraseReservations.get(scope.scopeKey) === operation) eraseReservations.delete(scope.scopeKey);
        });
      eraseReservations.set(scope.scopeKey, operation);
      return operation;
    },
  };
}
