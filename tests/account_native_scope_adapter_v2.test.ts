import { createHash, randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import type { SessionFence } from '../modules/account-session-v2/account_session';
import { createAccountScopeStore } from '../modules/account-session-v2/account_scope_store';
import { createAccountDetachLatch } from '../modules/account-session-v2/account_detach_latch';
import { createAccountsV2ClientController } from '../modules/account-session-v2/account_v2_client_session';
import type {
  AccountNativeEnvironment,
  AccountNativeSqliteDatabase,
} from '../modules/account-session-v2/native/account_native_environment';
import { createAccountNativeScopeAdapter } from '../modules/account-session-v2/native/account_native_scope_adapter';

/*
 * Account V2, Пакет 6C — адаптер хранилища области поверх принятых нативных частей.
 *
 * Фейковое «устройство»: файлы базы с ключом SQLCipher (чужой ключ → «file is
 * not a database»), транзакции, которые публикует только commit аренды, и
 * SecureStore. Проверяем: открытие/переоткрытие после «перезапуска», отказ при
 * чужом ключе и без SQLCipher (клиент тогда не пишет), стирание по пакету §5 с
 * продолжением после сбоя, `already_absent` без единой записи.
 */

const ROOT = path.resolve(__dirname, '..');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/account-native-storage-v2-manifest.json'), 'utf8')) as unknown;
const A = 'uid-a';
const SQL_LIST_SCHEMA = 'SELECT type, name, tbl_name, sql FROM sqlite_schema WHERE substr(name, 1, 7) <> ? ORDER BY type, name';

type Row = Readonly<Record<string, null | number | string>>;
type DbState = { key: string | null; schema: Row[]; metadata: Row[]; records: Map<string, string> };

class FakeDevice {
  readonly files = new Map<string, DbState>();
  readonly sidecars = new Set<string>();
  readonly secure = new Map<string, string>();
  readonly events: string[] = [];
  secureWrites = 0;
  cipherAvailable = true;
  failDeleteOnce: string | null = null;
  failRemovePrefixOnce: string | null = null;
  unpatchedNative = false;
  plainCloses = 0;
  readonly heldLocks = new Set<string>();
  closes = 0;

  env(): AccountNativeEnvironment {
    return Object.freeze({
      manifest: MANIFEST,
      digestSha256: async (value: string) => createHash('sha256').update(value).digest('hex'),
      secure: Object.freeze({
        get: async (key: string) => this.secure.get(key) ?? null,
        set: async (key: string, value: string) => { this.secureWrites += 1; this.secure.set(key, value); },
        remove: async (key: string) => {
          if (this.failRemovePrefixOnce !== null && key.startsWith(this.failRemovePrefixOnce)) {
            this.failRemovePrefixOnce = null;
            throw new Error('keychain_io');
          }
          this.secureWrites += 1;
          this.secure.delete(key);
        },
      }),
      randomKeyBytes: async () => new Uint8Array(randomBytes(32)),
      acquireProvisionLock: async (name: string) => {
        if (this.heldLocks.has(name)) throw new Error('account_native_provision_lock_failed');
        this.heldLocks.add(name);
        this.events.push('lock.acquire');
        return Object.freeze({ release: async () => { this.heldLocks.delete(name); this.events.push('lock.release'); } });
      },
      fileExists: async (name: string) => this.files.has(name) || this.sidecars.has(name),
      deleteFile: async (name: string) => {
        if (this.failDeleteOnce === name) { this.failDeleteOnce = null; throw new Error('io_failed'); }
        this.files.delete(name);
        this.sidecars.delete(name);
      },
      listFileNames: async () => [...this.files.keys(), ...this.sidecars],
      openDatabase: async (name: string) => this.open(name),
    });
  }

  private open(name: string): AccountNativeSqliteDatabase {
    if (!this.files.has(name)) this.files.set(name, { key: null, schema: [], metadata: [], records: new Map() });
    const file = this.files.get(name)!;
    let key: string | null = null;
    let staged: { schema: Row[]; metadata: Row[]; records: Map<string, string> } | null = null;
    let revoked = false;
    let closed = false;
    const keyed = (): void => {
      if (closed) throw new Error('closed');
      if (key === null || (file.key !== null && file.key !== key)) throw new Error('file is not a database');
      if (file.key === null) file.key = key;
    };
    const view = () => staged ?? file;
    const device = this;
    if (this.unpatchedNative) {
      // Сборка без патча аренды: у нативной базы нет методов аренды, закрывается обычным closeAsync.
      return Object.freeze({
        nativeDatabase: Object.freeze({}),
        closeAsync: async () => { device.plainCloses += 1; },
        execAsync: async () => undefined,
        getFirstAsync: async () => null,
        getAllAsync: async () => [],
        runAsync: async () => ({ changes: 0 }),
      }) as unknown as AccountNativeSqliteDatabase;
    }
    return Object.freeze({
      nativeDatabase: Object.freeze({
        revokeAccountLeaseSync(): undefined { revoked = true; return undefined; },
        async commitAccountLeaseAsync(): Promise<string> {
          if (revoked) return 'revoked';
          if (staged !== null) {
            file.schema = staged.schema; file.metadata = staged.metadata; file.records = staged.records;
            staged = null;
          }
          return 'committed';
        },
        async closeAccountLeaseAsync(): Promise<undefined> { closed = true; device.closes += 1; return undefined; },
      }),
      execAsync: async (source: string) => {
        const match = /^PRAGMA key = "x'([0-9a-f]{64})'"$/.exec(source);
        if (match === null) throw new Error('unexpected exec');
        key = match[1];
      },
      getFirstAsync: async (source: string, params: readonly (null | number | string)[]) => {
        if (source === 'PRAGMA cipher_version') return this.cipherAvailable ? { cipher_version: '4.6.1 community' } : null;
        keyed();
        if (source === 'SELECT count(*) AS table_count FROM sqlite_schema') return { table_count: file.schema.length };
        if (source.startsWith('SELECT record_key, value_json')) {
          const value = view().records.get(String(params[0]));
          return value === undefined ? null : { record_key: String(params[0]), value_json: value };
        }
        throw new Error('unexpected first');
      },
      getAllAsync: async (source: string) => {
        keyed();
        if (source === SQL_LIST_SCHEMA) return [...view().schema];
        if (source.startsWith('SELECT singleton')) return [...view().metadata];
        throw new Error('unexpected all');
      },
      runAsync: async (source: string, params: readonly (null | number | string)[]) => {
        keyed();
        if (source === 'BEGIN IMMEDIATE') {
          staged = { schema: [...file.schema], metadata: [...file.metadata], records: new Map(file.records) };
        } else if (source === 'ROLLBACK') {
          staged = null;
        } else if (source.startsWith('CREATE TABLE account_scope_metadata_v1')) {
          view().schema.push({ type: 'table', name: 'account_scope_metadata_v1', tbl_name: 'account_scope_metadata_v1', sql: source });
        } else if (source.startsWith('CREATE TABLE account_scope_records_v1')) {
          view().schema.push({ type: 'table', name: 'account_scope_records_v1', tbl_name: 'account_scope_records_v1', sql: source });
        } else if (source.startsWith('INSERT INTO account_scope_metadata_v1')) {
          const keys = ['singleton', 'schema_version', 'manifest_version', 'namespace', 'scope_key',
            'identity_kind', 'identity_hash', 'persistent_lineage', 'database_selector'];
          view().metadata.push(Object.fromEntries(keys.map((k, i) => [k, params[i]])));
        } else if (source.startsWith('INSERT INTO account_scope_records_v1')) {
          view().records.set(String(params[0]), String(params[1]));
        } else if (source.startsWith('DELETE FROM account_scope_records_v1')) {
          view().records.delete(String(params[0]));
        } else {
          throw new Error('unexpected run');
        }
        return { changes: 1, lastInsertRowId: 0 };
      },
    });
  }

  keyNames(): string[] { return [...this.secure.keys()].filter((key) => key.startsWith('accounts_v2_account_key_')); }
  lineage(): unknown {
    const entry = [...this.secure.entries()].find(([key]) => key.startsWith('accounts_v2_account_lineage_'));
    return entry === undefined ? null : JSON.parse(entry[1]);
  }
  markers(): string[] { return [...this.secure.keys()].filter((key) => key.startsWith('accounts_v2_account_retire_')); }
}

function fence(uid: string, generation: number): SessionFence {
  return Object.freeze({ scopeKey: `account:${uid}`, uid, generation, nonce: `n-${generation}` });
}

const scopeA = Object.freeze({ kind: 'account' as const, uid: A, scopeKey: `account:${A}` as const });

async function writeRecord(device: FakeDevice, generation: number, key: string, value: string): Promise<void> {
  const store = createAccountScopeStore(createAccountNativeScopeAdapter(device.env()));
  const handle = await store.open(scopeA, fence(A, generation));
  await handle.withTransaction(async (tx) => { await tx.putRecord({ key, value }); });
  await store.close(fence(A, generation));
}

async function readRecord(device: FakeDevice, generation: number, key: string): Promise<unknown> {
  const store = createAccountScopeStore(createAccountNativeScopeAdapter(device.env()));
  const handle = await store.open(scopeA, fence(A, generation));
  const record = await handle.readRecord(key);
  await store.close(fence(A, generation));
  return record?.value ?? null;
}

describe('account native scope adapter v2 (Пакет 6C)', () => {
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  beforeEach(() => {
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => { log.mockRestore(); warn.mockRestore(); });

  test('first open provisions key + lineage + keyed DB; data survives a restart (new adapter)', async () => {
    const device = new FakeDevice();
    await writeRecord(device, 1, 'k1', 'hello');
    expect(device.keyNames()).toHaveLength(1);
    expect(device.secure.get(device.keyNames()[0])).toMatch(/^[0-9a-f]{64}$/);
    expect(device.lineage()).toEqual({ v: 1, value: 1, state: 'active' });
    expect([...device.files.keys()]).toEqual([expect.stringMatching(/^accounts-v2-a-[0-9a-f]{64}-1\.db$/)]);
    expect(device.heldLocks.size).toBe(0);
    await expect(readRecord(device, 2, 'k1')).resolves.toBe('hello');
    expect(device.closes).toBe(2);
  });

  test('foreign key in SecureStore: open is refused, nothing is overwritten, connection closed, lock released', async () => {
    const device = new FakeDevice();
    await writeRecord(device, 1, 'k1', 'hello');
    const keyName = device.keyNames()[0];
    device.secure.set(keyName, 'f'.repeat(64));
    const writesBefore = device.secureWrites;
    const store = createAccountScopeStore(createAccountNativeScopeAdapter(device.env()));
    await expect(store.open(scopeA, fence(A, 2))).rejects.toMatchObject({ code: 'account_scope_open_failed' });
    expect(device.secure.get(keyName)).toBe('f'.repeat(64));
    expect(device.secureWrites).toBe(writesBefore);
    expect(device.files.get([...device.files.keys()][0])!.records.get('k1')).toBe('"hello"');
    expect(device.heldLocks.size).toBe(0);
    expect(device.closes).toBe(2);
  });

  test('no SQLCipher in the build: proof fails, no lineage is published', async () => {
    const device = new FakeDevice();
    device.cipherAvailable = false;
    const store = createAccountScopeStore(createAccountNativeScopeAdapter(device.env()));
    await expect(store.open(scopeA, fence(A, 1))).rejects.toMatchObject({ code: 'account_scope_open_failed' });
    expect(device.lineage()).toBeNull();
    const lines = warn.mock.calls.map((args) => args.join(' '));
    expect(lines.some((line) => line.includes('[ACCOUNT-V2] storage proof_failed reason=cipher_missing'))).toBe(true);
  });

  test('broken manifest: adapter construction throws (client then reports storage unavailable)', () => {
    const device = new FakeDevice();
    expect(() => createAccountNativeScopeAdapter({ ...device.env(), manifest: { manifestVersion: 2 } })).toThrow();
  });

  test('guest scopes are refused without creating files', async () => {
    const device = new FakeDevice();
    const adapter = createAccountNativeScopeAdapter(device.env());
    await expect(adapter.open({ kind: 'guest', installationId: 'i-1', scopeKey: 'guest:i-1' })).rejects.toMatchObject({
      code: 'account_native_scope_guest_unsupported',
    });
    expect(device.files.size).toBe(0);
  });

  test('erase follows §5: lineage → erased_empty(2), key/DB family/marker absent; reopen starts a fresh lineage', async () => {
    const device = new FakeDevice();
    await writeRecord(device, 1, 'k1', 'hello');
    const dbName = [...device.files.keys()][0];
    device.sidecars.add(`${dbName}-wal`);
    const store = createAccountScopeStore(createAccountNativeScopeAdapter(device.env()));
    const evidence = await store.eraseClosedAccountScope(scopeA);
    expect(evidence).toMatchObject({ outcome: 'erased', evidenceKind: 'native_manifest', manifestVersion: 1, scopeKey: `account:${A}` });
    expect(device.keyNames()).toEqual([]);
    expect(device.files.size).toBe(0);
    expect(device.sidecars.size).toBe(0);
    expect(device.markers()).toEqual([]);
    expect(device.lineage()).toEqual({ v: 1, value: 2, state: 'erased_empty' });
    // Повторное открытие — новая пустая база линии 2, старые данные не воскресают.
    await expect(readRecord(device, 2, 'k1')).resolves.toBeNull();
    expect(device.lineage()).toEqual({ v: 1, value: 2, state: 'active' });
    expect([...device.files.keys()]).toEqual([expect.stringMatching(/-2\.db$/)]);
  });

  test('a scope V2 never created erases as already_absent with ZERO SecureStore writes', async () => {
    const device = new FakeDevice();
    const store = createAccountScopeStore(createAccountNativeScopeAdapter(device.env()));
    await expect(store.eraseClosedAccountScope(scopeA)).resolves.toMatchObject({ outcome: 'already_absent' });
    expect(device.secureWrites).toBe(0);
  });

  test('erase interrupted mid-way keeps the marker; discovery finds the uid; the next erase finishes', async () => {
    const device = new FakeDevice();
    await writeRecord(device, 1, 'k1', 'hello');
    device.failDeleteOnce = [...device.files.keys()][0];
    const adapter = createAccountNativeScopeAdapter(device.env());
    await expect(adapter.eraseClosedAccountScope(scopeA)).rejects.toBeTruthy();
    expect(device.markers()).toHaveLength(1);
    expect(device.keyNames()).toEqual([]);
    expect(device.heldLocks.size).toBe(0);
    await expect(adapter.discoverPendingEraseUids()).resolves.toEqual([A]);
    const restarted = createAccountNativeScopeAdapter(device.env());
    await expect(restarted.eraseClosedAccountScope(scopeA)).resolves.toMatchObject({ outcome: 'erased' });
    expect(device.markers()).toEqual([]);
    expect(device.files.size).toBe(0);
    await expect(restarted.discoverPendingEraseUids()).resolves.toEqual([]);
  });

  test('crash between files deleted (§5.5) and marker removed (§5.7): known uid is discovered; open finishes the erase', async () => {
    const device = new FakeDevice();
    await writeRecord(device, 1, 'k1', 'hello');
    device.failRemovePrefixOnce = 'accounts_v2_account_retire_';
    const adapter = createAccountNativeScopeAdapter(device.env());
    await expect(adapter.eraseClosedAccountScope(scopeA)).rejects.toBeTruthy();
    expect(device.files.size).toBe(0);
    expect(device.markers()).toHaveLength(1);
    // Файлов нет — по именам не найти; по известному uid — находится.
    await expect(adapter.discoverPendingEraseUids([])).resolves.toEqual([]);
    await expect(adapter.discoverPendingEraseUids([A, 'uid-z'])).resolves.toEqual([A]);
    // Открытие видит recovery_required → дочищает под той же очередью → открывает свежую линию.
    await expect(readRecord(device, 5, 'k1')).resolves.toBeNull();
    expect(device.markers()).toEqual([]);
    expect(device.lineage()).toEqual({ v: 1, value: 2, state: 'active' });
  });

  test('discovery attributes a family found only by a sidecar (-wal) name', async () => {
    const device = new FakeDevice();
    await writeRecord(device, 1, 'k1', 'hello');
    const dbName = [...device.files.keys()][0];
    device.failDeleteOnce = dbName;
    const adapter = createAccountNativeScopeAdapter(device.env());
    await expect(adapter.eraseClosedAccountScope(scopeA)).rejects.toBeTruthy();
    device.files.clear();
    device.sidecars.add(`${dbName}-wal`);
    await expect(adapter.discoverPendingEraseUids([])).resolves.toEqual([A]);
  });

  test('marker carries the manifest hash (§5.2)', async () => {
    const device = new FakeDevice();
    await writeRecord(device, 1, 'k1', 'hello');
    device.failDeleteOnce = [...device.files.keys()][0];
    await expect(createAccountNativeScopeAdapter(device.env()).eraseClosedAccountScope(scopeA)).rejects.toBeTruthy();
    const marker = JSON.parse(device.secure.get(device.markers()[0])!) as Record<string, unknown>;
    expect(marker.manifestHash).toMatch(/^[0-9a-f]{64}$/);
    expect(marker).toMatchObject({ v: 1, scopeKey: `account:${A}`, oldLineage: 1, nextLineage: 2, manifestVersion: 1 });
  });

  test('a corrupt marker is NOT absent: erase still retires the old lineage and removes it', async () => {
    const device = new FakeDevice();
    await writeRecord(device, 1, 'k1', 'hello');
    const hash = createHash('sha256').update(A).digest('hex');
    device.secure.set(`accounts_v2_account_retire_${hash}`, '{broken');
    await expect(createAccountNativeScopeAdapter(device.env()).eraseClosedAccountScope(scopeA))
      .resolves.toMatchObject({ outcome: 'erased' });
    expect(device.files.size).toBe(0);
    expect(device.keyNames()).toEqual([]);
    expect(device.markers()).toEqual([]);
  });

  test('corrupt marker after the lineage bump (§5.2 done): erase still removes the OLD lineage files', async () => {
    const device = new FakeDevice();
    await writeRecord(device, 1, 'k1', 'hello');
    device.failRemovePrefixOnce = 'accounts_v2_account_key_';
    await expect(createAccountNativeScopeAdapter(device.env()).eraseClosedAccountScope(scopeA)).rejects.toBeTruthy();
    expect(device.lineage()).toEqual({ v: 1, value: 2, state: 'erased_empty' });
    device.secure.set(device.markers()[0], '{broken');
    await expect(createAccountNativeScopeAdapter(device.env()).eraseClosedAccountScope(scopeA))
      .resolves.toMatchObject({ outcome: 'erased' });
    expect(device.files.size).toBe(0);
    expect(device.keyNames()).toEqual([]);
    expect(device.markers()).toEqual([]);
  });

  test('retirement is planned BEFORE the marker: an exhausted lineage writes no marker (§5.3)', async () => {
    const device = new FakeDevice();
    const hash = createHash('sha256').update(A).digest('hex');
    const max = Number.MAX_SAFE_INTEGER;
    device.secure.set(`accounts_v2_account_lineage_${hash}`, JSON.stringify({ v: 1, value: max, state: 'active' }));
    device.secure.set(`accounts_v2_account_key_${hash}_${max}`, 'a'.repeat(64));
    await expect(createAccountNativeScopeAdapter(device.env()).eraseClosedAccountScope(scopeA)).rejects.toBeTruthy();
    expect(device.markers()).toEqual([]);
  });

  test('lease binding cannot be created (unpatched build): the opened DB is closed, open refused', async () => {
    const device = new FakeDevice();
    device.unpatchedNative = true;
    const store = createAccountScopeStore(createAccountNativeScopeAdapter(device.env()));
    await expect(store.open(scopeA, fence(A, 1))).rejects.toMatchObject({ code: 'account_scope_open_failed' });
    expect(device.plainCloses).toBe(1);
    expect(device.heldLocks.size).toBe(0);
  });

  test('adapter failure ⇒ the V2 client never opens a scope and never sends', async () => {
    const device = new FakeDevice();
    await writeRecord(device, 1, 'k1', 'hello');
    device.secure.set(device.keyNames()[0], 'f'.repeat(64));
    const secure = new Map<string, string>();
    const callSync = jest.fn(async () => ({ data: {} }));
    const controller = createAccountsV2ClientController({
      isEnabled: () => true,
      createStorageAdapter: () => createAccountNativeScopeAdapter(device.env()),
      latch: createAccountDetachLatch({
        getItemAsync: async (key) => secure.get(key) ?? null,
        setItemAsync: async (key, value) => { secure.set(key, value); },
        deleteItemAsync: async (key) => { secure.delete(key); },
      }),
      callSync,
      currentAuthUid: () => A,
      newNonce: () => 'nonce',
      setTimer: () => 1,
      clearTimer: () => undefined,
    });
    await controller.setAuthUid(A);
    for (let index = 0; index < 40; index += 1) await new Promise((resolve) => setImmediate(resolve));
    expect(controller.status().uid).toBeNull();
    expect(callSync).not.toHaveBeenCalled();
    expect(device.files.get([...device.files.keys()][0])!.records.size).toBe(1);
  });

  test('logs carry the [ACCOUNT-V2] prefix and never the key, uid or scope hash', async () => {
    const device = new FakeDevice();
    await writeRecord(device, 1, 'k1', 'hello');
    const adapter = createAccountNativeScopeAdapter(device.env());
    await adapter.eraseClosedAccountScope(scopeA);
    const hash = createHash('sha256').update(A).digest('hex');
    const lines = [...log.mock.calls, ...warn.mock.calls].map((args) => args.join(' '));
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line.startsWith('[ACCOUNT-V2]')).toBe(true);
      expect(line).not.toContain(A);
      expect(line).not.toContain(hash);
    }
  });
});
