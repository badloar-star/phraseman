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
exports.agentManagerRunBoundedExecutionWorker = exports.agentManagerRunReportTriageWorker = exports.agentManagerRunAnalyticsWorker = void 0;
exports.executeOneAgentManagerJob = executeOneAgentManagerJob;
exports.executeEligibleAgentManagerJobs = executeEligibleAgentManagerJobs;
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const contracts_1 = require("../agent_office/contracts");
const support_inbox_1 = require("../support_inbox");
const contracts_2 = require("./contracts");
const analytics_execution_1 = require("./analytics_execution");
const execution_contracts_1 = require("./execution_contracts");
const support_execution_1 = require("./support_execution");
const TASKS = 'agent_manager_tasks';
const JOBS = 'agent_manager_execution_jobs';
const EVENTS = 'agent_manager_task_events';
const REGION = 'us-central1';
const LEASE_MS = 4 * 60 * 1000;
const MAX_BATCH = 25;
const SYSTEM_ACTOR_UID = 'agent_manager_execution_worker';
function object(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}
function integer(value, min) {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= min ? value : null;
}
function taskPath(taskId) { return `${TASKS}/${taskId}`; }
function jobPath(jobId) { return `${JOBS}/${jobId}`; }
function parseWorkerTask(value) {
    const task = object(value);
    if (!task || task.schemaVersion !== 1 || task.status !== 'queued' || task.result !== null)
        return null;
    const revision = integer(task.revision, 1);
    if (!revision || typeof task.assignedAgentId !== 'string' || typeof task.createdByUid !== 'string')
        return null;
    try {
        const draft = (0, contracts_2.parseManagerTaskDraft)({
            taskId: task.taskId, title: task.title, brief: task.brief, priority: task.priority,
            deadlineAtMs: task.deadlineAtMs, allowedScope: task.allowedScope, sourceLinks: task.sourceLinks,
        });
        if (draft.allowedScope !== 'support_draft' && draft.allowedScope !== 'analysis_only' && draft.allowedScope !== 'report_triage')
            return null;
        return Object.freeze({ taskId: draft.taskId, revision, status: 'queued', scope: draft.allowedScope });
    }
    catch {
        return null;
    }
}
function isClaimable(job, nowMs) {
    return job.state === 'queued' || (job.state === 'leased' && job.leaseUntilMs !== null && job.leaseUntilMs <= nowMs);
}
function terminalJobUpdate(state, nowMs) {
    return { state, leaseUntilMs: null, updatedAtMs: nowMs, finishedAtMs: nowMs, outputRef: null, outputHash: null };
}
function taskEvent(taskId, revision, fromStatus, toStatus, scope, nowMs) {
    return {
        schemaVersion: 1, eventId: `${taskId}__r${revision}`, taskId, eventType: 'task_transitioned', fromStatus, toStatus,
        assignedAgentId: scope === 'support_draft' ? 'support' : scope === 'report_triage' ? 'reports' : 'analytics', taskRevision: revision, occurredAtMs: nowMs,
        actorUid: SYSTEM_ACTOR_UID, actorRole: 'system', piiClass: 'none',
    };
}
function boundedResult(scope) {
    if (scope === 'report_triage') {
        return (0, contracts_2.parseManagerTaskResult)({
            summary: '\u0420\u0435\u043f\u043e\u0440\u0442 \u043f\u043e\u0441\u0442\u0443\u043f\u0438\u043b \u0432 \u043e\u0447\u0435\u0440\u0435\u0434\u044c \u0441\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0441\u0442\u0430 \u0438 \u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043b\u0435\u043d \u043a \u0440\u0443\u0447\u043d\u043e\u043c\u0443 \u0440\u0435\u0448\u0435\u043d\u0438\u044e. \u041e\u0442\u0432\u0435\u0442 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044e \u043d\u0435 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u044f\u043b\u0441\u044f.',
            outcome: 'needs_review',
        });
    }
    return (0, contracts_2.parseManagerTaskResult)({
        summary: scope === 'support_draft'
            ? 'Подготовлен внутренний план проверки черновика поддержки. Внешняя отправка не выполнялась.'
            : 'Подготовлена внутренняя агрегированная аналитическая заготовка. Исходные данные не раскрывались.',
        outcome: 'needs_review',
    });
}
function outputHashFor(job) {
    return (0, contracts_1.sha256)(`agent-manager-review-v1:${job.scope}:${job.taskId}:r${job.taskRevision}`);
}
function matchesLiveClaim(currentJob, claim, nowMs) {
    return currentJob.state === 'leased'
        && currentJob.taskId === claim.job.taskId
        && currentJob.taskRevision === claim.job.taskRevision
        && currentJob.scope === claim.job.scope
        && currentJob.handlerVersion === claim.job.handlerVersion
        && currentJob.leasedAtMs === claim.leasedAtMs
        && currentJob.leaseUntilMs === claim.leaseUntilMs
        && claim.leaseUntilMs > nowMs
        && currentJob.leaseUntilMs !== null
        && currentJob.leaseUntilMs > nowMs;
}
async function claimJob(repository, jobId, nowMs) {
    return repository.runTransaction(async (transaction) => {
        const document = await transaction.get(jobPath(jobId));
        if (!document)
            return null;
        let job;
        try {
            job = (0, execution_contracts_1.parseExecutionJob)(document.data);
        }
        catch {
            return null;
        }
        if (jobId !== `${job.taskId}__r${job.taskRevision}`) {
            transaction.update(jobPath(jobId), terminalJobUpdate('cancelled', nowMs));
            return 'cancelled';
        }
        if (!isClaimable(job, nowMs))
            return null;
        if (job.attempts >= job.maxAttempts) {
            transaction.update(jobPath(jobId), terminalJobUpdate('failed', nowMs));
            return 'failed';
        }
        const leaseUntilMs = nowMs + LEASE_MS;
        const leased = Object.freeze({ ...job, state: 'leased', attempts: job.attempts + 1, leasedAtMs: nowMs, leaseUntilMs, updatedAtMs: nowMs });
        transaction.update(jobPath(jobId), {
            state: leased.state, attempts: leased.attempts, leasedAtMs: nowMs, leaseUntilMs, updatedAtMs: nowMs,
            finishedAtMs: null, outputRef: null, outputHash: null,
        });
        return Object.freeze({ jobId, job: leased, leasedAtMs: nowMs, leaseUntilMs });
    });
}
async function completeClaim(repository, claim, nowMs, completion) {
    return repository.runTransaction(async (transaction) => {
        const document = await transaction.get(jobPath(claim.jobId));
        if (!document)
            return 'cancelled';
        let currentJob;
        try {
            currentJob = (0, execution_contracts_1.parseExecutionJob)(document.data);
        }
        catch {
            return 'cancelled';
        }
        const completionNow = Date.now();
        if (!matchesLiveClaim(currentJob, claim, completionNow))
            return 'cancelled';
        const taskDocument = await transaction.get(taskPath(claim.job.taskId));
        const task = taskDocument ? parseWorkerTask(taskDocument.data) : null;
        if (!task || task.taskId !== claim.job.taskId || task.revision !== claim.job.taskRevision || task.scope !== claim.job.scope) {
            transaction.update(jobPath(document.id), terminalJobUpdate('cancelled', nowMs));
            return 'cancelled';
        }
        const inProgressRevision = task.revision + 1;
        const reviewRevision = inProgressRevision + 1;
        let result;
        try {
            result = (0, contracts_2.parseManagerTaskResult)(completion?.result ?? boundedResult(task.scope));
        }
        catch {
            transaction.update(jobPath(document.id), terminalJobUpdate('failed', completionNow));
            return 'failed';
        }
        const outputHash = outputHashFor(claim.job);
        transaction.update(taskPath(task.taskId), { status: 'needs_review', revision: reviewRevision, updatedAtMs: completionNow, result });
        transaction.create(`${EVENTS}/${task.taskId}__r${inProgressRevision}`, taskEvent(task.taskId, inProgressRevision, 'queued', 'in_progress', task.scope, completionNow));
        transaction.create(`${EVENTS}/${task.taskId}__r${reviewRevision}`, taskEvent(task.taskId, reviewRevision, 'in_progress', 'needs_review', task.scope, completionNow));
        transaction.update(jobPath(document.id), {
            state: 'succeeded', leaseUntilMs: null, updatedAtMs: completionNow, finishedAtMs: completionNow,
            outputRef: `execution_output:${outputHash}`, outputHash,
        });
        return 'succeeded';
    });
}
/** Claims one internal review job and persists a bounded result without any external side effect. */
async function executeOneAgentManagerJob(repository, jobId, nowMs, handler) {
    const claim = await claimJob(repository, jobId, nowMs);
    if (claim === null)
        return Object.freeze({ jobId, outcome: 'skipped' });
    if (claim === 'cancelled')
        return Object.freeze({ jobId, outcome: 'cancelled' });
    if (claim === 'failed')
        return Object.freeze({ jobId, outcome: 'failed' });
    const handled = handler ? await handler(claim, nowMs) : null;
    if (handled && typeof handled === 'object')
        return Object.freeze({ jobId, outcome: await completeClaim(repository, claim, nowMs, handled) });
    return Object.freeze({ jobId, outcome: handled ?? await completeClaim(repository, claim, nowMs) });
}
async function executeEligibleAgentManagerJobs(repository, nowMs, limit = MAX_BATCH, handler, allowedScopes) {
    const jobs = (await repository.listEligibleJobs(allowedScopes))
        .filter((document) => {
        if (!allowedScopes)
            return true;
        try {
            return allowedScopes.includes((0, execution_contracts_1.parseExecutionJob)(document.data).scope);
        }
        catch {
            return false;
        }
    })
        .slice(0, Math.max(1, Math.min(MAX_BATCH, limit)));
    let succeeded = 0;
    let cancelled = 0;
    let failed = 0;
    for (const job of jobs) {
        const outcome = await executeOneAgentManagerJob(repository, job.id, nowMs, handler);
        if (outcome.outcome === 'succeeded')
            succeeded += 1;
        if (outcome.outcome === 'cancelled')
            cancelled += 1;
        if (outcome.outcome === 'failed')
            failed += 1;
    }
    return Object.freeze({ attempted: jobs.length, succeeded, cancelled, failed });
}
function firestoreRepository(db) {
    return {
        get: async (path) => {
            const snapshot = await db.doc(path).get();
            return snapshot.exists ? { id: snapshot.id, data: snapshot.data() ?? {} } : null;
        },
        listEligibleJobs: async (allowedScopes) => {
            const scope = allowedScopes?.length === 1 ? allowedScopes[0] : null;
            const query = scope
                ? db.collection(JOBS).where('scope', '==', scope).where('state', 'in', ['queued', 'leased'])
                : db.collection(JOBS).where('state', 'in', ['queued', 'leased']);
            const snapshot = await query.limit(MAX_BATCH).get();
            return snapshot.docs.map((document) => ({ id: document.id, data: document.data() }));
        },
        runTransaction: (body) => db.runTransaction(async (transaction) => body({
            get: async (path) => {
                const snapshot = await transaction.get(db.doc(path));
                return snapshot.exists ? { id: snapshot.id, data: snapshot.data() ?? {} } : null;
            },
            create: (path, data) => transaction.create(db.doc(path), data),
            update: (path, data) => transaction.update(db.doc(path), data),
        })),
    };
}
exports.agentManagerRunAnalyticsWorker = (0, scheduler_1.onSchedule)({ schedule: 'every 5 minutes', region: REGION, timeoutSeconds: 60, memory: '256MiB', maxInstances: 1 }, async () => {
    const db = admin.firestore();
    await executeEligibleAgentManagerJobs(firestoreRepository(db), Date.now(), 1, (0, analytics_execution_1.createAnalyticsExecutionHandler)(db), ['analysis_only']);
});
exports.agentManagerRunReportTriageWorker = (0, scheduler_1.onSchedule)({ schedule: 'every 5 minutes', region: REGION, timeoutSeconds: 60, memory: '256MiB', maxInstances: 1 }, async () => {
    await executeEligibleAgentManagerJobs(firestoreRepository(admin.firestore()), Date.now(), 1, undefined, ['report_triage']);
});
/** Support is the only worker that receives the support drafting secret. */
exports.agentManagerRunBoundedExecutionWorker = (0, scheduler_1.onSchedule)({ schedule: 'every 5 minutes', region: REGION, timeoutSeconds: 60, memory: '256MiB', maxInstances: 1, secrets: [support_inbox_1.SUPPORT_OPENAI_API_KEY] }, async () => {
    const apiKey = String(support_inbox_1.SUPPORT_OPENAI_API_KEY.value() || '').trim();
    if (!apiKey)
        throw new Error('agent manager support draft key is unavailable');
    const db = admin.firestore();
    // One provider request maximum per invocation keeps the 60-second deadline honest.
    await executeEligibleAgentManagerJobs(firestoreRepository(db), Date.now(), 1, (0, support_execution_1.createSupportExecutionHandler)(db, apiKey), ['support_draft']);
});
//# sourceMappingURL=execution_worker.js.map