/**
 * Гарантирует качество локали **es** для экранов интро: минимум 3 слайда,
 * поля titleES/textES и trES для примеров в блоках how.
 */
import { getLessonIntroScreens, LESSON_DATA } from '../app/lesson_data_all';
import { EXTRA_INTRO_SCREENS } from '../app/lesson_intro_screens_9_32';
import type { LessonIntroScreen } from '../app/lesson_data_types';

function assertScreenSpanishComplete(screen: LessonIntroScreen, _lessonId: number, _index: number): void {
  expect(typeof screen.titleES).toBe('string');
  expect((screen.titleES as string).trim().length).toBeGreaterThan(0);
  expect(typeof screen.textES).toBe('string');
  expect((screen.textES as string).trim().length).toBeGreaterThan(0);
  const examples = screen.examples;
  if (!examples?.length) return;
  examples.forEach((ex) => {
    expect(typeof ex.trES).toBe('string');
    expect((ex.trES as string).trim().length).toBeGreaterThan(0);
  });
}

describe('lesson intro screens (es locale fields)', () => {
  it('sanity: LESSON_DATA exposes intro screens length for lesson 1', () => {
    expect(LESSON_DATA[1]?.introScreens?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it('getLessonIntroScreens(1) matches minimum intro depth', () => {
    expect(getLessonIntroScreens(1).length).toBeGreaterThanOrEqual(3);
  });

  it('EXTRA_INTRO_SCREENS covers 9–32 with non-empty arrays', () => {
    for (let lessonId = 9; lessonId <= 32; lessonId++) {
      const extra = EXTRA_INTRO_SCREENS[lessonId];
      expect(extra).toBeDefined();
      expect(extra!.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('getLessonIntroScreens returns >= 3 slides and full ES fields for lessons 1–32', () => {
    for (let lessonId = 1; lessonId <= 32; lessonId++) {
      const screens = getLessonIntroScreens(lessonId);
      expect(screens.length).toBeGreaterThanOrEqual(3);
      screens.forEach((s, i) => assertScreenSpanishComplete(s, lessonId, i));
    }
  });
});
