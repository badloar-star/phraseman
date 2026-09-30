import {
  DATABASE_NAME,
  DATABASE_RELATIVE_PATH,
  MARKERS,
  RecoveryMode,
  runAndroidAccountSqlcipherRecoveryProbe,
} from '../runtime-probes/android-account-sqlcipher-recovery/probe';

type RecoveryPort = Parameters<typeof runAndroidAccountSqlcipherRecoveryProbe>[0];

const KEY_SQL = /^PRAGMA key = "x'[0-9a-f]{64}'"$/u;
const CIPHER_SQL = 'PRAGMA cipher_version';
const JOURNAL_SET_SQL = 'PRAGMA journal_mode = WAL';
const JOURNAL_READ_SQL = 'PRAGMA journal_mode';
const SYNC_SET_SQL = 'PRAGMA synchronous = FULL';
const SYNC_READ_SQL = 'PRAGMA synchronous';
const AUTO_SET_SQL = 'PRAGMA wal_autocheckpoint = 0';
const AUTO_READ_SQL = 'PRAGMA wal_autocheckpoint';
const CACHE_SET_SQL = 'PRAGMA cache_size = 8';
const CACHE_READ_SQL = 'PRAGMA cache_size';
const SPILL_SET_SQL = 'PRAGMA main.cache_spill = 8';
const SPILL_READ_SQL = 'PRAGMA main.cache_spill';
const BEGIN_SQL = 'BEGIN IMMEDIATE';
const CHECKPOINT_SQL = 'PRAGMA wal_checkpoint(TRUNCATE)';
const QUICK_SQL = 'PRAGMA quick_check';
const INTEGRITY_SQL = 'PRAGMA cipher_integrity_check';
const BATCH_SQL = 'SELECT expected_count, marker FROM wal_recovery_batch_v1 WHERE batch_id = ?';
const ITEMS_SQL =
  'SELECT ordinal, marker, length(payload) AS payload_length FROM wal_recovery_item_v1 WHERE batch_id = ? ORDER BY ordinal';
const BATCH_COUNT_SQL = 'SELECT count(*) AS row_count FROM wal_recovery_batch_v1 WHERE batch_id = ?';
const ITEM_COUNT_SQL = 'SELECT count(*) AS row_count FROM wal_recovery_item_v1 WHERE batch_id = ?';
const CANARY = 'account_sqlcipher_wal_recovery_public_canary_v1';

// зачем: события чтения обязаны нести параметры, иначе проверка «прочитали
// committed-v1 до checkpoint» не может найти само чтение и истинна всегда.
function readEvent(kind: 'first' | 'all', sql: string, params: readonly unknown[]): string {
  return params.length === 0 ? `${kind}:${sql}` : `${kind}:${sql}:${JSON.stringify(params)}`;
}

// Ключ `${sql}|${batchId}` переопределяет строку только для этого batch_id.
function rowFor(
  rows: Readonly<Record<string, unknown>>,
  defaults: Readonly<Record<string, unknown>>,
  sql: string,
  params: readonly unknown[],
): unknown {
  const scoped = params.length > 0 ? `${sql}|${String(params[0])}` : undefined;
  if (scoped !== undefined && Object.prototype.hasOwnProperty.call(rows, scoped)) return rows[scoped];
  if (Object.prototype.hasOwnProperty.call(rows, sql)) return rows[sql];
  return defaults[sql];
}

type FakeOptions = Readonly<{
  rows?: Readonly<Record<string, unknown>>;
  commitValue?: unknown;
  closeNoop?: boolean;
  methodResult?: 'promise' | 'non-promise';
  wrongReceiver?: boolean;
}>;

function closedError(): Error {
  return new Error('account_native_sqlite_closed');
}

function createFake(options: FakeOptions = {}) {
  const events: string[] = [];
  const emitted: string[] = [];
  let revoked = false;
  let closed = false;
  const rows = options.rows ?? {};

  const native = {
    commitAccountLeaseAsync: function commitAccountLeaseAsync(this: unknown): unknown {
      if (this !== native || options.wrongReceiver) throw new Error('C:\\private\\receiver');
      events.push('native:commit');
      if (options.methodResult === 'non-promise') return 'committed';
      return Promise.resolve(Object.prototype.hasOwnProperty.call(options, 'commitValue')
        ? options.commitValue
        : 'committed');
    },
    revokeAccountLeaseSync: function revokeAccountLeaseSync(this: unknown): void {
      if (this !== native || options.wrongReceiver) throw new Error('C:\\private\\receiver');
      events.push('native:revoke');
      revoked = true;
    },
    closeAccountLeaseAsync: function closeAccountLeaseAsync(this: unknown): Promise<void> {
      if (this !== native || options.wrongReceiver) throw new Error('C:\\private\\receiver');
      events.push('native:closeAsync');
      if (!options.closeNoop) closed = true;
      return Promise.resolve();
    },
    closeSync: function closeSync(this: unknown): void {
      if (this !== native || options.wrongReceiver) throw new Error('C:\\private\\receiver');
      events.push('native:closeSync');
      if (closed) throw closedError();
    },
    execSync: function execSync(this: unknown, sql: string): void {
      if (this !== native || options.wrongReceiver) throw new Error('C:\\private\\receiver');
      events.push(`native:execSync:${sql}`);
      if (closed) throw closedError();
      if (revoked) throw new Error('account_native_sqlite_revoked');
    },
  };

  const wrapper = {
    nativeDatabase: native,
    execAsync: function execAsync(this: unknown, sql: string): Promise<void> {
      if (this !== wrapper || options.wrongReceiver) return Promise.reject(new Error('C:\\private\\receiver'));
      events.push(`exec:${sql}`);
      return Promise.resolve();
    },
    getFirstAsync: function getFirstAsync(
      this: unknown,
      sql: string,
      ...params: readonly unknown[]
    ): Promise<unknown> {
      if (this !== wrapper || options.wrongReceiver) return Promise.reject(new Error('C:\\private\\receiver'));
      events.push(readEvent('first', sql, params));
      const defaults: Readonly<Record<string, unknown>> = {
        [CIPHER_SQL]: { cipher_version: '4.7.0' },
        [JOURNAL_READ_SQL]: { journal_mode: 'wal' },
        [SYNC_READ_SQL]: { synchronous: 2 },
        [AUTO_READ_SQL]: { wal_autocheckpoint: 0 },
        [CACHE_READ_SQL]: { cache_size: 8 },
        [SPILL_READ_SQL]: { cache_spill: 8 },
        'SELECT expected_count, marker FROM wal_recovery_batch_v1 WHERE batch_id = ?': {
          expected_count: 2,
          marker: 'account_sqlcipher_wal_recovery_public_canary_v1',
        },
        'SELECT count(*) AS row_count FROM wal_recovery_batch_v1 WHERE batch_id = ?': { row_count: 0 },
        'SELECT count(*) AS row_count FROM wal_recovery_item_v1 WHERE batch_id = ?': { row_count: 0 },
      };
      return Promise.resolve(rowFor(rows, defaults, sql, params));
    },
    getAllAsync: function getAllAsync(
      this: unknown,
      sql: string,
      ...params: readonly unknown[]
    ): Promise<unknown> {
      if (this !== wrapper || options.wrongReceiver) return Promise.reject(new Error('C:\\private\\receiver'));
      events.push(readEvent('all', sql, params));
      const defaults: Readonly<Record<string, unknown>> = {
        'SELECT ordinal, marker, length(payload) AS payload_length FROM wal_recovery_item_v1 WHERE batch_id = ? ORDER BY ordinal': [
          { ordinal: 1, marker: 'account_sqlcipher_wal_recovery_public_canary_v1', payload_length: 1048576 },
          { ordinal: 2, marker: 'account_sqlcipher_wal_recovery_public_canary_v1', payload_length: 1048576 },
        ],
        [QUICK_SQL]: [{ quick_check: 'ok' }],
        [INTEGRITY_SQL]: [],
        [CHECKPOINT_SQL]: [{ busy: 0, log: 0, checkpointed: 0 }],
      };
      return Promise.resolve(rowFor(rows, defaults, sql, params) ?? []);
    },
    runAsync: function runAsync(this: unknown, sql: string, params?: readonly unknown[]): Promise<unknown> {
      if (this !== wrapper || options.wrongReceiver) return Promise.reject(new Error('C:\\private\\receiver'));
      events.push(`run:${sql}:${JSON.stringify(params ?? [])}`);
      return Promise.resolve({ changes: 1 });
    },
  };

  const port: RecoveryPort = {
    defaultDatabaseDirectory: '/data/user/0/app.phraseman/files/SQLite///',
    openDatabaseAsync: async function openDatabaseAsync(
      this: unknown,
      name: string,
      openOptions: Readonly<{ useNewConnection: boolean; enableChangeListener: boolean }>,
      directory: string,
    ): Promise<unknown> {
      if (this !== port || options.wrongReceiver) throw new Error('C:\\private\\receiver');
      events.push(`open:${name}:${JSON.stringify(openOptions)}:${directory}`);
      return wrapper;
    },
  };
  return { port, events, emitted };
}

async function loadFreshProbe() {
  jest.resetModules();
  return import('../runtime-probes/android-account-sqlcipher-recovery/probe');
}

async function expectCode(operation: () => Promise<unknown>, code: string): Promise<void> {
  let observed: unknown;
  try {
    await operation();
  } catch (error) {
    observed = error;
  }
  expect(observed).toBeInstanceOf(Error);
  expect((observed as Error).message).toBe(code);
  expect((observed as Error).message).not.toMatch(/[\\/]|private/u);
}

function configuredPrefix(events: readonly string[]): readonly string[] {
  return events.slice(1, 11);
}

describe('Android Account V2 SQLCipher WAL recovery probe', () => {
  test('exports the dedicated canonical family and fixed markers', () => {
    expect(DATABASE_NAME).toBe(
      'accounts-v2-g-588b372845f968ba31b0e12c84bb17559ce7dc6de13247456e6cae9e3e971643.db',
    );
    expect(DATABASE_RELATIVE_PATH).toBe(`files/SQLite/accounts-v2/${DATABASE_NAME}`);
    expect(Object.values(MARKERS)).toEqual([
      'account_sqlcipher_recovery_prepare_pass',
      'account_sqlcipher_recovery_dirty_ready',
      'account_sqlcipher_recovery_rollback_pass',
      'account_sqlcipher_recovery_committed_wal_ready',
      'account_sqlcipher_recovery_recovery_pass',
      'account_sqlcipher_recovery_final_reopen_pass',
    ]);
  });

  test.each([
    'prepare',
    'dirty-hold',
    'rollback-verify',
    'committed-wal-hold',
    'recovery-verify',
    'final-reopen',
  ] as const)('%s keys first and proves exact WAL/FULL/autocheckpoint readbacks', async (mode) => {
    const fresh = await loadFreshProbe();
    const fake = createFake();
    const promise = fresh.runAndroidAccountSqlcipherRecoveryProbe(
      fake.port,
      mode,
      (marker) => { fake.events.push(`emit:${marker}`); fake.emitted.push(marker); },
    );
    if (mode.endsWith('-hold')) {
      await new Promise((resolve) => { setImmediate(resolve); });
    } else {
      await promise;
    }
    expect(fake.events[0]).toContain(`open:${DATABASE_NAME}:`);
    expect(fake.events[1].slice('exec:'.length)).toMatch(KEY_SQL);
    expect(configuredPrefix(fake.events)).toEqual([
      expect.stringMatching(/^exec:PRAGMA key/u),
      `first:${CIPHER_SQL}`,
      `exec:${JOURNAL_SET_SQL}`,
      `first:${JOURNAL_READ_SQL}`,
      `exec:${SYNC_SET_SQL}`,
      `first:${SYNC_READ_SQL}`,
      `exec:${AUTO_SET_SQL}`,
      `first:${AUTO_READ_SQL}`,
      expect.any(String),
      expect.any(String),
    ]);
  });

  test('dirty-hold configures spill before BEGIN, proves the full batch, emits once, and never closes', async () => {
    const fresh = await loadFreshProbe();
    const fake = createFake();
    void fresh.runAndroidAccountSqlcipherRecoveryProbe(
      fake.port,
      'dirty-hold',
      (marker) => { fake.events.push(`emit:${marker}`); fake.emitted.push(marker); },
    );
    await new Promise((resolve) => { setImmediate(resolve); });
    expect(fake.events).toEqual(expect.arrayContaining([
      `exec:${CACHE_SET_SQL}`,
      `first:${CACHE_READ_SQL}`,
      `exec:${SPILL_SET_SQL}`,
      `first:${SPILL_READ_SQL}`,
      `exec:${BEGIN_SQL}`,
      `emit:${MARKERS.dirtyReady}`,
    ]));
    expect(fake.events.indexOf(`first:${SPILL_READ_SQL}`)).toBeLessThan(fake.events.indexOf(`exec:${BEGIN_SQL}`));
    expect(fake.events.join('\n')).toMatch(/zeroblob\(1048576\)/u);
    expect(fake.events).not.toContain('native:commit');
    expect(fake.events).not.toContain('native:revoke');
    expect(fake.events).not.toContain('native:closeAsync');
    expect(fake.emitted).toEqual([MARKERS.dirtyReady]);
  });

  test('committed-wal-hold accepts only the captured exact committed result and remains open', async () => {
    const fresh = await loadFreshProbe();
    const fake = createFake();
    void fresh.runAndroidAccountSqlcipherRecoveryProbe(
      fake.port,
      'committed-wal-hold',
      (marker) => fake.emitted.push(marker),
    );
    await new Promise((resolve) => { setImmediate(resolve); });
    expect(fake.events).toContain('native:commit');
    expect(fake.emitted).toEqual([MARKERS.committedWalReady]);
    expect(fake.events).not.toContain('native:revoke');
    expect(fake.events).not.toContain('native:closeAsync');
  });

  test.each([undefined, null, 'done', {}, 1])('rejects non-committed lease result: %#', async (commitValue) => {
    const fresh = await loadFreshProbe();
    const fake = createFake({ commitValue });
    await expectCode(
      () => fresh.runAndroidAccountSqlcipherRecoveryProbe(fake.port, 'committed-wal-hold', () => undefined),
      'account_sqlcipher_recovery_commit_failed',
    );
    expect(fake.events).toContain('native:revoke');
  });

  test.each([
    [CIPHER_SQL, null, 'account_sqlcipher_recovery_cipher_unavailable'],
    [CIPHER_SQL, { cipher_version: '' }, 'account_sqlcipher_recovery_cipher_unavailable'],
    [JOURNAL_READ_SQL, { journal_mode: 'delete' }, 'account_sqlcipher_recovery_pragma_failed'],
    [SYNC_READ_SQL, { synchronous: '2' }, 'account_sqlcipher_recovery_pragma_failed'],
    [AUTO_READ_SQL, { wal_autocheckpoint: false }, 'account_sqlcipher_recovery_pragma_failed'],
    [CACHE_READ_SQL, { cache_size: 7 }, 'account_sqlcipher_recovery_pragma_failed'],
    [SPILL_READ_SQL, { cache_spill: '8' }, 'account_sqlcipher_recovery_pragma_failed'],
  ] as const)('fails closed on wrong typed/value PRAGMA %s', async (sql, row, code) => {
    const fresh = await loadFreshProbe();
    const fake = createFake({ rows: { [sql]: row } });
    await expectCode(
      () => fresh.runAndroidAccountSqlcipherRecoveryProbe(fake.port, 'dirty-hold', () => undefined),
      code,
    );
    expect(fake.emitted).toEqual([]);
  });

  test('rejects a partial committed batch using production authoritative row validation', async () => {
    const fresh = await loadFreshProbe();
    const fake = createFake({
      rows: {
        'SELECT expected_count, marker FROM wal_recovery_batch_v1 WHERE batch_id = ?': {
          expected_count: 2,
          marker: 'account_sqlcipher_wal_recovery_public_canary_v1',
        },
        'SELECT ordinal, marker, length(payload) AS payload_length FROM wal_recovery_item_v1 WHERE batch_id = ? ORDER BY ordinal': [
          { ordinal: 1, marker: 'account_sqlcipher_wal_recovery_public_canary_v1', payload_length: 1048576 },
        ],
      },
    });
    await expectCode(
      () => fresh.runAndroidAccountSqlcipherRecoveryProbe(fake.port, 'final-reopen', () => undefined),
      'account_sqlcipher_recovery_atomic_invariant_failed',
    );
  });

  test('recovery reads committed and dirty state before checkpoint and validates its exact result', async () => {
    const fresh = await loadFreshProbe();
    const fake = createFake({
      rows: {
        'PRAGMA wal_checkpoint(TRUNCATE)': [{ busy: 0, log: 0, checkpointed: 0 }],
      },
    });
    await fresh.runAndroidAccountSqlcipherRecoveryProbe(fake.port, 'recovery-verify', (marker) => fake.emitted.push(marker));
    const checkpoint = fake.events.indexOf(`all:${CHECKPOINT_SQL}`);
    expect(checkpoint).toBeGreaterThan(0);
    expect(fake.events.filter((event) => event === `all:${CHECKPOINT_SQL}`)).toHaveLength(1);
    const authoritativeReads = [
      readEvent('first', BATCH_SQL, ['committed-v1']),
      readEvent('all', ITEMS_SQL, ['committed-v1']),
      readEvent('first', BATCH_COUNT_SQL, ['dirty-v1']),
      readEvent('first', ITEM_COUNT_SQL, ['dirty-v1']),
      `all:${QUICK_SQL}`,
      `all:${INTEGRITY_SQL}`,
    ];
    for (const read of authoritativeReads) {
      const index = fake.events.indexOf(read);
      expect({ read, found: index >= 0 }).toEqual({ read, found: true });
      expect({ read, beforeCheckpoint: index < checkpoint }).toEqual({ read, beforeCheckpoint: true });
    }
    expect(fake.events.lastIndexOf(readEvent('first', BATCH_SQL, ['committed-v1']))).toBeGreaterThan(checkpoint);
    expect(fake.events.lastIndexOf(readEvent('all', ITEMS_SQL, ['committed-v1']))).toBeGreaterThan(checkpoint);
    expect(fake.emitted).toEqual([MARKERS.recoveryPass]);
  });

  test('rollback-verify reads dirty-v1 counts with the exact parameter before integrity', async () => {
    const fresh = await loadFreshProbe();
    const fake = createFake();
    await fresh.runAndroidAccountSqlcipherRecoveryProbe(fake.port, 'rollback-verify', (marker) => fake.emitted.push(marker));
    const batchCount = fake.events.indexOf(readEvent('first', BATCH_COUNT_SQL, ['dirty-v1']));
    const itemCount = fake.events.indexOf(readEvent('first', ITEM_COUNT_SQL, ['dirty-v1']));
    expect(batchCount).toBeGreaterThan(0);
    expect(itemCount).toBeGreaterThan(batchCount);
    expect(fake.events.indexOf(`all:${QUICK_SQL}`)).toBeGreaterThan(itemCount);
    expect(fake.events).not.toContain(`all:${CHECKPOINT_SQL}`);
    expect(fake.emitted).toEqual([MARKERS.rollbackPass]);
  });

  test.each([
    ['dirty batch row survived rollback', { [`${BATCH_COUNT_SQL}|dirty-v1`]: { row_count: 1 } }],
    ['dirty item rows survived rollback', { [`${ITEM_COUNT_SQL}|dirty-v1`]: { row_count: 1 } }],
    ['dirty item count string', { [`${ITEM_COUNT_SQL}|dirty-v1`]: { row_count: '0' } }],
    ['dirty batch count missing', { [`${BATCH_COUNT_SQL}|dirty-v1`]: null }],
  ] as const)('rollback-verify fails closed: %s', async (_name, rows) => {
    const fresh = await loadFreshProbe();
    const fake = createFake({ rows });
    await expectCode(
      () => fresh.runAndroidAccountSqlcipherRecoveryProbe(fake.port, 'rollback-verify', (marker) => fake.emitted.push(marker)),
      'account_sqlcipher_recovery_atomic_invariant_failed',
    );
    expect(fake.emitted).toEqual([]);
    expect(fake.events).not.toContain(`all:${CHECKPOINT_SQL}`);
  });

  test.each([
    ['items without batch', { [`${BATCH_SQL}|committed-v1`]: null }],
    ['batch without items', { [`${ITEMS_SQL}|committed-v1`]: [] }],
    ['batch with one item', { [`${ITEMS_SQL}|committed-v1`]: [
      { ordinal: 1, marker: CANARY, payload_length: 1048576 },
    ] }],
    ['batch with wrong expected_count', { [`${BATCH_SQL}|committed-v1`]: { expected_count: 1, marker: CANARY } }],
    ['dirty batch present after recovery', { [`${BATCH_COUNT_SQL}|dirty-v1`]: { row_count: 1 } }],
  ] as const)('recovery-verify fails closed before checkpoint: %s', async (_name, rows) => {
    const fresh = await loadFreshProbe();
    const fake = createFake({ rows });
    await expectCode(
      () => fresh.runAndroidAccountSqlcipherRecoveryProbe(fake.port, 'recovery-verify', (marker) => fake.emitted.push(marker)),
      'account_sqlcipher_recovery_atomic_invariant_failed',
    );
    expect(fake.emitted).toEqual([]);
    expect(fake.events).not.toContain(`all:${CHECKPOINT_SQL}`);
  });

  test.each([
    [[{ quick_check: 'not ok' }], [], 'account_sqlcipher_recovery_quick_check_failed'],
    [[{ quick_check: 'ok' }], [{ cipher_integrity_check: 'bad page' }], 'account_sqlcipher_recovery_integrity_failed'],
    [[{ quick_check: 'ok' }], [], ''],
  ] as const)('validates bounded quick/cipher integrity rows %#', async (quickRows, integrityRows, code) => {
    const fresh = await loadFreshProbe();
    const fake = createFake({ rows: { [QUICK_SQL]: quickRows, [INTEGRITY_SQL]: integrityRows } });
    const operation = () => fresh.runAndroidAccountSqlcipherRecoveryProbe(fake.port, 'final-reopen', () => undefined);
    if (code.length > 0) await expectCode(operation, code);
    else await operation();
  });

  test('requires physical close evidence before emitting a PASS marker', async () => {
    const fresh = await loadFreshProbe();
    const fake = createFake({ closeNoop: true });
    await expectCode(
      () => fresh.runAndroidAccountSqlcipherRecoveryProbe(fake.port, 'prepare', (marker) => fake.emitted.push(marker)),
      'account_sqlcipher_recovery_close_ineffective',
    );
    expect(fake.emitted).toEqual([]);
  });

  test('uses genuine Promises, stable receivers, and sanitized failures', async () => {
    const fresh = await loadFreshProbe();
    const fake = createFake({ methodResult: 'non-promise' });
    await expectCode(
      () => fresh.runAndroidAccountSqlcipherRecoveryProbe(fake.port, 'committed-wal-hold', () => undefined),
      'account_sqlcipher_recovery_commit_failed',
    );
    const receiverModule = await loadFreshProbe();
    const receiver = createFake({ wrongReceiver: true });
    await expectCode(
      () => receiverModule.runAndroidAccountSqlcipherRecoveryProbe(receiver.port, 'prepare', () => undefined),
      'account_sqlcipher_recovery_open_failed',
    );
  });

  test('claims exactly one mode per JS runtime before a second open', async () => {
    const fresh = await loadFreshProbe();
    const first = createFake();
    await fresh.runAndroidAccountSqlcipherRecoveryProbe(first.port, 'prepare', () => undefined);
    const second = createFake();
    await expectCode(
      () => fresh.runAndroidAccountSqlcipherRecoveryProbe(second.port, 'final-reopen', () => undefined),
      'account_sqlcipher_recovery_restart_required',
    );
    expect(second.events).toEqual([]);
  });

  test.each(['PREPARE', 'delete', '', null, 7])('rejects invalid mode before opening: %#', async (mode) => {
    const fresh = await loadFreshProbe();
    const fake = createFake();
    await expectCode(
      () => fresh.runAndroidAccountSqlcipherRecoveryProbe(fake.port, mode as RecoveryMode, () => undefined),
      'account_sqlcipher_recovery_invalid_mode',
    );
    expect(fake.events).toEqual([]);
  });
});
