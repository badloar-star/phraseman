/**
 * Jest stub: real @react-native-firebase/auth is ESM; Node test env loads this via
 * moduleNameMapper. Modeled on the firestore/app mocks in this folder.
 *
 * Surface used by app/auth_provider.ts sign-in flow:
 *   - default() → auth instance with { currentUser, signInWithCredential }
 *   - default.GoogleAuthProvider.credential(idToken)
 *   - default.AppleAuthProvider.credential(idToken, nonce?)
 *   - currentUser.isAnonymous / currentUser.linkWithCredential(credential)
 *
 * Test hooks (mutate via auth.__testState / auth.__resetTestState):
 *   linkImpl(credential)   → controls what currentUser.linkWithCredential does
 *   signInImpl(credential) → controls what auth.signInWithCredential does
 *   currentUidAfter        → uid reported by currentUser after a plain sign-in
 * Recorded call order lives in auth.__calls (array of 'link' | 'signin').
 */

const testState = {
  calls: [],
  linkImpl: null, // (credential) => Promise<userCredential>
  signInImpl: null, // (credential) => Promise<userCredential>
  anonUid: 'anon-uid-1',
  providerUid: 'provider-uid-1',
  isAnonymous: true,
};

function makeUser(uid, isAnonymous) {
  return {
    uid,
    email: null,
    isAnonymous,
    linkWithCredential: async (credential) => {
      testState.calls.push('link');
      if (testState.linkImpl) return testState.linkImpl(credential);
      // Default: link succeeds, uid preserved (the anon uid).
      return { user: makeUser(testState.anonUid, false) };
    },
  };
}

const currentUser = makeUser(testState.anonUid, true);

function authInstance() {
  return {
    get currentUser() {
      return testState.isAnonymous
        ? Object.assign(currentUser, { isAnonymous: true })
        : makeUser(testState.providerUid, false);
    },
    signInWithCredential: async (credential) => {
      testState.calls.push('signin');
      if (testState.signInImpl) return testState.signInImpl(credential);
      testState.isAnonymous = false;
      return { user: makeUser(testState.providerUid, false) };
    },
    signInAnonymously: async () => ({ user: makeUser(testState.anonUid, true) }),
  };
}

authInstance.GoogleAuthProvider = {
  credential: (idToken) => ({ providerId: 'google.com', idToken }),
};
authInstance.AppleAuthProvider = {
  credential: (idToken, nonce) => ({ providerId: 'apple.com', idToken, nonce }),
};

authInstance.__testState = testState;
authInstance.__resetTestState = () => {
  testState.calls = [];
  testState.linkImpl = null;
  testState.signInImpl = null;
  testState.anonUid = 'anon-uid-1';
  testState.providerUid = 'provider-uid-1';
  testState.isAnonymous = true;
};

authInstance.default = authInstance;
module.exports = authInstance;
module.exports.__esModule = true;
