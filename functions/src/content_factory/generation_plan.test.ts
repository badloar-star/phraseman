import { canonicalizeFactorySurfaces, generationPlanFingerprint } from './generation_plan';

describe('legacy content generation plan identity', () => {
  it('canonicalizes related legacy checkboxes once in stable release order', () => {
    expect(canonicalizeFactorySurfaces(['vocabulary', 'lessons', 'drills', 'arena_questions', 'quizzes', 'cards'])).toEqual([
      'lesson', 'arena', 'quiz', 'flashcard',
    ]);
  });

  it('uses requested lesson IDs and canonical surfaces in an order-independent fingerprint', () => {
    const first = generationPlanFingerprint([2, 1], ['lessons', 'vocabulary', 'quizzes']);
    const same = generationPlanFingerprint([1, 2], ['quizzes', 'drills']);
    const changedLessons = generationPlanFingerprint([1, 3], ['quizzes', 'drills']);
    const changedSurfaces = generationPlanFingerprint([1, 2], ['quizzes', 'cards']);

    expect(first).toBe(same);
    expect(changedLessons).not.toBe(first);
    expect(changedSurfaces).not.toBe(first);
  });
});
