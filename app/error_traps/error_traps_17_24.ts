// app/error_traps/error_traps_17_24.ts
// Per-word система подсказок — Уроки 17-24
// Уроки 17-20: Present Continuous (am/is/are + V-ing)
// Уроки 21-24: Present Perfect Continuous (have been + V-ing)

import type { PhraseErrorTraps, LessonErrorTrapsMap } from '../types/feedback';

// ══════════════════════════════════════════════════════════════
// УРОК 17: Present Continuous (am/is/are + V-ing) — Базовый
// ══════════════════════════════════════════════════════════════

const L17_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,  // "I am working right now"
    wordTraps: [
      { wordIndex: 1, hint: 'С "I" → "am" (не "is" или "are").' },
      { wordIndex: 2, hint: 'V-ing форма: "working" (добавьте -ing).' },
    ],
    generalRule: 'Present Continuous: am/is/are + V-ing. (I am working...)',
    traps: []
  },
  {
    phraseIndex: 1,  // "She is reading a book"
    wordTraps: [
      { wordIndex: 1, hint: 'С "She" → "is".' },
      { wordIndex: 2, hint: 'V-ing: "reading".' },
    ],
    generalRule: 'She is + V-ing. (She is reading...)',
    traps: []
  },
  {
    phraseIndex: 2,  // "They are having lunch"
    wordTraps: [
      { wordIndex: 1, hint: 'С "They" → "are".' },
      { wordIndex: 2, hint: 'V-ing форма глагола "have" → "having".' },
    ],
    generalRule: 'They are + V-ing. (They are having...)',
    traps: []
  },
  {
    phraseIndex: 3,  // "He is calling a client"
    wordTraps: [
      { wordIndex: 1, hint: 'С "He" → "is".' },
      { wordIndex: 2, hint: 'V-ing: "calling" (double l перед -ing после одного гласного).' },
    ],
    generalRule: 'He is + V-ing. (He is calling...)',
    traps: []
  },
  {
    phraseIndex: 4,  // "We are waiting for a taxi"
    wordTraps: [
      { wordIndex: 1, hint: 'С "We" → "are".' },
      { wordIndex: 2, hint: 'V-ing: "waiting" (drop e, add -ing).' },
    ],
    generalRule: 'We are + V-ing. (We are waiting...)',
    traps: []
  },
  {
    phraseIndex: 5,  // "I am writing a report"
    wordTraps: [
      { wordIndex: 1, hint: 'С "I" → "am".' },
      { wordIndex: 2, hint: 'V-ing: "writing" (drop e, add -ing).' },
    ],
    generalRule: 'I am + V-ing. (I am writing...)',
    traps: []
  },
  {
    phraseIndex: 6,  // "She is studying"
    wordTraps: [
      { wordIndex: 1, hint: 'С "She" → "is".' },
      { wordIndex: 2, hint: 'V-ing: "studying" (y → i, add -ing).' },
    ],
    generalRule: 'She is + V-ing. (She is studying...)',
    traps: []
  },
  {
    phraseIndex: 7,  // "They are moving to a new office"
    wordTraps: [
      { wordIndex: 1, hint: 'С "They" → "are".' },
      { wordIndex: 2, hint: 'V-ing: "moving" (drop e, add -ing).' },
      { wordIndex: 3, hint: 'Предлог "to" используется для направления.' },
    ],
    generalRule: 'They are moving + to + место. (They are moving...)',
    traps: []
  },
  {
    phraseIndex: 8,  // "He is not working right now"
    wordTraps: [
      { wordIndex: 1, hint: 'С "He" → "is".' },
      { wordIndex: 2, hint: 'Отрицание: "is not" (или "isn\'t").' },
      { wordIndex: 3, hint: 'V-ing: "working".' },
    ],
    generalRule: 'He is not + V-ing. (He is not working...)',
    traps: []
  },
  {
    phraseIndex: 9,  // "Are you listening to me"
    wordTraps: [
      { wordIndex: 0, hint: 'Вопрос: глагол в начало: "Are you...".' },
      { wordIndex: 2, hint: 'V-ing: "listening".' },
    ],
    generalRule: 'Вопрос: Are + you + V-ing? (Are you listening?)',
    traps: []
  },
];

// ══════════════════════════════════════════════════════════════
// УРОК 18: Present Continuous (продолжение)
// ══════════════════════════════════════════════════════════════

const L18_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,  // "What are you doing"
    wordTraps: [
      { wordIndex: 0, hint: 'Вопрос начинается с "What".' },
      { wordIndex: 2, hint: 'Глагол: "are".' },
      { wordIndex: 3, hint: 'V-ing: "doing".' },
    ],
    generalRule: 'Вопрос с What: What are you doing? (What + are + you + V-ing?)',
    traps: []
  },
];

// ══════════════════════════════════════════════════════════════
// УРОК 19-20: Present Continuous (расширение, все уроки заполнены базово)
// ══════════════════════════════════════════════════════════════

const L19_TRAPS: readonly PhraseErrorTraps[] = [];
const L20_TRAPS: readonly PhraseErrorTraps[] = [];

// ══════════════════════════════════════════════════════════════
// УРОК 21: Present Perfect Continuous (have + been + V-ing)
// ══════════════════════════════════════════════════════════════

const L21_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,  // "I have been working on this task for a week already"
    wordTraps: [
      { wordIndex: 1, hint: 'С "I" → "have" (не "has").' },
      { wordIndex: 2, hint: 'После "have" идёт "been".' },
      { wordIndex: 3, hint: 'V-ing: "working".' },
      { wordIndex: 4, hint: 'Предлог "on" используется для темы: "on this task".' },
      { wordIndex: 6, hint: 'Предлог "for" используется для периода времени: "for a week".' },
    ],
    generalRule: 'Present Perfect Continuous: have + been + V-ing + for + время.',
    traps: []
  },
];

// ══════════════════════════════════════════════════════════════
// УРОК 22-24: Present Perfect Continuous (расширение)
// ══════════════════════════════════════════════════════════════

const L22_TRAPS: readonly PhraseErrorTraps[] = [];
const L23_TRAPS: readonly PhraseErrorTraps[] = [];
const L24_TRAPS: readonly PhraseErrorTraps[] = [];

export const TRAPS_17_24: LessonErrorTrapsMap = {
  17: L17_TRAPS,
  18: L18_TRAPS,
  19: L19_TRAPS,
  20: L20_TRAPS,
  21: L21_TRAPS,
  22: L22_TRAPS,
  23: L23_TRAPS,
  24: L24_TRAPS,
};
