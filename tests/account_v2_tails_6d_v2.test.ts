import fs from 'fs';
import path from 'path';
import type { AccountsV2SecureStorePort } from '../modules/account-session-v2/account_deletion_credential';
import { ACCOUNTS_V2_DETACH_LATCH_KEY, createAccountDetachLatch } from '../modules/account-session-v2/account_detach_latch';
import {
  AccountScopeStoreError,
  createAccountScopeStore,
  type ScopeStorageAdapter,
} from '../modules/account-session-v2/account_scope_store';
import {
  createAccountsV2ClientController,
  type AccountsV2ClientPorts,
} from '../modules/account-session-v2/account_v2_client_session';
import { MemoryScopeStorageAdapter } from '../modules/account-session-v2/testing/memory_scope_storage';

/*
 * Account V2, Пакет 6D — хвосты P3 ревью 6C:
 *  (б) стабильно падающее стирание НЕ блокирует защёлку навсегда: битая запись
 *      переписывается валидной защёлкой из упавших uid, остальные аккаунты
 *      открываются; «повтор не поможет» (manifest_mismatch) — отдельная ветка лога;
 *  (в) аноним снимает ключ удаления V2 только при УСПЕШНОМ ответе сервера.
 * (а) — в tests/account_native_scope_adapter_v2.test.ts (нужно фейковое устройство).
 */

const A = 'uid-a';
const B = 'uid-b';
const ROOT = path.resolve(__dirname, '..');

function secureStore(): AccountsV2SecureStorePort & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItemAsync: async (key: string) => map.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => { map.set(key, value); },
    deleteItemAsync: async (key: string) => { map.delete(key); },
  };
}

async function settle(): Promise<void> {
  for (let index = 0; index < 60; index += 1) await new Promise((resolve) => setImmediate(resolve));
}

class FailingEraseAdapter extends MemoryScopeStorageAdapter {
  constructor(private readonly events: string[], private readonly pending: readonly string[], private readonly code: string) { super(); }

  async discoverPendingEraseUids(): Promise<readonly string[]> {
    this.events.push('discover');
    return this.pending;
  }

  override async eraseClosedAccountScope(
    scope: Parameters<ScopeStorageAdapter['eraseClosedAccountScope']>[0],
  ): ReturnType<ScopeStorageAdapter['eraseClosedAccountScope']> {
    this.events.push(`erase:${scope.uid}`);
    throw Object.assign(new Error(this.code), { code: this.code });
  }
}

function controllerWith(adapter: ScopeStorageAdapter, secure: ReturnType<typeof secureStore>, events: string[], authUid: string) {
  const latch = createAccountDetachLatch(secure);
  const ports = {
    isEnabled: () => true,
    createStorageAdapter: () => adapter,
    latch: { ...latch, reset: async () => { events.push('reset'); return latch.reset(); } },
    callSync: jest.fn(async () => { throw Object.assign(new Error('x'), { code: 'unauthenticated', details: { final: false } }); }),
    currentAuthUid: jest.fn(() => authUid as string | null),
    newNonce: () => 'nonce',
    setTimer: () => 1,
    clearTimer: () => undefined,
    nowMs: () => 1_000,
    random: () => 0,
  } satisfies AccountsV2ClientPorts;
  return createAccountsV2ClientController(ports);
}

describe('account v2 tails 6D (P3 of review 6C)', () => {
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  beforeEach(() => {
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => { log.mockRestore(); warn.mockRestore(); jest.resetModules(); });

  test('(б) stably failing erase: corrupt latch is rewritten with the failed uid; the NEXT launch opens another account', async () => {
    const events: string[] = [];
    const secure = secureStore();
    secure.map.set(ACCOUNTS_V2_DETACH_LATCH_KEY, '{broken');
    const adapter = new FailingEraseAdapter(events, [B], 'io_failed');
    const first = controllerWith(adapter, secure, events, A);
    await first.setAuthUid(A);
    await settle();
    expect(events).toEqual(['discover', `erase:${B}`]);
    // B не потерян — он в ВАЛИДНОЙ защёлке; битой записи больше нет.
    expect(JSON.parse(secure.map.get(ACCOUNTS_V2_DETACH_LATCH_KEY)!)).toEqual({ v: 1, uids: [B] });
    // Следующий запуск: стирание B снова падает, но аккаунт A открывается (защёлка не вечная блокировка).
    const second = controllerWith(adapter, secure, events, A);
    await second.setAuthUid(A);
    await settle();
    expect(second.status().uid).toBe(A);
    expect(JSON.parse(secure.map.get(ACCOUNTS_V2_DETACH_LATCH_KEY)!)).toEqual({ v: 1, uids: [B] });
    // Сам B по-прежнему не открывается.
    const third = controllerWith(adapter, secure, events, B);
    await third.setAuthUid(B);
    await settle();
    expect(third.status().uid).toBeNull();
  });

  test('(б) terminal erase code (manifest_mismatch) goes through its own log branch, through the store wrapper', async () => {
    const events: string[] = [];
    const secure = secureStore();
    secure.map.set(ACCOUNTS_V2_DETACH_LATCH_KEY, JSON.stringify({ v: 1, uids: [B] }));
    const adapter = new FailingEraseAdapter(events, [], 'account_native_scope_erase_marker_manifest_mismatch');
    const controller = controllerWith(adapter, secure, events, A);
    await controller.setAuthUid(A);
    await settle();
    const lines = warn.mock.calls.map((args) => args.join(' '));
    expect(lines.some((line) => line.includes('[ACCOUNT-V2] erase resume_terminal')
      && line.includes('cause=account_native_scope_erase_marker_manifest_mismatch'))).toBe(true);
    expect(lines.some((line) => line.includes('erase resume_failed'))).toBe(false);
    expect(controller.status().uid).toBe(A);
  });

  test('store keeps the adapter code as causeCode when wrapping an erase failure', async () => {
    const store = createAccountScopeStore(new FailingEraseAdapter([], [], 'account_native_scope_erase_family_residue'));
    const error = await store.eraseClosedAccountScope({ kind: 'account', uid: A, scopeKey: `account:${A}` }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AccountScopeStoreError);
    expect(error).toMatchObject({ code: 'account_scope_erase_failed', causeCode: 'account_native_scope_erase_family_residue' });
  });

  describe('(в) anonymous deletion clears the V2 key only on a SUCCESSFUL ack', () => {
    function loadFlagModule(clear: jest.Mock) {
      jest.doMock('../app/remote_flags', () => ({ getRemoteBool: () => true }));
      jest.doMock('../modules/account-session-v2/accounts_v2_client_runtime', () => ({
        clearStoredAccountsV2DeletionCredential: clear,
      }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('../app/accounts_v2_client_flag') as typeof import('../app/accounts_v2_client_flag');
    }

    test.each([
      ['undefined', undefined],
      ['not ok', { ok: false, jobId: 'j', authReleased: true, credentialSafe: true }],
      ['no jobId', { ok: true, authReleased: true, credentialSafe: true }],
      ['auth not released', { ok: true, jobId: 'j', authReleased: false, credentialSafe: true }],
      ['credential not safe', { ok: true, jobId: 'j', authReleased: true, credentialSafe: false }],
    ])('ack %s → key stays', (_label, ack) => {
      const clear = jest.fn(async () => true);
      const flag = loadFlagModule(clear);
      expect(flag.isAccountsV2DeletionAckSuccessful(ack)).toBe(false);
      flag.clearStoredAccountsV2DeletionCredentialAfterAckIfEnabled(null, ack);
      expect(clear).not.toHaveBeenCalled();
      expect(warn.mock.calls.map((args) => args.join(' '))).toContain('[ACCOUNT-V2] delete_clear skip reason=ack_not_successful');
    });

    test('successful ack → key of the unbound (anonymous) deletion is cleared', () => {
      const clear = jest.fn(async () => true);
      const flag = loadFlagModule(clear);
      flag.clearStoredAccountsV2DeletionCredentialAfterAckIfEnabled(null, {
        ok: true, jobId: 'job-1', status: 'queued', created: true, authReleased: true, credentialSafe: true,
      });
      expect(clear).toHaveBeenCalledWith(null);
    });

    test('auth flow: the anonymous branch uses the ack-checked clear', () => {
      const source = fs.readFileSync(path.join(ROOT, 'app', 'auth_provider.ts'), 'utf8');
      const anonStart = source.indexOf('void cloudDeleteEnqueueOperation.acknowledgment');
      const anonThen = source.slice(anonStart, source.indexOf('.catch(', anonStart));
      // зачем (12.10, тест устарел после 91b396d6a «серверные данные гостя не удалялись»): гостю теперь пишется замок, и ключ V2
      // создаётся с его operationId (beginAccountsV2DeletionIfEnabled(…, pendingDeleteLock?.operationId ?? null)) — снимать надо с тем же.
      expect(anonThen).toContain('clearStoredAccountsV2DeletionCredentialAfterAckIfEnabled(pendingDeleteLock?.operationId ?? null, ack)');
      expect(anonThen).not.toMatch(/clearStoredAccountsV2DeletionCredentialIfEnabled\(null\)/);
    });
  });
});
