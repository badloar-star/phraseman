import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const APP_CONFIG_PATH = path.resolve('app.config.js');
const appConfigSource = fs.readFileSync(APP_CONFIG_PATH, 'utf8');

function loadConfigWithFixture(appJsonExpo) {
  const fixtureFs = {
    existsSync() {
      return false;
    },
    readdirSync() {
      throw new Error('the VM fixture must not walk real assets');
    },
  };
  const module = { exports: {} };
  const sandbox = {
    __dirname: path.dirname(APP_CONFIG_PATH),
    exports: module.exports,
    module,
    process: { env: {} },
    require(specifier) {
      if (specifier === 'fs') return fixtureFs;
      if (specifier === 'path') return path;
      if (specifier === './app.json') return { expo: appJsonExpo };
      throw new Error(`Unexpected require in app.config.js: ${specifier}`);
    },
  };

  vm.runInNewContext(appConfigSource, sandbox, { filename: APP_CONFIG_PATH });
  return module.exports;
}

function jsonValue(value) {
  return JSON.parse(JSON.stringify(value));
}

test('omits the retired background-task plugin without changing active Expo config contracts', () => {
  const appJsonExpo = {
    name: 'Phraseman fixture',
    plugins: [
      'fixture-plugin',
      ['expo-asset', { retainedOption: true }],
    ],
    updates: {
      enabled: true,
      checkAutomatically: 'ON_LOAD',
      assetPatternsToBeBundled: ['assets/fixture/*.webp'],
    },
  };
  const buildExpoConfig = loadConfigWithFixture(appJsonExpo);

  const config = jsonValue(buildExpoConfig({
    config: {
      ios: { supportsTablet: true },
      plugins: ['input-only-plugin'],
    },
  }));

  assert.deepEqual(config.plugins, [
    'fixture-plugin',
    ['expo-asset', { retainedOption: true }],
    'expo-audio',
    [
      'expo-speech-recognition',
      {
        microphonePermission: 'Allow $(PRODUCT_NAME) to listen while you practice pronunciation.',
        speechRecognitionPermission: 'Allow $(PRODUCT_NAME) to recognize your speech for pronunciation practice.',
        androidSpeechServicePackages: ['com.google.android.googlequicksearchbox'],
      },
    ],
    ['expo-sqlite', { useSQLCipher: true, enableFTS: false }],
  ]);
  assert.equal(config.plugins.includes('expo-background-task'), false);
  assert.deepEqual(config.ios, {
    supportsTablet: true,
    appleTeamId: 'KZPP5PAG8Y',
  });
  assert.deepEqual(config.updates, {
    enabled: true,
    checkAutomatically: 'ON_LOAD',
    assetPatternsToBeBundled: ['assets/fixture/*.webp'],
  });
  assert.deepEqual(appJsonExpo.updates.assetPatternsToBeBundled, ['assets/fixture/*.webp']);
});
