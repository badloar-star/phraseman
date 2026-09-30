const React = require('react');
const { registerRootComponent } = require('expo');
const { Platform } = require('react-native');
const Linking = require('expo-linking');
const {
  defaultDatabaseDirectory,
  openDatabaseAsync,
} = require('expo-sqlite');
const {
  runAndroidAccountSqlcipherProbe,
} = require('./probe');

const DEEP_LINK_PREFIX = 'phraseman://_account_v2_sqlcipher_probe?mode=';
const SAFE_FAILURE_CODES = new Set([
  'account_sqlcipher_probe_invalid_mode',
  'account_sqlcipher_probe_restart_required',
  'account_sqlcipher_probe_open_failed',
  'account_sqlcipher_probe_unsupported',
  'account_sqlcipher_probe_key_failed',
  'account_sqlcipher_probe_cipher_unavailable',
  'account_sqlcipher_probe_schema_failed',
  'account_sqlcipher_probe_marker_failed',
  'account_sqlcipher_probe_commit_failed',
  'account_sqlcipher_probe_wrong_key_false_success',
  'account_sqlcipher_probe_revoke_failed',
  'account_sqlcipher_probe_close_failed',
  'account_sqlcipher_probe_close_ineffective',
  'account_sqlcipher_probe_failed',
]);

let emitted = false;

function emitOnce(marker) {
  if (emitted) return;
  emitted = true;
  console.log(marker);
}

function safeFailureCode(failure) {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(failure, 'message');
    if (
      descriptor &&
      Object.prototype.hasOwnProperty.call(descriptor, 'value') &&
      typeof descriptor.value === 'string' &&
      SAFE_FAILURE_CODES.has(descriptor.value)
    ) {
      return descriptor.value;
    }
  } catch {
    // Return the fixed fallback below.
  }
  return 'account_sqlcipher_probe_failed';
}

function parseMode(initialUrl) {
  if (typeof initialUrl !== 'string' || !initialUrl.startsWith(DEEP_LINK_PREFIX)) return undefined;
  const mode = initialUrl.slice(DEEP_LINK_PREFIX.length);
  return mode === 'prepare' || mode === 'verify' || mode === 'wrong-key' ? mode : undefined;
}

async function execute() {
  if (Platform.OS !== 'android') {
    emitOnce('account_sqlcipher_probe_android_only');
    return;
  }
  let initialUrl;
  try {
    initialUrl = await Linking.getInitialURL();
  } catch {
    emitOnce('account_sqlcipher_probe_invalid_mode');
    return;
  }
  const mode = parseMode(initialUrl);
  if (mode === undefined) {
    emitOnce('account_sqlcipher_probe_invalid_mode');
    return;
  }
  const port = Object.freeze({
    defaultDatabaseDirectory,
    openDatabaseAsync,
  });
  try {
    await runAndroidAccountSqlcipherProbe(port, mode, emitOnce);
  } catch (failure) {
    emitOnce(safeFailureCode(failure));
  }
}

function AccountSqlcipherProbeApp() {
  React.useEffect(() => {
    void execute();
  }, []);
  return null;
}

registerRootComponent(AccountSqlcipherProbeApp);
