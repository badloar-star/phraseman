import { CONTEXT_BENEFITS, getHeroPlannedCopy, getPaywallCopy } from '../app/paywall_copy';
import { MAIN_COURSE_PLUS_BENEFITS } from '../app/main_course_plus_copy';

describe('Plus copy after the three free main lessons', () => {
  it.each(['course_after_lesson3', 'lesson_b1', 'free_lessons_complete', 'level_up', 'notification_upsell'] as const)('%s explains ordered Plus access after lesson 3', (context) => {
    const copy = getPaywallCopy(context);
    for (const subtitle of [copy.subtitleRu, copy.subtitleUk, copy.subtitleEs, ...Object.values(getHeroPlannedCopy(context, 0).subtitle)]) {
      expect(subtitle).not.toContain('32');
    }
    expect(copy.subtitleRu).toContain('Первые три урока доступны бесплатно');
    expect(copy.subtitleRu).toContain('остальные открываются по порядку');
  });
  it.each(['course_after_lesson3', 'lesson_b1', 'free_lessons_complete', 'level_up', 'notification_upsell'] as const)('%s sells additional Plus features rather than main-lesson access', (context) => {
    expect(CONTEXT_BENEFITS[context]).toEqual(MAIN_COURSE_PLUS_BENEFITS);
  });
});
