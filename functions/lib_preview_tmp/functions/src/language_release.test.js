"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
const language_release_1 = require("./language_release");
describe('course release activation request', () => {
    it('requires bounded immutable release identity and CAS revision', () => {
        expect((0, language_release_1.parseActivateCourseReleaseRequest)({ releaseId: 'draft-fr-ru-job-1', expectedRevision: 0, idempotencyKey: 'activate-1', reason: 'release reviewed pack', requestId: 'req-1' })).toEqual({ releaseId: 'draft-fr-ru-job-1', expectedRevision: 0, idempotencyKey: 'activate-1', reason: 'release reviewed pack', requestId: 'req-1' });
        expect(() => (0, language_release_1.parseActivateCourseReleaseRequest)({ releaseId: 'x', expectedRevision: -1, idempotencyKey: 'a', reason: 'x', requestId: 'r' })).toThrow(https_1.HttpsError);
    });
    it('isolates active catalogs by target and learner source locale', () => {
        expect((0, language_release_1.courseCatalogId)('fr', 'ru')).toBe('fr:ru');
        expect((0, language_release_1.courseCatalogId)('fr', 'uk')).toBe('fr:uk');
        expect(() => (0, language_release_1.courseCatalogId)('../fr', 'ru')).toThrow('course_catalog_identity_invalid');
    });
    it('requires an exact current release when rolling back to any prior release', () => {
        expect((0, language_release_1.parseRollbackCourseReleaseRequest)({ targetReleaseId: 'draft-fr-ru-job-1', expectedCurrentReleaseId: 'draft-fr-ru-job-2', expectedRevision: 4, idempotencyKey: 'rollback-1', reason: 'bad phrases', requestId: 'req-2' })).toEqual({ targetReleaseId: 'draft-fr-ru-job-1', expectedCurrentReleaseId: 'draft-fr-ru-job-2', expectedRevision: 4, idempotencyKey: 'rollback-1', reason: 'bad phrases', requestId: 'req-2' });
        expect(() => (0, language_release_1.parseRollbackCourseReleaseRequest)({ targetReleaseId: 'r1', expectedCurrentReleaseId: '', expectedRevision: 4, idempotencyKey: 'rollback-1', reason: 'x', requestId: 'r' })).toThrow(https_1.HttpsError);
    });
    it('refuses to activate a sealed release without retained human-review metadata', () => {
        expect(() => (0, language_release_1.assertReleaseActivationMetadata)({ reviewStatus: 'approved', reviewerId: 'reviewer-1', sealedBy: 'admin-1' })).not.toThrow();
        expect(() => (0, language_release_1.assertReleaseActivationMetadata)({ reviewStatus: 'pending', reviewerId: 'reviewer-1', sealedBy: 'admin-1' })).toThrow('course_release_not_approved');
        expect(() => (0, language_release_1.assertReleaseActivationMetadata)({ reviewStatus: 'approved', reviewerId: '', sealedBy: 'admin-1' })).toThrow('course_release_review_metadata_missing');
    });
});
//# sourceMappingURL=language_release.test.js.map