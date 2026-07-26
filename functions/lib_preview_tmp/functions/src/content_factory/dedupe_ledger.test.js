"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dedupe_ledger_1 = require("./dedupe_ledger");
describe('cumulative lesson dedupe ledger', () => {
    const empty = { studyTarget: 'en', revision: 0, lessons: {} };
    const candidate = (lemma, partOfSpeech = 'word') => ({ lemma, surface: lemma, partOfSpeech, sourcePhraseIds: ['p1'] });
    it('deduplicates by lemma plus part of speech while retaining homonyms', () => {
        const first = (0, dedupe_ledger_1.approveLessonLedger)(empty, { lessonId: 1, phraseArtifactId: 'a1', candidates: [candidate('book'), candidate('in', 'preposition')] });
        const receipt = (0, dedupe_ledger_1.dedupeLessonCandidates)(first.ledger, { lessonId: 2, phraseArtifactId: 'a2', candidates: [candidate('book'), candidate('book', 'preposition'), candidate('train')] });
        expect(receipt.accepted).toEqual(expect.arrayContaining([expect.objectContaining({ lemma: 'book', partOfSpeech: 'preposition' }), expect.objectContaining({ lemma: 'train' })]));
        expect(receipt.excludedPrevious).toEqual([expect.objectContaining({ lemma: 'book', partOfSpeech: 'word', previousLessonId: 1 })]);
    });
    it('fails closed when any previous lesson is missing', () => {
        const ledger = { studyTarget: 'en', revision: 1, lessons: { 1: { phraseArtifactId: 'a1', candidateKeys: ['word\u0000book'], fingerprint: 'a'.repeat(64) } } };
        expect((0, dedupe_ledger_1.dedupeLessonCandidates)(ledger, { lessonId: 3, phraseArtifactId: 'a3', candidates: [candidate('train')] })).toMatchObject({ state: 'review_required', missingPreviousLessonIds: [2] });
    });
    it('marks later lessons stale when an earlier lesson fingerprint changes and supports rollback', () => {
        const one = (0, dedupe_ledger_1.approveLessonLedger)(empty, { lessonId: 1, phraseArtifactId: 'a1', candidates: [candidate('book')] });
        const two = (0, dedupe_ledger_1.approveLessonLedger)(one.ledger, { lessonId: 2, phraseArtifactId: 'a2', candidates: [candidate('train')] });
        const regenerated = (0, dedupe_ledger_1.approveLessonLedger)(two.ledger, { lessonId: 1, phraseArtifactId: 'a1-r2', candidates: [candidate('travel')] });
        expect(regenerated.staleLessonIds).toEqual([2]);
        expect(regenerated.ledger.lessons[2]?.state).toBe('stale');
        expect((0, dedupe_ledger_1.rollbackLessonLedger)(regenerated.ledger, 1).lessons[1]).toBeUndefined();
    });
    it('parses an absent ledger as empty but rejects corrupt persisted state', () => {
        expect((0, dedupe_ledger_1.parseLessonLedger)(undefined, 'en')).toEqual(empty);
        expect(() => (0, dedupe_ledger_1.parseLessonLedger)({ studyTarget: 'fr', revision: 1, lessons: {} }, 'en')).toThrow('lesson_ledger_invalid');
    });
});
//# sourceMappingURL=dedupe_ledger.test.js.map