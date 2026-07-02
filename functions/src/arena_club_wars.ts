import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';

const REGION = 'us-central1';

function readInt(value: unknown, fallback = 0): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? n : fallback;
}

function cleanName(name: unknown): string {
  const s = String(name ?? '').replace(/\s+/g, ' ').trim();
  return (s || 'Phraseman').slice(0, 80);
}

function safeDocId(s: string): string {
  return String(s || 'x').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'x';
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

function calcClubArenaPoints(params: {
  score: number;
  won: boolean;
  correctAnswers: number;
  totalQuestions: number;
}): { points: number; perfect: boolean } {
  const score = Math.max(0, Math.min(20000, readInt(params.score, 0)));
  const total = Math.max(0, Math.min(100, readInt(params.totalQuestions, 0)));
  const correct = Math.max(0, Math.min(total, readInt(params.correctAnswers, 0)));
  const perfect = total > 0 && correct >= total;
  return { points: score + (params.won ? 250 : 0) + (perfect ? 150 : 0), perfect };
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

function answerStats(player: FirebaseFirestore.DocumentData | undefined, session: FirebaseFirestore.DocumentData | undefined) {
  const answers = Array.isArray(player?.answers) ? player.answers : [];
  const correctAnswers = answers.filter((a: any) => a?.isCorrect === true).length;
  const sessionQuestions = Array.isArray(session?.questions) ? session.questions.length : 0;
  const totalQuestions = Math.max(sessionQuestions, answers.length);
  return { correctAnswers, totalQuestions };
}

export const arenaClubWarContribute = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUid(db, authUid);
  await assertNotBanned(db, stableUid);

  const sessionId = String(request.data?.sessionId ?? '').trim();
  if (!sessionId || sessionId.length > 180) throw new HttpsError('invalid-argument', 'session_required');

  const weekId = getWeekId();
  const lbSnap = await db.collection('leaderboard').doc(stableUid).get();
  const lb = lbSnap.data() || {};
  const groupId = String(lb.groupId ?? '').trim();
  const groupWeekId = String(lb.groupWeekId ?? lb.weekId ?? '').trim();
  const leagueId = Math.max(0, readInt(lb.leagueId, 0));
  if (!groupId || groupWeekId !== weekId) return { ok: false, status: 'no_current_group' };

  const sessionRef = db.collection('arena_sessions').doc(sessionId);
  const playerRef = db.collection('session_players').doc(`${sessionId}_${authUid}`);
  const eventId = `${weekId}_${safeDocId(groupId)}`;
  const contributionId = `${weekId}_${safeDocId(sessionId)}_${safeDocId(stableUid)}`;
  const eventRef = db.collection('arena_club_events').doc(eventId);
  const contributionRef = db.collection('arena_club_contributions').doc(contributionId);
  const now = Date.now();

  return db.runTransaction(async (tx) => {
    const [sessionSnap, playerSnap, existingSnap, eventSnap] = await Promise.all([
      tx.get(sessionRef),
      tx.get(playerRef),
      tx.get(contributionRef),
      tx.get(eventRef),
    ]);

    if (existingSnap.exists) {
      return {
        ok: true,
        duplicate: true,
        weekId,
        groupId,
        leagueId,
        addedPoints: 0,
        totalPoints: Math.max(0, readInt(eventSnap.data()?.totalPoints, 0)),
      };
    }
    if (!sessionSnap.exists || !playerSnap.exists) throw new HttpsError('not-found', 'arena_session_not_found');

    const session = sessionSnap.data() || {};
    const player = playerSnap.data() || {};
    if (session.state !== 'finished') throw new HttpsError('failed-precondition', 'session_not_finished');
    const playerIds = Array.isArray(session.playerIds) ? session.playerIds.filter(Boolean) : [];
    if (!playerIds.includes(authUid) || player.playerId !== authUid) {
      throw new HttpsError('permission-denied', 'not_session_player');
    }
    if (typeof session.forfeitedBy === 'string' && session.forfeitedBy === authUid) {
      return { ok: false, status: 'forfeited', weekId, groupId, leagueId };
    }

    const playerDocs: Array<{ uid: string; score: number }> = [];
    for (const uid of playerIds) {
      const snap = uid === authUid ? playerSnap : await tx.get(db.collection('session_players').doc(`${sessionId}_${uid}`));
      playerDocs.push({ uid, score: Math.max(0, readInt(snap.data()?.score, 0)) });
    }
    const myScore = Math.max(0, readInt(player.score, 0));
    const topScore = Math.max(...playerDocs.map((p) => p.score), 0);
    const tiedTop = playerDocs.filter((p) => p.score === topScore).length > 1;
    const won = !tiedTop && myScore === topScore && !session.forfeitedBy;
    const { correctAnswers, totalQuestions } = answerStats(player, session);
    const { points, perfect } = calcClubArenaPoints({ score: myScore, won, correctAnswers, totalQuestions });
    if (points <= 0) return { ok: false, status: 'no_points', weekId, groupId, leagueId };

    const currentTotal = Math.max(0, readInt(eventSnap.data()?.totalPoints, 0));
    tx.set(eventRef, {
      weekId,
      groupId,
      leagueId,
      totalPoints: admin.firestore.FieldValue.increment(points),
      totalScore: admin.firestore.FieldValue.increment(myScore),
      wins: admin.firestore.FieldValue.increment(won ? 1 : 0),
      matches: admin.firestore.FieldValue.increment(1),
      perfectRounds: admin.firestore.FieldValue.increment(perfect ? 1 : 0),
      updatedAt: now,
      [`members.${stableUid}.uid`]: stableUid,
      [`members.${stableUid}.arenaUid`]: authUid,
      [`members.${stableUid}.name`]: cleanName(player.displayName),
      [`members.${stableUid}.points`]: admin.firestore.FieldValue.increment(points),
      [`members.${stableUid}.score`]: admin.firestore.FieldValue.increment(myScore),
      [`members.${stableUid}.wins`]: admin.firestore.FieldValue.increment(won ? 1 : 0),
      [`members.${stableUid}.matches`]: admin.firestore.FieldValue.increment(1),
      [`members.${stableUid}.perfectRounds`]: admin.firestore.FieldValue.increment(perfect ? 1 : 0),
      [`members.${stableUid}.updatedAt`]: now,
    }, { merge: true });
    tx.set(contributionRef, {
      weekId,
      groupId,
      leagueId,
      stableUid,
      arenaUid: authUid,
      sessionId,
      name: cleanName(player.displayName),
      score: myScore,
      points,
      won,
      perfect,
      correctAnswers,
      totalQuestions,
      createdAt: now,
    });
    return {
      ok: true,
      weekId,
      groupId,
      leagueId,
      addedPoints: points,
      totalPoints: currentTotal + points,
    };
  });
});
