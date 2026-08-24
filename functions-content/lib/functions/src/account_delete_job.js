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
exports.ACCOUNT_DELETE_PERMANENT_DENIALS = exports.ACCOUNT_DELETE_AUTH_MARKERS = exports.ACCOUNT_DELETE_TOMBSTONES = exports.ACCOUNT_DELETE_JOBS = void 0;
exports.accountDeleteJobId = accountDeleteJobId;
exports.accountDeletePermanentDenialId = accountDeletePermanentDenialId;
exports.enqueueAccountDeletionJob = enqueueAccountDeletionJob;
exports.processAccountDeletionJob = processAccountDeletionJob;
const admin = __importStar(require("firebase-admin"));
const crypto_1 = require("crypto");
const https_1 = require("firebase-functions/v2/https");
exports.ACCOUNT_DELETE_JOBS = 'account_deletion_jobs';
exports.ACCOUNT_DELETE_TOMBSTONES = 'account_deletion_tombstones';
exports.ACCOUNT_DELETE_AUTH_MARKERS = 'account_deletion_auth_markers';
exports.ACCOUNT_DELETE_PERMANENT_DENIALS = 'account_deletion_permanent_denials';
const ACCOUNT_DELETE_JOB_LEASE_MS = 10 * 60_000;
const ACCOUNT_DELETE_JOB_MAX_ATTEMPTS = 8;
const ACCOUNT_DELETE_JOB_INITIAL_BACKOFF_MS = 30_000;
const ACCOUNT_DELETE_JOB_MAX_BACKOFF_MS = 30 * 60_000;
const ACCOUNT_DELETE_JOB_AUDIT_RETENTION_MS = 30 * 24 * 60 * 60_000;
function sha256(value) {
    return (0, crypto_1.createHash)('sha256').update(value).digest('hex');
}
function accountDeleteJobId(authUid) {
    return `adel_${sha256(authUid).slice(0, 40)}`;
}
function accountDeletePermanentDenialId(identity) {
    return `adel_deny_${sha256(identity)}`;
}
function jobStatus(value) {
    if (value === 'running' || value === 'completed' || value === 'failed')
        return value;
    return 'queued';
}
async function enqueueAccountDeletionJob(db, authUid, stableUid, nowMs = Date.now()) {
    const jobId = accountDeleteJobId(authUid);
    const ref = db.collection(exports.ACCOUNT_DELETE_JOBS).doc(jobId);
    const tombstoneRef = db.collection(exports.ACCOUNT_DELETE_TOMBSTONES).doc(stableUid);
    const authMarkerRef = db.collection(exports.ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid);
    const permanentDenialRef = db.collection(exports.ACCOUNT_DELETE_PERMANENT_DENIALS)
        .doc(accountDeletePermanentDenialId(stableUid));
    const authPermanentDenialRef = db.collection(exports.ACCOUNT_DELETE_PERMANENT_DENIALS)
        .doc(accountDeletePermanentDenialId(authUid));
    return db.runTransaction(async (tx) => {
        const snapshot = await tx.get(ref);
        tx.set(authMarkerRef, {
            jobId,
            status: 'pending',
            authUidHash: sha256(authUid),
            stableUidHash: sha256(stableUid),
            updatedAtMs: nowMs,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        tx.set(tombstoneRef, {
            jobId,
            status: 'pending',
            authUidHash: sha256(authUid),
            stableUidHash: sha256(stableUid),
            updatedAtMs: nowMs,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        const permanentDenial = {
            status: 'denied',
            stableUidHash: sha256(stableUid),
            authUidHash: sha256(authUid),
            createdAtMs: nowMs,
            updatedAtMs: nowMs,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        tx.set(permanentDenialRef, { ...permanentDenial, identityKind: 'stable' }, { merge: true });
        tx.set(authPermanentDenialRef, { ...permanentDenial, identityKind: 'auth' }, { merge: true });
        if (snapshot.exists) {
            const existing = snapshot.data() ?? {};
            const status = jobStatus(existing.status);
            if (status === 'completed') {
                tx.set(ref, {
                    updatedAtMs: nowMs,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
                return { jobId, status, created: false };
            }
            if (existing.authUid !== authUid || existing.stableUid !== stableUid) {
                throw new https_1.HttpsError('failed-precondition', 'account_delete_job_identity_mismatch');
            }
            if (status === 'failed') {
                tx.set(ref, {
                    status: 'queued',
                    attempts: 0,
                    leaseUntilMs: admin.firestore.FieldValue.delete(),
                    nextAttemptAtMs: nowMs,
                    updatedAtMs: nowMs,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    lastError: admin.firestore.FieldValue.delete(),
                    retentionUntilMs: admin.firestore.FieldValue.delete(),
                }, { merge: true });
                return { jobId, status: 'queued', created: false };
            }
            tx.set(ref, {
                updatedAtMs: nowMs,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            return { jobId, status, created: false };
        }
        tx.create(ref, {
            jobId,
            authUid,
            stableUid,
            authUidHash: sha256(authUid),
            stableUidHash: sha256(stableUid),
            status: 'queued',
            attempts: 0,
            nextAttemptAtMs: nowMs,
            createdAtMs: nowMs,
            updatedAtMs: nowMs,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { jobId, status: 'queued', created: true };
    });
}
function boundedError(error) {
    return String(error?.message ?? error)
        .replace(/\s+/g, ' ')
        .slice(0, 240);
}
async function processAccountDeletionJob(db, jobId, execute, nowMs = Date.now()) {
    const ref = db.collection(exports.ACCOUNT_DELETE_JOBS).doc(jobId);
    const claimed = await db.runTransaction(async (tx) => {
        const snapshot = await tx.get(ref);
        if (!snapshot.exists)
            return null;
        const data = snapshot.data() ?? {};
        const status = jobStatus(data.status);
        const leaseUntilMs = Number(data.leaseUntilMs ?? 0);
        const nextAttemptAtMs = Number(data.nextAttemptAtMs ?? 0);
        if (status === 'completed' || status === 'failed')
            return null;
        if (status === 'queued' && Number.isFinite(nextAttemptAtMs) && nextAttemptAtMs > nowMs)
            return null;
        if (status === 'running' && Number.isFinite(leaseUntilMs) && leaseUntilMs > nowMs)
            return null;
        const authUid = typeof data.authUid === 'string' ? data.authUid : '';
        const stableUid = typeof data.stableUid === 'string' ? data.stableUid : '';
        if (!authUid || !stableUid) {
            throw new Error('account_delete_job_identity_missing');
        }
        const previousAttempts = Math.max(0, Math.floor(Number(data.attempts) || 0));
        if (previousAttempts >= ACCOUNT_DELETE_JOB_MAX_ATTEMPTS) {
            tx.update(ref, {
                status: 'failed',
                leaseUntilMs: admin.firestore.FieldValue.delete(),
                retentionUntilMs: admin.firestore.FieldValue.delete(),
                updatedAtMs: nowMs,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return null;
        }
        const attempts = previousAttempts + 1;
        const leaseToken = `${jobId}:${attempts}:${nowMs}`;
        tx.update(ref, {
            status: 'running',
            attempts,
            leaseToken,
            leaseUntilMs: nowMs + ACCOUNT_DELETE_JOB_LEASE_MS,
            nextAttemptAtMs: admin.firestore.FieldValue.delete(),
            startedAtMs: nowMs,
            updatedAtMs: nowMs,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastError: admin.firestore.FieldValue.delete(),
        });
        return { authUid, stableUid, attempts, leaseToken };
    });
    if (!claimed)
        return;
    try {
        const stats = await execute(db, claimed.stableUid, claimed.authUid);
        const batch = db.batch();
        batch.set(ref, {
            status: 'completed',
            leaseUntilMs: admin.firestore.FieldValue.delete(),
            nextAttemptAtMs: admin.firestore.FieldValue.delete(),
            completedAtMs: nowMs,
            retentionUntilMs: nowMs + ACCOUNT_DELETE_JOB_AUDIT_RETENTION_MS,
            updatedAtMs: nowMs,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            authUid: admin.firestore.FieldValue.delete(),
            stableUid: admin.firestore.FieldValue.delete(),
            ...stats,
        }, { merge: true });
        batch.set(db.collection(exports.ACCOUNT_DELETE_TOMBSTONES).doc(claimed.stableUid), {
            status: 'completed',
            completedAtMs: nowMs,
            retentionUntilMs: nowMs + ACCOUNT_DELETE_JOB_AUDIT_RETENTION_MS,
            updatedAtMs: nowMs,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        batch.set(db.collection(exports.ACCOUNT_DELETE_AUTH_MARKERS).doc(claimed.authUid), {
            status: 'completed',
            completedAtMs: nowMs,
            retentionUntilMs: nowMs + ACCOUNT_DELETE_JOB_AUDIT_RETENTION_MS,
            updatedAtMs: nowMs,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        await batch.commit();
    }
    catch (error) {
        const backoffMs = Math.min(ACCOUNT_DELETE_JOB_INITIAL_BACKOFF_MS * (2 ** Math.max(0, claimed.attempts - 1)), ACCOUNT_DELETE_JOB_MAX_BACKOFF_MS);
        await ref.set({
            status: 'queued',
            leaseUntilMs: admin.firestore.FieldValue.delete(),
            nextAttemptAtMs: nowMs + backoffMs,
            updatedAtMs: nowMs,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastError: boundedError(error),
        }, { merge: true });
        throw error;
    }
}
//# sourceMappingURL=account_delete_job.js.map