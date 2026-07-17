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
exports.accountDeleteRetryCron = exports.accountDeleteWorker = exports.ACCOUNT_DELETE_RETRY_OPTIONS = exports.ACCOUNT_DELETE_WORKER_OPTIONS = void 0;
exports.sweepAccountDeletionJobs = sweepAccountDeletionJobs;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const account_delete_1 = require("./account_delete");
const account_delete_job_1 = require("./account_delete_job");
exports.ACCOUNT_DELETE_WORKER_OPTIONS = {
    document: `${account_delete_job_1.ACCOUNT_DELETE_JOBS}/{jobId}`,
    region: 'us-central1',
    retry: true,
    timeoutSeconds: 540,
    memory: '1GiB',
};
exports.ACCOUNT_DELETE_RETRY_OPTIONS = {
    schedule: 'every 30 minutes',
    region: 'us-central1',
    retryCount: 3,
    timeoutSeconds: 60,
    memory: '256MiB',
};
exports.accountDeleteWorker = (0, firestore_1.onDocumentWritten)(exports.ACCOUNT_DELETE_WORKER_OPTIONS, async (event) => {
    await (0, account_delete_job_1.processAccountDeletionJob)(admin.firestore(), event.params.jobId, account_delete_1.executeAccountDeletion);
});
async function sweepAccountDeletionJobs(db, nowMs = Date.now()) {
    const jobs = db.collection(account_delete_job_1.ACCOUNT_DELETE_JOBS);
    const [due, stranded, expired, expiredTombstones, expiredAuthMarkers] = await Promise.all([
        jobs.where('nextAttemptAtMs', '<=', nowMs).limit(20).get(),
        jobs.where('leaseUntilMs', '<=', nowMs).limit(20).get(),
        jobs.where('retentionUntilMs', '<=', nowMs).limit(50).get(),
        db.collection(account_delete_job_1.ACCOUNT_DELETE_TOMBSTONES).where('retentionUntilMs', '<=', nowMs).limit(50).get(),
        db.collection(account_delete_job_1.ACCOUNT_DELETE_AUTH_MARKERS).where('retentionUntilMs', '<=', nowMs).limit(50).get(),
    ]);
    const expiredIds = new Set(expired.docs.map((doc) => doc.id));
    const terminalStatuses = new Set(['completed', 'failed']);
    const recoverable = new Map();
    for (const doc of [...due.docs, ...stranded.docs]) {
        const status = String(doc.data().status ?? '');
        if (!expiredIds.has(doc.id) && !terminalStatuses.has(status))
            recoverable.set(doc.id, doc.ref);
    }
    const batch = db.batch();
    for (const ref of recoverable.values()) {
        batch.set(ref, {
            retryRequestedAtMs: nowMs,
            updatedAtMs: nowMs,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
    for (const doc of expired.docs)
        batch.delete(doc.ref);
    for (const doc of expiredTombstones.docs)
        batch.delete(doc.ref);
    for (const doc of expiredAuthMarkers.docs)
        batch.delete(doc.ref);
    if (recoverable.size + expired.size + expiredTombstones.size + expiredAuthMarkers.size > 0)
        await batch.commit();
}
exports.accountDeleteRetryCron = (0, scheduler_1.onSchedule)(exports.ACCOUNT_DELETE_RETRY_OPTIONS, async () => {
    await sweepAccountDeletionJobs(admin.firestore());
});
//# sourceMappingURL=account_delete_worker.js.map