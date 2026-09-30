import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const ENTRYPOINT = path.join(
  ROOT,
  'runtime-probes',
  'android-account-sqlite-lease',
  'index.js',
);
const DATABASE_NAME = `accounts-v2-g-${'e'.repeat(64)}.db`;
const PASS_MARKER = 'account_sqlite_lease_android_runtime_probe_pass';
const FAILURE_MARKER = 'account_sqlite_lease_android_runtime_probe_failed';
const SAFE_FAILURE_CODES = [
  'account_native_sqlite_unsupported',
  'account_native_sqlite_open_failed',
  'account_native_sqlite_begin_failed',
  'account_native_sqlite_commit_failed',
  'account_native_sqlite_revoke_failed',
  'account_native_sqlite_revoke_ineffective',
  'account_native_sqlite_close_failed',
  'account_native_sqlite_close_ineffective',
  'account_native_sqlite_emit_failed',
];

function entrypointSource(): string {
  if (!existsSync(ENTRYPOINT)) {
    throw new Error('account_sqlite_lease_android_entrypoint_missing');
  }
  return readFileSync(ENTRYPOINT, 'utf8');
}

describe('Android account SQLite lease runtime entrypoint', () => {
  test('registers one minimal root component and gates native work to Android', () => {
    const source = entrypointSource();

    const requireTargets = [...source.matchAll(/require\((['"])([^'"]+)\1\)/gu)]
      .map((match) => match[2]);
    const requireOccurrences = source.match(/\brequire\s*\(/gu) ?? [];

    assert.ok(source.includes("const { registerRootComponent } = require('expo');"));
    assert.ok(source.includes("const { Platform, Text, View } = require('react-native');"));
    assert.ok(source.includes("if (Platform.OS !== 'android')"));
    assert.ok(source.includes('registerRootComponent(AccountSqliteLeaseProbeApp);'));
    assert.equal(source.match(/registerRootComponent\(/gu)?.length, 1);
    assert.deepEqual(requireTargets, [
      'react',
      'expo',
      'react-native',
      'expo-sqlite',
      './probe',
    ]);
    assert.equal(requireOccurrences.length, 5);
    assert.equal(requireOccurrences.length, requireTargets.length);
    assert.doesNotMatch(source, /expo-router/iu);
    assert.doesNotMatch(source, /require\((['"])(?:\.\.\/|@\/|app\/|modules\/|components\/)/u);
    assert.doesNotMatch(source, /navigation|auth|business/iu);
  });

  test('opens the exact isolated database and bridges only its native database to the probe', () => {
    const source = entrypointSource();

    assert.ok(source.includes(`const DATABASE_NAME = '${DATABASE_NAME}';`));
    assert.ok(source.includes("defaultDatabaseDirectory.replace(/[\\\\/]+$/u, '')"));
    assert.ok(source.includes("`${databaseRoot}/accounts-v2`"));
    assert.ok(source.includes('useNewConnection: true'));
    assert.ok(source.includes('enableChangeListener: false'));
    assert.ok(source.includes('return database.nativeDatabase;'));
    assert.ok(source.includes('runAndroidAccountSqliteLeaseProbe(probePort, emitProbePass);'));
    assert.equal(source.match(/openDatabaseAsync\(/gu)?.length, 1);
  });

  test('emits only the exact PASS marker or one fixed sanitized failure code', () => {
    const source = entrypointSource();

    const sinkDeclaration = source.match(
      /function emitMarker\(marker\) \{\s*console\.log\(marker\);\s*\}/u,
    );
    const consoleCalls = [...source.matchAll(/console\.(?:log|info|warn|error|debug)\s*\([^)]*\)/gu)];
    const emitMarkerReferences = [...source.matchAll(/\bemitMarker\s*\(([^)]*)\)/gu)];
    const emitMarkerCalls = emitMarkerReferences.filter((match) => {
      const prefix = source.slice(0, match.index).trimEnd();
      return !prefix.endsWith('function');
    });
    const safeFailureBlock = source.match(
      /const SAFE_FAILURE_CODES = new Set\(\[([\s\S]*?)\]\);/u,
    );
    const safeFailureCodes = safeFailureBlock === null
      ? []
      : [...safeFailureBlock[1].matchAll(/'([^']+)'/gu)].map((match) => match[1]);

    assert.ok(source.includes(`const PASS_MARKER = '${PASS_MARKER}';`));
    assert.ok(source.includes(`const FAILURE_MARKER = '${FAILURE_MARKER}';`));
    assert.ok(source.includes('if (marker !== PASS_MARKER)'));
    assert.ok(source.includes('emitMarker(PASS_MARKER);'));
    assert.ok(source.includes('emitMarker(FAILURE_MARKER);'));
    assert.ok(sinkDeclaration);
    assert.equal(consoleCalls.length, 1);
    assert.equal(consoleCalls[0][0], 'console.log(marker)');
    assert.equal(source.match(/\bconsole\b/gu)?.length, 1);
    assert.equal(source.match(/\bemitMarker\b/gu)?.length, 3);
    assert.deepEqual(
      emitMarkerCalls.map((match) => match[1].trim()),
      ['PASS_MARKER', 'FAILURE_MARKER'],
    );
    assert.deepEqual(safeFailureCodes, SAFE_FAILURE_CODES);
    assert.ok(source.includes('function statusForFailure(error)'));
    assert.ok(source.includes('error instanceof Error && SAFE_FAILURE_CODES.has(error.message)'));
    assert.ok(source.includes('return error.message;'));
    assert.ok(source.includes('return FAILURE_MARKER;'));
    assert.ok(source.includes('emitMarker(FAILURE_MARKER);'));
    assert.ok(source.includes('setStatus(statusForFailure(error));'));
    assert.doesNotMatch(source, /emitMarker\s*\(\s*(?:error|statusForFailure)/u);
    assert.doesNotMatch(
      source,
      /console\.(error|warn)|String\(error\)|JSON\.stringify\(error\)/u,
    );
    assert.ok(PASS_MARKER.length <= 64);
    assert.ok(FAILURE_MARKER.length <= 64);
    assert.match(PASS_MARKER, /^account_[a-z0-9_]+$/u);
    assert.match(FAILURE_MARKER, /^account_[a-z0-9_]+$/u);
  });
});
