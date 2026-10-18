import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import test from 'node:test';

import {
  DEFAULT_MAX_AAB_BYTES,
  auditAab,
} from '../scripts/android_aab_size_gate.mjs';
import { runEasAabSizeGate } from '../scripts/eas_build_on_success.mjs';

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

    assert.equal(DEFAULT_MAX_AAB_BYTES, 35_000_000);
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

test('CLI rejects an AAB above the configured byte limit and prints the largest categories', () => {
  withFixture([
    { name: 'base/assets/index.android.bundle', data: 'hermes' },
  ], (aabPath) => {
    const result = spawnSync(
      process.execPath,
      ['scripts/android_aab_size_gate.mjs', aabPath, '--max-bytes', '1'],
      { cwd: path.resolve(import.meta.dirname, '..'), encoding: 'utf8' },
    );

    assert.equal(result.status, 1);
    assert.match(result.stdout, /JS\/Hermes bytecode/);
    assert.match(result.stderr, /35 MB release gate|exceeds 1 bytes/i);
  });
});

test('package exposes the 35 MB artifact gate as a release command', () => {
  const root = path.resolve(import.meta.dirname, '..');
  const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(
    packageJson.scripts['android:aab-size-gate'],
    'node scripts/android_aab_size_gate.mjs',
  );
  assert.equal(
    packageJson.scripts['eas-build-on-success'],
    'node scripts/eas_build_on_success.mjs',
  );
});

test('EAS success hook gates only the generated Android production AAB', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'phraseman-eas-aab-size-'));
  const outputDirectory = path.join(directory, 'android', 'app', 'build', 'outputs', 'bundle', 'release');
  const aabPath = path.join(outputDirectory, 'app-release.aab');
  try {
    mkdirSync(outputDirectory, { recursive: true });
    writeFileSync(aabPath, makeStoredZip([
      { name: 'base/assets/index.android.bundle', data: 'hermes' },
    ]));

    assert.throws(
      () => runEasAabSizeGate({
        env: { EAS_BUILD_PLATFORM: 'android', EAS_BUILD_PROFILE: 'production' },
        projectRoot: directory,
        maxBytes: 1,
      }),
      /release gate FAILED/,
    );
    assert.deepEqual(
      runEasAabSizeGate({
        env: { EAS_BUILD_PLATFORM: 'ios', EAS_BUILD_PROFILE: 'production' },
        projectRoot: directory,
        maxBytes: 1,
      }),
      { skipped: true },
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('EAS Android production success hook fails closed without exactly one AAB', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'phraseman-eas-aab-missing-'));
  try {
    assert.throws(
      () => runEasAabSizeGate({
        env: { EAS_BUILD_PLATFORM: 'android', EAS_BUILD_PROFILE: 'production' },
        projectRoot: directory,
      }),
      /expected exactly one production AAB, found 0/,
    );
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
  ]);
});
