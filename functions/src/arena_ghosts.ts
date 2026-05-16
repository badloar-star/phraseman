import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const REGION = 'us-central1';
const CHALLENGES = 'arena_ghost_challenges';
const MAX_GHOST_QUESTIONS = 12;
const GHOST_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_SCORE_PER_QUESTION = 195;

function readInt(value: unknown, fallback = 0): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? n : fallback;
}

function cleanText(value: unknown, fallback = '', max = 120): string {
  const s = String(value ?? fallback).replace(/\s+/g, ' ').trim();
  return (s || fallback).slice(0, max);
}

function cleanName(value: unknown): string {
  return cleanText(value, 'Phraseman', 80);
}

function cleanId(value: unknown): string {
  return String(value ?? '').trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 160);
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

function normalizeQuestion(raw: any) {
  if (!raw || typeof raw !== 'object') return null;
  const id = cleanId(raw.id);
  const options = Array.isArray(raw.options) ? raw.options.map((x: unknown) => String(x)).slice(0, 4) : [];
  const correct = String(raw.correct ?? '');
  if (!id || options.length !== 4 || !correct || !options.includes(correct)) return null;
  return {
    id,
    level: String(raw.level ?? 'A1').slice(0, 4),
    ...(raw.type ? { type: String(raw.type).slice(0, 40) } : {}),
    ...(raw.task ? { task: String(raw.task).slice(0, 160) } : {}),
    question: String(raw.question ?? '').slice(0, 300),
    options,
    correct,
    rule: String(raw.rule ?? '').slice(0, 500),
    ...(raw.source ? { source: String(raw.source).slice(0, 80) } : {}),
  };
}

function normalizeAnswer(raw: any, allowedIds: Set<string>) {
  if (!raw || typeof raw !== 'object') return null;
  const questionId = cleanId(raw.questionId);
  if (!questionId || !allowedIds.has(questionId)) return null;
  const isCorrect = raw.isCorrect === true;
  return {
    questionId,
    answer: raw.answer == null ? null : String(raw.answer).slice(0, 160),
    isCorrect,
    timeMs: Math.max(350, Math.min(60_000, readInt(raw.timeMs, 9000))),
    points: Math.max(0, Math.min(MAX_SCORE_PER_QUESTION, readInt(raw.points, isCorrect ? 100 : 0))),
  };
}

export const arenaGhostCreateChallenge = onCall({ region: REGION }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUid(db, authUid);
  await assertNotBanned(db, stableUid);

  const questions = (Array.isArray(request.data?.questions) ? request.data.questions : [])
    .slice(0, MAX_GHOST_QUESTIONS)
    .map(normalizeQuestion)
    .filter(Boolean);
  const allowedIds = new Set<string>(questions.map((q: any) => String(q.id)));
  const answers = (Array.isArray(request.data?.answers) ? request.data.answers : [])
    .slice(0, MAX_GHOST_QUESTIONS)
    .map((a: any) => normalizeAnswer(a, allowedIds))
    .filter(Boolean);
  if (questions.length === 0 || answers.length === 0) {
    throw new HttpsError('invalid-argument', 'not_enough_match_data');
  }

  const answerScore = answers.reduce((sum: number, a: any) => sum + readInt(a.points, 0), 0);
  const ownerScore = Math.max(0, Math.min(questions.length * MAX_SCORE_PER_QUESTION, readInt(request.data?.ownerScore, answerScore)));
  const now = Date.now();
  const ref = db.collection(CHALLENGES).doc();
  const challenge = {
    id: ref.id,
    ownerUid: authUid,
    ownerStableUid: stableUid,
    ownerName: cleanName(request.data?.ownerName),
    ownerScore,
    questionSnapshots: questions,
    answers,
    createdAt: now,
    expiresAt: now + GHOST_TTL_MS,
    playCount: 0,
    bestBeatScore: 0,
  };
  await ref.set(challenge);
  return challenge;
});

export const arenaGhostRecordPlay = onCall({ region: REGION }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUid(db, authUid);
  await assertNotBanned(db, stableUid);

  const id = cleanId(request.data?.id);
  if (!id) throw new HttpsError('invalid-argument', 'challenge_id_required');
  const score = Math.max(0, Math.min(MAX_GHOST_QUESTIONS * MAX_SCORE_PER_QUESTION, readInt(request.data?.score, 0)));
  const ref = db.collection(CHALLENGES).doc(id);
  const now = Date.now();

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'challenge_not_found');
    const data = snap.data() || {};
    if (readInt(data.expiresAt, 0) < now) throw new HttpsError('failed-precondition', 'challenge_expired');
    const currentBest = Math.max(0, readInt(data.bestBeatScore, 0));
    tx.update(ref, {
      playCount: admin.firestore.FieldValue.increment(1),
      bestBeatScore: Math.max(currentBest, score),
      lastPlayedAt: now,
      lastPlayedBy: authUid,
      lastPlayedStableUid: stableUid,
    });
    return { ok: true, bestBeatScore: Math.max(currentBest, score) };
  });
});
