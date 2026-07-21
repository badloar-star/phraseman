"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
const contracts_1 = require("./contracts");
describe('Agent Manager contracts', () => {
    const draft = () => ({
        taskId: 'task-001',
        title: 'Разобрать рост ошибок',
        brief: 'Проверить динамику ошибок после релиза и подготовить безопасный план.',
        priority: 'high',
        deadlineAtMs: null,
        allowedScope: 'analysis_only',
        sourceLinks: [{ sourceType: 'report', sourceRef: `report:sha256:${'a'.repeat(64)}` }],
    });
    it('accepts a safe owner task draft', () => {
        expect((0, contracts_1.parseManagerTaskDraft)(draft())).toMatchObject({ taskId: 'task-001', priority: 'high', status: 'draft' });
    });
    it('rejects unknown or unsafe manager task fields', () => {
        expect(() => (0, contracts_1.parseManagerTaskDraft)({ ...draft(), command: 'rm -rf /' })).toThrow(https_1.HttpsError);
        expect(() => (0, contracts_1.parseManagerTaskDraft)({ ...draft(), brief: 'x' })).toThrow(https_1.HttpsError);
        expect(() => (0, contracts_1.parseManagerTaskDraft)({ ...draft(), brief: `Не вставлять ${'sk-'}${'1'.repeat(20)} в задачу.` })).toThrow(https_1.HttpsError);
    });
    it('allows only the defined lifecycle', () => {
        expect(() => (0, contracts_1.assertManagerTaskTransition)('draft', 'planned')).not.toThrow();
        expect(() => (0, contracts_1.assertManagerTaskTransition)('planned', 'awaiting_approval')).not.toThrow();
        expect(() => (0, contracts_1.assertManagerTaskTransition)('draft', 'completed')).toThrow(https_1.HttpsError);
    });
    it('accepts a bounded redacted result but rejects a raw email address', () => {
        expect((0, contracts_1.parseManagerTaskResult)({ summary: 'Найден рост ошибок на Android; подготовлен список проверок.', outcome: 'needs_review' })).toMatchObject({ outcome: 'needs_review' });
        expect(() => (0, contracts_1.parseManagerTaskResult)({ summary: 'Написать user@example.com', outcome: 'completed' })).toThrow(https_1.HttpsError);
    });
    it('parses a registered agent policy record', () => {
        expect((0, contracts_1.parseManagerAgent)({
            schemaVersion: 1, agentId: 'qa', role: 'qa', label: 'Контроль качества', enabled: true,
            allowedScopes: ['analysis_only'], lastCheckInAtMs: 1,
        })).toMatchObject({ agentId: 'qa', role: 'qa' });
    });
});
//# sourceMappingURL=contracts.test.js.map