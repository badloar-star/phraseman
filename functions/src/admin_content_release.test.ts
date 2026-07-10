import { HttpsError } from 'firebase-functions/v2/https';
import { parseCourseGenerationReviewRequest, parseSealCourseReleaseRequest } from './admin_content_release';

describe('course release sealing request', () => {
  it('requires a job and idempotency key', () => {
    expect(parseSealCourseReleaseRequest({ jobId: 'job-1', idempotencyKey: 'seal-1' })).toEqual({ jobId: 'job-1', idempotencyKey: 'seal-1' });
    expect(() => parseSealCourseReleaseRequest({ jobId: '../escape', idempotencyKey: 'seal-1' })).toThrow(HttpsError);
  });

  it('accepts only explicit human review decisions', () => {
    expect(parseCourseGenerationReviewRequest({ jobId: 'job-1', status: 'approved', reason: 'checked source and QA' })).toEqual({ jobId: 'job-1', status: 'approved', reason: 'checked source and QA' });
    expect(() => parseCourseGenerationReviewRequest({ jobId: 'job-1', status: 'pending', reason: 'x' })).toThrow(HttpsError);
  });
});
