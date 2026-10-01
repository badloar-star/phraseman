import type {
  AccountScopeTransaction,
  ScopeJson,
  ScopeRecord,
  ScopeStorageConnection,
} from '../account_scope_store';
import {
  planV2StorageArtifacts,
  validateAccountNativeStorageManifest,
  type AccountNativeStorageManifest,
  type PlannedArtifact,
  type V2StorageIdentity,
  type V2StoragePlan,
} from '../native_storage_manifest';
import type {
  AccountSqliteLeaseBinding,
  AccountSqliteLeaseCommitOutcome,
} from './account_sqlite_lease_binding';

export type AccountSqliteScopeConnectionErrorCode =
  | 'account_sqlite_scope_invalid_input'
  | 'account_sqlite_scope_schema_quarantined'
  | 'account_sqlite_scope_read_failed'
  | 'account_sqlite_scope_transaction_failed'
  | 'account_sqlite_scope_transaction_stopped'
  | 'account_sqlite_scope_connection_poisoned'
  | 'account_sqlite_scope_connection_stopped'
  | 'account_sqlite_scope_revoke_failed'
  | 'account_sqlite_scope_close_failed';

const ERROR_CODES: readonly AccountSqliteScopeConnectionErrorCode[] = Object.freeze([
  'account_sqlite_scope_invalid_input',
  'account_sqlite_scope_schema_quarantined',
  'account_sqlite_scope_read_failed',
  'account_sqlite_scope_transaction_failed',
  'account_sqlite_scope_transaction_stopped',
  'account_sqlite_scope_connection_poisoned',
  'account_sqlite_scope_connection_stopped',
  'account_sqlite_scope_revoke_failed',
  'account_sqlite_scope_close_failed',
]);

export class AccountSqliteScopeConnectionError extends Error {
  // зачем: без `declare` — Babel (Metro) без allowDeclareFields падает на нём; значение
  // ставит defineProperties в конструкторе (неизменяемое), поле лишь объявляет тип.
  readonly code!: AccountSqliteScopeConnectionErrorCode;

  constructor(rawCode: unknown) {
    const code = typeof rawCode === 'string'
      && ERROR_CODES.includes(rawCode as AccountSqliteScopeConnectionErrorCode)
      ? rawCode as AccountSqliteScopeConnectionErrorCode
      : 'account_sqlite_scope_invalid_input';
    super(code);
    delete this.stack;
    delete (this as Error & { cause?: unknown }).cause;
    Object.defineProperties(this, {
      name: {
        value: 'AccountSqliteScopeConnectionError', enumerable: true,
        writable: false, configurable: false,
      },
      message: { value: code, enumerable: true, writable: false, configurable: false },
      code: { value: code, enumerable: true, writable: false, configurable: false },
    });
    Object.freeze(this);
  }
}

export type AccountSqliteColumn = null | number | string;
export type AccountSqliteRow = Readonly<Record<string, AccountSqliteColumn>>;

export interface AccountSqliteParameterizedConnection {
  run(
    sql: string,
    parameters: readonly AccountSqliteColumn[],
  ): Promise<Readonly<{ changes: number }>>;
  getFirst(
    sql: string,
    parameters: readonly AccountSqliteColumn[],
  ): Promise<AccountSqliteRow | null>;
  getAll(
    sql: string,
    parameters: readonly AccountSqliteColumn[],
  ): Promise<readonly AccountSqliteRow[]>;
}

export type AccountSqliteScopeConnectionBundle = Readonly<{
  sql: AccountSqliteParameterizedConnection;
  leaseBinding: AccountSqliteLeaseBinding;
}>;

export const ACCOUNT_SQLITE_SCOPE_SCHEMA = Object.freeze({
  version: 1 as const,
  metadataTable: 'account_scope_metadata_v1' as const,
  recordsTable: 'account_scope_records_v1' as const,
});

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

type DataRecord = Readonly<Record<string, unknown>>;
type CapturedSql = Readonly<{
  run(sql: string, parameters: readonly AccountSqliteColumn[]): Promise<Readonly<{ changes: number }>>;
  getFirst(sql: string, parameters: readonly AccountSqliteColumn[]): Promise<AccountSqliteRow | null>;
  getAll(sql: string, parameters: readonly AccountSqliteColumn[]): Promise<readonly AccountSqliteRow[]>;
}>;
type CapturedLease = Readonly<{
  revoke(): undefined;
  commitIfActive(): Promise<AccountSqliteLeaseCommitOutcome>;
  close(): Promise<void>;
}>;
type CapturedBundle = Readonly<{ sql: CapturedSql; lease: CapturedLease }>;
type ConnectionStatus = 'active' | 'revoked' | 'poisoned' | 'closed';

type DeferredSignal = Readonly<{ promise: Promise<void>; resolve(): void }>;

function deferredSignal(): DeferredSignal {
  let resolvePromise!: () => void;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  let settled = false;
  return Object.freeze({
    promise,
    resolve(): void {
      if (settled) return;
      settled = true;
      resolvePromise();
    },
  });
}

function fail(code: AccountSqliteScopeConnectionErrorCode): never {
  throw new AccountSqliteScopeConnectionError(code);
}

function ownDataRecord(value: unknown): DataRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail('account_sqlite_scope_invalid_input');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return fail('account_sqlite_scope_invalid_input');
  }
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== 'string')) {
    return fail('account_sqlite_scope_invalid_input');
  }
  const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of keys as string[]) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !('value' in descriptor) || !descriptor.enumerable) {
      return fail('account_sqlite_scope_invalid_input');
    }
    result[key] = descriptor.value;
  }
  return result;
}

function exactKeys(record: DataRecord, expected: readonly string[]): boolean {
  const keys = Object.keys(record);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function denseArray(value: unknown): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    return fail('account_sqlite_scope_invalid_input');
  }
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
  if (lengthDescriptor === undefined || !('value' in lengthDescriptor)
    || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0) {
    return fail('account_sqlite_scope_invalid_input');
  }
  const length = lengthDescriptor.value as number;
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== length + 1) return fail('account_sqlite_scope_invalid_input');
  const result: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor === undefined || !('value' in descriptor) || !descriptor.enumerable) {
      return fail('account_sqlite_scope_invalid_input');
    }
    result.push(descriptor.value);
  }
  if (ownKeys.some((key) => key !== 'length'
    && (typeof key !== 'string' || !/^(0|[1-9][0-9]*)$/.test(key)
      || Number(key) >= length))) {
    return fail('account_sqlite_scope_invalid_input');
  }
  return result;
}

function ownValue(value: object, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, name);
  if (descriptor === undefined || !('value' in descriptor)) {
    return fail('account_sqlite_scope_invalid_input');
  }
  return descriptor.value;
}

function captureMethod(target: unknown, name: string): (...args: readonly unknown[]) => unknown {
  if ((typeof target !== 'object' && typeof target !== 'function') || target === null) {
    return fail('account_sqlite_scope_invalid_input');
  }
  let cursor: object | null = target as object;
  while (cursor !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(cursor, name);
    if (descriptor !== undefined) {
      if (!('value' in descriptor) || typeof descriptor.value !== 'function') {
        return fail('account_sqlite_scope_invalid_input');
      }
      const method = descriptor.value as (...args: readonly unknown[]) => unknown;
      return (...args: readonly unknown[]): unknown => Reflect.apply(method, target, args);
    }
    cursor = Object.getPrototypeOf(cursor) as object | null;
  }
  return fail('account_sqlite_scope_invalid_input');
}

function captureBundle(value: AccountSqliteScopeConnectionBundle): CapturedBundle {
  try {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return fail('account_sqlite_scope_invalid_input');
    }
    const sqlTarget = ownValue(value, 'sql');
    const leaseTarget = ownValue(value, 'leaseBinding');
    const run = captureMethod(sqlTarget, 'run');
    const getFirst = captureMethod(sqlTarget, 'getFirst');
    const getAll = captureMethod(sqlTarget, 'getAll');
    const revoke = captureMethod(leaseTarget, 'revoke');
    const commitIfActive = captureMethod(leaseTarget, 'commitIfActive');
    const close = captureMethod(leaseTarget, 'close');
    return Object.freeze({
      sql: Object.freeze({
        run: (sql: string, parameters: readonly AccountSqliteColumn[]) => Promise.resolve(
          run(sql, parameters),
        ) as Promise<Readonly<{ changes: number }>>,
        getFirst: (sql: string, parameters: readonly AccountSqliteColumn[]) => Promise.resolve(
          getFirst(sql, parameters),
        ) as Promise<AccountSqliteRow | null>,
        getAll: (sql: string, parameters: readonly AccountSqliteColumn[]) => Promise.resolve(
          getAll(sql, parameters),
        ) as Promise<readonly AccountSqliteRow[]>,
      }),
      lease: Object.freeze({
        revoke: (): undefined => {
          const result = revoke();
          if (result !== undefined) return fail('account_sqlite_scope_revoke_failed');
          return undefined;
        },
        commitIfActive: () => Promise.resolve(commitIfActive()) as Promise<AccountSqliteLeaseCommitOutcome>,
        close: () => Promise.resolve(close()) as Promise<void>,
      }),
    });
  } catch {
    return fail('account_sqlite_scope_invalid_input');
  }
}

function captureIdentity(value: unknown): V2StorageIdentity {
  const fields = ownDataRecord(value);
  if (fields.kind === 'account'
    && exactKeys(fields, ['kind', 'scopeKey', 'hash', 'persistentLineage'])) {
    return Object.freeze({
      kind: 'account',
      scopeKey: fields.scopeKey as `account:${string}`,
      hash: fields.hash as string,
      persistentLineage: fields.persistentLineage as number,
    });
  }
  if (fields.kind === 'guest' && exactKeys(fields, ['kind', 'scopeKey', 'hash'])) {
    return Object.freeze({
      kind: 'guest',
      scopeKey: fields.scopeKey as `guest:${string}`,
      hash: fields.hash as string,
    });
  }
  return fail('account_sqlite_scope_invalid_input');
}

function artifactMatches(value: unknown, expected: PlannedArtifact): boolean {
  const fields = ownDataRecord(value);
  return exactKeys(fields, [
    'id', 'medium', 'selector', 'eraseOrder', 'requiredAbsentForV2Erase',
  ])
    && fields.id === expected.id
    && fields.medium === expected.medium
    && fields.selector === expected.selector
    && fields.eraseOrder === expected.eraseOrder
    && fields.requiredAbsentForV2Erase === expected.requiredAbsentForV2Erase;
}

function validateCanonicalPlan(
  rawManifest: AccountNativeStorageManifest,
  rawPlan: V2StoragePlan,
): V2StoragePlan {
  try {
    const manifest = validateAccountNativeStorageManifest(rawManifest);
    const fields = ownDataRecord(rawPlan);
    if (!exactKeys(fields, ['manifestVersion', 'scopeKey', 'identity', 'artifacts'])) {
      return fail('account_sqlite_scope_invalid_input');
    }
    const identity = captureIdentity(fields.identity);
    const canonical = planV2StorageArtifacts(manifest, identity);
    const artifacts = denseArray(fields.artifacts);
    if (fields.manifestVersion !== canonical.manifestVersion
      || fields.scopeKey !== canonical.scopeKey
      || artifacts.length !== canonical.artifacts.length
      || artifacts.some((artifact, index) => !artifactMatches(
        artifact,
        canonical.artifacts[index] as PlannedArtifact,
      ))) {
      return fail('account_sqlite_scope_invalid_input');
    }
    return canonical;
  } catch {
    return fail('account_sqlite_scope_invalid_input');
  }
}

function mainSelector(plan: V2StoragePlan): string {
  const id = `v2.${plan.identity.kind}.db.main`;
  const artifact = plan.artifacts.find((candidate) => candidate.id === id);
  if (artifact === undefined || artifact.medium !== 'sqlite_file') {
    return fail('account_sqlite_scope_invalid_input');
  }
  return artifact.selector;
}

function keySnapshot(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    return fail('account_sqlite_scope_invalid_input');
  }
  return value;
}

function jsonSnapshot(value: unknown, ancestors = new Set<object>()): ScopeJson {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return fail('account_sqlite_scope_invalid_input');
    return value;
  }
  if (typeof value !== 'object' || ancestors.has(value)) {
    return fail('account_sqlite_scope_invalid_input');
  }
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const items = denseArray(value);
      return items.map((item) => jsonSnapshot(item, ancestors));
    }
    const fields = ownDataRecord(value);
    const result: { [key: string]: ScopeJson } = {};
    for (const key of Object.keys(fields)) {
      Object.defineProperty(result, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: jsonSnapshot(fields[key], ancestors),
      });
    }
    return result;
  } finally {
    ancestors.delete(value);
  }
}

function deepFreezeJson(value: ScopeJson): ScopeJson {
  if (typeof value === 'object' && value !== null) {
    for (const child of Object.values(value)) deepFreezeJson(child);
    Object.freeze(value);
  }
  return value;
}

function recordSnapshot(value: unknown): ScopeRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail('account_sqlite_scope_invalid_input');
  }
  const keyDescriptor = Object.getOwnPropertyDescriptor(value, 'key');
  const valueDescriptor = Object.getOwnPropertyDescriptor(value, 'value');
  if (keyDescriptor === undefined || !('value' in keyDescriptor)
    || valueDescriptor === undefined || !('value' in valueDescriptor)) {
    return fail('account_sqlite_scope_invalid_input');
  }
  return Object.freeze({
    key: keySnapshot(keyDescriptor.value),
    value: deepFreezeJson(jsonSnapshot(valueDescriptor.value)),
  });
}

function inputError(error: unknown): AccountSqliteScopeConnectionError {
  return error instanceof AccountSqliteScopeConnectionError
    ? error
    : new AccountSqliteScopeConnectionError('account_sqlite_scope_invalid_input');
}

function stringifyJsonPrimitive(value: string | number): string {
  const encoded = JSON.stringify(value);
  if (typeof encoded !== 'string') return fail('account_sqlite_scope_invalid_input');
  return encoded;
}

function encodeJson(value: ScopeJson): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return stringifyJsonPrimitive(value);
  if (typeof value === 'number') {
    return Object.is(value, -0) ? '-0' : stringifyJsonPrimitive(value);
  }
  if (Array.isArray(value)) return `[${value.map(encodeJson).join(',')}]`;
  // зачем: Array.isArray не сужает readonly-массивы, поэтому value здесь всё ещё «массив | объект»;
  // явно берём объектную ветку, чтобы индексировать по строковому ключу.
  const record = value as Readonly<{ [key: string]: ScopeJson }>;
  const entries = Object.keys(record).sort().map((key) => (
    `${stringifyJsonPrimitive(key)}:${encodeJson(record[key] as ScopeJson)}`
  ));
  return `{${entries.join(',')}}`;
}

function decodeJson(encoded: string): ScopeJson {
  try {
    const snapshot = jsonSnapshot(JSON.parse(encoded) as unknown);
    if (encodeJson(snapshot) !== encoded) {
      return fail('account_sqlite_scope_read_failed');
    }
    return deepFreezeJson(snapshot);
  } catch {
    return fail('account_sqlite_scope_read_failed');
  }
}

function captureSqlRow(value: unknown, keys: readonly string[]): DataRecord {
  try {
    const row = ownDataRecord(value);
    if (!exactKeys(row, keys)) return fail('account_sqlite_scope_schema_quarantined');
    for (const item of Object.values(row)) {
      if (item !== null && typeof item !== 'number' && typeof item !== 'string') {
        return fail('account_sqlite_scope_schema_quarantined');
      }
    }
    return row;
  } catch {
    return fail('account_sqlite_scope_schema_quarantined');
  }
}

function captureRows(value: unknown): readonly unknown[] {
  try {
    return denseArray(value);
  } catch {
    return fail('account_sqlite_scope_schema_quarantined');
  }
}

function expectedMetadata(plan: V2StoragePlan): readonly AccountSqliteColumn[] {
  return Object.freeze([
    1,
    1,
    plan.manifestVersion,
    'account_native_storage_v2',
    plan.scopeKey,
    plan.identity.kind,
    plan.identity.hash,
    plan.identity.kind === 'account' ? plan.identity.persistentLineage : null,
    mainSelector(plan),
  ]);
}

function assertSchemaRows(rawRows: unknown): void {
  const rows = captureRows(rawRows);
  if (rows.length !== 2) return fail('account_sqlite_scope_schema_quarantined');
  const keys = ['type', 'name', 'tbl_name', 'sql'];
  const metadata = captureSqlRow(rows[0], keys);
  const records = captureSqlRow(rows[1], keys);
  if (metadata.type !== 'table'
    || metadata.name !== ACCOUNT_SQLITE_SCOPE_SCHEMA.metadataTable
    || metadata.tbl_name !== ACCOUNT_SQLITE_SCOPE_SCHEMA.metadataTable
    || metadata.sql !== SQL.createMetadata
    || records.type !== 'table'
    || records.name !== ACCOUNT_SQLITE_SCOPE_SCHEMA.recordsTable
    || records.tbl_name !== ACCOUNT_SQLITE_SCOPE_SCHEMA.recordsTable
    || records.sql !== SQL.createRecords) {
    return fail('account_sqlite_scope_schema_quarantined');
  }
}

function assertMetadataRows(rawRows: unknown, plan: V2StoragePlan): void {
  const rows = captureRows(rawRows);
  if (rows.length !== 1) return fail('account_sqlite_scope_schema_quarantined');
  const keys = [
    'singleton', 'schema_version', 'manifest_version', 'namespace', 'scope_key',
    'identity_kind', 'identity_hash', 'persistent_lineage', 'database_selector',
  ];
  const row = captureSqlRow(rows[0], keys);
  const expected = expectedMetadata(plan);
  if (keys.some((key, index) => row[key] !== expected[index])) {
    return fail('account_sqlite_scope_schema_quarantined');
  }
}

function validateRunResult(value: unknown): void {
  try {
    const fields = ownDataRecord(value);
    if (!exactKeys(fields, ['changes'])
      || !Number.isSafeInteger(fields.changes) || (fields.changes as number) < 0) {
      return fail('account_sqlite_scope_transaction_failed');
    }
  } catch {
    return fail('account_sqlite_scope_transaction_failed');
  }
}

async function runSql(
  sql: CapturedSql,
  statement: string,
  parameters: readonly AccountSqliteColumn[],
): Promise<void> {
  validateRunResult(await sql.run(statement, Object.freeze([...parameters])));
}

function attemptRevoke(lease: CapturedLease): boolean {
  try {
    lease.revoke();
    return true;
  } catch {
    return false;
  }
}

async function rollbackInitializationOrPoison(bundle: CapturedBundle): Promise<never> {
  try {
    await runSql(bundle.sql, SQL.rollback, []);
  } catch {
    attemptRevoke(bundle.lease);
    return fail('account_sqlite_scope_connection_poisoned');
  }
  return fail('account_sqlite_scope_schema_quarantined');
}

async function commitInitializationOrPoison(bundle: CapturedBundle): Promise<void> {
  let outcome: unknown;
  try {
    outcome = await bundle.lease.commitIfActive();
  } catch {
    attemptRevoke(bundle.lease);
    return fail('account_sqlite_scope_connection_poisoned');
  }
  if (outcome !== 'committed') {
    attemptRevoke(bundle.lease);
    return fail('account_sqlite_scope_connection_poisoned');
  }
}

function createConnection(bundle: CapturedBundle): ScopeStorageConnection {
  let sql: CapturedSql | null = bundle.sql;
  let lease: CapturedLease | null = bundle.lease;
  let status: ConnectionStatus = 'active';
  let nativeRevoked = false;
  let serial: Promise<void> = Promise.resolve();
  let closeFlight: Promise<void> | null = null;
  const stopped = deferredSignal();
  let activeSeal: (() => void) | null = null;
  const readStatus = (): ConnectionStatus => status;

  const statusError = (): AccountSqliteScopeConnectionError => new AccountSqliteScopeConnectionError(
    status === 'poisoned'
      ? 'account_sqlite_scope_connection_poisoned'
      : 'account_sqlite_scope_connection_stopped',
  );

  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const operation = serial.then(task);
    serial = operation.then(() => undefined, () => undefined);
    return operation;
  };

  const stopLocal = (nextStatus: 'revoked' | 'poisoned'): void => {
    if (status === 'closed') return;
    if (status !== 'poisoned' || nextStatus === 'poisoned') status = nextStatus;
    activeSeal?.();
    stopped.resolve();
  };

  const poison = (): void => {
    stopLocal('poisoned');
    const activeLease = lease;
    if (activeLease !== null && attemptRevoke(activeLease)) nativeRevoked = true;
  };

  const rollbackActive = async (): Promise<void> => {
    const activeSql = sql;
    if (activeSql === null || status !== 'active') throw statusError();
    try {
      await runSql(activeSql, SQL.rollback, []);
    } catch {
      poison();
      throw new AccountSqliteScopeConnectionError('account_sqlite_scope_connection_poisoned');
    }
  };

  const readStoredRecord = async (
    activeSql: CapturedSql,
    key: string,
    failureCode: 'account_sqlite_scope_read_failed' | 'account_sqlite_scope_transaction_failed',
  ): Promise<ScopeRecord | null> => {
    let rawRow: unknown;
    try {
      rawRow = await activeSql.getFirst(SQL.readRecord, Object.freeze([key]));
    } catch {
      throw new AccountSqliteScopeConnectionError(failureCode);
    }
    if (rawRow === null) return null;
    try {
      const row = ownDataRecord(rawRow);
      if (!exactKeys(row, ['record_key', 'value_json'])
        || row.record_key !== key || typeof row.value_json !== 'string') {
        throw new AccountSqliteScopeConnectionError(failureCode);
      }
      return Object.freeze({ key, value: decodeJson(row.value_json) });
    } catch {
      throw new AccountSqliteScopeConnectionError(failureCode);
    }
  };

  const readRecord = (rawKey: string): Promise<ScopeRecord | null> => {
    let key: string;
    try {
      key = keySnapshot(rawKey);
    } catch (error) {
      return Promise.reject(error);
    }
    return enqueue(async () => {
      if (status !== 'active' || sql === null) throw statusError();
      const record = await readStoredRecord(sql, key, 'account_sqlite_scope_read_failed');
      if (readStatus() !== 'active') throw statusError();
      return record;
    });
  };

  const withGuardedTransaction = (
    work: (transaction: AccountScopeTransaction) => Promise<void>,
    mayPublishNow: () => boolean,
  ): Promise<void> => {
    if (typeof work !== 'function' || typeof mayPublishNow !== 'function') {
      return Promise.reject(new AccountSqliteScopeConnectionError(
        'account_sqlite_scope_invalid_input',
      ));
    }
    return enqueue(async () => {
      if (status !== 'active' || sql === null || lease === null) throw statusError();
      const transactionSql = sql;
      const transactionLease = lease;
      try {
        await runSql(transactionSql, SQL.begin, []);
      } catch {
        poison();
        throw new AccountSqliteScopeConnectionError(
          'account_sqlite_scope_connection_poisoned',
        );
      }
      if (readStatus() !== 'active') {
        throw new AccountSqliteScopeConnectionError(
          'account_sqlite_scope_transaction_stopped',
        );
      }

      let sealed = false;
      let operationTail: Promise<void> = Promise.resolve();
      let operationFailure: AccountSqliteScopeConnectionError | null = null;
      const seal = (): void => { sealed = true; };
      activeSeal = seal;

      const registerFailure = (error: AccountSqliteScopeConnectionError): Promise<never> => {
        if (operationFailure === null) operationFailure = error;
        const rejected = operationTail.then<never>(() => { throw error; });
        operationTail = rejected.then(() => undefined, () => undefined);
        return rejected;
      };

      const register = <T>(operation: () => Promise<T>): Promise<T> => {
        if (sealed || status !== 'active') {
          return registerFailure(new AccountSqliteScopeConnectionError(
            'account_sqlite_scope_transaction_stopped',
          ));
        }
        const running = operationTail.then(async () => {
          if (status !== 'active') {
            throw new AccountSqliteScopeConnectionError('account_sqlite_scope_transaction_stopped');
          }
          try {
            const result = await operation();
            if (readStatus() !== 'active') {
              throw new AccountSqliteScopeConnectionError(
                'account_sqlite_scope_transaction_stopped',
              );
            }
            return result;
          } catch (error) {
            if (error instanceof AccountSqliteScopeConnectionError) throw error;
            throw new AccountSqliteScopeConnectionError(
              'account_sqlite_scope_transaction_failed',
            );
          }
        });
        const observed = running.catch((error: unknown) => {
          const sanitized = error instanceof AccountSqliteScopeConnectionError
            ? error
            : new AccountSqliteScopeConnectionError('account_sqlite_scope_transaction_failed');
          if (operationFailure === null) operationFailure = sanitized;
          throw sanitized;
        });
        operationTail = observed.then(() => undefined, () => undefined);
        return observed;
      };

      const transaction: AccountScopeTransaction = Object.freeze({
        readRecord(rawKey: string): Promise<ScopeRecord | null> {
          let key: string;
          try {
            key = keySnapshot(rawKey);
          } catch (error) {
            return registerFailure(inputError(error));
          }
          return register(() => readStoredRecord(
            transactionSql,
            key,
            'account_sqlite_scope_transaction_failed',
          ));
        },
        putRecord(rawRecord: ScopeRecord): Promise<void> {
          let record: ScopeRecord;
          try {
            record = recordSnapshot(rawRecord);
          } catch (error) {
            return registerFailure(inputError(error));
          }
          const encoded = encodeJson(record.value);
          return register(async () => {
            await runSql(transactionSql, SQL.putRecord, [record.key, encoded]);
          });
        },
        deleteRecord(rawKey: string): Promise<void> {
          let key: string;
          try {
            key = keySnapshot(rawKey);
          } catch (error) {
            return registerFailure(inputError(error));
          }
          return register(async () => {
            await runSql(transactionSql, SQL.deleteRecord, [key]);
          });
        },
      });

      type CallbackOutcome = Readonly<{ kind: 'fulfilled' }>
        | Readonly<{ kind: 'rejected'; reason: unknown }>
        | Readonly<{ kind: 'stopped' }>;
      let callbackResult: unknown;
      try {
        callbackResult = work(transaction);
      } catch (error) {
        callbackResult = Promise.reject(error);
      }
      const callback = Promise.resolve(callbackResult).then<CallbackOutcome, CallbackOutcome>(
        () => Object.freeze({ kind: 'fulfilled' as const }),
        (reason: unknown) => Object.freeze({ kind: 'rejected' as const, reason }),
      );
      const stoppedOutcome = stopped.promise.then<CallbackOutcome>(
        () => Object.freeze({ kind: 'stopped' as const }),
      );

      try {
        const outcome = await Promise.race([callback, stoppedOutcome]);
        seal();
        if (outcome.kind === 'stopped' || readStatus() !== 'active') {
          throw new AccountSqliteScopeConnectionError(
            'account_sqlite_scope_transaction_stopped',
          );
        }
        await operationTail;
        if (readStatus() !== 'active') throw statusError();
        if (operationFailure !== null) {
          await rollbackActive();
          throw operationFailure;
        }
        if (outcome.kind === 'rejected') {
          await rollbackActive();
          throw outcome.reason;
        }

        let mayPublish = false;
        try {
          mayPublish = mayPublishNow() === true;
        } catch {
          mayPublish = false;
        }
        if (!mayPublish) {
          await rollbackActive();
          throw new AccountSqliteScopeConnectionError(
            'account_sqlite_scope_transaction_stopped',
          );
        }

        let commitPromise: Promise<AccountSqliteLeaseCommitOutcome>;
        try {
          commitPromise = transactionLease.commitIfActive();
        } catch {
          poison();
          throw new AccountSqliteScopeConnectionError(
            'account_sqlite_scope_connection_poisoned',
          );
        }
        let commitOutcome: unknown;
        try {
          commitOutcome = await commitPromise;
        } catch {
          poison();
          throw new AccountSqliteScopeConnectionError(
            'account_sqlite_scope_connection_poisoned',
          );
        }
        if (commitOutcome !== 'committed') {
          poison();
          throw new AccountSqliteScopeConnectionError(
            'account_sqlite_scope_connection_poisoned',
          );
        }
      } finally {
        seal();
        if (activeSeal === seal) activeSeal = null;
      }
    });
  };

  const revoke = (): undefined => {
    if (status === 'closed' || nativeRevoked) return undefined;
    stopLocal(status === 'poisoned' ? 'poisoned' : 'revoked');
    const activeLease = lease;
    if (activeLease === null) return fail('account_sqlite_scope_revoke_failed');
    try {
      activeLease.revoke();
      nativeRevoked = true;
      return undefined;
    } catch {
      return fail('account_sqlite_scope_revoke_failed');
    }
  };

  const close = (): Promise<void> => {
    if (closeFlight !== null) return closeFlight;
    if (status === 'closed') return Promise.resolve();
    if (!nativeRevoked || lease === null) {
      return Promise.reject(new AccountSqliteScopeConnectionError(
        'account_sqlite_scope_close_failed',
      ));
    }
    let resolveFlight!: () => void;
    let rejectFlight!: (reason: unknown) => void;
    const installed = new Promise<void>((resolve, reject) => {
      resolveFlight = resolve;
      rejectFlight = reject;
    });
    closeFlight = installed;
    const activeLease = lease;
    let nativeClose: Promise<void>;
    try {
      nativeClose = activeLease.close();
    } catch {
      closeFlight = null;
      rejectFlight(new AccountSqliteScopeConnectionError('account_sqlite_scope_close_failed'));
      return installed;
    }
    void nativeClose.then(
      () => {
        status = 'closed';
        sql = null;
        lease = null;
        resolveFlight();
      },
      () => {
        closeFlight = null;
        rejectFlight(new AccountSqliteScopeConnectionError(
          'account_sqlite_scope_close_failed',
        ));
      },
    );
    return installed;
  };

  return Object.freeze({ readRecord, withGuardedTransaction, revoke, close });
}

/**
 * SQL and lease binding must target the same already-keyed, keyed-proof-passed canonical connection.
 * Initialize is allowed only for a proven-absent database family while the durable provision lease is held.
 * Verify existing schema while that durable provision lease is held.
 * Types do not prove these admission facts. Each SQL operation promise must include statement finalization before it resolves.
 * This module does not prove native connection identity. The provisioner must initialize or verify schema before publishing the handle.
 * Factory rejection never consumes or closes the caller-owned candidate, raw bundle, or durable provision lease.
 * The caller remains responsible for revoke retry, close, and durable lease release.
 */
export async function initializeNewAccountSqliteScopeConnection(
  manifest: AccountNativeStorageManifest,
  plan: V2StoragePlan,
  rawBundle: AccountSqliteScopeConnectionBundle,
): Promise<ScopeStorageConnection> {
  const canonical = validateCanonicalPlan(manifest, plan);
  const bundle = captureBundle(rawBundle);
  let schemaRows: unknown;
  try {
    schemaRows = await bundle.sql.getAll(SQL.listSchema, Object.freeze(['sqlite_']));
  } catch {
    return fail('account_sqlite_scope_schema_quarantined');
  }
  if (captureRows(schemaRows).length !== 0) {
    return fail('account_sqlite_scope_schema_quarantined');
  }

  try {
    await runSql(bundle.sql, SQL.begin, []);
    await runSql(bundle.sql, SQL.createMetadata, []);
    await runSql(bundle.sql, SQL.createRecords, []);
    await runSql(bundle.sql, SQL.insertMetadata, expectedMetadata(canonical));
  } catch {
    return rollbackInitializationOrPoison(bundle);
  }
  await commitInitializationOrPoison(bundle);
  return createConnection(bundle);
}

/** Trusted admission requirements are identical to the initialization entry point. */
export async function verifyExistingAccountSqliteScopeConnection(
  manifest: AccountNativeStorageManifest,
  plan: V2StoragePlan,
  rawBundle: AccountSqliteScopeConnectionBundle,
): Promise<ScopeStorageConnection> {
  const canonical = validateCanonicalPlan(manifest, plan);
  const bundle = captureBundle(rawBundle);
  let schemaRows: unknown;
  let metadataRows: unknown;
  try {
    schemaRows = await bundle.sql.getAll(SQL.listSchema, Object.freeze(['sqlite_']));
    assertSchemaRows(schemaRows);
    metadataRows = await bundle.sql.getAll(SQL.readMetadata, Object.freeze([]));
    assertMetadataRows(metadataRows, canonical);
  } catch {
    return fail('account_sqlite_scope_schema_quarantined');
  }
  return createConnection(bundle);
}
