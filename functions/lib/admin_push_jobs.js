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
exports.adminPushJobsCron = exports.adminPushJobCreated = void 0;
exports.toMillis = toMillis;
exports.isValidExpoPushToken = isValidExpoPushToken;
exports.normalizeAdminPushJob = normalizeAdminPushJob;
exports.isAdminPushJobDue = isAdminPushJobDue;
exports.isPremiumActive = isPremiumActive;
exports.parseAdminPushUser = parseAdminPushUser;
exports.matchesAdminPushSegment = matchesAdminPushSegment;
exports.matchesAdminPushReactivation = matchesAdminPushReactivation;
exports.matchesAdminPushScheduledAudience = matchesAdminPushScheduledAudience;
exports.selectAdminPushUsers = selectAdminPushUsers;
exports.buildAdminPushMessage = buildAdminPushMessage;
exports.chunkArray = chunkArray;
exports.sendExpoPushMessages = sendExpoPushMessages;
exports.processAdminPushJob = processAdminPushJob;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const REGION = 'us-central1';
const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const USER_SCAN_PAGE_SIZE = 500;
const EXPO_CHUNK_SIZE = 100;
const PROCESSING_STALE_MS = 15 * 60 * 1000;
const INACTIVE_7_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
function asRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : {};
}
function cleanString(value, max = 500) {
    const text = typeof value === 'string' ? value.trim() : '';
    return text.length > max ? text.slice(0, max) : text;
}
function finiteNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string' && value.trim()) {
        const n = Number(value.trim());
        if (Number.isFinite(n))
            return n;
    }
    return null;
}
function toMillis(value) {
    const direct = finiteNumber(value);
    if (direct != null)
        return Math.max(0, Math.floor(direct));
    if (typeof value === 'string' && value.trim()) {
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    if (value && typeof value.toMillis === 'function') {
        return Math.max(0, Math.floor(value.toMillis()));
    }
    if (value && typeof value.toDate === 'function') {
        return Math.max(0, value.toDate().getTime());
    }
    if (value && typeof value.seconds === 'number') {
        return Math.max(0, Math.floor(value.seconds * 1000));
    }
    return 0;
}
function isValidExpoPushToken(token) {
    return typeof token === 'string' && /^Expo(nent)?PushToken\[.+\]$/.test(token.trim());
}
function normalizeMode(value) {
    const mode = cleanString(value, 32);
    if (mode === 'uid' || mode === 'segment' || mode === 'reactivate' || mode === 'scheduled')
        return mode;
    throw new Error('invalid_mode');
}
function normalizeNotification(value) {
    const raw = asRecord(value);
    const title = cleanString(raw.title, 120);
    const body = cleanString(raw.body, 500);
    if (!title || !body)
        throw new Error('missing_notification');
    return { title, body };
}
function normalizeAdminPushJob(id, data) {
    const mode = normalizeMode(data.mode);
    const job = {
        id,
        mode,
        notification: normalizeNotification(data.notification),
    };
    const action = cleanString(data.action, 160);
    if (action)
        job.action = action;
    if (mode === 'uid') {
        const uid = cleanString(data.uid, 160);
        if (!uid)
            throw new Error('missing_uid');
        job.uid = uid;
    }
    if (mode === 'segment') {
        const raw = asRecord(data.segment);
        const segment = {};
        const language = cleanString(raw.language, 32);
        if (language)
            segment.language = language;
        if (typeof raw.premium === 'boolean')
            segment.premium = raw.premium;
        const streakMin = finiteNumber(raw.streakMin);
        if (streakMin != null && streakMin > 0)
            segment.streakMin = Math.floor(streakMin);
        job.segment = segment;
    }
    if (mode === 'reactivate') {
        const raw = asRecord(data.reactivation);
        const daysMin = Math.max(1, Math.floor(finiteNumber(raw.daysMin) ?? 7));
        const daysMax = Math.max(daysMin, Math.floor(finiteNumber(raw.daysMax) ?? 30));
        job.reactivation = { daysMin, daysMax };
    }
    if (mode === 'scheduled') {
        const scheduledAtMs = toMillis(data.scheduledAt);
        if (!scheduledAtMs)
            throw new Error('missing_scheduled_at');
        job.scheduledAtMs = scheduledAtMs;
        job.audience = cleanString(data.audience, 32) || 'all';
    }
    return job;
}
function isAdminPushJobDue(job, nowMs) {
    return job.mode !== 'scheduled' || Boolean(job.scheduledAtMs && job.scheduledAtMs <= nowMs);
}
function isPremiumActive(data, nowMs) {
    const progress = asRecord(data.progress);
    const planRaw = cleanString(data.premium, 80) || cleanString(progress.premium_plan, 80);
    const plan = planRaw.toLowerCase();
    const hasPlan = Boolean(plan && plan !== 'null');
    const adminOverride = cleanString(progress.admin_premium_override || data.admin_premium_override, 16) === 'true';
    const legacyAdminPremium = adminOverride || plan === 'admin_grant';
    const premiumExpiry = toMillis(data.premiumExpiry || progress.premium_expiry);
    const rcExpiry = toMillis(progress.premium_rc_expiry_ms);
    const rcPeriod = cleanString(progress.premium_rc_period_type, 40).toUpperCase();
    const isTrial = rcPeriod === 'TRIAL' || plan === 'trial';
    const expiresAt = rcExpiry || premiumExpiry;
    const expired = Boolean(hasPlan &&
        !legacyAdminPremium &&
        expiresAt > 0 &&
        expiresAt < nowMs &&
        (isTrial || premiumExpiry > 0));
    return Boolean(hasPlan && !legacyAdminPremium && !expired);
}
function parseAdminPushUser(uid, data, nowMs) {
    const progress = asRecord(data.progress);
    return {
        uid,
        token: cleanString(data.expoPushToken, 220),
        language: cleanString(data.lang, 32) ||
            cleanString(data.app_lang, 32) ||
            cleanString(data.pushTokenLang, 32) ||
            cleanString(progress.lang, 32) ||
            cleanString(progress.app_lang, 32),
        premiumActive: isPremiumActive(data, nowMs),
        streak: Math.max(0, Math.floor(finiteNumber(progress.streak_count) ??
            finiteNumber(data.streak_count) ??
            finiteNumber(data.streak) ??
            0)),
        lastActiveAtMs: toMillis(data.last_active_at || data.lastActiveAt || data.updatedAt),
    };
}
function hasDeliverableToken(user) {
    return isValidExpoPushToken(user.token);
}
function matchesAdminPushSegment(user, segment) {
    if (!hasDeliverableToken(user))
        return false;
    if (!segment)
        return true;
    if (segment.language && user.language !== segment.language)
        return false;
    if (typeof segment.premium === 'boolean' && user.premiumActive !== segment.premium)
        return false;
    if ((segment.streakMin ?? 0) > 0 && user.streak < (segment.streakMin ?? 0))
        return false;
    return true;
}
function matchesAdminPushReactivation(user, reactivation, nowMs) {
    if (!hasDeliverableToken(user))
        return false;
    if (!reactivation || user.lastActiveAtMs <= 0)
        return false;
    const inactiveDays = (nowMs - user.lastActiveAtMs) / (24 * 60 * 60 * 1000);
    return inactiveDays >= reactivation.daysMin && inactiveDays <= reactivation.daysMax;
}
function matchesAdminPushScheduledAudience(user, audience, nowMs) {
    if (!hasDeliverableToken(user))
        return false;
    switch ((audience || 'all').toLowerCase()) {
        case 'premium':
            return user.premiumActive;
        case 'free':
            return !user.premiumActive;
        case 'inactive7':
            return user.lastActiveAtMs > 0 && nowMs - user.lastActiveAtMs >= INACTIVE_7_DAYS_MS;
        case 'all':
        default:
            return true;
    }
}
function selectAdminPushUsers(job, users, nowMs) {
    if (job.mode === 'uid') {
        return users.filter((user) => user.uid === job.uid && hasDeliverableToken(user));
    }
    if (job.mode === 'segment') {
        return users.filter((user) => matchesAdminPushSegment(user, job.segment));
    }
    if (job.mode === 'reactivate') {
        return users.filter((user) => matchesAdminPushReactivation(user, job.reactivation, nowMs));
    }
    return users.filter((user) => matchesAdminPushScheduledAudience(user, job.audience, nowMs));
}
function buildAdminPushMessage(job, user) {
    const data = {
        type: 'admin_push',
        jobId: job.id,
        mode: job.mode,
    };
    if (job.action)
        data.action = job.action;
    return {
        to: user.token.trim(),
        sound: 'default',
        title: job.notification.title,
        body: job.notification.body,
        data,
    };
}
function chunkArray(items, size = EXPO_CHUNK_SIZE) {
    const out = [];
    for (let i = 0; i < items.length; i += size)
        out.push(items.slice(i, i + size));
    return out;
}
async function readTargetUsers(db, job, nowMs) {
    if (job.mode === 'uid') {
        const snap = await db.collection('users').doc(job.uid || '').get();
        if (!snap.exists)
            return [];
        const user = parseAdminPushUser(snap.id, snap.data() || {}, nowMs);
        return selectAdminPushUsers(job, [user], nowMs);
    }
    const out = [];
    let lastDoc = null;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        let query = db.collection('users').orderBy('__name__').limit(USER_SCAN_PAGE_SIZE);
        if (lastDoc)
            query = query.startAfter(lastDoc);
        const snap = await query.get();
        if (snap.empty)
            break;
        const pageUsers = snap.docs.map((doc) => parseAdminPushUser(doc.id, doc.data() || {}, nowMs));
        out.push(...selectAdminPushUsers(job, pageUsers, nowMs));
        lastDoc = snap.docs[snap.docs.length - 1];
        if (snap.size < USER_SCAN_PAGE_SIZE)
            break;
    }
    return out;
}
async function pruneExpiredTokens(db, uids) {
    if (uids.length === 0)
        return;
    let batch = db.batch();
    let writes = 0;
    for (const uid of Array.from(new Set(uids))) {
        batch.set(db.collection('users').doc(uid), { expoPushToken: admin.firestore.FieldValue.delete() }, { merge: true });
        writes++;
        if (writes % 400 === 0) {
            await batch.commit();
            batch = db.batch();
        }
    }
    if (writes % 400 !== 0)
        await batch.commit();
}
async function sendExpoPushMessages(messages, uids, fetchImpl = fetch) {
    const summary = {
        sentCount: 0,
        failedCount: 0,
        failedChunks: 0,
        ticketCount: 0,
        expiredTokenUids: [],
        errors: [],
    };
    const messageChunks = chunkArray(messages, EXPO_CHUNK_SIZE);
    const uidChunks = chunkArray(uids, EXPO_CHUNK_SIZE);
    for (let chunkIndex = 0; chunkIndex < messageChunks.length; chunkIndex++) {
        const chunk = messageChunks[chunkIndex];
        try {
            const res = await fetchImpl(EXPO_PUSH_ENDPOINT, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(chunk),
            });
            if (!res.ok) {
                const detail = await res.text().catch(() => '');
                summary.failedChunks++;
                summary.failedCount += chunk.length;
                summary.errors.push(`expo_http_${res.status}:${detail.slice(0, 160)}`);
                continue;
            }
            const json = await res.json().catch(() => ({}));
            const tickets = Array.isArray(json.data)
                ? json.data
                : json.data
                    ? [json.data]
                    : [];
            for (let i = 0; i < chunk.length; i++) {
                const ticket = tickets[i];
                if (ticket?.status === 'ok') {
                    summary.sentCount++;
                    if (ticket.id)
                        summary.ticketCount++;
                }
                else {
                    summary.failedCount++;
                    const code = ticket?.details?.error || ticket?.message || 'missing_ticket';
                    summary.errors.push(String(code).slice(0, 160));
                    if (ticket?.details?.error === 'DeviceNotRegistered') {
                        const uid = uidChunks[chunkIndex]?.[i];
                        if (uid)
                            summary.expiredTokenUids.push(uid);
                    }
                }
            }
        }
        catch (error) {
            summary.failedChunks++;
            summary.failedCount += chunk.length;
            summary.errors.push(error instanceof Error ? error.message.slice(0, 160) : String(error).slice(0, 160));
        }
    }
    summary.errors = Array.from(new Set(summary.errors)).slice(0, 12);
    summary.expiredTokenUids = Array.from(new Set(summary.expiredTokenUids));
    return summary;
}
async function claimJob(db, jobId, nowMs) {
    const ref = db.collection('admin_push_jobs').doc(jobId);
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists)
            return { claimed: false, reason: 'missing' };
        const data = snap.data() || {};
        const status = cleanString(data.status, 32) || 'pending';
        const processingAt = toMillis(data.processingStartedAtMs || data.updatedAtMs);
        if (status === 'done' || status === 'error')
            return { claimed: false, reason: 'terminal' };
        if (status === 'processing' && processingAt > 0 && nowMs - processingAt < PROCESSING_STALE_MS) {
            return { claimed: false, reason: 'processing' };
        }
        let job;
        try {
            job = normalizeAdminPushJob(jobId, data);
        }
        catch (error) {
            tx.set(ref, {
                status: 'error',
                error: error instanceof Error ? error.message : String(error),
                finishedAtMs: nowMs,
                updatedAtMs: nowMs,
            }, { merge: true });
            return { claimed: false, reason: 'invalid' };
        }
        if (!isAdminPushJobDue(job, nowMs)) {
            tx.set(ref, {
                status: 'scheduled',
                scheduledAtMs: job.scheduledAtMs,
                lastCheckAtMs: nowMs,
                updatedAtMs: nowMs,
            }, { merge: true });
            return { claimed: false, reason: 'scheduled' };
        }
        tx.set(ref, {
            status: 'processing',
            processingStartedAtMs: nowMs,
            updatedAtMs: nowMs,
            error: admin.firestore.FieldValue.delete(),
        }, { merge: true });
        return { claimed: true, job };
    });
}
async function processAdminPushJob(jobId, nowMs = Date.now()) {
    const db = admin.firestore();
    const ref = db.collection('admin_push_jobs').doc(jobId);
    const claim = await claimJob(db, jobId, nowMs);
    if (!claim.claimed || !claim.job)
        return { status: 'skipped', reason: claim.reason };
    try {
        const targets = await readTargetUsers(db, claim.job, nowMs);
        if (targets.length === 0) {
            await ref.set({
                status: 'error',
                error: 'no_valid_recipients',
                targetCount: 0,
                sentCount: 0,
                failedCount: 0,
                finishedAtMs: nowMs,
                updatedAtMs: Date.now(),
            }, { merge: true });
            return { status: 'error', targetCount: 0, sentCount: 0, failedCount: 0, reason: 'no_valid_recipients' };
        }
        const messages = targets.map((user) => buildAdminPushMessage(claim.job, user));
        const summary = await sendExpoPushMessages(messages, targets.map((user) => user.uid));
        await pruneExpiredTokens(db, summary.expiredTokenUids);
        const status = summary.sentCount > 0 ? 'done' : 'error';
        await ref.set({
            status,
            targetCount: targets.length,
            sentCount: summary.sentCount,
            failedCount: summary.failedCount,
            failedChunks: summary.failedChunks,
            ticketCount: summary.ticketCount,
            expiredTokenCount: summary.expiredTokenUids.length,
            errors: summary.errors,
            finishedAtMs: Date.now(),
            updatedAtMs: Date.now(),
            error: status === 'error' ? (summary.errors[0] || 'expo_send_failed') : admin.firestore.FieldValue.delete(),
        }, { merge: true });
        return {
            status,
            targetCount: targets.length,
            sentCount: summary.sentCount,
            failedCount: summary.failedCount,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await ref.set({
            status: 'error',
            error: message.slice(0, 500),
            finishedAtMs: Date.now(),
            updatedAtMs: Date.now(),
        }, { merge: true });
        return { status: 'error', reason: message };
    }
}
exports.adminPushJobCreated = (0, firestore_1.onDocumentCreated)({ region: REGION, document: 'admin_push_jobs/{jobId}', timeoutSeconds: 540, memory: '512MiB' }, async (event) => {
    const jobId = String(event.params.jobId || '');
    if (!jobId)
        return;
    const result = await processAdminPushJob(jobId);
    console.log('adminPushJobCreated', JSON.stringify({ jobId, ...result }));
});
exports.adminPushJobsCron = (0, scheduler_1.onSchedule)({ region: REGION, schedule: '*/30 * * * *', timeZone: 'UTC', timeoutSeconds: 540, memory: '512MiB' }, async () => {
    const db = admin.firestore();
    const activeSnap = await db
        .collection('admin_push_jobs')
        .where('status', 'in', ['pending', 'processing'])
        .limit(20)
        .get();
    const scheduledSnap = await db
        .collection('admin_push_jobs')
        .where('status', '==', 'scheduled')
        .limit(100)
        .get();
    const seen = new Set();
    const docs = [...activeSnap.docs, ...scheduledSnap.docs].filter((doc) => {
        if (seen.has(doc.id))
            return false;
        seen.add(doc.id);
        return true;
    });
    for (const doc of docs) {
        const result = await processAdminPushJob(doc.id);
        console.log('adminPushJobsCron', JSON.stringify({ jobId: doc.id, ...result }));
    }
});
//# sourceMappingURL=admin_push_jobs.js.map