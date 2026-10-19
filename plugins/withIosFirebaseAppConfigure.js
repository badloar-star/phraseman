// RNFirebase 21.14 only recognizes the pre-SDK-54 Swift AppDelegate template
// (`self.moduleName = ...`). Expo SDK 54 creates an ExpoReactNativeFactory
// instead, so the upstream plugin warns and silently skips FirebaseApp.configure().
// Keep the native default app ready before any JavaScript can call getApp().

const fs = require('fs');
const {
  createRunOncePlugin,
  IOSConfig,
  withDangerousMod,
} = require('@expo/config-plugins');

const FIREBASE_IMPORT = 'import FirebaseCore';
const FIREBASE_CONFIGURE = 'FirebaseApp.configure()';
const SDK_54_FACTORY_ANCHOR = /^(\s*)let delegate = ReactNativeDelegate\(\)\s*$/mu;

function patchSwiftAppDelegate(contents) {
  let patched = contents;

  if (!patched.includes(FIREBASE_IMPORT)) {
    if (!patched.includes('import Expo')) {
      throw new Error('Unable to insert FirebaseCore import into AppDelegate.swift');
    }
    patched = patched.replace('import Expo', `import Expo\n${FIREBASE_IMPORT}`);
  }

  if (patched.includes(FIREBASE_CONFIGURE)) return patched;

  const anchor = SDK_54_FACTORY_ANCHOR.exec(patched);
  if (!anchor) {
    throw new Error(
      'Unable to insert FirebaseApp.configure() before the Expo React Native factory; review AppDelegate.swift',
    );
  }

  const [line, indent] = anchor;
  return patched.replace(line, `${indent}${FIREBASE_CONFIGURE}\n${line}`);
}

function withIosFirebaseAppConfigure(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const appDelegate = IOSConfig.Paths.getAppDelegate(cfg.modRequest.projectRoot);
      if (appDelegate.language !== 'swift') {
        throw new Error(
          `Expected a Swift AppDelegate for Firebase initialization, received ${appDelegate.language}`,
        );
      }

      const patched = patchSwiftAppDelegate(appDelegate.contents);
      if (patched !== appDelegate.contents) fs.writeFileSync(appDelegate.path, patched);
      return cfg;
    },
  ]);
}

module.exports = createRunOncePlugin(
  withIosFirebaseAppConfigure,
  'with-ios-firebase-app-configure',
  '1.0.0',
);
module.exports.patchSwiftAppDelegate = patchSwiftAppDelegate;
