import {
  FREE_LESSON_LIMIT,
  buildPremiumLessonUnlocks,
  buildSequentialFreeLessonUnlocks,
  hasLegacyFreeLessonAccess,
  isFreeLesson,
  isLegacyLessonGrandfatheredOpen,
  lessonPaywallContext,
  requiresPremiumForLesson,
  resolveLessonAccess,
} from '../app/monetization_policy';

describe('monetization_policy: первые три урока free, остальное Plus', () => {
  it('оставляет free только первые три урока', () => {
    expect(FREE_LESSON_LIMIT).toBe(3);
    for (const lessonId of [1, 2, 3]) {
      expect(isFreeLesson(lessonId)).toBe(true);
      expect(requiresPremiumForLesson(lessonId)).toBe(false);
      expect(lessonPaywallContext(lessonId)).toBeNull();
    }
    for (const lessonId of [4, 9, 19, 29, 32]) {
      expect(isFreeLesson(lessonId)).toBe(false);
      expect(requiresPremiumForLesson(lessonId)).toBe(true);
      expect(lessonPaywallContext(lessonId)).toBe('course_after_lesson3');
    }
  });

  it('первые три урока открыты безусловно', () => {
    expect(resolveLessonAccess({ lessonId: 1, unlocked: false, isPremium: false })).toBe('available');
    expect(resolveLessonAccess({ lessonId: 2, unlocked: false, isPremium: false })).toBe('available');
    expect(resolveLessonAccess({ lessonId: 3, unlocked: false, isPremium: false })).toBe('available');
  });

  it('free направляется на Plus после третьего урока, а Plus сохраняет последовательный замок', () => {
    expect(resolveLessonAccess({ lessonId: 4, unlocked: true, isPremium: false })).toBe('premium_required');
    expect(resolveLessonAccess({ lessonId: 4, unlocked: false, purchased: true, isPremium: false })).toBe('available');
    expect(resolveLessonAccess({ lessonId: 32, unlocked: false, isPremium: true })).toBe('progress_required');
    expect(resolveLessonAccess({ lessonId: 32, unlocked: true, isPremium: true })).toBe('available');
  });

  it('free-список не открывает урок 4 старым прогрессом', () => {
    expect(buildSequentialFreeLessonUnlocks({ scores: [5, 5, 5], lessonCount: 4 })).toEqual([true, true, true, false]);
  });

  it('Plus сразу открывает первые три урока и первый урок каждого раздела', () => {
    const unlocked = buildPremiumLessonUnlocks({ scores: new Array(32).fill(0) });
    expect(unlocked.flatMap((open, index) => open ? [index + 1] : [])).toEqual([1, 2, 3, 9, 19, 29]);
  });

  it('Plus открывает остальные уроки только бронзой на предыдущем', () => {
    const scores = new Array(32).fill(0);
    scores[8] = 2.5;
    scores[18] = 2.4;
    const unlocked = buildPremiumLessonUnlocks({ scores });
    expect(unlocked[9]).toBe(true); // урок 10 после бронзы на 9-м
    expect(unlocked[19]).toBe(false); // урок 20 ещё рано
    expect(unlocked[27]).toBe(false); // достигнутый уровень целиком не раскрывается
  });

  it('free-список держит открытыми первые три урока, закрывает старый прогресс и сохраняет купленные права', () => {
    const unlocked = buildSequentialFreeLessonUnlocks({ scores: new Array(32).fill(0) });
    expect(unlocked.slice(0, 3)).toEqual([true, true, true]);
    expect(unlocked.slice(3).some(Boolean)).toBe(false);

    const withOldProgress = buildSequentialFreeLessonUnlocks({
      scores: new Array(32).fill(5),
      persistedUnlocked: [4, 9, 19, 29],
      purchasedLessons: [5, 20],
      passedExams: { A1: true, A2: true, B1: true },
      legacyFreeLessonCap: 8,
    });
    expect(withOldProgress.slice(0, 3)).toEqual([true, true, true]);
    expect(withOldProgress[3]).toBe(false);
    expect(withOldProgress[4]).toBe(true);
    expect(withOldProgress[8]).toBe(false);
    expect(withOldProgress[18]).toBe(false);
    expect(withOldProgress[19]).toBe(true);
    expect(withOldProgress[28]).toBe(false);
  });

  it('dev/no-limits остаются доступом для QA', () => {
    expect(resolveLessonAccess({ lessonId: 32, unlocked: false, isPremium: false, noLimits: true })).toBe('available');
    expect(resolveLessonAccess({ lessonId: 32, unlocked: false, isPremium: false, devMode: true })).toBe('available');
  });

  it('legacy-потолок больше не отменяет Plus-пейвол', () => {
    expect(hasLegacyFreeLessonAccess(6, 6)).toBe(true);
    expect(hasLegacyFreeLessonAccess(7, 6)).toBe(false);
    expect(isLegacyLessonGrandfatheredOpen(6, 6)).toBe(true);
    expect(isLegacyLessonGrandfatheredOpen(2, 3)).toBe(false);
    expect(resolveLessonAccess({ lessonId: 6, unlocked: true, isPremium: false, legacyFreeLessonCap: 6 })).toBe('premium_required');
  });
});
