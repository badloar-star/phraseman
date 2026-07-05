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
exports.progressMigrateSnapshot = exports.progressSubmitEvent = exports.PROGRESS_EVENT_TYPES = void 0;
exports.getWeekKey = getWeekKey;
exports.getWeekStartIso = getWeekStartIso;
exports.resolveClientDateKey = resolveClientDateKey;
exports.normalizeProgressEvent = normalizeProgressEvent;
exports.isServerOwnedProgressKey = isServerOwnedProgressKey;
exports.shouldQualifyReferralFromProgressEvent = shouldQualifyReferralFromProgressEvent;
exports.applyProgressEvent = applyProgressEvent;
exports.buildMigrationPatch = buildMigrationPatch;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const xp_levels_1 = require("./xp_levels");
const referral_1 = require("./referral");
exports.PROGRESS_EVENT_TYPES = [
    'lesson_answer',
    'lesson_complete',
    'quiz_answer',
    'dialog_complete',
    'exam_complete',
    'daily_task_reward',
    'achievement_reward',
    'level_up_bonus',
    'daily_login_bonus',
    'daily_phrase_quest',
    'bonus_chest',
    'vocabulary_learned',
    'verb_learned',
    'preposition_drill_answer',
    'preposition_drill_perfect',
    'review_answer',
    'diagnostic_test',
    'plan_task_complete',
    'wager_win',
];
const EVENT_TYPE_SET = new Set(exports.PROGRESS_EVENT_TYPES);
const EVENT_ID_RE = /^[a-z][a-z0-9_]{1,32}:[A-Za-z0-9_.:-]{1,140}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const SERVER_OWNED_PROGRESS_KEYS = new Set([
    'user_total_xp',
    'user_prev_xp',
    'user_level',
    'weekly_xp',
    'weekly_xp_period_start',
    'week_points',
    'week_points_v2',
    'streak_count',
    'last_active_date',
    'streak_last_date',
    'unlocked_lessons',
]);
const EVENT_XP_CAP = {
    lesson_answer: 100,
    lesson_complete: 8000,
    quiz_answer: 120,
    dialog_complete: 1000,
    exam_complete: 12000,
    daily_task_reward: 1000,
    achievement_reward: 5000,
    level_up_bonus: 1000,
    daily_login_bonus: 500,
    daily_phrase_quest: 500,
    bonus_chest: 5000,
    vocabulary_learned: 150,
    verb_learned: 150,
    preposition_drill_answer: 150,
    preposition_drill_perfect: 1500,
    review_answer: 150,
    diagnostic_test: 2500,
    plan_task_complete: 1500,
    wager_win: 20000,
};
/**
 * ECON-2: дневной потолок суммарного XP по «гриндабельным» источникам (ответы в уроках/квизах,
 * тренажёр предлогов, повторение). Множитель сложности урока + стрик + подарки применяются к
 * КАЖДОМУ ответу на клиенте, и при гринде отдельных вопросов в поздних уроках это даёт сотни тысяч
 * XP в день. Per-event cap (EVENT_XP_CAP) не ограничивает фарм количеством — нужен суточный потолок
 * по сумме. Источники, не входящие сюда (lesson_complete, exam_complete, награды), ограничены своими
 * разовыми/механическими лимитами и сюда не попадают.
 */
const EVENT_DAILY_XP_CAP = {
    lesson_answer: 8000,
    quiz_answer: 8000,
    preposition_drill_answer: 2000,
    review_answer: 4000,
    // Batched lesson-answer XP is submitted as one lesson_complete event per pass.
    // The daily cap keeps replay farming bounded without forcing per-answer writes.
    lesson_complete: 8000,
};
/**
 * ECON-3: суточный лимит попыток экзамена. XP начисляется за каждую попытку, осколок — только за
 * первую, поэтому без лимита экзамен становится бесплатным бесконечным фармом XP. После лимита
 * exam_complete принимается (прогресс/проценты пишутся), но XP не начисляется.
 */
const EXAM_DAILY_ATTEMPT_LIMIT = 5;
/**
 * ECON-11: минимальный процент экзамена, при котором начисляется XP. Ниже порога спам-клик не
 * вознаграждается (раньше пол Math.max(10, …) давал XP даже за 1%).
 */
const EXAM_MIN_XP_PCT = 25;
/**
 * Серверный авторитетный пересчёт XP за экзамен (ECON-11). Клиентский examXp игнорируется: сервер
 * считает по фактическому проценту, без нижнего пола за провал.
 */
function serverExamXp(pct, passed) {
    if (pct < EXAM_MIN_XP_PCT)
        return 0;
    if (passed)
        return 50 + Math.round(pct / 2);
    return Math.round(pct / 4);
}
const MIGRATABLE_NUMERIC_KEYS = [
    'user_total_xp',
    'user_prev_xp',
    'user_level',
    'weekly_xp',
    'week_points',
    'streak_count',
];
function cleanString(value, max = 160) {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function readInt(value, fallback = 0) {
    const raw = typeof value === 'string' ? value.trim() : value;
    const n = Math.trunc(Number(raw));
    return Number.isFinite(n) ? n : fallback;
}
function clampInt(value, min, max) {
    const n = readInt(value, min);
    return Math.max(min, Math.min(max, n));
}
function boolish(value) {
    if (value === true)
        return true;
    if (value === false || value == null)
        return false;
    const s = String(value).trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes';
}
function asProgressString(value) {
    if (typeof value === 'number')
        return String(Math.max(0, Math.trunc(value)));
    if (typeof value === 'boolean')
        return value ? 'true' : 'false';
    return value;
}
function getProgress(data) {
    const raw = data?.progress;
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
}
function isoDateUtc(date) {
    return date.toISOString().slice(0, 10);
}
function dateKeyToUtcMs(value) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!m)
        return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const ms = Date.UTC(y, mo - 1, d);
    const check = new Date(ms);
    if (check.getUTCFullYear() !== y ||
        check.getUTCMonth() !== mo - 1 ||
        check.getUTCDate() !== d) {
        return null;
    }
    return ms;
}
function dayDiff(a, b) {
    const aMs = dateKeyToUtcMs(a);
    const bMs = dateKeyToUtcMs(b);
    if (aMs == null || bMs == null)
        return null;
    return Math.round((aMs - bMs) / DAY_MS);
}
function getWeekKey(dateKey) {
    const ms = dateKeyToUtcMs(dateKey);
    const date = new Date(ms ?? Date.now());
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / DAY_MS) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
function getWeekStartIso(dateKey) {
    const ms = dateKeyToUtcMs(dateKey);
    const date = new Date(ms ?? Date.now());
    const utcDay = date.getUTCDay();
    const daysSinceMonday = (utcDay + 6) % 7;
    const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - daysSinceMonday));
    return isoDateUtc(monday);
}
function resolveClientDateKey(raw, now) {
    const serverToday = isoDateUtc(now);
    const candidate = cleanString(raw, 10);
    if (!candidate)
        return serverToday;
    const diff = dayDiff(candidate, serverToday);
    if (diff == null || Math.abs(diff) > 2)
        return serverToday;
    return candidate;
}
function normalizePayload(raw) {
    return raw && typeof raw === 'object' && !Array.isArray(raw)
        ? raw
        : {};
}
function normalizeProgressEvent(raw) {
    const data = normalizePayload(raw);
    const eventId = cleanString(data.eventId, 180);
    if (!EVENT_ID_RE.test(eventId)) {
        throw new https_1.HttpsError('invalid-argument', 'bad_progress_event_id');
    }
    const typeRaw = cleanString(data.type, 64);
    if (!EVENT_TYPE_SET.has(typeRaw)) {
        throw new https_1.HttpsError('invalid-argument', 'bad_progress_event_type');
    }
    return {
        eventId,
        type: typeRaw,
        clientLocalDate: cleanString(data.clientLocalDate, 10) || undefined,
        clientCreatedAt: readInt(data.clientCreatedAt, 0) || undefined,
        appVersion: cleanString(data.appVersion, 32) || undefined,
        platform: cleanString(data.platform, 32) || undefined,
        payload: normalizePayload(data.payload),
    };
}
function safeDocId(value) {
    return value.replace(/[^\w.:-]/g, '_').slice(0, 180);
}
function normalizeStudyTarget(raw) {
    return cleanString(raw, 12).toLowerCase() === 'fr' ? 'fr' : 'en';
}
function scopedTargetKey(domain, target, id) {
    return target === 'fr' ? `${domain}_v2::fr::${encodeURIComponent(String(id))}` : String(id);
}
function lessonProgressKey(lessonId, target) {
    return target === 'fr' ? scopedTargetKey('lesson_progress', target, lessonId) : `lesson${lessonId}_progress`;
}
function lessonFieldKey(lessonId, field, target) {
    return scopedTargetKey('lesson_progress', target, `lesson${lessonId}_${field}`);
}
function unlockedLessonsKey(target) {
    return scopedTargetKey('lesson_progress', target, 'unlocked_lessons');
}
function examLevelSegment(level) {
    return level === 'final' ? 'final' : level.toUpperCase();
}
function levelExamFieldKey(level, field, target) {
    return scopedTargetKey('level_exams', target, `level_exam_${examLevelSegment(level)}_${field}`);
}
function addServerOwnedLessonKeys(keys, lessonId, target) {
    keys.add(lessonFieldKey(lessonId, 'best_score', target));
    keys.add(lessonFieldKey(lessonId, 'pass_count', target));
    keys.add(lessonProgressKey(lessonId, target));
    keys.add(lessonFieldKey(lessonId, 'cellIndex', target));
    keys.add(unlockedLessonsKey(target));
}
function isServerOwnedProgressKey(key) {
    if (SERVER_OWNED_PROGRESS_KEYS.has(key))
        return true;
    if (/^lesson\d+_(?:best_score|pass_count|progress|cellIndex)$/.test(key))
        return true;
    if (/^level_exam_[A-Za-z0-9_-]+_(?:pct|best_pct|passed|pass_count|completed_at)$/.test(key))
        return true;
    if (/^lesson_progress_v2::fr::.+/.test(key))
        return true;
    if (/^level_exams_v2::fr::level_exam_[A-Za-z0-9_-]+_(?:pct|best_pct|passed|pass_count|completed_at)$/.test(key))
        return true;
    if (/^(?:daily_task|achievement|bonus_chest|wager)_.*(?:claimed|rewarded|at)$/.test(key))
        return true;
    return false;
}
function parseUnlocked(raw) {
    if (Array.isArray(raw))
        return raw.map((v) => readInt(v, 0)).filter((v) => v > 0);
    if (typeof raw !== 'string')
        return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map((v) => readInt(v, 0)).filter((v) => v > 0) : [];
    }
    catch {
        return [];
    }
}
function progressArrayScore(raw) {
    if (Array.isArray(raw))
        return raw.length;
    if (typeof raw !== 'string')
        return 0;
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((item) => item != null && item !== 'empty').length : 0;
    }
    catch {
        return 0;
    }
}
function setUnlocked(progress, patch, lessonId, target) {
    if (lessonId <= 0)
        return;
    const key = unlockedLessonsKey(target);
    const merged = new Set(parseUnlocked(progress[key]));
    merged.add(lessonId);
    patch[key] = JSON.stringify(Array.from(merged).sort((a, b) => a - b));
}
function xpFromPayload(event, daily) {
    const payload = event.payload;
    // ECON-3/11: XP за экзамен ограничивает сервер.
    if (event.type === 'exam_complete') {
        const level = cleanString(payload.level ?? payload.examLevel, 12).toLowerCase();
        const isFinalExam = level === 'final';
        const attemptsSoFar = Math.max(0, daily?.examAttemptsToday ?? 0);
        // Финальный экзамен даёт золотую награду (10000 XP) и гейтится «первым сертификатом» на клиенте —
        // его НЕ пересчитываем и не режем суточным лимитом попыток (это разовое событие). ECON-3/11
        // касаются только уровневых зачётов (a1..c2), которые можно бесконечно пересдавать ради XP.
        if (isFinalExam) {
            const requestedFinal = clampInt(payload.xpDelta ?? payload.finalXp ?? payload.amount ?? payload.baseXp, 0, EVENT_XP_CAP.exam_complete);
            return requestedFinal;
        }
        if (attemptsSoFar >= EXAM_DAILY_ATTEMPT_LIMIT)
            return 0;
        const pct = clampInt(payload.pct ?? payload.percent ?? payload.scorePct, 0, 100);
        const passed = boolish(payload.passed) || pct >= 70;
        const computed = serverExamXp(pct, passed);
        return Math.max(0, Math.min(EVENT_XP_CAP.exam_complete, computed));
    }
    const requested = clampInt(payload.xpDelta ?? payload.finalXp ?? payload.amount ?? payload.baseXp, 0, EVENT_XP_CAP[event.type]);
    if (requested <= 0)
        return 0;
    // ECON-2: суточный потолок по гриндабельным источникам — обрезаем по остатку дневного лимита.
    const dailyCap = EVENT_DAILY_XP_CAP[event.type];
    if (dailyCap != null) {
        const usedToday = Math.max(0, daily?.sourceXpToday?.[event.type] ?? 0);
        const remaining = Math.max(0, dailyCap - usedToday);
        return Math.min(requested, remaining);
    }
    return requested;
}
function applyDailyStreak(progress, patch, activeDate) {
    const last = cleanString(progress.last_active_date ?? progress.streak_last_date, 10);
    const current = Math.max(0, readInt(progress.streak_count, 0));
    if (!last) {
        patch.last_active_date = activeDate;
        patch.streak_last_date = activeDate;
        patch.streak_count = '1';
        return 1;
    }
    if (last === activeDate)
        return current;
    const diff = dayDiff(activeDate, last);
    if (diff == null || diff < 0)
        return current;
    const next = diff === 1 ? current + 1 : 1;
    patch.last_active_date = activeDate;
    patch.streak_last_date = activeDate;
    patch.streak_count = String(next);
    return next;
}
function applyClientStreakEvidence(progress, patch, event, activeDate) {
    const clientLast = cleanString(event.payload.clientLastActiveDate, 10);
    const clientStreak = clampInt(event.payload.clientStreakCount, 0, 100000);
    if (!clientLast || clientStreak <= 0)
        return progress;
    const diffToEventDate = dayDiff(activeDate, clientLast);
    if (diffToEventDate == null || diffToEventDate < 0 || diffToEventDate > 1) {
        return progress;
    }
    const serverLast = cleanString(progress.last_active_date ?? progress.streak_last_date, 10);
    const serverStreak = Math.max(0, readInt(progress.streak_count, 0));
    const clientBeatsServer = !serverLast ||
        clientLast > serverLast ||
        (clientLast === serverLast && clientStreak > serverStreak);
    if (!clientBeatsServer)
        return progress;
    patch.last_active_date = clientLast;
    patch.streak_last_date = clientLast;
    patch.streak_count = String(clientStreak);
    return {
        ...progress,
        last_active_date: clientLast,
        streak_last_date: clientLast,
        streak_count: String(clientStreak),
    };
}
function applyLessonFields(progress, patch, event) {
    const lessonId = clampInt(event.payload.lessonId, 0, 500);
    if (lessonId <= 0)
        return;
    const target = normalizeStudyTarget(event.payload.studyTarget);
    addServerOwnedLessonKeys(SERVER_OWNED_PROGRESS_KEYS, lessonId, target);
    const bestKey = lessonFieldKey(lessonId, 'best_score', target);
    const passKey = lessonFieldKey(lessonId, 'pass_count', target);
    const score = Number(event.payload.score ?? event.payload.bestScore ?? 0);
    if (Number.isFinite(score) && score > 0) {
        const previous = Number(progress[bestKey] ?? 0);
        patch[bestKey] = String(Math.max(previous || 0, Math.round(score * 100) / 100));
    }
    const passed = boolish(event.payload.passed) || score >= 2.5;
    if (passed) {
        patch[passKey] = String(Math.max(0, readInt(progress[passKey], 0)) + 1);
        if (lessonId === 1) {
            // Live-маркер для реферальной квалификации: ставится ТОЛЬКО здесь (живое passed-событие).
            // Миграция снапшота (buildMigrationPatch) его сознательно НЕ переносит — по нему
            // referralApply отличает реальное прохождение урока 1 от подсунутого pass_count.
            patch[lessonFieldKey(1, 'pass_live', target)] = '1';
        }
        setUnlocked(progress, patch, lessonId + 1, target);
    }
    if (Array.isArray(event.payload.progress)) {
        patch[lessonProgressKey(lessonId, target)] = JSON.stringify(event.payload.progress.slice(0, 300));
    }
    const cellIndex = readInt(event.payload.cellIndex, -1);
    if (cellIndex >= 0) {
        const cellKey = lessonFieldKey(lessonId, 'cellIndex', target);
        patch[cellKey] = String(Math.max(readInt(progress[cellKey], 0), cellIndex));
    }
}
function shouldQualifyReferralFromProgressEvent(event) {
    if (event.type !== 'lesson_complete')
        return false;
    const lessonId = clampInt(event.payload.lessonId, 0, 500);
    if (lessonId !== 1)
        return false;
    const score = Number(event.payload.score ?? event.payload.bestScore ?? 0);
    return boolish(event.payload.passed) || (Number.isFinite(score) && score >= 2.5);
}
function applyExamFields(progress, patch, event, activeDate) {
    const level = cleanString(event.payload.level ?? event.payload.examLevel, 12).toLowerCase();
    if (!/^(a1|a2|b1|b2|c1|c2|final)$/.test(level))
        return;
    const target = normalizeStudyTarget(event.payload.studyTarget);
    const pct = clampInt(event.payload.pct ?? event.payload.percent ?? event.payload.scorePct, 0, 100);
    const passed = boolish(event.payload.passed) || pct >= 70;
    const pctKey = levelExamFieldKey(level, 'pct', target);
    const bestKey = levelExamFieldKey(level, 'best_pct', target);
    const passedKey = levelExamFieldKey(level, 'passed', target);
    const completedKey = levelExamFieldKey(level, 'completed_at', target);
    patch[pctKey] = String(pct);
    patch[bestKey] = String(Math.max(readInt(progress[bestKey], 0), pct));
    patch[passedKey] = asProgressString(passed || boolish(progress[passedKey]));
    patch[completedKey] = activeDate;
    if (passed) {
        const passCountKey = levelExamFieldKey(level, 'pass_count', target);
        patch[passCountKey] = String(Math.max(0, readInt(progress[passCountKey], 0)) + 1);
        const nextUnlock = level === 'a1' ? 9 : level === 'a2' ? 19 : level === 'b1' ? 29 : 0;
        setUnlocked(progress, patch, nextUnlock, target);
    }
}
function applyProgressEvent(progress, event, now = new Date(), daily) {
    const activeDate = resolveClientDateKey(event.clientLocalDate, now);
    const weekKey = getWeekKey(activeDate);
    const weekStart = getWeekStartIso(activeDate);
    const patch = {};
    const previousTotal = Math.max(0, readInt(progress.user_total_xp, 0));
    const xpDelta = xpFromPayload(event, daily);
    const totalXp = previousTotal + xpDelta;
    const level = (0, xp_levels_1.getLevelFromXP)(totalXp);
    const previousWeeklyStart = cleanString(progress.weekly_xp_period_start, 10);
    const previousWeeklyXp = previousWeeklyStart === weekStart ? Math.max(0, readInt(progress.weekly_xp, 0)) : 0;
    const weekXp = previousWeeklyXp + xpDelta;
    if (xpDelta > 0) {
        patch.user_prev_xp = String(previousTotal);
        patch.user_total_xp = String(totalXp);
        patch.user_level = String(level);
        patch.weekly_xp = String(weekXp);
        patch.weekly_xp_period_start = weekStart;
        const previousWeekPoints = (() => {
            try {
                const parsed = JSON.parse(String(progress.week_points_v2 ?? '{}'));
                return parsed.weekKey === weekKey ? Math.max(0, Number(parsed.points ?? 0) || 0) : 0;
            }
            catch {
                return 0;
            }
        })();
        const nextWeekPoints = Math.round((previousWeekPoints + xpDelta) * 10) / 10;
        patch.week_points = String(Math.round(nextWeekPoints));
        patch.week_points_v2 = JSON.stringify({ weekKey, points: nextWeekPoints });
    }
    const progressWithClientStreak = xpDelta > 0
        ? applyClientStreakEvidence(progress, patch, event, activeDate)
        : progress;
    const streakCount = xpDelta > 0 ? applyDailyStreak(progressWithClientStreak, patch, activeDate) : Math.max(0, readInt(progress.streak_count, 0));
    if (event.type === 'lesson_complete') {
        applyLessonFields(progress, patch, event);
    }
    else if (event.type === 'exam_complete') {
        applyExamFields(progress, patch, event, activeDate);
    }
    return {
        ok: true,
        eventId: event.eventId,
        type: event.type,
        xpDelta,
        totalXp,
        level,
        streakCount,
        activeDate,
        weekKey,
        weekXp,
        progressPatch: patch,
    };
}
function buildMigrationPatch(snapshot, existing, now = new Date()) {
    const patch = {};
    for (const key of MIGRATABLE_NUMERIC_KEYS) {
        const incoming = Math.max(0, readInt(snapshot[key], 0));
        const current = Math.max(0, readInt(existing[key], 0));
        if (incoming > current)
            patch[key] = String(incoming);
    }
    const incomingWeekStart = cleanString(snapshot.weekly_xp_period_start, 10);
    if (dateKeyToUtcMs(incomingWeekStart) != null) {
        patch.weekly_xp_period_start = incomingWeekStart;
    }
    const incomingWeekPointsV2 = cleanString(snapshot.week_points_v2, 120);
    try {
        const parsed = incomingWeekPointsV2 ? JSON.parse(incomingWeekPointsV2) : null;
        if (parsed &&
            typeof parsed.weekKey === 'string' &&
            /^\d{4}-W\d{2}$/.test(parsed.weekKey) &&
            Number.isFinite(Number(parsed.points))) {
            patch.week_points_v2 = JSON.stringify({ weekKey: parsed.weekKey, points: Math.max(0, Number(parsed.points)) });
        }
    }
    catch {
        // Ignore malformed legacy week_points_v2 during one-time migration.
    }
    const snapshotLast = cleanString(snapshot.last_active_date ?? snapshot.streak_last_date, 10);
    const existingLast = cleanString(existing.last_active_date ?? existing.streak_last_date, 10);
    const serverToday = isoDateUtc(now);
    const acceptedLast = resolveClientDateKey(snapshotLast, now);
    if (snapshotLast && acceptedLast === snapshotLast) {
        const shouldUseSnapshot = !existingLast || (dayDiff(snapshotLast, existingLast) ?? -1) > 0;
        if (shouldUseSnapshot) {
            patch.last_active_date = snapshotLast;
            patch.streak_last_date = snapshotLast;
        }
    }
    else if (!existingLast && serverToday) {
        patch.last_active_date = serverToday;
        patch.streak_last_date = serverToday;
    }
    const unlocked = new Set([
        ...parseUnlocked(existing.unlocked_lessons),
        ...parseUnlocked(snapshot.unlocked_lessons),
    ]);
    if (unlocked.size > 0) {
        patch.unlocked_lessons = JSON.stringify(Array.from(unlocked).sort((a, b) => a - b));
    }
    for (const target of ['fr']) {
        const key = unlockedLessonsKey(target);
        const scopedUnlocked = new Set([
            ...parseUnlocked(existing[key]),
            ...parseUnlocked(snapshot[key]),
        ]);
        if (scopedUnlocked.size > 0) {
            patch[key] = JSON.stringify(Array.from(scopedUnlocked).sort((a, b) => a - b));
        }
    }
    Object.keys(snapshot).forEach((key) => {
        if (!isServerOwnedProgressKey(key))
            return;
        if (/^(?:lesson_progress_v2::fr::)?lesson\d+_(?:best_score|cellIndex)$/.test(key)) {
            const incoming = Number(snapshot[key]);
            const current = Number(existing[key] ?? 0);
            if (Number.isFinite(incoming) && incoming > (Number.isFinite(current) ? current : 0)) {
                patch[key] = String(incoming);
            }
        }
        else if (/^(?:lesson_progress_v2::fr::)?lesson\d+_pass_count$/.test(key)) {
            const incoming = Math.max(0, readInt(snapshot[key], 0));
            const current = Math.max(0, readInt(existing[key], 0));
            if (incoming > current)
                patch[key] = String(incoming);
        }
        else if (/^lesson\d+_progress$/.test(key) || /^lesson_progress_v2::fr::\d+$/.test(key)) {
            const incomingScore = progressArrayScore(snapshot[key]);
            const currentScore = progressArrayScore(existing[key]);
            if (incomingScore > currentScore && typeof snapshot[key] === 'string') {
                patch[key] = snapshot[key];
            }
        }
        else if (/^(?:level_exams_v2::fr::)?level_exam_/.test(key)) {
            if (key.endsWith('_passed')) {
                patch[key] = asProgressString(boolish(existing[key]) || boolish(snapshot[key]));
            }
            else if (key.endsWith('_completed_at')) {
                const incoming = cleanString(snapshot[key], 32);
                if (incoming)
                    patch[key] = incoming;
            }
            else {
                const incoming = Math.max(0, readInt(snapshot[key], 0));
                const current = Math.max(0, readInt(existing[key], 0));
                if (incoming > current)
                    patch[key] = String(incoming);
            }
        }
    });
    return patch;
}
const DAILY_EVENT_LIMIT = 500;
exports.progressSubmitEvent = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    const authUid = request.auth?.uid;
    if (!authUid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const event = normalizeProgressEvent(request.data);
    const db = admin.firestore();
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid, request.data?.stableId, {
        requireKnownIdentity: true,
        repairLinks: false,
    });
    const userRef = db.collection('users').doc(stableUid);
    const ledgerRef = userRef.collection('progress_events').doc(safeDocId(event.eventId));
    const now = new Date();
    const todayKey = isoDateUtc(now);
    const dailyCounterRef = userRef.collection('progress_daily_counters').doc(todayKey);
    const result = await db.runTransaction(async (tx) => {
        const [userSnap, ledgerSnap, counterSnap] = await Promise.all([
            tx.get(userRef),
            tx.get(ledgerRef),
            tx.get(dailyCounterRef),
        ]);
        if (ledgerSnap.exists) {
            const result = ledgerSnap.data()?.result;
            if (result)
                return { ...result, duplicate: true };
            throw new https_1.HttpsError('aborted', 'progress_event_ledger_corrupt');
        }
        const counterData = counterSnap.data() ?? {};
        const dailyCount = counterData.count ?? 0;
        if (dailyCount >= DAILY_EVENT_LIMIT) {
            throw new https_1.HttpsError('resource-exhausted', 'daily_progress_event_limit_reached');
        }
        // ECON-2/3/11: серверные суточные лимиты. Читаем уже накопленные сегодня значения, считаем XP с
        // их учётом, затем записываем обновлённые счётчики в той же транзакции (идемпотентно с ledger).
        const sourceXpToday = counterData.sourceXp ?? {};
        const examAttemptsToday = counterData.examAttempts ?? 0;
        const progress = getProgress(userSnap.data());
        const applied = applyProgressEvent(progress, event, now, { sourceXpToday, examAttemptsToday });
        const counterPatch = {
            count: dailyCount + 1,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        // Вложенный sourceXp нельзя дописывать через {merge:true} с точечным ключом (создаст литеральное
        // поле "sourceXp.x"), поэтому собираем объект sourceXp целиком с FieldValue.increment.
        if (EVENT_DAILY_XP_CAP[event.type] != null && applied.xpDelta > 0) {
            counterPatch.sourceXp = { [event.type]: admin.firestore.FieldValue.increment(applied.xpDelta) };
        }
        // Считаем только попытки уровневых зачётов (a1..c2) — финальный экзамен разовый и под лимит не идёт.
        if (event.type === 'exam_complete') {
            const examLevel = cleanString(event.payload.level ?? event.payload.examLevel, 12).toLowerCase();
            if (examLevel !== 'final') {
                counterPatch.examAttempts = admin.firestore.FieldValue.increment(1);
            }
        }
        tx.set(dailyCounterRef, counterPatch, { merge: true });
        const result = {
            ok: true,
            stableUid,
            eventId: applied.eventId,
            type: applied.type,
            duplicate: false,
            xpDelta: applied.xpDelta,
            totalXp: applied.totalXp,
            level: applied.level,
            streakCount: applied.streakCount,
            activeDate: applied.activeDate,
            weekKey: applied.weekKey,
            weekXp: applied.weekXp,
        };
        tx.set(userRef, {
            progress: applied.progressPatch,
            firebaseAuthUid: authUid,
            progressServerAuthoritative: true,
            progressServerCutoverAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        tx.set(ledgerRef, {
            eventId: event.eventId,
            type: event.type,
            payload: event.payload,
            clientLocalDate: event.clientLocalDate ?? null,
            clientCreatedAt: event.clientCreatedAt ?? null,
            appVersion: event.appVersion ?? null,
            platform: event.platform ?? null,
            result,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return result;
    });
    if (shouldQualifyReferralFromProgressEvent(event)) {
        await (0, referral_1.markRefereeQualified)(db, stableUid).catch((e) => {
            console.warn('[progress_events] referral qualification failed', e);
        });
    }
    return result;
});
exports.progressMigrateSnapshot = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    const authUid = request.auth?.uid;
    if (!authUid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const snapshot = normalizePayload(request.data?.progress);
    const db = admin.firestore();
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid, request.data?.stableId, {
        requireKnownIdentity: true,
    });
    const userRef = db.collection('users').doc(stableUid);
    const migrationRef = userRef.collection('progress_migrations').doc('client_snapshot_v1');
    const now = new Date();
    return db.runTransaction(async (tx) => {
        const [userSnap, migrationSnap] = await Promise.all([tx.get(userRef), tx.get(migrationRef)]);
        if (migrationSnap.exists) {
            return { ok: true, stableUid, migrated: false, reason: 'already_migrated' };
        }
        const existing = getProgress(userSnap.data());
        const patch = buildMigrationPatch(snapshot, existing, now);
        tx.set(userRef, {
            progress: patch,
            firebaseAuthUid: authUid,
            progressServerAuthoritative: true,
            progressMigratedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        tx.set(migrationRef, {
            migrated: true,
            keys: Object.keys(patch).sort(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { ok: true, stableUid, migrated: true, keys: Object.keys(patch).sort() };
    });
});
//# sourceMappingURL=progress_events.js.map