// Theory content for Lesson 8 (Prepositions of time: at / in / on).
//
// Structured data source for the TheoryLessonView engine.
// Content is transferred from the legacy lesson_help.tsx HINTS[8].render
// (a single Table: preposition / used-with / examples) without grammar changes.
// The at/in/on rules are verified against Cambridge/Oxford usage.
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk) variants.
// `hi` on an example is the preposition (at / in / on) to highlight in the phrase.
//
// Interfaces are reused from theory_content_lesson1 to avoid duplication.

import type { L1Block, L1Section } from './theory_content_lesson1'

export const LESSON8_THEORY: {
  titleRu: string
  titleUk: string
  sections: L1Section[]
} = {
  titleRu: 'Предлоги времени: at / in / on',
  titleUk: 'Прийменники часу: at / in / on',
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
          ru: 'В этом уроке ты учишься правильно выбирать предлог времени: at, in или on. Это маленькие слова, которые ставятся перед временем и отвечают на вопрос «когда?». Выбор зависит от того, насколько точное время ты называешь.',
          uk: 'У цьому уроці ти вчишся правильно обирати прийменник часу: at, in або on. Це маленькі слова, які ставляться перед часом і відповідають на питання «коли?». Вибір залежить від того, наскільки точний час ти називаєш.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'at 7:00', ru: 'в 7:00 (точное время)', uk: 'о 7:00 (точний час)', hi: 'at' },
            { en: 'in May', ru: 'в мае (месяц)', uk: 'у травні (місяць)', hi: 'in' },
            { en: 'on Monday', ru: 'в понедельник (день недели)', uk: 'у понеділок (день тижня)', hi: 'on' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Подсказка-лесенка: at — самое точное (час), in — самое широкое (месяц, год, сезон), on — посередине (конкретный день или дата).',
          uk: 'Підказка-драбинка: at — найточніше (година), in — найширше (місяць, рік, сезон), on — посередині (конкретний день або дата).',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Три предлога в одной таблице',
      titleUk: 'Три прийменники в одній таблиці',
      defaultOpen: true,
      exampleCount: 9,
      blocks: [
        {
          kind: 'body',
          ru: 'Вот главная таблица урока. Каждый предлог дружит со своим типом времени. Запоминай не правило словами, а готовые блоки целиком.',
          uk: 'Ось головна таблиця уроку. Кожен прийменник дружить зі своїм типом часу. Запам\'ятовуй не правило словами, а готові блоки цілком.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'AT — at 7:00', ru: 'Точное время, полдень, ночь', uk: 'Точний час, полудень, ніч', hi: 'at' },
            { en: 'AT — at noon', ru: 'в полдень', uk: 'опівдні', hi: 'at' },
            { en: 'AT — at night', ru: 'ночью', uk: 'вночі', hi: 'at' },
            { en: 'IN — in May', ru: 'Месяц, год, сезон, часть дня', uk: 'Місяць, рік, сезон, частина доби', hi: 'in' },
            { en: 'IN — in 2024', ru: 'в 2024 году', uk: 'у 2024 році', hi: 'in' },
            { en: 'IN — in the morning', ru: 'утром', uk: 'вранці', hi: 'in' },
            { en: 'ON — on Monday', ru: 'День недели, дата, выходные', uk: 'День тижня, дата, вихідні', hi: 'on' },
            { en: 'ON — on weekends', ru: 'по выходным', uk: 'на вихідних', hi: 'on' },
            { en: 'ON — on 5 March', ru: '5 марта (дата)', uk: '5 березня (дата)', hi: 'on' },
          ],
        },
        {
          kind: 'formula',
          formula: ['когда?', 'at / in / on', 'время'],
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'AT — точное время',
      titleUk: 'AT — точний час',
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'At используется, когда ты называешь точный момент: конкретный час, а также с устойчивыми словами noon (полдень) и night (ночь).',
          uk: 'At використовується, коли ти називаєш точний момент: конкретну годину, а також зі сталими словами noon (полудень) і night (ніч).',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'at 7:00', ru: 'в 7:00', uk: 'о 7:00', hi: 'at' },
            { en: 'at noon', ru: 'в полдень', uk: 'опівдні', hi: 'at' },
            { en: 'at night', ru: 'ночью', uk: 'вночі', hi: 'at' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'I get up',
            after: '7:00',
            options: ['at', 'in', 'on'],
            answer: 'at',
            why: { ru: 'С точным временем (часами) всегда at: at 7:00.' },
          },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'IN — месяц, год, сезон, часть дня',
      titleUk: 'IN — місяць, рік, сезон, частина доби',
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'In используется для длинных, широких отрезков времени: месяц, год, сезон, а также для частей дня (the morning, the afternoon, the evening).',
          uk: 'In використовується для довгих, широких відрізків часу: місяць, рік, сезон, а також для частин доби (the morning, the afternoon, the evening).',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'in May', ru: 'в мае', uk: 'у травні', hi: 'in' },
            { en: 'in 2024', ru: 'в 2024 году', uk: 'у 2024 році', hi: 'in' },
            { en: 'in the morning', ru: 'утром', uk: 'вранці', hi: 'in' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Внимание: «утром, днём, вечером» — это in (in the morning), но «ночью» — это at (at night). Это надо просто запомнить.',
          uk: 'Увага: «вранці, вдень, ввечері» — це in (in the morning), але «вночі» — це at (at night). Це треба просто запам\'ятати.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'My birthday is',
            after: 'May',
            options: ['at', 'in', 'on'],
            answer: 'in',
            why: { ru: 'С месяцами всегда in: in May, in July.' },
          },
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'ON — день недели, дата, выходные',
      titleUk: 'ON — день тижня, дата, вихідні',
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'On используется с конкретными днями: день недели, точная дата и выходные (weekends).',
          uk: 'On використовується з конкретними днями: день тижня, точна дата та вихідні (weekends).',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'on Monday', ru: 'в понедельник', uk: 'у понеділок', hi: 'on' },
            { en: 'on weekends', ru: 'по выходным', uk: 'на вихідних', hi: 'on' },
            { en: 'on 5 March', ru: '5 марта', uk: '5 березня', hi: 'on' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно?' },
            optionA: 'in Monday',
            optionB: 'on Monday',
            correct: 'B',
            explain: { ru: 'С днями недели нужен on: on Monday.' },
          },
        },
      ],
    },

    // ───────────────────────── 06 ─────────────────────────
    {
      num: '06',
      titleRu: 'Собери фразу',
      titleUk: 'Збери фразу',
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'Предлог времени ставится перед самим временем. Сначала идёт основа фразы, затем предлог, затем время.',
          uk: 'Прийменник часу ставиться перед самим часом. Спочатку йде основа фрази, потім прийменник, потім час.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'on Monday', ru: 'on — Monday', uk: 'on — Monday', hi: 'on' },
            { en: 'at noon', ru: 'at — noon', uk: 'at — noon', hi: 'at' },
            { en: 'in the morning', ru: 'in — the morning', uk: 'in — the morning', hi: 'in' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'ночью' },
            answer: ['at', 'night'],
            slotLabels: [{ ru: 'предлог' }, { ru: 'время' }],
            distractors: ['in', 'on', 'noon'],
          },
        },
      ],
    },

    // ───────────────────────── 07 ─────────────────────────
    {
      num: '07',
      titleRu: 'Самые частые ошибки',
      titleUk: 'Найчастіші помилки',
      blocks: [
        {
          kind: 'fix',
          fixes: [
            { wrong: 'in Monday', right: 'on Monday' },
            { wrong: 'on May', right: 'in May' },
            { wrong: 'in 7:00', right: 'at 7:00' },
            { wrong: 'in night', right: 'at night' },
            { wrong: 'at the morning', right: 'in the morning' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Запомни лесенку: at — час (at 7:00), on — день/дата (on Monday), in — месяц/год/сезон (in May). Отдельно держи в голове: at night, но in the morning.',
          uk: 'Запам\'ятай драбинку: at — година (at 7:00), on — день/дата (on Monday), in — місяць/рік/сезон (in May). Окремо тримай у голові: at night, але in the morning.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'spot_slip',
            chips: ['I', 'work', 'in', 'Monday'],
            answerIndex: 2,
            hint: { ru: 'Тут не тот предлог. Тапни лишнее слово.' },
            fix: { ru: 'С днями недели нужен on: on Monday.' },
          },
        },
      ],
    },

    // ───────────────────────── 08 ─────────────────────────
    {
      num: '08',
      titleRu: 'Что нужно вынести из урока',
      titleUk: 'Що треба винести з уроку',
      blocks: [
        {
          kind: 'body',
          ru: 'В этом уроке ты научился выбирать предлог времени по типу времени: at для точного часа, in для широких отрезков (месяц, год, сезон, часть дня), on для конкретных дней и дат.',
          uk: 'У цьому уроці ти навчився обирати прийменник часу за типом часу: at для точної години, in для широких відрізків (місяць, рік, сезон, частина доби), on для конкретних днів і дат.',
        },
        {
          kind: 'tip',
          ru: 'Перед практикой держи три блока в голове: at 7:00, in May, on Monday. И два исключения: at night, in the morning.',
          uk: 'Перед практикою тримай три блоки в голові: at 7:00, in May, on Monday. І два винятки: at night, in the morning.',
        },
      ],
    },
  ],
}
