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
exports.compassGenerate = void 0;
/**
 * compassGenerate — тёплый комментарий дня Компаса (дешёвый ИИ-голос).
 *
 * Клон оркестрации explain_choice: cache-first → budget → lock → generate → judge →
 * cache. Кэш 1-на-продукт по подписи дня (тип+темы+уровень) → ≥90% показов из кэша,
 * 0 токенов. Модель — gpt-4.1-nano (admin-тюнинг + kill-switch через job 'compass').
 *
 * SECURITY (инвариант phraseman): identity из request.auth.uid (resolveStableUidForAuth,
 * два арг — не из body). App Check enforced. Кэш пишет только эта CF (Admin SDK).
 *
 * Фича отключаема целиком: клиент зовёт compassGenerate только при compass_ai_voice;
 * при kill-switch job 'compass' CF мгновенно отдаёт «выключено», клиент берёт текст
 * Библии. Удаление Компаса = убрать вызов; CF простаивает безвредно.
 */
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const premium_status_1 = require("./premium_status");
const remote_gates_1 = require("./remote_gates");
const openai_jobs_config_1 = require("./openai_jobs_config");
const explain_budget_1 = require("./explain/explain_budget");
const explain_prompts_1 = require("./explain/explain_prompts");
const explain_provider_1 = require("./explain/explain_provider");
const compass_prompts_1 = require("./compass/compass_prompts");
const compass_judge_1 = require("./compass/compass_judge");
const ai_language_contract_1 = require("./ai_language_contract");
const compass_cache_1 = require("./compass/compass_cache");
const OPENAI_API_KEY = (0, params_1.defineSecret)('OPENAI_API_KEY');
const REGION = 'us-central1';
const BILLING_COLLECTION = 'compass_billing';
const GEN_MAX_TOKENS = 120; // одна короткая фраза
const GEN_TEMPERATURE = 0.7;
function asText(value, max) {
    return String(value ?? '').trim().slice(0, max);
}
const ALLOWED_DAY_TYPES = new Set(['easy', 'deep_dive', 'repair', 'comeback']);
function empty(status, fromCache) {
    return { ok: true, comment: '', status, fromCache };
}
exports.compassGenerate = (0, https_1.onCall)({
    region: REGION,
    enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK_OPENAI,
    timeoutSeconds: 30,
    memory: '512MiB',
    maxInstances: 20,
    secrets: [OPENAI_API_KEY],
}, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const apiKey = asText(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY, 300);
    if (!apiKey)
        throw new https_1.HttpsError('failed-precondition', 'openai_key_missing');
    const data = (request.data ?? {});
    const dayType = asText(data.dayType, 20);
    if (!ALLOWED_DAY_TYPES.has(dayType))
        throw new https_1.HttpsError('invalid-argument', 'bad_day_type');
    const topics = Array.isArray(data.topics)
        ? data.topics.map((t) => asText(t, 40)).filter(Boolean).slice(0, 6)
        : [];
    const level = Math.max(0, Math.min(10, Math.floor(Number(data.level) || 0)));
    const lang = (0, ai_language_contract_1.resolveAiOutputLang)(asText(data.lang, 12) || 'ru', 'compass');
    const db = admin.firestore();
    // Глобальный рубильник ИИ (админ «Пульт»): серверный дубль клиентского гейта —
    // чтобы прямой вызов callable в обход UI не запускал ИИ. Клиент по этому коду
    // показывает забавную плашку.
    if (await (0, remote_gates_1.aiGloballyDisabled)(db))
        throw new https_1.HttpsError('failed-precondition', 'ai_globally_disabled');
    const jobCfg = await (0, openai_jobs_config_1.resolveJobConfig)(db, 'compass');
    const authUid = request.auth.uid;
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid);
    const langKey = (0, explain_prompts_1.resolvePromptLangKey)(lang);
    const signature = (0, compass_cache_1.compassSignature)({ dayType, topics, level });
    const hash = (0, compass_cache_1.compassHashFor)(signature, langKey);
    // 1) Кэш-first (≥90% путь, $0).
    const cached = await (0, compass_cache_1.readCachedCompass)(hash);
    if (cached?.status === 'ready' && cached.comment) {
        return { ok: true, comment: cached.comment, status: 'ok', fromCache: true };
    }
    if (cached?.status === 'rejected' && !(0, compass_cache_1.isRetryableRejected)(cached, Date.now())) {
        return empty('rejected', true);
    }
    // 2) Kill-switch.
    if (!jobCfg.enabled)
        return empty('exhausted', false);
    // 2.5) Платную генерацию запускает только premium — cache-hit выше остаётся
    // бесплатным для всех (premium-юзеры прогревают общий кэш). Free получает
    // graceful 'exhausted' — клиент просто не показывает комментарий.
    const isPremium = await (0, premium_status_1.resolvePremiumAccess)(db, stableUid);
    if (!isPremium)
        return empty('exhausted', false);
    // 3) Бюджет (промах кэша). Юзер → глобал.
    let budgetReservation = null;
    try {
        budgetReservation = await (0, explain_budget_1.reserveExplainBudget)(authUid, stableUid, jobCfg.globalDailyCap);
    }
    catch (err) {
        if (err instanceof https_1.HttpsError && err.code === 'resource-exhausted')
            return empty('exhausted', false);
        throw err;
    }
    // 4) Лок (анти-дубль).
    const claimed = await (0, compass_cache_1.claimCompassLock)(hash, Date.now());
    if (!claimed) {
        await (0, explain_budget_1.refundExplainBudgetReservation)(budgetReservation, 'lock_not_claimed');
        budgetReservation = null;
        return empty('pending', true);
    }
    // 5) Генерация одной фразы.
    let gen;
    try {
        gen = await (0, explain_provider_1.openAiChat)({
            apiKey,
            model: jobCfg.model,
            messages: [{ role: 'user', content: (0, compass_prompts_1.buildCompassPrompt)({ dayType, topics, lang }) }],
            maxTokens: GEN_MAX_TOKENS,
            temperature: GEN_TEMPERATURE,
        });
    }
    catch (err) {
        await (0, explain_budget_1.refundExplainBudgetReservation)(budgetReservation, 'provider_failed');
        budgetReservation = null;
        throw err;
    }
    const comment = gen.text.trim();
    // 6) Лёгкая проверка (язык/связность/безопасность). Fail-closed.
    // ВАЖНО: судья Компаса, НЕ фразовый judgeExplanation — тот бракует день-комментарий как
    // off_topic («не про английскую фразу»), из-за чего раньше реджектился весь кэш.
    const verdict = comment
        ? await (0, compass_judge_1.judgeCompassComment)({ text: comment, langKey, apiKey })
        : { ok: false, reason: 'empty', promptTokens: 0, completionTokens: 0 };
    if (verdict.ok) {
        await (0, compass_cache_1.writeReadyCompass)(hash, comment, { lang, model: jobCfg.model });
    }
    else {
        await (0, compass_cache_1.writeRejectedCompass)(hash, verdict.reason);
    }
    // 7) Биллинг.
    await db.collection(BILLING_COLLECTION).doc().set({
        uid: stableUid,
        authUid,
        hash,
        lang,
        model: jobCfg.model,
        genPromptTokens: gen.promptTokens,
        genCompletionTokens: gen.completionTokens,
        judgePromptTokens: verdict.promptTokens,
        judgeCompletionTokens: verdict.completionTokens,
        verdict: verdict.reason,
        published: verdict.ok,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAtMs: Date.now(),
    });
    return verdict.ok
        ? { ok: true, comment, status: 'ok', fromCache: false }
        : empty('rejected', false);
});
//# sourceMappingURL=compass.js.map