import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import test from 'node:test';

import { auditAab } from '../scripts/android_aab_size_report.mjs';

const require = createRequire(import.meta.url);

function makeStoredZip(entries) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const data = Buffer.from(entry.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(localOffset, 42);
    centralParts.push(central, name);
    localOffset += local.length + name.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirectory.length, 12);
  eocd.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localParts, centralDirectory, eocd]);
}

function withFixture(entries, callback) {
  const directory = mkdtempSync(path.join(tmpdir(), 'phraseman-aab-size-'));
  const aabPath = path.join(directory, 'fixture.aab');
  writeFileSync(aabPath, makeStoredZip(entries));
  try {
    return callback(aabPath);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('audits every compressed entry and reconciles structural overhead', () => {
  withFixture([
    { name: 'base/assets/index.android.bundle', data: 'hermes' },
    { name: 'base/assets/app.config', data: 'expo' },
    { name: 'base/assets/lesson.mp3', data: 'audio' },
    { name: 'base/assets/scene.webp', data: 'image' },
    { name: 'base/assets/course.json', data: 'data' },
    { name: 'base/assets/custom.bin', data: 'other' },
    { name: 'base/lib/arm64-v8a/libapp.so', data: 'native' },
    { name: 'base/res/drawable-mdpi-v4/assets_icon.webp', data: 'img' },
    { name: 'BUNDLE-METADATA/com.android.tools.build.debugsymbols/arm64-v8a/libapp.so.sym', data: 'sym' },
  ], (aabPath) => {
    const audit = auditAab(aabPath);
    const categories = Object.fromEntries(audit.categories.map((row) => [row.category, row]));

    assert.equal(categories['JS/Hermes bytecode'].compressedBytes, 6);
    assert.equal(categories['Native libraries: arm64-v8a'].compressedBytes, 6);
    assert.equal(categories['Image/icon resources'].compressedBytes, 8);
    assert.equal(categories['Audio resources'].compressedBytes, 5);
    assert.equal(categories['Bundled data resources'].compressedBytes, 4);
    assert.equal(categories['Expo Updates config/manifest/certificate'].compressedBytes, 4);
    assert.equal(categories['Other bundled assets'].compressedBytes, 5);
    assert.equal(categories['Bundle metadata: native debug symbols'].compressedBytes, 3);
    assert.equal(
      audit.entriesCompressedBytes + audit.structuralOverheadBytes,
      audit.fileBytes,
    );
  });
});

test('CLI reports an AAB without applying a blocking size threshold', () => {
  withFixture([
    { name: 'base/assets/index.android.bundle', data: 'hermes' },
  ], (aabPath) => {
    const result = spawnSync(
      process.execPath,
      ['scripts/android_aab_size_report.mjs', aabPath],
      { cwd: path.resolve(import.meta.dirname, '..'), encoding: 'utf8' },
    );

    assert.equal(result.status, 0);
    assert.match(result.stdout, /JS\/Hermes bytecode/);
    assert.doesNotMatch(result.stdout + result.stderr, /35 MB|gate|threshold|exceeds/i);
  });
});

test('package exposes only an informational AAB size report', () => {
  const root = path.resolve(import.meta.dirname, '..');
  const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  const easIgnore = readFileSync(path.join(root, '.easignore'), 'utf8');
  assert.equal(
    packageJson.scripts['android:aab-size-report'],
    'node scripts/android_aab_size_report.mjs',
  );
  assert.equal(packageJson.scripts['android:aab-size-gate'], undefined);
  assert.equal(packageJson.scripts['eas-build-on-success'], undefined);
  assert.doesNotMatch(easIgnore, /android_aab_size_gate|eas_build_on_success/);
});

test('production build metadata is 135 while the app version remains 2.0.0', () => {
  const root = path.resolve(import.meta.dirname, '..');
  const app = JSON.parse(readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
  assert.equal(app.version, '2.0.0');
  assert.equal(app.android.versionCode, 135);
  assert.equal(app.ios.buildNumber, '135');
});

test('production version gate accepts build 135 with app version 2.0.0 unchanged', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'phraseman-version-gate-'));
  const scriptsDirectory = path.join(directory, 'scripts');
  const gatePath = path.join(scriptsDirectory, 'eas_production_version_gate.mjs');
  const writeApp = (build) => writeFileSync(path.join(directory, 'app.json'), JSON.stringify({
    expo: {
      version: '2.0.0',
      android: { versionCode: build },
      ios: { buildNumber: String(build) },
    },
  }));

  try {
    mkdirSync(scriptsDirectory, { recursive: true });
    writeFileSync(
      gatePath,
      readFileSync(path.resolve(import.meta.dirname, '../scripts/eas_production_version_gate.mjs')),
    );
    execFileSync('git', ['init', '-b', 'main'], { cwd: directory });
    execFileSync('git', ['config', 'user.name', 'Phraseman Test'], { cwd: directory });
    execFileSync('git', ['config', 'user.email', 'test@phraseman.local'], { cwd: directory });
    writeApp(134);
    execFileSync('git', ['add', 'app.json'], { cwd: directory });
    execFileSync('git', ['-c', 'core.hooksPath=NUL', 'commit', '-m', 'build 134'], { cwd: directory });
    writeApp(135);
    execFileSync('git', ['add', 'app.json'], { cwd: directory });
    execFileSync('git', ['-c', 'core.hooksPath=NUL', 'commit', '-m', 'build 135'], { cwd: directory });

    for (const platform of ['android', 'ios']) {
      const result = spawnSync(process.execPath, [gatePath], {
        cwd: directory,
        encoding: 'utf8',
        env: {
          ...process.env,
          EAS_BUILD_PROFILE: 'production',
          EAS_BUILD_PLATFORM: platform,
          EXPO_PUBLIC_STORE_RELEASE: '1',
          EXPO_PUBLIC_RC_ANDROID: 'goog_test',
          EXPO_PUBLIC_RC_IOS: 'appl_test',
        },
      });
      assert.equal(result.status, 0, `${platform}: ${result.stdout}\n${result.stderr}`);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('production prebuild does not generate extra release native symbol tables', () => {
  const { patchAppBuildGradle } = require('../plugins/withProductionAndroidBundleHygiene');
  const fixture = `android {
  signingConfigs {
    release {
      keyAlias 'upload'
    }
  }
  buildTypes {
    release {
      minifyEnabled true
    }
  }
}
`;
  const patched = patchAppBuildGradle(fixture);

  assert.match(patched, /release \{\s*\/\/ phraseman: keep native debug metadata outside the AAB\s*ndk \{\s*debugSymbolLevel 'none'/);
  assert.match(patched, /signingConfigs \{\s*release \{\s*keyAlias 'upload'/);
  assert.ok(patched.indexOf('// phraseman: keep native debug metadata outside the AAB') > patched.indexOf('buildTypes {'));
  assert.equal((patched.match(/debugSymbolLevel 'none'/g) ?? []).length, 1);
  assert.equal(patchAppBuildGradle(patched), patched);
});

test('production prebuild excludes generated native debug metadata from the AAB', () => {
  const { patchGradleProperties } = require('../plugins/withProductionAndroidBundleHygiene');
  const patched = patchGradleProperties([
    { type: 'property', key: 'org.gradle.jvmargs', value: '-Xmx2048m' },
  ]);
  const metadataSetting = patched.filter(
    (item) => item.type === 'property' && item.key === 'android.bundle.includeNativeDebugMetadata',
  );

  assert.deepEqual(metadataSetting, [{
    type: 'property',
    key: 'android.bundle.includeNativeDebugMetadata',
    value: 'false',
  }]);
  assert.equal(
    patchGradleProperties(patched).filter(
      (item) => item.type === 'property' && item.key === 'android.bundle.includeNativeDebugMetadata',
    ).length,
    1,
  );
});

test('EAS preserves mapping and unstripped native libraries as supplementary build artifacts', () => {
  const root = path.resolve(import.meta.dirname, '..');
  const eas = JSON.parse(readFileSync(path.join(root, 'eas.json'), 'utf8'));
  assert.deepEqual(eas.build.production.buildArtifactPaths, [
    'android/app/build/outputs/mapping/release/mapping.txt',
    'android/app/build/intermediates/merged_native_libs/release/mergeReleaseNativeLibs/out/lib/**/*',
    'android/app/build/outputs/**/*.aab',
  ]);
});
