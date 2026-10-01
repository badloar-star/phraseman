import { randomBytes } from 'crypto';
import type { AccountsV2SecureStorePort } from '../modules/account-session-v2/account_deletion_credential';
import {
  ACCOUNTS_V2_DELETION_CREDENTIAL_KEY,
  clearAccountsV2DeletionCredential,
  createAccountsV2DeletionCredential,
  persistAccountsV2DeletionCredential,
  readAccountsV2DeletionCredential,
} from '../modules/account-session-v2/account_deletion_credential';
import { ACCOUNTS_V2_DETACH_LATCH_KEY, createAccountDetachLatch } from '../modules/account-session-v2/account_detach_latch';
import { createAccountScopeStore, type ScopeStorageAdapter } from '../modules/account-session-v2/account_scope_store';
import { createAccountSyncOutbox } from '../modules/account-session-v2/account_sync_outbox';
import {
  createAccountsV2ClientController,
  type AccountsV2ClientPorts,
} from '../modules/account-session-v2/account_v2_client_session';
import { MemoryScopeStorageAdapter } from '../modules/account-session-v2/testing/memory_scope_storage';

/*
 * Account V2, Пакет 6C — хвосты ревью 6B, закрываемые вместе с хранилищем:
 *  - испорченная защёлка: сначала дочистка найденных областей, сброс — ПОСЛЕ;
 *  - ключ удаления V2 привязан к operationId замка и снимается после завершения;
 *  - вставшая отправка перезапускается не на каждом возврате в приложение;
 *  - iOS: хранилище честно не открывается (null с логом).
 */

const A = 'uid-a';
const B = 'uid-b';

function secureStore(): AccountsV2SecureStorePort & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItemAsync: async (key: string) => map.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => { map.set(key, value); },
    deleteItemAsync: async (key: string) => { map.delete(key); },
  };
}

/** Одна операция в outbox области uid (как «прошлый запуск»), чтобы было что отправлять. */
async function seed(adapter: MemoryScopeStorageAdapter, uid: string, nowMs: number): Promise<void> {
  const fence = Object.freeze({ scopeKey: `account:${uid}`, uid, generation: 1, nonce: 'seed' });
  const store = createAccountScopeStore(adapter);
  const handle = await store.open({ kind: 'account', uid, scopeKey: `account:${uid}` }, fence);
  const outbox = createAccountSyncOutbox(handle, { nowMs: () => nowMs });
  await outbox.enqueue({
    ownerUid: uid,
    operation: {
      schemaVersion: 1, operationId: 'op-1', entityType: 'flashcard', entityId: 'entity/op-1',
      clientSequence: 1, baseRevision: 4, payload: { op: 'upsert', fields: { front: 'x' } },
    },
  }, fence);
  await store.close(fence);
}

async function settle(): Promise<void> {
  for (let index = 0; index < 60; index += 1) await new Promise((resolve) => setImmediate(resolve));
}

class DiscoveringAdapter extends MemoryScopeStorageAdapter {
  constructor(private readonly events: string[], private readonly pending: readonly string[]) { super(); }

  readonly knownSeen: (readonly string[])[] = [];
  failErase = false;

  async discoverPendingEraseUids(known: readonly string[] = []): Promise<readonly string[]> {
    this.events.push('discover');
    this.knownSeen.push(known);
    return this.pending;
  }

  override async eraseClosedAccountScope(scope: Parameters<ScopeStorageAdapter['eraseClosedAccountScope']>[0]) {
    this.events.push(`erase:${scope.uid}`);
    if (this.failErase) throw new Error('io');
    return super.eraseClosedAccountScope(scope);
  }
}

function controllerWith(adapter: ScopeStorageAdapter | null, secure: ReturnType<typeof secureStore>, events: string[], clock = { now: 1_000 }) {
  const latch = createAccountDetachLatch(secure);
  const ports = {
    isEnabled: () => true,
    createStorageAdapter: () => adapter,
    latch: {
      read: latch.read,
      mark: latch.mark,
      clear: latch.clear,
      reset: async () => { events.push('reset'); return latch.reset(); },
    },
    callSync: jest.fn(async () => { throw Object.assign(new Error('x'), { code: 'unauthenticated', details: { final: false } }); }),
    currentAuthUid: jest.fn(() => A as string | null),
    newNonce: () => 'nonce',
    setTimer: () => 1,
    clearTimer: () => undefined,
    nowMs: () => clock.now,
    random: () => 0,
  } satisfies AccountsV2ClientPorts;
  return { controller: createAccountsV2ClientController(ports), ports };
}

describe('account v2 client tails 6C', () => {
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  beforeEach(() => {
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => { log.mockRestore(); warn.mockRestore(); jest.dontMock('react-native'); });

  test('corrupt latch: pending erases found by storage run BEFORE the reset', async () => {
    const events: string[] = [];
    const secure = secureStore();
    secure.map.set(ACCOUNTS_V2_DETACH_LATCH_KEY, '{broken');
    const { controller } = controllerWith(new DiscoveringAdapter(events, [B]), secure, events);
    await controller.setAuthUid(A);
    await settle();
    expect(events).toEqual(['discover', `erase:${B}`, 'reset']);
    expect(secure.map.has(ACCOUNTS_V2_DETACH_LATCH_KEY)).toBe(false);
    expect(controller.status().uid).toBeNull();
  });

  test('corrupt latch: a FAILED pending erase keeps the uid latched (no reset; 6D: rewritten as a valid latch)', async () => {
    const events: string[] = [];
    const secure = secureStore();
    secure.map.set(ACCOUNTS_V2_DETACH_LATCH_KEY, '{broken');
    const adapter = new DiscoveringAdapter(events, [B]);
    adapter.failErase = true;
    const { controller } = controllerWith(adapter, secure, events);
    await controller.setAuthUid(A);
    await settle();
    expect(events).toEqual(['discover', `erase:${B}`]);
    // Пакет 6D (хвост 6C P3): B не теряется, но битая запись больше не блокирует V2 навсегда.
    expect(JSON.parse(secure.map.get(ACCOUNTS_V2_DETACH_LATCH_KEY)!)).toEqual({ v: 1, uids: [B] });
  });

  test('corrupt latch: discovery is given the uids this process knows (current + deleted)', async () => {
    const events: string[] = [];
    const secure = secureStore();
    secure.map.set(ACCOUNTS_V2_DETACH_LATCH_KEY, '{broken');
    const adapter = new DiscoveringAdapter(events, []);
    const { controller } = controllerWith(adapter, secure, events);
    await controller.setAuthUid(A);
    await settle();
    expect(adapter.knownSeen).toEqual([[A]]);
  });

  test('corrupt latch without storage: no pass possible, so NO reset (stays fail-closed)', async () => {
    const events: string[] = [];
    const secure = secureStore();
    secure.map.set(ACCOUNTS_V2_DETACH_LATCH_KEY, '{broken');
    const { controller } = controllerWith(null, secure, events);
    await controller.setAuthUid(A);
    await settle();
    expect(events).toEqual([]);
    expect(secure.map.get(ACCOUNTS_V2_DETACH_LATCH_KEY)).toBe('{broken');
  });

  test('V2 deletion key is bound to the lock operationId and cleared only by that lock', async () => {
    const store = secureStore();
    const credential = await createAccountsV2DeletionCredential((count) => Uint8Array.from(randomBytes(count)));
    await expect(persistAccountsV2DeletionCredential(store, credential, 'lock-op-1')).resolves.toBe(true);
    await expect(readAccountsV2DeletionCredential(store, 'lock-op-1')).resolves.toEqual(credential);
    await expect(readAccountsV2DeletionCredential(store, 'lock-op-2')).resolves.toBeNull();
    await expect(clearAccountsV2DeletionCredential(store, 'lock-op-2')).resolves.toBe(false);
    expect(store.map.has(ACCOUNTS_V2_DELETION_CREDENTIAL_KEY)).toBe(true);
    await expect(clearAccountsV2DeletionCredential(store, 'lock-op-1')).resolves.toBe(true);
    expect(store.map.has(ACCOUNTS_V2_DELETION_CREDENTIAL_KEY)).toBe(false);
    await expect(clearAccountsV2DeletionCredential(store, 'lock-op-1')).resolves.toBe(true);
  });

  test('legacy unbound (v1) key is never handed out and is removed by the first clear', async () => {
    const store = secureStore();
    const credential = await createAccountsV2DeletionCredential((count) => Uint8Array.from(randomBytes(count)));
    store.map.set(ACCOUNTS_V2_DELETION_CREDENTIAL_KEY, JSON.stringify({ v: 1, ...credential }));
    await expect(readAccountsV2DeletionCredential(store, 'lock-op-1')).resolves.toBeNull();
    await expect(clearAccountsV2DeletionCredential(store, 'lock-op-1')).resolves.toBe(true);
    expect(store.map.has(ACCOUNTS_V2_DELETION_CREDENTIAL_KEY)).toBe(false);
  });

  test('a stopped session is restarted at most once per window, not on every return', async () => {
    const events: string[] = [];
    const clock = { now: 1_800_000_000_000 };
    const adapter = new MemoryScopeStorageAdapter();
    await seed(adapter, A, clock.now);
    const { controller, ports } = controllerWith(adapter, secureStore(), events, clock);
    // Старт = 2 сверки uid, третья — в момент отправки. B на отправке → reauth → отправка встала.
    ports.currentAuthUid
      .mockImplementationOnce(() => A).mockImplementationOnce(() => A).mockImplementationOnce(() => B)
      .mockImplementationOnce(() => A).mockImplementationOnce(() => A).mockImplementationOnce(() => B)
      .mockImplementation(() => A);
    await controller.setAuthUid(A);
    await settle();
    expect(controller.status()).toMatchObject({ uid: A, sending: false });
    const afterFirst = adapter.openCalls.length;
    await controller.setAuthUid(A); // первый возврат — перезапуск (и снова встал)
    await settle();
    expect(adapter.openCalls.length).toBe(afterFirst + 1);
    expect(controller.status().sending).toBe(false);
    for (let index = 0; index < 3; index += 1) {
      await controller.setAuthUid(A); // возвраты в окне — без перезапуска
      await settle();
    }
    expect(adapter.openCalls.length).toBe(afterFirst + 1);
    expect(ports.callSync).not.toHaveBeenCalled();
    const lines = log.mock.calls.map((args) => args.join(' '));
    expect(lines.filter((line) => line.includes('[ACCOUNT-V2] lifecycle resume_throttled'))).toHaveLength(3);
    clock.now += 120_001;
    await controller.setAuthUid(A); // окно прошло — перезапуск разрешён
    await settle();
    expect(adapter.openCalls.length).toBe(afterFirst + 2);
  });

  test('auth flow: key read/created with the lock operationId and cleared once the server accepted', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'auth_provider.ts'), 'utf8');
    const retryStart = source.indexOf('async function ensureAccountDeleteCredentialSafe(');
    const retry = source.slice(retryStart, source.indexOf('async function waitForPostDeleteAuthHydration(', retryStart));
    expect(retry).toContain('readStoredAccountsV2DeletionCredentialIfEnabled(lock.operationId)');
    const ack = retry.indexOf('ack.authReleased === true && ack.credentialSafe === true');
    const clearAfterAck = retry.indexOf('clearStoredAccountsV2DeletionCredentialIfEnabled(lock.operationId)');
    expect(ack).toBeGreaterThan(0);
    expect(clearAfterAck).toBeGreaterThan(ack);
    expect(source).toContain('pendingDeleteLock?.operationId ?? null,');
    const enqueued = source.indexOf("'server_enqueued',");
    const advancedOk = source.indexOf('localExitLock = advanced.lock;', enqueued);
    const clearAfterEnqueue = source.indexOf('clearStoredAccountsV2DeletionCredentialIfEnabled(pendingDeleteLock.operationId)', advancedOk);
    expect(enqueued).toBeGreaterThan(0);
    expect(clearAfterEnqueue).toBeGreaterThan(advancedOk);
    expect(clearAfterEnqueue - advancedOk).toBeLessThan(300);
    // Ветка «ответ потерян → ждём квитанцию» тоже снимает ключ — только при успехе.
    const waitAt = retry.indexOf('waitForAccountDeletionCredentialSafe(proof)');
    const waitTail = retry.slice(waitAt, waitAt + 400);
    expect(waitTail).toContain('if (safe) clearStoredAccountsV2DeletionCredentialIfEnabled(lock.operationId);');
    // Аноним: ключ снимается только после ответа сервера, а не сразу после отправки.
    const anonStart = source.indexOf('void cloudDeleteEnqueueOperation.acknowledgment', advancedOk);
    const anonThen = source.slice(anonStart, source.indexOf('.catch(', anonStart));
    expect(anonThen).toContain('clearStoredAccountsV2DeletionCredentialAfterAckIfEnabled(null, ack)');
    const dispatchAt = source.indexOf('await cloudDeleteEnqueueOperation.dispatchSettled;', anonStart);
    expect(source.slice(dispatchAt, dispatchAt + 200)).not.toContain('clearStoredAccountsV2DeletionCredentialIfEnabled');
  });

  test('clear waits for an in-flight key write of the same lock (FAST_WAIT race)', async () => {
    jest.resetModules();
    const secure = new Map<string, string>();
    let releaseWrite!: () => void;
    const writeGate = new Promise<void>((resolve) => { releaseWrite = resolve; });
    jest.doMock('expo-secure-store', () => ({
      getItemAsync: async (key: string) => secure.get(key) ?? null,
      setItemAsync: async (key: string, value: string) => {
        if (key === 'accounts_v2_deletion_credential_v1') await writeGate;
        secure.set(key, value);
      },
      deleteItemAsync: async (key: string) => { secure.delete(key); },
    }));
    const nodeCrypto = jest.requireActual('crypto') as typeof import('crypto');
    jest.doMock('expo-crypto', () => ({
      getRandomBytesAsync: async (count: number) => Uint8Array.from(nodeCrypto.randomBytes(count)),
      randomUUID: () => nodeCrypto.randomUUID(),
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const runtime = require('../modules/account-session-v2/accounts_v2_client_runtime') as
      typeof import('../modules/account-session-v2/accounts_v2_client_runtime');
    const pending = runtime.beginAccountsV2Deletion(A, () => true, 'lock-op-1');
    const clearing = runtime.clearStoredAccountsV2DeletionCredential('lock-op-1');
    await settle();
    releaseWrite();
    await pending;
    await expect(clearing).resolves.toBe(true);
    expect(secure.has('accounts_v2_deletion_credential_v1')).toBe(false);
    jest.dontMock('expo-secure-store');
    jest.dontMock('expo-crypto');
  });

  test('iOS: the native storage environment is null with a log (never opened)', () => {
    jest.resetModules();
    jest.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createExpoAccountNativeEnvironment } = require('../modules/account-session-v2/native/account_native_expo_environment') as
      typeof import('../modules/account-session-v2/native/account_native_expo_environment');
    expect(createExpoAccountNativeEnvironment()).toBeNull();
    const lines = warn.mock.calls.map((args) => args.join(' '));
    expect(lines.some((line) => line.includes('[ACCOUNT-V2] storage platform_unproven os=ios'))).toBe(true);
  });
});
