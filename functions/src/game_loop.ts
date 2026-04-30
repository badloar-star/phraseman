import * as admin from 'firebase-admin';
import { DuelSession, SessionPlayer } from './types';

const db = admin.firestore();

const REVEAL_DURATION_MS = 700;
const COUNTDOWN_DURATION_MS = 3000;

// Триггер: когда session_player обновляет answers — проверяем можно ли двигаться
export async function onPlayerAnswered(
  sessionId: string,
  questionId: string
): Promise<void> {
  const sessionRef = db.collection('arena_sessions').doc(sessionId);

  await db.runTransaction(async (tx: admin.firestore.Transaction) => {
    const sessionSnap = await tx.get(sessionRef);
    if (!sessionSnap.exists) return;

    const session = sessionSnap.data() as DuelSession;
    if (session.state !== 'question') return;
    if (session.questions[session.currentQuestionIndex] !== questionId) return;

    const allPlayerIds = session.playerIds;
    const playerSnaps = await Promise.all(
      allPlayerIds.map(pid =>
        tx.get(db.collection('session_players').doc(`${sessionId}_${pid}`))
      )
    );

    const players = playerSnaps
      .filter(s => s.exists)
      .map(s => s.data() as SessionPlayer);

    // Важно: считаем раунд завершённым только когда у каждого есть ответ
    // И этот ответ уже серверно просчитан (serverScored=true).
    // Иначе можно уйти в finished раньше начисления score и словить
    // ошибочный draw/неизменение звёзд в финализации.
    const allAnswered = players.every((p) =>
      (p.answers as { questionId: string; serverScored?: boolean }[])
        .some((a) => a.questionId === questionId && a.serverScored === true)
    );

    if (!allAnswered) return;

    // Все ответили → переходим в reveal
    tx.update(sessionRef, { state: 'reveal' });
  });

  // После reveal — переходим к следующему вопросу или финишу
  await new Promise<void>((r) => setTimeout(r, REVEAL_DURATION_MS));
  await advanceSession(sessionId);
}

export async function advanceSession(sessionId: string): Promise<void> {
  const sessionRef = db.collection('arena_sessions').doc(sessionId);

  await db.runTransaction(async (tx: admin.firestore.Transaction) => {
    const snap = await tx.get(sessionRef);
    if (!snap.exists) return;

    const session = snap.data() as DuelSession;
    if (session.state !== 'reveal') return;

    const nextIndex = session.currentQuestionIndex + 1;

    if (nextIndex >= session.questions.length) {
      // Матч завершён
      tx.update(sessionRef, { state: 'finished' });
    } else {
      // Следующий вопрос
      tx.update(sessionRef, {
        state: 'question',
        currentQuestionIndex: nextIndex,
        questionStartedAt: Date.now(),
      });
    }
  });
}

// Запускается когда сессия переходит в countdown → через 3 сек ставим question
export async function startSessionCountdown(sessionId: string): Promise<void> {
  await new Promise<void>((r) => setTimeout(r, COUNTDOWN_DURATION_MS));
  const ref = db.collection('arena_sessions').doc(sessionId);
  const snap = await ref.get();
  if (!snap.exists) return;
  const cur = snap.data() as { state?: string } | undefined;
  if (cur?.state !== 'countdown') return;
  await ref.update({
    state: 'question',
    currentQuestionIndex: 0,
    questionStartedAt: Date.now(),
  });
}

// Таймаут вопроса — вызывается если не все ответили за отведённое время
export async function onQuestionTimeout(
  sessionId: string,
  questionIndex: number
): Promise<void> {
  const sessionRef = db.collection('arena_sessions').doc(sessionId);
  const snap = await sessionRef.get();
  if (!snap.exists) return;

  const session = snap.data() as DuelSession;
  if (session.state !== 'question') return;
  if (session.currentQuestionIndex !== questionIndex) return;

  const allPlayerIds = session.playerIds;
  const questionId = session.questions[questionIndex];

  const batch = db.batch();
  for (const pid of allPlayerIds) {
    const docRef = db.collection('session_players').doc(`${sessionId}_${pid}`);
    const pSnap = await docRef.get();
    if (!pSnap.exists) continue;

    const p = pSnap.data() as SessionPlayer;
    const alreadyAnswered = (p.answers as { questionId: string }[])
      .some(a => a.questionId === questionId);

    if (!alreadyAnswered) {
      batch.update(docRef, {
        answers: admin.firestore.FieldValue.arrayUnion({
          questionId,
          answer: null,
          isCorrect: false,
          timeMs: session.questionTimeoutMs,
          points: 0,
        }),
      });
    }
  }

  await batch.commit();
  await sessionRef.update({ state: 'reveal' });
  await new Promise<void>((r) => setTimeout(r, REVEAL_DURATION_MS));
  await advanceSession(sessionId);
}
