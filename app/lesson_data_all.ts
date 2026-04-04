// Lesson Data - Index File
// Re-exports all lesson data from split files

export type { LessonWord, LessonPhrase, LessonIntroScreen, LessonData } from './lesson_data_types';

import { LessonData, LessonIntroScreen, LessonPhrase } from './lesson_data_types';

// === Lessons 1-8 ===
import {
  LESSON_1_INTRO_SCREENS, LESSON_1_ENCOURAGEMENT_SCREENS, LESSON_1_PHRASES,
  LESSON_2_INTRO_SCREENS, LESSON_2_PHRASES,
  LESSON_3_INTRO_SCREENS, LESSON_3_ENCOURAGEMENT_SCREENS, LESSON_3_PHRASES,
  LESSON_4_INTRO_SCREENS, LESSON_4_VOCABULARY, LESSON_4_IRREGULAR_VERBS, LESSON_4_PHRASES,
  LESSON_5_INTRO_SCREENS, LESSON_5_ENCOURAGEMENT_SCREENS, LESSON_5_PHRASES,
  LESSON_6_INTRO_SCREENS, LESSON_6_ENCOURAGEMENT_SCREENS, LESSON_6_PHRASES,
  LESSON_6_VOCABULARY, LESSON_6_IRREGULAR_VERBS,
  LESSON_7_INTRO_SCREENS, LESSON_7_ENCOURAGEMENT_SCREENS, LESSON_7_PHRASES,
  LESSON_7_VOCABULARY, LESSON_7_IRREGULAR_VERBS,
  LESSON_8_INTRO_SCREENS, LESSON_8_PHRASES,
} from './lesson_data_1_8';

// === Lessons 9-16 ===
import {
  LESSON_9_INTRO_SCREENS, LESSON_9_PHRASES,
  LESSON_10_INTRO_SCREENS, LESSON_10_PHRASES,
  LESSON_11_INTRO_SCREENS, LESSON_11_PHRASES,
  LESSON_12_INTRO_SCREENS, LESSON_12_PHRASES,
  LESSON_13_INTRO_SCREENS, LESSON_13_PHRASES,
  LESSON_14_INTRO_SCREENS, LESSON_14_PHRASES,
  LESSON_15_INTRO_SCREENS, LESSON_15_PHRASES,
  LESSON_16_INTRO_SCREENS, LESSON_16_PHRASES,
} from './lesson_data_9_16';

// === Lessons 17-24 ===
import {
  LESSON_17_INTRO_SCREENS, LESSON_17_PHRASES, LESSON_17_VOCABULARY, LESSON_17_IRREGULAR_VERBS,
  LESSON_18_INTRO_SCREENS, LESSON_18_PHRASES, LESSON_18_VOCABULARY, LESSON_18_IRREGULAR_VERBS,
  LESSON_19_INTRO_SCREENS, LESSON_19_PHRASES, LESSON_19_VOCABULARY, LESSON_19_IRREGULAR_VERBS,
  LESSON_20_INTRO_SCREENS, LESSON_20_PHRASES, LESSON_20_VOCABULARY, LESSON_20_IRREGULAR_VERBS,
  LESSON_21_INTRO_SCREENS, LESSON_21_PHRASES, LESSON_21_VOCABULARY, LESSON_21_IRREGULAR_VERBS,
  LESSON_22_INTRO_SCREENS, LESSON_22_PHRASES, LESSON_22_VOCABULARY, LESSON_22_IRREGULAR_VERBS,
  LESSON_23_INTRO_SCREENS, LESSON_23_PHRASES, LESSON_23_VOCABULARY, LESSON_23_IRREGULAR_VERBS,
  LESSON_24_PHRASES, LESSON_24_VOCABULARY, LESSON_24_IRREGULAR_VERBS,
} from './lesson_data_17_24';

// === Lessons 25-32 ===
import {
  LESSON_25_INTRO_SCREENS, LESSON_25_PHRASES, LESSON_25_VOCABULARY, LESSON_25_IRREGULAR_VERBS,
  LESSON_26_PHRASES, LESSON_26_VOCABULARY, LESSON_26_IRREGULAR_VERBS,
  LESSON_27_PHRASES, LESSON_27_VOCABULARY, LESSON_27_IRREGULAR_VERBS,
  LESSON_28_PHRASES, LESSON_28_VOCABULARY, LESSON_28_IRREGULAR_VERBS,
  LESSON_29_PHRASES, LESSON_29_VOCABULARY, LESSON_29_IRREGULAR_VERBS,
  LESSON_30_PHRASES, LESSON_30_VOCABULARY, LESSON_30_IRREGULAR_VERBS,
  LESSON_31_PHRASES, LESSON_31_VOCABULARY, LESSON_31_IRREGULAR_VERBS,
  LESSON_32_PHRASES, LESSON_32_VOCABULARY, LESSON_32_IRREGULAR_VERBS,
} from './lesson_data_25_32';

// === ALL_LESSONS ===
export const ALL_LESSONS = [
  { id: 1, titleRU: 'Школа', titleUK: 'Школа', introScreens: LESSON_1_INTRO_SCREENS, phrases: LESSON_1_PHRASES },
  { id: 2, titleRU: 'Семья', titleUK: 'Сім\'я', introScreens: LESSON_2_INTRO_SCREENS, phrases: LESSON_2_PHRASES },
  { id: 3, titleRU: 'Работа', titleUK: 'Робота', introScreens: LESSON_3_INTRO_SCREENS, phrases: LESSON_3_PHRASES },
  { id: 4, titleRU: 'Еда', titleUK: 'Їжа', introScreens: LESSON_4_INTRO_SCREENS, phrases: LESSON_4_PHRASES },
  { id: 5, titleRU: 'Здоровье', titleUK: 'Здоров\'я', introScreens: LESSON_5_INTRO_SCREENS, phrases: LESSON_5_PHRASES },
  { id: 6, titleRU: 'Покупки', titleUK: 'Покупки', introScreens: LESSON_6_INTRO_SCREENS, phrases: LESSON_6_PHRASES },
  { id: 7, titleRU: 'Путешествия', titleUK: 'Подорожі', introScreens: LESSON_7_INTRO_SCREENS, phrases: LESSON_7_PHRASES },
  { id: 8, titleRU: 'Спорт', titleUK: 'Спорт', introScreens: LESSON_8_INTRO_SCREENS, phrases: LESSON_8_PHRASES },
  { id: 9, titleRU: 'Музыка', titleUK: 'Музика', introScreens: LESSON_9_INTRO_SCREENS, phrases: LESSON_9_PHRASES },
  { id: 10, titleRU: 'Технология', titleUK: 'Технологія', introScreens: LESSON_10_INTRO_SCREENS, phrases: LESSON_10_PHRASES },
  { id: 11, titleRU: 'Животные', titleUK: 'Тварини', introScreens: LESSON_11_INTRO_SCREENS, phrases: LESSON_11_PHRASES },
  { id: 12, titleRU: 'Природа', titleUK: 'Природа', introScreens: LESSON_12_INTRO_SCREENS, phrases: LESSON_12_PHRASES },
  { id: 13, titleRU: 'Эмоции', titleUK: 'Емоції', introScreens: LESSON_13_INTRO_SCREENS, phrases: LESSON_13_PHRASES },
  { id: 14, titleRU: 'Описание людей', titleUK: 'Опис людей', introScreens: LESSON_14_INTRO_SCREENS, phrases: LESSON_14_PHRASES },
  { id: 15, titleRU: 'Мода', titleUK: 'Мода', introScreens: LESSON_15_INTRO_SCREENS, phrases: LESSON_15_PHRASES },
  { id: 16, titleRU: 'Дом', titleUK: 'Дім', introScreens: LESSON_16_INTRO_SCREENS, phrases: LESSON_16_PHRASES },
  { id: 17, titleRU: 'Предлоги времени', titleUK: 'Прийменники часу', introScreens: LESSON_17_INTRO_SCREENS, phrases: LESSON_17_PHRASES },
  { id: 18, titleRU: 'Предлоги направления и движения', titleUK: 'Прийменники напрямку та руху', introScreens: LESSON_18_INTRO_SCREENS, phrases: LESSON_18_PHRASES },
  { id: 19, titleRU: 'Предлоги места', titleUK: 'Прийменники місця', introScreens: LESSON_19_INTRO_SCREENS, phrases: LESSON_19_PHRASES },
  { id: 20, titleRU: 'Артикли', titleUK: 'Артиклі', introScreens: LESSON_20_INTRO_SCREENS, phrases: LESSON_20_PHRASES },
  { id: 21, titleRU: 'Неопр. местоимения', titleUK: 'Неозначені займенники', introScreens: LESSON_21_INTRO_SCREENS, phrases: LESSON_21_PHRASES },
  { id: 22, titleRU: 'Герундий', titleUK: 'Герундій', introScreens: LESSON_22_INTRO_SCREENS, phrases: LESSON_22_PHRASES },
  { id: 23, titleRU: 'Страд. залог', titleUK: 'Пасивний стан', introScreens: LESSON_23_INTRO_SCREENS, phrases: LESSON_23_PHRASES },
  { id: 24, titleRU: 'Present Perfect', titleUK: 'Present Perfect', introScreens: [], phrases: LESSON_24_PHRASES },
  { id: 25, titleRU: 'Past Continuous', titleUK: 'Past Continuous', introScreens: LESSON_25_INTRO_SCREENS, phrases: LESSON_25_PHRASES },
  { id: 26, title: 'Урок 26', description: 'Zero and First Conditionals', phrases: LESSON_26_PHRASES },
  { id: 27, title: 'Урок 27', description: 'Reported Speech', phrases: LESSON_27_PHRASES },
  { id: 28, title: 'Урок 28', description: 'Reflexive Pronouns', phrases: LESSON_28_PHRASES },
  { id: 29, title: 'Урок 29', description: 'Used to', phrases: LESSON_29_PHRASES },
  { id: 30, title: 'Урок 30', description: 'Relative Clauses', phrases: LESSON_30_PHRASES },
  { id: 31, title: 'Урок 31', description: 'Complex Object', phrases: LESSON_31_PHRASES },
  { id: 32, title: 'Урок 32', description: 'Final Review', phrases: LESSON_32_PHRASES },
];

// === LESSON_DATA ===
export const LESSON_DATA: Record<number, LessonData> = {
  1: { id: 1, titleRU: 'Урок 1: Местоимения и глагол To Be', titleUK: 'Урок 1: Займенники й дієслово To Be', introScreens: LESSON_1_INTRO_SCREENS, phrases: LESSON_1_PHRASES },
  2: { id: 2, titleRU: 'Урок 2: Отрицание и вопросы (To Be)', titleUK: 'Урок 2: Заперечення й питання (To Be)', introScreens: LESSON_2_INTRO_SCREENS, phrases: LESSON_2_PHRASES },
  3: { id: 3, titleRU: 'Урок 3: Present Simple: Утверждение', titleUK: 'Урок 3: Present Simple: Твердження', introScreens: LESSON_3_INTRO_SCREENS, phrases: LESSON_3_PHRASES },
  4: { id: 4, titleRU: 'Урок 4: Present Simple: Отрицание', titleUK: 'Урок 4: Present Simple: Заперечення', introScreens: LESSON_4_INTRO_SCREENS, phrases: LESSON_4_PHRASES },
  5: { id: 5, titleRU: 'Урок 5: Present Simple: Вопросы', titleUK: 'Урок 5: Present Simple: Питання', introScreens: LESSON_5_INTRO_SCREENS, phrases: LESSON_5_PHRASES },
  6: { id: 6, titleRU: 'Урок 6: Специальные вопросы', titleUK: 'Урок 6: Спеціальні питання', introScreens: LESSON_6_INTRO_SCREENS, phrases: LESSON_6_PHRASES },
  7: { id: 7, titleRU: 'Урок 7: Глагол To Have (Иметь)', titleUK: 'Урок 7: Дієслово To Have (Мати)', introScreens: LESSON_7_INTRO_SCREENS, phrases: LESSON_7_PHRASES },
  8: { id: 8, titleRU: 'Урок 8: Предлоги времени', titleUK: 'Урок 8: Прийменники часу', introScreens: LESSON_8_INTRO_SCREENS, phrases: LESSON_8_PHRASES },
  9: { id: 9, titleRU: 'Урок 9: There is / There are', titleUK: 'Урок 9: There is / There are', introScreens: LESSON_9_INTRO_SCREENS, phrases: LESSON_9_PHRASES },
  10: { id: 10, titleRU: 'Урок 10: Модальный глагол Can', titleUK: 'Урок 10: Модальне дієслово Can', introScreens: LESSON_10_INTRO_SCREENS, phrases: LESSON_10_PHRASES },
  11: { id: 11, titleRU: 'Урок 11: Past Simple (Правильные глаголы)', titleUK: 'Урок 11: Past Simple (Правильні дієслова)', introScreens: LESSON_11_INTRO_SCREENS, phrases: LESSON_11_PHRASES },
  12: { id: 12, titleRU: 'Урок 12: Past Simple (Неправильные глаголы)', titleUK: 'Урок 12: Past Simple (Неправильні дієслова)', introScreens: LESSON_12_INTRO_SCREENS, phrases: LESSON_12_PHRASES },
  13: { id: 13, titleRU: 'Урок 13: Future Simple (will)', titleUK: 'Урок 13: Future Simple (will)', introScreens: LESSON_13_INTRO_SCREENS, phrases: LESSON_13_PHRASES },
  14: { id: 14, titleRU: 'Урок 14: Степени сравнения прилагательных', titleUK: 'Урок 14: Ступені порівняння прикметників', introScreens: LESSON_14_INTRO_SCREENS, phrases: LESSON_14_PHRASES },
  15: { id: 15, titleRU: 'Урок 15: Притяжательные местоимения', titleUK: 'Урок 15: Присвійні займенники', introScreens: LESSON_15_INTRO_SCREENS, phrases: LESSON_15_PHRASES },
  16: { id: 16, titleRU: 'Урок 16: Фразовые глаголы', titleUK: 'Урок 16: Фразові дієслова', introScreens: LESSON_16_INTRO_SCREENS, phrases: LESSON_16_PHRASES },
  17: { id: 17, titleRU: 'Урок 17: Present Continuous', titleUK: 'Урок 17: Present Continuous', introScreens: LESSON_17_INTRO_SCREENS, phrases: LESSON_17_PHRASES },
  18: { id: 18, titleRU: 'Урок 18: Повелительное наклонение', titleUK: 'Урок 18: Наказовий спосіб', introScreens: LESSON_18_INTRO_SCREENS, phrases: LESSON_18_PHRASES },
  19: { id: 19, titleRU: 'Урок 19: Предлоги места', titleUK: 'Урок 19: Прийменники місця', introScreens: LESSON_19_INTRO_SCREENS, phrases: LESSON_19_PHRASES },
  20: { id: 20, titleRU: 'Урок 20: Артикли', titleUK: 'Урок 20: Артиклі', introScreens: LESSON_20_INTRO_SCREENS ?? [], phrases: LESSON_20_PHRASES },
  21: { id: 21, titleRU: 'Урок 21: Неопределённые местоимения', titleUK: 'Урок 21: Неозначені займенники', introScreens: LESSON_21_INTRO_SCREENS ?? [], phrases: LESSON_21_PHRASES },
  22: { id: 22, titleRU: 'Урок 22: Герундий', titleUK: 'Урок 22: Герундій', introScreens: LESSON_22_INTRO_SCREENS ?? [], phrases: LESSON_22_PHRASES },
  23: { id: 23, titleRU: 'Урок 23: Страдательный залог (Passive Voice)', titleUK: 'Урок 23: Пасивний стан (Passive Voice)', introScreens: LESSON_23_INTRO_SCREENS, phrases: LESSON_23_PHRASES },
  24: { id: 24, titleRU: 'Урок 24: Present Perfect', titleUK: 'Урок 24: Present Perfect', introScreens: [], phrases: LESSON_24_PHRASES },
  25: { id: 25, titleRU: 'Урок 25: Past Continuous', titleUK: 'Урок 25: Past Continuous', introScreens: LESSON_25_INTRO_SCREENS ?? [], phrases: LESSON_25_PHRASES },
  26: { id: 26, titleRU: 'Урок 26: Условные предложения', titleUK: 'Урок 26: Умовні речення', introScreens: [], phrases: LESSON_26_PHRASES },
  27: { id: 27, titleRU: 'Урок 27: Косвенная речь', titleUK: 'Урок 27: Непряма мова', introScreens: [], phrases: LESSON_27_PHRASES },
  28: { id: 28, titleRU: 'Урок 28: Возвратные местоимения', titleUK: 'Урок 28: Зворотні займенники', introScreens: [], phrases: LESSON_28_PHRASES },
  29: { id: 29, titleRU: 'Урок 29: Used to', titleUK: 'Урок 29: Used to', introScreens: [], phrases: LESSON_29_PHRASES },
  30: { id: 30, titleRU: 'Урок 30: Относительные предложения', titleUK: 'Урок 30: Відносні речення', introScreens: [], phrases: LESSON_30_PHRASES },
  31: { id: 31, titleRU: 'Урок 31: Сложное дополнение', titleUK: 'Урок 31: Складний додаток', introScreens: [], phrases: LESSON_31_PHRASES },
  32: { id: 32, titleRU: 'Урок 32: Финальный обзор', titleUK: 'Урок 32: Фінальний огляд', introScreens: [], phrases: LESSON_32_PHRASES },
};

// === LESSON_ENCOURAGEMENT_SCREENS ===
export const LESSON_ENCOURAGEMENT_SCREENS: Record<number, LessonIntroScreen[]> = {
  1: LESSON_1_ENCOURAGEMENT_SCREENS,
  3: LESSON_3_ENCOURAGEMENT_SCREENS,
  5: LESSON_5_ENCOURAGEMENT_SCREENS,
  6: LESSON_6_ENCOURAGEMENT_SCREENS,
  7: LESSON_7_ENCOURAGEMENT_SCREENS,
};

// === Helper functions ===
export function getLessonData(lessonId: number): LessonPhrase[] {
  return LESSON_DATA[lessonId]?.phrases || [];
}

export function getLessonIntroScreens(lessonId: number): LessonIntroScreen[] {
  return LESSON_DATA[lessonId]?.introScreens || [];
}

export function getLessonEncouragementScreens(lessonId: number): LessonIntroScreen[] {
  return LESSON_ENCOURAGEMENT_SCREENS[lessonId] || [];
}

// === ALL_LESSONS_RU ===
export const ALL_LESSONS_RU: Record<number, { english: string; russian: string }[]> = {
  1: LESSON_1_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  2: LESSON_2_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  3: LESSON_3_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  4: LESSON_4_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  5: LESSON_5_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  6: LESSON_6_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  7: LESSON_7_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  8: LESSON_8_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  9: LESSON_9_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  10: LESSON_10_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  11: LESSON_11_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  12: LESSON_12_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  13: LESSON_13_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  14: LESSON_14_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  15: LESSON_15_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  16: LESSON_16_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  17: LESSON_17_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  18: LESSON_18_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  19: LESSON_19_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  20: LESSON_20_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  21: LESSON_21_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  22: LESSON_22_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  23: LESSON_23_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  24: LESSON_24_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  25: LESSON_25_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  26: LESSON_26_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  27: LESSON_27_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  28: LESSON_28_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  29: LESSON_29_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  30: LESSON_30_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  31: LESSON_31_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
  32: LESSON_32_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
};

// === ALL_LESSONS_UK ===
export const ALL_LESSONS_UK: Record<number, { english: string; ukrainian: string }[]> = {
  1: LESSON_1_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  2: LESSON_2_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  3: LESSON_3_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  4: LESSON_4_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  5: LESSON_5_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  6: LESSON_6_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  7: LESSON_7_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  8: LESSON_8_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  9: LESSON_9_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  10: LESSON_10_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  11: LESSON_11_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  12: LESSON_12_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  13: LESSON_13_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  14: LESSON_14_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  15: LESSON_15_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  16: LESSON_16_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  17: LESSON_17_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  18: LESSON_18_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  19: LESSON_19_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  20: LESSON_20_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  21: LESSON_21_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  22: LESSON_22_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  23: LESSON_23_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  24: LESSON_24_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  25: LESSON_25_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  26: LESSON_26_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  27: LESSON_27_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  28: LESSON_28_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  29: LESSON_29_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  30: LESSON_30_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  31: LESSON_31_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
  32: LESSON_32_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
};

// === Lesson Vocabularies ===
export const LESSON_VOCABULARIES: Record<number, typeof LESSON_4_VOCABULARY> = {
  4: LESSON_4_VOCABULARY,
  6: LESSON_6_VOCABULARY,
  7: LESSON_7_VOCABULARY,
  17: LESSON_17_VOCABULARY,
  18: LESSON_18_VOCABULARY,
  19: LESSON_19_VOCABULARY,
  20: LESSON_20_VOCABULARY,
  21: LESSON_21_VOCABULARY,
  22: LESSON_22_VOCABULARY,
  23: LESSON_23_VOCABULARY,
  24: LESSON_24_VOCABULARY,
  25: LESSON_25_VOCABULARY,
  26: LESSON_26_VOCABULARY,
  27: LESSON_27_VOCABULARY,
  28: LESSON_28_VOCABULARY,
  29: LESSON_29_VOCABULARY,
  30: LESSON_30_VOCABULARY,
  31: LESSON_31_VOCABULARY,
  32: LESSON_32_VOCABULARY,
};

// === Lesson Irregular Verbs ===
export const LESSON_IRREGULAR_VERBS: Record<number, typeof LESSON_4_IRREGULAR_VERBS> = {
  4: LESSON_4_IRREGULAR_VERBS,
  6: LESSON_6_IRREGULAR_VERBS,
  7: LESSON_7_IRREGULAR_VERBS,
  17: LESSON_17_IRREGULAR_VERBS,
  18: LESSON_18_IRREGULAR_VERBS,
  19: LESSON_19_IRREGULAR_VERBS,
  20: LESSON_20_IRREGULAR_VERBS,
  21: LESSON_21_IRREGULAR_VERBS,
  22: LESSON_22_IRREGULAR_VERBS,
  23: LESSON_23_IRREGULAR_VERBS,
  24: LESSON_24_IRREGULAR_VERBS,
  25: LESSON_25_IRREGULAR_VERBS,
  26: LESSON_26_IRREGULAR_VERBS,
  27: LESSON_27_IRREGULAR_VERBS,
  28: LESSON_28_IRREGULAR_VERBS,
  29: LESSON_29_IRREGULAR_VERBS,
  30: LESSON_30_IRREGULAR_VERBS,
  31: LESSON_31_IRREGULAR_VERBS,
  32: LESSON_32_IRREGULAR_VERBS,
};
