import {
  FREE_LESSON_LIMIT,
  buildSequentialFreeLessonUnlocks,
  isFreeLesson,
  lessonPaywallContext,
  requiresPremiumForLesson,
  resolveLessonAccess,
} from '../app/monetization_policy';

describe('monetization_policy', () => {
  it('keeps the whole A1 level in the free tier', () => {
    expect(FREE_LESSON_LIMIT).toBe(8);
    expect(isFreeLesson(1)).toBe(true);
    expect(isFreeLesson(8)).toBe(true);
    expect(isFreeLesson(9)).toBe(false);
    expect(requiresPremiumForLesson(8)).toBe(false);
    expect(requiresPremiumForLesson(9)).toBe(true);
  });

  it('keeps free A1 lessons behind the normal bronze progression gate', () => {
    expect(resolveLessonAccess({
      lessonId: 4,
      unlocked: false,
      isPremium: false,
    })).toBe('progress_required');

    expect(resolveLessonAccess({
      lessonId: 4,
      unlocked: true,
      isPremium: false,
    })).toBe('available');
  });

  it('blocks lesson 9+ for non-premium even when progression unlocked it', () => {
    expect(resolveLessonAccess({
      lessonId: 9,
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
      scores: [2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 5],
      lessonCount: 10,
    })).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
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
    expect(lessonPaywallContext(9)).toBe('course_after_lesson3');
  });

  it('lets premium users keep normal progression gates after A1', () => {
    expect(resolveLessonAccess({
      lessonId: 9,
      unlocked: true,
      isPremium: true,
    })).toBe('available');

    expect(resolveLessonAccess({
      lessonId: 9,
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
});
