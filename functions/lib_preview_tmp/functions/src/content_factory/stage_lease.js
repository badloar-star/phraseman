"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acquireStageLease = acquireStageLease;
exports.canCommitStageLease = canCommitStageLease;
const generation_execution_1 = require("./generation_execution");
function acquireStageLease(current, input) {
    if (!Number.isSafeInteger(input.nowMs) || !Number.isSafeInteger(input.leaseMs) || input.leaseMs < 1000 || !/^[A-Za-z0-9._-]{1,160}$/.test(input.leaseToken))
        throw new Error('content_stage_lease_invalid');
    if (current.state === 'needs_review' || current.state === 'approved' || current.state === 'rejected')
        return Object.freeze({ action: 'replay' });
    if (current.state === 'paused' || current.state === 'cancelled' || current.state === 'superseded')
        return Object.freeze({ action: 'blocked' });
    if (current.state === 'running' && Number(current.leaseExpiresAtMs ?? 0) > input.nowMs)
        return Object.freeze({ action: 'busy' });
    const attempt = Math.max(0, Number(current.attempts ?? 0)) + 1;
    return Object.freeze({ action: 'run', attempt, leaseToken: input.leaseToken, leaseExpiresAtMs: input.nowMs + input.leaseMs });
}
function canCommitStageLease(current, lease) {
    return (0, generation_execution_1.canCommitGenerationExecution)(current, lease, ['running']);
}
//# sourceMappingURL=stage_lease.js.map