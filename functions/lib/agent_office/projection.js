"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectAgentCase = projectAgentCase;
exports.projectAgentRecommendation = projectAgentRecommendation;
exports.projectAgentTask = projectAgentTask;
exports.projectAgentAuditEvent = projectAgentAuditEvent;
exports.projectAgentOfficeControl = projectAgentOfficeControl;
const contracts_1 = require("./contracts");
const REDACTED_OPAQUE_REF = `redacted:sha256:${'0'.repeat(64)}`;
function redactText(value) {
    if (typeof value !== 'string')
        return value;
    return value
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
        .replace(/\+?\d[\d\s().-]{7,}\d/g, '[redacted-phone]');
}
function projectAgentCase(id, raw) {
    const confidence = raw.confidence;
    return (0, contracts_1.parseAgentCase)({
        schemaVersion: raw.schemaVersion,
        caseId: raw.caseId ?? id,
        revision: raw.revision,
        status: raw.status,
        summary: redactText(raw.summary),
        sourceHealth: Array.isArray(raw.sourceHealth) ? raw.sourceHealth.map((item) => {
            const value = item;
            return { source: value.source, state: value.state, observedAtMs: value.observedAtMs };
        }) : raw.sourceHealth,
        confidence: {
            score: confidence?.score,
            basis: redactText(confidence?.basis),
            insufficientEvidence: confidence?.insufficientEvidence,
        },
        sourceRefs: Array.isArray(raw.sourceRefs) ? raw.sourceRefs.flatMap((item) => {
            const value = item;
            return (0, contracts_1.isSafeOpaqueRef)(value.ref) ? [{ source: value.source, ref: value.ref }] : [];
        }) : raw.sourceRefs,
        currentRecommendation: raw.currentRecommendation,
        createdAtMs: raw.createdAtMs,
        updatedAtMs: raw.updatedAtMs,
        retentionUntilMs: raw.retentionUntilMs,
    });
}
function projectAgentRecommendation(id, raw) {
    const risk = raw.risk;
    const cost = raw.cost;
    const rollback = raw.rollback;
    const safeSourceRefs = Array.isArray(raw.evidence)
        ? raw.evidence.map((item) => {
            const value = item;
            return (0, contracts_1.isSafeOpaqueRef)(value.sourceRef) ? value.sourceRef : null;
        })
        : [];
    const parsed = (0, contracts_1.parseAgentRecommendation)({
        schemaVersion: raw.schemaVersion,
        recommendationId: raw.recommendationId ?? id,
        caseId: raw.caseId,
        revision: raw.revision,
        contentHash: raw.contentHash,
        evidence: Array.isArray(raw.evidence) ? raw.evidence.map((item, index) => {
            const value = item;
            return {
                summary: redactText(value.summary),
                sourceRef: safeSourceRefs[index] ?? REDACTED_OPAQUE_REF,
                observedAtMs: value.observedAtMs,
            };
        }) : raw.evidence,
        risk: { level: risk?.level, summary: redactText(risk?.summary) },
        cost: { currency: cost?.currency, estimatedMinor: cost?.estimatedMinor, summary: redactText(cost?.summary) },
        rollback: { possible: rollback?.possible, plan: redactText(rollback?.plan) },
        actionType: raw.actionType,
        scope: raw.scope,
        validUntilMs: raw.validUntilMs,
        createdAtMs: raw.createdAtMs,
    });
    return Object.freeze({
        ...parsed,
        evidence: Object.freeze(parsed.evidence.map((item, index) => Object.freeze({
            ...item,
            sourceRef: safeSourceRefs[index] ?? null,
        }))),
    });
}
function projectAgentTask(id, raw) {
    return (0, contracts_1.parseAgentTask)({
        schemaVersion: raw.schemaVersion,
        taskId: raw.taskId ?? id,
        caseId: raw.caseId,
        approvalId: raw.approvalId,
        taskType: raw.taskType,
        status: raw.status,
        scope: raw.scope,
        createdAtMs: raw.createdAtMs,
        expiresAtMs: raw.expiresAtMs,
    });
}
function projectAgentAuditEvent(id, raw) {
    const projected = {
        schemaVersion: raw.schemaVersion,
        eventId: raw.eventId ?? id,
        eventType: raw.eventType,
        actorRole: raw.actorRole,
        idempotencyKeyHash: raw.idempotencyKeyHash,
        payloadHash: raw.payloadHash,
        occurredAtMs: raw.occurredAtMs,
        piiClass: raw.piiClass,
    };
    if (raw.eventType === 'recommendation_decided') {
        Object.assign(projected, {
            caseId: raw.caseId,
            recommendationId: raw.recommendationId,
            approvalId: raw.approvalId,
            decision: raw.decision,
            caseRevision: raw.caseRevision,
            scope: raw.scope,
        });
    }
    else {
        Object.assign(projected, { controlRevision: raw.controlRevision, killSwitchEnabled: raw.killSwitchEnabled });
    }
    const parsed = (0, contracts_1.parseAgentAuditEvent)(projected);
    const { idempotencyKeyHash: _keyHash, payloadHash: _payloadHash, ...safe } = parsed;
    return Object.freeze(safe);
}
function projectAgentOfficeControl(raw) {
    const parsed = (0, contracts_1.parseAgentOfficeControl)(raw);
    return Object.freeze({
        controlId: 'global',
        killSwitchEnabled: parsed.killSwitchEnabled,
        revision: parsed.revision,
        state: 'ready',
        lastChangedAtMs: parsed.lastChangedAtMs,
    });
}
//# sourceMappingURL=projection.js.map