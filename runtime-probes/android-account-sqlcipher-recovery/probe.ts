export const DATABASE_NAME =
  'accounts-v2-g-588b372845f968ba31b0e12c84bb17559ce7dc6de13247456e6cae9e3e971643.db';
export const DATABASE_RELATIVE_PATH = `files/SQLite/accounts-v2/${DATABASE_NAME}`;

export type RecoveryMode =
  | 'prepare'
  | 'dirty-hold'
  | 'rollback-verify'
  | 'committed-wal-hold'
  | 'recovery-verify'
  | 'final-reopen';

export interface AndroidAccountSqlcipherRecoveryPort {
  readonly defaultDatabaseDirectory: unknown;
  openDatabaseAsync(
    name: string,
    options: Readonly<{ useNewConnection: boolean; enableChangeListener: boolean }>,
    directory: string,
  ): Promise<unknown>;
}

export const MARKERS = Object.freeze({
  preparePass: 'account_sqlcipher_recovery_prepare_pass',
  dirtyReady: 'account_sqlcipher_recovery_dirty_ready',
  rollbackPass: 'account_sqlcipher_recovery_rollback_pass',
  committedWalReady: 'account_sqlcipher_recovery_committed_wal_ready',
  recoveryPass: 'account_sqlcipher_recovery_recovery_pass',
  finalReopenPass: 'account_sqlcipher_recovery_final_reopen_pass',
  // зачем: хост не видит порядок SQL внутри процесса; эти два фиксированных маркера
  // в recovery-verify доказывают «авторитетное чтение ДО checkpoint» наблюдаемым
  // фактом, из которого лаунчер строит RecoveryOrdering, а не выдумывает его.
  recoveryAuthoritativeRead: 'account_sqlcipher_recovery_authoritative_read',
  recoveryCheckpointed: 'account_sqlcipher_recovery_checkpointed',
} as const);

const TEST_KEY_HEX = 'a7e8d6441e52d6d6fe3bf41f32b36bcfa422d753d8a2f4f859f29f558a6339de';
const PUBLIC_CANARY = 'account_sqlcipher_wal_recovery_public_canary_v1';
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
const CREATE_BATCH_SQL = `CREATE TABLE wal_recovery_batch_v1 (
  batch_id TEXT PRIMARY KEY,
  expected_count INTEGER NOT NULL CHECK (expected_count = 2),
  marker TEXT NOT NULL
) STRICT`;
const CREATE_ITEM_SQL = `CREATE TABLE wal_recovery_item_v1 (
  batch_id TEXT NOT NULL REFERENCES wal_recovery_batch_v1(batch_id),
  ordinal INTEGER NOT NULL CHECK (ordinal IN (1, 2)),
  marker TEXT NOT NULL,
  payload BLOB NOT NULL CHECK (length(payload) = 1048576),
  PRIMARY KEY (batch_id, ordinal)
) STRICT`;
const INSERT_BATCH_SQL =
  'INSERT INTO wal_recovery_batch_v1 (batch_id, expected_count, marker) VALUES (?, 2, ?)';
const INSERT_ITEM_SQL =
  'INSERT INTO wal_recovery_item_v1 (batch_id, ordinal, marker, payload) VALUES (?, ?, ?, zeroblob(1048576))';
const BATCH_SQL =
  'SELECT expected_count, marker FROM wal_recovery_batch_v1 WHERE batch_id = ?';
const ITEMS_SQL =
  'SELECT ordinal, marker, length(payload) AS payload_length FROM wal_recovery_item_v1 WHERE batch_id = ? ORDER BY ordinal';
const BATCH_COUNT_SQL =
  'SELECT count(*) AS row_count FROM wal_recovery_batch_v1 WHERE batch_id = ?';
const ITEM_COUNT_SQL =
  'SELECT count(*) AS row_count FROM wal_recovery_item_v1 WHERE batch_id = ?';
const QUICK_SQL = 'PRAGMA quick_check';
const INTEGRITY_SQL = 'PRAGMA cipher_integrity_check';
const CHECKPOINT_SQL = 'PRAGMA wal_checkpoint(TRUNCATE)';
const POST_CLOSE_SQL = 'SELECT 1';

type FailureCode =
  | 'account_sqlcipher_recovery_invalid_mode'
  | 'account_sqlcipher_recovery_restart_required'
  | 'account_sqlcipher_recovery_open_failed'
  | 'account_sqlcipher_recovery_unsupported'
  | 'account_sqlcipher_recovery_key_failed'
  | 'account_sqlcipher_recovery_cipher_unavailable'
  | 'account_sqlcipher_recovery_pragma_failed'
  | 'account_sqlcipher_recovery_schema_failed'
  | 'account_sqlcipher_recovery_write_failed'
  | 'account_sqlcipher_recovery_atomic_invariant_failed'
  | 'account_sqlcipher_recovery_commit_failed'
  | 'account_sqlcipher_recovery_quick_check_failed'
  | 'account_sqlcipher_recovery_integrity_failed'
  | 'account_sqlcipher_recovery_checkpoint_failed'
  | 'account_sqlcipher_recovery_revoke_failed'
  | 'account_sqlcipher_recovery_close_failed'
  | 'account_sqlcipher_recovery_close_ineffective'
  | 'account_sqlcipher_recovery_emit_failed'
  | 'account_sqlcipher_recovery_failed';

type CapturedMethod = Readonly<{
  receiver: object;
  owner: object;
  name: PropertyKey;
  method: (...args: readonly unknown[]) => unknown;
}>;

type Cleanup = Readonly<{
  revokeAccountLeaseSync: CapturedMethod;
  closeAccountLeaseAsync: CapturedMethod;
  closeSync: CapturedMethod;
  execSync: CapturedMethod;
}>;

type Connection = Readonly<{
  wrapper: object;
  native: object;
  nativeDescriptor: PropertyDescriptor;
  execAsync: CapturedMethod;
  getFirstAsync: CapturedMethod;
  getAllAsync: CapturedMethod;
  runAsync: CapturedMethod;
  commitAccountLeaseAsync: CapturedMethod;
  cleanup: Cleanup;
}>;

const CAPTURED_PROMISE_THEN = Promise.prototype.then;
let modeClaimed = false;

class RecoveryFailure extends Error {}

function fail(code: FailureCode): never {
  throw new RecoveryFailure(code);
}

function isObject(value: unknown): value is object {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

function isFailure(value: unknown): value is RecoveryFailure {
  try {
    return value instanceof RecoveryFailure;
  } catch {
    return false;
  }
}

function normalizeFailure(value: unknown, fallback: FailureCode): RecoveryFailure {
  return isFailure(value) ? new RecoveryFailure(value.message as FailureCode) : new RecoveryFailure(fallback);
}

function isMode(value: unknown): value is RecoveryMode {
  return value === 'prepare' || value === 'dirty-hold' || value === 'rollback-verify' ||
    value === 'committed-wal-hold' || value === 'recovery-verify' || value === 'final-reopen';
}

function findMethod(receiver: object, name: PropertyKey): CapturedMethod {
  let cursor: object | null = receiver;
  for (let depth = 0; depth < 32 && cursor !== null; depth += 1) {
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(cursor, name);
    } catch {
      fail('account_sqlcipher_recovery_unsupported');
    }
    if (descriptor !== undefined) {
      if (!Object.prototype.hasOwnProperty.call(descriptor, 'value') || typeof descriptor.value !== 'function') {
        fail('account_sqlcipher_recovery_unsupported');
      }
      return Object.freeze({
        receiver,
        owner: cursor,
        name,
        method: descriptor.value as (...args: readonly unknown[]) => unknown,
      });
    }
    try {
      cursor = Object.getPrototypeOf(cursor) as object | null;
    } catch {
      fail('account_sqlcipher_recovery_unsupported');
    }
  }
  fail('account_sqlcipher_recovery_unsupported');
}

function dataDescriptor(receiver: object, name: PropertyKey): PropertyDescriptor | undefined {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(receiver, name);
    return descriptor !== undefined && Object.prototype.hasOwnProperty.call(descriptor, 'value')
      ? descriptor
      : undefined;
  } catch {
    fail('account_sqlcipher_recovery_unsupported');
  }
}

function assertMethodStable(captured: CapturedMethod): void {
  const current = findMethod(captured.receiver, captured.name);
  if (current.owner !== captured.owner || current.method !== captured.method) {
    fail('account_sqlcipher_recovery_unsupported');
  }
}

function assertConnectionStable(connection: Connection): void {
  const descriptor = dataDescriptor(connection.wrapper, 'nativeDatabase');
  if (
    descriptor === undefined || descriptor.value !== connection.native ||
    descriptor.enumerable !== connection.nativeDescriptor.enumerable ||
    descriptor.configurable !== connection.nativeDescriptor.configurable ||
    descriptor.writable !== connection.nativeDescriptor.writable
  ) fail('account_sqlcipher_recovery_unsupported');
  for (const method of [
    connection.execAsync,
    connection.getFirstAsync,
    connection.getAllAsync,
    connection.runAsync,
    connection.commitAccountLeaseAsync,
    connection.cleanup.revokeAccountLeaseSync,
    connection.cleanup.closeAccountLeaseAsync,
    connection.cleanup.closeSync,
    connection.cleanup.execSync,
  ]) assertMethodStable(method);
}

function invokeCaptured(captured: CapturedMethod, args: readonly unknown[]): unknown {
  assertMethodStable(captured);
  return Reflect.apply(captured.method, captured.receiver, args);
}

function invoke(connection: Connection, captured: CapturedMethod, args: readonly unknown[]): unknown {
  assertConnectionStable(connection);
  return invokeCaptured(captured, args);
}

function isGenuinePromise(value: unknown): value is Promise<unknown> {
  if (!isObject(value)) return false;
  try {
    Reflect.apply(CAPTURED_PROMISE_THEN, value, [undefined, () => undefined]);
    return true;
  } catch {
    return false;
  }
}

async function awaitCall(
  connection: Connection,
  method: CapturedMethod,
  args: readonly unknown[],
  code: FailureCode,
): Promise<unknown> {
  let result: unknown;
  try {
    result = invoke(connection, method, args);
  } catch (error) {
    if (isFailure(error)) throw error;
    fail(code);
  }
  if (!isGenuinePromise(result)) fail(code);
  try {
    const resolved = await result;
    assertConnectionStable(connection);
    return resolved;
  } catch (error) {
    if (isFailure(error)) throw error;
    fail(code);
  }
}

function plainRow(value: unknown, keys: readonly string[]): Record<string, unknown> | undefined {
  if (!isObject(value)) return undefined;
  try {
    if (Object.getPrototypeOf(value) !== Object.prototype) return undefined;
    const actual = Reflect.ownKeys(value);
    if (actual.length !== keys.length || !keys.every((key, index) => actual[index] === key)) return undefined;
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) return undefined;
    }
    return value as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function exactArray(value: unknown): readonly unknown[] | undefined {
  if (!Array.isArray(value)) return undefined;
  try {
    return Object.getPrototypeOf(value) === Array.prototype ? value : undefined;
  } catch {
    return undefined;
  }
}

function requireStringRow(value: unknown, key: string, expected?: string): void {
  const row = plainRow(value, [key]);
  const candidate = row?.[key];
  if (typeof candidate !== 'string' || candidate.trim().length === 0 ||
      (expected !== undefined && candidate !== expected)) {
    fail(key === 'cipher_version'
      ? 'account_sqlcipher_recovery_cipher_unavailable'
      : 'account_sqlcipher_recovery_pragma_failed');
  }
}

function requireIntegerRow(value: unknown, key: string, expected: number): void {
  const row = plainRow(value, [key]);
  if (row?.[key] !== expected || !Number.isSafeInteger(row[key])) {
    fail('account_sqlcipher_recovery_pragma_failed');
  }
}

async function configure(connection: Connection): Promise<void> {
  await awaitCall(connection, connection.execAsync, [`PRAGMA key = "x'${TEST_KEY_HEX}'"`], 'account_sqlcipher_recovery_key_failed');
  requireStringRow(
    await awaitCall(connection, connection.getFirstAsync, [CIPHER_SQL], 'account_sqlcipher_recovery_cipher_unavailable'),
    'cipher_version',
  );
  await awaitCall(connection, connection.execAsync, [JOURNAL_SET_SQL], 'account_sqlcipher_recovery_pragma_failed');
  requireStringRow(
    await awaitCall(connection, connection.getFirstAsync, [JOURNAL_READ_SQL], 'account_sqlcipher_recovery_pragma_failed'),
    'journal_mode',
    'wal',
  );
  await awaitCall(connection, connection.execAsync, [SYNC_SET_SQL], 'account_sqlcipher_recovery_pragma_failed');
  requireIntegerRow(
    await awaitCall(connection, connection.getFirstAsync, [SYNC_READ_SQL], 'account_sqlcipher_recovery_pragma_failed'),
    'synchronous',
    2,
  );
  await awaitCall(connection, connection.execAsync, [AUTO_SET_SQL], 'account_sqlcipher_recovery_pragma_failed');
  requireIntegerRow(
    await awaitCall(connection, connection.getFirstAsync, [AUTO_READ_SQL], 'account_sqlcipher_recovery_pragma_failed'),
    'wal_autocheckpoint',
    0,
  );
}

async function configureSpill(connection: Connection): Promise<void> {
  await awaitCall(connection, connection.execAsync, [CACHE_SET_SQL], 'account_sqlcipher_recovery_pragma_failed');
  requireIntegerRow(
    await awaitCall(connection, connection.getFirstAsync, [CACHE_READ_SQL], 'account_sqlcipher_recovery_pragma_failed'),
    'cache_size',
    8,
  );
  await awaitCall(connection, connection.execAsync, [SPILL_SET_SQL], 'account_sqlcipher_recovery_pragma_failed');
  requireIntegerRow(
    await awaitCall(connection, connection.getFirstAsync, [SPILL_READ_SQL], 'account_sqlcipher_recovery_pragma_failed'),
    'cache_spill',
    8,
  );
}

async function insertBatch(connection: Connection, batchId: 'dirty-v1' | 'committed-v1'): Promise<void> {
  await awaitCall(connection, connection.runAsync, [INSERT_BATCH_SQL, [batchId, PUBLIC_CANARY]], 'account_sqlcipher_recovery_write_failed');
  for (const ordinal of [1, 2] as const) {
    await awaitCall(
      connection,
      connection.runAsync,
      [INSERT_ITEM_SQL, [batchId, ordinal, PUBLIC_CANARY]],
      'account_sqlcipher_recovery_write_failed',
    );
  }
}

async function requireBatch(connection: Connection, batchId: 'dirty-v1' | 'committed-v1'): Promise<void> {
  const batch = plainRow(
    await awaitCall(connection, connection.getFirstAsync, [BATCH_SQL, batchId], 'account_sqlcipher_recovery_atomic_invariant_failed'),
    ['expected_count', 'marker'],
  );
  if (batch?.expected_count !== 2 || batch.marker !== PUBLIC_CANARY) {
    fail('account_sqlcipher_recovery_atomic_invariant_failed');
  }
  const items = exactArray(
    await awaitCall(connection, connection.getAllAsync, [ITEMS_SQL, batchId], 'account_sqlcipher_recovery_atomic_invariant_failed'),
  );
  if (items === undefined || items.length !== 2) fail('account_sqlcipher_recovery_atomic_invariant_failed');
  for (let index = 0; index < items.length; index += 1) {
    const row = plainRow(items[index], ['ordinal', 'marker', 'payload_length']);
    if (row?.ordinal !== index + 1 || row.marker !== PUBLIC_CANARY || row.payload_length !== 1048576) {
      fail('account_sqlcipher_recovery_atomic_invariant_failed');
    }
  }
}

async function requireAbsent(connection: Connection, batchId: 'dirty-v1'): Promise<void> {
  for (const sql of [BATCH_COUNT_SQL, ITEM_COUNT_SQL]) {
    const row = plainRow(
      await awaitCall(connection, connection.getFirstAsync, [sql, batchId], 'account_sqlcipher_recovery_atomic_invariant_failed'),
      ['row_count'],
    );
    if (row?.row_count !== 0) fail('account_sqlcipher_recovery_atomic_invariant_failed');
  }
}

async function requireIntegrity(connection: Connection): Promise<void> {
  const quick = exactArray(
    await awaitCall(connection, connection.getAllAsync, [QUICK_SQL], 'account_sqlcipher_recovery_quick_check_failed'),
  );
  if (quick === undefined || quick.length !== 1 || plainRow(quick[0], ['quick_check'])?.quick_check !== 'ok') {
    fail('account_sqlcipher_recovery_quick_check_failed');
  }
  const cipher = exactArray(
    await awaitCall(connection, connection.getAllAsync, [INTEGRITY_SQL], 'account_sqlcipher_recovery_integrity_failed'),
  );
  if (cipher === undefined || cipher.length !== 0) fail('account_sqlcipher_recovery_integrity_failed');
}

async function checkpoint(connection: Connection): Promise<void> {
  const rows = exactArray(
    await awaitCall(connection, connection.getAllAsync, [CHECKPOINT_SQL], 'account_sqlcipher_recovery_checkpoint_failed'),
  );
  if (rows === undefined || rows.length !== 1) fail('account_sqlcipher_recovery_checkpoint_failed');
  const row = plainRow(rows[0], ['busy', 'log', 'checkpointed']);
  if (
    row?.busy !== 0 || !Number.isSafeInteger(row.log) || (row.log as number) < 0 ||
    !Number.isSafeInteger(row.checkpointed) || (row.checkpointed as number) < 0
  ) fail('account_sqlcipher_recovery_checkpoint_failed');
}

function markerFor(mode: RecoveryMode): string {
  return {
    prepare: MARKERS.preparePass,
    'dirty-hold': MARKERS.dirtyReady,
    'rollback-verify': MARKERS.rollbackPass,
    'committed-wal-hold': MARKERS.committedWalReady,
    'recovery-verify': MARKERS.recoveryPass,
    'final-reopen': MARKERS.finalReopenPass,
  }[mode];
}

function emitProgress(emit: (marker: string) => void, marker: string): void {
  try {
    emit(marker);
  } catch {
    fail('account_sqlcipher_recovery_emit_failed');
  }
}

async function execute(
  connection: Connection,
  mode: RecoveryMode,
  emit: (marker: string) => void,
): Promise<'close' | 'hold'> {
  await configure(connection);
  if (mode === 'prepare') {
    await awaitCall(connection, connection.execAsync, [CREATE_BATCH_SQL], 'account_sqlcipher_recovery_schema_failed');
    await awaitCall(connection, connection.execAsync, [CREATE_ITEM_SQL], 'account_sqlcipher_recovery_schema_failed');
    return 'close';
  }
  if (mode === 'dirty-hold') {
    await configureSpill(connection);
    await awaitCall(connection, connection.execAsync, [BEGIN_SQL], 'account_sqlcipher_recovery_write_failed');
    await insertBatch(connection, 'dirty-v1');
    await requireBatch(connection, 'dirty-v1');
    return 'hold';
  }
  if (mode === 'rollback-verify') {
    await requireAbsent(connection, 'dirty-v1');
    await requireIntegrity(connection);
    return 'close';
  }
  if (mode === 'committed-wal-hold') {
    await awaitCall(connection, connection.execAsync, [BEGIN_SQL], 'account_sqlcipher_recovery_write_failed');
    await insertBatch(connection, 'committed-v1');
    const result = await awaitCall(
      connection,
      connection.commitAccountLeaseAsync,
      [],
      'account_sqlcipher_recovery_commit_failed',
    );
    if (result !== 'committed') fail('account_sqlcipher_recovery_commit_failed');
    await requireBatch(connection, 'committed-v1');
    return 'hold';
  }
  if (mode === 'recovery-verify') {
    await requireBatch(connection, 'committed-v1');
    await requireAbsent(connection, 'dirty-v1');
    await requireIntegrity(connection);
    emitProgress(emit, MARKERS.recoveryAuthoritativeRead);
    await checkpoint(connection);
    emitProgress(emit, MARKERS.recoveryCheckpointed);
    await requireBatch(connection, 'committed-v1');
    return 'close';
  }
  await requireBatch(connection, 'committed-v1');
  await requireAbsent(connection, 'dirty-v1');
  await requireIntegrity(connection);
  return 'close';
}

// зачем: эмулятор 2026-09-30 отдал close_ineffective — нативный слой заворачивает отказ в
// «Invalid arguments: account_native_sqlite_*». Словарь выровнен с канонической
// SQLCipher-пробой (PASS 2026-09-27 на том же эмуляторе) и привязан к имени метода:
// отказ чужого метода не доказывает, что закрыт именно этот.
function knownClosed(error: unknown, method: 'closeSync' | 'execSync'): boolean {
  if (!isObject(error)) return false;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(error, 'message');
    if (descriptor === undefined || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) return false;
    const prefix = `Call to function 'NativeDatabase.${method}' has been rejected.\n→ Caused by: `;
    const closed = descriptor.value === 'account_native_sqlite_closed' ||
      descriptor.value === `${prefix}Access to closed resource` ||
      descriptor.value === `${prefix}Invalid arguments: account_native_sqlite_closed`;
    // зачем: ревью P3 — «revoked» не доказывает физическое закрытие; для closeSync он не
    // принимается. execSync после revoke законно отвечает revoked.
    if (method === 'closeSync') return closed;
    return closed ||
      descriptor.value === 'account_native_sqlite_revoked' ||
      descriptor.value === `${prefix}Invalid arguments: account_native_sqlite_revoked`;
  } catch {
    return false;
  }
}

async function cleanup(connection: Connection): Promise<void> {
  try {
    if (invokeCaptured(connection.cleanup.revokeAccountLeaseSync, []) !== undefined) {
      fail('account_sqlcipher_recovery_revoke_failed');
    }
  } catch (error) {
    throw normalizeFailure(error, 'account_sqlcipher_recovery_revoke_failed');
  }
  try {
    const result = invokeCaptured(connection.cleanup.closeAccountLeaseAsync, []);
    if (!isGenuinePromise(result)) fail('account_sqlcipher_recovery_close_failed');
    const value = await result;
    if (value !== undefined && value !== null) fail('account_sqlcipher_recovery_close_failed');
  } catch (error) {
    throw normalizeFailure(error, 'account_sqlcipher_recovery_close_failed');
  }
  let closeRejected = false;
  let execRejected = false;
  try {
    invokeCaptured(connection.cleanup.closeSync, []);
  } catch (error) {
    closeRejected = knownClosed(error, 'closeSync');
  }
  try {
    invokeCaptured(connection.cleanup.execSync, [POST_CLOSE_SQL]);
  } catch (error) {
    execRejected = knownClosed(error, 'execSync');
  }
  if (!closeRejected || !execRejected) fail('account_sqlcipher_recovery_close_ineffective');
}

async function captureConnection(wrapperValue: unknown): Promise<Connection> {
  if (!isObject(wrapperValue)) fail('account_sqlcipher_recovery_unsupported');
  const nativeDescriptor = dataDescriptor(wrapperValue, 'nativeDatabase');
  if (nativeDescriptor === undefined || !isObject(nativeDescriptor.value)) fail('account_sqlcipher_recovery_unsupported');
  const native = nativeDescriptor.value;
  const connection: Connection = Object.freeze({
    wrapper: wrapperValue,
    native,
    nativeDescriptor: Object.freeze({ ...nativeDescriptor }),
    execAsync: findMethod(wrapperValue, 'execAsync'),
    getFirstAsync: findMethod(wrapperValue, 'getFirstAsync'),
    getAllAsync: findMethod(wrapperValue, 'getAllAsync'),
    runAsync: findMethod(wrapperValue, 'runAsync'),
    commitAccountLeaseAsync: findMethod(native, 'commitAccountLeaseAsync'),
    cleanup: Object.freeze({
      revokeAccountLeaseSync: findMethod(native, 'revokeAccountLeaseSync'),
      closeAccountLeaseAsync: findMethod(native, 'closeAccountLeaseAsync'),
      closeSync: findMethod(native, 'closeSync'),
      execSync: findMethod(native, 'execSync'),
    }),
  });
  assertConnectionStable(connection);
  return connection;
}

function normalizeDirectory(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) fail('account_sqlcipher_recovery_unsupported');
  const base = value.replace(/[\\/]+$/u, '');
  if (base.length === 0) fail('account_sqlcipher_recovery_unsupported');
  return `${base}/accounts-v2`;
}

async function openConnection(port: AndroidAccountSqlcipherRecoveryPort): Promise<Connection> {
  if (!isObject(port)) fail('account_sqlcipher_recovery_unsupported');
  const open = findMethod(port, 'openDatabaseAsync');
  const directory = normalizeDirectory(port.defaultDatabaseDirectory);
  let opened: unknown;
  try {
    opened = invokeCaptured(open, [
      DATABASE_NAME,
      Object.freeze({ useNewConnection: true, enableChangeListener: false }),
      directory,
    ]);
  } catch (error) {
    if (isFailure(error)) throw error;
    fail('account_sqlcipher_recovery_open_failed');
  }
  if (!isGenuinePromise(opened)) fail('account_sqlcipher_recovery_open_failed');
  let wrapper: unknown;
  try {
    wrapper = await opened;
  } catch {
    fail('account_sqlcipher_recovery_open_failed');
  }
  try {
    return await captureConnection(wrapper);
  } catch (error) {
    throw normalizeFailure(error, 'account_sqlcipher_recovery_unsupported');
  }
}

export async function runAndroidAccountSqlcipherRecoveryProbe(
  port: AndroidAccountSqlcipherRecoveryPort,
  mode: RecoveryMode,
  emit: (marker: string) => void,
): Promise<void> {
  if (!isMode(mode)) fail('account_sqlcipher_recovery_invalid_mode');
  if (modeClaimed) fail('account_sqlcipher_recovery_restart_required');
  modeClaimed = true;

  let connection: Connection;
  try {
    connection = await openConnection(port);
  } catch (error) {
    throw normalizeFailure(error, 'account_sqlcipher_recovery_open_failed');
  }

  let disposition: 'close' | 'hold';
  try {
    disposition = await execute(connection, mode, emit);
  } catch (error) {
    try {
      await cleanup(connection);
    } catch (cleanupError) {
      throw normalizeFailure(cleanupError, 'account_sqlcipher_recovery_close_failed');
    }
    // зачем: P3 — чужая (не RecoveryFailure) ошибка не имеет отношения к emit; честный
    // фиксированный код — общий провал, иначе квитанция врёт о причине.
    throw normalizeFailure(error, 'account_sqlcipher_recovery_failed');
  }

  if (disposition === 'hold') {
    try {
      emit(markerFor(mode));
    } catch {
      try {
        await cleanup(connection);
      } catch (cleanupError) {
        throw normalizeFailure(cleanupError, 'account_sqlcipher_recovery_close_failed');
      }
      fail('account_sqlcipher_recovery_emit_failed');
    }
    await new Promise<void>(() => undefined);
    return;
  }
  await cleanup(connection);
  try {
    emit(markerFor(mode));
  } catch {
    fail('account_sqlcipher_recovery_emit_failed');
  }
}
