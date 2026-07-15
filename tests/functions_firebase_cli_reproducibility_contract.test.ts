import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const FIREBASE_TOOLS_VERSION = '15.15.0';

type PackageJson = {
  devDependencies?: Record<string, string>;
};

type PackageLock = {
  packages?: Record<string, {
    version?: string;
    devDependencies?: Record<string, string>;
    bin?: Record<string, string>;
  }>;
};

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8')) as T;
}

describe('Functions Firebase CLI reproducibility', () => {
  it('pins the local Firebase CLI and its executable in the Functions lockfile', () => {
    const packageJson = readJson<PackageJson>('functions/package.json');
    const packageLock = readJson<PackageLock>('functions/package-lock.json');
    const lockedFirebaseTools = packageLock.packages?.['node_modules/firebase-tools'];

    expect(packageJson.devDependencies?.['firebase-tools']).toBe(FIREBASE_TOOLS_VERSION);
    expect(packageLock.packages?.['']?.devDependencies?.['firebase-tools']).toBe(FIREBASE_TOOLS_VERSION);
    expect(lockedFirebaseTools?.version).toBe(FIREBASE_TOOLS_VERSION);
    expect(lockedFirebaseTools?.bin).toEqual({ firebase: 'lib/bin/firebase.js' });
  });
});
