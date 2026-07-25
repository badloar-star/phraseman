"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXECUTION_JOB_STATES = exports.EXECUTION_JOB_SCOPES = exports.EXECUTION_JOB_SCHEMA_VERSION = void 0;
exports.parseExecutionJob = parseExecutionJob;
exports.projectExecutionJob = projectExecutionJob;
const https_1 = require("firebase-functions/v2/https");
exports.EXECUTION_JOB_SCHEMA_VERSION = 1;
exports.EXECUTION_JOB_SCOPES = ['support_draft', 'analysis_only', 'report_triage'];
exports.EXECUTION_JOB_STATES = ['queued', 'leased', 'succeeded', 'failed', 'cancelled'];
function fail(message) { throw new https_1.HttpsError('invalid-argument', message); }
function object(value) { if (!value || typeof value !== 'object' || Array.isArray(value))
    fail('execution job must be an object'); return value; }
function exact(input) {
    const keys = ['schemaVersion', 'taskId', 'taskRevision', 'scope', 'handlerVersion', 'state', 'attempts', 'maxAttempts', 'leaseUntilMs', 'idempotencyKey', 'idempotencyKeyHash', 'createdAtMs', 'updatedAtMs', 'leasedAtMs', 'finishedAtMs', 'outputRef', 'outputHash'];
    if (Object.keys(input).some((key) => !keys.includes(key)) || keys.some((key) => !(key in input)))
        fail('execution job fields are invalid');
}
function identifier(value, label) { if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9._:-]{2,159}$/.test(value))
    fail(`${label} is invalid`); return value; }
function integer(value, label, min) { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min)
    fail(`${label} is invalid`); return value; }
function nullableInteger(value, label) { return value === null ? null : integer(value, label, 0); }
function choice(value, choices, label) { if (typeof value !== 'string' || !choices.includes(value))
    fail(`${label} is invalid`); return value; }
function hash(value, label) { if (typeof value !== 'string' || !/^[a-f0-9]{64}$/i.test(value))
    fail(`${label} is invalid`); return value.toLowerCase(); }
function opaque(value, label, prefix) { const result = identifier(value, label); if (prefix && !result.startsWith(prefix))
    fail(`${label} is invalid`); return result; }
function outputReference(value) { if (typeof value !== 'string' || !/^execution_output:[a-f0-9]{64}$/.test(value))
    fail('outputRef is invalid'); return value; }
function handlerVersion(value) { if (typeof value !== 'string' || !/^[a-z][a-z0-9-]{2,63}-v[1-9][0-9]*$/.test(value))
    fail('handlerVersion is invalid'); return value; }
function requireOutputPair(outputRef, outputHash, required) { if (required !== (outputRef !== null && outputHash !== null))
    fail('output fields are invalid'); }
function parseExecutionJob(value) {
    const input = object(value);
    exact(input);
    if (input.schemaVersion !== exports.EXECUTION_JOB_SCHEMA_VERSION)
        fail('execution job schemaVersion is invalid');
    const state = choice(input.state, exports.EXECUTION_JOB_STATES, 'state');
    const taskRevision = integer(input.taskRevision, 'taskRevision', 1);
    const attempts = integer(input.attempts, 'attempts', 0);
    const maxAttempts = integer(input.maxAttempts, 'maxAttempts', 1);
    if (maxAttempts > 3)
        fail('maxAttempts is invalid');
    if (attempts > maxAttempts)
        fail('attempts is invalid');
    const createdAtMs = integer(input.createdAtMs, 'createdAtMs', 0);
    const updatedAtMs = integer(input.updatedAtMs, 'updatedAtMs', createdAtMs);
    const leasedAtMs = nullableInteger(input.leasedAtMs, 'leasedAtMs');
    const finishedAtMs = nullableInteger(input.finishedAtMs, 'finishedAtMs');
    const leaseUntilMs = nullableInteger(input.leaseUntilMs, 'leaseUntilMs');
    const outputRef = input.outputRef === null ? null : outputReference(input.outputRef);
    const outputHash = input.outputHash === null ? null : hash(input.outputHash, 'outputHash');
    if (leasedAtMs !== null && leasedAtMs < createdAtMs)
        fail('lease timestamps are invalid');
    if (finishedAtMs !== null && finishedAtMs < createdAtMs)
        fail('finishedAtMs is invalid');
    if (state === 'leased') {
        if (attempts < 1 || leasedAtMs === null || leaseUntilMs === null || leaseUntilMs <= leasedAtMs || finishedAtMs !== null)
            fail('leaseUntilMs is invalid');
        requireOutputPair(outputRef, outputHash, false);
    }
    else {
        if (leaseUntilMs !== null)
            fail('leaseUntilMs is invalid');
        if (state === 'queued') {
            if (finishedAtMs !== null)
                fail('finishedAtMs is invalid');
            requireOutputPair(outputRef, outputHash, false);
        }
        else {
            if (finishedAtMs === null)
                fail('finishedAtMs is invalid');
            requireOutputPair(outputRef, outputHash, state === 'succeeded');
        }
    }
    return Object.freeze({
        schemaVersion: exports.EXECUTION_JOB_SCHEMA_VERSION, taskId: identifier(input.taskId, 'taskId'), taskRevision,
        scope: choice(input.scope, exports.EXECUTION_JOB_SCOPES, 'scope'), handlerVersion: handlerVersion(input.handlerVersion), state,
        attempts, maxAttempts, leaseUntilMs, idempotencyKey: opaque(input.idempotencyKey, 'idempotencyKey', 'exec:'),
        idempotencyKeyHash: hash(input.idempotencyKeyHash, 'idempotencyKeyHash'), createdAtMs, updatedAtMs, leasedAtMs,
        finishedAtMs, outputRef, outputHash,
    });
}
function projectExecutionJob(value) {
    const job = parseExecutionJob(value);
    return Object.freeze({
        taskId: job.taskId, taskRevision: job.taskRevision, scope: job.scope, handlerVersion: job.handlerVersion,
        state: job.state, attempts: job.attempts, maxAttempts: job.maxAttempts, leaseUntilMs: job.leaseUntilMs,
        createdAtMs: job.createdAtMs, updatedAtMs: job.updatedAtMs, leasedAtMs: job.leasedAtMs,
        finishedAtMs: job.finishedAtMs, outputRef: job.outputRef, outputHash: job.outputHash,
    });
}
//# sourceMappingURL=execution_contracts.js.map