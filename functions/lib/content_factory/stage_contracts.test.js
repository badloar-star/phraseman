"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stage_contracts_1 = require("./stage_contracts");
describe('versioned content generation stages', () => {
    it.each([
        'lesson_outline', 'lesson_phrases', 'lesson_vocabulary', 'lesson_irregular_verbs', 'lesson_prepositions', 'lesson_theory',
        'quiz_topic', 'quiz_questions', 'challenge_topic', 'challenge_questions', 'quiz_question_replacement', 'challenge_question_replacement', 'flashcard_pack_idea', 'flashcard_items', 'flashcard_item_replacement', 'arena_topic', 'arena_questions',
    ])('creates an immutable, independently addressable %s unit', (kind) => {
        const unit = (0, stage_contracts_1.createGenerationStageUnit)({
            requestId: 'request-1', kind, studyTarget: 'fr', sourceLocale: 'ru', scopeId: 'lesson-1',
            schemaVersion: 1, promptVersion: 'v1', count: kind.endsWith('_questions') ? 10 : 1,
            prerequisiteArtifactIds: [], qaPolicy: 'content-quality-v1', revision: 1,
        });
        expect(unit.stageId).toBe(`request-1:${kind}:lesson-1:r1`);
        expect(unit.artifactId).toBe(`artifact:request-1:${kind}:lesson-1:r1`);
        expect(unit.idempotencyKey).toBe(unit.stageId);
        expect(Object.isFrozen(unit)).toBe(true);
    });
    it('rejects invalid counts and unversioned contracts', () => {
        expect(() => (0, stage_contracts_1.createGenerationStageUnit)({ requestId: 'r', kind: 'quiz_questions', studyTarget: 'fr', sourceLocale: 'ru', scopeId: 'topic-1', schemaVersion: 0, promptVersion: '', count: 0, prerequisiteArtifactIds: [], qaPolicy: '', revision: 0 })).toThrow('generation_stage_invalid');
    });
});
//# sourceMappingURL=stage_contracts.test.js.map