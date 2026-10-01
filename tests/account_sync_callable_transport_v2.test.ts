import type { AccountScope, SessionFence } from '../modules/account-session-v2/account_session';
import { createAccountScopeStore } from '../modules/account-session-v2/account_scope_store';
import type { AccountSyncOwnedOperation, AccountSyncWireBatch } from '../modules/account-session-v2/account_sync';
import { createAccountSyncOutbox } from '../modules/account-session-v2/account_sync_outbox';
import { createAccountSyncDispatchPort } from '../modules/account-session-v2/account_sync_outbox_time';
import { createAccountSyncRunner } from '../modules/account-session-v2/account_sync_runner';
import {
  ACCOUNTS_V2_DISABLED_PAUSE_MS,
  createAccountSyncCallableSend,
  isAccountsV2DisabledError,
  toAccountSyncAcceptedResponse,
} from '../modules/account-session-v2/account_sync_callable_transport';
import { MemoryScopeStorageAdapter } from '../modules/account-session-v2/testing/memory_scope_storage';

/*
 * Account V2, Пакет 6B — транспорт callable accountsV2SyncApply.
 * Главное: `accounts_v2_disabled` («сервер выключен») НЕ кладёт пакет в карантин.
 */

const UID = 'uid-transport';
const NOW = 1_800_000_000_000;
const PREFIX = '__account_sync_outbox_v2__:';
const scope: Extract<AccountScope, { kind: 'account' }> = { kind: 'account', uid: UID, scopeKey: `account:${UID}` };
const fence: SessionFence = Object.freeze({ scopeKey: `account:${UID}`, uid: UID, generation: 1, nonce: 'n-1' });

function op(operationId: string): AccountSyncOwnedOperation {
  return {
    ownerUid: UID,
    operation: {
      schemaVersion: 1, operationId, entityType: 'flashcard', entityId: `entity/${operationId}`,
      clientSequence: 1, baseRevision: 4, payload: { op: 'upsert', fields: { front: operationId } },
    },
  };
}

function httpsError(code: string, message: string, details?: unknown): Error {
  const error = new Error(message) as Error & { code: string; details?: unknown };
  error.code = code;
  if (details !== undefined) error.details = details;
  return error;
}

const disabledError = (): Error => httpsError(
  'functions/failed-precondition', 'accounts_v2_disabled', { final: true, code: 'accounts_v2_disabled' },
);

async function harness(send: (batch: AccountSyncWireBatch) => Promise<unknown>) {
  const adapter = new MemoryScopeStorageAdapter();
  const handle = await createAccountScopeStore(adapter).open(scope, fence);
  const outbox = createAccountSyncOutbox(handle, { nowMs: () => NOW });
  await outbox.enqueue(op('op-1'), fence);
  const quarantine = jest.fn((effect: Parameters<typeof outbox.quarantine>[0]) => outbox.quarantine(effect));
  const runner = createAccountSyncRunner(UID, fence, 1, {
    load: (effect) => outbox.load(effect),
    dispatch: createAccountSyncDispatchPort((effect) => outbox.wireBatch(effect), send),
    ackCommit: (effect) => outbox.ackCommit(effect),
    quarantine,
    readDispatchState: (expected) => outbox.readDispatchState(expected),
    writeDispatchState: (expected, state) => outbox.writeDispatchState(expected, state),
  }, () => true, { nowMs: () => NOW, random: () => 0 });
  const keys = (): string[] => adapter.snapshot(scope.scopeKey).map((record) => record.key);
  return { runner, quarantine, keys };
}

describe('account sync callable transport v2', () => {
  let warn: jest.SpyInstance;
  let log: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => { warn.mockRestore(); log.mockRestore(); });

  test('recognises only the server-off refusal, with or without the functions/ prefix', () => {
    expect(isAccountsV2DisabledError(disabledError())).toBe(true);
    expect(isAccountsV2DisabledError(httpsError('failed-precondition', 'x', { final: true, code: 'accounts_v2_disabled' }))).toBe(true);
    // details потерялись — различаем по тексту отказа.
    expect(isAccountsV2DisabledError(httpsError('failed-precondition', 'accounts_v2_disabled'))).toBe(true);
    expect(isAccountsV2DisabledError(httpsError('failed-precondition', 'uid_not_path_safe', { final: true, code: 'uid_not_path_safe' }))).toBe(false);
    expect(isAccountsV2DisabledError(httpsError('permission-denied', 'accounts_v2_disabled'))).toBe(false);
    expect(isAccountsV2DisabledError(null)).toBe(false);
    expect(isAccountsV2DisabledError('accounts_v2_disabled')).toBe(false);
  });

  test('maps the callable result to the runner response shape', () => {
    const receipts = [{ operationId: 'a', outcome: 'applied', serverRevision: 1 }];
    expect(toAccountSyncAcceptedResponse({ data: { receipts, serverNowMs: NOW } }))
      .toEqual({ outcome: 'accepted', receipts, serverNowMs: NOW });
    expect(toAccountSyncAcceptedResponse({ data: { receipts, serverNowMs: -1 } }))
      .toEqual({ outcome: 'accepted', receipts });
    expect(toAccountSyncAcceptedResponse(undefined)).toEqual({ outcome: 'accepted', receipts: undefined });
  });

  test('a real round trip acknowledges the batch through the wire form', async () => {
    const sent: AccountSyncWireBatch[] = [];
    const send = createAccountSyncCallableSend({
      call: async (batch) => {
        sent.push(batch);
        return { data: { receipts: [{ operationId: 'op-1', outcome: 'applied', serverRevision: 5 }], serverNowMs: NOW } };
      },
      onServerDisabled: () => { throw new Error('must not be called'); },
    });
    const { runner, keys } = await harness(send);
    const result = await runner.runOneBatch();
    expect(result.failure).toBeNull();
    expect(result.confirmations).toHaveLength(1);
    expect(sent).toHaveLength(1);
    expect(sent[0].operations[0]).toEqual(expect.objectContaining({ ownerUid: UID, enqueuedAtServerMs: expect.any(Number) }));
    expect(keys().some((key) => key.startsWith(`${PREFIX}pending:`))).toBe(false);
  });

  test('accounts_v2_disabled: no quarantine, operation stays pending, owner is told to stop', async () => {
    const onServerDisabled = jest.fn();
    const send = createAccountSyncCallableSend({ call: async () => { throw disabledError(); }, onServerDisabled });
    const { runner, quarantine, keys } = await harness(send);
    const result = await runner.runOneBatch();
    expect(onServerDisabled).toHaveBeenCalledTimes(1);
    expect(quarantine).not.toHaveBeenCalled();
    expect(result.quarantines).toHaveLength(0);
    expect(result.transport).toEqual(expect.objectContaining({ action: 'wait', failedAttempts: 0 }));
    expect(result.transport!.delayMs).toBeGreaterThanOrEqual(ACCOUNTS_V2_DISABLED_PAUSE_MS);
    expect(keys()).toContain(`${PREFIX}pending:${JSON.stringify('op-1')}`);
    expect(keys().some((key) => key.startsWith(`${PREFIX}quarantine:`))).toBe(false);
  });

  test('contrast: the same final refusal without the transport rule WOULD quarantine', async () => {
    const { runner, quarantine } = await harness(async () => { throw disabledError(); });
    const result = await runner.runOneBatch();
    expect(quarantine).toHaveBeenCalledTimes(1);
    expect(result.quarantines).toHaveLength(1);
  });

  test('rate_limited passes through as a wait of at least retryAfterMs, no attempt spent', async () => {
    const send = createAccountSyncCallableSend({
      call: async () => { throw httpsError('resource-exhausted', 'rate_limited', { final: false, retryAfterMs: 7_000 }); },
      onServerDisabled: () => undefined,
    });
    const { runner, quarantine } = await harness(send);
    const result = await runner.runOneBatch();
    expect(quarantine).not.toHaveBeenCalled();
    expect(result.transport).toEqual(expect.objectContaining({ action: 'wait', failedAttempts: 0 }));
    expect(result.transport!.delayMs).toBeGreaterThanOrEqual(7_000);
  });

  test('logs carry only codes: no uid, no payload', async () => {
    const send = createAccountSyncCallableSend({ call: async () => { throw disabledError(); }, onServerDisabled: () => undefined });
    const { runner } = await harness(send);
    await runner.runOneBatch();
    const lines = [...warn.mock.calls, ...log.mock.calls].map((args) => args.join(' '));
    expect(lines.some((line) => line.includes('[ACCOUNT-V2] transport server_disabled'))).toBe(true);
    expect(lines.some((line) => line.includes(UID) || line.includes('op-1'))).toBe(false);
  });
});
