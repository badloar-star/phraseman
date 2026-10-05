import { FREE_LESSON_LIMIT, resolveLessonAccess } from '../app/monetization_policy';

// зачем (learn-1, координатор 05.10: «Free видит "Ещё рано" вместо пейвола» — выручка): на эмуляторе dev-сборка всегда
// даёт devMode=true (DEV_CONTENT_UNLOCK), поэтому лог Сверки отвечает лишь наполовину. Здесь — прод (devMode=false):
// Free на уроке за Plus обязан получить пейвол, а не замок прогресса. Красный тест = настоящий прод-баг.
const PLUS_LESSON = FREE_LESSON_LIMIT + 1;

describe('resolveLessonAccess: Free user on a Plus lesson (production, devMode=false)', () => {
  it.each([false, true])('Plus lesson, unlocked=%p → premium_required (paywall), not the "too early" gate', (unlocked) => {
    expect(resolveLessonAccess({ lessonId: PLUS_LESSON, unlocked, isPremium: false, devMode: false })).toBe('premium_required');
    expect(resolveLessonAccess({ lessonId: 20, unlocked, isPremium: false, devMode: false })).toBe('premium_required');
  });

  it('a free lesson still locked by progress → progress_required (the honest "too early" gate)', () => {
    expect(resolveLessonAccess({ lessonId: 2, unlocked: false, isPremium: false, devMode: false })).toBe('progress_required');
  });

  it('legacy cap D122 (old users, up to 8): lesson 5 has no paywall, only the progress lock', () => {
    expect(resolveLessonAccess({ lessonId: 5, unlocked: false, isPremium: false, devMode: false, legacyFreeLessonCap: 8 }))
      .toBe('progress_required');
    expect(resolveLessonAccess({ lessonId: 9, unlocked: false, isPremium: false, devMode: false, legacyFreeLessonCap: 8 }))
      .toBe('premium_required');
  });

  it('Plus user: only the progress lock', () => {
    expect(resolveLessonAccess({ lessonId: PLUS_LESSON, unlocked: false, isPremium: true, devMode: false })).toBe('progress_required');
    expect(resolveLessonAccess({ lessonId: PLUS_LESSON, unlocked: true, isPremium: true, devMode: false })).toBe('available');
  });

  it('dev build (devMode=true) drops the Plus branch — explains the emulator showing "too early" to Free', () => {
    expect(resolveLessonAccess({ lessonId: PLUS_LESSON, unlocked: false, isPremium: false, devMode: true })).toBe('progress_required');
  });
});
