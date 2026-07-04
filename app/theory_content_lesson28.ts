// Theory content for Lesson 28 (Reflexive pronouns: myself, yourself, himself…).
//
// Structured data source for the TheoryLessonView engine. Content transferred
// from the legacy lesson_help.tsx HINTS[28].render (a single reflexive-pronouns
// table) and expanded into meaningful sections. Grammar is verified against
// Cambridge/Oxford usage of English reflexive pronouns.
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk).
// `hi` on an example is the reflexive form (myself / yourself / himself…)
// to highlight in the phrase.

import type { L1Block } from './theory_content_lesson1'

/** Тип одного интерактива (как в движке теории). */
type L28DrillType = 'choice' | 'word_bank' | 'spot_slip' | 'binary'

/** Готовый интерактив теории. Структура повторяет TheoryDrill движка. */
interface L28Drill {
  type: L28DrillType
  [key: string]: unknown
}

/**
 * Блок секции урока 28. Расширяет L1Block видом 'drill' — движок теории
 * (TheoryBlock) поддерживает интерактивы, а узкий L1Block из урока 1 — нет.
 */
type L28Block =
  | L1Block
  | { kind: 'drill'; drill: L28Drill }

/** Секция урока 28 (как L1Section, но с поддержкой drill-блоков). */
interface L28Section {
  num: string
  titleRu: string
  titleUk: string
  titleEs: string
  exampleCount?: number
  defaultOpen?: boolean
  blocks: L28Block[]
}

export const LESSON28_THEORY: { titleRu: string; titleUk: string; titleEs: string; sections: L28Section[] } = {
  titleRu: 'Возвратные местоимения',
  titleUk: 'Зворотні займенники',
  titleEs: 'Pronombres reflexivos',
  sections: [
    // ───────────────────────── 01 ─────────────────────────
    {
      num: '01',
      titleRu: 'Что ты тренируешь в этом уроке',
      titleUk: 'Що ти тренуєш у цьому уроці',
      titleEs: 'Qué vas a entrenar en esta lección',
      defaultOpen: true,
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'В этом уроке ты учишься использовать возвратные местоимения: myself, yourself, himself, herself, itself, ourselves, yourselves, themselves. Они нужны, когда действие возвращается к тому, кто его делает: человек делает что-то сам с собой. По-русски это часто «-ся» или «себя»: I hurt myself — «я поранился» (поранил себя).',
          uk: 'У цьому уроці ти вчишся використовувати зворотні займенники: myself, yourself, himself, herself, itself, ourselves, yourselves, themselves. Вони потрібні, коли дія повертається до того, хто її робить: людина робить щось сама із собою. Українською це часто «-ся» або «себе»: I hurt myself — «я поранився» (поранив себе).',
          es: 'En esta lección aprendes a usar los pronombres reflexivos: myself, yourself, himself, herself, itself, ourselves, yourselves, themselves. Se necesitan cuando la acción vuelve a quien la hace: la persona hace algo consigo misma. En español esto suele ser un verbo reflexivo o «a sí mismo»: I hurt myself — «me lastimé» (me lastimé a mí mismo).',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I hurt myself.', ru: 'Я поранился (сам себя).', uk: 'Я поранився (сам себе).', es: 'Me lastimé (a mí mismo).', hi: 'myself' },
            { en: 'He introduced himself.', ru: 'Он представился.', uk: 'Він представився.', es: 'Se presentó.', hi: 'himself' },
            { en: 'We cooked it ourselves.', ru: 'Мы приготовили это сами.', uk: 'Ми приготували це самі.', es: 'Lo cocinamos nosotros mismos.', hi: 'ourselves' },
            { en: 'They built it themselves.', ru: 'Они построили это сами.', uk: 'Вони побудували це самі.', es: 'Lo construyeron ellos mismos.', hi: 'themselves' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Возвратное местоимение указывает на то же лицо, что и подлежащее: кто делает действие, на того оно и возвращается.',
          uk: 'Зворотний займенник вказує на ту саму особу, що й підмет: хто робить дію, на того вона й повертається.',
          es: 'El pronombre reflexivo señala a la misma persona que el sujeto: quien hace la acción es a quien esta vuelve.',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Все возвратные местоимения',
      titleUk: 'Усі зворотні займенники',
      titleEs: 'Todos los pronombres reflexivos',
      defaultOpen: true,
      exampleCount: 8,
      blocks: [
        {
          kind: 'body',
          ru: 'Для каждого подлежащего есть своя возвратная форма. Запоминай парами: «кто делает → на кого возвращается». Обрати внимание: в единственном числе окончание -self, а во множественном -selves.',
          uk: 'Для кожного підмета є своя зворотна форма. Запам’ятовуй парами: «хто робить → на кого повертається». Зверни увагу: в однині закінчення -self, а в множині -selves.',
          es: 'Cada sujeto tiene su propia forma reflexiva. Memoriza por pares: «quién hace → a quién vuelve». Fíjate: en singular la terminación es -self, y en plural, -selves.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I hurt myself.', ru: 'I → myself', uk: 'I → myself', es: 'I → myself', hi: 'myself' },
            { en: 'Did you enjoy yourself?', ru: 'You (один) → yourself', uk: 'You (один) → yourself', es: 'You (uno) → yourself', hi: 'yourself' },
            { en: 'He introduced himself.', ru: 'He → himself', uk: 'He → himself', es: 'He → himself', hi: 'himself' },
            { en: 'She did it herself.', ru: 'She → herself', uk: 'She → herself', es: 'She → herself', hi: 'herself' },
            { en: 'The door opened by itself.', ru: 'It → itself', uk: 'It → itself', es: 'It → itself', hi: 'itself' },
            { en: 'We cooked it ourselves.', ru: 'We → ourselves', uk: 'We → ourselves', es: 'We → ourselves', hi: 'ourselves' },
            { en: 'Help yourselves!', ru: 'You (много) → yourselves', uk: 'You (багато) → yourselves', es: 'You (varios) → yourselves', hi: 'yourselves' },
            { en: 'They built it themselves.', ru: 'They → themselves', uk: 'They → themselves', es: 'They → themselves', hi: 'themselves' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Единственное число оканчивается на -self (myself, yourself, himself, herself, itself), а множественное — на -selves (ourselves, yourselves, themselves).',
          uk: 'Однина закінчується на -self (myself, yourself, himself, herself, itself), а множина — на -selves (ourselves, yourselves, themselves).',
          es: 'El singular termina en -self (myself, yourself, himself, herself, itself), y el plural, en -selves (ourselves, yourselves, themselves).',
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'He introduced',
            after: '',
            options: ['himself', 'herself', 'themselves'],
            answer: 'himself',
            why: { ru: 'He возвращается к himself: He introduced himself.', es: 'He vuelve a himself: He introduced himself.' },
          },
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'yourself или yourselves',
      titleUk: 'yourself чи yourselves',
      titleEs: 'yourself o yourselves',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'You в английском одинаково для одного человека и для нескольких. Но возвратные формы разные: yourself — когда «ты» один, yourselves — когда «вы» несколько человек.',
          uk: 'You в англійській однакове для однієї людини і для кількох. Але зворотні форми різні: yourself — коли «ти» один, yourselves — коли «ви» кілька людей.',
          es: 'You en inglés es igual para una persona y para varias. Pero las formas reflexivas son distintas: yourself cuando «tú» eres uno solo, yourselves cuando «ustedes» son varias personas.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Did you enjoy yourself?', ru: 'Ты хорошо провёл время? (один)', uk: 'Ти добре провів час? (один)', es: '¿Te divertiste? (uno solo)', hi: 'yourself' },
            { en: 'Help yourselves!', ru: 'Угощайтесь! (несколько)', uk: 'Пригощайтеся! (кілька)', es: '¡Sírvanse! (varios)', hi: 'yourselves' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Один человек — yourself. Несколько людей — yourselves. Само слово you при этом не меняется.',
          uk: 'Одна людина — yourself. Кілька людей — yourselves. Саме слово you при цьому не змінюється.',
          es: 'Una persona: yourself. Varias personas: yourselves. La palabra you en sí no cambia.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Гостям за столом говорят:', es: 'A los invitados en la mesa se les dice:' },
            optionA: 'Help yourself!',
            optionB: 'Help yourselves!',
            correct: 'B',
            explain: { ru: 'Гостей несколько, поэтому множественная форма yourselves.', es: 'Hay varios invitados, por eso se usa la forma plural yourselves.' },
          },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'Возвратное как объект действия',
      titleUk: 'Зворотний як об’єкт дії',
      titleEs: 'El reflexivo como objeto de la acción',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Часто возвратное местоимение стоит после глагола как объект: человек делает действие сам с собой. Тогда оно отвечает на вопрос «кого / что» и совпадает с подлежащим.',
          uk: 'Часто зворотний займенник стоїть після дієслова як об’єкт: людина робить дію сама із собою. Тоді він відповідає на питання «кого / що» і збігається з підметом.',
          es: 'A menudo el pronombre reflexivo va después del verbo como objeto: la persona hace la acción consigo misma. Entonces responde a la pregunta «a quién / qué» y coincide con el sujeto.',
        },
        {
          kind: 'formula',
          formula: ['кто', 'глагол', 'myself / himself …'],
          formulaEs: ['quién', 'verbo', 'myself / himself …'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I hurt myself.', ru: 'Я поранил себя.', uk: 'Я поранив себе.', es: 'Me lastimé a mí mismo.', hi: 'myself' },
            { en: 'He introduced himself.', ru: 'Он представил себя (представился).', uk: 'Він представив себе (представився).', es: 'Se presentó a sí mismo (se presentó).', hi: 'himself' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Если действие возвращается к тому же лицу, нельзя ставить обычное местоимение: не I hurt me, а I hurt myself.',
          uk: 'Якщо дія повертається до тієї самої особи, не можна ставити звичайний займенник: не I hurt me, а I hurt myself.',
          es: 'Si la acción vuelve a la misma persona, no se puede usar un pronombre normal: no I hurt me, sino I hurt myself.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Я поранился.', es: 'Me lastimé.' },
            answer: ['I', 'hurt', 'myself'],
            slotLabels: [{ ru: 'кто', es: 'quién' }, { ru: 'глагол', es: 'verbo' }, { ru: 'себя', es: 'a sí mismo' }],
            distractors: ['me', 'himself'],
          },
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: '«Сам / сама» — усиление',
      titleUk: '«Сам / сама» — підсилення',
      titleEs: '«Mismo / misma» — énfasis',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Возвратное местоимение может усиливать смысл «сам, без чужой помощи». Тогда оно подчёркивает, что действие сделал именно этот человек самостоятельно.',
          uk: 'Зворотний займенник може підсилювати сенс «сам, без чужої допомоги». Тоді він підкреслює, що дію зробила саме ця людина самостійно.',
          es: 'El pronombre reflexivo puede reforzar el sentido de «uno mismo, sin ayuda ajena». Entonces subraya que fue precisamente esa persona quien hizo la acción por su cuenta.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'She did it herself.', ru: 'Она сделала это сама.', uk: 'Вона зробила це сама.', es: 'Ella misma lo hizo.', hi: 'herself' },
            { en: 'We cooked it ourselves.', ru: 'Мы приготовили это сами.', uk: 'Ми приготували це самі.', es: 'Lo cocinamos nosotros mismos.', hi: 'ourselves' },
          ],
        },
        {
          kind: 'tip',
          ru: 'В значении «сам» возвратное местоимение часто стоит в конце фразы: They built it themselves.',
          uk: 'У значенні «сам» зворотний займенник часто стоїть у кінці фрази: They built it themselves.',
          es: 'En el sentido de «mismo», el pronombre reflexivo suele ir al final de la frase: They built it themselves.',
        },
      ],
    },

    // ───────────────────────── 06 ─────────────────────────
    {
      num: '06',
      titleRu: 'by + себя — «сам, в одиночку»',
      titleUk: 'by + себе — «сам, наодинці»',
      titleEs: 'by + reflexivo — «solo, sin ayuda»',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'Оборот by myself / by itself значит «сам, в одиночку, без посторонних». Часто так говорят, когда что-то произошло само собой или человек был один.',
          uk: 'Зворот by myself / by itself означає «сам, наодинці, без сторонніх». Часто так кажуть, коли щось сталося саме собою або людина була сама.',
          es: 'La expresión by myself / by itself significa «solo, sin compañía, sin ayuda de nadie». A menudo se dice así cuando algo pasó por sí solo o la persona estaba sola.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'The door opened by itself.', ru: 'Дверь открылась сама собой.', uk: 'Двері відчинилися самі собою.', es: 'La puerta se abrió sola.', hi: 'itself' },
          ],
        },
        {
          kind: 'tip',
          ru: 'by + возвратное = «сам / само». The door opened by itself — никто не открывал, открылась сама.',
          uk: 'by + зворотний = «сам / само». The door opened by itself — ніхто не відчиняв, відчинилися самі.',
          es: 'by + reflexivo = «solo / por sí solo». The door opened by itself — nadie la abrió, se abrió sola.',
        },
      ],
    },

    // ───────────────────────── 07 ─────────────────────────
    {
      num: '07',
      titleRu: 'Самые частые ошибки',
      titleUk: 'Найчастіші помилки',
      titleEs: 'Los errores más frecuentes',
      blocks: [
        {
          kind: 'fix',
          fixes: [
            { wrong: 'I hurt me', right: 'I hurt myself' },
            { wrong: 'He introduced him', right: 'He introduced himself' },
            { wrong: 'We cooked it ourself', right: 'We cooked it ourselves' },
            { wrong: 'They built it theirselves', right: 'They built it themselves' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Нет форм «hisself» или «theirselves» — правильно himself и themselves. И помни про -selves во множественном числе: ourselves, yourselves, themselves.',
          uk: 'Немає форм «hisself» чи «theirselves» — правильно himself і themselves. І пам’ятай про -selves у множині: ourselves, yourselves, themselves.',
          es: 'No existen las formas «hisself» ni «theirselves» — lo correcto es himself y themselves. Y recuerda el -selves en plural: ourselves, yourselves, themselves.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'spot_slip',
            chips: ['They', 'built', 'it', 'theirselves'],
            answerIndex: 3,
            hint: { ru: 'Здесь неверная форма. Тапни её.', es: 'Aquí hay una forma incorrecta. Tócala.' },
            fix: { ru: 'Правильно themselves: They built it themselves.', es: 'Lo correcto es themselves: They built it themselves.' },
          },
        },
      ],
    },

    // ───────────────────────── 08 ─────────────────────────
    {
      num: '08',
      titleRu: 'Что нужно вынести из урока',
      titleUk: 'Що треба винести з уроку',
      titleEs: 'Qué debes recordar de esta lección',
      blocks: [
        {
          kind: 'body',
          ru: 'Возвратные местоимения нужны, когда действие возвращается к тому, кто его делает. Единственное число: myself, yourself, himself, herself, itself. Множественное: ourselves, yourselves, themselves.',
          uk: 'Зворотні займенники потрібні, коли дія повертається до того, хто її робить. Однина: myself, yourself, himself, herself, itself. Множина: ourselves, yourselves, themselves.',
          es: 'Los pronombres reflexivos se necesitan cuando la acción vuelve a quien la hace. Singular: myself, yourself, himself, herself, itself. Plural: ourselves, yourselves, themselves.',
        },
        {
          kind: 'tip',
          ru: 'Держи связку «подлежащее → возвратное»: I → myself, he → himself, we → ourselves. И помни: -self для одного, -selves для нескольких.',
          uk: 'Тримай зв’язку «підмет → зворотний»: I → myself, he → himself, we → ourselves. І пам’ятай: -self для одного, -selves для кількох.',
          es: 'Recuerda la combinación «sujeto → reflexivo»: I → myself, he → himself, we → ourselves. Y recuerda: -self para uno, -selves para varios.',
        },
      ],
    },
  ],
}
