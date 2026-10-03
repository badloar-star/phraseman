import {
  accountAuthorityGeneration,
  freezeAccountAuthorityResult,
  type AccountAuthorityGeneration,
  type AccountAuthorityResult,
  type PreservedDomain,
} from '../account-authority-v2/account_authority_contract';
import type { AccountAuthorityProductionBootstrap } from '../account-authority-v2/account_authority_bootstrap_contract';
import {
  parseAccountId,
  parseDeviceId,
  parseOperationId,
  parseSessionId,
  type AccountId,
  type FirebaseAuthUid,
  type SessionId,
} from '../account-authority-v2/account_authority_ids';
import type {
  AccountAuthorityDestructiveOperationKind,
  AccountAuthorityDestructiveOperationRecord,
  AccountAuthorityDestructiveOperationStage,
  AccountAuthorityDestructiveReservation,
  AccountAuthorityLocalScope,
  AccountAuthorityLocalStorePort,
  AccountAuthorityOperationKind,
  AccountAuthorityPreservedWrite,
} from '../account-authority-v2/account_authority_local_store';
import {
  createProductionAccountAuthorityFirebaseInstallationBindingPort,
  createProductionAccountAuthorityFirebaseLeasePort,
  type AccountAuthorityInstallationBindingCredentialStore,
  type AccountAuthorityInstallationBindingPort,
  type AccountAuthorityLeaseRevisionStore,
} from '../account-authority-v2/account_authority_lease_transport';
import type { AccountAuthorityLeasePort } from '../account-authority-v2/account_authority_runtime';
import type { SessionFence } from './account_session';
import {
  createAccountScopeStore,
  type AccountScopeHandle,
  type ScopeJson,
  type ScopeStorageAdapter,
} from './account_scope_store';

const INSTALLATION_ID_KEY = 'phraseman.account_authority.installation_id.v1';
const BINDING_TOKEN_KEY = 'phraseman.account_authority.binding_token.v1';
const DEVICE_BINDING_ID_KEY = 'phraseman.account_authority.device_binding_id.v1';
const LOCAL_METADATA_KEY = 'phraseman.account_authority.local_metadata.v1';
const LEASE_REVISION_KEY_PREFIX = 'phraseman.account_authority.lease_revision.v1.';
const LEASE_OWNER_REVISION_KEY_PREFIX = 'phraseman.account_authority.lease_owner_revision.v1.';
const LOCAL_METADATA_SCHEMA = 'account-authority-local-metadata.v1';
const SCOPE_METADATA_KEY = 'account_authority.scope.v1';
const REVISION_SCHEMA = 'account-authority-lease-revision.v1';
const LEASE_OWNER_REVISION_SCHEMA = 'account-authority-lease-owner-revision.v1';
const LOG = '[ACCOUNT-AUTHORITY]';
const MAX_DURABLE_OPERATIONS = 512;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;

export type AccountAuthoritySecureStorePort = Readonly<{
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: unknown;
  getItem(key: string, options?: object): string | null;
  setItem(key: string, value: string, options?: object): void;
  getItemAsync(key: string, options?: object): Promise<string | null>;
  setItemAsync(key: string, value: string, options?: object): Promise<void>;
}>;

type DurableOwner = Readonly<{ accountId: string; sessionId: string }>;
type DurableReceipt = Readonly<Record<string, ScopeJson>>;
type DurableDestructive = Readonly<{
  kind: AccountAuthorityDestructiveOperationKind;
  fingerprint: string;
  owner: DurableOwner | null;
  expectedGeneration: number;
  stage: AccountAuthorityDestructiveOperationStage;
  receipt: DurableReceipt | null;
}>;
type DurableOperation = Readonly<{
  operationId: string;
  kind: AccountAuthorityOperationKind;
  destructive: DurableDestructive | null;
}>;
type DurableMetadata = Readonly<{
  generation: number;
  operations: readonly DurableOperation[];
}>;

export type AccountAuthorityProductionAdapterDependencies = Readonly<{
  secureStore: AccountAuthoritySecureStorePort;
  createStorageAdapter(): ScopeStorageAdapter | null;
  randomInstallationId(): Promise<string>;
  digestSha256(value: string): Promise<string>;
  createInstallationBinding(input: Readonly<{
    installationId: string;
    credentials: AccountAuthorityInstallationBindingCredentialStore;
  }>): AccountAuthorityInstallationBindingPort;
  createLease(
    revisionStore: AccountAuthorityLeaseRevisionStore,
    installationBinding: AccountAuthorityInstallationBindingPort,
  ): AccountAuthorityLeasePort;
  providerSignOut(): Promise<void>;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// зачем (AA S0, правило «немой catch запрещён»): в лог идёт только вид ошибки и
// безопасный код (свой account_authority_* или код адаптера), но не текст чужой
// ошибки — в нём может оказаться uid или путь.
function failureKind(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}

function failureCode(error: unknown): string {
  if (isRecord(error) && typeof error.code === 'string' && /^[\w/-]{1,96}$/.test(error.code)) return error.code;
  if (error instanceof Error && /^account_authority_[a-z0-9_]{1,80}$/.test(error.message)) return error.message;
  return 'other';
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function safeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function operationKind(value: unknown): value is AccountAuthorityOperationKind {
  return value === 'sign_in' || value === 'resume' || value === 'sign_out'
    || value === 'delete' || value === 'revoke' || value === 'commit';
}

function destructiveKind(value: unknown): value is AccountAuthorityDestructiveOperationKind {
  return value === 'sign_out' || value === 'delete' || value === 'revoke';
}

function destructiveStage(value: unknown): value is AccountAuthorityDestructiveOperationStage {
  return value === 'deferred_owner' || value === 'reserved' || value === 'local_applied';
}

function preservedDomain(value: unknown): value is PreservedDomain {
  return value === 'lesson_progress' || value === 'flashcards_srs';
}

function secureOptions(store: AccountAuthoritySecureStorePort): object {
  return Object.freeze({
    keychainService: 'phraseman.account_authority.v1',
    keychainAccessible: store.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    requireAuthentication: false,
  });
}

function receiptToDurable(receipt: AccountAuthorityResult): DurableReceipt {
  switch (receipt.type) {
    case 'authenticated':
      return Object.freeze({
        type: receipt.type,
        accountId: receipt.accountId.value,
        sessionId: receipt.sessionId.value,
        generation: receipt.generation.value,
      });
    case 'signed_out':
    case 'device_taken_over':
    case 'local_deleted':
      return Object.freeze({ type: receipt.type, generation: receipt.generation.value });
    case 'committed':
      return Object.freeze({ type: receipt.type, operationId: receipt.operationId.value, domain: receipt.domain });
    case 'cancelled':
      return Object.freeze({ type: receipt.type, reason: receipt.reason });
    case 'rejected':
      return Object.freeze({ type: receipt.type, operationId: receipt.operationId.value, reason: receipt.reason });
  }
}

function receiptFromDurable(value: unknown): AccountAuthorityResult {
  if (!isRecord(value) || typeof value.type !== 'string') throw new Error('account_authority_local_metadata_invalid');
  try {
    switch (value.type) {
      case 'authenticated':
        if (!safeInteger(value.generation)) throw new Error('invalid');
        return freezeAccountAuthorityResult({
          type: 'authenticated',
          accountId: parseAccountId(value.accountId),
          sessionId: parseSessionId(value.sessionId),
          generation: accountAuthorityGeneration(value.generation),
        });
      case 'signed_out':
      case 'device_taken_over':
      case 'local_deleted':
        if (!safeInteger(value.generation)) throw new Error('invalid');
        return freezeAccountAuthorityResult({
          type: value.type,
          generation: accountAuthorityGeneration(value.generation),
        });
      case 'committed':
        if (!preservedDomain(value.domain)) throw new Error('invalid');
        return freezeAccountAuthorityResult({
          type: 'committed', operationId: parseOperationId(value.operationId), domain: value.domain,
        });
      case 'cancelled':
        if (value.reason !== 'provider_cancelled' && value.reason !== 'user_cancelled') throw new Error('invalid');
        return freezeAccountAuthorityResult({ type: 'cancelled', reason: value.reason });
      case 'rejected':
        if (
          value.reason !== 'stale_generation'
          && value.reason !== 'stale_session'
          && value.reason !== 'not_authenticated'
        ) throw new Error('invalid');
        return freezeAccountAuthorityResult({
          type: 'rejected', operationId: parseOperationId(value.operationId), reason: value.reason,
        });
      default:
        throw new Error('invalid');
    }
  } catch {
    throw new Error('account_authority_local_metadata_invalid');
  }
}

function parseDurableOwner(value: unknown): DurableOwner | null {
  if (value === null) return null;
  if (!isRecord(value) || !exactKeys(value, ['accountId', 'sessionId'])) {
    throw new Error('account_authority_local_metadata_invalid');
  }
  const accountId = parseAccountId(value.accountId).value;
  const sessionId = parseSessionId(value.sessionId).value;
  return Object.freeze({ accountId, sessionId });
}

function parseDurableDestructive(value: unknown, operationKindValue: AccountAuthorityOperationKind): DurableDestructive | null {
  if (value === null) return null;
  if (
    !isRecord(value)
    || !exactKeys(value, ['kind', 'fingerprint', 'owner', 'expectedGeneration', 'stage', 'receipt'])
    || !destructiveKind(value.kind)
    || value.kind !== operationKindValue
    || typeof value.fingerprint !== 'string'
    || value.fingerprint.length === 0
    || value.fingerprint.trim() !== value.fingerprint
    || !safeInteger(value.expectedGeneration)
    || !destructiveStage(value.stage)
  ) throw new Error('account_authority_local_metadata_invalid');
  const receipt = value.receipt === null ? null : receiptToDurable(receiptFromDurable(value.receipt));
  return Object.freeze({
    kind: value.kind,
    fingerprint: value.fingerprint,
    owner: parseDurableOwner(value.owner),
    expectedGeneration: value.expectedGeneration,
    stage: value.stage,
    receipt,
  });
}

function parseMetadata(raw: string | null): DurableMetadata {
  if (raw === null) return Object.freeze({ generation: 0, operations: Object.freeze([]) });
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('account_authority_local_metadata_invalid');
  }
  if (
    !isRecord(value)
    || !exactKeys(value, ['schemaVersion', 'generation', 'operations'])
    || value.schemaVersion !== LOCAL_METADATA_SCHEMA
    || !safeInteger(value.generation)
    || !Array.isArray(value.operations)
    || value.operations.length > MAX_DURABLE_OPERATIONS
  ) throw new Error('account_authority_local_metadata_invalid');
  const seen = new Set<string>();
  const operations = value.operations.map((entry): DurableOperation => {
    if (
      !isRecord(entry)
      || !exactKeys(entry, ['operationId', 'kind', 'destructive'])
      || !operationKind(entry.kind)
    ) throw new Error('account_authority_local_metadata_invalid');
    const operationId = parseOperationId(entry.operationId).value;
    if (seen.has(operationId)) throw new Error('account_authority_local_metadata_invalid');
    seen.add(operationId);
    const destructive = parseDurableDestructive(entry.destructive, entry.kind);
    if (destructive === null && destructiveKind(entry.kind)) {
      throw new Error('account_authority_local_metadata_invalid');
    }
    return Object.freeze({ operationId, kind: entry.kind, destructive });
  });
  return Object.freeze({ generation: value.generation, operations: Object.freeze(operations) });
}

function metadataJson(metadata: DurableMetadata): string {
  return JSON.stringify({ schemaVersion: LOCAL_METADATA_SCHEMA, ...metadata });
}

function sameOwner(left: DurableOwner | null, right: DurableOwner | null): boolean {
  return left === null || right === null
    ? left === right
    : left.accountId === right.accountId && left.sessionId === right.sessionId;
}

function sameScope(left: AccountAuthorityLocalScope, right: AccountAuthorityLocalScope): boolean {
  return left.accountId.value === right.accountId.value
    && left.sessionId.value === right.sessionId.value
    && left.generation.value === right.generation.value;
}

function durableOwner(owner: AccountAuthorityDestructiveReservation['owner']): DurableOwner | null {
  return owner === null ? null : Object.freeze({
    accountId: parseAccountId(owner.accountId).value,
    sessionId: parseSessionId(owner.sessionId).value,
  });
}

function durableDestructive(
  kind: AccountAuthorityDestructiveOperationKind,
  value: AccountAuthorityDestructiveReservation,
): DurableDestructive {
  if (typeof value.fingerprint !== 'string' || value.fingerprint.length === 0 || value.fingerprint.trim() !== value.fingerprint) {
    throw new Error('account_authority_operation_reservation_invalid');
  }
  return Object.freeze({
    kind,
    fingerprint: value.fingerprint,
    owner: durableOwner(value.owner),
    expectedGeneration: accountAuthorityGeneration(value.expectedGeneration.value).value,
    stage: value.stage,
    receipt: null,
  });
}

function destructiveRecord(value: DurableDestructive): AccountAuthorityDestructiveOperationRecord {
  const receipt = value.receipt === null ? undefined : receiptFromDurable(value.receipt);
  return Object.freeze({
    kind: value.kind,
    fingerprint: value.fingerprint,
    owner: value.owner === null ? null : Object.freeze({
      accountId: parseAccountId(value.owner.accountId),
      sessionId: parseSessionId(value.owner.sessionId),
    }),
    expectedGeneration: accountAuthorityGeneration(value.expectedGeneration),
    stage: value.stage,
    ...(receipt === undefined ? {} : { receipt }),
  });
}

function makeFence(scope: AccountAuthorityLocalScope): SessionFence {
  return Object.freeze({
    scopeKey: `account:${scope.accountId.value}` as const,
    uid: scope.accountId.value,
    generation: scope.generation.value,
    nonce: `account-authority-${scope.sessionId.value}`,
  });
}

function createDurableLocalStore(input: Readonly<{
  secureStore: AccountAuthoritySecureStorePort;
  storageAdapter: ScopeStorageAdapter;
}>): AccountAuthorityLocalStorePort {
  const options = secureOptions(input.secureStore);
  const raw = input.secureStore.getItem(LOCAL_METADATA_KEY, options);
  let metadata = parseMetadata(raw);
  if (raw === null) {
    const genesis = metadataJson(metadata);
    input.secureStore.setItem(LOCAL_METADATA_KEY, genesis, options);
    if (input.secureStore.getItem(LOCAL_METADATA_KEY, options) !== genesis) {
      throw new Error('account_authority_local_metadata_unavailable');
    }
  }
  const scopeStore = createAccountScopeStore(input.storageAdapter);
  let openScope: AccountAuthorityLocalScope | null = null;
  let openHandle: AccountScopeHandle | null = null;

  const persist = (next: DurableMetadata): void => {
    const encoded = metadataJson(next);
    input.secureStore.setItem(LOCAL_METADATA_KEY, encoded, options);
    if (input.secureStore.getItem(LOCAL_METADATA_KEY, options) !== encoded) {
      throw new Error('account_authority_local_metadata_unavailable');
    }
    metadata = next;
  };
  const operationIndex = (operationId: string): number => (
    metadata.operations.findIndex((entry) => entry.operationId === operationId)
  );
  const replaceOperation = (index: number, operation: DurableOperation): void => {
    const operations = [...metadata.operations];
    operations[index] = operation;
    persist(Object.freeze({ generation: metadata.generation, operations: Object.freeze(operations) }));
  };
  const requireDestructive = (
    operationId: string,
    kind: AccountAuthorityDestructiveOperationKind,
    fingerprint: string,
  ): Readonly<{ index: number; operation: DurableOperation; destructive: DurableDestructive }> => {
    const index = operationIndex(operationId);
    const operation = metadata.operations[index];
    if (
      index < 0
      || operation.kind !== kind
      || operation.destructive === null
      || operation.destructive.fingerprint !== fingerprint
    ) throw new Error('account_authority_operation_id_reused');
    return Object.freeze({ index, operation, destructive: operation.destructive });
  };
  const assertWriteFence = (write: AccountAuthorityPreservedWrite): AccountScopeHandle => {
    const current = openScope;
    if (
      current === null
      || openHandle === null
      || current.accountId.value !== write.accountId.value
      || current.sessionId.value !== write.sessionId.value
      || current.generation.value !== write.expectedGeneration.value
      || metadata.generation !== write.expectedGeneration.value
      || !preservedDomain(write.domain)
    ) throw new Error('account_authority_preserved_write_stale');
    return openHandle;
  };

  const port: AccountAuthorityLocalStorePort = {
    getAuthorityGeneration: () => accountAuthorityGeneration(metadata.generation),
    advanceAuthorityGeneration: (generation: AccountAuthorityGeneration) => {
      const next = accountAuthorityGeneration(generation.value);
      if (next.value <= metadata.generation) return accountAuthorityGeneration(metadata.generation);
      persist(Object.freeze({ generation: next.value, operations: metadata.operations }));
      return next;
    },
    getOperationKind: (operationId) => metadata.operations[operationIndex(parseOperationId(operationId).value)]?.kind ?? null,
    getDestructiveOperation: (operationId) => {
      const operation = metadata.operations[operationIndex(parseOperationId(operationId).value)];
      return operation?.destructive ? destructiveRecord(operation.destructive) : null;
    },
    reserveOperation: (operationId, kind, destructive) => {
      const id = parseOperationId(operationId).value;
      if (!operationKind(kind)) throw new Error('account_authority_operation_reservation_invalid');
      const durable = destructive === undefined
        ? null
        : durableDestructive(kind as AccountAuthorityDestructiveOperationKind, destructive);
      const index = operationIndex(id);
      if (index >= 0) {
        const current = metadata.operations[index];
        if (
          current.kind !== kind
          || (current.destructive === null) !== (durable === null)
          || (current.destructive !== null && durable !== null && (
            current.destructive.fingerprint !== durable.fingerprint
            || current.destructive.expectedGeneration !== durable.expectedGeneration
            || current.destructive.stage !== durable.stage
            || !sameOwner(current.destructive.owner, durable.owner)
          ))
        ) throw new Error('account_authority_operation_id_reused');
        return;
      }
      if (metadata.operations.length >= MAX_DURABLE_OPERATIONS) {
        throw new Error('account_authority_operation_store_full');
      }
      persist(Object.freeze({
        generation: metadata.generation,
        operations: Object.freeze([...metadata.operations, Object.freeze({ operationId: id, kind, destructive: durable })]),
      }));
    },
    bindDeferredDestructiveOperation: (operationId, kind, fingerprint, owner, expectedGeneration) => {
      const found = requireDestructive(parseOperationId(operationId).value, kind, fingerprint);
      const nextOwner = durableOwner(owner);
      if (
        found.destructive.expectedGeneration !== expectedGeneration.value
        || found.destructive.stage !== 'deferred_owner'
        || found.destructive.owner !== null
        || nextOwner === null
      ) throw new Error('account_authority_operation_id_reused');
      replaceOperation(found.index, Object.freeze({
        ...found.operation,
        destructive: Object.freeze({ ...found.destructive, owner: nextOwner, stage: 'local_applied' }),
      }));
    },
    markDestructiveOperationLocalApplied: (operationId, kind, fingerprint) => {
      const found = requireDestructive(parseOperationId(operationId).value, kind, fingerprint);
      if (found.destructive.stage === 'local_applied') return;
      if (found.destructive.stage !== 'reserved') throw new Error('account_authority_operation_id_reused');
      replaceOperation(found.index, Object.freeze({
        ...found.operation,
        destructive: Object.freeze({ ...found.destructive, stage: 'local_applied' }),
      }));
    },
    completeDestructiveOperation: (operationId, kind, fingerprint, receipt) => {
      const found = requireDestructive(parseOperationId(operationId).value, kind, fingerprint);
      if (found.destructive.stage !== 'local_applied') throw new Error('account_authority_operation_id_reused');
      const durableReceipt = receiptToDurable(freezeAccountAuthorityResult(receipt));
      if (found.destructive.receipt !== null) {
        if (JSON.stringify(found.destructive.receipt) !== JSON.stringify(durableReceipt)) {
          throw new Error('account_authority_operation_id_reused');
        }
        return;
      }
      replaceOperation(found.index, Object.freeze({
        ...found.operation,
        destructive: Object.freeze({ ...found.destructive, receipt: durableReceipt }),
      }));
    },
    getOpenScope: () => openScope,
    openScope: async (scope) => {
      const target: AccountAuthorityLocalScope = Object.freeze({
        accountId: parseAccountId(scope.accountId),
        sessionId: parseSessionId(scope.sessionId),
        generation: accountAuthorityGeneration(scope.generation.value),
      });
      if (target.generation.value !== metadata.generation) throw new Error('account_authority_generation_regression');
      if (openScope !== null) {
        if (sameScope(openScope, target)) return;
        throw new Error('account_authority_scope_busy');
      }
      const accountScope = Object.freeze({
        kind: 'account' as const,
        uid: target.accountId.value,
        scopeKey: `account:${target.accountId.value}` as const,
      });
      const fence = makeFence(target);
      const handle = await scopeStore.open(accountScope, fence);
      try {
        await handle.withTransaction(async (transaction) => {
          const existing = await transaction.readRecord(SCOPE_METADATA_KEY);
          if (existing !== null) {
            const value = existing.value;
            if (
              !isRecord(value)
              || value.schemaVersion !== 'account-authority-scope.v1'
              || value.accountId !== target.accountId.value
              || !safeInteger(value.generation)
              || (value.generation as number) > target.generation.value
              || ((value.generation as number) === target.generation.value && value.sessionId !== target.sessionId.value)
            ) throw new Error('account_authority_scope_metadata_invalid');
          }
          await transaction.putRecord({
            key: SCOPE_METADATA_KEY,
            value: {
              schemaVersion: 'account-authority-scope.v1',
              accountId: target.accountId.value,
              sessionId: target.sessionId.value,
              generation: target.generation.value,
            },
          });
        });
      } catch (error) {
        console.warn(`${LOG} local_store open_scope_metadata_failed kind=${failureKind(error)} code=${failureCode(error)}`);
        try {
          await scopeStore.close(fence);
        } catch (closeError) {
          // зачем (AA S0): раньше сбой компенсирующего закрытия глушился немым
          // .catch(() => undefined). Наружу по-прежнему уходит исходная ошибка
          // открытия (её видит runtime), но причина незакрытого scope теперь в логе.
          console.warn(`${LOG} local_store open_scope_compensation_close_failed kind=${failureKind(closeError)} code=${failureCode(closeError)}`);
        }
        throw error;
      }
      openScope = target;
      openHandle = handle;
    },
    closeScope: async (scope) => {
      if (openScope === null || !sameScope(openScope, scope)) throw new Error('account_authority_scope_stale');
      const target = openScope;
      await scopeStore.close(makeFence(target));
      openScope = null;
      openHandle = null;
    },
    clearAccountData: (_accountId: AccountId) => {
      // The core port is synchronous, while the proven native eraser is async.
      // Publishing a successful local delete here would violate delete-local-first.
      throw new Error('account_authority_local_delete_not_wired');
    },
    commitPreservedWrite: async (write) => {
      const handle = assertWriteFence(write);
      const operationId = parseOperationId(write.operationId).value;
      if (metadata.operations[operationIndex(operationId)]?.kind !== 'commit') {
        throw new Error('account_authority_operation_not_reserved');
      }
      const key = `account_authority.preserved.${write.domain}.${operationId}`;
      await handle.withTransaction(async (transaction) => {
        const next: ScopeJson = {
          schemaVersion: 'account-authority-preserved-write.v1',
          operationId,
          accountId: write.accountId.value,
          sessionId: write.sessionId.value,
          generation: write.expectedGeneration.value,
          domain: write.domain,
        };
        const existing = await transaction.readRecord(key);
        if (existing !== null && JSON.stringify(existing.value) !== JSON.stringify(next)) {
          throw new Error('account_authority_preserved_write_conflict');
        }
        await transaction.putRecord({ key, value: next });
      });
    },
  };
  return Object.freeze(port);
}

async function revisionKey(
  firebaseAuthUid: FirebaseAuthUid,
  digestSha256: (value: string) => Promise<string>,
): Promise<Readonly<{ key: string; uidHash: string }>> {
  const uidHash = await digestSha256(`account-authority-revision-uid.v1\u0000${firebaseAuthUid.value}`);
  if (!SHA256_HEX.test(uidHash)) throw new Error('account_authority_lease_revision_unavailable');
  return Object.freeze({ key: `${LEASE_REVISION_KEY_PREFIX}${uidHash}`, uidHash });
}

type LeaseOwner = Readonly<{ accountId: AccountId; sessionId: SessionId }>;
type LeaseOwnerRecord = Readonly<{ ownerHash: string; uidHash: string; revision: number }>;

async function leaseOwnerKey(
  owner: LeaseOwner,
  digestSha256: (value: string) => Promise<string>,
): Promise<Readonly<{ key: string; ownerHash: string }>> {
  const accountId = parseAccountId(owner.accountId.value).value;
  const sessionId = parseSessionId(owner.sessionId.value).value;
  const ownerHash = await digestSha256(`account-authority-lease-owner.v1\u0000${accountId}\u0000${sessionId}`);
  if (!SHA256_HEX.test(ownerHash)) throw new Error('account_authority_lease_revision_unavailable');
  return Object.freeze({ key: `${LEASE_OWNER_REVISION_KEY_PREFIX}${ownerHash}`, ownerHash });
}

/**
 * зачем (AA S0, доделка прерванной переделки 2026-10-02): release-транспорту
 * нужна ревизия конкретной аренды (accountId+sessionId), а не только последняя
 * ревизия по Firebase UID. Хранилище — то же SecureStore «только это устройство»;
 * ключи и содержимое несут лишь хеши, сам uid/accountId на диск не попадает.
 * Запись аренды помнит uidHash, чтобы release сдвигал и ревизию UID: иначе
 * следующий acquire того же UID ушёл бы со старым expectedRevision и упал.
 */
export function createAccountAuthoritySecureRevisionStore(input: Readonly<{
  secureStore: AccountAuthoritySecureStorePort;
  digestSha256(value: string): Promise<string>;
}>): AccountAuthorityLeaseRevisionStore {
  const options = secureOptions(input.secureStore);
  const writeVerified = async (key: string, encoded: string): Promise<void> => {
    await input.secureStore.setItemAsync(key, encoded, options);
    if (await input.secureStore.getItemAsync(key, options) !== encoded) {
      throw new Error('account_authority_lease_revision_unavailable');
    }
  };
  const writeUidRevision = async (uidHash: string, revision: number): Promise<void> => {
    await writeVerified(
      `${LEASE_REVISION_KEY_PREFIX}${uidHash}`,
      JSON.stringify({ schemaVersion: REVISION_SCHEMA, uidHash, revision }),
    );
  };
  const readLeaseRecord = async (owner: LeaseOwner): Promise<LeaseOwnerRecord | null> => {
    const { key, ownerHash } = await leaseOwnerKey(owner, input.digestSha256);
    const raw = await input.secureStore.getItemAsync(key, options);
    if (raw === null) return null;
    try {
      const value: unknown = JSON.parse(raw);
      if (
        !isRecord(value)
        || !exactKeys(value, ['schemaVersion', 'ownerHash', 'uidHash', 'revision'])
        || value.schemaVersion !== LEASE_OWNER_REVISION_SCHEMA
        || value.ownerHash !== ownerHash
        || typeof value.uidHash !== 'string'
        || !SHA256_HEX.test(value.uidHash)
        || !safeInteger(value.revision)
      ) throw new Error('invalid');
      return Object.freeze({ ownerHash, uidHash: value.uidHash, revision: value.revision });
    } catch {
      throw new Error('account_authority_lease_revision_unavailable');
    }
  };
  const writeLeaseRecord = async (
    owner: LeaseOwner,
    uidHash: string,
    revision: number,
  ): Promise<void> => {
    const { key, ownerHash } = await leaseOwnerKey(owner, input.digestSha256);
    await writeVerified(key, JSON.stringify({
      schemaVersion: LEASE_OWNER_REVISION_SCHEMA,
      ownerHash,
      uidHash,
      revision,
    }));
  };
  const store: AccountAuthorityLeaseRevisionStore = {
    read: async (firebaseAuthUid) => {
      const { key, uidHash } = await revisionKey(firebaseAuthUid, input.digestSha256);
      const raw = await input.secureStore.getItemAsync(key, options);
      if (raw === null) return null;
      try {
        const value: unknown = JSON.parse(raw);
        if (
          !isRecord(value)
          || !exactKeys(value, ['schemaVersion', 'uidHash', 'revision'])
          || value.schemaVersion !== REVISION_SCHEMA
          || value.uidHash !== uidHash
          || !safeInteger(value.revision)
        ) throw new Error('invalid');
        return value.revision;
      } catch {
        throw new Error('account_authority_lease_revision_unavailable');
      }
    },
    write: async (firebaseAuthUid, revision) => {
      if (!safeInteger(revision)) throw new Error('account_authority_lease_revision_unavailable');
      const { uidHash } = await revisionKey(firebaseAuthUid, input.digestSha256);
      await writeUidRevision(uidHash, revision);
    },
    readLease: async (owner) => {
      const record = await readLeaseRecord(owner);
      return record === null ? null : record.revision;
    },
    bindLease: async (firebaseAuthUid, owner, revision) => {
      if (!safeInteger(revision)) throw new Error('account_authority_lease_revision_unavailable');
      const { uidHash } = await revisionKey(firebaseAuthUid, input.digestSha256);
      // Сначала ревизия UID (её читает следующий acquire), затем запись аренды.
      // Обрыв между ними оставляет release без ревизии — он падает закрыто.
      await writeUidRevision(uidHash, revision);
      await writeLeaseRecord(owner, uidHash, revision);
    },
    writeLease: async (owner, revision) => {
      if (!safeInteger(revision)) throw new Error('account_authority_lease_revision_unavailable');
      const record = await readLeaseRecord(owner);
      if (record === null) throw new Error('account_authority_lease_revision_unavailable');
      await writeUidRevision(record.uidHash, revision);
      await writeLeaseRecord(owner, record.uidHash, revision);
    },
  };
  return Object.freeze(store);
}

export function createAccountAuthoritySecureInstallationBindingCredentialStore(input: Readonly<{
  secureStore: AccountAuthoritySecureStorePort;
}>): AccountAuthorityInstallationBindingCredentialStore {
  const options = secureOptions(input.secureStore);
  const parseCredentials = (bindingToken: unknown, deviceBindingId: unknown) => {
    if (
      typeof bindingToken !== 'string'
      || bindingToken.length < 1
      || bindingToken.length > 512
      || bindingToken.trim() !== bindingToken
    ) throw new Error('account_authority_installation_binding_unavailable');
    try {
      return Object.freeze({
        bindingToken,
        deviceBindingId: parseDeviceId(deviceBindingId).value,
      });
    } catch {
      throw new Error('account_authority_installation_binding_unavailable');
    }
  };
  const credentialStore: AccountAuthorityInstallationBindingCredentialStore = {
    read: async () => {
      const [bindingToken, deviceBindingId] = await Promise.all([
        input.secureStore.getItemAsync(BINDING_TOKEN_KEY, options),
        input.secureStore.getItemAsync(DEVICE_BINDING_ID_KEY, options),
      ]);
      if (bindingToken === null && deviceBindingId === null) return null;
      return parseCredentials(bindingToken, deviceBindingId);
    },
    write: async (credentials) => {
      const parsed = parseCredentials(credentials.bindingToken, credentials.deviceBindingId);
      await input.secureStore.setItemAsync(BINDING_TOKEN_KEY, parsed.bindingToken, options);
      await input.secureStore.setItemAsync(DEVICE_BINDING_ID_KEY, parsed.deviceBindingId, options);
      const [storedToken, storedDeviceBindingId] = await Promise.all([
        input.secureStore.getItemAsync(BINDING_TOKEN_KEY, options),
        input.secureStore.getItemAsync(DEVICE_BINDING_ID_KEY, options),
      ]);
      if (
        storedToken !== parsed.bindingToken
        || storedDeviceBindingId !== parsed.deviceBindingId
      ) throw new Error('account_authority_installation_binding_unavailable');
    },
  };
  return Object.freeze(credentialStore);
}

async function installationDeviceId(input: AccountAuthorityProductionAdapterDependencies) {
  const options = secureOptions(input.secureStore);
  const existing = await input.secureStore.getItemAsync(INSTALLATION_ID_KEY, options);
  if (existing !== null) {
    if (!UUID_V4.test(existing)) throw new Error('account_authority_installation_id_invalid');
    return parseDeviceId(existing);
  }
  const generated = await input.randomInstallationId();
  if (!UUID_V4.test(generated)) throw new Error('account_authority_installation_id_invalid');
  await input.secureStore.setItemAsync(INSTALLATION_ID_KEY, generated, options);
  if (await input.secureStore.getItemAsync(INSTALLATION_ID_KEY, options) !== generated) {
    throw new Error('account_authority_installation_id_unavailable');
  }
  return parseDeviceId(generated);
}

export async function createAccountAuthorityProductionBootstrap(
  dependencies: AccountAuthorityProductionAdapterDependencies,
): Promise<AccountAuthorityProductionBootstrap | null> {
  const storageAdapter = dependencies.createStorageAdapter();
  if (storageAdapter === null) return null;
  if (
    typeof dependencies.secureStore.getItem !== 'function'
    || typeof dependencies.secureStore.setItem !== 'function'
  ) {
    // Generation and operation reservations are synchronous in the core port;
    // accepting an async-only store would acknowledge non-durable fences.
    throw new Error('account_authority_secure_store_sync_unavailable');
  }
  const deviceId = await installationDeviceId(dependencies);
  const revisionStore = createAccountAuthoritySecureRevisionStore({
    secureStore: dependencies.secureStore,
    digestSha256: dependencies.digestSha256,
  });
  const installationBinding = dependencies.createInstallationBinding({
    installationId: deviceId.value,
    credentials: createAccountAuthoritySecureInstallationBindingCredentialStore({
      secureStore: dependencies.secureStore,
    }),
  });
  return Object.freeze({
    deviceId,
    lease: dependencies.createLease(revisionStore, installationBinding),
    localStore: createDurableLocalStore({ secureStore: dependencies.secureStore, storageAdapter }),
    providerSignOut: dependencies.providerSignOut,
  });
}

function productionDependencies(): AccountAuthorityProductionAdapterDependencies {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const secureStore = require('expo-secure-store') as AccountAuthoritySecureStorePort;
  const crypto = require('expo-crypto') as typeof import('expo-crypto');
  const { createExpoAccountNativeEnvironment } = require('./native/account_native_expo_environment') as
    typeof import('./native/account_native_expo_environment');
  const { createAccountNativeScopeAdapter } = require('./native/account_native_scope_adapter') as
    typeof import('./native/account_native_scope_adapter');
  /* eslint-enable @typescript-eslint/no-require-imports */
  return Object.freeze({
    secureStore,
    createStorageAdapter: () => {
      const environment = createExpoAccountNativeEnvironment();
      return environment === null ? null : createAccountNativeScopeAdapter(environment);
    },
    randomInstallationId: async () => crypto.randomUUID(),
    digestSha256: (value: string) => crypto.digestStringAsync(
      crypto.CryptoDigestAlgorithm.SHA256,
      value,
      { encoding: crypto.CryptoEncoding.HEX },
    ),
    createInstallationBinding: createProductionAccountAuthorityFirebaseInstallationBindingPort,
    createLease: createProductionAccountAuthorityFirebaseLeasePort,
    providerSignOut: async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const auth = require('@react-native-firebase/auth').default();
      await auth.signOut();
    },
  });
}

/** Native production composition. Unsupported platforms return null; malformed durable state throws. */
export function createAccountAuthorityProductionBootstrapIfPossible(
): Promise<AccountAuthorityProductionBootstrap | null> {
  return createAccountAuthorityProductionBootstrap(productionDependencies());
}
