#!/usr/bin/env node
/**
 * One-off, owner-authorized recovery for Vitalii's stale authoritative streak.
 *
 * Default mode is read-only:
 *   node scripts/_recovery/recover_vitalii_streak_2026_09_03.js
 *
 * The only write mode is explicit and idempotent:
 *   node scripts/_recovery/recover_vitalii_streak_2026_09_03.js --execute
 *
 * One Firestore transaction updates the canonical progress streak, its server
 * shadow, the leaderboard projection, and the current league member mirror.
 * A deterministic operation record and audit record make retries safe and
 * retain the exact before/after recovery evidence.
 */

const crypto = require('node:crypto');
const fs = require('node:fs');

const RECOVERY = Object.freeze({
  uid: '62615956-e1e1-4b47-8fa0-caa088fff6d4',
  expectedName: 'Vitalii',
  expectedXp: 564816,
  before: Object.freeze({
    streakCount: 138,
    activeDate: '2026-08-28',
    shadowStreakCount: 93,
  }),
  after: Object.freeze({
    streakCount: 143,
    activeDate: '2026-09-03',
  }),
  operationId: 'recovery_vitalii_streak_2026_09_03_143',
  reason: 'Owner-authorized recovery: daily activity evidence through 2026-09-03 and device screenshot prove a 143-day streak; authoritative server mirrors were stale.',
});

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asInt(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function fail(message) {
  throw new Error(`RECOVERY_PRECONDITION_FAILED: ${message}`);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) fail(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function buildRecoveryPlan(state) {
  const user = asRecord(state.user);
  const progress = asRecord(user.progress);
  const shadow = asRecord(user.progressServerState);
  const leaderboard = asRecord(state.leaderboard);
  const leagueGroup = asRecord(state.leagueGroup);
  const members = asRecord(leagueGroup.members);
  const member = asRecord(members[RECOVERY.uid]);

  assertEqual(state.userExists, true, 'users document existence');
  assertEqual(String(progress.user_name || '').trim().toLowerCase(), RECOVERY.expectedName.toLowerCase(), 'user name');
  assertEqual(user.identityHidden === true, false, 'identityHidden');
  if (user.canonicalStableId != null && String(user.canonicalStableId).trim() !== '') fail('canonicalStableId must be absent');
  assertEqual(user.progressServerAuthoritative, true, 'progressServerAuthoritative');
  assertEqual(asInt(progress.user_total_xp), RECOVERY.expectedXp, 'progress.user_total_xp');
  assertEqual(asInt(shadow.totalXp), RECOVERY.expectedXp, 'progressServerState.totalXp');

  assertEqual(state.leaderboardExists, true, 'leaderboard document existence');
  assertEqual(asInt(leaderboard.points), RECOVERY.expectedXp, 'leaderboard.points');
  if (!String(leaderboard.groupId || '').trim()) fail('leaderboard.groupId must be present');
  if (!String(leaderboard.groupWeekId || '').trim()) fail('leaderboard.groupWeekId must be present');

  assertEqual(state.leagueGroupExists, true, 'league group document existence');
  assertEqual(String(leagueGroup.weekId || ''), String(leaderboard.groupWeekId), 'league group week');
  assertEqual(String(member.uid || ''), RECOVERY.uid, 'league member uid');
  assertEqual(asInt(member.totalXp), RECOVERY.expectedXp, 'league member totalXp');

  const targetValues = [
    [asInt(progress.streak_count), RECOVERY.after.streakCount],
    [progress.last_active_date, RECOVERY.after.activeDate],
    [progress.streak_last_date, RECOVERY.after.activeDate],
    [asInt(shadow.streakCount), RECOVERY.after.streakCount],
    [shadow.lastActiveDate, RECOVERY.after.activeDate],
    [asInt(leaderboard.streak), RECOVERY.after.streakCount],
    [asInt(member.streak), RECOVERY.after.streakCount],
  ];
  const alreadyApplied = targetValues.every(([actual, expected]) => actual === expected);

  if (!alreadyApplied) {
    assertEqual(asInt(progress.streak_count), RECOVERY.before.streakCount, 'progress.streak_count');
    assertEqual(progress.last_active_date, RECOVERY.before.activeDate, 'progress.last_active_date');
    assertEqual(progress.streak_last_date, RECOVERY.before.activeDate, 'progress.streak_last_date');
    assertEqual(asInt(shadow.streakCount), RECOVERY.before.shadowStreakCount, 'progressServerState.streakCount');
    assertEqual(shadow.lastActiveDate, RECOVERY.before.activeDate, 'progressServerState.lastActiveDate');
    assertEqual(asInt(leaderboard.streak), RECOVERY.before.streakCount, 'leaderboard.streak');
    assertEqual(asInt(member.streak), RECOVERY.before.streakCount, 'league member streak');
  }

  return Object.freeze({
    mode: alreadyApplied ? 'already-applied' : 'apply',
    userPatch: Object.freeze({
      'progress.streak_count': String(RECOVERY.after.streakCount),
      'progress.last_active_date': RECOVERY.after.activeDate,
      'progress.streak_last_date': RECOVERY.after.activeDate,
      'progressServerState.streakCount': RECOVERY.after.streakCount,
      'progressServerState.lastActiveDate': RECOVERY.after.activeDate,
    }),
    leaderboardPatch: Object.freeze({ streak: RECOVERY.after.streakCount }),
    leagueGroupPatch: Object.freeze({ [`members.${RECOVERY.uid}.streak`]: RECOVERY.after.streakCount }),
    before: Object.freeze({
      progressStreakCount: asInt(progress.streak_count),
      progressActiveDate: progress.last_active_date,
      progressStreakLastDate: progress.streak_last_date,
      shadowStreakCount: asInt(shadow.streakCount),
      shadowActiveDate: shadow.lastActiveDate,
      leaderboardStreak: asInt(leaderboard.streak),
      leagueMemberStreak: asInt(member.streak),
    }),
    after: Object.freeze({ streakCount: RECOVERY.after.streakCount, activeDate: RECOVERY.after.activeDate }),
  });
}

function canonicalize(value) {
  if (value == null || typeof value !== 'object') return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.keys(value).sort().reduce((output, key) => {
    output[key] = canonicalize(value[key]);
    return output;
  }, {});
}

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}

function unrelatedDigests(userData, leaderboardData, groupData) {
  const user = { ...asRecord(userData) };
  const progress = { ...asRecord(user.progress) };
  delete progress.streak_count;
  delete progress.last_active_date;
  delete progress.streak_last_date;
  user.progress = progress;
  const shadow = { ...asRecord(user.progressServerState) };
  delete shadow.streakCount;
  delete shadow.lastActiveDate;
  delete shadow.updatedAt;
  user.progressServerState = shadow;
  delete user.updatedAt;

  const leaderboard = { ...asRecord(leaderboardData) };
  delete leaderboard.streak;

  const group = { ...asRecord(groupData) };
  const members = { ...asRecord(group.members) };
  const member = { ...asRecord(members[RECOVERY.uid]) };
  delete member.streak;
  members[RECOVERY.uid] = member;
  group.members = members;

  return Object.freeze({
    user: digest(user),
    leaderboard: digest(leaderboard),
    leagueGroup: digest(group),
  });
}

function operationFingerprint() {
  return digest({
    action: 'recover_authoritative_streak',
    uid: RECOVERY.uid,
    expectedXp: RECOVERY.expectedXp,
    before: RECOVERY.before,
    after: RECOVERY.after,
  });
}

function initAdmin() {
  const admin = require('firebase-admin');
  if (admin.apps.length > 0) return admin;
  let credential;
  if (fs.existsSync('./service-account.json')) {
    credential = admin.credential.cert(JSON.parse(fs.readFileSync('./service-account.json', 'utf8')));
  } else {
    credential = admin.credential.applicationDefault();
  }
  admin.initializeApp({ credential, projectId: process.env.FIREBASE_PROJECT_ID || 'phraseman-ea0b3' });
  return admin;
}

function stateFromSnapshots(userSnap, leaderboardSnap, groupSnap) {
  return {
    userExists: userSnap.exists,
    user: userSnap.data() || {},
    leaderboardExists: leaderboardSnap.exists,
    leaderboard: leaderboardSnap.data() || {},
    leagueGroupExists: groupSnap.exists,
    leagueGroup: groupSnap.data() || {},
  };
}

async function readRecoveryState(db) {
  const userRef = db.collection('users').doc(RECOVERY.uid);
  const leaderboardRef = db.collection('leaderboard').doc(RECOVERY.uid);
  const [userSnap, leaderboardSnap] = await Promise.all([userRef.get(), leaderboardRef.get()]);
  const groupId = String(leaderboardSnap.data()?.groupId || '');
  const groupRef = db.collection('league_groups').doc(groupId || '__missing__');
  const groupSnap = await groupRef.get();
  return { userRef, leaderboardRef, groupRef, userSnap, leaderboardSnap, groupSnap };
}

async function verifyFresh(db, expectedDigests) {
  const snapshots = await readRecoveryState(db);
  const plan = buildRecoveryPlan(stateFromSnapshots(snapshots.userSnap, snapshots.leaderboardSnap, snapshots.groupSnap));
  if (plan.mode !== 'already-applied') fail('fresh read does not contain the complete target state');

  const userData = snapshots.userSnap.data() || {};
  const authUid = String(userData.firebaseAuthUid || '');
  if (!authUid) fail('firebaseAuthUid is absent');
  const [sameAuth, authLinks, operationSnap, auditSnap] = await Promise.all([
    db.collection('users').where('firebaseAuthUid', '==', authUid).get(),
    db.collection('auth_links').where('stable_id', '==', RECOVERY.uid).get(),
    db.collection('admin_command_operations').doc(RECOVERY.operationId).get(),
    db.collection('admin_log').doc(RECOVERY.operationId).get(),
  ]);
  const sameAuthIds = sameAuth.docs.map((doc) => doc.id);
  assertEqual(sameAuthIds.length, 1, 'users documents with same firebaseAuthUid');
  assertEqual(sameAuthIds[0], RECOVERY.uid, 'canonical users document for firebaseAuthUid');
  assertEqual(authLinks.size, 1, 'auth_links entries for stable identity');
  assertEqual(operationSnap.exists, true, 'idempotency operation document');
  assertEqual(auditSnap.exists, true, 'audit document');
  assertEqual(operationSnap.data()?.requestFingerprint, operationFingerprint(), 'operation fingerprint');

  const freshDigests = unrelatedDigests(userData, snapshots.leaderboardSnap.data(), snapshots.groupSnap.data());
  for (const key of Object.keys(expectedDigests)) {
    assertEqual(freshDigests[key], expectedDigests[key], `unchanged ${key} digest`);
  }

  return {
    progress: {
      user_total_xp: userData.progress?.user_total_xp,
      streak_count: userData.progress?.streak_count,
      last_active_date: userData.progress?.last_active_date,
      streak_last_date: userData.progress?.streak_last_date,
    },
    progressServerState: {
      totalXp: userData.progressServerState?.totalXp,
      streakCount: userData.progressServerState?.streakCount,
      lastActiveDate: userData.progressServerState?.lastActiveDate,
    },
    leaderboard: {
      points: snapshots.leaderboardSnap.data()?.points,
      streak: snapshots.leaderboardSnap.data()?.streak,
    },
    leagueGroup: {
      id: snapshots.groupRef.id,
      totalXp: snapshots.groupSnap.data()?.members?.[RECOVERY.uid]?.totalXp,
      streak: snapshots.groupSnap.data()?.members?.[RECOVERY.uid]?.streak,
    },
    identity: { sameAuthUserDocuments: sameAuthIds.length, authLinks: authLinks.size },
    audit: { operationId: RECOVERY.operationId, auditId: RECOVERY.operationId },
  };
}

async function executeRecovery(db, admin) {
  const userRef = db.collection('users').doc(RECOVERY.uid);
  const leaderboardRef = db.collection('leaderboard').doc(RECOVERY.uid);
  const operationRef = db.collection('admin_command_operations').doc(RECOVERY.operationId);
  const auditRef = db.collection('admin_log').doc(RECOVERY.operationId);
  const requestFingerprint = operationFingerprint();

  return db.runTransaction(async (tx) => {
    const [userSnap, leaderboardSnap, operationSnap, auditSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(leaderboardRef),
      tx.get(operationRef),
      tx.get(auditRef),
    ]);
    const groupId = String(leaderboardSnap.data()?.groupId || '');
    const groupRef = db.collection('league_groups').doc(groupId || '__missing__');
    const groupSnap = await tx.get(groupRef);
    const plan = buildRecoveryPlan(stateFromSnapshots(userSnap, leaderboardSnap, groupSnap));
    const currentDigests = unrelatedDigests(userSnap.data(), leaderboardSnap.data(), groupSnap.data());

    if (operationSnap.exists) {
      assertEqual(auditSnap.exists, true, 'audit document for replay');
      assertEqual(operationSnap.data()?.requestFingerprint, requestFingerprint, 'idempotency replay fingerprint');
      assertEqual(operationSnap.data()?.uid, RECOVERY.uid, 'idempotency replay uid');
      return { replayed: true, mode: plan.mode, unrelatedDigests: operationSnap.data()?.unrelatedDigests || currentDigests };
    }
    if (auditSnap.exists) fail('audit exists without idempotency operation');

    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    if (plan.mode === 'apply') {
      tx.update(userRef, {
        ...plan.userPatch,
        'progressServerState.updatedAt': timestamp,
        updatedAt: timestamp,
      });
      tx.update(leaderboardRef, plan.leaderboardPatch);
      tx.update(groupRef, plan.leagueGroupPatch);
    }

    const nowIso = new Date().toISOString();
    tx.create(auditRef, {
      action: 'recover_authoritative_streak',
      actorUid: 'service-account:phraseman-ea0b3',
      role: 'owner',
      entity: { collection: 'users', id: RECOVERY.uid },
      reason: RECOVERY.reason,
      before: plan.before,
      after: plan.after,
      rollbackReference: `admin_command_operations/${RECOVERY.operationId}#before`,
      requestId: RECOVERY.operationId,
      timestamp: nowIso,
      operationId: RECOVERY.operationId,
    });
    tx.create(operationRef, {
      action: 'recover_authoritative_streak',
      actorUid: 'service-account:phraseman-ea0b3',
      uid: RECOVERY.uid,
      requestFingerprint,
      reason: RECOVERY.reason,
      before: plan.before,
      after: plan.after,
      unrelatedDigests: currentDigests,
      result: { ok: true, uid: RECOVERY.uid, streakCount: RECOVERY.after.streakCount, activeDate: RECOVERY.after.activeDate },
      createdAt: timestamp,
    });
    return { replayed: false, mode: plan.mode, unrelatedDigests: currentDigests };
  });
}

async function main() {
  const execute = process.argv.includes('--execute');
  const admin = initAdmin();
  const db = admin.firestore();
  const snapshots = await readRecoveryState(db);
  const plan = buildRecoveryPlan(stateFromSnapshots(snapshots.userSnap, snapshots.leaderboardSnap, snapshots.groupSnap));

  console.log(JSON.stringify({
    mode: execute ? 'EXECUTE' : 'DRY_RUN',
    uid: RECOVERY.uid,
    planMode: plan.mode,
    before: plan.before,
    after: plan.after,
    userPatch: plan.userPatch,
    leaderboardPatch: plan.leaderboardPatch,
    leagueGroupId: snapshots.groupRef.id,
    leagueGroupPatch: plan.leagueGroupPatch,
    operationId: RECOVERY.operationId,
  }, null, 2));

  if (!execute) {
    console.log('DRY_RUN_OK: no writes performed');
    return;
  }

  const result = await executeRecovery(db, admin);
  const verified = await verifyFresh(db, result.unrelatedDigests);
  console.log(JSON.stringify({ transaction: result, verified }, null, 2));
  console.log('RECOVERY_VERIFIED');
}

module.exports = {
  RECOVERY,
  buildRecoveryPlan,
  operationFingerprint,
  unrelatedDigests,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  });
}
