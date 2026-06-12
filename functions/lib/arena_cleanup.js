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
exports.advanceStuckQuestionSessions = advanceStuckQuestionSessions;
exports.cleanupStaleArenaSessions = cleanupStaleArenaSessions;
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
/** Нормальный матч короче; после этого порога считаем сессию брошенной. */
const STALE_ACTIVE_SESSION_MS = 2 * 60 * 60 * 1000;
/**
 * Запас на acceptance, если expireStaleAcceptanceSessions не отработал (битый дедлайн и т.п.).
 */
const STALE_ACCEPTANCE_FALLBACK_MS = 30 * 60 * 1000;
const ACTIVE_IN_PROGRESS_STATES = ['get_ready', 'countdown', 'question', 'reveal'];
/**
 * Запас поверх questionTimeoutMs, прежде чем серверный watchdog форсирует таймаут
 * вопроса. Покрывает сетевые задержки и медленных игроков, чтобы не обгонять
 * легитимный ответ. Сам questionTimeoutMs обычно 40с.
 */
const QUESTION_WATCHDOG_GRACE_MS = 20 * 1000;
/** Дефолт, если в сессии нет questionTimeoutMs (старые/битые доки). */
const DEFAULT_QUESTION_TIMEOUT_MS = 40 * 1000;
function toMillis(v) {
    if (typeof v === 'number' && Number.isFinite(v))
        return v;
    if (v && typeof v.toMillis === 'function') {
        return v.toMillis();
    }
    return 0;
}
/**
 * Серверный watchdog зависших вопросов. Корень бага: HTTP-функция questionTimeout
 * никем не вызывается, поэтому если игрок закрыл приложение посреди вопроса и не
 * прислал null-ответ, onPlayerAnswered никогда не видит allAnswered → сессия висит
 * в state='question' до 2ч (stale-cleanup) БЕЗ начисления наград.
 *
 * Эта функция находит сессии, застрявшие на вопросе дольше questionTimeoutMs+grace,
 * и вызывает onQuestionTimeout — он расставит null-ответы не ответившим, переведёт в
 * reveal и продвинет сессию к нормальному финишу (с наградами). Идемпотентна: если
 * вопрос уже не тот / state сменился, onQuestionTimeout сам выходит no-op.
 *
 * Вызывается из matchmakingCron (каждые 5 минут) — задержка финала до ~5 мин против
 * зависания на 2ч. Лениво требует game_loop, чтобы не плодить цикл импортов.
 */
async function advanceStuckQuestionSessions() {
    const now = Date.now();
    let nAdvanced = 0;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { onQuestionTimeout } = require('./game_loop');
    try {
        const snap = await db
            .collection('arena_sessions')
            .where('state', '==', 'question')
            .limit(150)
            .get();
        for (const doc of snap.docs) {
            const s = doc.data();
            const startedAt = toMillis(s.questionStartedAt);
            if (!startedAt)
                continue; // ещё не стартовал отсчёт — пропускаем
            const timeoutMs = typeof s.questionTimeoutMs === 'number' && s.questionTimeoutMs > 0
                ? s.questionTimeoutMs
                : DEFAULT_QUESTION_TIMEOUT_MS;
            if (now - startedAt <= timeoutMs + QUESTION_WATCHDOG_GRACE_MS)
                continue;
            try {
                await onQuestionTimeout(doc.id, s.currentQuestionIndex);
                nAdvanced += 1;
            }
            catch (e) {
                console.error('advanceStuckQuestionSessions: onQuestionTimeout failed', doc.id, e);
            }
        }
    }
    catch (e) {
        console.error('advanceStuckQuestionSessions: query failed', e);
    }
    return nAdvanced;
}
/**
 * Завершает «вечные» arena_sessions без начисления наград (state → aborted, не finished).
 * onArenaSessionFinished не срабатывает.
 */
async function cleanupStaleArenaSessions() {
    const now = Date.now();
    let nAborted = 0;
    try {
        const snap = await db
            .collection('arena_sessions')
            .where('state', 'in', [...ACTIVE_IN_PROGRESS_STATES])
            .limit(150)
            .get();
        for (const doc of snap.docs) {
            const s = doc.data();
            const created = toMillis(s.createdAt);
            if (!created || now - created <= STALE_ACTIVE_SESSION_MS)
                continue;
            try {
                await doc.ref.update({
                    state: 'aborted',
                    abortReason: 'stale_cleanup',
                    abortedAt: now,
                });
                nAborted += 1;
            }
            catch (e) {
                console.error('cleanupStaleArenaSessions: update failed', doc.id, e);
            }
        }
    }
    catch (e) {
        console.error('cleanupStaleArenaSessions: in-query failed', e);
    }
    try {
        const accSnap = await db
            .collection('arena_sessions')
            .where('state', '==', 'acceptance')
            .limit(80)
            .get();
        for (const doc of accSnap.docs) {
            const s = doc.data();
            const created = toMillis(s.createdAt);
            if (!created || now - created <= STALE_ACCEPTANCE_FALLBACK_MS)
                continue;
            try {
                await doc.ref.update({
                    state: 'aborted',
                    abortReason: 'stale_cleanup',
                    abortedAt: now,
                });
                nAborted += 1;
            }
            catch (e) {
                console.error('cleanupStaleArenaSessions: acceptance update failed', doc.id, e);
            }
        }
    }
    catch (e) {
        console.error('cleanupStaleArenaSessions: acceptance query failed', e);
    }
    return nAborted;
}
//# sourceMappingURL=arena_cleanup.js.map