#!/usr/bin/env node
/**
 * Owner-authorized, evidence-backed recovery of Vitalii's missing XP.
 *
 * Read-only dry-run:
 *   node scripts/_recovery/recover_vitalii_xp_2026_09_04.js
 *
 * Explicit idempotent write:
 *   node scripts/_recovery/recover_vitalii_xp_2026_09_04.js --execute
 */

const crypto = require('node:crypto');
const fs = require('node:fs');

const RECOVERY = Object.freeze({
  uid: '62615956-e1e1-4b47-8fa0-caa088fff6d4',
  expectedName: 'Vitalii',
  checkpointXp: 583243,
  dailyFrom: '2026-07-15',
  dailyThrough: '2026-09-04',
  dailyEntries: 45,
  dailyXp: 141947,
  dailyEvidenceDigest: '03ff2d74e4a68b5645179c3e382c8a80b29e1b8214329afb6e73d271551b879d',
  before: Object.freeze({
    totalXp: 564876,
    previousXp: 564759,
    level: 50,
    streakCount: 143,
    activeDate: '2026-09-03',
    spinBaseline: 50,
    spinBalance: 0,
  }),
  after: Object.freeze({
    totalXp: 725190,
    previousXp: 725190,
    level: 51,
    streakCount: 144,
    activeDate: '2026-09-04',
    spinBaseline: 51,
    spinBalance: 1,
  }),
  creditId: 'level_spin_v1_051',
  operationId: 'recovery_vitalii_xp_2026_09_04_725190',
  reason: 'Owner-authorized recovery: trusted local checkpoint 583243 plus immutable daily_stats evidence 141947 through 2026-09-04 proves 725190 XP; the same positive 2026-09-04 activity proves streak 144.',
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

function parseDailyEvidence(raw) {
  let parsed;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    fail('progress.daily_stats is not valid JSON');
  }
  const stats = asRecord(parsed);
  const rows = Object.entries(stats)
    .filter(([date]) => date >= RECOVERY.dailyFrom)
    .sort(([left], [right]) => left.localeCompare(right));
  const evidence = {};
  let total = 0;
  for (const [date, rawEntry] of rows) {
    const entry = asRecord(rawEntry);
    const points = asInt(entry.points);
    const streak = asInt(entry.streak);
    if (points == null || points < 0) fail(`daily_stats ${date} points must be a non-negative integer`);
    if (streak == null || streak < 0) fail(`daily_stats ${date} streak must be a non-negative integer`);
    evidence[date] = { ...entry };
    total += points;
  }
  return {
    evidence,
    entries: rows.length,
    total,
    firstDate: rows[0]?.[0] ?? null,
    lastDate: rows.at(-1)?.[0] ?? null,
    evidenceDigest: digest(evidence),
  };
}

function canonicalCredit(data) {
  const credit = asRecord(data);
  return credit.level === 51
    && credit.kind === 'standard'
    && credit.premiumAtEarn === true
    && credit.status === 'available'
    && Number.isSafeInteger(credit.earnedAtMs)
    && credit.earnedAtMs > 0
    && credit.consumedAtMs === null
    && credit.claimRequestId === null
    && credit.schemaVersion === 1
    && credit.catalogVersion === 1;
}

function buildRecoveryPlan(state) {
  const user = asRecord(state.user);
  const progress = asRecord(user.progress);
  const shadow = asRecord(user.progressServerState);
  const spin = asRecord(user.levelSpinServerState);
  const leaderboard = asRecord(state.leaderboard);
  const leagueGroup = asRecord(state.leagueGroup);
  const member = asRecord(asRecord(leagueGroup.members)[RECOVERY.uid]);
  const daily = parseDailyEvidence(progress.daily_stats);

  assertEqual(state.userExists, true, 'users document existence');
  assertEqual(String(progress.user_name || '').trim().toLowerCase(), RECOVERY.expectedName.toLowerCase(), 'user name');
  assertEqual(user.identityHidden === true, false, 'identityHidden');
  if (user.canonicalStableId != null && String(user.canonicalStableId).trim() !== '') fail('canonicalStableId must be absent');
  assertEqual(user.progressServerAuthoritative, true, 'progressServerAuthoritative');
  assertEqual(state.premiumAccess, true, 'canonical premium access');

  assertEqual(daily.entries, RECOVERY.dailyEntries, 'daily evidence entry count');
  assertEqual(daily.total, RECOVERY.dailyXp, 'daily evidence XP');
  assertEqual(daily.firstDate, RECOVERY.dailyFrom, 'daily evidence first date');
  assertEqual(daily.lastDate, RECOVERY.dailyThrough, 'daily evidence last date');
  assertEqual(daily.evidenceDigest, RECOVERY.dailyEvidenceDigest, 'daily evidence digest');
  assertEqual(asInt(daily.evidence[RECOVERY.dailyThrough]?.points) > 0, true, 'latest daily evidence has positive XP');
  assertEqual(asInt(daily.evidence[RECOVERY.dailyThrough]?.streak), RECOVERY.after.streakCount, 'latest daily evidence streak');
  assertEqual(RECOVERY.checkpointXp + daily.total, RECOVERY.after.totalXp, 'evidence-derived target XP');

  assertEqual(state.leaderboardExists, true, 'leaderboard document existence');
  if (!String(leaderboard.groupId || '').trim()) fail('leaderboard.groupId must be present');
  if (!String(leaderboard.groupWeekId || '').trim()) fail('leaderboard.groupWeekId must be present');
  assertEqual(state.leagueGroupExists, true, 'league group document existence');
  assertEqual(String(leagueGroup.weekId || ''), String(leaderboard.groupWeekId), 'league group week');
  assertEqual(String(member.uid || ''), RECOVERY.uid, 'league member uid');

  assertEqual(spin.protocol, 'v1', 'level spin protocol');
  assertEqual(spin.activeRequestId ?? null, null, 'level spin active request');

  const targetValues = [
    [asInt(progress.user_total_xp), RECOVERY.after.totalXp],
    [asInt(progress.user_prev_xp), RECOVERY.after.previousXp],
    [asInt(progress.user_level), RECOVERY.after.level],
    [asInt(progress.streak_count), RECOVERY.after.streakCount],
    [progress.last_active_date, RECOVERY.after.activeDate],
    [progress.streak_last_date, RECOVERY.after.activeDate],
    [asInt(progress.level_reward_spin_balance), RECOVERY.after.spinBalance],
    [asInt(shadow.totalXp), RECOVERY.after.totalXp],
    [asInt(shadow.level), RECOVERY.after.level],
    [asInt(shadow.streakCount), RECOVERY.after.streakCount],
    [shadow.lastActiveDate, RECOVERY.after.activeDate],
    [asInt(spin.levelBaseline), RECOVERY.after.spinBaseline],
    [asInt(spin.balance), RECOVERY.after.spinBalance],
    [asInt(leaderboard.points), RECOVERY.after.totalXp],
    [asInt(leaderboard.streak), RECOVERY.after.streakCount],
    [asInt(member.totalXp), RECOVERY.after.totalXp],
    [asInt(member.streak), RECOVERY.after.streakCount],
  ];
  const alreadyApplied = targetValues.every(([actual, expected]) => actual === expected);

  if (alreadyApplied) {
    assertEqual(state.level51CreditExists, true, 'level-51 credit existence after recovery');
    assertEqual(canonicalCredit(state.level51Credit), true, 'canonical level-51 credit after recovery');
  } else {
    const beforeValues = [
      [asInt(progress.user_total_xp), RECOVERY.before.totalXp, 'progress.user_total_xp'],
      [asInt(progress.user_prev_xp), RECOVERY.before.previousXp, 'progress.user_prev_xp'],
      [asInt(progress.user_level), RECOVERY.before.level, 'progress.user_level'],
      [asInt(progress.streak_count), RECOVERY.before.streakCount, 'progress.streak_count'],
      [progress.last_active_date, RECOVERY.before.activeDate, 'progress.last_active_date'],
      [progress.streak_last_date, RECOVERY.before.activeDate, 'progress.streak_last_date'],
      [asInt(progress.level_reward_spin_balance ?? 0), RECOVERY.before.spinBalance, 'progress.level_reward_spin_balance'],
      [asInt(shadow.totalXp), RECOVERY.before.totalXp, 'progressServerState.totalXp'],
      [asInt(shadow.level), RECOVERY.before.level, 'progressServerState.level'],
      [asInt(shadow.streakCount), RECOVERY.before.streakCount, 'progressServerState.streakCount'],
      [shadow.lastActiveDate, RECOVERY.before.activeDate, 'progressServerState.lastActiveDate'],
      [asInt(spin.levelBaseline), RECOVERY.before.spinBaseline, 'levelSpinServerState.levelBaseline'],
      [asInt(spin.balance), RECOVERY.before.spinBalance, 'levelSpinServerState.balance'],
      [asInt(leaderboard.points), RECOVERY.before.totalXp, 'leaderboard.points'],
      [asInt(leaderboard.streak), RECOVERY.before.streakCount, 'leaderboard.streak'],
      [asInt(member.totalXp), RECOVERY.before.totalXp, 'league member totalXp'],
      [asInt(member.streak), RECOVERY.before.streakCount, 'league member streak'],
    ];
    beforeValues.forEach(([actual, expected, label]) => assertEqual(actual, expected, label));
    assertEqual(state.level51CreditExists, false, 'level-51 credit must be absent before recovery');
  }

  return Object.freeze({
    mode: alreadyApplied ? 'already-applied' : 'apply',
    creditMode: alreadyApplied ? 'preserve' : 'mint',
    userPatch: Object.freeze({
      'progress.user_total_xp': String(RECOVERY.after.totalXp),
      'progress.user_prev_xp': String(RECOVERY.after.previousXp),
      'progress.user_level': String(RECOVERY.after.level),
      'progress.streak_count': String(RECOVERY.after.streakCount),
      'progress.last_active_date': RECOVERY.after.activeDate,
      'progress.streak_last_date': RECOVERY.after.activeDate,
      'progress.level_reward_spin_balance': String(RECOVERY.after.spinBalance),
      'progressServerState.totalXp': RECOVERY.after.totalXp,
      'progressServerState.level': RECOVERY.after.level,
      'progressServerState.streakCount': RECOVERY.after.streakCount,
      'progressServerState.lastActiveDate': RECOVERY.after.activeDate,
      'levelSpinServerState.levelBaseline': RECOVERY.after.spinBaseline,
      'levelSpinServerState.balance': RECOVERY.after.spinBalance,
    }),
    leaderboardPatch: Object.freeze({
      points: RECOVERY.after.totalXp,
      streak: RECOVERY.after.streakCount,
    }),
    leagueGroupPatch: Object.freeze({
      [`members.${RECOVERY.uid}.totalXp`]: RECOVERY.after.totalXp,
      [`members.${RECOVERY.uid}.streak`]: RECOVERY.after.streakCount,
    }),
    levelSpinCredit: Object.freeze({
      level: 51,
      kind: 'standard',
      premiumAtEarn: true,
      status: 'available',
      consumedAtMs: null,
      claimRequestId: null,
      schemaVersion: 1,
      catalogVersion: 1,
    }),
    evidence: Object.freeze({
      checkpointXp: RECOVERY.checkpointXp,
      dailyFrom: RECOVERY.dailyFrom,
      dailyThrough: RECOVERY.dailyThrough,
      dailyEntries: daily.entries,
      dailyXp: daily.total,
      dailyDigest: daily.evidenceDigest,
      targetXp: RECOVERY.after.totalXp,
      currentCanonicalXp: alreadyApplied ? RECOVERY.after.totalXp : RECOVERY.before.totalXp,
      recoveredDelta: alreadyApplied ? 0 : RECOVERY.after.totalXp - RECOVERY.before.totalXp,
    }),
    before: Object.freeze({
      progressTotalXp: asInt(progress.user_total_xp),
      progressPreviousXp: asInt(progress.user_prev_xp),
      progressLevel: asInt(progress.user_level),
      progressStreakCount: asInt(progress.streak_count),
      progressActiveDate: progress.last_active_date,
      shadowTotalXp: asInt(shadow.totalXp),
      shadowLevel: asInt(shadow.level),
      shadowStreakCount: asInt(shadow.streakCount),
      shadowActiveDate: shadow.lastActiveDate,
      spinBaseline: asInt(spin.levelBaseline),
      spinBalance: asInt(spin.balance),
      leaderboardPoints: asInt(leaderboard.points),
      leaderboardStreak: asInt(leaderboard.streak),
      leagueMemberTotalXp: asInt(member.totalXp),
      leagueMemberStreak: asInt(member.streak),
      level51CreditExists: state.level51CreditExists === true,
    }),
    after: RECOVERY.after,
  });
}

function unrelatedDigests(userData, leaderboardData, groupData) {
  const user = { ...asRecord(userData) };
  const progress = { ...asRecord(user.progress) };
  for (const key of [
    'user_total_xp', 'user_prev_xp', 'user_level', 'streak_count',
    'last_active_date', 'streak_last_date', 'level_reward_spin_balance',
  ]) delete progress[key];
  user.progress = progress;

  const shadow = { ...asRecord(user.progressServerState) };
  for (const key of ['totalXp', 'level', 'streakCount', 'lastActiveDate', 'updatedAt']) delete shadow[key];
  user.progressServerState = shadow;

  const spin = { ...asRecord(user.levelSpinServerState) };
  delete spin.levelBaseline;
  delete spin.balance;
  user.levelSpinServerState = spin;
  delete user.updatedAt;

  const leaderboard = { ...asRecord(leaderboardData) };
  delete leaderboard.points;
  delete leaderboard.streak;

  const group = { ...asRecord(groupData) };
  const members = { ...asRecord(group.members) };
  const member = { ...asRecord(members[RECOVERY.uid]) };
  delete member.totalXp;
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
    action: 'recover_authoritative_xp_from_daily_evidence',
    uid: RECOVERY.uid,
    checkpointXp: RECOVERY.checkpointXp,
    dailyXp: RECOVERY.dailyXp,
    dailyEvidenceDigest: RECOVERY.dailyEvidenceDigest,
    before: RECOVERY.before,
    after: RECOVERY.after,
    creditId: RECOVERY.creditId,
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

function premiumResolver() {
  return require('../../functions/lib/functions/src/premium_status.js').resolvePremiumAccess;
}

function stateFromSnapshots(userSnap, leaderboardSnap, groupSnap, creditSnap, premiumAccess) {
  return {
    userExists: userSnap.exists,
    user: userSnap.data() || {},
    leaderboardExists: leaderboardSnap.exists,
    leaderboard: leaderboardSnap.data() || {},
    leagueGroupExists: groupSnap.exists,
    leagueGroup: groupSnap.data() || {},
    level51CreditExists: creditSnap.exists,
    level51Credit: creditSnap.data() || {},
    premiumAccess,
  };
}

async function readRecoveryState(db) {
  const userRef = db.collection('users').doc(RECOVERY.uid);
  const leaderboardRef = db.collection('leaderboard').doc(RECOVERY.uid);
  const creditRef = userRef.collection('level_spin_credits').doc(RECOVERY.creditId);
  const [userSnap, leaderboardSnap, creditSnap] = await Promise.all([
    userRef.get(), leaderboardRef.get(), creditRef.get(),
  ]);
  const groupId = String(leaderboardSnap.data()?.groupId || '');
  const groupRef = db.collection('league_groups').doc(groupId || '__missing__');
  const authUid = String(userSnap.data()?.firebaseAuthUid || '');
  const [groupSnap, premiumAccess] = await Promise.all([
    groupRef.get(),
    premiumResolver()(db, RECOVERY.uid, Date.now(), authUid),
  ]);
  return { userRef, leaderboardRef, groupRef, creditRef, userSnap, leaderboardSnap, groupSnap, creditSnap, premiumAccess };
}

async function verifyFresh(db, expectedDigests) {
  const snapshots = await readRecoveryState(db);
  const plan = buildRecoveryPlan(stateFromSnapshots(
    snapshots.userSnap,
    snapshots.leaderboardSnap,
    snapshots.groupSnap,
    snapshots.creditSnap,
    snapshots.premiumAccess,
  ));
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
  assertEqual(operationSnap.data()?.result?.targetXp, RECOVERY.after.totalXp, 'operation result target XP');
  assertEqual(operationSnap.data()?.result?.recoveredDelta, RECOVERY.after.totalXp - RECOVERY.before.totalXp, 'operation result recovered delta');

  const freshDigests = unrelatedDigests(userData, snapshots.leaderboardSnap.data(), snapshots.groupSnap.data());
  for (const key of Object.keys(expectedDigests)) {
    assertEqual(freshDigests[key], expectedDigests[key], `unchanged ${key} digest`);
  }

  return {
    progress: {
      user_total_xp: userData.progress?.user_total_xp,
      user_prev_xp: userData.progress?.user_prev_xp,
      user_level: userData.progress?.user_level,
      streak_count: userData.progress?.streak_count,
      last_active_date: userData.progress?.last_active_date,
      streak_last_date: userData.progress?.streak_last_date,
      level_reward_spin_balance: userData.progress?.level_reward_spin_balance,
    },
    progressServerState: {
      totalXp: userData.progressServerState?.totalXp,
      level: userData.progressServerState?.level,
      streakCount: userData.progressServerState?.streakCount,
      lastActiveDate: userData.progressServerState?.lastActiveDate,
    },
    levelSpinServerState: userData.levelSpinServerState,
    level51Credit: snapshots.creditSnap.data(),
    leaderboard: {
      points: snapshots.leaderboardSnap.data()?.points,
      streak: snapshots.leaderboardSnap.data()?.streak,
    },
    leagueGroup: {
      id: snapshots.groupRef.id,
      totalXp: snapshots.groupSnap.data()?.members?.[RECOVERY.uid]?.totalXp,
      streak: snapshots.groupSnap.data()?.members?.[RECOVERY.uid]?.streak,
    },
    premiumAccess: snapshots.premiumAccess,
    identity: { sameAuthUserDocuments: sameAuthIds.length, authLinks: authLinks.size },
    audit: { operationId: RECOVERY.operationId, auditId: RECOVERY.operationId },
  };
}

async function executeRecovery(db, admin) {
  const userRef = db.collection('users').doc(RECOVERY.uid);
  const leaderboardRef = db.collection('leaderboard').doc(RECOVERY.uid);
  const creditRef = userRef.collection('level_spin_credits').doc(RECOVERY.creditId);
  const operationRef = db.collection('admin_command_operations').doc(RECOVERY.operationId);
  const auditRef = db.collection('admin_log').doc(RECOVERY.operationId);
  const requestFingerprint = operationFingerprint();

  return db.runTransaction(async (tx) => {
    const [userSnap, leaderboardSnap, creditSnap, operationSnap, auditSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(leaderboardRef),
      tx.get(creditRef),
      tx.get(operationRef),
      tx.get(auditRef),
    ]);

    if (operationSnap.exists) {
      assertEqual(auditSnap.exists, true, 'audit document for replay');
      assertEqual(operationSnap.data()?.requestFingerprint, requestFingerprint, 'idempotency replay fingerprint');
      assertEqual(operationSnap.data()?.uid, RECOVERY.uid, 'idempotency replay uid');
      return {
        replayed: true,
        unrelatedDigests: operationSnap.data()?.unrelatedDigests,
      };
    }
    if (auditSnap.exists) fail('audit exists without idempotency operation');

    const groupId = String(leaderboardSnap.data()?.groupId || '');
    const groupRef = db.collection('league_groups').doc(groupId || '__missing__');
    const groupSnap = await tx.get(groupRef);
    const authUid = String(userSnap.data()?.firebaseAuthUid || '');
    if (!authUid) fail('firebaseAuthUid is absent');
    const premiumAccess = await premiumResolver()(db, RECOVERY.uid, Date.now(), authUid, tx);
    const plan = buildRecoveryPlan(stateFromSnapshots(
      userSnap, leaderboardSnap, groupSnap, creditSnap, premiumAccess,
    ));
    if (plan.mode !== 'apply') fail('target state exists without the idempotency operation');

    const currentDigests = unrelatedDigests(userSnap.data(), leaderboardSnap.data(), groupSnap.data());
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const earnedAtMs = Date.now();
    const creditData = { ...plan.levelSpinCredit, earnedAtMs };

    tx.update(userRef, {
      ...plan.userPatch,
      'progressServerState.updatedAt': timestamp,
      updatedAt: timestamp,
    });
    tx.update(leaderboardRef, plan.leaderboardPatch);
    tx.update(groupRef, plan.leagueGroupPatch);
    tx.create(creditRef, creditData);

    const result = {
      ok: true,
      uid: RECOVERY.uid,
      targetXp: RECOVERY.after.totalXp,
      recoveredDelta: RECOVERY.after.totalXp - RECOVERY.before.totalXp,
      level: RECOVERY.after.level,
      streakCount: RECOVERY.after.streakCount,
      activeDate: RECOVERY.after.activeDate,
      levelSpinCreditId: RECOVERY.creditId,
      levelSpinBalance: RECOVERY.after.spinBalance,
    };
    const auditBody = {
      action: 'recover_authoritative_xp_from_daily_evidence',
      actorUid: 'service-account:phraseman-ea0b3',
      role: 'owner',
      entity: { collection: 'users', id: RECOVERY.uid },
      reason: RECOVERY.reason,
      evidence: plan.evidence,
      before: plan.before,
      after: { ...RECOVERY.after, levelSpinCredit: { id: RECOVERY.creditId, ...creditData } },
      rollbackReference: `admin_command_operations/${RECOVERY.operationId}#before`,
      requestId: RECOVERY.operationId,
      operationId: RECOVERY.operationId,
      timestamp,
    };
    tx.create(auditRef, auditBody);
    tx.create(operationRef, {
      action: auditBody.action,
      actorUid: auditBody.actorUid,
      uid: RECOVERY.uid,
      requestFingerprint,
      reason: RECOVERY.reason,
      evidence: plan.evidence,
      before: plan.before,
      after: auditBody.after,
      unrelatedDigests: currentDigests,
      result,
      createdAt: timestamp,
    });
    return { replayed: false, unrelatedDigests: currentDigests, result };
  });
}

async function main() {
  const execute = process.argv.includes('--execute');
  const admin = initAdmin();
  const db = admin.firestore();
  const snapshots = await readRecoveryState(db);
  const plan = buildRecoveryPlan(stateFromSnapshots(
    snapshots.userSnap,
    snapshots.leaderboardSnap,
    snapshots.groupSnap,
    snapshots.creditSnap,
    snapshots.premiumAccess,
  ));

  console.log(JSON.stringify({
    mode: execute ? 'EXECUTE' : 'DRY_RUN',
    uid: RECOVERY.uid,
    planMode: plan.mode,
    evidence: plan.evidence,
    before: plan.before,
    after: plan.after,
    userPatch: plan.userPatch,
    leaderboardPatch: plan.leaderboardPatch,
    leagueGroupId: snapshots.groupRef.id,
    leagueGroupPatch: plan.leagueGroupPatch,
    levelSpinCreditId: RECOVERY.creditId,
    levelSpinCredit: plan.levelSpinCredit,
    operationId: RECOVERY.operationId,
  }, null, 2));

  if (!execute) {
    console.log('DRY_RUN_OK: no writes performed');
    return;
  }

  const transaction = await executeRecovery(db, admin);
  const verified = await verifyFresh(db, transaction.unrelatedDigests);
  console.log(JSON.stringify({ transaction, verified }, null, 2));
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
