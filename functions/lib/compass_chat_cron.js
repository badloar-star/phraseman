"use strict";
// Daily Compass post for league chats.
//
// The cron creates exactly one Compass system message per active league group
// per UTC day. The content is generated once per product day and cached in
// league_compass_daily/{YYYY-MM-DD}; every group receives the same approved
// post, so reruns are idempotent and do not burn extra model calls.
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
exports.compassChatRunNow = exports.compassChatDailyCron = void 0;
exports.compassPostDocId = compassPostDocId;
exports.runCompassChatDailyPost = runCompassChatDailyPost;
const admin = __importStar(require("firebase-admin"));
const params_1 = require("firebase-functions/params");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const explain_provider_1 = require("./explain/explain_provider");
const openai_jobs_config_1 = require("./openai_jobs_config");
const compass_chat_content_1 = require("./compass_chat_content");
const callable_options_1 = require("./callable_options");
const OPENAI_API_KEY = (0, params_1.defineSecret)('OPENAI_API_KEY');
const LEAGUE_CHAT_SYSTEM_UID = '__league_system__';
const PAGE_SIZE = 200;
const BATCH_LIMIT = 400;
const MIN_MEMBERS_FOR_POST = 2;
const DAILY_COLLECTION = 'league_compass_daily';
const BILLING_COLLECTION = 'league_compass_daily_billing';
const DAILY_SCHEMA_VERSION = 1;
const GENERATION_LOCK_TTL_MS = 90000;
const REJECTED_RETRY_TTL_MS = 10 * 60000;
const GEN_MAX_TOKENS = 2200;
const GEN_TEMPERATURE = 0.9;
function getCurrentWeekId(now = new Date()) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
function compassPostDocId(weekId, groupId, daySeed) {
    const safeGroup = String(groupId).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) || 'group';
    return `compass_${weekId}_${safeGroup}_${daySeed}`;
}
function membersMap(data) {
    const members = data?.members;
    if (!members || typeof members !== 'object' || Array.isArray(members))
        return {};
    return members;
}
function countMembers(data) {
    return Object.values(membersMap(data)).filter((m) => m?.identityHidden !== true).length;
}
function buildMessagePayload(post, groupId, weekId, leagueId, createdAt) {
    const payload = {
        groupId,
        weekId,
        leagueId,
        authorUid: LEAGUE_CHAT_SYSTEM_UID,
        authorName: 'Compass',
        kind: 'system',
        systemType: post.systemType,
        compassKind: post.kind,
        text: post.i18n.ru,
        i18n: post.i18n,
        status: 'visible',
        reportCount: 0,
        createdAt,
        updatedAt: createdAt,
    };
    if (post.poll) {
        payload.poll = post.poll;
        payload.pollVotes = {};
    }
    return payload;
}
function getOpenAiApiKey() {
    try {
        return String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
    }
    catch {
        return String(process.env.OPENAI_API_KEY || '').trim();
    }
}
function dailyRef(db, dayKey) {
    return db.collection(DAILY_COLLECTION).doc(dayKey);
}
function readReadyPost(data) {
    if (!data || data.schemaVersion !== DAILY_SCHEMA_VERSION || data.status !== 'ready')
        return null;
    return (0, compass_chat_content_1.normalizeGeneratedCompassPost)(data.post);
}
async function readCachedDailyPost(db, dayKey) {
    const snap = await dailyRef(db, dayKey).get().catch(() => null);
    const data = snap?.data();
    const post = readReadyPost(data);
    return post ? { post, source: 'cache', model: data?.model } : null;
}
async function claimDailyGenerationLock(db, dayKey, nowMs) {
    const ref = dailyRef(db, dayKey);
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = snap.data();
        if (readReadyPost(data))
            return false;
        const updatedAtMs = Number(data?.updatedAtMs ?? data?.createdAtMs ?? 0);
        const ageMs = nowMs - updatedAtMs;
        if (data?.schemaVersion === DAILY_SCHEMA_VERSION && data.status === 'pending' && ageMs < GENERATION_LOCK_TTL_MS) {
            return false;
        }
        if (data?.schemaVersion === DAILY_SCHEMA_VERSION && data.status === 'rejected' && ageMs < REJECTED_RETRY_TTL_MS) {
            return false;
        }
        tx.set(ref, {
            schemaVersion: DAILY_SCHEMA_VERSION,
            status: 'pending',
            reason: null,
            createdAtMs: data?.createdAtMs || nowMs,
            updatedAtMs: nowMs,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        return true;
    });
}
function errorReason(err) {
    const anyErr = err;
    return String(anyErr?.code || anyErr?.message || err || 'unknown').slice(0, 160);
}
async function markDailyGenerationRejected(db, dayKey, reason, meta) {
    const nowMs = Date.now();
    await dailyRef(db, dayKey).set({
        schemaVersion: DAILY_SCHEMA_VERSION,
        status: 'rejected',
        reason,
        model: meta?.model || null,
        promptTokens: meta?.promptTokens ?? null,
        completionTokens: meta?.completionTokens ?? null,
        updatedAtMs: nowMs,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
}
async function resolveDailyCompassPost(db, now, daySeed) {
    const dayKey = (0, compass_chat_content_1.getUtcDayKey)(now);
    const fallback = (0, compass_chat_content_1.pickCompassPostForDay)(daySeed);
    const cached = await readCachedDailyPost(db, dayKey);
    if (cached)
        return cached;
    const jobCfg = await (0, openai_jobs_config_1.resolveJobConfig)(db, 'compass');
    if (!jobCfg.enabled)
        return { post: fallback, source: 'fallback_disabled', model: jobCfg.model };
    const apiKey = getOpenAiApiKey();
    if (!apiKey)
        return { post: fallback, source: 'fallback_missing_key', model: jobCfg.model };
    const nowMs = Date.now();
    const claimed = await claimDailyGenerationLock(db, dayKey, nowMs);
    if (!claimed)
        return { post: fallback, source: 'fallback_pending', model: jobCfg.model };
    let gen = null;
    try {
        gen = await (0, explain_provider_1.openAiChat)({
            apiKey,
            model: jobCfg.model,
            messages: [{ role: 'user', content: (0, compass_chat_content_1.buildLeagueCompassDailyPrompt)({ dayKey, seed: daySeed }) }],
            maxTokens: GEN_MAX_TOKENS,
            temperature: GEN_TEMPERATURE,
        });
        const post = (0, compass_chat_content_1.normalizeGeneratedCompassPost)(gen.text);
        if (!post) {
            await markDailyGenerationRejected(db, dayKey, 'invalid_generated_post', {
                model: jobCfg.model,
                promptTokens: gen.promptTokens,
                completionTokens: gen.completionTokens,
            });
            return { post: fallback, source: 'fallback_failed', model: jobCfg.model };
        }
        await dailyRef(db, dayKey).set({
            schemaVersion: DAILY_SCHEMA_VERSION,
            status: 'ready',
            reason: null,
            post,
            model: jobCfg.model,
            promptTokens: gen.promptTokens,
            completionTokens: gen.completionTokens,
            updatedAtMs: Date.now(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        await db.collection(BILLING_COLLECTION).doc().set({
            dayKey,
            model: jobCfg.model,
            kind: post.kind,
            promptTokens: gen.promptTokens,
            completionTokens: gen.completionTokens,
            published: true,
            createdAtMs: Date.now(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { post, source: 'ai', model: jobCfg.model };
    }
    catch (err) {
        const reason = errorReason(err);
        console.error('league compass daily generation failed', { dayKey, reason });
        await markDailyGenerationRejected(db, dayKey, reason, {
            model: jobCfg.model,
            promptTokens: gen?.promptTokens,
            completionTokens: gen?.completionTokens,
        }).catch((writeErr) => console.error('league compass rejected write failed', writeErr));
        await db.collection(BILLING_COLLECTION).doc().set({
            dayKey,
            model: jobCfg.model,
            promptTokens: gen?.promptTokens ?? 0,
            completionTokens: gen?.completionTokens ?? 0,
            published: false,
            reason,
            createdAtMs: Date.now(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }).catch((billingErr) => console.error('league compass billing write failed', billingErr));
        return { post: fallback, source: 'fallback_failed', model: jobCfg.model };
    }
}
async function runCompassChatDailyPost(now = new Date()) {
    const db = admin.firestore();
    const weekId = getCurrentWeekId(now);
    const daySeed = (0, compass_chat_content_1.getDaySeed)(now);
    const dayKey = (0, compass_chat_content_1.getUtcDayKey)(now);
    const resolved = await resolveDailyCompassPost(db, now, daySeed);
    const post = resolved.post;
    const createdAt = Date.now();
    console.log(`compassChatDailyCron: weekId=${weekId} dayKey=${dayKey} kind=${post.kind} source=${resolved.source}`);
    let processed = 0;
    let written = 0;
    let skipped = 0;
    let lastDoc = null;
    let batch = db.batch();
    let batchCount = 0;
    const flushBatch = async () => {
        if (batchCount > 0) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
        }
    };
    // eslint-disable-next-line no-constant-condition
    while (true) {
        let query = db
            .collection('league_groups')
            .where('weekId', '==', weekId)
            .orderBy('__name__')
            .limit(PAGE_SIZE);
        if (lastDoc)
            query = query.startAfter(lastDoc);
        const snap = await query.get();
        if (snap.empty)
            break;
        lastDoc = snap.docs[snap.docs.length - 1];
        for (const doc of snap.docs) {
            processed++;
            const data = doc.data();
            if (countMembers(data) < MIN_MEMBERS_FOR_POST) {
                skipped++;
                continue;
            }
            const leagueId = Math.max(0, Math.trunc(Number(data.leagueId ?? 0)));
            batch.set(db.collection('league_chat_messages').doc(compassPostDocId(weekId, doc.id, daySeed)), buildMessagePayload(post, doc.id, weekId, leagueId, createdAt), { merge: false });
            batchCount++;
            written++;
            if (batchCount >= BATCH_LIMIT) {
                await flushBatch();
            }
        }
    }
    await flushBatch();
    console.log(`compassChatDailyCron: processed=${processed} groups, written=${written}, skipped=${skipped}`);
    return {
        weekId,
        daySeed,
        dayKey,
        kind: post.kind,
        source: resolved.source,
        processed,
        written,
        summaries: 0,
        skipped,
    };
}
exports.compassChatDailyCron = (0, scheduler_1.onSchedule)({
    schedule: 'every day 09:00',
    timeZone: 'UTC',
    timeoutSeconds: 540,
    memory: '512MiB',
    region: 'us-central1',
    secrets: [OPENAI_API_KEY],
}, async () => {
    await runCompassChatDailyPost(new Date());
});
exports.compassChatRunNow = (0, https_1.onCall)({ region: 'us-central1', enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK_OPENAI, timeoutSeconds: 540, memory: '512MiB', secrets: [OPENAI_API_KEY] }, async (request) => {
    if (request.auth?.token?.admin !== true) {
        throw new https_1.HttpsError('permission-denied', 'admin_required');
    }
    const stats = await runCompassChatDailyPost(new Date());
    return { ok: true, ...stats };
});
//# sourceMappingURL=compass_chat_cron.js.map