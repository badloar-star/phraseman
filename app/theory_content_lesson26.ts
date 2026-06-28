// Theory content for Lesson 26 (Conditional sentences: zero / first / second / third).
//
// Structured data source for the TheoryLessonView engine. Content transferred
// from the legacy lesson_help.tsx HINTS[26].render (a single conditionals table)
// and expanded into meaningful sections. Grammar is verified against
// Cambridge/Oxford usage of English conditionals (zero, first, second, third).
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk).
// `hi` on an example is the conditional marker (if / will / would / would have…)
// to highlight in the phrase.

import type { L1Block, L1Section } from './theory_content_lesson1'

/** Тип одного интерактива (как в движке теории). */
type L26DrillType = 'choice' | 'word_bank' | 'spot_slip' | 'binary'

/** Готовый интерактив теории. Структура повторяет TheoryDrill движка. */
interface L26Drill {
  type: L26DrillType
  [key: string]: unknown
}

/**
 * Блок секции урока 26. Расширяет L1Block видом 'drill' — движок теории
 * (TheoryBlock) поддерживает интерактивы, а узкий L1Block из урока 1 — нет.
 */
type L26Block =
  | L1Block
  | { kind: 'drill'; drill: L26Drill }

/** Секция урока 26 (как L1Section, но с поддержкой drill-блоков). */
interface L26Section extends Omit<L1Section, 'blocks'> {
  blocks: L26Block[]
}

export const LESSON26_THEORY: { titleRu: string; titleUk: string; sections: L26Section[] } = {
  titleRu: 'Условные предложения',
  titleUk: 'Умовні речення',
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
          ru: 'В этом уроке ты учишься строить условные предложения — фразы с if («если»). Они состоят из двух частей: условие (if-часть) и результат. Бывают четыре типа: нулевой (факт), первый (реальное будущее), второй (нереальное настоящее) и третий (нереальное прошлое). Главное — правильно подобрать время в каждой части.',
          uk: 'У цьому уроці ти вчишся будувати умовні речення — фрази з if («якщо»). Вони складаються з двох частин: умова (if-частина) і результат. Бувають чотири типи: нульовий (факт), перший (реальне майбутнє), другий (нереальне теперішнє) і третій (нереальне минуле). Головне — правильно підібрати час у кожній частині.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'If you heat water, it boils.', ru: 'Если нагреть воду, она кипит. (тип 0 — факт)', uk: 'Якщо нагріти воду, вона кипить. (тип 0 — факт)', hi: 'If' },
            { en: 'If it rains, I will stay home.', ru: 'Если пойдёт дождь, я останусь дома. (тип 1 — реальное)', uk: 'Якщо піде дощ, я залишуся вдома. (тип 1 — реальне)', hi: 'will' },
            { en: "If I had money, I'd travel.", ru: 'Если бы у меня были деньги, я бы путешествовал. (тип 2 — нереальное)', uk: 'Якби в мене були гроші, я б подорожував. (тип 2 — нереальне)', hi: 'would' },
            { en: 'If she had studied, she would have passed.', ru: 'Если бы она училась, она бы сдала. (тип 3 — прошлое)', uk: 'Якби вона вчилася, вона б склала. (тип 3 — минуле)', hi: 'would have' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Запомни главное: тип условного зависит от того, насколько ситуация реальна. Чем «дальше» от реальности — тем «дальше» в прошлое уходит время в if-части.',
          uk: 'Запам’ятай головне: тип умовного залежить від того, наскільки ситуація реальна. Чим «далі» від реальності — тим «далі» в минуле відходить час у if-частині.',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Четыре типа условных — общая таблица',
      titleUk: 'Чотири типи умовних — загальна таблиця',
      defaultOpen: true,
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'Вот все четыре типа сразу: какой тип, какое время в if-части, какое в результате и пример. Запоминай не отдельные слова, а связку «время в if + время в результате».',
          uk: 'Ось усі чотири типи одразу: який тип, який час у if-частині, який у результаті й приклад. Запам’ятовуй не окремі слова, а зв’язку «час у if + час у результаті».',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'If you heat water, it boils.', ru: 'Тип 0: Present Simple → Present Simple (факт)', uk: 'Тип 0: Present Simple → Present Simple (факт)', hi: 'If' },
            { en: 'If it rains, I will stay home.', ru: 'Тип 1: Present Simple → will + V (реальное)', uk: 'Тип 1: Present Simple → will + V (реальне)', hi: 'will' },
            { en: "If I had money, I'd travel.", ru: 'Тип 2: Past Simple → would + V (нереальное)', uk: 'Тип 2: Past Simple → would + V (нереальне)', hi: 'would' },
            { en: 'If she had studied, she would have passed.', ru: 'Тип 3: Past Perfect → would have + V3 (прошлое)', uk: 'Тип 3: Past Perfect → would have + V3 (минуле)', hi: 'would have' },
          ],
        },
        {
          kind: 'tip',
          ru: 'После if никогда не ставь will или would. will / would живут только в части результата, а не в условии.',
          uk: 'Після if ніколи не став will або would. will / would живуть тільки в частині результату, а не в умові.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно?' },
            optionA: 'If it will rain, I will stay home',
            optionB: 'If it rains, I will stay home',
            correct: 'B',
            explain: { ru: 'После if нет will: условие в Present Simple, will — только в результате.' },
          },
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Тип 0 — факт',
      titleUk: 'Тип 0 — факт',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'Нулевой тип описывает факт — то, что всегда так. Здесь обе части стоят в Present Simple. Так говорят о законах природы, привычках, общих истинах.',
          uk: 'Нульовий тип описує факт — те, що завжди так. Тут обидві частини стоять у Present Simple. Так кажуть про закони природи, звички, загальні істини.',
        },
        {
          kind: 'formula',
          formula: ['If + Present Simple', 'Present Simple'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'If you heat water, it boils.', ru: 'Если нагреть воду, она кипит.', uk: 'Якщо нагріти воду, вона кипить.', hi: 'boils' },
          ],
        },
        {
          kind: 'tip',
          ru: 'В нулевом типе if можно заменить на when («когда») — смысл не меняется: When you heat water, it boils.',
          uk: 'У нульовому типі if можна замінити на when («коли») — сенс не змінюється: When you heat water, it boils.',
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'Тип 1 — реальное будущее',
      titleUk: 'Тип 1 — реальне майбутнє',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'Первый тип — про реальное условие в будущем: это вполне может случиться. В if-части — Present Simple, в результате — will + глагол. Так говорят о планах и вероятных событиях.',
          uk: 'Перший тип — про реальну умову в майбутньому: це цілком може статися. У if-частині — Present Simple, у результаті — will + дієслово. Так кажуть про плани і ймовірні події.',
        },
        {
          kind: 'formula',
          formula: ['If + Present Simple', 'will + глагол'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'If it rains, I will stay home.', ru: 'Если пойдёт дождь, я останусь дома.', uk: 'Якщо піде дощ, я залишуся вдома.', hi: 'will' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Хотя по-русски в if-части будущее («пойдёт дождь»), в английском после if остаётся настоящее: If it rains (не If it will rain).',
          uk: 'Хоча українською в if-частині майбутнє («піде дощ»), в англійській після if лишається теперішнє: If it rains (не If it will rain).',
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'If it rains, I',
            after: 'home',
            options: ['will stay', 'stay', 'stayed'],
            answer: 'will stay',
            why: { ru: 'Тип 1: после if — Present Simple, в результате — will + глагол.' },
          },
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'Тип 2 — нереальное настоящее',
      titleUk: 'Тип 2 — нереальне теперішнє',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'Второй тип — про воображаемую, нереальную ситуацию в настоящем: «если бы…». В if-части — Past Simple, в результате — would + глагол. На самом деле этого нет, ты только мечтаешь или представляешь.',
          uk: 'Другий тип — про уявну, нереальну ситуацію в теперішньому: «якби…». У if-частині — Past Simple, у результаті — would + дієслово. Насправді цього немає, ти лише мрієш або уявляєш.',
        },
        {
          kind: 'formula',
          formula: ['If + Past Simple', 'would + глагол'],
        },
        {
          kind: 'examples',
          examples: [
            { en: "If I had money, I'd travel.", ru: 'Если бы у меня были деньги, я бы путешествовал.', uk: 'Якби в мене були гроші, я б подорожував.', hi: 'would' },
          ],
        },
        {
          kind: 'tip',
          ru: "I'd — это короткая форма от I would. Past Simple здесь не про прошлое, а знак того, что ситуация нереальна.",
          uk: "I'd — це коротка форма від I would. Past Simple тут не про минуле, а знак того, що ситуація нереальна.",
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Если бы у меня были деньги, я бы путешествовал.' },
            answer: ['If', 'I', 'had', 'money', 'I', 'would', 'travel'],
            slotLabels: [{ ru: 'если' }, { ru: 'кто' }, { ru: 'было (Past)' }, { ru: 'что' }, { ru: 'кто' }, { ru: 'бы' }, { ru: 'глагол' }],
            distractors: ['will', 'have'],
          },
        },
      ],
    },

    // ───────────────────────── 06 ─────────────────────────
    {
      num: '06',
      titleRu: 'Тип 3 — нереальное прошлое',
      titleUk: 'Тип 3 — нереальне минуле',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'Третий тип — про прошлое, которое уже нельзя изменить: «если бы тогда…, то…». В if-части — Past Perfect (had + V3), в результате — would have + V3. Так жалеют о том, что случилось или не случилось.',
          uk: 'Третій тип — про минуле, яке вже не можна змінити: «якби тоді…, то…». У if-частині — Past Perfect (had + V3), у результаті — would have + V3. Так шкодують про те, що сталося або не сталося.',
        },
        {
          kind: 'formula',
          formula: ['If + Past Perfect (had + V3)', 'would have + V3'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'If she had studied, she would have passed.', ru: 'Если бы она училась, она бы сдала.', uk: 'Якби вона вчилася, вона б склала.', hi: 'would have' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Тип 3 всегда про то, что уже не изменить. На самом деле она не училась — и не сдала.',
          uk: 'Тип 3 завжди про те, що вже не змінити. Насправді вона не вчилася — і не склала.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно (нереальное прошлое)?' },
            optionA: 'If she studied, she would have passed',
            optionB: 'If she had studied, she would have passed',
            correct: 'B',
            explain: { ru: 'Тип 3: после if — Past Perfect (had studied), в результате — would have + V3.' },
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
            { wrong: 'If it will rain, I will stay home', right: 'If it rains, I will stay home' },
            { wrong: 'If I would have money, I would travel', right: 'If I had money, I would travel' },
            { wrong: 'If she studied, she would have passed', right: 'If she had studied, she would have passed' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Главное правило: после if нет will и would. Условие — это Present Simple (тип 1), Past Simple (тип 2) или Past Perfect (тип 3). will / would — только в результате.',
          uk: 'Головне правило: після if немає will і would. Умова — це Present Simple (тип 1), Past Simple (тип 2) або Past Perfect (тип 3). will / would — тільки в результаті.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'spot_slip',
            chips: ['If', 'it', 'will', 'rain', 'I', 'will', 'stay', 'home'],
            answerIndex: 2,
            hint: { ru: 'Тут лишнее слово после if. Тапни его.' },
            fix: { ru: 'После if нет will: If it rains, I will stay home.' },
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
          ru: 'Четыре типа условных: 0 (факт) — Present + Present; 1 (реальное) — Present + will; 2 (нереальное настоящее) — Past + would; 3 (нереальное прошлое) — Past Perfect + would have. После if всегда стоит «время условия», а will / would — только в результате.',
          uk: 'Чотири типи умовних: 0 (факт) — Present + Present; 1 (реальне) — Present + will; 2 (нереальне теперішнє) — Past + would; 3 (нереальне минуле) — Past Perfect + would have. Після if завжди стоїть «час умови», а will / would — тільки в результаті.',
        },
        {
          kind: 'tip',
          ru: 'Держи лесенку «дальше от реальности — дальше в прошлое»: реальное → Present, мечта о настоящем → Past, сожаление о прошлом → Past Perfect.',
          uk: 'Тримай драбинку «далі від реальності — далі в минуле»: реальне → Present, мрія про теперішнє → Past, жаль про минуле → Past Perfect.',
        },
      ],
    },
  ],
}
