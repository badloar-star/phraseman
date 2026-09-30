import { sameSessionFence, type AccountScope, type SessionFence } from '../modules/account-session-v2/account_session';
import { createAccountScopeStore, type ScopeJson } from '../modules/account-session-v2/account_scope_store';
import {
  ACCOUNT_SYNC_REJECT_CODES,
  createInitialAccountSyncState,
  reduceAccountSync,
  type AccountSyncOwnedOperation,
  type AccountSyncState,
} from '../modules/account-session-v2/account_sync';
import { createAccountSyncOutbox } from '../modules/account-session-v2/account_sync_outbox';
import { createAccountSyncRunner } from '../modules/account-session-v2/account_sync_runner';
import { MemoryScopeStorageAdapter } from '../modules/account-session-v2/testing/memory_scope_storage';

/*
 * Account V2 (TG-831C22D22486) — квитанции conflict / rejected{code}.
 * зачем: сервер отдаёт их как ОКОНЧАТЕЛЬНЫЕ исходы. Клиент обязан подтвердить
 * операцию (убрать из outbox), сохранить квитанцию для слоя разрешения
 * конфликтов и НЕ повторять её; неизвестная форма — по-прежнему sync_receipt_invalid.
 */

const UID = 'uid/receipts';
const fenceA: SessionFence = Object.freeze({
  scopeKey: `account:${UID}`, uid: UID, generation: 1, nonce: 'nonce-r',
});
const PREFIX = '__account_sync_outbox_v2__:';

function owned(operationId: string, entityId = `entity/${operationId}`): AccountSyncOwnedOperation {
  return {
    ownerUid: UID,
    operation: {
      schemaVersion: 1, operationId, entityType: 'flashcard', entityId,
      clientSequence: 1, baseRevision: 4, payload: { op: 'upsert', fields: { front: 'x' } },
    },
  };
}

function dispatching(operations: readonly AccountSyncOwnedOperation[]): AccountSyncState {
  const loading = reduceAccountSync(
    createInitialAccountSyncState(UID, fenceA, operations.length), { type: 'SYNC_REQUESTED' },
  ).state;
  return reduceAccountSync(loading, {
    type: 'OUTBOX_BATCH_LOADED', expectedFence: fenceA, attemptEpoch: 1,
    batchId: 'batch-r', operations, pendingCount: operations.length,
  }).state;
}

function respond(receipts: readonly unknown[], operations = [owned('op-1')]): AccountSyncState {
  return reduceAccountSync(dispatching(operations), {
    type: 'DISPATCH_RESPONSE_RECEIVED', expectedFence: fenceA, attemptEpoch: 2,
    batchId: 'batch-r', receipts,
  }).state;
}

describe('account sync v2 receipts: conflict and rejected are final acknowledged outcomes', () => {
  test('reducer accepts conflict and every server reject code and moves to ack commit', () => {
    expect(respond([{ operationId: 'op-1', outcome: 'conflict', serverRevision: 9 }]).phase)
      .toMatchObject({ tag: 'ack_commit_pending', receipts: [{ outcome: 'conflict', serverRevision: 9 }] });
    for (const code of ACCOUNT_SYNC_REJECT_CODES) {
      const state = respond([{ operationId: 'op-1', outcome: 'rejected', code, serverRevision: 0 }]);
      expect(state.phase).toMatchObject({
        tag: 'ack_commit_pending', receipts: [{ outcome: 'rejected', code, serverRevision: 0 }],
      });
    }
  });

  test('reject codes are exactly the server list', () => {
    expect([...ACCOUNT_SYNC_REJECT_CODES]).toEqual([
      'payload_invalid', 'operation_id_reused', 'entity_state_too_large', 'revision_overflow',
      'srs_time_in_future',
    ]);
  });

  test.each([
    ['rejected without code', { operationId: 'op-1', outcome: 'rejected', serverRevision: 1 }],
    ['rejected with unknown code', { operationId: 'op-1', outcome: 'rejected', code: 'mystery', serverRevision: 1 }],
    ['conflict with code', { operationId: 'op-1', outcome: 'conflict', code: 'payload_invalid', serverRevision: 1 }],
    ['applied with extra field', { operationId: 'op-1', outcome: 'applied', serverRevision: 1, note: 'x' }],
    ['unknown outcome', { operationId: 'op-1', outcome: 'refunded', serverRevision: 1 }],
    ['rejected with negative revision', { operationId: 'op-1', outcome: 'rejected', code: 'payload_invalid', serverRevision: -1 }],
  ])('keeps the sync_receipt_invalid guard for unknown forms: %s', (_label, receipt) => {
    expect(respond([receipt]).phase).toMatchObject({
      tag: 'sync_attention', code: 'sync_receipt_invalid', retry: { stage: 'dispatch' },
    });
  });
});

describe('account sync v2 receipts through the outbox', () => {
  async function harness(): Promise<{
    adapter: MemoryScopeStorageAdapter;
    scope: Extract<AccountScope, { kind: 'account' }>;
    outbox: ReturnType<typeof createAccountSyncOutbox>;
  }> {
    const adapter = new MemoryScopeStorageAdapter();
    const store = createAccountScopeStore(adapter);
    const scope: Extract<AccountScope, { kind: 'account' }> = { kind: 'account', uid: UID, scopeKey: `account:${UID}` };
    const handle = await store.open(scope, fenceA);
    return { adapter, scope, outbox: createAccountSyncOutbox(handle) };
  }

  test('conflict and rejected leave the outbox, keep the receipt and are never re-sent', async () => {
    const { adapter, scope, outbox } = await harness();
    await outbox.enqueue(owned('op-conflict'), fenceA);
    await outbox.enqueue(owned('op-rejected'), fenceA);
    await outbox.enqueue(owned('op-applied'), fenceA);
    let dispatchCalls = 0;
    const runner = createAccountSyncRunner(UID, fenceA, 3, {
      load: outbox.load,
      dispatch: async (effect) => {
        dispatchCalls += 1;
        return {
          outcome: 'accepted',
          receipts: effect.batch.operations.map(({ operation }) => {
            if (operation.operationId === 'op-conflict') {
              return { operationId: operation.operationId, outcome: 'conflict', serverRevision: 7 };
            }
            if (operation.operationId === 'op-rejected') {
              return {
                operationId: operation.operationId, outcome: 'rejected',
                code: 'entity_state_too_large', serverRevision: 3,
              };
            }
            return { operationId: operation.operationId, outcome: 'applied', serverRevision: 8 };
          }),
        };
      },
      ackCommit: outbox.ackCommit,
    }, (expected) => sameSessionFence(expected, fenceA));

    const result = await runner.runOneBatch();
    expect(result.state).toMatchObject({ pendingCount: 0, phase: { tag: 'idle' } });
    expect(result.confirmations[0].confirmedOperationIds)
      .toEqual(['op-conflict', 'op-rejected', 'op-applied']);
    expect(result.resolutions.map(({ receipt }) => receipt)).toEqual([
      { operationId: 'op-conflict', outcome: 'conflict', serverRevision: 7 },
      { operationId: 'op-rejected', outcome: 'rejected', code: 'entity_state_too_large', serverRevision: 3 },
    ]);
    expect(result.resolutions[0].operation.operation.baseRevision).toBe(4);

    const stored = adapter.snapshot(scope.scopeKey);
    const ackReceipt = (operationId: string): ScopeJson | undefined => {
      const record = stored.find(({ key }) => key === `${PREFIX}ack:${JSON.stringify(operationId)}`);
      return (record?.value as Record<string, ScopeJson> | undefined)?.receipt;
    };
    expect(ackReceipt('op-rejected')).toEqual({
      operationId: 'op-rejected', outcome: 'rejected', code: 'entity_state_too_large', serverRevision: 3,
    });
    expect(ackReceipt('op-conflict')).toEqual({ operationId: 'op-conflict', outcome: 'conflict', serverRevision: 7 });
    expect(stored.some(({ key }) => key.startsWith(`${PREFIX}pending:`))).toBe(false);

    const again = await runner.runOneBatch();
    expect(again.state).toMatchObject({ pendingCount: 0, phase: { tag: 'idle' } });
    expect(dispatchCalls).toBe(1);
    expect(await outbox.enqueue(owned('op-rejected'), fenceA)).toMatchObject({ outcome: 'already_acknowledged' });
  });
});
