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
exports.adminDeleteShardSurvey = exports.adminWriteShardSurvey = exports.submitShardSurvey = exports.getActiveShardSurvey = void 0;
// ════════════════════════════════════════════════════════════════════════════
// shard_survey.ts — опросы за осколки: submit / getActive / admin-write.
//
// Callable-обёртки поверх чистого ядра shard_survey_core.ts. Транзакции и
// firebase-admin только здесь. Модель повторяет vip_survey.ts (валидация +
// runTransaction + отдельная коллекция ответов) и daily_tasks_shards.ts
// (серверная выдача осколков полем `shards` в users/{uid} через Admin SDK,
// идемпотентность через reward_claims).
// ════════════════════════════════════════════════════════════════════════════
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const shard_survey_core_1 = require("./shard_survey_core");
const USERS = 'users';
const SURVEYS = 'shard_surveys';
const RESPONSES = 'shard_survey_responses';
const STATS = 'shard_survey_stats';
const REWARD_CLAIMS_COLLECTION = 'reward_claims';
const RATE_COLLECTION = 'shard_survey_rate_limits';
const DAY_MS = 24 * 60 * 60 * 1000;
// Анти-спам: не больше N сабмитов опросов в сутки на пользователя (спека §2.2).
// Легальный поток — единицы опросов в день; 20 покрывает ретраи с запасом.
const SUBMIT_MAX_PER_DAY = 20;
function text(value, max) {
    return String(value ?? '').trim().slice(0, max);
}
function readShardBalance(value) {
    const n = Math.trunc(Number(value));
    return Number.isFinite(n) && n >= 0 ? n : 0;
}
function responseDocId(surveyId, stableUid) {
    return `${surveyId}__${stableUid}`;
}
/** free/premium из progress — та же логика доступа, что vip_survey использует для гейта. */
function isPremiumFromProgress(progress, nowMs) {
    const plan = text(progress.premium_plan, 40).toLowerCase();
    const override = text(progress.admin_premium_override, 20).toLowerCase();
    const expiryMs = Math.trunc(Number(progress.premium_expiry ?? 0)) || 0;
    const active = text(progress.premium_active, 20).toLowerCase();
    const storePlan = plan === 'monthly' || plan === 'yearly' || plan === 'annual';
    const openOrFuture = expiryMs <= 0 || expiryMs > nowMs;
    if (override === 'false' && !storePlan)
        return false;
    if (override === 'true')
        return openOrFuture;
    if (plan === 'admin_grant')
        return openOrFuture;
    return (storePlan || active === 'true') && openOrFuture;
}
function lessonsCompletedFromProgress(progress) {
    const direct = Math.trunc(Number(progress.lessons_completed ?? 0));
    if (Number.isFinite(direct) && direct > 0)
        return direct;
    const completed = progress.completed_lessons;
    if (Array.isArray(completed))
        return completed.length;
    if (completed && typeof completed === 'object')
        return Object.keys(completed).length;
    return 0;
}
async function loadSurveyConfig(db, surveyId) {
    const snap = await db.collection(SURVEYS).doc(surveyId).get();
    if (!snap.exists)
        return null;
    return (0, shard_survey_core_1.parseSurveyConfig)(snap.data());
}
// ────────────────────────────────────────────────────────────────────────────
// getActiveShardSurvey — вернуть первый подходящий активный опрос для юзера.
// ────────────────────────────────────────────────────────────────────────────
exports.getActiveShardSurvey = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, request.auth.uid, request.data?.stableId);
    const platform = text(request.data?.platform, 32) || 'unknown';
    const nowMs = Date.now();
    const [surveysSnap, userSnap] = await Promise.all([
        db.collection(SURVEYS).where('enabled', '==', true).get(),
        db.collection(USERS).doc(stableUid).get(),
    ]);
    const progress = (userSnap.data()?.progress ?? {});
    const ctx = {
        isPremium: isPremiumFromProgress(progress, nowMs),
        lessonsCompleted: lessonsCompletedFromProgress(progress),
        platform,
    };
    const lastSurveyAtMs = Math.trunc(Number(progress.shard_survey_last_at_ms ?? 0)) || 0;
    // Собираем валидные активные конфиги, сортируем по updatedAtMs (свежие раньше).
    // Сначала отсеиваем в памяти (аудитория + cooldown) — без I/O, затем берём топ-N
    // кандидатов и ОДНИМ батч-чтением (getAll) проверяем «уже пройден?», а не N
    // последовательных get() в цикле (аудит 2026-07-05: избегаем O(N) чтений).
    const MAX_CANDIDATES = 10;
    const candidates = surveysSnap.docs
        .map((d) => (0, shard_survey_core_1.parseSurveyConfig)(d.data()))
        .filter((c) => c != null && c.enabled)
        .filter((c) => (0, shard_survey_core_1.matchesAudience)(c.audience, ctx))
        .filter((c) => (0, shard_survey_core_1.passesCooldown)(lastSurveyAtMs, c.minDaysBetweenSurveys, nowMs))
        .sort((a, b) => b.updatedAtMs - a.updatedAtMs)
        .slice(0, MAX_CANDIDATES);
    if (candidates.length > 0) {
        const refs = candidates.map((c) => db.collection(RESPONSES).doc(responseDocId(c.surveyId, stableUid)));
        const snaps = await db.getAll(...refs);
        const answered = new Set(snaps.filter((s) => s.exists).map((s) => s.id));
        const config = candidates.find((c) => !answered.has(responseDocId(c.surveyId, stableUid)));
        if (config) {
            const lang = text(request.data?.lang, 10) || 'ru';
            return {
                survey: {
                    surveyId: config.surveyId,
                    title: (0, shard_survey_core_1.resolveLocalized)(config.title, lang),
                    subtitle: (0, shard_survey_core_1.resolveLocalized)(config.subtitle, lang),
                    rewardShards: config.rewardShards,
                    accentColor: config.accentColor,
                    finalTitle: (0, shard_survey_core_1.resolveLocalized)(config.finalScreen.title, lang),
                    finalSubtitle: (0, shard_survey_core_1.resolveLocalized)(config.finalScreen.subtitle, lang),
                    questions: config.questions.map((q) => ({
                        id: q.id,
                        type: q.type,
                        text: (0, shard_survey_core_1.resolveLocalized)(q.text, lang),
                        options: q.options.map((o) => ({ id: o.id, label: (0, shard_survey_core_1.resolveLocalized)(o.label, lang) })),
                    })),
                },
            };
        }
    }
    return { survey: null };
});
// ────────────────────────────────────────────────────────────────────────────
// submitShardSurvey — принять ответы, начислить осколки один раз.
// ────────────────────────────────────────────────────────────────────────────
exports.submitShardSurvey = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, request.auth.uid, request.data?.stableId);
    const surveyId = text(request.data?.surveyId, 80);
    const config = await loadSurveyConfig(db, surveyId);
    if (!config || !config.enabled)
        throw new https_1.HttpsError('invalid-argument', 'unknown_survey');
    const validated = (0, shard_survey_core_1.validateAnswers)(config.questions, request.data?.answers);
    if (!validated.ok)
        throw new https_1.HttpsError('invalid-argument', validated.error);
    const platform = text(request.data?.platform, 32) || 'unknown';
    const appVersion = text(request.data?.appVersion, 40) || 'unknown';
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const responseRef = db.collection(RESPONSES).doc(responseDocId(surveyId, stableUid));
    const userRef = db.collection(USERS).doc(stableUid);
    const claimRef = userRef.collection(REWARD_CLAIMS_COLLECTION).doc(`survey_${surveyId}`);
    const statsRef = db.collection(STATS).doc(surveyId);
    const rateRef = db.collection(RATE_COLLECTION).doc(stableUid);
    const result = await db.runTransaction(async (tx) => {
        const [responseSnap, userSnap, claimSnap, statsSnap, rateSnap] = await Promise.all([
            tx.get(responseRef),
            tx.get(userRef),
            tx.get(claimRef),
            tx.get(statsRef),
            tx.get(rateRef),
        ]);
        // Rate-limit: не больше SUBMIT_MAX_PER_DAY сабмитов в сутки на пользователя.
        const rateDecision = (0, shard_survey_core_1.evaluateSubmitRateLimit)(rateSnap.data(), SUBMIT_MAX_PER_DAY, DAY_MS, nowMs);
        if (rateDecision.limited) {
            throw new https_1.HttpsError('resource-exhausted', 'rate_limited');
        }
        tx.set(rateRef, {
            uid: stableUid,
            windowStartMs: rateDecision.nextWindowStartMs,
            count: rateDecision.nextCount,
            updatedAtMs: nowMs,
        }, { merge: true });
        const responseBase = {
            surveyId,
            uid: stableUid,
            authUid: request.auth.uid,
            answers: validated.answers,
            answerQuestionIds: config.questions.map((q) => q.id),
            platform,
            appVersion,
            rewardShards: config.rewardShards,
        };
        // Уже награждён → ответы можно пересохранить, осколки НЕ повторяем.
        if (claimSnap.exists) {
            tx.set(responseRef, {
                ...responseBase,
                rewardGranted: true,
                resubmittedAt: nowIso,
                resubmittedAtMs: nowMs,
            }, { merge: true });
            const balance = readShardBalance(userSnap.data()?.shards);
            return { ok: true, alreadyGranted: true, reward: 0, balanceAfter: balance, shardsUpdatedAtMs: null };
        }
        const currentBalance = readShardBalance(userSnap.data()?.shards);
        const reward = config.rewardShards;
        const newBalance = currentBalance + reward;
        const shardsUpdatedAtMs = nowMs;
        // Маркер идемпотентности (как daily_tasks_shards).
        tx.set(claimRef, {
            source: 'survey_completed',
            surveyId,
            amount: reward,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Осколки + метка последнего опроса (для cooldown в getActive).
        tx.set(userRef, {
            shards: newBalance,
            shards_updated_at_ms: shardsUpdatedAtMs,
            shards_updated_op: 'earn',
            shards_updated_reason: 'survey_completed',
            progress: { shard_survey_last_at_ms: nowMs },
        }, { merge: true });
        tx.set(responseRef, {
            ...responseBase,
            submittedAt: nowIso,
            submittedAtMs: nowMs,
            rewardGranted: true,
        }, { merge: true });
        // Агрегат для сводки в админке.
        const nextStats = (0, shard_survey_core_1.incrementStats)(statsSnap.data(), validated.answers, nowMs);
        tx.set(statsRef, { surveyId, ...nextStats }, { merge: true });
        return { ok: true, alreadyGranted: false, reward, balanceAfter: newBalance, shardsUpdatedAtMs };
    });
    return result;
});
// ────────────────────────────────────────────────────────────────────────────
// adminWriteShardSurvey — создать/обновить конфиг опроса из админки.
// Доступ: request.auth.token.admin === true (custom claim, как прочие
// admin-callable проекта — см. admin_grant.ts, help_board.ts).
// ────────────────────────────────────────────────────────────────────────────
exports.adminWriteShardSurvey = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    const authUid = request.auth?.uid;
    if (!authUid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    if (request.auth?.token?.admin !== true) {
        throw new https_1.HttpsError('permission-denied', 'admin_required');
    }
    const db = admin.firestore();
    const errors = (0, shard_survey_core_1.validateSurveyConfigForWrite)(request.data?.survey);
    if (errors.length > 0) {
        throw new https_1.HttpsError('invalid-argument', `invalid_config:${errors.join(',')}`);
    }
    // Прогоняем через parseSurveyConfig для нормализации формы хранения.
    const parsed = (0, shard_survey_core_1.parseSurveyConfig)(request.data?.survey);
    if (!parsed)
        throw new https_1.HttpsError('invalid-argument', 'invalid_config:parse_failed');
    const nowMs = Date.now();
    const ref = db.collection(SURVEYS).doc(parsed.surveyId);
    const existing = await ref.get();
    const createdAtMs = existing.exists
        ? Math.trunc(Number(existing.data()?.createdAtMs ?? 0)) || nowMs
        : nowMs;
    await ref.set({
        surveyId: parsed.surveyId,
        enabled: parsed.enabled,
        title: parsed.title,
        subtitle: parsed.subtitle,
        rewardShards: parsed.rewardShards,
        minDaysBetweenSurveys: parsed.minDaysBetweenSurveys,
        audience: parsed.audience,
        questions: parsed.questions,
        accentColor: parsed.accentColor,
        finalScreen: parsed.finalScreen,
        createdAtMs,
        updatedAtMs: nowMs,
        updatedBy: authUid,
    }, { merge: true });
    return { ok: true, surveyId: parsed.surveyId };
});
// ────────────────────────────────────────────────────────────────────────────
// adminDeleteShardSurvey — удалить конфиг опроса (из админ-экрана).
// Доступ: admin claim. Удаляет только конфиг; ответы/статы остаются (история).
// ────────────────────────────────────────────────────────────────────────────
exports.adminDeleteShardSurvey = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    const authUid = request.auth?.uid;
    if (!authUid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    if (request.auth?.token?.admin !== true) {
        throw new https_1.HttpsError('permission-denied', 'admin_required');
    }
    const surveyId = text(request.data?.surveyId, 80);
    if (!surveyId)
        throw new https_1.HttpsError('invalid-argument', 'survey_id_required');
    const db = admin.firestore();
    await db.collection(SURVEYS).doc(surveyId).delete();
    return { ok: true, surveyId };
});
//# sourceMappingURL=shard_survey.js.map