import type { AccountScope, SessionFence } from '../modules/account-session-v2/account_session';
import { createAccountScopeStore } from '../modules/account-session-v2/account_scope_store';
import type { AccountSyncOwnedOperation, AccountSyncWireBatch } from '../modules/account-session-v2/account_sync';
import { createAccountSyncOutbox } from '../modules/account-session-v2/account_sync_outbox';
import type { AccountsV2SecureStorePort } from '../modules/account-session-v2/account_deletion_credential';
import { ACCOUNTS_V2_DETACH_LATCH_KEY, createAccountDetachLatch } from '../modules/account-session-v2/account_detach_latch';
import {
  createAccountsV2ClientController,
  type AccountsV2ClientPorts,
} from '../modules/account-session-v2/account_v2_client_session';
import { MemoryScopeStorageAdapter } from '../modules/account-session-v2/testing/memory_scope_storage';

/*
 * Account V2, Пакет 6B — жизненный цикл клиента: флаг, старт после входа,
 * стоп/закрытие при выходе и смене аккаунта, «сервер выключен», удаление.
 */

const A = 'uid-a';
const B = 'uid-b';
const NOW = 1_800_000_000_000;
const PREFIX = '__account_sync_outbox_v2__:';

function scopeOf(uid: string): Extract<AccountScope, { kind: 'account' }> {
  return { kind: 'account', uid, scopeKey: `account:${uid}` };
}

function op(uid: string, operationId: string): AccountSyncOwnedOperation {
  return {
    ownerUid: uid,
    operation: {
      schemaVersion: 1, operationId, entityType: 'flashcard', entityId: `entity/${operationId}`,
      clientSequence: 1, baseRevision: 4, payload: { op: 'upsert', fields: { front: operationId } },
    },
  };
}

/** Кладёт операции в outbox области uid отдельным хранилищем (как «прошлый запуск»). */
async function seed(adapter: MemoryScopeStorageAdapter, uid: string, ids: readonly string[]): Promise<void> {
  const fence: SessionFence = Object.freeze({ scopeKey: `account:${uid}`, uid, generation: 1, nonce: 'seed' });
  const store = createAccountScopeStore(adapter);
  const handle = await store.open(scopeOf(uid), fence);
  const outbox = createAccountSyncOutbox(handle, { nowMs: () => NOW });
  for (const id of ids) await outbox.enqueue(op(uid, id), fence);
  await store.close(fence);
}

function secureStore(): AccountsV2SecureStorePort & { map: Map<string, string>; reads: number } {
  const map = new Map<string, string>();
  const store = {
    map,
    reads: 0,
    getItemAsync: async (key: string) => { store.reads += 1; return map.get(key) ?? null; },
    setItemAsync: async (key: string, value: string) => { map.set(key, value); },
    deleteItemAsync: async (key: string) => { map.delete(key); },
  };
  return store;
}

function disabledError(): Error {
  const error = new Error('accounts_v2_disabled') as Error & { code: string; details: unknown };
  error.code = 'functions/failed-precondition';
  error.details = { final: true, code: 'accounts_v2_disabled' };
  return error;
}

const applied = (batch: AccountSyncWireBatch) => ({
  data: {
    receipts: batch.operations.map((entry) => ({ operationId: entry.operation.operationId, outcome: 'applied', serverRevision: 5 })),
    serverNowMs: NOW,
  },
});

type Options = {
  adapter?: MemoryScopeStorageAdapter | null;
  secure?: ReturnType<typeof secureStore>;
  enabled?: boolean;
  respond?: (batch: AccountSyncWireBatch) => Promise<unknown>;
};

function build(options: Options = {}) {
  const adapter = options.adapter === undefined ? new MemoryScopeStorageAdapter() : options.adapter;
  const secure = options.secure ?? secureStore();
  const state = { enabled: options.enabled ?? true, authUid: A as string | null };
  const sent: AccountSyncWireBatch[] = [];
  const timers = new Map<number, { run: () => void; delayMs: number }>();
  let timerId = 0;
  let nonce = 0;
  const ports = {
    isEnabled: jest.fn(() => state.enabled),
    createStorageAdapter: jest.fn(() => adapter),
    latch: createAccountDetachLatch(secure),
    callSync: jest.fn(async (batch: AccountSyncWireBatch) => {
      sent.push(batch);
      return options.respond ? options.respond(batch) : applied(batch);
    }),
    currentAuthUid: jest.fn(() => state.authUid),
    newNonce: () => `nonce-${++nonce}`,
    setTimer: jest.fn((run: () => void, delayMs: number) => { timerId += 1; timers.set(timerId, { run, delayMs }); return timerId; }),
    clearTimer: jest.fn((handle: unknown) => { timers.delete(handle as number); }),
    nowMs: () => NOW,
    random: () => 0,
  } satisfies AccountsV2ClientPorts;
  const controller = createAccountsV2ClientController(ports);
  const keys = (uid: string): string[] => (adapter === null ? [] : adapter.snapshot(`account:${uid}`).map((r) => r.key));
  return { adapter, secure, state, sent, timers, ports, controller, keys };
}

async function settle(): Promise<void> {
  for (let index = 0; index < 60; index += 1) await new Promise((resolve) => setImmediate(resolve));
}

describe('account v2 client session v2', () => {
  let warn: jest.SpyInstance;
  let log: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => { warn.mockRestore(); log.mockRestore(); });

  test('flag OFF: no storage, no latch read, no network, no timers', async () => {
    const h = build({ enabled: false });
    await h.controller.setAuthUid(A);
    await settle();
    expect(h.ports.createStorageAdapter).not.toHaveBeenCalled();
    expect(h.secure.reads).toBe(0);
    expect(h.ports.callSync).not.toHaveBeenCalled();
    expect(h.ports.setTimer).not.toHaveBeenCalled();
    expect(h.adapter!.openCalls).toEqual([]);
    expect(h.controller.status().uid).toBeNull();
  });

  test('flag ON: after sign-in the outbox drains through the callable and stops when empty', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    await seed(adapter, A, ['op-1', 'op-2']);
    const h = build({ adapter });
    await h.controller.setAuthUid(A);
    await settle();
    expect(h.sent).toHaveLength(1);
    expect(h.sent[0].operations.map((entry) => entry.operation.operationId)).toEqual(['op-1', 'op-2']);
    expect(h.keys(A).some((key) => key.startsWith(`${PREFIX}pending:`))).toBe(false);
    expect(h.controller.status()).toEqual(expect.objectContaining({ uid: A, sending: true, timerArmed: false }));
  });

  test('no native storage yet: nothing opens, nothing is sent', async () => {
    const h = build({ adapter: null });
    await h.controller.setAuthUid(A);
    await settle();
    expect(h.ports.callSync).not.toHaveBeenCalled();
    expect(h.controller.status().uid).toBeNull();
  });

  test('sign-out stops the runner and closes the scope', async () => {
    const h = build();
    await h.controller.setAuthUid(A);
    await settle();
    await h.controller.setAuthUid(null);
    expect(h.adapter!.closeCalls).toEqual([`account:${A}`]);
    expect(h.controller.status().uid).toBeNull();
  });

  test('account switch closes A before opening B; B never sends A operations', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    await seed(adapter, B, ['op-b']);
    const h = build({ adapter });
    await h.controller.setAuthUid(A);
    await settle();
    const opensBefore = adapter.openCalls.length;
    h.state.authUid = B;
    await h.controller.setAuthUid(B);
    await settle();
    expect(adapter.closeCalls.slice(-1)).toEqual([`account:${A}`]);
    expect(adapter.openCalls.slice(opensBefore)).toEqual([`account:${B}`]);
    expect(h.sent.flatMap((batch) => batch.operations.map((entry) => entry.ownerUid))).toEqual([B]);
  });

  test('auth uid differs from the scope owner: nothing is sent and nothing is quarantined', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    await seed(adapter, A, ['op-1']);
    const h = build({ adapter });
    // Гонка смены аккаунта: старт и открытие видят A, к отправке Firebase уже на B.
    h.ports.currentAuthUid
      .mockImplementationOnce(() => A)
      .mockImplementationOnce(() => A)
      .mockImplementation(() => B);
    await h.controller.setAuthUid(A);
    await settle();
    expect(h.ports.callSync).not.toHaveBeenCalled();
    expect(h.keys(A)).toContain(`${PREFIX}pending:${JSON.stringify('op-1')}`);
    expect(h.keys(A).some((key) => key.startsWith(`${PREFIX}quarantine:`))).toBe(false);
  });

  test('accounts_v2_disabled: stop until restart, no quarantine, operation stays pending', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    await seed(adapter, A, ['op-1']);
    const h = build({ adapter, respond: async () => { throw disabledError(); } });
    await h.controller.setAuthUid(A);
    await settle();
    expect(h.sent).toHaveLength(1);
    expect(h.controller.status()).toEqual(expect.objectContaining({ serverDisabled: true, sending: false, timerArmed: false }));
    expect(h.keys(A)).toContain(`${PREFIX}pending:${JSON.stringify('op-1')}`);
    expect(h.keys(A).some((key) => key.startsWith(`${PREFIX}quarantine:`))).toBe(false);
    h.state.authUid = B;
    await h.controller.setAuthUid(B);
    await settle();
    expect(h.sent).toHaveLength(1);
  });

  test('rate limit pauses with a timer of at least retryAfterMs', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    await seed(adapter, A, ['op-1']);
    const error = Object.assign(new Error('rate_limited'), { code: 'resource-exhausted', details: { final: false, retryAfterMs: 9_000 } });
    const h = build({ adapter, respond: async () => { throw error; } });
    await h.controller.setAuthUid(A);
    await settle();
    expect(h.timers.size).toBe(1);
    expect([...h.timers.values()][0].delayMs).toBeGreaterThanOrEqual(9_000);
    await h.controller.setAuthUid(null);
    expect(h.timers.size).toBe(0);
  });

  test('deletion detaches SYNCHRONOUSLY, then erases and clears the latch', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    await seed(adapter, A, ['op-1']);
    const release = adapter.holdNext('erase');
    const h = build({ adapter, respond: () => new Promise(() => undefined) });
    await h.controller.setAuthUid(A);
    await settle();
    const deleting = h.controller.beginDeletionDetach(A);
    // До первого await: отправка остановлена, области в контроллере больше нет.
    expect(h.controller.status().uid).toBeNull();
    await release.entered;
    await expect(h.secure.getItemAsync(ACCOUNTS_V2_DETACH_LATCH_KEY)).resolves.toContain(A);
    release.release();
    const result = await deleting;
    expect(result).toEqual(expect.objectContaining({ outcome: 'detached', closed: 'closed' }));
    expect(h.keys(A)).toEqual([]);
    expect(h.secure.map.has(ACCOUNTS_V2_DETACH_LATCH_KEY)).toBe(false);
    await h.controller.setAuthUid(A);
    expect(adapter.openCalls.filter((key) => key === `account:${A}`)).toHaveLength(2);
  });

  test('deletion halts a paused runner synchronously: its timer never fires a send again', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    await seed(adapter, A, ['op-1']);
    const error = Object.assign(new Error('rate_limited'), { code: 'resource-exhausted', details: { final: false, retryAfterMs: 9_000 } });
    const h = build({ adapter, respond: async () => { throw error; } });
    await h.controller.setAuthUid(A);
    await settle();
    expect(h.timers.size).toBe(1);
    const pending = [...h.timers.values()];
    const deleting = h.controller.beginDeletionDetach(A);
    expect(h.timers.size).toBe(0);
    for (const timer of pending) timer.run();
    await settle();
    await deleting;
    expect(h.sent).toHaveLength(1);
  });

  test('close_failed keeps the latch; the next launch never reopens A and finishes the erase', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    await seed(adapter, A, ['op-1']);
    const secure = secureStore();
    const first = build({ adapter, secure });
    await first.controller.setAuthUid(A);
    await settle();
    adapter.failNext('close', `account:${A}`, 'native_close_failed');
    const result = await first.controller.beginDeletionDetach(A);
    expect(result).toEqual(expect.objectContaining({ outcome: 'detached_erase_pending', closed: 'close_failed' }));
    expect(secure.map.get(ACCOUNTS_V2_DETACH_LATCH_KEY)).toContain(A);

    // «Перезапуск»: новый контроллер, то же хранилище и SecureStore.
    const second = build({ adapter, secure });
    const opensBefore = adapter.openCalls.length;
    await second.controller.setAuthUid(A);
    await settle();
    expect(adapter.openCalls.length).toBe(opensBefore);
    expect(adapter.eraseCalls.slice(-1)).toEqual([`account:${A}`]);
    expect(second.keys(A)).toEqual([]);
    expect(secure.map.has(ACCOUNTS_V2_DETACH_LATCH_KEY)).toBe(false);
    expect(second.sent).toHaveLength(0);
  });

  test('unreadable latch is fail-closed: no scope opens', async () => {
    const secure = secureStore();
    secure.map.set(ACCOUNTS_V2_DETACH_LATCH_KEY, '{broken');
    const h = build({ secure });
    await h.controller.setAuthUid(A);
    await settle();
    expect(h.adapter!.openCalls).toEqual([]);
  });

  test('deletion without an open scope still persists the latch and erases', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    await seed(adapter, A, ['op-1']);
    const h = build({ adapter });
    h.state.authUid = B;
    await h.controller.setAuthUid(B);
    await settle();
    const result = await h.controller.beginDeletionDetach(A);
    expect(result).toEqual(expect.objectContaining({ outcome: 'detached' }));
    expect(h.keys(A)).toEqual([]);
    expect(h.controller.status().uid).toBe(B);
  });

  test('logs use the [ACCOUNT-V2] prefix and never contain the uid', async () => {
    const h = build({ enabled: false });
    await h.controller.setAuthUid(A);
    const lines = [...warn.mock.calls, ...log.mock.calls].map((args) => args.join(' '));
    expect(lines).toContain('[ACCOUNT-V2] lifecycle skip reason=flag_off');
    expect(lines.some((line) => line.includes(A))).toBe(false);
  });
});
