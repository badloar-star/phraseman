// Реестр контента новой «Теории»: lessonId → структурированная тема урока.
//
// Каждый theory_content_lessonN.ts экспортирует LESSONn_THEORY одного вида
// ({ titleRu, titleUk, titleEs, sections: L1Section[] }). Здесь они собраны в карту,
// чтобы экран теории (LessonTheoryNew в hint.tsx) мог отрисовать любой урок.

import type { L1Section } from './theory_content_lesson1';

import { LESSON1_THEORY } from './theory_content_lesson1';
import { LESSON2_THEORY } from './theory_content_lesson2';
import { LESSON3_THEORY } from './theory_content_lesson3';
import { LESSON4_THEORY } from './theory_content_lesson4';
import { LESSON5_THEORY } from './theory_content_lesson5';
import { LESSON6_THEORY } from './theory_content_lesson6';
import { LESSON7_THEORY } from './theory_content_lesson7';
import { LESSON8_THEORY } from './theory_content_lesson8';
import { LESSON9_THEORY } from './theory_content_lesson9';
import { LESSON10_THEORY } from './theory_content_lesson10';
import { LESSON11_THEORY } from './theory_content_lesson11';
import { LESSON12_THEORY } from './theory_content_lesson12';
import { LESSON13_THEORY } from './theory_content_lesson13';
import { LESSON14_THEORY } from './theory_content_lesson14';
import { LESSON15_THEORY } from './theory_content_lesson15';
import { LESSON16_THEORY } from './theory_content_lesson16';
import { LESSON17_THEORY } from './theory_content_lesson17';
import { LESSON18_THEORY } from './theory_content_lesson18';
import { LESSON19_THEORY } from './theory_content_lesson19';
import { LESSON20_THEORY } from './theory_content_lesson20';
import { LESSON21_THEORY } from './theory_content_lesson21';
import { LESSON22_THEORY } from './theory_content_lesson22';
import { LESSON23_THEORY } from './theory_content_lesson23';
import { LESSON24_THEORY } from './theory_content_lesson24';
import { LESSON25_THEORY } from './theory_content_lesson25';
import { LESSON26_THEORY } from './theory_content_lesson26';
import { LESSON27_THEORY } from './theory_content_lesson27';
import { LESSON28_THEORY } from './theory_content_lesson28';
import { LESSON29_THEORY } from './theory_content_lesson29';
import { LESSON30_THEORY } from './theory_content_lesson30';
import { LESSON31_THEORY } from './theory_content_lesson31';
import { LESSON32_THEORY } from './theory_content_lesson32';

export interface LessonTheoryContent {
  titleRu: string;
  titleUk: string;
  titleEs: string;
  sections: L1Section[];
}

const REGISTRY: Record<number, LessonTheoryContent> = {
  1: LESSON1_THEORY,
  2: LESSON2_THEORY,
  3: LESSON3_THEORY,
  4: LESSON4_THEORY,
  5: LESSON5_THEORY,
  6: LESSON6_THEORY,
  7: LESSON7_THEORY,
  8: LESSON8_THEORY,
  9: LESSON9_THEORY,
  10: LESSON10_THEORY,
  11: LESSON11_THEORY,
  12: LESSON12_THEORY,
  13: LESSON13_THEORY,
  14: LESSON14_THEORY,
  15: LESSON15_THEORY,
  16: LESSON16_THEORY,
  17: LESSON17_THEORY,
  18: LESSON18_THEORY,
  19: LESSON19_THEORY,
  20: LESSON20_THEORY,
  21: LESSON21_THEORY,
  22: LESSON22_THEORY,
  23: LESSON23_THEORY,
  24: LESSON24_THEORY,
  25: LESSON25_THEORY,
  26: LESSON26_THEORY,
  27: LESSON27_THEORY,
  28: LESSON28_THEORY,
  29: LESSON29_THEORY,
  30: LESSON30_THEORY,
  31: LESSON31_THEORY,
  32: LESSON32_THEORY,
};

/** Контент теории урока, или undefined если урока нет в реестре. */
export function getTheoryContent(lessonId: number): LessonTheoryContent | undefined {
  return REGISTRY[lessonId];
}

/** Есть ли у урока новая теория. */
export function hasTheoryContent(lessonId: number): boolean {
  return lessonId in REGISTRY;
}

/** Все lessonId с готовой новой теорией. */
export const THEORY_LESSON_IDS: readonly number[] = Object.keys(REGISTRY).map(Number);
