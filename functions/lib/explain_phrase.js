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
exports.explainPhrase = void 0;
exports.buildFallback = buildFallback;
/**
 * explainPhrase — "Explain like I'm five" Cloud Function.
 *
 * A thin orchestrator over the plan-01 core (cache, budget, gates) + the AI judge + the OpenAI
 * provider. Clones premium_dialog.ts for onCall options, App Check, identity, fetch→OpenAI and the
 * billing doc. The KEY difference from dialogs is order: read cache FIRST (a hit costs $0), and only
 * on a miss do limits → lock → generate → judge → write.
 *
 * SECURITY (phraseman invariant): identity comes from request.auth.uid via resolveStableUidForAuth
 * (TWO args — never request.data). App Check enforced. Only this CF (Admin SDK) writes the cache.
 *
 * NOT in deploy:safe whitelist on purpose — deploy point-to-point:
 *   firebase deploy --only functions:explainPhrase
 */
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const explain_cache_1 = require("./explain/explain_cache");
const explain_budget_1 = require("./explain/explain_budget");
const explain_gates_1 = require("./explain/explain_gates");
const explain_prompts_1 = require("./explain/explain_prompts");
const explain_provider_1 = require("./explain/explain_provider");
const explain_judge_1 = require("./explain/explain_judge");
const OPENAI_API_KEY = (0, params_1.defineSecret)('OPENAI_API_KEY');
const REGION = 'us-central1';
const BILLING_COLLECTION = 'explain_billing';
const MODEL_DEFAULT = 'gpt-4o-mini';
const GEN_MAX_TOKENS = 240;
const GEN_TEMPERATURE = 0.7;
function asText(value, max) {
    return String(value ?? '').trim().slice(0, max);
}
/**
 * Deterministic, AI-free fallback the CF returns when it will not (or cannot) generate: rejected
 * cache, exhausted budget, or a lost lock race. Built from phraseMeaning the client already sent —
 * never calls the model. The client never builds this (server is the source of truth).
 */
function buildFallback(phraseMeaning) {
    const meaning = asText(phraseMeaning, explain_gates_1.MAX_MEANING_LEN);
    if (!meaning)
        return 'Объяснение пока недоступно. Попробуйте позже.';
    const trimmed = meaning.replace(/[.!?]+$/u, '');
    return `${trimmed}. Например: так говорят в обычном разговоре.`;
}
exports.explainPhrase = (0, https_1.onCall)({
    region: REGION,
    enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK,
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
    const phraseEn = asText(data.phraseEn, 1000);
    const phraseMeaning = asText(data.phraseMeaning, 2000);
    const lang = asText(data.lang, 12) || 'ru';
    const db = admin.firestore();
    const authUid = request.auth.uid;
    // SECURITY: resolve the stable identity from auth ONLY. Two args — request.data is NOT passed.
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid);
    // 2. Deterministic input gate (level 1) — reject junk before any cache/AI work.
    const input = (0, explain_gates_1.validateExplainInput)({ phraseEn, phraseMeaning, lang });
    if (!input.ok)
        throw new https_1.HttpsError('invalid-argument', input.reason ?? 'invalid_input');
    const phraseHash = (0, explain_cache_1.phraseHashFor)(phraseEn);
    // 3. Read the global cache FIRST. A hit is the ≥99% path and costs $0.
    const cached = await (0, explain_cache_1.readCachedExplanation)(phraseHash);
    if (cached?.status === 'ready' && cached.text) {
        return { ok: true, text: cached.text, status: 'ok', fromCache: true };
    }
    if (cached?.status === 'rejected') {
        // Known-bad phrase: serve fallback, never auto-regenerate (prevents mass-report regen abuse).
        return { ok: true, text: buildFallback(phraseMeaning), status: 'rejected', fromCache: true };
    }
    // 4. Cost guards (cache MISS only). Per-user FIRST, then the global breaker. If EITHER is
    //    exhausted, degrade gracefully to the fallback — do NOT 500 the user.
    try {
        await (0, explain_budget_1.enforceUserGenLimit)(authUid, stableUid);
        await (0, explain_budget_1.enforceGlobalBudget)();
    }
    catch (err) {
        if (err instanceof https_1.HttpsError && err.code === 'resource-exhausted') {
            return { ok: true, text: buildFallback(phraseMeaning), status: 'exhausted', fromCache: false };
        }
        throw err;
    }
    // 5. Claim the generation lock. If another request is actively generating this phrase, serve the
    //    fallback now (status:pending) rather than generating a duplicate.
    const claimed = await (0, explain_cache_1.claimPendingLock)(phraseHash, Date.now());
    if (!claimed) {
        return { ok: true, text: buildFallback(phraseMeaning), status: 'pending', fromCache: true };
    }
    // 6. Generate the full explanation (v1: no streaming — see CONTEXT "Streaming: explicit status").
    const gen = await (0, explain_provider_1.openAiChat)({
        apiKey,
        model: MODEL_DEFAULT,
        messages: [{ role: 'user', content: (0, explain_prompts_1.buildExplainPrompt)(phraseEn, phraseMeaning, lang) }],
        maxTokens: GEN_MAX_TOKENS,
        temperature: GEN_TEMPERATURE,
    });
    // 7. Sanitize (level 2) → AI judge (level 3, a SEPARATE cheap call, fail-closed).
    const sanitized = (0, explain_gates_1.sanitizeExplanationOutput)(gen.text);
    const verdict = await (0, explain_judge_1.judgeExplanation)({ text: sanitized, phraseEn, lang, apiKey });
    // 8. Verdict gates the SHARED CACHE only. The live (trigger) caller always receives the generated
    //    text regardless of verdict — we risk showing raw text to one user, never to all.
    if (verdict.ok) {
        await (0, explain_cache_1.writeReadyExplanation)(phraseHash, sanitized, { lang, phraseEn, model: MODEL_DEFAULT });
    }
    else {
        await (0, explain_cache_1.writeRejectedExplanation)(phraseHash, verdict.reason);
    }
    // 9. Billing doc on EVERY miss: gen + judge token usage, model, verdict, identity (stable uid).
    await db.collection(BILLING_COLLECTION).doc().set({
        uid: stableUid,
        authUid,
        phraseHash,
        lang,
        model: MODEL_DEFAULT,
        genPromptTokens: gen.promptTokens,
        genCompletionTokens: gen.completionTokens,
        judgePromptTokens: verdict.promptTokens,
        judgeCompletionTokens: verdict.completionTokens,
        verdict: verdict.reason,
        published: verdict.ok,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAtMs: Date.now(),
    });
    return {
        ok: true,
        text: sanitized,
        status: verdict.ok ? 'ok' : 'rejected',
        fromCache: false,
    };
});
//# sourceMappingURL=explain_phrase.js.map