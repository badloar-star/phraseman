import { HttpsError } from 'firebase-functions/v2/https';
import { assertReleaseActivationMetadata, courseCatalogId, parseActivateCourseReleaseRequest, parseRollbackCourseReleaseRequest } from './language_release';

describe('course release activation request', () => {
  it('requires bounded immutable release identity and CAS revision', () => {
    expect(parseActivateCourseReleaseRequest({ releaseId: 'draft-fr-ru-job-1', expectedRevision: 0, idempotencyKey: 'activate-1', reason: 'release reviewed pack', requestId: 'req-1' })).toEqual({ releaseId: 'draft-fr-ru-job-1', expectedRevision: 0, idempotencyKey: 'activate-1', reason: 'release reviewed pack', requestId: 'req-1' });
    expect(() => parseActivateCourseReleaseRequest({ releaseId: 'x', expectedRevision: -1, idempotencyKey: 'a', reason: 'x', requestId: 'r' })).toThrow(HttpsError);
  });

  it('isolates active catalogs by target and learner source locale', () => {
    expect(courseCatalogId('fr', 'ru')).toBe('fr:ru');
    expect(courseCatalogId('fr', 'uk')).toBe('fr:uk');
    expect(() => courseCatalogId('../fr', 'ru')).toThrow('course_catalog_identity_invalid');
  });

  it('requires an exact current release when rolling back to any prior release', () => {
    expect(parseRollbackCourseReleaseRequest({ targetReleaseId: 'draft-fr-ru-job-1', expectedCurrentReleaseId: 'draft-fr-ru-job-2', expectedRevision: 4, idempotencyKey: 'rollback-1', reason: 'bad phrases', requestId: 'req-2' })).toEqual({ targetReleaseId: 'draft-fr-ru-job-1', expectedCurrentReleaseId: 'draft-fr-ru-job-2', expectedRevision: 4, idempotencyKey: 'rollback-1', reason: 'bad phrases', requestId: 'req-2' });
    expect(() => parseRollbackCourseReleaseRequest({ targetReleaseId: 'r1', expectedCurrentReleaseId: '', expectedRevision: 4, idempotencyKey: 'rollback-1', reason: 'x', requestId: 'r' })).toThrow(HttpsError);
  });

  it('refuses to activate a sealed release without retained human-review metadata', () => {
    expect(() => assertReleaseActivationMetadata({ reviewStatus: 'approved', reviewerId: 'reviewer-1', sealedBy: 'admin-1' })).not.toThrow();
    expect(() => assertReleaseActivationMetadata({ reviewStatus: 'pending', reviewerId: 'reviewer-1', sealedBy: 'admin-1' })).toThrow('course_release_not_approved');
    expect(() => assertReleaseActivationMetadata({ reviewStatus: 'approved', reviewerId: '', sealedBy: 'admin-1' })).toThrow('course_release_review_metadata_missing');
  });
});
