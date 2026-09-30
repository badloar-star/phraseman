import type { SessionFence } from './account_session';
import type { AccountScopeTransaction, ScopeJson } from './account_scope_store';
import type { AccountSyncOwnedOperation, AccountSyncServerReceipt } from './account_sync';
import {
  DISPATCH_KEY,
  MAX_OPERATIONS,
  UNRESOLVED_KEY,
  ackJson,
  assertExpectedFence,
  dispatchJson,
  fail,
  normalizeOperation,
  operationKey,
  parseUnresolved,
  snapshotDispatchState,
  unresolvedJson,
  type Ack,
  type AccountSyncDispatchState,
  type Meta,
  type Quarantined,
} from './account_sync_outbox_records';
import { ACCOUNT_SYNC_REQUEUE_DELAY_MS } from './account_sync_transport';

/*
 * Account V2 — ремонт №1 (TG-7CD73967EF61): то, что в outbox происходит ПОСЛЕ
 * отправки пакета. Вынесено из account_sync_outbox.ts (правило ≤ 800 строк).
 *
 *  - учёт отправки на диске (readDispatchState/writeDispatchState): неудачи
 *    пакета, время первой неудачи, пауза и смещение часов сервера переживают
 *    перезапуск — иначе потолок «5 неудач за сутки» обнулялся бы каждым запуском;
 *  - requeue: карантин по потолку ВОЗВРАТНЫЙ. Операции `sync_dispatch_attempts_exhausted`
 *    возвращаются в хвост очереди в исходном порядке, конверт (и baseRevision) не
 *    меняется, срок жизни — прежний; первая отправка — после долгой паузы;
 *  - listUnresolved/markResolved: квитанции conflict/rejected лежат в ack с
 *    флагом resolved=false, пока слой разрешения их не обработал. Замены (например,
 *    перевыпуск SRS) ставятся в очередь В ТОЙ ЖЕ транзакции, что и отметка.
 */

export type AccountSyncOutboxRequeueResult = Readonly<{
  requeuedOperationIds: readonly string[];
  pendingCount: number;
}>;

export type AccountSyncOutboxUnresolved = Readonly<{
  sequence: number;
  operation: AccountSyncOwnedOperation;
  receipt: AccountSyncServerReceipt;
}>;

export type AccountSyncOutboxResolveResult = Readonly<{
  outcome: 'resolved' | 'already_resolved';
  pendingCount: number;
}>;

export type AccountSyncOutboxFollowups = Readonly<{
  readDispatchState(expectedFence: SessionFence): Promise<AccountSyncDispatchState>;
  writeDispatchState(expectedFence: SessionFence, state: AccountSyncDispatchState): Promise<void>;
  requeue(expectedFence: SessionFence, operationIds: readonly string[]): Promise<AccountSyncOutboxRequeueResult>;
  listUnresolved(expectedFence: SessionFence): Promise<readonly AccountSyncOutboxUnresolved[]>;
  markResolved(
    expectedFence: SessionFence,
    operationId: string,
    replacements: readonly AccountSyncOwnedOperation[],
  ): Promise<AccountSyncOutboxResolveResult>;
}>;

export type AccountSyncOutboxContext = Readonly<{
  ownerUid: string;
  boundFence: SessionFence;
  transact<T>(work: (transaction: AccountScopeTransaction) => Promise<T>): Promise<T>;
  readMeta(transaction: AccountScopeTransaction): Promise<Meta | null>;
  readDispatch(transaction: AccountScopeTransaction): Promise<AccountSyncDispatchState>;
  localNowMs(): number;
  validateStoredAck(transaction: AccountScopeTransaction, raw: ScopeJson, meta: Meta, operationId: string): Promise<Ack>;
  validateStoredQuarantine(
    transaction: AccountScopeTransaction, raw: ScopeJson, meta: Meta, operationId: string,
  ): Promise<Quarantined>;
  stageOperation(
    transaction: AccountScopeTransaction,
    owned: AccountSyncOwnedOperation,
    enqueuedAtMs?: number,
  ): Promise<Readonly<{ outcome: string; pendingCount: number }>>;
}>;

const LOG = '[ACCOUNTS-V2-CLIENT]';

function operationIdList(raw: unknown, allowEmpty: boolean): readonly string[] {
  if (!Array.isArray(raw) || raw.length > MAX_OPERATIONS || (!allowEmpty && raw.length === 0)) {
    return fail('account_sync_outbox_invalid_input');
  }
  const ids = [...raw as unknown[]];
  if (ids.some((id) => typeof id !== 'string' || id.length === 0) || new Set(ids).size !== ids.length) {
    return fail('account_sync_outbox_invalid_input');
  }
  return Object.freeze(ids as string[]);
}

/** Добавляет/убирает id в индексе неразрешённых; пустой индекс удаляется (без лишних записей). */
export async function updateUnresolvedIndex(
  transaction: AccountScopeTransaction,
  ownerUid: string,
  add: readonly string[],
  remove: readonly string[],
): Promise<void> {
  if (add.length === 0 && remove.length === 0) return;
  const record = await transaction.readRecord(UNRESOLVED_KEY);
  const current = record === null ? [] : parseUnresolved(record.value, ownerUid);
  const next = [...current.filter((id) => !remove.includes(id)), ...add.filter((id) => !current.includes(id))];
  if (next.length === 0) {
    if (record !== null) await transaction.deleteRecord(UNRESOLVED_KEY);
    return;
  }
  await transaction.putRecord({ key: UNRESOLVED_KEY, value: unresolvedJson(ownerUid, next) });
}

export function createAccountSyncOutboxFollowups(context: AccountSyncOutboxContext): AccountSyncOutboxFollowups {
  const { ownerUid, boundFence, transact, readMeta } = context;

  const readDispatchState = async (rawFence: SessionFence): Promise<AccountSyncDispatchState> => {
    assertExpectedFence(rawFence, boundFence, ownerUid);
    return transact((transaction) => context.readDispatch(transaction));
  };

  const writeDispatchState = async (rawFence: SessionFence, rawState: AccountSyncDispatchState): Promise<void> => {
    assertExpectedFence(rawFence, boundFence, ownerUid);
    const state = snapshotDispatchState(rawState);
    if (state === null) return fail('account_sync_outbox_invalid_input');
    await transact(async (transaction) => {
      await transaction.putRecord({ key: DISPATCH_KEY, value: dispatchJson(ownerUid, state) });
    });
  };

  const requeue = async (
    rawFence: SessionFence,
    rawIds: readonly string[],
  ): Promise<AccountSyncOutboxRequeueResult> => {
    assertExpectedFence(rawFence, boundFence, ownerUid);
    const ids = operationIdList(rawIds, false);
    return transact(async (transaction) => {
      const meta = await readMeta(transaction);
      if (meta === null) return fail('account_sync_outbox_invalid_input');
      const found: Quarantined[] = [];
      for (const operationId of ids) {
        const record = await transaction.readRecord(operationKey('quarantine', operationId));
        if (record === null) {
          // Повтор после потерянного ответа: операция уже снова в очереди (или уже подтверждена).
          if (await transaction.readRecord(operationKey('pending', operationId)) !== null
            || await transaction.readRecord(operationKey('ack', operationId)) !== null) continue;
          console.warn(`${LOG} outbox_requeue_unknown`, `requested=${ids.length}`);
          return fail('account_sync_outbox_invalid_input');
        }
        const stored = await context.validateStoredQuarantine(transaction, record.value, meta, operationId);
        if (stored.code !== 'sync_dispatch_attempts_exhausted') {
          console.warn(`${LOG} outbox_requeue_refused`, `code=${stored.code}`);
          return fail('account_sync_outbox_conflict');
        }
        found.push(stored);
      }
      // зачем: исходный порядок очереди — по номерам, а не по порядку в запросе.
      const ordered = [...found].sort((left, right) => left.sequence - right.sequence);
      for (const stored of ordered) {
        await transaction.deleteRecord(operationKey('quarantine', stored.envelope.operation.operationId));
        const staged = await context.stageOperation(transaction, stored.envelope, stored.enqueuedAtMs);
        if (staged.outcome !== 'enqueued') return fail('account_sync_outbox_corrupt');
      }
      if (ordered.length > 0) {
        const current = await context.readDispatch(transaction);
        const paused: AccountSyncDispatchState = Object.freeze({
          ...current, batchId: null, failedAttempts: 0, firstFailureAtMs: null,
          notBeforeMs: context.localNowMs() + ACCOUNT_SYNC_REQUEUE_DELAY_MS,
        });
        await transaction.putRecord({ key: DISPATCH_KEY, value: dispatchJson(ownerUid, paused) });
      }
      const after = await readMeta(transaction);
      console.warn(`${LOG} outbox_requeued`, `operations=${ordered.length}`, `pending=${after?.pendingCount ?? 0}`);
      return Object.freeze({
        requeuedOperationIds: Object.freeze(ordered.map((stored) => stored.envelope.operation.operationId)),
        pendingCount: after?.pendingCount ?? 0,
      });
    });
  };

  const listUnresolved = async (rawFence: SessionFence): Promise<readonly AccountSyncOutboxUnresolved[]> => {
    assertExpectedFence(rawFence, boundFence, ownerUid);
    return transact(async (transaction) => {
      const meta = await readMeta(transaction);
      const index = await transaction.readRecord(UNRESOLVED_KEY);
      if (meta === null || index === null) return Object.freeze([]);
      const rows: AccountSyncOutboxUnresolved[] = [];
      for (const operationId of parseUnresolved(index.value, ownerUid)) {
        const record = await transaction.readRecord(operationKey('ack', operationId));
        if (record === null) return fail('account_sync_outbox_corrupt');
        const stored = await context.validateStoredAck(transaction, record.value, meta, operationId);
        if (stored.resolved) return fail('account_sync_outbox_corrupt');
        rows.push(Object.freeze({ sequence: stored.sequence, operation: stored.envelope, receipt: stored.receipt }));
      }
      return Object.freeze(rows.sort((left, right) => left.sequence - right.sequence));
    });
  };

  const markResolved = async (
    rawFence: SessionFence,
    rawOperationId: string,
    rawReplacements: readonly AccountSyncOwnedOperation[],
  ): Promise<AccountSyncOutboxResolveResult> => {
    assertExpectedFence(rawFence, boundFence, ownerUid);
    const [operationId] = operationIdList([rawOperationId], false);
    if (!Array.isArray(rawReplacements) || rawReplacements.length > MAX_OPERATIONS) {
      return fail('account_sync_outbox_invalid_input');
    }
    const replacements = rawReplacements.map((raw) => normalizeOperation(raw, ownerUid));
    return transact(async (transaction) => {
      const meta = await readMeta(transaction);
      const record = await transaction.readRecord(operationKey('ack', operationId));
      if (meta === null || record === null) return fail('account_sync_outbox_invalid_input');
      const stored = await context.validateStoredAck(transaction, record.value, meta, operationId);
      if (stored.resolved) return Object.freeze({ outcome: 'already_resolved' as const, pendingCount: meta.pendingCount });
      let staged = 0;
      for (const replacement of replacements) {
        const replacementId = replacement.operation.operationId;
        const existing = await Promise.all((['pending', 'ack', 'quarantine'] as const)
          .map((kind) => transaction.readRecord(operationKey(kind, replacementId))));
        // зачем: id перевыпуска детерминирован — уже поставленная замена (прошлая
        // попытка до краха) побеждает; вторую копию с другим временем не ставим.
        if (existing.some((row) => row !== null)) continue;
        await context.stageOperation(transaction, replacement);
        staged += 1;
      }
      await transaction.putRecord({
        key: operationKey('ack', operationId), value: ackJson(ownerUid, { ...stored, resolved: true }),
      });
      await updateUnresolvedIndex(transaction, ownerUid, [], [operationId]);
      const after = await readMeta(transaction);
      console.warn(`${LOG} outbox_resolved`, `outcome=${stored.receipt.outcome}`,
        `replacements=${replacements.length}`, `staged=${staged}`);
      return Object.freeze({ outcome: 'resolved' as const, pendingCount: after?.pendingCount ?? meta.pendingCount });
    });
  };

  return Object.freeze({ readDispatchState, writeDispatchState, requeue, listUnresolved, markResolved });
}
