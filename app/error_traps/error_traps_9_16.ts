// app/error_traps/error_traps_9_16.ts
// Per-word система подсказок — Уроки 9-16

import type { PhraseErrorTraps, LessonErrorTrapsMap } from '../types/feedback';

// ══════════════════════════════════════════════════════════════
// УРОК 9: There is / There are
// ══════════════════════════════════════════════════════════════

const L9_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,  // "There is a book on the table"
    wordTraps: [
      { wordIndex: 1, hint: '"There is" для единственного числа (a book).' },
      { wordIndex: 2, hint: 'Артикль "a" перед согласной: a book.' },
    ],
    generalRule: 'There is + ед.ч., There are + мн.ч. (There is a book.)',
    traps: []
  },
  {
    phraseIndex: 1,  // "There are three chairs in the room"
    wordTraps: [
      { wordIndex: 1, hint: '"There are" для множественного числа: chairs.' },
      { wordIndex: 2, hint: 'Перед числом артикля нет: three chairs.' },
    ],
    generalRule: 'There are + числовое количество (без артикля). (There are three chairs.)',
    traps: []
  },
  {
    phraseIndex: 2,  // "There is no café nearby"
    wordTraps: [
      { wordIndex: 2, hint: 'Отрицание "no" идёт после "is": There is no + существительное.' },
    ],
    generalRule: 'There is no + ед.ч. (There is no café.)',
    traps: []
  },
];

const L10_TRAPS: readonly PhraseErrorTraps[] = [];
const L11_TRAPS: readonly PhraseErrorTraps[] = [];
const L12_TRAPS: readonly PhraseErrorTraps[] = [];
const L13_TRAPS: readonly PhraseErrorTraps[] = [];
const L14_TRAPS: readonly PhraseErrorTraps[] = [];
const L15_TRAPS: readonly PhraseErrorTraps[] = [];
const L16_TRAPS: readonly PhraseErrorTraps[] = [];

export const TRAPS_9_16: LessonErrorTrapsMap = {
  9: L9_TRAPS,
  10: L10_TRAPS,
  11: L11_TRAPS,
  12: L12_TRAPS,
  13: L13_TRAPS,
  14: L14_TRAPS,
  15: L15_TRAPS,
  16: L16_TRAPS,
};
