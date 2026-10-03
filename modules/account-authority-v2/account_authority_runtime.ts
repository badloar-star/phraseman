import {
  accountAuthorityGeneration,
  freezeAccountAuthorityResult,
  freezeAccountAuthorityState,
  type AccountAuthorityGeneration,
  type AccountAuthorityResult,
  type AccountAuthorityState,
  type PreservedDomain,
} from './account_authority_contract';
import type {
  AccountId,
  DeviceId,
  FirebaseAuthUid,
  OperationId,
  SessionId,
} from './account_authority_ids';
import type {
  AccountAuthorityDestructiveOperationKind,
  AccountAuthorityDestructiveOperationRecord,
  AccountAuthorityLocalScope,
  AccountAuthorityLocalStorePort,
  AccountAuthorityOperationKind,
  AccountAuthorityPreservedWrite,
} from './account_authority_local_store';
import {
  evaluatePreservedDomainCommit,
  initialAccountAuthorityState,
  reduceAccountAuthorityState,
} from './account_authority_reducer';
import {
  accountAuthorityElapsedMs,
  accountAuthorityErrorCode,
  accountAuthorityErrorKind,
  safeAccountAuthorityLogger,
  type AccountAuthorityLogFields,
  type AccountAuthorityLogger,
} from './account_authority_logger';

export type ProviderAuthenticationResult =
  | Readonly<{ type: 'authenticated'; firebaseAuthUid: FirebaseAuthUid }>
  | Readonly<{ type: 'cancelled' }>
  | Readonly<{ type: 'failed'; error: unknown; identityPreserved: boolean }>;

export interface AccountAuthorityProviderPort {
  authenticate(request: Readonly<{ operationId: OperationId }>): Promise<ProviderAuthenticationResult>;
  currentIdentity(): Promise<FirebaseAuthUid | null>;
  signOut(request: Readonly<{ operationId: OperationId }>): Promise<void>;
}

export type AccountAuthorityLease = Readonly<{
  accountId: AccountId;
  sessionId: SessionId;
}>;

export interface AccountAuthorityLeasePort {
  acquire(request: Readonly<{
    firebaseAuthUid: FirebaseAuthUid;
    deviceId: DeviceId;
    operationId: OperationId;
  }>): Promise<AccountAuthorityLease>;
  release(request: Readonly<{
    accountId: AccountId;
    sessionId: SessionId;
    deviceId: DeviceId;
    operationId: OperationId;
  }>): Promise<void>;
  deleteAccount(request: Readonly<{
    accountId: AccountId;
    sessionId: SessionId;
    deviceId: DeviceId;
    operationId: OperationId;
  }>): Promise<void>;
}

export type LeaseRevokedNotification = Readonly<{
  operationId: OperationId;
  revokedSessionId: SessionId;
  expectedGeneration: AccountAuthorityGeneration;
}>;

export interface AccountAuthorityRuntime {
  getState(): AccountAuthorityState;
  signIn(operationId: OperationId): Promise<AccountAuthorityResult>;
  resume(operationId: OperationId): Promise<AccountAuthorityResult>;
  signOut(operationId: OperationId): Promise<AccountAuthorityResult>;
  deleteAccount(operationId: OperationId): Promise<AccountAuthorityResult>;
  handleLeaseRevoked(notification: LeaseRevokedNotification): Promise<AccountAuthorityResult | undefined>;
  capturePreservedWrite(input: Readonly<{
    operationId: OperationId;
    domain: PreservedDomain;
  }>): AccountAuthorityPreservedWrite;
  commitPreservedWrite(write: AccountAuthorityPreservedWrite): Promise<AccountAuthorityResult>;
}

type OwnedSession = AccountAuthorityLocalScope;
type LocalTransitionResult = Extract<
  AccountAuthorityResult,
  { type: 'signed_out' } | { type: 'local_deleted' }
>;
type PendingLocalTransition = Readonly<{
  owner: OwnedSession | null;
  ownerCaptured: boolean;
  expectedGeneration: AccountAuthorityGeneration;
  result: LocalTransitionResult;
}>;
type PendingRevocation = Readonly<{
  owner: OwnedSession;
  result: Extract<AccountAuthorityResult, { type: 'device_taken_over' }>;
}>;
type OperationKind = AccountAuthorityOperationKind;
type DestructiveOperationKind = AccountAuthorityDestructiveOperationKind;
type OperationRecord = Readonly<{ kind: OperationKind; promise: Promise<unknown> }>;
type QueueItem = Readonly<{
  run: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}>;

const MAX_COMPLETED_OPERATION_RECEIPTS = 256;
const MAX_PENDING_DESTRUCTIVE_OPERATIONS = 256;

function sameScope(left: AccountAuthorityLocalScope, right: AccountAuthorityLocalScope): boolean {
  return left.accountId.value === right.accountId.value
    && left.sessionId.value === right.sessionId.value
    && left.generation.value === right.generation.value;
}

function ownedSession(state: AccountAuthorityState): OwnedSession | null {
  if (state.phase === 'authenticated' || state.phase === 'deleting') {
    return Object.freeze({
      accountId: state.accountId, sessionId: state.sessionId, generation: state.generation,
    });
  }
  if (state.phase === 'authenticating' && state.previousAccountId && state.previousSessionId) {
    return Object.freeze({
      accountId: state.previousAccountId,
      sessionId: state.previousSessionId,
      generation: state.generation,
    });
  }
  return null;
}

function stateOwnsSession(state: AccountAuthorityState, owner: OwnedSession): boolean {
  const current = ownedSession(state);
  return current !== null && sameScope(current, owner);
}

function sameOwner(left: OwnedSession, right: OwnedSession): boolean {
  return left.accountId.value === right.accountId.value
    && left.sessionId.value === right.sessionId.value;
}

function ownerFingerprint(owner: OwnedSession | null, generation: AccountAuthorityGeneration): string {
  return JSON.stringify([
    owner?.accountId.value ?? null,
    owner?.sessionId.value ?? null,
    generation.value,
  ]);
}

function revocationFingerprint(notification: LeaseRevokedNotification): string {
  return JSON.stringify([
    notification.revokedSessionId.value,
    notification.expectedGeneration.value,
  ]);
}

function destructiveRecordOwner(
  record: AccountAuthorityDestructiveOperationRecord,
): OwnedSession | null {
  if (record.owner === null) return null;
  return Object.freeze({ ...record.owner, generation: record.expectedGeneration });
}

function sameReservedOwner(
  left: OwnedSession | null,
  right: OwnedSession | null,
): boolean {
  if (left === null || right === null) return left === right;
  return sameScope(left, right);
}

// Поля ошибки (вид и безопасный код) плюс явные дополнительные поля. Слияние
// здесь, а не разворотом в аргументах лога: сторож запрещает `...x` в логах.
function errorFields(error: unknown, extra: AccountAuthorityLogFields = {}): AccountAuthorityLogFields {
  return Object.freeze({
    ...extra,
    errorKind: accountAuthorityErrorKind(error),
    code: accountAuthorityErrorCode(error),
  });
}

async function settleCleanupTasks(tasks: readonly (() => void | Promise<void>)[]): Promise<void> {
  const results = await Promise.allSettled(tasks.map((task) => Promise.resolve().then(task)));
  const failure = results.find((result) => result.status === 'rejected');
  if (failure?.status === 'rejected') throw failure.reason;
}

async function settleRemoteCleanupAfterLocalClose(
  log: AccountAuthorityLogger,
  closeLocal: () => void | Promise<void>,
  remoteTasks: readonly (() => void | Promise<void>)[],
): Promise<void> {
  let localFailure: unknown;
  try {
    await closeLocal();
  } catch (error) {
    // зачем (AA S1): локальное закрытие области упало — сеть всё равно чистим,
    // а причина видна в логе ещё до того, как ошибку пробросит наружу.
    log.warn('cleanup local_close_failed', errorFields(error));
    localFailure = error;
  }
  let remoteFailure: unknown;
  try {
    await settleCleanupTasks(remoteTasks);
  } catch (error) {
    log.warn('cleanup remote_failed', errorFields(error));
    remoteFailure = error;
  }
  if (localFailure !== undefined) throw localFailure;
  if (remoteFailure !== undefined) throw remoteFailure;
}

function resultTypeOf(value: unknown): string {
  if (value === undefined) return 'none';
  if (typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string') {
    return (value as { type: string }).type;
  }
  return typeof value;
}

class FifoAccountAuthorityRuntime implements AccountAuthorityRuntime {
  private state: AccountAuthorityState;
  private readonly deviceId: DeviceId;
  private readonly provider: AccountAuthorityProviderPort;
  private readonly lease: AccountAuthorityLeasePort;
  private readonly localStore: AccountAuthorityLocalStorePort;
  private readonly queue: QueueItem[] = [];
  private running = false;
  private readonly activeOperations = new Map<string, OperationRecord>();
  private readonly completedOperations = new Map<string, OperationRecord>();
  private readonly destructiveAdmissions = new Set<string>();
  private readonly pendingSignOuts = new Map<string, PendingLocalTransition>();
  private readonly pendingDeletes = new Map<string, PendingLocalTransition & { owner: OwnedSession }>();
  private readonly pendingRevocations = new Map<string, PendingRevocation>();
  private readonly log: AccountAuthorityLogger;

  constructor(input: Readonly<{
    deviceId: DeviceId;
    provider: AccountAuthorityProviderPort;
    lease: AccountAuthorityLeasePort;
    localStore: AccountAuthorityLocalStorePort;
    logger?: AccountAuthorityLogger;
  }>) {
    this.deviceId = input.deviceId;
    this.provider = input.provider;
    this.lease = input.lease;
    this.localStore = input.localStore;
    this.log = safeAccountAuthorityLogger(input.logger);
    const initialState = initialAccountAuthorityState(input.deviceId);
    this.state = freezeAccountAuthorityState({
      ...initialState,
      generation: this.localStore.getAuthorityGeneration(),
    });
    this.log.info('runtime created', { phase: this.state.phase, generation: this.state.generation.value });
  }

  /** зачем (AA S1): ранний отказ до очереди — с причиной в логе, не немой reject. */
  private rejectLogged<T>(event: string, error: unknown): Promise<T> {
    this.log.warn(event, errorFields(error));
    return Promise.reject(error);
  }

  getState(): AccountAuthorityState {
    return this.state;
  }

  signIn(operationId: OperationId): Promise<AccountAuthorityResult> {
    return this.runOperation('sign_in', operationId, async () => {
      this.beginAuthentication(operationId);
      const previousOwner = ownedSession(this.state);
      let providerResult: ProviderAuthenticationResult;
      try {
        providerResult = await this.provider.authenticate({ operationId });
      } catch (error) {
        this.log.warn('sign_in provider_threw', errorFields(error));
        return this.failClosedAuthentication({ error, operationId, previousOwner });
      }
      this.log.info('sign_in provider_result', {
        type: providerResult.type,
        hadPreviousOwner: previousOwner !== null,
        identityPreserved: providerResult.type === 'failed' ? providerResult.identityPreserved : null,
      });
      if (providerResult.type === 'cancelled') return this.cancelAuthentication(operationId);
      if (providerResult.type === 'failed') {
        if (providerResult.identityPreserved) {
          this.restoreAuthenticationAfterProviderFailure(operationId);
          this.log.warn('sign_in provider_failed_identity_preserved', errorFields(providerResult.error));
          throw providerResult.error;
        }
        return this.failClosedAuthentication({
          error: providerResult.error,
          operationId,
          previousOwner,
        });
      }
      return this.establishLease(providerResult.firebaseAuthUid, operationId);
    });
  }

  resume(operationId: OperationId): Promise<AccountAuthorityResult> {
    return this.runOperation('resume', operationId, async () => {
      this.beginAuthentication(operationId);
      const previousOwner = ownedSession(this.state);
      let firebaseAuthUid: FirebaseAuthUid | null;
      try {
        firebaseAuthUid = await this.provider.currentIdentity();
      } catch (error) {
        this.log.warn('resume current_identity_threw', errorFields(error));
        return this.failClosedAuthentication({ error, operationId, previousOwner });
      }
      this.log.info('resume current_identity', { present: firebaseAuthUid !== null });
      if (firebaseAuthUid === null) return this.cancelAuthentication(operationId);
      return this.establishLease(firebaseAuthUid, operationId);
    });
  }

  signOut(operationId: OperationId): Promise<AccountAuthorityResult> {
    const reserved = this.pendingSignOuts.get(operationId.value);
    let permanent: AccountAuthorityDestructiveOperationRecord | null;
    try {
      permanent = this.localStore.getDestructiveOperation(operationId);
    } catch (error) {
      return this.rejectLogged('sign_out read_destructive_failed', error);
    }
    this.log.info('sign_out requested', {
      phase: this.state.phase,
      reserved: reserved !== undefined,
      permanentStage: permanent?.kind === 'sign_out' ? permanent.stage : 'none',
      hasReceipt: permanent?.receipt !== undefined && permanent?.receipt !== null,
    });
    if (permanent?.kind === 'sign_out' && !permanent.receipt && permanent.stage === 'deferred_owner') {
      if (permanent.owner !== null) {
        return this.rejectLogged(
          'sign_out deferred_owner_retry_rejected',
          new Error('account_authority_destructive_retry_requires_recovery'),
        );
      }
      const rehydratedOwner = this.state.phase === 'authenticated' ? ownedSession(this.state) : null;
      if (rehydratedOwner === null) {
        return this.rejectLogged(
          'sign_out deferred_owner_retry_rejected',
          new Error('account_authority_destructive_retry_requires_rehydration'),
        );
      }
      try {
        this.localStore.bindDeferredDestructiveOperation(
          operationId,
          'sign_out',
          ownerFingerprint(rehydratedOwner, rehydratedOwner.generation),
          rehydratedOwner,
          rehydratedOwner.generation,
        );
        permanent = this.localStore.getDestructiveOperation(operationId);
        this.log.info('sign_out deferred_owner_bound', { generation: rehydratedOwner.generation.value });
      } catch (error) {
        return this.rejectLogged('sign_out deferred_owner_bind_failed', error);
      }
    }
    const visibleOwner = this.state.phase === 'authenticating' ? null : ownedSession(this.state);
    const reservationOwner = reserved
      ? reserved.owner
      : permanent?.kind === 'sign_out'
        ? destructiveRecordOwner(permanent)
        : visibleOwner;
    const reservationGeneration = reserved?.expectedGeneration
      ?? (permanent?.kind === 'sign_out' ? permanent.expectedGeneration : this.state.generation);
    const fingerprint = reserved
      ? ownerFingerprint(reserved.owner, reserved.expectedGeneration)
      : permanent?.kind === 'sign_out'
        ? permanent.fingerprint
        : ownerFingerprint(visibleOwner, this.state.generation);
    return this.runOperation('sign_out', operationId, async () => {
      const key = operationId.value;
      let pending = this.pendingSignOuts.get(key);
      if (!pending) throw new Error('account_authority_sign_out_pending_missing');
      if (!pending.ownerCaptured) {
        const owner = ownedSession(this.state);
        const expectedGeneration = this.state.generation;
        const result = freezeAccountAuthorityResult({
          type: 'signed_out',
          generation: accountAuthorityGeneration(expectedGeneration.value + 1),
        });
        if (result.type !== 'signed_out') throw new Error('account_authority_sign_out_result_missing');
        pending = Object.freeze({
          owner,
          ownerCaptured: true,
          expectedGeneration,
          result,
        });
        this.admitPending(this.pendingSignOuts, key, pending);
        const capturedFingerprint = ownerFingerprint(pending.owner, pending.expectedGeneration);
        if (pending.owner === null) {
          this.localStore.markDestructiveOperationLocalApplied(
            operationId,
            'sign_out',
            capturedFingerprint,
          );
        } else {
          this.localStore.bindDeferredDestructiveOperation(
            operationId,
            'sign_out',
            capturedFingerprint,
            pending.owner,
            pending.expectedGeneration,
          );
        }
      }
      if (
        this.state.generation.value === pending.expectedGeneration.value
        && (pending.owner === null || stateOwnsSession(this.state, pending.owner))
      ) {
        const reduction = reduceAccountAuthorityState(this.state, { type: 'signed_out' });
        this.commitState(reduction.state);
      } else if (
        this.state.generation.value === pending.result.generation.value
        && ownedSession(this.state) === null
      ) {
        this.commitState(freezeAccountAuthorityState({
          phase: 'signed_out', deviceId: this.deviceId, generation: pending.result.generation,
        }));
      }
      await settleRemoteCleanupAfterLocalClose(this.log,
        () => this.closeOwnedScope(pending.owner),
        [
        () => (
          ownedSession(this.state) === null
          && this.state.generation.value === pending.result.generation.value
            ? this.provider.signOut({ operationId })
            : undefined
        ),
        () => (
          pending.owner
            ? this.lease.release({ ...pending.owner, deviceId: this.deviceId, operationId })
            : undefined
        ),
        ],
      );
      return pending.result;
    }, () => {
      if (this.pendingSignOuts.has(operationId.value)) return;
      if (permanent?.kind === 'sign_out' && !permanent.receipt) {
        const owner = destructiveRecordOwner(permanent);
        const result = freezeAccountAuthorityResult({
          type: 'signed_out',
          generation: accountAuthorityGeneration(permanent.expectedGeneration.value + 1),
        });
        if (result.type !== 'signed_out') throw new Error('account_authority_sign_out_result_missing');
        this.admitPending(this.pendingSignOuts, operationId.value, Object.freeze({
          owner,
          ownerCaptured: true,
          expectedGeneration: permanent.expectedGeneration,
          result,
        }));
        this.localStore.markDestructiveOperationLocalApplied(
          operationId, 'sign_out', permanent.fingerprint,
        );
        return;
      }
      const followsActiveAuthentication = this.state.phase === 'authenticating';
      const owner = followsActiveAuthentication ? null : ownedSession(this.state);
      const expectedGeneration = this.state.generation;
      const result = freezeAccountAuthorityResult({
        type: 'signed_out',
        generation: accountAuthorityGeneration(expectedGeneration.value + 1),
      });
      if (result.type !== 'signed_out') throw new Error('account_authority_sign_out_result_missing');
      this.admitPending(this.pendingSignOuts, operationId.value, Object.freeze({
        owner,
        ownerCaptured: !followsActiveAuthentication,
        expectedGeneration,
        result,
      }));
      if (!followsActiveAuthentication) {
        this.localStore.markDestructiveOperationLocalApplied(operationId, 'sign_out', fingerprint);
      }
    }, {
      fingerprint,
      owner: reservationOwner,
      expectedGeneration: reservationGeneration,
      reservationStage: permanent === null && reserved === undefined && this.state.phase === 'authenticating'
        ? 'deferred_owner'
        : 'reserved',
      onSettled: () => this.pendingSignOuts.delete(operationId.value),
    });
  }

  deleteAccount(operationId: OperationId): Promise<AccountAuthorityResult> {
    const reserved = this.pendingDeletes.get(operationId.value);
    let permanent: AccountAuthorityDestructiveOperationRecord | null;
    try {
      permanent = this.localStore.getDestructiveOperation(operationId);
    } catch (error) {
      return this.rejectLogged('delete read_destructive_failed', error);
    }
    this.log.info('delete requested', {
      phase: this.state.phase,
      reserved: reserved !== undefined,
      permanentStage: permanent?.kind === 'delete' ? permanent.stage : 'none',
    });
    const visibleOwner = ownedSession(this.state);
    const reservationOwner = reserved?.owner
      ?? (permanent?.kind === 'delete' ? destructiveRecordOwner(permanent) : visibleOwner);
    const reservationGeneration = reserved?.expectedGeneration
      ?? (permanent?.kind === 'delete' ? permanent.expectedGeneration : this.state.generation);
    const fingerprint = reserved
      ? ownerFingerprint(reserved.owner, reserved.expectedGeneration)
      : permanent?.kind === 'delete'
        ? permanent.fingerprint
        : ownerFingerprint(visibleOwner, this.state.generation);
    return this.runOperation('delete', operationId, async () => {
      const key = operationId.value;
      const pending = this.pendingDeletes.get(key);
      if (!pending) throw new Error('account_authority_delete_pending_missing');
      if (
        this.state.generation.value === pending.expectedGeneration.value
        && stateOwnsSession(this.state, pending.owner)
      ) {
        const reduction = reduceAccountAuthorityState(this.state, { type: 'local_deleted' });
        this.commitState(reduction.state);
      } else if (
        this.state.generation.value === pending.result.generation.value
        && ownedSession(this.state) === null
      ) {
        this.commitState(freezeAccountAuthorityState({
          phase: 'signed_out', deviceId: this.deviceId, generation: pending.result.generation,
        }));
      }
      await settleRemoteCleanupAfterLocalClose(this.log,
        () => this.closeOwnedScope(pending.owner),
        [
        () => (
          ownedSession(this.state) === null
          && this.state.generation.value === pending.result.generation.value
            ? this.provider.signOut({ operationId })
            : undefined
        ),
        () => this.lease.deleteAccount({
          ...pending.owner, deviceId: this.deviceId, operationId,
        }),
        ],
      );
      return pending.result;
    }, () => {
      if (this.pendingDeletes.has(operationId.value)) return;
      if (permanent?.kind === 'delete' && !permanent.receipt) {
        const owner = destructiveRecordOwner(permanent);
        if (!owner) throw new Error('account_authority_destructive_retry_requires_recovery');
        if (permanent.stage === 'reserved') this.localStore.clearAccountData(owner.accountId);
        const result = freezeAccountAuthorityResult({
          type: 'local_deleted',
          generation: accountAuthorityGeneration(permanent.expectedGeneration.value + 1),
        });
        if (result.type !== 'local_deleted') throw new Error('account_authority_delete_result_missing');
        this.admitPending(this.pendingDeletes, operationId.value, Object.freeze({
          owner,
          ownerCaptured: true,
          expectedGeneration: permanent.expectedGeneration,
          result,
        }));
        this.localStore.markDestructiveOperationLocalApplied(
          operationId, 'delete', permanent.fingerprint,
        );
        return;
      }
      const owner = ownedSession(this.state);
      if (!owner) throw new Error('account_authority_not_authenticated');
      // Capture and clear the visible owner before enqueueing behind any in-flight transition.
      this.localStore.clearAccountData(owner.accountId);
      const result = freezeAccountAuthorityResult({
        type: 'local_deleted',
        generation: accountAuthorityGeneration(owner.generation.value + 1),
      });
      if (result.type !== 'local_deleted') throw new Error('account_authority_delete_result_missing');
      this.admitPending(this.pendingDeletes, operationId.value, Object.freeze({
        owner,
        ownerCaptured: true,
        expectedGeneration: owner.generation,
        result,
      }));
      this.localStore.markDestructiveOperationLocalApplied(operationId, 'delete', fingerprint);
    }, {
      fingerprint,
      owner: reservationOwner,
      expectedGeneration: reservationGeneration,
      reservationStage: 'reserved',
      onSettled: () => this.pendingDeletes.delete(operationId.value),
    });
  }

  handleLeaseRevoked(
    notification: LeaseRevokedNotification,
  ): Promise<AccountAuthorityResult | undefined> {
    const reserved = this.pendingRevocations.get(notification.operationId.value);
    let permanent: AccountAuthorityDestructiveOperationRecord | null;
    try {
      permanent = this.localStore.getDestructiveOperation(notification.operationId);
    } catch (error) {
      return this.rejectLogged('revoke read_destructive_failed', error);
    }
    this.log.info('revoke notified', {
      phase: this.state.phase,
      reserved: reserved !== undefined,
      expectedGeneration: notification.expectedGeneration.value,
      permanentStage: permanent?.kind === 'revoke' ? permanent.stage : 'none',
    });
    const visibleOwner = ownedSession(this.state);
    const reservationOwner = reserved?.owner
      ?? (permanent?.kind === 'revoke' ? destructiveRecordOwner(permanent) : visibleOwner);
    const reservationGeneration = reserved?.owner.generation
      ?? (permanent?.kind === 'revoke'
        ? permanent.expectedGeneration
        : notification.expectedGeneration);
    const fingerprint = revocationFingerprint(notification);
    return this.runOperation('revoke', notification.operationId, async () => {
      const key = notification.operationId.value;
      let pending = this.pendingRevocations.get(key);
      if (!pending) {
        const owner = ownedSession(this.state);
        const reduction = reduceAccountAuthorityState(this.state, {
          type: 'device_taken_over',
          revokedSessionId: notification.revokedSessionId,
          expectedGeneration: notification.expectedGeneration,
        });
        if (!reduction.result) {
          this.log.info('revoke ignored', { reason: 'reducer_no_result', phase: this.state.phase });
          return undefined;
        }
        if (!owner || reduction.result.type !== 'device_taken_over') {
          this.log.warn('revoke owner_missing', { hasOwner: owner !== null, resultType: reduction.result.type });
          throw new Error('account_authority_revocation_owner_missing');
        }
        this.commitState(reduction.state);
        pending = Object.freeze({ owner, result: reduction.result });
        this.admitPending(this.pendingRevocations, key, pending);
        this.localStore.markDestructiveOperationLocalApplied(
          notification.operationId,
          'revoke',
          fingerprint,
        );
      } else if (
        this.state.generation.value === pending.result.generation.value
        && ownedSession(this.state) === null
      ) {
        this.commitState(freezeAccountAuthorityState({
          phase: 'device_taken_over',
          deviceId: this.deviceId,
          generation: pending.result.generation,
        }));
      }
      await settleRemoteCleanupAfterLocalClose(this.log,
        () => this.closeOwnedScope(pending.owner),
        [
        () => (
          ownedSession(this.state) === null
          && this.state.generation.value === pending.result.generation.value
            ? this.provider.signOut({ operationId: notification.operationId })
            : undefined
        ),
        ],
      );
      return pending.result;
    }, () => {
      if (this.pendingRevocations.has(notification.operationId.value)) return;
      if (permanent?.kind !== 'revoke' || permanent.receipt) return;
      const owner = destructiveRecordOwner(permanent);
      if (!owner) throw new Error('account_authority_destructive_retry_requires_recovery');
      const result = freezeAccountAuthorityResult({
        type: 'device_taken_over',
        generation: accountAuthorityGeneration(permanent.expectedGeneration.value + 1),
      });
      if (result.type !== 'device_taken_over') {
        throw new Error('account_authority_revocation_result_missing');
      }
      this.admitPending(this.pendingRevocations, notification.operationId.value, Object.freeze({
        owner,
        result,
      }));
      this.localStore.markDestructiveOperationLocalApplied(
        notification.operationId,
        'revoke',
        permanent.fingerprint,
      );
    }, {
      fingerprint,
      owner: reservationOwner,
      expectedGeneration: reservationGeneration,
      reservationStage: 'reserved',
      onSettled: () => this.pendingRevocations.delete(notification.operationId.value),
    });
  }

  capturePreservedWrite(input: Readonly<{
    operationId: OperationId;
    domain: PreservedDomain;
  }>): AccountAuthorityPreservedWrite {
    if (this.state.phase !== 'authenticated') throw new Error('account_authority_not_authenticated');
    return Object.freeze({
      operationId: input.operationId,
      accountId: this.state.accountId,
      sessionId: this.state.sessionId,
      expectedGeneration: this.state.generation,
      domain: input.domain,
    });
  }

  commitPreservedWrite(write: AccountAuthorityPreservedWrite): Promise<AccountAuthorityResult> {
    return this.runOperation('commit', write.operationId, async () => {
      const result = evaluatePreservedDomainCommit(this.state, {
        type: 'commit_preserved_domain',
        ...write,
      });
      if (result.type !== 'committed') return result;
      await this.localStore.commitPreservedWrite(write);
      return result;
    });
  }

  // зачем (AA S1): reducer чистый и не логирует — переход пишет его драйвер
  // здесь, в единственной точке фиксации состояния (фаза и поколение, без id).
  private commitState(state: AccountAuthorityState): void {
    const from = this.state;
    const durableGeneration = this.localStore.advanceAuthorityGeneration(state.generation);
    this.state = durableGeneration.value === state.generation.value
      ? state
      : freezeAccountAuthorityState({ ...state, generation: durableGeneration });
    if (from.phase !== this.state.phase || from.generation.value !== this.state.generation.value) {
      this.log.info('state transition', {
        from: from.phase,
        to: this.state.phase,
        fromGeneration: from.generation.value,
        toGeneration: this.state.generation.value,
        durableAhead: durableGeneration.value !== state.generation.value,
      });
    }
  }

  private beginAuthentication(operationId: OperationId): void {
    this.commitState(reduceAccountAuthorityState(this.state, {
      type: 'authentication_started', attemptId: operationId,
    }).state);
  }

  private cancelAuthentication(operationId: OperationId): AccountAuthorityResult {
    const reduction = reduceAccountAuthorityState(this.state, {
      type: 'provider_cancelled', attemptId: operationId,
    });
    this.commitState(reduction.state);
    if (!reduction.result) {
      this.log.warn('authentication cancel_result_missing', { phase: this.state.phase });
      throw new Error('account_authority_cancellation_result_missing');
    }
    this.log.info('authentication cancelled', { resultType: reduction.result.type });
    return reduction.result;
  }

  private restoreAuthenticationAfterProviderFailure(operationId: OperationId): void {
    const reduction = reduceAccountAuthorityState(this.state, {
      type: 'provider_cancelled', attemptId: operationId,
    });
    this.commitState(reduction.state);
  }

  private async establishLease(
    firebaseAuthUid: FirebaseAuthUid,
    operationId: OperationId,
  ): Promise<AccountAuthorityResult> {
    if (this.state.phase !== 'authenticating') {
      this.log.warn('lease establish_rejected', { reason: 'attempt_not_active', phase: this.state.phase });
      throw new Error('account_authority_attempt_not_active');
    }
    const expectedGeneration = this.state.generation;
    const previousOwner = ownedSession(this.state);
    let authorityLease: AccountAuthorityLease;
    try {
      authorityLease = await this.lease.acquire({
        firebaseAuthUid,
        deviceId: this.deviceId,
        operationId,
      });
    } catch (error) {
      this.log.warn('lease establish_acquire_failed', errorFields(error));
      return this.failClosedAuthentication({ error, operationId, previousOwner });
    }
    const reduction = reduceAccountAuthorityState(this.state, {
      type: 'authenticated',
      ...authorityLease,
      expectedGeneration,
      expectedAttemptId: operationId,
    });
    if (!reduction.result || reduction.result.type !== 'authenticated') {
      this.log.warn('lease establish_result_missing', { resultType: reduction.result?.type ?? 'none' });
      throw new Error('account_authority_authentication_result_missing');
    }
    const targetScope: AccountAuthorityLocalScope = Object.freeze({
      ...authorityLease,
      generation: reduction.result.generation,
    });
    try {
      const durableGeneration = this.localStore.advanceAuthorityGeneration(targetScope.generation);
      if (durableGeneration.value > targetScope.generation.value) {
        this.log.warn('lease establish_generation_regression', {
          durable: durableGeneration.value,
          target: targetScope.generation.value,
        });
        throw new Error('account_authority_generation_regression');
      }
      const openScope = this.localStore.getOpenScope();
      if (
        openScope !== null
        && sameOwner(openScope, targetScope)
        && openScope.generation.value > targetScope.generation.value
      ) {
        this.log.warn('lease establish_open_scope_ahead', {
          open: openScope.generation.value,
          target: targetScope.generation.value,
        });
        throw new Error('account_authority_generation_regression');
      }
      const scopeAction = openScope === null
        ? 'open'
        : sameScope(openScope, targetScope) ? 'keep' : 'switch';
      this.log.info('lease establish_scope', {
        action: scopeAction,
        previousOwner: previousOwner === null ? 'none' : sameOwner(previousOwner, targetScope) ? 'same' : 'other',
      });
      if (openScope === null) {
        await this.localStore.openScope(targetScope);
      } else if (!sameScope(openScope, targetScope)) {
        await this.localStore.closeScope(openScope);
        await this.localStore.openScope(targetScope);
      }
      this.commitState(reduction.state);
      if (previousOwner !== null && !sameOwner(previousOwner, targetScope)) {
        this.log.info('lease establish_release_previous');
        await this.lease.release({
          accountId: previousOwner.accountId,
          sessionId: previousOwner.sessionId,
          deviceId: this.deviceId,
          operationId,
        });
      }
    } catch (error) {
      this.log.warn('lease establish_local_failed', errorFields(error));
      return this.failClosedAuthentication({
        error,
        operationId,
        previousOwner,
        acquiredOwner: targetScope,
      });
    }
    this.log.info('lease established', { generation: reduction.result.generation.value });
    return reduction.result;
  }

  private async failClosedAuthentication(input: Readonly<{
    error: unknown;
    operationId: OperationId;
    previousOwner: OwnedSession | null;
    acquiredOwner?: OwnedSession;
  }>): Promise<never> {
    this.log.warn('authentication fail_closed', errorFields(input.error, {
      hadPreviousOwner: input.previousOwner !== null,
      hadAcquiredOwner: input.acquiredOwner !== undefined,
    }));
    const signedOutState = reduceAccountAuthorityState(this.state, { type: 'signed_out' }).state;
    let persistenceFailure: unknown;
    try {
      this.commitState(signedOutState);
    } catch (error) {
      this.log.warn('authentication fail_closed_persist_failed', errorFields(error));
      persistenceFailure = error;
      this.state = signedOutState;
    }
    const cleanupTasks: (() => void | Promise<void>)[] = [
      () => this.provider.signOut({ operationId: input.operationId }),
    ];
    const acquiredOwner = input.acquiredOwner;
    if (acquiredOwner) {
      cleanupTasks.push(() => this.lease.release({
        accountId: acquiredOwner.accountId,
        sessionId: acquiredOwner.sessionId,
        deviceId: this.deviceId,
        operationId: input.operationId,
      }));
    }
    const previousOwner = input.previousOwner;
    if (previousOwner !== null && (!acquiredOwner || !sameOwner(previousOwner, acquiredOwner))) {
      cleanupTasks.push(() => this.lease.release({
        accountId: previousOwner.accountId,
        sessionId: previousOwner.sessionId,
        deviceId: this.deviceId,
        operationId: input.operationId,
      }));
    }
    let cleanupFailure: unknown;
    try {
      await settleRemoteCleanupAfterLocalClose(this.log,
        () => this.closeFailedAuthenticationScope(input.previousOwner, input.acquiredOwner),
        cleanupTasks,
      );
    } catch (error) {
      this.log.warn('authentication fail_closed_cleanup_failed', errorFields(error));
      cleanupFailure = error;
    }
    if (persistenceFailure !== undefined) throw persistenceFailure;
    if (cleanupFailure !== undefined) throw cleanupFailure;
    throw input.error;
  }

  private async closeFailedAuthenticationScope(
    previousOwner: OwnedSession | null,
    acquiredOwner?: OwnedSession,
  ): Promise<void> {
    try {
      const partiallyOpenScope = this.localStore.getOpenScope();
      if (partiallyOpenScope !== null) await this.localStore.closeScope(partiallyOpenScope);
      return;
    } catch (inspectionError) {
      this.log.warn('authentication failed_scope_inspection_failed', errorFields(inspectionError));
      const possibleOwners = [acquiredOwner, previousOwner].filter(
        (owner): owner is OwnedSession => owner !== undefined && owner !== null,
      );
      const uniqueOwners = possibleOwners.filter((owner, index) => (
        possibleOwners.findIndex((candidate) => sameOwner(candidate, owner)) === index
      ));
      await Promise.allSettled(uniqueOwners.map((owner) => (
        Promise.resolve().then(() => this.localStore.closeScope(owner))
      )));
      throw inspectionError;
    }
  }

  private async closeOwnedScope(owner: OwnedSession | null): Promise<void> {
    let openScope: AccountAuthorityLocalScope | null;
    try {
      openScope = this.localStore.getOpenScope();
    } catch (error) {
      this.log.warn('scope close_inspection_failed', errorFields(error, { hasOwner: owner !== null }));
      if (owner !== null) await this.localStore.closeScope(owner);
      throw error;
    }
    if (owner !== null && openScope !== null && sameScope(openScope, owner)) {
      await this.localStore.closeScope(openScope);
    }
  }

  private runOperation<T>(
    kind: OperationKind,
    operationId: OperationId,
    task: () => Promise<T>,
    prepare?: () => void,
    destructive?: Readonly<{
      fingerprint: string;
      owner: OwnedSession | null;
      expectedGeneration: AccountAuthorityGeneration;
      reservationStage: 'deferred_owner' | 'reserved';
      onSettled?: () => void;
    }>,
  ): Promise<T> {
    const key = operationId.value;
    let reservedKind: AccountAuthorityOperationKind | null;
    let destructiveRecord: AccountAuthorityDestructiveOperationRecord | null;
    try {
      reservedKind = this.localStore.getOperationKind(operationId);
      destructiveRecord = this.localStore.getDestructiveOperation(operationId);
      if (reservedKind && reservedKind !== kind) {
        return this.rejectLogged(
          `operation ${kind}_rejected_reserved_kind_mismatch`,
          new Error('account_authority_operation_id_reused'),
        );
      }
    } catch (error) {
      return this.rejectLogged(`operation ${kind}_read_reservation_failed`, error);
    }
    const active = this.activeOperations.get(key);
    const completed = this.completedOperations.get(key);
    const recorded = active ?? completed;
    if (recorded && recorded.kind !== kind) {
      return this.rejectLogged(
        `operation ${kind}_rejected_recorded_kind_mismatch`,
        new Error('account_authority_operation_id_reused'),
      );
    }
    if (destructive) {
      const destructiveKind = kind as DestructiveOperationKind;
      if (destructiveRecord?.receipt) {
        if (destructiveRecord.kind !== destructiveKind) {
          return this.rejectLogged(
            `operation ${kind}_rejected_receipt_kind_mismatch`,
            new Error('account_authority_operation_id_reused'),
          );
        }
        this.log.info('operation replayed_receipt', { kind, resultType: destructiveRecord.receipt.type });
        return Promise.resolve(destructiveRecord.receipt as T);
      }
      if (reservedKind !== null && destructiveRecord === null) {
        return this.rejectLogged(
          `operation ${kind}_rejected_missing_destructive_record`,
          new Error('account_authority_destructive_retry_requires_recovery'),
        );
      }
      if (destructiveRecord && (
        destructiveRecord.kind !== destructiveKind
        || destructiveRecord.fingerprint !== destructive.fingerprint
        || !sameReservedOwner(destructiveRecordOwner(destructiveRecord), destructive.owner)
        || destructiveRecord.expectedGeneration.value !== destructive.expectedGeneration.value
      )) {
        return this.rejectLogged(
          `operation ${kind}_rejected_destructive_record_mismatch`,
          new Error('account_authority_operation_id_reused'),
        );
      }
      if (destructiveRecord && this.state.phase === 'booting') {
        return this.rejectLogged(
          `operation ${kind}_rejected_booting`,
          new Error('account_authority_destructive_retry_requires_rehydration'),
        );
      }
    }
    if (active) {
      this.log.info('operation joined_active', { kind });
      return active.promise as Promise<T>;
    }
    if (completed) {
      this.log.info('operation replayed_completed', { kind });
      this.completedOperations.delete(key);
      this.completedOperations.set(key, completed);
      return completed.promise as Promise<T>;
    }
    if (destructive && this.destructiveAdmissions.size >= MAX_PENDING_DESTRUCTIVE_OPERATIONS) {
      return this.rejectLogged(
        `operation ${kind}_rejected_queue_full`,
        new Error('account_authority_destructive_queue_full'),
      );
    }
    try {
      this.localStore.reserveOperation(
        operationId,
        kind,
        destructive
          ? {
            fingerprint: destructive.fingerprint,
            owner: destructive.owner,
            expectedGeneration: destructive.expectedGeneration,
            stage: destructive.reservationStage,
          }
          : undefined,
      );
    } catch (error) {
      return this.rejectLogged(`operation ${kind}_reserve_failed`, error);
    }
    try {
      prepare?.();
    } catch (error) {
      destructive?.onSettled?.();
      return this.rejectLogged(`operation ${kind}_prepare_failed`, error);
    }
    if (destructive) this.destructiveAdmissions.add(key);
    const queuedAt = Date.now();
    this.log.info('operation enqueued', {
      kind,
      destructive: destructive !== undefined,
      queueDepth: this.queue.length,
      phase: this.state.phase,
    });
    const operation = this.enqueue(async () => {
      this.log.info('operation started', { kind, phase: this.state.phase, waitedMs: accountAuthorityElapsedMs(queuedAt) });
      const value = await task();
      if (destructive && value !== undefined) {
        const reservation = this.localStore.getDestructiveOperation(operationId);
        if (!reservation || reservation.kind !== kind) {
          throw new Error('account_authority_operation_id_reused');
        }
        this.localStore.completeDestructiveOperation(
          operationId,
          kind as DestructiveOperationKind,
          reservation.fingerprint,
          value as AccountAuthorityResult,
        );
      }
      return value;
    });
    const record = Object.freeze({ kind, promise: operation });
    this.activeOperations.set(key, record);
    void operation.then(
      (value) => {
        this.log.info('operation done', {
          kind,
          resultType: resultTypeOf(value),
          phase: this.state.phase,
          durationMs: accountAuthorityElapsedMs(queuedAt),
        });
        if (this.activeOperations.get(key)?.promise !== operation) return;
        this.activeOperations.delete(key);
        if (destructive) {
          this.destructiveAdmissions.delete(key);
          destructive.onSettled?.();
        }
        if (!destructive) {
          this.completedOperations.set(key, record);
          while (this.completedOperations.size > MAX_COMPLETED_OPERATION_RECEIPTS) {
            const oldestKey = this.completedOperations.keys().next().value as string | undefined;
            if (oldestKey === undefined) break;
            this.completedOperations.delete(oldestKey);
          }
        }
      },
      (error: unknown) => {
        this.log.warn('operation failed', errorFields(error, {
          kind,
          phase: this.state.phase,
          durationMs: accountAuthorityElapsedMs(queuedAt),
        }));
        if (this.activeOperations.get(key)?.promise === operation) {
          this.activeOperations.delete(key);
          if (destructive) {
            this.destructiveAdmissions.delete(key);
            destructive.onSettled?.();
          }
        }
      },
    );
    return operation;
  }

  private admitPending<T>(map: Map<string, T>, key: string, value: T): void {
    map.set(key, value);
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        run: task,
        resolve: (value) => resolve(value as T),
        reject,
      });
      this.startNext();
    });
  }

  private startNext(): void {
    if (this.running) return;
    const item = this.queue.shift();
    if (!item) return;
    this.running = true;
    let runningOperation: Promise<unknown>;
    try {
      runningOperation = item.run();
    } catch (error) {
      this.log.warn('queue task_threw_synchronously', errorFields(error));
      item.reject(error);
      this.running = false;
      this.startNext();
      return;
    }
    void runningOperation.then(
      (value) => {
        this.running = false;
        item.resolve(value);
        this.startNext();
      },
      (error: unknown) => {
        // зачем (AA S1): итог операции пишет runOperation ('operation failed');
        // здесь — короткая отметка, что очередь освобождена после отказа.
        this.log.info('queue task_rejected', errorFields(error, { queueDepth: this.queue.length }));
        this.running = false;
        item.reject(error);
        this.startNext();
      },
    );
  }
}

export function createAccountAuthorityRuntime(input: Readonly<{
  deviceId: DeviceId;
  provider: AccountAuthorityProviderPort;
  lease: AccountAuthorityLeasePort;
  localStore: AccountAuthorityLocalStorePort;
  logger?: AccountAuthorityLogger;
}>): AccountAuthorityRuntime {
  return new FifoAccountAuthorityRuntime(input);
}
