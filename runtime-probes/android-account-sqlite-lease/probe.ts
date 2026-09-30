const PASS_MARKER = 'account_sqlite_lease_android_runtime_probe_pass';
const BEGIN_SQL = 'BEGIN IMMEDIATE';
const PROBE_SQL = 'SELECT 1';

type NativeCommitResult = 'committed' | 'revoked';

type AccountSqliteLeaseDatabase = Readonly<{
  execSync(sql: string): void;
  revokeAccountLeaseSync(): void;
  commitAccountLeaseAsync(): Promise<NativeCommitResult>;
  closeAccountLeaseAsync(): Promise<void>;
  closeSync(): void;
}>;

export type AndroidAccountSqliteLeaseProbePort = Readonly<{
  openDatabaseAsync(): Promise<unknown>;
}>;

export type AndroidAccountSqliteLeaseProbeEmitter = (marker: string) => void;

type DatabaseMethodName = keyof AccountSqliteLeaseDatabase;

function fail(code: string): never {
  throw new Error(code);
}

function captureMethod(
  database: object,
  methodName: DatabaseMethodName,
): (...args: readonly unknown[]) => unknown {
  let candidate: unknown;
  try {
    candidate = Reflect.get(database, methodName);
  } catch {
    fail('account_native_sqlite_unsupported');
  }
  if (typeof candidate !== 'function') {
    fail('account_native_sqlite_unsupported');
  }
  return (...args: readonly unknown[]): unknown => Reflect.apply(candidate, database, args);
}

function readErrorMessage(error: unknown): string | undefined {
  try {
    if (!(error instanceof Error)) return undefined;
    const message: unknown = error.message;
    return typeof message === 'string' ? message : undefined;
  } catch {
    return undefined;
  }
}

function hasNativeErrorCode(
  error: unknown,
  methodName: 'execSync',
  expectedMessage: string,
): boolean {
  const message = readErrorMessage(error);
  if (message === expectedMessage) return true;
  return message ===
    `Call to function 'NativeDatabase.${methodName}' has been rejected.\n` +
      `→ Caused by: Invalid arguments: ${expectedMessage}`;
}

function hasClosedResourceEvidence(
  error: unknown,
  methodName: 'execSync' | 'closeSync',
): boolean {
  const message = readErrorMessage(error);
  if (message === 'account_native_sqlite_closed') return true;
  return message ===
    `Call to function 'NativeDatabase.${methodName}' has been rejected.\n` +
      '→ Caused by: Access to closed resource';
}

export async function runAndroidAccountSqliteLeaseProbe(
  port: AndroidAccountSqliteLeaseProbePort,
  emit: AndroidAccountSqliteLeaseProbeEmitter,
): Promise<void> {
  let openDatabaseAsync: unknown;
  try {
    openDatabaseAsync = Reflect.get(port, 'openDatabaseAsync');
  } catch {
    fail('account_native_sqlite_unsupported');
  }
  if (typeof openDatabaseAsync !== 'function') {
    fail('account_native_sqlite_unsupported');
  }

  let opened: unknown;
  try {
    opened = await Reflect.apply(openDatabaseAsync, port, []);
  } catch {
    fail('account_native_sqlite_open_failed');
  }
  if ((typeof opened !== 'object' || opened === null) && typeof opened !== 'function') {
    fail('account_native_sqlite_unsupported');
  }

  const database = opened as object;
  const execSync = captureMethod(database, 'execSync');
  const revokeAccountLeaseSync = captureMethod(database, 'revokeAccountLeaseSync');
  const commitAccountLeaseAsync = captureMethod(database, 'commitAccountLeaseAsync');
  const closeAccountLeaseAsync = captureMethod(database, 'closeAccountLeaseAsync');
  const closeSync = captureMethod(database, 'closeSync');

  try {
    execSync(BEGIN_SQL);
  } catch {
    fail('account_native_sqlite_begin_failed');
  }

  let firstCommit: unknown;
  try {
    firstCommit = await commitAccountLeaseAsync();
  } catch {
    fail('account_native_sqlite_commit_failed');
  }
  if (firstCommit !== 'committed') {
    fail('account_native_sqlite_commit_failed');
  }

  try {
    execSync(BEGIN_SQL);
  } catch {
    fail('account_native_sqlite_begin_failed');
  }

  try {
    const revokeResult = revokeAccountLeaseSync();
    if (revokeResult !== undefined) {
      fail('account_native_sqlite_revoke_failed');
    }
  } catch {
    fail('account_native_sqlite_revoke_failed');
  }

  let observedRevoked = false;
  try {
    execSync(PROBE_SQL);
  } catch (error) {
    observedRevoked = hasNativeErrorCode(
      error,
      'execSync',
      'account_native_sqlite_revoked',
    );
  }
  if (!observedRevoked) {
    fail('account_native_sqlite_revoke_ineffective');
  }

  let secondCommit: unknown;
  try {
    secondCommit = await commitAccountLeaseAsync();
  } catch {
    fail('account_native_sqlite_commit_failed');
  }
  if (secondCommit !== 'revoked') {
    fail('account_native_sqlite_commit_failed');
  }

  try {
    await closeAccountLeaseAsync();
  } catch {
    fail('account_native_sqlite_close_failed');
  }

  let observedClosed = false;
  try {
    closeSync();
  } catch (error) {
    observedClosed = hasClosedResourceEvidence(error, 'closeSync');
  }
  if (!observedClosed) {
    fail('account_native_sqlite_close_ineffective');
  }

  let observedTerminalState = false;
  try {
    execSync(PROBE_SQL);
  } catch (error) {
    observedTerminalState =
      hasNativeErrorCode(error, 'execSync', 'account_native_sqlite_revoked') ||
      hasNativeErrorCode(error, 'execSync', 'account_native_sqlite_closed') ||
      hasClosedResourceEvidence(error, 'execSync');
  }
  if (!observedTerminalState) {
    fail('account_native_sqlite_close_ineffective');
  }

  try {
    emit(PASS_MARKER);
  } catch {
    fail('account_native_sqlite_emit_failed');
  }
}
