import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const REPOSITORY_ROOT = path.resolve(process.env.ACCOUNT_PROVISION_LOCK_REPO_ROOT ?? ROOT);
const ENTRYPOINT = path.join(ROOT, 'runtime-probes/android-account-provision-lock/index.js');
const RUNNER = path.join(ROOT, 'runtime-probes/android-account-provision-lock/run-proof.ps1');
const LAUNCHER = 'C:\\Users\\badlo\\Documents\\Codex\\2026-09-22\\new-chat\\outputs\\ACCOUNT_ANDROID_PROVISION_LOCK_REVIEWED_LAUNCH.ps1';
const FIXTURE_ROOT = path.join(ROOT, 'runtime-probes/android-account-provision-lock/android');
const MANIFEST = path.join(FIXTURE_ROOT, 'AndroidManifest.fragment.xml');
const ACTIVITY = path.join(
  FIXTURE_ROOT,
  'AccountV2ProbeActivity.kt',
);
const TRACKED_MANIFEST = path.join(
  REPOSITORY_ROOT,
  'runtime-probes/android-account-provision-lock/android/AndroidManifest.fragment.xml',
);
const TRACKED_ACTIVITY = path.join(
  REPOSITORY_ROOT,
  'runtime-probes/android-account-provision-lock/android/AccountV2ProbeActivity.kt',
);
const GENERATED_MANIFEST = path.join(REPOSITORY_ROOT, 'android/app/src/debug/AndroidManifest.xml');
const GENERATED_ACTIVITY = path.join(
  REPOSITORY_ROOT,
  'android/app/src/debug/java/app/phraseman/AccountV2ProbeActivity.kt',
);
const SEVEN_PATHS = [
  'runtime-probes/android-account-provision-lock/android/AccountV2ProbeActivity.kt',
  'runtime-probes/android-account-provision-lock/android/AndroidManifest.fragment.xml',
  'runtime-probes/android-account-provision-lock/probe.ts',
  'runtime-probes/android-account-provision-lock/index.js',
  'runtime-probes/android-account-provision-lock/run-proof.ps1',
  'tests/account_provision_lock_android_runtime_probe.test.ts',
  'tests/account_provision_lock_android_runtime_entrypoint.test.ts',
] as const;
const CRITICAL_INPUTS = [
  'patches/expo-sqlite+16.0.10.patch',
  'package-lock.json',
  'app.json',
  'app.config.js',
] as const;
const ACTIVATED_NATIVE_INPUTS = [
  'node_modules/expo-sqlite/android/src/main/java/expo/modules/sqlite/SQLiteModule.kt',
  'node_modules/expo-sqlite/package.json',
] as const;

const vulnerableSources: Readonly<Record<string, string>> = Object.freeze({
  [ENTRYPOINT]: "console.log(error); setTimeout(() => cancelAcquire(), 1000);\n",
  [RUNNER]: "$events = @(); Write-Output 'PASS'\n",
  [MANIFEST]: '<activity android:name=".AccountV2ProbeActivity" android:exported="true" />',
  [ACTIVITY]: 'class AccountV2ProbeActivity : ReactActivity()\n',
});

function source(file: string): string {
  if (process.env.ACCOUNT_PROVISION_LOCK_VULNERABLE === '1') return vulnerableSources[file] ?? '';
  if (!fs.existsSync(file)) throw new Error('account_provision_lock_source_missing');
  return fs.readFileSync(file, 'utf8');
}

function runLibrary(kind: string, payload: unknown): ReturnType<typeof spawnSync> {
  return spawnSync('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', RUNNER,
    '-LibraryMode',
    '-ValidationKind', kind,
    '-ValidationPayloadBase64', Buffer.from(JSON.stringify(payload), 'utf8').toString('base64'),
  ], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 20_000,
    env: { ...process.env, ACCOUNT_PROVISION_LOCK_VULNERABLE: undefined },
  });
}

function expectLibrary(kind: string, payload: unknown, expectedStatus: number, expected: string): void {
  const result = runLibrary(kind, payload);
  expect(result.status).toBe(expectedStatus);
  const output = expectedStatus === 0 ? String(result.stdout).trim() : String(result.stderr).trim();
  expect(output).toContain(expected);
}

function encodeUleb128(value: number): Buffer {
  const bytes: number[] = [];
  let remaining = value >>> 0;
  do {
    let current = remaining & 0x7f;
    remaining >>>= 7;
    if (remaining !== 0) current |= 0x80;
    bytes.push(current);
  } while (remaining !== 0);
  return Buffer.from(bytes);
}

function adler32(bytes: Buffer, offset: number): number {
  let a = 1;
  let b = 0;
  for (let index = offset; index < bytes.length; index += 1) {
    a = (a + bytes[index]) % 65_521;
    b = (b + a) % 65_521;
  }
  return ((b << 16) | a) >>> 0;
}

function writeDexChecksum(bytes: Buffer): void {
  bytes.writeUInt32LE(adler32(bytes, 12), 8);
}

function finalizeDexIntegrity(bytes: Buffer): Buffer {
  crypto.createHash('sha1').update(bytes.subarray(32)).digest().copy(bytes, 12);
  writeDexChecksum(bytes);
  return bytes;
}

type BindingDexFixture = Readonly<{
  bytes: Buffer;
  codeOffset: number;
  codeOffsetField: number;
  dataOffset: number;
  handlerListOffset: number;
  mapItemOffsets: Readonly<Record<number, number>>;
  mapOffset: number;
  paddingOffset: number;
  tryItemOffset: number;
}>;

function createBindingDex(releaseSurface = true): BindingDexFixture {
  const strings = [
    'acquireAccountProvisionLockAsync',
    releaseSurface ? 'releaseAsync' : 'releasfAsync',
    'Lexpo/modules/sqlite/SQLiteModule;',
    'Lexpo/modules/sqlite/NativeAccountProvisionLock;',
    'Ljava/lang/String;',
    'acquireAccountProvisionLock',
    'LL',
  ];
  const headerSize = 112;
  const stringIdsOffset = headerSize;
  const typeIdsOffset = stringIdsOffset + (strings.length * 4);
  const protoIdsOffset = typeIdsOffset + (3 * 4);
  const methodIdsOffset = protoIdsOffset + 12;
  const classDefsOffset = methodIdsOffset + 8;
  const dataOffset = classDefsOffset + (2 * 32);
  const parameters = Buffer.alloc(6);
  parameters.writeUInt32LE(1, 0);
  parameters.writeUInt16LE(2, 4);
  const stringItems = strings.map((value) => Buffer.concat([
    encodeUleb128(value.length), Buffer.from(value, 'ascii'), Buffer.from([0]),
  ]));
  const stringData = Buffer.concat(stringItems);
  const classDataOffset = dataOffset + parameters.length + stringData.length;
  const provisionalClassDataLength = 8;
  const mapOffset = (classDataOffset + provisionalClassDataLength + 3) & ~3;
  const mapItemCount = 11;
  const mapLength = 4 + (mapItemCount * 12);
  const codeOffset = (mapOffset + mapLength + 3) & ~3;
  const encodedCodeOffset = encodeUleb128(codeOffset);
  const classData = Buffer.concat([Buffer.from([0, 0, 1, 0, 0, 9]), encodedCodeOffset]);
  if (classData.length !== provisionalClassDataLength) throw new Error('dex_fixture_class_data_width_changed');
  const codeOffsetField = classDataOffset + 6;
  const paddingOffset = codeOffset + 26;
  const tryItemOffset = codeOffset + 28;
  const handlerListOffset = codeOffset + 36;
  const fileSize = codeOffset + 39;
  const bytes = Buffer.alloc(fileSize);

  Buffer.from('dex\n035\0', 'binary').copy(bytes, 0);
  bytes.writeUInt32LE(fileSize, 32);
  bytes.writeUInt32LE(headerSize, 36);
  bytes.writeUInt32LE(0x12345678, 40);
  bytes.writeUInt32LE(mapOffset, 52);
  bytes.writeUInt32LE(strings.length, 56);
  bytes.writeUInt32LE(stringIdsOffset, 60);
  bytes.writeUInt32LE(3, 64);
  bytes.writeUInt32LE(typeIdsOffset, 68);
  bytes.writeUInt32LE(1, 72);
  bytes.writeUInt32LE(protoIdsOffset, 76);
  bytes.writeUInt32LE(1, 88);
  bytes.writeUInt32LE(methodIdsOffset, 92);
  bytes.writeUInt32LE(2, 96);
  bytes.writeUInt32LE(classDefsOffset, 100);
  bytes.writeUInt32LE(fileSize - dataOffset, 104);
  bytes.writeUInt32LE(dataOffset, 108);

  let stringCursor = dataOffset + parameters.length;
  for (let index = 0; index < stringItems.length; index += 1) {
    bytes.writeUInt32LE(stringCursor, stringIdsOffset + (index * 4));
    stringItems[index].copy(bytes, stringCursor);
    stringCursor += stringItems[index].length;
  }
  for (let index = 0; index < 3; index += 1) bytes.writeUInt32LE(index + 2, typeIdsOffset + (index * 4));
  bytes.writeUInt32LE(6, protoIdsOffset);
  bytes.writeUInt32LE(1, protoIdsOffset + 4);
  bytes.writeUInt32LE(dataOffset, protoIdsOffset + 8);
  bytes.writeUInt16LE(0, methodIdsOffset);
  bytes.writeUInt16LE(0, methodIdsOffset + 2);
  bytes.writeUInt32LE(5, methodIdsOffset + 4);
  bytes.writeUInt32LE(0, classDefsOffset);
  bytes.writeUInt32LE(1, classDefsOffset + 4);
  bytes.writeUInt32LE(0xffffffff, classDefsOffset + 8);
  bytes.writeUInt32LE(0xffffffff, classDefsOffset + 16);
  bytes.writeUInt32LE(classDataOffset, classDefsOffset + 24);
  bytes.writeUInt32LE(1, classDefsOffset + 32);
  bytes.writeUInt32LE(1, classDefsOffset + 36);
  bytes.writeUInt32LE(0xffffffff, classDefsOffset + 40);
  bytes.writeUInt32LE(0xffffffff, classDefsOffset + 48);
  parameters.copy(bytes, dataOffset);
  classData.copy(bytes, classDataOffset);

  const mapItems = [
    { type: 0x0000, size: 1, offset: 0 },
    { type: 0x0001, size: strings.length, offset: stringIdsOffset },
    { type: 0x0002, size: 3, offset: typeIdsOffset },
    { type: 0x0003, size: 1, offset: protoIdsOffset },
    { type: 0x0005, size: 1, offset: methodIdsOffset },
    { type: 0x0006, size: 2, offset: classDefsOffset },
    { type: 0x1001, size: 1, offset: dataOffset },
    { type: 0x2002, size: strings.length, offset: dataOffset + parameters.length },
    { type: 0x2000, size: 1, offset: classDataOffset },
    { type: 0x1000, size: 1, offset: mapOffset },
    { type: 0x2001, size: 1, offset: codeOffset },
  ];
  const mapItemOffsets: Record<number, number> = {};
  bytes.writeUInt32LE(mapItems.length, mapOffset);
  for (let index = 0; index < mapItems.length; index += 1) {
    const itemOffset = mapOffset + 4 + (index * 12);
    const item = mapItems[index];
    mapItemOffsets[item.type] = itemOffset;
    bytes.writeUInt16LE(item.type, itemOffset);
    bytes.writeUInt32LE(item.size, itemOffset + 4);
    bytes.writeUInt32LE(item.offset, itemOffset + 8);
  }

  bytes.writeUInt16LE(1, codeOffset);
  bytes.writeUInt16LE(1, codeOffset + 2);
  bytes.writeUInt16LE(1, codeOffset + 6);
  bytes.writeUInt32LE(5, codeOffset + 12);
  bytes.writeUInt16LE(0x0127, codeOffset + 16);
  bytes.writeUInt16LE(0x0000, codeOffset + 18);
  bytes.writeUInt16LE(0x000d, codeOffset + 20);
  bytes.writeUInt16LE(0x0012, codeOffset + 22);
  bytes.writeUInt16LE(0x0011, codeOffset + 24);
  bytes.writeUInt32LE(0, tryItemOffset);
  bytes.writeUInt16LE(1, tryItemOffset + 4);
  bytes.writeUInt16LE(1, tryItemOffset + 6);
  bytes[handlerListOffset] = 1;
  bytes[handlerListOffset + 1] = 0;
  bytes[handlerListOffset + 2] = 2;
  return {
    bytes: finalizeDexIntegrity(bytes),
    codeOffset,
    codeOffsetField,
    dataOffset,
    handlerListOffset,
    mapItemOffsets,
    mapOffset,
    paddingOffset,
    tryItemOffset,
  };
}

function withDexCodeOffset(fixture: BindingDexFixture, codeOffset: number): Buffer {
  const bytes = Buffer.from(fixture.bytes);
  const encoded = encodeUleb128(codeOffset);
  if (encoded.length !== encodeUleb128(fixture.codeOffset).length) throw new Error('dex_fixture_code_offset_width_changed');
  encoded.copy(bytes, fixture.codeOffsetField);
  bytes.writeUInt32LE(codeOffset, fixture.mapItemOffsets[0x2001] + 8);
  return finalizeDexIntegrity(bytes);
}

function truncateDex(fixture: BindingDexFixture, length: number): Buffer {
  const bytes = Buffer.from(fixture.bytes.subarray(0, length));
  bytes.writeUInt32LE(bytes.length, 32);
  bytes.writeUInt32LE(bytes.length - fixture.dataOffset, 104);
  return finalizeDexIntegrity(bytes);
}

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const value of bytes) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createStoredZip(entries: readonly { readonly name: string; readonly bytes: Buffer }[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'ascii');
    const checksum = crc32(entry.bytes);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(entry.bytes.length, 18);
    local.writeUInt32LE(entry.bytes.length, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, entry.bytes);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(entry.bytes.length, 20);
    central.writeUInt32LE(entry.bytes.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(localOffset, 42);
    centralParts.push(central, name);
    localOffset += local.length + name.length + entry.bytes.length;
  }
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

function launcherFailureEnvelope(child: unknown, expectedCorrelation: string): ReturnType<typeof spawnSync> {
  const command = [
    '$tokens=$null',
    '$errors=$null',
    '$ast=[Management.Automation.Language.Parser]::ParseFile($env:ACCOUNT_LOCK_LAUNCHER,[ref]$tokens,[ref]$errors)',
    "if($errors.Count){throw 'launcher_parse_failed'}",
    "$functionAst=$ast.Find({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -ceq 'Get-SanitizedRunnerFailure'},$true)",
    "if($null -eq $functionAst){throw 'launcher_failure_reducer_missing'}",
    'Invoke-Expression $functionAst.Extent.Text',
    '$raw=[Text.UTF8Encoding]::new($false,$true).GetString([Convert]::FromBase64String($env:ACCOUNT_LOCK_CHILD_BASE64))',
    '$child=$raw | ConvertFrom-Json',
    '$result=Get-SanitizedRunnerFailure $child $env:ACCOUNT_LOCK_EXPECTED_CORRELATION',
    '[Console]::Out.WriteLine(($result | ConvertTo-Json -Compress))',
  ].join('; ');
  return spawnSync('pwsh.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-EncodedCommand', Buffer.from(command, 'utf16le').toString('base64'),
  ], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 20_000,
    env: {
      ...process.env,
      ACCOUNT_LOCK_LAUNCHER: LAUNCHER,
      ACCOUNT_LOCK_CHILD_BASE64: Buffer.from(JSON.stringify(child), 'utf8').toString('base64'),
      ACCOUNT_LOCK_EXPECTED_CORRELATION: expectedCorrelation,
    },
  });
}

function shaFile(file: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function materializationFixture(): Readonly<{
  root: string;
  payload: Record<string, unknown>;
  originalManifest: Buffer;
  originalActivity: Buffer | null;
}> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'account-provision-lock-materialization-'));
  const targets = path.join(root, 'targets');
  const fixtures = path.join(root, 'fixtures');
  const recovery = path.join(root, 'recovery');
  fs.mkdirSync(targets);
  fs.mkdirSync(fixtures);
  const originalManifest = Buffer.from('<manifest><application /></manifest>\n', 'utf8');
  const originalActivity = process.env.ACCOUNT_PROVISION_LOCK_EXISTING_ACTIVITY === '1'
    ? Buffer.from('package app.phraseman\n// original activity\n', 'utf8')
    : null;
  fs.writeFileSync(path.join(targets, 'AndroidManifest.xml'), originalManifest, { flag: 'wx' });
  if (originalActivity !== null) {
    fs.writeFileSync(path.join(targets, 'AccountV2ProbeActivity.kt'), originalActivity, { flag: 'wx' });
  }
  fs.writeFileSync(path.join(fixtures, 'AndroidManifest.fragment.xml'), fs.readFileSync(MANIFEST), { flag: 'wx' });
  fs.writeFileSync(path.join(fixtures, 'AccountV2ProbeActivity.kt'), fs.readFileSync(ACTIVITY), { flag: 'wx' });
  return Object.freeze({
    root,
    originalManifest,
    originalActivity,
    payload: {
      sandboxRoot: root,
      operation: 'exercise',
      fault: 'none',
      targetManifest: path.join(targets, 'AndroidManifest.xml'),
      targetActivity: path.join(targets, 'AccountV2ProbeActivity.kt'),
      fixtureManifest: path.join(fixtures, 'AndroidManifest.fragment.xml'),
      fixtureActivity: path.join(fixtures, 'AccountV2ProbeActivity.kt'),
      journalPath: path.join(recovery, 'journal.json'),
      backupRoot: recovery,
    },
  });
}

function packageRecoveryFixture(): Readonly<{ root: string; original: Buffer }> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'account-provision-lock-package-'));
  const original = Buffer.from('{"name":"fixture","main":"index.js"}\n', 'utf8');
  fs.writeFileSync(path.join(root, 'package.json'), original, { flag: 'wx' });
  return Object.freeze({ root, original });
}

function evidencePublicationFixture(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'account-provision-lock-evidence-'));
}

describe('Android Account V2 provision-lock entrypoint and host runner', () => {
  test('keeps tracked fixtures complete while generated Android targets remain ignored and untracked', () => {
    const manifest = source(MANIFEST);
    expect(ACTIVITY).toContain(`${path.sep}runtime-probes${path.sep}android-account-provision-lock${path.sep}android${path.sep}`);
    expect(manifest).toMatch(/android:name="\.AccountV2ProbeActivity"/u);
    expect(manifest).toMatch(/android:exported="false"/u);
    expect(manifest).toMatch(/android:launchMode="singleTask"/u);
    expect(manifest).toMatch(/android:process=":account_v2_probe"/u);
    expect(manifest).not.toMatch(/AccountV2ProbeActivity[\s\S]*?<intent-filter/u);
    expect(fs.existsSync(GENERATED_ACTIVITY)).toBe(false);
    const ignored = spawnSync('git', [
      'check-ignore', '-v',
      path.relative(REPOSITORY_ROOT, GENERATED_MANIFEST),
      path.relative(REPOSITORY_ROOT, GENERATED_ACTIVITY),
    ], { cwd: REPOSITORY_ROOT, encoding: 'utf8' });
    expect(ignored.status).toBe(0);
    expect(String(ignored.stdout).match(/\.gitignore:64:\/android/gu)).toHaveLength(2);
    const fixtureIgnored = spawnSync('git', [
      'check-ignore',
      path.relative(REPOSITORY_ROOT, TRACKED_MANIFEST),
      path.relative(REPOSITORY_ROOT, TRACKED_ACTIVITY),
    ], { cwd: REPOSITORY_ROOT, encoding: 'utf8' });
    expect(fixtureIgnored.status).toBe(1);
  });

  test('uses a normal React activity delegate for main and forwards exact controls through onNewIntent', () => {
    const activity = source(ACTIVITY);
    expect(activity).toContain('class AccountV2ProbeActivity : ReactActivity()');
    expect(activity).toContain('override fun getMainComponentName(): String = "main"');
    expect(activity).toContain('ReactActivityDelegateWrapper(');
    expect(activity).toContain('DefaultReactActivityDelegate(');
    expect(activity).toContain('override fun onNewIntent(intent: Intent)');
    expect(activity).toContain('validateControlIntent(intent, launchBinding)');
    expect(activity).toContain('super.onNewIntent(intent)');
    expect(activity).toContain('setIntent(intent)');
    expect(activity).toContain('private lateinit var launchBinding: LaunchBinding');
    expect(activity).toContain('intent.getStringExtra(EXTRA_LAUNCH_NONCE)');
    expect(activity).toContain('val runtimeIdentity = intent.getStringExtra(EXTRA_RUNTIME_IDENTITY)');
    const launchValidation = activity.slice(
      activity.indexOf('private fun validateLaunchIntent'),
      activity.indexOf('private fun validateControlIntent'),
    );
    expect(launchValidation).toContain('intent.hasExtra(EXTRA_RUNTIME_IDENTITY)');
    expect(launchValidation).not.toContain('val runtimeIdentity');
    expect(activity).toContain('Process.myPid()');
    expect(activity).toContain('/proc/${Process.myPid()}/stat');
    expect(activity).not.toContain('companion object {\n    var');
  });

  test('entrypoint accepts only exact roles/identities/bindings and listens for control intents', () => {
    const entrypoint = source(ENTRYPOINT);
    expect(entrypoint).toContain("role === 'holder' || role === 'release'");
    expect(entrypoint).toContain("identity === 'x' || identity === 'y'");
    expect(entrypoint).toContain("packageName !== 'app.phraseman'");
    expect(entrypoint).toContain("Linking.addEventListener('url'");
    expect(entrypoint).toContain('waitForReleaseControl');
    expect(entrypoint).toContain("command === 'checkpoint'");
    expect(entrypoint).toContain('MARKERS.ownershipCheckpoint');
    expect(entrypoint).toContain('MARKERS.launchAcknowledged');
    expect(entrypoint).toContain('MARKERS.controlAcknowledged');
    expect(entrypoint).toContain('ExpoCrypto.randomUUID()');
    expect(entrypoint).toContain('runAndroidAccountProvisionLockProbe');
    expect(entrypoint).toContain('registerRootComponent(AccountProvisionLockProbeApp);');
    expect(entrypoint.match(/registerRootComponent\(/gu)).toHaveLength(1);
  });

  test('runner fails closed when packet-owned sources are untracked and cannot self-authorize reviewed hashes', () => {
    const runner = source(RUNNER);
    expect(runner).toContain('source_tracking_precondition_failed');
    expect(runner).toContain('git ls-files --error-unmatch');
    expect(runner).toContain('reviewed_source_trust_root_missing');
    expect(runner).not.toMatch(/SevenExpectedHashes\s*=|Get-SevenPathFacts\s*\|\s*ConvertTo-Json[^\n]*Reviewed/u);
    const statuses = SEVEN_PATHS.map((relative) => spawnSync(
      'git', ['ls-files', '--error-unmatch', '--', relative],
      { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
    ).status);
    expect(statuses.every((status) => status === 0) || statuses.every((status) => status === 1)).toBe(true);
    const reviewed = SEVEN_PATHS.map((relative, index) => ({
      path: relative,
      tracked: index !== 3,
      actualSha256: 'a'.repeat(64),
      reviewedSha256: 'a'.repeat(64),
    }));
    expectLibrary('SourceTrust', { sources: reviewed }, 1, 'source_tracking_precondition_failed');
    expectLibrary('SourceTrust', {
      sources: reviewed.map((item) => ({ ...item, tracked: true })),
    }, 0, '"sourceCount":7');
  });

  test('runner requires app-emitted ownership checkpoints and persists them before release or kill', () => {
    const runner = source(RUNNER);
    expect(runner).toContain('account_provision_lock_owned_checkpoint');
    expect(runner).toContain('Send-OwnershipCheckpoint');
    expect(runner).toContain('Write-DurablePhaseCheckpoint');
    const phaseStart = runner.indexOf('function Invoke-InlinePhase');
    expect(runner.indexOf('New-VerifiedOwnershipEvent', phaseStart))
      .toBeLessThan(runner.indexOf('Send-ReleaseControl', phaseStart));
    expect(runner).toContain("Send-ReleaseControl $owner 'holder' 'x'; $events.Add((New-PhaseEvent 'control_release'");
    expect(runner).not.toContain("$events.Add((New-PhaseEvent 'control_release' 'x' $owner)); Send-ReleaseControl");
    expect(runner).not.toMatch(/ownerReportsOwnership\s*=\s*\$true|owns\s*=\s*\$true/u);
  });

  test('binds the patched method from the real ExpoSQLite native-module shape, not the public package exports', () => {
    if (process.env.ACCOUNT_PROVISION_LOCK_VULNERABLE === '1') {
      expect(source(ENTRYPOINT)).toContain("requireNativeModule('ExpoSQLite')");
      return;
    }
    const nativeModule = {
      defaultDatabaseDirectory: '/data/user/0/app.phraseman/files/SQLite',
      acquireAccountProvisionLockAsync: jest.fn(),
    };
    const requireNativeModule = jest.fn((name: string) => {
      if (name !== 'ExpoSQLite') throw new Error('unexpected_native_module');
      return nativeModule;
    });
    const registerRootComponent = jest.fn();
    jest.resetModules();
    jest.doMock('expo', () => ({ registerRootComponent, requireNativeModule }));
    jest.doMock('expo-sqlite', () => ({
      defaultDatabaseDirectory: nativeModule.defaultDatabaseDirectory,
      acquireAccountProvisionLockAsync: undefined,
    }));
    jest.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
    jest.doMock('expo-linking', () => ({
      addEventListener: jest.fn(),
      getInitialURL: jest.fn(),
    }));
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require(ENTRYPOINT);
    });
    expect(requireNativeModule).toHaveBeenCalledTimes(1);
    expect(requireNativeModule).toHaveBeenCalledWith('ExpoSQLite');
    expect(registerRootComponent).toHaveBeenCalledTimes(1);
  });

  test('executes acquire with the real ExpoSQLite receiver and release with the opaque handle receiver', async () => {
    if (process.env.ACCOUNT_PROVISION_LOCK_VULNERABLE === '1') {
      expect(source(ENTRYPOINT)).toContain("requireNativeModule('ExpoSQLite')");
      return;
    }
    const launch = new URL('phraseman://_account_v2_provision_lock_probe');
    for (const [key, value] of Object.entries({
      command: 'launch', role: 'release', identity: 'x', packageName: 'app.phraseman',
      processName: 'app.phraseman', pid: '1201', starttime: '9001',
      launchNonce: 'a'.repeat(32),
    })) launch.searchParams.append(key, value);
    let acquireReceiver: unknown;
    let releaseReceiver: unknown;
    const handle = {
      releaseAsync: async function releaseAsync(this: unknown): Promise<void> { releaseReceiver = this; },
    };
    const databaseRoot = '/data/user/0/app.phraseman/files/SQLite';
    let databaseRootReadCount = 0;
    let acquiredDatabasePath: unknown;
    const nativeModule = {
      get defaultDatabaseDirectory(): string {
        databaseRootReadCount += 1;
        return databaseRoot;
      },
      acquireAccountProvisionLockAsync: async function acquire(this: unknown, databasePath: unknown): Promise<unknown> {
        acquireReceiver = this;
        acquiredDatabasePath = databasePath;
        return handle;
      },
    };
    const output: string[] = [];
    const log = jest.spyOn(console, 'log').mockImplementation((value) => { output.push(String(value)); });
    jest.resetModules();
    jest.doMock('react', () => ({ useEffect: (callback: () => void) => callback() }));
    jest.doMock('expo', () => ({
      requireNativeModule: () => nativeModule,
      registerRootComponent: (component: () => unknown) => component(),
    }));
    jest.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
    jest.doMock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-4000-8000-000000000000' }));
    jest.doMock('expo-linking', () => ({ addEventListener: jest.fn(), getInitialURL: async () => launch.toString() }));
    try {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require(ENTRYPOINT);
      });
      await new Promise<void>((resolve) => { setImmediate(resolve); });
      await new Promise<void>((resolve) => { setImmediate(resolve); });
      expect(acquireReceiver).toBe(nativeModule);
      expect(releaseReceiver).toBe(handle);
      expect(databaseRootReadCount).toBe(1);
      expect(acquiredDatabasePath).toBe(`${databaseRoot}/accounts-v2/accounts-v2-g-${'a'.repeat(64)}.db`);
      const binding = [
        'app.phraseman', 'app.phraseman', '1201', '9001', 'a'.repeat(32),
        '00000000000040008000000000000000',
      ].join('|');
      expect(output).toEqual([
        `account_provision_lock_launch_ack|${binding}`,
        `account_provision_lock_attempted|${binding}`,
        `account_provision_lock_acquired|${binding}`,
        `account_provision_lock_release_requested|${binding}`,
        `account_provision_lock_released|${binding}`,
        `account_provision_lock_probe_pass|${binding}`,
      ]);
    } finally {
      log.mockRestore();
      jest.dontMock('react');
      jest.dontMock('expo');
      jest.dontMock('react-native');
      jest.dontMock('expo-crypto');
      jest.dontMock('expo-linking');
    }
  });

  test('entrypoint emits only fixed markers/codes and a tuple-bound root category without inspecting raw values', async () => {
    const entrypoint = source(ENTRYPOINT);
    expect(entrypoint).toContain('sanitizeDiagnostic(failure)');
    expect(entrypoint).toContain('console.log(marker);');
    expect(entrypoint.match(/console\.(?:log|warn|error|info|debug)/gu)).toHaveLength(1);
    expect(entrypoint).not.toMatch(/String\(failure\)|JSON\.stringify\(failure\)|console\.error/u);
    expect(entrypoint).not.toMatch(/AsyncStorage|FileSystem|writeAsString/u);
    if (process.env.ACCOUNT_PROVISION_LOCK_VULNERABLE === '1') return;

    const launch = new URL('phraseman://_account_v2_provision_lock_probe');
    for (const [key, value] of Object.entries({
      command: 'launch', role: 'release', identity: 'x', packageName: 'app.phraseman',
      processName: 'app.phraseman', pid: '1201', starttime: '9001',
      launchNonce: 'a'.repeat(32),
    })) launch.searchParams.append(key, value);
    const probeModule = path.join(ROOT, 'runtime-probes/android-account-provision-lock/probe.ts');
    const output: string[] = [];
    const log = jest.spyOn(console, 'log').mockImplementation((value) => { output.push(String(value)); });
    const hostileCalls = { get: 0, ownKeys: 0, primitive: 0, string: 0 };
    const hostileRoot = new Proxy(Object.create(null) as object, {
      get: (_target, key) => {
        hostileCalls.get += 1;
        if (key === Symbol.toPrimitive) return () => { hostileCalls.primitive += 1; return 'C:\\secret\\root'; };
        if (key === 'toString') return () => { hostileCalls.string += 1; return 'C:\\secret\\root'; };
        return undefined;
      },
      ownKeys: () => { hostileCalls.ownKeys += 1; return []; },
    });
    const scenarios: readonly (readonly [unknown, string])[] = [
      ['/data/user/0/app.phraseman/files/SQLite', 'android_ce_user_zero'],
      ['/data/user/10/app.phraseman/files/SQLite///', 'android_ce_user_nonzero'],
      ['file:///data/user/0/app.phraseman/files/SQLite', 'file_uri'],
      ['/data/data/app.phraseman/files/SQLite', 'legacy_alias'],
      ['/storage/emulated/0/CODEX-PRIVATE-secret', 'other'],
      [hostileRoot, 'non_string'],
    ];
    const binding = [
      'app.phraseman', 'app.phraseman', '1201', '9001', 'a'.repeat(32),
      '00000000000040008000000000000000',
    ].join('|');
    try {
      for (const [databaseRoot, expectedCategory] of scenarios) {
        output.length = 0;
        let databaseRootReadCount = 0;
        let receivedRoot: unknown;
        const nativeModule = {
          get defaultDatabaseDirectory(): unknown {
            databaseRootReadCount += 1;
            return databaseRoot;
          },
          acquireAccountProvisionLockAsync: jest.fn(),
        };
        jest.resetModules();
        jest.doMock('react', () => ({ useEffect: (callback: () => void) => callback() }));
        jest.doMock('expo', () => ({
          requireNativeModule: () => nativeModule,
          registerRootComponent: (component: () => unknown) => component(),
        }));
        jest.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
        jest.doMock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-4000-8000-000000000000' }));
        jest.doMock('expo-linking', () => ({ addEventListener: jest.fn(), getInitialURL: async () => launch.toString() }));
        jest.doMock(probeModule, () => ({
          MARKERS: { launchAcknowledged: 'account_provision_lock_launch_ack' },
          runAndroidAccountProvisionLockProbe: async (port: { defaultDatabaseDirectory: unknown }) => {
            receivedRoot = port.defaultDatabaseDirectory;
            throw new Error('account_provision_lock_database_root_invalid');
          },
          sanitizeDiagnostic: (failure: unknown) => failure instanceof Error &&
            failure.message === 'account_provision_lock_database_root_invalid'
            ? failure.message
            : 'account_provision_lock_runtime_failed',
        }));
        jest.isolateModules(() => {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require(ENTRYPOINT);
        });
        await new Promise<void>((resolve) => { setImmediate(resolve); });
        await new Promise<void>((resolve) => { setImmediate(resolve); });
        expect(databaseRootReadCount).toBe(1);
        expect(receivedRoot).toBe(databaseRoot);
        expect(output).toEqual([
          `account_provision_lock_launch_ack|${binding}`,
          `account_provision_lock_database_root_diagnostic|1|${expectedCategory}|${binding}`,
          'account_provision_lock_database_root_invalid',
        ]);
        expect(output.join('|')).not.toMatch(/CODEX-PRIVATE|secret|\/data\/|file:\/\//u);
        expect(output.filter((line) => line.startsWith('account_provision_lock_database_root_diagnostic|'))).toHaveLength(1);
        expect(output.join('|')).not.toMatch(/account_provision_lock_(?:attempted|acquired|release_requested|released|probe_pass)/u);
      }
      expect(hostileCalls).toEqual({ get: 0, ownKeys: 0, primitive: 0, string: 0 });

      output.length = 0;
      const nativeModule = {
        get defaultDatabaseDirectory(): string { return '/data/user/0/app.phraseman/files/SQLite'; },
        acquireAccountProvisionLockAsync: jest.fn(),
      };
      jest.resetModules();
      jest.doMock('react', () => ({ useEffect: (callback: () => void) => callback() }));
      jest.doMock('expo', () => ({
        requireNativeModule: () => nativeModule,
        registerRootComponent: (component: () => unknown) => component(),
      }));
      jest.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
      jest.doMock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-4000-8000-000000000000' }));
      jest.doMock('expo-linking', () => ({ addEventListener: jest.fn(), getInitialURL: async () => launch.toString() }));
      jest.doMock(probeModule, () => ({
        MARKERS: { launchAcknowledged: 'account_provision_lock_launch_ack' },
        runAndroidAccountProvisionLockProbe: async () => { throw new Error('account_provision_lock_native_unsupported'); },
        sanitizeDiagnostic: (failure: unknown) => failure instanceof Error &&
          failure.message === 'account_provision_lock_native_unsupported'
          ? failure.message
          : 'account_provision_lock_runtime_failed',
      }));
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require(ENTRYPOINT);
      });
      await new Promise<void>((resolve) => { setImmediate(resolve); });
      await new Promise<void>((resolve) => { setImmediate(resolve); });
      expect(output).toEqual([
        `account_provision_lock_launch_ack|${binding}`,
        'account_provision_lock_native_unsupported',
      ]);
    } finally {
      log.mockRestore();
      jest.dontMock('react');
      jest.dontMock('expo');
      jest.dontMock('react-native');
      jest.dontMock('expo-crypto');
      jest.dontMock('expo-linking');
      jest.dontMock(probeModule);
    }
    const classifier = entrypoint.slice(
      entrypoint.indexOf('function getDatabaseRootCategory'),
      entrypoint.indexOf('function emitDatabaseRootDiagnostic'),
    );
    expect(classifier).not.toMatch(/String\(|toString|Symbol\.toPrimitive|Object\.|Reflect\.|JSON\.|\.length/u);
  });

  test('runner models timeout as observation, validates two checkpoints, lstat, and killed /proc disappearance', () => {
    const runner = source(RUNNER);
    expect(runner).toContain("'ContendedCheckpoint'");
    expect(runner).toContain("'KilledWaiterBoundary'");
    expect(runner).toContain("'StaleLockEvidence'");
    expect(runner).toContain('$timeoutIsCancellation = $false');
    expect(runner).toContain("'/proc/{0}/stat'");
    expect(runner).toContain('stat -c');
    expect(runner).toContain('staleLockFilePresent');
    expect(runner).not.toMatch(/timeoutIsCancellation\s*=\s*\$true/u);
  });

  test('runner starts the non-exported secondary only as the package UID and never weakens it', () => {
    const runner = source(RUNNER);
    expect(runner).toContain("'run-as', $script:PackageName, 'am', 'start'");
    expect(runner).toContain('app.phraseman/.AccountV2ProbeActivity');
    expect(runner).not.toContain('android:exported="true"');
  });

  test('runner has outer-finally cleanup and emits one aggregate PASS only after cleanup', () => {
    const runner = source(RUNNER);
    expect(runner).toContain('finally {');
    expect(runner).toContain('Invoke-OuterCleanup');
    expect(runner).toContain('$cleanupComplete = $cleanupFailures.Count -eq 0');
    expect(runner).toContain('if (-not $cleanupComplete -and -not $deviceFailed) {');
    expect(runner).toContain("$deviceFailureCode = 'cleanup_incomplete'");
    expect(runner.match(/account_provision_lock_android_runtime_probe_pass/gu)).toHaveLength(1);
    expect(runner.indexOf("account_provision_lock_android_runtime_probe_pass"))
      .toBeGreaterThan(runner.indexOf('if (-not $cleanupComplete -and -not $deviceFailed)'));
  });

  test('device branch holds exact approved sources, recovers before gates, drives all phases, and restores every transient target', () => {
    const runner = source(RUNNER);
    expect(runner).toContain('Open-SevenPathHolds');
    expect(runner).toContain('[IO.FileShare]::Read');
    expect(runner).toContain('Invoke-AuthenticRedGate');
    expect(runner).toContain('Invoke-FocusedGreenGates');
    expect(runner.indexOf('Invoke-StartupRecovery')).toBeLessThan(runner.indexOf('Invoke-BoundedHostGates'));
    expect(runner).toContain('Start-DeviceMaterialization');
    expect(runner).toContain('Restore-DeviceMaterialization');
    expect(runner).toContain('Restore-PackageEntrypoint');
    expect(runner).toContain('Invoke-AndroidDebugBuild');
    expect(runner).toContain('Install-VerifiedApk');
    expect(runner).toContain('Assert-InstalledApkHash');
    for (const phase of [
      'Invoke-PrimaryHolderSecondaryWaiterPhase',
      'Invoke-SecondaryHolderPrimaryWaiterPhase',
      'Invoke-HolderDeathPhase',
      'Invoke-WaiterDeathPhase',
      'Invoke-IndependentIdentitiesPhase',
      'Invoke-StaleFilePhase',
    ]) expect(runner).toContain(phase);
    expect(runner).not.toContain("throw 'account_provision_lock_device_campaign_hold'");
    expect(runner).not.toMatch(/GateBundlePath|GateBundleSha256|hostGateStatus|phaseDriverPath|Invoke-VerifiedPhaseDriver/u);
    expect(runner).toContain('Invoke-InlinePhase');
    expect(runner).toContain("@('tests/account_provision_lock_android_runtime_probe.test.ts', 26, 1, 27, 'authentic-red-probe')");
    expect(runner).toContain("@('tests/account_provision_lock_android_runtime_entrypoint.test.ts', 53, 5, 58, 'authentic-red-entrypoint')");
    expect(runner).toContain("if ($test -clike '*entrypoint.test.ts') { 58 }");
    expect(runner).not.toMatch(/host_gate_(?:failed|harness_failed|receipt_invalid)_\$Label/u);
    expect(runner).not.toMatch(/--passWithNoTests|--testNamePattern|(?:^|[', ])(?:-t)(?:[', ]|$)/u);
    for (const payload of [
      { label: 'authentic-red-probe', canonical: 'Tests: 26 failed, 1 passed, 27 total\n', exitCode: 1, expectSuccess: false, expectedFailed: 26, expectedPassed: 1, expectedTotal: 27 },
      { label: 'authentic-red-entrypoint', canonical: 'Tests: 53 failed, 5 passed, 58 total\n', exitCode: 1, expectSuccess: false, expectedFailed: 53, expectedPassed: 5, expectedTotal: 58 },
      { label: 'focused-green-entrypoint', canonical: 'Tests: 58 passed, 58 total\n', exitCode: 0, expectSuccess: true, expectedFailed: 0, expectedPassed: 58, expectedTotal: 58 },
    ]) expectLibrary('HostGateReceipt', payload, 0, '"status":"pass"');
    expectLibrary('HostGateReceipt', {
      label: 'authentic-red-entrypoint', canonical: 'Tests: 52 failed, 5 passed, 58 total\n',
      exitCode: 1, expectSuccess: false, expectedFailed: 53, expectedPassed: 5, expectedTotal: 58,
    }, 1, 'host_gate_red_entrypoint_receipt_invalid');
  });

  test('runner keeps source holds through atomic evidence publication and records pre/post repository, source, and cleanup APK facts', () => {
    const runner = source(RUNNER);
    expect(runner.indexOf('Publish-SanitizedEvidence')).toBeLessThan(runner.lastIndexOf('Close-SevenPathHolds'));
    for (const token of [
      'repositoryBefore', 'repositoryAfter', 'sourceBefore', 'sourceAfter',
      'generatedTargetsBefore', 'generatedTargetsAfter', 'cleanupApkObservation',
      'packetSha256', 'nativeInputHashes', 'gateReceipts',
      'materializedInputHashes', 'apkBefore', 'apkAfter', 'repositoryAfterPublication',
    ]) expect(runner).toContain(token);
    expect(runner).toContain('[IO.File]::Move($temporary, $target)');
    const publication = runner.slice(
      runner.indexOf('function Publish-SanitizedEvidence'),
      runner.indexOf('function Assert-PostPublicationRepositorySnapshot'),
    );
    expect(publication).toContain("status = 'provisional'");
    expect(publication).not.toContain("status = 'pass'");
    expect(runner.lastIndexOf("$evidence.status = 'pass'"))
      .toBeLessThan(runner.lastIndexOf('Finalize-SanitizedEvidence'));
    const finalizationCall = runner.lastIndexOf('      Finalize-SanitizedEvidence');
    const custodyCloseCall = runner.lastIndexOf('      Close-SevenPathHolds', finalizationCall);
    const finalSnapshotCall = runner.lastIndexOf('      Assert-PostPublicationRepositorySnapshot', custodyCloseCall);
    expect(finalSnapshotCall).toBeGreaterThan(0);
    expect(finalSnapshotCall).toBeLessThan(custodyCloseCall);
    expect(custodyCloseCall).toBeLessThan(finalizationCall);
    expect(runner).toContain('evidence_directory_inside_repository');
    expect(runner.indexOf('Publish-SanitizedEvidence')).toBeLessThan(runner.indexOf('Assert-PostPublicationRepositorySnapshot'));
  });

  test.each(['after_provisional', 'custody_teardown_failure', 'before_final_commit', 'atomic_commit_failure'])(
    'evidence publication fault %s leaves no durable PASS artifact',
    (fault) => {
      if (process.env.ACCOUNT_PROVISION_LOCK_VULNERABLE === '1') {
        expect(source(RUNNER)).toContain('EvidencePublication');
        return;
      }
      const root = evidencePublicationFixture();
      try {
        expectLibrary('EvidencePublication', { sandboxRoot: root, fault }, 1, 'account_provision_lock_injected_crash');
        const evidenceFiles = fs.readdirSync(root);
        expect(evidenceFiles.length).toBeGreaterThan(0);
        for (const name of evidenceFiles) {
          const value = JSON.parse(fs.readFileSync(path.join(root, name), 'utf8')) as { status?: string };
          expect(value.status).not.toBe('pass');
        }
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    },
  );

  test('evidence publication commits one atomic final PASS only after snapshot finalization', () => {
    if (process.env.ACCOUNT_PROVISION_LOCK_VULNERABLE === '1') {
      expect(source(RUNNER)).toContain('EvidencePublication');
      return;
    }
    const root = evidencePublicationFixture();
    try {
      expectLibrary('EvidencePublication', { sandboxRoot: root, fault: 'none' }, 0, '"status":"pass"');
      const files = fs.readdirSync(root);
      expect(files).toEqual(['account-provision-lock-runtime.json']);
      expect(JSON.parse(fs.readFileSync(path.join(root, files[0]), 'utf8'))).toMatchObject({
        status: 'pass',
        repositoryAfterPublication: { snapshot: 'verified' },
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('runtime marker validation rejects missing acknowledgement and replacement or mismatched runtimes', () => {
    if (process.env.ACCOUNT_PROVISION_LOCK_VULNERABLE === '1') {
      expect(source(RUNNER)).toContain('RuntimeMarkerBinding');
      return;
    }
    const binding = {
      pid: 1201, starttime: '9001', processName: 'app.phraseman',
      launchNonce: 'a'.repeat(32), runtimeIdentity: 'b'.repeat(32),
    };
    const fields = ['app.phraseman', binding.processName, String(binding.pid), binding.starttime,
      binding.launchNonce, binding.runtimeIdentity].join('|');
    const valid = [
      `account_provision_lock_launch_ack|${fields}`,
      `account_provision_lock_attempted|${fields}`,
      `account_provision_lock_control_ack|release|${fields}|-`,
      `account_provision_lock_release_requested|${fields}`,
    ];
    expectLibrary('RuntimeMarkerBinding', { binding, lines: valid }, 0, '"status":"pass"');
    expectLibrary('RuntimeMarkerBinding', { binding, lines: valid.slice(1) }, 1, 'runtime_marker_binding_invalid');
    expectLibrary('RuntimeMarkerBinding', {
      binding,
      lines: valid.filter((line) => !line.startsWith('account_provision_lock_control_ack|')),
    }, 1, 'runtime_marker_binding_invalid');
    expectLibrary('RuntimeMarkerBinding', {
      binding,
      lines: [...valid, valid[0].replace(binding.runtimeIdentity, 'c'.repeat(32))],
    }, 1, 'runtime_marker_binding_invalid');
    expectLibrary('RuntimeMarkerBinding', {
      binding,
      lines: valid.map((line, index) => index === 2 ? line.replace(binding.runtimeIdentity, 'd'.repeat(32)) : line),
    }, 1, 'runtime_marker_binding_invalid');
  });

  test('stale-file phase kills an exact owner and lstat occurs after death but before a fresh X acquisition', () => {
    const runner = source(RUNNER);
    const phaseStart = runner.indexOf("elseif ($Phase -ceq 'stale-file')");
    const phaseEnd = runner.indexOf("} else { throw 'phase_invalid' }", phaseStart);
    const stalePhase = runner.slice(phaseStart, phaseEnd);
    const freshBootstrap = stalePhase.lastIndexOf('$fresh = Start-PrimaryBootstrap');
    const freshAcknowledgement = stalePhase.lastIndexOf("$fresh = Send-PrimaryLaunch 'holder' 'x' $fresh");
    const freshValidation = stalePhase.lastIndexOf('Assert-FreshRelaunch $owner $fresh');
    const freshEvent = stalePhase.lastIndexOf("New-PhaseEvent 'relaunch' 'x' $fresh");
    expect(stalePhase.indexOf('Wait-ExactProcDisappearance')).toBeGreaterThan(stalePhase.indexOf("'kill', '-9'"));
    expect(stalePhase.indexOf('Get-ExactLstatFact')).toBeGreaterThan(stalePhase.indexOf('Wait-ExactProcDisappearance'));
    expect(freshBootstrap).toBeGreaterThan(stalePhase.indexOf('Get-ExactLstatFact'));
    expect(freshAcknowledgement).toBeGreaterThan(freshBootstrap);
    expect(freshValidation).toBeGreaterThan(freshAcknowledgement);
    expect(freshEvent).toBeGreaterThan(freshValidation);
    expect(runner).toContain("Assert-ExactKeys $Value @('pid', 'starttime', 'processName', 'launchNonce', 'runtimeIdentity') $Code");
  });

  test('package recovery uses restoring and cleanup-pending journal states before deleting its backup', () => {
    const runner = source(RUNNER);
    expect(runner).toContain("owner = 'account-provision-lock-package-v2'");
    expect(runner).toContain("phase = 'prepared'");
    expect(runner).toContain("$state.journal.phase = 'restoring'");
    expect(runner).toContain("$state.journal.phase = 'cleanup_pending'");
    expect(runner.indexOf("$state.journal.phase = 'cleanup_pending'"))
      .toBeLessThan(runner.indexOf('[IO.File]::Delete($context.backup)'));
  });

  test.each([
    'after_package_journal',
    'after_package_replace',
    'after_package_materialized',
    'after_package_restore_journal',
    'after_package_restore_action',
    'after_package_cleanup_pending',
    'after_package_backup_delete',
  ])('package recovery resumes exact original after injected crash at %s', (fault) => {
    if (process.env.ACCOUNT_PROVISION_LOCK_VULNERABLE === '1') {
      expect(source(RUNNER)).toContain('PackageRecovery');
      return;
    }
    const fixture = packageRecoveryFixture();
    try {
      expectLibrary('PackageRecovery', { sandboxRoot: fixture.root, operation: 'crash', fault }, 1, 'account_provision_lock_injected_crash');
      expectLibrary('PackageRecovery', { sandboxRoot: fixture.root, operation: 'recover', fault: 'none' }, 0, '"restored":true');
      expect(fs.readFileSync(path.join(fixture.root, 'package.json'))).toEqual(fixture.original);
      expect(fs.existsSync(path.join(fixture.root, '.codex-tmp/account-provision-lock-package-recovery'))).toBe(false);
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test('aggregate cleanup attempts package restore, Android restore, APK recheck, source check, and temp deletion independently', () => {
    if (process.env.ACCOUNT_PROVISION_LOCK_VULNERABLE === '1') {
      expect(source(RUNNER)).toContain('CleanupModel');
      return;
    }
    expectLibrary('CleanupModel', { failures: ['package-restore', 'android-restore'], apkInstallState: 'installed_verified' }, 0, '"cleanupPassed":false');
    const result = runLibrary('CleanupModel', { failures: ['package-restore', 'android-restore'], apkInstallState: 'installed_verified' });
    const parsed = JSON.parse(String(result.stdout)) as { attempted: string[]; failures: string[] };
    expect(parsed.attempted).toEqual([
      'app-stop', 'reverse-remove', 'metro-stop', 'package-restore', 'android-restore',
      'apk-recheck', 'temp-delete', 'repository-check', 'source-check', 'evidence-finalize',
    ]);
    expect(parsed.failures).toEqual(['package-restore', 'android-restore']);
    expect(JSON.parse(String(runLibrary('CleanupModel', {
      failures: [], apkInstallState: 'not_attempted',
    }).stdout))).toMatchObject({ cleanupPassed: true, apkRecheckRequired: false });
    for (const apkInstallState of ['attempting', 'attempted', 'installed_verified', 'unknown']) {
      expect(JSON.parse(String(runLibrary('CleanupModel', {
        failures: [], apkInstallState,
      }).stdout))).toMatchObject({ apkRecheckRequired: true });
    }
    const runner = source(RUNNER);
    expect(runner.indexOf("$script:ApkInstallState = 'attempting'"))
      .toBeLessThan(runner.indexOf("Invoke-Adb @('install'"));

    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'account-lock-owned-snapshot-'));
    try {
      const ownedRelativePath = 'patches/expo-sqlite+16.0.10.patch';
      const ownedPath = path.join(fixtureRoot, ...ownedRelativePath.split('/'));
      fs.mkdirSync(path.dirname(ownedPath), { recursive: true });
      fs.writeFileSync(ownedPath, 'owned-v1');
      fs.writeFileSync(path.join(fixtureRoot, 'unrelated.txt'), 'unrelated-v1');
      const capture = runLibrary('OwnedRepositorySnapshot', {
        sandboxRoot: fixtureRoot,
        ownedRelativePaths: [ownedRelativePath],
        expectedFacts: null,
        stage: 'cleanup',
      });
      expect(capture.status).toBe(0);
      const facts = (JSON.parse(String(capture.stdout)) as { facts: unknown }).facts;

      fs.writeFileSync(path.join(fixtureRoot, 'unrelated.txt'), 'unrelated-v2');
      expectLibrary('OwnedRepositorySnapshot', {
        sandboxRoot: fixtureRoot,
        ownedRelativePaths: [ownedRelativePath],
        expectedFacts: facts,
        stage: 'cleanup',
      }, 0, '"status":"pass"');
      fs.writeFileSync(path.join(fixtureRoot, 'unrelated.txt'), 'unrelated-v3');
      expectLibrary('OwnedRepositorySnapshot', {
        sandboxRoot: fixtureRoot,
        ownedRelativePaths: [ownedRelativePath],
        expectedFacts: facts,
        stage: 'post-publication',
      }, 0, '"status":"pass"');

      fs.writeFileSync(ownedPath, 'owned-v2');
      expectLibrary('OwnedRepositorySnapshot', {
        sandboxRoot: fixtureRoot,
        ownedRelativePaths: [ownedRelativePath],
        expectedFacts: facts,
        stage: 'cleanup',
      }, 1, 'repository_drift');
      expectLibrary('OwnedRepositorySnapshot', {
        sandboxRoot: fixtureRoot,
        ownedRelativePaths: [ownedRelativePath],
        expectedFacts: facts,
        stage: 'post-publication',
      }, 1, 'post_publication_repository_snapshot_failed');

      const invalidOwnedPathSets = [
        [path.join(fixtureRoot, 'rooted.txt')],
        ['file:///owned.txt'],
        ['patches\\owned.txt'],
        ['patches/../owned.txt'],
        ['.'],
        [''],
        [ownedRelativePath, ownedRelativePath],
        ['../descendant-escape.txt'],
      ];
      for (const ownedRelativePaths of invalidOwnedPathSets) {
        expectLibrary('OwnedRepositorySnapshot', {
          sandboxRoot: fixtureRoot,
          ownedRelativePaths,
          expectedFacts: null,
          stage: 'cleanup',
        }, 1, 'owned_repository_snapshot_invalid');
      }

      const reparseTarget = path.join(fixtureRoot, 'reparse-target');
      const reparsePath = path.join(fixtureRoot, 'reparse-owned');
      fs.mkdirSync(reparseTarget);
      fs.symlinkSync(reparseTarget, reparsePath, 'junction');
      expectLibrary('OwnedRepositorySnapshot', {
        sandboxRoot: fixtureRoot,
        ownedRelativePaths: ['reparse-owned'],
        expectedFacts: null,
        stage: 'cleanup',
      }, 1, 'owned_repository_snapshot_invalid');
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
    expect(runner).not.toContain('status --porcelain');
    expect(runner).toContain('Assert-CampaignOwnedCleanupIntegrity');
    expect(runner).toContain('Assert-CampaignOwnedPostPublicationIntegrity');

    const absent = (name: string) => ({ name, kind: 'absent', length: 0, sha256: null });
    const fileFact = (name: string, sha256 = '1'.repeat(64)) => ({
      name, kind: 'file', length: 10, sha256,
    });
    const scopedPaths = [...SEVEN_PATHS, ...CRITICAL_INPUTS];
    const campaignBefore = {
      scope: 'account-provision-lock-campaign-owned-v2',
      packetSha256: 'a'.repeat(64),
      reviewedReceiptSha256: 'b'.repeat(64),
      launcherSha256: 'c'.repeat(64),
      ownedPaths: [fileFact('package.json')],
      criticalInputs: CRITICAL_INPUTS.map((name) => fileFact(name)),
      activatedNativeInputs: ACTIVATED_NATIVE_INPUTS.map((name) => fileFact(name)),
      activatedNativePackageVersion: '16.0.10',
      gitScope: scopedPaths.map((name) => ({
        path: name,
        tracked: true,
        indexMode: '100644',
        indexObjectId: '2'.repeat(40),
        indexStage: 0,
        statusRecordCount: 0,
        statusSha256: '3'.repeat(64),
      })),
      localApk: absent('local-debug-apk'),
      materializationRecovery: absent('android-recovery'),
      packageRecovery: absent('package-recovery'),
      campaignTemp: absent('campaign-temp'),
    };
    const campaignDriftMutations: Record<string, unknown>[] = [];
    for (let index = 0; index < CRITICAL_INPUTS.length; index += 1) {
      for (const [field, value] of [
        ['kind', 'directory'],
        ['length', 11],
        ['sha256', '4'.repeat(64)],
      ] as const) {
        campaignDriftMutations.push({ collection: 'criticalInputs', index, field, value });
      }
    }
    for (let index = 0; index < ACTIVATED_NATIVE_INPUTS.length; index += 1) {
      for (const [field, value] of [
        ['kind', 'directory'],
        ['length', 11],
        ['sha256', '7'.repeat(64)],
      ] as const) {
        campaignDriftMutations.push({ collection: 'activatedNativeInputs', index, field, value });
      }
    }
    for (let index = 0; index < scopedPaths.length; index += 1) {
      for (const [field, value] of [
        ['tracked', false],
        ['indexObjectId', '5'.repeat(40)],
        ['statusSha256', '6'.repeat(64)],
      ] as const) {
        campaignDriftMutations.push({ collection: 'gitScope', index, field, value });
      }
    }
    for (const stage of ['cleanup', 'post-publication']) {
      const matrix = runLibrary('CampaignIntegrityMatrix', {
        before: campaignBefore,
        mutations: campaignDriftMutations,
        stage,
      });
      expect(matrix.status).toBe(0);
      expect(JSON.parse(String(matrix.stdout))).toEqual({
        status: 'pass', rejected: campaignDriftMutations.length,
      });
    }
    for (const critical of CRITICAL_INPUTS) expect(runner).toContain(`'${critical}'`);
    expect(runner).toContain('Get-ScopedGitFacts');
    expect(runner).toContain('$script:CriticalInputs');

    const nativeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'account-lock-native-provenance-'));
    const nativeOriginals = ACTIVATED_NATIVE_INPUTS.map((relative) => ({
      relative,
      bytes: fs.readFileSync(path.join(ROOT, ...relative.split('/'))),
      target: path.join(nativeRoot, ...relative.split('/')),
    }));
    try {
      for (const input of nativeOriginals) {
        fs.mkdirSync(path.dirname(input.target), { recursive: true });
        fs.writeFileSync(input.target, input.bytes, { flag: 'wx' });
      }
      const capture = runLibrary('ActivatedNativeProvenance', {
        sandboxRoot: nativeRoot, expectedFacts: null, stage: 'preflight',
      });
      expect(capture.status).toBe(0);
      const nativeFacts = (JSON.parse(String(capture.stdout)) as { facts: unknown }).facts;

      fs.rmSync(nativeOriginals[0].target);
      expectLibrary('ActivatedNativeProvenance', {
        sandboxRoot: nativeRoot, expectedFacts: null, stage: 'preflight',
      }, 1, 'activated_native_provenance_invalid');
      fs.writeFileSync(nativeOriginals[0].target, nativeOriginals[0].bytes, { flag: 'wx' });

      fs.rmSync(nativeOriginals[0].target);
      fs.mkdirSync(nativeOriginals[0].target);
      expectLibrary('ActivatedNativeProvenance', {
        sandboxRoot: nativeRoot, expectedFacts: null, stage: 'preflight',
      }, 1, 'activated_native_provenance_invalid');
      fs.rmSync(nativeOriginals[0].target, { recursive: true });
      fs.writeFileSync(nativeOriginals[0].target, nativeOriginals[0].bytes, { flag: 'wx' });

      const packageIdentity = JSON.parse(nativeOriginals[1].bytes.toString('utf8')) as Record<string, unknown>;
      fs.writeFileSync(nativeOriginals[1].target, JSON.stringify({ ...packageIdentity, version: '16.0.9' }));
      expectLibrary('ActivatedNativeProvenance', {
        sandboxRoot: nativeRoot, expectedFacts: null, stage: 'preflight',
      }, 1, 'activated_native_package_version_invalid');
      fs.writeFileSync(nativeOriginals[1].target, nativeOriginals[1].bytes);

      const wrongSource = Buffer.from(nativeOriginals[0].bytes);
      wrongSource[wrongSource.length - 1] ^= 1;
      fs.writeFileSync(nativeOriginals[0].target, wrongSource);
      expectLibrary('ActivatedNativeProvenance', {
        sandboxRoot: nativeRoot, expectedFacts: null, stage: 'preflight',
      }, 1, 'activated_native_provenance_invalid');
      fs.writeFileSync(nativeOriginals[0].target, nativeOriginals[0].bytes);

      fs.writeFileSync(nativeOriginals[0].target, wrongSource);
      expectLibrary('ActivatedNativeProvenance', {
        sandboxRoot: nativeRoot, expectedFacts: nativeFacts, stage: 'build',
      }, 1, 'activated_native_provenance_build_drift');
      fs.writeFileSync(nativeOriginals[0].target, nativeOriginals[0].bytes);

      for (const input of nativeOriginals) {
        const drifted = Buffer.concat([input.bytes, Buffer.from('\n')]);
        fs.writeFileSync(input.target, drifted);
        expectLibrary('ActivatedNativeProvenance', {
          sandboxRoot: nativeRoot, expectedFacts: nativeFacts, stage: 'cleanup',
        }, 1, 'repository_drift');
        expectLibrary('ActivatedNativeProvenance', {
          sandboxRoot: nativeRoot, expectedFacts: nativeFacts, stage: 'post-publication',
        }, 1, 'post_publication_repository_snapshot_failed');
        fs.writeFileSync(input.target, input.bytes);
      }
    } finally {
      fs.rmSync(nativeRoot, { recursive: true, force: true });
    }

    const dexFixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'account-lock-apk-dex-'));
    try {
      const valid = createBindingDex();
      const malformedCodeOffset = Buffer.from(valid.bytes);
      malformedCodeOffset.fill(0x80, valid.codeOffsetField, valid.codeOffsetField + 5);
      finalizeDexIntegrity(malformedCodeOffset);
      const instructionExtentBeyondFile = Buffer.from(valid.bytes);
      instructionExtentBeyondFile.writeUInt32LE(12, valid.codeOffset + 12);
      finalizeDexIntegrity(instructionExtentBeyondFile);
      const missingMap = Buffer.from(valid.bytes);
      missingMap.writeUInt32LE(0, 52);
      finalizeDexIntegrity(missingMap);
      const misalignedMapOffset = Buffer.from(valid.bytes);
      misalignedMapOffset.writeUInt32LE(valid.mapOffset + 2, 52);
      finalizeDexIntegrity(misalignedMapOffset);
      const truncatedMap = Buffer.from(valid.bytes);
      truncatedMap.writeUInt32LE(0xffffffff, valid.mapOffset);
      finalizeDexIntegrity(truncatedMap);
      const overlappingMapList = Buffer.from(valid.bytes);
      overlappingMapList.writeUInt32LE(valid.mapOffset + 16, valid.mapItemOffsets[0x2001] + 8);
      finalizeDexIntegrity(overlappingMapList);
      const duplicateMapType = Buffer.from(valid.bytes);
      duplicateMapType.writeUInt16LE(0x1000, valid.mapItemOffsets[0x2001]);
      finalizeDexIntegrity(duplicateMapType);
      const inconsistentCodeMap = Buffer.from(valid.bytes);
      inconsistentCodeMap.writeUInt32LE(valid.codeOffset + 4, valid.mapItemOffsets[0x2001] + 8);
      finalizeDexIntegrity(inconsistentCodeMap);
      const inconsistentCodeMapCount = Buffer.from(valid.bytes);
      inconsistentCodeMapCount.writeUInt32LE(2, valid.mapItemOffsets[0x2001] + 4);
      finalizeDexIntegrity(inconsistentCodeMapCount);
      const zeroInstructions = Buffer.from(valid.bytes);
      zeroInstructions.writeUInt32LE(0, valid.codeOffset + 12);
      finalizeDexIntegrity(zeroInstructions);
      const tryRangeOverflow = Buffer.from(valid.bytes);
      tryRangeOverflow.writeUInt16LE(6, valid.tryItemOffset + 4);
      finalizeDexIntegrity(tryRangeOverflow);
      const handlerTargetOverflow = Buffer.from(valid.bytes);
      handlerTargetOverflow[valid.handlerListOffset + 2] = 5;
      finalizeDexIntegrity(handlerTargetOverflow);
      const invalidHandlerOffset = Buffer.from(valid.bytes);
      invalidHandlerOffset.writeUInt16LE(2, valid.tryItemOffset + 6);
      finalizeDexIntegrity(invalidHandlerOffset);
      const invalidChecksum = Buffer.from(valid.bytes);
      invalidChecksum[8] ^= 1;
      const invalidSignature = Buffer.from(valid.bytes);
      invalidSignature[12] ^= 1;
      writeDexChecksum(invalidSignature);

      const writeApk = (
        name: string,
        entries: readonly { readonly name: string; readonly bytes: Buffer }[],
      ): string => {
        const apkPath = path.join(dexFixtureRoot, `${name}.apk`);
        fs.writeFileSync(apkPath, createStoredZip(entries));
        return apkPath;
      };
      const expectActualDexInvalid = (
        name: string,
        entries: readonly { readonly name: string; readonly bytes: Buffer }[],
      ): void => {
        const result = runLibrary('ApkDexSurfacePath', { apkPath: writeApk(name, entries) });
        expect(result.status).toBe(1);
        expect(String(result.stderr).trim()).toBe('apk_dex_surface_invalid');
      };

      const validResult = runLibrary('ApkDexSurfacePath', {
        apkPath: writeApk('valid', [{ name: 'classes.dex', bytes: valid.bytes }]),
      });
      expect(validResult.status).toBe(0);
      expect(JSON.parse(String(validResult.stdout))).toMatchObject({
        schemaVersion: 1,
        bindingDexName: 'classes.dex',
        dexEntryCount: 1,
      });
      const invalidDexes = [
        ['missing-map', missingMap],
        ['misaligned-map-offset', misalignedMapOffset],
        ['truncated-map', truncatedMap],
        ['overlapping-map-list', overlappingMapList],
        ['duplicate-map-type', duplicateMapType],
        ['inconsistent-code-map', inconsistentCodeMap],
        ['inconsistent-code-map-count', inconsistentCodeMapCount],
        ['zero-instructions', zeroInstructions],
        ['truncated-padding', truncateDex(valid, valid.paddingOffset + 1)],
        ['truncated-try-item', truncateDex(valid, valid.tryItemOffset + 4)],
        ['truncated-catch-handlers', truncateDex(valid, valid.handlerListOffset)],
        ['try-range-overflow', tryRangeOverflow],
        ['handler-target-overflow', handlerTargetOverflow],
        ['invalid-handler-offset', invalidHandlerOffset],
        ['code-offset-eof', withDexCodeOffset(valid, valid.bytes.length)],
        ['code-offset-eof-minus-one', withDexCodeOffset(valid, valid.bytes.length - 1)],
        ['truncated-code-item-header', withDexCodeOffset(valid, valid.bytes.length - 14)],
        ['instruction-extent-beyond-file', instructionExtentBeyondFile],
        ['malformed-code-offset', malformedCodeOffset],
        ['misaligned-code-offset', withDexCodeOffset(valid, valid.codeOffset + 1)],
        ['invalid-checksum', invalidChecksum],
        ['invalid-signature', invalidSignature],
      ] as const;
      for (const [name, bytes] of invalidDexes) {
        expectActualDexInvalid(name, [{ name: 'classes.dex', bytes }]);
      }
      expectActualDexInvalid('partial-surface', [{
        name: 'classes.dex', bytes: createBindingDex(false).bytes,
      }]);
      expectActualDexInvalid('duplicate-surface', [
        { name: 'classes.dex', bytes: valid.bytes },
        { name: 'classes2.dex', bytes: valid.bytes },
      ]);
    } finally {
      fs.rmSync(dexFixtureRoot, { recursive: true, force: true });
    }

    const requiredStrings = ['acquireAccountProvisionLockAsync', 'releaseAsync'];
    const requiredClasses = [
      'Lexpo/modules/sqlite/SQLiteModule;',
      'Lexpo/modules/sqlite/NativeAccountProvisionLock;',
    ];
    const requiredMethods = [
      'Lexpo/modules/sqlite/SQLiteModule;->acquireAccountProvisionLock(Ljava/lang/String;)' +
        'Lexpo/modules/sqlite/NativeAccountProvisionLock;',
    ];
    const emptyDex = {
      name: 'classes.dex', valid: true, strings: [], classDescriptors: [], methods: [],
    };
    const bindingDex = {
      name: 'classes3.dex', valid: true, strings: requiredStrings,
      classDescriptors: requiredClasses, methods: requiredMethods,
    };
    expectLibrary('ApkDexSurface', { dexEntries: [emptyDex, bindingDex] }, 0, '"status":"pass"');
    for (const missing of [
      { ...bindingDex, strings: requiredStrings.slice(1) },
      { ...bindingDex, strings: requiredStrings.slice(0, 1) },
      { ...bindingDex, classDescriptors: requiredClasses.slice(1) },
      { ...bindingDex, classDescriptors: requiredClasses.slice(0, 1) },
      { ...bindingDex, methods: [] },
    ]) expectLibrary('ApkDexSurface', { dexEntries: [emptyDex, missing] }, 1, 'apk_dex_surface_invalid');
    expectLibrary('ApkDexSurface', {
      dexEntries: [{ ...emptyDex, valid: false }, bindingDex],
    }, 1, 'apk_dex_surface_invalid');
    expectLibrary('ApkDexSurface', {
      dexEntries: [emptyDex, bindingDex, {
        ...emptyDex, name: 'classes4.dex', strings: ['releaseAsync'],
      }],
    }, 1, 'apk_dex_surface_invalid');
    expectLibrary('ApkDexSurface', {
      dexEntries: [emptyDex, bindingDex, { ...bindingDex, name: 'classes4.dex' }],
    }, 1, 'apk_dex_surface_invalid');

    const manifest = (component: string): string => [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="app.phraseman">',
      `<application>${component}</application></manifest>`,
    ].join('');
    const activity = (attributes = '', child = ''): string => [
      '<activity android:name="app.phraseman.AccountV2ProbeActivity"',
      ' android:exported="false" android:launchMode="singleTask"',
      ` android:process=":account_v2_probe"${attributes}>${child}</activity>`,
    ].join('');
    expectLibrary('MergedDebugManifest', { xml: manifest(activity()) }, 0, '"componentCount":1');
    for (const invalidManifest of [
      manifest(''),
      manifest(activity() + activity()),
      manifest(activity() + [
        '<activity-alias android:name="app.phraseman.Alias"',
        ' android:targetActivity="app.phraseman.AccountV2ProbeActivity" />',
      ].join('')),
      manifest(activity(' android:enabled="true"', '<intent-filter />')),
      manifest(activity().replace('android:exported="false"', 'android:exported="true"')),
      manifest(activity().replace('android:launchMode="singleTask"', 'android:launchMode="standard"')),
      manifest(activity().replace('android:process=":account_v2_probe"', 'android:process=":wrong"')),
      manifest(activity().replace(' android:exported="false"', '')),
    ]) expectLibrary('MergedDebugManifest', { xml: invalidManifest }, 1, 'merged_debug_manifest_invalid');

    expect(runner.indexOf('Open-ActivatedNativeInputHolds'))
      .toBeLessThan(runner.indexOf('Invoke-BoundedHostGates'));
    const buildFunction = runner.indexOf('function Invoke-AndroidDebugBuild');
    expect(runner.indexOf('Assert-ActivatedNativeProvenanceAfterBuild', buildFunction))
      .toBeGreaterThan(buildFunction);
    expect(runner.indexOf('$script:ApkDexSurfaceFact = Assert-ApkDexSurface', buildFunction))
      .toBeGreaterThan(buildFunction);
    expect(runner.indexOf('$script:MergedDebugManifestFact = Get-MergedDebugManifestFact', buildFunction))
      .toBeGreaterThan(buildFunction);
    for (const token of [
      'activatedNativeInputs', 'activatedNativeProvenance', 'apkDexSurface', 'mergedDebugManifest',
    ]) expect(runner).toContain(token);
  });

  test('library phase validation rejects unknown/missing events and enforces killed-waiter boundaries', () => {
    if (process.env.ACCOUNT_PROVISION_LOCK_VULNERABLE === '1') {
      expect(source(RUNNER)).toContain('PhaseTranscript');
      return;
    }
    const owner = { pid: 1, starttime: '10', processName: 'app.phraseman', launchNonce: 'a'.repeat(32), runtimeIdentity: 'b'.repeat(32) };
    const waiter = { pid: 2, starttime: '20', processName: 'app.phraseman:account_v2_probe', launchNonce: 'c'.repeat(32), runtimeIdentity: 'd'.repeat(32) };
    const fresh = { ...waiter, pid: 3, starttime: '30', launchNonce: 'e'.repeat(32), runtimeIdentity: 'f'.repeat(32) };
    const event = (kind: string, sequence: number, binding: Record<string, unknown>, extras = {}) => ({
      kind, sequence, timestamp: sequence * 10, identity: 'x', binding, ...extras,
    });
    const observation = (sequence: number) => event('contended_observation', sequence, owner, {
      waiter, ownerLive: true, ownerReportsOwnership: true, waiterLive: true, waiterAcquired: false,
      ownershipToken: sequence === 4 ? '1'.repeat(32) : '2'.repeat(32),
    });
    const events = [
      event('attempted', 1, owner), event('acquired', 2, owner), event('attempted', 3, waiter),
      observation(4), observation(5), event('sigkill_sent', 6, waiter), event('proc_disappeared', 7, waiter),
      event('owner_live_owned', 8, owner, { live: true, owns: true, ownershipToken: '3'.repeat(32) }),
      event('killed_waiter_control_rejected', 9, waiter), event('control_release', 10, owner),
      event('release_requested', 11, owner), event('released', 12, owner), event('pass', 13, owner),
      event('relaunch', 14, fresh), event('attempted', 15, fresh), event('acquired', 16, fresh),
      event('release_requested', 17, fresh), event('released', 18, fresh), event('pass', 19, fresh),
    ];
    expectLibrary('PhaseTranscript', { phase: 'waiter-death', events }, 0, '"status":"pass"');
    expectLibrary('PhaseTranscript', {
      phase: 'waiter-death', events: events.map((value, index) => index === 8 ? { ...value, kind: 'unknown' } : value),
    }, 1, 'account_provision_lock_phase_invalid');
    expectLibrary('PhaseTranscript', {
      phase: 'waiter-death', events: events.filter((value) => value.kind !== 'killed_waiter_control_rejected'),
    }, 1, 'account_provision_lock_phase_invalid');
  });

  test('library checkpoint validation rejects acquired-between and release-before-second-observation', () => {
    if (process.env.ACCOUNT_PROVISION_LOCK_VULNERABLE === '1') {
      expect(source(RUNNER)).toContain('ContendedCheckpoint');
      return;
    }
    const base = {
      owner: { pid: 1, starttime: '10', processName: 'app.phraseman', launchNonce: 'a'.repeat(32), runtimeIdentity: 'b'.repeat(32) },
      waiter: { pid: 2, starttime: '20', processName: 'app.phraseman:account_v2_probe', launchNonce: 'c'.repeat(32), runtimeIdentity: 'd'.repeat(32) },
      observations: [
        { sequence: 3, timestamp: 30, ownerPid: 1, ownerStarttime: '10', waiterPid: 2, waiterStarttime: '20', ownerOwned: true, waiterAcquired: false, ownershipToken: '1'.repeat(32) },
        { sequence: 5, timestamp: 50, ownerPid: 1, ownerStarttime: '10', waiterPid: 2, waiterStarttime: '20', ownerOwned: true, waiterAcquired: false, ownershipToken: '2'.repeat(32) },
      ],
      events: [{ kind: 'acquired', sequence: 4, actor: 'waiter' }],
    };
    expectLibrary('ContendedCheckpoint', base, 1, 'account_provision_lock_checkpoint_invalid');
    expectLibrary('ContendedCheckpoint', {
      ...base,
      events: [{ kind: 'control_release', sequence: 4, actor: 'owner' }],
    }, 1, 'account_provision_lock_checkpoint_invalid');
  });

  test('library killed-waiter validation requires disappearance then exact live owning original owner', () => {
    if (process.env.ACCOUNT_PROVISION_LOCK_VULNERABLE === '1') {
      expect(source(RUNNER)).toContain('owner_live_owned');
      return;
    }
    const owner = { pid: 1, starttime: '10', processName: 'app.phraseman', launchNonce: 'a'.repeat(32), runtimeIdentity: 'b'.repeat(32) };
    const waiter = { pid: 2, starttime: '20', processName: 'app.phraseman:account_v2_probe', launchNonce: 'c'.repeat(32), runtimeIdentity: 'd'.repeat(32) };
    const event = (kind: string, sequence: number, binding: Record<string, unknown>, extras = {}) => ({ kind, sequence, binding, ...extras });
    const valid = {
      owner,
      waiter,
      events: [
        event('proc_disappeared', 4, waiter),
        event('owner_live_owned', 5, owner, { live: true, owns: true, ownershipToken: '1'.repeat(32) }),
        event('control_release', 6, owner),
        event('relaunch', 7, { ...waiter, pid: 3, starttime: '30', launchNonce: 'e'.repeat(32), runtimeIdentity: 'f'.repeat(32) }),
      ],
    };
    expectLibrary('KilledWaiterBoundary', valid, 0, '"status":"pass"');
    expectLibrary('KilledWaiterBoundary', {
      ...valid,
      events: [event('control_release', 3, owner), ...valid.events],
    }, 1, 'account_provision_lock_killed_waiter_invalid');
    expectLibrary('KilledWaiterBoundary', {
      ...valid,
      events: valid.events.filter((candidate) => candidate.kind !== 'owner_live_owned'),
    }, 1, 'account_provision_lock_killed_waiter_invalid');
  });

  test('library stale evidence rejects symlink substitution and changed paths', () => {
    if (process.env.ACCOUNT_PROVISION_LOCK_VULNERABLE === '1') {
      expect(source(RUNNER)).toContain('StaleLockEvidence');
      return;
    }
    const noBackupFilesDir = '/data/user/0/app.phraseman/no_backup';
    const lockPath = `${noBackupFilesDir}/account-sqlite-provision-locks/accounts-v2-g-${'a'.repeat(64)}.db.provision.lock`;
    const exactHash = crypto.createHash('sha256').update(lockPath, 'utf8').digest('hex');
    const fact = (checkpoint: string, sequence: number, pathHash = exactHash, symlink = false) => ({
      checkpoint, sequence, identity: 'x', pathHash, exists: true, kind: 'regular', symlink,
    });
    expectLibrary('StaleLockEvidence', {
      staleLockFilePresent: true,
      identity: 'x',
      noBackupFilesDir,
      acquisitionSequence: 2,
      facts: [fact('before_acquire', 1), fact('while_acquired', 3, exactHash, true)],
    }, 1, 'account_provision_lock_stale_file_invalid');
    expectLibrary('StaleLockEvidence', {
      staleLockFilePresent: true,
      identity: 'x',
      noBackupFilesDir,
      acquisitionSequence: 2,
      facts: [fact('before_acquire', 1), fact('while_acquired', 3, '2'.repeat(64))],
    }, 1, 'account_provision_lock_stale_file_invalid');
    expectLibrary('StaleLockEvidence', {
      staleLockFilePresent: true,
      identity: 'y',
      noBackupFilesDir,
      acquisitionSequence: 2,
      facts: [fact('before_acquire', 1), fact('while_acquired', 3)],
    }, 1, 'account_provision_lock_stale_file_invalid');
  });

  test.each([
    'after_journal',
    'after_manifest_replace',
    'after_activity_replace',
    'before_manifest_restore',
    'after_manifest_restore',
    'before_activity_restore',
    'after_activity_restore',
    'after_restoration_before_cleanup',
  ])('materialization outer recovery restores exact originals for injected %s', (fault) => {
    if (process.env.ACCOUNT_PROVISION_LOCK_VULNERABLE === '1') {
      expect(source(RUNNER)).toContain('Materialization');
      return;
    }
    const fixture = materializationFixture();
    try {
      const payload: Record<string, unknown> = { ...fixture.payload, fault };
      expectLibrary('Materialization', payload, 0, '"restored":true');
      expect(fs.readFileSync(payload.targetManifest as string)).toEqual(fixture.originalManifest);
      expect(fs.existsSync(payload.targetActivity as string)).toBe(false);
      expect(fs.existsSync(payload.backupRoot as string)).toBe(false);
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test.each(['after_journal', 'after_manifest_replace', 'after_activity_replace'])(
    'startup recovery resumes an interrupted durable state at %s',
    (fault) => {
      if (process.env.ACCOUNT_PROVISION_LOCK_VULNERABLE === '1') {
        expect(source(RUNNER)).toContain('Materialization');
        return;
      }
      const fixture = materializationFixture();
      try {
        const crashPayload: Record<string, unknown> = { ...fixture.payload, operation: 'crash', fault };
        expectLibrary('Materialization', crashPayload, 1, 'account_provision_lock_injected_crash');
        expect(fs.existsSync(crashPayload.journalPath as string)).toBe(true);
        expectLibrary('Materialization', { ...fixture.payload, operation: 'recover', fault: 'none' }, 0, '"restored":true');
        expect(fs.readFileSync(crashPayload.targetManifest as string)).toEqual(fixture.originalManifest);
        expect(fs.existsSync(crashPayload.targetActivity as string)).toBe(false);
        expect(fs.existsSync(crashPayload.backupRoot as string)).toBe(false);
      } finally {
        fs.rmSync(fixture.root, { recursive: true, force: true });
      }
    },
  );

  test('restoration journals commit restored state only after CAS and recover cleanup with an already-deleted backup', () => {
    if (process.env.ACCOUNT_PROVISION_LOCK_VULNERABLE === '1') {
      expect(source(RUNNER)).toContain('cleanup_pending');
      return;
    }
    const prior = process.env.ACCOUNT_PROVISION_LOCK_EXISTING_ACTIVITY;
    process.env.ACCOUNT_PROVISION_LOCK_EXISTING_ACTIVITY = '1';
    const fixture = materializationFixture();
    if (prior === undefined) delete process.env.ACCOUNT_PROVISION_LOCK_EXISTING_ACTIVITY;
    else process.env.ACCOUNT_PROVISION_LOCK_EXISTING_ACTIVITY = prior;
    try {
      const actionCrash = { ...fixture.payload, operation: 'crash', fault: 'after_manifest_restore_action' };
      expectLibrary('Materialization', actionCrash, 1, 'account_provision_lock_injected_crash');
      const journal = JSON.parse(fs.readFileSync(fixture.payload.journalPath as string, 'utf8')) as {
        phase: string;
        entries: { restored: boolean }[];
      };
      expect(journal.phase).toBe('restoring');
      expect(journal.entries[0].restored).toBe(false);
      expectLibrary('Materialization', { ...fixture.payload, operation: 'recover', fault: 'none' }, 0, '"restored":true');

      const cleanupFixture = materializationFixture();
      try {
        const cleanupCrash = { ...cleanupFixture.payload, operation: 'crash', fault: 'after_manifest_backup_delete' };
        expectLibrary('Materialization', cleanupCrash, 1, 'account_provision_lock_injected_crash');
        const cleanupJournal = JSON.parse(fs.readFileSync(cleanupFixture.payload.journalPath as string, 'utf8')) as {
          phase: string;
          entries: { backupPath: string | null; restored: boolean }[];
        };
        expect(cleanupJournal.phase).toBe('cleanup_pending');
        expect(cleanupJournal.entries.every((entry) => entry.restored)).toBe(true);
        expect(fs.existsSync(cleanupJournal.entries[0].backupPath as string)).toBe(false);
        expectLibrary('Materialization', { ...cleanupFixture.payload, operation: 'recover', fault: 'none' }, 0, '"restored":true');
        expect(fs.existsSync(cleanupFixture.payload.backupRoot as string)).toBe(false);
      } finally {
        fs.rmSync(cleanupFixture.root, { recursive: true, force: true });
      }
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test.each(['after_journal_update_temp', 'after_journal_update_replace'])(
    'startup recovery rejects ambiguous atomic-journal crash artifact at %s without changing any byte',
    (fault) => {
      if (process.env.ACCOUNT_PROVISION_LOCK_VULNERABLE === '1') {
        expect(source(RUNNER)).toContain(fault);
        return;
      }
      const fixture = materializationFixture();
      try {
        const crashPayload: Record<string, unknown> = { ...fixture.payload, operation: 'crash', fault };
        expectLibrary('Materialization', crashPayload, 1, 'account_provision_lock_injected_crash');
        const recovery = crashPayload.backupRoot as string;
        const files = fs.readdirSync(recovery).map((name) => path.join(recovery, name)).sort();
        expect(files.some((file) => file.endsWith('.update.tmp') || file.endsWith('.update.backup'))).toBe(true);
        const before = new Map(files.map((file) => [file, shaFile(file)]));
        expectLibrary('Materialization', { ...fixture.payload, operation: 'recover', fault: 'none' }, 1, 'materialization_preserve_all_stop');
        expect(fs.readdirSync(recovery).map((name) => path.join(recovery, name)).sort()).toEqual(files);
        for (const [file, hash] of before) expect(shaFile(file)).toBe(hash);
      } finally {
        fs.rmSync(fixture.root, { recursive: true, force: true });
      }
    },
  );

  test('startup recovery inventories and preserves an unexpected recovery artifact before mutation', () => {
    if (process.env.ACCOUNT_PROVISION_LOCK_VULNERABLE === '1') {
      expect(source(RUNNER)).toContain('materialization_recovery_inventory_invalid');
      return;
    }
    const fixture = materializationFixture();
    try {
      const crashPayload: Record<string, unknown> = { ...fixture.payload, operation: 'crash', fault: 'after_journal' };
      expectLibrary('Materialization', crashPayload, 1, 'account_provision_lock_injected_crash');
      const extra = path.join(crashPayload.backupRoot as string, 'foreign.bin');
      fs.writeFileSync(extra, 'foreign', { flag: 'wx' });
      const files = fs.readdirSync(crashPayload.backupRoot as string).map((name) => path.join(crashPayload.backupRoot as string, name)).sort();
      const before = new Map(files.map((file) => [file, shaFile(file)]));
      expectLibrary('Materialization', { ...fixture.payload, operation: 'recover', fault: 'none' }, 1, 'materialization_preserve_all_stop');
      for (const [file, hash] of before) expect(shaFile(file)).toBe(hash);
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test.each(['journal', 'backup', 'target'])(
    'startup recovery rejects %s tampering and preserves every recovery byte',
    (tamper) => {
      if (process.env.ACCOUNT_PROVISION_LOCK_VULNERABLE === '1') {
        expect(source(RUNNER)).toContain('preserveAll');
        return;
      }
      const fixture = materializationFixture();
      try {
        const crashPayload: Record<string, unknown> = {
          ...fixture.payload,
          operation: 'crash',
          fault: 'after_activity_replace',
        };
        expectLibrary('Materialization', crashPayload, 1, 'account_provision_lock_injected_crash');
        const journalPath = crashPayload.journalPath as string;
        const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8')) as {
          entries: { backupPath: string | null }[];
        };
        if (tamper === 'journal') fs.appendFileSync(journalPath, ' ');
        if (tamper === 'backup') fs.appendFileSync(journal.entries[0].backupPath as string, 'tamper');
        if (tamper === 'target') fs.appendFileSync(crashPayload.targetManifest as string, 'tamper');
        const before = new Map<string, string>();
        for (const file of [
          journalPath,
          crashPayload.targetManifest as string,
          crashPayload.targetActivity as string,
          ...journal.entries.map((entry) => entry.backupPath).filter((value): value is string => value !== null),
        ]) {
          before.set(file, shaFile(file));
        }
        expectLibrary('Materialization', { ...fixture.payload, operation: 'recover', fault: 'none' }, 1, 'materialization_preserve_all_stop');
        for (const [file, hash] of before) expect(shaFile(file)).toBe(hash);
      } finally {
        fs.rmSync(fixture.root, { recursive: true, force: true });
      }
    },
  );

  test('quotes every adb remote-shell argument as one POSIX literal transport command', () => {
    const launchUrl = 'phraseman://_account_v2_provision_lock_probe?command=launch&role=holder&identity=x&packageName=app.phraseman&processName=app.phraseman&pid=101&starttime=202&launchNonce=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const controlUrl = 'phraseman://_account_v2_provision_lock_probe?command=release&packageName=app.phraseman&processName=app.phraseman&pid=101&starttime=202&launchNonce=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&runtimeIdentity=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const launch = runLibrary('AdbTransport', {
      arguments: ['shell', 'am', 'start', '-W', '-d', launchUrl, 'app.phraseman'],
    });
    expect(launch.status).toBe(0);
    expect(JSON.parse(String(launch.stdout))).toEqual({
      status: 'pass',
      hostArguments: ['shell', `'am' 'start' '-W' '-d' '${launchUrl}' 'app.phraseman'`],
    });
    const control = runLibrary('AdbTransport', {
      arguments: ['shell', 'am', 'start', '-W', '-d', controlUrl, 'app.phraseman'],
    });
    expect(control.status).toBe(0);
    expect(JSON.parse(String(control.stdout))).toEqual({
      status: 'pass',
      hostArguments: ['shell', `'am' 'start' '-W' '-d' '${controlUrl}' 'app.phraseman'`],
    });
    const stat = runLibrary('AdbTransport', {
      arguments: ['shell', 'run-as', 'app.phraseman', 'stat', '-c', '%F|%N', '--', '/data/user/0/app.phraseman/files/SQLite/accounts-v2/account-v2.provision.lock'],
    });
    expect(stat.status).toBe(0);
    expect(JSON.parse(String(stat.stdout))).toEqual({
      status: 'pass',
      hostArguments: ['shell', "'run-as' 'app.phraseman' 'stat' '-c' '%F|%N' '--' '/data/user/0/app.phraseman/files/SQLite/accounts-v2/account-v2.provision.lock'"],
    });
  });

  test('reduces only finite JS diagnostic codes and never treats them as lifecycle acceptance', () => {
    const binding = {
      processName: 'app.phraseman', pid: 101,
      starttime: '9001', launchNonce: 'a'.repeat(32), runtimeIdentity: 'b'.repeat(32),
    };
    const diagnosticBinding = [
      'app.phraseman', binding.processName, String(binding.pid), binding.starttime,
      binding.launchNonce, binding.runtimeIdentity,
    ].join('|');
    const safe = runLibrary('DiagnosticReducer', {
      lines: ['I/ReactNativeJS( 101): account_provision_lock_native_unsupported'],
      binding,
    });
    expect(safe.status).toBe(0);
    expect(JSON.parse(String(safe.stdout))).toEqual({
      status: 'pass', failureCode: 'account_provision_lock_native_unsupported',
      databaseRootDiagnostic: { schemaVersion: 1, category: 'unobserved' },
    });
    const invalidRoot = runLibrary('DiagnosticReducer', {
      lines: [
        `I/ReactNativeJS( 101): account_provision_lock_database_root_diagnostic|1|android_ce_user_nonzero|${diagnosticBinding}`,
        'I/ReactNativeJS( 101): account_provision_lock_database_root_invalid',
      ],
      binding,
    });
    expect(invalidRoot.status).toBe(0);
    expect(JSON.parse(String(invalidRoot.stdout))).toEqual({
      status: 'pass', failureCode: 'account_provision_lock_database_root_invalid',
      databaseRootDiagnostic: { schemaVersion: 1, category: 'android_ce_user_nonzero' },
    });
    for (const lines of [
      ['I/ReactNativeJS( 101): account_provision_lock_unknown'],
      ['I/ReactNativeJS( 101): C:\\secret\\key.txt bearer-token'],
      ['I/ReactNativeJS( 101): account_provision_lock_acquired|app.phraseman|hostile'],
    ]) {
      const reduced = runLibrary('DiagnosticReducer', { lines, binding });
      expect(reduced.status).toBe(0);
      expect(JSON.parse(String(reduced.stdout))).toEqual({
        status: 'pass', failureCode: 'account_provision_lock_runtime_failed',
        databaseRootDiagnostic: { schemaVersion: 1, category: 'unobserved' },
      });
      expect(String(reduced.stdout)).not.toContain('secret');
      expect(String(reduced.stdout)).not.toContain('bearer-token');
      expect(String(reduced.stdout)).not.toContain('hostile');
    }
    const rootFailure = 'I/ReactNativeJS( 101): account_provision_lock_database_root_invalid';
    const validDiagnostic = `I/ReactNativeJS( 101): account_provision_lock_database_root_diagnostic|1|file_uri|${diagnosticBinding}`;
    const conflictingDiagnostic = `I/ReactNativeJS( 101): account_provision_lock_database_root_diagnostic|1|legacy_alias|${diagnosticBinding}`;
    const mismatchedTuple = `I/ReactNativeJS( 101): account_provision_lock_database_root_diagnostic|1|file_uri|app.phraseman|app.phraseman|102|9001|${binding.launchNonce}|${binding.runtimeIdentity}`;
    for (const lines of [
      [rootFailure],
      [validDiagnostic, validDiagnostic, rootFailure],
      [validDiagnostic, conflictingDiagnostic, rootFailure],
      [`${validDiagnostic}|C:\\secret\\key.txt`, rootFailure],
      [mismatchedTuple, rootFailure],
      [`I/ReactNativeJS( 101): account_provision_lock_database_root_diagnostic|2|file_uri|${diagnosticBinding}`, rootFailure],
    ]) {
      const reduced = runLibrary('DiagnosticReducer', { lines, binding });
      expect(reduced.status).toBe(0);
      expect(JSON.parse(String(reduced.stdout))).toEqual({
        status: 'pass',
        failureCode: 'account_provision_lock_database_root_invalid',
        databaseRootDiagnostic: { schemaVersion: 1, category: 'unobserved' },
      });
      expect(String(reduced.stdout)).not.toMatch(/secret|key\.txt/u);
    }
    const runner = source(RUNNER);
    const bindingValidator = runner.slice(
      runner.indexOf('function Assert-MarkerPayloadBinding'),
      runner.indexOf('function Wait-LaunchAcknowledgement'),
    );
    expect(bindingValidator).not.toMatch(/Diagnostic|failureCode/u);
    expect(bindingValidator).not.toContain('account_provision_lock_database_root_diagnostic');
  });

  test('runner failure envelopes allowlist codes and derive a fixed correlation without raw data', () => {
    const reviewedReceiptSha256 = 'b'.repeat(64);
    const unobservedDiagnostic = { schemaVersion: 1, category: 'unobserved' };
    const emptyCleanupReceipt = { failures: [] };
    const cleanupFailureOrder = [
      'app-stop', 'reverse-remove', 'metro-stop', 'package-restore', 'android-restore',
      'apk-recheck', 'temp-delete', 'repository-check', 'source-check', 'evidence-finalize',
    ];
    const safe = runLibrary('FailureEnvelope', {
      candidateCode: 'primary_launch_failed',
      observedJsFailureCode: 'account_provision_lock_runtime_failed',
      observedDatabaseRootDiagnostic: unobservedDiagnostic,
      stage: 'android-account-provision-lock-campaign',
      cleanupComplete: true,
      cleanupReceipt: emptyCleanupReceipt,
      reviewedReceiptSha256,
    });
    expect(safe.status).toBe(0);
    const safeValue = JSON.parse(String(safe.stdout)) as Record<string, unknown>;
    expect(safeValue).toEqual({
      schemaVersion: 1,
      status: 'failure',
      failureCode: 'primary_launch_failed',
      stage: 'android-account-provision-lock-campaign',
      cleanupFailed: false,
      cleanupFailures: [],
      databaseRootDiagnostic: unobservedDiagnostic,
      correlation: expect.stringMatching(/^[0-9a-f]{64}$/u),
    });
    const jsFailure = runLibrary('FailureEnvelope', {
      candidateCode: 'marker_observation_deadline',
      observedJsFailureCode: 'account_provision_lock_acquire_failed',
      observedDatabaseRootDiagnostic: unobservedDiagnostic,
      stage: 'android-account-provision-lock-campaign',
      cleanupComplete: true,
      cleanupReceipt: emptyCleanupReceipt,
      reviewedReceiptSha256,
    });
    expect(jsFailure.status).toBe(0);
    expect(JSON.parse(String(jsFailure.stdout))).toEqual({
      schemaVersion: 1,
      status: 'failure',
      failureCode: 'account_provision_lock_acquire_failed',
      stage: 'android-account-provision-lock-campaign',
      cleanupFailed: false,
      cleanupFailures: [],
      databaseRootDiagnostic: unobservedDiagnostic,
      correlation: safeValue.correlation,
    });
    const hostile = runLibrary('FailureEnvelope', {
      candidateCode: 'C:\\secret\\key.txt bearer-token',
      observedJsFailureCode: 'account_provision_lock_runtime_failed',
      observedDatabaseRootDiagnostic: { schemaVersion: 1, category: 'C:\\secret\\root' },
      stage: 'android-account-provision-lock-publication',
      cleanupComplete: true,
      cleanupReceipt: { failures: ['bearer-token'] },
      reviewedReceiptSha256,
    });
    expect(hostile.status).toBe(0);
    expect(JSON.parse(String(hostile.stdout))).toEqual({
      schemaVersion: 1,
      status: 'failure',
      failureCode: 'account_provision_lock_runtime_failed',
      stage: 'android-account-provision-lock-publication',
      cleanupFailed: false,
      cleanupFailures: [],
      databaseRootDiagnostic: unobservedDiagnostic,
      correlation: safeValue.correlation,
    });
    expect(String(hostile.stdout)).not.toMatch(/secret|bearer-token/u);
    const cleanup = runLibrary('FailureEnvelope', {
      candidateCode: 'cleanup_incomplete',
      observedJsFailureCode: 'account_provision_lock_runtime_failed',
      observedDatabaseRootDiagnostic: unobservedDiagnostic,
      stage: 'android-account-provision-lock-cleanup',
      cleanupComplete: false,
      cleanupReceipt: {
        failures: [...cleanupFailureOrder].reverse().concat('source-check'),
      },
      reviewedReceiptSha256,
    });
    expect(cleanup.status).toBe(0);
    expect(JSON.parse(String(cleanup.stdout))).toEqual({
      schemaVersion: 1,
      status: 'failure',
      failureCode: 'cleanup_incomplete',
      stage: 'android-account-provision-lock-cleanup',
      cleanupFailed: true,
      cleanupFailures: cleanupFailureOrder,
      databaseRootDiagnostic: unobservedDiagnostic,
      correlation: safeValue.correlation,
    });
    const primaryAndCleanup = runLibrary('FailureEnvelope', {
      candidateCode: 'primary_launch_failed',
      observedJsFailureCode: 'account_provision_lock_runtime_failed',
      observedDatabaseRootDiagnostic: { schemaVersion: 1, category: 'file_uri' },
      stage: 'android-account-provision-lock-campaign',
      cleanupComplete: false,
      cleanupReceipt: null,
      reviewedReceiptSha256,
    });
    expect(primaryAndCleanup.status).toBe(0);
    expect(JSON.parse(String(primaryAndCleanup.stdout))).toMatchObject({
      failureCode: 'primary_launch_failed',
      stage: 'android-account-provision-lock-campaign',
      cleanupFailed: true,
      cleanupFailures: ['unknown'],
      databaseRootDiagnostic: unobservedDiagnostic,
    });
    const rootFailure = runLibrary('FailureEnvelope', {
      candidateCode: 'marker_observation_deadline',
      observedJsFailureCode: 'account_provision_lock_database_root_invalid',
      observedDatabaseRootDiagnostic: { schemaVersion: 1, category: 'legacy_alias' },
      stage: 'android-account-provision-lock-campaign',
      cleanupComplete: true,
      cleanupReceipt: emptyCleanupReceipt,
      reviewedReceiptSha256,
    });
    expect(rootFailure.status).toBe(0);
    expect(JSON.parse(String(rootFailure.stdout))).toMatchObject({
      failureCode: 'account_provision_lock_database_root_invalid',
      cleanupFailed: false,
      cleanupFailures: [],
      databaseRootDiagnostic: { schemaVersion: 1, category: 'legacy_alias' },
    });
    const unknownCleanup = runLibrary('FailureEnvelope', {
      candidateCode: 'cleanup_incomplete',
      observedJsFailureCode: 'account_provision_lock_runtime_failed',
      observedDatabaseRootDiagnostic: { schemaVersion: 2, category: 'file_uri', raw: 'C:\\secret' },
      stage: 'android-account-provision-lock-cleanup',
      cleanupComplete: false,
      cleanupReceipt: { failures: ['app-stop', 'unknown-step'] },
      reviewedReceiptSha256,
    });
    expect(unknownCleanup.status).toBe(0);
    expect(JSON.parse(String(unknownCleanup.stdout))).toMatchObject({
      failureCode: 'cleanup_incomplete',
      cleanupFailed: true,
      cleanupFailures: ['unknown'],
      databaseRootDiagnostic: unobservedDiagnostic,
    });
    expect(String(unknownCleanup.stdout)).not.toMatch(/secret|unknown-step/u);
    const runner = source(RUNNER);
    expect(runner.match(/^  Write-CanonicalFailureEnvelope `$/gmu)).toHaveLength(1);
    expect(runner.lastIndexOf('  Write-CanonicalFailureEnvelope `'))
      .toBeGreaterThan(runner.lastIndexOf('$cleanupComplete = $cleanupFailures.Count -eq 0'));
    expect(runner).toContain('$script:CleanupReceipt');
  });

  test.each([
    ['malformed', { exitCode: 1, stdout: '', stderr: '{not-json' }],
    ['unknown', { exitCode: 1, stdout: '', stderr: '{"schemaVersion":1,"status":"failure","failureCode":"account_provision_lock_unknown","stage":"android-account-provision-lock-unknown","cleanupFailed":true,"correlation":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"}\n' }],
    ['hostile', { exitCode: 1, stdout: 'C:\\secret\\key.txt', stderr: 'bearer-token' }],
  ])('launcher maps %s child output to a fixed generic sanitized failure', (_name, child) => {
    const correlation = 'c'.repeat(64);
    const result = launcherFailureEnvelope(child, correlation);
    expect(result.status).toBe(0);
    expect(JSON.parse(String(result.stdout))).toEqual({
      schemaVersion: 1,
      status: 'failure',
      failureCode: 'account_provision_lock_runtime_failed',
      stage: 'android-account-provision-lock-campaign',
      cleanupFailed: false,
      correlation,
    });
    expect(String(result.stdout)).not.toMatch(/secret|bearer-token|not-json/u);
  });

  test('launcher accepts one canonical allowlisted child failure and has a failure-only receipt branch', () => {
    const correlation = 'c'.repeat(64);
    const envelope = {
      schemaVersion: 1,
      status: 'failure',
      failureCode: 'primary_launch_failed',
      stage: 'android-account-provision-lock-campaign',
      cleanupFailed: true,
      correlation,
    };
    const result = launcherFailureEnvelope({
      exitCode: 1, stdout: '', stderr: `${JSON.stringify(envelope)}\n`,
    }, correlation);
    expect(result.status).toBe(0);
    expect(JSON.parse(String(result.stdout))).toEqual(envelope);
    const expandedEnvelope = {
      schemaVersion: 1,
      status: 'failure',
      failureCode: 'account_provision_lock_database_root_invalid',
      stage: 'android-account-provision-lock-campaign',
      cleanupFailed: true,
      cleanupFailures: ['app-stop'],
      databaseRootDiagnostic: { schemaVersion: 1, category: 'file_uri' },
      correlation,
    };
    const mismatch = launcherFailureEnvelope({
      exitCode: 1, stdout: '', stderr: `${JSON.stringify(expandedEnvelope)}\n`,
    }, correlation);
    expect(mismatch.status).toBe(0);
    expect(JSON.parse(String(mismatch.stdout))).toEqual({
      schemaVersion: 1,
      status: 'failure',
      failureCode: 'account_provision_lock_runtime_failed',
      stage: 'android-account-provision-lock-campaign',
      cleanupFailed: false,
      correlation,
    });
    const launcher = source(LAUNCHER);
    expect(launcher).not.toMatch(/cleanupFailures|databaseRootDiagnostic/u);
    expect(launcher).toContain('account-provision-lock-failure-$receiptNonce.json');
    expect(launcher).toContain("owner = 'account-provision-lock-failure-v1'");
    expect(launcher.indexOf('Get-SanitizedRunnerFailure $child'))
      .toBeGreaterThan(launcher.indexOf('$held.endSha256 = Get-HeldSha256 $held'));
    expect(launcher.indexOf("owner = 'account-provision-lock-failure-v1'"))
      .toBeLessThan(launcher.indexOf("owner = 'account-provision-lock-post-run-v1'"));
  });
});
