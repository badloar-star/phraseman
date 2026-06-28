// Theory content for Lesson 2 (To Be: negation and questions).
//
// This file is the structured data source for the TheoryLessonView engine.
// Content is transferred verbatim from the legacy lesson_help.tsx HINTS[2].render
// (Table components with negation forms and questions / short answers) without any
// grammar changes — the content is already verified against Cambridge/Oxford.
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk) variants.
// `hi` on an example is the To Be form (am / is / are / isn't / aren't) to highlight.
//
// Interfaces are reused from theory_content_lesson1 (do NOT duplicate the types).

import type { L1Block, L1Section } from './theory_content_lesson1'

export const LESSON2_THEORY: {
  titleRu: string
  titleUk: string
  sections: L1Section[]
} = {
  titleRu: 'To Be — отрицание и вопросы',
  titleUk: 'To Be — заперечення і питання',
  sections: [
    // ───────────────────────── 01 ─────────────────────────
    {
      num: '01',
      titleRu: 'Что ты тренируешь в этом уроке',
      titleUk: 'Що ти тренуєш у цьому уроці',
      defaultOpen: true,
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'В прошлом уроке ты строил утверждения с am, is, are. В этом уроке ты учишься делать из них отрицание («не являться») и вопрос. Главное: ту же форму To Be используют и для «нет», и для вопроса — меняется только порядок слов и добавляется not.',
          uk: 'У минулому уроці ти будував ствердження з am, is, are. У цьому уроці ти вчишся робити з них заперечення («не бути») і питання. Головне: ту саму форму To Be використовують і для «ні», і для питання — змінюється лише порядок слів і додається not.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I am not here', ru: 'Меня здесь нет', uk: 'Мене тут немає', hi: 'am not' },
            { en: 'He is not busy', ru: 'Он не занят', uk: 'Він не зайнятий', hi: 'is not' },
            { en: 'Are they at home?', ru: 'Они дома?', uk: 'Вони вдома?', hi: 'Are' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Отрицание = To Be + not. Вопрос = To Be впереди подлежащего.',
          uk: 'Заперечення = To Be + not. Питання = To Be попереду підмета.',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Отрицание: добавляем not',
      titleUk: 'Заперечення: додаємо not',
      defaultOpen: true,
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'Чтобы сказать «не являться», поставь not после am, is или are. Полная форма: I am not, He is not, You are not. У этих фраз есть короткая (сокращённая) форма.',
          uk: 'Щоб сказати «не бути», постав not після am, is або are. Повна форма: I am not, He is not, You are not. У цих фраз є коротка (скорочена) форма.',
        },
        {
          kind: 'formula',
          formula: ['кто / что', 'am / is / are', 'not', 'описание'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I am not', ru: 'полная: I am not · короткая: I\'m not', uk: 'повна: I am not · коротка: I\'m not', hi: 'am not' },
            { en: 'He is not', ru: 'полная: He is not · короткая: He isn\'t', uk: 'повна: He is not · коротка: He isn\'t', hi: 'isn\'t' },
            { en: 'You are not', ru: 'полная: You are not · короткая: You aren\'t', uk: 'повна: You are not · коротка: You aren\'t', hi: 'aren\'t' },
          ],
        },
        {
          kind: 'tip',
          ru: 'He / She / It → isn\'t. You / We / They → aren\'t. У I нет формы amn\'t — только I\'m not.',
          uk: 'He / She / It → isn\'t. You / We / They → aren\'t. У I немає форми amn\'t — тільки I\'m not.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'He',
            after: 'busy',
            options: ['am not', 'isn\'t', 'aren\'t'],
            answer: 'isn\'t',
            why: { ru: 'He — это he/she/it, поэтому отрицание isn\'t.' },
          },
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Полная и короткая форма',
      titleUk: 'Повна та коротка форма',
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'В живой речи чаще говорят коротко. I am not = I\'m not. He is not = He isn\'t. You are not = You aren\'t. Смысл одинаковый, короткая форма звучит естественнее.',
          uk: 'У живому мовленні частіше кажуть коротко. I am not = I\'m not. He is not = He isn\'t. You are not = You aren\'t. Зміст однаковий, коротка форма звучить природніше.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I\'m not ready', ru: 'Я не готов', uk: 'Я не готовий', hi: 'm not' },
            { en: 'He isn\'t busy', ru: 'Он не занят', uk: 'Він не зайнятий', hi: 'isn\'t' },
            { en: 'They aren\'t at home', ru: 'Их нет дома', uk: 'Їх немає вдома', hi: 'aren\'t' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Я не готов (коротко)' },
            answer: ['I\'m', 'not', 'ready'],
            slotLabels: [{ ru: 'кто' }, { ru: 'отрицание' }, { ru: 'описание' }],
            distractors: ['isn\'t', 'busy'],
          },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'Вопрос: To Be впереди',
      titleUk: 'Питання: To Be попереду',
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'Чтобы задать вопрос, поставь am, is или are в начало — перед подлежащим. Утверждение He is a doctor → вопрос Is he a doctor? Ничего лишнего добавлять не нужно.',
          uk: 'Щоб поставити питання, постав am, is або are на початок — перед підметом. Ствердження He is a doctor → питання Is he a doctor? Нічого зайвого додавати не треба.',
        },
        {
          kind: 'formula',
          formula: ['am / is / are', 'кто / что', 'описание', '?'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Am I right?', ru: 'Я прав?', uk: 'Я правий?', hi: 'Am' },
            { en: 'Is he a doctor?', ru: 'Он врач?', uk: 'Він лікар?', hi: 'Is' },
            { en: 'Are they at home?', ru: 'Они дома?', uk: 'Вони вдома?', hi: 'Are' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верный вопрос?' },
            optionA: 'He is a doctor?',
            optionB: 'Is he a doctor?',
            correct: 'B',
            explain: { ru: 'В вопросе To Be (is) ставится перед подлежащим (he).' },
          },
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'Краткие ответы: Yes / No',
      titleUk: 'Короткі відповіді: Yes / No',
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'На такие вопросы отвечают коротко. Yes, you are. / No, you aren\'t. Yes, he is. / No, he isn\'t. Yes, they are. / No, they aren\'t. В коротком ответе повторяют ту же форму To Be.',
          uk: 'На такі питання відповідають коротко. Yes, you are. / No, you aren\'t. Yes, he is. / No, he isn\'t. Yes, they are. / No, they aren\'t. У короткій відповіді повторюють ту саму форму To Be.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Am I right? — Yes, you are. / No, you aren\'t.', ru: 'Я прав? — Да. / Нет.', uk: 'Я правий? — Так. / Ні.', hi: 'are' },
            { en: 'Is he a doctor? — Yes, he is. / No, he isn\'t.', ru: 'Он врач? — Да. / Нет.', uk: 'Він лікар? — Так. / Ні.', hi: 'is' },
            { en: 'Are they at home? — Yes, they are. / No, they aren\'t.', ru: 'Они дома? — Да. / Нет.', uk: 'Вони вдома? — Так. / Ні.', hi: 'are' },
          ],
        },
        {
          kind: 'tip',
          ru: 'В коротком ответе нельзя сокращать «Yes, he\'s.» — после Yes говорят полную форму: Yes, he is.',
          uk: 'У короткій відповіді не можна скорочувати «Yes, he\'s.» — після Yes кажуть повну форму: Yes, he is.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'Is he a doctor? — Yes, he',
            after: '.',
            options: ['am', 'is', 'are'],
            answer: 'is',
            why: { ru: 'В коротком ответе повторяем ту же форму: для he — is.' },
          },
        },
      ],
    },

    // ───────────────────────── 06 ─────────────────────────
    {
      num: '06',
      titleRu: 'Самые частые ошибки',
      titleUk: 'Найчастіші помилки',
      blocks: [
        {
          kind: 'fix',
          fixes: [
            { wrong: 'I amn\'t ready', right: 'I\'m not ready' },
            { wrong: 'He not busy', right: 'He isn\'t busy' },
            { wrong: 'He is doctor?', right: 'Is he a doctor?' },
            { wrong: 'Yes, he\'s.', right: 'Yes, he is.' },
          ],
        },
        {
          kind: 'tip',
          ru: 'I amn\'t ready → I\'m not ready: формы amn\'t нет. He not busy → He isn\'t busy: нельзя выбрасывать is. He is doctor? → Is he a doctor?: в вопросе To Be идёт впереди. Yes, he\'s. → Yes, he is.: после Yes форму не сокращают.',
          uk: 'I amn\'t ready → I\'m not ready: форми amn\'t немає. He not busy → He isn\'t busy: не можна викидати is. He is doctor? → Is he a doctor?: у питанні To Be йде попереду. Yes, he\'s. → Yes, he is.: після Yes форму не скорочують.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'spot_slip',
            chips: ['He', 'not', 'busy'],
            answerIndex: 1,
            hint: { ru: 'Тут пропала форма To Be. Тапни лишнее слово.' },
            fix: { ru: 'Нельзя просто not — нужно He isn\'t busy.' },
          },
        },
      ],
    },

    // ───────────────────────── 07 ─────────────────────────
    {
      num: '07',
      titleRu: 'Что нужно вынести из урока',
      titleUk: 'Що треба винести з уроку',
      blocks: [
        {
          kind: 'body',
          ru: 'Отрицание: ставь not после am/is/are (I\'m not, he isn\'t, you aren\'t). Вопрос: выноси am/is/are вперёд (Am I…? Is he…? Are they…?). Ответ: повторяй ту же форму (Yes, he is. / No, he isn\'t.).',
          uk: 'Заперечення: став not після am/is/are (I\'m not, he isn\'t, you aren\'t). Питання: виноси am/is/are вперед (Am I…? Is he…? Are they…?). Відповідь: повторюй ту саму форму (Yes, he is. / No, he isn\'t.).',
        },
        {
          kind: 'tip',
          ru: 'Держи три блока: I\'m not / he isn\'t / they aren\'t — для «нет»; Is he…? / Are they…? — для вопроса; Yes, he is. / No, he isn\'t. — для ответа.',
          uk: 'Тримай три блоки: I\'m not / he isn\'t / they aren\'t — для «ні»; Is he…? / Are they…? — для питання; Yes, he is. / No, he isn\'t. — для відповіді.',
        },
      ],
    },
  ],
}
