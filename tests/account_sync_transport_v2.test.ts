import { sameSessionFence, type AccountScope, type SessionFence } from '../modules/account-session-v2/account_session';
import { createAccountScopeStore, type ScopeJson } from '../modules/account-session-v2/account_scope_store';
import type { AccountSyncEffect, AccountSyncOwnedOperation } from '../modules/account-session-v2/account_sync';
import { createAccountSyncOutbox } from '../modules/account-session-v2/account_sync_outbox';
import {
  createAccountSyncRunner,
  type AccountSyncRunnerPorts,
} from '../modules/account-session-v2/account_sync_runner';
import {
  ACCOUNT_SYNC_CLIENT_ERROR_CONTRACT,
  ACCOUNT_SYNC_CLIENT_MAX_ATTEMPTS,
  accountSyncBackoffMs,
  accountSyncClientAction,
  accountSyncIsWaitResponse,
  decideAccountSyncTransportFailure,
  snapshotAccountSyncTransportError,
} from '../modules/account-session-v2/account_sync_transport';
import { MemoryScopeStorageAdapter } from '../modules/account-session-v2/testing/memory_scope_storage';

/*
 * Account V2 (TG-831C22D22486) — ошибки транспорта по TEMP-контракту сервера.
 * Решение ТОЛЬКО по details.final; unauthenticated — перелогин; resource-exhausted
 * с retryAfterMs — ожидание без траты попытки; потолок 5 неудач → карантин;
 * голый internal без details — повторяемый.
 */

const UID = 'uid/transport';
const fenceA: SessionFence = Object.freeze({
  scopeKey: `account:${UID}`, uid: UID, generation: 1, nonce: 'nonce-t',
});
const PREFIX = '__account_sync_outbox_v2__:';
const DAY_MS = 24 * 60 * 60 * 1000;

function owned(operationId = 'op-1', baseRevision: number | null = 2): AccountSyncOwnedOperation {
  return {
    ownerUid: UID,
    operation: {
      schemaVersion: 1, operationId, entityType: 'lesson_progress', entityId: `entity/${operationId}`,
      clientSequence: 1, baseRevision, payload: { passed: true, score: 3 },
    },
  };
}

function httpsError(code: string, details?: unknown): Error {
  return Object.assign(new Error('private server text'), { code, ...(details === undefined ? {} : { details }) });
}

describe('client copy of the server decision table', () => {
  test('contract constants equal the server contract', () => {
    expect(ACCOUNT_SYNC_CLIENT_MAX_ATTEMPTS).toBe(5);
    expect(ACCOUNT_SYNC_CLIENT_ERROR_CONTRACT).toEqual({
      decideBy: 'details.final',
      final: ['invalid-argument', 'permission-denied', 'failed-precondition'],
      retryable: ['resource-exhausted', 'unavailable', 'internal'],
      reauth: ['unauthenticated'],
      maxAttempts: 5,
      retryAfterConsumesAttempt: false,
      minFailureSpanMs: 24 * 60 * 60 * 1000,
      attemptsExhaustedRequeue: true,
      requeueQuarantineCodes: [
        'sync_dispatch_attempts_exhausted', 'sync_receipt_invalid_exhausted', 'sync_operation_expired',
        'sync_operation_time_in_future',
      ],
    });
  });

  // зачем (TG-7CD73967EF61): потолок = И ≥5 неудач, И ≥24 ч с первой неудачи.
  test.each([
    ['final invalid-argument', { code: 'invalid-argument', details: { final: true } }, 1, 0, 'quarantine'],
    ['final failed-precondition', { code: 'failed-precondition', details: { final: true, code: 'x' } }, 1, 0, 'quarantine'],
    ['final any code', { code: 'unavailable', details: { final: true } }, 1, 0, 'quarantine'],
    ['permission-denied without final is retryable', { code: 'permission-denied' }, 1, DAY_MS, 'retry'],
    ['final as string is not final', { code: 'invalid-argument', details: { final: 'true' } }, 1, DAY_MS, 'retry'],
    ['unauthenticated', { code: 'unauthenticated', details: { final: false } }, 99, DAY_MS, 'reauth'],
    ['bare internal', { code: 'internal' }, 1, DAY_MS, 'retry'],
    ['wait ignores the ceiling', { code: 'resource-exhausted', details: { retryAfterMs: 10 } }, 99, DAY_MS, 'retry'],
    ['retryable at ceiling after a day', { code: 'unavailable', details: { final: false } }, 5, DAY_MS, 'quarantine'],
    ['retryable at ceiling within a day', { code: 'unavailable', details: { final: false } }, 5, DAY_MS - 1, 'retry'],
    ['retryable below ceiling', { code: 'unavailable', details: { final: false } }, 4, DAY_MS, 'retry'],
  ] as const)('%s', (_label, error, failed, failingFor, action) => {
    expect(accountSyncClientAction(error, failed, failingFor)).toBe(action);
  });

  test.each([
    [{ code: 'resource-exhausted', details: { retryAfterMs: 1 } }, true],
    [{ code: 'resource-exhausted', details: { retryAfterMs: 0 } }, false],
    [{ code: 'resource-exhausted', details: { retryAfterMs: Number.POSITIVE_INFINITY } }, false],
    [{ code: 'resource-exhausted' }, false],
    [{ code: 'unavailable', details: { retryAfterMs: 5 } }, false],
  ] as const)('wait response %#', (error, expected) => {
    expect(accountSyncIsWaitResponse(error)).toBe(expected);
  });
});

describe('transport error snapshot and decision', () => {
  test('strips the functions/ prefix and keeps only final and retryAfterMs', () => {
    expect(snapshotAccountSyncTransportError(httpsError('functions/resource-exhausted', {
      final: false, retryAfterMs: 1500, secret: 'x',
    }))).toEqual({ code: 'resource-exhausted', details: { final: false, retryAfterMs: 1500 } });
    expect(snapshotAccountSyncTransportError(new Error('boom'))).toEqual({ code: 'internal', details: undefined });
    expect(snapshotAccountSyncTransportError('text')).toEqual({ code: 'internal', details: undefined });
  });

  test('never invokes getters on the error or details', () => {
    let getterCalls = 0;
    const details = Object.defineProperty({}, 'final', {
      enumerable: true, get() { getterCalls += 1; return true; },
    });
    const error = Object.defineProperty(httpsError('functions/invalid-argument', details), 'code', {
      enumerable: true, get() { getterCalls += 1; return 'invalid-argument'; },
    });
    expect(snapshotAccountSyncTransportError(error)).toEqual({ code: 'internal', details: undefined });
    expect(snapshotAccountSyncTransportError(httpsError('invalid-argument', details)))
      .toEqual({ code: 'invalid-argument', details: {} });
    expect(getterCalls).toBe(0);
  });

  test('wait does not spend an attempt and waits at least retryAfterMs', () => {
    for (const random of [0, 0.5, 0.999]) {
      const decision = decideAccountSyncTransportFailure(
        { code: 'resource-exhausted', details: { final: false, retryAfterMs: 30_000 } },
        { failedAttempts: 4, firstFailureAtMs: 0 }, DAY_MS, () => random,
      );
      expect(decision).toMatchObject({ action: 'wait', failedAttempts: 4, quarantineCode: null });
      expect(decision.delayMs).toBeGreaterThanOrEqual(30_000);
    }
  });

  test('retryable spends an attempt with growing backoff and the fifth failure after a day quarantines', () => {
    const delays: number[] = [];
    for (let before = 0; before < 4; before += 1) {
      const decision = decideAccountSyncTransportFailure({ code: 'internal', details: undefined },
        { failedAttempts: before, firstFailureAtMs: before === 0 ? null : 0 }, DAY_MS, () => 0.5);
      expect(decision).toMatchObject({ action: 'retry', failedAttempts: before + 1 });
      delays.push(decision.delayMs);
    }
    expect(delays).toEqual([...delays].sort((a, b) => a - b));
    expect(delays[0]).toBeGreaterThan(0);
    expect(decideAccountSyncTransportFailure({ code: 'internal', details: undefined },
      { failedAttempts: 4, firstFailureAtMs: 0 }, DAY_MS, () => 0.5))
      .toMatchObject({ action: 'quarantine', failedAttempts: 5, quarantineCode: 'sync_dispatch_attempts_exhausted' });
    expect(decideAccountSyncTransportFailure({ code: 'invalid-argument', details: { final: true } },
      { failedAttempts: 0, firstFailureAtMs: null }, 0, () => 0))
      .toMatchObject({ action: 'quarantine', quarantineCode: 'sync_dispatch_final', delayMs: 0 });
    expect(decideAccountSyncTransportFailure({ code: 'unauthenticated', details: undefined },
      { failedAttempts: 3, firstFailureAtMs: 0 }, 0, () => 0))
      .toMatchObject({ action: 'reauth', failedAttempts: 3, delayMs: 0 });
  });

  test('backoff is bounded and positive', () => {
    // зачем: после 5 неудач до суток повторы редеют до 15 минут (стоимость сервера).
    for (let attempt = 1; attempt <= 40; attempt += 1) {
      const low = accountSyncBackoffMs(attempt, () => 0);
      const high = accountSyncBackoffMs(attempt, () => 0.9999);
      expect(low).toBeGreaterThan(0);
      expect(high).toBeLessThanOrEqual(15 * 60_000);
      expect(Number.isSafeInteger(high)).toBe(true);
    }
  });
});

describe('runner applies the transport decision', () => {
  function clock(start = 1_000_000): { now: () => number; advance: (ms: number) => void } {
    let current = start;
    return { now: () => current, advance: (ms) => { current += ms; } };
  }

  function ports(dispatch: AccountSyncRunnerPorts['dispatch'], extra: Partial<AccountSyncRunnerPorts> = {}): AccountSyncRunnerPorts {
    return {
      load: async () => ({ batchId: 'batch-1', operations: [owned()], pendingCount: 1 }),
      dispatch,
      ackCommit: async () => ({ committedOperationIds: ['op-1'], remainingPendingCountObserved: 0 }),
      ...extra,
    };
  }

  test('five retryable failures over a day are gated by backoff and then quarantine the batch', async () => {
    const time = clock();
    const quarantined: AccountSyncEffect[] = [];
    let dispatchCalls = 0;
    const runner = createAccountSyncRunner(UID, fenceA, 1, ports(async () => {
      dispatchCalls += 1;
      throw httpsError('functions/unavailable', { final: false });
    }, {
      quarantine: async (effect) => {
        quarantined.push(effect);
        return { quarantinedOperationIds: ['op-1'], remainingPendingCountObserved: 0 };
      },
    }), () => true, { nowMs: time.now, random: () => 0.5 });

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const failed = await runner.runOneBatch();
      expect(failed.state.phase).toMatchObject({ tag: 'sync_attention', code: 'sync_dispatch_failed' });
      expect(failed.transport).toMatchObject({ action: 'retry', failedAttempts: attempt });
      const delay = failed.transport?.delayMs ?? 0;
      expect(delay).toBeGreaterThan(0);
      const gated = await runner.runOneBatch();
      expect(gated.transport).toMatchObject({ action: 'not_before', failedAttempts: attempt });
      expect(dispatchCalls).toBe(attempt);
      time.advance(delay + (attempt === 1 ? DAY_MS : 0));
    }
    const final = await runner.runOneBatch();
    expect(dispatchCalls).toBe(5);
    expect(quarantined).toHaveLength(1);
    expect(quarantined[0]).toMatchObject({
      type: 'QUARANTINE_OUTBOX_BATCH', quarantineCode: 'sync_dispatch_attempts_exhausted',
    });
    expect(final.state).toMatchObject({ pendingCount: 0, phase: { tag: 'idle' } });
    expect(final.quarantines).toEqual([expect.objectContaining({
      type: 'REPORT_SYNC_QUARANTINED', quarantinedOperationIds: ['op-1'],
      quarantineCode: 'sync_dispatch_attempts_exhausted',
    })]);
    expect(final.confirmations).toEqual([]);
  });

  test('resource-exhausted with retryAfterMs never spends attempts and waits at least that long', async () => {
    const time = clock();
    let dispatchCalls = 0;
    let quarantineCalls = 0;
    const runner = createAccountSyncRunner(UID, fenceA, 1, ports(async () => {
      dispatchCalls += 1;
      throw httpsError('functions/resource-exhausted', { final: false, retryAfterMs: 30_000 });
    }, {
      quarantine: async () => { quarantineCalls += 1; return {}; },
    }), () => true, { nowMs: time.now, random: () => 0 });
    for (let round = 1; round <= 12; round += 1) {
      const waited = await runner.runOneBatch();
      expect(waited.transport).toMatchObject({ action: 'wait', failedAttempts: 0 });
      expect(waited.transport?.delayMs).toBeGreaterThanOrEqual(30_000);
      time.advance(29_999);
      expect((await runner.runOneBatch()).transport).toMatchObject({ action: 'not_before' });
      expect(dispatchCalls).toBe(round);
      time.advance(waited.transport?.delayMs ?? 0);
    }
    expect(quarantineCalls).toBe(0);
  });

  test('unauthenticated asks for re-login without spending attempts or gating', async () => {
    let dispatchCalls = 0;
    const runner = createAccountSyncRunner(UID, fenceA, 1, ports(async () => {
      dispatchCalls += 1;
      if (dispatchCalls <= 7) throw httpsError('functions/unauthenticated', { final: false });
      return { outcome: 'accepted', receipts: [{ operationId: 'op-1', outcome: 'applied', serverRevision: 3 }] };
    }), () => true, { nowMs: () => 5, random: () => 0 });
    for (let round = 1; round <= 7; round += 1) {
      const result = await runner.runOneBatch();
      expect(result.transport).toMatchObject({ action: 'reauth', failedAttempts: 0, delayMs: 0 });
      expect(result.state.phase).toMatchObject({ tag: 'sync_attention', code: 'sync_dispatch_failed' });
    }
    const done = await runner.runOneBatch();
    expect(done.confirmations).toHaveLength(1);
    expect(done.transport).toBeNull();
  });

  test('details.final quarantines immediately through the outbox and keeps a readable code', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const store = createAccountScopeStore(adapter);
    const scope: Extract<AccountScope, { kind: 'account' }> = { kind: 'account', uid: UID, scopeKey: `account:${UID}` };
    const outbox = createAccountSyncOutbox(await store.open(scope, fenceA));
    await outbox.enqueue(owned('op-final'), fenceA);
    await outbox.enqueue(owned('op-final-2'), fenceA);
    let dispatchCalls = 0;
    const runner = createAccountSyncRunner(UID, fenceA, 2, {
      load: outbox.load,
      dispatch: async () => {
        dispatchCalls += 1;
        throw httpsError('functions/failed-precondition', { final: true, code: 'batch_rejected' });
      },
      ackCommit: outbox.ackCommit,
      quarantine: outbox.quarantine,
    }, (expected) => sameSessionFence(expected, fenceA));
    const result = await runner.runOneBatch();
    expect(dispatchCalls).toBe(1);
    expect(result.state).toMatchObject({ pendingCount: 0, phase: { tag: 'idle' } });
    expect(result.transport).toMatchObject({ action: 'quarantine', errorCode: 'failed-precondition' });
    expect(result.quarantines[0]).toMatchObject({
      quarantinedOperationIds: ['op-final', 'op-final-2'], quarantineCode: 'sync_dispatch_final',
    });
    const stored = adapter.snapshot(scope.scopeKey);
    const record = stored.find(({ key }) => key === `${PREFIX}quarantine:${JSON.stringify('op-final')}`);
    expect((record?.value as Record<string, ScopeJson>).code).toBe('sync_dispatch_final');
    expect(stored.some(({ key }) => key.startsWith(`${PREFIX}pending:`))).toBe(false);
    expect(await outbox.enqueue(owned('op-final'), fenceA)).toMatchObject({ outcome: 'quarantined' });
    expect((await runner.runOneBatch()).state).toMatchObject({ pendingCount: 0, phase: { tag: 'idle' } });
    expect(dispatchCalls).toBe(1);
  });

  test('without a quarantine port a final failure blocks the batch instead of re-sending it', async () => {
    let dispatchCalls = 0;
    const runner = createAccountSyncRunner(UID, fenceA, 1, ports(async () => {
      dispatchCalls += 1;
      throw httpsError('invalid-argument', { final: true });
    }), () => true);
    const first = await runner.runOneBatch();
    expect(first.state.phase).toMatchObject({ tag: 'sync_attention', code: 'sync_dispatch_rejected' });
    expect(first.transport).toMatchObject({ action: 'quarantine' });
    const second = await runner.runOneBatch();
    expect(second.transport).toMatchObject({ action: 'quarantine' });
    expect(dispatchCalls).toBe(1);
  });

  test('a retry re-sends the identical batch snapshot', async () => {
    const time = clock();
    const batches: unknown[] = [];
    let dispatchCalls = 0;
    const runner = createAccountSyncRunner(UID, fenceA, 1, ports(async (effect) => {
      batches.push(JSON.parse(JSON.stringify(effect.batch)));
      dispatchCalls += 1;
      if (dispatchCalls === 1) throw new Error('bare 500');
      return { outcome: 'accepted', receipts: [{ operationId: 'op-1', outcome: 'duplicate', serverRevision: 40 }] };
    }), () => true, { nowMs: time.now, random: () => 0 });
    const failed = await runner.runOneBatch();
    expect(failed.transport).toMatchObject({ action: 'retry', errorCode: 'internal' });
    time.advance(failed.transport?.delayMs ?? 0);
    const done = await runner.runOneBatch();
    expect(done.confirmations).toHaveLength(1);
    expect(batches).toHaveLength(2);
    expect(batches[1]).toEqual(batches[0]);
    expect((batches[1] as { operations: { operation: { baseRevision: number } }[] })
      .operations[0].operation.baseRevision).toBe(2);
  });

  test('stores the server clock offset from serverNowMs and rejects a malformed one', async () => {
    const runner = createAccountSyncRunner(UID, fenceA, 1, ports(async () => ({
      outcome: 'accepted', serverNowMs: 1_000_750,
      receipts: [{ operationId: 'op-1', outcome: 'applied', serverRevision: 1 }],
    })), () => true, { nowMs: () => 1_000_000 });
    expect(runner.getServerClockOffsetMs()).toBeNull();
    expect((await runner.runOneBatch()).confirmations).toHaveLength(1);
    expect(runner.getServerClockOffsetMs()).toBe(750);

    const malformed = createAccountSyncRunner(UID, fenceA, 1, ports(async () => ({
      outcome: 'accepted', serverNowMs: 'soon',
      receipts: [{ operationId: 'op-1', outcome: 'applied', serverRevision: 1 }],
    })), () => true);
    expect((await malformed.runOneBatch()).state.phase)
      .toMatchObject({ tag: 'sync_attention', code: 'sync_receipt_invalid' });
    expect(malformed.getServerClockOffsetMs()).toBeNull();
  });
});
