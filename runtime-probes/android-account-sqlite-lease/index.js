const React = require('react');
const { registerRootComponent } = require('expo');
const { Platform, Text, View } = require('react-native');
const {
  defaultDatabaseDirectory,
  openDatabaseAsync,
} = require('expo-sqlite');
const {
  runAndroidAccountSqliteLeaseProbe,
} = require('./probe');

const DATABASE_NAME = 'accounts-v2-g-eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.db';
const PASS_MARKER = 'account_sqlite_lease_android_runtime_probe_pass';
const FAILURE_MARKER = 'account_sqlite_lease_android_runtime_probe_failed';
const PENDING_MARKER = 'account_sqlite_lease_android_runtime_probe_pending';
const ANDROID_ONLY_MARKER = 'account_sqlite_lease_android_runtime_probe_android_only';
const SAFE_FAILURE_CODES = new Set([
  'account_native_sqlite_unsupported',
  'account_native_sqlite_open_failed',
  'account_native_sqlite_begin_failed',
  'account_native_sqlite_commit_failed',
  'account_native_sqlite_revoke_failed',
  'account_native_sqlite_revoke_ineffective',
  'account_native_sqlite_close_failed',
  'account_native_sqlite_close_ineffective',
  'account_native_sqlite_emit_failed',
]);

function emitMarker(marker) {
  console.log(marker);
}

function emitProbePass(marker) {
  if (marker !== PASS_MARKER) {
    throw new Error('account_sqlite_lease_android_runtime_probe_emit_invalid');
  }
  emitMarker(PASS_MARKER);
}

function statusForFailure(error) {
  if (error instanceof Error && SAFE_FAILURE_CODES.has(error.message)) {
    return error.message;
  }
  return FAILURE_MARKER;
}

async function executeProbe() {
  const databaseRoot = defaultDatabaseDirectory.replace(/[\\/]+$/u, '');
  const databaseDirectory = `${databaseRoot}/accounts-v2`;
  const database = await openDatabaseAsync(
    DATABASE_NAME,
    {
      useNewConnection: true,
      enableChangeListener: false,
    },
    databaseDirectory,
  );
  const probePort = Object.freeze({
    openDatabaseAsync: async function openNativeDatabaseAsync() {
      return database.nativeDatabase;
    },
  });
  await runAndroidAccountSqliteLeaseProbe(probePort, emitProbePass);
}

function AccountSqliteLeaseProbeApp() {
  const [status, setStatus] = React.useState(PENDING_MARKER);

  React.useEffect(() => {
    let active = true;
    if (Platform.OS !== 'android') {
      setStatus(ANDROID_ONLY_MARKER);
      return () => {
        active = false;
      };
    }

    void executeProbe()
      .then(() => {
        if (active) setStatus(PASS_MARKER);
      })
      .catch((error) => {
        emitMarker(FAILURE_MARKER);
        if (active) setStatus(statusForFailure(error));
      });

    return () => {
      active = false;
    };
  }, []);

  return React.createElement(
    View,
    null,
    React.createElement(Text, null, status),
  );
}

registerRootComponent(AccountSqliteLeaseProbeApp);
