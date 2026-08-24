import {
  PHONE_STATE_SCHEMA_V1,
  PHONE_STATE_SCHEMA_VERSION,
  migratePhoneStateSchema,
  type PhoneStateSchemaDatabase,
  type PhoneStateSchemaTransaction,
} from '../modules/phone-state/schema';

const REQUIRED_TABLES = [
  'operations',
  'external_events',
  'projections',
  'outbox_segments',
  'remote_cursors',
  'checkpoints',
  'sync_retry',
  'quarantine',
  'migrations',
  'account_keys',
  'device_state',
] as const;

type FakeDatabaseOptions = Readonly<{
  userVersion?: unknown;
  versionOnTransactionStart?: unknown;
  failOnTable?: string;
}>;

type FakeSnapshot = Readonly<{
  userVersion: unknown;
  tables: ReadonlySet<string>;
  indexes: ReadonlySet<string>;
  migrationVersions: readonly number[];
}>;

class FakeSchemaDatabase implements PhoneStateSchemaDatabase, PhoneStateSchemaTransaction {
  private currentUserVersion: unknown;
  private readonly versionOnTransactionStart: unknown;
  private readonly failOnTable: string | undefined;
  private tables = new Set<string>();
  private indexes = new Set<string>();
  private migrationVersions: number[] = [];

  readonly executedSql: string[] = [];
  transactionCount = 0;

  constructor(options: FakeDatabaseOptions = {}) {
    this.currentUserVersion = Object.prototype.hasOwnProperty.call(options, 'userVersion')
      ? options.userVersion
      : 0;
    this.versionOnTransactionStart = options.versionOnTransactionStart;
    this.failOnTable = options.failOnTable;
  }

  async getFirstAsync<T>(sql: string): Promise<T | null> {
    if (!/^\s*PRAGMA\s+user_version\s*;?\s*$/i.test(sql)) {
      throw new Error(`unexpected_query:${sql}`);
    }
    return { user_version: this.currentUserVersion } as T;
  }

  async execAsync(sql: string): Promise<void> {
    this.executedSql.push(sql);

    // Parse only the migration grammar needed by this faithful state-machine fake.
    // This deliberately does not split SQL on semicolons: future CHECK clauses and
    // string values may legally contain them.
    for (const match of sql.matchAll(/CREATE\s+TABLE\s+([a-z_][a-z0-9_]*)/gi)) {
      const tableName = match[1].toLowerCase();
      this.tables.add(tableName);
      if (this.failOnTable === tableName) {
        throw new Error(`injected_ddl_failure:${tableName}`);
      }
    }
    for (const match of sql.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+([a-z_][a-z0-9_]*)/gi)) {
      this.indexes.add(match[1].toLowerCase());
    }
    for (const match of sql.matchAll(
      /INSERT\s+INTO\s+migrations\s*\([^)]*\)\s*VALUES\s*\(\s*(\d+)/gi,
    )) {
      const version = Number(match[1]);
      if (this.migrationVersions.includes(version)) {
        throw new Error('duplicate_migration');
      }
      this.migrationVersions = [...this.migrationVersions, version];
    }
    const userVersion = /PRAGMA\s+user_version\s*=\s*(\d+)/i.exec(sql);
    if (userVersion) {
      this.currentUserVersion = Number(userVersion[1]);
    }
  }

  async withExclusiveTransactionAsync(
    task: (transaction: PhoneStateSchemaTransaction) => Promise<void>,
  ): Promise<void> {
    this.transactionCount += 1;
    if (this.versionOnTransactionStart !== undefined) {
      this.currentUserVersion = this.versionOnTransactionStart;
    }
    const snapshot = this.snapshot();
    try {
      await task(this);
    } catch (error) {
      this.restore(snapshot);
      throw error;
    }
  }

  tableNames(): readonly string[] {
    return [...this.tables].sort();
  }

  indexNames(): readonly string[] {
    return [...this.indexes].sort();
  }

  userVersion(): unknown {
    return this.currentUserVersion;
  }

  migrations(): readonly number[] {
    return [...this.migrationVersions];
  }

  private snapshot(): FakeSnapshot {
    return {
      userVersion: this.currentUserVersion,
      tables: new Set(this.tables),
      indexes: new Set(this.indexes),
      migrationVersions: [...this.migrationVersions],
    };
  }

  private restore(snapshot: FakeSnapshot): void {
    this.currentUserVersion = snapshot.userVersion;
    this.tables = new Set(snapshot.tables);
    this.indexes = new Set(snapshot.indexes);
    this.migrationVersions = [...snapshot.migrationVersions];
  }
}

describe('phone-state schema v1', () => {
  test('creates every durable boundary, required index, migration receipt, and version', async () => {
    const database = new FakeSchemaDatabase();

    await migratePhoneStateSchema(database);

    expect(database.tableNames()).toEqual(expect.arrayContaining(REQUIRED_TABLES));
    expect(database.tableNames()).toHaveLength(REQUIRED_TABLES.length);
    expect(database.indexNames()).toContain('operations_domain_sequence');
    expect(database.migrations()).toEqual([1]);
    expect(database.userVersion()).toBe(1);
    expect(PHONE_STATE_SCHEMA_VERSION).toBe(1);
  });

  test('declares the immutable operation identity and ordering constraints exactly once', () => {
    expect(PHONE_STATE_SCHEMA_V1).toMatch(
      /operation_id\s+TEXT\s+PRIMARY\s+KEY\s+NOT\s+NULL/i,
    );
    expect(PHONE_STATE_SCHEMA_V1).toMatch(
      /idempotency_key\s+TEXT\s+NOT\s+NULL\s+UNIQUE/i,
    );
    expect(PHONE_STATE_SCHEMA_V1).toMatch(
      /device_sequence\s+INTEGER\s+NOT\s+NULL\s+CHECK\s*\(\s*device_sequence\s*>\s*0\s*\)/i,
    );
    expect(PHONE_STATE_SCHEMA_V1).toMatch(
      /fingerprint\s+TEXT\s+NOT\s+NULL\s+CHECK\s*\(\s*length\s*\(\s*fingerprint\s*\)\s*=\s*64\s*\)/i,
    );
    expect(PHONE_STATE_SCHEMA_V1).toMatch(
      /UNIQUE\s*\(\s*device_id\s*,\s*device_sequence\s*\)/i,
    );
    expect(PHONE_STATE_SCHEMA_V1).toMatch(
      /CREATE\s+INDEX\s+operations_domain_sequence\s+ON\s+operations\s*\(\s*domain\s*,\s*device_sequence\s*\)/i,
    );
  });

  test('keeps projections and singleton device counters structurally unambiguous', () => {
    expect(PHONE_STATE_SCHEMA_V1).toMatch(
      /CREATE\s+TABLE\s+projections\s*\([\s\S]*?domain\s+TEXT\s+PRIMARY\s+KEY\s+NOT\s+NULL[\s\S]*?reducer_version\s+INTEGER\s+NOT\s+NULL[\s\S]*?canonical_state\s+TEXT\s+NOT\s+NULL[\s\S]*?through_operation_count\s+INTEGER\s+NOT\s+NULL[\s\S]*?\);/i,
    );
    expect(PHONE_STATE_SCHEMA_V1).toMatch(
      /CREATE\s+TABLE\s+device_state\s*\([\s\S]*?singleton\s+INTEGER\s+PRIMARY\s+KEY\s+CHECK\s*\(\s*singleton\s*=\s*1\s*\)[\s\S]*?device_id\s+TEXT\s+NOT\s+NULL[\s\S]*?next_sequence\s+INTEGER\s+NOT\s+NULL[\s\S]*?hybrid_counter\s+INTEGER\s+NOT\s+NULL[\s\S]*?\);/i,
    );
  });

  test('stores only key metadata references and never key or secret bytes', () => {
    const accountKeys = /CREATE\s+TABLE\s+account_keys\s*\(([\s\S]*?)\);/i.exec(
      PHONE_STATE_SCHEMA_V1,
    )?.[1];

    expect(accountKeys).toBeDefined();
    expect(accountKeys).toContain('secure_store_reference');
    expect(accountKeys).toContain('stable_uid_hash');
    expect(accountKeys).not.toMatch(/(?:^|[\s,])(secret|key_bytes|key_hex|cipher_key)(?:[\s,]|$)/i);
  });

  test('is a no-op at v1 without a transaction, DDL replay, or migration duplication', async () => {
    const database = new FakeSchemaDatabase();
    await migratePhoneStateSchema(database);
    const sqlCountAfterFirstMigration = database.executedSql.length;

    await migratePhoneStateSchema(database);

    expect(database.transactionCount).toBe(1);
    expect(database.executedSql).toHaveLength(sqlCountAfterFirstMigration);
    expect(database.migrations()).toEqual([1]);
  });

  test('rejects a newer database before opening a transaction', async () => {
    const database = new FakeSchemaDatabase({ userVersion: 2 });

    await expect(migratePhoneStateSchema(database)).rejects.toThrow(
      'phone_state_schema_too_new',
    );

    expect(database.transactionCount).toBe(0);
    expect(database.executedSql).toEqual([]);
  });

  test('rechecks the version under the exclusive transaction and skips a concurrent v1 migration', async () => {
    const database = new FakeSchemaDatabase({
      userVersion: 0,
      versionOnTransactionStart: 1,
    });

    await migratePhoneStateSchema(database);

    expect(database.transactionCount).toBe(1);
    expect(database.executedSql).toEqual([]);
    expect(database.userVersion()).toBe(1);
  });

  test('fails closed when the exclusive recheck observes a newer version', async () => {
    const database = new FakeSchemaDatabase({
      userVersion: 0,
      versionOnTransactionStart: 2,
    });

    await expect(migratePhoneStateSchema(database)).rejects.toThrow(
      'phone_state_schema_too_new',
    );

    expect(database.executedSql).toEqual([]);
    expect(database.userVersion()).toBe(2);
  });

  test('rolls back every table, receipt, and version when DDL fails mid-migration', async () => {
    const database = new FakeSchemaDatabase({ failOnTable: 'projections' });

    await expect(migratePhoneStateSchema(database)).rejects.toThrow(
      'injected_ddl_failure:projections',
    );

    expect(database.tableNames()).toEqual([]);
    expect(database.indexNames()).toEqual([]);
    expect(database.migrations()).toEqual([]);
    expect(database.userVersion()).toBe(0);
  });

  test.each([
    null,
    undefined,
    '0',
    -1,
    0.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects malformed PRAGMA user_version value %p without writes', async (userVersion) => {
    const database = new FakeSchemaDatabase({ userVersion });

    await expect(migratePhoneStateSchema(database)).rejects.toThrow(
      'phone_state_schema_version_invalid',
    );

    expect(database.transactionCount).toBe(0);
    expect(database.executedSql).toEqual([]);
  });

  test('contains no destructive schema or data statements', () => {
    expect(PHONE_STATE_SCHEMA_V1).not.toMatch(/\b(?:DROP|DELETE|TRUNCATE)\b/i);
  });
});
