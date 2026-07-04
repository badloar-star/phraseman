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

export const LESSON30_THEORY: { titleRu: string; titleUk: string; titleEs: string; sections: L1Section[] } = {
  titleRu: 'Relative Clauses',
  titleUk: 'Relative Clauses',
  titleEs: 'Relative Clauses',
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
          ru: 'В этом уроке ты учишься соединять две мысли в одно предложение с помощью слов who, which, that, whose, where, when. Они называются относительными местоимениями и добавляют к человеку или предмету пояснение: «человек, КОТОРЫЙ позвонил», «книга, КОТОРУЮ я прочитал».',
          uk: 'У цьому уроці ти вчишся з\'єднувати дві думки в одне речення за допомогою слів who, which, that, whose, where, when. Вони називаються відносними займенниками й додають до людини або предмета пояснення: «людина, ЯКА подзвонила», «книжка, ЯКУ я прочитав».',
          es: 'En esta lección aprendes a unir dos ideas en una sola oración con las palabras who, which, that, whose, where, when. Se llaman pronombres relativos y añaden a la persona o al objeto una aclaración: «la persona QUE llamó», «el libro QUE leí».',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'The man who called is my friend.', ru: 'Человек, который позвонил, — мой друг.', uk: 'Чоловік, який подзвонив, — мій друг.', es: 'El hombre que llamó es mi amigo.', hi: 'who' },
            { en: 'The book which I read was great.', ru: 'Книга, которую я прочитал, была отличной.', uk: 'Книжка, яку я прочитав, була чудовою.', es: 'El libro que leí fue excelente.', hi: 'which' },
            { en: 'The city where I was born.', ru: 'Город, где я родился.', uk: 'Місто, де я народився.', es: 'La ciudad donde nací.', hi: 'where' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Относительное местоимение ставится сразу после того слова, которое оно поясняет. Сначала «человек», потом «who…».',
          uk: 'Відносний займенник ставиться одразу після того слова, яке він пояснює. Спочатку «людина», потім «who…».',
          es: 'El pronombre relativo se coloca justo después de la palabra que aclara. Primero «la persona», luego «who…».',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'who — для людей',
      titleUk: 'who — для людей',
      titleEs: 'who — para personas',
      defaultOpen: true,
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'who используют, когда говорят о людях. Это «который / которая / которые» про человека.',
          uk: 'who вживають, коли говорять про людей. Це «який / яка / які» про людину.',
          es: 'who se usa cuando se habla de personas. Equivale a «que» referido a una persona.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'The man who called is my friend.', ru: 'Человек, который позвонил, — мой друг.', uk: 'Чоловік, який подзвонив, — мій друг.', es: 'El hombre que llamó es mi amigo.', hi: 'who' },
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
            why: { ru: 'Речь о человеке (the man), поэтому нужно who.', es: 'Se habla de una persona (the man), por eso hace falta who.' },
          },
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'which — для предметов и животных',
      titleUk: 'which — для предметів і тварин',
      titleEs: 'which — para objetos y animales',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'which используют для предметов и животных — всё, что не человек. Это «который / которую / которые» про вещь.',
          uk: 'which вживають для предметів і тварин — усього, що не людина. Це «який / яку / які» про річ.',
          es: 'which se usa para objetos y animales — todo lo que no es una persona. Equivale a «que» referido a una cosa.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'The book which I read was great.', ru: 'Книга, которую я прочитал, была отличной.', uk: 'Книжка, яку я прочитав, була чудовою.', es: 'El libro que leí fue excelente.', hi: 'which' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно?', es: '¿Cuál es correcta?' },
            optionA: 'The book who I read was great.',
            optionB: 'The book which I read was great.',
            correct: 'B',
            explain: { ru: 'Книга — предмет, поэтому which, а не who.', es: 'El libro es un objeto, por eso which y no who.' },
          },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'that — для людей и предметов',
      titleUk: 'that — для людей і предметів',
      titleEs: 'that — para personas y objetos',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'that — универсальное слово: подходит и людям, и предметам. В разговорной речи его часто ставят вместо who или which.',
          uk: 'that — універсальне слово: підходить і людям, і предметам. У розмовній мові його часто ставлять замість who або which.',
          es: 'that es una palabra universal: sirve tanto para personas como para objetos. En el habla cotidiana se usa a menudo en lugar de who o which.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'The car that she drives is red.', ru: 'Машина, на которой она ездит, красная.', uk: 'Машина, якою вона їздить, червона.', es: 'El coche que ella conduce es rojo.', hi: 'that' },
            { en: 'Is this the app that helps you learn?', ru: 'Это то самое приложение, которое помогает тебе учиться?', uk: 'Це той самий додаток, який допомагає тобі вчитися?', es: '¿Es esta la aplicación que te ayuda a aprender?', hi: 'that' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Если сомневаешься между who и which — that подойдёт и там, и там.',
          uk: 'Якщо вагаєшся між who і which — that підійде і там, і там.',
          es: 'Si dudas entre who y which — that funciona en ambos casos.',
        },
        {
          kind: 'tip',
          ru: 'В helps you learn слово learn идёт без to: после help + кого-то действие часто ставят в простой форме. Helps you to learn тоже возможно, но короткая форма звучит естественно.',
          uk: 'У helps you learn слово learn йде без to: після help + когось дію часто ставлять у простій формі. Helps you to learn теж можливо, але коротка форма звучить природно.',
          es: 'En helps you learn, la palabra learn va sin to: después de help + alguien, la acción suele ir en forma simple. Helps you to learn también es posible, pero la forma corta suena más natural.',
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'whose — принадлежность',
      titleUk: 'whose — належність',
      titleEs: 'whose — pertenencia',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'whose показывает принадлежность — «чей». Это притяжательное местоимение: «девочка, ЧЬЯ сумка…».',
          uk: 'whose показує належність — «чий». Це присвійний займенник: «дівчинка, ЧИЯ сумка…».',
          es: 'whose muestra pertenencia — «cuyo/cuya». Es un pronombre posesivo: «la niña, CUYA bolsa…».',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'The girl whose bag was stolen...', ru: 'Девочка, чью сумку украли…', uk: 'Дівчинка, чию сумку вкрали…', es: 'La niña cuya bolsa robaron…', hi: 'whose' },
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
            why: { ru: 'Здесь показываем принадлежность — чья сумка, поэтому whose.', es: 'Aquí se muestra pertenencia — de quién es la bolsa, por eso whose.' },
          },
        },
      ],
    },

    // ───────────────────────── 06 ─────────────────────────
    {
      num: '06',
      titleRu: 'where и when — место и время',
      titleUk: 'where і when — місце й час',
      titleEs: 'where y when — lugar y tiempo',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'where используют для места («город, ГДЕ…»), а when — для времени («день, КОГДА…»).',
          uk: 'where вживають для місця («місто, ДЕ…»), а when — для часу («день, КОЛИ…»).',
          es: 'where se usa para el lugar («la ciudad DONDE…»), y when para el tiempo («el día CUANDO…»).',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'The city where I was born.', ru: 'Город, где я родился.', uk: 'Місто, де я народився.', es: 'La ciudad donde nací.', hi: 'where' },
            { en: 'The day when we met.', ru: 'День, когда мы встретились.', uk: 'День, коли ми зустрілися.', es: 'El día en que nos conocimos.', hi: 'when' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно?', es: '¿Cuál es correcta?' },
            optionA: 'The city when I was born.',
            optionB: 'The city where I was born.',
            correct: 'B',
            explain: { ru: 'Город — это место, поэтому where, а не when.', es: 'La ciudad es un lugar, por eso where y no when.' },
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
      exampleCount: 0,
      blocks: [
        {
          kind: 'body',
          ru: 'Относительные слова добавляют к человеку или предмету пояснение: who — люди, which — предметы и животные, that — и то и другое, whose — принадлежность, where — место, when — время.',
          uk: 'Відносні слова додають до людини або предмета пояснення: who — люди, which — предмети й тварини, that — і те й інше, whose — належність, where — місце, when — час.',
          es: 'Las palabras relativas añaden una aclaración a la persona o al objeto: who — personas, which — objetos y animales, that — ambos casos, whose — pertenencia, where — lugar, when — tiempo.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Человек, который позвонил, — мой друг.', es: 'El hombre que llamó es mi amigo.' },
            answer: ['The man', 'who', 'called', 'is my friend'],
            slotLabels: [{ ru: 'кто', es: 'quién' }, { ru: 'связка', es: 'enlace' }, { ru: 'действие', es: 'acción' }, { ru: 'описание', es: 'descripción' }],
            distractors: ['which', 'where'],
          },
        },
        {
          kind: 'tip',
          ru: 'Правило простое: сначала называешь человека или вещь, потом ставишь нужное слово (who / which / that / whose / where / when) и продолжаешь мысль.',
          uk: 'Правило просте: спочатку називаєш людину або річ, потім ставиш потрібне слово (who / which / that / whose / where / when) і продовжуєш думку.',
          es: 'La regla es simple: primero nombras a la persona o la cosa, luego pones la palabra necesaria (who / which / that / whose / where / when) y continúas la idea.',
        },
      ],
    },
  ],
}
