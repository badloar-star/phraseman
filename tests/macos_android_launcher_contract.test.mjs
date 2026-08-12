import assert from 'node:assert/strict';
import { accessSync, constants, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LAUNCHER = path.join(ROOT, 'scripts', 'dev-android-emulator-macos.sh');
const SOURCE = readFileSync(LAUNCHER, 'utf8');
const IOS_LAUNCHER = path.join(ROOT, 'scripts', 'dev-ios-simulator-macos.sh');
const IOS_SOURCE = readFileSync(IOS_LAUNCHER, 'utf8');

test('macOS launcher is executable and discovers the Android toolchain without a fixed user SDK path', () => {
  accessSync(LAUNCHER, constants.X_OK);
  assert.match(SOURCE, /\$HOME\/Library\/Android\/sdk/);
  assert.match(SOURCE, /platform-tools\/adb/);
  assert.match(SOURCE, /emulator\/emulator/);
  assert.match(SOURCE, /-list-avds/);
  assert.doesNotMatch(SOURCE, /C:\\Users\\/);
});

test('macOS launcher waits for Android, connects Metro, and launches the current debug app', () => {
  assert.match(SOURCE, /sys\.boot_completed/);
  assert.match(SOURCE, /reverse tcp:8081 tcp:8081/);
  assert.match(SOURCE, /EXPO_PUBLIC_DISABLE_EXPO_UPDATES=1/);
  assert.match(SOURCE, /exec npx expo run:android --variant debug/);
  assert.doesNotMatch(SOURCE, /npm (?:install|ci)/);
});

test('iOS launcher rebuilds the native app before installation and waits for Metro', () => {
  accessSync(IOS_LAUNCHER, constants.X_OK);
  const build = IOS_SOURCE.indexOf('xcodebuild -quiet');
  const verify = IOS_SOURCE.indexOf('codesign --verify');
  const metroReady = IOS_SOURCE.indexOf('packager-status:running');
  const install = IOS_SOURCE.indexOf('simctl install');
  const launch = IOS_SOURCE.indexOf('simctl launch');

  assert.ok(build >= 0, 'must build the current native dependency graph');
  assert.ok(verify > build, 'must reject an incomplete simulator binary');
  assert.ok(metroReady > verify, 'must wait for the JS packager after native verification');
  assert.ok(install > metroReady, 'must not reinstall the stale app before Metro is ready');
  assert.ok(launch > install, 'must launch only the freshly installed app');
  assert.match(IOS_SOURCE, /-workspace ios\/Phraseman\.xcworkspace/);
  assert.match(IOS_SOURCE, /-derivedDataPath "\$DERIVED_DATA"/);
});
