/**
 * Intro-screens for lessons 9–32.
 *
 * Уроки 9–16: español L2 в `lesson_intro_screens_es_l2.ts` (PROMPT-005).
 * Уроки 17–32: реэкспорт из того же модуля через `lesson_intro_screens_17_32.ts`.
 *
 * Подключается через `getLessonIntroScreens` в lesson_data_all.ts.
 *
 * Структура каждого урока — 3 блока:
 *   1) why — зачем эта тема в реальной жизни
 *   2) how — как именно строится фраза + 3 примера
 *   3) tip / trap — главный практический совет или ловушка для русско/украиноговорящих
 */
import type { LessonIntroScreen } from './lesson_data_types';
import {
  LESSON_9_INTRO_SCREENS,
  LESSON_10_INTRO_SCREENS,
  LESSON_11_INTRO_SCREENS,
  LESSON_12_INTRO_SCREENS,
  LESSON_13_INTRO_SCREENS,
  LESSON_14_INTRO_SCREENS,
  LESSON_15_INTRO_SCREENS,
  LESSON_16_INTRO_SCREENS,
} from './lesson_intro_screens_es_l2';
import {
  LESSON_17_INTRO_EXTRA,
  LESSON_18_INTRO_EXTRA,
  LESSON_19_INTRO_EXTRA,
  LESSON_20_INTRO_EXTRA,
  LESSON_21_INTRO_EXTRA,
  LESSON_22_INTRO_EXTRA,
  LESSON_23_INTRO_EXTRA,
  LESSON_24_INTRO_EXTRA,
  LESSON_25_INTRO_EXTRA,
  LESSON_26_INTRO_EXTRA,
  LESSON_27_INTRO_EXTRA,
  LESSON_28_INTRO_EXTRA,
  LESSON_29_INTRO_EXTRA,
  LESSON_30_INTRO_EXTRA,
  LESSON_31_INTRO_EXTRA,
  LESSON_32_INTRO_EXTRA,
} from './lesson_intro_screens_17_32';

/** Карта для `getLessonIntroScreens`: один номер урока → три слайда интро. */
export const EXTRA_INTRO_SCREENS: Record<number, LessonIntroScreen[]> = {
  9: LESSON_9_INTRO_SCREENS,
  10: LESSON_10_INTRO_SCREENS,
  11: LESSON_11_INTRO_SCREENS,
  12: LESSON_12_INTRO_SCREENS,
  13: LESSON_13_INTRO_SCREENS,
  14: LESSON_14_INTRO_SCREENS,
  15: LESSON_15_INTRO_SCREENS,
  16: LESSON_16_INTRO_SCREENS,
  17: LESSON_17_INTRO_EXTRA,
  18: LESSON_18_INTRO_EXTRA,
  19: LESSON_19_INTRO_EXTRA,
  20: LESSON_20_INTRO_EXTRA,
  21: LESSON_21_INTRO_EXTRA,
  22: LESSON_22_INTRO_EXTRA,
  23: LESSON_23_INTRO_EXTRA,
  24: LESSON_24_INTRO_EXTRA,
  25: LESSON_25_INTRO_EXTRA,
  26: LESSON_26_INTRO_EXTRA,
  27: LESSON_27_INTRO_EXTRA,
  28: LESSON_28_INTRO_EXTRA,
  29: LESSON_29_INTRO_EXTRA,
  30: LESSON_30_INTRO_EXTRA,
  31: LESSON_31_INTRO_EXTRA,
  32: LESSON_32_INTRO_EXTRA,
};
