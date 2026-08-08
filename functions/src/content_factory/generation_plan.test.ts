import { canonicalizeFactorySurfaces, generationPlanFingerprint } from './generation_plan';

describe('legacy content generation plan identity', () => {
  it('canonicalizes related legacy checkboxes once in stable release order', () => {
    expect(canonicalizeFactorySurfaces(['vocabulary', 'lessons', 'drills', 'cards'])).toEqual([
      'lesson', 'flashcard',
    ]);
  });

  it('uses requested lesson IDs and canonical surfaces in an order-independent fingerprint', () => {
    const first = generationPlanFingerprint([2, 1], ['lessons', 'vocabulary']);
    const same = generationPlanFingerprint([1, 2], ['drills']);
    const changedLessons = generationPlanFingerprint([1, 3], ['drills']);
    const changedSurfaces = generationPlanFingerprint([1, 2], ['cards']);

    expect(first).toBe(same);
    expect(changedLessons).not.toBe(first);
    expect(changedSurfaces).not.toBe(first);
  });
});
