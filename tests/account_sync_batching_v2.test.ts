import type { AccountScope, SessionFence } from '../modules/account-session-v2/account_session';
import { createAccountScopeStore } from '../modules/account-session-v2/account_scope_store';
import type {
  AccountSyncEffect,
  AccountSyncOwnedOperation,
  AccountSyncServerReceipt,
} from '../modules/account-session-v2/account_sync';
import {
  ACCOUNT_SYNC_OPERATION_MAX_AGE_MS,
  createAccountSyncOutbox,
  type AccountSyncOutbox,
  type AccountSyncOutboxLoadResult,
} from '../modules/account-session-v2/account_sync_outbox';
import { MemoryScopeStorageAdapter } from '../modules/account-session-v2/testing/memory_scope_storage';

/*
 * Account V2 (TG-831C22D22486) — формирование пакета по TEMP-контракту (а), (д):
 * операции одной сущности — в одном пакете, пока помещаются; порядок по сущности
 * сохраняется; baseRevision ожидающих операций не переписывается никогда;
 * срок жизни операции в outbox < 180 суток (TTL квитанций сервера).
 */

const UID = 'uid/batching';
const PREFIX = '__account_sync_outbox_v2__:';
const DAY_MS = 24 * 60 * 60 * 1000;
const fenceA: SessionFence = Object.freeze({
  scopeKey: `account:${UID}`, uid: UID, generation: 1, nonce: 'nonce-b',
});

function op(
  operationId: string,
  entityId: string,
  payload: unknown = { value: operationId },
  baseRevision: number | null = 3,
  entityType: AccountSyncOwnedOperation['operation']['entityType'] = 'flashcard',
): AccountSyncOwnedOperation {
  return {
    ownerUid: UID,
    operation: {
      schemaVersion: 1, operationId, entityType, entityId, clientSequence: 1, baseRevision, payload,
    },
  };
}

function loadEffect(attemptEpoch = 1): Extract<AccountSyncEffect, { type: 'LOAD_OUTBOX_BATCH' }> {
  return Object.freeze({
    type: 'LOAD_OUTBOX_BATCH', ownerUid: UID, expectedFence: fenceA, attemptEpoch,
    maxOperations: 50, maxBatchUtf8Bytes: 524288,
  });
}

function ackEffect(
  loaded: AccountSyncOutboxLoadResult,
  receiptFor: (operationId: string) => AccountSyncServerReceipt = (operationId) => ({
    operationId, outcome: 'applied', serverRevision: 99,
  }),
): Extract<AccountSyncEffect, { type: 'COMMIT_OUTBOX_ACKS' }> {
  return Object.freeze({
    type: 'COMMIT_OUTBOX_ACKS', ownerUid: UID, expectedFence: fenceA, attemptEpoch: 3,
    batch: Object.freeze({ batchId: loaded.batchId, operations: loaded.operations }),
    receipts: Object.freeze(loaded.operations.map(({ operation }) => receiptFor(operation.operationId))),
  });
}

async function harness(nowMs?: () => number): Promise<{
  adapter: MemoryScopeStorageAdapter;
  scope: Extract<AccountScope, { kind: 'account' }>;
  outbox: AccountSyncOutbox;
}> {
  const adapter = new MemoryScopeStorageAdapter();
  const store = createAccountScopeStore(adapter);
  const scope: Extract<AccountScope, { kind: 'account' }> = { kind: 'account', uid: UID, scopeKey: `account:${UID}` };
  const handle = await store.open(scope, fenceA);
  return { adapter, scope, outbox: createAccountSyncOutbox(handle, nowMs === undefined ? undefined : { nowMs }) };
}

const ids = (loaded: AccountSyncOutboxLoadResult): string[] => loaded.operations.map(({ operation }) => operation.operationId);

describe('account sync v2 batching keeps one entity in one batch', () => {
  test('pulls a later operation of an included entity into the same batch, in entity order', async () => {
    const { adapter, scope, outbox } = await harness();
    await outbox.enqueue(op('x-1', 'card/X'), fenceA);
    for (let index = 1; index <= 60; index += 1) {
      await outbox.enqueue(op(`o-${index}`, `card/o-${index}`), fenceA);
    }
    await outbox.enqueue(op('x-2', 'card/X'), fenceA);

    const first = await outbox.load(loadEffect());
    expect(first.operations).toHaveLength(50);
    expect(first.pendingCount).toBe(62);
    const firstIds = ids(first);
    expect(firstIds[0]).toBe('x-1');
    expect(firstIds[firstIds.length - 1]).toBe('x-2');
    expect(firstIds).toContain('o-48');
    expect(firstIds).not.toContain('o-49');
    expect(first.batchId).toMatch(/^sync-v2:0:61:n50:h[0-9a-f]{8}$/);

    expect(await outbox.ackCommit(ackEffect(first))).toMatchObject({ remainingPendingCountObserved: 12 });
    expect(await outbox.enqueue(op('x-2', 'card/X'), fenceA)).toMatchObject({ outcome: 'already_acknowledged' });
    expect(await outbox.enqueue(op('late', 'card/late'), fenceA)).toMatchObject({ outcome: 'enqueued', pendingCount: 13 });

    const second = await outbox.load(loadEffect(4));
    expect(ids(second)).toEqual([...Array.from({ length: 12 }, (_, index) => `o-${index + 49}`), 'late']);
    expect(second.batchId).toMatch(/^sync-v2:49:62:n13:h[0-9a-f]{8}$/);
    expect(await outbox.ackCommit(ackEffect(second))).toMatchObject({ remainingPendingCountObserved: 0 });
    expect(await outbox.enqueue(op('x-2', 'card/X'), fenceA)).toMatchObject({ outcome: 'already_acknowledged' });

    const rows = adapter.snapshot(scope.scopeKey).filter(({ key }) => key.startsWith(PREFIX));
    expect(rows.filter(({ key }) => key.startsWith(`${PREFIX}slot:`))).toEqual([]);
    expect(rows.filter(({ key }) => key.startsWith(`${PREFIX}pending:`))).toEqual([]);
    expect(rows.find(({ key }) => key === `${PREFIX}meta`)?.value)
      .toMatchObject({ head: 63, next: 63, pendingCount: 0 });
  });

  test('does not split a non-head entity that does not fit; the head entity takes its prefix', async () => {
    const { outbox } = await harness();
    const big = (index: number): unknown => ({ blob: `${index}`.padEnd(100_000, 'z') });
    await outbox.enqueue(op('a', 'card/A'), fenceA);
    await outbox.enqueue(op('z-1', 'card/Z', big(1)), fenceA);
    await outbox.enqueue(op('b', 'card/B'), fenceA);
    for (let index = 2; index <= 6; index += 1) await outbox.enqueue(op(`z-${index}`, 'card/Z', big(index)), fenceA);

    const first = await outbox.load(loadEffect());
    expect(ids(first)).toEqual(['a', 'b']);
    await outbox.ackCommit(ackEffect(first));
    const second = await outbox.load(loadEffect(4));
    expect(ids(second)).toEqual(['z-1', 'z-2', 'z-3', 'z-4', 'z-5']);
    await outbox.ackCommit(ackEffect(second));
    expect(ids(await outbox.load(loadEffect(6)))).toEqual(['z-6']);
  });

  test('never rewrites baseRevision of pending operations, whatever the receipts say', async () => {
    const { outbox } = await harness();
    const x1 = op('x-1', 'card/X', { op: 'upsert', fields: { f: 1 } }, 3);
    await outbox.enqueue(x1, fenceA);
    const loaded = await outbox.load(loadEffect());
    const x2 = op('x-2', 'card/X', { op: 'upsert', fields: { f: 2 } }, 3);
    await outbox.enqueue(x2, fenceA);
    await outbox.ackCommit(ackEffect(loaded, (operationId) => ({ operationId, outcome: 'conflict', serverRevision: 57 })));
    const next = await outbox.load(loadEffect(4));
    expect(next.operations).toEqual([x2]);
    expect(next.operations[0].operation.baseRevision).toBe(3);
    expect(await outbox.load(loadEffect(5))).toEqual(next);
  });

  test('library payload with removeItemIds round-trips unchanged like itemIds', async () => {
    const { outbox } = await harness();
    const add = op('lib-add', 'lib/main', { itemIds: ['a', 'b'] }, null, 'library_membership');
    const remove = op('lib-remove', 'lib/main', { removeItemIds: ['a'] }, 4, 'library_membership');
    await outbox.enqueue(add, fenceA);
    await outbox.enqueue(remove, fenceA);
    expect((await outbox.load(loadEffect())).operations).toEqual([add, remove]);
  });
});

describe('account sync v2 outbox lifetime is below the server receipt TTL', () => {
  test('the limit is below 180 days', () => {
    expect(ACCOUNT_SYNC_OPERATION_MAX_AGE_MS).toBeLessThan(180 * DAY_MS);
    expect(ACCOUNT_SYNC_OPERATION_MAX_AGE_MS).toBeGreaterThan(30 * DAY_MS);
  });

  test('operations older than the limit go to quarantine with sync_operation_expired', async () => {
    let now = 1_700_000_000_000;
    const { adapter, scope, outbox } = await harness(() => now);
    await outbox.enqueue(op('old', 'card/old'), fenceA);
    now += DAY_MS;
    await outbox.enqueue(op('young', 'card/young'), fenceA);
    now += ACCOUNT_SYNC_OPERATION_MAX_AGE_MS - DAY_MS;
    expect(ids(await outbox.load(loadEffect()))).toEqual(['old', 'young']);
    now += 1;
    const loaded = await outbox.load(loadEffect(2));
    expect(ids(loaded)).toEqual(['young']);
    expect(loaded.pendingCount).toBe(1);
    const quarantine = adapter.snapshot(scope.scopeKey)
      .find(({ key }) => key === `${PREFIX}quarantine:${JSON.stringify('old')}`);
    expect(quarantine?.value).toMatchObject({ code: 'sync_operation_expired', sequence: 0 });
    expect(await outbox.enqueue(op('old', 'card/old'), fenceA)).toMatchObject({ outcome: 'quarantined' });
    now += DAY_MS;
    const empty = await outbox.load(loadEffect(3));
    expect(empty).toMatchObject({ operations: [], pendingCount: 0 });
  });
});
