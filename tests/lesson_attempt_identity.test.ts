import {
  makeLessonServerAttemptId,
  normalizeLessonServerAttemptId,
} from '../app/lesson_attempt_identity';

describe('lesson attempt identity', () => {
  it('creates event-safe identifiers and accepts the routed value', () => {
    const attemptId = makeLessonServerAttemptId();

    expect(attemptId).toMatch(/^[A-Za-z0-9_]{8,48}$/);
    expect(normalizeLessonServerAttemptId(attemptId)).toBe(attemptId);
    expect(normalizeLessonServerAttemptId([attemptId])).toBe(attemptId);
  });

  it('rejects malformed route input', () => {
    expect(normalizeLessonServerAttemptId('../old-attempt')).toBeNull();
    expect(normalizeLessonServerAttemptId('')).toBeNull();
    expect(normalizeLessonServerAttemptId(undefined)).toBeNull();
  });
});
