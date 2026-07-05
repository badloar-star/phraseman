// Theory content for Lesson 3 (Present Simple — affirmative statements).
//
// Structured data source for the TheoryLessonView engine.
// Content is transferred from the legacy lesson_help.tsx HINTS[3].render
// (Table components) without grammar changes — Present Simple is verified
// against Cambridge/Oxford (base verb for I/You/We/They; +s/+es for He/She/It).
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk).
// Interface types are reused from theory_content_lesson1 (no duplication).

import type { L1Block, L1Section } from './theory_content_lesson1'

export const LESSON3_THEORY: {
  titleRu: string
  titleUk: string
  titleEs: string
  sections: L1Section[]
} = {
  titleRu: 'Present Simple — утверждение',
  titleUk: 'Present Simple — ствердження',
  titleEs: 'Present Simple — afirmación',
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
          ru: 'В этом уроке ты учишься говорить о привычных, регулярных действиях — что человек делает каждый день, обычно или вообще. Это время называется Present Simple. Главное правило: с I, you, we, they глагол стоит в обычной форме, а с he, she, it к глаголу добавляется -s.',
          uk: 'У цьому уроці ти вчишся говорити про звичні, регулярні дії — що людина робить щодня, зазвичай або взагалі. Цей час називається Present Simple. Головне правило: з I, you, we, they дієслово стоїть у звичайній формі, а з he, she, it до дієслова додається -s.',
          es: 'En esta lección aprendes a hablar de acciones habituales y regulares — lo que alguien hace cada día, normalmente o en general. Este tiempo se llama Present Simple. La regla principal: con I, you, we, they el verbo va en su forma normal, y con he, she, it al verbo se le añade -s.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I work every day', ru: 'Я работаю каждый день', uk: 'Я працюю щодня', es: 'Trabajo todos los días' },
            { en: 'We go to school', ru: 'Мы ходим в школу', uk: 'Ми ходимо до школи', es: 'Vamos a la escuela' },
            { en: 'She works', ru: 'Она работает', uk: 'Вона працює', es: 'Ella trabaja', hi: 'works' },
            { en: 'He goes', ru: 'Он ходит / идёт', uk: 'Він ходить / іде', es: 'Él va', hi: 'goes' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Present Simple — это про регулярность и привычки. Не «прямо сейчас», а «вообще, обычно, каждый день».',
          uk: 'Present Simple — це про регулярність і звички. Не «прямо зараз», а «взагалі, зазвичай, щодня».',
          es: 'El Present Simple habla de regularidad y hábitos. No es "ahora mismo", sino "en general, normalmente, cada día".',
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
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'С I, you, we и they глагол не меняется — берёшь его в обычной (словарной) форме и ставишь после подлежащего.',
          uk: 'З I, you, we та they дієслово не змінюється — береш його у звичайній (словниковій) формі і ставиш після підмета.',
          es: 'Con I, you, we y they el verbo no cambia — lo tomas en su forma normal (de diccionario) y lo pones después del sujeto.',
        },
        {
          kind: 'formula',
          formula: ['I / you / we / they', 'глагол', 'остальное'],
          formulaEs: ['I / you / we / they', 'verbo', 'resto'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I work every day', ru: 'Я работаю каждый день', uk: 'Я працюю щодня', es: 'Trabajo todos los días' },
            { en: 'We go to school', ru: 'Мы ходим в школу', uk: 'Ми ходимо до школи', es: 'Vamos a la escuela' },
            { en: 'They study English', ru: 'Они учат английский', uk: 'Вони вчать англійську', es: 'Ellos estudian inglés' },
            { en: 'You like coffee', ru: 'Ты любишь кофе', uk: 'Ти любиш каву', es: 'Te gusta el café' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Они учат английский', uk: 'Вони вчать англійську', es: 'Ellos estudian inglés' },
            answer: ['They', 'study', 'English'],
            slotLabels: [{ ru: 'кто', uk: 'хто', es: 'quién' }, { ru: 'глагол', uk: 'дієслово', es: 'verbo' }, { ru: 'что', uk: 'що', es: 'qué',
            'pt-BR': 'que/o quê' }],
            distractors: ['studies', 'works'],
          },
        },
        {
          kind: 'tip',
          ru: 'С I, you, we, they глагол всегда в обычной форме: work, go, study, like — без -s.',
          uk: 'З I, you, we, they дієслово завжди у звичайній формі: work, go, study, like — без -s.',
          es: 'Con I, you, we, they el verbo siempre va en su forma normal: work, go, study, like — sin -s.',
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'He, She, It → глагол + s',
      titleUk: 'He, She, It → дієслово + s',
      titleEs: 'He, She, It → verbo + s',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Когда говоришь о he, she или it, к глаголу почти всегда добавляется -s. Это самое важное правило Present Simple: he/she/it меняет глагол.',
          uk: 'Коли говориш про he, she або it, до дієслова майже завжди додається -s. Це найважливіше правило Present Simple: he/she/it змінює дієслово.',
          es: 'Cuando hablas de he, she o it, al verbo casi siempre se le añade -s. Esta es la regla más importante del Present Simple: he/she/it cambia el verbo.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'work → works', ru: 'большинство глаголов + s: read → reads', uk: 'більшість дієслів + s: read → reads', es: 'la mayoría de verbos + s: read → reads', hi: 'works' },
            { en: 'read → reads', ru: 'She reads — она читает', uk: 'She reads — вона читає', es: 'She reads — ella lee', hi: 'reads' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'She',
            after: 'every day',
            options: ['work', 'works'],
            answer: 'works',
            why: { ru: 'С she нужно глагол + s: works.', uk: 'З she потрібне дієслово + s: works.', es: 'Con she hace falta verbo + s: works.' },
          },
        },
        {
          kind: 'tip',
          ru: 'Подсказка-память: he, she, it — «лишняя» s. Она «отдаёт» свою s глаголу.',
          uk: 'Підказка-пам\'ять: he, she, it — «зайва» s. Вона «віддає» свою s дієслову.',
          es: 'Truco para recordar: he, she, it tienen una "s" extra. Se la "regalan" al verbo.',
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'Когда добавляется -es',
      titleUk: 'Коли додається -es',
      titleEs: 'Cuándo se añade -es',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Если глагол заканчивается на -o, -sh, -ch или -x, к нему с he/she/it добавляется не просто -s, а -es. Так удобнее произносить.',
          uk: 'Якщо дієслово закінчується на -o, -sh, -ch або -x, до нього з he/she/it додається не просто -s, а -es. Так зручніше вимовляти.',
          es: 'Si el verbo termina en -o, -sh, -ch o -x, con he/she/it no se le añade solo -s, sino -es. Así es más fácil de pronunciar.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'go → goes', ru: '-o на конце → +es', uk: '-o в кінці → +es', es: '-o al final → +es', hi: 'goes' },
            { en: 'watch → watches', ru: '-ch на конце → +es', uk: '-ch в кінці → +es', es: '-ch al final → +es', hi: 'watches' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Запомни концовки: -o, -sh, -ch, -x. После них с he/she/it пиши -es: goes, watches.',
          uk: 'Запам\'ятай закінчення: -o, -sh, -ch, -x. Після них з he/she/it пиши -es: goes, watches.',
          es: 'Recuerda las terminaciones: -o, -sh, -ch, -x. Después de ellas, con he/she/it escribe -es: goes, watches.',
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'Согласная + y → ies',
      titleUk: 'Приголосна + y → ies',
      titleEs: 'Consonante + y → ies',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Если глагол заканчивается на согласную + y, то с he/she/it буква y меняется на i и добавляется -es: получается -ies.',
          uk: 'Якщо дієслово закінчується на приголосну + y, то з he/she/it буква y змінюється на i і додається -es: виходить -ies.',
          es: 'Si el verbo termina en consonante + y, con he/she/it la y cambia a i y se añade -es: queda -ies.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'study → studies', ru: 'согласная + y → ies', uk: 'приголосна + y → ies', es: 'consonante + y → ies', hi: 'studies' },
            { en: 'fly → flies', ru: 'согласная + y → ies', uk: 'приголосна + y → ies', es: 'consonante + y → ies', hi: 'flies' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'He',
            after: 'English',
            options: ['studys', 'studies'],
            answer: 'studies',
            why: { ru: 'Согласная + y → ies: study становится studies.', uk: 'Приголосна + y → ies: study стає studies.', es: 'Consonante + y → ies: study se convierte en studies.' },
          },
        },
      ],
    },

    // ───────────────────────── 06 ─────────────────────────
    {
      num: '06',
      titleRu: 'Особый случай: have → has',
      titleUk: 'Особливий випадок: have → has',
      titleEs: 'Caso especial: have → has',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'Глагол have — особенный. С he, she, it он превращается не в haves, а в has. Это просто нужно запомнить.',
          uk: 'Дієслово have — особливе. З he, she, it воно перетворюється не на haves, а на has. Це просто треба запам\'ятати.',
          es: 'El verbo have es especial. Con he, she, it no se convierte en haves, sino en has. Simplemente hay que memorizarlo.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'She has a car', ru: 'У неё есть машина', uk: 'У неї є машина', es: 'Ella tiene un coche', hi: 'has' },
          ],
        },
        {
          kind: 'fix',
          fixes: [
            { wrong: 'She haves a car', right: 'She has a car' },
          ],
        },
        {
          kind: 'tip',
          ru: 'С I, you, we, they — have. С he, she, it — has. Никакого haves не существует.',
          uk: 'З I, you, we, they — have. З he, she, it — has. Жодного haves не існує.',
          es: 'Con I, you, we, they — have. Con he, she, it — has. La forma haves no existe.',
        },
      ],
    },

    // ───────────────────────── 07 ─────────────────────────
    {
      num: '07',
      titleRu: 'Самые частые ошибки',
      titleUk: 'Найчастіші помилки',
      titleEs: 'Los errores más frecuentes',
      blocks: [
        {
          kind: 'fix',
          fixes: [
            { wrong: 'She work every day', right: 'She works every day' },
            { wrong: 'He go to school', right: 'He goes to school' },
            { wrong: 'He studys English', right: 'He studies English' },
            { wrong: 'She haves a car', right: 'She has a car' },
            { wrong: 'They works', right: 'They work' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'spot_slip',
            chips: ['He', 'go', 'to', 'school'],
            answerIndex: 1,
            hint: { ru: 'Тут не та форма глагола. Тапни лишнее слово.', uk: 'Тут не та форма дієслова. Тапни зайве слово.', es: 'Aquí el verbo no tiene la forma correcta. Toca la palabra sobrante.' },
            fix: { ru: 'С he нужно goes: He goes to school.', uk: 'З he потрібне goes: He goes to school.', es: 'Con he hace falta goes: He goes to school.' },
          },
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно?', uk: 'Де правильно?', es: '¿Cuál es correcta?' },
            optionA: 'She work every day',
            optionB: 'She works every day',
            correct: 'B',
            explain: { ru: 'С he / she / it к глаголу добавляется -s: works.', uk: 'З he / she / it до дієслова додається -s: works.', es: 'Con he / she / it al verbo se le añade -s: works.' },
          },
        },
        {
          kind: 'tip',
          ru: 'Главная проверка: если подлежащее he, she или it — у глагола должна быть -s (или -es / -ies). С I, you, we, they — глагол без -s.',
          uk: 'Головна перевірка: якщо підмет he, she або it — у дієслова має бути -s (або -es / -ies). З I, you, we, they — дієслово без -s.',
          es: 'Comprobación principal: si el sujeto es he, she o it, el verbo debe llevar -s (o -es / -ies). Con I, you, we, they, el verbo va sin -s.',
        },
      ],
    },
  ],
}
