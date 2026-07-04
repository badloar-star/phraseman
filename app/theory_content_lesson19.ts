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

export const LESSON19_THEORY: { titleRu: string; titleUk: string; titleEs: string; sections: L1Section[] } = {
  titleRu: 'Предлоги места',
  titleUk: 'Прийменники місця',
  titleEs: 'Preposiciones de lugar',
  sections: ([
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
          ru: 'В этом уроке ты учишься говорить, где находится предмет или человек. Для этого в английском есть предлоги места: in, on, under, above, next to, between, behind, in front of, opposite, at. Они стоят перед словом, которое называет место.',
          uk: 'У цьому уроці ти вчишся казати, де перебуває предмет або людина. Для цього в англійській є прийменники місця: in, on, under, above, next to, between, behind, in front of, opposite, at. Вони стоять перед словом, що називає місце.',
          es: 'En esta lección aprendes a decir dónde está un objeto o una persona. Para eso el inglés tiene preposiciones de lugar: in, on, under, above, next to, between, behind, in front of, opposite, at. Van delante de la palabra que nombra el lugar.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'The keys are in the bag.', ru: 'Ключи внутри сумки.', uk: 'Ключі всередині сумки.', es: 'Las llaves están dentro del bolso.', hi: 'in' },
            { en: 'The phone is on the table.', ru: 'Телефон на столе.', uk: 'Телефон на столі.', es: 'El teléfono está sobre la mesa.', hi: 'on' },
            { en: 'The cat is under the chair.', ru: 'Кот под стулом.', uk: 'Кіт під стільцем.', es: 'El gato está debajo de la silla.', hi: 'under' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Предлог места всегда идёт перед местом: in the bag, on the table, under the chair.',
          uk: 'Прийменник місця завжди йде перед місцем: in the bag, on the table, under the chair.',
          es: 'La preposición de lugar siempre va delante del lugar: in the bag, on the table, under the chair.',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Все предлоги места урока',
      titleUk: 'Усі прийменники місця уроку',
      titleEs: 'Todas las preposiciones de lugar de la lección',
      defaultOpen: true,
      exampleCount: 10,
      blocks: [
        {
          kind: 'body',
          ru: 'Вот все предлоги этого урока с их значением и примером. Запоминай не отдельное слово, а связку «предлог + что он показывает».',
          uk: 'Ось усі прийменники цього уроку з їхнім значенням і прикладом. Запам’ятовуй не окреме слово, а зв’язку «прийменник + що він показує».',
          es: 'Aquí tienes todas las preposiciones de esta lección con su significado y un ejemplo. Memoriza no la palabra suelta, sino el par «preposición + qué muestra».',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'The keys are in the bag.', ru: 'in — внутри', uk: 'in — всередині', es: 'in — dentro', hi: 'in' },
            { en: 'The phone is on the table.', ru: 'on — на поверхности', uk: 'on — на поверхні', es: 'on — sobre la superficie', hi: 'on' },
            { en: 'The cat is under the chair.', ru: 'under — под', uk: 'under — під', es: 'under — debajo de', hi: 'under' },
            { en: 'The lamp is above the desk.', ru: 'above — над', uk: 'above — над', es: 'above — encima de', hi: 'above' },
            { en: 'She sits next to the window.', ru: 'next to — рядом с', uk: 'next to — поряд з', es: 'next to — al lado de', hi: 'next to' },
            { en: 'The shop is between the two cafes.', ru: 'between — между', uk: 'between — між', es: 'between — entre', hi: 'between' },
            { en: 'He is standing behind the door.', ru: 'behind — позади', uk: 'behind — позаду', es: 'behind — detrás de', hi: 'behind' },
            { en: 'The car is in front of the house.', ru: 'in front of — перед', uk: 'in front of — перед', es: 'in front of — delante de', hi: 'in front of' },
            { en: 'The school is opposite the park.', ru: 'opposite — напротив', uk: 'opposite — навпроти', es: 'opposite — enfrente de', hi: 'opposite' },
            { en: "I'm at the station.", ru: 'at — у / на (в точке)', uk: 'at — біля / на (в точці)', es: 'at — en / junto a (en un punto)', hi: 'at' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Это словарь урока. Дальше разберём предлоги, которые чаще всего путают: in / on / at.',
          uk: 'Це словник уроку. Далі розберемо прийменники, які найчастіше плутають: in / on / at.',
          es: 'Este es el vocabulario de la lección. A continuación veremos las preposiciones que más se confunden: in / on / at.',
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'in — внутри',
      titleUk: 'in — всередині',
      titleEs: 'in — dentro',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'In означает «внутри», в закрытом или ограниченном пространстве: в сумке, в комнате, в коробке. Предмет находится внутри чего-то.',
          uk: 'In означає «всередині», у закритому або обмеженому просторі: у сумці, у кімнаті, у коробці. Предмет перебуває всередині чогось.',
          es: 'In significa «dentro», en un espacio cerrado o delimitado: dentro de un bolso, de una habitación, de una caja. El objeto está dentro de algo.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'The keys are in the bag.', ru: 'Ключи внутри сумки.', uk: 'Ключі всередині сумки.', es: 'Las llaves están dentro del bolso.', hi: 'in' },
            { en: 'The shop is between the two cafes.', ru: 'Магазин между двумя кафе.', uk: 'Магазин між двома кафе.', es: 'La tienda está entre las dos cafeterías.', hi: 'between' },
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
            why: { ru: 'Ключи внутри сумки, поэтому in: The keys are in the bag.', es: 'Las llaves están dentro del bolso, por eso in: The keys are in the bag.' },
          },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'on — на поверхности',
      titleUk: 'on — на поверхні',
      titleEs: 'on — sobre una superficie',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'On означает «на поверхности»: предмет лежит сверху, касается поверхности — на столе, на стене, на полу.',
          uk: 'On означає «на поверхні»: предмет лежить зверху, торкається поверхні — на столі, на стіні, на підлозі.',
          es: 'On significa «sobre una superficie»: el objeto está encima, toca la superficie — en la mesa, en la pared, en el suelo.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'The phone is on the table.', ru: 'Телефон на столе.', uk: 'Телефон на столі.', es: 'El teléfono está en la mesa.', hi: 'on' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно?', es: '¿Cuál es correcta?' },
            optionA: 'The phone is in the table',
            optionB: 'The phone is on the table',
            correct: 'B',
            explain: { ru: 'Телефон лежит на поверхности стола, поэтому on, а не in.', es: 'El teléfono está sobre la superficie de la mesa, por eso on y no in — en inglés se distinguen, aunque en español ambos sean «en».' },
          },
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'under и above — под и над',
      titleUk: 'under і above — під і над',
      titleEs: 'under y above — debajo y encima',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Under означает «под» — предмет ниже чего-то. Above означает «над» — предмет выше чего-то. Это пара противоположностей: верх и низ.',
          uk: 'Under означає «під» — предмет нижче чогось. Above означає «над» — предмет вище чогось. Це пара протилежностей: верх і низ.',
          es: 'Under significa «debajo de» — el objeto está más abajo. Above significa «encima de / por encima» — el objeto está más arriba. Son una pareja de opuestos: arriba y abajo.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'The cat is under the chair.', ru: 'Кот под стулом.', uk: 'Кіт під стільцем.', es: 'El gato está debajo de la silla.', hi: 'under' },
            { en: 'The lamp is above the desk.', ru: 'Лампа над столом.', uk: 'Лампа над столом.', es: 'La lámpara está encima del escritorio.', hi: 'above' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Кот под стулом.', es: 'El gato está debajo de la silla.' },
            answer: ['The', 'cat', 'is', 'under', 'the', 'chair'],
            slotLabels: [{ ru: 'арт.', es: 'art.' }, { ru: 'кто', es: 'quién' }, { ru: 'связка', es: 'verbo' }, { ru: 'предлог', es: 'preposición' }, { ru: 'арт.', es: 'art.' }, { ru: 'место', es: 'lugar' }],
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
      titleEs: 'next to y between — al lado y entre',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Next to означает «рядом с» — сбоку от одного предмета. Between означает «между» — посередине, между двумя предметами.',
          uk: 'Next to означає «поряд з» — збоку від одного предмета. Between означає «між» — посередині, між двома предметами.',
          es: 'Next to significa «al lado de» — junto a un objeto. Between significa «entre» — en medio de dos objetos.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'She sits next to the window.', ru: 'Она сидит рядом с окном.', uk: 'Вона сидить поряд з вікном.', es: 'Ella se sienta al lado de la ventana.', hi: 'next to' },
            { en: 'The shop is between the two cafes.', ru: 'Магазин между двумя кафе.', uk: 'Магазин між двома кафе.', es: 'La tienda está entre los dos cafés.', hi: 'between' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Next to — рядом с одним предметом, between — между двумя. Between the two cafes — между двумя кафе.',
          uk: 'Next to — поряд з одним предметом, between — між двома. Between the two cafes — між двома кафе.',
          es: 'Next to — al lado de un objeto; between — entre dos. Between the two cafes — entre los dos cafés.',
        },
      ],
    },

    // ───────────────────────── 07 ─────────────────────────
    {
      num: '07',
      titleRu: 'behind, in front of, opposite — сзади, спереди, напротив',
      titleUk: 'behind, in front of, opposite — позаду, спереду, навпроти',
      titleEs: 'behind, in front of, opposite — detrás, delante, enfrente',
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'Behind означает «позади» — за предметом. In front of означает «перед» — впереди предмета. Opposite означает «напротив» — на противоположной стороне, лицом к лицу.',
          uk: 'Behind означає «позаду» — за предметом. In front of означає «перед» — попереду предмета. Opposite означає «навпроти» — на протилежному боці, обличчям до обличчя.',
          es: 'Behind significa «detrás de» — tras el objeto. In front of significa «delante de» — frente al objeto. Opposite significa «enfrente de» — en el lado opuesto, cara a cara.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'He is standing behind the door.', ru: 'Он стоит позади двери.', uk: 'Він стоїть позаду дверей.', es: 'Él está de pie detrás de la puerta.', hi: 'behind' },
            { en: 'The car is in front of the house.', ru: 'Машина перед домом.', uk: 'Машина перед будинком.', es: 'El coche está delante de la casa.', hi: 'in front of' },
            { en: 'The school is opposite the park.', ru: 'Школа напротив парка.', uk: 'Школа навпроти парку.', es: 'La escuela está enfrente del parque.', hi: 'opposite' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'spot_slip',
            chips: ['The', 'car', 'is', 'in', 'front', 'in', 'the', 'house'],
            answerIndex: 5,
            hint: { ru: 'Тут лишнее слово. Тапни его.', es: 'Aquí sobra una palabra. Tócala.' },
            fix: { ru: 'Правильно: in front of the house. Второе in — лишнее, нужно of.', es: 'Correcto: in front of the house. El segundo in sobra; va of.' },
          },
        },
      ],
    },

    // ───────────────────────── 08 ─────────────────────────
    {
      num: '08',
      titleRu: 'at — в точке',
      titleUk: 'at — у точці',
      titleEs: 'at — en un punto',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'At означает «у» или «на» — точку, место встречи или конкретное место: на станции, у двери, в магазине. Это место как точка на карте, а не пространство внутри.',
          uk: 'At означає «у» або «на» — точку, місце зустрічі або конкретне місце: на станції, біля дверей, у магазині. Це місце як точка на карті, а не простір усередині.',
          es: 'At marca un punto, un lugar de encuentro o un sitio concreto: en la estación, en la puerta, en la tienda. Es el lugar como punto en el mapa, no el espacio interior.',
        },
        {
          kind: 'examples',
          examples: [
            { en: "I'm at the station.", ru: 'Я на станции.', uk: 'Я на станції.', es: 'Estoy en la estación.', hi: 'at' },
          ],
        },
        {
          kind: 'tip',
          ru: 'At — про точку или конкретное место: at the station. In — про пространство внутри: in the bag.',
          uk: 'At — про точку або конкретне місце: at the station. In — про простір усередині: in the bag.',
          es: 'At es un punto o lugar concreto: at the station. In es el espacio interior: in the bag. En español ambos suelen ser «en» — en inglés se distinguen.',
        },
      ],
    },

    // ───────────────────────── 09 ─────────────────────────
    {
      num: '09',
      titleRu: 'Самые частые ошибки',
      titleUk: 'Найчастіші помилки',
      titleEs: 'Los errores más frecuentes',
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
          es: 'On — sobre una superficie, in — dentro, at — en un punto. No olvides el of de in front of; en cambio opposite va sin of (aunque en español digamos «enfrente de»).',
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: "I'm",
            after: 'the station',
            options: ['at', 'in', 'on'],
            answer: 'at',
            why: { ru: 'Станция — это точка / конкретное место, поэтому at: I’m at the station.', es: 'La estación es un punto / lugar concreto, por eso at: I\'m at the station.' },
          },
        },
      ],
    },

    // ───────────────────────── 10 ─────────────────────────
    {
      num: '10',
      titleRu: 'Что нужно вынести из урока',
      titleUk: 'Що треба винести з уроку',
      titleEs: 'Lo que debes llevarte de la lección',
      blocks: [
        {
          kind: 'body',
          ru: 'Предлоги места показывают, где находится предмет, и стоят перед местом. in — внутри, on — на поверхности, at — в точке, under — под, above — над, next to — рядом, between — между, behind — позади, in front of — перед, opposite — напротив.',
          uk: 'Прийменники місця показують, де перебуває предмет, і стоять перед місцем. in — всередині, on — на поверхні, at — у точці, under — під, above — над, next to — поряд, between — між, behind — позаду, in front of — перед, opposite — навпроти.',
          es: 'Las preposiciones de lugar muestran dónde está el objeto y van antes del lugar. in — dentro, on — sobre una superficie, at — en un punto, under — debajo, above — encima, next to — al lado, between — entre, behind — detrás, in front of — delante, opposite — enfrente.',
        },
        {
          kind: 'tip',
          ru: 'Самая частая тройка — in / on / at: внутри / на поверхности / в точке. Запомнишь её — остальные предлоги пойдут легко.',
          uk: 'Найчастіша трійка — in / on / at: всередині / на поверхні / у точці. Запам’ятаєш її — решта прийменників піде легко.',
          es: 'El trío más frecuente es in / on / at: dentro / sobre una superficie / en un punto. Si lo dominas, el resto de preposiciones saldrá fácil.',
        },
      ],
    },
  ] as L19Section[]) as unknown as L1Section[],
}
