// ════════════════════════════════════════════════════════════════════════════
// lessons.ts — Централизованные названия уроков
// Используется в: home.tsx, index.tsx, lesson_menu.tsx, exam.tsx
// ════════════════════════════════════════════════════════════════════════════

import type { Lang } from './i18n';

export const LESSON_NAMES_RU = [
  'Местоимения и глагол To Be',      // 1
  'Отрицание и вопросы (To Be)',      // 2
  'Present Simple: Утверждение',      // 3
  'Present Simple: Отрицание',        // 4
  'Present Simple: Вопросы',          // 5
  'Специальные вопросы',              // 6
  'Глагол To Have',                   // 7
  'Предлоги времени',                 // 8
  'There is / There are',             // 9
  'Модальные глаголы',                // 10
  'Past Simple: Правильные',          // 11
  'Past Simple: Неправильные',        // 12
  'Future Simple',                    // 13
  'Степени сравнения',                // 14
  'Притяжательные местоимения',       // 15
  'Фразовые глаголы',                 // 16
  'Present Continuous',               // 17
  'Повелительное наклонение',         // 18
  'Предлоги места',                   // 19
  'Артикли',                          // 20
  'Неопределённые местоимения',       // 21
  'Герундий',                         // 22
  'Passive Voice',                    // 23
  'Present Perfect',                  // 24
  'Past Continuous',                  // 25
  'Условные предложения',             // 26
  'Косвенная речь',                   // 27
  'Возвратные местоимения',           // 28
  'Used to',                          // 29
  'Relative Clauses',                 // 30
  'Complex Object',                   // 31
  'Финальное повторение',             // 32
] as const;

export const LESSON_NAMES_UK = [
  'Займенники і дієслово To Be',      // 1
  'Заперечення і питання (To Be)',    // 2
  'Present Simple: Ствердження',      // 3
  'Present Simple: Заперечення',      // 4
  'Present Simple: Питання',          // 5
  'Спеціальні питання',               // 6
  'Дієслово To Have',                 // 7
  'Прийменники часу',                 // 8
  'There is / There are',             // 9
  'Модальні дієслова',                // 10
  'Past Simple: Правильні',           // 11
  'Past Simple: Неправильні',         // 12
  'Future Simple',                    // 13
  'Ступені порівняння',               // 14
  'Присвійні займенники',             // 15
  'Фразові дієслова',                 // 16
  'Present Continuous',               // 17
  'Наказовий спосіб',                 // 18
  'Прийменники місця',                // 19
  'Артиклі',                          // 20
  'Неозначені займенники',            // 21
  'Герундій',                         // 22
  'Passive Voice',                    // 23
  'Present Perfect',                  // 24
  'Past Continuous',                  // 25
  'Умовні речення',                   // 26
  'Непряма мова',                     // 27
  'Зворотні займенники',              // 28
  'Used to',                          // 29
  'Relative Clauses',                 // 30
  'Complex Object',                   // 31
  'Фінальне повторення',              // 32
] as const;

/** Испанские подписи тем у английской программы — стиль учебников inglés para hispanohablantes; англ. грам. термины там, где так принято в дидактике. */
export const LESSON_NAMES_ES = [
  'Pronombres personales y verbo to be', // 1
  'Negación e interrogación con to be', // 2
  'Present Simple: afirmación', // 3
  'Present Simple: negación', // 4
  'Present Simple: preguntas', // 5
  'Interrogativos (preguntas abiertas)', // 6
  'Verbo to have', // 7
  'Preposiciones de tiempo', // 8
  'There is / There are', // 9
  'Verbos modales', // 10
  'Past Simple: verbos regulares', // 11
  'Past Simple: verbos irregulares', // 12
  'Future Simple', // 13
  'Grados de comparación', // 14
  'Adjetivos y pronombres posesivos', // 15
  'Verbos frasales', // 16
  'Present Continuous', // 17
  'Imperativo', // 18
  'Preposiciones de lugar', // 19
  'Artículos definidos e indefinidos', // 20
  'Pronombres indefinidos', // 21
  'Gerundio (forma en -ing)', // 22
  'Voz pasiva', // 23
  'Present Perfect', // 24
  'Past Continuous', // 25
  'Oraciones condicionales', // 26
  'Estilo indirecto', // 27
  'Pronombres reflexivos', // 28
  'Used to', // 29
  'Cláusulas relativas', // 30
  'Construcciones con objeto e infinitivo', // 31
  'Repaso final', // 32
] as const;

export function lessonNamesForLang(lang: Lang): readonly string[] {
  if (lang === 'uk') return LESSON_NAMES_UK;
  if (lang === 'es') return LESSON_NAMES_ES;
  return LESSON_NAMES_RU;
}

export type LessonIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
  12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 |
  26 | 27 | 28 | 29 | 30 | 31;
