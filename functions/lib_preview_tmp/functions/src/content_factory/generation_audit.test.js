"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generation_audit_1 = require("./generation_audit");
describe('generation terminal audit', () => {
    const base = {
        actorUid: 'admin-1', role: 'content_editor',
        entity: { collection: 'content_factory_stages', id: 'stage-1' },
        attempt: 2, leaseToken: 'lease-2', outcome: 'failed',
        errorCategory: 'provider_rate_limit', before: { state: 'running' }, after: { state: 'failed' },
    };
    it('builds a deterministic retry audit identity from entity, attempt and lease', () => {
        const first = (0, generation_audit_1.buildGenerationTerminalAudit)(base);
        const second = (0, generation_audit_1.buildGenerationTerminalAudit)(base);
        expect(first.operationId).toBe(second.operationId);
        expect(first.operationId).toBe((0, generation_audit_1.generationAuditOperationId)(base.entity, 2, 'lease-2'));
        expect(first).toMatchObject({ action: 'content_factory.stage.retry', reason: 'Generation attempt 2 failed', attempt: 2, outcome: 'failed', errorCategory: 'provider_rate_limit' });
    });
    it('distinguishes initial unit generation success from retry', () => {
        expect((0, generation_audit_1.buildGenerationTerminalAudit)({ ...base, entity: { collection: 'content_factory_job_units', id: 'job:quiz:1' }, attempt: 1, outcome: 'succeeded', errorCategory: null }).action).toBe('content_factory.unit.generate');
        expect((0, generation_audit_1.buildGenerationTerminalAudit)({ ...base, entity: { collection: 'content_factory_job_units', id: 'job:quiz:1' }, attempt: 3 }).action).toBe('content_factory.unit.retry');
    });
    it('rejects non-terminal outcomes', () => {
        expect(() => (0, generation_audit_1.buildGenerationTerminalAudit)({ ...base, outcome: 'superseded' })).toThrow('generation_audit_outcome_invalid');
    });
});
//# sourceMappingURL=generation_audit.test.js.map