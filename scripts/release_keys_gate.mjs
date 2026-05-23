import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const profile = String(process.env.EAS_BUILD_PROFILE ?? '').trim();
const platform = String(process.env.EAS_BUILD_PLATFORM ?? process.env.EAS_BUILD_PLATFORM_NAME ?? '').trim();
const strictEnv = args.has('--strict-env') || profile === 'production';

function fail(message) {
  throw new Error(`[release-keys-gate] ${message}`);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function requireFile(relativePath) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    fail(`${relativePath} is missing`);
  }
}

function requireEnv(name, validate, hint) {
  const value = String(process.env[name] ?? '').trim();
  if (!value) fail(`${name} is missing`);
  if (!validate(value)) fail(`${name} is invalid: ${hint}`);
}

function requireEnvEquals(name, expected) {
  requireEnv(name, value => value === expected, `expected ${expected}`);
}

function checkStaticConfig() {
  const appJson = readJson('app.json');
  const easJson = readJson('eas.json');
  const revenueCatInit = readText('app/revenuecat_init.ts');
  const authProvider = readText('app/auth_provider.ts');

  if (appJson.expo?.newArchEnabled !== false) {
    fail('expo.newArchEnabled must be false until the Android Yoga/Fabric crash is closed');
  }

  const androidVersionCode = appJson.expo?.android?.versionCode;
  const iosBuildNumber = Number.parseInt(String(appJson.expo?.ios?.buildNumber ?? ''), 10);
  if (!Number.isFinite(androidVersionCode) || androidVersionCode < 1) {
    fail('expo.android.versionCode is invalid');
  }
  if (!Number.isFinite(iosBuildNumber) || iosBuildNumber < 1) {
    fail('expo.ios.buildNumber is invalid');
  }
  if (androidVersionCode !== iosBuildNumber) {
    fail(`Android versionCode (${androidVersionCode}) must equal iOS buildNumber (${iosBuildNumber})`);
  }

  if (easJson.build?.production?.env?.EXPO_PUBLIC_STORE_RELEASE !== '1') {
    fail('eas production env must set EXPO_PUBLIC_STORE_RELEASE=1');
  }

  requireFile('google-services.json');
  requireFile('GoogleService-Info.plist');

  for (const name of ['EXPO_PUBLIC_RC_IOS', 'EXPO_PUBLIC_RC_ANDROID']) {
    if (!revenueCatInit.includes(name)) {
      fail(`RevenueCat init does not reference ${name}`);
    }
  }
  if (!revenueCatInit.includes("key.startsWith('appl_')") || !revenueCatInit.includes("key.startsWith('goog_')")) {
    fail('RevenueCat platform prefix guard is missing');
  }

  for (const name of [
    'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
    'EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID',
    'EXPO_PUBLIC_APPLE_ANDROID_REDIRECT_URI',
    'EXPO_PUBLIC_APPLE_ANDROID_APP_CALLBACK_URI',
  ]) {
    if (!authProvider.includes(name)) {
      fail(`auth provider does not reference ${name}`);
    }
  }
}

function checkStrictEnv() {
  const isIos = platform === 'ios' || !platform;
  const isAndroid = platform === 'android' || !platform;

  requireEnvEquals('EXPO_PUBLIC_STORE_RELEASE', '1');

  if (String(process.env.EXPO_PUBLIC_ENABLE_DEV_TOOLS ?? '').trim() === '1') {
    fail('EXPO_PUBLIC_ENABLE_DEV_TOOLS must not be enabled for release');
  }

  if (isIos) {
    requireEnv('EXPO_PUBLIC_RC_IOS', value => value.startsWith('appl_'), 'must start with appl_');
  }
  if (isAndroid) {
    requireEnv('EXPO_PUBLIC_RC_ANDROID', value => value.startsWith('goog_'), 'must start with goog_');
    requireEnv('EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID', value => value.length > 4, 'Apple Android Services ID is required');
    requireEnv('EXPO_PUBLIC_APPLE_ANDROID_REDIRECT_URI', value => /^https?:\/\//.test(value), 'must be an http(s) return URL');
    requireEnv('EXPO_PUBLIC_APPLE_ANDROID_APP_CALLBACK_URI', value => /^[a-z][a-z0-9+.-]*:\/\//i.test(value), 'must be an app callback URI');
  }

  requireEnv(
    'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
    value => value.endsWith('.apps.googleusercontent.com'),
    'must be a Google Web OAuth client id',
  );
}

checkStaticConfig();
if (strictEnv) checkStrictEnv();

console.log(`[release-keys-gate] OK${strictEnv ? ' strict env' : ' static'}${platform ? ` platform=${platform}` : ''}`);
