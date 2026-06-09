// Authored content for the "mitap" plan (work meetings / remote calls, 112 days).
// Generated and audited via tools/plan_gen. Each MITAP_DAY_<N> is a PlanContentDay
// with planId 'mitap'. Days are appended in week-batches of 7; the
// MITAP_CONTENT_DAYS array is rebuilt to list DAY_1..DAY_<max> contiguously.
import type { PlanContentDay } from './plan_content_schema';

export const MITAP_DAY_1: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 1,
  topic: { ru: 'Подключиться к созвону и поздороваться', uk: 'Підключитися до дзвінка і привітатися', es: 'Conectarse a la llamada y saludar' },
  outcome: {
    ru: 'Ты сможешь зайти в рабочий созвон, назвать своё имя и сказать, что ты на месте.',
    uk: 'Ти зможеш зайти в робочий дзвінок, назвати своє ім\'я і сказати, що ти на місці.',
    es: 'Podrás entrar a una llamada de trabajo, decir tu nombre y avisar que ya estás.',
  },
  level: 'A1',
  prerequisiteLessons: [1],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Скажи кто ты: I am', uk: 'Скажи хто ти: I am', es: 'Di quién eres: I am' },
      body: {
        ru: 'Когда заходишь в созвон, начни с имени. Слово am идёт после I и значит «я есть». I am Anna — это «я Анна».',
        uk: 'Коли заходиш у дзвінок, почни з імені. Слово am іде після I і значить «я є». I am Anna — це «я Анна».',
        es: 'Cuando entras a la llamada, empieza con tu nombre. La palabra am va después de I y significa «yo soy». I am Anna es «soy Anna».',
      },
      examples: [
        { en: 'I am Anna.', gloss: { ru: 'Я Анна.', uk: 'Я Анна.', es: 'Soy Anna.' } },
        { en: 'I am here.', gloss: { ru: 'Я на месте.', uk: 'Я на місці.', es: 'Ya estoy aquí.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Коротко: I\'m', uk: 'Коротко: I\'m', es: 'Corto: I\'m' },
      body: {
        ru: 'В живой речи I am часто сливают в I\'m. Это то же самое, просто быстрее. I\'m here звучит как «я тут».',
        uk: 'У живій мові I am часто зливають в I\'m. Це те саме, просто швидше. I\'m here звучить як «я тут».',
        es: 'Al hablar, I am suele unirse en I\'m. Es lo mismo, solo más rápido. I\'m here suena como «estoy aquí».',
      },
      examples: [
        { en: 'I\'m Anna.', gloss: { ru: 'Я Анна.', uk: 'Я Анна.', es: 'Soy Anna.' } },
        { en: 'I\'m here.', gloss: { ru: 'Я тут.', uk: 'Я тут.', es: 'Estoy aquí.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Спроси про другого: are you', uk: 'Спитай про іншого: are you', es: 'Pregunta por otro: are you' },
      body: {
        ru: 'Про собеседника говорят you и слово are. Are you here? — «ты на связи?». Сначала are, потом you — и это уже вопрос.',
        uk: 'Про співрозмовника кажуть you і слово are. Are you here? — «ти на зв\'язку?». Спочатку are, потім you — і це вже питання.',
        es: 'Para el otro se usa you y la palabra are. ¿Are you here? es «¿estás ahí?». Primero are, luego you, y ya es pregunta.',
      },
      examples: [
        { en: 'Are you here?', gloss: { ru: 'Ты на связи?', uk: 'Ти на зв\'язку?', es: '¿Estás ahí?' } },
        { en: 'You are Max.', gloss: { ru: 'Ты Макс.', uk: 'Ти Макс.', es: 'Tú eres Max.' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d1_p1',
      english: 'Hi, I am Anna.',
      meaning: { ru: 'Привет, я Анна.', uk: 'Привіт, я Анна.', es: 'Hola, soy Anna.' },
      constructions: ['to-be', 'pronouns'],
      explanation: {
        title: { ru: 'Назови себя', uk: 'Назви себе', es: 'Preséntate' },
        rule: { ru: 'После I ставь am, потом своё имя: I am Anna — «я Анна».', uk: 'Після I став am, потім своє ім\'я: I am Anna — «я Анна».', es: 'Después de I pon am y luego tu nombre: I am Anna, «soy Anna».' },
        why: { ru: 'Так на созвоне сразу понятно, кто только что подключился.', uk: 'Так на дзвінку одразу зрозуміло, хто щойно підключився.', es: 'Así en la llamada se sabe enseguida quién acaba de entrar.' },
        commonMistake: { ru: 'Не говори I Anna без am. Нужно I am Anna.', uk: 'Не кажи I Anna без am. Потрібно I am Anna.', es: 'No digas I Anna sin am. Hay que decir I am Anna.' },
      },
      words: [
        { text: 'Hi', partOfSpeech: 'other', distractors: ['Bye', 'Yes', 'No', 'Please', 'Thanks'] },
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['you', 'he', 'she', 'it', 'we'] },
        { text: 'am', partOfSpeech: 'to-be', distractors: ['is', 'are', 'was', 'were', 'be'] },
        { text: 'Anna', partOfSpeech: 'other', distractors: ['Monday', 'London', 'blue', 'seven', 'door'] },
      ],
    },
    {
      id: 'mitap_d1_p2',
      english: 'I am here now.',
      meaning: { ru: 'Я на месте, я тут.', uk: 'Я на місці, я тут.', es: 'Ya estoy aquí.' },
      constructions: ['to-be', 'pronouns'],
      explanation: {
        title: { ru: 'Скажи, что ты на связи', uk: 'Скажи, що ти на зв\'язку', es: 'Avisa que ya estás' },
        rule: { ru: 'Слово here значит «тут». I am here — «я на месте».', uk: 'Слово here значить «тут». I am here — «я на місці».', es: 'La palabra here significa «aquí». I am here es «ya estoy».' },
        why: { ru: 'Этим ты показываешь команде, что готов начинать.', uk: 'Цим ти показуєш команді, що готовий починати.', es: 'Así muestras al equipo que estás listo para empezar.' },
        commonMistake: { ru: 'Не путай here «тут» с there «там».', uk: 'Не плутай here «тут» з there «там».', es: 'No confundas here «aquí» con there «allí».' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['you', 'he', 'she', 'it', 'they'] },
        { text: 'am', partOfSpeech: 'to-be', distractors: ['is', 'are', 'was', 'were', 'be'] },
        { text: 'here', partOfSpeech: 'adverb', distractors: ['soon', 'later', 'loudly', 'quickly', 'always'] },
        { text: 'now', partOfSpeech: 'adverb', distractors: ['soon', 'later', 'always', 'never', 'maybe'] },
      ],
    },
    {
      id: 'mitap_d1_p3',
      english: 'Hello, are you here?',
      meaning: { ru: 'Привет, ты на связи?', uk: 'Привіт, ти на зв\'язку?', es: 'Hola, ¿estás ahí?' },
      constructions: ['to-be', 'pronouns'],
      explanation: {
        title: { ru: 'Спроси, на месте ли другой', uk: 'Спитай, чи на місці інший', es: 'Pregunta si el otro está' },
        rule: { ru: 'Поставь are перед you — и это вопрос: are you here?', uk: 'Постав are перед you — і це питання: are you here?', es: 'Pon are antes de you y es pregunta: ¿are you here?' },
        why: { ru: 'Так ты проверяешь, слышит ли тебя коллега на созвоне.', uk: 'Так ти перевіряєш, чи чує тебе колега на дзвінку.', es: 'Así compruebas si tu colega te oye en la llamada.' },
        commonMistake: { ru: 'Не говори you are here? Для вопроса are идёт первым.', uk: 'Не кажи you are here? Для питання are іде першим.', es: 'No digas you are here? En la pregunta are va primero.' },
      },
      words: [
        { text: 'Hello', partOfSpeech: 'other', distractors: ['Goodbye', 'Sorry', 'Okay', 'Maybe', 'Welcome'] },
        { text: 'are', partOfSpeech: 'to-be', distractors: ['is', 'am', 'was', 'were', 'be'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['I', 'he', 'she', 'we', 'they'] },
        { text: 'here', partOfSpeech: 'adverb', distractors: ['slowly', 'early', 'loudly', 'quickly', 'soon'] },
      ],
    },
    {
      id: 'mitap_d1_p4',
      english: 'Yes, I am ready.',
      meaning: { ru: 'Да, я готов.', uk: 'Так, я готовий.', es: 'Sí, estoy listo.' },
      constructions: ['to-be', 'pronouns'],
      explanation: {
        title: { ru: 'Скажи, что ты готов', uk: 'Скажи, що ти готовий', es: 'Di que estás listo' },
        rule: { ru: 'Слово ready значит «готов». I am ready — «я готов».', uk: 'Слово ready значить «готовий». I am ready — «я готовий».', es: 'La palabra ready significa «listo». I am ready es «estoy listo».' },
        why: { ru: 'Так команда понимает, что можно начинать встречу.', uk: 'Так команда розуміє, що можна починати зустріч.', es: 'Así el equipo sabe que se puede empezar la reunión.' },
        commonMistake: { ru: 'Не пропускай am: нужно I am ready, не I ready.', uk: 'Не пропускай am: потрібно I am ready, не I ready.', es: 'No omitas am: es I am ready, no I ready.' },
      },
      words: [
        { text: 'Yes', partOfSpeech: 'other', distractors: ['No', 'Maybe', 'Please', 'Sorry', 'Okay'] },
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['you', 'he', 'she', 'it', 'they'] },
        { text: 'am', partOfSpeech: 'to-be', distractors: ['is', 'are', 'was', 'were', 'be'] },
        { text: 'ready', partOfSpeech: 'adjective', distractors: ['busy', 'late', 'tired', 'happy', 'new'] },
      ],
    },
    {
      id: 'mitap_d1_p5',
      english: 'You are Max, right?',
      meaning: { ru: 'Ты Макс, верно?', uk: 'Ти Макс, так?', es: 'Tú eres Max, ¿verdad?' },
      constructions: ['to-be', 'pronouns'],
      explanation: {
        title: { ru: 'Уточни имя коллеги', uk: 'Уточни ім\'я колеги', es: 'Confirma el nombre del colega' },
        rule: { ru: 'Про другого: you are. You are Max — «ты Макс».', uk: 'Про іншого: you are. You are Max — «ти Макс».', es: 'Para el otro: you are. You are Max es «tú eres Max».' },
        why: { ru: 'Так ты сразу понимаешь, с кем именно говоришь на созвоне.', uk: 'Так ти одразу розумієш, з ким саме говориш на дзвінку.', es: 'Así sabes enseguida con quién hablas en la llamada.' },
        commonMistake: { ru: 'Для you бери are, не is: you are, не you is.', uk: 'Для you бери are, не is: you are, не you is.', es: 'Para you usa are, no is: you are, no you is.' },
      },
      words: [
        { text: 'You', partOfSpeech: 'pronoun', distractors: ['I', 'he', 'she', 'it', 'we'] },
        { text: 'are', partOfSpeech: 'to-be', distractors: ['is', 'am', 'was', 'were', 'be'] },
        { text: 'Max', partOfSpeech: 'other', distractors: ['Friday', 'Paris', 'green', 'door', 'table'] },
        { text: 'right', partOfSpeech: 'adjective', distractors: ['wrong', 'late', 'busy', 'new', 'tired'] },
      ],
    },
    {
      id: 'mitap_d1_p6',
      english: 'He is in the call.',
      meaning: { ru: 'Он в созвоне.', uk: 'Він у дзвінку.', es: 'Él está en la llamada.' },
      constructions: ['to-be', 'pronouns'],
      explanation: {
        title: { ru: 'Скажи про третьего', uk: 'Скажи про третього', es: 'Habla de un tercero' },
        rule: { ru: 'Про него говорят he и слово is: he is — «он есть».', uk: 'Про нього кажуть he і слово is: he is — «він є».', es: 'Para él se usa he y la palabra is: he is, «él está».' },
        why: { ru: 'Так ты сообщаешь команде, кто уже подключился к встрече.', uk: 'Так ти повідомляєш команді, хто вже підключився до зустрічі.', es: 'Así avisas al equipo de quién ya se conectó a la reunión.' },
        commonMistake: { ru: 'Для he бери is, не are: he is, не he are.', uk: 'Для he бери is, не are: he is, не he are.', es: 'Para he usa is, no are: he is, no he are.' },
      },
      words: [
        { text: 'He', partOfSpeech: 'pronoun', distractors: ['I', 'you', 'we', 'they', 'it'] },
        { text: 'is', partOfSpeech: 'to-be', distractors: ['am', 'are', 'was', 'were', 'be'] },
        { text: 'in', partOfSpeech: 'preposition', distractors: ['under', 'of', 'off', 'up', 'out'] },
        { text: 'call', partOfSpeech: 'noun', distractors: ['chair', 'week', 'color', 'number', 'window'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'am', partOfSpeech: 'to-be', translation: { ru: '(я) есть', uk: '(я) є', es: 'soy / estoy' }, example: 'Hi, I am Anna.' },
    { word: 'here', partOfSpeech: 'adverb', translation: { ru: 'тут, на месте', uk: 'тут, на місці', es: 'aquí' }, example: 'I am here now.' },
    { word: 'are', partOfSpeech: 'to-be', translation: { ru: '(ты) есть', uk: '(ти) є', es: 'eres / estás' }, example: 'Hello, are you here?' },
    { word: 'ready', partOfSpeech: 'adjective', translation: { ru: 'готов', uk: 'готовий', es: 'listo' }, example: 'Yes, I am ready.' },
    { word: 'you', partOfSpeech: 'pronoun', translation: { ru: 'ты, вы', uk: 'ти, ви', es: 'tú' }, example: 'You are Max, right?' },
    { word: 'is', partOfSpeech: 'to-be', translation: { ru: '(он) есть', uk: '(він) є', es: 'es / está' }, example: 'He is in the call.' },
  ],
};

export const MITAP_DAY_2: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 2,
  topic: { ru: 'Проверка звука и видео перед началом', uk: 'Перевірка звуку й відео перед початком', es: 'Revisar el sonido y el video antes de empezar' },
  outcome: {
    ru: 'Сможешь спокойно проверить микрофон, звук и камеру перед созвоном и сказать, что готов.',
    uk: 'Зможеш спокійно перевірити мікрофон, звук і камеру перед дзвінком та сказати, що готовий.',
    es: 'Podrás revisar con calma el micrófono, el sonido y la cámara antes de la llamada y decir que estás listo.',
  },
  level: 'A1',
  prerequisiteLessons: [1, 2],
  intro: [
    {
      kind: 'why',
      title: { ru: 'Зачем эти фразы', uk: 'Навіщо ці фрази', es: 'Por qué estas frases' },
      body: {
        ru: 'Созвон вот-вот начнётся, а ты не уверен: слышно тебя или нет? Эти 6 фраз помогут быстро проверить звук и видео.',
        uk: 'Дзвінок ось-ось почнеться, а ти не впевнений: чути тебе чи ні? Ці 6 фраз допоможуть швидко перевірити звук і відео.',
        es: 'La llamada está por empezar y no estás seguro: ¿te oyen o no? Estas 6 frases te ayudan a revisar rápido el sonido y el video.',
      },
    },
    {
      kind: 'how',
      title: { ru: 'Как это работает', uk: 'Як це працює', es: 'Cómo funciona' },
      body: {
        ru: 'Секрет простой: чтобы спросить, ставь is/are/am в начало — Is my mic on? А чтобы сказать о себе, ставь его после: I\'m ready.',
        uk: 'Секрет простий: щоб спитати, став is/are/am на початок — Is my mic on? А щоб сказати про себе, став його після: I\'m ready.',
        es: 'El truco es simple: para preguntar, pon is/are/am al inicio — Is my mic on? Y para hablar de ti, ponlo después: I\'m ready.',
      },
      examples: [
        { en: 'Is my mic on?', gloss: { ru: 'Мой микрофон включён?', uk: 'Мій мікрофон увімкнений?', es: '¿Está encendido mi micrófono?' } },
        { en: 'I\'m ready now.', gloss: { ru: 'Я теперь готов.', uk: 'Я тепер готовий.', es: 'Ya estoy listo.' } },
      ],
    },
    {
      kind: 'trap',
      title: { ru: 'Частая ошибка', uk: 'Часта помилка', es: 'Error común' },
      body: {
        ru: 'В вопросе слово is/are идёт ПЕРВЫМ: Is the video on? А не My video is on? Поменял местами — и это уже не вопрос.',
        uk: 'У питанні слово is/are йде ПЕРШИМ: Is the video on? А не My video is on? Поміняв місцями — і це вже не питання.',
        es: 'En la pregunta, is/are va PRIMERO: Is the video on? No My video is on? Si los cambias, ya no es pregunta.',
      },
    },
  ],
  phrases: [
    {
      id: 'mitap_d2_p1',
      english: 'Is my mic on?',
      meaning: { ru: 'Мой микрофон включён?', uk: 'Мій мікрофон увімкнений?', es: '¿Está encendido mi micrófono?' },
      constructions: ['to-be-questions'],
      explanation: {
        title: { ru: 'Вопрос с Is', uk: 'Питання з Is', es: 'Pregunta con Is' },
        rule: { ru: 'Is — ставим первым, и это уже вопрос. on = «включён». Is my mic on? = «микрофон включён?».', uk: 'Is — ставимо першим, і це вже питання. on = «увімкнений». Is my mic on? = «мікрофон увімкнений?».', es: 'Is va primero y ya es pregunta. on = «encendido». Is my mic on? = «¿está encendido el micro?».' },
        why: { ru: 'Это первое, что спрашивают на созвоне: тебя не слышно, пока mic не on.', uk: 'Це перше, що питають на дзвінку: тебе не чути, поки mic не on.', es: 'Es lo primero que se pregunta en la llamada: no te oyen hasta que el mic está on.' },
        commonMistake: { ru: 'Ставь Is первым: Is my mic on? — а не My mic is on, это уже не вопрос.', uk: 'Став Is першим: Is my mic on? — а не My mic is on, це вже не питання.', es: 'Pon Is primero: Is my mic on? — no My mic is on, eso ya no es pregunta.' },
      },
      words: [
        { text: 'Is', partOfSpeech: 'to-be', distractors: ['Are', 'Am', 'Was', 'Were', 'Be'] },
        { text: 'my', partOfSpeech: 'determiner', distractors: ['me', 'we', 'they', 'he', 'she'] },
        { text: 'mic', partOfSpeech: 'noun', distractors: ['screen', 'chat', 'link', 'call', 'room'] },
        { text: 'on', partOfSpeech: 'adverb', distractors: ['up', 'down', 'out', 'away', 'over'] },
      ],
    },
    {
      id: 'mitap_d2_p2',
      english: 'Am I too quiet?',
      meaning: { ru: 'Я слишком тихо говорю?', uk: 'Я надто тихо говорю?', es: '¿Hablo demasiado bajo?' },
      constructions: ['to-be-questions'],
      explanation: {
        title: { ru: 'Вопрос с Am I', uk: 'Питання з Am I', es: 'Pregunta con Am I' },
        rule: { ru: 'Про себя спрашиваем Am I. quiet = «тихий». Am I too quiet? = «я слишком тихий?».', uk: 'Про себе питаємо Am I. quiet = «тихий». Am I too quiet? = «я надто тихий?».', es: 'Para uno mismo se pregunta Am I. quiet = «bajo». Am I too quiet? = «¿hablo muy bajo?».' },
        why: { ru: 'Если люди щурятся и наклоняются к экрану — спроси этой фразой, слышно ли тебя.', uk: 'Якщо люди мружаться й нахиляються до екрана — спитай цією фразою, чи чути тебе.', es: 'Si la gente entrecierra los ojos y se acerca a la pantalla, pregunta así si te oyen.' },
        commonMistake: { ru: 'С I всегда Am, не Is: Am I too quiet?, а не Is I too quiet.', uk: 'З I завжди Am, не Is: Am I too quiet?, а не Is I too quiet.', es: 'Con I siempre Am, no Is: Am I too quiet?, no Is I too quiet.' },
      },
      words: [
        { text: 'Am', partOfSpeech: 'to-be', distractors: ['Is', 'Are', 'Was', 'Were', 'Be'] },
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['you', 'we', 'they', 'he', 'she'] },
        { text: 'too', partOfSpeech: 'adverb', distractors: ['so', 'very', 'quite', 'really', 'pretty'] },
        { text: 'quiet', partOfSpeech: 'adjective', distractors: ['slow', 'fast', 'clear', 'calm', 'dark'] },
      ],
    },
    {
      id: 'mitap_d2_p3',
      english: 'Is the video on?',
      meaning: { ru: 'Видео включено?', uk: 'Відео ввімкнене?', es: '¿Está encendido el video?' },
      constructions: ['to-be-questions'],
      explanation: {
        title: { ru: 'Вопрос про видео', uk: 'Питання про відео', es: 'Pregunta sobre el video' },
        rule: { ru: 'Is первым — это вопрос. video = «видео». Is the video on? = «видео включено?».', uk: 'Is першим — це питання. video = «відео». Is the video on? = «відео ввімкнене?».', es: 'Is primero, es pregunta. video = «video». Is the video on? = «¿está encendido el video?».' },
        why: { ru: 'Иногда камера выключена, и тебя не видно. Спроси заранее, чтобы не сидеть «в темноте».', uk: 'Іноді камера вимкнена, і тебе не видно. Спитай заздалегідь, щоб не сидіти «в темряві».', es: 'A veces la cámara está apagada y no te ven. Pregunta antes para no quedar «a oscuras».' },
        commonMistake: { ru: 'Перед video нужно the: Is the video on?, а не Is video on.', uk: 'Перед video потрібне the: Is the video on?, а не Is video on.', es: 'Antes de video va the: Is the video on?, no Is video on.' },
      },
      words: [
        { text: 'Is', partOfSpeech: 'to-be', distractors: ['Are', 'Am', 'Was', 'Were', 'Be'] },
        { text: 'the', partOfSpeech: 'determiner', distractors: ['a', 'me', 'we', 'they', 'he'] },
        { text: 'video', partOfSpeech: 'noun', distractors: ['button', 'folder', 'window', 'wall', 'door'] },
        { text: 'on', partOfSpeech: 'adverb', distractors: ['up', 'down', 'out', 'away', 'over'] },
      ],
    },
    {
      id: 'mitap_d2_p4',
      english: 'Are you there?',
      meaning: { ru: 'Ты на связи?', uk: 'Ти на зв\'язку?', es: '¿Estás ahí?' },
      constructions: ['to-be-questions'],
      explanation: {
        title: { ru: 'Вопрос с Are you', uk: 'Питання з Are you', es: 'Pregunta con Are you' },
        rule: { ru: 'К you идёт Are. there = «там, на месте». Are you there? = «ты там?».', uk: 'До you йде Are. there = «там, на місці». Are you there? = «ти там?».', es: 'Con you va Are. there = «ahí». Are you there? = «¿estás ahí?».' },
        why: { ru: 'Тишина в эфире? Этой фразой проверяешь, что собеседник ещё на связи.', uk: 'Тиша в ефірі? Цією фразою перевіряєш, що співрозмовник ще на зв\'язку.', es: '¿Silencio en la línea? Con esta frase compruebas que la otra persona sigue ahí.' },
        commonMistake: { ru: 'С you всегда Are, не Is: Are you there?, а не Is you there.', uk: 'З you завжди Are, не Is: Are you there?, а не Is you there.', es: 'Con you siempre Are, no Is: Are you there?, no Is you there.' },
      },
      words: [
        { text: 'Are', partOfSpeech: 'to-be', distractors: ['Is', 'Am', 'Was', 'Were', 'Be'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['we', 'they', 'he', 'she', 'it'] },
        { text: 'there', partOfSpeech: 'adverb', distractors: ['busy', 'ready', 'late', 'calm', 'new'] },
      ],
    },
    {
      id: 'mitap_d2_p5',
      english: 'The sound is fine.',
      meaning: { ru: 'Звук в порядке.', uk: 'Звук у порядку.', es: 'El sonido está bien.' },
      constructions: ['to-be'],
      explanation: {
        title: { ru: 'Словечко is', uk: 'Слівце is', es: 'La palabra is' },
        rule: { ru: 'is — как «=» для одного предмета. sound = «звук», fine = «нормально». The sound is fine = «звук нормальный».', uk: 'is — як «=» для одного предмета. sound = «звук», fine = «нормально». The sound is fine = «звук нормальний».', es: 'is es como «=» para una cosa. sound = «sonido», fine = «bien». The sound is fine = «el sonido está bien».' },
        why: { ru: 'Когда тебя спросили про звук — коротко успокой собеседника этой фразой.', uk: 'Коли тебе спитали про звук — коротко заспокой співрозмовника цією фразою.', es: 'Cuando te preguntan por el sonido, tranquiliza al otro rápido con esta frase.' },
        commonMistake: { ru: 'Не теряй is: The sound is fine, а не The sound fine.', uk: 'Не губи is: The sound is fine, а не The sound fine.', es: 'No pierdas is: The sound is fine, no The sound fine.' },
      },
      words: [
        { text: 'The', partOfSpeech: 'determiner', distractors: ['A', 'This', 'That', 'My', 'Your'] },
        { text: 'sound', partOfSpeech: 'noun', distractors: ['floor', 'wall', 'door', 'window', 'button'] },
        { text: 'is', partOfSpeech: 'to-be', distractors: ['are', 'am', 'was', 'were', 'be'] },
        { text: 'fine', partOfSpeech: 'adjective', distractors: ['dark', 'wet', 'cold', 'green', 'round'] },
      ],
    },
    {
      id: 'mitap_d2_p6',
      english: 'I\'m ready now.',
      meaning: { ru: 'Я теперь готов.', uk: 'Я тепер готовий.', es: 'Ya estoy listo.' },
      constructions: ['to-be'],
      explanation: {
        title: { ru: 'Словечко I\'m', uk: 'Слівце I\'m', es: 'La palabra I\'m' },
        rule: { ru: 'I\'m — это «я есть». ready = «готов». I\'m ready = «я готов».', uk: 'I\'m — це «я є». ready = «готовий». I\'m ready = «я готовий».', es: 'I\'m es «yo estoy». ready = «listo». I\'m ready = «estoy listo».' },
        why: { ru: 'Проверил звук и видео — скажи это, и встреча может начинаться.', uk: 'Перевірив звук і відео — скажи це, і зустріч може починатися.', es: 'Ya revisaste sonido y video; di esto y la reunión puede empezar.' },
        commonMistake: { ru: 'Не теряй \'m: I\'m ready, а не I ready — без него фраза неполная.', uk: 'Не губи \'m: I\'m ready, а не I ready — без нього фраза неповна.', es: 'No pierdas \'m: I\'m ready, no I ready; sin él la frase queda coja.' },
      },
      words: [
        { text: 'I\'m', partOfSpeech: 'to-be', distractors: ['You\'re', 'He\'s', 'We\'re', 'It\'s', 'She\'s'] },
        { text: 'ready', partOfSpeech: 'adjective', distractors: ['busy', 'tired', 'late', 'happy', 'calm'] },
        { text: 'now', partOfSpeech: 'adverb', distractors: ['soon', 'later', 'today', 'here', 'again'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'mic', partOfSpeech: 'noun', translation: { ru: 'микрофон', uk: 'мікрофон', es: 'micrófono' }, example: 'Is my mic on?' },
    { word: 'video', partOfSpeech: 'noun', translation: { ru: 'видео', uk: 'відео', es: 'video' }, example: 'Is the video on?' },
    { word: 'sound', partOfSpeech: 'noun', translation: { ru: 'звук', uk: 'звук', es: 'sonido' }, example: 'The sound is fine.' },
    { word: 'quiet', partOfSpeech: 'adjective', translation: { ru: 'тихий', uk: 'тихий', es: 'bajo' }, example: 'Am I too quiet?' },
    { word: 'ready', partOfSpeech: 'adjective', translation: { ru: 'готовый', uk: 'готовий', es: 'listo' }, example: 'I\'m ready now.' },
    { word: 'there', partOfSpeech: 'adverb', translation: { ru: 'на месте', uk: 'на місці', es: 'ahí' }, example: 'Are you there?' },
  ],
};

export const MITAP_DAY_3: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 3,
  topic: { ru: 'Я вас не слышу, вы на mute', uk: 'Я вас не чую, ви на mute', es: 'No te oigo, estás en silencio' },
  outcome: {
    ru: 'Ты сможешь спокойно сказать на созвоне, что не слышишь человека и что у него выключен звук.',
    uk: 'Ти зможеш спокійно сказати на дзвінку, що не чуєш людину і що в неї вимкнено звук.',
    es: 'Podrás decir con calma en una llamada que no oyes a la persona y que tiene el micrófono apagado.',
  },
  level: 'A1',
  prerequisiteLessons: [2, 3],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Скажи, что не слышишь', uk: 'Скажи, що не чуєш', es: 'Di que no oyes' },
      body: {
        ru: 'Звук пропал на созвоне? Простая фраза I can\'t hear you говорит человеку: я тебя не слышу. Это вежливо и понятно всем.',
        uk: 'Звук зник на дзвінку? Проста фраза I can\'t hear you каже людині: я тебе не чую. Це ввічливо і зрозуміло всім.',
        es: '¿Se cortó el sonido en la llamada? La frase I can\'t hear you le dice a la persona: no te oigo. Es educado y claro para todos.',
      },
      examples: [
        { en: 'Sorry, I can\'t hear you.', gloss: { ru: 'Извини, я тебя не слышу.', uk: 'Вибач, я тебе не чую.', es: 'Perdona, no te oigo.' } },
        { en: 'I can\'t hear you well.', gloss: { ru: 'Я тебя плохо слышу.', uk: 'Я тебе погано чую.', es: 'No te oigo bien.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Подскажи про mute', uk: 'Підкажи про mute', es: 'Avisa sobre el silencio' },
      body: {
        ru: 'Часто человек просто забыл включить микрофон. Скажи You\'re on mute, и он сразу поймёт, что его не слышно. Короткая фраза-спасатель.',
        uk: 'Часто людина просто забула увімкнути мікрофон. Скажи You\'re on mute, і вона одразу зрозуміє, що її не чути. Коротка фраза-рятівник.',
        es: 'A menudo la persona solo olvidó activar el micrófono. Di You\'re on mute, y entenderá que no se le oye. Una frase corta que salva.',
      },
      examples: [
        { en: 'You\'re on mute.', gloss: { ru: 'У тебя выключен звук.', uk: 'У тебе вимкнено звук.', es: 'Estás en silencio.' } },
        { en: 'I think you\'re on mute.', gloss: { ru: 'Кажется, у тебя выключен звук.', uk: 'Здається, у тебе вимкнено звук.', es: 'Creo que estás en silencio.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Спокойно про звук', uk: 'Спокійно про звук', es: 'Con calma sobre el sonido' },
      body: {
        ru: 'Проблемы со звуком бывают у всех. Скажи The sound is bad, и команда поймёт, что дело не в тебе. Никто не нервничает.',
        uk: 'Проблеми зі звуком бувають у всіх. Скажи The sound is bad, і команда зрозуміє, що справа не в тобі. Ніхто не нервує.',
        es: 'Los problemas de sonido le pasan a todos. Di The sound is bad, y el equipo entenderá que no es culpa tuya. Nadie se pone nervioso.',
      },
      examples: [
        { en: 'The sound is bad today.', gloss: { ru: 'Звук сегодня плохой.', uk: 'Звук сьогодні поганий.', es: 'El sonido está mal hoy.' } },
        { en: 'Now the sound is good.', gloss: { ru: 'Теперь звук хороший.', uk: 'Тепер звук хороший.', es: 'Ahora el sonido está bien.' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d3_p1',
      english: 'Sorry, I can\'t hear you.',
      meaning: { ru: 'Извини, я тебя не слышу.', uk: 'Вибач, я тебе не чую.', es: 'Perdona, no te oigo.' },
      constructions: ['to-be-negation', 'present-simple'],
      explanation: {
        title: { ru: 'Я не слышу тебя', uk: 'Я не чую тебе', es: 'No te oigo' },
        rule: { ru: 'I can\'t hear you = я тебя не слышу. Hear значит слышать, you значит тебя. Простая фраза, когда звук пропал.', uk: 'I can\'t hear you = я тебе не чую. Hear значить чути, you значить тебе. Проста фраза, коли звук зник.', es: 'I can\'t hear you = no te oigo. Hear es oír, you es a ti. Frase simple cuando se corta el sonido.' },
        why: { ru: 'Так ты вежливо говоришь, что звука нет, и человек не обижается.', uk: 'Так ти ввічливо кажеш, що звуку немає, і людина не ображається.', es: 'Así dices con cortesía que no hay sonido, y la persona no se ofende.' },
        commonMistake: { ru: 'Не говори I no hear you. Тут нужно can\'t перед hear: I can\'t hear you.', uk: 'Не кажи I no hear you. Тут потрібне can\'t перед hear: I can\'t hear you.', es: 'No digas I no hear you. Hace falta can\'t antes de hear: I can\'t hear you.' },
      },
      words: [
        { text: 'Sorry', partOfSpeech: 'other', distractors: ['Yes', 'No', 'Bye', 'Wow', 'Okay'] },
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['we', 'he', 'she', 'they', 'it'] },
        { text: 'can\'t', partOfSpeech: 'modal', distractors: ['won\'t', 'mustn\'t', 'shouldn\'t', 'couldn\'t', 'wouldn\'t'] },
        { text: 'hear', partOfSpeech: 'verb', distractors: ['feel', 'eat', 'walk', 'draw', 'cook'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['him', 'her', 'them', 'us', 'me'] },
      ],
    },
    {
      id: 'mitap_d3_p2',
      english: 'You\'re on mute.',
      meaning: { ru: 'У тебя выключен звук.', uk: 'У тебе вимкнено звук.', es: 'Estás en silencio.' },
      constructions: ['to-be'],
      explanation: {
        title: { ru: 'У тебя выключен звук', uk: 'У тебе вимкнено звук', es: 'Estás en silencio' },
        rule: { ru: 'You\'re on mute = у тебя выключен микрофон. Mute значит без звука. Говори так, когда человека не слышно.', uk: 'You\'re on mute = у тебе вимкнено мікрофон. Mute значить без звуку. Кажи так, коли людину не чути.', es: 'You\'re on mute = tienes el micrófono apagado. Mute es sin sonido. Dilo cuando no se oye a la persona.' },
        why: { ru: 'Короткая подсказка, которая сразу спасает созвон и экономит время.', uk: 'Коротка підказка, яка одразу рятує дзвінок і економить час.', es: 'Una pista corta que salva la llamada al instante y ahorra tiempo.' },
        commonMistake: { ru: 'Не говори You on mute. Нужно you\'re: You\'re on mute.', uk: 'Не кажи You on mute. Потрібно you\'re: You\'re on mute.', es: 'No digas You on mute. Hace falta you\'re: You\'re on mute.' },
      },
      words: [
        { text: 'You\'re', partOfSpeech: 'to-be', distractors: ['I\'m', 'He\'s', 'She\'s', 'We\'re', 'They\'re'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['in', 'at', 'by', 'for', 'with'] },
        { text: 'mute', partOfSpeech: 'noun', distractors: ['button', 'window', 'keyboard', 'wall', 'folder'] },
      ],
    },
    {
      id: 'mitap_d3_p3',
      english: 'I think you\'re on mute.',
      meaning: { ru: 'Кажется, у тебя выключен звук.', uk: 'Здається, у тебе вимкнено звук.', es: 'Creo que estás en silencio.' },
      constructions: ['present-simple', 'to-be'],
      explanation: {
        title: { ru: 'Кажется, ты на mute', uk: 'Здається, ти на mute', es: 'Creo que estás en silencio' },
        rule: { ru: 'I think значит кажется, я думаю. Добавь его перед фразой, чтобы прозвучало мягче: I think you\'re on mute.', uk: 'I think значить здається, я думаю. Додай його перед фразою, щоб звучало м\'якше: I think you\'re on mute.', es: 'I think significa creo. Ponlo antes de la frase para sonar más suave: I think you\'re on mute.' },
        why: { ru: 'С I think подсказка звучит мягко и вежливо, без напора на человека.', uk: 'З I think підказка звучить м\'яко і ввічливо, без тиску на людину.', es: 'Con I think la pista suena suave y educada, sin presionar a la persona.' },
        commonMistake: { ru: 'Не говори I think you on mute. После you нужно \'re: you\'re.', uk: 'Не кажи I think you on mute. Після you потрібне \'re: you\'re.', es: 'No digas I think you on mute. Tras you hace falta \'re: you\'re.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['we', 'he', 'she', 'they', 'it'] },
        { text: 'think', partOfSpeech: 'verb', distractors: ['know', 'guess', 'hope', 'feel', 'mean'] },
        { text: 'you\'re', partOfSpeech: 'to-be', distractors: ['I\'m', 'he\'s', 'she\'s', 'we\'re', 'they\'re'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['in', 'at', 'by', 'for', 'with'] },
        { text: 'mute', partOfSpeech: 'noun', distractors: ['button', 'window', 'keyboard', 'wall', 'folder'] },
      ],
    },
    {
      id: 'mitap_d3_p4',
      english: 'The sound is bad today.',
      meaning: { ru: 'Звук сегодня плохой.', uk: 'Звук сьогодні поганий.', es: 'El sonido está mal hoy.' },
      constructions: ['to-be'],
      explanation: {
        title: { ru: 'Звук плохой', uk: 'Звук поганий', es: 'El sonido está mal' },
        rule: { ru: 'The sound is bad = звук плохой. Sound значит звук, bad значит плохой. Today значит сегодня.', uk: 'The sound is bad = звук поганий. Sound значить звук, bad значить поганий. Today значить сьогодні.', es: 'The sound is bad = el sonido está mal. Sound es sonido, bad es malo. Today es hoy.' },
        why: { ru: 'Так ты честно говоришь о проблеме, и команда ищет причину вместе.', uk: 'Так ти чесно кажеш про проблему, і команда шукає причину разом.', es: 'Así dices con sinceridad el problema, y el equipo busca la causa contigo.' },
        commonMistake: { ru: 'Не говори The sound bad today. Перед bad нужно is: sound is bad.', uk: 'Не кажи The sound bad today. Перед bad потрібне is: sound is bad.', es: 'No digas The sound bad today. Antes de bad hace falta is: sound is bad.' },
      },
      words: [
        { text: 'The', partOfSpeech: 'article', distractors: ['A', 'An', 'This', 'That', 'My'] },
        { text: 'sound', partOfSpeech: 'noun', distractors: ['floor', 'door', 'book', 'window', 'wall'] },
        { text: 'is', partOfSpeech: 'to-be', distractors: ['are', 'am', 'be', 'was', 'were'] },
        { text: 'bad', partOfSpeech: 'adjective', distractors: ['happy', 'green', 'early', 'round', 'wet'] },
        { text: 'today', partOfSpeech: 'adverb', distractors: ['now', 'here', 'soon', 'again', 'late'] },
      ],
    },
    {
      id: 'mitap_d3_p5',
      english: 'My microphone is not working.',
      meaning: { ru: 'Мой микрофон не работает.', uk: 'Мій мікрофон не працює.', es: 'Mi micrófono no funciona.' },
      constructions: ['to-be-negation'],
      explanation: {
        title: { ru: 'Микрофон не работает', uk: 'Мікрофон не працює', es: 'El micrófono no funciona' },
        rule: { ru: 'Microphone значит микрофон. Is not working = не работает. My значит мой. Скажи это, когда тебя не слышно.', uk: 'Microphone значить мікрофон. Is not working = не працює. My значить мій. Скажи це, коли тебе не чути.', es: 'Microphone es micrófono. Is not working = no funciona. My es mi. Dilo cuando no te oyen.' },
        why: { ru: 'Так ты объясняешь, почему молчишь, и никто не думает, что ты пропал.', uk: 'Так ти пояснюєш, чому мовчиш, і ніхто не думає, що ти зник.', es: 'Así explicas por qué callas, y nadie cree que desapareciste.' },
        commonMistake: { ru: 'Не говори My microphone not working. Перед not нужно is: is not working.', uk: 'Не кажи My microphone not working. Перед not потрібне is: is not working.', es: 'No digas My microphone not working. Antes de not hace falta is: is not working.' },
      },
      words: [
        { text: 'My', partOfSpeech: 'pronoun', distractors: ['His', 'Her', 'Our', 'Their', 'Your'] },
        { text: 'microphone', partOfSpeech: 'noun', distractors: ['camera', 'laptop', 'screen', 'speaker', 'button'] },
        { text: 'is', partOfSpeech: 'to-be', distractors: ['are', 'am', 'be', 'was', 'were'] },
        { text: 'not', partOfSpeech: 'adverb', distractors: ['no', 'never', 'none', 'nothing', 'neither'] },
        { text: 'working', partOfSpeech: 'verb', distractors: ['loading', 'playing', 'opening', 'starting', 'ringing'] },
      ],
    },
    {
      id: 'mitap_d3_p6',
      english: 'Now I can hear you well.',
      meaning: { ru: 'Теперь я тебя хорошо слышу.', uk: 'Тепер я тебе добре чую.', es: 'Ahora te oigo bien.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'Теперь слышу хорошо', uk: 'Тепер чую добре', es: 'Ahora oigo bien' },
        rule: { ru: 'Now значит теперь, well значит хорошо. I can hear you = я тебя слышу. Скажи так, когда звук вернулся.', uk: 'Now значить тепер, well значить добре. I can hear you = я тебе чую. Скажи так, коли звук повернувся.', es: 'Now es ahora, well es bien. I can hear you = te oigo. Dilo cuando vuelve el sonido.' },
        why: { ru: 'Так ты подтверждаешь, что звук вернулся, и созвон спокойно идёт дальше.', uk: 'Так ти підтверджуєш, що звук повернувся, і дзвінок спокійно йде далі.', es: 'Así confirmas que volvió el sonido, y la llamada sigue con calma.' },
        commonMistake: { ru: 'Не говори Now I hear you well. С can звучит естественнее: I can hear you.', uk: 'Не кажи Now I hear you well. З can звучить природніше: I can hear you.', es: 'No digas Now I hear you well. Con can suena más natural: I can hear you.' },
      },
      words: [
        { text: 'Now', partOfSpeech: 'adverb', distractors: ['Soon', 'Then', 'Here', 'Again', 'Late'] },
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['we', 'he', 'she', 'they', 'it'] },
        { text: 'can', partOfSpeech: 'modal', distractors: ['will', 'must', 'should', 'could', 'would'] },
        { text: 'hear', partOfSpeech: 'verb', distractors: ['feel', 'eat', 'walk', 'draw', 'cook'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['him', 'her', 'them', 'us', 'me'] },
        { text: 'well', partOfSpeech: 'adverb', distractors: ['fast', 'loud', 'soon', 'again', 'here'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'hear', partOfSpeech: 'verb', translation: { ru: 'слышать', uk: 'чути', es: 'oír' }, example: 'Sorry, I can\'t hear you.' },
    { word: 'mute', partOfSpeech: 'noun', translation: { ru: 'без звука, выключенный микрофон', uk: 'без звуку, вимкнений мікрофон', es: 'silencio, micrófono apagado' }, example: 'You\'re on mute.' },
    { word: 'think', partOfSpeech: 'verb', translation: { ru: 'думать, казаться', uk: 'думати, здаватися', es: 'creer, pensar' }, example: 'I think you\'re on mute.' },
    { word: 'sound', partOfSpeech: 'noun', translation: { ru: 'звук', uk: 'звук', es: 'sonido' }, example: 'The sound is bad today.' },
    { word: 'microphone', partOfSpeech: 'noun', translation: { ru: 'микрофон', uk: 'мікрофон', es: 'micrófono' }, example: 'My microphone is not working.' },
    { word: 'well', partOfSpeech: 'adverb', translation: { ru: 'хорошо', uk: 'добре', es: 'bien' }, example: 'Now I can hear you well.' },
  ],
};

export const MITAP_DAY_4: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 4,
  topic: { ru: 'Кто сегодня на созвоне', uk: 'Хто сьогодні на дзвінку', es: 'Quién está hoy en la llamada' },
  outcome: {
    ru: 'Ты сможешь спросить и сказать, кто сегодня участвует в созвоне и кого мы ждём.',
    uk: 'Ти зможеш запитати й сказати, хто сьогодні бере участь у дзвінку і кого ми чекаємо.',
    es: 'Podrás preguntar y decir quién participa hoy en la llamada y a quién esperamos.',
  },
  level: 'A1',
  prerequisiteLessons: [3, 6],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Спрашиваем, кто будет на созвоне', uk: 'Питаємо, хто буде на дзвінку', es: 'Preguntamos quién está en la llamada' },
      body: {
        ru: 'Перед встречей удобно спросить, кто сегодня участвует. Бери слово who (кто) и обычный вопрос: Who joins today? Кто сегодня присоединяется. Так ты сразу знаешь, кого ждать.',
        uk: 'Перед зустріччю зручно запитати, хто сьогодні бере участь. Бери слово who (хто) і звичайне питання: Who joins today? Хто сьогодні приєднується. Так одразу знаєш, кого чекати.',
        es: 'Antes de la reunión conviene preguntar quién participa hoy. Usa la palabra who (quién) y una pregunta normal: Who joins today? Quién se une hoy. Así sabes a quién esperar.',
      },
      examples: [
        { en: 'Who joins the call today?', gloss: { ru: 'Кто присоединяется к созвону сегодня?', uk: 'Хто приєднується до дзвінка сьогодні?', es: '¿Quién se une a la llamada hoy?' } },
        { en: 'My manager joins us today.', gloss: { ru: 'Мой руководитель присоединяется к нам сегодня.', uk: 'Мій керівник приєднується до нас сьогодні.', es: 'Mi jefe se une a nosotros hoy.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Говорим, кто участвует, а кто нет', uk: 'Кажемо, хто бере участь, а хто ні', es: 'Decimos quién participa y quién no' },
      body: {
        ru: 'Чтобы сказать, что кого-то нет, добавь does not: She does not join today. Её сегодня нет. А who знает: Who knows the topic? Кто знает тему. Коротко и понятно команде.',
        uk: 'Щоб сказати, що когось немає, додай does not: She does not join today. Її сьогодні немає. А who знає: Who knows the topic? Хто знає тему. Коротко й зрозуміло.',
        es: 'Para decir que alguien no está, añade does not: She does not join today. Hoy ella no está. Y who sabe: Who knows the topic? Quién sabe el tema. Corto y claro.',
      },
      examples: [
        { en: 'She does not join the call today.', gloss: { ru: 'Она сегодня не на созвоне.', uk: 'Вона сьогодні не на дзвінку.', es: 'Ella hoy no está en la llamada.' } },
        { en: 'Who knows the topic today?', gloss: { ru: 'Кто знает тему сегодня?', uk: 'Хто знає тему сьогодні?', es: '¿Quién sabe el tema hoy?' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Кого мы ждём на встрече', uk: 'Кого ми чекаємо на зустрічі', es: 'A quién esperamos en la reunión' },
      body: {
        ru: 'Если кто-то опаздывает, скажи: We wait for the client. Мы ждём клиента. Или спроси: Who do we wait for? Кого мы ждём. Так все понимают, можно ли начинать.',
        uk: 'Якщо хтось спізнюється, скажи: We wait for the client. Ми чекаємо клієнта. Або спитай: Who do we wait for? Кого ми чекаємо. Так усі розуміють, чи можна починати.',
        es: 'Si alguien llega tarde, di: We wait for the client. Esperamos al cliente. O pregunta: Who do we wait for? A quién esperamos. Así todos saben si pueden empezar.',
      },
      examples: [
        { en: 'We wait for the client today.', gloss: { ru: 'Мы сегодня ждём клиента.', uk: 'Ми сьогодні чекаємо клієнта.', es: 'Hoy esperamos al cliente.' } },
        { en: 'Who do we wait for today?', gloss: { ru: 'Кого мы сегодня ждём?', uk: 'Кого ми сьогодні чекаємо?', es: '¿A quién esperamos hoy?' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d4_p1',
      english: 'Who joins the call today?',
      meaning: { ru: 'Кто присоединяется к созвону сегодня?', uk: 'Хто приєднується до дзвінка сьогодні?', es: '¿Quién se une a la llamada hoy?' },
      constructions: ['wh-questions', 'present-simple'],
      explanation: {
        title: { ru: 'Спрашиваем, кто на созвоне', uk: 'Питаємо, хто на дзвінку', es: 'Preguntamos quién está en la llamada' },
        rule: { ru: 'Who значит кто. Ставь его в начало вопроса: Who joins — кто присоединяется.', uk: 'Who значить хто. Став його на початок питання: Who joins — хто приєднується.', es: 'Who significa quién. Ponlo al inicio de la pregunta: Who joins, quién se une.' },
        why: { ru: 'С who сразу понятно, что спрашиваешь про человека, а не про время или место.', uk: 'З who одразу зрозуміло, що питаєш про людину, а не про час чи місце.', es: 'Con who queda claro que preguntas por una persona, no por la hora o el lugar.' },
        commonMistake: { ru: 'Не ставь do перед who тут: говори Who joins, а не Who do joins.', uk: 'Не став do перед who тут: кажи Who joins, а не Who do joins.', es: 'No pongas do antes de who aquí: di Who joins, no Who do joins.' },
      },
      words: [
        { text: 'Who', partOfSpeech: 'pronoun', distractors: ['When', 'Where', 'How', 'Why', 'Whose'] },
        { text: 'joins', partOfSpeech: 'verb', distractors: ['leaves', 'starts', 'ends', 'calls', 'books'] },
        { text: 'the', partOfSpeech: 'determiner', distractors: ['an', 'me', 'we', 'they', 'he'] },
        { text: 'call', partOfSpeech: 'noun', distractors: ['report', 'desk', 'office', 'email', 'screen'] },
        { text: 'today', partOfSpeech: 'adverb', distractors: ['here', 'slowly', 'again', 'together', 'early'] },
      ],
    },
    {
      id: 'mitap_d4_p2',
      english: 'My manager joins us today.',
      meaning: { ru: 'Мой руководитель присоединяется к нам сегодня.', uk: 'Мій керівник приєднується до нас сьогодні.', es: 'Mi jefe se une a nosotros hoy.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'Говорим, кто будет с нами', uk: 'Кажемо, хто буде з нами', es: 'Decimos quién está con nosotros' },
        rule: { ru: 'Manager значит руководитель. Joins us — присоединяется к нам.', uk: 'Manager значить керівник. Joins us — приєднується до нас.', es: 'Manager significa jefe. Joins us, se une a nosotros.' },
        why: { ru: 'Так команда знает, что начальник тоже на встрече, и говорит спокойнее.', uk: 'Так команда знає, що начальник теж на зустрічі, і говорить спокійніше.', es: 'Así el equipo sabe que el jefe también está y habla con más calma.' },
        commonMistake: { ru: 'После my один человек: говори joins с буквой s, не join.', uk: 'Після my одна людина: кажи joins з буквою s, не join.', es: 'Tras my una persona: di joins con s, no join.' },
      },
      words: [
        { text: 'My', partOfSpeech: 'determiner', distractors: ['Me', 'I', 'We', 'They', 'He'] },
        { text: 'manager', partOfSpeech: 'noun', distractors: ['client', 'report', 'screen', 'desk', 'office'] },
        { text: 'joins', partOfSpeech: 'verb', distractors: ['leaves', 'calls', 'ends', 'starts', 'books'] },
        { text: 'us', partOfSpeech: 'pronoun', distractors: ['we', 'they', 'he', 'she', 'I'] },
        { text: 'today', partOfSpeech: 'adverb', distractors: ['here', 'slowly', 'again', 'together', 'early'] },
      ],
    },
    {
      id: 'mitap_d4_p3',
      english: 'She does not join the call today.',
      meaning: { ru: 'Она сегодня не на созвоне.', uk: 'Вона сьогодні не на дзвінку.', es: 'Ella hoy no está en la llamada.' },
      constructions: ['present-simple-negation'],
      explanation: {
        title: { ru: 'Говорим, что кого-то нет', uk: 'Кажемо, що когось немає', es: 'Decimos que alguien no está' },
        rule: { ru: 'Does not значит не. She does not join — она не присоединяется.', uk: 'Does not значить не. She does not join — вона не приєднується.', es: 'Does not significa no. She does not join, ella no se une.' },
        why: { ru: 'Так сразу ясно, что её ждать не нужно, и встреча идёт дальше.', uk: 'Так одразу ясно, що її чекати не треба, і зустріч іде далі.', es: 'Así queda claro que no hay que esperarla y la reunión sigue.' },
        commonMistake: { ru: 'После does not слово join без s: не говори does not joins.', uk: 'Після does not слово join без s: не кажи does not joins.', es: 'Tras does not va join sin s: no digas does not joins.' },
      },
      words: [
        { text: 'She', partOfSpeech: 'pronoun', distractors: ['They', 'We', 'You', 'I', 'Who'] },
        { text: 'does', partOfSpeech: 'verb', distractors: ['is', 'has', 'goes', 'wants', 'needs'] },
        { text: 'not', partOfSpeech: 'adverb', distractors: ['never', 'also', 'still', 'only', 'just'] },
        { text: 'join', partOfSpeech: 'verb', distractors: ['leave', 'start', 'end', 'call', 'book'] },
        { text: 'the', partOfSpeech: 'determiner', distractors: ['an', 'me', 'we', 'they', 'he'] },
        { text: 'call', partOfSpeech: 'noun', distractors: ['report', 'desk', 'office', 'email', 'screen'] },
        { text: 'today', partOfSpeech: 'adverb', distractors: ['here', 'slowly', 'again', 'together', 'early'] },
      ],
    },
    {
      id: 'mitap_d4_p4',
      english: 'Who knows the topic today?',
      meaning: { ru: 'Кто знает тему сегодня?', uk: 'Хто знає тему сьогодні?', es: '¿Quién sabe el tema hoy?' },
      constructions: ['wh-questions', 'present-simple'],
      explanation: {
        title: { ru: 'Спрашиваем, кто в теме', uk: 'Питаємо, хто в темі', es: 'Preguntamos quién sabe el tema' },
        rule: { ru: 'Knows значит знает. Who knows — кто знает.', uk: 'Knows значить знає. Who knows — хто знає.', es: 'Knows significa sabe. Who knows, quién sabe.' },
        why: { ru: 'Так ты находишь человека, который расскажет про вопрос встречи.', uk: 'Так ти знаходиш людину, яка розкаже про питання зустрічі.', es: 'Así encuentras a la persona que explicará el tema de la reunión.' },
        commonMistake: { ru: 'После who один человек: говори knows с s, не know.', uk: 'Після who одна людина: кажи knows з s, не know.', es: 'Tras who una persona: di knows con s, no know.' },
      },
      words: [
        { text: 'Who', partOfSpeech: 'pronoun', distractors: ['When', 'Where', 'How', 'Why', 'Whose'] },
        { text: 'knows', partOfSpeech: 'verb', distractors: ['leaves', 'calls', 'books', 'starts', 'ends'] },
        { text: 'the', partOfSpeech: 'determiner', distractors: ['an', 'me', 'we', 'they', 'he'] },
        { text: 'topic', partOfSpeech: 'noun', distractors: ['desk', 'screen', 'office', 'email', 'report'] },
        { text: 'today', partOfSpeech: 'adverb', distractors: ['here', 'slowly', 'again', 'together', 'early'] },
      ],
    },
    {
      id: 'mitap_d4_p5',
      english: 'We wait for the client today.',
      meaning: { ru: 'Мы сегодня ждём клиента.', uk: 'Ми сьогодні чекаємо клієнта.', es: 'Hoy esperamos al cliente.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'Говорим, кого ждём', uk: 'Кажемо, кого чекаємо', es: 'Decimos a quién esperamos' },
        rule: { ru: 'Wait for значит ждём. We wait for the client — ждём клиента.', uk: 'Wait for значить чекаємо. We wait for the client — чекаємо клієнта.', es: 'Wait for significa esperar. We wait for the client, esperamos al cliente.' },
        why: { ru: 'Так команда понимает, почему пауза, и спокойно ждёт нужного человека.', uk: 'Так команда розуміє, чому пауза, і спокійно чекає потрібну людину.', es: 'Así el equipo entiende la pausa y espera con calma a la persona.' },
        commonMistake: { ru: 'Не теряй for: говори wait for the client, а не wait the client.', uk: 'Не губи for: кажи wait for the client, а не wait the client.', es: 'No pierdas for: di wait for the client, no wait the client.' },
      },
      words: [
        { text: 'We', partOfSpeech: 'pronoun', distractors: ['He', 'She', 'It', 'Who', 'Anna'] },
        { text: 'wait', partOfSpeech: 'verb', distractors: ['start', 'call', 'leave', 'book', 'end'] },
        { text: 'for', partOfSpeech: 'other', distractors: ['to', 'at', 'of', 'off', 'up'] },
        { text: 'the', partOfSpeech: 'determiner', distractors: ['an', 'me', 'we', 'they', 'he'] },
        { text: 'client', partOfSpeech: 'noun', distractors: ['report', 'desk', 'screen', 'email', 'office'] },
        { text: 'today', partOfSpeech: 'adverb', distractors: ['here', 'slowly', 'again', 'together', 'early'] },
      ],
    },
    {
      id: 'mitap_d4_p6',
      english: 'Who do we wait for today?',
      meaning: { ru: 'Кого мы сегодня ждём?', uk: 'Кого ми сьогодні чекаємо?', es: '¿A quién esperamos hoy?' },
      constructions: ['wh-questions', 'present-simple'],
      explanation: {
        title: { ru: 'Спрашиваем, кого ждать', uk: 'Питаємо, кого чекати', es: 'Preguntamos a quién esperar' },
        rule: { ru: 'Who do we wait for значит кого мы ждём. Это вопрос про человека.', uk: 'Who do we wait for значить кого ми чекаємо. Це питання про людину.', es: 'Who do we wait for significa a quién esperamos. Pregunta por una persona.' },
        why: { ru: 'Так все узнают, можно ли начинать или стоит подождать кого-то ещё.', uk: 'Так усі дізнаються, чи можна починати, чи варто почекати ще когось.', es: 'Así todos saben si pueden empezar o deben esperar a alguien más.' },
        commonMistake: { ru: 'Здесь нужен do: говори Who do we wait for, а не Who we wait for.', uk: 'Тут потрібен do: кажи Who do we wait for, а не Who we wait for.', es: 'Aquí va do: di Who do we wait for, no Who we wait for.' },
      },
      words: [
        { text: 'Who', partOfSpeech: 'pronoun', distractors: ['When', 'Where', 'How', 'Why', 'Whose'] },
        { text: 'do', partOfSpeech: 'verb', distractors: ['are', 'is', 'have', 'go', 'want'] },
        { text: 'we', partOfSpeech: 'pronoun', distractors: ['they', 'he', 'she', 'you', 'it'] },
        { text: 'wait', partOfSpeech: 'verb', distractors: ['start', 'call', 'leave', 'book', 'end'] },
        { text: 'for', partOfSpeech: 'other', distractors: ['to', 'at', 'of', 'off', 'up'] },
        { text: 'today', partOfSpeech: 'adverb', distractors: ['here', 'slowly', 'again', 'together', 'early'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'joins', partOfSpeech: 'verb', translation: { ru: 'присоединяется', uk: 'приєднується', es: 'se une' }, example: 'Who joins the call today?' },
    { word: 'manager', partOfSpeech: 'noun', translation: { ru: 'руководитель', uk: 'керівник', es: 'jefe' }, example: 'My manager joins us today.' },
    { word: 'knows', partOfSpeech: 'verb', translation: { ru: 'знает', uk: 'знає', es: 'sabe' }, example: 'Who knows the topic today?' },
    { word: 'topic', partOfSpeech: 'noun', translation: { ru: 'тема', uk: 'тема', es: 'tema' }, example: 'Who knows the topic today?' },
    { word: 'wait', partOfSpeech: 'verb', translation: { ru: 'ждём', uk: 'чекаємо', es: 'esperamos' }, example: 'We wait for the client today.' },
    { word: 'client', partOfSpeech: 'noun', translation: { ru: 'клиент', uk: 'клієнт', es: 'cliente' }, example: 'We wait for the client today.' },
  ],
};

export const MITAP_DAY_5: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 5,
  topic: { ru: 'Опоздал на созвон: коротко извиниться', uk: 'Запізнився на дзвінок: коротко вибачитися', es: 'Tarde a la llamada: disculparse rápido' },
  outcome: {
    ru: 'Сможешь спокойно войти в созвон с опозданием, коротко извиниться и сказать, что ты уже на месте.',
    uk: 'Зможеш спокійно зайти в дзвінок із запізненням, коротко вибачитися й сказати, що ти вже на місці.',
    es: 'Podrás entrar tarde a la llamada con calma, disculparte rápido y decir que ya estás aquí.',
  },
  level: 'A1',
  prerequisiteLessons: [1, 3],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Как извиниться за опоздание', uk: 'Як вибачитися за запізнення', es: 'Cómo disculparse por llegar tarde' },
      body: {
        ru: 'Ты заходишь в созвон позже всех. Не нужно длинных оправданий. Скажи I\'m sorry («извини») плюс I\'m late («я опоздал») — и всё, можно работать.',
        uk: 'Ти заходиш у дзвінок пізніше за всіх. Не треба довгих виправдань. Скажи I\'m sorry («вибач») плюс I\'m late («я запізнився») — і все, можна працювати.',
        es: 'Entras a la llamada el último. No hacen falta excusas largas. Di I\'m sorry («perdón») más I\'m late («llegué tarde») y listo, a trabajar.',
      },
      examples: [
        { en: 'Sorry, I\'m late.', gloss: { ru: 'Извини, я опоздал.', uk: 'Вибач, я запізнився.', es: 'Perdón, llegué tarde.' } },
        { en: 'I\'m here now.', gloss: { ru: 'Я уже на месте.', uk: 'Я вже на місці.', es: 'Ya estoy aquí.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Маленькое I\'m', uk: 'Маленьке I\'m', es: 'El pequeño I\'m' },
      body: {
        ru: 'Почти в каждой фразе сегодня есть I\'m — это «я есть». I\'m late, I\'m here, I\'m sorry. Поставил I\'m — и фраза стоит крепко.',
        uk: 'Майже в кожній фразі сьогодні є I\'m — це «я є». I\'m late, I\'m here, I\'m sorry. Поставив I\'m — і фраза стоїть міцно.',
        es: 'Casi cada frase de hoy tiene I\'m, que es «yo estoy». I\'m late, I\'m here, I\'m sorry. Pones I\'m y la frase queda firme.',
      },
      examples: [
        { en: 'I\'m so sorry.', gloss: { ru: 'Мне очень жаль.', uk: 'Мені дуже шкода.', es: 'Lo siento mucho.' } },
        { en: 'I\'m late.', gloss: { ru: 'Я опоздал.', uk: 'Я запізнився.', es: 'Llegué tarde.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Скажи, почему опоздал', uk: 'Скажи, чому запізнився', es: 'Di por qué llegaste tarde' },
      body: {
        ru: 'Хочешь объяснить причину? Возьми I have («у меня есть») плюс дело: I have a quick meeting. Коротко и понятно, без долгих историй.',
        uk: 'Хочеш пояснити причину? Візьми I have («у мене є») плюс справу: I have a quick meeting. Коротко й зрозуміло, без довгих історій.',
        es: '¿Quieres explicar el motivo? Usa I have («tengo») más la tarea: I have a quick meeting. Corto y claro, sin historias largas.',
      },
      examples: [
        { en: 'I have a quick meeting.', gloss: { ru: 'У меня была короткая встреча.', uk: 'У мене була коротка зустріч.', es: 'Tengo una reunión corta.' } },
        { en: 'We start now.', gloss: { ru: 'Мы начинаем сейчас.', uk: 'Ми починаємо зараз.', es: 'Empezamos ahora.' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d5_p1',
      english: 'Sorry, I\'m late.',
      meaning: { ru: 'Извини, я опоздал.', uk: 'Вибач, я запізнився.', es: 'Perdón, llegué tarde.' },
      constructions: ['to-be'],
      explanation: {
        title: { ru: 'Словечко I\'m late', uk: 'Слівце I\'m late', es: 'La palabra I\'m late' },
        rule: { ru: 'I\'m — это «я есть». late = «поздно», I\'m late = «я опоздал».', uk: 'I\'m — це «я є». late = «пізно», I\'m late = «я запізнився».', es: 'I\'m es «yo estoy». late = «tarde», I\'m late = «llegué tarde».' },
        why: { ru: 'Sorry впереди — это «извини». Дальше сразу говоришь, в чём дело: I\'m late.', uk: 'Sorry попереду — це «вибач». Далі одразу кажеш, у чому річ: I\'m late.', es: 'Sorry delante es «perdón». Luego dices enseguida qué pasa: I\'m late.' },
        commonMistake: { ru: 'Не теряй I\'m: говори I\'m late, а не просто late — без I\'m фраза неполная.', uk: 'Не губи I\'m: кажи I\'m late, а не просто late — без I\'m фраза неповна.', es: 'No pierdas I\'m: di I\'m late, no solo late; sin I\'m la frase queda coja.' },
      },
      words: [
        { text: 'Sorry', partOfSpeech: 'other', distractors: ['Yes', 'No', 'Bye', 'Please', 'Thanks'] },
        { text: 'I\'m', partOfSpeech: 'to-be', distractors: ['You\'re', 'He\'s', 'We\'re', 'It\'s', 'She\'s'] },
        { text: 'late', partOfSpeech: 'adjective', distractors: ['tired', 'busy', 'ready', 'sick', 'new'] },
      ],
    },
    {
      id: 'mitap_d5_p2',
      english: 'I\'m here now.',
      meaning: { ru: 'Я уже на месте.', uk: 'Я вже на місці.', es: 'Ya estoy aquí.' },
      constructions: ['to-be'],
      explanation: {
        title: { ru: 'Слово here', uk: 'Слово here', es: 'La palabra here' },
        rule: { ru: 'here — это «тут, на месте». I\'m here = «я тут, я на связи».', uk: 'here — це «тут, на місці». I\'m here = «я тут, я на зв\'язку».', es: 'here es «aquí». I\'m here = «estoy aquí, ya conectado».' },
        why: { ru: 'now в конце — это «сейчас». Оно говорит: я уже на месте, можно начинать.', uk: 'now у кінці — це «зараз». Воно каже: я вже на місці, можна починати.', es: 'now al final es «ahora». Dice: ya estoy aquí, podemos empezar.' },
        commonMistake: { ru: 'Перед here не нужен предлог: говори I\'m here, а не I\'m in here.', uk: 'Перед here не потрібен прийменник: кажи I\'m here, а не I\'m in here.', es: 'Antes de here no va preposición: di I\'m here, no I\'m in here.' },
      },
      words: [
        { text: 'I\'m', partOfSpeech: 'to-be', distractors: ['You\'re', 'He\'s', 'We\'re', 'It\'s', 'She\'s'] },
        { text: 'here', partOfSpeech: 'adverb', distractors: ['then', 'soon', 'today', 'again', 'always'] },
        { text: 'now', partOfSpeech: 'adverb', distractors: ['soon', 'today', 'later', 'always', 'yet'] },
      ],
    },
    {
      id: 'mitap_d5_p3',
      english: 'I have a quick meeting.',
      meaning: { ru: 'У меня короткая встреча.', uk: 'У мене коротка зустріч.', es: 'Tengo una reunión corta.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'Слово have', uk: 'Слово have', es: 'La palabra have' },
        rule: { ru: 'have — это «есть, имею». meeting = «встреча», I have a meeting = «у меня встреча».', uk: 'have — це «є, маю». meeting = «зустріч», I have a meeting = «у мене зустріч».', es: 'have es «tengo». meeting = «reunión», I have a meeting = «tengo una reunión».' },
        why: { ru: 'quick — «быстрый, короткий». Это коротко объясняет, почему ты опоздал.', uk: 'quick — «швидкий, короткий». Це коротко пояснює, чому ти запізнився.', es: 'quick es «rápido, corto». Explica en breve por qué llegaste tarde.' },
        commonMistake: { ru: 'Перед meeting нужно a: говори a quick meeting, а не quick meeting.', uk: 'Перед meeting потрібне a: кажи a quick meeting, а не quick meeting.', es: 'Antes de meeting va a: di a quick meeting, no quick meeting.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['You', 'We', 'They', 'He', 'She'] },
        { text: 'have', partOfSpeech: 'verb', distractors: ['want', 'see', 'take', 'find', 'make'] },
        { text: 'a', partOfSpeech: 'article', distractors: ['the', 'my', 'this', 'one', 'that'] },
        { text: 'quick', partOfSpeech: 'adjective', distractors: ['small', 'early', 'calm', 'easy', 'new'] },
        { text: 'meeting', partOfSpeech: 'noun', distractors: ['call', 'problem', 'report', 'task', 'client'] },
      ],
    },
    {
      id: 'mitap_d5_p4',
      english: 'I\'m so sorry.',
      meaning: { ru: 'Мне очень жаль.', uk: 'Мені дуже шкода.', es: 'Lo siento mucho.' },
      constructions: ['to-be'],
      explanation: {
        title: { ru: 'Словечко so', uk: 'Слівце so', es: 'La palabra so' },
        rule: { ru: 'so — это «очень, так». I\'m so sorry = «мне очень жаль».', uk: 'so — це «дуже, так». I\'m so sorry = «мені дуже шкода».', es: 'so es «muy, tan». I\'m so sorry = «lo siento mucho».' },
        why: { ru: 'so перед sorry делает извинение теплее — слышно, что тебе правда неловко.', uk: 'so перед sorry робить вибачення теплішим — чути, що тобі справді ніяково.', es: 'so antes de sorry hace la disculpa más cálida: se nota que de verdad lo sientes.' },
        commonMistake: { ru: 'so ставят перед sorry, а не после: говори so sorry, а не sorry so.', uk: 'so ставлять перед sorry, а не після: кажи so sorry, а не sorry so.', es: 'so va antes de sorry, no después: di so sorry, no sorry so.' },
      },
      words: [
        { text: 'I\'m', partOfSpeech: 'to-be', distractors: ['You\'re', 'He\'s', 'We\'re', 'It\'s', 'She\'s'] },
        { text: 'so', partOfSpeech: 'adverb', distractors: ['too', 'just', 'maybe', 'soon', 'always'] },
        { text: 'sorry', partOfSpeech: 'adjective', distractors: ['glad', 'sure', 'late', 'busy', 'ready'] },
      ],
    },
    {
      id: 'mitap_d5_p5',
      english: 'We start now.',
      meaning: { ru: 'Мы начинаем сейчас.', uk: 'Ми починаємо зараз.', es: 'Empezamos ahora.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'Слово start', uk: 'Слово start', es: 'La palabra start' },
        rule: { ru: 'start — это «начинаем». We start now = «мы начинаем сейчас».', uk: 'start — це «починаємо». We start now = «ми починаємо зараз».', es: 'start es «empezamos». We start now = «empezamos ahora».' },
        why: { ru: 'Скажи это после извинения — ты двигаешь созвон дальше, а не застреваешь.', uk: 'Скажи це після вибачення — ти рухаєш дзвінок далі, а не застрягаєш.', es: 'Dilo tras la disculpa: así mueves la llamada adelante y no te atascas.' },
        commonMistake: { ru: 'С we глагол простой: говори we start, а не we starts.', uk: 'З we дієслово просте: кажи we start, а не we starts.', es: 'Con we el verbo va simple: di we start, no we starts.' },
      },
      words: [
        { text: 'We', partOfSpeech: 'pronoun', distractors: ['You', 'They', 'He', 'She', 'It'] },
        { text: 'start', partOfSpeech: 'verb', distractors: ['wait', 'check', 'read', 'call', 'ask'] },
        { text: 'now', partOfSpeech: 'adverb', distractors: ['soon', 'today', 'later', 'always', 'yet'] },
      ],
    },
    {
      id: 'mitap_d5_p6',
      english: 'I\'m ready to go.',
      meaning: { ru: 'Я готов начать.', uk: 'Я готовий почати.', es: 'Estoy listo para empezar.' },
      constructions: ['to-be'],
      explanation: {
        title: { ru: 'Слово ready', uk: 'Слово ready', es: 'La palabra ready' },
        rule: { ru: 'ready — это «готов». I\'m ready = «я готов».', uk: 'ready — це «готовий». I\'m ready = «я готовий».', es: 'ready es «listo». I\'m ready = «estoy listo».' },
        why: { ru: 'to go тут — «начинать, поехали». Ты показываешь: всё, я в деле.', uk: 'to go тут — «починати, поїхали». Ти показуєш: усе, я в справі.', es: 'to go aquí es «empezar, vamos». Muestras: listo, estoy en marcha.' },
        commonMistake: { ru: 'После ready идёт to: говори ready to go, а не ready go.', uk: 'Після ready йде to: кажи ready to go, а не ready go.', es: 'Tras ready va to: di ready to go, no ready go.' },
      },
      words: [
        { text: 'I\'m', partOfSpeech: 'to-be', distractors: ['You\'re', 'He\'s', 'We\'re', 'It\'s', 'She\'s'] },
        { text: 'ready', partOfSpeech: 'adjective', distractors: ['late', 'busy', 'sick', 'tired', 'new'] },
        { text: 'to', partOfSpeech: 'other', distractors: ['for', 'at', 'on', 'by', 'of'] },
        { text: 'go', partOfSpeech: 'verb', distractors: ['start', 'wait', 'talk', 'join', 'read'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'late', partOfSpeech: 'adjective', translation: { ru: 'опоздавший, поздно', uk: 'той, що запізнився, пізно', es: 'tarde' }, example: 'Sorry, I\'m late.' },
    { word: 'here', partOfSpeech: 'adverb', translation: { ru: 'тут, на месте', uk: 'тут, на місці', es: 'aquí' }, example: 'I\'m here now.' },
    { word: 'quick', partOfSpeech: 'adjective', translation: { ru: 'быстрый, короткий', uk: 'швидкий, короткий', es: 'rápido, corto' }, example: 'I have a quick meeting.' },
    { word: 'meeting', partOfSpeech: 'noun', translation: { ru: 'встреча', uk: 'зустріч', es: 'reunión' }, example: 'I have a quick meeting.' },
    { word: 'sorry', partOfSpeech: 'adjective', translation: { ru: 'жаль, извини', uk: 'шкода, вибач', es: 'lo siento' }, example: 'I\'m so sorry.' },
    { word: 'ready', partOfSpeech: 'adjective', translation: { ru: 'готовый', uk: 'готовий', es: 'listo' }, example: 'I\'m ready to go.' },
  ],
};

export const MITAP_DAY_6: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 6,
  topic: { ru: 'Подождать остальных участников', uk: 'Зачекати на решту учасників', es: 'Esperar al resto de participantes' },
  outcome: {
    ru: 'Ты сможешь спросить, все ли на связи, и предложить подождать остальных перед началом встречи.',
    uk: 'Ти зможеш запитати, чи всі на зв\'язку, і запропонувати зачекати на решту перед початком зустрічі.',
    es: 'Podrás preguntar si están todos y proponer esperar al resto antes de empezar la reunión.',
  },
  level: 'A1',
  prerequisiteLessons: [3, 5],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Спроси: все на месте?', uk: 'Запитай: чи всі на місці?', es: 'Pregunta: ¿están todos?' },
      body: {
        ru: 'Перед стартом встречи проверь, кто на связи. Фраза Are we all here? значит все на месте. Просто и понятно всем.',
        uk: 'Перед стартом зустрічі перевір, хто на зв\'язку. Фраза Are we all here? означає чи всі на місці. Просто і зрозуміло всім.',
        es: 'Antes de empezar, comprueba quién está. La frase Are we all here? significa están todos. Es simple y claro.',
      },
      examples: [
        { en: 'Are we all here?', gloss: { ru: 'Мы все на месте?', uk: 'Ми всі на місці?', es: '¿Estamos todos?' } },
        { en: 'I wait for the others.', gloss: { ru: 'Я жду остальных.', uk: 'Я чекаю на інших.', es: 'Espero a los demás.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Предложи подождать', uk: 'Запропонуй зачекати', es: 'Propón esperar' },
      body: {
        ru: 'Если кого-то нет, скажи We wait. Это значит мы ждём. Спокойная фраза, чтобы не начинать без людей.',
        uk: 'Якщо когось немає, скажи We wait. Це означає ми чекаємо. Спокійна фраза, щоб не починати без людей.',
        es: 'Si falta alguien, di We wait. Significa esperamos. Una frase tranquila para no empezar sin gente.',
      },
      examples: [
        { en: 'We wait two minutes.', gloss: { ru: 'Мы ждём две минуты.', uk: 'Ми чекаємо дві хвилини.', es: 'Esperamos dos minutos.' } },
        { en: 'Tom is not here.', gloss: { ru: 'Тома нет на месте.', uk: 'Тома немає на місці.', es: 'Tom no está aquí.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Спроси про конкретного человека', uk: 'Запитай про конкретну людину', es: 'Pregunta por una persona' },
      body: {
        ru: 'Хочешь узнать про кого-то? Спроси Where is Tom? Это значит где Том. Так ты ищешь нужного человека.',
        uk: 'Хочеш дізнатися про когось? Запитай Where is Tom? Це означає де Том. Так ти шукаєш потрібну людину.',
        es: '¿Quieres saber de alguien? Pregunta Where is Tom? Significa dónde está Tom. Así buscas a la persona.',
      },
      examples: [
        { en: 'Where is Tom now?', gloss: { ru: 'Где Том сейчас?', uk: 'Де Том зараз?', es: '¿Dónde está Tom ahora?' } },
        { en: 'We wait for him.', gloss: { ru: 'Мы ждём его.', uk: 'Ми чекаємо на нього.', es: 'Lo esperamos a él.' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d6_p1',
      english: 'Are we all here?',
      meaning: { ru: 'Мы все на месте?', uk: 'Ми всі на місці?', es: '¿Estamos todos?' },
      constructions: ['present-simple-questions'],
      explanation: {
        title: { ru: 'Спрашиваем: все ли тут', uk: 'Питаємо: чи всі тут', es: 'Preguntamos: ¿están todos?' },
        rule: { ru: 'Слово here значит тут, на месте. All значит все. Вместе: все на месте?', uk: 'Слово here значить тут, на місці. All значить всі. Разом: чи всі на місці?', es: 'La palabra here significa aquí. All significa todos. Juntas: ¿todos aquí?' },
        why: { ru: 'Это первый вопрос встречи. Так ты проверяешь, можно ли начинать разговор.', uk: 'Це перше питання зустрічі. Так ти перевіряєш, чи можна починати розмову.', es: 'Es la primera pregunta. Así compruebas si puedes empezar la charla.' },
        commonMistake: { ru: 'Не путай here (тут) и hear (слышать). Тут нужно here: все на месте.', uk: 'Не плутай here (тут) і hear (чути). Тут потрібне here: всі на місці.', es: 'No confundas here (aquí) con hear (oír). Aquí va here: todos aquí.' },
      },
      words: [
        { text: 'Are', partOfSpeech: 'to-be', distractors: ['Is', 'Am', 'Was', 'Were', 'Be'] },
        { text: 'we', partOfSpeech: 'pronoun', distractors: ['they', 'you', 'he', 'she', 'it'] },
        { text: 'all', partOfSpeech: 'determiner', distractors: ['some', 'each', 'any', 'every', 'no'] },
        { text: 'here', partOfSpeech: 'adverb', distractors: ['now', 'soon', 'today', 'tomorrow', 'yesterday'] },
      ],
    },
    {
      id: 'mitap_d6_p2',
      english: 'I wait for the others.',
      meaning: { ru: 'Я жду остальных.', uk: 'Я чекаю на інших.', es: 'Espero a los demás.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'Говорим: я жду', uk: 'Кажемо: я чекаю', es: 'Decimos: yo espero' },
        rule: { ru: 'Слово wait значит ждать. Others значит остальные люди. Вместе: жду остальных.', uk: 'Слово wait значить чекати. Others значить інші люди. Разом: чекаю інших.', es: 'La palabra wait significa esperar. Others significa los demás. Juntas: espero a los demás.' },
        why: { ru: 'Так ты говоришь команде, что не начинаешь без людей. Спокойно и вежливо.', uk: 'Так ти кажеш команді, що не починаєш без людей. Спокійно і ввічливо.', es: 'Así dices al equipo que no empiezas sin gente. Tranquilo y amable.' },
        commonMistake: { ru: 'После wait нужно for: wait for the others. Без for звучит неверно.', uk: 'Після wait потрібне for: wait for the others. Без for звучить неправильно.', es: 'Tras wait va for: wait for the others. Sin for suena mal.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'wait', partOfSpeech: 'verb', distractors: ['work', 'look', 'stay', 'call', 'ask'] },
        { text: 'for', partOfSpeech: 'preposition', distractors: ['with', 'at', 'on', 'by', 'to'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'that', 'my'] },
        { text: 'others', partOfSpeech: 'noun', distractors: ['people', 'names', 'faces', 'seats', 'desks'] },
      ],
    },
    {
      id: 'mitap_d6_p3',
      english: 'Tom is not here yet.',
      meaning: { ru: 'Тома ещё нет на месте.', uk: 'Тома ще немає на місці.', es: 'Tom no está aquí todavía.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'Говорим: его ещё нет', uk: 'Кажемо: його ще немає', es: 'Decimos: aún no está' },
        rule: { ru: 'Слово yet значит ещё, пока что. Not here yet значит пока не на месте.', uk: 'Слово yet значить ще, поки що. Not here yet значить поки не на місці.', es: 'La palabra yet significa todavía. Not here yet significa aún no está.' },
        why: { ru: 'Так ты называешь, кого ждёте. Команда понимает, почему встреча не идёт.', uk: 'Так ти називаєш, кого чекаєте. Команда розуміє, чому зустріч не йде.', es: 'Así dices a quién esperan. El equipo entiende por qué no empieza.' },
        commonMistake: { ru: 'Yet ставь в конце: not here yet. В начало его не двигай.', uk: 'Yet став у кінці: not here yet. На початок його не став.', es: 'Yet va al final: not here yet. No lo pongas al inicio.' },
      },
      words: [
        { text: 'Tom', partOfSpeech: 'noun', distractors: ['Anna', 'Kate', 'Mark', 'Lisa', 'Paul'] },
        { text: 'is', partOfSpeech: 'to-be', distractors: ['are', 'am', 'was', 'were', 'be'] },
        { text: 'not', partOfSpeech: 'adverb', distractors: ['no', 'never', 'none', 'nor', 'nothing'] },
        { text: 'here', partOfSpeech: 'adverb', distractors: ['now', 'soon', 'today', 'late', 'early'] },
        { text: 'yet', partOfSpeech: 'adverb', distractors: ['still', 'again', 'also', 'too', 'once'] },
      ],
    },
    {
      id: 'mitap_d6_p4',
      english: 'We wait two minutes for him.',
      meaning: { ru: 'Мы ждём его две минуты.', uk: 'Ми чекаємо на нього дві хвилини.', es: 'Lo esperamos a él dos minutos.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'Говорим: ждём пару минут', uk: 'Кажемо: чекаємо пару хвилин', es: 'Decimos: esperamos un poco' },
        rule: { ru: 'Слово minutes значит минуты. Two minutes значит две минуты. Короткое время ожидания.', uk: 'Слово minutes значить хвилини. Two minutes значить дві хвилини. Короткий час чекання.', es: 'La palabra minutes significa minutos. Two minutes significa dos minutos. Poco tiempo.' },
        why: { ru: 'Так ты называешь, сколько ждать. Команде ясно, что встреча скоро начнётся.', uk: 'Так ти кажеш, скільки чекати. Команді ясно, що зустріч скоро почнеться.', es: 'Así dices cuánto esperar. Al equipo le queda claro que empieza pronto.' },
        commonMistake: { ru: 'После цифры два слово во множественном: two minutes. Не говори two minute.', uk: 'Після цифри два слово у множині: two minutes. Не кажи two minute.', es: 'Tras dos va plural: two minutes. No digas two minute.' },
      },
      words: [
        { text: 'We', partOfSpeech: 'pronoun', distractors: ['They', 'You', 'He', 'She', 'It'] },
        { text: 'wait', partOfSpeech: 'verb', distractors: ['work', 'look', 'stay', 'call', 'ask'] },
        { text: 'two', partOfSpeech: 'determiner', distractors: ['five', 'six', 'nine', 'ten', 'four'] },
        { text: 'minutes', partOfSpeech: 'noun', distractors: ['hours', 'days', 'weeks', 'calls', 'tasks'] },
        { text: 'for', partOfSpeech: 'preposition', distractors: ['with', 'at', 'on', 'by', 'to'] },
        { text: 'him', partOfSpeech: 'pronoun', distractors: ['her', 'them', 'us', 'me', 'you'] },
      ],
    },
    {
      id: 'mitap_d6_p5',
      english: 'Where is the last person?',
      meaning: { ru: 'Где последний человек?', uk: 'Де остання людина?', es: '¿Dónde está la última persona?' },
      constructions: ['wh-questions'],
      explanation: {
        title: { ru: 'Спрашиваем: где он', uk: 'Питаємо: де він', es: 'Preguntamos: ¿dónde está?' },
        rule: { ru: 'Слово where значит где. Last person значит последний человек. Вместе: где он.', uk: 'Слово where значить де. Last person значить остання людина. Разом: де він.', es: 'La palabra where significa dónde. Last person significa última persona.' },
        why: { ru: 'Так ты узнаёшь, кого ещё ждать. Помогает понять, можно ли начинать.', uk: 'Так ти дізнаєшся, кого ще чекати. Допомагає зрозуміти, чи можна починати.', es: 'Así sabes a quién falta. Ayuda a ver si puedes empezar.' },
        commonMistake: { ru: 'После where ставь is: where is. Не говори where the person is тут.', uk: 'Після where став is: where is. Не кажи where the person is тут.', es: 'Tras where va is: where is. No digas where the person is aquí.' },
      },
      words: [
        { text: 'Where', partOfSpeech: 'adverb', distractors: ['When', 'Why', 'How', 'Who', 'What'] },
        { text: 'is', partOfSpeech: 'to-be', distractors: ['are', 'am', 'was', 'were', 'be'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'that', 'my'] },
        { text: 'last', partOfSpeech: 'determiner', distractors: ['next', 'first', 'other', 'same', 'whole'] },
        { text: 'person', partOfSpeech: 'noun', distractors: ['team', 'group', 'name', 'face', 'voice'] },
      ],
    },
    {
      id: 'mitap_d6_p6',
      english: 'We start the meeting now.',
      meaning: { ru: 'Мы начинаем встречу сейчас.', uk: 'Ми починаємо зустріч зараз.', es: 'Empezamos la reunión ahora.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'Говорим: начинаем сейчас', uk: 'Кажемо: починаємо зараз', es: 'Decimos: empezamos ya' },
        rule: { ru: 'Слово start значит начинать. Meeting значит встреча. Вместе: начинаем встречу.', uk: 'Слово start значить починати. Meeting значить зустріч. Разом: починаємо зустріч.', es: 'La palabra start significa empezar. Meeting significa reunión. Juntas: empezamos la reunión.' },
        why: { ru: 'Когда все на месте, скажи это. Так ты вежливо запускаешь встречу.', uk: 'Коли всі на місці, скажи це. Так ти ввічливо запускаєш зустріч.', es: 'Cuando están todos, di esto. Así abres la reunión con calma.' },
        commonMistake: { ru: 'Слово now ставь в конце: start now. В начало его не двигай.', uk: 'Слово now став у кінці: start now. На початок його не став.', es: 'Now va al final: start now. No lo pongas al inicio.' },
      },
      words: [
        { text: 'We', partOfSpeech: 'pronoun', distractors: ['They', 'You', 'He', 'She', 'It'] },
        { text: 'start', partOfSpeech: 'verb', distractors: ['join', 'plan', 'check', 'share', 'read'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'that', 'my'] },
        { text: 'meeting', partOfSpeech: 'noun', distractors: ['report', 'email', 'screen', 'folder', 'button'] },
        { text: 'now', partOfSpeech: 'adverb', distractors: ['soon', 'today', 'late', 'early', 'again'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'here', partOfSpeech: 'adverb', translation: { ru: 'тут, на месте', uk: 'тут, на місці', es: 'aquí' }, example: 'Are we all here?' },
    { word: 'wait', partOfSpeech: 'verb', translation: { ru: 'ждать', uk: 'чекати', es: 'esperar' }, example: 'I wait for the others.' },
    { word: 'yet', partOfSpeech: 'adverb', translation: { ru: 'ещё, пока что', uk: 'ще, поки що', es: 'todavía' }, example: 'Tom is not here yet.' },
    { word: 'minutes', partOfSpeech: 'noun', translation: { ru: 'минуты', uk: 'хвилини', es: 'minutos' }, example: 'We wait two minutes for him.' },
    { word: 'where', partOfSpeech: 'adverb', translation: { ru: 'где', uk: 'де', es: 'dónde' }, example: 'Where is the last person?' },
    { word: 'meeting', partOfSpeech: 'noun', translation: { ru: 'встреча', uk: 'зустріч', es: 'reunión' }, example: 'We start the meeting now.' },
  ],
};

export const MITAP_DAY_7: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 7,
  topic: { ru: 'Повторение недели 1: захожу на первый созвон', uk: 'Повторення тижня 1: заходжу на перший дзвінок', es: 'Repaso de la semana 1: entro a mi primera llamada' },
  outcome: {
    ru: 'Сможешь зайти на первый созвон: поздороваться, проверить звук, спросить кто здесь и извиниться за опоздание.',
    uk: 'Зможеш зайти на перший дзвінок: привітатися, перевірити звук, спитати хто тут і вибачитися за запізнення.',
    es: 'Podrás entrar a tu primera llamada: saludar, revisar el sonido, preguntar quién está y disculparte por llegar tarde.',
  },
  level: 'A1',
  prerequisiteLessons: [1, 3, 6],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Что повторяем сегодня', uk: 'Що повторюємо сьогодні', es: 'Qué repasamos hoy' },
      body: {
        ru: 'Сегодня собираем всю неделю в один заход на созвон: «привет», проверка звука, «кто тут?» и «извини, опоздал». Всё уже знакомо.',
        uk: 'Сьогодні збираємо весь тиждень в один захід на дзвінок: «привіт», перевірка звуку, «хто тут?» і «вибач, запізнився». Усе вже знайоме.',
        es: 'Hoy juntamos toda la semana en una sola llamada: «hola», revisar el sonido, «¿quién está?» y «perdón, llegué tarde». Todo ya conocido.',
      },
      examples: [
        { en: 'Can you hear me?', gloss: { ru: 'Ты меня слышишь?', uk: 'Ти мене чуєш?', es: '¿Me oyes?' } },
        { en: 'Sorry, I\'m late.', gloss: { ru: 'Извини, я опоздал.', uk: 'Вибач, я запізнився.', es: 'Perdón, llego tarde.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Маленькие слова-помощники', uk: 'Маленькі слова-помічники', es: 'Pequeñas palabras de ayuda' },
      body: {
        ru: 'Два кита недели: am/is (это как «=») и who («кто»). С ними ты говоришь «я тут» и спрашиваешь «кто на созвоне».',
        uk: 'Два кити тижня: am/is (це як «=») і who («хто»). З ними ти кажеш «я тут» і питаєш «хто на дзвінку».',
        es: 'Dos claves de la semana: am/is (como un «=») y who («quién»). Con ellas dices «estoy aquí» y preguntas «quién está en la llamada».',
      },
      examples: [
        { en: 'I\'m here.', gloss: { ru: 'Я на месте.', uk: 'Я на місці.', es: 'Estoy aquí.' } },
        { en: 'Who is on the call?', gloss: { ru: 'Кто на созвоне?', uk: 'Хто на дзвінку?', es: '¿Quién está en la llamada?' } },
      ],
    },
    {
      kind: 'tip',
      title: { ru: 'Один совет для созвона', uk: 'Одна порада для дзвінка', es: 'Un consejo para la llamada' },
      body: {
        ru: 'Не молчи в начале. Скажи «I\'m here» сразу — и команда знает, что ты подключился. Короткой фразы достаточно.',
        uk: 'Не мовчи на початку. Скажи «I\'m here» одразу — і команда знає, що ти підключився. Короткої фрази досить.',
        es: 'No te quedes callado al inicio. Di «I\'m here» enseguida y el equipo sabe que entraste. Una frase corta basta.',
      },
    },
  ],
  phrases: [
    {
      id: 'mitap_d7_p1',
      english: 'Hi, I\'m here.',
      meaning: { ru: 'Привет, я на месте.', uk: 'Привіт, я на місці.', es: 'Hola, estoy aquí.' },
      constructions: ['to-be'],
      explanation: {
        title: { ru: 'Словечко I\'m', uk: 'Слівце I\'m', es: 'La palabra I\'m' },
        rule: { ru: 'I\'m — это «я есть». here = «тут», I\'m here = «я тут».', uk: 'I\'m — це «я є». here = «тут», I\'m here = «я тут».', es: 'I\'m es «yo estoy». here = «aquí», I\'m here = «estoy aquí».' },
        why: { ru: 'I am почти всегда сжимают до I\'m — так говорят на созвонах. Смысл тот же.', uk: 'I am майже завжди стискають до I\'m — так кажуть на дзвінках. Зміст той самий.', es: 'I am casi siempre se acorta a I\'m, así se habla en las llamadas. El sentido es el mismo.' },
        commonMistake: { ru: 'Не теряй I\'m: говори I\'m here, а не просто here — иначе фраза неполная.', uk: 'Не губи I\'m: кажи I\'m here, а не просто here — інакше фраза неповна.', es: 'No pierdas I\'m: di I\'m here, no solo here; si no, la frase queda coja.' },
      },
      words: [
        { text: 'Hi', partOfSpeech: 'other', distractors: ['Hey', 'Hello', 'Yo', 'Hiya', 'Howdy'] },
        { text: 'I\'m', partOfSpeech: 'to-be', distractors: ['You\'re', 'He\'s', 'We\'re', 'It\'s', 'She\'s'] },
        { text: 'here', partOfSpeech: 'adverb', distractors: ['under', 'outside', 'inside', 'upstairs', 'nearby'] },
      ],
    },
    {
      id: 'mitap_d7_p2',
      english: 'Can you hear me?',
      meaning: { ru: 'Ты меня слышишь?', uk: 'Ти мене чуєш?', es: '¿Me oyes?' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'Вопрос с can', uk: 'Питання з can', es: 'Pregunta con can' },
        rule: { ru: 'hear = «слышать». Ставишь can вперёд — и это вопрос: «можешь слышать меня?»', uk: 'hear = «чути». Ставиш can вперед — і це питання: «можеш чути мене?»', es: 'hear = «oír». Pones can delante y es pregunta: «¿puedes oírme?»' },
        why: { ru: 'Так на созвоне сразу проверяют звук. Короткий вопрос — и ясно, всё ли в порядке.', uk: 'Так на дзвінку одразу перевіряють звук. Коротке питання — і ясно, чи все гаразд.', es: 'Así se revisa el sonido al instante. Una pregunta corta y queda claro si todo va bien.' },
        commonMistake: { ru: 'После can — простое hear, не hearing: говори can you hear, а не can you hearing.', uk: 'Після can — просте hear, не hearing: кажи can you hear, а не can you hearing.', es: 'Tras can va hear simple, no hearing: di can you hear, no can you hearing.' },
      },
      words: [
        { text: 'Can', partOfSpeech: 'modal', distractors: ['Could', 'Will', 'Should', 'Would', 'May'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['we', 'they', 'he', 'she', 'it'] },
        { text: 'hear', partOfSpeech: 'verb', distractors: ['feel', 'eat', 'walk', 'draw', 'cook'] },
        { text: 'me', partOfSpeech: 'pronoun', distractors: ['him', 'her', 'us', 'them', 'it'] },
      ],
    },
    {
      id: 'mitap_d7_p3',
      english: 'Who is on the call?',
      meaning: { ru: 'Кто на созвоне?', uk: 'Хто на дзвінку?', es: '¿Quién está en la llamada?' },
      constructions: ['wh-questions', 'to-be'],
      explanation: {
        title: { ru: 'Вопрос со словом who', uk: 'Питання зі словом who', es: 'Pregunta con who' },
        rule: { ru: 'who = «кто». is = «есть». Who is on the call = «кто есть на созвоне».', uk: 'who = «хто». is = «є». Who is on the call = «хто є на дзвінку».', es: 'who = «quién». is = «está». Who is on the call = «quién está en la llamada».' },
        why: { ru: 'Слово-вопрос who всегда идёт первым. За ним сразу is — и вопрос готов.', uk: 'Слово-питання who завжди йде першим. За ним одразу is — і питання готове.', es: 'La palabra who siempre va primero. Tras ella va is y la pregunta está lista.' },
        commonMistake: { ru: 'Не теряй is: говори who is on the call, а не who on the call.', uk: 'Не губи is: кажи who is on the call, а не who on the call.', es: 'No pierdas is: di who is on the call, no who on the call.' },
      },
      words: [
        { text: 'Who', partOfSpeech: 'pronoun', distractors: ['What', 'Where', 'When', 'Why', 'How'] },
        { text: 'is', partOfSpeech: 'to-be', distractors: ['are', 'am', 'was', 'be', 'were'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['in', 'at', 'by', 'with', 'for'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'that', 'my'] },
        { text: 'call', partOfSpeech: 'noun', distractors: ['meeting', 'screen', 'chat', 'room', 'team'] },
      ],
    },
    {
      id: 'mitap_d7_p4',
      english: 'Sorry, I\'m late.',
      meaning: { ru: 'Извини, я опоздал.', uk: 'Вибач, я запізнився.', es: 'Perdón, llego tarde.' },
      constructions: ['to-be'],
      explanation: {
        title: { ru: 'I\'m late на созвоне', uk: 'I\'m late на дзвінку', es: 'I\'m late en la llamada' },
        rule: { ru: 'late = «поздно, опоздавший». I\'m late = «я опоздал». Sorry впереди — это «извини».', uk: 'late = «пізно, той, хто запізнився». I\'m late = «я запізнився». Sorry попереду — це «вибач».', es: 'late = «tarde». I\'m late = «llego tarde». Sorry delante es «perdón».' },
        why: { ru: 'Одно sorry плюс I\'m late — и ты вежливо объяснил опоздание. Длинных слов не нужно.', uk: 'Одне sorry плюс I\'m late — і ти ввічливо пояснив запізнення. Довгих слів не треба.', es: 'Un sorry más I\'m late y ya explicas tu tardanza con cortesía. No hacen falta palabras largas.' },
        commonMistake: { ru: 'Не говори I late: нужно I\'m late, маленькое I\'m держит фразу вместе.', uk: 'Не кажи I late: треба I\'m late, маленьке I\'m тримає фразу разом.', es: 'No digas I late: hace falta I\'m late; el pequeño I\'m sostiene la frase.' },
      },
      words: [
        { text: 'Sorry', partOfSpeech: 'other', distractors: ['Please', 'Thanks', 'Hello', 'Okay', 'Hi'] },
        { text: 'I\'m', partOfSpeech: 'to-be', distractors: ['You\'re', 'He\'s', 'We\'re', 'It\'s', 'She\'s'] },
        { text: 'late', partOfSpeech: 'adjective', distractors: ['busy', 'tired', 'ready', 'new', 'slow'] },
      ],
    },
    {
      id: 'mitap_d7_p5',
      english: 'Are we all here?',
      meaning: { ru: 'Мы все на месте?', uk: 'Ми всі на місці?', es: '¿Estamos todos aquí?' },
      constructions: ['to-be'],
      explanation: {
        title: { ru: 'Вопрос с Are we', uk: 'Питання з Are we', es: 'Pregunta con Are we' },
        rule: { ru: 'are = «есть» для we. Ставишь are вперёд — вопрос: «мы все тут?»', uk: 'are = «є» для we. Ставиш are вперед — питання: «ми всі тут?»', es: 'are = «estamos» para we. Pones are delante y es pregunta: «¿estamos todos aquí?»' },
        why: { ru: 'all («все») стоит после we. Так ты проверяешь, можно ли начинать созвон.', uk: 'all («всі») стоїть після we. Так ти перевіряєш, чи можна починати дзвінок.', es: 'all («todos») va después de we. Así compruebas si ya se puede empezar la llamada.' },
        commonMistake: { ru: 'В вопросе are идёт первым: говори are we all here, а не we are all here.', uk: 'У питанні are йде першим: кажи are we all here, а не we are all here.', es: 'En la pregunta are va primero: di are we all here, no we are all here.' },
      },
      words: [
        { text: 'Are', partOfSpeech: 'to-be', distractors: ['Is', 'Am', 'Was', 'Were', 'Be'] },
        { text: 'we', partOfSpeech: 'pronoun', distractors: ['they', 'you', 'he', 'she', 'it'] },
        { text: 'all', partOfSpeech: 'determiner', distractors: ['both', 'each', 'some', 'many', 'few'] },
        { text: 'here', partOfSpeech: 'adverb', distractors: ['under', 'outside', 'inside', 'upstairs', 'nearby'] },
      ],
    },
    {
      id: 'mitap_d7_p6',
      english: 'Who do we wait for?',
      meaning: { ru: 'Кого мы ждём?', uk: 'Кого ми чекаємо?', es: '¿A quién esperamos?' },
      constructions: ['wh-questions', 'present-simple'],
      explanation: {
        title: { ru: 'Вопрос с do', uk: 'Питання з do', es: 'Pregunta con do' },
        rule: { ru: 'wait for = «ждать кого-то». who впереди + do we — вопрос «кого мы ждём».', uk: 'wait for = «чекати когось». who попереду + do we — питання «кого ми чекаємо».', es: 'wait for = «esperar a alguien». who delante + do we = «¿a quién esperamos?»' },
        why: { ru: 'Маленькое do помогает задать вопрос. После него — простое wait, без окончаний.', uk: 'Маленьке do допомагає поставити питання. Після нього — просте wait, без закінчень.', es: 'El pequeño do ayuda a hacer la pregunta. Tras él va wait simple, sin terminaciones.' },
        commonMistake: { ru: 'Не теряй do: говори who do we wait for, а не who we wait for.', uk: 'Не губи do: кажи who do we wait for, а не who we wait for.', es: 'No pierdas do: di who do we wait for, no who we wait for.' },
      },
      words: [
        { text: 'Who', partOfSpeech: 'pronoun', distractors: ['What', 'Where', 'When', 'Why', 'How'] },
        { text: 'do', partOfSpeech: 'verb', distractors: ['did', 'does', 'can', 'will', 'should'] },
        { text: 'we', partOfSpeech: 'pronoun', distractors: ['they', 'you', 'he', 'she', 'it'] },
        { text: 'wait', partOfSpeech: 'verb', distractors: ['eat', 'cook', 'sleep', 'drive', 'sing'] },
        { text: 'for', partOfSpeech: 'preposition', distractors: ['at', 'on', 'to', 'with', 'by'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'here', partOfSpeech: 'adverb', translation: { ru: 'тут, на месте', uk: 'тут, на місці', es: 'aquí' }, example: 'Hi, I\'m here.' },
    { word: 'hear', partOfSpeech: 'verb', translation: { ru: 'слышать', uk: 'чути', es: 'oír' }, example: 'Can you hear me?' },
    { word: 'call', partOfSpeech: 'noun', translation: { ru: 'созвон, звонок', uk: 'дзвінок', es: 'llamada' }, example: 'Who is on the call?' },
    { word: 'late', partOfSpeech: 'adjective', translation: { ru: 'опоздавший, поздно', uk: 'той, хто запізнився', es: 'tarde' }, example: 'Sorry, I\'m late.' },
    { word: 'all', partOfSpeech: 'determiner', translation: { ru: 'все', uk: 'всі', es: 'todos' }, example: 'Are we all here?' },
    { word: 'wait', partOfSpeech: 'verb', translation: { ru: 'ждать', uk: 'чекати', es: 'esperar' }, example: 'Who do we wait for?' },
  ],
};

export const MITAP_DAY_8: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 8,
  topic: { ru: 'Представиться команде: роль и стаж', uk: 'Представитися команді: роль і стаж', es: 'Presentarte al equipo: rol y experiencia' },
  outcome: {
    ru: 'Ты сможешь коротко рассказать о себе на созвоне: имя, какая твоя команда и сколько лет ты тут работаешь.',
    uk: 'Ти зможеш коротко розповісти про себе на дзвінку: ім\'я, яка твоя команда і скільки років ти тут працюєш.',
    es: 'Podrás presentarte en una reunión: tu nombre, en qué equipo estás y cuántos años llevas aquí.',
  },
  level: 'A2',
  prerequisiteLessons: [3, 7],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Скажи, в какой ты команде', uk: 'Скажи, у якій ти команді', es: 'Di en qué equipo estás' },
      body: {
        ru: 'Чтобы сказать, где ты работаешь, бери I\'m on the ... team. Слово on тут значит «я часть этой команды». Просто и понятно для всех на созвоне.',
        uk: 'Щоб сказати, де ти працюєш, бери I\'m on the ... team. Слово on тут значить «я частина цієї команди». Просто й зрозуміло для всіх на дзвінку.',
        es: 'Para decir dónde trabajas, usa I\'m on the ... team. Aquí on significa «soy parte de ese equipo». Claro para todos en la reunión.',
      },
      examples: [
        { en: 'I\'m on the design team.', gloss: { ru: 'Я в команде дизайна.', uk: 'Я в команді дизайну.', es: 'Estoy en el equipo de diseño.' } },
        { en: 'I\'m on the support team.', gloss: { ru: 'Я в команде поддержки.', uk: 'Я в команді підтримки.', es: 'Estoy en el equipo de soporte.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Скажи свой стаж через have', uk: 'Скажи свій стаж через have', es: 'Di tu experiencia con have' },
      body: {
        ru: 'Сколько ты тут работаешь? Говори I have two years here. Дословно «у меня два года тут». Меняй число — и фраза подходит каждому.',
        uk: 'Скільки ти тут працюєш? Кажи I have two years here. Дослівно «у мене два роки тут». Зміни число — і фраза підходить кожному.',
        es: '¿Cuánto tiempo llevas aquí? Di I have two years here. Literal «tengo dos años aquí». Cambia el número y sirve para todos.',
      },
      examples: [
        { en: 'I have two years here.', gloss: { ru: 'Я тут уже два года.', uk: 'Я тут уже два роки.', es: 'Llevo dos años aquí.' } },
        { en: 'I have one year here.', gloss: { ru: 'Я тут уже один год.', uk: 'Я тут уже один рік.', es: 'Llevo un año aquí.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Чем ты занимаешься', uk: 'Чим ти займаєшся', es: 'De qué te ocupas' },
      body: {
        ru: 'Расскажи о работе через I work. Например I work with the new clients. Слово work не меняется, когда говоришь о себе — просто work.',
        uk: 'Розкажи про роботу через I work. Наприклад I work with the new clients. Слово work не змінюється, коли говориш про себе — просто work.',
        es: 'Cuenta tu trabajo con I work. Por ejemplo I work with the new clients. La palabra work no cambia cuándo hablas de ti — solo work.',
      },
      examples: [
        { en: 'I work with the new clients.', gloss: { ru: 'Я работаю с новыми клиентами.', uk: 'Я працюю з новими клієнтами.', es: 'Trabajo con los clientes nuevos.' } },
        { en: 'I help the design team.', gloss: { ru: 'Я помогаю команде дизайна.', uk: 'Я допомагаю команді дизайну.', es: 'Ayudo al equipo de diseño.' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d8_p1',
      english: 'Hi everyone, I\'m Anna.',
      meaning: { ru: 'Привет всем, я Анна.', uk: 'Привіт усім, я Анна.', es: 'Hola a todos, soy Anna.' },
      constructions: ['to-be'],
      explanation: {
        title: { ru: 'I\'m — это «я есть»', uk: 'I\'m — це «я є»', es: 'I\'m es «yo soy»' },
        rule: { ru: 'I\'m — короткий способ сказать «я есть, я зовусь». I\'m Anna значит «я Анна».', uk: 'I\'m — короткий спосіб сказати «я є, мене звати». I\'m Anna значить «я Анна».', es: 'I\'m es la forma corta de «yo soy». I\'m Anna significa «soy Anna».' },
        why: { ru: 'Так ты называешь своё имя в начале созвона — быстро и дружелюбно.', uk: 'Так ти називаєш своє ім\'я на початку дзвінка — швидко й привітно.', es: 'Así dices tu nombre al inicio de la reunión: rápido y amable.' },
        commonMistake: { ru: 'Не говори I Anna. Нужно I\'m Anna — маленькое \'m обязательно.', uk: 'Не кажи I Anna. Потрібно I\'m Anna — маленьке \'m обов\'язкове.', es: 'No digas I Anna. Hay qué decir I\'m Anna — el \'m es obligatorio.' },
      },
      words: [
        { text: 'Hi', partOfSpeech: 'other', distractors: ['Bye', 'Yes', 'Please', 'Okay', 'Sorry'] },
        { text: 'everyone', partOfSpeech: 'pronoun', distractors: ['nobody', 'someone', 'anyone', 'myself', 'yourself'] },
        { text: 'I\'m', partOfSpeech: 'to-be', distractors: ['is', 'are', 'was', 'were', 'be'] },
        { text: 'Anna', partOfSpeech: 'noun', distractors: ['team', 'name', 'year', 'client', 'office'] },
      ],
    },
    {
      id: 'mitap_d8_p2',
      english: 'I\'m on the design team.',
      meaning: { ru: 'Я в команде дизайна.', uk: 'Я в команді дизайну.', es: 'Estoy en el equipo de diseño.' },
      constructions: ['to-be'],
      explanation: {
        title: { ru: 'on the ... team — «в команде»', uk: 'on the ... team — «у команді»', es: 'on the ... team — «en el equipo»' },
        rule: { ru: 'on the ... team значит «я часть этой команды». design team — команда дизайна.', uk: 'on the ... team значить «я частина цієї команди». design team — команда дизайну.', es: 'on the ... team significa «soy parte de ese equipo». design team — equipo de diseño.' },
        why: { ru: 'Так коллеги сразу понимают, чем ты занят и к кому идти по дизайну.', uk: 'Так колеги одразу розуміють, чим ти зайнятий і до кого йти щодо дизайну.', es: 'Así los colegas saben qué haces y a quién acudir por diseño.' },
        commonMistake: { ru: 'Не говори in the team. Тут нужно on the team — слово on.', uk: 'Не кажи in the team. Тут потрібно on the team — слово on.', es: 'No digas in the team. Aquí se usa on the team — la palabra on.' },
      },
      words: [
        { text: 'I\'m', partOfSpeech: 'to-be', distractors: ['is', 'are', 'was', 'were', 'be'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['at', 'to', 'by', 'for', 'of'] },
        { text: 'the', partOfSpeech: 'determiner', distractors: ['a', 'my', 'this', 'some', 'any'] },
        { text: 'design', partOfSpeech: 'noun', distractors: ['music', 'kitchen', 'travel', 'window', 'garden'] },
        { text: 'team', partOfSpeech: 'noun', distractors: ['year', 'client', 'name', 'office', 'phone'] },
      ],
    },
    {
      id: 'mitap_d8_p3',
      english: 'I have two years here.',
      meaning: { ru: 'Я тут уже два года.', uk: 'Я тут уже два роки.', es: 'Tengo dos años aquí.' },
      constructions: ['to-have'],
      explanation: {
        title: { ru: 'I have ... years — твой стаж', uk: 'I have ... years — твій стаж', es: 'I have ... years — tu experiencia' },
        rule: { ru: 'I have two years here дословно «у меня два года тут». Так говорят про стаж.', uk: 'I have two years here дослівно «у мене два роки тут». Так кажуть про стаж.', es: 'I have two years here literal «tengo dos años aquí». Así se dice la experiencia.' },
        why: { ru: 'Команде полезно знать, давно ли ты тут — это говорит о твоём опыте.', uk: 'Команді корисно знати, чи давно ти тут — це говорить про твій досвід.', es: 'Al equipo le sirve saber cuánto llevas: muestra tu experiencia.' },
        commonMistake: { ru: 'Не говори I have two year. После двух нужно years — с буквой s.', uk: 'Не кажи I have two year. Після двох потрібно years — з літерою s.', es: 'No digas I have two year. Tras dos hace falta years — con s.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'you'] },
        { text: 'have', partOfSpeech: 'verb', distractors: ['want', 'make', 'take', 'give', 'find'] },
        { text: 'two', partOfSpeech: 'determiner', distractors: ['five', 'ten', 'nine', 'four', 'eight'] },
        { text: 'years', partOfSpeech: 'noun', distractors: ['teams', 'clients', 'names', 'offices', 'phones'] },
        { text: 'here', partOfSpeech: 'adverb', distractors: ['now', 'soon', 'again', 'always', 'never'] },
      ],
    },
    {
      id: 'mitap_d8_p4',
      english: 'I work with the new clients.',
      meaning: { ru: 'Я работаю с новыми клиентами.', uk: 'Я працюю з новими клієнтами.', es: 'Trabajo con los clientes nuevos.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'I work — что ты делаешь', uk: 'I work — що ти робиш', es: 'I work — qué haces' },
        rule: { ru: 'I work with значит «я работаю с». work не меняется, когда говоришь о себе.', uk: 'I work with значить «я працюю з». work не змінюється, коли говориш про себе.', es: 'I work with significa «trabajo con». work no cambia cuándo hablas de ti.' },
        why: { ru: 'Так ты в двух словах объясняешь, чем именно занят каждый день.', uk: 'Так ти у двох словах пояснюєш, чим саме зайнятий щодня.', es: 'Así explicas en pocas palabras de qué te ocupas cada día.' },
        commonMistake: { ru: 'Не говори I works. С I всегда просто work, без буквы s.', uk: 'Не кажи I works. З I завжди просто work, без літери s.', es: 'No digas I works. Con I siempre work, sin la s.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'you'] },
        { text: 'work', partOfSpeech: 'verb', distractors: ['sleep', 'run', 'cook', 'walk', 'drive'] },
        { text: 'with', partOfSpeech: 'preposition', distractors: ['from', 'about', 'under', 'near', 'into'] },
        { text: 'the', partOfSpeech: 'determiner', distractors: ['a', 'my', 'this', 'some', 'any'] },
        { text: 'new', partOfSpeech: 'adjective', distractors: ['happy', 'small', 'loud', 'quiet', 'clean'] },
        { text: 'clients', partOfSpeech: 'noun', distractors: ['years', 'teams', 'names', 'offices', 'phones'] },
      ],
    },
    {
      id: 'mitap_d8_p5',
      english: 'I have a small team here.',
      meaning: { ru: 'У меня тут небольшая команда.', uk: 'У мене тут невелика команда.', es: 'Tengo un equipo pequeño aquí.' },
      constructions: ['to-have'],
      explanation: {
        title: { ru: 'I have a ... — что у тебя есть', uk: 'I have a ... — що в тебе є', es: 'I have a ... — qué tienes' },
        rule: { ru: 'I have a small team значит «у меня небольшая команда». a — перед одной вещью.', uk: 'I have a small team значить «у мене невелика команда». a — перед однією річчю.', es: 'I have a small team significa «tengo un equipo pequeño». a va antes de una cosa.' },
        why: { ru: 'Так ты показываешь, что руководишь людьми или работаешь в группе.', uk: 'Так ти показуєш, що керуєш людьми або працюєш у групі.', es: 'Así muestras qué diriges gente o trabajas en grupo.' },
        commonMistake: { ru: 'Не говори I have small team. Перед одной командой нужно a.', uk: 'Не кажи I have small team. Перед однією командою потрібно a.', es: 'No digas I have small team. Antes de un equipo va a.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'you'] },
        { text: 'have', partOfSpeech: 'verb', distractors: ['want', 'make', 'take', 'give', 'find'] },
        { text: 'a', partOfSpeech: 'determiner', distractors: ['the', 'my', 'this', 'some', 'any'] },
        { text: 'small', partOfSpeech: 'adjective', distractors: ['new', 'happy', 'loud', 'clean', 'quiet'] },
        { text: 'team', partOfSpeech: 'noun', distractors: ['year', 'client', 'name', 'office', 'phone'] },
        { text: 'here', partOfSpeech: 'adverb', distractors: ['now', 'soon', 'again', 'always', 'never'] },
      ],
    },
    {
      id: 'mitap_d8_p6',
      english: 'I help the team every day.',
      meaning: { ru: 'Я помогаю команде каждый день.', uk: 'Я допомагаю команді щодня.', es: 'Ayudo al equipo cada día.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'every day — каждый день', uk: 'every day — щодня', es: 'every day — cada día' },
        rule: { ru: 'every day значит «каждый день». I help the team — «я помогаю команде».', uk: 'every day значить «щодня». I help the team — «я допомагаю команді».', es: 'every day significa «cada día». I help the team — «ayudo al equipo».' },
        why: { ru: 'Так ты показываешь, что твоя работа постоянна, а не разовая.', uk: 'Так ти показуєш, що твоя робота постійна, а не разова.', es: 'Así muestras qué tu trabajo es constante, no una sola vez.' },
        commonMistake: { ru: 'Не говори every days. Тут всегда every day, без буквы s.', uk: 'Не кажи every days. Тут завжди every day, без літери s.', es: 'No digas every days. Aquí siempre every day, sin la s.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'you'] },
        { text: 'help', partOfSpeech: 'verb', distractors: ['work', 'call', 'write', 'read', 'ask'] },
        { text: 'the', partOfSpeech: 'determiner', distractors: ['a', 'my', 'this', 'some', 'any'] },
        { text: 'team', partOfSpeech: 'noun', distractors: ['year', 'client', 'name', 'office', 'phone'] },
        { text: 'every', partOfSpeech: 'determiner', distractors: ['some', 'many', 'this', 'that', 'both'] },
        { text: 'day', partOfSpeech: 'noun', distractors: ['year', 'team', 'name', 'office', 'phone'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'everyone', partOfSpeech: 'pronoun', translation: { ru: 'все, всем', uk: 'усі, всім', es: 'todos' }, example: 'Hi everyone, I\'m Anna.' },
    { word: 'team', partOfSpeech: 'noun', translation: { ru: 'команда', uk: 'команда', es: 'equipo' }, example: 'I\'m on the design team.' },
    { word: 'years', partOfSpeech: 'noun', translation: { ru: 'годы', uk: 'роки', es: 'años' }, example: 'I have two years here.' },
    { word: 'clients', partOfSpeech: 'noun', translation: { ru: 'клиенты', uk: 'клієнти', es: 'clientes' }, example: 'I work with the new clients.' },
    { word: 'small', partOfSpeech: 'adjective', translation: { ru: 'небольшой, маленький', uk: 'невеликий, маленький', es: 'pequeño' }, example: 'I have a small team here.' },
    { word: 'help', partOfSpeech: 'verb', translation: { ru: 'помогать', uk: 'допомагати', es: 'ayudar' }, example: 'I help the team every day.' },
  ],
};

export const MITAP_DAY_9: PlanContentDay = {
  "planId": "mitap",
  "dayIndex": 9,
  "topic": {
    "ru": "Рассказать, чем именно занимаешься",
    "uk": "Розповісти, чим саме займаєшся",
    "es": "Contar de qué te ocupas exactamente"
  },
  "outcome": {
    "ru": "Ты сможешь на созвоне просто рассказать, чем занимаешься: над чем работаешь, за что отвечаешь и с кем работаешь в команде.",
    "uk": "Ти зможеш на дзвінку просто розповісти, чим займаєшся: над чим працюєш, за що відповідаєш і з ким працюєш у команді.",
    "es": "Podrás en una llamada contar de forma sencilla de qué te ocupas: en qué trabajas, de qué te encargas y con quién trabajas en el equipo."
  },
  "level": "A2",
  "prerequisiteLessons": [
    3,
    5
  ],
  "intro": [
    {
      "kind": "how",
      "title": {
        "ru": "Скажи, над чем работаешь",
        "uk": "Скажи, над чим працюєш",
        "es": "Di en qué trabajas"
      },
      "body": {
        "ru": "Когда тебя спрашивают про работу, начни с простого: I work on... и название проекта. Так ты сразу понятно говоришь, чем занимаешься каждый день.",
        "uk": "Коли тебе питають про роботу, почни з простого: I work on... і назва проєкту. Так ти одразу зрозуміло кажеш, чим займаєшся щодня.",
        "es": "Cuando te preguntan por tu trabajo, empieza simple: I work on... y el nombre del proyecto. Así dices claro de qué te ocupas cada día."
      },
      "examples": [
        {
          "en": "I work on the mobile app.",
          "gloss": {
            "ru": "Я работаю над мобильным приложением.",
            "uk": "Я працюю над мобільним застосунком.",
            "es": "Trabajo en la aplicación móvil."
          }
        },
        {
          "en": "I work with a small team.",
          "gloss": {
            "ru": "Я работаю с небольшой командой.",
            "uk": "Я працюю з невеликою командою.",
            "es": "Trabajo con un equipo pequeño."
          }
        }
      ]
    },
    {
      "kind": "how",
      "title": {
        "ru": "Скажи, за что отвечаешь",
        "uk": "Скажи, за що відповідаєш",
        "es": "Di de qué te encargas"
      },
      "body": {
        "ru": "Чтобы объяснить свою роль, скажи I do... и что именно ты делаешь. Простой глагол после I показывает твою каждодневную задачу на проекте.",
        "uk": "Щоб пояснити свою роль, скажи I do... і що саме ти робиш. Простий глагол після I показує твоє щоденне завдання на проєкті.",
        "es": "Para explicar tu rol, di I do... y qué haces exactamente. El verbo simple después de I muestra tu tarea diaria en el proyecto."
      },
      "examples": [
        {
          "en": "I do the design part.",
          "gloss": {
            "ru": "Я делаю часть с дизайном.",
            "uk": "Я роблю частину з дизайном.",
            "es": "Yo hago la parte del diseño."
          }
        },
        {
          "en": "I write the new code.",
          "gloss": {
            "ru": "Я пишу новый код.",
            "uk": "Я пишу новий код.",
            "es": "Yo escribo el código nuevo."
          }
        }
      ]
    },
    {
      "kind": "how",
      "title": {
        "ru": "Спроси коллегу про его работу",
        "uk": "Спитай колегу про його роботу",
        "es": "Pregunta al colega por su trabajo"
      },
      "body": {
        "ru": "Хочешь узнать, чем занят коллега? Начни вопрос со слова-помощника do: What do you do on the project? Так ты вежливо спрашиваешь про его задачу.",
        "uk": "Хочеш дізнатися, чим зайнятий колега? Почни запитання зі слова-помічника do: What do you do on the project? Так ти ввічливо питаєш про його завдання.",
        "es": "¿Quieres saber de qué se ocupa el colega? Empieza la pregunta con la palabra ayudante do: What do you do on the project? Así preguntas con cortesía por su tarea."
      },
      "examples": [
        {
          "en": "What do you do here?",
          "gloss": {
            "ru": "Чем ты здесь занимаешься?",
            "uk": "Чим ти тут займаєшся?",
            "es": "¿De qué te ocupas aquí?"
          }
        },
        {
          "en": "Do you work on the app too?",
          "gloss": {
            "ru": "Ты тоже работаешь над приложением?",
            "uk": "Ти теж працюєш над застосунком?",
            "es": "¿Tú también trabajas en la aplicación?"
          }
        }
      ]
    }
  ],
  "phrases": [
    {
      "id": "mitap_d9_p1",
      "english": "I work on the mobile app.",
      "meaning": {
        "ru": "Я работаю над мобильным приложением.",
        "uk": "Я працюю над мобільним застосунком.",
        "es": "Trabajo en la aplicación móvil."
      },
      "constructions": [
        "present-simple"
      ],
      "explanation": {
        "title": {
          "ru": "work on — работать над чем-то",
          "uk": "work on — працювати над чимось",
          "es": "work on — trabajar en algo"
        },
        "rule": {
          "ru": "Говоришь, над каким делом ты сидишь: work on -> работать над. Дальше ставишь название: work on the app.",
          "uk": "Кажеш, над якою справою ти сидиш: work on -> працювати над. Далі ставиш назву: work on the app.",
          "es": "Dices en qué asunto trabajas: work on -> trabajar en. Luego pones el nombre: work on the app."
        },
        "why": {
          "ru": "Это первая фраза, когда тебя спрашивают про работу: сразу понятно, чем ты занят.",
          "uk": "Це перша фраза, коли тебе питають про роботу: одразу зрозуміло, чим ти зайнятий.",
          "es": "Es la primera frase cuándo te preguntan por tu trabajo: queda claro de qué te ocupas."
        },
        "commonMistake": {
          "ru": "Не теряй on: просто I work the app звучит неполно. Нужно work on the app.",
          "uk": "Не губи on: просто I work the app звучить неповно. Потрібно work on the app.",
          "es": "No pierdas on: solo I work the app suena incompleto. Hace falta work on the app."
        }
      },
      "words": [
        {
          "text": "I",
          "partOfSpeech": "pronoun",
          "distractors": [
            "you",
            "we",
            "they",
            "she",
            "he"
          ]
        },
        {
          "text": "work",
          "partOfSpeech": "verb",
          "distractors": [
            "read",
            "eat",
            "cook",
            "sleep",
            "walk"
          ]
        },
        {
          "text": "on",
          "partOfSpeech": "preposition",
          "distractors": [
            "at",
            "by",
            "of",
            "from",
            "about"
          ]
        },
        {
          "text": "the",
          "partOfSpeech": "determiner",
          "distractors": [
            "a",
            "my",
            "this",
            "that",
            "some"
          ]
        },
        {
          "text": "mobile",
          "partOfSpeech": "adjective",
          "distractors": [
            "small",
            "new",
            "ready",
            "busy",
            "quick"
          ]
        },
        {
          "text": "app",
          "partOfSpeech": "noun",
          "distractors": [
            "plan",
            "team",
            "call",
            "task",
            "page"
          ]
        }
      ]
    },
    {
      "id": "mitap_d9_p2",
      "english": "I do the design work.",
      "meaning": {
        "ru": "Я делаю работу по дизайну.",
        "uk": "Я роблю роботу з дизайну.",
        "es": "Hago el trabajo de diseño."
      },
      "constructions": [
        "present-simple"
      ],
      "explanation": {
        "title": {
          "ru": "do — делать своё дело",
          "uk": "do — робити свою справу",
          "es": "do — hacer tu tarea"
        },
        "rule": {
          "ru": "Чтобы назвать своё дело, скажи I do и что именно: do the design part -> делаю часть с дизайном.",
          "uk": "Щоб назвати свою справу, скажи I do і що саме: do the design part -> роблю частину з дизайном.",
          "es": "Para nombrar tu tarea, di I do y qué exactamente: do the design part -> hago la parte del diseño."
        },
        "why": {
          "ru": "Так коллеги понимают твою роль в проекте: за какую часть работы ты отвечаешь.",
          "uk": "Так колеги розуміють твою роль у проєкті: за яку частину роботи ти відповідаєш.",
          "es": "Así los colegas entienden tu rol en el proyecto: de qué parte del trabajo te encargas."
        },
        "commonMistake": {
          "ru": "После I в рассказе о себе бери do, а не does: I do, не I does.",
          "uk": "Після I в розповіді про себе бери do, а не does: I do, не I does.",
          "es": "Después de I al hablar de ti, usa do, no does: I do, no I does."
        }
      },
      "words": [
        {
          "text": "I",
          "partOfSpeech": "pronoun",
          "distractors": [
            "we",
            "they",
            "you",
            "she",
            "he"
          ]
        },
        {
          "text": "do",
          "partOfSpeech": "verb",
          "distractors": [
            "go",
            "come",
            "sit",
            "walk",
            "run"
          ]
        },
        {
          "text": "the",
          "partOfSpeech": "determiner",
          "distractors": [
            "a",
            "one",
            "some",
            "any",
            "each"
          ]
        },
        {
          "text": "design",
          "partOfSpeech": "noun",
          "distractors": [
            "test",
            "sales",
            "email",
            "report",
            "kitchen"
          ]
        },
        {
          "text": "work",
          "partOfSpeech": "noun",
          "distractors": [
            "door",
            "box",
            "wall",
            "road",
            "tree"
          ]
        }
      ]
    },
    {
      "id": "mitap_d9_p3",
      "english": "I write code every day.",
      "meaning": {
        "ru": "Я пишу код каждый день.",
        "uk": "Я пишу код щодня.",
        "es": "Yo escribo código todos los días."
      },
      "constructions": [
        "present-simple"
      ],
      "explanation": {
        "title": {
          "ru": "every day — каждый день",
          "uk": "every day — щодня",
          "es": "every day — todos los días"
        },
        "rule": {
          "ru": "Чтобы сказать, что делаешь это постоянно, добавь every day -> каждый день: write code every day.",
          "uk": "Щоб сказати, що робиш це постійно, додай every day -> щодня: write code every day.",
          "es": "Para decir qué lo haces siempre, añade every day -> todos los días: write code every day."
        },
        "why": {
          "ru": "Это показывает твою обычную работу, не разовую задачу: чем ты занят регулярно.",
          "uk": "Це показує твою звичну роботу, не разове завдання: чим ти зайнятий регулярно.",
          "es": "Esto muestra tu trabajo habitual, no una tarea única: de qué te ocupas con regularidad."
        },
        "commonMistake": {
          "ru": "Говори every day без s: не everyday day и не every days.",
          "uk": "Кажи every day без s: не everyday day і не every days.",
          "es": "Di every day sin s: no everyday day ni every days."
        }
      },
      "words": [
        {
          "text": "I",
          "partOfSpeech": "pronoun",
          "distractors": [
            "we",
            "they",
            "you",
            "she",
            "he"
          ]
        },
        {
          "text": "write",
          "partOfSpeech": "verb",
          "distractors": [
            "eat",
            "walk",
            "sleep",
            "run",
            "sing"
          ]
        },
        {
          "text": "code",
          "partOfSpeech": "noun",
          "distractors": [
            "rain",
            "door",
            "tree",
            "sky",
            "wall"
          ]
        },
        {
          "text": "every",
          "partOfSpeech": "determiner",
          "distractors": [
            "each",
            "any",
            "some",
            "most",
            "that"
          ]
        },
        {
          "text": "day",
          "partOfSpeech": "noun",
          "distractors": [
            "week",
            "hour",
            "month",
            "year",
            "time"
          ]
        }
      ]
    },
    {
      "id": "mitap_d9_p4",
      "english": "I work with a small team.",
      "meaning": {
        "ru": "Я работаю с небольшой командой.",
        "uk": "Я працюю з невеликою командою.",
        "es": "Trabajo con un equipo pequeño."
      },
      "constructions": [
        "present-simple"
      ],
      "explanation": {
        "title": {
          "ru": "work with — работать с кем-то",
          "uk": "work with — працювати з кимось",
          "es": "work with — trabajar con alguien"
        },
        "rule": {
          "ru": "Скажи, с кем ты в команде: work with -> работать с. Дальше идёт человек или группа: with a team.",
          "uk": "Скажи, з ким ти в команді: work with -> працювати з. Далі йде людина або група: with a team.",
          "es": "Di con quién estás en el equipo: work with -> trabajar con. Luego va la persona o grupo: with a team."
        },
        "why": {
          "ru": "Так на созвоне понятно, один ты или вас несколько: с кем ты делаешь работу.",
          "uk": "Так на дзвінку зрозуміло, один ти чи вас декілька: з ким ти робиш роботу.",
          "es": "Así en la llamada queda claro si estás solo o sois varios: con quién haces el trabajo."
        },
        "commonMistake": {
          "ru": "С людьми бери with, не on: work with a team, а не work on a team.",
          "uk": "З людьми бери with, не on: work with a team, а не work on a team.",
          "es": "Con personas usa with, no on: work with a team, no work on a team."
        }
      },
      "words": [
        {
          "text": "I",
          "partOfSpeech": "pronoun",
          "distractors": [
            "we",
            "they",
            "you",
            "she",
            "he"
          ]
        },
        {
          "text": "work",
          "partOfSpeech": "verb",
          "distractors": [
            "read",
            "write",
            "cook",
            "run",
            "sleep"
          ]
        },
        {
          "text": "with",
          "partOfSpeech": "preposition",
          "distractors": [
            "for",
            "near",
            "to",
            "from",
            "by"
          ]
        },
        {
          "text": "a",
          "partOfSpeech": "determiner",
          "distractors": [
            "the",
            "one",
            "my",
            "this",
            "that"
          ]
        },
        {
          "text": "small",
          "partOfSpeech": "adjective",
          "distractors": [
            "long",
            "wide",
            "high",
            "deep",
            "round"
          ]
        },
        {
          "text": "team",
          "partOfSpeech": "noun",
          "distractors": [
            "plan",
            "call",
            "desk",
            "room",
            "box"
          ]
        }
      ]
    },
    {
      "english": "What is your role here?",
      "meaning": {
        "ru": "Какая у тебя здесь роль?",
        "uk": "Яка в тебе тут роль?",
        "es": "¿Cuál es tu rol aquí?"
      },
      "constructions": [
        "wh-questions",
        "to-be"
      ],
      "explanation": {
        "title": {
          "ru": "Спроси про роль",
          "uk": "Спитай про роль",
          "es": "Pregunta por el rol"
        },
        "rule": {
          "ru": "What is your role значит какая у тебя роль. Так узнаёшь, чем коллега занят.",
          "uk": "What is your role значить яка в тебе роль. Так дізнаєшся, чим колега зайнятий.",
          "es": "What is your role significa cuál es tu rol. Así sabes de qué se ocupa."
        },
        "why": {
          "ru": "Простой вопрос показывает интерес к работе коллеги.",
          "uk": "Просте питання показує інтерес до роботи колеги.",
          "es": "Una pregunta simple muestra interés por su trabajo."
        },
        "commonMistake": {
          "ru": "Не говори What your role. Нужно is: What is your role.",
          "uk": "Не кажи What your role. Потрібно is: What is your role.",
          "es": "No digas What your role. Hace falta is: What is your role."
        }
      },
      "words": [
        {
          "text": "What",
          "partOfSpeech": "pronoun",
          "distractors": [
            "When",
            "Where",
            "Why",
            "Who",
            "How"
          ]
        },
        {
          "text": "is",
          "partOfSpeech": "to-be",
          "distractors": [
            "are",
            "am",
            "was",
            "were",
            "be"
          ]
        },
        {
          "text": "your",
          "partOfSpeech": "determiner",
          "distractors": [
            "my",
            "his",
            "her",
            "our",
            "their"
          ]
        },
        {
          "text": "role",
          "partOfSpeech": "noun",
          "distractors": [
            "desk",
            "phone",
            "badge",
            "room",
            "chair"
          ]
        },
        {
          "text": "here",
          "partOfSpeech": "adverb",
          "distractors": [
            "soon",
            "now",
            "today",
            "again",
            "late"
          ]
        }
      ],
      "id": "mitap_d9_p5"
    },
    {
      "id": "mitap_d9_p6",
      "english": "Do you work on the app too?",
      "meaning": {
        "ru": "Ты тоже работаешь над приложением?",
        "uk": "Ти теж працюєш над застосунком?",
        "es": "¿Tú también trabajas en la aplicación?"
      },
      "constructions": [
        "present-simple-questions"
      ],
      "explanation": {
        "title": {
          "ru": "Do you work — ты работаешь?",
          "uk": "Do you work — ти працюєш?",
          "es": "Do you work — ¿tú trabajas?"
        },
        "rule": {
          "ru": "Чтобы спросить да/нет про дело, начни с Do you: Do you work on the app -> ты работаешь над приложением.",
          "uk": "Щоб спитати так/ні про справу, почни з Do you: Do you work on the app -> ти працюєш над застосунком.",
          "es": "Para preguntar sí/no por una tarea, empieza con Do you: Do you work on the app -> ¿trabajas en la aplicación."
        },
        "why": {
          "ru": "Так уточняешь, заняты ли вы одним делом: удобно найти общую задачу с коллегой.",
          "uk": "Так уточнюєш, чи зайняті ви однією справою: зручно знайти спільне завдання з колегою.",
          "es": "Así aclaras si estáis en la misma tarea: útil para encontrar trabajo común con un colega."
        },
        "commonMistake": {
          "ru": "Ставь Do в самое начало вопроса: Do you work, а не You work?",
          "uk": "Став Do на самий початок запитання: Do you work, а не You work?",
          "es": "Pon Do al inicio de la pregunta: Do you work, no You work?"
        }
      },
      "words": [
        {
          "text": "Do",
          "partOfSpeech": "verb",
          "distractors": [
            "Are",
            "Can",
            "Will",
            "Did",
            "Does"
          ]
        },
        {
          "text": "you",
          "partOfSpeech": "pronoun",
          "distractors": [
            "we",
            "they",
            "he",
            "she",
            "it"
          ]
        },
        {
          "text": "work",
          "partOfSpeech": "verb",
          "distractors": [
            "read",
            "cook",
            "run",
            "swim",
            "sing"
          ]
        },
        {
          "text": "on",
          "partOfSpeech": "preposition",
          "distractors": [
            "at",
            "by",
            "of",
            "from",
            "about"
          ]
        },
        {
          "text": "the",
          "partOfSpeech": "determiner",
          "distractors": [
            "a",
            "my",
            "this",
            "that",
            "some"
          ]
        },
        {
          "text": "app",
          "partOfSpeech": "noun",
          "distractors": [
            "plan",
            "team",
            "call",
            "task",
            "page"
          ]
        },
        {
          "text": "too",
          "partOfSpeech": "adverb",
          "distractors": [
            "slowly",
            "loudly",
            "fast",
            "well",
            "quietly"
          ]
        }
      ]
    }
  ],
  "vocabulary": [
    {
      "word": "work",
      "partOfSpeech": "verb",
      "translation": {
        "ru": "работать",
        "uk": "працювати",
        "es": "trabajar"
      },
      "example": "I work on the mobile app."
    },
    {
      "word": "do",
      "partOfSpeech": "verb",
      "translation": {
        "ru": "делать",
        "uk": "робити",
        "es": "hacer"
      },
      "example": "I do the design work."
    },
    {
      "word": "write",
      "partOfSpeech": "verb",
      "translation": {
        "ru": "писать",
        "uk": "писати",
        "es": "escribir"
      },
      "example": "I write code every day."
    },
    {
      "word": "team",
      "partOfSpeech": "noun",
      "translation": {
        "ru": "команда",
        "uk": "команда",
        "es": "equipo"
      },
      "example": "I work with a small team."
    },
    {
      "word": "design",
      "partOfSpeech": "noun",
      "translation": {
        "ru": "дизайн",
        "uk": "дизайн",
        "es": "diseño"
      },
      "example": "I do the design work."
    },
    {
      "word": "app",
      "partOfSpeech": "noun",
      "translation": {
        "ru": "приложение",
        "uk": "застосунок",
        "es": "aplicación"
      },
      "example": "I work on the mobile app."
    }
  ]
};

export const MITAP_DAY_10: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 10,
  topic: { ru: 'Спросить про роль коллеги', uk: 'Запитати про роль колеги', es: 'Preguntar sobre el rol de un colega' },
  outcome: {
    ru: 'Ты сможешь вежливо спросить нового коллегу на созвоне, чем он занимается и за что отвечает.',
    uk: 'Ти зможеш ввічливо запитати нового колегу на дзвінку, чим він займається і за що відповідає.',
    es: 'Podrás preguntar con amabilidad a un nuevo colega en una llamada qué hace y de qué se encarga.',
  },
  level: 'A2',
  prerequisiteLessons: [5, 6],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Спроси "чем ты тут занимаешься"', uk: 'Запитай "чим ти тут займаєшся"', es: 'Pregunta "qué haces aquí"' },
      body: {
        ru: 'На созвоне познакомился с новым человеком. Самый простой вопрос про его работу: What do you do here? Это значит "чем ты тут занимаешься". Ставь do перед you, и вопрос готов.',
        uk: 'На дзвінку познайомився з новою людиною. Найпростіше запитання про його роботу: What do you do here? Це означає "чим ти тут займаєшся". Постав do перед you, і запитання готове.',
        es: 'En la llamada conociste a alguien nuevo. La pregunta más simple sobre su trabajo: What do you do here? Significa "qué haces aquí". Pon do antes de you y la pregunta está lista.',
      },
      examples: [
        { en: 'What do you do here?', gloss: { ru: 'Чем ты тут занимаешься?', uk: 'Чим ти тут займаєшся?', es: '¿Qué haces aquí?' } },
        { en: 'What does she do here?', gloss: { ru: 'Чем она тут занимается?', uk: 'Чим вона тут займається?', es: '¿Qué hace ella aquí?' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Спроси, в какой он команде', uk: 'Запитай, у якій він команді', es: 'Pregunta en qué equipo está' },
      body: {
        ru: 'Хочешь понять, где человек работает внутри компании? Спроси про команду: Which team are you on? Слово which значит "какой, который". Так ты сразу поймёшь его место.',
        uk: 'Хочеш зрозуміти, де людина працює всередині компанії? Запитай про команду: Which team are you on? Слово which значить "який, котрий". Так ти одразу зрозумієш його місце.',
        es: '¿Quieres saber dónde trabaja la persona dentro de la empresa? Pregunta por el equipo: Which team are you on? La palabra which significa "qué, cuál". Así entiendes su lugar.',
      },
      examples: [
        { en: 'Which team are you on?', gloss: { ru: 'В какой ты команде?', uk: 'У якій ти команді?', es: '¿En qué equipo estás?' } },
        { en: 'Which team is he on?', gloss: { ru: 'В какой он команде?', uk: 'У якій він команді?', es: '¿En qué equipo está él?' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Уточни, за что человек отвечает', uk: 'Уточни, за що людина відповідає', es: 'Aclara de qué se encarga' },
      body: {
        ru: 'Хочешь узнать зону ответственности коллеги? Спроси: What do you work on? Это значит "над чем ты работаешь". Тут work on вместе значит "работать над чем-то".',
        uk: 'Хочеш дізнатися зону відповідальності колеги? Запитай: What do you work on? Це означає "над чим ти працюєш". Тут work on разом значить "працювати над чимось".',
        es: '¿Quieres saber el área de responsabilidad del colega? Pregunta: What do you work on? Significa "en qué trabajas". Aquí work on junto significa "trabajar en algo".',
      },
      examples: [
        { en: 'What do you work on?', gloss: { ru: 'Над чем ты работаешь?', uk: 'Над чим ти працюєш?', es: '¿En qué trabajas?' } },
        { en: 'What do they work on?', gloss: { ru: 'Над чем они работают?', uk: 'Над чим вони працюють?', es: '¿En qué trabajan ellos?' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d10_p1',
      english: 'What do you do here?',
      meaning: { ru: 'Чем ты тут занимаешься?', uk: 'Чим ти тут займаєшся?', es: '¿Qué haces aquí?' },
      constructions: ['wh-questions', 'present-simple'],
      explanation: {
        title: { ru: 'Вопрос про работу человека', uk: 'Запитання про роботу людини', es: 'Pregunta sobre el trabajo' },
        rule: { ru: 'What значит "что". Ставь do перед you, и спрашиваешь про чужую работу. What -> что.', uk: 'What значить "що". Постав do перед you, і питаєш про чужу роботу. What -> що.', es: 'What significa "qué". Pon do antes de you y preguntas por el trabajo ajeno. What -> qué.' },
        why: { ru: 'Это первый и самый простой вопрос новому коллеге на созвоне. Сразу понимаешь его роль.', uk: 'Це перше і найпростіше запитання новому колезі на дзвінку. Одразу розумієш його роль.', es: 'Es la primera y más simple pregunta a un colega nuevo en la llamada. Entiendes su rol.' },
        commonMistake: { ru: 'Не теряй do: фраза "What you do here" звучит сломанно. Нужно: What do you do.', uk: 'Не губи do: фраза "What you do here" звучить зламано. Треба: What do you do.', es: 'No pierdas do: "What you do here" suena roto. Correcto: What do you do.' },
      },
      words: [
        { text: 'What', partOfSpeech: 'pronoun', distractors: ['When', 'Where', 'Why', 'How', 'Who'] },
        { text: 'do', partOfSpeech: 'verb', distractors: ['sleep', 'swim', 'sit', 'eat', 'walk'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'they', 'we', 'it'] },
        { text: 'do', partOfSpeech: 'verb', distractors: ['make', 'work', 'play', 'run', 'sit'] },
        { text: 'here', partOfSpeech: 'adverb', distractors: ['now', 'today', 'soon', 'often', 'always'] },
      ],
    },
    {
      id: 'mitap_d10_p2',
      english: 'Which team are you on?',
      meaning: { ru: 'В какой ты команде?', uk: 'У якій ти команді?', es: '¿En qué equipo estás?' },
      constructions: ['wh-questions'],
      explanation: {
        title: { ru: 'Спроси про команду коллеги', uk: 'Запитай про команду колеги', es: 'Pregunta por el equipo' },
        rule: { ru: 'Which значит "какой, который". Спрашивай, в какой команде человек. Which -> какой.', uk: 'Which значить "який, котрий". Питай, у якій команді людина. Which -> який.', es: 'Which significa "qué, cuál". Pregunta en qué equipo está la persona. Which -> qué.' },
        why: { ru: 'На больших созвонах много команд. Так ты сразу поймёшь, где человек работает.', uk: 'На великих дзвінках багато команд. Так ти одразу зрозумієш, де людина працює.', es: 'En llamadas grandes hay muchos equipos. Así entiendes dónde trabaja la persona.' },
        commonMistake: { ru: 'Команда "on a team", не "in a team". Говори: are you on, а не in.', uk: 'Команда "on a team", не "in a team". Кажи: are you on, а не in.', es: 'Equipo "on a team", no "in a team". Di: are you on, no in.' },
      },
      words: [
        { text: 'Which', partOfSpeech: 'determiner', distractors: ['When', 'Why', 'Where', 'How', 'Who'] },
        { text: 'team', partOfSpeech: 'noun', distractors: ['call', 'task', 'office', 'plan', 'room'] },
        { text: 'are', partOfSpeech: 'to-be', distractors: ['is', 'am', 'was', 'were', 'be'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'they', 'we', 'it'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['at', 'to', 'by', 'of', 'for'] },
      ],
    },
    {
      id: 'mitap_d10_p3',
      english: 'What do you work on?',
      meaning: { ru: 'Над чем ты работаешь?', uk: 'Над чим ти працюєш?', es: '¿En qué trabajas?' },
      constructions: ['wh-questions', 'present-simple'],
      explanation: {
        title: { ru: 'За что человек отвечает', uk: 'За що людина відповідає', es: 'De qué se encarga' },
        rule: { ru: 'Work on вместе значит "работать над чем-то". Спрашивай про задачи коллеги. work on -> работать над.', uk: 'Work on разом значить "працювати над чимось". Питай про задачі колеги. work on -> працювати над.', es: 'Work on junto significa "trabajar en algo". Pregunta por las tareas del colega. work on -> trabajar en.' },
        why: { ru: 'Так ты узнаёшь не должность, а конкретные задачи человека. Полезно для совместной работы.', uk: 'Так ти дізнаєшся не посаду, а конкретні задачі людини. Корисно для спільної роботи.', es: 'Así sabes no el puesto, sino las tareas concretas de la persona. Útil para colaborar.' },
        commonMistake: { ru: 'Не теряй on в конце: "What do you work?" звучит неполно. Нужно: work on.', uk: 'Не губи on у кінці: "What do you work?" звучить неповно. Треба: work on.', es: 'No pierdas on al final: "What do you work?" suena incompleto. Correcto: work on.' },
      },
      words: [
        { text: 'What', partOfSpeech: 'pronoun', distractors: ['When', 'Where', 'Why', 'How', 'Who'] },
        { text: 'do', partOfSpeech: 'verb', distractors: ['does', 'did', 'are', 'is', 'was'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'they', 'we', 'it'] },
        { text: 'work', partOfSpeech: 'verb', distractors: ['sit', 'play', 'read', 'drive', 'cook'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['at', 'to', 'by', 'of', 'for'] },
      ],
    },
    {
      id: 'mitap_d10_p4',
      english: 'Who do you report to?',
      meaning: { ru: 'Кому ты подчиняешься?', uk: 'Кому ти підпорядковуєшся?', es: '¿A quién le reportas?' },
      constructions: ['wh-questions', 'present-simple'],
      explanation: {
        title: { ru: 'Кто его руководитель', uk: 'Хто його керівник', es: 'Quién es su jefe' },
        rule: { ru: 'Who значит "кто, кому". Report to значит "подчиняться кому-то". Спрашивай про начальника. Who -> кто.', uk: 'Who значить "хто, кому". Report to значить "підпорядковуватися комусь". Питай про начальника. Who -> хто.', es: 'Who significa "quién, a quién". Report to significa "reportar a alguien". Pregunta por el jefe. Who -> quién.' },
        why: { ru: 'Так ты понимаешь, кто принимает решения в команде коллеги. Помогает в рабочих вопросах.', uk: 'Так ти розумієш, хто приймає рішення в команді колеги. Допомагає в робочих питаннях.', es: 'Así entiendes quién decide en el equipo del colega. Ayuda en temas de trabajo.' },
        commonMistake: { ru: 'Не теряй to в конце: "Who do you report?" звучит неполно. Нужно: report to.', uk: 'Не губи to в кінці: "Who do you report?" звучить неповно. Треба: report to.', es: 'No pierdas to al final: "Who do you report?" suena incompleto. Correcto: report to.' },
      },
      words: [
        { text: 'Who', partOfSpeech: 'pronoun', distractors: ['What', 'When', 'Where', 'Why', 'How'] },
        { text: 'do', partOfSpeech: 'verb', distractors: ['does', 'did', 'are', 'is', 'was'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'they', 'we', 'it'] },
        { text: 'report', partOfSpeech: 'verb', distractors: ['talk', 'speak', 'listen', 'look', 'come'] },
        { text: 'to', partOfSpeech: 'preposition', distractors: ['at', 'on', 'by', 'of', 'for'] },
      ],
    },
    {
      id: 'mitap_d10_p5',
      english: 'What hours do you work?',
      meaning: { ru: 'В какие часы ты работаешь?', uk: 'У які години ти працюєш?', es: '¿Qué horario haces?' },
      constructions: ['wh-questions', 'present-simple'],
      explanation: {
        title: { ru: 'Сколько человек в компании', uk: 'Скільки людина в компанії', es: 'Cuánto lleva en la empresa' },
        rule: { ru: 'How long значит "как долго, как давно". Спрашивай про время в компании. How long -> как давно.', uk: 'How long значить "як довго, як давно". Питай про час у компанії. How long -> як давно.', es: 'How long significa "cuánto tiempo". Pregunta por el tiempo en la empresa. How long -> cuánto tiempo.' },
        why: { ru: 'Хороший вопрос для знакомства. Так ты понимаешь, новичок человек или старожил.', uk: 'Гарне запитання для знайомства. Так ти розумієш, новачок людина чи старожил.', es: 'Buena pregunta para conocerse. Así sabes si la persona es nueva o veterana.' },
        commonMistake: { ru: 'Не ставь два слова "how" и "much" вместе про время. Для времени нужно: how long.', uk: 'Не став два слова "how" і "much" разом про час. Для часу треба: how long.', es: 'No juntes "how" y "much" para el tiempo. Para el tiempo usa: how long.' },
      },
      words: [
        { text: 'What', partOfSpeech: 'determiner', distractors: ['When', 'Where', 'Why', 'Who', 'How'] },
        { text: 'hours', partOfSpeech: 'noun', distractors: ['days', 'weeks', 'months', 'years', 'teams'] },
        { text: 'do', partOfSpeech: 'verb', distractors: ['does', 'did', 'are', 'is', 'was'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'they', 'we', 'it'] },
        { text: 'work', partOfSpeech: 'verb', distractors: ['sit', 'play', 'read', 'drive', 'cook'] },
      ],
    },
    {
      id: 'mitap_d10_p6',
      english: 'What does your team do?',
      meaning: { ru: 'Чем занимается твоя команда?', uk: 'Чим займається твоя команда?', es: '¿Qué hace tu equipo?' },
      constructions: ['wh-questions', 'present-simple'],
      explanation: {
        title: { ru: 'Вопрос про всю команду', uk: 'Запитання про всю команду', es: 'Pregunta sobre el equipo' },
        rule: { ru: 'Когда речь про команду (как "оно"), ставь does, а не do. team -> does.', uk: 'Коли мова про команду (як "воно"), став does, а не do. team -> does.', es: 'Cuando hablas del equipo (cómo "él/ella"), usa does, no do. team -> does.' },
        why: { ru: 'Так ты узнаёшь, чем занят весь отдел, а не один человек. Шире картинка.', uk: 'Так ти дізнаєшся, чим зайнятий весь відділ, а не одна людина. Ширша картинка.', es: 'Así sabes qué hace todo el departamento, no una persona. Una imagen más amplia.' },
        commonMistake: { ru: 'Про команду нужно does, не do: не "What do your team do". Нужно: What does your team do.', uk: 'Про команду треба does, не do: не "What do your team do". Треба: What does your team do.', es: 'Para el equipo usa does, no do: no "What do your team do". Correcto: What does your team do.' },
      },
      words: [
        { text: 'What', partOfSpeech: 'pronoun', distractors: ['When', 'Where', 'Why', 'How', 'Who'] },
        { text: 'does', partOfSpeech: 'verb', distractors: ['do', 'did', 'is', 'are', 'was'] },
        { text: 'your', partOfSpeech: 'pronoun', distractors: ['my', 'his', 'her', 'their', 'our'] },
        { text: 'team', partOfSpeech: 'noun', distractors: ['call', 'task', 'office', 'plan', 'room'] },
        { text: 'do', partOfSpeech: 'verb', distractors: ['make', 'work', 'play', 'run', 'sit'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'What', partOfSpeech: 'adverb', translation: { ru: 'что', uk: 'що', es: 'qué' }, example: 'What do you do here?' },
    { word: 'Which', partOfSpeech: 'adverb', translation: { ru: 'какой, который', uk: 'який, котрий', es: 'qué, cuál' }, example: 'Which team are you on?' },
    { word: 'work', partOfSpeech: 'verb', translation: { ru: 'работать', uk: 'працювати', es: 'trabajar' }, example: 'What do you work on?' },
    { word: 'report', partOfSpeech: 'verb', translation: { ru: 'подчиняться, отчитываться', uk: 'підпорядковуватися, звітувати', es: 'reportar' }, example: 'Who do you report to?' },
    { word: 'hours', partOfSpeech: 'noun', translation: { ru: 'часы, время работы', uk: 'години', es: 'horario' }, example: 'What hours do you work?' },
    { word: 'team', partOfSpeech: 'noun', translation: { ru: 'команда', uk: 'команда', es: 'equipo' }, example: 'What does your team do?' },
  ],
};

export const MITAP_DAY_11: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 11,
  topic: { ru: 'Откуда ты и какой у тебя часовой пояс', uk: 'Звідки ти і який у тебе часовий пояс', es: 'De dónde eres y qué hora es para ti' },
  outcome: {
    ru: 'Ты можешь спросить, откуда человек и сколько у него времени, и ответить про свою страну и часовой пояс на созвоне.',
    uk: 'Ти можеш запитати, звідки людина і котра в неї година, і відповісти про свою країну та часовий пояс на дзвінку.',
    es: 'Puedes preguntar de dónde es alguien y qué hora tiene, y responder sobre tu país y tu zona horaria en una llamada.',
  },
  level: 'A2',
  prerequisiteLessons: [5, 8],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Спрашиваем, откуда человек', uk: 'Питаємо, звідки людина', es: 'Preguntamos de dónde es la persona' },
      body: {
        ru: 'На первом созвоне с новой командой все знакомятся. Простой вопрос Where are you based? значит «где ты находишься». Так ты узнаёшь страну или город коллеги. Отвечаешь так же просто: I am based in Spain.',
        uk: 'На першому дзвінку з новою командою всі знайомляться. Просте питання Where are you based? означає «де ти знаходишся». Так ти дізнаєшся країну чи місто колеги. Відповідаєш так само просто: I am based in Spain.',
        es: 'En la primera llamada con un equipo nuevo todos se presentan. La pregunta simple Where are you based? significa dónde estás. Así sabes el país o la ciudad de tu colega. Respondes igual de simple: I am based in Spain.',
      },
      examples: [
        { en: 'Where are you based?', gloss: { ru: 'Где ты находишься?', uk: 'Де ти знаходишся?', es: '¿Dónde estás ubicado?' } },
        { en: 'I am based in Spain.', gloss: { ru: 'Я нахожусь в Испании.', uk: 'Я знаходжуся в Іспанії.', es: 'Estoy ubicado en España.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Спрашиваем про время у коллеги', uk: 'Питаємо про час у колеги', es: 'Preguntamos la hora del colega' },
      body: {
        ru: 'Команды часто в разных странах. Чтобы не перепутать время встречи, спроси What time is it for you? Это значит «сколько у тебя времени». Коллега ответит: It is nine in the morning. Так ты поймёшь его часовой пояс.',
        uk: 'Команди часто в різних країнах. Щоб не переплутати час зустрічі, спитай What time is it for you? Це означає «котра в тебе година». Колега відповість: It is nine in the morning. Так ти зрозумієш його часовий пояс.',
        es: 'Los equipos suelen estar en países distintos. Para no confundir la hora de la reunión, pregunta What time is it for you? Significa qué hora es para ti. El colega responde: It is nine in the morning. Así entiendes su zona horaria.',
      },
      examples: [
        { en: 'What time is it for you?', gloss: { ru: 'Сколько у тебя сейчас времени?', uk: 'Котра в тебе зараз година?', es: '¿Qué hora es para ti?' } },
        { en: 'It is nine in the morning.', gloss: { ru: 'Сейчас девять утра.', uk: 'Зараз дев\'ять ранку.', es: 'Son las nueve de la mañana.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Говорим про разницу во времени', uk: 'Говоримо про різницю в часі', es: 'Hablamos de la diferencia de horas' },
      body: {
        ru: 'Когда часовые пояса разные, удобно сказать разницу. Фраза We have a three-hour difference значит «у нас разница три часа». Слово difference это «разница». Так все сразу понимают, кто работает раньше, а кто позже.',
        uk: 'Коли часові пояси різні, зручно сказати різницю. Фраза We have a three-hour difference означає «у нас різниця три години». Слово difference це «різниця». Так усі одразу розуміють, хто працює раніше, а хто пізніше.',
        es: 'Cuando las zonas horarias son distintas, conviene decir la diferencia. La frase We have a three-hour difference significa qué hay tres horas de diferencia. La palabra difference es diferencia. Así todos entienden quién trabaja antes y quién después.',
      },
      examples: [
        { en: 'We have a three-hour difference.', gloss: { ru: 'У нас разница три часа.', uk: 'У нас різниця три години.', es: 'Tenemos tres horas de diferencia.' } },
        { en: 'What is your time zone?', gloss: { ru: 'Какой у тебя часовой пояс?', uk: 'Який у тебе часовий пояс?', es: '¿Cuál es tu zona horaria?' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d11_p1',
      english: 'Where are you based?',
      meaning: { ru: 'Где ты находишься?', uk: 'Де ти знаходишся?', es: '¿Dónde estás ubicado?' },
      constructions: ['present-simple-questions', 'to-be-questions'],
      explanation: {
        title: { ru: 'Спрашиваем место', uk: 'Питаємо місце', es: 'Preguntamos el lugar' },
        rule: { ru: 'Where значит «где». Вопрос where are you based спрашивает, в какой стране или городе человек.', uk: 'Where значить «де». Питання where are you based питає, в якій країні чи місті людина.', es: 'Where significa dónde. La pregunta where are you based pregunta en qué país o ciudad esta la persona.' },
        why: { ru: 'На созвоне это первый и вежливый способ узнать страну коллеги.', uk: 'На дзвінку це перший і ввічливий спосіб дізнатися країну колеги.', es: 'En una llamada es la forma primera y cortés de saber el país del colega.' },
        commonMistake: { ru: 'Не ставь you перед are: правильно where are you, не where you are.', uk: 'Не став you перед are: правильно where are you, не where you are.', es: 'No pongas you antes de are: correcto where are you, no where you are.' },
      },
      words: [
        { text: 'Where', partOfSpeech: 'adverb', distractors: ['When', 'Why', 'How', 'Here', 'Then'] },
        { text: 'are', partOfSpeech: 'to-be', distractors: ['is', 'was', 'were', 'am', 'be'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['we', 'they', 'he', 'she', 'it'] },
        { text: 'based', partOfSpeech: 'verb', distractors: ['placed', 'located', 'settled', 'seated', 'posted'] },
      ],
    },
    {
      id: 'mitap_d11_p2',
      english: 'I am based in Spain.',
      meaning: { ru: 'Я нахожусь в Испании.', uk: 'Я знаходжуся в Іспанії.', es: 'Estoy ubicado en España.' },
      constructions: ['present-simple', 'prepositions-time'],
      explanation: {
        title: { ru: 'Говорим свою страну', uk: 'Кажемо свою країну', es: 'Decimos nuestro país' },
        rule: { ru: 'Based in значит «нахожусь в». После in ставим страну: based in Spain.', uk: 'Based in значить «знаходжуся в». Після in ставимо країну: based in Spain.', es: 'Based in significa ubicado en. Despues de in ponemos el país: based in Spain.' },
        why: { ru: 'Так ты коротко отвечаешь, где работаешь, чтобы команда знала твою страну.', uk: 'Так ти коротко відповідаєш, де працюєш, щоб команда знала твою країну.', es: 'Así respondes corto dónde trabajas para qué el equipo sepa tu país.' },
        commonMistake: { ru: 'Не говори based at Spain: со страной нужно in, а не at.', uk: 'Не кажи based at Spain: з країною потрібно in, а не at.', es: 'No digas based at Spain: con el país se usa in, no at.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['you', 'we', 'they', 'he', 'she'] },
        { text: 'am', partOfSpeech: 'to-be', distractors: ['is', 'are', 'was', 'were', 'be'] },
        { text: 'based', partOfSpeech: 'verb', distractors: ['placed', 'located', 'settled', 'seated', 'posted'] },
        { text: 'in', partOfSpeech: 'preposition', distractors: ['at', 'on', 'to', 'of', 'by'] },
        { text: 'Spain', partOfSpeech: 'noun', distractors: ['Madrid', 'Europe', 'Spanish', 'Italy', 'France'] },
      ],
    },
    {
      id: 'mitap_d11_p3',
      english: 'What time is it for you?',
      meaning: { ru: 'Сколько у тебя сейчас времени?', uk: 'Котра в тебе зараз година?', es: '¿Qué hora es para ti?' },
      constructions: ['wh-questions', 'present-simple-questions'],
      explanation: {
        title: { ru: 'Спрашиваем время', uk: 'Питаємо час', es: 'Preguntamos la hora' },
        rule: { ru: 'What time is it значит «сколько времени». For you добавляет «у тебя», в твоём поясе.', uk: 'What time is it значить «котра година». For you додає «у тебе», у твоєму поясі.', es: 'What time is it significa qué hora es. For you añade para ti, en tu zona.' },
        why: { ru: 'На созвоне с разными странами важно понять время коллеги, чтобы не сбить встречу.', uk: 'На дзвінку з різними країнами важливо зрозуміти час колеги, щоб не збити зустріч.', es: 'En llamadas con varios países importa saber la hora del colega para no errar la reunión.' },
        commonMistake: { ru: 'Не говори for your: после for нужно you, а не your.', uk: 'Не кажи for your: після for потрібно you, а не your.', es: 'No digas for your: después de for va you, no your.' },
      },
      words: [
        { text: 'What', partOfSpeech: 'determiner', distractors: ['Where', 'When', 'Why', 'Which', 'How'] },
        { text: 'time', partOfSpeech: 'noun', distractors: ['hour', 'clock', 'day', 'week', 'moment'] },
        { text: 'is', partOfSpeech: 'to-be', distractors: ['are', 'was', 'were', 'am', 'be'] },
        { text: 'it', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'they', 'we', 'you'] },
        { text: 'for', partOfSpeech: 'preposition', distractors: ['to', 'at', 'on', 'with', 'by'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['we', 'they', 'he', 'she', 'it'] },
      ],
    },
    {
      id: 'mitap_d11_p4',
      english: 'It is nine in the morning.',
      meaning: { ru: 'Сейчас девять утра.', uk: 'Зараз дев\'ять ранку.', es: 'Son las nueve de la mañana.' },
      constructions: ['present-simple', 'prepositions-time'],
      explanation: {
        title: { ru: 'Называем время дня', uk: 'Називаємо час дня', es: 'Decimos la hora del día' },
        rule: { ru: 'In the morning значит «утром». It is nine значит «сейчас девять».', uk: 'In the morning значить «вранці». It is nine значить «зараз дев\'ять».', es: 'In the morning significa por la mañana. It is nine significa son las nueve.' },
        why: { ru: 'Так ты отвечаешь на вопрос про время и показываешь свой часовой пояс.', uk: 'Так ти відповідаєш на питання про час і показуєш свій часовий пояс.', es: 'Así respondes la pregunta de la hora y muestras tu zona horaria.' },
        commonMistake: { ru: 'Не говори at the morning: с morning нужно in, а не at.', uk: 'Не кажи at the morning: з morning потрібно in, а не at.', es: 'No digas at the morning: con morning se usa in, no at.' },
      },
      words: [
        { text: 'It', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'they', 'we', 'you'] },
        { text: 'is', partOfSpeech: 'to-be', distractors: ['are', 'was', 'were', 'am', 'be'] },
        { text: 'nine', partOfSpeech: 'determiner', distractors: ['five', 'seven', 'three', 'four', 'eight'] },
        { text: 'in', partOfSpeech: 'preposition', distractors: ['at', 'on', 'to', 'of', 'by'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'that', 'some'] },
        { text: 'morning', partOfSpeech: 'noun', distractors: ['evening', 'afternoon', 'night', 'noon', 'day'] },
      ],
    },
    {
      id: 'mitap_d11_p5',
      english: 'We have a three-hour difference.',
      meaning: { ru: 'У нас разница три часа.', uk: 'У нас різниця три години.', es: 'Tenemos tres horas de diferencia.' },
      constructions: ['to-have', 'present-simple'],
      explanation: {
        title: { ru: 'Говорим разницу времени', uk: 'Кажемо різницю часу', es: 'Decimos la diferencia de hora' },
        rule: { ru: 'Difference значит «разница». We have a difference значит «у нас есть разница» во времени.', uk: 'Difference значить «різниця». We have a difference значить «у нас є різниця» в часі.', es: 'Difference significa diferencia. We have a difference significa tenemos una diferencia de hora.' },
        why: { ru: 'Так все на созвоне сразу понимают, кто работает раньше, а кто позже.', uk: 'Так усі на дзвінку одразу розуміють, хто працює раніше, а хто пізніше.', es: 'Así todos en la llamada entienden quién trabaja antes y quién después.' },
        commonMistake: { ru: 'Не говори we has: с we нужно have, а не has.', uk: 'Не кажи we has: з we потрібно have, а не has.', es: 'No digas we has: con we va have, no has.' },
      },
      words: [
        { text: 'We', partOfSpeech: 'pronoun', distractors: ['I', 'they', 'he', 'she', 'it'] },
        { text: 'have', partOfSpeech: 'verb', distractors: ['has', 'want', 'keep', 'hold', 'take'] },
        { text: 'a', partOfSpeech: 'determiner', distractors: ['the', 'an', 'one', 'some', 'any'] },
        { text: 'three-hour', partOfSpeech: 'adjective', distractors: ['two-hour', 'four-hour', 'five-hour', 'six-hour', 'one-hour'] },
        { text: 'difference', partOfSpeech: 'noun', distractors: ['distance', 'change', 'number', 'problem', 'reason'] },
      ],
    },
    {
      id: 'mitap_d11_p6',
      english: 'What is your time zone?',
      meaning: { ru: 'Какой у тебя часовой пояс?', uk: 'Який у тебе часовий пояс?', es: '¿Cuál es tu zona horaria?' },
      constructions: ['wh-questions', 'possessive-pronouns'],
      explanation: {
        title: { ru: 'Спрашиваем часовой пояс', uk: 'Питаємо часовий пояс', es: 'Preguntamos la zona horaria' },
        rule: { ru: 'Time zone значит «часовой пояс». Your значит «твой». Вопрос узнаёт пояс коллеги.', uk: 'Time zone значить «часовий пояс». Your значить «твій». Питання дізнається пояс колеги.', es: 'Time zone significa zona horaria. Your significa tu. La pregunta sabe la zona del colega.' },
        why: { ru: 'Зная пояс коллеги, ты легко назначишь удобное время встречи для всех.', uk: 'Знаючи пояс колеги, ти легко призначиш зручний час зустрічі для всіх.', es: 'Sabiendo la zona del colega, fijas fácil una hora cómoda para todos.' },
        commonMistake: { ru: 'Не говори what your time zone: нужен is после what.', uk: 'Не кажи what your time zone: потрібен is після what.', es: 'No digas what your time zone: hace falta is después de what.' },
      },
      words: [
        { text: 'What', partOfSpeech: 'pronoun', distractors: ['Where', 'When', 'Why', 'Which', 'How'] },
        { text: 'is', partOfSpeech: 'to-be', distractors: ['are', 'was', 'were', 'am', 'be'] },
        { text: 'your', partOfSpeech: 'pronoun', distractors: ['my', 'our', 'their', 'his', 'her'] },
        { text: 'time', partOfSpeech: 'noun', distractors: ['hour', 'clock', 'day', 'week', 'moment'] },
        { text: 'zone', partOfSpeech: 'noun', distractors: ['area', 'place', 'line', 'spot', 'region'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'based', partOfSpeech: 'verb', translation: { ru: 'находиться (где-то)', uk: 'знаходитися (десь)', es: 'ubicado' }, example: 'Where are you based?' },
    { word: 'Spain', partOfSpeech: 'noun', translation: { ru: 'Испания', uk: 'Іспанія', es: 'España' }, example: 'I am based in Spain.' },
    { word: 'time', partOfSpeech: 'noun', translation: { ru: 'время', uk: 'час', es: 'hora' }, example: 'What time is it for you?' },
    { word: 'morning', partOfSpeech: 'noun', translation: { ru: 'утро', uk: 'ранок', es: 'mañana' }, example: 'It is nine in the morning.' },
    { word: 'difference', partOfSpeech: 'noun', translation: { ru: 'разница', uk: 'різниця', es: 'diferencia' }, example: 'We have a three-hour difference.' },
    { word: 'zone', partOfSpeech: 'noun', translation: { ru: 'пояс (зона)', uk: 'пояс (зона)', es: 'zona' }, example: 'What is your time zone?' },
  ],
};

export const MITAP_DAY_12: PlanContentDay = {
  "planId": "mitap",
  "dayIndex": 12,
  "topic": {
    "ru": "Уточнить имя и должность собеседника",
    "uk": "Уточнити ім'я та посаду співрозмовника",
    "es": "Confirmar el nombre y el cargo de la persona"
  },
  "outcome": {
    "ru": "Ты сможешь вежливо переспросить, как зовут человека и кем он работает, если не расслышал или забыл.",
    "uk": "Ти зможеш ввічливо перепитати, як звати людину і ким вона працює, якщо не розчув або забув.",
    "es": "Podrás repreguntar con cortesía cómo se llama la persona y qué hace, si no oíste bien o lo olvidaste."
  },
  "level": "A2",
  "prerequisiteLessons": [
    6,
    7
  ],
  "intro": [
    {
      "kind": "how",
      "title": {
        "ru": "Переспроси имя спокойно",
        "uk": "Перепитай ім'я спокійно",
        "es": "Repregunta el nombre con calma"
      },
      "body": {
        "ru": "Не расслышал имя? Скажи Sorry, what's your name again? Слово again значит ещё раз. Это вежливо, так делают все.",
        "uk": "Не розчув ім'я? Скажи Sorry, what's your name again? Слово again значить ще раз. Це ввічливо, так роблять усі.",
        "es": "¿No oíste el nombre? Di Sorry, what's your name again? La palabra again significa otra vez. Es cortés y normal."
      },
      "examples": [
        {
          "en": "Sorry, what's your name again?",
          "gloss": {
            "ru": "Извини, как тебя зовут, ещё раз?",
            "uk": "Вибач, як тебе звати, ще раз?",
            "es": "Perdón, ¿cómo te llamas otra vez?"
          }
        },
        {
          "en": "What do you do here?",
          "gloss": {
            "ru": "Чем ты тут занимаешься?",
            "uk": "Чим ти тут займаєшся?",
            "es": "¿Qué haces aquí?"
          }
        }
      ]
    },
    {
      "kind": "how",
      "title": {
        "ru": "Спроси про роль человека",
        "uk": "Запитай про роль людини",
        "es": "Pregunta por el cargo"
      },
      "body": {
        "ru": "Хочешь узнать должность? Спроси What do you do? Это значит кем ты работаешь. Простой вопрос про роль в команде.",
        "uk": "Хочеш дізнатися посаду? Запитай What do you do? Це значить ким ти працюєш. Просте питання про роль у команді.",
        "es": "¿Quieres saber el cargo? Pregunta What do you do? Significa en qué trabajas. Una pregunta simple sobre el rol."
      },
      "examples": [
        {
          "en": "What is your role here?",
          "gloss": {
            "ru": "Какая у тебя роль тут?",
            "uk": "Яка в тебе роль тут?",
            "es": "¿Cuál es tu cargo aquí?"
          }
        },
        {
          "en": "What team do you have?",
          "gloss": {
            "ru": "Какая у тебя команда?",
            "uk": "Яка в тебе команда?",
            "es": "¿Qué equipo tienes?"
          }
        }
      ]
    },
    {
      "kind": "how",
      "title": {
        "ru": "Маленькое слово have",
        "uk": "Маленьке слово have",
        "es": "La pequeña palabra have"
      },
      "body": {
        "ru": "Слово have значит иметь, есть у кого-то. What role do you have? значит какая у тебя роль. Удобно спросить про команду или задачу.",
        "uk": "Слово have значить мати, є в когось. What role do you have? значить яка в тебе роль. Зручно спитати про команду чи завдання.",
        "es": "La palabra have significa tener. What role do you have? significa qué cargo tienes. Útil para preguntar por el equipo o la tarea."
      },
      "examples": [
        {
          "en": "What role do you have?",
          "gloss": {
            "ru": "Какая у тебя роль?",
            "uk": "Яка в тебе роль?",
            "es": "¿Qué cargo tienes?"
          }
        },
        {
          "en": "I have a small team.",
          "gloss": {
            "ru": "У меня небольшая команда.",
            "uk": "У мене невелика команда.",
            "es": "Tengo un equipo pequeño."
          }
        }
      ]
    }
  ],
  "phrases": [
    {
      "id": "mitap_d12_p1",
      "english": "Sorry, what's your name again?",
      "meaning": {
        "ru": "Извини, как тебя зовут, ещё раз?",
        "uk": "Вибач, як тебе звати, ще раз?",
        "es": "Perdón, ¿cómo te llamas otra vez?"
      },
      "constructions": [
        "wh-questions"
      ],
      "explanation": {
        "title": {
          "ru": "Слово again в конце",
          "uk": "Слово again у кінці",
          "es": "La palabra again al final"
        },
        "rule": {
          "ru": "What's значит как. again значит ещё раз. Вместе: как тебя зовут ещё раз.",
          "uk": "What's значить як. again значить ще раз. Разом: як тебе звати ще раз.",
          "es": "What's significa cómo. again significa otra vez. Juntas: ¿cómo te llamas otra vez?"
        },
        "why": {
          "ru": "Слово Sorry впереди смягчает вопрос. Так переспросить имя совсем не стыдно.",
          "uk": "Слово Sorry попереду пом'якшує питання. Так перепитати ім'я зовсім не соромно.",
          "es": "La palabra Sorry delante suaviza la pregunta. Repreguntar el nombre así no da pena."
        },
        "commonMistake": {
          "ru": "Слово again ставь в конце: name again. В начало его не двигай.",
          "uk": "Слово again став у кінці: name again. На початок його не став.",
          "es": "La palabra again va al final: name again. No la pongas al inicio."
        }
      },
      "words": [
        {
          "text": "Sorry",
          "partOfSpeech": "other",
          "distractors": [
            "Please",
            "Thanks",
            "Hello",
            "Okay",
            "Hi"
          ]
        },
        {
          "text": "what's",
          "partOfSpeech": "pronoun",
          "distractors": [
            "where's",
            "when's",
            "how's",
            "why's",
            "who's"
          ]
        },
        {
          "text": "your",
          "partOfSpeech": "determiner",
          "distractors": [
            "my",
            "his",
            "her",
            "our",
            "their"
          ]
        },
        {
          "text": "name",
          "partOfSpeech": "noun",
          "distractors": [
            "team",
            "role",
            "desk",
            "phone",
            "badge"
          ]
        },
        {
          "text": "again",
          "partOfSpeech": "adverb",
          "distractors": [
            "still",
            "also",
            "too",
            "once",
            "soon"
          ]
        }
      ]
    },
    {
      "english": "What is your job title?",
      "meaning": {
        "ru": "Какая у тебя должность?",
        "uk": "Яка в тебе посада?",
        "es": "¿Cuál es tu cargo?"
      },
      "constructions": [
        "wh-questions",
        "to-be"
      ],
      "explanation": {
        "title": {
          "ru": "Спроси про должность",
          "uk": "Спитай про посаду",
          "es": "Pregunta por el cargo"
        },
        "rule": {
          "ru": "Job title значит должность. What is your job title узнаёт, как звучит роль.",
          "uk": "Job title значить посада. What is your job title дізнається, як звучить роль.",
          "es": "Job title significa cargo. What is your job title pregunta el nombre del rol."
        },
        "why": {
          "ru": "Полезно знать точную должность для письма или знакомства.",
          "uk": "Корисно знати точну посаду для листа чи знайомства.",
          "es": "Útil saber el cargo exacto para un correo o presentación."
        },
        "commonMistake": {
          "ru": "Не говори What your job title. Нужно is.",
          "uk": "Не кажи What your job title. Потрібно is.",
          "es": "No digas What your job title. Hace falta is."
        }
      },
      "words": [
        {
          "text": "What",
          "partOfSpeech": "pronoun",
          "distractors": [
            "When",
            "Where",
            "Why",
            "Who",
            "How"
          ]
        },
        {
          "text": "is",
          "partOfSpeech": "to-be",
          "distractors": [
            "are",
            "am",
            "was",
            "were",
            "be"
          ]
        },
        {
          "text": "your",
          "partOfSpeech": "determiner",
          "distractors": [
            "my",
            "his",
            "her",
            "our",
            "their"
          ]
        },
        {
          "text": "job",
          "partOfSpeech": "noun",
          "distractors": [
            "desk",
            "phone",
            "badge",
            "room",
            "chair"
          ]
        },
        {
          "text": "title",
          "partOfSpeech": "noun",
          "distractors": [
            "screen",
            "folder",
            "button",
            "report",
            "email"
          ]
        }
      ],
      "id": "mitap_d12_p2"
    },
    {
      "id": "mitap_d12_p3",
      "english": "What role do you have?",
      "meaning": {
        "ru": "Какая у тебя роль?",
        "uk": "Яка в тебе роль?",
        "es": "¿Qué cargo tienes?"
      },
      "constructions": [
        "wh-questions",
        "to-have"
      ],
      "explanation": {
        "title": {
          "ru": "Спрашиваем про роль",
          "uk": "Питаємо про роль",
          "es": "Preguntamos por el cargo"
        },
        "rule": {
          "ru": "role значит роль, должность. have значит иметь. Вместе: какая у тебя роль.",
          "uk": "role значить роль, посада. have значить мати. Разом: яка в тебе роль.",
          "es": "role significa cargo. have significa tener. Juntas: ¿qué cargo tienes?"
        },
        "why": {
          "ru": "Так ты вежливо уточняешь, кем человек работает. Полезно на новой встрече.",
          "uk": "Так ти ввічливо уточнюєш, ким людина працює. Корисно на новій зустрічі.",
          "es": "Así confirmas con cortesía qué hace la persona. Útil en una reunión nueva."
        },
        "commonMistake": {
          "ru": "Маленькое do нужно: what role do you have. Без него вопрос неполный.",
          "uk": "Маленьке do потрібне: what role do you have. Без нього питання неповне.",
          "es": "El pequeño do hace falta: what role do you have. Sin él queda coja."
        }
      },
      "words": [
        {
          "text": "What",
          "partOfSpeech": "determiner",
          "distractors": [
            "Where",
            "When",
            "Why",
            "How",
            "Who"
          ]
        },
        {
          "text": "role",
          "partOfSpeech": "noun",
          "distractors": [
            "name",
            "desk",
            "phone",
            "badge",
            "room"
          ]
        },
        {
          "text": "do",
          "partOfSpeech": "verb",
          "distractors": [
            "did",
            "does",
            "can",
            "will",
            "should"
          ]
        },
        {
          "text": "you",
          "partOfSpeech": "pronoun",
          "distractors": [
            "we",
            "they",
            "he",
            "she",
            "it"
          ]
        },
        {
          "text": "have",
          "partOfSpeech": "verb",
          "distractors": [
            "eat",
            "sleep",
            "walk",
            "run",
            "sing"
          ]
        }
      ]
    },
    {
      "id": "mitap_d12_p4",
      "english": "Are you the new manager?",
      "meaning": {
        "ru": "Ты новый менеджер?",
        "uk": "Ти новий менеджер?",
        "es": "¿Eres el nuevo gerente?"
      },
      "constructions": [
        "to-be-questions"
      ],
      "explanation": {
        "title": {
          "ru": "Вопрос с Are you",
          "uk": "Питання з Are you",
          "es": "Pregunta con Are you"
        },
        "rule": {
          "ru": "manager значит руководитель. new значит новый. Вместе: ты новый руководитель.",
          "uk": "manager значить керівник. new значить новий. Разом: ти новий керівник.",
          "es": "manager significa gerente. new significa nuevo. Juntas: ¿eres el nuevo gerente?"
        },
        "why": {
          "ru": "Так ты уточняешь должность человека прямым вопросом. Быстро и понятно.",
          "uk": "Так ти уточнюєш посаду людини прямим питанням. Швидко і зрозуміло.",
          "es": "Así confirmas el cargo con una pregunta directa. Rápido y claro."
        },
        "commonMistake": {
          "ru": "В вопросе Are идёт первым: are you the manager. Не you are the manager.",
          "uk": "У питанні Are йде першим: are you the manager. Не you are the manager.",
          "es": "En la pregunta Are va primero: are you the manager, no you are."
        }
      },
      "words": [
        {
          "text": "Are",
          "partOfSpeech": "to-be",
          "distractors": [
            "Is",
            "Am",
            "Was",
            "Were",
            "Be"
          ]
        },
        {
          "text": "you",
          "partOfSpeech": "pronoun",
          "distractors": [
            "we",
            "they",
            "he",
            "she",
            "it"
          ]
        },
        {
          "text": "the",
          "partOfSpeech": "article",
          "distractors": [
            "a",
            "an",
            "this",
            "that",
            "my"
          ]
        },
        {
          "text": "new",
          "partOfSpeech": "adjective",
          "distractors": [
            "busy",
            "ready",
            "tired",
            "slow",
            "kind"
          ]
        },
        {
          "text": "manager",
          "partOfSpeech": "noun",
          "distractors": [
            "report",
            "screen",
            "folder",
            "button",
            "email"
          ]
        }
      ]
    },
    {
      "id": "mitap_d12_p5",
      "english": "Who is your team lead?",
      "meaning": {
        "ru": "Кто твой руководитель команды?",
        "uk": "Хто твій керівник команди?",
        "es": "¿Quién es tu jefe de equipo?"
      },
      "constructions": [
        "wh-questions",
        "to-be"
      ],
      "explanation": {
        "title": {
          "ru": "Вопрос со словом who",
          "uk": "Питання зі словом who",
          "es": "Pregunta con who"
        },
        "rule": {
          "ru": "who значит кто. lead значит руководитель. Вместе: кто твой руководитель команды.",
          "uk": "who значить хто. lead значить керівник. Разом: хто твій керівник команди.",
          "es": "who significa quién. lead significa jefe. Juntas: ¿quién es tu jefe de equipo?"
        },
        "why": {
          "ru": "Так ты узнаёшь, кто главный в команде человека. Помогает понять, кто за что.",
          "uk": "Так ти дізнаєшся, хто головний у команді людини. Допомагає зрозуміти, хто за що.",
          "es": "Así sabes quién manda en su equipo. Ayuda a entender quién hace qué."
        },
        "commonMistake": {
          "ru": "После who нужно is: who is. Не говори who your team lead.",
          "uk": "Після who потрібне is: who is. Не кажи who your team lead.",
          "es": "Tras who va is: who is. No digas who your team lead."
        }
      },
      "words": [
        {
          "text": "Who",
          "partOfSpeech": "pronoun",
          "distractors": [
            "What",
            "Where",
            "When",
            "Why",
            "How"
          ]
        },
        {
          "text": "is",
          "partOfSpeech": "to-be",
          "distractors": [
            "do",
            "does",
            "has",
            "goes",
            "was"
          ]
        },
        {
          "text": "your",
          "partOfSpeech": "determiner",
          "distractors": [
            "my",
            "his",
            "her",
            "our",
            "their"
          ]
        },
        {
          "text": "team",
          "partOfSpeech": "noun",
          "distractors": [
            "desk",
            "phone",
            "badge",
            "room",
            "chair"
          ]
        },
        {
          "text": "lead",
          "partOfSpeech": "noun",
          "distractors": [
            "call",
            "plan",
            "note",
            "file",
            "task"
          ]
        }
      ]
    },
    {
      "id": "mitap_d12_p6",
      "english": "I have a question for you.",
      "meaning": {
        "ru": "У меня к тебе вопрос.",
        "uk": "У мене до тебе питання.",
        "es": "Tengo una pregunta para ti."
      },
      "constructions": [
        "to-have"
      ],
      "explanation": {
        "title": {
          "ru": "Слово have для вопроса",
          "uk": "Слово have для питання",
          "es": "La palabra have para preguntar"
        },
        "rule": {
          "ru": "have значит иметь, есть у меня. question значит вопрос. Вместе: у меня вопрос.",
          "uk": "have значить мати, є в мене. question значить питання. Разом: у мене питання.",
          "es": "have significa tener. question significa pregunta. Juntas: tengo una pregunta."
        },
        "why": {
          "ru": "Так ты мягко начинаешь, перед тем как уточнить имя или роль. Звучит вежливо.",
          "uk": "Так ти м'яко починаєш, перш ніж уточнити ім'я чи роль. Звучить ввічливо.",
          "es": "Así empiezas con suavidad antes de confirmar el nombre o el cargo. Suena amable."
        },
        "commonMistake": {
          "ru": "После question нужно for: a question for you. Без for звучит неверно.",
          "uk": "Після question потрібне for: a question for you. Без for звучить неправильно.",
          "es": "Tras question va for: a question for you. Sin for suena mal."
        }
      },
      "words": [
        {
          "text": "I",
          "partOfSpeech": "pronoun",
          "distractors": [
            "he",
            "she",
            "we",
            "they",
            "it"
          ]
        },
        {
          "text": "have",
          "partOfSpeech": "verb",
          "distractors": [
            "take",
            "keep",
            "give",
            "make",
            "find"
          ]
        },
        {
          "text": "a",
          "partOfSpeech": "article",
          "distractors": [
            "an",
            "the",
            "this",
            "that",
            "my"
          ]
        },
        {
          "text": "question",
          "partOfSpeech": "noun",
          "distractors": [
            "screen",
            "folder",
            "button",
            "report",
            "email"
          ]
        },
        {
          "text": "for",
          "partOfSpeech": "preposition",
          "distractors": [
            "with",
            "at",
            "on",
            "by",
            "to"
          ]
        },
        {
          "text": "you",
          "partOfSpeech": "pronoun",
          "distractors": [
            "me",
            "him",
            "her",
            "us",
            "them"
          ]
        }
      ]
    }
  ],
  "vocabulary": [
    {
      "word": "again",
      "partOfSpeech": "adverb",
      "translation": {
        "ru": "ещё раз, снова",
        "uk": "ще раз, знову",
        "es": "otra vez"
      },
      "example": "Sorry, what's your name again?"
    },
    {
      "word": "title",
      "partOfSpeech": "noun",
      "translation": {
        "ru": "должность, название роли",
        "uk": "посада",
        "es": "cargo"
      },
      "example": "What is your job title?"
    },
    {
      "word": "role",
      "partOfSpeech": "noun",
      "translation": {
        "ru": "роль, должность",
        "uk": "роль, посада",
        "es": "cargo"
      },
      "example": "What role do you have?"
    },
    {
      "word": "manager",
      "partOfSpeech": "noun",
      "translation": {
        "ru": "руководитель, менеджер",
        "uk": "керівник, менеджер",
        "es": "gerente"
      },
      "example": "Are you the new manager?"
    },
    {
      "word": "lead",
      "partOfSpeech": "noun",
      "translation": {
        "ru": "руководитель команды",
        "uk": "керівник команди",
        "es": "jefe de equipo"
      },
      "example": "Who is your team lead?"
    },
    {
      "word": "question",
      "partOfSpeech": "noun",
      "translation": {
        "ru": "вопрос",
        "uk": "питання",
        "es": "pregunta"
      },
      "example": "I have a question for you."
    }
  ]
};

export const MITAP_DAY_13: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 13,
  topic: { ru: 'Обменяться контактами в чате', uk: 'Обмінятися контактами в чаті', es: 'Intercambiar contactos en el chat' },
  outcome: {
    ru: 'Сможешь обменяться контактами прямо в чате созвона: кинуть свою почту, попросить чужую и сказать «напиши мне».',
    uk: 'Зможеш обмінятися контактами прямо в чаті дзвінка: кинути свою пошту, попросити чужу і сказати «напиши мені».',
    es: 'Podrás intercambiar contactos en el chat de la llamada: dejar tu correo, pedir el de otro y decir «escríbeme».',
  },
  level: 'A2',
  prerequisiteLessons: [3],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Что делаем сегодня', uk: 'Що робимо сьогодні', es: 'Qué hacemos hoy' },
      body: {
        ru: 'После созвона часто меняются контактами в чате. Сегодня учимся кинуть свою почту и попросить чужую — коротко и спокойно.',
        uk: 'Після дзвінка часто міняються контактами в чаті. Сьогодні вчимося кинути свою пошту і попросити чужу — коротко і спокійно.',
        es: 'Tras la llamada se suelen intercambiar contactos en el chat. Hoy aprendemos a dejar tu correo y pedir el de otro, corto y tranquilo.',
      },
      examples: [
        { en: 'I send you my email.', gloss: { ru: 'Я кидаю тебе свою почту.', uk: 'Я кидаю тобі свою пошту.', es: 'Te mando mi correo.' } },
        { en: 'Drop yours in the chat.', gloss: { ru: 'Кинь свою в чат.', uk: 'Кинь свою в чат.', es: 'Deja el tuyo en el chat.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Команда: просто скажи «сделай»', uk: 'Команда: просто скажи «зроби»', es: 'Orden: solo di «hazlo»' },
      body: {
        ru: 'Когда просишь что-то сделать, бери слово как есть: drop = «кинь», send = «отправь». Ничего лишнего, сразу действие.',
        uk: 'Коли просиш щось зробити, бери слово як є: drop = «кинь», send = «відправ». Нічого зайвого, одразу дія.',
        es: 'Cuando pides hacer algo, usa la palabra tal cual: drop = «deja», send = «manda». Nada extra, acción directa.',
      },
      examples: [
        { en: 'Send me your number.', gloss: { ru: 'Отправь мне свой номер.', uk: 'Відправ мені свій номер.', es: 'Mándame tu número.' } },
        { en: 'Add me on the chat.', gloss: { ru: 'Добавь меня в чат.', uk: 'Додай мене в чат.', es: 'Agrégame en el chat.' } },
      ],
    },
    {
      kind: 'tip',
      title: { ru: 'Один совет', uk: 'Одна порада', es: 'Un consejo' },
      body: {
        ru: 'Не диктуй почту голосом — кинь её в чат текстом. Так никто не ошибётся в буквах, и контакт точно дойдёт.',
        uk: 'Не диктуй пошту голосом — кинь її в чат текстом. Так ніхто не помилиться в літерах, і контакт точно дійде.',
        es: 'No dictes el correo en voz — déjalo en el chat cómo texto. Así nadie falla con las letras y el contacto llega bien.',
      },
    },
  ],
  phrases: [
    {
      id: 'mitap_d13_p1',
      english: 'I send you my email.',
      meaning: { ru: 'Я кидаю тебе свою почту.', uk: 'Я кидаю тобі свою пошту.', es: 'Te mando mi correo.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'Слово send', uk: 'Слово send', es: 'La palabra send' },
        rule: { ru: 'send = «отправлять, кидать». my email = «моя почта». I send you my email = «я кидаю тебе почту».', uk: 'send = «відправляти, кидати». my email = «моя пошта». I send you my email = «я кидаю тобі пошту».', es: 'send = «mandar». my email = «mi correo». I send you my email = «te mando mi correo».' },
        why: { ru: 'Сначала кому (you), потом что (my email). Такой порядок звучит естественно в чате.', uk: 'Спершу кому (you), потім що (my email). Такий порядок звучить природно в чаті.', es: 'Primero a quién (you), luego qué (my email). Ese orden suena natural en el chat.' },
        commonMistake: { ru: 'Не меняй местами: говори send you my email, а не send my email you.', uk: 'Не міняй місцями: кажи send you my email, а не send my email you.', es: 'No cambies el orden: di send you my email, no send my email you.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'send', partOfSpeech: 'verb', distractors: ['cook', 'drive', 'sleep', 'paint', 'sing'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['him', 'her', 'us', 'them', 'me'] },
        { text: 'my', partOfSpeech: 'determiner', distractors: ['your', 'his', 'her', 'our', 'their'] },
        { text: 'email', partOfSpeech: 'noun', distractors: ['window', 'garden', 'spoon', 'ticket', 'pillow'] },
      ],
    },
    {
      id: 'mitap_d13_p2',
      english: 'I add you in chat.',
      meaning: { ru: 'Я добавляю тебя в чат.', uk: 'Я додаю тебе в чат.', es: 'Te agrego al chat.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'Команда drop', uk: 'Команда drop', es: 'La orden drop' },
        rule: { ru: 'drop = «кинь, оставь». yours = «твоя». Drop yours = «кинь свою (почту)».', uk: 'drop = «кинь, залиш». yours = «твоя». Drop yours = «кинь свою (пошту)».', es: 'drop = «deja». yours = «el tuyo». Drop yours = «deja el tuyo».' },
        why: { ru: 'Просьбу начинаешь прямо со слова-действия drop. Никакого «ты» впереди не нужно.', uk: 'Прохання починаєш прямо зі слова-дії drop. Ніякого «ти» попереду не треба.', es: 'La petición empieza directo con la acción drop. No hace falta poner «tú» delante.' },
        commonMistake: { ru: 'Не ставь you вперёд: говори drop yours, а не you drop yours.', uk: 'Не став you попереду: кажи drop yours, а не you drop yours.', es: 'No pongas you delante: di drop yours, no you drop yours.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'add', partOfSpeech: 'verb', distractors: ['cook', 'drive', 'sleep', 'paint', 'sing'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['him', 'her', 'us', 'them', 'me'] },
        { text: 'in', partOfSpeech: 'preposition', distractors: ['under', 'at', 'by', 'with', 'for'] },
        { text: 'chat', partOfSpeech: 'noun', distractors: ['table', 'floor', 'river', 'engine', 'cloud'] },
      ],
    },
    {
      id: 'mitap_d13_p3',
      english: 'I send you my number.',
      meaning: { ru: 'Я отправляю тебе свой номер.', uk: 'Я надсилаю тобі свій номер.', es: 'Te envío mi número.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'Просьба с send me', uk: 'Прохання з send me', es: 'Petición con send me' },
        rule: { ru: 'send me = «отправь мне». your number = «твой номер». too = «тоже, ещё».', uk: 'send me = «відправ мені». your number = «твій номер». too = «теж, ще».', es: 'send me = «mándame». your number = «tu número». too = «también».' },
        why: { ru: 'Слово too в конце добавляет «ещё и это». Так просишь второй контакт мягко.', uk: 'Слово too в кінці додає «ще й це». Так просиш другий контакт м\'яко.', es: 'La palabra too al final añade «también esto». Así pides el segundo contacto con suavidad.' },
        commonMistake: { ru: 'too ставь в конце: send me your number too, а не too send me your number.', uk: 'too став у кінці: send me your number too, а не too send me your number.', es: 'Pon too al final: send me your number too, no too send me your number.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'send', partOfSpeech: 'verb', distractors: ['cook', 'drive', 'paint', 'climb', 'bake'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['him', 'her', 'us', 'them', 'me'] },
        { text: 'my', partOfSpeech: 'determiner', distractors: ['your', 'his', 'her', 'our', 'their'] },
        { text: 'number', partOfSpeech: 'noun', distractors: ['window', 'garden', 'ticket', 'spoon', 'pillow'] },
      ],
    },
    {
      id: 'mitap_d13_p4',
      english: 'I have your email now.',
      meaning: { ru: 'Твоя почта у меня теперь есть.', uk: 'Твоя пошта у мене тепер є.', es: 'Ya tengo tu correo ahora.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'Слово have', uk: 'Слово have', es: 'La palabra have' },
        rule: { ru: 'have = «иметь, есть у меня». I have your email = «у меня есть твоя почта». now = «теперь».', uk: 'have = «мати, є у мене». I have your email = «у мене є твоя пошта». now = «тепер».', es: 'have = «tener». I have your email = «tengo tu correo». now = «ahora».' },
        why: { ru: 'Так ты подтверждаешь, что контакт получил. Коротко — и человеку спокойно.', uk: 'Так ти підтверджуєш, що контакт отримав. Коротко — і людині спокійно.', es: 'Así confirmas qué recibiste el contacto. Corto, y la otra persona queda tranquila.' },
        commonMistake: { ru: 'Не теряй have: говори I have your email, а не I your email.', uk: 'Не губи have: кажи I have your email, а не I your email.', es: 'No pierdas have: di I have your email, no I your email.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'have', partOfSpeech: 'verb', distractors: ['lose', 'find', 'keep', 'drop', 'carry'] },
        { text: 'your', partOfSpeech: 'determiner', distractors: ['my', 'his', 'her', 'our', 'their'] },
        { text: 'email', partOfSpeech: 'noun', distractors: ['window', 'garden', 'spoon', 'ticket', 'pillow'] },
        { text: 'now', partOfSpeech: 'adverb', distractors: ['soon', 'here', 'too', 'again', 'later'] },
      ],
    },
    {
      id: 'mitap_d13_p5',
      english: 'You add me here.',
      meaning: { ru: 'Ты добавляешь меня сюда.', uk: 'Ти додаєш мене сюди.', es: 'Me agregas aquí.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'Команда add', uk: 'Команда add', es: 'La orden add' },
        rule: { ru: 'add = «добавь». me = «меня». Add me on the chat = «добавь меня в чат».', uk: 'add = «додай». me = «мене». Add me on the chat = «додай мене в чат».', es: 'add = «agrega». me = «me». Add me on the chat = «agrégame en el chat».' },
        why: { ru: 'Просишь прямо: add me. Так быстро попадаешь в общий чат команды.', uk: 'Просиш прямо: add me. Так швидко потрапляєш у спільний чат команди.', es: 'Pides directo: add me. Así entras rápido al chat del equipo.' },
        commonMistake: { ru: 'После add сразу me: говори add me, а не add to me.', uk: 'Після add одразу me: кажи add me, а не add to me.', es: 'Tras add va me directo: di add me, no add to me.' },
      },
      words: [
        { text: 'You', partOfSpeech: 'pronoun', distractors: ['He', 'She', 'It', 'Anna', 'Tom'] },
        { text: 'add', partOfSpeech: 'verb', distractors: ['wash', 'fold', 'climb', 'plant', 'bake'] },
        { text: 'me', partOfSpeech: 'pronoun', distractors: ['him', 'her', 'us', 'them', 'you'] },
        { text: 'here', partOfSpeech: 'adverb', distractors: ['soon', 'now', 'again', 'later', 'today'] },
      ],
    },
    {
      id: 'mitap_d13_p6',
      english: 'We keep in touch here.',
      meaning: { ru: 'Мы держим связь здесь.', uk: 'Ми тримаємо зв\'язок тут.', es: 'Seguimos en contacto aquí.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'keep in touch', uk: 'keep in touch', es: 'keep in touch' },
        rule: { ru: 'keep in touch = «держать связь». here = «здесь». We keep in touch here = «мы на связи тут».', uk: 'keep in touch = «тримати зв\'язок». here = «тут». We keep in touch here = «ми на зв\'язку тут».', es: 'keep in touch = «seguir en contacto». here = «aquí». We keep in touch here = «seguimos en contacto aquí».' },
        why: { ru: 'Эти три слова keep in touch всегда идут вместе. Так договариваешься писать дальше.', uk: 'Ці три слова keep in touch завжди йдуть разом. Так домовляєшся писати далі.', es: 'Esas tres palabras keep in touch van siempre juntas. Así acuerdas seguir escribiendo.' },
        commonMistake: { ru: 'Не теряй in: говори keep in touch, а не keep touch.', uk: 'Не губи in: кажи keep in touch, а не keep touch.', es: 'No pierdas in: di keep in touch, no keep touch.' },
      },
      words: [
        { text: 'We', partOfSpeech: 'pronoun', distractors: ['He', 'She', 'It', 'Anna', 'Tom'] },
        { text: 'keep', partOfSpeech: 'verb', distractors: ['cook', 'drive', 'paint', 'climb', 'bake'] },
        { text: 'in', partOfSpeech: 'preposition', distractors: ['on', 'at', 'by', 'with', 'for'] },
        { text: 'touch', partOfSpeech: 'noun', distractors: ['window', 'ticket', 'spoon', 'river', 'engine'] },
        { text: 'here', partOfSpeech: 'adverb', distractors: ['soon', 'now', 'too', 'again', 'later'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'send', partOfSpeech: 'verb', translation: { ru: 'отправлять, кидать', uk: 'відправляти, кидати', es: 'mandar' }, example: 'I send you my email.' },
    { word: 'email', partOfSpeech: 'noun', translation: { ru: 'почта, имейл', uk: 'пошта, імейл', es: 'correo' }, example: 'I send you my email.' },
    { word: 'chat', partOfSpeech: 'noun', translation: { ru: 'чат', uk: 'чат', es: 'chat' }, example: 'I add you in chat.' },
    { word: 'number', partOfSpeech: 'noun', translation: { ru: 'номер', uk: 'номер', es: 'número' }, example: 'I send you my number.' },
    { word: 'add', partOfSpeech: 'verb', translation: { ru: 'добавить', uk: 'додати', es: 'agregar' }, example: 'You add me here.' },
    { word: 'touch', partOfSpeech: 'noun', translation: { ru: 'связь, контакт', uk: 'зв\'язок, контакт', es: 'contacto' }, example: 'We keep in touch here.' },
  ],
};

export const MITAP_DAY_14: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 14,
  topic: { ru: 'Повторение недели 2: знакомство с командой', uk: 'Повторення тижня 2: знайомство з командою', es: 'Repaso de la semana 2: conocer al equipo' },
  outcome: {
    ru: 'Ты сможешь уверенно представиться на созвоне: имя, роль, часовой пояс и контакты.',
    uk: 'Ти зможеш упевнено представитися на дзвінку: ім\'я, роль, часовий пояс і контакти.',
    es: 'Podrás presentarte con seguridad en una llamada: nombre, rol, zona horaria y contactos.',
  },
  level: 'A2',
  prerequisiteLessons: [6, 7],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Назови имя и роль', uk: 'Назви ім\'я і роль', es: 'Di tu nombre y rol' },
      body: {
        ru: 'На созвоне начни с простого: кто ты и чем занимаешься. Скажи "I am" и своё имя, потом "I work as" и роль. Так команда сразу тебя запомнит.',
        uk: 'На дзвінку почни з простого: хто ти і чим займаєшся. Скажи "I am" і своє ім\'я, потім "I work as" і роль. Так команда одразу тебе запам\'ятає.',
        es: 'En la llamada empieza con lo simple: quién eres y qué haces. Di "I am" y tu nombre, luego "I work as" y tu rol. Así el equipo te recuerda enseguida.',
      },
      examples: [
        { en: 'I am Anna and I work as a designer.', gloss: { ru: 'Я Анна, и я работаю дизайнером.', uk: 'Я Анна, і я працюю дизайнером.', es: 'Soy Anna y trabajo cómo diseñadora.' } },
        { en: 'I am on the marketing team.', gloss: { ru: 'Я в команде маркетинга.', uk: 'Я в команді маркетингу.', es: 'Estoy en el equipo de marketing.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Спроси, где человек', uk: 'Запитай, де людина', es: 'Pregunta dónde está la persona' },
      body: {
        ru: 'Часовой пояс важен для встреч. Спроси "Where do you work from?" — узнаешь город или страну. Слово "where" значит "где", и оно ставится в начало вопроса.',
        uk: 'Часовий пояс важливий для зустрічей. Запитай "Where do you work from?" — дізнаєшся місто чи країну. Слово "where" означає "де", і воно стає на початок питання.',
        es: 'La zona horaria importa para las reuniones. Pregunta "Where do you work from?" — sabrás la ciudad o el país. La palabra "where" significa "dónde", y va al inicio de la pregunta.',
      },
      examples: [
        { en: 'Where do you work from?', gloss: { ru: 'Откуда ты работаешь?', uk: 'Звідки ти працюєш?', es: '¿Desde dónde trabajas?' } },
        { en: 'What time is it for you?', gloss: { ru: 'Сколько у тебя времени?', uk: 'Котра в тебе година?', es: '¿Qué hora es para ti?' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Поделись контактом', uk: 'Поділись контактом', es: 'Comparte tu contacto' },
      body: {
        ru: 'В конце дай свой контакт, чтобы тебя нашли. Скажи "I have your email" или "You have my number". Слово "have" значит "иметь", "есть у меня".',
        uk: 'Наприкінці дай свій контакт, щоб тебе знайшли. Скажи "I have your email" або "You have my number". Слово "have" означає "мати", "є в мене".',
        es: 'Al final da tu contacto para qué te encuentren. Di "I have your email" o "You have my number". La palabra "have" significa "tener".',
      },
      examples: [
        { en: 'I have your email now.', gloss: { ru: 'Теперь у меня есть твоя почта.', uk: 'Тепер у мене є твоя пошта.', es: 'Ahora tengo tu correo.' } },
        { en: 'You have my number too.', gloss: { ru: 'У тебя тоже есть мой номер.', uk: 'У тебе теж є мій номер.', es: 'Tú también tienes mi número.' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d14_p1',
      english: 'I work as a project manager.',
      meaning: { ru: 'Я работаю менеджером проектов.', uk: 'Я працюю менеджером проєктів.', es: 'Trabajo cómo gerente de proyectos.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'work — работаю', uk: 'work — працюю', es: 'work — trabajo' },
        rule: { ru: 'Слово "work" значит "работаю". "as" значит "в роли, кем". work as a manager — работаю менеджером.', uk: 'Слово "work" означає "працюю". "as" означає "в ролі, ким". work as a manager — працюю менеджером.', es: 'La palabra "work" significa "trabajo". "as" significa "cómo". work as a manager — trabajo cómo gerente.' },
        why: { ru: 'Так ты называешь свою роль команде в первую же минуту созвона.', uk: 'Так ти називаєш свою роль команді в першу ж хвилину дзвінка.', es: 'Así dices tu rol al equipo en el primer minuto de la llamada.' },
        commonMistake: { ru: 'Не говори "I work like manager". Нужно "work as a manager", а не "like".', uk: 'Не кажи "I work like manager". Потрібно "work as a manager", а не "like".', es: 'No digas "I work like manager". Se dice "work as a manager", no "like".' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'you'] },
        { text: 'work', partOfSpeech: 'verb', distractors: ['start', 'help', 'run', 'lead', 'plan'] },
        { text: 'as', partOfSpeech: 'other', distractors: ['of', 'by', 'for', 'with', 'to'] },
        { text: 'a', partOfSpeech: 'determiner', distractors: ['my', 'this', 'one', 'your', 'that'] },
        { text: 'project', partOfSpeech: 'noun', distractors: ['sales', 'budget', 'client', 'report', 'office'] },
        { text: 'manager', partOfSpeech: 'noun', distractors: ['teacher', 'driver', 'doctor', 'cook', 'pilot'] },
      ],
    },
    {
      id: 'mitap_d14_p2',
      english: 'Where do you work from?',
      meaning: { ru: 'Откуда ты работаешь?', uk: 'Звідки ти працюєш?', es: '¿Desde dónde trabajas?' },
      constructions: ['wh-questions'],
      explanation: {
        title: { ru: 'Where — где, откуда', uk: 'Where — де, звідки', es: 'Where — dónde' },
        rule: { ru: 'Слово "where" значит "где, откуда". Ставь его в начало, а "from" в конец. where ... from — откуда.', uk: 'Слово "where" означає "де, звідки". Став його на початок, а "from" у кінець. where ... from — звідки.', es: 'La palabra "where" significa "dónde". Ponla al inicio y "from" al final. where ... from — desde dónde.' },
        why: { ru: 'Так ты узнаёшь город коллеги и понимаешь его часовой пояс для встреч.', uk: 'Так ти дізнаєшся місто колеги й розумієш його часовий пояс для зустрічей.', es: 'Así sabes la ciudad del colega y entiendes su zona horaria para reuniones.' },
        commonMistake: { ru: 'Не говори "Where you work?". Нужно "do": Where do you work from?', uk: 'Не кажи "Where you work?". Потрібно "do": Where do you work from?', es: 'No digas "Where you work?". Hace falta "do": Where do you work from?' },
      },
      words: [
        { text: 'Where', partOfSpeech: 'adverb', distractors: ['When', 'Why', 'How', 'Who', 'What'] },
        { text: 'do', partOfSpeech: 'verb', distractors: ['are', 'is', 'can', 'will', 'have'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['they', 'we', 'he', 'she', 'it'] },
        { text: 'work', partOfSpeech: 'verb', distractors: ['live', 'call', 'join', 'stay', 'sit'] },
        { text: 'from', partOfSpeech: 'other', distractors: ['of', 'onto', 'per', 'via', 'off'] },
      ],
    },
    {
      id: 'mitap_d14_p3',
      english: 'I am on the design team.',
      meaning: { ru: 'Я в команде дизайна.', uk: 'Я в команді дизайну.', es: 'Estoy en el equipo de diseño.' },
      constructions: ['to-be'],
      explanation: {
        title: { ru: 'on the team — в команде', uk: 'on the team — у команді', es: 'on the team — en el equipo' },
        rule: { ru: 'Слово "team" значит "команда". Для группы говорят "on the team". on the design team — в команде дизайна.', uk: 'Слово "team" означає "команда". Для групи кажуть "on the team". on the design team — у команді дизайну.', es: 'La palabra "team" significa "equipo". Para el grupo se dice "on the team". on the design team — en el equipo de diseño.' },
        why: { ru: 'Так ты сразу показываешь, за какую часть работы ты отвечаешь.', uk: 'Так ти одразу показуєш, за яку частину роботи ти відповідаєш.', es: 'Así muestras enseguida de qué parte del trabajo te encargas.' },
        commonMistake: { ru: 'Не говори "in the team". В английском про команду — "on the team".', uk: 'Не кажи "in the team". Англійською про команду — "on the team".', es: 'No digas "in the team". En inglés se dice "on the team".' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'you'] },
        { text: 'am', partOfSpeech: 'to-be', distractors: ['are', 'is', 'was', 'were', 'be'] },
        { text: 'on', partOfSpeech: 'other', distractors: ['at', 'in', 'by', 'of', 'to'] },
        { text: 'the', partOfSpeech: 'determiner', distractors: ['my', 'one', 'this', 'some', 'that'] },
        { text: 'design', partOfSpeech: 'noun', distractors: ['sales', 'support', 'finance', 'content', 'product'] },
        { text: 'team', partOfSpeech: 'noun', distractors: ['floor', 'room', 'desk', 'group', 'office'] },
      ],
    },
    {
      id: 'mitap_d14_p4',
      english: 'What time is it for you?',
      meaning: { ru: 'Который у тебя час?', uk: 'Котра в тебе година?', es: '¿Qué hora es para ti?' },
      constructions: ['wh-questions'],
      explanation: {
        title: { ru: 'What time — сколько времени', uk: 'What time — котра година', es: 'What time — qué hora' },
        rule: { ru: '"What time" значит "сколько времени, который час". "for you" значит "у тебя". Спрашиваешь время коллеги.', uk: '"What time" означає "котра година". "for you" означає "в тебе". Питаєш час колеги.', es: '"What time" significa "qué hora". "for you" significa "para ti". Preguntas la hora del colega.' },
        why: { ru: 'Часовые пояса разные, и так ты не назначишь встречу на чужую ночь.', uk: 'Часові пояси різні, і так ти не призначиш зустріч на чужу ніч.', es: 'Las zonas horarias son distintas, y así no pones la reunión en su noche.' },
        commonMistake: { ru: 'Не говори "How time is it?". Время спрашивают через "What time".', uk: 'Не кажи "How time is it?". Час питають через "What time".', es: 'No digas "How time is it?". La hora se pregunta con "What time".' },
      },
      words: [
        { text: 'What', partOfSpeech: 'determiner', distractors: ['When', 'Why', 'Where', 'Who', 'How'] },
        { text: 'time', partOfSpeech: 'noun', distractors: ['day', 'week', 'hour', 'date', 'month'] },
        { text: 'is', partOfSpeech: 'to-be', distractors: ['are', 'am', 'was', 'were', 'be'] },
        { text: 'it', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'they', 'we', 'you'] },
        { text: 'for', partOfSpeech: 'other', distractors: ['to', 'with', 'at', 'of', 'on'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['them', 'us', 'him', 'her', 'me'] },
      ],
    },
    {
      id: 'mitap_d14_p5',
      english: 'I have your email now.',
      meaning: { ru: 'Теперь у меня есть твоя почта.', uk: 'Тепер у мене є твоя пошта.', es: 'Ahora tengo tu correo.' },
      constructions: ['to-have'],
      explanation: {
        title: { ru: 'have — есть у меня', uk: 'have — є в мене', es: 'have — tengo' },
        rule: { ru: 'Слово "have" значит "есть у меня, имею". "your" значит "твой". I have your email — у меня есть твоя почта.', uk: 'Слово "have" означає "є в мене, маю". "your" означає "твій". I have your email — у мене є твоя пошта.', es: 'La palabra "have" significa "tengo". "your" significa "tu". I have your email — tengo tu correo.' },
        why: { ru: 'Так ты подтверждаешь, что записал контакт и не потеряешь связь.', uk: 'Так ти підтверджуєш, що записав контакт і не загубиш зв\'язок.', es: 'Así confirmas qué anotaste el contacto y no perderás la conexión.' },
        commonMistake: { ru: 'Не говори "I have you email". Нужно "your": I have your email.', uk: 'Не кажи "I have you email". Потрібно "your": I have your email.', es: 'No digas "I have you email". Hace falta "your": I have your email.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'you'] },
        { text: 'have', partOfSpeech: 'verb', distractors: ['see', 'keep', 'find', 'know', 'read'] },
        { text: 'your', partOfSpeech: 'determiner', distractors: ['his', 'her', 'their', 'our', 'its'] },
        { text: 'email', partOfSpeech: 'noun', distractors: ['number', 'address', 'name', 'photo', 'badge'] },
        { text: 'now', partOfSpeech: 'adverb', distractors: ['soon', 'then', 'late', 'early', 'today'] },
      ],
    },
    {
      id: 'mitap_d14_p6',
      english: 'You have my number too.',
      meaning: { ru: 'У тебя тоже есть мой номер.', uk: 'У тебе теж є мій номер.', es: 'Tú también tienes mi número.' },
      constructions: ['to-have'],
      explanation: {
        title: { ru: 'my — мой', uk: 'my — мій', es: 'my — mi' },
        rule: { ru: 'Слово "my" значит "мой". "too" значит "тоже". You have my number too — у тебя тоже есть мой номер.', uk: 'Слово "my" означає "мій". "too" означає "теж". You have my number too — у тебе теж є мій номер.', es: 'La palabra "my" significa "mi". "too" significa "también". You have my number too — tú también tienes mi número.' },
        why: { ru: 'Так контакт идёт в обе стороны, и любой может первым написать.', uk: 'Так контакт іде в обидва боки, і будь-хто може першим написати.', es: 'Así el contacto va en ambos sentidos, y cualquiera puede escribir primero.' },
        commonMistake: { ru: 'Не говори "my number also" в конце. Естественнее "my number too".', uk: 'Не кажи "my number also" в кінці. Природніше "my number too".', es: 'No pongas "also" al final. Es más natural "my number too".' },
      },
      words: [
        { text: 'You', partOfSpeech: 'pronoun', distractors: ['He', 'She', 'We', 'They', 'It'] },
        { text: 'have', partOfSpeech: 'verb', distractors: ['keep', 'know', 'see', 'find', 'save'] },
        { text: 'my', partOfSpeech: 'determiner', distractors: ['his', 'her', 'their', 'our', 'its'] },
        { text: 'number', partOfSpeech: 'noun', distractors: ['email', 'address', 'name', 'photo', 'badge'] },
        { text: 'too', partOfSpeech: 'adverb', distractors: ['yet', 'still', 'again', 'soon', 'then'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'work', partOfSpeech: 'verb', translation: { ru: 'работать', uk: 'працювати', es: 'trabajar' }, example: 'I work as a project manager.' },
    { word: 'manager', partOfSpeech: 'noun', translation: { ru: 'менеджер, руководитель', uk: 'менеджер, керівник', es: 'gerente' }, example: 'I work as a project manager.' },
    { word: 'team', partOfSpeech: 'noun', translation: { ru: 'команда', uk: 'команда', es: 'equipo' }, example: 'I am on the design team.' },
    { word: 'time', partOfSpeech: 'noun', translation: { ru: 'время', uk: 'час', es: 'hora, tiempo' }, example: 'What time is it for you?' },
    { word: 'email', partOfSpeech: 'noun', translation: { ru: 'электронная почта', uk: 'електронна пошта', es: 'correo' }, example: 'I have your email now.' },
    { word: 'number', partOfSpeech: 'noun', translation: { ru: 'номер', uk: 'номер', es: 'número' }, example: 'You have my number too.' },
  ],
};

export const MITAP_DAY_15: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 15,
  topic: { ru: 'Светская беседа: как прошли выходные', uk: 'Світська бесіда: як минули вихідні', es: 'Charla informal: cómo fue el fin de semana' },
  outcome: {
    ru: 'Сможешь спросить про выходные коллеги и рассказать про свои простыми фразами.',
    uk: 'Зможеш запитати про вихідні колеги і розповісти про свої простими фразами.',
    es: 'Podrás preguntar por el fin de semana de un colega y contar el tuyo con frases sencillas.',
  },
  level: 'A2',
  prerequisiteLessons: [3, 11],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Спрашиваем про выходные', uk: 'Питаємо про вихідні', es: 'Preguntamos por el fin de semana' },
      body: {
        ru: 'В начале созвона коллеги часто болтают пару минут. Самый простой вопрос: How was your weekend? Так ты звучишь дружелюбно и не сразу про работу.',
        uk: 'На початку дзвінка колеги часто балакають пару хвилин. Найпростіше питання: How was your weekend? Так ти звучиш дружньо і не одразу про роботу.',
        es: 'Al inicio de la llamada los colegas suelen charlar un par de minutos. La pregunta más simple: How was your weekend? Así suenas amable y no vas directo al trabajo.',
      },
      examples: [
        { en: 'How was your weekend?', gloss: { ru: 'Как прошли твои выходные?', uk: 'Як минули твої вихідні?', es: '¿Cómo fue tu fin de semana?' } },
        { en: 'My weekend was good.', gloss: { ru: 'Мои выходные были хорошими.', uk: 'Мої вихідні були гарними.', es: 'Mi fin de semana fue bueno.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Рассказываем, что делали', uk: 'Розповідаємо, що робили', es: 'Contamos qué hicimos' },
      body: {
        ru: 'Чтобы ответить, скажи одно простое дело из прошлого: I watched a film. Это слово watched значит смотрел. Коротко и понятно, больше не нужно.',
        uk: 'Щоб відповісти, скажи одну просту справу з минулого: I watched a film. Це слово watched означає дивився. Коротко і зрозуміло, більше не треба.',
        es: 'Para responder, di una cosa simple del pasado: I watched a film. La palabra watched significa vi. Corto y claro, no hace falta más.',
      },
      examples: [
        { en: 'I watched a film.', gloss: { ru: 'Я смотрел фильм.', uk: 'Я дивився фільм.', es: 'Vi una película.' } },
        { en: 'I watched a film at home.', gloss: { ru: 'Я смотрел фильм дома.', uk: 'Я дивився фільм удома.', es: 'Vi una película en casa.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Возвращаем вопрос', uk: 'Повертаємо питання', es: 'Devolvemos la pregunta' },
      body: {
        ru: 'После своего ответа спроси то же у коллеги: And you? Так беседа идёт сама. Это вежливо и показывает, что тебе интересно.',
        uk: 'Після своєї відповіді запитай те саме у колеги: And you? Так бесіда йде сама. Це ввічливо і показує, що тобі цікаво.',
        es: 'Después de tu respuesta, pregunta lo mismo al colega: And you? Así la charla fluye sola. Es cortés y muestra que te interesa.',
      },
      examples: [
        { en: 'It was nice. And you?', gloss: { ru: 'Было приятно. А ты?', uk: 'Було приємно. А ти?', es: 'Estuvo bien. ¿Y tú?' } },
        { en: 'I relaxed at home. And you?', gloss: { ru: 'Я отдыхал дома. А ты?', uk: 'Я відпочивав удома. А ти?', es: 'Descansé en casa. ¿Y tú?' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d15_p1',
      english: 'How was your weekend?',
      meaning: { ru: 'Как прошли твои выходные?', uk: 'Як минули твої вихідні?', es: '¿Cómo fue tu fin de semana?' },
      constructions: ['past-simple-irregular', 'possessive-pronouns'],
      explanation: {
        title: { ru: 'Лёгкий вопрос для начала созвона', uk: 'Легке питання на початку дзвінка', es: 'Pregunta fácil para empezar la llamada' },
        rule: { ru: 'How значит как. Спрашиваешь про прошедшее время словом was. your значит твой. Так начинают беседу.', uk: 'How означає як. Питаєш про минуле словом was. your означає твій. Так починають бесіду.', es: 'How significa cómo. Preguntas por el pasado con was. your significa tu. Así se empieza la charla.' },
        why: { ru: 'Этот вопрос звучит тепло и неформально. Коллеге приятно, что ты спросил про его выходные.', uk: 'Це питання звучить тепло і неформально. Колезі приємно, що ти запитав про його вихідні.', es: 'Esta pregunta suena cálida e informal. Al colega le agrada que preguntes por su fin de semana.' },
        commonMistake: { ru: 'Не говори How is your weekend, выходные уже прошли. Нужно was: How was your weekend.', uk: 'Не кажи How is your weekend, вихідні вже минули. Потрібно was: How was your weekend.', es: 'No digas How is your weekend, el fin ya pasó. Hace falta was: How was your weekend.' },
      },
      words: [
        { text: 'How', partOfSpeech: 'adverb', distractors: ['When', 'Where', 'Why', 'Who', 'What'] },
        { text: 'was', partOfSpeech: 'to-be', distractors: ['were', 'is', 'are', 'am', 'be'] },
        { text: 'your', partOfSpeech: 'determiner', distractors: ['my', 'his', 'her', 'our', 'their'] },
        { text: 'weekend', partOfSpeech: 'noun', distractors: ['meeting', 'lunch', 'report', 'email', 'desk'] },
      ],
    },
    {
      id: 'mitap_d15_p2',
      english: 'My weekend was really good.',
      meaning: { ru: 'Мои выходные были очень хорошими.', uk: 'Мої вихідні були дуже гарними.', es: 'Mi fin de semana fue muy bueno.' },
      constructions: ['past-simple-irregular', 'possessive-pronouns'],
      explanation: {
        title: { ru: 'Короткий тёплый ответ', uk: 'Коротка тепла відповідь', es: 'Respuesta breve y cálida' },
        rule: { ru: 'My значит мой. was говорит про прошлое. really значит очень. good значит хороший. Простой добрый ответ.', uk: 'My означає мій. was каже про минуле. really означає дуже. good означає гарний. Проста добра відповідь.', es: 'My significa mi. was habla del pasado. really significa muy. good significa bueno. Respuesta sencilla y amable.' },
        why: { ru: 'Так ты коротко отвечаешь и не грузишь коллегу деталями. Беседа остаётся лёгкой.', uk: 'Так ти коротко відповідаєш і не вантажиш колегу деталями. Бесіда лишається легкою.', es: 'Así respondes corto y no abrumas al colega con detalles. La charla sigue ligera.' },
        commonMistake: { ru: 'Не говори My weekend is good про прошедшие дни. Нужно was: My weekend was good.', uk: 'Не кажи My weekend is good про минулі дні. Потрібно was: My weekend was good.', es: 'No digas My weekend is good sobre días pasados. Hace falta was: My weekend was good.' },
      },
      words: [
        { text: 'My', partOfSpeech: 'determiner', distractors: ['Your', 'His', 'Her', 'Our', 'Their'] },
        { text: 'weekend', partOfSpeech: 'noun', distractors: ['desk', 'phone', 'report', 'client', 'meeting'] },
        { text: 'was', partOfSpeech: 'to-be', distractors: ['were', 'is', 'are', 'am', 'be'] },
        { text: 'really', partOfSpeech: 'adverb', distractors: ['always', 'never', 'often', 'slowly', 'early'] },
        { text: 'good', partOfSpeech: 'adjective', distractors: ['green', 'round', 'wooden', 'square', 'metal'] },
      ],
    },
    {
      id: 'mitap_d15_p3',
      english: 'I watched a film at home.',
      meaning: { ru: 'Я смотрел фильм дома.', uk: 'Я дивився фільм удома.', es: 'Vi una película en casa.' },
      constructions: ['past-simple-regular'],
      explanation: {
        title: { ru: 'Рассказываешь одно дело', uk: 'Розповідаєш одну справу', es: 'Cuentas una cosa' },
        rule: { ru: 'watched значит смотрел, это прошлое. film значит фильм. at home значит дома. Одна простая история.', uk: 'watched означає дивився, це минуле. film означає фільм. at home означає вдома. Одна проста історія.', es: 'watched significa vi, es pasado. film significa película. at home significa en casa. Una historia simple.' },
        why: { ru: 'Достаточно назвать одно дело. Коллеге понятно, как ты провёл время, без длинного рассказа.', uk: 'Досить назвати одну справу. Колезі зрозуміло, як ти провів час, без довгої розповіді.', es: 'Basta nombrar una cosa. El colega entiende cómo pasaste el tiempo, sin un relato largo.' },
        commonMistake: { ru: 'Не говори I watch a film про вчера. Для прошлого нужно watched с окончанием.', uk: 'Не кажи I watch a film про вчора. Для минулого потрібно watched із закінченням.', es: 'No digas I watch a film sobre ayer. Para el pasado hace falta watched con terminación.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['We', 'You', 'They', 'He', 'She'] },
        { text: 'watched', partOfSpeech: 'verb', distractors: ['cleaned', 'called', 'cooked', 'walked', 'worked'] },
        { text: 'film', partOfSpeech: 'noun', distractors: ['bread', 'soup', 'plate', 'wall', 'box'] },
        { text: 'at', partOfSpeech: 'preposition', distractors: ['in', 'on', 'to', 'by', 'with'] },
        { text: 'home', partOfSpeech: 'noun', distractors: ['today', 'now', 'here', 'again', 'soon'] },
      ],
    },
    {
      id: 'mitap_d15_p4',
      english: 'I cooked dinner with my family.',
      meaning: { ru: 'Я готовил ужин с семьёй.', uk: 'Я готував вечерю з сім\'єю.', es: 'Cociné la cena con mi familia.' },
      constructions: ['past-simple-regular', 'possessive-pronouns'],
      explanation: {
        title: { ru: 'Ещё один вариант про выходные', uk: 'Ще один варіант про вихідні', es: 'Otra opción sobre el fin de semana' },
        rule: { ru: 'cooked значит готовил, это прошлое. dinner значит ужин. my family значит моя семья. Тёплый ответ.', uk: 'cooked означає готував, це минуле. dinner означає вечеря. my family означає моя сім\'я. Тепла відповідь.', es: 'cooked significa cociné, es pasado. dinner significa cena. my family significa mi familia. Respuesta cálida.' },
        why: { ru: 'Домашние дела хорошо подходят для светской беседы. Это близко и понятно любому коллеге.', uk: 'Домашні справи добре підходять для світської бесіди. Це близько і зрозуміло будь-якому колезі.', es: 'Las cosas de casa van bien para la charla informal. Es cercano y claro para cualquier colega.' },
        commonMistake: { ru: 'Не говори I cook dinner про прошлое. Для вчера нужно cooked с окончанием.', uk: 'Не кажи I cook dinner про минуле. Для вчора потрібно cooked із закінченням.', es: 'No digas I cook dinner sobre el pasado. Para ayer hace falta cooked con terminación.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['We', 'You', 'They', 'He', 'She'] },
        { text: 'cooked', partOfSpeech: 'verb', distractors: ['cleaned', 'watched', 'walked', 'called', 'painted'] },
        { text: 'dinner', partOfSpeech: 'noun', distractors: ['music', 'garden', 'car', 'river', 'tree'] },
        { text: 'with', partOfSpeech: 'preposition', distractors: ['for', 'at', 'on', 'to', 'by'] },
        { text: 'my', partOfSpeech: 'determiner', distractors: ['your', 'his', 'her', 'our', 'their'] },
        { text: 'family', partOfSpeech: 'noun', distractors: ['friend', 'team', 'class', 'group', 'client'] },
      ],
    },
    {
      id: 'mitap_d15_p5',
      english: 'It was nice. And you?',
      meaning: { ru: 'Было приятно. А ты?', uk: 'Було приємно. А ти?', es: 'Estuvo bien. ¿Y tú?' },
      constructions: ['past-simple-irregular', 'pronouns'],
      explanation: {
        title: { ru: 'Возвращаешь вопрос коллеге', uk: 'Повертаєш питання колезі', es: 'Devuelves la pregunta al colega' },
        rule: { ru: 'It was значит было. nice значит приятно. And you значит а ты. Так передаёшь слово коллеге.', uk: 'It was означає було. nice означає приємно. And you означає а ти. Так передаєш слово колезі.', es: 'It was significa estuvo. nice significa agradable. And you significa ¿y tú? Así pasas la palabra al colega.' },
        why: { ru: 'После своего ответа важно спросить про коллегу. Беседа идёт по кругу и не обрывается.', uk: 'Після своєї відповіді важливо запитати про колегу. Бесіда йде по колу і не обривається.', es: 'Tras tu respuesta es clave preguntar por el colega. La charla gira y no se corta.' },
        commonMistake: { ru: 'Не говори It is nice про прошлое. Для прошлого нужно It was nice.', uk: 'Не кажи It is nice про минуле. Для минулого потрібно It was nice.', es: 'No digas It is nice sobre el pasado. Para el pasado hace falta It was nice.' },
      },
      words: [
        { text: 'It', partOfSpeech: 'pronoun', distractors: ['He', 'She', 'We', 'They', 'You'] },
        { text: 'was', partOfSpeech: 'to-be', distractors: ['were', 'is', 'are', 'am', 'be'] },
        { text: 'nice', partOfSpeech: 'adjective', distractors: ['green', 'square', 'wooden', 'round', 'metal'] },
        { text: 'And', partOfSpeech: 'conjunction', distractors: ['But', 'Or', 'So', 'Because', 'Then'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['I', 'we', 'they', 'he', 'she'] },
      ],
    },
    {
      id: 'mitap_d15_p6',
      english: 'I relaxed at home all weekend.',
      meaning: { ru: 'Я отдыхал дома все выходные.', uk: 'Я відпочивав удома всі вихідні.', es: 'Descansé en casa todo el fin de semana.' },
      constructions: ['past-simple-regular', 'possessive-pronouns'],
      explanation: {
        title: { ru: 'Говоришь, что просто отдыхал', uk: 'Кажеш, що просто відпочивав', es: 'Dices que simplemente descansaste' },
        rule: { ru: 'relaxed значит отдыхал, это прошлое. at home значит дома. all weekend значит все выходные.', uk: 'relaxed означає відпочивав, це минуле. at home означає вдома. all weekend означає всі вихідні.', es: 'relaxed significa descansé, es pasado. at home significa en casa. all weekend significa todo el fin.' },
        why: { ru: 'Иногда выходные тихие, и это нормальный ответ. Коллеге понятно, что ты набирался сил.', uk: 'Іноді вихідні тихі, і це нормальна відповідь. Колезі зрозуміло, що ти набирався сил.', es: 'A veces el fin es tranquilo, y es una respuesta normal. El colega entiende que descansaste.' },
        commonMistake: { ru: 'Не говори I relax at home про прошлое. Для вчера нужно relaxed с окончанием.', uk: 'Не кажи I relax at home про минуле. Для вчора потрібно relaxed із закінченням.', es: 'No digas I relax at home sobre el pasado. Para ayer hace falta relaxed con terminación.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['We', 'You', 'They', 'He', 'She'] },
        { text: 'relaxed', partOfSpeech: 'verb', distractors: ['travelled', 'drove', 'flew', 'swam', 'ran'] },
        { text: 'at', partOfSpeech: 'preposition', distractors: ['in', 'on', 'to', 'by', 'with'] },
        { text: 'home', partOfSpeech: 'noun', distractors: ['today', 'now', 'here', 'again', 'soon'] },
        { text: 'all', partOfSpeech: 'determiner', distractors: ['some', 'many', 'few', 'each', 'this'] },
        { text: 'weekend', partOfSpeech: 'noun', distractors: ['meeting', 'lunch', 'report', 'email', 'desk'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'weekend', partOfSpeech: 'noun', translation: { ru: 'выходные', uk: 'вихідні', es: 'fin de semana' }, example: 'How was your weekend?' },
    { word: 'watched', partOfSpeech: 'verb', translation: { ru: 'смотрел', uk: 'дивився', es: 'vi' }, example: 'I watched a film at home.' },
    { word: 'cooked', partOfSpeech: 'verb', translation: { ru: 'готовил', uk: 'готував', es: 'cociné' }, example: 'I cooked dinner with my family.' },
    { word: 'nice', partOfSpeech: 'adjective', translation: { ru: 'приятный', uk: 'приємний', es: 'agradable' }, example: 'It was nice. And you?' },
    { word: 'relaxed', partOfSpeech: 'verb', translation: { ru: 'отдыхал', uk: 'відпочивав', es: 'descansé' }, example: 'I relaxed at home all weekend.' },
    { word: 'good', partOfSpeech: 'adjective', translation: { ru: 'хороший', uk: 'гарний', es: 'bueno' }, example: 'My weekend was really good.' },
  ],
};

export const MITAP_DAY_16: PlanContentDay = {
  "planId": "mitap",
  "dayIndex": 16,
  "topic": {
    "ru": "Small talk: погода и настрой",
    "uk": "Small talk: погода і настрій",
    "es": "Small talk: el clima y el ánimo"
  },
  "outcome": {
    "ru": "Ты сможешь начать созвон с лёгкой беседы о погоде и спросить, как настроение у коллеги.",
    "uk": "Ти зможеш почати дзвінок з легкої розмови про погоду і запитати, який настрій у колеги.",
    "es": "Podrás empezar una videollamada con una charla ligera sobre el clima y preguntar cómo está tu colega."
  },
  "level": "A2",
  "prerequisiteLessons": [
    3,
    9
  ],
  "intro": [
    {
      "kind": "how",
      "title": {
        "ru": "Расскажи про погоду у тебя",
        "uk": "Розкажи про погоду в тебе",
        "es": "Cuenta cómo está el clima donde estás"
      },
      "body": {
        "ru": "Чтобы сказать, что у тебя за окном, начни с It is: It is raining here. Так ты легко открываешь беседу перед делом.",
        "uk": "Щоб сказати, що в тебе за вікном, почни з It is: It is raining here. Так ти легко відкриваєш розмову перед справою.",
        "es": "Para decir cómo está el clima contigo, empieza con It is: It is raining here. Así abres la charla antes del trabajo."
      },
      "examples": [
        {
          "en": "It is raining here today.",
          "gloss": {
            "ru": "Тут сегодня идёт дождь.",
            "uk": "Тут сьогодні йде дощ.",
            "es": "Aquí hoy está lloviendo."
          }
        },
        {
          "en": "It is very cold here.",
          "gloss": {
            "ru": "Тут очень холодно.",
            "uk": "Тут дуже холодно.",
            "es": "Aquí hace mucho frío."
          }
        }
      ]
    },
    {
      "kind": "how",
      "title": {
        "ru": "Спроси про погоду у коллеги",
        "uk": "Запитай про погоду в колеги",
        "es": "Pregunta por el clima de tu colega"
      },
      "body": {
        "ru": "Хочешь узнать, как там у собеседника, спроси Is it sunny there? Маленький вопрос делает созвон тёплым и живым.",
        "uk": "Хочеш дізнатися, як там у співрозмовника, запитай Is it sunny there? Маленьке питання робить дзвінок теплим і живим.",
        "es": "¿Quieres saber cómo está allá? Pregunta Is it sunny there? Una pregunta pequeña hace la llamada cálida."
      },
      "examples": [
        {
          "en": "Is it sunny there now?",
          "gloss": {
            "ru": "У вас там сейчас солнечно?",
            "uk": "У вас там зараз сонячно?",
            "es": "¿Está soleado allá ahora?"
          }
        },
        {
          "en": "Is it warm there today?",
          "gloss": {
            "ru": "У вас там сегодня тепло?",
            "uk": "У вас там сьогодні тепло?",
            "es": "¿Hace calor allá hoy?"
          }
        }
      ]
    },
    {
      "kind": "how",
      "title": {
        "ru": "Скажи, что есть вокруг",
        "uk": "Скажи, що є навколо",
        "es": "Di qué hay alrededor"
      },
      "body": {
        "ru": "Когда хочешь сказать, что что-то есть, бери There is: There is a lot of snow. Это помогает рассказать про погоду подробнее.",
        "uk": "Коли хочеш сказати, що щось є, бери There is: There is a lot of snow. Це допомагає розповісти про погоду докладніше.",
        "es": "Cuando quieres decir que algo hay, usa There is: There is a lot of snow. Así cuentas más sobre el clima."
      },
      "examples": [
        {
          "en": "There is a lot of snow here.",
          "gloss": {
            "ru": "Тут много снега.",
            "uk": "Тут багато снігу.",
            "es": "Aquí hay mucha nieve."
          }
        },
        {
          "en": "There is wind outside today.",
          "gloss": {
            "ru": "На улице сегодня ветер.",
            "uk": "На вулиці сьогодні вітер.",
            "es": "Hoy hay viento afuera."
          }
        }
      ]
    }
  ],
  "phrases": [
    {
      "id": "mitap_d16_p1",
      "english": "It is raining here today.",
      "meaning": {
        "ru": "Тут сегодня идёт дождь.",
        "uk": "Тут сьогодні йде дощ.",
        "es": "Aquí hoy está lloviendo."
      },
      "constructions": [
        "present-continuous"
      ],
      "explanation": {
        "title": {
          "ru": "Говорим про погоду через It is",
          "uk": "Говоримо про погоду через It is",
          "es": "Hablamos del clima con It is"
        },
        "rule": {
          "ru": "Про погоду начинаем с It is. It is raining = идёт дождь. Слово here значит тут.",
          "uk": "Про погоду починаємо з It is. It is raining = йде дощ. Слово here значить тут.",
          "es": "Del clima empezamos con It is. It is raining = está lloviendo. Here significa aquí."
        },
        "why": {
          "ru": "Так ты мягко открываешь созвон и показываешь, что у тебя за окном.",
          "uk": "Так ти м'яко відкриваєш дзвінок і показуєш, що в тебе за вікном.",
          "es": "Así abres la llamada con suavidad y muestras cómo está afuera."
        },
        "commonMistake": {
          "ru": "Не говори It rains here today. В разговоре про сейчас бери It is raining.",
          "uk": "Не кажи It rains here today. У розмові про зараз бери It is raining.",
          "es": "No digas It rains here today. Para ahora usa It is raining."
        }
      },
      "words": [
        {
          "text": "It",
          "partOfSpeech": "pronoun",
          "distractors": [
            "He",
            "She",
            "We",
            "They",
            "You"
          ]
        },
        {
          "text": "is",
          "partOfSpeech": "to-be",
          "distractors": [
            "are",
            "am",
            "was",
            "were",
            "be"
          ]
        },
        {
          "text": "raining",
          "partOfSpeech": "verb",
          "distractors": [
            "snowing",
            "working",
            "reading",
            "cooking",
            "walking"
          ]
        },
        {
          "text": "here",
          "partOfSpeech": "adverb",
          "distractors": [
            "slowly",
            "maybe",
            "well",
            "loudly",
            "badly"
          ]
        },
        {
          "text": "today",
          "partOfSpeech": "adverb",
          "distractors": [
            "yesterday",
            "tomorrow",
            "soon",
            "often",
            "early"
          ]
        }
      ]
    },
    {
      "id": "mitap_d16_p2",
      "english": "Is it sunny there now?",
      "meaning": {
        "ru": "У вас там сейчас солнечно?",
        "uk": "У вас там зараз сонячно?",
        "es": "¿Está soleado allá ahora?"
      },
      "constructions": [
        "to-be-questions"
      ],
      "explanation": {
        "title": {
          "ru": "Спрашиваем про чужую погоду",
          "uk": "Запитуємо про чужу погоду",
          "es": "Preguntamos por el clima de otro"
        },
        "rule": {
          "ru": "Вопрос про погоду начинаем с Is it. Sunny = солнечно, there = там.",
          "uk": "Питання про погоду починаємо з Is it. Sunny = сонячно, there = там.",
          "es": "La pregunta del clima empieza con Is it. Sunny = soleado, there = allá."
        },
        "why": {
          "ru": "Маленький вопрос про погоду показывает интерес к коллеге и греет беседу.",
          "uk": "Маленьке питання про погоду показує інтерес до колеги і гріє розмову.",
          "es": "Una pequeña pregunta del clima muestra interés y da calidez a la charla."
        },
        "commonMistake": {
          "ru": "Не говори It is sunny there? В вопросе ставь Is вперёд: Is it sunny.",
          "uk": "Не кажи It is sunny there? У питанні став Is вперед: Is it sunny.",
          "es": "No digas It is sunny there? En la pregunta pon Is delante: Is it sunny."
        }
      },
      "words": [
        {
          "text": "Is",
          "partOfSpeech": "to-be",
          "distractors": [
            "Are",
            "Am",
            "Was",
            "Were",
            "Be"
          ]
        },
        {
          "text": "it",
          "partOfSpeech": "pronoun",
          "distractors": [
            "he",
            "she",
            "we",
            "they",
            "you"
          ]
        },
        {
          "text": "sunny",
          "partOfSpeech": "adjective",
          "distractors": [
            "cloudy",
            "rainy",
            "windy",
            "foggy",
            "snowy"
          ]
        },
        {
          "text": "there",
          "partOfSpeech": "adverb",
          "distractors": [
            "soon",
            "maybe",
            "well",
            "fast",
            "slowly"
          ]
        },
        {
          "text": "now",
          "partOfSpeech": "adverb",
          "distractors": [
            "later",
            "yesterday",
            "often",
            "always",
            "tomorrow"
          ]
        }
      ]
    },
    {
      "id": "mitap_d16_p3",
      "english": "There is a lot of snow.",
      "meaning": {
        "ru": "Много снега.",
        "uk": "Багато снігу.",
        "es": "Hay mucha nieve."
      },
      "constructions": [
        "there-is"
      ],
      "explanation": {
        "title": {
          "ru": "Говорим, что чего-то много",
          "uk": "Говоримо, що чогось багато",
          "es": "Decimos que hay mucho de algo"
        },
        "rule": {
          "ru": "There is значит есть, имеется. A lot of snow = много снега.",
          "uk": "There is значить є, наявне. A lot of snow = багато снігу.",
          "es": "There is significa hay. A lot of snow = mucha nieve."
        },
        "why": {
          "ru": "Так ты рассказываешь про погоду подробнее: не просто холодно, а есть снег.",
          "uk": "Так ти розповідаєш про погоду докладніше: не просто холодно, а є сніг.",
          "es": "Así cuentas más del clima: no solo frío, sino que hay nieve."
        },
        "commonMistake": {
          "ru": "Не говори Have a lot of snow. Про наличие начинай с There is.",
          "uk": "Не кажи Have a lot of snow. Про наявність починай з There is.",
          "es": "No digas Have a lot of snow. Para lo que hay empieza con There is."
        }
      },
      "words": [
        {
          "text": "There",
          "partOfSpeech": "existential",
          "distractors": [
            "It",
            "He",
            "She",
            "They",
            "We"
          ]
        },
        {
          "text": "is",
          "partOfSpeech": "to-be",
          "distractors": [
            "are",
            "am",
            "was",
            "were",
            "be"
          ]
        },
        {
          "text": "a",
          "partOfSpeech": "article",
          "distractors": [
            "the",
            "an",
            "this",
            "that",
            "some"
          ]
        },
        {
          "text": "lot",
          "partOfSpeech": "noun",
          "distractors": [
            "piece",
            "drop",
            "bit",
            "part",
            "group"
          ]
        },
        {
          "text": "of",
          "partOfSpeech": "preposition",
          "distractors": [
            "in",
            "on",
            "at",
            "with",
            "for"
          ]
        },
        {
          "text": "snow",
          "partOfSpeech": "noun",
          "distractors": [
            "rain",
            "wind",
            "fog",
            "ice",
            "sun"
          ]
        }
      ]
    },
    {
      "english": "Is your day going well?",
      "meaning": {
        "ru": "Твой день идёт хорошо?",
        "uk": "Твій день іде добре?",
        "es": "¿Te va bien el día?"
      },
      "constructions": [
        "present-continuous"
      ],
      "explanation": {
        "title": {
          "ru": "Спроси про настрой дня",
          "uk": "Спитай про настрій дня",
          "es": "Pregunta cómo va el día"
        },
        "rule": {
          "ru": "Is your day going well значит твой день идёт хорошо. Тёплый вопрос.",
          "uk": "Is your day going well значить твій день іде добре. Тепле питання.",
          "es": "Is your day going well significa si te va bien el día. Pregunta cálida."
        },
        "why": {
          "ru": "Так ты показываешь заботу о коллеге в начале созвона.",
          "uk": "Так ти показуєш турботу про колегу на початку дзвінка.",
          "es": "Así muestras interés por el colega al inicio de la llamada."
        },
        "commonMistake": {
          "ru": "Не говори Is your day go well. Нужно going.",
          "uk": "Не кажи Is your day go well. Потрібно going.",
          "es": "No digas Is your day go well. Hace falta going."
        }
      },
      "words": [
        {
          "text": "Is",
          "partOfSpeech": "to-be",
          "distractors": [
            "Are",
            "Am",
            "Was",
            "Were",
            "Be"
          ]
        },
        {
          "text": "your",
          "partOfSpeech": "determiner",
          "distractors": [
            "my",
            "his",
            "her",
            "our",
            "their"
          ]
        },
        {
          "text": "day",
          "partOfSpeech": "noun",
          "distractors": [
            "week",
            "hour",
            "call",
            "desk",
            "room"
          ]
        },
        {
          "text": "going",
          "partOfSpeech": "verb",
          "distractors": [
            "coming",
            "running",
            "reading",
            "cooking",
            "walking"
          ]
        },
        {
          "text": "well",
          "partOfSpeech": "adverb",
          "distractors": [
            "soon",
            "now",
            "today",
            "again",
            "here"
          ]
        }
      ],
      "id": "mitap_d16_p4"
    },
    {
      "id": "mitap_d16_p5",
      "english": "I am fine, thank you.",
      "meaning": {
        "ru": "Я в порядке, спасибо.",
        "uk": "Я в порядку, дякую.",
        "es": "Estoy bien, gracias."
      },
      "constructions": [
        "present-simple"
      ],
      "explanation": {
        "title": {
          "ru": "Отвечаем про свой настрой",
          "uk": "Відповідаємо про свій настрій",
          "es": "Respondemos sobre nuestro ánimo"
        },
        "rule": {
          "ru": "I am fine = я в порядке, у меня всё хорошо. Thank you = спасибо.",
          "uk": "I am fine = я в порядку, у мене все добре. Thank you = дякую.",
          "es": "I am fine = estoy bien. Thank you = gracias."
        },
        "why": {
          "ru": "Короткий тёплый ответ на How are you держит беседу лёгкой и вежливой.",
          "uk": "Короткий теплий відповідь на How are you тримає розмову легкою і ввічливою.",
          "es": "Una respuesta breve y cálida a How are you mantiene la charla ligera."
        },
        "commonMistake": {
          "ru": "Не говори I fine. Между I и fine нужно am: I am fine.",
          "uk": "Не кажи I fine. Між I і fine потрібно am: I am fine.",
          "es": "No digas I fine. Entre I y fine va am: I am fine."
        }
      },
      "words": [
        {
          "text": "I",
          "partOfSpeech": "pronoun",
          "distractors": [
            "He",
            "She",
            "It",
            "We",
            "They"
          ]
        },
        {
          "text": "am",
          "partOfSpeech": "to-be",
          "distractors": [
            "is",
            "are",
            "was",
            "were",
            "be"
          ]
        },
        {
          "text": "fine",
          "partOfSpeech": "adjective",
          "distractors": [
            "tired",
            "busy",
            "ready",
            "late",
            "sure"
          ]
        },
        {
          "text": "thank",
          "partOfSpeech": "verb",
          "distractors": [
            "help",
            "call",
            "ask",
            "tell",
            "meet"
          ]
        },
        {
          "text": "you",
          "partOfSpeech": "pronoun",
          "distractors": [
            "he",
            "she",
            "it",
            "we",
            "they"
          ]
        }
      ]
    },
    {
      "id": "mitap_d16_p6",
      "english": "The weather is nice here.",
      "meaning": {
        "ru": "Погода тут хорошая.",
        "uk": "Погода тут гарна.",
        "es": "El clima está agradable aquí."
      },
      "constructions": [
        "present-simple"
      ],
      "explanation": {
        "title": {
          "ru": "Говорим, какая погода",
          "uk": "Говоримо, яка погода",
          "es": "Decimos cómo está el clima"
        },
        "rule": {
          "ru": "The weather = погода. The weather is nice = погода хорошая. Here = тут.",
          "uk": "The weather = погода. The weather is nice = погода гарна. Here = тут.",
          "es": "The weather = el clima. The weather is nice = el clima está agradable."
        },
        "why": {
          "ru": "Простая фраза про погоду делает начало созвона приятным и располагает к делу.",
          "uk": "Проста фраза про погоду робить початок дзвінка приємним і розташовує до справи.",
          "es": "Una frase simple del clima hace el inicio de la llamada agradable."
        },
        "commonMistake": {
          "ru": "Не говори Weather is nice. Перед weather нужно the: The weather.",
          "uk": "Не кажи Weather is nice. Перед weather потрібно the: The weather.",
          "es": "No digas Weather is nice. Antes de weather va the: The weather."
        }
      },
      "words": [
        {
          "text": "The",
          "partOfSpeech": "article",
          "distractors": [
            "A",
            "An",
            "This",
            "That",
            "Some"
          ]
        },
        {
          "text": "weather",
          "partOfSpeech": "noun",
          "distractors": [
            "season",
            "morning",
            "sky",
            "city",
            "office"
          ]
        },
        {
          "text": "is",
          "partOfSpeech": "to-be",
          "distractors": [
            "are",
            "am",
            "was",
            "were",
            "be"
          ]
        },
        {
          "text": "nice",
          "partOfSpeech": "adjective",
          "distractors": [
            "cold",
            "grey",
            "windy",
            "wet",
            "dark"
          ]
        },
        {
          "text": "here",
          "partOfSpeech": "adverb",
          "distractors": [
            "soon",
            "maybe",
            "well",
            "fast",
            "slowly"
          ]
        }
      ]
    }
  ],
  "vocabulary": [
    {
      "word": "raining",
      "partOfSpeech": "verb",
      "translation": {
        "ru": "идёт дождь",
        "uk": "йде дощ",
        "es": "lloviendo"
      },
      "example": "It is raining here today."
    },
    {
      "word": "sunny",
      "partOfSpeech": "adjective",
      "translation": {
        "ru": "солнечно",
        "uk": "сонячно",
        "es": "soleado"
      },
      "example": "Is it sunny there now?"
    },
    {
      "word": "snow",
      "partOfSpeech": "noun",
      "translation": {
        "ru": "снег",
        "uk": "сніг",
        "es": "nieve"
      },
      "example": "There is a lot of snow."
    },
    {
      "word": "fine",
      "partOfSpeech": "adjective",
      "translation": {
        "ru": "в порядке",
        "uk": "в порядку",
        "es": "bien"
      },
      "example": "I am fine, thank you."
    },
    {
      "word": "weather",
      "partOfSpeech": "noun",
      "translation": {
        "ru": "погода",
        "uk": "погода",
        "es": "el clima"
      },
      "example": "The weather is nice here."
    },
    {
      "word": "nice",
      "partOfSpeech": "adjective",
      "translation": {
        "ru": "хороший",
        "uk": "гарний",
        "es": "agradable"
      },
      "example": "The weather is nice here."
    }
  ]
};

export const MITAP_DAY_17: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 17,
  topic: { ru: 'Дежурный вопрос «как дела»', uk: 'Чергове запитання «як справи»', es: 'La pregunta de rutina «cómo va»' },
  outcome: {
    ru: 'Ты сможешь в начале созвона спросить «как дела» и «много ли работы», и коротко ответить.',
    uk: 'Ти зможеш на початку дзвінка запитати «як справи» і «чи багато роботи», і коротко відповісти.',
    es: 'Podrás preguntar «cómo va» y «si hay mucho trabajo» al inicio de la llamada, y responder corto.',
  },
  level: 'A2',
  prerequisiteLessons: [5, 7],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Спрашиваем «как дела»: How is it going?', uk: 'Питаємо «як справи»: How is it going?', es: 'Preguntamos «cómo va»: How is it going?' },
      body: {
        ru: 'В начале созвона принято спросить, как у человека дела. How is it going? значит «как идут дела». В живой речи это сливают в How\'s it going? Отвечают коротко: It is going well.',
        uk: 'На початку дзвінка прийнято спитати, як у людини справи. How is it going? значить «як ідуть справи». У живій мові це зливають у How\'s it going? Відповідають коротко: It is going well.',
        es: 'Al inicio de la llamada se suele preguntar cómo está la persona. ¿How is it going? significa «¿cómo va»? Al hablar se une en ¿How\'s it going? Se responde corto: It is going well.',
      },
      examples: [
        { en: 'How is it going?', gloss: { ru: 'Как дела?', uk: 'Як справи?', es: '¿Cómo va?' } },
        { en: 'It is going well.', gloss: { ru: 'Всё идёт хорошо.', uk: 'Усе йде добре.', es: 'Va bien.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Спрашиваем про загрузку: Do you have', uk: 'Питаємо про завантаженість: Do you have', es: 'Preguntamos por la carga: Do you have' },
      body: {
        ru: 'Чтобы спросить, много ли у коллеги работы, ставь Do you have перед делом. Do you have a busy week? значит «у тебя загруженная неделя?». Слово busy это «занятой, загруженный».',
        uk: 'Щоб спитати, чи багато в колеги роботи, став Do you have перед справою. Do you have a busy week? значить «у тебе завантажений тиждень?». Слово busy це «зайнятий, завантажений».',
        es: 'Para preguntar si el colega tiene mucho trabajo, pon Do you have antes del asunto. ¿Do you have a busy week? significa «¿tienes una semana ocupada?». La palabra busy es «ocupado, cargado».',
      },
      examples: [
        { en: 'Do you have a busy week?', gloss: { ru: 'У тебя загруженная неделя?', uk: 'У тебе завантажений тиждень?', es: '¿Tienes una semana ocupada?' } },
        { en: 'I have a busy week.', gloss: { ru: 'У меня загруженная неделя.', uk: 'У мене завантажений тиждень.', es: 'Tengo una semana ocupada.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Отвечаем и спрашиваем в ответ', uk: 'Відповідаємо і питаємо у відповідь', es: 'Respondemos y preguntamos de vuelta' },
      body: {
        ru: 'На «как дела» отвечай коротко и тепло: I am good, thank you. А потом верни вопрос: And how about you? Это значит «а у тебя как?». Так разговор идёт в обе стороны.',
        uk: 'На «як справи» відповідай коротко і тепло: I am good, thank you. А потім поверни питання: And how about you? Це значить «а в тебе як?». Так розмова йде в обидва боки.',
        es: 'A «¿cómo va?» responde corto y cálido: I am good, thank you. Y luego devuelve la pregunta: ¿And how about you? Significa «¿y tú?». Así la charla va en ambos sentidos.',
      },
      examples: [
        { en: 'I am good, thank you.', gloss: { ru: 'У меня всё хорошо, спасибо.', uk: 'У мене все добре, дякую.', es: 'Estoy bien, gracias.' } },
        { en: 'And how about you?', gloss: { ru: 'А у тебя как?', uk: 'А в тебе як?', es: '¿Y tú qué tal?' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d17_p1',
      english: 'How is it going?',
      meaning: { ru: 'Как дела?', uk: 'Як справи?', es: '¿Cómo va?' },
      constructions: ['present-simple-questions', 'wh-questions'],
      explanation: {
        title: { ru: 'Спрашиваем «как дела»', uk: 'Питаємо «як справи»', es: 'Preguntamos «cómo va»' },
        rule: { ru: 'How значит «как». How is it going спрашивает, как у человека идут дела.', uk: 'How значить «як». How is it going питає, як у людини йдуть справи.', es: 'How significa cómo. How is it going pregunta cómo le va a la persona.' },
        why: { ru: 'Это тёплый старт созвона, чтобы расположить коллегу до дела.', uk: 'Це теплий старт дзвінка, щоб прихилити колегу до справи.', es: 'Es un inicio cálido de la llamada para conectar con el colega antes del trabajo.' },
        commonMistake: { ru: 'Не говори how it is going: после how нужно is, потом it.', uk: 'Не кажи how it is going: після how потрібно is, потім it.', es: 'No digas how it is going: tras how va is y luego it.' },
      },
      words: [
        { text: 'How', partOfSpeech: 'adverb', distractors: ['When', 'Why', 'Where', 'Who', 'What'] },
        { text: 'is', partOfSpeech: 'to-be', distractors: ['are', 'am', 'was', 'were', 'be'] },
        { text: 'it', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'you'] },
        { text: 'going', partOfSpeech: 'verb', distractors: ['looking', 'coming', 'raining', 'snowing', 'flowing'] },
      ],
    },
    {
      id: 'mitap_d17_p2',
      english: 'How are you today?',
      meaning: { ru: 'Как ты сегодня?', uk: 'Як ти сьогодні?', es: '¿Cómo estás hoy?' },
      constructions: ['present-simple-questions', 'to-be-questions'],
      explanation: {
        title: { ru: 'Спрашиваем про самочувствие', uk: 'Питаємо про самопочуття', es: 'Preguntamos cómo está' },
        rule: { ru: 'How are you значит «как ты». Слово today добавляет «сегодня».', uk: 'How are you значить «як ти». Слово today додає «сьогодні».', es: 'How are you significa cómo estás. La palabra today añade «hoy».' },
        why: { ru: 'Простой человечный вопрос в начале встречи делает созвон теплее.', uk: 'Просте людяне питання на початку зустрічі робить дзвінок теплішим.', es: 'Una pregunta simple y humana al inicio hace la llamada más cálida.' },
        commonMistake: { ru: 'Для you бери are, не is: how are you, не how is you.', uk: 'Для you бери are, не is: how are you, не how is you.', es: 'Para you usa are, no is: how are you, no how is you.' },
      },
      words: [
        { text: 'How', partOfSpeech: 'adverb', distractors: ['When', 'Why', 'Where', 'Who', 'What'] },
        { text: 'are', partOfSpeech: 'to-be', distractors: ['is', 'am', 'was', 'were', 'be'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'today', partOfSpeech: 'adverb', distractors: ['yesterday', 'soon', 'later', 'always', 'never'] },
      ],
    },
    {
      id: 'mitap_d17_p3',
      english: 'Do you have a busy week?',
      meaning: { ru: 'У тебя загруженная неделя?', uk: 'У тебе завантажений тиждень?', es: '¿Tienes una semana ocupada?' },
      constructions: ['present-simple-questions', 'to-have'],
      explanation: {
        title: { ru: 'Спрашиваем про загрузку', uk: 'Питаємо про завантаженість', es: 'Preguntamos por la carga' },
        rule: { ru: 'Do you have значит «у тебя есть». Busy значит «загруженный»: busy week — «загруженная неделя».', uk: 'Do you have значить «у тебе є». Busy значить «завантажений»: busy week — «завантажений тиждень».', es: 'Do you have significa «¿tienes?». Busy significa «ocupado»: busy week es «semana ocupada».' },
        why: { ru: 'Так ты по-доброму интересуешься, сильно ли коллега занят на этой неделе.', uk: 'Так ти по-доброму цікавишся, чи сильно колега зайнятий цього тижня.', es: 'Así te interesas con amabilidad por si el colega está muy ocupado esta semana.' },
        commonMistake: { ru: 'Не говори do you has: после do всегда have, не has.', uk: 'Не кажи do you has: після do завжди have, не has.', es: 'No digas do you has: tras do siempre va have, no has.' },
      },
      words: [
        { text: 'Do', partOfSpeech: 'verb', distractors: ['Does', 'Are', 'Is', 'Can', 'Will'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'have', partOfSpeech: 'verb', distractors: ['has', 'want', 'keep', 'hold', 'take'] },
        { text: 'a', partOfSpeech: 'determiner', distractors: ['the', 'an', 'one', 'some', 'any'] },
        { text: 'busy', partOfSpeech: 'adjective', distractors: ['long', 'hard', 'slow', 'quiet', 'early'] },
        { text: 'week', partOfSpeech: 'noun', distractors: ['month', 'year', 'hour', 'day', 'time'] },
      ],
    },
    {
      id: 'mitap_d17_p4',
      english: 'I am good, thank you.',
      meaning: { ru: 'У меня всё хорошо, спасибо.', uk: 'У мене все добре, дякую.', es: 'Estoy bien, gracias.' },
      constructions: ['to-be', 'present-simple'],
      explanation: {
        title: { ru: 'Отвечаем «всё хорошо»', uk: 'Відповідаємо «все добре»', es: 'Respondemos «todo bien»' },
        rule: { ru: 'I am good значит «у меня всё хорошо». Thank you вежливо добавляет «спасибо».', uk: 'I am good значить «у мене все добре». Thank you ввічливо додає «дякую».', es: 'I am good significa «estoy bien». Thank you añade «gracias» con cortesía.' },
        why: { ru: 'Короткий тёплый ответ показывает, что ты настроен дружелюбно на встрече.', uk: 'Короткий теплий відповідь показує, що ти налаштований дружньо на зустрічі.', es: 'Una respuesta corta y cálida muestra que vienes con buena onda a la reunión.' },
        commonMistake: { ru: 'Не пропускай am: нужно I am good, не I good.', uk: 'Не пропускай am: потрібно I am good, не I good.', es: 'No omitas am: es I am good, no I good.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['you', 'he', 'she', 'we', 'they'] },
        { text: 'am', partOfSpeech: 'to-be', distractors: ['is', 'are', 'was', 'were', 'be'] },
        { text: 'good', partOfSpeech: 'adjective', distractors: ['late', 'busy', 'new', 'tired', 'ready'] },
        { text: 'thank', partOfSpeech: 'verb', distractors: ['help', 'call', 'tell', 'ask', 'meet'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
      ],
    },
    {
      id: 'mitap_d17_p5',
      english: 'I have a busy week.',
      meaning: { ru: 'У меня загруженная неделя.', uk: 'У мене завантажений тиждень.', es: 'Tengo una semana ocupada.' },
      constructions: ['to-have', 'present-simple'],
      explanation: {
        title: { ru: 'Говорим, что много работы', uk: 'Кажемо, що багато роботи', es: 'Decimos que hay mucho trabajo' },
        rule: { ru: 'I have значит «у меня есть». Busy week — «загруженная неделя», много дел.', uk: 'I have значить «у мене є». Busy week — «завантажений тиждень», багато справ.', es: 'I have significa «tengo». Busy week es «semana ocupada», muchas tareas.' },
        why: { ru: 'Так ты честно отвечаешь на small talk и команда понимает твою загрузку.', uk: 'Так ти чесно відповідаєш на small talk і команда розуміє твоє завантаження.', es: 'Así respondes honesto al small talk y el equipo entiende tu carga.' },
        commonMistake: { ru: 'Не говори I has: с I нужно have, а не has.', uk: 'Не кажи I has: з I потрібно have, а не has.', es: 'No digas I has: con I va have, no has.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['you', 'he', 'she', 'we', 'they'] },
        { text: 'have', partOfSpeech: 'verb', distractors: ['has', 'want', 'keep', 'hold', 'take'] },
        { text: 'a', partOfSpeech: 'determiner', distractors: ['the', 'an', 'one', 'some', 'any'] },
        { text: 'busy', partOfSpeech: 'adjective', distractors: ['long', 'hard', 'slow', 'quiet', 'early'] },
        { text: 'week', partOfSpeech: 'noun', distractors: ['month', 'year', 'hour', 'day', 'time'] },
      ],
    },
    {
      id: 'mitap_d17_p6',
      english: 'And how about you?',
      meaning: { ru: 'А у тебя как?', uk: 'А в тебе як?', es: '¿Y tú qué tal?' },
      constructions: ['wh-questions', 'present-simple-questions'],
      explanation: {
        title: { ru: 'Возвращаем вопрос', uk: 'Повертаємо питання', es: 'Devolvemos la pregunta' },
        rule: { ru: 'How about you значит «а ты как». And в начале мягко связывает с прошлой репликой.', uk: 'How about you значить «а ти як». And на початку м\'яко зв\'язує з минулою реплікою.', es: 'How about you significa «¿y tú?». And al inicio enlaza suave con lo anterior.' },
        why: { ru: 'Вернув вопрос, ты показываешь интерес и не даёшь разговору заглохнуть.', uk: 'Повернувши питання, ти показуєш інтерес і не даєш розмові згаснути.', es: 'Al devolver la pregunta muestras interés y la charla no se apaga.' },
        commonMistake: { ru: 'Не говори how about your: после about нужно you, а не your.', uk: 'Не кажи how about your: після about потрібно you, а не your.', es: 'No digas how about your: tras about va you, no your.' },
      },
      words: [
        { text: 'And', partOfSpeech: 'other', distractors: ['But', 'Or', 'So', 'Then', 'Also'] },
        { text: 'how', partOfSpeech: 'adverb', distractors: ['when', 'why', 'where', 'who', 'what'] },
        { text: 'about', partOfSpeech: 'preposition', distractors: ['with', 'for', 'from', 'over', 'near'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'going', partOfSpeech: 'verb', translation: { ru: 'идти (о делах)', uk: 'йти (про справи)', es: 'ir (las cosas)' }, example: 'How is it going?' },
    { word: 'today', partOfSpeech: 'adverb', translation: { ru: 'сегодня', uk: 'сьогодні', es: 'hoy' }, example: 'How are you today?' },
    { word: 'busy', partOfSpeech: 'adjective', translation: { ru: 'загруженный, занятой', uk: 'завантажений, зайнятий', es: 'ocupado' }, example: 'Do you have a busy week?' },
    { word: 'good', partOfSpeech: 'adjective', translation: { ru: 'хорошо', uk: 'добре', es: 'bien' }, example: 'I am good, thank you.' },
    { word: 'week', partOfSpeech: 'noun', translation: { ru: 'неделя', uk: 'тиждень', es: 'semana' }, example: 'I have a busy week.' },
    { word: 'about', partOfSpeech: 'preposition', translation: { ru: 'о, насчёт', uk: 'про, щодо', es: 'sobre, acerca de' }, example: 'And how about you?' },
  ],
};

export const MITAP_DAY_18: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 18,
  topic: { ru: 'Перейти от small talk к делу', uk: 'Перейти від small talk до справи', es: 'Pasar de la charla al trabajo' },
  outcome: {
    ru: 'Ты сможешь мягко закрыть болтовню и предложить команде начать встречу: «Okay, shall we start?» и «Let us begin».',
    uk: 'Ти зможеш м\'яко закрити балачку і запропонувати команді почати зустріч: «Okay, shall we start?» і «Let us begin».',
    es: 'Podrás cerrar la charla con suavidad y proponer al equipo empezar la reunión: «Okay, shall we start?» y «Let us begin».',
  },
  level: 'A2',
  prerequisiteLessons: [3, 10],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Мягко позови к делу: shall we', uk: 'М\'яко поклич до справи: shall we', es: 'Invita al trabajo: shall we' },
      body: {
        ru: 'Поболтали — пора к делу. Скажи shall we и слово-действие: shall we start = «может, начнём?». Это вежливое предложение, а не приказ.',
        uk: 'Побалакали — час до справи. Скажи shall we і слово-дію: shall we start = «може, почнемо?». Це ввічлива пропозиція, а не наказ.',
        es: 'Ya charlasteis, hora de trabajar. Di shall we y la acción: shall we start = «¿empezamos?». Es una propuesta amable, no una orden.',
      },
      examples: [
        { en: 'Okay, shall we start?', gloss: { ru: 'Так, может, начнём?', uk: 'Так, може, почнемо?', es: 'Bien, ¿empezamos?' } },
        { en: 'Shall we move on?', gloss: { ru: 'Может, перейдём дальше?', uk: 'Може, перейдемо далі?', es: '¿Pasamos al tema?' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Позови вместе: Let us', uk: 'Поклич разом: Let us', es: 'Propón juntos: Let us' },
      body: {
        ru: 'Let us = «давай(те)». Ставишь его перед словом-действием: let us begin = «давайте начнём». Так зовёшь команду делать что-то вместе.',
        uk: 'Let us = «давай(те)». Став його перед словом-дією: let us begin = «давайте почнемо». Так кличеш команду робити щось разом.',
        es: 'Let us = «vamos a». Va antes de la acción: let us begin = «vamos a empezar». Así invitas al equipo a hacer algo juntos.',
      },
      examples: [
        { en: 'Let us begin the meeting.', gloss: { ru: 'Давайте начнём встречу.', uk: 'Давайте почнемо зустріч.', es: 'Vamos a empezar la reunión.' } },
        { en: 'Let us look at the plan.', gloss: { ru: 'Давайте посмотрим план.', uk: 'Давайте подивимось план.', es: 'Vamos a ver el plan.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Скажи, что пора: we have work', uk: 'Скажи, що час: we have work', es: 'Di que toca: we have work' },
      body: {
        ru: 'Чтобы закрыть болтовню, назови причину. we have = «у нас есть». We have work to do = «у нас есть дела». Коротко и понятно.',
        uk: 'Щоб закрити балачку, назви причину. we have = «у нас є». We have work to do = «у нас є справи». Коротко і зрозуміло.',
        es: 'Para cerrar la charla, da el motivo. we have = «tenemos». We have work to do = «tenemos trabajo». Corto y claro.',
      },
      examples: [
        { en: 'We have work to do.', gloss: { ru: 'У нас есть дела.', uk: 'У нас є справи.', es: 'Tenemos trabajo que hacer.' } },
        { en: 'We have a full plan.', gloss: { ru: 'У нас плотный план.', uk: 'У нас щільний план.', es: 'Tenemos un plan completo.' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d18_p1',
      english: 'Okay, shall we start now?',
      meaning: { ru: 'Так, может, начнём сейчас?', uk: 'Так, може, почнемо зараз?', es: 'Bien, ¿empezamos ahora?' },
      constructions: ['modals'],
      explanation: {
        title: { ru: 'Предложи: shall we', uk: 'Запропонуй: shall we', es: 'Propón: shall we' },
        rule: { ru: 'shall we start = «может, начнём?». Сначала shall, потом we, потом действие.', uk: 'shall we start = «може, почнемо?». Спершу shall, потім we, потім дія.', es: 'shall we start = «¿empezamos?». Primero shall, luego we, luego la acción.' },
        why: { ru: 'Так ты мягко закрываешь болтовню и зовёшь начать встречу.', uk: 'Так ти м\'яко закриваєш балачку і кличеш почати зустріч.', es: 'Así cierras la charla con suavidad e invitas a empezar la reunión.' },
        commonMistake: { ru: 'Не говори we shall start? Для предложения shall идёт первым.', uk: 'Не кажи we shall start? Для пропозиції shall іде першим.', es: 'No digas we shall start? En la propuesta shall va primero.' },
      },
      words: [
        { text: 'Okay', partOfSpeech: 'other', distractors: ['Sorry', 'Please', 'Thanks', 'Hello', 'Maybe'] },
        { text: 'shall', partOfSpeech: 'modal', distractors: ['do', 'are', 'will', 'can', 'is'] },
        { text: 'we', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'it', 'they', 'I'] },
        { text: 'start', partOfSpeech: 'verb', distractors: ['cook', 'drive', 'paint', 'climb', 'bake'] },
        { text: 'now', partOfSpeech: 'adverb', distractors: ['soon', 'later', 'always', 'never', 'maybe'] },
      ],
    },
    {
      id: 'mitap_d18_p2',
      english: 'Let us begin the meeting.',
      meaning: { ru: 'Давайте начнём встречу.', uk: 'Давайте почнемо зустріч.', es: 'Vamos a empezar la reunión.' },
      constructions: ['imperative'],
      explanation: {
        title: { ru: 'Позови вместе: Let us', uk: 'Поклич разом: Let us', es: 'Invita juntos: Let us' },
        rule: { ru: 'Let us begin = «давайте начнём». begin = «начать». the meeting = «встреча».', uk: 'Let us begin = «давайте почнемо». begin = «почати». the meeting = «зустріч».', es: 'Let us begin = «vamos a empezar». begin = «empezar». the meeting = «la reunión».' },
        why: { ru: 'Этим ты вежливо зовёшь всю команду перейти к делу.', uk: 'Цим ти ввічливо кличеш усю команду перейти до справи.', es: 'Así invitas con cortesía a todo el equipo a pasar al trabajo.' },
        commonMistake: { ru: 'После Let us бери начальную форму: let us begin, а не let us begins.', uk: 'Після Let us бери початкову форму: let us begin, а не let us begins.', es: 'Tras Let us usa la forma base: let us begin, no let us begins.' },
      },
      words: [
        { text: 'Let', partOfSpeech: 'verb', distractors: ['Want', 'Take', 'Find', 'Open', 'Bring'] },
        { text: 'us', partOfSpeech: 'pronoun', distractors: ['him', 'her', 'them', 'me', 'you'] },
        { text: 'begin', partOfSpeech: 'verb', distractors: ['cook', 'drive', 'paint', 'climb', 'bake'] },
        { text: 'the', partOfSpeech: 'determiner', distractors: ['my', 'your', 'his', 'her', 'their'] },
        { text: 'meeting', partOfSpeech: 'noun', distractors: ['window', 'garden', 'spoon', 'ticket', 'pillow'] },
      ],
    },
    {
      id: 'mitap_d18_p3',
      english: 'We have work to do.',
      meaning: { ru: 'У нас есть дела.', uk: 'У нас є справи.', es: 'Tenemos trabajo que hacer.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'Назови причину: we have', uk: 'Назви причину: we have', es: 'Da el motivo: we have' },
        rule: { ru: 'we have = «у нас есть». work to do = «дела, работа». Вместе = «у нас есть дела».', uk: 'we have = «у нас є». work to do = «справи, робота». Разом = «у нас є справи».', es: 'we have = «tenemos». work to do = «trabajo que hacer». Juntos = «tenemos trabajo».' },
        why: { ru: 'Так ты мягко даёшь понять, что болтовня закончилась.', uk: 'Так ти м\'яко даєш зрозуміти, що балачка скінчилась.', es: 'Así dejas claro con suavidad que la charla terminó.' },
        commonMistake: { ru: 'Не теряй to: говори work to do, а не work do.', uk: 'Не губи to: кажи work to do, а не work do.', es: 'No pierdas to: di work to do, no work do.' },
      },
      words: [
        { text: 'We', partOfSpeech: 'pronoun', distractors: ['He', 'She', 'It', 'Anna', 'Tom'] },
        { text: 'have', partOfSpeech: 'verb', distractors: ['lose', 'find', 'keep', 'carry', 'wash'] },
        { text: 'work', partOfSpeech: 'noun', distractors: ['window', 'garden', 'spoon', 'ticket', 'pillow'] },
        { text: 'to', partOfSpeech: 'other', distractors: ['for', 'at', 'on', 'by', 'of'] },
        { text: 'do', partOfSpeech: 'verb', distractors: ['see', 'make', 'take', 'give', 'run'] },
      ],
    },
    {
      id: 'mitap_d18_p4',
      english: 'We should start now.',
      meaning: { ru: 'Нам стоит начать сейчас.', uk: 'Нам варто почати зараз.', es: 'Deberíamos empezar ahora.' },
      constructions: ['modals'],
      explanation: {
        title: { ru: 'Мягкий совет: should', uk: 'М\'яка порада: should', es: 'Consejo suave: should' },
        rule: { ru: 'should = «стоит, надо бы». we should start = «нам стоит начать».', uk: 'should = «варто, треба б». we should start = «нам варто почати».', es: 'should = «deberíamos». we should start = «deberíamos empezar».' },
        why: { ru: 'I think впереди делает фразу мягкой — это совет, не приказ.', uk: 'I think попереду робить фразу м\'якою — це порада, не наказ.', es: 'I think delante suaviza la frase: es un consejo, no una orden.' },
        commonMistake: { ru: 'После should бери начальную форму: should start, а не should starts.', uk: 'Після should бери початкову форму: should start, а не should starts.', es: 'Tras should usa la forma base: should start, no should starts.' },
      },
      words: [
        { text: 'We', partOfSpeech: 'pronoun', distractors: ['He', 'She', 'It', 'Anna', 'Tom'] },
        { text: 'should', partOfSpeech: 'modal', distractors: ['really', 'just', 'also', 'then', 'maybe'] },
        { text: 'start', partOfSpeech: 'verb', distractors: ['cook', 'drive', 'paint', 'climb', 'bake'] },
        { text: 'now', partOfSpeech: 'adverb', distractors: ['soon', 'later', 'always', 'never', 'yet'] },
      ],
    },
    {
      id: 'mitap_d18_p5',
      english: 'Let us look at the plan.',
      meaning: { ru: 'Давайте посмотрим план.', uk: 'Давайте подивимось план.', es: 'Vamos a ver el plan.' },
      constructions: ['imperative'],
      explanation: {
        title: { ru: 'Веди дальше: Let us look', uk: 'Веди далі: Let us look', es: 'Sigue: Let us look' },
        rule: { ru: 'look at = «посмотреть на». the plan = «план». Let us look at the plan = «давайте посмотрим план».', uk: 'look at = «подивитись на». the plan = «план». Let us look at the plan = «давайте подивимось план».', es: 'look at = «mirar». the plan = «el plan». Let us look at the plan = «vamos a ver el plan».' },
        why: { ru: 'Так ты переводишь команду с болтовни на конкретную задачу.', uk: 'Так ти переводиш команду з балачки на конкретне завдання.', es: 'Así llevas al equipo de la charla a una tarea concreta.' },
        commonMistake: { ru: 'Не теряй at: говори look at the plan, а не look the plan.', uk: 'Не губи at: кажи look at the plan, а не look the plan.', es: 'No pierdas at: di look at the plan, no look the plan.' },
      },
      words: [
        { text: 'Let', partOfSpeech: 'verb', distractors: ['Make', 'Help', 'Watch', 'Keep', 'Show'] },
        { text: 'us', partOfSpeech: 'pronoun', distractors: ['him', 'her', 'them', 'me', 'you'] },
        { text: 'look', partOfSpeech: 'verb', distractors: ['cook', 'drive', 'paint', 'climb', 'bake'] },
        { text: 'at', partOfSpeech: 'other', distractors: ['to', 'for', 'by', 'of', 'with'] },
        { text: 'the', partOfSpeech: 'determiner', distractors: ['my', 'your', 'his', 'her', 'their'] },
        { text: 'plan', partOfSpeech: 'noun', distractors: ['window', 'garden', 'spoon', 'ticket', 'pillow'] },
      ],
    },
    {
      id: 'mitap_d18_p6',
      english: 'Can we move to business?',
      meaning: { ru: 'Можем перейти к делу?', uk: 'Можемо перейти до справи?', es: '¿Podemos ir al grano?' },
      constructions: ['modals'],
      explanation: {
        title: { ru: 'Спроси разрешение: Can we', uk: 'Спитай дозвіл: Can we', es: 'Pide permiso: Can we' },
        rule: { ru: 'Can we move = «можем перейти?». to business = «к делу».', uk: 'Can we move = «можемо перейти?». to business = «до справи».', es: 'Can we move = «¿podemos pasar?». to business = «al grano».' },
        why: { ru: 'Вопросом с Can ты вежливо предлагаешь закончить small talk.', uk: 'Питанням з Can ти ввічливо пропонуєш закінчити small talk.', es: 'Con una pregunta con Can propones cerrar la charla con cortesía.' },
        commonMistake: { ru: 'Не говори we can move? Для вопроса Can идёт первым.', uk: 'Не кажи we can move? Для питання Can іде першим.', es: 'No digas we can move? En la pregunta Can va primero.' },
      },
      words: [
        { text: 'Can', partOfSpeech: 'modal', distractors: ['Do', 'Are', 'Have', 'Did', 'Were'] },
        { text: 'we', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'it', 'they', 'I'] },
        { text: 'move', partOfSpeech: 'verb', distractors: ['cook', 'drive', 'paint', 'climb', 'bake'] },
        { text: 'to', partOfSpeech: 'other', distractors: ['for', 'at', 'on', 'by', 'of'] },
        { text: 'business', partOfSpeech: 'noun', distractors: ['window', 'garden', 'spoon', 'ticket', 'pillow'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'shall', partOfSpeech: 'modal', translation: { ru: 'может (предложение)', uk: 'може (пропозиція)', es: '(propuesta) ¿...?' }, example: 'Okay, shall we start now?' },
    { word: 'begin', partOfSpeech: 'verb', translation: { ru: 'начать', uk: 'почати', es: 'empezar' }, example: 'Let us begin the meeting.' },
    { word: 'meeting', partOfSpeech: 'noun', translation: { ru: 'встреча', uk: 'зустріч', es: 'reunión' }, example: 'Let us begin the meeting.' },
    { word: 'work', partOfSpeech: 'noun', translation: { ru: 'дела, работа', uk: 'справи, робота', es: 'trabajo' }, example: 'We have work to do.' },
    { word: 'plan', partOfSpeech: 'noun', translation: { ru: 'план', uk: 'план', es: 'plan' }, example: 'Let us look at the plan.' },
    { word: 'business', partOfSpeech: 'noun', translation: { ru: 'дело', uk: 'справа', es: 'el grano, asunto' }, example: 'Can we move to business?' },
  ],
};

export const MITAP_DAY_19: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 19,
  topic: { ru: 'Поздравить с релизом или успехом', uk: 'Привітати з релізом або успіхом', es: 'Felicitar por un lanzamiento o un éxito' },
  outcome: {
    ru: 'Ты сможешь похвалить коллегу за хорошую работу и поздравить команду с релизом простыми фразами.',
    uk: 'Ти зможеш похвалити колегу за хорошу роботу і привітати команду з релізом простими фразами.',
    es: 'Podrás felicitar a un colega por su buen trabajo y celebrar el lanzamiento del equipo con frases sencillas.',
  },
  level: 'A2',
  prerequisiteLessons: [3, 11],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Хвалим за результат', uk: 'Хвалимо за результат', es: 'Felicitar por el resultado' },
      body: {
        ru: 'Когда команда выпустила что-то новое, скажи простое и тёплое. Начни с \'Great job\', потом назови, за что хвалишь.',
        uk: 'Коли команда випустила щось нове, скажи просте й тепле. Почни з \'Great job\', потім назви, за що хвалиш.',
        es: 'Cuando el equipo lanza algo nuevo, di algo simple y cálido. Empieza con \'Great job\' y luego di por qué.',
      },
      examples: [
        { en: 'Great job on the launch.', gloss: { ru: 'Отличная работа с релизом.', uk: 'Чудова робота з релізом.', es: 'Buen trabajo con el lanzamiento.' } },
        { en: 'Great job on the new app.', gloss: { ru: 'Отличная работа над новым приложением.', uk: 'Чудова робота над новим застосунком.', es: 'Buen trabajo con la nueva aplicación.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Говорим про прошлое', uk: 'Говоримо про минуле', es: 'Hablar del pasado' },
      body: {
        ru: 'Хвалишь за то, что уже сделано. Бери прошлую форму: work -> worked, finish -> finished. Так понятно, что всё позади.',
        uk: 'Хвалиш за те, що вже зроблено. Бери минулу форму: work -> worked, finish -> finished. Так зрозуміло, що все позаду.',
        es: 'Felicitas por algo ya hecho. Usa la forma de pasado: work -> worked, finish -> finished. Así se ve que ya terminó.',
      },
      examples: [
        { en: 'You worked hard this week.', gloss: { ru: 'Ты усердно работал на этой неделе.', uk: 'Ти старанно працював цього тижня.', es: 'Trabajaste mucho esta semana.' } },
        { en: 'The team finished the project.', gloss: { ru: 'Команда закончила проект.', uk: 'Команда закінчила проєкт.', es: 'El equipo terminó el proyecto.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Тёплое поздравление', uk: 'Тепле привітання', es: 'Una felicitación cálida' },
      body: {
        ru: 'Добавь короткое \'I am proud\' или \'We are happy\'. Это звучит по-человечески и поддерживает коллегу.',
        uk: 'Додай коротке \'I am proud\' або \'We are happy\'. Це звучить по-людськи й підтримує колегу.',
        es: 'Añade un corto \'I am proud\' o \'We are happy\'. Suena humano y apoya a tu colega.',
      },
      examples: [
        { en: 'I am proud of the team.', gloss: { ru: 'Я горжусь командой.', uk: 'Я пишаюся командою.', es: 'Estoy orgulloso del equipo.' } },
        { en: 'We are happy with the result.', gloss: { ru: 'Мы рады результату.', uk: 'Ми раді результату.', es: 'Estamos contentos con el resultado.' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d19_p1',
      english: 'Great job on the launch today.',
      meaning: { ru: 'Отличная работа с релизом сегодня.', uk: 'Чудова робота з релізом сьогодні.', es: 'Buen trabajo con el lanzamiento de hoy.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'Хвалим за дело', uk: 'Хвалимо за справу', es: 'Felicitar por algo' },
        rule: { ru: '\'Great job on\' хвалит за что-то конкретное. on -> с/за: on the launch -> за релиз.', uk: '\'Great job on\' хвалить за щось конкретне. on -> з/за: on the launch -> за реліз.', es: '\'Great job on\' felicita por algo concreto. on -> con: on the launch -> con el lanzamiento.' },
        why: { ru: 'Так ты сразу называешь, что именно понравилось, и похвала звучит искренне.', uk: 'Так ти одразу називаєш, що саме сподобалось, і похвала звучить щиро.', es: 'Así dices qué te gustó y la felicitación suena sincera.' },
        commonMistake: { ru: 'Не говори \'Great job for the launch\'. После job ставь on: Great job on.', uk: 'Не кажи \'Great job for the launch\'. Після job став on: Great job on.', es: 'No digas \'Great job for the launch\'. Tras job va on: Great job on.' },
      },
      words: [
        { text: 'Great', partOfSpeech: 'adjective', distractors: ['Slow', 'Late', 'Quiet', 'Empty', 'Heavy'] },
        { text: 'job', partOfSpeech: 'noun', distractors: ['chair', 'window', 'corner', 'floor', 'bottle'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['under', 'behind', 'near', 'above', 'between'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'my', 'this', 'some'] },
        { text: 'launch', partOfSpeech: 'noun', distractors: ['window', 'garden', 'river', 'kitchen', 'corner'] },
        { text: 'today', partOfSpeech: 'adverb', distractors: ['never', 'always', 'almost', 'nearly', 'quite'] },
      ],
    },
    {
      id: 'mitap_d19_p2',
      english: 'You worked very hard this week.',
      meaning: { ru: 'Ты очень усердно работал на этой неделе.', uk: 'Ти дуже старанно працював цього тижня.', es: 'Trabajaste muy duro esta semana.' },
      constructions: ['past-simple-regular'],
      explanation: {
        title: { ru: 'Про прошлую работу', uk: 'Про минулу роботу', es: 'Sobre el trabajo pasado' },
        rule: { ru: 'work становится worked, когда дело уже позади. worked -> работал. Хвалишь за уже сделанное.', uk: 'work стає worked, коли справа вже позаду. worked -> працював. Хвалиш за вже зроблене.', es: 'work se vuelve worked cuando ya terminó. worked -> trabajaste. Felicitas por lo hecho.' },
        why: { ru: 'Форма worked показывает: работа была раньше, и теперь ты её хвалишь.', uk: 'Форма worked показує: робота була раніше, і тепер ти її хвалиш.', es: 'La forma worked muestra que el trabajo fue antes y ahora lo elogias.' },
        commonMistake: { ru: 'Не говори \'You work hard yesterday\'. Про прошлое бери worked.', uk: 'Не кажи \'You work hard yesterday\'. Про минуле бери worked.', es: 'No digas \'You work hard yesterday\'. Para el pasado usa worked.' },
      },
      words: [
        { text: 'You', partOfSpeech: 'pronoun', distractors: ['He', 'She', 'It', 'They', 'We'] },
        { text: 'worked', partOfSpeech: 'verb', distractors: ['walked', 'cleaned', 'cooked', 'painted', 'danced'] },
        { text: 'very', partOfSpeech: 'adverb', distractors: ['here', 'soon', 'maybe', 'almost', 'today'] },
        { text: 'hard', partOfSpeech: 'adverb', distractors: ['loudly', 'slowly', 'quietly', 'badly', 'early'] },
        { text: 'this', partOfSpeech: 'determiner', distractors: ['each', 'every', 'any', 'some', 'one'] },
        { text: 'week', partOfSpeech: 'noun', distractors: ['garden', 'ticket', 'window', 'river', 'kitchen'] },
      ],
    },
    {
      id: 'mitap_d19_p3',
      english: 'I am really proud of the team.',
      meaning: { ru: 'Я очень горжусь командой.', uk: 'Я дуже пишаюся командою.', es: 'Estoy muy orgulloso del equipo.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'Сказать про чувство', uk: 'Сказати про почуття', es: 'Decir cómo te sientes' },
        rule: { ru: '\'I am proud of\' -> я горжусь. После proud всегда ставь of: proud of the team.', uk: '\'I am proud of\' -> я пишаюся. Після proud завжди став of: proud of the team.', es: '\'I am proud of\' -> estoy orgulloso de. Tras proud va of: proud of the team.' },
        why: { ru: 'Тёплые слова про команду делают похвалу личной и приятной коллегам.', uk: 'Теплі слова про команду роблять похвалу особистою і приємною колегам.', es: 'Palabras cálidas sobre el equipo hacen la felicitación personal y grata.' },
        commonMistake: { ru: 'Не говори \'proud for the team\'. После proud только of: proud of.', uk: 'Не кажи \'proud for the team\'. Після proud лише of: proud of.', es: 'No digas \'proud for the team\'. Tras proud solo of: proud of.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['He', 'She', 'It', 'They', 'We'] },
        { text: 'am', partOfSpeech: 'to-be', distractors: ['do', 'has', 'be', 'been', 'go'] },
        { text: 'really', partOfSpeech: 'adverb', distractors: ['here', 'soon', 'maybe', 'today', 'slowly'] },
        { text: 'proud', partOfSpeech: 'adjective', distractors: ['quiet', 'empty', 'heavy', 'late', 'slow'] },
        { text: 'of', partOfSpeech: 'preposition', distractors: ['under', 'behind', 'near', 'above', 'between'] },
        { text: 'team', partOfSpeech: 'noun', distractors: ['window', 'garden', 'ticket', 'river', 'kitchen'] },
      ],
    },
    {
      id: 'mitap_d19_p4',
      english: 'The team finished the project on time.',
      meaning: { ru: 'Команда закончила проект вовремя.', uk: 'Команда закінчила проєкт вчасно.', es: 'El equipo terminó el proyecto a tiempo.' },
      constructions: ['past-simple-regular'],
      explanation: {
        title: { ru: 'Дело сделано', uk: 'Справу зроблено', es: 'Trabajo hecho' },
        rule: { ru: 'finish становится finished про готовое дело. finished -> закончил. on time -> вовремя.', uk: 'finish стає finished про готову справу. finished -> закінчив. on time -> вчасно.', es: 'finish se vuelve finished para algo hecho. finished -> terminó. on time -> a tiempo.' },
        why: { ru: 'Так ты хвалишь за конкретный результат: проект готов и сдан вовремя.', uk: 'Так ти хвалиш за конкретний результат: проєкт готовий і зданий вчасно.', es: 'Así felicitas por un resultado claro: el proyecto listo y a tiempo.' },
        commonMistake: { ru: 'Не говори \'The team finish the project\'. Про прошлое бери finished.', uk: 'Не кажи \'The team finish the project\'. Про минуле бери finished.', es: 'No digas \'The team finish the project\'. Para el pasado usa finished.' },
      },
      words: [
        { text: 'The', partOfSpeech: 'article', distractors: ['A', 'An', 'My', 'This', 'Some'] },
        { text: 'team', partOfSpeech: 'noun', distractors: ['window', 'garden', 'ticket', 'river', 'kitchen'] },
        { text: 'finished', partOfSpeech: 'verb', distractors: ['cleaned', 'painted', 'cooked', 'walked', 'danced'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'my', 'this', 'some'] },
        { text: 'project', partOfSpeech: 'noun', distractors: ['window', 'garden', 'ticket', 'river', 'kitchen'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['at', 'by', 'of', 'off', 'up'] },
        { text: 'time', partOfSpeech: 'noun', distractors: ['budget', 'track', 'schedule', 'plan', 'target'] },
      ],
    },
    {
      id: 'mitap_d19_p5',
      english: 'We are very happy with the result.',
      meaning: { ru: 'Мы очень рады результату.', uk: 'Ми дуже раді результату.', es: 'Estamos muy contentos con el resultado.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'Радуемся вместе', uk: 'Радіємо разом', es: 'Alegrarse juntos' },
        rule: { ru: '\'happy with\' -> рад чему-то. После happy ставь with: happy with the result.', uk: '\'happy with\' -> радий чомусь. Після happy став with: happy with the result.', es: '\'happy with\' -> contento con. Tras happy va with: happy with the result.' },
        why: { ru: 'Слово \'we\' включает всех: ты радуешься вместе с командой, не только за себя.', uk: 'Слово \'we\' включає всіх: ти радієш разом з командою, не лише за себе.', es: 'La palabra \'we\' incluye a todos: te alegras con el equipo, no solo tú.' },
        commonMistake: { ru: 'Не говори \'happy from the result\'. После happy ставь with.', uk: 'Не кажи \'happy from the result\'. Після happy став with.', es: 'No digas \'happy from the result\'. Tras happy va with.' },
      },
      words: [
        { text: 'We', partOfSpeech: 'pronoun', distractors: ['He', 'She', 'It', 'They', 'I'] },
        { text: 'are', partOfSpeech: 'to-be', distractors: ['do', 'has', 'been', 'be', 'go'] },
        { text: 'very', partOfSpeech: 'adverb', distractors: ['here', 'soon', 'maybe', 'today', 'almost'] },
        { text: 'happy', partOfSpeech: 'adjective', distractors: ['quiet', 'empty', 'heavy', 'late', 'slow'] },
        { text: 'with', partOfSpeech: 'preposition', distractors: ['under', 'behind', 'near', 'above', 'between'] },
        { text: 'result', partOfSpeech: 'noun', distractors: ['window', 'garden', 'ticket', 'river', 'kitchen'] },
      ],
    },
    {
      id: 'mitap_d19_p6',
      english: 'You helped us a lot today.',
      meaning: { ru: 'Ты сегодня нам очень помог.', uk: 'Ти сьогодні нам дуже допоміг.', es: 'Hoy nos ayudaste mucho.' },
      constructions: ['past-simple-regular'],
      explanation: {
        title: { ru: 'Спасибо за помощь', uk: 'Дякую за допомогу', es: 'Gracias por la ayuda' },
        rule: { ru: 'help становится helped про прошлую помощь. helped -> помог. a lot -> очень, много.', uk: 'help стає helped про минулу допомогу. helped -> допоміг. a lot -> дуже, багато.', es: 'help se vuelve helped para ayuda pasada. helped -> ayudaste. a lot -> mucho.' },
        why: { ru: 'Признать помощь коллеги вслух важно: человек видит, что его вклад заметили.', uk: 'Визнати допомогу колеги вголос важливо: людина бачить, що її внесок помітили.', es: 'Reconocer la ayuda en voz alta importa: la persona ve que la notaron.' },
        commonMistake: { ru: 'Не говори \'You help us yesterday\'. Про прошлое бери helped.', uk: 'Не кажи \'You help us yesterday\'. Про минуле бери helped.', es: 'No digas \'You help us yesterday\'. Para el pasado usa helped.' },
      },
      words: [
        { text: 'You', partOfSpeech: 'pronoun', distractors: ['He', 'She', 'It', 'They', 'We'] },
        { text: 'helped', partOfSpeech: 'verb', distractors: ['cleaned', 'painted', 'cooked', 'walked', 'danced'] },
        { text: 'us', partOfSpeech: 'pronoun', distractors: ['him', 'her', 'them', 'me', 'it'] },
        { text: 'a', partOfSpeech: 'determiner', distractors: ['the', 'one', 'this', 'that', 'some'] },
        { text: 'lot', partOfSpeech: 'noun', distractors: ['bit', 'ton', 'heap', 'load', 'pile'] },
        { text: 'today', partOfSpeech: 'adverb', distractors: ['almost', 'badly', 'loudly', 'nearly', 'quite'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'Great', partOfSpeech: 'adjective', translation: { ru: 'отличный, классный', uk: 'чудовий, класний', es: 'genial, estupendo' }, example: 'Great job on the launch today.' },
    { word: 'worked', partOfSpeech: 'verb', translation: { ru: 'работал (прошлое от work)', uk: 'працював (минуле від work)', es: 'trabajaste (pasado de work)' }, example: 'You worked very hard this week.' },
    { word: 'proud', partOfSpeech: 'adjective', translation: { ru: 'гордый, горжусь', uk: 'гордий, пишаюся', es: 'orgulloso' }, example: 'I am really proud of the team.' },
    { word: 'finished', partOfSpeech: 'verb', translation: { ru: 'закончил (прошлое от finish)', uk: 'закінчив (минуле від finish)', es: 'terminó (pasado de finish)' }, example: 'The team finished the project on time.' },
    { word: 'happy', partOfSpeech: 'adjective', translation: { ru: 'рад, счастливый', uk: 'радий, щасливий', es: 'contento, feliz' }, example: 'We are very happy with the result.' },
    { word: 'helped', partOfSpeech: 'verb', translation: { ru: 'помог (прошлое от help)', uk: 'допоміг (минуле від help)', es: 'ayudaste (pasado de help)' }, example: 'You helped us a lot today.' },
  ],
};

export const MITAP_DAY_20: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 20,
  topic: { ru: 'Спросить про планы на день', uk: 'Запитати про плани на день', es: 'Preguntar sobre los planes del día' },
  outcome: {
    ru: 'Ты сможешь спросить коллегу, что у него в планах на сегодня, и узнать, чем он занят.',
    uk: 'Ти зможеш запитати колегу, що в нього в планах на сьогодні, і дізнатися, чим він зайнятий.',
    es: 'Podrás preguntar a un compañero qué tiene en su lista para hoy y saber en qué está ocupado.',
  },
  level: 'A2',
  prerequisiteLessons: [5, 8],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Простой вопрос о делах', uk: 'Просте питання про справи', es: 'Una pregunta simple sobre tareas' },
      body: {
        ru: 'Чтобы спросить про дела на день, начни с What. Дальше ставь do и you. Так получается короткий и вежливый вопрос коллеге.',
        uk: 'Щоб запитати про справи на день, почни з What. Далі став do і you. Так виходить коротке й ввічливе питання колезі.',
        es: 'Para preguntar por las tareas del día, empieza con What. Luego pon do y you. Así sale una pregunta corta y cortés para un compañero.',
      },
      examples: [
        { en: 'What do you do today?', gloss: { ru: 'Что ты делаешь сегодня?', uk: 'Що ти робиш сьогодні?', es: '¿Qué haces hoy?' } },
        { en: 'What is on your list today?', gloss: { ru: 'Что у тебя в списке на сегодня?', uk: 'Що в тебе у списку на сьогодні?', es: '¿Qué hay en tu lista para hoy?' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Слова про время', uk: 'Слова про час', es: 'Palabras sobre el tiempo' },
      body: {
        ru: 'Время дня ставь со словом at: at nine. Сегодня скажи одним словом today. Эти слова идут в конце вопроса.',
        uk: 'Час дня став зі словом at: at nine. Сьогодні скажи одним словом today. Ці слова йдуть у кінці питання.',
        es: 'La hora del día va con la palabra at: at nine. Hoy se dice con today. Estas palabras van al final de la pregunta.',
      },
      examples: [
        { en: 'Do you have a call at nine?', gloss: { ru: 'У тебя есть созвон в девять?', uk: 'У тебе є дзвінок о дев\'ятій?', es: '¿Tienes una llamada a las nueve?' } },
        { en: 'Are you busy in the morning?', gloss: { ru: 'Ты занят утром?', uk: 'Ти зайнятий зранку?', es: '¿Estás ocupado por la mañana?' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Покажи, что слушаешь', uk: 'Покажи, що слухаєш', es: 'Muestra que escuchas' },
      body: {
        ru: 'После ответа коллеги можно мягко уточнить: When do you start? Слово when спрашивает про время. Это держит разговор живым.',
        uk: 'Після відповіді колеги можна м\'яко уточнити: When do you start? Слово when питає про час. Це тримає розмову живою.',
        es: 'Tras la respuesta, puedes precisar con suavidad: When do you start? La palabra when pregunta por el tiempo. Así la charla sigue viva.',
      },
      examples: [
        { en: 'When do you start the meeting?', gloss: { ru: 'Когда ты начинаешь встречу?', uk: 'Коли ти починаєш зустріч?', es: '¿Cuándo empiezas la reunión?' } },
        { en: 'What do you plan for today?', gloss: { ru: 'Что ты планируешь на сегодня?', uk: 'Що ти плануєш на сьогодні?', es: '¿Qué planeas para hoy?' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d20_p1',
      english: 'What is on your list today?',
      meaning: { ru: 'Что у тебя в списке на сегодня?', uk: 'Що в тебе у списку на сьогодні?', es: '¿Qué hay en tu lista para hoy?' },
      constructions: ['present-simple-questions', 'prepositions-time'],
      explanation: {
        title: { ru: 'Что в списке', uk: 'Що у списку', es: 'Qué hay en la lista' },
        rule: { ru: 'Спрашиваешь про дела дня так: What is on your list. Слово list значит список.', uk: 'Питаєш про справи дня так: What is on your list. Слово list означає список.', es: 'Preguntas por las tareas del día así: What is on your list. La palabra list significa lista.' },
        why: { ru: 'Это тёплый способ узнать, чем занят коллега, без давления и лишних слов.', uk: 'Це теплий спосіб дізнатися, чим зайнятий колега, без тиску й зайвих слів.', es: 'Es una forma cálida de saber en qué está el compañero, sin presión ni palabras de más.' },
        commonMistake: { ru: 'Не говори What on your list. Без слова is вопрос звучит обрублено.', uk: 'Не кажи What on your list. Без слова is питання звучить обрубано.', es: 'No digas What on your list. Sin la palabra is la pregunta suena cortada.' },
      },
      words: [
        { text: 'What', partOfSpeech: 'adverb', distractors: ['Where', 'When', 'Why', 'How', 'Who'] },
        { text: 'is', partOfSpeech: 'to-be', distractors: ['are', 'am', 'was', 'were', 'be'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['by', 'up', 'off', 'of', 'for'] },
        { text: 'your', partOfSpeech: 'determiner', distractors: ['my', 'his', 'her', 'our', 'their'] },
        { text: 'list', partOfSpeech: 'noun', distractors: ['plan', 'task', 'goal', 'note', 'board'] },
        { text: 'today', partOfSpeech: 'adverb', distractors: ['now', 'soon', 'here', 'late', 'early'] },
      ],
    },
    {
      id: 'mitap_d20_p2',
      english: 'What do you plan for today?',
      meaning: { ru: 'Что ты планируешь на сегодня?', uk: 'Що ти плануєш на сьогодні?', es: '¿Qué planeas para hoy?' },
      constructions: ['present-simple-questions', 'prepositions-time'],
      explanation: {
        title: { ru: 'Вопрос с do', uk: 'Питання з do', es: 'Pregunta con do' },
        rule: { ru: 'Чтобы спросить про действие, ставь do you перед словом plan. Plan значит планировать.', uk: 'Щоб запитати про дію, став do you перед словом plan. Plan означає планувати.', es: 'Para preguntar por la acción, pon do you antes de plan. Plan significa planear.' },
        why: { ru: 'Так ты спрашиваешь живо и прямо, как коллеги в обычном созвоне.', uk: 'Так ти питаєш живо й прямо, як колеги у звичайному дзвінку.', es: 'Así preguntas de forma viva y directa, como los compañeros en una llamada normal.' },
        commonMistake: { ru: 'Не говори What you plan. Без do вопрос звучит не по-английски.', uk: 'Не кажи What you plan. Без do питання звучить не по-англійськи.', es: 'No digas What you plan. Sin do la pregunta no suena en inglés.' },
      },
      words: [
        { text: 'What', partOfSpeech: 'adverb', distractors: ['Where', 'When', 'Why', 'How', 'Who'] },
        { text: 'do', partOfSpeech: 'verb', distractors: ['does', 'did', 'doing', 'make', 'have'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'plan', partOfSpeech: 'verb', distractors: ['keep', 'write', 'hold', 'bring', 'reach'] },
        { text: 'for', partOfSpeech: 'preposition', distractors: ['at', 'on', 'in', 'to', 'of'] },
        { text: 'today', partOfSpeech: 'adverb', distractors: ['now', 'soon', 'here', 'late', 'early'] },
      ],
    },
    {
      id: 'mitap_d20_p3',
      english: 'Do you have a call at nine?',
      meaning: { ru: 'У тебя есть созвон в девять?', uk: 'У тебе є дзвінок о дев\'ятій?', es: '¿Tienes una llamada a las nueve?' },
      constructions: ['present-simple-questions', 'prepositions-time'],
      explanation: {
        title: { ru: 'Время со словом at', uk: 'Час зі словом at', es: 'La hora con at' },
        rule: { ru: 'Время дня ставь после at: at nine. Слово call значит созвон.', uk: 'Час дня став після at: at nine. Слово call означає дзвінок.', es: 'La hora del día va tras at: at nine. La palabra call significa llamada.' },
        why: { ru: 'Так ты узнаёшь, занят ли коллега в нужный час, и не мешаешь ему.', uk: 'Так ти дізнаєшся, чи зайнятий колега в потрібний час, і не заважаєш йому.', es: 'Así sabes si el compañero está ocupado a esa hora y no le molestas.' },
        commonMistake: { ru: 'Не говори call in nine. Время дня идёт со словом at.', uk: 'Не кажи call in nine. Час дня йде зі словом at.', es: 'No digas call in nine. La hora del día va con at.' },
      },
      words: [
        { text: 'Do', partOfSpeech: 'verb', distractors: ['Does', 'Did', 'Doing', 'Make', 'Have'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'have', partOfSpeech: 'verb', distractors: ['take', 'keep', 'hold', 'make', 'give'] },
        { text: 'a', partOfSpeech: 'determiner', distractors: ['an', 'the', 'one', 'any', 'some'] },
        { text: 'call', partOfSpeech: 'noun', distractors: ['chat', 'talk', 'note', 'room', 'desk'] },
        { text: 'at', partOfSpeech: 'preposition', distractors: ['in', 'on', 'to', 'of', 'by'] },
        { text: 'nine', partOfSpeech: 'determiner', distractors: ['five', 'six', 'seven', 'eight', 'ten'] },
      ],
    },
    {
      id: 'mitap_d20_p4',
      english: 'When do you start the meeting?',
      meaning: { ru: 'Когда ты начинаешь встречу?', uk: 'Коли ти починаєш зустріч?', es: '¿Cuándo empiezas la reunión?' },
      constructions: ['present-simple-questions', 'wh-questions'],
      explanation: {
        title: { ru: 'Вопрос когда', uk: 'Питання коли', es: 'Pregunta cuándo' },
        rule: { ru: 'Слово when спрашивает про время. Дальше ставь do you start.', uk: 'Слово when питає про час. Далі став do you start.', es: 'La palabra when pregunta por el tiempo. Luego pon do you start.' },
        why: { ru: 'Так ты узнаёшь точное время встречи и сам ничего не пропустишь.', uk: 'Так ти дізнаєшся точний час зустрічі й сам нічого не пропустиш.', es: 'Así sabes la hora exacta de la reunión y no te pierdes nada.' },
        commonMistake: { ru: 'Не говори When you start. Слово do нужно сразу после when.', uk: 'Не кажи When you start. Слово do потрібне одразу після when.', es: 'No digas When you start. La palabra do va justo tras when.' },
      },
      words: [
        { text: 'When', partOfSpeech: 'adverb', distractors: ['Where', 'What', 'Why', 'How', 'Who'] },
        { text: 'do', partOfSpeech: 'verb', distractors: ['does', 'did', 'doing', 'make', 'have'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'start', partOfSpeech: 'verb', distractors: ['sleep', 'cook', 'drive', 'wash', 'paint'] },
        { text: 'the', partOfSpeech: 'determiner', distractors: ['a', 'an', 'this', 'that', 'some'] },
        { text: 'meeting', partOfSpeech: 'noun', distractors: ['window', 'chair', 'door', 'floor', 'wall'] },
      ],
    },
    {
      id: 'mitap_d20_p5',
      english: 'Are you busy in the morning?',
      meaning: { ru: 'Ты занят утром?', uk: 'Ти зайнятий зранку?', es: '¿Estás ocupado por la mañana?' },
      constructions: ['to-be-questions', 'prepositions-time'],
      explanation: {
        title: { ru: 'Занят или нет', uk: 'Зайнятий чи ні', es: 'Ocupado o no' },
        rule: { ru: 'Спрашивай Are you busy. Часть дня ставь со словом in: in the morning.', uk: 'Питай Are you busy. Частину дня став зі словом in: in the morning.', es: 'Pregunta Are you busy. La parte del día va con in: in the morning.' },
        why: { ru: 'Так ты вежливо проверяешь, есть ли у коллеги время на тебя.', uk: 'Так ти ввічливо перевіряєш, чи є в колеги час на тебе.', es: 'Así compruebas con cortesía si el compañero tiene tiempo para ti.' },
        commonMistake: { ru: 'Не говори busy at morning. Часть дня идёт со словом in.', uk: 'Не кажи busy at morning. Частина дня йде зі словом in.', es: 'No digas busy at morning. La parte del día va con in.' },
      },
      words: [
        { text: 'Are', partOfSpeech: 'to-be', distractors: ['Is', 'Am', 'Was', 'Were', 'Be'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'busy', partOfSpeech: 'adjective', distractors: ['happy', 'ready', 'tired', 'calm', 'glad'] },
        { text: 'in', partOfSpeech: 'preposition', distractors: ['at', 'on', 'to', 'of', 'by'] },
        { text: 'the', partOfSpeech: 'determiner', distractors: ['a', 'an', 'this', 'that', 'some'] },
        { text: 'morning', partOfSpeech: 'noun', distractors: ['evening', 'week', 'office', 'desk', 'hour'] },
      ],
    },
    {
      id: 'mitap_d20_p6',
      english: 'Tell me about your day.',
      meaning: { ru: 'Расскажи мне про свой день.', uk: 'Розкажи мені про свій день.', es: 'Cuéntame sobre tu día.' },
      constructions: ['imperative'],
      explanation: {
        title: { ru: 'Мягкая просьба', uk: 'М\'яке прохання', es: 'Petición suave' },
        rule: { ru: 'Начни с глагола Tell, чтобы попросить. Дальше me about your day.', uk: 'Почни з дієслова Tell, щоб попросити. Далі me about your day.', es: 'Empieza con el verbo Tell para pedir. Luego me about your day.' },
        why: { ru: 'Так ты открываешь тёплый разговор и показываешь интерес к коллеге.', uk: 'Так ти відкриваєш теплу розмову й показуєш інтерес до колеги.', es: 'Así abres una charla cálida y muestras interés por el compañero.' },
        commonMistake: { ru: 'Не говори Tell about my day. Сначала me, потом about your day.', uk: 'Не кажи Tell about my day. Спершу me, потім about your day.', es: 'No digas Tell about my day. Primero me, luego about your day.' },
      },
      words: [
        { text: 'Tell', partOfSpeech: 'verb', distractors: ['Open', 'Bring', 'Close', 'Carry', 'Wash'] },
        { text: 'me', partOfSpeech: 'pronoun', distractors: ['us', 'him', 'her', 'them', 'it'] },
        { text: 'about', partOfSpeech: 'preposition', distractors: ['on', 'at', 'for', 'with', 'of'] },
        { text: 'your', partOfSpeech: 'determiner', distractors: ['my', 'his', 'her', 'our', 'their'] },
        { text: 'day', partOfSpeech: 'noun', distractors: ['week', 'hour', 'time', 'plan', 'task'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'list', partOfSpeech: 'noun', translation: { ru: 'список', uk: 'список', es: 'lista' }, example: 'What is on your list today?' },
    { word: 'plan', partOfSpeech: 'verb', translation: { ru: 'планировать', uk: 'планувати', es: 'planear' }, example: 'What do you plan for today?' },
    { word: 'call', partOfSpeech: 'noun', translation: { ru: 'созвон', uk: 'дзвінок', es: 'llamada' }, example: 'Do you have a call at nine?' },
    { word: 'meeting', partOfSpeech: 'noun', translation: { ru: 'встреча', uk: 'зустріч', es: 'reunión' }, example: 'When do you start the meeting?' },
    { word: 'busy', partOfSpeech: 'adjective', translation: { ru: 'занятый', uk: 'зайнятий', es: 'ocupado' }, example: 'Are you busy in the morning?' },
    { word: 'day', partOfSpeech: 'noun', translation: { ru: 'день', uk: 'день', es: 'día' }, example: 'Tell me about your day.' },
  ],
};

export const MITAP_DAY_21: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 21,
  topic: { ru: 'Повторение недели 3: разогреться перед встречей', uk: 'Повторення тижня 3: розігрітися перед зустріччю', es: 'Repaso de la semana 3: calentar antes de la reunión' },
  outcome: {
    ru: 'Ты сможешь начать созвон с лёгкого разговора о выходных и погоде, а потом перейти к делу.',
    uk: 'Ти зможеш почати дзвінок з легкої розмови про вихідні й погоду, а потім перейти до справи.',
    es: 'Podrás empezar la llamada con una charla ligera sobre el fin de semana y el clima, y luego ir al grano.',
  },
  level: 'A2',
  prerequisiteLessons: [10, 11],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Спроси про выходные', uk: 'Запитай про вихідні', es: 'Pregunta por el fin de semana' },
      body: {
        ru: 'Созвон начни с лёгкого. Спроси "How was your weekend?" Слово "was" — это "был". Так разговор теплеет ещё до дел.',
        uk: 'Дзвінок почни з легкого. Запитай "How was your weekend?" Слово "was" — це "був". Так розмова теплішає ще до справ.',
        es: 'Empieza la llamada con algo ligero. Pregunta "How was your weekend?" La palabra "was" significa "fue". Así la charla se calienta antes del trabajo.',
      },
      examples: [
        { en: 'How was your weekend?', gloss: { ru: 'Как прошли твои выходные?', uk: 'Як минули твої вихідні?', es: '¿Qué tal tu fin de semana?' } },
        { en: 'I watched a good movie.', gloss: { ru: 'Я посмотрел хороший фильм.', uk: 'Я подивився гарний фільм.', es: 'Vi una buena película.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Поговори про погоду', uk: 'Поговори про погоду', es: 'Habla del clima' },
      body: {
        ru: 'Погода — лёгкая тема для старта. Скажи "The weather is nice today". Слово "weather" значит "погода". Пара фраз — и вы уже на одной волне.',
        uk: 'Погода — легка тема для старту. Скажи "The weather is nice today". Слово "weather" означає "погода". Пара фраз — і ви вже на одній хвилі.',
        es: 'El clima es un tema fácil para empezar. Di "The weather is nice today". La palabra "weather" significa "clima". Un par de frases y ya conectan.',
      },
      examples: [
        { en: 'The weather is nice today.', gloss: { ru: 'Погода сегодня хорошая.', uk: 'Погода сьогодні гарна.', es: 'El clima está agradable hoy.' } },
        { en: 'It rained all weekend here.', gloss: { ru: 'Тут все выходные шёл дождь.', uk: 'Тут усі вихідні йшов дощ.', es: 'Llovió todo el fin de semana aquí.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Перейди к делу', uk: 'Перейди до справи', es: 'Ve al grano' },
      body: {
        ru: 'После лёгкой болтовни мягко переходи к делу. Скажи "Let\'s start the meeting" или "Can we begin?". Слово "start" значит "начать".',
        uk: 'Після легкої балачки м\'яко переходь до справи. Скажи "Let\'s start the meeting" або "Can we begin?". Слово "start" означає "почати".',
        es: 'Tras la charla ligera, pasa con calma al trabajo. Di "Let\'s start the meeting" o "Can we begin?". La palabra "start" significa "empezar".',
      },
      examples: [
        { en: 'Let\'s start the meeting now.', gloss: { ru: 'Давай начнём встречу сейчас.', uk: 'Давай почнемо зустріч зараз.', es: 'Empecemos la reunión ahora.' } },
        { en: 'Can we begin the call?', gloss: { ru: 'Мы можем начать созвон?', uk: 'Ми можемо почати дзвінок?', es: '¿Podemos empezar la llamada?' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d21_p1',
      english: 'How was your weekend?',
      meaning: { ru: 'Как прошли твои выходные?', uk: 'Як минули твої вихідні?', es: '¿Qué tal tu fin de semana?' },
      constructions: ['wh-questions'],
      explanation: {
        title: { ru: 'was — был', uk: 'was — був', es: 'was — fue' },
        rule: { ru: 'Слово "was" значит "был". "weekend" значит "выходные". How was your weekend — как прошли выходные.', uk: 'Слово "was" означає "був". "weekend" означає "вихідні". How was your weekend — як минули вихідні.', es: 'La palabra "was" significa "fue". "weekend" significa "fin de semana". How was your weekend — qué tal el fin de semana.' },
        why: { ru: 'С этого вопроса легко начать созвон по-человечески, до самих дел.', uk: 'З цього питання легко почати дзвінок по-людськи, до самих справ.', es: 'Con esta pregunta empiezas la llamada de forma humana, antes del trabajo.' },
        commonMistake: { ru: 'Не говори "How is your weekend?". Выходные уже прошли — нужно "was".', uk: 'Не кажи "How is your weekend?". Вихідні вже минули — потрібно "was".', es: 'No digas "How is your weekend?". El fin de semana ya pasó — usa "was".' },
      },
      words: [
        { text: 'How', partOfSpeech: 'adverb', distractors: ['Whose', 'Which', 'Why', 'Who', 'When'] },
        { text: 'was', partOfSpeech: 'to-be', distractors: ['were', 'is', 'are', 'am', 'be'] },
        { text: 'your', partOfSpeech: 'determiner', distractors: ['his', 'her', 'their', 'our', 'its'] },
        { text: 'weekend', partOfSpeech: 'noun', distractors: ['meeting', 'office', 'laptop', 'report', 'email'] },
      ],
    },
    {
      id: 'mitap_d21_p2',
      english: 'I watched a good movie.',
      meaning: { ru: 'Я посмотрел хороший фильм.', uk: 'Я подивився гарний фільм.', es: 'Vi una buena película.' },
      constructions: ['past-simple-regular'],
      explanation: {
        title: { ru: 'watched — посмотрел', uk: 'watched — подивився', es: 'watched — vi' },
        rule: { ru: '"watched" значит "посмотрел". Хвостик "-ed" говорит, что это уже было. watch + ed — посмотрел.', uk: '"watched" означає "подивився". Хвостик "-ed" каже, що це вже було. watch + ed — подивився.', es: '"watched" significa "vi". La cola "-ed" dice que ya pasó. watch + ed — vi.' },
        why: { ru: 'Так ты отвечаешь про выходные и поддерживаешь тёплый разговор перед делом.', uk: 'Так ти відповідаєш про вихідні й підтримуєш теплу розмову перед справою.', es: 'Así respondes sobre el fin de semana y mantienes la charla cálida antes del trabajo.' },
        commonMistake: { ru: 'Не говори "I watch a movie" про вчера. Про прошлое нужно "watched".', uk: 'Не кажи "I watch a movie" про вчора. Про минуле потрібно "watched".', es: 'No digas "I watch a movie" sobre ayer. Para el pasado usa "watched".' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'you'] },
        { text: 'watched', partOfSpeech: 'verb', distractors: ['booked', 'called', 'joined', 'planned', 'opened'] },
        { text: 'a', partOfSpeech: 'determiner', distractors: ['my', 'this', 'one', 'your', 'that'] },
        { text: 'good', partOfSpeech: 'adjective', distractors: ['quiet', 'busy', 'early', 'red', 'round'] },
        { text: 'movie', partOfSpeech: 'noun', distractors: ['report', 'email', 'lunch', 'walk', 'game'] },
      ],
    },
    {
      id: 'mitap_d21_p3',
      english: 'The weather is nice today.',
      meaning: { ru: 'Погода сегодня хорошая.', uk: 'Погода сьогодні гарна.', es: 'El clima está agradable hoy.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'weather — погода', uk: 'weather — погода', es: 'weather — clima' },
        rule: { ru: '"weather" значит "погода". "nice" значит "хорошая, приятная". The weather is nice — погода хорошая.', uk: '"weather" означає "погода". "nice" означає "гарна, приємна". The weather is nice — погода гарна.', es: '"weather" significa "clima". "nice" significa "agradable". The weather is nice — el clima está agradable.' },
        why: { ru: 'Погода — безопасная тема, чтобы согреть начало любого созвона.', uk: 'Погода — безпечна тема, щоб зігріти початок будь-якого дзвінка.', es: 'El clima es un tema seguro para calentar el inicio de cualquier llamada.' },
        commonMistake: { ru: 'Не говори "weather are nice". Погода одна — нужно "is".', uk: 'Не кажи "weather are nice". Погода одна — потрібно "is".', es: 'No digas "weather are nice". El clima es uno — usa "is".' },
      },
      words: [
        { text: 'The', partOfSpeech: 'determiner', distractors: ['My', 'One', 'This', 'Some', 'That'] },
        { text: 'weather', partOfSpeech: 'noun', distractors: ['traffic', 'office', 'coffee', 'morning', 'city'] },
        { text: 'is', partOfSpeech: 'to-be', distractors: ['are', 'am', 'was', 'were', 'be'] },
        { text: 'nice', partOfSpeech: 'adjective', distractors: ['tall', 'loud', 'hungry', 'angry', 'empty'] },
        { text: 'today', partOfSpeech: 'adverb', distractors: ['soon', 'later', 'then', 'early', 'outside'] },
      ],
    },
    {
      id: 'mitap_d21_p4',
      english: 'It rained all weekend here.',
      meaning: { ru: 'Тут все выходные шёл дождь.', uk: 'Тут усі вихідні йшов дощ.', es: 'Llovió todo el fin de semana aquí.' },
      constructions: ['past-simple-regular'],
      explanation: {
        title: { ru: 'rained — шёл дождь', uk: 'rained — йшов дощ', es: 'rained — llovió' },
        rule: { ru: '"rained" значит "шёл дождь". Хвостик "-ed" — это про прошлое. rain + ed — шёл дождь.', uk: '"rained" означає "йшов дощ". Хвостик "-ed" — це про минуле. rain + ed — йшов дощ.', es: '"rained" significa "llovió". La cola "-ed" es para el pasado. rain + ed — llovió.' },
        why: { ru: 'Так ты делишься, какими были выходные, и разговор течёт сам.', uk: 'Так ти ділишся, якими були вихідні, і розмова тече сама.', es: 'Así compartes cómo fue tu fin de semana y la charla fluye sola.' },
        commonMistake: { ru: 'Не говори "It rain all weekend" про прошлое. Нужно "rained".', uk: 'Не кажи "It rain all weekend" про минуле. Потрібно "rained".', es: 'No digas "It rain all weekend" sobre el pasado. Usa "rained".' },
      },
      words: [
        { text: 'It', partOfSpeech: 'pronoun', distractors: ['He', 'She', 'We', 'They', 'You'] },
        { text: 'rained', partOfSpeech: 'verb', distractors: ['worked', 'stayed', 'waited', 'cooked', 'walked'] },
        { text: 'all', partOfSpeech: 'determiner', distractors: ['much', 'many', 'some', 'no', 'any'] },
        { text: 'weekend', partOfSpeech: 'noun', distractors: ['morning', 'holiday', 'evening', 'meeting', 'lunch'] },
        { text: 'here', partOfSpeech: 'adverb', distractors: ['now', 'soon', 'then', 'outside', 'early'] },
      ],
    },
    {
      id: 'mitap_d21_p5',
      english: 'Let\'s start the meeting now.',
      meaning: { ru: 'Давай начнём встречу сейчас.', uk: 'Давай почнемо зустріч зараз.', es: 'Empecemos la reunión ahora.' },
      constructions: ['imperative'],
      explanation: {
        title: { ru: 'Let\'s start — давай начнём', uk: 'Let\'s start — давай почнемо', es: 'Let\'s start — empecemos' },
        rule: { ru: '"Let\'s" значит "давай(те)". "start" значит "начать". Let\'s start — давай начнём, вместе.', uk: '"Let\'s" означає "давай(те)". "start" означає "почати". Let\'s start — давай почнемо, разом.', es: '"Let\'s" significa "vamos a". "start" significa "empezar". Let\'s start — empecemos, juntos.' },
        why: { ru: 'Так ты мягко закрываешь болтовню и зовёшь всех к делу.', uk: 'Так ти м\'яко закриваєш балачку й кличеш усіх до справи.', es: 'Así cierras la charla con suavidad y llamas a todos al trabajo.' },
        commonMistake: { ru: 'Не говори "Let\'s to start". После "Let\'s" сразу слово: Let\'s start.', uk: 'Не кажи "Let\'s to start". Після "Let\'s" одразу слово: Let\'s start.', es: 'No digas "Let\'s to start". Tras "Let\'s" va la palabra directa: Let\'s start.' },
      },
      words: [
        { text: 'Let\'s', partOfSpeech: 'other', distractors: ['Please', 'Now', 'Today', 'Maybe', 'Soon'] },
        { text: 'start', partOfSpeech: 'verb', distractors: ['cook', 'watch', 'read', 'clean', 'paint'] },
        { text: 'the', partOfSpeech: 'determiner', distractors: ['my', 'one', 'this', 'some', 'that'] },
        { text: 'meeting', partOfSpeech: 'noun', distractors: ['report', 'email', 'screen', 'agenda', 'slide'] },
        { text: 'now', partOfSpeech: 'adverb', distractors: ['soon', 'later', 'then', 'early', 'here'] },
      ],
    },
    {
      id: 'mitap_d21_p6',
      english: 'Can we begin the call?',
      meaning: { ru: 'Мы можем начать созвон?', uk: 'Ми можемо почати дзвінок?', es: '¿Podemos empezar la llamada?' },
      constructions: ['modals'],
      explanation: {
        title: { ru: 'Can we — можем ли мы', uk: 'Can we — чи можемо ми', es: 'Can we — podemos' },
        rule: { ru: '"Can" значит "можем". "begin" значит "начать". Can we begin — можем ли мы начать.', uk: '"Can" означає "можемо". "begin" означає "почати". Can we begin — чи можемо ми почати.', es: '"Can" significa "podemos". "begin" significa "empezar". Can we begin — podemos empezar.' },
        why: { ru: 'Так ты вежливо предлагаешь стартовать и спрашиваешь согласие команды.', uk: 'Так ти ввічливо пропонуєш стартувати й питаєш згоду команди.', es: 'Así propones empezar con cortesía y pides el visto bueno del equipo.' },
        commonMistake: { ru: 'Не говори "Can we to begin?". После "can" сразу слово: Can we begin?', uk: 'Не кажи "Can we to begin?". Після "can" одразу слово: Can we begin?', es: 'No digas "Can we to begin?". Tras "can" va la palabra directa: Can we begin?' },
      },
      words: [
        { text: 'Can', partOfSpeech: 'modal', distractors: ['Do', 'Are', 'Have', 'Did', 'Were'] },
        { text: 'we', partOfSpeech: 'pronoun', distractors: ['they', 'you', 'he', 'she', 'it'] },
        { text: 'begin', partOfSpeech: 'verb', distractors: ['cook', 'clean', 'paint', 'wash', 'watch'] },
        { text: 'the', partOfSpeech: 'determiner', distractors: ['my', 'one', 'this', 'some', 'that'] },
        { text: 'call', partOfSpeech: 'noun', distractors: ['report', 'email', 'screen', 'agenda', 'slide'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'weekend', partOfSpeech: 'noun', translation: { ru: 'выходные', uk: 'вихідні', es: 'fin de semana' }, example: 'How was your weekend?' },
    { word: 'watched', partOfSpeech: 'verb', translation: { ru: 'посмотрел', uk: 'подивився', es: 'vi, miré' }, example: 'I watched a good movie.' },
    { word: 'weather', partOfSpeech: 'noun', translation: { ru: 'погода', uk: 'погода', es: 'clima' }, example: 'The weather is nice today.' },
    { word: 'rained', partOfSpeech: 'verb', translation: { ru: 'шёл дождь', uk: 'йшов дощ', es: 'llovió' }, example: 'It rained all weekend here.' },
    { word: 'start', partOfSpeech: 'verb', translation: { ru: 'начать', uk: 'почати', es: 'empezar' }, example: 'Let\'s start the meeting now.' },
    { word: 'begin', partOfSpeech: 'verb', translation: { ru: 'начать', uk: 'почати', es: 'empezar' }, example: 'Can we begin the call?' },
  ],
};

export const MITAP_DAY_22: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 22,
  topic: { ru: 'Дать статус: над чем работаешь сейчас', uk: 'Дати статус: над чим працюєш зараз', es: 'Dar tu estado: en qué trabajas ahora' },
  outcome: {
    ru: 'Ты сможешь коротко сказать на стендапе, над чем работаешь прямо сейчас, и когда закончишь.',
    uk: 'Ти зможеш коротко сказати на стендапі, над чим працюєш просто зараз, і коли закінчиш.',
    es: 'Podrás decir en el standup en qué trabajas ahora mismo y cuándo terminas.',
  },
  level: 'A2',
  prerequisiteLessons: [17, 3],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Скажи, что делаешь прямо сейчас', uk: 'Скажи, що робиш просто зараз', es: 'Di qué estás haciendo ahora mismo' },
      body: {
        ru: 'Когда хочешь сказать, что занят делом ПРЯМО СЕЙЧАС, бери I am и слово с окончанием -ing. I work = вообще, всегда. I am working = сейчас, в этот момент. На стендапе нужно именно сейчас.',
        uk: 'Коли хочеш сказати, що зайнятий справою ПРОСТО ЗАРАЗ, бери I am і слово із закінченням -ing. I work = взагалі, завжди. I am working = зараз, цієї миті. На стендапі потрібно саме зараз.',
        es: 'Cuando quieres decir que estás ocupado con algo AHORA MISMO, usa I am y la palabra con -ing. I work = en general. I am working = ahora, en este momento. En el standup necesitas justo ahora.',
      },
      examples: [
        { en: 'I am working on the report.', gloss: { ru: 'Я работаю над отчётом (сейчас).', uk: 'Я працюю над звітом (зараз).', es: 'Estoy trabajando en el informe.' } },
        { en: 'I am writing the email now.', gloss: { ru: 'Я пишу письмо сейчас.', uk: 'Я пишу лист зараз.', es: 'Estoy escribiendo el correo ahora.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Скажи, над ЧЕМ работаешь', uk: 'Скажи, над ЧИМ працюєш', es: 'Di EN QUÉ trabajas' },
      body: {
        ru: 'Чтобы назвать дело, добавь on и сам предмет: working on the report. on тут как русское над. I am working on the task = я над задачей. Просто запомни связку working on.',
        uk: 'Щоб назвати справу, додай on і сам предмет: working on the report. on тут як українське над. I am working on the task = я над задачею. Просто запам\'ятай зв\'язку working on.',
        es: 'Para nombrar la tarea, añade on y el objeto: working on the report. Aquí on es como en. I am working on the task = en la tarea. Recuerda working on.',
      },
      examples: [
        { en: 'I am working on the new task.', gloss: { ru: 'Я работаю над новой задачей.', uk: 'Я працюю над новою задачею.', es: 'Estoy trabajando en la nueva tarea.' } },
        { en: 'I am fixing a small bug.', gloss: { ru: 'Я чиню маленькую ошибку.', uk: 'Я лагоджу маленьку помилку.', es: 'Estoy arreglando un pequeño error.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Скажи, когда закончишь', uk: 'Скажи, коли закінчиш', es: 'Di cuándo terminarás' },
      body: {
        ru: 'Команде важно, когда будет готово. Скажи I finish it today = я заканчиваю это сегодня. Это про твой обычный план на день. finish = закончить, today = сегодня.',
        uk: 'Команді важливо, коли буде готово. Скажи I finish it today = я закінчую це сьогодні. Це про твій звичайний план на день. finish = закінчити, today = сьогодні.',
        es: 'Al equipo le importa cuándo estará listo. Di I finish it today = lo termino hoy. Es tu plan normal del día. finish = terminar, today = hoy.',
      },
      examples: [
        { en: 'I finish it today.', gloss: { ru: 'Я заканчиваю это сегодня.', uk: 'Я закінчую це сьогодні.', es: 'Lo termino hoy.' } },
        { en: 'I am almost done with it.', gloss: { ru: 'Я почти закончил с этим.', uk: 'Я майже закінчив із цим.', es: 'Casi termino con eso.' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d22_p1',
      english: 'I am working on the report.',
      meaning: { ru: 'Я работаю над отчётом.', uk: 'Я працюю над звітом.', es: 'Estoy trabajando en el informe.' },
      constructions: ['present-continuous'],
      explanation: {
        title: { ru: 'Дело прямо сейчас', uk: 'Справа просто зараз', es: 'Tarea ahora mismo' },
        rule: { ru: 'I am + слово на -ing = делаю прямо сейчас. working = работаю. on the report = над отчётом.', uk: 'I am + слово на -ing = роблю просто зараз. working = працюю. on the report = над звітом.', es: 'I am + palabra con -ing = lo hago ahora. working = trabajo. on the report = en el informe.' },
        why: { ru: 'На стендапе спрашивают про сейчас, поэтому am working, а не просто work.', uk: 'На стендапі питають про зараз, тому am working, а не просто work.', es: 'En el standup preguntan por ahora, por eso am working, no solo work.' },
        commonMistake: { ru: 'Не теряй am: говори I am working, не I working.', uk: 'Не губи am: кажи I am working, не I working.', es: 'No pierdas am: di I am working, no I working.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'am', partOfSpeech: 'to-be', distractors: ['is', 'are', 'was', 'were', 'be'] },
        { text: 'working', partOfSpeech: 'verb', distractors: ['reading', 'sitting', 'walking', 'eating', 'sleeping'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['of', 'by', 'as', 'off', 'up'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'my', 'that'] },
        { text: 'report', partOfSpeech: 'noun', distractors: ['door', 'chair', 'floor', 'river', 'garden'] },
      ],
    },
    {
      id: 'mitap_d22_p2',
      english: 'I am writing the email now.',
      meaning: { ru: 'Я пишу письмо сейчас.', uk: 'Я пишу лист зараз.', es: 'Estoy escribiendo el correo ahora.' },
      constructions: ['present-continuous'],
      explanation: {
        title: { ru: 'Что делаю в этот момент', uk: 'Що роблю цієї миті', es: 'Qué hago en este momento' },
        rule: { ru: 'writing = пишу. now = сейчас. Слово now подсказывает: дело идёт прямо в этот момент.', uk: 'writing = пишу. now = зараз. Слово now підказує: справа триває просто цієї миті.', es: 'writing = escribo. now = ahora. La palabra now indica que pasa en este momento.' },
        why: { ru: 'now усиливает сейчас, поэтому форма am writing, а не write.', uk: 'now підсилює зараз, тому форма am writing, а не write.', es: 'now refuerza ahora, por eso am writing, no write.' },
        commonMistake: { ru: 'С now бери am writing, а не write: дело идёт сейчас.', uk: 'З now бери am writing, а не write: справа триває зараз.', es: 'Con now usa am writing, no write: pasa ahora.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'am', partOfSpeech: 'to-be', distractors: ['is', 'are', 'was', 'were', 'be'] },
        { text: 'writing', partOfSpeech: 'verb', distractors: ['cooking', 'running', 'singing', 'driving', 'painting'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'my', 'that'] },
        { text: 'email', partOfSpeech: 'noun', distractors: ['window', 'bridge', 'mountain', 'forest', 'bottle'] },
        { text: 'now', partOfSpeech: 'adverb', distractors: ['slowly', 'quietly', 'loudly', 'badly', 'well'] },
      ],
    },
    {
      id: 'mitap_d22_p3',
      english: 'I am fixing a small bug.',
      meaning: { ru: 'Я чиню маленькую ошибку.', uk: 'Я лагоджу маленьку помилку.', es: 'Estoy arreglando un pequeño error.' },
      constructions: ['present-continuous'],
      explanation: {
        title: { ru: 'Чиню прямо сейчас', uk: 'Лагоджу просто зараз', es: 'Lo arreglo ahora' },
        rule: { ru: 'fixing = чиню. small = маленький. bug = ошибка в коде. a bug = одна ошибка.', uk: 'fixing = лагоджу. small = маленький. bug = помилка в коді. a bug = одна помилка.', es: 'fixing = arreglo. small = pequeño. bug = error en el código. a bug = un error.' },
        why: { ru: 'Перед small bug ставим a: это одна штука, о которой говорим впервые.', uk: 'Перед small bug ставимо a: це одна штука, про яку кажемо вперше.', es: 'Antes de small bug va a: es una cosa que mencionas por primera vez.' },
        commonMistake: { ru: 'Не пропусти a перед small bug: одна, новая ошибка.', uk: 'Не пропусти a перед small bug: одна, нова помилка.', es: 'No omitas a antes de small bug: un error nuevo.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'am', partOfSpeech: 'to-be', distractors: ['is', 'are', 'was', 'were', 'be'] },
        { text: 'fixing', partOfSpeech: 'verb', distractors: ['washing', 'building', 'drawing', 'carrying', 'planting'] },
        { text: 'a', partOfSpeech: 'article', distractors: ['the', 'an', 'my', 'this', 'that'] },
        { text: 'small', partOfSpeech: 'adjective', distractors: ['happy', 'loud', 'cold', 'heavy', 'bright'] },
        { text: 'bug', partOfSpeech: 'noun', distractors: ['lamp', 'clock', 'spoon', 'cloud', 'shoe'] },
      ],
    },
    {
      id: 'mitap_d22_p4',
      english: 'I am working on the new task.',
      meaning: { ru: 'Я работаю над новой задачей.', uk: 'Я працюю над новою задачею.', es: 'Estoy trabajando en la nueva tarea.' },
      constructions: ['present-continuous'],
      explanation: {
        title: { ru: 'Над какой задачей', uk: 'Над якою задачею', es: 'En qué tarea' },
        rule: { ru: 'working on = работаю над. new = новый. task = задача. the new task = эта новая задача.', uk: 'working on = працюю над. new = новий. task = задача. the new task = ця нова задача.', es: 'working on = trabajo en. new = nuevo. task = tarea. the new task = esta nueva tarea.' },
        why: { ru: 'Ставим on после working, чтобы назвать дело: working on the task.', uk: 'Ставимо on після working, щоб назвати справу: working on the task.', es: 'Ponemos on tras working para nombrar la tarea: working on the task.' },
        commonMistake: { ru: 'Не бросай on: working on the task, а не working the task.', uk: 'Не кидай on: working on the task, а не working the task.', es: 'No quites on: working on the task, no working the task.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'am', partOfSpeech: 'to-be', distractors: ['is', 'are', 'was', 'were', 'be'] },
        { text: 'working', partOfSpeech: 'verb', distractors: ['reading', 'sitting', 'walking', 'eating', 'sleeping'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['of', 'by', 'as', 'off', 'up'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'my', 'that'] },
        { text: 'new', partOfSpeech: 'adjective', distractors: ['green', 'tall', 'quiet', 'warm', 'round'] },
        { text: 'task', partOfSpeech: 'noun', distractors: ['window', 'river', 'apple', 'street', 'cloud'] },
      ],
    },
    {
      id: 'mitap_d22_p5',
      english: 'I will finish it today.',
      meaning: { ru: 'Я закончу это сегодня.', uk: 'Я закінчу це сьогодні.', es: 'Lo terminaré hoy.' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'Когда будет готово', uk: 'Коли буде готово', es: 'Cuándo estará listo' },
        rule: { ru: 'finish = заканчиваю. it = это. today = сегодня. Это твой план на день.', uk: 'finish = закінчую. it = це. today = сьогодні. Це твій план на день.', es: 'finish = termino. it = lo. today = hoy. Es tu plan del día.' },
        why: { ru: 'Это план на день, поэтому простое finish, без am.', uk: 'Це план на день, тому просте finish, без am.', es: 'Es un plan del día, por eso finish simple, sin am.' },
        commonMistake: { ru: 'Здесь не нужно am: говори I finish, не I am finish.', uk: 'Тут не потрібне am: кажи I finish, не I am finish.', es: 'Aquí no va am: di I finish, no I am finish.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'might'] },
        { text: 'finish', partOfSpeech: 'verb', distractors: ['clean', 'open', 'close', 'wash', 'cook'] },
        { text: 'it', partOfSpeech: 'pronoun', distractors: ['him', 'her', 'them', 'us', 'me'] },
        { text: 'today', partOfSpeech: 'adverb', distractors: ['here', 'slowly', 'maybe', 'together', 'quietly'] },
      ],
    },
    {
      id: 'mitap_d22_p6',
      english: 'I am almost done with it.',
      meaning: { ru: 'Я почти закончил с этим.', uk: 'Я майже закінчив із цим.', es: 'Casi termino con eso.' },
      constructions: ['present-continuous'],
      explanation: {
        title: { ru: 'Почти готово', uk: 'Майже готово', es: 'Casi listo' },
        rule: { ru: 'almost = почти. done = готов. with it = с этим. Удобная фраза для конца работы.', uk: 'almost = майже. done = готовий. with it = із цим. Зручна фраза для кінця роботи.', es: 'almost = casi. done = listo. with it = con eso. Frase útil para el final.' },
        why: { ru: 'almost done значит работа на финише, но ещё не совсем закончена.', uk: 'almost done означає робота на фініші, але ще не зовсім завершена.', es: 'almost done significa que casi acabas, pero aún no del todo.' },
        commonMistake: { ru: 'Говори done with it, а не done it: после done нужно with.', uk: 'Кажи done with it, а не done it: після done потрібне with.', es: 'Di done with it, no done it: tras done va with.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'am', partOfSpeech: 'to-be', distractors: ['is', 'are', 'was', 'were', 'be'] },
        { text: 'almost', partOfSpeech: 'adverb', distractors: ['never', 'loudly', 'maybe', 'early', 'quietly'] },
        { text: 'done', partOfSpeech: 'adjective', distractors: ['busy', 'tired', 'ready', 'happy', 'calm'] },
        { text: 'with', partOfSpeech: 'preposition', distractors: ['from', 'about', 'under', 'near', 'over'] },
        { text: 'it', partOfSpeech: 'pronoun', distractors: ['him', 'her', 'them', 'us', 'me'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'working', partOfSpeech: 'verb', translation: { ru: 'работаю (сейчас)', uk: 'працюю (зараз)', es: 'trabajando' }, example: 'I am working on the report.' },
    { word: 'writing', partOfSpeech: 'verb', translation: { ru: 'пишу (сейчас)', uk: 'пишу (зараз)', es: 'escribiendo' }, example: 'I am writing the email now.' },
    { word: 'fixing', partOfSpeech: 'verb', translation: { ru: 'чиню (сейчас)', uk: 'лагоджу (зараз)', es: 'arreglando' }, example: 'I am fixing a small bug.' },
    { word: 'task', partOfSpeech: 'noun', translation: { ru: 'задача', uk: 'задача', es: 'tarea' }, example: 'I am working on the new task.' },
    { word: 'finish', partOfSpeech: 'verb', translation: { ru: 'заканчиваю', uk: 'закінчую', es: 'termino' }, example: 'I will finish it today.' },
    { word: 'done', partOfSpeech: 'adjective', translation: { ru: 'готов, закончен', uk: 'готовий, закінчений', es: 'listo, terminado' }, example: 'I am almost done with it.' },
  ],
};

export const MITAP_DAY_23: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 23,
  topic: { ru: 'Что я сделал вчера', uk: 'Що я зробив учора', es: 'Lo que hice ayer' },
  outcome: {
    ru: 'Ты сможешь коротко отчитаться на созвоне, что сделал вчера: закончил задачу, написал код, отправил отчёт и поправил баг.',
    uk: 'Ти зможеш коротко відзвітувати на дзвінку, що зробив учора: закінчив завдання, написав код, надіслав звіт і виправив баг.',
    es: 'Podrás contar en una llamada lo que hiciste ayer: terminaste una tarea, escribiste código, enviaste un informe y arreglaste un fallo.',
  },
  level: 'A2',
  prerequisiteLessons: [11, 12],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Рассказываем про вчера', uk: 'Розповідаємо про вчора', es: 'Contamos lo de ayer' },
      body: {
        ru: 'На утреннем созвоне каждый говорит, что сделал вчера. Слово yesterday значит «вчера». Для прошлого добавляй к слову окончание -ed: finish становится finished. Фраза Yesterday I finished the API значит «вчера я закончил API».',
        uk: 'На ранковому дзвінку кожен каже, що зробив учора. Слово yesterday значить «вчора». Для минулого додавай до слова закінчення -ed: finish стає finished. Фраза Yesterday I finished the API значить «вчора я закінчив API».',
        es: 'En la llamada de la mañana cada uno cuenta lo que hizo ayer. La palabra yesterday significa ayer. Para el pasado añade -ed: finish se vuelve finished. La frase Yesterday I finished the API significa ayer terminé la API.',
      },
      examples: [
        { en: 'Yesterday I finished the API.', gloss: { ru: 'Вчера я закончил API.', uk: 'Учора я закінчив API.', es: 'Ayer terminé la API.' } },
        { en: 'I worked on the report.', gloss: { ru: 'Я работал над отчётом.', uk: 'Я працював над звітом.', es: 'Trabajé en el informe.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Особые слова прошлого', uk: 'Особливі слова минулого', es: 'Palabras especiales del pasado' },
      body: {
        ru: 'Не все слова берут -ed. Некоторые меняются полностью. Write становится wrote, send становится sent. Фраза I wrote the code значит «я написал код». Эти слова надо просто запомнить, их немного.',
        uk: 'Не всі слова беруть -ed. Деякі змінюються повністю. Write стає wrote, send стає sent. Фраза I wrote the code значить «я написав код». Ці слова треба просто запам\'ятати, їх небагато.',
        es: 'No todas las palabras toman -ed. Algunas cambian del todo. Write se vuelve wrote, send se vuelve sent. La frase I wrote the code significa escribí el código. Estas palabras solo hay que memorizarlas, son pocas.',
      },
      examples: [
        { en: 'I wrote the code.', gloss: { ru: 'Я написал код.', uk: 'Я написав код.', es: 'Escribí el código.' } },
        { en: 'I sent the report.', gloss: { ru: 'Я отправил отчёт.', uk: 'Я надіслав звіт.', es: 'Envié el informe.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Коротко и по делу', uk: 'Коротко і по суті', es: 'Corto y al grano' },
      body: {
        ru: 'На созвоне отчёт должен быть коротким. Скажи, что закончил и что поправил. Фраза I fixed the bug значит «я поправил баг». Слово yesterday можно ставить в начало или в конец фразы.',
        uk: 'На дзвінку звіт має бути коротким. Скажи, що закінчив і що виправив. Фраза I fixed the bug значить «я виправив баг». Слово yesterday можна ставити на початок або в кінець фрази.',
        es: 'En la llamada el informe debe ser corto. Di qué terminaste y qué arreglaste. La frase I fixed the bug significa arreglé el fallo. La palabra yesterday va al inicio o al final de la frase.',
      },
      examples: [
        { en: 'I fixed the bug yesterday.', gloss: { ru: 'Я поправил баг вчера.', uk: 'Я виправив баг учора.', es: 'Arreglé el fallo ayer.' } },
        { en: 'I tested the new feature.', gloss: { ru: 'Я протестировал новую функцию.', uk: 'Я протестував нову функцію.', es: 'Probé la función nueva.' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d23_p1',
      english: 'Yesterday I finished the API.',
      meaning: { ru: 'Вчера я закончил API.', uk: 'Учора я закінчив API.', es: 'Ayer terminé la API.' },
      constructions: ['past-simple-regular'],
      explanation: {
        title: { ru: 'Говорим, что закончили', uk: 'Кажемо, що закінчили', es: 'Decimos qué terminamos' },
        rule: { ru: 'Yesterday значит «вчера». Finished значит «закончил»: к finish добавили -ed для прошлого.', uk: 'Yesterday значить «вчора». Finished значить «закінчив»: до finish додали -ed для минулого.', es: 'Yesterday significa ayer. Finished significa terminé: a finish se le añade -ed para el pasado.' },
        why: { ru: 'Так на утреннем созвоне ты коротко отчитываешься, какую задачу завершил.', uk: 'Так на ранковому дзвінку ти коротко звітуєш, яке завдання завершив.', es: 'Así en la llamada de la mañana cuentas corto qué tarea acabaste.' },
        commonMistake: { ru: 'Не говори I finish: для вчера нужно finished с -ed.', uk: 'Не кажи I finish: для вчора потрібно finished з -ed.', es: 'No digas I finish: para ayer hace falta finished con -ed.' },
      },
      words: [
        { text: 'Yesterday', partOfSpeech: 'adverb', distractors: ['Today', 'Tomorrow', 'Now', 'Soon', 'Later'] },
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['you', 'we', 'they', 'he', 'she'] },
        { text: 'finished', partOfSpeech: 'verb', distractors: ['painted', 'cooked', 'washed', 'counted', 'opened'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'that', 'some'] },
        { text: 'API', partOfSpeech: 'noun', distractors: ['page', 'server', 'screen', 'button', 'folder'] },
      ],
    },
    {
      id: 'mitap_d23_p2',
      english: 'I worked on the report.',
      meaning: { ru: 'Я работал над отчётом.', uk: 'Я працював над звітом.', es: 'Trabajé en el informe.' },
      constructions: ['past-simple-regular'],
      explanation: {
        title: { ru: 'Говорим, над чем работали', uk: 'Кажемо, над чим працювали', es: 'Decimos en qué trabajamos' },
        rule: { ru: 'Worked значит «работал»: к work добавили -ed. Work on значит «работать над».', uk: 'Worked значить «працював»: до work додали -ed. Work on значить «працювати над».', es: 'Worked significa trabajé: a work se le añade -ed. Work on significa trabajar en.' },
        why: { ru: 'Так ты показываешь команде, чем именно занимался вчера весь день.', uk: 'Так ти показуєш команді, чим саме займався вчора весь день.', es: 'Así muestras al equipo en qué te ocupaste ayer todo el día.' },
        commonMistake: { ru: 'Не говори worked at the report: после worked нужно on.', uk: 'Не кажи worked at the report: після worked потрібно on.', es: 'No digas worked at the report: después de worked va on.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['you', 'we', 'they', 'he', 'she'] },
        { text: 'worked', partOfSpeech: 'verb', distractors: ['looked', 'helped', 'called', 'stayed', 'joined'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['at', 'in', 'to', 'of', 'by'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'that', 'some'] },
        { text: 'report', partOfSpeech: 'noun', distractors: ['plan', 'note', 'list', 'file', 'sheet'] },
      ],
    },
    {
      id: 'mitap_d23_p3',
      english: 'I wrote the code in the morning.',
      meaning: { ru: 'Я написал код утром.', uk: 'Я написав код уранці.', es: 'Escribí el código por la mañana.' },
      constructions: ['past-simple-irregular', 'prepositions-time'],
      explanation: {
        title: { ru: 'Особое слово wrote', uk: 'Особливе слово wrote', es: 'La palabra especial wrote' },
        rule: { ru: 'Wrote значит «написал». Это особое слово: write меняется на wrote, без -ed.', uk: 'Wrote значить «написав». Це особливе слово: write змінюється на wrote, без -ed.', es: 'Wrote significa escribí. Es palabra especial: write cambia a wrote, sin -ed.' },
        why: { ru: 'Так ты рассказываешь, что вчера сделал руками, например написал код.', uk: 'Так ти розповідаєш, що вчора зробив руками, наприклад написав код.', es: 'Así cuentas qué hiciste ayer con tus manos, por ejemplo escribir código.' },
        commonMistake: { ru: 'Не говори writed: правильно wrote, это особое слово.', uk: 'Не кажи writed: правильно wrote, це особливе слово.', es: 'No digas writed: correcto wrote, es palabra especial.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['you', 'we', 'they', 'he', 'she'] },
        { text: 'wrote', partOfSpeech: 'verb', distractors: ['slept', 'walked', 'ate', 'ran', 'sat'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'that', 'some'] },
        { text: 'code', partOfSpeech: 'noun', distractors: ['text', 'page', 'note', 'line', 'word'] },
        { text: 'in', partOfSpeech: 'preposition', distractors: ['at', 'on', 'to', 'of', 'by'] },
        { text: 'morning', partOfSpeech: 'noun', distractors: ['evening', 'afternoon', 'night', 'noon', 'day'] },
      ],
    },
    {
      id: 'mitap_d23_p4',
      english: 'I sent the report to the team.',
      meaning: { ru: 'Я отправил отчёт команде.', uk: 'Я надіслав звіт команді.', es: 'Envié el informe al equipo.' },
      constructions: ['past-simple-irregular'],
      explanation: {
        title: { ru: 'Особое слово sent', uk: 'Особливе слово sent', es: 'La palabra especial sent' },
        rule: { ru: 'Sent значит «отправил». Это особое слово: send меняется на sent, без -ed.', uk: 'Sent значить «надіслав». Це особливе слово: send змінюється на sent, без -ed.', es: 'Sent significa envié. Es palabra especial: send cambia a sent, sin -ed.' },
        why: { ru: 'Так на созвоне ты говоришь, что отчёт уже у команды и можно обсуждать.', uk: 'Так на дзвінку ти кажеш, що звіт уже в команди і можна обговорювати.', es: 'Así en la llamada dices que el informe ya está con el equipo y se puede hablar.' },
        commonMistake: { ru: 'Не говори sended: правильно sent, это особое слово.', uk: 'Не кажи sended: правильно sent, це особливе слово.', es: 'No digas sended: correcto sent, es palabra especial.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['you', 'we', 'they', 'he', 'she'] },
        { text: 'sent', partOfSpeech: 'verb', distractors: ['closed', 'cleaned', 'counted', 'opened', 'saved'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'that', 'some'] },
        { text: 'report', partOfSpeech: 'noun', distractors: ['plan', 'note', 'list', 'file', 'sheet'] },
        { text: 'to', partOfSpeech: 'preposition', distractors: ['at', 'on', 'in', 'of', 'by'] },
        { text: 'team', partOfSpeech: 'noun', distractors: ['group', 'office', 'staff', 'crew', 'desk'] },
      ],
    },
    {
      id: 'mitap_d23_p5',
      english: 'I fixed the bug yesterday.',
      meaning: { ru: 'Я поправил баг вчера.', uk: 'Я виправив баг учора.', es: 'Arreglé el fallo ayer.' },
      constructions: ['past-simple-regular'],
      explanation: {
        title: { ru: 'Говорим, что поправили', uk: 'Кажемо, що виправили', es: 'Decimos qué arreglamos' },
        rule: { ru: 'Fixed значит «поправил»: к fix добавили -ed. Yesterday может стоять в конце.', uk: 'Fixed значить «виправив»: до fix додали -ed. Yesterday може стояти в кінці.', es: 'Fixed significa arreglé: a fix se le añade -ed. Yesterday puede ir al final.' },
        why: { ru: 'Так ты докладываешь, что проблема уже решена и работа идёт дальше.', uk: 'Так ти доповідаєш, що проблема вже вирішена і робота йде далі.', es: 'Así informas que el problema ya está resuelto y el trabajo sigue.' },
        commonMistake: { ru: 'Не говори I fix yesterday: с yesterday нужно fixed.', uk: 'Не кажи I fix yesterday: з yesterday потрібно fixed.', es: 'No digas I fix yesterday: con yesterday hace falta fixed.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['you', 'we', 'they', 'he', 'she'] },
        { text: 'fixed', partOfSpeech: 'verb', distractors: ['painted', 'cooked', 'opened', 'washed', 'counted'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'that', 'some'] },
        { text: 'bug', partOfSpeech: 'noun', distractors: ['task', 'line', 'case', 'point', 'item'] },
        { text: 'yesterday', partOfSpeech: 'adverb', distractors: ['today', 'tomorrow', 'now', 'soon', 'later'] },
      ],
    },
    {
      id: 'mitap_d23_p6',
      english: 'I tested the new feature.',
      meaning: { ru: 'Я протестировал новую функцию.', uk: 'Я протестував нову функцію.', es: 'Probé la función nueva.' },
      constructions: ['past-simple-regular'],
      explanation: {
        title: { ru: 'Говорим, что проверили', uk: 'Кажемо, що перевірили', es: 'Decimos qué probamos' },
        rule: { ru: 'Tested значит «протестировал»: к test добавили -ed. New значит «новый».', uk: 'Tested значить «протестував»: до test додали -ed. New значить «новий».', es: 'Tested significa probé: a test se le añade -ed. New significa nuevo.' },
        why: { ru: 'Так ты показываешь, что новая функция проверена и готова к показу.', uk: 'Так ти показуєш, що нова функція перевірена і готова до показу.', es: 'Así muestras que la función nueva está probada y lista.' },
        commonMistake: { ru: 'Не говори I test: для вчера нужно tested с -ed.', uk: 'Не кажи I test: для вчора потрібно tested з -ed.', es: 'No digas I test: para ayer hace falta tested con -ed.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['you', 'we', 'they', 'he', 'she'] },
        { text: 'tested', partOfSpeech: 'verb', distractors: ['cooked', 'drove', 'painted', 'called', 'opened'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'that', 'some'] },
        { text: 'new', partOfSpeech: 'adjective', distractors: ['old', 'small', 'big', 'ready', 'main'] },
        { text: 'feature', partOfSpeech: 'noun', distractors: ['button', 'screen', 'menu', 'window', 'panel'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'finished', partOfSpeech: 'verb', translation: { ru: 'закончил', uk: 'закінчив', es: 'terminé' }, example: 'Yesterday I finished the API.' },
    { word: 'worked', partOfSpeech: 'verb', translation: { ru: 'работал', uk: 'працював', es: 'trabajé' }, example: 'I worked on the report.' },
    { word: 'wrote', partOfSpeech: 'verb', translation: { ru: 'написал', uk: 'написав', es: 'escribí' }, example: 'I wrote the code in the morning.' },
    { word: 'sent', partOfSpeech: 'verb', translation: { ru: 'отправил', uk: 'надіслав', es: 'envié' }, example: 'I sent the report to the team.' },
    { word: 'fixed', partOfSpeech: 'verb', translation: { ru: 'поправил', uk: 'виправив', es: 'arreglé' }, example: 'I fixed the bug yesterday.' },
    { word: 'tested', partOfSpeech: 'verb', translation: { ru: 'протестировал', uk: 'протестував', es: 'probé' }, example: 'I tested the new feature.' },
  ],
};

export const MITAP_DAY_24: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 24,
  topic: { ru: 'Что планируешь сегодня', uk: 'Що плануєш сьогодні', es: 'Qué planeas hoy' },
  outcome: {
    ru: 'Ты сможешь коротко рассказать свой план на день в стендапе: что делаешь сейчас и что сделаешь дальше.',
    uk: 'Ти зможеш коротко розповісти свій план на день у стендапі: що робиш зараз і що зробиш далі.',
    es: 'Podrás contar tu plan del día en el standup: qué estás haciendo ahora y qué harás después.',
  },
  level: 'A2',
  prerequisiteLessons: [13, 17],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Скажи, что сделаешь дальше', uk: 'Скажи, що зробиш далі', es: 'Di qué harás después' },
      body: {
        ru: 'Когда говоришь про план на день, бери will и простое действие. "I will" = я сделаю. Так на стендапе ты коротко обещаешь, чем займёшься сегодня.',
        uk: 'Коли говориш про план на день, бери will і просту дію. "I will" = я зроблю. Так на стендапі ти коротко обіцяєш, чим займешся сьогодні.',
        es: 'Cuando hablas del plan del día, usa will y una acción simple. "I will" = yo haré. Así en el standup dices en pocas palabras qué harás hoy.',
      },
      examples: [
        { en: 'Today I will test the build.', gloss: { ru: 'Сегодня я протестирую сборку.', uk: 'Сьогодні я протестую збірку.', es: 'Hoy probaré la compilación.' } },
        { en: 'I will fix the bug after lunch.', gloss: { ru: 'Я починю баг после обеда.', uk: 'Я полагоджу баг після обіду.', es: 'Arreglaré el error después del almuerzo.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Скажи, что делаешь прямо сейчас', uk: 'Скажи, що робиш прямо зараз', es: 'Di qué estás haciendo ahora' },
      body: {
        ru: 'Если дело идёт прямо сейчас, бери am/is/are и слово с -ing. "I am working" = я сейчас работаю. Так ты показываешь, чем занят в эту минуту.',
        uk: 'Якщо справа йде прямо зараз, бери am/is/are і слово з -ing. "I am working" = я зараз працюю. Так ти показуєш, чим зайнятий цієї хвилини.',
        es: 'Si algo pasa justo ahora, usa am/is/are y una palabra con -ing. "I am working" = estoy trabajando. Así muestras qué haces en este momento.',
      },
      examples: [
        { en: 'I am working on the new screen.', gloss: { ru: 'Я работаю над новым экраном.', uk: 'Я працюю над новим екраном.', es: 'Estoy trabajando en la nueva pantalla.' } },
        { en: 'We are waiting for the design.', gloss: { ru: 'Мы ждём дизайн.', uk: 'Ми чекаємо дизайн.', es: 'Estamos esperando el diseño.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Спроси о плане коллеги', uk: 'Запитай про план колеги', es: 'Pregunta por el plan del compañero' },
      body: {
        ru: 'Чтобы спросить про чужой план, начни с What will you. "What will you do?" = что ты сделаешь? Простой вопрос, который двигает стендап дальше.',
        uk: 'Щоб запитати про чужий план, почни з What will you. "What will you do?" = що ти зробиш? Просте питання, що рухає стендап далі.',
        es: 'Para preguntar por el plan de otro, empieza con What will you. "What will you do?" = ¿qué harás? Una pregunta simple que mueve el standup.',
      },
      examples: [
        { en: 'What will you do today?', gloss: { ru: 'Что ты будешь делать сегодня?', uk: 'Що ти робитимеш сьогодні?', es: '¿Qué harás hoy?' } },
        { en: 'Are you working on the report?', gloss: { ru: 'Ты работаешь над отчётом?', uk: 'Ти працюєш над звітом?', es: '¿Estás trabajando en el informe?' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d24_p1',
      english: 'Today I will test the build.',
      meaning: { ru: 'Сегодня я протестирую сборку.', uk: 'Сьогодні я протестую збірку.', es: 'Hoy probaré la compilación.' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'will = я это сделаю', uk: 'will = я це зроблю', es: 'will = yo lo haré' },
        rule: { ru: 'Бери will, чтобы сказать про действие сегодня: will test = протестирую.', uk: 'Бери will, щоб сказати про дію сьогодні: will test = протестую.', es: 'Usa will para decir una acción de hoy: will test = probaré.' },
        why: { ru: 'На стендапе will чётко показывает, что ты сделаешь за день.', uk: 'На стендапі will чітко показує, що ти зробиш за день.', es: 'En el standup will muestra claro qué harás en el día.' },
        commonMistake: { ru: 'После will не нужно -s и -ed: "will test", не "will tests".', uk: 'Після will не треба -s і -ed: "will test", не "will tests".', es: 'Tras will no va -s ni -ed: "will test", no "will tests".' },
      },
      words: [
        { text: 'Today', partOfSpeech: 'adverb', distractors: ['Already', 'Together', 'Almost', 'Yesterday', 'Twice'] },
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'it', 'they', 'we'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'could'] },
        { text: 'test', partOfSpeech: 'verb', distractors: ['wash', 'cook', 'sleep', 'drive', 'sing'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'my', 'this', 'some'] },
        { text: 'build', partOfSpeech: 'noun', distractors: ['table', 'garden', 'window', 'kitchen', 'river'] },
      ],
    },
    {
      id: 'mitap_d24_p2',
      english: 'I am working on the new screen.',
      meaning: { ru: 'Я работаю над новым экраном.', uk: 'Я працюю над новим екраном.', es: 'Estoy trabajando en la nueva pantalla.' },
      constructions: ['present-continuous'],
      explanation: {
        title: { ru: 'am + working = делаю сейчас', uk: 'am + working = роблю зараз', es: 'am + working = hago ahora' },
        rule: { ru: 'Бери am и слово с -ing про дело прямо сейчас: am working = работаю.', uk: 'Бери am і слово з -ing про справу зараз: am working = працюю.', es: 'Usa am y palabra con -ing para algo ahora: am working = trabajo.' },
        why: { ru: 'Так коллеги понимают, чем ты занят в эту минуту.', uk: 'Так колеги розуміють, чим ти зайнятий цієї хвилини.', es: 'Así los compañeros saben qué haces en este momento.' },
        commonMistake: { ru: 'Не теряй am: "I am working", не "I working".', uk: 'Не губи am: "I am working", не "I working".', es: 'No olvides am: "I am working", no "I working".' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'it', 'they', 'you'] },
        { text: 'am', partOfSpeech: 'to-be', distractors: ['is', 'are', 'was', 'were', 'be'] },
        { text: 'working', partOfSpeech: 'verb', distractors: ['walking', 'reading', 'cooking', 'sleeping', 'driving'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['under', 'behind', 'near', 'above', 'between'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'some', 'any'] },
        { text: 'new', partOfSpeech: 'adjective', distractors: ['warm', 'heavy', 'quiet', 'sweet', 'round'] },
        { text: 'screen', partOfSpeech: 'noun', distractors: ['chair', 'apple', 'street', 'cloud', 'spoon'] },
      ],
    },
    {
      id: 'mitap_d24_p3',
      english: 'I will fix the bug after lunch.',
      meaning: { ru: 'Я починю баг после обеда.', uk: 'Я полагоджу баг після обіду.', es: 'Arreglaré el error después del almuerzo.' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'will fix = починю', uk: 'will fix = полагоджу', es: 'will fix = arreglaré' },
        rule: { ru: 'will fix говорит про дело позже сегодня: после обеда займусь багом.', uk: 'will fix каже про справу пізніше сьогодні: після обіду візьмуся за баг.', es: 'will fix dice una acción más tarde hoy: tras el almuerzo veo el error.' },
        why: { ru: 'Полезно назвать момент: after lunch показывает, когда сделаешь.', uk: 'Корисно назвати момент: after lunch показує, коли зробиш.', es: 'Útil decir el momento: after lunch muestra cuándo lo harás.' },
        commonMistake: { ru: 'Говори after lunch без the: не "after the lunch".', uk: 'Кажи after lunch без the: не "after the lunch".', es: 'Di after lunch sin the: no "after the lunch".' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'it', 'they', 'we'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'might'] },
        { text: 'fix', partOfSpeech: 'verb', distractors: ['bake', 'paint', 'carry', 'throw', 'melt'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'my', 'some', 'any'] },
        { text: 'bug', partOfSpeech: 'noun', distractors: ['lamp', 'shoe', 'bridge', 'plate', 'forest'] },
        { text: 'after', partOfSpeech: 'preposition', distractors: ['before', 'during', 'without', 'across', 'inside'] },
        { text: 'lunch', partOfSpeech: 'noun', distractors: ['pencil', 'mountain', 'ticket', 'blanket', 'engine'] },
      ],
    },
    {
      id: 'mitap_d24_p4',
      english: 'What will you do today?',
      meaning: { ru: 'Что ты будешь делать сегодня?', uk: 'Що ти робитимеш сьогодні?', es: '¿Qué harás hoy?' },
      constructions: ['future-simple', 'wh-questions'],
      explanation: {
        title: { ru: 'What will you = что сделаешь', uk: 'What will you = що зробиш', es: 'What will you = qué harás' },
        rule: { ru: 'Начни вопрос с What will you, чтобы узнать чужой план на день.', uk: 'Почни питання з What will you, щоб дізнатися чужий план на день.', es: 'Empieza con What will you para saber el plan de otro.' },
        why: { ru: 'Этот вопрос мягко передаёт слово коллеге на стендапе.', uk: 'Це питання м\'яко передає слово колезі на стендапі.', es: 'Esta pregunta pasa el turno al compañero en el standup.' },
        commonMistake: { ru: 'Слово do остаётся простым: "will you do", не "will you does".', uk: 'Слово do лишається простим: "will you do", не "will you does".', es: 'do queda simple: "will you do", no "will you does".' },
      },
      words: [
        { text: 'What', partOfSpeech: 'pronoun', distractors: ['When', 'Where', 'Why', 'How', 'Who'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'could'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'it', 'they', 'we'] },
        { text: 'do', partOfSpeech: 'verb', distractors: ['bring', 'keep', 'find', 'hold', 'build'] },
        { text: 'today', partOfSpeech: 'adverb', distractors: ['already', 'together', 'almost', 'badly', 'twice'] },
      ],
    },
    {
      id: 'mitap_d24_p5',
      english: 'We are waiting for the design.',
      meaning: { ru: 'Мы ждём дизайн.', uk: 'Ми чекаємо дизайн.', es: 'Estamos esperando el diseño.' },
      constructions: ['present-continuous'],
      explanation: {
        title: { ru: 'are + waiting = ждём сейчас', uk: 'are + waiting = чекаємо зараз', es: 'are + waiting = esperamos ahora' },
        rule: { ru: 'Бери are и waiting про дело прямо сейчас: are waiting = ждём.', uk: 'Бери are і waiting про справу зараз: are waiting = чекаємо.', es: 'Usa are y waiting para algo ahora: are waiting = esperamos.' },
        why: { ru: 'Так на стендапе видно, что вы стоите и чего ждёте.', uk: 'Так на стендапі видно, що ви стоїте і чого чекаєте.', es: 'Así en el standup se ve qué les bloquea y qué esperan.' },
        commonMistake: { ru: 'После waiting идёт for: "waiting for the design".', uk: 'Після waiting іде for: "waiting for the design".', es: 'Tras waiting va for: "waiting for the design".' },
      },
      words: [
        { text: 'We', partOfSpeech: 'pronoun', distractors: ['He', 'She', 'It', 'I', 'You'] },
        { text: 'are', partOfSpeech: 'to-be', distractors: ['is', 'am', 'was', 'were', 'be'] },
        { text: 'waiting', partOfSpeech: 'verb', distractors: ['jumping', 'cooking', 'reading', 'driving', 'singing'] },
        { text: 'for', partOfSpeech: 'preposition', distractors: ['under', 'behind', 'above', 'near', 'between'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'some', 'any'] },
        { text: 'design', partOfSpeech: 'noun', distractors: ['window', 'garden', 'river', 'basket', 'candle'] },
      ],
    },
    {
      id: 'mitap_d24_p6',
      english: 'I will send the update soon.',
      meaning: { ru: 'Я скоро пришлю обновление.', uk: 'Я скоро надішлю оновлення.', es: 'Enviaré la actualización pronto.' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'will send = пришлю', uk: 'will send = надішлю', es: 'will send = enviaré' },
        rule: { ru: 'will send обещает действие чуть позже: скоро пришлю обновление команде.', uk: 'will send обіцяє дію трохи пізніше: скоро надішлю оновлення команді.', es: 'will send promete una acción luego: pronto envío la actualización.' },
        why: { ru: 'Слово soon успокаивает команду: результат будет совсем скоро.', uk: 'Слово soon заспокоює команду: результат буде зовсім скоро.', es: 'La palabra soon calma al equipo: el resultado llega pronto.' },
        commonMistake: { ru: 'После will бери простое send, не "will sends".', uk: 'Після will бери просте send, не "will sends".', es: 'Tras will usa send simple, no "will sends".' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'it', 'they', 'we'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'might'] },
        { text: 'send', partOfSpeech: 'verb', distractors: ['bake', 'carry', 'paint', 'throw', 'wash'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'my', 'some', 'any'] },
        { text: 'update', partOfSpeech: 'noun', distractors: ['bottle', 'ladder', 'pillow', 'tunnel', 'feather'] },
        { text: 'soon', partOfSpeech: 'adverb', distractors: ['together', 'already', 'almost', 'badly', 'twice'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'test', partOfSpeech: 'verb', translation: { ru: 'протестировать, проверить', uk: 'протестувати, перевірити', es: 'probar' }, example: 'Today I will test the build.' },
    { word: 'build', partOfSpeech: 'noun', translation: { ru: 'сборка', uk: 'збірка', es: 'compilación' }, example: 'Today I will test the build.' },
    { word: 'working', partOfSpeech: 'verb', translation: { ru: 'работаю (сейчас)', uk: 'працюю (зараз)', es: 'trabajando' }, example: 'I am working on the new screen.' },
    { word: 'bug', partOfSpeech: 'noun', translation: { ru: 'баг, ошибка', uk: 'баг, помилка', es: 'error, fallo' }, example: 'I will fix the bug after lunch.' },
    { word: 'waiting', partOfSpeech: 'verb', translation: { ru: 'ждём (сейчас)', uk: 'чекаємо (зараз)', es: 'esperando' }, example: 'We are waiting for the design.' },
    { word: 'update', partOfSpeech: 'noun', translation: { ru: 'обновление', uk: 'оновлення', es: 'actualización' }, example: 'I will send the update soon.' },
  ],
};

export const MITAP_DAY_25: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 25,
  topic: { ru: 'Сообщить о блокере', uk: 'Повідомити про блокер', es: 'Informar de un bloqueo' },
  outcome: {
    ru: 'Ты сможешь спокойно сказать на созвоне, что застрял: нет доступа, чего-то не хватает, и попросить помощи.',
    uk: 'Ти зможеш спокійно сказати на дзвінку, що застряг: немає доступу, чогось бракує, і попросити допомоги.',
    es: 'Podrás decir con calma en una llamada que estás bloqueado: no tienes acceso, falta algo, y pedir ayuda.',
  },
  level: 'A2',
  prerequisiteLessons: [4, 3],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Скажи прямо: я застрял', uk: 'Скажи прямо: я застряг', es: 'Di directo: estoy bloqueado' },
      body: {
        ru: 'Когда дело стоит и ты не можешь идти дальше, скажи об этом сразу. Простая фраза I am blocked говорит команде: мне нужна помощь, я жду. Это нормально и помогает всем.',
        uk: 'Коли справа стоїть і ти не можеш іти далі, скажи про це одразу. Проста фраза I am blocked каже команді: мені потрібна допомога, я чекаю. Це нормально і допомагає всім.',
        es: 'Cuando algo se detiene y no puedes avanzar, dilo enseguida. La frase simple I am blocked le dice al equipo: necesito ayuda, estoy esperando. Es normal y ayuda a todos.',
      },
      examples: [
        { en: 'I am blocked right now.', gloss: { ru: 'Я сейчас застрял.', uk: 'Я зараз застряг.', es: 'Estoy bloqueado ahora mismo.' } },
        { en: 'I wait for your help.', gloss: { ru: 'Я жду твоей помощи.', uk: 'Я чекаю на твою допомогу.', es: 'Espero tu ayuda.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Назови причину: чего не хватает', uk: 'Назви причину: чого бракує', es: 'Di la causa: qué falta' },
      body: {
        ru: 'После I am blocked объясни почему. Часто причина одна: I do not have access. Это значит у тебя нет доступа к файлу, папке или системе. Скажи это, и человек поймёт, что открыть тебе.',
        uk: 'Після I am blocked поясни чому. Часто причина одна: I do not have access. Це значить у тебе немає доступу до файлу, папки чи системи. Скажи це, і людина зрозуміє, що відкрити тобі.',
        es: 'Después de I am blocked, explica por qué. Muchas veces la causa es una: I do not have access. Significa que no tienes acceso al archivo, carpeta o sistema. Dilo y la persona sabrá qué abrirte.',
      },
      examples: [
        { en: 'I do not have access to the file.', gloss: { ru: 'У меня нет доступа к файлу.', uk: 'У мене немає доступу до файлу.', es: 'No tengo acceso al archivo.' } },
        { en: 'I do not see the new folder.', gloss: { ru: 'Я не вижу новую папку.', uk: 'Я не бачу нову папку.', es: 'No veo la carpeta nueva.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Попроси о помощи спокойно', uk: 'Попроси про допомогу спокійно', es: 'Pide ayuda con calma' },
      body: {
        ru: 'Блокер это не твоя вина. Скажи о препятствии и попроси помощи коротко: I need your help. Команда для этого и нужна. Чем раньше скажешь, тем быстрее всё пойдёт дальше.',
        uk: 'Блокер це не твоя провина. Скажи про перешкоду і попроси допомоги коротко: I need your help. Команда для цього й потрібна. Чим раніше скажеш, тим швидше все піде далі.',
        es: 'Un bloqueo no es tu culpa. Habla del obstáculo y pide ayuda corto: I need your help. El equipo está para eso. Cuanto antes lo digas, antes seguirá todo.',
      },
      examples: [
        { en: 'I need your help today.', gloss: { ru: 'Мне нужна твоя помощь сегодня.', uk: 'Мені потрібна твоя допомога сьогодні.', es: 'Necesito tu ayuda hoy.' } },
        { en: 'I do not know the password.', gloss: { ru: 'Я не знаю пароль.', uk: 'Я не знаю пароль.', es: 'No sé la contraseña.' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d25_p1',
      english: 'I am blocked right now.',
      meaning: { ru: 'Я сейчас застрял.', uk: 'Я зараз застряг.', es: 'Estoy bloqueado ahora mismo.' },
      constructions: ['to-be'],
      explanation: {
        title: { ru: 'blocked = застрял, не могу идти дальше', uk: 'blocked = застряг, не можу йти далі', es: 'blocked = bloqueado, no puedo avanzar' },
        rule: { ru: 'Слово blocked говорит: дело стоит, я не могу двигаться дальше. blocked -> я застрял.', uk: 'Слово blocked каже: справа стоїть, я не можу рухатися далі. blocked -> я застряг.', es: 'La palabra blocked dice: algo está parado, no puedo seguir. blocked -> estoy bloqueado.' },
        why: { ru: 'Это главная фраза дня. Скажи её на созвоне, и команда сразу поймёт, что тебе нужна помощь.', uk: 'Це головна фраза дня. Скажи її на дзвінку, і команда одразу зрозуміє, що тобі потрібна допомога.', es: 'Es la frase clave del día. Dila en la llamada y el equipo sabrá enseguida que necesitas ayuda.' },
        commonMistake: { ru: 'Не говори I block. Ты не блокируешь, это тебя застопорило: I am blocked.', uk: 'Не кажи I block. Ти не блокуєш, це тебе застопорило: I am blocked.', es: 'No digas I block. Tú no bloqueas, a ti te frenaron: I am blocked.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'am', partOfSpeech: 'to-be', distractors: ['is', 'are', 'was', 'were', 'be'] },
        { text: 'blocked', partOfSpeech: 'adjective', distractors: ['green', 'blue', 'round', 'square', 'wooden'] },
        { text: 'right', partOfSpeech: 'adverb', distractors: ['soon', 'today', 'away', 'very', 'only'] },
        { text: 'now', partOfSpeech: 'adverb', distractors: ['then', 'later', 'once', 'always', 'yesterday'] },
      ],
    },
    {
      id: 'mitap_d25_p2',
      english: 'I do not have access to the file.',
      meaning: { ru: 'У меня нет доступа к файлу.', uk: 'У мене немає доступу до файлу.', es: 'No tengo acceso al archivo.' },
      constructions: ['present-simple-negation'],
      explanation: {
        title: { ru: 'do not have = у меня нет', uk: 'do not have = у мене немає', es: 'do not have = no tengo' },
        rule: { ru: 'do not перед have говорит: у меня этого нет. do not have access -> нет доступа.', uk: 'do not перед have каже: у мене цього немає. do not have access -> немає доступу.', es: 'do not antes de have dice: no lo tengo. do not have access -> no hay acceso.' },
        why: { ru: 'Самая частая причина блокера. Назови её, и человек поймёт, какую дверь тебе открыть.', uk: 'Найчастіша причина блокера. Назви її, і людина зрозуміє, які двері тобі відкрити.', es: 'La causa más común de un bloqueo. Dila y la persona sabrá qué puerta abrirte.' },
        commonMistake: { ru: 'Не говори I not have. Перед have обязательно ставь do not: I do not have.', uk: 'Не кажи I not have. Перед have обовʼязково став do not: I do not have.', es: 'No digas I not have. Antes de have pon siempre do not: I do not have.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'do', partOfSpeech: 'verb', distractors: ['does', 'did', 'am', 'is', 'are'] },
        { text: 'not', partOfSpeech: 'adverb', distractors: ['no', 'never', 'none', 'nor', 'nothing'] },
        { text: 'have', partOfSpeech: 'verb', distractors: ['has', 'had', 'get', 'take', 'keep'] },
        { text: 'access', partOfSpeech: 'noun', distractors: ['key', 'door', 'login', 'page', 'screen'] },
        { text: 'to', partOfSpeech: 'other', distractors: ['at', 'on', 'of', 'in', 'for'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'that', 'my'] },
        { text: 'file', partOfSpeech: 'noun', distractors: ['email', 'task', 'note', 'page', 'doc'] },
      ],
    },
    {
      id: 'mitap_d25_p3',
      english: 'I need your help today.',
      meaning: { ru: 'Мне нужна твоя помощь сегодня.', uk: 'Мені потрібна твоя допомога сьогодні.', es: 'Necesito tu ayuda hoy.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'I need = мне нужно', uk: 'I need = мені потрібно', es: 'I need = necesito' },
        rule: { ru: 'need говорит, что тебе что-то очень нужно. I need your help -> мне нужна твоя помощь.', uk: 'need каже, що тобі щось дуже потрібно. I need your help -> мені потрібна твоя допомога.', es: 'need dice que algo te hace mucha falta. I need your help -> necesito tu ayuda.' },
        why: { ru: 'После того как назвал блокер, прямо попроси помощи. Коротко и спокойно это нормально.', uk: 'Після того як назвав блокер, прямо попроси допомоги. Коротко і спокійно це нормально.', es: 'Después de nombrar el bloqueo, pide ayuda directo. Corto y con calma, es normal.' },
        commonMistake: { ru: 'Не говори I need help your. Сначала чья (your), потом что (help): your help.', uk: 'Не кажи I need help your. Спочатку чия (your), потім що (help): your help.', es: 'No digas I need help your. Primero de quién (your), luego qué (help): your help.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'need', partOfSpeech: 'verb', distractors: ['see', 'know', 'give', 'take', 'find'] },
        { text: 'your', partOfSpeech: 'pronoun', distractors: ['my', 'his', 'her', 'our', 'their'] },
        { text: 'help', partOfSpeech: 'noun', distractors: ['time', 'advice', 'answer', 'reply', 'call'] },
        { text: 'today', partOfSpeech: 'adverb', distractors: ['soon', 'now', 'early', 'late', 'once'] },
      ],
    },
    {
      id: 'mitap_d25_p4',
      english: 'I do not know the password.',
      meaning: { ru: 'Я не знаю пароль.', uk: 'Я не знаю пароль.', es: 'No sé la contraseña.' },
      constructions: ['present-simple-negation'],
      explanation: {
        title: { ru: 'do not know = не знаю', uk: 'do not know = не знаю', es: 'do not know = no sé' },
        rule: { ru: 'do not перед know говорит: я этого не знаю. do not know -> я не знаю.', uk: 'do not перед know каже: я цього не знаю. do not know -> я не знаю.', es: 'do not antes de know dice: no lo sé. do not know -> no sé.' },
        why: { ru: 'Часто блокер прост: нет пароля. Скажи честно, и тебе его пришлют.', uk: 'Часто блокер простий: немає пароля. Скажи чесно, і тобі його надішлють.', es: 'A veces el bloqueo es simple: falta la contraseña. Dilo con sinceridad y te la enviarán.' },
        commonMistake: { ru: 'Не говори I know not. Перед know ставь do not: I do not know.', uk: 'Не кажи I know not. Перед know став do not: I do not know.', es: 'No digas I know not. Antes de know pon do not: I do not know.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'do', partOfSpeech: 'verb', distractors: ['does', 'did', 'am', 'is', 'are'] },
        { text: 'not', partOfSpeech: 'adverb', distractors: ['no', 'never', 'none', 'nor', 'nothing'] },
        { text: 'know', partOfSpeech: 'verb', distractors: ['walk', 'sleep', 'run', 'eat', 'sing'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'that', 'my'] },
        { text: 'password', partOfSpeech: 'noun', distractors: ['link', 'code', 'button', 'folder', 'login'] },
      ],
    },
    {
      id: 'mitap_d25_p5',
      english: 'I need the new folder.',
      meaning: { ru: 'Мне нужна новая папка.', uk: 'Мені потрібна нова папка.', es: 'Necesito la carpeta nueva.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'wait for = ждать чего-то', uk: 'wait for = чекати на щось', es: 'wait for = esperar algo' },
        rule: { ru: 'После wait ставь for, потом то, чего ждёшь. wait for the folder -> жду папку.', uk: 'Після wait став for, потім те, на що чекаєш. wait for the folder -> чекаю на папку.', es: 'Después de wait pon for, luego lo que esperas. wait for the folder -> espero la carpeta.' },
        why: { ru: 'Так ты говоришь, что дело стоит из-за чего-то снаружи. Команда видит, что тормозит.', uk: 'Так ти кажеш, що справа стоїть через щось ззовні. Команда бачить, що гальмує.', es: 'Así dices que algo de fuera te detiene. El equipo ve qué frena el trabajo.' },
        commonMistake: { ru: 'Не говори I wait the folder. После wait нужно for: wait for the folder.', uk: 'Не кажи I wait the folder. Після wait потрібне for: wait for the folder.', es: 'No digas I wait the folder. Después de wait va for: wait for the folder.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'need', partOfSpeech: 'verb', distractors: ['see', 'give', 'take', 'find', 'keep'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'that', 'my'] },
        { text: 'new', partOfSpeech: 'adjective', distractors: ['old', 'big', 'small', 'first', 'last'] },
        { text: 'folder', partOfSpeech: 'noun', distractors: ['report', 'email', 'screen', 'button', 'page'] },
      ],
    },
    {
      id: 'mitap_d25_p6',
      english: 'I do not see the link.',
      meaning: { ru: 'Я не вижу ссылку.', uk: 'Я не бачу посилання.', es: 'No veo el enlace.' },
      constructions: ['present-simple-negation'],
      explanation: {
        title: { ru: 'do not see = не вижу', uk: 'do not see = не бачу', es: 'do not see = no veo' },
        rule: { ru: 'do not перед see говорит: я этого не вижу. do not see -> я не вижу.', uk: 'do not перед see каже: я цього не бачу. do not see -> я не бачу.', es: 'do not antes de see dice: no lo veo. do not see -> no veo.' },
        why: { ru: 'Маленький блокер: чего-то нет на экране. Скажи, и тебе пришлют это снова.', uk: 'Маленький блокер: чогось немає на екрані. Скажи, і тобі надішлють це знову.', es: 'Un bloqueo pequeño: algo no está en la pantalla. Dilo y te lo enviarán de nuevo.' },
        commonMistake: { ru: 'Не говори I do not saw. После do not глагол всегда простой: do not see.', uk: 'Не кажи I do not saw. Після do not дієслово завжди просте: do not see.', es: 'No digas I do not saw. Tras do not el verbo va simple: do not see.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'do', partOfSpeech: 'verb', distractors: ['does', 'did', 'am', 'is', 'are'] },
        { text: 'not', partOfSpeech: 'adverb', distractors: ['no', 'never', 'none', 'nor', 'nothing'] },
        { text: 'see', partOfSpeech: 'verb', distractors: ['read', 'hear', 'walk', 'sleep', 'eat'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'that', 'my'] },
        { text: 'link', partOfSpeech: 'noun', distractors: ['folder', 'button', 'page', 'screen', 'report'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'blocked', partOfSpeech: 'adjective', translation: { ru: 'застрял, заблокирован', uk: 'застряг, заблокований', es: 'bloqueado' }, example: 'I am blocked right now.' },
    { word: 'access', partOfSpeech: 'noun', translation: { ru: 'доступ', uk: 'доступ', es: 'acceso' }, example: 'I do not have access to the file.' },
    { word: 'help', partOfSpeech: 'noun', translation: { ru: 'помощь', uk: 'допомога', es: 'ayuda' }, example: 'I need your help today.' },
    { word: 'password', partOfSpeech: 'noun', translation: { ru: 'пароль', uk: 'пароль', es: 'contraseña' }, example: 'I do not know the password.' },
    { word: 'folder', partOfSpeech: 'noun', translation: { ru: 'папка', uk: 'папка', es: 'carpeta' }, example: 'I need the new folder.' },
    { word: 'link', partOfSpeech: 'noun', translation: { ru: 'ссылка', uk: 'посилання', es: 'enlace' }, example: 'I do not see the link.' },
  ],
};

export const MITAP_DAY_26: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 26,
  topic: { ru: 'Попросить помощи с задачей', uk: 'Попросити допомоги із завданням', es: 'Pedir ayuda con una tarea' },
  outcome: {
    ru: 'Ты сможешь вежливо попросить коллегу на созвоне помочь тебе с задачей и объяснить, что именно непонятно.',
    uk: 'Ти зможеш ввічливо попросити колегу на дзвінку допомогти тобі із завданням і пояснити, що саме незрозуміло.',
    es: 'Podrás pedir con amabilidad a un colega en una llamada que te ayude con una tarea y explicar qué no entiendes.',
  },
  level: 'A2',
  prerequisiteLessons: [10, 5],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Попроси о помощи через Can you', uk: 'Попроси про допомогу через Can you', es: 'Pide ayuda con Can you' },
      body: {
        ru: 'На созвоне застрял с задачей? Самый простой способ попросить помощь: Can you help me with this? Это значит «можешь помочь мне с этим». Слово can в начале делает фразу вежливой просьбой. Дальше идёт help me with this — «помочь мне с этим».',
        uk: 'На дзвінку застряг із завданням? Найпростіший спосіб попросити допомогу: Can you help me with this? Це означає «можеш допомогти мені з цим». Слово can на початку робить фразу ввічливим проханням. Далі йде help me with this — «допомогти мені з цим».',
        es: '¿Te atascaste con una tarea en la llamada? La forma más simple de pedir ayuda: Can you help me with this? Significa «puedes ayudarme con esto». La palabra can al inicio convierte la frase en una petición cortés. Luego va help me with this — «ayudarme con esto».',
      },
      examples: [
        { en: 'Can you help me with this?', gloss: { ru: 'Можешь помочь мне с этим?', uk: 'Можеш допомогти мені з цим?', es: '¿Puedes ayudarme con esto?' } },
        { en: 'Can you help me with the report?', gloss: { ru: 'Можешь помочь мне с отчётом?', uk: 'Можеш допомогти мені зі звітом?', es: '¿Puedes ayudarme con el informe?' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Скажи, что именно непонятно', uk: 'Скажи, що саме незрозуміло', es: 'Di qué no entiendes' },
      body: {
        ru: 'Чтобы коллега понял, где ты застрял, скажи прямо: I do not understand this part. Это значит «я не понимаю эту часть». Тут do not — это «не». Так помощь будет точной, и человек объяснит именно то место, где ты запутался.',
        uk: 'Щоб колега зрозумів, де ти застряг, скажи прямо: I do not understand this part. Це означає «я не розумію цю частину». Тут do not — це «не». Так допомога буде точною, і людина пояснить саме те місце, де ти заплутався.',
        es: 'Para que el colega sepa dónde te atascaste, dilo directo: I do not understand this part. Significa «no entiendo esta parte». Aquí do not es «no». Así la ayuda será precisa y la persona explicará justo donde te perdiste.',
      },
      examples: [
        { en: 'I do not understand this part.', gloss: { ru: 'Я не понимаю эту часть.', uk: 'Я не розумію цю частину.', es: 'No entiendo esta parte.' } },
        { en: 'I do not understand the task.', gloss: { ru: 'Я не понимаю задачу.', uk: 'Я не розумію завдання.', es: 'No entiendo la tarea.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Спроси, можешь ли позвать на помощь', uk: 'Запитай, чи можеш покликати на допомогу', es: 'Pregunta si puedes pedir ayuda' },
      body: {
        ru: 'Иногда тебе нужно ещё немного помощи. Спроси вежливо: Could you show me how? Это значит «мог бы ты показать мне как». Слово could мягче, чем can, и звучит особенно вежливо. Так ты просишь коллегу провести тебя по шагам.',
        uk: 'Іноді тобі потрібно ще трохи допомоги. Запитай ввічливо: Could you show me how? Це означає «чи міг би ти показати мені як». Слово could м\'якше, ніж can, і звучить особливо ввічливо. Так ти просиш колегу провести тебе по кроках.',
        es: 'A veces necesitas un poco más de ayuda. Pregunta con amabilidad: Could you show me how? Significa «¿podrías mostrarme cómo». La palabra could es más suave que can y suena muy cortés. Así pides al colega que te guíe paso a paso.',
      },
      examples: [
        { en: 'Could you show me how?', gloss: { ru: 'Мог бы ты показать мне как?', uk: 'Чи міг би ти показати мені як?', es: '¿Podrías mostrarme cómo?' } },
        { en: 'Could you show me the steps?', gloss: { ru: 'Мог бы ты показать мне шаги?', uk: 'Чи міг би ти показати мені кроки?', es: '¿Podrías mostrarme los pasos?' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d26_p1',
      english: 'Can you help me with this?',
      meaning: { ru: 'Можешь помочь мне с этим?', uk: 'Можеш допомогти мені з цим?', es: '¿Puedes ayudarme con esto?' },
      constructions: ['modals', 'present-simple-questions'],
      explanation: {
        title: { ru: 'Вежливая просьба о помощи', uk: 'Ввічливе прохання про допомогу', es: 'Petición cortés de ayuda' },
        rule: { ru: 'Can значит «можешь». Ставь Can в начало, и просьба готова. Can -> можешь.', uk: 'Can значить «можеш». Постав Can на початок, і прохання готове. Can -> можеш.', es: 'Can significa «puedes». Pon Can al inicio y la petición está lista. Can -> puedes.' },
        why: { ru: 'Это самая простая и вежливая фраза, когда застрял с задачей на созвоне.', uk: 'Це найпростіша і ввічлива фраза, коли застряг із завданням на дзвінку.', es: 'Es la frase más simple y cortés cuando te atascas con una tarea en la llamada.' },
        commonMistake: { ru: 'После Can бери help без to: Can you help, а не Can you to help.', uk: 'Після Can бери help без to: Can you help, а не Can you to help.', es: 'Tras Can usa help sin to: Can you help, no Can you to help.' },
      },
      words: [
        { text: 'Can', partOfSpeech: 'modal', distractors: ['Must', 'Should', 'May', 'Did', 'Do'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['we', 'they', 'he', 'she', 'it'] },
        { text: 'help', partOfSpeech: 'verb', distractors: ['call', 'read', 'write', 'drive', 'cook'] },
        { text: 'me', partOfSpeech: 'pronoun', distractors: ['us', 'them', 'him', 'her', 'it'] },
        { text: 'with', partOfSpeech: 'preposition', distractors: ['for', 'near', 'from', 'by', 'of'] },
        { text: 'this', partOfSpeech: 'determiner', distractors: ['a', 'my', 'the', 'some', 'any'] },
      ],
    },
    {
      id: 'mitap_d26_p2',
      english: 'I do not understand this part.',
      meaning: { ru: 'Я не понимаю эту часть.', uk: 'Я не розумію цю частину.', es: 'No entiendo esta parte.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'Скажи, что не понимаешь', uk: 'Скажи, що не розумієш', es: 'Di que no entiendes' },
        rule: { ru: 'Do not значит «не». Ставь do not перед understand, и говоришь, что не понял. understand -> понимать.', uk: 'Do not значить «не». Постав do not перед understand, і кажеш, що не зрозумів. understand -> розуміти.', es: 'Do not significa «no». Pon do not antes de understand y dices que no entiendes. understand -> entender.' },
        why: { ru: 'Так коллега понимает, где именно ты застрял, и помощь будет точной.', uk: 'Так колега розуміє, де саме ти застряг, і допомога буде точною.', es: 'Así el colega entiende dónde te atascaste y la ayuda será precisa.' },
        commonMistake: { ru: 'Не теряй do перед not: нужно I do not understand, а не I not understand.', uk: 'Не губи do перед not: треба I do not understand, а не I not understand.', es: 'No pierdas do antes de not: I do not understand, no I not understand.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['we', 'they', 'you', 'he', 'she'] },
        { text: 'do', partOfSpeech: 'verb', distractors: ['does', 'did', 'am', 'is', 'was'] },
        { text: 'not', partOfSpeech: 'adverb', distractors: ['never', 'always', 'often', 'soon', 'here'] },
        { text: 'understand', partOfSpeech: 'verb', distractors: ['read', 'write', 'drive', 'cook', 'run'] },
        { text: 'this', partOfSpeech: 'determiner', distractors: ['a', 'my', 'the', 'some', 'any'] },
        { text: 'part', partOfSpeech: 'noun', distractors: ['call', 'desk', 'room', 'box', 'door'] },
      ],
    },
    {
      id: 'mitap_d26_p3',
      english: 'Could you show me how?',
      meaning: { ru: 'Мог бы ты показать мне как?', uk: 'Чи міг би ти показати мені як?', es: '¿Podrías mostrarme cómo?' },
      constructions: ['modals', 'present-simple-questions'],
      explanation: {
        title: { ru: 'Очень вежливая просьба', uk: 'Дуже ввічливе прохання', es: 'Petición muy cortés' },
        rule: { ru: 'Could мягче, чем can, и значит «мог бы». Ставь Could в начало просьбы. Could -> мог бы.', uk: 'Could м\'якше, ніж can, і значить «міг би». Постав Could на початок прохання. Could -> міг би.', es: 'Could es más suave que can y significa «podrías». Pon Could al inicio de la petición. Could -> podrías.' },
        why: { ru: 'Could звучит мягче и вежливее. Хорошо для просьбы к старшему коллеге.', uk: 'Could звучить м\'якше і ввічливіше. Добре для прохання до старшого колеги.', es: 'Could suena más suave y cortés. Bueno para pedir a un colega mayor.' },
        commonMistake: { ru: 'После Could бери show без to: Could you show, а не Could you to show.', uk: 'Після Could бери show без to: Could you show, а не Could you to show.', es: 'Tras Could usa show sin to: Could you show, no Could you to show.' },
      },
      words: [
        { text: 'Could', partOfSpeech: 'modal', distractors: ['Must', 'Should', 'May', 'Did', 'Do'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['we', 'they', 'he', 'she', 'it'] },
        { text: 'show', partOfSpeech: 'verb', distractors: ['read', 'write', 'drive', 'cook', 'run'] },
        { text: 'me', partOfSpeech: 'pronoun', distractors: ['us', 'them', 'him', 'her', 'it'] },
        { text: 'how', partOfSpeech: 'adverb', distractors: ['when', 'where', 'why', 'who', 'what'] },
      ],
    },
    {
      id: 'mitap_d26_p4',
      english: 'Do you have a minute?',
      meaning: { ru: 'У тебя есть минутка?', uk: 'У тебе є хвилинка?', es: '¿Tienes un minuto?' },
      constructions: ['present-simple-questions'],
      explanation: {
        title: { ru: 'Спроси, есть ли время', uk: 'Запитай, чи є час', es: 'Pregunta si tiene tiempo' },
        rule: { ru: 'Ставь Do you have в начало, и спрашиваешь, есть ли у человека время. have -> есть.', uk: 'Постав Do you have на початок, і питаєш, чи є в людини час. have -> є.', es: 'Pon Do you have al inicio y preguntas si la persona tiene tiempo. have -> tener.' },
        why: { ru: 'Перед просьбой о помощи вежливо спросить, свободен ли человек сейчас.', uk: 'Перед проханням про допомогу ввічливо запитати, чи вільна людина зараз.', es: 'Antes de pedir ayuda es cortés preguntar si la persona está libre ahora.' },
        commonMistake: { ru: 'Начинай вопрос с Do: нужно Do you have, а не You have a minute?', uk: 'Починай запитання з Do: треба Do you have, а не You have a minute?', es: 'Empieza la pregunta con Do: Do you have, no You have a minute?' },
      },
      words: [
        { text: 'Do', partOfSpeech: 'verb', distractors: ['Does', 'Did', 'Are', 'Is', 'Was'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['we', 'they', 'he', 'she', 'it'] },
        { text: 'have', partOfSpeech: 'verb', distractors: ['read', 'write', 'drive', 'cook', 'run'] },
        { text: 'a', partOfSpeech: 'determiner', distractors: ['the', 'my', 'this', 'that', 'some'] },
        { text: 'minute', partOfSpeech: 'noun', distractors: ['call', 'desk', 'room', 'box', 'door'] },
      ],
    },
    {
      id: 'mitap_d26_p5',
      english: 'Can you explain this task again?',
      meaning: { ru: 'Можешь объяснить эту задачу ещё раз?', uk: 'Можеш пояснити це завдання ще раз?', es: '¿Puedes explicar esta tarea otra vez?' },
      constructions: ['modals', 'present-simple-questions'],
      explanation: {
        title: { ru: 'Попроси объяснить ещё раз', uk: 'Попроси пояснити ще раз', es: 'Pide explicar otra vez' },
        rule: { ru: 'Explain значит «объяснить». После Can you ставь explain, и просишь повтор. explain -> объяснить.', uk: 'Explain значить «пояснити». Після Can you став explain, і просиш повтор. explain -> пояснити.', es: 'Explain significa «explicar». Tras Can you pon explain y pides repetir. explain -> explicar.' },
        why: { ru: 'Если не понял с первого раза, нормально вежливо попросить объяснить снова.', uk: 'Якщо не зрозумів з першого разу, нормально ввічливо попросити пояснити знову.', es: 'Si no entendiste a la primera, está bien pedir con cortesía que expliquen de nuevo.' },
        commonMistake: { ru: 'После Can бери explain без to: Can you explain, а не Can you to explain.', uk: 'Після Can бери explain без to: Can you explain, а не Can you to explain.', es: 'Tras Can usa explain sin to: Can you explain, no Can you to explain.' },
      },
      words: [
        { text: 'Can', partOfSpeech: 'modal', distractors: ['Must', 'Should', 'May', 'Did', 'Do'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['we', 'they', 'he', 'she', 'it'] },
        { text: 'explain', partOfSpeech: 'verb', distractors: ['read', 'write', 'drive', 'cook', 'run'] },
        { text: 'this', partOfSpeech: 'determiner', distractors: ['a', 'my', 'the', 'some', 'any'] },
        { text: 'task', partOfSpeech: 'noun', distractors: ['call', 'desk', 'room', 'box', 'door'] },
        { text: 'again', partOfSpeech: 'adverb', distractors: ['here', 'soon', 'often', 'never', 'always'] },
      ],
    },
    {
      id: 'mitap_d26_p6',
      english: 'Thank you for your help.',
      meaning: { ru: 'Спасибо за твою помощь.', uk: 'Дякую за твою допомогу.', es: 'Gracias por tu ayuda.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'Поблагодари за помощь', uk: 'Подякуй за допомогу', es: 'Agradece la ayuda' },
        rule: { ru: 'Thank you for значит «спасибо за». Дальше ставь то, за что благодаришь: your help. help -> помощь.', uk: 'Thank you for значить «дякую за». Далі став те, за що дякуєш: your help. help -> допомога.', es: 'Thank you for significa «gracias por». Luego pon lo que agradeces: your help. help -> ayuda.' },
        why: { ru: 'После помощи на созвоне всегда вежливо поблагодарить коллегу. Это поддерживает добрые отношения.', uk: 'Після допомоги на дзвінку завжди ввічливо подякувати колезі. Це підтримує добрі стосунки.', es: 'Tras la ayuda en la llamada siempre es cortés agradecer al colega. Mantiene buena relación.' },
        commonMistake: { ru: 'После thank you бери for, а не of: thank you for your help.', uk: 'Після thank you бери for, а не of: thank you for your help.', es: 'Tras thank you usa for, no of: thank you for your help.' },
      },
      words: [
        { text: 'Thank', partOfSpeech: 'verb', distractors: ['read', 'write', 'drive', 'cook', 'run'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['we', 'they', 'he', 'she', 'it'] },
        { text: 'for', partOfSpeech: 'preposition', distractors: ['with', 'near', 'from', 'by', 'of'] },
        { text: 'your', partOfSpeech: 'pronoun', distractors: ['my', 'his', 'her', 'their', 'our'] },
        { text: 'help', partOfSpeech: 'noun', distractors: ['call', 'desk', 'room', 'box', 'door'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'help', partOfSpeech: 'verb', translation: { ru: 'помогать', uk: 'допомагати', es: 'ayudar' }, example: 'Can you help me with this?' },
    { word: 'understand', partOfSpeech: 'verb', translation: { ru: 'понимать', uk: 'розуміти', es: 'entender' }, example: 'I do not understand this part.' },
    { word: 'show', partOfSpeech: 'verb', translation: { ru: 'показывать', uk: 'показувати', es: 'mostrar' }, example: 'Could you show me how?' },
    { word: 'minute', partOfSpeech: 'noun', translation: { ru: 'минута', uk: 'хвилина', es: 'minuto' }, example: 'Do you have a minute?' },
    { word: 'explain', partOfSpeech: 'verb', translation: { ru: 'объяснять', uk: 'пояснювати', es: 'explicar' }, example: 'Can you explain this task again?' },
    { word: 'task', partOfSpeech: 'noun', translation: { ru: 'задача', uk: 'завдання', es: 'tarea' }, example: 'Can you explain this task again?' },
  ],
};

export const MITAP_DAY_27: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 27,
  topic: { ru: 'Оценить срок: когда будет готово', uk: 'Оцінити термін: коли буде готово', es: 'Estimar el plazo: cuándo estará listo' },
  outcome: {
    ru: 'Ты сможешь спокойно назвать срок сдачи на созвоне и сказать, когда работа будет готова.',
    uk: 'Ти зможеш спокійно назвати термін здачі на дзвінку і сказати, коли робота буде готова.',
    es: 'Podrás decir con calma el plazo de entrega en una reunión y cuándo estará listo el trabajo.',
  },
  level: 'A2',
  prerequisiteLessons: [13, 8],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Назови срок словом will', uk: 'Назви термін словом will', es: 'Di el plazo con will' },
      body: {
        ru: 'Когда говоришь, что что-то будет готово потом, ставь will перед делом. It will be ready значит будет готово.',
        uk: 'Коли кажеш, що щось буде готове потім, став will перед справою. It will be ready значить буде готове.',
        es: 'Cuando dices que algo estará listo después, pon will antes de la acción. It will be ready significa estará listo.',
      },
      examples: [
        { en: 'It will be ready by Friday.', gloss: { ru: 'Будет готово к пятнице.', uk: 'Буде готове до п\'ятниці.', es: 'Estará listo para el viernes.' } },
        { en: 'I will finish it tomorrow.', gloss: { ru: 'Я закончу это завтра.', uk: 'Я закінчу це завтра.', es: 'Lo terminaré mañana.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Слово by ставит крайний срок', uk: 'Слово by ставить крайній термін', es: 'La palabra by marca la fecha límite' },
      body: {
        ru: 'by перед днём значит не позже этого дня. by Friday это к пятнице. Так ты называешь дедлайн.',
        uk: 'by перед днем значить не пізніше цього дня. by Friday це до п\'ятниці. Так ти називаєш дедлайн.',
        es: 'by antes de un día significa no más tarde de ese día. by Friday es para el viernes. Así dices la fecha límite.',
      },
      examples: [
        { en: 'It will be ready by Friday.', gloss: { ru: 'Будет готово к пятнице.', uk: 'Буде готове до п\'ятниці.', es: 'Estará listo para el viernes.' } },
        { en: 'We will send it by Monday.', gloss: { ru: 'Мы отправим это к понедельнику.', uk: 'Ми надішлемо це до понеділка.', es: 'Lo enviaremos para el lunes.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Спроси про срок через when will', uk: 'Запитай про термін через when will', es: 'Pregunta el plazo con when will' },
      body: {
        ru: 'Хочешь узнать срок у коллеги, скажи When will it be ready. Это значит когда будет готово.',
        uk: 'Хочеш дізнатися термін у колеги, скажи When will it be ready. Це значить коли буде готове.',
        es: 'Si quieres saber el plazo de un colega, di When will it be ready. Significa cuándo estará listo.',
      },
      examples: [
        { en: 'When will it be ready?', gloss: { ru: 'Когда будет готово?', uk: 'Коли буде готово?', es: '¿Cuándo estará listo?' } },
        { en: 'When will you finish the report?', gloss: { ru: 'Когда ты закончишь отчёт?', uk: 'Коли ти закінчиш звіт?', es: '¿Cuándo terminarás el informe?' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d27_p1',
      english: 'It will be ready by Friday.',
      meaning: { ru: 'Будет готово к пятнице.', uk: 'Буде готове до п\'ятниці.', es: 'Estará listo para el viernes.' },
      constructions: ['future-simple', 'prepositions-time'],
      explanation: {
        title: { ru: 'will для будущего срока', uk: 'will для майбутнього терміну', es: 'will para un plazo futuro' },
        rule: { ru: 'will значит будет. will be ready это будет готово. Так называешь срок сдачи.', uk: 'will значить буде. will be ready це буде готове. Так називаєш термін здачі.', es: 'will significa estará. will be ready es estará listo. Así dices el plazo de entrega.' },
        why: { ru: 'Срок в будущем, поэтому ставим will. Спокойно обещаешь, когда работа будет готова.', uk: 'Термін у майбутньому, тому ставимо will. Спокійно обіцяєш, коли робота буде готова.', es: 'El plazo es futuro, por eso ponemos will. Prometes con calma cuándo estará el trabajo.' },
        commonMistake: { ru: 'Не говори It is ready by Friday. Срок будущий, нужно It will be ready.', uk: 'Не кажи It is ready by Friday. Термін майбутній, потрібно It will be ready.', es: 'No digas It is ready by Friday. El plazo es futuro, di It will be ready.' },
      },
      words: [
        { text: 'It', partOfSpeech: 'pronoun', distractors: ['He', 'She', 'They', 'We', 'You'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'would'] },
        { text: 'be', partOfSpeech: 'to-be', distractors: ['is', 'was', 'are', 'been', 'were'] },
        { text: 'ready', partOfSpeech: 'adjective', distractors: ['busy', 'late', 'heavy', 'quiet', 'clean'] },
        { text: 'by', partOfSpeech: 'preposition', distractors: ['at', 'on', 'in', 'of', 'with'] },
        { text: 'Friday', partOfSpeech: 'noun', distractors: ['morning', 'week', 'office', 'report', 'meeting'] },
      ],
    },
    {
      id: 'mitap_d27_p2',
      english: 'When will it be ready?',
      meaning: { ru: 'Когда будет готово?', uk: 'Коли буде готове?', es: '¿Cuándo estará listo?' },
      constructions: ['future-simple', 'wh-questions'],
      explanation: {
        title: { ru: 'Вопрос про срок', uk: 'Питання про термін', es: 'Pregunta sobre el plazo' },
        rule: { ru: 'When значит когда. When will it be ready это когда будет готово. Спрашиваешь срок.', uk: 'When значить коли. When will it be ready це коли буде готове. Питаєш термін.', es: 'When significa cuándo. When will it be ready es cuándo estará listo. Preguntas el plazo.' },
        why: { ru: 'В вопросе про будущее will идёт сразу после When. Так узнаёшь дедлайн у коллеги.', uk: 'У питанні про майбутнє will іде відразу після When. Так дізнаєшся дедлайн у колеги.', es: 'En la pregunta sobre el futuro will va justo después de When. Así sabes la fecha límite.' },
        commonMistake: { ru: 'Не говори When it will be ready. После When сразу will: When will it.', uk: 'Не кажи When it will be ready. Після When відразу will: When will it.', es: 'No digas When it will be ready. Tras When va will: When will it.' },
      },
      words: [
        { text: 'When', partOfSpeech: 'adverb', distractors: ['Where', 'How', 'Why', 'Who', 'Which'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'would'] },
        { text: 'it', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'they', 'we', 'you'] },
        { text: 'be', partOfSpeech: 'to-be', distractors: ['is', 'was', 'are', 'been', 'were'] },
        { text: 'ready', partOfSpeech: 'adjective', distractors: ['busy', 'late', 'heavy', 'quiet', 'clean'] },
      ],
    },
    {
      id: 'mitap_d27_p3',
      english: 'I will finish the report by Monday.',
      meaning: { ru: 'Я закончу отчёт к понедельнику.', uk: 'Я закінчу звіт до понеділка.', es: 'Terminaré el informe para el lunes.' },
      constructions: ['future-simple', 'prepositions-time'],
      explanation: {
        title: { ru: 'Обещай закончить к сроку', uk: 'Обіцяй закінчити до терміну', es: 'Promete terminar para el plazo' },
        rule: { ru: 'will finish значит закончу. by Monday значит к понедельнику. Так даёшь обещание по сроку.', uk: 'will finish значить закінчу. by Monday значить до понеділка. Так даєш обіцянку щодо терміну.', es: 'will finish significa terminaré. by Monday es para el lunes. Así das una promesa sobre el plazo.' },
        why: { ru: 'Дело в будущем, поэтому will finish. by Monday показывает крайний день. Уверенно называешь срок.', uk: 'Справа в майбутньому, тому will finish. by Monday показує крайній день. Впевнено називаєш термін.', es: 'La acción es futura, por eso will finish. by Monday muestra el día límite. Dices el plazo con seguridad.' },
        commonMistake: { ru: 'Не говори I will finish on Monday для дедлайна. Крайний срок это by Monday.', uk: 'Не кажи I will finish on Monday для дедлайну. Крайній термін це by Monday.', es: 'No digas I will finish on Monday para un plazo. La fecha límite es by Monday.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['He', 'She', 'They', 'We', 'You'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'would'] },
        { text: 'finish', partOfSpeech: 'verb', distractors: ['start', 'open', 'read', 'write', 'call'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'that', 'some'] },
        { text: 'report', partOfSpeech: 'noun', distractors: ['meeting', 'office', 'email', 'call', 'week'] },
        { text: 'by', partOfSpeech: 'preposition', distractors: ['at', 'on', 'in', 'of', 'with'] },
        { text: 'Monday', partOfSpeech: 'noun', distractors: ['morning', 'week', 'office', 'report', 'meeting'] },
      ],
    },
    {
      id: 'mitap_d27_p4',
      english: 'We will send it tomorrow morning.',
      meaning: { ru: 'Мы отправим это завтра утром.', uk: 'Ми надішлемо це завтра вранці.', es: 'Lo enviaremos mañana por la mañana.' },
      constructions: ['future-simple', 'prepositions-time'],
      explanation: {
        title: { ru: 'Назови, когда отправишь', uk: 'Назви, коли надішлеш', es: 'Di cuándo lo enviarás' },
        rule: { ru: 'will send значит отправим. tomorrow morning значит завтра утром. Так называешь точное время.', uk: 'will send значить надішлемо. tomorrow morning значить завтра вранці. Так називаєш точний час.', es: 'will send significa enviaremos. tomorrow morning es mañana por la mañana. Así dices la hora exacta.' },
        why: { ru: 'Отправка будет потом, поэтому will send. tomorrow morning уточняет момент. Коллега знает, когда ждать.', uk: 'Відправка буде потім, тому will send. tomorrow morning уточнює момент. Колега знає, коли чекати.', es: 'El envío será después, por eso will send. tomorrow morning precisa el momento. El colega sabe cuándo esperar.' },
        commonMistake: { ru: 'Не говори We send it tomorrow. Дело будущее, нужно We will send.', uk: 'Не кажи We send it tomorrow. Справа майбутня, потрібно We will send.', es: 'No digas We send it tomorrow. La acción es futura, di We will send.' },
      },
      words: [
        { text: 'We', partOfSpeech: 'pronoun', distractors: ['He', 'She', 'They', 'It', 'You'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'would'] },
        { text: 'send', partOfSpeech: 'verb', distractors: ['finish', 'start', 'open', 'read', 'call'] },
        { text: 'it', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'they', 'we', 'you'] },
        { text: 'tomorrow', partOfSpeech: 'adverb', distractors: ['yesterday', 'today', 'soon', 'later', 'early'] },
        { text: 'morning', partOfSpeech: 'noun', distractors: ['report', 'office', 'meeting', 'week', 'email'] },
      ],
    },
    {
      id: 'mitap_d27_p5',
      english: 'It will not be ready today.',
      meaning: { ru: 'Сегодня это не будет готово.', uk: 'Сьогодні це не буде готове.', es: 'Hoy no estará listo.' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'Скажи, что не успеешь', uk: 'Скажи, що не встигнеш', es: 'Di que no llegarás a tiempo' },
        rule: { ru: 'will not значит не будет. will not be ready значит не будет готово. Честно говоришь про задержку.', uk: 'will not значить не буде. will not be ready значить не буде готове. Чесно кажеш про затримку.', es: 'will not significa no estará. will not be ready es no estará listo. Dices con honestidad el retraso.' },
        why: { ru: 'Чтобы отказать в сроке, ставим not после will. Коллега сразу понимает, что сегодня рано.', uk: 'Щоб відмовити в терміні, ставимо not після will. Колега відразу розуміє, що сьогодні рано.', es: 'Para negar el plazo, ponemos not tras will. El colega entiende que hoy es pronto.' },
        commonMistake: { ru: 'Не говори It will not ready. Нужно слово be: will not be ready.', uk: 'Не кажи It will not ready. Потрібне слово be: will not be ready.', es: 'No digas It will not ready. Falta be: will not be ready.' },
      },
      words: [
        { text: 'It', partOfSpeech: 'pronoun', distractors: ['He', 'She', 'They', 'We', 'You'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'would'] },
        { text: 'not', partOfSpeech: 'adverb', distractors: ['never', 'also', 'very', 'quite', 'really'] },
        { text: 'be', partOfSpeech: 'to-be', distractors: ['is', 'was', 'are', 'been', 'were'] },
        { text: 'ready', partOfSpeech: 'adjective', distractors: ['busy', 'late', 'heavy', 'quiet', 'clean'] },
        { text: 'today', partOfSpeech: 'adverb', distractors: ['yesterday', 'soon', 'later', 'early', 'now'] },
      ],
    },
    {
      id: 'mitap_d27_p6',
      english: 'When will you finish the meeting?',
      meaning: { ru: 'Когда ты закончишь встречу?', uk: 'Коли ти закінчиш зустріч?', es: '¿Cuándo terminarás la reunión?' },
      constructions: ['future-simple', 'wh-questions'],
      explanation: {
        title: { ru: 'Спроси, когда закончат', uk: 'Запитай, коли закінчать', es: 'Pregunta cuándo terminarán' },
        rule: { ru: 'When will you finish значит когда ты закончишь. Так узнаёшь срок встречи у коллеги.', uk: 'When will you finish значить коли ти закінчиш. Так дізнаєшся термін зустрічі у колеги.', es: 'When will you finish significa cuándo terminarás. Así sabes el plazo de la reunión.' },
        why: { ru: 'В вопросе про будущее will идёт после When, потом you. Спокойно уточняешь время.', uk: 'У питанні про майбутнє will іде після When, потім you. Спокійно уточнюєш час.', es: 'En la pregunta sobre el futuro will va tras When, luego you. Precisas la hora con calma.' },
        commonMistake: { ru: 'Не говори When you will finish. После When сразу will: When will you.', uk: 'Не кажи When you will finish. Після When відразу will: When will you.', es: 'No digas When you will finish. Tras When va will: When will you.' },
      },
      words: [
        { text: 'When', partOfSpeech: 'adverb', distractors: ['Where', 'How', 'Why', 'Who', 'Which'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'would'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'they', 'we', 'it'] },
        { text: 'finish', partOfSpeech: 'verb', distractors: ['start', 'open', 'read', 'write', 'call'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'that', 'some'] },
        { text: 'meeting', partOfSpeech: 'noun', distractors: ['report', 'office', 'email', 'week', 'morning'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'will', partOfSpeech: 'modal', translation: { ru: 'будет (про будущее)', uk: 'буде (про майбутнє)', es: '(marca futuro) estará' }, example: 'It will be ready by Friday.' },
    { word: 'ready', partOfSpeech: 'adjective', translation: { ru: 'готовый', uk: 'готовий', es: 'listo' }, example: 'When will it be ready?' },
    { word: 'by', partOfSpeech: 'preposition', translation: { ru: 'к (сроку)', uk: 'до (терміну)', es: 'para (un plazo)' }, example: 'I will finish the report by Monday.' },
    { word: 'send', partOfSpeech: 'verb', translation: { ru: 'отправить', uk: 'надіслати', es: 'enviar' }, example: 'We will send it tomorrow morning.' },
    { word: 'today', partOfSpeech: 'adverb', translation: { ru: 'сегодня', uk: 'сьогодні', es: 'hoy' }, example: 'It will not be ready today.' },
    { word: 'finish', partOfSpeech: 'verb', translation: { ru: 'закончить', uk: 'закінчити', es: 'terminar' }, example: 'When will you finish the meeting?' },
  ],
};

export const MITAP_DAY_28: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 28,
  topic: { ru: 'Повторение недели 4: дейли-стендап', uk: 'Повторення тижня 4: дейлі-стендап', es: 'Repaso de la semana 4: reunión diaria' },
  outcome: {
    ru: 'Ты проведёшь короткий дейли-стендап: расскажешь статус, что делал вчера, что делаешь сегодня, назовёшь блокер, попросишь помощь и срок.',
    uk: 'Ти проведеш короткий дейлі-стендап: розкажеш статус, що робив учора, що робиш сьогодні, назвеш блокер, попросиш допомогу і термін.',
    es: 'Llevarás una reunión diaria corta: dirás tu estado, qué hiciste ayer, qué haces hoy, el bloqueo, pedirás ayuda y el plazo.',
  },
  level: 'A2',
  prerequisiteLessons: [11, 13],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Что я делаю прямо сейчас', uk: 'Що я роблю просто зараз', es: 'Qué estoy haciendo ahora mismo' },
      body: {
        ru: 'На стендапе сначала скажи, чем ты занят сейчас. Бери am/is/are и слово на -ing: I am working. Так все видят твой текущий шаг.',
        uk: 'На стендапі спершу скажи, чим ти зайнятий зараз. Бери am/is/are і слово на -ing: I am working. Так усі бачать твій поточний крок.',
        es: 'En la reunión di primero qué haces ahora. Usa am/is/are con la palabra en -ing: I am working. Así todos ven tu paso actual.',
      },
      examples: [
        { en: 'I am working on the report now', gloss: { ru: 'Я сейчас работаю над отчётом', uk: 'Я зараз працюю над звітом', es: 'Estoy trabajando en el informe ahora' } },
        { en: 'She is testing the new screen', gloss: { ru: 'Она тестирует новый экран', uk: 'Вона тестує новий екран', es: 'Ella está probando la pantalla nueva' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Что я сделал вчера', uk: 'Що я зробив учора', es: 'Qué hice ayer' },
      body: {
        ru: 'Про вчера меняй слово-действие: add превращается в added, finish в finished. Просто добавь -ed в конец: I finished the task.',
        uk: 'Про вчора зміни слово-дію: add стає added, finish стає finished. Просто додай -ed у кінець: I finished the task.',
        es: 'Para ayer cambia la palabra de acción: add pasa a added, finish a finished. Solo añade -ed al final: I finished the task.',
      },
      examples: [
        { en: 'I finished the first task yesterday', gloss: { ru: 'Я закончил первую задачу вчера', uk: 'Я закінчив перше завдання вчора', es: 'Terminé la primera tarea ayer' } },
        { en: 'We added two new tests yesterday', gloss: { ru: 'Мы добавили два новых теста вчера', uk: 'Ми додали два нових тести вчора', es: 'Añadimos dos pruebas nuevas ayer' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Что я сделаю и когда', uk: 'Що я зроблю і коли', es: 'Qué haré y cuándo' },
      body: {
        ru: 'Про план на потом ставь will перед действием: I will fix it. Хочешь назвать срок — добавь by Friday или tomorrow.',
        uk: 'Про план на потім став will перед дією: I will fix it. Хочеш назвати термін — додай by Friday або tomorrow.',
        es: 'Para el plan futuro pon will antes de la acción: I will fix it. Para el plazo añade by Friday o tomorrow.',
      },
      examples: [
        { en: 'I will fix the bug by Friday', gloss: { ru: 'Я починю баг к пятнице', uk: 'Я полагоджу баг до п\'ятниці', es: 'Arreglaré el error para el viernes' } },
        { en: 'We will finish the page tomorrow', gloss: { ru: 'Мы закончим страницу завтра', uk: 'Ми закінчимо сторінку завтра', es: 'Terminaremos la página mañana' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d28_p1',
      english: 'I am working on the report now',
      meaning: { ru: 'Я сейчас работаю над отчётом', uk: 'Я зараз працюю над звітом', es: 'Estoy trabajando en el informe ahora' },
      constructions: ['present-continuous'],
      explanation: {
        title: { ru: 'Что делаешь прямо сейчас', uk: 'Що робиш просто зараз', es: 'Qué haces justo ahora' },
        rule: { ru: 'Для дела в данный момент бери am и слово на -ing. work -> working. Это твой текущий шаг.', uk: 'Для справи в цей момент бери am і слово на -ing. work -> working. Це твій поточний крок.', es: 'Para algo en este momento usa am y la palabra en -ing. work -> working. Es tu paso actual.' },
        why: { ru: 'На стендапе так показываешь, чем занят прямо сейчас, без лишних слов.', uk: 'На стендапі так показуєш, чим зайнятий просто зараз, без зайвих слів.', es: 'En la reunión así muestras qué haces ahora mismo, sin palabras de más.' },
        commonMistake: { ru: 'Не говори I work now про текущий момент. Сейчас нужно am working.', uk: 'Не кажи I work now про поточний момент. Зараз потрібно am working.', es: 'No digas I work now para el momento actual. Ahora va am working.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'you'] },
        { text: 'am', partOfSpeech: 'to-be', distractors: ['is', 'are', 'was', 'were', 'be'] },
        { text: 'working', partOfSpeech: 'verb', distractors: ['checking', 'reading', 'writing', 'calling', 'planning'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['at', 'in', 'of', 'for', 'with'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'that', 'my'] },
        { text: 'report', partOfSpeech: 'noun', distractors: ['budget', 'email', 'screen', 'client', 'meeting'] },
        { text: 'now', partOfSpeech: 'adverb', distractors: ['soon', 'later', 'yesterday', 'again', 'then'] },
      ],
    },
    {
      id: 'mitap_d28_p2',
      english: 'I finished the first task yesterday',
      meaning: { ru: 'Я закончил первую задачу вчера', uk: 'Я закінчив перше завдання вчора', es: 'Terminé la primera tarea ayer' },
      constructions: ['past-simple-regular'],
      explanation: {
        title: { ru: 'Что сделал вчера', uk: 'Що зробив учора', es: 'Qué hiciste ayer' },
        rule: { ru: 'Про прошлое добавь -ed: finish -> finished. yesterday значит вчера. Так отчитываешься за вчерашний день.', uk: 'Про минуле додай -ed: finish -> finished. yesterday означає вчора. Так звітуєш за вчорашній день.', es: 'Para el pasado añade -ed: finish -> finished. yesterday significa ayer. Así reportas el día anterior.' },
        why: { ru: 'Команде важно слышать, что именно ты завершил, прежде чем брать новое.', uk: 'Команді важливо чути, що саме ти завершив, перш ніж брати нове.', es: 'Al equipo le importa oír qué cerraste antes de tomar algo nuevo.' },
        commonMistake: { ru: 'Не говори I finish про вчера. С yesterday нужно finished.', uk: 'Не кажи I finish про вчора. З yesterday потрібно finished.', es: 'No digas I finish para ayer. Con yesterday va finished.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'you'] },
        { text: 'finished', partOfSpeech: 'verb', distractors: ['started', 'tested', 'checked', 'planned', 'opened'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'that', 'my'] },
        { text: 'first', partOfSpeech: 'adjective', distractors: ['small', 'easy', 'quick', 'main', 'short'] },
        { text: 'task', partOfSpeech: 'noun', distractors: ['call', 'email', 'screen', 'ticket', 'page'] },
        { text: 'yesterday', partOfSpeech: 'adverb', distractors: ['today', 'tomorrow', 'now', 'early', 'late'] },
      ],
    },
    {
      id: 'mitap_d28_p3',
      english: 'I will fix the bug by Friday',
      meaning: { ru: 'Я починю баг к пятнице', uk: 'Я полагоджу баг до п\'ятниці', es: 'Arreglaré el error para el viernes' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'Что сделаю и срок', uk: 'Що зроблю і термін', es: 'Qué haré y el plazo' },
        rule: { ru: 'Про план поставь will перед действием: will fix. by Friday значит к пятнице. Так называешь срок.', uk: 'Про план постав will перед дією: will fix. by Friday означає до п\'ятниці. Так називаєш термін.', es: 'Para el plan pon will antes de la acción: will fix. by Friday significa para el viernes. Así das el plazo.' },
        why: { ru: 'Срок успокаивает команду: все понимают, когда ждать готовый результат.', uk: 'Термін заспокоює команду: усі розуміють, коли чекати готовий результат.', es: 'El plazo calma al equipo: todos saben cuándo esperar el resultado.' },
        commonMistake: { ru: 'Не говори I fix it Friday. Для плана нужно will fix.', uk: 'Не кажи I fix it Friday. Для плану потрібно will fix.', es: 'No digas I fix it Friday. Para el plan va will fix.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'you'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'could'] },
        { text: 'fix', partOfSpeech: 'verb', distractors: ['send', 'check', 'close', 'test', 'review'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'that', 'my'] },
        { text: 'bug', partOfSpeech: 'noun', distractors: ['screen', 'button', 'file', 'page', 'form'] },
        { text: 'by', partOfSpeech: 'preposition', distractors: ['at', 'to', 'of', 'off', 'up'] },
        { text: 'Friday', partOfSpeech: 'noun', distractors: ['Monday', 'Tuesday', 'morning', 'evening', 'noon'] },
      ],
    },
    {
      id: 'mitap_d28_p4',
      english: 'One thing is blocking me today',
      meaning: { ru: 'Одна вещь мешает мне сегодня', uk: 'Одна річ заважає мені сьогодні', es: 'Una cosa me está bloqueando hoy' },
      constructions: ['present-continuous'],
      explanation: {
        title: { ru: 'Назови свой блокер', uk: 'Назви свій блокер', es: 'Nombra tu bloqueo' },
        rule: { ru: 'Про проблему сейчас бери is и слово на -ing: is blocking. block -> blocking. Так показываешь, что застрял.', uk: 'Про проблему зараз бери is і слово на -ing: is blocking. block -> blocking. Так показуєш, що застряг.', es: 'Para el problema ahora usa is y la palabra en -ing: is blocking. block -> blocking. Así muestras que estás trancado.' },
        why: { ru: 'Стендап нужен, чтобы вслух назвать блокер и быстро получить помощь.', uk: 'Стендап потрібен, щоб уголос назвати блокер і швидко отримати допомогу.', es: 'La reunión sirve para nombrar el bloqueo en voz alta y recibir ayuda.' },
        commonMistake: { ru: 'Не молчи про блокер. Скажи is blocking me, и команда подключится.', uk: 'Не мовчи про блокер. Скажи is blocking me, і команда підключиться.', es: 'No calles el bloqueo. Di is blocking me y el equipo ayudará.' },
      },
      words: [
        { text: 'One', partOfSpeech: 'determiner', distractors: ['two', 'three', 'some', 'many', 'few'] },
        { text: 'thing', partOfSpeech: 'noun', distractors: ['task', 'step', 'part', 'point', 'issue'] },
        { text: 'is', partOfSpeech: 'to-be', distractors: ['am', 'are', 'was', 'were', 'be'] },
        { text: 'blocking', partOfSpeech: 'verb', distractors: ['reading', 'sending', 'calling', 'planning', 'checking'] },
        { text: 'me', partOfSpeech: 'pronoun', distractors: ['him', 'her', 'us', 'them', 'you'] },
        { text: 'today', partOfSpeech: 'adverb', distractors: ['yesterday', 'soon', 'later', 'again', 'then'] },
      ],
    },
    {
      id: 'mitap_d28_p5',
      english: 'Can you help me with this part',
      meaning: { ru: 'Можешь помочь мне с этой частью?', uk: 'Можеш допомогти мені з цією частиною?', es: '¿Puedes ayudarme con esta parte?' },
      constructions: ['modals'],
      explanation: {
        title: { ru: 'Попроси помощь вежливо', uk: 'Попроси допомогу ввічливо', es: 'Pide ayuda con cortesía' },
        rule: { ru: 'Для вежливой просьбы начни с Can you: Can you help. help me значит помоги мне.', uk: 'Для ввічливого прохання почни з Can you: Can you help. help me означає допоможи мені.', es: 'Para pedir con cortesía empieza con Can you: Can you help. help me significa ayúdame.' },
        why: { ru: 'После блокера сразу проси помощь: так задача не стоит на месте.', uk: 'Після блокера одразу проси допомогу: так задача не стоїть на місці.', es: 'Tras el bloqueo pide ayuda enseguida: así la tarea no se detiene.' },
        commonMistake: { ru: 'Не говори You help me как приказ. Вежливо звучит Can you help me.', uk: 'Не кажи You help me як наказ. Ввічливо звучить Can you help me.', es: 'No digas You help me como orden. Suena cortés Can you help me.' },
      },
      words: [
        { text: 'Can', partOfSpeech: 'modal', distractors: ['could', 'will', 'should', 'must', 'may'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'I'] },
        { text: 'help', partOfSpeech: 'verb', distractors: ['join', 'call', 'guide', 'teach', 'show'] },
        { text: 'me', partOfSpeech: 'pronoun', distractors: ['him', 'her', 'us', 'them', 'you'] },
        { text: 'with', partOfSpeech: 'preposition', distractors: ['on', 'at', 'in', 'for', 'of'] },
        { text: 'this', partOfSpeech: 'determiner', distractors: ['that', 'these', 'those', 'my', 'the'] },
        { text: 'part', partOfSpeech: 'noun', distractors: ['step', 'task', 'screen', 'file', 'point'] },
      ],
    },
    {
      id: 'mitap_d28_p6',
      english: 'We added two tests yesterday',
      meaning: { ru: 'Мы добавили два теста вчера', uk: 'Ми додали два тести вчора', es: 'Añadimos dos pruebas ayer' },
      constructions: ['past-simple-regular'],
      explanation: {
        title: { ru: 'Отчёт от команды', uk: 'Звіт від команди', es: 'Reporte del equipo' },
        rule: { ru: 'Про общее дело в прошлом бери We и -ed: add -> added. We added значит мы добавили.', uk: 'Про спільну справу в минулому бери We і -ed: add -> added. We added означає ми додали.', es: 'Para algo del equipo en pasado usa We y -ed: add -> added. We added significa añadimos.' },
        why: { ru: 'Иногда отчитываешься за пару: We added показывает общий вклад на стендапе.', uk: 'Іноді звітуєш за пару: We added показує спільний внесок на стендапі.', es: 'A veces reportas en pareja: We added muestra el aporte común en la reunión.' },
        commonMistake: { ru: 'Не говори We add про вчера. С yesterday нужно added.', uk: 'Не кажи We add про вчора. З yesterday потрібно added.', es: 'No digas We add para ayer. Con yesterday va added.' },
      },
      words: [
        { text: 'We', partOfSpeech: 'pronoun', distractors: ['I', 'he', 'she', 'they', 'you'] },
        { text: 'added', partOfSpeech: 'verb', distractors: ['fixed', 'tested', 'checked', 'opened', 'planned'] },
        { text: 'two', partOfSpeech: 'determiner', distractors: ['three', 'four', 'five', 'some', 'many'] },
        { text: 'tests', partOfSpeech: 'noun', distractors: ['calls', 'emails', 'screens', 'tickets', 'pages'] },
        { text: 'yesterday', partOfSpeech: 'adverb', distractors: ['today', 'tomorrow', 'now', 'early', 'late'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'working', partOfSpeech: 'verb', translation: { ru: 'работаю (сейчас)', uk: 'працюю (зараз)', es: 'trabajando' }, example: 'I am working on the report now' },
    { word: 'finished', partOfSpeech: 'verb', translation: { ru: 'закончил', uk: 'закінчив', es: 'terminé' }, example: 'I finished the first task yesterday' },
    { word: 'will', partOfSpeech: 'modal', translation: { ru: 'сделаю (будущее)', uk: 'зроблю (майбутнє)', es: 'haré (futuro)' }, example: 'I will fix the bug by Friday' },
    { word: 'blocking', partOfSpeech: 'verb', translation: { ru: 'мешает', uk: 'заважає', es: 'bloqueando' }, example: 'One thing is blocking me today' },
    { word: 'help', partOfSpeech: 'verb', translation: { ru: 'помочь', uk: 'допомогти', es: 'ayudar' }, example: 'Can you help me with this part' },
    { word: 'added', partOfSpeech: 'verb', translation: { ru: 'добавили', uk: 'додали', es: 'añadimos' }, example: 'We added two tests yesterday' },
  ],
};

export const MITAP_DAY_29: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 29,
  topic: { ru: 'Предложить время встречи', uk: 'Запропонувати час зустрічі', es: 'Proponer una hora de reunión' },
  outcome: {
    ru: 'Ты сможешь предложить коллеге удобный слот для встречи и спросить, подходит ли время.',
    uk: 'Ти зможеш запропонувати колезі зручний слот для зустрічі та спитати, чи підходить час.',
    es: 'Podrás proponer a un colega un hueco para la reunión y preguntar si la hora le viene bien.',
  },
  level: 'A2',
  prerequisiteLessons: [5, 13],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Предложи время через will', uk: 'Запропонуй час через will', es: 'Propón la hora con will' },
      body: {
        ru: 'Чтобы предложить будущий слот, скажи will и время. Это звучит уверенно и по-деловому.',
        uk: 'Щоб запропонувати майбутній слот, скажи will і час. Це звучить впевнено й по-діловому.',
        es: 'Para proponer un hueco futuro, di will y la hora. Suena seguro y profesional.',
      },
      examples: [
        { en: 'I will send you a calendar invite.', gloss: { ru: 'Я отправлю тебе приглашение в календарь.', uk: 'Я надішлю тобі запрошення в календар.', es: 'Te enviaré una invitación de calendario.' } },
        { en: 'We will meet on Tuesday at ten.', gloss: { ru: 'Мы встретимся во вторник в десять.', uk: 'Ми зустрінемося у вівторок о десятій.', es: 'Nos reuniremos el martes a las diez.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Спроси, подходит ли время', uk: 'Спитай, чи підходить час', es: 'Pregunta si la hora viene bien' },
      body: {
        ru: 'Начни вопрос с Does, чтобы спросить про один день или человека. Так звучит вежливо.',
        uk: 'Почни питання з Does, щоб спитати про один день чи людину. Так звучить ввічливо.',
        es: 'Empieza la pregunta con Does para preguntar por un día o persona. Suena cortés.',
      },
      examples: [
        { en: 'Does Tuesday work for you?', gloss: { ru: 'Вторник тебе подходит?', uk: 'Вівторок тобі підходить?', es: '¿Te viene bien el martes?' } },
        { en: 'Does the morning work for your team?', gloss: { ru: 'Утро подходит твоей команде?', uk: 'Ранок підходить твоїй команді?', es: '¿A tu equipo le viene bien la mañana?' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Спроси про время через When', uk: 'Спитай про час через When', es: 'Pregunta la hora con When' },
      body: {
        ru: 'Хочешь узнать, когда удобно, начни с When и do. Получишь конкретный ответ.',
        uk: 'Хочеш дізнатися, коли зручно, почни з When і do. Отримаєш конкретну відповідь.',
        es: 'Si quieres saber cuándo viene bien, empieza con When y do. Tendrás respuesta concreta.',
      },
      examples: [
        { en: 'When do you want to meet?', gloss: { ru: 'Когда ты хочешь встретиться?', uk: 'Коли ти хочеш зустрітися?', es: '¿Cuándo quieres reunirte?' } },
        { en: 'When will you be free this week?', gloss: { ru: 'Когда ты будешь свободен на этой неделе?', uk: 'Коли ти будеш вільний цього тижня?', es: '¿Cuándo estarás libre esta semana?' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d29_p1',
      english: 'Does Tuesday work for you?',
      meaning: { ru: 'Вторник тебе подходит?', uk: 'Вівторок тобі підходить?', es: '¿Te viene bien el martes?' },
      constructions: ['present-simple-questions'],
      explanation: {
        title: { ru: 'Вопрос про один день начинается с Does', uk: 'Питання про один день починається з Does', es: 'La pregunta por un día empieza con Does' },
        rule: { ru: 'Спрашиваешь про один день, начни с Does. Does + Tuesday + work = вторник подходит?', uk: 'Питаєш про один день, почни з Does. Does + Tuesday + work = вівторок підходить?', es: 'Para preguntar por un día, empieza con Does. Does + Tuesday + work.' },
        why: { ru: 'Does звучит вежливо и по-деловому, когда предлагаешь конкретный день коллеге.', uk: 'Does звучить ввічливо й по-діловому, коли пропонуєш конкретний день колезі.', es: 'Does suena cortés y profesional al proponer un día concreto a un colega.' },
        commonMistake: { ru: 'Не говори Do Tuesday work. Про один день нужно Does: Does Tuesday work.', uk: 'Не кажи Do Tuesday work. Про один день потрібно Does: Does Tuesday work.', es: 'No digas Do Tuesday work. Para un día se usa Does: Does Tuesday work.' },
      },
      words: [
        { text: 'Does', partOfSpeech: 'verb', distractors: ['Did', 'Are', 'Has', 'Was', 'Do'] },
        { text: 'Tuesday', partOfSpeech: 'noun', distractors: ['meeting', 'office', 'manager', 'report', 'email'] },
        { text: 'work', partOfSpeech: 'verb', distractors: ['help', 'start', 'close', 'stay', 'stand'] },
        { text: 'for', partOfSpeech: 'preposition', distractors: ['with', 'from', 'about', 'into', 'over'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['them', 'him', 'her', 'us', 'me'] },
      ],
    },
    {
      id: 'mitap_d29_p2',
      english: 'I will send you a calendar invite.',
      meaning: { ru: 'Я отправлю тебе приглашение в календарь.', uk: 'Я надішлю тобі запрошення в календар.', es: 'Te enviaré una invitación de calendario.' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'will для будущего действия', uk: 'will для майбутньої дії', es: 'will para una acción futura' },
        rule: { ru: 'Обещаешь сделать что-то потом, скажи will. I + will + send = я отправлю.', uk: 'Обіцяєш зробити щось потім, скажи will. I + will + send = я надішлю.', es: 'Si prometes hacer algo luego, di will. I + will + send = enviaré.' },
        why: { ru: 'will показывает, что ты пришлёшь приглашение позже, после разговора.', uk: 'will показує, що ти надішлеш запрошення пізніше, після розмови.', es: 'will muestra que enviarás la invitación más tarde, tras la charla.' },
        commonMistake: { ru: 'После will слово без to: will send, не will to send.', uk: 'Після will слово без to: will send, не will to send.', es: 'Tras will la palabra va sin to: will send, no will to send.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'they', 'we', 'it'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'might', 'would'] },
        { text: 'send', partOfSpeech: 'verb', distractors: ['bring', 'write', 'read', 'keep', 'show'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['them', 'him', 'her', 'us', 'me'] },
        { text: 'a', partOfSpeech: 'article', distractors: ['the', 'an', 'this', 'that', 'my'] },
        { text: 'calendar', partOfSpeech: 'noun', distractors: ['screen', 'folder', 'laptop', 'window', 'desk'] },
        { text: 'invite', partOfSpeech: 'noun', distractors: ['agenda', 'summary', 'update', 'slide', 'note'] },
      ],
    },
    {
      id: 'mitap_d29_p3',
      english: 'When do you want to meet?',
      meaning: { ru: 'Когда ты хочешь встретиться?', uk: 'Коли ти хочеш зустрітися?', es: '¿Cuándo quieres reunirte?' },
      constructions: ['present-simple-questions'],
      explanation: {
        title: { ru: 'When спрашивает про время', uk: 'When питає про час', es: 'When pregunta por el momento' },
        rule: { ru: 'Хочешь узнать день или час, начни с When. When + do + you = когда ты.', uk: 'Хочеш дізнатися день чи час, почни з When. When + do + you = коли ти.', es: 'Si quieres saber el día u hora, empieza con When. When + do + you.' },
        why: { ru: 'When помогает узнать удобное время и предложить встречу под коллегу.', uk: 'When допомагає дізнатися зручний час і запропонувати зустріч під колегу.', es: 'When ayuda a saber la hora cómoda y proponer la reunión al colega.' },
        commonMistake: { ru: 'Не забудь do: When do you want, не When you want.', uk: 'Не забудь do: When do you want, не When you want.', es: 'No olvides do: When do you want, no When you want.' },
      },
      words: [
        { text: 'When', partOfSpeech: 'adverb', distractors: ['Where', 'Why', 'How', 'Who', 'What'] },
        { text: 'do', partOfSpeech: 'verb', distractors: ['did', 'does', 'will', 'can', 'has'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['they', 'he', 'she', 'we', 'it'] },
        { text: 'want', partOfSpeech: 'verb', distractors: ['plan', 'hope', 'like', 'need', 'try'] },
        { text: 'to', partOfSpeech: 'other', distractors: ['of', 'at', 'by', 'in', 'on'] },
        { text: 'meet', partOfSpeech: 'verb', distractors: ['call', 'join', 'leave', 'wait', 'move'] },
      ],
    },
    {
      id: 'mitap_d29_p4',
      english: 'We will meet on Tuesday at ten.',
      meaning: { ru: 'Мы встретимся во вторник в десять.', uk: 'Ми зустрінемося у вівторок о десятій.', es: 'Nos reuniremos el martes a las diez.' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'will назначает встречу на потом', uk: 'will призначає зустріч на потім', es: 'will fija la reunión para luego' },
        rule: { ru: 'Договариваешься на будущий день, скажи will. We + will + meet = мы встретимся.', uk: 'Домовляєшся на майбутній день, скажи will. We + will + meet = ми зустрінемося.', es: 'Si acuerdas un día futuro, di will. We + will + meet = nos reuniremos.' },
        why: { ru: 'will делает план чётким: вы оба знаете, что встреча будет в этот день.', uk: 'will робить план чітким: ви обидва знаєте, що зустріч буде цього дня.', es: 'will hace el plan claro: ambos saben que la reunión será ese día.' },
        commonMistake: { ru: 'Время дня с at: at ten. День недели с on: on Tuesday.', uk: 'Час дня з at: at ten. День тижня з on: on Tuesday.', es: 'La hora con at: at ten. El día con on: on Tuesday.' },
      },
      words: [
        { text: 'We', partOfSpeech: 'pronoun', distractors: ['They', 'He', 'She', 'You', 'It'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'might', 'would'] },
        { text: 'meet', partOfSpeech: 'verb', distractors: ['call', 'join', 'leave', 'wait', 'move'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['in', 'at', 'by', 'to', 'of'] },
        { text: 'Tuesday', partOfSpeech: 'noun', distractors: ['meeting', 'office', 'manager', 'report', 'email'] },
        { text: 'at', partOfSpeech: 'preposition', distractors: ['in', 'on', 'by', 'to', 'of'] },
        { text: 'ten', partOfSpeech: 'noun', distractors: ['week', 'hour', 'month', 'year', 'day'] },
      ],
    },
    {
      id: 'mitap_d29_p5',
      english: 'Does the morning work for your team?',
      meaning: { ru: 'Утро подходит твоей команде?', uk: 'Ранок підходить твоїй команді?', es: '¿A tu equipo le viene bien la mañana?' },
      constructions: ['present-simple-questions'],
      explanation: {
        title: { ru: 'Предложи часть дня через Does', uk: 'Запропонуй частину дня через Does', es: 'Propón una parte del día con Does' },
        rule: { ru: 'Предлагаешь утро или вечер, начни с Does. Does + morning + work = утро подходит?', uk: 'Пропонуєш ранок чи вечір, почни з Does. Does + morning + work = ранок підходить?', es: 'Si propones la mañana o tarde, empieza con Does. Does + morning + work.' },
        why: { ru: 'Так ты вежливо узнаёшь, удобна ли команде первая половина дня.', uk: 'Так ти ввічливо дізнаєшся, чи зручна команді перша половина дня.', es: 'Así preguntas con cortesía si a tu equipo le viene bien la mañana.' },
        commonMistake: { ru: 'Перед morning нужно the: the morning, не просто morning.', uk: 'Перед morning потрібно the: the morning, не просто morning.', es: 'Antes de morning va the: the morning, no solo morning.' },
      },
      words: [
        { text: 'Does', partOfSpeech: 'verb', distractors: ['Did', 'Are', 'Has', 'Was', 'Do'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'that', 'my'] },
        { text: 'morning', partOfSpeech: 'noun', distractors: ['weekend', 'schedule', 'deadline', 'project', 'minute'] },
        { text: 'work', partOfSpeech: 'verb', distractors: ['help', 'start', 'close', 'stay', 'stand'] },
        { text: 'for', partOfSpeech: 'preposition', distractors: ['with', 'from', 'about', 'into', 'over'] },
        { text: 'your', partOfSpeech: 'pronoun', distractors: ['their', 'his', 'her', 'our', 'its'] },
        { text: 'team', partOfSpeech: 'noun', distractors: ['client', 'partner', 'leader', 'buyer', 'guest'] },
      ],
    },
    {
      id: 'mitap_d29_p6',
      english: 'When will you be free this week?',
      meaning: { ru: 'Когда ты будешь свободен на этой неделе?', uk: 'Коли ти будеш вільний цього тижня?', es: '¿Cuándo estarás libre esta semana?' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'When плюс will про будущее', uk: 'When плюс will про майбутнє', es: 'When más will para el futuro' },
        rule: { ru: 'Спрашиваешь про свободное время впереди, скажи When will. When + will + you = когда ты будешь.', uk: 'Питаєш про вільний час попереду, скажи When will. When + will + you = коли ти будеш.', es: 'Si preguntas por tiempo libre futuro, di When will. When + will + you.' },
        why: { ru: 'When will показывает, что ты ищешь слот в будущем, а не сейчас.', uk: 'When will показує, що ти шукаєш слот у майбутньому, а не зараз.', es: 'When will muestra que buscas un hueco futuro, no ahora.' },
        commonMistake: { ru: 'После will идёт be: will be free, не will are free.', uk: 'Після will йде be: will be free, не will are free.', es: 'Tras will va be: will be free, no will are free.' },
      },
      words: [
        { text: 'When', partOfSpeech: 'adverb', distractors: ['Where', 'Why', 'How', 'Who', 'What'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'might', 'would'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['they', 'he', 'she', 'we', 'it'] },
        { text: 'be', partOfSpeech: 'to-be', distractors: ['is', 'are', 'was', 'were', 'am'] },
        { text: 'free', partOfSpeech: 'adjective', distractors: ['busy', 'late', 'early', 'ready', 'sure'] },
        { text: 'this', partOfSpeech: 'determiner', distractors: ['that', 'each', 'every', 'some', 'any'] },
        { text: 'week', partOfSpeech: 'noun', distractors: ['hour', 'month', 'year', 'day', 'minute'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'Does', partOfSpeech: 'verb', translation: { ru: 'начинает вопрос про один день или человека', uk: 'починає питання про один день чи людину', es: 'inicia la pregunta por un día o persona' }, example: 'Does Tuesday work for you?' },
    { word: 'will', partOfSpeech: 'modal', translation: { ru: 'показывает будущее действие', uk: 'показує майбутню дію', es: 'indica una acción futura' }, example: 'I will send you a calendar invite.' },
    { word: 'meet', partOfSpeech: 'verb', translation: { ru: 'встретиться', uk: 'зустрітися', es: 'reunirse' }, example: 'When do you want to meet?' },
    { word: 'calendar', partOfSpeech: 'noun', translation: { ru: 'календарь', uk: 'календар', es: 'calendario' }, example: 'I will send you a calendar invite.' },
    { word: 'morning', partOfSpeech: 'noun', translation: { ru: 'утро', uk: 'ранок', es: 'mañana' }, example: 'Does the morning work for your team?' },
    { word: 'free', partOfSpeech: 'adjective', translation: { ru: 'свободный', uk: 'вільний', es: 'libre' }, example: 'When will you be free this week?' },
  ],
};

export const MITAP_DAY_30: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 30,
  topic: { ru: 'Сравнить два слота времени', uk: 'Порівняти два слоти часу', es: 'Comparar dos horarios' },
  outcome: {
    ru: 'Ты сможешь сравнить два времени на созвоне и предложить то, что удобнее: утро или день.',
    uk: 'Ти зможеш порівняти два часи на дзвінку і запропонувати те, що зручніше: ранок чи день.',
    es: 'Podrás comparar dos horarios en una llamada y proponer el que sea más cómodo: la mañana o la tarde.',
  },
  level: 'A2',
  prerequisiteLessons: [14, 10],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Сравни через better than', uk: 'Порівняй через better than', es: 'Compara con better than' },
      body: {
        ru: 'Когда одно время удобнее, скажи better than. Morning is better than afternoon значит утро лучше, чем день. Так ты сразу показываешь свой выбор.',
        uk: 'Коли один час зручніший, скажи better than. Morning is better than afternoon значить ранок кращий, ніж день. Так ти одразу показуєш свій вибір.',
        es: 'Cuando un horario es más cómodo, di better than. Morning is better than afternoon significa la mañana es mejor que la tarde. Así muestras tu elección.',
      },
      examples: [
        { en: 'Morning is better than afternoon for me.', gloss: { ru: 'Утро лучше, чем день, для меня.', uk: 'Ранок кращий, ніж день, для мене.', es: 'La mañana es mejor que la tarde para mí.' } },
        { en: 'Ten is earlier than two.', gloss: { ru: 'Десять раньше, чем два.', uk: 'Десята раніше, ніж друга.', es: 'Las diez son más temprano que las dos.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Предложи через Can we', uk: 'Запропонуй через Can we', es: 'Propón con Can we' },
      body: {
        ru: 'Чтобы предложить время мягко, начни с Can we. Can we meet at ten значит можем встретиться в десять. Это вежливее, чем приказ.',
        uk: 'Щоб запропонувати час м\'яко, почни з Can we. Can we meet at ten значить можемо зустрітися о десятій. Це ввічливіше, ніж наказ.',
        es: 'Para proponer un horario con suavidad, empieza con Can we. Can we meet at ten significa podemos vernos a las diez. Es más cortés que una orden.',
      },
      examples: [
        { en: 'Can we meet in the morning?', gloss: { ru: 'Можем встретиться утром?', uk: 'Можемо зустрітися вранці?', es: '¿Podemos vernos por la mañana?' } },
        { en: 'Can we move it earlier?', gloss: { ru: 'Можем сдвинуть пораньше?', uk: 'Можемо зсунути раніше?', es: '¿Podemos moverlo más temprano?' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Скажи, что удобнее', uk: 'Скажи, що зручніше', es: 'Di qué es más cómodo' },
      body: {
        ru: 'Назови причину словом works. This time works better значит это время подходит лучше. Так коллега понимает, почему ты выбрал именно его.',
        uk: 'Назви причину словом works. This time works better значить цей час підходить краще. Так колега розуміє, чому ти обрав саме його.',
        es: 'Da la razón con works. This time works better significa este horario va mejor. Así el colega entiende por qué lo elegiste.',
      },
      examples: [
        { en: 'This time works better for me.', gloss: { ru: 'Это время подходит мне лучше.', uk: 'Цей час підходить мені краще.', es: 'Este horario me va mejor.' } },
        { en: 'The morning slot is quieter.', gloss: { ru: 'Утренний слот спокойнее.', uk: 'Ранковий слот спокійніший.', es: 'El horario de la mañana es más tranquilo.' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d30_p1',
      english: 'Morning is better than afternoon for me.',
      meaning: { ru: 'Утро лучше, чем день, для меня.', uk: 'Ранок кращий, ніж день, для мене.', es: 'La mañana es mejor que la tarde para mí.' },
      constructions: ['comparatives'],
      explanation: {
        title: { ru: 'better than — лучше, чем', uk: 'better than — кращий, ніж', es: 'better than — mejor que' },
        rule: { ru: 'Слово better значит лучше, than значит чем. better than сравнивает два времени. Так называешь, что удобнее.', uk: 'Слово better значить кращий, than значить ніж. better than порівнює два часи. Так називаєш, що зручніше.', es: 'La palabra better significa mejor, than significa que. better than compara dos horarios. Así dices qué es más cómodo.' },
        why: { ru: 'Так ты сразу показываешь свой выбор, и коллеге легче назначить созвон.', uk: 'Так ти одразу показуєш свій вибір, і колезі легше призначити дзвінок.', es: 'Así muestras tu elección, y al colega le es más fácil fijar la llamada.' },
        commonMistake: { ru: 'Не говори better that afternoon. Для сравнения нужно than, а не that.', uk: 'Не кажи better that afternoon. Для порівняння потрібно than, а не that.', es: 'No digas better that afternoon. Para comparar va than, no that.' },
      },
      words: [
        { text: 'Morning', partOfSpeech: 'noun', distractors: ['evening', 'weekend', 'summer', 'winter', 'autumn'] },
        { text: 'is', partOfSpeech: 'to-be', distractors: ['am', 'are', 'was', 'were', 'be'] },
        { text: 'better', partOfSpeech: 'adjective', distractors: ['bigger', 'longer', 'wider', 'heavier', 'taller'] },
        { text: 'than', partOfSpeech: 'other', distractors: ['then', 'of', 'as', 'from', 'by'] },
        { text: 'afternoon', partOfSpeech: 'noun', distractors: ['evening', 'weekend', 'summer', 'winter', 'autumn'] },
        { text: 'for', partOfSpeech: 'preposition', distractors: ['at', 'on', 'in', 'of', 'with'] },
        { text: 'me', partOfSpeech: 'pronoun', distractors: ['him', 'her', 'us', 'them', 'you'] },
      ],
    },
    {
      id: 'mitap_d30_p2',
      english: 'Ten is earlier than two.',
      meaning: { ru: 'Десять раньше, чем два.', uk: 'Десята раніше, ніж друга.', es: 'Las diez son más temprano que las dos.' },
      constructions: ['comparatives'],
      explanation: {
        title: { ru: 'earlier than — раньше, чем', uk: 'earlier than — раніше, ніж', es: 'earlier than — más temprano que' },
        rule: { ru: 'Слово earlier значит раньше, than значит чем. earlier than сравнивает два часа дня. Так показываешь, какой раньше.', uk: 'Слово earlier значить раніше, than значить ніж. earlier than порівнює два часи дня. Так показуєш, який раніше.', es: 'La palabra earlier significa más temprano, than significa que. earlier than compara dos horas. Así muestras cuál es antes.' },
        why: { ru: 'Так коллега сразу понимает порядок времени и легче выбирает удобный слот.', uk: 'Так колега одразу розуміє порядок часу і легше обирає зручний слот.', es: 'Así el colega entiende el orden de las horas y elige mejor el horario.' },
        commonMistake: { ru: 'Не говори more early. Для слова early нужно earlier, а не more.', uk: 'Не кажи more early. Для слова early потрібно earlier, а не more.', es: 'No digas more early. Para early va earlier, no more.' },
      },
      words: [
        { text: 'Ten', partOfSpeech: 'noun', distractors: ['nine', 'eight', 'seven', 'six', 'five'] },
        { text: 'is', partOfSpeech: 'to-be', distractors: ['am', 'are', 'was', 'were', 'be'] },
        { text: 'earlier', partOfSpeech: 'adjective', distractors: ['bigger', 'longer', 'colder', 'slower', 'shorter'] },
        { text: 'than', partOfSpeech: 'other', distractors: ['then', 'of', 'as', 'from', 'by'] },
        { text: 'two', partOfSpeech: 'noun', distractors: ['four', 'five', 'six', 'seven', 'eight'] },
      ],
    },
    {
      id: 'mitap_d30_p3',
      english: 'Can we meet in the morning?',
      meaning: { ru: 'Можем встретиться утром?', uk: 'Можемо зустрітися вранці?', es: '¿Podemos vernos por la mañana?' },
      constructions: ['modals'],
      explanation: {
        title: { ru: 'Can we — можем ли мы', uk: 'Can we — чи можемо ми', es: 'Can we — podemos' },
        rule: { ru: 'Для мягкого предложения начни с Can we. Can we meet значит можем встретиться. in the morning значит утром.', uk: 'Для м\'якої пропозиції почни з Can we. Can we meet значить можемо зустрітися. in the morning значить вранці.', es: 'Para una propuesta suave empieza con Can we. Can we meet significa podemos vernos. in the morning significa por la mañana.' },
        why: { ru: 'Вопрос звучит вежливо, и коллега чувствует, что выбор за ним тоже.', uk: 'Питання звучить ввічливо, і колега відчуває, що вибір за ним теж.', es: 'La pregunta suena cortés, y el colega siente que la elección también es suya.' },
        commonMistake: { ru: 'Не говори Can we meet at the morning. Для частей дня нужно in the morning.', uk: 'Не кажи Can we meet at the morning. Для частин дня потрібно in the morning.', es: 'No digas at the morning. Para partes del día va in the morning.' },
      },
      words: [
        { text: 'Can', partOfSpeech: 'modal', distractors: ['could', 'will', 'should', 'must', 'may'] },
        { text: 'we', partOfSpeech: 'pronoun', distractors: ['I', 'he', 'she', 'they', 'you'] },
        { text: 'meet', partOfSpeech: 'verb', distractors: ['book', 'fix', 'send', 'open', 'close'] },
        { text: 'in', partOfSpeech: 'preposition', distractors: ['at', 'on', 'of', 'for', 'with'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'that', 'my'] },
        { text: 'morning', partOfSpeech: 'noun', distractors: ['evening', 'weekend', 'summer', 'winter', 'autumn'] },
      ],
    },
    {
      id: 'mitap_d30_p4',
      english: 'This time works better for me.',
      meaning: { ru: 'Это время подходит мне лучше.', uk: 'Цей час підходить мені краще.', es: 'Este horario me va mejor.' },
      constructions: ['comparatives'],
      explanation: {
        title: { ru: 'works better — подходит лучше', uk: 'works better — підходить краще', es: 'works better — va mejor' },
        rule: { ru: 'Слово works значит подходит, better значит лучше. works better называет причину выбора. This time значит это время.', uk: 'Слово works значить підходить, better значить краще. works better називає причину вибору. This time значить цей час.', es: 'La palabra works significa va, better significa mejor. works better da la razón. This time significa este horario.' },
        why: { ru: 'Так ты объясняешь свой выбор спокойно, и спор о времени быстро заканчивается.', uk: 'Так ти пояснюєш свій вибір спокійно, і суперечка про час швидко закінчується.', es: 'Así explicas tu elección con calma, y la discusión por la hora termina rápido.' },
        commonMistake: { ru: 'Не говори works gooder. Для слова good нужно better, а не gooder.', uk: 'Не кажи works gooder. Для слова good потрібно better, а не gooder.', es: 'No digas works gooder. Para good va better, no gooder.' },
      },
      words: [
        { text: 'This', partOfSpeech: 'determiner', distractors: ['that', 'these', 'those', 'my', 'the'] },
        { text: 'time', partOfSpeech: 'noun', distractors: ['day', 'week', 'hour', 'date', 'month'] },
        { text: 'works', partOfSpeech: 'verb', distractors: ['starts', 'fits', 'helps', 'stays', 'runs'] },
        { text: 'better', partOfSpeech: 'adjective', distractors: ['bigger', 'longer', 'wider', 'heavier', 'taller'] },
        { text: 'for', partOfSpeech: 'preposition', distractors: ['at', 'on', 'in', 'of', 'with'] },
        { text: 'me', partOfSpeech: 'pronoun', distractors: ['him', 'her', 'us', 'them', 'you'] },
      ],
    },
    {
      id: 'mitap_d30_p5',
      english: 'Can we move it earlier?',
      meaning: { ru: 'Можем сдвинуть пораньше?', uk: 'Можемо зсунути раніше?', es: '¿Podemos moverlo más temprano?' },
      constructions: ['modals'],
      explanation: {
        title: { ru: 'move it — сдвинуть его', uk: 'move it — зсунути його', es: 'move it — moverlo' },
        rule: { ru: 'Слово move значит сдвинуть, it значит его. earlier значит пораньше. Can we move it earlier просит время раньше.', uk: 'Слово move значить зсунути, it значить його. earlier значить раніше. Can we move it earlier просить час раніше.', es: 'La palabra move significa mover, it significa lo. earlier significa más temprano. Can we move it earlier pide una hora antes.' },
        why: { ru: 'Так ты мягко просишь сдвинуть созвон, не отменяя его совсем.', uk: 'Так ти м\'яко просиш зсунути дзвінок, не скасовуючи його зовсім.', es: 'Así pides con suavidad mover la llamada sin cancelarla del todo.' },
        commonMistake: { ru: 'Не говори move it more early. Нужно earlier одним словом.', uk: 'Не кажи move it more early. Потрібно earlier одним словом.', es: 'No digas move it more early. Va earlier en una palabra.' },
      },
      words: [
        { text: 'Can', partOfSpeech: 'modal', distractors: ['could', 'will', 'should', 'must', 'may'] },
        { text: 'we', partOfSpeech: 'pronoun', distractors: ['I', 'he', 'she', 'they', 'you'] },
        { text: 'move', partOfSpeech: 'verb', distractors: ['book', 'send', 'close', 'open', 'keep'] },
        { text: 'it', partOfSpeech: 'pronoun', distractors: ['him', 'her', 'us', 'them', 'me'] },
        { text: 'earlier', partOfSpeech: 'adjective', distractors: ['bigger', 'longer', 'colder', 'slower', 'shorter'] },
      ],
    },
    {
      id: 'mitap_d30_p6',
      english: 'The morning slot is quieter.',
      meaning: { ru: 'Утренний слот спокойнее.', uk: 'Ранковий слот спокійніший.', es: 'El horario de la mañana es más tranquilo.' },
      constructions: ['comparatives'],
      explanation: {
        title: { ru: 'quieter — спокойнее', uk: 'quieter — спокійніший', es: 'quieter — más tranquilo' },
        rule: { ru: 'Слово quiet значит тихий, спокойный. quieter значит спокойнее. slot значит слот, окно времени.', uk: 'Слово quiet значить тихий, спокійний. quieter значить спокійніший. slot значить слот, вікно часу.', es: 'La palabra quiet significa tranquilo. quieter significa más tranquilo. slot significa horario, hueco.' },
        why: { ru: 'Так ты даёшь причину выбора: утром меньше шума и проще говорить.', uk: 'Так ти даєш причину вибору: вранці менше шуму і простіше говорити.', es: 'Así das la razón: por la mañana hay menos ruido y es más fácil hablar.' },
        commonMistake: { ru: 'Не говори more quiet. Для короткого слова нужно quieter.', uk: 'Не кажи more quiet. Для короткого слова потрібно quieter.', es: 'No digas more quiet. Para esta palabra corta va quieter.' },
      },
      words: [
        { text: 'The', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'that', 'my'] },
        { text: 'morning', partOfSpeech: 'noun', distractors: ['evening', 'weekend', 'summer', 'winter', 'autumn'] },
        { text: 'slot', partOfSpeech: 'noun', distractors: ['screen', 'budget', 'client', 'report', 'office'] },
        { text: 'is', partOfSpeech: 'to-be', distractors: ['am', 'are', 'was', 'were', 'be'] },
        { text: 'quieter', partOfSpeech: 'adjective', distractors: ['bigger', 'longer', 'wider', 'heavier', 'taller'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'better', partOfSpeech: 'adjective', translation: { ru: 'лучше', uk: 'кращий', es: 'mejor' }, example: 'Morning is better than afternoon for me.' },
    { word: 'earlier', partOfSpeech: 'adjective', translation: { ru: 'раньше', uk: 'раніше', es: 'más temprano' }, example: 'Ten is earlier than two.' },
    { word: 'meet', partOfSpeech: 'verb', translation: { ru: 'встретиться', uk: 'зустрітися', es: 'vernos' }, example: 'Can we meet in the morning?' },
    { word: 'works', partOfSpeech: 'verb', translation: { ru: 'подходит', uk: 'підходить', es: 'va, conviene' }, example: 'This time works better for me.' },
    { word: 'move', partOfSpeech: 'verb', translation: { ru: 'сдвинуть', uk: 'зсунути', es: 'mover' }, example: 'Can we move it earlier?' },
    { word: 'quieter', partOfSpeech: 'adjective', translation: { ru: 'спокойнее', uk: 'спокійніший', es: 'más tranquilo' }, example: 'The morning slot is quieter.' },
  ],
};

export const MITAP_DAY_31: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 31,
  topic: { ru: 'Перенести встречу на другой день', uk: 'Перенести зустріч на інший день', es: 'Cambiar la reunión a otro día' },
  outcome: {
    ru: 'Ты вежливо попросишь перенести встречу на другой день: предложишь Thursday, объяснишь, что занят сейчас, спросишь, свободен ли коллега, и договоришься о новом дне.',
    uk: 'Ти ввічливо попросиш перенести зустріч на інший день: запропонуєш Thursday, поясниш, що зайнятий зараз, спитаєш, чи вільний колега, і домовишся про новий день.',
    es: 'Pedirás con cortesía cambiar la reunión a otro día: propondrás Thursday, explicarás que estás ocupado ahora, preguntarás si el colega está libre y acordarás un día nuevo.',
  },
  level: 'A2',
  prerequisiteLessons: [13, 17],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Попроси перенести встречу', uk: 'Попроси перенести зустріч', es: 'Pide cambiar la reunión' },
      body: {
        ru: 'Чтобы перенести встречу, начни с Can we move it to и назови день: Can we move it to Thursday. move значит передвинуть. Так вежливо просишь другой день.',
        uk: 'Щоб перенести зустріч, почни з Can we move it to і назви день: Can we move it to Thursday. move означає пересунути. Так ввічливо просиш інший день.',
        es: 'Para cambiar la reunión empieza con Can we move it to y di el día: Can we move it to Thursday. move significa mover. Así pides otro día con cortesía.',
      },
      examples: [
        { en: 'Can we move it to Thursday?', gloss: { ru: 'Можем перенести её на четверг?', uk: 'Можемо перенести її на четвер?', es: '¿Podemos cambiarla al jueves?' } },
        { en: 'Can we move it to Friday?', gloss: { ru: 'Можем перенести её на пятницу?', uk: 'Можемо перенести її на п\'ятницю?', es: '¿Podemos cambiarla al viernes?' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Объясни, почему сейчас занят', uk: 'Поясни, чому зараз зайнятий', es: 'Explica por qué estás ocupado ahora' },
      body: {
        ru: 'Скажи причину про сейчас: бери am и слово на -ing. I am working on a deadline. work становится working. Так показываешь, что занят прямо сейчас.',
        uk: 'Скажи причину про зараз: бери am і слово на -ing. I am working on a deadline. work стає working. Так показуєш, що зайнятий просто зараз.',
        es: 'Da la razón sobre ahora: usa am y la palabra en -ing. I am working on a deadline. work pasa a working. Así muestras que estás ocupado ahora.',
      },
      examples: [
        { en: 'I am working on a deadline now', gloss: { ru: 'Я сейчас работаю над дедлайном', uk: 'Я зараз працюю над дедлайном', es: 'Estoy trabajando con un plazo ahora' } },
        { en: 'I am finishing the report today', gloss: { ru: 'Я заканчиваю отчёт сегодня', uk: 'Я закінчую звіт сьогодні', es: 'Estoy terminando el informe hoy' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Спроси про новый день', uk: 'Спитай про новий день', es: 'Pregunta por el día nuevo' },
      body: {
        ru: 'Спроси, свободен ли коллега потом: Will you be free on Thursday. will ставит вопрос про будущее. Так находишь день, удобный обоим.',
        uk: 'Спитай, чи вільний колега потім: Will you be free on Thursday. will ставить питання про майбутнє. Так знаходиш день, зручний обом.',
        es: 'Pregunta si el colega está libre luego: Will you be free on Thursday. will hace la pregunta sobre el futuro. Así encuentras un día para ambos.',
      },
      examples: [
        { en: 'Will you be free on Thursday?', gloss: { ru: 'Ты будешь свободен в четверг?', uk: 'Ти будеш вільний у четвер?', es: '¿Estarás libre el jueves?' } },
        { en: 'We will move the meeting to Friday', gloss: { ru: 'Мы перенесём встречу на пятницу', uk: 'Ми перенесемо зустріч на п\'ятницю', es: 'Cambiaremos la reunión al viernes' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d31_p1',
      english: 'Can we move it to Thursday?',
      meaning: { ru: 'Можем перенести её на четверг?', uk: 'Можемо перенести її на четвер?', es: '¿Podemos cambiarla al jueves?' },
      constructions: ['modals'],
      explanation: {
        title: { ru: 'Вежливо проси другой день', uk: 'Ввічливо проси інший день', es: 'Pide otro día con cortesía' },
        rule: { ru: 'Для вежливой просьбы начни с Can we move it to и назови день. move значит передвинуть встречу.', uk: 'Для ввічливого прохання почни з Can we move it to і назви день. move означає пересунути зустріч.', es: 'Para pedir con cortesía empieza con Can we move it to y di el día. move significa mover la reunión.' },
        why: { ru: 'Так ты не отменяешь встречу, а мягко предлагаешь удобный день для всех.', uk: 'Так ти не скасовуєш зустріч, а м\'яко пропонуєш зручний день для всіх.', es: 'Así no cancelas la reunión, sino que propones con calma un día cómodo.' },
        commonMistake: { ru: 'Не говори We move it Thursday как приказ. Вежливо звучит Can we move it.', uk: 'Не кажи We move it Thursday як наказ. Ввічливо звучить Can we move it.', es: 'No digas We move it Thursday como orden. Suena cortés Can we move it.' },
      },
      words: [
        { text: 'Can', partOfSpeech: 'modal', distractors: ['could', 'will', 'should', 'must', 'may'] },
        { text: 'we', partOfSpeech: 'pronoun', distractors: ['I', 'he', 'she', 'they', 'you'] },
        { text: 'move', partOfSpeech: 'verb', distractors: ['open', 'close', 'start', 'read', 'write'] },
        { text: 'it', partOfSpeech: 'pronoun', distractors: ['him', 'her', 'them', 'us', 'me'] },
        { text: 'to', partOfSpeech: 'preposition', distractors: ['at', 'on', 'in', 'by', 'of'] },
        { text: 'Thursday', partOfSpeech: 'noun', distractors: ['Monday', 'Tuesday', 'Friday', 'morning', 'evening'] },
      ],
    },
    {
      id: 'mitap_d31_p2',
      english: 'I am working on a deadline now',
      meaning: { ru: 'Я сейчас работаю над дедлайном', uk: 'Я зараз працюю над дедлайном', es: 'Estoy trabajando con un plazo ahora' },
      constructions: ['present-continuous'],
      explanation: {
        title: { ru: 'Объясни, чем занят сейчас', uk: 'Поясни, чим зайнятий зараз', es: 'Explica qué haces ahora' },
        rule: { ru: 'Про дело в данный момент бери am и слово на -ing. work становится working. Это твоя причина сейчас.', uk: 'Про справу в цей момент бери am і слово на -ing. work стає working. Це твоя причина зараз.', es: 'Para algo en este momento usa am y la palabra en -ing. work pasa a working. Es tu razón ahora.' },
        why: { ru: 'Причина смягчает просьбу: коллега видит, что ты правда занят прямо сейчас.', uk: 'Причина пом\'якшує прохання: колега бачить, що ти справді зайнятий зараз.', es: 'La razón suaviza la petición: el colega ve que estás de verdad ocupado ahora.' },
        commonMistake: { ru: 'Не говори I work now про текущий момент. Сейчас нужно am working.', uk: 'Не кажи I work now про поточний момент. Зараз потрібно am working.', es: 'No digas I work now para el momento actual. Ahora va am working.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'you'] },
        { text: 'am', partOfSpeech: 'to-be', distractors: ['is', 'are', 'was', 'were', 'be'] },
        { text: 'working', partOfSpeech: 'verb', distractors: ['sleeping', 'eating', 'driving', 'jumping', 'cooking'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['at', 'in', 'of', 'for', 'by'] },
        { text: 'a', partOfSpeech: 'article', distractors: ['the', 'an', 'this', 'that', 'my'] },
        { text: 'deadline', partOfSpeech: 'noun', distractors: ['report', 'budget', 'client', 'screen', 'ticket'] },
        { text: 'now', partOfSpeech: 'adverb', distractors: ['soon', 'later', 'yesterday', 'again', 'then'] },
      ],
    },
    {
      id: 'mitap_d31_p3',
      english: 'Will you be free on Thursday?',
      meaning: { ru: 'Ты будешь свободен в четверг?', uk: 'Ти будеш вільний у четвер?', es: '¿Estarás libre el jueves?' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'Спроси про будущий день', uk: 'Спитай про майбутній день', es: 'Pregunta por un día futuro' },
        rule: { ru: 'Для вопроса о будущем начни с Will you be: Will you be free. free значит свободен.', uk: 'Для питання про майбутнє почни з Will you be: Will you be free. free означає вільний.', es: 'Para preguntar por el futuro empieza con Will you be: Will you be free. free significa libre.' },
        why: { ru: 'Сначала узнай, свободен ли коллега, и только потом называй новый день встречи.', uk: 'Спершу дізнайся, чи вільний колега, і лише потім називай новий день зустрічі.', es: 'Primero averigua si el colega está libre, y luego di el día nuevo de la reunión.' },
        commonMistake: { ru: 'Не говори You will free про вопрос. В вопросе will идёт вперёд: Will you be free.', uk: 'Не кажи You will free про питання. У питанні will іде вперед: Will you be free.', es: 'No digas You will free para preguntar. En la pregunta will va delante: Will you be free.' },
      },
      words: [
        { text: 'Will', partOfSpeech: 'modal', distractors: ['can', 'could', 'should', 'must', 'may'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'I'] },
        { text: 'be', partOfSpeech: 'to-be', distractors: ['am', 'is', 'are', 'was', 'were'] },
        { text: 'free', partOfSpeech: 'adjective', distractors: ['busy', 'ready', 'late', 'early', 'sure'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['at', 'in', 'of', 'for', 'by'] },
        { text: 'Thursday', partOfSpeech: 'noun', distractors: ['Monday', 'Tuesday', 'Friday', 'morning', 'evening'] },
      ],
    },
    {
      id: 'mitap_d31_p4',
      english: 'We will move the meeting to Friday',
      meaning: { ru: 'Мы перенесём встречу на пятницу', uk: 'Ми перенесемо зустріч на п\'ятницю', es: 'Cambiaremos la reunión al viernes' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'Договорись о новом дне', uk: 'Домовся про новий день', es: 'Acuerda el día nuevo' },
        rule: { ru: 'Про план поставь will перед действием: will move. to Friday значит на пятницу. Так фиксируешь новый день.', uk: 'Про план постав will перед дією: will move. to Friday означає на п\'ятницю. Так фіксуєш новий день.', es: 'Para el plan pon will antes de la acción: will move. to Friday significa al viernes. Así fijas el día nuevo.' },
        why: { ru: 'Когда оба согласны, проговори решение вслух, чтобы новый день был понятен всем.', uk: 'Коли обоє згодні, промов рішення вголос, щоб новий день був зрозумілий усім.', es: 'Cuando ambos están de acuerdo, di la decisión en voz alta para que el día quede claro.' },
        commonMistake: { ru: 'Не говори We move it Friday про план. Для будущего нужно will move.', uk: 'Не кажи We move it Friday про план. Для майбутнього потрібно will move.', es: 'No digas We move it Friday para el plan. Para el futuro va will move.' },
      },
      words: [
        { text: 'We', partOfSpeech: 'pronoun', distractors: ['I', 'he', 'she', 'they', 'you'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'could', 'should', 'must', 'may'] },
        { text: 'move', partOfSpeech: 'verb', distractors: ['open', 'close', 'start', 'read', 'write'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'that', 'my'] },
        { text: 'meeting', partOfSpeech: 'noun', distractors: ['report', 'budget', 'screen', 'client', 'ticket'] },
        { text: 'to', partOfSpeech: 'preposition', distractors: ['at', 'on', 'in', 'by', 'of'] },
        { text: 'Friday', partOfSpeech: 'noun', distractors: ['Monday', 'Tuesday', 'Thursday', 'morning', 'evening'] },
      ],
    },
    {
      id: 'mitap_d31_p5',
      english: 'Sorry, I am busy this morning',
      meaning: { ru: 'Извини, я занят сегодня утром', uk: 'Вибач, я зайнятий сьогодні вранці', es: 'Perdón, estoy ocupado esta mañana' },
      constructions: ['present-continuous'],
      explanation: {
        title: { ru: 'Скажи, что сейчас занят', uk: 'Скажи, що зараз зайнятий', es: 'Di que estás ocupado ahora' },
        rule: { ru: 'Про своё состояние сейчас бери I am: I am busy. busy значит занят. Sorry в начале смягчает отказ.', uk: 'Про свій стан зараз бери I am: I am busy. busy означає зайнятий. Sorry на початку пом\'якшує відмову.', es: 'Para tu estado ahora usa I am: I am busy. busy significa ocupado. Sorry al inicio suaviza el no.' },
        why: { ru: 'Короткое Sorry перед отказом звучит вежливо и не обижает собеседника.', uk: 'Коротке Sorry перед відмовою звучить ввічливо і не ображає співрозмовника.', es: 'Un breve Sorry antes del no suena cortés y no ofende al otro.' },
        commonMistake: { ru: 'Не говори I busy без am. Правильно I am busy this morning.', uk: 'Не кажи I busy без am. Правильно I am busy this morning.', es: 'No digas I busy sin am. Lo correcto es I am busy this morning.' },
      },
      words: [
        { text: 'Sorry', partOfSpeech: 'other', distractors: ['Please', 'Maybe', 'Listen', 'Well', 'Look'] },
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'you'] },
        { text: 'am', partOfSpeech: 'to-be', distractors: ['is', 'are', 'was', 'were', 'be'] },
        { text: 'busy', partOfSpeech: 'adjective', distractors: ['free', 'ready', 'late', 'early', 'sure'] },
        { text: 'this', partOfSpeech: 'determiner', distractors: ['that', 'these', 'those', 'my', 'the'] },
        { text: 'morning', partOfSpeech: 'noun', distractors: ['evening', 'afternoon', 'week', 'day', 'hour'] },
      ],
    },
    {
      id: 'mitap_d31_p6',
      english: 'Thank you, I will join on Thursday',
      meaning: { ru: 'Спасибо, я подключусь в четверг', uk: 'Дякую, я підключуся в четвер', es: 'Gracias, me uniré el jueves' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'Подтверди новый день', uk: 'Підтверди новий день', es: 'Confirma el día nuevo' },
        rule: { ru: 'Про своё участие потом поставь will: I will join. join значит подключиться к встрече.', uk: 'Про свою участь потім постав will: I will join. join означає підключитися до зустрічі.', es: 'Para tu participación luego pon will: I will join. join significa unirse a la reunión.' },
        why: { ru: 'Короткое подтверждение с Thank you показывает, что новый день встречи тебе подходит.', uk: 'Коротке підтвердження з Thank you показує, що новий день зустрічі тобі підходить.', es: 'Una confirmación breve con Thank you muestra que el día nuevo te conviene.' },
        commonMistake: { ru: 'Не говори I join Thursday про будущее. Для плана нужно will join.', uk: 'Не кажи I join Thursday про майбутнє. Для плану потрібно will join.', es: 'No digas I join Thursday para el futuro. Para el plan va will join.' },
      },
      words: [
        { text: 'Thank', partOfSpeech: 'verb', distractors: ['help', 'call', 'tell', 'ask', 'meet'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'I'] },
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'you'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'could', 'should', 'must', 'may'] },
        { text: 'join', partOfSpeech: 'verb', distractors: ['read', 'write', 'buy', 'draw', 'cook'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['at', 'in', 'of', 'for', 'by'] },
        { text: 'Thursday', partOfSpeech: 'noun', distractors: ['Monday', 'Tuesday', 'Friday', 'morning', 'evening'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'move', partOfSpeech: 'verb', translation: { ru: 'перенести', uk: 'перенести', es: 'mover' }, example: 'Can we move it to Thursday?' },
    { word: 'working', partOfSpeech: 'verb', translation: { ru: 'работаю (сейчас)', uk: 'працюю (зараз)', es: 'trabajando' }, example: 'I am working on a deadline now' },
    { word: 'free', partOfSpeech: 'adjective', translation: { ru: 'свободен', uk: 'вільний', es: 'libre' }, example: 'Will you be free on Thursday?' },
    { word: 'meeting', partOfSpeech: 'noun', translation: { ru: 'встреча', uk: 'зустріч', es: 'reunión' }, example: 'We will move the meeting to Friday' },
    { word: 'busy', partOfSpeech: 'adjective', translation: { ru: 'занят', uk: 'зайнятий', es: 'ocupado' }, example: 'Sorry, I am busy this morning' },
    { word: 'join', partOfSpeech: 'verb', translation: { ru: 'подключиться', uk: 'підключитися', es: 'unirse' }, example: 'Thank you, I will join on Thursday' },
  ],
};

export const MITAP_DAY_32: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 32,
  topic: { ru: 'Отменить встречу и извиниться', uk: 'Скасувати зустріч і вибачитися', es: 'Cancelar una reunión y disculparse' },
  outcome: {
    ru: 'Ты сможешь вежливо отменить созвон, извиниться и предложить перенести встречу на другое время.',
    uk: 'Ти зможеш ввічливо скасувати дзвінок, вибачитися й запропонувати перенести зустріч на інший час.',
    es: 'Podrás cancelar una llamada con cortesía, disculparte y proponer mover la reunión a otra hora.',
  },
  level: 'A2',
  prerequisiteLessons: [3, 10],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Сначала извинись, потом отмени', uk: 'Спершу вибачся, потім скасуй', es: 'Primero discúlpate, luego cancela' },
      body: {
        ru: 'Начни с короткого извинения, потом скажи, что должен отменить. Слово sorry смягчает всё сообщение.',
        uk: 'Почни з короткого вибачення, потім скажи, що мусиш скасувати. Слово sorry пом\'якшує все повідомлення.',
        es: 'Empieza con una disculpa corta, luego di que tienes que cancelar. La palabra sorry suaviza todo el mensaje.',
      },
      examples: [
        { en: 'I am sorry, I have to cancel.', gloss: { ru: 'Извини, я должен отменить.', uk: 'Вибач, я мушу скасувати.', es: 'Lo siento, tengo que cancelar.' } },
        { en: 'Sorry, I cannot join today.', gloss: { ru: 'Извини, я не могу присоединиться сегодня.', uk: 'Вибач, я не можу приєднатися сьогодні.', es: 'Perdón, no puedo unirme hoy.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Назови короткую причину', uk: 'Назви коротку причину', es: 'Da una razón corta' },
      body: {
        ru: 'После извинения добавь простую причину. Одно предложение достаточно: ты заболел, занят или у тебя другая встреча.',
        uk: 'Після вибачення додай просту причину. Одного речення досить: ти захворів, зайнятий або маєш іншу зустріч.',
        es: 'Después de la disculpa, añade una razón simple. Una frase basta: estás enfermo, ocupado o tienes otra reunión.',
      },
      examples: [
        { en: 'I am sick, so I have to cancel.', gloss: { ru: 'Я болею, поэтому должен отменить.', uk: 'Я хворію, тому мушу скасувати.', es: 'Estoy enfermo, así que tengo que cancelar.' } },
        { en: 'I have another meeting now.', gloss: { ru: 'У меня сейчас другая встреча.', uk: 'У мене зараз інша зустріч.', es: 'Tengo otra reunión ahora.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Предложи новое время', uk: 'Запропонуй новий час', es: 'Propón una hora nueva' },
      body: {
        ru: 'Закончи на позитиве: предложи перенести. Так человек видит, что встреча тебе важна, и не злится.',
        uk: 'Заверши на позитиві: запропонуй перенести. Так людина бачить, що зустріч тобі важлива, і не злиться.',
        es: 'Termina en positivo: propón mover la reunión. Así la persona ve que te importa y no se enfada.',
      },
      examples: [
        { en: 'Can we move it to tomorrow?', gloss: { ru: 'Можем перенести это на завтра?', uk: 'Можемо перенести це на завтра?', es: '¿Podemos moverlo a mañana?' } },
        { en: 'I can meet you on Friday.', gloss: { ru: 'Я могу встретиться с тобой в пятницу.', uk: 'Я можу зустрітися з тобою в п\'ятницю.', es: 'Puedo verte el viernes.' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d32_p1',
      english: 'I am sorry, I have to cancel.',
      meaning: { ru: 'Извини, я должен отменить.', uk: 'Вибач, я мушу скасувати.', es: 'Lo siento, tengo que cancelar.' },
      constructions: ['present-simple', 'modals'],
      explanation: {
        title: { ru: 'have to = должен', uk: 'have to = мушу', es: 'have to = tener que' },
        rule: { ru: 'have to говорит про необходимость. have to cancel -> вынужден отменить, выбора нет.', uk: 'have to каже про необхідність. have to cancel -> змушений скасувати, вибору немає.', es: 'have to expresa necesidad. have to cancel -> obligado a cancelar, sin opción.' },
        why: { ru: 'Так ты показываешь, что отмена не каприз, а необходимость. Это звучит вежливо.', uk: 'Так ти показуєш, що скасування не примха, а необхідність. Це звучить ввічливо.', es: 'Así muestras que cancelar no es un capricho, sino una necesidad. Suena cortés.' },
        commonMistake: { ru: 'Не говори I have cancel. Нужно have to cancel со словом to между ними.', uk: 'Не кажи I have cancel. Потрібно have to cancel зі словом to між ними.', es: 'No digas I have cancel. Necesitas have to cancel con to en medio.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'am', partOfSpeech: 'to-be', distractors: ['is', 'are', 'was', 'were', 'be'] },
        { text: 'sorry', partOfSpeech: 'adjective', distractors: ['happy', 'busy', 'sick', 'late', 'ready'] },
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['you', 'he', 'she', 'we', 'they'] },
        { text: 'have', partOfSpeech: 'verb', distractors: ['see', 'make', 'keep', 'call', 'come'] },
        { text: 'to', partOfSpeech: 'other', distractors: ['for', 'of', 'at', 'in', 'on'] },
        { text: 'cancel', partOfSpeech: 'verb', distractors: ['start', 'finish', 'book', 'plan', 'call'] },
      ],
    },
    {
      id: 'mitap_d32_p2',
      english: 'Sorry, I cannot join the call today.',
      meaning: { ru: 'Извини, я не могу присоединиться к звонку сегодня.', uk: 'Вибач, я не можу приєднатися до дзвінка сьогодні.', es: 'Perdón, no puedo unirme a la llamada hoy.' },
      constructions: ['modals', 'present-simple'],
      explanation: {
        title: { ru: 'cannot = не могу', uk: 'cannot = не можу', es: 'cannot = no poder' },
        rule: { ru: 'cannot говорит, что нет возможности. cannot join -> присоединиться не получится.', uk: 'cannot каже, що немає можливості. cannot join -> приєднатися не вийде.', es: 'cannot dice que no hay posibilidad. cannot join -> no podrás unirte.' },
        why: { ru: 'Короткое cannot ясно объясняет, что ты не появишься, без долгих оправданий.', uk: 'Коротке cannot ясно пояснює, що ти не з\'явишся, без довгих виправдань.', es: 'El corto cannot explica claro que no aparecerás, sin largas excusas.' },
        commonMistake: { ru: 'После cannot ставь слово без to: cannot join, не cannot to join.', uk: 'Після cannot став слово без to: cannot join, не cannot to join.', es: 'Tras cannot pon la palabra sin to: cannot join, no cannot to join.' },
      },
      words: [
        { text: 'Sorry', partOfSpeech: 'adjective', distractors: ['Happy', 'Glad', 'Sure', 'Free', 'Calm'] },
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'cannot', partOfSpeech: 'modal', distractors: ['must', 'should', 'may', 'will', 'might'] },
        { text: 'join', partOfSpeech: 'verb', distractors: ['start', 'book', 'plan', 'watch', 'read'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'my', 'this', 'that'] },
        { text: 'call', partOfSpeech: 'noun', distractors: ['book', 'car', 'shop', 'tree', 'box'] },
        { text: 'today', partOfSpeech: 'adverb', distractors: ['here', 'fast', 'soon', 'late', 'early'] },
      ],
    },
    {
      id: 'mitap_d32_p3',
      english: 'I am sick, so I have to cancel.',
      meaning: { ru: 'Я болею, поэтому должен отменить.', uk: 'Я хворію, тому мушу скасувати.', es: 'Estoy enfermo, así que tengo que cancelar.' },
      constructions: ['present-simple', 'modals'],
      explanation: {
        title: { ru: 'so = поэтому', uk: 'so = тому', es: 'so = así que' },
        rule: { ru: 'so соединяет причину и итог. I am sick, so... -> болею, поэтому результат такой.', uk: 'so з\'єднує причину й підсумок. I am sick, so... -> хворію, тому результат такий.', es: 'so une causa y resultado. I am sick, so... -> enfermo, así que el resultado.' },
        why: { ru: 'Маленькая причина перед отменой делает сообщение честным и понятным собеседнику.', uk: 'Маленька причина перед скасуванням робить повідомлення чесним і зрозумілим співрозмовнику.', es: 'Una razón pequeña antes de cancelar hace el mensaje honesto y claro.' },
        commonMistake: { ru: 'Не путай so и because. so идёт перед итогом: причина, so итог.', uk: 'Не плутай so і because. so йде перед підсумком: причина, so підсумок.', es: 'No confundas so y because. so va antes del resultado: causa, so resultado.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'am', partOfSpeech: 'to-be', distractors: ['is', 'are', 'was', 'were', 'be'] },
        { text: 'sick', partOfSpeech: 'adjective', distractors: ['happy', 'busy', 'late', 'ready', 'calm'] },
        { text: 'so', partOfSpeech: 'conjunction', distractors: ['but', 'and', 'or', 'because', 'if'] },
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['you', 'he', 'she', 'we', 'they'] },
        { text: 'have', partOfSpeech: 'verb', distractors: ['see', 'make', 'keep', 'call', 'come'] },
        { text: 'to', partOfSpeech: 'other', distractors: ['for', 'of', 'at', 'in', 'on'] },
        { text: 'cancel', partOfSpeech: 'verb', distractors: ['start', 'finish', 'book', 'plan', 'call'] },
      ],
    },
    {
      id: 'mitap_d32_p4',
      english: 'Can we move it to tomorrow?',
      meaning: { ru: 'Можем перенести это на завтра?', uk: 'Можемо перенести це на завтра?', es: '¿Podemos moverlo a mañana?' },
      constructions: ['modals'],
      explanation: {
        title: { ru: 'Can we...? = Можем...?', uk: 'Can we...? = Можемо...?', es: '¿Can we...? = ¿Podemos...?' },
        rule: { ru: 'Can we в начале делает вежливый вопрос. Can we move? -> можем перенести?', uk: 'Can we на початку робить ввічливе питання. Can we move? -> можемо перенести?', es: 'Can we al inicio hace una pregunta cortés. ¿Can we move? -> ¿podemos mover?' },
        why: { ru: 'Вопрос Can we...? предлагает решение вместе и звучит мягче, чем приказ.', uk: 'Питання Can we...? пропонує рішення разом і звучить м\'якше, ніж наказ.', es: 'La pregunta ¿Can we...? propone una solución juntos y suena más suave que una orden.' },
        commonMistake: { ru: 'В вопросе Can идёт первым: Can we move? Не We can move?', uk: 'У питанні Can іде першим: Can we move? Не We can move?', es: 'En la pregunta Can va primero: ¿Can we move? No ¿We can move?' },
      },
      words: [
        { text: 'Can', partOfSpeech: 'modal', distractors: ['Must', 'Should', 'May', 'Will', 'Might'] },
        { text: 'we', partOfSpeech: 'pronoun', distractors: ['I', 'he', 'she', 'they', 'it'] },
        { text: 'move', partOfSpeech: 'verb', distractors: ['book', 'start', 'plan', 'close', 'keep'] },
        { text: 'it', partOfSpeech: 'pronoun', distractors: ['us', 'him', 'her', 'them', 'me'] },
        { text: 'to', partOfSpeech: 'other', distractors: ['for', 'of', 'at', 'in', 'on'] },
        { text: 'tomorrow', partOfSpeech: 'adverb', distractors: ['here', 'soon', 'fast', 'late', 'early'] },
      ],
    },
    {
      id: 'mitap_d32_p5',
      english: 'I can meet you on Friday.',
      meaning: { ru: 'Я могу встретиться с тобой в пятницу.', uk: 'Я можу зустрітися з тобою в п\'ятницю.', es: 'Puedo verte el viernes.' },
      constructions: ['modals', 'prepositions-time'],
      explanation: {
        title: { ru: 'on + день недели', uk: 'on + день тижня', es: 'on + día de la semana' },
        rule: { ru: 'Перед днём недели ставь on. on Friday -> в пятницу.', uk: 'Перед днем тижня став on. on Friday -> у п\'ятницю.', es: 'Antes del día de la semana pon on. on Friday -> el viernes.' },
        why: { ru: 'Назвав новый день, ты показываешь, что хочешь встречу, а не просто отменяешь.', uk: 'Назвавши новий день, ти показуєш, що хочеш зустріч, а не просто скасовуєш.', es: 'Al nombrar un día nuevo, muestras que quieres la reunión, no solo cancelarla.' },
        commonMistake: { ru: 'С днями недели нужен on, не in: on Friday, не in Friday.', uk: 'З днями тижня потрібен on, не in: on Friday, не in Friday.', es: 'Con días de la semana usa on, no in: on Friday, no in Friday.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'can', partOfSpeech: 'modal', distractors: ['must', 'should', 'may', 'will', 'might'] },
        { text: 'meet', partOfSpeech: 'verb', distractors: ['call', 'help', 'ask', 'tell', 'show'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['me', 'him', 'her', 'them', 'us'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['in', 'at', 'for', 'by', 'to'] },
        { text: 'Friday', partOfSpeech: 'noun', distractors: ['Monday', 'Sunday', 'Tuesday', 'morning', 'evening'] },
      ],
    },
    {
      id: 'mitap_d32_p6',
      english: 'I am really sorry for the change.',
      meaning: { ru: 'Мне правда жаль из-за этого изменения.', uk: 'Мені справді шкода через цю зміну.', es: 'Lo siento mucho por el cambio.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'sorry for = жаль из-за', uk: 'sorry for = шкода через', es: 'sorry for = sentirlo por' },
        rule: { ru: 'После sorry ставь for и причину. sorry for the change -> жаль из-за изменения.', uk: 'Після sorry став for і причину. sorry for the change -> шкода через зміну.', es: 'Tras sorry pon for y la causa. sorry for the change -> sentirlo por el cambio.' },
        why: { ru: 'Слово really усиливает извинение и показывает, что тебе действительно неловко.', uk: 'Слово really підсилює вибачення й показує, що тобі справді ніяково.', es: 'La palabra really refuerza la disculpa y muestra que de verdad lo lamentas.' },
        commonMistake: { ru: 'После sorry for ставь существительное: sorry for the change, не sorry for change.', uk: 'Після sorry for став іменник: sorry for the change, не sorry for change.', es: 'Tras sorry for pon un sustantivo: sorry for the change, no sorry for change.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'am', partOfSpeech: 'to-be', distractors: ['is', 'are', 'was', 'were', 'be'] },
        { text: 'really', partOfSpeech: 'adverb', distractors: ['soon', 'here', 'fast', 'late', 'now'] },
        { text: 'sorry', partOfSpeech: 'adjective', distractors: ['happy', 'busy', 'sick', 'late', 'ready'] },
        { text: 'for', partOfSpeech: 'preposition', distractors: ['at', 'in', 'on', 'by', 'of'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'my', 'this', 'that'] },
        { text: 'change', partOfSpeech: 'noun', distractors: ['call', 'room', 'desk', 'plan', 'note'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'cancel', partOfSpeech: 'verb', translation: { ru: 'отменить', uk: 'скасувати', es: 'cancelar' }, example: 'I am sorry, I have to cancel.' },
    { word: 'join', partOfSpeech: 'verb', translation: { ru: 'присоединиться', uk: 'приєднатися', es: 'unirse' }, example: 'Sorry, I cannot join the call today.' },
    { word: 'sick', partOfSpeech: 'adjective', translation: { ru: 'больной', uk: 'хворий', es: 'enfermo' }, example: 'I am sick, so I have to cancel.' },
    { word: 'move', partOfSpeech: 'verb', translation: { ru: 'перенести', uk: 'перенести', es: 'mover' }, example: 'Can we move it to tomorrow?' },
    { word: 'meet', partOfSpeech: 'verb', translation: { ru: 'встретиться', uk: 'зустрітися', es: 'ver' }, example: 'I can meet you on Friday.' },
    { word: 'change', partOfSpeech: 'noun', translation: { ru: 'изменение', uk: 'зміна', es: 'cambio' }, example: 'I am really sorry for the change.' },
  ],
};

export const MITAP_DAY_33: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 33,
  topic: { ru: 'Отправить приглашение в календарь', uk: 'Надіслати запрошення в календар', es: 'Enviar una invitación al calendario' },
  outcome: {
    ru: 'Сможешь сам назначить следующую встречу: пообещаешь кинуть инвайт в календарь, добавишь человека и попросишь принять приглашение.',
    uk: 'Зможеш сам призначити наступну зустріч: пообіцяєш кинути інвайт у календар, додаси людину і попросиш прийняти запрошення.',
    es: 'Podrás fijar tú la próxima reunión: prometerás enviar la invitación al calendario, añadirás a la persona y pedirás que la acepte.',
  },
  level: 'A2',
  prerequisiteLessons: [13, 18],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Что делаем сегодня', uk: 'Що робимо сьогодні', es: 'Qué hacemos hoy' },
      body: {
        ru: 'После созвона удобно сразу назначить следующую встречу. Сегодня учимся пообещать кинуть инвайт в календарь и спокойно позвать человека.',
        uk: 'Після дзвінка зручно одразу призначити наступну зустріч. Сьогодні вчимося пообіцяти кинути інвайт у календар і спокійно покликати людину.',
        es: 'Tras la llamada conviene fijar ya la próxima reunión. Hoy aprendemos a prometer enviar la invitación al calendario e invitar tranquilo a la persona.',
      },
      examples: [
        { en: 'I will send a calendar invite.', gloss: { ru: 'Я кину инвайт в календарь.', uk: 'Я кину інвайт у календар.', es: 'Enviaré una invitación al calendario.' } },
        { en: 'I will add you to the meeting.', gloss: { ru: 'Я добавлю тебя на встречу.', uk: 'Я додам тебе на зустріч.', es: 'Te añadiré a la reunión.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Обещаю сделать: слово will', uk: 'Обіцяю зробити: слово will', es: 'Prometo hacerlo: la palabra will' },
      body: {
        ru: 'Когда обещаешь сделать что-то потом, ставь will перед действием: will send = «отправлю», will add = «добавлю». Коротко и уверенно.',
        uk: 'Коли обіцяєш зробити щось потім, став will перед дією: will send = «надішлю», will add = «додам». Коротко і впевнено.',
        es: 'Cuando prometes hacer algo después, pon will antes de la acción: will send = «enviaré», will add = «añadiré». Corto y seguro.',
      },
      examples: [
        { en: 'You will get the invite soon.', gloss: { ru: 'Ты скоро получишь приглашение.', uk: 'Ти скоро отримаєш запрошення.', es: 'Recibirás la invitación pronto.' } },
        { en: 'I will pick a good time.', gloss: { ru: 'Я выберу удобное время.', uk: 'Я виберу зручний час.', es: 'Elegiré una buena hora.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Прошу сделать: просто скажи действие', uk: 'Прошу зробити: просто скажи дію', es: 'Pido hacerlo: solo di la acción' },
      body: {
        ru: 'Когда просишь человека сделать шаг, начинай прямо со слова-действия: check = «проверь», accept = «прими». Без «ты» впереди.',
        uk: 'Коли просиш людину зробити крок, починай прямо зі слова-дії: check = «перевір», accept = «прийми». Без «ти» попереду.',
        es: 'Cuando pides un paso a la persona, empieza directo con la acción: check = «revisa», accept = «acepta». Sin «tú» delante.',
      },
      examples: [
        { en: 'Check your calendar for the invite.', gloss: { ru: 'Проверь приглашение в своём календаре.', uk: 'Перевір запрошення у своєму календарі.', es: 'Revisa la invitación en tu calendario.' } },
        { en: 'Accept the invite, please.', gloss: { ru: 'Прими приглашение, пожалуйста.', uk: 'Прийми запрошення, будь ласка.', es: 'Acepta la invitación, por favor.' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d33_p1',
      english: 'I will send a calendar invite.',
      meaning: { ru: 'Я кину инвайт в календарь.', uk: 'Я кину інвайт у календар.', es: 'Enviaré una invitación al calendario.' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'Слово will', uk: 'Слово will', es: 'La palabra will' },
        rule: { ru: 'will = обещание сделать потом. send = «отправить». invite = «приглашение, инвайт». I will send = «я отправлю».', uk: 'will = обіцянка зробити потім. send = «надіслати». invite = «запрошення, інвайт». I will send = «я надішлю».', es: 'will = promesa de hacerlo luego. send = «enviar». invite = «invitación». I will send = «enviaré».' },
        why: { ru: 'Так ты берёшь встречу на себя и обещаешь кинуть инвайт. Звучит уверенно.', uk: 'Так ти береш зустріч на себе і обіцяєш кинути інвайт. Звучить упевнено.', es: 'Así te encargas tú de la reunión y prometes enviar la invitación. Suena seguro.' },
        commonMistake: { ru: 'Не теряй will: говори I will send, а не I send для обещания.', uk: 'Не губи will: кажи I will send, а не I send для обіцянки.', es: 'No pierdas will: di I will send, no I send para la promesa.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'might'] },
        { text: 'send', partOfSpeech: 'verb', distractors: ['cook', 'drive', 'sleep', 'paint', 'sing'] },
        { text: 'a', partOfSpeech: 'article', distractors: ['an', 'the', 'my', 'this', 'that'] },
        { text: 'calendar', partOfSpeech: 'noun', distractors: ['window', 'garden', 'spoon', 'pillow', 'river'] },
        { text: 'invite', partOfSpeech: 'noun', distractors: ['ticket', 'engine', 'cloud', 'floor', 'bottle'] },
      ],
    },
    {
      id: 'mitap_d33_p2',
      english: 'I will add you to the meeting.',
      meaning: { ru: 'Я добавлю тебя на встречу.', uk: 'Я додам тебе на зустріч.', es: 'Te añadiré a la reunión.' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'Слово add', uk: 'Слово add', es: 'La palabra add' },
        rule: { ru: 'add = «добавить». you = «тебя». meeting = «встреча». I will add you = «я добавлю тебя».', uk: 'add = «додати». you = «тебе». meeting = «зустріч». I will add you = «я додам тебе».', es: 'add = «añadir». you = «te». meeting = «reunión». I will add you = «te añadiré».' },
        why: { ru: 'Сначала кого (you), потом куда (to the meeting). Такой порядок звучит естественно.', uk: 'Спершу кого (you), потім куди (to the meeting). Такий порядок звучить природно.', es: 'Primero a quién (you), luego a dónde (to the meeting). Ese orden suena natural.' },
        commonMistake: { ru: 'После add сразу you: говори add you to, а не add to you.', uk: 'Після add одразу you: кажи add you to, а не add to you.', es: 'Tras add va you directo: di add you to, no add to you.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'might'] },
        { text: 'add', partOfSpeech: 'verb', distractors: ['cook', 'drive', 'sleep', 'paint', 'sing'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['him', 'her', 'us', 'them', 'me'] },
        { text: 'to', partOfSpeech: 'preposition', distractors: ['under', 'at', 'by', 'with', 'for'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'my', 'this', 'that'] },
        { text: 'meeting', partOfSpeech: 'noun', distractors: ['window', 'garden', 'spoon', 'pillow', 'river'] },
      ],
    },
    {
      id: 'mitap_d33_p3',
      english: 'Check your calendar for the invite.',
      meaning: { ru: 'Проверь приглашение в своём календаре.', uk: 'Перевір запрошення у своєму календарі.', es: 'Revisa la invitación en tu calendario.' },
      constructions: ['imperative'],
      explanation: {
        title: { ru: 'Команда check', uk: 'Команда check', es: 'La orden check' },
        rule: { ru: 'check = «проверь». your calendar = «твой календарь». Check your calendar = «проверь свой календарь».', uk: 'check = «перевір». your calendar = «твій календар». Check your calendar = «перевір свій календар».', es: 'check = «revisa». your calendar = «tu calendario». Check your calendar = «revisa tu calendario».' },
        why: { ru: 'Просьбу начинаешь прямо со слова-действия check. Никакого «ты» впереди не нужно.', uk: 'Прохання починаєш прямо зі слова-дії check. Ніякого «ти» попереду не треба.', es: 'La petición empieza directo con la acción check. No hace falta poner «tú» delante.' },
        commonMistake: { ru: 'Не ставь you вперёд: говори check your calendar, а не you check.', uk: 'Не став you попереду: кажи check your calendar, а не you check.', es: 'No pongas you delante: di check your calendar, no you check.' },
      },
      words: [
        { text: 'Check', partOfSpeech: 'verb', distractors: ['Cook', 'Drive', 'Paint', 'Climb', 'Bake'] },
        { text: 'your', partOfSpeech: 'determiner', distractors: ['my', 'his', 'her', 'our', 'their'] },
        { text: 'calendar', partOfSpeech: 'noun', distractors: ['window', 'garden', 'spoon', 'pillow', 'river'] },
        { text: 'for', partOfSpeech: 'preposition', distractors: ['under', 'at', 'by', 'with', 'of'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'my', 'this', 'that'] },
        { text: 'invite', partOfSpeech: 'noun', distractors: ['ticket', 'engine', 'cloud', 'floor', 'bottle'] },
      ],
    },
    {
      id: 'mitap_d33_p4',
      english: 'You will get the invite soon.',
      meaning: { ru: 'Ты скоро получишь приглашение.', uk: 'Ти скоро отримаєш запрошення.', es: 'Recibirás la invitación pronto.' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'Слово get', uk: 'Слово get', es: 'La palabra get' },
        rule: { ru: 'get = «получить». soon = «скоро». You will get = «ты получишь». You will get the invite = «ты получишь приглашение».', uk: 'get = «отримати». soon = «скоро». You will get = «ти отримаєш». You will get the invite = «ти отримаєш запрошення».', es: 'get = «recibir». soon = «pronto». You will get = «recibirás». You will get the invite = «recibirás la invitación».' },
        why: { ru: 'Так ты успокаиваешь человека: инвайт точно придёт скоро. Звучит дружелюбно.', uk: 'Так ти заспокоюєш людину: інвайт точно прийде скоро. Звучить дружньо.', es: 'Así tranquilizas a la persona: la invitación llegará pronto. Suena amable.' },
        commonMistake: { ru: 'soon ставь в конце: You will get the invite soon, а не soon you will get.', uk: 'soon став у кінці: You will get the invite soon, а не soon you will get.', es: 'Pon soon al final: You will get the invite soon, no soon you will get.' },
      },
      words: [
        { text: 'You', partOfSpeech: 'pronoun', distractors: ['He', 'She', 'It', 'Anna', 'Tom'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'might'] },
        { text: 'get', partOfSpeech: 'verb', distractors: ['cook', 'drive', 'paint', 'climb', 'bake'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'my', 'this', 'that'] },
        { text: 'invite', partOfSpeech: 'noun', distractors: ['ticket', 'engine', 'cloud', 'floor', 'bottle'] },
        { text: 'soon', partOfSpeech: 'adverb', distractors: ['here', 'again', 'today', 'twice', 'alone'] },
      ],
    },
    {
      id: 'mitap_d33_p5',
      english: 'Accept the invite, please.',
      meaning: { ru: 'Прими приглашение, пожалуйста.', uk: 'Прийми запрошення, будь ласка.', es: 'Acepta la invitación, por favor.' },
      constructions: ['imperative'],
      explanation: {
        title: { ru: 'Команда accept', uk: 'Команда accept', es: 'La orden accept' },
        rule: { ru: 'accept = «прими». please = «пожалуйста». Accept the invite = «прими приглашение».', uk: 'accept = «прийми». please = «будь ласка». Accept the invite = «прийми запрошення».', es: 'accept = «acepta». please = «por favor». Accept the invite = «acepta la invitación».' },
        why: { ru: 'Слово please в конце делает просьбу мягкой. Так удобно попросить подтвердить встречу.', uk: 'Слово please в кінці робить прохання м\'яким. Так зручно попросити підтвердити зустріч.', es: 'La palabra please al final suaviza la petición. Así pides confirmar la reunión con cortesía.' },
        commonMistake: { ru: 'please ставь в конце: Accept the invite, please, а не please accept спереди грубее.', uk: 'please став у кінці: Accept the invite, please, а не please accept спереду грубіше.', es: 'Pon please al final: Accept the invite, please, no please accept delante.' },
      },
      words: [
        { text: 'Accept', partOfSpeech: 'verb', distractors: ['Cook', 'Drive', 'Paint', 'Climb', 'Bake'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'my', 'this', 'that'] },
        { text: 'invite', partOfSpeech: 'noun', distractors: ['ticket', 'engine', 'cloud', 'floor', 'bottle'] },
        { text: 'please', partOfSpeech: 'adverb', distractors: ['soon', 'here', 'again', 'today', 'twice'] },
      ],
    },
    {
      id: 'mitap_d33_p6',
      english: 'I will pick a good time.',
      meaning: { ru: 'Я выберу удобное время.', uk: 'Я виберу зручний час.', es: 'Elegiré una buena hora.' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'Слово pick', uk: 'Слово pick', es: 'La palabra pick' },
        rule: { ru: 'pick = «выбрать». good = «хороший, удобный». time = «время». I will pick = «я выберу».', uk: 'pick = «вибрати». good = «хороший, зручний». time = «час». I will pick = «я виберу».', es: 'pick = «elegir». good = «buena». time = «hora». I will pick = «elegiré».' },
        why: { ru: 'Так ты обещаешь подобрать удобный слот для всех. Это вежливый ход при назначении встречи.', uk: 'Так ти обіцяєш підібрати зручний слот для всіх. Це ввічливий хід при призначенні зустрічі.', es: 'Así prometes buscar una hora cómoda para todos. Es un gesto cortés al fijar la reunión.' },
        commonMistake: { ru: 'good ставь перед time: a good time, а не a time good.', uk: 'good став перед time: a good time, а не a time good.', es: 'Pon good antes de time: a good time, no a time good.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'might'] },
        { text: 'pick', partOfSpeech: 'verb', distractors: ['cook', 'drive', 'paint', 'climb', 'bake'] },
        { text: 'a', partOfSpeech: 'article', distractors: ['an', 'the', 'my', 'this', 'that'] },
        { text: 'good', partOfSpeech: 'adjective', distractors: ['cold', 'round', 'loud', 'wet', 'tall'] },
        { text: 'time', partOfSpeech: 'noun', distractors: ['window', 'garden', 'spoon', 'pillow', 'river'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'will', partOfSpeech: 'modal', translation: { ru: 'обещание сделать потом (я сделаю)', uk: 'обіцянка зробити потім (я зроблю)', es: 'promesa de hacer (haré)' }, example: 'I will send a calendar invite.' },
    { word: 'calendar', partOfSpeech: 'noun', translation: { ru: 'календарь', uk: 'календар', es: 'calendario' }, example: 'I will send a calendar invite.' },
    { word: 'invite', partOfSpeech: 'noun', translation: { ru: 'приглашение, инвайт', uk: 'запрошення, інвайт', es: 'invitación' }, example: 'I will send a calendar invite.' },
    { word: 'meeting', partOfSpeech: 'noun', translation: { ru: 'встреча', uk: 'зустріч', es: 'reunión' }, example: 'I will add you to the meeting.' },
    { word: 'accept', partOfSpeech: 'verb', translation: { ru: 'принять', uk: 'прийняти', es: 'aceptar' }, example: 'Accept the invite, please.' },
    { word: 'pick', partOfSpeech: 'verb', translation: { ru: 'выбрать', uk: 'вибрати', es: 'elegir' }, example: 'I will pick a good time.' },
  ],
};

export const MITAP_DAY_34: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 34,
  topic: { ru: 'Подтвердить участие во встрече', uk: 'Підтвердити участь у зустрічі', es: 'Confirmar tu asistencia a la reunión' },
  outcome: {
    ru: 'Ты уверенно скажешь, что придёшь на встречу: I will be there, Count me in, и подтвердишь время.',
    uk: 'Ти впевнено скажеш, що прийдеш на зустріч: I will be there, Count me in, і підтвердиш час.',
    es: 'Dirás con seguridad que asistirás a la reunión: I will be there, Count me in, y confirmarás la hora.',
  },
  level: 'A2',
  prerequisiteLessons: [3, 13],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Скажи, что придёшь', uk: 'Скажи, що прийдеш', es: 'Di que asistirás' },
      body: {
        ru: 'Когда зовут на встречу, ответь коротко и ясно: I will be there. Это значит «я буду там». Так все понимают, что тебя можно ждать.',
        uk: 'Коли кличуть на зустріч, відповідай коротко і ясно: I will be there. Це означає «я буду там». Так усі розуміють, що на тебе можна чекати.',
        es: 'Cuando te invitan a una reunión, responde corto y claro: I will be there. Significa «estaré ahí». Así todos saben que pueden contar contigo.',
      },
      examples: [
        { en: 'Thanks, I will be there.', gloss: { ru: 'Спасибо, я буду там.', uk: 'Дякую, я буду там.', es: 'Gracias, estaré ahí.' } },
        { en: 'I will be there on time.', gloss: { ru: 'Я буду там вовремя.', uk: 'Я буду там вчасно.', es: 'Estaré ahí a tiempo.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Count me in', uk: 'Count me in', es: 'Count me in' },
      body: {
        ru: 'Хочешь сказать «я в деле, я участвую»? Скажи Count me in. Это живая фраза для встреч и общих дел. Звучит дружелюбно и уверенно.',
        uk: 'Хочеш сказати «я в справі, я беру участь»? Скажи Count me in. Це жива фраза для зустрічей і спільних справ. Звучить дружньо і впевнено.',
        es: '¿Quieres decir «me apunto, participo»? Di Count me in. Es una frase viva para reuniones y tareas comunes. Suena amable y segura.',
      },
      examples: [
        { en: 'Sounds good, count me in.', gloss: { ru: 'Звучит хорошо, я участвую.', uk: 'Звучить добре, я беру участь.', es: 'Suena bien, me apunto.' } },
        { en: 'Count me in for the call.', gloss: { ru: 'Я участвую в созвоне.', uk: 'Я беру участь у дзвінку.', es: 'Me apunto a la llamada.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Подтверди время', uk: 'Підтверди час', es: 'Confirma la hora' },
      body: {
        ru: 'После «я буду» полезно подтвердить время: I confirm the meeting at three. Так не будет путаницы, и встреча точно состоится.',
        uk: 'Після «я буду» корисно підтвердити час: I confirm the meeting at three. Так не буде плутанини, і зустріч точно відбудеться.',
        es: 'Después de «estaré» conviene confirmar la hora: I confirm the meeting at three. Así no habrá confusión y la reunión sí ocurrirá.',
      },
      examples: [
        { en: 'I confirm the meeting at three.', gloss: { ru: 'Я подтверждаю встречу в три.', uk: 'Я підтверджую зустріч о третій.', es: 'Confirmo la reunión a las tres.' } },
        { en: 'Yes, I confirm. See you then.', gloss: { ru: 'Да, подтверждаю. До встречи.', uk: 'Так, підтверджую. До зустрічі.', es: 'Sí, confirmo. Nos vemos.' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d34_p1',
      english: 'Thanks, I will be there.',
      meaning: { ru: 'Спасибо, я буду там.', uk: 'Дякую, я буду там.', es: 'Gracias, estaré ahí.' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'I will be there — я буду там', uk: 'I will be there — я буду там', es: 'I will be there — estaré ahí' },
        rule: { ru: 'will + be показывает будущее. I will be there значит «я буду там». Так ты обещаешь прийти.', uk: 'will + be показує майбутнє. I will be there значить «я буду там». Так ти обіцяєш прийти.', es: 'will + be muestra futuro. I will be there significa «estaré ahí». Así prometes venir.' },
        why: { ru: 'Короткий и тёплый ответ на приглашение. Все сразу понимают: тебя можно ждать.', uk: 'Короткий і теплий відповідь на запрошення. Усі одразу розуміють: на тебе можна чекати.', es: 'Respuesta corta y cálida a una invitación. Todos entienden que pueden contar contigo.' },
        commonMistake: { ru: 'Не говори I will there. Нужно слово be: I will be there.', uk: 'Не кажи I will there. Потрібне слово be: I will be there.', es: 'No digas I will there. Hace falta be: I will be there.' },
      },
      words: [
        { text: 'Thanks', partOfSpeech: 'other', distractors: ['Goodnight', 'Goodbye', 'Maybe', 'Listen', 'Look'] },
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['we', 'he', 'she', 'they', 'you'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'would'] },
        { text: 'be', partOfSpeech: 'to-be', distractors: ['is', 'are', 'was', 'were', 'am'] },
        { text: 'there', partOfSpeech: 'adverb', distractors: ['here', 'now', 'soon', 'then', 'today'] },
      ],
    },
    {
      id: 'mitap_d34_p2',
      english: 'Sounds good, count me in.',
      meaning: { ru: 'Звучит хорошо, я участвую.', uk: 'Звучить добре, я беру участь.', es: 'Suena bien, me apunto.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'count me in — я участвую', uk: 'count me in — я беру участь', es: 'count me in — me apunto' },
        rule: { ru: 'count me in — готовая фраза «я в деле, я с вами». Говори её, когда соглашаешься участвовать.', uk: 'count me in — готова фраза «я в справі, я з вами». Кажи її, коли погоджуєшся брати участь.', es: 'count me in — frase hecha «me apunto, cuenten conmigo». Dila cuando aceptas participar.' },
        why: { ru: 'Живая и дружелюбная. Лучше сухого yes, показывает желание участвовать.', uk: 'Жива і дружня. Краще за сухе yes, показує бажання брати участь.', es: 'Viva y amable. Mejor que un yes seco, muestra ganas de participar.' },
        commonMistake: { ru: 'Не меняй порядок: говори count me in, а не count in me.', uk: 'Не змінюй порядок: кажи count me in, а не count in me.', es: 'No cambies el orden: di count me in, no count in me.' },
      },
      words: [
        { text: 'Sounds', partOfSpeech: 'verb', distractors: ['looks', 'feels', 'seems', 'goes', 'stays'] },
        { text: 'good', partOfSpeech: 'adjective', distractors: ['tall', 'red', 'empty', 'round', 'cold'] },
        { text: 'count', partOfSpeech: 'verb', distractors: ['keep', 'put', 'let', 'bring', 'take'] },
        { text: 'me', partOfSpeech: 'pronoun', distractors: ['him', 'her', 'us', 'them', 'you'] },
        { text: 'in', partOfSpeech: 'preposition', distractors: ['on', 'at', 'to', 'up', 'by'] },
      ],
    },
    {
      id: 'mitap_d34_p3',
      english: 'I confirm the meeting at three.',
      meaning: { ru: 'Я подтверждаю встречу в три.', uk: 'Я підтверджую зустріч о третій.', es: 'Confirmo la reunión a las tres.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'I confirm — я подтверждаю', uk: 'I confirm — я підтверджую', es: 'I confirm — confirmo' },
        rule: { ru: 'I confirm значит «я подтверждаю». Дальше скажи, что именно: the meeting at three — встречу в три.', uk: 'I confirm значить «я підтверджую». Далі скажи, що саме: the meeting at three — зустріч о третій.', es: 'I confirm significa «confirmo». Luego di qué: the meeting at three — la reunión a las tres.' },
        why: { ru: 'Чёткое подтверждение времени убирает путаницу. Все знают: встреча точно будет.', uk: 'Чітке підтвердження часу прибирає плутанину. Усі знають: зустріч точно буде.', es: 'Confirmar la hora claramente quita la confusión. Todos saben que la reunión sí será.' },
        commonMistake: { ru: 'Время идёт после at: at three. Не говори in three для часа.', uk: 'Час іде після at: at three. Не кажи in three для години.', es: 'La hora va tras at: at three. No digas in three para la hora.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['we', 'he', 'she', 'they', 'you'] },
        { text: 'confirm', partOfSpeech: 'verb', distractors: ['join', 'check', 'plan', 'accept', 'book'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'my', 'this', 'that'] },
        { text: 'meeting', partOfSpeech: 'noun', distractors: ['call', 'talk', 'plan', 'report', 'desk'] },
        { text: 'at', partOfSpeech: 'preposition', distractors: ['on', 'in', 'by', 'to', 'for'] },
        { text: 'three', partOfSpeech: 'determiner', distractors: ['two', 'four', 'five', 'six', 'ten'] },
      ],
    },
    {
      id: 'mitap_d34_p4',
      english: 'Yes, I will join the call.',
      meaning: { ru: 'Да, я подключусь к созвону.', uk: 'Так, я приєднаюся до дзвінка.', es: 'Sí, me uniré a la llamada.' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'I will join — я подключусь', uk: 'I will join — я приєднаюся', es: 'I will join — me uniré' },
        rule: { ru: 'will + join значит «подключусь, присоединюсь» в будущем. I will join the call — я зайду в созвон.', uk: 'will + join значить «приєднаюся» у майбутньому. I will join the call — я зайду в дзвінок.', es: 'will + join significa «me uniré» en futuro. I will join the call — entraré a la llamada.' },
        why: { ru: 'Так ты подтверждаешь участие именно в онлайн-созвоне. Коллеги ждут тебя в звонке.', uk: 'Так ти підтверджуєш участь саме в онлайн-дзвінку. Колеги чекають на тебе в дзвінку.', es: 'Así confirmas tu participación en la llamada en línea. Los colegas te esperan ahí.' },
        commonMistake: { ru: 'После will глагол без to: I will join, не I will to join.', uk: 'Після will дієслово без to: I will join, не I will to join.', es: 'Tras will el verbo sin to: I will join, no I will to join.' },
      },
      words: [
        { text: 'Yes', partOfSpeech: 'other', distractors: ['No', 'Okay', 'Sure', 'Right', 'Well'] },
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['we', 'he', 'she', 'they', 'you'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'would'] },
        { text: 'join', partOfSpeech: 'verb', distractors: ['start', 'open', 'read', 'send', 'check'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'my', 'this', 'that'] },
        { text: 'call', partOfSpeech: 'noun', distractors: ['room', 'desk', 'note', 'plan', 'report'] },
      ],
    },
    {
      id: 'mitap_d34_p5',
      english: 'I will be there on time.',
      meaning: { ru: 'Я буду там вовремя.', uk: 'Я буду там вчасно.', es: 'Estaré ahí a tiempo.' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'on time — вовремя', uk: 'on time — вчасно', es: 'on time — a tiempo' },
        rule: { ru: 'on time значит «вовремя, не опоздаю». Добавь к I will be there, и ты обещаешь прийти точно.', uk: 'on time значить «вчасно, не запізнюся». Додай до I will be there, і ти обіцяєш прийти точно.', es: 'on time significa «a tiempo, sin tardar». Añádelo a I will be there y prometes llegar puntual.' },
        why: { ru: 'Показывает, что ты надёжный. Коллеги спокойны: ты не опоздаешь на встречу.', uk: 'Показує, що ти надійний. Колеги спокійні: ти не запізнишся на зустріч.', es: 'Muestra que eres confiable. Los colegas están tranquilos: no llegarás tarde.' },
        commonMistake: { ru: 'Говори on time, а не in time, когда обещаешь не опоздать.', uk: 'Кажи on time, а не in time, коли обіцяєш не запізнитися.', es: 'Di on time, no in time, cuando prometes no llegar tarde.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['we', 'he', 'she', 'they', 'you'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'would'] },
        { text: 'be', partOfSpeech: 'to-be', distractors: ['is', 'are', 'was', 'were', 'am'] },
        { text: 'there', partOfSpeech: 'adverb', distractors: ['here', 'now', 'soon', 'then', 'today'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['in', 'at', 'by', 'to', 'for'] },
        { text: 'time', partOfSpeech: 'noun', distractors: ['day', 'week', 'hour', 'date', 'place'] },
      ],
    },
    {
      id: 'mitap_d34_p6',
      english: 'Count me in for the meeting.',
      meaning: { ru: 'Я участвую во встрече.', uk: 'Я беру участь у зустрічі.', es: 'Me apunto a la reunión.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'count me in for — я в деле ради', uk: 'count me in for — я в справі заради', es: 'count me in for — me apunto a' },
        rule: { ru: 'После count me in добавь for и дело: for the meeting — во встрече. Так уточняешь, к чему ты присоединяешься.', uk: 'Після count me in додай for і справу: for the meeting — у зустрічі. Так уточнюєш, до чого приєднуєшся.', es: 'Tras count me in añade for y el evento: for the meeting — a la reunión. Así aclaras a qué te unes.' },
        why: { ru: 'Удобно, когда дел несколько. Сразу ясно, во встрече ты участвуешь.', uk: 'Зручно, коли справ кілька. Одразу ясно, у зустрічі ти береш участь.', es: 'Útil cuando hay varias cosas. Queda claro a qué reunión te apuntas.' },
        commonMistake: { ru: 'Уточняй через for: count me in for the meeting, не count me to the meeting.', uk: 'Уточнюй через for: count me in for the meeting, не count me to the meeting.', es: 'Aclara con for: count me in for the meeting, no count me to the meeting.' },
      },
      words: [
        { text: 'Count', partOfSpeech: 'verb', distractors: ['keep', 'put', 'let', 'bring', 'take'] },
        { text: 'me', partOfSpeech: 'pronoun', distractors: ['him', 'her', 'us', 'them', 'you'] },
        { text: 'in', partOfSpeech: 'preposition', distractors: ['on', 'at', 'up', 'by', 'off'] },
        { text: 'for', partOfSpeech: 'preposition', distractors: ['to', 'with', 'of', 'about', 'from'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'my', 'this', 'that'] },
        { text: 'meeting', partOfSpeech: 'noun', distractors: ['call', 'talk', 'plan', 'report', 'desk'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'will', partOfSpeech: 'modal', translation: { ru: 'буду (про будущее)', uk: 'буду (про майбутнє)', es: 'futuro (auxiliar)' }, example: 'Thanks, I will be there.' },
    { word: 'there', partOfSpeech: 'adverb', translation: { ru: 'там', uk: 'там', es: 'ahí' }, example: 'I will be there on time.' },
    { word: 'count', partOfSpeech: 'verb', translation: { ru: 'считать, включать', uk: 'рахувати, включати', es: 'contar, incluir' }, example: 'Sounds good, count me in.' },
    { word: 'confirm', partOfSpeech: 'verb', translation: { ru: 'подтверждать', uk: 'підтверджувати', es: 'confirmar' }, example: 'I confirm the meeting at three.' },
    { word: 'join', partOfSpeech: 'verb', translation: { ru: 'присоединяться', uk: 'приєднуватися', es: 'unirse' }, example: 'Yes, I will join the call.' },
    { word: 'meeting', partOfSpeech: 'noun', translation: { ru: 'встреча', uk: 'зустріч', es: 'reunión' }, example: 'Count me in for the meeting.' },
  ],
};

export const MITAP_DAY_35: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 35,
  topic: { ru: 'Повторение недели 5: согласовать встречу', uk: 'Повторення тижня 5: узгодити зустріч', es: 'Repaso de la semana 5: acordar una reunión' },
  outcome: {
    ru: 'Ты сможешь предложить время, сравнить варианты, попросить перенос и подтвердить встречу на созвоне.',
    uk: 'Ти зможеш запропонувати час, порівняти варіанти, попросити перенесення та підтвердити зустріч на дзвінку.',
    es: 'Podrás proponer una hora, comparar opciones, pedir un cambio y confirmar la reunión en la llamada.',
  },
  level: 'B1',
  prerequisiteLessons: [14, 13],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Предложи время мягко', uk: 'Запропонуй час м\'яко', es: 'Propón una hora con suavidad' },
      body: {
        ru: 'Когда зовёшь на встречу, скажи will для будущего: «I will send». Так звучит уверенно и по-деловому.',
        uk: 'Коли кличеш на зустріч, скажи will для майбутнього: «I will send». Так звучить упевнено й по-діловому.',
        es: 'Cuando invitas a una reunión, usa will para el futuro: «I will send». Suena seguro y profesional.',
      },
      examples: [
        { en: 'I will send the invite today.', gloss: { ru: 'Я отправлю приглашение сегодня.', uk: 'Я надішлю запрошення сьогодні.', es: 'Enviaré la invitación hoy.' } },
        { en: 'We will meet on Monday morning.', gloss: { ru: 'Мы встретимся в понедельник утром.', uk: 'Ми зустрінемося в понеділок зранку.', es: 'Nos reuniremos el lunes por la mañana.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Сравни два варианта', uk: 'Порівняй два варіанти', es: 'Compara dos opciones' },
      body: {
        ru: 'Чтобы выбрать слот, сравни: «earlier», «later», «better». Добавь -er или слово more для длинных слов.',
        uk: 'Щоб обрати слот, порівняй: «earlier», «later», «better». Додай -er або слово more для довгих слів.',
        es: 'Para elegir un horario, compara: «earlier», «later», «better». Añade -er o la palabra more en palabras largas.',
      },
      examples: [
        { en: 'Tuesday is better than Friday.', gloss: { ru: 'Вторник лучше пятницы.', uk: 'Вівторок кращий за п\'ятницю.', es: 'El martes es mejor que el viernes.' } },
        { en: 'Can we start earlier than noon?', gloss: { ru: 'Можем начать раньше полудня?', uk: 'Можемо почати раніше полудня?', es: '¿Podemos empezar más temprano que el mediodía?' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Попроси и подтверди', uk: 'Попроси й підтверди', es: 'Pide y confirma' },
      body: {
        ru: 'Для вежливой просьбы бери can или could: «Can we move it?». Потом подтверди коротко: «Yes, that works».',
        uk: 'Для ввічливого прохання бери can або could: «Can we move it?». Потім підтверди коротко: «Yes, that works».',
        es: 'Para pedir con cortesía usa can o could: «Can we move it?». Luego confirma corto: «Yes, that works».',
      },
      examples: [
        { en: 'Can we move the call to three?', gloss: { ru: 'Можем перенести звонок на три?', uk: 'Можемо перенести дзвінок на третю?', es: '¿Podemos cambiar la llamada a las tres?' } },
        { en: 'Could you confirm the new time?', gloss: { ru: 'Можешь подтвердить новое время?', uk: 'Можеш підтвердити новий час?', es: '¿Podrías confirmar la nueva hora?' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d35_p1',
      english: 'I will send the meeting invite today.',
      meaning: { ru: 'Я отправлю приглашение на встречу сегодня.', uk: 'Я надішлю запрошення на зустріч сьогодні.', es: 'Enviaré la invitación a la reunión hoy.' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'will — про будущее', uk: 'will — про майбутнє', es: 'will — para el futuro' },
        rule: { ru: 'will значит «сделаю потом». I will send — «я отправлю», действие в будущем.', uk: 'will значить «зроблю потім». I will send — «я надішлю», дія в майбутньому.', es: 'will significa «haré después». I will send — «enviaré», acción futura.' },
        why: { ru: 'На созвоне говоришь, что сделаешь после, — будущее звучит чётко и надёжно.', uk: 'На дзвінку кажеш, що зробиш після, — майбутнє звучить чітко й надійно.', es: 'En la llamada dices qué harás después; el futuro suena claro y fiable.' },
        commonMistake: { ru: 'Не говори «I send today» про план. Нужно will: I will send.', uk: 'Не кажи «I send today» про план. Потрібно will: I will send.', es: 'No digas «I send today» para un plan. Usa will: I will send.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'they', 'we', 'you'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'would'] },
        { text: 'send', partOfSpeech: 'verb', distractors: ['eat', 'drive', 'sleep', 'paint', 'cook'] },
        { text: 'the', partOfSpeech: 'determiner', distractors: ['a', 'my', 'this', 'that', 'each'] },
        { text: 'meeting', partOfSpeech: 'noun', distractors: ['office', 'garden', 'river', 'kitchen', 'window'] },
        { text: 'invite', partOfSpeech: 'noun', distractors: ['agenda', 'note', 'file', 'link', 'plan'] },
        { text: 'today', partOfSpeech: 'adverb', distractors: ['quietly', 'alone', 'twice', 'loudly', 'slowly'] },
      ],
    },
    {
      id: 'mitap_d35_p2',
      english: 'Tuesday is better than Friday for us.',
      meaning: { ru: 'Вторник лучше пятницы для нас.', uk: 'Вівторок кращий за п\'ятницю для нас.', es: 'El martes es mejor que el viernes para nosotros.' },
      constructions: ['comparatives'],
      explanation: {
        title: { ru: 'better than — лучше, чем', uk: 'better than — кращий за', es: 'better than — mejor que' },
        rule: { ru: 'better значит «лучше». A is better than B — «A лучше, чем B».', uk: 'better значить «кращий». A is better than B — «A кращий за B».', es: 'better significa «mejor». A is better than B — «A es mejor que B».' },
        why: { ru: 'Когда выбираешь день для встречи, сравни два — собеседнику сразу ясно.', uk: 'Коли обираєш день для зустрічі, порівняй два — співрозмовнику одразу ясно.', es: 'Al elegir un día para la reunión, compara dos; al otro le queda claro.' },
        commonMistake: { ru: 'Не говори «more better». Просто better than.', uk: 'Не кажи «more better». Просто better than.', es: 'No digas «more better». Solo better than.' },
      },
      words: [
        { text: 'Tuesday', partOfSpeech: 'noun', distractors: ['Monday', 'Sunday', 'weekend', 'morning', 'evening'] },
        { text: 'is', partOfSpeech: 'to-be', distractors: ['are', 'was', 'be', 'am', 'were'] },
        { text: 'better', partOfSpeech: 'adjective', distractors: ['taller', 'redder', 'colder', 'louder', 'heavier'] },
        { text: 'than', partOfSpeech: 'conjunction', distractors: ['then', 'that', 'as', 'so', 'but'] },
        { text: 'Friday', partOfSpeech: 'noun', distractors: ['Thursday', 'Saturday', 'lunch', 'noon', 'week'] },
        { text: 'for', partOfSpeech: 'preposition', distractors: ['with', 'about', 'from', 'near', 'over'] },
        { text: 'us', partOfSpeech: 'pronoun', distractors: ['them', 'him', 'her', 'me', 'you'] },
      ],
    },
    {
      id: 'mitap_d35_p3',
      english: 'Can we start the call earlier?',
      meaning: { ru: 'Можем начать звонок раньше?', uk: 'Можемо почати дзвінок раніше?', es: '¿Podemos empezar la llamada más temprano?' },
      constructions: ['modals', 'comparatives'],
      explanation: {
        title: { ru: 'Can we — вежливый вопрос', uk: 'Can we — ввічливе питання', es: 'Can we — pregunta cortés' },
        rule: { ru: 'Can we значит «можем ли мы». Earlier — «раньше». Вместе: мягкая просьба сдвинуть время.', uk: 'Can we значить «чи можемо ми». Earlier — «раніше». Разом: м\'яке прохання зсунути час.', es: 'Can we significa «¿podemos?». Earlier — «más temprano». Junto: pedir adelantar la hora.' },
        why: { ru: 'Просить перенос лучше вопросом — звучит вежливо, не как приказ.', uk: 'Просити перенесення краще питанням — звучить ввічливо, не як наказ.', es: 'Pedir un cambio con pregunta suena cortés, no como orden.' },
        commonMistake: { ru: 'Не говори «Can we starts». После can бери start без -s.', uk: 'Не кажи «Can we starts». Після can бери start без -s.', es: 'No digas «Can we starts». Tras can usa start sin -s.' },
      },
      words: [
        { text: 'Can', partOfSpeech: 'modal', distractors: ['should', 'must', 'will', 'may', 'would'] },
        { text: 'we', partOfSpeech: 'pronoun', distractors: ['they', 'he', 'she', 'you', 'it'] },
        { text: 'start', partOfSpeech: 'verb', distractors: ['cook', 'drive', 'paint', 'sing', 'read'] },
        { text: 'the', partOfSpeech: 'determiner', distractors: ['a', 'our', 'this', 'that', 'each'] },
        { text: 'call', partOfSpeech: 'noun', distractors: ['book', 'road', 'lunch', 'desk', 'wall'] },
        { text: 'earlier', partOfSpeech: 'adverb', distractors: ['slowly', 'loudly', 'twice', 'alone', 'again'] },
      ],
    },
    {
      id: 'mitap_d35_p4',
      english: 'Could you move the meeting to three?',
      meaning: { ru: 'Можешь перенести встречу на три?', uk: 'Можеш перенести зустріч на третю?', es: '¿Podrías cambiar la reunión a las tres?' },
      constructions: ['modals'],
      explanation: {
        title: { ru: 'Could you — мягкая просьба', uk: 'Could you — м\'яке прохання', es: 'Could you — petición suave' },
        rule: { ru: 'Could you значит «не мог бы ты». Move to three — «перенести на три».', uk: 'Could you значить «чи не міг би ти». Move to three — «перенести на третю».', es: 'Could you significa «¿podrías?». Move to three — «cambiar a las tres».' },
        why: { ru: 'Could вежливее, чем can — хорошо просить коллегу о переносе.', uk: 'Could ввічливіше за can — добре просити колегу про перенесення.', es: 'Could es más cortés que can; ideal para pedir un cambio al colega.' },
        commonMistake: { ru: 'Не говори «Could you to move». После could сразу move.', uk: 'Не кажи «Could you to move». Після could одразу move.', es: 'No digas «Could you to move». Tras could va move directo.' },
      },
      words: [
        { text: 'Could', partOfSpeech: 'modal', distractors: ['can', 'will', 'must', 'may', 'shall'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['they', 'we', 'he', 'she', 'it'] },
        { text: 'move', partOfSpeech: 'verb', distractors: ['paint', 'cook', 'drive', 'read', 'open'] },
        { text: 'the', partOfSpeech: 'determiner', distractors: ['a', 'your', 'this', 'that', 'each'] },
        { text: 'meeting', partOfSpeech: 'noun', distractors: ['garden', 'river', 'kitchen', 'window', 'wall'] },
        { text: 'to', partOfSpeech: 'preposition', distractors: ['at', 'on', 'by', 'for', 'with'] },
        { text: 'three', partOfSpeech: 'determiner', distractors: ['four', 'two', 'five', 'six', 'nine'] },
      ],
    },
    {
      id: 'mitap_d35_p5',
      english: 'We will meet on Monday morning.',
      meaning: { ru: 'Мы встретимся в понедельник утром.', uk: 'Ми зустрінемося в понеділок зранку.', es: 'Nos reuniremos el lunes por la mañana.' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'will meet — встретимся', uk: 'will meet — зустрінемося', es: 'will meet — nos reuniremos' },
        rule: { ru: 'will meet значит «встретимся потом». On Monday — «в понедельник».', uk: 'will meet значить «зустрінемося потім». On Monday — «в понеділок».', es: 'will meet significa «nos reuniremos». On Monday — «el lunes».' },
        why: { ru: 'Так подтверждаешь день встречи — все слышат точное будущее время.', uk: 'Так підтверджуєш день зустрічі — усі чують точний майбутній час.', es: 'Así confirmas el día de la reunión; todos oyen la hora futura exacta.' },
        commonMistake: { ru: 'Не говори «in Monday». С днём недели бери on Monday.', uk: 'Не кажи «in Monday». З днем тижня бери on Monday.', es: 'No digas «in Monday». Con el día de la semana usa on Monday.' },
      },
      words: [
        { text: 'We', partOfSpeech: 'pronoun', distractors: ['they', 'he', 'she', 'you', 'it'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'would'] },
        { text: 'meet', partOfSpeech: 'verb', distractors: ['cook', 'drive', 'paint', 'sleep', 'eat'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['in', 'at', 'by', 'for', 'to'] },
        { text: 'Monday', partOfSpeech: 'noun', distractors: ['Tuesday', 'Sunday', 'weekend', 'week', 'holiday'] },
        { text: 'morning', partOfSpeech: 'noun', distractors: ['window', 'table', 'office', 'garden', 'river'] },
      ],
    },
    {
      id: 'mitap_d35_p6',
      english: 'Yes, that works for me.',
      meaning: { ru: 'Да, мне это подходит.', uk: 'Так, мені це підходить.', es: 'Sí, eso me viene bien.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'that works — это подходит', uk: 'that works — це підходить', es: 'that works — eso me viene bien' },
        rule: { ru: 'that works значит «это подходит». For me — «мне». Короткое согласие.', uk: 'that works значить «це підходить». For me — «мені». Коротка згода.', es: 'that works significa «eso sirve». For me — «a mí». Acuerdo corto.' },
        why: { ru: 'Когда время устроило, подтверди коротко — собеседник сразу понял «да».', uk: 'Коли час влаштував, підтверди коротко — співрозмовник одразу зрозумів «так».', es: 'Cuando la hora te sirve, confirma corto; el otro entiende «sí» al instante.' },
        commonMistake: { ru: 'Не говори «that work». Со словом that бери works.', uk: 'Не кажи «that work». Зі словом that бери works.', es: 'No digas «that work». Con that usa works.' },
      },
      words: [
        { text: 'Yes', partOfSpeech: 'other', distractors: ['Maybe', 'Please', 'Now', 'Today', 'Here'] },
        { text: 'that', partOfSpeech: 'pronoun', distractors: ['this', 'it', 'these', 'those', 'one'] },
        { text: 'works', partOfSpeech: 'verb', distractors: ['fits', 'helps', 'sounds', 'seems', 'goes'] },
        { text: 'for', partOfSpeech: 'preposition', distractors: ['with', 'to', 'at', 'by', 'on'] },
        { text: 'me', partOfSpeech: 'pronoun', distractors: ['us', 'him', 'her', 'them', 'you'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'invite', partOfSpeech: 'noun', translation: { ru: 'приглашение', uk: 'запрошення', es: 'invitación' }, example: 'I will send the meeting invite today.' },
    { word: 'better', partOfSpeech: 'adjective', translation: { ru: 'лучше', uk: 'кращий', es: 'mejor' }, example: 'Tuesday is better than Friday for us.' },
    { word: 'earlier', partOfSpeech: 'adverb', translation: { ru: 'раньше', uk: 'раніше', es: 'más temprano' }, example: 'Can we start the call earlier?' },
    { word: 'move', partOfSpeech: 'verb', translation: { ru: 'перенести', uk: 'перенести', es: 'cambiar' }, example: 'Could you move the meeting to three?' },
    { word: 'meet', partOfSpeech: 'verb', translation: { ru: 'встретиться', uk: 'зустрітися', es: 'reunirse' }, example: 'We will meet on Monday morning.' },
    { word: 'works', partOfSpeech: 'verb', translation: { ru: 'подходит', uk: 'підходить', es: 'viene bien' }, example: 'Yes, that works for me.' },
  ],
};

export const MITAP_DAY_36: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 36,
  topic: { ru: 'Открыть встречу как ведущий', uk: 'Відкрити зустріч як ведучий', es: 'Abrir la reunión como anfitrión' },
  outcome: {
    ru: 'Ты сможешь уверенно открыть рабочий созвон: поприветствовать, сказать, что все собрались, и предложить начать.',
    uk: 'Ти зможеш упевнено відкрити робочий дзвінок: привітати, сказати, що всі зібралися, і запропонувати почати.',
    es: 'Podrás abrir una reunión de trabajo con seguridad: saludar, decir que ya están todos y proponer empezar.',
  },
  level: 'B1',
  prerequisiteLessons: [24, 13],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Скажи спасибо, что пришли', uk: 'Скажи дякую, що прийшли', es: 'Da las gracias por venir' },
      body: {
        ru: 'Открой встречу тёплым словом. Скажи Thanks for joining. Это значит спасибо, что подключились. Дальше можно мягко вести дальше.',
        uk: 'Відкрий зустріч теплим словом. Скажи Thanks for joining. Це значить дякую, що підключилися. Далі можна м\'яко вести.',
        es: 'Abre la reunión con una palabra cálida. Di Thanks for joining. Significa gracias por conectarte. Luego sigues con calma.',
      },
      examples: [
        { en: 'Thanks for joining the call today.', gloss: { ru: 'Спасибо, что подключились к созвону сегодня.', uk: 'Дякую, що підключилися до дзвінка сьогодні.', es: 'Gracias por unirte a la llamada hoy.' } },
        { en: 'Thanks for joining us this morning.', gloss: { ru: 'Спасибо, что подключились к нам сегодня утром.', uk: 'Дякую, що приєдналися до нас сьогодні вранці.', es: 'Gracias por unirte a nosotros esta mañana.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Скажи, что все собрались', uk: 'Скажи, що всі зібралися', es: 'Di que ya están todos' },
      body: {
        ru: 'Проверь, что все на связи. Скажи Everyone has joined now. Слово has показывает, что это уже случилось и видно сейчас.',
        uk: 'Перевір, що всі на зв\'язку. Скажи Everyone has joined now. Слово has показує, що це вже сталося й видно зараз.',
        es: 'Comprueba que ya están todos. Di Everyone has joined now. La palabra has muestra que ya ocurrió y se ve ahora.',
      },
      examples: [
        { en: 'Everyone has joined the meeting now.', gloss: { ru: 'Все уже подключились к встрече.', uk: 'Усі вже підключилися до зустрічі.', es: 'Todos ya se han unido a la reunión.' } },
        { en: 'I think everyone has joined already.', gloss: { ru: 'Думаю, все уже подключились.', uk: 'Думаю, всі вже підключилися.', es: 'Creo que todos ya se han unido.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Предложи начать', uk: 'Запропонуй почати', es: 'Propón empezar' },
      body: {
        ru: 'Теперь мягко веди к делу. Скажи Let us get started. Это значит давайте начнём. Звучит дружелюбно и уверенно.',
        uk: 'Тепер м\'яко веди до справи. Скажи Let us get started. Це значить давайте почнемо. Звучить дружньо й упевнено.',
        es: 'Ahora lleva al tema con calma. Di Let us get started. Significa empecemos. Suena amable y seguro.',
      },
      examples: [
        { en: 'Let us get started with the agenda.', gloss: { ru: 'Давайте начнём с повестки.', uk: 'Давайте почнемо з порядку денного.', es: 'Empecemos con la agenda.' } },
        { en: 'It is ten o\'clock, let us get started.', gloss: { ru: 'Уже десять, давайте начнём.', uk: 'Уже десята, давайте почнемо.', es: 'Ya son las diez, empecemos.' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d36_p1',
      english: 'Thanks for joining the call today.',
      meaning: { ru: 'Спасибо, что подключились к созвону сегодня.', uk: 'Дякую, що підключилися до дзвінка сьогодні.', es: 'Gracias por unirte a la llamada hoy.' },
      constructions: ['gerund'],
      explanation: {
        title: { ru: 'Спасибо за что-то', uk: 'Дякую за щось', es: 'Gracias por algo' },
        rule: { ru: 'После for ставим слово на -ing. joining значит подключение. Thanks for joining — спасибо, что подключились.', uk: 'Після for ставимо слово на -ing. joining значить підключення. Thanks for joining — дякую, що підключилися.', es: 'Tras for ponemos la palabra en -ing. joining es unirse. Thanks for joining es gracias por unirte.' },
        why: { ru: 'Так звучит тепло и вежливо в самом начале встречи.', uk: 'Так звучить тепло й ввічливо на самому початку зустрічі.', es: 'Así suena cálido y cortés justo al inicio de la reunión.' },
        commonMistake: { ru: 'Не говори Thanks for join. После for всегда форма на -ing: joining.', uk: 'Не кажи Thanks for join. Після for завжди форма на -ing: joining.', es: 'No digas Thanks for join. Tras for siempre la forma en -ing: joining.' },
      },
      words: [
        { text: 'Thanks', partOfSpeech: 'noun', distractors: ['Hello', 'Please', 'Sorry', 'Welcome', 'Goodbye'] },
        { text: 'for', partOfSpeech: 'preposition', distractors: ['with', 'about', 'of', 'on', 'at'] },
        { text: 'joining', partOfSpeech: 'verb', distractors: ['calling', 'waiting', 'helping', 'talking', 'writing'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'my', 'this', 'some'] },
        { text: 'call', partOfSpeech: 'noun', distractors: ['email', 'report', 'screen', 'desk', 'plan'] },
        { text: 'today', partOfSpeech: 'adverb', distractors: ['soon', 'later', 'never', 'always', 'maybe'] },
      ],
    },
    {
      id: 'mitap_d36_p2',
      english: 'Everyone has joined the meeting now.',
      meaning: { ru: 'Все уже подключились к встрече.', uk: 'Усі вже підключилися до зустрічі.', es: 'Todos ya se han unido a la reunión.' },
      constructions: ['present-perfect'],
      explanation: {
        title: { ru: 'Это уже случилось', uk: 'Це вже сталося', es: 'Ya ha pasado' },
        rule: { ru: 'has joined значит уже подключился и сейчас тут. Everyone has joined — все уже на связи.', uk: 'has joined значить вже підключився і зараз тут. Everyone has joined — всі вже на зв\'язку.', es: 'has joined significa ya se unió y ahora está. Everyone has joined — todos ya están.' },
        why: { ru: 'Показываешь, что можно начинать: больше никого ждать не надо.', uk: 'Показуєш, що можна починати: більше нікого чекати не треба.', es: 'Muestras que se puede empezar: ya no hay que esperar a nadie.' },
        commonMistake: { ru: 'С everyone бери has, не have: everyone has joined.', uk: 'З everyone бери has, не have: everyone has joined.', es: 'Con everyone usa has, no have: everyone has joined.' },
      },
      words: [
        { text: 'Everyone', partOfSpeech: 'pronoun', distractors: ['Someone', 'Anyone', 'Nobody', 'Everything', 'Anybody'] },
        { text: 'has', partOfSpeech: 'verb', distractors: ['have', 'had', 'is', 'was', 'does'] },
        { text: 'joined', partOfSpeech: 'verb', distractors: ['called', 'waited', 'helped', 'asked', 'moved'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'my', 'this', 'some'] },
        { text: 'meeting', partOfSpeech: 'noun', distractors: ['report', 'screen', 'email', 'desk', 'plan'] },
        { text: 'now', partOfSpeech: 'adverb', distractors: ['soon', 'later', 'never', 'maybe', 'always'] },
      ],
    },
    {
      id: 'mitap_d36_p3',
      english: 'Let us get started with the agenda.',
      meaning: { ru: 'Давайте начнём с повестки.', uk: 'Давайте почнемо з порядку денного.', es: 'Empecemos con la agenda.' },
      constructions: ['imperative'],
      explanation: {
        title: { ru: 'Давайте начнём', uk: 'Давайте почнемо', es: 'Empecemos' },
        rule: { ru: 'Let us значит давайте. get started значит приступим. Вместе — давайте начнём.', uk: 'Let us значить давайте. get started значить приступимо. Разом — давайте почнемо.', es: 'Let us significa vamos a. get started es ponerse en marcha. Juntos: empecemos.' },
        why: { ru: 'Зовёшь команду к делу мягко, как один из всех.', uk: 'Кличеш команду до справи м\'яко, як один з усіх.', es: 'Invitas al equipo al trabajo con calma, como uno más.' },
        commonMistake: { ru: 'Не говори Let us to get. После Let us сразу get, без to.', uk: 'Не кажи Let us to get. Після Let us одразу get, без to.', es: 'No digas Let us to get. Tras Let us va get directo, sin to.' },
      },
      words: [
        { text: 'Let', partOfSpeech: 'verb', distractors: ['Make', 'Help', 'Keep', 'Give', 'Show'] },
        { text: 'us', partOfSpeech: 'pronoun', distractors: ['them', 'him', 'her', 'me', 'you'] },
        { text: 'get', partOfSpeech: 'verb', distractors: ['go', 'come', 'take', 'keep', 'make'] },
        { text: 'started', partOfSpeech: 'verb', distractors: ['finished', 'stopped', 'closed', 'ended', 'paused'] },
        { text: 'with', partOfSpeech: 'preposition', distractors: ['for', 'about', 'on', 'at', 'of'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'my', 'this', 'some'] },
        { text: 'agenda', partOfSpeech: 'noun', distractors: ['report', 'screen', 'desk', 'budget', 'email'] },
      ],
    },
    {
      id: 'mitap_d36_p4',
      english: 'I will share the agenda with everyone.',
      meaning: { ru: 'Я покажу повестку всем.', uk: 'Я покажу порядок денний усім.', es: 'Compartiré la agenda con todos.' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'Я сделаю это сейчас', uk: 'Я зроблю це зараз', es: 'Lo haré ahora' },
        rule: { ru: 'I will значит я сейчас сделаю. share значит показать всем. I will share — я покажу.', uk: 'I will значить я зараз зроблю. share значить показати всім. I will share — я покажу.', es: 'I will es lo haré. share es mostrar a todos. I will share — lo compartiré.' },
        why: { ru: 'Сразу говоришь, что покажешь план встречи, и ведёшь дальше.', uk: 'Одразу кажеш, що покажеш план зустрічі, і ведеш далі.', es: 'Dices enseguida que mostrarás el plan y guías la reunión.' },
        commonMistake: { ru: 'После will бери share, без to: I will share.', uk: 'Після will бери share, без to: I will share.', es: 'Tras will usa share, sin to: I will share.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['We', 'You', 'They', 'He', 'She'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'may', 'must', 'should', 'would'] },
        { text: 'share', partOfSpeech: 'verb', distractors: ['close', 'keep', 'read', 'write', 'check'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'my', 'this', 'some'] },
        { text: 'agenda', partOfSpeech: 'noun', distractors: ['report', 'screen', 'desk', 'budget', 'email'] },
        { text: 'with', partOfSpeech: 'preposition', distractors: ['for', 'about', 'on', 'at', 'of'] },
        { text: 'everyone', partOfSpeech: 'pronoun', distractors: ['someone', 'anyone', 'nobody', 'anybody', 'nothing'] },
      ],
    },
    {
      id: 'mitap_d36_p5',
      english: 'We have only thirty minutes today.',
      meaning: { ru: 'У нас сегодня только тридцать минут.', uk: 'У нас сьогодні лише тридцять хвилин.', es: 'Hoy tenemos solo treinta minutos.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'Сколько времени у нас есть', uk: 'Скільки часу в нас є', es: 'Cuánto tiempo tenemos' },
        rule: { ru: 'have тут значит есть в наличии. We have thirty minutes — у нас тридцать минут.', uk: 'have тут значить є в наявності. We have thirty minutes — у нас тридцять хвилин.', es: 'have aquí es tener disponible. We have thirty minutes — tenemos treinta minutos.' },
        why: { ru: 'Сразу задаёшь рамки времени, чтобы встреча шла бодро.', uk: 'Одразу задаєш рамки часу, щоб зустріч ішла бадьоро.', es: 'Marcas el límite de tiempo para que la reunión vaya ágil.' },
        commonMistake: { ru: 'С we бери have, не has: we have thirty minutes.', uk: 'З we бери have, не has: we have thirty minutes.', es: 'Con we usa have, no has: we have thirty minutes.' },
      },
      words: [
        { text: 'We', partOfSpeech: 'pronoun', distractors: ['They', 'You', 'He', 'She', 'It'] },
        { text: 'have', partOfSpeech: 'verb', distractors: ['has', 'had', 'are', 'were', 'do'] },
        { text: 'only', partOfSpeech: 'adverb', distractors: ['soon', 'later', 'never', 'maybe', 'almost'] },
        { text: 'thirty', partOfSpeech: 'determiner', distractors: ['twenty', 'forty', 'fifty', 'sixty', 'ninety'] },
        { text: 'minutes', partOfSpeech: 'noun', distractors: ['reports', 'screens', 'desks', 'emails', 'plans'] },
        { text: 'today', partOfSpeech: 'adverb', distractors: ['soon', 'later', 'never', 'always', 'maybe'] },
      ],
    },
    {
      id: 'mitap_d36_p6',
      english: 'Please turn on your cameras now.',
      meaning: { ru: 'Пожалуйста, включите камеры сейчас.', uk: 'Будь ласка, увімкніть камери зараз.', es: 'Por favor, enciendan las cámaras ahora.' },
      constructions: ['imperative', 'phrasal-verbs'],
      explanation: {
        title: { ru: 'Мягкая просьба к команде', uk: 'М\'яке прохання до команди', es: 'Una petición amable al equipo' },
        rule: { ru: 'turn on значит включить. Please turn on делает просьбу мягкой и вежливой.', uk: 'turn on значить увімкнути. Please turn on робить прохання м\'яким і ввічливим.', es: 'turn on es encender. Please turn on hace la petición suave y cortés.' },
        why: { ru: 'Просишь включить камеры, чтобы встреча была живее и теплее.', uk: 'Просиш увімкнути камери, щоб зустріч була живішою й теплішою.', es: 'Pides encender las cámaras para que la reunión sea más cercana.' },
        commonMistake: { ru: 'Не говори turn your cameras on off. Здесь нужно on: turn on.', uk: 'Не кажи turn your cameras off. Тут потрібне on: turn on.', es: 'No digas turn your cameras off. Aquí va on: turn on.' },
      },
      words: [
        { text: 'Please', partOfSpeech: 'adverb', distractors: ['Maybe', 'Soon', 'Now', 'Today', 'Never'] },
        { text: 'turn', partOfSpeech: 'verb', distractors: ['keep', 'hold', 'take', 'push', 'pull'] },
        { text: 'on', partOfSpeech: 'adverb', distractors: ['off', 'up', 'down', 'out', 'over'] },
        { text: 'your', partOfSpeech: 'pronoun', distractors: ['my', 'his', 'her', 'our', 'their'] },
        { text: 'cameras', partOfSpeech: 'noun', distractors: ['reports', 'screens', 'desks', 'emails', 'plans'] },
        { text: 'now', partOfSpeech: 'adverb', distractors: ['soon', 'later', 'never', 'maybe', 'always'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'joining', partOfSpeech: 'verb', translation: { ru: 'подключение, присоединение', uk: 'підключення, приєднання', es: 'unirse' }, example: 'Thanks for joining the call today.' },
    { word: 'joined', partOfSpeech: 'verb', translation: { ru: 'уже подключился', uk: 'вже підключився', es: 'se ha unido' }, example: 'Everyone has joined the meeting now.' },
    { word: 'started', partOfSpeech: 'verb', translation: { ru: 'начать, приступить', uk: 'почати, приступити', es: 'empezar' }, example: 'Let us get started with the agenda.' },
    { word: 'agenda', partOfSpeech: 'noun', translation: { ru: 'повестка встречи', uk: 'порядок денний', es: 'agenda' }, example: 'I will share the agenda with everyone.' },
    { word: 'minutes', partOfSpeech: 'noun', translation: { ru: 'минуты', uk: 'хвилини', es: 'minutos' }, example: 'We have only thirty minutes today.' },
    { word: 'cameras', partOfSpeech: 'noun', translation: { ru: 'включить', uk: 'увімкнути', es: 'encender' }, example: 'Please turn on your cameras now.' },
  ],
};

export const MITAP_DAY_37: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 37,
  topic: { ru: 'Озвучить повестку встречи', uk: 'Озвучити порядок денний зустрічі', es: 'Anunciar la agenda de la reunión' },
  outcome: {
    ru: 'Ты сможешь спокойно открыть встречу и в двух фразах сказать, о чём поговорите.',
    uk: 'Ти зможеш спокійно відкрити зустріч і у двох фразах сказати, про що говоритимете.',
    es: 'Podrás abrir la reunión con calma y decir en dos frases de qué van a hablar.',
  },
  level: 'B1',
  prerequisiteLessons: [13, 22],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Открой встречу одной фразой', uk: 'Відкрий зустріч однією фразою', es: 'Abre la reunión con una frase' },
      body: {
        ru: 'Когда все собрались, скажи коротко, что вы будете делать сегодня. Слово will показывает действие впереди: we will cover — мы разберём.',
        uk: 'Коли всі зібралися, скажи коротко, що ви робитимете сьогодні. Слово will показує дію попереду: we will cover — ми розберемо.',
        es: 'Cuando todos estén, di brevemente qué van a hacer hoy. La palabra will marca lo que viene: we will cover, vamos a tratar.',
      },
      examples: [
        { en: 'Today we will cover three things.', gloss: { ru: 'Сегодня мы разберём три вещи.', uk: 'Сьогодні ми розберемо три речі.', es: 'Hoy trataremos tres cosas.' } },
        { en: 'First, we will look at the numbers.', gloss: { ru: 'Сначала мы посмотрим на цифры.', uk: 'Спочатку ми подивимося на цифри.', es: 'Primero, miraremos los números.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Назови пункты по порядку', uk: 'Назви пункти по порядку', es: 'Nombra los puntos en orden' },
      body: {
        ru: 'Слова first, then, finally помогают вести список. Так люди понимают, где вы сейчас и что будет дальше.',
        uk: 'Слова first, then, finally допомагають вести список. Так люди розуміють, де ви зараз і що буде далі.',
        es: 'Las palabras first, then, finally guían la lista. Así la gente sabe dónde están y qué sigue.',
      },
      examples: [
        { en: 'Then we will talk about the plan.', gloss: { ru: 'Потом мы поговорим о плане.', uk: 'Потім ми поговоримо про план.', es: 'Luego hablaremos del plan.' } },
        { en: 'Finally, we will set the next date.', gloss: { ru: 'В конце мы назначим следующую дату.', uk: 'Наприкінці ми призначимо наступну дату.', es: 'Por último, fijaremos la próxima fecha.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'После "about" ставь слово на -ing', uk: 'Після "about" став слово на -ing', es: 'Después de "about" usa la palabra en -ing' },
      body: {
        ru: 'Когда говоришь, о чём встреча, после about удобно слово-действие на -ing: about planning — о планировании.',
        uk: 'Коли кажеш, про що зустріч, після about зручне слово-дія на -ing: about planning — про планування.',
        es: 'Cuando dices de qué trata, tras about va la acción en -ing: about planning, sobre planificar.',
      },
      examples: [
        { en: 'This meeting is about planning the launch.', gloss: { ru: 'Эта встреча о планировании запуска.', uk: 'Ця зустріч про планування запуску.', es: 'Esta reunión es sobre planificar el lanzamiento.' } },
        { en: 'We will start by checking the budget.', gloss: { ru: 'Мы начнём с проверки бюджета.', uk: 'Ми почнемо з перевірки бюджету.', es: 'Empezaremos revisando el presupuesto.' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d37_p1',
      english: 'Today we will cover three things.',
      meaning: { ru: 'Сегодня мы разберём три вещи.', uk: 'Сьогодні ми розберемо три речі.', es: 'Hoy trataremos tres cosas.' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'will + слово = что будет дальше', uk: 'will + слово = що буде далі', es: 'will + palabra = lo que viene' },
        rule: { ru: 'Ставь will перед словом-действием, чтобы сказать о будущем: will cover — разберём.', uk: 'Став will перед словом-дією, щоб сказати про майбутнє: will cover — розберемо.', es: 'Pon will antes de la acción para hablar del futuro: will cover, trataremos.' },
        why: { ru: 'Так слушатели сразу понимают: это план на сегодня, а не то, что уже было.', uk: 'Так слухачі одразу розуміють: це план на сьогодні, а не те, що вже було.', es: 'Así los oyentes ven que es el plan de hoy, no algo ya pasado.' },
        commonMistake: { ru: 'Не добавляй -s к cover после will. Говори will cover, не will covers.', uk: 'Не додавай -s до cover після will. Кажи will cover, не will covers.', es: 'No añadas -s a cover tras will. Di will cover, no will covers.' },
      },
      words: [
        { text: 'Today', partOfSpeech: 'adverb', distractors: ['Soon', 'Always', 'Maybe', 'Often', 'Slowly'] },
        { text: 'we', partOfSpeech: 'pronoun', distractors: ['they', 'he', 'she', 'you', 'it'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'could'] },
        { text: 'cover', partOfSpeech: 'verb', distractors: ['build', 'drive', 'clean', 'drink', 'write'] },
        { text: 'three', partOfSpeech: 'determiner', distractors: ['five', 'seven', 'nine', 'twelve', 'forty'] },
        { text: 'things', partOfSpeech: 'noun', distractors: ['doors', 'trees', 'apples', 'rivers', 'shoes'] },
      ],
    },
    {
      id: 'mitap_d37_p2',
      english: 'First, we will look at the numbers.',
      meaning: { ru: 'Сначала мы посмотрим на цифры.', uk: 'Спочатку ми подивимося на цифри.', es: 'Primero, miraremos los números.' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'First открывает список', uk: 'First відкриває список', es: 'First abre la lista' },
        rule: { ru: 'Начни пункт со слова First, чтобы показать: это первый шаг встречи.', uk: 'Почни пункт зі слова First, щоб показати: це перший крок зустрічі.', es: 'Empieza el punto con First para mostrar que es el primer paso.' },
        why: { ru: 'Список по порядку держит встречу в русле, и никто не теряется.', uk: 'Список по порядку тримає зустріч у руслі, і ніхто не губиться.', es: 'Una lista ordenada mantiene la reunión clara y nadie se pierde.' },
        commonMistake: { ru: 'После look ставь at: look at the numbers, а не look the numbers.', uk: 'Після look став at: look at the numbers, а не look the numbers.', es: 'Tras look pon at: look at the numbers, no look the numbers.' },
      },
      words: [
        { text: 'First', partOfSpeech: 'adverb', distractors: ['Quickly', 'Loudly', 'Maybe', 'Almost', 'Together'] },
        { text: 'we', partOfSpeech: 'pronoun', distractors: ['they', 'he', 'she', 'you', 'it'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'could'] },
        { text: 'look', partOfSpeech: 'verb', distractors: ['jump', 'cook', 'sleep', 'sing', 'paint'] },
        { text: 'at', partOfSpeech: 'preposition', distractors: ['off', 'into', 'under', 'across', 'behind'] },
        { text: 'numbers', partOfSpeech: 'noun', distractors: ['windows', 'gardens', 'bottles', 'clouds', 'stones'] },
      ],
    },
    {
      id: 'mitap_d37_p3',
      english: 'Then we will talk about the plan.',
      meaning: { ru: 'Потом мы поговорим о плане.', uk: 'Потім ми поговоримо про план.', es: 'Luego hablaremos del plan.' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'Then = следующий шаг', uk: 'Then = наступний крок', es: 'Then = el siguiente paso' },
        rule: { ru: 'Слово Then соединяет пункты: после первого идёт второй. Then — потом.', uk: 'Слово Then з\'єднує пункти: після першого йде другий. Then — потім.', es: 'La palabra Then une los puntos: tras el primero viene el segundo. Then, luego.' },
        why: { ru: 'Так люди слышат, что встреча движется, и спокойно ждут своей темы.', uk: 'Так люди чують, що зустріч рухається, і спокійно чекають своєї теми.', es: 'Así la gente nota que la reunión avanza y espera su tema tranquila.' },
        commonMistake: { ru: 'После talk нужно about: talk about the plan, не talk the plan.', uk: 'Після talk потрібне about: talk about the plan, не talk the plan.', es: 'Tras talk va about: talk about the plan, no talk the plan.' },
      },
      words: [
        { text: 'Then', partOfSpeech: 'adverb', distractors: ['Maybe', 'Almost', 'Really', 'Quite', 'Hardly'] },
        { text: 'we', partOfSpeech: 'pronoun', distractors: ['they', 'he', 'she', 'you', 'it'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'could'] },
        { text: 'talk', partOfSpeech: 'verb', distractors: ['walk', 'cook', 'dance', 'swim', 'read'] },
        { text: 'about', partOfSpeech: 'preposition', distractors: ['under', 'near', 'across', 'beyond', 'onto'] },
        { text: 'plan', partOfSpeech: 'noun', distractors: ['chair', 'bridge', 'ticket', 'garden', 'spoon'] },
      ],
    },
    {
      id: 'mitap_d37_p4',
      english: 'This meeting is about planning the launch.',
      meaning: { ru: 'Эта встреча о планировании запуска.', uk: 'Ця зустріч про планування запуску.', es: 'Esta reunión es sobre planificar el lanzamiento.' },
      constructions: ['gerund'],
      explanation: {
        title: { ru: 'После about — слово на -ing', uk: 'Після about — слово на -ing', es: 'Tras about, palabra en -ing' },
        rule: { ru: 'После about слово-действие берёт -ing: plan становится planning — планирование.', uk: 'Після about слово-дія бере -ing: plan стає planning — планування.', es: 'Tras about la acción toma -ing: plan se vuelve planning, planificar.' },
        why: { ru: 'Так одной фразой ясно, ради чего вся встреча, без долгих объяснений.', uk: 'Так однією фразою ясно, заради чого вся зустріч, без довгих пояснень.', es: 'Así una frase deja claro el porqué de la reunión, sin rodeos.' },
        commonMistake: { ru: 'Не говори about plan. После about ставь planning с -ing.', uk: 'Не кажи about plan. Після about став planning з -ing.', es: 'No digas about plan. Tras about usa planning con -ing.' },
      },
      words: [
        { text: 'This', partOfSpeech: 'determiner', distractors: ['Each', 'Every', 'Some', 'Any', 'These'] },
        { text: 'meeting', partOfSpeech: 'noun', distractors: ['kitchen', 'forest', 'ticket', 'jacket', 'window'] },
        { text: 'is', partOfSpeech: 'to-be', distractors: ['are', 'was', 'were', 'am', 'be'] },
        { text: 'about', partOfSpeech: 'preposition', distractors: ['under', 'near', 'across', 'beyond', 'onto'] },
        { text: 'planning', partOfSpeech: 'verb', distractors: ['cooking', 'running', 'singing', 'driving', 'reading'] },
        { text: 'launch', partOfSpeech: 'noun', distractors: ['garden', 'bridge', 'spoon', 'jacket', 'river'] },
      ],
    },
    {
      id: 'mitap_d37_p5',
      english: 'We will start by checking the budget.',
      meaning: { ru: 'Мы начнём с проверки бюджета.', uk: 'Ми почнемо з перевірки бюджету.', es: 'Empezaremos revisando el presupuesto.' },
      constructions: ['gerund', 'future-simple'],
      explanation: {
        title: { ru: 'start by + слово на -ing', uk: 'start by + слово на -ing', es: 'start by + palabra en -ing' },
        rule: { ru: 'После by слово-действие берёт -ing: check становится checking — проверка.', uk: 'Після by слово-дія бере -ing: check стає checking — перевірка.', es: 'Tras by la acción toma -ing: check pasa a checking, revisar.' },
        why: { ru: 'Так ты сразу называешь первый шаг и задаёшь чёткий старт встрече.', uk: 'Так ти одразу називаєш перший крок і задаєш чіткий старт зустрічі.', es: 'Así nombras el primer paso y le das un inicio claro a la reunión.' },
        commonMistake: { ru: 'Не говори start by check. После by ставь checking с -ing.', uk: 'Не кажи start by check. Після by став checking з -ing.', es: 'No digas start by check. Tras by usa checking con -ing.' },
      },
      words: [
        { text: 'We', partOfSpeech: 'pronoun', distractors: ['They', 'He', 'She', 'You', 'It'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'could'] },
        { text: 'start', partOfSpeech: 'verb', distractors: ['clean', 'drive', 'cook', 'paint', 'sleep'] },
        { text: 'by', partOfSpeech: 'preposition', distractors: ['under', 'near', 'across', 'beyond', 'onto'] },
        { text: 'checking', partOfSpeech: 'verb', distractors: ['cooking', 'running', 'singing', 'driving', 'reading'] },
        { text: 'budget', partOfSpeech: 'noun', distractors: ['garden', 'bridge', 'spoon', 'jacket', 'river'] },
      ],
    },
    {
      id: 'mitap_d37_p6',
      english: 'Finally, we will set the next date.',
      meaning: { ru: 'В конце мы назначим следующую дату.', uk: 'Наприкінці ми призначимо наступну дату.', es: 'Por último, fijaremos la próxima fecha.' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'Finally закрывает список', uk: 'Finally закриває список', es: 'Finally cierra la lista' },
        rule: { ru: 'Слово Finally говорит: это последний пункт. Finally — в конце.', uk: 'Слово Finally каже: це останній пункт. Finally — наприкінці.', es: 'La palabra Finally dice: este es el último punto. Finally, por último.' },
        why: { ru: 'Люди слышат, что встреча подходит к концу, и собираются с мыслями.', uk: 'Люди чують, що зустріч добігає кінця, і збираються з думками.', es: 'La gente nota que la reunión acaba y reúne sus ideas.' },
        commonMistake: { ru: 'Говори the next date, не next date. Маленькое the нужно перед словом.', uk: 'Кажи the next date, не next date. Маленьке the потрібне перед словом.', es: 'Di the next date, no next date. El pequeño the va antes.' },
      },
      words: [
        { text: 'Finally', partOfSpeech: 'adverb', distractors: ['Quickly', 'Loudly', 'Maybe', 'Almost', 'Hardly'] },
        { text: 'we', partOfSpeech: 'pronoun', distractors: ['they', 'he', 'she', 'you', 'it'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'could'] },
        { text: 'set', partOfSpeech: 'verb', distractors: ['cook', 'drive', 'clean', 'sing', 'read'] },
        { text: 'next', partOfSpeech: 'adjective', distractors: ['heavy', 'silent', 'empty', 'loud', 'sharp'] },
        { text: 'date', partOfSpeech: 'noun', distractors: ['garden', 'bridge', 'spoon', 'jacket', 'river'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'cover', partOfSpeech: 'verb', translation: { ru: 'разобрать (тему)', uk: 'розглянути (тему)', es: 'tratar (un tema)' }, example: 'Today we will cover three things.' },
    { word: 'look', partOfSpeech: 'verb', translation: { ru: 'посмотреть', uk: 'подивитися', es: 'mirar' }, example: 'First, we will look at the numbers.' },
    { word: 'talk', partOfSpeech: 'verb', translation: { ru: 'поговорить', uk: 'поговорити', es: 'hablar' }, example: 'Then we will talk about the plan.' },
    { word: 'planning', partOfSpeech: 'noun', translation: { ru: 'планирование', uk: 'планування', es: 'planificación' }, example: 'This meeting is about planning the launch.' },
    { word: 'checking', partOfSpeech: 'noun', translation: { ru: 'проверка', uk: 'перевірка', es: 'revisión' }, example: 'We will start by checking the budget.' },
    { word: 'date', partOfSpeech: 'noun', translation: { ru: 'дата', uk: 'дата', es: 'fecha' }, example: 'Finally, we will set the next date.' },
  ],
};

export const MITAP_DAY_38: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 38,
  topic: { ru: 'Назначить тайминг пунктов', uk: 'Призначити час пунктів', es: 'Asignar tiempo a los puntos' },
  outcome: {
    ru: 'Ты сможешь сказать, сколько минут вы потратите на каждый пункт встречи, и держать обсуждение в рамках времени.',
    uk: 'Ти зможеш сказати, скільки хвилин ви витратите на кожен пункт зустрічі, і тримати обговорення в межах часу.',
    es: 'Podrás decir cuántos minutos dedicaréis a cada punto de la reunión y mantener la conversación dentro del tiempo.',
  },
  level: 'B1',
  prerequisiteLessons: [13, 8],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Скажи, сколько времени дашь на пункт', uk: 'Скажи, скільки часу даси на пункт', es: 'Di cuánto tiempo darás a un punto' },
      body: {
        ru: 'Чтобы поставить тайминг, скажи We will spend (потратим) плюс число минут. Это про будущее: ты решаешь сейчас, что будет дальше.',
        uk: 'Щоб поставити час, скажи We will spend (витратимо) плюс число хвилин. Це про майбутнє: ти вирішуєш зараз, що буде далі.',
        es: 'Para poner el tiempo, di We will spend (dedicaremos) más un número de minutos. Es sobre el futuro: decides ahora lo que pasará.',
      },
      examples: [
        { en: 'We will spend ten minutes on this point.', gloss: { ru: 'Мы потратим десять минут на этот пункт.', uk: 'Ми витратимо десять хвилин на цей пункт.', es: 'Dedicaremos diez minutos a este punto.' } },
        { en: 'We will start at three o\'clock.', gloss: { ru: 'Мы начнём в три часа.', uk: 'Ми почнемо о третій годині.', es: 'Empezaremos a las tres en punto.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Спроси, сколько минут у вас есть', uk: 'Спитай, скільки хвилин у вас є', es: 'Pregunta cuántos minutos tenéis' },
      body: {
        ru: 'Хочешь узнать лимит времени? Спроси How many minutes will we spend (сколько минут потратим). Так ты держишь встречу в графике.',
        uk: 'Хочеш дізнатися ліміт часу? Спитай How many minutes will we spend (скільки хвилин витратимо). Так ти тримаєш зустріч у графіку.',
        es: '¿Quieres saber el límite de tiempo? Pregunta How many minutes will we spend (cuántos minutos dedicaremos). Así mantienes la reunión a tiempo.',
      },
      examples: [
        { en: 'How many minutes will we spend here?', gloss: { ru: 'Сколько минут мы потратим здесь?', uk: 'Скільки хвилин ми витратимо тут?', es: '¿Cuántos minutos dedicaremos aquí?' } },
        { en: 'When will we finish the call?', gloss: { ru: 'Когда мы закончим созвон?', uk: 'Коли ми закінчимо дзвінок?', es: '¿Cuándo terminaremos la llamada?' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Привяжи пункт ко времени', uk: 'Прив\'яжи пункт до часу', es: 'Ata el punto a una hora' },
      body: {
        ru: 'Чтобы сказать, к какому времени, ставь at перед часом и in перед минутами. At three, in ten minutes. Маленькие слова времени.',
        uk: 'Щоб сказати, до якого часу, став at перед годиною й in перед хвилинами. At three, in ten minutes. Маленькі слова часу.',
        es: 'Para decir a qué hora, pon at antes de la hora e in antes de los minutos. At three, in ten minutes. Pequeñas palabras de tiempo.',
      },
      examples: [
        { en: 'We will move on in five minutes.', gloss: { ru: 'Мы перейдём дальше через пять минут.', uk: 'Ми перейдемо далі через п\'ять хвилин.', es: 'Seguiremos adelante en cinco minutos.' } },
        { en: 'The meeting will end at four.', gloss: { ru: 'Встреча закончится в четыре.', uk: 'Зустріч закінчиться о четвертій.', es: 'La reunión terminará a las cuatro.' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d38_p1',
      english: 'Let us spend ten minutes on this.',
      meaning: { ru: 'Давай потратим десять минут на это.', uk: 'Давай витратимо десять хвилин на це.', es: 'Dediquemos diez minutos a esto.' },
      constructions: ['imperative'],
      explanation: {
        title: { ru: 'Let us — давай предложим вместе', uk: 'Let us — давай запропонуємо разом', es: 'Let us — propongamos juntos' },
        rule: { ru: 'Let us зовёт сделать что-то вместе. Спокойно ставит тайминг для всей группы. Let us spend значит давай потратим.', uk: 'Let us кличе зробити щось разом. Спокійно ставить час для всієї групи. Let us spend значить давай витратимо.', es: 'Let us invita a hacer algo juntos. Pone el tiempo con calma para todo el grupo. Let us spend significa dediquemos.' },
        why: { ru: 'Так предложение звучит мягко и командно, без приказа. Удобно начать обсуждение пункта.', uk: 'Так пропозиція звучить м\'яко й командно, без наказу. Зручно почати обговорення пункту.', es: 'Así la propuesta suena suave y de equipo, sin orden. Cómodo para abrir un punto.' },
        commonMistake: { ru: 'Не говори Let us to spend. После Let us идёт чистое spend, без to.', uk: 'Не кажи Let us to spend. Після Let us іде чисте spend, без to.', es: 'No digas Let us to spend. Tras Let us va spend solo, sin to.' },
      },
      words: [
        { text: 'Let', partOfSpeech: 'verb', distractors: ['Make', 'Help', 'Watch', 'Keep', 'See'] },
        { text: 'us', partOfSpeech: 'pronoun', distractors: ['them', 'him', 'her', 'you', 'we'] },
        { text: 'spend', partOfSpeech: 'verb', distractors: ['save', 'count', 'hold', 'keep', 'fill'] },
        { text: 'ten', partOfSpeech: 'determiner', distractors: ['nine', 'four', 'seven', 'twelve', 'fifty'] },
        { text: 'minutes', partOfSpeech: 'noun', distractors: ['hours', 'seconds', 'weeks', 'points', 'topics'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['at', 'in', 'by', 'of', 'to'] },
        { text: 'this', partOfSpeech: 'pronoun', distractors: ['that', 'it', 'them', 'one', 'each'] },
      ],
    },
    {
      id: 'mitap_d38_p2',
      english: 'We will spend five minutes on this point.',
      meaning: { ru: 'Мы потратим пять минут на этот пункт.', uk: 'Ми витратимо п\'ять хвилин на цей пункт.', es: 'Dedicaremos cinco minutos a este punto.' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'will spend — потратим в будущем', uk: 'will spend — витратимо в майбутньому', es: 'will spend — dedicaremos en el futuro' },
        rule: { ru: 'will показывает будущее. We will spend значит мы потратим. Ты заранее называешь лимит времени на пункт.', uk: 'will показує майбутнє. We will spend значить ми витратимо. Ти заздалегідь називаєш ліміт часу на пункт.', es: 'will marca el futuro. We will spend significa dedicaremos. Anuncias de antemano el límite de tiempo del punto.' },
        why: { ru: 'Группа сразу понимает план: пять минут и идём дальше. Встреча держится в графике.', uk: 'Група одразу розуміє план: п\'ять хвилин і йдемо далі. Зустріч тримається у графіку.', es: 'El grupo entiende el plan: cinco minutos y seguimos. La reunión va a tiempo.' },
        commonMistake: { ru: 'Не добавляй s: говори will spend, а не will spends. После will всегда чистое слово.', uk: 'Не додавай s: кажи will spend, а не will spends. Після will завжди чисте слово.', es: 'No añadas s: di will spend, no will spends. Tras will va la palabra sola.' },
      },
      words: [
        { text: 'We', partOfSpeech: 'pronoun', distractors: ['They', 'She', 'He', 'It', 'You'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'could'] },
        { text: 'spend', partOfSpeech: 'verb', distractors: ['save', 'count', 'hold', 'reach', 'fill'] },
        { text: 'five', partOfSpeech: 'determiner', distractors: ['six', 'eight', 'three', 'twenty', 'forty'] },
        { text: 'minutes', partOfSpeech: 'noun', distractors: ['hours', 'seconds', 'weeks', 'slides', 'tasks'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['at', 'in', 'by', 'of', 'to'] },
        { text: 'this', partOfSpeech: 'pronoun', distractors: ['that', 'each', 'one', 'both', 'such'] },
        { text: 'point', partOfSpeech: 'noun', distractors: ['plan', 'goal', 'rule', 'page', 'week'] },
      ],
    },
    {
      id: 'mitap_d38_p3',
      english: 'How many minutes will we spend here?',
      meaning: { ru: 'Сколько минут мы потратим здесь?', uk: 'Скільки хвилин ми витратимо тут?', es: '¿Cuántos minutos dedicaremos aquí?' },
      constructions: ['future-simple', 'wh-questions'],
      explanation: {
        title: { ru: 'How many — спроси про количество', uk: 'How many — спитай про кількість', es: 'How many — pregunta por la cantidad' },
        rule: { ru: 'How many спрашивает сколько штук. How many minutes значит сколько минут. Дальше will we spend узнаёт лимит времени.', uk: 'How many питає скільки штук. How many minutes значить скільки хвилин. Далі will we spend дізнається ліміт часу.', es: 'How many pregunta cuántos. How many minutes significa cuántos minutos. Luego will we spend pide el límite.' },
        why: { ru: 'Так ты уточняешь тайминг до начала и держишь встречу под контролем.', uk: 'Так ти уточнюєш час до початку й тримаєш зустріч під контролем.', es: 'Así aclaras el tiempo antes de empezar y mantienes la reunión bajo control.' },
        commonMistake: { ru: 'В вопросе will идёт перед we: will we spend. Не говори we will spend в вопросе.', uk: 'У питанні will іде перед we: will we spend. Не кажи we will spend у питанні.', es: 'En la pregunta will va antes de we: will we spend. No digas we will spend.' },
      },
      words: [
        { text: 'How', partOfSpeech: 'adverb', distractors: ['When', 'Where', 'Why', 'Who', 'Which'] },
        { text: 'many', partOfSpeech: 'determiner', distractors: ['much', 'more', 'few', 'most', 'some'] },
        { text: 'minutes', partOfSpeech: 'noun', distractors: ['hours', 'seconds', 'points', 'slides', 'tasks'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'could'] },
        { text: 'we', partOfSpeech: 'pronoun', distractors: ['they', 'she', 'he', 'it', 'you'] },
        { text: 'spend', partOfSpeech: 'verb', distractors: ['save', 'count', 'hold', 'reach', 'fill'] },
        { text: 'here', partOfSpeech: 'adverb', distractors: ['there', 'now', 'soon', 'today', 'late'] },
      ],
    },
    {
      id: 'mitap_d38_p4',
      english: 'We will move on in ten minutes.',
      meaning: { ru: 'Мы перейдём дальше через десять минут.', uk: 'Ми перейдемо далі через десять хвилин.', es: 'Seguiremos adelante en diez minutos.' },
      constructions: ['future-simple', 'prepositions-time'],
      explanation: {
        title: { ru: 'in — через сколько времени', uk: 'in — через скільки часу', es: 'in — dentro de cuánto tiempo' },
        rule: { ru: 'in перед минутами значит через. In ten minutes значит через десять минут. Move on значит идти к следующему пункту.', uk: 'in перед хвилинами значить через. In ten minutes значить через десять хвилин. Move on значить іти до наступного пункту.', es: 'in antes de los minutos significa dentro de. In ten minutes significa en diez minutos. Move on es pasar al siguiente punto.' },
        why: { ru: 'Ты честно предупреждаешь, когда закроешь пункт. Никто не теряет нить обсуждения.', uk: 'Ти чесно попереджаєш, коли закриєш пункт. Ніхто не втрачає нитку обговорення.', es: 'Avisas con claridad cuándo cerrarás el punto. Nadie pierde el hilo.' },
        commonMistake: { ru: 'Для срока через ставь in, не after. Скажи in ten minutes, а не after ten minutes.', uk: 'Для строку через став in, не after. Скажи in ten minutes, а не after ten minutes.', es: 'Para el plazo usa in, no after. Di in ten minutes, no after ten minutes.' },
      },
      words: [
        { text: 'We', partOfSpeech: 'pronoun', distractors: ['They', 'She', 'He', 'It', 'You'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'could'] },
        { text: 'move', partOfSpeech: 'verb', distractors: ['go', 'run', 'pass', 'step', 'turn'] },
        { text: 'on', partOfSpeech: 'phrasal_particle', distractors: ['up', 'off', 'out', 'over', 'along'] },
        { text: 'in', partOfSpeech: 'preposition', distractors: ['at', 'on', 'by', 'of', 'to'] },
        { text: 'ten', partOfSpeech: 'determiner', distractors: ['nine', 'four', 'seven', 'twelve', 'fifty'] },
        { text: 'minutes', partOfSpeech: 'noun', distractors: ['hours', 'seconds', 'weeks', 'points', 'slides'] },
      ],
    },
    {
      id: 'mitap_d38_p5',
      english: 'The meeting will start at three.',
      meaning: { ru: 'Встреча начнётся в три.', uk: 'Зустріч почнеться о третій.', es: 'La reunión empezará a las tres.' },
      constructions: ['future-simple', 'prepositions-time'],
      explanation: {
        title: { ru: 'at — точное время на часах', uk: 'at — точний час на годиннику', es: 'at — la hora exacta del reloj' },
        rule: { ru: 'at перед часом значит в. At three значит в три. will start значит начнётся в будущем.', uk: 'at перед годиною значить о. At three значить о третій. will start значить почнеться в майбутньому.', es: 'at antes de la hora significa a las. At three significa a las tres. will start es empezará.' },
        why: { ru: 'Точное время на часах помогает всем подключиться вовремя и не ждать.', uk: 'Точний час на годиннику допомагає всім підключитися вчасно й не чекати.', es: 'La hora exacta ayuda a todos a conectarse a tiempo y no esperar.' },
        commonMistake: { ru: 'Для часа на часах ставь at, не in. Скажи at three, а не in three.', uk: 'Для години на годиннику став at, не in. Скажи at three, а не in three.', es: 'Para la hora del reloj usa at, no in. Di at three, no in three.' },
      },
      words: [
        { text: 'The', partOfSpeech: 'article', distractors: ['A', 'An', 'This', 'That', 'Some'] },
        { text: 'meeting', partOfSpeech: 'noun', distractors: ['call', 'report', 'plan', 'topic', 'break'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'could'] },
        { text: 'start', partOfSpeech: 'verb', distractors: ['run', 'wait', 'call', 'meet', 'plan'] },
        { text: 'at', partOfSpeech: 'preposition', distractors: ['in', 'on', 'by', 'of', 'to'] },
        { text: 'three', partOfSpeech: 'determiner', distractors: ['four', 'six', 'eight', 'ten', 'twenty'] },
      ],
    },
    {
      id: 'mitap_d38_p6',
      english: 'We will keep this part short.',
      meaning: { ru: 'Мы сделаем эту часть короткой.', uk: 'Ми зробимо цю частину короткою.', es: 'Haremos esta parte breve.' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'keep short — держать коротко', uk: 'keep short — тримати коротко', es: 'keep short — mantener breve' },
        rule: { ru: 'keep short значит держать коротким. We will keep short обещает не растягивать. Удобно для длинной встречи.', uk: 'keep short значить тримати коротким. We will keep short обіцяє не розтягувати. Зручно для довгої зустрічі.', es: 'keep short significa mantener breve. We will keep short promete no alargar. Útil en una reunión larga.' },
        why: { ru: 'Команда видит, что ты бережёшь их время. Доверие к ведущему растёт.', uk: 'Команда бачить, що ти бережеш їхній час. Довіра до ведучого зростає.', es: 'El equipo ve que cuidas su tiempo. La confianza en quien dirige crece.' },
        commonMistake: { ru: 'Слово short идёт без ly. Скажи keep short, а не keep shortly.', uk: 'Слово short іде без ly. Скажи keep short, а не keep shortly.', es: 'La palabra short va sin ly. Di keep short, no keep shortly.' },
      },
      words: [
        { text: 'We', partOfSpeech: 'pronoun', distractors: ['They', 'She', 'He', 'It', 'You'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'could'] },
        { text: 'keep', partOfSpeech: 'verb', distractors: ['hold', 'find', 'turn', 'read', 'open'] },
        { text: 'this', partOfSpeech: 'pronoun', distractors: ['that', 'each', 'one', 'both', 'such'] },
        { text: 'part', partOfSpeech: 'noun', distractors: ['point', 'page', 'step', 'plan', 'week'] },
        { text: 'short', partOfSpeech: 'adjective', distractors: ['small', 'quick', 'light', 'plain', 'clear'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'spend', partOfSpeech: 'verb', translation: { ru: 'тратить', uk: 'витрачати', es: 'dedicar' }, example: 'We will spend five minutes on this point.' },
    { word: 'minutes', partOfSpeech: 'noun', translation: { ru: 'минуты', uk: 'хвилини', es: 'minutos' }, example: 'Let us spend ten minutes on this.' },
    { word: 'point', partOfSpeech: 'noun', translation: { ru: 'пункт', uk: 'пункт', es: 'punto' }, example: 'We will spend five minutes on this point.' },
    { word: 'move', partOfSpeech: 'verb', translation: { ru: 'переходить', uk: 'переходити', es: 'pasar' }, example: 'We will move on in ten minutes.' },
    { word: 'start', partOfSpeech: 'verb', translation: { ru: 'начинать', uk: 'починати', es: 'empezar' }, example: 'The meeting will start at three.' },
    { word: 'short', partOfSpeech: 'adjective', translation: { ru: 'короткий', uk: 'короткий', es: 'breve' }, example: 'We will keep this part short.' },
  ],
};

export const MITAP_DAY_39: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 39,
  topic: { ru: 'Передать слово коллеге', uk: 'Передати слово колезі', es: 'Dar la palabra a un colega' },
  outcome: {
    ru: 'Ты сможешь как ведущий встречи передать слово коллеге: «Over to you, Mark» и «Please go ahead».',
    uk: 'Ти зможеш як ведучий зустрічі передати слово колезі: «Over to you, Mark» і «Please go ahead».',
    es: 'Podrás, como quien dirige la reunión, dar la palabra a un colega: «Over to you, Mark» y «Please go ahead».',
  },
  level: 'B1',
  prerequisiteLessons: [10, 18],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Передай слово: Over to you', uk: 'Передай слово: Over to you', es: 'Da la palabra: Over to you' },
      body: {
        ru: 'Когда хочешь, чтобы дальше говорил коллега, скажи Over to you и его имя. Over to you, Mark = «теперь твоё слово, Марк».',
        uk: 'Коли хочеш, щоб далі говорив колега, скажи Over to you і його ім\'я. Over to you, Mark = «тепер твоє слово, Марку».',
        es: 'Cuando quieres que hable un colega, di Over to you y su nombre. Over to you, Mark = «ahora te toca, Mark».',
      },
      examples: [
        { en: 'Over to you, Mark.', gloss: { ru: 'Теперь твоё слово, Марк.', uk: 'Тепер твоє слово, Марку.', es: 'Ahora te toca, Mark.' } },
        { en: 'Over to you now.', gloss: { ru: 'Теперь твоё слово.', uk: 'Тепер твоє слово.', es: 'Ahora te toca a ti.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Дай старт: Please go ahead', uk: 'Дай старт: Please go ahead', es: 'Da luz verde: Please go ahead' },
      body: {
        ru: 'Go ahead = «давай, говори». Слово Please делает это мягким и вежливым. Please go ahead = «прошу, начинай».',
        uk: 'Go ahead = «давай, говори». Слово Please робить це м\'яким і ввічливим. Please go ahead = «прошу, починай».',
        es: 'Go ahead = «adelante, habla». La palabra Please lo hace suave y cortés. Please go ahead = «por favor, adelante».',
      },
      examples: [
        { en: 'Please go ahead, Sara.', gloss: { ru: 'Прошу, начинай, Сара.', uk: 'Прошу, починай, Саро.', es: 'Por favor, adelante, Sara.' } },
        { en: 'Go ahead, we are listening.', gloss: { ru: 'Давай, мы слушаем.', uk: 'Давай, ми слухаємо.', es: 'Adelante, te escuchamos.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Попроси мягко: Could you', uk: 'Попроси м\'яко: Could you', es: 'Pide con suavidad: Could you' },
      body: {
        ru: 'Could you делает просьбу мягче, чем Can you. Ставь его перед словом-действием: Could you start = «начни, пожалуйста».',
        uk: 'Could you робить прохання м\'якшим, ніж Can you. Став його перед словом-дією: Could you start = «почни, будь ласка».',
        es: 'Could you hace la petición más suave que Can you. Va antes de la acción: Could you start = «¿podrías empezar?».',
      },
      examples: [
        { en: 'Could you take this part?', gloss: { ru: 'Возьмёшь эту часть?', uk: 'Візьмеш цю частину?', es: '¿Podrías tomar esta parte?' } },
        { en: 'Could you start, please?', gloss: { ru: 'Начнёшь, пожалуйста?', uk: 'Почнеш, будь ласка?', es: '¿Podrías empezar, por favor?' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d39_p1',
      english: 'Over to you, Mark.',
      meaning: { ru: 'Теперь твоё слово, Марк.', uk: 'Тепер твоє слово, Марку.', es: 'Ahora te toca, Mark.' },
      constructions: ['imperative'],
      explanation: {
        title: { ru: 'Over to you = твоё слово', uk: 'Over to you = твоє слово', es: 'Over to you = te toca' },
        rule: { ru: 'Over to you передаёт ход другому. Добавь имя: Over to you, Mark — «говори, Марк».', uk: 'Over to you передає хід іншому. Додай ім\'я: Over to you, Mark — «говори, Марку».', es: 'Over to you pasa el turno a otro. Añade el nombre: Over to you, Mark.' },
        why: { ru: 'Так ты вежливо и ясно показываешь, кто теперь говорит на встрече.', uk: 'Так ти ввічливо і ясно показуєш, хто тепер говорить на зустрічі.', es: 'Así muestras con cortesía y claridad quién habla ahora en la reunión.' },
        commonMistake: { ru: 'Говори over to you, не over for you. Здесь нужно слово to.', uk: 'Кажи over to you, не over for you. Тут потрібне слово to.', es: 'Di over to you, no over for you. Aquí va la palabra to.' },
      },
      words: [
        { text: 'Over', partOfSpeech: 'other', distractors: ['Down', 'Off', 'Out', 'Up', 'Back'] },
        { text: 'to', partOfSpeech: 'preposition', distractors: ['for', 'of', 'at', 'in', 'on'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['me', 'him', 'her', 'them', 'us'] },
        { text: 'Mark', partOfSpeech: 'other', distractors: ['Monday', 'London', 'blue', 'seven', 'door'] },
      ],
    },
    {
      id: 'mitap_d39_p2',
      english: 'Please go ahead, Sara.',
      meaning: { ru: 'Прошу, начинай, Сара.', uk: 'Прошу, починай, Саро.', es: 'Por favor, adelante, Sara.' },
      constructions: ['imperative'],
      explanation: {
        title: { ru: 'go ahead = давай, говори', uk: 'go ahead = давай, говори', es: 'go ahead = adelante' },
        rule: { ru: 'go ahead зовёт начинать. Please спереди делает его вежливым: Please go ahead.', uk: 'go ahead кличе починати. Please спереду робить його ввічливим: Please go ahead.', es: 'go ahead invita a empezar. Please delante lo hace cortés: Please go ahead.' },
        why: { ru: 'Коротким go ahead ты даёшь коллеге зелёный свет говорить без долгих слов.', uk: 'Коротким go ahead ти даєш колезі зелене світло говорити без довгих слів.', es: 'Con el corto go ahead das luz verde al colega para hablar sin rodeos.' },
        commonMistake: { ru: 'Говори go ahead, не go forward. Здесь нужно слово ahead.', uk: 'Кажи go ahead, не go forward. Тут потрібне слово ahead.', es: 'Di go ahead, no go forward. Aquí va la palabra ahead.' },
      },
      words: [
        { text: 'Please', partOfSpeech: 'other', distractors: ['Sorry', 'Thanks', 'Yes', 'No', 'Hi'] },
        { text: 'go', partOfSpeech: 'verb', distractors: ['look', 'wait', 'stay', 'sit', 'stand'] },
        { text: 'ahead', partOfSpeech: 'adverb', distractors: ['away', 'back', 'down', 'off', 'out'] },
        { text: 'Sara', partOfSpeech: 'other', distractors: ['Friday', 'Paris', 'green', 'five', 'chair'] },
      ],
    },
    {
      id: 'mitap_d39_p3',
      english: 'Could you take this part, Mark?',
      meaning: { ru: 'Возьмёшь эту часть, Марк?', uk: 'Візьмеш цю частину, Марку?', es: '¿Podrías tomar esta parte, Mark?' },
      constructions: ['modals'],
      explanation: {
        title: { ru: 'Could you = ты бы мог', uk: 'Could you = ти б міг', es: 'Could you = ¿podrías?' },
        rule: { ru: 'Could you — мягкая просьба. Could you take this part? — «возьми эту часть?».', uk: 'Could you — м\'яке прохання. Could you take this part? — «візьми цю частину?».', es: 'Could you es una petición suave. ¿Could you take this part? — «¿tomas esta parte?».' },
        why: { ru: 'Could звучит вежливее, чем Can, поэтому коллеге приятнее взять слово.', uk: 'Could звучить ввічливіше, ніж Can, тому колезі приємніше взяти слово.', es: 'Could suena más cortés que Can, así al colega le agrada tomar la palabra.' },
        commonMistake: { ru: 'После Could you ставь слово без to: take, не to take.', uk: 'Після Could you став слово без to: take, не to take.', es: 'Tras Could you pon la palabra sin to: take, no to take.' },
      },
      words: [
        { text: 'Could', partOfSpeech: 'modal', distractors: ['Must', 'Should', 'May', 'Will', 'Might'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'take', partOfSpeech: 'verb', distractors: ['read', 'watch', 'call', 'send', 'keep'] },
        { text: 'this', partOfSpeech: 'determiner', distractors: ['that', 'these', 'those', 'some', 'any'] },
        { text: 'part', partOfSpeech: 'noun', distractors: ['call', 'room', 'desk', 'note', 'box'] },
        { text: 'Mark', partOfSpeech: 'other', distractors: ['Monday', 'London', 'blue', 'seven', 'door'] },
      ],
    },
    {
      id: 'mitap_d39_p4',
      english: 'Can you share your update, Sara?',
      meaning: { ru: 'Расскажешь свой апдейт, Сара?', uk: 'Розкажеш свій апдейт, Саро?', es: '¿Puedes compartir tu novedad, Sara?' },
      constructions: ['modals'],
      explanation: {
        title: { ru: 'Can you...? = можешь...?', uk: 'Can you...? = можеш...?', es: '¿Can you...? = ¿puedes...?' },
        rule: { ru: 'Can you спереди задаёт просьбу. Can you share? — «поделишься?». your = «твой».', uk: 'Can you спереду задає прохання. Can you share? — «поділишся?». your = «твій».', es: 'Can you delante hace una petición. ¿Can you share? — «¿compartes?». your = «tu».' },
        why: { ru: 'Так ты прямо приглашаешь коллегу рассказать новости команде.', uk: 'Так ти прямо запрошуєш колегу розповісти новини команді.', es: 'Así invitas directo al colega a contar sus novedades al equipo.' },
        commonMistake: { ru: 'В вопросе Can идёт первым: Can you share? Не You can share?', uk: 'У питанні Can іде першим: Can you share? Не You can share?', es: 'En la pregunta Can va primero: ¿Can you share? No ¿You can share?' },
      },
      words: [
        { text: 'Can', partOfSpeech: 'modal', distractors: ['Must', 'Should', 'May', 'Will', 'Might'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'it'] },
        { text: 'share', partOfSpeech: 'verb', distractors: ['read', 'watch', 'call', 'keep', 'close'] },
        { text: 'your', partOfSpeech: 'pronoun', distractors: ['my', 'his', 'her', 'our', 'their'] },
        { text: 'update', partOfSpeech: 'noun', distractors: ['room', 'desk', 'chair', 'door', 'box'] },
        { text: 'Sara', partOfSpeech: 'other', distractors: ['Friday', 'Paris', 'green', 'five', 'chair'] },
      ],
    },
    {
      id: 'mitap_d39_p5',
      english: 'Please tell us about the design.',
      meaning: { ru: 'Расскажи нам про дизайн.', uk: 'Розкажи нам про дизайн.', es: 'Cuéntanos sobre el diseño, por favor.' },
      constructions: ['imperative'],
      explanation: {
        title: { ru: 'tell us = расскажи нам', uk: 'tell us = розкажи нам', es: 'tell us = cuéntanos' },
        rule: { ru: 'tell us зовёт человека говорить. about = «про». tell us about the design — «расскажи про дизайн».', uk: 'tell us кличе людину говорити. about = «про». tell us about the design — «розкажи про дизайн».', es: 'tell us invita a hablar. about = «sobre». tell us about the design — «cuéntanos sobre el diseño».' },
        why: { ru: 'Так ты вежливо передаёшь слово и сразу называешь тему для коллеги.', uk: 'Так ти ввічливо передаєш слово й одразу називаєш тему для колеги.', es: 'Así das la palabra con cortesía y nombras de una el tema para el colega.' },
        commonMistake: { ru: 'Говори tell us about, не tell us for. Здесь нужно слово about.', uk: 'Кажи tell us about, не tell us for. Тут потрібне слово about.', es: 'Di tell us about, no tell us for. Aquí va la palabra about.' },
      },
      words: [
        { text: 'Please', partOfSpeech: 'other', distractors: ['Sorry', 'Thanks', 'Yes', 'No', 'Hi'] },
        { text: 'tell', partOfSpeech: 'verb', distractors: ['ask', 'call', 'read', 'keep', 'watch'] },
        { text: 'us', partOfSpeech: 'pronoun', distractors: ['me', 'him', 'her', 'them', 'it'] },
        { text: 'about', partOfSpeech: 'preposition', distractors: ['at', 'in', 'on', 'by', 'of'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'my', 'this', 'that'] },
        { text: 'design', partOfSpeech: 'noun', distractors: ['room', 'desk', 'chair', 'door', 'box'] },
      ],
    },
    {
      id: 'mitap_d39_p6',
      english: 'Now let us hear from Mark.',
      meaning: { ru: 'Теперь давайте послушаем Марка.', uk: 'Тепер давайте послухаємо Марка.', es: 'Ahora escuchemos a Mark.' },
      constructions: ['imperative'],
      explanation: {
        title: { ru: 'let us hear = давайте послушаем', uk: 'let us hear = давайте послухаємо', es: 'let us hear = escuchemos' },
        rule: { ru: 'let us зовёт команду вместе. hear from Mark — «послушать Марка».', uk: 'let us кличе команду разом. hear from Mark — «послухати Марка».', es: 'let us invita al equipo juntos. hear from Mark — «escuchar a Mark».' },
        why: { ru: 'Так ты мягко переводишь внимание всей встречи на следующего человека.', uk: 'Так ти м\'яко переводиш увагу всієї зустрічі на наступну людину.', es: 'Así diriges con suavidad la atención de la reunión a la próxima persona.' },
        commonMistake: { ru: 'Говори hear from Mark, не hear to Mark. Здесь нужно слово from.', uk: 'Кажи hear from Mark, не hear to Mark. Тут потрібне слово from.', es: 'Di hear from Mark, no hear to Mark. Aquí va la palabra from.' },
      },
      words: [
        { text: 'Now', partOfSpeech: 'adverb', distractors: ['soon', 'late', 'here', 'fast', 'early'] },
        { text: 'let', partOfSpeech: 'verb', distractors: ['ask', 'call', 'keep', 'read', 'watch'] },
        { text: 'us', partOfSpeech: 'pronoun', distractors: ['me', 'him', 'her', 'them', 'it'] },
        { text: 'hear', partOfSpeech: 'verb', distractors: ['read', 'call', 'ask', 'keep', 'watch'] },
        { text: 'from', partOfSpeech: 'preposition', distractors: ['at', 'in', 'on', 'by', 'of'] },
        { text: 'Mark', partOfSpeech: 'other', distractors: ['Monday', 'London', 'blue', 'seven', 'door'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'over', partOfSpeech: 'other', translation: { ru: 'к тебе (передаю)', uk: 'до тебе (передаю)', es: 'a ti (paso)' }, example: 'Over to you, Mark.' },
    { word: 'ahead', partOfSpeech: 'adverb', translation: { ru: 'вперёд, давай', uk: 'вперед, давай', es: 'adelante' }, example: 'Please go ahead, Sara.' },
    { word: 'take', partOfSpeech: 'verb', translation: { ru: 'взять', uk: 'взяти', es: 'tomar' }, example: 'Could you take this part, Mark?' },
    { word: 'share', partOfSpeech: 'verb', translation: { ru: 'поделиться', uk: 'поділитися', es: 'compartir' }, example: 'Can you share your update, Sara?' },
    { word: 'tell', partOfSpeech: 'verb', translation: { ru: 'рассказать', uk: 'розповісти', es: 'contar' }, example: 'Please tell us about the design.' },
    { word: 'hear', partOfSpeech: 'verb', translation: { ru: 'услышать', uk: 'почути', es: 'escuchar' }, example: 'Now let us hear from Mark.' },
  ],
};

export const MITAP_DAY_40: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 40,
  topic: { ru: 'Вернуть фокус к теме встречи', uk: 'Повернути фокус до теми зустрічі', es: 'Volver al tema de la reunión' },
  outcome: {
    ru: 'Ты вежливо вернёшь встречу к теме: заметишь, что разговор ушёл в сторону, предложишь вернуться к плану и попросишь сосредоточиться на главном вопросе.',
    uk: 'Ти ввічливо повернеш зустріч до теми: помітиш, що розмова відійшла вбік, запропонуєш повернутися до плану й попросиш зосередитися на головному питанні.',
    es: 'Volverás con cortesía al tema de la reunión: notarás que la charla se desvía, propondrás volver al plan y pedirás centrarse en lo principal.',
  },
  level: 'B1',
  prerequisiteLessons: [17, 10],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Скажи, что вернёмся к теме', uk: 'Скажи, що повернемося до теми', es: 'Di que volvemos al tema' },
      body: {
        ru: 'Чтобы вернуть фокус, скажи Let us get back on track. on track значит по плану. Так мягко зовёшь всех назад к теме.',
        uk: 'Щоб повернути фокус, скажи Let us get back on track. on track означає за планом. Так м\'яко кличеш усіх назад до теми.',
        es: 'Para volver al tema di Let us get back on track. on track significa según el plan. Así llamas a todos de vuelta con calma.',
      },
      examples: [
        { en: 'Let us get back on track', gloss: { ru: 'Давайте вернёмся к теме', uk: 'Повернімося до теми', es: 'Volvamos al tema' } },
        { en: 'Let us get back to the plan', gloss: { ru: 'Давайте вернёмся к плану', uk: 'Повернімося до плану', es: 'Volvamos al plan' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Заметь, что ушли в сторону', uk: 'Поміть, що відійшли вбік', es: 'Nota que se desvían' },
      body: {
        ru: 'Про разговор прямо сейчас бери are и слово на -ing: We are getting off topic. off topic значит не по теме. Так показываешь, что происходит сейчас.',
        uk: 'Про розмову зараз бери are і слово на -ing: We are getting off topic. off topic означає не по темі. Так показуєш, що відбувається зараз.',
        es: 'Para la charla ahora usa are y la palabra en -ing: We are getting off topic. off topic significa fuera del tema. Así muestras qué pasa ahora.',
      },
      examples: [
        { en: 'We are getting off topic now', gloss: { ru: 'Мы сейчас уходим от темы', uk: 'Ми зараз відходимо від теми', es: 'Nos estamos saliendo del tema ahora' } },
        { en: 'We are spending too much time here', gloss: { ru: 'Мы тратим тут слишком много времени', uk: 'Ми витрачаємо тут забагато часу', es: 'Estamos gastando demasiado tiempo aquí' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Попроси сосредоточиться', uk: 'Попроси зосередитися', es: 'Pide centrarse' },
      body: {
        ru: 'Чтобы позвать к делу, начни с Can we focus on: Can we focus on the agenda. focus on значит сосредоточиться на. Так вежливо просишь о главном.',
        uk: 'Щоб покликати до справи, почни з Can we focus on: Can we focus on the agenda. focus on означає зосередитися на. Так ввічливо просиш про головне.',
        es: 'Para llamar al asunto empieza con Can we focus on: Can we focus on the agenda. focus on significa centrarse en. Así pides lo principal con cortesía.',
      },
      examples: [
        { en: 'Can we focus on the agenda?', gloss: { ru: 'Можем сосредоточиться на плане встречи?', uk: 'Можемо зосередитися на плані зустрічі?', es: '¿Podemos centrarnos en la agenda?' } },
        { en: 'Can we keep this short?', gloss: { ru: 'Можем сделать это покороче?', uk: 'Можемо зробити це коротше?', es: '¿Podemos hacerlo breve?' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d40_p1',
      english: 'Let us get back on track',
      meaning: { ru: 'Давайте вернёмся к теме', uk: 'Повернімося до теми', es: 'Volvamos al tema' },
      constructions: ['modals'],
      explanation: {
        title: { ru: 'Зови всех назад к теме', uk: 'Клич усіх назад до теми', es: 'Llama a todos al tema' },
        rule: { ru: 'Для мягкого призыва начни с Let us get back. on track значит по плану, по теме.', uk: 'Для м\'якого заклику почни з Let us get back. on track означає за планом, по темі.', es: 'Para un llamado suave empieza con Let us get back. on track significa según el plan.' },
        why: { ru: 'Let us звучит как мы вместе, поэтому никто не обижается и возвращается к теме.', uk: 'Let us звучить як ми разом, тому ніхто не ображається й повертається до теми.', es: 'Let us suena a nosotros juntos, por eso nadie se ofende y vuelve al tema.' },
        commonMistake: { ru: 'Не говори Get back on track как приказ. Мягче звучит Let us get back.', uk: 'Не кажи Get back on track як наказ. М\'якше звучить Let us get back.', es: 'No digas Get back on track como orden. Suena más suave Let us get back.' },
      },
      words: [
        { text: 'Let', partOfSpeech: 'verb', distractors: ['make', 'keep', 'help', 'ask', 'tell'] },
        { text: 'us', partOfSpeech: 'pronoun', distractors: ['him', 'her', 'them', 'me', 'you'] },
        { text: 'get', partOfSpeech: 'verb', distractors: ['come', 'run', 'put', 'sit', 'take'] },
        { text: 'back', partOfSpeech: 'adverb', distractors: ['away', 'down', 'up', 'out', 'off'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['at', 'in', 'by', 'for', 'of'] },
        { text: 'track', partOfSpeech: 'noun', distractors: ['road', 'path', 'line', 'step', 'point'] },
      ],
    },
    {
      id: 'mitap_d40_p2',
      english: 'We are getting off topic now',
      meaning: { ru: 'Мы сейчас уходим от темы', uk: 'Ми зараз відходимо від теми', es: 'Nos estamos saliendo del tema ahora' },
      constructions: ['present-continuous'],
      explanation: {
        title: { ru: 'Скажи, что уходим от темы', uk: 'Скажи, що відходимо від теми', es: 'Di que se sale del tema' },
        rule: { ru: 'Про сейчас бери are и слово на -ing: are getting. off topic значит не по теме.', uk: 'Про зараз бери are і слово на -ing: are getting. off topic означає не по темі.', es: 'Para ahora usa are y la palabra en -ing: are getting. off topic significa fuera del tema.' },
        why: { ru: 'Спокойное замечание про сейчас помогает всем заметить, что разговор ушёл в сторону.', uk: 'Спокійне зауваження про зараз допомагає всім помітити, що розмова відійшла вбік.', es: 'Una observación tranquila sobre ahora ayuda a notar que la charla se desvió.' },
        commonMistake: { ru: 'Не говори We get off topic про сейчас. Сейчас нужно are getting.', uk: 'Не кажи We get off topic про зараз. Зараз потрібно are getting.', es: 'No digas We get off topic para ahora. Ahora va are getting.' },
      },
      words: [
        { text: 'We', partOfSpeech: 'pronoun', distractors: ['I', 'he', 'she', 'they', 'you'] },
        { text: 'are', partOfSpeech: 'to-be', distractors: ['is', 'am', 'was', 'were', 'be'] },
        { text: 'getting', partOfSpeech: 'verb', distractors: ['sleeping', 'eating', 'driving', 'jumping', 'cooking'] },
        { text: 'off', partOfSpeech: 'preposition', distractors: ['at', 'in', 'by', 'for', 'of'] },
        { text: 'topic', partOfSpeech: 'noun', distractors: ['report', 'budget', 'client', 'screen', 'ticket'] },
        { text: 'now', partOfSpeech: 'adverb', distractors: ['early', 'today', 'soon', 'again', 'here'] },
      ],
    },
    {
      id: 'mitap_d40_p3',
      english: 'Can we focus on the agenda?',
      meaning: { ru: 'Можем сосредоточиться на плане встречи?', uk: 'Можемо зосередитися на плані зустрічі?', es: '¿Podemos centrarnos en la agenda?' },
      constructions: ['modals'],
      explanation: {
        title: { ru: 'Вежливо позови к делу', uk: 'Ввічливо поклич до справи', es: 'Llama al asunto con cortesía' },
        rule: { ru: 'Для вежливой просьбы начни с Can we focus on. agenda значит план встречи.', uk: 'Для ввічливого прохання почни з Can we focus on. agenda означає план зустрічі.', es: 'Para pedir con cortesía empieza con Can we focus on. agenda significa el plan de la reunión.' },
        why: { ru: 'Вопрос Can we звучит мягче приказа и зовёт всех вернуться к главному вопросу.', uk: 'Питання Can we звучить м\'якше наказу й кличе всіх повернутися до головного.', es: 'La pregunta Can we suena más suave que una orden e invita a volver a lo principal.' },
        commonMistake: { ru: 'В вопросе Can идёт первым: Can we focus. Не We can focus.', uk: 'У питанні Can іде першим: Can we focus. Не We can focus.', es: 'En la pregunta Can va primero: ¿Can we focus? No ¿We can focus?' },
      },
      words: [
        { text: 'Can', partOfSpeech: 'modal', distractors: ['could', 'will', 'should', 'must', 'may'] },
        { text: 'we', partOfSpeech: 'pronoun', distractors: ['I', 'he', 'she', 'they', 'you'] },
        { text: 'focus', partOfSpeech: 'verb', distractors: ['open', 'close', 'read', 'write', 'draw'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['at', 'in', 'by', 'for', 'of'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'no', 'some', 'any'] },
        { text: 'agenda', partOfSpeech: 'noun', distractors: ['report', 'budget', 'client', 'screen', 'ticket'] },
      ],
    },
    {
      id: 'mitap_d40_p4',
      english: 'We are running out of time',
      meaning: { ru: 'У нас заканчивается время', uk: 'У нас закінчується час', es: 'Se nos acaba el tiempo' },
      constructions: ['present-continuous'],
      explanation: {
        title: { ru: 'Скажи, что время на исходе', uk: 'Скажи, що час спливає', es: 'Di que se acaba el tiempo' },
        rule: { ru: 'Про сейчас бери are и слово на -ing: are running. run out of time значит время заканчивается.', uk: 'Про зараз бери are і слово на -ing: are running. run out of time означає час закінчується.', es: 'Para ahora usa are y la palabra en -ing: are running. run out of time significa que el tiempo se acaba.' },
        why: { ru: 'Напоминание про время мягко двигает разговор обратно к делу, без давления на людей.', uk: 'Нагадування про час м\'яко рухає розмову назад до справи, без тиску на людей.', es: 'Recordar el tiempo mueve con calma la charla de vuelta al asunto, sin presionar.' },
        commonMistake: { ru: 'Не говори We run out of time про сейчас. Сейчас нужно are running.', uk: 'Не кажи We run out of time про зараз. Зараз потрібно are running.', es: 'No digas We run out of time para ahora. Ahora va are running.' },
      },
      words: [
        { text: 'We', partOfSpeech: 'pronoun', distractors: ['I', 'he', 'she', 'they', 'you'] },
        { text: 'are', partOfSpeech: 'to-be', distractors: ['is', 'am', 'was', 'were', 'be'] },
        { text: 'running', partOfSpeech: 'verb', distractors: ['sleeping', 'eating', 'driving', 'jumping', 'cooking'] },
        { text: 'out', partOfSpeech: 'adverb', distractors: ['back', 'away', 'down', 'up', 'off'] },
        { text: 'of', partOfSpeech: 'preposition', distractors: ['at', 'in', 'by', 'for', 'on'] },
        { text: 'time', partOfSpeech: 'noun', distractors: ['report', 'budget', 'client', 'screen', 'ticket'] },
      ],
    },
    {
      id: 'mitap_d40_p5',
      english: 'We should park this for later',
      meaning: { ru: 'Давайте отложим это на потом', uk: 'Відкладімо це на потім', es: 'Deberíamos dejar esto para luego' },
      constructions: ['modals'],
      explanation: {
        title: { ru: 'Отложи лишний вопрос на потом', uk: 'Відклади зайве питання на потім', es: 'Deja el tema extra para luego' },
        rule: { ru: 'Для мягкого совета бери We should. park this значит отложить вопрос в сторону.', uk: 'Для м\'якої поради бери We should. park this означає відкласти питання вбік.', es: 'Para un consejo suave usa We should. park this significa dejar el tema a un lado.' },
        why: { ru: 'should звучит как совет, поэтому вопрос откладывают спокойно и не теряют его совсем.', uk: 'should звучить як порада, тому питання відкладають спокійно й не втрачають зовсім.', es: 'should suena a consejo, por eso el tema se aparta con calma y no se pierde.' },
        commonMistake: { ru: 'После should ставь слово без to: should park, не should to park.', uk: 'Після should став слово без to: should park, не should to park.', es: 'Tras should pon la palabra sin to: should park, no should to park.' },
      },
      words: [
        { text: 'We', partOfSpeech: 'pronoun', distractors: ['I', 'he', 'she', 'they', 'you'] },
        { text: 'should', partOfSpeech: 'modal', distractors: ['can', 'could', 'will', 'must', 'may'] },
        { text: 'park', partOfSpeech: 'verb', distractors: ['open', 'close', 'read', 'write', 'draw'] },
        { text: 'this', partOfSpeech: 'determiner', distractors: ['these', 'those', 'my', 'the', 'your'] },
        { text: 'for', partOfSpeech: 'preposition', distractors: ['at', 'in', 'by', 'on', 'of'] },
        { text: 'later', partOfSpeech: 'adverb', distractors: ['soon', 'now', 'again', 'then', 'yesterday'] },
      ],
    },
    {
      id: 'mitap_d40_p6',
      english: 'Let us finish the main point first',
      meaning: { ru: 'Давайте сначала закончим главный вопрос', uk: 'Спершу закінчімо головне питання', es: 'Terminemos primero el punto principal' },
      constructions: ['modals'],
      explanation: {
        title: { ru: 'Сначала закончи главное', uk: 'Спершу закінчи головне', es: 'Termina primero lo principal' },
        rule: { ru: 'Для мягкого призыва начни с Let us finish. main point значит главный вопрос встречи.', uk: 'Для м\'якого заклику почни з Let us finish. main point означає головне питання зустрічі.', es: 'Para un llamado suave empieza con Let us finish. main point significa el punto principal.' },
        why: { ru: 'Слово first ставит порядок: сначала главное, остальное потом. Так встреча держит фокус.', uk: 'Слово first ставить порядок: спершу головне, решта потім. Так зустріч тримає фокус.', es: 'La palabra first marca el orden: primero lo principal, lo demás luego. Así la reunión mantiene el foco.' },
        commonMistake: { ru: 'Не говори Let us to finish со словом to. Правильно Let us finish.', uk: 'Не кажи Let us to finish зі словом to. Правильно Let us finish.', es: 'No digas Let us to finish con to. Lo correcto es Let us finish.' },
      },
      words: [
        { text: 'Let', partOfSpeech: 'verb', distractors: ['make', 'keep', 'help', 'ask', 'tell'] },
        { text: 'us', partOfSpeech: 'pronoun', distractors: ['him', 'her', 'them', 'me', 'you'] },
        { text: 'finish', partOfSpeech: 'verb', distractors: ['open', 'close', 'read', 'write', 'draw'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'no', 'some', 'any'] },
        { text: 'main', partOfSpeech: 'adjective', distractors: ['small', 'late', 'early', 'ready', 'busy'] },
        { text: 'point', partOfSpeech: 'noun', distractors: ['report', 'budget', 'client', 'screen', 'ticket'] },
        { text: 'first', partOfSpeech: 'adverb', distractors: ['soon', 'now', 'again', 'then', 'later'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'track', partOfSpeech: 'noun', translation: { ru: 'тема, курс', uk: 'тема, курс', es: 'rumbo' }, example: 'Let us get back on track' },
    { word: 'getting', partOfSpeech: 'verb', translation: { ru: 'уходим (сейчас)', uk: 'відходимо (зараз)', es: 'saliéndonos' }, example: 'We are getting off topic now' },
    { word: 'focus', partOfSpeech: 'verb', translation: { ru: 'сосредоточиться', uk: 'зосередитися', es: 'centrarse' }, example: 'Can we focus on the agenda?' },
    { word: 'running', partOfSpeech: 'verb', translation: { ru: 'заканчивается (сейчас)', uk: 'закінчується (зараз)', es: 'acabando' }, example: 'We are running out of time' },
    { word: 'park', partOfSpeech: 'verb', translation: { ru: 'отложить', uk: 'відкласти', es: 'aparcar' }, example: 'We should park this for later' },
    { word: 'point', partOfSpeech: 'noun', translation: { ru: 'вопрос, пункт', uk: 'питання, пункт', es: 'punto' }, example: 'Let us finish the main point first' },
  ],
};

export const MITAP_DAY_41: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 41,
  topic: { ru: 'Подвести итог пункта', uk: 'Підбити підсумок пункту', es: 'Resumir un punto' },
  outcome: {
    ru: 'Ты уверенно подведёшь итог пункта на встрече: So, to sum up this point, We have agreed on the main idea, и плавно перейдёшь дальше.',
    uk: 'Ти впевнено підіб\'єш підсумок пункту на зустрічі: So, to sum up this point, We have agreed on the main idea, і плавно перейдеш далі.',
    es: 'Resumirás con seguridad un punto en la reunión: So, to sum up this point, We have agreed on the main idea, y pasarás al siguiente.',
  },
  level: 'B1',
  prerequisiteLessons: [24, 22],
  intro: [
    {
      kind: 'how',
      title: { ru: 'So, to sum up this point', uk: 'So, to sum up this point', es: 'So, to sum up this point' },
      body: {
        ru: 'Когда пункт обсудили, скажи: So, to sum up this point. Это значит «итак, подведём итог по этому пункту». Дальше коротко повтори главное.',
        uk: 'Коли пункт обговорили, скажи: So, to sum up this point. Це значить «отже, підіб\'ємо підсумок по цьому пункту». Далі коротко повтори головне.',
        es: 'Cuando ya hablaron el punto, di: So, to sum up this point. Significa «entonces, para resumir este punto». Luego repite lo principal.',
      },
      examples: [
        { en: 'So, to sum up this point.', gloss: { ru: 'Итак, подведём итог по этому пункту.', uk: 'Отже, підіб\'ємо підсумок по цьому пункту.', es: 'Entonces, para resumir este punto.' } },
        { en: 'So, to sum up this point quickly.', gloss: { ru: 'Итак, быстро подведём итог пункта.', uk: 'Отже, швидко підіб\'ємо підсумок пункту.', es: 'Entonces, para resumir este punto rápido.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'We have agreed — мы договорились', uk: 'We have agreed — ми домовились', es: 'We have agreed — hemos acordado' },
      body: {
        ru: 'Чтобы показать готовый результат, скажи have + agreed: We have agreed. Это значит «мы уже договорились». Так итог звучит как общее решение.',
        uk: 'Щоб показати готовий результат, скажи have + agreed: We have agreed. Це значить «ми вже домовились». Так підсумок звучить як спільне рішення.',
        es: 'Para mostrar un resultado listo, di have + agreed: We have agreed. Significa «ya hemos acordado». Así el resumen suena como decisión común.',
      },
      examples: [
        { en: 'We have agreed on the main idea.', gloss: { ru: 'Мы договорились о главной мысли.', uk: 'Ми домовились про головну думку.', es: 'Hemos acordado la idea principal.' } },
        { en: 'We have covered the first point.', gloss: { ru: 'Мы разобрали первый пункт.', uk: 'Ми розібрали перший пункт.', es: 'Hemos cubierto el primer punto.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'before moving on — прежде чем идти дальше', uk: 'before moving on — перш ніж іти далі', es: 'before moving on — antes de seguir' },
      body: {
        ru: 'После before слово-действие берёт -ing: moving on. Скажи Let me sum up before moving on — «подведу итог, прежде чем идти дальше». Плавный переход к новому пункту.',
        uk: 'Після before слово-дія бере -ing: moving on. Скажи Let me sum up before moving on — «підіб\'ю підсумок, перш ніж іти далі». Плавний перехід до нового пункту.',
        es: 'Tras before la acción toma -ing: moving on. Di Let me sum up before moving on — «resumo antes de seguir». Transición suave al nuevo punto.',
      },
      examples: [
        { en: 'Let me sum up before moving on.', gloss: { ru: 'Подведу итог, прежде чем идти дальше.', uk: 'Підіб\'ю підсумок, перш ніж іти далі.', es: 'Resumo antes de seguir adelante.' } },
        { en: 'Summing up helps everyone stay clear.', gloss: { ru: 'Подведение итога помогает всем понять.', uk: 'Підбиття підсумку допомагає всім зрозуміти.', es: 'Resumir ayuda a que todos lo entiendan.' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d41_p1',
      english: 'So, to sum up this point.',
      meaning: { ru: 'Итак, подведём итог по этому пункту.', uk: 'Отже, підіб\'ємо підсумок по цьому пункту.', es: 'Entonces, para resumir este punto.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'to sum up — подвести итог', uk: 'to sum up — підбити підсумок', es: 'to sum up — resumir' },
        rule: { ru: 'to sum up значит «коротко повторить главное». So в начале — «итак». So, to sum up this point — итог по пункту.', uk: 'to sum up значить «коротко повторити головне». So на початку — «отже». So, to sum up this point — підсумок пункту.', es: 'to sum up significa «repetir lo principal». So al inicio es «entonces». So, to sum up this point — resumen del punto.' },
        why: { ru: 'Готовый сигнал, что ты закрываешь пункт. Все понимают: сейчас будет короткий вывод.', uk: 'Готовий сигнал, що ти закриваєш пункт. Усі розуміють: зараз буде короткий висновок.', es: 'Señal clara de que cierras el punto. Todos entienden que viene un breve resumen.' },
        commonMistake: { ru: 'Не теряй up: говори sum up, а не просто sum.', uk: 'Не губи up: кажи sum up, а не просто sum.', es: 'No pierdas up: di sum up, no solo sum.' },
      },
      words: [
        { text: 'So', partOfSpeech: 'other', distractors: ['Up', 'For', 'At', 'By', 'Of'] },
        { text: 'to', partOfSpeech: 'other', distractors: ['of', 'for', 'at', 'by', 'with'] },
        { text: 'sum', partOfSpeech: 'verb', distractors: ['read', 'plan', 'check', 'write', 'close'] },
        { text: 'up', partOfSpeech: 'phrasal_particle', distractors: ['in', 'on', 'off', 'out', 'over'] },
        { text: 'this', partOfSpeech: 'determiner', distractors: ['its', 'his', 'whose', 'few', 'both'] },
        { text: 'point', partOfSpeech: 'noun', distractors: ['plan', 'desk', 'room', 'date', 'week'] },
      ],
    },
    {
      id: 'mitap_d41_p2',
      english: 'We have agreed on the main idea.',
      meaning: { ru: 'Мы договорились о главной мысли.', uk: 'Ми домовились про головну думку.', es: 'Hemos acordado la idea principal.' },
      constructions: ['present-perfect'],
      explanation: {
        title: { ru: 'We have agreed — мы договорились', uk: 'We have agreed — ми домовились', es: 'We have agreed — hemos acordado' },
        rule: { ru: 'have + agreed показывает готовый результат сейчас. We have agreed on — «мы договорились о». Дальше: the main idea.', uk: 'have + agreed показує готовий результат зараз. We have agreed on — «ми домовились про». Далі: the main idea.', es: 'have + agreed muestra un resultado ya listo. We have agreed on — «hemos acordado». Luego: the main idea.' },
        why: { ru: 'Звучит как общее решение группы. Итог становится твёрдым, а не личным мнением.', uk: 'Звучить як спільне рішення групи. Підсумок стає твердим, а не особистою думкою.', es: 'Suena como decisión del grupo. El resumen queda firme, no como opinión tuya.' },
        commonMistake: { ru: 'Договорились о чём-то идёт через on: agreed on, не agreed about.', uk: 'Домовились про щось іде через on: agreed on, не agreed about.', es: 'Acordar algo va con on: agreed on, no agreed about.' },
      },
      words: [
        { text: 'We', partOfSpeech: 'pronoun', distractors: ['I', 'he', 'she', 'they', 'you'] },
        { text: 'have', partOfSpeech: 'verb', distractors: ['has', 'having', 'be', 'being', 'do'] },
        { text: 'agreed', partOfSpeech: 'verb', distractors: ['asked', 'planned', 'checked', 'called', 'added'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['in', 'at', 'by', 'to', 'of'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['its', 'some', 'no', 'each', 'both'] },
        { text: 'main', partOfSpeech: 'adjective', distractors: ['red', 'cold', 'tall', 'round', 'empty'] },
        { text: 'idea', partOfSpeech: 'noun', distractors: ['desk', 'room', 'week', 'date', 'chair'] },
      ],
    },
    {
      id: 'mitap_d41_p3',
      english: 'Let me sum up before moving on.',
      meaning: { ru: 'Подведу итог, прежде чем идти дальше.', uk: 'Підіб\'ю підсумок, перш ніж іти далі.', es: 'Resumo antes de seguir adelante.' },
      constructions: ['gerund'],
      explanation: {
        title: { ru: 'before moving on — прежде чем идти дальше', uk: 'before moving on — перш ніж іти далі', es: 'before moving on — antes de seguir' },
        rule: { ru: 'После before слово-действие берёт -ing: moving on — «идти дальше». Let me sum up — «дай подведу итог».', uk: 'Після before слово-дія бере -ing: moving on — «іти далі». Let me sum up — «дай підіб\'ю підсумок».', es: 'Tras before la acción toma -ing: moving on — «seguir». Let me sum up — «déjame resumir».' },
        why: { ru: 'Вежливо берёшь паузу для итога перед новым пунктом. Встреча идёт ровно и понятно.', uk: 'Ввічливо береш паузу для підсумку перед новим пунктом. Зустріч іде рівно і зрозуміло.', es: 'Pides una pausa cortés para resumir antes del nuevo punto. La reunión va clara.' },
        commonMistake: { ru: 'После before нужна форма с -ing: moving on, не before move on.', uk: 'Після before потрібна форма з -ing: moving on, не before move on.', es: 'Tras before va la forma con -ing: moving on, no before move on.' },
      },
      words: [
        { text: 'Let', partOfSpeech: 'verb', distractors: ['want', 'need', 'like', 'hope', 'try'] },
        { text: 'me', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'we', 'they', 'I'] },
        { text: 'sum', partOfSpeech: 'verb', distractors: ['read', 'plan', 'check', 'write', 'close'] },
        { text: 'up', partOfSpeech: 'phrasal_particle', distractors: ['in', 'on', 'off', 'out', 'over'] },
        { text: 'before', partOfSpeech: 'preposition', distractors: ['until', 'about', 'onto', 'upon', 'unless'] },
        { text: 'moving', partOfSpeech: 'verb', distractors: ['reading', 'writing', 'planning', 'calling', 'asking'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['in', 'at', 'by', 'to', 'of'] },
      ],
    },
    {
      id: 'mitap_d41_p4',
      english: 'We have covered the first point.',
      meaning: { ru: 'Мы разобрали первый пункт.', uk: 'Ми розібрали перший пункт.', es: 'Hemos cubierto el primer punto.' },
      constructions: ['present-perfect'],
      explanation: {
        title: { ru: 'have covered — разобрали', uk: 'have covered — розібрали', es: 'have covered — hemos cubierto' },
        rule: { ru: 'have + covered значит «уже прошли, разобрали». We have covered the first point — первый пункт закрыт.', uk: 'have + covered значить «вже пройшли, розібрали». We have covered the first point — перший пункт закрито.', es: 'have + covered significa «ya vimos». We have covered the first point — el primer punto está listo.' },
        why: { ru: 'Чётко отмечаешь готовый пункт. Группа видит прогресс и понимает, что дальше.', uk: 'Чітко відзначаєш готовий пункт. Група бачить прогрес і розуміє, що далі.', es: 'Marcas claramente un punto terminado. El grupo ve el avance y qué sigue.' },
        commonMistake: { ru: 'Нужно have перед covered: we have covered, не we covered here.', uk: 'Потрібне have перед covered: we have covered, не we covered.', es: 'Hace falta have antes de covered: we have covered, no we covered.' },
      },
      words: [
        { text: 'We', partOfSpeech: 'pronoun', distractors: ['I', 'he', 'she', 'they', 'you'] },
        { text: 'have', partOfSpeech: 'verb', distractors: ['has', 'having', 'be', 'being', 'do'] },
        { text: 'covered', partOfSpeech: 'verb', distractors: ['asked', 'planned', 'called', 'added', 'booked'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['its', 'some', 'no', 'each', 'both'] },
        { text: 'first', partOfSpeech: 'adjective', distractors: ['big', 'cold', 'red', 'round', 'empty'] },
        { text: 'point', partOfSpeech: 'noun', distractors: ['plan', 'desk', 'room', 'date', 'week'] },
      ],
    },
    {
      id: 'mitap_d41_p5',
      english: 'Summing up helps everyone stay clear.',
      meaning: { ru: 'Подведение итога помогает всем понять.', uk: 'Підбиття підсумку допомагає всім зрозуміти.', es: 'Resumir ayuda a que todos lo entiendan.' },
      constructions: ['gerund'],
      explanation: {
        title: { ru: 'Summing up — подведение итога', uk: 'Summing up — підбиття підсумку', es: 'Summing up — resumir' },
        rule: { ru: 'Слово-действие с -ing работает как «дело»: Summing up — «подведение итога». Дальше helps everyone — «помогает всем».', uk: 'Слово-дія з -ing працює як «справа»: Summing up — «підбиття підсумку». Далі helps everyone — «допомагає всім».', es: 'La acción con -ing actúa como «cosa»: Summing up — «resumir». Luego helps everyone — «ayuda a todos».' },
        why: { ru: 'Объясняешь, зачем нужен итог. Коллеги ценят, когда мысли остаются ясными.', uk: 'Пояснюєш, навіщо потрібен підсумок. Колеги цінують, коли думки лишаються ясними.', es: 'Explicas para qué sirve resumir. Los colegas valoran tener las ideas claras.' },
        commonMistake: { ru: 'В начале как «дело» нужна -ing форма: Summing up, не Sum up helps.', uk: 'На початку як «справа» потрібна -ing форма: Summing up, не Sum up helps.', es: 'Al inicio como «cosa» va la forma -ing: Summing up, no Sum up helps.' },
      },
      words: [
        { text: 'Summing', partOfSpeech: 'verb', distractors: ['reading', 'writing', 'planning', 'calling', 'asking'] },
        { text: 'up', partOfSpeech: 'phrasal_particle', distractors: ['in', 'on', 'off', 'out', 'over'] },
        { text: 'helps', partOfSpeech: 'verb', distractors: ['works', 'goes', 'means', 'shows', 'comes'] },
        { text: 'everyone', partOfSpeech: 'pronoun', distractors: ['myself', 'ourselves', 'nobody', 'nothing', 'itself'] },
        { text: 'stay', partOfSpeech: 'verb', distractors: ['go', 'come', 'walk', 'sit', 'run'] },
        { text: 'clear', partOfSpeech: 'adjective', distractors: ['red', 'cold', 'tall', 'round', 'heavy'] },
      ],
    },
    {
      id: 'mitap_d41_p6',
      english: 'So that is the main point.',
      meaning: { ru: 'Итак, это и есть главный пункт.', uk: 'Отже, це і є головний пункт.', es: 'Entonces, ese es el punto principal.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'that is — это есть', uk: 'that is — це є', es: 'that is — ese es' },
        rule: { ru: 'So that is — «итак, это и есть». Закрываешь итог: the main point — главный пункт. Короткий твёрдый вывод.', uk: 'So that is — «отже, це і є». Закриваєш підсумок: the main point — головний пункт. Короткий твердий висновок.', es: 'So that is — «entonces, ese es». Cierras el resumen: the main point — el punto principal.' },
        why: { ru: 'Чёткая точка в конце итога. Все слышат главную мысль и запоминают её.', uk: 'Чітка крапка в кінці підсумку. Усі чують головну думку і запам\'ятовують її.', es: 'Un cierre claro del resumen. Todos oyen la idea principal y la recuerdan.' },
        commonMistake: { ru: 'Нужно is между that и the: that is the point, не that the point.', uk: 'Потрібне is між that і the: that is the point, не that the point.', es: 'Hace falta is entre that y the: that is the point, no that the point.' },
      },
      words: [
        { text: 'So', partOfSpeech: 'other', distractors: ['Up', 'For', 'At', 'By', 'Of'] },
        { text: 'that', partOfSpeech: 'pronoun', distractors: ['what', 'who', 'here', 'there', 'one'] },
        { text: 'is', partOfSpeech: 'to-be', distractors: ['are', 'were', 'am', 'be', 'being'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['its', 'some', 'no', 'each', 'two'] },
        { text: 'main', partOfSpeech: 'adjective', distractors: ['red', 'cold', 'tall', 'round', 'empty'] },
        { text: 'point', partOfSpeech: 'noun', distractors: ['plan', 'desk', 'room', 'date', 'week'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'sum', partOfSpeech: 'verb', translation: { ru: 'подводить итог', uk: 'підбивати підсумок', es: 'resumir' }, example: 'So, to sum up this point.' },
    { word: 'point', partOfSpeech: 'noun', translation: { ru: 'пункт, мысль', uk: 'пункт, думка', es: 'punto' }, example: 'So that is the main point.' },
    { word: 'agreed', partOfSpeech: 'verb', translation: { ru: 'договорились', uk: 'домовились', es: 'acordado' }, example: 'We have agreed on the main idea.' },
    { word: 'covered', partOfSpeech: 'verb', translation: { ru: 'разобрали, прошли', uk: 'розібрали, пройшли', es: 'cubierto' }, example: 'We have covered the first point.' },
    { word: 'moving', partOfSpeech: 'noun', translation: { ru: 'переход (дальше)', uk: 'перехід (далі)', es: 'seguir adelante' }, example: 'Let me sum up before moving on.' },
    { word: 'Summing', partOfSpeech: 'noun', translation: { ru: 'подведение итога', uk: 'підбиття підсумку', es: 'resumir' }, example: 'Summing up helps everyone stay clear.' },
  ],
};

export const MITAP_DAY_42: PlanContentDay = {
  planId: 'mitap',
  dayIndex: 42,
  topic: { ru: 'Повторение недели 6: ведём по повестке', uk: 'Повторення тижня 6: ведемо за порядком денним', es: 'Repaso de la semana 6: dirigir según la agenda' },
  outcome: {
    ru: 'Ты сможешь открыть созвон, назвать повестку, держать тайминг, вернуть фокус и подвести итог встречи.',
    uk: 'Ти зможеш відкрити дзвінок, назвати порядок денний, тримати час, повернути фокус і підбити підсумок зустрічі.',
    es: 'Podrás abrir la llamada, nombrar la agenda, controlar el tiempo, recuperar el foco y resumir la reunión.',
  },
  level: 'B1',
  prerequisiteLessons: [24, 22],
  intro: [
    {
      kind: 'how',
      title: { ru: 'Открой созвон фразой о готовности', uk: 'Відкрий дзвінок фразою про готовність', es: 'Abre la llamada diciendo que ya está' },
      body: {
        ru: 'Чтобы начать, скажи have + done: «Everyone has joined». Это про результат сейчас — все уже на месте, можно стартовать.',
        uk: 'Щоб почати, скажи have + done: «Everyone has joined». Це про результат зараз — усі вже на місці, можна стартувати.',
        es: 'Para empezar, usa have + done: «Everyone has joined». Es el resultado ahora: ya están todos, podemos arrancar.',
      },
      examples: [
        { en: 'Everyone has joined the call now.', gloss: { ru: 'Сейчас все присоединились к звонку.', uk: 'Зараз усі приєдналися до дзвінка.', es: 'Ahora todos se han unido a la llamada.' } },
        { en: 'I have shared the agenda with you.', gloss: { ru: 'Я поделился повесткой с вами.', uk: 'Я поділився порядком денним з вами.', es: 'Os he compartido la agenda.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Назови, что будем делать', uk: 'Назви, що робитимемо', es: 'Di qué vamos a hacer' },
      body: {
        ru: 'Для плана встречи бери will: «We will start». Так слушатели сразу понимают порядок и что идёт дальше.',
        uk: 'Для плану зустрічі бери will: «We will start». Так слухачі одразу розуміють порядок і що далі.',
        es: 'Para el plan de la reunión usa will: «We will start». Así todos ven el orden y qué viene después.',
      },
      examples: [
        { en: 'We will start with the budget.', gloss: { ru: 'Мы начнём с бюджета.', uk: 'Ми почнемо з бюджету.', es: 'Empezaremos con el presupuesto.' } },
        { en: 'I will keep us on time.', gloss: { ru: 'Я буду следить за временем.', uk: 'Я стежитиму за часом.', es: 'Yo controlaré el tiempo.' } },
      ],
    },
    {
      kind: 'how',
      title: { ru: 'Держи фокус словом с -ing', uk: 'Тримай фокус словом з -ing', es: 'Mantén el foco con la palabra en -ing' },
      body: {
        ru: 'Чтобы вернуть тему, скажи действие с -ing после слова: «Thanks for sharing». Это вежливо закрывает шаг и двигает дальше.',
        uk: 'Щоб повернути тему, скажи дію з -ing після слова: «Thanks for sharing». Це ввічливо закриває крок і рухає далі.',
        es: 'Para volver al tema, usa la acción en -ing tras la palabra: «Thanks for sharing». Cierra el paso con cortesía y avanza.',
      },
      examples: [
        { en: 'Thanks for sharing your update.', gloss: { ru: 'Спасибо, что поделился апдейтом.', uk: 'Дякую, що поділився апдейтом.', es: 'Gracias por compartir tu novedad.' } },
        { en: 'Let us keep moving through the agenda.', gloss: { ru: 'Давай двигаться по повестке дальше.', uk: 'Давай рухатися за порядком денним далі.', es: 'Sigamos avanzando por la agenda.' } },
      ],
    },
  ],
  phrases: [
    {
      id: 'mitap_d42_p1',
      english: 'Everyone has joined the call now.',
      meaning: { ru: 'Сейчас все присоединились к звонку.', uk: 'Зараз усі приєдналися до дзвінка.', es: 'Ahora todos se han unido a la llamada.' },
      constructions: ['present-perfect'],
      explanation: {
        title: { ru: 'has joined — уже на месте', uk: 'has joined — уже на місці', es: 'has joined — ya están dentro' },
        rule: { ru: 'has joined значит «уже зашёл». Результат виден сейчас: все на созвоне, можно начинать.', uk: 'has joined значить «уже зайшов». Результат видно зараз: усі на дзвінку, можна починати.', es: 'has joined significa «ya entró». El resultado se ve ahora: todos en la llamada.' },
        why: { ru: 'Так открываешь встречу: проверил, что все тут, — и стартуешь спокойно.', uk: 'Так відкриваєш зустріч: перевірив, що всі тут, — і стартуєш спокійно.', es: 'Así abres la reunión: confirmas que están todos y arrancas tranquilo.' },
        commonMistake: { ru: 'Не говори «Everyone have joined». С everyone бери has.', uk: 'Не кажи «Everyone have joined». З everyone бери has.', es: 'No digas «Everyone have joined». Con everyone usa has.' },
      },
      words: [
        { text: 'Everyone', partOfSpeech: 'pronoun', distractors: ['Nobody', 'Someone', 'Anybody', 'Everything', 'Nothing'] },
        { text: 'has', partOfSpeech: 'verb', distractors: ['had', 'have', 'gets', 'holds', 'keeps'] },
        { text: 'joined', partOfSpeech: 'verb', distractors: ['cooked', 'painted', 'cleaned', 'walked', 'opened'] },
        { text: 'the', partOfSpeech: 'determiner', distractors: ['a', 'my', 'this', 'that', 'each'] },
        { text: 'call', partOfSpeech: 'noun', distractors: ['book', 'road', 'lunch', 'desk', 'wall'] },
        { text: 'now', partOfSpeech: 'adverb', distractors: ['green', 'warm', 'empty', 'round', 'soft'] },
      ],
    },
    {
      id: 'mitap_d42_p2',
      english: 'I have shared the agenda with you.',
      meaning: { ru: 'Я поделился повесткой с вами.', uk: 'Я поділився порядком денним з вами.', es: 'Os he compartido la agenda.' },
      constructions: ['present-perfect'],
      explanation: {
        title: { ru: 'have shared — уже отправил', uk: 'have shared — уже надіслав', es: 'have shared — ya lo envié' },
        rule: { ru: 'have shared значит «уже поделился». Agenda — список тем встречи, он уже у всех.', uk: 'have shared значить «уже поділився». Agenda — список тем зустрічі, він уже в усіх.', es: 'have shared significa «ya compartí». Agenda — la lista de temas, ya la tienen.' },
        why: { ru: 'В начале созвона говоришь, что повестка готова, — всем ясно, о чём речь.', uk: 'На початку дзвінка кажеш, що порядок готовий, — усім ясно, про що мова.', es: 'Al inicio dices que la agenda está lista; todos saben de qué se trata.' },
        commonMistake: { ru: 'Не говори «I have share». После have бери shared.', uk: 'Не кажи «I have share». Після have бери shared.', es: 'No digas «I have share». Tras have usa shared.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'they', 'we', 'you'] },
        { text: 'have', partOfSpeech: 'verb', distractors: ['has', 'had', 'get', 'hold', 'keep'] },
        { text: 'shared', partOfSpeech: 'verb', distractors: ['cooked', 'painted', 'cleaned', 'walked', 'driven'] },
        { text: 'the', partOfSpeech: 'determiner', distractors: ['a', 'my', 'this', 'that', 'each'] },
        { text: 'agenda', partOfSpeech: 'noun', distractors: ['garden', 'river', 'kitchen', 'window', 'ladder'] },
        { text: 'with', partOfSpeech: 'preposition', distractors: ['about', 'from', 'near', 'over', 'under'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['they', 'we', 'he', 'she', 'it'] },
      ],
    },
    {
      id: 'mitap_d42_p3',
      english: 'We will start with the budget.',
      meaning: { ru: 'Мы начнём с бюджета.', uk: 'Ми почнемо з бюджету.', es: 'Empezaremos con el presupuesto.' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'will start — начнём', uk: 'will start — почнемо', es: 'will start — empezaremos' },
        rule: { ru: 'will start значит «начнём потом». With the budget — «с бюджета», первый пункт повестки.', uk: 'will start значить «почнемо потім». With the budget — «з бюджету», перший пункт.', es: 'will start significa «empezaremos». With the budget — «con el presupuesto», el primer punto.' },
        why: { ru: 'Так задаёшь порядок встречи: называешь первый пункт, и все следуют за тобой.', uk: 'Так задаєш порядок зустрічі: називаєш перший пункт, і всі йдуть за тобою.', es: 'Así marcas el orden: nombras el primer punto y todos te siguen.' },
        commonMistake: { ru: 'Не говори «We will starts». После will бери start без -s.', uk: 'Не кажи «We will starts». Після will бери start без -s.', es: 'No digas «We will starts». Tras will usa start sin -s.' },
      },
      words: [
        { text: 'We', partOfSpeech: 'pronoun', distractors: ['they', 'he', 'she', 'you', 'it'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'would'] },
        { text: 'start', partOfSpeech: 'verb', distractors: ['sleep', 'arrive', 'belong', 'happen', 'sing'] },
        { text: 'with', partOfSpeech: 'preposition', distractors: ['about', 'from', 'near', 'over', 'under'] },
        { text: 'the', partOfSpeech: 'determiner', distractors: ['a', 'our', 'this', 'that', 'each'] },
        { text: 'budget', partOfSpeech: 'noun', distractors: ['garden', 'river', 'kitchen', 'window', 'ladder'] },
      ],
    },
    {
      id: 'mitap_d42_p4',
      english: 'I will keep us on time.',
      meaning: { ru: 'Я буду следить за временем.', uk: 'Я стежитиму за часом.', es: 'Yo controlaré el tiempo.' },
      constructions: ['future-simple'],
      explanation: {
        title: { ru: 'keep on time — держать тайминг', uk: 'keep on time — тримати час', es: 'keep on time — controlar el tiempo' },
        rule: { ru: 'will keep значит «буду держать». On time — «по времени», встреча не затянется.', uk: 'will keep значить «триматиму». On time — «за часом», зустріч не затягнеться.', es: 'will keep significa «mantendré». On time — «a tiempo», la reunión no se alarga.' },
        why: { ru: 'Так берёшь тайминг на себя: люди видят, что ведущий следит за часами.', uk: 'Так береш час на себе: люди бачать, що ведучий стежить за годинником.', es: 'Así te encargas del tiempo: ven que quien dirige cuida el reloj.' },
        commonMistake: { ru: 'Не говори «in time» про тайминг. Здесь нужно on time.', uk: 'Не кажи «in time» про час. Тут потрібно on time.', es: 'No digas «in time» para el control. Aquí va on time.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['he', 'she', 'they', 'we', 'you'] },
        { text: 'will', partOfSpeech: 'modal', distractors: ['can', 'must', 'should', 'may', 'would'] },
        { text: 'keep', partOfSpeech: 'verb', distractors: ['cook', 'drive', 'paint', 'sing', 'read'] },
        { text: 'us', partOfSpeech: 'pronoun', distractors: ['them', 'him', 'her', 'me', 'you'] },
        { text: 'on', partOfSpeech: 'preposition', distractors: ['of', 'off', 'up', 'into', 'onto'] },
        { text: 'time', partOfSpeech: 'noun', distractors: ['garden', 'river', 'kitchen', 'window', 'ladder'] },
      ],
    },
    {
      id: 'mitap_d42_p5',
      english: 'Thanks for sharing your update.',
      meaning: { ru: 'Спасибо, что поделился апдейтом.', uk: 'Дякую, що поділився апдейтом.', es: 'Gracias por compartir tu novedad.' },
      constructions: ['gerund'],
      explanation: {
        title: { ru: 'for sharing — за то, что поделился', uk: 'for sharing — за те, що поділився', es: 'for sharing — por compartir' },
        rule: { ru: 'После for бери слово с -ing: sharing — «делиться». Так благодаришь за уже сделанное.', uk: 'Після for бери слово з -ing: sharing — «ділитися». Так дякуєш за вже зроблене.', es: 'Tras for usa la palabra en -ing: sharing — «compartir». Así agradeces lo hecho.' },
        why: { ru: 'Так вежливо закрываешь чей-то пункт и плавно возвращаешь фокус к повестке.', uk: 'Так ввічливо закриваєш чийсь пункт і плавно повертаєш фокус до порядку.', es: 'Así cierras con cortesía su punto y devuelves el foco a la agenda.' },
        commonMistake: { ru: 'Не говори «Thanks for share». После for нужно sharing.', uk: 'Не кажи «Thanks for share». Після for потрібно sharing.', es: 'No digas «Thanks for share». Tras for va sharing.' },
      },
      words: [
        { text: 'Thanks', partOfSpeech: 'noun', distractors: ['sorry', 'hello', 'please', 'welcome', 'goodbye'] },
        { text: 'for', partOfSpeech: 'preposition', distractors: ['with', 'about', 'near', 'over', 'under'] },
        { text: 'sharing', partOfSpeech: 'verb', distractors: ['cooking', 'painting', 'cleaning', 'walking', 'driving'] },
        { text: 'your', partOfSpeech: 'determiner', distractors: ['a', 'this', 'that', 'each', 'the'] },
        { text: 'update', partOfSpeech: 'noun', distractors: ['garden', 'river', 'kitchen', 'window', 'ladder'] },
      ],
    },
    {
      id: 'mitap_d42_p6',
      english: 'We have finished the main points.',
      meaning: { ru: 'Мы закончили с главными пунктами.', uk: 'Ми закінчили з головними пунктами.', es: 'Hemos terminado los puntos principales.' },
      constructions: ['present-perfect'],
      explanation: {
        title: { ru: 'have finished — закончили', uk: 'have finished — закінчили', es: 'have finished — hemos terminado' },
        rule: { ru: 'have finished значит «уже закончили». Main points — главные пункты повестки, всё пройдено.', uk: 'have finished значить «уже закінчили». Main points — головні пункти, усе пройдено.', es: 'have finished significa «ya terminamos». Main points — los puntos clave, todo visto.' },
        why: { ru: 'Так подводишь итог: говоришь, что всё пройдено, и встреча идёт к концу.', uk: 'Так підбиваєш підсумок: кажеш, що все пройдено, і зустріч іде до кінця.', es: 'Así resumes: dices que está todo visto y la reunión va al cierre.' },
        commonMistake: { ru: 'Не говори «We have finish». После have бери finished.', uk: 'Не кажи «We have finish». Після have бери finished.', es: 'No digas «We have finish». Tras have usa finished.' },
      },
      words: [
        { text: 'We', partOfSpeech: 'pronoun', distractors: ['they', 'he', 'she', 'you', 'it'] },
        { text: 'have', partOfSpeech: 'verb', distractors: ['has', 'had', 'get', 'hold', 'keep'] },
        { text: 'finished', partOfSpeech: 'verb', distractors: ['cooked', 'painted', 'cleaned', 'walked', 'driven'] },
        { text: 'the', partOfSpeech: 'determiner', distractors: ['a', 'our', 'this', 'that', 'each'] },
        { text: 'main', partOfSpeech: 'adjective', distractors: ['red', 'cold', 'loud', 'heavy', 'tall'] },
        { text: 'points', partOfSpeech: 'noun', distractors: ['gardens', 'rivers', 'kitchens', 'windows', 'ladders'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'joined', partOfSpeech: 'verb', translation: { ru: 'присоединился', uk: 'приєднався', es: 'se ha unido' }, example: 'Everyone has joined the call now.' },
    { word: 'agenda', partOfSpeech: 'noun', translation: { ru: 'повестка', uk: 'порядок денний', es: 'agenda' }, example: 'I have shared the agenda with you.' },
    { word: 'budget', partOfSpeech: 'noun', translation: { ru: 'бюджет', uk: 'бюджет', es: 'presupuesto' }, example: 'We will start with the budget.' },
    { word: 'keep', partOfSpeech: 'verb', translation: { ru: 'держать', uk: 'тримати', es: 'mantener' }, example: 'I will keep us on time.' },
    { word: 'sharing', partOfSpeech: 'noun', translation: { ru: 'делиться', uk: 'ділитися', es: 'compartir' }, example: 'Thanks for sharing your update.' },
    { word: 'finished', partOfSpeech: 'verb', translation: { ru: 'закончили', uk: 'закінчили', es: 'hemos terminado' }, example: 'We have finished the main points.' },
  ],
};

export const MITAP_CONTENT_DAYS: PlanContentDay[] = [
  MITAP_DAY_1,
  MITAP_DAY_2,
  MITAP_DAY_3,
  MITAP_DAY_4,
  MITAP_DAY_5,
  MITAP_DAY_6,
  MITAP_DAY_7,
  MITAP_DAY_8,
  MITAP_DAY_9,
  MITAP_DAY_10,
  MITAP_DAY_11,
  MITAP_DAY_12,
  MITAP_DAY_13,
  MITAP_DAY_14,
  MITAP_DAY_15,
  MITAP_DAY_16,
  MITAP_DAY_17,
  MITAP_DAY_18,
  MITAP_DAY_19,
  MITAP_DAY_20,
  MITAP_DAY_21,
  MITAP_DAY_22,
  MITAP_DAY_23,
  MITAP_DAY_24,
  MITAP_DAY_25,
  MITAP_DAY_26,
  MITAP_DAY_27,
  MITAP_DAY_28,
  MITAP_DAY_29,
  MITAP_DAY_30,
  MITAP_DAY_31,
  MITAP_DAY_32,
  MITAP_DAY_33,
  MITAP_DAY_34,
  MITAP_DAY_35,
  MITAP_DAY_36,
  MITAP_DAY_37,
  MITAP_DAY_38,
  MITAP_DAY_39,
  MITAP_DAY_40,
  MITAP_DAY_41,
  MITAP_DAY_42,
];
