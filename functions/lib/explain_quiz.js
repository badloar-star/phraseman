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
exports.explainQuiz = void 0;
/**
 * explainQuiz — AI "разбор" for a THEMATIC-QUIZ answer (Кухня/Дом/… — isolated to thematic
 * quizzes only; easy/medium/hard difficulty quizzes keep their hand-authored static разборы).
 *
 * One BATCHED generation per (correct phrase, option-set, language): a warm разбор for the correct
 * option + a short "почему этот не тот" line for EACH wrong option. Sibling of explainChoice — it
 * reuses the SAME budget / judge / OpenAI infra but owns a separate cache collection
 * (quiz_explanations) and its own kill-switch job ('quiz').
 *
 * Cache-warm: the client fires this once right after the user answers (fire-and-forget). The first
 * call generates the whole batch; every later reader who taps any option reads it free ($0). Option
 * ORDER never forks the cache (hash uses the sorted option set; texts keyed by exact option string).
 *
 * SECURITY (phraseman invariant): identity comes from request.auth.uid via resolveStableUidForAuth
 * (TWO args — never request.data). App Check enforced. Only this CF (Admin SDK) writes the cache.
 */
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const premium_status_1 = require("./premium_status");
const quiz_explain_cache_1 = require("./explain/quiz_explain_cache");
const explain_budget_1 = require("./explain/explain_budget");
const openai_jobs_config_1 = require("./openai_jobs_config");
const quiz_explain_gates_1 = require("./explain/quiz_explain_gates");
const quiz_explain_prompts_1 = require("./explain/quiz_explain_prompts");
const explain_prompts_1 = require("./explain/explain_prompts");
const explain_provider_1 = require("./explain/explain_provider");
const explain_judge_1 = require("./explain/explain_judge");
const ai_language_contract_1 = require("./ai_language_contract");
const OPENAI_API_KEY = (0, params_1.defineSecret)('OPENAI_API_KEY');
const REGION = 'us-central1';
const BILLING_COLLECTION = 'quiz_explain_billing';
// Дневной кап разборов для free — считает И кэш-хиты (гейт по ценности, решение
// владельца 2026-07-02), проверяется ДО чтения кэша. Premium — без капа.
const FREE_DAILY_CAP = 3;
const GEN_MAX_TOKENS = 700; // confirm + up to 6 short option lines as JSON
const GEN_TEMPERATURE = 0.7;
function asText(value, max) {
    return String(value ?? '').trim().slice(0, max);
}
function emptyBatch(status, fromCache) {
    return { ok: true, confirm: '', options: {}, status, fromCache };
}
exports.explainQuiz = (0, https_1.onCall)({
    region: REGION,
    enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK_OPENAI,
    timeoutSeconds: 30,
    memory: '512MiB',
    maxInstances: 20,
    secrets: [OPENAI_API_KEY],
}, async (request) => {
    // 1. Auth gate — identity NEVER from body.
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const apiKey = asText(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY, 300);
    if (!apiKey)
        throw new https_1.HttpsError('failed-precondition', 'openai_key_missing');
    const data = (request.data ?? {});
    const correctEn = asText(data.correctEn, 1000);
    const questionPrompt = asText(data.questionPrompt, 2000);
    const rawWrongOptions = Array.isArray(data.wrongOptions) ? data.wrongOptions : [];
    const lang = (0, ai_language_contract_1.resolveAiOutputLang)(asText(data.lang, 12) || 'ru', 'quiz');
    const db = admin.firestore();
    const jobCfg = await (0, openai_jobs_config_1.resolveJobConfig)(db, 'quiz');
    const authUid = request.auth.uid;
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid);
    // 2. Deterministic input gate — also returns the cleaned/capped wrong-option list.
    const input = (0, quiz_explain_gates_1.validateQuizInput)({ correctEn, questionPrompt, wrongOptions: rawWrongOptions, lang });
    if (!input.ok || !input.wrongOptions) {
        throw new https_1.HttpsError('invalid-argument', input.reason ?? 'invalid_input');
    }
    const wrongOptions = input.wrongOptions;
    // Free-гейт ДО кэша: у free — FREE_DAILY_CAP разборов в день, кэш-хиты тоже
    // считаются (это гейт ценности фичи, а не только защита кошелька OpenAI).
    const isPremium = await (0, premium_status_1.resolvePremiumAccess)(db, stableUid);
    if (!isPremium) {
        try {
            await (0, explain_budget_1.enforceFreeJobGenLimit)('quiz', authUid, stableUid, FREE_DAILY_CAP);
        }
        catch (err) {
            if (err instanceof https_1.HttpsError && err.code === 'resource-exhausted') {
                return emptyBatch('exhausted', false);
            }
            throw err;
        }
    }
    // Cache key = (correct phrase, sorted FULL option-set, CANONICAL language).
    const langKey = (0, explain_prompts_1.resolvePromptLangKey)(lang);
    const quizHash = (0, quiz_explain_cache_1.quizHashFor)(correctEn, [correctEn, ...wrongOptions], langKey);
    // 3. Read the global cache FIRST. A hit is the ≥99% path and costs $0.
    const cached = await (0, quiz_explain_cache_1.readCachedQuizExplanation)(quizHash);
    if (cached?.status === 'ready' && cached.confirm) {
        return {
            ok: true,
            confirm: cached.confirm,
            options: cached.options ?? {},
            status: 'ok',
            fromCache: true,
        };
    }
    if (cached?.status === 'rejected' && !(0, quiz_explain_cache_1.isRetryableRejectedQuiz)(cached, Date.now())) {
        return emptyBatch('rejected', true);
    }
    // Kill-switch: quiz выключен админом → не жжём OpenAI.
    if (!jobCfg.enabled)
        return emptyBatch('exhausted', false);
    // 4. Cost guards (cache MISS only). Shares the explain budget collections.
    // Free-кап уже списан выше (до кэша) — здесь только общие счётчики.
    let budgetReservation = null;
    try {
        budgetReservation = await (0, explain_budget_1.reserveExplainBudget)(authUid, stableUid, jobCfg.globalDailyCap);
    }
    catch (err) {
        if (err instanceof https_1.HttpsError && err.code === 'resource-exhausted') {
            return emptyBatch('exhausted', false);
        }
        throw err;
    }
    // 5. Claim the generation lock (anti-duplicate).
    const claimed = await (0, quiz_explain_cache_1.claimQuizPendingLock)(quizHash, Date.now());
    if (!claimed) {
        await (0, explain_budget_1.refundExplainBudgetReservation)(budgetReservation, 'lock_not_claimed');
        budgetReservation = null;
        return emptyBatch('pending', true);
    }
    // 6. Generate the whole batch as STRICT JSON.
    let gen;
    try {
        gen = await (0, explain_provider_1.openAiChat)({
            apiKey,
            model: jobCfg.model,
            messages: [{ role: 'user', content: (0, quiz_explain_prompts_1.buildQuizPrompt)(correctEn, questionPrompt, wrongOptions, lang) }],
            maxTokens: GEN_MAX_TOKENS,
            temperature: GEN_TEMPERATURE,
            responseFormat: { type: 'json_object' },
        });
    }
    catch (err) {
        await (0, explain_budget_1.refundExplainBudgetReservation)(budgetReservation, 'provider_failed');
        budgetReservation = null;
        throw err;
    }
    const parsed = (0, quiz_explain_gates_1.parseQuizBatch)(gen.text, wrongOptions);
    // 7. Judge the assembled batch text (language / coherence / safety). Fail-closed.
    const judgeText = (0, quiz_explain_prompts_1.quizBatchToJudgeText)(parsed.confirm, parsed.options);
    const verdict = parsed.ok && judgeText
        ? await (0, explain_judge_1.judgeExplanation)({ text: judgeText, phraseEn: correctEn, lang, apiKey })
        : { ok: false, reason: 'incoherent', promptTokens: 0, completionTokens: 0 };
    // 8. Verdict gates the SHARED CACHE. Live caller still receives whatever was generated.
    if (verdict.ok) {
        try {
            await (0, quiz_explain_cache_1.writeReadyQuizExplanation)(quizHash, { confirm: parsed.confirm, options: parsed.options }, { lang, correctEn, questionPrompt, model: jobCfg.model });
        }
        catch (writeErr) {
            console.error('explainQuiz writeReady failed, retrying once', quizHash, writeErr);
            await (0, quiz_explain_cache_1.writeReadyQuizExplanation)(quizHash, { confirm: parsed.confirm, options: parsed.options }, { lang, correctEn, questionPrompt, model: jobCfg.model });
        }
    }
    else {
        await (0, quiz_explain_cache_1.writeRejectedQuizExplanation)(quizHash, verdict.reason);
    }
    // 9. Billing doc on EVERY miss.
    await db.collection(BILLING_COLLECTION).doc().set({
        uid: stableUid,
        authUid,
        quizHash,
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
    if (!verdict.ok)
        return emptyBatch('rejected', false);
    return {
        ok: true,
        confirm: parsed.confirm,
        options: parsed.options,
        status: 'ok',
        fromCache: false,
    };
});
//# sourceMappingURL=explain_quiz.js.map