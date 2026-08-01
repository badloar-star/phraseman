// Theory content for Lesson 29 (Used to: past habits and past states).
//
// Structured data source for the TheoryLessonView engine. Content transferred
// from the legacy lesson_help.tsx HINTS[29].render (two tables: the used to
// forms + comparison of used to / be used to / get used to) and expanded into
// meaningful sections. Grammar is verified against Cambridge/Oxford usage:
//   - "used to + V" = a past habit / state that is no longer true
//   - negative: "didn't use to + V" (use, NOT used, after did)
//   - question: "Did ... use to + V?" (use, NOT used, after did)
//   - "be used to + -ing/noun" = to be accustomed to something
//   - "get used to + -ing/noun" = to become accustomed to something
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk).
// `hi` on an example is the form to highlight in the phrase
// (used to / use to / -ing).

import type { L1Section } from './theory_content_lesson1'

export const LESSON29_THEORY: { titleRu: string; titleUk: string; titleEs: string; sections: L1Section[] } = {
  titleRu: 'Used to',
  titleUk: 'Used to',
  titleEs: 'Used to',
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
          ru: 'В этом уроке ты учишься говорить о привычках и состояниях, которые были в прошлом, но сейчас их уже нет. Для этого в английском есть конструкция used to + глагол: «раньше делал, а теперь нет». Например: I used to play football — «раньше я играл в футбол» (а сейчас уже не играю).',
          uk: 'У цьому уроці ти вчишся говорити про звички та стани, які були в минулому, але зараз їх уже немає. Для цього в англійській є конструкція used to + дієслово: «раніше робив, а тепер ні». Наприклад: I used to play football — «раніше я грав у футбол» (а зараз уже не граю).',
          es: 'En esta lección aprendes a hablar de hábitos y estados que existían en el pasado pero que ya no son ciertos ahora. Para eso el inglés tiene la construcción used to + verbo: «antes hacía algo, y ahora ya no». Por ejemplo: I used to play football — «antes jugaba al fútbol» (y ahora ya no juego).',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I used to play football.', ru: 'Раньше я играл в футбол.', uk: 'Раніше я грав у футбол.', es: 'Antes jugaba al fútbol.', hi: 'used to' },
            { en: "She didn't use to drink coffee.", ru: 'Раньше она не пила кофе.', uk: 'Раніше вона не пила каву.', es: 'Antes ella no tomaba café.', hi: 'use to' },
            { en: 'Did you use to live here?', ru: 'Ты раньше здесь жил?', uk: 'Ти раніше тут жив?', es: '¿Vivías aquí antes?', hi: 'use to' },
          ],
        },
        {
          kind: 'tip',
          ru: 'used to говорит о том, что было правдой в прошлом, а сейчас уже не так. Если что-то происходит и сейчас — used to не подходит.',
          uk: 'used to говорить про те, що було правдою в минулому, а зараз уже не так. Якщо щось відбувається й зараз — used to не підходить.',
          es: 'used to indica algo que era verdad en el pasado, pero que ya no lo es ahora. Si algo sigue pasando también en el presente, used to no es la forma correcta.',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Три формы: +, −, ?',
      titleUk: 'Три форми: +, −, ?',
      titleEs: 'Tres formas: +, −, ?',
      defaultOpen: true,
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'У used to есть три формы. В утверждении — used to + глагол. В отрицании и вопросе появляется did, а used превращается в use (без d!): didn’t use to и Did … use to.',
          uk: 'У used to є три форми. У ствердженні — used to + дієслово. У запереченні та питанні з’являється did, а used перетворюється на use (без d!): didn’t use to і Did … use to.',
          es: 'used to tiene tres formas. En la afirmación es used to + verbo. En la negación y en la pregunta aparece did, y used se convierte en use (¡sin d!): didn’t use to y Did … use to.',
        },
        {
          kind: 'formula',
          formula: ['кто', 'used to / didn’t use to / Did … use to', 'глагол'],
          formulaEs: ['sujeto', 'used to / didn’t use to / Did … use to', 'verbo'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I used to play football.', ru: '+ Раньше я играл в футбол.', uk: '+ Раніше я грав у футбол.', es: '+ Antes jugaba al fútbol.', hi: 'used to' },
            { en: "She didn't use to drink coffee.", ru: '− Раньше она не пила кофе.', uk: '− Раніше вона не пила каву.', es: '− Antes ella no tomaba café.', hi: 'use to' },
            { en: 'Did you use to live here?', ru: '? Ты раньше здесь жил?', uk: '? Ти раніше тут жив?', es: '? ¿Vivías aquí antes?', hi: 'use to' },
          ],
        },
        {
          kind: 'fix',
          fixes: [
            { wrong: "She didn't used to drink coffee.", right: "She didn't use to drink coffee." },
          ],
        },
        {
          kind: 'tip',
          ru: 'После did всегда use, а не used. did уже показывает прошлое, поэтому второе окончание не нужно.',
          uk: 'Після did завжди use, а не used. did уже показує минуле, тому друге закінчення не потрібне.',
          es: 'Después de did siempre va use, no used. did ya marca el pasado, así que no hace falta otra terminación de pasado.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'I',
            after: 'play football.',
            options: ['used to', 'use to', 'using to'],
            answer: 'used to',
            why: { ru: 'В утверждении нужна полная форма used to: I used to play football.', es: 'En la afirmación se necesita la forma completa used to: I used to play football.' },
          },
        },
        {
          kind: 'drill',
          drill: {
            type: 'spot_slip',
            chips: ['She', "didn't", 'used', 'to', 'drink', 'coffee'],
            answerIndex: 2,
            hint: { ru: 'После didn’t лишняя буква. Тапни слово, которое стоит не в той форме.', es: 'Después de didn’t sobra una letra. Toca la palabra que está en la forma equivocada.' },
            fix: { ru: 'После did/didn’t идёт use без d: She didn’t use to drink coffee.', es: 'Después de did/didn’t va use sin d: She didn’t use to drink coffee.' },
          },
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Вопрос с used to',
      titleUk: 'Питання з used to',
      titleEs: 'La pregunta con used to',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'Чтобы спросить о прошлой привычке, ставь Did в начало, а used to превращается в use to: Did you use to live here? — «Ты раньше здесь жил?»',
          uk: 'Щоб запитати про минулу звичку, став Did на початок, а used to перетворюється на use to: Did you use to live here? — «Ти раніше тут жив?»',
          es: 'Para preguntar sobre un hábito pasado, pon Did al principio, y used to se convierte en use to: Did you use to live here? — «¿Vivías aquí antes?»',
        },
        {
          kind: 'formula',
          formula: ['Did', 'кто', 'use to', 'глагол?'],
          formulaEs: ['Did', 'sujeto', 'use to', 'verbo?'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Did you use to live here?', ru: 'Ты раньше здесь жил?', uk: 'Ти раніше тут жив?', es: '¿Vivías aquí antes?', hi: 'use to' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно?', es: '¿Cuál es correcta?' },
            optionA: 'Did you used to live here?',
            optionB: 'Did you use to live here?',
            correct: 'B',
            explain: { ru: 'После Did идёт use без d: Did you use to live here?', es: 'Después de Did va use sin d: Did you use to live here?' },
          },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'used to ≠ be used to ≠ get used to',
      titleUk: 'used to ≠ be used to ≠ get used to',
      titleEs: 'used to ≠ be used to ≠ get used to',
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'Не путай три похожие конструкции. used to + глагол — это привычка в прошлом. А be used to и get used to — совсем о другом: они о привычности к чему-то, и после них идёт -ing или существительное, а не голый глагол.',
          uk: 'Не плутай три схожі конструкції. used to + дієслово — це звичка в минулому. А be used to і get used to — зовсім про інше: вони про звичність до чогось, і після них іде -ing або іменник, а не голе дієслово.',
          es: 'No confundas estas tres construcciones parecidas. used to + verbo es un hábito en el pasado. En cambio be used to y get used to son algo distinto: hablan de estar acostumbrado a algo, y después de ellas va -ing o un sustantivo, no un verbo simple.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I used to smoke.', ru: 'used to + глагол — привычка в прошлом (раньше курил).', uk: 'used to + дієслово — звичка в минулому (раніше курив).', es: 'used to + verbo — hábito en el pasado (antes fumaba).', hi: 'used to' },
            { en: "I'm used to waking up early.", ru: 'be used to + -ing — привычный к чему-то (мне привычно вставать рано).', uk: 'be used to + -ing — звичний до чогось (мені звично вставати рано).', es: 'be used to + -ing — acostumbrado a algo (estoy acostumbrado a levantarme temprano).', hi: 'used to waking' },
            { en: "I'm getting used to the cold.", ru: 'get used to + -ing — привыкать к чему-то (привыкаю к холоду).', uk: 'get used to + -ing — звикати до чогось (звикаю до холоду).', es: 'get used to + -ing — acostumbrarse a algo (me estoy acostumbrando al frío).', hi: 'used to' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Простой ориентир: после used to идёт глагол (used to play) — это прошлое. После be/get used to идёт -ing или существительное (used to waking, used to the cold) — это привычность.',
          uk: 'Простий орієнтир: після used to йде дієслово (used to play) — це минуле. Після be/get used to йде -ing або іменник (used to waking, used to the cold) — це звичність.',
          es: 'Una referencia simple: después de used to va un verbo (used to play) — eso es pasado. Después de be/get used to va -ing o un sustantivo (used to waking, used to the cold) — eso es costumbre.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Раньше я курил.', es: 'Antes fumaba.' },
            answer: ['I', 'used', 'to', 'smoke'],
            slotLabels: [{ ru: 'кто', es: 'sujeto' }, { ru: 'used', es: 'used' }, { ru: 'to', es: 'to' }, { ru: 'глагол', es: 'verbo' }],
            distractors: ['smoking', 'the'],
          },
        },
      ],
    },
  ],
}
