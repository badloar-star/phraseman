import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  ACCOUNT_SQLITE_SCOPE_SCHEMA,
  AccountSqliteScopeConnectionError,
  initializeNewAccountSqliteScopeConnection,
  verifyExistingAccountSqliteScopeConnection,
  type AccountSqliteColumn,
  type AccountSqliteParameterizedConnection,
  type AccountSqliteRow,
  type AccountSqliteScopeConnectionBundle,
  type AccountSqliteScopeConnectionErrorCode,
} from '../modules/account-session-v2/native/account_sqlite_scope_connection';
import type {
  AccountScopeTransaction,
  ScopeJson,
  ScopeRecord,
  ScopeStorageConnection,
} from '../modules/account-session-v2/account_scope_store';
import type {
  AccountSqliteLeaseBinding,
  AccountSqliteLeaseCommitOutcome,
} from '../modules/account-session-v2/native/account_sqlite_lease_binding';
import {
  planV2StorageArtifacts,
  validateAccountNativeStorageManifest,
  type AccountNativeStorageManifest,
  type V2StorageIdentity,
  type V2StoragePlan,
} from '../modules/account-session-v2/native_storage_manifest';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

const SQL = Object.freeze({
  begin: 'BEGIN IMMEDIATE',
  rollback: 'ROLLBACK',
  createMetadata: 'CREATE TABLE account_scope_metadata_v1 (singleton INTEGER PRIMARY KEY CHECK (singleton = 1), schema_version INTEGER NOT NULL, manifest_version INTEGER NOT NULL, namespace TEXT NOT NULL, scope_key TEXT NOT NULL, identity_kind TEXT NOT NULL, identity_hash TEXT NOT NULL, persistent_lineage INTEGER, database_selector TEXT NOT NULL) STRICT',
  createRecords: 'CREATE TABLE account_scope_records_v1 (record_key TEXT PRIMARY KEY NOT NULL, value_json TEXT NOT NULL) STRICT, WITHOUT ROWID',
  insertMetadata: 'INSERT INTO account_scope_metadata_v1 (singleton, schema_version, manifest_version, namespace, scope_key, identity_kind, identity_hash, persistent_lineage, database_selector) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  listSchema: 'SELECT type, name, tbl_name, sql FROM sqlite_schema WHERE substr(name, 1, 7) <> ? ORDER BY type, name',
  readMetadata: 'SELECT singleton, schema_version, manifest_version, namespace, scope_key, identity_kind, identity_hash, persistent_lineage, database_selector FROM account_scope_metadata_v1 ORDER BY singleton',
  readRecord: 'SELECT record_key, value_json FROM account_scope_records_v1 WHERE record_key = ?',
  putRecord: 'INSERT INTO account_scope_records_v1 (record_key, value_json) VALUES (?, ?) ON CONFLICT(record_key) DO UPDATE SET value_json = excluded.value_json',
  deleteRecord: 'DELETE FROM account_scope_records_v1 WHERE record_key = ?',
});

type SqlTag =
  | 'begin'
  | 'rollback'
  | 'create_metadata'
  | 'create_records'
  | 'insert_metadata'
  | 'list_schema'
  | 'read_metadata'
  | 'read_record'
  | 'put_record'
  | 'delete_record';

type Deferred<T> = Readonly<{
  promise: Promise<T>;
  resolve(value: T): void;
  reject(reason: unknown): void;
}>;

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return Object.freeze({ promise, resolve, reject });
}

function manifest(): AccountNativeStorageManifest {
  return validateAccountNativeStorageManifest(JSON.parse(readFileSync(
    join(process.cwd(), 'config/account-native-storage-v2-manifest.json'),
    'utf8',
  )));
}

function accountIdentity(): V2StorageIdentity {
  return Object.freeze({
    kind: 'account' as const,
    scopeKey: 'account:user-7' as const,
    hash: HASH_A,
    persistentLineage: 7,
  });
}

function guestIdentity(): V2StorageIdentity {
  return Object.freeze({
    kind: 'guest' as const,
    scopeKey: 'guest:install-7' as const,
    hash: HASH_B,
  });
}

function plan(identity: V2StorageIdentity = accountIdentity()): V2StoragePlan {
  return planV2StorageArtifacts(manifest(), identity);
}

function mainSelector(selected: V2StoragePlan): string {
  const artifact = selected.artifacts.find((candidate) => candidate.id
    === `v2.${selected.identity.kind}.db.main`);
  if (artifact === undefined) throw new Error('missing test main selector');
  return artifact.selector;
}

function metadataFor(selected: V2StoragePlan): Readonly<Record<string, AccountSqliteColumn>> {
  return Object.freeze({
    singleton: 1,
    schema_version: 1,
    manifest_version: selected.manifestVersion,
    namespace: 'account_native_storage_v2',
    scope_key: selected.scopeKey,
    identity_kind: selected.identity.kind,
    identity_hash: selected.identity.hash,
    persistent_lineage: selected.identity.kind === 'account'
      ? selected.identity.persistentLineage
      : null,
    database_selector: mainSelector(selected),
  });
}

function tagFor(sql: string): SqlTag {
  const entries: readonly Readonly<[SqlTag, string]>[] = [
    ['begin', SQL.begin],
    ['rollback', SQL.rollback],
    ['create_metadata', SQL.createMetadata],
    ['create_records', SQL.createRecords],
    ['insert_metadata', SQL.insertMetadata],
    ['list_schema', SQL.listSchema],
    ['read_metadata', SQL.readMetadata],
    ['read_record', SQL.readRecord],
    ['put_record', SQL.putRecord],
    ['delete_record', SQL.deleteRecord],
  ];
  const match = entries.find((entry) => entry[1] === sql);
  if (match === undefined) throw new Error('unexpected SQL text');
  return match[0];
}

type FakeState = {
  schemaPresent: boolean;
  metadata: Readonly<Record<string, AccountSqliteColumn>> | null;
  records: Map<string, string>;
};

function cloneState(state: FakeState): FakeState {
  return {
    schemaPresent: state.schemaPresent,
    metadata: state.metadata === null ? null : Object.freeze({ ...state.metadata }),
    records: new Map(state.records),
  };
}

class FakeParameterizedSql implements AccountSqliteParameterizedConnection {
  readonly events: string[];
  readonly calls: Array<Readonly<{
    tag: SqlTag;
    sql: string;
    parameters: readonly AccountSqliteColumn[];
  }>> = [];
  committed: FakeState = { schemaPresent: false, metadata: null, records: new Map() };
  staged: FakeState | null = null;
  readonly unknownObjects: Array<Readonly<{
    type: string;
    name: string;
    tableName: string;
    sql: string;
  }>> = [];
  metadataSchemaSql = SQL.createMetadata;
  recordsSchemaSql = SQL.createRecords;
  beginAfterApplyFailure: unknown | null = null;
  malformedBeginResult = false;
  readonly holds = new Map<SqlTag, Array<Readonly<{
    entered: Deferred<void>;
    release: Deferred<void>;
  }>>>();
  readonly failures = new Map<SqlTag, unknown[]>();
  extraMetadataRows: readonly AccountSqliteRow[] = [];

  constructor(events: string[]) {
    this.events = events;
  }

  seed(selected: V2StoragePlan): void {
    this.committed = {
      schemaPresent: true,
      metadata: metadataFor(selected),
      records: new Map(),
    };
  }

  holdNext(tag: SqlTag): Readonly<{ entered: Promise<void>; release(): void }> {
    const entered = deferred<void>();
    const release = deferred<void>();
    const queue = this.holds.get(tag) ?? [];
    queue.push(Object.freeze({ entered, release }));
    this.holds.set(tag, queue);
    return Object.freeze({ entered: entered.promise, release: () => release.resolve(undefined) });
  }

  failNext(tag: SqlTag, reason: unknown): void {
    const queue = this.failures.get(tag) ?? [];
    queue.push(reason);
    this.failures.set(tag, queue);
  }

  private async admit(tag: SqlTag, sql: string, parameters: readonly AccountSqliteColumn[]): Promise<void> {
    const copied = Object.freeze([...parameters]);
    this.calls.push(Object.freeze({ tag, sql, parameters: copied }));
    this.events.push(`sql.${tag}`);
    const holdQueue = this.holds.get(tag);
    const hold = holdQueue?.shift();
    if (holdQueue?.length === 0) this.holds.delete(tag);
    if (hold !== undefined) {
      hold.entered.resolve(undefined);
      await hold.release.promise;
    }
    const failureQueue = this.failures.get(tag);
    const failure = failureQueue?.shift();
    if (failureQueue?.length === 0) this.failures.delete(tag);
    if (failure !== undefined) throw failure;
  }

  async run(
    sql: string,
    parameters: readonly AccountSqliteColumn[],
  ): Promise<Readonly<{ changes: number }>> {
    const tag = tagFor(sql);
    await this.admit(tag, sql, parameters);
    if (tag === 'begin') {
      if (this.staged !== null) throw new Error('nested transaction');
      this.staged = cloneState(this.committed);
      if (this.beginAfterApplyFailure !== null) {
        const failure = this.beginAfterApplyFailure;
        this.beginAfterApplyFailure = null;
        throw failure;
      }
      if (this.malformedBeginResult) {
        this.malformedBeginResult = false;
        return Object.freeze({ changes: 'unknown' }) as unknown as Readonly<{ changes: number }>;
      }
      return Object.freeze({ changes: 0 });
    }
    if (tag === 'rollback') {
      this.staged = null;
      return Object.freeze({ changes: 0 });
    }
    const target = this.staged;
    if (target === null) throw new Error('write outside transaction');
    if (tag === 'create_metadata' || tag === 'create_records') {
      target.schemaPresent = true;
      return Object.freeze({ changes: 0 });
    }
    if (tag === 'insert_metadata') {
      target.metadata = Object.freeze({
        singleton: parameters[0],
        schema_version: parameters[1],
        manifest_version: parameters[2],
        namespace: parameters[3],
        scope_key: parameters[4],
        identity_kind: parameters[5],
        identity_hash: parameters[6],
        persistent_lineage: parameters[7],
        database_selector: parameters[8],
      });
      return Object.freeze({ changes: 1 });
    }
    const key = parameters[0];
    if (typeof key !== 'string') throw new Error('invalid fake key');
    if (tag === 'put_record') {
      const encoded = parameters[1];
      if (typeof encoded !== 'string') throw new Error('invalid fake value');
      target.records.set(key, encoded);
      return Object.freeze({ changes: 1 });
    }
    if (tag === 'delete_record') {
      const changed = target.records.delete(key);
      return Object.freeze({ changes: changed ? 1 : 0 });
    }
    throw new Error('unexpected fake run tag');
  }

  async getFirst(
    sql: string,
    parameters: readonly AccountSqliteColumn[],
  ): Promise<AccountSqliteRow | null> {
    const tag = tagFor(sql);
    await this.admit(tag, sql, parameters);
    if (tag !== 'read_record') throw new Error('unexpected fake first tag');
    const key = parameters[0];
    if (typeof key !== 'string') throw new Error('invalid fake read key');
    const encoded = (this.staged ?? this.committed).records.get(key);
    return encoded === undefined ? null : Object.freeze({ record_key: key, value_json: encoded });
  }

  async getAll(
    sql: string,
    parameters: readonly AccountSqliteColumn[],
  ): Promise<readonly AccountSqliteRow[]> {
    const tag = tagFor(sql);
    await this.admit(tag, sql, parameters);
    if (tag === 'list_schema') {
      if (parameters.length !== 1 || parameters[0] !== 'sqlite_') {
        throw new Error('invalid schema census parameters');
      }
      const rows: AccountSqliteRow[] = [
        ...(this.committed.schemaPresent ? [
          Object.freeze({
            type: 'table', name: 'account_scope_metadata_v1',
            tbl_name: 'account_scope_metadata_v1', sql: this.metadataSchemaSql,
          }),
          Object.freeze({
            type: 'table', name: 'account_scope_records_v1',
            tbl_name: 'account_scope_records_v1', sql: this.recordsSchemaSql,
          }),
        ] : []),
        ...this.unknownObjects.filter((entry) => !entry.name.startsWith('sqlite_')).map((entry) => Object.freeze({
          type: entry.type,
          name: entry.name,
          tbl_name: entry.tableName,
          sql: entry.sql,
        })),
      ];
      rows.sort((left, right) => `${String(left.type)}\u0000${String(left.name)}`
        .localeCompare(`${String(right.type)}\u0000${String(right.name)}`));
      return Object.freeze(rows);
    }
    if (tag === 'read_metadata') {
      if (parameters.length !== 0) throw new Error('invalid metadata parameters');
      const rows = this.committed.metadata === null ? [] : [this.committed.metadata];
      return Object.freeze([...rows, ...this.extraMetadataRows]);
    }
    throw new Error('unexpected fake all tag');
  }

  commitNative(): void {
    if (this.staged === null) throw new Error('commit without transaction');
    this.committed = this.staged;
    this.staged = null;
  }
}

type CommitBehavior = AccountSqliteLeaseCommitOutcome | 'throw' | 'malformed';

class FakeLeaseBinding implements AccountSqliteLeaseBinding {
  readonly events: string[];
  readonly sql: FakeParameterizedSql;
  revokeCalls = 0;
  commitCalls = 0;
  closeCalls = 0;
  revokeFailures = 0;
  closeFailures = 0;
  commitBehavior: CommitBehavior = 'committed';
  closeGate: Promise<void> | null = null;
  onRevoke: (() => void) | null = null;
  revoked = false;

  constructor(sql: FakeParameterizedSql, events: string[]) {
    this.sql = sql;
    this.events = events;
  }

  revoke(): undefined {
    this.events.push('lease.revoke');
    this.revokeCalls += 1;
    this.onRevoke?.();
    if (this.revokeFailures > 0) {
      this.revokeFailures -= 1;
      throw new Error('native-revoke-private');
    }
    this.revoked = true;
    return undefined;
  }

  commitIfActive(): Promise<AccountSqliteLeaseCommitOutcome> {
    this.events.push('lease.commit.dispatch');
    this.commitCalls += 1;
    if (this.commitBehavior === 'throw') {
      return Promise.reject(new Error('native-commit-private'));
    }
    if (this.commitBehavior === 'malformed') {
      return Promise.resolve('unknown' as AccountSqliteLeaseCommitOutcome);
    }
    if (this.revoked || this.commitBehavior === 'revoked') {
      return Promise.resolve('revoked');
    }
    this.sql.commitNative();
    return Promise.resolve('committed');
  }

  close(): Promise<void> {
    this.events.push('lease.close');
    this.closeCalls += 1;
    return (async (): Promise<void> => {
      if (this.closeGate !== null) await this.closeGate;
      if (this.closeFailures > 0) {
        this.closeFailures -= 1;
        throw new Error('native-close-private');
      }
    })();
  }
}

function fixture(selected: V2StoragePlan = plan()): Readonly<{
  events: string[];
  sql: FakeParameterizedSql;
  lease: FakeLeaseBinding;
  bundle: AccountSqliteScopeConnectionBundle;
}> {
  const events: string[] = [];
  const sql = new FakeParameterizedSql(events);
  const lease = new FakeLeaseBinding(sql, events);
  return Object.freeze({
    events,
    sql,
    lease,
    bundle: Object.freeze({ sql, leaseBinding: lease }),
  });
}

async function readyExisting(
  selected: V2StoragePlan = plan(),
): Promise<Readonly<{
  connection: ScopeStorageConnection;
  events: string[];
  sql: FakeParameterizedSql;
  lease: FakeLeaseBinding;
  bundle: AccountSqliteScopeConnectionBundle;
}>> {
  const selectedFixture = fixture(selected);
  selectedFixture.sql.seed(selected);
  const connection = await verifyExistingAccountSqliteScopeConnection(
    manifest(),
    selected,
    selectedFixture.bundle,
  );
  return Object.freeze({ ...selectedFixture, connection });
}

async function expectCode(
  action: () => Promise<unknown>,
  code: AccountSqliteScopeConnectionErrorCode,
): Promise<AccountSqliteScopeConnectionError> {
  try {
    await action();
  } catch (error) {
    expect(error).toBeInstanceOf(AccountSqliteScopeConnectionError);
    const typed = error as AccountSqliteScopeConnectionError & { cause?: unknown };
    expect(typed.code).toBe(code);
    expect(typed.name).toBe('AccountSqliteScopeConnectionError');
    expect(typed.message).toBe(code);
    expect(typed.cause).toBeUndefined();
    return typed;
  }
  throw new Error(`expected ${code}`);
}

function eventCount(events: readonly string[], expected: string): number {
  return events.filter((event) => event === expected).length;
}

function expectFrozenJson(value: ScopeJson): void {
  if (typeof value !== 'object' || value === null) return;
  expect(Object.isFrozen(value)).toBe(true);
  if (Array.isArray(value)) {
    for (const child of value) expectFrozenJson(child);
    return;
  }
  for (const child of Object.values(value)) expectFrozenJson(child);
}

describe('account SQLite scope connection V2', () => {
  test('exposes one frozen versioned schema identity', () => {
    expect(ACCOUNT_SQLITE_SCOPE_SCHEMA).toEqual({
      version: 1,
      metadataTable: 'account_scope_metadata_v1',
      recordsTable: 'account_scope_records_v1',
    });
    expect(Object.isFrozen(ACCOUNT_SQLITE_SCOPE_SCHEMA)).toBe(true);
  });

  test('initializes a new canonical account schema with fixed SQL and durable identity metadata', async () => {
    const selected = plan();
    const selectedFixture = fixture(selected);

    const connection = await initializeNewAccountSqliteScopeConnection(
      manifest(), selected, selectedFixture.bundle,
    );

    expect(Object.isFrozen(connection)).toBe(true);
    expect(selectedFixture.events).toEqual([
      'sql.list_schema',
      'sql.begin',
      'sql.create_metadata',
      'sql.create_records',
      'sql.insert_metadata',
      'lease.commit.dispatch',
    ]);
    expect(selectedFixture.sql.calls.map((call) => call.sql)).toEqual([
      SQL.listSchema,
      SQL.begin,
      SQL.createMetadata,
      SQL.createRecords,
      SQL.insertMetadata,
    ]);
    expect(selectedFixture.sql.calls[0]?.parameters).toEqual(['sqlite_']);
    expect(selectedFixture.sql.calls[1]?.parameters).toEqual([]);
    expect(selectedFixture.sql.calls[4]?.parameters).toEqual([
      1, 1, 1, 'account_native_storage_v2', selected.scopeKey, 'account', HASH_A, 7,
      mainSelector(selected),
    ]);
    expect(selectedFixture.sql.committed.metadata).toEqual(metadataFor(selected));
    expect(selectedFixture.lease.commitCalls).toBe(1);
    expect(selectedFixture.lease.revokeCalls).toBe(0);
  });

  test('refuses new-schema initialization when any durable SQL object already exists', async () => {
    const selected = plan();
    const cases: readonly ((selectedFixture: ReturnType<typeof fixture>) => void)[] = [
      (selectedFixture) => { selectedFixture.sql.seed(selected); },
      (selectedFixture) => {
        selectedFixture.sql.unknownObjects.push(Object.freeze({
          type: 'table', name: 'legacy_table', tableName: 'legacy_table',
          sql: 'CREATE TABLE legacy_table (x TEXT)',
        }));
      },
    ];
    for (const configure of cases) {
      const selectedFixture = fixture(selected);
      configure(selectedFixture);
      await expectCode(
        () => initializeNewAccountSqliteScopeConnection(
          manifest(), selected, selectedFixture.bundle,
        ),
        'account_sqlite_scope_schema_quarantined',
      );
      expect(selectedFixture.events).toEqual(['sql.list_schema']);
      expect(selectedFixture.lease.commitCalls).toBe(0);
    }
  });

  test('rolls back failed schema creation and poisons an unknown schema commit', async () => {
    const failed = fixture();
    failed.sql.failNext('create_records', new Error('schema-private'));
    const failedError = await expectCode(
      () => initializeNewAccountSqliteScopeConnection(manifest(), plan(), failed.bundle),
      'account_sqlite_scope_schema_quarantined',
    );
    expect(failedError.message).not.toContain('schema-private');
    expect(eventCount(failed.events, 'sql.rollback')).toBe(1);
    expect(failed.lease.commitCalls).toBe(0);

    const uncertain = fixture();
    uncertain.lease.commitBehavior = 'malformed';
    await expectCode(
      () => initializeNewAccountSqliteScopeConnection(manifest(), plan(), uncertain.bundle),
      'account_sqlite_scope_connection_poisoned',
    );
    expect(uncertain.lease.commitCalls).toBe(1);
    expect(uncertain.lease.revokeCalls).toBe(1);
    expect(uncertain.events).not.toContain('sql.rollback');
  });

  test('poisons and revokes when schema DDL and its ordinary rollback both fail', async () => {
    const selectedFixture = fixture();
    selectedFixture.sql.failNext('create_records', new Error('ddl-private'));
    selectedFixture.sql.failNext('rollback', new Error('rollback-private'));
    let published: ScopeStorageConnection | null = null;

    await expectCode(
      async () => {
        published = await initializeNewAccountSqliteScopeConnection(
          manifest(), plan(), selectedFixture.bundle,
        );
      },
      'account_sqlite_scope_connection_poisoned',
    );

    expect(published).toBe(null);
    expect(selectedFixture.lease.commitCalls).toBe(0);
    expect(selectedFixture.lease.revokeCalls).toBe(1);
    expect(eventCount(selectedFixture.events, 'sql.rollback')).toBe(1);
  });

  test('poisons every rejected, revoked, or malformed native schema commit without rollback', async () => {
    const behaviors: readonly CommitBehavior[] = ['revoked', 'throw', 'malformed'];
    for (const behavior of behaviors) {
      const selectedFixture = fixture();
      selectedFixture.lease.commitBehavior = behavior;
      let published: ScopeStorageConnection | null = null;

      await expectCode(
        async () => {
          published = await initializeNewAccountSqliteScopeConnection(
            manifest(), plan(), selectedFixture.bundle,
          );
        },
        'account_sqlite_scope_connection_poisoned',
      );

      expect(published).toBe(null);
      expect(selectedFixture.lease.commitCalls).toBe(1);
      expect(selectedFixture.lease.revokeCalls).toBe(1);
      expect(selectedFixture.events).not.toContain('sql.rollback');
    }
  });

  test('initializes guest metadata without lineage and verifies account or guest schema without writes', async () => {
    for (const identity of [accountIdentity(), guestIdentity()] as const) {
      const selected = plan(identity);
      const initialized = fixture(selected);
      await initializeNewAccountSqliteScopeConnection(manifest(), selected, initialized.bundle);
      expect(initialized.sql.committed.metadata?.persistent_lineage).toBe(
        identity.kind === 'account' ? identity.persistentLineage : null,
      );

      const reopened = fixture(selected);
      reopened.sql.committed = cloneState(initialized.sql.committed);
      const verified = await verifyExistingAccountSqliteScopeConnection(
        manifest(), selected, reopened.bundle,
      );
      expect(Object.isFrozen(verified)).toBe(true);
      expect(reopened.events).toEqual(['sql.list_schema', 'sql.read_metadata']);
      expect(reopened.sql.calls[0]?.parameters).toEqual(['sqlite_']);
      expect(reopened.sql.calls[1]?.parameters).toEqual([]);
      expect(reopened.sql.calls.every((call) => call.tag === 'list_schema'
        || call.tag === 'read_metadata')).toBe(true);
      expect(reopened.lease.commitCalls).toBe(0);
    }
  });

  test('quarantines missing, unknown, malformed, or mismatched existing schema without lazy creation', async () => {
    const selected = plan();
    const cases: readonly ((selectedFixture: ReturnType<typeof fixture>) => void)[] = [
      () => undefined,
      (selectedFixture) => {
        selectedFixture.sql.seed(selected);
        selectedFixture.sql.unknownObjects.push(Object.freeze({
          type: 'table', name: 'legacy_or_unknown', tableName: 'legacy_or_unknown',
          sql: 'CREATE TABLE legacy_or_unknown (x TEXT)',
        }));
      },
      (selectedFixture) => {
        selectedFixture.sql.seed(selected);
        selectedFixture.sql.committed.metadata = Object.freeze({
          ...metadataFor(selected), schema_version: 2,
        });
      },
      (selectedFixture) => {
        selectedFixture.sql.seed(selected);
        selectedFixture.sql.committed.metadata = Object.freeze({
          ...metadataFor(selected), scope_key: 'account:foreign',
        });
      },
      (selectedFixture) => {
        selectedFixture.sql.seed(selected);
        selectedFixture.sql.extraMetadataRows = [metadataFor(selected)];
      },
      (selectedFixture) => {
        selectedFixture.sql.seed(selected);
        selectedFixture.sql.recordsSchemaSql = `${SQL.createRecords} /* drift */` as typeof SQL.createRecords;
      },
      ...(['trigger', 'view', 'index'] as const).map((type) => (
        selectedFixture: ReturnType<typeof fixture>,
      ): void => {
        selectedFixture.sql.seed(selected);
        selectedFixture.sql.unknownObjects.push(Object.freeze({
          type,
          name: `foreign_${type}`,
          tableName: 'account_scope_records_v1',
          sql: `CREATE ${type.toUpperCase()} foreign_${type}`,
        }));
      }),
      (selectedFixture) => {
        selectedFixture.sql.seed(selected);
        selectedFixture.sql.unknownObjects.push(Object.freeze({
          type: 'index', name: 'sqliteX_not_internal',
          tableName: 'account_scope_records_v1', sql: 'CREATE INDEX sqliteX_not_internal',
        }));
      },
    ];

    for (const configure of cases) {
      const selectedFixture = fixture(selected);
      configure(selectedFixture);
      await expectCode(
        () => verifyExistingAccountSqliteScopeConnection(
          manifest(), selected, selectedFixture.bundle,
        ),
        'account_sqlite_scope_schema_quarantined',
      );
      expect(selectedFixture.sql.calls.some((call) => call.tag === 'create_metadata'
        || call.tag === 'create_records' || call.tag === 'insert_metadata')).toBe(false);
      expect(selectedFixture.lease.commitCalls).toBe(0);
    }
  });

  test('excludes only exact sqlite_ internal objects from existing-schema verification', async () => {
    const selected = plan();
    const selectedFixture = fixture(selected);
    selectedFixture.sql.seed(selected);
    selectedFixture.sql.unknownObjects.push(Object.freeze({
      type: 'index', name: 'sqlite_autoindex_account_scope_records_v1_1',
      tableName: 'account_scope_records_v1', sql: '',
    }));
    await verifyExistingAccountSqliteScopeConnection(
      manifest(), selected, selectedFixture.bundle,
    );
    expect(selectedFixture.sql.calls[0]?.parameters).toEqual(['sqlite_']);
  });

  test('rejects noncanonical plans before SQL or lease effects', async () => {
    const canonical = plan();
    const drifted = Object.freeze({
      ...canonical,
      artifacts: Object.freeze(canonical.artifacts.map((artifact, index) => index === 1
        ? Object.freeze({ ...artifact, selector: 'arbitrary.db' })
        : artifact)),
    }) as V2StoragePlan;
    const selectedFixture = fixture(canonical);

    await expectCode(
      () => initializeNewAccountSqliteScopeConnection(
        manifest(), drifted, selectedFixture.bundle,
      ),
      'account_sqlite_scope_invalid_input',
    );
    expect(selectedFixture.events).toEqual([]);
  });

  test('returns deeply frozen snapshots and preserves magic keys, unknown fields, and negative zero', async () => {
    const ready = await readyExisting();
    const value = JSON.parse(
      '{"__proto__":{"safe":true},"constructor":{"nested":1},"unknown":[-0,{"prototype":"kept"}]}',
    ) as { unknown: [number, ScopeJson] } & ScopeJson;
    value.unknown[0] = -0;

    await ready.connection.withGuardedTransaction(async (transaction) => {
      await transaction.putRecord({ key: 'magic', value });
    }, () => true);
    const returned = await ready.connection.readRecord('magic');

    expect(returned?.key).toBe('magic');
    expect(Object.isFrozen(returned)).toBe(true);
    if (returned === null) throw new Error('expected record');
    expectFrozenJson(returned.value);
    const objectValue = returned.value as Readonly<Record<string, ScopeJson>>;
    expect(Object.prototype.hasOwnProperty.call(objectValue, '__proto__')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(objectValue, 'constructor')).toBe(true);
    const unknown = objectValue.unknown as readonly ScopeJson[];
    expect(Object.is(unknown[0], -0)).toBe(true);
    expect((Object.prototype as { safe?: unknown }).safe).toBeUndefined();
  });

  test('stores exact direct canonical JSON for primitives, arrays, sorted objects, magic keys, and negative zero', async () => {
    const ready = await readyExisting();
    const values: readonly Readonly<{ key: string; value: ScopeJson; encoded: string }>[] = [
      Object.freeze({ key: 'null', value: null, encoded: 'null' }),
      Object.freeze({ key: 'boolean', value: true, encoded: 'true' }),
      Object.freeze({ key: 'string', value: 'quote-"-\\-\n', encoded: '"quote-\\"-\\\\-\\n"' }),
      Object.freeze({ key: 'negative-zero', value: -0, encoded: '-0' }),
      Object.freeze({
        key: 'array', value: Object.freeze([null, false, -0, 'x']),
        encoded: '[null,false,-0,"x"]',
      }),
      Object.freeze({
        key: 'object',
        value: JSON.parse('{"z":true,"__proto__":{"safe":true},"array":[1,-0]}') as ScopeJson,
        encoded: '{"__proto__":{"safe":true},"array":[1,-0],"z":true}',
      }),
    ];

    await ready.connection.withGuardedTransaction(async (transaction) => {
      for (const entry of values) await transaction.putRecord(entry);
    }, () => true);

    for (const entry of values) {
      expect(ready.sql.committed.records.get(entry.key)).toBe(entry.encoded);
    }
    expect(Object.is((await ready.connection.readRecord('negative-zero'))?.value, -0)).toBe(true);
  });

  test('rejects and preserves valid but noncanonical or nonfinite stored JSON', async () => {
    const ready = await readyExisting();
    const encodedCases = Object.freeze([
      '{ "a":1}',
      '{"b":1,"a":2}',
      '{"a":1,"a":2}',
      '1.0',
      '1e999',
    ]);

    for (let index = 0; index < encodedCases.length; index += 1) {
      const key = `noncanonical-${index}`;
      const encoded = encodedCases[index] as string;
      ready.sql.committed.records.set(key, encoded);
      await expectCode(
        () => ready.connection.readRecord(key),
        'account_sqlite_scope_read_failed',
      );
      expect(ready.sql.committed.records.get(key)).toBe(encoded);
    }
  });

  test('snapshots records synchronously and rejects accessors or cycles before SQL admission', async () => {
    const ready = await readyExisting();
    const mutable = { nested: { value: 1 } };
    const writing = ready.connection.withGuardedTransaction(async (transaction) => {
      const operation = transaction.putRecord({ key: 'snapshot', value: mutable });
      mutable.nested.value = 2;
      await operation;
    }, () => true);
    await writing;
    expect((await ready.connection.readRecord('snapshot'))?.value).toEqual({ nested: { value: 1 } });

    let getterCalls = 0;
    const accessor = Object.defineProperty({}, 'secret', {
      enumerable: true,
      get: () => { getterCalls += 1; return 'private'; },
    }) as ScopeJson;
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    const callsBefore = ready.sql.calls.length;
    await expectCode(
      () => ready.connection.withGuardedTransaction(async (transaction) => {
        await transaction.putRecord({ key: 'accessor', value: accessor });
      }, () => true),
      'account_sqlite_scope_invalid_input',
    );
    await expectCode(
      () => ready.connection.withGuardedTransaction(async (transaction) => {
        await transaction.putRecord({ key: 'cycle', value: cyclic as ScopeJson });
      }, () => true),
      'account_sqlite_scope_invalid_input',
    );
    expect(getterCalls).toBe(0);
    expect(ready.sql.calls.slice(callsBefore).some((call) => call.tag === 'put_record')).toBe(false);
  });

  test('fails closed on malformed stored encoding without deleting or replacing the row', async () => {
    const selected = plan();
    const ready = await readyExisting(selected);
    ready.sql.committed.records.set('bad', '{not-valid');
    const before = ready.sql.committed.records.get('bad');

    const surfaced = await expectCode(
      () => ready.connection.readRecord('bad'),
      'account_sqlite_scope_read_failed',
    );

    expect(surfaced.message).not.toContain('{not-valid');
    expect(ready.sql.committed.records.get('bad')).toBe(before);
    expect(ready.sql.calls.some((call) => call.tag === 'delete_record'
      || call.tag === 'put_record')).toBe(false);
  });

  test('commits a whole transaction after one final guard and exposes read-your-write semantics', async () => {
    const ready = await readyExisting();
    ready.events.length = 0;
    let guardCalls = 0;

    await ready.connection.withGuardedTransaction(async (transaction) => {
      await transaction.putRecord({ key: 'one', value: { count: 1 } });
      expect((await transaction.readRecord('one'))?.value).toEqual({ count: 1 });
      await transaction.putRecord({ key: 'two', value: ['unknown', 2] });
      await transaction.deleteRecord('one');
    }, () => {
      ready.events.push('guard');
      guardCalls += 1;
      return true;
    });

    expect(guardCalls).toBe(1);
    const guardIndex = ready.events.indexOf('guard');
    expect(guardIndex).toBeGreaterThan(0);
    expect(ready.events[guardIndex + 1]).toBe('lease.commit.dispatch');
    expect(ready.events).not.toContain('sql.rollback');
    expect(await ready.connection.readRecord('one')).toBe(null);
    expect((await ready.connection.readRecord('two'))?.value).toEqual(['unknown', 2]);
  });

  test('keeps arbitrary trim-exact record keys in parameters without interpolation or silent bounds', async () => {
    const ready = await readyExisting();
    const key = `quote-'--;${'x'.repeat(1024)}`;
    await ready.connection.withGuardedTransaction(async (transaction) => {
      await transaction.putRecord({ key, value: 1 });
    }, () => true);
    expect((await ready.connection.readRecord(key))?.value).toBe(1);
    const put = ready.sql.calls.find((call) => call.tag === 'put_record');
    expect(put?.sql).toBe(SQL.putRecord);
    expect(put?.parameters[0]).toBe(key);
    expect(put?.sql).not.toContain(key);

    await expectCode(
      () => ready.connection.readRecord(' bad '),
      'account_sqlite_scope_invalid_input',
    );
    await expectCode(
      () => ready.connection.withGuardedTransaction(async (transaction) => {
        await transaction.putRecord({ key: 'nan', value: Number.NaN });
      }, () => true),
      'account_sqlite_scope_invalid_input',
    );
  });

  test('registers unawaited operations synchronously and drains them before guard and commit', async () => {
    const ready = await readyExisting();
    ready.events.length = 0;
    const hold = ready.sql.holdNext('put_record');
    let settled = false;
    let guardCalls = 0;

    const transaction = ready.connection.withGuardedTransaction(async (scopeTransaction) => {
      void scopeTransaction.putRecord({ key: 'unawaited', value: true });
    }, () => {
      guardCalls += 1;
      return true;
    });
    void transaction.then(
      () => { settled = true; },
      () => { settled = true; },
    );
    await hold.entered;
    expect(settled).toBe(false);
    expect(guardCalls).toBe(0);
    expect(ready.lease.commitCalls).toBe(0);
    hold.release();
    await transaction;

    expect(guardCalls).toBe(1);
    expect(ready.lease.commitCalls).toBe(1);
    expect((await ready.connection.readRecord('unawaited'))?.value).toBe(true);
  });

  test('serializes operations within one transaction and queues the next whole transaction through commit', async () => {
    const ready = await readyExisting();
    ready.events.length = 0;
    const firstOperation = ready.sql.holdNext('put_record');

    const transactionA = ready.connection.withGuardedTransaction(async (transaction) => {
      void transaction.putRecord({ key: 'a-first', value: 1 });
      void transaction.putRecord({ key: 'a-second', value: 2 });
    }, () => true);
    await firstOperation.entered;

    const transactionB = ready.connection.withGuardedTransaction(async (transaction) => {
      await transaction.putRecord({ key: 'b-only', value: 3 });
    }, () => true);

    expect(eventCount(ready.events, 'sql.put_record')).toBe(1);
    expect(eventCount(ready.events, 'sql.begin')).toBe(1);
    expect(ready.lease.commitCalls).toBe(0);

    firstOperation.release();
    await Promise.all([transactionA, transactionB]);

    const beginIndexes = ready.events
      .map((event, index) => event === 'sql.begin' ? index : -1)
      .filter((index) => index >= 0);
    const firstCommitIndex = ready.events.indexOf('lease.commit.dispatch');
    expect(beginIndexes).toHaveLength(2);
    expect(firstCommitIndex).toBeGreaterThan(beginIndexes[0] ?? -1);
    expect(firstCommitIndex).toBeLessThan(beginIndexes[1] ?? -1);
    expect(ready.events.indexOf('sql.put_record', ready.events.indexOf('sql.put_record') + 1))
      .toBeGreaterThan(ready.events.indexOf('sql.put_record'));
    expect((await ready.connection.readRecord('a-first'))?.value).toBe(1);
    expect((await ready.connection.readRecord('a-second'))?.value).toBe(2);
    expect((await ready.connection.readRecord('b-only'))?.value).toBe(3);
  });

  test('serializes standalone reads behind the complete active transaction', async () => {
    const ready = await readyExisting();
    ready.events.length = 0;
    const hold = ready.sql.holdNext('put_record');
    const transaction = ready.connection.withGuardedTransaction(async (scopeTransaction) => {
      await scopeTransaction.putRecord({ key: 'queued', value: 1 });
    }, () => true);
    await hold.entered;

    const reading = ready.connection.readRecord('queued');
    expect(eventCount(ready.events, 'sql.read_record')).toBe(0);
    hold.release();
    await transaction;
    expect((await reading)?.value).toBe(1);
    expect(ready.events.indexOf('lease.commit.dispatch'))
      .toBeLessThan(ready.events.indexOf('sql.read_record'));
  });

  test('never invokes a transaction callback when revoke wins while BEGIN is pending', async () => {
    const ready = await readyExisting();
    ready.events.length = 0;
    const heldBegin = ready.sql.holdNext('begin');
    let callbackCalls = 0;

    const transaction = ready.connection.withGuardedTransaction(async () => {
      callbackCalls += 1;
    }, () => true);
    await heldBegin.entered;
    ready.connection.revoke();
    heldBegin.release();

    await expectCode(
      () => transaction,
      'account_sqlite_scope_transaction_stopped',
    );
    expect(callbackCalls).toBe(0);
    expect(ready.lease.commitCalls).toBe(0);
    expect(ready.events).not.toContain('sql.rollback');
    await ready.connection.close();
    expect(ready.lease.closeCalls).toBe(1);
  });

  test('poisons and revokes an applied but rejected or malformed BEGIN without ordinary rollback', async () => {
    const cases: readonly ((sql: FakeParameterizedSql) => void)[] = [
      (sql) => { sql.beginAfterApplyFailure = new Error('begin-lost-response-private'); },
      (sql) => { sql.malformedBeginResult = true; },
    ];
    for (const configure of cases) {
      const ready = await readyExisting();
      ready.events.length = 0;
      configure(ready.sql);
      let callbackCalls = 0;

      await expectCode(
        () => ready.connection.withGuardedTransaction(async () => {
          callbackCalls += 1;
        }, () => true),
        'account_sqlite_scope_connection_poisoned',
      );

      expect(callbackCalls).toBe(0);
      expect(ready.lease.revokeCalls).toBe(1);
      expect(ready.lease.commitCalls).toBe(0);
      expect(ready.events).not.toContain('sql.rollback');
      const callsBefore = ready.sql.calls.length;
      await expectCode(
        () => ready.connection.readRecord('after-unknown-begin'),
        'account_sqlite_scope_connection_poisoned',
      );
      await expectCode(
        () => ready.connection.withGuardedTransaction(async () => undefined, () => true),
        'account_sqlite_scope_connection_poisoned',
      );
      expect(ready.sql.calls.length).toBe(callsBefore);
    }
  });

  test('latches caught or unawaited SQL operation failures and prevents partial commit', async () => {
    const operations: readonly Readonly<{
      tag: 'read_record' | 'put_record' | 'delete_record';
      invoke(transaction: AccountScopeTransaction): Promise<unknown>;
    }>[] = [
      { tag: 'read_record', invoke: (transaction) => transaction.readRecord('fail') },
      {
        tag: 'put_record',
        invoke: (transaction) => transaction.putRecord({ key: 'fail', value: 1 }),
      },
      { tag: 'delete_record', invoke: (transaction) => transaction.deleteRecord('fail') },
    ];

    for (const operation of operations) {
      const ready = await readyExisting();
      ready.events.length = 0;
      let caught: unknown;
      const surfaced = await expectCode(
        () => ready.connection.withGuardedTransaction(async (transaction) => {
          await transaction.putRecord({ key: 'before', value: operation.tag });
          ready.sql.failNext(operation.tag, new Error(`SQL private ${operation.tag}`));
          try {
            await operation.invoke(transaction);
          } catch (error) {
            caught = error;
          }
        }, () => true),
        'account_sqlite_scope_transaction_failed',
      );
      expect(caught).toBeInstanceOf(AccountSqliteScopeConnectionError);
      expect(surfaced.message).not.toContain('private');
      expect(ready.lease.commitCalls).toBe(0);
      expect(eventCount(ready.events, 'sql.rollback')).toBe(1);
      expect(ready.sql.committed.records.has('before')).toBe(false);
    }

    const unawaited = await readyExisting();
    unawaited.sql.failNext('put_record', new Error('late private failure'));
    await expectCode(
      () => unawaited.connection.withGuardedTransaction(async (transaction) => {
        void transaction.putRecord({ key: 'late-fail', value: true });
      }, () => true),
      'account_sqlite_scope_transaction_failed',
    );
    expect(unawaited.lease.commitCalls).toBe(0);
  });

  test('rolls back callback rejection, preserves its identity, and rejects escaped transaction calls', async () => {
    const ready = await readyExisting();
    const exact = Object.freeze({ exact: 'caller-rejection' });
    let escaped: AccountScopeTransaction | null = null;
    try {
      await ready.connection.withGuardedTransaction(async (transaction) => {
        escaped = transaction;
        await transaction.putRecord({ key: 'not-committed', value: 1 });
        throw exact;
      }, () => true);
      throw new Error('expected callback rejection');
    } catch (error) {
      expect(error).toBe(exact);
    }
    expect(eventCount(ready.events, 'sql.rollback')).toBe(1);
    expect(ready.lease.commitCalls).toBe(0);
    if (escaped === null) throw new Error('expected transaction capture');
    await expectCode(
      () => (escaped as AccountScopeTransaction).putRecord({ key: 'escaped', value: 2 }),
      'account_sqlite_scope_transaction_stopped',
    );
  });

  test('calls a false or throwing guard once, rolls back, and keeps the active connection usable', async () => {
    const guards: readonly (() => boolean)[] = [
      () => false,
      () => { throw new Error('guard-private'); },
    ];
    for (const rawGuard of guards) {
      const ready = await readyExisting();
      let calls = 0;
      await expectCode(
        () => ready.connection.withGuardedTransaction(async (transaction) => {
          await transaction.putRecord({ key: 'guarded', value: true });
        }, () => {
          calls += 1;
          return rawGuard();
        }),
        'account_sqlite_scope_transaction_stopped',
      );
      expect(calls).toBe(1);
      expect(ready.lease.commitCalls).toBe(0);
      expect(eventCount(ready.events, 'sql.rollback')).toBe(1);
      expect(await ready.connection.readRecord('guarded')).toBe(null);
    }
  });

  test('poisons and revokes when rollback fails without reporting a commit', async () => {
    const ready = await readyExisting();
    ready.sql.failNext('rollback', new Error('rollback-private'));

    await expectCode(
      () => ready.connection.withGuardedTransaction(async (transaction) => {
        await transaction.putRecord({ key: 'staged', value: true });
      }, () => false),
      'account_sqlite_scope_connection_poisoned',
    );

    expect(ready.lease.commitCalls).toBe(0);
    expect(ready.lease.revokeCalls).toBe(1);
    await expectCode(
      () => ready.connection.readRecord('staged'),
      'account_sqlite_scope_connection_poisoned',
    );
  });

  test('poisons and revokes every rejected or unknown commit without ordinary rollback', async () => {
    const behaviors: readonly CommitBehavior[] = ['revoked', 'throw', 'malformed'];
    for (const behavior of behaviors) {
      const ready = await readyExisting();
      ready.events.length = 0;
      ready.lease.commitBehavior = behavior;

      await expectCode(
        () => ready.connection.withGuardedTransaction(async (transaction) => {
          await transaction.putRecord({ key: 'uncertain', value: behavior });
        }, () => true),
        'account_sqlite_scope_connection_poisoned',
      );

      expect(ready.lease.commitCalls).toBe(1);
      expect(ready.lease.revokeCalls).toBe(1);
      expect(ready.events).not.toContain('sql.rollback');
      await expectCode(
        () => ready.connection.readRecord('uncertain'),
        'account_sqlite_scope_connection_poisoned',
      );
    }
  });

  test('lets reentrant revocation at the final guard defeat commit and never reports success', async () => {
    const ready = await readyExisting();
    ready.events.length = 0;

    await expectCode(
      () => ready.connection.withGuardedTransaction(async (transaction) => {
        await transaction.putRecord({ key: 'revoked-at-guard', value: true });
      }, () => {
        ready.events.push('guard');
        ready.connection.revoke();
        return true;
      }),
      'account_sqlite_scope_connection_poisoned',
    );

    expect(ready.events.indexOf('guard')).toBeLessThan(ready.events.indexOf('lease.revoke'));
    expect(ready.events.indexOf('lease.revoke'))
      .toBeLessThan(ready.events.indexOf('lease.commit.dispatch'));
    expect(ready.events).not.toContain('sql.rollback');
    expect(ready.sql.committed.records.has('revoked-at-guard')).toBe(false);
  });

  test('stops locally before retrying a failed native revoke and admits no later SQL', async () => {
    const ready = await readyExisting();
    ready.events.length = 0;
    ready.lease.revokeFailures = 1;
    let reentrantRead: Promise<ScopeRecord | null> | null = null;
    ready.lease.onRevoke = () => {
      reentrantRead = ready.connection.readRecord('reentrant-during-revoke');
      void reentrantRead.catch(() => undefined);
    };

    expect(() => ready.connection.revoke()).toThrow('account_sqlite_scope_revoke_failed');
    expect(ready.lease.revokeCalls).toBe(1);
    if (reentrantRead === null) throw new Error('expected reentrant read');
    await expectCode(
      () => reentrantRead as Promise<ScopeRecord | null>,
      'account_sqlite_scope_connection_stopped',
    );
    await expectCode(
      () => ready.connection.readRecord('after-failed-revoke'),
      'account_sqlite_scope_connection_stopped',
    );
    expect(ready.events).toEqual(['lease.revoke']);
    expect(() => ready.connection.revoke()).not.toThrow();
    expect(ready.lease.revokeCalls).toBe(2);
  });

  test('settles a never-ending callback promptly on revoke and observes its late rejection', async () => {
    const ready = await readyExisting();
    const callbackEntered = deferred<void>();
    const callbackSettlement = deferred<void>();
    let transactionSettled = false;

    const transaction = ready.connection.withGuardedTransaction(async () => {
      callbackEntered.resolve(undefined);
      await callbackSettlement.promise;
    }, () => true);
    void transaction.then(
      () => { transactionSettled = true; },
      () => { transactionSettled = true; },
    );
    await callbackEntered.promise;
    const queuedRead = ready.connection.readRecord('queued-after-callback');
    ready.connection.revoke();

    await expectCode(
      () => transaction,
      'account_sqlite_scope_transaction_stopped',
    );
    expect(transactionSettled).toBe(true);
    await expectCode(
      () => queuedRead,
      'account_sqlite_scope_connection_stopped',
    );
    expect(eventCount(ready.events, 'sql.read_record')).toBe(0);
    const rollbackCalls = eventCount(ready.events, 'sql.rollback');
    const closing = ready.connection.close();
    await closing;
    expect(ready.lease.closeCalls).toBe(1);
    expect(eventCount(ready.events, 'lease.close')).toBe(1);
    expect(eventCount(ready.events, 'sql.rollback')).toBe(rollbackCalls);
    callbackSettlement.reject(new Error('late-callback-private'));
    await Promise.resolve();
    await Promise.resolve();
    expect(eventCount(ready.events, 'sql.rollback')).toBe(rollbackCalls);
  });

  test('seals a revoked transaction and rejects late or escaped operations without SQL', async () => {
    const ready = await readyExisting();
    const entered = deferred<void>();
    const never = deferred<void>();
    let escaped: AccountScopeTransaction | null = null;
    const transaction = ready.connection.withGuardedTransaction(async (scopeTransaction) => {
      escaped = scopeTransaction;
      entered.resolve(undefined);
      await never.promise;
    }, () => true);
    await entered.promise;
    ready.connection.revoke();
    await expectCode(
      () => transaction,
      'account_sqlite_scope_transaction_stopped',
    );
    const callsBefore = ready.sql.calls.length;
    if (escaped === null) throw new Error('expected escaped transaction');
    await expectCode(
      () => (escaped as AccountScopeTransaction).deleteRecord('late'),
      'account_sqlite_scope_transaction_stopped',
    );
    expect(ready.sql.calls.length).toBe(callsBefore);
  });

  test('sanitizes standalone read failures and leaves the connection available', async () => {
    const ready = await readyExisting();
    ready.sql.failNext('read_record', new Error('SQL /private/record'));
    const error = await expectCode(
      () => ready.connection.readRecord('failure'),
      'account_sqlite_scope_read_failed',
    );
    expect(error.message).not.toContain('/private/record');
    expect(await ready.connection.readRecord('later')).toBe(null);
  });

  test('requires successful revoke before close and coalesces an in-flight close', async () => {
    const ready = await readyExisting();
    await expectCode(
      () => ready.connection.close(),
      'account_sqlite_scope_close_failed',
    );
    expect(ready.lease.closeCalls).toBe(0);

    ready.connection.revoke();
    const closeGate = deferred<void>();
    ready.lease.closeGate = closeGate.promise;
    const first = ready.connection.close();
    const duplicate = ready.connection.close();
    expect(duplicate).toBe(first);
    expect(ready.lease.closeCalls).toBe(1);
    closeGate.resolve(undefined);
    await first;
    expect(ready.lease.closeCalls).toBe(1);
    await expectCode(
      () => ready.connection.readRecord('closed'),
      'account_sqlite_scope_connection_stopped',
    );
  });

  test('retains SQL and binding references after close failure for exact retry', async () => {
    const ready = await readyExisting();
    ready.connection.revoke();
    ready.lease.closeFailures = 1;

    await expectCode(
      () => ready.connection.close(),
      'account_sqlite_scope_close_failed',
    );
    expect(ready.lease.closeCalls).toBe(1);
    await ready.connection.close();
    expect(ready.lease.closeCalls).toBe(2);
  });

  test('freezes finite sanitized errors with no stack, cause, SQL, or stored payload', async () => {
    const ready = await readyExisting();
    ready.sql.failNext('read_record', new Error(`${SQL.readRecord} SECRET_VALUE`));

    const error = await expectCode(
      () => ready.connection.readRecord('secret-key'),
      'account_sqlite_scope_read_failed',
    );

    expect(Object.isFrozen(error)).toBe(true);
    expect(Object.keys(error).sort()).toEqual(['code', 'message', 'name']);
    expect(error.stack).toBeUndefined();
    expect(JSON.stringify(error)).not.toMatch(/SELECT|SECRET_VALUE|secret-key/);
  });

  test('uses only the injected parameterized SQL surface and documents the integration hold', () => {
    const sourcePath = join(
      process.cwd(),
      'modules/account-session-v2/native/account_sqlite_scope_connection.ts',
    );
    const source = readFileSync(sourcePath, 'utf8');
    expect(source).not.toMatch(/expo-sqlite|SecureStore|firebase|node:fs|withExclusiveTransaction/);
    expect(source).toContain('SQL and lease binding must target the same already-keyed, keyed-proof-passed canonical connection.');
    expect(source).toContain('Initialize is allowed only for a proven-absent database family while the durable provision lease is held.');
    expect(source).toContain('Verify existing schema while that durable provision lease is held.');
    expect(source).toContain('Types do not prove these admission facts.');
    expect(source).toContain('Each SQL operation promise must include statement finalization before it resolves.');
    expect(source).toContain('does not prove native connection identity');
    expect(source).toContain('provisioner must initialize or verify schema before publishing the handle');
    expect(source).toContain('Factory rejection never consumes or closes the caller-owned candidate, raw bundle, or durable provision lease.');
    expect(source).toContain('The caller remains responsible for revoke retry, close, and durable lease release.');
  });
});
