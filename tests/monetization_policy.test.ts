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

describe('monetization_policy', () => {
  it('keeps exactly the first three lessons in the free tier', () => {
    expect(FREE_LESSON_LIMIT).toBe(3);
    expect(isFreeLesson(1)).toBe(true);
    expect(isFreeLesson(3)).toBe(true);
    expect(isFreeLesson(4)).toBe(false);
    expect(requiresPremiumForLesson(3)).toBe(false);
    expect(requiresPremiumForLesson(4)).toBe(true);
  });

  it('keeps free A1 lessons behind the normal bronze progression gate', () => {
    expect(resolveLessonAccess({
      lessonId: 3,
      unlocked: false,
      isPremium: false,
    })).toBe('progress_required');

    expect(resolveLessonAccess({
      lessonId: 3,
      unlocked: true,
      isPremium: false,
    })).toBe('available');
  });

  it('blocks lesson 4+ for non-premium even when progression unlocked it', () => {
    expect(resolveLessonAccess({
      lessonId: 4,
      unlocked: true,
      isPremium: false,
    })).toBe('premium_required');
  });

  it('builds free A1 unlocks sequentially from bronze scores', () => {
    expect(buildSequentialFreeLessonUnlocks({
      scores: [2.5, 2.4, 5],
      lessonCount: 10,
    })).toEqual([
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);

    expect(buildSequentialFreeLessonUnlocks({
      scores: [2.5, 2.5, 5],
      lessonCount: 10,
    })).toEqual([
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it('does not let legacy persisted unlocks open A1 without bronze scores', () => {
    expect(buildSequentialFreeLessonUnlocks({
      scores: new Array(10).fill(0),
      persistedUnlocked: [2, 3, 4, 5, 6, 7, 8],
      lessonCount: 10,
    })).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it('uses a course-level paywall context after the free sample', () => {
    expect(lessonPaywallContext(4)).toBe('course_after_lesson3');
  });

  it('lets premium users keep normal progression gates after A1', () => {
    expect(resolveLessonAccess({
      lessonId: 4,
      unlocked: true,
      isPremium: true,
    })).toBe('available');

    expect(resolveLessonAccess({
      lessonId: 4,
      unlocked: false,
      isPremium: true,
    })).toBe('progress_required');
  });

  it('keeps dev/no-limits overrides available for QA', () => {
    expect(resolveLessonAccess({
      lessonId: 32,
      unlocked: false,
      isPremium: false,
      noLimits: true,
    })).toBe('available');
  });

  it('keeps a finalized legacy cap free without expanding past it', () => {
    expect(hasLegacyFreeLessonAccess(6, 6)).toBe(true);
    expect(hasLegacyFreeLessonAccess(7, 6)).toBe(false);
    expect(requiresPremiumForLesson(6, 6)).toBe(false);
    expect(requiresPremiumForLesson(7, 6)).toBe(true);
    expect(lessonPaywallContext(6, 6)).toBeNull();
    expect(lessonPaywallContext(7, 6)).toBe('course_after_lesson3');
  });

  it('treats cap 4..8 as already-open legacy progress but keeps cap 3 sequential', () => {
    expect(isLegacyLessonGrandfatheredOpen(6, 6)).toBe(true);
    expect(isLegacyLessonGrandfatheredOpen(2, 3)).toBe(false);
    expect(resolveLessonAccess({
      lessonId: 6,
      unlocked: false,
      isPremium: false,
      legacyFreeLessonCap: 6,
    })).toBe('available');
    expect(resolveLessonAccess({
      lessonId: 2,
      unlocked: false,
      isPremium: false,
      legacyFreeLessonCap: 3,
    })).toBe('progress_required');
  });

  it('hydrates legacy sequential unlocks only when the frozen cap exceeds 3', () => {
    expect(buildSequentialFreeLessonUnlocks({
      scores: new Array(32).fill(0),
      freeLessonLimit: 3,
      legacyFreeLessonCap: 6,
    }).slice(0, 7)).toEqual([true, true, true, true, true, true, false]);

    expect(buildSequentialFreeLessonUnlocks({
      scores: new Array(32).fill(0),
      freeLessonLimit: 3,
      legacyFreeLessonCap: 3,
    }).slice(0, 4)).toEqual([true, false, false, false]);
  });
});
