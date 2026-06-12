"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onPlayerAnswered = onPlayerAnswered;
exports.advanceSession = advanceSession;
exports.startSessionCountdown = startSessionCountdown;
exports.onQuestionTimeout = onQuestionTimeout;
const admin = __importStar(require("firebase-admin"));
const matchmaking_1 = require("./matchmaking");
const types_1 = require("./types");
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
async function onPlayerAnswered(sessionId, questionId) {
    const sessionRef = db.collection('arena_sessions').doc(sessionId);
    // Результат транзакции: продвинулись ли в reveal, и (если нет) не пора ли уже
    // форсировать таймаут вопроса — игрок ответил, но соперник молчит дольше лимита
    // (типичный кейс: соперник закрыл приложение). currentQuestionIndex нужен для
    // onQuestionTimeout.
    const outcome = await db.runTransaction(async (tx) => {
        const sessionSnap = await tx.get(sessionRef);
        if (!sessionSnap.exists)
            return { advanced: false, forceTimeoutAt: null };
        const session = sessionSnap.data();
        if (session.state !== 'question')
            return { advanced: false, forceTimeoutAt: null };
        if (session.questions[session.currentQuestionIndex] !== questionId)
            return { advanced: false, forceTimeoutAt: null };
        const allPlayerIds = session.playerIds;
        const playerSnaps = await Promise.all(allPlayerIds.map(pid => tx.get(db.collection('session_players').doc(`${sessionId}_${pid}`))));
        const players = playerSnaps
            .filter(s => s.exists)
            .map(s => s.data());
        // Важно: считаем раунд завершённым только когда у каждого есть ответ
        // И этот ответ уже серверно просчитан (serverScored=true).
        // Иначе можно уйти в finished раньше начисления score и словить
        // ошибочный draw/неизменение звёзд в финализации.
        const allAnswered = players.every((p) => p.answers
            .some((a) => a.questionId === questionId && a.serverScored === true));
        if (!allAnswered) {
            // Не все ответили. Если время вопроса уже истекло (с запасом) — сигналим
            // наружу форсировать таймаут немедленно, не дожидаясь watchdog-крона (до 5 мин).
            const startedAt = typeof session.questionStartedAt === 'number' ? session.questionStartedAt : 0;
            const timeoutMs = typeof session.questionTimeoutMs === 'number' && session.questionTimeoutMs > 0
                ? session.questionTimeoutMs
                : 40000;
            const expired = startedAt > 0 && Date.now() - startedAt > timeoutMs + ANSWER_TIMEOUT_GRACE_MS;
            return { advanced: false, forceTimeoutAt: expired ? session.currentQuestionIndex : null };
        }
        // Все ответили → переходим в reveal
        tx.update(sessionRef, { state: 'reveal' });
        return { advanced: true, forceTimeoutAt: null };
    });
    if (outcome.advanced) {
        // После reveal — переходим к следующему вопросу или финишу
        await new Promise((r) => setTimeout(r, REVEAL_DURATION_MS));
        await advanceSession(sessionId);
        return;
    }
    // Соперник молчит дольше лимита — форсируем таймаут вопроса прямо сейчас
    // (расставит null-ответы не ответившим и продвинет сессию). Идемпотентно.
    if (outcome.forceTimeoutAt !== null) {
        await onQuestionTimeout(sessionId, outcome.forceTimeoutAt);
    }
}
async function advanceSession(sessionId) {
    const sessionRef = db.collection('arena_sessions').doc(sessionId);
    const tiebreak = await db.runTransaction(async (tx) => {
        const snap = await tx.get(sessionRef);
        if (!snap.exists)
            return null;
        const session = snap.data();
        if (session.state !== 'reveal')
            return null;
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
        const playerSnaps = await Promise.all(playerIds.map((pid) => tx.get(db.collection('session_players').doc(`${sessionId}_${pid}`))));
        const players = playerSnaps.filter((s) => s.exists).map((s) => s.data());
        if (players.length !== 2) {
            tx.update(sessionRef, { state: 'finished' });
            return null;
        }
        const s0 = Number(players[0].score) || 0;
        const s1 = Number(players[1].score) || 0;
        const tied = s0 === s1;
        const canTiebreak = tied
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
        };
    });
    if (!tiebreak)
        return;
    const level = types_1.RANK_TO_QUESTION_LEVEL[tiebreak.rankTier] ?? 'A1';
    const newId = await (0, matchmaking_1.pickOneQuestionExcluding)(level, new Set(tiebreak.exclude));
    if (!newId) {
        await sessionRef.update({ state: 'finished' });
        return;
    }
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(sessionRef);
        if (!snap.exists)
            return;
        const s = snap.data();
        if (s.state !== 'reveal')
            return;
        if (s.currentQuestionIndex !== tiebreak.curIdx)
            return;
        if (s.questions.length !== tiebreak.qLen)
            return;
        tx.update(sessionRef, {
            questions: [...s.questions, newId],
            state: 'question',
            currentQuestionIndex: tiebreak.curIdx + 1,
            questionStartedAt: Date.now(),
        });
    });
}
// Запускается когда сессия переходит в countdown → через 3 сек ставим question
async function startSessionCountdown(sessionId) {
    await new Promise((r) => setTimeout(r, COUNTDOWN_DURATION_MS));
    const ref = db.collection('arena_sessions').doc(sessionId);
    const snap = await ref.get();
    if (!snap.exists)
        return;
    const cur = snap.data();
    if (cur?.state !== 'countdown')
        return;
    await ref.update({
        state: 'question',
        currentQuestionIndex: 0,
        questionStartedAt: Date.now(),
    });
}
// Таймаут вопроса — вызывается если не все ответили за отведённое время
async function onQuestionTimeout(sessionId, questionIndex) {
    const sessionRef = db.collection('arena_sessions').doc(sessionId);
    const snap = await sessionRef.get();
    if (!snap.exists)
        return;
    const session = snap.data();
    if (session.state !== 'question')
        return;
    if (session.currentQuestionIndex !== questionIndex)
        return;
    const allPlayerIds = session.playerIds;
    const questionId = session.questions[questionIndex];
    const batch = db.batch();
    for (const pid of allPlayerIds) {
        const docRef = db.collection('session_players').doc(`${sessionId}_${pid}`);
        const pSnap = await docRef.get();
        if (!pSnap.exists)
            continue;
        const p = pSnap.data();
        const alreadyAnswered = p.answers
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
    await new Promise((r) => setTimeout(r, REVEAL_DURATION_MS));
    await advanceSession(sessionId);
}
//# sourceMappingURL=game_loop.js.map