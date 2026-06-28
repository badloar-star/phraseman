// Theory content for Lesson 19 (Prepositions of place).
//
// Structured data source for the TheoryLessonView engine. Content transferred
// from the legacy lesson_help.tsx HINTS[19].render (a single prepositions table)
// and expanded into meaningful sections. Grammar is verified against
// Cambridge/Oxford usage of English prepositions of place.
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk).
// `hi` on an example is the preposition to highlight in the phrase.

import type { L1Block, L1Section } from './theory_content_lesson1'

/** Тип одного интерактива (как в движке теории). */
type L19DrillType = 'choice' | 'word_bank' | 'spot_slip' | 'binary'

/** Готовый интерактив теории. Структура повторяет TheoryDrill движка. */
interface L19Drill {
  type: L19DrillType
  [key: string]: unknown
}

/**
 * Блок секции урока 19. Расширяет L1Block видом 'drill' — движок теории
 * (TheoryBlock) поддерживает интерактивы, а узкий L1Block из урока 1 — нет.
 */
type L19Block =
  | L1Block
  | { kind: 'drill'; drill: L19Drill }

/** Секция урока 19 (как L1Section, но с поддержкой drill-блоков). */
type L19Section = Omit<L1Section, 'blocks'> & { blocks: L19Block[] }

export const LESSON19_THEORY: { titleRu: string; titleUk: string; sections: L1Section[] } = {
  titleRu: 'Предлоги места',
  titleUk: 'Прийменники місця',
  sections: ([
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
          ru: 'В этом уроке ты учишься говорить, где находится предмет или человек. Для этого в английском есть предлоги места: in, on, under, above, next to, between, behind, in front of, opposite, at. Они стоят перед словом, которое называет место.',
          uk: 'У цьому уроці ти вчишся казати, де перебуває предмет або людина. Для цього в англійській є прийменники місця: in, on, under, above, next to, between, behind, in front of, opposite, at. Вони стоять перед словом, що називає місце.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'The keys are in the bag.', ru: 'Ключи внутри сумки.', uk: 'Ключі всередині сумки.', hi: 'in' },
            { en: 'The phone is on the table.', ru: 'Телефон на столе.', uk: 'Телефон на столі.', hi: 'on' },
            { en: 'The cat is under the chair.', ru: 'Кот под стулом.', uk: 'Кіт під стільцем.', hi: 'under' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Предлог места всегда идёт перед местом: in the bag, on the table, under the chair.',
          uk: 'Прийменник місця завжди йде перед місцем: in the bag, on the table, under the chair.',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Все предлоги места урока',
      titleUk: 'Усі прийменники місця уроку',
      defaultOpen: true,
      exampleCount: 10,
      blocks: [
        {
          kind: 'body',
          ru: 'Вот все предлоги этого урока с их значением и примером. Запоминай не отдельное слово, а связку «предлог + что он показывает».',
          uk: 'Ось усі прийменники цього уроку з їхнім значенням і прикладом. Запам’ятовуй не окреме слово, а зв’язку «прийменник + що він показує».',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'The keys are in the bag.', ru: 'in — внутри', uk: 'in — всередині', hi: 'in' },
            { en: 'The phone is on the table.', ru: 'on — на поверхности', uk: 'on — на поверхні', hi: 'on' },
            { en: 'The cat is under the chair.', ru: 'under — под', uk: 'under — під', hi: 'under' },
            { en: 'The lamp is above the desk.', ru: 'above — над', uk: 'above — над', hi: 'above' },
            { en: 'She sits next to the window.', ru: 'next to — рядом с', uk: 'next to — поряд з', hi: 'next to' },
            { en: 'The shop is between the two cafes.', ru: 'between — между', uk: 'between — між', hi: 'between' },
            { en: 'He is standing behind the door.', ru: 'behind — позади', uk: 'behind — позаду', hi: 'behind' },
            { en: 'The car is in front of the house.', ru: 'in front of — перед', uk: 'in front of — перед', hi: 'in front of' },
            { en: 'The school is opposite the park.', ru: 'opposite — напротив', uk: 'opposite — навпроти', hi: 'opposite' },
            { en: "I'm at the station.", ru: 'at — у / на (в точке)', uk: 'at — біля / на (в точці)', hi: 'at' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Это словарь урока. Дальше разберём предлоги, которые чаще всего путают: in / on / at.',
          uk: 'Це словник уроку. Далі розберемо прийменники, які найчастіше плутають: in / on / at.',
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'in — внутри',
      titleUk: 'in — всередині',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'In означает «внутри», в закрытом или ограниченном пространстве: в сумке, в комнате, в коробке. Предмет находится внутри чего-то.',
          uk: 'In означає «всередині», у закритому або обмеженому просторі: у сумці, у кімнаті, у коробці. Предмет перебуває всередині чогось.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'The keys are in the bag.', ru: 'Ключи внутри сумки.', uk: 'Ключі всередині сумки.', hi: 'in' },
            { en: 'The shop is between the two cafes.', ru: 'Магазин между двумя кафе.', uk: 'Магазин між двома кафе.', hi: 'between' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'The keys are',
            after: 'the bag',
            options: ['in', 'on', 'at'],
            answer: 'in',
            why: { ru: 'Ключи внутри сумки, поэтому in: The keys are in the bag.' },
          },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'on — на поверхности',
      titleUk: 'on — на поверхні',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'On означает «на поверхности»: предмет лежит сверху, касается поверхности — на столе, на стене, на полу.',
          uk: 'On означає «на поверхні»: предмет лежить зверху, торкається поверхні — на столі, на стіні, на підлозі.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'The phone is on the table.', ru: 'Телефон на столе.', uk: 'Телефон на столі.', hi: 'on' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно?' },
            optionA: 'The phone is in the table',
            optionB: 'The phone is on the table',
            correct: 'B',
            explain: { ru: 'Телефон лежит на поверхности стола, поэтому on, а не in.' },
          },
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'under и above — под и над',
      titleUk: 'under і above — під і над',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Under означает «под» — предмет ниже чего-то. Above означает «над» — предмет выше чего-то. Это пара противоположностей: верх и низ.',
          uk: 'Under означає «під» — предмет нижче чогось. Above означає «над» — предмет вище чогось. Це пара протилежностей: верх і низ.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'The cat is under the chair.', ru: 'Кот под стулом.', uk: 'Кіт під стільцем.', hi: 'under' },
            { en: 'The lamp is above the desk.', ru: 'Лампа над столом.', uk: 'Лампа над столом.', hi: 'above' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Кот под стулом.' },
            answer: ['The', 'cat', 'is', 'under', 'the', 'chair'],
            slotLabels: [{ ru: 'арт.' }, { ru: 'кто' }, { ru: 'связка' }, { ru: 'предлог' }, { ru: 'арт.' }, { ru: 'место' }],
            distractors: ['above', 'on'],
          },
        },
      ],
    },

    // ───────────────────────── 06 ─────────────────────────
    {
      num: '06',
      titleRu: 'next to и between — рядом и между',
      titleUk: 'next to і between — поряд і між',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Next to означает «рядом с» — сбоку от одного предмета. Between означает «между» — посередине, между двумя предметами.',
          uk: 'Next to означає «поряд з» — збоку від одного предмета. Between означає «між» — посередині, між двома предметами.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'She sits next to the window.', ru: 'Она сидит рядом с окном.', uk: 'Вона сидить поряд з вікном.', hi: 'next to' },
            { en: 'The shop is between the two cafes.', ru: 'Магазин между двумя кафе.', uk: 'Магазин між двома кафе.', hi: 'between' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Next to — рядом с одним предметом, between — между двумя. Between the two cafes — между двумя кафе.',
          uk: 'Next to — поряд з одним предметом, between — між двома. Between the two cafes — між двома кафе.',
        },
      ],
    },

    // ───────────────────────── 07 ─────────────────────────
    {
      num: '07',
      titleRu: 'behind, in front of, opposite — сзади, спереди, напротив',
      titleUk: 'behind, in front of, opposite — позаду, спереду, навпроти',
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'Behind означает «позади» — за предметом. In front of означает «перед» — впереди предмета. Opposite означает «напротив» — на противоположной стороне, лицом к лицу.',
          uk: 'Behind означає «позаду» — за предметом. In front of означає «перед» — попереду предмета. Opposite означає «навпроти» — на протилежному боці, обличчям до обличчя.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'He is standing behind the door.', ru: 'Он стоит позади двери.', uk: 'Він стоїть позаду дверей.', hi: 'behind' },
            { en: 'The car is in front of the house.', ru: 'Машина перед домом.', uk: 'Машина перед будинком.', hi: 'in front of' },
            { en: 'The school is opposite the park.', ru: 'Школа напротив парка.', uk: 'Школа навпроти парку.', hi: 'opposite' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'spot_slip',
            chips: ['The', 'car', 'is', 'in', 'front', 'in', 'the', 'house'],
            answerIndex: 5,
            hint: { ru: 'Тут лишнее слово. Тапни его.' },
            fix: { ru: 'Правильно: in front of the house. Второе in — лишнее, нужно of.' },
          },
        },
      ],
    },

    // ───────────────────────── 08 ─────────────────────────
    {
      num: '08',
      titleRu: 'at — в точке',
      titleUk: 'at — у точці',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'At означает «у» или «на» — точку, место встречи или конкретное место: на станции, у двери, в магазине. Это место как точка на карте, а не пространство внутри.',
          uk: 'At означає «у» або «на» — точку, місце зустрічі або конкретне місце: на станції, біля дверей, у магазині. Це місце як точка на карті, а не простір усередині.',
        },
        {
          kind: 'examples',
          examples: [
            { en: "I'm at the station.", ru: 'Я на станции.', uk: 'Я на станції.', hi: 'at' },
          ],
        },
        {
          kind: 'tip',
          ru: 'At — про точку или конкретное место: at the station. In — про пространство внутри: in the bag.',
          uk: 'At — про точку або конкретне місце: at the station. In — про простір усередині: in the bag.',
        },
      ],
    },

    // ───────────────────────── 09 ─────────────────────────
    {
      num: '09',
      titleRu: 'Самые частые ошибки',
      titleUk: 'Найчастіші помилки',
      blocks: [
        {
          kind: 'fix',
          fixes: [
            { wrong: 'The phone is in the table', right: 'The phone is on the table' },
            { wrong: 'The car is in front the house', right: 'The car is in front of the house' },
            { wrong: "I'm in the station", right: "I'm at the station" },
            { wrong: 'The school is opposite of the park', right: 'The school is opposite the park' },
          ],
        },
        {
          kind: 'tip',
          ru: 'On — на поверхности, in — внутри, at — в точке. И не забывай of в in front of, а вот opposite идёт без of.',
          uk: 'On — на поверхні, in — всередині, at — у точці. І не забувай of у in front of, а ось opposite іде без of.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: "I'm",
            after: 'the station',
            options: ['at', 'in', 'on'],
            answer: 'at',
            why: { ru: 'Станция — это точка / конкретное место, поэтому at: I’m at the station.' },
          },
        },
      ],
    },

    // ───────────────────────── 10 ─────────────────────────
    {
      num: '10',
      titleRu: 'Что нужно вынести из урока',
      titleUk: 'Що треба винести з уроку',
      blocks: [
        {
          kind: 'body',
          ru: 'Предлоги места показывают, где находится предмет, и стоят перед местом. in — внутри, on — на поверхности, at — в точке, under — под, above — над, next to — рядом, between — между, behind — позади, in front of — перед, opposite — напротив.',
          uk: 'Прийменники місця показують, де перебуває предмет, і стоять перед місцем. in — всередині, on — на поверхні, at — у точці, under — під, above — над, next to — поряд, between — між, behind — позаду, in front of — перед, opposite — навпроти.',
        },
        {
          kind: 'tip',
          ru: 'Самая частая тройка — in / on / at: внутри / на поверхности / в точке. Запомнишь её — остальные предлоги пойдут легко.',
          uk: 'Найчастіша трійка — in / on / at: всередині / на поверхні / у точці. Запам’ятаєш її — решта прийменників піде легко.',
        },
      ],
    },
  ] as L19Section[]) as unknown as L1Section[],
}
