"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildLocalRunnerCodePrepareJob = buildLocalRunnerCodePrepareJob;
exports.createLocalRunnerPairing = createLocalRunnerPairing;
exports.exchangeLocalRunnerPairing = exchangeLocalRunnerPairing;
exports.revokeLocalRunnerCapability = revokeLocalRunnerCapability;
exports.claimOneLocalRunnerJob = claimOneLocalRunnerJob;
exports.submitLocalRunnerReview = submitLocalRunnerReview;
const node_crypto_1 = require("node:crypto");
const contracts_1 = require("./contracts");
const execution_contracts_1 = require("./execution_contracts");
const PAIRINGS = 'agent_manager_local_runner_pairings';
const CAPABILITIES = 'agent_manager_local_runner_capabilities';
const LEASES = 'agent_manager_local_runner_leases';
const TASKS = 'agent_manager_tasks';
const JOBS = 'agent_manager_execution_jobs';
const EVENTS = 'agent_manager_task_events';
const PAIRING_TTL_MS = 10 * 60 * 1000;
const CAPABILITY_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const LEASE_TTL_MS = 4 * 60 * 1000;
function fail(message) { throw new Error(message); }
function hash(value) { return (0, node_crypto_1.createHash)('sha256').update(value).digest('hex'); }
function text(value, label, min, max) {
    if (typeof value !== 'string' || value.length < min || value.length > max || /[\u0000-\u001f\u007f]/.test(value))
        fail(`${label} is invalid`);
    return value;
}
function identifier(value, label) {
    if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9._:-]{2,159}$/.test(value))
        fail(`${label} is invalid`);
    return value;
}
function positiveInteger(value, label) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
        fail(`${label} is invalid`);
    return value;
}
function equalHash(actual, raw) {
    if (typeof actual !== 'string' || !/^[a-f0-9]{64}$/i.test(actual))
        return false;
    return (0, node_crypto_1.timingSafeEqual)(Buffer.from(actual, 'hex'), Buffer.from(hash(raw), 'hex'));
}
function pairingPath(pairingId) { return `${PAIRINGS}/${pairingId}`; }
function capabilityPath(capabilityId) { return `${CAPABILITIES}/${capabilityId}`; }
function leasePath(jobId) { return `${LEASES}/${jobId}`; }
function taskPath(taskId) { return `${TASKS}/${taskId}`; }
function jobPath(jobId) { return `${JOBS}/${jobId}`; }
function randomIdentifier(nextRandom, label) { return identifier(nextRandom(), label); }
function randomSecret(nextRandom, label) { return text(nextRandom(), label, 8, 160); }
function localCapability(value, nowMs) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        fail('local runner capability is invalid');
    const input = value;
    return Object.freeze({ capabilityId: identifier(input.capabilityId, 'capabilityId'), token: text(input.token, 'capability token', 8, 160) });
}
async function requireCapability(transaction, raw, nowMs) {
    const capabilityId = identifier(raw.capabilityId, 'capabilityId');
    const token = text(raw.token, 'capability token', 8, 160);
    const document = await transaction.get(capabilityPath(capabilityId));
    const data = document?.data;
    if (!data || data.capabilityId !== capabilityId || data.revokedAtMs !== null || !equalHash(data.tokenHash, token)
        || typeof data.expiresAtMs !== 'number' || !Number.isSafeInteger(data.expiresAtMs) || data.expiresAtMs <= nowMs) {
        fail('local runner capability is unavailable');
    }
    return Object.freeze({ capabilityId, ownerUid: identifier(data.ownerUid, 'ownerUid') });
}
function queuedCodeJob(value) {
    try {
        const job = (0, execution_contracts_1.parseExecutionJob)(value);
        return job.scope === 'code_prepare' && job.state === 'queued' ? job : null;
    }
    catch {
        return null;
    }
}
function buildLocalRunnerCodePrepareJob(taskIdValue, taskRevisionValue, nowMsValue) {
    const taskId = identifier(taskIdValue, 'taskId');
    const taskRevision = positiveInteger(taskRevisionValue, 'taskRevision');
    if (taskRevision < 1)
        fail('taskRevision is invalid');
    const nowMs = positiveInteger(nowMsValue, 'nowMs');
    const idempotencyKey = `exec:${hash(`${taskId}:r${taskRevision}`)}`;
    return (0, execution_contracts_1.parseExecutionJob)({
        schemaVersion: 1, taskId, taskRevision, scope: 'code_prepare', handlerVersion: 'code-prepare-v1',
        state: 'queued', attempts: 0, maxAttempts: 2, leaseUntilMs: null,
        idempotencyKey, idempotencyKeyHash: hash(idempotencyKey), createdAtMs: nowMs, updatedAtMs: nowMs,
        leasedAtMs: null, finishedAtMs: null, outputRef: null, outputHash: null,
    });
}
function queuedCodeTask(value, job) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return null;
    const task = value;
    if (task.status !== 'queued' || task.result !== null || task.revision !== job.taskRevision || task.assignedAgentId !== 'developer')
        return null;
    try {
        const draft = (0, contracts_1.parseManagerTaskDraft)({
            taskId: task.taskId, title: task.title, brief: task.brief, priority: task.priority,
            deadlineAtMs: task.deadlineAtMs, allowedScope: task.allowedScope, sourceLinks: task.sourceLinks,
        });
        if (draft.taskId !== job.taskId || draft.allowedScope !== 'code_prepare')
            return null;
        return Object.freeze({ taskId: draft.taskId, revision: job.taskRevision, title: draft.title, brief: draft.brief });
    }
    catch {
        return null;
    }
}
async function createLocalRunnerPairing(repository, input, nowMs, nextRandom) {
    const ownerUid = identifier(input.ownerUid, 'ownerUid');
    const pairingId = randomIdentifier(nextRandom, 'pairingId');
    const code = randomSecret(nextRandom, 'pairing code');
    const expiresAtMs = positiveInteger(nowMs, 'nowMs') + PAIRING_TTL_MS;
    await repository.runTransaction(async (transaction) => {
        if (await transaction.get(pairingPath(pairingId)))
            fail('pairingId already exists');
        transaction.create(pairingPath(pairingId), {
            schemaVersion: 1, pairingId, ownerUid, codeHash: hash(code), createdAtMs: nowMs, expiresAtMs, consumedAtMs: null, revokedAtMs: null,
        });
    });
    return Object.freeze({ pairingId, code, expiresAtMs });
}
async function exchangeLocalRunnerPairing(repository, input, nowMs, nextRandom) {
    const pairingId = identifier(input.pairingId, 'pairingId');
    const code = text(input.code, 'pairing code', 8, 160);
    const capabilityId = randomIdentifier(nextRandom, 'capabilityId');
    const token = randomSecret(nextRandom, 'capability token');
    const expiresAtMs = positiveInteger(nowMs, 'nowMs') + CAPABILITY_TTL_MS;
    await repository.runTransaction(async (transaction) => {
        const pairing = await transaction.get(pairingPath(pairingId));
        const data = pairing?.data;
        if (!data || data.pairingId !== pairingId || data.consumedAtMs !== null || data.revokedAtMs !== null
            || typeof data.expiresAtMs !== 'number' || data.expiresAtMs <= nowMs || !equalHash(data.codeHash, code)) {
            fail('pairing code is unavailable');
        }
        if (await transaction.get(capabilityPath(capabilityId)))
            fail('capabilityId already exists');
        const ownerUid = identifier(data.ownerUid, 'ownerUid');
        transaction.update(pairingPath(pairingId), { consumedAtMs: nowMs });
        transaction.create(capabilityPath(capabilityId), {
            schemaVersion: 1, capabilityId, ownerUid, pairingId, tokenHash: hash(token), createdAtMs: nowMs, expiresAtMs, revokedAtMs: null,
        });
    });
    return Object.freeze({ capabilityId, token, expiresAtMs });
}
async function revokeLocalRunnerCapability(repository, input, nowMs) {
    const ownerUid = identifier(input.ownerUid, 'ownerUid');
    const capabilityId = identifier(input.capabilityId, 'capabilityId');
    await repository.runTransaction(async (transaction) => {
        const capability = await transaction.get(capabilityPath(capabilityId));
        if (!capability || capability.data.ownerUid !== ownerUid)
            fail('local runner capability is unavailable');
        transaction.update(capabilityPath(capabilityId), { revokedAtMs: positiveInteger(nowMs, 'nowMs') });
    });
}
async function claimOneLocalRunnerJob(repository, rawCapability, nowMs, nextRandom) {
    const capability = localCapability(rawCapability, nowMs);
    await repository.runTransaction(async (transaction) => { await requireCapability(transaction, capability, nowMs); });
    const candidates = await repository.listQueuedCodePrepareJobs();
    for (const candidate of candidates) {
        const job = queuedCodeJob(candidate.data);
        if (!job)
            continue;
        const leaseToken = randomSecret(nextRandom, 'lease token');
        const claimed = await repository.runTransaction(async (transaction) => {
            const activeCapability = await requireCapability(transaction, capability, nowMs);
            const jobDocument = await transaction.get(jobPath(candidate.id));
            const freshJob = jobDocument ? queuedCodeJob(jobDocument.data) : null;
            if (!freshJob || freshJob.taskId !== job.taskId || freshJob.taskRevision !== job.taskRevision || freshJob.attempts >= freshJob.maxAttempts)
                return null;
            const taskDocument = await transaction.get(taskPath(freshJob.taskId));
            const task = taskDocument ? queuedCodeTask(taskDocument.data, freshJob) : null;
            if (!task)
                return null;
            const leaseUntilMs = nowMs + LEASE_TTL_MS;
            const existingLease = await transaction.get(leasePath(candidate.id));
            const existingData = existingLease?.data;
            if (existingData && typeof existingData.leaseUntilMs === 'number' && existingData.leaseUntilMs > nowMs && existingData.completedAtMs === null)
                return null;
            transaction.update(jobPath(candidate.id), { state: 'leased', attempts: freshJob.attempts + 1, leasedAtMs: nowMs, leaseUntilMs, updatedAtMs: nowMs });
            const leaseData = { schemaVersion: 1, jobId: candidate.id, capabilityId: activeCapability.capabilityId, tokenHash: hash(leaseToken), createdAtMs: nowMs, leaseUntilMs, completedAtMs: null };
            if (existingLease)
                transaction.update(leasePath(candidate.id), leaseData);
            else
                transaction.create(leasePath(candidate.id), leaseData);
            return Object.freeze({ jobId: candidate.id, taskId: task.taskId, taskRevision: task.revision, title: task.title, brief: task.brief, leaseToken, leaseUntilMs });
        });
        if (claimed)
            return claimed;
    }
    return null;
}
async function submitLocalRunnerReview(repository, input, nowMs) {
    const capability = localCapability(input.capability, nowMs);
    const jobId = identifier(input.jobId, 'jobId');
    const leaseToken = text(input.leaseToken, 'lease token', 8, 160);
    const result = (0, contracts_1.parseManagerTaskResult)(input.result);
    if (result.outcome !== 'needs_review')
        fail('local runner result must require review');
    return repository.runTransaction(async (transaction) => {
        const activeCapability = await requireCapability(transaction, capability, nowMs);
        const lease = await transaction.get(leasePath(jobId));
        const leaseData = lease?.data;
        if (!leaseData || leaseData.jobId !== jobId || leaseData.capabilityId !== activeCapability.capabilityId || leaseData.completedAtMs !== null
            || typeof leaseData.leaseUntilMs !== 'number' || leaseData.leaseUntilMs <= nowMs || !equalHash(leaseData.tokenHash, leaseToken))
            fail('local runner lease is unavailable');
        const jobDocument = await transaction.get(jobPath(jobId));
        let job;
        try {
            job = (0, execution_contracts_1.parseExecutionJob)(jobDocument?.data);
        }
        catch {
            fail('local runner lease is unavailable');
        }
        if (job.state !== 'leased' || job.scope !== 'code_prepare' || job.leaseUntilMs === null || job.leaseUntilMs <= nowMs)
            fail('local runner lease is unavailable');
        const taskDocument = await transaction.get(taskPath(job.taskId));
        const task = taskDocument ? queuedCodeTask(taskDocument.data, job) : null;
        if (!task)
            fail('local runner lease is unavailable');
        const inProgressRevision = task.revision + 1;
        const reviewRevision = task.revision + 2;
        const outputHash = hash(`local-runner-review-v1:${job.taskId}:r${job.taskRevision}:${result.summary}`);
        transaction.update(taskPath(task.taskId), { status: 'needs_review', revision: reviewRevision, updatedAtMs: nowMs, result });
        transaction.create(`${EVENTS}/${task.taskId}__r${inProgressRevision}`, { schemaVersion: 1, eventId: `${task.taskId}__r${inProgressRevision}`, taskId: task.taskId, eventType: 'task_transitioned', fromStatus: 'queued', toStatus: 'in_progress', assignedAgentId: 'developer', taskRevision: inProgressRevision, occurredAtMs: nowMs, actorUid: `local_runner:${activeCapability.capabilityId}`, actorRole: 'system', piiClass: 'none' });
        transaction.create(`${EVENTS}/${task.taskId}__r${reviewRevision}`, { schemaVersion: 1, eventId: `${task.taskId}__r${reviewRevision}`, taskId: task.taskId, eventType: 'task_transitioned', fromStatus: 'in_progress', toStatus: 'needs_review', assignedAgentId: 'developer', taskRevision: reviewRevision, occurredAtMs: nowMs, actorUid: `local_runner:${activeCapability.capabilityId}`, actorRole: 'system', piiClass: 'none' });
        transaction.update(jobPath(jobId), { state: 'succeeded', leaseUntilMs: null, updatedAtMs: nowMs, finishedAtMs: nowMs, outputRef: `execution_output:${outputHash}`, outputHash });
        transaction.update(leasePath(jobId), { completedAtMs: nowMs });
        return Object.freeze({ outcome: 'succeeded', taskId: task.taskId });
    });
}
//# sourceMappingURL=local_runner_transport.js.map