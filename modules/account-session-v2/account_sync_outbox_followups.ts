import type { SessionFence } from './account_session';
import type { AccountScopeTransaction, ScopeJson } from './account_scope_store';
import type { AccountSyncOwnedOperation, AccountSyncServerReceipt } from './account_sync';
import {
  ACCOUNT_SYNC_LATER_MAX_IDS,
  AccountSyncOutboxError,
  DISPATCH_KEY,
  MAX_OPERATIONS,
  UNRESOLVED_KEY,
  ackJson,
  assertExpectedFence,
  dispatchJson,
  errorKind,
  fail,
  laterJson,
  laterKey,
  normalizeOperation,
  operationKey,
  parseAck,
  parseLater,
  parseUnresolved,
  snapshotDispatchState,
  unresolvedJson,
  type Ack,
  type AccountSyncDispatchState,
  type EnqueueTimes,
  type Meta,
  type Pending,
  type Quarantined,
} from './account_sync_outbox_records';
import { ACCOUNT_SYNC_CLIENT_ERROR_CONTRACT, ACCOUNT_SYNC_REQUEUE_DELAY_MS } from './account_sync_transport';

/*
 * Account V2 — ремонт №1 (TG-7CD73967EF61): то, что в outbox происходит ПОСЛЕ
 * отправки пакета. Вынесено из account_sync_outbox.ts (правило ≤ 800 строк).
 *
 *  - учёт отправки на диске (readDispatchState/writeDispatchState): неудачи
 *    пакета, время первой неудачи, пауза и смещение часов сервера переживают
 *    перезапуск — иначе потолок «5 неудач за сутки» обнулялся бы каждым запуском;
 *  - requeue: возвратные карантины (ремонт №2, TG-CF3E51F11C41 — список в
 *    ACCOUNT_SYNC_CLIENT_ERROR_CONTRACT.requeueQuarantineCodes: потолок попыток,
 *    «кривые квитанции», «просрочено по часам»). Операции возвращаются в хвост
 *    очереди в исходном порядке, конверт (и baseRevision) не меняется, срок жизни —
 *    прежний (обе оценки времени постановки); после отказов сервера первая
 *    отправка — после долгой паузы;
 *  - listUnresolved/markResolved: квитанции conflict/rejected лежат в ack с
 *    флагом resolved=false, пока слой разрешения их не обработал. Замены (например,
 *    перевыпуск SRS) ПЛАНИРУЮТСЯ и ставятся в очередь В ТОЙ ЖЕ транзакции, что и
 *    отметка (ремонт №2): планировщик видит все более поздние правки той же
 *    сущности — и ожидающие, и уже подтверждённые сервером.
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

/** Что видит планировщик замен ВНУТРИ транзакции markResolved. */
export type AccountSyncOutboxResolveContext = Readonly<{
  sequence: number;
  operation: AccountSyncOwnedOperation;
  receipt: AccountSyncServerReceipt;
  /**
   * Более поздние (по номеру очереди) операции той же сущности: подтверждённые
   * сервером и ожидающие отправки, по порядку очереди.
   */
  laterOperations: readonly AccountSyncOwnedOperation[];
  /** Смещение часов сервера с диска (null — ответа сервера ещё не было). */
  serverClockOffsetMs: number | null;
}>;

/**
 * Планировщик замен: синхронный и без ввода-вывода (работает внутри транзакции).
 * Бросок = отказ markResolved без изменений.
 */
export type AccountSyncOutboxReplacementPlanner = (
  context: AccountSyncOutboxResolveContext,
) => readonly AccountSyncOwnedOperation[];

export type AccountSyncOutboxFollowups = Readonly<{
  readDispatchState(expectedFence: SessionFence): Promise<AccountSyncDispatchState>;
  writeDispatchState(expectedFence: SessionFence, state: AccountSyncDispatchState): Promise<void>;
  requeue(expectedFence: SessionFence, operationIds: readonly string[]): Promise<AccountSyncOutboxRequeueResult>;
  listUnresolved(expectedFence: SessionFence): Promise<readonly AccountSyncOutboxUnresolved[]>;
  markResolved(
    expectedFence: SessionFence,
    operationId: string,
    planner: AccountSyncOutboxReplacementPlanner,
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
    kept?: EnqueueTimes,
  ): Promise<Readonly<{ outcome: string; pendingCount: number }>>;
  /** Все живые операции очереди от головы (по порядку). */
  scanQueue(
    transaction: AccountScopeTransaction,
    meta: Meta,
  ): Promise<readonly Readonly<{ sequence: number; pending: Pending }>[]>;
}>;

const LOG = '[ACCOUNTS-V2-CLIENT]';
const REQUEUE_CODES: readonly string[] = ACCOUNT_SYNC_CLIENT_ERROR_CONTRACT.requeueQuarantineCodes;

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

function sameEntity(left: AccountSyncOwnedOperation, right: AccountSyncOwnedOperation): boolean {
  return left.operation.entityType === right.operation.entityType
    && left.operation.entityId === right.operation.entityId;
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

/**
 * Список later:<id>; битая запись — пустой список с логом.
 * зачем (TG-085BF4F55515, P3-1): иначе одна повреждённая запись навсегда роняла бы
 * и ack той же сущности, и markResolved квитанции.
 */
function readLaterOrEmpty(raw: ScopeJson, ownerUid: string): readonly string[] {
  try {
    return parseLater(raw, ownerUid);
  } catch (error) {
    if (!(error instanceof AccountSyncOutboxError)) throw error;
    console.warn(`${LOG} outbox_later_entry_dropped`, 'reason=later_record_corrupt');
    return [];
  }
}

/**
 * В той же транзакции, что и ack: для каждой неразрешённой квитанции (прежней и
 * новой) запоминает id подтверждённых сейчас операций той же сущности с БОЛЬШИМ
 * номером очереди.
 * зачем (TG-CF3E51F11C41, P2): такая правка уже ушла из очереди, и без этой записи
 * перевыпуск SRS вернул бы старое значение поля поверх нового на сервере.
 */
export async function recordLaterConfirmed(
  transaction: AccountScopeTransaction,
  ownerUid: string,
  committed: readonly Ack[],
  newlyUnresolved: readonly Ack[],
): Promise<void> {
  if (committed.length === 0) return;
  const index = await transaction.readRecord(UNRESOLVED_KEY);
  const targets: Ack[] = [...newlyUnresolved];
  for (const operationId of index === null ? [] : parseUnresolved(index.value, ownerUid)) {
    if (targets.some((target) => target.envelope.operation.operationId === operationId)) continue;
    const record = await transaction.readRecord(operationKey('ack', operationId));
    try {
      if (record === null) throw new AccountSyncOutboxError('account_sync_outbox_corrupt');
      targets.push(parseAck(record.value, ownerUid));
    } catch (error) {
      if (!(error instanceof AccountSyncOutboxError)) throw error;
      // Несогласованную запись индекса уберёт listUnresolved; ack из-за неё не роняем.
      console.warn(`${LOG} outbox_later_target_unreadable`, `error=${errorKind(error)}`);
    }
  }
  for (const target of targets) {
    const later = committed.filter((row) => row.sequence > target.sequence && sameEntity(row.envelope, target.envelope))
      .map((row) => row.envelope.operation.operationId);
    if (later.length === 0) continue;
    const key = laterKey(target.envelope.operation.operationId);
    const stored = await transaction.readRecord(key);
    const current = stored === null ? [] : readLaterOrEmpty(stored.value, ownerUid);
    // зачем (TG-085BF4F55515, P3-2): слияние через Set — без квадратичного includes.
    const seen = new Set(current);
    const merged = [...current, ...later.filter((id) => !seen.has(id))];
    if (merged.length === current.length) continue;
    const capped = merged.length > ACCOUNT_SYNC_LATER_MAX_IDS ? merged.slice(-ACCOUNT_SYNC_LATER_MAX_IDS) : merged;
    if (capped.length < merged.length) {
      console.warn(`${LOG} outbox_later_capped`, `dropped=${merged.length - capped.length}`);
    }
    await transaction.putRecord({ key, value: laterJson(ownerUid, capped) });
  }
}

function planReplacements(
  planner: AccountSyncOutboxReplacementPlanner,
  context: AccountSyncOutboxResolveContext,
  ownerUid: string,
): readonly AccountSyncOwnedOperation[] {
  let planned: unknown;
  try {
    planned = planner(context);
  } catch (error) {
    console.warn(`${LOG} outbox_resolve_planner_failed`, `error=${errorKind(error)}`);
    return fail('account_sync_outbox_invalid_input');
  }
  if (!Array.isArray(planned) || planned.length > MAX_OPERATIONS) {
    console.warn(`${LOG} outbox_resolve_plan_invalid`, `type=${Array.isArray(planned) ? 'too_long' : typeof planned}`);
    return fail('account_sync_outbox_invalid_input');
  }
  return Object.freeze((planned as unknown[]).map((raw) => normalizeOperation(raw, ownerUid)));
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
        if (!REQUEUE_CODES.includes(stored.code)) {
          console.warn(`${LOG} outbox_requeue_refused`, `code=${stored.code}`);
          return fail('account_sync_outbox_conflict');
        }
        found.push(stored);
      }
      // зачем: исходный порядок очереди — по номерам, а не по порядку в запросе.
      const ordered = [...found].sort((left, right) => left.sequence - right.sequence);
      for (const stored of ordered) {
        await transaction.deleteRecord(operationKey('quarantine', stored.envelope.operation.operationId));
        const staged = await context.stageOperation(transaction, stored.envelope, Object.freeze({
          enqueuedAtMs: stored.enqueuedAtMs, enqueuedLocalAtMs: stored.enqueuedLocalAtMs, firstSent: stored.firstSent,
        }));
        if (staged.outcome !== 'enqueued') return fail('account_sync_outbox_corrupt');
      }
      // зачем (TG-CF3E51F11C41): пауза и сброс учёта — только если сервер отказывал
      // (потолок, кривые квитанции, «время из будущего»). Просроченной по часам
      // операции пауза не нужна. зачем (TG-DFA918464DFA, ремонт №1, P3): после
      // `sync_operation_time_in_future` пауза даёт часам/смещению устояться —
      // иначе возврат сразу же мог бы получить тот же отказ по кругу.
      if (ordered.some((stored) => stored.code !== 'sync_operation_expired')) {
        const current = await context.readDispatch(transaction);
        const paused: AccountSyncDispatchState = Object.freeze({
          ...current, batchId: null, failedAttempts: 0, firstFailureAtMs: null,
          notBeforeMs: context.localNowMs() + ACCOUNT_SYNC_REQUEUE_DELAY_MS,
        });
        await transaction.putRecord({ key: DISPATCH_KEY, value: dispatchJson(ownerUid, paused) });
      }
      const after = await readMeta(transaction);
      console.warn(`${LOG} outbox_requeued`, `operations=${ordered.length}`,
        `codes=${[...new Set(ordered.map((stored) => stored.code))].join(',')}`, `pending=${after?.pendingCount ?? 0}`);
      return Object.freeze({
        requeuedOperationIds: Object.freeze(ordered.map((stored) => stored.envelope.operation.operationId)),
        pendingCount: after?.pendingCount ?? 0,
      });
    });
  };

  /** Убирает несогласованные записи индекса (и их списки поздних правок) с логом причины. */
  const dropUnresolved = async (
    transaction: AccountScopeTransaction,
    dropped: readonly Readonly<{ operationId: string; reason: string }>[],
  ): Promise<void> => {
    if (dropped.length === 0) return;
    for (const { operationId, reason } of dropped) {
      // зачем (TG-CF3E51F11C41, P3): одна битая запись не должна ронять весь список.
      console.warn(`${LOG} outbox_unresolved_entry_dropped`, `reason=${reason}`);
      if (await transaction.readRecord(laterKey(operationId)) !== null) await transaction.deleteRecord(laterKey(operationId));
    }
    await updateUnresolvedIndex(transaction, ownerUid, [], dropped.map(({ operationId }) => operationId));
  };

  const listUnresolved = async (rawFence: SessionFence): Promise<readonly AccountSyncOutboxUnresolved[]> => {
    assertExpectedFence(rawFence, boundFence, ownerUid);
    return transact(async (transaction) => {
      const meta = await readMeta(transaction);
      const index = await transaction.readRecord(UNRESOLVED_KEY);
      if (meta === null || index === null) return Object.freeze([]);
      const rows: AccountSyncOutboxUnresolved[] = [];
      const dropped: { operationId: string; reason: string }[] = [];
      for (const operationId of parseUnresolved(index.value, ownerUid)) {
        const record = await transaction.readRecord(operationKey('ack', operationId));
        if (record === null) {
          dropped.push({ operationId, reason: 'ack_missing' });
          continue;
        }
        let stored: Ack;
        try {
          stored = await context.validateStoredAck(transaction, record.value, meta, operationId);
        } catch (error) {
          if (!(error instanceof AccountSyncOutboxError) || error.code !== 'account_sync_outbox_corrupt') throw error;
          dropped.push({ operationId, reason: 'ack_corrupt' });
          continue;
        }
        if (stored.resolved) {
          dropped.push({ operationId, reason: 'ack_resolved' });
          continue;
        }
        rows.push(Object.freeze({ sequence: stored.sequence, operation: stored.envelope, receipt: stored.receipt }));
      }
      await dropUnresolved(transaction, dropped);
      return Object.freeze(rows.sort((left, right) => left.sequence - right.sequence));
    });
  };

  /** Более поздние операции той же сущности: подтверждённые (из записи later) и ожидающие. */
  const laterOperationsOf = async (
    transaction: AccountScopeTransaction,
    meta: Meta,
    stored: Ack,
  ): Promise<readonly AccountSyncOwnedOperation[]> => {
    const rows: { sequence: number; envelope: AccountSyncOwnedOperation }[] = [];
    const operationId = stored.envelope.operation.operationId;
    const laterRecord = await transaction.readRecord(laterKey(operationId));
    for (const laterId of laterRecord === null ? [] : readLaterOrEmpty(laterRecord.value, ownerUid)) {
      const record = await transaction.readRecord(operationKey('ack', laterId));
      // зачем (TG-085BF4F55515, P3-1): пропавшая или битая запись из later:<id> —
      // пропуск с логом, а не вечный отказ markResolved (квитанция висела бы всегда).
      if (record === null) {
        console.warn(`${LOG} outbox_later_entry_dropped`, 'reason=ack_missing');
        continue;
      }
      let confirmed: Ack;
      try {
        confirmed = await context.validateStoredAck(transaction, record.value, meta, laterId);
      } catch (error) {
        if (!(error instanceof AccountSyncOutboxError) || error.code !== 'account_sync_outbox_corrupt') throw error;
        console.warn(`${LOG} outbox_later_entry_dropped`, 'reason=ack_corrupt');
        continue;
      }
      rows.push({ sequence: confirmed.sequence, envelope: confirmed.envelope });
    }
    for (const { sequence, pending } of await context.scanQueue(transaction, meta)) {
      rows.push({ sequence, envelope: pending.envelope });
    }
    return Object.freeze(rows
      .filter((row) => row.sequence > stored.sequence && sameEntity(row.envelope, stored.envelope))
      .sort((left, right) => left.sequence - right.sequence)
      .map((row) => row.envelope));
  };

  const markResolved = async (
    rawFence: SessionFence,
    rawOperationId: string,
    planner: AccountSyncOutboxReplacementPlanner,
  ): Promise<AccountSyncOutboxResolveResult> => {
    assertExpectedFence(rawFence, boundFence, ownerUid);
    const [operationId] = operationIdList([rawOperationId], false);
    if (typeof planner !== 'function') return fail('account_sync_outbox_invalid_input');
    return transact(async (transaction) => {
      const meta = await readMeta(transaction);
      const record = await transaction.readRecord(operationKey('ack', operationId));
      if (meta === null || record === null) return fail('account_sync_outbox_invalid_input');
      const stored = await context.validateStoredAck(transaction, record.value, meta, operationId);
      if (stored.resolved) return Object.freeze({ outcome: 'already_resolved' as const, pendingCount: meta.pendingCount });
      // зачем (TG-CF3E51F11C41, P2): план считается ЗДЕСЬ, внутри транзакции — правка,
      // пришедшая между чтением квитанции и отметкой, не может проскочить мимо плана.
      const laterOperations = await laterOperationsOf(transaction, meta, stored);
      const replacements = planReplacements(planner, Object.freeze({
        sequence: stored.sequence, operation: stored.envelope, receipt: stored.receipt, laterOperations,
        serverClockOffsetMs: (await context.readDispatch(transaction)).clockOffsetMs,
      }), ownerUid);
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
      if (await transaction.readRecord(laterKey(operationId)) !== null) await transaction.deleteRecord(laterKey(operationId));
      const after = await readMeta(transaction);
      console.warn(`${LOG} outbox_resolved`, `outcome=${stored.receipt.outcome}`,
        `later=${laterOperations.length}`, `replacements=${replacements.length}`, `staged=${staged}`);
      return Object.freeze({ outcome: 'resolved' as const, pendingCount: after?.pendingCount ?? meta.pendingCount });
    });
  };

  return Object.freeze({ readDispatchState, writeDispatchState, requeue, listUnresolved, markResolved });
}
