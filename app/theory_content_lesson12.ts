// Theory content for Lesson 12 (Past Simple — irregular verbs).
//
// Structured data source for the TheoryLessonView engine.
// Content is transferred from the legacy lesson_help.tsx HINTS[12].render
// (Table components) without grammar changes — verified against Cambridge/Oxford.
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk) variants.
// `hi` on an example is the form to highlight (V2 form / did / didn't).

import type { L1Block, L1Section } from './theory_content_lesson1';

export const LESSON12_THEORY: {
  titleRu: string;
  titleUk: string;
  titleEs: string;
  sections: L1Section[];
} = {
  titleRu: 'Past Simple — неправильные глаголы',
  titleUk: 'Past Simple — неправильні дієслова',
  titleEs: 'Past Simple — verbos irregulares',
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
          ru: 'В этом уроке ты учишься говорить о прошлом с неправильными глаголами. У таких глаголов вторая форма (V2) не образуется по правилу с -ed: go → went, see → saw, have → had. Эту форму нужно просто запомнить.',
          uk: 'У цьому уроці ти вчишся говорити про минуле з неправильними дієсловами. У таких дієслів друга форма (V2) не утворюється за правилом з -ed: go → went, see → saw, have → had. Цю форму треба просто запам’ятати.',
          es: 'En esta lección aprendes a hablar del pasado con verbos irregulares. En estos verbos, la segunda forma (V2) no se forma con la regla de -ed: go → went, see → saw, have → had. Esa forma hay que memorizarla tal cual.',
        } as L1Block,
        {
          kind: 'examples',
          examples: [
            { en: 'He went home.', ru: 'Он пошёл домой.', uk: 'Він пішов додому.', es: 'Él se fue a casa.', hi: 'went' },
            { en: 'I saw it.', ru: 'Я это видел.', uk: 'Я це бачив.', es: 'Yo lo vi.', hi: 'saw' },
            { en: 'We had time.', ru: 'У нас было время.', uk: 'У нас був час.', es: 'Tuvimos tiempo.', hi: 'had' },
          ],
        } as L1Block,
        {
          kind: 'tip',
          ru: 'Неправильные глаголы не подчиняются правилу -ed. Их вторую форму учат как отдельное слово.',
          uk: 'Неправильні дієслова не підкоряються правилу -ed. Їхню другу форму вчать як окреме слово.',
          es: 'Los verbos irregulares no siguen la regla de -ed. Su segunda forma se aprende como una palabra aparte.',
        } as L1Block,
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Три формы предложения: + − ?',
      titleUk: 'Три форми речення: + − ?',
      titleEs: 'Tres formas de la oración: + − ?',
      defaultOpen: true,
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'В Past Simple вторая форма глагола (V2) нужна только в утверждении. В отрицании и вопросе появляется did / didn’t, а сам глагол возвращается в начальную форму (V1).',
          uk: 'У Past Simple друга форма дієслова (V2) потрібна лише в ствердженні. У запереченні та питанні з’являється did / didn’t, а саме дієслово повертається до початкової форми (V1).',
          es: 'En Past Simple, la segunda forma del verbo (V2) hace falta solo en la afirmación. En la negación y en la pregunta aparece did / didn’t, y el verbo vuelve a su forma inicial (V1).',
        } as L1Block,
        {
          kind: 'formula',
          formula: ['Subject', 'V2', '(утверждение)'],
          formulaEs: ['Subject', 'V2', '(afirmación)'],
        } as L1Block,
        {
          kind: 'examples',
          examples: [
            { en: 'He went home.', ru: 'Утверждение: Subject + V2.', uk: 'Ствердження: Subject + V2.', es: 'Afirmación: Subject + V2.', hi: 'went' },
            { en: "He didn't go.", ru: "Отрицание: Subject + didn't + V1.", uk: "Заперечення: Subject + didn't + V1.", es: "Negación: Subject + didn't + V1.", hi: "didn't" },
            { en: 'Did he go?', ru: 'Вопрос: Did + subject + V1?', uk: 'Питання: Did + subject + V1?', es: 'Pregunta: Did + subject + V1?', hi: 'Did' },
          ],
        } as L1Block,
        {
          kind: 'tip',
          ru: 'V2 ставится только в утверждении. После did и didn’t глагол всегда в начальной форме: didn’t go, Did he go?',
          uk: 'V2 ставиться лише в ствердженні. Після did і didn’t дієслово завжди в початковій формі: didn’t go, Did he go?',
          es: 'V2 se usa solo en la afirmación. Después de did y didn’t el verbo va siempre en su forma inicial: didn’t go, Did he go?',
        } as L1Block,
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'He',
            after: 'go.',
            options: ["didn't", "doesn't", "isn't"],
            answer: "didn't",
            why: { ru: 'Отрицание в прошлом: Subject + didn’t + V1. Глагол go остаётся в начальной форме.', es: 'Negación en pasado: Subject + didn’t + V1. El verbo go se queda en su forma inicial.' },
          },
        } as unknown as L1Block,
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верный вопрос в прошедшем?', es: '¿Cuál es la pregunta correcta en pasado?' },
            optionA: 'Did he went?',
            optionB: 'Did he go?',
            correct: 'B',
            explain: { ru: 'После did глагол всегда в начальной форме: Did he go?', es: 'Después de did el verbo va siempre en su forma inicial: Did he go?' },
          },
        } as unknown as L1Block,
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Частые неправильные глаголы',
      titleUk: 'Часті неправильні дієслова',
      titleEs: 'Verbos irregulares frecuentes',
      exampleCount: 10,
      blocks: [
        {
          kind: 'body',
          ru: 'Вот десять самых частых неправильных глаголов. Слева — начальная форма (V1), справа — форма прошедшего времени (V2), которую нужно запомнить.',
          uk: 'Ось десять найчастіших неправильних дієслів. Ліворуч — початкова форма (V1), праворуч — форма минулого часу (V2), яку треба запам’ятати.',
          es: 'Aquí tienes los diez verbos irregulares más frecuentes. A la izquierda, la forma inicial (V1); a la derecha, la forma de pasado (V2), que hay que memorizar.',
        } as L1Block,
        {
          kind: 'examples',
          examples: [
            { en: 'go → went', ru: 'идти / ехать', uk: 'іти / їхати', es: 'ir', hi: 'went' },
            { en: 'come → came', ru: 'приходить', uk: 'приходити', es: 'venir', hi: 'came' },
            { en: 'see → saw', ru: 'видеть', uk: 'бачити', es: 'ver',
            'pt-BR': 'ver', hi: 'saw' },
            { en: 'get → got', ru: 'получать', uk: 'отримувати', es: 'conseguir', hi: 'got' },
            { en: 'have → had', ru: 'иметь', uk: 'мати', es: 'tener', hi: 'had' },
            { en: 'say → said', ru: 'говорить', uk: 'говорити', es: 'decir', hi: 'said' },
            { en: 'take → took', ru: 'брать', uk: 'брати', es: 'tomar', hi: 'took' },
            { en: 'know → knew', ru: 'знать', uk: 'знати', es: 'saber', hi: 'knew' },
            { en: 'think → thought', ru: 'думать', uk: 'думати', es: 'pensar', hi: 'thought' },
            { en: 'buy → bought', ru: 'покупать', uk: 'купувати', es: 'comprar', hi: 'bought' },
          ],
        } as L1Block,
        {
          kind: 'tip',
          ru: 'Учи парами V1 → V2: go → went, see → saw. Так форма прошедшего времени запоминается вместе со словом.',
          uk: 'Вчи парами V1 → V2: go → went, see → saw. Так форма минулого часу запам’ятовується разом зі словом.',
          es: 'Memorízalos en pares V1 → V2: go → went, see → saw. Así la forma de pasado se aprende junto con la palabra.',
        } as L1Block,
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'Yesterday I',
            after: 'it.',
            options: ['saw', 'seed', 'seen'],
            answer: 'saw',
            why: { ru: 'Прошедшая форма глагола see — saw. Это неправильный глагол, без -ed.', es: 'La forma de pasado del verbo see es saw. Es un verbo irregular, sin -ed.' },
          },
        } as unknown as L1Block,
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Он пошёл домой.', es: 'Él se fue a casa.' },
            answer: ['He', 'went', 'home'],
            slotLabels: [{ ru: 'кто', es: 'quién' }, { ru: 'глагол V2', es: 'verbo V2' }, { ru: 'куда', es: 'adónde' }],
            distractors: ['goed', 'go'],
          },
        } as unknown as L1Block,
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'Самые частые ошибки',
      titleUk: 'Найчастіші помилки',
      titleEs: 'Los errores más frecuentes',
      exampleCount: 0,
      blocks: [
        {
          kind: 'fix',
          fixes: [
            { wrong: 'He goed home.', right: 'He went home.' },
            { wrong: "He didn't went.", right: "He didn't go." },
            { wrong: 'Did he went?', right: 'Did he go?' },
            { wrong: 'I seed it.', right: 'I saw it.' },
          ],
        } as L1Block,
        {
          kind: 'tip',
          ru: 'He goed home → He went home: у go особая форма went, без -ed. He didn’t went → He didn’t go: после didn’t всегда V1. Did he went → Did he go: после did всегда V1.',
          uk: 'He goed home → He went home: у go особлива форма went, без -ed. He didn’t went → He didn’t go: після didn’t завжди V1. Did he went → Did he go: після did завжди V1.',
          es: 'He goed home → He went home: go tiene la forma especial went, sin -ed. He didn’t went → He didn’t go: después de didn’t siempre va V1. Did he went → Did he go: después de did siempre va V1.',
        } as L1Block,
      ],
    },
  ],
};
