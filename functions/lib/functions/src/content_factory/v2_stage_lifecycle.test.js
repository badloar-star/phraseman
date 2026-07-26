"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const v2_stage_lifecycle_1 = require("./v2_stage_lifecycle");
const stage = (id, dependsOn = [], state = 'queued') => ({
    stageId: id,
    dependsOn,
    state,
    attempts: state === 'running' ? 1 : 0,
    maxAttempts: 3,
    leaseExpiresAtMs: state === 'running' ? 1000 : undefined,
});
describe('V2 generation stage lifecycle', () => {
    it('selects only queued stages whose dependencies succeeded, in stable order', () => {
        expect((0, v2_stage_lifecycle_1.selectRunnableV2Stages)([
            stage('b', ['a']),
            stage('a'),
            stage('blocked', ['failed'], 'queued'),
            stage('failed', [], 'failed'),
        ], 500)).toEqual(['a']);
    });
    it('treats an expired running lease as retryable, but not a live lease', () => {
        expect((0, v2_stage_lifecycle_1.selectRunnableV2Stages)([stage('live', [], 'running')], 500)).toEqual([]);
        expect((0, v2_stage_lifecycle_1.selectRunnableV2Stages)([stage('expired', [], 'running')], 1500)).toEqual(['expired']);
    });
    it('requires a successful dependency before starting a stage', () => {
        expect(() => (0, v2_stage_lifecycle_1.transitionV2Stage)(stage('b', ['a']), 'start', { dependencyStates: { a: 'queued' }, nowMs: 10 }))
            .toThrow('v2_stage_dependencies_not_ready');
        expect((0, v2_stage_lifecycle_1.transitionV2Stage)(stage('b', ['a']), 'start', { dependencyStates: { a: 'succeeded' }, nowMs: 10 }))
            .toMatchObject({ state: 'running', attempts: 1, leaseExpiresAtMs: 10 + 10 * 60 * 1000 });
    });
    it('does not retry a terminally exhausted stage', () => {
        expect(() => (0, v2_stage_lifecycle_1.transitionV2Stage)({ ...stage('x', [], 'failed'), attempts: 3 }, 'retry', { dependencyStates: {}, nowMs: 10 }))
            .toThrow('v2_stage_retry_exhausted');
    });
});
//# sourceMappingURL=v2_stage_lifecycle.test.js.map