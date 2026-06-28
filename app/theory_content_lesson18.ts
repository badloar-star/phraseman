// Theory content for Lesson 18 (Imperative mood: commands, requests, Let's).
//
// Structured data source for the TheoryLessonView engine. Content transferred
// from the legacy lesson_help.tsx HINTS[18].render (a single imperative-forms
// table) and expanded into meaningful sections. Grammar is verified against
// Cambridge/Oxford usage of the English imperative.
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk).
// `hi` on an example is the imperative marker to highlight in the phrase
// (Don't / Let's / Please / the base verb).

import type { L1Block } from './theory_content_lesson1'

/** Тип одного интерактива (как в движке теории). */
type L18DrillType = 'choice' | 'word_bank' | 'spot_slip' | 'binary'

/** Готовый интерактив теории. Структура повторяет TheoryDrill движка. */
interface L18Drill {
  type: L18DrillType
  [key: string]: unknown
}

/**
 * Блок секции урока 18. Расширяет L1Block видом 'drill' — движок теории
 * (TheoryBlock) поддерживает интерактивы, а узкий L1Block из урока 1 — нет.
 */
type L18Block =
  | L1Block
  | { kind: 'drill'; drill: L18Drill }

/** Секция урока 18 (как L1Section, но с поддержкой drill-блоков). */
interface L18Section {
  num: string
  titleRu: string
  titleUk: string
  exampleCount?: number
  defaultOpen?: boolean
  blocks: L18Block[]
}

export const LESSON18_THEORY: { titleRu: string; titleUk: string; sections: L18Section[] } = {
  titleRu: 'Повелительное наклонение',
  titleUk: 'Наказовий спосіб',
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
          ru: 'В этом уроке ты учишься давать команды, просьбы и предложения: «Иди сюда», «Открой дверь», «Не беги», «Давай начнём». Это повелительное наклонение. Главное, что нужно запомнить: для команды бери глагол в основной форме без подлежащего — просто Come here! или Open the door!',
          uk: 'У цьому уроці ти вчишся давати команди, прохання та пропозиції: «Іди сюди», «Відчини двері», «Не біжи», «Давай почнемо». Це наказовий спосіб. Головне, що треба запам’ятати: для команди бери дієслово в основній формі без підмета — просто Come here! або Open the door!',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Come here!', ru: 'Иди сюда!', uk: 'Іди сюди!', hi: 'Come' },
            { en: "Don't run!", ru: 'Не беги!', uk: 'Не біжи!', hi: "Don't" },
            { en: "Let's go!", ru: 'Давай пойдём!', uk: 'Давай підемо!', hi: "Let's" },
            { en: 'Please sit down.', ru: 'Пожалуйста, садись.', uk: 'Будь ласка, сідай.', hi: 'Please' },
          ],
        },
        {
          kind: 'tip',
          ru: 'В команде нет «я» или «ты» в начале: подлежащее не нужно. Просто глагол: Open the door!',
          uk: 'У команді немає «я» чи «ти» на початку: підмет не потрібен. Просто дієслово: Open the door!',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Все формы повеления',
      titleUk: 'Усі форми наказу',
      defaultOpen: true,
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'Вот все формы этого урока. Запоминай не отдельное слово, а связку «форма + как она строится».',
          uk: 'Ось усі форми цього уроку. Запам’ятовуй не окреме слово, а зв’язку «форма + як вона будується».',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Come here! Open the door!', ru: 'Команда (+): глагол в основной форме', uk: 'Наказ (+): дієслово в основній формі', hi: 'Come' },
            { en: "Don't run! Don't be late!", ru: "Команда (−): Don't + глагол", uk: "Наказ (−): Don't + дієслово", hi: "Don't" },
            { en: "Let's go! Let's start.", ru: "Let's + глагол — предложение что-то сделать вместе", uk: "Let's + дієслово — пропозиція зробити щось разом", hi: "Let's" },
            { en: 'Please sit down.', ru: 'Please + глагол — вежливая просьба', uk: 'Please + дієслово — ввічливе прохання', hi: 'Please' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Команда без to и без подлежащего: Come here (не To come, не You come). Отрицание всегда через Don’t.',
          uk: 'Команда без to і без підмета: Come here (не To come, не You come). Заперечення завжди через Don’t.',
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Команда (+): просто глагол',
      titleUk: 'Наказ (+): просто дієслово',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Чтобы дать команду, возьми глагол в основной форме и поставь его в начало. Подлежащее не нужно — собеседник и так понимает, что речь о нём.',
          uk: 'Щоб дати команду, візьми дієслово в основній формі і постав його на початок. Підмет не потрібен — співрозмовник і так розуміє, що йдеться про нього.',
        },
        {
          kind: 'formula',
          formula: ['глагол (основная форма)', '+ остальное'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Come here!', ru: 'Иди сюда!', uk: 'Іди сюди!', hi: 'Come' },
            { en: 'Open the door!', ru: 'Открой дверь!', uk: 'Відчини двері!', hi: 'Open' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно?' },
            optionA: 'You open the door!',
            optionB: 'Open the door!',
            correct: 'B',
            explain: { ru: 'В команде подлежащее не нужно: просто Open the door!' },
          },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'Команда (−): Don’t + глагол',
      titleUk: 'Наказ (−): Don’t + дієслово',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Чтобы запретить или попросить не делать что-то, ставь Don’t перед глаголом: Don’t run! Don’t be late! Это работает для любого глагола, даже для be.',
          uk: 'Щоб заборонити або попросити чогось не робити, став Don’t перед дієсловом: Don’t run! Don’t be late! Це працює для будь-якого дієслова, навіть для be.',
        },
        {
          kind: 'formula',
          formula: ["Don't", 'глагол (основная форма)', '+ остальное'],
        },
        {
          kind: 'examples',
          examples: [
            { en: "Don't run!", ru: 'Не беги!', uk: 'Не біжи!', hi: "Don't" },
            { en: "Don't be late!", ru: 'Не опаздывай!', uk: 'Не запізнюйся!', hi: "Don't" },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: '',
            after: 'run!',
            options: ["Don't", 'No', 'Not'],
            answer: "Don't",
            why: { ru: 'Отрицательная команда строится через Don’t + глагол: Don’t run!' },
          },
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'Let’s — предложить сделать вместе',
      titleUk: 'Let’s — запропонувати зробити разом',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Let’s — это «давай(те)»: ты предлагаешь сделать что-то вместе. После Let’s идёт глагол в основной форме: Let’s go! Let’s start.',
          uk: 'Let’s — це «давай(те)»: ти пропонуєш зробити щось разом. Після Let’s іде дієслово в основній формі: Let’s go! Let’s start.',
        },
        {
          kind: 'formula',
          formula: ["Let's", 'глагол (основная форма)', '+ остальное'],
        },
        {
          kind: 'examples',
          examples: [
            { en: "Let's go!", ru: 'Давай пойдём!', uk: 'Давай підемо!', hi: "Let's" },
            { en: "Let's start.", ru: 'Давай начнём.', uk: 'Давай почнемо.', hi: "Let's" },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Давай начнём.' },
            answer: ["Let's", 'start'],
            slotLabels: [{ ru: 'давай' }, { ru: 'глагол' }],
            distractors: ['to', 'we'],
          },
        },
      ],
    },

    // ───────────────────────── 06 ─────────────────────────
    {
      num: '06',
      titleRu: 'Please — вежливая просьба',
      titleUk: 'Please — ввічливе прохання',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'Чтобы команда звучала мягко и вежливо, добавь Please. Чаще всего его ставят в начало: Please sit down. Можно и в конец: Sit down, please.',
          uk: 'Щоб команда звучала м’яко і ввічливо, додай Please. Найчастіше його ставлять на початок: Please sit down. Можна і в кінець: Sit down, please.',
        },
        {
          kind: 'formula',
          formula: ['Please', 'глагол (основная форма)', '+ остальное'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Please sit down.', ru: 'Пожалуйста, садись.', uk: 'Будь ласка, сідай.', hi: 'Please' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Please превращает приказ в просьбу. Sit down! звучит как команда, а Please sit down — как вежливое приглашение.',
          uk: 'Please перетворює наказ на прохання. Sit down! звучить як команда, а Please sit down — як ввічливе запрошення.',
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
            { wrong: 'You come here!', right: 'Come here!' },
            { wrong: 'To open the door!', right: 'Open the door!' },
            { wrong: 'No run!', right: "Don't run!" },
            { wrong: "Let's to go!", right: "Let's go!" },
          ],
        },
        {
          kind: 'tip',
          ru: 'В команде нет подлежащего и нет to. Отрицание — только через Don’t. После Let’s глагол идёт без to.',
          uk: 'У команді немає підмета і немає to. Заперечення — тільки через Don’t. Після Let’s дієслово йде без to.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'spot_slip',
            chips: ["Let's", 'to', 'go'],
            answerIndex: 1,
            hint: { ru: 'Тут лишнее слово. Тапни его.' },
            fix: { ru: 'После Let’s глагол без to: Let’s go!' },
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
          ru: 'Повеление строится без подлежащего: команда (+) — просто глагол (Come here!), команда (−) — Don’t + глагол (Don’t run!), предложение вместе — Let’s + глагол (Let’s go!), вежливо — Please + глагол (Please sit down).',
          uk: 'Наказ будується без підмета: наказ (+) — просто дієслово (Come here!), наказ (−) — Don’t + дієслово (Don’t run!), пропозиція разом — Let’s + дієслово (Let’s go!), ввічливо — Please + дієслово (Please sit down).',
        },
        {
          kind: 'tip',
          ru: 'Держи одну схему: глагол в начале, без подлежащего и без to. А Don’t, Let’s и Please просто добавляются перед ним.',
          uk: 'Тримай одну схему: дієслово на початку, без підмета і без to. А Don’t, Let’s і Please просто додаються перед ним.',
        },
      ],
    },
  ],
}
