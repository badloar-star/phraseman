import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const REGION = 'us-central1';
const THRONES = 'arena_hill_thrones';
const PLAYER_WINS = 'arena_hill_player_wins'; // {dayKey}_{stableUid} → { wins, name, updatedAt }
const MAX_SESSION_AGE_MS = 2 * 60 * 60 * 1000;

function readInt(value: unknown, fallback = 0): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? n : fallback;
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

export const arenaHillRecordAttempt = onCall({ region: REGION }, async (request) => {
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
