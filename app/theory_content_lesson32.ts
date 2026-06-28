// Theory content for Lesson 32 (Review of all topics: tenses + key structures).
//
// Structured data source for the TheoryLessonView engine. Content is transferred
// verbatim from the legacy lesson_help.tsx HINTS[32].render (two Table blocks:
// "Времена — обзор" and "Важные конструкции") without any grammar changes.
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk) variants.
// `hi` on an example highlights the key form of that tense / structure.

import type { L1Section } from './theory_content_lesson1'

export const LESSON32_THEORY: { titleRu: string; titleUk: string; sections: L1Section[] } = {
  titleRu: 'Повторение всех тем',
  titleUk: 'Повторення всіх тем',
  sections: [
    // ───────────────────────── 01 ─────────────────────────
    {
      num: '01',
      titleRu: 'Времена — обзор',
      titleUk: 'Часи — огляд',
      defaultOpen: true,
      exampleCount: 6,
      blocks: [
        {
          kind: 'body',
          ru: 'Это итоговый урок: здесь собраны все времена, которые ты уже проходил. Сравни их в одной таблице — у каждого времени есть свой пример и свои слова-подсказки, по которым его легко узнать.',
          uk: 'Це підсумковий урок: тут зібрані всі часи, які ти вже проходив. Порівняй їх в одній таблиці — у кожного часу є свій приклад і свої слова-підказки, за якими його легко впізнати.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'She works.', ru: 'Present Simple — always, every day (всегда, каждый день)', uk: 'Present Simple — always, every day (завжди, щодня)', hi: 'works' },
            { en: "She's working.", ru: 'Present Continuous — now, at the moment (сейчас, в данный момент)', uk: 'Present Continuous — now, at the moment (зараз, цієї миті)', hi: "She's working" },
            { en: 'She worked.', ru: 'Past Simple — yesterday, ago, last (вчера, назад, прошлый)', uk: 'Past Simple — yesterday, ago, last (вчора, тому, минулий)', hi: 'worked' },
            { en: 'She was working.', ru: 'Past Continuous — at 8pm, when, while (в 8 вечера, когда, пока)', uk: 'Past Continuous — at 8pm, when, while (о 8-й вечора, коли, поки)', hi: 'was working' },
            { en: "She's worked.", ru: 'Present Perfect — ever, never, already (когда-либо, никогда, уже)', uk: 'Present Perfect — ever, never, already (будь-коли, ніколи, вже)', hi: "She's worked" },
            { en: 'She will work.', ru: 'Future Simple — tomorrow, next week (завтра, на следующей неделе)', uk: 'Future Simple — tomorrow, next week (завтра, наступного тижня)', hi: 'will work' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Слова-подсказки — твой главный помощник. Видишь yesterday — это прошлое (Past Simple). Видишь now — это происходит сейчас (Present Continuous). Видишь already — это Present Perfect.',
          uk: 'Слова-підказки — твій головний помічник. Бачиш yesterday — це минуле (Past Simple). Бачиш now — це відбувається зараз (Present Continuous). Бачиш already — це Present Perfect.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'Yesterday she',
            after: 'late.',
            options: ['works', 'worked', 'will work'],
            answer: 'worked',
            why: { ru: 'Yesterday — это прошлое, поэтому Past Simple: worked.' },
          },
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно для «сейчас»?' },
            optionA: 'She works now',
            optionB: "She's working now",
            correct: 'B',
            explain: { ru: 'Now = прямо сейчас, нужен Present Continuous: She’s working.' },
          },
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Важные конструкции',
      titleUk: 'Важливі конструкції',
      defaultOpen: true,
      exampleCount: 8,
      blocks: [
        {
          kind: 'body',
          ru: 'Кроме времён ты выучил полезные конструкции: модальные глаголы, пассив, условие и другие. Вот они все вместе с примерами — повтори, как каждая строится.',
          uk: 'Крім часів ти вивчив корисні конструкції: модальні дієслова, пасив, умову та інші. Ось вони всі разом з прикладами — повтори, як кожна будується.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I can swim. She could drive.', ru: 'can / could — умение и возможность', uk: 'can / could — уміння і можливість', hi: 'can' },
            { en: 'I must go. You have to work.', ru: 'must / have to — необходимость', uk: 'must / have to — необхідність', hi: 'must' },
            { en: 'You should rest.', ru: 'should — совет', uk: 'should — порада', hi: 'should' },
            { en: 'It was built in 1990.', ru: 'was/were + V3 — пассив (действие сделали с предметом)', uk: 'was/were + V3 — пасив (дію зробили з предметом)', hi: 'was built' },
            { en: 'If it rains, I will stay.', ru: 'If + Present Simple → will — условие', uk: 'If + Present Simple → will — умова', hi: 'will stay' },
            { en: 'I used to play tennis.', ru: 'used to + V — было раньше, а сейчас нет', uk: 'used to + V — було раніше, а зараз ні', hi: 'used to' },
            { en: "She's already finished.", ru: 'have/has + V3 — Present Perfect', uk: 'have/has + V3 — Present Perfect', hi: "She's already finished" },
            { en: 'I want you to stay.', ru: 'want you to + V — хочу, чтобы ты...', uk: 'want you to + V — хочу, щоб ти...', hi: 'want you to' },
          ],
        },
        {
          kind: 'tip',
          ru: 'После can, must, should глагол идёт без to. А вот в have to, used to, want you to частица to нужна. Сравни: I can swim, но I have to work.',
          uk: 'Після can, must, should дієслово йде без to. А ось у have to, used to, want you to частка to потрібна. Порівняй: I can swim, але I have to work.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Если пойдёт дождь, я останусь.' },
            answer: ['If', 'it', 'rains', 'I', 'will', 'stay'],
            slotLabels: [{ ru: 'если' }, { ru: 'кто' }, { ru: 'настоящее' }, { ru: 'кто' }, { ru: 'will' }, { ru: 'глагол' }],
            distractors: ['rained', 'would'],
          },
        },
        {
          kind: 'drill',
          drill: {
            type: 'spot_slip',
            chips: ['You', 'should', 'to', 'rest'],
            answerIndex: 2,
            hint: { ru: 'Тут лишнее слово. Тапни его.' },
            fix: { ru: 'После should глагол идёт без to: You should rest.' },
          },
        },
      ],
    },
  ],
}
