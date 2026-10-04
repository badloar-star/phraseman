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
import {
  accountAuthorityErrorCode,
  accountAuthorityErrorKind,
  safeAccountAuthorityLogger,
  type AccountAuthorityLogger,
} from '../account-authority-v2/account_authority_logger';
import type { SessionFence } from './account_session';
import { createDurableSlotList } from '../account-authority-v2/account_authority_durable_slots';
import {
  createLocalFirstDeleteLease,
  type InterruptedDelete,
} from '../account-authority-v2/account_authority_remote_delete_queue';
import {
  createAccountScopeStore,
  type AccountScopeHandle,
  type ScopeJson,
  type ScopeStorageAdapter,
} from './account_scope_store';

const INSTALLATION_ID_KEY = 'phraseman.account_authority.installation_id.v1';
const BINDING_TOKEN_KEY = 'phraseman.account_authority.binding_token.v1';
const DEVICE_BINDING_ID_KEY = 'phraseman.account_authority.device_binding_id.v1';
// зачем (AA S2b, пункт 8): привязка по uid — ключ с хешем uid (см. хранилище привязок ниже).
const BINDING_KEY_PREFIX = 'phraseman.account_authority.binding.v2.';
const BINDING_SCHEMA = 'account-authority-installation-binding.v2';
const LOCAL_METADATA_KEY = 'phraseman.account_authority.local_metadata.v1';
const LEASE_REVISION_KEY_PREFIX = 'phraseman.account_authority.lease_revision.v1.';
const LEASE_OWNER_REVISION_KEY_PREFIX = 'phraseman.account_authority.lease_owner_revision.v1.';
const LOCAL_METADATA_SCHEMA = 'account-authority-local-metadata.v1';
const SCOPE_METADATA_KEY = 'account_authority.scope.v1';
const REVISION_SCHEMA = 'account-authority-lease-revision.v1';
const LEASE_OWNER_REVISION_SCHEMA = 'account-authority-lease-owner-revision.v1';
// Прежний формат v1: весь журнал (до 512 операций) одним значением — больше
// предела SecureStore 2048 Б. Читается только для переноса (AA S4b, п. 3).
const MAX_DURABLE_OPERATIONS = 512;
// AA S4b: журнал v2 — поколение отдельным ключом, операции — по одной на ключ.
const LOCAL_METADATA_V2_KEY = 'phraseman.account_authority.local_metadata.v2';
const LOCAL_METADATA_V2_SCHEMA = 'account-authority-local-metadata.v2';
export const OPERATION_JOURNAL_PREFIX = 'phraseman.account_authority.operations.v2';
const OPERATION_JOURNAL_SCHEMA = 'account-authority-operation.v2';
/** Предел журнала v2; незавершённые разрушающие операции не вытесняются никогда. */
export const MAX_JOURNAL_OPERATIONS = 64;
/** Сколько завершённых разрушающих операций (квитанций повтора) держим. */
export const MAX_JOURNAL_RECEIPTS = 16;
// зачем (AA S4a): надгробия локального удаления и исходящая очередь серверного
// удаления — отдельные ключи SecureStore с синхронной записью: переживают
// убийство процесса между нажатием «Удалить» и концом фоновой работы.
// Раунд 3 (M-B2): по одной записи на ключ + индекс (предел SecureStore 2048 Б).
export const LOCAL_ERASE_QUEUE_PREFIX = 'phraseman.account_authority.local_erase.v2';
const LOCAL_ERASE_QUEUE_SCHEMA = 'account-authority-local-erase.v2';
export const MAX_LOCAL_ERASE_QUEUE = 32;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;

export type AccountAuthoritySecureStorePort = Readonly<{
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: unknown;
  getItem(key: string, options?: object): string | null;
  setItem(key: string, value: string, options?: object): void;
  getItemAsync(key: string, options?: object): Promise<string | null>;
  setItemAsync(key: string, value: string, options?: object): Promise<void>;
  deleteItemAsync(key: string, options?: object): Promise<void>;
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
  /** S4a раунд 3: тревога, переживающая перезапуск (DebugLogger critical); только коды. */
  reportCritical?: (event: string, code: string) => void;
  /** S4a раунд 3: сколько удаление ждёт первую отправку на сервер (тесты — меньше). */
  remoteDeleteFirstSendDeadlineMs?: number;
  /** S4a раунд 4: часы очереди серверного удаления (тесты подменяют). */
  remoteDeleteNowMs?: () => number;
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
  /** Порт-логгер AA S1; по умолчанию console с префиксом [ACCOUNT-AUTHORITY]. */
  logger?: AccountAuthorityLogger;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// зачем (AA S0/S1, правило «немой catch запрещён»): в лог идёт только вид ошибки
// и безопасный код (свой account_authority_* или код адаптера), но не текст
// чужой ошибки — в нём может оказаться uid или путь.
function failureFields(
  error: unknown,
  extra: Readonly<Record<string, string>> = {},
): Readonly<Record<string, string>> {
  return Object.freeze({ ...extra, kind: accountAuthorityErrorKind(error), code: accountAuthorityErrorCode(error) });
}

// Разбор сохранённых данных: любая поломка → свой код, вид исходной — в лог.
function parseOrThrow<T>(log: AccountAuthorityLogger, event: string, failureCode: string, parse: () => T): T {
  try {
    return parse();
  } catch (error) {
    log.warn(event, failureFields(error, { mappedTo: failureCode }));
    throw new Error(failureCode);
  }
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

function receiptFromDurable(value: unknown, log: AccountAuthorityLogger): AccountAuthorityResult {
  if (!isRecord(value) || typeof value.type !== 'string') {
    log.warn('local_store receipt_invalid', { reason: 'not_typed_record' });
    throw new Error('account_authority_local_metadata_invalid');
  }
  return parseOrThrow(log, 'local_store receipt_invalid', 'account_authority_local_metadata_invalid', () => {
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
  });
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

function parseDurableDestructive(
  value: unknown,
  operationKindValue: AccountAuthorityOperationKind,
  log: AccountAuthorityLogger,
): DurableDestructive | null {
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
  const receipt = value.receipt === null ? null : receiptToDurable(receiptFromDurable(value.receipt, log));
  return Object.freeze({
    kind: value.kind,
    fingerprint: value.fingerprint,
    owner: parseDurableOwner(value.owner),
    expectedGeneration: value.expectedGeneration,
    stage: value.stage,
    receipt,
  });
}

function parseMetadata(raw: string | null, log: AccountAuthorityLogger): DurableMetadata {
  if (raw === null) {
    log.info('local_store metadata_genesis');
    return Object.freeze({ generation: 0, operations: Object.freeze([]) });
  }
  const value: unknown = parseOrThrow(
    log,
    'local_store metadata_json_invalid',
    'account_authority_local_metadata_invalid',
    () => JSON.parse(raw) as unknown,
  );
  if (
    !isRecord(value)
    || !exactKeys(value, ['schemaVersion', 'generation', 'operations'])
    || value.schemaVersion !== LOCAL_METADATA_SCHEMA
    || !safeInteger(value.generation)
    || !Array.isArray(value.operations)
    || value.operations.length > MAX_DURABLE_OPERATIONS
  ) {
    log.warn('local_store metadata_invalid', { reason: 'envelope' });
    throw new Error('account_authority_local_metadata_invalid');
  }
  const seen = new Set<string>();
  const operations = value.operations.map((entry): DurableOperation => {
    const operation = parseDurableOperation(entry, log);
    if (seen.has(operation.operationId)) throw new Error('account_authority_local_metadata_invalid');
    seen.add(operation.operationId);
    return operation;
  });
  log.info('local_store metadata_loaded', { generation: value.generation, operations: operations.length });
  return Object.freeze({ generation: value.generation, operations: Object.freeze(operations) });
}

function parseDurableOperation(entry: unknown, log: AccountAuthorityLogger): DurableOperation {
  if (
    !isRecord(entry)
    || !exactKeys(entry, ['operationId', 'kind', 'destructive'])
    || !operationKind(entry.kind)
  ) throw new Error('account_authority_local_metadata_invalid');
  const operationId = parseOperationId(entry.operationId).value;
  const destructive = parseDurableDestructive(entry.destructive, entry.kind, log);
  if (destructive === null && destructiveKind(entry.kind)) {
    throw new Error('account_authority_local_metadata_invalid');
  }
  return Object.freeze({ operationId, kind: entry.kind, destructive });
}

/**
 * AA S4b (п. 3): очистка журнала. Незавершённые разрушающие операции (нужны
 * восстановлению прерванных выхода/удаления/вытеснения) не трогаются никогда.
 * Сначала уходят старые завершённые квитанции сверх MAX_JOURNAL_RECEIPTS,
 * затем при переполнении — старые неразрушающие (вход/продление/фиксация),
 * затем старые завершённые разрушающие.
 */
export function pruneOperationJournal(operations: readonly DurableOperation[]): readonly DurableOperation[] {
  let next = [...operations];
  const completed = next.filter((entry) => entry.destructive !== null && entry.destructive.receipt !== null);
  const excessReceipts = completed.length - MAX_JOURNAL_RECEIPTS;
  if (excessReceipts > 0) {
    const drop = new Set(completed.slice(0, excessReceipts).map((entry) => entry.operationId));
    next = next.filter((entry) => !drop.has(entry.operationId));
  }
  const dropFirst = (predicate: (entry: DurableOperation) => boolean): boolean => {
    const index = next.findIndex(predicate);
    if (index < 0) return false;
    next.splice(index, 1);
    return true;
  };
  while (next.length > MAX_JOURNAL_OPERATIONS) {
    if (dropFirst((entry) => entry.destructive === null)) continue;
    if (dropFirst((entry) => entry.destructive !== null && entry.destructive.receipt !== null)) continue;
    break;
  }
  return Object.freeze(next);
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

function destructiveRecord(
  value: DurableDestructive,
  log: AccountAuthorityLogger,
): AccountAuthorityDestructiveOperationRecord {
  const receipt = value.receipt === null ? undefined : receiptFromDurable(value.receipt, log);
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


type DurableLocalStore = Readonly<{
  port: AccountAuthorityLocalStorePort;
  /** S4a: удаления, локально применённые, но без квитанции (процесс убит до конца). */
  interruptedDeletes(): readonly InterruptedDelete[];
}>;

function createDurableLocalStore(input: Readonly<{
  secureStore: AccountAuthoritySecureStorePort;
  storageAdapter: ScopeStorageAdapter;
  log: AccountAuthorityLogger;
  reportCritical?: (event: string, code: string) => void;
}>): DurableLocalStore {
  const log = input.log;
  const options = secureOptions(input.secureStore);
  /*
   * AA S4b (п. 3): журнал операций v2. Поколение — свой ключ, каждая операция —
   * свой слот (account_authority_durable_slots: ≤ 2048 Б на значение, номера
   * не переиспользуются, нечитаемая запись не валит хранилище). Почему всё ещё
   * SecureStore: порт синхронный (заборы поколения и резервирование операций
   * обязаны быть надёжными ДО ответа), а AsyncStorage асинхронный; секретов в
   * журнале нет (id аккаунта/сессии/операции, поколение) — храним «только на
   * этом устройстве», как раньше.
   */
  const journal = createDurableSlotList<DurableOperation>({
    secureStore: input.secureStore,
    options,
    log,
    prefix: OPERATION_JOURNAL_PREFIX,
    schema: OPERATION_JOURNAL_SCHEMA,
    max: MAX_JOURNAL_OPERATIONS,
    label: 'journal',
    invalidCode: 'account_authority_local_metadata_invalid',
    fullCode: 'account_authority_operation_store_full',
    unavailableCode: 'account_authority_local_metadata_unavailable',
    parse: (value) => parseDurableOperation(value, log),
    keyOf: (operation) => operation.operationId,
    reportCritical: input.reportCritical,
  });
  const writeGeneration = (generation: number): void => {
    const encoded = JSON.stringify({ schemaVersion: LOCAL_METADATA_V2_SCHEMA, generation });
    input.secureStore.setItem(LOCAL_METADATA_V2_KEY, encoded, options);
    if (input.secureStore.getItem(LOCAL_METADATA_V2_KEY, options) !== encoded) {
      log.warn('local_store persist_verify_failed', { code: 'account_authority_local_metadata_unavailable' });
      throw new Error('account_authority_local_metadata_unavailable');
    }
  };
  const upsertOperation = (operation: DurableOperation, overCapacity = false): void => {
    const current = journal.find(operation.operationId);
    if (current === null) journal.add(operation, { overCapacity });
    else if (JSON.stringify(current) !== JSON.stringify(operation)) journal.replace(operation);
  };
  const isOpenDestructive = (operation: DurableOperation): boolean => (
    operation.destructive !== null && operation.destructive.receipt === null
  );
  let metadata: DurableMetadata;
  const rawV2 = input.secureStore.getItem(LOCAL_METADATA_V2_KEY, options);
  const rawV1 = input.secureStore.getItem(LOCAL_METADATA_KEY, options);
  if (rawV2 !== null) {
    const generation = parseOrThrow(log, 'local_store metadata_invalid', 'account_authority_local_metadata_invalid', () => {
      const value: unknown = JSON.parse(rawV2);
      if (!isRecord(value) || !exactKeys(value, ['schemaVersion', 'generation'])
        || value.schemaVersion !== LOCAL_METADATA_V2_SCHEMA || !safeInteger(value.generation)) {
        throw new Error('invalid');
      }
      return value.generation as number;
    });
    metadata = Object.freeze({ generation, operations: journal.values() });
    log.info('[AA-S4] journal loaded', { generation, operations: metadata.operations.length, source: 'v2' });
  } else {
    // Перенос v1 → v2 (или первый запуск). Незавершённые разрушающие операции
    // переносятся все: по ним восстанавливаются прерванные удаления/выходы.
    const legacy = parseMetadata(rawV1, log);
    const kept = pruneOperationJournal(legacy.operations);
    // зачем (S4b раунд 2, L-3): незавершённых разрушающих в v1 может быть больше
    // предела журнала — они переносятся ВСЕ (иначе потерялось бы восстановление
    // прерванных удалений), сверх ёмкости; отказ — только если физически не
    // влезают в индекс слотов (громкая тревога, отказ закрыто).
    const openDestructive = kept.filter(isOpenDestructive).length;
    if (openDestructive > journal.indexLimit()) {
      log.warn('[AA-S4] journal migration_overflow', { count: openDestructive, limit: journal.indexLimit() });
      try {
        input.reportCritical?.('aa_s4:journal migration_overflow', 'account_authority_local_metadata_unavailable');
      } catch (error) {
        log.warn('[AA-S4] journal critical_report_failed', failureFields(error));
      }
      throw new Error('account_authority_local_metadata_unavailable');
    }
    for (const operation of kept) upsertOperation(operation, isOpenDestructive(operation));
    writeGeneration(legacy.generation);
    metadata = Object.freeze({ generation: legacy.generation, operations: journal.values() });
    log.info('[AA-S4] journal migrated', {
      source: rawV1 === null ? 'genesis' : 'v1', operations: kept.length, dropped: legacy.operations.length - kept.length,
    });
  }
  if (rawV1 !== null) {
    // guard-ok: v2 уже записан с проверкой; старый ключ — только мусор, отказ логируется.
    void input.secureStore.deleteItemAsync(LOCAL_METADATA_KEY, options).then(
      () => log.info('[AA-S4] journal v1_removed'),
      (error: unknown) => log.warn('[AA-S4] journal v1_remove_failed', failureFields(error)),
    );
  }
  const scopeStore = createAccountScopeStore(input.storageAdapter);
  let openScope: AccountAuthorityLocalScope | null = null;
  let openHandle: AccountScopeHandle | null = null;

  /*
   * AA S4a: удаление аккаунта local-first.
   * clearAccountData — СИНХРОННО ставит надгробие (accountId в очередь стирания,
   * запись SecureStore с проверкой чтением). С этого момента область аккаунта
   * нельзя открыть (openScope отказывает) — поздний ответ сервера/входа не
   * «воскресит» данные (last-write-guard). Само стирание — асинхронное и
   * идемпотентное (eraseClosedAccountScope: already_absent = успех), ждёт
   * закрытия области, повторяется при закрытии и при каждом старте процесса.
   */
  const eraseSlots = createDurableSlotList<string>({
    secureStore: input.secureStore,
    options,
    log,
    prefix: LOCAL_ERASE_QUEUE_PREFIX,
    schema: LOCAL_ERASE_QUEUE_SCHEMA,
    max: MAX_LOCAL_ERASE_QUEUE,
    label: 'local_erase',
    invalidCode: 'account_authority_local_erase_queue_invalid',
    fullCode: 'account_authority_local_erase_queue_full',
    unavailableCode: 'account_authority_local_erase_unavailable',
    parse: (value) => parseAccountId(value).value,
    keyOf: (value) => value,
    reportCritical: input.reportCritical,
  });
  let eraseQueue: readonly string[] = eraseSlots.values();
  let eraseInFlight: Promise<void> | null = null;
  let eraseRequested = false;
  const eraseOne = async (account: string): Promise<void> => {
    if (openScope !== null && openScope.accountId.value === account) {
      log.info('[AA-S4] local_erase deferred', { reason: 'scope_open' });
      return;
    }
    let outcome: string;
    try {
      const evidence = await scopeStore.eraseClosedAccountScope(Object.freeze({
        kind: 'account' as const,
        uid: account,
        scopeKey: `account:${account}` as const,
      }));
      outcome = evidence.outcome;
    } catch (error) {
      log.warn('[AA-S4] local_erase failed_kept', failureFields(error));
      return;
    }
    try {
      eraseSlots.remove(account);
      eraseQueue = eraseSlots.values();
    } catch (error) {
      // Стёрто, но надгробие не снялось — следующий проход повторит (already_absent).
      log.warn('[AA-S4] local_erase tombstone_clear_failed', failureFields(error));
      return;
    }
    log.info('[AA-S4] local_erase done', { result: outcome, left: eraseQueue.length });
  };
  const drainLocalErasures = (trigger: 'clear' | 'close' | 'startup'): void => {
    if (eraseQueue.length === 0) {
      log.info('[AA-S4] local_erase idle', { source: trigger });
      return;
    }
    if (eraseInFlight !== null) {
      eraseRequested = true;
      log.info('[AA-S4] local_erase joined', { source: trigger });
      return;
    }
    log.info('[AA-S4] local_erase start', { source: trigger, pending: eraseQueue.length });
    const run = (async () => {
      for (const account of [...eraseQueue]) await eraseOne(account);
    })();
    eraseInFlight = run;
    void run.then(
      () => {
        eraseInFlight = null;
        if (eraseRequested) {
          eraseRequested = false;
          drainLocalErasures('clear');
        }
      },
      (error: unknown) => {
        eraseInFlight = null;
        log.warn('[AA-S4] local_erase run_failed', failureFields(error));
      },
    );
  };

  // AA S4b: запись журнала — поколение и изменённые операции по отдельности,
  // после очистки (pruneOperationJournal).
  const persist = (requested: DurableMetadata): void => {
    const operations = pruneOperationJournal(requested.operations);
    if (requested.generation !== metadata.generation) writeGeneration(requested.generation);
    const keep = new Set(operations.map((operation) => operation.operationId));
    for (const operation of metadata.operations) {
      if (!keep.has(operation.operationId)) journal.remove(operation.operationId);
    }
    for (const operation of operations) upsertOperation(operation);
    metadata = Object.freeze({ generation: requested.generation, operations });
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
      return operation?.destructive ? destructiveRecord(operation.destructive, log) : null;
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
      // AA S4b: место освобождает очистка; полон журнал только из незавершённых разрушающих.
      const pruned = pruneOperationJournal([...metadata.operations, Object.freeze({ operationId: id, kind, destructive: durable })]);
      if (pruned.length > MAX_JOURNAL_OPERATIONS || !pruned.some((entry) => entry.operationId === id)) {
        log.warn('local_store reserve_rejected', { reason: 'store_full', limit: MAX_JOURNAL_OPERATIONS });
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
      if (target.generation.value !== metadata.generation) {
        log.warn('local_store open_scope_rejected', {
          reason: 'generation_mismatch', target: target.generation.value, durable: metadata.generation,
        });
        throw new Error('account_authority_generation_regression');
      }
      // зачем (AA S4a): надгробие — данные удалённого аккаунта не открываются,
      // пока стиратель их не дочистил (поздний ответ не воскрешает аккаунт).
      if (eraseQueue.includes(target.accountId.value)) {
        log.warn('[AA-S4] local_store open_scope_rejected', { reason: 'account_tombstoned' });
        drainLocalErasures('close');
        throw new Error('account_authority_account_tombstoned');
      }
      if (openScope !== null) {
        if (sameScope(openScope, target)) {
          log.info('local_store open_scope_already_open');
          return;
        }
        log.warn('local_store open_scope_rejected', { reason: 'scope_busy' });
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
        log.warn('local_store open_scope_metadata_failed', failureFields(error));
        try {
          await scopeStore.close(fence);
        } catch (closeError) {
          // зачем (AA S0): раньше сбой компенсирующего закрытия глушился немым
          // .catch(() => undefined). Наружу по-прежнему уходит исходная ошибка
          // открытия (её видит runtime), но причина незакрытого scope теперь в логе.
          log.warn('local_store open_scope_compensation_close_failed', failureFields(closeError));
        }
        throw error;
      }
      openScope = target;
      openHandle = handle;
      log.info('local_store scope_opened', { generation: target.generation.value });
    },
    closeScope: async (scope) => {
      if (openScope === null || !sameScope(openScope, scope)) {
        log.warn('local_store close_scope_rejected', { reason: openScope === null ? 'none_open' : 'stale' });
        throw new Error('account_authority_scope_stale');
      }
      const target = openScope;
      await scopeStore.close(makeFence(target));
      openScope = null;
      openHandle = null;
      log.info('local_store scope_closed', { generation: target.generation.value });
      // S4a: закрыли область удалённого аккаунта — стиратель может дочистить.
      if (eraseQueue.includes(target.accountId.value)) drainLocalErasures('close');
    },
    clearAccountData: (accountId: AccountId) => {
      // зачем (AA S4a): порт синхронный — синхронно только надгробие (надёжная
      // запись), а нативное стирание (асинхронное) догоняет фоном. UI сразу
      // видит «удалено»: runtime коммитит local_deleted, область не откроется.
      const account = parseAccountId(accountId.value).value;
      if (eraseQueue.includes(account)) {
        log.info('[AA-S4] local_erase tombstone', { result: 'already_present', pending: eraseQueue.length });
      } else {
        if (eraseQueue.length >= MAX_LOCAL_ERASE_QUEUE) {
          log.warn('[AA-S4] local_erase tombstone_rejected', { reason: 'queue_full', limit: MAX_LOCAL_ERASE_QUEUE });
          throw new Error('account_authority_local_erase_queue_full');
        }
        eraseSlots.add(account);
        eraseQueue = eraseSlots.values();
        log.info('[AA-S4] local_erase tombstone', { result: 'written', pending: eraseQueue.length });
      }
      // Стирание — после текущего такта: runtime ещё закроет область этим же действием.
      Promise.resolve().then(() => drainLocalErasures('clear'), (error: unknown) => {
        log.warn('[AA-S4] local_erase schedule_failed', failureFields(error));
      });
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
  // S4a: процесс убили посреди стирания — дочищаем на старте (область закрыта).
  if (eraseQueue.length > 0) drainLocalErasures('startup');
  const interruptedDeletes = (): readonly InterruptedDelete[] => Object.freeze(metadata.operations
    .filter((entry) => entry.kind === 'delete'
      && entry.destructive !== null
      && entry.destructive.stage === 'local_applied'
      && entry.destructive.receipt === null
      && entry.destructive.owner !== null)
    .map((entry) => Object.freeze({
      operationId: entry.operationId,
      owner: entry.destructive?.owner as DurableOwner,
    })));
  return Object.freeze({ port: Object.freeze(port), interruptedDeletes });
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
  logger?: AccountAuthorityLogger;
}>): AccountAuthorityLeaseRevisionStore {
  const log = safeAccountAuthorityLogger(input.logger);
  const options = secureOptions(input.secureStore);
  const writeVerified = async (key: string, encoded: string): Promise<void> => {
    await input.secureStore.setItemAsync(key, encoded, options);
    if (await input.secureStore.getItemAsync(key, options) !== encoded) {
      log.warn('revision_store write_verify_failed', { code: 'account_authority_lease_revision_unavailable' });
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
    if (raw === null) {
      log.info('revision_store lease_record_missing');
      return null;
    }
    return parseOrThrow(log, 'revision_store lease_record_invalid', 'account_authority_lease_revision_unavailable', () => {
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
    });
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
      if (raw === null) {
        log.info('revision_store uid_revision_missing');
        return null;
      }
      return parseOrThrow(log, 'revision_store uid_revision_invalid', 'account_authority_lease_revision_unavailable', () => {
        const value: unknown = JSON.parse(raw);
        if (
          !isRecord(value)
          || !exactKeys(value, ['schemaVersion', 'uidHash', 'revision'])
          || value.schemaVersion !== REVISION_SCHEMA
          || value.uidHash !== uidHash
          || !safeInteger(value.revision)
        ) throw new Error('invalid');
        return value.revision;
      });
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
      if (record === null) {
        log.warn('revision_store write_lease_rejected', { reason: 'lease_record_missing' });
        throw new Error('account_authority_lease_revision_unavailable');
      }
      await writeUidRevision(record.uidHash, revision);
      await writeLeaseRecord(owner, record.uidHash, revision);
    },
    // зачем (AA S2c, L-S2b-3): аренда «своя» для uid, если хеш uid в её записи
    // совпадает с хешем этого uid. Записи нет — не своя (проверять нечего).
    leaseOwnedBy: async (owner, firebaseAuthUid) => {
      const record = await readLeaseRecord(owner);
      if (record === null) return false;
      const { uidHash } = await revisionKey(firebaseAuthUid, input.digestSha256);
      return record.uidHash === uidHash;
    },
  };
  return Object.freeze(store);
}

/**
 * Найти uidHash владельца аренды по её записи ревизии (тот uid, что брал
 * аренду). null — записи нет. Битая запись — отказ закрыто.
 */
async function leaseOwnerUidHash(input: Readonly<{
  secureStore: AccountAuthoritySecureStorePort;
  options: object;
  digestSha256(value: string): Promise<string>;
  log: AccountAuthorityLogger;
  owner: LeaseOwner;
}>): Promise<string | null> {
  const { key, ownerHash } = await leaseOwnerKey(input.owner, input.digestSha256);
  const raw = await input.secureStore.getItemAsync(key, input.options);
  if (raw === null) return null;
  return parseOrThrow(input.log, 'binding_credentials lease_record_invalid', 'account_authority_installation_binding_unavailable', () => {
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value)
      || value.ownerHash !== ownerHash
      || typeof value.uidHash !== 'string'
      || !SHA256_HEX.test(value.uidHash)
    ) throw new Error('invalid');
    return value.uidHash;
  });
}

/**
 * зачем (AA S2b, пункт 8): привязка установки хранится ПО UID. Ключ —
 * `binding.v2.<sha256(uid)>` (тот же хеш, что у ревизии аренды, поэтому выход
 * находит привязку по записи своей аренды); сам uid на диск не попадает.
 * Токен и id устройства лежат одним JSON — запись атомарна, полупары нет.
 *
 * Миграция: прежняя пара ключей v1 была ОДНА на установку, и чей это uid —
 * неизвестно. Перенос «первому, кто спросит» вернул бы цикл binding_mismatch
 * при смене A→B, поэтому старая пара читается один раз за процесс и
 * удаляется (лог `binding_credentials legacy_dropped`). Цена — одна новая
 * привязка на установку; на проде привязок нет (rollout сервера выключен).
 */
export function createAccountAuthoritySecureInstallationBindingCredentialStore(input: Readonly<{
  secureStore: AccountAuthoritySecureStorePort;
  digestSha256(value: string): Promise<string>;
  logger?: AccountAuthorityLogger;
}>): AccountAuthorityInstallationBindingCredentialStore {
  const log = safeAccountAuthorityLogger(input.logger);
  const options = secureOptions(input.secureStore);
  let legacyMigration: Promise<void> | null = null;
  const migrateLegacyOnce = (): Promise<void> => {
    if (legacyMigration !== null) return legacyMigration;
    legacyMigration = (async () => {
      const [legacyToken, legacyDevice] = await Promise.all([
        input.secureStore.getItemAsync(BINDING_TOKEN_KEY, options),
        input.secureStore.getItemAsync(DEVICE_BINDING_ID_KEY, options),
      ]);
      if (legacyToken === null && legacyDevice === null) {
        log.info('binding_credentials legacy_check', { result: 'absent' });
        return;
      }
      await input.secureStore.deleteItemAsync(BINDING_TOKEN_KEY, options);
      await input.secureStore.deleteItemAsync(DEVICE_BINDING_ID_KEY, options);
      log.info('binding_credentials legacy_dropped', { reason: 'owner_unknown' });
    })().catch((error: unknown) => {
      // Не сорвать вход из-за уборки: следующая попытка в этом процессе повторит её.
      legacyMigration = null;
      log.warn('binding_credentials legacy_drop_failed', {
        kind: accountAuthorityErrorKind(error),
        code: accountAuthorityErrorCode(error),
      });
    });
    return legacyMigration;
  };
  const parseCredentials = (bindingToken: unknown, deviceBindingId: unknown) => {
    if (
      typeof bindingToken !== 'string'
      || bindingToken.length < 1
      || bindingToken.length > 512
      || bindingToken.trim() !== bindingToken
    ) {
      log.warn('binding_credentials invalid', { reason: bindingToken === null ? 'token_missing' : 'token_malformed' });
      throw new Error('account_authority_installation_binding_unavailable');
    }
    return parseOrThrow(
      log,
      'binding_credentials device_binding_id_invalid',
      'account_authority_installation_binding_unavailable',
      () => Object.freeze({ bindingToken, deviceBindingId: parseDeviceId(deviceBindingId).value }),
    );
  };
  const keyForUidHash = (uidHash: string): string => `${BINDING_KEY_PREFIX}${uidHash}`;
  const keyForUid = async (firebaseAuthUid: FirebaseAuthUid) => {
    const { uidHash } = await revisionKey(firebaseAuthUid, input.digestSha256);
    return Object.freeze({ key: keyForUidHash(uidHash), uidHash });
  };
  const readAt = async (key: string, uidHash: string) => {
    const raw = await input.secureStore.getItemAsync(key, options);
    if (raw === null) {
      log.info('binding_credentials read', { result: 'missing' });
      return null;
    }
    const value = parseOrThrow(log, 'binding_credentials record_invalid', 'account_authority_installation_binding_unavailable', () => {
      const parsed: unknown = JSON.parse(raw);
      if (
        !isRecord(parsed)
        || !exactKeys(parsed, ['schemaVersion', 'uidHash', 'bindingToken', 'deviceBindingId'])
        || parsed.schemaVersion !== BINDING_SCHEMA
        || parsed.uidHash !== uidHash
      ) throw new Error('invalid');
      return parsed;
    });
    const credentials = parseCredentials(value.bindingToken, value.deviceBindingId);
    log.info('binding_credentials read', { result: 'found' });
    return credentials;
  };
  const deleteAt = async (key: string, source: 'uid' | 'lease') => {
    await input.secureStore.deleteItemAsync(key, options);
    if (await input.secureStore.getItemAsync(key, options) !== null) {
      log.warn('binding_credentials clear_verify_failed', { source });
      throw new Error('account_authority_installation_binding_unavailable');
    }
    log.info('binding_credentials cleared', { source });
  };
  const leaseUidHash = (owner: LeaseOwner) => leaseOwnerUidHash({
    secureStore: input.secureStore,
    options,
    digestSha256: input.digestSha256,
    log,
    owner,
  });
  const credentialStore: AccountAuthorityInstallationBindingCredentialStore = {
    read: async (firebaseAuthUid) => {
      await migrateLegacyOnce();
      const { key, uidHash } = await keyForUid(firebaseAuthUid);
      return readAt(key, uidHash);
    },
    readForLease: async (owner) => {
      await migrateLegacyOnce();
      const uidHash = await leaseUidHash(owner);
      if (uidHash === null) {
        log.info('binding_credentials read_for_lease', { result: 'lease_record_missing' });
        return null;
      }
      return readAt(keyForUidHash(uidHash), uidHash);
    },
    write: async (firebaseAuthUid, credentials) => {
      await migrateLegacyOnce();
      const parsed = parseCredentials(credentials.bindingToken, credentials.deviceBindingId);
      const { key, uidHash } = await keyForUid(firebaseAuthUid);
      const encoded = JSON.stringify({
        schemaVersion: BINDING_SCHEMA,
        uidHash,
        bindingToken: parsed.bindingToken,
        deviceBindingId: parsed.deviceBindingId,
      });
      await input.secureStore.setItemAsync(key, encoded, options);
      if (await input.secureStore.getItemAsync(key, options) !== encoded) {
        log.warn('binding_credentials write_verify_failed', { code: 'account_authority_installation_binding_unavailable' });
        throw new Error('account_authority_installation_binding_unavailable');
      }
      log.info('binding_credentials written');
    },
    clear: async (firebaseAuthUid) => {
      const { key } = await keyForUid(firebaseAuthUid);
      await deleteAt(key, 'uid');
    },
    clearForLease: async (owner) => {
      const uidHash = await leaseUidHash(owner);
      if (uidHash === null) {
        log.info('binding_credentials clear_skipped', { reason: 'lease_record_missing' });
        return;
      }
      await deleteAt(keyForUidHash(uidHash), 'lease');
    },
    // зачем (AA S2c, L-S2b-2): ключи промисов привязки в памяти транспорта —
    // тот же хеш uid, что в имени ключа SecureStore; сырой uid в ключ не идёт.
    uidKey: async (firebaseAuthUid) => (await keyForUid(firebaseAuthUid)).uidHash,
    leaseOwnerKey: (owner) => leaseUidHash(owner),
  };
  return Object.freeze(credentialStore);
}

async function installationDeviceId(
  input: AccountAuthorityProductionAdapterDependencies,
  log: AccountAuthorityLogger,
) {
  const options = secureOptions(input.secureStore);
  const existing = await input.secureStore.getItemAsync(INSTALLATION_ID_KEY, options);
  if (existing !== null) {
    if (!UUID_V4.test(existing)) {
      log.warn('bootstrap installation_id_invalid', { source: 'secure_store' });
      throw new Error('account_authority_installation_id_invalid');
    }
    log.info('bootstrap installation_id', { source: 'secure_store' });
    return parseDeviceId(existing);
  }
  const generated = await input.randomInstallationId();
  if (!UUID_V4.test(generated)) {
    log.warn('bootstrap installation_id_invalid', { source: 'generated' });
    throw new Error('account_authority_installation_id_invalid');
  }
  await input.secureStore.setItemAsync(INSTALLATION_ID_KEY, generated, options);
  if (await input.secureStore.getItemAsync(INSTALLATION_ID_KEY, options) !== generated) {
    log.warn('bootstrap installation_id_verify_failed', { code: 'account_authority_installation_id_unavailable' });
    throw new Error('account_authority_installation_id_unavailable');
  }
  log.info('bootstrap installation_id', { source: 'generated' });
  return parseDeviceId(generated);
}

export async function createAccountAuthorityProductionBootstrap(
  dependencies: AccountAuthorityProductionAdapterDependencies,
): Promise<AccountAuthorityProductionBootstrap | null> {
  const log = safeAccountAuthorityLogger(dependencies.logger);
  const storageAdapter = dependencies.createStorageAdapter();
  if (storageAdapter === null) {
    log.info('bootstrap skipped', { reason: 'storage_adapter_unavailable' });
    return null;
  }
  if (
    typeof dependencies.secureStore.getItem !== 'function'
    || typeof dependencies.secureStore.setItem !== 'function'
  ) {
    // Generation and operation reservations are synchronous in the core port;
    // accepting an async-only store would acknowledge non-durable fences.
    log.warn('bootstrap rejected', { reason: 'secure_store_sync_unavailable' });
    throw new Error('account_authority_secure_store_sync_unavailable');
  }
  const deviceId = await installationDeviceId(dependencies, log);
  const revisionStore = createAccountAuthoritySecureRevisionStore({
    secureStore: dependencies.secureStore,
    digestSha256: dependencies.digestSha256,
    logger: log,
  });
  const installationBinding = dependencies.createInstallationBinding({
    installationId: deviceId.value,
    credentials: createAccountAuthoritySecureInstallationBindingCredentialStore({
      secureStore: dependencies.secureStore,
      digestSha256: dependencies.digestSha256,
      logger: log,
    }),
  });
  const durableLocalStore = createDurableLocalStore({
    secureStore: dependencies.secureStore, storageAdapter, log, reportCritical: dependencies.reportCritical,
  });
  // зачем (AA S4a): серверное удаление — через надёжную очередь (local-first).
  const lease = createLocalFirstDeleteLease({
    inner: dependencies.createLease(revisionStore, installationBinding),
    installationBinding,
    secureStore: dependencies.secureStore,
    secureOptions: secureOptions(dependencies.secureStore),
    deviceId,
    interrupted: durableLocalStore.interruptedDeletes(),
    log,
    reportCritical: dependencies.reportCritical,
    firstSendDeadlineMs: dependencies.remoteDeleteFirstSendDeadlineMs,
    nowMs: dependencies.remoteDeleteNowMs,
  });
  const bootstrap = Object.freeze({
    deviceId,
    lease,
    localStore: durableLocalStore.port,
    providerSignOut: dependencies.providerSignOut,
  });
  log.info('bootstrap composed');
  return bootstrap;
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
    // S4a раунд 3: «удаление не завершено» — в журнал, который переживает перезапуск.
    reportCritical: (event: string, code: string) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { DebugLogger } = require('../../app/debug-logger') as typeof import('../../app/debug-logger');
      DebugLogger.error(event, new Error(code), 'critical');
    },
  });
}

/** Native production composition. Unsupported platforms return null; malformed durable state throws. */
export function createAccountAuthorityProductionBootstrapIfPossible(
): Promise<AccountAuthorityProductionBootstrap | null> {
  return createAccountAuthorityProductionBootstrap(productionDependencies());
}
