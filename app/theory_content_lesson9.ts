// Theory content for Lesson 9 (There is / There are + prepositions of place).
//
// This file is the structured data source for the TheoryLessonView engine.
// Content is transferred verbatim from the legacy lesson_help.tsx HINTS[9].render
// (Table components) without any grammar changes — the content is already
// verified against Cambridge/Oxford.
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk) variants.
// `hi` on an example is the form to highlight in the phrase (is / are / there).

import type { L1Block, L1Section } from './theory_content_lesson1';

export const LESSON9_THEORY: { titleRu: string; titleUk: string; sections: L1Section[] } = {
  titleRu: 'There is / There are',
  titleUk: 'There is / There are',
  sections: [
    // ───────────────────────── 01 ─────────────────────────
    {
      num: '01',
      titleRu: 'Что ты тренируешь в этом уроке',
      titleUk: 'Що ти тренуєш у цьому уроці',
      defaultOpen: true,
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'В этом уроке ты учишься говорить, что где-то что-то есть или находится. Для одного предмета — There is, для нескольких — There are. После этого добавляешь предлог места: in, on, under и другие.',
          uk: 'У цьому уроці ти вчишся говорити, що десь щось є або знаходиться. Для одного предмета — There is, для кількох — There are. Після цього додаєш прийменник місця: in, on, under та інші.',
        } as L1Block,
        {
          kind: 'examples',
          examples: [
            { en: 'There is a book.', ru: 'Есть книга (одна).', uk: 'Є книга (одна).', hi: 'is' },
            { en: 'There are chairs.', ru: 'Есть стулья (несколько).', uk: 'Є стільці (кілька).', hi: 'are' },
          ],
        } as L1Block,
        {
          kind: 'tip',
          ru: 'Запомни два блока: There is — один предмет, There are — много предметов.',
          uk: 'Запам\'ятай два блоки: There is — один предмет, There are — багато предметів.',
        } as L1Block,
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Единственное число: There is',
      titleUk: 'Однина: There is',
      defaultOpen: true,
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'Когда предмет один, используй There is. Отрицание — There isn\'t, вопрос — Is there?',
          uk: 'Коли предмет один, використовуй There is. Заперечення — There isn\'t, питання — Is there?',
        } as L1Block,
        {
          kind: 'formula',
          formula: ['There', 'is', 'a book'],
        } as L1Block,
        {
          kind: 'examples',
          examples: [
            { en: 'There is a book.', ru: 'Утверждение (ед. число)', uk: 'Ствердження (однина)', hi: 'is' },
            { en: "There isn't a book.", ru: 'Отрицание (ед. число)', uk: 'Заперечення (однина)', hi: "isn't" },
            { en: 'Is there a book?', ru: 'Вопрос (ед. число)', uk: 'Питання (однина)', hi: 'Is' },
          ],
        } as L1Block,
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно для одного предмета?', uk: 'Де правильно для одного предмета?' },
            optionA: 'There are a book.',
            optionB: 'There is a book.',
            correct: 'B',
            explain: { ru: 'Один предмет — There is.', uk: 'Один предмет — There is.' },
          },
        } as unknown as L1Block,
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Множественное число: There are',
      titleUk: 'Множина: There are',
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'Когда предметов несколько, используй There are. Отрицание — There aren\'t, вопрос — Are there?',
          uk: 'Коли предметів кілька, використовуй There are. Заперечення — There aren\'t, питання — Are there?',
        } as L1Block,
        {
          kind: 'formula',
          formula: ['There', 'are', 'chairs'],
        } as L1Block,
        {
          kind: 'examples',
          examples: [
            { en: 'There are chairs.', ru: 'Утверждение (мн. число)', uk: 'Ствердження (множина)', hi: 'are' },
            { en: "There aren't chairs.", ru: 'Отрицание (мн. число)', uk: 'Заперечення (множина)', hi: "aren't" },
            { en: 'Are there chairs?', ru: 'Вопрос (мн. число)', uk: 'Питання (множина)', hi: 'Are' },
          ],
        } as L1Block,
        {
          kind: 'fix',
          fixes: [
            { wrong: 'There is chairs.', right: 'There are chairs.' },
            { wrong: 'There are a book.', right: 'There is a book.' },
          ],
        } as L1Block,
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'There',
            after: 'chairs.',
            options: ['is', 'are'],
            answer: 'are',
            why: { ru: 'Несколько предметов (chairs) — There are.', uk: 'Кілька предметів (chairs) — There are.' },
          },
        } as unknown as L1Block,
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'Предлоги места',
      titleUk: 'Прийменники місця',
      exampleCount: 8,
      blocks: [
        {
          kind: 'body',
          ru: 'После того как ты сказал, что что-то есть, можно добавить, где именно. Для этого нужны предлоги места.',
          uk: 'Після того як ти сказав, що щось є, можна додати, де саме. Для цього потрібні прийменники місця.',
        } as L1Block,
        {
          kind: 'examples',
          examples: [
            { en: 'The cat is in the box.', ru: 'in — внутри', uk: 'in — всередині', hi: 'in' },
            { en: 'The book is on the table.', ru: 'on — на', uk: 'on — на', hi: 'on' },
            { en: 'The bag is under the desk.', ru: 'under — под', uk: 'under — під', hi: 'under' },
            { en: 'She sits next to me.', ru: 'next to — рядом с', uk: 'next to — поряд з', hi: 'next to' },
            { en: 'He stands between us.', ru: 'between — между', uk: 'between — між', hi: 'between' },
            { en: 'The park is behind us.', ru: 'behind — позади', uk: 'behind — позаду', hi: 'behind' },
            { en: 'The car is in front of the house.', ru: 'in front of — перед', uk: 'in front of — перед', hi: 'in front of' },
            { en: 'The bank is opposite the school.', ru: 'opposite — напротив', uk: 'opposite — навпроти', hi: 'opposite' },
          ],
        } as L1Block,
        {
          kind: 'tip',
          ru: 'Учи предлог вместе с фразой целиком: in the box, on the table, under the desk. Так легче запоминается.',
          uk: 'Вивчай прийменник разом із фразою цілком: in the box, on the table, under the desk. Так легше запам\'ятовується.',
        } as L1Block,
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Книга на столе', uk: 'Книга на столі' },
            answer: ['The', 'book', 'is', 'on', 'the', 'table'],
            slotLabels: [{ ru: '' }, { ru: 'предмет' }, { ru: 'связка' }, { ru: 'предлог' }, { ru: '' }, { ru: 'место' }],
            distractors: ['in', 'under'],
          },
        } as unknown as L1Block,
        {
          kind: 'drill',
          drill: {
            type: 'spot_slip',
            chips: ['The', 'cat', 'is', 'on', 'the', 'box'],
            answerIndex: 3,
            hint: { ru: 'Кот внутри коробки. Тапни неподходящий предлог.', uk: 'Кіт усередині коробки. Тапни недоречний прийменник.' },
            fix: { ru: 'Внутри — это in: The cat is in the box.', uk: 'Усередині — це in: The cat is in the box.' },
          },
        } as unknown as L1Block,
      ],
    },
  ],
};
