import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';

const USERS = 'users';
const AUTH_LINKS = 'auth_links';
const LEADERBOARD = 'leaderboard';
const LEAGUE_GROUPS = 'league_groups';
const CLEANUP_CANDIDATES = 'identity_cleanup_candidates';
const IDENTITY_CLEANUP_THROTTLE_MS = 6 * 60 * 60 * 1000;

type IdentityCleanupStats = {
  leaderboardMerged: number;
  leaderboardHidden: number;
  usersHidden: number;
  nameIndexHidden: number;
  candidatesRecorded: number;
  leagueGroupsTouched: number;
  leagueMembersHidden: number;
  skipped: boolean;
};

function normalizeStableId(value: unknown): string {
  return String(value ?? '').trim();
}

async function assertStableOwner(
  db: admin.firestore.Firestore,
  authUid: string,
  stableId: string,
): Promise<void> {
  if (!stableId || stableId.length > 160) {
    throw new HttpsError('invalid-argument', 'stable_id_required');
  }
  if (stableId === authUid) return;

  const [userSnap, linkSnap] = await Promise.all([
    db.collection(USERS).doc(stableId).get().catch(() => null),
    db.collection(AUTH_LINKS).doc(authUid).get().catch(() => null),
  ]);
  const userData = userSnap?.data() ?? {};
  const userAuthUid = String(userData.firebaseAuthUid ?? '').trim();
  if (!userAuthUid || userAuthUid === authUid) return;

  const linkedStableId = String(linkSnap?.data()?.stable_id ?? '').trim();
  if (linkedStableId === stableId) return;

  const linkedAuth = userData.linkedAuth;
  const hasProviderLink =
    linkedAuth != null &&
    typeof linkedAuth === 'object' &&
    typeof (linkedAuth as { providerUid?: unknown }).providerUid === 'string' &&
    String((linkedAuth as { providerUid?: unknown }).providerUid ?? '').trim().length > 0;
  const linkedAuthUid = hasProviderLink
    ? String((linkedAuth as { providerUid?: unknown }).providerUid ?? '').trim()
    : '';
  if (linkedAuthUid === authUid) return;

  throw new HttpsError('permission-denied', 'stable_id_mismatch');
}

export async function linkStableAuthUid(
  db: admin.firestore.Firestore,
  stableId: string,
  authUid: string,
): Promise<void> {
  const now = Date.now();
  const userRef = db.collection(USERS).doc(stableId);
  const userSnap = await userRef.get().catch(() => null);
  const currentUserAuthUid = String(userSnap?.data()?.firebaseAuthUid ?? '').trim();
  let repairedIdentityLink = false;
  if (!userSnap?.exists || currentUserAuthUid !== authUid) {
    await userRef.set({
      firebaseAuthUid: authUid,
      updatedAt: now,
    }, { merge: true });
    repairedIdentityLink = true;
  }

  const lbRef = db.collection(LEADERBOARD).doc(stableId);
  const lbSnap = await lbRef.get().catch(() => null);
  if (lbSnap?.exists) {
    const currentLeaderboardAuthUid = String(lbSnap.data()?.firebaseAuthUid ?? '').trim();
    if (currentLeaderboardAuthUid !== authUid) {
      await lbRef.set({ firebaseAuthUid: authUid, updatedAt: now }, { merge: true });
      repairedIdentityLink = true;
    }
  }

  if (repairedIdentityLink) {
    await cleanupLegacyAuthIdentityDuplicates(db, stableId, authUid, {
      reason: 'stable_link',
      throttleMs: IDENTITY_CLEANUP_THROTTLE_MS,
    }).catch((e) => {
      console.warn(JSON.stringify({
        event: 'identity_legacy_cleanup_failed',
        stableId,
        authUid,
        message: String(e?.message ?? e).slice(0, 160),
      }));
    });
  }
}

function readNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function chooseMaxNumber(a: unknown, b: unknown): number | undefined {
  const na = readNumber(a);
  const nb = readNumber(b);
  if (na === null && nb === null) return undefined;
  if (na === null) return nb ?? undefined;
  if (nb === null) return na;
  return Math.max(na, nb);
}

function legacyLeaderboardMerge(
  stableData: FirebaseFirestore.DocumentData,
  legacyData: FirebaseFirestore.DocumentData,
  authUid: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    firebaseAuthUid: authUid,
    updatedAt: Date.now(),
    identityCanonicalizedAt: Date.now(),
  };

  ['points', 'streak', 'daily7xp', 'daily7time_ms', 'profileCardLevel'].forEach((field) => {
    const next = chooseMaxNumber(stableData[field], legacyData[field]);
    if (next !== undefined) out[field] = next;
  });

  const stableWeekKey = String(stableData.weekKey ?? '').trim();
  const legacyWeekKey = String(legacyData.weekKey ?? '').trim();
  if (!stableWeekKey && legacyWeekKey) {
    out.weekKey = legacyWeekKey;
    out.weekPoints = Math.max(0, readNumber(legacyData.weekPoints) ?? 0);
  } else if (stableWeekKey && legacyWeekKey && stableWeekKey === legacyWeekKey) {
    out.weekPoints = Math.max(
      Math.max(0, readNumber(stableData.weekPoints) ?? 0),
      Math.max(0, readNumber(legacyData.weekPoints) ?? 0),
    );
  }

  [
    'name',
    'nameLower',
    'lang',
    'avatar',
    'frame',
    'aura',
    'leagueId',
    'isPremium',
    'isVip',
    'profileCardTheme',
    'profileCardMotion',
    'profileCardPublicFocus',
  ].forEach((field) => {
    const stableValue = stableData[field];
    const legacyValue = legacyData[field];
    const stableEmpty = stableValue === undefined || stableValue === null || String(stableValue).trim() === '';
    if (stableEmpty && legacyValue !== undefined && legacyValue !== null && String(legacyValue).trim() !== '') {
      out[field] = legacyValue;
    }
  });

  return out;
}

function mergeLegacyMemberIntoStable(
  stable: Record<string, unknown> | undefined,
  legacy: Record<string, unknown>,
  stableId: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(legacy || {}), ...(stable || {}), uid: stableId };
  const stablePoints = readNumber(stable?.points);
  const legacyPoints = readNumber(legacy?.points);
  if (stablePoints !== null || legacyPoints !== null) out['points'] = Math.max(stablePoints ?? 0, legacyPoints ?? 0);
  const stableTotalXp = readNumber(stable?.totalXp);
  const legacyTotalXp = readNumber(legacy?.totalXp);
  if (stableTotalXp !== null || legacyTotalXp !== null) out['totalXp'] = Math.max(stableTotalXp ?? 0, legacyTotalXp ?? 0);
  return out;
}

async function stableMemberExistsInWeek(
  db: admin.firestore.Firestore,
  weekId: string,
  stableId: string,
): Promise<boolean> {
  const snap = await db
    .collection(LEAGUE_GROUPS)
    .where('weekId', '==', weekId)
    .limit(500)
    .get()
    .catch(() => null);
  return !!snap?.docs.some((doc) => {
    const members = doc.data()?.members;
    return members && typeof members === 'object' && Object.prototype.hasOwnProperty.call(members, stableId);
  });
}

async function cleanupDuplicateLeagueMembers(
  db: admin.firestore.Firestore,
  stableId: string,
  duplicateUid: string,
): Promise<Pick<IdentityCleanupStats, 'leagueGroupsTouched' | 'leagueMembersHidden'>> {
  let leagueGroupsTouched = 0;
  let leagueMembersHidden = 0;
  const memberUidPath = new admin.firestore.FieldPath('members', duplicateUid, 'uid');

  for (;;) {
    const snap = await db.collection(LEAGUE_GROUPS).where(memberUidPath, '==', duplicateUid).limit(50).get();
    if (snap.empty) break;

    let madeProgress = false;
    const batch = db.batch();
    for (const doc of snap.docs) {
      const data = doc.data() || {};
      const members = data.members && typeof data.members === 'object'
        ? { ...(data.members as Record<string, Record<string, unknown>>) }
        : {};
      const legacyMember = members[duplicateUid];
      if (!legacyMember) continue;
      if (legacyMember.identityHidden === true && legacyMember.canonicalStableId === stableId) continue;

      const weekId = String(data.weekId ?? '').trim();
      const stableInSameDoc = members[stableId];
      const stableInWeek = stableInSameDoc ? true : weekId ? await stableMemberExistsInWeek(db, weekId, stableId) : false;

      if (stableInSameDoc) {
        members[stableId] = mergeLegacyMemberIntoStable(stableInSameDoc, legacyMember, stableId);
      } else if (!stableInWeek) {
        members[stableId] = mergeLegacyMemberIntoStable(undefined, legacyMember, stableId);
      }
      members[duplicateUid] = {
        ...legacyMember,
        identityHidden: true,
        canonicalStableId: stableId,
        identityCanonicalizedAt: Date.now(),
      };

      const memberCount = Object.values(members).filter((m) => (m as Record<string, unknown>)?.identityHidden !== true).length;
      batch.set(doc.ref, {
        members,
        memberCount,
        updatedAt: Date.now(),
        identityCanonicalizedAt: Date.now(),
      }, { merge: true });
      leagueGroupsTouched += 1;
      leagueMembersHidden += 1;
      madeProgress = true;
    }

    if (!madeProgress) break;
    await batch.commit();
  }

  return { leagueGroupsTouched, leagueMembersHidden };
}

async function cleanupLegacyLeagueMembers(
  db: admin.firestore.Firestore,
  stableId: string,
  authUid: string,
): Promise<Pick<IdentityCleanupStats, 'leagueGroupsTouched' | 'leagueMembersHidden'>> {
  return cleanupDuplicateLeagueMembers(db, stableId, authUid);
}

async function hideNameIndexForDuplicateUid(
  db: admin.firestore.Firestore,
  duplicateUid: string,
  stableId: string,
): Promise<number> {
  const snap = await db.collection('name_index').where('uid', '==', duplicateUid).limit(50).get().catch(() => null);
  if (!snap || snap.empty) return 0;
  const batch = db.batch();
  const now = Date.now();
  let hidden = 0;
  snap.docs.forEach((doc) => {
    batch.set(doc.ref, {
      identityHidden: true,
      canonicalStableId: stableId,
      identityCanonicalizedAt: now,
      updatedAt: now,
    }, { merge: true });
    hidden += 1;
  });
  await batch.commit();
  return hidden;
}

async function cleanupSiblingStableIdentityDuplicates(
  db: admin.firestore.Firestore,
  stableId: string,
  authUid: string,
): Promise<Pick<IdentityCleanupStats, 'leaderboardMerged' | 'leaderboardHidden' | 'usersHidden' | 'nameIndexHidden' | 'leagueGroupsTouched' | 'leagueMembersHidden'>> {
  const out = {
    leaderboardMerged: 0,
    leaderboardHidden: 0,
    usersHidden: 0,
    nameIndexHidden: 0,
    leagueGroupsTouched: 0,
    leagueMembersHidden: 0,
  };
  const siblingsSnap = await db.collection(USERS).where('firebaseAuthUid', '==', authUid).limit(50).get().catch(() => null);
  if (!siblingsSnap || siblingsSnap.empty) return out;

  for (const sibling of siblingsSnap.docs) {
    const duplicateUid = sibling.id;
    if (!duplicateUid || duplicateUid === stableId) continue;
    const siblingData = sibling.data() || {};
    if (siblingData.identityHidden === true && siblingData.canonicalStableId === stableId) continue;

    const stableLbRef = db.collection(LEADERBOARD).doc(stableId);
    const duplicateLbRef = db.collection(LEADERBOARD).doc(duplicateUid);
    await db.runTransaction(async (tx) => {
      const [stableLbSnap, duplicateLbSnap] = await Promise.all([
        tx.get(stableLbRef),
        tx.get(duplicateLbRef),
      ]);
      if (duplicateLbSnap.exists) {
        const merge = legacyLeaderboardMerge(stableLbSnap.data() || {}, duplicateLbSnap.data() || {}, authUid);
        tx.set(stableLbRef, merge, { merge: true });
        tx.set(duplicateLbRef, {
          identityHidden: true,
          canonicalStableId: stableId,
          duplicateOfStableId: stableId,
          identityCanonicalizedAt: Date.now(),
          updatedAt: Date.now(),
        }, { merge: true });
        out.leaderboardMerged += 1;
        out.leaderboardHidden += 1;
      }
      tx.set(sibling.ref, {
        identityHidden: true,
        canonicalStableId: stableId,
        identityCanonicalizedAt: Date.now(),
        updatedAt: Date.now(),
      }, { merge: true });
      out.usersHidden += 1;
    });

    out.nameIndexHidden += await hideNameIndexForDuplicateUid(db, duplicateUid, stableId).catch(() => 0);
    const leagueStats = await cleanupDuplicateLeagueMembers(db, stableId, duplicateUid);
    out.leagueGroupsTouched += leagueStats.leagueGroupsTouched;
    out.leagueMembersHidden += leagueStats.leagueMembersHidden;
  }

  return out;
}

async function recordIdentityCleanupCandidate(
  db: admin.firestore.Firestore,
  stableId: string,
  authUid: string,
  reason: string,
  context: Record<string, unknown>,
): Promise<void> {
  const candidateId = `${stableId.slice(0, 80)}__${authUid.slice(0, 80)}`.replace(/[^A-Za-z0-9_-]/g, '_');
  await db.collection(CLEANUP_CANDIDATES).doc(candidateId).set({
    stableId,
    authUid,
    reason,
    context,
    updatedAt: Date.now(),
  }, { merge: true });
}

export async function cleanupLegacyAuthIdentityDuplicates(
  db: admin.firestore.Firestore,
  stableId: string,
  authUid: string,
  opts?: { reason?: string; throttleMs?: number },
): Promise<IdentityCleanupStats> {
  const stats: IdentityCleanupStats = {
    leaderboardMerged: 0,
    leaderboardHidden: 0,
    usersHidden: 0,
    nameIndexHidden: 0,
    candidatesRecorded: 0,
    leagueGroupsTouched: 0,
    leagueMembersHidden: 0,
    skipped: false,
  };
  if (!stableId || !authUid || stableId === authUid) return { ...stats, skipped: true };

  const now = Date.now();
  const userRef = db.collection(USERS).doc(stableId);
  const userSnap = await userRef.get().catch(() => null);
  const userData = userSnap?.data() || {};
  if (String(userData.firebaseAuthUid ?? '').trim() !== authUid) return { ...stats, skipped: true };
  const lastCleanupAt = readNumber(userData.identityCleanupAt) ?? 0;
  if (opts?.throttleMs && lastCleanupAt > 0 && now - lastCleanupAt < opts.throttleMs) {
    return { ...stats, skipped: true };
  }

  const stableLbRef = db.collection(LEADERBOARD).doc(stableId);
  const legacyLbRef = db.collection(LEADERBOARD).doc(authUid);
  const [stableLbSnap, legacyLbSnap, authLinkSnap] = await Promise.all([
    stableLbRef.get().catch(() => null),
    legacyLbRef.get().catch(() => null),
    db.collection(AUTH_LINKS).doc(authUid).get().catch(() => null),
  ]);
  const stableLeaderboardAuthUid = String(stableLbSnap?.data()?.firebaseAuthUid ?? '').trim();
  const linkedStableId = String(authLinkSnap?.data()?.stable_id ?? '').trim();
  const hasStrongIdentityProof =
    stableLeaderboardAuthUid === authUid ||
    linkedStableId === stableId;

  if (!hasStrongIdentityProof) {
    if (legacyLbSnap?.exists) {
      await recordIdentityCleanupCandidate(db, stableId, authUid, 'missing_strong_identity_proof', {
        userFirebaseAuthUid: authUid,
        stableLeaderboardAuthUid,
        linkedStableId,
        legacyLeaderboardExists: true,
        reason: opts?.reason ?? 'unknown',
      }).catch(() => {});
      stats.candidatesRecorded += 1;
    }
    return { ...stats, skipped: true };
  }

  if (legacyLbSnap?.exists) {
    const merge = legacyLeaderboardMerge(stableLbSnap?.data() || {}, legacyLbSnap.data() || {}, authUid);
    await db.runTransaction(async (tx) => {
      tx.set(stableLbRef, merge, { merge: true });
      tx.set(legacyLbRef, {
        identityHidden: true,
        canonicalStableId: stableId,
        identityCanonicalizedAt: Date.now(),
        updatedAt: Date.now(),
      }, { merge: true });
    });
    stats.leaderboardMerged += 1;
    stats.leaderboardHidden += 1;
  }

  const leagueStats = await cleanupLegacyLeagueMembers(db, stableId, authUid);
  stats.leagueGroupsTouched += leagueStats.leagueGroupsTouched;
  stats.leagueMembersHidden += leagueStats.leagueMembersHidden;

  if (linkedStableId === stableId) {
    const siblingStats = await cleanupSiblingStableIdentityDuplicates(db, stableId, authUid);
    stats.leaderboardMerged += siblingStats.leaderboardMerged;
    stats.leaderboardHidden += siblingStats.leaderboardHidden;
    stats.usersHidden += siblingStats.usersHidden;
    stats.nameIndexHidden += siblingStats.nameIndexHidden;
    stats.leagueGroupsTouched += siblingStats.leagueGroupsTouched;
    stats.leagueMembersHidden += siblingStats.leagueMembersHidden;
  }

  if (
    stats.leaderboardHidden > 0 ||
    stats.usersHidden > 0 ||
    stats.nameIndexHidden > 0 ||
    stats.leagueGroupsTouched > 0 ||
    stats.candidatesRecorded > 0
  ) {
    await userRef.set({
      identityCleanupAt: now,
      identityCleanupReason: opts?.reason ?? 'unknown',
      updatedAt: now,
    }, { merge: true });
  }

  return stats;
}

export async function resolveStableUidForAuth(
  db: admin.firestore.Firestore,
  authUid: string,
  requestedStableId?: unknown,
  options?: { requireKnownIdentity?: boolean },
): Promise<string> {
  const stableId = normalizeStableId(requestedStableId);
  if (stableId) {
    const requestedUserSnap = await db.collection(USERS).doc(stableId).get().catch(() => null);
    const requestedUserData = requestedUserSnap?.data() || {};
    const canonicalStableId = normalizeStableId(requestedUserData.canonicalStableId);
    if (requestedUserData.identityHidden === true && canonicalStableId && canonicalStableId !== stableId) {
      await assertStableOwner(db, authUid, canonicalStableId);
      await linkStableAuthUid(db, canonicalStableId, authUid);
      return canonicalStableId;
    }
    await assertStableOwner(db, authUid, stableId);
    await linkStableAuthUid(db, stableId, authUid);
    return stableId;
  }

  const direct = await db.collection(USERS).doc(authUid).get().catch(() => null);
  if (direct?.exists) return authUid;
  const byAuth = await db.collection(USERS).where('firebaseAuthUid', '==', authUid).limit(1).get();
  if (!byAuth.empty) return byAuth.docs[0].id;
  if (options?.requireKnownIdentity) {
    throw new HttpsError('failed-precondition', 'stable_id_required');
  }
  return authUid;
}

export const authEnsureStableLink = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableId = normalizeStableId(request.data?.stableId);
  const stableUid = await resolveStableUidForAuth(db, authUid, stableId);
  return { ok: true, stableUid, authUid };
});
