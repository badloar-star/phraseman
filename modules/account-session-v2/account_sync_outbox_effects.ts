import type { SessionFence } from './account_session';
import {
  createInitialAccountSyncState,
  reduceAccountSync,
  type AccountSyncBatch,
  type AccountSyncEffect,
  type AccountSyncQuarantineCode,
  type AccountSyncServerReceipt,
} from './account_sync';
import {
  MAX_BATCH_BYTES,
  MAX_OPERATIONS,
  assertExpectedFence,
  captureExact,
  errorKind,
  fail,
  safeInteger,
  value,
} from './account_sync_outbox_records';

const LOG = '[ACCOUNTS-V2-CLIENT]';

/*
 * Account V2 — проверка эффектов, пришедших в outbox (load / ack / карантин).
 * зачем: вынесено из account_sync_outbox.ts без изменений логики (правило ≤ 800
 * строк на файл) при ремонте №1 (TG-7CD73967EF61). Пакет и квитанции проверяются
 * ТЕМ ЖЕ reducer'ом, что и при отправке, — форма не может разойтись.
 */

type LoadEffect = Extract<AccountSyncEffect, { type: 'LOAD_OUTBOX_BATCH' }>;

/** Прогоняет пакет через reducer до нужной фазы: форма пакета проверяется ровно как при отправке. */
function reducePacket(
  ownerUid: string,
  boundFence: SessionFence,
  rawBatch: unknown,
): ReturnType<typeof reduceAccountSync>['state'] {
  const batchFields = captureExact(rawBatch, ['batchId', 'operations']);
  if (batchFields === null) return fail('account_sync_outbox_invalid_input');
  const initial = createInitialAccountSyncState(ownerUid, boundFence, MAX_OPERATIONS);
  const loading = reduceAccountSync(initial, { type: 'SYNC_REQUESTED' }).state;
  return reduceAccountSync(loading, {
    type: 'OUTBOX_BATCH_LOADED', expectedFence: boundFence, attemptEpoch: 1,
    batchId: value(batchFields, 'batchId') as string,
    operations: value(batchFields, 'operations') as readonly unknown[],
    pendingCount: MAX_OPERATIONS,
  }).state;
}

export function normalizeAckEffect(
  raw: unknown,
  boundFence: SessionFence,
  ownerUid: string,
): Readonly<{ batch: AccountSyncBatch; receipts: readonly AccountSyncServerReceipt[] }> {
  const fields = captureExact(raw, [
    'type', 'ownerUid', 'expectedFence', 'attemptEpoch', 'batch', 'receipts',
  ]);
  if (fields === null || value(fields, 'type') !== 'COMMIT_OUTBOX_ACKS'
    || value(fields, 'ownerUid') !== ownerUid || !safeInteger(value(fields, 'attemptEpoch'))) {
    return fail('account_sync_outbox_invalid_input');
  }
  assertExpectedFence(value(fields, 'expectedFence'), boundFence, ownerUid);
  try {
    const dispatched = reducePacket(ownerUid, boundFence, value(fields, 'batch'));
    if (dispatched.phase.tag !== 'dispatching') return fail('account_sync_outbox_invalid_input');
    const acknowledged = reduceAccountSync(dispatched, {
      type: 'DISPATCH_RESPONSE_RECEIVED', expectedFence: boundFence, attemptEpoch: 2,
      batchId: dispatched.phase.batch.batchId,
      receipts: value(fields, 'receipts') as readonly unknown[],
    }).state;
    if (acknowledged.phase.tag !== 'ack_commit_pending') return fail('account_sync_outbox_invalid_input');
    return Object.freeze({ batch: acknowledged.phase.batch, receipts: acknowledged.phase.receipts });
  } catch (error) {
    // Эффект не прошёл проверку reducer'а (форма пакета/квитанций) — невалидный вход.
    console.warn(`${LOG} outbox_ack_effect_invalid`, `error=${errorKind(error)}`);
    return fail('account_sync_outbox_invalid_input');
  }
}

export function normalizeQuarantineEffect(
  raw: unknown,
  boundFence: SessionFence,
  ownerUid: string,
): Readonly<{ batch: AccountSyncBatch; quarantineCode: AccountSyncQuarantineCode }> {
  const fields = captureExact(raw, [
    'type', 'ownerUid', 'expectedFence', 'attemptEpoch', 'batch', 'quarantineCode',
  ]);
  if (fields === null || value(fields, 'type') !== 'QUARANTINE_OUTBOX_BATCH'
    || value(fields, 'ownerUid') !== ownerUid || !safeInteger(value(fields, 'attemptEpoch'))) {
    return fail('account_sync_outbox_invalid_input');
  }
  assertExpectedFence(value(fields, 'expectedFence'), boundFence, ownerUid);
  try {
    const dispatched = reducePacket(ownerUid, boundFence, value(fields, 'batch'));
    if (dispatched.phase.tag !== 'dispatching') return fail('account_sync_outbox_invalid_input');
    const requested = reduceAccountSync(dispatched, {
      type: 'DISPATCH_QUARANTINE_REQUESTED', expectedFence: boundFence, attemptEpoch: 2,
      batchId: dispatched.phase.batch.batchId,
      quarantineCode: value(fields, 'quarantineCode') as AccountSyncQuarantineCode,
    }).state;
    if (requested.phase.tag !== 'quarantine_pending') return fail('account_sync_outbox_invalid_input');
    return Object.freeze({ batch: requested.phase.batch, quarantineCode: requested.phase.quarantineCode });
  } catch (error) {
    // Эффект не прошёл проверку reducer'а — невалидный вход.
    console.warn(`${LOG} outbox_quarantine_effect_invalid`, `error=${errorKind(error)}`);
    return fail('account_sync_outbox_invalid_input');
  }
}

export function snapshotLoadEffect(raw: unknown, boundFence: SessionFence, ownerUid: string): LoadEffect {
  const fields = captureExact(raw, [
    'type', 'ownerUid', 'expectedFence', 'attemptEpoch', 'maxOperations', 'maxBatchUtf8Bytes',
  ]);
  if (fields === null || value(fields, 'type') !== 'LOAD_OUTBOX_BATCH'
    || value(fields, 'ownerUid') !== ownerUid || !safeInteger(value(fields, 'attemptEpoch'))
    || value(fields, 'maxOperations') !== MAX_OPERATIONS
    || value(fields, 'maxBatchUtf8Bytes') !== MAX_BATCH_BYTES) {
    return fail('account_sync_outbox_invalid_input');
  }
  return Object.freeze({
    type: 'LOAD_OUTBOX_BATCH', ownerUid,
    expectedFence: assertExpectedFence(value(fields, 'expectedFence'), boundFence, ownerUid),
    attemptEpoch: value(fields, 'attemptEpoch') as number,
    maxOperations: MAX_OPERATIONS,
    maxBatchUtf8Bytes: MAX_BATCH_BYTES,
  });
}

/**
 * Пакет эффекта отправки (DISPATCH_OUTBOX_BATCH) — для сборки пакета на провод
 * (outbox.wireBatch, TG-DFA918464DFA). Форма проверяется тем же reducer'ом.
 */
export function normalizeDispatchEffect(raw: unknown, boundFence: SessionFence, ownerUid: string): AccountSyncBatch {
  const fields = captureExact(raw, ['type', 'ownerUid', 'expectedFence', 'attemptEpoch', 'batch']);
  if (fields === null || value(fields, 'type') !== 'DISPATCH_OUTBOX_BATCH'
    || value(fields, 'ownerUid') !== ownerUid || !safeInteger(value(fields, 'attemptEpoch'))) {
    return fail('account_sync_outbox_invalid_input');
  }
  assertExpectedFence(value(fields, 'expectedFence'), boundFence, ownerUid);
  try {
    const dispatched = reducePacket(ownerUid, boundFence, value(fields, 'batch'));
    if (dispatched.phase.tag !== 'dispatching') return fail('account_sync_outbox_invalid_input');
    return dispatched.phase.batch;
  } catch (error) {
    // Эффект не прошёл проверку reducer'а — невалидный вход.
    console.warn(`${LOG} outbox_dispatch_effect_invalid`, `error=${errorKind(error)}`);
    return fail('account_sync_outbox_invalid_input');
  }
}
