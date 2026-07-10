import * as admin from 'firebase-admin';
import { pickOneQuestionForCourseExcluding } from './matchmaking';
import { normalizeArenaCourseIdentity, type ArenaCourseIdentity } from './arena_course_identity';
import { DuelSession, RANK_TO_QUESTION_LEVEL, SessionPlayer } from './types';

const db = admin.firestore();

const REVEAL_DURATION_MS = 700;
const COUNTDOWN_DURATION_MS = 3000;
/** Після цього числа основних питань перевіряємо нічию й можливий тай-брейк. */
const BASE_MATCH_QUESTIONS = 10;
/** Максимум додаткових питань при рівному рахунку (1v1). */
const MAX_TIEBREAK_EXTRA_QUESTIONS = 25;

// Триггер: когда session_player обновляет answers — проверяем можно ли двигаться
/** Запас поверх questionTimeoutMs перед немедленным форсом таймаута (см. ниже). */
const ANSWER_TIMEOUT_GRACE_MS = 20 * 1000;

export async function onPlayerAnswered(
  sessionId: string,
  questionId: string
): Promise<void> {
  const sessionRef = db.collection('arena_sessions').doc(sessionId);

  // Результат транзакции: продвинулись ли в reveal, и (если нет) не пора ли уже
  // форсировать таймаут вопроса — игрок ответил, но соперник молчит дольше лимита
  // (типичный кейс: соперник закрыл приложение). currentQuestionIndex нужен для
  // onQuestionTimeout.
  const outcome = await db.runTransaction(async (tx: admin.firestore.Transaction) => {
    const sessionSnap = await tx.get(sessionRef);
    if (!sessionSnap.exists) return { advanced: false, forceTimeoutAt: null as number | null };

    const session = sessionSnap.data() as DuelSession;
    if (session.state !== 'question') return { advanced: false, forceTimeoutAt: null as number | null };
    if (session.questions[session.currentQuestionIndex] !== questionId) return { advanced: false, forceTimeoutAt: null as number | null };

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

    if (!allAnswered) {
      // Не все ответили. Если время вопроса уже истекло (с запасом) — сигналим
      // наружу форсировать таймаут немедленно, не дожидаясь watchdog-крона (до 5 мин).
      const startedAt = typeof session.questionStartedAt === 'number' ? session.questionStartedAt : 0;
      const timeoutMs = typeof session.questionTimeoutMs === 'number' && session.questionTimeoutMs > 0
        ? session.questionTimeoutMs
        : 40_000;
      const expired = startedAt > 0 && Date.now() - startedAt > timeoutMs + ANSWER_TIMEOUT_GRACE_MS;
      return { advanced: false, forceTimeoutAt: expired ? session.currentQuestionIndex : null };
    }

    // Все ответили → переходим в reveal
    tx.update(sessionRef, { state: 'reveal' });
    return { advanced: true, forceTimeoutAt: null as number | null };
  });

  if (outcome.advanced) {
    // После reveal — переходим к следующему вопросу или финишу
    await new Promise<void>((r) => setTimeout(r, REVEAL_DURATION_MS));
    await advanceSession(sessionId);
    return;
  }

  // Соперник молчит дольше лимита — форсируем таймаут вопроса прямо сейчас
  // (расставит null-ответы не ответившим и продвинет сессию). Идемпотентно.
  if (outcome.forceTimeoutAt !== null) {
    await onQuestionTimeout(sessionId, outcome.forceTimeoutAt);
  }
}

type TiebreakMeta = {
  curIdx: number;
  qLen: number;
  rankTier: keyof typeof RANK_TO_QUESTION_LEVEL;
  exclude: string[];
  courseIdentity: ArenaCourseIdentity;
};

export async function advanceSession(sessionId: string): Promise<void> {
  const sessionRef = db.collection('arena_sessions').doc(sessionId);

  const tiebreak = await db.runTransaction(async (tx: admin.firestore.Transaction) => {
    const snap = await tx.get(sessionRef);
    if (!snap.exists) return null;

    const session = snap.data() as DuelSession;
    if (session.state !== 'reveal') return null;

    const nextIndex = session.currentQuestionIndex + 1;

    if (nextIndex < session.questions.length) {
      tx.update(sessionRef, {
        state: 'question',
        currentQuestionIndex: nextIndex,
        questionStartedAt: Date.now(),
      });
      return null;
    }

    // Закінчились питання в масиві — або фініш, або тай-брейк при нічії (лише 1v1).
    const playerIds = session.playerIds ?? [];
    if (playerIds.length !== 2) {
      tx.update(sessionRef, { state: 'finished' });
      return null;
    }

    const playerSnaps = await Promise.all(
      playerIds.map((pid) => tx.get(db.collection('session_players').doc(`${sessionId}_${pid}`))),
    );
    const players = playerSnaps.filter((s) => s.exists).map((s) => s.data() as SessionPlayer);
    if (players.length !== 2) {
      tx.update(sessionRef, { state: 'finished' });
      return null;
    }

    const s0 = Number(players[0].score) || 0;
    const s1 = Number(players[1].score) || 0;
    const tied = s0 === s1;
    const canTiebreak =
      tied
      && session.questions.length >= BASE_MATCH_QUESTIONS
      && session.questions.length < BASE_MATCH_QUESTIONS + MAX_TIEBREAK_EXTRA_QUESTIONS;

    if (!canTiebreak) {
      tx.update(sessionRef, { state: 'finished' });
      return null;
    }

    return {
      curIdx: session.currentQuestionIndex,
      qLen: session.questions.length,
      rankTier: session.rankTier,
      exclude: [...session.questions],
      courseIdentity: normalizeArenaCourseIdentity(session),
    } satisfies TiebreakMeta;
  });

  if (!tiebreak) return;

  const level = RANK_TO_QUESTION_LEVEL[tiebreak.rankTier] ?? 'A1';
  const newId = await pickOneQuestionForCourseExcluding(tiebreak.courseIdentity, level, new Set(tiebreak.exclude));
  if (!newId) {
    await sessionRef.update({ state: 'finished' });
    return;
  }

  await db.runTransaction(async (tx: admin.firestore.Transaction) => {
    const snap = await tx.get(sessionRef);
    if (!snap.exists) return;
    const s = snap.data() as DuelSession;
    if (s.state !== 'reveal') return;
    if (s.currentQuestionIndex !== tiebreak.curIdx) return;
    if (s.questions.length !== tiebreak.qLen) return;

    tx.update(sessionRef, {
      questions: [...s.questions, newId],
      state: 'question',
      currentQuestionIndex: tiebreak.curIdx + 1,
      questionStartedAt: Date.now(),
    });
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
