import {
  FREE_LESSON_LIMIT,
  buildSequentialFreeLessonUnlocks,
  hasLegacyFreeLessonAccess,
  isFreeLesson,
  isLegacyLessonGrandfatheredOpen,
  lessonPaywallContext,
  requiresPremiumForLesson,
  resolveLessonAccess,
} from '../app/monetization_policy';

describe('monetization_policy: main course is free (owner 2026-09-08)', () => {
  it('keeps the historical threshold for migrations while opening all main lessons', () => {
    expect(FREE_LESSON_LIMIT).toBe(3);
    for (const lessonId of [1, 3, 4, 32]) {
      expect(isFreeLesson(lessonId)).toBe(true);
      expect(requiresPremiumForLesson(lessonId)).toBe(false);
    }
  });

  it.each([false, true])('opens a main lesson with persisted unlocked=%s', (unlocked) => {
    expect(resolveLessonAccess({ lessonId: 3, unlocked, isPremium: false })).toBe('available');
  });

  it('opens lesson 4+ for non-premium regardless of progression', () => {
    expect(resolveLessonAccess({ lessonId: 4, unlocked: false, isPremium: false })).toBe('available');
  });

  it.each([[2.5, 2.4, 5], [2.5, 2.5, 5]])('does not use bronze scores to close main lessons (%j)', (...scores) => {
    expect(buildSequentialFreeLessonUnlocks({ scores, lessonCount: 10 })).toEqual(new Array(10).fill(true));
  });

  it('opens lessons with stale persisted unlocks and no scores', () => {
    expect(buildSequentialFreeLessonUnlocks({ scores: new Array(10).fill(0), persistedUnlocked: [2, 3, 4, 5, 6, 7, 8], lessonCount: 10 })).toEqual(new Array(10).fill(true));
  });

  it('does not attach a paywall context after the old free sample', () => {
    expect(lessonPaywallContext(4)).toBeNull();
  });

  it.each([false, true])('also opens all lessons for Plus users with unlocked=%s', (unlocked) => {
    expect(resolveLessonAccess({ lessonId: 32, unlocked, isPremium: true })).toBe('available');
  });

  it('keeps dev/no-limits overrides available for QA', () => {
    expect(resolveLessonAccess({ lessonId: 32, unlocked: false, isPremium: false, noLimits: true })).toBe('available');
  });

  it('preserves the finalized legacy cap without letting it close other main lessons', () => {
    expect(hasLegacyFreeLessonAccess(6, 6)).toBe(true);
    expect(hasLegacyFreeLessonAccess(7, 6)).toBe(false);
    expect(requiresPremiumForLesson(6, 6)).toBe(false);
    expect(requiresPremiumForLesson(7, 6)).toBe(false);
    expect(lessonPaywallContext(6, 6)).toBeNull();
    expect(lessonPaywallContext(7, 6)).toBeNull();
  });

  it('preserves historical grandfathering classification, independently of current access', () => {
    expect(isLegacyLessonGrandfatheredOpen(6, 6)).toBe(true);
    expect(isLegacyLessonGrandfatheredOpen(2, 3)).toBe(false);
    for (const cap of [3, 6]) {
      expect(resolveLessonAccess({ lessonId: 6, unlocked: false, isPremium: false, legacyFreeLessonCap: cap })).toBe('available');
    }
  });

  it.each([3, 6])('opens all 32 with a frozen cap of %i', (legacyFreeLessonCap) => {
    expect(buildSequentialFreeLessonUnlocks({ scores: new Array(32).fill(0), freeLessonLimit: 3, legacyFreeLessonCap })).toEqual(new Array(32).fill(true));
  });
});
