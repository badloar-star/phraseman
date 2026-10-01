import { randomBytes } from 'crypto';
import {
  ACCOUNTS_V2_DELETION_CREDENTIAL_KEY,
  createAccountsV2DeletionCredential,
  encodeBase64Url,
  isStrongAccountsV2Capability,
  isValidAccountsV2DeletionOperationId,
  persistAccountsV2DeletionCredential,
  readAccountsV2DeletionCredential,
  type AccountsV2SecureStorePort,
} from '../modules/account-session-v2/account_deletion_credential';
import { ACCOUNTS_V2_DETACH_LATCH_KEY, createAccountDetachLatch } from '../modules/account-session-v2/account_detach_latch';

/*
 * Account V2, Пакет 6B — ключ удаления (формат сервера 6A) и защёлка отсоединения на диске.
 */

function secureStore(): AccountsV2SecureStorePort & { map: Map<string, string>; failWrites: boolean } {
  const map = new Map<string, string>();
  const store = {
    map,
    failWrites: false,
    getItemAsync: async (key: string) => map.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => {
      if (store.failWrites) throw new Error('keychain_unavailable');
      map.set(key, value);
    },
    deleteItemAsync: async (key: string) => { map.delete(key); },
  };
  return store;
}

/** Серверная проверка (functions/src/accounts_v2_deletion/receipt.ts) через Buffer. */
function serverAccepts(capability: string): boolean {
  if (!/^[A-Za-z0-9_-]{43}$/.test(capability)) return false;
  const bytes = Buffer.from(capability, 'base64url');
  return bytes.length === 32 && bytes.toString('base64url') === capability && new Set(bytes).size >= 12;
}

describe('account deletion credential v2', () => {
  let warn: jest.SpyInstance;
  let log: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => { warn.mockRestore(); log.mockRestore(); });

  test('base64url encoder matches Node for every tail length', () => {
    for (let length = 0; length < 70; length += 1) {
      const bytes = randomBytes(length);
      expect(encodeBase64Url(Uint8Array.from(bytes))).toBe(bytes.toString('base64url'));
    }
  });

  test('generated capability is exactly what the server accepts; operationId fits the server shape', async () => {
    for (let run = 0; run < 25; run += 1) {
      const credential = await createAccountsV2DeletionCredential((count) => Uint8Array.from(randomBytes(count)));
      expect(credential.capability).toHaveLength(43);
      expect(serverAccepts(credential.capability)).toBe(true);
      expect(isStrongAccountsV2Capability(credential.capability)).toBe(true);
      expect(isValidAccountsV2DeletionOperationId(credential.operationId)).toBe(true);
      expect(credential.operationId).not.toContain('/');
    }
  });

  test('client capability check agrees with the server on edge cases', () => {
    const strong = randomBytes(32).toString('base64url');
    const cases = [
      strong,
      Buffer.alloc(32).toString('base64url'), // нули — слабый
      Buffer.alloc(32, 7).toString('base64url'), // один байт — слабый
      `${strong.slice(0, 42)}B`, // неканонический хвост
      randomBytes(32).toString('base64'), // другой алфавит/паддинг
      randomBytes(32).toString('hex'), // старый hex-ключ
      randomBytes(31).toString('base64url'),
    ];
    for (const value of cases) expect(isStrongAccountsV2Capability(value)).toBe(serverAccepts(value));
  });

  test('weak or broken randomness never yields a key', async () => {
    await expect(createAccountsV2DeletionCredential((count) => new Uint8Array(count)))
      .rejects.toThrow('accounts_v2_credential_generation_failed');
    await expect(createAccountsV2DeletionCredential(() => new Uint8Array(3)))
      .rejects.toThrow('accounts_v2_credential_generation_failed');
  });

  test('credential round-trips through SecureStore; broken record reads as null', async () => {
    const store = secureStore();
    const credential = await createAccountsV2DeletionCredential((count) => Uint8Array.from(randomBytes(count)));
    await expect(persistAccountsV2DeletionCredential(store, credential, 'lock-op-1')).resolves.toBe(true);
    await expect(readAccountsV2DeletionCredential(store, 'lock-op-1')).resolves.toEqual(credential);
    store.map.set(ACCOUNTS_V2_DELETION_CREDENTIAL_KEY, '{"v":2,"bindingId":"lock-op-1","operationId":"short","capability":"x"}');
    await expect(readAccountsV2DeletionCredential(store, 'lock-op-1')).resolves.toBeNull();
    store.failWrites = true;
    await expect(persistAccountsV2DeletionCredential(store, credential, 'lock-op-1')).resolves.toBe(false);
  });

  test('the secret never reaches the logs', async () => {
    const store = secureStore();
    const credential = await createAccountsV2DeletionCredential((count) => Uint8Array.from(randomBytes(count)));
    store.failWrites = true;
    await persistAccountsV2DeletionCredential(store, credential, 'lock-op-1');
    const lines = [...warn.mock.calls, ...log.mock.calls].map((args) => args.join(' '));
    expect(lines.some((line) => line.includes(credential.capability) || line.includes(credential.operationId))).toBe(false);
  });
});

describe('account detach latch v2', () => {
  let warn: jest.SpyInstance;
  let log: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => { warn.mockRestore(); log.mockRestore(); });

  test('mark survives a new latch instance (restart) and clear removes the record', async () => {
    const store = secureStore();
    await expect(createAccountDetachLatch(store).mark('uid-a')).resolves.toBe(true);
    const afterRestart = createAccountDetachLatch(store);
    await expect(afterRestart.read()).resolves.toEqual({ ok: true, uids: ['uid-a'] });
    await expect(afterRestart.clear('uid-a')).resolves.toBe(true);
    expect(store.map.has(ACCOUNTS_V2_DETACH_LATCH_KEY)).toBe(false);
  });

  test('concurrent marks do not overwrite each other', async () => {
    const store = secureStore();
    const latch = createAccountDetachLatch(store);
    await Promise.all([latch.mark('uid-a'), latch.mark('uid-b'), latch.mark('uid-c')]);
    await expect(latch.read()).resolves.toEqual({ ok: true, uids: ['uid-a', 'uid-b', 'uid-c'] });
  });

  test('corrupt record reads as NOT ok (fail-closed), clear refuses to touch it', async () => {
    const store = secureStore();
    store.map.set(ACCOUNTS_V2_DETACH_LATCH_KEY, '{not json');
    const latch = createAccountDetachLatch(store);
    await expect(latch.read()).resolves.toEqual({ ok: false, code: 'latch_corrupt' });
    await expect(latch.clear('uid-a')).resolves.toBe(false);
    await expect(latch.mark('uid-a')).resolves.toBe(true);
    await expect(latch.read()).resolves.toEqual({ ok: true, uids: ['uid-a'] });
  });

  test('reset removes a corrupt record so the latch reads empty again', async () => {
    const store = secureStore();
    store.map.set(ACCOUNTS_V2_DETACH_LATCH_KEY, '{"v":2}');
    const latch = createAccountDetachLatch(store);
    await expect(latch.read()).resolves.toEqual({ ok: false, code: 'latch_corrupt' });
    await expect(latch.reset()).resolves.toBe(true);
    await expect(latch.read()).resolves.toEqual({ ok: true, uids: [] });
  });

  test('write failure reports false', async () => {
    const store = secureStore();
    store.failWrites = true;
    await expect(createAccountDetachLatch(store).mark('uid-a')).resolves.toBe(false);
  });
});
