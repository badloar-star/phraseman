import assert from 'node:assert/strict';
import fs from 'node:fs';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const source = fs.readFileSync(new URL('../admin/v2/scripts/admin-firebase.js', import.meta.url), 'utf8');

// Owner decision (2026-07-24): the admin panel must remember the session across
// browser restarts and devices, so persistence is local, not session-only.
assert.match(
  source,
  /import \{[^}]*browserLocalPersistence[^}]*setPersistence[^}]*\} from 'https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-auth\.js';/,
  'Admin V2 must import Firebase local persistence explicitly',
);
assert.doesNotMatch(
  source,
  /\bbrowserSessionPersistence\b|\binMemoryPersistence\b/,
  'Admin V2 must not downgrade auth persistence to session-only or in-memory',
);
assert.match(
  source,
  /await\s+setPersistence\s*\(\s*auth\s*,\s*browserLocalPersistence\s*\)/,
  'Admin V2 initialization must await browserLocalPersistence',
);
assert.equal(
  source.match(/\bsetPersistence\s*\(/g)?.length,
  1,
  'Admin V2 must configure auth persistence exactly once',
);

// Owner decision (2026-07-24): popup sign-in hangs on phones, so mobile uses
// redirect sign-in and startup completes any pending redirect result.
assert.match(source, /\bsignInWithRedirect\b/, 'Admin V2 must support redirect sign-in for mobile browsers');
assert.match(source, /await\s+getRedirectResult\s*\(\s*auth\s*\)/, 'Admin V2 must complete redirect sign-in during initialization');

const executableSource = source
  .replace(/^import .*;[\r\n]+/gm, '')
  .replace(/\bexport\s+/g, '');

function createHarness() {
  const persistenceGate = deferred();
  const calls = [];
  const app = {};
  const auth = { currentUser: null };
  const functions = {};
  const provider = {
    setCustomParameters(parameters) {
      calls.push(['setCustomParameters', parameters]);
    },
  };
  const browserLocalPersistence = { type: 'LOCAL' };

  const dependencies = {
    initializeApp() {
      calls.push(['initializeApp']);
      return app;
    },
    getAuth(observedApp) {
      calls.push(['getAuth', observedApp]);
      return auth;
    },
    browserLocalPersistence,
    setPersistence(observedAuth, persistence) {
      calls.push(['setPersistence', observedAuth, persistence]);
      return persistenceGate.promise;
    },
    getRedirectResult(observedAuth) {
      calls.push(['getRedirectResult', observedAuth]);
      return Promise.resolve(null);
    },
    GoogleAuthProvider: function GoogleAuthProvider() {
      calls.push(['GoogleAuthProvider']);
      return provider;
    },
    onAuthStateChanged(observedAuth) {
      calls.push(['onAuthStateChanged', observedAuth]);
      return () => {};
    },
    signInWithPopup(observedAuth, observedProvider) {
      calls.push(['signInWithPopup', observedAuth, observedProvider]);
      return Promise.resolve();
    },
    signInWithRedirect(observedAuth, observedProvider) {
      calls.push(['signInWithRedirect', observedAuth, observedProvider]);
      return Promise.resolve();
    },
    signOut(observedAuth) {
      calls.push(['signOut', observedAuth]);
      return Promise.resolve();
    },
    getFunctions(observedApp, region) {
      calls.push(['getFunctions', observedApp, region]);
      return functions;
    },
    httpsCallable(observedFunctions, name) {
      calls.push(['httpsCallable', observedFunctions, name]);
      return async () => ({ data: {} });
    },
  };

  const { createFirebaseAdminActions } = Function(
    'dependencies',
    `"use strict";
    const {
      initializeApp,
      getAuth,
      browserLocalPersistence,
      setPersistence,
      getRedirectResult,
      GoogleAuthProvider,
      onAuthStateChanged,
      signInWithPopup,
      signInWithRedirect,
      signOut,
      getFunctions,
      httpsCallable
    } = dependencies;
    ${executableSource}
    return { createFirebaseAdminActions };`,
  )(dependencies);

  return {
    auth,
    browserLocalPersistence,
    calls,
    createFirebaseAdminActions,
    persistenceGate,
    provider,
  };
}

globalThis.PHR_MAN_FIREBASE_CONFIG = { projectId: 'admin-v2-auth-test' };
try {
  const success = createHarness();
  let actions;
  const creation = success.createFirebaseAdminActions({ onAuth() {} }).then((value) => {
    actions = value;
    return value;
  });

  await Promise.resolve();
  assert.deepEqual(success.calls, [
    ['initializeApp'],
    ['getAuth', {}],
    ['setPersistence', success.auth, success.browserLocalPersistence],
  ], 'no observer, callable, or action may initialize before local persistence succeeds');
  assert.equal(actions, undefined, 'sign-in actions must stay unavailable until persistence is configured');

  success.persistenceGate.resolve();
  const resolvedActions = await creation;
  const persistenceIndex = success.calls.findIndex(([name]) => name === 'setPersistence');
  const redirectResultIndex = success.calls.findIndex(([name]) => name === 'getRedirectResult');
  const observerIndex = success.calls.findIndex(([name]) => name === 'onAuthStateChanged');
  const firstCallableIndex = success.calls.findIndex(([name]) => name === 'httpsCallable');
  assert.ok(redirectResultIndex > persistenceIndex, 'redirect sign-in must complete only after local persistence succeeds');
  assert.ok(firstCallableIndex > redirectResultIndex, 'callables must initialize only after redirect completion');
  assert.ok(observerIndex > redirectResultIndex, 'the auth observer must subscribe only after redirect completion');

  await resolvedActions.signIn();
  await resolvedActions.signOut();
  assert.deepEqual(success.calls.slice(-2), [
    ['signInWithPopup', success.auth, success.provider],
    ['signOut', success.auth],
  ], 'desktop sign-in must use the popup and stay bound to the same auth instance');

  const failure = createHarness();
  const persistenceError = new Error('local_persistence_unavailable');
  let rejectedActions;
  const failedCreation = failure.createFirebaseAdminActions({ onAuth() {} }).then((value) => {
    rejectedActions = value;
    return value;
  });

  await Promise.resolve();
  failure.persistenceGate.reject(persistenceError);
  await assert.rejects(
    failedCreation,
    (error) => error === persistenceError,
    'Admin V2 initialization must reject when local persistence cannot be configured',
  );
  assert.equal(rejectedActions, undefined, 'no Admin V2 actions may be returned after persistence rejection');
  assert.deepEqual(failure.calls, [
    ['initializeApp'],
    ['getAuth', {}],
    ['setPersistence', failure.auth, failure.browserLocalPersistence],
  ], 'persistence rejection must fail closed before observers, callables, or actions initialize');
} finally {
  delete globalThis.PHR_MAN_FIREBASE_CONFIG;
}

console.log('admin-v2-auth-persistence-lifecycle: PASS');
