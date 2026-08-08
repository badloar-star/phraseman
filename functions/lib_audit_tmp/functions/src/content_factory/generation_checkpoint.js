"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertGenerationCheckpointIdentity = assertGenerationCheckpointIdentity;
exports.chooseGenerationCheckpointAction = chooseGenerationCheckpointAction;
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function assertGenerationCheckpointIdentity(data, expected) {
    if (!isRecord(data) || data.unitId !== expected.unitId || data.jobId !== expected.jobId || data.studyTarget !== expected.studyTarget || data.learnerSourceLocale !== expected.learnerSourceLocale || data.surface !== expected.surface || data.lessonId !== expected.lessonId) {
        throw new Error('generation_checkpoint_identity_mismatch');
    }
}
function chooseGenerationCheckpointAction(data, nowMs) {
    if (!isRecord(data))
        return Object.freeze({ action: 'generate' });
    if (data.state === 'succeeded')
        return Object.freeze({ action: 'replay' });
    if ((data.state === 'generated' || data.state === 'failed') && isRecord(data.generatedPayload) && isRecord(data.qaReceipt) && data.qaReceipt.status === 'passed') {
        return Object.freeze({ action: 'resume', payload: data.generatedPayload, qaReceipt: data.qaReceipt });
    }
    if (data.state === 'running' && Number.isFinite(Number(data.leaseExpiresAtMs)) && Number(data.leaseExpiresAtMs) > nowMs)
        return Object.freeze({ action: 'busy' });
    return Object.freeze({ action: 'generate' });
}
//# sourceMappingURL=generation_checkpoint.js.map