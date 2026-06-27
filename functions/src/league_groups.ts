import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';

const GROUP_SIZE = 30;
const BROAD_GROUP_QUERY_LIMIT = 500;
const LEAGUE_GROUP_BOOST_COST_SHARDS = 50;
const LEAGUE_GROUP_BOOST_MULTIPLIER = 2;
const LEAGUE_GROUP_BOOST_DURATION_MS = 3 * 60 * 60 * 1000;

type MemberData = {
  name: string;
  points: number;
  uid: string;
  avatar?: string | null;
  frame?: string | null;
  aura?: string | null;
  profileCardLevel?: number;
  profileCardTheme?: string;
  profileCardMotion?: string;
  profileCardPublicFocus?: string;
  isPremium?: boolean;
  isVip?: boolean;
  streak?: number;
  totalXp?: number;
  leagueBoostMultiplier?: number;
  leagueBoostExpiresAt?: number;
};

function sanitizeString(value: unknown, max: number): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function readInt(value: unknown, fallback = 0): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? n : fallback;
}

function getWeekId(): string {
  const d = new Date();
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function makeGroupDocId(weekId: string, leagueId: number, uid: string): string {
  const safeUid = uid.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 16) || 'user';
  return `${weekId}_${leagueId}_${Date.now()}_${safeUid}_${Math.random().toString(36).slice(2, 8)}`;
}

function countMembers(data: FirebaseFirestore.DocumentData | undefined): number {
  const members = data?.members;
  return members && typeof members === 'object'
    ? Object.values(members).filter((m) => (m as Record<string, unknown>)?.identityHidden !== true).length
    : 0;
}

function sanitizeMember(raw: Record<string, unknown>, stableUid: string): MemberData {
  const points = Math.max(0, Math.min(1_000_000_000, readInt(raw.points, 0)));
  const totalXp = Math.max(0, Math.min(1_000_000_000, readInt(raw.totalXp, 0)));
  const streak = Math.max(0, Math.min(100_000, readInt(raw.streak, 0)));
  const multiplier = Number(raw.leagueBoostMultiplier);
  const boostExpiresAt = readInt(raw.leagueBoostExpiresAt, 0);
  const member: MemberData = {
    name: sanitizeString(raw.name, 48) || 'Player',
    points,
    uid: stableUid,
    avatar: sanitizeString(raw.avatar, 64) || null,
    frame: sanitizeString(raw.frame, 64) || null,
    aura: sanitizeString(raw.aura, 64) || null,
    profileCardLevel: Math.max(0, Math.min(5, readInt(raw.profileCardLevel, 0))),
    profileCardTheme: sanitizeString(raw.profileCardTheme, 32) || 'classic',
    profileCardMotion: sanitizeString(raw.profileCardMotion, 32) || 'none',
    profileCardPublicFocus: sanitizeString(raw.profileCardPublicFocus, 32) || 'balanced',
    isPremium: raw.isPremium === true,
    isVip: raw.isVip === true,
    streak,
    totalXp,
  };
  if (Number.isFinite(multiplier) && multiplier > 1 && boostExpiresAt > Date.now()) {
    member.leagueBoostMultiplier = Math.min(10, multiplier);
    member.leagueBoostExpiresAt = boostExpiresAt;
  }
  return member;
}

async function assertCanUseLeague(db: FirebaseFirestore.Firestore, stableUid: string): Promise<void> {
  const [userSnap, bannedSnap] = await Promise.all([
    db.collection('users').doc(stableUid).get().catch(() => null),
    db.collection('banned_users').doc(stableUid).get().catch(() => null),
  ]);
  if (bannedSnap?.exists || userSnap?.data()?.banned === true) {
    throw new HttpsError('permission-denied', 'user_banned');
  }
}

async function findGroupWithSpace(
  db: FirebaseFirestore.Firestore,
  weekId: string,
  leagueId: number,
  stableUid: string,
): Promise<string | null> {
  try {
    const snap = await db
      .collection('league_groups')
      .where('weekId', '==', weekId)
      .where('leagueId', '==', leagueId)
      .where('memberCount', '<', GROUP_SIZE)
      .orderBy('memberCount', 'desc')
      .limit(25)
      .get();
    for (const doc of snap.docs) {
      const data = doc.data();
      if (readInt(data.leagueId) !== leagueId) continue;
      const n = countMembers(data);
      if (n >= GROUP_SIZE) continue;
      if (data.members?.[stableUid]) return doc.id;
      return doc.id;
    }
  } catch {
    // Fall through to broad scan if composite index is not ready.
  }

  const broad = await db
    .collection('league_groups')
    .where('weekId', '==', weekId)
    .where('leagueId', '==', leagueId)
    .limit(BROAD_GROUP_QUERY_LIMIT)
    .get();

  const candidates: { id: string; n: number }[] = [];
  for (const doc of broad.docs) {
    const data = doc.data();
    if (readInt(data.leagueId) !== leagueId) continue;
    const n = countMembers(data);
    if (data.members?.[stableUid]) return doc.id;
    if (n < GROUP_SIZE) candidates.push({ id: doc.id, n });
  }
  candidates.sort((a, b) => b.n - a.n);
  return candidates[0]?.id ?? null;
}

async function findExistingGroupForUser(
  db: FirebaseFirestore.Firestore,
  weekId: string,
  leagueId: number,
  stableUid: string,
): Promise<string | null> {
  const snap = await db
    .collection('league_groups')
    .where('weekId', '==', weekId)
    .where('leagueId', '==', leagueId)
    .limit(BROAD_GROUP_QUERY_LIMIT)
    .get();
  let best: { id: string; n: number } | null = null;
  for (const doc of snap.docs) {
    const data = doc.data();
    if (readInt(data.leagueId) !== leagueId || !data.members?.[stableUid]) continue;
    const n = countMembers(data);
    if (!best || n > best.n) best = { id: doc.id, n };
  }
  return best?.id ?? null;
}

async function hideDuplicateMemberships(
  db: FirebaseFirestore.Firestore,
  weekId: string,
  stableUid: string,
  keepGroupId: string,
): Promise<number> {
  const snap = await db
    .collection('league_groups')
    .where('weekId', '==', weekId)
    .limit(BROAD_GROUP_QUERY_LIMIT)
    .get();
  if (snap.empty) return 0;

  const batch = db.batch();
  let hidden = 0;
  const now = Date.now();
  for (const doc of snap.docs) {
    if (doc.id === keepGroupId) continue;
    const data = doc.data() || {};
    const members = data.members && typeof data.members === 'object'
      ? { ...(data.members as Record<string, Record<string, unknown>>) }
      : {};
    if (!Object.prototype.hasOwnProperty.call(members, stableUid)) continue;
    const member = members[stableUid] && typeof members[stableUid] === 'object'
      ? members[stableUid]
      : {};
    if (member.identityHidden === true && member.canonicalStableId === stableUid) continue;
    members[stableUid] = {
      ...member,
      uid: stableUid,
      identityHidden: true,
      canonicalStableId: stableUid,
      duplicateOfGroupId: keepGroupId,
      identityCanonicalizedAt: now,
    };
    batch.set(doc.ref, {
      members,
      memberCount: countMembers({ members }),
      updatedAt: now,
      identityCanonicalizedAt: now,
    }, { merge: true });
    hidden += 1;
  }

  if (hidden > 0) await batch.commit();
  return hidden;
}

async function cleanupDuplicateMembershipsBestEffort(
  db: FirebaseFirestore.Firestore,
  weekId: string,
  stableUid: string,
  keepGroupId: string,
): Promise<void> {
  try {
    await hideDuplicateMemberships(db, weekId, stableUid, keepGroupId);
  } catch (e: any) {
    console.warn(JSON.stringify({
      event: 'league_duplicate_membership_cleanup_failed',
      weekId,
      keepGroupId,
      message: String(e?.message ?? e).slice(0, 160),
    }));
  }
}

export const leagueJoinOrUpdateGroup = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid, request.data?.stableId, { requireKnownIdentity: true, repairLinks: false });
  await assertCanUseLeague(db, stableUid);

  const weekId = sanitizeString(request.data?.weekId, 16) || getWeekId();
  if (weekId !== getWeekId()) throw new HttpsError('failed-precondition', 'stale_week');
  const leagueId = Math.max(0, Math.min(50, readInt(request.data?.leagueId, 0)));
  const member = sanitizeMember((request.data?.member || {}) as Record<string, unknown>, stableUid);
  const lbRef = db.collection('leaderboard').doc(stableUid);

  let groupId: string | null = null;
  let shouldCleanupDuplicates = false;
  const lbSnap = await lbRef.get().catch(() => null);
  const savedGroupId = lbSnap?.data()?.groupId;
  if (typeof savedGroupId === 'string' && lbSnap?.data()?.groupWeekId === weekId && readInt(lbSnap?.data()?.leagueId) === leagueId) {
    const savedSnap = await db.collection('league_groups').doc(savedGroupId).get().catch(() => null);
    if (savedSnap?.exists && savedSnap.data()?.members?.[stableUid]) groupId = savedGroupId;
  }

  if (!groupId) {
    groupId = await findExistingGroupForUser(db, weekId, leagueId, stableUid);
    shouldCleanupDuplicates = Boolean(groupId);
  }

  if (groupId) {
    await db.runTransaction(async (tx) => {
      const ref = db.collection('league_groups').doc(groupId as string);
      const snap = await tx.get(ref);
      if (!snap.exists) throw new HttpsError('not-found', 'league_group_not_found');
      const data = snap.data() || {};
      if (data.weekId !== weekId || readInt(data.leagueId) !== leagueId) throw new HttpsError('permission-denied', 'room_mismatch');
      const members = { ...(data.members || {}) };
      members[stableUid] = { ...(members[stableUid] || {}), ...member };
      tx.set(ref, { members, memberCount: countMembers({ members }), updatedAt: Date.now() }, { merge: true });
      tx.set(lbRef, { groupId, groupWeekId: weekId, leagueId }, { merge: true });
    });
    if (shouldCleanupDuplicates) {
      await cleanupDuplicateMembershipsBestEffort(db, weekId, stableUid, groupId);
    }
    return { ok: true, groupId, weekId, leagueId };
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    const candidate = await findGroupWithSpace(db, weekId, leagueId, stableUid);
    if (!candidate) break;
    let joined = false;
    await db.runTransaction(async (tx) => {
      const ref = db.collection('league_groups').doc(candidate);
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const data = snap.data() || {};
      if (data.weekId !== weekId || readInt(data.leagueId) !== leagueId) return;
      const members = { ...(data.members || {}) };
      if (!members[stableUid] && countMembers({ members }) >= GROUP_SIZE) return;
      members[stableUid] = { ...(members[stableUid] || {}), ...member };
      tx.set(ref, { members, memberCount: countMembers({ members }), updatedAt: Date.now() }, { merge: true });
      tx.set(lbRef, { groupId: candidate, groupWeekId: weekId, leagueId }, { merge: true });
      joined = true;
    });
    if (joined) {
      await cleanupDuplicateMembershipsBestEffort(db, weekId, stableUid, candidate);
      return { ok: true, groupId: candidate, weekId, leagueId };
    }
  }

  const newGroupId = makeGroupDocId(weekId, leagueId, stableUid);
  await db.runTransaction(async (tx) => {
    const ref = db.collection('league_groups').doc(newGroupId);
    tx.create(ref, {
      weekId,
      leagueId,
      memberCount: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      members: { [stableUid]: member },
    });
    tx.set(lbRef, { groupId: newGroupId, groupWeekId: weekId, leagueId }, { merge: true });
  });
  await cleanupDuplicateMembershipsBestEffort(db, weekId, stableUid, newGroupId);
  return { ok: true, groupId: newGroupId, weekId, leagueId };
});

export const leagueUpdateMyMember = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid, request.data?.stableId, { requireKnownIdentity: true, repairLinks: false });
  await assertCanUseLeague(db, stableUid);

  const lbSnap = await db.collection('leaderboard').doc(stableUid).get();
  const groupId = String(lbSnap.data()?.groupId || '');
  const groupWeekId = String(lbSnap.data()?.groupWeekId || '');
  if (!groupId || groupWeekId !== getWeekId()) return { ok: false, status: 'no_current_group' };

  const raw = (request.data?.member || {}) as Record<string, unknown>;
  const updates: Record<string, unknown> = {
    [`members.${stableUid}.uid`]: stableUid,
    updatedAt: Date.now(),
  };
  if (Object.prototype.hasOwnProperty.call(raw, 'name')) updates[`members.${stableUid}.name`] = sanitizeString(raw.name, 48) || 'Player';
  if (Object.prototype.hasOwnProperty.call(raw, 'points')) updates[`members.${stableUid}.points`] = Math.max(0, Math.min(1_000_000_000, readInt(raw.points, 0)));
  if (Object.prototype.hasOwnProperty.call(raw, 'avatar')) updates[`members.${stableUid}.avatar`] = sanitizeString(raw.avatar, 64) || null;
  if (Object.prototype.hasOwnProperty.call(raw, 'frame')) updates[`members.${stableUid}.frame`] = sanitizeString(raw.frame, 64) || null;
  if (Object.prototype.hasOwnProperty.call(raw, 'aura')) updates[`members.${stableUid}.aura`] = sanitizeString(raw.aura, 64) || null;
  if (Object.prototype.hasOwnProperty.call(raw, 'profileCardLevel')) updates[`members.${stableUid}.profileCardLevel`] = Math.max(0, Math.min(5, readInt(raw.profileCardLevel, 0)));
  if (Object.prototype.hasOwnProperty.call(raw, 'profileCardTheme')) updates[`members.${stableUid}.profileCardTheme`] = sanitizeString(raw.profileCardTheme, 32) || 'classic';
  if (Object.prototype.hasOwnProperty.call(raw, 'profileCardMotion')) updates[`members.${stableUid}.profileCardMotion`] = sanitizeString(raw.profileCardMotion, 32) || 'none';
  if (Object.prototype.hasOwnProperty.call(raw, 'profileCardPublicFocus')) updates[`members.${stableUid}.profileCardPublicFocus`] = sanitizeString(raw.profileCardPublicFocus, 32) || 'balanced';
  if (Object.prototype.hasOwnProperty.call(raw, 'isPremium')) updates[`members.${stableUid}.isPremium`] = raw.isPremium === true;
  if (Object.prototype.hasOwnProperty.call(raw, 'isVip')) updates[`members.${stableUid}.isVip`] = raw.isVip === true;
  if (Object.prototype.hasOwnProperty.call(raw, 'streak')) updates[`members.${stableUid}.streak`] = Math.max(0, Math.min(100_000, readInt(raw.streak, 0)));
  if (Object.prototype.hasOwnProperty.call(raw, 'totalXp')) updates[`members.${stableUid}.totalXp`] = Math.max(0, Math.min(1_000_000_000, readInt(raw.totalXp, 0)));
  await db.collection('league_groups').doc(groupId).set(updates, { merge: true });
  return { ok: true, groupId };
});

export const leagueSyncMyBoost = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid, request.data?.stableId, { requireKnownIdentity: true, repairLinks: false });
  await assertCanUseLeague(db, stableUid);

  const lbSnap = await db.collection('leaderboard').doc(stableUid).get();
  const groupId = String(lbSnap.data()?.groupId || '');
  const groupWeekId = String(lbSnap.data()?.groupWeekId || '');
  if (!groupId || groupWeekId !== getWeekId()) return { ok: false, status: 'no_current_group' };

  const multiplier = Number(request.data?.multiplier);
  const expiresAt = readInt(request.data?.expiresAt, 0);
  const ref = db.collection('league_groups').doc(groupId);
  if (!Number.isFinite(multiplier) || multiplier <= 1 || expiresAt <= Date.now()) {
    await ref.set({
      [`members.${stableUid}.leagueBoostMultiplier`]: admin.firestore.FieldValue.delete(),
      [`members.${stableUid}.leagueBoostExpiresAt`]: admin.firestore.FieldValue.delete(),
      updatedAt: Date.now(),
    }, { merge: true });
    return { ok: true, groupId, status: 'cleared' };
  }
  await ref.set({
    [`members.${stableUid}.leagueBoostMultiplier`]: Math.min(10, multiplier),
    [`members.${stableUid}.leagueBoostExpiresAt`]: expiresAt,
    updatedAt: Date.now(),
  }, { merge: true });
  return { ok: true, groupId, status: 'active' };
});

async function activateLeagueGroupBoostForStableUid(db: FirebaseFirestore.Firestore, stableUid: string) {
  await assertCanUseLeague(db, stableUid);

  const lbSnap = await db.collection('leaderboard').doc(stableUid).get();
  const groupId = String(lbSnap.data()?.groupId || '');
  const groupWeekId = String(lbSnap.data()?.groupWeekId || '');
  const leagueId = readInt(lbSnap.data()?.leagueId, 0);
  if (!groupId || groupWeekId !== getWeekId()) throw new HttpsError('failed-precondition', 'no-current-group');

  const groupRef = db.collection('league_groups').doc(groupId);
  const userRef = db.collection('users').doc(stableUid);
  const logRef = userRef.collection('shard_log').doc();
  const now = Date.now();
  let createdBoost: Record<string, unknown> | null = null;
  let shardsBalance = 0;
  let usedGiftVoucher = false;

  await db.runTransaction(async (tx) => {
    const [groupSnap, userSnap] = await Promise.all([tx.get(groupRef), tx.get(userRef)]);
    if (!groupSnap.exists) throw new HttpsError('not-found', 'league-group-not-found');
    const groupData = groupSnap.data() || {};
    if (groupData.weekId !== groupWeekId || readInt(groupData.leagueId, 0) !== leagueId) {
      throw new HttpsError('permission-denied', 'room-mismatch');
    }
    const members = groupData.members && typeof groupData.members === 'object'
      ? groupData.members as Record<string, Record<string, unknown>>
      : {};
    const buyer = members[stableUid];
    if (!buyer || buyer.identityHidden === true) throw new HttpsError('permission-denied', 'not-group-member');

    const active = groupData.groupBoost && typeof groupData.groupBoost === 'object'
      ? groupData.groupBoost as Record<string, unknown>
      : null;
    if (active && readInt(active.expiresAt, 0) > now) {
      if (String(active.buyerUid || '') === stableUid) {
        createdBoost = active;
        shardsBalance = Math.max(0, readInt(userSnap.data()?.shards, 0));
        return;
      }
      throw new HttpsError('failed-precondition', 'already-active');
    }

    const userData = userSnap.data() || {};
    const userProgress = userData.progress && typeof userData.progress === 'object' && !Array.isArray(userData.progress)
      ? userData.progress as Record<string, unknown>
      : {};
    // Подарок уровня «Буст клуба бесплатно»: клиент хранит флаг в AsyncStorage
    // (club_gift_free_boost_v1), cloud_sync зеркалит его в progress. Если ваучер
    // есть — активация бесплатна, ваучер гасится в этой же транзакции, чтобы
    // нельзя было использовать дважды.
    usedGiftVoucher = userData.club_gift_free_boost_v1 === '1' || userProgress.club_gift_free_boost_v1 === '1';
    const boostCost = usedGiftVoucher ? 0 : LEAGUE_GROUP_BOOST_COST_SHARDS;
    const before = Math.max(0, readInt(userData.shards, 0));
    if (before < boostCost) {
      throw new HttpsError('failed-precondition', 'insufficient-shards');
    }
    const after = before - boostCost;
    const startedAt = now;
    const expiresAt = now + LEAGUE_GROUP_BOOST_DURATION_MS;
    const likeEventId = `league_group_boost_${groupWeekId}_${groupId}_${startedAt}`;
    createdBoost = {
      groupId,
      weekId: groupWeekId,
      leagueId,
      multiplier: LEAGUE_GROUP_BOOST_MULTIPLIER,
      startedAt,
      expiresAt,
      buyerUid: stableUid,
      buyerName: sanitizeString(buyer.name, 48) || 'Player',
      buyerAvatar: sanitizeString(buyer.avatar, 64) || null,
      buyerFrame: sanitizeString(buyer.frame, 64) || null,
      buyerAura: sanitizeString(buyer.aura, 64) || null,
      buyerTotalXp: Math.max(0, readInt(buyer.totalXp, 0)),
      buyerProfileCardLevel: Math.max(0, Math.min(5, readInt(buyer.profileCardLevel, 0))),
      buyerProfileCardTheme: sanitizeString(buyer.profileCardTheme, 32) || 'classic',
      buyerProfileCardMotion: sanitizeString(buyer.profileCardMotion, 32) || 'none',
      buyerProfileCardPublicFocus: sanitizeString(buyer.profileCardPublicFocus, 32) || 'balanced',
      likeEventId,
      likeCount: 0,
    };
    shardsBalance = after;

    const userPatch: Record<string, unknown> = {
      shards: after,
      shards_updated_at_ms: now,
      shards_updated_op: 'spend',
      shards_updated_reason: usedGiftVoucher ? 'league_group_boost_gift' : 'league_group_boost',
    };
    if (usedGiftVoucher) {
      userPatch.club_gift_free_boost_v1 = admin.firestore.FieldValue.delete();
      userPatch.progress = { club_gift_free_boost_v1: admin.firestore.FieldValue.delete() };
    }
    tx.set(userRef, userPatch, { merge: true });
    tx.create(logRef, {
      type: 'spend',
      amount: usedGiftVoucher ? 0 : LEAGUE_GROUP_BOOST_COST_SHARDS,
      reason: usedGiftVoucher ? 'league_group_boost_gift' : 'league_group_boost',
      balanceBefore: before,
      balanceAfter: after,
      ts: new Date(now).toISOString(),
    });
    tx.set(userRef.collection('my_events').doc(likeEventId), {
      uid: stableUid,
      type: 'league_group_boost',
      title: 'League XP boost',
      activityLikeCount: 0,
      createdAt: now,
      createdAtIso: new Date(now).toISOString(),
      groupId,
      weekId: groupWeekId,
      leagueId,
      multiplier: LEAGUE_GROUP_BOOST_MULTIPLIER,
      expiresAt,
    }, { merge: true });
    tx.set(groupRef, {
      groupBoost: createdBoost,
      updatedAt: now,
    }, { merge: true });
  });

  return { ok: true, groupId, boost: createdBoost, shardsBalance, shardsUpdatedAtMs: now, usedGiftVoucher };
}

// БЫЛО: onRequest с invoker:'public' и stableId из тела — кто угодно мог POST-запросом
// списать 50 shards у ЛЮБОГО аккаунта (griefing) в обход App Check. Переведено на onCall:
// uid берётся из request.auth, stableId резолвится через resolveStableUidForAuth — списать
// можно только со своего аккаунта. Клиент уже зовёт это как callable (league_group_boosts.ts),
// поэтому сигнатура вызова не меняется; поля ответа (ok/groupId/boost/shardsBalance) теперь
// корректно ложатся в res.data (раньше клиент читал их из обёртки {result} и получал undefined).
export const leagueActivateGroupBoost = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, request.auth.uid, request.data?.stableId, { requireKnownIdentity: true, repairLinks: false });
  return activateLeagueGroupBoostForStableUid(db, stableUid);
});
