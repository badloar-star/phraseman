"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const surface_convergence_1 = require("./surface_convergence");
const identity = { studyTarget: 'en', learnerSourceLocale: 'ru', lessonId: 9 };
const legacy = { lessonId: 9, surface: 'arena', items: [{ id: 'q1', prompt: 'Выберите перевод.', answer: 'I need help.', options: ['I need help.', 'I helps.', 'Me need help.', 'I need helping.'] }] };
const staged = { lessonId: 9, surface: 'arena', items: [{ id: 'q1', level: 'A2', type: 'choose', task: 'Выберите ответ.', question: 'Выберите перевод.', correct: 'I need help.', correctIndex: 0, options: ['I need help.', 'I helps.', 'Me need help.', 'I need helping.'], rule: 'После I используется need.', expectedAnswerTimeMs: 5000, sourceReferences: ['lesson:9:p1'] }] };
describe('Arena surface convergence comparator', () => {
    it('accepts semantic parity while ignoring option order and explicit stage-only metadata', () => {
        const reordered = { ...staged, items: [{ ...staged.items[0], options: ['I helps.', 'I need help.', 'I need helping.', 'Me need help.'], correctIndex: 1 }] };
        const receipt = (0, surface_convergence_1.compareArenaSurfaceArtifacts)({ comparatorVersion: 'arena-parity-v1', legacyIdentity: identity, stageIdentity: identity, legacyArtifact: legacy, stageArtifact: reordered, legacyArtifactHash: 'a'.repeat(64), stageArtifactHash: 'b'.repeat(64), legacyQaOutcome: 'pass', stageQaOutcome: 'pass' });
        expect(receipt).toMatchObject({ comparatorVersion: 'arena-parity-v1', eligible: true, severity: 'none', mismatches: [], legacyArtifactHash: 'a'.repeat(64), stageArtifactHash: 'b'.repeat(64) });
        expect(receipt.receiptId).toMatch(/^[a-f0-9]{64}$/);
        expect(Object.isFrozen(receipt)).toBe(true);
    });
    it.each([
        ['identity_locale_mismatch', { stageIdentity: { ...identity, learnerSourceLocale: 'uk' } }],
        ['item_count_mismatch', { stageArtifact: { ...staged, items: [] } }],
        ['correct_answer_mismatch', { stageArtifact: { ...staged, items: [{ ...staged.items[0], correct: 'I helps.', correctIndex: 1 }] } }],
        ['source_evidence_missing', { stageArtifact: { ...staged, items: [{ ...staged.items[0], sourceReferences: [] }] } }],
        ['qa_outcome_mismatch', { stageQaOutcome: 'fail' }],
    ])('fails closed for %s', (code, override) => {
        const receipt = (0, surface_convergence_1.compareArenaSurfaceArtifacts)({ comparatorVersion: 'arena-parity-v1', legacyIdentity: identity, stageIdentity: identity, legacyArtifact: legacy, stageArtifact: staged, legacyArtifactHash: 'a'.repeat(64), stageArtifactHash: 'b'.repeat(64), legacyQaOutcome: 'pass', stageQaOutcome: 'pass', ...override });
        expect(receipt.eligible).toBe(false);
        expect(receipt.mismatches).toContain(code);
        expect(receipt.severity).toBe(code === 'source_evidence_missing' || code === 'qa_outcome_mismatch' ? 'major' : 'critical');
    });
    it('maps equivalent retryable error categories and rejects incompatible terminal outcomes', () => {
        const equivalent = (0, surface_convergence_1.compareArenaSurfaceArtifacts)({ comparatorVersion: 'arena-parity-v1', legacyIdentity: identity, stageIdentity: identity, legacyArtifact: legacy, stageArtifact: staged, legacyArtifactHash: 'a'.repeat(64), stageArtifactHash: 'b'.repeat(64), legacyQaOutcome: 'fail', stageQaOutcome: 'fail', legacyError: { category: 'provider_timeout', retryable: true }, stageError: { category: 'provider_timeout', retryable: true } });
        expect(equivalent.mismatches).not.toContain('error_category_mismatch');
        const incompatible = (0, surface_convergence_1.compareArenaSurfaceArtifacts)({ comparatorVersion: 'arena-parity-v1', legacyIdentity: identity, stageIdentity: identity, legacyArtifact: legacy, stageArtifact: staged, legacyArtifactHash: 'a'.repeat(64), stageArtifactHash: 'b'.repeat(64), legacyQaOutcome: 'fail', stageQaOutcome: 'fail', legacyError: { category: 'provider_timeout', retryable: true }, stageError: { category: 'schema_invalid', retryable: false } });
        expect(incompatible.mismatches).toEqual(expect.arrayContaining(['error_category_mismatch', 'retryability_mismatch']));
        expect(incompatible.eligible).toBe(false);
    });
});
//# sourceMappingURL=surface_convergence.test.js.map