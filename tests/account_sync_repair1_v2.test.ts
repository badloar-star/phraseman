import { sameSessionFence, type AccountScope, type SessionFence } from '../modules/account-session-v2/account_session';
import { createAccountScopeStore, type ScopeJson } from '../modules/account-session-v2/account_scope_store';
import type {
  AccountSyncEffect,
  AccountSyncOwnedOperation,
  AccountSyncServerReceipt,
} from '../modules/account-session-v2/account_sync';
import { accountSyncBatchIdFor } from '../modules/account-session-v2/account_sync_batching';
import {
  ACCOUNT_SYNC_SRS_FUTURE_MARGIN_MS,
  ACCOUNT_SYNC_SRS_MAX_FUTURE_SKEW_MS,
  accountSyncHybridSrsUpdatedAtMs,
} from '../modules/account-session-v2/account_sync_clock';
import {
  AccountSyncOutboxError,
  createAccountSyncOutbox,
  type AccountSyncOutbox,
  type AccountSyncOutboxLoadResult,
} from '../modules/account-session-v2/account_sync_outbox';
import {
  createAccountSyncRunner,
  type AccountSyncRunnerPorts,
} from '../modules/account-session-v2/account_sync_runner';
import {
  accountSyncReissueOperationIds,
  planAccountSyncSrsReissue,
} from '../modules/account-session-v2/account_sync_srs_reissue';
import {
  ACCOUNT_SYNC_CLIENT_MIN_FAILURE_SPAN_MS,
  ACCOUNT_SYNC_REQUEUE_DELAY_MS,
  accountSyncClientAction,
  decideAccountSyncReceiptFailure,
  decideAccountSyncTransportFailure,
} from '../modules/account-session-v2/account_sync_transport';
import { MemoryScopeStorageAdapter } from '../modules/account-session-v2/testing/memory_scope_storage';

/*
 * Account V2 — ремонт №1 клиентского пакета синхронизации (TG-7CD73967EF61).
 * P1: потолок = И ≥5 неудач, И ≥24 ч с первой неудачи (часы с поправкой на
 * сервер), учёт переживает перезапуск, карантин по потолку возвратный (requeue).
 * P2: sync_receipt_invalid — неудача с backoff и потолком; верхняя граница
 * гибридных часов; перевыпуск SRS без полей, переписанных позже; итоги
 * conflict/rejected переживают крах. P3: срок жизни при часах назад, id пакета
 * с «дырами», легаси `{outcome:'rejected'}`.
 */

const UID = 'uid/repair1';
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const PREFIX = '__account_sync_outbox_v2__:';
const fenceA: SessionFence = Object.freeze({
  scopeKey: `account:${UID}`, uid: UID, generation: 1, nonce: 'nonce-r1',
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

function clock(start = 1_800_000_000_000): { now: () => number; advance: (ms: number) => void; set: (ms: number) => void } {
  let current = start;
  return { now: () => current, advance: (ms) => { current += ms; }, set: (ms) => { current = ms; } };
}

type Harness = {
  adapter: MemoryScopeStorageAdapter;
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
    adapter, time,
    outbox: createAccountSyncOutbox(handle, { nowMs: time.now }),
    // «Перезапуск»: новый объект outbox над тем же хранилищем, память раннера пустая.
    reopen: () => createAccountSyncOutbox(handle, { nowMs: time.now }),
  };
}

function wired(
  outbox: AccountSyncOutbox,
  dispatch: AccountSyncRunnerPorts['dispatch'],
  pendingCount = 1,
  time?: ReturnType<typeof clock>,
): ReturnType<typeof createAccountSyncRunner> {
  return createAccountSyncRunner(UID, fenceA, pendingCount, {
    load: outbox.load,
    dispatch,
    ackCommit: outbox.ackCommit,
    quarantine: outbox.quarantine,
    readDispatchState: outbox.readDispatchState,
    writeDispatchState: outbox.writeDispatchState,
  }, (expected) => sameSessionFence(expected, fenceA), { nowMs: time?.now ?? (() => 1_800_000_000_000), random: () => 0.5 });
}

function loadEffect(attemptEpoch = 1): Extract<AccountSyncEffect, { type: 'LOAD_OUTBOX_BATCH' }> {
  return Object.freeze({
    type: 'LOAD_OUTBOX_BATCH', ownerUid: UID, expectedFence: fenceA, attemptEpoch,
    maxOperations: 50, maxBatchUtf8Bytes: 524288,
  });
}

function quarantineEffect(
  loaded: AccountSyncOutboxLoadResult,
  quarantineCode: 'sync_dispatch_final' | 'sync_dispatch_attempts_exhausted' = 'sync_dispatch_attempts_exhausted',
): Extract<AccountSyncEffect, { type: 'QUARANTINE_OUTBOX_BATCH' }> {
  return Object.freeze({
    type: 'QUARANTINE_OUTBOX_BATCH', ownerUid: UID, expectedFence: fenceA, attemptEpoch: 3,
    batch: Object.freeze({ batchId: loaded.batchId, operations: loaded.operations }), quarantineCode,
  });
}

function ackEffect(
  loaded: AccountSyncOutboxLoadResult,
  receiptFor: (operationId: string) => AccountSyncServerReceipt = (operationId) => ({
    operationId, outcome: 'applied', serverRevision: 9,
  }),
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

// ─── P1: потолок попыток = И ≥5 неудач, И ≥24 ч ────────────────────────────

describe('P1: the attempt ceiling needs both five failures and a day since the first one', () => {
  test('decision table: five failures without a day keep retrying; a day without five failures too', () => {
    const error = { code: 'unavailable', details: { final: false } };
    expect(accountSyncClientAction(error, 5, 0)).toBe('retry');
    expect(accountSyncClientAction(error, 50, ACCOUNT_SYNC_CLIENT_MIN_FAILURE_SPAN_MS - 1)).toBe('retry');
    expect(accountSyncClientAction(error, 4, 30 * DAY_MS)).toBe('retry');
    expect(accountSyncClientAction(error, 5, ACCOUNT_SYNC_CLIENT_MIN_FAILURE_SPAN_MS)).toBe('quarantine');
    expect(accountSyncClientAction(error, 5, -DAY_MS)).toBe('retry');
    expect(ACCOUNT_SYNC_CLIENT_MIN_FAILURE_SPAN_MS).toBe(DAY_MS);
  });

  test('the first counted failure starts the day; waits and re-login do not', () => {
    const start = 1_000_000;
    const first = decideAccountSyncTransportFailure({ code: 'internal', details: undefined },
      { failedAttempts: 0, firstFailureAtMs: null }, start, () => 0.5);
    expect(first).toMatchObject({ action: 'retry', failedAttempts: 1, firstFailureAtMs: start });
    const wait = decideAccountSyncTransportFailure({ code: 'resource-exhausted', details: { retryAfterMs: 50 } },
      { failedAttempts: 0, firstFailureAtMs: null }, start, () => 0.5);
    expect(wait).toMatchObject({ action: 'wait', failedAttempts: 0, firstFailureAtMs: null });
    const fifthSameDay = decideAccountSyncTransportFailure({ code: 'internal', details: undefined },
      { failedAttempts: 4, firstFailureAtMs: start }, start + DAY_MS - 1, () => 0.5);
    expect(fifthSameDay).toMatchObject({ action: 'retry', failedAttempts: 5, quarantineCode: null });
    const fifthNextDay = decideAccountSyncTransportFailure({ code: 'internal', details: undefined },
      { failedAttempts: 4, firstFailureAtMs: start }, start + DAY_MS, () => 0.5);
    expect(fifthNextDay).toMatchObject({
      action: 'quarantine', failedAttempts: 5, quarantineCode: 'sync_dispatch_attempts_exhausted',
    });
  });

  test('a short offline spell (five quick failures within 15 s) never quarantines', async () => {
    const { outbox, time } = await harness();
    await outbox.enqueue(op('op-offline'), fenceA);
    let dispatchCalls = 0;
    let quarantineCalls = 0;
    const runner = createAccountSyncRunner(UID, fenceA, 1, {
      load: outbox.load,
      dispatch: async (effect) => {
        dispatchCalls += 1;
        if (dispatchCalls <= 5) throw httpsError('functions/unavailable', { final: false });
        return { outcome: 'accepted', receipts: effect.batch.operations.map(({ operation }) => ({
          operationId: operation.operationId, outcome: 'applied', serverRevision: 5,
        })) };
      },
      ackCommit: outbox.ackCommit,
      quarantine: async (effect) => { quarantineCalls += 1; return outbox.quarantine(effect); },
    }, (expected) => sameSessionFence(expected, fenceA), { nowMs: time.now, random: () => 0.5 });
    const started = time.now();
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const failed = await runner.runOneBatch();
      expect(failed.transport).toMatchObject({ action: 'retry', failedAttempts: attempt });
      if (attempt < 5) time.advance(failed.transport?.delayMs ?? 0);
    }
    expect(time.now() - started).toBeLessThanOrEqual(15_000);
    expect(quarantineCalls).toBe(0);
    const gated = await runner.runOneBatch();
    expect(gated.transport).toMatchObject({ action: 'not_before', failedAttempts: 5 });
    time.advance(gated.transport?.delayMs ?? 0);
    const done = await runner.runOneBatch();
    expect(done.confirmations).toHaveLength(1);
    expect(quarantineCalls).toBe(0);
    expect(dispatchCalls).toBe(6);
  });

  test('attempts, the first-failure time and the pause survive a restart', async () => {
    const { outbox, reopen, time } = await harness();
    await outbox.enqueue(op('op-restart'), fenceA);
    const failing = async (): Promise<never> => { throw httpsError('functions/unavailable', { final: false }); };
    const first = wired(outbox, failing, 1, time);
    const firstFailureAt = time.now();
    const one = await first.runOneBatch();
    expect(one.transport).toMatchObject({ action: 'retry', failedAttempts: 1 });
    time.advance(DAY_MS + HOUR_MS);
    const two = await first.runOneBatch();
    expect(two.transport).toMatchObject({ action: 'retry', failedAttempts: 2 });
    time.advance(two.transport?.delayMs ?? 0);
    const three = await first.runOneBatch();
    expect(three.transport).toMatchObject({ action: 'retry', failedAttempts: 3 });
    const persisted = await outbox.readDispatchState(fenceA);
    expect(persisted).toMatchObject({ failedAttempts: 3, firstFailureAtMs: firstFailureAt });
    expect(persisted.notBeforeMs).toBe(time.now() + (three.transport?.delayMs ?? 0));

    // Перезапуск: новый раннер и новый outbox — память пуста, диск — нет.
    const reopened = reopen();
    const second = wired(reopened, failing, 1, time);
    const gated = await second.runOneBatch();
    expect(gated.transport).toMatchObject({ action: 'not_before', failedAttempts: 3 });
    time.advance(gated.transport?.delayMs ?? 0);
    expect((await second.runOneBatch()).transport).toMatchObject({ action: 'retry', failedAttempts: 4 });
    const pause = await second.runOneBatch();
    time.advance(pause.transport?.delayMs ?? 0);
    const fifth = await second.runOneBatch();
    expect(fifth.transport).toMatchObject({ action: 'quarantine', failedAttempts: 5 });
    expect(fifth.quarantines[0]).toMatchObject({ quarantineCode: 'sync_dispatch_attempts_exhausted' });
    expect(await reopened.readDispatchState(fenceA)).toMatchObject({ failedAttempts: 0, firstFailureAtMs: null });
  });

  test('the server clock offset is kept on disk and read back after a restart', async () => {
    const { outbox, reopen, time } = await harness();
    await outbox.enqueue(op('op-clock'), fenceA);
    const runner = wired(outbox, async (effect) => ({
      outcome: 'accepted', serverNowMs: time.now() + 750,
      receipts: effect.batch.operations.map(({ operation }) => ({
        operationId: operation.operationId, outcome: 'applied', serverRevision: 1,
      })),
    }), 1, time);
    expect((await runner.runOneBatch()).confirmations).toHaveLength(1);
    expect(runner.getServerClockOffsetMs()).toBe(750);
    const restarted = wired(reopen(), async () => { throw new Error('not expected'); }, 0, time);
    expect(restarted.getServerClockOffsetMs()).toBeNull();
    await restarted.runOneBatch();
    expect(restarted.getServerClockOffsetMs()).toBe(750);
  });
});

// ─── P1: возвратный карантин ────────────────────────────────────────────────

describe('P1: quarantine by the ceiling is reversible through requeue', () => {
  test('requeue returns the batch snapshot in its original order with a long pause', async () => {
    const { adapter, outbox, time } = await harness();
    const a = op('op-a', 'card/A', { op: 'upsert', fields: { front: 'a' } }, 3);
    const b = op('op-b', 'card/B', { op: 'upsert', fields: { front: 'b' } }, 7);
    const enqueuedAtA = time.now();
    await outbox.enqueue(a, fenceA);
    time.advance(1_000);
    await outbox.enqueue(b, fenceA);
    const loaded = await outbox.load(loadEffect());
    expect(ids(loaded)).toEqual(['op-a', 'op-b']);
    await outbox.quarantine(quarantineEffect(loaded));
    await outbox.enqueue(op('op-c', 'card/C'), fenceA);
    time.advance(DAY_MS);

    const requeued = await outbox.requeue(fenceA, ['op-b', 'op-a']);
    expect(requeued).toEqual({ requeuedOperationIds: ['op-a', 'op-b'], pendingCount: 3 });
    const after = await outbox.load(loadEffect(2));
    expect(ids(after)).toEqual(['op-c', 'op-a', 'op-b']);
    expect(after.operations[1]).toEqual(a);
    expect(after.operations[2]).toEqual(b);
    expect(after.operations[2].operation.baseRevision).toBe(7);
    expect(storedValue(adapter, `${PREFIX}pending:${JSON.stringify('op-a')}`)?.enqueuedAtMs).toBe(enqueuedAtA);
    expect(storedValue(adapter, `${PREFIX}quarantine:${JSON.stringify('op-a')}`)).toBeUndefined();
    expect(await outbox.readDispatchState(fenceA)).toMatchObject({
      batchId: null, failedAttempts: 0, firstFailureAtMs: null,
      notBeforeMs: time.now() + ACCOUNT_SYNC_REQUEUE_DELAY_MS,
    });

    // Повтор после потерянного ответа — ничего не дублирует.
    expect(await outbox.requeue(fenceA, ['op-a', 'op-b'])).toEqual({ requeuedOperationIds: [], pendingCount: 3 });

    let dispatchCalls = 0;
    const runner = wired(outbox, async (effect) => {
      dispatchCalls += 1;
      return { outcome: 'accepted', receipts: effect.batch.operations.map(({ operation }) => ({
        operationId: operation.operationId, outcome: 'applied', serverRevision: 11,
      })) };
    }, 3, time);
    const gated = await runner.runOneBatch();
    expect(gated.transport).toMatchObject({ action: 'not_before', failedAttempts: 0 });
    expect(gated.transport?.delayMs).toBe(ACCOUNT_SYNC_REQUEUE_DELAY_MS);
    expect(dispatchCalls).toBe(0);
    time.advance(ACCOUNT_SYNC_REQUEUE_DELAY_MS);
    expect((await runner.runOneBatch()).confirmations[0].confirmedOperationIds).toEqual(['op-c', 'op-a', 'op-b']);
  });

  test('only sync_dispatch_attempts_exhausted is reversible; unknown ids are refused', async () => {
    const { outbox } = await harness();
    await outbox.enqueue(op('op-final'), fenceA);
    await outbox.quarantine(quarantineEffect(await outbox.load(loadEffect()), 'sync_dispatch_final'));
    await expectOutboxCode(() => outbox.requeue(fenceA, ['op-final']), 'account_sync_outbox_conflict');
    await expectOutboxCode(() => outbox.requeue(fenceA, ['op-missing']), 'account_sync_outbox_invalid_input');
    await expectOutboxCode(() => outbox.requeue(fenceA, []), 'account_sync_outbox_invalid_input');
  });

  test('a requeued operation keeps its original lifetime', async () => {
    const { outbox, time } = await harness();
    await outbox.enqueue(op('op-old'), fenceA);
    await outbox.quarantine(quarantineEffect(await outbox.load(loadEffect())));
    time.advance(171 * DAY_MS);
    await outbox.requeue(fenceA, ['op-old']);
    const loaded = await outbox.load(loadEffect(2));
    expect(loaded).toMatchObject({ operations: [], pendingCount: 0 });
  });
});

// ─── P2: sync_receipt_invalid ───────────────────────────────────────────────

describe('P2: sync_receipt_invalid is a counted failure with backoff and its own quarantine code', () => {
  test('attempts grow across invalid receipts, each retry waits, the ceiling quarantines', async () => {
    const { adapter, outbox, time } = await harness();
    await outbox.enqueue(op('op-bad-receipt'), fenceA);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      let dispatchCalls = 0;
      const runner = wired(outbox, async () => {
        dispatchCalls += 1;
        return { outcome: 'accepted', receipts: [{ operationId: 'op-bad-receipt', outcome: 'refunded', serverRevision: 1 }] };
      }, 1, time);
      for (let attempt = 1; attempt <= 4; attempt += 1) {
        const failed = await runner.runOneBatch();
        expect(failed.state.phase).toMatchObject({ tag: 'sync_attention', code: 'sync_receipt_invalid' });
        expect(failed.transport).toMatchObject({ action: 'retry', failedAttempts: attempt, errorCode: 'sync_receipt_invalid' });
        const gated = await runner.runOneBatch();
        expect(gated.transport).toMatchObject({ action: 'not_before', failedAttempts: attempt });
        expect(dispatchCalls).toBe(attempt);
        time.advance((failed.transport?.delayMs ?? 0) + (attempt === 1 ? DAY_MS : 0));
      }
      const final = await runner.runOneBatch();
      expect(final.transport).toMatchObject({ action: 'quarantine', failedAttempts: 5 });
      expect(final.quarantines[0]).toMatchObject({ quarantineCode: 'sync_receipt_invalid_exhausted' });
      expect(storedValue(adapter, `${PREFIX}quarantine:${JSON.stringify('op-bad-receipt')}`)?.code)
        .toBe('sync_receipt_invalid_exhausted');
      const reasons = warn.mock.calls.filter((call) => call[1] === 'receipt_invalid' || String(call[0]).includes('receipt_invalid'));
      expect(reasons.length).toBeGreaterThan(0);
      const logged = JSON.stringify(warn.mock.calls);
      expect(logged).toContain('reason=receipt_outcome_unknown');
      expect(logged).not.toContain('refunded');
      expect(logged).not.toContain('op-bad-receipt');
    } finally {
      warn.mockRestore();
    }
  });

  test('the counter is reset only after the receipts pass validation', async () => {
    const { outbox, time } = await harness();
    await outbox.enqueue(op('op-mixed'), fenceA);
    let dispatchCalls = 0;
    const runner = wired(outbox, async () => {
      dispatchCalls += 1;
      if (dispatchCalls <= 2) throw httpsError('functions/internal');
      if (dispatchCalls === 3) return { outcome: 'accepted', receipts: [] };
      return { outcome: 'accepted', receipts: [{ operationId: 'op-mixed', outcome: 'applied', serverRevision: 2 }] };
    }, 1, time);
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const failed = await runner.runOneBatch();
      expect(failed.transport).toMatchObject({ failedAttempts: attempt });
      time.advance(failed.transport?.delayMs ?? 0);
    }
    const invalid = await runner.runOneBatch();
    expect(invalid.transport).toMatchObject({ action: 'retry', failedAttempts: 3, errorCode: 'sync_receipt_invalid' });
    expect((await outbox.readDispatchState(fenceA)).failedAttempts).toBe(3);
    time.advance(invalid.transport?.delayMs ?? 0);
    const done = await runner.runOneBatch();
    expect(done.confirmations).toHaveLength(1);
    expect(await outbox.readDispatchState(fenceA)).toMatchObject({ failedAttempts: 0, firstFailureAtMs: null, notBeforeMs: null });
  });

  test('receipt decision uses the same ceiling', () => {
    expect(decideAccountSyncReceiptFailure({ failedAttempts: 4, firstFailureAtMs: 0 }, DAY_MS - 1, () => 0.5))
      .toMatchObject({ action: 'retry', failedAttempts: 5, quarantineCode: null, errorCode: 'sync_receipt_invalid' });
    expect(decideAccountSyncReceiptFailure({ failedAttempts: 4, firstFailureAtMs: 0 }, DAY_MS, () => 0.5))
      .toMatchObject({ action: 'quarantine', quarantineCode: 'sync_receipt_invalid_exhausted', delayMs: 0 });
  });
});

// ─── P3: легаси {outcome:'rejected'} ───────────────────────────────────────

describe('P3: a legacy rejected response backs off and hits the ceiling', () => {
  test('legacy rejected spends attempts, waits, and quarantines after a day', async () => {
    const { outbox, time } = await harness();
    await outbox.enqueue(op('op-legacy'), fenceA);
    let dispatchCalls = 0;
    const runner = wired(outbox, async () => { dispatchCalls += 1; return { outcome: 'rejected' }; }, 1, time);
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const failed = await runner.runOneBatch();
      expect(failed.state.phase).toMatchObject({ tag: 'sync_attention', code: 'sync_dispatch_rejected' });
      expect(failed.transport).toMatchObject({ action: 'retry', failedAttempts: attempt, errorCode: 'legacy_rejected' });
      expect((await runner.runOneBatch()).transport).toMatchObject({ action: 'not_before' });
      time.advance((failed.transport?.delayMs ?? 0) + (attempt === 1 ? DAY_MS : 0));
    }
    const final = await runner.runOneBatch();
    expect(final.quarantines[0]).toMatchObject({ quarantineCode: 'sync_dispatch_attempts_exhausted' });
    expect(dispatchCalls).toBe(5);
  });
});

// ─── P2: верхняя граница гибридных часов ───────────────────────────────────

describe('P2: hybrid SRS time never runs past the server future window', () => {
  test('the window is the server 10 minutes minus a margin', () => {
    expect(ACCOUNT_SYNC_SRS_MAX_FUTURE_SKEW_MS).toBe(10 * 60 * 1000);
    expect(ACCOUNT_SYNC_SRS_FUTURE_MARGIN_MS).toBeGreaterThan(0);
    expect(ACCOUNT_SYNC_SRS_FUTURE_MARGIN_MS).toBeLessThan(ACCOUNT_SYNC_SRS_MAX_FUTURE_SKEW_MS);
  });

  test('a seen time far in the future is clamped to serverNow + window − margin', () => {
    const cap = 1_000_500 + ACCOUNT_SYNC_SRS_MAX_FUTURE_SKEW_MS - ACCOUNT_SYNC_SRS_FUTURE_MARGIN_MS;
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      expect(accountSyncHybridSrsUpdatedAtMs({
        localNowMs: 1_000_000, serverOffsetMs: 500, seenUpdatedAtMs: 9_000_000_000_000,
      })).toBe(cap);
      expect(accountSyncHybridSrsUpdatedAtMs({
        localNowMs: 1_000_000, serverOffsetMs: 500, seenUpdatedAtMs: cap - 1,
      })).toBe(cap);
      expect(accountSyncHybridSrsUpdatedAtMs({
        localNowMs: 1_000_000, serverOffsetMs: 500, seenUpdatedAtMs: cap - 2,
      })).toBe(cap - 1);
      expect(JSON.stringify(warn.mock.calls)).toContain('srs_time_clamped');
    } finally {
      warn.mockRestore();
    }
  });
});

// ─── P2: перевыпуск SRS ─────────────────────────────────────────────────────

describe('P2: SRS re-issue ids are deterministic and later edits win', () => {
  const FUTURE = 9_000_000_000_000;
  const rejectedReceipt = Object.freeze({
    operationId: 'card-op-1', outcome: 'rejected' as const, code: 'srs_time_in_future' as const, serverRevision: 6,
  });
  const base = { receipt: rejectedReceipt, localNowMs: 2_000_000, serverOffsetMs: 0, seenSrsUpdatedAtMs: {}, nextClientSequence: 30 };

  test('ids are derived from the rejected id', () => {
    expect(accountSyncReissueOperationIds('card-op-1')).toEqual({ srs: 'card-op-1:srs', rest: 'card-op-1:rest' });
    const long = 'x'.repeat(158);
    const derived = accountSyncReissueOperationIds(long);
    expect(Buffer.byteLength(derived.srs, 'utf8')).toBeLessThanOrEqual(160);
    expect(Buffer.byteLength(derived.rest, 'utf8')).toBeLessThanOrEqual(160);
    expect(derived.srs).not.toBe(derived.rest);
    expect(accountSyncReissueOperationIds(long)).toEqual(derived);
    expect(accountSyncReissueOperationIds(`${'x'.repeat(157)}y`)).not.toEqual(derived);
  });

  test('fields rewritten by a later operation of the same card are dropped from the re-issue', () => {
    const rejected = op('card-op-1', 'card/7', { op: 'upsert', fields: {
      front: 'old', back: 'kept', srs: { interval: 3, updatedAtMs: FUTURE }, srsPolicy: { mode: 'x', updatedAtMs: FUTURE },
    } }, 6);
    const later = op('card-op-2', 'card/7', { op: 'upsert', fields: { front: 'new', srs: { interval: 9, updatedAtMs: 2_000_000 } } }, 6);
    const plan = planAccountSyncSrsReissue({ ...base, rejected, laterOperations: [later] });
    expect(plan.map(({ operation }) => operation.operationId)).toEqual(['card-op-1:rest', 'card-op-1:srs']);
    expect(plan[0].operation.payload).toEqual({ op: 'upsert', fields: { back: 'kept' } });
    expect(plan[1].operation.payload).toEqual({ op: 'upsert', fields: { srsPolicy: { mode: 'x', updatedAtMs: 2_000_000 } } });
  });

  test('re-issued rest goes after the later operation and cannot overwrite it', async () => {
    const { outbox } = await harness();
    const rejected = op('card-op-1', 'card/7', { op: 'upsert', fields: { front: 'old', srs: { updatedAtMs: FUTURE } } }, 6);
    const later = op('card-op-2', 'card/7', { op: 'upsert', fields: { front: 'new' } }, 6);
    await outbox.enqueue(rejected, fenceA);
    const loaded = await outbox.load(loadEffect());
    await outbox.enqueue(later, fenceA);
    await outbox.ackCommit(ackEffect(loaded, () => rejectedReceipt));
    const [unresolved] = await outbox.listUnresolved(fenceA);
    const plan = planAccountSyncSrsReissue({ ...base, rejected: unresolved.operation, receipt: unresolved.receipt,
      laterOperations: [later] });
    expect(plan.map(({ operation }) => operation.operationId)).toEqual(['card-op-1:srs']);
    await outbox.markResolved(fenceA, 'card-op-1', () => plan);
    const queued = await outbox.load(loadEffect(4));
    expect(ids(queued)).toEqual(['card-op-2', 'card-op-1:srs']);
    const fieldsOf = (index: number): string[] => Object.keys(
      (queued.operations[index].operation.payload as { fields: Record<string, unknown> }).fields);
    expect(fieldsOf(1)).not.toContain('front');
  });

  test('a later tombstone leaves nothing to re-issue; a foreign later operation is refused', () => {
    const rejected = op('card-op-1', 'card/7', { op: 'upsert', fields: { srs: { updatedAtMs: FUTURE } } }, 6);
    expect(planAccountSyncSrsReissue({ ...base, rejected,
      laterOperations: [op('card-op-2', 'card/7', { op: 'tombstone' }, 6)] })).toEqual([]);
    expect(() => planAccountSyncSrsReissue({ ...base, rejected,
      laterOperations: [op('card-op-3', 'card/other', { op: 'upsert', fields: { front: 'x' } }, 6)] }))
      .toThrow('account_sync_invalid_input');
  });
});

// ─── P2: итоги conflict/rejected переживают крах ───────────────────────────

describe('P2: conflict and rejected outcomes survive a crash until resolved', () => {
  test('listUnresolved after a restart; markResolved enqueues replacements atomically and idempotently', async () => {
    const { outbox, reopen } = await harness();
    await outbox.enqueue(op('op-conflict'), fenceA);
    await outbox.enqueue(op('card-srs', 'card/9', { op: 'upsert', fields: { front: 'f', srs: { updatedAtMs: 9_000_000_000_000 } } }), fenceA);
    await outbox.enqueue(op('op-applied'), fenceA);
    const loaded = await outbox.load(loadEffect());
    await outbox.ackCommit(ackEffect(loaded, (operationId) => {
      if (operationId === 'op-conflict') return { operationId, outcome: 'conflict', serverRevision: 7 };
      if (operationId === 'card-srs') return { operationId, outcome: 'rejected', code: 'srs_time_in_future', serverRevision: 4 };
      return { operationId, outcome: 'applied', serverRevision: 8 };
    }));

    const restarted = reopen();
    const unresolved = await restarted.listUnresolved(fenceA);
    expect(unresolved.map(({ receipt }) => receipt.operationId)).toEqual(['op-conflict', 'card-srs']);
    expect(unresolved[0].operation).toEqual(op('op-conflict'));

    const plan = planAccountSyncSrsReissue({
      rejected: unresolved[1].operation, receipt: unresolved[1].receipt, localNowMs: 2_000_000, serverOffsetMs: 0,
      seenSrsUpdatedAtMs: {}, laterOperations: [], nextClientSequence: 2,
    });
    // Крах между постановкой замены и отметкой: та же замена тем же id — дубликат, не вторая копия.
    await restarted.enqueue(plan[0], fenceA);
    expect(await restarted.markResolved(fenceA, 'card-srs', () => plan)).toEqual({ outcome: 'resolved', pendingCount: 2 });
    expect(await restarted.markResolved(fenceA, 'card-srs', () => plan)).toEqual({ outcome: 'already_resolved', pendingCount: 2 });
    expect((await restarted.listUnresolved(fenceA)).map(({ receipt }) => receipt.operationId)).toEqual(['op-conflict']);
    expect(await restarted.markResolved(fenceA, 'op-conflict', () => [])).toEqual({ outcome: 'resolved', pendingCount: 2 });
    expect(await restarted.listUnresolved(fenceA)).toEqual([]);
    expect(await restarted.markResolved(fenceA, 'op-applied', () => [])).toEqual({ outcome: 'already_resolved', pendingCount: 2 });
    await expectOutboxCode(() => restarted.markResolved(fenceA, 'op-unknown', () => []), 'account_sync_outbox_invalid_input');
    expect(ids(await restarted.load(loadEffect(5)))).toEqual(['card-srs:rest', 'card-srs:srs']);
  });
});

// ─── P3: срок жизни и часы ──────────────────────────────────────────────────

describe('P3: outbox lifetime uses server-corrected time and distrusts negative ages', () => {
  test('clock set back: the operation does not expire and the age is logged as suspicious', async () => {
    const { outbox, time } = await harness();
    await outbox.enqueue(op('op-back'), fenceA);
    time.advance(-30 * DAY_MS);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      expect(ids(await outbox.load(loadEffect()))).toEqual(['op-back']);
      expect(JSON.stringify(warn.mock.calls)).toContain('outbox_age_negative');
    } finally {
      warn.mockRestore();
    }
    time.advance(30 * DAY_MS + 169 * DAY_MS);
    expect(ids(await outbox.load(loadEffect(2)))).toEqual(['op-back']);
  });

  test('enqueue time and expiry use the persisted server offset', async () => {
    const { adapter, outbox, time } = await harness();
    await outbox.writeDispatchState(fenceA, {
      batchId: null, failedAttempts: 0, firstFailureAtMs: null, notBeforeMs: null, clockOffsetMs: 200 * DAY_MS,
    });
    await outbox.enqueue(op('op-offset'), fenceA);
    expect(storedValue(adapter, `${PREFIX}pending:${JSON.stringify('op-offset')}`)?.enqueuedAtMs)
      .toBe(time.now() + 200 * DAY_MS);
    time.advance(171 * DAY_MS);
    expect(await outbox.load(loadEffect())).toMatchObject({ operations: [], pendingCount: 0 });
  });
});

// ─── P3: id пакета с «дырами», ack поверх retired, повтор карантина ────────

describe('P3: batch ids with gaps are unique; retired slots survive restart and re-ack', () => {
  test('a gapped batch id carries a hash of its sequence list', () => {
    expect(accountSyncBatchIdFor([4, 5, 6])).toBe('sync-v2:4:6');
    const left = accountSyncBatchIdFor([0, 2, 5]);
    const right = accountSyncBatchIdFor([0, 3, 5]);
    expect(left).toMatch(/^sync-v2:0:5:n3:h[0-9a-f]{8}$/);
    expect(right).toMatch(/^sync-v2:0:5:n3:h[0-9a-f]{8}$/);
    expect(left).not.toBe(right);
    expect(accountSyncBatchIdFor([0, 2, 5])).toBe(left);
    const huge = [0, 2, Number.MAX_SAFE_INTEGER];
    expect(Buffer.byteLength(accountSyncBatchIdFor(huge), 'utf8')).toBeLessThanOrEqual(160);
  });

  test('restart and re-ack over retired slots with the head below the gaps', async () => {
    const { adapter, outbox, reopen } = await harness();
    await outbox.enqueue(op('x-1', 'card/X'), fenceA);
    await outbox.enqueue(op('y-1', 'card/Y'), fenceA);
    await outbox.enqueue(op('x-2', 'card/X'), fenceA);
    const loaded = await outbox.load(loadEffect());
    expect(ids(loaded)).toEqual(['x-1', 'y-1', 'x-2']);
    // Пакет только сущности X: номера 0 и 2, дыра на 1.
    const onlyX = Object.freeze({
      batchId: accountSyncBatchIdFor([0, 2]),
      operations: [loaded.operations[0], loaded.operations[2]],
      pendingCount: loaded.pendingCount,
    });
    const effect = ackEffect(onlyX);
    await outbox.ackCommit(effect);
    expect(storedValue(adapter, `${PREFIX}meta`)).toMatchObject({ head: 1, next: 3, pendingCount: 1 });
    expect(storedValue(adapter, `${PREFIX}slot:2`)?.kind).toBe('account_sync_outbox_retired');

    const restarted = reopen();
    expect(await restarted.ackCommit(effect)).toEqual({ committedOperationIds: ['x-1', 'x-2'], remainingPendingCountObserved: 1 });
    await restarted.enqueue(op('z-1', 'card/Z'), fenceA);
    const next = await restarted.load(loadEffect(2));
    expect(ids(next)).toEqual(['y-1', 'z-1']);
    expect(next.batchId).toBe(accountSyncBatchIdFor([1, 3]));
    await restarted.ackCommit(ackEffect(next));
    expect(storedValue(adapter, `${PREFIX}meta`)).toMatchObject({ head: 4, next: 4, pendingCount: 0 });
    expect(adapter.snapshot(scopeA.scopeKey).some(({ key }) => key.startsWith(`${PREFIX}slot:`))).toBe(false);
    expect(await restarted.ackCommit(effect)).toEqual({ committedOperationIds: ['x-1', 'x-2'], remainingPendingCountObserved: 0 });
  });

  test('a quarantine repeated after a lost response changes nothing', async () => {
    const { adapter, outbox } = await harness();
    await outbox.enqueue(op('q-1'), fenceA);
    await outbox.enqueue(op('q-2'), fenceA);
    const effect = quarantineEffect(await outbox.load(loadEffect()));
    expect(await outbox.quarantine(effect)).toEqual({ quarantinedOperationIds: ['q-1', 'q-2'], remainingPendingCountObserved: 0 });
    const before = adapter.snapshot(scopeA.scopeKey);
    expect(await outbox.quarantine(effect)).toEqual({ quarantinedOperationIds: ['q-1', 'q-2'], remainingPendingCountObserved: 0 });
    expect(adapter.snapshot(scopeA.scopeKey)).toEqual(before);
  });
});
