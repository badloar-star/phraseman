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

export const LESSON14_THEORY: { titleRu: string; titleUk: string; titleEs: string; sections: L1Section[] } = {
  titleRu: 'Степени сравнения',
  titleUk: 'Ступені порівняння',
  titleEs: 'Grados de comparación',
  sections: [
    // ───────────────────────── 01 ─────────────────────────
    {
      num: '01',
      titleRu: 'Что ты тренируешь в этом уроке',
      titleUk: 'Що ти тренуєш у цьому уроці',
      titleEs: 'Qué vas a practicar en esta lección',
      defaultOpen: true,
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'В этом уроке ты учишься сравнивать. Есть три степени: обычная (old), сравнительная (older — старше) и превосходная (the oldest — самый старый). Форма зависит от длины прилагательного: короткие меняются окончанием, длинные — словами more / most.',
          uk: 'У цьому уроці ти вчишся порівнювати. Є три ступені: звичайний (old), вищий (older — старший) і найвищий (the oldest — найстаріший). Форма залежить від довжини прикметника: короткі змінюються закінченням, довгі — словами more / most.',
          es: 'En esta lección aprendes a comparar. Hay tres grados: normal (old), comparativo (older — más viejo) y superlativo (the oldest — el más viejo). La forma depende de la longitud del adjetivo: los cortos cambian con una terminación, los largos usan more / most.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'old', ru: 'старый — обычная форма', uk: 'старий — звичайна форма', es: 'viejo — forma normal' },
            { en: 'older', ru: 'старше — сравнительная форма', uk: 'старший — вищий ступінь', es: 'más viejo — forma comparativa', hi: 'older' },
            { en: 'the oldest', ru: 'самый старый — превосходная форма', uk: 'найстаріший — найвищий ступінь', es: 'el más viejo — forma superlativa', hi: 'the oldest' },
          ],
        },
        {
          kind: 'formula',
          formula: ['обычная', 'сравнительная (-er / more)', 'превосходная (the -est / the most)'],
          formulaEs: ['normal', 'comparativo (-er / more)', 'superlativo (the -est / the most)'],
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Короткие прилагательные: -er / -est',
      titleUk: 'Короткі прикметники: -er / -est',
      titleEs: 'Adjetivos cortos: -er / -est',
      defaultOpen: true,
      exampleCount: 5,
      blocks: [
        {
          kind: 'body',
          ru: 'К коротким прилагательным (обычно 1 слог) добавляй -er для сравнения и the …-est для превосходной степени. Иногда меняется написание: big → bigger (двойная буква), easy → easier (y → i), hot → hotter (двойная буква).',
          uk: 'До коротких прикметників (зазвичай 1 склад) додавай -er для порівняння і the …-est для найвищого ступеня. Іноді змінюється написання: big → bigger (подвоєна літера), easy → easier (y → i), hot → hotter (подвоєна літера).',
          es: 'A los adjetivos cortos (normalmente 1 sílaba) añádeles -er para comparar y the …-est para el superlativo. A veces cambia la ortografía: big → bigger (letra doble), easy → easier (y → i), hot → hotter (letra doble).',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'old → older → the oldest', ru: 'старый → старше → самый старый', uk: 'старий → старший → найстаріший', es: 'viejo → más viejo → el más viejo', hi: 'older' },
            { en: 'tall → taller → the tallest', ru: 'высокий → выше → самый высокий', uk: 'високий → вищий → найвищий', es: 'alto → más alto → el más alto', hi: 'taller' },
            { en: 'big → bigger → the biggest', ru: 'большой → больше → самый большой', uk: 'великий → більший → найбільший', es: 'grande → más grande → el más grande', hi: 'bigger' },
            { en: 'easy → easier → the easiest', ru: 'лёгкий → легче → самый лёгкий', uk: 'легкий → легший → найлегший', es: 'fácil → más fácil → el más fácil', hi: 'easier' },
            { en: 'hot → hotter → the hottest', ru: 'горячий → горячее → самый горячий', uk: 'гарячий → гарячіший → найгарячіший', es: 'caliente → más caliente → el más caliente', hi: 'hotter' },
          ],
        },
        {
          kind: 'tip',
          ru: 'У короткой формы окончание -er (сравнение) или -est (превосходная). Перед превосходной почти всегда стоит the: the biggest, the tallest.',
          uk: 'У короткій формі закінчення -er (порівняння) або -est (найвищий). Перед найвищим майже завжди стоїть the: the biggest, the tallest.',
          es: 'La forma corta lleva la terminación -er (comparativo) o -est (superlativo). Antes del superlativo casi siempre va the: the biggest, the tallest.',
        },
        {
          kind: 'drill',
          drill: { type: 'choice', before: 'My brother is', after: 'than me', options: ['tall', 'taller', 'the tallest'], answer: 'taller', why: { ru: 'Сравниваем двух людей (than me) — нужна сравнительная форма taller.', es: 'Estamos comparando a dos personas (than me) — hace falta la forma comparativa taller.' } },
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Длинные прилагательные: more / the most',
      titleUk: 'Довгі прикметники: more / the most',
      titleEs: 'Adjetivos largos: more / the most',
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'К длинным прилагательным (обычно 2 и более слогов) не добавляй -er / -est. Вместо этого ставь more перед словом для сравнения и the most — для превосходной степени.',
          uk: 'До довгих прикметників (зазвичай 2 і більше складів) не додавай -er / -est. Замість цього став more перед словом для порівняння і the most — для найвищого ступеня.',
          es: 'A los adjetivos largos (normalmente de 2 o más sílabas) no les añadas -er / -est. En su lugar, pon more delante de la palabra para comparar y the most para el superlativo.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'beautiful → more beautiful → the most beautiful', ru: 'красивый → красивее → самый красивый', uk: 'гарний → гарніший → найгарніший', es: 'bonito → más bonito → el más bonito', hi: 'more' },
            { en: 'expensive → more expensive → the most expensive', ru: 'дорогой → дороже → самый дорогой', uk: 'дорогий → дорожчий → найдорожчий', es: 'caro → más caro → el más caro', hi: 'more' },
            { en: 'interesting → more interesting → the most interesting', ru: 'интересный → интереснее → самый интересный', uk: 'цікавий → цікавіший → найцікавіший', es: 'interesante → más interesante → el más interesante', hi: 'most' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Длинное слово само не меняется — работают слова-помощники: more (сравнение) и the most (превосходная).',
          uk: 'Довге слово саме не змінюється — працюють слова-помічники: more (порівняння) і the most (найвищий).',
          es: 'La palabra larga no cambia por sí misma — funcionan las palabras auxiliares: more (comparativo) y the most (superlativo).',
        },
        {
          kind: 'drill',
          drill: { type: 'word_bank', prompt: { ru: 'Этот фильм интереснее', es: 'Esta película es más interesante' }, answer: ['This', 'film', 'is', 'more', 'interesting'], slotLabels: [{ ru: 'это', es: 'esto' }, { ru: 'фильм', es: 'película' }, { ru: 'связка', es: 'enlace' }, { ru: 'помощник', es: 'auxiliar' }, { ru: 'описание', es: 'descripción' }], distractors: ['interestinger', 'most'] },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'Исключения: good, bad, far, much',
      titleUk: 'Винятки: good, bad, far, much',
      titleEs: 'Excepciones: good, bad, far, much',
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'Несколько важных слов образуют степени сравнения не по правилу. Их формы нужно просто запомнить.',
          uk: 'Кілька важливих слів утворюють ступені порівняння не за правилом. Їхні форми треба просто запам\'ятати.',
          es: 'Algunas palabras importantes forman los grados de comparación fuera de la regla. Sus formas hay que memorizarlas tal cual.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'good → better → the best', ru: 'хороший → лучше → самый лучший', uk: 'хороший → кращий → найкращий', es: 'bueno → mejor → el mejor', hi: 'better' },
            { en: 'bad → worse → the worst', ru: 'плохой → хуже → самый плохой', uk: 'поганий → гірший → найгірший', es: 'malo → peor → el peor', hi: 'worse' },
            { en: 'far → farther → the farthest', ru: 'далёкий → дальше → самый далёкий', uk: 'далекий → дальший → найдальший', es: 'lejano → más lejos → el más lejos', hi: 'farther' },
            { en: 'much → more → the most', ru: 'много → больше → больше всего', uk: 'багато → більше → найбільше', es: 'mucho → más → lo más', hi: 'more' },
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
          drill: { type: 'binary', question: { ru: 'Где верно?', es: '¿Cuál es correcta?' }, optionA: 'This is gooder', optionB: 'This is better', correct: 'B', explain: { ru: 'good — исключение: сравнительная форма better, а не gooder.', es: 'good es una excepción: la forma comparativa es better, no gooder.' } },
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'Самые частые ошибки',
      titleUk: 'Найчастіші помилки',
      titleEs: 'Los errores más frecuentes',
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
          es: 'No mezcles los dos métodos a la vez: o -er, o more, pero no ambos. more tall → taller. more better → better. Y no dupliques el superlativo: the most tallest → the tallest.',
        },
        {
          kind: 'drill',
          drill: { type: 'spot_slip', chips: ['She', 'is', 'more', 'taller'], answerIndex: 2, hint: { ru: 'Тут лишнее слово. Тапни его.', es: 'Aquí sobra una palabra. Tócala.' }, fix: { ru: 'Короткое слово берёт -er само: She is taller. Слово more тут не нужно.', es: 'La palabra corta toma -er por sí sola: She is taller. Aquí no hace falta more.' } },
        },
      ],
    },
  ],
}
