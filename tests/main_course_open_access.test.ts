jest.mock('../app/premium_guard', () => ({
  getVerifiedPremiumStatus: jest.fn(async () => false),
  isTesterNoLimitsActive: jest.fn(async () => false),
}));
jest.mock('../app/legacy_free_lesson_access', () => ({ readLegacyFreeLessonCap: jest.fn(async () => 0) }));
jest.mock('../app/remote_flags', () => ({
  ...jest.requireActual('../app/remote_flags'),
  getFreeLessonLimit: () => 3,
  getFreeLessonsExtra: () => new Set(),
  getPremiumLessonsExtra: () => new Set(Array.from({ length: 32 }, (_, i) => i + 1)),
}));

import { buildSequentialFreeLessonUnlocks, isFreeLesson, requiresPremiumForLesson, resolveLessonAccess, lessonPaywallContext } from '../app/monetization_policy';
import { getLessonLockInfo, isLessonUnlockedByEarnedProgress, isLessonUnlockedByPremiumCourse, resolveLastAvailableLessonId } from '../app/lesson_lock_system';
import { resolveLessonRuntimeGate } from '../app/lesson_premium_gate';
import { getVerifiedPremiumStatus } from '../app/premium_guard';
import { isOpenMainCourseLesson } from '../app/main_course_access';

describe('owner: all 32 main lessons open without Plus or earned unlocks', () => {
  it.each([0, -1, 1.5, 33, Number.NaN, Number.POSITIVE_INFINITY])('does not extend the owner exception to invalid/outside id %s', (lessonId) => {
    expect(isOpenMainCourseLesson(lessonId)).toBe(false);
  });
  it.each(Array.from({ length: 32 }, (_, i) => i + 1))('opens lesson %i across list, menu and exercise access checks', async (lessonId) => {
    expect(isFreeLesson(lessonId)).toBe(true);
    expect(requiresPremiumForLesson(lessonId)).toBe(false);
    expect(lessonPaywallContext(lessonId)).toBeNull();
    for (const isPremium of [false, true]) {
      expect(resolveLessonAccess({ lessonId, unlocked: false, isPremium })).toBe('available');
    }
    expect((await getLessonLockInfo(lessonId)).isUnlocked).toBe(true);
    expect(await isLessonUnlockedByEarnedProgress(lessonId)).toBe(true);
    expect(await isLessonUnlockedByPremiumCourse(lessonId)).toBe(true);
    expect(await resolveLastAvailableLessonId(lessonId)).toBe(lessonId);
    expect(await resolveLessonRuntimeGate(lessonId)).toBe('available');
  });

  it('opens all lesson cards with empty progress and stale premium remote overrides', () => {
    expect(buildSequentialFreeLessonUnlocks({ scores: [], persistedUnlocked: [], freeLessonLimit: 3 })).toEqual(new Array(32).fill(true));
  });

  it('does not wait for subscription verification to open a main lesson', async () => {
    jest.mocked(getVerifiedPremiumStatus).mockClear();
    expect(await resolveLessonRuntimeGate(32)).toBe('available');
    expect(getVerifiedPremiumStatus).not.toHaveBeenCalled();
  });
});
