/**
 * P0-B1 shard security gate.
 *
 * This gate intentionally uses:
 * - browser-equivalent Auth + Firestore REST requests, so Firestore Rules are
 *   evaluated (Admin SDK would bypass them);
 * - the real exported shardsApplyDelta callable handler against a live
 *   Firestore emulator, so transaction retries and contention are real.
 *
 * Usage from the repository root:
 *   npm --prefix functions run build
 *   node functions/scripts/e2e_shards_p0b1_emulator.cjs
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  const repositoryRoot = path.resolve(__dirname, '..', '..');
  const tempDir = path.join(repositoryRoot, '.codex-tmp', 'p0b1-shards-emulator');
  const tempConfig = path.join(tempDir, 'firebase.json');
  fs.mkdirSync(tempDir, { recursive: true });
  fs.writeFileSync(tempConfig, `${JSON.stringify({
    firestore: { rules: path.join(repositoryRoot, 'firestore.rules') },
    emulators: {
      auth: { port: 9099 },
      firestore: { port: 8080 },
      ui: { enabled: false },
    },
  }, null, 2)}\n`, 'utf8');

  const firebaseArgs = [
    'firebase',
    'emulators:exec',
    '--only',
    'auth,firestore',
    '--project',
    'phraseman-shards-p0b1',
    '--config',
    tempConfig,
    'node functions/scripts/e2e_shards_p0b1_emulator.cjs',
  ];
  const launcher = process.platform === 'win32'
    ? (process.env.ComSpec || 'cmd.exe')
    : 'npx';
  const launcherArgs = process.platform === 'win32'
    ? [
      '/d',
      '/s',
      '/c',
      `npx.cmd firebase emulators:exec --only auth,firestore`
        + ` --project phraseman-shards-p0b1 --config "${tempConfig}"`
        + ' "node functions/scripts/e2e_shards_p0b1_emulator.cjs"',
    ]
    : firebaseArgs;
  const child = spawnSync(launcher, launcherArgs, {
    cwd: repositoryRoot,
    env: process.env,
    stdio: 'inherit',
  });
  if (child.error) {
    console.error('Unable to start Firebase emulators:', child.error);
  }
  process.exit(child.status ?? 2);
}

const admin = require('firebase-admin');

const projectId = process.env.GCLOUD_PROJECT
  || process.env.GOOGLE_CLOUD_PROJECT
  || 'phraseman-shards-p0b1';
admin.initializeApp({ projectId });
const db = admin.firestore();
const auth = admin.auth();
const { shardsApplyDelta } = require('../lib/shards_apply_delta');
const {
  SHARD_EARN_DAILY_TOTAL_MAX,
  utcShardEarnDayKey,
} = require('../lib/shard_reward_catalog');

let failures = 0;

function check(name, condition, detail) {
  if (condition) {
    console.log(`  PASS  ${name}`);
    return;
  }
  failures += 1;
  console.error(`  FAIL  ${name}`, detail === undefined ? '' : JSON.stringify(detail));
}

function requestFor(authUid, data) {
  return {
    auth: { uid: authUid, token: {} },
    data,
    rawRequest: { headers: {} },
    app: {},
  };
}

async function runCallable(authUid, data) {
  if (typeof shardsApplyDelta.run === 'function') {
    return shardsApplyDelta.run(requestFor(authUid, data));
  }
  return shardsApplyDelta(requestFor(authUid, data));
}

function errorCode(reason) {
  return String(reason?.code || reason?.details?.code || reason?.message || '');
}

async function createBrowserAdminToken(uid) {
  const email = `${uid}@example.test`;
  const password = 'Emulator-only-password-123!';
  await auth.createUser({ uid, email, password });
  await auth.setCustomUserClaims(uid, { admin: true });
  const response = await fetch(
    `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`
      + '/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const body = await response.json();
  if (!response.ok || !body.idToken) {
    throw new Error(`auth_emulator_sign_in_failed:${response.status}:${JSON.stringify(body)}`);
  }
  return body.idToken;
}

function firestoreRestUrl(path) {
  return `http://${process.env.FIRESTORE_EMULATOR_HOST}`
    + `/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${path}`;
}

async function browserRead(path, idToken) {
  return fetch(firestoreRestUrl(path), {
    headers: { authorization: `Bearer ${idToken}` },
  });
}

async function browserWriteCounter(path, idToken, dayKey) {
  return fetch(firestoreRestUrl(path), {
    method: 'PATCH',
    headers: {
      authorization: `Bearer ${idToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        dayKey: { stringValue: dayKey },
        totalEarned: { integerValue: '999999' },
        bySource: {
          mapValue: {
            fields: {
              lesson_first: { integerValue: '999999' },
            },
          },
        },
      },
    }),
  });
}

async function scenarioRulesSealInternalShardCollections() {
  console.log('\n[1] Rules: browser admin cannot access internal shard state');
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const browserAdminUid = `browser-admin-${suffix}`;
  const stableUid = `rules-owner-${suffix}`;
  const dayKey = '2099-01-01';
  const userRef = db.collection('users').doc(stableUid);
  const counterRef = userRef.collection('shard_earn_daily_counters').doc(dayKey);
  const receiptRef = userRef.collection('shard_operation_receipts').doc('rules-receipt-1234');
  await userRef.set({ firebaseAuthUid: `owner-${suffix}`, shards: 7 });
  await counterRef.set({ dayKey, totalEarned: 7, bySource: { lesson_first: 7 } });
  await receiptRef.set({ opId: 'rules-receipt-1234', type: 'earn', reason: 'lesson_first', delta: 1 });

  const idToken = await createBrowserAdminToken(browserAdminUid);
  const counterPath = `users/${stableUid}/shard_earn_daily_counters/${dayKey}`;
  const receiptPath = `users/${stableUid}/shard_operation_receipts/rules-receipt-1234`;
  const [counterRead, counterWrite, receiptRead] = await Promise.all([
    browserRead(counterPath, idToken),
    browserWriteCounter(counterPath, idToken, dayKey),
    browserRead(receiptPath, idToken),
  ]);

  check('browser admin counter read is denied', counterRead.status === 403, counterRead.status);
  check('browser admin counter write is denied', counterWrite.status === 403, counterWrite.status);
  check('browser admin receipt read is denied', receiptRead.status === 403, receiptRead.status);

  await counterRef.set({ dayKey, totalEarned: 8, bySource: { lesson_first: 8 } });
  const adminSdkCounter = (await counterRef.get()).data();
  check('Admin SDK still bypasses Rules', adminSdkCounter?.totalEarned === 8, adminSdkCounter);
}

async function seedCapScenario(stableUid, authUid, balance, totalEarned, sourceEarned) {
  const dayKey = utcShardEarnDayKey(Date.now());
  const userRef = db.collection('users').doc(stableUid);
  await userRef.set({ firebaseAuthUid: authUid, shards: balance });
  await userRef.collection('shard_earn_daily_counters').doc(dayKey).set({
    dayKey,
    totalEarned,
    bySource: { lesson_first: sourceEarned },
  });
  return { dayKey, userRef };
}

async function scenarioFiftySameEventReplaysAtCap() {
  console.log('\n[2] Transactions: 50 simultaneous same-event replays at cap');
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const stableUid = `same-owner-${suffix}`;
  const authUid = `same-auth-${suffix}`;
  const initialBalance = 40;
  const { dayKey, userRef } = await seedCapScenario(
    stableUid,
    authUid,
    initialBalance,
    SHARD_EARN_DAILY_TOTAL_MAX - 1,
    127,
  );
  const data = {
    opId: `same-cap-${suffix}`.slice(0, 80),
    ownerStableId: stableUid,
    delta: 1,
    type: 'earn',
    reason: 'lesson_first',
  };

  const settled = await Promise.allSettled(
    Array.from({ length: 50 }, () => runCallable(authUid, data)),
  );
  const fulfilled = settled.filter((row) => row.status === 'fulfilled');
  const rejected = settled.filter((row) => row.status === 'rejected');
  const responses = fulfilled.map((row) => row.value);
  const user = (await userRef.get()).data();
  const counter = (await userRef.collection('shard_earn_daily_counters').doc(dayKey).get()).data();
  const receipts = await userRef.collection('shard_operation_receipts').get();

  check('all 50 same-event calls settle successfully', fulfilled.length === 50, {
    fulfilled: fulfilled.length,
    rejected: rejected.map((row) => errorCode(row.reason)),
  });
  check('exactly one same-event call performs the grant',
    responses.filter((row) => row.alreadyApplied === false).length === 1,
    responses.map((row) => row.alreadyApplied));
  check('same-event wallet increments once', user?.shards === initialBalance + 1, user);
  check('same-event total counter stops exactly at cap',
    counter?.totalEarned === SHARD_EARN_DAILY_TOTAL_MAX, counter);
  check('same-event source counter increments once', counter?.bySource?.lesson_first === 128, counter);
  check('same-event creates exactly one receipt', receipts.size === 1, receipts.size);
}

async function scenarioFiftyUniqueEventsAtCap() {
  console.log('\n[3] Transactions: 50 simultaneous unique events at cap');
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const stableUid = `unique-owner-${suffix}`;
  const authUid = `unique-auth-${suffix}`;
  const initialBalance = 100;
  const available = 10;
  const { dayKey, userRef } = await seedCapScenario(
    stableUid,
    authUid,
    initialBalance,
    SHARD_EARN_DAILY_TOTAL_MAX - available,
    128 - available,
  );

  const settled = await Promise.allSettled(
    Array.from({ length: 50 }, (_, index) => runCallable(authUid, {
      opId: `unique-${String(index).padStart(2, '0')}-${suffix}`.slice(0, 80),
      ownerStableId: stableUid,
      delta: 1,
      type: 'earn',
      reason: 'lesson_first',
    })),
  );
  const fulfilled = settled.filter((row) => row.status === 'fulfilled');
  const rejected = settled.filter((row) => row.status === 'rejected');
  const rejectedCodes = rejected.map((row) => errorCode(row.reason));
  const user = (await userRef.get()).data();
  const counter = (await userRef.collection('shard_earn_daily_counters').doc(dayKey).get()).data();
  const receipts = await userRef.collection('shard_operation_receipts').get();

  check('exactly remaining-cap unique events are granted', fulfilled.length === available, {
    fulfilled: fulfilled.length,
    rejected: rejectedCodes,
  });
  check('all excess unique events fail closed at the cap',
    rejected.length === 50 - available
      && rejectedCodes.every((code) => code.includes('resource-exhausted')),
    rejectedCodes);
  check('unique-event wallet cannot overgrant', user?.shards === initialBalance + available, user);
  check('unique-event total counter stops exactly at cap',
    counter?.totalEarned === SHARD_EARN_DAILY_TOTAL_MAX, counter);
  check('unique-event source counter stops exactly at source cap',
    counter?.bySource?.lesson_first === 128, counter);
  check('receipt count equals wallet grant count', receipts.size === available, receipts.size);
}

async function main() {
  await scenarioRulesSealInternalShardCollections();
  await scenarioFiftySameEventReplaysAtCap();
  await scenarioFiftyUniqueEventsAtCap();
  console.log(`\n${failures === 0 ? 'ALL P0-B1 SHARD CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('P0-B1 shard E2E crashed:', error);
  process.exit(3);
});
