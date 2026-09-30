import type { SessionFence } from './account_session';
import type {
  AccountScopeHandle,
  AccountScopeTransaction,
  ScopeJson,
  ScopeRecord,
} from './account_scope_store';
import type {
  AccountSyncBatch,
  AccountSyncEffect,
  AccountSyncOwnedOperation,
  AccountSyncServerReceipt,
  AccountSyncWireBatch,
} from './account_sync';
import { accountSyncBatchIdFor, planAccountSyncBatch } from './account_sync_batching';
import {
  normalizeAckEffect,
  normalizeQuarantineEffect,
  snapshotLoadEffect,
} from './account_sync_outbox_effects';
import {
  createAccountSyncOutboxFollowups,
  recordLaterConfirmed,
  updateUnresolvedIndex,
  type AccountSyncOutboxFollowups,
} from './account_sync_outbox_followups';
import { createAccountSyncWireBatch, expiredOf, type NowPair, type Scanned } from './account_sync_outbox_time';
import {
  AccountSyncOutboxError,
  DISPATCH_KEY,
  INITIAL_DISPATCH_STATE,
  META_KEY,
  PREFIX,
  ackJson,
  assertExpectedFence,
  captureExact,
  emptyBatchId,
  fail,
  fullBatchBytes,
  initialMeta,
  jsonWireBytes,
  mapTransactionError,
  metaJson,
  normalizeOperation,
  operationKey,
  parseAck,
  parseDispatch,
  parseMeta,
  parsePending,
  parseQuarantine,
  parseSlot,
  pendingJson,
  quarantineJson,
  receiptNeedsResolution,
  receiptsCompatible,
  safeInteger,
  semanticEqual,
  slotJson,
  slotKey,
  snapshotFence,
  timeRejectionQuarantineCode,
  value,
  type Ack,
  type AccountSyncDispatchState,
  type AccountSyncOutboxQuarantineCode,
  type EnqueueTimes,
  type Meta,
  type Pending,
  type Quarantined,
  type Slot,
} from './account_sync_outbox_records';

export {
  ACCOUNT_SYNC_OPERATION_MAX_AGE_MS,
  AccountSyncOutboxError,
  type AccountSyncDispatchState,
  type AccountSyncOutboxErrorCode,
  type AccountSyncOutboxQuarantineCode,
} from './account_sync_outbox_records';
export type {
  AccountSyncOutboxReplacementPlanner,
  AccountSyncOutboxRequeueResult,
  AccountSyncOutboxResolveContext,
  AccountSyncOutboxResolveResult,
  AccountSyncOutboxUnresolved,
} from './account_sync_outbox_followups';

type LoadEffect = Extract<AccountSyncEffect, { type: 'LOAD_OUTBOX_BATCH' }>;
type AckEffect = Extract<AccountSyncEffect, { type: 'COMMIT_OUTBOX_ACKS' }>;
type QuarantineEffect = Extract<AccountSyncEffect, { type: 'QUARANTINE_OUTBOX_BATCH' }>;

/**
 * Сколько слотов от головы очереди просматривается при сборке пакета.
 * зачем: операции одной сущности собираются в один пакет (TEMP-контракт (а)), для
 * этого нужно видеть очередь дальше 50 операций; окно ограничивает чтения при
 * каждой загрузке. Операция сущности за окном уйдёт следующим пакетом (честный
 * conflict сервера, а не потеря).
 */
export const ACCOUNT_SYNC_OUTBOX_SCAN_WINDOW = 128;
/** Раундов уборки просроченных операций за одну загрузку (каждый — окно). */
const MAX_EXPIRY_ROUNDS = 4;

export type AccountSyncOutboxEnqueueResult = Readonly<{
  outcome: 'enqueued' | 'duplicate' | 'already_acknowledged' | 'quarantined';
  pendingCount: number;
}>;

export type AccountSyncOutboxLoadResult = Readonly<{
  batchId: string;
  operations: readonly AccountSyncOwnedOperation[];
  pendingCount: number;
}>;

export type AccountSyncOutboxAckResult = Readonly<{
  committedOperationIds: readonly string[];
  remainingPendingCountObserved: number;
}>;

export type AccountSyncOutboxQuarantineResult = Readonly<{
  quarantinedOperationIds: readonly string[];
  remainingPendingCountObserved: number;
}>;

export type AccountSyncOutboxOptions = Readonly<{
  /**
   * Часы телефона; по умолчанию Date.now. Срок жизни операции считается по ним
   * С ПОПРАВКОЙ на сохранённое смещение часов сервера (TG-7CD73967EF61, P3).
   */
  nowMs?: () => number;
}>;

export type AccountSyncLocalMutationTransaction = Readonly<{
  readRecord(key: string): Promise<ScopeRecord | null>;
  putRecord(record: ScopeRecord): Promise<void>;
  deleteRecord(key: string): Promise<void>;
}>;

export type AccountSyncLocalMutation = (
  transaction: AccountSyncLocalMutationTransaction,
) => void | Promise<void>;

export type AccountSyncOutbox = Readonly<{
  /** Enqueues a prepared operation only; it does not atomically persist domain state. */
  enqueue(
    operation: AccountSyncOwnedOperation,
    expectedFence: SessionFence,
  ): Promise<AccountSyncOutboxEnqueueResult>;
  /**
   * Runs trusted local-only domain writes and a genuinely new outbox enqueue in the
   * same scoped transaction. The callback must not perform external I/O.
   */
  applyLocalMutation(
    operation: AccountSyncOwnedOperation,
    expectedFence: SessionFence,
    mutation: AccountSyncLocalMutation,
  ): Promise<AccountSyncOutboxEnqueueResult>;
  load(effect: LoadEffect): Promise<AccountSyncOutboxLoadResult>;
  ackCommit(effect: AckEffect): Promise<AccountSyncOutboxAckResult>;
  /** Переносит операции пакета из очереди в карантин (с кодом), одной транзакцией. */
  quarantine(effect: QuarantineEffect): Promise<AccountSyncOutboxQuarantineResult>;
  /**
   * Пакет эффекта отправки в форме провода: операции + enqueuedAtServerMs
   * (TG-DFA918464DFA). Порт dispatch раннера отправляет на callable именно его.
   */
  wireBatch(effect: DispatchEffect): Promise<AccountSyncWireBatch>;
}> & AccountSyncOutboxFollowups;

type DispatchEffect = Extract<AccountSyncEffect, { type: 'DISPATCH_OUTBOX_BATCH' }>;
type Moved = Readonly<{ sequence: number; operationId: string }>;
type Leaving = Readonly<{ sequence: number; envelope: AccountSyncOwnedOperation }> & EnqueueTimes;
/** Строка подтверждения пакета: квитанция в ack либо (отказ по времени) карантин. */
type Settled = Ack & EnqueueTimes;

const EMPTY_OPERATIONS: readonly AccountSyncOwnedOperation[] = Object.freeze([]);

function freezeEnqueue(
  outcome: AccountSyncOutboxEnqueueResult['outcome'],
  pendingCount: number,
): AccountSyncOutboxEnqueueResult {
  return Object.freeze({ outcome, pendingCount });
}

function freezeLoad(
  id: string,
  operations: readonly AccountSyncOwnedOperation[],
  pendingCount: number,
): AccountSyncOutboxLoadResult {
  return Object.freeze({ batchId: id, operations: Object.freeze([...operations]), pendingCount });
}

function freezeIds(ids: readonly string[]): readonly string[] {
  return Object.freeze([...ids]);
}

function strictlyIncreasing(sequences: readonly number[]): boolean {
  return sequences.length > 0 && sequences.every((sequence, index) => (
    index === 0 || sequence > sequences[index - 1]
  ));
}

function entityKey(owned: AccountSyncOwnedOperation): string {
  return JSON.stringify([owned.operation.entityType, owned.operation.entityId]);
}

export function createAccountSyncOutbox(
  handle: AccountScopeHandle,
  options?: AccountSyncOutboxOptions,
): AccountSyncOutbox {
  const handleFields = captureExact(handle, ['scope', 'fence', 'readRecord', 'withTransaction']);
  if (handleFields === null) return fail('account_sync_outbox_invalid_input');
  const scopeFields = captureExact(value(handleFields, 'scope'), ['kind', 'uid', 'scopeKey']);
  const ownerUid = scopeFields === null ? undefined : value(scopeFields, 'uid');
  const scopeKey = scopeFields === null ? undefined : value(scopeFields, 'scopeKey');
  if (scopeFields === null || value(scopeFields, 'kind') !== 'account'
    || typeof ownerUid !== 'string' || ownerUid.length === 0 || ownerUid.trim() !== ownerUid
    || scopeKey !== `account:${ownerUid}`) return fail('account_sync_outbox_invalid_input');
  const boundFence = snapshotFence(value(handleFields, 'fence'));
  if (boundFence.uid !== ownerUid || boundFence.scopeKey !== scopeKey) {
    return fail('account_sync_outbox_invalid_input');
  }
  const withTransaction = value(handleFields, 'withTransaction');
  if (typeof value(handleFields, 'readRecord') !== 'function'
    || typeof withTransaction !== 'function') return fail('account_sync_outbox_invalid_input');
  const clock = options?.nowMs ?? Date.now;
  if (typeof clock !== 'function') return fail('account_sync_outbox_invalid_input');

  const nowMs = (): number => {
    const current = clock();
    if (!safeInteger(current)) {
      console.warn('[ACCOUNTS-V2-CLIENT] outbox_clock_invalid', typeof current);
      return fail('account_sync_outbox_invalid_input');
    }
    return current;
  };

  const transact = async <T>(work: (transaction: AccountScopeTransaction) => Promise<T>): Promise<T> => {
    let output: T | undefined;
    let completed = false;
    try {
      await Reflect.apply(withTransaction, handle, [async (transaction: AccountScopeTransaction) => {
        output = await work(transaction);
        completed = true;
      }]);
    } catch (error) {
      return mapTransactionError(error);
    }
    if (!completed) return fail('account_sync_outbox_transaction_failed');
    return output as T;
  };

  const readMeta = async (transaction: AccountScopeTransaction): Promise<Meta | null> => {
    const record = await transaction.readRecord(META_KEY);
    return record === null ? null : parseMeta(record.value, ownerUid);
  };

  const readDispatch = async (transaction: AccountScopeTransaction): Promise<AccountSyncDispatchState> => {
    const record = await transaction.readRecord(DISPATCH_KEY);
    if (record === null) return INITIAL_DISPATCH_STATE;
    try {
      return parseDispatch(record.value, ownerUid);
    } catch (error) {
      if (!(error instanceof AccountSyncOutboxError)) throw error;
      // зачем: учёт отправки — вспомогательный; его порча не должна запирать очередь
      // (enqueue/load читают из него смещение часов). Начинаем учёт заново.
      console.warn('[ACCOUNTS-V2-CLIENT] outbox_dispatch_state_corrupt');
      return INITIAL_DISPATCH_STATE;
    }
  };

  /**
   * Часы телефона с поправкой на сохранённое смещение сервера.
   * зачем (TG-7CD73967EF61, P3): срок жизни операции (< TTL квитанций сервера)
   * меряется по часам, которые телефон может переставить; смещение из ответа
   * сервера это выравнивает. Нет ответа — поправка 0.
   */
  const nowPair = async (transaction: AccountScopeTransaction): Promise<NowPair> => {
    const offset = (await readDispatch(transaction)).clockOffsetMs ?? 0;
    const localMs = nowMs();
    return Object.freeze({ localMs, serverMs: Math.max(0, localMs + offset) });
  };

  const readSlot = async (transaction: AccountScopeTransaction, sequence: number): Promise<Slot | null> => {
    const record = await transaction.readRecord(slotKey(sequence));
    if (record === null) return null;
    const slot = parseSlot(record.value, ownerUid);
    if (slot.sequence !== sequence) return fail('account_sync_outbox_corrupt');
    return slot;
  };

  /**
   * Операция ушла из очереди (ack или карантин): её pending удалён, а слот — либо
   * удалён (ниже головы), либо помечен retired («дыра» выше головы).
   */
  const assertRetiredEvidence = async (
    transaction: AccountScopeTransaction,
    meta: Meta,
    sequence: number,
    operationId: string,
  ): Promise<void> => {
    const pending = await transaction.readRecord(operationKey('pending', operationId));
    if (pending !== null) return fail('account_sync_outbox_corrupt');
    const slot = await readSlot(transaction, sequence);
    if (sequence < meta.head) {
      if (slot !== null) return fail('account_sync_outbox_corrupt');
      return undefined;
    }
    if (sequence >= meta.next || slot === null || !slot.retired || slot.operationId !== operationId) {
      return fail('account_sync_outbox_corrupt');
    }
    return undefined;
  };

  const validateStoredAck = async (
    transaction: AccountScopeTransaction,
    raw: ScopeJson,
    meta: Meta,
    expectedOperationId: string,
  ): Promise<Ack> => {
    const acknowledged = parseAck(raw, ownerUid);
    if (acknowledged.envelope.operation.operationId !== expectedOperationId) {
      return fail('account_sync_outbox_corrupt');
    }
    await assertRetiredEvidence(transaction, meta, acknowledged.sequence, expectedOperationId);
    return acknowledged;
  };

  const validateStoredQuarantine = async (
    transaction: AccountScopeTransaction,
    raw: ScopeJson,
    meta: Meta,
    expectedOperationId: string,
  ): Promise<Quarantined> => {
    const quarantined = parseQuarantine(raw, ownerUid);
    if (quarantined.envelope.operation.operationId !== expectedOperationId) {
      return fail('account_sync_outbox_corrupt');
    }
    await assertRetiredEvidence(transaction, meta, quarantined.sequence, expectedOperationId);
    return quarantined;
  };

  /**
   * Помечает слоты ушедших операций retired и двигает голову через все retired
   * подряд (их записи удаляются). Порядок остальных операций не трогается.
   */
  const retireAndAdvance = async (
    transaction: AccountScopeTransaction,
    meta: Meta,
    moved: readonly Moved[],
  ): Promise<Meta> => {
    for (const row of moved) {
      await transaction.putRecord({ key: slotKey(row.sequence), value: slotJson(ownerUid, {
        sequence: row.sequence, operationId: row.operationId, retired: true,
      }) });
    }
    let head = meta.head;
    while (head < meta.next) {
      const slot = await readSlot(transaction, head);
      if (slot === null) return fail('account_sync_outbox_corrupt');
      if (!slot.retired) break;
      await transaction.deleteRecord(slotKey(head));
      head += 1;
    }
    const pendingCount = meta.pendingCount - moved.length;
    if (pendingCount < 0 || pendingCount > meta.next - head || (pendingCount === 0) !== (head === meta.next)) {
      return fail('account_sync_outbox_corrupt');
    }
    const nextMeta = Object.freeze({ ownerUid, head, next: meta.next, pendingCount });
    await transaction.putRecord({ key: META_KEY, value: metaJson(nextMeta) });
    return nextMeta;
  };

  const moveToQuarantine = async (
    transaction: AccountScopeTransaction,
    meta: Meta,
    rows: readonly Leaving[],
    code: AccountSyncOutboxQuarantineCode,
  ): Promise<Meta> => {
    const quarantinedAtMs = (await nowPair(transaction)).serverMs;
    for (const row of rows) {
      const operationId = row.envelope.operation.operationId;
      await transaction.putRecord({
        key: operationKey('quarantine', operationId),
        value: quarantineJson(ownerUid, {
          sequence: row.sequence, envelope: row.envelope, code, quarantinedAtMs,
          enqueuedAtMs: row.enqueuedAtMs, enqueuedLocalAtMs: row.enqueuedLocalAtMs, firstSent: row.firstSent,
        }),
      });
      await transaction.deleteRecord(operationKey('pending', operationId));
    }
    console.warn('[ACCOUNTS-V2-CLIENT] outbox_quarantined', `code=${code}`, `operations=${rows.length}`);
    return retireAndAdvance(transaction, meta, rows.map((row) => Object.freeze({
      sequence: row.sequence, operationId: row.envelope.operation.operationId,
    })));
  };

  const runLocalMutation = async (
    transaction: AccountScopeTransaction,
    mutation: AccountSyncLocalMutation,
  ): Promise<void> => {
    type Settlement = Readonly<{ ok: true }> | Readonly<{ ok: false; error: unknown }>;
    let active = true;
    const tracked: Promise<Settlement>[] = [];
    const track = <T>(work: () => Promise<T>): Promise<T> => {
      if (!active) {
        return Promise.reject(new AccountSyncOutboxError(
          'account_sync_outbox_transaction_closed',
        ));
      }
      let operation: Promise<T>;
      try {
        operation = work();
      } catch (error) {
        operation = Promise.reject(error);
      }
      tracked.push(operation.then<Settlement, Settlement>(
        () => Object.freeze({ ok: true as const }),
        (error: unknown) => Object.freeze({ ok: false as const, error }),
      ));
      return operation;
    };
    const domainKey = (rawKey: unknown): string => {
      if (typeof rawKey !== 'string' || rawKey.length === 0 || rawKey.trim() !== rawKey) {
        return fail('account_sync_outbox_invalid_input');
      }
      if (rawKey.startsWith(PREFIX)) return fail('account_sync_outbox_reserved_key');
      return rawKey;
    };
    const scoped = Object.freeze<AccountSyncLocalMutationTransaction>({
      readRecord: (rawKey) => track(() => transaction.readRecord(domainKey(rawKey))),
      putRecord: (rawRecord) => track(async () => {
        const fields = captureExact(rawRecord, ['key', 'value']);
        if (fields === null) return fail('account_sync_outbox_invalid_input');
        await transaction.putRecord({
          key: domainKey(value(fields, 'key')),
          value: value(fields, 'value') as ScopeJson,
        });
      }),
      deleteRecord: (rawKey) => track(() => transaction.deleteRecord(domainKey(rawKey))),
    });
    let callbackFailed = false;
    let callbackError: unknown;
    try {
      const callbackResult = mutation(scoped);
      if (callbackResult === undefined) {
        active = false;
      } else {
        await callbackResult;
      }
    } catch (error) {
      callbackFailed = true;
      callbackError = error;
    } finally {
      active = false;
    }
    const settlements = await Promise.all(tracked);
    if (callbackFailed) throw callbackError;
    const failed = settlements.find((settlement) => !settlement.ok);
    if (failed && !failed.ok) throw failed.error;
  };

  const stageOperation = async (
    transaction: AccountScopeTransaction,
    owned: AccountSyncOwnedOperation,
    mutation: AccountSyncLocalMutation | null,
    keepEnqueued?: EnqueueTimes,
  ): Promise<AccountSyncOutboxEnqueueResult> => {
    const operationId = owned.operation.operationId;
    const meta = (await readMeta(transaction)) ?? initialMeta(ownerUid);
    const pendingRecord = await transaction.readRecord(operationKey('pending', operationId));
    const ackRecord = await transaction.readRecord(operationKey('ack', operationId));
    const quarantineRecord = await transaction.readRecord(operationKey('quarantine', operationId));
    const present = [pendingRecord, ackRecord, quarantineRecord].filter((record) => record !== null).length;
    if (present > 1) return fail('account_sync_outbox_corrupt');
    if (pendingRecord !== null) {
      const pending = parsePending(pendingRecord.value, ownerUid);
      if (!semanticEqual(pending.envelope, owned)) return fail('account_sync_outbox_conflict');
      if (pending.sequence < meta.head || pending.sequence >= meta.next) {
        return fail('account_sync_outbox_corrupt');
      }
      const slot = await readSlot(transaction, pending.sequence);
      if (slot === null || slot.retired || slot.operationId !== operationId) {
        return fail('account_sync_outbox_corrupt');
      }
      return freezeEnqueue('duplicate', meta.pendingCount);
    }
    if (ackRecord !== null) {
      const acknowledged = await validateStoredAck(transaction, ackRecord.value, meta, operationId);
      if (!semanticEqual(acknowledged.envelope, owned)) return fail('account_sync_outbox_conflict');
      return freezeEnqueue('already_acknowledged', meta.pendingCount);
    }
    if (quarantineRecord !== null) {
      const quarantined = await validateStoredQuarantine(transaction, quarantineRecord.value, meta, operationId);
      if (!semanticEqual(quarantined.envelope, owned)) return fail('account_sync_outbox_conflict');
      return freezeEnqueue('quarantined', meta.pendingCount);
    }
    if (meta.next === Number.MAX_SAFE_INTEGER || meta.pendingCount === Number.MAX_SAFE_INTEGER) {
      return fail('account_sync_outbox_counter_exhausted');
    }
    const existingSlot = await transaction.readRecord(slotKey(meta.next));
    if (existingSlot !== null) return fail('account_sync_outbox_corrupt');
    // requeue сохраняет прежнее время постановки (обе оценки): срок жизни не продлевается.
    const now = keepEnqueued === undefined ? await nowPair(transaction) : null;
    const times: EnqueueTimes = keepEnqueued
      ?? Object.freeze({ enqueuedAtMs: now?.serverMs ?? 0, enqueuedLocalAtMs: now?.localMs ?? 0, firstSent: null });
    if (mutation !== null) await runLocalMutation(transaction, mutation);
    // зачем: конверт пишется как есть и больше НИКОГДА не меняется (baseRevision
    // не продвигается ни по квитанции, ни по прочитанному состоянию — контракт (а)).
    const pending: Pending = Object.freeze({ sequence: meta.next, envelope: owned, ...times });
    await transaction.putRecord({ key: slotKey(meta.next), value: slotJson(ownerUid, {
      sequence: meta.next, operationId, retired: false,
    }) });
    await transaction.putRecord({
      key: operationKey('pending', operationId), value: pendingJson(ownerUid, pending),
    });
    const nextMeta = Object.freeze({
      ownerUid, head: meta.head, next: meta.next + 1,
      pendingCount: meta.pendingCount + 1,
    });
    await transaction.putRecord({ key: META_KEY, value: metaJson(nextMeta) });
    return freezeEnqueue('enqueued', nextMeta.pendingCount);
  };

  const enqueue = async (
    rawOperation: AccountSyncOwnedOperation,
    rawFence: SessionFence,
  ): Promise<AccountSyncOutboxEnqueueResult> => {
    assertExpectedFence(rawFence, boundFence, ownerUid);
    const owned = normalizeOperation(rawOperation, ownerUid);
    return transact((transaction) => stageOperation(transaction, owned, null));
  };

  const applyLocalMutation = async (
    rawOperation: AccountSyncOwnedOperation,
    rawFence: SessionFence,
    mutation: AccountSyncLocalMutation,
  ): Promise<AccountSyncOutboxEnqueueResult> => {
    assertExpectedFence(rawFence, boundFence, ownerUid);
    const owned = normalizeOperation(rawOperation, ownerUid);
    if (typeof mutation !== 'function') return fail('account_sync_outbox_invalid_input');
    return transact((transaction) => stageOperation(transaction, owned, mutation));
  };

  /** Живые операции от головы (не больше limit слотов); retired пропускаются, пропавший слот — порча. */
  const scanLive = async (transaction: AccountScopeTransaction, meta: Meta, limit: number): Promise<readonly Scanned[]> => {
    const scanned: Scanned[] = [];
    const end = Math.min(meta.next, meta.head + limit);
    for (let sequence = meta.head; sequence < end; sequence += 1) {
      const slot = await readSlot(transaction, sequence);
      if (slot === null) return fail('account_sync_outbox_corrupt');
      if (slot.retired) continue;
      const pendingRecord = await transaction.readRecord(operationKey('pending', slot.operationId));
      if (pendingRecord === null) return fail('account_sync_outbox_corrupt');
      const pending = parsePending(pendingRecord.value, ownerUid);
      if (pending.sequence !== sequence || pending.envelope.operation.operationId !== slot.operationId) {
        return fail('account_sync_outbox_corrupt');
      }
      scanned.push(Object.freeze({ sequence, pending }));
    }
    return scanned;
  };

  const selectBatch = async (
    transaction: AccountScopeTransaction,
    effect: LoadEffect,
    meta: Meta,
    live: readonly Scanned[],
  ): Promise<AccountSyncOutboxLoadResult> => {
    // Граница id пакета сверху: реальный id не длиннее (те же числа, не больше цифр, хэш — 8 hex).
    const boundId = `sync-v2:${String(meta.head)}:${String(meta.next)}:n${String(effect.maxOperations)}:h00000000`;
    const plan = planAccountSyncBatch(live.map(({ sequence, pending }) => Object.freeze({
      sequence, entityKey: entityKey(pending.envelope), bytes: jsonWireBytes(pending.envelope),
    })), {
      maxOperations: effect.maxOperations,
      maxBatchUtf8Bytes: effect.maxBatchUtf8Bytes,
      batchBytes: (operationBytes, operationCount) => fullBatchBytes(boundId, operationBytes, operationCount),
    });
    if (plan.kind === 'head_too_large') return fail('account_sync_outbox_head_too_large');
    if (plan.kind === 'empty') return fail('account_sync_outbox_corrupt');
    const bySequence = new Map(live.map((row) => [row.sequence, row.pending.envelope] as const));
    const selected: AccountSyncOwnedOperation[] = [];
    for (const sequence of plan.sequences) {
      const envelope = bySequence.get(sequence);
      if (envelope === undefined) return fail('account_sync_outbox_corrupt');
      const operationId = envelope.operation.operationId;
      if (await transaction.readRecord(operationKey('ack', operationId)) !== null
        || await transaction.readRecord(operationKey('quarantine', operationId)) !== null) {
        return fail('account_sync_outbox_corrupt');
      }
      selected.push(envelope);
    }
    return freezeLoad(accountSyncBatchIdFor(plan.sequences), selected, meta.pendingCount);
  };

  const load = async (rawEffect: LoadEffect): Promise<AccountSyncOutboxLoadResult> => {
    const effect = snapshotLoadEffect(rawEffect, boundFence, ownerUid);
    return transact(async (transaction) => {
      let meta = await readMeta(transaction);
      if (meta === null) return freezeLoad(emptyBatchId(0), EMPTY_OPERATIONS, 0);
      for (let round = 0; round < MAX_EXPIRY_ROUNDS; round += 1) {
        if (meta.pendingCount === 0) return freezeLoad(emptyBatchId(meta.head), EMPTY_OPERATIONS, 0);
        const scanned = await scanLive(transaction, meta, ACCOUNT_SYNC_OUTBOX_SCAN_WINDOW);
        const expired = expiredOf(scanned, await nowPair(transaction));
        if (expired.length === 0) return selectBatch(transaction, effect, meta, scanned);
        meta = await moveToQuarantine(transaction, meta, expired.map(({ sequence, pending }) => Object.freeze({
          sequence, envelope: pending.envelope,
          enqueuedAtMs: pending.enqueuedAtMs, enqueuedLocalAtMs: pending.enqueuedLocalAtMs, firstSent: pending.firstSent,
        })), 'sync_operation_expired');
        const live = scanned.filter((row) => !expired.includes(row));
        if (live.length > 0) return selectBatch(transaction, effect, meta, live);
      }
      console.warn('[ACCOUNTS-V2-CLIENT] outbox_expiry_rounds_exhausted', `pending=${meta.pendingCount}`);
      return freezeLoad(emptyBatchId(meta.head), EMPTY_OPERATIONS, meta.pendingCount);
    });
  };

  /**
   * Общая часть ack и карантина: сверка пакета с очередью. Операция либо уже ушла
   * этим же путём (повтор после потерянного ответа), либо ждёт в своём живом слоте.
   */
  const matchBatch = async <T>(
    transaction: AccountScopeTransaction,
    meta: Meta,
    batch: AccountSyncBatch,
    settled: (operationId: string) => Promise<Readonly<{ sequence: number; matches: boolean }> | null>,
    otherExit: (operationId: string) => Promise<boolean>,
    build: (sequence: number, envelope: AccountSyncOwnedOperation, index: number, times: EnqueueTimes) => T,
  ): Promise<Readonly<{ sequences: readonly number[]; rows: readonly T[]; moved: readonly Moved[] }>> => {
    const sequences: number[] = [];
    const rows: T[] = [];
    const moved: Moved[] = [];
    let sawPending = false;
    for (let index = 0; index < batch.operations.length; index += 1) {
      const envelope = batch.operations[index];
      const operationId = envelope.operation.operationId;
      const previous = await settled(operationId);
      if (previous !== null) {
        if (sawPending) return fail('account_sync_outbox_corrupt');
        if (!previous.matches) return fail('account_sync_outbox_conflict');
        sequences.push(previous.sequence);
        continue;
      }
      if (await otherExit(operationId)) return fail('account_sync_outbox_conflict');
      sawPending = true;
      const pendingRecord = await transaction.readRecord(operationKey('pending', operationId));
      if (pendingRecord === null) return fail('account_sync_outbox_conflict');
      const pending = parsePending(pendingRecord.value, ownerUid);
      const sequence = pending.sequence;
      if (!semanticEqual(pending.envelope, envelope) || sequence < meta.head || sequence >= meta.next) {
        return fail('account_sync_outbox_conflict');
      }
      const slot = await readSlot(transaction, sequence);
      if (slot === null || slot.retired || slot.operationId !== operationId) {
        return fail('account_sync_outbox_conflict');
      }
      sequences.push(sequence);
      rows.push(build(sequence, envelope, index, Object.freeze({
        enqueuedAtMs: pending.enqueuedAtMs, enqueuedLocalAtMs: pending.enqueuedLocalAtMs, firstSent: pending.firstSent,
      })));
      moved.push(Object.freeze({ sequence, operationId }));
    }
    if (!strictlyIncreasing(sequences) || batch.batchId !== accountSyncBatchIdFor(sequences)) {
      return fail('account_sync_outbox_conflict');
    }
    if (moved.length > meta.pendingCount) return fail('account_sync_outbox_corrupt');
    return Object.freeze({ sequences, rows, moved });
  };

  const ackCommit = async (rawEffect: AckEffect): Promise<AccountSyncOutboxAckResult> => {
    const normalized = normalizeAckEffect(rawEffect, boundFence, ownerUid);
    const expectedIds = normalized.batch.operations.map(({ operation }) => operation.operationId);
    return transact(async (transaction) => {
      const meta = await readMeta(transaction);
      if (meta === null) return fail('account_sync_outbox_corrupt');
      const receiptFor = new Map(normalized.receipts.map((receipt) => [receipt.operationId, receipt] as const));
      const envelopeFor = new Map(normalized.batch.operations.map((owned) => [owned.operation.operationId, owned] as const));
      // зачем (TG-DFA918464DFA): отказ сервера по времени постановки уходит в возвратный
      // карантин, а не в ack — повтор после потерянного ответа ищет операцию там же.
      const timeCode = (operationId: string): AccountSyncOutboxQuarantineCode | null => {
        const requested: AccountSyncServerReceipt | undefined = receiptFor.get(operationId);
        return requested === undefined ? null : timeRejectionQuarantineCode(requested);
      };
      const matched = await matchBatch<Settled>(transaction, meta, normalized.batch, async (operationId) => {
        const envelope = envelopeFor.get(operationId);
        const code = timeCode(operationId);
        if (code !== null) {
          const record = await transaction.readRecord(operationKey('quarantine', operationId));
          if (record === null) return null;
          const stored = await validateStoredQuarantine(transaction, record.value, meta, operationId);
          return Object.freeze({ sequence: stored.sequence,
            matches: envelope !== undefined && stored.code === code && semanticEqual(stored.envelope, envelope) });
        }
        const record = await transaction.readRecord(operationKey('ack', operationId));
        if (record === null) return null;
        const stored = await validateStoredAck(transaction, record.value, meta, operationId);
        const requested = receiptFor.get(operationId);
        return Object.freeze({
          sequence: stored.sequence,
          matches: requested !== undefined && envelope !== undefined
            && semanticEqual(stored.envelope, envelope) && receiptsCompatible(stored.receipt, requested),
        });
      }, async (operationId) => (
        await transaction.readRecord(operationKey(timeCode(operationId) === null ? 'quarantine' : 'ack', operationId)) !== null
      ), (sequence, envelope, index, times) => Object.freeze({
        sequence, envelope, receipt: normalized.receipts[index],
        resolved: !receiptNeedsResolution(normalized.receipts[index]), ...times,
      }));
      if (matched.rows.length === 0) return Object.freeze({
        committedOperationIds: freezeIds(expectedIds), remainingPendingCountObserved: meta.pendingCount,
      });
      const acked: Ack[] = [];
      const quarantinedAtMs = (await nowPair(transaction)).serverMs;
      for (const row of matched.rows) {
        const operationId = row.envelope.operation.operationId;
        const code = timeRejectionQuarantineCode(row.receipt);
        await transaction.putRecord(code === null
          ? { key: operationKey('ack', operationId), value: ackJson(ownerUid, row) }
          : { key: operationKey('quarantine', operationId), value: quarantineJson(ownerUid, {
            sequence: row.sequence, envelope: row.envelope, code, quarantinedAtMs,
            enqueuedAtMs: row.enqueuedAtMs, enqueuedLocalAtMs: row.enqueuedLocalAtMs, firstSent: row.firstSent,
          }) });
        await transaction.deleteRecord(operationKey('pending', operationId));
        if (code === null) acked.push(row);
        else console.warn('[ACCOUNTS-V2-CLIENT] outbox_quarantined', `code=${code}`, 'reason=server_time_rejection');
      }
      // зачем (TG-7CD73967EF61, P2): conflict/rejected переживают крах — индекс для listUnresolved.
      const newlyUnresolved = acked.filter((row) => !row.resolved);
      // зачем (TG-CF3E51F11C41, P2): подтверждённые более поздние правки той же сущности
      // запоминаются для неразрешённых квитанций — перевыпуск SRS их не затрёт.
      await recordLaterConfirmed(transaction, ownerUid, acked, newlyUnresolved);
      await updateUnresolvedIndex(transaction, ownerUid,
        newlyUnresolved.map((row) => row.envelope.operation.operationId), []);
      const nextMeta = await retireAndAdvance(transaction, meta, matched.moved);
      return Object.freeze({
        committedOperationIds: freezeIds(expectedIds), remainingPendingCountObserved: nextMeta.pendingCount,
      });
    });
  };

  const quarantine = async (rawEffect: QuarantineEffect): Promise<AccountSyncOutboxQuarantineResult> => {
    const normalized = normalizeQuarantineEffect(rawEffect, boundFence, ownerUid);
    const expectedIds = normalized.batch.operations.map(({ operation }) => operation.operationId);
    return transact(async (transaction) => {
      const meta = await readMeta(transaction);
      if (meta === null) return fail('account_sync_outbox_corrupt');
      const envelopeFor = new Map(normalized.batch.operations.map((owned) => [owned.operation.operationId, owned] as const));
      const matched = await matchBatch(transaction, meta, normalized.batch, async (operationId) => {
        const record = await transaction.readRecord(operationKey('quarantine', operationId));
        if (record === null) return null;
        const stored = await validateStoredQuarantine(transaction, record.value, meta, operationId);
        const envelope = envelopeFor.get(operationId);
        return Object.freeze({
          sequence: stored.sequence,
          matches: envelope !== undefined && semanticEqual(stored.envelope, envelope),
        });
      }, async (operationId) => (
        await transaction.readRecord(operationKey('ack', operationId)) !== null
      ), (sequence, envelope, _index, times) => Object.freeze({ sequence, envelope, ...times }));
      if (matched.rows.length === 0) return Object.freeze({
        quarantinedOperationIds: freezeIds(expectedIds), remainingPendingCountObserved: meta.pendingCount,
      });
      const nextMeta = await moveToQuarantine(transaction, meta, matched.rows, normalized.quarantineCode);
      return Object.freeze({
        quarantinedOperationIds: freezeIds(expectedIds), remainingPendingCountObserved: nextMeta.pendingCount,
      });
    });
  };

  const followups = createAccountSyncOutboxFollowups({
    ownerUid, boundFence, transact, readMeta, readDispatch, localNowMs: nowMs,
    validateStoredAck, validateStoredQuarantine,
    stageOperation: (transaction, owned, kept) => stageOperation(transaction, owned, null, kept),
    scanQueue: (transaction, meta) => scanLive(transaction, meta, Number.MAX_SAFE_INTEGER),
  });
  const wireBatch = createAccountSyncWireBatch({ ownerUid, boundFence, transact, readDispatch, localNowMs: nowMs });
  return Object.freeze({ enqueue, applyLocalMutation, load, ackCommit, quarantine, wireBatch, ...followups });
}
