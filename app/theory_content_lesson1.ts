// Theory content for Lesson 1 (To Be: statements / affirmations).
//
// This file is the structured data source for the TheoryLessonView engine.
// Content is transferred verbatim from the legacy lesson_help.tsx THEORY[1].render
// (Section / Body / Table / Warn / Tip components) without any grammar changes —
// the content is already verified against Cambridge/Oxford.
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk) variants.
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
  formula?: string[]
  examples?: { en: string; ru: string; uk: string; hi?: string }[]
  fixes?: { wrong: string; right: string }[]
  drill?: L1Drill
}

export interface L1Section {
  num: string
  titleRu: string
  titleUk: string
  exampleCount?: number
  defaultOpen?: boolean
  blocks: L1Block[]
}

export interface L1Theory {
  titleRu: string
  titleUk: string
  sections: L1Section[]
}

export const LESSON1_THEORY: L1Theory = {
  titleRu: 'To Be: утверждения',
  titleUk: 'To Be: ствердження',
  sections: [
    // ───────────────────────── 01 ─────────────────────────
    {
      num: '01',
      titleRu: 'Что ты тренируешь в этом уроке',
      titleUk: 'Що ти тренуєш у цьому уроці',
      defaultOpen: true,
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'В этом уроке ты учишься строить одну из самых простых английских фраз: кто + am/is/are + описание. По-русски мы часто говорим коротко: «Я здесь», «Он занят», «Это важно». В английском в такой фразе между человеком или предметом и описанием нужно am, is или are.',
          uk: 'У цьому уроці ти вчишся будувати одну з найпростіших англійських фраз: хто + am/is/are + опис. Українською або російською ми часто кажемо коротко: «Я тут», «Він зайнятий», «Це важливо». В англійській у такій фразі між людиною або предметом і описом потрібне am, is або are.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I am here', ru: 'I am here (без английской логики: I here)', uk: 'I am here (без англійської логіки: I here)', hi: 'am' },
            { en: 'He is busy', ru: 'He is busy (без английской логики: He busy)', uk: 'He is busy (без англійської логіки: He busy)', hi: 'is' },
            { en: 'We are ready', ru: 'We are ready (без английской логики: We ready)', uk: 'We are ready (без англійської логіки: We ready)', hi: 'are' },
            { en: 'It is important', ru: 'It is important (без английской логики: It important)', uk: 'It is important (без англійської логіки: It important)', hi: 'is' },
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
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Главная формула',
      titleUk: 'Головна формула',
      defaultOpen: true,
      exampleCount: 7,
      blocks: [
        {
          kind: 'body',
          ru: 'Главная формула урока очень простая: кто или что + правильная форма To Be + описание. Описание может показывать состояние, качество, место или ситуацию.',
          uk: 'Головна формула уроку дуже проста: хто або що + правильна форма To Be + опис. Опис може показувати стан, якість, місце або ситуацію.',
        },
        {
          kind: 'formula',
          formula: ['кто / что', 'am / is / are', 'описание'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I am here', ru: 'I — am — here', uk: 'I — am — here', hi: 'am' },
            { en: 'You are ready', ru: 'You — are — ready', uk: 'You — are — ready', hi: 'are' },
            { en: 'He is busy', ru: 'He — is — busy', uk: 'He — is — busy', hi: 'is' },
            { en: 'She is calm', ru: 'She — is — calm', uk: 'She — is — calm', hi: 'is' },
            { en: 'We are safe', ru: 'We — are — safe', uk: 'We — are — safe', hi: 'are' },
            { en: 'They are happy', ru: 'They — are — happy', uk: 'They — are — happy', hi: 'are' },
            { en: 'It is important', ru: 'It — is — important', uk: 'It — is — important', hi: 'is' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Запоминай не отдельные слова, а блоки: I am, he is, she is, it is, you are, we are, they are.',
          uk: 'Запам\'ятай не окремі слова, а блоки: I am, he is, she is, it is, you are, we are, they are.',
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Три формы: am, is, are',
      titleUk: 'Три форми: am, is, are',
      exampleCount: 7,
      blocks: [
        {
          kind: 'body',
          ru: 'To Be в настоящем времени меняется в зависимости от того, о ком ты говоришь. Важно не переводить am, is, are отдельно, а узнавать их как обязательную часть английского предложения.',
          uk: 'To Be у теперішньому часі змінюється залежно від того, про кого ти говориш. Важливо не перекладати am, is, are окремо, а впізнавати їх як обов\'язкову частину англійського речення.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I am', ru: 'I am here · I am okay · I am ready · I am tired · I am strong · I am sick', uk: 'I am here · I am okay · I am ready · I am tired · I am strong · I am sick', hi: 'am' },
            { en: 'He is', ru: 'He is busy · He is sick · He is strong · He is inside · He is angry · He is calm', uk: 'He is busy · He is sick · He is strong · He is inside · He is angry · He is calm', hi: 'is' },
            { en: 'She is', ru: 'She is calm · She is sad · She is tired · She is happy · She is smart · She is ready', uk: 'She is calm · She is sad · She is tired · She is happy · She is smart · She is ready', hi: 'is' },
            { en: 'It is', ru: 'It is important · It is cheap · It is free · It is serious · It is near · It is broken · It is empty', uk: 'It is important · It is cheap · It is free · It is serious · It is near · It is broken · It is empty', hi: 'is' },
            { en: 'You are', ru: 'You are ready · You are right · You are late · You are kind · You are okay · You are safe', uk: 'You are ready · You are right · You are late · You are kind · You are okay · You are safe', hi: 'are' },
            { en: 'We are', ru: 'We are together · We are safe · We are friends · We are here · We are inside · We are calm · We are ready · We are late · We are okay', uk: 'We are together · We are safe · We are friends · We are here · We are inside · We are calm · We are ready · We are late · We are okay', hi: 'are' },
            { en: 'They are', ru: 'They are happy · They are outside · They are calm · They are ready · They are tired · They are hungry', uk: 'They are happy · They are outside · They are calm · They are ready · They are tired · They are hungry', hi: 'are' },
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
      exampleCount: 7,
      blocks: [
        {
          kind: 'body',
          ru: 'Когда ты говоришь о себе, используй I am. В этом уроке после I am стоят место, состояние или качество.',
          uk: 'Коли ти говориш про себе, використовуй I am. У цьому уроці після I am стоять місце, стан або якість.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I am here', ru: 'Я здесь', uk: 'Я тут', hi: 'am' },
            { en: 'I am okay', ru: 'Я в порядке', uk: 'Я в порядку', hi: 'am' },
            { en: 'I am ready', ru: 'Я готов', uk: 'Я готовий', hi: 'am' },
            { en: 'I am tired', ru: 'Я устал', uk: 'Я втомлений', hi: 'am' },
            { en: 'I am outside', ru: 'Я снаружи', uk: 'Я зовні', hi: 'am' },
            { en: 'I am strong', ru: 'Я сильный', uk: 'Я сильний', hi: 'am' },
            { en: 'I am sick', ru: 'Я болен', uk: 'Я хворий', hi: 'am' },
          ],
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'He is, She is, It is',
      titleUk: 'He is, She is, It is',
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'С he, she и it используется is. He - для мужчины или парня. She - для женщины или девушки. It - для предмета, ситуации или слова «это».',
          uk: 'З he, she та it використовується is. He — для чоловіка або хлопця. She — для жінки або дівчини. It — для предмета, ситуації або слова «це».',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'He is', ru: 'He is busy · He is sick · He is strong · He is inside · He is angry · He is calm', uk: 'He is busy · He is sick · He is strong · He is inside · He is angry · He is calm', hi: 'is' },
            { en: 'She is', ru: 'She is calm · She is sad · She is tired · She is happy · She is smart · She is ready', uk: 'She is calm · She is sad · She is tired · She is happy · She is smart · She is ready', hi: 'is' },
            { en: 'It is', ru: 'It is important · It is cheap · It is free · It is serious · It is near · It is broken · It is empty', uk: 'It is important · It is cheap · It is free · It is serious · It is near · It is broken · It is empty', hi: 'is' },
          ],
        },
        {
          kind: 'tip',
          ru: 'It в этом уроке часто переводится как «это»: It is important - это важно. It is broken - это сломано.',
          uk: 'It у цьому уроці часто перекладається як «це»: It is important - це важливо. It is broken - це зламано.',
        },
      ],
    },

    // ───────────────────────── 06 ─────────────────────────
    {
      num: '06',
      titleRu: 'You are, We are, They are',
      titleUk: 'You are, We are, They are',
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'С you, we и they используется are. You может означать «ты» или «вы». We - «мы». They - «они».',
          uk: 'З you, we та they використовується are. You може означати «ти» або «ви». We — «ми». They — «вони».',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'You are', ru: 'You are ready · You are right · You are late · You are kind · You are okay · You are safe', uk: 'You are ready · You are right · You are late · You are kind · You are okay · You are safe', hi: 'are' },
            { en: 'We are', ru: 'We are together · We are safe · We are friends · We are here · We are inside · We are calm · We are ready · We are late · We are okay', uk: 'We are together · We are safe · We are friends · We are here · We are inside · We are calm · We are ready · We are late · We are okay', hi: 'are' },
            { en: 'They are', ru: 'They are happy · They are outside · They are calm · They are ready · They are tired · They are hungry · They are together', uk: 'They are happy · They are outside · They are calm · They are ready · They are tired · They are hungry · They are together', hi: 'are' },
          ],
        },
        {
          kind: 'tip',
          ru: 'You are right может означать и «ты прав», и «вы правы». Английское you работает для обоих значений.',
          uk: 'You are right може означати і «ти правий», і «ви праві». Англійське you працює для обох значень.',
        },
      ],
    },

    // ───────────────────────── 07 ─────────────────────────
    {
      num: '07',
      titleRu: 'Что может стоять после To Be',
      titleUk: 'Що може стояти після To Be',
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'Во фразах этого урока после am, is и are стоит не действие, а описание. Это описание может показывать состояние, качество, место или ситуацию.',
          uk: 'У фразах цього уроку після am, is та are стоїть не дія, а опис. Цей опис може показувати стан, якість, місце або ситуацію.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Состояние человека', ru: 'как человек себя чувствует или в каком состоянии находится — ready, busy, calm, happy, okay, tired, sick, sad, nervous, hungry, angry', uk: 'як людина себе почуває або в якому стані знаходиться — ready, busy, calm, happy, okay, tired, sick, sad, nervous, hungry, angry' },
            { en: 'Качество или оценка', ru: 'какой кто-то или что-то — important, cheap, free, serious, strong, kind, smart, broken, empty', uk: 'який хтось або щось — important, cheap, free, serious, strong, kind, smart, broken, empty' },
            { en: 'Место', ru: 'где кто-то или что-то находится — here, outside, inside, near', uk: 'де хтось або щось знаходиться — here, outside, inside, near' },
            { en: 'Ситуация или связь', ru: 'отношение, роль или общее положение дел — together, safe, friends, right, late, fine', uk: 'відношення, роль або загальний стан справ — together, safe, friends, right, late, fine' },
          ],
        },
      ],
    },

    // ───────────────────────── 08 ─────────────────────────
    {
      num: '08',
      titleRu: 'Состояние человека после To Be',
      titleUk: 'Стан людини після To Be',
      exampleCount: 7,
      blocks: [
        {
          kind: 'body',
          ru: 'Многие фразы урока описывают состояние человека. В английском для этого часто нужна конструкция To Be + слово состояния.',
          uk: 'Багато фраз уроку описують стан людини. В англійській для цього часто потрібна конструкція To Be + слово стану.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'You are ready', ru: 'Ты готов', uk: 'Ти готовий', hi: 'are' },
            { en: 'He is busy', ru: 'Он занят', uk: 'Він зайнятий', hi: 'is' },
            { en: 'She is calm', ru: 'Она спокойна', uk: 'Вона спокійна', hi: 'is' },
            { en: 'They are happy', ru: 'Они счастливы', uk: 'Вони щасливі', hi: 'are' },
            { en: 'I am okay', ru: 'Я в порядке', uk: 'Я в порядку', hi: 'am' },
            { en: 'She is tired', ru: 'Она устала', uk: 'Вона втомлена', hi: 'is' },
            { en: 'They are hungry', ru: 'Они голодны', uk: 'Вони голодні', hi: 'are' },
          ],
        },
      ],
    },

    // ───────────────────────── 09 ─────────────────────────
    {
      num: '09',
      titleRu: 'Место после To Be',
      titleUk: 'Місце після To Be',
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'После To Be может стоять место. В этом уроке это here, outside, inside и near. Они отвечают на вопрос «где?».',
          uk: 'Після To Be може стояти місце. У цьому уроці це here, outside, inside та near. Вони відповідають на питання «де?».',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'here', ru: 'здесь — I am here · We are here', uk: 'тут — I am here · We are here' },
            { en: 'outside', ru: 'снаружи — They are outside · I am outside', uk: 'зовні — They are outside · I am outside' },
            { en: 'inside', ru: 'внутри — We are inside · He is inside', uk: 'всередині — We are inside · He is inside' },
            { en: 'near', ru: 'близко — It is near', uk: 'близько — It is near' },
          ],
        },
        {
          kind: 'tip',
          ru: 'В этих фразах не добавляй at, in или on к here, outside, inside, near. Учи именно те блоки, которые есть в уроке: I am here, They are outside, He is inside, It is near.',
          uk: 'У цих фразах не додавай at, in або on до here, outside, inside, near. Вивчай саме ті блоки, які є в уроці: I am here, They are outside, He is inside, It is near.',
        },
      ],
    },

    // ───────────────────────── 10 ─────────────────────────
    {
      num: '10',
      titleRu: 'It is = это',
      titleUk: 'It is = це',
      exampleCount: 7,
      blocks: [
        {
          kind: 'body',
          ru: 'Когда ты оцениваешь ситуацию или предмет, английский часто использует It is. По-русски это звучит как «это».',
          uk: 'Коли ти оцінюєш ситуацію або предмет, англійська часто використовує It is. Українською або російською це звучить як «це».',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'It is important', ru: 'Это важно', uk: 'Це важливо', hi: 'is' },
            { en: 'It is cheap', ru: 'Это дешево', uk: 'Це дешево', hi: 'is' },
            { en: 'It is free', ru: 'Это бесплатно', uk: 'Це безкоштовно', hi: 'is' },
            { en: 'It is serious', ru: 'Это серьёзно', uk: 'Це серйозно', hi: 'is' },
            { en: 'It is near', ru: 'Это близко', uk: 'Це близько', hi: 'is' },
            { en: 'It is broken', ru: 'Это сломано', uk: 'Це зламано', hi: 'is' },
            { en: 'It is empty', ru: 'Это пусто', uk: 'Це порожньо', hi: 'is' },
          ],
        },
        {
          kind: 'tip',
          ru: 'It не всегда переводится как «оно». В таких фразах It is часто просто означает «это».',
          uk: 'It не завжди перекладається як «воно». У таких фразах It is часто просто означає «це».',
        },
      ],
    },

    // ───────────────────────── 11 ─────────────────────────
    {
      num: '11',
      titleRu: 'Broken, tired, ready - это состояния',
      titleUk: 'Broken, tired, ready — це стани',
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'Некоторые слова выглядят как действие или результат действия, но в этом уроке они работают как описание состояния. После To Be они отвечают на вопрос «какой?» или «в каком состоянии?».',
          uk: 'Деякі слова виглядають як дія або результат дії, але в цьому уроці вони працюють як опис стану. Після To Be вони відповідають на питання «який?» або «в якому стані?».',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I am tired', ru: 'моё состояние', uk: 'мій стан', hi: 'am' },
            { en: 'She is ready', ru: 'её состояние готовности', uk: 'її стан готовності', hi: 'is' },
            { en: 'It is broken', ru: 'состояние предмета', uk: 'стан предмета', hi: 'is' },
            { en: 'It is empty', ru: 'состояние предмета или места', uk: 'стан предмета або місця', hi: 'is' },
          ],
        },
      ],
    },

    // ───────────────────────── 12 ─────────────────────────
    {
      num: '12',
      titleRu: 'Friends, together, safe, right, late',
      titleUk: 'Friends, together, safe, right, late',
      exampleCount: 9,
      blocks: [
        {
          kind: 'body',
          ru: 'В части фраз после To Be стоит не просто качество, а ситуация или отношение: мы друзья, мы вместе, мы в безопасности, ты прав, мы опаздываем.',
          uk: 'У частині фраз після To Be стоїть не просто якість, а ситуація або відношення: ми друзі, ми разом, ми в безпеці, ти правий, ми запізнюємося.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'We are friends', ru: 'Мы друзья', uk: 'Ми друзі', hi: 'are' },
            { en: 'We are together', ru: 'Мы вместе', uk: 'Ми разом', hi: 'are' },
            { en: 'They are together', ru: 'Они вместе', uk: 'Вони разом', hi: 'are' },
            { en: 'We are safe', ru: 'Мы в безопасности', uk: 'Ми в безпеці', hi: 'are' },
            { en: 'You are safe', ru: 'Ты в безопасности', uk: 'Ти в безпеці', hi: 'are' },
            { en: 'You are right', ru: 'Ты прав / Вы правы', uk: 'Ти правий / Ви праві', hi: 'are' },
            { en: 'You are late', ru: 'Ты опаздываешь', uk: 'Ти запізнюєшся', hi: 'are' },
            { en: 'We are late', ru: 'Мы опаздываем', uk: 'Ми запізнюємося', hi: 'are' },
            { en: 'You are okay', ru: 'Ты в порядке', uk: 'Ти в порядку', hi: 'are' },
          ],
        },
        {
          kind: 'tip',
          ru: 'You are late и We are late переводятся глаголом «опаздываешь / опаздываем», но английская логика здесь всё равно To Be + late.',
          uk: 'You are late і We are late перекладаються дієсловом «запізнюєшся / запізнюємося», але англійська логіка тут усе одно To Be + late.',
        },
      ],
    },

    // ───────────────────────── 13 ─────────────────────────
    {
      num: '13',
      titleRu: 'Перевод не всегда дословный',
      titleUk: 'Переклад не завжди дослівний',
      exampleCount: 6,
      blocks: [
        {
          kind: 'body',
          ru: 'Английский часто описывает состояние через To Be, а по-русски мы переводим это естественно, иногда через глагол или готовое выражение. Это нормально.',
          uk: 'Англійська часто описує стан через To Be, а українською або російською ми перекладаємо це природно, іноді через дієслово або готовий вираз. Це нормально.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'You are late', ru: 'Ты опаздываешь', uk: 'Ти запізнюєшся', hi: 'are' },
            { en: 'We are late', ru: 'Мы опаздываем', uk: 'Ми запізнюємося', hi: 'are' },
            { en: 'She is nervous', ru: 'Она нервничает', uk: 'Вона нервує', hi: 'is' },
            { en: 'We are safe', ru: 'Мы в безопасности', uk: 'Ми в безпеці', hi: 'are' },
            { en: 'You are right', ru: 'Ты прав / Вы правы', uk: 'Ти правий / Ви праві', hi: 'are' },
            { en: 'I am okay', ru: 'Я в порядке', uk: 'Я в порядку', hi: 'am' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Не переводи механически слово в слово. You are late - это не странная калька, а естественно «ты опаздываешь».',
          uk: 'Не перекладай механічно слово в слово. You are late - це не дивна калька, а природно «ти запізнюєшся».',
        },
      ],
    },

    // ───────────────────────── 14 ─────────────────────────
    {
      num: '14',
      titleRu: 'Самые частые ошибки',
      titleUk: 'Найчастіші помилки',
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
        },
      ],
    },

    // ───────────────────────── 15 ─────────────────────────
    {
      num: '15',
      titleRu: 'Что нужно вынести из урока',
      titleUk: 'Що треба винести з уроку',
      blocks: [
        {
          kind: 'body',
          ru: 'В этом уроке ты ставишь базовый каркас английского предложения: I am, he is, she is, it is, you are, we are, they are. После этого каркаса можно добавлять состояние, качество, место или ситуацию.',
          uk: 'У цьому уроці ти ставиш базовий каркас англійського речення: I am, he is, she is, it is, you are, we are, they are. Після цього каркаса можна додавати стан, якість, місце або ситуацію.',
        },
        {
          kind: 'tip',
          ru: 'Перед практикой держи одну формулу: кто + am/is/are + описание. I am ready. She is tired. We are here. It is important.',
          uk: 'Перед практикою тримай одну формулу: хто + am/is/are + опис. I am ready. She is tired. We are here. It is important.',
        },
      ],
    },
  ],
}
