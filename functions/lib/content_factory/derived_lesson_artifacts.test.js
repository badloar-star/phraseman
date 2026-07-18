"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const derived_lesson_artifacts_1 = require("./derived_lesson_artifacts");
describe('grounded derived lesson artifacts', () => {
    const grounding = { acceptedCandidates: [
            { lemma: 'book', partOfSpeech: 'word', sourcePhraseIds: ['p1'] },
            { lemma: 'go', partOfSpeech: 'irregular_verb', sourcePhraseIds: ['p2'] },
            { lemma: 'in front of', partOfSpeech: 'preposition', sourcePhraseIds: ['p3'] },
        ] };
    it.each([
        ['lesson_vocabulary', { lemma: 'book', partOfSpeech: 'word', translation: 'книга', explanation: 'A written work.', sourcePhraseIds: ['p1'] }],
        ['lesson_irregular_verbs', { lemma: 'go', partOfSpeech: 'irregular_verb', forms: ['go', 'went', 'gone'], explanation: 'Movement.', sourcePhraseIds: ['p2'] }],
        ['lesson_prepositions', { lemma: 'in front of', partOfSpeech: 'preposition', translation: 'перед', explanation: 'Position before something.', sourcePhraseIds: ['p3'] }],
    ])('accepts %s items grounded in extracted candidates', (kind, item) => {
        expect((0, derived_lesson_artifacts_1.validateDerivedLessonArtifact)({ stage: kind, items: [item] }, { kind, grounding })).toEqual([]);
    });
    it('rejects invented candidates and unrelated source references', () => {
        expect((0, derived_lesson_artifacts_1.validateDerivedLessonArtifact)({ stage: 'lesson_vocabulary', items: [{ lemma: 'spaceship', partOfSpeech: 'word', translation: 'корабль', explanation: 'Invented.', sourcePhraseIds: ['p99'] }] }, { kind: 'lesson_vocabulary', grounding })).toEqual(expect.arrayContaining(['derived_candidate_not_approved', 'derived_source_phrase_not_approved']));
    });
    it('requires translations and three principal forms as formal fields', () => {
        expect((0, derived_lesson_artifacts_1.validateDerivedLessonArtifact)({ stage: 'lesson_vocabulary', items: [{ lemma: 'book', partOfSpeech: 'word', explanation: 'Text', sourcePhraseIds: ['p1'] }] }, { kind: 'lesson_vocabulary', grounding })).toContain('derived_translation_required');
        expect((0, derived_lesson_artifacts_1.validateDerivedLessonArtifact)({ stage: 'lesson_irregular_verbs', items: [{ lemma: 'go', partOfSpeech: 'irregular_verb', explanation: 'Text', sourcePhraseIds: ['p2'], forms: ['go', 'went'] }] }, { kind: 'lesson_irregular_verbs', grounding })).toContain('derived_irregular_forms_required');
    });
});
//# sourceMappingURL=derived_lesson_artifacts.test.js.map