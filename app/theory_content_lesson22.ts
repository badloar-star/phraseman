// Theory content for Lesson 22 (Gerund -ing vs Infinitive to + V).
//
// Structured data source for the TheoryLessonView engine.
// Content transferred verbatim from the legacy lesson_help.tsx THEORY[22].render
// (Table components) without any grammar changes — verified against Cambridge/Oxford.
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk) variants.
// `hi` on an example is the form to highlight in the phrase.

import type { L1Section } from './theory_content_lesson1'

export const LESSON22_THEORY: { titleRu: string; titleUk: string; titleEs: string; sections: L1Section[] } = {
  titleRu: 'Герундий (-ing)',
  titleUk: 'Герундій (-ing)',
  titleEs: 'Gerundio (-ing)',
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
          ru: 'Когда в английском один глагол идёт после другого, второй глагол не остаётся «голым». После одних слов он принимает форму с -ing (герундий): reading, swimming, cooking. После других слов он берёт форму to + глагол (инфинитив): to go, to rest, to see. В этом уроке ты учишься чувствовать, где какая форма.',
          uk: 'Коли в англійській одне дієслово йде після іншого, друге дієслово не лишається «голим». Після одних слів воно набуває форми з -ing (герундій): reading, swimming, cooking. Після інших слів воно бере форму to + дієслово (інфінітив): to go, to rest, to see. У цьому уроці ти вчишся відчувати, де яка форма.',
          es: 'Cuando en inglés un verbo va después de otro, el segundo verbo no se queda «desnudo». Después de unas palabras toma la forma con -ing (gerundio): reading, swimming, cooking. Después de otras toma la forma to + verbo (infinitivo): to go, to rest, to see. En esta lección aprendes a sentir cuál forma va dónde.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I like swimming.', ru: 'Я люблю плавать (after like — герундий)', uk: 'Я люблю плавати (після like — герундій)', es: 'Me gusta nadar (after like — gerundio)', hi: 'swimming' },
            { en: 'I want to go.', ru: 'Я хочу пойти (after want — инфинитив)', uk: 'Я хочу піти (після want — інфінітив)', es: 'Quiero ir (after want — infinitivo)', hi: 'to go' },
            { en: 'Stop talking!', ru: 'Перестань говорить! (after stop — герундий)', uk: 'Припини говорити! (після stop — герундій)', es: '¡Deja de hablar! (after stop — gerundio)', hi: 'talking' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Не переводи дословно — запоминай само слово вместе с его формой: like + -ing, want + to. Со временем правильная форма приходит сама.',
          uk: 'Не перекладай дослівно — запам’ятовуй саме слово разом з його формою: like + -ing, want + to. З часом правильна форма приходить сама.',
          es: 'No traduzcas literalmente — memoriza la palabra junto con su forma: like + -ing, want + to. Con el tiempo la forma correcta llega sola.',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'После этих слов — Герундий (-ing)',
      titleUk: 'Після цих слів — Герундій (-ing)',
      titleEs: 'Después de estas palabras — Gerundio (-ing)',
      defaultOpen: true,
      exampleCount: 8,
      blocks: [
        {
          kind: 'examples',
          examples: [
            { en: 'She enjoys reading.', ru: 'enjoy — Она наслаждается чтением.', uk: 'enjoy — Вона насолоджується читанням.', es: 'enjoy — Ella disfruta leyendo.', hi: 'reading' },
            { en: 'I like swimming.', ru: 'like — Я люблю плавать.', uk: 'like — Я люблю плавати.', es: 'like — Me gusta nadar.', hi: 'swimming' },
            { en: 'He loves cooking.', ru: 'love — Он обожает готовить.', uk: 'love — Він обожнює готувати.', es: 'love — Le encanta cocinar.', hi: 'cooking' },
            { en: 'She hates waiting.', ru: 'hate — Она ненавидит ждать.', uk: 'hate — Вона ненавидить чекати.', es: 'hate — Ella odia esperar.', hi: 'waiting' },
            { en: 'Stop talking!', ru: 'stop — Перестань говорить!', uk: 'stop — Припини говорити!', es: 'stop — ¡Deja de hablar!', hi: 'talking' },
            { en: 'I finished working.', ru: 'finish — Я закончил работать.', uk: 'finish — Я закінчив працювати.', es: 'finish — Terminé de trabajar.', hi: 'working' },
            { en: 'Do you mind opening the door?', ru: 'mind — Ты не против открыть дверь?', uk: 'mind — Ти не проти відчинити двері?', es: 'mind — ¿Te importa abrir la puerta?', hi: 'opening' },
            { en: 'He suggested going there.', ru: 'suggest — Он предложил пойти туда.', uk: 'suggest — Він запропонував піти туди.', es: 'suggest — Él sugirió ir allí.', hi: 'going' },
          ],
        },
        {
          kind: 'tip',
          ru: 'enjoy, like, love, hate, stop, finish, mind, suggest — после них глагол берёт -ing.',
          uk: 'enjoy, like, love, hate, stop, finish, mind, suggest — після них дієслово бере -ing.',
          es: 'enjoy, like, love, hate, stop, finish, mind, suggest — después de ellos el verbo toma -ing.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'I enjoy',
            after: 'books.',
            options: ['read', 'to read', 'reading'],
            answer: 'reading',
            why: { ru: 'После enjoy глагол берёт форму с -ing: I enjoy reading.', es: 'Después de enjoy el verbo toma la forma con -ing: I enjoy reading.' },
          },
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Перестань говорить!', es: '¡Deja de hablar!' },
            answer: ['Stop', 'talking'],
            slotLabels: [{ ru: 'глагол', es: 'verbo' }, { ru: '-ing', es: '-ing' }],
            distractors: ['to', 'talk'],
          },
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'После этих слов — Инфинитив (to + V)',
      titleUk: 'Після цих слів — Інфінітив (to + V)',
      titleEs: 'Después de estas palabras — Infinitivo (to + V)',
      exampleCount: 6,
      blocks: [
        {
          kind: 'examples',
          examples: [
            { en: 'I want to go.', ru: 'want — Я хочу пойти.', uk: 'want — Я хочу піти.', es: 'want — Quiero ir.', hi: 'to go' },
            { en: 'She needs to rest.', ru: 'need — Ей нужно отдохнуть.', uk: 'need — Їй треба відпочити.', es: 'need — Ella necesita descansar.', hi: 'to rest' },
            { en: 'I hope to see you.', ru: 'hope — Я надеюсь увидеть тебя.', uk: 'hope — Я сподіваюся побачити тебе.', es: 'hope — Espero verte.', hi: 'to see' },
            { en: 'We plan to travel.', ru: 'plan — Мы планируем путешествовать.', uk: 'plan — Ми плануємо подорожувати.', es: 'plan — Planeamos viajar.', hi: 'to travel' },
            { en: 'He decided to stay.', ru: 'decide — Он решил остаться.', uk: 'decide — Він вирішив залишитися.', es: 'decide — Él decidió quedarse.', hi: 'to stay' },
            { en: 'She agreed to help.', ru: 'agree — Она согласилась помочь.', uk: 'agree — Вона погодилася допомогти.', es: 'agree — Ella accedió a ayudar.', hi: 'to help' },
          ],
        },
        {
          kind: 'tip',
          ru: 'want, need, hope, plan, decide, agree — после них глагол берёт to: to go, to rest, to help.',
          uk: 'want, need, hope, plan, decide, agree — після них дієслово бере to: to go, to rest, to help.',
          es: 'want, need, hope, plan, decide, agree — después de ellos el verbo toma to: to go, to rest, to help.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'I want',
            after: 'home.',
            options: ['going', 'go', 'to go'],
            answer: 'to go',
            why: { ru: 'После want глагол берёт форму to + глагол: I want to go.', es: 'Después de want el verbo toma la forma to + verbo: I want to go.' },
          },
        },
        {
          kind: 'drill',
          drill: {
            type: 'spot_slip',
            chips: ['She', 'needs', 'resting'],
            answerIndex: 2,
            hint: { ru: 'Тут не та форма. Тапни лишнее слово.', es: 'Aquí la forma no es correcta. Toca la palabra sobrante.' },
            fix: { ru: 'После need нужен инфинитив: She needs to rest.', es: 'Después de need se necesita el infinitivo: She needs to rest.' },
          },
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно?', es: '¿Dónde está correcto?' },
            optionA: 'We plan travelling',
            optionB: 'We plan to travel',
            correct: 'B',
            explain: { ru: 'После plan нужен инфинитив с to: We plan to travel.', es: 'Después de plan se necesita el infinitivo con to: We plan to travel.' },
          },
        },
      ],
    },
  ],
}
