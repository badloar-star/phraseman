"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generationAuditOperationId = generationAuditOperationId;
exports.buildGenerationTerminalAudit = buildGenerationTerminalAudit;
const node_crypto_1 = require("node:crypto");
function generationAuditOperationId(entity, attempt, leaseToken) {
    if (!entity.id || !Number.isSafeInteger(attempt) || attempt < 1 || !leaseToken)
        throw new Error('generation_audit_identity_invalid');
    return `generation-${(0, node_crypto_1.createHash)('sha256').update(`${entity.collection}\n${entity.id}\n${attempt}\n${leaseToken}`).digest('hex')}`;
}
function buildGenerationTerminalAudit(input) {
    if (!['needs_review', 'succeeded', 'failed'].includes(input.outcome))
        throw new Error('generation_audit_outcome_invalid');
    const action = input.entity.collection === 'content_factory_stages'
        ? (input.attempt === 1 ? 'content_factory.stage.generate' : 'content_factory.stage.retry')
        : (input.attempt === 1 ? 'content_factory.unit.generate' : 'content_factory.unit.retry');
    return Object.freeze({
        action,
        actorUid: input.actorUid, role: input.role, entity: input.entity,
        operationId: generationAuditOperationId(input.entity, input.attempt, input.leaseToken),
        reason: `Generation attempt ${input.attempt} ${input.outcome}`,
        before: input.before, after: input.after, attempt: input.attempt,
        outcome: input.outcome, errorCategory: input.errorCategory,
        timestamp: new Date().toISOString(),
    });
}
//# sourceMappingURL=generation_audit.js.map