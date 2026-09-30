import { sameSessionFence, type SessionFence } from './account_session';

export const ACCOUNT_SYNC_LIMITS = Object.freeze({
  maxBatchOperations: 50,
  maxOperationIdUtf8Bytes: 160,
  maxBatchIdUtf8Bytes: 160,
  maxPayloadDepth: 32,
  maxPayloadNodes: 4096,
  maxEnvelopeUtf8Bytes: 131072,
  maxBatchUtf8Bytes: 524288,
} as const);

export type LocalOperationEnvelope = Readonly<{
  schemaVersion: 1;
  operationId: string;
  entityType: 'lesson_progress' | 'flashcard' | 'library_membership';
  entityId: string;
  clientSequence: number;
  baseRevision: number | null;
  payload: unknown;
}>;
export type AccountSyncOwnedOperation = Readonly<{
  ownerUid: string;
  operation: LocalOperationEnvelope;
}>;
// зачем (TG-831C22D22486, TEMP-контракт сервера): conflict и rejected — ОКОНЧАТЕЛЬНЫЕ
// подтверждаемые исходы. Операция уходит из outbox вместе с квитанцией (слой
// разрешения конфликтов читает её там) и НЕ повторяется. Неизвестная форма
// квитанции по-прежнему даёт sync_receipt_invalid: ничего не подтверждается.
export type AccountSyncReceipt = Readonly<{
  operationId: string;
  outcome: 'applied' | 'duplicate' | 'conflict';
  serverRevision: number;
}>;
export type AccountSyncRejectedReceipt = Readonly<{
  operationId: string;
  outcome: 'rejected';
  code: AccountSyncRejectCode;
  serverRevision: number;
}>;
export type AccountSyncServerReceipt = AccountSyncReceipt | AccountSyncRejectedReceipt;
/** Коды rejected-квитанции — ровно серверные ACCOUNTS_V2_REJECT_CODES (сверяет сторож паритета). */
export const ACCOUNT_SYNC_REJECT_CODES = Object.freeze([
  'payload_invalid', 'operation_id_reused', 'entity_state_too_large', 'revision_overflow',
  'srs_time_in_future',
] as const);
export type AccountSyncRejectCode = typeof ACCOUNT_SYNC_REJECT_CODES[number];
/**
 * Почему пакет ушёл в карантин: окончательный отказ (`details.final`), потолок
 * попыток отправки или потолок непроверяемых квитанций (TG-7CD73967EF61, P2).
 */
export type AccountSyncQuarantineCode =
  | 'sync_dispatch_final' | 'sync_dispatch_attempts_exhausted' | 'sync_receipt_invalid_exhausted';
export type AccountSyncBatch = Readonly<{
  batchId: string;
  operations: readonly AccountSyncOwnedOperation[];
}>;
export type AccountSyncFailureCode =
  | 'sync_load_failed' | 'sync_outbox_invalid' | 'sync_operation_conflict'
  | 'sync_dispatch_failed' | 'sync_dispatch_rejected' | 'sync_receipt_invalid'
  | 'sync_ack_commit_failed' | 'sync_ack_commit_invalid'
  | 'sync_quarantine_commit_failed' | 'sync_quarantine_commit_invalid';
export type AccountSyncRetry =
  | Readonly<{ stage: 'load' }>
  | Readonly<{ stage: 'dispatch'; batch: AccountSyncBatch }>
  | Readonly<{ stage: 'ack_commit'; batch: AccountSyncBatch;
      receipts: readonly AccountSyncServerReceipt[] }>
  | Readonly<{ stage: 'quarantine'; batch: AccountSyncBatch;
      quarantineCode: AccountSyncQuarantineCode }>;
export type AccountSyncPhase =
  | Readonly<{ tag: 'idle' }>
  | Readonly<{ tag: 'loading'; attemptEpoch: number }>
  | Readonly<{ tag: 'dispatching'; attemptEpoch: number; batch: AccountSyncBatch }>
  | Readonly<{ tag: 'ack_commit_pending'; attemptEpoch: number;
      batch: AccountSyncBatch; receipts: readonly AccountSyncServerReceipt[] }>
  | Readonly<{ tag: 'quarantine_pending'; attemptEpoch: number;
      batch: AccountSyncBatch; quarantineCode: AccountSyncQuarantineCode }>
  | Readonly<{ tag: 'sync_attention'; code: AccountSyncFailureCode;
      retry: AccountSyncRetry }>
  | Readonly<{ tag: 'stopped' }>;
export type AccountSyncState = Readonly<{
  ownerUid: string;
  fence: SessionFence;
  pendingCount: number;
  attemptEpoch: number;
  phase: AccountSyncPhase;
}>;
export type AccountSyncEvent =
  | Readonly<{ type: 'SYNC_REQUESTED' }>
  | Readonly<{ type: 'OUTBOX_BATCH_LOADED'; expectedFence: SessionFence;
      attemptEpoch: number; batchId: string; operations: readonly unknown[];
      pendingCount: number }>
  | Readonly<{ type: 'OUTBOX_LOAD_FAILED'; expectedFence: SessionFence;
      attemptEpoch: number }>
  | Readonly<{ type: 'DISPATCH_RESPONSE_RECEIVED'; expectedFence: SessionFence;
      attemptEpoch: number; batchId: string; receipts: readonly unknown[] }>
  | Readonly<{ type: 'DISPATCH_FAILED'; expectedFence: SessionFence;
      attemptEpoch: number; batchId: string; reason: 'transport' | 'rejected' }>
  | Readonly<{ type: 'ACK_COMMIT_CONFIRMED'; expectedFence: SessionFence;
      attemptEpoch: number; batchId: string; committedOperationIds: readonly unknown[];
      remainingPendingCountObserved: number }>
  | Readonly<{ type: 'ACK_COMMIT_FAILED'; expectedFence: SessionFence;
      attemptEpoch: number; batchId: string }>
  | Readonly<{ type: 'DISPATCH_QUARANTINE_REQUESTED'; expectedFence: SessionFence;
      attemptEpoch: number; batchId: string; quarantineCode: AccountSyncQuarantineCode }>
  | Readonly<{ type: 'QUARANTINE_COMMIT_CONFIRMED'; expectedFence: SessionFence;
      attemptEpoch: number; batchId: string; quarantinedOperationIds: readonly unknown[];
      remainingPendingCountObserved: number }>
  | Readonly<{ type: 'QUARANTINE_COMMIT_FAILED'; expectedFence: SessionFence;
      attemptEpoch: number; batchId: string }>
  | Readonly<{ type: 'RETRY_REQUESTED' }>
  | Readonly<{ type: 'SESSION_INVALIDATED'; expectedFence: SessionFence }>;
export type AccountSyncEffect =
  | Readonly<{ type: 'LOAD_OUTBOX_BATCH'; ownerUid: string;
      expectedFence: SessionFence; attemptEpoch: number;
      maxOperations: 50; maxBatchUtf8Bytes: 524288 }>
  | Readonly<{ type: 'DISPATCH_OUTBOX_BATCH'; ownerUid: string;
      expectedFence: SessionFence; attemptEpoch: number; batch: AccountSyncBatch }>
  | Readonly<{ type: 'COMMIT_OUTBOX_ACKS'; ownerUid: string;
      expectedFence: SessionFence; attemptEpoch: number; batch: AccountSyncBatch;
      receipts: readonly AccountSyncServerReceipt[] }>
  | Readonly<{ type: 'QUARANTINE_OUTBOX_BATCH'; ownerUid: string;
      expectedFence: SessionFence; attemptEpoch: number; batch: AccountSyncBatch;
      quarantineCode: AccountSyncQuarantineCode }>
  | Readonly<{ type: 'REPORT_SYNC_CONFIRMED'; ownerUid: string;
      expectedFence: SessionFence; attemptEpoch: number; batchId: string;
      confirmedOperationIds: readonly string[]; remainingPendingCountObserved: number }>
  | Readonly<{ type: 'REPORT_SYNC_QUARANTINED'; ownerUid: string;
      expectedFence: SessionFence; attemptEpoch: number; batchId: string;
      quarantinedOperationIds: readonly string[]; quarantineCode: AccountSyncQuarantineCode;
      remainingPendingCountObserved: number }>;
export type AccountSyncReduceResult = Readonly<{
  evidenceKind: 'sync_model_only';
  outcome: 'applied' | 'stale';
  state: AccountSyncState;
  effects: readonly AccountSyncEffect[];
}>;
export type AccountSyncInvariantErrorCode =
  | 'account_sync_invalid_input' | 'account_sync_invalid_event_for_state';

export class AccountSyncInvariantError extends Error {
  declare readonly code: AccountSyncInvariantErrorCode;

  constructor(rawCode: unknown) {
    const code: AccountSyncInvariantErrorCode =
      rawCode === 'account_sync_invalid_event_for_state'
        ? 'account_sync_invalid_event_for_state' : 'account_sync_invalid_input';
    super(code);
    delete this.stack;
    delete (this as Error & { cause?: unknown }).cause;
    Object.defineProperties(this, {
      name: { value: 'AccountSyncInvariantError', enumerable: true,
        writable: false, configurable: false },
      message: { value: code, enumerable: true, writable: false, configurable: false },
      code: { value: code, enumerable: true, writable: false, configurable: false },
    });
    Object.freeze(this);
  }
}

type JsonObject = { readonly [key: string]: JsonValue };
type JsonValue = null | boolean | string | number | readonly JsonValue[] | JsonObject;
type CapturedRecord = Readonly<{
  keys: readonly string[];
  values: ReadonlyMap<string, unknown>;
}>;
type ArraySnapshot = Readonly<{ values: readonly unknown[] }>;

class ContentInvalid extends Error {
  constructor(readonly kind: 'invalid' | 'conflict' = 'invalid') {
    super('content_invalid');
  }
}

const EMPTY_EFFECTS: readonly AccountSyncEffect[] = Object.freeze([]);
const ENTITY_TYPES = Object.freeze([
  'lesson_progress', 'flashcard', 'library_membership',
] as const);
const FAILURE_CODES = Object.freeze([
  'sync_load_failed', 'sync_outbox_invalid', 'sync_operation_conflict',
  'sync_dispatch_failed', 'sync_dispatch_rejected', 'sync_receipt_invalid',
  'sync_ack_commit_failed', 'sync_ack_commit_invalid',
  'sync_quarantine_commit_failed', 'sync_quarantine_commit_invalid',
] as const);

function invalidInput(): never {
  throw new AccountSyncInvariantError('account_sync_invalid_input');
}

function invalidEvent(): never {
  throw new AccountSyncInvariantError('account_sync_invalid_event_for_state');
}

function safeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function identityString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.trim() === value;
}

function entityIdString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function stringWireBytes(value: string, maximum = Number.MAX_SAFE_INTEGER): number {
  let bytes = 2;
  if (bytes > maximum) throw new ContentInvalid();
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit === 0x22 || unit === 0x5c) bytes += 2;
    else if (unit === 0x08 || unit === 0x09 || unit === 0x0a
      || unit === 0x0c || unit === 0x0d) bytes += 2;
    else if (unit < 0x20) bytes += 6;
    else if (unit < 0x80) bytes += 1;
    else if (unit < 0x800) bytes += 2;
    else if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = index + 1 < value.length ? value.charCodeAt(index + 1) : -1;
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        index += 1;
      } else bytes += 6;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) bytes += 6;
    else bytes += 3;
    if (bytes > maximum) throw new ContentInvalid();
  }
  return bytes;
}

function boundedId(value: unknown, maxBytes: number): value is string {
  if (!identityString(value)) return false;
  try {
    return stringWireBytes(value, maxBytes + 2) - 2 <= maxBytes;
  } catch {
    return false;
  }
}

function frozenDataDescriptor(descriptor: PropertyDescriptor): boolean {
  return descriptor.configurable === false && descriptor.writable === false;
}

function captureRecordShape(
  value: unknown,
  maximumKeys: number,
  requireFrozen = false,
): CapturedRecord {
  try {
    if (typeof value !== 'object' || value === null) invalidInput();
    const prototype = Reflect.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) invalidInput();
    if (requireFrozen && Reflect.isExtensible(value)) invalidInput();
    const keys = Reflect.ownKeys(value);
    if (keys.length > maximumKeys || keys.some((key) => typeof key !== 'string')) invalidInput();
    const values = new Map<string, unknown>();
    for (const key of keys) {
      const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !descriptor.enumerable
        || !('value' in descriptor) || descriptor.get !== undefined || descriptor.set !== undefined
        || (requireFrozen && !frozenDataDescriptor(descriptor))) {
        invalidInput();
      }
      values.set(key as string, descriptor.value);
    }
    return Object.freeze({ keys: Object.freeze(keys as string[]), values });
  } catch (error) {
    if (error instanceof AccountSyncInvariantError) throw error;
    return invalidInput();
  }
}

function expectExactKeys(captured: CapturedRecord, exactKeys: readonly string[]): CapturedRecord {
  if (captured.keys.length !== exactKeys.length
    || captured.keys.some((key) => !exactKeys.includes(key))) invalidInput();
  return captured;
}

function captureRecord(
  value: unknown,
  exactKeys: readonly string[],
  requireFrozen = false,
): CapturedRecord {
  return expectExactKeys(captureRecordShape(value, exactKeys.length, requireFrozen), exactKeys);
}

function requireValue(captured: CapturedRecord, key: string): unknown {
  if (!captured.values.has(key)) return invalidInput();
  return captured.values.get(key);
}

function captureArray(value: unknown, maxLength: number, requireFrozen = false): ArraySnapshot {
  try {
    if (!Array.isArray(value)) invalidInput();
    if (Reflect.getPrototypeOf(value) !== Array.prototype) invalidInput();
    if (requireFrozen && Reflect.isExtensible(value)) invalidInput();
    const keys = Reflect.ownKeys(value);
    if (keys.length > maxLength + 1 || keys.some((key) => typeof key !== 'string')) invalidInput();
    const lengthDescriptor = Reflect.getOwnPropertyDescriptor(value, 'length');
    if (lengthDescriptor === undefined || !('value' in lengthDescriptor)
      || lengthDescriptor.enumerable || !safeInteger(lengthDescriptor.value)
      || lengthDescriptor.value > maxLength || keys.length !== lengthDescriptor.value + 1
      || (requireFrozen && (!frozenDataDescriptor(lengthDescriptor)))) {
      invalidInput();
    }
    const length = lengthDescriptor.value;
    const keySet = new Set(keys as string[]);
    if (!keySet.has('length')) invalidInput();
    const captured: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const key = String(index);
      if (!keySet.has(key)) invalidInput();
      const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)
        || descriptor.get !== undefined || descriptor.set !== undefined
        || (requireFrozen && !frozenDataDescriptor(descriptor))) invalidInput();
      captured.push(descriptor.value);
    }
    return Object.freeze({ values: Object.freeze(captured) });
  } catch (error) {
    if (error instanceof AccountSyncInvariantError) throw error;
    return invalidInput();
  }
}

function copyFence(value: unknown, ownerUid: string | null, requireFrozen = false): SessionFence {
  const fields = captureRecord(value, ['scopeKey', 'uid', 'generation', 'nonce'], requireFrozen);
  const scopeKey = requireValue(fields, 'scopeKey');
  const uid = requireValue(fields, 'uid');
  const generation = requireValue(fields, 'generation');
  const nonce = requireValue(fields, 'nonce');
  if (!identityString(scopeKey) || (uid !== null && !identityString(uid))
    || !safeInteger(generation) || !identityString(nonce)) invalidInput();
  if (ownerUid !== null && (uid !== ownerUid || scopeKey !== `account:${ownerUid}`)) invalidInput();
  // зачем: SessionFence.scopeKey стал шаблонным типом (`account:${string}` | `guest:${string}`)
  // в account_session.ts; значение проверено выше, приведение только для типов.
  return Object.freeze({ scopeKey: scopeKey as SessionFence['scopeKey'], uid, generation, nonce });
}

function freezeOwned<T>(value: T, seen = new Set<unknown>()): T {
  if (typeof value !== 'object' || value === null || seen.has(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
    if (descriptor !== undefined && 'value' in descriptor) freezeOwned(descriptor.value, seen);
  }
  return Object.freeze(value);
}

type JsonBudget = { nodes: number };

function captureJson(
  value: unknown,
  requireFrozen: boolean,
  budget: JsonBudget,
  ancestors: Set<object>,
  parentDepth: number,
  maximumBytes: number,
): Readonly<{ value: JsonValue; bytes: number }> {
  budget.nodes += 1;
  if (budget.nodes > ACCOUNT_SYNC_LIMITS.maxPayloadNodes) throw new ContentInvalid();
  if (value === null) {
    if (4 > maximumBytes) throw new ContentInvalid();
    return Object.freeze({ value: null, bytes: 4 });
  }
  if (typeof value === 'boolean') {
    const bytes = value ? 4 : 5;
    if (bytes > maximumBytes) throw new ContentInvalid();
    return Object.freeze({ value, bytes });
  }
  if (typeof value === 'string') {
    return Object.freeze({ value, bytes: stringWireBytes(value, maximumBytes) });
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new ContentInvalid();
    const normalized = Object.is(value, -0) ? 0 : value;
    const bytes = String(normalized).length;
    if (bytes > maximumBytes) throw new ContentInvalid();
    return Object.freeze({ value: normalized, bytes });
  }
  if (typeof value !== 'object' || value === null) throw new ContentInvalid();
  const depth = parentDepth + 1;
  if (depth > ACCOUNT_SYNC_LIMITS.maxPayloadDepth || ancestors.has(value)) {
    throw new ContentInvalid();
  }
  try {
    const prototype = Reflect.getPrototypeOf(value);
    const array = Array.isArray(value);
    if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) {
      throw new ContentInvalid();
    }
    if (requireFrozen && Reflect.isExtensible(value)) throw new ContentInvalid();
    const keys = Reflect.ownKeys(value);
    const remainingNodes = ACCOUNT_SYNC_LIMITS.maxPayloadNodes - budget.nodes;
    const valueKeyCount = array ? keys.length - 1 : keys.length;
    if (valueKeyCount < 0 || valueKeyCount > remainingNodes
      || keys.some((key) => typeof key !== 'string')) throw new ContentInvalid();
    ancestors.add(value);
    if (array) {
      const lengthDescriptor = Reflect.getOwnPropertyDescriptor(value, 'length');
      if (lengthDescriptor === undefined || !('value' in lengthDescriptor)
        || lengthDescriptor.enumerable || !safeInteger(lengthDescriptor.value)
        || keys.length !== lengthDescriptor.value + 1
        || (requireFrozen && !frozenDataDescriptor(lengthDescriptor))) throw new ContentInvalid();
      const length = lengthDescriptor.value;
      let bytes = 2 + Math.max(0, length - 1);
      if (bytes > maximumBytes) throw new ContentInvalid();
      const keySet = new Set(keys as string[]);
      if (!keySet.has('length')) throw new ContentInvalid();
      const descriptors: PropertyDescriptor[] = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = Reflect.getOwnPropertyDescriptor(value, String(index));
        if (!keySet.has(String(index)) || descriptor === undefined || !descriptor.enumerable
          || !('value' in descriptor) || descriptor.get !== undefined || descriptor.set !== undefined
          || (requireFrozen && !frozenDataDescriptor(descriptor))) {
          throw new ContentInvalid();
        }
        descriptors.push(descriptor);
      }
      const output: JsonValue[] = [];
      for (const descriptor of descriptors) {
        const child = captureJson(
          descriptor.value, requireFrozen, budget, ancestors, depth, maximumBytes - bytes,
        );
        output.push(child.value);
        bytes += child.bytes;
      }
      ancestors.delete(value);
      return Object.freeze({ value: Object.freeze(output), bytes });
    }
    const descriptors: Readonly<{ key: string; value: unknown }>[] = [];
    let bytes = 2 + Math.max(0, keys.length - 1);
    for (const key of keys as string[]) {
      bytes += stringWireBytes(key, maximumBytes - bytes) + 1;
      if (bytes > maximumBytes) throw new ContentInvalid();
    }
    for (const key of keys as string[]) {
      const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)
        || descriptor.get !== undefined || descriptor.set !== undefined
        || (requireFrozen && !frozenDataDescriptor(descriptor))) throw new ContentInvalid();
      descriptors.push(Object.freeze({ key, value: descriptor.value }));
    }
    const output = Object.create(prototype) as Record<string, JsonValue>;
    for (const descriptor of descriptors) {
      const child = captureJson(
        descriptor.value, requireFrozen, budget, ancestors, depth, maximumBytes - bytes,
      );
      Object.defineProperty(output, descriptor.key, {
        value: child.value, enumerable: true, writable: false, configurable: false,
      });
      bytes += child.bytes;
    }
    ancestors.delete(value);
    return Object.freeze({ value: Object.freeze(output) as JsonObject, bytes });
  } catch (error) {
    ancestors.delete(value);
    if (error instanceof ContentInvalid) throw error;
    throw new ContentInvalid();
  }
}

function objectBaseWireBytes(keys: readonly string[]): number {
  return 2 + Math.max(0, keys.length - 1)
    + keys.reduce((total, key) => total + stringWireBytes(key) + 1, 0);
}

function snapshotOperation(
  value: unknown,
  ownerUid: string,
  requireFrozen: boolean,
  maximumOwnedBytes: number,
): Readonly<{ owned: AccountSyncOwnedOperation; bytes: number }> {
  try {
    const ownedFields = captureRecord(value, ['ownerUid', 'operation'], requireFrozen);
    const rawOwner = requireValue(ownedFields, 'ownerUid');
    if (rawOwner !== ownerUid) throw new ContentInvalid();
    const operationFields = captureRecord(requireValue(ownedFields, 'operation'), [
      'schemaVersion', 'operationId', 'entityType', 'entityId',
      'clientSequence', 'baseRevision', 'payload',
    ], requireFrozen);
    const schemaVersion = requireValue(operationFields, 'schemaVersion');
    const operationId = requireValue(operationFields, 'operationId');
    const entityType = requireValue(operationFields, 'entityType');
    const entityId = requireValue(operationFields, 'entityId');
    const clientSequence = requireValue(operationFields, 'clientSequence');
    const baseRevision = requireValue(operationFields, 'baseRevision');
    if (schemaVersion !== 1
      || !boundedId(operationId, ACCOUNT_SYNC_LIMITS.maxOperationIdUtf8Bytes)
      || typeof entityType !== 'string'
      || !ENTITY_TYPES.includes(entityType as typeof ENTITY_TYPES[number])
      || !entityIdString(entityId) || !safeInteger(clientSequence)
      || (baseRevision !== null && !safeInteger(baseRevision))) throw new ContentInvalid();
    let wrapperBase = objectBaseWireBytes(['ownerUid', 'operation']);
    wrapperBase += stringWireBytes(ownerUid, maximumOwnedBytes - wrapperBase);
    if (wrapperBase >= maximumOwnedBytes) throw new ContentInvalid();
    const maximumEnvelopeBytes = Math.min(
      ACCOUNT_SYNC_LIMITS.maxEnvelopeUtf8Bytes,
      maximumOwnedBytes - wrapperBase,
    );
    let envelopeBase = objectBaseWireBytes([
      'schemaVersion', 'operationId', 'entityType', 'entityId',
      'clientSequence', 'baseRevision', 'payload',
    ]);
    const addEnvelopeBytes = (bytes: number): void => {
      if (bytes > maximumEnvelopeBytes - envelopeBase) throw new ContentInvalid();
      envelopeBase += bytes;
    };
    addEnvelopeBytes(1);
    addEnvelopeBytes(stringWireBytes(operationId, maximumEnvelopeBytes - envelopeBase));
    addEnvelopeBytes(stringWireBytes(entityType, maximumEnvelopeBytes - envelopeBase));
    addEnvelopeBytes(stringWireBytes(entityId, maximumEnvelopeBytes - envelopeBase));
    addEnvelopeBytes(String(clientSequence).length);
    addEnvelopeBytes(baseRevision === null ? 4 : String(baseRevision).length);
    if (envelopeBase >= maximumEnvelopeBytes) throw new ContentInvalid();
    const payload = captureJson(
      requireValue(operationFields, 'payload'), requireFrozen, { nodes: 0 }, new Set(), 0,
      maximumEnvelopeBytes - envelopeBase,
    );
    const envelopeBytes = envelopeBase + payload.bytes;
    const operation: LocalOperationEnvelope = Object.freeze({
      schemaVersion: 1,
      operationId,
      entityType: entityType as LocalOperationEnvelope['entityType'],
      entityId,
      clientSequence,
      baseRevision,
      payload: payload.value,
    });
    const owned = Object.freeze({ ownerUid, operation });
    const ownedBytes = wrapperBase + envelopeBytes;
    return Object.freeze({ owned, bytes: ownedBytes });
  } catch (error) {
    if (error instanceof ContentInvalid) throw error;
    throw new ContentInvalid();
  }
}

function jsonEqual(left: JsonValue, right: JsonValue): boolean {
  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) {
    return left === right;
  }
  const leftArray = Array.isArray(left);
  if (leftArray !== Array.isArray(right)) return false;
  if (leftArray) {
    const rightArray = right as readonly JsonValue[];
    return left.length === rightArray.length
      && left.every((value, index) => jsonEqual(value, rightArray[index]));
  }
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) => key === rightKeys[index]
      && jsonEqual((left as JsonObject)[key], (right as JsonObject)[key]));
}

function operationEqual(left: AccountSyncOwnedOperation, right: AccountSyncOwnedOperation): boolean {
  const a = left.operation;
  const b = right.operation;
  return left.ownerUid === right.ownerUid && a.schemaVersion === b.schemaVersion
    && a.operationId === b.operationId && a.entityType === b.entityType
    && a.entityId === b.entityId && a.clientSequence === b.clientSequence
    && a.baseRevision === b.baseRevision
    && jsonEqual(a.payload as JsonValue, b.payload as JsonValue);
}

function snapshotBatch(
  batchId: unknown,
  rawOperations: unknown,
  ownerUid: string,
  requireFrozen: boolean,
): AccountSyncBatch {
  if (!boundedId(batchId, ACCOUNT_SYNC_LIMITS.maxBatchIdUtf8Bytes)) throw new ContentInvalid();
  let rows: ArraySnapshot;
  try {
    rows = captureArray(rawOperations, ACCOUNT_SYNC_LIMITS.maxBatchOperations, requireFrozen);
  } catch {
    throw new ContentInvalid();
  }
  if (rows.values.length === 0) throw new ContentInvalid();
  return snapshotBatchRows(batchId, rows, ownerUid, requireFrozen);
}

function snapshotBatchRows(
  batchId: unknown,
  rows: ArraySnapshot,
  ownerUid: string,
  requireFrozen: boolean,
): AccountSyncBatch {
  if (!boundedId(batchId, ACCOUNT_SYNC_LIMITS.maxBatchIdUtf8Bytes)) throw new ContentInvalid();
  if (rows.values.length === 0) throw new ContentInvalid();
  const operations: AccountSyncOwnedOperation[] = [];
  const byId = new Map<string, AccountSyncOwnedOperation>();
  let batchBytes = objectBaseWireBytes(['batchId', 'operations']);
  batchBytes += stringWireBytes(batchId, ACCOUNT_SYNC_LIMITS.maxBatchUtf8Bytes - batchBytes);
  batchBytes += 2;
  if (batchBytes > ACCOUNT_SYNC_LIMITS.maxBatchUtf8Bytes) throw new ContentInvalid();
  for (const row of rows.values) {
    const commaBytes = operations.length === 0 ? 0 : 1;
    const remaining = ACCOUNT_SYNC_LIMITS.maxBatchUtf8Bytes - batchBytes - commaBytes;
    if (remaining <= 0) throw new ContentInvalid();
    const snapshot = snapshotOperation(row, ownerUid, requireFrozen, remaining);
    const operationId = snapshot.owned.operation.operationId;
    const previous = byId.get(operationId);
    if (previous !== undefined) {
      throw new ContentInvalid(operationEqual(previous, snapshot.owned) ? 'invalid' : 'conflict');
    }
    byId.set(operationId, snapshot.owned);
    operations.push(snapshot.owned);
    batchBytes += commaBytes + snapshot.bytes;
  }
  return Object.freeze({ batchId, operations: Object.freeze(operations) });
}

function snapshotReceipt(value: unknown, requireFrozen: boolean): AccountSyncServerReceipt {
  try {
    // зачем: rejected несёт ровно одно лишнее поле `code`; остальные исходы — ровно три поля.
    const shape = captureRecordShape(value, 4, requireFrozen);
    const rejected = shape.values.get('outcome') === 'rejected';
    const fields = expectExactKeys(shape, rejected
      ? ['operationId', 'outcome', 'code', 'serverRevision']
      : ['operationId', 'outcome', 'serverRevision']);
    const operationId = requireValue(fields, 'operationId');
    const outcome = requireValue(fields, 'outcome');
    const serverRevision = requireValue(fields, 'serverRevision');
    if (!boundedId(operationId, ACCOUNT_SYNC_LIMITS.maxOperationIdUtf8Bytes)
      || !safeInteger(serverRevision)) throw new ContentInvalid();
    if (rejected) {
      const code = requireValue(fields, 'code');
      if (typeof code !== 'string'
        || !ACCOUNT_SYNC_REJECT_CODES.includes(code as AccountSyncRejectCode)) throw new ContentInvalid();
      return Object.freeze({
        operationId, outcome: 'rejected' as const, code: code as AccountSyncRejectCode, serverRevision,
      });
    }
    if (outcome !== 'applied' && outcome !== 'duplicate' && outcome !== 'conflict') {
      throw new ContentInvalid();
    }
    return Object.freeze({ operationId, outcome, serverRevision });
  } catch (error) {
    if (error instanceof ContentInvalid) throw error;
    throw new ContentInvalid();
  }
}

function snapshotReceipts(
  value: unknown,
  batch: AccountSyncBatch,
  requireFrozen: boolean,
): readonly AccountSyncServerReceipt[] {
  let rows: ArraySnapshot;
  try {
    rows = captureArray(value, batch.operations.length, requireFrozen);
  } catch {
    throw new ContentInvalid();
  }
  if (rows.values.length !== batch.operations.length) throw new ContentInvalid();
  const byId = new Map<string, AccountSyncServerReceipt>();
  for (const row of rows.values) {
    const receipt = snapshotReceipt(row, requireFrozen);
    if (byId.has(receipt.operationId)) throw new ContentInvalid();
    byId.set(receipt.operationId, receipt);
  }
  const normalized = batch.operations.map(({ operation }) => {
    const receipt = byId.get(operation.operationId);
    if (receipt === undefined) throw new ContentInvalid();
    return receipt;
  });
  if (byId.size !== batch.operations.length) throw new ContentInvalid();
  return Object.freeze(normalized);
}

function snapshotBatchRecord(value: unknown, ownerUid: string): AccountSyncBatch {
  const fields = captureRecord(value, ['batchId', 'operations'], true);
  return snapshotBatch(
    requireValue(fields, 'batchId'), requireValue(fields, 'operations'), ownerUid, true,
  );
}

function retryMatchesCode(code: AccountSyncFailureCode, stage: AccountSyncRetry['stage']): boolean {
  if (stage === 'load') {
    return code === 'sync_load_failed' || code === 'sync_outbox_invalid'
      || code === 'sync_operation_conflict';
  }
  if (stage === 'dispatch') {
    return code === 'sync_dispatch_failed' || code === 'sync_dispatch_rejected'
      || code === 'sync_receipt_invalid';
  }
  if (stage === 'quarantine') {
    return code === 'sync_quarantine_commit_failed' || code === 'sync_quarantine_commit_invalid';
  }
  return code === 'sync_ack_commit_failed' || code === 'sync_ack_commit_invalid';
}

function quarantineCodeValue(value: unknown): AccountSyncQuarantineCode {
  if (value !== 'sync_dispatch_final' && value !== 'sync_dispatch_attempts_exhausted'
    && value !== 'sync_receipt_invalid_exhausted') {
    return invalidInput();
  }
  return value;
}

function validateState(rawState: AccountSyncState): AccountSyncState {
  const fields = captureRecord(rawState, [
    'ownerUid', 'fence', 'pendingCount', 'attemptEpoch', 'phase',
  ], true);
  const ownerUid = requireValue(fields, 'ownerUid');
  const pendingCount = requireValue(fields, 'pendingCount');
  const attemptEpoch = requireValue(fields, 'attemptEpoch');
  if (!identityString(ownerUid) || !safeInteger(pendingCount) || !safeInteger(attemptEpoch)) {
    return invalidInput();
  }
  const fence = copyFence(requireValue(fields, 'fence'), ownerUid, true);
  const rawPhase = requireValue(fields, 'phase');
  const tagRecord = captureRecordWithKnownTag(rawPhase, true);
  const tag = requireValue(tagRecord, 'tag');
  let phase: AccountSyncPhase;
  if (tag === 'idle' || tag === 'stopped') {
    expectExactKeys(tagRecord, ['tag']);
    phase = Object.freeze({ tag });
  } else if (tag === 'loading') {
    const values = expectExactKeys(tagRecord, ['tag', 'attemptEpoch']);
    const phaseEpoch = requireValue(values, 'attemptEpoch');
    if (!safeInteger(phaseEpoch) || phaseEpoch === 0 || phaseEpoch !== attemptEpoch) invalidInput();
    phase = Object.freeze({ tag, attemptEpoch: phaseEpoch });
  } else if (tag === 'dispatching' || tag === 'ack_commit_pending' || tag === 'quarantine_pending') {
    const expectedKeys = tag === 'dispatching'
      ? ['tag', 'attemptEpoch', 'batch']
      : ['tag', 'attemptEpoch', 'batch', tag === 'quarantine_pending' ? 'quarantineCode' : 'receipts'];
    const values = expectExactKeys(tagRecord, expectedKeys);
    const phaseEpoch = requireValue(values, 'attemptEpoch');
    if (!safeInteger(phaseEpoch) || phaseEpoch === 0 || phaseEpoch !== attemptEpoch) invalidInput();
    const batch = snapshotBatchRecord(requireValue(values, 'batch'), ownerUid);
    if (pendingCount < batch.operations.length) invalidInput();
    if (tag === 'dispatching') phase = Object.freeze({ tag, attemptEpoch: phaseEpoch, batch });
    else if (tag === 'quarantine_pending') {
      phase = Object.freeze({ tag, attemptEpoch: phaseEpoch, batch,
        quarantineCode: quarantineCodeValue(requireValue(values, 'quarantineCode')) });
    } else {
      const receipts = snapshotReceipts(requireValue(values, 'receipts'), batch, true);
      phase = Object.freeze({ tag, attemptEpoch: phaseEpoch, batch, receipts });
    }
  } else if (tag === 'sync_attention') {
    if (attemptEpoch === 0) invalidInput();
    const values = expectExactKeys(tagRecord, ['tag', 'code', 'retry']);
    const code = requireValue(values, 'code');
    if (typeof code !== 'string'
      || !FAILURE_CODES.includes(code as AccountSyncFailureCode)) invalidInput();
    const rawRetry = requireValue(values, 'retry');
    const retryTag = captureRecordWithKnownStage(rawRetry, true);
    const stage = requireValue(retryTag, 'stage');
    let retry: AccountSyncRetry;
    if (stage === 'load') {
      expectExactKeys(retryTag, ['stage']);
      retry = Object.freeze({ stage });
    } else if (stage === 'dispatch' || stage === 'ack_commit') {
      const retryKeys = stage === 'dispatch' ? ['stage', 'batch'] : ['stage', 'batch', 'receipts'];
      const retryValues = expectExactKeys(retryTag, retryKeys);
      const batch = snapshotBatchRecord(requireValue(retryValues, 'batch'), ownerUid);
      if (pendingCount < batch.operations.length) invalidInput();
      if (stage === 'dispatch') retry = Object.freeze({ stage, batch });
      else retry = Object.freeze({ stage, batch,
        receipts: snapshotReceipts(requireValue(retryValues, 'receipts'), batch, true) });
    } else if (stage === 'quarantine') {
      const retryValues = expectExactKeys(retryTag, ['stage', 'batch', 'quarantineCode']);
      const batch = snapshotBatchRecord(requireValue(retryValues, 'batch'), ownerUid);
      if (pendingCount < batch.operations.length) invalidInput();
      retry = Object.freeze({ stage, batch,
        quarantineCode: quarantineCodeValue(requireValue(retryValues, 'quarantineCode')) });
    } else return invalidInput();
    if (!retryMatchesCode(code as AccountSyncFailureCode, retry.stage)) invalidInput();
    phase = Object.freeze({ tag, code: code as AccountSyncFailureCode, retry });
  } else return invalidInput();
  return freezeOwned({ ownerUid, fence, pendingCount, attemptEpoch, phase });
}

function captureRecordWithKnownTag(value: unknown, requireFrozen: boolean): CapturedRecord {
  return captureDiscriminatedRecord(value, 'tag', 4, requireFrozen);
}

function captureRecordWithKnownStage(value: unknown, requireFrozen: boolean): CapturedRecord {
  return captureDiscriminatedRecord(value, 'stage', 3, requireFrozen);
}

function captureDiscriminatedRecord(
  value: unknown,
  discriminant: string,
  maximumKeys: number,
  requireFrozen: boolean,
): CapturedRecord {
  const captured = captureRecordShape(value, maximumKeys, requireFrozen);
  if (!captured.values.has(discriminant)) invalidInput();
  return captured;
}

type CapturedEvent = Readonly<{
  type: AccountSyncEvent['type'];
  values: CapturedRecord;
  expectedFence?: SessionFence;
}>;

const EVENT_KEYS: Readonly<Record<AccountSyncEvent['type'], readonly string[]>> = Object.freeze({
  SYNC_REQUESTED: Object.freeze(['type']),
  OUTBOX_BATCH_LOADED: Object.freeze([
    'type', 'expectedFence', 'attemptEpoch', 'batchId', 'operations', 'pendingCount',
  ]),
  OUTBOX_LOAD_FAILED: Object.freeze(['type', 'expectedFence', 'attemptEpoch']),
  DISPATCH_RESPONSE_RECEIVED: Object.freeze([
    'type', 'expectedFence', 'attemptEpoch', 'batchId', 'receipts',
  ]),
  DISPATCH_FAILED: Object.freeze([
    'type', 'expectedFence', 'attemptEpoch', 'batchId', 'reason',
  ]),
  ACK_COMMIT_CONFIRMED: Object.freeze([
    'type', 'expectedFence', 'attemptEpoch', 'batchId',
    'committedOperationIds', 'remainingPendingCountObserved',
  ]),
  ACK_COMMIT_FAILED: Object.freeze(['type', 'expectedFence', 'attemptEpoch', 'batchId']),
  DISPATCH_QUARANTINE_REQUESTED: Object.freeze([
    'type', 'expectedFence', 'attemptEpoch', 'batchId', 'quarantineCode',
  ]),
  QUARANTINE_COMMIT_CONFIRMED: Object.freeze([
    'type', 'expectedFence', 'attemptEpoch', 'batchId',
    'quarantinedOperationIds', 'remainingPendingCountObserved',
  ]),
  QUARANTINE_COMMIT_FAILED: Object.freeze(['type', 'expectedFence', 'attemptEpoch', 'batchId']),
  RETRY_REQUESTED: Object.freeze(['type']),
  SESSION_INVALIDATED: Object.freeze(['type', 'expectedFence']),
});

function captureEvent(rawEvent: AccountSyncEvent): CapturedEvent {
  const discriminated = captureDiscriminatedRecord(rawEvent, 'type', 6, false);
  const type = requireValue(discriminated, 'type');
  if (typeof type !== 'string' || !(type in EVENT_KEYS)) invalidInput();
  const eventType = type as AccountSyncEvent['type'];
  const values = expectExactKeys(discriminated, EVENT_KEYS[eventType]);
  let expectedFence: SessionFence | undefined;
  if (EVENT_KEYS[eventType].includes('expectedFence')) {
    expectedFence = copyFence(requireValue(values, 'expectedFence'), null);
  }
  if (EVENT_KEYS[eventType].includes('attemptEpoch')
    && !safeInteger(requireValue(values, 'attemptEpoch'))) invalidInput();
  if (EVENT_KEYS[eventType].includes('batchId')
    && !boundedId(requireValue(values, 'batchId'), ACCOUNT_SYNC_LIMITS.maxBatchIdUtf8Bytes)) {
    invalidInput();
  }
  if (eventType === 'OUTBOX_BATCH_LOADED') {
    if (!safeInteger(requireValue(values, 'pendingCount'))
      || !Array.isArray(requireValue(values, 'operations'))) invalidInput();
  }
  if (eventType === 'DISPATCH_RESPONSE_RECEIVED'
    && !Array.isArray(requireValue(values, 'receipts'))) invalidInput();
  if (eventType === 'ACK_COMMIT_CONFIRMED') {
    if (!Array.isArray(requireValue(values, 'committedOperationIds'))
      || !safeInteger(requireValue(values, 'remainingPendingCountObserved'))) invalidInput();
  }
  if (eventType === 'QUARANTINE_COMMIT_CONFIRMED') {
    if (!Array.isArray(requireValue(values, 'quarantinedOperationIds'))
      || !safeInteger(requireValue(values, 'remainingPendingCountObserved'))) invalidInput();
  }
  if (eventType === 'DISPATCH_QUARANTINE_REQUESTED') {
    quarantineCodeValue(requireValue(values, 'quarantineCode'));
  }
  if (eventType === 'DISPATCH_FAILED') {
    const reason = requireValue(values, 'reason');
    if (reason !== 'transport' && reason !== 'rejected') invalidInput();
  }
  return Object.freeze({ type: eventType, values, ...(expectedFence === undefined ? {} : { expectedFence }) });
}

function nextEpoch(value: number): number {
  if (!safeInteger(value) || value === Number.MAX_SAFE_INTEGER) return invalidInput();
  return value + 1;
}

function appliedResult(
  state: AccountSyncState,
  effects: readonly AccountSyncEffect[] = EMPTY_EFFECTS,
): AccountSyncReduceResult {
  return freezeOwned({ evidenceKind: 'sync_model_only' as const, outcome: 'applied' as const,
    state, effects: Object.freeze([...effects]) });
}

function staleResult(inputState: AccountSyncState): AccountSyncReduceResult {
  return Object.freeze({ evidenceKind: 'sync_model_only', outcome: 'stale',
    state: inputState, effects: EMPTY_EFFECTS });
}

function withPhase(
  state: AccountSyncState,
  attemptEpoch: number,
  phase: AccountSyncPhase,
  pendingCount = state.pendingCount,
): AccountSyncState {
  return freezeOwned({ ownerUid: state.ownerUid, fence: state.fence,
    pendingCount, attemptEpoch, phase });
}

function attention(
  state: AccountSyncState,
  code: AccountSyncFailureCode,
  retry: AccountSyncRetry,
  pendingCount = state.pendingCount,
): AccountSyncReduceResult {
  return appliedResult(withPhase(state, state.attemptEpoch,
    freezeOwned({ tag: 'sync_attention' as const, code, retry }), pendingCount));
}

function loadEffect(state: AccountSyncState, attemptEpoch: number): AccountSyncEffect {
  return freezeOwned({ type: 'LOAD_OUTBOX_BATCH' as const, ownerUid: state.ownerUid,
    expectedFence: state.fence, attemptEpoch, maxOperations: 50 as const,
    maxBatchUtf8Bytes: 524288 as const });
}

function dispatchEffect(
  state: AccountSyncState,
  attemptEpoch: number,
  batch: AccountSyncBatch,
): AccountSyncEffect {
  return freezeOwned({ type: 'DISPATCH_OUTBOX_BATCH' as const, ownerUid: state.ownerUid,
    expectedFence: state.fence, attemptEpoch, batch });
}

function ackEffect(
  state: AccountSyncState,
  attemptEpoch: number,
  batch: AccountSyncBatch,
  receiptsValue: readonly AccountSyncServerReceipt[],
): AccountSyncEffect {
  return freezeOwned({ type: 'COMMIT_OUTBOX_ACKS' as const, ownerUid: state.ownerUid,
    expectedFence: state.fence, attemptEpoch, batch, receipts: receiptsValue });
}

function quarantineEffect(
  state: AccountSyncState,
  attemptEpoch: number,
  batch: AccountSyncBatch,
  quarantineCode: AccountSyncQuarantineCode,
): AccountSyncEffect {
  return freezeOwned({ type: 'QUARANTINE_OUTBOX_BATCH' as const, ownerUid: state.ownerUid,
    expectedFence: state.fence, attemptEpoch, batch, quarantineCode });
}

function correlated(
  state: AccountSyncState,
  event: CapturedEvent,
  attemptEpoch?: number,
  batchId?: string,
): boolean {
  if (state.phase.tag === 'stopped' || event.expectedFence === undefined
    || !sameSessionFence(state.fence, event.expectedFence)) return false;
  if (attemptEpoch !== undefined && state.attemptEpoch !== attemptEpoch) return false;
  if (batchId !== undefined) {
    const phaseBatch = state.phase.tag === 'dispatching' || state.phase.tag === 'ack_commit_pending'
      || state.phase.tag === 'quarantine_pending' ? state.phase.batch : null;
    if (phaseBatch === null || phaseBatch.batchId !== batchId) return false;
  }
  return true;
}

export function createInitialAccountSyncState(
  ownerUid: string,
  fence: SessionFence,
  pendingCount: number,
): AccountSyncState {
  try {
    if (!identityString(ownerUid) || !safeInteger(pendingCount)) invalidInput();
    const ownedFence = copyFence(fence, ownerUid);
    return freezeOwned({ ownerUid, fence: ownedFence, pendingCount,
      attemptEpoch: 0, phase: Object.freeze({ tag: 'idle' as const }) });
  } catch (error) {
    if (error instanceof AccountSyncInvariantError) throw error;
    return invalidInput();
  }
}

export function reduceAccountSync(
  inputState: AccountSyncState,
  rawEvent: AccountSyncEvent,
): AccountSyncReduceResult {
  try {
    const state = validateState(inputState);
    const event = captureEvent(rawEvent);
    const value = (key: string): unknown => requireValue(event.values, key);
    if (event.type === 'SYNC_REQUESTED') {
      if (state.phase.tag !== 'idle') return invalidEvent();
      const epoch = nextEpoch(state.attemptEpoch);
      return appliedResult(withPhase(state, epoch,
        Object.freeze({ tag: 'loading', attemptEpoch: epoch })), [loadEffect(state, epoch)]);
    }
    if (event.type === 'RETRY_REQUESTED') {
      if (state.phase.tag !== 'sync_attention') return invalidEvent();
      const epoch = nextEpoch(state.attemptEpoch);
      const retry = state.phase.retry;
      if (retry.stage === 'load') {
        return appliedResult(withPhase(state, epoch,
          Object.freeze({ tag: 'loading', attemptEpoch: epoch })), [loadEffect(state, epoch)]);
      }
      if (retry.stage === 'dispatch') {
        return appliedResult(withPhase(state, epoch,
          Object.freeze({ tag: 'dispatching', attemptEpoch: epoch, batch: retry.batch })),
        [dispatchEffect(state, epoch, retry.batch)]);
      }
      if (retry.stage === 'quarantine') {
        return appliedResult(withPhase(state, epoch, Object.freeze({
          tag: 'quarantine_pending', attemptEpoch: epoch,
          batch: retry.batch, quarantineCode: retry.quarantineCode,
        })), [quarantineEffect(state, epoch, retry.batch, retry.quarantineCode)]);
      }
      return appliedResult(withPhase(state, epoch, Object.freeze({
        tag: 'ack_commit_pending', attemptEpoch: epoch,
        batch: retry.batch, receipts: retry.receipts,
      })), [ackEffect(state, epoch, retry.batch, retry.receipts)]);
    }
    if (event.type === 'SESSION_INVALIDATED') {
      if (!correlated(state, event) || state.phase.tag === 'stopped') return staleResult(inputState);
      return appliedResult(withPhase(state, state.attemptEpoch, Object.freeze({ tag: 'stopped' })));
    }
    const attemptEpoch = value('attemptEpoch') as number;
    if (event.type === 'OUTBOX_BATCH_LOADED') {
      if (state.phase.tag !== 'loading' || !correlated(state, event, attemptEpoch)) {
        return staleResult(inputState);
      }
      const pendingCount = value('pendingCount') as number;
      let rows: ArraySnapshot;
      try {
        rows = captureArray(value('operations'), ACCOUNT_SYNC_LIMITS.maxBatchOperations);
      } catch {
        return attention(state, 'sync_outbox_invalid', Object.freeze({ stage: 'load' }), pendingCount);
      }
      if (rows.values.length === 0) {
        if (pendingCount === 0) {
          return appliedResult(withPhase(state, state.attemptEpoch,
            Object.freeze({ tag: 'idle' }), 0));
        }
        return attention(state, 'sync_outbox_invalid', Object.freeze({ stage: 'load' }), pendingCount);
      }
      if (pendingCount < rows.values.length) {
        return attention(state, 'sync_outbox_invalid', Object.freeze({ stage: 'load' }), pendingCount);
      }
      let batch: AccountSyncBatch;
      try {
        batch = snapshotBatchRows(value('batchId'), rows, state.ownerUid, false);
      } catch (error) {
        const code = error instanceof ContentInvalid && error.kind === 'conflict'
          ? 'sync_operation_conflict' : 'sync_outbox_invalid';
        return attention(state, code, Object.freeze({ stage: 'load' }), pendingCount);
      }
      const epoch = nextEpoch(state.attemptEpoch);
      return appliedResult(withPhase(state, epoch,
        Object.freeze({ tag: 'dispatching', attemptEpoch: epoch, batch }), pendingCount),
      [dispatchEffect(state, epoch, batch)]);
    }
    if (event.type === 'OUTBOX_LOAD_FAILED') {
      if (state.phase.tag !== 'loading' || !correlated(state, event, attemptEpoch)) {
        return staleResult(inputState);
      }
      return attention(state, 'sync_load_failed', Object.freeze({ stage: 'load' }));
    }
    const batchId = value('batchId') as string;
    if (event.type === 'DISPATCH_RESPONSE_RECEIVED') {
      if (state.phase.tag !== 'dispatching'
        || !correlated(state, event, attemptEpoch, batchId)) return staleResult(inputState);
      let normalizedReceipts: readonly AccountSyncServerReceipt[];
      try {
        normalizedReceipts = snapshotReceipts(value('receipts'), state.phase.batch, false);
      } catch {
        return attention(state, 'sync_receipt_invalid', Object.freeze({
          stage: 'dispatch', batch: state.phase.batch,
        }));
      }
      const epoch = nextEpoch(state.attemptEpoch);
      return appliedResult(withPhase(state, epoch, Object.freeze({
        tag: 'ack_commit_pending', attemptEpoch: epoch,
        batch: state.phase.batch, receipts: normalizedReceipts,
      })), [ackEffect(state, epoch, state.phase.batch, normalizedReceipts)]);
    }
    if (event.type === 'DISPATCH_FAILED') {
      if (state.phase.tag !== 'dispatching'
        || !correlated(state, event, attemptEpoch, batchId)) return staleResult(inputState);
      return attention(state, value('reason') === 'rejected'
        ? 'sync_dispatch_rejected' : 'sync_dispatch_failed',
      Object.freeze({ stage: 'dispatch', batch: state.phase.batch }));
    }
    // зачем (TG-831C22D22486): окончательный отказ (details.final) или потолок
    // попыток — пакет уходит в карантин outbox одной транзакцией, а не крутится вечно.
    if (event.type === 'DISPATCH_QUARANTINE_REQUESTED') {
      if (state.phase.tag !== 'dispatching'
        || !correlated(state, event, attemptEpoch, batchId)) return staleResult(inputState);
      const quarantineCode = quarantineCodeValue(value('quarantineCode'));
      const epoch = nextEpoch(state.attemptEpoch);
      return appliedResult(withPhase(state, epoch, Object.freeze({
        tag: 'quarantine_pending', attemptEpoch: epoch, batch: state.phase.batch, quarantineCode,
      })), [quarantineEffect(state, epoch, state.phase.batch, quarantineCode)]);
    }
    if (event.type === 'QUARANTINE_COMMIT_FAILED') {
      if (state.phase.tag !== 'quarantine_pending'
        || !correlated(state, event, attemptEpoch, batchId)) return staleResult(inputState);
      return attention(state, 'sync_quarantine_commit_failed', Object.freeze({
        stage: 'quarantine', batch: state.phase.batch, quarantineCode: state.phase.quarantineCode,
      }));
    }
    if (event.type === 'QUARANTINE_COMMIT_CONFIRMED') {
      if (state.phase.tag !== 'quarantine_pending'
        || !correlated(state, event, attemptEpoch, batchId)) return staleResult(inputState);
      const retryQuarantine = Object.freeze({
        stage: 'quarantine' as const, batch: state.phase.batch, quarantineCode: state.phase.quarantineCode,
      });
      let moved: ArraySnapshot;
      try {
        moved = captureArray(value('quarantinedOperationIds'), state.phase.batch.operations.length);
      } catch {
        return attention(state, 'sync_quarantine_commit_invalid', retryQuarantine);
      }
      const expectedIds = state.phase.batch.operations.map(({ operation }) => operation.operationId);
      if (moved.values.length !== expectedIds.length
        || !moved.values.every((id, index) => typeof id === 'string' && id === expectedIds[index])) {
        return attention(state, 'sync_quarantine_commit_invalid', retryQuarantine);
      }
      const remaining = value('remainingPendingCountObserved') as number;
      return appliedResult(withPhase(state, state.attemptEpoch, Object.freeze({ tag: 'idle' }), remaining), [
        freezeOwned({
          type: 'REPORT_SYNC_QUARANTINED' as const,
          ownerUid: state.ownerUid,
          expectedFence: state.fence,
          attemptEpoch: state.attemptEpoch,
          batchId: state.phase.batch.batchId,
          quarantinedOperationIds: Object.freeze([...expectedIds]),
          quarantineCode: state.phase.quarantineCode,
          remainingPendingCountObserved: remaining,
        }),
      ]);
    }
    if (event.type === 'ACK_COMMIT_FAILED') {
      if (state.phase.tag !== 'ack_commit_pending'
        || !correlated(state, event, attemptEpoch, batchId)) return staleResult(inputState);
      return attention(state, 'sync_ack_commit_failed', Object.freeze({
        stage: 'ack_commit', batch: state.phase.batch, receipts: state.phase.receipts,
      }));
    }
    if (event.type === 'ACK_COMMIT_CONFIRMED') {
      if (state.phase.tag !== 'ack_commit_pending'
        || !correlated(state, event, attemptEpoch, batchId)) return staleResult(inputState);
      let committed: ArraySnapshot;
      try {
        committed = captureArray(value('committedOperationIds'), state.phase.batch.operations.length);
      } catch {
        return attention(state, 'sync_ack_commit_invalid', Object.freeze({
          stage: 'ack_commit', batch: state.phase.batch, receipts: state.phase.receipts,
        }));
      }
      const expectedIds = state.phase.batch.operations.map(({ operation }) => operation.operationId);
      const validIds = committed.values.length === expectedIds.length
        && committed.values.every((id, index) => typeof id === 'string' && id === expectedIds[index]);
      if (!validIds) {
        return attention(state, 'sync_ack_commit_invalid', Object.freeze({
          stage: 'ack_commit', batch: state.phase.batch, receipts: state.phase.receipts,
        }));
      }
      const remaining = value('remainingPendingCountObserved') as number;
      const confirmedOperationIds = Object.freeze([...expectedIds]);
      const nextState = withPhase(state, state.attemptEpoch, Object.freeze({ tag: 'idle' }), remaining);
      const effect = freezeOwned({
        type: 'REPORT_SYNC_CONFIRMED' as const,
        ownerUid: state.ownerUid,
        expectedFence: state.fence,
        attemptEpoch: state.attemptEpoch,
        batchId: state.phase.batch.batchId,
        confirmedOperationIds,
        remainingPendingCountObserved: remaining,
      });
      return appliedResult(nextState, [effect]);
    }
    return invalidInput();
  } catch (error) {
    if (error instanceof AccountSyncInvariantError) throw error;
    return invalidInput();
  }
}
