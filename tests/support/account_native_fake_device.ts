import { createHash, randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import type {
  AccountNativeEnvironment,
  AccountNativeSqliteDatabase,
} from '../../modules/account-session-v2/native/account_native_environment';

/*
 * Общее фейковое «устройство» для тестов адаптера области Account V2.
 *
 * зачем (Пакет 6H): вынесено из account_native_scope_adapter_v2.test.ts без
 * изменения поведения, чтобы iOS-тесты (защита семейства файлов, проба iPhone)
 * гоняли ту же модель базы/ключа/аренды, а не её копию. iOS-режим включается
 * полем `iosProtect` — по умолчанию выключен, Android-тесты видят прежний фейк.
 */

export const ROOT = path.resolve(__dirname, '..', '..');
export const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/account-native-storage-v2-manifest.json'), 'utf8')) as unknown;
export const SQL_LIST_SCHEMA = 'SELECT type, name, tbl_name, sql FROM sqlite_schema WHERE substr(name, 1, 7) <> ? ORDER BY type, name';

type Row = Readonly<Record<string, null | number | string>>;
type DbState = { key: string | null; schema: Row[]; metadata: Row[]; records: Map<string, string> };

export class FakeDevice {
  readonly files = new Map<string, DbState>();
  readonly sidecars = new Set<string>();
  readonly secure = new Map<string, string>();
  readonly events: string[] = [];
  secureWrites = 0;
  cipherAvailable = true;
  failDeleteOnce: string | null = null;
  failRemovePrefixOnce: string | null = null;
  unpatchedNative = false;
  /** iOS-режим: блокировка несёт protectFamily (патч Swift: бэкап-исключение + file protection). */
  iosProtect = false;
  /** Номер вызова protectFamily (с 1), который должен упасть; null — не падать. */
  failProtectCall: number | null = null;
  protectCalls = 0;
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
        const release = async () => { this.heldLocks.delete(name); this.events.push('lock.release'); };
        if (!this.iosProtect) return Object.freeze({ release });
        return Object.freeze({
          release,
          protectFamily: async () => {
            this.protectCalls += 1;
            this.events.push(`lock.protect:${this.files.has(name) ? 'db_present' : 'db_absent'}`);
            if (this.failProtectCall === this.protectCalls) throw new Error('account_native_provision_family_protection_failed');
          },
        });
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
