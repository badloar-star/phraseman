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
exports.__weeklyReviewTestHooks = exports.weeklyReviewGenerate = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const crypto_1 = require("crypto");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const premium_status_1 = require("./premium_status");
const openai_jobs_config_1 = require("./openai_jobs_config");
const ai_language_contract_1 = require("./ai_language_contract");
const OPENAI_API_KEY = (0, params_1.defineSecret)('OPENAI_API_KEY');
/**
 * AI mistake review — turns the learner's ALREADY-COMPUTED mistake analytics into
 * a warm, plain-language summary. The AI does NOT see the raw log and does NOT
 * pick lessons: the client sends a finished briefing (weak/strong categories,
 * recovered categories, weak lessons, top phrases, and a gate-filtered list of
 * available micro-lessons). The model only describes those numbers and may
 * recommend ONLY from the provided lesson list.
 *
 * Pattern follows premium_dialog.ts (key via secret/env, auth.uid as identity,
 * quota in a Firestore transaction BEFORE the paid API call).
 *
 * NOT in deploy:safe whitelist on purpose (spends OpenAI). Deploy point-to-point:
 *   firebase deploy --only functions:weeklyReviewGenerate
 */
const REGION = 'us-central1';
const RATE_COLLECTION = 'weekly_review_rate_limits';
const QUOTA_COLLECTION = 'weekly_review_quotas';
const BILLING_COLLECTION = 'weekly_review_billing';
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_HOUR = 10;
// One generation per day for everyone. Server is the
// source of truth — the client gate is bypassable.
const PREMIUM_WINDOW_DAYS = 1;
const FREE_WINDOW_DAYS = 1;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_OUTPUT_TOKENS = 700;
const MAX_PARAGRAPHS = 4;
const MAX_RECOMMENDATIONS = 4;
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL_DEFAULT = 'gpt-4o-mini';
const SUPPORTED_LANGS = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
// ── Helpers ──────────────────────────────────────────────────────────────────
function text(value, max) {
    return String(value ?? '').trim().slice(0, max);
}
function clampInt(value, min, max) {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n))
        return min;
    return Math.max(min, Math.min(max, n));
}
function asLang(value) {
    const v = text(value, 5);
    return SUPPORTED_LANGS.includes(v) ? v : 'ru';
}
function docId(prefix, authUid, stableUid) {
    const hash = (0, crypto_1.createHash)('sha256').update(`${prefix}|${authUid}|${stableUid}`).digest('hex').slice(0, 48);
    return `${prefix}_${hash}`;
}
function briefingHashForReplay(briefing) {
    return (0, crypto_1.createHash)('sha256').update(JSON.stringify(briefing)).digest('hex');
}
/**
 * Sanitizes the untrusted client briefing into a known-good shape. Crucially,
 * recommendation ids are kept verbatim (they're opaque ids the client already
 * gate-filtered), but everything is length-capped and array-bounded so a hostile
 * client cannot blow up the prompt.
 */
function sanitizeBriefing(raw) {
    const data = (raw ?? {});
    const arr = (v) => (Array.isArray(v) ? v : []);
    const weakCategories = arr(data.weakCategories).slice(0, 5).map((item) => {
        const c = (item ?? {});
        return {
            category: text(c.category, 40),
            label: text(c.label, 80),
            pct: clampInt(c.pct, 0, 100),
            priorityScore: clampInt(c.priorityScore, 0, 100),
            topWords: arr(c.topWords).slice(0, 5).map((w) => text(w, 40)).filter(Boolean),
        };
    }).filter((c) => c.category && c.label);
    const labelPairs = (v, max) => arr(v).slice(0, max).map((item) => {
        const c = (item ?? {});
        return { category: text(c.category, 40), label: text(c.label, 80) };
    }).filter((c) => c.category && c.label);
    const recoveredCategories = arr(data.recoveredCategories).slice(0, 3).map((item) => {
        const c = (item ?? {});
        return {
            category: text(c.category, 40),
            label: text(c.label, 80),
            recoveryScore: clampInt(c.recoveryScore, 0, 100),
        };
    }).filter((c) => c.category && c.label);
    const weakLessons = arr(data.weakLessons).slice(0, 3).map((item) => {
        const c = (item ?? {});
        return { lessonId: clampInt(c.lessonId, 0, 100000), title: text(c.title, 120), pct: clampInt(c.pct, 0, 100) };
    }).filter((l) => l.title);
    const topMistakePhrases = arr(data.topMistakePhrases).slice(0, 3).map((item) => {
        const c = (item ?? {});
        return { phrase: text(c.phrase, 200), count: clampInt(c.count, 0, 100000) };
    }).filter((p) => p.phrase);
    const recommendedLessons = arr(data.recommendedLessons).slice(0, MAX_RECOMMENDATIONS).map((item) => {
        const c = (item ?? {});
        return { microDiagnosisId: text(c.microDiagnosisId, 80), label: text(c.label, 120) };
    }).filter((r) => r.microDiagnosisId && r.label);
    const effortRaw = (data.effort ?? {});
    return {
        lang: asLang(data.lang),
        studyTarget: data.studyTarget === 'fr' ? 'fr' : 'en',
        windowDays: clampInt(data.windowDays, 1, 365),
        totalMistakes: clampInt(data.totalMistakes, 0, 1000000),
        weakCategories,
        strongCategories: labelPairs(data.strongCategories, 2),
        recoveredCategories,
        weakLessons,
        topMistakePhrases,
        recommendedLessons,
        effort: {
            currentStreak: clampInt(effortRaw.currentStreak, 0, 100000),
            longestStreak: clampInt(effortRaw.longestStreak, 0, 100000),
            weekXp: clampInt(effortRaw.weekXp, 0, 100000000),
            weekMinutes: clampInt(effortRaw.weekMinutes, 0, 1000000),
        },
    };
}
function startOfNextWindow(nowMs, windowDays) {
    return nowMs + windowDays * DAY_MS;
}
async function enforceRateLimit(authUid, stableUid) {
    const db = admin.firestore();
    const now = Date.now();
    const ref = db.collection(RATE_COLLECTION).doc(docId('wkr', authUid, stableUid));
    await db.runTransaction(async (tx) => {
        const data = (await tx.get(ref)).data() ?? {};
        const windowStartMs = Number(data.windowStartMs ?? 0);
        const count = Number(data.count ?? 0);
        const sameWindow = now - windowStartMs < WINDOW_MS;
        if (sameWindow && count >= MAX_PER_HOUR) {
            throw new https_1.HttpsError('resource-exhausted', 'weekly_review_rate_limited');
        }
        tx.set(ref, {
            authUid,
            stableUid,
            windowStartMs: sameWindow ? windowStartMs : now,
            count: sameWindow ? count + 1 : 1,
            updatedAtMs: now,
        }, { merge: true });
    });
}
function readStoredWeeklyReview(raw) {
    const data = (raw ?? {});
    const greeting = text(data.greeting, 200);
    const paragraphs = (Array.isArray(data.paragraphs) ? data.paragraphs : [])
        .slice(0, MAX_PARAGRAPHS)
        .map((p) => text(p, 800))
        .filter(Boolean);
    if (!greeting || paragraphs.length === 0)
        return null;
    const recommendations = (Array.isArray(data.recommendations) ? data.recommendations : [])
        .slice(0, MAX_RECOMMENDATIONS)
        .map((item) => {
        const c = (item ?? {});
        return { microDiagnosisId: text(c.microDiagnosisId, 80), label: text(c.label, 120) };
    })
        .filter((r) => r.microDiagnosisId && r.label);
    return { greeting, paragraphs, recommendations };
}
function decideWeeklyReviewReplay(quotaData, expectedBriefingHash, nowMs) {
    const nextAllowedAtMs = Number(quotaData.nextAllowedAtMs ?? 0);
    if (!Number.isFinite(nextAllowedAtMs) || nowMs >= nextAllowedAtMs) {
        return { kind: 'open' };
    }
    if (text(quotaData.lastBriefingHash, 128) === expectedBriefingHash) {
        const review = readStoredWeeklyReview(quotaData.lastReview);
        if (review) {
            return {
                kind: 'replay',
                review,
                nextAllowedAtMs,
                model: text(quotaData.lastModel, 80) || MODEL_DEFAULT,
            };
        }
    }
    return { kind: 'not_ready', nextAllowedAtMs };
}
async function readReplayOrAssertWindowOpen(authUid, stableUid, expectedBriefingHash) {
    const db = admin.firestore();
    const now = Date.now();
    const ref = db.collection(QUOTA_COLLECTION).doc(docId('wkrq', authUid, stableUid));
    const snap = await ref.get();
    const decision = decideWeeklyReviewReplay(snap.data() ?? {}, expectedBriefingHash, now);
    if (decision.kind === 'open')
        return null;
    if (decision.kind === 'replay')
        return decision;
    if (decision.kind === 'not_ready') {
        throw new https_1.HttpsError('resource-exhausted', 'weekly_review_not_ready', {
            nextAllowedAtMs: decision.nextAllowedAtMs,
        });
    }
    return null;
}
async function commitWindow(authUid, stableUid, isPremium, briefingHash, review, model) {
    const db = admin.firestore();
    const now = Date.now();
    const windowDays = isPremium ? PREMIUM_WINDOW_DAYS : FREE_WINDOW_DAYS;
    const ref = db.collection(QUOTA_COLLECTION).doc(docId('wkrq', authUid, stableUid));
    // Transaction guards against a concurrent second request slipping past the
    // read-only check before this commit lands.
    return db.runTransaction(async (tx) => {
        const data = (await tx.get(ref)).data() ?? {};
        const existingNext = Number(data.nextAllowedAtMs ?? 0);
        if (now < existingNext) {
            // A concurrent call already committed the window — honor it.
            return existingNext;
        }
        const newNext = startOfNextWindow(now, windowDays);
        tx.set(ref, {
            authUid,
            stableUid,
            isPremium,
            lastGeneratedAtMs: now,
            lastBriefingHash: briefingHash,
            lastReview: review,
            lastModel: model,
            nextAllowedAtMs: newNext,
            updatedAtMs: now,
        }, { merge: true });
        return newNext;
    });
}
// ── Prompt ─────────────────────────────────────────────────────────────────
const LANG_NAMES = {
    ru: 'Russian',
    uk: 'Ukrainian',
    es: 'Spanish',
    'pt-BR': 'Brazilian Portuguese',
    vi: 'Vietnamese',
    id: 'Indonesian',
    tr: 'Turkish',
    pl: 'Polish',
};
function buildSystemPrompt(lang) {
    const langName = LANG_NAMES[lang];
    return `You are "Компас", a warm, encouraging English tutor inside the Phraseman app.
You are writing the learner's mistake review for their English practice.

ABSOLUTE RULES:
- Write ENTIRELY in ${langName}. Every word of greeting and paragraphs must be in ${langName}.
- You will receive a JSON briefing of ALREADY-COMPUTED statistics. Describe ONLY what is in it.
- NEVER invent numbers, categories, lessons, words, or facts that are not in the briefing.
- NEVER recommend a grammar topic or lesson that is not in "recommendedLessons". If that list is empty, give general encouragement instead and recommend nothing.
- Do NOT draw causal links between effort stats (streak, time, XP) and language knowledge. Use effort only for warm acknowledgement.
- NEVER speculate WHY the learner slipped — do NOT say they confused things, translated literally, rushed, did not think, or misunderstood. You only see counts, not reasons. State the fact (which category, which example phrases) and the path forward — nothing about their motive.
- WORD CHOICE in the output: never use the ${langName} word for "mistake/error/wrong" (in Russian: NOT «ошибка»/«ошибся»/«неправильно»). Frame slips gently as «почти» / a near-miss / «давай закрепим». Say the ${langName} word for "session/round" instead of "lesson", "your results" instead of "statistics", "phrase" instead of "word" where natural.
- No grammar jargon (no "auxiliary verb", "definite article", "perfect tense", «вспомогательный глагол», «определённый артикль»). Name weak spots in plain everyday words a 50+ beginner instantly understands.
- Frame everything as gain — what the learner is building or can unlock next, never as loss ("you will forget", "you will lose progress"). No fake urgency.
- Be specific and kind. Mention concrete weak categories and the example words from topWords. Celebrate strong/recovered categories by name.
- Address the learner informally, as "ты" — use the informal second person of ${langName} (ты/tú/du/tu, NEVER the polite "вы"/usted/Sie/vous form). Talk like a friend who is on their side.
- Keep sentences short: aim for ~10 words each, one idea per sentence. The greeting is 5-6 words max. Avoid filler words (the ${langName} equivalents of «просто», «также», «кстати», «в принципе», «на самом деле»).
- Tone: a warm, friendly coach with a LIGHT touch of humor where it fits naturally — one small wink, never forced, never at the learner's expense. Short, clear sentences. The learner is often a beginner and 50+. Never condescend, never shame mistakes.

OUTPUT FORMAT — respond with STRICT JSON only, no markdown, matching exactly:
{
  "greeting": "one short warm opening line in ${langName}",
  "paragraphs": ["2 to ${MAX_PARAGRAPHS} short paragraphs in ${langName}: what went well, where the weak spots are (name categories + example words), what changed/improved, gentle next step"],
  "recommendations": [{"microDiagnosisId": "<copy id verbatim from recommendedLessons>", "label": "<copy label verbatim>"}]
}
"recommendations" MUST be a subset of the briefing's "recommendedLessons" (same ids). Include at most ${MAX_RECOMMENDATIONS}. If recommendedLessons is empty, return an empty array.`;
}
/**
 * Parses the model's JSON and re-validates recommendations against the briefing
 * so the AI can NEVER surface a lesson the client did not authorize, even if it
 * hallucinates one. This is the server-side guarantee behind the gate.
 */
function parseAndGuardResult(rawContent, briefing) {
    let parsed;
    try {
        parsed = JSON.parse(rawContent);
    }
    catch {
        throw new https_1.HttpsError('unavailable', 'weekly_review_bad_json');
    }
    const greeting = text(parsed.greeting, 200);
    const paragraphsRaw = Array.isArray(parsed.paragraphs) ? parsed.paragraphs : [];
    const paragraphs = paragraphsRaw
        .slice(0, MAX_PARAGRAPHS)
        .map((p) => text(p, 800))
        .filter(Boolean);
    if (!greeting || paragraphs.length === 0) {
        throw new https_1.HttpsError('unavailable', 'weekly_review_empty');
    }
    (0, ai_language_contract_1.assertAiJsonTextFieldsLanguage)({
        texts: [greeting, ...paragraphs],
        targetLang: briefing.lang,
        feature: 'weekly_review',
    });
    // Allowlist of authorized ids from the briefing.
    const allowed = new Map(briefing.recommendedLessons.map((r) => [r.microDiagnosisId, r.label]));
    const recsRaw = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
    const recommendations = [];
    const seen = new Set();
    for (const item of recsRaw) {
        const c = (item ?? {});
        const id = text(c.microDiagnosisId, 80);
        if (allowed.has(id) && !seen.has(id)) {
            seen.add(id);
            // Use the briefing's label, NOT the model's — guarantees consistency.
            recommendations.push({ microDiagnosisId: id, label: allowed.get(id) });
        }
        if (recommendations.length >= MAX_RECOMMENDATIONS)
            break;
    }
    return { greeting, paragraphs, recommendations };
}
// ── Callable ──────────────────────────────────────────────────────────────────
exports.weeklyReviewGenerate = (0, https_1.onCall)({
    region: REGION,
    enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK_OPENAI,
    timeoutSeconds: 30,
    memory: '512MiB',
    maxInstances: 10,
    secrets: [OPENAI_API_KEY],
}, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    // Do NOT clamp the secret — project-scoped keys can be long; truncation breaks auth.
    const apiKey = String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey)
        throw new https_1.HttpsError('failed-precondition', 'openai_key_missing');
    const data = (request.data ?? {});
    // НЕ доверяем data.isPremium из тела — премиум резолвится на сервере ниже
    // (после resolveStableUidForAuth) из users/{stableUid}.progress.
    const briefing = sanitizeBriefing(data.briefing);
    if (briefing.totalMistakes < 5 || briefing.weakCategories.length === 0) {
        throw new https_1.HttpsError('failed-precondition', 'weekly_review_insufficient_data');
    }
    const db = admin.firestore();
    // Админ-конфиг (модель/выключатель). Fallback = текущие дефолты.
    const jobCfg = await (0, openai_jobs_config_1.resolveJobConfig)(db, 'weekly');
    (0, openai_jobs_config_1.assertJobEnabled)(jobCfg, 'weekly'); // kill-switch: enabled=false → resource-exhausted
    const authUid = request.auth.uid;
    // uid from auth identity — NEVER from request body (security invariant).
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid);
    // Premium резолвится из Firestore-состояния, а не из тела запроса: иначе
    // free-юзер прислал бы isPremium:true и получил укороченное (премиум) окно.
    const isPremium = await (0, premium_status_1.resolvePremiumAccess)(db, stableUid);
    // Replay/window check BEFORE rate limits and the paid API call. Same briefing
    // retries get the cached server result; different briefing remains gated.
    const briefingHash = briefingHashForReplay(briefing);
    const replay = await readReplayOrAssertWindowOpen(authUid, stableUid, briefingHash);
    if (replay) {
        return {
            ok: true,
            review: replay.review,
            nextAllowedAtMs: replay.nextAllowedAtMs,
            model: replay.model,
            idempotentReplay: true,
        };
    }
    // Limits BEFORE the paid API call. Window is committed after a successful
    // generation so a provider failure does not lock the user out for a week.
    await enforceRateLimit(authUid, stableUid);
    const messages = [
        { role: 'system', content: buildSystemPrompt(briefing.lang) },
        { role: 'user', content: JSON.stringify(briefing) },
    ];
    const response = await fetch(OPENAI_CHAT_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: jobCfg.model,
            messages,
            max_tokens: MAX_OUTPUT_TOKENS,
            temperature: 0.7,
            response_format: { type: 'json_object' },
        }),
    });
    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        console.error('weekly_review chat failed', response.status, detail.slice(0, 500));
        throw new https_1.HttpsError('unavailable', 'weekly_review_provider_failed');
    }
    const json = (await response.json());
    const content = text(json.choices?.[0]?.message?.content, 4000);
    if (!content)
        throw new https_1.HttpsError('unavailable', 'weekly_review_empty_reply');
    const result = parseAndGuardResult(content, briefing);
    // Generation succeeded — NOW commit the window (so failures above never burn it).
    const nextAllowedAtMs = await commitWindow(authUid, stableUid, isPremium, briefingHash, result, jobCfg.model);
    const usage = json.usage ?? {};
    await db.collection(BILLING_COLLECTION).doc().set({
        uid: stableUid,
        authUid,
        model: jobCfg.model,
        lang: briefing.lang,
        studyTarget: briefing.studyTarget,
        windowDays: briefing.windowDays,
        totalMistakes: briefing.totalMistakes,
        promptTokens: Number(usage.prompt_tokens ?? 0),
        completionTokens: Number(usage.completion_tokens ?? 0),
        totalTokens: Number(usage.total_tokens ?? 0),
        isPremium,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAtMs: Date.now(),
    });
    return {
        ok: true,
        review: result,
        nextAllowedAtMs,
        model: jobCfg.model,
    };
});
// Pure functions exposed for unit tests (convention: see account_delete.ts).
exports.__weeklyReviewTestHooks = {
    sanitizeBriefing,
    parseAndGuardResult,
    buildSystemPrompt,
    briefingHashForReplay,
    decideWeeklyReviewReplay,
    readStoredWeeklyReview,
};
//# sourceMappingURL=weekly_review.js.map