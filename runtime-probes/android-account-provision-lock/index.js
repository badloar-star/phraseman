const React = require('react');
const { registerRootComponent, requireNativeModule } = require('expo');
const { Platform } = require('react-native');
const Linking = require('expo-linking');
const ExpoCrypto = require('expo-crypto');
const ExpoSQLite = requireNativeModule('ExpoSQLite');
const nativeAcquireAccountProvisionLockAsync = ExpoSQLite.acquireAccountProvisionLockAsync;
const {
  MARKERS,
  runAndroidAccountProvisionLockProbe,
  sanitizeDiagnostic,
} = require('./probe');

const PACKAGE_NAME = 'app.phraseman';
const PRIMARY_PROCESS = PACKAGE_NAME;
const SECONDARY_PROCESS = `${PACKAGE_NAME}:account_v2_probe`;
const PROBE_URL_PREFIX = 'phraseman://_account_v2_provision_lock_probe?';
const BOOTSTRAP_URL = `${PROBE_URL_PREFIX}command=bootstrap`;
const HEX_32 = /^[0-9a-f]{32}$/u;
const DECIMAL = /^[1-9][0-9]*$/u;
const FIXED_MARKERS = new Set(Object.values(MARKERS));
const DATABASE_ROOT_DIAGNOSTIC = 'account_provision_lock_database_root_diagnostic';
const DATABASE_ROOT_INVALID = 'account_provision_lock_database_root_invalid';

function acquireAccountProvisionLockWithNativeReceiver(databasePath) {
  if (ExpoSQLite.acquireAccountProvisionLockAsync !== nativeAcquireAccountProvisionLockAsync ||
      typeof nativeAcquireAccountProvisionLockAsync !== 'function') {
    throw new Error('account_provision_lock_native_unsupported');
  }
  return Reflect.apply(nativeAcquireAccountProvisionLockAsync, ExpoSQLite, [databasePath]);
}

function emitRaw(marker) {
  console.log(marker);
}

function getDatabaseRootCategory(value) {
  if (typeof value !== 'string') return 'non_string';
  if (/^\/data\/user\/0\/app\.phraseman\/files\/SQLite\/*$/u.test(value)) {
    return 'android_ce_user_zero';
  }
  if (/^\/data\/user\/[1-9][0-9]*\/app\.phraseman\/files\/SQLite\/*$/u.test(value)) {
    return 'android_ce_user_nonzero';
  }
  if (/^file:/iu.test(value)) return 'file_uri';
  if (/^\/data\/data\/app\.phraseman\/files\/SQLite\/*$/u.test(value)) return 'legacy_alias';
  return 'other';
}

function emitDatabaseRootDiagnostic(binding, databaseRoot) {
  const fields = [
    binding.packageName, binding.processName, String(binding.pid), binding.starttime,
    binding.launchNonce, binding.runtimeIdentity,
  ];
  emitRaw([
    DATABASE_ROOT_DIAGNOSTIC, '1', getDatabaseRootCategory(databaseRoot), ...fields,
  ].join('|'));
}

function isBindingEvidence(binding) {
  return binding !== undefined && binding.packageName === PACKAGE_NAME &&
    (binding.processName === PRIMARY_PROCESS || binding.processName === SECONDARY_PROCESS) &&
    Number.isSafeInteger(binding.pid) && binding.pid > 0 && DECIMAL.test(binding.starttime) &&
    HEX_32.test(binding.launchNonce) && HEX_32.test(binding.runtimeIdentity);
}

function emitMarker(marker, evidence) {
  if (!FIXED_MARKERS.has(marker)) throw new Error('account_provision_lock_emit_failed');
  const binding = evidence;
  if (!isBindingEvidence(binding)) throw new Error('account_provision_lock_emit_failed');
  const fields = [
    binding.packageName, binding.processName, String(binding.pid), binding.starttime,
    binding.launchNonce, binding.runtimeIdentity,
  ];
  if (marker === MARKERS.ownershipCheckpoint) {
    if (!HEX_32.test(binding.token)) {
      throw new Error('account_provision_lock_emit_failed');
    }
    emitRaw([marker, ...fields, binding.token].join('|'));
    return;
  }
  if (marker === MARKERS.controlAcknowledged) {
    if ((binding.command !== 'checkpoint' && binding.command !== 'release') ||
        (binding.command === 'checkpoint' && !HEX_32.test(binding.token)) ||
        (binding.command === 'release' && binding.token !== undefined)) {
      throw new Error('account_provision_lock_emit_failed');
    }
    emitRaw([marker, binding.command, ...fields, binding.token ?? '-'].join('|'));
    return;
  }
  emitRaw([marker, ...fields].join('|'));
}

function exactParameters(url, expectedKeys) {
  const actual = [...url.searchParams.keys()];
  if (actual.length !== expectedKeys.length) return false;
  return expectedKeys.every((key) => actual.filter((candidate) => candidate === key).length === 1);
}

function parseUrl(raw) {
  if (typeof raw !== 'string' || !raw.startsWith(PROBE_URL_PREFIX)) return undefined;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'phraseman:' || url.hostname !== '_account_v2_provision_lock_probe') {
    return undefined;
  }
  return url;
}

function parseBinding(url, runtimeIdentity) {
  const packageName = url.searchParams.get('packageName');
  const processName = url.searchParams.get('processName');
  const pidText = url.searchParams.get('pid');
  const starttime = url.searchParams.get('starttime');
  const launchNonce = url.searchParams.get('launchNonce');
  const pid = Number(pidText);
  if (
    packageName !== 'app.phraseman' ||
    (processName !== PRIMARY_PROCESS && processName !== SECONDARY_PROCESS) ||
    !DECIMAL.test(pidText ?? '') || !Number.isSafeInteger(pid) || pid <= 0 ||
    !DECIMAL.test(starttime ?? '') ||
    !HEX_32.test(launchNonce ?? '') || !HEX_32.test(runtimeIdentity)
  ) {
    return undefined;
  }
  return Object.freeze({ packageName, processName, pid, starttime, launchNonce, runtimeIdentity });
}

function parseLaunch(raw, runtimeIdentity) {
  const url = parseUrl(raw);
  const launchKeys = [
    'command', 'role', 'identity', 'packageName', 'processName', 'pid',
    'starttime', 'launchNonce',
  ];
  if (url === undefined || !exactParameters(url, launchKeys)) return undefined;
  const command = url.searchParams.get('command');
  const role = url.searchParams.get('role');
  const identity = url.searchParams.get('identity');
  const binding = parseBinding(url, runtimeIdentity);
  if (
    command !== 'launch' ||
    !(role === 'holder' || role === 'release') ||
    !(identity === 'x' || identity === 'y') ||
    binding === undefined
  ) {
    return undefined;
  }
  return Object.freeze({ role, identity, binding });
}

function waitForLaunch(runtimeIdentity) {
  return new Promise((resolve) => {
    let settled = false;
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (settled) return;
      const request = parseLaunch(url, runtimeIdentity);
      if (request === undefined) return;
      settled = true;
      subscription.remove();
      resolve(request);
    });
  });
}

function sameBinding(left, right) {
  return left.packageName === right.packageName &&
    left.processName === right.processName &&
    left.pid === right.pid &&
    left.starttime === right.starttime &&
    left.launchNonce === right.launchNonce &&
    left.runtimeIdentity === right.runtimeIdentity;
}

function parseControl(raw, expectedBinding) {
  const url = parseUrl(raw);
  if (url === undefined) return undefined;
  const command = url.searchParams.get('command');
  const controlKeys = [
    'command', 'packageName', 'processName', 'pid', 'starttime', 'launchNonce', 'runtimeIdentity',
    ...(command === 'checkpoint' ? ['token'] : []),
  ];
  if (!exactParameters(url, controlKeys)) return undefined;
  const runtimeIdentity = url.searchParams.get('runtimeIdentity');
  const binding = parseBinding(url, runtimeIdentity ?? '');
  if (!(command === 'release' || command === 'checkpoint') || binding === undefined) return undefined;
  if (!sameBinding(binding, expectedBinding)) return undefined;
  if (command === 'checkpoint') {
    const token = url.searchParams.get('token');
    if (!HEX_32.test(token ?? '')) return undefined;
    return Object.freeze({ command, binding, token });
  }
  return Object.freeze({ command, binding });
}

function waitForReleaseControl(expectedBinding) {
  return new Promise((resolve) => {
    let settled = false;
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (settled) return;
      const control = parseControl(url, expectedBinding);
      if (control === undefined) return;
      settled = true;
      subscription.remove();
      resolve(control);
    });
  });
}

async function execute() {
  if (Platform.OS !== 'android') throw new Error('account_provision_lock_request_invalid');
  let runtimeIdentity;
  try {
    runtimeIdentity = ExpoCrypto.randomUUID().replace(/-/gu, '').toLowerCase();
  } catch {
    throw new Error('account_provision_lock_request_invalid');
  }
  if (!HEX_32.test(runtimeIdentity)) throw new Error('account_provision_lock_request_invalid');
  let initialUrl;
  try {
    initialUrl = await Linking.getInitialURL();
  } catch {
    throw new Error('account_provision_lock_request_invalid');
  }
  const request = initialUrl === BOOTSTRAP_URL
    ? await waitForLaunch(runtimeIdentity)
    : parseLaunch(initialUrl, runtimeIdentity);
  if (request === undefined) throw new Error('account_provision_lock_request_invalid');
  const databaseRoot = ExpoSQLite.defaultDatabaseDirectory;
  const port = Object.freeze({
    defaultDatabaseDirectory: databaseRoot,
    acquireAccountProvisionLockAsync: acquireAccountProvisionLockWithNativeReceiver,
    waitForReleaseControl,
  });
  emitMarker(MARKERS.launchAcknowledged, request.binding);
  try {
    await runAndroidAccountProvisionLockProbe(port, request, emitMarker);
  } catch (failure) {
    if (sanitizeDiagnostic(failure) === DATABASE_ROOT_INVALID) {
      emitDatabaseRootDiagnostic(request.binding, databaseRoot);
    }
    throw failure;
  }
}

function AccountProvisionLockProbeApp() {
  React.useEffect(() => {
    void execute().catch((failure) => {
      const code = sanitizeDiagnostic(failure);
      emitRaw(code);
    });
  }, []);
  return null;
}

registerRootComponent(AccountProvisionLockProbeApp);
