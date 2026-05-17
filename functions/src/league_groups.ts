import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';

const GROUP_SIZE = 30;
const BROAD_GROUP_QUERY_LIMIT = 500;

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
  return members && typeof members === 'object' ? Object.keys(members).length : 0;
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

export const leagueJoinOrUpdateGroup = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid, request.data?.stableId);
  await assertCanUseLeague(db, stableUid);

  const weekId = sanitizeString(request.data?.weekId, 16) || getWeekId();
  if (weekId !== getWeekId()) throw new HttpsError('failed-precondition', 'stale_week');
  const leagueId = Math.max(0, Math.min(50, readInt(request.data?.leagueId, 0)));
  const member = sanitizeMember((request.data?.member || {}) as Record<string, unknown>, stableUid);
  const lbRef = db.collection('leaderboard').doc(stableUid);

  let groupId = await findExistingGroupForUser(db, weekId, leagueId, stableUid);
  if (!groupId) {
    const lbSnap = await lbRef.get().catch(() => null);
    const savedGroupId = lbSnap?.data()?.groupId;
    if (typeof savedGroupId === 'string' && lbSnap?.data()?.groupWeekId === weekId && readInt(lbSnap?.data()?.leagueId) === leagueId) {
      const savedSnap = await db.collection('league_groups').doc(savedGroupId).get().catch(() => null);
      if (savedSnap?.exists && savedSnap.data()?.members?.[stableUid]) groupId = savedGroupId;
    }
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
      tx.set(ref, { members, memberCount: Object.keys(members).length, updatedAt: Date.now() }, { merge: true });
      tx.set(lbRef, { groupId, groupWeekId: weekId, leagueId }, { merge: true });
    });
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
      if (!members[stableUid] && Object.keys(members).length >= GROUP_SIZE) return;
      members[stableUid] = { ...(members[stableUid] || {}), ...member };
      tx.set(ref, { members, memberCount: Object.keys(members).length, updatedAt: Date.now() }, { merge: true });
      tx.set(lbRef, { groupId: candidate, groupWeekId: weekId, leagueId }, { merge: true });
      joined = true;
    });
    if (joined) return { ok: true, groupId: candidate, weekId, leagueId };
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
  return { ok: true, groupId: newGroupId, weekId, leagueId };
});

export const leagueUpdateMyMember = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid, request.data?.stableId);
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
  if (Object.prototype.hasOwnProperty.call(raw, 'streak')) updates[`members.${stableUid}.streak`] = Math.max(0, Math.min(100_000, readInt(raw.streak, 0)));
  if (Object.prototype.hasOwnProperty.call(raw, 'totalXp')) updates[`members.${stableUid}.totalXp`] = Math.max(0, Math.min(1_000_000_000, readInt(raw.totalXp, 0)));
  await db.collection('league_groups').doc(groupId).set(updates, { merge: true });
  return { ok: true, groupId };
});

export const leagueSyncMyBoost = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid, request.data?.stableId);
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
