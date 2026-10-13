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
exports.isoDateUtc = isoDateUtc;
exports.activeRunEndingAt = activeRunEndingAt;
exports.streakEvidencePlausibility = streakEvidencePlausibility;
exports.getWeekKey = getWeekKey;
exports.getWeekStartIso = getWeekStartIso;
exports.buildProgressBaseline = buildProgressBaseline;
exports.progressServerStateFromProgress = progressServerStateFromProgress;
exports.authoritativeProgressPatch = authoritativeProgressPatch;
exports.resolveClientDateKey = resolveClientDateKey;
exports.normalizeProgressEvent = normalizeProgressEvent;
exports.canonicalProgressEventSemantics = canonicalProgressEventSemantics;
exports.candidateHasSameProgressSemantics = candidateHasSameProgressSemantics;
exports.fingerprintProgressEvent = fingerprintProgressEvent;
exports.fingerprintProgressEventV2 = fingerprintProgressEventV2;
exports.isServerOwnedProgressKey = isServerOwnedProgressKey;
exports.shouldQualifyReferralFromProgressEvent = shouldQualifyReferralFromProgressEvent;
exports.applyProgressEvent = applyProgressEvent;
exports.buildMigrationPatch = buildMigrationPatch;
exports.getMigrationQuarantinedSensitiveKeys = getMigrationQuarantinedSensitiveKeys;
exports.buildMigrationProvenance = buildMigrationProvenance;
exports.parseAccountCreatedAtMs = parseAccountCreatedAtMs;
exports.planProgressMigration = planProgressMigration;
const admin = __importStar(require("firebase-admin"));
const crypto_1 = require("crypto");
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const content_lesson_stats_1 = require("./jarvis/content_lesson_stats");
const content_lesson_stats_write_1 = require("./jarvis/content_lesson_stats_write");
const learning_metrics_1 = require("./jarvis/learning_metrics");
exports.PROGRESS_EVENT_TYPES = [
    'lesson_answer',
    'lesson_complete',
    'dialog_complete',
    'exam_complete',
    'vocabulary_learned',
    'verb_learned',
    'preposition_drill_answer',
    'preposition_drill_perfect',
    'mistake_practice_answer',
    'diagnostic_test',
    'plan_task_complete',
    // зачем (§59 координатора, баг серии 01.10): раз в сутки телефон присылает свою серию и
    // список активных дней — сервер принимает только правдоподобное (applyClientStreakEvidence).
    'streak_sync',
];
const EVENT_TYPE_SET = new Set(exports.PROGRESS_EVENT_TYPES);
const EVENT_ID_RE = /^[a-z][a-z0-9_]{1,32}:[A-Za-z0-9_.:-]{1,140}$/;
const PLAN_COMPLETION_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const FINGERPRINT_EXCLUDED_PAYLOAD_KEYS = new Set([
    'localTotalBeforeServer',
    'multiplier',
    'baseAmount',
    'clientStreakCount',
    'clientLastActiveDate',
]);
const SERVER_OWNED_PROGRESS_KEYS = new Set([
    'week_points',
    'week_points_v2',
    'streak_count',
    'last_active_date',
    'streak_last_date',
    'unlocked_lessons',
]);
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
const STREAK_SYNC_MAX_ACTIVE_DAYS = 400;
function shiftDateKey(key, deltaDays) {
    const ms = dateKeyToUtcMs(key);
    return ms == null ? null : new Date(ms + deltaDays * DAY_MS).toISOString().slice(0, 10);
}
/** Сколько дней подряд из activeDays заканчиваются в endKey (включительно). */
function activeRunEndingAt(activeDays, endKey) {
    let count = 0;
    let cursor = endKey;
    while (cursor && activeDays.has(cursor)) {
        count += 1;
        cursor = shiftDateKey(cursor, -1);
    }
    return count;
}
function parseActiveDays(raw) {
    if (!Array.isArray(raw))
        return null;
    const days = new Set();
    for (const item of raw.slice(0, STREAK_SYNC_MAX_ACTIVE_DAYS)) {
        const key = cleanString(item, 10);
        if (dateKeyToUtcMs(key) != null)
            days.add(key);
    }
    return days;
}
/**
 * Правдоподобие серии телефона (§59) — только для streak_sync: не больше дней подряд в
 * присланном списке активных дней (журнал в UTC, дата серии локальная — сутки допуска) и не
 * больше дней с создания аккаунта; список обязателен. Прочие события — без проверок, как раньше.
 */
function streakEvidencePlausibility(input) {
    const { claimed, clientLast, activeDays, requireActiveDays, accountCreatedAtMs } = input;
    // зачем (координатор, после §60): старые клиенты (стор 1.6.24) шлют серию с уроком без
    // списка дней — для них НИКАКИХ новых проверок, ровно прежнее поведение; проверки
    // (дни подряд и возраст аккаунта) — только у streak_sync клиента 2.0.
    if (!requireActiveDays)
        return { accepted: true, reason: 'legacy_unchecked', claimed, cap: null };
    let cap = null;
    if (activeDays) {
        const prev = shiftDateKey(clientLast, -1);
        cap = Math.max(activeRunEndingAt(activeDays, clientLast), prev ? activeRunEndingAt(activeDays, prev) + 1 : 0);
        if (claimed > cap)
            return { accepted: false, reason: 'exceeds_active_run', claimed, cap };
    }
    else if (requireActiveDays) {
        return { accepted: false, reason: 'active_days_missing', claimed, cap: null };
    }
    const lastMs = dateKeyToUtcMs(clientLast);
    if (accountCreatedAtMs != null && accountCreatedAtMs > 0 && lastMs != null) {
        const createdDayMs = dateKeyToUtcMs(new Date(accountCreatedAtMs).toISOString().slice(0, 10)) ?? lastMs;
        // +1 сутки допуска на часовой пояс: локальная дата серии может опережать UTC.
        const ageCap = Math.floor((lastMs - createdDayMs) / DAY_MS) + 2;
        cap = cap == null ? ageCap : Math.min(cap, ageCap);
        if (claimed > ageCap)
            return { accepted: false, reason: 'exceeds_account_age', claimed, cap };
    }
    return { accepted: true, reason: 'plausible', claimed, cap };
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
function buildProgressBaseline(progress, rawShadow, now = new Date()) {
    const shadow = rawShadow && typeof rawShadow === 'object' && !Array.isArray(rawShadow)
        ? rawShadow
        : {};
    const progressLast = cleanString(progress.last_active_date ?? progress.streak_last_date, 10);
    const shadowLast = cleanString(shadow.lastActiveDate, 10);
    const progressStreak = Math.max(0, readInt(progress.streak_count, 0));
    const shadowStreak = Math.max(0, readInt(shadow.streakCount, 0));
    let lastActiveDate = progressLast;
    let streakCount = progressStreak;
    if (shadowLast && (!progressLast || shadowLast > progressLast)) {
        lastActiveDate = shadowLast;
        // зачем (владелец, 2026-08-28: «у меня 137 дней цепочка, а не 93»): теневое
        // состояние обновляют и пути, которые НЕ ведут стрик (награда за друга,
        // арена — они пишут progressServerState со свежей датой,
        // унося устаревший streakCount). Раньше его счётчик брался вслепую вместе с
        // датой, и честная цепочка обрезалась до отставшего снимка.
        //
        // Правило то же, что уже действует на клиенте (app/streak_safety.ts,
        // mergeStreakByActivityDate): при разрыве в один день свежая сторона —
        // продолжение ТОЙ ЖЕ цепочки, и меньшее значение означает потерю данных, а
        // не сгорание, поэтому берём максимум. При разрыве в два дня и больше
        // цепочка обязана быть сгоревшей — там побеждает счётчик свежей стороны,
        // иначе сгоревший стрик воскресал бы из устаревшего снимка.
        const gapDays = progressLast ? dayDiff(shadowLast, progressLast) : null;
        streakCount = gapDays != null && gapDays <= 1
            ? Math.max(progressStreak, shadowStreak)
            : shadowStreak;
    }
    else if (shadowLast && shadowLast === progressLast) {
        streakCount = Math.max(progressStreak, shadowStreak);
    }
    const baseline = {
        ...progress,
        streak_count: String(streakCount),
    };
    if (lastActiveDate) {
        baseline.last_active_date = lastActiveDate;
        baseline.streak_last_date = lastActiveDate;
    }
    void now;
    return baseline;
}
function progressServerStateFromProgress(progress, now) {
    void now;
    return {
        streakCount: Math.max(0, readInt(progress.streak_count, 0)),
        lastActiveDate: cleanString(progress.last_active_date ?? progress.streak_last_date, 10),
    };
}
function authoritativeProgressPatch(state) {
    const patch = {
        streak_count: String(state.streakCount),
    };
    if (state.lastActiveDate) {
        patch.last_active_date = state.lastActiveDate;
        patch.streak_last_date = state.lastActiveDate;
    }
    return patch;
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
/**
 * зачем (§126 п.9, 04.10): progressSubmitEvent отвечал 400 на 2–3 устройствах, а причину (код в сообщении
 * HttpsError) журнал функции не видел. Печатаем причину, тип и форму id; ответ клиенту прежний.
 */
function rejectProgressEvent(reason, detail) {
    console.warn('[PROGRESS-EVENT] rejected', JSON.stringify({ reason, ...detail }));
    throw new https_1.HttpsError('invalid-argument', reason);
}
function normalizeProgressEvent(raw) {
    const data = normalizePayload(raw);
    const eventId = cleanString(data.eventId, 180);
    if (!EVENT_ID_RE.test(eventId)) {
        rejectProgressEvent('bad_progress_event_id', {
            idLength: eventId.length, idHead: eventId.slice(0, 24), type: cleanString(data.type, 64),
        });
    }
    const typeRaw = cleanString(data.type, 64);
    if (!EVENT_TYPE_SET.has(typeRaw)) {
        rejectProgressEvent('bad_progress_event_type', { type: typeRaw, idHead: eventId.slice(0, 24) });
    }
    const payload = normalizePayload(data.payload);
    if (typeRaw === 'plan_task_complete') {
        const planInstanceId = payload.planInstanceId;
        const planTaskId = payload.planTaskId;
        if (typeof planInstanceId !== 'string'
            || planInstanceId !== planInstanceId.trim()
            || !PLAN_COMPLETION_ID_RE.test(planInstanceId)
            || typeof planTaskId !== 'string'
            || planTaskId !== planTaskId.trim()
            || !PLAN_COMPLETION_ID_RE.test(planTaskId)) {
            rejectProgressEvent('bad_plan_completion_identity', {
                planInstanceIdType: typeof planInstanceId, planTaskIdType: typeof planTaskId,
            });
        }
    }
    return {
        eventId,
        type: typeRaw,
        clientLocalDate: cleanString(data.clientLocalDate, 10) || undefined,
        clientCreatedAt: readInt(data.clientCreatedAt, 0) || undefined,
        appVersion: cleanString(data.appVersion, 32) || undefined,
        platform: cleanString(data.platform, 32) || undefined,
        payload,
    };
}
function canonicalizeForFingerprint(value) {
    if (value === null || value === undefined)
        return value;
    if (Array.isArray(value)) {
        return value.map((item) => canonicalizeForFingerprint(item));
    }
    if (typeof value === 'object') {
        const input = value;
        const entries = Object.keys(input).sort().map((key) => [key, canonicalizeForFingerprint(input[key])]);
        return Object.fromEntries(entries);
    }
    return value;
}
function sanitizeProgressEventPayloadForFingerprint(rawPayload) {
    if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
        return {};
    }
    const payload = rawPayload;
    const sanitized = {};
    for (const [key, value] of Object.entries(payload)) {
        if (FINGERPRINT_EXCLUDED_PAYLOAD_KEYS.has(key))
            continue;
        sanitized[key] = value;
    }
    return sanitized;
}
function fingerprintableProgressEventPayload(event) {
    return canonicalizeForFingerprint({
        type: event.type,
        clientLocalDate: event.clientLocalDate ?? '',
        payload: sanitizeProgressEventPayloadForFingerprint(event.payload),
    });
}
function canonicalProgressEventSemantics(event) {
    return JSON.stringify(fingerprintableProgressEventPayload(event));
}
function candidateHasSameProgressSemantics(event, candidate) {
    if (!candidate || !exports.PROGRESS_EVENT_TYPES.includes(candidate.type))
        return false;
    try {
        return canonicalProgressEventSemantics(event) === canonicalProgressEventSemantics({
            eventId: 'stored-candidate',
            type: candidate.type,
            clientLocalDate: typeof candidate.clientLocalDate === 'string' ? candidate.clientLocalDate : undefined,
            payload: candidate.payload && typeof candidate.payload === 'object' && !Array.isArray(candidate.payload)
                ? candidate.payload
                : {},
        });
    }
    catch (error) {
        console.warn('[PROGRESS-EVENT] candidate normalize failed', String(error?.message ?? error).slice(0, 120));
        return false;
    }
}
function fingerprintProgressEvent(event) {
    const serialized = canonicalProgressEventSemantics(event);
    let hash = 0x811c9dc5;
    for (let i = 0; i < serialized.length; i += 1) {
        hash ^= serialized.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
        hash >>>= 0;
    }
    return hash.toString(16).padStart(8, '0');
}
function fingerprintProgressEventV2(event) {
    return (0, crypto_1.createHash)('sha256').update(canonicalProgressEventSemantics(event)).digest('hex');
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
    if (/^(?:achievement|bonus_chest|wager)_.*(?:claimed|rewarded|at)$/.test(key))
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
    catch (error) {
        console.warn('[PROGRESS-EVENT] int list parse failed', String(error?.message ?? error).slice(0, 120));
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
    catch (error) {
        console.warn('[PROGRESS-EVENT] list count parse failed', String(error?.message ?? error).slice(0, 120));
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
function applyClientStreakEvidence(progress, patch, event, activeDate, accountCreatedAtMs, decisionOut) {
    const clientLast = cleanString(event.payload.clientLastActiveDate, 10);
    const clientStreak = clampInt(event.payload.clientStreakCount, 0, 100000);
    if (!clientLast || clientStreak <= 0)
        return progress;
    const diffToEventDate = dayDiff(activeDate, clientLast);
    if (diffToEventDate == null || diffToEventDate < 0 || diffToEventDate > 1) {
        return progress;
    }
    // зачем (§59): серию телефона нельзя накрутить — проверяем правдоподобие до сравнения.
    const decision = streakEvidencePlausibility({
        claimed: clientStreak,
        clientLast,
        activeDays: parseActiveDays(event.payload.activeDays),
        requireActiveDays: event.type === 'streak_sync',
        accountCreatedAtMs,
    });
    decisionOut.value = decision;
    if (!decision.accepted)
        return progress;
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
/**
 * @deprecated Реферальная квалификация больше НЕ завязана на урок 1 (с 2026-07-24
 * условие — покупка Plus/Pro приглашённым, см. referral.ts). Функция оставлена как
 * чистый предикат события «урок 1 пройден» для тестов/истории; в проде не вызывается.
 */
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
    const serverDate = isoDateUtc(now);
    const patch = {};
    // Persist only structural learning progress and the streak below.
    // Streak is learning progress and remains synchronized for real activity.
    const streakDecision = {};
    const progressWithClientStreak = applyClientStreakEvidence(progress, patch, event, activeDate, daily?.accountCreatedAtMs ?? null, streakDecision);
    const streakCount = applyDailyStreak(progressWithClientStreak, patch, activeDate);
    if (event.type === 'lesson_complete') {
        applyLessonFields(progress, patch, event);
    }
    else if (event.type === 'exam_complete') {
        applyExamFields(progress, patch, event, serverDate);
    }
    return {
        ok: true,
        eventId: event.eventId,
        type: event.type,
        streakCount,
        activeDate,
        progressPatch: patch,
        ...(streakDecision.value ? { streakEvidence: streakDecision.value } : {}),
    };
}
function buildMigrationPatch(snapshot, existing, now = new Date()) {
    const patch = {};
    Object.keys(snapshot).forEach((key) => {
        if (/^(?:lesson_progress_v2::fr::)?lesson\d+_cellIndex$/.test(key)) {
            const incoming = clampInt(snapshot[key], 0, 100_000);
            const current = Math.max(0, readInt(existing[key], 0));
            if (incoming > current)
                patch[key] = String(incoming);
        }
        else if (/^lesson\d+_progress$/.test(key) || /^lesson_progress_v2::fr::\d+$/.test(key)) {
            const incomingScore = progressArrayScore(snapshot[key]);
            const currentScore = progressArrayScore(existing[key]);
            if (incomingScore > currentScore && typeof snapshot[key] === 'string' && snapshot[key].length <= 20_000) {
                try {
                    const parsed = JSON.parse(snapshot[key]);
                    if (Array.isArray(parsed) && parsed.length <= 300)
                        patch[key] = JSON.stringify(parsed);
                }
                catch (error) {
                    // Ignore malformed structural progress — but say so (no silent catch).
                    console.warn('[PROGRESS-MIGRATE] malformed structural key skipped', JSON.stringify({ key, error: String(error?.message ?? error).slice(0, 80) }));
                }
            }
        }
    });
    void now;
    return patch;
}
function isSafeMigratableStructuralKey(key) {
    return /^(?:lesson_progress_v2::fr::)?lesson\d+_cellIndex$/.test(key)
        || /^lesson\d+_progress$/.test(key)
        || /^lesson_progress_v2::fr::\d+$/.test(key);
}
function getMigrationQuarantinedSensitiveKeys(snapshot) {
    return Object.keys(snapshot)
        .filter((key) => isServerOwnedProgressKey(key) && !isSafeMigratableStructuralKey(key))
        .sort();
}
function buildMigrationProvenance(snapshot, appVersion) {
    return {
        source: 'client_snapshot_v1',
        quarantinedSensitiveKeys: getMigrationQuarantinedSensitiveKeys(snapshot),
        appVersion: cleanString(appVersion, 32) || null,
    };
}
const DAILY_EVENT_LIMIT = 500;
/** users/{uid}.created_at: число мс, ISO-строка или Timestamp; иначе null (потолка нет). */
function parseAccountCreatedAtMs(raw) {
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0)
        return raw;
    if (typeof raw === 'string') {
        const asNum = Number(raw);
        if (Number.isFinite(asNum) && asNum > 0)
            return asNum;
        const parsed = Date.parse(raw);
        return Number.isFinite(parsed) ? parsed : null;
    }
    if (raw && typeof raw === 'object' && typeof raw.toMillis === 'function') {
        const ms = raw.toMillis();
        return Number.isFinite(ms) && ms > 0 ? ms : null;
    }
    return null;
}
exports.progressSubmitEvent = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    const authUid = request.auth?.uid;
    if (!authUid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const event = normalizeProgressEvent(request.data);
    const db = admin.firestore();
    // Отказ опознания рвал функцию БЕЗ ЕДИНОЙ ЗАПИСИ в логе.
    //
    // зачем (расследование 2026-09-02): у 43 из 46 недавно активных людей
    // серверный прогресс заморожен, последнее событие во всей базе — 19 августа,
    // и все события шлёт версия 1.5.x. Причину было не установить: логи молчали,
    // потому что исключение улетало отсюда наверх без обработки. Теперь КАЖДЫЙ
    // отказ называет себя, и по нему видно, чей телефон и на чём споткнулся.
    let stableUid;
    try {
        stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid, request.data?.stableId, {
            requireKnownIdentity: true,
            repairLinks: false,
        });
    }
    catch (error) {
        // guard-ok: молчаливый отказ приёма прогресса — потеря данных человека.
        console.warn(JSON.stringify({
            event: 'progress_submit_identity_rejected',
            authUid,
            requestedStableId: typeof request.data?.stableId === 'string' ? request.data.stableId : null,
            eventType: event.type,
            eventId: event.eventId,
            appVersion: typeof request.data?.appVersion === 'string' ? request.data.appVersion : null,
            platform: typeof request.data?.platform === 'string' ? request.data.platform : null,
            reason: error instanceof https_1.HttpsError ? `${error.code}:${error.message}` : String(error),
        }));
        throw error;
    }
    const userRef = db.collection('users').doc(stableUid);
    const ledgerRef = userRef.collection('progress_events').doc(safeDocId(event.eventId));
    const eventFingerprint = fingerprintProgressEvent(event);
    const eventFingerprintV2 = fingerprintProgressEventV2(event);
    const existingFingerprintRef = userRef.collection('progress_events')
        .where('fingerprint', '==', eventFingerprint)
        .limit(16);
    const existingFingerprintV2Ref = userRef.collection('progress_events')
        .where('fingerprintSha256', '==', eventFingerprintV2)
        .limit(1);
    const now = new Date();
    const todayKey = isoDateUtc(now);
    const dailyCounterRef = userRef.collection('progress_daily_counters').doc(todayKey);
    // зачем: департамент «Контент» Джарвиса (владелец 2026-08-02) — дешёвый
    // агрегат среднего балла по уроку. Пишется в той же транзакции обработки
    // события — одна дополнительная запись документа, без
    // отдельного чтения всей истории и без нового collectionGroup-скана.
    const recordLessonScore = (0, content_lesson_stats_write_1.shouldRecordLessonScore)(event);
    const lessonScoreSample = recordLessonScore ? (0, content_lesson_stats_write_1.extractLessonScoreSample)(event) : null;
    const lessonStatsRef = lessonScoreSample
        ? db.collection('lesson_stats').doc((0, content_lesson_stats_write_1.lessonStatsDocId)(lessonScoreSample.lessonId, lessonScoreSample.target))
        : null;
    const result = await db.runTransaction(async (tx) => {
        const [userSnap, ledgerSnap, counterSnap, lessonStatsSnap] = await Promise.all([
            tx.get(userRef),
            tx.get(ledgerRef),
            tx.get(dailyCounterRef),
            lessonStatsRef ? tx.get(lessonStatsRef) : Promise.resolve(null),
        ]);
        if (!userSnap.exists || userSnap.data()?.identityHidden === true) {
            throw new https_1.HttpsError('failed-precondition', 'user_progress_unavailable');
        }
        if (ledgerSnap.exists) {
            const result = ledgerSnap.data()?.result;
            if (result)
                return { ...result, duplicate: true };
            throw new https_1.HttpsError('aborted', 'progress_event_ledger_corrupt');
        }
        const [fingerprintV2Snap, fingerprintSnap] = await Promise.all([
            tx.get(existingFingerprintV2Ref),
            tx.get(existingFingerprintRef),
        ]);
        if (!fingerprintV2Snap.empty) {
            const result = fingerprintV2Snap.docs[0].data()?.result;
            if (result)
                return { ...result, duplicate: true };
            throw new https_1.HttpsError('aborted', 'progress_event_ledger_corrupt');
        }
        const semanticMatch = fingerprintSnap.docs.find((candidate) => candidateHasSameProgressSemantics(event, candidate.data()));
        if (semanticMatch) {
            const result = semanticMatch.data()?.result;
            if (result)
                return { ...result, duplicate: true };
            throw new https_1.HttpsError('aborted', 'progress_event_ledger_corrupt');
        }
        const counterData = counterSnap.data() ?? {};
        const dailyCount = counterData.count ?? 0;
        if (dailyCount >= DAILY_EVENT_LIMIT) {
            throw new https_1.HttpsError('resource-exhausted', 'daily_progress_event_limit_reached');
        }
        // Серверные суточные лимиты: читаем накопленные сегодня значения и затем
        // записываем обновлённые счётчики в той же транзакции (идемпотентно с ledger).
        const examAttemptsToday = counterData.examAttempts ?? 0;
        const rawProgress = getProgress(userSnap.data());
        const progress = buildProgressBaseline(rawProgress, userSnap.data()?.progressServerState, now);
        const applied = applyProgressEvent(progress, event, now, {
            examAttemptsToday,
            accountCreatedAtMs: parseAccountCreatedAtMs(userSnap.data()?.created_at),
        });
        if (applied.streakEvidence && !applied.streakEvidence.accepted) {
            // зачем (§59): отказ в серии телефона — оставляем серверную и называем причину.
            console.warn(JSON.stringify({
                event: 'progress_streak_evidence_rejected',
                stableUid,
                eventType: event.type,
                eventId: event.eventId,
                ...applied.streakEvidence,
            }));
        }
        const learningMetrics = await (0, learning_metrics_1.prepareLearningCompletionMetrics)({
            db,
            tx,
            stableUid,
            eventType: event.type,
            completionApplied: true,
            occurredAt: now,
            fields: {
                increment: (value) => admin.firestore.FieldValue.increment(value),
                serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
            },
        });
        (0, learning_metrics_1.commitPreparedLearningMetrics)(tx, learningMetrics);
        const mergedProgress = { ...progress, ...applied.progressPatch };
        const progressServerState = progressServerStateFromProgress(mergedProgress, now);
        const progressPatch = { ...applied.progressPatch, ...authoritativeProgressPatch(progressServerState) };
        const counterPatch = {
            count: dailyCount + 1,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        // Считаем только попытки уровневых зачётов (a1..c2) — финальный экзамен разовый и под лимит не идёт.
        if (event.type === 'exam_complete') {
            const examLevel = cleanString(event.payload.level ?? event.payload.examLevel, 12).toLowerCase();
            if (examLevel !== 'final') {
                counterPatch.examAttempts = admin.firestore.FieldValue.increment(1);
            }
        }
        tx.set(dailyCounterRef, counterPatch, { merge: true });
        if (lessonStatsRef && lessonScoreSample) {
            const previousStats = (lessonStatsSnap?.exists ? lessonStatsSnap.data()?.stats : null);
            const nextStats = (0, content_lesson_stats_1.applyLessonScoreSample)(previousStats, lessonScoreSample.score);
            tx.set(lessonStatsRef, {
                lessonId: lessonScoreSample.lessonId,
                target: lessonScoreSample.target,
                stats: nextStats,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        const result = {
            ok: true,
            stableUid,
            eventId: applied.eventId,
            type: applied.type,
            duplicate: false,
            streakCount: applied.streakCount,
            activeDate: applied.activeDate,
        };
        tx.set(userRef, {
            progress: progressPatch,
            progressServerState: {
                ...progressServerState,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            firebaseAuthUid: authUid,
            progressServerAuthoritative: true,
            progressServerCutoverAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        tx.set(ledgerRef, {
            eventId: event.eventId,
            type: event.type,
            payload: event.payload,
            fingerprint: eventFingerprint,
            fingerprintSha256: eventFingerprintV2,
            fingerprintCanonicalVersion: 1,
            fingerprintCanonical: canonicalProgressEventSemantics(event),
            clientLocalDate: event.clientLocalDate ?? null,
            clientCreatedAt: event.clientCreatedAt ?? null,
            appVersion: event.appVersion ?? null,
            platform: event.platform ?? null,
            result,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return result;
    });
    return result;
});
function planProgressMigration(input) {
    if (input.migrationExists)
        return { decision: 'already_migrated', userUpdate: null, marker: null, keys: [] };
    if (Object.keys(input.snapshot).length === 0)
        return { decision: 'empty_snapshot', userUpdate: null, marker: null, keys: [] };
    const patch = buildMigrationPatch(input.snapshot, input.existing, input.now);
    const keys = Object.keys(patch).sort();
    const userUpdate = {
        ...(keys.length > 0 ? { progress: patch } : {}),
        firebaseAuthUid: input.authUid,
        progressServerAuthoritative: true,
        progressMigratedAt: input.serverTimestamp(),
        updatedAt: input.serverTimestamp(),
    };
    return {
        decision: keys.length > 0 ? 'migrated' : 'nothing_to_migrate',
        userUpdate,
        marker: { migrated: true, keys, createdAt: input.serverTimestamp() },
        keys,
    };
}
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
        const existing = getProgress(userSnap.data());
        const plan = planProgressMigration({
            snapshot, existing, migrationExists: migrationSnap.exists, authUid, now,
            serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
        });
        // Лог решения без uid: размеры и ветка (правило владельца «логи на каждом решении»).
        console.log(`[PROGRESS-MIGRATE] decision=${plan.decision} snapshot_keys=${Object.keys(snapshot).length} `
            + `existing_keys=${Object.keys(existing).length} user_exists=${userSnap.exists} patch_keys=${plan.keys.length}`);
        if (plan.userUpdate === null) {
            return { ok: true, stableUid, migrated: false, reason: plan.decision };
        }
        tx.set(userRef, plan.userUpdate, { merge: true });
        tx.set(migrationRef, plan.marker);
        return { ok: true, stableUid, migrated: true, keys: [...plan.keys] };
    });
});
//# sourceMappingURL=progress_events.js.map