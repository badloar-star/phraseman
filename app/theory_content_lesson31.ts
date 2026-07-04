// Theory content for Lesson 31 (Complex Object: verb + object + (to) infinitive).
//
// Structured data source for the TheoryLessonView engine. Content transferred
// from the legacy lesson_help.tsx HINTS[31].render (two tables: verbs that take
// "object + to + V" and verbs that take "object + bare V") and expanded into
// meaningful sections. Grammar is verified against Cambridge/Oxford usage of the
// Complex Object construction.
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk).
// `hi` on an example is the construction form (the object pronoun + to / bare V)
// to highlight in the phrase.

import type { L1Section } from './theory_content_lesson1'

export const LESSON31_THEORY: { titleRu: string; titleUk: string; titleEs: string; sections: L1Section[] } = {
  titleRu: 'Complex Object',
  titleUk: 'Complex Object',
  titleEs: 'Complex Object',
  sections: [
    // ───────────────────────── 01 ─────────────────────────
    {
      num: '01',
      titleRu: 'Что ты тренируешь в этом уроке',
      titleUk: 'Що ти тренуєш у цьому уроці',
      titleEs: 'Qué vas a practicar en esta lección',
      defaultOpen: true,
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'В этом уроке ты учишься строить «сложное дополнение» (Complex Object): глагол + кого/что + действие. По-русски мы говорим «Я хочу, чтобы ты остался», а в английском вместо «чтобы» ставим объект и инфинитив: I want you to stay. После одних глаголов идёт to + глагол, после других — глагол без to.',
          uk: 'У цьому уроці ти вчишся будувати «складний додаток» (Complex Object): дієслово + кого/що + дія. Українською ми кажемо «Я хочу, щоб ти лишився», а в англійській замість «щоб» ставимо об’єкт і інфінітив: I want you to stay. Після одних дієслів іде to + дієслово, після інших — дієслово без to.',
          es: 'En esta lección aprendes a construir el «Complex Object»: verbo + a quién/qué + acción. En español a veces decimos «Quiero que te quedes», pero en inglés en vez de «que» se pone el objeto y el infinitivo: I want you to stay. Después de unos verbos va to + verbo, después de otros va el verbo sin to.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I want you to stay.', ru: 'Я хочу, чтобы ты остался.', uk: 'Я хочу, щоб ти лишився.', es: 'Quiero que te quedes.', hi: 'you to' },
            { en: 'She made me laugh.', ru: 'Она рассмешила меня.', uk: 'Вона розсмішила мене.', es: 'Ella me hizo reír.', hi: 'me laugh' },
            { en: 'I asked her to help me.', ru: 'Я попросил её помочь мне.', uk: 'Я попросив її допомогти мені.', es: 'Le pedí que me ayudara.', hi: 'her to' },
            { en: 'Let him speak.', ru: 'Дай ему сказать.', uk: 'Дай йому сказати.', es: 'Déjalo hablar.', hi: 'him speak' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Главное запомнить две группы: после want, ask, tell, allow, need идёт to + глагол; после make, let, hear, see, watch — глагол без to.',
          uk: 'Головне запам’ятати дві групи: після want, ask, tell, allow, need іде to + дієслово; після make, let, hear, see, watch — дієслово без to.',
          es: 'Lo principal es recordar dos grupos: después de want, ask, tell, allow, need va to + verbo; después de make, let, hear, see, watch va el verbo sin to.',
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
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'В Complex Object всегда три части: глагол, объект (кого/что) и действие этого объекта. Объект — это форма me, you, him, her, us, them. Действие — инфинитив: с to или без to, смотря по глаголу.',
          uk: 'У Complex Object завжди три частини: дієслово, об’єкт (кого/що) і дія цього об’єкта. Об’єкт — це форма me, you, him, her, us, them. Дія — інфінітив: з to або без to, залежно від дієслова.',
          es: 'En Complex Object siempre hay tres partes: el verbo, el objeto (a quién/qué) y la acción de ese objeto. El objeto es una forma como me, you, him, her, us, them. La acción es un infinitivo: con to o sin to, según el verbo.',
        },
        {
          kind: 'formula',
          formula: ['глагол', 'объект (me / you / him…)', 'to + глагол  /  глагол без to'],
          formulaEs: ['verbo', 'objeto (me / you / him…)', 'to + verbo  /  verbo sin to'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I want you to stay.', ru: 'Я хочу, чтобы ты остался.', uk: 'Я хочу, щоб ти лишився.', es: 'Quiero que te quedes.', hi: 'you to stay' },
            { en: 'Let him speak.', ru: 'Дай ему сказать.', uk: 'Дай йому сказати.', es: 'Déjalo hablar.', hi: 'him speak' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Я хочу, чтобы ты остался.', es: 'Quiero que te quedes.' },
            answer: ['I', 'want', 'you', 'to', 'stay'],
            slotLabels: [{ ru: 'кто', es: 'quién' }, { ru: 'глагол', es: 'verbo' }, { ru: 'объект', es: 'objeto' }, { ru: 'to', es: 'to' }, { ru: 'действие', es: 'acción' }],
            distractors: ['stays', 'staying'],
          },
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Глагол + объект + to + V',
      titleUk: 'Дієслово + об’єкт + to + V',
      titleEs: 'Verbo + objeto + to + V',
      exampleCount: 6,
      blocks: [
        {
          kind: 'body',
          ru: 'После этих глаголов после объекта обязательно идёт to + глагол: want, expect, ask, tell, allow, need. Это значит «хотеть / ожидать / просить / велеть / разрешать / нуждаться, чтобы кто-то сделал что-то».',
          uk: 'Після цих дієслів після об’єкта обов’язково йде to + дієслово: want, expect, ask, tell, allow, need. Це означає «хотіти / очікувати / просити / казати / дозволяти / потребувати, щоб хтось зробив щось».',
          es: 'Después de estos verbos, tras el objeto va obligatoriamente to + verbo: want, expect, ask, tell, allow, need. Significa «querer / esperar / pedir / decir / permitir / necesitar que alguien haga algo».',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I want you to stay.', ru: 'Я хочу, чтобы ты остался.', uk: 'Я хочу, щоб ти лишився.', es: 'Quiero que te quedes.', hi: 'to stay' },
            { en: 'She expects him to call.', ru: 'Она ждёт, что он позвонит.', uk: 'Вона очікує, що він подзвонить.', es: 'Ella espera que él llame.', hi: 'to call' },
            { en: 'I asked her to help me.', ru: 'Я попросил её помочь мне.', uk: 'Я попросив її допомогти мені.', es: 'Le pedí que me ayudara.', hi: 'to help' },
            { en: 'He told me to stop.', ru: 'Он велел мне остановиться.', uk: 'Він сказав мені зупинитися.', es: 'Él me dijo que parara.', hi: 'to stop' },
            { en: 'She allowed me to go.', ru: 'Она разрешила мне уйти.', uk: 'Вона дозволила мені піти.', es: 'Ella me permitió irme.', hi: 'to go' },
            { en: 'I need you to understand.', ru: 'Мне нужно, чтобы ты понял.', uk: 'Мені треба, щоб ти зрозумів.', es: 'Necesito que entiendas.', hi: 'to understand' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Запомни группу через одно предложение: I want you to stay. Want, expect, ask, tell, allow, need — все требуют to перед глаголом.',
          uk: 'Запам’ятай групу через одне речення: I want you to stay. Want, expect, ask, tell, allow, need — усі вимагають to перед дієсловом.',
          es: 'Recuerda el grupo con una frase clave: I want you to stay. Want, expect, ask, tell, allow, need — todos exigen to antes del verbo.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'I asked her',
            after: 'help me',
            options: ['to', '—', 'for'],
            answer: 'to',
            why: { ru: 'После ask + объект идёт to + глагол: I asked her to help me.', es: 'Después de ask + objeto va to + verbo: I asked her to help me.' },
          },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'Глагол + объект + V (без to)',
      titleUk: 'Дієслово + об’єкт + V (без to)',
      titleEs: 'Verbo + objeto + V (sin to)',
      exampleCount: 5,
      blocks: [
        {
          kind: 'body',
          ru: 'После глаголов make и let, а также глаголов восприятия hear, see, watch, действие идёт без to. Это значит «заставить / позволить / слышать / видеть / наблюдать, как кто-то что-то делает».',
          uk: 'Після дієслів make і let, а також дієслів сприйняття hear, see, watch, дія йде без to. Це означає «змусити / дозволити / чути / бачити / спостерігати, як хтось щось робить».',
          es: 'Después de los verbos make y let, y también de los verbos de percepción hear, see, watch, la acción va sin to. Significa «obligar / permitir / oír / ver / observar cómo alguien hace algo».',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'She made me laugh.', ru: 'Она рассмешила меня.', uk: 'Вона розсмішила мене.', es: 'Ella me hizo reír.', hi: 'me laugh' },
            { en: 'Let him speak.', ru: 'Дай ему сказать.', uk: 'Дай йому сказати.', es: 'Déjalo hablar.', hi: 'him speak' },
            { en: 'I heard him sing.', ru: 'Я слышал, как он пел.', uk: 'Я чув, як він співав.', es: 'Lo oí cantar.', hi: 'him sing' },
            { en: 'I saw him running.', ru: 'Я видел, как он бежал.', uk: 'Я бачив, як він біг.', es: 'Lo vi correr.', hi: 'him running' },
            { en: 'She watched them play.', ru: 'Она смотрела, как они играют.', uk: 'Вона дивилася, як вони грають.', es: 'Ella los observó jugar.', hi: 'them play' },
          ],
        },
        {
          kind: 'tip',
          ru: 'После make и let никогда не ставь to: She made me laugh (не She made me to laugh). С hear, see, watch тоже без to.',
          uk: 'Після make і let ніколи не став to: She made me laugh (не She made me to laugh). З hear, see, watch теж без to.',
          es: 'Después de make y let nunca pongas to: She made me laugh (no She made me to laugh). Con hear, see, watch también va sin to.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно?', es: '¿Cuál es correcta?' },
            optionA: 'She made me to laugh',
            optionB: 'She made me laugh',
            correct: 'B',
            explain: { ru: 'После make действие идёт без to: She made me laugh.', es: 'Después de make la acción va sin to: She made me laugh.' },
          },
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'Самые частые ошибки',
      titleUk: 'Найчастіші помилки',
      titleEs: 'Los errores más frecuentes',
      blocks: [
        {
          kind: 'fix',
          fixes: [
            { wrong: 'She made me to laugh', right: 'She made me laugh' },
            { wrong: 'Let him to speak', right: 'Let him speak' },
            { wrong: 'I want that you stay', right: 'I want you to stay' },
            { wrong: 'He told me stop', right: 'He told me to stop' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Не используй «that you…» как в русском «чтобы ты…». В английском ставь объект и инфинитив: I want you to stay. И помни про две группы: to нужен после want, ask, tell, allow, need; to не нужен после make, let, hear, see, watch.',
          uk: 'Не вживай «that you…» як у «щоб ти…». В англійській став об’єкт і інфінітив: I want you to stay. І пам’ятай про дві групи: to потрібен після want, ask, tell, allow, need; to не потрібен після make, let, hear, see, watch.',
          es: 'No uses «that you…» como en español «que tú…». En inglés pon el objeto y el infinitivo: I want you to stay. Y recuerda los dos grupos: to hace falta después de want, ask, tell, allow, need; to no hace falta después de make, let, hear, see, watch.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'spot_slip',
            chips: ['Let', 'him', 'to', 'speak'],
            answerIndex: 2,
            hint: { ru: 'Тут лишнее слово. Тапни его.', es: 'Aquí hay una palabra de más. Tócala.' },
            fix: { ru: 'После let действие идёт без to: Let him speak.', es: 'Después de let la acción va sin to: Let him speak.' },
          },
        },
      ],
    },

    // ───────────────────────── 06 ─────────────────────────
    {
      num: '06',
      titleRu: 'Что нужно вынести из урока',
      titleUk: 'Що треба винести з уроку',
      titleEs: 'Qué debes recordar de esta lección',
      blocks: [
        {
          kind: 'body',
          ru: 'Complex Object — это «глагол + объект + действие» вместо русского «чтобы». Главное — две группы. С to: want, expect, ask, tell, allow, need. Без to: make, let, hear, see, watch.',
          uk: 'Complex Object — це «дієслово + об’єкт + дія» замість «щоб». Головне — дві групи. З to: want, expect, ask, tell, allow, need. Без to: make, let, hear, see, watch.',
          es: 'Complex Object es «verbo + objeto + acción» en vez del «que» del español. Lo principal son dos grupos. Con to: want, expect, ask, tell, allow, need. Sin to: make, let, hear, see, watch.',
        },
        {
          kind: 'tip',
          ru: 'Держи два опорных примера: I want you to stay (с to) и She made me laugh (без to). По ним легко вспомнить, в какой группе глагол.',
          uk: 'Тримай два опорні приклади: I want you to stay (з to) і She made me laugh (без to). За ними легко згадати, у якій групі дієслово.',
          es: 'Guarda dos ejemplos de referencia: I want you to stay (con to) y She made me laugh (sin to). Con ellos es fácil recordar en qué grupo está cada verbo.',
        },
      ],
    },
  ],
}
