// Theory content for Lesson 1 (To Be: statements / affirmations).
//
// This file is the structured data source for the TheoryLessonView engine.
// Content is transferred verbatim from the legacy lesson_help.tsx THEORY[1].render
// (Section / Body / Table / Warn / Tip components) without any grammar changes —
// the content is already verified against Cambridge/Oxford.
//
// Trilingual: every text field carries Russian (ru), Ukrainian (uk) and Spanish (es)
// variants. Spanish copy is written for a Spanish speaker learning English (adapted
// pedagogy, e.g. subject/verb omission slips instead of RU copula-drop contrasts),
// never a literal translation of the Russian text. Never write Spanish into ru/uk.
// `hi` on an example is the To Be form (am / is / are) to highlight in the phrase.

/** Интерактивная тренировка прямо в теории (choice / word_bank / spot_slip / binary). */
export interface L1Drill {
  type: 'choice' | 'word_bank' | 'spot_slip' | 'binary'
  // Слабая типизация намеренна: формы drill соответствуют Intro*Interaction,
  // рендер защищён, нестыковка данных не роняет экран.
  [key: string]: unknown
}

export interface L1Block {
  kind: 'body' | 'formula' | 'examples' | 'fix' | 'tip' | 'drill'
  ru?: string
  uk?: string
  es?: string
  formula?: string[]
  /** Испанский вариант formula, когда базовые части содержат русские слова. */
  formulaEs?: string[]
  examples?: { en: string; ru: string; uk: string; es: string; hi?: string }[]
  fixes?: { wrong: string; right: string }[]
  drill?: L1Drill
}

export interface L1Section {
  num: string
  titleRu: string
  titleUk: string
  titleEs: string
  exampleCount?: number
  defaultOpen?: boolean
  blocks: L1Block[]
}

export interface L1Theory {
  titleRu: string
  titleUk: string
  titleEs: string
  sections: L1Section[]
}

export const LESSON1_THEORY: L1Theory = {
  titleRu: 'To Be: утверждения',
  titleUk: 'To Be: ствердження',
  titleEs: 'To Be: afirmaciones',
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
          ru: 'В этом уроке ты учишься строить одну из самых простых английских фраз: кто + am/is/are + описание. По-русски мы часто говорим коротко: «Я здесь», «Он занят», «Это важно». В английском в такой фразе между человеком или предметом и описанием нужно am, is или are.',
          uk: 'У цьому уроці ти вчишся будувати одну з найпростіших англійських фраз: хто + am/is/are + опис. Українською або російською ми часто кажемо коротко: «Я тут», «Він зайнятий», «Це важливо». В англійській у такій фразі між людиною або предметом і описом потрібне am, is або are.',
          es: 'En esta lección aprendes a construir una de las frases más simples del inglés: quién + am/is/are + descripción. En español usamos un verbo (soy, estoy, es) para unir el sujeto con la descripción, pero en inglés ese verbo tiene que ser exactamente am, is o are, y nunca puedes omitirlo ni el sujeto.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I am here', ru: 'I am here (без английской логики: I here)', uk: 'I am here (без англійської логіки: I here)', es: 'I am here (en inglés no basta con: I here)', hi: 'am' },
            { en: 'He is busy', ru: 'He is busy (без английской логики: He busy)', uk: 'He is busy (без англійської логіки: He busy)', es: 'He is busy (en inglés no basta con: He busy)', hi: 'is' },
            { en: 'We are ready', ru: 'We are ready (без английской логики: We ready)', uk: 'We are ready (без англійської логіки: We ready)', es: 'We are ready (en inglés no basta con: We ready)', hi: 'are' },
            { en: 'It is important', ru: 'It is important (без английской логики: It important)', uk: 'It is important (без англійської логіки: It important)', es: 'It is important (en inglés no basta con: It important)', hi: 'is' },
          ],
        },
        {
          kind: 'fix',
          fixes: [
            { wrong: 'I here', right: 'I am here' },
          ],
        },
        {
          kind: 'tip',
          ru: 'В английском нельзя просто поставить «я» и «здесь» рядом. Нужен am.',
          uk: 'В англійській не можна просто поставити «я» і «тут» поруч. Потрібен am.',
          es: 'En inglés no puedes poner "I" y "here" uno junto al otro sin más. Hace falta am.',
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
      exampleCount: 7,
      blocks: [
        {
          kind: 'body',
          ru: 'Главная формула урока очень простая: кто или что + правильная форма To Be + описание. Описание может показывать состояние, качество, место или ситуацию.',
          uk: 'Головна формула уроку дуже проста: хто або що + правильна форма To Be + опис. Опис може показувати стан, якість, місце або ситуацію.',
          es: 'La fórmula principal de la lección es muy simple: quién o qué + la forma correcta de To Be + descripción. La descripción puede mostrar estado, cualidad, lugar o situación.',
        },
        {
          kind: 'formula',
          formula: ['кто / что', 'am / is / are', 'описание'],
          formulaEs: ['quién / qué', 'am / is / are', 'descripción'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I am here', ru: 'I — am — here', uk: 'I — am — here', es: 'I — am — here', hi: 'am' },
            { en: 'You are ready', ru: 'You — are — ready', uk: 'You — are — ready', es: 'You — are — ready', hi: 'are' },
            { en: 'He is busy', ru: 'He — is — busy', uk: 'He — is — busy', es: 'He — is — busy', hi: 'is' },
            { en: 'She is calm', ru: 'She — is — calm', uk: 'She — is — calm', es: 'She — is — calm', hi: 'is' },
            { en: 'We are safe', ru: 'We — are — safe', uk: 'We — are — safe', es: 'We — are — safe', hi: 'are' },
            { en: 'They are happy', ru: 'They — are — happy', uk: 'They — are — happy', es: 'They — are — happy', hi: 'are' },
            { en: 'It is important', ru: 'It — is — important', uk: 'It — is — important', es: 'It — is — important', hi: 'is' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Запоминай не отдельные слова, а блоки: I am, he is, she is, it is, you are, we are, they are.',
          uk: 'Запам\'ятай не окремі слова, а блоки: I am, he is, she is, it is, you are, we are, they are.',
          es: 'Memoriza los bloques completos, no las palabras por separado: I am, he is, she is, it is, you are, we are, they are.',
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Три формы: am, is, are',
      titleUk: 'Три форми: am, is, are',
      titleEs: 'Tres formas: am, is, are',
      exampleCount: 7,
      blocks: [
        {
          kind: 'body',
          ru: 'To Be в настоящем времени меняется в зависимости от того, о ком ты говоришь. Важно не переводить am, is, are отдельно, а узнавать их как обязательную часть английского предложения.',
          uk: 'To Be у теперішньому часі змінюється залежно від того, про кого ти говориш. Важливо не перекладати am, is, are окремо, а впізнавати їх як обов\'язкову частину англійського речення.',
          es: 'To Be en presente cambia según de quién estés hablando. Es importante no traducir am, is, are por separado, sino reconocerlos como una parte obligatoria de la oración en inglés.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I am', ru: 'I am here · I am okay · I am ready · I am tired · I am strong · I am sick', uk: 'I am here · I am okay · I am ready · I am tired · I am strong · I am sick', es: 'I am here · I am okay · I am ready · I am tired · I am strong · I am sick', hi: 'am' },
            { en: 'He is', ru: 'He is busy · He is sick · He is strong · He is inside · He is angry · He is calm', uk: 'He is busy · He is sick · He is strong · He is inside · He is angry · He is calm', es: 'He is busy · He is sick · He is strong · He is inside · He is angry · He is calm', hi: 'is' },
            { en: 'She is', ru: 'She is calm · She is sad · She is tired · She is happy · She is smart · She is ready', uk: 'She is calm · She is sad · She is tired · She is happy · She is smart · She is ready', es: 'She is calm · She is sad · She is tired · She is happy · She is smart · She is ready', hi: 'is' },
            { en: 'It is', ru: 'It is important · It is cheap · It is free · It is serious · It is near · It is broken · It is empty', uk: 'It is important · It is cheap · It is free · It is serious · It is near · It is broken · It is empty', es: 'It is important · It is cheap · It is free · It is serious · It is near · It is broken · It is empty', hi: 'is' },
            { en: 'You are', ru: 'You are ready · You are right · You are late · You are kind · You are okay · You are safe', uk: 'You are ready · You are right · You are late · You are kind · You are okay · You are safe', es: 'You are ready · You are right · You are late · You are kind · You are okay · You are safe', hi: 'are' },
            { en: 'We are', ru: 'We are together · We are safe · We are friends · We are here · We are inside · We are calm · We are ready · We are late · We are okay', uk: 'We are together · We are safe · We are friends · We are here · We are inside · We are calm · We are ready · We are late · We are okay', es: 'We are together · We are safe · We are friends · We are here · We are inside · We are calm · We are ready · We are late · We are okay', hi: 'are' },
            { en: 'They are', ru: 'They are happy · They are outside · They are calm · They are ready · They are tired · They are hungry', uk: 'They are happy · They are outside · They are calm · They are ready · They are tired · They are hungry', es: 'They are happy · They are outside · They are calm · They are ready · They are tired · They are hungry', hi: 'are' },
          ],
        },
        {
          kind: 'fix',
          fixes: [
            { wrong: 'I is ready', right: 'I am ready' },
            { wrong: 'He are busy', right: 'He is busy' },
            { wrong: 'They is happy', right: 'They are happy' },
          ],
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'I am — когда говоришь о себе',
      titleUk: 'I am — коли говориш про себе',
      titleEs: 'I am — cuando hablas de ti mismo',
      exampleCount: 7,
      blocks: [
        {
          kind: 'body',
          ru: 'Когда ты говоришь о себе, используй I am. В этом уроке после I am стоят место, состояние или качество.',
          uk: 'Коли ти говориш про себе, використовуй I am. У цьому уроці після I am стоять місце, стан або якість.',
          es: 'Cuando hablas de ti mismo, usa I am. En esta lección, después de I am va un lugar, un estado o una cualidad.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I am here', ru: 'Я здесь', uk: 'Я тут', es: 'Estoy aquí', hi: 'am' },
            { en: 'I am okay', ru: 'Я в порядке', uk: 'Я в порядку', es: 'Estoy bien', hi: 'am' },
            { en: 'I am ready', ru: 'Я готов', uk: 'Я готовий', es: 'Estoy listo', hi: 'am' },
            { en: 'I am tired', ru: 'Я устал', uk: 'Я втомлений', es: 'Estoy cansado', hi: 'am' },
            { en: 'I am outside', ru: 'Я снаружи', uk: 'Я зовні', es: 'Estoy afuera', hi: 'am' },
            { en: 'I am strong', ru: 'Я сильный', uk: 'Я сильний', es: 'Soy fuerte', hi: 'am' },
            { en: 'I am sick', ru: 'Я болен', uk: 'Я хворий', es: 'Estoy enfermo', hi: 'am' },
          ],
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'He is, She is, It is',
      titleUk: 'He is, She is, It is',
      titleEs: 'He is, She is, It is',
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'С he, she и it используется is. He - для мужчины или парня. She - для женщины или девушки. It - для предмета, ситуации или слова «это».',
          uk: 'З he, she та it використовується is. He — для чоловіка або хлопця. She — для жінки або дівчини. It — для предмета, ситуації або слова «це».',
          es: 'Con he, she e it se usa is. He es para un hombre o chico. She es para una mujer o chica. It es para un objeto, una situación o la palabra "esto/eso".',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'He is', ru: 'He is busy · He is sick · He is strong · He is inside · He is angry · He is calm', uk: 'He is busy · He is sick · He is strong · He is inside · He is angry · He is calm', es: 'He is busy · He is sick · He is strong · He is inside · He is angry · He is calm', hi: 'is' },
            { en: 'She is', ru: 'She is calm · She is sad · She is tired · She is happy · She is smart · She is ready', uk: 'She is calm · She is sad · She is tired · She is happy · She is smart · She is ready', es: 'She is calm · She is sad · She is tired · She is happy · She is smart · She is ready', hi: 'is' },
            { en: 'It is', ru: 'It is important · It is cheap · It is free · It is serious · It is near · It is broken · It is empty', uk: 'It is important · It is cheap · It is free · It is serious · It is near · It is broken · It is empty', es: 'It is important · It is cheap · It is free · It is serious · It is near · It is broken · It is empty', hi: 'is' },
          ],
        },
        {
          kind: 'tip',
          ru: 'It в этом уроке часто переводится как «это»: It is important - это важно. It is broken - это сломано.',
          uk: 'It у цьому уроці часто перекладається як «це»: It is important - це важливо. It is broken - це зламано.',
          es: 'En esta lección, It muchas veces se traduce como "esto/eso": It is important - esto es importante. It is broken - esto está roto.',
        },
      ],
    },

    // ───────────────────────── 06 ─────────────────────────
    {
      num: '06',
      titleRu: 'You are, We are, They are',
      titleUk: 'You are, We are, They are',
      titleEs: 'You are, We are, They are',
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'С you, we и they используется are. You может означать «ты» или «вы». We - «мы». They - «они».',
          uk: 'З you, we та they використовується are. You може означати «ти» або «ви». We — «ми». They — «вони».',
          es: 'Con you, we y they se usa are. You puede significar "tú" o "ustedes". We es "nosotros". They es "ellos/ellas".',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'You are', ru: 'You are ready · You are right · You are late · You are kind · You are okay · You are safe', uk: 'You are ready · You are right · You are late · You are kind · You are okay · You are safe', es: 'You are ready · You are right · You are late · You are kind · You are okay · You are safe', hi: 'are' },
            { en: 'We are', ru: 'We are together · We are safe · We are friends · We are here · We are inside · We are calm · We are ready · We are late · We are okay', uk: 'We are together · We are safe · We are friends · We are here · We are inside · We are calm · We are ready · We are late · We are okay', es: 'We are together · We are safe · We are friends · We are here · We are inside · We are calm · We are ready · We are late · We are okay', hi: 'are' },
            { en: 'They are', ru: 'They are happy · They are outside · They are calm · They are ready · They are tired · They are hungry · They are together', uk: 'They are happy · They are outside · They are calm · They are ready · They are tired · They are hungry · They are together', es: 'They are happy · They are outside · They are calm · They are ready · They are tired · They are hungry · They are together', hi: 'are' },
          ],
        },
        {
          kind: 'tip',
          ru: 'You are right может означать и «ты прав», и «вы правы». Английское you работает для обоих значений.',
          uk: 'You are right може означати і «ти правий», і «ви праві». Англійське you працює для обох значень.',
          es: 'You are right puede significar tanto "tienes razón" como "tienen razón". El inglés you sirve para los dos casos.',
        },
      ],
    },

    // ───────────────────────── 07 ─────────────────────────
    {
      num: '07',
      titleRu: 'Что может стоять после To Be',
      titleUk: 'Що може стояти після To Be',
      titleEs: 'Qué puede ir después de To Be',
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'Во фразах этого урока после am, is и are стоит не действие, а описание. Это описание может показывать состояние, качество, место или ситуацию.',
          uk: 'У фразах цього уроку після am, is та are стоїть не дія, а опис. Цей опис може показувати стан, якість, місце або ситуацію.',
          es: 'En las frases de esta lección, después de am, is y are no va una acción, sino una descripción. Esa descripción puede mostrar estado, cualidad, lugar o situación.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Состояние человека', ru: 'как человек себя чувствует или в каком состоянии находится — ready, busy, calm, happy, okay, tired, sick, sad, nervous, hungry, angry', uk: 'як людина себе почуває або в якому стані знаходиться — ready, busy, calm, happy, okay, tired, sick, sad, nervous, hungry, angry', es: 'cómo se siente una persona o en qué estado está — ready, busy, calm, happy, okay, tired, sick, sad, nervous, hungry, angry' },
            { en: 'Качество или оценка', ru: 'какой кто-то или что-то — important, cheap, free, serious, strong, kind, smart, broken, empty', uk: 'який хтось або щось — important, cheap, free, serious, strong, kind, smart, broken, empty', es: 'cómo es alguien o algo — important, cheap, free, serious, strong, kind, smart, broken, empty' },
            { en: 'Место', ru: 'где кто-то или что-то находится — here, outside, inside, near', uk: 'де хтось або щось знаходиться — here, outside, inside, near', es: 'dónde está alguien o algo — here, outside, inside, near' },
            { en: 'Ситуация или связь', ru: 'отношение, роль или общее положение дел — together, safe, friends, right, late, fine', uk: 'відношення, роль або загальний стан справ — together, safe, friends, right, late, fine', es: 'relación, papel o situación general — together, safe, friends, right, late, fine' },
          ],
        },
      ],
    },

    // ───────────────────────── 08 ─────────────────────────
    {
      num: '08',
      titleRu: 'Состояние человека после To Be',
      titleUk: 'Стан людини після To Be',
      titleEs: 'El estado de una persona después de To Be',
      exampleCount: 7,
      blocks: [
        {
          kind: 'body',
          ru: 'Многие фразы урока описывают состояние человека. В английском для этого часто нужна конструкция To Be + слово состояния.',
          uk: 'Багато фраз уроку описують стан людини. В англійській для цього часто потрібна конструкція To Be + слово стану.',
          es: 'Muchas frases de la lección describen el estado de una persona. En inglés, para eso se necesita a menudo la construcción To Be + palabra de estado.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'You are ready', ru: 'Ты готов', uk: 'Ти готовий', es: 'Estás listo', hi: 'are' },
            { en: 'He is busy', ru: 'Он занят', uk: 'Він зайнятий', es: 'Él está ocupado', hi: 'is' },
            { en: 'She is calm', ru: 'Она спокойна', uk: 'Вона спокійна', es: 'Ella está tranquila', hi: 'is' },
            { en: 'They are happy', ru: 'Они счастливы', uk: 'Вони щасливі', es: 'Ellos están felices', hi: 'are' },
            { en: 'I am okay', ru: 'Я в порядке', uk: 'Я в порядку', es: 'Estoy bien', hi: 'am' },
            { en: 'She is tired', ru: 'Она устала', uk: 'Вона втомлена', es: 'Ella está cansada', hi: 'is' },
            { en: 'They are hungry', ru: 'Они голодны', uk: 'Вони голодні', es: 'Ellos tienen hambre', hi: 'are' },
          ],
        },
      ],
    },

    // ───────────────────────── 09 ─────────────────────────
    {
      num: '09',
      titleRu: 'Место после To Be',
      titleUk: 'Місце після To Be',
      titleEs: 'El lugar después de To Be',
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'После To Be может стоять место. В этом уроке это here, outside, inside и near. Они отвечают на вопрос «где?».',
          uk: 'Після To Be може стояти місце. У цьому уроці це here, outside, inside та near. Вони відповідають на питання «де?».',
          es: 'Después de To Be puede ir un lugar. En esta lección son here, outside, inside y near. Responden a la pregunta "¿dónde?".',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'here', ru: 'здесь — I am here · We are here', uk: 'тут — I am here · We are here', es: 'aquí — I am here · We are here' },
            { en: 'outside', ru: 'снаружи — They are outside · I am outside', uk: 'зовні — They are outside · I am outside', es: 'afuera — They are outside · I am outside' },
            { en: 'inside', ru: 'внутри — We are inside · He is inside', uk: 'всередині — We are inside · He is inside', es: 'adentro — We are inside · He is inside' },
            { en: 'near', ru: 'близко — It is near', uk: 'близько — It is near', es: 'cerca — It is near' },
          ],
        },
        {
          kind: 'tip',
          ru: 'В этих фразах не добавляй at, in или on к here, outside, inside, near. Учи именно те блоки, которые есть в уроке: I am here, They are outside, He is inside, It is near.',
          uk: 'У цих фразах не додавай at, in або on до here, outside, inside, near. Вивчай саме ті блоки, які є в уроці: I am here, They are outside, He is inside, It is near.',
          es: 'En estas frases no agregues at, in ni on a here, outside, inside, near. Aprende exactamente los bloques que aparecen en la lección: I am here, They are outside, He is inside, It is near.',
        },
      ],
    },

    // ───────────────────────── 10 ─────────────────────────
    {
      num: '10',
      titleRu: 'It is = это',
      titleUk: 'It is = це',
      titleEs: 'It is = esto/eso',
      exampleCount: 7,
      blocks: [
        {
          kind: 'body',
          ru: 'Когда ты оцениваешь ситуацию или предмет, английский часто использует It is. По-русски это звучит как «это».',
          uk: 'Коли ти оцінюєш ситуацію або предмет, англійська часто використовує It is. Українською або російською це звучить як «це».',
          es: 'Cuando valoras una situación o un objeto, el inglés suele usar It is. En español eso suena como "esto es" o "eso es".',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'It is important', ru: 'Это важно', uk: 'Це важливо', es: 'Esto es importante', hi: 'is' },
            { en: 'It is cheap', ru: 'Это дешево', uk: 'Це дешево', es: 'Esto es barato', hi: 'is' },
            { en: 'It is free', ru: 'Это бесплатно', uk: 'Це безкоштовно', es: 'Esto es gratis', hi: 'is' },
            { en: 'It is serious', ru: 'Это серьёзно', uk: 'Це серйозно', es: 'Esto es serio', hi: 'is' },
            { en: 'It is near', ru: 'Это близко', uk: 'Це близько', es: 'Esto está cerca', hi: 'is' },
            { en: 'It is broken', ru: 'Это сломано', uk: 'Це зламано', es: 'Esto está roto', hi: 'is' },
            { en: 'It is empty', ru: 'Это пусто', uk: 'Це порожньо', es: 'Esto está vacío', hi: 'is' },
          ],
        },
        {
          kind: 'tip',
          ru: 'It не всегда переводится как «оно». В таких фразах It is часто просто означает «это».',
          uk: 'It не завжди перекладається як «воно». У таких фразах It is часто просто означає «це».',
          es: 'It no siempre se traduce como "ello". En este tipo de frases, It is casi siempre significa simplemente "esto/eso".',
        },
      ],
    },

    // ───────────────────────── 11 ─────────────────────────
    {
      num: '11',
      titleRu: 'Broken, tired, ready - это состояния',
      titleUk: 'Broken, tired, ready — це стани',
      titleEs: 'Broken, tired, ready — son estados',
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'Некоторые слова выглядят как действие или результат действия, но в этом уроке они работают как описание состояния. После To Be они отвечают на вопрос «какой?» или «в каком состоянии?».',
          uk: 'Деякі слова виглядають як дія або результат дії, але в цьому уроці вони працюють як опис стану. Після To Be вони відповідають на питання «який?» або «в якому стані?».',
          es: 'Algunas palabras parecen una acción o el resultado de una acción, pero en esta lección funcionan como descripción de un estado. Después de To Be responden a la pregunta "¿cómo es?" o "¿en qué estado está?".',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I am tired', ru: 'моё состояние', uk: 'мій стан', es: 'mi estado', hi: 'am' },
            { en: 'She is ready', ru: 'её состояние готовности', uk: 'її стан готовності', es: 'su estado de preparación', hi: 'is' },
            { en: 'It is broken', ru: 'состояние предмета', uk: 'стан предмета', es: 'el estado del objeto', hi: 'is' },
            { en: 'It is empty', ru: 'состояние предмета или места', uk: 'стан предмета або місця', es: 'el estado del objeto o del lugar', hi: 'is' },
          ],
        },
      ],
    },

    // ───────────────────────── 12 ─────────────────────────
    {
      num: '12',
      titleRu: 'Friends, together, safe, right, late',
      titleUk: 'Friends, together, safe, right, late',
      titleEs: 'Friends, together, safe, right, late',
      exampleCount: 9,
      blocks: [
        {
          kind: 'body',
          ru: 'В части фраз после To Be стоит не просто качество, а ситуация или отношение: мы друзья, мы вместе, мы в безопасности, ты прав, мы опаздываем.',
          uk: 'У частині фраз після To Be стоїть не просто якість, а ситуація або відношення: ми друзі, ми разом, ми в безпеці, ти правий, ми запізнюємося.',
          es: 'En parte de las frases, después de To Be no va simplemente una cualidad, sino una situación o relación: somos amigos, estamos juntos, estamos a salvo, tienes razón, llegamos tarde.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'We are friends', ru: 'Мы друзья', uk: 'Ми друзі', es: 'Somos amigos', hi: 'are' },
            { en: 'We are together', ru: 'Мы вместе', uk: 'Ми разом', es: 'Estamos juntos', hi: 'are' },
            { en: 'They are together', ru: 'Они вместе', uk: 'Вони разом', es: 'Ellos están juntos', hi: 'are' },
            { en: 'We are safe', ru: 'Мы в безопасности', uk: 'Ми в безпеці', es: 'Estamos a salvo', hi: 'are' },
            { en: 'You are safe', ru: 'Ты в безопасности', uk: 'Ти в безпеці', es: 'Estás a salvo', hi: 'are' },
            { en: 'You are right', ru: 'Ты прав / Вы правы', uk: 'Ти правий / Ви праві', es: 'Tienes razón / Tienen razón', hi: 'are' },
            { en: 'You are late', ru: 'Ты опаздываешь', uk: 'Ти запізнюєшся', es: 'Llegas tarde', hi: 'are' },
            { en: 'We are late', ru: 'Мы опаздываем', uk: 'Ми запізнюємося', es: 'Llegamos tarde', hi: 'are' },
            { en: 'You are okay', ru: 'Ты в порядке', uk: 'Ти в порядку', es: 'Estás bien', hi: 'are' },
          ],
        },
        {
          kind: 'tip',
          ru: 'You are late и We are late переводятся глаголом «опаздываешь / опаздываем», но английская логика здесь всё равно To Be + late.',
          uk: 'You are late і We are late перекладаються дієсловом «запізнюєшся / запізнюємося», але англійська логіка тут усе одно To Be + late.',
          es: 'You are late y We are late se traducen con un verbo ("llegas tarde" / "llegamos tarde"), pero la lógica en inglés sigue siendo To Be + late.',
        },
      ],
    },

    // ───────────────────────── 13 ─────────────────────────
    {
      num: '13',
      titleRu: 'Перевод не всегда дословный',
      titleUk: 'Переклад не завжди дослівний',
      titleEs: 'La traducción no siempre es literal',
      exampleCount: 6,
      blocks: [
        {
          kind: 'body',
          ru: 'Английский часто описывает состояние через To Be, а по-русски мы переводим это естественно, иногда через глагол или готовое выражение. Это нормально.',
          uk: 'Англійська часто описує стан через To Be, а українською або російською ми перекладаємо це природно, іноді через дієслово або готовий вираз. Це нормально.',
          es: 'El inglés suele describir un estado con To Be, y en español lo traducimos de forma natural, a veces con un verbo o una expresión hecha. Eso es normal.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'You are late', ru: 'Ты опаздываешь', uk: 'Ти запізнюєшся', es: 'Llegas tarde', hi: 'are' },
            { en: 'We are late', ru: 'Мы опаздываем', uk: 'Ми запізнюємося', es: 'Llegamos tarde', hi: 'are' },
            { en: 'She is nervous', ru: 'Она нервничает', uk: 'Вона нервує', es: 'Ella está nerviosa', hi: 'is' },
            { en: 'We are safe', ru: 'Мы в безопасности', uk: 'Ми в безпеці', es: 'Estamos a salvo', hi: 'are' },
            { en: 'You are right', ru: 'Ты прав / Вы правы', uk: 'Ти правий / Ви праві', es: 'Tienes razón / Tienen razón', hi: 'are' },
            { en: 'I am okay', ru: 'Я в порядке', uk: 'Я в порядку', es: 'Estoy bien', hi: 'am' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Не переводи механически слово в слово. You are late - это не странная калька, а естественно «ты опаздываешь».',
          uk: 'Не перекладай механічно слово в слово. You are late - це не дивна калька, а природно «ти запізнюєшся».',
          es: 'No traduzcas mecánicamente palabra por palabra. You are late no es un calco raro, sino simplemente "llegas tarde".',
        },
      ],
    },

    // ───────────────────────── 14 ─────────────────────────
    {
      num: '14',
      titleRu: 'Самые частые ошибки',
      titleUk: 'Найчастіші помилки',
      titleEs: 'Los errores más frecuentes',
      blocks: [
        {
          kind: 'fix',
          fixes: [
            { wrong: 'I here', right: 'I am here' },
            { wrong: 'I are ready', right: 'I am ready' },
            { wrong: 'He am busy', right: 'He is busy' },
            { wrong: 'She are tired', right: 'She is tired' },
            { wrong: 'It are important', right: 'It is important' },
            { wrong: 'We is friends', right: 'We are friends' },
            { wrong: 'They is outside', right: 'They are outside' },
            { wrong: 'It broken', right: 'It is broken' },
          ],
        },
        {
          kind: 'tip',
          ru: 'I here → I am here: без am фраза неполная. I are ready → I am ready: с I всегда am. He am busy → He is busy: с he нужно is. She are tired → She is tired: с she нужно is. It are important → It is important: с it нужно is. We is friends → We are friends: с we нужно are. They is outside → They are outside: с they нужно are. It broken → It is broken: если есть it + описание, нужно is.',
          uk: 'I here → I am here: без am фраза неповна. I are ready → I am ready: з I завжди am. He am busy → He is busy: з he потрібне is. She are tired → She is tired: з she потрібне is. It are important → It is important: з it потрібне is. We is friends → We are friends: з we потрібне are. They is outside → They are outside: з they потрібне are. It broken → It is broken: якщо є it + опис, потрібне is.',
          es: 'I here → I am here: sin am la frase queda incompleta. I are ready → I am ready: con I siempre va am. He am busy → He is busy: con he va is. She are tired → She is tired: con she va is. It are important → It is important: con it va is. We is friends → We are friends: con we va are. They is outside → They are outside: con they va are. It broken → It is broken: si hay it + descripción, hace falta is.',
        },
      ],
    },

    // ───────────────────────── 15 ─────────────────────────
    {
      num: '15',
      titleRu: 'Что нужно вынести из урока',
      titleUk: 'Що треба винести з уроку',
      titleEs: 'Qué debes llevarte de esta lección',
      blocks: [
        {
          kind: 'body',
          ru: 'В этом уроке ты ставишь базовый каркас английского предложения: I am, he is, she is, it is, you are, we are, they are. После этого каркаса можно добавлять состояние, качество, место или ситуацию.',
          uk: 'У цьому уроці ти ставиш базовий каркас англійського речення: I am, he is, she is, it is, you are, we are, they are. Після цього каркаса можна додавати стан, якість, місце або ситуацію.',
          es: 'En esta lección construyes la estructura básica de la oración en inglés: I am, he is, she is, it is, you are, we are, they are. Sobre esa estructura puedes añadir estado, cualidad, lugar o situación.',
        },
        {
          kind: 'tip',
          ru: 'Перед практикой держи одну формулу: кто + am/is/are + описание. I am ready. She is tired. We are here. It is important.',
          uk: 'Перед практикою тримай одну формулу: хто + am/is/are + опис. I am ready. She is tired. We are here. It is important.',
          es: 'Antes de practicar, quédate con una sola fórmula: quién + am/is/are + descripción. I am ready. She is tired. We are here. It is important.',
        },
      ],
    },
  ],
}
