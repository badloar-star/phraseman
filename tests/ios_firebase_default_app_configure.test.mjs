import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { patchSwiftAppDelegate } = require('../plugins/withIosFirebaseAppConfigure');

const SDK_54_APP_DELEGATE = `import Expo
import React
import ReactAppDependencyProvider

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()
    bindReactNativeFactory(factory)

    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
`;

test('adds the native default Firebase app before the Expo SDK 54 React factory starts', () => {
  const patched = patchSwiftAppDelegate(SDK_54_APP_DELEGATE);

  assert.match(patched, /import Expo\nimport FirebaseCore\n/);
  assert.ok(patched.indexOf('FirebaseApp.configure()') < patched.indexOf('let delegate = ReactNativeDelegate()'));
  assert.ok(patched.indexOf('FirebaseApp.configure()') < patched.indexOf('factory.startReactNative('));
});

test('is idempotent across repeated CNG prebuilds', () => {
  const once = patchSwiftAppDelegate(SDK_54_APP_DELEGATE);
  const twice = patchSwiftAppDelegate(once);

  assert.equal(twice, once);
  assert.equal((twice.match(/import FirebaseCore/gu) ?? []).length, 1);
  assert.equal((twice.match(/FirebaseApp\.configure\(\)/gu) ?? []).length, 1);
});

test('fails the prebuild instead of silently omitting Firebase initialization on an unknown template', () => {
  assert.throws(
    () => patchSwiftAppDelegate('import Expo\npublic class AppDelegate {}\n'),
    /Unable to insert FirebaseApp\.configure/,
  );
});

test('registers the corrective plugin immediately after react-native-firebase app', () => {
  const plugins = JSON.parse(readFileSync('app.json', 'utf8')).expo.plugins;
  const rnfbIndex = plugins.findIndex((entry) => entry === '@react-native-firebase/app');

  assert.notEqual(rnfbIndex, -1);
  assert.equal(plugins[rnfbIndex + 1], './plugins/withIosFirebaseAppConfigure');
});

test('normal production keeps startup diagnostics disabled', () => {
  const eas = JSON.parse(readFileSync('eas.json', 'utf8'));

  assert.equal(eas.build.production.env.EXPO_PUBLIC_STARTUP_DIAGNOSTICS, undefined);
});
