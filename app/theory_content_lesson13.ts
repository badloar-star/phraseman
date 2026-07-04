// Theory content for Lesson 13 (Future Simple: will).
//
// This file is the structured data source for the TheoryLessonView engine.
// Content is transferred verbatim from the legacy lesson_help.tsx HINTS[13].render
// (Table components) without any grammar changes — the content is verified against
// Cambridge/Oxford.
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk) variants.
// `hi` on an example is the form to highlight in the phrase (will / won't).

import type { L1Block, L1Section } from './theory_content_lesson1'

export const LESSON13_THEORY: {
  titleRu: string
  titleUk: string
  titleEs: string
  sections: L1Section[]
} = {
  titleRu: 'Future Simple — will',
  titleUk: 'Future Simple — will',
  titleEs: 'Future Simple — will',
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
          ru: 'В этом уроке ты учишься говорить о будущем с помощью will. Формула простая: кто + will + действие. Will не меняется по лицам — он одинаковый для I, you, he, she, it, we, they.',
          uk: 'У цьому уроці ти вчишся говорити про майбутнє за допомогою will. Формула проста: хто + will + дія. Will не змінюється за особами — він однаковий для I, you, he, she, it, we, they.',
          es: 'En esta lección aprendes a hablar del futuro con will. La fórmula es simple: sujeto + will + acción. Will no cambia según la persona — es igual para I, you, he, she, it, we, they.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I will call you.', ru: 'Я позвоню тебе.', uk: 'Я зателефоную тобі.', es: 'Te llamaré.', hi: 'will' },
            { en: 'She will help me.', ru: 'Она поможет мне.', uk: 'Вона допоможе мені.', es: 'Ella me ayudará.', hi: 'will' },
            { en: 'We will be ready.', ru: 'Мы будем готовы.', uk: 'Ми будемо готові.', es: 'Estaremos listos.', hi: 'will' },
          ],
        },
        {
          kind: 'tip',
          ru: 'После will всегда идёт глагол в базовой форме — без -s и без to: will call, will help, will be.',
          uk: 'Після will завжди йде дієслово в базовій формі — без -s і без to: will call, will help, will be.',
          es: 'Después de will siempre va el verbo en forma base — sin -s y sin to: will call, will help, will be.',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Главная формула',
      titleUk: 'Головна формула',
      titleEs: 'La fórmula principal',
      defaultOpen: true,
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'Утверждение в Future Simple строится так: подлежащее + will + глагол.',
          uk: 'Ствердження у Future Simple будується так: підмет + will + дієслово.',
          es: 'La afirmación en Future Simple se construye así: sujeto + will + verbo.',
        },
        {
          kind: 'formula',
          formula: ['кто', 'will', 'глагол'],
          formulaEs: ['sujeto', 'will', 'verbo'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I will call you.', ru: 'I — will — call you', uk: 'I — will — call you', es: 'I — will — call you', hi: 'will' },
            { en: "I'll do it tomorrow.", ru: "I'll = I will — сокращённая форма", uk: "I'll = I will — скорочена форма", es: "I'll = I will — forma abreviada", hi: "I'll" },
            { en: 'Will you help me?', ru: 'Will — you — help me? (вопрос)', uk: 'Will — you — help me? (питання)', es: 'Will — you — help me? (pregunta)', hi: 'Will' },
          ],
        },
        {
          kind: 'drill',
          drill: { type: 'choice', before: 'I', after: 'call you', options: ['will', 'wills', 'to will'], answer: 'will', why: { ru: 'Will не меняется по лицам и идёт перед базовым глаголом.', es: 'Will no cambia según la persona y va antes del verbo en forma base.' } },
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Три формы: +, −, ?',
      titleUk: 'Три форми: +, −, ?',
      titleEs: 'Tres formas: +, −, ?',
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'Утверждение: Subject + will + V. Отрицание: Subject + won\'t + V. Вопрос: Will + subject + V? Сокращения: I\'ll, you\'ll.',
          uk: 'Ствердження: Subject + will + V. Заперечення: Subject + won\'t + V. Питання: Will + subject + V? Скорочення: I\'ll, you\'ll.',
          es: 'Afirmación: Subject + will + V. Negación: Subject + won\'t + V. Pregunta: Will + subject + V? Abreviaturas: I\'ll, you\'ll.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I will call you.', ru: 'Утверждение: Subject + will + V', uk: 'Ствердження: Subject + will + V', es: 'Afirmación: Subject + will + V', hi: 'will' },
            { en: "She won't be late.", ru: 'Отрицание: Subject + won\'t + V', uk: 'Заперечення: Subject + won\'t + V', es: 'Negación: Subject + won\'t + V', hi: "won't" },
            { en: 'Will you help me?', ru: 'Вопрос: Will + subj + V?', uk: 'Питання: Will + subj + V?', es: 'Pregunta: Will + subj + V?', hi: 'Will' },
            { en: "I'll do it tomorrow.", ru: 'Сокр.: I\'ll / You\'ll', uk: 'Скор.: I\'ll / You\'ll', es: 'Abrev.: I\'ll / You\'ll', hi: "I'll" },
          ],
        },
        {
          kind: 'tip',
          ru: 'won\'t — это сокращение от will not. И won\'t, и will идут перед базовым глаголом.',
          uk: 'won\'t — це скорочення від will not. І won\'t, і will йдуть перед базовим дієсловом.',
          es: 'won\'t es la forma abreviada de will not. Tanto won\'t como will van antes del verbo en forma base.',
        },
        {
          kind: 'drill',
          drill: { type: 'spot_slip', chips: ['Will', 'you', 'helps', 'me'], answerIndex: 2, hint: { ru: 'Тут не та форма глагола. Тапни лишнее слово.', es: 'Aquí la forma del verbo no es correcta. Toca la palabra sobrante.' }, fix: { ru: 'После will глагол в базовой форме: Will you help me?', es: 'Después de will el verbo va en forma base: Will you help me?' } },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'Когда использовать will',
      titleUk: 'Коли вживати will',
      titleEs: 'Cuándo usar will',
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'Will используют для решения, принятого прямо сейчас, для обещания, для предсказания (когда «думаю, что…»), а также для просьбы или предложения.',
          uk: 'Will вживають для рішення, прийнятого прямо зараз, для обіцянки, для передбачення (коли «думаю, що…»), а також для прохання або пропозиції.',
          es: 'Will se usa para una decisión tomada en el momento, para una promesa, para una predicción (cuando "creo que…"), y también para un pedido u ofrecimiento.',
        },
        {
          kind: 'examples',
          examples: [
            { en: "It's cold — I'll close the window.", ru: 'Решение прямо сейчас', uk: 'Рішення зараз', es: 'Decisión en el momento', hi: "I'll" },
            { en: "I'll help you tomorrow.", ru: 'Обещание', uk: 'Обіцянка', es: 'Promesa', hi: "I'll" },
            { en: 'I think it will rain.', ru: 'Предсказание (думаю)', uk: 'Передбачення (думаю)', es: 'Predicción (creo que)', hi: 'will' },
            { en: 'Will you open the door?', ru: 'Просьба / предложение', uk: 'Прохання / пропозиція', es: 'Pedido / ofrecimiento', hi: 'Will' },
          ],
        },
        {
          kind: 'drill',
          drill: { type: 'binary', question: { ru: 'Где верно?', es: '¿Cuál es correcta?' }, optionA: 'She will to help.', optionB: 'She will help.', correct: 'B', explain: { ru: 'После will глагол без to: will help.', es: 'Después de will el verbo va sin to: will help.' } },
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'Частые ошибки',
      titleUk: 'Найчастіші помилки',
      titleEs: 'Errores frecuentes',
      blocks: [
        {
          kind: 'fix',
          fixes: [
            { wrong: 'I will to call you.', right: 'I will call you.' },
            { wrong: 'She will helps me.', right: 'She will help me.' },
            { wrong: 'Will you helps me?', right: 'Will you help me?' },
          ],
        },
        {
          kind: 'tip',
          ru: 'После will не ставь to и не добавляй -s к глаголу. Will одинаков для всех лиц.',
          uk: 'Після will не став to і не додавай -s до дієслова. Will однаковий для всіх осіб.',
          es: 'Después de will no pongas to ni añadas -s al verbo. Will es igual para todas las personas.',
        },
        {
          kind: 'drill',
          drill: { type: 'word_bank', prompt: { ru: 'Она поможет мне.', es: 'Ella me ayudará.' }, answer: ['She', 'will', 'help', 'me'], slotLabels: [{ ru: 'кто', es: 'sujeto' }, { ru: 'will', es: 'will' }, { ru: 'глагол', es: 'verbo' }, { ru: 'дополнение', es: 'complemento' }], distractors: ['helps', 'to'] },
        },
      ],
    },
  ],
}
