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
const functionStart = source.indexOf('export function observeAdminAuthState');
// The file mixes LF and CRLF lines, so the boundary search must tolerate both.
const separatorMatch = /\r?\n\r?\nexport async function createFirebaseAdminActions/.exec(source.slice(Math.max(functionStart, 0)));
const functionEnd = separatorMatch ? functionStart + separatorMatch.index : -1;
assert(functionStart >= 0 && functionEnd > functionStart, 'observeAdminAuthState must be a separately testable boundary');
const functionSource = source
  .slice(functionStart, functionEnd)
  .replace('export function observeAdminAuthState', 'function observeAdminAuthState');
const observeAdminAuthState = Function(`"use strict"; ${functionSource}; return observeAdminAuthState;`)();

let observer = null;
const emitted = [];
const auth = { currentUser: null };
observeAdminAuthState({
  auth,
  subscribe(observedAuth, callback) {
    assert.equal(observedAuth, auth);
    observer = callback;
    return () => {};
  },
  onAuth(value) {
    emitted.push(value);
  },
});
assert.equal(typeof observer, 'function');

const tokenA = deferred();
const tokenB = deferred();
const userA = {
  uid: 'firebase-user-a',
  email: 'a@example.com',
  getIdTokenResult(forceRefresh) {
    assert.equal(forceRefresh, true);
    return tokenA.promise;
  },
};
const userB = {
  uid: 'firebase-user-b',
  email: 'b@example.com',
  getIdTokenResult(forceRefresh) {
    assert.equal(forceRefresh, true);
    return tokenB.promise;
  },
};

auth.currentUser = userA;
const observationA = observer(userA);
auth.currentUser = userB;
const observationB = observer(userB);

tokenB.resolve({ claims: { admin: true, adminRole: 'owner' } });
await observationB;
tokenA.resolve({ claims: { admin: true, adminRole: 'owner' } });
await observationA;

assert.deepEqual(emitted, [{
  authorized: true,
  email: 'b@example.com',
  role: 'owner',
  uid: 'firebase-user-b',
}], 'late user A token resolution must not overwrite newer user B');

const tokenC = deferred();
const userC = {
  uid: 'firebase-user-c',
  email: 'c@example.com',
  getIdTokenResult(forceRefresh) {
    assert.equal(forceRefresh, true);
    return tokenC.promise;
  },
};
auth.currentUser = userC;
const observationC = observer(userC);
auth.currentUser = null;
await observer(null);
tokenC.reject(new Error('stale refresh failed'));
await observationC;

assert.deepEqual(emitted.at(-1), {
  authorized: false,
  email: '',
  role: '',
  uid: '',
}, 'late failure from a signed-out user must not replace the sign-out state');
assert.equal(emitted.some((value) => value.email === 'c@example.com'), false);

console.log('admin-v2-auth-observer-race: PASS');
