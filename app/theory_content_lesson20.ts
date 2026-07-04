// Theory content for Lesson 20 (Articles: a / an / the / — zero article).
//
// Structured data source for the TheoryLessonView engine. Content transferred
// from the legacy lesson_help.tsx HINTS[20].render (two reference tables:
// the article system + the zero-article rules) and expanded into meaningful
// sections. Grammar is verified against Cambridge/Oxford usage of English
// articles.
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk).
// `hi` on an example is the article form (a / an / the) to highlight in the phrase.

import type { L1Block, L1Section } from './theory_content_lesson1'

/** Тип одного интерактива (как в движке теории). */
type L20DrillType = 'choice' | 'word_bank' | 'spot_slip' | 'binary'

/** Готовый интерактив теории. Структура повторяет TheoryDrill движка. */
interface L20Drill {
  type: L20DrillType
  [key: string]: unknown
}

/**
 * Блок секции урока 20. Расширяет L1Block видом 'drill' — движок теории
 * (TheoryBlock) поддерживает интерактивы, а узкий L1Block из урока 1 — нет.
 */
type L20Block =
  | L1Block
  | { kind: 'drill'; drill: L20Drill }

/** Секция урока 20 (как L1Section, но с поддержкой drill-блоков). */
type L20Section = Omit<L1Section, 'blocks'> & { blocks: L20Block[] }

export const LESSON20_THEORY: { titleRu: string; titleUk: string; titleEs: string; sections: L20Section[] } = {
  titleRu: 'Артикли: a / an / the / —',
  titleUk: 'Артиклі: a / an / the / —',
  titleEs: 'Artículos: a / an / the / —',
  sections: [
    // ───────────────────────── 01 ─────────────────────────
    {
      num: '01',
      titleRu: 'Что ты тренируешь в этом уроке',
      titleUk: 'Що ти тренуєш у цьому уроці',
      titleEs: 'Qué vas a entrenar en esta lección',
      defaultOpen: true,
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'В этом уроке ты учишься ставить перед существительным маленькое, но важное слово — артикль: a, an, the или ничего (—). В русском и украинском артиклей нет, поэтому именно здесь чаще всего ошибаются. Артикль показывает, говорим ли мы о любом предмете (a / an) или о конкретном, уже известном (the).',
          uk: 'У цьому уроці ти вчишся ставити перед іменником маленьке, але важливе слово — артикль: a, an, the або нічого (—). В українській та російській артиклів немає, тому саме тут найчастіше помиляються. Артикль показує, чи говоримо ми про будь-який предмет (a / an), чи про конкретний, уже відомий (the).',
          es: 'En esta lección aprendes a poner delante del sustantivo una palabra pequeña pero importante: el artículo — a, an, the o nada (—). En español los artículos sí existen (un/una, el/la), pero no siempre coinciden con el inglés, y por eso aquí es fácil confundirse. El artículo muestra si hablamos de cualquier objeto (a / an) o de uno concreto, ya conocido (the).',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I saw a dog.', ru: 'Я видел (какую-то) собаку.', uk: 'Я бачив (якогось) собаку.', es: 'Vi un perro (uno cualquiera).', hi: 'a' },
            { en: 'She has an umbrella.', ru: 'У неё есть зонтик.', uk: 'У неї є парасолька.', es: 'Ella tiene un paraguas.', hi: 'an' },
            { en: 'The dog was big.', ru: 'Та (та самая) собака была большая.', uk: 'Той (той самий) собака був великий.', es: 'Ese (el mismo) perro era grande.', hi: 'The' },
            { en: 'I play tennis.', ru: 'Я играю в теннис.', uk: 'Я граю в теніс.', es: 'Yo juego al tenis.', hi: '' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Артикль — это сигнал: «новое и любое» = a / an, «то самое, известное» = the, а для имён, языков и спорта артикль вообще не нужен.',
          uk: 'Артикль — це сигнал: «нове й будь-яке» = a / an, «те саме, відоме» = the, а для імен, мов і спорту артикль взагалі не потрібен.',
          es: 'El artículo es una señal: «nuevo y cualquiera» = a / an, «ese mismo, ya conocido» = the, y para nombres propios, idiomas y deportes no se usa ningún artículo.',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Все артикли урока',
      titleUk: 'Усі артиклі уроку',
      titleEs: 'Todos los artículos de la lección',
      defaultOpen: true,
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'Вот вся система артиклей этого урока. Запоминай не отдельный артикль, а связку «когда он нужен + пример».',
          uk: 'Ось уся система артиклів цього уроку. Запам’ятовуй не окремий артикль, а зв’язку «коли він потрібен + приклад».',
          es: 'Aquí está todo el sistema de artículos de esta lección. No memorices el artículo suelto, sino la combinación «cuándo se necesita + ejemplo».',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I saw a dog.', ru: 'a — перед согласным звуком, впервые', uk: 'a — перед приголосним звуком, вперше', es: 'a — antes de sonido consonante, primera vez', hi: 'a' },
            { en: 'She has an umbrella.', ru: 'an — перед гласным звуком, впервые', uk: 'an — перед голосним звуком, вперше', es: 'an — antes de sonido vocálico, primera vez', hi: 'an' },
            { en: 'The dog was big.', ru: 'the — конкретный / уже известный предмет', uk: 'the — конкретний / уже відомий предмет', es: 'the — objeto concreto / ya conocido', hi: 'The' },
            { en: 'I play tennis.', ru: '— имена, языки, спорт, еда', uk: '— власні назви, мови, спорт, їжа', es: '— nombres propios, idiomas, deportes, comida', hi: '' },
          ],
        },
        {
          kind: 'tip',
          ru: 'a и an — это один и тот же артикль, выбор зависит от звука дальше: a dog, но an umbrella.',
          uk: 'a і an — це один і той самий артикль, вибір залежить від звука далі: a dog, але an umbrella.',
          es: 'a y an son el mismo artículo; la elección depende del sonido que sigue: a dog, pero an umbrella.',
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'A — впервые, перед согласным звуком',
      titleUk: 'A — вперше, перед приголосним звуком',
      titleEs: 'A — primera mención, ante sonido consonante',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'A ставим, когда говорим о предмете впервые и он один из многих — «какой-то», «один». A используется, когда следующее слово начинается с согласного звука.',
          uk: 'A ставимо, коли говоримо про предмет уперше і він один з багатьох — «якийсь», «один». A вживається, коли наступне слово починається з приголосного звука.',
          es: 'Usamos a cuando mencionamos el objeto por primera vez y es uno entre muchos — «alguno», «uno». A se usa cuando la palabra siguiente empieza con sonido consonante.',
        },
        {
          kind: 'formula',
          formula: ['a', '+ существительное (согласный звук)'],
          formulaEs: ['a', '+ sustantivo (sonido consonante)'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I saw a dog.', ru: 'Я видел (какую-то) собаку.', uk: 'Я бачив (якогось) собаку.', es: 'Vi un perro (uno cualquiera).', hi: 'a' },
          ],
        },
        {
          kind: 'tip',
          ru: 'a — это «один из многих», впервые упомянутый предмет. Важен именно звук, а не буква: a dog.',
          uk: 'a — це «один з багатьох», уперше згаданий предмет. Важливий саме звук, а не буква: a dog.',
          es: 'a significa «uno entre muchos», un objeto mencionado por primera vez. Lo que importa es el sonido, no la letra: a dog.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'I saw',
            after: 'dog',
            options: ['a', 'an', 'the'],
            answer: 'a',
            why: { ru: 'Предмет новый, и dog начинается с согласного звука: a dog.', es: 'El objeto es nuevo y dog empieza con sonido consonante: a dog.' },
          },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'An — впервые, перед гласным звуком',
      titleUk: 'An — вперше, перед голосним звуком',
      titleEs: 'An — primera mención, ante sonido vocálico',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'An — это тот же артикль a, но он ставится перед гласным звуком: an umbrella, an apple, an hour. Буква «n» добавляется, чтобы слова не сливались и было удобно произносить.',
          uk: 'An — це той самий артикль a, але він ставиться перед голосним звуком: an umbrella, an apple, an hour. Буква «n» додається, щоб слова не зливалися і було зручно вимовляти.',
          es: 'An es el mismo artículo a, pero va antes de un sonido vocálico: an umbrella, an apple, an hour. La «n» se añade para que las palabras no se fusionen y sea cómodo pronunciarlas.',
        },
        {
          kind: 'formula',
          formula: ['an', '+ существительное (гласный звук)'],
          formulaEs: ['an', '+ sustantivo (sonido vocálico)'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'She has an umbrella.', ru: 'У неё есть зонтик.', uk: 'У неї є парасолька.', es: 'Ella tiene un paraguas.', hi: 'an' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Считается звук, а не буква: an hour (буква h не читается → звук гласный), но a university (звук «ю» — согласный).',
          uk: 'Рахується звук, а не буква: an hour (буква h не читається → звук голосний), але a university (звук «ю» — приголосний).',
          es: 'Cuenta el sonido, no la letra: an hour (la h no se pronuncia → sonido vocálico), pero a university (el sonido «yu» es consonante).',
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно?', es: '¿Cuál es correcta?' },
            optionA: 'She has a umbrella',
            optionB: 'She has an umbrella',
            correct: 'B',
            explain: { ru: 'Umbrella начинается с гласного звука, поэтому an umbrella.', es: 'Umbrella empieza con sonido vocálico, por eso an umbrella.' },
          },
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'The — конкретный, уже известный предмет',
      titleUk: 'The — конкретний, уже відомий предмет',
      titleEs: 'The — objeto concreto, ya conocido',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'The ставим, когда оба собеседника понимают, о каком именно предмете речь: он уже упоминался, он единственный или очевиден из ситуации. The работает и с одним предметом, и с несколькими.',
          uk: 'The ставимо, коли обидва співрозмовники розуміють, про який саме предмет ідеться: він уже згадувався, він єдиний або очевидний із ситуації. The працює і з одним предметом, і з кількома.',
          es: 'Usamos the cuando los dos hablantes saben de qué objeto exacto se trata: ya se mencionó, es único o resulta obvio por la situación. The funciona con un objeto y con varios.',
        },
        {
          kind: 'formula',
          formula: ['the', '+ существительное (конкретное / известное)'],
          formulaEs: ['the', '+ sustantivo (concreto / conocido)'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'The dog was big.', ru: 'Та (та самая) собака была большая.', uk: 'Той (той самий) собака був великий.', es: 'Ese (el mismo) perro era grande.', hi: 'The' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Частый случай: сначала a (впервые), потом the (уже известно): I saw a dog. The dog was big.',
          uk: 'Частий випадок: спочатку a (уперше), потім the (уже відомо): I saw a dog. The dog was big.',
          es: 'Caso frecuente: primero a (primera mención), luego the (ya conocido): I saw a dog. The dog was big.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Та собака была большая.', es: 'Ese perro era grande.' },
            answer: ['The', 'dog', 'was', 'big'],
            slotLabels: [{ ru: 'артикль', es: 'artículo' }, { ru: 'кто', es: 'quién' }, { ru: 'был', es: 'era' }, { ru: 'какой', es: 'cómo' }],
            distractors: ['a', 'an'],
          },
        },
      ],
    },

    // ───────────────────────── 06 ─────────────────────────
    {
      num: '06',
      titleRu: '— Без артикля: имена, языки, спорт, еда',
      titleUk: '— Без артикля: власні назви, мови, спорт, їжа',
      titleEs: '— Sin artículo: nombres, idiomas, deportes, comida',
      exampleCount: 5,
      blocks: [
        {
          kind: 'body',
          ru: 'Иногда артикль не нужен вообще (это и есть «—»). Без артикля идут имена и большинство стран, названия языков и национальностей, спорт и игры, еда в общем смысле, а также транспорт после by.',
          uk: 'Іноді артикль не потрібен зовсім (це і є «—»). Без артикля йдуть власні назви та більшість країн, назви мов і національностей, спорт та ігри, їжа в загальному сенсі, а також транспорт після by.',
          es: 'A veces no se necesita ningún artículo (eso es «—»). Van sin artículo los nombres propios y la mayoría de los países, los idiomas y nacionalidades, los deportes y juegos, la comida en sentido general y el transporte después de by. Ojo: aquí el inglés difiere del español — decimos «juego al tenis», pero en inglés es I play tennis, sin artículo.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'London, Ukraine, Mary', ru: 'Имена и география', uk: 'Власні назви', es: 'Nombres propios y geografía', hi: '' },
            { en: 'English, French, Ukrainian', ru: 'Языки и национальности', uk: 'Мови та національності', es: 'Idiomas y nacionalidades', hi: '' },
            { en: 'football, chess, tennis', ru: 'Спорт и игры', uk: 'Спорт та ігри', es: 'Deportes y juegos', hi: '' },
            { en: 'I like coffee.', ru: 'Еда в общем смысле', uk: 'Їжа в загальному', es: 'Comida en sentido general', hi: '' },
            { en: 'by car, by bus, by train', ru: 'Транспорт после by', uk: 'Транспорт після by', es: 'Transporte después de by', hi: 'by' },
          ],
        },
        {
          kind: 'tip',
          ru: 'I play tennis (без артикля), I like coffee (без артикля), by car (без артикля). Тут «—» — это норма, а не пропуск.',
          uk: 'I play tennis (без артикля), I like coffee (без артикля), by car (без артикля). Тут «—» — це норма, а не пропуск.',
          es: 'I play tennis (sin artículo), I like coffee (sin artículo), by car (sin artículo). Aquí «—» es la norma, no un olvido.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'spot_slip',
            chips: ['I', 'play', 'the', 'tennis'],
            answerIndex: 2,
            hint: { ru: 'Тут лишнее слово. Тапни его.', es: 'Aquí sobra una palabra. Tócala.' },
            fix: { ru: 'С названиями спорта артикль не нужен: I play tennis.', es: 'Con los deportes no se usa artículo: I play tennis.' },
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
            { wrong: 'I saw dog', right: 'I saw a dog' },
            { wrong: 'She has a umbrella', right: 'She has an umbrella' },
            { wrong: 'I play the tennis', right: 'I play tennis' },
            { wrong: 'I go to work by the car', right: 'I go to work by car' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Не выбрасывай артикль там, где он нужен (a dog, an umbrella), и не вставляй его там, где не нужен (tennis, by car).',
          uk: 'Не викидай артикль там, де він потрібен (a dog, an umbrella), і не встромляй його там, де не потрібен (tennis, by car).',
          es: 'No omitas el artículo donde hace falta (a dog, an umbrella) ni lo metas donde no va (tennis, by car) — aunque en español digamos «al tenis» o «el café».',
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно?', es: '¿Cuál es correcta?' },
            optionA: 'I go to work by the car',
            optionB: 'I go to work by car',
            correct: 'B',
            explain: { ru: 'После by о транспорте артикль не ставится: by car, by bus, by train.', es: 'Después de by para transporte no va artículo: by car, by bus, by train.' },
          },
        },
      ],
    },

    // ───────────────────────── 08 ─────────────────────────
    {
      num: '08',
      titleRu: 'Что нужно вынести из урока',
      titleUk: 'Що треба винести з уроку',
      titleEs: 'Lo que debes llevarte de la lección',
      blocks: [
        {
          kind: 'body',
          ru: 'Артикль выбирается по смыслу: a / an — новый, любой предмет (a перед согласным звуком, an перед гласным); the — конкретный, уже известный; «—» — имена, языки, спорт, еда в общем и транспорт после by.',
          uk: 'Артикль обирається за змістом: a / an — новий, будь-який предмет (a перед приголосним звуком, an перед голосним); the — конкретний, уже відомий; «—» — власні назви, мови, спорт, їжа в загальному й транспорт після by.',
          es: 'El artículo se elige por el sentido: a / an — objeto nuevo, cualquiera (a ante sonido consonante, an ante vocálico); the — concreto, ya conocido; «—» — nombres propios, idiomas, deportes, comida en general y transporte después de by.',
        },
        {
          kind: 'tip',
          ru: 'Задай себе один вопрос: «собеседник уже знает, о чём речь?». Да → the. Нет, впервые → a / an. Это имя/язык/спорт/еда? → без артикля.',
          uk: 'Постав собі одне питання: «співрозмовник уже знає, про що йдеться?». Так → the. Ні, уперше → a / an. Це ім’я/мова/спорт/їжа? → без артикля.',
          es: 'Hazte una sola pregunta: «¿mi interlocutor ya sabe de qué hablo?». Sí → the. No, primera vez → a / an. ¿Es un nombre/idioma/deporte/comida? → sin artículo.',
        },
      ],
    },
  ],
}
