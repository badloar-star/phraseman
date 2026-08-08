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
exports.agentManagerIssueExecutionJob = void 0;
exports.issueExecutionJobForQueuedEvent = issueExecutionJobForQueuedEvent;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
const contracts_1 = require("../agent_office/contracts");
const execution_contracts_1 = require("./execution_contracts");
const TASKS = 'agent_manager_tasks';
const JOBS = 'agent_manager_execution_jobs';
const REGION = 'us-central1';
function safeTaskId(value) {
    return typeof value === 'string' && /^[A-Za-z][A-Za-z0-9._:-]{2,159}$/.test(value) ? value : null;
}
function safeRevision(value) {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 ? value : null;
}
function queuedEvent(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return null;
    const event = value;
    const taskId = safeTaskId(event.taskId);
    const taskRevision = safeRevision(event.taskRevision);
    if (!taskId || !taskRevision || event.toStatus !== 'queued')
        return null;
    return Object.freeze({ taskId, taskRevision, toStatus: 'queued' });
}
function executionScope(value) {
    return value === 'support_draft' || value === 'analysis_only' || value === 'report_triage' ? value : null;
}
function taskMatchesQueuedEvent(value, event) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return null;
    const task = value;
    if (task.taskId !== event.taskId || task.status !== 'queued' || task.revision !== event.taskRevision)
        return null;
    return executionScope(task.allowedScope);
}
function jobId(taskId, taskRevision) { return `${taskId}__r${taskRevision}`; }
function buildExecutionJob(taskId, taskRevision, scope, nowMs) {
    const idempotencyKey = `exec:${(0, contracts_1.sha256)(`${taskId}:r${taskRevision}`)}`;
    return (0, execution_contracts_1.parseExecutionJob)({
        schemaVersion: 1, taskId, taskRevision, scope, handlerVersion: `${scope.replace('_', '-')}-v1`,
        state: 'queued', attempts: 0, maxAttempts: 2, leaseUntilMs: null,
        idempotencyKey, idempotencyKeyHash: (0, contracts_1.sha256)(idempotencyKey), createdAtMs: nowMs, updatedAtMs: nowMs,
        leasedAtMs: null, finishedAtMs: null, outputRef: null, outputHash: null,
    });
}
/** Creates exactly one bounded, server-only job after an immutable task event enters the queue. */
async function issueExecutionJobForQueuedEvent(repository, rawEvent, nowMs) {
    const event = queuedEvent(rawEvent);
    if (!event)
        return Object.freeze({ created: false, jobId: null });
    const id = jobId(event.taskId, event.taskRevision);
    return repository.runTransaction(async (transaction) => {
        const task = await transaction.get(`${TASKS}/${event.taskId}`);
        const scope = task ? taskMatchesQueuedEvent(task.data, event) : null;
        if (!scope)
            return Object.freeze({ created: false, jobId: null });
        const path = `${JOBS}/${id}`;
        if (await transaction.get(path))
            return Object.freeze({ created: false, jobId: id });
        transaction.create(path, buildExecutionJob(event.taskId, event.taskRevision, scope, nowMs));
        return Object.freeze({ created: true, jobId: id });
    });
}
function firestoreRepository(db) {
    return {
        runTransaction: (body) => db.runTransaction(async (transaction) => body({
            get: async (path) => {
                const snapshot = await transaction.get(db.doc(path));
                return snapshot.exists ? { id: snapshot.id, data: snapshot.data() ?? {} } : null;
            },
            create: (path, data) => transaction.create(db.doc(path), data),
        })),
    };
}
exports.agentManagerIssueExecutionJob = (0, firestore_1.onDocumentCreated)({ document: 'agent_manager_task_events/{eventId}', region: REGION, timeoutSeconds: 30, memory: '256MiB', maxInstances: 3 }, async (event) => {
    const eventData = event.data?.data() ?? {};
    if (eventData.toStatus !== 'queued')
        return;
    await issueExecutionJobForQueuedEvent(firestoreRepository(admin.firestore()), eventData, Date.now());
});
//# sourceMappingURL=execution_outbox.js.map