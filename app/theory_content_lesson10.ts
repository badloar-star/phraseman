// Theory content for Lesson 10 (Modal verbs: can, must, should, may, might, have to).
//
// Structured data source for the TheoryLessonView engine. Content transferred
// from the legacy lesson_help.tsx HINTS[10].render (a single modal-verbs table)
// and expanded into meaningful sections. Grammar is verified against
// Cambridge/Oxford usage of English modal verbs.
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk).
// `hi` on an example is the modal form (can / must / should / may / might…)
// to highlight in the phrase.

import type { L1Block } from './theory_content_lesson1'

/** Тип одного интерактива (как в движке теории). */
type L10DrillType = 'choice' | 'word_bank' | 'spot_slip' | 'binary'

/** Готовый интерактив теории. Структура повторяет TheoryDrill движка. */
interface L10Drill {
  type: L10DrillType
  [key: string]: unknown
}

/**
 * Блок секции урока 10. Расширяет L1Block видом 'drill' — движок теории
 * (TheoryBlock) поддерживает интерактивы, а узкий L1Block из урока 1 — нет.
 */
type L10Block =
  | L1Block
  | { kind: 'drill'; drill: L10Drill }

/** Секция урока 10 (как L1Section, но с поддержкой drill-блоков). */
interface L10Section {
  num: string
  titleRu: string
  titleUk: string
  exampleCount?: number
  defaultOpen?: boolean
  blocks: L10Block[]
}

export const LESSON10_THEORY: { titleRu: string; titleUk: string; sections: L10Section[] } = {
  titleRu: 'Модальные глаголы',
  titleUk: 'Модальні дієслова',
  sections: [
    // ───────────────────────── 01 ─────────────────────────
    {
      num: '01',
      titleRu: 'Что ты тренируешь в этом уроке',
      titleUk: 'Що ти тренуєш у цьому уроці',
      defaultOpen: true,
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'В этом уроке ты учишься использовать модальные глаголы: can, must, should, may, might и оборот have to. Они стоят перед основным глаголом и показывают возможность, обязанность, совет или разрешение. Главное правило: после модального глагола идёт глагол без to (кроме have to).',
          uk: 'У цьому уроці ти вчишся використовувати модальні дієслова: can, must, should, may, might та зворот have to. Вони стоять перед основним дієсловом і показують можливість, обов’язок, пораду або дозвіл. Головне правило: після модального дієслова йде дієслово без to (крім have to).',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I can swim.', ru: 'Я умею плавать.', uk: 'Я вмію плавати.', hi: 'can' },
            { en: 'I must finish this.', ru: 'Я должен это закончить.', uk: 'Я мушу це закінчити.', hi: 'must' },
            { en: 'You should sleep more.', ru: 'Тебе следует больше спать.', uk: 'Тобі слід більше спати.', hi: 'should' },
            { en: 'May I come in?', ru: 'Можно мне войти?', uk: 'Можна мені увійти?', hi: 'May' },
          ],
        },
        {
          kind: 'tip',
          ru: 'После can, must, should, may, might всегда идёт глагол без to: I can swim (не I can to swim).',
          uk: 'Після can, must, should, may, might завжди йде дієслово без to: I can swim (не I can to swim).',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Все модальные глаголы урока',
      titleUk: 'Усі модальні дієслова уроку',
      defaultOpen: true,
      exampleCount: 8,
      blocks: [
        {
          kind: 'body',
          ru: 'Вот все глаголы и обороты этого урока с их значением. Запоминай не отдельное слово, а связку «модальный глагол + смысл».',
          uk: 'Ось усі дієслова й звороти цього уроку з їхнім значенням. Запам’ятовуй не окреме слово, а зв’язку «модальне дієслово + сенс».',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I can swim.', ru: 'can — уметь / мочь', uk: 'can — вміти / мати змогу', hi: 'can' },
            { en: "You can't park here.", ru: "can't — не уметь / нельзя", uk: "can't — не вміти / не можна", hi: "can't" },
            { en: 'I must finish this.', ru: 'must — должен (внутреннее)', uk: 'must — мусити (внутрішня потреба)', hi: 'must' },
            { en: "You mustn't smoke here.", ru: "mustn't — запрет", uk: "mustn't — заборона", hi: "mustn't" },
            { en: 'You should sleep more.', ru: 'should — следует / стоит', uk: 'should — слід / варто', hi: 'should' },
            { en: 'May I come in?', ru: 'may — можно (разрешение)', uk: 'may — можна (дозвіл)', hi: 'May' },
            { en: 'It might rain today.', ru: 'might — возможно (неуверенность)', uk: 'might — можливо (невпевненість)', hi: 'might' },
            { en: 'I have to work tomorrow.', ru: 'have to — должен (внешнее)', uk: 'have to — мусити (зовнішня необхідність)', hi: 'have to' },
          ],
        },
        {
          kind: 'tip',
          ru: 'must — это «должен» по внутреннему решению, а have to — «должен» из-за внешних правил или обстоятельств.',
          uk: 'must — це «мушу» за внутрішнім рішенням, а have to — «мушу» через зовнішні правила або обставини.',
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Can и can’t — умение и нельзя',
      titleUk: 'Can і can’t — вміння і не можна',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Can показывает умение или возможность: «умею», «могу». Отрицание can’t означает «не умею» или «нельзя». После can и can’t глагол идёт без to.',
          uk: 'Can показує вміння або можливість: «вмію», «можу». Заперечення can’t означає «не вмію» або «не можна». Після can і can’t дієслово йде без to.',
        },
        {
          kind: 'formula',
          formula: ['кто / что', 'can / can’t', 'глагол без to'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I can swim.', ru: 'Я умею плавать.', uk: 'Я вмію плавати.', hi: 'can' },
            { en: "You can't park here.", ru: 'Здесь нельзя парковаться.', uk: 'Тут не можна паркуватися.', hi: "can't" },
          ],
        },
        {
          kind: 'tip',
          ru: 'Can’t — это короткая форма от cannot. Она же передаёт смысл «нельзя» по правилу: You can’t park here.',
          uk: 'Can’t — це коротка форма від cannot. Вона ж передає сенс «не можна» за правилом: You can’t park here.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'I',
            after: 'swim',
            options: ['can', 'can to', 'cans'],
            answer: 'can',
            why: { ru: 'После can глагол идёт без to: I can swim.' },
          },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'Must и mustn’t — обязанность и запрет',
      titleUk: 'Must і mustn’t — обов’язок і заборона',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Must — сильное «должен», когда ты сам чувствуешь необходимость. Mustn’t — строгий запрет: «нельзя», «запрещено». После обоих идёт глагол без to.',
          uk: 'Must — сильне «мушу», коли ти сам відчуваєш необхідність. Mustn’t — сувора заборона: «не можна», «заборонено». Після обох іде дієслово без to.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I must finish this.', ru: 'Я должен это закончить.', uk: 'Я мушу це закінчити.', hi: 'must' },
            { en: "You mustn't smoke here.", ru: 'Здесь нельзя курить.', uk: 'Тут не можна курити.', hi: "mustn't" },
          ],
        },
        {
          kind: 'tip',
          ru: 'Mustn’t — это не «не обязан», а именно «нельзя». You mustn’t smoke here — здесь запрещено курить.',
          uk: 'Mustn’t — це не «не зобов’язаний», а саме «не можна». You mustn’t smoke here — тут заборонено курити.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно?' },
            optionA: 'I must to finish this',
            optionB: 'I must finish this',
            correct: 'B',
            explain: { ru: 'После must глагол идёт без to.' },
          },
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'Should — совет',
      titleUk: 'Should — порада',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'Should — это совет или рекомендация: «следует», «стоит». Это мягче, чем must: ты не обязан, но так будет лучше. После should идёт глагол без to.',
          uk: 'Should — це порада або рекомендація: «слід», «варто». Це м’якше, ніж must: ти не зобов’язаний, але так буде краще. Після should іде дієслово без to.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'You should sleep more.', ru: 'Тебе следует больше спать.', uk: 'Тобі слід більше спати.', hi: 'should' },
          ],
        },
      ],
    },

    // ───────────────────────── 06 ─────────────────────────
    {
      num: '06',
      titleRu: 'May и might — разрешение и возможность',
      titleUk: 'May і might — дозвіл і можливість',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'May означает «можно» — вежливое разрешение, часто в вопросе: May I come in? Might означает «возможно» — что-то неуверенное, что может случиться: It might rain today.',
          uk: 'May означає «можна» — ввічливий дозвіл, часто в питанні: May I come in? Might означає «можливо» — щось непевне, що може статися: It might rain today.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'May I come in?', ru: 'Можно мне войти?', uk: 'Можна мені увійти?', hi: 'May' },
            { en: 'It might rain today.', ru: 'Сегодня, возможно, пойдёт дождь.', uk: 'Сьогодні, можливо, піде дощ.', hi: 'might' },
          ],
        },
        {
          kind: 'tip',
          ru: 'May — про разрешение, might — про вероятность. May I come in? = «можно?». It might rain = «возможно, будет дождь».',
          uk: 'May — про дозвіл, might — про ймовірність. May I come in? = «можна?». It might rain = «можливо, буде дощ».',
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Можно мне войти?' },
            answer: ['May', 'I', 'come', 'in'],
            slotLabels: [{ ru: 'модальный' }, { ru: 'кто' }, { ru: 'глагол' }, { ru: 'куда' }],
            distractors: ['Might', 'to'],
          },
        },
      ],
    },

    // ───────────────────────── 07 ─────────────────────────
    {
      num: '07',
      titleRu: 'Have to — внешняя необходимость',
      titleUk: 'Have to — зовнішня необхідність',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'Have to — это «должен» из-за внешних причин: правил, работы, обстоятельств. В отличие от других модальных, здесь есть to, а после него глагол: I have to work.',
          uk: 'Have to — це «мушу» через зовнішні причини: правила, роботу, обставини. На відміну від інших модальних, тут є to, а після нього дієслово: I have to work.',
        },
        {
          kind: 'formula',
          formula: ['кто / что', 'have to', 'глагол'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I have to work tomorrow.', ru: 'Завтра мне нужно работать.', uk: 'Завтра мені треба працювати.', hi: 'have to' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Have to — единственный в этом уроке, где есть to. У остальных (can, must, should, may, might) to не нужно.',
          uk: 'Have to — єдиний у цьому уроці, де є to. У решти (can, must, should, may, might) to не потрібно.',
        },
      ],
    },

    // ───────────────────────── 08 ─────────────────────────
    {
      num: '08',
      titleRu: 'Самые частые ошибки',
      titleUk: 'Найчастіші помилки',
      blocks: [
        {
          kind: 'fix',
          fixes: [
            { wrong: 'I can to swim', right: 'I can swim' },
            { wrong: 'I must to finish this', right: 'I must finish this' },
            { wrong: 'You should to sleep more', right: 'You should sleep more' },
            { wrong: 'I have work tomorrow', right: 'I have to work tomorrow' },
          ],
        },
        {
          kind: 'tip',
          ru: 'После can, must, should глагол идёт без to. А вот в have to частица to обязательна.',
          uk: 'Після can, must, should дієслово йде без to. А ось у have to частка to обов’язкова.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'spot_slip',
            chips: ['You', 'should', 'to', 'sleep', 'more'],
            answerIndex: 2,
            hint: { ru: 'Тут лишнее слово. Тапни его.' },
            fix: { ru: 'После should глагол без to: You should sleep more.' },
          },
        },
      ],
    },

    // ───────────────────────── 09 ─────────────────────────
    {
      num: '09',
      titleRu: 'Что нужно вынести из урока',
      titleUk: 'Що треба винести з уроку',
      blocks: [
        {
          kind: 'body',
          ru: 'Модальные глаголы добавляют к действию смысл: can — умею/могу, can’t — нельзя, must — должен, mustn’t — запрещено, should — следует, may — можно, might — возможно, have to — нужно по обстоятельствам.',
          uk: 'Модальні дієслова додають до дії сенс: can — вмію/можу, can’t — не можна, must — мушу, mustn’t — заборонено, should — слід, may — можна, might — можливо, have to — треба за обставинами.',
        },
        {
          kind: 'tip',
          ru: 'Держи одну формулу: кто + модальный глагол + глагол без to. I can swim. You should sleep more. И отдельно: have to + глагол с to.',
          uk: 'Тримай одну формулу: хто + модальне дієслово + дієслово без to. I can swim. You should sleep more. І окремо: have to + дієслово з to.',
        },
      ],
    },
  ],
}
