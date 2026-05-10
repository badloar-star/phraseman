/**
 * iOS: FirebaseApp.configure() at the start of didFinishLaunchingWithOptions.
 *
 * RN Firebase App Check requires RNFBAppCheckModule.sharedInstance() **before**
 * FirebaseApp.configure() (https://rnfirebase.io/app-check/usage ).
 * Without that order, TestFlight/production iOS often has no valid App Check
 * attestation → Firestore (matchmaking_queue) can fail while Android Play
 * Integrity still works.
 *
 * Swift: App Check pod lacks a Swift module → add `#import "RNFBAppCheckModule.h"`
 * to the app *-Bridging-Header.h*.
 *
 * Keep AFTER `@react-native-firebase/app` in app.json.
 */

const fs = require('fs');
const path = require('path');

const { withDangerousMod, createRunOncePlugin } = require('@expo/config-plugins');

const SKIP_DIRS = new Set(['Pods', 'build', '.git']);

const MARK = '// expo-plugin: rnfb-app-check-before-firebase';

function collectAppDelegates(iosRoot, acc = []) {
  if (!fs.existsSync(iosRoot)) return acc;
  for (const ent of fs.readdirSync(iosRoot, { withFileTypes: true })) {
    const full = path.join(iosRoot, ent.name);
    if (ent.isDirectory()) {
      if (!SKIP_DIRS.has(ent.name)) collectAppDelegates(full, acc);
    } else if (ent.name === 'AppDelegate.swift' || ent.name === 'AppDelegate.mm') {
      acc.push(full);
    }
  }
  return acc;
}

function collectBridgingHeaders(iosRoot, acc = []) {
  if (!fs.existsSync(iosRoot)) return acc;
  for (const ent of fs.readdirSync(iosRoot, { withFileTypes: true })) {
    const full = path.join(iosRoot, ent.name);
    if (ent.isDirectory()) {
      if (!SKIP_DIRS.has(ent.name)) collectBridgingHeaders(full, acc);
    } else if (
      ent.name.endsWith('-Bridging-Header.h') ||
      ent.name.endsWith('_Bridging-Header.h')
    ) {
      acc.push(full);
    }
  }
  return acc;
}

/** @param {boolean} swift */
function hasAppCheckInit(contents, swift) {
  return (
    contents.includes(MARK) ||
    contents.includes(swift ? 'RNFBAppCheckModule.sharedInstance()' : '[RNFBAppCheckModule sharedInstance]')
  );
}

/**
 * Insert App Check singleton before Firebase.configure in Swift AppDelegate.
 * @returns {string}
 */
function ensureAppCheckBeforeFirebaseSwift(contents) {
  if (hasAppCheckInit(contents, true)) return contents;

  let c = contents;

  const insertBeforeConfigure = `\n      RNFBAppCheckModule.sharedInstance()\n      ${MARK}\n      `;

  const idx = c.indexOf('FirebaseApp.configure()');
  if (idx !== -1) {
    return c.slice(0, idx) + insertBeforeConfigure + c.slice(idx);
  }

  if (!c.includes('FirebaseCore')) {
    const lines = c.split('\n');
    let insertAt = 0;
    for (let i = 0; i < Math.min(lines.length, 80); i++) {
      const raw = lines[i];
      const t = raw.trim();
      if (t.startsWith('import ') || t.startsWith('@preconcurrency import ')) {
        insertAt = i + 1;
      }
    }
    lines.splice(insertAt, 0, 'import FirebaseCore');
    c = lines.join('\n');
  }

  const sig = 'didFinishLaunchingWithOptions';
  const si = c.indexOf(sig);
  if (si === -1) return contents;

  const brace = c.indexOf('{', si);
  if (brace === -1) return contents;

  const inject =
    `\n${insertBeforeConfigure.trimStart()}FirebaseApp.configure() // expo plugin: RN Firebase default app from plist\n`;

  return c.slice(0, brace + 1) + inject + c.slice(brace + 1);
}

/**
 * @returns {string}
 */
function ensureAppCheckBeforeFirebaseObjC(contents) {
  if (hasAppCheckInit(contents, false)) return contents;

  let c = contents;
  const insertLines = `\n  [RNFBAppCheckModule sharedInstance];\n  ${MARK}\n`;

  if (!c.includes('#import "RNFBAppCheckModule.h"')) {
    const lm = c.lastIndexOf('#import ');
    const lineEnd = c.indexOf('\n', lm);
    if (lm !== -1 && lineEnd !== -1) {
      c = `${c.slice(0, lineEnd + 1)}#import "RNFBAppCheckModule.h"\n${c.slice(lineEnd + 1)}`;
    }
  }

  const firNeedle = '[FIRApp configure]';
  const idxFir = c.indexOf(firNeedle);
  if (idxFir !== -1) {
    return c.slice(0, idxFir) + insertLines + c.slice(idxFir);
  }

  const sig = 'didFinishLaunchingWithOptions';
  const si = c.indexOf(sig);
  if (si === -1) return contents;
  let brace = c.indexOf('{', si);
  if (brace === -1) return contents;

  if (
    !c.includes('#import <FirebaseCore/FirebaseCore.h>') &&
    !c.includes('#import <Firebase.h>')
  ) {
    const lm = c.lastIndexOf('#import ');
    const lineEnd = c.indexOf('\n', lm);
    if (lm !== -1 && lineEnd !== -1) {
      c = `${c.slice(0, lineEnd + 1)}#import <FirebaseCore/FirebaseCore.h>\n${c.slice(lineEnd + 1)}`;
      brace = c.indexOf('{', si);
      if (brace === -1) return contents;
    }
  }

  const inject = `${insertLines.trimEnd()}\n  [FIRApp configure];\n`;
  return c.slice(0, brace + 1) + inject + c.slice(brace + 1);
}

function patchSwift(contents) {
  return ensureAppCheckBeforeFirebaseSwift(contents);
}

function patchObjectiveCpp(contents) {
  return ensureAppCheckBeforeFirebaseObjC(contents);
}

function ensureBridgingHeadersAppCheckImport(iosRoot) {
  const impLines = `\n// Auto: RN Firebase App Check (withIosFirebaseEarlyConfigure)\n#import "RNFBAppCheckModule.h"\n`;
  const files = collectBridgingHeaders(iosRoot);
  for (const fp of files) {
    try {
      const before = fs.readFileSync(fp, 'utf8');
      if (before.includes('RNFBAppCheckModule')) continue;
      fs.writeFileSync(fp, `${before.endsWith('\n') ? before : `${before}\n`}${impLines}`);
    } catch {
      /* ignore */
    }
  }
}

function withIosFirebaseEarlyConfigureInner(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const iosRoot = cfg.modRequest.platformProjectRoot;

      /** Old one-step patch: Firebase only. Keep delegating through ensure* helpers. */

      ensureBridgingHeadersAppCheckImport(iosRoot);

      const files = collectAppDelegates(iosRoot);
      for (const fp of files) {
        try {
          const before = fs.readFileSync(fp, 'utf8');
          const next = fp.endsWith('.mm')
            ? patchObjectiveCpp(before)
            : patchSwift(before);
          if (next !== before) fs.writeFileSync(fp, next);
        } catch {
          /* ignore */
        }
      }

      return cfg;
    },
  ]);
}

module.exports = createRunOncePlugin(
  withIosFirebaseEarlyConfigureInner,
  'with-ios-firebase-early-configure',
  '2.1.0',
);
