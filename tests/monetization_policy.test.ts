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

/**
 * Решение владельца 2026-09-17 ОТМЕНИЛО правило 2026-09-08 «все 32 урока
 * открыты всем». Уроки остаются БЕСПЛАТНЫМИ (денег не просим), но закрыты
 * прогрессом; закрытый урок открывается за 100 жемчужин.
 */
describe('monetization_policy: курс бесплатный, но закрыт прогрессом (owner 2026-09-17)', () => {
  it('уроки основного курса бесплатны и не требуют Plus', () => {
    expect(FREE_LESSON_LIMIT).toBe(3);
    for (const lessonId of [1, 3, 4, 32]) {
      expect(isFreeLesson(lessonId)).toBe(true);
      expect(requiresPremiumForLesson(lessonId)).toBe(false);
      expect(lessonPaywallContext(lessonId)).toBeNull();
    }
  });

  it('первый урок открыт всегда, остальные — по переданному доступу', () => {
    expect(resolveLessonAccess({ lessonId: 1, unlocked: false, isPremium: false })).toBe('available');
    expect(resolveLessonAccess({ lessonId: 3, unlocked: true, isPremium: false })).toBe('available');
    expect(resolveLessonAccess({ lessonId: 3, unlocked: false, isPremium: false })).toBe('progress_required');
  });

  it('закрытый урок просит ПРОГРЕСС, а не подписку — даже у Plus', () => {
    expect(resolveLessonAccess({ lessonId: 32, unlocked: false, isPremium: true })).toBe('progress_required');
    expect(resolveLessonAccess({ lessonId: 32, unlocked: true, isPremium: true })).toBe('available');
  });

  it('бронза ★2.5 на предыдущем уроке открывает следующий', () => {
    expect(buildSequentialFreeLessonUnlocks({ scores: [2.4, 0, 0], lessonCount: 4 })).toEqual([true, false, false, false]);
    expect(buildSequentialFreeLessonUnlocks({ scores: [2.5, 2.5, 0], lessonCount: 4 })).toEqual([true, true, true, false]);
  });

  it('пустой прогресс оставляет открытым только первый урок', () => {
    const unlocked = buildSequentialFreeLessonUnlocks({ scores: new Array(32).fill(0) });
    expect(unlocked[0]).toBe(true);
    expect(unlocked.filter(Boolean)).toHaveLength(1);
  });

  it('купленные за жемчуг уроки открыты, но не тянут за собой следующий', () => {
    const unlocked = buildSequentialFreeLessonUnlocks({
      scores: new Array(32).fill(0),
      purchasedLessons: [5, 20],
    });
    expect(unlocked[4]).toBe(true);
    expect(unlocked[19]).toBe(true);
    expect(unlocked[5]).toBe(false);
    expect(unlocked[20]).toBe(false);
  });

  it('границы уровней 9/19/29 открывает только зачёт', () => {
    const scores = new Array(32).fill(5);
    expect(buildSequentialFreeLessonUnlocks({ scores })[8]).toBe(false);
    expect(buildSequentialFreeLessonUnlocks({ scores, passedExams: { A1: true } })[8]).toBe(true);
  });

  it('dev/no-limits остаются доступом для QA', () => {
    expect(resolveLessonAccess({ lessonId: 32, unlocked: false, isPremium: false, noLimits: true })).toBe('available');
    expect(resolveLessonAccess({ lessonId: 32, unlocked: false, isPremium: false, devMode: true })).toBe('available');
  });

  it('сохраняет замороженный legacy-потолок и его классификацию', () => {
    expect(hasLegacyFreeLessonAccess(6, 6)).toBe(true);
    expect(hasLegacyFreeLessonAccess(7, 6)).toBe(false);
    expect(isLegacyLessonGrandfatheredOpen(6, 6)).toBe(true);
    expect(isLegacyLessonGrandfatheredOpen(2, 3)).toBe(false);
    // Дедушкин доступ выдан раньше и не отбирается закрытием курса.
    expect(resolveLessonAccess({ lessonId: 6, unlocked: false, isPremium: false, legacyFreeLessonCap: 6 })).toBe('available');
  });

  it('legacy-потолок открывает только свои уроки, а не весь курс', () => {
    const unlocked = buildSequentialFreeLessonUnlocks({
      scores: new Array(32).fill(0),
      legacyFreeLessonCap: 6,
    });
    expect(unlocked.slice(0, 6)).toEqual(new Array(6).fill(true));
    expect(unlocked[6]).toBe(false);
    expect(unlocked[31]).toBe(false);
  });
});
