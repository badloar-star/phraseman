// Run from the repository root:
// npx firebase emulators:exec --config firebase.rules-test.json --only firestore,auth
//   --project demo-phraseman-rules-budget "node tests/firestore_rules_expression_budget_emulator.mjs"
import assert from 'node:assert/strict';
import { deleteApp as deleteAdminApp, initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { deleteApp, initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  signInAnonymously,
  signOut,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  doc,
  getFirestore,
  setLogLevel,
  setDoc,
  terminate,
  updateDoc,
} from 'firebase/firestore';

const projectId = process.env.GCLOUD_PROJECT || 'demo-phraseman-rules-budget';
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const [firestoreHostname, firestorePortText] = firestoreHost.split(':');
const firestorePort = Number(firestorePortText);

if (!Number.isInteger(firestorePort)) {
  throw new Error(`Invalid FIRESTORE_EMULATOR_HOST: ${firestoreHost}`);
}

const clientApp = initializeApp({
  apiKey: 'demo-api-key',
  authDomain: `${projectId}.firebaseapp.com`,
  projectId,
}, `rules-budget-client-${Date.now()}`);
const adminApp = initializeAdminApp({ projectId }, `rules-budget-admin-${Date.now()}`);
const auth = getAuth(clientApp);
const db = getFirestore(clientApp);
const adminDb = getAdminFirestore(adminApp);
const results = [];

setLogLevel('silent');
connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
connectFirestoreEmulator(db, firestoreHostname, firestorePort);

function errorCode(error) {
  return error && typeof error === 'object' && 'code' in error
    ? String(error.code)
    : '';
}

async function expectAllowed(name, operation) {
  try {
    await operation();
    results.push(`ALLOW ${name}`);
  } catch (error) {
    const code = errorCode(error);
    throw new Error(`${name} should be allowed, got ${code || String(error)}`, { cause: error });
  }
}

async function expectDenied(name, operation) {
  try {
    await operation();
  } catch (error) {
    const code = errorCode(error);
    assert.match(code, /permission-denied$/, `${name} failed for an unexpected reason: ${code}`);
    results.push(`DENY ${name}`);
    return;
  }
  throw new Error(`${name} should be denied`);
}

let uid = '';

try {
  const credential = await signInAnonymously(auth);
  uid = credential.user.uid;
  const userRef = doc(db, 'users', uid);

  await adminDb.doc(`users/${uid}`).set({
    firebaseAuthUid: uid,
    progressServerAuthoritative: true,
    progressServerState: { totalXp: 120, level: 2 },
    progress: {
      user_total_xp: '120',
      user_level: '2',
      lesson12_best_score: '4',
      'lesson_progress_v2::fr::lesson12_best_score': '4',
      level_exam_A1_best_pct: '70',
      'level_exams_v2::fr::level_exam_A1_best_pct': '70',
    },
    updatedAt: 1,
  });

  await expectAllowed('cloud_sync progress merge', () => setDoc(userRef, {
    firebaseAuthUid: uid,
    progress: {
      user_name: 'Rules Budget User',
      energy_state: JSON.stringify({ energy: 4, updatedAt: 2 }),
    },
    updatedAt: 2,
    last_active_at: 2,
  }, { merge: true }));

  await expectAllowed('push registration merge', () => setDoc(userRef, {
    firebaseAuthUid: uid,
    expoPushToken: 'ExponentPushToken[rules-budget]',
    pushTokenPlatform: 'android',
    pushTokenLang: 'ru',
    pushTokenTimezone: 'Europe/Dublin',
    pushTokenUpdatedAt: 3,
  }, { merge: true }));

  await expectAllowed('leaderboard heartbeat merge', () => setDoc(userRef, {
    firebaseAuthUid: uid,
    updatedAt: 4,
  }, { merge: true }));

  await expectAllowed('friend likes auth-link merge', () => setDoc(userRef, {
    firebaseAuthUid: uid,
  }, { merge: true }));

  const grantedAtMs = Date.now();
  await expectAllowed('valid intro gift merge', () => setDoc(userRef, {
    progress: {
      intro_access_granted_at_ms: String(grantedAtMs),
      intro_access_until_ms: String(grantedAtMs + 24 * 60 * 60 * 1000),
    },
    updatedAt: grantedAtMs,
  }, { merge: true }));

  await expectDenied('premium/VIP mutation', () => setDoc(userRef, {
    progress: { vip_until: '9999999999999' },
  }, { merge: true }));
  await expectDenied('shards mutation', () => updateDoc(userRef, { shards: 999999 }));
  await expectDenied('server XP mutation', () => setDoc(userRef, {
    progress: { user_total_xp: '999999' },
  }, { merge: true }));
  await expectDenied('identity authority mutation', () => updateDoc(userRef, {
    canonicalStableId: 'victim-stable-id',
  }));
  await expectDenied('progress authority marker mutation', () => updateDoc(userRef, {
    progressServerAuthoritative: false,
  }));

  for (const [name, key] of [
    ['English lesson score mutation', 'lesson12_best_score'],
    ['English final lesson mutation', 'lesson80_cellIndex'],
    ['French lesson row mutation', 'lesson_progress_v2::fr::12'],
    ['French lesson score mutation', 'lesson_progress_v2::fr::lesson12_best_score'],
    ['French final lesson mutation', 'lesson_progress_v2::fr::lesson80_cellIndex'],
    ['English exam score mutation', 'level_exam_A1_best_pct'],
    ['English final exam mutation', 'level_exam_final_completed_at'],
    ['French exam score mutation', 'level_exams_v2::fr::level_exam_A1_best_pct'],
    ['French final exam mutation', 'level_exams_v2::fr::level_exam_final_completed_at'],
  ]) {
    await expectDenied(name, () => setDoc(userRef, {
      progress: { [key]: '100' },
    }, { merge: true }));
  }

  console.log(results.join('\n'));
} finally {
  if (uid) {
    await adminDb.doc(`users/${uid}`).delete().catch(() => undefined);
  }
  await signOut(auth).catch(() => undefined);
  await terminate(db).catch(() => undefined);
  await deleteApp(clientApp).catch(() => undefined);
  await deleteAdminApp(adminApp).catch(() => undefined);
}
