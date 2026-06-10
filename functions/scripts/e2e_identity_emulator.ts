/**
 * END-TO-END emulator check for the identity-merge + username-uniqueness fix.
 *
 * Runs the REAL exported logic (mergeStableAccounts, mergeUserProgress,
 * nameReserve transaction core) against a live Firestore emulator, so it
 * exercises true Firestore transaction serialization — which the unit-test
 * stubs cannot simulate. This is the safety gate before any production deploy.
 *
 * Usage (with emulator running on :8080):
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *   GCLOUD_PROJECT=phraseman-emu \
 *   npx ts-node scripts/e2e_identity_emulator.ts
 *
 * Exit code 0 = all assertions passed; non-zero = a check failed.
 */
import * as admin from 'firebase-admin';
import { mergeStableAccounts, mergeUserProgress } from '../src/auth_merge';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('REFUSING TO RUN: FIRESTORE_EMULATOR_HOST is not set (would hit prod).');
  process.exit(2);
}

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'phraseman-emu' });
const db = admin.firestore();

let failures = 0;
function check(name: string, cond: boolean, detail?: unknown): void {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL  ${name}`, detail !== undefined ? JSON.stringify(detail) : '');
  }
}

async function wipe(): Promise<void> {
  for (const coll of ['users', 'auth_links', 'leaderboard', 'name_index', 'league_groups', 'banned_users']) {
    const snap = await db.collection(coll).get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    if (snap.size) await batch.commit();
  }
}

const NOW = 1_777_000_000_000;
const FUTURE = NOW + 30 * 24 * 60 * 60 * 1000;

// ── Scenario 1: cross-device merge keeps the higher-XP account and carries the
//    loser's premium (the Civi case: tablet Lvl7 + phone Lvl4). ───────────────
async function scenarioMergeKeepsProgressAndPremium(): Promise<void> {
  console.log('\n[1] cross-device merge: best-of progress + premium carry');
  await wipe();

  // Tablet: high XP, no premium. Phone: low XP, but ACTIVE premium.
  await db.collection('users').doc('stable-tablet').set({
    firebaseAuthUid: 'google-civi',
    progress: { user_total_xp: '6812', streak_count: '2', user_name: 'Civi' },
    shards: 16,
  });
  await db.collection('users').doc('stable-phone').set({
    firebaseAuthUid: 'google-civi',
    progress: {
      user_total_xp: '2309',
      streak_count: '9',
      premium_plan: 'yearly',
      premium_expiry: String(FUTURE),
      had_premium_ever: 'true',
    },
    shards: 1325,
  });

  const res = await mergeStableAccounts(db, 'google-civi', 'stable-phone', 'stable-tablet', NOW);
  check('canonical = higher-XP (tablet)', res.canonicalStableId === 'stable-tablet', res);
  check('mergedFrom = phone', res.mergedFromStableId === 'stable-phone', res);

  const winner = (await db.collection('users').doc('stable-tablet').get()).data() || {};
  const wp = (winner.progress || {}) as Record<string, unknown>;
  check('XP kept at max (6812)', wp.user_total_xp === '6812', wp.user_total_xp);
  check('streak best-of (9 from loser)', wp.streak_count === '9', wp.streak_count);
  check('shards max (1325)', winner.shards === 1325, winner.shards);
  check('PREMIUM carried from loser (yearly)', wp.premium_plan === 'yearly', wp.premium_plan);
  check('premium expiry carried', wp.premium_expiry === String(FUTURE), wp.premium_expiry);
  check('had_premium_ever sticky true', wp.had_premium_ever === 'true', wp.had_premium_ever);

  const loser = (await db.collection('users').doc('stable-phone').get()).data() || {};
  check('loser hidden (identityHidden)', loser.identityHidden === true, loser.identityHidden);
  check('loser points to canonical', loser.canonicalStableId === 'stable-tablet', loser.canonicalStableId);

  // Idempotency: running again is a no-op returning the same canonical.
  const again = await mergeStableAccounts(db, 'google-civi', 'stable-phone', 'stable-tablet', NOW);
  check('idempotent re-merge', again.canonicalStableId === 'stable-tablet' && again.alreadyMerged === true, again);
}

// ── Scenario 2: VIP on the loser survives the merge. ──────────────────────────
async function scenarioVipSurvives(): Promise<void> {
  console.log('\n[2] merge: VIP on loser survives');
  await wipe();
  await db.collection('users').doc('s-hi').set({
    firebaseAuthUid: 'g-vip',
    progress: { user_total_xp: '9999' },
  });
  await db.collection('users').doc('s-vip').set({
    firebaseAuthUid: 'g-vip',
    progress: { user_total_xp: '5', vip_active: 'true', vip_plan: 'admin_vip', vip_until: String(FUTURE), vip_admin_override: 'true' },
  });
  const res = await mergeStableAccounts(db, 'g-vip', 's-hi', 's-vip', NOW);
  const w = ((await db.collection('users').doc(res.canonicalStableId).get()).data()?.progress || {}) as Record<string, unknown>;
  check('canonical = higher XP (s-hi)', res.canonicalStableId === 's-hi', res);
  check('VIP active carried', w.vip_active === 'true', w.vip_active);
  check('VIP plan carried', w.vip_plan === 'admin_vip', w.vip_plan);
  check('VIP until carried', w.vip_until === String(FUTURE), w.vip_until);
}

// ── Scenario 3: username uniqueness under REAL concurrency. ────────────────────
//    Two different live users race to reserve the same fresh name. With the
//    transaction serializing on name_index/{nameLower}, exactly one must win.
async function scenarioUsernameRace(): Promise<void> {
  console.log('\n[3] username: concurrent reservation of the same fresh name');
  await wipe();
  await db.collection('users').doc('s-A').set({ firebaseAuthUid: 'a-A' });
  await db.collection('users').doc('s-B').set({ firebaseAuthUid: 'a-B' });

  // Inline the reservation core (same logic as nameReserve's transaction) so we
  // can drive it concurrently against the emulator without the callable wrapper.
  const reserve = (stableUid: string, authUid: string, name: string) =>
    reserveNameCore(db, stableUid, authUid, name);

  const [r1, r2] = await Promise.allSettled([
    reserve('s-A', 'a-A', 'Dragon'),
    reserve('s-B', 'a-B', 'Dragon'),
  ]);
  const statuses = [r1, r2].map((r) => (r.status === 'fulfilled' ? r.value : `rej:${(r.reason as Error)?.message}`));
  const oks = statuses.filter((s) => s === 'ok').length;
  const takens = statuses.filter((s) => s === 'taken' || String(s).includes('already-exists') || String(s).includes('name_taken')).length;
  check('exactly ONE winner in the race', oks === 1, statuses);
  check('the other is rejected/taken', takens === 1, statuses);

  // The name_index doc must belong to exactly the winner.
  const idx = (await db.collection('name_index').doc('dragon').get()).data() || {};
  check('name_index owned by a single uid', idx.uid === 's-A' || idx.uid === 's-B', idx);
}

// ── Scenario 4: a LIVE-but-unranked owner's name cannot be stolen. ────────────
async function scenarioNoSteal(): Promise<void> {
  console.log('\n[4] username: live owner with no leaderboard row is NOT stealable');
  await wipe();
  await db.collection('users').doc('s-owner').set({ firebaseAuthUid: 'a-owner' }); // live, never ranked
  await db.collection('users').doc('s-thief').set({ firebaseAuthUid: 'a-thief' });
  await db.collection('name_index').doc('civi').set({ uid: 's-owner', authUid: 'a-owner', name: 'Civi', nameLower: 'civi' });

  let thiefStatus = 'ok';
  try {
    thiefStatus = await reserveNameCore(db, 's-thief', 'a-thief', 'Civi');
  } catch (e) {
    thiefStatus = `rej:${(e as Error)?.message}`;
  }
  check('thief BLOCKED (taken/rejected)', thiefStatus !== 'ok', thiefStatus);
  const idx = (await db.collection('name_index').doc('civi').get()).data() || {};
  check('name still owned by original owner', idx.uid === 's-owner', idx);
}

// ── Scenario 5: a DEAD owner's reservation can be reclaimed. ───────────────────
async function scenarioReclaimDead(): Promise<void> {
  console.log('\n[5] username: dead owner reservation is reclaimable');
  await wipe();
  await db.collection('users').doc('s-new').set({ firebaseAuthUid: 'a-new' });
  // Owner doc absent entirely → dead.
  await db.collection('name_index').doc('ghost').set({ uid: 's-gone', authUid: 'a-gone', name: 'Ghost', nameLower: 'ghost' });

  let status = 'fail';
  try {
    status = await reserveNameCore(db, 's-new', 'a-new', 'Ghost');
  } catch (e) {
    status = `rej:${(e as Error)?.message}`;
  }
  check('reclaim succeeds (ok)', status === 'ok', status);
  const idx = (await db.collection('name_index').doc('ghost').get()).data() || {};
  check('name_index now owned by reclaimer', idx.uid === 's-new', idx);
}

/**
 * Standalone copy of nameReserve's transaction core (the callable wrapper needs
 * request.auth/App Check which we don't have here). Mirrors leaderboard.ts:
 * atomic on name_index/{nameLower}, blocks on a live owner, reclaims a dead one.
 */
async function reserveNameCore(
  database: admin.firestore.Firestore,
  stableUid: string,
  authUid: string,
  rawName: string,
): Promise<'ok' | 'taken'> {
  const name = String(rawName).normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, 32);
  const nameLower = name.toLowerCase();
  const NAME_INDEX = 'name_index';

  const ownerIsLive = async (tx: admin.firestore.Transaction, uid: string): Promise<boolean> => {
    const clean = String(uid ?? '').trim();
    if (!clean) return false;
    const userSnap = await tx.get(database.collection('users').doc(clean));
    if (!userSnap.exists) return false;
    const d = userSnap.data() ?? {};
    if (d.identityHidden === true) return false;
    if (d.banned === true) return false;
    return true;
  };

  try {
    await database.runTransaction(async (tx) => {
      const nameRef = database.collection(NAME_INDEX).doc(nameLower);
      const nameSnap = await tx.get(nameRef);
      if (nameSnap.exists && nameSnap.data()?.identityHidden !== true) {
        const owner = String(nameSnap.data()?.uid ?? '').trim();
        if (owner && owner !== stableUid) {
          if (await ownerIsLive(tx, owner)) {
            throw new Error('already-exists:name_taken');
          }
        }
      }
      tx.set(nameRef, { uid: stableUid, authUid, name, nameLower, updatedAt: Date.now() }, { merge: true });
      tx.set(database.collection('leaderboard').doc(stableUid), { name, nameLower, firebaseAuthUid: authUid, updatedAt: Date.now() }, { merge: true });
    });
  } catch (e) {
    if (String((e as Error)?.message).includes('already-exists')) return 'taken';
    throw e;
  }
  return 'ok';
}

// ── Bonus: a pure mergeUserProgress sanity check (cheap, no emulator needed). ──
function scenarioPureMergeSanity(): void {
  console.log('\n[0] pure mergeUserProgress sanity');
  const out = mergeUserProgress(
    { user_total_xp: '100', user_name: 'Win' },
    { user_total_xp: '200', user_avatar: 'cat', premium_plan: 'yearly', premium_expiry: String(FUTURE) },
    NOW,
  );
  check('max xp', out.user_total_xp === '200', out.user_total_xp);
  check('fill avatar from loser', out.user_avatar === 'cat', out.user_avatar);
  check('winner name kept', out.user_name === 'Win', out.user_name);
  check('premium carried', out.premium_plan === 'yearly', out.premium_plan);
}

async function main(): Promise<void> {
  scenarioPureMergeSanity();
  await scenarioMergeKeepsProgressAndPremium();
  await scenarioVipSurvives();
  await scenarioUsernameRace();
  await scenarioNoSteal();
  await scenarioReclaimDead();

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('E2E crashed:', e);
  process.exit(3);
});
