import { sameSessionFence, type AccountScope, type SessionFence } from '../modules/account-session-v2/account_session';
import { createAccountScopeStore } from '../modules/account-session-v2/account_scope_store';
import type { AccountSyncOwnedOperation } from '../modules/account-session-v2/account_sync';
import { createAccountSyncOutbox } from '../modules/account-session-v2/account_sync_outbox';
import { createAccountSyncRunner } from '../modules/account-session-v2/account_sync_runner';
import { createAccountDeletionDetacher, parseAccountDeletionServerStage } from '../modules/account-session-v2/account_deletion_detach';
import { MemoryScopeStorageAdapter } from '../modules/account-session-v2/testing/memory_scope_storage';

/*
 * Account V2, Пакет 4 — немедленное отсоединение аккаунта при удалении (решение 15).
 * зачем: как только человек подтвердил удаление, V2-очередь и область хранения
 * аккаунта закрываются и стираются СРАЗУ, до ответа сервера. Поздний ответ
 * сервера (подтверждение пакета, этап) не может ничего записать обратно.
 * Вход той же почтой = новый uid = новая пустая область. Уведомлений нет.
 */

const OLD_UID = 'OldUid1234567890abcdefghijkl';
const NEW_UID = 'NewUid1234567890abcdefghijkl';

function account(uid: string): Extract<AccountScope, { kind: 'account' }> {
  return { kind: 'account', uid, scopeKey: `account:${uid}` };
}

function fence(scope: Extract<AccountScope, { kind: 'account' }>, generation: number): SessionFence {
  return Object.freeze({ scopeKey: scope.scopeKey, uid: scope.uid, generation, nonce: `nonce-${generation}` });
}

function operation(ownerUid: string, operationId: string): AccountSyncOwnedOperation {
  return {
    ownerUid,
    operation: {
      schemaVersion: 1,
      operationId,
      entityType: 'lesson_progress',
      entityId: `entity/${operationId}`,
      clientSequence: 1,
      baseRevision: null,
      payload: { value: operationId },
    },
  };
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void } {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function harness() {
  const adapter = new MemoryScopeStorageAdapter();
  const store = createAccountScopeStore(adapter);
  const scope = account(OLD_UID);
  const currentFence = fence(scope, 1);
  const handle = await store.open(scope, currentFence);
  const outbox = createAccountSyncOutbox(handle);
  await outbox.enqueue(operation(OLD_UID, 'operation-1'), currentFence);
  await outbox.enqueue(operation(OLD_UID, 'operation-2'), currentFence);
  let syncStops = 0;
  const detacher = createAccountDeletionDetacher({ scopeStore: store, stopSync: () => { syncStops += 1; } });
  return { adapter, store, scope, currentFence, handle, outbox, detacher, syncStops: () => syncStops };
}

describe('account deletion detach v2', () => {
  test('закрывает и стирает область аккаунта вместе с очередью синхронизации', async () => {
    const h = await harness();
    expect(h.adapter.snapshot(h.scope.scopeKey).length).toBeGreaterThan(0);
    const result = await h.detacher.detach(h.scope, h.currentFence);
    expect(result).toMatchObject({ outcome: 'detached', closed: 'closed', code: null });
    expect(result.erase).toMatchObject({ outcome: 'erased' });
    expect(h.adapter.snapshot(h.scope.scopeKey)).toEqual([]);
    expect(h.syncStops()).toBe(1);
    expect(h.detacher.isDetached(OLD_UID)).toBe(true);
  });

  test('очередь мертва ДО обращения к серверу (синхронно при старте удаления)', async () => {
    const h = await harness();
    let enqueueDuringServer: unknown = null;
    const outcome = await h.detacher.runDeletion(h.scope, h.currentFence, async () => {
      enqueueDuringServer = await h.outbox.enqueue(operation(OLD_UID, 'operation-3'), h.currentFence)
        .then(() => 'enqueued', (error: { code?: string }) => error.code ?? 'error');
      return { stage: 'accepted' };
    });
    expect(enqueueDuringServer).not.toBe('enqueued');
    expect(outcome.server).toEqual({ kind: 'ok', stage: 'accepted' });
    expect(h.adapter.snapshot(h.scope.scopeKey)).toEqual([]);
  });

  test('поздний ответ сервера на пакет синхронизации не воскрешает данные', async () => {
    const h = await harness();
    const dispatch = deferred<unknown>();
    const runner = createAccountSyncRunner(OLD_UID, h.currentFence, 2, {
      load: h.outbox.load,
      dispatch: () => dispatch.promise,
      ackCommit: h.outbox.ackCommit,
    }, (expected) => sameSessionFence(expected, h.currentFence));
    const inFlight = runner.runOneBatch().then((value) => value, (error: unknown) => error);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const deletion = deferred<unknown>();
    const running = h.detacher.runDeletion(h.scope, h.currentFence, () => deletion.promise);
    dispatch.resolve({
      outcome: 'accepted',
      receipts: [
        { operationId: 'operation-1', outcome: 'applied', serverRevision: 7 },
        { operationId: 'operation-2', outcome: 'applied', serverRevision: 8 },
      ],
    });
    await inFlight;
    deletion.resolve({ stage: 'completed', profile: { name: 'should never be stored' } });
    const outcome = await running;
    expect(outcome.server).toEqual({ kind: 'ok', stage: 'completed' });
    expect(h.adapter.snapshot(h.scope.scopeKey)).toEqual([]);
  });

  test('вход той же почтой = новый uid: новая область пустая, старый uid помечен', async () => {
    const h = await harness();
    await h.detacher.runDeletion(h.scope, h.currentFence, async () => ({ stage: 'accepted' }));
    const fresh = account(NEW_UID);
    const freshHandle = await h.store.open(fresh, fence(fresh, 2));
    const freshOutbox = createAccountSyncOutbox(freshHandle);
    const loaded = await freshOutbox.load(Object.freeze({
      type: 'LOAD_OUTBOX_BATCH', ownerUid: NEW_UID, expectedFence: fence(fresh, 2),
      attemptEpoch: 1, maxOperations: 50, maxBatchUtf8Bytes: 524288,
    }));
    expect(loaded.operations).toEqual([]);
    expect(h.adapter.snapshot(h.scope.scopeKey)).toEqual([]);
    expect(h.detacher.isDetached(OLD_UID)).toBe(true);
    expect(h.detacher.isDetached(NEW_UID)).toBe(false);
  });

  test('сервер упал или потерял ответ — локально всё равно отсоединено, без уведомлений', async () => {
    const h = await harness();
    const outcome = await h.detacher.runDeletion(h.scope, h.currentFence, async () => {
      throw Object.assign(new Error('network'), { code: 'functions/unavailable' });
    });
    expect(outcome.server).toEqual({ kind: 'failed', code: 'functions/unavailable' });
    expect(outcome.detach.outcome).toBe('detached');
    expect(h.adapter.snapshot(h.scope.scopeKey)).toEqual([]);
  });

  test('ответ сервера без допустимого этапа — отказ формы, данные не читаются', async () => {
    const h = await harness();
    const outcome = await h.detacher.runDeletion(h.scope, h.currentFence, async () => ({ stage: 'restored', uid: OLD_UID }));
    expect(outcome.server).toEqual({ kind: 'failed', code: 'server_stage_invalid' });
    // Ремонт №1 P2-1: промежуточный этап сервера v2_purged допустим.
    expect(parseAccountDeletionServerStage({ stage: 'v2_purged' })).toEqual({ kind: 'ok', stage: 'v2_purged' });
  });

  test('сбой закрытия: очередь всё равно мертва, стирание отложено; повтор доводит', async () => {
    const h = await harness();
    h.adapter.failNext('close', h.scope.scopeKey, 'disk_busy');
    const first = await h.detacher.detach(h.scope, h.currentFence);
    expect(first).toMatchObject({ outcome: 'detached_erase_pending', closed: 'close_failed' });
    await expect(h.outbox.enqueue(operation(OLD_UID, 'operation-9'), h.currentFence)).rejects.toBeDefined();
    const retry = await h.detacher.detach(h.scope, h.currentFence);
    expect(retry).toMatchObject({ outcome: 'detached', code: null });
    expect(h.adapter.snapshot(h.scope.scopeKey)).toEqual([]);
  });

  test('сбой стирания: код в результате, повтор стирает', async () => {
    const h = await harness();
    h.adapter.failNext('erase', h.scope.scopeKey, 'io_error');
    const first = await h.detacher.detach(h.scope, h.currentFence);
    expect(first).toMatchObject({ outcome: 'detached_erase_pending', closed: 'closed', code: 'account_scope_erase_failed' });
    const retry = await h.detacher.detach(h.scope, h.currentFence);
    expect(retry).toMatchObject({ outcome: 'detached', closed: 'already_closed' });
    expect(h.adapter.snapshot(h.scope.scopeKey)).toEqual([]);
  });

  test('повтор отсоединения идемпотентен', async () => {
    const h = await harness();
    await h.detacher.detach(h.scope, h.currentFence);
    const again = await h.detacher.detach(h.scope, h.currentFence);
    expect(again).toMatchObject({ outcome: 'detached', closed: 'already_closed' });
    expect(again.erase).toMatchObject({ outcome: 'already_absent' });
  });

  test('гостевая область и чужой fence отклоняются без действий', async () => {
    const h = await harness();
    const guest = { kind: 'guest', installationId: 'i', scopeKey: 'guest:i' } as unknown as Extract<AccountScope, { kind: 'account' }>;
    await expect(h.detacher.detach(guest, h.currentFence)).rejects.toThrow('account_deletion_detach_invalid_input');
    await expect(h.detacher.detach(account(NEW_UID), h.currentFence)).rejects.toThrow('account_deletion_detach_invalid_input');
    let serverCalls = 0;
    await expect(h.detacher.runDeletion(account(NEW_UID), h.currentFence, async () => { serverCalls += 1; return {}; }))
      .rejects.toThrow('account_deletion_detach_invalid_input');
    expect(serverCalls).toBe(0);
    expect(h.detacher.isDetached(NEW_UID)).toBe(false);
    expect(h.adapter.snapshot(h.scope.scopeKey).length).toBeGreaterThan(0);
  });
});
