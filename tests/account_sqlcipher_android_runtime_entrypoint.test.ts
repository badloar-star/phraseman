import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(__dirname, '..');
const entrypointPath = path.join(root, 'runtime-probes/android-account-sqlcipher/index.js');
const runnerPath = process.env.ACCOUNT_SQLCIPHER_RUNNER_OVERRIDE_PATH
  ? path.resolve(process.env.ACCOUNT_SQLCIPHER_RUNNER_OVERRIDE_PATH)
  : path.join(root, 'runtime-probes/android-account-sqlcipher/run-proof.ps1');
const databaseRelativePath =
  'files/SQLite/accounts-v2/accounts-v2-g-7b32e4de72ea35b9caf5468847f91e542f87c50c5062e82c794f7e9c8c92392c.db';
const sha = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');
const approvedApkSha256 = sha('apk');
const approvedApkPathSha256 = sha('/data/app/approved/base.apk');
const packetSpecSha256 = 'e8300bc07ad760a692a071b0eb6a10a95d5c5bf0c045803e03000e598239dccf';
const sourceFingerprintSha256 = sha('five-allowlisted-files');
const authenticRedInvocation = 'node node_modules/jest/bin/jest.js --config=$ACCOUNT_SQLCIPHER_JEST_CONFIG --runTestsByPath tests/account_sqlcipher_android_runtime_probe.test.ts tests/account_sqlcipher_android_runtime_entrypoint.test.ts --no-cache --runInBand --watchman=false';

type LibraryResult = Readonly<{
  status: number | null;
  stdout: string;
  stderr: string;
  value?: unknown;
}>;

function runLibrary(
  validationKind: string,
  payload: unknown,
  environmentOverrides: Readonly<Record<string, string | undefined>> = {},
): LibraryResult {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
  const result = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      runnerPath,
      '-LibraryMode',
      '-ValidationKind',
      validationKind,
      '-ValidationPayloadBase64',
      encoded,
    ],
    {
      cwd: root,
      encoding: 'utf8',
      timeout: 30_000,
      env: { ...process.env, ...environmentOverrides },
    },
  );
  const stdout = result.stdout.trim();
  let value: unknown;
  if (stdout.startsWith('{') || stdout.startsWith('[') || stdout.startsWith('"')) {
    value = JSON.parse(stdout) as unknown;
  }
  return Object.freeze({ status: result.status, stdout, stderr: result.stderr.trim(), value });
}

function expectLibraryPass(kind: string, payload: unknown): Record<string, unknown> {
  const result = runLibrary(kind, payload);
  expect(result.status).toBe(0);
  expect(result.stderr).toBe('');
  expect(result.value).toEqual(expect.objectContaining({ status: 'pass' }));
  return result.value as Record<string, unknown>;
}

function expectLibraryReject(kind: string, payload: unknown, code: string): void {
  const result = runLibrary(kind, payload);
  expect(result.status).toBe(1);
  expect(result.stdout).toBe('');
  expect(result.stderr).toBe(code);
}

function phaseRecord(index: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const labels = ['prepare', 'verify-before', 'wrong-key', 'verify-after'];
  const modes = ['prepare', 'verify', 'wrong-key', 'verify'];
  const markers = [
    'account_sqlcipher_android_prepare_pass',
    'account_sqlcipher_android_verify_pass',
    'account_sqlcipher_android_wrong_key_rejected_pass',
    'account_sqlcipher_android_verify_pass',
  ];
  const sourceObservation = (suffix: string, second: number) => ({
    observedUtc: `2026-09-27T12:0${index}:0${second}.000Z`,
    fileCount: 5,
    fingerprintSha256: sourceFingerprintSha256,
    suffix,
  });
  const apkObservations = Object.fromEntries([
    ['beforeLaunch', 1],
    ['afterPid', 3],
    ['afterMarker', 5],
    ['final', 6],
  ].map(([checkpoint, second], observationIndex) => [checkpoint, {
    checkpoint,
    observedUtc: `2026-09-27T12:0${index}:0${second}.000Z`,
    pmPathCommandSequence: (index * 8) + (observationIndex * 2) + 1,
    sha256CommandSequence: (index * 8) + (observationIndex * 2) + 2,
    baseApkPathSha256: approvedApkPathSha256,
    sha256: approvedApkSha256,
  }]));
  return {
    schemaVersion: 1,
    runId: '0123456789abcdef0123456789abcdef',
    label: labels[index],
    mode: modes[index],
    sequence: index + 1,
    launchedUtc: `2026-09-27T12:0${index}:02.000Z`,
    capturedUtc: `2026-09-27T12:0${index}:04.000Z`,
    pid: 1200 + index,
    starttime: String(9000 + index),
    databaseRelativePath,
    logArtifactRelativePath: `phases/${labels[index]}.json`,
    logSha256: sha(`canonical-phase-${index}`),
    expectedMarker: markers[index],
    expectedMarkerCount: 1,
    unexpectedMarkerCount: 0,
    cleanupPassed: true,
    apkObservations,
    sourceBefore: (({ suffix: _suffix, ...value }) => value)(sourceObservation('before', 0)),
    sourceAfter: (({ suffix: _suffix, ...value }) => value)(sourceObservation('after', 7)),
    ...overrides,
  };
}

function phasePayload(): Record<string, unknown> {
  return {
    runId: '0123456789abcdef0123456789abcdef',
    phases: [0, 1, 2, 3].map((index) => phaseRecord(index)),
    header: { label: 'header-16', hex: '00112233445566778899aabbccddeeff' },
    snapshots: [
      { label: 'before-wrong-key', sha256: sha('database-bytes'), size: 4096 },
      { label: 'after-wrong-key', sha256: sha('database-bytes'), size: 4096 },
    ],
  };
}

function manifestPayload(): Record<string, unknown> {
  const phase = phasePayload();
  return {
    schemaVersion: 1,
    runId: phase.runId,
    runStartedUtc: '2026-09-27T12:00:00.000Z',
    validatedUtc: '2026-09-27T12:10:00.000Z',
    preEditBaselineSha256: sha('baseline'),
    gateBundleSha256: sha('bundle'),
    packetSpecSha256,
    preDeviceHead: '54b3b90e670ba96b371528463819a147ce236766',
    preDeviceContentRecordCount: 10,
    preDeviceContentByteCount: 1000,
    preDeviceContentManifestSha256: sha('content'),
    postDeviceHead: '54b3b90e670ba96b371528463819a147ce236766',
    postDeviceContentRecordCount: 10,
    postDeviceContentByteCount: 1000,
    postDeviceContentManifestSha256: sha('content'),
    installedApkSha256: approvedApkSha256,
    databaseRelativePath,
    phases: phase.phases,
    cleanupApkObservation: {
      checkpoint: 'cleanup',
      observedUtc: '2026-09-27T12:05:00.000Z',
      pmPathCommandSequence: 33,
      sha256CommandSequence: 34,
      baseApkPathSha256: approvedApkPathSha256,
      sha256: approvedApkSha256,
    },
    finalSourceObservation: {
      observedUtc: '2026-09-27T12:04:00.000Z',
      fileCount: 5,
      fingerprintSha256: sourceFingerprintSha256,
    },
    headerHex: phase.header,
    beforeWrongKey: (phase.snapshots as unknown[])[0],
    afterWrongKey: (phase.snapshots as unknown[])[1],
    packageSha256Before: sha('package'),
    packageSha256After: sha('package'),
    nativeInputHashes: {
      appConfigJs: sha('a'),
      gradleProperties: sha('b'),
      packageJson: sha('package'),
      packageLockJson: sha('d'),
      expoSqlitePatch: sha('e'),
      localApk: approvedApkSha256,
    },
    gates: { red: 'pass', green: 'pass', eslint: 'pass', strictTs: 'pass' },
    restoration: {
      appForceStopped: true,
      metroStopped: true,
      packageRestored: true,
      packageRecoveryCleared: true,
      externalEmulatorOnline: true,
      installedApkMatched: true,
      tempDeleted: true,
      sanitizerPassed: true,
    },
  };
}

function gateArchivePayload(failedGate?: 'green' | 'eslint' | 'strictTs'): Record<string, unknown> {
  const testHashes = { probe: sha('probe-test'), entrypoint: sha('entry-test') };
  const red = {
    schemaVersion: 2,
    gate: 'red',
    status: 'expected_failure',
    exitCode: 1,
    classification: 'p1_hardening_regressions_absent',
    createdUtc: '2026-09-27T11:00:00.000Z',
    testFileHashes: testHashes,
    vulnerableRunnerArtifact: 'ACCOUNT_ANDROID_SQLCIPHER_P1_VULNERABLE_RUNNER.ps1',
    vulnerableRunnerSha256: sha('vulnerable-runner'),
    vulnerableRunnerPathSha256: sha('vulnerable-runner-path'),
    invocationSha256: sha(authenticRedInvocation),
    rawLogArtifact: 'ACCOUNT_ANDROID_SQLCIPHER_P1_AUTHENTIC_RED.log',
    rawLogSha256: sha('red-log'),
    resultCounts: {
      failedSuites: 1,
      passedSuites: 1,
      totalSuites: 2,
      failedTests: 9,
      passedTests: 156,
      totalTests: 165,
    },
  };
  const record = (gate: 'green' | 'eslint' | 'strictTs') => ({
    schemaVersion: 1,
    gate,
    status: failedGate === gate ? 'fail' : 'pass',
    exitCode: failedGate === gate ? 1 : 0,
    testSuites: gate === 'green' ? 2 : 0,
    tests: gate === 'green' ? 80 : 0,
    logSha256: sha(`${gate}-log`),
  });
  const rawEntries: Record<string, string> = {
    'red.json': JSON.stringify(red),
    'green.json': JSON.stringify(record('green')),
    'eslint.json': JSON.stringify(record('eslint')),
    'strictTs.json': JSON.stringify(record('strictTs')),
  };
  const allowlistedFileHashes = {
    'runtime-probes/android-account-sqlcipher/probe.ts': sha('probe'),
    'runtime-probes/android-account-sqlcipher/index.js': sha('index'),
    'tests/account_sqlcipher_android_runtime_probe.test.ts': testHashes.probe,
    'tests/account_sqlcipher_android_runtime_entrypoint.test.ts': testHashes.entrypoint,
    'runtime-probes/android-account-sqlcipher/run-proof.ps1': sha('runner'),
  };
  const nativeInputHashes = {
    appConfigJs: sha('app-config'),
    gradleProperties: sha('gradle'),
    packageJson: sha('package'),
    packageLockJson: sha('lock'),
    expoSqlitePatch: sha('patch'),
    localApk: sha('apk'),
  };
  const manifest = {
    schemaVersion: 1,
    baselineSha256: sha('baseline'),
    packetSpecSha256,
    exactFiveCreated: true,
    allowlistedFileHashes,
    gateArtifactHashes: {
      red: sha(rawEntries['red.json']),
      green: sha(rawEntries['green.json']),
      eslint: sha(rawEntries['eslint.json']),
      strictTs: sha(rawEntries['strictTs.json']),
    },
    nativeInputHashes,
    sourceFingerprintSha256,
  };
  rawEntries['gate-manifest.json'] = JSON.stringify(manifest);
  return {
    entries: rawEntries,
    expected: {
      baselineSha256: manifest.baselineSha256,
      packetSpecSha256,
      testFileHashes: testHashes,
      allowlistedFileHashes,
      nativeInputHashes,
      sourceFingerprintSha256,
    },
  };
}

type RecoveryFixture = Readonly<{
  root: string;
  packagePath: string;
  recoveryPath: string;
  journalTempPath: string;
  backupPath: string;
  devTempPath: string;
  restoreTempPath: string;
  originalBytes: Buffer;
  devBytes: Buffer;
  originalSha256: string;
  devSha256: string;
}>;

function createRecoveryFixture(): RecoveryFixture {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'account-sqlcipher-recovery-test-'));
  const packagePath = path.join(fixtureRoot, 'package.json');
  const originalBytes = Buffer.from('{"name":"fixture","main":"index.js"}\n', 'utf8');
  const devBytes = Buffer.from(
    '{"name":"fixture","main":"runtime-probes/android-account-sqlcipher/index.js"}\n',
    'utf8',
  );
  fs.writeFileSync(packagePath, originalBytes, { flag: 'wx' });
  return {
    root: fixtureRoot,
    packagePath,
    recoveryPath: path.join(fixtureRoot, 'ACCOUNT_ANDROID_SQLCIPHER_PACKAGE_RECOVERY.json'),
    backupPath: path.join(fixtureRoot, 'ACCOUNT_ANDROID_SQLCIPHER_PACKAGE_JSON_ORIGINAL.bin'),
    journalTempPath: path.join(fixtureRoot, 'ACCOUNT_ANDROID_SQLCIPHER_PACKAGE_RECOVERY.json.tmp'),
    devTempPath: `${packagePath}.account-sqlcipher-dev.tmp`,
    restoreTempPath: `${packagePath}.account-sqlcipher-restore.tmp`,
    originalBytes,
    devBytes,
    originalSha256: sha(originalBytes.toString('utf8')),
    devSha256: sha(devBytes.toString('utf8')),
  };
}

function writeRecoveryJournal(
  fixture: RecoveryFixture,
  stage: 'prepared' | 'mutated' | 'restoring',
  backupBytes: Buffer = fixture.originalBytes,
  destination: 'final' | 'temp' = 'final',
): void {
  fs.writeFileSync(fixture.backupPath, backupBytes, { flag: 'wx' });
  fs.writeFileSync(destination === 'final' ? fixture.recoveryPath : fixture.journalTempPath, JSON.stringify({
    schemaVersion: 1,
    repo: fixture.root.replaceAll('\\', '/'),
    head: '54b3b90e670ba96b371528463819a147ce236766',
    originalSha256: fixture.originalSha256,
    devMutatedSha256: fixture.devSha256,
    backupPath: fixture.backupPath,
    backupSha256: sha(backupBytes.toString('utf8')),
    stage,
  }), { flag: 'wx' });
}

function recoveryPayload(fixture: RecoveryFixture): Record<string, unknown> {
  return {
    repo: fixture.root,
    packagePath: fixture.packagePath,
    recoveryPath: fixture.recoveryPath,
    backupPath: fixture.backupPath,
  };
}

function removeFixture(rootPath: string): void {
  fs.rmSync(rootPath, { recursive: true, force: true });
}

function focusedGateFacts(failedGate?: 'green' | 'eslint' | 'strictTs'): Record<string, unknown> {
  return {
    green: {
      status: failedGate === 'green' ? 'fail' : 'pass',
      exitCode: failedGate === 'green' ? 1 : 0,
      testSuites: 2,
      tests: 120,
    },
    eslint: {
      status: failedGate === 'eslint' ? 'fail' : 'pass',
      exitCode: failedGate === 'eslint' ? 1 : 0,
      testSuites: 0,
      tests: 0,
    },
    strictTs: {
      status: failedGate === 'strictTs' ? 'fail' : 'pass',
      exitCode: failedGate === 'strictTs' ? 1 : 0,
      testSuites: 0,
      tests: 0,
    },
  };
}

describe('Android Account V2 SQLCipher entrypoint and host runner contracts', () => {
  test('headless entrypoint is Android-only, mode-bounded, null-rendering, and fixed-token-only', () => {
    const source = fs.readFileSync(entrypointPath, 'utf8');
    expect(source).toContain("Platform.OS !== 'android'");
    expect(source).toContain('phraseman://_account_v2_sqlcipher_probe?mode=');
    expect(source).toContain('runAndroidAccountSqlcipherProbe');
    expect(source).toContain('return null');
    expect(source).not.toMatch(/\bText\b|\bView\b|String\(error\)|JSON\.stringify\(error\)|\.stack|\.cause/u);
    expect(source.match(/console\.log\(/gu)).toHaveLength(1);
    expect(source).not.toContain('OPENAI_API_KEY');
  });

  test('bundle/device source remains bounded and contains no build, install, deploy, or network action', () => {
    const source = fs.readFileSync(runnerPath, 'utf8');
    expect(source).toContain("[switch]$BuildGateBundle");
    expect(source).toContain("Global\\PhrasemanAccountSqlcipherProofV1");
    expect(source).toContain('.WaitOne(0)');
    expect(source).toContain('--max-old-space-size=512');
    expect(source).toContain('--runTestsByPath');
    expect(source).toContain('tests/account_sqlcipher_android_runtime_probe.test.ts');
    expect(source).toContain('tests/account_sqlcipher_android_runtime_entrypoint.test.ts');
    expect(source).toContain('--no-cache');
    expect(source).toContain('--runInBand');
    expect(source).toContain('--watchman=false');
    expect(source).toContain('--noEmit');
    expect(source).toContain('--strict');
    expect(source).toContain('--skipLibCheck');
    expect(source).toContain('--target');
    expect(source).toContain('ES2022');
    expect(source).toContain('red.json');
    expect(source).toContain('green.json');
    expect(source).toContain('eslint.json');
    expect(source).toContain('strictTs.json');
    expect(source).toContain('gate-manifest.json');
    expect(source).not.toMatch(/gradlew|adb[^\r\n]*\binstall\b|eas\s+build|firebase\s+deploy|Invoke-WebRequest|curl\s|assembleDebug|bundleRelease/u);
  });

  test('closed gate records accept a valid archive and reject a self-consistent failed archive', () => {
    expectLibraryPass('GateRecords', gateArchivePayload());
    expectLibraryReject(
      'GateRecords',
      gateArchivePayload('green'),
      'gate_record_value_invalid',
    );
  });

  test('authentic RED validator binds final tests, immutable vulnerable snapshot, exact invocation, raw log, and counts', () => {
    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'account-sqlcipher-authentic-red-'));
    const snapshot = path.join(fixtureRoot, 'ACCOUNT_ANDROID_SQLCIPHER_P1_VULNERABLE_RUNNER.ps1');
    const raw = path.join(fixtureRoot, 'ACCOUNT_ANDROID_SQLCIPHER_P1_AUTHENTIC_RED.log');
    const receipt = path.join(fixtureRoot, 'receipt.json');
    const invalidReceipt = path.join(fixtureRoot, 'invalid-receipt.json');
    const linkedContainer = fs.mkdtempSync(path.join(os.tmpdir(), 'account-sqlcipher-authentic-red-link-'));
    const linkedParent = path.join(linkedContainer, 'linked-parent');
    const snapshotBytes = 'immutable vulnerable runner snapshot\n';
    const rawBytes = 'FAIL tests/account_sqlcipher_android_runtime_entrypoint.test.ts\nTest Suites: 1 failed, 1 passed, 2 total\nTests: 9 failed, 156 passed, 165 total\n';
    fs.writeFileSync(snapshot, snapshotBytes, { flag: 'wx' });
    fs.writeFileSync(raw, rawBytes, { flag: 'wx' });
    fs.chmodSync(snapshot, 0o444);
    fs.chmodSync(raw, 0o444);
    const value = {
      schemaVersion: 2,
      gate: 'red',
      status: 'expected_failure',
      exitCode: 1,
      classification: 'p1_hardening_regressions_absent',
      createdUtc: '2026-09-27T15:00:00.000Z',
      testFileHashes: {
        probe: sha(fs.readFileSync(path.join(root, 'tests/account_sqlcipher_android_runtime_probe.test.ts'), 'utf8')),
        entrypoint: sha(fs.readFileSync(__filename, 'utf8')),
      },
      vulnerableRunnerArtifact: path.basename(snapshot),
      vulnerableRunnerSha256: sha(snapshotBytes),
      vulnerableRunnerPathSha256: sha(path.resolve(snapshot)),
      invocationSha256: sha(authenticRedInvocation),
      rawLogArtifact: path.basename(raw),
      rawLogSha256: sha(rawBytes),
      resultCounts: {
        failedSuites: 1,
        passedSuites: 1,
        totalSuites: 2,
        failedTests: 9,
        passedTests: 156,
        totalTests: 165,
      },
    };
    try {
      fs.writeFileSync(receipt, JSON.stringify(value), { flag: 'wx' });
      fs.chmodSync(receipt, 0o444);
      expectLibraryPass('RedReceipt', { path: receipt, sha256: sha(JSON.stringify(value)) });
      expect(expectLibraryPass('RedEvidenceBinding', {
        path: receipt,
        sha256: sha(JSON.stringify(value)),
      })).toEqual(expect.objectContaining({
        handleCount: 5,
        probeWriteBlocked: true,
        entrypointWriteBlocked: true,
        receiptBytesSha256: sha(JSON.stringify(value)),
      }));
      fs.symlinkSync(fixtureRoot, linkedParent, 'junction');
      expectLibraryReject(
        'RedReceipt',
        { path: path.join(linkedParent, 'receipt.json'), sha256: sha(JSON.stringify(value)) },
        'red_evidence_reparse_invalid',
      );

      const invalid = structuredClone(value);
      invalid.resultCounts.failedTests = 10;
      fs.writeFileSync(invalidReceipt, JSON.stringify(invalid), { flag: 'wx' });
      fs.chmodSync(invalidReceipt, 0o444);
      expectLibraryReject(
        'RedReceipt',
        { path: invalidReceipt, sha256: sha(JSON.stringify(invalid)) },
        'red_result_counts_invalid',
      );

      fs.chmodSync(snapshot, 0o666);
      fs.appendFileSync(snapshot, 'tampered\n');
      fs.chmodSync(snapshot, 0o444);
      expectLibraryReject(
        'RedReceipt',
        { path: receipt, sha256: sha(JSON.stringify(value)) },
        'red_vulnerable_runner_hash_invalid',
      );
    } finally {
      for (const artifact of [snapshot, raw, receipt, invalidReceipt]) {
        if (fs.existsSync(artifact)) fs.chmodSync(artifact, 0o666);
      }
      if (fs.existsSync(linkedParent)) fs.unlinkSync(linkedParent);
      removeFixture(linkedContainer);
      removeFixture(fixtureRoot);
    }
  });

  test.each([
    [['red.json', 'green.json', 'eslint.json', 'strictTs.json', 'gate-manifest.json'], true],
    [['nested/red.json', 'green.json', 'eslint.json', 'strictTs.json', 'gate-manifest.json'], false],
    [['red.json', 'green.json', 'eslint.json', 'strictTs.json', 'gate-manifest.json', 'extra.json'], false],
    [['red.json', 'red.json', 'green.json', 'eslint.json', 'strictTs.json'], false],
    [['red.json/', 'green.json', 'eslint.json', 'strictTs.json', 'gate-manifest.json'], false],
  ] as const)('pre-extraction ZIP FullName inspection is closed: %#', (fullNames, accepted) => {
    const payload = { fullNames: [...fullNames] };
    if (accepted) expectLibraryPass('GateArchiveNames', payload);
    else expectLibraryReject('GateArchiveNames', payload, 'gate_bundle_entries_invalid');
  });

  test.each(['archive', 'cleanup', 'readonly', 'reread'] as const)(
    'owned gate staging failure at %s leaves no final ZIP and removes only matching staging',
    (failAt) => {
      const gateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'account-sqlcipher-gate-stage-test-'));
      const finalPath = path.join(gateRoot, 'gate.zip');
      try {
        const result = expectLibraryPass('GateStaging', {
          root: gateRoot,
          finalPath,
          runId: '0123456789abcdef0123456789abcdef',
          failAt,
        });
        expect(result.published).toBe(false);
        expect(result.cleanupPassed).toBe(true);
        expect(fs.existsSync(finalPath)).toBe(false);
        expect(fs.readdirSync(gateRoot)).toEqual([]);
      } finally {
        removeFixture(gateRoot);
      }
    },
  );

  test('gate validation binds one owned ZIP byte copy and never reopens the external path for extraction', () => {
    const source = fs.readFileSync(runnerPath, 'utf8');
    expect(source).toContain('CopyTo(');
    expect(source).toContain('[IO.FileShare]::None');
    expect(source).toContain('gate_bundle_recursive_entries_invalid');
    expect(source).not.toContain('Expand-Archive -LiteralPath $Path');
  });

  test('normal focused gates fail closed when a runner override is inherited', () => {
    expectLibraryPass('FocusedEnvironment', {});
    const rejected = runLibrary('FocusedEnvironment', {}, {
      ACCOUNT_SQLCIPHER_RUNNER_OVERRIDE_PATH: path.join(os.tmpdir(), 'arbitrary-runner.ps1'),
    });
    expect(rejected.status).toBe(1);
    expect(rejected.stdout).toBe('');
    expect(rejected.stderr).toBe('runner_override_forbidden');
    const source = fs.readFileSync(runnerPath, 'utf8');
    expect(source).toMatch(/function Invoke-FocusedGateSet[\s\S]+Assert-NoRunnerOverride/u);
  });

  test('gate build copies the exact held receipt bytes and never reopens the receipt path', () => {
    const source = fs.readFileSync(runnerPath, 'utf8');
    expect(source).toContain("Write-DurableBytes (Join-Path $stage 'red.json') $redBinding.receiptBytes");
    expect(source).not.toContain('[IO.File]::Copy($RedReceiptPath');
    expect(source).toMatch(/Open-RedEvidenceBinding[\s\S]+Invoke-FocusedGateSet/u);
  });

  test('focused gates hold non-write-sharing handles for all five source files', () => {
    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'account-sqlcipher-source-lock-'));
    const file = path.join(fixtureRoot, 'bound.ts');
    fs.writeFileSync(file, 'bound-v1', { flag: 'wx' });
    try {
      const result = expectLibraryPass('SourceBinding', {
        root: fixtureRoot,
        relativePaths: ['bound.ts'],
      });
      expect(result.writeBlocked).toBe(true);
      expect(fs.readFileSync(file, 'utf8')).toBe('bound-v1');
      const source = fs.readFileSync(runnerPath, 'utf8');
      expect(source).toMatch(/Open-SourceBindings[\s\S]+Invoke-FocusedGateSet/u);
      expect(source).toContain('[IO.FileShare]::Read');
    } finally {
      removeFixture(fixtureRoot);
    }
  });

  test.each([
    ['extra red field', () => {
      const payload = gateArchivePayload();
      const entries = payload.entries as Record<string, string>;
      const red = JSON.parse(entries['red.json']) as Record<string, unknown>;
      red.extra = true;
      entries['red.json'] = JSON.stringify(red);
      return payload;
    }, 'red_record_schema_invalid'],
    ['wrong current packet hash', () => {
      const payload = gateArchivePayload();
      ((payload.expected as Record<string, unknown>).allowlistedFileHashes as Record<string, string>)[
        'runtime-probes/android-account-sqlcipher/probe.ts'
      ] = sha('different');
      return payload;
    }, 'gate_packet_hash_mismatch'],
    ['wrong packet spec binding', () => {
      const payload = gateArchivePayload();
      (payload.expected as Record<string, unknown>).packetSpecSha256 = sha('different-packet');
      return payload;
    }, 'gate_packet_spec_mismatch'],
    ['wrong current native hash', () => {
      const payload = gateArchivePayload();
      ((payload.expected as Record<string, unknown>).nativeInputHashes as Record<string, string>).localApk = sha('different');
      return payload;
    }, 'gate_native_hash_mismatch'],
  ] as const)('gate validation rejects %s', (_label, createPayload, code) => {
    expectLibraryReject('GateRecords', createPayload(), code);
  });

  test('phase validator accepts exact evidence and returns normalized non-PASS facts', () => {
    const result = expectLibraryPass('PhaseFacts', phasePayload());
    expect(result).toEqual(expect.objectContaining({
      status: 'pass',
      validation: 'phase_facts_valid',
      phaseCount: 4,
    }));
    expect(JSON.stringify(result)).not.toContain('account_sqlcipher_android_proof_pass');
  });

  test.each([
    ['extra field', (payload: Record<string, unknown>) => {
      ((payload.phases as Record<string, unknown>[])[0]).extra = true;
    }, 'phase_schema_invalid'],
    ['runId mismatch', (payload: Record<string, unknown>) => {
      ((payload.phases as Record<string, unknown>[])[1]).runId = 'ffffffffffffffffffffffffffffffff';
    }, 'phase_run_id_invalid'],
    ['duplicate log path', (payload: Record<string, unknown>) => {
      ((payload.phases as Record<string, unknown>[])[1]).logArtifactRelativePath = 'phases/prepare.json';
    }, 'phase_log_path_duplicate'],
    ['duplicate canonical hash', (payload: Record<string, unknown>) => {
      ((payload.phases as Record<string, unknown>[])[3]).logSha256 = ((payload.phases as Record<string, unknown>[])[1]).logSha256;
    }, 'phase_log_hash_duplicate'],
    ['stale timestamp', (payload: Record<string, unknown>) => {
      ((payload.phases as Record<string, unknown>[])[2]).capturedUtc = '2026-09-27T11:00:00.000Z';
    }, 'phase_time_invalid'],
    ['wrong marker', (payload: Record<string, unknown>) => {
      ((payload.phases as Record<string, unknown>[])[2]).expectedMarker = 'account_sqlcipher_android_verify_pass';
    }, 'phase_marker_invalid'],
    ['late source drift', (payload: Record<string, unknown>) => {
      (((payload.phases as Record<string, unknown>[])[3]).sourceAfter as Record<string, unknown>)
        .fingerprintSha256 = sha('late-source-drift');
    }, 'phase_source_continuity_invalid'],
    ['out-of-order APK command', (payload: Record<string, unknown>) => {
      const apk = ((payload.phases as Record<string, unknown>[])[1]).apkObservations as Record<string, Record<string, unknown>>;
      apk.afterPid.pmPathCommandSequence = 99;
    }, 'installed_apk_continuity_invalid'],
  ] as const)('phase validator rejects %s', (_label, mutate, code) => {
    const payload = phasePayload();
    mutate(payload);
    expectLibraryReject('PhaseFacts', payload, code);
  });

  test('PID-bound reducer rejects foreign PID, stale marker, and duplicate marker', () => {
    const base = {
      runId: '0123456789abcdef0123456789abcdef',
      label: 'prepare',
      mode: 'prepare',
      pid: 1234,
      starttime: '9000',
      launchedUtc: '2026-09-27T12:00:00.000Z',
      capturedUtc: '2026-09-27T12:00:05.000Z',
      expectedMarker: 'account_sqlcipher_android_prepare_pass',
      lines: [{ pid: 1234, utc: '2026-09-27T12:00:02.000Z', token: 'account_sqlcipher_android_prepare_pass' }],
    };
    const pass = expectLibraryPass('ReducePhaseLog', base);
    expect(pass.canonicalSha256).toMatch(/^[0-9a-f]{64}$/u);
    expectLibraryReject('ReducePhaseLog', { ...base, lines: [{ ...base.lines[0], pid: 9999 }] }, 'phase_log_pid_invalid');
    expectLibraryReject('ReducePhaseLog', { ...base, lines: [{ ...base.lines[0], utc: '2026-09-27T11:59:59.000Z' }] }, 'phase_log_time_invalid');
    expectLibraryReject('ReducePhaseLog', { ...base, lines: [base.lines[0], base.lines[0]] }, 'phase_log_marker_count_invalid');
  });

  test('canonical phase hash binds run/process/times/marker so repeated verify phases differ', () => {
    const common = {
      runId: '0123456789abcdef0123456789abcdef',
      mode: 'verify',
      launchedUtc: '2026-09-27T12:00:00.000Z',
      capturedUtc: '2026-09-27T12:00:05.000Z',
      expectedMarker: 'account_sqlcipher_android_verify_pass',
    };
    const before = expectLibraryPass('ReducePhaseLog', {
      ...common,
      label: 'verify-before', pid: 1234, starttime: '9001',
      lines: [{ pid: 1234, utc: '2026-09-27T12:00:02.000Z', token: common.expectedMarker }],
    });
    const after = expectLibraryPass('ReducePhaseLog', {
      ...common,
      label: 'verify-after', pid: 1235, starttime: '9002',
      lines: [{ pid: 1235, utc: '2026-09-27T12:00:03.000Z', token: common.expectedMarker }],
    });
    expect(before.canonicalSha256).not.toBe(after.canonicalSha256);
  });

  test('snapshot parser preserves SHA match independently from size parsing and exact path', () => {
    const dbSha = sha('database');
    const pass = expectLibraryPass('Snapshot', {
      databaseRelativePath,
      shaLines: [`${dbSha}  ${databaseRelativePath}`],
      sizeLines: ['4096'],
    });
    expect(pass).toEqual(expect.objectContaining({ sha256: dbSha, size: 4096 }));
    expectLibraryReject('Snapshot', {
      databaseRelativePath,
      shaLines: [`${dbSha}  wrong.db`],
      sizeLines: ['4096'],
    }, 'database_snapshot_hash_invalid');
    expectLibraryReject('Snapshot', {
      databaseRelativePath,
      shaLines: [`${dbSha}  ${databaseRelativePath}`, `${dbSha}  ${databaseRelativePath}`],
      sizeLines: ['4096'],
    }, 'database_snapshot_hash_invalid');
  });

  test('aggregate validator rejects byte mutation at the same size and malformed evidence', () => {
    expectLibraryPass('Aggregate', manifestPayload());
    const changed = manifestPayload();
    (changed.afterWrongKey as Record<string, unknown>).sha256 = sha('mutated-database');
    expectLibraryReject('Aggregate', changed, 'aggregate_snapshot_invalid');
    const extra = manifestPayload();
    extra.extra = true;
    expectLibraryReject('Aggregate', extra, 'manifest_schema_invalid');
    const lateSourceDrift = manifestPayload();
    (lateSourceDrift.finalSourceObservation as Record<string, unknown>).fingerprintSha256 = sha('late-drift');
    expectLibraryReject('Aggregate', lateSourceDrift, 'aggregate_source_continuity_invalid');
  });

  test.each([
    [{ safe: true }, true],
    [{ message: 'private' }, false],
    [{ nested: { stdout: 'raw' } }, false],
    [{ path: 'C:\\private\\file' }, false],
    [{ path: '\\\\server\\share\\file' }, false],
    [{ path: '/data/user/0/private' }, false],
    [{ token: 'account_sqlcipher_probe_failed' }, false],
  ] as const)('evidence sanitizer enforces closed safe content %#', (artifact, accepted) => {
    if (accepted) expectLibraryPass('Sanitize', artifact);
    else expectLibraryReject('Sanitize', artifact, 'sanitizer_rejected');
  });

  test('APK ABI validator requires a real lib/x86_64 shared-library entry', () => {
    expectLibraryPass('ApkAbi', { entries: ['lib/x86_64/libsqlcipher.so', 'AndroidManifest.xml'] });
    expectLibraryReject('ApkAbi', { entries: ['assets/metadata-x86_64.txt', 'AndroidManifest.xml'] }, 'local_apk_x86_64_missing');
  });

  test('mutex model is zero-touch when busy and treats abandoned acquisition as ownership', () => {
    const busy = expectLibraryPass('MutexModel', { outcome: 'busy' });
    expect(busy.events).toEqual(['mutex:create', 'mutex:wait', 'mutex:dispose']);
    const abandoned = expectLibraryPass('MutexModel', { outcome: 'abandoned' });
    expect(abandoned.events).toEqual([
      'mutex:create', 'mutex:wait', 'recovery', 'work', 'restore', 'journal-cleanup',
      'finalize', 'mutex:release', 'mutex:dispose', 'aggregate',
    ]);
  });

  test('owned Metro process startup and cleanup reject early exit, PID reuse, and executable replacement', () => {
    const identity = {
      startedPid: 4321,
      startedUtc: '2026-09-27T12:00:00.000Z',
      executablePath: 'C:/Program Files/nodejs/node.exe',
      hasExited: false,
      currentPid: 4321,
      currentStartedUtc: '2026-09-27T12:00:00.000Z',
      currentExecutablePath: 'C:/Program Files/nodejs/node.exe',
    };
    expect(expectLibraryPass('MetroOwnership', identity)).toEqual(expect.objectContaining({
      startupAccepted: true,
      stopAttempted: true,
    }));
    expect(expectLibraryPass('MetroOwnership', { ...identity, hasExited: true })).toEqual(expect.objectContaining({
      startupAccepted: false,
      stopAttempted: false,
    }));
    expect(expectLibraryPass('MetroOwnership', {
      ...identity,
      currentStartedUtc: '2026-09-27T12:00:01.000Z',
    })).toEqual(expect.objectContaining({ cleanupAccepted: false, stopAttempted: false }));
    expect(expectLibraryPass('MetroOwnership', {
      ...identity,
      currentExecutablePath: 'C:/malicious/node.exe',
    })).toEqual(expect.objectContaining({ cleanupAccepted: false, stopAttempted: false }));
  });

  test('cleanup model attempts every independent step and suppresses aggregate on any failure', () => {
    const result = expectLibraryPass('CleanupModel', { failures: ['package-restore', 'apk-recheck'] });
    expect(result.attempted).toEqual([
      'app-stop', 'metro-stop', 'package-restore', 'journal-cleanup', 'apk-recheck',
      'content-check', 'temp-delete', 'evidence-finalize',
    ]);
    expect(result.cleanupPassed).toBe(false);
    expect(result.aggregateEmitted).toBe(false);
  });

  test.each([
    ['prepared/current-original', 'prepared', 'original'],
    ['prepared/current-dev', 'prepared', 'dev'],
    ['mutated/current-dev', 'mutated', 'dev'],
    ['restoring/current-dev', 'restoring', 'dev'],
    ['restoring/current-original', 'restoring', 'original'],
  ] as const)(
    'real recovery is idempotent for %s and removes every fixed recovery artifact',
    (_description, stage, current) => {
      const fixture = createRecoveryFixture();
      try {
        writeRecoveryJournal(fixture, stage);
        if (current === 'dev') fs.writeFileSync(fixture.packagePath, fixture.devBytes);
        if (stage === 'prepared' && current === 'original') {
          fs.writeFileSync(fixture.devTempPath, fixture.devBytes, { flag: 'wx' });
        }
        if (stage === 'restoring') {
          fs.writeFileSync(fixture.restoreTempPath, fixture.originalBytes, { flag: 'wx' });
        }
        expectLibraryPass('Recovery', recoveryPayload(fixture));
        expect(fs.readFileSync(fixture.packagePath)).toEqual(fixture.originalBytes);
        for (const artifact of [
          fixture.recoveryPath,
          fixture.journalTempPath,
          fixture.backupPath,
          fixture.devTempPath,
          fixture.restoreTempPath,
        ]) expect(fs.existsSync(artifact)).toBe(false);
      } finally {
        removeFixture(fixture.root);
      }
    },
  );

  test('valid orphan journal.tmp is promoted and recovered, while invalid journal.tmp is preserved', () => {
    const valid = createRecoveryFixture();
    try {
      writeRecoveryJournal(valid, 'prepared', valid.originalBytes, 'temp');
      expectLibraryPass('Recovery', recoveryPayload(valid));
      for (const artifact of [
        valid.recoveryPath,
        valid.journalTempPath,
        valid.backupPath,
        valid.devTempPath,
        valid.restoreTempPath,
      ]) expect(fs.existsSync(artifact)).toBe(false);
    } finally {
      removeFixture(valid.root);
    }

    const invalid = createRecoveryFixture();
    try {
      fs.writeFileSync(invalid.backupPath, invalid.originalBytes, { flag: 'wx' });
      fs.writeFileSync(invalid.journalTempPath, '{"stage":"prepared"}', { flag: 'wx' });
      expectLibraryReject('Recovery', recoveryPayload(invalid), 'package_recovery_schema_invalid');
      expect(fs.existsSync(invalid.backupPath)).toBe(true);
      expect(fs.existsSync(invalid.journalTempPath)).toBe(true);
    } finally {
      removeFixture(invalid.root);
    }
  });

  test('recovery exhaustively accepts only the packet table cross-product using real package artifacts', () => {
    const matrixRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'account-sqlcipher-recovery-matrix-'));
    try {
      const result = expectLibraryPass('RecoveryMatrix', { root: matrixRoot });
      expect(result).toEqual(expect.objectContaining({
        total: 729,
        accepted: 16,
        rejected: 713,
        repeatAccepted: 16,
        preserveChecks: 713,
      }));
      expect(fs.readdirSync(matrixRoot)).toEqual([]);
    } finally {
      removeFixture(matrixRoot);
    }
  });

  test('startup recovery stops and preserves orphan backup, fixed temps, journal temp, and GUID temps', () => {
    const fixture = createRecoveryFixture();
    try {
      const guidTemp = `${fixture.packagePath}.account-sqlcipher-dev.0123456789abcdef0123456789abcdef.tmp`;
      fs.writeFileSync(fixture.backupPath, fixture.originalBytes, { flag: 'wx' });
      fs.writeFileSync(fixture.devTempPath, fixture.originalBytes, { flag: 'wx' });
      fs.writeFileSync(fixture.restoreTempPath, fixture.originalBytes, { flag: 'wx' });
      fs.writeFileSync(fixture.journalTempPath, '{}', { flag: 'wx' });
      fs.writeFileSync(guidTemp, fixture.originalBytes, { flag: 'wx' });
      expectLibraryReject(
        'Recovery',
        recoveryPayload(fixture),
        'package_recovery_orphan_artifact',
      );
      for (const artifact of [
        fixture.backupPath,
        fixture.devTempPath,
        fixture.restoreTempPath,
        fixture.journalTempPath,
        guidTemp,
      ]) expect(fs.existsSync(artifact)).toBe(true);
      expect(fs.readFileSync(fixture.packagePath)).toEqual(fixture.originalBytes);
    } finally {
      removeFixture(fixture.root);
    }
  });

  test('clean no-journal recovery rejects dev-main without touching package bytes', () => {
    const fixture = createRecoveryFixture();
    try {
      fs.writeFileSync(fixture.packagePath, fixture.devBytes);
      const before = fs.readFileSync(fixture.packagePath);
      expectLibraryReject('Recovery', recoveryPayload(fixture), 'package_recovery_unclean_package');
      expect(fs.readFileSync(fixture.packagePath)).toEqual(before);
      expect(fs.readdirSync(fixture.root)).toEqual(['package.json']);
    } finally {
      removeFixture(fixture.root);
    }
  });

  test.each([
    ['missing backup', false, false, 'package_recovery_backup_missing'],
    ['corrupt backup', true, true, 'package_recovery_value_invalid'],
    ['unexpected live hash', true, false, 'package_recovery_current_hash_unexpected'],
  ] as const)(
    'real recovery fails closed for %s without overwriting live package',
    (_description, writeBackup, corruptBackup, expectedCode) => {
      const fixture = createRecoveryFixture();
      try {
        if (writeBackup) writeRecoveryJournal(
          fixture,
          'mutated',
          corruptBackup ? Buffer.from('corrupt', 'utf8') : fixture.originalBytes,
        );
        else {
          writeRecoveryJournal(fixture, 'mutated');
          fs.unlinkSync(fixture.backupPath);
        }
        const unexpected = Buffer.from('{"name":"concurrent"}\n', 'utf8');
        if (expectedCode === 'package_recovery_current_hash_unexpected') {
          fs.writeFileSync(fixture.packagePath, unexpected);
        } else {
          fs.writeFileSync(fixture.packagePath, fixture.devBytes);
        }
        const before = fs.readFileSync(fixture.packagePath);
        expectLibraryReject('Recovery', recoveryPayload(fixture), expectedCode);
        expect(fs.readFileSync(fixture.packagePath)).toEqual(before);
        expect(fs.existsSync(fixture.recoveryPath)).toBe(true);
      } finally {
        removeFixture(fixture.root);
      }
    },
  );

  test('package mutation hashes captured bytes and refuses a concurrent live change before replacement', () => {
    const fixture = createRecoveryFixture();
    try {
      expectLibraryReject('PackageMutation', {
        ...recoveryPayload(fixture),
        head: '54b3b90e670ba96b371528463819a147ce236766',
        injectConcurrentChange: true,
        injectConcurrentAfterCheck: false,
      }, 'package_mutation_concurrent_change');
      expect(fs.readFileSync(fixture.packagePath, 'utf8')).toBe('{"name":"concurrent-change"}\n');
      expect(fs.readFileSync(fixture.backupPath)).toEqual(fixture.originalBytes);
      expect(fs.existsSync(fixture.recoveryPath)).toBe(true);
      expect(fs.existsSync(fixture.devTempPath)).toBe(true);
    } finally {
      removeFixture(fixture.root);
    }
  });

  test('package mutation CAS restores content displaced after the final pre-check and preserves recovery artifacts', () => {
    const fixture = createRecoveryFixture();
    try {
      expectLibraryReject('PackageMutation', {
        ...recoveryPayload(fixture),
        head: '54b3b90e670ba96b371528463819a147ce236766',
        injectConcurrentChange: false,
        injectConcurrentAfterCheck: true,
      }, 'package_mutation_concurrent_change');
      expect(fs.readFileSync(fixture.packagePath, 'utf8')).toBe('{"name":"concurrent-after-check"}\n');
      expect(fs.readFileSync(fixture.backupPath)).toEqual(fixture.originalBytes);
      expect(fs.existsSync(fixture.recoveryPath)).toBe(true);
      expect(fs.existsSync(fixture.devTempPath)).toBe(true);
    } finally {
      removeFixture(fixture.root);
    }
  });

  test('package restore CAS restores content displaced after validation and preserves recovery artifacts', () => {
    const fixture = createRecoveryFixture();
    try {
      writeRecoveryJournal(fixture, 'restoring');
      fs.writeFileSync(fixture.packagePath, fixture.devBytes);
      expectLibraryReject('RecoveryRace', {
        ...recoveryPayload(fixture),
        injectConcurrentRestoreAfterCheck: true,
      }, 'package_restore_concurrent_change');
      expect(fs.readFileSync(fixture.packagePath, 'utf8')).toBe('{"name":"restore-concurrent-after-check"}\n');
      expect(fs.existsSync(fixture.recoveryPath)).toBe(true);
      expect(fs.existsSync(fixture.backupPath)).toBe(true);
      expect(fs.existsSync(fixture.restoreTempPath)).toBe(true);
    } finally {
      removeFixture(fixture.root);
    }
  });

  test('package transform changes only top-level main and emits deterministic UTF-8 without BOM', () => {
    const original = Buffer.from(
      '{"scripts":{"test":"jest"},"name":"fixture","nested":{"main":"keep","z":2,"a":1},"main":"index.js","dependencies":{"b":"2","a":"1"}}\n',
      'utf8',
    );
    const result = expectLibraryPass('PackageTransform', { originalBase64: original.toString('base64') });
    const transformed = Buffer.from(result.transformedBase64 as string, 'base64');
    expect(transformed.subarray(0, 3)).not.toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
    expect(transformed.toString('utf8')).toBe(
      '{\n  "dependencies": {\n    "a": "1",\n    "b": "2"\n  },\n  "main": "runtime-probes/android-account-sqlcipher/index.js",\n  "name": "fixture",\n  "nested": {\n    "a": 1,\n    "main": "keep",\n    "z": 2\n  },\n  "scripts": {\n    "test": "jest"\n  }\n}\n',
    );
    expect(result.changedPaths).toEqual(['main']);
    expectLibraryPass('PackageTransformValidation', {
      originalBase64: original.toString('base64'),
      candidateBase64: transformed.toString('base64'),
    });
    const mutated = JSON.parse(transformed.toString('utf8')) as Record<string, unknown>;
    (mutated.scripts as Record<string, unknown>).test = 'changed';
    expectLibraryReject('PackageTransformValidation', {
      originalBase64: original.toString('base64'),
      candidateBase64: Buffer.from(`${JSON.stringify(mutated)}\n`, 'utf8').toString('base64'),
    }, 'package_transform_invalid');
    for (const invalid of [
      { name: 'fixture' },
      { name: 'fixture', main: './index.js' },
    ]) expectLibraryReject('PackageTransform', {
      originalBase64: Buffer.from(`${JSON.stringify(invalid)}\n`, 'utf8').toString('base64'),
    }, 'package_transform_invalid');
  });

  test('package transform recursively uses ordinal key ordering independent of current culture', () => {
    const original = Buffer.from(
      '{"main":"index.js","lesson33":3,"lesson":2,"^react-native-purchases":1,"nested":{"lesson33":3,"lesson":2,"^react-native":1}}\n',
      'utf8',
    );
    const result = expectLibraryPass('PackageTransform', { originalBase64: original.toString('base64') });
    const transformed = Buffer.from(result.transformedBase64 as string, 'base64').toString('utf8');
    expect(transformed).toBe(
      '{\n  "^react-native-purchases": 1,\n  "lesson": 2,\n  "lesson33": 3,\n  "main": "runtime-probes/android-account-sqlcipher/index.js",\n  "nested": {\n    "^react-native": 1,\n    "lesson": 2,\n    "lesson33": 3\n  }\n}\n',
    );
  });

  test.each(['preflight', 'gate', 'apk', 'emulator', 'sanitizer', 'persist'] as const)(
    'outer lifecycle failure at %s deletes raw staging and publishes no partial evidence',
    (failAt) => {
      const harnessRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'account-sqlcipher-lifecycle-test-'));
      const evidence = path.join(harnessRoot, 'published-evidence');
      try {
        const result = expectLibraryPass('DeviceLifecycle', { root: harnessRoot, evidence, failAt });
        expect(result.cleanupFailures).toEqual([]);
        expect(result.published).toBe(false);
        expect(result.aggregateEmitted).toBe(false);
        expect(result.attempted).toEqual([
          'app-stop', 'metro-stop', 'package-restore', 'journal-cleanup', 'apk-recheck',
          'content-check', 'emulator-check', 'raw-delete', 'staging-delete', 'evidence-finalize',
        ]);
        expect(fs.existsSync(evidence)).toBe(false);
        expect(fs.readdirSync(harnessRoot)).toEqual([]);
      } finally {
        removeFixture(harnessRoot);
      }
    },
  );

  test('owned temp deletion failure happens before manifest/publish and cannot claim tempDeleted', () => {
    const harnessRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'account-sqlcipher-temp-delete-test-'));
    const evidence = path.join(harnessRoot, 'published-evidence');
    try {
      const result = expectLibraryPass('DeviceLifecycle', {
        root: harnessRoot,
        evidence,
        failAt: 'temp-delete',
      });
      expect(result.tempDeleted).toBe(false);
      expect(result.published).toBe(false);
      expect(result.aggregateEmitted).toBe(false);
      expect(result.cleanupFailures).toContain('temp_delete_failed');
      expect(fs.existsSync(evidence)).toBe(false);
    } finally {
      removeFixture(harnessRoot);
    }
  });

  test('evidence ownership refuses existing/outside/root targets and never deletes caller paths', () => {
    const authorizedRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'account-sqlcipher-evidence-root-'));
    const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'account-sqlcipher-evidence-outside-'));
    const existing = path.join(authorizedRoot, 'existing-target');
    const outside = path.join(outsideRoot, 'outside-target');
    fs.mkdirSync(existing);
    fs.writeFileSync(path.join(existing, 'caller.txt'), 'preserve', { flag: 'wx' });
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, 'caller.txt'), 'preserve', { flag: 'wx' });
    try {
      for (const target of [existing, outside, authorizedRoot, root, os.homedir()]) {
        expectLibraryReject('EvidenceOwnership', {
          authorizedRoot,
          target,
          runId: '0123456789abcdef0123456789abcdef',
          operation: 'validate',
        }, 'evidence_target_invalid');
      }
      expect(fs.readFileSync(path.join(existing, 'caller.txt'), 'utf8')).toBe('preserve');
      expect(fs.readFileSync(path.join(outside, 'caller.txt'), 'utf8')).toBe('preserve');

      const target = path.join(authorizedRoot, 'new-target');
      const staging = path.join(authorizedRoot, '.account-sqlcipher-stage-0123456789abcdef0123456789abcdef');
      const created = expectLibraryPass('EvidenceOwnership', {
        authorizedRoot,
        target,
        runId: '0123456789abcdef0123456789abcdef',
        operation: 'create-staging',
      });
      expect(created.ownerMatched).toBe(true);
      expectLibraryPass('EvidenceOwnership', {
        authorizedRoot,
        target,
        runId: '0123456789abcdef0123456789abcdef',
        operation: 'publish',
      });
      expect(fs.existsSync(target)).toBe(true);
      expect(fs.existsSync(staging)).toBe(false);
    } finally {
      removeFixture(authorizedRoot);
      removeFixture(outsideRoot);
    }
  });

  test('library mode exposes no caller-supplied recursive staging cleanup surface', () => {
    const authorizedRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'account-sqlcipher-owner-test-'));
    const target = path.join(authorizedRoot, 'target');
    const staging = path.join(authorizedRoot, '.account-sqlcipher-stage-0123456789abcdef0123456789abcdef');
    fs.mkdirSync(staging);
    fs.writeFileSync(path.join(staging, '.owner.json'), JSON.stringify({
      schemaVersion: 1,
      runId: 'ffffffffffffffffffffffffffffffff',
      targetName: 'target',
    }), { flag: 'wx' });
    try {
      expectLibraryReject('EvidenceOwnership', {
        authorizedRoot,
        target,
        runId: '0123456789abcdef0123456789abcdef',
        operation: 'cleanup',
      }, 'evidence_target_invalid');
      expect(fs.existsSync(staging)).toBe(true);
    } finally {
      removeFixture(authorizedRoot);
    }
  });

  test('owned staging rejects a reparse-point identity and preserves its external target', () => {
    const authorizedRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'account-sqlcipher-reparse-root-'));
    const externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'account-sqlcipher-reparse-external-'));
    const target = path.join(authorizedRoot, 'target');
    const runId = '0123456789abcdef0123456789abcdef';
    const staging = path.join(authorizedRoot, `.account-sqlcipher-stage-${runId}`);
    fs.writeFileSync(path.join(externalRoot, 'sentinel.txt'), 'preserve', { flag: 'wx' });
    fs.writeFileSync(path.join(externalRoot, '.owner.json'), JSON.stringify({
      schemaVersion: 1,
      runId,
      targetName: 'target',
    }), { flag: 'wx' });
    fs.symlinkSync(externalRoot, staging, 'junction');
    try {
      expectLibraryReject('EvidenceOwnership', {
        authorizedRoot,
        target,
        runId,
        operation: 'publish',
      }, 'evidence_owner_invalid');
      expect(fs.readFileSync(path.join(externalRoot, 'sentinel.txt'), 'utf8')).toBe('preserve');
      expect(fs.existsSync(staging)).toBe(true);
    } finally {
      removeFixture(authorizedRoot);
      removeFixture(externalRoot);
    }
  });

  test('live gate preflight rejects a forged self-consistent PASS bundle when a rerun fails', () => {
    expectLibraryReject('LiveGatePreflight', {
      bundle: focusedGateFacts(),
      live: focusedGateFacts('green'),
    }, 'live_gate_failed');
    expectLibraryPass('LiveGatePreflight', {
      bundle: focusedGateFacts(),
      live: focusedGateFacts(),
    });
  });

  test('APK continuity rejects a swap/restore between phases and a replacement within a phase', () => {
    const observations = (phaseRecord(0).apkObservations as Record<string, unknown>);
    expectLibraryPass('ApkContinuity', { approvedApkSha256, approvedApkPathSha256, observations });
    for (const checkpoint of ['afterPid', 'afterMarker'] as const) {
      const changed = structuredClone(observations) as Record<string, Record<string, unknown>>;
      changed[checkpoint].sha256 = sha(`replacement-${checkpoint}`);
      expectLibraryReject('ApkContinuity', {
        approvedApkSha256,
        approvedApkPathSha256,
        observations: changed,
      }, 'installed_apk_continuity_invalid');
    }
  });

  test('phase facts require 16 fresh APK observations and exactly 32 ordered native commands', () => {
    const payload = phasePayload();
    expectLibraryPass('PhaseFacts', payload);
    const observations = (payload.phases as Record<string, unknown>[]).flatMap((phase) =>
      Object.values(phase.apkObservations as Record<string, Record<string, unknown>>));
    expect(observations).toHaveLength(16);
    expect(observations.flatMap((value) => [
      value.pmPathCommandSequence,
      value.sha256CommandSequence,
    ])).toEqual(Array.from({ length: 32 }, (_value, index) => index + 1));
    expect(new Set(observations.map((value) => value.observedUtc)).size).toBe(16);

    const cached = phasePayload();
    const cachedPhases = cached.phases as Record<string, unknown>[];
    const first = (cachedPhases[0].apkObservations as Record<string, Record<string, unknown>>).beforeLaunch;
    (cachedPhases[1].apkObservations as Record<string, Record<string, unknown>>).beforeLaunch.observedUtc = first.observedUtc;
    expectLibraryReject('PhaseFacts', cached, 'installed_apk_continuity_invalid');
  });

  test('phase and aggregate validation require four exact APK continuity observations', () => {
    const phase = phasePayload();
    expectLibraryPass('PhaseFacts', phase);
    ((((phase.phases as Record<string, unknown>[])[2]).apkObservations as Record<string, Record<string, unknown>>)
      .afterPid).baseApkPathSha256 = sha('swapped-path');
    expectLibraryReject('PhaseFacts', phase, 'installed_apk_continuity_invalid');

    const aggregate = manifestPayload();
    delete ((((aggregate.phases as Record<string, unknown>[])[0]).apkObservations as Record<string, unknown>)).final;
    expectLibraryReject('Aggregate', aggregate, 'installed_apk_continuity_invalid');
  });

  test('aggregate requires a fresh cleanup APK observation at commands 33/34', () => {
    const aggregate = manifestPayload();
    expectLibraryPass('Aggregate', aggregate);
    const cached = manifestPayload();
    (cached.cleanupApkObservation as Record<string, unknown>).observedUtc =
      ((((cached.phases as Record<string, unknown>[])[3]).apkObservations as Record<string, Record<string, unknown>>).final).observedUtc;
    expectLibraryReject('Aggregate', cached, 'installed_apk_continuity_invalid');
    const wrongSequence = manifestPayload();
    (wrongSequence.cleanupApkObservation as Record<string, unknown>).pmPathCommandSequence = 31;
    expectLibraryReject('Aggregate', wrongSequence, 'installed_apk_continuity_invalid');
  });

  test('baseline validator requires immutable read-only artifact and exact schema/hash', () => {
    const baseline = path.join(
      os.homedir(),
      'Documents/Codex/2026-09-22/new-chat/outputs/ACCOUNT_ANDROID_SQLCIPHER_PREEDIT_BASELINE.json',
    );
    expectLibraryPass('Baseline', {
      path: baseline,
      sha256: '7cb127c1c6749eca8865816cebe8f0d45f2beb717629f706b8405eb202c2439a',
    });
  });

  test('packet validator requires the immutable exact vNext packet binding', () => {
    const packet = path.join(
      os.homedir(),
      'Documents/Codex/2026-09-22/new-chat/outputs/ACCOUNT_ANDROID_SQLCIPHER_PROOF_PACKET.md',
    );
    expectLibraryPass('Packet', { path: packet, sha256: packetSpecSha256 });
    expectLibraryReject('Packet', { path: packet, sha256: sha('wrong-packet') }, 'packet_hash_invalid');
    const packetSource = fs.readFileSync(packet, 'utf8');
    expect(packetSource).toContain('[IO.FileShare]::Read');
    expect(packetSource).toContain('ACCOUNT_ANDROID_SQLCIPHER_P1_BUILD_LAUNCH_CANONICAL.ps1');
    expect(packetSource).toContain('ACCOUNT_ANDROID_SQLCIPHER_P1_DEVICE_LAUNCH_CANONICAL.ps1');
    expect(packetSource).not.toContain('$redSha=(Get-FileHash');
    expect(packetSource).not.toContain('$gateSha=(Get-FileHash');
  });

  test('device source binds logcat to the exact PID, re-reads durable recovery, and rechecks APK in cleanup', () => {
    const source = fs.readFileSync(runnerPath, 'utf8');
    expect(source).toContain("'--pid='");
    expect(source).toContain('Read-PackageRecovery');
    expect(source).toContain('ACCOUNT_ANDROID_SQLCIPHER_PACKAGE_RECOVERY.json');
    expect(source).toContain('Invoke-FocusedGateSet');
    expect(source).toContain('Assert-ApkContinuity');
    expect(source.match(/Get-InstalledApkObservation/gu)?.length).toBeGreaterThanOrEqual(4);
    expect(source).toContain('.Flush($true)');
    expect(source).toContain('Start-OwnedProcessChecked');
    expect(source).toContain('Stop-OwnedProcessChecked');
    expect(source.match(/Start-Process/gu)).toHaveLength(1);
    expect(source).toContain('packetSpecSha256');
    expect(source).toContain('sourceFingerprintSha256');
  });
});
