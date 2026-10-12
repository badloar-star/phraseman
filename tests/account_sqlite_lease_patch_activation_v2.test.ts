import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const CANDIDATE_RELATIVE_PATH =
  'modules/account-session-v2/native/expo-sqlite-16.0.10-account-lease.patch';
const DESTINATION_RELATIVE_PATH = 'patches/expo-sqlite+16.0.10.patch';
const EXPECTED_VERSION = '16.0.10';
// зачем (12.10): кандидат обновлён до рабочего патча — единственное отличие было исправлением iOS 1282d3e80 / 57e934e74
// («flock через @_silgen_name»: struct flock из Darwin затеняет функцию flock(2)); 4 строки, тот же системный flock.
const EXPECTED_CANDIDATE_SHA256 =
  '241d426d214269202c32c9ae78f311ff83bf27d57bfcf3bd882a8b64a39ac9d1';
const EXPECTED_RESOLVED =
  'https://registry.npmjs.org/expo-sqlite/-/expo-sqlite-16.0.10.tgz';
const EXPECTED_INTEGRITY =
  'sha512-tUOKxE9TpfneRG3eOfbNfhN9236SJ7IiUnP8gCqU7umd9DtgDGB/5PhYVVfl+U7KskgolgNoB9v9OZ9iwXN8Eg==';
const ACTIVATION_ERROR = 'account_sqlite_lease_patch_activation_invalid';

type ActivationSnapshot = Readonly<{
  dependencyVersion: string;
  lockRootDependencyVersion: string;
  lockInstalledVersion: string;
  lockResolved: string;
  lockIntegrity: string;
  postinstall: string;
  candidateRelativePath: string;
  candidateBytes: Uint8Array;
  destinationRelativePath: string;
  destinationBytes: Uint8Array;
  expoSqlitePatchFiles: readonly string[];
}>;

function absolute(relativePath: string): string {
  return path.join(ROOT, ...relativePath.split('/'));
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function invalid(): never {
  throw new Error(ACTIVATION_ERROR);
}

function assertActivationSnapshot(snapshot: ActivationSnapshot): void {
  if (snapshot.dependencyVersion !== EXPECTED_VERSION
    || snapshot.lockRootDependencyVersion !== EXPECTED_VERSION
    || snapshot.lockInstalledVersion !== EXPECTED_VERSION
    || snapshot.lockResolved !== EXPECTED_RESOLVED
    || snapshot.lockIntegrity !== EXPECTED_INTEGRITY
    || snapshot.postinstall !== 'patch-package'
    || snapshot.candidateRelativePath !== CANDIDATE_RELATIVE_PATH
    || snapshot.destinationRelativePath !== DESTINATION_RELATIVE_PATH
    || sha256(snapshot.candidateBytes) !== EXPECTED_CANDIDATE_SHA256
    || sha256(snapshot.destinationBytes) !== EXPECTED_CANDIDATE_SHA256
    || snapshot.candidateBytes.byteLength !== snapshot.destinationBytes.byteLength
    || !Buffer.from(snapshot.candidateBytes).equals(Buffer.from(snapshot.destinationBytes))
    || snapshot.expoSqlitePatchFiles.length !== 1
    || snapshot.expoSqlitePatchFiles[0] !== path.basename(DESTINATION_RELATIVE_PATH)) {
    invalid();
  }
}

function readJson(relativePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(absolute(relativePath), 'utf8')) as Record<string, unknown>;
}

function currentSnapshot(): ActivationSnapshot {
  const rootPackage = readJson('package.json');
  const packageLock = readJson('package-lock.json');
  const dependencies = rootPackage.dependencies as Record<string, unknown>;
  const scripts = rootPackage.scripts as Record<string, unknown>;
  const lockPackages = packageLock.packages as Record<string, Record<string, unknown>>;
  const lockRootDependencies = lockPackages[''].dependencies as Record<string, unknown>;
  const lockInstalled = lockPackages['node_modules/expo-sqlite'];
  const candidateBytes = readFileSync(absolute(CANDIDATE_RELATIVE_PATH));
  const destinationBytes = readFileSync(absolute(DESTINATION_RELATIVE_PATH));
  const expoSqlitePatchFiles = readdirSync(absolute('patches'))
    .filter((name) => /^expo-sqlite\+.*\.patch$/u.test(name))
    .sort();
  return Object.freeze({
    dependencyVersion: dependencies['expo-sqlite'] as string,
    lockRootDependencyVersion: lockRootDependencies['expo-sqlite'] as string,
    lockInstalledVersion: lockInstalled.version as string,
    lockResolved: lockInstalled.resolved as string,
    lockIntegrity: lockInstalled.integrity as string,
    postinstall: scripts.postinstall as string,
    candidateRelativePath: CANDIDATE_RELATIVE_PATH,
    candidateBytes,
    destinationRelativePath: DESTINATION_RELATIVE_PATH,
    destinationBytes,
    expoSqlitePatchFiles: Object.freeze(expoSqlitePatchFiles),
  });
}

describe('Expo SQLite account-lease patch activation', () => {
  test('pins the installed dependency and patch-package activation command', () => {
    const rootPackage = readJson('package.json');
    const installedPackage = readJson('node_modules/expo-sqlite/package.json');
    const dependencies = rootPackage.dependencies as Record<string, unknown>;
    const scripts = rootPackage.scripts as Record<string, unknown>;

    expect(installedPackage.version).toBe(EXPECTED_VERSION);
    expect(dependencies['expo-sqlite']).toBe(EXPECTED_VERSION);
    expect(scripts.postinstall).toBe('patch-package');
  });

  test('activates the exact candidate bytes at the one approved patch-package path', () => {
    expect(sha256(readFileSync(absolute(CANDIDATE_RELATIVE_PATH))))
      .toBe(EXPECTED_CANDIDATE_SHA256);
    expect(existsSync(absolute(DESTINATION_RELATIVE_PATH))).toBe(true);
    assertActivationSnapshot(currentSnapshot());
  });

  test('rejects byte, version, path, and duplicate-patch drift', () => {
    const candidate = readFileSync(absolute(CANDIDATE_RELATIVE_PATH));
    const valid: ActivationSnapshot = {
      dependencyVersion: EXPECTED_VERSION,
      lockRootDependencyVersion: EXPECTED_VERSION,
      lockInstalledVersion: EXPECTED_VERSION,
      lockResolved: EXPECTED_RESOLVED,
      lockIntegrity: EXPECTED_INTEGRITY,
      postinstall: 'patch-package',
      candidateRelativePath: CANDIDATE_RELATIVE_PATH,
      candidateBytes: candidate,
      destinationRelativePath: DESTINATION_RELATIVE_PATH,
      destinationBytes: Buffer.from(candidate),
      expoSqlitePatchFiles: [path.basename(DESTINATION_RELATIVE_PATH)],
    };
    assertActivationSnapshot(valid);

    const mutated = Buffer.from(candidate);
    mutated[mutated.byteLength - 1] ^= 1;
    for (const drifted of [
      { ...valid, destinationBytes: mutated },
      { ...valid, destinationBytes: candidate.subarray(0, candidate.byteLength - 1) },
      { ...valid, dependencyVersion: '~16.0.10' },
      { ...valid, lockRootDependencyVersion: '~16.0.10' },
      { ...valid, lockInstalledVersion: '16.0.11' },
      { ...valid, lockResolved: 'https://registry.npmjs.org/expo-sqlite/-/expo-sqlite-16.0.11.tgz' },
      { ...valid, lockIntegrity: 'sha512-drifted' },
      { ...valid, postinstall: 'echo skipped' },
      { ...valid, candidateRelativePath: 'modules/account-session-v2/native/other.patch' },
      { ...valid, destinationRelativePath: 'patches/expo-sqlite+16.0.10-copy.patch' },
      { ...valid, expoSqlitePatchFiles: [
        path.basename(DESTINATION_RELATIVE_PATH),
        'expo-sqlite+16.0.10-copy.patch',
      ] },
    ]) {
      expect(() => assertActivationSnapshot(drifted)).toThrow(ACTIVATION_ERROR);
    }
  });
});
