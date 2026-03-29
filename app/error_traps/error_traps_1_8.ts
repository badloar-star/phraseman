// app/error_traps/error_traps_1_8.ts
// Per-word система подсказок — Уроки 1-8
// phraseIndex — 0-based, wordIndex — позиция слова в правильном ответе

import type { PhraseErrorTraps, LessonErrorTrapsMap } from '../types/feedback';

// ══════════════════════════════════════════════════════════════
// УРОК 1: To Be + Профессии
// ══════════════════════════════════════════════════════════════

const L1_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,  // "I am a teacher"
    wordTraps: [
      { wordIndex: 1, hint: 'С "I" глагол "to be" только "am": I am.' },
      { wordIndex: 2, hint: 'Перед согласной нужен артикль "a": a teacher.' },
    ],
    generalRule: 'Схема: I + am + a/an + профессия. (I am a teacher.)',
    traps: []
  },
  {
    phraseIndex: 1,  // "He is a doctor"
    wordTraps: [
      { wordIndex: 1, hint: 'С "He" глагол "to be" только "is": He is.' },
      { wordIndex: 2, hint: 'Перед согласной нужен артикль "a": a doctor.' },
    ],
    generalRule: 'Схема: He + is + a/an + профессия. (He is a doctor.)',
    traps: []
  },
  {
    phraseIndex: 2,  // "She is a manager"
    wordTraps: [
      { wordIndex: 1, hint: 'С "She" глагол "to be" только "is": She is.' },
      { wordIndex: 2, hint: 'Перед согласной нужен артикль "a": a manager.' },
    ],
    generalRule: 'Схема: She + is + a/an + существительное. (She is a manager.)',
    traps: []
  },
  {
    phraseIndex: 3,  // "We are students"
    wordTraps: [
      { wordIndex: 1, hint: 'С "We" глагол "to be" только "are": We are.' },
      { wordIndex: 2, hint: 'Множественное число не требует артикля: students (не "a students").' },
    ],
    generalRule: 'Схема: We + are + существительное (множественное). (We are students.)',
    traps: []
  },
  {
    phraseIndex: 4,  // "They are colleagues"
    wordTraps: [
      { wordIndex: 1, hint: 'С "They" глагол "to be" только "are": They are.' },
      { wordIndex: 2, hint: 'Множественное число не требует артикля. (colleagues)' },
    ],
    generalRule: 'Схема: They + are + существительное (множественное). (They are colleagues.)',
    traps: []
  },
  {
    phraseIndex: 5,  // "I am young"
    wordTraps: [
      { wordIndex: 1, hint: 'С "I" глагол "to be" только "am": I am.' },
    ],
    generalRule: 'Прилагательные не требуют артикля при "to be". (I am young.)',
    traps: []
  },
  {
    phraseIndex: 6,  // "He is tall"
    wordTraps: [
      { wordIndex: 1, hint: 'С "He" глагол "to be" только "is": He is.' },
    ],
    generalRule: 'При прилагательных после "to be" артикль не нужен. (He is tall.)',
    traps: []
  },
  {
    phraseIndex: 7,  // "She is smart"
    wordTraps: [
      { wordIndex: 1, hint: 'С "She" глагол "to be" только "is": She is.' },
    ],
    generalRule: 'Прилагательное идёт прямо после "to be". (She is smart.)',
    traps: []
  },
  {
    phraseIndex: 8,  // "We are ready"
    wordTraps: [
      { wordIndex: 1, hint: 'С "We" глагол "to be" только "are": We are.' },
    ],
    generalRule: 'Прилагательное после "to be" не требует артикля. (We are ready.)',
    traps: []
  },
  {
    phraseIndex: 9,  // "They are at home"
    wordTraps: [
      { wordIndex: 1, hint: 'С "They" глагол "to be" только "are": They are.' },
      { wordIndex: 3, hint: '"At home" — фраза с предлогом "at". (at home)' },
    ],
    generalRule: 'После "are" может быть место + предлог. (They are at home.)',
    traps: []
  },
];

// ══════════════════════════════════════════════════════════════
// УРОК 2: Отрицание и вопросы с To Be
// ══════════════════════════════════════════════════════════════

const L2_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,  // "I am not tired"
    wordTraps: [
      { wordIndex: 2, hint: 'Отрицание: "am not" (без сокращения: "I am not", с сокращением: "I\'m not").' },
    ],
    generalRule: 'Отрицание: I am not + прилагательное. (I am not tired.)',
    traps: []
  },
  {
    phraseIndex: 1,  // "He is not busy"
    wordTraps: [
      { wordIndex: 2, hint: 'Отрицание: "is not" (или "isn\'t"). (He is not busy.)' },
    ],
    generalRule: 'Отрицание: He/She/It is not + прилагательное. (He is not busy.)',
    traps: []
  },
  {
    phraseIndex: 2,  // "She is not ready"
    wordTraps: [
      { wordIndex: 2, hint: 'Отрицание: "is not" (She is not ready.)' },
    ],
    generalRule: 'Отрицание с "she": She is not + прилагательное. (She is not ready.)',
    traps: []
  },
  {
    phraseIndex: 3,  // "We are not at home"
    wordTraps: [
      { wordIndex: 2, hint: 'Отрицание: "are not" (We are not at home.)' },
      { wordIndex: 4, hint: 'Место: "at home" с предлогом "at". (at home)' },
    ],
    generalRule: 'Отрицание: We/You/They are not. (We are not at home.)',
    traps: []
  },
  {
    phraseIndex: 4,  // "They are not students"
    wordTraps: [
      { wordIndex: 2, hint: 'Отрицание: "are not". (They are not...)' },
    ],
    generalRule: 'Отрицание: They are not + существительное. (They are not students.)',
    traps: []
  },
  {
    phraseIndex: 5,  // "Are you a doctor"
    wordTraps: [
      { wordIndex: 0, hint: 'Вопрос: глагол идёт в начало. (Are you...)' },
      { wordIndex: 2, hint: 'Артикль "a" перед согласной. (a doctor)' },
    ],
    generalRule: 'Вопрос: Are + you + a/an + существительное? (Are you a doctor?)',
    traps: []
  },
  {
    phraseIndex: 6,  // "Is he a teacher"
    wordTraps: [
      { wordIndex: 0, hint: 'Вопрос: "Is he..." глагол в начале. (Is he...)' },
      { wordIndex: 2, hint: 'Артикль "a" перед согласной. (a teacher)' },
    ],
    generalRule: 'Вопрос с "he": Is + he + a/an + существительное? (Is he a teacher?)',
    traps: []
  },
];

// ══════════════════════════════════════════════════════════════
// УРОК 3: Present Simple (Действия)
// ══════════════════════════════════════════════════════════════

const L3_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,  // "I work in an office"
    wordTraps: [
      { wordIndex: 2, hint: 'Глагол в простой форме: "work" (I work, not "I am work").' },
      { wordIndex: 4, hint: 'Артикль "an" перед гласной "o". (an office)' },
    ],
    generalRule: 'Present Simple: I + глагол (базовая форма). (I work...)',
    traps: []
  },
  {
    phraseIndex: 1,  // "He works in a bank"
    wordTraps: [
      { wordIndex: 1, hint: 'С "He" глагол + -s: works (He works, not "He work").' },
      { wordIndex: 3, hint: 'Артикль "a" перед согласной. (a bank)' },
    ],
    generalRule: 'Present Simple: He/She/It + глагол-s. (He works...)',
    traps: []
  },
  {
    phraseIndex: 2,  // "She studies at university"
    wordTraps: [
      { wordIndex: 1, hint: 'С "She" глагол + -s или -es: studies. (She studies)' },
    ],
    generalRule: 'Present Simple: She + глагол + -es (после согласной + y → ies). (She studies.)',
    traps: []
  },
];

// ══════════════════════════════════════════════════════════════
// УРОК 4: Past Simple (V-ed)
// ══════════════════════════════════════════════════════════════

const L4_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,  // "I worked in London"
    wordTraps: [
      { wordIndex: 1, hint: 'Past Simple: добавьте -ed к глаголу. "worked" (не "work").' },
    ],
    generalRule: 'Past Simple: V-ed. (I worked...)',
    traps: []
  },
];

// ══════════════════════════════════════════════════════════════
// УРОК 5: Future Simple (will + V)
// ══════════════════════════════════════════════════════════════

const L5_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,  // "I will finish tomorrow"
    wordTraps: [
      { wordIndex: 1, hint: 'Future Simple: "will" + базовая форма.' },
      { wordIndex: 2, hint: 'После "will" базовая форма: "finish" (не "finished").' },
    ],
    generalRule: 'Future Simple: will + V. (I will finish...)',
    traps: []
  },
];

// ══════════════════════════════════════════════════════════════
// УРОК 6-8: Другие времена (базовая структура)
// ══════════════════════════════════════════════════════════════

const L6_TRAPS: readonly PhraseErrorTraps[] = [];
const L7_TRAPS: readonly PhraseErrorTraps[] = [];
const L8_TRAPS: readonly PhraseErrorTraps[] = [];

export const TRAPS_1_8: LessonErrorTrapsMap = {
  1: L1_TRAPS,
  2: L2_TRAPS,
  3: L3_TRAPS,
  4: L4_TRAPS,
  5: L5_TRAPS,
  6: L6_TRAPS,
  7: L7_TRAPS,
  8: L8_TRAPS,
};
