// Theory content for Lesson 14 (Comparatives & Superlatives / Степени сравнения).
//
// This file is the structured data source for the TheoryLessonView engine.
// Content is transferred from the legacy lesson_help.tsx HINTS[14].render
// (Table components: short adjectives, long adjectives, irregulars) without any
// grammar changes — the comparison rules are verified against Cambridge/Oxford.
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk) variants.
// `hi` on an example highlights the comparative/superlative marker (-er / -est / more / most).
//
// Interfaces are reused from theory_content_lesson1 to avoid duplication.

import type { L1Block, L1Section } from './theory_content_lesson1'

export const LESSON14_THEORY: { titleRu: string; titleUk: string; sections: L1Section[] } = {
  titleRu: 'Степени сравнения',
  titleUk: 'Ступені порівняння',
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
          ru: 'В этом уроке ты учишься сравнивать. Есть три степени: обычная (old), сравнительная (older — старше) и превосходная (the oldest — самый старый). Форма зависит от длины прилагательного: короткие меняются окончанием, длинные — словами more / most.',
          uk: 'У цьому уроці ти вчишся порівнювати. Є три ступені: звичайний (old), вищий (older — старший) і найвищий (the oldest — найстаріший). Форма залежить від довжини прикметника: короткі змінюються закінченням, довгі — словами more / most.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'old', ru: 'старый — обычная форма', uk: 'старий — звичайна форма' },
            { en: 'older', ru: 'старше — сравнительная форма', uk: 'старший — вищий ступінь', hi: 'older' },
            { en: 'the oldest', ru: 'самый старый — превосходная форма', uk: 'найстаріший — найвищий ступінь', hi: 'the oldest' },
          ],
        },
        {
          kind: 'formula',
          formula: ['обычная', 'сравнительная (-er / more)', 'превосходная (the -est / the most)'],
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Короткие прилагательные: -er / -est',
      titleUk: 'Короткі прикметники: -er / -est',
      defaultOpen: true,
      exampleCount: 5,
      blocks: [
        {
          kind: 'body',
          ru: 'К коротким прилагательным (обычно 1 слог) добавляй -er для сравнения и the …-est для превосходной степени. Иногда меняется написание: big → bigger (двойная буква), easy → easier (y → i), hot → hotter (двойная буква).',
          uk: 'До коротких прикметників (зазвичай 1 склад) додавай -er для порівняння і the …-est для найвищого ступеня. Іноді змінюється написання: big → bigger (подвоєна літера), easy → easier (y → i), hot → hotter (подвоєна літера).',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'old → older → the oldest', ru: 'старый → старше → самый старый', uk: 'старий → старший → найстаріший', hi: 'older' },
            { en: 'tall → taller → the tallest', ru: 'высокий → выше → самый высокий', uk: 'високий → вищий → найвищий', hi: 'taller' },
            { en: 'big → bigger → the biggest', ru: 'большой → больше → самый большой', uk: 'великий → більший → найбільший', hi: 'bigger' },
            { en: 'easy → easier → the easiest', ru: 'лёгкий → легче → самый лёгкий', uk: 'легкий → легший → найлегший', hi: 'easier' },
            { en: 'hot → hotter → the hottest', ru: 'горячий → горячее → самый горячий', uk: 'гарячий → гарячіший → найгарячіший', hi: 'hotter' },
          ],
        },
        {
          kind: 'tip',
          ru: 'У короткой формы окончание -er (сравнение) или -est (превосходная). Перед превосходной почти всегда стоит the: the biggest, the tallest.',
          uk: 'У короткій формі закінчення -er (порівняння) або -est (найвищий). Перед найвищим майже завжди стоїть the: the biggest, the tallest.',
        },
        {
          kind: 'drill',
          drill: { type: 'choice', before: 'My brother is', after: 'than me', options: ['tall', 'taller', 'the tallest'], answer: 'taller', why: { ru: 'Сравниваем двух людей (than me) — нужна сравнительная форма taller.' } },
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Длинные прилагательные: more / the most',
      titleUk: 'Довгі прикметники: more / the most',
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'К длинным прилагательным (обычно 2 и более слогов) не добавляй -er / -est. Вместо этого ставь more перед словом для сравнения и the most — для превосходной степени.',
          uk: 'До довгих прикметників (зазвичай 2 і більше складів) не додавай -er / -est. Замість цього став more перед словом для порівняння і the most — для найвищого ступеня.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'beautiful → more beautiful → the most beautiful', ru: 'красивый → красивее → самый красивый', uk: 'гарний → гарніший → найгарніший', hi: 'more' },
            { en: 'expensive → more expensive → the most expensive', ru: 'дорогой → дороже → самый дорогой', uk: 'дорогий → дорожчий → найдорожчий', hi: 'more' },
            { en: 'interesting → more interesting → the most interesting', ru: 'интересный → интереснее → самый интересный', uk: 'цікавий → цікавіший → найцікавіший', hi: 'most' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Длинное слово само не меняется — работают слова-помощники: more (сравнение) и the most (превосходная).',
          uk: 'Довге слово саме не змінюється — працюють слова-помічники: more (порівняння) і the most (найвищий).',
        },
        {
          kind: 'drill',
          drill: { type: 'word_bank', prompt: { ru: 'Этот фильм интереснее' }, answer: ['This', 'film', 'is', 'more', 'interesting'], slotLabels: [{ ru: 'это' }, { ru: 'фильм' }, { ru: 'связка' }, { ru: 'помощник' }, { ru: 'описание' }], distractors: ['interestinger', 'most'] },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'Исключения: good, bad, far, much',
      titleUk: 'Винятки: good, bad, far, much',
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'Несколько важных слов образуют степени сравнения не по правилу. Их формы нужно просто запомнить.',
          uk: 'Кілька важливих слів утворюють ступені порівняння не за правилом. Їхні форми треба просто запам\'ятати.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'good → better → the best', ru: 'хороший → лучше → самый лучший', uk: 'хороший → кращий → найкращий', hi: 'better' },
            { en: 'bad → worse → the worst', ru: 'плохой → хуже → самый плохой', uk: 'поганий → гірший → найгірший', hi: 'worse' },
            { en: 'far → farther → the farthest', ru: 'далёкий → дальше → самый далёкий', uk: 'далекий → дальший → найдальший', hi: 'farther' },
            { en: 'much → more → the most', ru: 'много → больше → больше всего', uk: 'багато → більше → найбільше', hi: 'more' },
          ],
        },
        {
          kind: 'fix',
          fixes: [
            { wrong: 'gooder', right: 'better' },
            { wrong: 'the goodest', right: 'the best' },
            { wrong: 'badder', right: 'worse' },
          ],
        },
        {
          kind: 'drill',
          drill: { type: 'binary', question: { ru: 'Где верно?' }, optionA: 'This is gooder', optionB: 'This is better', correct: 'B', explain: { ru: 'good — исключение: сравнительная форма better, а не gooder.' } },
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
            { wrong: 'more tall', right: 'taller' },
            { wrong: 'beautifuler', right: 'more beautiful' },
            { wrong: 'the most tallest', right: 'the tallest' },
            { wrong: 'more better', right: 'better' },
            { wrong: 'biger', right: 'bigger' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Не смешивай два способа сразу: либо -er, либо more — но не оба. more tall → taller. more better → better. И не удваивай превосходную: the most tallest → the tallest.',
          uk: 'Не змішуй два способи одразу: або -er, або more — але не обидва. more tall → taller. more better → better. І не подвоюй найвищий: the most tallest → the tallest.',
        },
        {
          kind: 'drill',
          drill: { type: 'spot_slip', chips: ['She', 'is', 'more', 'taller'], answerIndex: 2, hint: { ru: 'Тут лишнее слово. Тапни его.' }, fix: { ru: 'Короткое слово берёт -er само: She is taller. Слово more тут не нужно.' } },
        },
      ],
    },
  ],
}
