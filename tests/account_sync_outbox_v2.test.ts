import { sameSessionFence, type AccountScope, type SessionFence } from '../modules/account-session-v2/account_session';
import {
  createAccountScopeStore,
  type AccountScopeHandle,
  type ScopeJson,
} from '../modules/account-session-v2/account_scope_store';
import type {
  AccountSyncEffect,
  AccountSyncOwnedOperation,
  AccountSyncReceipt,
} from '../modules/account-session-v2/account_sync';
import { createAccountSyncRunner } from '../modules/account-session-v2/account_sync_runner';
import {
  AccountSyncOutboxError,
  createAccountSyncOutbox,
  type AccountSyncLocalMutationTransaction,
  type AccountSyncOutbox,
  type AccountSyncOutboxLoadResult,
} from '../modules/account-session-v2/account_sync_outbox';
import { MemoryScopeStorageAdapter } from '../modules/account-session-v2/testing/memory_scope_storage';

const PREFIX = '__account_sync_outbox_v2__:';
const META_KEY = `${PREFIX}meta`;

function account(uid: string): Extract<AccountScope, { kind: 'account' }> {
  return { kind: 'account', uid, scopeKey: `account:${uid}` };
}

function fence(scope: Extract<AccountScope, { kind: 'account' }>, generation: number): SessionFence {
  return Object.freeze({
    scopeKey: scope.scopeKey, uid: scope.uid, generation, nonce: `nonce-${generation}`,
  });
}

function operation(
  ownerUid: string,
  operationId: string,
  payload: unknown = { value: operationId },
): AccountSyncOwnedOperation {
  return {
    ownerUid,
    operation: {
      schemaVersion: 1,
      operationId,
      entityType: 'lesson_progress',
      entityId: `entity/${operationId}`,
      clientSequence: 1,
      baseRevision: null,
      payload,
    },
  };
}

function loadEffect(expectedFence: SessionFence, attemptEpoch = 1): Extract<
  AccountSyncEffect,
  { type: 'LOAD_OUTBOX_BATCH' }
> {
  return Object.freeze({
    type: 'LOAD_OUTBOX_BATCH', ownerUid: expectedFence.uid as string,
    expectedFence, attemptEpoch, maxOperations: 50, maxBatchUtf8Bytes: 524288,
  });
}

function receipt(operationId: string, serverRevision = 1): AccountSyncReceipt {
  return Object.freeze({ operationId, outcome: 'applied', serverRevision });
}

function ackEffect(
  expectedFence: SessionFence,
  loaded: AccountSyncOutboxLoadResult,
  receipts = loaded.operations.map(({ operation: value }) => receipt(value.operationId)),
  attemptEpoch = 3,
): Extract<AccountSyncEffect, { type: 'COMMIT_OUTBOX_ACKS' }> {
  return Object.freeze({
    type: 'COMMIT_OUTBOX_ACKS', ownerUid: expectedFence.uid as string,
    expectedFence, attemptEpoch,
    batch: Object.freeze({ batchId: loaded.batchId, operations: loaded.operations }),
    receipts: Object.freeze(receipts),
  });
}

async function harness(uid = 'uid/a-юзер', generation = 1): Promise<{
  adapter: MemoryScopeStorageAdapter;
  store: ReturnType<typeof createAccountScopeStore>;
  scope: Extract<AccountScope, { kind: 'account' }>;
  currentFence: SessionFence;
  handle: AccountScopeHandle;
  outbox: AccountSyncOutbox;
}> {
  const adapter = new MemoryScopeStorageAdapter();
  const store = createAccountScopeStore(adapter);
  const scope = account(uid);
  const currentFence = fence(scope, generation);
  const handle = await store.open(scope, currentFence);
  return {
    adapter, store, scope, currentFence, handle,
    outbox: createAccountSyncOutbox(handle),
  };
}

async function expectOutboxCode(
  operationUnderTest: () => Promise<unknown>,
  code: AccountSyncOutboxError['code'],
): Promise<void> {
  try {
    await operationUnderTest();
  } catch (error) {
    expect(error).toBeInstanceOf(AccountSyncOutboxError);
    expect((error as AccountSyncOutboxError).code).toBe(code);
    expect(Object.isFrozen(error)).toBe(true);
    expect(Reflect.ownKeys(error as object).sort()).toEqual(['code', 'message', 'name']);
    return;
  }
  throw new Error(`Expected ${code}`);
}

describe('account sync outbox v2 end-to-end queue', () => {
  test('enqueues, loads and acknowledges through the existing sync runner', async () => {
    const { currentFence, outbox } = await harness();
    await outbox.enqueue(operation('uid/a-юзер', 'operation-1'), currentFence);
    await outbox.enqueue(operation('uid/a-юзер', 'operation-2'), currentFence);
    const runner = createAccountSyncRunner('uid/a-юзер', currentFence, 2, {
      load: outbox.load,
      dispatch: async (effect) => ({
        outcome: 'accepted',
        receipts: effect.batch.operations.map(({ operation: value }, index) => ({
          operationId: value.operationId,
          outcome: 'applied' as const,
          serverRevision: index + 10,
        })),
      }),
      ackCommit: outbox.ackCommit,
    }, (expectedFence) => sameSessionFence(expectedFence, currentFence));

    const result = await runner.runOneBatch();

    expect(result.state).toMatchObject({ pendingCount: 0, phase: { tag: 'idle' } });
    expect(result.confirmations).toHaveLength(1);
    expect(result.confirmations[0].confirmedOperationIds).toEqual([
      'operation-1', 'operation-2',
    ]);
    expect((await outbox.load(loadEffect(currentFence))).operations).toEqual([]);
  });

  test('preserves unknown JSON code units, own __proto__, and semantic object equality', async () => {
    const { currentFence, outbox } = await harness();
    const firstPayload = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(firstPayload, '__proto__', {
      value: 'literal-\uD800', enumerable: true, writable: true, configurable: true,
    });
    Object.defineProperty(firstPayload, 'nested', {
      value: { alpha: 1, beta: [true, null] },
      enumerable: true, writable: true, configurable: true,
    });
    const reorderedPayload = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(reorderedPayload, 'nested', {
      value: { beta: [true, null], alpha: 1 },
      enumerable: true, writable: true, configurable: true,
    });
    Object.defineProperty(reorderedPayload, '__proto__', {
      value: 'literal-\uD800', enumerable: true, writable: true, configurable: true,
    });
    expect(await outbox.enqueue(
      operation('uid/a-юзер', 'opaque', firstPayload), currentFence,
    )).toMatchObject({ outcome: 'enqueued' });
    expect(await outbox.enqueue(
      operation('uid/a-юзер', 'opaque', reorderedPayload), currentFence,
    )).toMatchObject({ outcome: 'duplicate' });
    const loaded = await outbox.load(loadEffect(currentFence));
    const payload = loaded.operations[0].operation.payload as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(payload, '__proto__')).toBe(true);
    expect(payload.__proto__).toBe('literal-\uD800');
    expect(payload.nested).toEqual({ alpha: 1, beta: [true, null] });
    expect(Object.isFrozen(payload)).toBe(true);
  });

  test('returns duplicate, conflict and already-acknowledged outcomes without extra rows', async () => {
    const { adapter, currentFence, outbox, scope } = await harness();
    const first = operation('uid/a-юзер', 'same', { a: 1, b: 2 });
    expect(await outbox.enqueue(first, currentFence)).toMatchObject({ outcome: 'enqueued' });
    expect(await outbox.enqueue(
      operation('uid/a-юзер', 'same', { b: 2, a: 1 }), currentFence,
    )).toMatchObject({ outcome: 'duplicate', pendingCount: 1 });
    await expectOutboxCode(
      () => outbox.enqueue(operation('uid/a-юзер', 'same', { a: 9 }), currentFence),
      'account_sync_outbox_conflict',
    );
    const loaded = await outbox.load(loadEffect(currentFence));
    await outbox.ackCommit(ackEffect(currentFence, loaded));
    expect(await outbox.enqueue(first, currentFence)).toMatchObject({
      outcome: 'already_acknowledged', pendingCount: 0,
    });
    await expectOutboxCode(
      () => outbox.enqueue(operation('uid/a-юзер', 'same', { a: 10 }), currentFence),
      'account_sync_outbox_conflict',
    );
    expect(adapter.snapshot(scope.scopeKey).filter(({ key }) => key.startsWith(PREFIX))).toHaveLength(2);
  });

  test('keeps concurrent enqueue after load when the earlier batch commits', async () => {
    const { currentFence, outbox } = await harness();
    await outbox.enqueue(operation('uid/a-юзер', 'first'), currentFence);
    const loaded = await outbox.load(loadEffect(currentFence));
    await outbox.enqueue(operation('uid/a-юзер', 'concurrent'), currentFence);
    const committed = await outbox.ackCommit(ackEffect(currentFence, loaded));
    expect(committed).toEqual({
      committedOperationIds: ['first'], remainingPendingCountObserved: 1,
    });
    const remaining = await outbox.load(loadEffect(currentFence, 4));
    expect(remaining.operations.map(({ operation: value }) => value.operationId))
      .toEqual(['concurrent']);
  });

  test('supports overlapping loads and an identical ACK after a lost response', async () => {
    const { currentFence, outbox } = await harness();
    await outbox.enqueue(operation('uid/a-юзер', 'first'), currentFence);
    await outbox.enqueue(operation('uid/a-юзер', 'second'), currentFence);
    const firstLoad = await outbox.load(loadEffect(currentFence));
    const overlappingLoad = await outbox.load(loadEffect(currentFence, 2));
    expect(overlappingLoad).toEqual(firstLoad);
    const effect = ackEffect(currentFence, firstLoad);
    expect(await outbox.ackCommit(effect)).toMatchObject({ remainingPendingCountObserved: 0 });
    expect(await outbox.ackCommit(effect)).toEqual({
      committedOperationIds: ['first', 'second'], remainingPendingCountObserved: 0,
    });
  });

  test('rejects acknowledged evidence whose receipt names another operation', async () => {
    const { adapter, currentFence, handle, outbox, scope } = await harness();
    const owned = operation('uid/a-юзер', 'receipt-binding');
    await outbox.enqueue(owned, currentFence);
    const loaded = await outbox.load(loadEffect(currentFence));
    await outbox.ackCommit(ackEffect(currentFence, loaded));
    const ackKey = `${PREFIX}ack:${JSON.stringify('receipt-binding')}`;
    await handle.withTransaction(async (transaction) => {
      const existing = await transaction.readRecord(ackKey);
      expect(existing).not.toBeNull();
      if (existing === null) throw new Error('expected stored acknowledgement');
      const stored = existing.value as Record<string, ScopeJson>;
      await transaction.putRecord({ key: ackKey, value: {
        ...stored,
        receipt: {
          ...(stored.receipt as Readonly<Record<string, ScopeJson>>),
          operationId: 'different-operation',
        },
      } });
    });
    const corrupted = adapter.snapshot(scope.scopeKey);
    await expectOutboxCode(
      () => outbox.enqueue(owned, currentFence), 'account_sync_outbox_corrupt',
    );
    expect(adapter.snapshot(scope.scopeKey)).toEqual(corrupted);
  });

  test.each([
    ['enqueue', 'pending'], ['enqueue', 'slot'],
    ['ackCommit', 'pending'], ['ackCommit', 'slot'],
  ] as const)(
    'rejects stored ACK coexistence through %s with a retired %s row',
    async (api, coexistence) => {
      const { adapter, currentFence, handle, outbox, scope } = await harness();
      const owned = operation('uid/a-юзер', 'coexistence');
      await outbox.enqueue(owned, currentFence);
      const loaded = await outbox.load(loadEffect(currentFence));
      const effect = ackEffect(currentFence, loaded);
      await outbox.ackCommit(effect);
      await handle.withTransaction(async (transaction) => {
        if (coexistence === 'pending') {
          await transaction.putRecord({
            key: `${PREFIX}pending:${JSON.stringify('coexistence')}`,
            value: {
              kind: 'account_sync_outbox_pending', version: 1,
              ownerUid: 'uid/a-юзер', sequence: 0,
              envelope: loaded.operations[0] as unknown as ScopeJson,
            },
          });
        } else {
          await transaction.putRecord({
            key: `${PREFIX}slot:0`,
            value: {
              kind: 'account_sync_outbox_slot', version: 1,
              ownerUid: 'uid/a-юзер', sequence: 0, operationId: 'coexistence',
            },
          });
        }
      });
      const corrupted = adapter.snapshot(scope.scopeKey);
      await expectOutboxCode(
        () => api === 'enqueue'
          ? outbox.enqueue(owned, currentFence)
          : outbox.ackCommit(effect),
        'account_sync_outbox_corrupt',
      );
      expect(adapter.snapshot(scope.scopeKey)).toEqual(corrupted);
    },
  );
});

describe('account sync outbox v2 bounded FIFO and atomic failure', () => {
  test('loads fifty operations then the remaining one without scanning the whole queue', async () => {
    const { currentFence, outbox } = await harness();
    for (let index = 0; index < 51; index += 1) {
      await outbox.enqueue(operation('uid/a-юзер', `operation-${index}`), currentFence);
    }
    const first = await outbox.load(loadEffect(currentFence));
    expect(first.batchId).toBe('sync-v2:0:49');
    expect(first.operations).toHaveLength(50);
    expect(first.pendingCount).toBe(51);
    await outbox.ackCommit(ackEffect(currentFence, first));
    const second = await outbox.load(loadEffect(currentFence, 4));
    expect(second.batchId).toBe('sync-v2:50:50');
    expect(second.operations.map(({ operation: value }) => value.operationId))
      .toEqual(['operation-50']);
  });

  test('stops at the exact batch-byte prefix without dropping later pending work', async () => {
    const { currentFence, outbox } = await harness();
    for (let index = 0; index < 5; index += 1) {
      await outbox.enqueue(operation(
        'uid/a-юзер', `large-${index}`, { content: 'x'.repeat(120_000) },
      ), currentFence);
    }
    const first = await outbox.load(loadEffect(currentFence));
    expect(first.operations).toHaveLength(4);
    expect(first.pendingCount).toBe(5);
    await outbox.ackCommit(ackEffect(currentFence, first));
    const second = await outbox.load(loadEffect(currentFence, 4));
    expect(second.operations.map(({ operation: value }) => value.operationId))
      .toEqual(['large-4']);
  });

  test('rolls back every staged row when transaction publication fails', async () => {
    const { adapter, currentFence, outbox, scope } = await harness();
    adapter.failNext('transaction', scope.scopeKey, 'private transaction failure');
    await expectOutboxCode(
      () => outbox.enqueue(operation('uid/a-юзер', 'rolled-back'), currentFence),
      'account_sync_outbox_transaction_failed',
    );
    expect(adapter.snapshot(scope.scopeKey)).toEqual([]);
  });

  test('revocation during before_publish prevents staged queue publication', async () => {
    const { adapter, store, currentFence, outbox, scope } = await harness();
    const hold = adapter.holdNext('before_publish');
    const enqueueing = outbox.enqueue(operation('uid/a-юзер', 'stale-write'), currentFence);
    await hold.entered;
    const closing = store.close(currentFence);
    hold.release();
    await expectOutboxCode(() => enqueueing, 'account_sync_outbox_stale');
    await closing;
    expect(adapter.snapshot(scope.scopeKey)).toEqual([]);
  });

  test('rejects receipt mismatch after a committed response without altering evidence', async () => {
    const { adapter, currentFence, outbox, scope } = await harness();
    await outbox.enqueue(operation('uid/a-юзер', 'revision'), currentFence);
    const loaded = await outbox.load(loadEffect(currentFence));
    await outbox.ackCommit(ackEffect(currentFence, loaded, [receipt('revision', 7)]));
    const before = adapter.snapshot(scope.scopeKey);
    await expectOutboxCode(
      () => outbox.ackCommit(ackEffect(currentFence, loaded, [receipt('revision', 8)])),
      'account_sync_outbox_conflict',
    );
    expect(adapter.snapshot(scope.scopeKey)).toEqual(before);
  });
});

describe('account sync outbox v2 atomic local mutation seam', () => {
  test('commits the domain record and new operation in one transaction', async () => {
    const { currentFence, handle, outbox } = await harness();
    const result = await outbox.applyLocalMutation(
      operation('uid/a-юзер', 'atomic-success'),
      currentFence,
      async (transaction) => {
        await transaction.putRecord({ key: 'domain:lesson:1', value: { progress: 3 } });
      },
    );
    expect(result).toEqual({ outcome: 'enqueued', pendingCount: 1 });
    expect(await handle.readRecord('domain:lesson:1')).toEqual({
      key: 'domain:lesson:1', value: { progress: 3 },
    });
    expect((await outbox.load(loadEffect(currentFence))).operations
      .map(({ operation: value }) => value.operationId)).toEqual(['atomic-success']);
  });

  test('rolls back domain and outbox writes when the callback fails', async () => {
    const { adapter, currentFence, outbox, scope } = await harness();
    await expectOutboxCode(
      () => outbox.applyLocalMutation(
        operation('uid/a-юзер', 'atomic-failure'),
        currentFence,
        async (transaction) => {
          await transaction.putRecord({ key: 'domain:must-rollback', value: { value: 1 } });
          throw new Error('private callback failure');
        },
      ),
      'account_sync_outbox_transaction_failed',
    );
    expect(adapter.snapshot(scope.scopeKey)).toEqual([]);
  });

  test('does not replay local mutation for pending duplicate or acknowledged retry', async () => {
    const { currentFence, handle, outbox } = await harness();
    const owned = operation('uid/a-юзер', 'no-replay');
    let callbackCalls = 0;
    const mutate = async (
      transaction: AccountSyncLocalMutationTransaction,
    ): Promise<void> => {
      callbackCalls += 1;
      await transaction.putRecord({
        key: 'domain:no-replay', value: { callbackCalls },
      });
    };
    expect(await outbox.applyLocalMutation(owned, currentFence, mutate))
      .toMatchObject({ outcome: 'enqueued' });
    expect(await outbox.applyLocalMutation(owned, currentFence, mutate))
      .toMatchObject({ outcome: 'duplicate' });
    expect(callbackCalls).toBe(1);
    const loaded = await outbox.load(loadEffect(currentFence));
    await outbox.ackCommit(ackEffect(currentFence, loaded));
    expect(await outbox.applyLocalMutation(owned, currentFence, mutate))
      .toMatchObject({ outcome: 'already_acknowledged' });
    expect(callbackCalls).toBe(1);
    expect(await handle.readRecord('domain:no-replay')).toEqual({
      key: 'domain:no-replay', value: { callbackCalls: 1 },
    });
  });

  test('rejects conflicting envelope before invoking or writing the callback', async () => {
    const { adapter, currentFence, outbox, scope } = await harness();
    await outbox.enqueue(operation('uid/a-юзер', 'conflict-local', { value: 1 }), currentFence);
    const before = adapter.snapshot(scope.scopeKey);
    let callbackCalls = 0;
    await expectOutboxCode(
      () => outbox.applyLocalMutation(
        operation('uid/a-юзер', 'conflict-local', { value: 2 }),
        currentFence,
        async (transaction) => {
          callbackCalls += 1;
          await transaction.putRecord({ key: 'domain:must-not-write', value: true });
        },
      ),
      'account_sync_outbox_conflict',
    );
    expect(callbackCalls).toBe(0);
    expect(adapter.snapshot(scope.scopeKey)).toEqual(before);
  });

  test.each(['read', 'put', 'delete'] as const)(
    'rejects caught reserved namespace %s access and rolls back',
    async (action) => {
      const { adapter, currentFence, outbox, scope } = await harness();
      await expectOutboxCode(
        () => outbox.applyLocalMutation(
          operation('uid/a-юзер', `reserved-${action}`),
          currentFence,
          async (transaction) => {
            await transaction.putRecord({ key: 'domain:before-reserved', value: action });
            try {
              if (action === 'read') await transaction.readRecord(META_KEY);
              else if (action === 'put') {
                await transaction.putRecord({ key: META_KEY, value: { forged: true } });
              } else await transaction.deleteRecord(META_KEY);
            } catch {
              // A caller cannot make a reserved-key violation committable by catching it.
            }
          },
        ),
        'account_sync_outbox_reserved_key',
      );
      expect(adapter.snapshot(scope.scopeKey)).toEqual([]);
    },
  );

  test('rejects an unawaited invalid local write and rolls back earlier work', async () => {
    const { adapter, currentFence, outbox, scope } = await harness();
    const accessorValue = Object.defineProperty({}, 'secret', {
      enumerable: true,
      get() { throw new Error('private accessor'); },
    });
    await expectOutboxCode(
      () => outbox.applyLocalMutation(
        operation('uid/a-юзер', 'unawaited-invalid'),
        currentFence,
        async (transaction) => {
          await transaction.putRecord({ key: 'domain:before-invalid', value: true });
          void transaction.putRecord({
            key: 'domain:invalid', value: accessorValue as unknown as ScopeJson,
          }).catch(() => undefined);
        },
      ),
      'account_sync_outbox_transaction_failed',
    );
    expect(adapter.snapshot(scope.scopeKey)).toEqual([]);
  });

  test('revocation before publication rolls back domain and outbox staging', async () => {
    const { adapter, store, currentFence, outbox, scope } = await harness();
    const hold = adapter.holdNext('before_publish');
    const applying = outbox.applyLocalMutation(
      operation('uid/a-юзер', 'revoked-local'),
      currentFence,
      async (transaction) => {
        await transaction.putRecord({ key: 'domain:revoked', value: true });
      },
    );
    await hold.entered;
    const closing = store.close(currentFence);
    hold.release();
    await expectOutboxCode(() => applying, 'account_sync_outbox_stale');
    await closing;
    expect(adapter.snapshot(scope.scopeKey)).toEqual([]);
  });

  test('closes an escaped scoped transaction and preserves account isolation', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const store = createAccountScopeStore(adapter);
    const scopeA = account('uid-a');
    const fenceA = fence(scopeA, 1);
    const handleA = await store.open(scopeA, fenceA);
    const outboxA = createAccountSyncOutbox(handleA);
    let escaped!: AccountSyncLocalMutationTransaction;
    await outboxA.applyLocalMutation(operation('uid-a', 'a-local'), fenceA, async (transaction) => {
      escaped = transaction;
      await transaction.putRecord({ key: 'domain:owner', value: 'uid-a' });
    });
    await expectOutboxCode(
      () => escaped.putRecord({ key: 'domain:escaped', value: true }),
      'account_sync_outbox_transaction_closed',
    );
    expect(await handleA.readRecord('domain:escaped')).toBeNull();
    await store.close(fenceA);
    let staleCallbackCalls = 0;
    await expectOutboxCode(
      () => outboxA.applyLocalMutation(
        operation('uid-a', 'stale-local'), fenceA, async () => { staleCallbackCalls += 1; },
      ),
      'account_sync_outbox_stale',
    );
    expect(staleCallbackCalls).toBe(0);
    const fenceA2 = fence(scopeA, 2);
    const reopenedA = await store.open(scopeA, fenceA2);
    expect(await reopenedA.readRecord('domain:owner')).toEqual({
      key: 'domain:owner', value: 'uid-a',
    });
    await store.close(fenceA2);
    const scopeB = account('uid-b');
    const fenceB = fence(scopeB, 3);
    const handleB = await store.open(scopeB, fenceB);
    expect(await handleB.readRecord('domain:owner')).toBeNull();
    expect((await createAccountSyncOutbox(handleB).load(loadEffect(fenceB))).operations).toEqual([]);
  });

  test('closes a synchronous callback wrapper before its queued microtasks run', async () => {
    const { currentFence, handle, outbox } = await harness();
    let lateWrite!: Promise<void>;
    const result = await outbox.applyLocalMutation(
      operation('uid/a-юзер', 'synchronous-lifetime'),
      currentFence,
      (transaction) => {
        queueMicrotask(() => {
          lateWrite = transaction.putRecord({ key: 'domain:too-late', value: true });
          void lateWrite.catch(() => undefined);
        });
      },
    );
    expect(result).toEqual({ outcome: 'enqueued', pendingCount: 1 });
    await expectOutboxCode(
      () => lateWrite,
      'account_sync_outbox_transaction_closed',
    );
    expect(await handle.readRecord('domain:too-late')).toBeNull();
  });
});

describe('account sync outbox v2 identity and corruption boundaries', () => {
  test('rejects stale, wrong-owner and malformed enqueue before writes', async () => {
    const { adapter, currentFence, outbox, scope } = await harness();
    await expectOutboxCode(
      () => outbox.enqueue(operation('uid/a-юзер', 'stale'), {
        ...currentFence, generation: 2, nonce: 'new',
      }),
      'account_sync_outbox_stale',
    );
    await expectOutboxCode(
      () => outbox.enqueue(operation('uid/foreign', 'foreign'), currentFence),
      'account_sync_outbox_invalid_input',
    );
    const getterPayload = Object.defineProperty({}, 'secret', {
      enumerable: true,
      get() { throw new Error('private accessor'); },
    });
    await expectOutboxCode(
      () => outbox.enqueue(operation('uid/a-юзер', 'getter', getterPayload), currentFence),
      'account_sync_outbox_invalid_input',
    );
    expect(adapter.snapshot(scope.scopeKey)).toEqual([]);
  });

  test('rejects stale or wrong-owner effects without changing queued rows', async () => {
    const { adapter, currentFence, outbox, scope } = await harness();
    await outbox.enqueue(operation('uid/a-юзер', 'guarded'), currentFence);
    const before = adapter.snapshot(scope.scopeKey);
    await expectOutboxCode(
      () => outbox.load({
        ...loadEffect(currentFence),
        expectedFence: { ...currentFence, generation: 2, nonce: 'next' },
      }),
      'account_sync_outbox_stale',
    );
    await expectOutboxCode(
      () => outbox.load({ ...loadEffect(currentFence), ownerUid: 'uid/foreign' }),
      'account_sync_outbox_invalid_input',
    );
    const loaded = await outbox.load(loadEffect(currentFence));
    await expectOutboxCode(
      () => outbox.ackCommit({
        ...ackEffect(currentFence, loaded),
        expectedFence: { ...currentFence, generation: 9, nonce: 'stale-ack' },
      }),
      'account_sync_outbox_stale',
    );
    expect(adapter.snapshot(scope.scopeKey)).toEqual(before);
  });

  test('reuses durable rows only through the new same-UID fence and isolates account B', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const store = createAccountScopeStore(adapter);
    const scopeA = account('uid-a');
    const firstFence = fence(scopeA, 1);
    const firstHandle = await store.open(scopeA, firstFence);
    const firstOutbox = createAccountSyncOutbox(firstHandle);
    await firstOutbox.enqueue(operation('uid-a', 'a-operation'), firstFence);
    await store.close(firstFence);
    const secondFence = fence(scopeA, 2);
    const secondOutbox = createAccountSyncOutbox(await store.open(scopeA, secondFence));
    await expectOutboxCode(
      () => firstOutbox.load(loadEffect(firstFence)), 'account_sync_outbox_stale',
    );
    expect((await secondOutbox.load(loadEffect(secondFence))).operations).toHaveLength(1);
    await store.close(secondFence);
    const scopeB = account('uid-b');
    const fenceB = fence(scopeB, 3);
    const outboxB = createAccountSyncOutbox(await store.open(scopeB, fenceB));
    expect((await outboxB.load(loadEffect(fenceB))).operations).toEqual([]);
  });

  test.each(['extra_metadata', 'missing_slot', 'foreign_pending'] as const)(
    'fails closed on stored corruption: %s',
    async (kind) => {
      const { currentFence, handle, outbox } = await harness();
      if (kind === 'extra_metadata') {
        await handle.withTransaction(async (transaction) => {
          await transaction.putRecord({ key: META_KEY, value: {
            kind: 'account_sync_outbox_meta', version: 1, ownerUid: 'uid/a-юзер',
            head: 0, next: 0, pendingCount: 0, extra: true,
          } });
        });
      } else if (kind === 'missing_slot') {
        await handle.withTransaction(async (transaction) => {
          await transaction.putRecord({ key: META_KEY, value: {
            kind: 'account_sync_outbox_meta', version: 1, ownerUid: 'uid/a-юзер',
            head: 0, next: 1, pendingCount: 1,
          } });
        });
      } else {
        await outbox.enqueue(operation('uid/a-юзер', 'foreign-row'), currentFence);
        await handle.withTransaction(async (transaction) => {
          const key = `${PREFIX}pending:${JSON.stringify('foreign-row')}`;
          const existing = await transaction.readRecord(key);
          expect(existing).not.toBeNull();
          await transaction.putRecord({ key, value: {
            ...(existing?.value as Record<string, never>), ownerUid: 'uid/foreign',
          } });
        });
      }
      await expectOutboxCode(
        () => outbox.load(loadEffect(currentFence)), 'account_sync_outbox_corrupt',
      );
    },
  );
});
