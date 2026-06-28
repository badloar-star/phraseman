// Theory content for Lesson 5 (Present Simple: questions).
//
// This file is the structured data source for the TheoryLessonView engine.
// Content is transferred from the legacy lesson_help.tsx HINTS[5].render
// (Table components for general yes/no questions and Wh- questions) without any
// grammar changes — the content is verified against Cambridge/Oxford.
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk) variants.
// `hi` on an example is the form to highlight in the phrase (do / does).
//
// Base block/section interfaces are reused from theory_content_lesson1 (no
// duplication). Lesson 5 also embeds interactive drills, so we extend L1Block
// locally with the engine's `drill` block kind.

import type { L1Block, L1Section } from './theory_content_lesson1';

/** L1Block plus the engine's interactive `drill` block (grammar verified). */
type L5Block =
  | L1Block
  | {
      kind: 'drill';
      drill: { type: 'choice' | 'word_bank' | 'spot_slip' | 'binary'; [key: string]: unknown };
    };

interface L5Section extends Omit<L1Section, 'blocks'> {
  blocks: L5Block[];
}

export const LESSON5_THEORY: { titleRu: string; titleUk: string; sections: L5Section[] } = {
  titleRu: 'Present Simple — вопросы',
  titleUk: 'Present Simple — питання',
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
          ru: 'В этом уроке ты учишься задавать вопросы в Present Simple. Чтобы спросить про привычку или факт, в начале фразы ставят do или does. С he, she, it используется does, с остальными — do.',
          uk: 'У цьому уроці ти вчишся ставити питання в Present Simple. Щоб запитати про звичку або факт, на початку фрази ставлять do або does. З he, she, it використовується does, з рештою — do.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Do you work?', ru: 'Ты работаешь?', uk: 'Ти працюєш?', hi: 'Do' },
            { en: 'Does she work?', ru: 'Она работает?', uk: 'Вона працює?', hi: 'Does' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Главное правило: с he / she / it — does, со всеми остальными — do. После do и does глагол стоит в обычной форме, без -s.',
          uk: 'Головне правило: з he / she / it — does, з усіма іншими — do. Після do та does дієслово стоїть у звичайній формі, без -s.',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Общие вопросы: do и does',
      titleUk: 'Загальні питання: do та does',
      defaultOpen: true,
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Общий вопрос — это вопрос, на который отвечают «да» или «нет». Он начинается с do или does. С I / You / We / They используется do, с He / She / It — does.',
          uk: 'Загальне питання — це питання, на яке відповідають «так» або «ні». Воно починається з do або does. З I / You / We / They використовується do, з He / She / It — does.',
        },
        {
          kind: 'formula',
          formula: ['Do / Does', 'кто', 'глагол', '?'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Do you work?', ru: 'I / You / We / They → Do you work?  Yes, I do. / No, I don\'t.', uk: 'I / You / We / They → Do you work?  Yes, I do. / No, I don\'t.', hi: 'Do' },
            { en: 'Does she work?', ru: 'He / She / It → Does she work?  Yes, she does. / No, she doesn\'t.', uk: 'He / She / It → Does she work?  Yes, she does. / No, she doesn\'t.', hi: 'Does' },
          ],
        },
        {
          kind: 'tip',
          ru: 'В кратком ответе повторяется тот же помощник: Do you...? → Yes, I do. / No, I don\'t. Does she...? → Yes, she does. / No, she doesn\'t.',
          uk: 'У короткій відповіді повторюється той самий помічник: Do you...? → Yes, I do. / No, I don\'t. Does she...? → Yes, she does. / No, she doesn\'t.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: '',
            after: 'she work?',
            options: ['Do', 'Does', 'Is'],
            answer: 'Does',
            why: { ru: 'С she нужен does: Does she work?' },
          },
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно?' },
            optionA: 'Do you work?',
            optionB: 'Does you work?',
            correct: 'A',
            explain: { ru: 'С you нужен do: Do you work?' },
          },
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Краткие ответы: do / does',
      titleUk: 'Короткі відповіді: do / does',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'На общий вопрос отвечают коротко, повторяя do или does. Не нужно повторять весь глагол — достаточно помощника.',
          uk: 'На загальне питання відповідають коротко, повторюючи do або does. Не треба повторювати все дієслово — достатньо помічника.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Yes, I do. / No, I don\'t.', ru: 'ответ на Do you work?', uk: 'відповідь на Do you work?', hi: 'do' },
            { en: 'Yes, she does. / No, she doesn\'t.', ru: 'ответ на Does she work?', uk: 'відповідь на Does she work?', hi: 'does' },
          ],
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'Специальные вопросы (Wh-)',
      titleUk: 'Спеціальні питання (Wh-)',
      exampleCount: 5,
      blocks: [
        {
          kind: 'body',
          ru: 'Специальный вопрос начинается со слова-вопроса (What, Where, When, Why, How). После него идёт тот же do или does, а потом — кто и глагол.',
          uk: 'Спеціальне питання починається зі слова-питання (What, Where, When, Why, How). Після нього йде той самий do або does, а потім — хто і дієслово.',
        },
        {
          kind: 'formula',
          formula: ['Wh-', 'do / does', 'кто', 'глагол', '?'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'What do you do?', ru: 'What — что', uk: 'What — що', hi: 'do' },
            { en: 'Where does she live?', ru: 'Where — где', uk: 'Where — де', hi: 'does' },
            { en: 'When do they eat?', ru: 'When — когда', uk: 'When — коли', hi: 'do' },
            { en: 'Why does he work?', ru: 'Why — почему', uk: 'Why — чому', hi: 'does' },
            { en: 'How do you feel?', ru: 'How — как', uk: 'How — як', hi: 'do' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Даже в Wh-вопросах сохраняется правило do / does: с he, she, it — does (Where does she live?), с остальными — do (Where do you live?).',
          uk: 'Навіть у Wh-питаннях зберігається правило do / does: з he, she, it — does (Where does she live?), з рештою — do (Where do you live?).',
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Где она живёт?' },
            answer: ['Where', 'does', 'she', 'live'],
            slotLabels: [{ ru: 'вопрос' }, { ru: 'помощник' }, { ru: 'кто' }, { ru: 'глагол' }],
            distractors: ['do', 'lives'],
          },
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'Самые частые ошибки',
      titleUk: 'Найчастіші помилки',
      blocks: [
        {
          kind: 'fix',
          fixes: [
            { wrong: 'Does she works?', right: 'Does she work?' },
            { wrong: 'Do she work?', right: 'Does she work?' },
            { wrong: 'Does you work?', right: 'Do you work?' },
            { wrong: 'Where she lives?', right: 'Where does she live?' },
          ],
        },
        {
          kind: 'tip',
          ru: 'После does глагол без -s: Does she work? — а не Does she works? С he / she / it нужен does, а не do. В Wh-вопросах do / does тоже обязателен: Where does she live?',
          uk: 'Після does дієслово без -s: Does she work? — а не Does she works? З he / she / it потрібен does, а не do. У Wh-питаннях do / does теж обов\'язковий: Where does she live?',
        },
        {
          kind: 'drill',
          drill: {
            type: 'spot_slip',
            chips: ['Does', 'she', 'works'],
            answerIndex: 2,
            hint: { ru: 'Тут лишняя -s. Тапни неверное слово.' },
            fix: { ru: 'После does глагол без -s: Does she work?' },
          },
        },
      ],
    },
  ],
};
