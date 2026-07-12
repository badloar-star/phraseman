"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const release_review_1 = require("./release_review");
const hash = 'a'.repeat(64);
const releaseId = 'draft-fr-ru-job-1';
const unit = (surface, lessonId) => ({
    unitId: `job-1:${surface}:${lessonId}`,
    jobId: 'job-1', studyTarget: 'fr', learnerSourceLocale: 'ru', releaseId, surface, lessonId,
    state: 'succeeded', contentHash: hash, objectGeneration: 'g1', byteSize: 100,
    qaReceipt: { status: 'passed', blueprintHash: hash, sourceEvidenceIds: ['e1', 'e2'] },
});
describe('release human-review gate', () => {
    it('accepts exactly one passed unit for every requested lesson and canonical surface', () => {
        const units = [1, 2].flatMap((lessonId) => ['lesson', 'quiz', 'flashcard', 'arena'].map((surface) => unit(surface, lessonId)));
        expect((0, release_review_1.validateReleaseReviewCandidate)({ jobId: 'job-1', studyTarget: 'fr', learnerSourceLocale: 'ru', releaseId, expectedLessonIds: [1, 2], expectedBlueprintHash: hash, expectedEvidenceIds: ['e2', 'e1'], units })).toEqual({ ok: true, errors: [], blueprintHash: hash, sourceEvidenceIds: ['e1', 'e2'] });
    });
    it('rejects missing, duplicate, failed and receipt-mismatched units', () => {
        const units = [unit('lesson', 1), unit('quiz', 1), unit('flashcard', 1), { ...unit('arena', 1), qaReceipt: { status: 'passed', blueprintHash: 'b'.repeat(64), sourceEvidenceIds: ['e1'] } }, unit('lesson', 1)];
        const result = (0, release_review_1.validateReleaseReviewCandidate)({ jobId: 'job-1', studyTarget: 'fr', learnerSourceLocale: 'ru', releaseId, expectedLessonIds: [1, 2], expectedBlueprintHash: hash, expectedEvidenceIds: ['e1', 'e2'], units });
        expect(result.ok).toBe(false);
        expect(result.errors).toEqual(expect.arrayContaining(['unit_duplicate', 'unit_missing', 'qa_blueprint_hash_mismatch', 'qa_source_evidence_mismatch']));
    });
    it('rejects cross-language or cross-release units', () => {
        const units = ['lesson', 'quiz', 'flashcard', 'arena'].map((surface) => unit(surface, 1));
        units[0] = { ...units[0], studyTarget: 'de' };
        expect((0, release_review_1.validateReleaseReviewCandidate)({ jobId: 'job-1', studyTarget: 'fr', learnerSourceLocale: 'ru', releaseId, expectedLessonIds: [1], expectedBlueprintHash: hash, expectedEvidenceIds: ['e1', 'e2'], units }).errors).toContain('unit_identity_mismatch');
    });
});
//# sourceMappingURL=release_review.test.js.map