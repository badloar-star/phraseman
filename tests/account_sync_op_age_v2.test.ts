import { sameSessionFence, type AccountScope, type SessionFence } from '../modules/account-session-v2/account_session';
import {
  createAccountScopeStore,
  type AccountScopeHandle,
  type ScopeJson,
} from '../modules/account-session-v2/account_scope_store';
import {
  ACCOUNT_SYNC_REJECT_CODES,
  type AccountSyncEffect,
  type AccountSyncOwnedOperation,
  type AccountSyncServerReceipt,
} from '../modules/account-session-v2/account_sync';
import {
  createAccountSyncOutbox,
  type AccountSyncOutbox,
  type AccountSyncOutboxLoadResult,
} from '../modules/account-session-v2/account_sync_outbox';
import { createAccountSyncRunner } from '../modules/account-session-v2/account_sync_runner';
import {
  createAccountSyncDispatchPort,
  wireEnqueuedAtServerMs,
} from '../modules/account-session-v2/account_sync_outbox_time';
import { ACCOUNT_SYNC_CLIENT_ERROR_CONTRACT } from '../modules/account-session-v2/account_sync_transport';
import { MemoryScopeStorageAdapter } from '../modules/account-session-v2/testing/memory_scope_storage';

/*
 * Account V2 — серверная проверка возраста операции, клиентская сторона
 * (TG-DFA918464DFA). Клиент отправляет каждую операцию с оценкой времени
 * постановки по часам сервера (`enqueuedAtServerMs`, из записи outbox, неизменна),
 * зажатой сверху текущим «сейчас по серверу». Отказы сервера `operation_expired` /
 * `operation_time_in_future` уходят в ВОЗВРАТНЫЙ карантин, а не в ack.
 */

const UID = 'uid/op-age';
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const REAL_NOW = 1_800_000_000_000;
const PREFIX = '__account_sync_outbox_v2__:';
const fenceA: SessionFence = Object.freeze({
  scopeKey: `account:${UID}`, uid: UID, generation: 1, nonce: 'nonce-age',
});
const scopeA: Extract<AccountScope, { kind: 'account' }> = { kind: 'account', uid: UID, scopeKey: `account:${UID}` };

function op(operationId: string, entityId = `entity/${operationId}`): AccountSyncOwnedOperation {
  return {
    ownerUid: UID,
    operation: {
      schemaVersion: 1, operationId, entityType: 'flashcard', entityId,
      clientSequence: 1, baseRevision: 4, payload: { op: 'upsert', fields: { front: operationId } },
    },
  };
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
};

async function harness(start = REAL_NOW): Promise<Harness> {
  const adapter = new MemoryScopeStorageAdapter();
  const handle = await createAccountScopeStore(adapter).open(scopeA, fenceA);
  const time = clock(start);
  return { adapter, handle, time, outbox: createAccountSyncOutbox(handle, { nowMs: time.now }) };
}

function loadEffect(): Extract<AccountSyncEffect, { type: 'LOAD_OUTBOX_BATCH' }> {
  return Object.freeze({
    type: 'LOAD_OUTBOX_BATCH', ownerUid: UID, expectedFence: fenceA, attemptEpoch: 1,
    maxOperations: 50, maxBatchUtf8Bytes: 524288,
  });
}

function dispatchEffect(loaded: AccountSyncOutboxLoadResult): Extract<AccountSyncEffect, { type: 'DISPATCH_OUTBOX_BATCH' }> {
  return Object.freeze({
    type: 'DISPATCH_OUTBOX_BATCH', ownerUid: UID, expectedFence: fenceA, attemptEpoch: 2,
    batch: Object.freeze({ batchId: loaded.batchId, operations: loaded.operations }),
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

function storedValue(adapter: MemoryScopeStorageAdapter, key: string): Record<string, ScopeJson> | undefined {
  return adapter.snapshot(scopeA.scopeKey).find((record) => record.key === key)?.value as Record<string, ScopeJson> | undefined;
}

const pendingKey = (id: string): string => `${PREFIX}pending:${JSON.stringify(id)}`;
const quarantineKey = (id: string): string => `${PREFIX}quarantine:${JSON.stringify(id)}`;
const ackKey = (id: string): string => `${PREFIX}ack:${JSON.stringify(id)}`;

async function setOffset(outbox: AccountSyncOutbox, clockOffsetMs: number): Promise<void> {
  const current = await outbox.readDispatchState(fenceA);
  await outbox.writeDispatchState(fenceA, { ...current, clockOffsetMs });
}

async function stamps(outbox: AccountSyncOutbox): Promise<Record<string, number>> {
  const loaded = await outbox.load(loadEffect());
  const wire = await outbox.wireBatch(dispatchEffect(loaded));
  expect(wire.batchId).toBe(loaded.batchId);
  return Object.fromEntries(wire.operations.map((row) => [row.operation.operationId, row.enqueuedAtServerMs]));
}

async function quietly<T>(work: (calls: () => string) => Promise<T>): Promise<T> {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    return await work(() => JSON.stringify(warn.mock.calls));
  } finally {
    warn.mockRestore();
  }
}

const rejected = (operationId: string, code: 'operation_expired' | 'operation_time_in_future') =>
  Object.freeze({ operationId, outcome: 'rejected' as const, code, serverRevision: 2 });
const applied = (operationId: string) => Object.freeze({ operationId, outcome: 'applied' as const, serverRevision: 5 });

describe('Account V2 client: оценка времени постановки на проводе', () => {
  test('коды отказа и возвратность карантинов', () => {
    expect(ACCOUNT_SYNC_REJECT_CODES).toEqual(expect.arrayContaining(['operation_expired', 'operation_time_in_future']));
    expect(ACCOUNT_SYNC_CLIENT_ERROR_CONTRACT.requeueQuarantineCodes)
      .toEqual(expect.arrayContaining(['sync_operation_expired', 'sync_operation_time_in_future']));
  });

  test('из двух правдоподобных оценок постановки берётся МЛАДШАЯ; первая отправка записывается один раз', async () => {
    const { adapter, outbox, time } = await harness();
    await setOffset(outbox, -3 * HOUR_MS);
    await outbox.enqueue(op('op-a'), fenceA);
    time.advance(DAY_MS);
    await setOffset(outbox, 5 * MINUTE_MS);
    // Заморожено: REAL − 3 ч; по текущему смещению: REAL + 5 мин — обе в прошлом, младшая — вторая.
    await quietly(async (calls) => {
      expect(await stamps(outbox)).toEqual({ 'op-a': REAL_NOW + 5 * MINUTE_MS });
      expect(calls()).toContain('outbox_first_send_recorded');
    });
    const first = storedValue(adapter, pendingKey('op-a'));
    expect(first).toMatchObject({
      enqueuedAtMs: REAL_NOW - 3 * HOUR_MS, enqueuedLocalAtMs: REAL_NOW,
      firstSentAtServerMs: REAL_NOW + DAY_MS + 5 * MINUTE_MS, firstSentLocalAtMs: REAL_NOW + DAY_MS,
    });
    // Повтор отправки позже: запись первой отправки не меняется, число — то же.
    time.advance(HOUR_MS);
    await quietly(async () => {
      expect(await stamps(outbox)).toEqual({ 'op-a': REAL_NOW + 5 * MINUTE_MS });
    });
    expect(storedValue(adapter, pendingKey('op-a'))).toEqual(first);
  });

  test('конверт на проводе — ровно сохранённый, оценка рядом, а не внутри', async () => {
    const { outbox } = await harness();
    await outbox.enqueue(op('op-a'), fenceA);
    const loaded = await outbox.load(loadEffect());
    const wire = await quietly(() => outbox.wireBatch(dispatchEffect(loaded)));
    expect(wire.operations).toEqual([{ ...op('op-a'), enqueuedAtServerMs: REAL_NOW }]);
    expect(Object.keys(wire.operations[0].operation)).not.toContain('enqueuedAtServerMs');
  });

  test('замороженная оценка из будущего отбрасывается как доказанно ложная, запись не меняется', async () => {
    const { adapter, outbox } = await harness();
    await outbox.enqueue(op('op-ahead'), fenceA);
    // Ответ сервера показал: телефон спешит на 2 суток.
    await setOffset(outbox, -2 * DAY_MS);
    await quietly(async () => {
      expect(await stamps(outbox)).toEqual({ 'op-ahead': REAL_NOW - 2 * DAY_MS });
    });
    expect(storedValue(adapter, pendingKey('op-ahead'))?.enqueuedAtMs).toBe(REAL_NOW);
  });

  // Сценарий ревью P2-1: часы убежали на год вперёд при постановке, смещения не было;
  // потом часы исправили. Первая отправка применилась, ответ потерян, приложение не
  // открывали 181 сутки. Обе оценки постановки всё ещё «в будущем» — прежний зажим
  // слал «сейчас» (возраст ~0) и повтор применялся второй раз.
  test('P2-1: граница первой отправки держит возраст — через 181 сут повтор старше 170 сут', async () => {
    const { outbox, time } = await harness(REAL_NOW + 365 * DAY_MS);
    await outbox.enqueue(op('op-x'), fenceA);
    time.set(REAL_NOW);
    await quietly(async () => {
      expect(await stamps(outbox)).toEqual({ 'op-x': REAL_NOW });
    });
    time.advance(181 * DAY_MS);
    const later = await quietly(() => stamps(outbox));
    expect(later).toEqual({ 'op-x': REAL_NOW });
    expect(REAL_NOW + 181 * DAY_MS - later['op-x']).toBeGreaterThan(170 * DAY_MS);
  });

  // Сценарий ревью P2-2: дату телефона сбросили в прошлое (заводской сброс), смещение
  // на диске старое. Прежняя единственная оценка давала operation_expired навсегда:
  // requeue слал то же число. После ответа сервера (новое смещение) вторая оценка верна.
  test('P2-2: сброшенная дата — после ответа сервера живая правка уходит с верным временем', async () => {
    const reset = REAL_NOW - 20 * 365 * DAY_MS;
    const { adapter, outbox, time } = await harness(reset);
    await outbox.enqueue(op('op-reset'), fenceA);
    const loaded = await outbox.load(loadEffect());
    await quietly(async () => {
      expect((await outbox.wireBatch(dispatchEffect(loaded))).operations[0].enqueuedAtServerMs).toBe(reset);
    });
    await quietly(() => outbox.ackCommit(ackEffect(loaded, (id) => rejected(id, 'operation_expired'))));
    expect(storedValue(adapter, quarantineKey('op-reset'))).toMatchObject({
      code: 'sync_operation_expired', firstSentAtServerMs: reset, firstSentLocalAtMs: reset,
    });
    // Ответ с отказом принёс serverNowMs: телефон отстаёт на 20 лет.
    await setOffset(outbox, REAL_NOW - reset);
    time.advance(MINUTE_MS);
    await quietly(() => outbox.requeue(fenceA, ['op-reset']));
    await quietly(async () => {
      expect(await stamps(outbox)).toEqual({ 'op-reset': REAL_NOW });
    });
  });

  test('чистая функция: младшая правдоподобная постановка, не позже первой отправки, будущее отбрасывается', () => {
    const times = (enqueuedAtMs: number, enqueuedLocalAtMs: number, firstSent: { serverMs: number; localMs: number } | null) =>
      ({ enqueuedAtMs, enqueuedLocalAtMs, firstSent });
    expect(wireEnqueuedAtServerMs(times(500, 100, null), 0, 1_000)).toBe(500);
    expect(wireEnqueuedAtServerMs(times(500, 100, null), 450, 1_000)).toBe(550);
    // Обе оценки постановки в будущем — «сейчас», но не позже первой отправки.
    expect(wireEnqueuedAtServerMs(times(2_000, 2_000, null), 0, 1_000)).toBe(1_000);
    expect(wireEnqueuedAtServerMs(times(2_000, 2_000, { serverMs: 300, localMs: 300 }), 0, 1_000)).toBe(300);
    // Первая отправка: младшая правдоподобная из двух оценок.
    expect(wireEnqueuedAtServerMs(times(900, 900, { serverMs: 100, localMs: 50 }), 700, 1_000)).toBe(750);
    // Обе оценки первой отправки в будущем — доказанно ложны, граница = «сейчас» (иначе сервер ответит time_in_future).
    expect(wireEnqueuedAtServerMs(times(2_000, 2_000, { serverMs: 3_000, localMs: 3_000 }), 0, 1_000)).toBe(1_000);
    // Отрицательное местное + смещение — не ниже нуля.
    expect(wireEnqueuedAtServerMs(times(2_000, 100, null), -1_000, 1_000)).toBe(0);
  });

  test('операции пакета нет в очереди — конфликт, а не пакет без оценки', async () => {
    const { outbox } = await harness();
    await outbox.enqueue(op('op-a'), fenceA);
    const loaded = await outbox.load(loadEffect());
    await outbox.ackCommit(ackEffect(loaded, applied));
    await quietly(async () => {
      await expect(outbox.wireBatch(dispatchEffect(loaded)))
        .rejects.toMatchObject({ name: 'AccountSyncOutboxError', code: 'account_sync_outbox_conflict' });
    });
  });

  test('чужой эффект (другой тип) — invalid_input', async () => {
    const { outbox } = await harness();
    await outbox.enqueue(op('op-a'), fenceA);
    const loaded = await outbox.load(loadEffect());
    await quietly(async () => {
      await expect(outbox.wireBatch({ ...dispatchEffect(loaded), type: 'LOAD_OUTBOX_BATCH' } as never))
        .rejects.toMatchObject({ code: 'account_sync_outbox_invalid_input' });
    });
  });
});

describe('Account V2 client: отказ сервера по времени — возвратный карантин', () => {
  test('operation_expired → sync_operation_expired, time_in_future → sync_operation_time_in_future, остальное — ack', async () => {
    const { adapter, outbox } = await harness();
    for (const id of ['op-old', 'op-ahead', 'op-ok']) await outbox.enqueue(op(id), fenceA);
    const loaded = await outbox.load(loadEffect());
    const receiptFor = (id: string): AccountSyncServerReceipt => (id === 'op-old' ? rejected(id, 'operation_expired')
      : id === 'op-ahead' ? rejected(id, 'operation_time_in_future') : applied(id));
    const result = await quietly(() => outbox.ackCommit(ackEffect(loaded, receiptFor)));
    expect(result).toEqual({ committedOperationIds: ['op-old', 'op-ahead', 'op-ok'], remainingPendingCountObserved: 0 });
    expect(storedValue(adapter, quarantineKey('op-old'))).toMatchObject({
      code: 'sync_operation_expired', enqueuedAtMs: REAL_NOW, enqueuedLocalAtMs: REAL_NOW,
    });
    expect(storedValue(adapter, quarantineKey('op-ahead'))).toMatchObject({ code: 'sync_operation_time_in_future' });
    expect(storedValue(adapter, ackKey('op-old'))).toBeUndefined();
    expect(storedValue(adapter, ackKey('op-ok'))).toMatchObject({ resolved: true });
    expect(storedValue(adapter, pendingKey('op-old'))).toBeUndefined();
    // Слою разрешения конфликтов решать нечего.
    expect(await outbox.listUnresolved(fenceA)).toEqual([]);
  });

  test('повтор ackCommit после потерянного ответа — тот же итог, без записей', async () => {
    const { adapter, outbox } = await harness();
    await outbox.enqueue(op('op-old'), fenceA);
    await outbox.enqueue(op('op-ok'), fenceA);
    const loaded = await outbox.load(loadEffect());
    const effect = ackEffect(loaded, (id) => (id === 'op-old' ? rejected(id, 'operation_expired') : applied(id)));
    await quietly(() => outbox.ackCommit(effect));
    const before = adapter.snapshot(scopeA.scopeKey);
    expect(await quietly(() => outbox.ackCommit(effect)))
      .toEqual({ committedOperationIds: ['op-old', 'op-ok'], remainingPendingCountObserved: 0 });
    expect(adapter.snapshot(scopeA.scopeKey)).toEqual(before);
  });

  test('повтор с ДРУГИМ исходом для уже ушедшей в карантин операции — конфликт', async () => {
    const { outbox } = await harness();
    await outbox.enqueue(op('op-old'), fenceA);
    const loaded = await outbox.load(loadEffect());
    await quietly(() => outbox.ackCommit(ackEffect(loaded, (id) => rejected(id, 'operation_expired'))));
    await quietly(async () => {
      await expect(outbox.ackCommit(ackEffect(loaded, (id) => rejected(id, 'operation_time_in_future'))))
        .rejects.toMatchObject({ code: 'account_sync_outbox_conflict' });
      await expect(outbox.ackCommit(ackEffect(loaded, applied)))
        .rejects.toMatchObject({ code: 'account_sync_outbox_conflict' });
    });
  });

  test('requeue «время из будущего»: время постановки прежнее, пауза перед отправкой, оценка теперь верна', async () => {
    const { adapter, outbox } = await harness();
    await outbox.enqueue(op('op-ahead'), fenceA);
    const loaded = await outbox.load(loadEffect());
    await quietly(() => outbox.ackCommit(ackEffect(loaded, (id) => rejected(id, 'operation_time_in_future'))));
    // Ответ с отказом принёс serverNowMs: телефон спешит на час.
    await setOffset(outbox, -HOUR_MS);
    await quietly(async () => {
      expect(await outbox.requeue(fenceA, ['op-ahead'])).toEqual({ requeuedOperationIds: ['op-ahead'], pendingCount: 1 });
    });
    expect(storedValue(adapter, pendingKey('op-ahead'))).toMatchObject({ enqueuedAtMs: REAL_NOW, enqueuedLocalAtMs: REAL_NOW });
    // Ремонт №1, P3: пауза даёт часам/смещению устояться — без неё возврат мог бы крутиться по кругу.
    expect((await outbox.readDispatchState(fenceA)).notBeforeMs).toBeGreaterThan(REAL_NOW);
    await quietly(async () => {
      expect(await stamps(outbox)).toEqual({ 'op-ahead': REAL_NOW - HOUR_MS });
    });
  });

  test('порт отправки получает ТОЛЬКО пакет провода (с оценками), а не голый пакет эффекта', async () => {
    const { outbox } = await harness();
    await outbox.enqueue(op('op-a'), fenceA);
    const sent: unknown[] = [];
    const runner = createAccountSyncRunner(UID, fenceA, 1, {
      load: outbox.load,
      dispatch: createAccountSyncDispatchPort(outbox.wireBatch, (batch) => {
        sent.push(batch);
        return { outcome: 'accepted', receipts: batch.operations.map(({ operation }) => applied(operation.operationId)) };
      }),
      ackCommit: outbox.ackCommit,
    }, (expected) => sameSessionFence(expected, fenceA));
    await quietly(() => runner.runOneBatch());
    expect(sent).toHaveLength(1);
    expect(sent[0]).toEqual({
      batchId: expect.any(String), operations: [{ ...op('op-a'), enqueuedAtServerMs: REAL_NOW }],
    });
  });

  test('раннер: отказ по времени не уходит слою разрешения, прочий rejected — уходит', async () => {
    const { outbox } = await harness();
    await outbox.enqueue(op('op-old'), fenceA);
    await outbox.enqueue(op('op-bad'), fenceA);
    const runner = createAccountSyncRunner(UID, fenceA, 2, {
      load: outbox.load,
      dispatch: async (effect: Extract<AccountSyncEffect, { type: 'DISPATCH_OUTBOX_BATCH' }>) => {
        const wire = await outbox.wireBatch(effect);
        expect(wire.operations.map((row) => row.enqueuedAtServerMs)).toEqual([REAL_NOW, REAL_NOW]);
        return {
          outcome: 'accepted',
          receipts: effect.batch.operations.map(({ operation }) => (operation.operationId === 'op-old'
            ? rejected(operation.operationId, 'operation_expired')
            : { operationId: operation.operationId, outcome: 'rejected', code: 'payload_invalid', serverRevision: 1 })),
        };
      },
      ackCommit: outbox.ackCommit,
    }, (expected) => sameSessionFence(expected, fenceA));
    const result = await quietly(() => runner.runOneBatch());
    expect(result.resolutions.map(({ receipt }) => receipt.operationId)).toEqual(['op-bad']);
    expect((await outbox.listUnresolved(fenceA)).map(({ operation }) => operation.operation.operationId)).toEqual(['op-bad']);
  });
});
