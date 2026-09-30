const React = require('react');
const { registerRootComponent } = require('expo');
const ExpoCrypto = require('expo-crypto');
const Linking = require('expo-linking');
const { Platform } = require('react-native');
const { defaultDatabaseDirectory, openDatabaseAsync } = require('expo-sqlite');
const {
  MARKERS,
  runAndroidAccountSqlcipherRecoveryProbe,
} = require('./probe');

const PACKAGE_NAME = 'app.phraseman';
const PROCESS_NAME = PACKAGE_NAME;
const PREFIX = 'phraseman://_account_v2_sqlcipher_recovery_probe?';
const HEX_32 = /^[0-9a-f]{32}$/u;
const DECIMAL = /^[1-9][0-9]*$/u;
const MODES = new Set([
  'prepare',
  'dirty-hold',
  'rollback-verify',
  'committed-wal-hold',
  'recovery-verify',
  'final-reopen',
]);
const FIXED_MARKERS = new Set(Object.values(MARKERS));
const BOOTSTRAP_ACKNOWLEDGED = 'account_sqlcipher_recovery_bootstrap_acknowledged';
const LAUNCH_ACKNOWLEDGED = 'account_sqlcipher_recovery_launch_acknowledged';
const SAFE_FAILURE_CODES = new Set([
  'account_sqlcipher_recovery_request_invalid',
  'account_sqlcipher_recovery_invalid_mode',
  'account_sqlcipher_recovery_restart_required',
  'account_sqlcipher_recovery_open_failed',
  'account_sqlcipher_recovery_unsupported',
  'account_sqlcipher_recovery_key_failed',
  'account_sqlcipher_recovery_cipher_unavailable',
  'account_sqlcipher_recovery_pragma_failed',
  'account_sqlcipher_recovery_schema_failed',
  'account_sqlcipher_recovery_write_failed',
  'account_sqlcipher_recovery_atomic_invariant_failed',
  'account_sqlcipher_recovery_commit_failed',
  'account_sqlcipher_recovery_quick_check_failed',
  'account_sqlcipher_recovery_integrity_failed',
  'account_sqlcipher_recovery_checkpoint_failed',
  'account_sqlcipher_recovery_revoke_failed',
  'account_sqlcipher_recovery_close_failed',
  'account_sqlcipher_recovery_close_ineffective',
  'account_sqlcipher_recovery_emit_failed',
  'account_sqlcipher_recovery_failed',
]);
let executionClaimed = false;

function emitRaw(value) {
  console.log(value);
}

function exactParameters(url, expected) {
  const actual = [...url.searchParams.keys()];
  return actual.length === expected.length &&
    expected.every((key) => actual.filter((candidate) => candidate === key).length === 1);
}

function parseUrl(raw) {
  if (typeof raw !== 'string' || !raw.startsWith(PREFIX)) return undefined;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return undefined;
  }
  return url.protocol === 'phraseman:' && url.hostname === '_account_v2_sqlcipher_recovery_probe'
    ? url
    : undefined;
}

// зачем: bootstrap приходит в процесс, PID/starttime которого хост ещё не знал в момент
// отправки, поэтому он несёт ровно command+mode и ничего о процессе. Точная строка,
// а не только набор ключей: исключаем переупорядочивание и лишнее кодирование.
function parseBootstrap(raw) {
  const url = parseUrl(raw);
  if (url === undefined || !exactParameters(url, ['command', 'mode'])) return undefined;
  const mode = url.searchParams.get('mode');
  if (url.searchParams.get('command') !== 'bootstrap' || !MODES.has(mode)) return undefined;
  if (raw !== `${PREFIX}command=bootstrap&mode=${mode}`) return undefined;
  return Object.freeze({ mode });
}

// зачем: launch несёт полную привязку, которую хост собрал ПОСЛЕ старта процесса
// (pid/starttime из /proc, свежий nonce) плюс runtimeIdentity из ack этого рантайма;
// принимаем только совпадение с нашим runtimeIdentity и mode из bootstrap.
function parseLaunch(raw, bootstrap, runtimeIdentity) {
  const url = parseUrl(raw);
  const keys = [
    'command', 'mode', 'packageName', 'processName', 'pid', 'starttime', 'launchNonce',
    'runtimeIdentity',
  ];
  if (url === undefined || !exactParameters(url, keys) || url.searchParams.get('command') !== 'launch') {
    return undefined;
  }
  const mode = url.searchParams.get('mode');
  const packageName = url.searchParams.get('packageName');
  const processName = url.searchParams.get('processName');
  const pidText = url.searchParams.get('pid');
  const starttime = url.searchParams.get('starttime');
  const launchNonce = url.searchParams.get('launchNonce');
  const launchRuntimeIdentity = url.searchParams.get('runtimeIdentity');
  const pid = Number(pidText);
  if (
    !MODES.has(mode) || mode !== bootstrap.mode ||
    packageName !== PACKAGE_NAME || processName !== PROCESS_NAME ||
    !DECIMAL.test(pidText ?? '') || !Number.isSafeInteger(pid) || pid <= 0 ||
    !DECIMAL.test(starttime ?? '') || !HEX_32.test(launchNonce ?? '') ||
    !HEX_32.test(launchRuntimeIdentity ?? '') || !HEX_32.test(runtimeIdentity) ||
    launchRuntimeIdentity !== runtimeIdentity
  ) return undefined;
  return Object.freeze({
    mode,
    packageName,
    processName,
    pid,
    starttime,
    launchNonce,
    runtimeIdentity,
  });
}

function waitForLaunch(bootstrap, runtimeIdentity) {
  return new Promise((resolve, reject) => {
    let claimed = false;
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (claimed) return;
      claimed = true;
      subscription.remove();
      const request = parseLaunch(url, bootstrap, runtimeIdentity);
      if (request === undefined) {
        reject(new Error('account_sqlcipher_recovery_request_invalid'));
        return;
      }
      resolve(request);
    });
  });
}

function emitBootstrapAcknowledged(runtimeIdentity, mode) {
  if (!HEX_32.test(runtimeIdentity) || !MODES.has(mode)) {
    throw new Error('account_sqlcipher_recovery_emit_failed');
  }
  emitRaw([BOOTSTRAP_ACKNOWLEDGED, runtimeIdentity, mode].join('|'));
}

function emitBound(marker, binding) {
  if (!FIXED_MARKERS.has(marker) && marker !== LAUNCH_ACKNOWLEDGED) {
    throw new Error('account_sqlcipher_recovery_emit_failed');
  }
  emitRaw([
    marker,
    binding.packageName,
    binding.processName,
    String(binding.pid),
    binding.starttime,
    binding.launchNonce,
    binding.runtimeIdentity,
    binding.mode,
  ].join('|'));
}

function safeFailureCode(failure) {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(failure, 'message');
    if (
      descriptor !== undefined && Object.prototype.hasOwnProperty.call(descriptor, 'value') &&
      typeof descriptor.value === 'string' && SAFE_FAILURE_CODES.has(descriptor.value)
    ) return descriptor.value;
  } catch {
    // Use the fixed fallback.
  }
  return 'account_sqlcipher_recovery_failed';
}

async function execute() {
  if (Platform.OS !== 'android') throw new Error('account_sqlcipher_recovery_request_invalid');
  if (executionClaimed) throw new Error('account_sqlcipher_recovery_request_invalid');
  executionClaimed = true;
  let runtimeIdentity;
  try {
    runtimeIdentity = ExpoCrypto.randomUUID().replace(/-/gu, '').toLowerCase();
  } catch {
    throw new Error('account_sqlcipher_recovery_request_invalid');
  }
  if (!HEX_32.test(runtimeIdentity)) throw new Error('account_sqlcipher_recovery_request_invalid');
  let initialUrl;
  try {
    initialUrl = await Linking.getInitialURL();
  } catch {
    throw new Error('account_sqlcipher_recovery_request_invalid');
  }
  const bootstrap = parseBootstrap(initialUrl);
  if (bootstrap === undefined) throw new Error('account_sqlcipher_recovery_request_invalid');
  emitBootstrapAcknowledged(runtimeIdentity, bootstrap.mode);
  const request = await waitForLaunch(bootstrap, runtimeIdentity);
  // База открывается только после принятого launch и полностью привязанного маркера.
  emitBound(LAUNCH_ACKNOWLEDGED, request);
  const port = Object.freeze({ defaultDatabaseDirectory, openDatabaseAsync });
  await runAndroidAccountSqlcipherRecoveryProbe(
    port,
    request.mode,
    (marker) => emitBound(marker, request),
  );
}

function AndroidAccountSqlcipherRecoveryApp() {
  React.useEffect(() => {
    void execute().catch((failure) => emitRaw(safeFailureCode(failure)));
  }, []);
  return null;
}

registerRootComponent(AndroidAccountSqlcipherRecoveryApp);
