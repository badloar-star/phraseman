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

export const LESSON29_THEORY: { titleRu: string; titleUk: string; sections: L1Section[] } = {
  titleRu: 'Used to',
  titleUk: 'Used to',
  sections: [
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
          ru: 'В этом уроке ты учишься говорить о привычках и состояниях, которые были в прошлом, но сейчас их уже нет. Для этого в английском есть конструкция used to + глагол: «раньше делал, а теперь нет». Например: I used to play football — «раньше я играл в футбол» (а сейчас уже не играю).',
          uk: 'У цьому уроці ти вчишся говорити про звички та стани, які були в минулому, але зараз їх уже немає. Для цього в англійській є конструкція used to + дієслово: «раніше робив, а тепер ні». Наприклад: I used to play football — «раніше я грав у футбол» (а зараз уже не граю).',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I used to play football.', ru: 'Раньше я играл в футбол.', uk: 'Раніше я грав у футбол.', hi: 'used to' },
            { en: "She didn't use to drink coffee.", ru: 'Раньше она не пила кофе.', uk: 'Раніше вона не пила каву.', hi: 'use to' },
            { en: 'Did you use to live here?', ru: 'Ты раньше здесь жил?', uk: 'Ти раніше тут жив?', hi: 'use to' },
          ],
        },
        {
          kind: 'tip',
          ru: 'used to говорит о том, что было правдой в прошлом, а сейчас уже не так. Если что-то происходит и сейчас — used to не подходит.',
          uk: 'used to говорить про те, що було правдою в минулому, а зараз уже не так. Якщо щось відбувається й зараз — used to не підходить.',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Три формы: +, −, ?',
      titleUk: 'Три форми: +, −, ?',
      defaultOpen: true,
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'У used to есть три формы. В утверждении — used to + глагол. В отрицании и вопросе появляется did, а used превращается в use (без d!): didn’t use to и Did … use to.',
          uk: 'У used to є три форми. У ствердженні — used to + дієслово. У запереченні та питанні з’являється did, а used перетворюється на use (без d!): didn’t use to і Did … use to.',
        },
        {
          kind: 'formula',
          formula: ['кто', 'used to / didn’t use to / Did … use to', 'глагол'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I used to play football.', ru: '+  Раньше я играл в футбол.', uk: '+  Раніше я грав у футбол.', hi: 'used to' },
            { en: "She didn't use to drink coffee.", ru: '−  Раньше она не пила кофе.', uk: '−  Раніше вона не пила каву.', hi: 'use to' },
            { en: 'Did you use to live here?', ru: '?  Ты раньше здесь жил?', uk: '?  Ти раніше тут жив?', hi: 'use to' },
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
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'I',
            after: 'play football.',
            options: ['used to', 'use to', 'using to'],
            answer: 'used to',
            why: { ru: 'В утверждении нужна полная форма used to: I used to play football.' },
          },
        },
        {
          kind: 'drill',
          drill: {
            type: 'spot_slip',
            chips: ['She', "didn't", 'used', 'to', 'drink', 'coffee'],
            answerIndex: 2,
            hint: { ru: 'После didn’t лишняя буква. Тапни слово, которое стоит не в той форме.' },
            fix: { ru: 'После did/didn’t идёт use без d: She didn’t use to drink coffee.' },
          },
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Вопрос с used to',
      titleUk: 'Питання з used to',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'Чтобы спросить о прошлой привычке, ставь Did в начало, а used to превращается в use to: Did you use to live here? — «Ты раньше здесь жил?»',
          uk: 'Щоб запитати про минулу звичку, став Did на початок, а used to перетворюється на use to: Did you use to live here? — «Ти раніше тут жив?»',
        },
        {
          kind: 'formula',
          formula: ['Did', 'кто', 'use to', 'глагол?'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Did you use to live here?', ru: 'Ты раньше здесь жил?', uk: 'Ти раніше тут жив?', hi: 'use to' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно?' },
            optionA: 'Did you used to live here?',
            optionB: 'Did you use to live here?',
            correct: 'B',
            explain: { ru: 'После Did идёт use без d: Did you use to live here?' },
          },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'used to ≠ be used to ≠ get used to',
      titleUk: 'used to ≠ be used to ≠ get used to',
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'Не путай три похожие конструкции. used to + глагол — это привычка в прошлом. А be used to и get used to — совсем о другом: они о привычности к чему-то, и после них идёт -ing или существительное, а не голый глагол.',
          uk: 'Не плутай три схожі конструкції. used to + дієслово — це звичка в минулому. А be used to і get used to — зовсім про інше: вони про звичність до чогось, і після них іде -ing або іменник, а не голе дієслово.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I used to smoke.', ru: 'used to + глагол — привычка в прошлом (раньше курил).', uk: 'used to + дієслово — звичка в минулому (раніше курив).', hi: 'used to' },
            { en: "I'm used to waking up early.", ru: 'be used to + -ing — привычный к чему-то (мне привычно вставать рано).', uk: 'be used to + -ing — звичний до чогось (мені звично вставати рано).', hi: 'used to waking' },
            { en: "I'm getting used to the cold.", ru: 'get used to + -ing — привыкать к чему-то (привыкаю к холоду).', uk: 'get used to + -ing — звикати до чогось (звикаю до холоду).', hi: 'used to' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Простой ориентир: после used to идёт глагол (used to play) — это прошлое. После be/get used to идёт -ing или существительное (used to waking, used to the cold) — это привычность.',
          uk: 'Простий орієнтир: після used to йде дієслово (used to play) — це минуле. Після be/get used to йде -ing або іменник (used to waking, used to the cold) — це звичність.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Раньше я курил.' },
            answer: ['I', 'used', 'to', 'smoke'],
            slotLabels: [{ ru: 'кто' }, { ru: 'used' }, { ru: 'to' }, { ru: 'глагол' }],
            distractors: ['smoking', 'the'],
          },
        },
      ],
    },
  ],
}
