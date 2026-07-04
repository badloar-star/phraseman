// Theory content for Lesson 4 (Present Simple: negation and questions).
//
// Structured data source for the TheoryLessonView engine.
// Content is transferred verbatim from the legacy lesson_help.tsx HINTS[4].render
// (Table components) without any grammar changes. The two source tables are the
// structure table (subject / negation / question) and the examples table
// (affirmation -> negation). Drills are added on top, using only phrases that
// appear in this lesson's content, with grammar verified against Cambridge.
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk) variants.
// `hi` on an example is the auxiliary form (don't / doesn't / Do / Does) to
// highlight in the phrase.

import type { L1Block, L1Section } from './theory_content_lesson1'

export const LESSON4_THEORY: { titleRu: string; titleUk: string; titleEs: string; sections: L1Section[] } = {
  titleRu: 'Present Simple — отрицание и вопрос',
  titleUk: 'Present Simple — заперечення і питання',
  titleEs: 'Present Simple — negación y pregunta',
  sections: [
    // ───────────────────────── 01 ─────────────────────────
    {
      num: '01',
      titleRu: 'don\'t и doesn\'t: как сказать «не»',
      titleUk: 'don\'t і doesn\'t: як сказати «не»',
      titleEs: 'don\'t y doesn\'t: cómo decir "no"',
      defaultOpen: true,
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Чтобы построить отрицание в Present Simple, нужен помощник do или does, а после него отрицательная часть not. С I, you, we, they берётся don\'t. С he, she, it берётся doesn\'t. После помощника глагол всегда стоит в начальной форме.',
          uk: 'Щоб побудувати заперечення в Present Simple, потрібен помічник do або does, а після нього заперечна частина not. З I, you, we, they береться don\'t. З he, she, it береться doesn\'t. Після помічника дієслово завжди стоїть у початковій формі.',
          es: 'Para formar la negación en Present Simple hace falta el auxiliar do o does, y después la partícula negativa not. Con I, you, we, they se usa don\'t. Con he, she, it se usa doesn\'t. Después del auxiliar, el verbo siempre va en su forma base.',
        },
        {
          kind: 'formula',
          formula: ['I / You / We / They', 'don\'t', '+ глагол'],
          formulaEs: ['I / You / We / They', 'don\'t', '+ verbo'],
        },
        {
          kind: 'formula',
          formula: ['He / She / It', 'doesn\'t', '+ глагол'],
          formulaEs: ['He / She / It', 'doesn\'t', '+ verbo'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I / You / We / They — don\'t + V', ru: 'отрицание с don\'t', uk: 'заперечення з don\'t', es: 'negación con don\'t', hi: 'don\'t' },
            { en: 'He / She / It — doesn\'t + V', ru: 'отрицание с doesn\'t', uk: 'заперечення з doesn\'t', es: 'negación con doesn\'t', hi: 'doesn\'t' },
          ],
        },
        {
          kind: 'tip',
          ru: 'После doesn\'t глагол теряет окончание -s, потому что -s «уходит» в does: She doesn\'t read (не reads).',
          uk: 'Після doesn\'t дієслово втрачає закінчення -s, бо -s «йде» в does: She doesn\'t read (не reads).',
          es: 'Después de doesn\'t el verbo pierde la terminación -s, porque la -s ya "se fue" a does: She doesn\'t read (no reads).',
        },
        {
          kind: 'drill',
          drill: { type: 'choice', before: 'She', after: 'read books.', options: ['don\'t', 'doesn\'t'], answer: 'doesn\'t', why: { ru: 'She — это he/she/it, поэтому отрицание идёт через doesn\'t.', es: 'She es he/she/it, así que la negación se hace con doesn\'t.' } },
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Отрицание: примеры',
      titleUk: 'Заперечення: приклади',
      titleEs: 'Negación: ejemplos',
      defaultOpen: true,
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'Сравни утверждение и отрицание. Видно, что в отрицании появляется don\'t или doesn\'t, а глагол возвращается в начальную форму.',
          uk: 'Порівняй ствердження і заперечення. Видно, що в запереченні з\'являється don\'t або doesn\'t, а дієслово повертається в початкову форму.',
          es: 'Compara la afirmación y la negación. Se ve que en la negación aparece don\'t o doesn\'t, y el verbo vuelve a su forma base.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I don\'t work here.', ru: 'Утверждение: I work here.', uk: 'Ствердження: I work here.', es: 'Afirmación: I work here.', hi: 'don\'t' },
            { en: 'She doesn\'t read.', ru: 'Утверждение: She reads books.', uk: 'Ствердження: She reads books.', es: 'Afirmación: She reads books.', hi: 'doesn\'t' },
            { en: 'They don\'t play.', ru: 'Утверждение: They play tennis.', uk: 'Ствердження: They play tennis.', es: 'Afirmación: They play tennis.', hi: 'don\'t' },
          ],
        },
        {
          kind: 'fix',
          fixes: [
            { wrong: 'She doesn\'t reads.', right: 'She doesn\'t read.' },
            { wrong: 'They doesn\'t play.', right: 'They don\'t play.' },
          ],
        },
        {
          kind: 'drill',
          drill: { type: 'spot_slip', chips: ['She', 'doesn\'t', 'reads'], answerIndex: 2, hint: { ru: 'Тут не та форма. Тапни лишнее слово.', es: 'Aquí la forma no es correcta. Toca la palabra sobrante.' }, fix: { ru: 'После doesn\'t глагол без -s: She doesn\'t read.', es: 'Después de doesn\'t el verbo va sin -s: She doesn\'t read.' } },
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Do и Does: как задать вопрос',
      titleUk: 'Do і Does: як поставити питання',
      titleEs: 'Do y Does: cómo hacer una pregunta',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Чтобы задать вопрос в Present Simple, помощник do или does ставится в начало. С I, you, we, they берётся Do. С he, she, it берётся Does. После него глагол стоит в начальной форме.',
          uk: 'Щоб поставити питання в Present Simple, помічник do або does ставиться на початок. З I, you, we, they береться Do. З he, she, it береться Does. Після нього дієслово стоїть у початковій формі.',
          es: 'Para hacer una pregunta en Present Simple, el auxiliar do o does se pone al principio. Con I, you, we, they se usa Do. Con he, she, it se usa Does. Después de él, el verbo va en su forma base.',
        },
        {
          kind: 'formula',
          formula: ['Do', 'I / you / we / they', '+ глагол ?'],
          formulaEs: ['Do', 'I / you / we / they', '+ verbo ?'],
        },
        {
          kind: 'formula',
          formula: ['Does', 'he / she / it', '+ глагол ?'],
          formulaEs: ['Does', 'he / she / it', '+ verbo ?'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Do + ... + V?', ru: 'вопрос с I / you / we / they', uk: 'питання з I / you / we / they', es: 'pregunta con I / you / we / they', hi: 'Do' },
            { en: 'Does + ... + V?', ru: 'вопрос с he / she / it', uk: 'питання з he / she / it', es: 'pregunta con he / she / it', hi: 'Does' },
          ],
        },
        {
          kind: 'tip',
          ru: 'В вопросе с Does глагол тоже без -s: Does she work? (не Does she works?). Окончание -s уже спрятано в Does.',
          uk: 'У питанні з Does дієслово теж без -s: Does she work? (не Does she works?). Закінчення -s уже сховане в Does.',
          es: 'En la pregunta con Does el verbo también va sin -s: Does she work? (no Does she works?). La terminación -s ya está escondida en Does.',
        },
        {
          kind: 'drill',
          drill: { type: 'binary', question: { ru: 'Где верно?', es: '¿Cuál es correcta?' }, optionA: 'Does she works?', optionB: 'Does she work?', correct: 'B', explain: { ru: 'После Does глагол стоит в начальной форме, без -s.', es: 'Después de Does el verbo va en su forma base, sin -s.' } },
        },
        {
          kind: 'drill',
          drill: { type: 'word_bank', prompt: { ru: 'Спроси: «Ты работаешь здесь?»', es: 'Pregunta: "¿Trabajas aquí?"' }, answer: ['Do', 'you', 'work', 'here'], slotLabels: [{ ru: 'помощник', es: 'auxiliar' }, { ru: 'кто', es: 'quién' }, { ru: 'глагол', es: 'verbo' }, { ru: 'где', es: 'dónde' }], distractors: ['Does', 'works'] },
        },
      ],
    },
  ],
}
