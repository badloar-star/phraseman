import { HttpsError } from 'firebase-functions/v2/https';
import { assertSealOperationReplay, parseCourseGenerationReviewRequest, parseSealCourseReleaseRequest } from './admin_content_release';

describe('course release sealing request', () => {
  it('requires a job and idempotency key', () => {
    expect(parseSealCourseReleaseRequest({ jobId: 'job-1', idempotencyKey: 'seal-1', requestId: 'request-1' })).toEqual({ jobId: 'job-1', idempotencyKey: 'seal-1', requestId: 'request-1' });
    expect(() => parseSealCourseReleaseRequest({ jobId: '../escape', idempotencyKey: 'seal-1' })).toThrow(HttpsError);
  });

  it('accepts only explicit human review decisions', () => {
    expect(parseCourseGenerationReviewRequest({ jobId: 'job-1', status: 'approved', reason: 'checked source and QA', requestId: 'review-1' })).toEqual({ jobId: 'job-1', status: 'approved', reason: 'checked source and QA', requestId: 'review-1' });
    expect(() => parseCourseGenerationReviewRequest({ jobId: 'job-1', status: 'pending', reason: 'x' })).toThrow(HttpsError);
  });

  it('replays a seal only when the operation belongs to the same job', () => {
    expect(assertSealOperationReplay({ action: 'content_factory.course_release.seal', jobId: 'job-1', releaseId: 'release-1' }, 'job-1')).toBe('release-1');
    expect(() => assertSealOperationReplay({ action: 'content_factory.course_release.activate', jobId: 'job-1', releaseId: 'release-1' }, 'job-1')).toThrow(HttpsError);
    expect(() => assertSealOperationReplay({ action: 'content_factory.course_release.seal', jobId: 'job-2', releaseId: 'release-1' }, 'job-1')).toThrow(HttpsError);
  });
});
