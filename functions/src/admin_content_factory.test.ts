import { HttpsError } from 'firebase-functions/v2/https';
import { parseContentFactoryJobRequest } from './admin_content_factory';

describe('parseContentFactoryJobRequest', () => {
  it('accepts bounded lesson and surface scopes', () => {
    expect(parseContentFactoryJobRequest({ projectId: 'fr-a1', studyTarget: 'fr', sourceLocale: 'en', lessonIds: [1, 2], surfaces: ['lessons', 'quizzes'], idempotencyKey: 'job-1', blueprintVersion: 'en-v1' })).toMatchObject({ projectId: 'fr-a1', lessonIds: [1, 2] });
  });

  it('rejects unsupported surfaces and oversized scopes', () => {
    expect(() => parseContentFactoryJobRequest({ projectId: 'p', studyTarget: 'fr', sourceLocale: 'en', lessonIds: [1], surfaces: ['theory'], idempotencyKey: 'j', blueprintVersion: 'v' })).toThrow(HttpsError);
    expect(() => parseContentFactoryJobRequest({ projectId: 'p', studyTarget: 'fr', sourceLocale: 'en', lessonIds: Array.from({ length: 101 }, (_, index) => index + 1), surfaces: ['lessons'], idempotencyKey: 'j', blueprintVersion: 'v' })).toThrow(HttpsError);
  });
});
