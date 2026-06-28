// Theory content for Lesson 6 (Special / Wh- questions).
//
// Structured data source for the TheoryLessonView engine.
// Content is transferred verbatim from the legacy lesson_help.tsx HINTS[6].render
// (Table components) without any grammar changes — grammar verified against
// Cambridge/Oxford. Bilingual: every text field carries Russian (ru) and
// Ukrainian (uk) variants. `hi` highlights the question-form word (do/does/Wh-).
//
// Types are reused from theory_content_lesson1 — do not duplicate them.

import type { L1Block, L1Section } from './theory_content_lesson1'

export const LESSON6_THEORY: { titleRu: string; titleUk: string; sections: L1Section[] } = {
  titleRu: 'Специальные вопросы',
  titleUk: 'Спеціальні питання',
  sections: [
    // ───────────────────────── 01 ─────────────────────────
    {
      num: '01',
      titleRu: 'Что такое специальный вопрос',
      titleUk: 'Що таке спеціальне питання',
      defaultOpen: true,
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'Специальный вопрос — это вопрос, на который нельзя ответить просто «да» или «нет». Он начинается с вопросительного слова Wh- (What, Who, Where и так далее) и спрашивает про конкретную деталь: что, кто, где, когда, почему, как.',
          uk: 'Спеціальне питання — це питання, на яке не можна відповісти просто «так» або «ні». Воно починається з питального слова Wh- (What, Who, Where тощо) і запитує про конкретну деталь: що, хто, де, коли, чому, як.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'What do you want?', ru: 'Что ты хочешь?', uk: 'Що ти хочеш?', hi: 'What' },
            { en: 'Where are you going?', ru: 'Куда ты идёшь?', uk: 'Куди ти йдеш?', hi: 'Where' },
            { en: 'Why are you late?', ru: 'Почему ты опаздываешь?', uk: 'Чому ти запізнюєшся?', hi: 'Why' },
            { en: 'How do you feel?', ru: 'Как ты себя чувствуешь?', uk: 'Як ти почуваєшся?', hi: 'How' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Wh-слово всегда стоит в самом начале вопроса.',
          uk: 'Wh-слово завжди стоїть на самому початку питання.',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Вопросительные слова Wh-',
      titleUk: 'Питальні слова Wh-',
      defaultOpen: true,
      exampleCount: 8,
      blocks: [
        {
          kind: 'body',
          ru: 'Вот основные вопросительные слова и их значения. Запоминай слово вместе с примером — так оно закрепляется быстрее.',
          uk: 'Ось основні питальні слова та їхні значення. Запам\'ятовуй слово разом із прикладом — так воно закріплюється швидше.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'What', ru: 'Что / Какой — What do you want?', uk: 'Що / Який — What do you want?', hi: 'What' },
            { en: 'Who', ru: 'Кто — Who lives here?', uk: 'Хто — Who lives here?', hi: 'Who' },
            { en: 'Where', ru: 'Где / Куда — Where are you going?', uk: 'Де / Куди — Where are you going?', hi: 'Where' },
            { en: 'When', ru: 'Когда — When does it start?', uk: 'Коли — When does it start?', hi: 'When' },
            { en: 'Why', ru: 'Почему — Why are you late?', uk: 'Чому — Why are you late?', hi: 'Why' },
            { en: 'How', ru: 'Как — How do you feel?', uk: 'Як — How do you feel?', hi: 'How' },
            { en: 'Which', ru: 'Который (выбор) — Which book do you like?', uk: 'Який (вибір) — Which book do you like?', hi: 'Which' },
            { en: 'Whose', ru: 'Чей — Whose bag is this?', uk: 'Чий — Whose bag is this?', hi: 'Whose' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: '___ lives here?',
            after: '',
            options: ['What', 'Who', 'Where'],
            answer: 'Who',
            why: { ru: 'Спрашиваем про человека — нужно Who (кто).' },
          },
        },
        {
          kind: 'tip',
          ru: 'Which используется, когда есть выбор из нескольких вариантов, а What — когда выбор открытый.',
          uk: 'Which використовується, коли є вибір із кількох варіантів, а What — коли вибір відкритий.',
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Формула специального вопроса',
      titleUk: 'Формула спеціального питання',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'В Present Simple специальный вопрос строится так: Wh-слово + вспомогательный глагол (do или does) + подлежащее + основной глагол. Выбор do или does зависит от подлежащего.',
          uk: 'У Present Simple спеціальне питання будується так: Wh-слово + допоміжне дієслово (do або does) + підмет + основне дієслово. Вибір do або does залежить від підмета.',
        },
        {
          kind: 'formula',
          formula: ['Wh-', 'do / does', 'подлежащее', 'глагол'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Where do you live?', ru: 'I / You / We / They — берут do', uk: 'I / You / We / They — беруть do', hi: 'do' },
            { en: 'Where does he work?', ru: 'He / She / It — берут does', uk: 'He / She / It — беруть does', hi: 'does' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Где ты живёшь?' },
            answer: ['Where', 'do', 'you', 'live'],
            slotLabels: [{ ru: 'Wh-' }, { ru: 'do/does' }, { ru: 'кто' }, { ru: 'глагол' }],
            distractors: ['does', 'lives'],
          },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'do или does — выбираем правильно',
      titleUk: 'do або does — обираємо правильно',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'С he, she, it используется does. Со всеми остальными (I, you, we, they) — do. После does основной глагол стоит в начальной форме, без -s.',
          uk: 'З he, she, it використовується does. З усіма іншими (I, you, we, they) — do. Після does основне дієслово стоїть у початковій формі, без -s.',
        },
        {
          kind: 'fix',
          fixes: [
            { wrong: 'Where does he works?', right: 'Where does he work?' },
            { wrong: 'Where do he live?', right: 'Where does he live?' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно?' },
            optionA: 'Where do he work?',
            optionB: 'Where does he work?',
            correct: 'B',
            explain: { ru: 'С he / she / it нужно does.' },
          },
        },
        {
          kind: 'drill',
          drill: {
            type: 'spot_slip',
            chips: ['When', 'does', 'it', 'starts'],
            answerIndex: 3,
            hint: { ru: 'Одно слово лишнее по форме. Тапни его.' },
            fix: { ru: 'После does глагол без -s: When does it start?' },
          },
        },
        {
          kind: 'tip',
          ru: 'Does уже показывает he/she/it, поэтому второй раз -s к глаголу не добавляем.',
          uk: 'Does уже показує he/she/it, тому вдруге -s до дієслова не додаємо.',
        },
      ],
    },
  ],
}
