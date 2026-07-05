"use strict";
// ════════════════════════════════════════════════════════════════════════════
// constellations/submit.ts — callable constellationSubmitAction (спек H2/D6).
//
// ЕДИНСТВЕННЫЙ путь записи хода игрока: клиент не пишет в constellation_players
// напрямую (правила H3). Всё серверно: валидация фазы/легальности, скоринг
// ответа по correctByQid из закрытого constellation_server, серверные тайминги,
// отклонение нечеловеческих (<minAnswerMs), идемпотентность по actionId.
//
// Ответ на 'answer' возвращает correct/correctIndex — раскрытие ПОСЛЕ фиксации
// ответа безопасно. Разборы (rule) в режиме нет — только сам факт верно/неверно.
// Ранний фаст-форвард (A3): последний сходивший человек триггерит переход фазы.
// ════════════════════════════════════════════════════════════════════════════
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
exports.constellationSubmitAction = exports.CONSTELLATION_EMOTE_IDS = void 0;
exports.handleConstellationSubmit = handleConstellationSubmit;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("../callable_options");
const config_1 = require("./config");
const engine_1 = require("./engine");
const match_service_1 = require("./match_service");
const db = admin.firestore();
const MATCHES = 'constellation_matches';
const PLAYERS = 'constellation_players';
const SERVER = 'constellation_server';
/** Фиксированный набор эмоутов (F10): id → тексты на studyTarget живут на клиенте. */
exports.CONSTELLATION_EMOTE_IDS = [
    'well_played', 'not_bad', 'too_easy', 'lucky_star', 'ouch', 'gg', 'thinking', 'on_fire',
];
const PROCESSED_ACTIONS_CAP = 60;
const EMOTES_KEEP = 30;
function asId(v, field) {
    if (typeof v !== 'string' || v.length === 0 || v.length > 120) {
        throw new https_1.HttpsError('invalid-argument', `bad ${field}`);
    }
    return v;
}
async function handleConstellationSubmit(uid, data) {
    const matchId = asId(data.matchId, 'matchId');
    const actionId = asId(data.actionId, 'actionId');
    const type = asId(data.type, 'type');
    const matchRef = db.collection(MATCHES).doc(matchId);
    const serverRef = db.collection(SERVER).doc(matchId);
    const playerRef = db.collection(PLAYERS).doc(`${matchId}_${uid}`);
    const cfg = await (0, config_1.resolveConstellationConfig)(db);
    const result = await db.runTransaction(async (tx) => {
        const [matchSnap, serverSnap, playerSnap] = await Promise.all([
            tx.get(matchRef), tx.get(serverRef), tx.get(playerRef),
        ]);
        const match = matchSnap.data();
        const server = serverSnap.data();
        const player = playerSnap.data();
        if (!match || !server)
            throw new https_1.HttpsError('not-found', 'match not found');
        if (!player)
            throw new https_1.HttpsError('permission-denied', 'not a participant');
        if (match.stage !== 'active')
            throw new https_1.HttpsError('failed-precondition', 'match finished');
        if (player.processedActionIds.includes(actionId)) {
            return { ok: true, duplicate: true };
        }
        const slot = player.slot;
        const now = Date.now();
        const pushActionId = (extra) => {
            tx.update(playerRef, {
                ...extra,
                processedActionIds: [...player.processedActionIds, actionId].slice(-PROCESSED_ACTIONS_CAP),
                updatedAt: now,
            });
        };
        const markRoundDone = () => {
            tx.update(matchRef, {
                players: match.players.map((p) => (p.slot === slot ? { ...p, roundDone: true } : p)),
            });
        };
        if (type === 'choose_target') {
            if (match.phase !== 'choose')
                throw new https_1.HttpsError('failed-precondition', 'not choose phase');
            if (server.state.players[slot].status !== 'alive') {
                throw new https_1.HttpsError('failed-precondition', 'player not alive');
            }
            const target = data.target === null || data.target === undefined
                ? null
                : asId(data.target, 'target');
            if (target !== null && !(0, engine_1.legalTargets)(server.state, slot).includes(target)) {
                throw new https_1.HttpsError('failed-precondition', 'illegal target');
            }
            pushActionId({ target, round: match.round, doneAt: now });
            markRoundDone();
            return { ok: true, phaseCheck: 'choose' };
        }
        if (type === 'use_shield') {
            if (match.phase !== 'choose')
                throw new https_1.HttpsError('failed-precondition', 'not choose phase');
            const starKey = asId(data.starKey, 'starKey');
            const p = server.state.players[slot];
            if (p.status !== 'alive')
                throw new https_1.HttpsError('failed-precondition', 'player not alive');
            if (p.shieldUsed)
                throw new https_1.HttpsError('failed-precondition', 'shield already used');
            if (server.state.stars[starKey]?.owner !== slot) {
                throw new https_1.HttpsError('failed-precondition', 'not your star');
            }
            pushActionId({ shieldStarKey: starKey, round: match.round });
            return { ok: true };
        }
        if (type === 'answer') {
            if (match.phase !== 'answer')
                throw new https_1.HttpsError('failed-precondition', 'not answer phase');
            if (player.round !== match.round || player.questions.length === 0) {
                throw new https_1.HttpsError('failed-precondition', 'no questions this round');
            }
            const qIndex = typeof data.qIndex === 'number' ? data.qIndex : -1;
            const answerIndex = typeof data.answerIndex === 'number' ? data.answerIndex : -1;
            if (qIndex !== player.answers.length) {
                throw new https_1.HttpsError('failed-precondition', 'answer out of order');
            }
            const question = player.questions[qIndex];
            if (!question)
                throw new https_1.HttpsError('failed-precondition', 'no such question');
            if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= question.options.length) {
                throw new https_1.HttpsError('invalid-argument', 'bad answerIndex');
            }
            // Серверное время ответа (D6): от выдачи/предыдущего ответа, клиенту не верим.
            const sinceMs = now - (player.lastAnswerAt ?? player.dealtAt ?? now);
            const timeMs = Math.max(0, sinceMs);
            if (timeMs < cfg.quizzes.minAnswerMs) {
                throw new https_1.HttpsError('failed-precondition', 'too fast');
            }
            const key = server.correctByQid[question.qid];
            const correct = !!key && key.correctIndex === answerIndex;
            const answers = [...player.answers, { qIndex, answerIndex, correct, timeMs }];
            const done = answers.length >= player.questions.length;
            pushActionId({
                answers,
                lastAnswerAt: now,
                ...(done ? { doneAt: now } : {}),
            });
            if (done)
                markRoundDone();
            return {
                ok: true,
                correct,
                correctIndex: key?.correctIndex ?? -1,
                done,
                phaseCheck: 'answer',
            };
        }
        if (type === 'emote') {
            const emoteId = asId(data.emoteId, 'emoteId');
            if (!exports.CONSTELLATION_EMOTE_IDS.includes(emoteId)) {
                throw new https_1.HttpsError('invalid-argument', 'unknown emote');
            }
            const mineThisRound = match.emotes.filter((e) => e.slot === slot && e.round === match.round).length;
            if (mineThisRound >= cfg.emotes.perRoundCap) {
                throw new https_1.HttpsError('resource-exhausted', 'emote cooldown');
            }
            const emotes = [...match.emotes, { slot, emoteId, round: match.round, at: now }]
                .slice(-EMOTES_KEEP);
            tx.update(matchRef, { emotes });
            pushActionId({});
            return { ok: true };
        }
        if (type === 'tick') {
            // Клиент увидел, что дедлайн фазы истёк, и просит форсировать переход.
            // Идемпотентно и безопасно: реальный перевод фазы делает проверка ниже
            // (deadlineElapsed), а не сам клиент — читер не ускорит раунд.
            pushActionId({});
            return { ok: true, phaseCheck: match.phase, deadlineTick: true };
        }
        throw new https_1.HttpsError('invalid-argument', `unknown type ${type}`);
    });
    // Переход фазы: (а) фаст-форвард — все люди сходили/ответили (A3), либо
    // (б) tick — истёк дедлайн фазы. СИНХРОННО await (иначе в Cloud Functions фон
    // после return убивается платформой → раунд ЗАВИСАЛ, ждал минутный watchdog).
    // Лаг «зажечь звезду» решается на клиенте оптимистично (шторка закрывается
    // сразу); этот await наступает только когда ВСЕ готовы — тап не блокирует.
    const phaseCheck = result.phaseCheck;
    const isDeadlineTick = result.deadlineTick === true;
    delete result.phaseCheck;
    delete result.deadlineTick;
    if (phaseCheck) {
        try {
            const [matchSnap, serverSnap] = await db.getAll(matchRef, serverRef);
            const match = matchSnap.data();
            const server = serverSnap.data();
            if (match && server && match.stage === 'active' && match.phase === phaseCheck) {
                const humanSnaps = server.humanUids.length > 0
                    ? await db.getAll(...server.humanUids.map((u) => db.collection(PLAYERS).doc(`${matchId}_${u}`)))
                    : [];
                const humanDocs = humanSnaps
                    .map((s) => s.data())
                    .filter((d) => !!d);
                const humanSlotsAlive = humanDocs
                    .filter((d) => server.state.players[d.slot]?.status === 'alive')
                    .map((d) => d.slot);
                const deadlineElapsed = isDeadlineTick && Date.now() >= match.phaseDeadlineAt - 500;
                if (deadlineElapsed || (0, match_service_1.allHumansDoneForPhase)(match, humanDocs, humanSlotsAlive)) {
                    if (match.phase === 'choose')
                        await (0, match_service_1.advanceToAnswer)(matchId);
                    else
                        await (0, match_service_1.resolveCurrentRound)(matchId);
                }
            }
        }
        catch (e) {
            console.warn('constellation fast-forward failed — watchdog подстрахует', e);
        }
    }
    return result;
}
/** Callable: единственная точка входа ходов клиента (регистрируется в index.ts). */
exports.constellationSubmitAction = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth required');
    // Как у арены (matchmaking_queue): очередь и матчи ключуются AUTH uid —
    // клиент джойнится через ensureArenaAuthUid(), правила требуют
    // d.userId == request.auth.uid. Никакого stable-маппинга здесь не нужно.
    return handleConstellationSubmit(request.auth.uid, (request.data ?? {}));
});
//# sourceMappingURL=submit.js.map