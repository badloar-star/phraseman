import { HttpsError } from 'firebase-functions/v2/https';
import { parseActivateCourseReleaseRequest } from './language_release';

describe('course release activation request', () => {
  it('requires bounded immutable release identity and CAS revision', () => {
    expect(parseActivateCourseReleaseRequest({ releaseId: 'draft-fr-en-job-1', catalogId: 'fr', expectedRevision: 0, idempotencyKey: 'activate-1' })).toEqual({ releaseId: 'draft-fr-en-job-1', catalogId: 'fr', expectedRevision: 0, idempotencyKey: 'activate-1' });
    expect(() => parseActivateCourseReleaseRequest({ releaseId: 'x', catalogId: 'fr', expectedRevision: -1, idempotencyKey: 'a' })).toThrow(HttpsError);
  });
});
