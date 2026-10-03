import type {
  AccountAuthorityGeneration,
  AccountAuthorityResult,
  PreservedDomain,
} from './account_authority_contract';
import type { AccountId, OperationId, SessionId } from './account_authority_ids';

export type AccountAuthorityOperationKind =
  | 'sign_in'
  | 'resume'
  | 'sign_out'
  | 'delete'
  | 'revoke'
  | 'commit';

export type AccountAuthorityDestructiveOperationKind = Extract<
  AccountAuthorityOperationKind,
  'sign_out' | 'delete' | 'revoke'
>;

export type AccountAuthorityDestructiveOperationStage =
  | 'deferred_owner'
  | 'reserved'
  | 'local_applied';

export type AccountAuthorityDestructiveOperationRecord = Readonly<{
  kind: AccountAuthorityDestructiveOperationKind;
  fingerprint: string;
  owner: Readonly<{ accountId: AccountId; sessionId: SessionId }> | null;
  expectedGeneration: AccountAuthorityGeneration;
  stage: AccountAuthorityDestructiveOperationStage;
  receipt?: AccountAuthorityResult;
}>;

export type AccountAuthorityDestructiveReservation = Readonly<{
  fingerprint: string;
  owner: Readonly<{ accountId: AccountId; sessionId: SessionId }> | null;
  expectedGeneration: AccountAuthorityGeneration;
  stage: Extract<AccountAuthorityDestructiveOperationStage, 'deferred_owner' | 'reserved'>;
}>;

/** The complete ownership fence for one open local account scope. */
export type AccountAuthorityLocalScope = Readonly<{
  accountId: AccountId;
  sessionId: SessionId;
  generation: AccountAuthorityGeneration;
}>;

/**
 * A preserved-domain mutation after it has captured its authority fence.
 * Feature payloads remain behind the store adapter; the authority runtime only
 * carries the owner and idempotency metadata required to authorize a commit.
 */
export type AccountAuthorityPreservedWrite = Readonly<{
  operationId: OperationId;
  accountId: AccountId;
  sessionId: SessionId;
  expectedGeneration: AccountAuthorityGeneration;
  domain: PreservedDomain;
}>;

/**
 * Pure application port for account-local data. Implementations may use
 * SQLCipher or another local engine, but must expose only session metadata and
 * the two preserved domains owned by Account Authority 2.0.
 */
export interface AccountAuthorityLocalStorePort {
  getAuthorityGeneration(): AccountAuthorityGeneration;
  /** Persists and returns the maximum observed generation; it must never decrease. */
  advanceAuthorityGeneration(generation: AccountAuthorityGeneration): AccountAuthorityGeneration;
  getOperationKind(operationId: OperationId): AccountAuthorityOperationKind | null;
  getDestructiveOperation(operationId: OperationId): AccountAuthorityDestructiveOperationRecord | null;
  /** Atomically reserves kind and destructive metadata, or validates the existing reservation. */
  reserveOperation(
    operationId: OperationId,
    kind: AccountAuthorityOperationKind,
    destructive?: AccountAuthorityDestructiveReservation,
  ): void;
  /** Atomically binds a deferred owner and advances the record to local_applied. */
  bindDeferredDestructiveOperation(
    operationId: OperationId,
    kind: AccountAuthorityDestructiveOperationKind,
    fingerprint: string,
    owner: Readonly<{ accountId: AccountId; sessionId: SessionId }>,
    expectedGeneration: AccountAuthorityGeneration,
  ): void;
  markDestructiveOperationLocalApplied(
    operationId: OperationId,
    kind: AccountAuthorityDestructiveOperationKind,
    fingerprint: string,
  ): void;
  completeDestructiveOperation(
    operationId: OperationId,
    kind: AccountAuthorityDestructiveOperationKind,
    fingerprint: string,
    receipt: AccountAuthorityResult,
  ): void;
  getOpenScope(): AccountAuthorityLocalScope | null;
  openScope(scope: AccountAuthorityLocalScope): Promise<void>;
  closeScope(scope: AccountAuthorityLocalScope): Promise<void>;
  clearAccountData(accountId: AccountId): void;
  commitPreservedWrite(write: AccountAuthorityPreservedWrite): Promise<void>;
}

