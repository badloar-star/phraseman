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
exports.premiumDialogReview = void 0;
exports.parseReviewEnvelope = parseReviewEnvelope;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const openai_dialog_model_config_1 = require("./openai_dialog_model_config");
const premium_dialog_1 = require("./premium_dialog");
const ai_language_contract_1 = require("./ai_language_contract");
const OPENAI_API_KEY = (0, params_1.defineSecret)('OPENAI_API_KEY');
/**
 * premiumDialogReview — финальный «разбор полётов» завершённого ИИ-диалога.
 *
 * Замысел фичи (владелец): когда диалог окончен, ученик получает не только
 * игровой вердикт, но и мягкий, вежливый разбор ВСЕХ его языковых ошибок:
 * «ты сказал так → естественнее сказать так, потому что …» — на родном языке,
 * без грамматического жаргона, с похвалой за то, что получилось.
 *
 * Отдельный callable (а не поле в игровом конверте premiumDialogSend), потому что:
 *   • разбор нужен один раз за диалог — раздувать бюджет токенов КАЖДОГО хода нельзя;
 *   • терминальный ход заранее неизвестен;
 *   • разбор работает и для «нейтрального» финала (юзер сам нажал «Завершить»).
 *
 * НЕ в deploy:safe whitelist — деплой прицельно:
 *   firebase deploy --only functions:premiumDialogReview
 */
const REGION = 'us-central1';
const BILLING_COLLECTION = 'premium_dialog_billing';
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const MAX_REVIEW_TURNS = 40;
const MAX_TURN_CHARS = 600;
const MAX_REVIEW_OUTPUT_TOKENS = 900;
const MAX_CORRECTIONS = 8;
const LEARNER_LANG_NAME = {
    ru: 'Russian',
    uk: 'Ukrainian',
    es: 'Spanish',
    'pt-BR': 'Brazilian Portuguese',
    vi: 'Vietnamese',
    id: 'Indonesian',
    tr: 'Turkish',
    pl: 'Polish',
    en: 'English',
};
function text(value, max) {
    return String(value ?? '').trim().slice(0, max);
}
function asCefr(value) {
    const c = text(value, 2).toUpperCase();
    return ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(c) ? c : 'A2';
}
function sanitizeReviewHistory(value) {
    if (!Array.isArray(value))
        return [];
    const result = [];
    for (const raw of value.slice(-MAX_REVIEW_TURNS)) {
        const item = (raw ?? {});
        const role = text(item.role, 12);
        const content = text(item.content, MAX_TURN_CHARS);
        if ((role === 'user' || role === 'assistant') && content) {
            result.push({ role, content });
        }
    }
    return result;
}
/** [[...]]-маркеры ключевых фраз в транскрипте только мешают ревью — снимаем. */
function stripKeyPhraseMarkers(value) {
    return value.replace(/\[\[|\]\]/g, '');
}
function buildReviewSystemPrompt(cefr, learnerLangName, goalEn, studyTarget = 'en') {
    const goalLine = goalEn ? `\nThe scenario goal was: ${goalEn}.` : '';
    const targetName = (0, ai_language_contract_1.studyTargetName)(studyTarget);
    return `You are a warm, encouraging ${targetName} tutor inside the Phraseman language app. A learner has just finished a practice conversation with a role-play partner. Your job is a short, kind debrief of the learner's ${targetName}.${goalLine}
The learner's level is ${cefr}. The learner's native language is ${learnerLangName}.

Review ONLY the learner's lines. Respond with a single JSON object and nothing else:
{"praise": "...", "corrections": [{"original": "...", "corrected": "...", "note": "..."}], "tip": "..."}

Rules:
- "praise": 1-2 warm, specific sentences in ${learnerLangName} about what the learner genuinely did well (a phrase they used, politeness, persistence). Never invent things they did not say, never use empty flattery.
- "corrections": go through EVERY learner line. For each line with a language mistake add one item:
  - "original": the learner's line exactly as they wrote it (shorten to the broken part if the line is long);
  - "corrected": the natural ${targetName} a friendly native speaker would use for the same idea, kept at level ${cefr};
  - "note": ONE short, kind sentence in ${learnerLangName} explaining the fix in everyday words — no grammar jargon, no mockery, never shame the learner.
  Skip lines that are already fine. At most ${MAX_CORRECTIONS} items — if there are more mistakes, pick the most useful ones.
- "tip": one short, practical suggestion in ${learnerLangName} for the next conversation; quote any recommended ${targetName} phrase in ${targetName}.
- Comment ONLY on language. Never scold the learner for rudeness, topics, or how the scene went.
- If every learner line is fine, return "corrections": [] and make "praise" a bit warmer.`;
}
/**
 * Разбор JSON-ответа ревью. Бережный: снимает ```-ограждения, режет длины,
 * отбрасывает битые элементы. null — совсем не распарсилось.
 */
function parseReviewEnvelope(raw) {
    const unfenced = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    let parsed = null;
    try {
        parsed = JSON.parse(unfenced);
    }
    catch {
        return null;
    }
    if (!parsed || typeof parsed !== 'object')
        return null;
    const rawCorrections = Array.isArray(parsed.corrections) ? parsed.corrections : [];
    const corrections = [];
    for (const item of rawCorrections.slice(0, MAX_CORRECTIONS)) {
        const c = (item ?? {});
        const original = text(c.original, 300);
        const corrected = text(c.corrected, 300);
        if (!original || !corrected)
            continue;
        corrections.push({ original, corrected, note: text(c.note, 300) });
    }
    const praise = text(parsed.praise, 500);
    const tip = text(parsed.tip, 400);
    if (!praise && corrections.length === 0 && !tip)
        return null;
    return { praise, corrections, tip };
}
exports.premiumDialogReview = (0, https_1.onCall)({
    region: REGION,
    enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK_OPENAI,
    timeoutSeconds: 30,
    memory: '256MiB',
    maxInstances: 20,
    secrets: [OPENAI_API_KEY],
}, async (request) => {
    if (!request.auth?.uid) {
        console.warn('premium_dialog_review rejected', { reason: 'auth_required' });
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    }
    const data = (request.data ?? {});
    const history = sanitizeReviewHistory(data.history);
    const learnerTurns = history.filter((t) => t.role === 'user');
    if (learnerTurns.length === 0) {
        console.warn('premium_dialog_review rejected', { reason: 'history_required' });
        throw new https_1.HttpsError('invalid-argument', 'history_required');
    }
    const apiKey = text(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY, 300);
    if (!apiKey) {
        console.error('premium_dialog_review rejected', { reason: 'openai_key_missing' });
        throw new https_1.HttpsError('failed-precondition', 'openai_key_missing');
    }
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid);
    // Общий rate-limit с send/translate: разбор — один вызов на диалог, окна хватает.
    await (0, premium_dialog_1.enforceRateLimit)(authUid, stableUid);
    const cefr = asCefr(data.cefr);
    const interfaceLang = (0, premium_dialog_1.asInterfaceLang)(data.interfaceLang);
    const learnerLangName = LEARNER_LANG_NAME[interfaceLang] ?? LEARNER_LANG_NAME.ru;
    const goalEn = text(data.goalEn, 200);
    const studyTarget = (0, ai_language_contract_1.resolveStudyTarget)(data.studyTarget);
    const transcript = history
        .map((t) => `${t.role === 'user' ? 'Learner' : 'Partner'}: ${stripKeyPhraseMarkers(t.content)}`)
        .join('\n');
    const dialogModel = await (0, openai_dialog_model_config_1.resolveConfiguredDialogModel)(db, process.env.OPENAI_DIALOG_MODEL);
    const useJsonFormat = (0, openai_dialog_model_config_1.modelSupportsJsonObject)(dialogModel);
    let json;
    let review;
    try {
        const response = await fetch(OPENAI_CHAT_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: dialogModel,
                max_tokens: MAX_REVIEW_OUTPUT_TOKENS,
                // Разбор — аналитическая задача: низкая температура ради точности цитат.
                temperature: 0.3,
                messages: [
                    { role: 'system', content: buildReviewSystemPrompt(cefr, learnerLangName, goalEn, studyTarget) },
                    { role: 'user', content: transcript },
                ],
                ...(useJsonFormat ? { response_format: { type: 'json_object' } } : {}),
            }),
        });
        if (!response.ok) {
            const detail = await response.text().catch(() => '');
            console.error('premium_dialog_review chat failed', {
                status: response.status,
                model: dialogModel,
                scenarioId: text(data.scenarioId, 80) || null,
                detail: detail.slice(0, 500),
            });
            throw new https_1.HttpsError('unavailable', 'dialog_provider_failed');
        }
        json = (await response.json());
        review = parseReviewEnvelope(text(json.choices?.[0]?.message?.content, 6000));
        if (!review) {
            console.error('premium_dialog_review unparseable reply', {
                model: dialogModel,
                scenarioId: text(data.scenarioId, 80) || null,
            });
            throw new https_1.HttpsError('unavailable', 'dialog_provider_failed');
        }
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        console.error('premium_dialog_review provider exception', {
            model: dialogModel,
            scenarioId: text(data.scenarioId, 80) || null,
            error: String(error?.message ?? error).slice(0, 500),
        });
        throw new https_1.HttpsError('unavailable', 'dialog_provider_failed');
    }
    const usage = json.usage ?? {};
    await db.collection(BILLING_COLLECTION).doc().set({
        uid: stableUid,
        authUid,
        mode: 'review',
        model: dialogModel,
        cefr,
        scenarioId: text(data.scenarioId, 80) || null,
        promptTokens: Number(usage.prompt_tokens ?? 0),
        completionTokens: Number(usage.completion_tokens ?? 0),
        totalTokens: Number(usage.total_tokens ?? 0),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAtMs: Date.now(),
    }).catch(() => { });
    return { ok: true, ...review };
});
//# sourceMappingURL=premium_dialog_review.js.map