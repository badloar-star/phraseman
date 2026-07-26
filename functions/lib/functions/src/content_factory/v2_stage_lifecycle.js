"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectRunnableV2Stages = selectRunnableV2Stages;
exports.transitionV2Stage = transitionV2Stage;
const LEASE_MS = 10 * 60 * 1000;
function assertClock(nowMs) {
    if (!Number.isSafeInteger(nowMs) || nowMs < 0)
        throw new Error('v2_stage_clock_invalid');
}
function dependenciesReady(stage, dependencyStates) {
    return stage.dependsOn.length > 0
        ? stage.dependsOn.every((dependencyId) => dependencyStates[dependencyId] === 'succeeded')
        : true;
}
function leaseExpired(stage, nowMs) {
    return stage.state === 'running'
        && typeof stage.leaseExpiresAtMs === 'number'
        && stage.leaseExpiresAtMs <= nowMs;
}
/** Return stage IDs eligible for the single existing worker to claim. */
function selectRunnableV2Stages(stages, nowMs) {
    assertClock(nowMs);
    const states = Object.fromEntries(stages.map((stage) => [stage.stageId, stage.state]));
    const selected = stages
        .filter((stage) => {
        const eligibleState = stage.state === 'queued' || leaseExpired(stage, nowMs);
        return eligibleState
            && stage.attempts < stage.maxAttempts
            && dependenciesReady(stage, states);
    })
        .map((stage) => stage.stageId)
        .sort();
    return Object.freeze(selected);
}
function transitionV2Stage(stage, event, options) {
    assertClock(options.nowMs);
    if (!Number.isSafeInteger(stage.attempts) || stage.attempts < 0 || !Number.isSafeInteger(stage.maxAttempts) || stage.maxAttempts < 1) {
        throw new Error('v2_stage_attempts_invalid');
    }
    if ((event === 'start' || event === 'retry') && !dependenciesReady(stage, options.dependencyStates)) {
        throw new Error('v2_stage_dependencies_not_ready');
    }
    if (event === 'start') {
        if (!(stage.state === 'queued' || leaseExpired(stage, options.nowMs)))
            throw new Error('v2_stage_not_runnable');
        if (stage.attempts >= stage.maxAttempts)
            throw new Error('v2_stage_retry_exhausted');
        return Object.freeze({ ...stage, state: 'running', attempts: stage.attempts + 1, leaseExpiresAtMs: options.nowMs + LEASE_MS });
    }
    if (event === 'retry') {
        if (stage.state !== 'failed')
            throw new Error('v2_stage_not_failed');
        if (stage.attempts >= stage.maxAttempts)
            throw new Error('v2_stage_retry_exhausted');
        return Object.freeze({ ...stage, state: 'running', attempts: stage.attempts + 1, leaseExpiresAtMs: options.nowMs + LEASE_MS });
    }
    if (event === 'succeed') {
        if (stage.state !== 'running')
            throw new Error('v2_stage_not_running');
        return Object.freeze({ ...stage, state: 'succeeded', leaseExpiresAtMs: undefined });
    }
    if (stage.state !== 'running')
        throw new Error('v2_stage_not_running');
    return Object.freeze({ ...stage, state: 'failed', leaseExpiresAtMs: undefined });
}
//# sourceMappingURL=v2_stage_lifecycle.js.map