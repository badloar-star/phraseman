import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const PATCH_PATH = path.join(
  ROOT,
  'patches/expo-sqlite+16.0.10.patch',
);
const MODIFIED = Object.freeze([
  'node_modules/expo-sqlite/android/src/main/java/expo/modules/sqlite/NativeDatabase.kt',
  'node_modules/expo-sqlite/android/src/main/java/expo/modules/sqlite/SQLiteModule.kt',
  'node_modules/expo-sqlite/android/src/main/java/expo/modules/sqlite/NativeStatement.kt',
  'node_modules/expo-sqlite/ios/NativeDatabase.swift',
  'node_modules/expo-sqlite/ios/SQLiteModule.swift',
]);
const ADDED = Object.freeze([
  'node_modules/expo-sqlite/ios/AccountSQLiteLeaseAtomic.h',
  'node_modules/expo-sqlite/ios/AccountSQLiteLeaseAtomic.m',
]);
const CANONICAL_SOURCE_SNAPSHOT_PATHS = new Set<string>([...MODIFIED, ...ADDED]);
const SOURCE_HASHES = Object.freeze({
  'node_modules/expo-sqlite/android/src/main/java/expo/modules/sqlite/NativeDatabase.kt':
    'c8b6cfb05ce487bc3e873084ffd36f3410423cbc00a4c41ba8516ec87af96917',
  'node_modules/expo-sqlite/android/src/main/java/expo/modules/sqlite/SQLiteModule.kt':
    'd4197a3729f96c0550698f15b12508dc4b9f83704a59be1ccb965579b8d64b4b',
  'node_modules/expo-sqlite/android/src/main/java/expo/modules/sqlite/NativeStatement.kt':
    'fcc068f284672d9d9dd0829443dba077f4d19cc6e80ce6f2bcdc4a80d3f47cf0',
  'node_modules/expo-sqlite/ios/NativeDatabase.swift':
    '22392485ad6eb5fa358663894985cec6f3639e2d177c19666ce63bc7bee25304',
  'node_modules/expo-sqlite/ios/SQLiteModule.swift':
    'ab9ff472e0af251bb9406c3982a5f9345022d6d2d1c0df147318a893d54a27bc',
  'node_modules/expo-sqlite/ios/ExpoSQLite.podspec':
    '74e90411dcf0eeaf9658073dca06ecfdc06754f5c6e519129d82336ac0907cfc',
});

function sourceText(relativePath: string, rawText: string): string {
  if (CANONICAL_SOURCE_SNAPSHOT_PATHS.has(relativePath) && rawText.includes('\r')) {
    throw new Error(`canonical source snapshot contains CR byte: ${relativePath}`);
  }
  return rawText.replace(/\r\n/g, '\n');
}

function source(relativePath: string): string {
  return sourceText(
    relativePath,
    readFileSync(path.join(ROOT, ...relativePath.split('/')), 'utf8'),
  );
}

function rawBytes(relativePath: string): Buffer {
  return readFileSync(path.join(ROOT, ...relativePath.split('/')));
}

function sha256(content: Uint8Array): string {
  return createHash('sha256').update(content).digest('hex');
}

type SourceSnapshot = ReadonlyMap<string, string>;
type AppliedPatch = ReadonlyMap<string, string>;
type PatchDirection = 'forward' | 'reverse';

function balancedFunctionBody(sourceText: string, declaration: string): string {
  const start = sourceText.indexOf(declaration);
  if (start < 0) throw new Error('missing function declaration');
  const open = sourceText.indexOf('{', start);
  if (open < 0) throw new Error('missing function body');
  let depth = 0;
  for (let index = open; index < sourceText.length; index += 1) {
    if (sourceText[index] === '{') depth += 1;
    if (sourceText[index] === '}') depth -= 1;
    if (depth === 0) return sourceText.slice(start, index + 1);
  }
  throw new Error('unterminated function body');
}

function expectOrdered(body: string, tokens: readonly string[]): void {
  let previous = -1;
  for (const token of tokens) {
    const index = body.indexOf(token);
    expect(index).toBeGreaterThan(previous);
    previous = index;
  }
}

function assertIosStatementWrappers(iosModule: string): void {
  for (const declaration of [
    'private func run(statement',
    'private func step(statement',
    'private func getAll(statement',
    'private func reset(statement',
    'private func finalize(statement',
  ]) {
    expect(balancedFunctionBody(iosModule, declaration))
      .toContain('withAccountLeaseStatementUse(statement: statement, database: database)');
  }
}

function assertPointerTerminalization(androidModule: string, iosModule: string): void {
  expectOrdered(balancedFunctionBody(androidModule, 'private fun finalizeUngated'), [
    'val result = statement.ref.sqlite3_finalize()',
    'statement.markAccountLeaseFinalized()',
    'if (result != NativeDatabaseBinding.SQLITE_OK)',
  ]);
  expectOrdered(balancedFunctionBody(iosModule, 'private func finalizeUngated'), [
    'let result = exsqlite3_finalize(statement.pointer)',
    'statement.pointer = nil',
    'markAccountLeaseStatementFinalized(record)',
    'statement.isFinalized = true',
    'if result != SQLITE_OK',
  ]);
  expectOrdered(balancedFunctionBody(iosModule, 'private func forceFinalizeAccountLeaseStatements'), [
    'let result = exsqlite3_finalize(statement.pointer)',
    'statement.pointer = nil',
    'markAccountLeaseStatementFinalized(record)',
    'if result != SQLITE_OK',
  ]);
}

function assertSingleAndroidModuleCompanion(androidModule: string): void {
  expect(androidModule.match(/^  companion object \{/gmu)?.length ?? 0).toBe(1);
  const companion = balancedFunctionBody(androidModule, 'companion object {');
  for (const token of [
    'private val TAG = SQLiteModule::class.java.simpleName',
    'ACCOUNT_DATABASE_PREFIX',
    'MAX_SAFE_INTEGER',
    'ACCOUNT_DATABASE_REGEX',
    'ACCOUNT_GUEST_DATABASE_REGEX',
  ]) {
    expect(companion).toContain(token);
  }
}

function mutateFunction(
  sourceText: string,
  declaration: string,
  mutate: (body: string) => string,
): string {
  const body = balancedFunctionBody(sourceText, declaration);
  const changed = mutate(body);
  if (changed === body) throw new Error('mutation did not match');
  const start = sourceText.indexOf(body);
  return `${sourceText.slice(0, start)}${changed}${sourceText.slice(start + body.length)}`;
}

function swapOrderedTokens(body: string, first: string, second: string): string {
  const firstIndex = body.indexOf(first);
  const secondIndex = body.indexOf(second);
  if (firstIndex < 0 || secondIndex <= firstIndex) throw new Error('invalid token order');
  return `${body.slice(0, firstIndex)}${second}`
    + `${body.slice(firstIndex + first.length, secondIndex)}${first}`
    + body.slice(secondIndex + second.length);
}

function readCurrentPatchSourceSnapshot(): SourceSnapshot {
  const snapshot = new Map<string, string>();
  for (const relativePath of MODIFIED) {
    snapshot.set(relativePath, source(relativePath));
  }
  for (const relativePath of ADDED) {
    const absolutePath = path.join(ROOT, ...relativePath.split('/'));
    if (existsSync(absolutePath)) snapshot.set(relativePath, source(relativePath));
  }
  return snapshot;
}

function snapshotSource(snapshot: SourceSnapshot, relativePath: string): string {
  const sourceText = snapshot.get(relativePath);
  if (sourceText === undefined) {
    throw new Error(`missing source snapshot: ${relativePath}`);
  }
  return sourceText;
}

function applyUnifiedPatchToSnapshotInMemory(
  patchText: string,
  inputSources: SourceSnapshot,
  direction: PatchDirection = 'forward',
): AppliedPatch {
  const lines = patchText.replace(/\r\n/g, '\n').split('\n');
  const outputs = new Map<string, string>();
  let index = 0;
  while (index < lines.length) {
    if (!lines[index].startsWith('diff --git a/')) {
      index += 1;
      continue;
    }
    const match = /^diff --git a\/(.+) b\/(.+)$/.exec(lines[index]);
    if (match === null || match[1] !== match[2]) throw new Error('invalid patch path');
    const relativePath = match[2];
    index += 1;
    const metadata: string[] = [];
    while (index < lines.length && !lines[index].startsWith('--- ')) {
      metadata.push(lines[index]);
      index += 1;
    }
    const oldHeader = lines[index++];
    const newHeader = lines[index++];
    const isAdded = ADDED.includes(relativePath);
    if (isAdded) {
      if (oldHeader !== '--- /dev/null') throw new Error('invalid added old header');
      if (metadata.length !== 1 || metadata[0] !== 'new file mode 100644') {
        throw new Error('invalid added file mode');
      }
    } else {
      if (oldHeader !== `--- a/${relativePath}`) throw new Error('invalid modified old header');
      if (metadata.length !== 0) throw new Error('unexpected modified file mode');
    }
    if (newHeader !== `+++ b/${relativePath}`) throw new Error('invalid new header');
    const original = isAdded && direction === 'forward'
      ? ''
      : snapshotSource(inputSources, relativePath);
    const originalLines = original.endsWith('\n')
      ? original.slice(0, -1).split('\n')
      : original.length === 0 ? [] : original.split('\n');
    const result: string[] = [];
    let sourceIndex = 0;
    let sawHunk = false;
    while (index < lines.length && !lines[index].startsWith('diff --git a/')) {
      if (!lines[index].startsWith('@@ ')) {
        if (lines[index] !== '') {
          throw new Error('unexpected patch metadata');
        }
        index += 1;
        continue;
      }
      const hunk = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(lines[index++]);
      if (hunk === null) throw new Error('invalid hunk');
      sawHunk = true;
      const oldStart = Number(hunk[1]) === 0 ? 0 : Number(hunk[1]) - 1;
      const oldCount = hunk[2] === undefined ? 1 : Number(hunk[2]);
      const newStart = Number(hunk[3]) === 0 ? 0 : Number(hunk[3]) - 1;
      const newCount = hunk[4] === undefined ? 1 : Number(hunk[4]);
      const inputStart = direction === 'forward' ? oldStart : newStart;
      const outputStart = direction === 'forward' ? newStart : oldStart;
      if (inputStart < sourceIndex) throw new Error('overlapping hunks');
      result.push(...originalLines.slice(sourceIndex, inputStart));
      if (result.length !== outputStart) throw new Error('non-monotonic new hunk');
      sourceIndex = inputStart;
      let consumedOld = 0;
      let producedNew = 0;
      while (index < lines.length
        && !lines[index].startsWith('@@ ')
        && !lines[index].startsWith('diff --git a/')) {
        const line = lines[index];
        if (line === '' && index === lines.length - 1) {
          index += 1;
          break;
        }
        if (line.startsWith(' ')) {
          if (originalLines[sourceIndex] !== line.slice(1)) throw new Error('context mismatch');
          result.push(line.slice(1));
          sourceIndex += 1;
          consumedOld += 1;
          producedNew += 1;
        } else if (line.startsWith('-')) {
          consumedOld += 1;
          if (direction === 'forward') {
            if (originalLines[sourceIndex] !== line.slice(1)) throw new Error('delete mismatch');
            sourceIndex += 1;
          } else {
            result.push(line.slice(1));
          }
        } else if (line.startsWith('+')) {
          producedNew += 1;
          if (direction === 'forward') {
            result.push(line.slice(1));
          } else {
            if (originalLines[sourceIndex] !== line.slice(1)) throw new Error('delete mismatch');
            sourceIndex += 1;
          }
        } else if (line !== '\\ No newline at end of file') {
          throw new Error('invalid hunk row');
        }
        index += 1;
      }
      if (consumedOld !== oldCount || producedNew !== newCount) {
        throw new Error('hunk count mismatch');
      }
    }
    if (!sawHunk) throw new Error('missing hunk');
    result.push(...originalLines.slice(sourceIndex));
    if (direction === 'reverse' && isAdded) {
      if (result.length !== 0) throw new Error(`activated added source drift: ${relativePath}`);
    } else {
      outputs.set(relativePath, `${result.join('\n')}\n`);
    }
  }
  return outputs;
}

function assertPinnedUpstreamSourceHashes(snapshot: SourceSnapshot): void {
  const expectedHashes = SOURCE_HASHES as Readonly<Record<string, string>>;
  for (const relativePath of MODIFIED) {
    const actual = sha256(Buffer.from(snapshotSource(snapshot, relativePath), 'utf8'));
    if (actual !== expectedHashes[relativePath]) {
      throw new Error(`pinned upstream source hash mismatch: ${relativePath}`);
    }
  }
}

function isExactPristineSourceSnapshot(snapshot: SourceSnapshot): boolean {
  if (ADDED.some((relativePath) => snapshot.has(relativePath))) return false;
  try {
    assertPinnedUpstreamSourceHashes(snapshot);
    return true;
  } catch {
    return false;
  }
}

function assertCanonicalSourceSnapshotRawState(snapshot: SourceSnapshot): void {
  for (const relativePath of CANONICAL_SOURCE_SNAPSHOT_PATHS) {
    if (snapshot.get(relativePath)?.includes('\r')) {
      throw new Error(`canonical source snapshot contains CR byte: ${relativePath}`);
    }
  }
}

function normalizeUpstreamSourceSnapshotInMemory(
  canonicalPatchText: string,
  currentSources: SourceSnapshot,
): SourceSnapshot {
  assertCanonicalSourceSnapshotRawState(currentSources);
  if (isExactPristineSourceSnapshot(currentSources)) {
    return new Map(MODIFIED.map((relativePath) => [
      relativePath,
      snapshotSource(currentSources, relativePath),
    ]));
  }

  const reconstructed = applyUnifiedPatchToSnapshotInMemory(
    canonicalPatchText,
    currentSources,
    'reverse',
  );
  assertPinnedUpstreamSourceHashes(reconstructed);
  return reconstructed;
}

function applyUnifiedPatchInMemory(patchText: string): AppliedPatch {
  const canonicalPatchText = source(path.relative(ROOT, PATCH_PATH).replace(/\\/g, '/'));
  const upstreamSources = normalizeUpstreamSourceSnapshotInMemory(
    canonicalPatchText,
    readCurrentPatchSourceSnapshot(),
  );
  return applyUnifiedPatchToSnapshotInMemory(patchText, upstreamSources);
}

function assertProvisionLockSourceContract(androidModule: string, iosModule: string): void {
  for (const nativeModule of [androidModule, iosModule]) {
    expect(nativeModule).toContain('NativeAccountProvisionLock');
    expect(nativeModule).toContain('acquireAccountProvisionLockAsync');
    expect(nativeModule).toContain('releaseAsync');
    expect(nativeModule).toContain('account_native_provision_lock_invalid_path');
    expect(nativeModule).toContain('account_native_provision_lock_failed');
    expect(nativeModule).toContain('account_native_provision_lock_release_failed');
    expect(nativeModule).toContain('isCanonicalAccountDatabaseName');
    expect(nativeModule).not.toContain('account_native_provision_lock_failed:');
  }

  const androidExport = balancedFunctionBody(
    androidModule,
    'AsyncFunction("acquireAccountProvisionLockAsync")',
  );
  expect(androidExport).toContain('acquireAccountProvisionLock(databasePath)');
  expect(androidModule).toMatch(
    /AsyncFunction\("acquireAccountProvisionLockAsync"\)[\s\S]*?\.runOnQueue\(moduleCoroutineScope\)/,
  );
  expect(androidModule).toContain('Class(NativeAccountProvisionLock::class)');
  expect(androidModule).toContain('private val databaseFile: File');
  const androidTokenClass = balancedFunctionBody(
    androidModule,
    'Class(NativeAccountProvisionLock::class)',
  );
  expect(androidTokenClass.match(/Constructor\s*\{/g)?.length).toBe(1);
  expect(androidTokenClass).toMatch(
    /Constructor\s*\{\s*throw InvalidArgumentsException\("account_native_provision_lock_constructor_forbidden"\)\s*\}/,
  );
  expect(androidTokenClass).toContain('AsyncFunction("releaseAsync")');
  expect(androidTokenClass).toContain('releaseAccountProvisionLock()');
  const androidPath = balancedFunctionBody(
    androidModule,
    'private fun validateAccountProvisionLockPath',
  );
  expect(androidPath).toContain('context.filesDir.canonicalFile');
  expect(androidPath).toContain('lexicalDefaultRoot');
  expect(androidPath).toContain('resolvedDefaultRoot');
  expect(androidPath).toContain('File(lexicalDefaultRoot, "accounts-v2")');
  expect(androidPath).toContain('lexicalDefaultRoot != resolvedDefaultRoot');
  expect(androidPath).toContain('canonicalFile');
  expect(androidPath).toContain('resolvedCandidate');
  expect(androidPath).toContain('expectedResolved');
  expect(androidPath).toContain('lexicalCandidate.absolutePath != expectedLexical');
  expect(androidPath).toContain('lexicalRoot != resolvedRoot');
  expect(androidPath).toContain('isCanonicalAccountDatabaseName');
  expect(androidPath).not.toContain('contains(ACCOUNT_DATABASE_PREFIX)');
  const androidAcquire = balancedFunctionBody(
    androidModule,
    'private fun acquireAccountProvisionLock',
  );
  expectOrdered(androidAcquire, [
    'validateAccountProvisionLockPath(databasePath)',
    'accountProvisionLockFile',
    'Os.open',
    'FileOutputStream',
    '.lock()',
    'return NativeAccountProvisionLock',
  ]);
  for (const flag of [
    'OsConstants.O_CREAT',
    'OsConstants.O_RDWR',
    'OsConstants.O_CLOEXEC',
    'OsConstants.O_NOFOLLOW',
  ]) {
    expect(androidAcquire).toContain(flag);
  }
  expect(androidAcquire).toContain('context.noBackupFilesDir');
  expect(androidAcquire).toContain('NativeAccountProvisionLock(databaseFile,');
  expect(androidAcquire).toContain('runCatching { stream.close() }');
  expect(androidAcquire).not.toContain('.exists()');
  expect(androidAcquire).not.toContain('.delete()');
  const androidRelease = balancedFunctionBody(
    androidModule,
    'internal fun releaseAccountProvisionLock',
  );
  expectOrdered(androidRelease, [
    'if (!ownsLock)',
    'fileLock.release()',
    'ownsLock = false',
    'stream.close()',
  ]);
  expect(androidRelease).toContain('account_native_provision_lock_release_failed');
  const androidDrop = balancedFunctionBody(androidModule, 'override fun sharedObjectDidRelease');
  expect(androidDrop).toContain('releaseAccountProvisionLockBestEffort()');
  expect(androidModule).toContain('private val fileLock: FileLock');
  expect(androidModule).toContain('private val stream: FileOutputStream');

  const iosExport = balancedFunctionBody(
    iosModule,
    'AsyncFunction("acquireAccountProvisionLockAsync")',
  );
  expect(iosExport).toContain('acquireAccountProvisionLock(databasePath: databasePath)');
  expect(iosModule).toMatch(
    /AsyncFunction\("acquireAccountProvisionLockAsync"\)[\s\S]*?\.runOnQueue\(moduleQueue\)/,
  );
  expect(iosModule).toContain('Class(NativeAccountProvisionLock.self)');
  const iosTokenClass = balancedFunctionBody(
    iosModule,
    'Class(NativeAccountProvisionLock.self)',
  );
  expect(iosTokenClass).toContain('AsyncFunction("releaseAsync")');
  expect(iosTokenClass).toContain('releaseAccountProvisionLock()');
  const iosPath = balancedFunctionBody(
    iosModule,
    'private func validateAccountProvisionLockPath',
  );
  expect(iosPath).toContain('config.documentDirectory');
  expect(iosPath).toContain('lexicalDefaultRoot');
  expect(iosPath).toContain('resolvedDefaultRoot');
  expect(iosPath).toContain('.appendingPathComponent("accounts-v2", isDirectory: true)');
  expect(iosPath).toContain('lexicalDefaultRoot == resolvedDefaultRoot');
  expect(iosPath).toContain('resolvingSymlinksInPath');
  expect(iosPath).toContain('resolvedCandidate');
  expect(iosPath).toContain('expectedResolved');
  expect(iosPath).toContain('databasePath == expectedLexical.path');
  expect(iosPath).toContain('lexicalRoot == resolvedRoot');
  expect(iosPath).toContain('isCanonicalAccountDatabaseName');
  expect(iosPath).not.toContain('contains(ACCOUNT_DATABASE_PREFIX)');
  const iosAcquire = balancedFunctionBody(
    iosModule,
    'private func acquireAccountProvisionLock',
  );
  expectOrdered(iosAcquire, [
    'validateAccountProvisionLockPath(databasePath: databasePath)',
    'accountProvisionLockURL',
    'isExcludedFromBackup = true',
    'Darwin.open',
    'Darwin.flock(fileDescriptor, LOCK_EX)',
    'return NativeAccountProvisionLock',
  ]);
  for (const flag of ['O_CREAT', 'O_RDWR', 'O_CLOEXEC', 'O_NOFOLLOW']) {
    expect(iosAcquire).toContain(flag);
  }
  expect(iosAcquire).toContain('Darwin.close(fileDescriptor)');
  expect(iosAcquire).not.toContain('fileExists(atPath:');
  expect(iosAcquire).not.toContain('removeItem');
  expect(iosAcquire).toContain('databaseURL: databaseURL');
  const iosRelease = balancedFunctionBody(
    iosModule,
    'func releaseAccountProvisionLock',
  );
  expectOrdered(iosRelease, [
    'guard ownsLock else',
    'Darwin.flock(fileDescriptor, LOCK_UN)',
    'ownsLock = false',
    'Darwin.close(fileDescriptor)',
  ]);
  expect(iosRelease).toContain('account_native_provision_lock_release_failed');
  const iosDrop = balancedFunctionBody(iosModule, 'override func sharedObjectDidRelease');
  expect(iosDrop).toContain('releaseAccountProvisionLockBestEffort()');
  expect(iosModule).toContain('private var fileDescriptor: Int32');
}

function assertIosFamilyProtectionSourceContract(iosModule: string): void {
  const tokenClass = balancedFunctionBody(
    iosModule,
    'private final class NativeAccountProvisionLock',
  );
  const exportedClass = balancedFunctionBody(
    iosModule,
    'Class(NativeAccountProvisionLock.self)',
  );
  expect(iosModule.match(/AsyncFunction\("protectAccountDatabaseFamilyAsync"\)/g)?.length).toBe(1);
  expect(exportedClass).toContain('AsyncFunction("protectAccountDatabaseFamilyAsync")');
  expect(exportedClass).toContain('lock.protectAccountDatabaseFamily()');
  expect(tokenClass).toContain('private let databaseURL: URL');
  expect(tokenClass).toContain('account_native_provision_lock_not_owned');
  expect(tokenClass).toContain('account_native_provision_family_protection_failed');

  const protect = balancedFunctionBody(
    iosModule,
    'func protectAccountDatabaseFamily',
  );
  expect(protect).toContain(
    'let lexicalRoot = databaseURL.deletingLastPathComponent().standardizedFileURL',
  );
  expectOrdered(protect, [
    'stateQueue.sync',
    'guard ownsLock else',
    'databaseURL.deletingLastPathComponent()',
    'FileManager.default.createDirectory',
    'resolvingSymlinksInPath()',
    'lexicalRoot == resolvedRoot',
    'lexicalRoot.lastPathComponent == "accounts-v2"',
    'sharedParent.lastPathComponent == "SQLite"',
    'accounts-v2-a-',
    'accounts-v2-g-',
    '["", "-wal", "-shm", "-journal"]',
    'URLResourceValues()',
    'isExcludedFromBackup = true',
    'FileProtectionType.completeUntilFirstUserAuthentication',
  ]);
  expect(protect).toContain('Darwin.lstat');
  expect(protect).toContain('S_IFLNK');
  expect(protect).toContain('S_IFREG');
  expect(protect).toContain('S_IFDIR');
  expect(protect).toContain('resolvedMember == familyURL');
  expect(protect).toContain('URLResourceKey.isExcludedFromBackupKey');
  expect(protect).toContain('.isExcludedFromBackup == true');
  expect(protect).toContain('FileAttributeKey.protectionKey');
  expect(protect).toMatch(/attributesOfItem\s*\(\s*atPath:/);
  expect(protect.match(/\.isExcludedFromBackup == true/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  expect(protect.match(/attributesOfItem\s*\(\s*atPath:/g)?.length ?? 0)
    .toBeGreaterThanOrEqual(2);
  expect(protect).toContain('account_native_provision_family_protection_failed');
  expect(protect).toContain('Future SQLite sidecar inheritance requires device verification.');
  expect(protect).not.toContain('ownsLock = false');
  expect(protect).not.toContain('sharedParent.setResourceValues');
  expect(protect).not.toContain('ofItemAtPath: sharedParent.path');
  expect(protect).not.toContain('removeItem');
  expect(protect).not.toContain('moveItem');
  expect(protect).not.toContain('delete');

  const release = balancedFunctionBody(iosModule, 'func releaseAccountProvisionLock');
  expect(release).toContain('ownsLock = false');
  expect(protect.indexOf('guard ownsLock else')).toBeLessThan(
    protect.indexOf('FileManager.default.createDirectory'),
  );
  expect(protect.indexOf('lexicalRoot == resolvedRoot')).toBeLessThan(
    protect.indexOf('isExcludedFromBackup = true'),
  );
}

describe('Expo SQLite 16.0.10 account lease patch source conformance only', () => {
  test('pins the exact upstream version, five sources and podspec inclusion rule', () => {
    const packageJson = JSON.parse(source('node_modules/expo-sqlite/package.json')) as {
      version?: unknown;
    };
    const patchText = source(path.relative(ROOT, PATCH_PATH).replace(/\\/g, '/'));
    const upstreamSources = normalizeUpstreamSourceSnapshotInMemory(
      patchText,
      readCurrentPatchSourceSnapshot(),
    );
    expect(packageJson.version).toBe('16.0.10');
    for (const [relativePath, expected] of Object.entries(SOURCE_HASHES)) {
      expect(expected).toMatch(/^[0-9a-f]{64}$/);
      const bytes = MODIFIED.includes(relativePath)
        ? Buffer.from(snapshotSource(upstreamSources, relativePath), 'utf8')
        : rawBytes(relativePath);
      expect(sha256(bytes)).toBe(expected);
    }
    expect(source('node_modules/expo-sqlite/ios/ExpoSQLite.podspec'))
      .toContain('s.source_files = "**/*.{c,h,m,swift}"');
  });

  test('patches only the five pinned sources and adds only the atomic helper pair', () => {
    const patchText = source(path.relative(ROOT, PATCH_PATH).replace(/\\/g, '/'));
    const paths = [...patchText.matchAll(/^diff --git a\/(.+) b\/(.+)$/gm)]
      .map((match) => {
        expect(match[1]).toBe(match[2]);
        return match[1];
      });
    expect(paths).toEqual([...MODIFIED, ...ADDED]);
    expect(new Set(paths).size).toBe(paths.length);
  });

  test('normalizes exact pristine and activated source snapshots but rejects drift', () => {
    const patchText = source(path.relative(ROOT, PATCH_PATH).replace(/\\/g, '/'));
    const current = readCurrentPatchSourceSnapshot();
    const pristine = normalizeUpstreamSourceSnapshotInMemory(patchText, current);
    const activated = applyUnifiedPatchToSnapshotInMemory(patchText, pristine);

    expect(normalizeUpstreamSourceSnapshotInMemory(patchText, pristine)).toEqual(pristine);
    expect(normalizeUpstreamSourceSnapshotInMemory(patchText, activated)).toEqual(pristine);
    for (const relativePath of ADDED) {
      expect(pristine.has(relativePath)).toBe(false);
      expect(activated.has(relativePath)).toBe(true);
    }

    const drifted = new Map(activated);
    drifted.set(MODIFIED[0], `${drifted.get(MODIFIED[0]) ?? ''}// drift\n`);
    expect(() => normalizeUpstreamSourceSnapshotInMemory(patchText, drifted))
      .toThrow('pinned upstream source hash mismatch');
  });

  test.each([
    ['modified source', MODIFIED[0]],
    ['added helper', ADDED[0]],
  ] as const)('rejects CRLF drift in an activated %s before normalization', (_kind, relativePath) => {
    const patchText = source(path.relative(ROOT, PATCH_PATH).replace(/\\/g, '/'));
    const pristine = normalizeUpstreamSourceSnapshotInMemory(
      patchText,
      readCurrentPatchSourceSnapshot(),
    );
    const activated = applyUnifiedPatchToSnapshotInMemory(patchText, pristine);
    const rawCrlfSource = snapshotSource(activated, relativePath).replace(/\n/g, '\r\n');
    const expectedError = `canonical source snapshot contains CR byte: ${relativePath}`;

    expect(() => sourceText(relativePath, rawCrlfSource)).toThrow(expectedError);

    const rawCrlfSnapshot = new Map(activated);
    rawCrlfSnapshot.set(relativePath, rawCrlfSource);
    expect(() => normalizeUpstreamSourceSnapshotInMemory(patchText, rawCrlfSnapshot))
      .toThrow(expectedError);
  });

  test('merges account constants into the one upstream Android companion object', () => {
    const patchText = source(path.relative(ROOT, PATCH_PATH).replace(/\\/g, '/'));
    const patched = applyUnifiedPatchInMemory(patchText);
    const androidModule = patched.get(MODIFIED[1]) ?? '';

    assertSingleAndroidModuleCompanion(androidModule);
    const finalClassBrace = androidModule.lastIndexOf('\n}');
    expect(finalClassBrace).toBeGreaterThan(0);
    const duplicated = `${androidModule.slice(0, finalClassBrace)}\n`
      + '  companion object {\n'
      + '    private const val DUPLICATE = true\n'
      + '  }\n'
      + androidModule.slice(finalClassBrace);
    expect(() => assertSingleAndroidModuleCompanion(duplicated)).toThrow();
  });

  test('adds a canonical cross-process provision lock with retained opaque ownership', () => {
    const patchText = source(path.relative(ROOT, PATCH_PATH).replace(/\\/g, '/'));
    const patched = applyUnifiedPatchInMemory(patchText);
    assertProvisionLockSourceContract(
      patched.get(MODIFIED[1]) ?? '',
      patched.get(MODIFIED[4]) ?? '',
    );
  });

  test('protects the exact iOS V2 database family only while the provision lock is owned', () => {
    const patchText = source(path.relative(ROOT, PATCH_PATH).replace(/\\/g, '/'));
    const patched = applyUnifiedPatchInMemory(patchText);
    assertIosFamilyProtectionSourceContract(patched.get(MODIFIED[4]) ?? '');
  });

  test('source guards reject weakened iOS family protection predicates', () => {
    const patchText = source(path.relative(ROOT, PATCH_PATH).replace(/\\/g, '/'));
    const patched = applyUnifiedPatchInMemory(patchText);
    const iosModule = patched.get(MODIFIED[4]) ?? '';
    const ownershipRemoved = mutateFunction(
      iosModule,
      'func protectAccountDatabaseFamily',
      (body) => body.replace('guard ownsLock else', 'family_protection_guard_removed'),
    );
    expect(() => assertIosFamilyProtectionSourceContract(ownershipRemoved)).toThrow();
    for (const token of [
      'lexicalRoot == resolvedRoot',
      'lexicalRoot.lastPathComponent == "accounts-v2"',
      'sharedParent.lastPathComponent == "SQLite"',
      'URLResourceKey.isExcludedFromBackupKey',
      '.isExcludedFromBackup == true',
      'FileProtectionType.completeUntilFirstUserAuthentication',
      'FileAttributeKey.protectionKey',
      'Darwin.lstat',
      'S_IFLNK',
      'S_IFREG',
      'S_IFDIR',
    ]) {
      const weakened = iosModule.replace(token, 'family_protection_guard_removed');
      expect(weakened).not.toBe(iosModule);
      expect(() => assertIosFamilyProtectionSourceContract(weakened)).toThrow();
    }
  });

  test('source guards reject weakened provision lock admission and release ordering', () => {
    const patchText = source(path.relative(ROOT, PATCH_PATH).replace(/\\/g, '/'));
    const patched = applyUnifiedPatchInMemory(patchText);
    const androidModule = patched.get(MODIFIED[1]) ?? '';
    const iosModule = patched.get(MODIFIED[4]) ?? '';

    for (const [sourceText, token] of [
      [androidModule, 'OsConstants.O_NOFOLLOW'],
      [androidModule, 'lexicalDefaultRoot != resolvedDefaultRoot'],
      [androidModule, 'lexicalRoot != resolvedRoot'],
      [androidModule, 'lexicalCandidate.absolutePath != expectedLexical'],
      [androidModule, '.lock()'],
      [androidModule, 'fileLock.release()'],
      [androidModule, 'account_native_provision_lock_constructor_forbidden'],
      [iosModule, 'O_NOFOLLOW'],
      [iosModule, 'lexicalDefaultRoot == resolvedDefaultRoot'],
      [iosModule, 'databasePath == expectedLexical.path'],
      [iosModule, 'Darwin.flock(fileDescriptor, LOCK_EX)'],
      [iosModule, 'Darwin.flock(fileDescriptor, LOCK_UN)'],
    ] as const) {
      const weakened = sourceText.replace(token, 'provision_lock_guard_removed');
      expect(weakened).not.toBe(sourceText);
      expect(() => assertProvisionLockSourceContract(
        sourceText === androidModule ? weakened : androidModule,
        sourceText === iosModule ? weakened : iosModule,
      )).toThrow();
    }

    const iosRootAliasGuardRemoved = mutateFunction(
      iosModule,
      'private func validateAccountProvisionLockPath',
      (body) => body.replace('lexicalRoot == resolvedRoot', 'provision_lock_guard_removed'),
    );
    expect(() => assertProvisionLockSourceContract(androidModule, iosRootAliasGuardRemoved))
      .toThrow();

    const androidDedicatedRootRemoved = mutateFunction(
      androidModule,
      'private fun validateAccountProvisionLockPath',
      (body) => body.replace(
        'File(lexicalDefaultRoot, "accounts-v2")',
        'File(lexicalDefaultRoot, "accounts-v2-other")',
      ),
    );
    expect(() => assertProvisionLockSourceContract(androidDedicatedRootRemoved, iosModule))
      .toThrow();
    const androidSharedRootRestored = mutateFunction(
      androidModule,
      'private fun validateAccountProvisionLockPath',
      (body) => body.replace(
        'File(lexicalDefaultRoot, "accounts-v2").absoluteFile',
        'lexicalDefaultRoot',
      ),
    );
    expect(() => assertProvisionLockSourceContract(androidSharedRootRestored, iosModule))
      .toThrow();
    const iosDedicatedRootRemoved = mutateFunction(
      iosModule,
      'private func validateAccountProvisionLockPath',
      (body) => body.replace(
        '.appendingPathComponent("accounts-v2", isDirectory: true)',
        '.appendingPathComponent("accounts-v2-other", isDirectory: true)',
      ),
    );
    expect(() => assertProvisionLockSourceContract(androidModule, iosDedicatedRootRemoved))
      .toThrow();
    const iosSharedRootRestored = mutateFunction(
      iosModule,
      'private func validateAccountProvisionLockPath',
      (body) => body.replace(
        'lexicalDefaultRoot.appendingPathComponent("accounts-v2", isDirectory: true)',
        'lexicalDefaultRoot',
      ),
    );
    expect(() => assertProvisionLockSourceContract(androidModule, iosSharedRootRestored))
      .toThrow();

    const sharedParentProtection = mutateFunction(
      iosModule,
      'func protectAccountDatabaseFamily',
      (body) => body.replace(
        'databaseURL.deletingLastPathComponent().standardizedFileURL',
        'databaseURL.deletingLastPathComponent().deletingLastPathComponent().standardizedFileURL',
      ),
    );
    expect(() => assertIosFamilyProtectionSourceContract(sharedParentProtection)).toThrow();

    const reorderedAndroidRelease = mutateFunction(
      androidModule,
      'internal fun releaseAccountProvisionLock',
      (body) => swapOrderedTokens(body, 'fileLock.release()', 'ownsLock = false'),
    );
    expect(() => assertProvisionLockSourceContract(reorderedAndroidRelease, iosModule)).toThrow();
    const reorderedIosRelease = mutateFunction(
      iosModule,
      'func releaseAccountProvisionLock',
      (body) => swapOrderedTokens(
        body,
        'Darwin.flock(fileDescriptor, LOCK_UN)',
        'ownsLock = false',
      ),
    );
    expect(() => assertProvisionLockSourceContract(androidModule, reorderedIosRelease)).toThrow();
  });

  test('rejects malformed hunk counts and non-monotonic hunk metadata', () => {
    const patchText = source(path.relative(ROOT, PATCH_PATH).replace(/\\/g, '/'));
    const wrongCount = patchText.replace(
      /^@@ -(\d+),(\d+) \+(\d+),(\d+) @@/m,
      (_header, oldStart, oldCount, newStart, newCount) =>
        `@@ -${oldStart},${Number(oldCount) + 1} +${newStart},${newCount} @@`,
    );
    expect(() => applyUnifiedPatchInMemory(wrongCount)).toThrow('hunk count mismatch');
    const wrongNewStart = patchText.replace(
      /^@@ -(\d+),(\d+) \+(\d+),(\d+) @@/m,
      (_header, oldStart, oldCount, newStart, newCount) =>
        `@@ -${oldStart},${oldCount} +${Number(newStart) + 1},${newCount} @@`,
    );
    expect(() => applyUnifiedPatchInMemory(wrongNewStart)).toThrow('non-monotonic new hunk');
    const wrongOldHeader = patchText.replace(
      `--- a/${MODIFIED[0]}`, '--- /dev/null',
    );
    expect(() => applyUnifiedPatchInMemory(wrongOldHeader)).toThrow('invalid modified old header');
    const modeOnModified = patchText.replace(
      `--- a/${MODIFIED[0]}`, `new file mode 100755\n--- a/${MODIFIED[0]}`,
    );
    expect(() => applyUnifiedPatchInMemory(modeOnModified)).toThrow('unexpected modified file mode');
    const wrongAddedMode = patchText.replace('new file mode 100644', 'new file mode 100755');
    expect(() => applyUnifiedPatchInMemory(wrongAddedMode)).toThrow('invalid added file mode');
    const lateAddedMode = patchText.replace(
      `+++ b/${ADDED[0]}`,
      `+++ b/${ADDED[0]}\nnew file mode 100644`,
    );
    expect(() => applyUnifiedPatchInMemory(lateAddedMode)).toThrow('unexpected patch metadata');
  });

  test('applies entirely in memory and retains closed admission and teardown predicates', () => {
    const patchText = source(path.relative(ROOT, PATCH_PATH).replace(/\\/g, '/'));
    const patched = applyUnifiedPatchInMemory(patchText);
    expect([...patched.keys()]).toEqual([...MODIFIED, ...ADDED]);
    const androidDatabase = patched.get(MODIFIED[0]) ?? '';
    const androidModule = patched.get(MODIFIED[1]) ?? '';
    const androidStatement = patched.get(MODIFIED[2]) ?? '';
    const iosDatabase = patched.get(MODIFIED[3]) ?? '';
    const iosModule = patched.get(MODIFIED[4]) ?? '';
    const atomicHeader = patched.get(ADDED[0]) ?? '';
    const atomicImplementation = patched.get(ADDED[1]) ?? '';

    for (const nativeDatabase of [androidDatabase, iosDatabase]) {
      expect(nativeDatabase).toContain('leaseActivated');
      expect(nativeDatabase).toContain('hasExclusiveAccountLeaseOwnership');
    }
    expect(androidDatabase).toContain('beginAccountLeaseOperation');
    expect(androidDatabase).toContain('finishAccountLeaseOperation');
    expect(androidDatabase).toContain('accountLeaseOperationCount');
    const androidBeginOperation = balancedFunctionBody(
      androidDatabase, 'internal fun beginAccountLeaseOperation',
    );
    const androidBeginCommit = balancedFunctionBody(
      androidDatabase, 'internal fun beginAccountLeaseCommit',
    );
    expect(androidBeginOperation).toContain('(current and COMMITTING) != 0L');
    expect(androidBeginCommit).toContain('accountLeaseOperationCount(current) != 0L');
    expect(androidDatabase).toContain('registerAccountLeaseStatement');
    expect(androidDatabase).toContain('forceFinalizeAccountLeaseStatements');
    expect(androidDatabase).toContain('System.identityHashCode(statement)');
    expect(androidDatabase).toContain('other.statement === statement');
    expect(androidStatement).toContain('AtomicReference<NativeDatabase?>');
    expect(androidStatement).toContain('AtomicLong');
    expect(androidStatement).toContain('reserveAccountLeaseOwner');
    expect(androidStatement).toContain('reserveOrdinaryStatementProvenance');
    expect(androidStatement).toContain('AccountLeaseStatementPreparePhase');
    expect(androidStatement).toContain('beginAccountLeasePrepare');
    expect(androidStatement).toContain('markAccountLeasePrepared');
    const androidReserveLeaseOwner = balancedFunctionBody(
      androidStatement, 'internal fun reserveAccountLeaseOwner',
    );
    const androidReserveOrdinary = balancedFunctionBody(
      androidStatement, 'internal fun reserveOrdinaryStatementProvenance',
    );
    const androidBeginPrepare = balancedFunctionBody(
      androidStatement, 'internal fun beginAccountLeasePrepare',
    );
    for (const reserveBody of [androidReserveLeaseOwner, androidReserveOrdinary]) {
      expect(reserveBody).toContain('accountLeaseReleasePending');
      expect(reserveBody).toContain('AccountLeaseStatementPreparePhase.UNCLAIMED');
      expect(reserveBody).toContain('AccountLeaseStatementPreparePhase.RESERVED');
    }
    expect(androidBeginPrepare).toContain('accountLeaseReleasePending');
    expect(androidBeginPrepare).toContain('AccountLeaseStatementPreparePhase.RESERVED');
    expect(androidBeginPrepare).toContain('incrementAccountLeaseUse()');
    expect(androidStatement).toContain('beginAccountLeaseUse');
    expect(androidStatement).toContain('finishAccountLeaseUse');
    expect(androidStatement).toContain('markAccountLeasePrepareFailed');
    expect(androidStatement).toContain('forceFinalizeAccountLease');
    const statementRelease = balancedFunctionBody(
      androidStatement, 'override fun sharedObjectDidRelease',
    );
    const releasePending = statementRelease.indexOf('markAccountLeaseReleasePending');
    const releaseOwnerRead = statementRelease.indexOf('accountLeaseOwnerOrNull');
    const releaseAttempt = statementRelease.indexOf('maybeReleaseAccountLeaseRef');
    expect(releasePending).toBeGreaterThanOrEqual(0);
    expect(releaseAttempt).toBeGreaterThanOrEqual(0);
    expect(releaseOwnerRead).toBeGreaterThanOrEqual(0);
    expect(releasePending).toBeLessThan(releaseOwnerRead);
    expect(releasePending).toBeLessThan(releaseAttempt);
    const androidReleaseRef = balancedFunctionBody(
      androidStatement, 'private fun maybeReleaseAccountLeaseRef',
    );
    expect(androidReleaseRef).toContain('(FINALIZED or PREPARE_FAILED)');
    expect(androidReleaseRef).toContain('accountLeaseUseCount(state) != 0L');
    for (const nativeModule of [androidModule, iosModule]) {
      expect(nativeModule).toContain('accounts-v2-a-');
      expect(nativeModule).toContain('accounts-v2-g-');
      expect(nativeModule).toContain('9007199254740991');
      expect(nativeModule).toContain('useNewConnection');
      expect(nativeModule).toContain('serializedData');
      expect(nativeModule).toContain('libSQL');
      expect(nativeModule).toContain('contains(ACCOUNT_DATABASE_PREFIX)');
      expect(nativeModule).toContain('rejectActivatedAccountLeaseApi');
      expect(nativeModule).toContain('withAccountLeaseOperation');
      expect(nativeModule).toContain('[0-9a-f]{64}');
      expect(nativeModule).toContain('revokeAccountLeaseSync');
      expect(nativeModule).toContain('commitAccountLeaseAsync');
      expect(nativeModule).toContain('closeAccountLeaseAsync');
      expect(nativeModule).toContain('"COMMIT"');
      expect(nativeModule).not.toMatch(/commitAccountLeaseAsync[^\n]*source/);
      expect(nativeModule).toContain('leaseActivated');
      expect(nativeModule).toContain('OnDestroy');
    }
    expect(androidModule).toContain('canonicalFile');
    expect(androidModule).toContain('resolvedCandidate != expectedResolved');
    expect(iosModule).toContain('AccountLeaseStatementRecord');
    expect(iosModule).toContain('accountLeaseStatementRecords');
    expect(iosModule).toContain('withAccountLeaseStatementUse');
    expect(iosModule).toContain('reserveAccountLeaseStatementOwner');
    expect(iosModule).toContain('markAccountLeaseStatementPrepareFailed');
    expect(iosModule).toContain('forceFinalizeAccountLeaseStatements');
    expect(iosModule).toContain('weak var statement: NativeStatement?');
    expect(iosModule).toContain('weak var owner: NativeDatabase?');
    expect(iosModule).toContain('var retainedStatement: NativeStatement?');
    expect(iosModule).toContain('AccountLeaseStatementPhase');
    expect(iosModule).toContain('let leaseOwned: Bool');
    expect(iosModule).toContain('beginAccountLeaseStatementPrepare');
    expect(iosModule).toContain('markAccountLeaseStatementPrepared');
    expect(iosModule).toContain('cleanupAccountLeaseStatementRecordsLocked');
    const iosReserveStatement = balancedFunctionBody(
      iosModule, 'private func reserveAccountLeaseStatementOwner',
    );
    const iosLookupStatement = balancedFunctionBody(
      iosModule, 'private func accountLeaseStatementRecord',
    );
    expect(iosReserveStatement).toContain('cleanupAccountLeaseStatementRecordsLocked()');
    expect(iosLookupStatement).toContain('cleanupAccountLeaseStatementRecordsLocked()');
    expect(iosLookupStatement).toContain('record.statement === statement');
    expect(iosReserveStatement).toContain('if accountLeaseStatementRecords[key] != nil');
    const iosExistingRecordReject = iosReserveStatement.indexOf(
      'if accountLeaseStatementRecords[key] != nil',
    );
    const iosNewRecord = iosReserveStatement.indexOf('AccountLeaseStatementRecord(');
    expect(iosExistingRecordReject).toBeGreaterThanOrEqual(0);
    expect(iosNewRecord).toBeGreaterThanOrEqual(0);
    expect(iosExistingRecordReject).toBeLessThan(iosNewRecord);
    const iosBeginPrepare = balancedFunctionBody(
      iosModule, 'private func beginAccountLeaseStatementPrepare',
    );
    expect(iosBeginPrepare).toContain('record.phase == .reserved');
    expect(iosBeginPrepare).toContain('record.phase = .preparing');
    const iosPreparedFailed = balancedFunctionBody(
      iosModule, 'private func markAccountLeaseStatementPrepareFailed',
    );
    const iosFinalized = balancedFunctionBody(
      iosModule, 'private func markAccountLeaseStatementFinalized',
    );
    expect(iosPreparedFailed).toContain('record.retainedStatement = nil');
    expect(iosFinalized).toContain('record.retainedStatement = nil');
    const prepare = balancedFunctionBody(androidModule, 'private fun prepareStatementUngated');
    const activatedBranchStart = prepare.indexOf('if (!statement.reserveAccountLeaseOwner(database)');
    expect(activatedBranchStart).toBeGreaterThanOrEqual(0);
    const ordinaryPrepareBranch = prepare.slice(0, activatedBranchStart);
    const activatedPrepareBranch = prepare.slice(activatedBranchStart);
    const ordinaryReserve = ordinaryPrepareBranch.indexOf('reserveOrdinaryStatementProvenance()');
    const ordinaryPrepareAdmission = ordinaryPrepareBranch.indexOf('beginAccountLeasePrepare(null)');
    const ordinaryOwnerReject = ordinaryPrepareBranch.indexOf('statement.accountLeaseOwnerOrNull() != null');
    const ordinaryPreparePointer = ordinaryPrepareBranch.indexOf('database.ref.sqlite3_prepare_v2');
    const ordinaryPrepared = ordinaryPrepareBranch.indexOf('markAccountLeasePrepared()');
    const ordinaryReturn = ordinaryPrepareBranch.lastIndexOf('return');
    expect(ordinaryReserve).toBeGreaterThanOrEqual(0);
    expect(ordinaryPrepareAdmission).toBeGreaterThanOrEqual(0);
    expect(ordinaryOwnerReject).toBeGreaterThanOrEqual(0);
    expect(ordinaryPreparePointer).toBeGreaterThanOrEqual(0);
    expect(ordinaryPrepared).toBeGreaterThanOrEqual(0);
    expect(ordinaryReturn).toBeGreaterThanOrEqual(0);
    expect(ordinaryReserve).toBeLessThan(ordinaryPrepareAdmission);
    expect(ordinaryPrepareAdmission).toBeLessThan(ordinaryOwnerReject);
    expect(ordinaryOwnerReject).toBeLessThan(ordinaryPreparePointer);
    expect(ordinaryPreparePointer).toBeLessThan(ordinaryPrepared);
    expect(ordinaryPrepared).toBeLessThan(ordinaryReturn);
    const reserveStatementOwner = activatedPrepareBranch.indexOf('reserveAccountLeaseOwner(database)');
    const admitStatementUse = activatedPrepareBranch.indexOf('beginAccountLeasePrepare(database)');
    const prepareTry = activatedPrepareBranch.indexOf('try {');
    const preparePointer = activatedPrepareBranch.indexOf('database.ref.sqlite3_prepare_v2');
    const markPrepared = activatedPrepareBranch.indexOf('markAccountLeasePrepared()');
    const preAdmissionPrepareFailed = activatedPrepareBranch.indexOf('markAccountLeasePrepareFailed');
    const sqlPrepareFailed = activatedPrepareBranch.lastIndexOf('markAccountLeasePrepareFailed');
    const finishPrepareUse = activatedPrepareBranch.indexOf('finishAccountLeaseUse');
    expect(reserveStatementOwner).toBeGreaterThanOrEqual(0);
    expect(admitStatementUse).toBeGreaterThanOrEqual(0);
    expect(prepareTry).toBeGreaterThanOrEqual(0);
    expect(preparePointer).toBeGreaterThanOrEqual(0);
    expect(markPrepared).toBeGreaterThanOrEqual(0);
    expect(preAdmissionPrepareFailed).toBeGreaterThanOrEqual(0);
    expect(sqlPrepareFailed).toBeGreaterThan(preAdmissionPrepareFailed);
    expect(finishPrepareUse).toBeGreaterThanOrEqual(0);
    expect(reserveStatementOwner).toBeLessThan(admitStatementUse);
    expect(admitStatementUse).toBeLessThan(preAdmissionPrepareFailed);
    expect(preAdmissionPrepareFailed).toBeLessThan(prepareTry);
    expect(prepareTry).toBeLessThan(preparePointer);
    expect(preparePointer).toBeLessThan(markPrepared);
    expect(markPrepared).toBeLessThan(sqlPrepareFailed);
    expect(sqlPrepareFailed).toBeLessThan(finishPrepareUse);
    const iosPrepare = balancedFunctionBody(iosModule, 'private func prepareStatementUngated');
    const iosReserve = iosPrepare.indexOf('reserveAccountLeaseStatementOwner');
    const iosPrepareAdmission = iosPrepare.indexOf('beginAccountLeaseStatementPrepare');
    const iosPreparePointer = iosPrepare.indexOf('exsqlite3_prepare_v2');
    const iosPrepared = iosPrepare.indexOf('markAccountLeaseStatementPrepared');
    const iosPreAdmissionFailed = iosPrepare.indexOf('markAccountLeaseStatementPrepareFailed');
    const iosSqlPrepareFailed = iosPrepare.lastIndexOf('markAccountLeaseStatementPrepareFailed');
    expect(iosReserve).toBeGreaterThanOrEqual(0);
    expect(iosPrepareAdmission).toBeGreaterThanOrEqual(0);
    expect(iosPreparePointer).toBeGreaterThanOrEqual(0);
    expect(iosPrepared).toBeGreaterThanOrEqual(0);
    expect(iosPreAdmissionFailed).toBeGreaterThanOrEqual(0);
    expect(iosSqlPrepareFailed).toBeGreaterThan(iosPreAdmissionFailed);
    expect(iosReserve).toBeLessThan(iosPrepareAdmission);
    expect(iosPrepareAdmission).toBeLessThan(iosPreAdmissionFailed);
    expect(iosPreAdmissionFailed).toBeLessThan(iosPreparePointer);
    expect(iosPreparePointer).toBeLessThan(iosPrepared);
    expect(iosPrepared).toBeLessThan(iosSqlPrepareFailed);
    for (const declaration of [
      'private fun run(statement',
      'private fun step(statement',
      'private fun getAll(statement',
      'private fun reset(statement',
      'private fun finalize(statement',
    ]) {
      expect(balancedFunctionBody(androidModule, declaration))
        .toContain('withAccountLeaseStatementUse(statement, database)');
    }
    assertIosStatementWrappers(iosModule);
    for (const declaration of [
      'AsyncFunction("getColumnNamesAsync")',
      'Function("getColumnNamesSync")',
    ]) {
      const columnNames = balancedFunctionBody(androidModule, declaration);
      const admission = columnNames.indexOf('withAccountLeaseStatementUse(statement)');
      const pointer = columnNames.indexOf('statement.ref.getColumnNames()');
      expect(admission).toBeGreaterThanOrEqual(0);
      expect(pointer).toBeGreaterThanOrEqual(0);
      expect(admission).toBeLessThan(pointer);
    }
    const androidPhysicalClose = balancedFunctionBody(androidModule, 'private fun closeDatabase');
    const forceFinalize = androidPhysicalClose.indexOf('forceFinalizeAccountLeaseStatements');
    const closePointer = androidPhysicalClose.indexOf('database.ref.sqlite3_close()');
    expect(forceFinalize).toBeGreaterThanOrEqual(0);
    expect(closePointer).toBeGreaterThanOrEqual(0);
    expect(forceFinalize).toBeLessThan(closePointer);
    const androidForcedStatements = balancedFunctionBody(
      androidDatabase, 'internal fun forceFinalizeAccountLeaseStatements',
    );
    const markStatementsClosing = androidForcedStatements.indexOf('forceFinalizeAccountLease()');
    const finalizeAllStatements = androidForcedStatements.indexOf('sqlite3_finalize_all_statement()');
    const completeForcedFinalize = androidForcedStatements.indexOf('completeAccountLeaseForcedFinalize()');
    expect(markStatementsClosing).toBeGreaterThanOrEqual(0);
    expect(finalizeAllStatements).toBeGreaterThanOrEqual(0);
    expect(completeForcedFinalize).toBeGreaterThanOrEqual(0);
    expect(markStatementsClosing).toBeLessThan(finalizeAllStatements);
    expect(finalizeAllStatements).toBeLessThan(completeForcedFinalize);
    assertPointerTerminalization(androidModule, iosModule);
    const iosPhysicalClose = balancedFunctionBody(iosModule, 'private func closeDatabase');
    const iosForceFinalize = iosPhysicalClose.indexOf('forceFinalizeAccountLeaseStatements');
    const iosClosePointer = iosPhysicalClose.indexOf('exsqlite3_close(db.pointer)');
    expect(iosForceFinalize).toBeGreaterThanOrEqual(0);
    expect(iosClosePointer).toBeGreaterThanOrEqual(0);
    expect(iosForceFinalize).toBeLessThan(iosClosePointer);
    const iosColumnNames = balancedFunctionBody(iosModule, 'private func getColumnNames');
    const iosColumnAdmission = iosColumnNames.indexOf('withAccountLeaseStatementUse');
    expect(iosColumnAdmission).toBeGreaterThanOrEqual(0);
    const iosColumnNamesUngated = balancedFunctionBody(
      iosModule, 'private func getColumnNamesUngated',
    );
    const iosColumnPointer = iosColumnNamesUngated.indexOf('exsqlite3_column_count(statement.pointer)');
    expect(iosColumnPointer).toBeGreaterThanOrEqual(0);
    expect(iosModule).toContain('resolvingSymlinksInPath');
    expect(iosModule).toContain('resolvedCandidate == expectedResolved');
    const androidClose = balancedFunctionBody(
      androidModule, 'private fun closeAccountLeaseDatabase',
    );
    const iosClose = balancedFunctionBody(
      iosModule, 'private func closeAccountLeaseDatabase',
    );
    for (const closeBody of [androidClose, iosClose]) {
      const reserve = closeBody.indexOf('reserveAccountLeaseCloseOwnership');
      const physical = closeBody.indexOf('closeDatabase(database)');
      const cleanup = closeBody.indexOf('completeClosedAccountLeaseDatabase');
      expect(reserve).toBeGreaterThanOrEqual(0);
      expect(physical).toBeGreaterThanOrEqual(0);
      expect(cleanup).toBeGreaterThanOrEqual(0);
      expect(reserve).toBeLessThan(physical);
      expect(physical).toBeLessThan(cleanup);
    }
    expect(androidClose).toContain('awaitAccountLeaseOperations');
    expect(iosClose).toContain('notifyWhenDrained');
    const publishCommitToken = androidDatabase.indexOf('publishDrainToken');
    const commitCas = androidDatabase.indexOf('leaseState.compareAndSet(current, next)');
    expect(publishCommitToken).toBeGreaterThanOrEqual(0);
    expect(commitCas).toBeGreaterThanOrEqual(0);
    expect(publishCommitToken).toBeLessThan(commitCas);
    expect(androidDatabase).toContain('MAX_ACCOUNT_LEASE_OPERATIONS');
    expect(androidModule).toContain('account_native_sqlite_commit_failed');
    expect(androidModule).toContain('reserveAccountLeaseCloseOwnership');
    const androidCommit = balancedFunctionBody(
      androidModule, 'AsyncFunction("commitAccountLeaseAsync")',
    );
    const androidCommitSql = androidCommit.indexOf('database.ref.sqlite3_exec("COMMIT")');
    const androidCommitFinally = androidCommit.indexOf('finally');
    const androidCommitFinish = androidCommit.indexOf('finishAccountLeaseCommit(drainToken)');
    expect(androidCommitSql).toBeGreaterThanOrEqual(0);
    expect(androidCommitFinally).toBeGreaterThanOrEqual(0);
    expect(androidCommitFinish).toBeGreaterThanOrEqual(0);
    expect(androidCommitSql).toBeLessThan(androidCommitFinally);
    expect(androidCommitFinally).toBeLessThan(androidCommitFinish);
    const iosCommit = balancedFunctionBody(
      iosModule, 'AsyncFunction("commitAccountLeaseAsync")',
    );
    const iosCommitDefer = iosCommit.indexOf('defer');
    const iosCommitFinish = iosCommit.indexOf('finishCommit(token: commitToken)');
    const iosCommitExec = iosCommit.indexOf('execAccountLeaseCommit(database: database)');
    expect(iosCommitDefer).toBeGreaterThanOrEqual(0);
    expect(iosCommitFinish).toBeGreaterThanOrEqual(0);
    expect(iosCommitExec).toBeGreaterThanOrEqual(0);
    expect(iosCommitDefer).toBeLessThan(iosCommitFinish);
    expect(iosCommitFinish).toBeLessThan(iosCommitExec);
    const syncLibSql = balancedFunctionBody(androidModule, 'AsyncFunction("syncLibSQL")');
    const syncLibSqlReject = syncLibSql.indexOf('rejectActivatedAccountLeaseApi(database)');
    const syncLibSqlPointer = syncLibSql.indexOf('database.ref.libsql_sync()');
    expect(syncLibSqlReject).toBeGreaterThanOrEqual(0);
    expect(syncLibSqlPointer).toBeGreaterThanOrEqual(0);
    expect(syncLibSqlReject).toBeLessThan(syncLibSqlPointer);
    const androidCloseSuccess = balancedFunctionBody(
      androidDatabase, 'internal fun completeAccountLeaseCloseSuccess',
    );
    const releaseNativeRef = androidCloseSuccess.indexOf('maybeReleaseNativeRef()');
    const publishCloseSuccess = androidCloseSuccess.indexOf('flight.succeed()');
    expect(releaseNativeRef).toBeGreaterThanOrEqual(0);
    expect(publishCloseSuccess).toBeGreaterThanOrEqual(0);
    expect(releaseNativeRef).toBeLessThan(publishCloseSuccess);
    expect(balancedFunctionBody(androidDatabase, 'private fun maybeReleaseNativeRef'))
      .toContain('runCatching { ref.close() }');
    expect(balancedFunctionBody(androidModule, 'private fun completeClosedAccountLeaseDatabase'))
      .toContain('runCatching { database.release() }');
    expect(atomicHeader).toContain('NS_SWIFT_NAME(AccountSQLiteLeaseAtomic)');
    expect(atomicImplementation).toContain('atomic_is_lock_free');
    expect(atomicImplementation).toContain('atomic_fetch_or_explicit');
    expect(atomicImplementation).toContain('finishCommitWithToken');
    expect(atomicImplementation).toContain('_commitOwner');
    expect(atomicImplementation).toContain('EXAccountSQLiteLeaseOperationUnit');
    expect(atomicImplementation).toContain('EXAccountSQLiteLeaseMaximumOperations');
    expect(atomicImplementation).toContain('dispatch_group_enter');
    expect(atomicImplementation).toContain('dispatch_group_leave');
    const iosBeginOperation = balancedFunctionBody(
      atomicImplementation, '- (EXAccountSQLiteLeaseAdmission)beginOperation',
    );
    const iosBeginCommit = balancedFunctionBody(
      atomicImplementation, '- (EXAccountSQLiteLeaseAdmission)beginCommitWithToken',
    );
    expect(iosBeginOperation).toContain('EXAccountSQLiteLeaseCommitting');
    expect(iosBeginCommit).toContain('(current >> 2u) != 0u');
    expect(iosBeginCommit).toMatch(
      /&_commitOwner, &noOwner, owner, memory_order_acq_rel, memory_order_acquire/,
    );
    const iosFinishCommit = balancedFunctionBody(
      atomicImplementation, '- (void)finishCommitWithToken',
    );
    const expectedOwner = iosFinishCommit.indexOf('uint64_t expectedOwner = token;');
    const finishOwnerCas = iosFinishCommit.indexOf('&_commitOwner, &expectedOwner, 0u');
    const finishStateCas = iosFinishCommit.indexOf('&_state, &current, next');
    const finishDrainLeave = iosFinishCommit.indexOf('dispatch_group_leave(_drain)');
    expect(expectedOwner).toBeGreaterThanOrEqual(0);
    expect(finishOwnerCas).toBeGreaterThanOrEqual(0);
    expect(finishStateCas).toBeGreaterThanOrEqual(0);
    expect(finishDrainLeave).toBeGreaterThanOrEqual(0);
    expect(expectedOwner).toBeLessThan(finishOwnerCas);
    expect(finishOwnerCas).toBeLessThan(finishStateCas);
    expect(finishStateCas).toBeLessThan(finishDrainLeave);
    expect(atomicImplementation).not.toContain('NSLock');
    expect(atomicImplementation).not.toContain('dispatch_semaphore');
    expect(iosModule).toContain('AccountSQLiteLeaseAtomic().isLockFree');
    expect(iosModule).toContain('account_native_sqlite_commit_failed');
    expect(iosModule).toContain('if db.leaseActivated && ret != SQLITE_OK');
    expect(iosModule).toContain('notifyWhenDrained');
    expect(iosModule).toContain('promise.resolve(JavaScriptValue.undefined)');
    expect(iosDatabase).not.toContain('COMMITTING');
    expect(iosDatabase).not.toContain('REVOKED');
  });

  test('source guards reject missing wrappers and pointer terminalization regressions', () => {
    const patchText = source(path.relative(ROOT, PATCH_PATH).replace(/\\/g, '/'));
    const patched = applyUnifiedPatchInMemory(patchText);
    const androidModule = patched.get(MODIFIED[1]) ?? '';
    const iosModule = patched.get(MODIFIED[4]) ?? '';
    const iosWrapper = 'withAccountLeaseStatementUse(statement: statement, database: database)';

    for (const declaration of [
      'private func run(statement',
      'private func step(statement',
      'private func getAll(statement',
      'private func reset(statement',
      'private func finalize(statement',
    ]) {
      const missingWrapper = mutateFunction(
        iosModule,
        declaration,
        (body) => body.replace(iosWrapper, 'statement_wrapper_removed'),
      );
      expect(() => assertIosStatementWrappers(missingWrapper)).toThrow();
    }

    const androidFinalize = 'private fun finalizeUngated';
    const androidMark = 'statement.markAccountLeaseFinalized()';
    const androidError = 'if (result != NativeDatabaseBinding.SQLITE_OK)';
    const androidMissingMark = mutateFunction(
      androidModule, androidFinalize, (body) => body.replace(androidMark, 'terminal_mark_removed'),
    );
    expect(() => assertPointerTerminalization(androidMissingMark, iosModule)).toThrow();
    const androidReordered = mutateFunction(
      androidModule, androidFinalize, (body) => swapOrderedTokens(body, androidMark, androidError),
    );
    expect(() => assertPointerTerminalization(androidReordered, iosModule)).toThrow();

    const iosExplicit = 'private func finalizeUngated';
    const iosForced = 'private func forceFinalizeAccountLeaseStatements';
    const iosFinalize = 'let result = exsqlite3_finalize(statement.pointer)';
    const iosClearPointer = 'statement.pointer = nil';
    const iosMark = 'markAccountLeaseStatementFinalized(record)';
    const iosOrdinaryMark = 'statement.isFinalized = true';
    const iosError = 'if result != SQLITE_OK';
    for (const [declaration, token] of [
      [iosExplicit, iosClearPointer],
      [iosExplicit, iosMark],
      [iosExplicit, iosOrdinaryMark],
      [iosForced, iosClearPointer],
      [iosForced, iosMark],
    ] as const) {
      const missingTerminalization = mutateFunction(
        iosModule, declaration, (body) => body.replace(token, 'terminalization_removed'),
      );
      expect(() => assertPointerTerminalization(androidModule, missingTerminalization)).toThrow();
    }
    for (const declaration of [iosExplicit, iosForced]) {
      const pointerClearedTooEarly = mutateFunction(
        iosModule,
        declaration,
        (body) => swapOrderedTokens(body, iosFinalize, iosClearPointer),
      );
      expect(() => assertPointerTerminalization(androidModule, pointerClearedTooEarly)).toThrow();
      const errorBeforeTerminalMark = mutateFunction(
        iosModule,
        declaration,
        (body) => swapOrderedTokens(body, iosMark, iosError),
      );
      expect(() => assertPointerTerminalization(androidModule, errorBeforeTerminalMark)).toThrow();
    }
  });
});
