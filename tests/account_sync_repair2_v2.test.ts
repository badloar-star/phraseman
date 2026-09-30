import { sameSessionFence, type AccountScope, type SessionFence } from '../modules/account-session-v2/account_session';
import {
  createAccountScopeStore,
  type AccountScopeHandle,
  type ScopeJson,
} from '../modules/account-session-v2/account_scope_store';
import type {
  AccountSyncEffect,
  AccountSyncOwnedOperation,
  AccountSyncServerReceipt,
} from '../modules/account-session-v2/account_sync';
import {
  AccountSyncOutboxError,
  createAccountSyncOutbox,
  type AccountSyncOutbox,
  type AccountSyncOutboxLoadResult,
  type AccountSyncOutboxResolveContext,
} from '../modules/account-session-v2/account_sync_outbox';
import {
  createAccountSyncRunner,
  type AccountSyncRunnerPorts,
} from '../modules/account-session-v2/account_sync_runner';
import { captureExactRecord } from '../modules/account-session-v2/account_sync_runner_ports';
import { planAccountSyncSrsReissue } from '../modules/account-session-v2/account_sync_srs_reissue';
import {
  ACCOUNT_SYNC_CLIENT_ERROR_CONTRACT,
  ACCOUNT_SYNC_REQUEUE_DELAY_MS,
  decideAccountSyncReceiptFailure,
  decideAccountSyncTransportFailure,
} from '../modules/account-session-v2/account_sync_transport';
import { MemoryScopeStorageAdapter } from '../modules/account-session-v2/testing/memory_scope_storage';

/*
 * Account V2 — ремонт №2 клиентского пакета синхронизации (TG-CF3E51F11C41).
 * P1: срок жизни — две оценки возраста (местные часы и часы с поправкой на
 * сервер), истечение только если ОБЕ > 170 суток; `sync_operation_expired` и
 * `sync_receipt_invalid_exhausted` — возвратные карантины.
 * P2: перевыпуск SRS учитывает подтверждённые и ожидающие более поздние правки
 * той же карточки; план считается ВНУТРИ транзакции markResolved.
 * P3: firstFailureAtMs = min; пауза в памяти ≤ 25 ч; учёт неудач по голове
 * очереди; незаписанный учёт не затирает паузу requeue; битый индекс unresolved
 * чистится с логом; немые catch пишут код.
 */

const UID = 'uid/repair2';
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const YEAR_MS = 365 * DAY_MS;
const MAX_PAUSE_MS = 25 * HOUR_MS;
const REAL_NOW = 1_800_000_000_000;
const FUTURE_SRS = 9_000_000_000_000;
const PREFIX = '__account_sync_outbox_v2__:';
const fenceA: SessionFence = Object.freeze({
  scopeKey: `account:${UID}`, uid: UID, generation: 1, nonce: 'nonce-r2',
});
const scopeA: Extract<AccountScope, { kind: 'account' }> = { kind: 'account', uid: UID, scopeKey: `account:${UID}` };

function op(
  operationId: string,
  entityId = `entity/${operationId}`,
  payload: unknown = { op: 'upsert', fields: { front: operationId } },
  baseRevision: number | null = 4,
): AccountSyncOwnedOperation {
  return {
    ownerUid: UID,
    operation: {
      schemaVersion: 1, operationId, entityType: 'flashcard', entityId,
      clientSequence: 1, baseRevision, payload,
    },
  };
}

function httpsError(code: string, details?: unknown): Error {
  return Object.assign(new Error('private server text'), { code, ...(details === undefined ? {} : { details }) });
}

function clock(start = REAL_NOW): { now: () => number; advance: (ms: number) => void; set: (ms: number) => void } {
  let current = start;
  return { now: () => current, advance: (ms) => { current += ms; }, set: (ms) => { current = ms; } };
}

type Harness = {
  adapter: MemoryScopeStorageAdapter;
  handle: AccountScopeHandle;
  outbox: AccountSyncOutbox;
  time: ReturnType<typeof clock>;
  reopen: () => AccountSyncOutbox;
};

async function harness(): Promise<Harness> {
  const adapter = new MemoryScopeStorageAdapter();
  const store = createAccountScopeStore(adapter);
  const handle = await store.open(scopeA, fenceA);
  const time = clock();
  return {
    adapter, handle, time,
    outbox: createAccountSyncOutbox(handle, { nowMs: time.now }),
    reopen: () => createAccountSyncOutbox(handle, { nowMs: time.now }),
  };
}

function runnerFor(
  ports: AccountSyncRunnerPorts,
  pendingCount: number,
  time: ReturnType<typeof clock>,
): ReturnType<typeof createAccountSyncRunner> {
  return createAccountSyncRunner(UID, fenceA, pendingCount, ports,
    (expected) => sameSessionFence(expected, fenceA), { nowMs: time.now, random: () => 0.5 });
}

function wired(
  outbox: AccountSyncOutbox,
  dispatch: AccountSyncRunnerPorts['dispatch'],
  pendingCount: number,
  time: ReturnType<typeof clock>,
): ReturnType<typeof createAccountSyncRunner> {
  return runnerFor({
    load: outbox.load, dispatch, ackCommit: outbox.ackCommit, quarantine: outbox.quarantine,
    readDispatchState: outbox.readDispatchState, writeDispatchState: outbox.writeDispatchState,
  }, pendingCount, time);
}

function loadEffect(attemptEpoch = 1): Extract<AccountSyncEffect, { type: 'LOAD_OUTBOX_BATCH' }> {
  return Object.freeze({
    type: 'LOAD_OUTBOX_BATCH', ownerUid: UID, expectedFence: fenceA, attemptEpoch,
    maxOperations: 50, maxBatchUtf8Bytes: 524288,
  });
}

function quarantineEffect(
  loaded: AccountSyncOutboxLoadResult,
  quarantineCode: 'sync_dispatch_final' | 'sync_dispatch_attempts_exhausted' | 'sync_receipt_invalid_exhausted',
): Extract<AccountSyncEffect, { type: 'QUARANTINE_OUTBOX_BATCH' }> {
  return Object.freeze({
    type: 'QUARANTINE_OUTBOX_BATCH', ownerUid: UID, expectedFence: fenceA, attemptEpoch: 3,
    batch: Object.freeze({ batchId: loaded.batchId, operations: loaded.operations }), quarantineCode,
  });
}

function ackEffect(
  loaded: AccountSyncOutboxLoadResult,
  receiptFor: (operationId: string) => AccountSyncServerReceipt,
): Extract<AccountSyncEffect, { type: 'COMMIT_OUTBOX_ACKS' }> {
  return Object.freeze({
    type: 'COMMIT_OUTBOX_ACKS', ownerUid: UID, expectedFence: fenceA, attemptEpoch: 3,
    batch: Object.freeze({ batchId: loaded.batchId, operations: loaded.operations }),
    receipts: Object.freeze(loaded.operations.map(({ operation }) => receiptFor(operation.operationId))),
  });
}

const ids = (loaded: AccountSyncOutboxLoadResult): string[] => loaded.operations.map(({ operation }) => operation.operationId);

async function expectOutboxCode(run: () => Promise<unknown>, code: AccountSyncOutboxError['code']): Promise<void> {
  await expect(run()).rejects.toMatchObject({ name: 'AccountSyncOutboxError', code });
}

function storedValue(adapter: MemoryScopeStorageAdapter, key: string): Record<string, ScopeJson> | undefined {
  return adapter.snapshot(scopeA.scopeKey).find((record) => record.key === key)?.value as Record<string, ScopeJson> | undefined;
}

const pendingKey = (id: string): string => `${PREFIX}pending:${JSON.stringify(id)}`;
const quarantineKey = (id: string): string => `${PREFIX}quarantine:${JSON.stringify(id)}`;

async function setOffset(outbox: AccountSyncOutbox, clockOffsetMs: number): Promise<void> {
  const current = await outbox.readDispatchState(fenceA);
  await outbox.writeDispatchState(fenceA, { ...current, clockOffsetMs });
}

async function withWarnings<T>(work: (calls: () => string) => Promise<T>): Promise<T> {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    return await work(() => JSON.stringify(warn.mock.calls));
  } finally {
    warn.mockRestore();
  }
}

// ─── P1: две оценки возраста ────────────────────────────────────────────────

describe('P1: an operation expires only when BOTH age estimates exceed 170 days', () => {
  test('clock shifted +56 years, then corrected: nothing expires', async () => {
    const { adapter, outbox, time } = await harness();
    // Телефон ушёл на 56 лет вперёд; сервер ответил — смещение −56 лет на диске.
    time.set(REAL_NOW + 56 * YEAR_MS);
    await setOffset(outbox, -56 * YEAR_MS);
    await outbox.enqueue(op('op-while-ahead', 'card/A'), fenceA);
    expect(storedValue(adapter, pendingKey('op-while-ahead'))).toMatchObject({
      enqueuedAtMs: REAL_NOW, enqueuedLocalAtMs: REAL_NOW + 56 * YEAR_MS,
    });
    // Часы исправили, а смещение на диске ещё старое: оценка с поправкой уехала на 56 лет назад.
    time.set(REAL_NOW + HOUR_MS);
    await outbox.enqueue(op('op-after-fix', 'card/B'), fenceA);
    expect(storedValue(adapter, pendingKey('op-after-fix'))).toMatchObject({
      enqueuedAtMs: REAL_NOW + HOUR_MS - 56 * YEAR_MS, enqueuedLocalAtMs: REAL_NOW + HOUR_MS,
    });
    await withWarnings(async () => {
      expect(ids(await outbox.load(loadEffect()))).toEqual(['op-while-ahead', 'op-after-fix']);
    });
    // Сервер ответил снова — смещение ~0. Оценка с поправкой для второй операции — 56 лет.
    await setOffset(outbox, 0);
    await withWarnings(async (calls) => {
      expect(ids(await outbox.load(loadEffect(2)))).toEqual(['op-while-ahead', 'op-after-fix']);
      expect(calls()).toContain('outbox_age_disagree');
      expect(calls()).not.toContain('op-after-fix');
    });
    expect(storedValue(adapter, quarantineKey('op-after-fix'))).toBeUndefined();
  });

  test('both estimates past the limit: the operation expires', async () => {
    const { outbox, time } = await harness();
    await outbox.enqueue(op('op-old'), fenceA);
    time.advance(171 * DAY_MS);
    expect(await outbox.load(loadEffect())).toMatchObject({ operations: [], pendingCount: 0 });
  });

  // Ремонт №3 (TG-085BF4F55515, P2-1): отрицательная оценка — доказанно ложная, решает вторая.
  test('clock a year ahead at enqueue, then corrected, 171 days pass: the operation expires', async () => {
    const { adapter, outbox, time } = await harness();
    time.set(REAL_NOW + YEAR_MS);
    await setOffset(outbox, -YEAR_MS);
    await outbox.enqueue(op('op-ahead-year'), fenceA);
    expect(storedValue(adapter, pendingKey('op-ahead-year'))).toMatchObject({
      enqueuedAtMs: REAL_NOW, enqueuedLocalAtMs: REAL_NOW + YEAR_MS,
    });
    // Часы исправили, сервер ответил (смещение ~0), прошло 171 сут: местная оценка < 0.
    time.set(REAL_NOW + 171 * DAY_MS);
    await setOffset(outbox, 0);
    await withWarnings(async (calls) => {
      expect(await outbox.load(loadEffect())).toMatchObject({ operations: [], pendingCount: 0 });
      expect(calls()).toContain('outbox_age_negative');
    });
    expect(storedValue(adapter, quarantineKey('op-ahead-year'))?.code).toBe('sync_operation_expired');
  });

  test('stale server offset a year ahead at enqueue, fixed, 171 days pass: the operation expires', async () => {
    const { adapter, outbox, time } = await harness();
    await setOffset(outbox, YEAR_MS);
    await outbox.enqueue(op('op-offset-year'), fenceA);
    expect(storedValue(adapter, pendingKey('op-offset-year'))).toMatchObject({
      enqueuedAtMs: REAL_NOW + YEAR_MS, enqueuedLocalAtMs: REAL_NOW,
    });
    time.advance(171 * DAY_MS);
    await setOffset(outbox, 0);
    await withWarnings(async () => {
      expect(await outbox.load(loadEffect())).toMatchObject({ operations: [], pendingCount: 0 });
    });
    expect(storedValue(adapter, quarantineKey('op-offset-year'))?.code).toBe('sync_operation_expired');
  });

  test('a legacy pending record without local time never expires on one estimate', async () => {
    const { adapter, handle, outbox, time } = await harness();
    await outbox.enqueue(op('op-legacy'), fenceA);
    const stored = storedValue(adapter, pendingKey('op-legacy')) as Record<string, ScopeJson>;
    const { enqueuedLocalAtMs: _dropped, ...legacy } = stored;
    await handle.withTransaction(async (transaction) => {
      await transaction.putRecord({ key: pendingKey('op-legacy'), value: legacy });
    });
    // Смещение на диске ошибочно +171 сут: по оценке с поправкой — 172 сут, по местной — 1 сут.
    await setOffset(outbox, 171 * DAY_MS);
    time.advance(DAY_MS);
    await withWarnings(async () => {
      expect(ids(await outbox.load(loadEffect()))).toEqual(['op-legacy']);
    });
    await setOffset(outbox, 0);
    time.advance(170 * DAY_MS);
    expect(await outbox.load(loadEffect(2))).toMatchObject({ operations: [], pendingCount: 0 });
  });
});

describe('P1/P3: expired and receipt-invalid quarantines are reversible through requeue', () => {
  test('the returnable set is part of the client error contract', () => {
    expect(ACCOUNT_SYNC_CLIENT_ERROR_CONTRACT.requeueQuarantineCodes).toEqual([
      'sync_dispatch_attempts_exhausted', 'sync_receipt_invalid_exhausted', 'sync_operation_expired',
      // TG-DFA918464DFA: оценка времени из будущего исправима после ответа сервера.
      'sync_operation_time_in_future',
    ]);
  });

  test('clock jumped a year ahead: expired by both estimates, clock fixed, requeue returns it', async () => {
    const { adapter, outbox, time } = await harness();
    await outbox.enqueue(op('op-jump'), fenceA);
    time.advance(YEAR_MS);
    expect(await outbox.load(loadEffect())).toMatchObject({ operations: [], pendingCount: 0 });
    expect(storedValue(adapter, quarantineKey('op-jump'))).toMatchObject({
      code: 'sync_operation_expired', enqueuedAtMs: REAL_NOW, enqueuedLocalAtMs: REAL_NOW,
    });
    time.set(REAL_NOW + HOUR_MS);
    expect(await outbox.requeue(fenceA, ['op-jump'])).toEqual({ requeuedOperationIds: ['op-jump'], pendingCount: 1 });
    expect(storedValue(adapter, pendingKey('op-jump'))).toMatchObject({
      enqueuedAtMs: REAL_NOW, enqueuedLocalAtMs: REAL_NOW,
    });
    // Возврат просроченной операции не ставит паузу отправки (сервер ей не отказывал).
    expect((await outbox.readDispatchState(fenceA)).notBeforeMs).toBeNull();
    expect(ids(await outbox.load(loadEffect(2)))).toEqual(['op-jump']);
  });

  test('a genuinely old operation bounces straight back to quarantine after requeue', async () => {
    const { adapter, outbox, time } = await harness();
    await outbox.enqueue(op('op-ancient'), fenceA);
    time.advance(171 * DAY_MS);
    await outbox.load(loadEffect());
    await outbox.requeue(fenceA, ['op-ancient']);
    expect(await outbox.load(loadEffect(2))).toMatchObject({ operations: [], pendingCount: 0 });
    expect(storedValue(adapter, quarantineKey('op-ancient'))?.code).toBe('sync_operation_expired');
  });

  test('sync_receipt_invalid_exhausted is requeued with the long pause', async () => {
    const { outbox, time } = await harness();
    await outbox.enqueue(op('op-receipt'), fenceA);
    await outbox.quarantine(quarantineEffect(await outbox.load(loadEffect()), 'sync_receipt_invalid_exhausted'));
    expect(await outbox.requeue(fenceA, ['op-receipt'])).toEqual({ requeuedOperationIds: ['op-receipt'], pendingCount: 1 });
    expect((await outbox.readDispatchState(fenceA)).notBeforeMs).toBe(time.now() + ACCOUNT_SYNC_REQUEUE_DELAY_MS);
  });

  test('sync_dispatch_final stays final', async () => {
    const { outbox } = await harness();
    await outbox.enqueue(op('op-final'), fenceA);
    await outbox.quarantine(quarantineEffect(await outbox.load(loadEffect()), 'sync_dispatch_final'));
    await withWarnings(async () => {
      await expectOutboxCode(() => outbox.requeue(fenceA, ['op-final']), 'account_sync_outbox_conflict');
    });
  });
});

// ─── P2: перевыпуск SRS внутри транзакции ──────────────────────────────────

describe('P2: SRS re-issue is planned inside markResolved and sees confirmed and pending later edits', () => {
  const srsReceipt = (operationId: string): AccountSyncServerReceipt => ({
    operationId, outcome: 'rejected', code: 'srs_time_in_future', serverRevision: 6,
  });
  const rejected = (): AccountSyncOwnedOperation => op('card-r', 'card/7', { op: 'upsert', fields: {
    front: 'old', back: 'kept', srs: { interval: 3, updatedAtMs: FUTURE_SRS },
  } }, 6);
  const laterEdit = (id: string): AccountSyncOwnedOperation => op(id, 'card/7', { op: 'upsert', fields: { front: 'new' } }, 6);
  const planner = (context: AccountSyncOutboxResolveContext): readonly AccountSyncOwnedOperation[] => planAccountSyncSrsReissue({
    rejected: context.operation, receipt: context.receipt, localNowMs: 2_000_000,
    serverOffsetMs: context.serverClockOffsetMs ?? 0, seenSrsUpdatedAtMs: {},
    laterOperations: context.laterOperations, nextClientSequence: 40,
  });
  const fieldsOf = (owned: AccountSyncOwnedOperation): string[] => Object.keys(
    (owned.operation.payload as { fields: Record<string, unknown> }).fields).sort();

  /** Кто последним в очереди пишет поле front — это значение и останется у карточки. */
  const lastFrontWriter = (loaded: AccountSyncOutboxLoadResult): unknown => {
    const writers = loaded.operations.filter((owned) => 'front' in (owned.operation.payload as { fields: object }).fields);
    const last = writers[writers.length - 1];
    return last === undefined ? undefined : (last.operation.payload as { fields: { front: unknown } }).fields.front;
  };

  test('a later edit confirmed in the same batch is dropped from the re-issue', async () => {
    const { outbox } = await harness();
    await outbox.enqueue(rejected(), fenceA);
    await outbox.enqueue(laterEdit('card-l'), fenceA);
    const loaded = await outbox.load(loadEffect());
    expect(ids(loaded)).toEqual(['card-r', 'card-l']);
    await withWarnings(async () => {
      await outbox.ackCommit(ackEffect(loaded, (operationId) => (operationId === 'card-r'
        ? srsReceipt(operationId) : { operationId, outcome: 'applied', serverRevision: 7 })));
      let seen: string[] = [];
      await outbox.markResolved(fenceA, 'card-r', (context) => {
        seen = context.laterOperations.map(({ operation }) => operation.operationId);
        return planner(context);
      });
      expect(seen).toEqual(['card-l']);
    });
    const queued = await outbox.load(loadEffect(2));
    expect(ids(queued)).toEqual(['card-r:rest', 'card-r:srs']);
    expect(fieldsOf(queued.operations[0])).toEqual(['back']);
  });

  test('a later edit confirmed by a separate commit after the rejection is also seen', async () => {
    const { outbox } = await harness();
    await outbox.enqueue(rejected(), fenceA);
    const first = await outbox.load(loadEffect());
    await withWarnings(async () => {
      await outbox.ackCommit(ackEffect(first, srsReceipt));
      await outbox.enqueue(laterEdit('card-l2'), fenceA);
      const second = await outbox.load(loadEffect(2));
      await outbox.ackCommit(ackEffect(second, (operationId) => ({ operationId, outcome: 'applied', serverRevision: 8 })));
      await outbox.markResolved(fenceA, 'card-r', planner);
    });
    const queued = await outbox.load(loadEffect(3));
    expect(queued.operations.every((owned) => !fieldsOf(owned).includes('front'))).toBe(true);
  });

  test('an edit arriving between listUnresolved and markResolved is seen by the planner', async () => {
    const { outbox } = await harness();
    await outbox.enqueue(rejected(), fenceA);
    await withWarnings(async () => {
      await outbox.ackCommit(ackEffect(await outbox.load(loadEffect()), srsReceipt));
      const [unresolved] = await outbox.listUnresolved(fenceA);
      expect(unresolved.operation.operation.operationId).toBe('card-r');
      await outbox.enqueue(laterEdit('card-gap'), fenceA);
      await outbox.markResolved(fenceA, 'card-r', planner);
    });
    const queued = await outbox.load(loadEffect(2));
    expect(ids(queued)).toEqual(['card-gap', 'card-r:rest', 'card-r:srs']);
    expect(lastFrontWriter(queued)).toBe('new');
  });

  test('an edit racing markResolved cannot be overwritten by the re-issue', async () => {
    const { outbox } = await harness();
    await outbox.enqueue(rejected(), fenceA);
    await withWarnings(async () => {
      await outbox.ackCommit(ackEffect(await outbox.load(loadEffect()), srsReceipt));
      // Правка ставится в очередь, пока markResolved ещё идёт.
      const resolving = outbox.markResolved(fenceA, 'card-r', planner);
      const racing = outbox.enqueue(laterEdit('card-race'), fenceA);
      await Promise.all([resolving, racing]);
    });
    expect(lastFrontWriter(await outbox.load(loadEffect(2)))).toBe('new');
  });

  test('planner is not called for an already resolved receipt; a throwing planner changes nothing', async () => {
    const { adapter, outbox } = await harness();
    await outbox.enqueue(rejected(), fenceA);
    await withWarnings(async () => {
      await outbox.ackCommit(ackEffect(await outbox.load(loadEffect()), srsReceipt));
      const before = adapter.snapshot(scopeA.scopeKey);
      await expectOutboxCode(() => outbox.markResolved(fenceA, 'card-r', () => { throw new Error('private'); }),
        'account_sync_outbox_invalid_input');
      expect(adapter.snapshot(scopeA.scopeKey)).toEqual(before);
      await outbox.markResolved(fenceA, 'card-r', planner);
      const again = jest.fn(() => []);
      expect(await outbox.markResolved(fenceA, 'card-r', again)).toMatchObject({ outcome: 'already_resolved' });
      expect(again).not.toHaveBeenCalled();
      await expectOutboxCode(() => outbox.markResolved(fenceA, 'card-r',
        [] as unknown as () => readonly AccountSyncOwnedOperation[]), 'account_sync_outbox_invalid_input');
    });
  });
});

// ─── P3 ─────────────────────────────────────────────────────────────────────

describe('P3: the first failure time never stays in the future', () => {
  test('transport and receipt decisions take min(firstFailureAtMs, serverNow)', () => {
    const now = 5_000_000_000;
    expect(decideAccountSyncTransportFailure({ code: 'internal', details: undefined },
      { failedAttempts: 3, firstFailureAtMs: now + 10 * DAY_MS }, now, () => 0.5))
      .toMatchObject({ failedAttempts: 4, firstFailureAtMs: now });
    expect(decideAccountSyncReceiptFailure({ failedAttempts: 3, firstFailureAtMs: now + 10 * DAY_MS }, now, () => 0.5))
      .toMatchObject({ failedAttempts: 4, firstFailureAtMs: now });
    expect(decideAccountSyncTransportFailure({ code: 'internal', details: undefined },
      { failedAttempts: 3, firstFailureAtMs: now - DAY_MS }, now, () => 0.5))
      .toMatchObject({ firstFailureAtMs: now - DAY_MS });
  });
});

describe('P3: the in-memory pause is clamped to 25 hours', () => {
  test('a huge retryAfterMs does not lock sending for a month', async () => {
    const { outbox, time } = await harness();
    await outbox.enqueue(op('op-wait'), fenceA);
    await withWarnings(async () => {
      const runner = wired(outbox, async () => {
        throw httpsError('functions/resource-exhausted', { final: false, retryAfterMs: 30 * DAY_MS });
      }, 1, time);
      const waited = await runner.runOneBatch();
      expect(waited.transport?.action).toBe('wait');
      expect(waited.transport?.delayMs).toBeLessThanOrEqual(MAX_PAUSE_MS);
      const gated = await runner.runOneBatch();
      expect(gated.transport?.action).toBe('not_before');
      expect(gated.transport?.delayMs).toBeLessThanOrEqual(MAX_PAUSE_MS);
    });
  });

  test('clock set back a month after a failure: the pause is clamped', async () => {
    const { outbox, time } = await harness();
    await outbox.enqueue(op('op-back'), fenceA);
    await withWarnings(async (calls) => {
      const runner = wired(outbox, async () => { throw httpsError('functions/unavailable', { final: false }); }, 1, time);
      expect((await runner.runOneBatch()).transport?.action).toBe('retry');
      time.advance(-30 * DAY_MS);
      const gated = await runner.runOneBatch();
      expect(gated.transport?.action).toBe('not_before');
      expect(gated.transport?.delayMs).toBeLessThanOrEqual(MAX_PAUSE_MS);
      expect(calls()).toContain('dispatch_pause_clamped');
    });
  });
});

describe('P3: failure accounting follows the head of the queue, not the batch id', () => {
  test('a new operation joining the batch after a restart does not reset the counter', async () => {
    const { outbox, reopen, time } = await harness();
    await outbox.enqueue(op('op-head', 'card/H'), fenceA);
    const failing = async (): Promise<never> => { throw httpsError('functions/unavailable', { final: false }); };
    await withWarnings(async () => {
      const first = wired(outbox, failing, 1, time);
      expect((await first.runOneBatch()).transport).toMatchObject({ action: 'retry', failedAttempts: 1 });
      await outbox.enqueue(op('op-joiner', 'card/J'), fenceA);
      const second = wired(reopen(), failing, 2, time);
      const gated = await second.runOneBatch();
      expect(gated.transport).toMatchObject({ action: 'not_before', failedAttempts: 1 });
      time.advance(gated.transport?.delayMs ?? 0);
      expect((await second.runOneBatch()).transport).toMatchObject({ action: 'retry', failedAttempts: 2 });
    });
  });
});

describe('P3: unflushed memory does not overwrite the requeue pause', () => {
  test('a failed write before requeue keeps the requeue pause on the next run', async () => {
    const { outbox, time } = await harness();
    await outbox.enqueue(op('op-pause'), fenceA);
    let failWrites = false;
    let dispatchCalls = 0;
    const runner = runnerFor({
      load: outbox.load,
      dispatch: async () => { dispatchCalls += 1; throw httpsError('functions/unavailable', { final: false }); },
      ackCommit: outbox.ackCommit,
      quarantine: outbox.quarantine,
      readDispatchState: outbox.readDispatchState,
      writeDispatchState: async (fence, state) => {
        if (failWrites) throw new Error('disk full');
        return outbox.writeDispatchState(fence, state);
      },
    }, 1, time);
    await withWarnings(async () => {
      for (let attempt = 1; attempt <= 4; attempt += 1) {
        const failed = await runner.runOneBatch();
        expect(failed.transport).toMatchObject({ action: 'retry', failedAttempts: attempt });
        time.advance((failed.transport?.delayMs ?? 0) + (attempt === 1 ? DAY_MS : 0));
      }
      failWrites = true;
      const quarantined = await runner.runOneBatch();
      expect(quarantined.quarantines[0]).toMatchObject({ quarantineCode: 'sync_dispatch_attempts_exhausted' });
      failWrites = false;
      await outbox.requeue(fenceA, ['op-pause']);
      const callsBefore = dispatchCalls;
      const gated = await runner.runOneBatch();
      expect(gated.transport).toMatchObject({ action: 'not_before' });
      expect(gated.transport?.delayMs).toBe(ACCOUNT_SYNC_REQUEUE_DELAY_MS);
      expect(dispatchCalls).toBe(callsBefore);
      expect((await outbox.readDispatchState(fenceA)).notBeforeMs).toBe(time.now() + ACCOUNT_SYNC_REQUEUE_DELAY_MS);
    });
  });
});

describe('P3: an inconsistent unresolved index entry is dropped with a log', () => {
  test('missing and already resolved entries are removed; listUnresolved keeps working', async () => {
    const { adapter, handle, outbox } = await harness();
    await outbox.enqueue(op('op-c1'), fenceA);
    await outbox.enqueue(op('op-c2'), fenceA);
    const loaded = await outbox.load(loadEffect());
    await withWarnings(async (calls) => {
      await outbox.ackCommit(ackEffect(loaded, (operationId) => ({ operationId, outcome: 'conflict', serverRevision: 3 })));
      await outbox.markResolved(fenceA, 'op-c1', () => []);
      await handle.withTransaction(async (transaction) => {
        await transaction.putRecord({ key: `${PREFIX}unresolved`, value: {
          kind: 'account_sync_outbox_unresolved', version: 1, ownerUid: UID, operationIds: ['op-c1', 'ghost', 'op-c2'],
        } });
      });
      const rows = await outbox.listUnresolved(fenceA);
      expect(rows.map(({ receipt }) => receipt.operationId)).toEqual(['op-c2']);
      expect(storedValue(adapter, `${PREFIX}unresolved`)?.operationIds).toEqual(['op-c2']);
      expect(calls()).toContain('outbox_unresolved_entry_dropped');
      expect(calls()).toContain('reason=ack_missing');
      expect(calls()).toContain('reason=ack_resolved');
      expect(calls()).not.toContain('ghost');
    });
  });
});

describe('Repair 3 (TG-085BF4F55515) P3: the later:<id> list', () => {
  const laterKeyOf = (id: string): string => `${PREFIX}later:${JSON.stringify(id)}`;
  const rejected = (): AccountSyncOwnedOperation => op('card-r', 'card/7', { op: 'upsert', fields: {
    srs: { interval: 3, updatedAtMs: FUTURE_SRS },
  } }, 6);
  const srsReceipt = (operationId: string): AccountSyncServerReceipt => ({
    operationId, outcome: 'rejected', code: 'srs_time_in_future', serverRevision: 6,
  });
  const laterJsonOf = (operationIds: unknown): ScopeJson => ({
    kind: 'account_sync_outbox_later', version: 1, ownerUid: UID, operationIds,
  } as ScopeJson);

  test('P3-1: a missing or corrupt entry is skipped with a log; markResolved still resolves', async () => {
    const { adapter, handle, outbox } = await harness();
    await outbox.enqueue(rejected(), fenceA);
    await withWarnings(async (calls) => {
      await outbox.ackCommit(ackEffect(await outbox.load(loadEffect()), srsReceipt));
      await handle.withTransaction(async (transaction) => {
        await transaction.putRecord({ key: laterKeyOf('card-r'), value: laterJsonOf(['ghost', 'broken']) });
        await transaction.putRecord({ key: `${PREFIX}ack:${JSON.stringify('broken')}`, value: { kind: 'garbage' } });
      });
      let seen: string[] | null = null;
      expect(await outbox.markResolved(fenceA, 'card-r', (context) => {
        seen = context.laterOperations.map(({ operation }) => operation.operationId);
        return [];
      })).toMatchObject({ outcome: 'resolved' });
      expect(seen).toEqual([]);
      expect(calls()).toContain('outbox_later_entry_dropped');
      expect(calls()).toContain('reason=ack_missing');
      expect(calls()).toContain('reason=ack_corrupt');
      expect(calls()).not.toContain('ghost');
      expect(calls()).not.toContain('broken');
    });
    expect(storedValue(adapter, laterKeyOf('card-r'))).toBeUndefined();
  });

  test('P3-1: a corrupt later record is replaced on the next ack, not a permanent failure', async () => {
    const { adapter, handle, outbox } = await harness();
    await outbox.enqueue(rejected(), fenceA);
    await withWarnings(async (calls) => {
      await outbox.ackCommit(ackEffect(await outbox.load(loadEffect()), srsReceipt));
      await handle.withTransaction(async (transaction) => {
        await transaction.putRecord({ key: laterKeyOf('card-r'), value: laterJsonOf('not-a-list') });
      });
      await outbox.enqueue(op('card-l', 'card/7', { op: 'upsert', fields: { front: 'new' } }, 6), fenceA);
      await outbox.ackCommit(ackEffect(await outbox.load(loadEffect(2)),
        (operationId) => ({ operationId, outcome: 'applied', serverRevision: 7 })));
      expect(calls()).toContain('reason=later_record_corrupt');
      expect(storedValue(adapter, laterKeyOf('card-r'))?.operationIds).toEqual(['card-l']);
    });
  });

  test('P3-2: the list keeps only the 200 most recent ids', async () => {
    const { adapter, handle, outbox } = await harness();
    await outbox.enqueue(rejected(), fenceA);
    const old = Array.from({ length: 200 }, (_, index) => `old-${index}`);
    await withWarnings(async (calls) => {
      await outbox.ackCommit(ackEffect(await outbox.load(loadEffect()), srsReceipt));
      await handle.withTransaction(async (transaction) => {
        await transaction.putRecord({ key: laterKeyOf('card-r'), value: laterJsonOf(old) });
      });
      await outbox.enqueue(op('card-l', 'card/7', { op: 'upsert', fields: { front: 'new' } }, 6), fenceA);
      await outbox.ackCommit(ackEffect(await outbox.load(loadEffect(2)),
        (operationId) => ({ operationId, outcome: 'applied', serverRevision: 7 })));
      expect(calls()).toContain('outbox_later_capped');
    });
    const stored = storedValue(adapter, laterKeyOf('card-r'))?.operationIds as string[];
    expect(stored).toHaveLength(200);
    expect(stored[0]).toBe('old-1');
    expect(stored[199]).toBe('card-l');
  });
});

describe('P3: formerly silent catches log a code without data', () => {
  test('an invalid operation, a trapped port response and an invalid ack effect are logged', async () => {
    const { outbox } = await harness();
    await outbox.enqueue(op('op-ok'), fenceA);
    const loaded = await outbox.load(loadEffect());
    await withWarnings(async (calls) => {
      await expectOutboxCode(() => outbox.enqueue({ ownerUid: UID, operation: { secret: 'payload' } } as never, fenceA),
        'account_sync_outbox_invalid_input');
      expect(calls()).toContain('outbox_operation_invalid');
      const trap = new Proxy({}, { ownKeys: () => { throw new Error('private trap text'); } });
      expect(captureExactRecord(trap, ['a'])).toBeNull();
      expect(calls()).toContain('runner_response_unreadable');
      await expectOutboxCode(() => outbox.ackCommit({
        ...ackEffect(loaded, (operationId) => ({ operationId, outcome: 'applied', serverRevision: 1 })),
        receipts: [{ operationId: 'op-ok', outcome: 'refunded', serverRevision: 1 }],
      } as never), 'account_sync_outbox_invalid_input');
      expect(calls()).toContain('outbox_ack_effect_invalid');
      expect(calls()).not.toContain('private trap text');
      expect(calls()).not.toContain('payload');
    });
  });
});
