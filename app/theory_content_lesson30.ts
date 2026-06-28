// Theory content for Lesson 30 (Relative Clauses).
//
// Structured data source for the TheoryLessonView engine. Transferred from the
// legacy lesson_help.tsx THEORY[30].render (Table of relative pronouns) and
// expanded into bilingual sections with interactive drills.
//
// Bilingual: every text field carries Russian (ru) and Ukrainian (uk) variants.
// `hi` on an example is the relative pronoun to highlight in the phrase.
// Grammar verified against Cambridge/Oxford. All example phrases come only from
// this lesson's source table.

import type { L1Section } from './theory_content_lesson1'

export const LESSON30_THEORY: { titleRu: string; titleUk: string; sections: L1Section[] } = {
  titleRu: 'Relative Clauses',
  titleUk: 'Relative Clauses',
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
          ru: 'В этом уроке ты учишься соединять две мысли в одно предложение с помощью слов who, which, that, whose, where, when. Они называются относительными местоимениями и добавляют к человеку или предмету пояснение: «человек, КОТОРЫЙ позвонил», «книга, КОТОРУЮ я прочитал».',
          uk: 'У цьому уроці ти вчишся з\'єднувати дві думки в одне речення за допомогою слів who, which, that, whose, where, when. Вони називаються відносними займенниками й додають до людини або предмета пояснення: «людина, ЯКА подзвонила», «книжка, ЯКУ я прочитав».',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'The man who called is my friend.', ru: 'Человек, который позвонил, — мой друг.', uk: 'Чоловік, який подзвонив, — мій друг.', hi: 'who' },
            { en: 'The book which I read was great.', ru: 'Книга, которую я прочитал, была отличной.', uk: 'Книжка, яку я прочитав, була чудовою.', hi: 'which' },
            { en: 'The city where I was born.', ru: 'Город, где я родился.', uk: 'Місто, де я народився.', hi: 'where' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Относительное местоимение ставится сразу после того слова, которое оно поясняет. Сначала «человек», потом «who…».',
          uk: 'Відносний займенник ставиться одразу після того слова, яке він пояснює. Спочатку «людина», потім «who…».',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'who — для людей',
      titleUk: 'who — для людей',
      defaultOpen: true,
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'who используют, когда говорят о людях. Это «который / которая / которые» про человека.',
          uk: 'who вживають, коли говорять про людей. Це «який / яка / які» про людину.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'The man who called is my friend.', ru: 'Человек, который позвонил, — мой друг.', uk: 'Чоловік, який подзвонив, — мій друг.', hi: 'who' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'The man',
            after: 'called is my friend.',
            options: ['who', 'which', 'where'],
            answer: 'who',
            why: { ru: 'Речь о человеке (the man), поэтому нужно who.' },
          },
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'which — для предметов и животных',
      titleUk: 'which — для предметів і тварин',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'which используют для предметов и животных — всё, что не человек. Это «который / которую / которые» про вещь.',
          uk: 'which вживають для предметів і тварин — усього, що не людина. Це «який / яку / які» про річ.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'The book which I read was great.', ru: 'Книга, которую я прочитал, была отличной.', uk: 'Книжка, яку я прочитав, була чудовою.', hi: 'which' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно?' },
            optionA: 'The book who I read was great.',
            optionB: 'The book which I read was great.',
            correct: 'B',
            explain: { ru: 'Книга — предмет, поэтому which, а не who.' },
          },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'that — для людей и предметов',
      titleUk: 'that — для людей і предметів',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'that — универсальное слово: подходит и людям, и предметам. В разговорной речи его часто ставят вместо who или which.',
          uk: 'that — універсальне слово: підходить і людям, і предметам. У розмовній мові його часто ставлять замість who або which.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'The car that she drives is red.', ru: 'Машина, на которой она ездит, красная.', uk: 'Машина, якою вона їздить, червона.', hi: 'that' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Если сомневаешься между who и which — that подойдёт и там, и там.',
          uk: 'Якщо вагаєшся між who і which — that підійде і там, і там.',
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'whose — принадлежность',
      titleUk: 'whose — належність',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'whose показывает принадлежность — «чей». Это притяжательное местоимение: «девочка, ЧЬЯ сумка…».',
          uk: 'whose показує належність — «чий». Це присвійний займенник: «дівчинка, ЧИЯ сумка…».',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'The girl whose bag was stolen...', ru: 'Девочка, чью сумку украли…', uk: 'Дівчинка, чию сумку вкрали…', hi: 'whose' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'The girl',
            after: 'bag was stolen...',
            options: ['whose', 'who', 'which'],
            answer: 'whose',
            why: { ru: 'Здесь показываем принадлежность — чья сумка, поэтому whose.' },
          },
        },
      ],
    },

    // ───────────────────────── 06 ─────────────────────────
    {
      num: '06',
      titleRu: 'where и when — место и время',
      titleUk: 'where і when — місце й час',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'where используют для места («город, ГДЕ…»), а when — для времени («день, КОГДА…»).',
          uk: 'where вживають для місця («місто, ДЕ…»), а when — для часу («день, КОЛИ…»).',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'The city where I was born.', ru: 'Город, где я родился.', uk: 'Місто, де я народився.', hi: 'where' },
            { en: 'The day when we met.', ru: 'День, когда мы встретились.', uk: 'День, коли ми зустрілися.', hi: 'when' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно?' },
            optionA: 'The city when I was born.',
            optionB: 'The city where I was born.',
            correct: 'B',
            explain: { ru: 'Город — это место, поэтому where, а не when.' },
          },
        },
      ],
    },

    // ───────────────────────── 07 ─────────────────────────
    {
      num: '07',
      titleRu: 'Что нужно вынести из урока',
      titleUk: 'Що треба винести з уроку',
      exampleCount: 0,
      blocks: [
        {
          kind: 'body',
          ru: 'Относительные слова добавляют к человеку или предмету пояснение: who — люди, which — предметы и животные, that — и то и другое, whose — принадлежность, where — место, when — время.',
          uk: 'Відносні слова додають до людини або предмета пояснення: who — люди, which — предмети й тварини, that — і те й інше, whose — належність, where — місце, when — час.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Человек, который позвонил, — мой друг.' },
            answer: ['The man', 'who', 'called', 'is my friend'],
            slotLabels: [{ ru: 'кто' }, { ru: 'связка' }, { ru: 'действие' }, { ru: 'описание' }],
            distractors: ['which', 'where'],
          },
        },
        {
          kind: 'tip',
          ru: 'Правило простое: сначала называешь человека или вещь, потом ставишь нужное слово (who / which / that / whose / where / when) и продолжаешь мысль.',
          uk: 'Правило просте: спочатку називаєш людину або річ, потім ставиш потрібне слово (who / which / that / whose / where / when) і продовжуєш думку.',
        },
      ],
    },
  ],
}
