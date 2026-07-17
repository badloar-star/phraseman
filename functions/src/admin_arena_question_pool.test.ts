import { HttpsError } from 'firebase-functions/v2/https';
import { parseArenaPoolListRequest, parseArenaPoolMutationRequest, parseArenaPoolPublishRequest } from './admin_arena_question_pool';

describe('admin arena question pool request contracts', () => {
  it('accepts bounded operator filters only', () => {
    expect(parseArenaPoolListRequest({ limit: 100, level: 'A2', availability: 'removed', topicArtifactId: 'topic-1' })).toEqual({ limit: 100, level: 'A2', availability: 'removed', topicArtifactId: 'topic-1' });
    expect(() => parseArenaPoolListRequest({ limit: 101 })).toThrow(HttpsError);
  });
  it('requires an exact reviewed-stage fingerprint before publication', () => {
    expect(parseArenaPoolPublishRequest({ stageId: 'request:arena_questions:city:r1', expectedReviewFingerprint: 'a'.repeat(64) })).toEqual({ stageId: 'request:arena_questions:city:r1', expectedReviewFingerprint: 'a'.repeat(64) });
    expect(() => parseArenaPoolPublishRequest({ stageId: 'stage', expectedReviewFingerprint: 'stale' })).toThrow(HttpsError);
  });
  it('requires a reason and revision for removal, and rejects client-owned extra fields', () => {
    expect(parseArenaPoolMutationRequest({ questionId: 'arena-1', expectedRevision: 3, reason: 'Duplicate wording' }, true)).toEqual({ questionId: 'arena-1', expectedRevision: 3, reason: 'Duplicate wording' });
    expect(() => parseArenaPoolMutationRequest({ questionId: 'arena-1', expectedRevision: 3 }, true)).toThrow(HttpsError);
    expect(() => parseArenaPoolMutationRequest({ questionId: 'arena-1', expectedRevision: 3, availability: 'active' }, false)).toThrow(HttpsError);
  });
});
