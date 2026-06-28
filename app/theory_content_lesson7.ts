// Theory content for Lesson 7 (To Have: have / has, don't / doesn't have, Do / Does ... have).
//
// This file is the structured data source for the TheoryLessonView engine.
// Content is transferred verbatim from the legacy lesson_help.tsx HINTS[7].render
// (Table components) without any grammar changes — the content is verified
// against Cambridge/Oxford (have/has agreement; do/does support for
// negatives and questions).
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk) variants.
// `hi` on an example is the To Have form (have / has / don't / doesn't / Do / Does)
// to highlight in the phrase.

import type { L1Block, L1Section } from './theory_content_lesson1'

export const LESSON7_THEORY: { titleRu: string; titleUk: string; sections: L1Section[] } = {
  titleRu: 'To Have — иметь',
  titleUk: 'To Have — мати',
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
          ru: 'В этом уроке ты учишься говорить, что у кого-то что-то есть, с помощью глагола To Have. У него всего две формы в настоящем времени: have и has. Форма зависит от того, о ком ты говоришь.',
          uk: 'У цьому уроці ти вчишся казати, що в когось щось є, за допомогою дієслова To Have. У нього всього дві форми в теперішньому часі: have і has. Форма залежить від того, про кого ти говориш.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I have a car', ru: 'У меня есть машина', uk: 'У мене є машина', hi: 'have' },
            { en: 'She has two cats', ru: 'У неё есть две кошки', uk: 'У неї є дві кішки', hi: 'has' },
          ],
        },
        {
          kind: 'tip',
          ru: 'have - для I, you, we, they. has - для he, she, it.',
          uk: 'have - для I, you, we, they. has - для he, she, it.',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Полная таблица: have / has',
      titleUk: 'Повна таблиця: have / has',
      defaultOpen: true,
      exampleCount: 6,
      blocks: [
        {
          kind: 'body',
          ru: 'Вот вся таблица урока: утверждение, отрицание и вопрос для каждой группы подлежащих. С I, you, we, they используется have, don\'t have и Do ... have. С he, she, it используется has, doesn\'t have и Does ... have.',
          uk: 'Ось уся таблиця уроку: ствердження, заперечення та питання для кожної групи підметів. З I, you, we, they використовується have, don\'t have і Do ... have. З he, she, it використовується has, doesn\'t have і Does ... have.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I / You / We / They — have', ru: 'утверждение — I have a car', uk: 'ствердження — I have a car', hi: 'have' },
            { en: 'I / You / We / They — don\'t have', ru: 'отрицание — I don\'t have a car', uk: 'заперечення — I don\'t have a car', hi: 'don\'t' },
            { en: 'Do ... have?', ru: 'вопрос — Do you have a pen?', uk: 'питання — Do you have a pen?', hi: 'Do' },
            { en: 'He / She / It — has', ru: 'утверждение — She has two cats', uk: 'ствердження — She has two cats', hi: 'has' },
            { en: 'He / She / It — doesn\'t have', ru: 'отрицание — He doesn\'t have a phone', uk: 'заперечення — He doesn\'t have a phone', hi: 'doesn\'t' },
            { en: 'Does ... have?', ru: 'вопрос — Does she have time?', uk: 'питання — Does she have time?', hi: 'Does' },
          ],
        },
        {
          kind: 'drill',
          drill: { type: 'choice', before: 'She', after: 'two cats', options: ['have', 'has', 'haves'], answer: 'has', why: { ru: 'She — это he/she/it, поэтому идёт has.' } },
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Утверждение: have и has',
      titleUk: 'Ствердження: have і has',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'В утверждении выбирай форму по подлежащему. С I, you, we, they - have. С he, she, it - has.',
          uk: 'У ствердженні обирай форму за підметом. З I, you, we, they - have. З he, she, it - has.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I have a car', ru: 'У меня есть машина', uk: 'У мене є машина', hi: 'have' },
            { en: 'She has two cats', ru: 'У неё есть две кошки', uk: 'У неї є дві кішки', hi: 'has' },
          ],
        },
        {
          kind: 'fix',
          fixes: [
            { wrong: 'She have two cats', right: 'She has two cats' },
            { wrong: 'I has a car', right: 'I have a car' },
          ],
        },
        {
          kind: 'drill',
          drill: { type: 'word_bank', prompt: { ru: 'У меня есть машина' }, answer: ['I', 'have', 'a', 'car'], slotLabels: [{ ru: 'кто' }, { ru: 'форма' }, { ru: 'артикль' }, { ru: 'что' }], distractors: ['has', 'two'] },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'Отрицание: don\'t have / doesn\'t have',
      titleUk: 'Заперечення: don\'t have / doesn\'t have',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'В отрицании появляется do/does, а сам глагол всегда становится have. С I, you, we, they - don\'t have. С he, she, it - doesn\'t have. После doesn\'t уже не нужно has - только have.',
          uk: 'У запереченні з\'являється do/does, а саме дієслово завжди стає have. З I, you, we, they - don\'t have. З he, she, it - doesn\'t have. Після doesn\'t уже не потрібно has - тільки have.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I don\'t have a car', ru: 'У меня нет машины', uk: 'У мене немає машини', hi: 'don\'t' },
            { en: 'He doesn\'t have a phone', ru: 'У него нет телефона', uk: 'У нього немає телефону', hi: 'doesn\'t' },
          ],
        },
        {
          kind: 'fix',
          fixes: [
            { wrong: 'He doesn\'t has a phone', right: 'He doesn\'t have a phone' },
            { wrong: 'I don\'t has a car', right: 'I don\'t have a car' },
          ],
        },
        {
          kind: 'tip',
          ru: 'После doesn\'t глагол всегда have, а не has. «s» уже спрятано в doesn\'t.',
          uk: 'Після doesn\'t дієслово завжди have, а не has. «s» уже сховане в doesn\'t.',
        },
        {
          kind: 'drill',
          drill: { type: 'spot_slip', chips: ['He', 'doesn\'t', 'has', 'a', 'phone'], answerIndex: 2, hint: { ru: 'Тут не та форма глагола. Тапни лишнее слово.' }, fix: { ru: 'После doesn\'t нужно have: He doesn\'t have a phone.' } },
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'Вопрос: Do ... have? / Does ... have?',
      titleUk: 'Питання: Do ... have? / Does ... have?',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'В вопросе вперёд выходит Do или Does, а глагол снова становится have. С I, you, we, they - Do ... have? С he, she, it - Does ... have? После Does тоже только have, не has.',
          uk: 'У питанні наперед виходить Do або Does, а дієслово знову стає have. З I, you, we, they - Do ... have? З he, she, it - Does ... have? Після Does теж тільки have, не has.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Do you have a pen?', ru: 'У тебя есть ручка?', uk: 'У тебе є ручка?', hi: 'Do' },
            { en: 'Does she have time?', ru: 'У неё есть время?', uk: 'У неї є час?', hi: 'Does' },
          ],
        },
        {
          kind: 'fix',
          fixes: [
            { wrong: 'Does she has time?', right: 'Does she have time?' },
            { wrong: 'Has you a pen?', right: 'Do you have a pen?' },
          ],
        },
        {
          kind: 'drill',
          drill: { type: 'binary', question: { ru: 'Где верно?' }, optionA: 'Does she has time?', optionB: 'Does she have time?', correct: 'B', explain: { ru: 'После Does глагол всегда have, а не has.' } },
        },
      ],
    },

    // ───────────────────────── 06 ─────────────────────────
    {
      num: '06',
      titleRu: 'Примеры из урока',
      titleUk: 'Приклади з уроку',
      exampleCount: 5,
      blocks: [
        {
          kind: 'body',
          ru: 'Собери всё вместе: вот живые фразы из урока на утверждение, отрицание и вопрос.',
          uk: 'Збери все разом: ось живі фрази з уроку на ствердження, заперечення та питання.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I have a car.', ru: 'У меня есть машина.', uk: 'У мене є машина.', hi: 'have' },
            { en: 'She has two cats.', ru: 'У неё есть две кошки.', uk: 'У неї є дві кішки.', hi: 'has' },
            { en: 'He doesn\'t have a phone.', ru: 'У него нет телефона.', uk: 'У нього немає телефону.', hi: 'doesn\'t' },
            { en: 'Do you have a pen?', ru: 'У тебя есть ручка?', uk: 'У тебе є ручка?', hi: 'Do' },
            { en: 'Does she have time?', ru: 'У неё есть время?', uk: 'У неї є час?', hi: 'Does' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Держи одно правило: has только в простом утверждении с he/she/it. В отрицании и вопросе всегда have (don\'t have, doesn\'t have, Do/Does ... have).',
          uk: 'Тримай одне правило: has лише в простому ствердженні з he/she/it. У запереченні та питанні завжди have (don\'t have, doesn\'t have, Do/Does ... have).',
        },
      ],
    },
  ],
}
