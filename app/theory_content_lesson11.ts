// Theory content for Lesson 11 (Past Simple: regular verbs).
//
// This file is the structured data source for the TheoryLessonView engine.
// Content is transferred verbatim from the legacy lesson_help.tsx HINTS[11].render
// (Table components with form structures and spelling rules) without any grammar
// changes — the content is already verified against Cambridge/Oxford.
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk) variants.
// `hi` on an example is the Past Simple marker to highlight in the phrase
// (the -ed ending, didn't, or Did).

import type { L1Block, L1Section } from './theory_content_lesson1';

// Interactive drill block. The engine (TheoryBlock) already supports `kind: 'drill'`;
// L1Block from lesson 1 does not list it, so we extend the section locally to carry
// drills inline while reusing L1Section's shape for everything else.
interface L11DrillBlock {
  kind: 'drill';
  drill: { type: 'choice' | 'word_bank' | 'spot_slip' | 'binary'; [key: string]: unknown };
}

type L11Block = L1Block | L11DrillBlock;

interface L11Section extends Omit<L1Section, 'blocks'> {
  blocks: L11Block[];
}

export const LESSON11_THEORY: {
  titleRu: string;
  titleUk: string;
  titleEs: string;
  sections: L11Section[];
} = {
  titleRu: 'Past Simple — правильные глаголы',
  titleUk: 'Past Simple — правильні дієслова',
  titleEs: 'Past Simple — verbos regulares',
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
          ru: 'В этом уроке ты учишься говорить о прошлом с правильными глаголами в Past Simple. Правильный глагол в прошедшем времени получает окончание -ed: work → worked, play → played. Это окончание одинаково для всех лиц: I, you, he, she, it, we, they.',
          uk: 'У цьому уроці ти вчишся говорити про минуле з правильними дієсловами в Past Simple. Правильне дієслово в минулому часі отримує закінчення -ed: work → worked, play → played. Це закінчення однакове для всіх осіб: I, you, he, she, it, we, they.',
          es: 'En esta lección aprendes a hablar del pasado con verbos regulares en Past Simple. Un verbo regular en pasado recibe la terminación -ed: work → worked, play → played. Esta terminación es igual para todas las personas: I, you, he, she, it, we, they.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'She worked yesterday.', ru: 'Она работала вчера.', uk: 'Вона працювала вчора.', es: 'Ella trabajó ayer.', hi: 'worked' },
            { en: "She didn't work.", ru: 'Она не работала.', uk: 'Вона не працювала.', es: 'Ella no trabajó.', hi: "didn't" },
            { en: 'Did she work?', ru: 'Она работала?', uk: 'Вона працювала?', es: '¿Trabajó ella?', hi: 'Did' },
          ],
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Три формы: + − ?',
      titleUk: 'Три форми: + − ?',
      titleEs: 'Tres formas: + − ?',
      defaultOpen: true,
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'У Past Simple три формы. В утверждении глагол получает -ed. В отрицании ставится didn\'t, а сам глагол возвращается в начальную форму (без -ed). В вопросе в начало ставится Did, а глагол тоже в начальной форме.',
          uk: 'У Past Simple три форми. У ствердженні дієслово отримує -ed. У запереченні ставиться didn\'t, а саме дієслово повертається в початкову форму (без -ed). У питанні на початок ставиться Did, а дієслово теж у початковій формі.',
          es: 'Past Simple tiene tres formas. En la afirmación, el verbo recibe -ed. En la negación se pone didn\'t, y el verbo vuelve a su forma base (sin -ed). En la pregunta, Did va al principio, y el verbo también está en su forma base.',
        },
        {
          kind: 'formula',
          formula: ['Subject', '+ V-ed', '(+)'],
        },
        {
          kind: 'formula',
          formula: ['Subject', "+ didn't + V", '(−)'],
        },
        {
          kind: 'formula',
          formula: ['Did + subject', '+ V?', '(?)'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'She worked yesterday.', ru: '+ Subject + V-ed', uk: '+ Subject + V-ed', es: '+ Subject + V-ed', hi: 'worked' },
            { en: "She didn't work.", ru: "− Subject + didn't + V", uk: "− Subject + didn't + V", es: "− Subject + didn't + V", hi: "didn't" },
            { en: 'Did she work?', ru: '? Did + subject + V', uk: '? Did + subject + V', es: '? Did + subject + V', hi: 'Did' },
          ],
        },
        {
          kind: 'tip',
          ru: 'В отрицании и вопросе глагол НЕ берёт -ed. Did и didn\'t уже показывают прошедшее время, поэтому глагол остаётся в начальной форме: She didn\'t work (не worked), Did she work? (не worked).',
          uk: 'У запереченні та питанні дієслово НЕ бере -ed. Did і didn\'t уже показують минулий час, тому дієслово залишається в початковій формі: She didn\'t work (не worked), Did she work? (не worked).',
          es: 'En la negación y en la pregunta, el verbo NO lleva -ed. Did y didn\'t ya muestran el pasado, así que el verbo se queda en su forma base: She didn\'t work (no worked), Did she work? (no worked).',
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно?', es: '¿Dónde está correcto?' },
            optionA: "She didn't worked.",
            optionB: "She didn't work.",
            correct: 'B',
            explain: { ru: "После didn't глагол в начальной форме, без -ed.", es: "Después de didn't, el verbo va en forma base, sin -ed." },
          },
        },
        {
          kind: 'drill',
          drill: {
            type: 'spot_slip',
            chips: ['Did', 'she', 'worked', '?'],
            answerIndex: 2,
            hint: { ru: 'Одно слово в неверной форме. Тапни лишнее.', es: 'Una palabra está en la forma incorrecta. Toca la que sobra.' },
            fix: { ru: 'После Did глагол без -ed: Did she work?', es: 'Después de Did, el verbo va sin -ed: Did she work?' },
          },
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Правила написания -ed',
      titleUk: 'Правила написання -ed',
      titleEs: 'Reglas de escritura de -ed',
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'Окончание -ed добавляется по простым правилам написания. Большинство глаголов просто получают -ed. Если глагол оканчивается на -e, добавляется только -d. Если в конце согласная + y, то y меняется на ied. Если глагол заканчивается на «согласная + гласная + согласная» (CVC), последняя согласная удваивается.',
          uk: 'Закінчення -ed додається за простими правилами написання. Більшість дієслів просто отримують -ed. Якщо дієслово закінчується на -e, додається тільки -d. Якщо в кінці приголосна + y, то y змінюється на ied. Якщо дієслово закінчується на «приголосна + голосна + приголосна» (CVC), остання приголосна подвоюється.',
          es: 'La terminación -ed se añade siguiendo reglas de escritura sencillas. La mayoría de los verbos simplemente reciben -ed. Si el verbo termina en -e, se añade solo -d. Si al final hay consonante + y, la y cambia a ied. Si el verbo termina en «consonante + vocal + consonante» (CVC), la última consonante se duplica.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'work → worked, play → played', ru: 'Большинство + ed', uk: 'Більшість + ed', es: 'La mayoría + ed', hi: 'ed' },
            { en: 'like → liked, live → lived', ru: 'Оканч. на -e', uk: 'Закінч. на -e', es: 'Termina en -e', hi: 'ed' },
            { en: 'study → studied, cry → cried', ru: 'Согл. + y → ied', uk: 'Приголосна + y → ied', es: 'Consonante + y → ied', hi: 'ied' },
            { en: 'stop → stopped, plan → planned', ru: 'CVC → удвоить', uk: 'CVC → подвоїти', es: 'CVC → duplicar', hi: 'ed' },
          ],
        },
        {
          kind: 'tip',
          ru: 'CVC означает «согласная — гласная — согласная» в конце: stop, plan. Поэтому последняя буква удваивается: stopped, planned.',
          uk: 'CVC означає «приголосна — голосна — приголосна» в кінці: stop, plan. Тому остання літера подвоюється: stopped, planned.',
          es: 'CVC significa «consonante — vocal — consonante» al final: stop, plan. Por eso la última letra se duplica: stopped, planned.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'study →',
            after: '',
            options: ['studyed', 'studied', 'studyied'],
            answer: 'studied',
            why: { ru: 'Согласная + y → y меняется на ied: study → studied.', es: 'Consonante + y → la y cambia a ied: study → studied.' },
          },
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'stop →',
            after: '',
            options: ['stoped', 'stopped', 'stopd'],
            answer: 'stopped',
            why: { ru: 'CVC (stop) → последняя согласная удваивается: stopped.', es: 'CVC (stop) → la última consonante se duplica: stopped.' },
          },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'Частые ошибки',
      titleUk: 'Часті помилки',
      titleEs: 'Errores frecuentes',
      blocks: [
        {
          kind: 'fix',
          fixes: [
            { wrong: "She didn't worked", right: "She didn't work" },
            { wrong: 'Did she worked?', right: 'Did she work?' },
            { wrong: 'She work yesterday', right: 'She worked yesterday' },
            { wrong: 'studyed', right: 'studied' },
            { wrong: 'stoped', right: 'stopped' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Главная ошибка — оставить -ed в отрицании и вопросе. После didn\'t и после Did глагол всегда в начальной форме: didn\'t work, Did she work?',
          uk: 'Головна помилка — залишити -ed у запереченні та питанні. Після didn\'t і після Did дієслово завжди в початковій формі: didn\'t work, Did she work?',
          es: 'El error principal es dejar -ed en la negación y en la pregunta. Después de didn\'t y después de Did, el verbo siempre va en su forma base: didn\'t work, Did she work?',
        },
      ],
    },
  ],
};
