import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';

const REGION = 'us-central1';
const THRONES = 'arena_hill_thrones';
const PLAYER_WINS = 'arena_hill_player_wins'; // {dayKey}_{stableUid} → { wins, name, updatedAt }
const MAX_SESSION_AGE_MS = 2 * 60 * 60 * 1000;
const THRONE_REWARD_SHARDS = 10;

type DailyTopEntry = {
  uid: string;
  authUid?: string;
  name: string;
  wins: number;
  updatedAt: number;
};

function readInt(value: unknown, fallback = 0): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? n : fallback;
}

function readMaxInt(...values: unknown[]): number {
  let max = 0;
  for (const value of values) max = Math.max(max, readInt(value, 0));
  return max;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function dayKey(date = new Date()): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function cleanName(value: unknown): string {
  const s = String(value ?? '').replace(/\s+/g, ' ').trim();
  return (s || 'Phraseman').slice(0, 80);
}

function cleanString(value: unknown, max = 80): string | undefined {
  const s = String(value ?? '').replace(/\s+/g, ' ').trim();
  return s ? s.slice(0, max) : undefined;
}

function safeDocId(s: string): string {
  return String(s || 'x').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'x';
}

function parseSessionStartedAt(sessionId: string): number {
  const botHillMatch = /^bot_hill_(\d{10,15})$/.exec(sessionId);
  if (botHillMatch) {
    const startedAt = Number(botHillMatch[1]);
    if (Number.isFinite(startedAt)) {
      const now = Date.now();
      if (startedAt <= now + 60_000 && now - startedAt <= MAX_SESSION_AGE_MS) {
        return startedAt;
      }
    }
  }
  return Date.now();
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

async function resolveDisplayName(db: FirebaseFirestore.Firestore, stableUid: string, requested: unknown): Promise<string> {
  const [lbSnap, userSnap] = await Promise.all([
    db.collection('leaderboard').doc(stableUid).get().catch(() => null),
    db.collection('users').doc(stableUid).get().catch(() => null),
  ]);
  return cleanName(
    lbSnap?.data()?.name
    ?? userSnap?.data()?.name
    ?? userSnap?.data()?.displayName
    ?? requested
    ?? 'Phraseman',
  );
}

export const arenaHillRecordAttempt = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUid(db, authUid);
  await assertNotBanned(db, stableUid);

  const sessionId = String(request.data?.sessionId ?? '').trim();
  parseSessionStartedAt(sessionId); // validate age only
  const isWin = request.data?.isWin === true || request.data?.isWin === 1;

  const today = dayKey();
  const name = await resolveDisplayName(db, stableUid, request.data?.userName);
  const now = Date.now();

  const throneRef = db.collection(THRONES).doc(today);
  const playerWinsRef = db.collection(PLAYER_WINS).doc(`${today}_${safeDocId(stableUid)}`);
  // De-dup per session — одна сессия не может дать больше одной победы
  const sessionRef = db.collection(PLAYER_WINS).doc(`session_${safeDocId(sessionId)}_${safeDocId(stableUid)}`);

  return db.runTransaction(async (tx) => {
    const [throneSnap, playerSnap, sessionSnap] = await Promise.all([
      tx.get(throneRef),
      tx.get(playerWinsRef),
      tx.get(sessionRef),
    ]);

    // Дедупликация по sessionId
    if (sessionSnap.exists) {
      const current = throneSnap.exists ? throneSnap.data() || {} : null;
      return {
        dayKey: today,
        duplicate: true,
        isNewChampion: false,
        myWins: readInt(playerSnap.data()?.wins, 0),
        throne: current ? { id: today, ...current } : null,
        previousChampionName: current?.championName,
        previousScore: current?.score,
      };
    }

    // Записываем сессию как обработанную
    tx.set(sessionRef, { dayKey: today, stableUid, sessionId, isWin, createdAt: now });

    // Обновляем счётчик побед игрока
    const prevWins = readInt(playerSnap.data()?.wins, 0);
    const newWins = isWin ? prevWins + 1 : prevWins;
    tx.set(playerWinsRef, { dayKey: today, stableUid, name, wins: newWins, updatedAt: now }, { merge: true });

    const current = throneSnap.exists ? throneSnap.data() || {} : null;
    const currentChampionWins = readInt(current?.score, 0);

    const attempts = readInt(current?.attempts, 0) + 1;

    // Занимаем трон если: победа И (трон пустой ИЛИ у нас побед больше)
    const winsThrone = isWin && newWins > currentChampionWins;
    // Обновляем трон если мы уже чемпион (наш счётчик вырос)
    const isCurrentChampion = current?.championUid === stableUid;
    const shouldUpdate = winsThrone || (isCurrentChampion && isWin);

    if (!shouldUpdate) {
      tx.set(throneRef, { dayKey: today, attempts, lastAttemptAt: now, updatedAt: now }, { merge: true });
      return {
        dayKey: today,
        isNewChampion: false,
        myWins: newWins,
        throne: current ? { id: today, ...current, attempts, updatedAt: now } : null,
        previousChampionName: current?.championName,
        previousScore: current?.score,
      };
    }

    const next = {
      id: today,
      dayKey: today,
      championUid: stableUid,
      championAuthUid: authUid,
      championName: name,
      score: newWins, // score = количество побед
      heldSince: isCurrentChampion ? (current?.heldSince ?? now) : now,
      updatedAt: now,
      attempts,
      ...(current?.championUid && !isCurrentChampion ? { previousChampionUid: current.championUid } : {}),
      ...(current?.championName && !isCurrentChampion ? { previousChampionName: current.championName } : {}),
      ...(typeof current?.score === 'number' && !isCurrentChampion ? { previousScore: current.score } : {}),
    };
    tx.set(throneRef, next);
    return {
      dayKey: today,
      isNewChampion: winsThrone && !isCurrentChampion,
      myWins: newWins,
      throne: next,
      previousChampionName: current?.championName,
      previousScore: current?.score,
    };
  });
});

export const arenaHillGetDailyTop = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const db = admin.firestore();
  const today = dayKey();
  const throneSnap = await db.collection(THRONES).doc(today).get();
  const throne = throneSnap.data() ?? {};
  const rawRows: DailyTopEntry[] = throneSnap.exists && throne.championUid
    ? [{
      uid: cleanString(throne.championUid, 120) ?? '',
      authUid: cleanString(throne.championAuthUid, 120),
      name: cleanName(throne.championName),
      wins: Math.max(0, readInt(throne.score, 0)),
      updatedAt: readInt(throne.updatedAt, 0),
    }].filter((row) => row.uid && row.wins > 0)
    : [];

  const entries = await Promise.all(rawRows.map(async (row, index) => {
    const [lbSnap, userSnap, arenaStableSnap, arenaAuthSnap] = await Promise.all([
      db.collection('leaderboard').doc(row.uid).get().catch(() => null),
      db.collection('users').doc(row.uid).get().catch(() => null),
      db.collection('arena_profiles').doc(row.uid).get().catch(() => null),
      row.authUid && row.authUid !== row.uid
        ? db.collection('arena_profiles').doc(row.authUid).get().catch(() => null)
        : Promise.resolve(null),
    ]);
    const lb = lbSnap?.data() ?? {};
    const user = userSnap?.data() ?? {};
    const userProgress = (user.progress && typeof user.progress === 'object')
      ? user.progress as Record<string, unknown>
      : {};
    const arenaStable = arenaStableSnap?.data() ?? {};
    const rawArenaAuth = arenaAuthSnap?.data() ?? {};
    const arenaAuthMirror = cleanString(rawArenaAuth.mirrorStableId, 120);
    const arenaAuth = !arenaAuthMirror || arenaAuthMirror === row.uid ? rawArenaAuth : {};
    const totalXp = readMaxInt(
      lb.points,
      lb.totalXp,
      user.totalXp,
      user.user_total_xp,
      userProgress.user_total_xp,
      userProgress.totalXp,
      arenaStable.courseTotalXp,
      arenaStable.totalXp,
      arenaAuth.courseTotalXp,
      arenaAuth.totalXp,
    );

    return {
      place: index + 1,
      uid: row.uid,
      name: cleanName(lb.name ?? user.displayName ?? user.name ?? userProgress.user_name ?? arenaStable.displayName ?? arenaAuth.displayName ?? row.name),
      wins: row.wins,
      totalXp,
      avatar: cleanString(lb.avatar ?? user.avatar ?? user.user_avatar ?? userProgress.user_avatar ?? arenaStable.courseAvatar ?? arenaAuth.courseAvatar, 64),
      frame: cleanString(lb.frame ?? user.frame ?? user.user_frame ?? userProgress.user_frame ?? userProgress.user_avatar_frame ?? arenaStable.courseFrame ?? arenaAuth.courseFrame, 64),
      aura: cleanString(lb.aura ?? user.aura ?? user.user_avatar_aura ?? userProgress.user_avatar_aura ?? arenaStable.courseAura ?? arenaAuth.courseAura, 64),
      isPremium: lb.isPremium === true || user.isPremium === true,
      isVip: lb.isVip === true || user.isVip === true,
      profileCardLevel: readInt(lb.profileCardLevel ?? user.profileCardLevel ?? userProgress.profile_card_level ?? arenaStable.courseProfileCardLevel ?? arenaAuth.courseProfileCardLevel, 0),
      profileCardTheme: cleanString(lb.profileCardTheme ?? user.profileCardTheme ?? userProgress.profile_card_theme ?? arenaStable.courseProfileCardTheme ?? arenaAuth.courseProfileCardTheme, 32),
      profileCardMotion: cleanString(lb.profileCardMotion ?? user.profileCardMotion ?? userProgress.profile_card_motion ?? arenaStable.courseProfileCardMotion ?? arenaAuth.courseProfileCardMotion, 32),
      profileCardPublicFocus: cleanString(lb.profileCardPublicFocus ?? user.profileCardPublicFocus ?? userProgress.profile_card_public_focus ?? arenaStable.courseProfileCardPublicFocus ?? arenaAuth.courseProfileCardPublicFocus, 32),
    };
  }));

  return {
    dayKey: today,
    rewardShards: THRONE_REWARD_SHARDS,
    entries,
  };
});
