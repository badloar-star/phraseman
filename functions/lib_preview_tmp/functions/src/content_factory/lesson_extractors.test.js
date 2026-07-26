"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lesson_extractors_1 = require("./lesson_extractors");
describe('deterministic lesson candidate extraction', () => {
    const phrases = [
        { id: 'p1', targetText: 'She went out because of her interest in art.' },
        { id: 'p2', targetText: 'Please look after the child in front of the museum.' },
        { id: 'p3', targetText: 'They took the train and came back at night.' },
    ];
    it('extracts normalized vocabulary, irregular verbs, phrasal verbs and multi-word prepositions', () => {
        const receipt = (0, lesson_extractors_1.extractLessonCandidates)({ studyTarget: 'en', phrases });
        expect(receipt.state).toBe('ready');
        expect(receipt.irregularVerbs).toEqual(expect.arrayContaining([
            expect.objectContaining({ lemma: 'go', surface: 'went', sourcePhraseIds: ['p1'] }),
            expect.objectContaining({ lemma: 'take', surface: 'took', sourcePhraseIds: ['p3'] }),
        ]));
        expect(receipt.vocabulary).toEqual(expect.arrayContaining([
            expect.objectContaining({ lemma: 'look after', partOfSpeech: 'phrasal_verb' }),
            expect.objectContaining({ lemma: 'come back', partOfSpeech: 'phrasal_verb' }),
        ]));
        expect(receipt.prepositions).toEqual(expect.arrayContaining([
            expect.objectContaining({ lemma: 'because of' }),
            expect.objectContaining({ lemma: 'in front of' }),
        ]));
    });
    it('stops visibly when no reliable local lemmatizer exists', () => {
        const receipt = (0, lesson_extractors_1.extractLessonCandidates)({ studyTarget: 'ja', phrases: [{ id: 'p1', targetText: '駅へ行きます' }] });
        expect(receipt).toMatchObject({ state: 'review_required', reason: 'lemmatizer_unsupported', studyTarget: 'ja' });
        expect(receipt.vocabulary).toEqual([]);
    });
});
//# sourceMappingURL=lesson_extractors.test.js.map