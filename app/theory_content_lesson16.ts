// Theory content for Lesson 16 (Phrasal verbs).
//
// Structured data source for the TheoryLessonView engine.
// Content is transferred verbatim from the legacy lesson_help.tsx HINTS[16].render
// (a single Table of phrasal verbs: verb / meaning / example) without any grammar
// changes. The content is split into meaningful sections and a few interactive
// drills are added, drawn only from the phrases in this lesson.
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk) variants.
// `hi` on an example is the phrasal verb to highlight in the phrase.

import type { L1Block, L1Section } from './theory_content_lesson1';

export const LESSON16_THEORY: {
  titleRu: string;
  titleUk: string;
  titleEs: string;
  sections: L1Section[];
} = {
  titleRu: 'Фразовые глаголы',
  titleUk: 'Фразові дієслова',
  titleEs: 'Verbos frasales',
  sections: [
    // ───────────────────────── 01 ─────────────────────────
    {
      num: '01',
      titleRu: 'Что такое фразовый глагол',
      titleUk: 'Що таке фразове дієслово',
      titleEs: 'Qué es un verbo frasal',
      defaultOpen: true,
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'Фразовый глагол — это глагол плюс маленькое слово (up, on, off, for, out, back). Вместе они получают новое значение, которое не всегда складывается из отдельных слов. Например, get up — это не «получить вверх», а «вставать».',
          uk: 'Фразове дієслово — це дієслово плюс маленьке слово (up, on, off, for, out, back). Разом вони отримують нове значення, яке не завжди складається з окремих слів. Наприклад, get up — це не «отримати вгору», а «вставати».',
          es: 'Un verbo frasal es un verbo más una palabra pequeña (up, on, off, for, out, back). Juntos adquieren un significado nuevo que no siempre se deduce de las palabras por separado. Por ejemplo, get up no significa "conseguir arriba", sino "levantarse".',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I get up at 7.', ru: 'Я встаю в 7.', uk: 'Я встаю о 7.', es: 'Me levanto a las 7.', hi: 'get up' },
            { en: 'Turn on the light.', ru: 'Включи свет.', uk: 'Увімкни світло.', es: 'Enciende la luz.', hi: 'turn on' },
            { en: "Don't give up!", ru: 'Не сдавайся!', uk: 'Не здавайся!', es: '¡No te rindas!', hi: 'give up' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Запоминай фразовый глагол целиком, как одно слово: get up = «вставать», а не «get» + «up» по отдельности.',
          uk: 'Запам\'ятовуй фразове дієслово цілком, як одне слово: get up = «вставати», а не «get» + «up» окремо.',
          es: 'Memoriza el verbo frasal completo, como si fuera una sola palabra: get up = "levantarse", no "get" + "up" por separado.',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Распорядок дня: get up, come back',
      titleUk: 'Розпорядок дня: get up, come back',
      titleEs: 'La rutina diaria: get up, come back',
      defaultOpen: true,
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Эти фразовые глаголы описывают движение и режим дня. get up — «вставать» (с постели). come back — «возвращаться».',
          uk: 'Ці фразові дієслова описують рух і режим дня. get up — «вставати» (з ліжка). come back — «повертатися».',
          es: 'Estos verbos frasales describen movimiento y la rutina del día. get up es "levantarse" (de la cama). come back es "regresar".',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I get up at 7.', ru: 'вставать — Я встаю в 7.', uk: 'вставати — Я встаю о 7.', es: 'levantarse — Me levanto a las 7.', hi: 'get up' },
            { en: 'Come back soon.', ru: 'возвращаться — Возвращайся скорее.', uk: 'повертатися — Повертайся скоріше.', es: 'regresar — Regresa pronto.', hi: 'come back' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Как сказать «вставать»?', es: '¿Cómo se dice "levantarse"?' },
            optionA: 'get up',
            optionB: 'come back',
            correct: 'A',
            explain: { ru: 'get up — «вставать» (с постели). come back — «возвращаться».', es: 'get up es "levantarse" (de la cama). come back es "regresar".' },
          },
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Включить и выключить: turn on / turn off',
      titleUk: 'Увімкнути та вимкнути: turn on / turn off',
      titleEs: 'Encender y apagar: turn on / turn off',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Пара противоположных глаголов для техники и света. turn on — «включать». turn off — «выключать».',
          uk: 'Пара протилежних дієслів для техніки та світла. turn on — «вмикати». turn off — «вимикати».',
          es: 'Un par de verbos opuestos para aparatos y la luz. turn on es "encender". turn off es "apagar".',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Turn on the light.', ru: 'включать — Включи свет.', uk: 'вмикати — Увімкни світло.', es: 'encender — Enciende la luz.', hi: 'turn on' },
            { en: 'Turn off the TV.', ru: 'выключать — Выключи телевизор.', uk: 'вимикати — Вимкни телевізор.', es: 'apagar — Apaga la tele.', hi: 'turn off' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Выключи телевизор.', es: 'Apaga la tele.' },
            answer: ['Turn', 'off', 'the', 'TV'],
            slotLabels: [{ ru: 'глагол', es: 'verbo' }, { ru: 'частица', es: 'partícula' }, { ru: 'арт.', es: 'art.' }, { ru: 'предмет', es: 'objeto' }],
            distractors: ['on', 'light'],
          },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'Одеваться: put on / take off',
      titleUk: 'Одягатися: put on / take off',
      titleEs: 'Vestirse: put on / take off',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Эти глаголы про одежду. put on — «надевать». take off — «снимать» (а ещё «взлетать» про самолёт).',
          uk: 'Ці дієслова про одяг. put on — «одягати». take off — «знімати» (а ще «злітати» про літак).',
          es: 'Estos verbos son sobre la ropa. put on es "ponerse" (algo de ropa). take off es "quitarse" (y también "despegar", de un avión).',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Put on your coat.', ru: 'надевать — Надень пальто.', uk: 'одягати — Одягни пальто.', es: 'ponerse — Ponte el abrigo.', hi: 'put on' },
            { en: 'Take off your shoes.', ru: 'снимать / взлетать — Сними обувь.', uk: 'знімати / злітати — Зніми взуття.', es: 'quitarse / despegar — Quítate los zapatos.', hi: 'take off' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Как сказать «надень пальто»?', es: '¿Cómo se dice "ponte el abrigo"?' },
            optionA: 'Take off your coat.',
            optionB: 'Put on your coat.',
            correct: 'B',
            explain: { ru: 'put on — «надевать». take off — «снимать».', es: 'put on es "ponerse". take off es "quitarse".' },
          },
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'Искать и узнавать: look for / find out',
      titleUk: 'Шукати та дізнаватися: look for / find out',
      titleEs: 'Buscar y averiguar: look for / find out',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'look for — «искать» (что-то потерянное или нужное). find out — «узнать», «выяснить» (получить информацию).',
          uk: 'look for — «шукати» (щось загублене чи потрібне). find out — «дізнатися», «з\'ясувати» (отримати інформацію).',
          es: 'look for es "buscar" (algo perdido o necesario). find out es "averiguar", "enterarse" (conseguir información).',
        },
        {
          kind: 'examples',
          examples: [
            { en: "I'm looking for my keys.", ru: 'искать — Я ищу свои ключи.', uk: 'шукати — Я шукаю свої ключі.', es: 'buscar — Estoy buscando mis llaves.', hi: 'looking for' },
            { en: 'I found out the truth.', ru: 'узнать — Я узнал правду.', uk: 'дізнатися — Я дізнався правду.', es: 'averiguar — Averigüé la verdad.', hi: 'found out' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: "I'm",
            after: 'my keys',
            options: ['looking for', 'finding out', 'turning on'],
            answer: 'looking for',
            why: { ru: 'look for — «искать». Поэтому: I\'m looking for my keys.', es: 'look for es "buscar". Por eso: I\'m looking for my keys.' },
          },
        },
      ],
    },

    // ───────────────────────── 06 ─────────────────────────
    {
      num: '06',
      titleRu: 'Не сдавайся: give up / go on',
      titleUk: 'Не здавайся: give up / go on',
      titleEs: 'No te rindas: give up / go on',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'give up — «бросать», «сдаваться» (перестать пытаться). go on — «продолжать» (не останавливаться).',
          uk: 'give up — «кидати», «здаватись» (перестати намагатися). go on — «продовжувати» (не зупинятися).',
          es: 'give up es "abandonar", "rendirse" (dejar de intentarlo). go on es "continuar" (no detenerse).',
        },
        {
          kind: 'examples',
          examples: [
            { en: "Don't give up!", ru: 'бросать / сдаться — Не сдавайся!', uk: 'кидати / здаватись — Не здавайся!', es: 'rendirse — ¡No te rindas!', hi: 'give up' },
            { en: 'Go on, please.', ru: 'продолжать — Продолжай, пожалуйста.', uk: 'продовжувати — Продовжуй, будь ласка.', es: 'continuar — Continúa, por favor.', hi: 'go on' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где значение «продолжать»?', es: '¿Dónde está el significado de "continuar"?' },
            optionA: 'go on',
            optionB: 'give up',
            correct: 'A',
            explain: { ru: 'go on — «продолжать». give up — «сдаваться».', es: 'go on es "continuar". give up es "rendirse".' },
          },
        },
      ],
    },

    // ───────────────────────── 07 ─────────────────────────
    {
      num: '07',
      titleRu: 'Все глаголы вместе',
      titleUk: 'Усі дієслова разом',
      titleEs: 'Todos los verbos juntos',
      exampleCount: 10,
      blocks: [
        {
          kind: 'body',
          ru: 'Полный список фразовых глаголов этого урока. Учи их парами и блоками — так легче запомнить.',
          uk: 'Повний список фразових дієслів цього уроку. Вивчай їх парами та блоками — так легше запам\'ятати.',
          es: 'Lista completa de los verbos frasales de esta lección. Apréndelos en pares y bloques: así es más fácil recordarlos.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I get up at 7.', ru: 'get up — вставать', uk: 'get up — вставати', es: 'get up — levantarse', hi: 'get up' },
            { en: 'Turn on the light.', ru: 'turn on — включать', uk: 'turn on — вмикати', es: 'turn on — encender', hi: 'turn on' },
            { en: 'Turn off the TV.', ru: 'turn off — выключать', uk: 'turn off — вимикати', es: 'turn off — apagar', hi: 'turn off' },
            { en: "I'm looking for my keys.", ru: 'look for — искать', uk: 'look for — шукати', es: 'look for — buscar', hi: 'looking for' },
            { en: "Don't give up!", ru: 'give up — бросать / сдаться', uk: 'give up — кидати / здаватись', es: 'give up — abandonar / rendirse', hi: 'give up' },
            { en: 'I found out the truth.', ru: 'find out — узнать', uk: 'find out — дізнатися', es: 'find out — averiguar', hi: 'found out' },
            { en: 'Come back soon.', ru: 'come back — возвращаться', uk: 'come back — повертатися', es: 'come back — regresar', hi: 'come back' },
            { en: 'Put on your coat.', ru: 'put on — надевать', uk: 'put on — одягати', es: 'put on — ponerse', hi: 'put on' },
            { en: 'Take off your shoes.', ru: 'take off — снимать / взлетать', uk: 'take off — знімати / злітати', es: 'take off — quitarse / despegar', hi: 'take off' },
            { en: 'Go on, please.', ru: 'go on — продолжать', uk: 'go on — продовжувати', es: 'go on — continuar', hi: 'go on' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Маленькое слово после глагола (up, on, off, for, out, back) — часть глагола, не теряй его: give up, а не просто give.',
          uk: 'Маленьке слово після дієслова (up, on, off, for, out, back) — частина дієслова, не губи його: give up, а не просто give.',
          es: 'La palabra pequeña después del verbo (up, on, off, for, out, back) es parte del verbo, no la pierdas: give up, no simplemente give.',
        },
      ],
    },
  ],
};
