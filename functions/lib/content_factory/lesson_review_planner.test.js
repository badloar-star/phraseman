"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lesson_review_planner_1 = require("./lesson_review_planner");
describe('lesson phrase approval and rollback planner', () => {
    const ledger = { studyTarget: 'en', revision: 2, lessons: { 1: { phraseArtifactId: 'old-1', candidateKeys: ['word\u0000book'], fingerprint: 'a'.repeat(64) }, 2: { phraseArtifactId: 'old-2', candidateKeys: ['word\u0000train'], fingerprint: 'b'.repeat(64) } } };
    const candidates = [{ lemma: 'travel', surface: 'travel', partOfSpeech: 'word', sourcePhraseIds: ['p1'] }];
    it('invalidates current and later lesson scopes when a phrase revision changes', () => {
        const result = (0, lesson_review_planner_1.planLessonPhraseLedgerReview)({ status: 'approved', ledger, lessonId: 1, phraseArtifactId: 'new-1', candidates });
        expect(result.staleLessonIds).toEqual([1, 2]);
        expect(result.ledger.lessons[2]?.state).toBe('stale');
    });
    it('rolls back the current entry and invalidates all following lessons', () => {
        const result = (0, lesson_review_planner_1.planLessonPhraseLedgerReview)({ status: 'rejected', ledger, lessonId: 1, phraseArtifactId: 'old-1', candidates: [] });
        expect(result.staleLessonIds).toEqual([1, 2]);
        expect(result.ledger.lessons[1]).toBeUndefined();
        expect(result.ledger.lessons[2]?.state).toBe('stale');
    });
});
//# sourceMappingURL=lesson_review_planner.test.js.map