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

export const LESSON17_THEORY: { titleRu: string; titleUk: string; titleEs: string; sections: L1Section[] } = {
  titleRu: 'Present Continuous',
  titleUk: 'Present Continuous',
  titleEs: 'Present Continuous',
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
          ru: 'Present Continuous — это время для действия, которое происходит прямо сейчас, в момент речи. Формула простая: am, is или are + глагол с окончанием -ing.',
          uk: 'Present Continuous — це час для дії, яка відбувається прямо зараз, у момент мовлення. Формула проста: am, is або are + дієслово із закінченням -ing.',
          es: 'El Present Continuous es el tiempo para una acción que está ocurriendo justo ahora, en el momento de hablar. La fórmula es simple: am, is o are + verbo con la terminación -ing. Es como el "estar + gerundio" del español (estoy trabajando), pero en inglés.',
        },
        {
          kind: 'formula',
          formula: ['кто / что', 'am / is / are', 'глагол + -ing'],
          formulaEs: ['quién / qué', 'am / is / are', 'verbo + -ing'],
        },
        {
          kind: 'examples',
          examples: [
            { en: "She's working now.", ru: 'Она сейчас работает.', uk: 'Вона зараз працює.', es: 'Ella está trabajando ahora.', hi: 'working' },
            { en: 'Are they coming?', ru: 'Они идут?', uk: 'Вони йдуть?', es: '¿Vienen ellos?', hi: 'coming' },
            { en: "He isn't sleeping.", ru: 'Он не спит.', uk: 'Він не спить.', es: 'Él no está durmiendo.', hi: 'sleeping' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Ключевой признак этого времени — две части: форма To Be (am/is/are) плюс глагол на -ing.',
          uk: 'Ключова ознака цього часу — дві частини: форма To Be (am/is/are) плюс дієслово на -ing.',
          es: 'La señal clave de este tiempo son dos partes: la forma de To Be (am/is/are) más el verbo terminado en -ing.',
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
          ru: 'У Present Continuous три формы. Утверждение (+): am/is/are + V-ing. Отрицание (−): am/is/are + not + V-ing. Вопрос (?): Am/Is/Are в начале + кто + V-ing.',
          uk: 'У Present Continuous три форми. Ствердження (+): am/is/are + V-ing. Заперечення (−): am/is/are + not + V-ing. Питання (?): Am/Is/Are на початку + хто + V-ing.',
          es: 'El Present Continuous tiene tres formas. Afirmativa (+): am/is/are + V-ing. Negativa (−): am/is/are + not + V-ing. Pregunta (?): Am/Is/Are al principio + quién + V-ing.',
        },
        {
          kind: 'examples',
          examples: [
            { en: "She's working now.", ru: '+ am/is/are + V-ing', uk: '+ am/is/are + V-ing', es: '+ am/is/are + V-ing', hi: 'working' },
            { en: "He isn't sleeping.", ru: '− am/is/are + not + V-ing', uk: '− am/is/are + not + V-ing', es: '− am/is/are + not + V-ing', hi: 'sleeping' },
            { en: 'Are they coming?', ru: '? Am/Is/Are + кто + V-ing?', uk: '? Am/Is/Are + хто + V-ing?', es: '? Am/Is/Are + quién + V-ing?', hi: 'coming' },
          ],
        },
        {
          kind: 'tip',
          ru: 'В вопросе форма To Be (Am/Is/Are) выходит вперёд, а сам глагол всё равно остаётся на -ing.',
          uk: 'У питанні форма To Be (Am/Is/Are) виходить уперед, а саме дієслово все одно лишається на -ing.',
          es: 'En la pregunta, la forma de To Be (Am/Is/Are) se coloca al principio, y el verbo sigue llevando -ing igualmente.',
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Правила написания -ing',
      titleUk: 'Правила написання -ing',
      titleEs: 'Reglas de escritura de -ing',
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'Чтобы получить форму на -ing, обычно просто добавляют -ing. Но есть несколько правил написания, которые надо запомнить.',
          uk: 'Щоб отримати форму на -ing, зазвичай просто додають -ing. Але є кілька правил написання, які треба запам\'ятати.',
          es: 'Para formar la forma en -ing, normalmente solo se añade -ing. Pero hay algunas reglas de escritura que debes recordar.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'work → working, read → reading', ru: 'Большинство глаголов: просто + ing', uk: 'Більшість дієслів: просто + ing', es: 'La mayoría de los verbos: solo + ing', hi: 'ing' },
            { en: 'come → coming, write → writing', ru: 'На -e → убрать e, потом + ing', uk: 'На -e → прибрати e, потім + ing', es: 'Terminan en -e → quitar la e y luego + ing', hi: 'ing' },
            { en: 'run → running, sit → sitting', ru: 'CVC (короткое) → удвоить последнюю согласную', uk: 'CVC (коротке) → подвоїти останню приголосну', es: 'CVC (corto) → duplicar la última consonante', hi: 'ing' },
            { en: 'lie → lying, die → dying', ru: 'На -ie → заменить на -ying', uk: 'На -ie → замінити на -ying', es: 'Terminan en -ie → reemplazar por -ying', hi: 'ing' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Запомни четыре случая: обычный +ing, убираем -e, удваиваем согласную в коротких словах, -ie меняем на -ying.',
          uk: 'Запам\'ятай чотири випадки: звичайний +ing, прибираємо -e, подвоюємо приголосну в коротких словах, -ie міняємо на -ying.',
          es: 'Recuerda los cuatro casos: el normal +ing, quitamos la -e, duplicamos la consonante en palabras cortas, y -ie lo cambiamos por -ying.',
        },
        {
          kind: 'drill',
          drill: { type: 'choice', before: 'come →', after: '', options: ['comeing', 'coming', 'comming'], answer: 'coming', why: { ru: 'Глагол на -e: убираем e и добавляем -ing → coming.', es: 'Verbo terminado en -e: quitamos la e y añadimos -ing → coming.' } },
        },
        {
          kind: 'drill',
          drill: { type: 'choice', before: 'run →', after: '', options: ['runing', 'running', 'runed'], answer: 'running', why: { ru: 'Короткое слово CVC: удваиваем последнюю согласную → running.', es: 'Palabra corta CVC: duplicamos la última consonante → running.' } },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'Соберём фразу',
      titleUk: 'Зберемо фразу',
      titleEs: 'Armemos la frase',
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'Теперь соединим всё вместе: правильная форма To Be для своего лица плюс глагол на -ing. С I — am, с he/she/it — is, с you/we/they — are.',
          uk: 'Тепер з\'єднаємо все разом: правильна форма To Be для свого числа плюс дієслово на -ing. З I — am, з he/she/it — is, з you/we/they — are.',
          es: 'Ahora juntemos todo: la forma correcta de To Be según la persona más el verbo en -ing. Con I — am, con he/she/it — is, con you/we/they — are.',
        },
        {
          kind: 'examples',
          examples: [
            { en: "She's working now.", ru: 'Она сейчас работает.', uk: 'Вона зараз працює.', es: 'Ella está trabajando ahora.', hi: 'is' },
            { en: "He isn't sleeping.", ru: 'Он не спит.', uk: 'Він не спить.', es: 'Él no está durmiendo.', hi: 'is' },
            { en: 'Are they coming?', ru: 'Они идут?', uk: 'Вони йдуть?', es: '¿Vienen ellos?', hi: 'are' },
          ],
        },
        {
          kind: 'drill',
          drill: { type: 'word_bank', prompt: { ru: 'Они идут? (вопрос)', es: '¿Vienen ellos? (pregunta)' }, answer: ['Are', 'they', 'coming'], slotLabels: [{ ru: 'связка', es: 'verbo de enlace' }, { ru: 'кто', es: 'quién' }, { ru: 'глагол -ing', es: 'verbo -ing' }], distractors: ['Is', 'come'] },
        },
        {
          kind: 'drill',
          drill: { type: 'binary', question: { ru: 'Где верно?', es: '¿Cuál es correcto?' }, optionA: 'He is sleep', optionB: "He isn't sleeping", correct: 'B', explain: { ru: 'В Present Continuous нужен глагол на -ing: sleeping.', es: 'En Present Continuous se necesita el verbo en -ing: sleeping.' } },
        },
      ],
    },
  ],
};
