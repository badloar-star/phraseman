// Theory content for Lesson 17 (Present Continuous).
//
// Structured data source for the TheoryLessonView engine.
// Content is transferred verbatim from the legacy lesson_help.tsx HINTS[17].render
// (Table components) without any grammar changes — the content is verified
// against Cambridge/Oxford.
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk) variants.
// `hi` on an example is the form to highlight in the phrase (am/is/are/-ing).

import type { L1Block, L1Section } from './theory_content_lesson1';

export const LESSON17_THEORY: { titleRu: string; titleUk: string; sections: L1Section[] } = {
  titleRu: 'Present Continuous',
  titleUk: 'Present Continuous',
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
          ru: 'Present Continuous — это время для действия, которое происходит прямо сейчас, в момент речи. Формула простая: am, is или are + глагол с окончанием -ing.',
          uk: 'Present Continuous — це час для дії, яка відбувається прямо зараз, у момент мовлення. Формула проста: am, is або are + дієслово із закінченням -ing.',
        },
        {
          kind: 'formula',
          formula: ['кто / что', 'am / is / are', 'глагол + -ing'],
        },
        {
          kind: 'examples',
          examples: [
            { en: "She's working now.", ru: 'Она сейчас работает.', uk: 'Вона зараз працює.', hi: 'working' },
            { en: 'Are they coming?', ru: 'Они идут?', uk: 'Вони йдуть?', hi: 'coming' },
            { en: "He isn't sleeping.", ru: 'Он не спит.', uk: 'Він не спить.', hi: 'sleeping' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Ключевой признак этого времени — две части: форма To Be (am/is/are) плюс глагол на -ing.',
          uk: 'Ключова ознака цього часу — дві частини: форма To Be (am/is/are) плюс дієслово на -ing.',
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
          ru: 'У Present Continuous три формы. Утверждение (+): am/is/are + V-ing. Отрицание (−): am/is/are + not + V-ing. Вопрос (?): Am/Is/Are в начале + кто + V-ing.',
          uk: 'У Present Continuous три форми. Ствердження (+): am/is/are + V-ing. Заперечення (−): am/is/are + not + V-ing. Питання (?): Am/Is/Are на початку + хто + V-ing.',
        },
        {
          kind: 'examples',
          examples: [
            { en: "She's working now.", ru: '+ am/is/are + V-ing', uk: '+ am/is/are + V-ing', hi: 'working' },
            { en: "He isn't sleeping.", ru: '− am/is/are + not + V-ing', uk: '− am/is/are + not + V-ing', hi: 'sleeping' },
            { en: 'Are they coming?', ru: '? Am/Is/Are + кто + V-ing?', uk: '? Am/Is/Are + хто + V-ing?', hi: 'coming' },
          ],
        },
        {
          kind: 'tip',
          ru: 'В вопросе форма To Be (Am/Is/Are) выходит вперёд, а сам глагол всё равно остаётся на -ing.',
          uk: 'У питанні форма To Be (Am/Is/Are) виходить уперед, а саме дієслово все одно лишається на -ing.',
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Правила написания -ing',
      titleUk: 'Правила написання -ing',
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'Чтобы получить форму на -ing, обычно просто добавляют -ing. Но есть несколько правил написания, которые надо запомнить.',
          uk: 'Щоб отримати форму на -ing, зазвичай просто додають -ing. Але є кілька правил написання, які треба запам\'ятати.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'work → working, read → reading', ru: 'Большинство глаголов: просто + ing', uk: 'Більшість дієслів: просто + ing', hi: 'ing' },
            { en: 'come → coming, write → writing', ru: 'На -e → убрать e, потом + ing', uk: 'На -e → прибрати e, потім + ing', hi: 'ing' },
            { en: 'run → running, sit → sitting', ru: 'CVC (короткое) → удвоить последнюю согласную', uk: 'CVC (коротке) → подвоїти останню приголосну', hi: 'ing' },
            { en: 'lie → lying, die → dying', ru: 'На -ie → заменить на -ying', uk: 'На -ie → замінити на -ying', hi: 'ing' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Запомни четыре случая: обычный +ing, убираем -e, удваиваем согласную в коротких словах, -ie меняем на -ying.',
          uk: 'Запам\'ятай чотири випадки: звичайний +ing, прибираємо -e, подвоюємо приголосну в коротких словах, -ie міняємо на -ying.',
        },
        {
          kind: 'drill',
          drill: { type: 'choice', before: 'come →', after: '', options: ['comeing', 'coming', 'comming'], answer: 'coming', why: { ru: 'Глагол на -e: убираем e и добавляем -ing → coming.' } },
        },
        {
          kind: 'drill',
          drill: { type: 'choice', before: 'run →', after: '', options: ['runing', 'running', 'runed'], answer: 'running', why: { ru: 'Короткое слово CVC: удваиваем последнюю согласную → running.' } },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'Соберём фразу',
      titleUk: 'Зберемо фразу',
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'Теперь соединим всё вместе: правильная форма To Be для своего лица плюс глагол на -ing. С I — am, с he/she/it — is, с you/we/they — are.',
          uk: 'Тепер з\'єднаємо все разом: правильна форма To Be для свого числа плюс дієслово на -ing. З I — am, з he/she/it — is, з you/we/they — are.',
        },
        {
          kind: 'examples',
          examples: [
            { en: "She's working now.", ru: 'Она сейчас работает.', uk: 'Вона зараз працює.', hi: 'is' },
            { en: "He isn't sleeping.", ru: 'Он не спит.', uk: 'Він не спить.', hi: 'is' },
            { en: 'Are they coming?', ru: 'Они идут?', uk: 'Вони йдуть?', hi: 'are' },
          ],
        },
        {
          kind: 'drill',
          drill: { type: 'word_bank', prompt: { ru: 'Они идут? (вопрос)' }, answer: ['Are', 'they', 'coming'], slotLabels: [{ ru: 'связка' }, { ru: 'кто' }, { ru: 'глагол -ing' }], distractors: ['Is', 'come'] },
        },
        {
          kind: 'drill',
          drill: { type: 'binary', question: { ru: 'Где верно?' }, optionA: 'He is sleep', optionB: "He isn't sleeping", correct: 'B', explain: { ru: 'В Present Continuous нужен глагол на -ing: sleeping.' } },
        },
      ],
    },
  ],
};
