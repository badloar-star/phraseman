import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';

const MAX_POINTS = 1_000_000_000;
const MAX_WEEK_POINTS = 50_000_000;
const MAX_SINGLE_SCORE_JUMP = 50_000;
const MAX_INITIAL_POINTS = 250_000;
const MAX_DAILY7_XP = 500_000;
const MAX_DAILY7_TIME_MS = 7 * 24 * 60 * 60 * 1000;
const NAME_INDEX = 'name_index';
const MAX_PROFILE_CARD_LEVEL = 5;

function sanitizeString(value: unknown, max: number): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function readInt(value: unknown, fallback = 0): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? n : fallback;
}

function normalizeName(value: unknown): { name: string; nameLower: string } {
  const name = sanitizeString(value, 32);
  return { name, nameLower: name.toLowerCase() };
}

function assertValidName(name: string): void {
  if (name.length < 2 || name.length > 32) {
    throw new HttpsError('invalid-argument', 'name_length');
  }
  if (/[\r\n\t]/.test(name) || /https?:\/\//i.test(name) || /www\./i.test(name) || /[@#]/.test(name)) {
    throw new HttpsError('invalid-argument', 'name_invalid');
  }
}

function getWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function resolveStableUid(db: FirebaseFirestore.Firestore, authUid: string): Promise<string> {
  const direct = await db.collection('users').doc(authUid).get().catch(() => null);
  if (direct?.exists) return authUid;
  const byAuth = await db.collection('users').where('firebaseAuthUid', '==', authUid).limit(1).get();
  if (!byAuth.empty) return byAuth.docs[0].id;
  return authUid;
}

async function assertNotBanned(db: FirebaseFirestore.Firestore, stableUid: string): Promise<void> {
  const [userSnap, bannedSnap] = await Promise.all([
    db.collection('users').doc(stableUid).get().catch(() => null),
    db.collection('banned_users').doc(stableUid).get().catch(() => null),
  ]);
  if (bannedSnap?.exists || userSnap?.data()?.banned === true) {
    throw new HttpsError('permission-denied', 'user_banned');
  }
}

export const leaderboardPushMyScore = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUid(db, authUid);
  await assertNotBanned(db, stableUid);

  const name = sanitizeString(request.data?.name, 48);
  if (!name) throw new HttpsError('invalid-argument', 'name_required');

  const requestedPoints = Math.max(0, Math.min(MAX_POINTS, readInt(request.data?.points, 0)));
  const requestedWeekPoints = Math.max(0, Math.min(MAX_WEEK_POINTS, readInt(request.data?.weekPoints, 0)));
  const weekKey = getWeekKey();
  const ref = db.collection('leaderboard').doc(stableUid);
  const now = Date.now();

  let written: Record<string, unknown> = {};
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.data() || {};
    const oldPoints = Math.max(0, readInt(cur.points, 0));
    const oldWeekPoints = cur.weekKey === weekKey ? Math.max(0, readInt(cur.weekPoints, 0)) : 0;
    const points = snap.exists
      ? Math.max(oldPoints, Math.min(requestedPoints, oldPoints + MAX_SINGLE_SCORE_JUMP))
      : Math.min(requestedPoints, MAX_INITIAL_POINTS);
    const weekPoints = Math.max(oldWeekPoints, Math.min(requestedWeekPoints, oldWeekPoints + MAX_SINGLE_SCORE_JUMP));

    written = {
      name,
      nameLower: name.toLowerCase(),
      points,
      weekPoints,
      weekKey,
      lang: sanitizeString(request.data?.lang, 12) || 'ru',
      avatar: sanitizeString(request.data?.avatar, 64) || null,
      frame: sanitizeString(request.data?.frame, 64) || null,
      aura: sanitizeString(request.data?.aura, 64) || null,
      streak: Math.max(0, Math.min(100_000, readInt(request.data?.streak, 0))),
      leagueId: Math.max(0, Math.min(50, readInt(request.data?.leagueId, 0))),
      isPremium: request.data?.isPremium === true,
      profileCardLevel: Math.max(0, Math.min(MAX_PROFILE_CARD_LEVEL, readInt(request.data?.profileCardLevel, 0))),
      profileCardTheme: sanitizeString(request.data?.profileCardTheme, 32) || 'classic',
      profileCardMotion: sanitizeString(request.data?.profileCardMotion, 32) || 'none',
      profileCardPublicFocus: sanitizeString(request.data?.profileCardPublicFocus, 32) || 'balanced',
      firebaseAuthUid: authUid,
      updatedAt: now,
    };
    tx.set(ref, written, { merge: true });
  });

  await db.collection('arena_profiles').doc(authUid).set({
    courseTotalXp: written.points,
    courseAvatar: written.avatar,
    courseFrame: written.frame,
    courseAura: written.aura,
    courseIsPremium: written.isPremium,
    courseProfileCardLevel: written.profileCardLevel,
    courseProfileCardTheme: written.profileCardTheme,
    courseProfileCardMotion: written.profileCardMotion,
    courseProfileCardPublicFocus: written.profileCardPublicFocus,
    courseDisplayAt: now,
    mirrorStableId: stableUid,
  }, { merge: true }).catch(() => {});

  return { ok: true, points: written.points, weekPoints: written.weekPoints };
});

export const leaderboardUpdatePremium = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUid(db, authUid);
  await assertNotBanned(db, stableUid);
  const isPremium = request.data?.isPremium === true;
  await Promise.all([
    db.collection('leaderboard').doc(stableUid).set({ isPremium, firebaseAuthUid: authUid, updatedAt: Date.now() }, { merge: true }),
    db.collection('arena_profiles').doc(authUid).set({ courseIsPremium: isPremium, courseDisplayAt: Date.now() }, { merge: true }),
  ]);
  return { ok: true };
});

export const leaderboardUpdateDailyAnalytics = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUid(db, authUid);
  await assertNotBanned(db, stableUid);

  const daily7xp = Math.max(0, Math.min(MAX_DAILY7_XP, readInt(request.data?.daily7xp, 0)));
  const daily7time_ms = Math.max(0, Math.min(MAX_DAILY7_TIME_MS, readInt(request.data?.daily7time_ms, 0)));
  await db.collection('leaderboard').doc(stableUid).set({
    daily7xp,
    daily7time_ms,
    dailyAnalyticsUpdatedAt: Date.now(),
    firebaseAuthUid: authUid,
  }, { merge: true });
  return { ok: true };
});

export const nameCheckAvailability = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const stableUid = await resolveStableUid(db, request.auth.uid);
  const { name, nameLower } = normalizeName(request.data?.name);
  assertValidName(name);

  const idxSnap = await db.collection(NAME_INDEX).doc(nameLower).get();
  if (idxSnap.exists && idxSnap.data()?.uid !== stableUid) {
    return { ok: true, available: false };
  }

  const sameName = await db.collection('leaderboard').where('nameLower', '==', nameLower).limit(8).get();
  const takenByOther = sameName.docs.some((d) => d.id !== stableUid);
  return { ok: true, available: !takenByOther };
});

export const nameReserve = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUid(db, authUid);
  await assertNotBanned(db, stableUid);

  const { name, nameLower } = normalizeName(request.data?.name);
  const oldNameLower = sanitizeString(request.data?.oldName, 32).toLowerCase();
  assertValidName(name);

  const sameName = await db.collection('leaderboard').where('nameLower', '==', nameLower).limit(8).get();
  if (sameName.docs.some((d) => d.id !== stableUid)) {
    return { ok: true, status: 'taken' };
  }

  await db.runTransaction(async (tx) => {
    const nameRef = db.collection(NAME_INDEX).doc(nameLower);
    const nameSnap = await tx.get(nameRef);
    const oldRef = oldNameLower && oldNameLower !== nameLower ? db.collection(NAME_INDEX).doc(oldNameLower) : null;
    const oldSnap = oldRef ? await tx.get(oldRef) : null;
    if (nameSnap.exists && nameSnap.data()?.uid !== stableUid) {
      throw new HttpsError('already-exists', 'name_taken');
    }

    tx.set(nameRef, {
      uid: stableUid,
      authUid,
      name,
      nameLower,
      updatedAt: Date.now(),
    }, { merge: true });

    if (oldRef && oldSnap?.exists && oldSnap.data()?.uid === stableUid) {
      tx.delete(oldRef);
    }

    tx.set(db.collection('leaderboard').doc(stableUid), {
      name,
      nameLower,
      firebaseAuthUid: authUid,
      updatedAt: Date.now(),
    }, { merge: true });
  });

  return { ok: true, status: 'ok' };
});

export const nameReleaseMine = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUid(db, authUid);
  const candidates = new Set<string>();

  const names = Array.isArray(request.data?.names) ? request.data.names : [];
  for (const n of names) {
    const { nameLower } = normalizeName(n);
    if (nameLower) candidates.add(nameLower);
  }

  const lbSnap = await db.collection('leaderboard').doc(stableUid).get().catch(() => null);
  const lb = lbSnap?.data() || {};
  if (typeof lb.nameLower === 'string' && lb.nameLower.trim()) candidates.add(lb.nameLower.trim().toLowerCase());
  if (typeof lb.name === 'string' && lb.name.trim()) candidates.add(lb.name.trim().toLowerCase());

  const byUid = await db.collection(NAME_INDEX).where('uid', '==', stableUid).limit(20).get().catch(() => null);
  byUid?.docs.forEach((doc) => candidates.add(doc.id));

  const batch = db.batch();
  let deleted = 0;
  for (const nameLower of candidates) {
    const ref = db.collection(NAME_INDEX).doc(nameLower);
    const snap = await ref.get().catch(() => null);
    if (snap?.exists && snap.data()?.uid === stableUid) {
      batch.delete(ref);
      deleted += 1;
    }
  }
  if (deleted > 0) await batch.commit();
  return { ok: true, deleted };
});
