import { CONTEXT_BENEFITS, getHeroPlannedCopy, getPaywallCopy } from '../app/paywall_copy';
import { MAIN_COURSE_PLUS_BENEFITS, MAIN_COURSE_PLUS_DESCRIPTION } from '../app/main_course_plus_copy';

describe('Plus copy after the three free main lessons', () => {
  it.each(['course_after_lesson3', 'lesson_b1', 'free_lessons_complete', 'level_up', 'notification_upsell'] as const)('%s explains ordered Plus access after lesson 3', (context) => {
    const copy = getPaywallCopy(context);
    for (const subtitle of [copy.subtitleRu, copy.subtitleUk, copy.subtitleEs, ...Object.values(getHeroPlannedCopy(context, 0).subtitle)]) {
      expect(subtitle).not.toContain('32');
    }
    // зачем (владелец 2026-09-22, 114baf437): прежняя фраза «Первые три урока доступны бесплатно…
    // остальные открываются по порядку» рассказывала, что человек уже получил, и называла уровни.
    // Теперь у всех курсовых контекстов один текст о том, что впереди, — без прошлого и без A1/B2.
    expect(copy.subtitleRu).toBe(MAIN_COURSE_PLUS_DESCRIPTION.ru);
    expect(copy.subtitleRu).not.toMatch(/\b(A1|A2|B1|B2)\b|доступны бесплатно|закончил|позади/);
  });
  it.each(['course_after_lesson3', 'lesson_b1', 'free_lessons_complete', 'level_up', 'notification_upsell'] as const)('%s sells additional Plus features rather than main-lesson access', (context) => {
    expect(CONTEXT_BENEFITS[context]).toEqual(MAIN_COURSE_PLUS_BENEFITS);
  });
});
