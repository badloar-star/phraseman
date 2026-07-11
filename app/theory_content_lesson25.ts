// Theory content for Lesson 25 (Past Continuous).
//
// Structured data source for the TheoryLessonView engine.
// Content is transferred from the legacy lesson_help.tsx THEORY[25].render
// (Table / Body / Tip / Warn components) without grammar changes —
// the grammar is verified against Cambridge/Oxford for Past Continuous.
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk).
// `hi` on an example is the Past Continuous form (was / were / V-ing) to highlight.

import type { L1Section } from './theory_content_lesson1'

export const LESSON25_THEORY: { titleRu: string; titleUk: string; titleEs: string; sections: L1Section[] } = {
  titleRu: 'Past Continuous',
  titleUk: 'Past Continuous',
  titleEs: 'Past Continuous',
  sections: [
    // ───────────────────────── 01 ─────────────────────────
    {
      num: '01',
      titleRu: 'Что ты тренируешь в этом уроке',
      titleUk: 'Що ти тренуєш у цьому уроці',
      titleEs: 'Qué vas a entrenar en esta lección',
      defaultOpen: true,
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'Past Continuous показывает действие, которое длилось в какой-то момент в прошлом — оно шло, было в процессе. Строится оно так: кто + was или were + глагол с окончанием -ing.',
          uk: 'Past Continuous показує дію, яка тривала в якийсь момент у минулому — вона йшла, була в процесі. Будується так: хто + was або were + дієслово із закінченням -ing.',
          es: 'Past Continuous muestra una acción que estaba en curso en algún momento del pasado — estaba pasando, en proceso. Se forma así: sujeto + was o were + verbo con la terminación -ing.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'She was working at 8pm.', ru: 'Она работала в 8 вечера.', uk: 'Вона працювала о 8 вечора.', es: 'Ella estaba trabajando a las 8 de la tarde.', hi: 'was working' },
            { en: 'At 9pm I was reading.', ru: 'В 9 вечера я читал.', uk: 'О 9 вечора я читав.', es: 'A las 9 de la tarde yo estaba leyendo.', hi: 'was reading' },
            { en: 'Were they watching TV?', ru: 'Они смотрели телевизор?', uk: 'Вони дивилися телевізор?', es: '¿Estaban ellos viendo la tele?', hi: 'Were' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Главное отличие от Past Simple: тут важно не «что случилось», а «что шло, длилось» в нужный момент.',
          uk: 'Головна відмінність від Past Simple: тут важливо не «що сталося», а «що йшло, тривало» у потрібний момент.',
          es: 'La diferencia clave con Past Simple: aquí importa no «qué pasó», sino «qué estaba pasando, en curso» en ese momento concreto.',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Главная формула',
      titleUk: 'Головна формула',
      titleEs: 'La fórmula principal',
      defaultOpen: true,
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'Формула короткая: кто + was/were + глагол с -ing. Was идёт с I, he, she, it. Were идёт с you, we, they.',
          uk: 'Формула коротка: хто + was/were + дієслово з -ing. Was іде з I, he, she, it. Were іде з you, we, they.',
          es: 'La fórmula es corta: sujeto + was/were + verbo con -ing. Was va con I, he, she, it. Were va con you, we, they.',
        },
        {
          kind: 'formula',
          formula: ['кто / что', 'was / were', 'глагол + -ing'],
          formulaEs: ['sujeto', 'was / were', 'verbo + -ing'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'She was working at 8pm.', ru: 'Она работала в 8 вечера.', uk: 'Вона працювала о 8 вечора.', es: 'Ella estaba trabajando a las 8 de la tarde.', hi: 'was working' },
            { en: 'At 9pm I was reading.', ru: 'В 9 вечера я читал.', uk: 'О 9 вечора я читав.', es: 'A las 9 de la tarde yo estaba leyendo.', hi: 'was reading' },
            { en: 'While he cooked, she was cleaning.', ru: 'Пока он готовил, она убиралась.', uk: 'Поки він готував, вона прибирала.', es: 'Mientras él cocinaba, ella estaba limpiando.', hi: 'was cleaning' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'She',
            after: 'working at 8pm',
            options: ['was', 'were', 'is'],
            answer: 'was',
            why: { ru: 'С she нужно was: She was working at 8pm.', es: 'Con she se usa was: She was working at 8pm.' },
          },
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Три формы: +, −, ?',
      titleUk: 'Три форми: +, −, ?',
      titleEs: 'Tres formas: +, −, ?',
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'У Past Continuous три формы. Утверждение: was/were + V-ing. Отрицание: wasn’t/weren’t + V-ing. Вопрос: Was/Were + кто + V-ing?',
          uk: 'У Past Continuous три форми. Ствердження: was/were + V-ing. Заперечення: wasn’t/weren’t + V-ing. Питання: Was/Were + хто + V-ing?',
          es: 'Past Continuous tiene tres formas. Afirmación: was/were + V-ing. Negación: wasn\'t/weren\'t + V-ing. Pregunta: Was/Were + sujeto + V-ing?',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'She was working at 8pm.', ru: 'Она работала в 8 вечера.', uk: 'Вона працювала о 8 вечора.', es: 'Ella estaba trabajando a las 8 de la tarde.', hi: 'was working' },
            { en: "He wasn't sleeping.", ru: 'Он не спал.', uk: 'Він не спав.', es: 'Él no estaba durmiendo.', hi: "wasn't sleeping" },
            { en: 'Were they watching TV?', ru: 'Они смотрели телевизор?', uk: 'Вони дивилися телевізор?', es: '¿Estaban ellos viendo la tele?', hi: 'Were' },
          ],
        },
        {
          kind: 'tip',
          ru: 'В вопросе was или were ставится перед тем, кто действует: Were they watching TV?',
          uk: 'У питанні was або were ставиться перед тим, хто діє: Were they watching TV?',
          es: 'En la pregunta, was o were se coloca antes del sujeto: Were they watching TV?',
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно?', es: '¿Cuál es correcto?' },
            optionA: 'He not sleeping',
            optionB: "He wasn't sleeping",
            correct: 'B',
            explain: { ru: 'Отрицание строится через wasn’t/weren’t + V-ing.', es: 'La negación se forma con wasn\'t/weren\'t + V-ing.' },
          },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'Действие длилось в определённый момент',
      titleUk: 'Дія тривала в певний момент',
      titleEs: 'La acción estaba en curso en un momento concreto',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'Первое применение: показать, что действие шло в конкретный момент прошлого. Часто рядом стоит точное время: at 8pm, at 9pm.',
          uk: 'Перше застосування: показати, що дія йшла в конкретний момент минулого. Часто поруч стоїть точний час: at 8pm, at 9pm.',
          es: 'Primer uso: mostrar que una acción estaba en curso en un momento concreto del pasado. Suele acompañarse de una hora exacta: at 8pm, at 9pm.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'At 9pm I was reading.', ru: 'В 9 вечера я читал.', uk: 'О 9 вечора я читав.', es: 'A las 9 de la tarde yo estaba leyendo.', hi: 'was reading' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'В 9 вечера я читал.', es: 'A las 9 de la tarde yo estaba leyendo.' },
            answer: ['At', '9pm', 'I', 'was', 'reading'],
            slotLabels: [{ ru: 'когда', es: 'cuándo' }, { ru: 'время', es: 'hora' }, { ru: 'кто', es: 'sujeto' }, { ru: 'связка', es: 'verbo auxiliar' }, { ru: 'глагол -ing', es: 'verbo -ing' }],
            distractors: ['were', 'read'],
          },
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'Действие прервалось (when)',
      titleUk: 'Дія перервалась (when)',
      titleEs: 'La acción se interrumpió (when)',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'Второе применение: длинное действие шло, и его прервало короткое. Длинное — в Past Continuous, короткое — после when в Past Simple.',
          uk: 'Друге застосування: довга дія йшла, і її перервала коротка. Довга — у Past Continuous, коротка — після when у Past Simple.',
          es: 'Segundo uso: una acción larga estaba en curso y otra corta la interrumpió. La larga va en Past Continuous, la corta va después de when en Past Simple.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I was reading when she called.', ru: 'Я читал, когда она позвонила.', uk: 'Я читав, коли вона подзвонила.', es: 'Yo estaba leyendo cuando ella llamó.', hi: 'was reading' },
          ],
        },
        {
          kind: 'tip',
          ru: 'То, что длилось, — в Past Continuous (was reading). То, что вдруг случилось, — в Past Simple (called).',
          uk: 'Те, що тривало, — у Past Continuous (was reading). Те, що раптом сталося, — у Past Simple (called).',
          es: 'Lo que estaba en curso va en Past Continuous (was reading). Lo que ocurrió de repente va en Past Simple (called).',
        },
      ],
    },

    // ───────────────────────── 06 ─────────────────────────
    {
      num: '06',
      titleRu: 'Два параллельных действия (while)',
      titleUk: 'Дві паралельні дії (while)',
      titleEs: 'Dos acciones paralelas (while)',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'Третье применение: два действия шли одновременно. Их соединяет while — «пока, в то время как».',
          uk: 'Третє застосування: дві дії йшли одночасно. Їх з’єднує while — «поки, у той час як».',
          es: 'Tercer uso: dos acciones estaban en curso al mismo tiempo. Se unen con while — «mientras».',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'While he cooked, she was cleaning.', ru: 'Пока он готовил, она убиралась.', uk: 'Поки він готував, вона прибирала.', es: 'Mientras él cocinaba, ella estaba limpiando.', hi: 'was cleaning' },
          ],
        },
        {
          kind: 'tip',
          ru: 'While показывает, что два действия шли в одно и то же время.',
          uk: 'While показує, що дві дії йшли в той самий час.',
          es: 'While muestra que dos acciones estaban en curso al mismo tiempo.',
        },
      ],
    },

    // ───────────────────────── 07 ─────────────────────────
    {
      num: '07',
      titleRu: 'Самые частые ошибки',
      titleUk: 'Найчастіші помилки',
      titleEs: 'Los errores más comunes',
      blocks: [
        {
          kind: 'fix',
          fixes: [
            { wrong: 'She working at 8pm', right: 'She was working at 8pm' },
            { wrong: 'They was watching TV', right: 'They were watching TV' },
            { wrong: 'He wasn’t slept', right: "He wasn't sleeping" },
            { wrong: 'I was read when she called', right: 'I was reading when she called' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Не забывай два кусочка: was/were и глагол с -ing. Без одного из них Past Continuous не получится.',
          uk: 'Не забувай два шматочки: was/were і дієслово з -ing. Без одного з них Past Continuous не вийде.',
          es: 'No olvides las dos piezas: was/were y el verbo con -ing. Sin una de ellas, Past Continuous no funciona.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'spot_slip',
            chips: ['They', 'was', 'watching', 'TV'],
            answerIndex: 1,
            hint: { ru: 'Тут не та форма. Тапни лишнее слово.', es: 'Aquí la forma no es correcta. Toca la palabra sobrante.' },
            fix: { ru: 'С they нужно were: They were watching TV.', es: 'Con they se usa were: They were watching TV.' },
          },
        },
      ],
    },

    // ───────────────────────── 08 ─────────────────────────
    {
      num: '08',
      titleRu: 'Что нужно вынести из урока',
      titleUk: 'Що треба винести з уроку',
      titleEs: 'Qué debes llevarte de esta lección',
      blocks: [
        {
          kind: 'body',
          ru: 'Past Continuous = was/were + глагол с -ing. Он показывает действие в процессе: оно длилось в момент прошлого, прервалось коротким действием (when) или шло параллельно с другим (while).',
          uk: 'Past Continuous = was/were + дієслово з -ing. Він показує дію в процесі: вона тривала в момент минулого, перервалася короткою дією (when) або йшла паралельно з іншою (while).',
          es: 'Past Continuous = was/were + verbo con -ing. Muestra una acción en proceso: estaba en curso en un momento del pasado, la interrumpió una acción corta (when) o iba en paralelo con otra (while).',
        },
        {
          kind: 'tip',
          ru: 'Держи в голове три примера: She was working at 8pm. I was reading when she called. While he cooked, she was cleaning.',
          uk: 'Тримай у голові три приклади: She was working at 8pm. I was reading when she called. While he cooked, she was cleaning.',
          es: 'Ten en mente estos tres ejemplos: She was working at 8pm. I was reading when she called. While he cooked, she was cleaning.',
        },
      ],
    },
  ],
}
