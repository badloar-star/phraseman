"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generation_execution_1 = require("./generation_execution");
const lease = Object.freeze({ attempt: 2, leaseToken: 'lease-current' });
describe('generation execution guard', () => {
    test('allows only the matching lease and attempt in an allowed state', () => {
        expect((0, generation_execution_1.canCommitGenerationExecution)({ state: 'running', attempts: 2, leaseToken: 'lease-current' }, lease, ['running'])).toBe(true);
        expect((0, generation_execution_1.canCommitGenerationExecution)({ state: 'running', attempts: 1, leaseToken: 'lease-current' }, lease, ['running'])).toBe(false);
        expect((0, generation_execution_1.canCommitGenerationExecution)({ state: 'running', attempts: 2, leaseToken: 'lease-stale' }, lease, ['running'])).toBe(false);
        expect((0, generation_execution_1.canCommitGenerationExecution)({ state: 'cancelled', attempts: 2, leaseToken: 'lease-current' }, lease, ['running'])).toBe(false);
    });
    test('permits a guarded terminal commit from a generated checkpoint', () => {
        expect((0, generation_execution_1.canCommitGenerationExecution)({ state: 'generated', attempts: 2, leaseToken: 'lease-current' }, lease, ['running', 'generated'])).toBe(true);
    });
});
describe('generation persistence errors', () => {
    test('returns a stable public error without leaking persistence details', () => {
        const cause = new Error('firestore internal details');
        const error = (0, generation_execution_1.generationPersistenceError)(cause);
        expect(error.code).toBe('internal');
        expect(error.message).toBe('generation_terminal_persistence_failed');
        expect(error.cause).toBe(cause);
        expect(error.message).not.toContain('firestore');
    });
    test.each(['legacy-success', 'legacy-failure', 'stage-success', 'stage-failure'])('normalizes rejected %s terminal transactions', async () => {
        const detail = new Error('firestore private detail');
        await expect((0, generation_execution_1.runGuardedGenerationTransaction)({
            lease,
            allowedStates: ['running'],
            runTransaction: async () => { throw detail; },
            read: async () => ({ current: null, context: undefined }),
            commit: async () => undefined,
        })).rejects.toMatchObject({ code: 'internal', message: 'generation_terminal_persistence_failed', cause: detail });
    });
    test('runs the commit only for the matching production guard', async () => {
        const commit = jest.fn();
        const result = await (0, generation_execution_1.runGuardedGenerationTransaction)({
            lease,
            allowedStates: ['running'],
            runTransaction: async (handler) => handler({ transaction: true }),
            read: async () => ({ current: { state: 'running', attempts: 2, leaseToken: 'lease-current' }, context: 'job' }),
            commit,
        });
        expect(result).toBe(true);
        expect(commit).toHaveBeenCalledWith({ transaction: true }, expect.objectContaining({ state: 'running' }), 'job');
    });
});
//# sourceMappingURL=generation_execution.test.js.map