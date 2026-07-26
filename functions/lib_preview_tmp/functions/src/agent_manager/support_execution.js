"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSupportExecutionHandler = createSupportExecutionHandler;
const contracts_1 = require("../agent_office/contracts");
const support_inbox_1 = require("../support_inbox");
const execution_contracts_1 = require("./execution_contracts");
const TASKS = 'agent_manager_tasks';
const JOBS = 'agent_manager_execution_jobs';
const EVENTS = 'agent_manager_task_events';
const LINKS = 'agent_manager_inbox_links';
const OPERATIONS = 'agent_manager_support_draft_operations';
const SYSTEM_ACTOR_UID = 'agent_manager_execution_worker';
function object(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}
function liveClaim(job, claim, nowMs) {
    return job.state === 'leased' && job.taskId === claim.job.taskId && job.taskRevision === claim.job.taskRevision
        && job.scope === 'support_draft' && job.handlerVersion === claim.job.handlerVersion
        && job.leasedAtMs === claim.leasedAtMs && job.leaseUntilMs === claim.leaseUntilMs
        && claim.leaseUntilMs > nowMs;
}
function supportRef(task) {
    if (task.status !== 'queued' || !Number.isSafeInteger(task.revision) || task.revision < 1 || task.allowedScope !== 'support_draft')
        return null;
    const links = Array.isArray(task.sourceLinks) ? task.sourceLinks : [];
    const row = links.find((entry) => object(entry)?.sourceType === 'support');
    const ref = object(row)?.sourceRef;
    return typeof ref === 'string' && /^support:sha256:[a-f0-9]{64}$/.test(ref) ? ref : null;
}
function sourceDocumentId(link, taskId, ref) {
    return link?.taskId === taskId && link.sourceType === 'support' && link.sourceRef === ref
        && link.sourceCollection === 'support_inbox' && typeof link.sourceDocumentId === 'string' && /^m_[a-f0-9]{64}$/.test(link.sourceDocumentId)
        ? link.sourceDocumentId : null;
}
function taskEvent(taskId, revision, fromStatus, toStatus, nowMs) {
    return { schemaVersion: 1, eventId: `${taskId}__r${revision}`, taskId, eventType: 'task_transitioned', fromStatus, toStatus,
        assignedAgentId: 'support', taskRevision: revision, occurredAtMs: nowMs, actorUid: SYSTEM_ACTOR_UID, actorRole: 'system', piiClass: 'none' };
}
async function closeJob(db, claim, nowMs, outcome) {
    return db.runTransaction(async (tx) => {
        const ref = db.collection(JOBS).doc(claim.jobId);
        const snap = await tx.get(ref);
        let job;
        try {
            job = (0, execution_contracts_1.parseExecutionJob)(snap.data());
        }
        catch {
            return 'cancelled';
        }
        if (!liveClaim(job, claim, nowMs))
            return 'cancelled';
        tx.update(ref, { state: outcome, leaseUntilMs: null, updatedAtMs: nowMs, finishedAtMs: nowMs, outputRef: null, outputHash: null });
        return outcome;
    });
}
/**
 * A durable marker is deliberately acquired before the provider call. If the
 * process dies after that call, a retry fails closed instead of spending again.
 */
async function reserveProviderAttempt(db, claim, nowMs) {
    return db.runTransaction(async (tx) => {
        const jobRef = db.collection(JOBS).doc(claim.jobId);
        const taskRef = db.collection(TASKS).doc(claim.job.taskId);
        const operationRef = db.collection(OPERATIONS).doc(claim.jobId);
        const [jobSnap, taskSnap, operationSnap] = await Promise.all([tx.get(jobRef), tx.get(taskRef), tx.get(operationRef)]);
        let job;
        try {
            job = (0, execution_contracts_1.parseExecutionJob)(jobSnap.data());
        }
        catch {
            return Object.freeze({ blocked: true });
        }
        const task = taskSnap.exists ? object(taskSnap.data()) : null;
        const ref = task ? supportRef(task) : null;
        const linkSnap = ref ? await tx.get(db.collection(LINKS).doc(ref.slice(-64))) : null;
        const sourceId = ref ? sourceDocumentId(linkSnap?.data(), claim.job.taskId, ref) : null;
        if (!liveClaim(job, claim, nowMs) || !task || task.revision !== claim.job.taskRevision || !sourceId || operationSnap.exists)
            return Object.freeze({ blocked: true });
        tx.create(operationRef, {
            schemaVersion: 1, jobId: claim.jobId, taskId: claim.job.taskId, taskRevision: claim.job.taskRevision,
            claimHash: (0, contracts_1.sha256)(`${claim.jobId}:${claim.leasedAtMs}:${claim.leaseUntilMs}`), state: 'reserved',
            createdAtMs: nowMs, updatedAtMs: nowMs, finishedAtMs: null, piiClass: 'none',
        });
        return Object.freeze({ sourceDocumentId: sourceId, sourceRef: ref });
    });
}
async function finishReservation(db, claim, nowMs, state) {
    await db.collection(OPERATIONS).doc(claim.jobId).set({ state, updatedAtMs: nowMs, finishedAtMs: nowMs }, { merge: true });
}
/** Creates one review-only support draft and atomically exposes the task for manual review. */
function createSupportExecutionHandler(db, apiKey) {
    return async (claim, nowMs) => {
        if (claim.job.scope !== 'support_draft')
            return null;
        const reservation = await reserveProviderAttempt(db, claim, nowMs);
        if ('blocked' in reservation)
            return closeJob(db, claim, nowMs, 'failed');
        const sourceId = reservation.sourceDocumentId;
        const sourceRef = reservation.sourceRef;
        let result;
        try {
            result = await (0, support_inbox_1.generateAgentManagerSupportDraft)({
                db, sourceDocumentId: sourceId, apiKey, requestId: `agent-manager-${(0, contracts_1.sha256)(claim.jobId)}`,
                finalize: async (tx, outputHash) => {
                    const completionNow = Date.now();
                    const jobSnap = await tx.get(db.collection(JOBS).doc(claim.jobId));
                    const currentTaskSnap = await tx.get(db.collection(TASKS).doc(claim.job.taskId));
                    const currentLinkSnap = await tx.get(db.collection(LINKS).doc(sourceRef.slice(-64)));
                    let job;
                    try {
                        job = (0, execution_contracts_1.parseExecutionJob)(jobSnap.data());
                    }
                    catch {
                        return false;
                    }
                    const currentTask = currentTaskSnap.exists ? object(currentTaskSnap.data()) : null;
                    if (!currentTask || !liveClaim(job, claim, completionNow) || currentTask.revision !== claim.job.taskRevision || supportRef(currentTask) !== sourceRef
                        || sourceDocumentId(currentLinkSnap.data(), claim.job.taskId, sourceRef) !== sourceId)
                        return false;
                    const inProgressRevision = claim.job.taskRevision + 1;
                    const reviewRevision = inProgressRevision + 1;
                    tx.update(db.collection(TASKS).doc(claim.job.taskId), {
                        status: 'needs_review', revision: reviewRevision, updatedAtMs: completionNow,
                        result: { summary: 'Support reply draft is ready for manual review. No message was sent.', outcome: 'needs_review' },
                    });
                    tx.create(db.collection(EVENTS).doc(`${claim.job.taskId}__r${inProgressRevision}`), taskEvent(claim.job.taskId, inProgressRevision, 'queued', 'in_progress', completionNow));
                    tx.create(db.collection(EVENTS).doc(`${claim.job.taskId}__r${reviewRevision}`), taskEvent(claim.job.taskId, reviewRevision, 'in_progress', 'needs_review', completionNow));
                    tx.update(db.collection(JOBS).doc(claim.jobId), { state: 'succeeded', leaseUntilMs: null, updatedAtMs: completionNow, finishedAtMs: completionNow, outputRef: `execution_output:${outputHash}`, outputHash });
                    tx.update(db.collection(OPERATIONS).doc(claim.jobId), { state: 'stored', updatedAtMs: completionNow, finishedAtMs: completionNow });
                    return true;
                },
            });
        }
        catch {
            await finishReservation(db, claim, nowMs, 'failed');
            return closeJob(db, claim, nowMs, 'failed');
        }
        if (result.kind === 'stored')
            return 'succeeded';
        const outcome = result.kind === 'stale' ? 'cancelled' : 'failed';
        await finishReservation(db, claim, nowMs, outcome);
        return closeJob(db, claim, nowMs, outcome);
    };
}
//# sourceMappingURL=support_execution.js.map