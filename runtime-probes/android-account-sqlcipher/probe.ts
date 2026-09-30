export const DATABASE_NAME =
  'accounts-v2-g-7b32e4de72ea35b9caf5468847f91e542f87c50c5062e82c794f7e9c8c92392c.db';
export const DATABASE_RELATIVE_PATH = `files/SQLite/accounts-v2/${DATABASE_NAME}`;
export const MARKER = 'account_sqlcipher_android_persisted_marker_v1';

const CORRECT_KEY_HEX = '7f3c1fc9cf72a8f4a257cd8bf812ecbb4bd7d95cedc6fc00309dfc1319770488';
const WRONG_KEY_HEX = '5fc900fb287ee7b1a9fa4260dd7f725132e26e2fd96700bccf4f8527d4845016';
const CIPHER_SQL = 'PRAGMA cipher_version';
const BEGIN_SQL = 'BEGIN IMMEDIATE';
const CREATE_SQL = `CREATE TABLE IF NOT EXISTS account_sqlcipher_probe_v1 (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  marker TEXT NOT NULL
) STRICT`;
const UPSERT_SQL = `INSERT INTO account_sqlcipher_probe_v1 (singleton, marker) VALUES (?, ?)
ON CONFLICT(singleton) DO UPDATE SET marker = excluded.marker`;
const MARKER_SQL = 'SELECT marker FROM account_sqlcipher_probe_v1 WHERE singleton = ?';
const SCHEMA_SQL = 'SELECT count(*) AS table_count FROM sqlite_schema';
const INTEGRITY_SQL = 'PRAGMA cipher_integrity_check';
const POST_CLOSE_SQL = 'SELECT 1';

export type ProbeMode = 'prepare' | 'verify' | 'wrong-key';

export const PASS_MARKERS: Readonly<Record<ProbeMode, string>> = Object.freeze({
  prepare: 'account_sqlcipher_android_prepare_pass',
  verify: 'account_sqlcipher_android_verify_pass',
  'wrong-key': 'account_sqlcipher_android_wrong_key_rejected_pass',
});

type OpenOptions = Readonly<{
  useNewConnection: boolean;
  enableChangeListener: boolean;
}>;

export interface AndroidAccountSqlcipherProbePort {
  defaultDatabaseDirectory: unknown;
  openDatabaseAsync(
    name: string,
    options: OpenOptions,
    directory: string,
  ): Promise<unknown>;
}

export type AndroidAccountSqlcipherProbeEmitter = (marker: string) => void;

type FailureCode =
  | 'account_sqlcipher_probe_invalid_mode'
  | 'account_sqlcipher_probe_restart_required'
  | 'account_sqlcipher_probe_open_failed'
  | 'account_sqlcipher_probe_unsupported'
  | 'account_sqlcipher_probe_key_failed'
  | 'account_sqlcipher_probe_cipher_unavailable'
  | 'account_sqlcipher_probe_schema_failed'
  | 'account_sqlcipher_probe_marker_failed'
  | 'account_sqlcipher_probe_commit_failed'
  | 'account_sqlcipher_probe_wrong_key_false_success'
  | 'account_sqlcipher_probe_revoke_failed'
  | 'account_sqlcipher_probe_close_failed'
  | 'account_sqlcipher_probe_close_ineffective'
  | 'account_sqlcipher_probe_failed';

type CapturedMethod = Readonly<{
  receiver: object;
  owner: object;
  name: PropertyKey;
  method: (...args: readonly unknown[]) => unknown;
}>;

type CapturedCleanup = Readonly<{
  native: object;
  revokeAccountLeaseSync?: CapturedMethod;
  closeAccountLeaseAsync?: CapturedMethod;
  closeSync?: CapturedMethod;
  execSync?: CapturedMethod;
  captureFailed: boolean;
}>;

type CapturedConnection = Readonly<{
  wrapper: object;
  native: object;
  nativeDescriptor: PropertyDescriptor;
  execAsync: CapturedMethod;
  getFirstAsync: CapturedMethod;
  runAsync: CapturedMethod;
  cleanup: CapturedCleanup;
  commitAccountLeaseAsync: CapturedMethod;
}>;

const CAPTURED_PROMISE_THEN = Promise.prototype.then;

class ProbeFailure extends Error {
  constructor(code: FailureCode) {
    super(code);
  }
}

function getProbeFailureCode(value: ProbeFailure): FailureCode {
  return value.message as FailureCode;
}

let phaseClaimed = false;

function fail(code: FailureCode): never {
  throw new ProbeFailure(code);
}

function isObject(value: unknown): value is object {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

function isProbeFailure(value: unknown): value is ProbeFailure {
  try {
    return value instanceof ProbeFailure;
  } catch {
    return false;
  }
}

function normalizeFailure(value: unknown, fallback: FailureCode): ProbeFailure {
  return isProbeFailure(value) ? new ProbeFailure(getProbeFailureCode(value)) : new ProbeFailure(fallback);
}

function isMode(value: unknown): value is ProbeMode {
  return value === 'prepare' || value === 'verify' || value === 'wrong-key';
}

function getDataDescriptor(target: object, key: PropertyKey): PropertyDescriptor | undefined {
  let descriptor: PropertyDescriptor | undefined;
  try {
    descriptor = Object.getOwnPropertyDescriptor(target, key);
  } catch {
    fail('account_sqlcipher_probe_unsupported');
  }
  if (descriptor === undefined || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
    return undefined;
  }
  return descriptor;
}

function findMethodDescriptor(receiver: object, name: PropertyKey): Readonly<{
  owner: object;
  descriptor: PropertyDescriptor;
}> {
  let cursor: object | null = receiver;
  for (let depth = 0; depth < 32 && cursor !== null; depth += 1) {
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(cursor, name);
    } catch {
      fail('account_sqlcipher_probe_unsupported');
    }
    if (descriptor !== undefined) {
      if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
        fail('account_sqlcipher_probe_unsupported');
      }
      return Object.freeze({ owner: cursor, descriptor });
    }
    try {
      cursor = Object.getPrototypeOf(cursor) as object | null;
    } catch {
      fail('account_sqlcipher_probe_unsupported');
    }
  }
  fail('account_sqlcipher_probe_unsupported');
}

function captureMethod(receiver: object, name: PropertyKey): CapturedMethod {
  const found = findMethodDescriptor(receiver, name);
  const candidate: unknown = found.descriptor.value;
  if (typeof candidate !== 'function') fail('account_sqlcipher_probe_unsupported');
  return Object.freeze({
    receiver,
    owner: found.owner,
    name,
    method: candidate as (...args: readonly unknown[]) => unknown,
  });
}

function assertMethodStable(captured: CapturedMethod): void {
  const current = findMethodDescriptor(captured.receiver, captured.name);
  if (current.owner !== captured.owner || current.descriptor.value !== captured.method) {
    fail('account_sqlcipher_probe_unsupported');
  }
}

function assertConnectionStable(connection: CapturedConnection): void {
  const descriptor = getDataDescriptor(connection.wrapper, 'nativeDatabase');
  if (
    descriptor === undefined ||
    descriptor.value !== connection.native ||
    descriptor.enumerable !== connection.nativeDescriptor.enumerable ||
    descriptor.configurable !== connection.nativeDescriptor.configurable ||
    descriptor.writable !== connection.nativeDescriptor.writable
  ) {
    fail('account_sqlcipher_probe_unsupported');
  }
  const methods = [
    connection.execAsync,
    connection.getFirstAsync,
    connection.runAsync,
    connection.commitAccountLeaseAsync,
    connection.cleanup.revokeAccountLeaseSync,
    connection.cleanup.closeAccountLeaseAsync,
    connection.cleanup.closeSync,
    connection.cleanup.execSync,
  ].filter((method): method is CapturedMethod => method !== undefined);
  for (const method of methods) assertMethodStable(method);
}

function invokeCaptured(captured: CapturedMethod, args: readonly unknown[]): unknown {
  assertMethodStable(captured);
  return Reflect.apply(captured.method, captured.receiver, args);
}

function invoke(connection: CapturedConnection, captured: CapturedMethod, args: readonly unknown[]): unknown {
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

async function awaitInvocation(
  connection: CapturedConnection,
  captured: CapturedMethod,
  args: readonly unknown[],
  failureCode: FailureCode,
): Promise<unknown> {
  let result: unknown;
  try {
    result = invoke(connection, captured, args);
  } catch (error) {
    if (isProbeFailure(error)) throw error;
    fail(failureCode);
  }
  if (!isGenuinePromise(result)) fail(failureCode);
  try {
    const resolved = await result;
    assertConnectionStable(connection);
    return resolved;
  } catch (error) {
    assertConnectionStable(connection);
    if (isProbeFailure(error)) throw error;
    fail(failureCode);
  }
}

function captureCleanup(native: object): CapturedCleanup {
  const methods: Partial<Record<
    'revokeAccountLeaseSync' | 'closeAccountLeaseAsync' | 'closeSync' | 'execSync',
    CapturedMethod
  >> = {};
  let captureFailed = false;
  for (const name of [
    'revokeAccountLeaseSync',
    'closeAccountLeaseAsync',
    'closeSync',
    'execSync',
  ] as const) {
    try {
      methods[name] = captureMethod(native, name);
    } catch {
      captureFailed = true;
    }
  }
  return Object.freeze({
    native,
    ...methods,
    captureFailed,
  });
}

async function cleanupCapturedNative(cleanup: CapturedCleanup): Promise<void> {
  let revokeFailure: ProbeFailure | undefined;
  if (cleanup.revokeAccountLeaseSync !== undefined) {
    try {
      const result = invokeCaptured(cleanup.revokeAccountLeaseSync, []);
      if (result !== undefined) fail('account_sqlcipher_probe_revoke_failed');
    } catch (error) {
      revokeFailure = normalizeFailure(error, 'account_sqlcipher_probe_revoke_failed');
    }
  }

  let closeFailure: ProbeFailure | undefined;
  if (cleanup.closeAccountLeaseAsync !== undefined) {
    try {
      const result = invokeCaptured(cleanup.closeAccountLeaseAsync, []);
      if (!isGenuinePromise(result)) fail('account_sqlcipher_probe_close_failed');
      const resolved = await result;
      if (resolved !== undefined && resolved !== null) fail('account_sqlcipher_probe_close_failed');
    } catch (error) {
      closeFailure = normalizeFailure(error, 'account_sqlcipher_probe_close_failed');
    }
  }

  let closeSyncRejected = false;
  if (cleanup.closeSync !== undefined) {
    try {
      invokeCaptured(cleanup.closeSync, []);
    } catch (error) {
      if (isProbeFailure(error)) closeFailure ??= new ProbeFailure(getProbeFailureCode(error));
      else closeSyncRejected = isClosedEvidence(error, 'closeSync');
    }
  }

  let postCloseRejected = false;
  if (cleanup.execSync !== undefined) {
    try {
      invokeCaptured(cleanup.execSync, [POST_CLOSE_SQL]);
    } catch (error) {
      if (isProbeFailure(error)) closeFailure ??= new ProbeFailure(getProbeFailureCode(error));
      else postCloseRejected = isClosedEvidence(error, 'execSync');
    }
  }

  if (cleanup.captureFailed) fail('account_sqlcipher_probe_unsupported');
  if (revokeFailure !== undefined) throw revokeFailure;
  if (closeFailure !== undefined) throw closeFailure;
  if (!closeSyncRejected || !postCloseRejected) fail('account_sqlcipher_probe_close_ineffective');
}

async function captureConnection(wrapper: unknown): Promise<CapturedConnection> {
  if (!isObject(wrapper)) fail('account_sqlcipher_probe_unsupported');
  const nativeDescriptor = getDataDescriptor(wrapper, 'nativeDatabase');
  if (nativeDescriptor === undefined || !isObject(nativeDescriptor.value)) {
    fail('account_sqlcipher_probe_unsupported');
  }
  const native = nativeDescriptor.value;
  const cleanup = captureCleanup(native);
  let connection: CapturedConnection;
  try {
    if (cleanup.captureFailed) fail('account_sqlcipher_probe_unsupported');
    connection = Object.freeze({
      wrapper,
      native,
      nativeDescriptor: Object.freeze({ ...nativeDescriptor }),
      cleanup,
      execAsync: captureMethod(wrapper, 'execAsync'),
      getFirstAsync: captureMethod(wrapper, 'getFirstAsync'),
      runAsync: captureMethod(wrapper, 'runAsync'),
      commitAccountLeaseAsync: captureMethod(native, 'commitAccountLeaseAsync'),
    });
    assertConnectionStable(connection);
  } catch (error) {
    try {
      await cleanupCapturedNative(cleanup);
    } catch (cleanupError) {
      throw normalizeFailure(cleanupError, 'account_sqlcipher_probe_close_failed');
    }
    throw normalizeFailure(error, 'account_sqlcipher_probe_unsupported');
  }
  return connection;
}

function validateExactStringRow(
  row: unknown,
  key: 'cipher_version' | 'marker',
  exactValue?: string,
): Readonly<Record<string, string>> | undefined {
  if (!isObject(row)) return undefined;
  try {
    if (Object.getPrototypeOf(row) !== Object.prototype) return undefined;
    const keys = Reflect.ownKeys(row);
    if (keys.length !== 1 || keys[0] !== key) return undefined;
    const descriptor = Object.getOwnPropertyDescriptor(row, key);
    if (
      descriptor === undefined ||
      !Object.prototype.hasOwnProperty.call(descriptor, 'value') ||
      typeof descriptor.value !== 'string' ||
      descriptor.value.trim().length === 0 ||
      (exactValue !== undefined && descriptor.value !== exactValue)
    ) {
      return undefined;
    }
    return Object.freeze({ [key]: descriptor.value });
  } catch {
    return undefined;
  }
}

function readKnownNativeMessage(error: unknown): string | undefined {
  if (!isObject(error)) return undefined;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(error, 'message');
    if (
      descriptor === undefined ||
      !Object.prototype.hasOwnProperty.call(descriptor, 'value') ||
      typeof descriptor.value !== 'string'
    ) {
      return undefined;
    }
    return descriptor.value;
  } catch {
    return undefined;
  }
}

function isClosedEvidence(error: unknown, method: 'closeSync' | 'execSync'): boolean {
  const message = readKnownNativeMessage(error);
  return (
    message === 'account_native_sqlite_closed' ||
    message === 'account_native_sqlite_revoked' ||
    message ===
      `Call to function 'NativeDatabase.${method}' has been rejected.\n` +
        '→ Caused by: Access to closed resource' ||
    message ===
      `Call to function 'NativeDatabase.${method}' has been rejected.\n` +
        '→ Caused by: Invalid arguments: account_native_sqlite_revoked' ||
    message ===
      `Call to function 'NativeDatabase.${method}' has been rejected.\n` +
        '→ Caused by: Invalid arguments: account_native_sqlite_closed'
  );
}

async function executeMode(connection: CapturedConnection, mode: ProbeMode): Promise<void> {
  const key = mode === 'wrong-key' ? WRONG_KEY_HEX : CORRECT_KEY_HEX;
  await awaitInvocation(
    connection,
    connection.execAsync,
    [`PRAGMA key = "x'${key}'"`],
    'account_sqlcipher_probe_key_failed',
  );

  const cipherRow = await awaitInvocation(
    connection,
    connection.getFirstAsync,
    [CIPHER_SQL],
    'account_sqlcipher_probe_cipher_unavailable',
  );
  if (validateExactStringRow(cipherRow, 'cipher_version') === undefined) {
    fail('account_sqlcipher_probe_cipher_unavailable');
  }

  if (mode === 'prepare') {
    await awaitInvocation(
      connection,
      connection.execAsync,
      [BEGIN_SQL],
      'account_sqlcipher_probe_schema_failed',
    );
    await awaitInvocation(
      connection,
      connection.execAsync,
      [CREATE_SQL],
      'account_sqlcipher_probe_schema_failed',
    );
    await awaitInvocation(
      connection,
      connection.runAsync,
      [UPSERT_SQL, [1, MARKER]],
      'account_sqlcipher_probe_schema_failed',
    );
    const commit = await awaitInvocation(
      connection,
      connection.commitAccountLeaseAsync,
      [],
      'account_sqlcipher_probe_commit_failed',
    );
    if (commit !== 'committed') fail('account_sqlcipher_probe_commit_failed');
    return;
  }

  if (mode === 'verify') {
    const markerRow = await awaitInvocation(
      connection,
      connection.getFirstAsync,
      [MARKER_SQL, 1],
      'account_sqlcipher_probe_marker_failed',
    );
    if (validateExactStringRow(markerRow, 'marker', MARKER) === undefined) {
      fail('account_sqlcipher_probe_marker_failed');
    }
    return;
  }

  let schemaRejected = false;
  let schemaResult: unknown;
  try {
    schemaResult = invoke(connection, connection.getFirstAsync, [SCHEMA_SQL]);
  } catch (error) {
    if (isProbeFailure(error)) throw error;
    fail('account_sqlcipher_probe_schema_failed');
  }
  if (!isGenuinePromise(schemaResult)) fail('account_sqlcipher_probe_schema_failed');
  try {
    await schemaResult;
  } catch {
    schemaRejected = true;
  }
  assertConnectionStable(connection);
  if (!schemaRejected) fail('account_sqlcipher_probe_wrong_key_false_success');

  let diagnostic: unknown;
  try {
    diagnostic = invoke(connection, connection.getFirstAsync, [INTEGRITY_SQL]);
  } catch {
    // This diagnostic is explicitly non-authoritative.
    return;
  }
  if (isGenuinePromise(diagnostic)) {
    try {
      await diagnostic;
    } catch {
      // This diagnostic is explicitly non-authoritative.
    }
    assertConnectionStable(connection);
  }
}

function normalizeDirectory(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail('account_sqlcipher_probe_unsupported');
  }
  const base = value.replace(/[\\/]+$/u, '');
  if (base.length === 0) fail('account_sqlcipher_probe_unsupported');
  return `${base}/accounts-v2`;
}

async function openConnection(port: AndroidAccountSqlcipherProbePort): Promise<CapturedConnection> {
  if (!isObject(port)) fail('account_sqlcipher_probe_unsupported');
  const open = captureMethod(port, 'openDatabaseAsync');
  const directory = normalizeDirectory(port.defaultDatabaseDirectory);
  let openedPromise: unknown;
  try {
    assertMethodStable(open);
    openedPromise = Reflect.apply(open.method, open.receiver, [
      DATABASE_NAME,
      Object.freeze({ useNewConnection: true, enableChangeListener: false }),
      directory,
    ]);
  } catch (error) {
    if (isProbeFailure(error)) throw error;
    fail('account_sqlcipher_probe_open_failed');
  }
  if (!isGenuinePromise(openedPromise)) fail('account_sqlcipher_probe_open_failed');
  let wrapper: unknown;
  try {
    wrapper = await openedPromise;
  } catch {
    fail('account_sqlcipher_probe_open_failed');
  }
  return captureConnection(wrapper);
}

export async function runAndroidAccountSqlcipherProbe(
  port: AndroidAccountSqlcipherProbePort,
  mode: ProbeMode,
  emit: AndroidAccountSqlcipherProbeEmitter,
): Promise<void> {
  if (!isMode(mode)) fail('account_sqlcipher_probe_invalid_mode');
  if (phaseClaimed) fail('account_sqlcipher_probe_restart_required');
  phaseClaimed = true;

  let connection: CapturedConnection;
  try {
    connection = await openConnection(port);
  } catch (error) {
    throw normalizeFailure(error, 'account_sqlcipher_probe_open_failed');
  }

  let phaseFailure: ProbeFailure | undefined;
  try {
    await executeMode(connection, mode);
  } catch (error) {
    phaseFailure = normalizeFailure(error, 'account_sqlcipher_probe_failed');
  }

  try {
    assertConnectionStable(connection);
  } catch (error) {
    phaseFailure = normalizeFailure(error, 'account_sqlcipher_probe_unsupported');
  }

  try {
    await cleanupCapturedNative(connection.cleanup);
  } catch (error) {
    throw normalizeFailure(error, 'account_sqlcipher_probe_close_failed');
  }

  if (phaseFailure !== undefined) throw phaseFailure;
  try {
    assertConnectionStable(connection);
  } catch (error) {
    throw normalizeFailure(error, 'account_sqlcipher_probe_unsupported');
  }
  try {
    emit(PASS_MARKERS[mode]);
  } catch {
    fail('account_sqlcipher_probe_failed');
  }
}
