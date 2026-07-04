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
  titleEs: string
  exampleCount?: number
  defaultOpen?: boolean
  blocks: L10Block[]
}

export const LESSON10_THEORY: { titleRu: string; titleUk: string; titleEs: string; sections: L10Section[] } = {
  titleRu: 'Модальные глаголы',
  titleUk: 'Модальні дієслова',
  titleEs: 'Verbos modales',
  sections: [
    // ───────────────────────── 01 ─────────────────────────
    {
      num: '01',
      titleRu: 'Что ты тренируешь в этом уроке',
      titleUk: 'Що ти тренуєш у цьому уроці',
      titleEs: 'Qué vas a practicar en esta lección',
      defaultOpen: true,
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'В этом уроке ты учишься использовать модальные глаголы: can, must, should, may, might и оборот have to. Они стоят перед основным глаголом и показывают возможность, обязанность, совет или разрешение. Главное правило: после модального глагола идёт глагол без to (кроме have to).',
          uk: 'У цьому уроці ти вчишся використовувати модальні дієслова: can, must, should, may, might та зворот have to. Вони стоять перед основним дієсловом і показують можливість, обов’язок, пораду або дозвіл. Головне правило: після модального дієслова йде дієслово без to (крім have to).',
          es: 'En esta lección aprendes a usar los verbos modales: can, must, should, may, might y la construcción have to. Van antes del verbo principal y muestran posibilidad, obligación, consejo o permiso. La regla clave: después del verbo modal va el verbo sin to (excepto en have to).',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I can swim.', ru: 'Я умею плавать.', uk: 'Я вмію плавати.', es: 'Sé nadar.', hi: 'can' },
            { en: 'I must finish this.', ru: 'Я должен это закончить.', uk: 'Я мушу це закінчити.', es: 'Debo terminar esto.', hi: 'must' },
            { en: 'You should sleep more.', ru: 'Тебе следует больше спать.', uk: 'Тобі слід більше спати.', es: 'Deberías dormir más.', hi: 'should' },
            { en: 'May I come in?', ru: 'Можно мне войти?', uk: 'Можна мені увійти?', es: '¿Puedo entrar?', hi: 'May' },
          ],
        },
        {
          kind: 'tip',
          ru: 'После can, must, should, may, might всегда идёт глагол без to: I can swim (не I can to swim).',
          uk: 'Після can, must, should, may, might завжди йде дієслово без to: I can swim (не I can to swim).',
          es: 'Después de can, must, should, may, might siempre va el verbo sin to: I can swim (no I can to swim).',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Все модальные глаголы урока',
      titleUk: 'Усі модальні дієслова уроку',
      titleEs: 'Todos los verbos modales de la lección',
      defaultOpen: true,
      exampleCount: 8,
      blocks: [
        {
          kind: 'body',
          ru: 'Вот все глаголы и обороты этого урока с их значением. Запоминай не отдельное слово, а связку «модальный глагол + смысл».',
          uk: 'Ось усі дієслова й звороти цього уроку з їхнім значенням. Запам’ятовуй не окреме слово, а зв’язку «модальне дієслово + сенс».',
          es: 'Aquí están todos los verbos y construcciones de esta lección con su significado. Memoriza no la palabra suelta, sino el par «verbo modal + sentido».',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I can swim.', ru: 'can — уметь / мочь', uk: 'can — вміти / мати змогу', es: 'can — saber / poder', hi: 'can' },
            { en: "You can't park here.", ru: "can't — не уметь / нельзя", uk: "can't — не вміти / не можна", es: "can't — no poder / no estar permitido", hi: "can't" },
            { en: 'I must finish this.', ru: 'must — должен (внутреннее)', uk: 'must — мусити (внутрішня потреба)', es: 'must — deber (obligación interna)', hi: 'must' },
            { en: "You mustn't smoke here.", ru: "mustn't — запрет", uk: "mustn't — заборона", es: "mustn't — prohibición", hi: "mustn't" },
            { en: 'You should sleep more.', ru: 'should — следует / стоит', uk: 'should — слід / варто', es: 'should — debería / conviene', hi: 'should' },
            { en: 'May I come in?', ru: 'may — можно (разрешение)', uk: 'may — можна (дозвіл)', es: 'may — se puede (permiso)', hi: 'May' },
            { en: 'It might rain today.', ru: 'might — возможно (неуверенность)', uk: 'might — можливо (невпевненість)', es: 'might — quizás (incertidumbre)', hi: 'might' },
            { en: 'I have to work tomorrow.', ru: 'have to — должен (внешнее)', uk: 'have to — мусити (зовнішня необхідність)', es: 'have to — tener que (necesidad externa)', hi: 'have to' },
          ],
        },
        {
          kind: 'tip',
          ru: 'must — это «должен» по внутреннему решению, а have to — «должен» из-за внешних правил или обстоятельств.',
          uk: 'must — це «мушу» за внутрішнім рішенням, а have to — «мушу» через зовнішні правила або обставини.',
          es: 'must es «deber» por decisión propia, mientras que have to es «deber» por reglas externas o circunstancias.',
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Can и can’t — умение и нельзя',
      titleUk: 'Can і can’t — вміння і не можна',
      titleEs: 'Can y can’t — habilidad y prohibición',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Can показывает умение или возможность: «умею», «могу». Отрицание can’t означает «не умею» или «нельзя». После can и can’t глагол идёт без to.',
          uk: 'Can показує вміння або можливість: «вмію», «можу». Заперечення can’t означає «не вмію» або «не можна». Після can і can’t дієслово йде без to.',
          es: 'Can muestra habilidad o posibilidad: «sé», «puedo». La negación can’t significa «no sé» o «no se puede». Después de can y can’t el verbo va sin to.',
        },
        {
          kind: 'formula',
          formula: ['кто / что', 'can / can’t', 'глагол без to'],
          formulaEs: ['quién / qué', 'can / can’t', 'verbo sin to'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I can swim.', ru: 'Я умею плавать.', uk: 'Я вмію плавати.', es: 'Sé nadar.', hi: 'can' },
            { en: "You can't park here.", ru: 'Здесь нельзя парковаться.', uk: 'Тут не можна паркуватися.', es: 'Aquí no se puede aparcar.', hi: "can't" },
          ],
        },
        {
          kind: 'tip',
          ru: 'Can’t — это короткая форма от cannot. Она же передаёт смысл «нельзя» по правилу: You can’t park here.',
          uk: 'Can’t — це коротка форма від cannot. Вона ж передає сенс «не можна» за правилом: You can’t park here.',
          es: 'Can’t es la forma corta de cannot. Transmite el sentido de «no se puede» según la regla: You can’t park here.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'I',
            after: 'swim',
            options: ['can', 'can to', 'cans'],
            answer: 'can',
            why: { ru: 'После can глагол идёт без to: I can swim.', es: 'Después de can el verbo va sin to: I can swim.' },
          },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'Must и mustn’t — обязанность и запрет',
      titleUk: 'Must і mustn’t — обов’язок і заборона',
      titleEs: 'Must y mustn’t — obligación y prohibición',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Must — сильное «должен», когда ты сам чувствуешь необходимость. Mustn’t — строгий запрет: «нельзя», «запрещено». После обоих идёт глагол без to.',
          uk: 'Must — сильне «мушу», коли ти сам відчуваєш необхідність. Mustn’t — сувора заборона: «не можна», «заборонено». Після обох іде дієслово без to.',
          es: 'Must es un «debo» fuerte, cuando tú mismo sientes la necesidad. Mustn’t es una prohibición estricta: «no se puede», «está prohibido». Después de ambos el verbo va sin to.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I must finish this.', ru: 'Я должен это закончить.', uk: 'Я мушу це закінчити.', es: 'Debo terminar esto.', hi: 'must' },
            { en: "You mustn't smoke here.", ru: 'Здесь нельзя курить.', uk: 'Тут не можна курити.', es: 'Aquí no se puede fumar.', hi: "mustn't" },
          ],
        },
        {
          kind: 'tip',
          ru: 'Mustn’t — это не «не обязан», а именно «нельзя». You mustn’t smoke here — здесь запрещено курить.',
          uk: 'Mustn’t — це не «не зобов’язаний», а саме «не можна». You mustn’t smoke here — тут заборонено курити.',
          es: 'Mustn’t no significa «no estoy obligado», sino justamente «no se puede». You mustn’t smoke here — aquí está prohibido fumar.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно?', es: '¿Cuál es correcta?' },
            optionA: 'I must to finish this',
            optionB: 'I must finish this',
            correct: 'B',
            explain: { ru: 'После must глагол идёт без to.', es: 'Después de must el verbo va sin to.' },
          },
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'Should — совет',
      titleUk: 'Should — порада',
      titleEs: 'Should — consejo',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'Should — это совет или рекомендация: «следует», «стоит». Это мягче, чем must: ты не обязан, но так будет лучше. После should идёт глагол без to.',
          uk: 'Should — це порада або рекомендація: «слід», «варто». Це м’якше, ніж must: ти не зобов’язаний, але так буде краще. Після should іде дієслово без to.',
          es: 'Should es un consejo o recomendación: «deberías», «conviene». Es más suave que must: no estás obligado, pero será mejor así. Después de should va el verbo sin to.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'You should sleep more.', ru: 'Тебе следует больше спать.', uk: 'Тобі слід більше спати.', es: 'Deberías dormir más.', hi: 'should' },
          ],
        },
      ],
    },

    // ───────────────────────── 06 ─────────────────────────
    {
      num: '06',
      titleRu: 'May и might — разрешение и возможность',
      titleUk: 'May і might — дозвіл і можливість',
      titleEs: 'May y might — permiso y posibilidad',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'May означает «можно» — вежливое разрешение, часто в вопросе: May I come in? Might означает «возможно» — что-то неуверенное, что может случиться: It might rain today.',
          uk: 'May означає «можна» — ввічливий дозвіл, часто в питанні: May I come in? Might означає «можливо» — щось непевне, що може статися: It might rain today.',
          es: 'May significa «se puede» — un permiso cortés, a menudo en pregunta: May I come in? Might significa «quizás» — algo incierto que puede pasar: It might rain today.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'May I come in?', ru: 'Можно мне войти?', uk: 'Можна мені увійти?', es: '¿Puedo entrar?', hi: 'May' },
            { en: 'It might rain today.', ru: 'Сегодня, возможно, пойдёт дождь.', uk: 'Сьогодні, можливо, піде дощ.', es: 'Hoy quizás llueva.', hi: 'might' },
          ],
        },
        {
          kind: 'tip',
          ru: 'May — про разрешение, might — про вероятность. May I come in? = «можно?». It might rain = «возможно, будет дождь».',
          uk: 'May — про дозвіл, might — про ймовірність. May I come in? = «можна?». It might rain = «можливо, буде дощ».',
          es: 'May trata sobre el permiso, might sobre la probabilidad. May I come in? = «¿se puede?». It might rain = «quizás llueva».',
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Можно мне войти?', es: '¿Puedo entrar?' },
            answer: ['May', 'I', 'come', 'in'],
            slotLabels: [{ ru: 'модальный', es: 'modal' }, { ru: 'кто', es: 'quién' }, { ru: 'глагол', es: 'verbo' }, { ru: 'куда', es: 'adónde' }],
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
      titleEs: 'Have to — necesidad externa',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'Have to — это «должен» из-за внешних причин: правил, работы, обстоятельств. В отличие от других модальных, здесь есть to, а после него глагол: I have to work.',
          uk: 'Have to — це «мушу» через зовнішні причини: правила, роботу, обставини. На відміну від інших модальних, тут є to, а після нього дієслово: I have to work.',
          es: 'Have to es «deber» por causas externas: normas, trabajo, circunstancias. A diferencia de los otros modales, aquí hay to, y después de él va el verbo: I have to work.',
        },
        {
          kind: 'formula',
          formula: ['кто / что', 'have to', 'глагол'],
          formulaEs: ['quién / qué', 'have to', 'verbo'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I have to work tomorrow.', ru: 'Завтра мне нужно работать.', uk: 'Завтра мені треба працювати.', es: 'Mañana tengo que trabajar.', hi: 'have to' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Have to — единственный в этом уроке, где есть to. У остальных (can, must, should, may, might) to не нужно.',
          uk: 'Have to — єдиний у цьому уроці, де є to. У решти (can, must, should, may, might) to не потрібно.',
          es: 'Have to es el único en esta lección que lleva to. En los demás (can, must, should, may, might) el to no hace falta.',
        },
      ],
    },

    // ───────────────────────── 08 ─────────────────────────
    {
      num: '08',
      titleRu: 'Самые частые ошибки',
      titleUk: 'Найчастіші помилки',
      titleEs: 'Los errores más frecuentes',
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
          es: 'Después de can, must, should el verbo va sin to. En cambio, en have to la partícula to es obligatoria.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'spot_slip',
            chips: ['You', 'should', 'to', 'sleep', 'more'],
            answerIndex: 2,
            hint: { ru: 'Тут лишнее слово. Тапни его.', es: 'Aquí sobra una palabra. Tócala.' },
            fix: { ru: 'После should глагол без to: You should sleep more.', es: 'Después de should el verbo va sin to: You should sleep more.' },
          },
        },
      ],
    },

    // ───────────────────────── 09 ─────────────────────────
    {
      num: '09',
      titleRu: 'Что нужно вынести из урока',
      titleUk: 'Що треба винести з уроку',
      titleEs: 'Qué debes recordar de la lección',
      blocks: [
        {
          kind: 'body',
          ru: 'Модальные глаголы добавляют к действию смысл: can — умею/могу, can’t — нельзя, must — должен, mustn’t — запрещено, should — следует, may — можно, might — возможно, have to — нужно по обстоятельствам.',
          uk: 'Модальні дієслова додають до дії сенс: can — вмію/можу, can’t — не можна, must — мушу, mustn’t — заборонено, should — слід, may — можна, might — можливо, have to — треба за обставинами.',
          es: 'Los verbos modales añaden a la acción un sentido: can — sé/puedo, can’t — no se puede, must — debo, mustn’t — está prohibido, should — debería, may — se puede, might — quizás, have to — hace falta por las circunstancias.',
        },
        {
          kind: 'tip',
          ru: 'Держи одну формулу: кто + модальный глагол + глагол без to. I can swim. You should sleep more. И отдельно: have to + глагол с to.',
          uk: 'Тримай одну формулу: хто + модальне дієслово + дієслово без to. I can swim. You should sleep more. І окремо: have to + дієслово з to.',
          es: 'Guarda una sola fórmula: quién + verbo modal + verbo sin to. I can swim. You should sleep more. Y aparte: have to + verbo con to.',
        },
      ],
    },
  ],
}
