// Theory content for Lesson 23 (Passive Voice).
//
// Structured data source for the TheoryLessonView engine. Content transferred
// from the legacy lesson_help.tsx HINTS[23].render (two tables: passive across
// tenses, and active → passive transformations) and expanded into meaningful
// sections. Grammar is verified against Cambridge/Oxford usage of the passive.
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk).
// `hi` on an example is the passive marker (am/is/are/was/were/will be/
// has been/being + V3) to highlight in the phrase.

import type { L1Block } from './theory_content_lesson1'

/** Тип одного интерактива (как в движке теории). */
type L23DrillType = 'choice' | 'word_bank' | 'spot_slip' | 'binary'

/** Готовый интерактив теории. Структура повторяет TheoryDrill движка. */
interface L23Drill {
  type: L23DrillType
  [key: string]: unknown
}

/**
 * Блок секции урока 23. Расширяет L1Block видом 'drill' — движок теории
 * (TheoryBlock) поддерживает интерактивы, а узкий L1Block из урока 1 — нет.
 */
type L23Block =
  | L1Block
  | { kind: 'drill'; drill: L23Drill }

/** Секция урока 23 (как L1Section, но с поддержкой drill-блоков). */
interface L23Section {
  num: string
  titleRu: string
  titleUk: string
  exampleCount?: number
  defaultOpen?: boolean
  blocks: L23Block[]
}

export const LESSON23_THEORY: { titleRu: string; titleUk: string; sections: L23Section[] } = {
  titleRu: 'Passive Voice',
  titleUk: 'Passive Voice',
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
          ru: 'В этом уроке ты учишься страдательному залогу (Passive Voice). В нём важно не кто делает действие, а что происходит с предметом. Главная формула простая: правильная форма be + V3 (третья форма глагола). Кто именно сделал — часто вообще не называют.',
          uk: 'У цьому уроці ти вчишся пасивному стану (Passive Voice). У ньому важливо не хто робить дію, а що відбувається з предметом. Головна формула проста: правильна форма be + V3 (третя форма дієслова). Хто саме зробив — часто взагалі не називають.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'English is spoken here.', ru: 'Здесь говорят по-английски.', uk: 'Тут розмовляють англійською.', hi: 'is spoken' },
            { en: 'The letter was written.', ru: 'Письмо было написано.', uk: 'Лист був написаний.', hi: 'was written' },
            { en: 'My phone was stolen.', ru: 'Мой телефон украли.', uk: 'Мій телефон вкрали.', hi: 'was stolen' },
          ],
        },
        {
          kind: 'tip',
          ru: 'В пассиве всегда есть форма be (am/is/are/was/were/been/being) плюс третья форма глагола (V3): is spoken, was written.',
          uk: 'У пасиві завжди є форма be (am/is/are/was/were/been/being) плюс третя форма дієслова (V3): is spoken, was written.',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Главная формула',
      titleUk: 'Головна формула',
      defaultOpen: true,
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Любой пассив строится по одной схеме: предмет + нужная форма be + V3. Меняется только форма be — она и задаёт время. Сам глагол всегда остаётся в третьей форме (V3).',
          uk: 'Будь-який пасив будується за однією схемою: предмет + потрібна форма be + V3. Змінюється лише форма be — вона й задає час. Саме дієслово завжди лишається в третій формі (V3).',
        },
        {
          kind: 'formula',
          formula: ['предмет', 'be (am/is/are/was/were/will be/has been/being)', 'V3'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'The letter was written.', ru: 'The letter — was — written.', uk: 'The letter — was — written.', hi: 'was' },
            { en: 'It will be done tomorrow.', ru: 'It — will be — done.', uk: 'It — will be — done.', hi: 'will be' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'The letter',
            after: 'written',
            options: ['was', 'did', 'has'],
            answer: 'was',
            why: { ru: 'Пассив = be + V3. В прошлом для the letter это was: The letter was written.' },
          },
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Пассив во всех временах',
      titleUk: 'Пасив в усіх часах',
      exampleCount: 5,
      blocks: [
        {
          kind: 'body',
          ru: 'Вот пассив в основных временах. Запоминай не отдельные слова, а связку «форма be + V3» для каждого времени. Сам V3 не меняется — меняется только be.',
          uk: 'Ось пасив в основних часах. Запам’ятовуй не окремі слова, а зв’язку «форма be + V3» для кожного часу. Сам V3 не змінюється — змінюється лише be.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'English is spoken here.', ru: 'Present Simple: am/is/are + V3.', uk: 'Present Simple: am/is/are + V3.', hi: 'is spoken' },
            { en: 'The letter was written.', ru: 'Past Simple: was/were + V3.', uk: 'Past Simple: was/were + V3.', hi: 'was written' },
            { en: 'It will be done tomorrow.', ru: 'Future Simple: will be + V3.', uk: 'Future Simple: will be + V3.', hi: 'will be done' },
            { en: 'It has been finished.', ru: 'Present Perfect: has/have + been + V3.', uk: 'Present Perfect: has/have + been + V3.', hi: 'has been finished' },
            { en: 'It is being fixed.', ru: 'Present Continuous: am/is/are + being + V3.', uk: 'Present Continuous: am/is/are + being + V3.', hi: 'is being fixed' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Время в пассиве показывает форма be. В Present Perfect добавляется been, в Continuous — being, а глагол всегда остаётся в V3.',
          uk: 'Час у пасиві показує форма be. У Present Perfect додається been, у Continuous — being, а дієслово завжди лишається у V3.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верный пассив в будущем?' },
            optionA: 'It will done tomorrow',
            optionB: 'It will be done tomorrow',
            correct: 'B',
            explain: { ru: 'Future пассив = will be + V3: It will be done tomorrow.' },
          },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'Активный → Пассивный',
      titleUk: 'Активний → Пасивний',
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'Чтобы превратить активную фразу в пассивную, объект действия становится подлежащим, а глагол берёт форму be + V3. Кто сделал — можно добавить через by, а можно вообще не называть.',
          uk: 'Щоб перетворити активну фразу на пасивну, об’єкт дії стає підметом, а дієслово бере форму be + V3. Хто зробив — можна додати через by, а можна взагалі не називати.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'The letter was written by her.', ru: 'She wrote the letter. → The letter was written by her.', uk: 'She wrote the letter. → The letter was written by her.', hi: 'was written' },
            { en: 'This house was built by them.', ru: 'They built this house. → This house was built by them.', uk: 'They built this house. → This house was built by them.', hi: 'was built' },
            { en: 'My phone was stolen.', ru: 'Someone stole my phone. → My phone was stolen.', uk: 'Someone stole my phone. → My phone was stolen.', hi: 'was stolen' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Если важно, кто сделал действие, добавь by: by her, by them. Если это неважно или неизвестно — by можно опустить: My phone was stolen.',
          uk: 'Якщо важливо, хто зробив дію, додай by: by her, by them. Якщо це неважливо або невідомо — by можна опустити: My phone was stolen.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Письмо было написано ею.' },
            answer: ['The letter', 'was', 'written', 'by her'],
            slotLabels: [{ ru: 'предмет' }, { ru: 'be' }, { ru: 'V3' }, { ru: 'кем' }],
            distractors: ['wrote', 'she'],
          },
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'Самые частые ошибки',
      titleUk: 'Найчастіші помилки',
      blocks: [
        {
          kind: 'fix',
          fixes: [
            { wrong: 'The letter written.', right: 'The letter was written.' },
            { wrong: 'It will done tomorrow.', right: 'It will be done tomorrow.' },
            { wrong: 'It is finished by long.', right: 'It has been finished.' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Без формы be пассива не бывает: одной V3 мало. Всегда нужна связка be + V3: was written, will be done, has been finished.',
          uk: 'Без форми be пасиву не буває: самої V3 замало. Завжди потрібна зв’язка be + V3: was written, will be done, has been finished.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'spot_slip',
            chips: ['It', 'will', 'done', 'tomorrow'],
            answerIndex: 1,
            hint: { ru: 'Здесь не хватает слова be, а одно слово стоит без него. Тапни проблемное место.' },
            fix: { ru: 'Future пассив = will be + V3: It will be done tomorrow.' },
          },
        },
      ],
    },

    // ───────────────────────── 06 ─────────────────────────
    {
      num: '06',
      titleRu: 'Что нужно вынести из урока',
      titleUk: 'Що треба винести з уроку',
      blocks: [
        {
          kind: 'body',
          ru: 'Пассив — это «что происходит с предметом», а не «кто делает». Формула одна: предмет + форма be + V3. Время задаёт be: is spoken, was written, will be done, has been finished, is being fixed.',
          uk: 'Пасив — це «що відбувається з предметом», а не «хто робить». Формула одна: предмет + форма be + V3. Час задає be: is spoken, was written, will be done, has been finished, is being fixed.',
        },
        {
          kind: 'tip',
          ru: 'Держи одну схему: предмет + be + V3. Хочешь назвать исполнителя — добавь by: The letter was written by her.',
          uk: 'Тримай одну схему: предмет + be + V3. Хочеш назвати виконавця — додай by: The letter was written by her.',
        },
      ],
    },
  ],
}
