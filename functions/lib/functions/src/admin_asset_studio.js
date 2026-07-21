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
exports.adminRunAssetJob = exports.adminCreateAssetJob = exports.adminListAssetJobs = void 0;
exports.normalizeAssetJobInput = normalizeAssetJobInput;
exports.buildOpenAiImageRequest = buildOpenAiImageRequest;
exports.canClaimAssetRun = canClaimAssetRun;
exports.sanitizeProviderError = sanitizeProviderError;
exports.projectAssetJob = projectAssetJob;
exports.missingAssetSlots = missingAssetSlots;
exports.reserveImageBudget = reserveImageBudget;
exports.claimAssetRun = claimAssetRun;
const admin = __importStar(require("firebase-admin"));
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const permissions_1 = require("./admin/permissions");
const roles_1 = require("./admin/roles");
const openai_jobs_config_1 = require("./openai_jobs_config");
const REGION = 'us-central1';
const OPENAI_API_KEY = (0, params_1.defineSecret)('OPENAI_API_KEY');
const JOBS_COLLECTION = 'admin_asset_jobs';
const USAGE_COLLECTION = 'admin_runtime_usage';
const MAX_PROMPT = 4000;
const MAX_TITLE = 120;
const MAX_TARGET_PATH = 240;
const MAX_COUNT = 4;
const RUN_LEASE_MS = 5 * 60 * 1000;
const ASSET_KINDS = new Set(['onboarding_icon', 'quiz_level_card', 'background', 'generic']);
const ASSET_SIZES = new Set(['1024x1024']);
const ASSET_QUALITIES = new Set(['low', 'medium', 'high']);
const SAFE_TARGET_RE = /^(assets\/images\/|admin-asset-studio\/)[A-Za-z0-9._/() -]{1,220}\.(png|webp|jpg|jpeg)$/i;
function text(value, max = 500) {
    return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
}
function requireAssetPermission(request, permission) {
    if (request.auth?.token?.admin !== true || !String(request.auth.uid ?? '').trim())
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const claimedRole = request.auth.token.adminRole;
    const role = (0, roles_1.hasAdminRole)(claimedRole) ? claimedRole : 'admin';
    if (!(0, permissions_1.hasPermission)(role, permission))
        throw new https_1.HttpsError('permission-denied', `Role cannot use ${permission}`);
    return { actorUid: String(request.auth.uid), role, email: text(request.auth.token.email, 200) || 'admin' };
}
function normalizeKind(value) {
    const kind = text(value, 40);
    return ASSET_KINDS.has(kind) ? kind : 'generic';
}
function normalizeCount(value) {
    const raw = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
    const count = typeof raw === 'number' && Number.isFinite(raw) ? Math.floor(raw) : 1;
    return Math.max(1, Math.min(MAX_COUNT, count));
}
function normalizeSize(value) {
    const size = text(value, 40);
    return ASSET_SIZES.has(size) ? size : '1024x1024';
}
function normalizeQuality(value) {
    const quality = text(value, 40);
    return ASSET_QUALITIES.has(quality) ? quality : 'low';
}
function normalizeAssetJobInput(data) {
    const input = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    const prompt = text(input.prompt, MAX_PROMPT);
    if (!prompt)
        throw new https_1.HttpsError('invalid-argument', 'prompt_required');
    const targetPath = text(input.targetPath, MAX_TARGET_PATH);
    if (targetPath && (!SAFE_TARGET_RE.test(targetPath) || targetPath.includes('..')))
        throw new https_1.HttpsError('invalid-argument', 'target_path_invalid');
    const kind = normalizeKind(input.kind);
    const title = text(input.title, MAX_TITLE) || `${kind} asset`;
    return Object.freeze({
        kind,
        title,
        prompt,
        targetPath,
        slotKey: text(input.slotKey, 120),
        count: normalizeCount(input.count),
        size: normalizeSize(input.size),
        quality: normalizeQuality(input.quality),
    });
}
function buildOpenAiImageRequest(job) {
    return {
        model: 'gpt-image-1',
        prompt: job.prompt,
        size: job.size,
        quality: job.quality,
        output_format: 'png',
    };
}
function canClaimAssetRun(raw, nowMs) {
    const status = text(raw.status, 40);
    if (status === 'draft' || status === 'failed')
        return true;
    if (status === 'running')
        return Number(raw.runLeaseExpiresAtMs || 0) < nowMs;
    return false;
}
function sanitizeProviderError(error) {
    const raw = error instanceof Error ? error.message : String(error ?? 'unknown');
    const code = raw.match(/image_api_\d{3}|image_api_no_b64|openai_image_generation_failed/)?.[0] || 'image_provider_error';
    return {
        publicMessage: 'image_provider_failed',
        diagnostic: code,
    };
}
function projectAssetJob(id, raw) {
    return {
        id,
        kind: text(raw.kind, 40) || 'generic',
        title: text(raw.title, MAX_TITLE) || 'Asset job',
        prompt: text(raw.prompt, MAX_PROMPT),
        targetPath: text(raw.targetPath, MAX_TARGET_PATH),
        slotKey: text(raw.slotKey, 120),
        count: normalizeCount(raw.count),
        size: normalizeSize(raw.size),
        quality: normalizeQuality(raw.quality),
        status: text(raw.status, 40) || 'draft',
        error: text(raw.error, 500),
        results: Array.isArray(raw.results) ? raw.results.slice(0, MAX_COUNT).map((item) => {
            const row = item && typeof item === 'object' ? item : {};
            return { slot: Number(row.slot || 0), gsPath: text(row.gsPath, 260), previewUrl: text(row.previewUrl, 1200), width: Number(row.width || 0), height: Number(row.height || 0) };
        }) : [],
        createdAtMs: Number(raw.createdAtMs || 0),
        updatedAtMs: Number(raw.updatedAtMs || 0),
        createdBy: text(raw.createdBy, 200),
    };
}
function missingAssetSlots(count, results) {
    const completed = new Set((Array.isArray(results) ? results : []).map((item) => Number(item?.slot || 0)).filter((slot) => slot > 0));
    return Array.from({ length: count }, (_, index) => index + 1).filter((slot) => !completed.has(slot));
}
async function withFreshPreviewUrls(job) {
    const bucket = admin.storage().bucket();
    const results = Array.isArray(job.results) ? await Promise.all(job.results.map(async (item) => {
        const row = item && typeof item === 'object' ? item : {};
        const gsPath = text(row.gsPath, 260);
        if (!gsPath)
            return { gsPath: '', previewUrl: '', width: Number(row.width || 0), height: Number(row.height || 0) };
        try {
            const [previewUrl] = await bucket.file(gsPath).getSignedUrl({ action: 'read', expires: Date.now() + 60 * 60 * 1000 });
            return { slot: Number(row.slot || 0), gsPath, previewUrl, width: Number(row.width || 0), height: Number(row.height || 0) };
        }
        catch {
            return { slot: Number(row.slot || 0), gsPath, previewUrl: '', width: Number(row.width || 0), height: Number(row.height || 0) };
        }
    })) : [];
    return { ...job, results };
}
async function generateImage(apiKey, job) {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(buildOpenAiImageRequest(job)),
    });
    if (!response.ok) {
        await response.text().catch(() => '');
        throw new Error(`image_api_${response.status}`);
    }
    const json = await response.json();
    const b64 = json.data?.[0]?.b64_json;
    if (!b64)
        throw new Error('image_api_no_b64');
    return Buffer.from(b64, 'base64');
}
function usageDocId(nowMs) {
    return `openai_image_assets_${new Date(nowMs).toISOString().slice(0, 10)}`;
}
async function reserveImageBudget(db, count, cap, nowMs) {
    if (cap <= 0)
        return;
    const ref = db.collection(USAGE_COLLECTION).doc(usageDocId(nowMs));
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const used = Number(snap.data()?.count || 0);
        if (used + count > cap)
            throw new https_1.HttpsError('resource-exhausted', 'image_assets_daily_cap_exceeded');
        tx.set(ref, {
            job: 'image_assets',
            dayKey: new Date(nowMs).toISOString().slice(0, 10),
            count: admin.firestore.FieldValue.increment(count),
            updatedAtMs: nowMs,
        }, { merge: true });
    });
}
async function claimAssetRun(db, ref, attemptId, actor, nowMs) {
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists)
            throw new https_1.HttpsError('not-found', 'asset_job_not_found');
        const raw = snap.data();
        if (!canClaimAssetRun(raw, nowMs))
            throw new https_1.HttpsError('failed-precondition', 'asset_job_not_runnable');
        tx.set(ref, {
            status: 'running',
            error: '',
            errorDiagnostic: '',
            runAttemptId: attemptId,
            runStartedAtMs: nowMs,
            runLeaseExpiresAtMs: nowMs + RUN_LEASE_MS,
            updatedAtMs: nowMs,
            runBy: actor.email,
            runByUid: actor.actorUid,
        }, { merge: true });
        return { id: snap.id, ...raw };
    });
}
exports.adminListAssetJobs = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    requireAssetPermission(request, 'content.read');
    const limit = Math.max(1, Math.min(50, Number(request.data?.limit || 25)));
    const snapshot = await admin.firestore().collection(JOBS_COLLECTION).orderBy('createdAtMs', 'desc').limit(limit).get();
    const projected = await Promise.all(snapshot.docs.map(async (doc) => withFreshPreviewUrls(projectAssetJob(doc.id, doc.data()))));
    return { ok: true, items: projected, fetchedAtMs: Date.now() };
});
exports.adminCreateAssetJob = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    const actor = requireAssetPermission(request, 'content.draft.write');
    const job = normalizeAssetJobInput(request.data);
    const now = Date.now();
    const ref = await admin.firestore().collection(JOBS_COLLECTION).add({
        ...job,
        status: 'draft',
        createdAtMs: now,
        updatedAtMs: now,
        createdBy: actor.email,
        createdByUid: actor.actorUid,
        results: [],
    });
    await admin.firestore().collection('admin_log').add({
        ts: new Date(now).toISOString(),
        adminEmail: actor.email,
        actorUid: actor.actorUid,
        action: 'asset_studio_job_created',
        details: { jobId: ref.id, kind: job.kind, count: job.count, targetPath: job.targetPath },
    });
    const snap = await ref.get();
    return { ok: true, job: projectAssetJob(ref.id, snap.data()) };
});
exports.adminRunAssetJob = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK, timeoutSeconds: 120, memory: '1GiB', secrets: [OPENAI_API_KEY] }, async (request) => {
    const actor = requireAssetPermission(request, 'content.draft.write');
    const db = admin.firestore();
    const apiKey = String(OPENAI_API_KEY.value() || '').trim();
    if (!apiKey)
        throw new https_1.HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');
    const cfg = await (0, openai_jobs_config_1.resolveJobConfig)(db, 'image_assets');
    (0, openai_jobs_config_1.assertJobEnabled)(cfg, 'image_assets');
    const jobId = text(request.data?.jobId, 160);
    if (!jobId)
        throw new https_1.HttpsError('invalid-argument', 'job_id_required');
    const ref = db.collection(JOBS_COLLECTION).doc(jobId);
    const now = Date.now();
    const attemptId = `${now}-${Math.random().toString(36).slice(2, 10)}`;
    const claimed = await claimAssetRun(db, ref, attemptId, actor, now);
    const job = normalizeAssetJobInput(claimed);
    const existingResults = Array.isArray(claimed.results) ? claimed.results : [];
    const slots = missingAssetSlots(job.count, existingResults);
    try {
        await reserveImageBudget(db, slots.length, cfg.globalDailyCap, now);
        const bucket = admin.storage().bucket();
        const results = [...existingResults];
        for (const slot of slots) {
            const png = await generateImage(apiKey, job);
            const objectPath = `admin-asset-studio/${jobId}/generated-${slot}.png`;
            const file = bucket.file(objectPath);
            await file.save(png, { resumable: false, contentType: 'image/png', metadata: { cacheControl: 'private, max-age=0' } });
            const result = { slot, gsPath: objectPath, width: 1024, height: 1024 };
            const nextResults = [...results.filter((item) => Number(item.slot || 0) !== slot), result].sort((a, b) => Number(a.slot || 0) - Number(b.slot || 0));
            results.splice(0, results.length, ...nextResults);
            await ref.set({ results, updatedAtMs: Date.now(), runAttemptId: attemptId }, { merge: true });
        }
        await ref.set({ status: 'generated', results, updatedAtMs: Date.now(), generatedBy: actor.email, runAttemptId: attemptId }, { merge: true });
        await db.collection('admin_log').add({
            ts: new Date().toISOString(),
            adminEmail: actor.email,
            actorUid: actor.actorUid,
            action: 'asset_studio_job_generated',
            details: { jobId, count: results.length, kind: job.kind, targetPath: job.targetPath },
        });
    }
    catch (error) {
        const sanitized = sanitizeProviderError(error);
        const publicMessage = error instanceof https_1.HttpsError ? error.message : sanitized.publicMessage;
        const diagnostic = error instanceof https_1.HttpsError ? error.message : sanitized.diagnostic;
        await ref.set({ status: 'failed', error: publicMessage, errorDiagnostic: diagnostic, updatedAtMs: Date.now(), runAttemptId: attemptId }, { merge: true });
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', publicMessage);
    }
    const done = await ref.get();
    return { ok: true, job: await withFreshPreviewUrls(projectAssetJob(jobId, done.data())) };
});
//# sourceMappingURL=admin_asset_studio.js.map