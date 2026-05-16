import {
  FREE_LESSON_LIMIT,
  isFreeLesson,
  lessonPaywallContext,
  requiresPremiumForLesson,
  resolveLessonAccess,
} from '../app/monetization_policy';

describe('monetization_policy', () => {
  it('keeps only the first three lessons in the free sample', () => {
    expect(FREE_LESSON_LIMIT).toBe(3);
    expect(isFreeLesson(1)).toBe(true);
    expect(isFreeLesson(3)).toBe(true);
    expect(isFreeLesson(4)).toBe(false);
    expect(requiresPremiumForLesson(3)).toBe(false);
    expect(requiresPremiumForLesson(4)).toBe(true);
  });

  it('blocks lesson 4+ for non-premium even when progression unlocked it', () => {
    expect(resolveLessonAccess({
      lessonId: 4,
      unlocked: true,
      isPremium: false,
    })).toBe('premium_required');
  });

  it('uses a course-level paywall context after the free sample', () => {
    expect(lessonPaywallContext(4)).toBe('course_after_lesson3');
  });

  it('lets premium users keep normal progression gates after lesson 3', () => {
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
});
