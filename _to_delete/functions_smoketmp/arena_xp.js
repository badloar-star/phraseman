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
exports.ARENA_XP_DAILY_CAP = exports.ARENA_XP_MATCH_CAP = exports.ARENA_XP_OUTCOME = exports.ARENA_XP_PER_CORRECT = exports.ARENA_XP_BASE = exports.ARENA_XP_RULE_VERSION = void 0;
exports.arenaMatchXp = arenaMatchXp;
exports.arenaXpEligible = arenaXpEligible;
exports.arenaXpUserPatch = arenaXpUserPatch;
exports.arenaWeekKeyForMs = arenaWeekKeyForMs;
const admin = __importStar(require("firebase-admin"));
const progress_events_1 = require("./progress_events");
const xp_levels_1 = require("./xp_levels");
/**
 * Опыт за матч Арены.
 *
 * Владелец (D-69): опыт в Арене обязан быть — сегодня в ней нет ни одной
 * строки про XP. Владелец (D-07): быстрый матч не даёт звёзд, но даёт опыт,
 * иначе играть в него незачем.
 *
 * Начисляется ИСКЛЮЧИТЕЛЬНО на сервере, в той же транзакции расчёта матча, что
 * и звёзды. Причина: расчёт закрывает обоих игроков разом, а соперник к этому
 * моменту мог уже свернуть приложение. Клиентское начисление означало бы, что
 * проигравший стабильно получает звёзды и не получает опыт.
 *
 * Переиспользуется существующий конвейер прогресса (`progress_events.ts`), а не
 * пишется свой: иначе уровень, недельные очки и лига разъедутся с остальным
 * приложением. Не переиспользуются `applyProgressEvent`, семантическая
 * дедупликация по отпечаткам, дневные счётчики и выдача спинов за уровень —
 * Арене они не нужны, а роль защиты от повтора играет расписка журнала звёзд.
 */
exports.ARENA_XP_RULE_VERSION = 1;
exports.ARENA_XP_BASE = Object.freeze({
    ranked: 20, quick: 10, friend: 6, series: 20,
});
exports.ARENA_XP_PER_CORRECT = Object.freeze({
    ranked: 6, quick: 4, friend: 3, series: 6,
});
/** Бонус за исход — только там, где исход что-то значит. */
exports.ARENA_XP_OUTCOME = Object.freeze({
    win: 30, draw: 15, loss: 0,
});
/** Потолок за один матч. Кусается только при злоупотреблении. */
exports.ARENA_XP_MATCH_CAP = 120;
/** Потолок за сутки на игрока. */
exports.ARENA_XP_DAILY_CAP = 600;
/**
 * Число правильных ответов ОБЯЗАНО быть пересчитано сервером из приватного
 * документа матча. Клиентское значение сюда не попадает никогда.
 */
function arenaMatchXp(input) {
    const taskCount = Math.max(0, Math.trunc(Number(input.taskCount) || 0));
    const correct = Math.max(0, Math.min(Math.trunc(Number(input.correctAnswers) || 0), taskCount));
    const base = exports.ARENA_XP_BASE[input.mode] ?? 0;
    const perCorrect = exports.ARENA_XP_PER_CORRECT[input.mode] ?? 0;
    const outcomeBonus = input.mode === 'ranked' || input.mode === 'series'
        ? (exports.ARENA_XP_OUTCOME[input.outcome] ?? 0)
        : 0;
    const raw = base + perCorrect * correct + outcomeBonus;
    const capped = Math.min(raw, exports.ARENA_XP_MATCH_CAP);
    const dailyRoom = exports.ARENA_XP_DAILY_CAP - Math.max(0, Math.trunc(Number(input.dailyXpCredited) || 0));
    return Math.max(0, Math.min(capped, dailyRoom));
}
/** Боты опыта не получают и в лигах не участвуют. */
function arenaXpEligible(stableUid) {
    return typeof stableUid === 'string' && stableUid.length > 0 && !stableUid.startsWith('bot_');
}
function progressOf(userData) {
    const progress = userData?.progress;
    return progress && typeof progress === 'object' && !Array.isArray(progress)
        ? progress
        : {};
}
/**
 * Патч документа игрока для начисления опыта. Возвращается вызывающему, чтобы
 * тот передал его как `extraUserFields` в `commitStarOperations` — тогда звёзды
 * и опыт уезжают ОДНОЙ записью, а не двумя.
 */
function arenaXpUserPatch(input) {
    const delta = Math.max(0, Math.trunc(Number(input.xpDelta) || 0));
    const baseline = (0, progress_events_1.buildProgressBaseline)(progressOf(input.userData), input.userData?.progressServerState, input.now);
    const state = (0, progress_events_1.progressServerStateFromProgress)(baseline, input.now);
    state.totalXp = Math.max(0, state.totalXp + delta);
    state.level = (0, xp_levels_1.getLevelFromXP)(state.totalXp);
    state.weekXp = Math.max(0, state.weekXp + delta);
    // Недельные очки лиги никогда не убывают внутри недели: конвейер лиг всюду
    // берёт максимум из своих источников, и уменьшение здесь разъехалось бы с ним.
    state.weekPoints = Math.max(state.weekPoints, state.weekXp);
    return {
        patch: {
            progress: (0, progress_events_1.authoritativeProgressPatch)(state),
            progressServerState: { ...state, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
        },
        totalXpAfter: state.totalXp,
        levelAfter: state.level,
        weekKey: state.weekKey,
        weekXpAfter: state.weekXp,
    };
}
/** Ключ недели для произвольного момента — тот же помощник, что у прогресса. */
function arenaWeekKeyForMs(ms) {
    return (0, progress_events_1.getWeekKey)((0, progress_events_1.isoDateUtc)(new Date(ms)));
}
