"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
const execution_contracts_1 = require("./execution_contracts");
function job(overrides = {}) {
    return {
        schemaVersion: 1,
        taskId: 'task-001',
        taskRevision: 2,
        scope: 'support_draft',
        handlerVersion: 'support-draft-v1',
        state: 'queued',
        attempts: 0,
        maxAttempts: 2,
        leaseUntilMs: null,
        idempotencyKey: 'exec:task-001:r2',
        idempotencyKeyHash: 'a'.repeat(64),
        createdAtMs: 2000000000000,
        updatedAtMs: 2000000000000,
        leasedAtMs: null,
        finishedAtMs: null,
        outputRef: null,
        outputHash: null,
        ...overrides,
    };
}
describe('agent-manager execution job contract', () => {
    test('parses the bounded server-only support draft job', () => {
        const parsed = (0, execution_contracts_1.parseExecutionJob)(job());
        expect(parsed.scope).toBe('support_draft');
        expect(parsed.attempts).toBe(0);
        expect(Object.isFrozen(parsed)).toBe(true);
    });
    test('accepts only the two approved execution scopes', () => {
        expect((0, execution_contracts_1.parseExecutionJob)(job({ scope: 'analysis_only', handlerVersion: 'analysis-only-v1' })).scope).toBe('analysis_only');
        expect(() => (0, execution_contracts_1.parseExecutionJob)(job({ scope: 'code_prepare' }))).toThrow(https_1.HttpsError);
    });
    test('rejects unknown fields and invalid retry bounds', () => {
        expect(() => (0, execution_contracts_1.parseExecutionJob)({ ...job(), unexpected: true })).toThrow('execution job fields are invalid');
        const { taskId: _taskId, ...missingTaskId } = job();
        expect(() => (0, execution_contracts_1.parseExecutionJob)(missingTaskId)).toThrow('execution job fields are invalid');
        expect(() => (0, execution_contracts_1.parseExecutionJob)(job({ taskRevision: 0 }))).toThrow('taskRevision is invalid');
        expect(() => (0, execution_contracts_1.parseExecutionJob)(job({ attempts: 3, maxAttempts: 2 }))).toThrow('attempts is invalid');
        expect(() => (0, execution_contracts_1.parseExecutionJob)(job({ maxAttempts: 4 }))).toThrow('maxAttempts is invalid');
    });
    test('rejects a job whose task revision field is absent', () => {
        const { taskRevision: _taskRevision, ...missingTaskRevision } = job();
        expect(() => (0, execution_contracts_1.parseExecutionJob)(missingTaskRevision)).toThrow('execution job fields are invalid');
    });
    test('requires a lease only for a leased job and only before its deadline', () => {
        expect(() => (0, execution_contracts_1.parseExecutionJob)(job({ state: 'leased', attempts: 1, leaseUntilMs: null, leasedAtMs: 2000000000001 }))).toThrow('leaseUntilMs is invalid');
        expect(() => (0, execution_contracts_1.parseExecutionJob)(job({ state: 'leased', attempts: 1, leaseUntilMs: 2000000000001, leasedAtMs: 2000000000002 }))).toThrow(https_1.HttpsError);
    });
    test('rejects raw source data, PII, links, and secrets from the projection', () => {
        for (const forbidden of ['sourceBody', 'sourceLinks', 'rawPii', 'secret']) {
            expect(() => (0, execution_contracts_1.projectExecutionJob)({ ...job(), [forbidden]: 'forbidden' })).toThrow(https_1.HttpsError);
        }
        expect(() => (0, execution_contracts_1.parseExecutionJob)(job({ outputRef: 'output:user@example.com', outputHash: 'b'.repeat(64), state: 'succeeded', finishedAtMs: 2000000000001 }))).toThrow(https_1.HttpsError);
        expect(() => (0, execution_contracts_1.parseExecutionJob)(job({ outputRef: 'execution_output:John.Smith', outputHash: 'b'.repeat(64), state: 'succeeded', finishedAtMs: 2000000000001 }))).toThrow(https_1.HttpsError);
    });
    test('allows a completed output only with a matching opaque reference and hash', () => {
        const projected = (0, execution_contracts_1.projectExecutionJob)(job({
            state: 'succeeded',
            finishedAtMs: 2000000000001,
            outputRef: `execution_output:${'c'.repeat(64)}`,
            outputHash: 'b'.repeat(64),
        }));
        expect(projected).toEqual({
            taskId: 'task-001', taskRevision: 2, scope: 'support_draft', handlerVersion: 'support-draft-v1',
            state: 'succeeded', attempts: 0, maxAttempts: 2, leaseUntilMs: null,
            createdAtMs: 2000000000000, updatedAtMs: 2000000000000,
            leasedAtMs: null, finishedAtMs: 2000000000001,
            outputRef: `execution_output:${'c'.repeat(64)}`, outputHash: 'b'.repeat(64),
        });
    });
});
//# sourceMappingURL=execution_contracts.test.js.map