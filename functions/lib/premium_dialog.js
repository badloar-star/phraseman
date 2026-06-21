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
exports.premiumDialogSend = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const crypto_1 = require("crypto");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const premium_status_1 = require("./premium_status");
const openai_dialog_model_config_1 = require("./openai_dialog_model_config");
const OPENAI_API_KEY = (0, params_1.defineSecret)('OPENAI_API_KEY');
/**
 * Premium AI dialogue — Phase 0 (scenario-only, text MVP).
 * Pattern follows pronunciation_scoring.ts (key proxy via process.env, auth.uid as identity,
 * rate limit in a Firestore transaction BEFORE the paid API call).
 *
 * NOT in deploy:safe whitelist on purpose — deploy point-to-point:
 *   firebase deploy --only functions:premiumDialogSend
 */
const REGION = 'us-central1';
const RATE_COLLECTION = 'premium_dialog_rate_limits';
const QUOTA_COLLECTION = 'premium_dialog_quotas';
const BILLING_COLLECTION = 'premium_dialog_billing';
const MAX_USER_TEXT = 2000;
const MAX_HISTORY_TURNS = 8;
const MAX_OUTPUT_TOKENS = 200;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 60;
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL_DEFAULT = 'gpt-4.1-nano';
function sanitizeMemory(value) {
    const m = (value ?? {});
    const weakRaw = Array.isArray(m.weakWords) ? m.weakWords : [];
    const weakWords = weakRaw
        .map((w) => text(w, 60))
        .filter((w) => w.length > 0)
        .slice(0, 8);
    return {
        profile: text(m.profile, 400) || undefined,
        weakWords: weakWords.length > 0 ? weakWords : undefined,
        summary: text(m.summary, 800) || undefined,
    };
}
function text(value, max) {
    return String(value ?? '').trim().slice(0, max);
}
function asCefr(value) {
    const c = text(value, 2).toUpperCase();
    return ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(c) ? c : 'A2';
}
function sanitizeHistory(value) {
    if (!Array.isArray(value))
        return [];
    const result = [];
    for (const raw of value.slice(-MAX_HISTORY_TURNS)) {
        const item = (raw ?? {});
        const role = text(item.role, 12);
        const content = text(item.content, 1000);
        if ((role === 'user' || role === 'assistant') && content) {
            result.push({ role, content });
        }
    }
    return result;
}
function docId(prefix, authUid, stableUid) {
    const hash = (0, crypto_1.createHash)('sha256').update(`${prefix}|${authUid}|${stableUid}`).digest('hex').slice(0, 48);
    return `${prefix}_${hash}`;
}
function startOfNextUtcDay(nowMs) {
    const d = new Date(nowMs);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0);
}
async function enforceRateLimit(authUid, stableUid) {
    const db = admin.firestore();
    const now = Date.now();
    const ref = db.collection(RATE_COLLECTION).doc(docId('dlg', authUid, stableUid));
    await db.runTransaction(async (tx) => {
        const data = (await tx.get(ref)).data() ?? {};
        const windowStartMs = Number(data.windowStartMs ?? 0);
        const count = Number(data.count ?? 0);
        const sameWindow = now - windowStartMs < WINDOW_MS;
        if (sameWindow && count >= MAX_PER_WINDOW) {
            console.warn('premium_dialog rejected', { reason: 'dialog_rate_limited' });
            throw new https_1.HttpsError('resource-exhausted', 'dialog_rate_limited');
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
/**
 * Daily quota — SERVER is the source of truth (client gate is bypassable).
 * Returns remaining quota after consuming one.
 */
async function enforceDailyQuota(authUid, stableUid, isPremium, dailyCap) {
    const db = admin.firestore();
    const now = Date.now();
    const ref = db.collection(QUOTA_COLLECTION).doc(docId('quota', authUid, stableUid));
    return db.runTransaction(async (tx) => {
        const data = (await tx.get(ref)).data() ?? {};
        const resetAtMs = Number(data.resetAtMs ?? 0);
        const fresh = now >= resetAtMs;
        const used = fresh ? 0 : Number(data.dailyCount ?? 0);
        if (used >= dailyCap) {
            console.warn('premium_dialog rejected', {
                reason: isPremium ? 'dialog_premium_cap' : 'dialog_free_limit',
                isPremium,
                used,
                dailyCap,
            });
            throw new https_1.HttpsError('resource-exhausted', isPremium ? 'dialog_premium_cap' : 'dialog_free_limit');
        }
        tx.set(ref, {
            authUid,
            stableUid,
            isPremium,
            dailyCap,
            quotaTier: isPremium ? 'premium' : 'free',
            dailyCount: used + 1,
            resetAtMs: fresh ? startOfNextUtcDay(now) : resetAtMs,
            updatedAtMs: now,
        }, { merge: true });
        return dailyCap - (used + 1);
    });
}
async function releaseDailyQuota(authUid, stableUid) {
    const db = admin.firestore();
    const ref = db.collection(QUOTA_COLLECTION).doc(docId('quota', authUid, stableUid));
    await db.runTransaction(async (tx) => {
        const data = (await tx.get(ref)).data() ?? {};
        const dailyCount = Number(data.dailyCount ?? 0);
        if (dailyCount <= 0)
            return;
        tx.set(ref, {
            dailyCount: dailyCount - 1,
            updatedAtMs: Date.now(),
        }, { merge: true });
    });
}
/**
 * Пожизненный free-гейт (запрос пользователя 2026-06-20): не-premium получает
 * РОВНО ОДИН полный бесплатный диалог за всю жизнь аккаунта, без лимита реплик
 * внутри него. Дальше — полный замок (paywall).
 *
 * Сигнал «начался НОВЫЙ диалог» = пустая история (`isNewDialog`): первая реплика
 * сессии. Тогда:
 *   • если бесплатный диалог уже потрачен -> resource-exhausted (полный замок);
 *   • иначе помечаем потраченным и пропускаем.
 * Продолжение того же диалога (история не пустая) НЕ гейтим — это всё ещё тот
 * единственный бесплатный диалог, его реплики не лимитируем.
 *
 * `markedRef`/возврат нужны вызывающему, чтобы откатить отметку, если платный
 * вызов провайдера упал (иначе юзер потеряет единственный бесплатный диалог
 * из-за нашей ошибки).
 */
async function enforceLifetimeFreeDialog(authUid, stableUid, isNewDialog) {
    if (!isNewDialog)
        return { markedNow: false };
    const db = admin.firestore();
    const ref = db.collection(QUOTA_COLLECTION).doc(docId('free1', authUid, stableUid));
    return db.runTransaction(async (tx) => {
        const data = (await tx.get(ref)).data() ?? {};
        if (data.freeDialogUsed === true) {
            console.warn('premium_dialog rejected', { reason: 'dialog_free_lifetime_used' });
            throw new https_1.HttpsError('resource-exhausted', 'dialog_free_limit');
        }
        tx.set(ref, {
            authUid,
            stableUid,
            freeDialogUsed: true,
            usedAtMs: Date.now(),
        }, { merge: true });
        return { markedNow: true };
    });
}
/** Откат пожизненной отметки, если платный вызов провайдера не удался. */
async function releaseLifetimeFreeDialog(authUid, stableUid) {
    const db = admin.firestore();
    const ref = db.collection(QUOTA_COLLECTION).doc(docId('free1', authUid, stableUid));
    await db.runTransaction(async (tx) => {
        const data = (await tx.get(ref)).data() ?? {};
        if (data.freeDialogUsed !== true)
            return;
        tx.set(ref, { freeDialogUsed: false, releasedAtMs: Date.now() }, { merge: true });
    });
}
const GLOBAL_RULES = `You are "Компас", a warm, patient English-speaking partner inside the Phraseman app.
The learner is a Russian speaker, often aged 50+, often a beginner. NEVER condescend, NEVER rush, NEVER shame mistakes.
Keep YOUR replies SHORT: 1-2 sentences, max ~25 words. Long replies overwhelm beginners.
Speak natural everyday English. Avoid slang, idioms, and rare words unless the learner is B2+.
Adapt to the learner's CEFR level: {CEFR}. Speak slightly above it (i+1), introducing at most ONE new word per turn, always understandable from context.
SOFT CORRECTION (recast): if the learner makes an error, naturally restate the correct form inside your reply WITHOUT stopping the conversation and WITHOUT meta-commentary. Example - learner: "I go to shop yesterday" -> you: "Oh, you went to the shop yesterday? What did you buy?"
NEVER break character to lecture. If the learner uses any language other than English, accept it and gently bridge back to English with one simple model phrase. Do not refuse to continue.
NOISY INPUT: the learner's message may come from imperfect on-device speech recognition. Infer their intent, never nitpick recognition artifacts, and NEVER say you "didn't understand" because of small garbled words. If truly unintelligible, warmly ask them to say it again.
End most replies with a simple question or prompt to keep the conversation going.
KEY PHRASES: in each reply, wrap 1-3 of the MOST useful English phrases or expressions (natural, reusable chunks worth learning and saying out loud) in double square brackets, like [[I'd rather stay home]]. Do NOT wrap single trivial words (not [[the]], not [[is]]), never wrap more than 3 per reply, and never wrap the whole sentence. If nothing is worth highlighting, wrap nothing.
Output ONLY your spoken reply. No stage directions and no markdown, EXCEPT the [[...]] key-phrase markers described above.`;
const SCENARIO_BLOCK = `MODE: SCENARIO ROLEPLAY.
You are playing the role of: {ROLE}.
The setting: {SETTING}.{PERSONA}
The learner's goal in this scenario: {GOAL_EN}.
- Open with a short, warm in-character greeting that invites the first exchange.
- Stay in character. React naturally as that role would. Let your specific personality, mood, and quirks show through your word choice and reactions — you are a real individual, not a generic role.
- Drive toward the goal in 5-8 exchanges, then bring the scene to a satisfying close. Do NOT drag it out.
- If the learner gets stuck or silent, offer a gentle in-character hint that models a possible answer.
- Keep difficulty at {CEFR}. Personality must NEVER raise the language level: stay simple even when the character is lively.`;
/** Блок характера персонажа. Пусто, если у сценария нет персоны. */
function personaBlock(persona) {
    if (!persona)
        return '';
    return `\nYour character: ${persona}`;
}
function buildScenarioSystemPrompt(cefr, data) {
    const block = SCENARIO_BLOCK
        .replace('{ROLE}', text(data.role, 120) || 'a friendly barista')
        .replace('{SETTING}', text(data.setting, 200) || 'a cozy coffee shop')
        .replace('{PERSONA}', personaBlock(text(data.persona, 400)))
        .replace('{GOAL_EN}', text(data.goalEn, 200) || 'order a cappuccino and ask the price')
        .replace('{CEFR}', cefr);
    return `${GLOBAL_RULES.replace('{CEFR}', cefr)}\n\n${block}${cefrReinjection(cefr)}`;
}
const COMPANION_BLOCK = `MODE: OPEN COMPANION CONVERSATION.
You are NOT playing a fixed scenario. You are the learner's warm English-speaking friend having a real, open conversation.
- Talk like a genuine friend with light personality and humour - NOT a servile assistant, NOT an interviewer firing questions.
- Follow the learner's interest and let them lead where they can; show real curiosity with natural follow-ups.
- They may ask for explanations, examples, progress, weak spots, or the next useful step. Use only the memory and data provided; if data is missing, say that briefly and suggest a small next action.
- Stay inside language learning, communication practice, learner progress, and safe everyday topics. Do not become a general-purpose assistant for unrelated tasks.
- If the learner asks in Russian about an explanation or their progress, you may answer briefly in Russian, then give one short English phrase they can say next.
- Your hidden coaching goal: gently steer the chat so the learner naturally PRODUCES speech using the words/phrases they struggle with (provided below). Do not list them or announce this - weave them into your questions.
- The conversation is open and ongoing - do NOT try to "wrap it up" after a few turns. Keep it alive.`;
/**
 * Реинъекция уровня в КОНЕЦ промпта — против alignment-drift (LLM дрейфует
 * к нативной сложности за ~9 ходов; стратегия §6.4).
 */
function cefrReinjection(cefr) {
    return `\n\nREMINDER (keep enforcing every turn): stay at CEFR ${cefr}. Short replies, simple everyday words, at most one new word per turn. Do NOT drift to native-level complexity.`;
}
/** Блок «памяти коуча» — то, что делает Компас «знающим тебя». */
function buildMemoryBlock(memory) {
    const lines = [];
    if (memory.profile)
        lines.push(`About the learner: ${memory.profile}`);
    if (memory.weakWords && memory.weakWords.length > 0) {
        lines.push(`Words/phrases they are currently struggling with (lure them into SAYING these naturally, do not list them): ${memory.weakWords.join(', ')}`);
    }
    if (memory.summary)
        lines.push(`Earlier conversations: ${memory.summary}`);
    if (lines.length === 0)
        return '';
    return `\n\nWHAT YOU REMEMBER ABOUT THIS LEARNER:\n${lines.join('\n')}`;
}
function buildCompanionSystemPrompt(cefr, memory) {
    return `${GLOBAL_RULES.replace('{CEFR}', cefr)}\n\n${COMPANION_BLOCK}${buildMemoryBlock(memory)}${cefrReinjection(cefr)}`;
}
exports.premiumDialogSend = (0, https_1.onCall)({
    region: REGION,
    enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK_OPENAI,
    timeoutSeconds: 30,
    memory: '512MiB',
    maxInstances: 20,
    secrets: [OPENAI_API_KEY],
}, async (request) => {
    if (!request.auth?.uid) {
        console.warn('premium_dialog rejected', { reason: 'auth_required' });
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    }
    const apiKey = text(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY, 300);
    if (!apiKey) {
        console.error('premium_dialog rejected', { reason: 'openai_key_missing' });
        throw new https_1.HttpsError('failed-precondition', 'openai_key_missing');
    }
    const data = (request.data ?? {});
    // MVP-1: scenario (роль-ролёвка) ИЛИ companion (открытый разговор-друг + память).
    const mode = text(data.mode, 20) || 'scenario';
    if (mode !== 'scenario' && mode !== 'companion') {
        console.warn('premium_dialog rejected', { reason: 'unsupported_mode', mode });
        throw new https_1.HttpsError('invalid-argument', 'unsupported_mode');
    }
    const cefr = asCefr(data.cefr);
    const userText = text(data.userText, MAX_USER_TEXT);
    if (!userText) {
        console.warn('premium_dialog rejected', { reason: 'user_text_required', mode });
        throw new https_1.HttpsError('invalid-argument', 'user_text_required');
    }
    const db = admin.firestore();
    const dialogModel = await (0, openai_dialog_model_config_1.resolveConfiguredDialogModel)(db, process.env.OPENAI_DIALOG_MODEL);
    const dialogQuota = await (0, openai_dialog_model_config_1.resolveConfiguredDialogQuota)(db);
    const authUid = request.auth.uid;
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid);
    // Premium резолвится из Firestore-состояния, а не из тела запроса: иначе
    // free-юзер прислал бы isPremium:true и получил премиум-квоту (100/день
    // вместо 1/день) — ×100 к дневному бюджету OpenAI на одного абьюзера.
    const isPremium = await (0, premium_status_1.resolvePremiumAccess)(db, stableUid, Date.now(), authUid);
    const history = sanitizeHistory(data.history);
    // Пустая история = это ПЕРВАЯ реплика нового диалога. По ней решаем, тратит ли
    // free-юзер свой единственный пожизненный бесплатный диалог.
    const isNewDialog = history.length === 0;
    // Limits BEFORE the paid API call.
    await enforceRateLimit(authUid, stableUid);
    // Free: пожизненно ОДИН бесплатный диалог (без лимита реплик внутри).
    // Premium: дневной кап реплик (защита бюджета OpenAI от абьюза).
    let remaining;
    let freeMarkedNow = false;
    if (isPremium) {
        remaining = await enforceDailyQuota(authUid, stableUid, true, dialogQuota.premiumDailyReplies);
    }
    else {
        const gate = await enforceLifetimeFreeDialog(authUid, stableUid, isNewDialog);
        freeMarkedNow = gate.markedNow;
        // Для не-premium «остаток» бессмысленен (диалог один) — отдаём 0, чтобы клиент
        // не показывал дневной счётчик.
        remaining = 0;
    }
    const systemPrompt = mode === 'companion'
        ? buildCompanionSystemPrompt(cefr, sanitizeMemory(data.memory))
        : buildScenarioSystemPrompt(cefr, data);
    const messages = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: userText },
    ];
    let json;
    let assistantMessage;
    try {
        const response = await fetch(OPENAI_CHAT_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: dialogModel,
                messages,
                max_tokens: MAX_OUTPUT_TOKENS,
                temperature: 0.8,
            }),
        });
        if (!response.ok) {
            const detail = await response.text().catch(() => '');
            console.error('premium_dialog chat failed', {
                status: response.status,
                model: dialogModel,
                mode,
                scenarioId: text(data.scenarioId, 80) || null,
                detail: detail.slice(0, 500),
            });
            throw new https_1.HttpsError('unavailable', 'dialog_provider_failed');
        }
        json = (await response.json());
        assistantMessage = text(json.choices?.[0]?.message?.content, 1500);
        if (!assistantMessage) {
            console.error('premium_dialog empty reply', {
                model: dialogModel,
                mode,
                scenarioId: text(data.scenarioId, 80) || null,
            });
            throw new https_1.HttpsError('unavailable', 'dialog_empty_reply');
        }
    }
    catch (error) {
        // Откатываем то, что списали ДО провайдера, чтобы его сбой не съел попытку:
        // premium — дневную квоту; free — пожизненную отметку (только если её
        // поставили ИМЕННО сейчас, на этой первой реплике).
        const rollback = isPremium
            ? releaseDailyQuota(authUid, stableUid)
            : freeMarkedNow
                ? releaseLifetimeFreeDialog(authUid, stableUid)
                : Promise.resolve();
        await rollback.catch((releaseError) => {
            console.error('premium_dialog quota release failed', {
                reason: error instanceof https_1.HttpsError ? error.message : 'provider_exception',
                releaseError: String(releaseError?.message ?? releaseError).slice(0, 300),
            });
        });
        if (error instanceof https_1.HttpsError)
            throw error;
        console.error('premium_dialog provider exception', {
            model: dialogModel,
            mode,
            scenarioId: text(data.scenarioId, 80) || null,
            error: String(error?.message ?? error).slice(0, 500),
        });
        throw new https_1.HttpsError('unavailable', 'dialog_provider_failed');
    }
    const usage = json.usage ?? {};
    await db.collection(BILLING_COLLECTION).doc().set({
        uid: stableUid,
        authUid,
        mode,
        model: dialogModel,
        cefr,
        scenarioId: text(data.scenarioId, 80) || null,
        promptTokens: Number(usage.prompt_tokens ?? 0),
        completionTokens: Number(usage.completion_tokens ?? 0),
        totalTokens: Number(usage.total_tokens ?? 0),
        isPremium,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAtMs: Date.now(),
    });
    return {
        ok: true,
        assistantMessage,
        remainingQuota: remaining,
        model: dialogModel,
    };
});
//# sourceMappingURL=premium_dialog.js.map