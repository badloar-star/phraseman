// Theory content for Lesson 27 (Reported Speech / косвенная речь).
//
// Structured data source for the TheoryLessonView engine. Content transferred
// from the legacy lesson_help.tsx HINTS[27].render (a tense-shift table and an
// examples table) and expanded into meaningful sections. Grammar is verified
// against Cambridge/Oxford usage of English reported speech (backshift of tenses,
// say vs ask, if/whether in reported questions).
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk).
// `hi` on an example is the form to highlight in the phrase (was / were / would /
// could / said / asked / if).

import type { L1Block } from './theory_content_lesson1'

/** Тип одного интерактива (как в движке теории). */
type L27DrillType = 'choice' | 'word_bank' | 'spot_slip' | 'binary'

/** Готовый интерактив теории. Структура повторяет TheoryDrill движка. */
interface L27Drill {
  type: L27DrillType
  [key: string]: unknown
}

/**
 * Блок секции урока 27. Расширяет L1Block видом 'drill' — движок теории
 * (TheoryBlock) поддерживает интерактивы, а узкий L1Block из урока 1 — нет.
 */
type L27Block =
  | L1Block
  | { kind: 'drill'; drill: L27Drill }

/** Секция урока 27 (как L1Section, но с поддержкой drill-блоков). */
interface L27Section {
  num: string
  titleRu: string
  titleUk: string
  titleEs: string
  exampleCount?: number
  defaultOpen?: boolean
  blocks: L27Block[]
}

export const LESSON27_THEORY: { titleRu: string; titleUk: string; titleEs: string; sections: L27Section[] } = {
  titleRu: 'Косвенная речь',
  titleUk: 'Непряма мова',
  titleEs: 'Estilo indirecto',
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
          ru: 'В этом уроке ты учишься передавать чужие слова: не цитировать их, а пересказывать. Это называется косвенная речь. Главное правило: когда ты пересказываешь, время глагола обычно сдвигается на шаг в прошлое. Present превращается в Past, will — в would, can — в could.',
          uk: 'У цьому уроці ти вчишся передавати чужі слова: не цитувати їх, а переказувати. Це називається непряма мова. Головне правило: коли ти переказуєш, час дієслова зазвичай зміщується на крок у минуле. Present перетворюється на Past, will — на would, can — на could.',
          es: 'En esta lección aprendes a transmitir las palabras de otra persona: no citarlas, sino contarlas de nuevo. Esto se llama estilo indirecto. La regla principal: cuando lo cuentas de nuevo, el tiempo verbal suele retroceder un paso. Present se convierte en Past, will en would, can en could.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'He said he was tired.', ru: 'Он сказал, что устал.', uk: 'Він сказав, що втомився.', es: 'Dijo que estaba cansado.', hi: 'was' },
            { en: 'She said she would call me.', ru: 'Она сказала, что позвонит мне.', uk: 'Вона сказала, що зателефонує мені.', es: 'Ella dijo que me llamaría.', hi: 'would' },
            { en: 'He said he could swim.', ru: 'Он сказал, что умеет плавать.', uk: 'Він сказав, що вміє плавати.', es: 'Dijo que sabía nadar.', hi: 'could' },
            { en: 'She asked if I worked there.', ru: 'Она спросила, работаю ли я там.', uk: 'Вона запитала, чи працюю я там.', es: 'Ella preguntó si yo trabajaba allí.', hi: 'if' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Косвенная речь — это пересказ. Не нужны кавычки, а время глагола обычно уходит на шаг в прошлое.',
          uk: 'Непряма мова — це переказ. Не потрібні лапки, а час дієслова зазвичай іде на крок у минуле.',
          es: 'El estilo indirecto es un relato. No hacen falta comillas, y el tiempo verbal suele retroceder un paso.',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Сдвиг времён',
      titleUk: 'Зміщення часів',
      titleEs: 'El retroceso de los tiempos',
      defaultOpen: true,
      exampleCount: 6,
      blocks: [
        {
          kind: 'body',
          ru: 'Когда главный глагол стоит в прошлом (said, asked), время в пересказе сдвигается назад. Вот основные пары: что было в прямой речи и во что оно превращается в косвенной.',
          uk: 'Коли головне дієслово стоїть у минулому (said, asked), час у переказі зміщується назад. Ось основні пари: що було в прямій мові і на що воно перетворюється в непрямій.',
          es: 'Cuando el verbo principal está en pasado (said, asked), el tiempo verbal en el relato retrocede. Aquí están los pares principales: qué había en el estilo directo y en qué se convierte en el indirecto.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Present Simple → Past Simple', ru: 'настоящее простое → прошедшее простое', uk: 'теперішній простий → минулий простий', es: 'presente simple → pasado simple' },
            { en: 'Present Continuous → Past Continuous', ru: 'настоящее длительное → прошедшее длительное', uk: 'теперішній тривалий → минулий тривалий', es: 'presente continuo → pasado continuo' },
            { en: 'Past Simple → Past Perfect', ru: 'прошедшее простое → прошедшее совершенное', uk: 'минулий простий → минулий доконаний', es: 'pasado simple → pluscuamperfecto' },
            { en: 'will → would', ru: 'will → would', uk: 'will → would', es: 'will → would', hi: 'would' },
            { en: 'can → could', ru: 'can → could', uk: 'can → could', es: 'can → could', hi: 'could' },
            { en: 'am / is / are → was / were', ru: 'am / is / are → was / were', uk: 'am / is / are → was / were', es: 'am / is / are → was / were', hi: 'was' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Простое правило: всё «настоящее» становится «прошлым» на один шаг назад. is → was, will → would, can → could.',
          uk: 'Просте правило: усе «теперішнє» стає «минулим» на один крок назад. is → was, will → would, can → could.',
          es: 'Regla simple: todo lo «presente» se convierte en «pasado» un paso hacia atrás. is → was, will → would, can → could.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'He said he',
            after: 'tired.',
            options: ['is', 'was', 'be'],
            answer: 'was',
            why: { ru: 'После said время сдвигается назад: is → was. He said he was tired.', es: 'Después de said el tiempo retrocede: is → was. He said he was tired.' },
          },
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'is / are → was / were',
      titleUk: 'is / are → was / were',
      titleEs: 'is / are → was / were',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'Если в прямой речи человек говорит про настоящее с am, is или are, то в пересказе оно превращается в was или were. «I am tired» становится «He said he was tired».',
          uk: 'Якщо в прямій мові людина каже про теперішнє з am, is або are, то в переказі воно перетворюється на was або were. «I am tired» стає «He said he was tired».',
          es: 'Si en el estilo directo la persona habla del presente con am, is o are, en el relato se convierte en was o were. «I am tired» se convierte en «He said he was tired».',
        },
        {
          kind: 'examples',
          examples: [
            { en: '"I am tired." → He said he was tired.', ru: '«Я устал.» → Он сказал, что устал.', uk: '«Я втомився.» → Він сказав, що втомився.', es: '«Estoy cansado.» → Dijo que estaba cansado.', hi: 'was' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно?', es: '¿Dónde está correcto?' },
            optionA: 'He said he is tired',
            optionB: 'He said he was tired',
            correct: 'B',
            explain: { ru: 'После said is превращается в was: He said he was tired.', es: 'Después de said, is se convierte en was: He said he was tired.' },
          },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'will → would',
      titleUk: 'will → would',
      titleEs: 'will → would',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'Если в прямой речи есть will (будущее), то в косвенной речи оно превращается в would. «I will call you» становится «She said she would call me».',
          uk: 'Якщо в прямій мові є will (майбутнє), то в непрямій мові воно перетворюється на would. «I will call you» стає «She said she would call me».',
          es: 'Si en el estilo directo hay will (futuro), en el estilo indirecto se convierte en would. «I will call you» se convierte en «She said she would call me».',
        },
        {
          kind: 'examples',
          examples: [
            { en: '"I will call you." → She said she would call me.', ru: '«Я тебе позвоню.» → Она сказала, что позвонит мне.', uk: '«Я тобі зателефоную.» → Вона сказала, що зателефонує мені.', es: '«Te llamaré.» → Ella dijo que me llamaría.', hi: 'would' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Она сказала, что позвонит мне.', es: 'Ella dijo que me llamaría.' },
            answer: ['She', 'said', 'she', 'would', 'call', 'me'],
            slotLabels: [{ ru: 'кто', es: 'quién' }, { ru: 'сказала', es: 'dijo' }, { ru: 'кто', es: 'quién' }, { ru: 'will → would', es: 'will → would' }, { ru: 'глагол', es: 'verbo' }, { ru: 'кому', es: 'a quién' }],
            distractors: ['will', 'me?'],
          },
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'can → could',
      titleUk: 'can → could',
      titleEs: 'can → could',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'Если в прямой речи есть can (умение, возможность), то в пересказе оно становится could. «I can swim» превращается в «He said he could swim».',
          uk: 'Якщо в прямій мові є can (вміння, можливість), то в переказі воно стає could. «I can swim» перетворюється на «He said he could swim».',
          es: 'Si en el estilo directo hay can (habilidad, posibilidad), en el relato se convierte en could. «I can swim» se convierte en «He said he could swim».',
        },
        {
          kind: 'examples',
          examples: [
            { en: '"I can swim." → He said he could swim.', ru: '«Я умею плавать.» → Он сказал, что умеет плавать.', uk: '«Я вмію плавати.» → Він сказав, що вміє плавати.', es: '«Sé nadar.» → Dijo que sabía nadar.', hi: 'could' },
          ],
        },
      ],
    },

    // ───────────────────────── 06 ─────────────────────────
    {
      num: '06',
      titleRu: 'Вопросы: if / whether',
      titleUk: 'Питання: if / whether',
      titleEs: 'Preguntas: if / whether',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'Когда ты пересказываешь вопрос «да / нет», используй asked и слово if («ли»). Порядок слов становится как в обычном предложении, без do / does, а время тоже сдвигается назад. «Do you work here?» становится «She asked if I worked there».',
          uk: 'Коли ти переказуєш питання «так / ні», використовуй asked і слово if («чи»). Порядок слів стає як у звичайному реченні, без do / does, а час теж зміщується назад. «Do you work here?» стає «She asked if I worked there».',
          es: 'Cuando cuentas de nuevo una pregunta de «sí / no», usa asked y la palabra if («si»). El orden de las palabras se vuelve como en una oración normal, sin do / does, y el tiempo también retrocede. «Do you work here?» se convierte en «She asked if I worked there».',
        },
        {
          kind: 'examples',
          examples: [
            { en: '"Do you work here?" → She asked if I worked there.', ru: '«Ты здесь работаешь?» → Она спросила, работаю ли я там.', uk: '«Ти тут працюєш?» → Вона запитала, чи працюю я там.', es: '«¿Trabajas aquí?» → Ella preguntó si yo trabajaba allí.', hi: 'if' },
          ],
        },
        {
          kind: 'tip',
          ru: 'В пересказанном вопросе нет do / does и нет вопросительного порядка слов: не «asked do I work», а «asked if I worked».',
          uk: 'У переказаному питанні немає do / does і немає питального порядку слів: не «asked do I work», а «asked if I worked».',
          es: 'En la pregunta contada de nuevo no hay do / does ni orden interrogativo de palabras: no «asked do I work», sino «asked if I worked».',
        },
        {
          kind: 'drill',
          drill: {
            type: 'spot_slip',
            chips: ['She', 'asked', 'if', 'do', 'I', 'worked', 'there'],
            answerIndex: 3,
            hint: { ru: 'Тут лишнее слово. Тапни его.', es: 'Aquí sobra una palabra. Tócala.' },
            fix: { ru: 'В пересказанном вопросе нет do: She asked if I worked there.', es: 'En la pregunta contada de nuevo no hay do: She asked if I worked there.' },
          },
        },
      ],
    },

    // ───────────────────────── 07 ─────────────────────────
    {
      num: '07',
      titleRu: 'Что нужно вынести из урока',
      titleUk: 'Що треба винести з уроку',
      titleEs: 'Qué debes recordar de esta lección',
      blocks: [
        {
          kind: 'body',
          ru: 'Косвенная речь — это пересказ чужих слов. После said и asked время сдвигается на шаг назад: is → was, will → would, can → could, Present → Past. В пересказанных вопросах добавляй if и убирай do / does.',
          uk: 'Непряма мова — це переказ чужих слів. Після said і asked час зміщується на крок назад: is → was, will → would, can → could, Present → Past. У переказаних питаннях додавай if і прибирай do / does.',
          es: 'El estilo indirecto es el relato de las palabras de otra persona. Después de said y asked el tiempo retrocede un paso: is → was, will → would, can → could, Present → Past. En las preguntas contadas de nuevo agrega if y quita do / does.',
        },
        {
          kind: 'tip',
          ru: 'Держи одну схему: He said (that) + предложение со сдвинутым временем. He said he was tired. She said she would call me.',
          uk: 'Тримай одну схему: He said (that) + речення зі зміщеним часом. He said he was tired. She said she would call me.',
          es: 'Recuerda un esquema: He said (that) + oración con el tiempo retrocedido. He said he was tired. She said she would call me.',
        },
      ],
    },
  ],
}
