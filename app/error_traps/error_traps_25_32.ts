// app/error_traps/error_traps_25_32.ts
// Per-word система подсказок — Уроки 25-32 (продвинутая грамматика)

import type { PhraseErrorTraps, LessonErrorTrapsMap } from '../types/feedback';

// ══════════════════════════════════════════════════════════════
// УРОК 25: Past Continuous (was/were + V-ing)
// ══════════════════════════════════════════════════════════════

const L25_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,  // "I was working when she called"
    wordTraps: [
      { wordIndex: 1, hint: 'С "I" → "was" (прошедшее время от "am").' },
      { wordIndex: 2, hint: 'Глагол должен быть с -ing: "working" (не "work").' },
    ],
    generalRule: 'Past Continuous: was/were + V-ing. (I was working...)',
    traps: []
  },
  {
    phraseIndex: 1,  // "They were having a meeting at noon"
    wordTraps: [
      { wordIndex: 1, hint: 'С "They" → "were" (прошедшее от "are").' },
      { wordIndex: 2, hint: 'Добавьте -ing к глаголу: "having" (не "have").' },
    ],
    generalRule: 'They were + V-ing. (They were having...)',
    traps: []
  },
  {
    phraseIndex: 2,  // "She was reading when the phone rang"
    wordTraps: [
      { wordIndex: 1, hint: 'С "She" → "was" (не "were").' },
      { wordIndex: 2, hint: 'V-ing форма: "reading" (не "read").' },
    ],
    generalRule: 'She was + V-ing. (She was reading...)',
    traps: []
  },
  {
    phraseIndex: 3,  // "We were waiting for two hours"
    wordTraps: [
      { wordIndex: 1, hint: 'С "We" → "were".' },
      { wordIndex: 2, hint: 'V-ing: "waiting" (добавьте -ing).' },
    ],
    generalRule: 'We were + V-ing. (We were waiting...)',
    traps: []
  },
  {
    phraseIndex: 4,  // "He was not listening during the presentation"
    wordTraps: [
      { wordIndex: 1, hint: 'С "He" → "was".' },
      { wordIndex: 2, hint: 'Отрицание идёт после глагола: "was not" (или "wasn\'t").' },
      { wordIndex: 3, hint: 'V-ing форма: "listening".' },
    ],
    generalRule: 'He was not + V-ing. (He was not listening...)',
    traps: []
  },
  {
    phraseIndex: 5,  // "What were you doing at midnight"
    wordTraps: [
      { wordIndex: 0, hint: 'Вопрос: глагол идёт в начало: "Were you...".' },
      { wordIndex: 2, hint: 'V-ing: "doing".' },
    ],
    generalRule: 'Вопрос: Were + you + V-ing? (What were you doing?)',
    traps: []
  },
];

// ══════════════════════════════════════════════════════════════
// УРОК 26: Present Perfect (have/has + V-ed)
// ══════════════════════════════════════════════════════════════

const L26_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,  // "I have finished my work"
    wordTraps: [
      { wordIndex: 1, hint: 'С "I" → "have" (не "has").' },
      { wordIndex: 2, hint: 'Причастие прошедшего времени: "finished" (-ed для правильных глаголов).' },
    ],
    generalRule: 'Present Perfect: I have + V-ed. (I have finished...)',
    traps: []
  },
  {
    phraseIndex: 1,  // "He has been here for an hour"
    wordTraps: [
      { wordIndex: 1, hint: 'С "He" → "has".' },
      { wordIndex: 2, hint: 'Используйте "been" (причастие от "be").' },
    ],
    generalRule: 'He has + been. (He has been here...)',
    traps: []
  },
  {
    phraseIndex: 2,  // "They have never seen this before"
    wordTraps: [
      { wordIndex: 1, hint: 'С "They" → "have".' },
      { wordIndex: 2, hint: 'Отрицание обычно идёт между have и причастием: "have never".' },
      { wordIndex: 3, hint: 'Причастие: "seen" (неправильный глагол).' },
    ],
    generalRule: 'They have + never + V-ed. (They have never seen...)',
    traps: []
  },
];

// ══════════════════════════════════════════════════════════════
// УРОК 27: Reported Speech (Косвенная речь)
// ══════════════════════════════════════════════════════════════

const L27_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,  // "She said that she was tired"
    wordTraps: [
      { wordIndex: 0, hint: 'Начните с глагола речи: "said".' },
      { wordIndex: 1, hint: 'После "said" идёт "that".' },
      { wordIndex: 2, hint: 'Сама по себе фраза: "that she".' },
      { wordIndex: 3, hint: 'Время меняется: настоящее (am) → прошедшее (was).' },
      { wordIndex: 4, hint: 'Прилагательное: "tired".' },
    ],
    generalRule: 'Reported Speech: said + that + фраза (с изменением времени).',
    traps: []
  },
  {
    phraseIndex: 1,  // "He told me that he would come tomorrow"
    wordTraps: [
      { wordIndex: 0, hint: 'Глагол: "told" (не "said to").' },
      { wordIndex: 1, hint: 'После "told" нужна мне: "me".' },
      { wordIndex: 2, hint: 'Союз: "that".' },
      { wordIndex: 4, hint: 'Будущее время в косвенной: "would come".' },
    ],
    generalRule: 'told + object + that + фраза. (He told me that...)',
    traps: []
  },
];

// ══════════════════════════════════════════════════════════════
// УРОК 28: Conditional (Условные предложения)
// ══════════════════════════════════════════════════════════════

const L28_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,  // "If I had more time I would study more"
    wordTraps: [
      { wordIndex: 0, hint: 'Начните с условия: "If...".' },
      { wordIndex: 2, hint: 'После "if" в 2 conditional: Past Simple форма (had, не have).' },
      { wordIndex: 4, hint: 'Главное предложение: "would" + базовая форма глагола.' },
      { wordIndex: 5, hint: 'Глагол в базовой форме: "study" (не "studied").' },
    ],
    generalRule: '2 Conditional: If + Past Simple, would + V.',
    traps: []
  },
];

// ══════════════════════════════════════════════════════════════
// УРОК 29: Modal Verbs (Модальные глаголы)
// ══════════════════════════════════════════════════════════════

const L29_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,  // "You should do your homework"
    wordTraps: [
      { wordIndex: 1, hint: 'Модальный глагол: "should".' },
      { wordIndex: 2, hint: 'После модального идёт базовая форма: "do" (не "does").' },
    ],
    generalRule: 'Modal + V (базовая форма). (You should do...)',
    traps: []
  },
  {
    phraseIndex: 1,  // "I must finish this today"
    wordTraps: [
      { wordIndex: 1, hint: 'Модальный глагол: "must".' },
      { wordIndex: 2, hint: 'Базовая форма: "finish" (не "finishes").' },
    ],
    generalRule: 'must + V. (I must finish...)',
    traps: []
  },
];

// ══════════════════════════════════════════════════════════════
// УРОК 30: Relative Clauses (Придаточные предложения)
// ══════════════════════════════════════════════════════════════

const L30_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,  // "The man who lives here is a doctor"
    wordTraps: [
      { wordIndex: 0, hint: 'Главное существительное: "The man".' },
      { wordIndex: 2, hint: 'Для людей используйте "who" (не "that" в формальной речи).' },
      { wordIndex: 5, hint: 'Глагол в придаточном: "is" (согласование с who = he).' },
    ],
    generalRule: 'The man who... (для людей who).',
    traps: []
  },
  {
    phraseIndex: 5,  // "The book which I read was interesting"
    wordTraps: [
      { wordIndex: 0, hint: 'Главное существительное: "The book".' },
      { wordIndex: 2, hint: 'Для вещей используйте "which" (или "that").' },
      { wordIndex: 6, hint: 'Глагол в главном предложении: "was".' },
    ],
    generalRule: 'The book which... (для вещей which).',
    traps: []
  },
];

// ══════════════════════════════════════════════════════════════
// УРОК 31-32: Advanced structures (заполнить по необходимости)
// ══════════════════════════════════════════════════════════════

const L31_TRAPS: readonly PhraseErrorTraps[] = [];
const L32_TRAPS: readonly PhraseErrorTraps[] = [];

export const TRAPS_25_32: LessonErrorTrapsMap = {
  25: L25_TRAPS,
  26: L26_TRAPS,
  27: L27_TRAPS,
  28: L28_TRAPS,
  29: L29_TRAPS,
  30: L30_TRAPS,
  31: L31_TRAPS,
  32: L32_TRAPS,
};
