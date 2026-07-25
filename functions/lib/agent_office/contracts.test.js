"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const contracts_1 = require("./contracts");
const auth_1 = require("./auth");
const projection_1 = require("./projection");
const HASH = 'a'.repeat(64);
const SAFE_SOURCE_REF = `cohort:sha256:${'d'.repeat(64)}`;
function validCase() {
    return {
        schemaVersion: contracts_1.AGENT_OFFICE_SCHEMA_VERSION,
        caseId: 'case-1',
        revision: 3,
        status: 'awaiting_decision',
        summary: 'Retention signal for a redacted cohort.',
        sourceHealth: [{ source: 'analytics', state: 'ready', observedAtMs: 2000000000000 }],
        confidence: { score: 0.82, basis: 'complete cohort window', insufficientEvidence: false },
        sourceRefs: [{ source: 'analytics', ref: SAFE_SOURCE_REF }],
        currentRecommendation: { recommendationId: 'rec-1', revision: 2, contentHash: HASH },
        createdAtMs: 1999999000000,
        updatedAtMs: 2000000000000,
        retentionUntilMs: 2100000000000,
    };
}
function validRecommendation() {
    return {
        schemaVersion: contracts_1.AGENT_OFFICE_SCHEMA_VERSION,
        recommendationId: 'rec-1',
        caseId: 'case-1',
        revision: 2,
        contentHash: HASH,
        evidence: [{ summary: 'D7 retention changed.', sourceRef: SAFE_SOURCE_REF, observedAtMs: 2000000000000 }],
        risk: { level: 'low', summary: 'Preparation is isolated and reversible.' },
        cost: { currency: 'EUR', estimatedMinor: 0, summary: 'No external spend.' },
        rollback: { possible: true, plan: 'Discard the prepared branch.' },
        actionType: 'code_change_prepare',
        scope: 'prepare_only',
        validUntilMs: 2000100000000,
        createdAtMs: 2000000000000,
    };
}
describe('Agent Office immutable contracts', () => {
    test('strictly accepts the W0 case and recommendation shapes', () => {
        expect((0, contracts_1.parseAgentCase)(validCase())).toEqual(validCase());
        expect((0, contracts_1.parseAgentRecommendation)(validRecommendation())).toEqual(validRecommendation());
    });
    test('rejects unknown fields, executable scopes and invalid hashes', () => {
        expect(() => (0, contracts_1.parseAgentCase)({ ...validCase(), rawEmailBody: 'private@example.com' })).toThrow('unknown field');
        expect(() => (0, contracts_1.parseAgentRecommendation)({ ...validRecommendation(), scope: 'execute' })).toThrow('scope');
        expect(() => (0, contracts_1.parseAgentRecommendation)({ ...validRecommendation(), contentHash: 'short' })).toThrow('contentHash');
        expect(() => (0, contracts_1.parseAgentCase)({
            ...validCase(),
            sourceRefs: [{ source: 'analytics', ref: '353871234567' }],
        })).toThrow('opaque');
        expect(() => (0, contracts_1.parseAgentRecommendation)({
            ...validRecommendation(),
            evidence: [{ summary: 'D7 retention changed.', sourceRef: 'private@example.com', observedAtMs: 2000000000000 }],
        })).toThrow('opaque');
    });
    test('allows only declared monotonic case transitions', () => {
        expect(() => (0, contracts_1.assertAgentCaseTransition)('awaiting_decision', 'approved')).not.toThrow();
        expect(() => (0, contracts_1.assertAgentCaseTransition)('awaiting_decision', 'cancelled')).not.toThrow();
        expect(() => (0, contracts_1.assertAgentCaseTransition)('completed', 'executing')).toThrow('invalid case transition');
        expect(() => (0, contracts_1.assertAgentCaseTransition)('approved', 'awaiting_decision')).toThrow('invalid case transition');
    });
    test('defines immutable approval, task, audit and control records', () => {
        const approvalId = (0, contracts_1.approvalDocumentId)('case-1', 'rec-1', 2);
        expect(approvalId).toMatch(/^[a-f0-9]{64}$/);
        expect((0, contracts_1.parseAgentApproval)({
            schemaVersion: 1,
            approvalId,
            caseId: 'case-1',
            caseRevisionBefore: 3,
            caseRevisionAfter: 4,
            recommendationId: 'rec-1',
            recommendationRevision: 2,
            recommendationContentHash: HASH,
            decision: 'approve',
            scope: 'prepare_only',
            ownerUid: 'owner-uid',
            reason: 'Prepare the isolated change.',
            idempotencyKeyHash: 'b'.repeat(64),
            idempotencyPayloadHash: 'c'.repeat(64),
            decidedAtMs: 2000000000100,
            enqueuedTaskId: null,
        })).toMatchObject({ approvalId, scope: 'prepare_only', enqueuedTaskId: null });
        expect((0, contracts_1.parseAgentTask)({
            schemaVersion: 1,
            taskId: 'task-1',
            caseId: 'case-1',
            approvalId,
            taskType: 'code_change_prepare',
            status: 'pending',
            scope: 'prepare_only',
            createdAtMs: 2000000000200,
            expiresAtMs: 2000100000000,
        })).toMatchObject({ status: 'pending', scope: 'prepare_only' });
        expect((0, contracts_1.parseAgentAuditEvent)({
            schemaVersion: 1,
            eventId: 'decision_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            eventType: 'recommendation_decided',
            caseId: 'case-1',
            recommendationId: 'rec-1',
            approvalId,
            decision: 'approve',
            caseRevision: 4,
            actorRole: 'owner',
            scope: 'prepare_only',
            idempotencyKeyHash: 'b'.repeat(64),
            payloadHash: 'c'.repeat(64),
            occurredAtMs: 2000000000100,
            piiClass: 'none',
        })).toMatchObject({ piiClass: 'none', actorRole: 'owner' });
        expect((0, contracts_1.parseAgentOfficeControl)({
            schemaVersion: 1,
            controlId: 'global',
            killSwitchEnabled: true,
            revision: 1,
            lastChangedAtMs: 2000000000300,
            lastChangedByUid: 'owner-uid',
            lastIdempotencyKeyHash: 'd'.repeat(64),
            lastPayloadHash: 'e'.repeat(64),
        })).toMatchObject({ controlId: 'global', killSwitchEnabled: true, revision: 1 });
    });
});
describe('Agent Office explicit roles', () => {
    test('denies missing, unknown and legacy admin-only role claims', () => {
        expect(() => (0, auth_1.requireAgentOfficeReader)({ uid: 'u1', token: { admin: true } }, 'briefing.read')).toThrow('adminRole claim required');
        expect(() => (0, auth_1.requireAgentOfficeReader)({ uid: 'u1', token: { admin: true, adminRole: 'legacy_admin' } }, 'briefing.read')).toThrow('adminRole claim required');
        expect(() => (0, auth_1.requireAgentOfficeReader)({ uid: 'u1', token: { admin: false, adminRole: 'owner' } }, 'briefing.read')).toThrow('Admin only');
    });
    test('permits safe reads by explicit permission and decisions only by owner', () => {
        expect((0, auth_1.requireAgentOfficeReader)({ uid: 'analyst-uid', token: { admin: true, adminRole: 'analyst' } }, 'briefing.read')).toMatchObject({ role: 'analyst' });
        expect(() => (0, auth_1.requireAgentOfficeReader)({ uid: 'support-uid', token: { admin: true, adminRole: 'support' } }, 'briefing.read')).toThrow('Role cannot use briefing.read');
        expect(() => (0, auth_1.requireAgentOfficeOwner)({ uid: 'admin-uid', token: { admin: true, adminRole: 'admin' } })).toThrow('Owner only');
        expect((0, auth_1.requireAgentOfficeOwner)({ uid: 'owner-uid', token: { admin: true, adminRole: 'owner' } })).toEqual({ actorUid: 'owner-uid', role: 'owner' });
    });
});
describe('Agent Office safe projections', () => {
    test('allowlists fields and removes PII-bearing raw fields from cases and recommendations', () => {
        const projectedCase = (0, projection_1.projectAgentCase)('case-1', {
            ...validCase(),
            ownerEmail: 'owner@example.com',
            rawBody: 'private payload',
            summary: 'Contact private@example.com or +353 87 123 4567.',
            confidence: { score: 0.82, basis: 'Owner private@example.com called +353 87 123 4567.', insufficientEvidence: false },
            sourceRefs: [
                { source: 'analytics', ref: SAFE_SOURCE_REF },
                { source: 'analytics', ref: 'private@example.com' },
                { source: 'analytics', ref: '353871234567' },
            ],
        });
        expect(projectedCase).not.toHaveProperty('ownerEmail');
        expect(projectedCase).not.toHaveProperty('rawBody');
        expect(JSON.stringify(projectedCase)).not.toContain('private@example.com');
        expect(JSON.stringify(projectedCase)).not.toContain('123 4567');
        expect(projectedCase.sourceRefs).toEqual([{ source: 'analytics', ref: SAFE_SOURCE_REF }]);
        const projectedRecommendation = (0, projection_1.projectAgentRecommendation)('rec-1', {
            ...validRecommendation(),
            prompt: 'malicious raw prompt',
            evidence: [{
                    summary: 'User private@example.com reported +353 87 123 4567.',
                    sourceRef: '353871234567',
                    observedAtMs: 2000000000000,
                    rawPayload: 'secret',
                }],
            risk: { level: 'low', summary: 'Risk owner private@example.com +353 87 123 4567.' },
            cost: { currency: 'EUR', estimatedMinor: 0, summary: 'Cost owner private@example.com +353 87 123 4567.' },
            rollback: { possible: true, plan: 'Call private@example.com at +353 87 123 4567.' },
        });
        expect(projectedRecommendation).not.toHaveProperty('prompt');
        expect(JSON.stringify(projectedRecommendation)).not.toContain('private@example.com');
        expect(JSON.stringify(projectedRecommendation)).not.toContain('123 4567');
        expect(JSON.stringify(projectedRecommendation)).not.toContain('rawPayload');
        expect(projectedRecommendation.evidence[0].sourceRef).toBeNull();
    });
    test('never exposes task internals or audit owner identifiers', () => {
        const task = (0, projection_1.projectAgentTask)('task-1', {
            schemaVersion: 1,
            taskId: 'task-1',
            caseId: 'case-1',
            approvalId: 'a'.repeat(64),
            taskType: 'code_change_prepare',
            status: 'pending',
            scope: 'prepare_only',
            createdAtMs: 2000000000000,
            expiresAtMs: 2000100000000,
            command: 'deploy --prod',
            secret: 'token',
        });
        expect(task).not.toHaveProperty('command');
        expect(task).not.toHaveProperty('secret');
        const audit = (0, projection_1.projectAgentAuditEvent)('audit-1', {
            schemaVersion: 1,
            eventId: 'audit-1',
            eventType: 'kill_switch_changed',
            controlRevision: 2,
            killSwitchEnabled: true,
            actorRole: 'owner',
            idempotencyKeyHash: 'b'.repeat(64),
            payloadHash: 'c'.repeat(64),
            occurredAtMs: 2000000000000,
            piiClass: 'none',
            actorUid: 'owner-uid',
        });
        expect(audit).not.toHaveProperty('actorUid');
        expect(audit).not.toHaveProperty('idempotencyKeyHash');
        expect(audit).not.toHaveProperty('payloadHash');
        expect(audit).toMatchObject({ piiClass: 'none', actorRole: 'owner' });
    });
});
//# sourceMappingURL=contracts.test.js.map