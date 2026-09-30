import { sameSessionFence, type SessionFence } from './account_session';
import { AccountScopeStoreError, type ScopeJson } from './account_scope_store';
import {
  ACCOUNT_SYNC_REJECT_CODES,
  createInitialAccountSyncState,
  reduceAccountSync,
  type AccountSyncOwnedOperation,
  type AccountSyncQuarantineCode,
  type AccountSyncRejectCode,
  type AccountSyncServerReceipt,
} from './account_sync';

/*
 * Account V2 — записи локального outbox синхронизации (формы, разбор, ключи, байты).
 * зачем: вынесено из account_sync_outbox.ts (правило ≤ 800 строк на файл) при
 * добавлении квитанций conflict/rejected, карантина, «дыр» в очереди и срока
 * жизни операции (TG-831C22D22486). Логика очереди — в account_sync_outbox.ts.
 */

export type AccountSyncOutboxErrorCode =
  | 'account_sync_outbox_invalid_input'
  | 'account_sync_outbox_stale'
  | 'account_sync_outbox_conflict'
  | 'account_sync_outbox_corrupt'
  | 'account_sync_outbox_counter_exhausted'
  | 'account_sync_outbox_head_too_large'
  | 'account_sync_outbox_reserved_key'
  | 'account_sync_outbox_transaction_closed'
  | 'account_sync_outbox_transaction_failed';

export class AccountSyncOutboxError extends Error {
  declare readonly code: AccountSyncOutboxErrorCode;

  constructor(rawCode: unknown) {
    const allowed: readonly AccountSyncOutboxErrorCode[] = [
      'account_sync_outbox_invalid_input',
      'account_sync_outbox_stale',
      'account_sync_outbox_conflict',
      'account_sync_outbox_corrupt',
      'account_sync_outbox_counter_exhausted',
      'account_sync_outbox_head_too_large',
      'account_sync_outbox_reserved_key',
      'account_sync_outbox_transaction_closed',
      'account_sync_outbox_transaction_failed',
    ];
    const code = typeof rawCode === 'string' && allowed.includes(rawCode as AccountSyncOutboxErrorCode)
      ? rawCode as AccountSyncOutboxErrorCode : 'account_sync_outbox_invalid_input';
    super(code);
    delete this.stack;
    delete (this as Error & { cause?: unknown }).cause;
    Object.defineProperties(this, {
      name: { value: 'AccountSyncOutboxError', enumerable: true,
        writable: false, configurable: false },
      message: { value: code, enumerable: true, writable: false, configurable: false },
      code: { value: code, enumerable: true, writable: false, configurable: false },
    });
    Object.freeze(this);
  }
}

/**
 * Предел жизни операции в outbox: 170 суток < 180 суток TTL квитанций сервера.
 * зачем: квитанция на сервере живёт 180 суток. Операция, отправленная давно, но
 * так и не подтверждённая (ответ потерян), после истечения квитанции применилась бы
 * ВТОРОЙ раз как новая. Поэтому старше предела — в карантин (`sync_operation_expired`),
 * с запасом 10 суток на расхождение часов и задержку TTL-чистки Firestore.
 */
export const ACCOUNT_SYNC_OPERATION_MAX_AGE_MS = 170 * 24 * 60 * 60 * 1000;
export type AccountSyncOutboxQuarantineCode =
  | AccountSyncQuarantineCode | 'sync_operation_expired' | 'sync_operation_time_in_future';

/**
 * Карантин для отказа сервера по времени постановки или null (TG-DFA918464DFA).
 * зачем: `operation_expired` / `operation_time_in_future` — отказ по моменту
 * прихода, а не по содержимому: слою разрешения конфликтов тут решать нечего
 * (перевыпуск не нужен), а сама операция может стать отправляемой (часы
 * исправлены). Поэтому она уходит не в ack (resolved=false), а в ВОЗВРАТНЫЙ
 * карантин — как операция, которую outbox сам признал просроченной.
 */
export function timeRejectionQuarantineCode(receipt: AccountSyncServerReceipt): AccountSyncOutboxQuarantineCode | null {
  if (receipt.outcome !== 'rejected') return null;
  if (receipt.code === 'operation_expired') return 'sync_operation_expired';
  if (receipt.code === 'operation_time_in_future') return 'sync_operation_time_in_future';
  return null;
}

export type Captured = ReadonlyMap<string, unknown>;
export type Meta = Readonly<{ ownerUid: string; head: number; next: number; pendingCount: number }>;
/** Слот очереди: живой (операция ждёт) или retired — операция ушла, но выше головы («дыра»). */
export type Slot = Readonly<{ sequence: number; operationId: string; retired: boolean }>;
/**
 * Время постановки — ДВЕ оценки (TG-CF3E51F11C41, P1): enqueuedAtMs — часы телефона
 * с поправкой на сервер, enqueuedLocalAtMs — часы телефона как есть. Операция
 * истекает, только если по ОБЕИМ оценкам старше предела: сбитые и затем исправленные
 * часы (или устаревшая поправка) портят одну оценку, но не обе сразу.
 */
export type EnqueueTimes = Readonly<{ enqueuedAtMs: number; enqueuedLocalAtMs: number; firstSent: FirstSent | null }>;
/**
 * Момент ПЕРВОЙ отправки операции на сервер — тоже двумя часами (TG-DFA918464DFA,
 * ремонт №1, P2-1): serverMs — часы телефона с поправкой на сервер в тот момент,
 * localMs — часы телефона как есть. Пишется один раз (outbox.wireBatch) и
 * переживает карантин и requeue. null — операцию ещё не отправляли.
 * зачем: квитанция сервера не может появиться раньше первой отправки, поэтому
 * оценка времени постановки на проводе не бывает позже неё — возраст на сервере
 * растёт монотонно и после TTL квитанции (180 сут) повтор получает отказ.
 */
export type FirstSent = Readonly<{ serverMs: number; localMs: number }>;
export type Pending = Readonly<{ sequence: number; envelope: AccountSyncOwnedOperation }> & EnqueueTimes;
/**
 * Квитанция операции. resolved=false — conflict/rejected ещё ждут слоя разрешения
 * (TG-7CD73967EF61, P2: итог переживает крах, его видно через listUnresolved).
 */
export type Ack = Readonly<{
  sequence: number; envelope: AccountSyncOwnedOperation; receipt: AccountSyncServerReceipt; resolved: boolean;
}>;
/** Время постановки (обе оценки) сохраняется: requeue не продлевает срок жизни операции. */
export type Quarantined = Readonly<{
  sequence: number; envelope: AccountSyncOwnedOperation; code: AccountSyncOutboxQuarantineCode;
  quarantinedAtMs: number;
}> & EnqueueTimes;
/**
 * Учёт отправки, который обязан пережить перезапуск (TG-7CD73967EF61, P1/P2):
 * неудачи пакета, время первой неудачи (часы с поправкой на сервер), пауза до
 * следующей отправки (часы телефона) и смещение часов сервера.
 */
export type AccountSyncDispatchState = Readonly<{
  batchId: string | null;
  failedAttempts: number;
  firstFailureAtMs: number | null;
  notBeforeMs: number | null;
  clockOffsetMs: number | null;
}>;

export const PREFIX = '__account_sync_outbox_v2__:';
export const META_KEY = `${PREFIX}meta`;
export const DISPATCH_KEY = `${PREFIX}dispatch`;
/** Список operationId квитанций conflict/rejected, ещё не разрешённых (по порядку очереди). */
export const UNRESOLVED_KEY = `${PREFIX}unresolved`;
const LATER_PREFIX = `${PREFIX}later:`;
export const VERSION = 1;
export const MAX_OPERATIONS = 50;
export const MAX_BATCH_BYTES = 524288;
const QUARANTINE_CODES: readonly AccountSyncOutboxQuarantineCode[] = Object.freeze([
  'sync_dispatch_final', 'sync_dispatch_attempts_exhausted', 'sync_receipt_invalid_exhausted',
  'sync_operation_expired', 'sync_operation_time_in_future',
]);

export function fail(code: AccountSyncOutboxErrorCode): never {
  throw new AccountSyncOutboxError(code);
}

const LOG = '[ACCOUNTS-V2-CLIENT]';

/**
 * Вид ошибки для лога: код своих ошибок или имя класса, без текста сообщения.
 * зачем (TG-CF3E51F11C41, P3): немые catch прятали причину; сама ошибка может быть
 * Proxy с ловушками, поэтому чтение обёрнуто и никогда не бросает.
 */
export function errorKind(error: unknown): string {
  try {
    if (error instanceof AccountSyncOutboxError) return error.code;
    return error instanceof Error ? error.name : typeof error;
  } catch {
    return 'unreadable';
  }
}

export function safeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function captureExact(value: unknown, keys: readonly string[]): Captured | null {
  try {
    if (typeof value !== 'object' || value === null) return null;
    const prototype = Reflect.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.length !== keys.length
      || ownKeys.some((key) => typeof key !== 'string' || !keys.includes(key))) return null;
    const captured = new Map<string, unknown>();
    for (const key of ownKeys) {
      const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)
        || descriptor.get !== undefined || descriptor.set !== undefined) return null;
      captured.set(key as string, descriptor.value);
    }
    return captured;
  } catch (error) {
    // Ловушка Proxy при чтении формы = форма непригодна; вызывающий вернёт свой код отказа.
    console.warn(`${LOG} outbox_shape_unreadable`, `error=${errorKind(error)}`);
    return null;
  }
}

export function value(captured: Captured, key: string): unknown {
  return captured.get(key);
}

export function snapshotFence(raw: unknown): SessionFence {
  const fields = captureExact(raw, ['scopeKey', 'uid', 'generation', 'nonce']);
  if (fields === null) return fail('account_sync_outbox_invalid_input');
  const scopeKey = value(fields, 'scopeKey');
  const uid = value(fields, 'uid');
  const generation = value(fields, 'generation');
  const nonce = value(fields, 'nonce');
  if (typeof scopeKey !== 'string' || scopeKey.length === 0 || scopeKey.trim() !== scopeKey
    || (uid !== null && (typeof uid !== 'string' || uid.length === 0 || uid.trim() !== uid))
    || !safeInteger(generation)
    || typeof nonce !== 'string' || nonce.length === 0 || nonce.trim() !== nonce) {
    return fail('account_sync_outbox_invalid_input');
  }
  return Object.freeze({
    scopeKey: scopeKey as SessionFence['scopeKey'], uid: uid as string | null, generation, nonce,
  });
}

export function assertExpectedFence(raw: unknown, boundFence: SessionFence, ownerUid: string): SessionFence {
  const expected = snapshotFence(raw);
  if (expected.uid !== ownerUid || expected.scopeKey !== `account:${ownerUid}`
    || !sameSessionFence(expected, boundFence)) return fail('account_sync_outbox_stale');
  return expected;
}

export function operationKey(kind: 'pending' | 'ack' | 'quarantine', operationId: string): string {
  return `${PREFIX}${kind}:${JSON.stringify(operationId)}`;
}

export function slotKey(sequence: number): string {
  return `${PREFIX}slot:${String(sequence)}`;
}

export function emptyBatchId(head: number): string {
  return `sync-v2:empty:${String(head)}`;
}

export function normalizeOperation(raw: unknown, ownerUid: string): AccountSyncOwnedOperation {
  try {
    const initial = createInitialAccountSyncState(ownerUid, {
      scopeKey: `account:${ownerUid}`, uid: ownerUid, generation: 0, nonce: 'outbox-validation',
    }, 1);
    const loading = reduceAccountSync(initial, { type: 'SYNC_REQUESTED' }).state;
    const reduced = reduceAccountSync(loading, {
      type: 'OUTBOX_BATCH_LOADED', expectedFence: initial.fence, attemptEpoch: 1,
      batchId: 'outbox-validation', operations: Object.freeze([raw]), pendingCount: 1,
    }).state;
    if (reduced.phase.tag !== 'dispatching' || reduced.phase.batch.operations.length !== 1) {
      return fail('account_sync_outbox_invalid_input');
    }
    return reduced.phase.batch.operations[0];
  } catch (error) {
    // Любой отказ проверки конверта = невалидный вход; в лог — только вид отказа.
    console.warn(`${LOG} outbox_operation_invalid`, `error=${errorKind(error)}`);
    return fail('account_sync_outbox_invalid_input');
  }
}

export function normalizeStoredOperation(raw: unknown, ownerUid: string): AccountSyncOwnedOperation {
  try {
    return normalizeOperation(raw, ownerUid);
  } catch (error) {
    // Сохранённый конверт не проходит проверку — это порча хранилища, не ввод.
    console.warn(`${LOG} outbox_stored_operation_corrupt`, `error=${errorKind(error)}`);
    return fail('account_sync_outbox_corrupt');
  }
}

export function parseMeta(raw: ScopeJson, ownerUid: string): Meta {
  const fields = captureExact(raw, ['kind', 'version', 'ownerUid', 'head', 'next', 'pendingCount']);
  if (fields === null || value(fields, 'kind') !== 'account_sync_outbox_meta'
    || value(fields, 'version') !== VERSION || value(fields, 'ownerUid') !== ownerUid
    || !safeInteger(value(fields, 'head')) || !safeInteger(value(fields, 'next'))
    || !safeInteger(value(fields, 'pendingCount'))) return fail('account_sync_outbox_corrupt');
  const head = value(fields, 'head') as number;
  const next = value(fields, 'next') as number;
  const pendingCount = value(fields, 'pendingCount') as number;
  // зачем: с «дырами» (операции, ушедшие не с головы) живых слотов может быть
  // меньше next − head; голова всегда стоит на живом слоте, пустая очередь — head = next.
  if (next < head || pendingCount > next - head || (pendingCount === 0) !== (head === next)) {
    return fail('account_sync_outbox_corrupt');
  }
  return Object.freeze({ ownerUid, head, next, pendingCount });
}

export function initialMeta(ownerUid: string): Meta {
  return Object.freeze({ ownerUid, head: 0, next: 0, pendingCount: 0 });
}

export function metaJson(meta: Meta): ScopeJson {
  return {
    kind: 'account_sync_outbox_meta', version: VERSION, ownerUid: meta.ownerUid,
    head: meta.head, next: meta.next, pendingCount: meta.pendingCount,
  };
}

export function slotJson(ownerUid: string, slot: Slot): ScopeJson {
  return {
    kind: slot.retired ? 'account_sync_outbox_retired' : 'account_sync_outbox_slot',
    version: VERSION, ownerUid, sequence: slot.sequence, operationId: slot.operationId,
  };
}

export function parseSlot(raw: ScopeJson, ownerUid: string): Slot {
  const fields = captureExact(raw, ['kind', 'version', 'ownerUid', 'sequence', 'operationId']);
  const kind = fields === null ? undefined : value(fields, 'kind');
  if (fields === null || (kind !== 'account_sync_outbox_slot' && kind !== 'account_sync_outbox_retired')
    || value(fields, 'version') !== VERSION || value(fields, 'ownerUid') !== ownerUid
    || !safeInteger(value(fields, 'sequence'))
    || typeof value(fields, 'operationId') !== 'string') return fail('account_sync_outbox_corrupt');
  return Object.freeze({
    sequence: value(fields, 'sequence') as number,
    operationId: value(fields, 'operationId') as string,
    retired: kind === 'account_sync_outbox_retired',
  });
}

export function pendingJson(ownerUid: string, pending: Pending): ScopeJson {
  return {
    kind: 'account_sync_outbox_pending', version: VERSION, ownerUid,
    sequence: pending.sequence, enqueuedAtMs: pending.enqueuedAtMs, enqueuedLocalAtMs: pending.enqueuedLocalAtMs,
    envelope: pending.envelope as unknown as ScopeJson, ...firstSentJson(pending.firstSent),
  };
}

/** Поля первой отправки пишутся только парой и только когда она была (форма прежних записей не меняется). */
function firstSentJson(firstSent: FirstSent | null): Record<string, ScopeJson> {
  return firstSent === null ? {} : { firstSentAtServerMs: firstSent.serverMs, firstSentLocalAtMs: firstSent.localMs };
}

/**
 * Форма записи с местным временем постановки или прежняя (без него), с парой
 * первой отправки или без неё.
 * зачем (TG-CF3E51F11C41, P1, совместимость): у прежней записи местное время
 * считается равным enqueuedAtMs — тогда истечение по-прежнему требует ОБЕИХ оценок.
 * Пара первой отправки (TG-DFA918464DFA) — только обе или ни одной; половина — порча.
 */
function captureTimes(
  raw: unknown,
  keys: readonly string[],
): Readonly<{ fields: Captured; local: unknown; firstSent: FirstSent | null }> | null {
  const sent = captureExact(raw, [...keys, 'enqueuedLocalAtMs', 'firstSentAtServerMs', 'firstSentLocalAtMs']);
  if (sent !== null) {
    const serverMs = value(sent, 'firstSentAtServerMs');
    const localMs = value(sent, 'firstSentLocalAtMs');
    if (!safeInteger(serverMs) || !safeInteger(localMs)) return null;
    return Object.freeze({
      fields: sent, local: value(sent, 'enqueuedLocalAtMs'), firstSent: Object.freeze({ serverMs, localMs }),
    });
  }
  const current = captureExact(raw, [...keys, 'enqueuedLocalAtMs']);
  if (current !== null) return Object.freeze({ fields: current, local: value(current, 'enqueuedLocalAtMs'), firstSent: null });
  const legacy = captureExact(raw, keys);
  return legacy === null ? null : Object.freeze({ fields: legacy, local: value(legacy, 'enqueuedAtMs'), firstSent: null });
}

export function parsePending(raw: ScopeJson, ownerUid: string): Pending {
  const captured = captureTimes(raw, ['kind', 'version', 'ownerUid', 'sequence', 'enqueuedAtMs', 'envelope']);
  if (captured === null) return fail('account_sync_outbox_corrupt');
  const { fields, local, firstSent } = captured;
  if (value(fields, 'kind') !== 'account_sync_outbox_pending'
    || value(fields, 'version') !== VERSION || value(fields, 'ownerUid') !== ownerUid
    || !safeInteger(value(fields, 'sequence'))
    || !safeInteger(value(fields, 'enqueuedAtMs')) || !safeInteger(local)) return fail('account_sync_outbox_corrupt');
  return Object.freeze({
    sequence: value(fields, 'sequence') as number,
    enqueuedAtMs: value(fields, 'enqueuedAtMs') as number,
    enqueuedLocalAtMs: local,
    firstSent,
    envelope: normalizeStoredOperation(value(fields, 'envelope'), ownerUid),
  });
}

/** Квитанция из хранилища: ровно формы reducer'а (applied|duplicate|conflict, rejected{code}). */
export function parseReceipt(raw: unknown): AccountSyncServerReceipt {
  const rejectedFields = captureExact(raw, ['operationId', 'outcome', 'code', 'serverRevision']);
  if (rejectedFields !== null) {
    const code = value(rejectedFields, 'code');
    if (value(rejectedFields, 'outcome') !== 'rejected'
      || typeof value(rejectedFields, 'operationId') !== 'string'
      || typeof code !== 'string' || !ACCOUNT_SYNC_REJECT_CODES.includes(code as AccountSyncRejectCode)
      || !safeInteger(value(rejectedFields, 'serverRevision'))) return fail('account_sync_outbox_corrupt');
    return Object.freeze({
      operationId: value(rejectedFields, 'operationId') as string,
      outcome: 'rejected' as const,
      code: code as AccountSyncRejectCode,
      serverRevision: value(rejectedFields, 'serverRevision') as number,
    });
  }
  const fields = captureExact(raw, ['operationId', 'outcome', 'serverRevision']);
  const outcome = fields === null ? undefined : value(fields, 'outcome');
  if (fields === null || typeof value(fields, 'operationId') !== 'string'
    || (outcome !== 'applied' && outcome !== 'duplicate' && outcome !== 'conflict')
    || !safeInteger(value(fields, 'serverRevision'))) return fail('account_sync_outbox_corrupt');
  return Object.freeze({
    operationId: value(fields, 'operationId') as string,
    outcome,
    serverRevision: value(fields, 'serverRevision') as number,
  });
}

/** conflict/rejected ждут слоя разрешения; applied/duplicate разрешать нечего. */
export function receiptNeedsResolution(receipt: AccountSyncServerReceipt): boolean {
  return receipt.outcome === 'conflict' || receipt.outcome === 'rejected';
}

export function ackJson(ownerUid: string, ack: Ack): ScopeJson {
  return {
    kind: 'account_sync_outbox_ack', version: VERSION, ownerUid,
    sequence: ack.sequence, envelope: ack.envelope as unknown as ScopeJson,
    receipt: ack.receipt as unknown as ScopeJson, resolved: ack.resolved,
  };
}

export function parseAck(raw: ScopeJson, ownerUid: string): Ack {
  const fields = captureExact(raw, ['kind', 'version', 'ownerUid', 'sequence', 'envelope', 'receipt', 'resolved']);
  if (fields === null || value(fields, 'kind') !== 'account_sync_outbox_ack'
    || value(fields, 'version') !== VERSION || value(fields, 'ownerUid') !== ownerUid
    || !safeInteger(value(fields, 'sequence'))
    || typeof value(fields, 'resolved') !== 'boolean') return fail('account_sync_outbox_corrupt');
  const envelope = normalizeStoredOperation(value(fields, 'envelope'), ownerUid);
  const receipt = parseReceipt(value(fields, 'receipt'));
  const resolved = value(fields, 'resolved') as boolean;
  if (receipt.operationId !== envelope.operation.operationId
    || (!resolved && !receiptNeedsResolution(receipt))) return fail('account_sync_outbox_corrupt');
  return Object.freeze({ sequence: value(fields, 'sequence') as number, envelope, receipt, resolved });
}

export function quarantineJson(ownerUid: string, record: Quarantined): ScopeJson {
  return {
    kind: 'account_sync_outbox_quarantine', version: VERSION, ownerUid,
    sequence: record.sequence, envelope: record.envelope as unknown as ScopeJson,
    code: record.code, quarantinedAtMs: record.quarantinedAtMs, enqueuedAtMs: record.enqueuedAtMs,
    enqueuedLocalAtMs: record.enqueuedLocalAtMs, ...firstSentJson(record.firstSent),
  };
}

export function parseQuarantine(raw: ScopeJson, ownerUid: string): Quarantined {
  const captured = captureTimes(raw, [
    'kind', 'version', 'ownerUid', 'sequence', 'envelope', 'code', 'quarantinedAtMs', 'enqueuedAtMs',
  ]);
  if (captured === null) return fail('account_sync_outbox_corrupt');
  const { fields, local, firstSent } = captured;
  const code = value(fields, 'code');
  if (value(fields, 'kind') !== 'account_sync_outbox_quarantine'
    || value(fields, 'version') !== VERSION || value(fields, 'ownerUid') !== ownerUid
    || !safeInteger(value(fields, 'sequence')) || !safeInteger(value(fields, 'quarantinedAtMs'))
    || !safeInteger(value(fields, 'enqueuedAtMs')) || !safeInteger(local)
    || typeof code !== 'string' || !QUARANTINE_CODES.includes(code as AccountSyncOutboxQuarantineCode)) {
    return fail('account_sync_outbox_corrupt');
  }
  return Object.freeze({
    sequence: value(fields, 'sequence') as number,
    envelope: normalizeStoredOperation(value(fields, 'envelope'), ownerUid),
    code: code as AccountSyncOutboxQuarantineCode,
    quarantinedAtMs: value(fields, 'quarantinedAtMs') as number,
    enqueuedAtMs: value(fields, 'enqueuedAtMs') as number,
    enqueuedLocalAtMs: local,
    firstSent,
  });
}

export const INITIAL_DISPATCH_STATE: AccountSyncDispatchState = Object.freeze({
  batchId: null, failedAttempts: 0, firstFailureAtMs: null, notBeforeMs: null, clockOffsetMs: null,
});

function nullableSafe(input: unknown): input is number | null {
  return input === null || safeInteger(input);
}

/** Проверка учёта отправки; вход не доверенный (порт раннера, запись хранилища). */
export function snapshotDispatchState(raw: unknown): AccountSyncDispatchState | null {
  const fields = captureExact(raw, ['batchId', 'failedAttempts', 'firstFailureAtMs', 'notBeforeMs', 'clockOffsetMs']);
  if (fields === null) return null;
  const batchId = value(fields, 'batchId');
  const failedAttempts = value(fields, 'failedAttempts');
  const firstFailureAtMs = value(fields, 'firstFailureAtMs');
  const notBeforeMs = value(fields, 'notBeforeMs');
  const clockOffsetMs = value(fields, 'clockOffsetMs');
  if ((batchId !== null && (typeof batchId !== 'string' || batchId.length === 0))
    || !safeInteger(failedAttempts) || !nullableSafe(firstFailureAtMs) || !nullableSafe(notBeforeMs)
    || (clockOffsetMs !== null && (typeof clockOffsetMs !== 'number' || !Number.isSafeInteger(clockOffsetMs)))
    || (failedAttempts === 0) !== (firstFailureAtMs === null)) return null;
  return Object.freeze({
    batchId: batchId as string | null, failedAttempts, firstFailureAtMs, notBeforeMs,
    clockOffsetMs: clockOffsetMs as number | null,
  });
}

export function dispatchJson(ownerUid: string, state: AccountSyncDispatchState): ScopeJson {
  return {
    kind: 'account_sync_outbox_dispatch', version: VERSION, ownerUid,
    batchId: state.batchId, failedAttempts: state.failedAttempts, firstFailureAtMs: state.firstFailureAtMs,
    notBeforeMs: state.notBeforeMs, clockOffsetMs: state.clockOffsetMs,
  };
}

export function parseDispatch(raw: ScopeJson, ownerUid: string): AccountSyncDispatchState {
  const fields = captureExact(raw, [
    'kind', 'version', 'ownerUid', 'batchId', 'failedAttempts', 'firstFailureAtMs', 'notBeforeMs', 'clockOffsetMs',
  ]);
  if (fields === null || value(fields, 'kind') !== 'account_sync_outbox_dispatch'
    || value(fields, 'version') !== VERSION || value(fields, 'ownerUid') !== ownerUid) {
    return fail('account_sync_outbox_corrupt');
  }
  const state = snapshotDispatchState({
    batchId: value(fields, 'batchId'), failedAttempts: value(fields, 'failedAttempts'),
    firstFailureAtMs: value(fields, 'firstFailureAtMs'), notBeforeMs: value(fields, 'notBeforeMs'),
    clockOffsetMs: value(fields, 'clockOffsetMs'),
  });
  return state ?? fail('account_sync_outbox_corrupt');
}

export function unresolvedJson(ownerUid: string, operationIds: readonly string[]): ScopeJson {
  return { kind: 'account_sync_outbox_unresolved', version: VERSION, ownerUid, operationIds: [...operationIds] };
}

export function parseUnresolved(raw: ScopeJson, ownerUid: string): readonly string[] {
  const fields = captureExact(raw, ['kind', 'version', 'ownerUid', 'operationIds']);
  const operationIds = fields === null ? undefined : value(fields, 'operationIds');
  if (fields === null || value(fields, 'kind') !== 'account_sync_outbox_unresolved'
    || value(fields, 'version') !== VERSION || value(fields, 'ownerUid') !== ownerUid
    || !Array.isArray(operationIds) || operationIds.some((id) => typeof id !== 'string')
    || new Set(operationIds).size !== operationIds.length) return fail('account_sync_outbox_corrupt');
  return Object.freeze([...operationIds as string[]]);
}

/**
 * Более поздние ПОДТВЕРЖДЁННЫЕ операции той же сущности, пришедшие после
 * неразрешённой квитанции (ключ — её operationId).
 * зачем (TG-CF3E51F11C41, P2): подтверждённая правка уже ушла из очереди, найти её
 * перебором нельзя (слоты ниже головы удалены), а перевыпуск SRS обязан её учесть,
 * иначе старое значение поля затрёт новое на сервере.
 */
/**
 * Потолок списка later:<id> — 200 последних id.
 * зачем (TG-085BF4F55515, P3-2): неразрешённая квитанция может висеть долго, а
 * карточку правят часто — без потолка запись росла бы без предела. Планировщику
 * SRS нужны лишь самые поздние правки полей, старейшие отбрасываются первыми.
 */
export const ACCOUNT_SYNC_LATER_MAX_IDS = 200;

export function laterKey(operationId: string): string {
  return `${LATER_PREFIX}${JSON.stringify(operationId)}`;
}

export function laterJson(ownerUid: string, operationIds: readonly string[]): ScopeJson {
  return { kind: 'account_sync_outbox_later', version: VERSION, ownerUid, operationIds: [...operationIds] };
}

export function parseLater(raw: ScopeJson, ownerUid: string): readonly string[] {
  const fields = captureExact(raw, ['kind', 'version', 'ownerUid', 'operationIds']);
  const operationIds = fields === null ? undefined : value(fields, 'operationIds');
  if (fields === null || value(fields, 'kind') !== 'account_sync_outbox_later'
    || value(fields, 'version') !== VERSION || value(fields, 'ownerUid') !== ownerUid
    || !Array.isArray(operationIds) || operationIds.some((id) => typeof id !== 'string')
    || new Set(operationIds).size !== operationIds.length) return fail('account_sync_outbox_corrupt');
  return Object.freeze([...operationIds as string[]]);
}

export function semanticEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (typeof left !== 'object' || left === null
    || typeof right !== 'object' || right === null) return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length
      && left.every((entry, index) => semanticEqual(entry, right[index]));
  }
  const leftKeys = Object.keys(left as object).sort();
  const rightKeys = Object.keys(right as object).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) => key === rightKeys[index]
      && semanticEqual(
        (left as Record<string, unknown>)[key],
        (right as Record<string, unknown>)[key],
      ));
}

export function receiptsCompatible(stored: AccountSyncServerReceipt, requested: AccountSyncServerReceipt): boolean {
  return stored.operationId === requested.operationId
    && stored.serverRevision === requested.serverRevision;
}

export function stringWireBytes(input: string): number {
  let bytes = 2;
  for (let index = 0; index < input.length; index += 1) {
    const unit = input.charCodeAt(index);
    if (unit === 0x22 || unit === 0x5c || unit === 0x08 || unit === 0x09
      || unit === 0x0a || unit === 0x0c || unit === 0x0d) bytes += 2;
    else if (unit < 0x20) bytes += 6;
    else if (unit < 0x80) bytes += 1;
    else if (unit < 0x800) bytes += 2;
    else if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = index + 1 < input.length ? input.charCodeAt(index + 1) : -1;
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        index += 1;
      } else bytes += 6;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) bytes += 6;
    else bytes += 3;
  }
  return bytes;
}

export function jsonWireBytes(input: unknown): number {
  if (input === null) return 4;
  if (typeof input === 'boolean') return input ? 4 : 5;
  if (typeof input === 'string') return stringWireBytes(input);
  if (typeof input === 'number' && Number.isFinite(input)) return String(Object.is(input, -0) ? 0 : input).length;
  if (Array.isArray(input)) {
    return 2 + Math.max(0, input.length - 1)
      + input.reduce((total, child) => total + jsonWireBytes(child), 0);
  }
  if (typeof input !== 'object' || input === null) return fail('account_sync_outbox_corrupt');
  const keys = Object.keys(input);
  return 2 + Math.max(0, keys.length - 1) + keys.reduce((total, key) => (
    total + stringWireBytes(key) + 1
      + jsonWireBytes((input as Record<string, unknown>)[key])
  ), 0);
}

export function fullBatchBytes(id: string, operationBytes: number, operationCount: number): number {
  return 2
    + stringWireBytes('batchId') + 1 + stringWireBytes(id) + 1
    + stringWireBytes('operations') + 1
    + 2 + Math.max(0, operationCount - 1) + operationBytes;
}

export function mapTransactionError(error: unknown): never {
  if (error instanceof AccountSyncOutboxError) throw error;
  if (error instanceof AccountScopeStoreError && error.code === 'account_scope_stale') {
    return fail('account_sync_outbox_stale');
  }
  console.warn('[ACCOUNTS-V2-CLIENT] outbox_transaction_failed',
    error instanceof Error ? error.name : typeof error);
  return fail('account_sync_outbox_transaction_failed');
}
