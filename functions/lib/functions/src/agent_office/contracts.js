"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGENT_CASE_STATUSES = exports.AGENT_OFFICE_SCOPE = exports.AGENT_OFFICE_SCHEMA_VERSION = void 0;
exports.isRecord = isRecord;
exports.assertExactKeys = assertExactKeys;
exports.isSafeOpaqueRef = isSafeOpaqueRef;
exports.sha256 = sha256;
exports.agentRecommendationContentHash = agentRecommendationContentHash;
exports.approvalDocumentId = approvalDocumentId;
exports.assertAgentCaseTransition = assertAgentCaseTransition;
exports.parseAgentCase = parseAgentCase;
exports.parseAgentRecommendation = parseAgentRecommendation;
exports.parseAgentApproval = parseAgentApproval;
exports.parseAgentTask = parseAgentTask;
exports.parseAgentAuditEvent = parseAgentAuditEvent;
exports.parseAgentOfficeControl = parseAgentOfficeControl;
exports.parseIdempotencyKey = parseIdempotencyKey;
exports.parseIdentifier = parseIdentifier;
exports.parsePositiveInteger = parsePositiveInteger;
exports.parseNonNegativeInteger = parseNonNegativeInteger;
exports.parseHash = parseHash;
exports.parseBoundedText = parseBoundedText;
exports.parseDecision = parseDecision;
exports.parseBoolean = parseBoolean;
const node_crypto_1 = require("node:crypto");
const https_1 = require("firebase-functions/v2/https");
exports.AGENT_OFFICE_SCHEMA_VERSION = 1;
exports.AGENT_OFFICE_SCOPE = 'prepare_only';
exports.AGENT_CASE_STATUSES = [
    'observed',
    'investigating',
    'insufficient_data',
    'awaiting_decision',
    'approved',
    'executing',
    'verifying',
    'completed',
    'cancelled',
];
function invalid(message) {
    throw new https_1.HttpsError('invalid-argument', message);
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function assertExactKeys(value, keys, label) {
    const allowed = new Set(keys);
    const unknown = Object.keys(value).find((key) => !allowed.has(key));
    if (unknown)
        invalid(`${label} unknown field: ${unknown}`);
    const missing = keys.find((key) => !Object.prototype.hasOwnProperty.call(value, key));
    if (missing)
        invalid(`${label} missing field: ${missing}`);
}
function row(value, label) {
    if (!isRecord(value))
        invalid(`${label} must be an object`);
    return value;
}
function text(value, label, max) {
    if (typeof value !== 'string')
        invalid(`${label} must be a string`);
    const result = value.trim();
    if (!result || result.length > max)
        invalid(`${label} is invalid`);
    return result;
}
function identifier(value, label) {
    const result = text(value, label, 160);
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(result))
        invalid(`${label} is invalid`);
    return result;
}
function opaqueRef(value, label) {
    const result = text(value, label, 240);
    if (!isSafeOpaqueRef(result))
        invalid(`${label} must be opaque`);
    return result;
}
function isSafeOpaqueRef(value) {
    return typeof value === 'string' && /^[a-z][a-z0-9_]{1,31}:sha256:[a-f0-9]{64}$/.test(value);
}
function integer(value, label, minimum = 0) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum)
        invalid(`${label} is invalid`);
    return value;
}
function finite(value, label, minimum, maximum) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum)
        invalid(`${label} is invalid`);
    return value;
}
function boolean(value, label) {
    if (typeof value !== 'boolean')
        invalid(`${label} must be boolean`);
    return value;
}
function literal(value, values, label) {
    if (typeof value !== 'string' || !values.includes(value))
        invalid(`${label} is invalid`);
    return value;
}
function sha256(value) {
    return (0, node_crypto_1.createHash)('sha256').update(value, 'utf8').digest('hex');
}
function canonicalJson(value) {
    if (value === null || typeof value === 'boolean' || typeof value === 'string')
        return JSON.stringify(value);
    if (typeof value === 'number' && Number.isFinite(value))
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map(canonicalJson).join(',')}]`;
    if (isRecord(value)) {
        return `{${Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
            .join(',')}}`;
    }
    invalid('canonical recommendation content contains a non-JSON value');
}
function agentRecommendationContentHash(recommendation) {
    const { contentHash: _declaredHash, ...content } = recommendation;
    return sha256(canonicalJson(content));
}
function hash(value, label) {
    const result = text(value, label, 64);
    if (!/^[a-f0-9]{64}$/.test(result))
        invalid(`${label} is invalid`);
    return result;
}
function approvalDocumentId(caseId, recommendationId, revision) {
    return sha256(JSON.stringify([identifier(caseId, 'caseId'), identifier(recommendationId, 'recommendationId'), integer(revision, 'revision', 1)]));
}
const ALLOWED_TRANSITIONS = {
    observed: new Set(['investigating', 'insufficient_data', 'cancelled']),
    investigating: new Set(['awaiting_decision', 'insufficient_data', 'cancelled']),
    insufficient_data: new Set(['investigating', 'cancelled']),
    awaiting_decision: new Set(['approved', 'cancelled']),
    approved: new Set(['executing', 'cancelled']),
    executing: new Set(['verifying', 'cancelled']),
    verifying: new Set(['completed', 'cancelled']),
    completed: new Set(),
    cancelled: new Set(),
};
function assertAgentCaseTransition(from, to) {
    if (!ALLOWED_TRANSITIONS[from]?.has(to))
        invalid(`invalid case transition: ${from} -> ${to}`);
}
function parseRecommendationRef(value) {
    const input = row(value, 'currentRecommendation');
    assertExactKeys(input, ['recommendationId', 'revision', 'contentHash'], 'currentRecommendation');
    return Object.freeze({
        recommendationId: identifier(input.recommendationId, 'currentRecommendation.recommendationId'),
        revision: integer(input.revision, 'currentRecommendation.revision', 1),
        contentHash: hash(input.contentHash, 'currentRecommendation.contentHash'),
    });
}
function parseAgentCase(value) {
    const input = row(value, 'AgentCase');
    assertExactKeys(input, [
        'schemaVersion', 'caseId', 'revision', 'status', 'summary', 'sourceHealth', 'confidence',
        'sourceRefs', 'currentRecommendation', 'createdAtMs', 'updatedAtMs', 'retentionUntilMs',
    ], 'AgentCase');
    if (input.schemaVersion !== exports.AGENT_OFFICE_SCHEMA_VERSION)
        invalid('AgentCase schemaVersion is invalid');
    if (!Array.isArray(input.sourceHealth) || input.sourceHealth.length > 20)
        invalid('AgentCase sourceHealth is invalid');
    if (!Array.isArray(input.sourceRefs) || input.sourceRefs.length > 50)
        invalid('AgentCase sourceRefs is invalid');
    const confidence = row(input.confidence, 'AgentCase.confidence');
    assertExactKeys(confidence, ['score', 'basis', 'insufficientEvidence'], 'AgentCase.confidence');
    return Object.freeze({
        schemaVersion: 1,
        caseId: identifier(input.caseId, 'AgentCase.caseId'),
        revision: integer(input.revision, 'AgentCase.revision', 1),
        status: literal(input.status, exports.AGENT_CASE_STATUSES, 'AgentCase.status'),
        summary: text(input.summary, 'AgentCase.summary', 800),
        sourceHealth: Object.freeze(input.sourceHealth.map((value, index) => {
            const health = row(value, `AgentCase.sourceHealth[${index}]`);
            assertExactKeys(health, ['source', 'state', 'observedAtMs'], `AgentCase.sourceHealth[${index}]`);
            return Object.freeze({
                source: identifier(health.source, `AgentCase.sourceHealth[${index}].source`),
                state: literal(health.state, ['ready', 'empty', 'partial', 'error', 'truncated'], `AgentCase.sourceHealth[${index}].state`),
                observedAtMs: integer(health.observedAtMs, `AgentCase.sourceHealth[${index}].observedAtMs`),
            });
        })),
        confidence: Object.freeze({
            score: finite(confidence.score, 'AgentCase.confidence.score', 0, 1),
            basis: text(confidence.basis, 'AgentCase.confidence.basis', 400),
            insufficientEvidence: boolean(confidence.insufficientEvidence, 'AgentCase.confidence.insufficientEvidence'),
        }),
        sourceRefs: Object.freeze(input.sourceRefs.map((value, index) => {
            const ref = row(value, `AgentCase.sourceRefs[${index}]`);
            assertExactKeys(ref, ['source', 'ref'], `AgentCase.sourceRefs[${index}]`);
            return Object.freeze({
                source: identifier(ref.source, `AgentCase.sourceRefs[${index}].source`),
                ref: opaqueRef(ref.ref, `AgentCase.sourceRefs[${index}].ref`),
            });
        })),
        currentRecommendation: input.currentRecommendation === null ? null : parseRecommendationRef(input.currentRecommendation),
        createdAtMs: integer(input.createdAtMs, 'AgentCase.createdAtMs'),
        updatedAtMs: integer(input.updatedAtMs, 'AgentCase.updatedAtMs'),
        retentionUntilMs: integer(input.retentionUntilMs, 'AgentCase.retentionUntilMs'),
    });
}
function parseAgentRecommendation(value) {
    const input = row(value, 'AgentRecommendation');
    assertExactKeys(input, [
        'schemaVersion', 'recommendationId', 'caseId', 'revision', 'contentHash', 'evidence', 'risk',
        'cost', 'rollback', 'actionType', 'scope', 'validUntilMs', 'createdAtMs',
    ], 'AgentRecommendation');
    if (input.schemaVersion !== 1)
        invalid('AgentRecommendation schemaVersion is invalid');
    if (!Array.isArray(input.evidence) || input.evidence.length < 1 || input.evidence.length > 20)
        invalid('AgentRecommendation evidence is invalid');
    const risk = row(input.risk, 'AgentRecommendation.risk');
    const cost = row(input.cost, 'AgentRecommendation.cost');
    const rollback = row(input.rollback, 'AgentRecommendation.rollback');
    assertExactKeys(risk, ['level', 'summary'], 'AgentRecommendation.risk');
    assertExactKeys(cost, ['currency', 'estimatedMinor', 'summary'], 'AgentRecommendation.cost');
    assertExactKeys(rollback, ['possible', 'plan'], 'AgentRecommendation.rollback');
    return Object.freeze({
        schemaVersion: 1,
        recommendationId: identifier(input.recommendationId, 'AgentRecommendation.recommendationId'),
        caseId: identifier(input.caseId, 'AgentRecommendation.caseId'),
        revision: integer(input.revision, 'AgentRecommendation.revision', 1),
        contentHash: hash(input.contentHash, 'AgentRecommendation.contentHash'),
        evidence: Object.freeze(input.evidence.map((value, index) => {
            const evidence = row(value, `AgentRecommendation.evidence[${index}]`);
            assertExactKeys(evidence, ['summary', 'sourceRef', 'observedAtMs'], `AgentRecommendation.evidence[${index}]`);
            return Object.freeze({
                summary: text(evidence.summary, `AgentRecommendation.evidence[${index}].summary`, 600),
                sourceRef: opaqueRef(evidence.sourceRef, `AgentRecommendation.evidence[${index}].sourceRef`),
                observedAtMs: integer(evidence.observedAtMs, `AgentRecommendation.evidence[${index}].observedAtMs`),
            });
        })),
        risk: Object.freeze({
            level: literal(risk.level, ['low', 'medium', 'high', 'critical'], 'AgentRecommendation.risk.level'),
            summary: text(risk.summary, 'AgentRecommendation.risk.summary', 500),
        }),
        cost: Object.freeze({
            currency: literal(cost.currency, ['EUR'], 'AgentRecommendation.cost.currency'),
            estimatedMinor: integer(cost.estimatedMinor, 'AgentRecommendation.cost.estimatedMinor'),
            summary: text(cost.summary, 'AgentRecommendation.cost.summary', 500),
        }),
        rollback: Object.freeze({
            possible: boolean(rollback.possible, 'AgentRecommendation.rollback.possible'),
            plan: text(rollback.plan, 'AgentRecommendation.rollback.plan', 800),
        }),
        actionType: literal(input.actionType, ['analysis_prepare', 'code_change_prepare', 'experiment_prepare', 'support_reply_prepare'], 'AgentRecommendation.actionType'),
        scope: literal(input.scope, [exports.AGENT_OFFICE_SCOPE], 'AgentRecommendation.scope'),
        validUntilMs: integer(input.validUntilMs, 'AgentRecommendation.validUntilMs'),
        createdAtMs: integer(input.createdAtMs, 'AgentRecommendation.createdAtMs'),
    });
}
function parseAgentApproval(value) {
    const input = row(value, 'AgentApproval');
    assertExactKeys(input, [
        'schemaVersion', 'approvalId', 'caseId', 'caseRevisionBefore', 'caseRevisionAfter', 'recommendationId',
        'recommendationRevision', 'recommendationContentHash', 'decision', 'scope', 'ownerUid', 'reason',
        'idempotencyKeyHash', 'idempotencyPayloadHash', 'decidedAtMs', 'enqueuedTaskId',
    ], 'AgentApproval');
    if (input.schemaVersion !== 1)
        invalid('AgentApproval schemaVersion is invalid');
    const caseRevisionBefore = integer(input.caseRevisionBefore, 'AgentApproval.caseRevisionBefore', 1);
    const caseRevisionAfter = integer(input.caseRevisionAfter, 'AgentApproval.caseRevisionAfter', 2);
    if (caseRevisionAfter !== caseRevisionBefore + 1)
        invalid('AgentApproval case revision is invalid');
    if (input.enqueuedTaskId !== null)
        invalid('AgentApproval enqueuedTaskId must be null');
    const caseId = identifier(input.caseId, 'AgentApproval.caseId');
    const recommendationId = identifier(input.recommendationId, 'AgentApproval.recommendationId');
    const recommendationRevision = integer(input.recommendationRevision, 'AgentApproval.recommendationRevision', 1);
    const approvalId = hash(input.approvalId, 'AgentApproval.approvalId');
    if (approvalId !== approvalDocumentId(caseId, recommendationId, recommendationRevision))
        invalid('AgentApproval approvalId is invalid');
    return Object.freeze({
        schemaVersion: 1,
        approvalId,
        caseId,
        caseRevisionBefore,
        caseRevisionAfter,
        recommendationId,
        recommendationRevision,
        recommendationContentHash: hash(input.recommendationContentHash, 'AgentApproval.recommendationContentHash'),
        decision: literal(input.decision, ['approve', 'decline'], 'AgentApproval.decision'),
        scope: literal(input.scope, [exports.AGENT_OFFICE_SCOPE], 'AgentApproval.scope'),
        ownerUid: identifier(input.ownerUid, 'AgentApproval.ownerUid'),
        reason: text(input.reason, 'AgentApproval.reason', 500),
        idempotencyKeyHash: hash(input.idempotencyKeyHash, 'AgentApproval.idempotencyKeyHash'),
        idempotencyPayloadHash: hash(input.idempotencyPayloadHash, 'AgentApproval.idempotencyPayloadHash'),
        decidedAtMs: integer(input.decidedAtMs, 'AgentApproval.decidedAtMs'),
        enqueuedTaskId: null,
    });
}
function parseAgentTask(value) {
    const input = row(value, 'AgentTask');
    assertExactKeys(input, ['schemaVersion', 'taskId', 'caseId', 'approvalId', 'taskType', 'status', 'scope', 'createdAtMs', 'expiresAtMs'], 'AgentTask');
    if (input.schemaVersion !== 1)
        invalid('AgentTask schemaVersion is invalid');
    return Object.freeze({
        schemaVersion: 1,
        taskId: identifier(input.taskId, 'AgentTask.taskId'),
        caseId: identifier(input.caseId, 'AgentTask.caseId'),
        approvalId: hash(input.approvalId, 'AgentTask.approvalId'),
        taskType: literal(input.taskType, ['analysis_prepare', 'code_change_prepare', 'experiment_prepare', 'support_reply_prepare'], 'AgentTask.taskType'),
        status: literal(input.status, ['pending', 'claimed', 'completed', 'cancelled', 'expired'], 'AgentTask.status'),
        scope: literal(input.scope, [exports.AGENT_OFFICE_SCOPE], 'AgentTask.scope'),
        createdAtMs: integer(input.createdAtMs, 'AgentTask.createdAtMs'),
        expiresAtMs: integer(input.expiresAtMs, 'AgentTask.expiresAtMs'),
    });
}
function parseAgentAuditEvent(value) {
    const input = row(value, 'AgentAuditEvent');
    const common = ['schemaVersion', 'eventId', 'eventType', 'actorRole', 'idempotencyKeyHash', 'payloadHash', 'occurredAtMs', 'piiClass'];
    const eventType = literal(input.eventType, ['recommendation_decided', 'kill_switch_changed'], 'AgentAuditEvent.eventType');
    if (eventType === 'recommendation_decided') {
        assertExactKeys(input, [...common, 'caseId', 'recommendationId', 'approvalId', 'decision', 'caseRevision', 'scope'], 'AgentAuditEvent');
    }
    else {
        assertExactKeys(input, [...common, 'controlRevision', 'killSwitchEnabled'], 'AgentAuditEvent');
    }
    if (input.schemaVersion !== 1)
        invalid('AgentAuditEvent schemaVersion is invalid');
    const base = {
        schemaVersion: 1,
        eventId: identifier(input.eventId, 'AgentAuditEvent.eventId'),
        actorRole: literal(input.actorRole, ['owner'], 'AgentAuditEvent.actorRole'),
        idempotencyKeyHash: hash(input.idempotencyKeyHash, 'AgentAuditEvent.idempotencyKeyHash'),
        payloadHash: hash(input.payloadHash, 'AgentAuditEvent.payloadHash'),
        occurredAtMs: integer(input.occurredAtMs, 'AgentAuditEvent.occurredAtMs'),
        piiClass: literal(input.piiClass, ['none'], 'AgentAuditEvent.piiClass'),
    };
    if (eventType === 'recommendation_decided') {
        return Object.freeze({
            ...base,
            eventType,
            caseId: identifier(input.caseId, 'AgentAuditEvent.caseId'),
            recommendationId: identifier(input.recommendationId, 'AgentAuditEvent.recommendationId'),
            approvalId: hash(input.approvalId, 'AgentAuditEvent.approvalId'),
            decision: literal(input.decision, ['approve', 'decline'], 'AgentAuditEvent.decision'),
            caseRevision: integer(input.caseRevision, 'AgentAuditEvent.caseRevision', 1),
            scope: literal(input.scope, [exports.AGENT_OFFICE_SCOPE], 'AgentAuditEvent.scope'),
        });
    }
    return Object.freeze({
        ...base,
        eventType,
        controlRevision: integer(input.controlRevision, 'AgentAuditEvent.controlRevision', 1),
        killSwitchEnabled: boolean(input.killSwitchEnabled, 'AgentAuditEvent.killSwitchEnabled'),
    });
}
function parseAgentOfficeControl(value) {
    const input = row(value, 'AgentOfficeControl');
    assertExactKeys(input, [
        'schemaVersion', 'controlId', 'killSwitchEnabled', 'revision', 'lastChangedAtMs', 'lastChangedByUid',
        'lastIdempotencyKeyHash', 'lastPayloadHash',
    ], 'AgentOfficeControl');
    if (input.schemaVersion !== 1)
        invalid('AgentOfficeControl schemaVersion is invalid');
    return Object.freeze({
        schemaVersion: 1,
        controlId: literal(input.controlId, ['global'], 'AgentOfficeControl.controlId'),
        killSwitchEnabled: boolean(input.killSwitchEnabled, 'AgentOfficeControl.killSwitchEnabled'),
        revision: integer(input.revision, 'AgentOfficeControl.revision', 1),
        lastChangedAtMs: integer(input.lastChangedAtMs, 'AgentOfficeControl.lastChangedAtMs'),
        lastChangedByUid: identifier(input.lastChangedByUid, 'AgentOfficeControl.lastChangedByUid'),
        lastIdempotencyKeyHash: hash(input.lastIdempotencyKeyHash, 'AgentOfficeControl.lastIdempotencyKeyHash'),
        lastPayloadHash: hash(input.lastPayloadHash, 'AgentOfficeControl.lastPayloadHash'),
    });
}
function parseIdempotencyKey(value) {
    const result = text(value, 'idempotencyKey', 160);
    if (!/^[A-Za-z0-9._:-]{8,160}$/.test(result))
        invalid('idempotencyKey is invalid');
    return result;
}
function parseIdentifier(value, label) {
    return identifier(value, label);
}
function parsePositiveInteger(value, label) {
    return integer(value, label, 1);
}
function parseNonNegativeInteger(value, label) {
    return integer(value, label, 0);
}
function parseHash(value, label) {
    return hash(value, label);
}
function parseBoundedText(value, label, max) {
    return text(value, label, max);
}
function parseDecision(value) {
    return literal(value, ['approve', 'decline'], 'decision');
}
function parseBoolean(value, label) {
    return boolean(value, label);
}
//# sourceMappingURL=contracts.js.map