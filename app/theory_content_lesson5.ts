// Theory content for Lesson 5 (Present Simple: questions).
//
// This file is the structured data source for the TheoryLessonView engine.
// Content is transferred from the legacy lesson_help.tsx HINTS[5].render
// (Table components for general yes/no questions and Wh- questions) without any
// grammar changes — the content is verified against Cambridge/Oxford.
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk) variants.
// `hi` on an example is the form to highlight in the phrase (do / does).
//
// Base block/section interfaces are reused from theory_content_lesson1 (no
// duplication). Lesson 5 also embeds interactive drills, so we extend L1Block
// locally with the engine's `drill` block kind.

import type { L1Block, L1Section } from './theory_content_lesson1';

/** L1Block plus the engine's interactive `drill` block (grammar verified). */
type L5Block =
  | L1Block
  | {
      kind: 'drill';
      drill: { type: 'choice' | 'word_bank' | 'spot_slip' | 'binary'; [key: string]: unknown };
    };

interface L5Section extends Omit<L1Section, 'blocks'> {
  blocks: L5Block[];
}

export const LESSON5_THEORY: { titleRu: string; titleUk: string; titleEs: string; sections: L5Section[] } = {
  titleRu: 'Present Simple — вопросы',
  titleUk: 'Present Simple — питання',
  titleEs: 'Present Simple — preguntas',
  sections: [
    // ───────────────────────── 01 ─────────────────────────
    {
      num: '01',
      titleRu: 'Что ты тренируешь в этом уроке',
      titleUk: 'Що ти тренуєш у цьому уроці',
      titleEs: 'Qué vas a practicar en esta lección',
      defaultOpen: true,
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'В этом уроке ты учишься задавать вопросы в Present Simple. Чтобы спросить про привычку или факт, в начале фразы ставят do или does. С he, she, it используется does, с остальными — do.',
          uk: 'У цьому уроці ти вчишся ставити питання в Present Simple. Щоб запитати про звичку або факт, на початку фрази ставлять do або does. З he, she, it використовується does, з рештою — do.',
          es: 'En esta lección aprendes a hacer preguntas en Present Simple. Para preguntar sobre un hábito o un hecho, al principio de la frase se coloca do o does. Con he, she, it se usa does, y con el resto, do.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Do you work?', ru: 'Ты работаешь?', uk: 'Ти працюєш?', es: '¿Trabajas?', hi: 'Do' },
            { en: 'Does she work?', ru: 'Она работает?', uk: 'Вона працює?', es: '¿Ella trabaja?', hi: 'Does' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Главное правило: с he / she / it — does, со всеми остальными — do. После do и does глагол стоит в обычной форме, без -s.',
          uk: 'Головне правило: з he / she / it — does, з усіма іншими — do. Після do та does дієслово стоїть у звичайній формі, без -s.',
          es: 'Regla principal: con he / she / it — does, con todos los demás — do. Después de do y does, el verbo va en su forma base, sin -s.',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Общие вопросы: do и does',
      titleUk: 'Загальні питання: do та does',
      titleEs: 'Preguntas generales: do y does',
      defaultOpen: true,
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Общий вопрос — это вопрос, на который отвечают «да» или «нет». Он начинается с do или does. С I / You / We / They используется do, с He / She / It — does.',
          uk: 'Загальне питання — це питання, на яке відповідають «так» або «ні». Воно починається з do або does. З I / You / We / They використовується do, з He / She / It — does.',
          es: 'Una pregunta general es una pregunta que se responde con «sí» o «no». Empieza con do o does. Con I / You / We / They se usa do, y con He / She / It — does.',
        },
        {
          kind: 'formula',
          formula: ['Do / Does', 'кто', 'глагол', '?'],
          formulaEs: ['Do / Does', 'sujeto', 'verbo', '?'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Do you work?', ru: 'I / You / We / They → Do you work?  Yes, I do. / No, I don\'t.', uk: 'I / You / We / They → Do you work?  Yes, I do. / No, I don\'t.', es: 'I / You / We / They → Do you work?  Yes, I do. / No, I don\'t.', hi: 'Do' },
            { en: 'Does she work?', ru: 'He / She / It → Does she work?  Yes, she does. / No, she doesn\'t.', uk: 'He / She / It → Does she work?  Yes, she does. / No, she doesn\'t.', es: 'He / She / It → Does she work?  Yes, she does. / No, she doesn\'t.', hi: 'Does' },
          ],
        },
        {
          kind: 'tip',
          ru: 'В кратком ответе повторяется тот же помощник: Do you...? → Yes, I do. / No, I don\'t. Does she...? → Yes, she does. / No, she doesn\'t.',
          uk: 'У короткій відповіді повторюється той самий помічник: Do you...? → Yes, I do. / No, I don\'t. Does she...? → Yes, she does. / No, she doesn\'t.',
          es: 'En la respuesta corta se repite el mismo auxiliar: Do you...? → Yes, I do. / No, I don\'t. Does she...? → Yes, she does. / No, she doesn\'t.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: '',
            after: 'she work?',
            options: ['Do', 'Does', 'Is'],
            answer: 'Does',
            why: { ru: 'С she нужен does: Does she work?', es: 'Con she se necesita does: Does she work?' },
          },
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно?', es: '¿Cuál es correcta?' },
            optionA: 'Do you work?',
            optionB: 'Does you work?',
            correct: 'A',
            explain: { ru: 'С you нужен do: Do you work?', es: 'Con you se necesita do: Do you work?' },
          },
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Краткие ответы: do / does',
      titleUk: 'Короткі відповіді: do / does',
      titleEs: 'Respuestas cortas: do / does',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'На общий вопрос отвечают коротко, повторяя do или does. Не нужно повторять весь глагол — достаточно помощника.',
          uk: 'На загальне питання відповідають коротко, повторюючи do або does. Не треба повторювати все дієслово — достатньо помічника.',
          es: 'A una pregunta general se responde de forma corta, repitiendo do o does. No hace falta repetir todo el verbo — basta con el auxiliar.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Yes, I do. / No, I don\'t.', ru: 'ответ на Do you work?', uk: 'відповідь на Do you work?', es: 'respuesta a Do you work?', hi: 'do' },
            { en: 'Yes, she does. / No, she doesn\'t.', ru: 'ответ на Does she work?', uk: 'відповідь на Does she work?', es: 'respuesta a Does she work?', hi: 'does' },
          ],
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'Специальные вопросы (Wh-)',
      titleUk: 'Спеціальні питання (Wh-)',
      titleEs: 'Preguntas especiales (Wh-)',
      exampleCount: 5,
      blocks: [
        {
          kind: 'body',
          ru: 'Специальный вопрос начинается со слова-вопроса (What, Where, When, Why, How). После него идёт тот же do или does, а потом — кто и глагол.',
          uk: 'Спеціальне питання починається зі слова-питання (What, Where, When, Why, How). Після нього йде той самий do або does, а потім — хто і дієслово.',
          es: 'Una pregunta especial empieza con una palabra interrogativa (What, Where, When, Why, How). Después va el mismo do o does, y luego el sujeto y el verbo.',
        },
        {
          kind: 'formula',
          formula: ['Wh-', 'do / does', 'кто', 'глагол', '?'],
          formulaEs: ['Wh-', 'do / does', 'sujeto', 'verbo', '?'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'What do you do?', ru: 'What — что', uk: 'What — що', es: 'What — qué', hi: 'do' },
            { en: 'Where does she live?', ru: 'Where — где', uk: 'Where — де', es: 'Where — dónde', hi: 'does' },
            { en: 'When do they eat?', ru: 'When — когда', uk: 'When — коли', es: 'When — cuándo', hi: 'do' },
            { en: 'Why does he work?', ru: 'Why — почему', uk: 'Why — чому', es: 'Why — por qué', hi: 'does' },
            { en: 'How do you feel?', ru: 'How — как', uk: 'How — як', es: 'How — cómo', hi: 'do' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Даже в Wh-вопросах сохраняется правило do / does: с he, she, it — does (Where does she live?), с остальными — do (Where do you live?).',
          uk: 'Навіть у Wh-питаннях зберігається правило do / does: з he, she, it — does (Where does she live?), з рештою — do (Where do you live?).',
          es: 'Incluso en las preguntas Wh- se mantiene la regla do / does: con he, she, it — does (Where does she live?), con el resto — do (Where do you live?).',
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Где она живёт?', es: '¿Dónde vive ella?' },
            answer: ['Where', 'does', 'she', 'live'],
            slotLabels: [{ ru: 'вопрос', es: 'palabra interrogativa' }, { ru: 'помощник', es: 'auxiliar' }, { ru: 'кто', es: 'sujeto' }, { ru: 'глагол', es: 'verbo' }],
            distractors: ['do', 'lives'],
          },
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'Самые частые ошибки',
      titleUk: 'Найчастіші помилки',
      titleEs: 'Los errores más frecuentes',
      blocks: [
        {
          kind: 'fix',
          fixes: [
            { wrong: 'Does she works?', right: 'Does she work?' },
            { wrong: 'Do she work?', right: 'Does she work?' },
            { wrong: 'Does you work?', right: 'Do you work?' },
            { wrong: 'Where she lives?', right: 'Where does she live?' },
          ],
        },
        {
          kind: 'tip',
          ru: 'После does глагол без -s: Does she work? — а не Does she works? С he / she / it нужен does, а не do. В Wh-вопросах do / does тоже обязателен: Where does she live?',
          uk: 'Після does дієслово без -s: Does she work? — а не Does she works? З he / she / it потрібен does, а не do. У Wh-питаннях do / does теж обов\'язковий: Where does she live?',
          es: 'Después de does, el verbo va sin -s: Does she work? — y no Does she works? Con he / she / it hace falta does, no do. En las preguntas Wh- do / does también es obligatorio: Where does she live?',
        },
        {
          kind: 'drill',
          drill: {
            type: 'spot_slip',
            chips: ['Does', 'she', 'works'],
            answerIndex: 2,
            hint: { ru: 'Тут лишняя -s. Тапни неверное слово.', es: 'Aquí sobra la -s. Toca la palabra incorrecta.' },
            fix: { ru: 'После does глагол без -s: Does she work?', es: 'Después de does, el verbo va sin -s: Does she work?' },
          },
        },
      ],
    },
  ],
};
