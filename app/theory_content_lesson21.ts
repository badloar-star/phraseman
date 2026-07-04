// Theory content for Lesson 21 (Indefinite pronouns: some-/any-/no-/every-).
//
// Structured data source for the TheoryLessonView engine. Content transferred
// from the legacy lesson_help.tsx HINTS[21].render (two tables: the some/any/no/
// every grid and the "when to use" table) and expanded into meaningful sections.
// Grammar is verified against Cambridge/Oxford usage of indefinite pronouns.
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk).
// `hi` on an example is the indefinite pronoun to highlight in the phrase.

import type { L1Section } from './theory_content_lesson1'

export const LESSON21_THEORY: { titleRu: string; titleUk: string; titleEs: string; sections: L1Section[] } = {
  titleRu: 'Неопределённые местоимения',
  titleUk: 'Неозначені займенники',
  titleEs: 'Pronombres indefinidos',
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
          ru: 'В этом уроке ты учишься говорить о людях, предметах и местах, не называя их точно: «кто-то», «что-то», «где-то», «никто», «ничего», «все». В английском такие слова собираются из корня (some-, any-, no-, every-) и окончания (-body / -one — про людей, -thing — про предметы, -where — про места).',
          uk: 'У цьому уроці ти вчишся говорити про людей, предмети й місця, не називаючи їх точно: «хтось», «щось», «десь», «ніхто», «нічого», «всі». В англійській такі слова збираються з кореня (some-, any-, no-, every-) і закінчення (-body / -one — про людей, -thing — про предмети, -where — про місця).',
          es: 'En esta lección aprendes a hablar de personas, cosas y lugares sin nombrarlos con exactitud: "alguien", "algo", "en algún lugar", "nadie", "nada", "todos". En inglés estas palabras se arman con una raíz (some-, any-, no-, every-) y una terminación (-body / -one — para personas, -thing — para cosas, -where — para lugares).',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Someone called you.', ru: 'Кто-то тебе звонил.', uk: 'Хтось тобі дзвонив.', es: 'Alguien te llamó.', hi: 'Someone' },
            { en: 'Is anyone there?', ru: 'Там кто-нибудь есть?', uk: 'Там хтось є?', es: '¿Hay alguien ahí?', hi: 'anyone' },
            { en: 'Nobody came.', ru: 'Никто не пришёл.', uk: 'Ніхто не прийшов.', es: 'Nadie vino.', hi: 'Nobody' },
            { en: 'Everyone was happy.', ru: 'Все были счастливы.', uk: 'Усі були щасливі.', es: 'Todos estaban felices.', hi: 'Everyone' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Слово строится из двух частей: корень (some/any/no/every) + хвост (-body/-one/-thing/-where). Запомнишь оба набора — соберёшь любое такое слово.',
          uk: 'Слово будується з двох частин: корінь (some/any/no/every) + хвіст (-body/-one/-thing/-where). Запам’ятаєш обидва набори — складеш будь-яке таке слово.',
          es: 'La palabra se arma con dos piezas: raíz (some/any/no/every) + terminación (-body/-one/-thing/-where). Memoriza ambos conjuntos y podrás construir cualquiera de estas palabras.',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Таблица: корень + хвост',
      titleUk: 'Таблиця: корінь + хвіст',
      titleEs: 'Tabla: raíz + terminación',
      defaultOpen: true,
      exampleCount: 12,
      blocks: [
        {
          kind: 'body',
          ru: 'Вот все четыре корня и три хвоста. -body и -one значат одно и то же (про людей) — выбирай любой.',
          uk: 'Ось усі чотири корені й три хвости. -body і -one значать те саме (про людей) — обирай будь-який.',
          es: 'Aquí tienes las cuatro raíces y las tres terminaciones. -body y -one significan lo mismo (sobre personas) — elige cualquiera.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'somebody / someone', ru: 'кто-то (про людей, корень some-)', uk: 'хтось (про людей, корінь some-)', es: 'alguien (sobre personas, raíz some-)', hi: 'someone' },
            { en: 'something', ru: 'что-то (про предметы, корень some-)', uk: 'щось (про предмети, корінь some-)', es: 'algo (sobre cosas, raíz some-)', hi: 'something' },
            { en: 'somewhere', ru: 'где-то (про место, корень some-)', uk: 'десь (про місце, корінь some-)', es: 'en algún lugar (sobre lugares, raíz some-)', hi: 'somewhere' },
            { en: 'anybody / anyone', ru: 'кто-нибудь (корень any-)', uk: 'хтось / будь-хто (корінь any-)', es: 'alguien / cualquiera (raíz any-)', hi: 'anyone' },
            { en: 'anything', ru: 'что-нибудь (корень any-)', uk: 'щось / будь-що (корінь any-)', es: 'algo / cualquier cosa (raíz any-)', hi: 'anything' },
            { en: 'anywhere', ru: 'где-нибудь (корень any-)', uk: 'десь / будь-де (корінь any-)', es: 'en algún lugar / en cualquier lugar (raíz any-)', hi: 'anywhere' },
            { en: 'nobody / no one', ru: 'никто (корень no-)', uk: 'ніхто (корінь no-)', es: 'nadie (raíz no-)', hi: 'nobody' },
            { en: 'nothing', ru: 'ничего (корень no-)', uk: 'нічого (корінь no-)', es: 'nada (raíz no-)', hi: 'nothing' },
            { en: 'nowhere', ru: 'нигде / никуда (корень no-)', uk: 'ніде / нікуди (корінь no-)', es: 'en ningún lugar / a ningún lugar (raíz no-)', hi: 'nowhere' },
            { en: 'everybody / everyone', ru: 'все (корень every-)', uk: 'усі (корінь every-)', es: 'todos (raíz every-)', hi: 'everyone' },
            { en: 'everything', ru: 'всё (корень every-)', uk: 'усе (корінь every-)', es: 'todo (raíz every-)', hi: 'everything' },
            { en: 'everywhere', ru: 'везде / повсюду (корень every-)', uk: 'скрізь / повсюди (корінь every-)', es: 'en todas partes (raíz every-)', hi: 'everywhere' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Хвост -one пишется отдельно только в no one: «no one came». Все остальные слова пишутся слитно: someone, anyone, everyone.',
          uk: 'Хвіст -one пишеться окремо лише в no one: «no one came». Усі інші слова пишуться разом: someone, anyone, everyone.',
          es: 'La terminación -one se escribe separada solo en no one: "no one came". Todas las demás palabras se escriben juntas: someone, anyone, everyone.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'I lost my keys',
            after: '.',
            options: ['somewhere', 'something', 'somebody'],
            answer: 'somewhere',
            why: { ru: 'Речь о месте, поэтому хвост -where: I lost my keys somewhere.', es: 'Se habla de un lugar, así que la terminación es -where: I lost my keys somewhere.' },
          },
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Когда какой корень',
      titleUk: 'Коли який корінь',
      titleEs: 'Cuándo usar cada raíz',
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'Корень выбирается по типу фразы: some- — в утверждениях и вежливых просьбах; any- — в вопросах и отрицаниях; no- — когда хочешь сказать «нет» одним словом; every- — когда речь обо всех без исключения.',
          uk: 'Корінь обирається за типом фрази: some- — у ствердженнях і ввічливих проханнях; any- — у питаннях і запереченнях; no- — коли хочеш сказати «ні» одним словом; every- — коли йдеться про всіх без винятку.',
          es: 'La raíz se elige según el tipo de frase: some- — en afirmaciones y peticiones amables; any- — en preguntas y negaciones; no- — cuando quieres decir "no" con una sola palabra; every- — cuando hablas de todos sin excepción.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Someone called you.', ru: 'some- — утверждение / просьба: «Кто-то тебе звонил».', uk: 'some- — ствердження / прохання: «Хтось тобі дзвонив».', es: 'some- — afirmación / petición: "Alguien te llamó".', hi: 'Someone' },
            { en: 'Is anyone there?', ru: 'any- — вопрос или отрицание: «Там кто-нибудь есть?».', uk: 'any- — питання або заперечення: «Там хтось є?».', es: 'any- — pregunta o negación: "¿Hay alguien ahí?".', hi: 'anyone' },
            { en: 'Nobody came.', ru: 'no- — отрицательный смысл одним словом: «Никто не пришёл».', uk: 'no- — заперечний зміст одним словом: «Ніхто не прийшов».', es: 'no- — sentido negativo en una sola palabra: "Nadie vino".', hi: 'Nobody' },
            { en: 'Everyone was happy.', ru: 'every- — все без исключения: «Все были счастливы».', uk: 'every- — усі без винятку: «Усі були щасливі».', es: 'every- — todos sin excepción: "Todos estaban felices".', hi: 'Everyone' },
          ],
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'no- = одно «не» на фразу',
      titleUk: 'no- = одне «не» на фразу',
      titleEs: 'no- = una sola negación por frase',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Слова с no- (nobody, nothing, nowhere) уже содержат отрицание. Поэтому глагол с ними ставится в утвердительной форме: «Nobody came» (не «Nobody didn’t come»). В английском в одной фразе только одно отрицание.',
          uk: 'Слова з no- (nobody, nothing, nowhere) уже містять заперечення. Тому дієслово з ними ставиться у стверджувальній формі: «Nobody came» (не «Nobody didn’t come»). В англійській в одній фразі лише одне заперечення.',
          es: 'Las palabras con no- (nobody, nothing, nowhere) ya contienen la negación. Por eso el verbo va en forma afirmativa: "Nobody came" (no "Nobody didn\'t come"). En inglés solo puede haber una negación por frase — a diferencia del español, donde varias negaciones se acumulan ("nadie no vino" nunca, pero sí "no vino nadie").',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Nobody came.', ru: 'Никто не пришёл. (глагол без «not»)', uk: 'Ніхто не прийшов. (дієслово без «not»)', es: 'Nadie vino. (verbo sin "not")', hi: 'Nobody' },
            { en: 'I know nothing.', ru: 'Я ничего не знаю. (одно отрицание — nothing)', uk: 'Я нічого не знаю. (одне заперечення — nothing)', es: 'No sé nada. (una sola negación — nothing)', hi: 'nothing' },
          ],
        },
        {
          kind: 'fix',
          fixes: [
            { wrong: "Nobody didn't come", right: 'Nobody came' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно?', es: '¿Cuál es correcta?' },
            optionA: "Nobody didn't come",
            optionB: 'Nobody came',
            correct: 'B',
            explain: { ru: 'Nobody уже значит «никто не», второе отрицание не нужно.', es: 'Nobody ya significa "nadie", una segunda negación sobra.' },
          },
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'every- и no- — это «он/оно» (единственное)',
      titleUk: 'every- і no- — це «він/воно» (однина)',
      titleEs: 'every- y no- se tratan como singular',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Хотя everyone и nobody по смыслу про многих, грамматически они единственного числа — как he/she/it. Поэтому глагол to be с ними — is/was, а в Present Simple добавляется -s: «Everyone is here», «Everybody knows».',
          uk: 'Хоча everyone і nobody за змістом про багатьох, граматично вони однини — як he/she/it. Тому дієслово to be з ними — is/was, а в Present Simple додається -s: «Everyone is here», «Everybody knows».',
          es: 'Aunque everyone y nobody se refieren a muchas personas, gramaticalmente son singulares — como he/she/it. Por eso el verbo to be con ellos es is/was, y en Present Simple se añade -s: "Everyone is here", "Everybody knows".',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Everyone was happy.', ru: 'Все были счастливы. (was, а не were)', uk: 'Усі були щасливі. (was, а не were)', es: 'Todos estaban felices. (was, no were)', hi: 'was' },
            { en: 'Everybody knows.', ru: 'Все знают. (knows с -s)', uk: 'Усі знають. (knows з -s)', es: 'Todos lo saben. (knows con -s)', hi: 'knows' },
          ],
        },
        {
          kind: 'fix',
          fixes: [
            { wrong: 'Everyone were happy', right: 'Everyone was happy' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'spot_slip',
            chips: ['Everyone', 'were', 'happy'],
            answerIndex: 1,
            hint: { ru: 'Тут не та форма. Тапни лишнее слово.', es: 'Aquí la forma no es correcta. Toca la palabra sobrante.' },
            fix: { ru: 'Everyone — единственное число, нужно was: Everyone was happy.', es: 'Everyone es singular, se necesita was: Everyone was happy.' },
          },
        },
      ],
    },

    // ───────────────────────── 06 ─────────────────────────
    {
      num: '06',
      titleRu: 'Соберём фразу из слов',
      titleUk: 'Зберемо фразу зі слів',
      titleEs: 'Vamos a armar la frase con palabras',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'Порядок такой же, как в обычной фразе: сначала кто (местоимение), потом глагол, потом остальное. Неопределённое местоимение спокойно стоит на месте подлежащего.',
          uk: 'Порядок такий самий, як у звичайній фразі: спочатку хто (займенник), потім дієслово, потім решта. Неозначений займенник спокійно стоїть на місці підмета.',
          es: 'El orden es igual que en una frase normal: primero quién (el pronombre), luego el verbo, luego el resto. El pronombre indefinido ocupa tranquilamente el lugar del sujeto.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Someone called you.', ru: 'Кто-то тебе звонил.', uk: 'Хтось тобі дзвонив.', es: 'Alguien te llamó.', hi: 'Someone' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Кто-то тебе звонил', es: 'Alguien te llamó' },
            answer: ['Someone', 'called', 'you'],
            slotLabels: [{ ru: 'кто', es: 'quién' }, { ru: 'глагол', es: 'verbo' }, { ru: 'кого', es: 'a quién' }],
            distractors: ['Anyone', 'no one'],
          },
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
            { wrong: "Nobody didn't come", right: 'Nobody came' },
            { wrong: 'Everyone were happy', right: 'Everyone was happy' },
            { wrong: 'Is someone there?', right: 'Is anyone there?' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Главное: any- — для вопросов и отрицаний; no- уже несёт «не», второго отрицания не добавляй; every-/no- — единственное число (is/was, глагол с -s).',
          uk: 'Головне: any- — для питань і заперечень; no- уже несе «не», другого заперечення не додавай; every-/no- — однина (is/was, дієслово з -s).',
          es: 'Lo esencial: any- para preguntas y negaciones; no- ya lleva la negación, no añadas una segunda; every-/no- son singulares (is/was, verbo con -s).',
        },
      ],
    },
  ],
}
