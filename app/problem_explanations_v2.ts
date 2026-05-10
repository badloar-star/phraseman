import type { WordCategory } from './phrase_analytics';

export interface TriLang {
  ru: string;
  uk: string;
  es: string;
}

export type CoachAccent = 'gold' | 'red' | 'green' | 'blue' | 'purple';

export type CoachBlockType =
  | 'root_problem'
  | 'mental_model'
  | 'main_rule'
  | 'trap'
  | 'example'
  | 'memory_hook';

export interface CoachBlock {
  type: CoachBlockType;
  accent: CoachAccent;
  icon: string;
  title: TriLang;
  body: TriLang;
}

export interface CoachExercise {
  situation: TriLang;
  question: TriLang;
  sentence: string;
  options: string[];
  correctIndex: number;
  correctReason: TriLang;
  wrongReason: TriLang;
  coachTip: TriLang;
}

export interface ProblemCoachLesson {
  category: WordCategory;

  heroLabel: TriLang;
  heroTitle: TriLang;
  heroSubtitle: TriLang;

  diagnosisTitle: TriLang;
  diagnosisText: TriLang;

  blocks: CoachBlock[];

  exerciseIntroTitle: TriLang;
  exerciseIntroText: TriLang;
  exercises: CoachExercise[];

  consolidationTitle: TriLang;
  consolidationText: TriLang;
}

const ARTICLE_LESSON: ProblemCoachLesson = {
  category: 'article',

  heroLabel: {
    ru: 'PERSONAL DIAGNOSIS',
    uk: 'PERSONAL DIAGNOSIS',
    es: 'PERSONAL DIAGNOSIS',
  },

  heroTitle: {
    ru: 'Артикли ломаются не из-за памяти',
    uk: "Артиклі ламаються не через пам'ять",
    es: 'Los artículos no fallan por memoria',
  },

  heroSubtitle: {
    ru: 'Проблема глубже: ты не всегда чувствуешь, новый предмет в разговоре или уже знакомый.',
    uk: 'Проблема глибша: ти не завжди відчуваєш, новий предмет у розмові чи вже знайомий.',
    es: 'El problema es más profundo: no siempre sientes si el objeto es nuevo en la conversación o ya conocido.',
  },

  diagnosisTitle: {
    ru: 'Что показал анализ',
    uk: 'Що показав аналіз',
    es: 'Qué mostró el análisis',
  },

  diagnosisText: {
    ru: 'Я вижу повторяющийся паттерн: ты часто выбираешь артикль по самому слову, а не по ситуации. Но в английском артикль зависит не от слова, а от того, что уже известно слушателю.',
    uk: 'Я бачу повторюваний патерн: ти часто обираєш артикль за самим словом, а не за ситуацією. Але в англійській артикль залежить не від слова, а від того, що вже відомо слухачу.',
    es: 'Veo un patrón repetido: a menudo eliges el artículo por la palabra misma, no por la situación. Pero en inglés el artículo no depende de la palabra, sino de lo que el oyente ya sabe.',
  },

  blocks: [
    {
      type: 'root_problem',
      accent: 'red',
      icon: 'alert-circle-outline',
      title: {
        ru: 'Главная поломка',
        uk: 'Головна поломка',
        es: 'El fallo principal',
      },
      body: {
        ru: 'Ты смотришь на существительное и думаешь: "Какой артикль ставится с этим словом?" Это неправильный вопрос. Правильный вопрос: "Слушатель уже знает, о каком предмете я говорю?"',
        uk: 'Ти дивишся на іменник і думаєш: "Який артикль ставиться з цим словом?" Це неправильне питання. Правильне питання: "Слухач уже знає, про який предмет я говорю?"',
        es: 'Miras el sustantivo y piensas: "¿Qué artículo va con esta palabra?" Esa es la pregunta equivocada. La pregunta correcta es: "¿El oyente ya sabe de qué objeto hablo?"',
      },
    },
    {
      type: 'mental_model',
      accent: 'gold',
      icon: 'bulb-outline',
      title: {
        ru: 'Модель, которая всё упрощает',
        uk: 'Модель, яка все спрощує',
        es: 'El modelo que lo simplifica todo',
      },
      body: {
        ru: 'Артикль — это не украшение перед словом. Это маленькая метка для слушателя. A/an говорит: "Сейчас я ввожу новый объект". The говорит: "Мы оба уже понимаем, о каком объекте речь".',
        uk: "Артикль — це не прикраса перед словом. Це маленька мітка для слухача. A/an каже: \"Зараз я вводжу новий об'єкт\". The каже: \"Ми обоє вже розуміємо, про який об'єкт ідеться\".",
        es: 'El artículo no es una decoración antes de la palabra. Es una pequeña señal para el oyente. A/an dice: "Ahora introduzco un objeto nuevo". The dice: "Ambos ya entendemos de qué objeto hablo".',
      },
    },
    {
      type: 'main_rule',
      accent: 'green',
      icon: 'checkmark-circle-outline',
      title: {
        ru: 'Самое важное правило',
        uk: 'Найважливіше правило',
        es: 'La regla más importante',
      },
      body: {
        ru: 'Первый раз в истории — a/an. Второй раз, когда объект уже появился в голове слушателя — the. Например: I booked a hotel. The hotel was near the airport.',
        uk: "Перший раз в історії — a/an. Другий раз, коли об'єкт уже з'явився в голові слухача — the. Наприклад: I booked a hotel. The hotel was near the airport.",
        es: 'Primera vez en la historia — a/an. Segunda vez, cuando el objeto ya existe en la mente del oyente — the. Por ejemplo: I booked a hotel. The hotel was near the airport.',
      },
    },
    {
      type: 'trap',
      accent: 'red',
      icon: 'close-circle-outline',
      title: {
        ru: 'Ловушка, в которую ты попадаешь',
        uk: 'Пастка, у яку ти потрапляєш',
        es: 'La trampa en la que caes',
      },
      body: {
        ru: 'The не значит "важный". The значит "уже известный". Не ставь the просто потому, что слово звучит конкретно или важно. Сначала объект должен появиться в разговоре.',
        uk: 'The не означає "важливий". The означає "уже відомий". Не став the просто тому, що слово звучить конкретно або важливо. Спочатку об\'єкт має з\'явитися в розмові.',
        es: 'The no significa "importante". The significa "ya conocido". No uses the solo porque la palabra suena concreta o importante. Primero el objeto debe aparecer en la conversación.',
      },
    },
    {
      type: 'example',
      accent: 'blue',
      icon: 'chatbubble-ellipses-outline',
      title: {
        ru: 'Мини-сцена',
        uk: 'Міні-сцена',
        es: 'Mini escena',
      },
      body: {
        ru: 'Ты говоришь другу: "I saw a dog near my house." Для друга это новый пёс. Через секунду: "The dog followed me." Теперь это уже тот самый пёс. Он появился в истории.',
        uk: 'Ти кажеш другу: "I saw a dog near my house." Для друга це новий пес. За секунду: "The dog followed me." Тепер це вже той самий пес. Він з\'явився в історії.',
        es: 'Le dices a un amigo: "I saw a dog near my house." Para tu amigo es un perro nuevo. Un segundo después: "The dog followed me." Ahora ya es ese perro. Ya apareció en la historia.',
      },
    },
    {
      type: 'trap',
      accent: 'blue',
      icon: 'volume-medium-outline',
      title: {
        ru: 'A или AN — выбор по звуку, не по букве',
        uk: 'A або AN — вибір за звуком, не за буквою',
        es: 'A o AN — se elige por sonido, no por letra',
      },
      body: {
        ru: 'Перед словом с гласного ЗВУКА — an. Перед согласным звуком — a. Смотри на произношение, а не на написание:\n• an interesting (звук [ɪ]) ✓\n• an hour (немое h, звук [aʊ]) ✓\n• a user (звук [j], не гласный) ✓\n• a European (звук [j]) ✓\nПравило простое: скажи вслух — если рот открывается на гласный, нужен an.',
        uk: 'Перед словом з голосного ЗВУКУ — an. Перед приголосним звуком — a. Дивись на вимову, а не на написання:\n• an interesting (звук [ɪ]) ✓\n• an hour (німе h, звук [aʊ]) ✓\n• a user (звук [j], не голосний) ✓\n• a European (звук [j]) ✓\nПравило просте: скажи вголос — якщо рот відкривається на голосний, потрібен an.',
        es: 'Antes de palabra con SONIDO vocálico — an. Antes de sonido consonántico — a. Mira la pronunciación, no la escritura:\n• an interesting (sonido [ɪ]) ✓\n• an hour (h muda, sonido [aʊ]) ✓\n• a user (sonido [j], no vocálico) ✓\n• a European (sonido [j]) ✓\nRegla simple: dilo en voz alta — si la boca se abre en vocal, necesitas an.',
      },
    },
    {
      type: 'example',
      accent: 'green',
      icon: 'layers-outline',
      title: {
        ru: 'Нулевой артикль: когда артикля нет совсем',
        uk: 'Нульовий артикль: коли артикля немає зовсім',
        es: 'Artículo cero: cuando no hay artículo',
      },
      body: {
        ru: 'Без артикля — три устойчивых случая:\n1. Названия языков: speak English, learn Spanish\n2. Виды спорта: play football, play tennis\n3. Имена людей, городов, стран: Paris, Ukraine, Anna\n\nВо всех остальных случаях с исчисляемым существительным в единственном числе артикль обязателен.',
        uk: 'Без артикля — три сталих випадки:\n1. Назви мов: speak English, learn Spanish\n2. Види спорту: play football, play tennis\n3. Імена людей, міст, країн: Paris, Ukraine, Anna\n\nУ всіх інших випадках з лічильним іменником в однині артикль обов\'язковий.',
        es: 'Sin artículo — tres casos establecidos:\n1. Nombres de idiomas: speak English, learn Spanish\n2. Deportes: play football, play tennis\n3. Nombres de personas, ciudades, países: Paris, Ukraine, Anna\n\nEn todos los demás casos con sustantivo contable en singular el artículo es obligatorio.',
      },
    },
    {
      type: 'memory_hook',
      accent: 'purple',
      icon: 'sparkles-outline',
      title: {
        ru: 'Как запомнить без боли',
        uk: "Як запам'ятати без болю",
        es: 'Cómo recordarlo sin dolor',
      },
      body: {
        ru: 'A/an открывает дверь новому предмету. The возвращается к предмету, который уже вошёл в комнату. Артикли не пытаются испортить тебе жизнь. Они просто требуют думать как рассказчик.',
        uk: 'A/an відкриває двері новому предмету. The повертається до предмета, який уже зайшов у кімнату. Артиклі не намагаються зіпсувати тобі життя. Вони просто вимагають думати як оповідач.',
        es: 'A/an abre la puerta a un objeto nuevo. The vuelve a un objeto que ya entró en la habitación. Los artículos no intentan arruinarte la vida. Solo te piden pensar como narrador.',
      },
    },
  ],

  exerciseIntroTitle: {
    ru: 'Теперь проверим не память, а мышление',
    uk: "Тепер перевіримо не пам'ять, а мислення",
    es: 'Ahora comprobemos no la memoria, sino el pensamiento',
  },

  exerciseIntroText: {
    ru: 'Не угадывай артикль. Смотри на историю: предмет новый или уже знакомый?',
    uk: 'Не вгадуй артикль. Дивись на історію: предмет новий чи вже знайомий?',
    es: 'No adivines el artículo. Mira la historia: ¿el objeto es nuevo o ya conocido?',
  },

  exercises: [
    {
      situation: {
        ru: 'Ты рассказываешь другу, что забронировал отель.',
        uk: 'Ти розповідаєш другу, що забронював готель.',
        es: 'Le cuentas a un amigo que reservaste un hotel.',
      },
      question: {
        ru: 'Выбери вариант, который звучит естественно:',
        uk: 'Обери варіант, який звучить природно:',
        es: 'Elige la opción que suena natural:',
      },
      sentence: 'I booked ___ hotel near the airport. ___ hotel was cheaper than I expected.',
      options: ['a / The', 'the / A', 'a / A', 'the / The'],
      correctIndex: 0,
      correctReason: {
        ru: 'Да. Сначала hotel появляется впервые, поэтому a hotel. Потом ты возвращаешься к тому же отелю, поэтому the hotel. Ты поймал главную логику артиклей.',
        uk: "Так. Спочатку hotel з'являється вперше, тому a hotel. Потім ти повертаєшся до того самого готелю, тому the hotel. Ти зловив головну логіку артиклів.",
        es: 'Sí. Primero hotel aparece por primera vez, por eso a hotel. Luego vuelves al mismo hotel, por eso the hotel. Captaste la lógica principal de los artículos.',
      },
      wrongReason: {
        ru: 'Выбрал "the / A"? В первой части hotel появляется впервые — слушатель ещё не знает, о каком отеле речь. The там рано. Во второй части это уже тот самый отель — нужен The.\n\nВыбрал "a / A"? Второй раз мы возвращаемся к уже знакомому отелю. Здесь нужен The, а не снова a.\n\nВыбрал "the / The"? Hotel появляется в самом начале впервые — слушатель его ещё не знает. Нельзя использовать the для нового объекта.',
        uk: 'Вибрав "the / A"? У першій частині hotel з\'являється вперше — слухач ще не знає, про який готель йдеться. The там зарано. У другій частині це вже той самий готель — потрібен The.\n\nВибрав "a / A"? Вдруге ми повертаємось до вже знайомого готелю. Тут потрібен The, а не знову a.\n\nВибрав "the / The"? Hotel з\'являється на самому початку вперше — слухач його ще не знає. Не можна використовувати the для нового об\'єкта.',
        es: '¿Elegiste "the / A"? En la primera parte hotel aparece por primera vez — el oyente aún no sabe de qué hotel hablas. The es demasiado pronto. En la segunda ya es el mismo hotel conocido — necesitas The.\n\n¿Elegiste "a / A"? La segunda vez volvemos al hotel ya conocido. Aquí necesitas The, no a otra vez.\n\n¿Elegiste "the / The"? Hotel aparece al principio por primera vez — el oyente aún no lo conoce. No se puede usar the para un objeto nuevo.',
      },
      coachTip: {
        ru: 'Мини-формула: сначала a/an, потом the, если говоришь о том же самом объекте.',
        uk: 'Міні-формула: спочатку a/an, потім the, якщо говориш про той самий об\'єкт.',
        es: 'Mini fórmula: primero a/an, luego the, si hablas del mismo objeto.',
      },
    },
    {
      situation: {
        ru: 'Ты впервые упоминаешь человека, которого встретил утром.',
        uk: 'Ти вперше згадуєш людину, яку зустрів зранку.',
        es: 'Mencionas por primera vez a una persona que conociste por la mañana.',
      },
      question: {
        ru: 'Какой артикль нужен?',
        uk: 'Який артикль потрібен?',
        es: '¿Qué artículo se necesita?',
      },
      sentence: 'I met ___ interesting man this morning.',
      options: ['an', 'a', 'the', '-'],
      correctIndex: 0,
      correctReason: {
        ru: 'Верно. Man появляется впервые, значит нужен неопределённый артикль. Interesting начинается с гласного звука, поэтому an interesting man.',
        uk: 'Вірно. Man з\'являється вперше, отже потрібен неозначений артикль. Interesting починається з голосного звука, тому an interesting man.',
        es: 'Correcto. Man aparece por primera vez, así que necesitamos un artículo indefinido. Interesting empieza con sonido vocálico, por eso an interesting man.',
      },
      wrongReason: {
        ru: 'Выбрал "a"? Ты правильно понял, что нужен неопределённый артикль — человек впервые упомянут. Но перед "interesting" нужен "an", а не "a": слово начинается с гласного звука [ɪ]. Правило: a → перед согласным звуком, an → перед гласным звуком.\n\nВыбрал "the"? Человек появляется в разговоре впервые, слушатель его ещё не знает. The появится только при повторном упоминании.\n\nУбрал артикль? С исчисляемым существительным в единственном числе артикль обязателен.',
        uk: 'Вибрав "a"? Ти правильно зрозумів, що потрібен неозначений артикль — людина згадується вперше. Але перед "interesting" потрібен "an", а не "a": слово починається з голосного звука [ɪ]. Правило: a → перед приголосним звуком, an → перед голосним звуком.\n\nВибрав "the"? Людина з\'являється в розмові вперше, слухач її ще не знає. The з\'явиться лише при повторному згадуванні.\n\nПрибрав артикль? З злічуваним іменником в однині артикль обов\'язковий.',
        es: '¿Elegiste "a"? Entendiste bien que se necesita el artículo indefinido — la persona se menciona por primera vez. Pero antes de "interesting" va "an", no "a": la palabra empieza con sonido vocálico [ɪ]. Regla: a → antes de sonido consonántico, an → antes de sonido vocálico.\n\n¿Elegiste "the"? La persona aparece en la conversación por primera vez, el oyente aún no la conoce. The aparecerá solo cuando se mencione de nuevo.\n\n¿Quitaste el artículo? Con un sustantivo contable en singular el artículo es obligatorio.',
      },
      coachTip: {
        ru: 'A или an выбираем не по букве, а по звуку: an interesting, an hour, a user.',
        uk: 'A або an обираємо не за буквою, а за звуком: an interesting, an hour, a user.',
        es: 'A o an se elige por sonido, no por letra: an interesting, an hour, a user.',
      },
    },
    {
      situation: {
        ru: 'Ты говоришь о солнце. Его не нужно "вводить" в разговор: все и так понимают, о чём речь.',
        uk: 'Ти говориш про сонце. Його не треба "вводити" в розмову: усі й так розуміють, про що йдеться.',
        es: 'Hablas del sol. No necesitas "introducirlo" en la conversación: todos saben de qué hablas.',
      },
      question: {
        ru: 'Выбери естественный вариант:',
        uk: 'Обери природний варіант:',
        es: 'Elige la opción natural:',
      },
      sentence: '___ sun was already high in the sky.',
      options: ['The', 'A', 'An', '-'],
      correctIndex: 0,
      correctReason: {
        ru: 'Правильно. The sun — потому что солнце уникальное в нашей обычной картине мира. Слушателю не нужно объяснять, какое именно солнце ты имеешь в виду.',
        uk: 'Правильно. The sun — бо сонце унікальне в нашій звичайній картині світу. Слухачу не треба пояснювати, яке саме сонце ти маєш на увазі.',
        es: 'Correcto. The sun — porque el sol es único en nuestra visión normal del mundo. El oyente no necesita que le expliques qué sol quieres decir.',
      },
      wrongReason: {
        ru: 'Выбрал "A" или "An"? Солнце — не новый объект, который мы впервые вводим в разговор. Все и так знают, о каком солнце речь.\n\nУбрал артикль? Без артикля говорим про абстрактные понятия или язык (speak English). Но sun — конкретный уникальный объект, он требует the.',
        uk: 'Вибрав "A" або "An"? Сонце — не новий об\'єкт, який ми вперше вводимо в розмову. Усі й так знають, про яке сонце йдеться.\n\nПрибрав артикль? Без артикля говоримо про абстрактні поняття або мову (speak English). Але sun — конкретний унікальний об\'єкт, він потребує the.',
        es: '¿Elegiste "A" o "An"? El sol no es un objeto nuevo que introducimos por primera vez. Todos saben de qué sol hablamos.\n\n¿Quitaste el artículo? Sin artículo hablamos de conceptos abstractos o idiomas (speak English). Pero sun es un objeto único y concreto — necesita the.',
      },
      coachTip: {
        ru: 'Уникальные вещи часто получают the: the sun, the moon, the sky, the internet.',
        uk: 'Унікальні речі часто отримують the: the sun, the moon, the sky, the internet.',
        es: 'Las cosas únicas suelen llevar the: the sun, the moon, the sky, the internet.',
      },
    },
    {
      situation: {
        ru: 'Ты говоришь о языке как о навыке, а не о конкретной книге или курсе.',
        uk: 'Ти говориш про мову як про навичку, а не про конкретну книгу чи курс.',
        es: 'Hablas del idioma como habilidad, no de un libro o curso concreto.',
      },
      question: {
        ru: 'Нужен ли артикль?',
        uk: 'Чи потрібен артикль?',
        es: '¿Se necesita artículo?',
      },
      sentence: 'I want to improve ___ English.',
      options: ['-', 'the', 'a', 'an'],
      correctIndex: 0,
      correctReason: {
        ru: 'Да. Когда говорим о языке в общем, артикль не нужен: learn English, speak Spanish, improve Ukrainian.',
        uk: 'Так. Коли говоримо про мову загалом, артикль не потрібен: learn English, speak Spanish, improve Ukrainian.',
        es: 'Sí. Cuando hablamos de un idioma en general, no usamos artículo: learn English, speak Spanish, improve Ukrainian.',
      },
      wrongReason: {
        ru: 'С языками в общем артикль не ставится. Не the English, не an English. Просто English.',
        uk: 'З мовами загалом артикль не ставиться. Не the English, не an English. Просто English.',
        es: 'Con idiomas en general no usamos artículo. No the English, no an English. Solo English.',
      },
      coachTip: {
        ru: 'Три категории без артикля: языки (speak English), виды спорта (play tennis), имена/города/страны (Anna, Paris, France).',
        uk: 'Три категорії без артикля: мови (speak English), види спорту (play tennis), імена/міста/країни (Anna, Paris, France).',
        es: 'Tres categorías sin artículo: idiomas (speak English), deportes (play tennis), nombres/ciudades/países (Anna, Paris, France).',
      },
    },
    {
      situation: {
        ru: 'Ты называешь профессию человека.',
        uk: 'Ти називаєш професію людини.',
        es: 'Nombras la profesión de una persona.',
      },
      question: {
        ru: 'Выбери правильный вариант:',
        uk: 'Обери правильний варіант:',
        es: 'Elige la opción correcta:',
      },
      sentence: 'My sister is ___ engineer.',
      options: ['an', 'a', 'the', '-'],
      correctIndex: 0,
      correctReason: {
        ru: 'Верно. С профессиями обычно нужен a/an: a doctor, a teacher, an engineer. Engineer начинается с гласного звука, поэтому an.',
        uk: 'Вірно. З професіями зазвичай потрібен a/an: a doctor, a teacher, an engineer. Engineer починається з голосного звука, тому an.',
        es: 'Correcto. Con profesiones normalmente usamos a/an: a doctor, a teacher, an engineer. Engineer empieza con sonido vocálico, por eso an.',
      },
      wrongReason: {
        ru: 'Выбрал "a"? Правильное направление — профессии действительно требуют неопределённого артикля. Но "engineer" начинается с гласного звука [e], поэтому нужен "an", а не "a". Правило: перед гласным звуком — an.\n\nВыбрал "the"? Мы не говорим о конкретном инженере, которого уже знаем. Это описание профессии — она одна из инженеров.\n\nУбрал артикль? С профессиями после be артикль обязателен: she is a/an [профессия].',
        uk: 'Вибрав "a"? Правильний напрям — професії дійсно потребують неозначеного артикля. Але "engineer" починається з голосного звука [e], тому потрібен "an", а не "a". Правило: перед голосним звуком — an.\n\nВибрав "the"? Ми не говоримо про конкретного інженера, якого вже знаємо. Це опис професії — вона одна з інженерів.\n\nПрибрав артикль? З професіями після be артикль обов\'язковий: she is a/an [професія].',
        es: '¿Elegiste "a"? Vas en la dirección correcta — las profesiones sí necesitan artículo indefinido. Pero "engineer" empieza con sonido vocálico [e], por eso necesitas "an", no "a". Regla: antes de sonido vocálico — an.\n\n¿Elegiste "the"? No estamos hablando de un ingeniero específico que ya conocemos. Es una descripción de profesión — ella es una de los ingenieros.\n\n¿Quitaste el artículo? Con profesiones después de be el artículo es obligatorio: she is a/an [profesión].',
      },
      coachTip: {
        ru: 'Профессия после be почти всегда просит a/an: He is a driver. She is an artist.',
        uk: 'Професія після be майже завжди просить a/an: He is a driver. She is an artist.',
        es: 'Una profesión después de be casi siempre pide a/an: He is a driver. She is an artist.',
      },
    },
    {
      situation: {
        ru: 'Ты говоришь о музыкальном инструменте.',
        uk: 'Ти говориш про музичний інструмент.',
        es: 'Hablas de un instrumento musical.',
      },
      question: {
        ru: 'Что звучит правильно?',
        uk: 'Що звучить правильно?',
        es: '¿Qué suena correcto?',
      },
      sentence: 'She plays ___ guitar beautifully.',
      options: ['the', 'a', 'an', '-'],
      correctIndex: 0,
      correctReason: {
        ru: 'Правильно. С музыкальными инструментами обычно используем the: play the guitar, play the piano, play the violin.',
        uk: 'Правильно. З музичними інструментами зазвичай використовуємо the: play the guitar, play the piano, play the violin.',
        es: 'Correcto. Con instrumentos musicales normalmente usamos the: play the guitar, play the piano, play the violin.',
      },
      wrongReason: {
        ru: 'Выбрал "a"? Перед guitar не нужен неопределённый артикль — мы не вводим гитару в разговор как новый объект. Это устойчивое выражение с the.\n\nВыбрал "an"? Guitar начинается с согласного звука [ɡ], поэтому an невозможен.\n\nУбрал артикль? Без артикля говорим о спорте (play football, play tennis), но не о музыкальных инструментах. С инструментами — всегда the: play the guitar, play the piano.',
        uk: 'Вибрав "a"? Перед guitar не потрібен неозначений артикль — ми не вводимо гітару в розмову як новий об\'єкт. Це сталий вираз з the.\n\nВибрав "an"? Guitar починається з приголосного звука [ɡ], тому an неможливий.\n\nПрибрав артикль? Без артикля говоримо про спорт (play football, play tennis), але не про музичні інструменти. З інструментами — завжди the: play the guitar, play the piano.',
        es: '¿Elegiste "a"? Antes de guitar no usamos artículo indefinido — no estamos introduciendo la guitarra como objeto nuevo. Es una expresión fija con the.\n\n¿Elegiste "an"? Guitar empieza con sonido consonántico [ɡ], por eso an es imposible.\n\n¿Quitaste el artículo? Sin artículo hablamos de deportes (play football, play tennis), pero no de instrumentos musicales. Con instrumentos — siempre the: play the guitar, play the piano.',
      },
      coachTip: {
        ru: 'Музыкальные инструменты ведут себя немного как VIP-гости: чаще приходят с the.',
        uk: 'Музичні інструменти поводяться трохи як VIP-гості: часто приходять з the.',
        es: 'Los instrumentos musicales se comportan un poco como invitados VIP: suelen venir con the.',
      },
    },
    {
      situation: {
        ru: 'Ты говоришь о спорте как об активности.',
        uk: 'Ти говориш про спорт як про активність.',
        es: 'Hablas de un deporte como actividad.',
      },
      question: {
        ru: 'Нужен ли артикль?',
        uk: 'Чи потрібен артикль?',
        es: '¿Se necesita artículo?',
      },
      sentence: 'They play ___ football every weekend.',
      options: ['-', 'the', 'a', 'an'],
      correctIndex: 0,
      correctReason: {
        ru: 'Да. Со спортом артикль обычно не нужен: play football, play tennis, play basketball.',
        uk: 'Так. Зі спортом артикль зазвичай не потрібен: play football, play tennis, play basketball.',
        es: 'Sí. Con deportes normalmente no usamos artículo: play football, play tennis, play basketball.',
      },
      wrongReason: {
        ru: 'Выбрал "the"? Артикль the появляется перед конкретным матчем ("the football we watched yesterday"), но не перед игрой как активностью.\n\nВыбрал "a" или "an"? Неопределённый артикль здесь тоже не нужен — мы говорим о виде спорта в целом, а не об одном конкретном матче.\n\nСравни: play the guitar (инструмент) vs play football (вид спорта) — правило разное.',
        uk: 'Вибрав "the"? Артикль the з\'являється перед конкретним матчем ("the football we watched yesterday"), але не перед грою як активністю.\n\nВибрав "a" або "an"? Неозначений артикль тут теж не потрібен — ми говоримо про вид спорту загалом, а не про один конкретний матч.\n\nПорівняй: play the guitar (інструмент) vs play football (вид спорту) — правило різне.',
        es: '¿Elegiste "the"? El artículo the aparece antes de un partido concreto ("the football we watched yesterday"), pero no antes del deporte como actividad.\n\n¿Elegiste "a" o "an"? El artículo indefinido tampoco se necesita aquí — hablamos del deporte en general, no de un partido concreto.\n\nCompara: play the guitar (instrumento) vs play football (deporte) — la regla es diferente.',
      },
      coachTip: {
        ru: 'Запомни контраст: play the guitar, но play football.',
        uk: "Запам'ятай контраст: play the guitar, але play football.",
        es: 'Recuerda el contraste: play the guitar, pero play football.',
      },
    },
  ],

  consolidationTitle: {
    ru: 'Артикли стали понятнее',
    uk: 'Артиклі стали зрозумілішими',
    es: 'Los artículos están más claros',
  },

  consolidationText: {
    ru: 'Теперь закрепи это на реальных фразах. Главная цель — не угадывать a/the, а каждый раз видеть историю: новый объект или уже знакомый.',
    uk: 'Тепер закріпи це на реальних фразах. Головна ціль — не вгадувати a/the, а щоразу бачити історію: новий об\'єкт чи вже знайомий.',
    es: 'Ahora consolídalo con frases reales. El objetivo principal no es adivinar a/the, sino ver la historia cada vez: objeto nuevo o ya conocido.',
  },
};

const PREPOSITION_LESSON: ProblemCoachLesson = {
  category: 'preposition',
  heroLabel: { ru: 'PERSONAL DIAGNOSIS', uk: 'PERSONAL DIAGNOSIS', es: 'PERSONAL DIAGNOSIS' },
  heroTitle: {
    ru: 'Предлоги нельзя переводить по одному слову',
    uk: 'Прийменники не можна перекладати одним словом',
    es: 'Las preposiciones no se traducen palabra por palabra',
  },
  heroSubtitle: {
    ru: 'Проблема не в том, что ты "не знаешь in/on/at". Проблема в том, что ты пытаешься переводить предлог, а не видеть отношение.',
    uk: 'Проблема не в тому, що ти "не знаєш in/on/at". Проблема в тому, що ти намагаєшся перекладати прийменник, а не бачити відношення.',
    es: 'El problema no es que "no sepas in/on/at". El problema es que intentas traducir la preposición en vez de ver la relación.',
  },
  diagnosisTitle: { ru: 'Что показал анализ', uk: 'Що показав аналіз', es: 'Qué mostró el análisis' },
  diagnosisText: {
    ru: 'Я вижу повторяющийся паттерн: ты часто выбираешь предлог по русскому переводу. Но английский предлог работает как GPS: он показывает положение, направление или связь между идеями.',
    uk: 'Я бачу повторюваний патерн: ти часто обираєш прийменник за українським або російським перекладом. Але англійський прийменник працює як GPS: він показує положення, напрямок або зв\'язок між ідеями.',
    es: 'Veo un patrón repetido: a menudo eliges la preposición por la traducción. Pero una preposición inglesa funciona como GPS: muestra posición, dirección o relación entre ideas.',
  },
  blocks: [
    {
      type: 'root_problem',
      accent: 'red',
      icon: 'alert-circle-outline',
      title: { ru: 'Главная поломка', uk: 'Головна поломка', es: 'El fallo principal' },
      body: {
        ru: 'Ты спрашиваешь: "Как будет НА английском?" Но предлоги так не работают. Один русский "в" может стать in, at или on. Нужно спрашивать иначе: это внутри, на поверхности или в точке?',
        uk: 'Ти питаєш: "Як буде В англійською?" Але прийменники так не працюють. Одне українське "в" може стати in, at або on. Треба питати інакше: це всередині, на поверхні чи в точці?',
        es: 'Preguntas: "¿Cómo se dice EN inglés?" Pero las preposiciones no funcionan así. Un "en" puede ser in, at u on. La pregunta correcta es: ¿está dentro, sobre una superficie o en un punto?',
      },
    },
    {
      type: 'mental_model',
      accent: 'gold',
      icon: 'navigate-outline',
      title: { ru: 'GPS-модель', uk: 'GPS-модель', es: 'Modelo GPS' },
      body: {
        ru: 'Предлог - это не перевод. Это координата. In показывает "внутри". On показывает "на поверхности или линии". At показывает "точку". Если думать так, in/on/at перестают быть лотереей.',
        uk: 'Прийменник - це не переклад. Це координата. In показує "всередині". On показує "на поверхні або лінії". At показує "точку". Якщо думати так, in/on/at перестають бути лотереєю.',
        es: 'Una preposición no es una traducción. Es una coordenada. In muestra "dentro". On muestra "sobre una superficie o línea". At muestra "un punto". Si piensas así, in/on/at dejan de ser una lotería.',
      },
    },
    {
      type: 'main_rule',
      accent: 'green',
      icon: 'checkmark-circle-outline',
      title: { ru: 'Три главные картинки', uk: 'Три головні картинки', es: 'Tres imágenes clave' },
      body: {
        ru: 'In - внутри контейнера: in the room, in the car, in January. On - на поверхности, линии или дне: on the table, on the wall, on Monday. At - точная точка: at the door, at 5 pm, at the airport.',
        uk: 'In - всередині контейнера: in the room, in the car, in January. On - на поверхні, лінії або дні: on the table, on the wall, on Monday. At - точна точка: at the door, at 5 pm, at the airport.',
        es: 'In - dentro de un contenedor: in the room, in the car, in January. On - sobre una superficie, línea o día: on the table, on the wall, on Monday. At - punto exacto: at the door, at 5 pm, at the airport.',
      },
    },
    {
      type: 'trap',
      accent: 'red',
      icon: 'close-circle-outline',
      title: { ru: 'Ловушка перевода', uk: 'Пастка перекладу', es: 'La trampa de la traducción' },
      body: {
        ru: 'Не переводи "в школе" автоматически как in school. Если ты говоришь о школе как о точке или месте, где человек находится, часто будет at school. Если внутри здания физически - можно in the school.',
        uk: 'Не перекладай "у школі" автоматично як in school. Якщо ти говориш про школу як про точку або місце, де людина перебуває, часто буде at school. Якщо фізично всередині будівлі - можна in the school.',
        es: 'No traduzcas "en la escuela" automáticamente como in school. Si hablas de la escuela como punto o lugar donde alguien está, suele ser at school. Si está físicamente dentro del edificio, puede ser in the school.',
      },
    },
    {
      type: 'example',
      accent: 'blue',
      icon: 'map-outline',
      title: { ru: 'Мини-сцена', uk: 'Міні-сцена', es: 'Mini escena' },
      body: {
        ru: 'Представь карту. "At the airport" - аэропорт как точка на карте. "In the airport" - ты уже внутри здания. "On the plane" - ты на борту транспорта, как на платформе. Английский не странный. Он просто рисует картинку.',
        uk: 'Уяви карту. "At the airport" - аеропорт як точка на карті. "In the airport" - ти вже всередині будівлі. "On the plane" - ти на борту транспорту, ніби на платформі. Англійська не дивна. Вона просто малює картинку.',
        es: 'Imagina un mapa. "At the airport" - el aeropuerto como punto en el mapa. "In the airport" - ya estás dentro del edificio. "On the plane" - estás a bordo del transporte, como en una plataforma. El inglés no es raro. Solo dibuja una imagen.',
      },
    },
    {
      type: 'memory_hook',
      accent: 'purple',
      icon: 'sparkles-outline',
      title: { ru: 'Как перестать угадывать', uk: 'Як перестати вгадувати', es: 'Cómo dejar de adivinar' },
      body: {
        ru: 'Перед выбором предлога задай один вопрос: какую картинку я вижу? Внутри - in. На поверхности, линии или дне - on. В точке - at. Не идеально для всех случаев, но это уже не рулетка.',
        uk: 'Перед вибором прийменника постав одне питання: яку картинку я бачу? Всередині - in. На поверхні, лінії або дні - on. У точці - at. Не ідеально для всіх випадків, але це вже не рулетка.',
        es: 'Antes de elegir una preposición, haz una pregunta: ¿qué imagen veo? Dentro - in. Sobre una superficie, línea o día - on. En un punto - at. No cubre todos los casos, pero ya no es una ruleta.',
      },
    },
  ],
  exerciseIntroTitle: {
    ru: 'Теперь проверим картинку, а не перевод',
    uk: 'Тепер перевіримо картинку, а не переклад',
    es: 'Ahora comprobemos la imagen, no la traducción',
  },
  exerciseIntroText: {
    ru: 'Не думай "как перевести". Думай: внутри, на поверхности, в точке, направление или длительность?',
    uk: 'Не думай "як перекласти". Думай: всередині, на поверхні, у точці, напрямок чи тривалість?',
    es: 'No pienses "cómo traducir". Piensa: dentro, superficie, punto, dirección o duración.',
  },
  exercises: [
    {
      situation: {
        ru: 'Ты назначаешь встречу на конкретный день.',
        uk: 'Ти призначаєш зустріч на конкретний день.',
        es: 'Fijas una reunión para un día concreto.',
      },
      question: {
        ru: 'Какой предлог нужен?',
        uk: 'Який прийменник потрібен?',
        es: '¿Qué preposición se necesita?',
      },
      sentence: 'The meeting is ___ Monday.',
      options: ['on', 'in', 'at', 'by'],
      correctIndex: 0,
      correctReason: {
        ru: 'Да. Monday - это конкретный день. В английском дни работают с on: on Monday, on Friday, on my birthday.',
        uk: 'Так. Monday - це конкретний день. В англійській дні працюють з on: on Monday, on Friday, on my birthday.',
        es: 'Sí. Monday es un día concreto. En inglés los días van con on: on Monday, on Friday, on my birthday.',
      },
      wrongReason: {
        ru: 'Ты, скорее всего, перевёл "в понедельник" как in. Но английский видит день как точку на календарной линии. Поэтому on Monday.',
        uk: 'Ти, ймовірно, переклав "у понеділок" як in. Але англійська бачить день як точку на календарній лінії. Тому on Monday.',
        es: 'Probablemente tradujiste "el lunes" como in. Pero el inglés ve el día como un punto en la línea del calendario. Por eso on Monday.',
      },
      coachTip: {
        ru: 'Дни недели и даты почти всегда с on: on Monday, on June 5th, on Christmas Day.',
        uk: 'Дні тижня й дати майже завжди з on: on Monday, on June 5th, on Christmas Day.',
        es: 'Los días y fechas casi siempre van con on: on Monday, on June 5th, on Christmas Day.',
      },
    },
    {
      situation: {
        ru: 'Ты говоришь о точном времени на часах.',
        uk: 'Ти говориш про точний час на годиннику.',
        es: 'Hablas de una hora exacta en el reloj.',
      },
      question: {
        ru: 'Выбери правильный предлог:',
        uk: 'Обери правильний прийменник:',
        es: 'Elige la preposición correcta:',
      },
      sentence: 'I usually wake up ___ 6:30.',
      options: ['at', 'in', 'on', 'for'],
      correctIndex: 0,
      correctReason: {
        ru: 'Правильно. 6:30 - это точка на часах. Для точного времени используем at: at 6:30, at noon, at midnight.',
        uk: 'Правильно. 6:30 - це точка на годиннику. Для точного часу використовуємо at: at 6:30, at noon, at midnight.',
        es: 'Correcto. 6:30 es un punto en el reloj. Para horas exactas usamos at: at 6:30, at noon, at midnight.',
      },
      wrongReason: {
        ru: 'Здесь не период и не день. Это точная точка времени. Английский ставит маркер at: at 6:30.',
        uk: 'Тут не період і не день. Це точна точка часу. Англійська ставить маркер at: at 6:30.',
        es: 'Aquí no es un período ni un día. Es un punto exacto en el tiempo. El inglés usa at: at 6:30.',
      },
      coachTip: {
        ru: 'At - это булавка на карте или на часах. Точная точка.',
        uk: 'At - це шпилька на карті або на годиннику. Точна точка.',
        es: 'At es un pin en un mapa o en un reloj. Punto exacto.',
      },
    },
    {
      situation: {
        ru: 'Ты говоришь о месяце как о периоде времени.',
        uk: 'Ти говориш про місяць як про період часу.',
        es: 'Hablas de un mes como período de tiempo.',
      },
      question: {
        ru: 'Какой предлог звучит естественно?',
        uk: 'Який прийменник звучить природно?',
        es: '¿Qué preposición suena natural?',
      },
      sentence: 'She moved to Ireland ___ March.',
      options: ['in', 'on', 'at', 'since'],
      correctIndex: 0,
      correctReason: {
        ru: 'Верно. March - это период, контейнер времени. Поэтому in March. Так же: in 2026, in winter, in the morning.',
        uk: 'Вірно. March - це період, контейнер часу. Тому in March. Так само: in 2026, in winter, in the morning.',
        es: 'Correcto. March es un período, un contenedor de tiempo. Por eso in March. Igual: in 2026, in winter, in the morning.',
      },
      wrongReason: {
        ru: 'March - это не точка на часах и не день недели. Это период, как контейнер. Поэтому in March.',
        uk: 'March - це не точка на годиннику і не день тижня. Це період, як контейнер. Тому in March.',
        es: 'March no es un punto en el reloj ni un día de la semana. Es un período, como un contenedor. Por eso in March.',
      },
      coachTip: {
        ru: 'In часто работает с большими "контейнерами времени": in March, in 2026, in summer.',
        uk: 'In часто працює з великими "контейнерами часу": in March, in 2026, in summer.',
        es: 'In suele funcionar con grandes "contenedores de tiempo": in March, in 2026, in summer.',
      },
    },
    {
      situation: {
        ru: 'Ключи лежат сверху на поверхности.',
        uk: 'Ключі лежать зверху на поверхні.',
        es: 'Las llaves están encima de una superficie.',
      },
      question: {
        ru: 'Выбери предлог места:',
        uk: 'Обери прийменник місця:',
        es: 'Elige la preposición de lugar:',
      },
      sentence: 'The keys are ___ the table.',
      options: ['on', 'in', 'at', 'to'],
      correctIndex: 0,
      correctReason: {
        ru: 'Да. Ключи лежат на поверхности стола. Поверхность - это on: on the table, on the wall, on the floor.',
        uk: 'Так. Ключі лежать на поверхні столу. Поверхня - це on: on the table, on the wall, on the floor.',
        es: 'Sí. Las llaves están sobre la superficie de la mesa. Superficie - on: on the table, on the wall, on the floor.',
      },
      wrongReason: {
        ru: 'Если ключи не внутри стола, а сверху на поверхности, нужен on. In был бы внутри: in the drawer.',
        uk: 'Якщо ключі не всередині столу, а зверху на поверхні, потрібен on. In було б всередині: in the drawer.',
        es: 'Si las llaves no están dentro de la mesa, sino sobre la superficie, necesitas on. In sería dentro: in the drawer.',
      },
      coachTip: {
        ru: 'On - это контакт с поверхностью. Не обязательно сверху: on the wall тоже on.',
        uk: 'On - це контакт із поверхнею. Не обов\'язково зверху: on the wall теж on.',
        es: 'On es contacto con una superficie. No siempre arriba: on the wall también es on.',
      },
    },
    {
      situation: {
        ru: 'Ты говоришь, что человек находится в аэропорту как в точке маршрута.',
        uk: 'Ти говориш, що людина перебуває в аеропорту як у точці маршруту.',
        es: 'Dices que alguien está en el aeropuerto como punto de la ruta.',
      },
      question: {
        ru: 'Какой вариант лучше?',
        uk: 'Який варіант кращий?',
        es: '¿Qué opción es mejor?',
      },
      sentence: 'We arrived ___ the airport early.',
      options: ['at', 'in', 'on', 'to'],
      correctIndex: 0,
      correctReason: {
        ru: 'Правильно. Airport здесь точка прибытия. Для зданий, станций, аэропортов и конкретных мест часто используем arrive at.',
        uk: 'Правильно. Airport тут точка прибуття. Для будівель, станцій, аеропортів і конкретних місць часто використовуємо arrive at.',
        es: 'Correcto. Airport aquí es el punto de llegada. Para edificios, estaciones, aeropuertos y lugares concretos solemos usar arrive at.',
      },
      wrongReason: {
        ru: 'После arrive не ставим to. Это частая ловушка: go to, но arrive at/in. Airport - конкретное место, поэтому arrived at the airport.',
        uk: 'Після arrive не ставимо to. Це часта пастка: go to, але arrive at/in. Airport - конкретне місце, тому arrived at the airport.',
        es: 'Después de arrive no usamos to. Es una trampa común: go to, pero arrive at/in. Airport es un lugar concreto, por eso arrived at the airport.',
      },
      coachTip: {
        ru: 'Запомни связку: go to, но arrive at a place и arrive in a city/country.',
        uk: 'Запам\'ятай зв\'язку: go to, але arrive at a place і arrive in a city/country.',
        es: 'Recuerda el contraste: go to, pero arrive at a place y arrive in a city/country.',
      },
    },
    {
      situation: {
        ru: 'Ты говоришь о городе или стране, куда человек прибыл.',
        uk: 'Ти говориш про місто або країну, куди людина прибула.',
        es: 'Hablas de una ciudad o país al que alguien llegó.',
      },
      question: {
        ru: 'Выбери правильный вариант:',
        uk: 'Обери правильний варіант:',
        es: 'Elige la opción correcta:',
      },
      sentence: 'They arrived ___ Dublin late at night.',
      options: ['in', 'at', 'to', 'on'],
      correctIndex: 0,
      correctReason: {
        ru: 'Верно. Dublin - город, большой "контейнер" на карте. С городами и странами после arrive используем in: arrive in Dublin, arrive in Ireland.',
        uk: 'Вірно. Dublin - місто, великий "контейнер" на карті. З містами й країнами після arrive використовуємо in: arrive in Dublin, arrive in Ireland.',
        es: 'Correcto. Dublin es una ciudad, un gran "contenedor" en el mapa. Con ciudades y países después de arrive usamos in: arrive in Dublin, arrive in Ireland.',
      },
      wrongReason: {
        ru: 'Dublin - не здание и не точка типа airport. Это город, то есть пространство. Поэтому arrive in Dublin.',
        uk: 'Dublin - не будівля і не точка типу airport. Це місто, тобто простір. Тому arrive in Dublin.',
        es: 'Dublin no es un edificio ni un punto como airport. Es una ciudad, es decir, un espacio. Por eso arrive in Dublin.',
      },
      coachTip: {
        ru: 'Arrive at - точка или здание. Arrive in - город или страна.',
        uk: 'Arrive at - точка або будівля. Arrive in - місто або країна.',
        es: 'Arrive at - punto o edificio. Arrive in - ciudad o país.',
      },
    },
    {
      situation: {
        ru: 'Ты говоришь, сколько времени длилось действие.',
        uk: 'Ти говориш, скільки часу тривала дія.',
        es: 'Hablas de cuánto tiempo duró una acción.',
      },
      question: {
        ru: 'Что нужно поставить?',
        uk: 'Що треба поставити?',
        es: '¿Qué hay que poner?',
      },
      sentence: 'I have lived here ___ three years.',
      options: ['for', 'since', 'from', 'during'],
      correctIndex: 0,
      correctReason: {
        ru: 'Да. Three years - это длительность. Для длительности используем for: for three years, for two hours, for a long time.',
        uk: 'Так. Three years - це тривалість. Для тривалості використовуємо for: for three years, for two hours, for a long time.',
        es: 'Sí. Three years es duración. Para duración usamos for: for three years, for two hours, for a long time.',
      },
      wrongReason: {
        ru: 'Three years - это не точка старта, а длина периода. Since нужен с моментом начала: since 2021, since Monday.',
        uk: 'Three years - це не точка старту, а довжина періоду. Since потрібен з моментом початку: since 2021, since Monday.',
        es: 'Three years no es un punto de inicio, es la duración del período. Since va con el punto de inicio: since 2021, since Monday.',
      },
      coachTip: {
        ru: 'For отвечает на "как долго?". Since отвечает на "с какого момента?".',
        uk: 'For відповідає на "як довго?". Since відповідає на "з якого моменту?".',
        es: 'For responde "¿durante cuánto tiempo?". Since responde "¿desde qué momento?".',
      },
    },
    {
      situation: {
        ru: 'Ты говоришь, с какого года началась ситуация.',
        uk: 'Ти говориш, з якого року почалася ситуація.',
        es: 'Dices desde qué año empezó una situación.',
      },
      question: {
        ru: 'Выбери точный вариант:',
        uk: 'Обери точний варіант:',
        es: 'Elige la opción exacta:',
      },
      sentence: 'She has worked here ___ 2020.',
      options: ['since', 'for', 'during', 'from'],
      correctIndex: 0,
      correctReason: {
        ru: 'Правильно. 2020 - это точка старта. Since показывает "с этого момента до сейчас".',
        uk: 'Правильно. 2020 - це точка старту. Since показує "з цього моменту до зараз".',
        es: 'Correcto. 2020 es el punto de inicio. Since muestra "desde ese momento hasta ahora".',
      },
      wrongReason: {
        ru: '2020 - это не длительность. Это точка начала. Поэтому since 2020. Если бы было "four years", тогда for four years.',
        uk: '2020 - це не тривалість. Це точка початку. Тому since 2020. Якби було "four years", тоді for four years.',
        es: '2020 no es duración. Es punto de inicio. Por eso since 2020. Si fuera "four years", sería for four years.',
      },
      coachTip: {
        ru: 'Since любит даты и моменты: since 2020, since Monday, since breakfast.',
        uk: 'Since любить дати й моменти: since 2020, since Monday, since breakfast.',
        es: 'Since ama fechas y momentos: since 2020, since Monday, since breakfast.',
      },
    },
  ],
  consolidationTitle: {
    ru: 'Предлоги стали не переводом, а картинкой',
    uk: 'Прийменники стали не перекладом, а картинкою',
    es: 'Las preposiciones ya no son traducción, sino imagen',
  },
  consolidationText: {
    ru: 'Теперь закрепи это на реальных фразах. Главная цель - не переводить "в/на/к", а видеть отношение: внутри, на поверхности, в точке, направление или длительность.',
    uk: 'Тепер закріпи це на реальних фразах. Головна ціль - не перекладати "в/на/до", а бачити відношення: всередині, на поверхні, у точці, напрямок або тривалість.',
    es: 'Ahora consolídalo con frases reales. El objetivo no es traducir "en/a/de", sino ver la relación: dentro, superficie, punto, dirección o duración.',
  },
};

const VERB_LESSON: ProblemCoachLesson = {
  category: 'verb',
  heroLabel: { ru: 'PERSONAL DIAGNOSIS', uk: 'PERSONAL DIAGNOSIS', es: 'PERSONAL DIAGNOSIS' },
  heroTitle: {
    ru: 'Глагол ломается, когда ты смешиваешь роли',
    uk: 'Дієслово ламається, коли ти змішуєш ролі',
    es: 'El verbo falla cuando mezclas funciones',
  },
  heroSubtitle: {
    ru: 'Проблема не просто в "временах". Чаще всего ошибка появляется, когда ты не видишь, кто главный глагол, где помощник, а где форма.',
    uk: 'Проблема не просто в "часах". Найчастіше помилка з\'являється, коли ти не бачиш, де головне дієслово, де помічник, а де форма.',
    es: 'El problema no es solo "los tiempos". El error suele aparecer cuando no ves cuál es el verbo principal, cuál es el auxiliar y cuál es la forma.',
  },
  diagnosisTitle: { ru: 'Что показал анализ', uk: 'Що показав аналіз', es: 'Qué mostró el análisis' },
  diagnosisText: {
    ru: 'Я вижу паттерн: ты часто знаешь нужный смысл, но форма глагола сбивается. Особенно там, где нужен does, где нельзя Continuous, или где после модального глагола нужна базовая форма.',
    uk: 'Я бачу патерн: ти часто знаєш потрібний сенс, але форма дієслова збивається. Особливо там, де потрібен does, де не можна Continuous, або де після модального дієслова потрібна базова форма.',
    es: 'Veo un patrón: a menudo sabes el significado que necesitas, pero la forma del verbo se rompe. Especialmente donde necesitas does, donde no se usa Continuous, o donde después de un modal va la forma base.',
  },
  blocks: [
    {
      type: 'root_problem',
      accent: 'red',
      icon: 'alert-circle-outline',
      title: {
        ru: 'Главная поломка',
        uk: 'Головна поломка',
        es: 'El fallo principal',
      },
      body: {
        ru: 'Ты иногда ставишь сразу две грамматические "метки" на один глагол. Например: She doesn\'t likes. Но does уже забрал на себя 3-е лицо. Поэтому основной глагол возвращается в базовую форму: She doesn\'t like.',
        uk: 'Ти іноді ставиш одразу дві граматичні "мітки" на одне дієслово. Наприклад: She doesn\'t likes. Але does вже взяв на себе 3-тю особу. Тому головне дієслово повертається в базову форму: She doesn\'t like.',
        es: 'A veces pones dos "marcas" gramaticales en un solo verbo. Por ejemplo: She doesn\'t likes. Pero does ya lleva la marca de tercera persona. Por eso el verbo principal vuelve a la forma base: She doesn\'t like.',
      },
    },
    {
      type: 'mental_model',
      accent: 'gold',
      icon: 'construct-outline',
      title: {
        ru: 'Модель "помощник забирает нагрузку"',
        uk: 'Модель "помічник забирає навантаження"',
        es: 'Modelo "el auxiliar carga la gramática"',
      },
      body: {
        ru: 'Если в предложении появился помощник do/does/did, он берёт на себя время, вопрос или отрицание. Главный глагол после него становится простым: do you like, she doesn\'t like, did he go.',
        uk: 'Якщо в реченні з\'явився помічник do/does/did, він бере на себе час, питання або заперечення. Головне дієслово після нього стає простим: do you like, she doesn\'t like, did he go.',
        es: 'Si aparece el auxiliar do/does/did, él carga el tiempo, la pregunta o la negación. El verbo principal después vuelve a la forma simple: do you like, she doesn\'t like, did he go.',
      },
    },
    {
      type: 'main_rule',
      accent: 'green',
      icon: 'checkmark-circle-outline',
      title: {
        ru: 'Один глагол - одна грамматическая работа',
        uk: 'Одне дієслово - одна граматична робота',
        es: 'Un verbo - una función gramatical',
      },
      body: {
        ru: 'В утверждении: She likes coffee. В отрицании: She doesn\'t like coffee. В вопросе: Does she like coffee? Видишь? Likes становится like, потому что does уже сделал грамматическую работу.',
        uk: 'У твердженні: She likes coffee. У запереченні: She doesn\'t like coffee. У питанні: Does she like coffee? Бачиш? Likes стає like, бо does вже зробив граматичну роботу.',
        es: 'En afirmación: She likes coffee. En negación: She doesn\'t like coffee. En pregunta: Does she like coffee? ¿Lo ves? Likes se convierte en like porque does ya hizo el trabajo gramatical.',
      },
    },
    {
      type: 'trap',
      accent: 'red',
      icon: 'close-circle-outline',
      title: {
        ru: 'Ловушка "am + обычный глагол"',
        uk: 'Пастка "am + звичайне дієслово"',
        es: 'La trampa "am + verbo normal"',
      },
      body: {
        ru: 'Нельзя сказать I am know или She is likes. Be не приклеивается к обычному глаголу просто так. Либо I know, либо I am learning. После be нужен -ing, прилагательное, существительное или место.',
        uk: 'Не можна сказати I am know або She is likes. Be не приклеюється до звичайного дієслова просто так. Або I know, або I am learning. Після be потрібен -ing, прикметник, іменник або місце.',
        es: 'No se dice I am know ni She is likes. Be no se pega a un verbo normal sin razón. O dices I know, o I am learning. Después de be necesitas -ing, adjetivo, sustantivo o lugar.',
      },
    },
    {
      type: 'example',
      accent: 'blue',
      icon: 'chatbubble-ellipses-outline',
      title: {
        ru: 'Мини-сцена',
        uk: 'Міні-сцена',
        es: 'Mini escena',
      },
      body: {
        ru: 'Представь, что does - это охранник на входе. Он уже проверил паспорт грамматики: 3-е лицо, вопрос или отрицание. Главному глаголу не надо снова показывать документы. Поэтому Does she like? не Does she likes?',
        uk: 'Уяви, що does - це охоронець на вході. Він уже перевірив паспорт граматики: 3-тя особа, питання або заперечення. Головному дієслову не треба знову показувати документи. Тому Does she like? не Does she likes?',
        es: 'Imagina que does es el guardia de la entrada. Ya revisó el pasaporte gramatical: tercera persona, pregunta o negación. El verbo principal no necesita mostrar documentos otra vez. Por eso Does she like? no Does she likes?',
      },
    },
    {
      type: 'memory_hook',
      accent: 'purple',
      icon: 'sparkles-outline',
      title: {
        ru: 'Как быстро проверить себя',
        uk: 'Як швидко перевірити себе',
        es: 'Cómo revisarte rápido',
      },
      body: {
        ru: 'Если видишь do/does/did/can/must/should - следующий смысловой глагол почти всегда голый, без -s и без -ed: does he work, did she call, can you help. Грамматику уже несёт помощник.',
        uk: 'Якщо бачиш do/does/did/can/must/should - наступне смислове дієслово майже завжди голе, без -s і без -ed: does he work, did she call, can you help. Граматику вже несе помічник.',
        es: 'Si ves do/does/did/can/must/should, el siguiente verbo de significado casi siempre va desnudo, sin -s ni -ed: does he work, did she call, can you help. El auxiliar ya lleva la gramática.',
      },
    },
  ],
  exerciseIntroTitle: {
    ru: 'Теперь проверим форму, а не перевод',
    uk: 'Тепер перевіримо форму, а не переклад',
    es: 'Ahora comprobemos la forma, no la traducción',
  },
  exerciseIntroText: {
    ru: 'Не спрашивай только "что это значит?". Смотри, кто несёт грамматику: основной глагол или помощник.',
    uk: 'Не питай лише "що це означає?". Дивись, хто несе граматику: головне дієслово чи помічник.',
    es: 'No preguntes solo "qué significa". Mira quién lleva la gramática: el verbo principal o el auxiliar.',
  },
  exercises: [
    {
      situation: {
        ru: 'Ты говоришь о привычке в Present Simple.',
        uk: 'Ти говориш про звичку в Present Simple.',
        es: 'Hablas de un hábito en Present Simple.',
      },
      question: {
        ru: 'Выбери правильную форму:',
        uk: 'Обери правильну форму:',
        es: 'Elige la forma correcta:',
      },
      sentence: 'She ___ coffee every morning.',
      options: ['drinks', 'drink', 'is drink', 'does drinks'],
      correctIndex: 0,
      correctReason: {
        ru: 'Верно. В утверждении he/she/it получает -s: she drinks, he works, it helps.',
        uk: 'Вірно. У твердженні he/she/it отримує -s: she drinks, he works, it helps.',
        es: 'Correcto. En afirmaciones, he/she/it lleva -s: she drinks, he works, it helps.',
      },
      wrongReason: {
        ru: 'Здесь обычное утверждение без помощника. Подлежащее she, поэтому глагол получает -s: She drinks coffee.',
        uk: 'Тут звичайне твердження без помічника. Підмет she, тому дієслово отримує -s: She drinks coffee.',
        es: 'Aquí es una afirmación normal sin auxiliar. El sujeto es she, por eso el verbo lleva -s: She drinks coffee.',
      },
      coachTip: {
        ru: 'В утверждении: she drinks. В отрицании с does: she doesn\'t drink.',
        uk: 'У твердженні: she drinks. У запереченні з does: she doesn\'t drink.',
        es: 'En afirmación: she drinks. En negación con does: she doesn\'t drink.',
      },
    },
    {
      situation: {
        ru: 'Ты делаешь отрицание в Present Simple.',
        uk: 'Ти робиш заперечення в Present Simple.',
        es: 'Haces una negación en Present Simple.',
      },
      question: {
        ru: 'Что звучит правильно?',
        uk: 'Що звучить правильно?',
        es: '¿Qué suena correcto?',
      },
      sentence: 'She ___ coffee.',
      options: ['doesn\'t drink', 'doesn\'t drinks', 'not drinks', 'don\'t drinks'],
      correctIndex: 0,
      correctReason: {
        ru: 'Да. Doesn\'t уже показывает 3-е лицо и отрицание. Главный глагол возвращается в базовую форму: drink.',
        uk: 'Так. Doesn\'t вже показує 3-тю особу і заперечення. Головне дієслово повертається в базову форму: drink.',
        es: 'Sí. Doesn\'t ya muestra tercera persona y negación. El verbo principal vuelve a la forma base: drink.',
      },
      wrongReason: {
        ru: 'После doesn\'t нельзя ставить drinks. Это двойная маркировка. Правильно: doesn\'t drink.',
        uk: 'Після doesn\'t не можна ставити drinks. Це подвійне маркування. Правильно: doesn\'t drink.',
        es: 'Después de doesn\'t no puedes usar drinks. Es doble marca. Correcto: doesn\'t drink.',
      },
      coachTip: {
        ru: 'Does забирает -s себе. Поэтому: She drinks, но She doesn\'t drink.',
        uk: 'Does забирає -s собі. Тому: She drinks, але She doesn\'t drink.',
        es: 'Does se lleva la -s. Por eso: She drinks, pero She doesn\'t drink.',
      },
    },
    {
      situation: {
        ru: 'Ты задаёшь вопрос о привычке.',
        uk: 'Ти ставиш питання про звичку.',
        es: 'Haces una pregunta sobre un hábito.',
      },
      question: {
        ru: 'Выбери правильный вопрос:',
        uk: 'Обери правильне питання:',
        es: 'Elige la pregunta correcta:',
      },
      sentence: '___ she work on Sundays?',
      options: ['Does', 'Do', 'Is', 'Has'],
      correctIndex: 0,
      correctReason: {
        ru: 'Правильно. Для she в Present Simple вопрос строится через does: Does she work? А сам work остаётся базовым.',
        uk: 'Правильно. Для she в Present Simple питання будується через does: Does she work? А сам work залишається базовим.',
        es: 'Correcto. Para she en Present Simple, la pregunta usa does: Does she work? Y work queda en forma base.',
      },
      wrongReason: {
        ru: 'She требует does в вопросе Present Simple. Не Do she, не Is she work. Правильно: Does she work?',
        uk: 'She вимагає does у питанні Present Simple. Не Do she, не Is she work. Правильно: Does she work?',
        es: 'She necesita does en preguntas de Present Simple. No Do she, no Is she work. Correcto: Does she work?',
      },
      coachTip: {
        ru: 'Do - I/you/we/they. Does - he/she/it.',
        uk: 'Do - I/you/we/they. Does - he/she/it.',
        es: 'Do - I/you/we/they. Does - he/she/it.',
      },
    },
    {
      situation: {
        ru: 'Ты говоришь о прошлом и используешь did.',
        uk: 'Ти говориш про минуле і використовуєш did.',
        es: 'Hablas del pasado y usas did.',
      },
      question: {
        ru: 'Что правильно?',
        uk: 'Що правильно?',
        es: '¿Qué es correcto?',
      },
      sentence: 'Did you ___ him yesterday?',
      options: ['call', 'called', 'calling', 'calls'],
      correctIndex: 0,
      correctReason: {
        ru: 'Верно. Did уже показывает прошлое. После did основной глагол идёт в базовой форме: did you call.',
        uk: 'Вірно. Did вже показує минуле. Після did головне дієслово йде в базовій формі: did you call.',
        es: 'Correcto. Did ya muestra pasado. Después de did, el verbo principal va en forma base: did you call.',
      },
      wrongReason: {
        ru: 'После did нельзя ставить called. Это снова двойная грамматика. Did уже несёт прошлое, поэтому call.',
        uk: 'Після did не можна ставити called. Це знову подвійна граматика. Did вже несе минуле, тому call.',
        es: 'Después de did no se usa called. Es doble gramática otra vez. Did ya lleva el pasado, por eso call.',
      },
      coachTip: {
        ru: 'Did + базовый глагол: did go, did see, did call.',
        uk: 'Did + базове дієслово: did go, did see, did call.',
        es: 'Did + verbo base: did go, did see, did call.',
      },
    },
    {
      situation: {
        ru: 'Ты говоришь о знании. Это состояние, не действие в процессе.',
        uk: 'Ти говориш про знання. Це стан, не дія в процесі.',
        es: 'Hablas de conocimiento. Es un estado, no una acción en progreso.',
      },
      question: {
        ru: 'Выбери естественный вариант:',
        uk: 'Обери природний варіант:',
        es: 'Elige la opción natural:',
      },
      sentence: 'She ___ three languages.',
      options: ['knows', 'is knowing', 'know', 'has knowing'],
      correctIndex: 0,
      correctReason: {
        ru: 'Правильно. Know - глагол состояния. Мы обычно не говорим is knowing. В Present Simple: She knows three languages.',
        uk: 'Правильно. Know - дієслово стану. Ми зазвичай не кажемо is knowing. У Present Simple: She knows three languages.',
        es: 'Correcto. Know es un verbo de estado. Normalmente no decimos is knowing. En Present Simple: She knows three languages.',
      },
      wrongReason: {
        ru: 'Know - это не действие типа "бегу прямо сейчас". Это состояние в голове. Поэтому не Continuous, а Simple: she knows.',
        uk: 'Know - це не дія типу "біжу прямо зараз". Це стан у голові. Тому не Continuous, а Simple: she knows.',
        es: 'Know no es una acción como "estoy corriendo ahora". Es un estado mental. Por eso no Continuous, sino Simple: she knows.',
      },
      coachTip: {
        ru: 'Stative verbs часто не любят Continuous: know, want, believe, understand, love.',
        uk: 'Stative verbs часто не люблять Continuous: know, want, believe, understand, love.',
        es: 'Los stative verbs suelen evitar Continuous: know, want, believe, understand, love.',
      },
    },
    {
      situation: {
        ru: 'Ты говоришь о действии, которое происходит сейчас.',
        uk: 'Ти говориш про дію, яка відбувається зараз.',
        es: 'Hablas de una acción que ocurre ahora.',
      },
      question: {
        ru: 'Что правильно?',
        uk: 'Що правильно?',
        es: '¿Qué es correcto?',
      },
      sentence: 'I ___ breakfast right now.',
      options: ['am having', 'have', 'am have', 'having'],
      correctIndex: 0,
      correctReason: {
        ru: 'Да. Здесь have значит действие "завтракать", поэтому Continuous возможен: I am having breakfast.',
        uk: 'Так. Тут have означає дію "снідати", тому Continuous можливий: I am having breakfast.',
        es: 'Sí. Aquí have significa la acción "desayunar", por eso Continuous es posible: I am having breakfast.',
      },
      wrongReason: {
        ru: 'Если have значит "есть/владеть", обычно Simple: I have a car. Но have breakfast - это действие, поэтому right now даёт am having.',
        uk: 'Якщо have означає "мати/володіти", зазвичай Simple: I have a car. Але have breakfast - це дія, тому right now дає am having.',
        es: 'Si have significa "poseer", normalmente usamos Simple: I have a car. Pero have breakfast es una acción, por eso right now da am having.',
      },
      coachTip: {
        ru: 'Have может быть состоянием или действием. I have a car, но I am having breakfast.',
        uk: 'Have може бути станом або дією. I have a car, але I am having breakfast.',
        es: 'Have puede ser estado o acción. I have a car, pero I am having breakfast.',
      },
    },
    {
      situation: {
        ru: 'Ты используешь модальный глагол can.',
        uk: 'Ти використовуєш модальне дієслово can.',
        es: 'Usas el verbo modal can.',
      },
      question: {
        ru: 'Какая форма нужна после can?',
        uk: 'Яка форма потрібна після can?',
        es: '¿Qué forma va después de can?',
      },
      sentence: 'He can ___ very fast.',
      options: ['run', 'runs', 'running', 'ran'],
      correctIndex: 0,
      correctReason: {
        ru: 'Верно. После can идёт базовая форма глагола: can run, can speak, can help.',
        uk: 'Вірно. Після can іде базова форма дієслова: can run, can speak, can help.',
        es: 'Correcto. Después de can va la forma base: can run, can speak, can help.',
      },
      wrongReason: {
        ru: 'Can уже несёт грамматическую роль. После него не ставим runs или running. Только базовая форма: can run.',
        uk: 'Can вже несе граматичну роль. Після нього не ставимо runs або running. Тільки базова форма: can run.',
        es: 'Can ya lleva la función gramatical. Después no usamos runs ni running. Solo forma base: can run.',
      },
      coachTip: {
        ru: 'После модальных: can go, must work, should call. Без to, без -s.',
        uk: 'Після модальних: can go, must work, should call. Без to, без -s.',
        es: 'Después de modales: can go, must work, should call. Sin to, sin -s.',
      },
    },
    {
      situation: {
        ru: 'Ты хочешь сказать, что человек не пошёл вчера.',
        uk: 'Ти хочеш сказати, що людина не пішла вчора.',
        es: 'Quieres decir que alguien no fue ayer.',
      },
      question: {
        ru: 'Выбери правильное отрицание:',
        uk: 'Обери правильне заперечення:',
        es: 'Elige la negación correcta:',
      },
      sentence: 'He ___ to work yesterday.',
      options: ['didn\'t go', 'didn\'t went', 'not went', 'wasn\'t go'],
      correctIndex: 0,
      correctReason: {
        ru: 'Правильно. Didn\'t уже показывает прошлое и отрицание. После него базовая форма: go.',
        uk: 'Правильно. Didn\'t вже показує минуле і заперечення. Після нього базова форма: go.',
        es: 'Correcto. Didn\'t ya muestra pasado y negación. Después va la forma base: go.',
      },
      wrongReason: {
        ru: 'После didn\'t нельзя ставить went. Прошлое уже внутри didn\'t. Поэтому: didn\'t go.',
        uk: 'Після didn\'t не можна ставити went. Минуле вже всередині didn\'t. Тому: didn\'t go.',
        es: 'Después de didn\'t no usamos went. El pasado ya está dentro de didn\'t. Por eso: didn\'t go.',
      },
      coachTip: {
        ru: 'Didn\'t + базовая форма: didn\'t go, didn\'t see, didn\'t know.',
        uk: 'Didn\'t + базова форма: didn\'t go, didn\'t see, didn\'t know.',
        es: 'Didn\'t + forma base: didn\'t go, didn\'t see, didn\'t know.',
      },
    },
  ],
  consolidationTitle: {
    ru: 'Глагол стал системой, а не набором форм',
    uk: 'Дієслово стало системою, а не набором форм',
    es: 'El verbo ya es sistema, no una lista de formas',
  },
  consolidationText: {
    ru: 'Теперь закрепи это на реальных фразах. Главная цель - видеть, кто несёт грамматику: сам глагол или помощник do/does/did/can.',
    uk: 'Тепер закріпи це на реальних фразах. Головна ціль - бачити, хто несе граматику: саме дієслово чи помічник do/does/did/can.',
    es: 'Ahora consolídalo con frases reales. El objetivo es ver quién lleva la gramática: el verbo principal o el auxiliar do/does/did/can.',
  },
};

const MODAL_LESSON: ProblemCoachLesson = {
  category: 'modal',
  heroLabel: { ru: 'PERSONAL DIAGNOSIS', uk: 'PERSONAL DIAGNOSIS', es: 'PERSONAL DIAGNOSIS' },
  heroTitle: {
    ru: 'Модальные глаголы показывают давление',
    uk: 'Модальні дієслова показують тиск',
    es: 'Los modales muestran presión',
  },
  heroSubtitle: {
    ru: 'Проблема не в переводе can, must или should. Проблема в силе: запрет, обязанность, совет, вывод или сожаление.',
    uk: 'Проблема не в перекладі can, must або should. Проблема в силі: заборона, обов\'язок, порада, висновок або жаль.',
    es: 'El problema no es traducir can, must o should. El problema es la fuerza: prohibición, obligación, consejo, deducción o arrepentimiento.',
  },
  diagnosisTitle: { ru: 'Что показал анализ', uk: 'Що показав аналіз', es: 'Qué mostró el análisis' },
  diagnosisText: {
    ru: 'Я вижу паттерн: ты часто выбираешь модальный глагол по русскому "должен / можно / надо". Но в английском важно не только значение, а источник давления: это правило, совет, запрет или логический вывод.',
    uk: 'Я бачу патерн: ти часто обираєш модальне дієслово за українським або російським "повинен / можна / треба". Але в англійській важливе не тільки значення, а джерело тиску: це правило, порада, заборона чи логічний висновок.',
    es: 'Veo un patrón: a menudo eliges el modal por la traducción "deber / poder / tener que". Pero en inglés no importa solo el significado, sino la fuente de presión: regla, consejo, prohibición o deducción lógica.',
  },
  blocks: [
    {
      type: 'root_problem',
      accent: 'red',
      icon: 'alert-circle-outline',
      title: {
        ru: 'Главная поломка',
        uk: 'Головна поломка',
        es: 'El fallo principal',
      },
      body: {
        ru: 'Ты видишь "должен" и пытаешься сразу выбрать must. Но "должен" бывает разным. Я сам считаю это необходимым - must. Правила или обстоятельства заставляют - have to. Это не одно и то же.',
        uk: 'Ти бачиш "повинен" і намагаєшся одразу вибрати must. Але "повинен" буває різним. Я сам вважаю це необхідним - must. Правила або обставини змушують - have to. Це не одне й те саме.',
        es: 'Ves "deber" e intentas elegir must de inmediato. Pero "deber" puede ser distinto. Yo lo considero necesario - must. Una regla o circunstancia me obliga - have to. No es lo mismo.',
      },
    },
    {
      type: 'mental_model',
      accent: 'gold',
      icon: 'speedometer-outline',
      title: {
        ru: 'Модель силы',
        uk: 'Модель сили',
        es: 'Modelo de fuerza',
      },
      body: {
        ru: 'Модальный глагол - это регулятор силы. Should - мягкий совет. Must - сильная необходимость. Mustn\'t - красный знак "нельзя". Don\'t have to - дверь открыта, но тебя никто не заставляет.',
        uk: 'Модальне дієслово - це регулятор сили. Should - м\'яка порада. Must - сильна необхідність. Mustn\'t - червоний знак "не можна". Don\'t have to - двері відкриті, але тебе ніхто не змушує.',
        es: 'Un modal es un regulador de fuerza. Should - consejo suave. Must - necesidad fuerte. Mustn\'t - señal roja de "prohibido". Don\'t have to - la puerta está abierta, pero nadie te obliga.',
      },
    },
    {
      type: 'main_rule',
      accent: 'green',
      icon: 'checkmark-circle-outline',
      title: {
        ru: 'Самая опасная пара',
        uk: 'Найнебезпечніша пара',
        es: 'La pareja más peligrosa',
      },
      body: {
        ru: 'Mustn\'t значит "нельзя, запрещено". Don\'t have to значит "не обязан, но можно". You mustn\'t smoke here - запрещено. You don\'t have to come - можешь не приходить.',
        uk: 'Mustn\'t означає "не можна, заборонено". Don\'t have to означає "не зобов\'язаний, але можна". You mustn\'t smoke here - заборонено. You don\'t have to come - можеш не приходити.',
        es: 'Mustn\'t significa "prohibido". Don\'t have to significa "no es necesario, pero puedes". You mustn\'t smoke here - prohibido. You don\'t have to come - puedes no venir.',
      },
    },
    {
      type: 'trap',
      accent: 'red',
      icon: 'close-circle-outline',
      title: {
        ru: 'Ловушка запрета',
        uk: 'Пастка заборони',
        es: 'La trampa de la prohibición',
      },
      body: {
        ru: 'Не путай mustn\'t и don\'t have to. Это не маленькая ошибка. Это меняет смысл на противоположный. You mustn\'t drive - тебе нельзя. You don\'t have to drive - тебе не обязательно.',
        uk: 'Не плутай mustn\'t і don\'t have to. Це не маленька помилка. Це змінює сенс на протилежний. You mustn\'t drive - тобі не можна. You don\'t have to drive - тобі не обов\'язково.',
        es: 'No confundas mustn\'t y don\'t have to. No es un error pequeño. Cambia el sentido al contrario. You mustn\'t drive - no puedes. You don\'t have to drive - no es obligatorio.',
      },
    },
    {
      type: 'example',
      accent: 'blue',
      icon: 'shield-checkmark-outline',
      title: {
        ru: 'Мини-сцена',
        uk: 'Міні-сцена',
        es: 'Mini escena',
      },
      body: {
        ru: 'Представь больницу. На стене знак: No smoking. Тут не "можешь не курить", а "тебе нельзя курить". Поэтому: You mustn\'t smoke here. Don\'t have to здесь звучало бы почти как издевательство.',
        uk: 'Уяви лікарню. На стіні знак: No smoking. Тут не "можеш не курити", а "тобі не можна курити". Тому: You mustn\'t smoke here. Don\'t have to тут звучало б майже як знущання.',
        es: 'Imagina un hospital. En la pared hay un cartel: No smoking. Aquí no es "no necesitas fumar", sino "no puedes fumar". Por eso: You mustn\'t smoke here. Don\'t have to sonaría casi absurdo.',
      },
    },
    {
      type: 'memory_hook',
      accent: 'purple',
      icon: 'sparkles-outline',
      title: {
        ru: 'Как быстро выбрать',
        uk: 'Як швидко вибрати',
        es: 'Cómo elegir rápido',
      },
      body: {
        ru: 'Спроси себя: это запрет, обязанность, совет или вывод? Запрет - mustn\'t. Нет обязанности - don\'t have to. Совет - should. Почти уверен - must be / must have done.',
        uk: 'Запитай себе: це заборона, обов\'язок, порада чи висновок? Заборона - mustn\'t. Немає обов\'язку - don\'t have to. Порада - should. Майже впевнений - must be / must have done.',
        es: 'Pregúntate: ¿es prohibición, obligación, consejo o deducción? Prohibición - mustn\'t. No obligación - don\'t have to. Consejo - should. Casi seguro - must be / must have done.',
      },
    },
  ],
  exerciseIntroTitle: {
    ru: 'Теперь проверим силу смысла',
    uk: 'Тепер перевіримо силу сенсу',
    es: 'Ahora comprobemos la fuerza del significado',
  },
  exerciseIntroText: {
    ru: 'Не переводи слово "должен". Смотри, что происходит: запрет, правило, совет, сожаление или вывод.',
    uk: 'Не перекладай слово "повинен". Дивись, що відбувається: заборона, правило, порада, жаль чи висновок.',
    es: 'No traduzcas la palabra "deber". Mira qué ocurre: prohibición, regla, consejo, arrepentimiento o deducción.',
  },
  exercises: [
    {
      situation: {
        ru: 'Ты в больнице. Курить запрещено.',
        uk: 'Ти в лікарні. Курити заборонено.',
        es: 'Estás en un hospital. Fumar está prohibido.',
      },
      question: {
        ru: 'Выбери правильный модальный глагол:',
        uk: 'Обери правильне модальне дієслово:',
        es: 'Elige el modal correcto:',
      },
      sentence: 'You ___ smoke here. It\'s a hospital.',
      options: ['mustn\'t', 'don\'t have to', 'couldn\'t', 'shouldn\'t have'],
      correctIndex: 0,
      correctReason: {
        ru: 'Верно. Это запрет, поэтому mustn\'t. Здесь смысл: тебе нельзя курить.',
        uk: 'Вірно. Це заборона, тому mustn\'t. Тут сенс: тобі не можна курити.',
        es: 'Correcto. Es una prohibición, por eso mustn\'t. El sentido es: no puedes fumar.',
      },
      wrongReason: {
        ru: 'Don\'t have to значит "не обязан". Но в больнице курить не просто необязательно, а запрещено. Поэтому mustn\'t.',
        uk: 'Don\'t have to означає "не зобов\'язаний". Але в лікарні курити не просто необов\'язково, а заборонено. Тому mustn\'t.',
        es: 'Don\'t have to significa "no es necesario". Pero en un hospital fumar no es simplemente opcional, está prohibido. Por eso mustn\'t.',
      },
      coachTip: {
        ru: 'Mustn\'t = красный знак запрета. Don\'t have to = никто не заставляет.',
        uk: 'Mustn\'t = червоний знак заборони. Don\'t have to = ніхто не змушує.',
        es: 'Mustn\'t = señal roja de prohibición. Don\'t have to = nadie te obliga.',
      },
    },
    {
      situation: {
        ru: 'Сегодня воскресенье. Работать не обязательно.',
        uk: 'Сьогодні неділя. Працювати не обов\'язково.',
        es: 'Hoy es domingo. No es obligatorio trabajar.',
      },
      question: {
        ru: 'Что звучит правильно?',
        uk: 'Що звучить правильно?',
        es: '¿Qué suena correcto?',
      },
      sentence: 'It\'s Sunday. You ___ go to work.',
      options: ['don\'t have to', 'mustn\'t', 'can\'t', 'shouldn\'t have'],
      correctIndex: 0,
      correctReason: {
        ru: 'Да. Don\'t have to значит "не обязан". Запрета нет. Просто можно не идти.',
        uk: 'Так. Don\'t have to означає "не зобов\'язаний". Заборони немає. Просто можна не йти.',
        es: 'Sí. Don\'t have to significa "no es necesario". No hay prohibición. Simplemente puedes no ir.',
      },
      wrongReason: {
        ru: 'Mustn\'t было бы "тебе запрещено идти на работу". Это другой смысл. Здесь нет обязанности, поэтому don\'t have to.',
        uk: 'Mustn\'t означало б "тобі заборонено йти на роботу". Це інший сенс. Тут немає обов\'язку, тому don\'t have to.',
        es: 'Mustn\'t significaría "tienes prohibido ir al trabajo". Es otro sentido. Aquí no hay obligación, por eso don\'t have to.',
      },
      coachTip: {
        ru: 'Don\'t have to = можно не делать. Mustn\'t = нельзя делать.',
        uk: 'Don\'t have to = можна не робити. Mustn\'t = не можна робити.',
        es: 'Don\'t have to = puedes no hacerlo. Mustn\'t = no puedes hacerlo.',
      },
    },
    {
      situation: {
        ru: 'Это твоё личное сильное мнение: человеку надо извиниться.',
        uk: 'Це твоя особиста сильна думка: людині треба вибачитися.',
        es: 'Es tu opinión personal fuerte: la persona debe disculparse.',
      },
      question: {
        ru: 'Выбери лучший вариант:',
        uk: 'Обери найкращий варіант:',
        es: 'Elige la mejor opción:',
      },
      sentence: 'You ___ apologize to her. It was your mistake.',
      options: ['should', 'can', 'don\'t have to', 'mustn\'t'],
      correctIndex: 0,
      correctReason: {
        ru: 'Правильно. Should здесь звучит как нормальный совет: тебе стоит извиниться.',
        uk: 'Правильно. Should тут звучить як нормальна порада: тобі варто вибачитися.',
        es: 'Correcto. Should aquí suena como un consejo normal: deberías disculparte.',
      },
      wrongReason: {
        ru: 'Здесь не запрет и не отсутствие обязанности. Это совет. Самый естественный вариант - should.',
        uk: 'Тут не заборона і не відсутність обов\'язку. Це порада. Найприродніший варіант - should.',
        es: 'Aquí no hay prohibición ni ausencia de obligación. Es un consejo. La opción más natural es should.',
      },
      coachTip: {
        ru: 'Should = мягкое "тебе стоит". Не закон, но сильная рекомендация.',
        uk: 'Should = м\'яке "тобі варто". Не закон, але сильна рекомендація.',
        es: 'Should = "sería bueno que". No es ley, pero sí recomendación fuerte.',
      },
    },
    {
      situation: {
        ru: 'Ты сожалеешь, что плохо готовился к экзамену.',
        uk: 'Ти шкодуєш, що погано готувався до іспиту.',
        es: 'Te arrepientes de no haber estudiado bien para el examen.',
      },
      question: {
        ru: 'Выбери вариант с сожалением о прошлом:',
        uk: 'Обери варіант із жалем про минуле:',
        es: 'Elige la opción con arrepentimiento sobre el pasado:',
      },
      sentence: 'I ___ harder for the exam.',
      options: ['should have studied', 'could study', 'must study', 'should study'],
      correctIndex: 0,
      correctReason: {
        ru: 'Верно. Should have studied значит "надо было учиться, но я этого не сделал". Это сожаление о прошлом.',
        uk: 'Вірно. Should have studied означає "треба було вчитися, але я цього не зробив". Це жаль про минуле.',
        es: 'Correcto. Should have studied significa "debería haber estudiado, pero no lo hice". Es arrepentimiento sobre el pasado.',
      },
      wrongReason: {
        ru: 'Нужно сожаление о прошлом. Для этого нужна формула should have + V3: should have studied.',
        uk: 'Потрібен жаль про минуле. Для цього потрібна формула should have + V3: should have studied.',
        es: 'Necesitas arrepentimiento sobre el pasado. Para eso usamos should have + V3: should have studied.',
      },
      coachTip: {
        ru: 'Should have done = надо было сделать, но не сделал. Очень часто это сожаление.',
        uk: 'Should have done = треба було зробити, але не зробив. Дуже часто це жаль.',
        es: 'Should have done = deberías haberlo hecho, pero no lo hiciste. Muy a menudo expresa arrepentimiento.',
      },
    },
    {
      situation: {
        ru: 'Ты делаешь логический вывод: он знает всё о машинах, значит, вероятно, был механиком.',
        uk: 'Ти робиш логічний висновок: він знає все про машини, отже, мабуть, був механіком.',
        es: 'Haces una deducción lógica: sabe todo sobre coches, así que probablemente fue mecánico.',
      },
      question: {
        ru: 'Какой вариант показывает вывод о прошлом?',
        uk: 'Який варіант показує висновок про минуле?',
        es: '¿Qué opción muestra deducción sobre el pasado?',
      },
      sentence: 'He knows everything about cars. He ___ a mechanic.',
      options: ['must have been', 'should have been', 'can be', 'has to be'],
      correctIndex: 0,
      correctReason: {
        ru: 'Да. Must have been значит "наверное был". Это сильный логический вывод о прошлом.',
        uk: 'Так. Must have been означає "мабуть, був". Це сильний логічний висновок про минуле.',
        es: 'Sí. Must have been significa "seguramente fue". Es una deducción lógica fuerte sobre el pasado.',
      },
      wrongReason: {
        ru: 'Здесь не совет и не обязанность. Ты делаешь вывод по признакам. Для прошлого нужен must have been.',
        uk: 'Тут не порада і не обов\'язок. Ти робиш висновок за ознаками. Для минулого потрібен must have been.',
        es: 'Aquí no es consejo ni obligación. Haces una deducción por señales. Para el pasado necesitas must have been.',
      },
      coachTip: {
        ru: 'Must have + V3 = почти уверен, что это случилось в прошлом.',
        uk: 'Must have + V3 = майже впевнений, що це сталося в минулому.',
        es: 'Must have + V3 = casi seguro de que ocurrió en el pasado.',
      },
    },
    {
      situation: {
        ru: 'Ты почти уверен, что это невозможно: он не мог видеть тебя, потому что был за границей.',
        uk: 'Ти майже впевнений, що це неможливо: він не міг тебе бачити, бо був за кордоном.',
        es: 'Estás casi seguro de que es imposible: no pudo verte porque estaba en el extranjero.',
      },
      question: {
        ru: 'Выбери правильный вывод:',
        uk: 'Обери правильний висновок:',
        es: 'Elige la deducción correcta:',
      },
      sentence: 'He ___ seen me yesterday. He was abroad.',
      options: ['can\'t have', 'mustn\'t have', 'doesn\'t have', 'shouldn\'t have'],
      correctIndex: 0,
      correctReason: {
        ru: 'Правильно. Can\'t have seen значит "не мог видеть / почти точно не видел". Это логический вывод о прошлом.',
        uk: 'Правильно. Can\'t have seen означає "не міг бачити / майже точно не бачив". Це логічний висновок про минуле.',
        es: 'Correcto. Can\'t have seen significa "no pudo haber visto / casi seguro que no vio". Es deducción sobre el pasado.',
      },
      wrongReason: {
        ru: 'Тут не запрет. Ты делаешь вывод: это почти невозможно. Для такого вывода используем can\'t have + V3.',
        uk: 'Тут не заборона. Ти робиш висновок: це майже неможливо. Для такого висновку використовуємо can\'t have + V3.',
        es: 'Aquí no hay prohibición. Haces una deducción: es casi imposible. Para eso usamos can\'t have + V3.',
      },
      coachTip: {
        ru: 'Can\'t have done = почти уверен, что этого не было.',
        uk: 'Can\'t have done = майже впевнений, що цього не було.',
        es: 'Can\'t have done = casi seguro de que no ocurrió.',
      },
    },
    {
      situation: {
        ru: 'Ты говоришь о внешнем правиле на работе.',
        uk: 'Ти говориш про зовнішнє правило на роботі.',
        es: 'Hablas de una regla externa en el trabajo.',
      },
      question: {
        ru: 'Что звучит естественнее?',
        uk: 'Що звучить природніше?',
        es: '¿Qué suena más natural?',
      },
      sentence: 'I ___ wear a uniform at work. It\'s company policy.',
      options: ['have to', 'must', 'should', 'can'],
      correctIndex: 0,
      correctReason: {
        ru: 'Да. Company policy - внешнее правило. Поэтому have to звучит естественно: меня обязывают обстоятельства.',
        uk: 'Так. Company policy - зовнішнє правило. Тому have to звучить природно: мене зобов\'язують обставини.',
        es: 'Sí. Company policy es una regla externa. Por eso have to suena natural: las circunstancias me obligan.',
      },
      wrongReason: {
        ru: 'Must тоже возможно, но здесь явно указано внешнее правило компании. Для этого обычно лучше have to.',
        uk: 'Must теж можливе, але тут явно вказане зовнішнє правило компанії. Для цього зазвичай краще have to.',
        es: 'Must también puede ser posible, pero aquí se menciona una regla externa de la empresa. Para eso suele ser mejor have to.',
      },
      coachTip: {
        ru: 'Have to часто приходит от правил, закона, работы, расписания или обстоятельств.',
        uk: 'Have to часто приходить від правил, закону, роботи, розкладу або обставин.',
        es: 'Have to suele venir de reglas, leyes, trabajo, horarios o circunstancias.',
      },
    },
    {
      situation: {
        ru: 'Ты говоришь о возможности в прошлом, которая не случилась.',
        uk: 'Ти говориш про можливість у минулому, яка не сталася.',
        es: 'Hablas de una posibilidad en el pasado que no ocurrió.',
      },
      question: {
        ru: 'Выбери правильный вариант:',
        uk: 'Обери правильний варіант:',
        es: 'Elige la opción correcta:',
      },
      sentence: 'We ___ won the game, but we made too many mistakes.',
      options: ['could have', 'can have', 'must have', 'should'],
      correctIndex: 0,
      correctReason: {
        ru: 'Верно. Could have won значит "могли выиграть, но не выиграли". Это нереализованная возможность в прошлом.',
        uk: 'Вірно. Could have won означає "могли виграти, але не виграли". Це нереалізована можливість у минулому.',
        es: 'Correcto. Could have won significa "podríamos haber ganado, pero no ganamos". Es una posibilidad pasada no realizada.',
      },
      wrongReason: {
        ru: 'Тут смысл: возможность была, но результат не случился. Для этого нужна форма could have + V3.',
        uk: 'Тут сенс: можливість була, але результат не стався. Для цього потрібна форма could have + V3.',
        es: 'El sentido es: había una posibilidad, pero el resultado no ocurrió. Para eso usamos could have + V3.',
      },
      coachTip: {
        ru: 'Could have done = мог сделать, но не сделал или не случилось.',
        uk: 'Could have done = міг зробити, але не зробив або не сталося.',
        es: 'Could have done = podría haberlo hecho, pero no lo hizo o no ocurrió.',
      },
    },
  ],
  consolidationTitle: {
    ru: 'Модальные стали понятнее по силе',
    uk: 'Модальні стали зрозумілішими за силою',
    es: 'Los modales ya se entienden por fuerza',
  },
  consolidationText: {
    ru: 'Теперь закрепи это на реальных фразах. Главная цель - не переводить "должен", а видеть тип давления: запрет, обязанность, совет, сожаление или логический вывод.',
    uk: 'Тепер закріпи це на реальних фразах. Головна ціль - не перекладати "повинен", а бачити тип тиску: заборона, обов\'язок, порада, жаль або логічний висновок.',
    es: 'Ahora consolídalo con frases reales. El objetivo no es traducir "deber", sino ver el tipo de fuerza: prohibición, obligación, consejo, arrepentimiento o deducción lógica.',
  },
};

const TO_BE_LESSON: ProblemCoachLesson = {
  category: 'to-be',
  heroLabel: { ru: 'PERSONAL DIAGNOSIS', uk: 'PERSONAL DIAGNOSIS', es: 'PERSONAL DIAGNOSIS' },
  heroTitle: {
    ru: 'To be пропускают те, кто думает по-русски',
    uk: 'To be пропускають ті, хто думає по-українськи',
    es: 'Se omite to be cuando se piensa en español',
  },
  heroSubtitle: {
    ru: 'В русском языке "я студент" — без глагола. В английском так нельзя: I am a student. Мозг экономит и выкидывает am/is/are.',
    uk: 'В українській мові "я студент" — без дієслова. В англійській так не можна: I am a student. Мозок економить і викидає am/is/are.',
    es: 'En español "soy estudiante" suena natural. El cerebro a veces omite el verbo en inglés: I am a student — el am es obligatorio.',
  },
  diagnosisTitle: { ru: 'Что показал анализ', uk: 'Що показав аналіз', es: 'Qué mostró el análisis' },
  diagnosisText: {
    ru: 'Ошибки с to be делятся на два типа: пропуск (She teacher → She is a teacher) и неверная форма (They was → They were). Оба типа — следствие автоматического перевода с родного языка.',
    uk: 'Помилки з to be діляться на два типи: пропуск (She teacher → She is a teacher) та неправильна форма (They was → They were). Обидва типи — наслідок автоматичного перекладу з рідної мови.',
    es: 'Los errores con to be son de dos tipos: omisión (She teacher → She is a teacher) y forma incorrecta (They was → They were). Ambos son consecuencia de la traducción automática.',
  },
  blocks: [
    {
      type: 'main_rule',
      accent: 'green',
      icon: 'checkmark-circle-outline',
      title: { ru: 'Правило без исключений', uk: 'Правило без винятків', es: 'Regla sin excepciones' },
      body: {
        ru: 'В английском предложении всегда должен быть глагол. Если смысловой глагол не нужен — ставь to be. Нет такого предложения на английском, где подлежащее стоит без глагола.',
        uk: 'В англійському реченні завжди має бути дієслово. Якщо смислове дієслово не потрібне — став to be. Немає такого речення англійською, де підмет стоїть без дієслова.',
        es: 'En inglés toda oración necesita un verbo. Si no hay verbo de contenido — usa to be. No existe oración en inglés donde el sujeto esté sin verbo.',
      },
    },
    {
      type: 'trap',
      accent: 'red',
      icon: 'close-circle-outline',
      title: { ru: 'Формы быстро', uk: 'Форми швидко', es: 'Formas rápidas' },
      body: {
        ru: 'I am / He is / She is / It is / We are / You are / They are. В прошедшем: I was / He was / She was / We were / They were. "They was" — не существует.',
        uk: 'I am / He is / She is / It is / We are / You are / They are. У минулому: I was / He was / She was / We were / They were. "They was" — не існує.',
        es: 'I am / He is / She is / It is / We are / You are / They are. En pasado: I was / He was / She was / We were / They were. "They was" — no existe.',
      },
    },
  ],
  exerciseIntroTitle: { ru: 'Закрепить на фразах', uk: 'Закріпити на фразах', es: 'Consolidar con frases' },
  exerciseIntroText: {
    ru: 'Повтори фразы, где to be давался тяжело. Автоматизм приходит через повторение.',
    uk: 'Повтори фрази, де to be давався важко. Автоматизм приходить через повторення.',
    es: 'Repasa las frases donde to be te costó. La automatización viene con la repetición.',
  },
  exercises: [
    {
      situation: { ru: 'Ты говоришь, что они были на вечеринке вчера.', uk: 'Ти говориш, що вони були на вечірці вчора.', es: 'Dices que ellos estuvieron en la fiesta anoche.' },
      question: { ru: 'Выбери правильную форму to be в прошлом:', uk: 'Обери правильну форму to be у минулому:', es: 'Elige la forma correcta de to be en pasado:' },
      sentence: 'They ___ at the party last night.',
      options: ['were', 'was', 'are', 'be'],
      correctIndex: 0,
      correctReason: { ru: 'Верно. They в прошлом работает с were: they were, we were, you were.', uk: 'Вірно. They у минулому працює з were: they were, we were, you were.', es: 'Correcto. They en pasado va con were: they were, we were, you were.' },
      wrongReason: { ru: 'Was идёт с I/he/she/it. С they, we, you в прошлом нужен were: They were at the party.', uk: 'Was іде з I/he/she/it. З they, we, you у минулому потрібен were: They were at the party.', es: 'Was va con I/he/she/it. Con they, we, you en pasado necesitas were: They were at the party.' },
      coachTip: { ru: 'Past be: I/he/she/it was. You/we/they were.', uk: 'Past be: I/he/she/it was. You/we/they were.', es: 'Past be: I/he/she/it was. You/we/they were.' },
    },
    {
      situation: { ru: 'Ты говоришь о действии, которое происходит прямо сейчас.', uk: 'Ти говориш про дію, яка відбувається прямо зараз.', es: 'Hablas de una acción que ocurre ahora mismo.' },
      question: { ru: 'Что правильно после am?', uk: 'Що правильно після am?', es: '¿Qué es correcto después de am?' },
      sentence: 'I am ___ to work now.',
      options: ['going', 'go', 'goes', 'went'],
      correctIndex: 0,
      correctReason: { ru: 'Правильно. После am для действия в процессе нужна -ing форма: I am going.', uk: 'Правильно. Після am для дії в процесі потрібна форма -ing: I am going.', es: 'Correcto. Después de am, para una acción en progreso necesitas -ing: I am going.' },
      wrongReason: { ru: 'Если используешь am для действия сейчас, глагол должен быть с -ing. Не I am go, а I am going.', uk: 'Якщо використовуєш am для дії зараз, дієслово має бути з -ing. Не I am go, а I am going.', es: 'Si usas am para una acción ahora, el verbo debe llevar -ing. No I am go, sino I am going.' },
      coachTip: { ru: 'Be + действие = -ing: am going, is working, are waiting.', uk: 'Be + дія = -ing: am going, is working, are waiting.', es: 'Be + acción = -ing: am going, is working, are waiting.' },
    },
    {
      situation: { ru: 'Ты говоришь о состоянии, а не о действии.', uk: 'Ти говориш про стан, а не про дію.', es: 'Hablas de un estado, no de una acción.' },
      question: { ru: 'Выбери естественный вариант:', uk: 'Обери природний варіант:', es: 'Elige la opción natural:' },
      sentence: 'She ___ tired after work.',
      options: ['is', 'does', 'has', 'goes'],
      correctIndex: 0,
      correctReason: { ru: 'Да. Tired - это состояние/прилагательное. Для состояния нужен be: She is tired.', uk: 'Так. Tired - це стан/прикметник. Для стану потрібен be: She is tired.', es: 'Sí. Tired es estado/adjetivo. Para un estado usamos be: She is tired.' },
      wrongReason: { ru: 'После she здесь нет действия. Есть состояние tired. Поэтому нужен is.', uk: 'Після she тут немає дії. Є стан tired. Тому потрібен is.', es: 'Después de she aquí no hay acción. Hay un estado: tired. Por eso necesitas is.' },
      coachTip: { ru: 'Be + adjective: is tired, am ready, are happy.', uk: 'Be + adjective: is tired, am ready, are happy.', es: 'Be + adjective: is tired, am ready, are happy.' },
    },
    {
      situation: { ru: 'Ты говоришь о привычке: она любит кофе.', uk: 'Ти говориш про звичку: вона любить каву.', es: 'Hablas de una preferencia: a ella le gusta el café.' },
      question: { ru: 'Где be лишний?', uk: 'Де be зайвий?', es: '¿Dónde sobra be?' },
      sentence: 'She ___ coffee.',
      options: ['likes', 'is likes', 'is like', 'be likes'],
      correctIndex: 0,
      correctReason: { ru: 'Верно. Like здесь обычный смысловой глагол. Be не нужен: She likes coffee.', uk: 'Вірно. Like тут звичайне смислове дієслово. Be не потрібен: She likes coffee.', es: 'Correcto. Like aquí es un verbo principal normal. Be no hace falta: She likes coffee.' },
      wrongReason: { ru: 'Be не ставится перед обычным глаголом likes. Если глагол уже есть, не добавляй is просто для красоты. Правильно: She likes coffee.', uk: 'Be не ставиться перед звичайним дієсловом likes. Якщо дієслово вже є, не додавай is просто для краси. Правильно: She likes coffee.', es: 'Be no va antes del verbo normal likes. Si ya tienes un verbo, no agregues is como decoración. Correcto: She likes coffee.' },
      coachTip: { ru: 'She is tired, но She likes coffee. Tired - состояние. Likes - глагол.', uk: 'She is tired, але She likes coffee. Tired - стан. Likes - дієслово.', es: 'She is tired, pero She likes coffee. Tired - estado. Likes - verbo.' },
    },
    {
      situation: { ru: 'Ты спрашиваешь, есть ли молоко в холодильнике.', uk: 'Ти питаєш, чи є молоко в холодильнику.', es: 'Preguntas si hay leche en la nevera.' },
      question: { ru: 'Выбери правильную конструкцию:', uk: 'Обери правильну конструкцію:', es: 'Elige la construcción correcta:' },
      sentence: '___ any milk in the fridge?',
      options: ['Is there', 'Are there', 'There is', 'Has there'],
      correctIndex: 0,
      correctReason: { ru: 'Правильно. Milk неисчисляемое, поэтому работает как singular: Is there any milk?', uk: 'Правильно. Milk незлічуване, тому працює як singular: Is there any milk?', es: 'Correcto. Milk es incontable, así que funciona como singular: Is there any milk?' },
      wrongReason: { ru: 'Milk - неисчисляемое. Мы не считаем "один milk, два milks". Поэтому в there is/are нужна singular-форма: Is there any milk?', uk: 'Milk - незлічуване. Ми не рахуємо "один milk, два milks". Тому в there is/are потрібна singular-форма: Is there any milk?', es: 'Milk es incontable. No contamos "one milk, two milks". Por eso en there is/are necesitas singular: Is there any milk?' },
      coachTip: { ru: 'There is + singular/uncountable. There are + plural.', uk: 'There is + singular/uncountable. There are + plural.', es: 'There is + singular/uncountable. There are + plural.' },
    },
    {
      situation: { ru: 'Ты говоришь, что в комнате много людей.', uk: 'Ти говориш, що в кімнаті багато людей.', es: 'Dices que hay muchas personas en la habitación.' },
      question: { ru: 'Что правильно?', uk: 'Що правильно?', es: '¿Qué es correcto?' },
      sentence: 'There ___ many people in the room.',
      options: ['are', 'is', 'was', 'be'],
      correctIndex: 0,
      correctReason: { ru: 'Да. People - множественное число. Поэтому: There are many people.', uk: 'Так. People - множина. Тому: There are many people.', es: 'Sí. People es plural. Por eso: There are many people.' },
      wrongReason: { ru: 'People выглядит как одно слово, но грамматически это plural. Поэтому не there is many people, а there are many people.', uk: 'People виглядає як одне слово, але граматично це plural. Тому не there is many people, а there are many people.', es: 'People parece una sola palabra, pero gramaticalmente es plural. Por eso no there is many people, sino there are many people.' },
      coachTip: { ru: 'People почти всегда plural: people are, there are people.', uk: 'People майже завжди plural: people are, there are people.', es: 'People casi siempre es plural: people are, there are people.' },
    },
    {
      situation: { ru: 'Она была в Париже и уже вернулась.', uk: 'Вона була в Парижі й уже повернулася.', es: 'Ella estuvo en París y ya volvió.' },
      question: { ru: 'Been или gone?', uk: 'Been чи gone?', es: '¿Been o gone?' },
      sentence: "She has ___ to Paris. She's back now.",
      options: ['been', 'gone', 'went', 'be'],
      correctIndex: 0,
      correctReason: { ru: 'Верно. Has been to значит "была и вернулась". Она уже back now, значит been.', uk: 'Вірно. Has been to означає "була й повернулася". Вона вже back now, отже been.', es: 'Correcto. Has been to significa "fue y volvió". She\'s back now, por eso been.' },
      wrongReason: { ru: 'Gone значит "уехала и ещё там". Но она вернулась. Поэтому has been to Paris.', uk: 'Gone означає "поїхала і ще там". Але вона повернулася. Тому has been to Paris.', es: 'Gone significa "se fue y todavía está allí". Pero ella volvió. Por eso has been to Paris.' },
      coachTip: { ru: 'Been to - съездил и вернулся. Gone to - уехал и ещё там.', uk: "Been to - з'їздив і повернувся. Gone to - поїхав і ще там.", es: 'Been to - fue y volvió. Gone to - se fue y sigue allí.' },
    },
    {
      situation: { ru: 'Ты говоришь, что привык вставать рано.', uk: 'Ти говориш, що звик вставати рано.', es: 'Dices que estás acostumbrado a levantarte temprano.' },
      question: { ru: 'Какая форма нужна после be used to?', uk: 'Яка форма потрібна після be used to?', es: '¿Qué forma va después de be used to?' },
      sentence: 'I am used to ___ up early.',
      options: ['waking', 'wake', 'woke', 'to wake'],
      correctIndex: 0,
      correctReason: { ru: 'Правильно. Be used to требует noun или -ing: used to waking up, used to cold weather.', uk: 'Правильно. Be used to вимагає noun або -ing: used to waking up, used to cold weather.', es: 'Correcto. Be used to requiere noun o -ing: used to waking up, used to cold weather.' },
      wrongReason: { ru: 'После be used to не ставим обычный инфинитив wake. Здесь to - предлог, поэтому после него нужна -ing форма: used to waking up.', uk: 'Після be used to не ставимо звичайний інфінітив wake. Тут to - прийменник, тому після нього потрібна форма -ing: used to waking up.', es: 'Después de be used to no usamos el infinitivo wake. Aquí to es preposición, así que después va -ing: used to waking up.' },
      coachTip: { ru: 'Be used to + noun/-ing. Used to + verb - это другая конструкция про прошлые привычки.', uk: 'Be used to + noun/-ing. Used to + verb - це інша конструкція про минулі звички.', es: 'Be used to + noun/-ing. Used to + verb es otra construcción sobre hábitos pasados.' },
    },
  ],
  consolidationTitle: { ru: 'Перейти к тренировке', uk: 'Перейти до тренування', es: 'Ir al entrenamiento' },
  consolidationText: {
    ru: 'Тренируй на своих фразах с to be — пока форма не станет автоматической.',
    uk: 'Тренуй на своїх фразах з to be — поки форма не стане автоматичною.',
    es: 'Entrena con tus frases con to be — hasta que la forma sea automática.',
  },
};

const PHRASAL_PARTICLE_LESSON: ProblemCoachLesson = {
  category: 'phrasal_particle',
  heroLabel: { ru: 'PERSONAL DIAGNOSIS', uk: 'PERSONAL DIAGNOSIS', es: 'PERSONAL DIAGNOSIS' },
  heroTitle: {
    ru: 'Фразовые глаголы не случайные',
    uk: 'Фразові дієслова не випадкові',
    es: 'Los phrasal verbs no son aleatorios',
  },
  heroSubtitle: {
    ru: 'Проблема не в том, что у тебя плохая память. Проблема в том, что частицы up, out, off, down кажутся мусором. Но они двигают смысл.',
    uk: 'Проблема не в тому, що в тебе погана пам\'ять. Проблема в тому, що частки up, out, off, down здаються зайвими. Але вони рухають сенс.',
    es: 'El problema no es que tengas mala memoria. El problema es que partículas como up, out, off, down parecen ruido. Pero mueven el significado.',
  },
  diagnosisTitle: { ru: 'Что показал анализ', uk: 'Що показав аналіз', es: 'Qué mostró el análisis' },
  diagnosisText: {
    ru: 'Я вижу паттерн: ты часто узнаёшь сам глагол, но теряешь смысл после частицы. Например, look понятен, но look for, look after и look up уже смешиваются. Значит, надо тренировать не глагол отдельно, а связку.',
    uk: 'Я бачу патерн: ти часто впізнаєш саме дієслово, але втрачаєш сенс після частки. Наприклад, look зрозумілий, але look for, look after і look up вже змішуються. Отже, треба тренувати не дієслово окремо, а зв\'язку.',
    es: 'Veo un patrón: a menudo reconoces el verbo principal, pero pierdes el significado después de la partícula. Por ejemplo, look es claro, pero look for, look after y look up se mezclan. Eso significa que hay que entrenar la combinación, no el verbo solo.',
  },
  blocks: [
    {
      type: 'root_problem',
      accent: 'red',
      icon: 'alert-circle-outline',
      title: {
        ru: 'Главная поломка',
        uk: 'Головна поломка',
        es: 'El fallo principal',
      },
      body: {
        ru: 'Ты видишь знакомый глагол и думаешь, что смысл уже понятен. Но в фразовых глаголах частица может полностью поменять картинку. Look at - смотреть. Look for - искать. Look after - присматривать. Один look, три разных мира.',
        uk: 'Ти бачиш знайоме дієслово і думаєш, що сенс уже зрозумілий. Але у фразових дієсловах частка може повністю змінити картинку. Look at - дивитися. Look for - шукати. Look after - доглядати. Один look, три різні світи.',
        es: 'Ves un verbo conocido y piensas que el significado ya está claro. Pero en los phrasal verbs la partícula puede cambiar toda la imagen. Look at - mirar. Look for - buscar. Look after - cuidar. Un look, tres mundos distintos.',
      },
    },
    {
      type: 'mental_model',
      accent: 'gold',
      icon: 'git-branch-outline',
      title: {
        ru: 'Модель движения смысла',
        uk: 'Модель руху сенсу',
        es: 'Modelo de movimiento del significado',
      },
      body: {
        ru: 'Частица - это маленький режиссёр. Она показывает, куда двигается действие. Up часто доводит до конца. Out вытаскивает наружу или показывает исчезновение. Off отделяет или выключает. Down снижает, успокаивает или записывает.',
        uk: 'Частка - це маленький режисер. Вона показує, куди рухається дія. Up часто доводить до кінця. Out витягує назовні або показує зникнення. Off відділяє або вимикає. Down знижує, заспокоює або записує.',
        es: 'La partícula es un pequeño director. Muestra hacia dónde se mueve la acción. Up suele completar. Out saca hacia fuera o muestra agotamiento. Off separa o apaga. Down reduce, calma o anota.',
      },
    },
    {
      type: 'main_rule',
      accent: 'green',
      icon: 'checkmark-circle-outline',
      title: {
        ru: 'Не учи "look". Учи "look + частица"',
        uk: 'Не вчи "look". Вчи "look + частка"',
        es: 'No aprendas "look". Aprende "look + partícula"',
      },
      body: {
        ru: 'Фразовый глагол нужно хранить как цельный блок. Не "look = смотреть", а look for = искать, look after = присматривать, look up = искать информацию. Иначе мозг будет каждый раз собирать смысл заново.',
        uk: 'Фразове дієслово треба зберігати як цілісний блок. Не "look = дивитися", а look for = шукати, look after = доглядати, look up = шукати інформацію. Інакше мозок щоразу збиратиме сенс заново.',
        es: 'Un phrasal verb debe guardarse como un bloque completo. No "look = mirar", sino look for = buscar, look after = cuidar, look up = buscar información. Si no, tu cerebro tendrá que reconstruir el significado cada vez.',
      },
    },
    {
      type: 'trap',
      accent: 'red',
      icon: 'close-circle-outline',
      title: {
        ru: 'Ловушка буквального перевода',
        uk: 'Пастка буквального перекладу',
        es: 'La trampa de la traducción literal',
      },
      body: {
        ru: 'Не пытайся переводить каждую частицу буквально. Give up - не "дать вверх". Run out of coffee - не "выбежать из кофе". Английский тут не сломался. Просто фраза стала новым цельным смыслом.',
        uk: 'Не намагайся перекладати кожну частку буквально. Give up - не "дати вгору". Run out of coffee - не "вибігти з кави". Англійська тут не зламалася. Просто фраза стала новим цілісним сенсом.',
        es: 'No intentes traducir cada partícula literalmente. Give up no es "dar arriba". Run out of coffee no es "correr fuera del café". El inglés no se rompió. La frase se convirtió en un significado completo nuevo.',
      },
    },
    {
      type: 'example',
      accent: 'blue',
      icon: 'film-outline',
      title: {
        ru: 'Мини-сцена',
        uk: 'Міні-сцена',
        es: 'Mini escena',
      },
      body: {
        ru: 'Ты готовишь ужин и говоришь: "We ran out of milk." Никто никуда не бежал. Просто запас молока вышел наружу из системы - закончился. Out часто показывает, что ресурс исчез.',
        uk: 'Ти готуєш вечерю і кажеш: "We ran out of milk." Ніхто нікуди не біг. Просто запас молока вийшов із системи - закінчився. Out часто показує, що ресурс зник.',
        es: 'Estás preparando la cena y dices: "We ran out of milk." Nadie corrió a ninguna parte. Simplemente la reserva de leche salió del sistema - se acabó. Out suele mostrar que un recurso desaparece.',
      },
    },
    {
      type: 'memory_hook',
      accent: 'purple',
      icon: 'sparkles-outline',
      title: {
        ru: 'Как запомнить без зубрёжки',
        uk: 'Як запам\'ятати без зубріння',
        es: 'Cómo recordarlo sin memorizar a la fuerza',
      },
      body: {
        ru: 'Не спрашивай: "Что значит up?" Спрашивай: "Что делает вся фраза?" Clean up - довести уборку до результата. Give up - закончить попытки. Look up - поднять взгляд или найти информацию. Смотри на весь блок.',
        uk: 'Не питай: "Що означає up?" Питай: "Що робить уся фраза?" Clean up - довести прибирання до результату. Give up - завершити спроби. Look up - підняти погляд або знайти інформацію. Дивись на весь блок.',
        es: 'No preguntes: "¿Qué significa up?" Pregunta: "¿Qué hace toda la frase?" Clean up - llevar la limpieza hasta el resultado. Give up - terminar los intentos. Look up - levantar la vista o buscar información. Mira el bloque completo.',
      },
    },
  ],
  exerciseIntroTitle: {
    ru: 'Теперь проверим не глагол, а связку',
    uk: 'Тепер перевіримо не дієслово, а зв\'язку',
    es: 'Ahora comprobemos la combinación, no el verbo',
  },
  exerciseIntroText: {
    ru: 'Не выбирай по знакомому глаголу. Смотри на всю фразу и на то, куда частица двигает смысл.',
    uk: 'Не обирай за знайомим дієсловом. Дивись на всю фразу і на те, куди частка рухає сенс.',
    es: 'No elijas por el verbo conocido. Mira toda la frase y hacia dónde la partícula mueve el significado.',
  },
  exercises: [
    {
      situation: {
        ru: 'У вас закончился кофе дома.',
        uk: 'У вас закінчилася кава вдома.',
        es: 'Se les acabó el café en casa.',
      },
      question: {
        ru: 'Что значит фраза?',
        uk: 'Що означає фраза?',
        es: '¿Qué significa la frase?',
      },
      sentence: 'We ran out of coffee.',
      options: ['У нас закончился кофе', 'Мы выбежали за кофе', 'Мы убежали от кофе', 'Мы нашли кофе'],
      correctIndex: 0,
      correctReason: {
        ru: 'Да. Run out of значит "закончиться / исчерпать запас". Тут кофе не бегает, ты тоже не бегаешь. Закончился запас.',
        uk: 'Так. Run out of означає "закінчитися / вичерпати запас". Тут кава не бігає, і ти теж не бігаєш. Закінчився запас.',
        es: 'Sí. Run out of significa "quedarse sin / agotar la reserva". Aquí el café no corre y tú tampoco. Se acabó la reserva.',
      },
      wrongReason: {
        ru: 'Ты попался на буквальный run. Но run out of - цельный блок. Он значит, что запас чего-то закончился: run out of coffee, money, time.',
        uk: 'Ти попався на буквальне run. Але run out of - цілісний блок. Він означає, що запас чогось закінчився: run out of coffee, money, time.',
        es: 'Caíste en el run literal. Pero run out of es un bloque completo. Significa que se acabó una reserva: run out of coffee, money, time.',
      },
      coachTip: {
        ru: 'Run out of = ресурс закончился. Это один блок, не три отдельных слова.',
        uk: 'Run out of = ресурс закінчився. Це один блок, не три окремі слова.',
        es: 'Run out of = se acabó un recurso. Es un bloque, no tres palabras separadas.',
      },
    },
    {
      situation: {
        ru: 'Ты просишь человека записать имя и адрес.',
        uk: 'Ти просиш людину записати ім\'я та адресу.',
        es: 'Pides a alguien que anote su nombre y dirección.',
      },
      question: {
        ru: 'Выбери правильную частицу:',
        uk: 'Обери правильну частку:',
        es: 'Elige la partícula correcta:',
      },
      sentence: 'Please write ___ your name and address.',
      options: ['down', 'up', 'off', 'out'],
      correctIndex: 0,
      correctReason: {
        ru: 'Верно. Write down значит "записать". Down здесь как движение на бумагу: опустить информацию вниз и зафиксировать.',
        uk: 'Вірно. Write down означає "записати". Down тут як рух на папір: опустити інформацію вниз і зафіксувати.',
        es: 'Correcto. Write down significa "anotar". Down aquí funciona como movimiento hacia el papel: bajar la información y fijarla.',
      },
      wrongReason: {
        ru: 'Здесь не write up и не write off. Нужно именно записать информацию, поэтому write down.',
        uk: 'Тут не write up і не write off. Треба саме записати інформацію, тому write down.',
        es: 'Aquí no es write up ni write off. Hay que anotar la información, por eso write down.',
      },
      coachTip: {
        ru: 'Write down = записать. Write up = оформить текст или отчёт. Write off = списать.',
        uk: 'Write down = записати. Write up = оформити текст або звіт. Write off = списати.',
        es: 'Write down = anotar. Write up = redactar o preparar un informe. Write off = cancelar o dar por perdido.',
      },
    },
    {
      situation: {
        ru: 'Машина сломалась на дороге.',
        uk: 'Машина зламалася на дорозі.',
        es: 'El coche se averió en la carretera.',
      },
      question: {
        ru: 'Какой смысл у break down здесь?',
        uk: 'Який сенс має break down тут?',
        es: '¿Qué significa break down aquí?',
      },
      sentence: 'My car broke down on the highway.',
      options: ['Сломалась', 'Разобрали на части', 'Упала вниз', 'Замедлилась'],
      correctIndex: 0,
      correctReason: {
        ru: 'Правильно. Break down для техники часто значит "сломаться / выйти из строя". Машина не "сломалась вниз". Она перестала нормально работать.',
        uk: 'Правильно. Break down для техніки часто означає "зламатися / вийти з ладу". Машина не "зламалася вниз". Вона перестала нормально працювати.',
        es: 'Correcto. Break down con máquinas suele significar "averiarse / dejar de funcionar". El coche no "se rompió hacia abajo". Dejó de funcionar bien.',
      },
      wrongReason: {
        ru: 'Тут down не переводится буквально. Break down для машины - это устойчивый блок: техника перестала работать.',
        uk: 'Тут down не перекладається буквально. Break down для машини - це сталий блок: техніка перестала працювати.',
        es: 'Aquí down no se traduce literalmente. Break down para un coche es un bloque fijo: la máquina dejó de funcionar.',
      },
      coachTip: {
        ru: 'Break down меняет смысл по контексту: машина ломается, человек срывается/плачет, план можно разбить на части.',
        uk: 'Break down змінює сенс за контекстом: машина ламається, людина зривається/плаче, план можна розбити на частини.',
        es: 'Break down cambia según el contexto: una máquina se avería, una persona se derrumba, un plan se puede desglosar.',
      },
    },
    {
      situation: {
        ru: 'Ты просишь не сдаваться.',
        uk: 'Ти просиш не здаватися.',
        es: 'Pides que alguien no se rinda.',
      },
      question: {
        ru: 'Какой фразовый глагол нужен?',
        uk: 'Яке фразове дієслово потрібне?',
        es: '¿Qué phrasal verb se necesita?',
      },
      sentence: 'Don\'t ___ now. You\'re almost there.',
      options: ['give up', 'give in', 'give out', 'give away'],
      correctIndex: 0,
      correctReason: {
        ru: 'Да. Give up значит "сдаться / прекратить попытки". Ты говоришь человеку: не бросай сейчас, ты почти дошёл.',
        uk: 'Так. Give up означає "здатися / припинити спроби". Ти кажеш людині: не кидай зараз, ти майже дійшов.',
        es: 'Sí. Give up significa "rendirse / dejar de intentar". Le dices a la persona: no lo dejes ahora, ya casi estás.',
      },
      wrongReason: {
        ru: 'Нужен смысл "сдаться". Это give up. Give in - уступить давлению. Give out - раздать или закончиться. Give away - отдать или раскрыть секрет.',
        uk: 'Потрібен сенс "здатися". Це give up. Give in - поступитися тиску. Give out - роздати або закінчитися. Give away - віддати або розкрити секрет.',
        es: 'Necesitas el sentido de "rendirse". Es give up. Give in - ceder a la presión. Give out - repartir o agotarse. Give away - regalar o revelar un secreto.',
      },
      coachTip: {
        ru: 'Give up = закончить попытки. Запомни как кнопку "я сдаюсь".',
        uk: 'Give up = завершити спроби. Запам\'ятай як кнопку "я здаюся".',
        es: 'Give up = terminar los intentos. Recuérdalo como el botón "me rindo".',
      },
    },
    {
      situation: {
        ru: 'Ты просишь кого-то присмотреть за ребёнком.',
        uk: 'Ти просиш когось доглянути за дитиною.',
        es: 'Pides a alguien que cuide al bebé.',
      },
      question: {
        ru: 'Выбери правильный блок:',
        uk: 'Обери правильний блок:',
        es: 'Elige el bloque correcto:',
      },
      sentence: 'Can you ___ the baby while I cook?',
      options: ['look after', 'look at', 'look for', 'look up'],
      correctIndex: 0,
      correctReason: {
        ru: 'Верно. Look after значит "присматривать / заботиться". Здесь нужно не смотреть на ребёнка, а отвечать за него какое-то время.',
        uk: 'Вірно. Look after означає "доглядати / піклуватися". Тут потрібно не дивитися на дитину, а відповідати за неї певний час.',
        es: 'Correcto. Look after significa "cuidar". Aquí no necesitas mirar al bebé, sino encargarte de él por un rato.',
      },
      wrongReason: {
        ru: 'Смотри на весь блок. Look at - смотреть на. Look for - искать. Look up - искать информацию. Look after - присматривать.',
        uk: 'Дивись на весь блок. Look at - дивитися на. Look for - шукати. Look up - шукати інформацію. Look after - доглядати.',
        es: 'Mira todo el bloque. Look at - mirar. Look for - buscar. Look up - buscar información. Look after - cuidar.',
      },
      coachTip: {
        ru: 'Look after = заботиться о ком-то. After здесь как "следить за тем, что будет после".',
        uk: 'Look after = піклуватися про когось. After тут як "стежити за тим, що буде далі".',
        es: 'Look after = cuidar a alguien. After aquí sugiere ocuparse de lo que viene después.',
      },
    },
    {
      situation: {
        ru: 'Ты просишь выключить свет.',
        uk: 'Ти просиш вимкнути світло.',
        es: 'Pides apagar la luz.',
      },
      question: {
        ru: 'Какой порядок правильный, если объект - it?',
        uk: 'Який порядок правильний, якщо об\'єкт - it?',
        es: '¿Qué orden es correcto si el objeto es it?',
      },
      sentence: 'Please turn ___ before bed.',
      options: ['it off', 'off it', 'the light off it', 'off the it'],
      correctIndex: 0,
      correctReason: {
        ru: 'Правильно. Turn off можно разделять. Если объект - местоимение, оно обязано встать между глаголом и частицей: turn it off.',
        uk: 'Правильно. Turn off можна розділяти. Якщо об\'єкт - займенник, він має стояти між дієсловом і часткою: turn it off.',
        es: 'Correcto. Turn off es separable. Si el objeto es un pronombre, debe ir entre el verbo y la partícula: turn it off.',
      },
      wrongReason: {
        ru: 'С местоимением нельзя сказать turn off it. В separable phrasal verbs местоимение идёт в середину: turn it off, pick it up, put it on.',
        uk: 'Із займенником не можна сказати turn off it. У separable phrasal verbs займенник іде в середину: turn it off, pick it up, put it on.',
        es: 'Con un pronombre no se dice turn off it. En phrasal verbs separables, el pronombre va en medio: turn it off, pick it up, put it on.',
      },
      coachTip: {
        ru: 'Если видишь it/them/him/her, проверь: возможно, частицу надо поставить после местоимения.',
        uk: 'Якщо бачиш it/them/him/her, перевір: можливо, частку треба поставити після займенника.',
        es: 'Si ves it/them/him/her, revisa: quizá la partícula debe ir después del pronombre.',
      },
    },
    {
      situation: {
        ru: 'Ты хочешь узнать информацию в словаре или интернете.',
        uk: 'Ти хочеш знайти інформацію в словнику або інтернеті.',
        es: 'Quieres buscar información en un diccionario o en internet.',
      },
      question: {
        ru: 'Какой фразовый глагол подходит?',
        uk: 'Яке фразове дієслово підходить?',
        es: '¿Qué phrasal verb encaja?',
      },
      sentence: 'I didn\'t know the word, so I looked it ___.',
      options: ['up', 'after', 'for', 'out'],
      correctIndex: 0,
      correctReason: {
        ru: 'Да. Look up значит "найти информацию". С местоимением it порядок такой: looked it up.',
        uk: 'Так. Look up означає "знайти інформацію". Із займенником it порядок такий: looked it up.',
        es: 'Sí. Look up significa "buscar información". Con el pronombre it, el orden es: looked it up.',
      },
      wrongReason: {
        ru: 'Здесь не просто искать предмет. Ты ищешь информацию о слове. Для этого нужен look up. И с it частица идёт после местоимения: looked it up.',
        uk: 'Тут не просто шукати предмет. Ти шукаєш інформацію про слово. Для цього потрібен look up. І з it частка йде після займенника: looked it up.',
        es: 'Aquí no buscas un objeto físico. Buscas información sobre una palabra. Para eso necesitas look up. Y con it, la partícula va después del pronombre: looked it up.',
      },
      coachTip: {
        ru: 'Look for = искать вещь. Look up = искать информацию.',
        uk: 'Look for = шукати річ. Look up = шукати інформацію.',
        es: 'Look for = buscar una cosa. Look up = buscar información.',
      },
    },
    {
      situation: {
        ru: 'Ты хочешь продолжить делать что-то, несмотря на паузу.',
        uk: 'Ти хочеш продовжити щось робити попри паузу.',
        es: 'Quieres seguir haciendo algo después de una pausa.',
      },
      question: {
        ru: 'Выбери правильный фразовый глагол:',
        uk: 'Обери правильне фразове дієслово:',
        es: 'Elige el phrasal verb correcto:',
      },
      sentence: 'Let\'s carry ___ with the lesson.',
      options: ['on', 'off', 'out', 'up'],
      correctIndex: 0,
      correctReason: {
        ru: 'Верно. Carry on значит "продолжать". On часто держит действие включённым: keep on, go on, carry on.',
        uk: 'Вірно. Carry on означає "продовжувати". On часто тримає дію ввімкненою: keep on, go on, carry on.',
        es: 'Correcto. Carry on significa "continuar". On suele mantener la acción encendida: keep on, go on, carry on.',
      },
      wrongReason: {
        ru: 'Тут нужен смысл продолжения. Это on: carry on. Off чаще выключает или отделяет, out часто выводит наружу или показывает завершение ресурса.',
        uk: 'Тут потрібен сенс продовження. Це on: carry on. Off частіше вимикає або відділяє, out часто виводить назовні або показує завершення ресурсу.',
        es: 'Aquí necesitas sentido de continuación. Es on: carry on. Off suele apagar o separar, out suele sacar hacia fuera o mostrar agotamiento.',
      },
      coachTip: {
        ru: 'On часто значит "продолжай процесс": go on, keep on, carry on.',
        uk: 'On часто означає "продовжуй процес": go on, keep on, carry on.',
        es: 'On suele significar "continúa el proceso": go on, keep on, carry on.',
      },
    },
  ],
  consolidationTitle: {
    ru: 'Фразовые глаголы стали блоками, а не хаосом',
    uk: 'Фразові дієслова стали блоками, а не хаосом',
    es: 'Los phrasal verbs ya son bloques, no caos',
  },
  consolidationText: {
    ru: 'Теперь закрепи это на реальных фразах. Главная цель - не переводить частицы буквально, а видеть весь блок: run out of, give up, look after, turn it off.',
    uk: 'Тепер закріпи це на реальних фразах. Головна ціль - не перекладати частки буквально, а бачити весь блок: run out of, give up, look after, turn it off.',
    es: 'Ahora consolídalo con frases reales. El objetivo no es traducir partículas literalmente, sino ver el bloque completo: run out of, give up, look after, turn it off.',
  },
};

const NOUN_LESSON: ProblemCoachLesson = {
  category: 'noun',
  heroLabel: { ru: 'PERSONAL DIAGNOSIS', uk: 'PERSONAL DIAGNOSIS', es: 'PERSONAL DIAGNOSIS' },
  heroTitle: {
    ru: 'Существительные: форма важна',
    uk: 'Іменники: форма важлива',
    es: 'Sustantivos: la forma importa',
  },
  heroSubtitle: {
    ru: 'Ошибки с существительными обычно касаются числа, исчисляемости или неправильного множественного числа.',
    uk: 'Помилки з іменниками зазвичай стосуються числа, злічуваності або неправильного множини.',
    es: 'Los errores con sustantivos suelen referirse al número, la contabilidad o el plural irregular.',
  },
  diagnosisTitle: { ru: 'Что показал анализ', uk: 'Що показав аналіз', es: 'Qué mostró el análisis' },
  diagnosisText: {
    ru: 'Типичные ошибки: "informations" вместо "information" (неисчисляемое), "childs" вместо "children", или отсутствие -s там, где множественное число обязательно.',
    uk: 'Типові помилки: "informations" замість "information" (незлічуване), "childs" замість "children", або відсутність -s там, де множина обов\'язкова.',
    es: 'Errores típicos: "informations" en vez de "information" (incontable), "childs" en vez de "children", o ausencia de -s donde el plural es obligatorio.',
  },
  blocks: [
    {
      type: 'mental_model',
      accent: 'gold',
      icon: 'bulb-outline',
      title: { ru: 'Неисчисляемые — особый список', uk: 'Незлічувані — особливий список', es: 'Los incontables — lista especial' },
      body: {
        ru: 'Information, advice, news, furniture, luggage, money, research — всегда единственное число. Нельзя сказать "an information" или "two advices". Эти слова просто не имеют множественного числа.',
        uk: 'Information, advice, news, furniture, luggage, money, research — завжди однина. Не можна сказати "an information" або "two advices". Ці слова просто не мають множини.',
        es: 'Information, advice, news, furniture, luggage, money, research — siempre singular. No se puede decir "an information" o "two advices". Estas palabras simplemente no tienen plural.',
      },
    },
    {
      type: 'trap',
      accent: 'red',
      icon: 'close-circle-outline',
      title: { ru: 'Неправильные множественные', uk: 'Неправильні множини', es: 'Plurales irregulares' },
      body: {
        ru: 'Child → children, man → men, woman → women, tooth → teeth, foot → feet, person → people. Их нужно просто запомнить — правила тут нет.',
        uk: 'Child → children, man → men, woman → women, tooth → teeth, foot → feet, person → people. Їх просто треба запам\'ятати — правила тут немає.',
        es: 'Child → children, man → men, woman → women, tooth → teeth, foot → feet, person → people. Hay que memorizarlos — no hay regla.',
      },
    },
  ],
  exerciseIntroTitle: { ru: 'Закрепить на фразах', uk: 'Закріпити на фразах', es: 'Consolidar con frases' },
  exerciseIntroText: {
    ru: 'Повтори фразы, где существительные давались тяжело.',
    uk: 'Повтори фрази, де іменники давалися важко.',
    es: 'Repasa las frases donde los sustantivos te costaron.',
  },
  exercises: [
    {
      situation: { ru: 'Ты просишь немного информации.', uk: 'Ти просиш трохи інформації.', es: 'Pides algo de información.' },
      question: { ru: 'Выбери правильную форму:', uk: 'Обери правильну форму:', es: 'Elige la forma correcta:' },
      sentence: 'Can I have some ___?',
      options: ['information', 'informations', 'an information', 'the informations'],
      correctIndex: 0,
      correctReason: { ru: 'Верно. Information в английском неисчисляемое. Поэтому some information, без a и без -s.', uk: 'Вірно. Information в англійській незлічуване. Тому some information, без a і без -s.', es: 'Correcto. Information es incontable en inglés. Por eso some information, sin a y sin -s.' },
      wrongReason: { ru: 'Information не работает как отдельная штука. Нельзя an information или informations. Нужно some information или a piece of information.', uk: 'Information не працює як окрема штука. Не можна an information або informations. Потрібно some information або a piece of information.', es: 'Information no funciona como una unidad separada. No se dice an information ni informations. Necesitas some information o a piece of information.' },
      coachTip: { ru: 'Information, advice, money, furniture - опасная зона. Обычно без a и без plural.', uk: 'Information, advice, money, furniture - небезпечна зона. Зазвичай без a і без plural.', es: 'Information, advice, money, furniture - zona peligrosa. Normalmente sin a y sin plural.' },
    },
    {
      situation: { ru: 'Ты хочешь сказать "один совет".', uk: 'Ти хочеш сказати "одна порада".', es: 'Quieres decir "un consejo".' },
      question: { ru: 'Как английский выражает одну единицу advice?', uk: 'Як англійська виражає одну одиницю advice?', es: '¿Cómo expresa el inglés una unidad de advice?' },
      sentence: 'She gave me ___ advice.',
      options: ['a piece of', 'an', 'one', 'a'],
      correctIndex: 0,
      correctReason: { ru: 'Да. Advice неисчисляемое, поэтому "один совет" по-английски a piece of advice.', uk: 'Так. Advice незлічуване, тому "одна порада" англійською - a piece of advice.', es: 'Sí. Advice es incontable, por eso "un consejo" en inglés es a piece of advice.' },
      wrongReason: { ru: 'Advice нельзя считать напрямую: не an advice, не one advice. Нужна упаковка: a piece of advice.', uk: 'Advice не можна рахувати напряму: не an advice, не one advice. Потрібна упаковка: a piece of advice.', es: 'Advice no se cuenta directamente: no an advice, no one advice. Necesitas un envase: a piece of advice.' },
      coachTip: { ru: 'A piece of - это упаковка для неисчисляемого: a piece of advice, a piece of information.', uk: 'A piece of - це упаковка для незлічуваного: a piece of advice, a piece of information.', es: 'A piece of es un envase para incontables: a piece of advice, a piece of information.' },
    },
    {
      situation: { ru: 'Ты спрашиваешь, сколько людей в комнате.', uk: 'Ти питаєш, скільки людей у кімнаті.', es: 'Preguntas cuántas personas hay en la habitación.' },
      question: { ru: 'Выбери правильное множественное число:', uk: 'Обери правильну множину:', es: 'Elige el plural correcto:' },
      sentence: 'How many ___ are in the room?',
      options: ['people', 'persons', 'peoples', 'person'],
      correctIndex: 0,
      correctReason: { ru: 'Правильно. People - обычное множественное для person в живой речи: many people.', uk: 'Правильно. People - звичайна множина для person у живій мові: many people.', es: 'Correcto. People es el plural normal de person en el habla común: many people.' },
      wrongReason: { ru: 'Person в обычной речи превращается в people. Persons звучит формально или юридически. Peoples - это "народы", не "люди в комнате".', uk: 'Person у звичайній мові перетворюється на people. Persons звучить формально або юридично. Peoples - це "народи", не "люди в кімнаті".', es: 'Person normalmente se convierte en people. Persons suena formal o legal. Peoples significa "pueblos", no "personas en la habitación".' },
      coachTip: { ru: 'One person, two people. Peoples - только в смысле народы.', uk: 'One person, two people. Peoples - тільки в сенсі народи.', es: 'One person, two people. Peoples solo significa pueblos.' },
    },
    {
      situation: { ru: 'Ты говоришь, что полиция уже здесь.', uk: 'Ти говориш, що поліція вже тут.', es: 'Dices que la policía ya está aquí.' },
      question: { ru: 'Какой глагол нужен?', uk: 'Яке дієслово потрібне?', es: '¿Qué verbo se necesita?' },
      sentence: 'The police ___ here.',
      options: ['are', 'is', 'was', 'be'],
      correctIndex: 0,
      correctReason: { ru: 'Да. Police в английском грамматически ведёт себя как plural. Поэтому the police are here.', uk: 'Так. Police в англійській граматично поводиться як plural. Тому the police are here.', es: 'Sí. Police en inglés se comporta gramaticalmente como plural. Por eso the police are here.' },
      wrongReason: { ru: 'Police выглядит как одно учреждение, но в английской грамматике это люди, множественное число. Поэтому are.', uk: 'Police виглядає як одна установа, але в англійській граматиці це люди, множина. Тому are.', es: 'Police parece una institución, pero gramaticalmente son personas, plural. Por eso are.' },
      coachTip: { ru: 'Police are, people are, children are. Не доверяй внешнему виду слова.', uk: 'Police are, people are, children are. Не довіряй зовнішньому вигляду слова.', es: 'Police are, people are, children are. No confíes solo en la apariencia de la palabra.' },
    },
    {
      situation: { ru: 'Ты говоришь о деньгах как о количестве.', uk: 'Ти говориш про гроші як про кількість.', es: 'Hablas del dinero como cantidad.' },
      question: { ru: 'Much или many?', uk: 'Much чи many?', es: '¿Much o many?' },
      sentence: "I don't have ___ money.",
      options: ['much', 'many', 'few', 'a few'],
      correctIndex: 0,
      correctReason: { ru: 'Верно. Money неисчисляемое, поэтому much money. Даже если монеты можно считать, money как слово ведёт себя как масса.', uk: 'Вірно. Money незлічуване, тому much money. Навіть якщо монети можна рахувати, money як слово поводиться як маса.', es: 'Correcto. Money es incontable, por eso much money. Aunque puedas contar monedas, money como palabra funciona como masa.' },
      wrongReason: { ru: 'Many используется для countable plural: many books, many people. Money неисчисляемое, поэтому much money.', uk: 'Many використовується для countable plural: many books, many people. Money незлічуване, тому much money.', es: 'Many se usa con contables en plural: many books, many people. Money es incontable, por eso much money.' },
      coachTip: { ru: 'Many + plural things. Much + mass: much money, much time, much information.', uk: 'Many + plural things. Much + mass: much money, much time, much information.', es: 'Many + cosas plurales. Much + masa: much money, much time, much information.' },
    },
    {
      situation: { ru: 'Ты говоришь о большом количестве книг.', uk: 'Ти говориш про велику кількість книг.', es: 'Hablas de una gran cantidad de libros.' },
      question: { ru: 'Выбери правильный вариант:', uk: 'Обери правильний варіант:', es: 'Elige la opción correcta:' },
      sentence: 'There are ___ books on the shelf.',
      options: ['many', 'much', 'little', 'an'],
      correctIndex: 0,
      correctReason: { ru: 'Правильно. Books - countable plural, поэтому many books.', uk: 'Правильно. Books - countable plural, тому many books.', es: 'Correcto. Books es contable plural, por eso many books.' },
      wrongReason: { ru: 'Book можно считать: one book, two books. Во множественном числе используем many, не much.', uk: 'Book можна рахувати: one book, two books. У множині використовуємо many, не much.', es: 'Book se puede contar: one book, two books. En plural usamos many, no much.' },
      coachTip: { ru: 'Если можно сказать two books, значит many books.', uk: 'Якщо можна сказати two books, значить many books.', es: 'Si puedes decir two books, entonces many books.' },
    },
    {
      situation: { ru: 'Ты говоришь об игрушке детей.', uk: 'Ти говориш про іграшку дітей.', es: 'Hablas del juguete de los niños.' },
      question: { ru: 'Выбери правильную притяжательную форму:', uk: 'Обери правильну присвійну форму:', es: 'Elige la forma posesiva correcta:' },
      sentence: 'This is ___ toy.',
      options: ["the children's", "the childrens'", "the children'", "the childs'"],
      correctIndex: 0,
      correctReason: { ru: "Верно. Children уже plural, но не заканчивается на -s. Поэтому добавляем 's: children's toy.", uk: "Вірно. Children уже plural, але не закінчується на -s. Тому додаємо 's: children's toy.", es: "Correcto. Children ya es plural, pero no termina en -s. Por eso añadimos 's: children's toy." },
      wrongReason: { ru: "Children - неправильное множественное число. Оно не получает ещё один s. Притяжательная форма: children's.", uk: "Children - неправильна множина. Вона не отримує ще один s. Присвійна форма: children's.", es: "Children es plural irregular. No recibe otro s. La forma posesiva es children's." },
      coachTip: { ru: "Regular plural: dogs' room. Irregular plural: children's room, men's room.", uk: "Regular plural: dogs' room. Irregular plural: children's room, men's room.", es: "Regular plural: dogs' room. Irregular plural: children's room, men's room." },
    },
    {
      situation: { ru: 'Ты говоришь о мебели в комнате.', uk: 'Ти говориш про меблі в кімнаті.', es: 'Hablas de los muebles de la habitación.' },
      question: { ru: 'Что звучит естественно?', uk: 'Що звучить природно?', es: '¿Qué suena natural?' },
      sentence: 'There is too much ___ in this room.',
      options: ['furniture', 'furnitures', 'a furniture', 'many furniture'],
      correctIndex: 0,
      correctReason: { ru: 'Да. Furniture неисчисляемое. Поэтому much furniture, без -s и без a.', uk: 'Так. Furniture незлічуване. Тому much furniture, без -s і без a.', es: 'Sí. Furniture es incontable. Por eso much furniture, sin -s y sin a.' },
      wrongReason: { ru: 'Furniture в английском не считается как chairs/tables. Это масса. Можно сказать pieces of furniture, но не furnitures.', uk: 'Furniture в англійській не рахується як chairs/tables. Це маса. Можна сказати pieces of furniture, але не furnitures.', es: 'Furniture en inglés no se cuenta como chairs/tables. Es masa. Puedes decir pieces of furniture, pero no furnitures.' },
      coachTip: { ru: 'Furniture = масса. Chair/table = отдельные штуки.', uk: 'Furniture = маса. Chair/table = окремі штуки.', es: 'Furniture = masa. Chair/table = unidades separadas.' },
    },
  ],
  consolidationTitle: { ru: 'Перейти к тренировке', uk: 'Перейти до тренування', es: 'Ir al entrenamiento' },
  consolidationText: {
    ru: 'Тренируй существительные на реальных фразах из своих ошибок.',
    uk: 'Тренуй іменники на реальних фразах зі своїх помилок.',
    es: 'Entrena los sustantivos con frases reales de tus errores.',
  },
};

const ADJECTIVE_LESSON: ProblemCoachLesson = {
  category: 'adjective',
  heroLabel: { ru: 'PERSONAL DIAGNOSIS', uk: 'PERSONAL DIAGNOSIS', es: 'PERSONAL DIAGNOSIS' },
  heroTitle: {
    ru: 'Прилагательные: порядок и степени',
    uk: 'Прикметники: порядок і ступені',
    es: 'Adjetivos: orden y grados',
  },
  heroSubtitle: {
    ru: 'В английском прилагательное не изменяется по роду и числу — зато у него есть строгий порядок в цепочке и три степени сравнения.',
    uk: 'В англійській прикметник не змінюється за родом і числом — зате у нього є суворий порядок у ланцюжку та три ступені порівняння.',
    es: 'En inglés el adjetivo no varía por género ni número — pero tiene un orden estricto en la cadena y tres grados de comparación.',
  },
  diagnosisTitle: { ru: 'Что показал анализ', uk: 'Що показав аналіз', es: 'Qué mostró el análisis' },
  diagnosisText: {
    ru: 'Типичные ошибки: "more fast" вместо "faster", "the most big" вместо "the biggest", или неправильный порядок прилагательных ("Italian beautiful car" вместо "beautiful Italian car").',
    uk: 'Типові помилки: "more fast" замість "faster", "the most big" замість "the biggest", або неправильний порядок прикметників ("Italian beautiful car" замість "beautiful Italian car").',
    es: 'Errores típicos: "more fast" en vez de "faster", "the most big" en vez de "the biggest", o orden incorrecto de adjetivos ("Italian beautiful car" en vez de "beautiful Italian car").',
  },
  blocks: [
    {
      type: 'main_rule',
      accent: 'green',
      icon: 'checkmark-circle-outline',
      title: { ru: 'Короткие vs длинные', uk: 'Короткі vs довгі', es: 'Cortos vs largos' },
      body: {
        ru: 'Один-два слога — обычно -er/-est: fast → faster → fastest. Три слога и больше — more/most: beautiful → more beautiful → most beautiful. Исключения: good → better → best, bad → worse → worst.',
        uk: 'Один-два склади — зазвичай -er/-est: fast → faster → fastest. Три склади і більше — more/most: beautiful → more beautiful → most beautiful. Винятки: good → better → best, bad → worse → worst.',
        es: 'Una o dos sílabas — normalmente -er/-est: fast → faster → fastest. Tres sílabas o más — more/most: beautiful → more beautiful → most beautiful. Excepciones: good → better → best, bad → worse → worst.',
      },
    },
  ],
  exerciseIntroTitle: { ru: 'Закрепить на фразах', uk: 'Закріпити на фразах', es: 'Consolidar con frases' },
  exerciseIntroText: {
    ru: 'Повтори фразы с прилагательными, где ты ошибался.',
    uk: 'Повтори фрази з прикметниками, де ти помилявся.',
    es: 'Repasa las frases con adjetivos donde fallaste.',
  },
  exercises: [
    {
      situation: { ru: 'Ты сравниваешь фильм с книгой. Interesting - длинное слово.', uk: 'Ти порівнюєш фільм із книгою. Interesting - довге слово.', es: 'Comparas una película con un libro. Interesting es una palabra larga.' },
      question: { ru: 'Выбери правильную сравнительную форму:', uk: 'Обери правильну порівняльну форму:', es: 'Elige la forma comparativa correcta:' },
      sentence: 'This film is ___ than the book.',
      options: ['more interesting', 'interestinger', 'most interesting', 'interesting more'],
      correctIndex: 0,
      correctReason: { ru: 'Верно. Interesting длинное, поэтому идём по дороге more: more interesting.', uk: 'Вірно. Interesting довге, тому йдемо дорогою more: more interesting.', es: 'Correcto. Interesting es larga, por eso usamos la ruta more: more interesting.' },
      wrongReason: { ru: 'Interesting не получает -er. Это не короткое слово типа fast или big. Нужна форма more interesting.', uk: 'Interesting не отримує -er. Це не коротке слово типу fast або big. Потрібна форма more interesting.', es: 'Interesting no lleva -er. No es una palabra corta como fast o big. Necesitas more interesting.' },
      coachTip: { ru: 'Длинные прилагательные обычно не меняют форму: more interesting, more expensive, more comfortable.', uk: 'Довгі прикметники зазвичай не змінюють форму: more interesting, more expensive, more comfortable.', es: 'Los adjetivos largos normalmente no cambian forma: more interesting, more expensive, more comfortable.' },
    },
    {
      situation: { ru: 'Ты говоришь о лучшем дне в жизни.', uk: 'Ти говориш про найкращий день у житті.', es: 'Hablas del mejor día de tu vida.' },
      question: { ru: 'Выбери правильную превосходную форму:', uk: 'Обери правильну найвищу форму:', es: 'Elige la forma superlativa correcta:' },
      sentence: 'It was the ___ day of my life.',
      options: ['best', 'most good', 'goodest', 'better'],
      correctIndex: 0,
      correctReason: { ru: 'Правильно. Good идёт по особой дороге: good, better, the best.', uk: 'Правильно. Good іде особливою дорогою: good, better, the best.', es: 'Correcto. Good toma una ruta especial: good, better, the best.' },
      wrongReason: { ru: 'Good не делает gooder или most good. У него своя форма: better для сравнения, the best для "самый лучший".', uk: 'Good не робить gooder або most good. У нього своя форма: better для порівняння, the best для "найкращий".', es: 'Good no forma gooder ni most good. Tiene su propia forma: better para comparar, the best para "el mejor".' },
      coachTip: { ru: 'Good - better - the best. Bad - worse - the worst.', uk: 'Good - better - the best. Bad - worse - the worst.', es: 'Good - better - the best. Bad - worse - the worst.' },
    },
    {
      situation: { ru: 'Ты сравниваешь две машины по размеру.', uk: 'Ти порівнюєш дві машини за розміром.', es: 'Comparas dos coches por tamaño.' },
      question: { ru: 'Что звучит правильно?', uk: 'Що звучить правильно?', es: '¿Qué suena correcto?' },
      sentence: 'This car is ___ than mine.',
      options: ['bigger', 'more bigger', 'biggest', 'most big'],
      correctIndex: 0,
      correctReason: { ru: 'Да. Big короткое, поэтому bigger. More не нужен, потому что -er уже сделал сравнение.', uk: 'Так. Big коротке, тому bigger. More не потрібен, бо -er уже зробив порівняння.', es: 'Sí. Big es corto, por eso bigger. More no hace falta porque -er ya hizo la comparación.' },
      wrongReason: { ru: 'More bigger - двойная система. Либо more, либо -er. Для big правильно bigger.', uk: 'More bigger - подвійна система. Або more, або -er. Для big правильно bigger.', es: 'More bigger usa doble sistema. O more, o -er. Para big, correcto es bigger.' },
      coachTip: { ru: 'Если уже есть -er, не добавляй more: bigger, faster, smaller.', uk: 'Якщо вже є -er, не додавай more: bigger, faster, smaller.', es: 'Si ya hay -er, no añadas more: bigger, faster, smaller.' },
    },
    {
      situation: { ru: 'Ты говоришь о самом лёгком задании.', uk: 'Ти говориш про найлегше завдання.', es: 'Hablas de la tarea más fácil.' },
      question: { ru: 'Выбери правильную форму:', uk: 'Обери правильну форму:', es: 'Elige la forma correcta:' },
      sentence: 'This is the ___ task in the test.',
      options: ['easiest', 'most easiest', 'easier', 'more easy'],
      correctIndex: 0,
      correctReason: { ru: 'Верно. Easy становится easiest. Most не нужен, потому что -est уже показывает "самый".', uk: 'Вірно. Easy стає easiest. Most не потрібен, бо -est уже показує "най".', es: 'Correcto. Easy se convierte en easiest. Most no hace falta porque -est ya muestra "el más".' },
      wrongReason: { ru: 'Most easiest - это двойная маркировка. Easiest уже значит "самый лёгкий".', uk: 'Most easiest - це подвійне маркування. Easiest уже означає "найлегший".', es: 'Most easiest es doble marca. Easiest ya significa "el más fácil".' },
      coachTip: { ru: 'Если уже есть -est, most не нужен: easiest, fastest, smallest.', uk: 'Якщо вже є -est, most не потрібен: easiest, fastest, smallest.', es: 'Si ya hay -est, no necesitas most: easiest, fastest, smallest.' },
    },
    {
      situation: { ru: 'Ты описываешь человека после be.', uk: 'Ти описуєш людину після be.', es: 'Describes a una persona después de be.' },
      question: { ru: 'Что правильно?', uk: 'Що правильно?', es: '¿Qué es correcto?' },
      sentence: 'She is ___.',
      options: ['beautiful', 'a beautiful', 'beautifully', 'the beautiful'],
      correctIndex: 0,
      correctReason: { ru: 'Правильно. После be прилагательное идёт само: She is beautiful. A нужен перед существительным: She is a beautiful person.', uk: 'Правильно. Після be прикметник іде сам: She is beautiful. A потрібен перед іменником: She is a beautiful person.', es: 'Correcto. Después de be, el adjetivo va solo: She is beautiful. A va antes de un sustantivo: She is a beautiful person.' },
      wrongReason: { ru: 'Beautiful - прилагательное, не существительное. Нельзя She is a beautiful без noun. Можно: She is beautiful или She is a beautiful woman.', uk: 'Beautiful - прикметник, не іменник. Не можна She is a beautiful без noun. Можна: She is beautiful або She is a beautiful woman.', es: 'Beautiful es adjetivo, no sustantivo. No se dice She is a beautiful sin noun. Puedes decir: She is beautiful o She is a beautiful woman.' },
      coachTip: { ru: 'Be + adjective без a: is tired, is ready, is beautiful.', uk: 'Be + adjective без a: is tired, is ready, is beautiful.', es: 'Be + adjective sin a: is tired, is ready, is beautiful.' },
    },
    {
      situation: { ru: 'Ты сравниваешь двух братьев по возрасту.', uk: 'Ти порівнюєш двох братів за віком.', es: 'Comparas a dos hermanos por edad.' },
      question: { ru: 'Выбери естественный вариант:', uk: 'Обери природний варіант:', es: 'Elige la opción natural:' },
      sentence: 'My brother is ___ than me.',
      options: ['older', 'elder', 'more old', 'oldest'],
      correctIndex: 0,
      correctReason: { ru: 'Да. В сравнении с than используем older than. Elder чаще работает перед noun: my elder brother.', uk: 'Так. У порівнянні з than використовуємо older than. Elder частіше працює перед noun: my elder brother.', es: 'Sí. En comparación con than usamos older than. Elder suele ir antes de un noun: my elder brother.' },
      wrongReason: { ru: 'Elder не используется так свободно с than. Обычно: my elder brother, но he is older than me.', uk: 'Elder не використовується так вільно з than. Зазвичай: my elder brother, але he is older than me.', es: 'Elder no se usa tan libremente con than. Normalmente: my elder brother, pero he is older than me.' },
      coachTip: { ru: 'Для обычного сравнения возраста бери older than.', uk: 'Для звичайного порівняння віку бери older than.', es: 'Para comparar edad normalmente usa older than.' },
    },
    {
      situation: { ru: 'Ты описываешь машину несколькими прилагательными.', uk: 'Ти описуєш машину кількома прикметниками.', es: 'Describes un coche con varios adjetivos.' },
      question: { ru: 'Какой порядок звучит естественнее?', uk: 'Який порядок звучить природніше?', es: '¿Qué orden suena más natural?' },
      sentence: 'He bought a ___ car.',
      options: ['big red Italian', 'red Italian big', 'Italian big red', 'red big Italian'],
      correctIndex: 0,
      correctReason: { ru: 'Верно. В естественном порядке обычно размер идёт перед цветом, а происхождение после цвета: a big red Italian car.', uk: 'Вірно. У природному порядку зазвичай розмір іде перед кольором, а походження після кольору: a big red Italian car.', es: 'Correcto. En el orden natural, tamaño suele ir antes de color, y origen después de color: a big red Italian car.' },
      wrongReason: { ru: 'Порядок прилагательных в английском не случайный. Обычно: размер → цвет → происхождение → noun. Поэтому big red Italian car.', uk: 'Порядок прикметників в англійській не випадковий. Зазвичай: розмір → колір → походження → noun. Тому big red Italian car.', es: 'El orden de adjetivos en inglés no es aleatorio. Normalmente: tamaño → color → origen → noun. Por eso big red Italian car.' },
      coachTip: { ru: 'На практике не ставь много прилагательных подряд. 2-3 достаточно, иначе фраза становится тяжёлой.', uk: 'На практиці не став багато прикметників поспіль. 2-3 достатньо, інакше фраза стає важкою.', es: 'En la práctica no pongas muchos adjetivos seguidos. 2-3 bastan, si no la frase se vuelve pesada.' },
    },
    {
      situation: { ru: 'Ты сравниваешь два варианта и хочешь сказать "намного лучше".', uk: 'Ти порівнюєш два варіанти й хочеш сказати "набагато краще".', es: 'Comparas dos opciones y quieres decir "mucho mejor".' },
      question: { ru: 'Что звучит правильно?', uk: 'Що звучить правильно?', es: '¿Qué suena correcto?' },
      sentence: 'This option is ___ than the first one.',
      options: ['much better', 'very better', 'more better', 'best'],
      correctIndex: 0,
      correctReason: { ru: 'Правильно. Better уже сравнительная форма. Усилить её можно через much: much better.', uk: 'Правильно. Better вже порівняльна форма. Підсилити її можна через much: much better.', es: 'Correcto. Better ya es comparativo. Puedes intensificarlo con much: much better.' },
      wrongReason: { ru: 'Very не усиливает сравнительную форму better. More тоже не нужен. Естественно: much better.', uk: 'Very не підсилює порівняльну форму better. More теж не потрібен. Природно: much better.', es: 'Very no intensifica el comparativo better. More tampoco hace falta. Natural: much better.' },
      coachTip: { ru: 'С comparative часто используем much/a lot/far: much better, a lot easier, far cheaper.', uk: 'З comparative часто використовуємо much/a lot/far: much better, a lot easier, far cheaper.', es: 'Con comparativos usamos mucho much/a lot/far: much better, a lot easier, far cheaper.' },
    },
  ],
  consolidationTitle: { ru: 'Перейти к тренировке', uk: 'Перейти до тренування', es: 'Ir al entrenamiento' },
  consolidationText: {
    ru: 'Тренируй прилагательные на своих фразах.',
    uk: 'Тренуй прикметники на своїх фразах.',
    es: 'Entrena los adjetivos con tus frases.',
  },
};

const ADVERB_LESSON: ProblemCoachLesson = {
  category: 'adverb',
  heroLabel: { ru: 'PERSONAL DIAGNOSIS', uk: 'PERSONAL DIAGNOSIS', es: 'PERSONAL DIAGNOSIS' },
  heroTitle: {
    ru: 'Наречия: hard и hardly — разные слова',
    uk: 'Прислівники: hard і hardly — різні слова',
    es: 'Adverbios: hard y hardly son palabras distintas',
  },
  heroSubtitle: {
    ru: 'Hard = усердно. Hardly = едва. Это не одно слово с суффиксом — это два разных наречия с противоположным смыслом.',
    uk: 'Hard = старанно. Hardly = ледве. Це не одне слово з суфіксом — це два різних прислівники з протилежним смислом.',
    es: 'Hard = con esfuerzo. Hardly = apenas. No es la misma palabra con sufijo — son dos adverbios distintos con significado opuesto.',
  },
  diagnosisTitle: { ru: 'Что показал анализ', uk: 'Що показав аналіз', es: 'Qué mostró el análisis' },
  diagnosisText: {
    ru: 'Ошибки с наречиями часто двух типов: путаница прилагательного и наречия (She sings beautiful → beautifully), или выбор между парами hard/hardly, late/lately, near/nearly.',
    uk: 'Помилки з прислівниками часто двох типів: плутанина прикметника та прислівника (She sings beautiful → beautifully), або вибір між парами hard/hardly, late/lately, near/nearly.',
    es: 'Los errores con adverbios son de dos tipos: confusión entre adjetivo y adverbio (She sings beautiful → beautifully), o elección entre pares hard/hardly, late/lately, near/nearly.',
  },
  blocks: [
    {
      type: 'main_rule',
      accent: 'green',
      icon: 'checkmark-circle-outline',
      title: { ru: 'Когда нужно наречие', uk: 'Коли потрібен прислівник', es: 'Cuándo se necesita adverbio' },
      body: {
        ru: 'Если описываешь глагол — нужно наречие: She sings beautifully (не beautiful). Если описываешь существительное — прилагательное: She is a beautiful singer. Вопрос: "как?" → наречие, "какой?" → прилагательное.',
        uk: 'Якщо описуєш дієслово — потрібен прислівник: She sings beautifully (не beautiful). Якщо описуєш іменник — прикметник: She is a beautiful singer. Питання: "як?" → прислівник, "який?" → прикметник.',
        es: 'Si describes un verbo — necesitas adverbio: She sings beautifully (no beautiful). Si describes un sustantivo — adjetivo: She is a beautiful singer. Pregunta: "¿cómo?" → adverbio, "¿cómo es?" → adjetivo.',
      },
    },
    {
      type: 'trap',
      accent: 'red',
      icon: 'close-circle-outline',
      title: { ru: 'Пары-ловушки', uk: 'Пари-пастки', es: 'Pares trampa' },
      body: {
        ru: 'Hard (усердно) / Hardly (едва). Late (поздно) / Lately (в последнее время). Near (близко) / Nearly (почти). High (высоко) / Highly (очень, в высокой степени). Это не степени одного слова — это разные слова.',
        uk: 'Hard (старанно) / Hardly (ледве). Late (пізно) / Lately (останнім часом). Near (близько) / Nearly (майже). High (високо) / Highly (дуже, значною мірою). Це не ступені одного слова — це різні слова.',
        es: 'Hard (con esfuerzo) / Hardly (apenas). Late (tarde) / Lately (últimamente). Near (cerca) / Nearly (casi). High (alto) / Highly (muy, en alto grado). No son grados de la misma palabra — son palabras distintas.',
      },
    },
  ],
  exerciseIntroTitle: { ru: 'Закрепить на фразах', uk: 'Закріпити на фразах', es: 'Consolidar con frases' },
  exerciseIntroText: {
    ru: 'Повтори фразы с наречиями, где ты ошибался.',
    uk: 'Повтори фрази з прислівниками, де ти помилявся.',
    es: 'Repasa las frases con adverbios donde fallaste.',
  },
  exercises: [
    {
      situation: { ru: 'Ты хочешь сказать, что человек много и усердно работает.', uk: 'Ти хочеш сказати, що людина багато й старанно працює.', es: 'Quieres decir que una persona trabaja mucho y con esfuerzo.' },
      question: { ru: 'Выбери правильную форму:', uk: 'Обери правильну форму:', es: 'Elige la forma correcta:' },
      sentence: 'He works very ___.',
      options: ['hard', 'hardly', 'well', 'strong'],
      correctIndex: 0,
      correctReason: { ru: 'Верно. Hard как наречие значит "усердно / сильно". He works hard - он много работает.', uk: 'Вірно. Hard як прислівник означає "старанно / сильно". He works hard - він багато працює.', es: 'Correcto. Hard como adverbio significa "con esfuerzo / mucho". He works hard - trabaja mucho.' },
      wrongReason: { ru: 'Hardly не значит "усердно". Hardly значит "едва / почти не". He hardly works - он почти не работает.', uk: 'Hardly не означає "старанно". Hardly означає "ледве / майже не". He hardly works - він майже не працює.', es: 'Hardly no significa "con esfuerzo". Hardly significa "apenas / casi no". He hardly works - casi no trabaja.' },
      coachTip: { ru: 'Hard = усердно. Hardly = едва. Это не пара "прилагательное - наречие", это ловушка.', uk: 'Hard = старанно. Hardly = ледве. Це не пара "прикметник - прислівник", це пастка.', es: 'Hard = con esfuerzo. Hardly = apenas. No es una pareja normal "adjetivo - adverbio", es una trampa.' },
    },
    {
      situation: { ru: 'Ты говоришь, что человек хорошо говорит по-английски.', uk: 'Ти говориш, що людина добре говорить англійською.', es: 'Dices que una persona habla bien inglés.' },
      question: { ru: 'Good или well?', uk: 'Good чи well?', es: '¿Good o well?' },
      sentence: 'She speaks English ___.',
      options: ['well', 'good', 'goodly', 'betterly'],
      correctIndex: 0,
      correctReason: { ru: 'Да. Speak - действие. Когда описываем действие, обычно нужен well: speaks well.', uk: 'Так. Speak - дія. Коли описуємо дію, зазвичай потрібен well: speaks well.', es: 'Sí. Speak es acción. Cuando describimos una acción, normalmente necesitamos well: speaks well.' },
      wrongReason: { ru: 'Good описывает существительное: good English, good job. Well описывает действие: speak well, play well, work well.', uk: 'Good описує іменник: good English, good job. Well описує дію: speak well, play well, work well.', es: 'Good describe un sustantivo: good English, good job. Well describe una acción: speak well, play well, work well.' },
      coachTip: { ru: 'Good = какой? Well = как?', uk: 'Good = який? Well = як?', es: 'Good = ¿qué tipo? Well = ¿cómo?' },
    },
    {
      situation: { ru: 'Ты говоришь, что поезд быстро ехал.', uk: 'Ти говориш, що поїзд швидко їхав.', es: 'Dices que el tren iba rápido.' },
      question: { ru: 'Выбери естественный вариант:', uk: 'Обери природний варіант:', es: 'Elige la opción natural:' },
      sentence: 'The train was moving ___.',
      options: ['fast', 'fastly', 'quick', 'fastest'],
      correctIndex: 0,
      correctReason: { ru: 'Правильно. Fast уже может быть наречием. Не нужно fastly.', uk: 'Правильно. Fast вже може бути прислівником. Не потрібно fastly.', es: 'Correcto. Fast ya puede ser adverbio. No necesitas fastly.' },
      wrongReason: { ru: 'Fastly звучит неестественно и обычно воспринимается как ошибка. Говорим fast или quickly.', uk: 'Fastly звучить неприродно і зазвичай сприймається як помилка. Кажемо fast або quickly.', es: 'Fastly suena poco natural y normalmente se percibe como error. Decimos fast o quickly.' },
      coachTip: { ru: 'Fast работает и как adjective, и как adverb: a fast car, drive fast.', uk: 'Fast працює і як adjective, і як adverb: a fast car, drive fast.', es: 'Fast funciona como adjective y adverb: a fast car, drive fast.' },
    },
    {
      situation: { ru: 'Ты говоришь, что она всегда опаздывает. В предложении есть be.', uk: 'Ти говориш, що вона завжди запізнюється. У реченні є be.', es: 'Dices que ella siempre llega tarde. La frase tiene be.' },
      question: { ru: 'Где должно стоять always?', uk: 'Де має стояти always?', es: '¿Dónde debe ir always?' },
      sentence: 'She ___ late.',
      options: ['is always', 'always is', 'is always being', 'always'],
      correctIndex: 0,
      correctReason: { ru: 'Верно. С be наречие частоты обычно стоит после be: She is always late.', uk: 'Вірно. З be прислівник частоти зазвичай стоїть після be: She is always late.', es: 'Correcto. Con be, los adverbios de frecuencia suelen ir después de be: She is always late.' },
      wrongReason: { ru: 'С обычным глаголом: She always comes late. Но с be: She is always late. Be меняет место наречия.', uk: 'Зі звичайним дієсловом: She always comes late. Але з be: She is always late. Be змінює місце прислівника.', es: 'Con verbo normal: She always comes late. Pero con be: She is always late. Be cambia la posición del adverbio.' },
      coachTip: { ru: 'Frequency adverb перед обычным глаголом, но после be.', uk: 'Frequency adverb перед звичайним дієсловом, але після be.', es: 'Frequency adverb antes del verbo normal, pero después de be.' },
    },
    {
      situation: { ru: 'Ты говоришь о привычке с обычным глаголом.', uk: 'Ти говориш про звичку зі звичайним дієсловом.', es: 'Hablas de un hábito con un verbo normal.' },
      question: { ru: 'Выбери правильный порядок:', uk: 'Обери правильний порядок:', es: 'Elige el orden correcto:' },
      sentence: 'She ___ coffee in the morning.',
      options: ['usually drinks', 'drinks usually', 'is usually drinks', 'usually is drinks'],
      correctIndex: 0,
      correctReason: { ru: 'Да. С обычным глаголом наречие частоты обычно стоит перед ним: usually drinks.', uk: 'Так. Зі звичайним дієсловом прислівник частоти зазвичай стоїть перед ним: usually drinks.', es: 'Sí. Con un verbo normal, el adverbio de frecuencia suele ir antes: usually drinks.' },
      wrongReason: { ru: 'Drink - обычный глагол. Поэтому usually ставим перед ним: She usually drinks coffee.', uk: 'Drink - звичайне дієслово. Тому usually ставимо перед ним: She usually drinks coffee.', es: 'Drink es verbo normal. Por eso usually va antes: She usually drinks coffee.' },
      coachTip: { ru: 'Always/often/usually/never + обычный глагол: always works, often calls, never eats.', uk: 'Always/often/usually/never + звичайне дієслово: always works, often calls, never eats.', es: 'Always/often/usually/never + verbo normal: always works, often calls, never eats.' },
    },
    {
      situation: { ru: 'Ты спрашиваешь, поел ли человек уже.', uk: 'Ти питаєш, чи людина вже поїла.', es: 'Preguntas si una persona ya comió.' },
      question: { ru: 'Yet или already?', uk: 'Yet чи already?', es: '¿Yet o already?' },
      sentence: 'Have you eaten ___?',
      options: ['yet', 'already', 'still', 'lately'],
      correctIndex: 0,
      correctReason: { ru: 'Правильно. В вопросах о том, случилось ли уже действие, часто используем yet: Have you eaten yet?', uk: 'Правильно. У питаннях про те, чи вже сталася дія, часто використовуємо yet: Have you eaten yet?', es: 'Correcto. En preguntas sobre si algo ya ocurrió, solemos usar yet: Have you eaten yet?' },
      wrongReason: { ru: "Already чаще в утверждениях: I've already eaten. Yet часто в вопросах и отрицаниях: Have you eaten yet? I haven't eaten yet.", uk: "Already частіше у твердженнях: I've already eaten. Yet часто в питаннях і запереченнях: Have you eaten yet? I haven't eaten yet.", es: "Already suele ir en afirmaciones: I've already eaten. Yet va mucho en preguntas y negativas: Have you eaten yet? I haven't eaten yet." },
      coachTip: { ru: 'Question/negative - часто yet. Statement - часто already.', uk: 'Question/negative - часто yet. Statement - часто already.', es: 'Pregunta/negación - often yet. Afirmación - often already.' },
    },
    {
      situation: { ru: 'Ты говоришь, что ещё не поел.', uk: 'Ти говориш, що ще не поїв.', es: 'Dices que todavía no has comido.' },
      question: { ru: 'Что нужно поставить?', uk: 'Що треба поставити?', es: '¿Qué hay que poner?' },
      sentence: "I haven't eaten ___.",
      options: ['yet', 'already', 'still', 'lately'],
      correctIndex: 0,
      correctReason: { ru: "Верно. В отрицании yet значит «ещё не»: I haven't eaten yet.", uk: "Вірно. У запереченні yet означає «ще не»: I haven't eaten yet.", es: 'Correcto. En negación, yet significa "todavía no": I haven\'t eaten yet.' },
      wrongReason: { ru: "Already значит «уже», но здесь отрицание «ещё не». Поэтому нужен yet.", uk: "Already означає «вже», але тут заперечення «ще не». Тому потрібен yet.", es: 'Already significa "ya", pero aquí la idea negativa es "todavía no". Por eso necesitas yet.' },
      coachTip: { ru: 'Not yet = ещё нет. Already = уже.', uk: 'Not yet = ще ні. Already = вже.', es: 'Not yet = todavía no. Already = ya.' },
    },
    {
      situation: { ru: 'Ты говоришь, что она всё ещё спит.', uk: 'Ти говориш, що вона все ще спить.', es: 'Dices que ella todavía está durmiendo.' },
      question: { ru: 'Выбери правильное наречие:', uk: 'Обери правильний прислівник:', es: 'Elige el adverbio correcto:' },
      sentence: 'She is ___ sleeping.',
      options: ['still', 'yet', 'already', 'lately'],
      correctIndex: 0,
      correctReason: { ru: 'Да. Still показывает, что ситуация продолжается: She is still sleeping.', uk: 'Так. Still показує, що ситуація триває: She is still sleeping.', es: 'Sí. Still muestra que la situación continúa: She is still sleeping.' },
      wrongReason: { ru: 'Yet здесь не подходит. Still значит "всё ещё" и показывает продолжение действия или состояния.', uk: 'Yet тут не підходить. Still означає "все ще" і показує продовження дії або стану.', es: 'Yet no encaja aquí. Still significa "todavía" y muestra continuación de una acción o estado.' },
      coachTip: { ru: 'Still = всё ещё продолжается.', uk: 'Still = все ще триває.', es: 'Still = todavía continúa.' },
    },
  ],
  consolidationTitle: { ru: 'Перейти к тренировке', uk: 'Перейти до тренування', es: 'Ir al entrenamiento' },
  consolidationText: {
    ru: 'Тренируй наречия на своих фразах — особенно пары-ловушки.',
    uk: 'Тренуй прислівники на своїх фразах — особливо пари-пастки.',
    es: 'Entrena los adverbios con tus frases — especialmente los pares trampa.',
  },
};

const PRONOUN_LESSON: ProblemCoachLesson = {
  category: 'pronoun',
  heroLabel: { ru: 'PERSONAL DIAGNOSIS', uk: 'PERSONAL DIAGNOSIS', es: 'PERSONAL DIAGNOSIS' },
  heroTitle: {
    ru: 'Местоимения: падеж и притяжательность',
    uk: 'Займенники: відмінок і присвійність',
    es: 'Pronombres: caso y posesión',
  },
  heroSubtitle: {
    ru: 'I/me, he/him, she/her — это не одно и то же. В русском языке падеж виден в окончании слова, в английском — местоимение полностью меняется.',
    uk: 'I/me, he/him, she/her — це не одне й те саме. В українській мові відмінок видно в закінченні слова, в англійській — займенник повністю змінюється.',
    es: 'I/me, he/him, she/her — no son lo mismo. En español el caso se ve en la función, en inglés el pronombre cambia completamente.',
  },
  diagnosisTitle: { ru: 'Что показал анализ', uk: 'Що показав аналіз', es: 'Qué mostró el análisis' },
  diagnosisText: {
    ru: 'Типичные ошибки: "between you and I" (нужно me), "her and me went" (нужно she and I), или путаница с притяжательными: "it\'s" (сокращение it is) vs "its" (притяжательное).',
    uk: 'Типові помилки: "between you and I" (потрібно me), "her and me went" (потрібно she and I), або плутанина з присвійними: "it\'s" (скорочення it is) vs "its" (присвійне).',
    es: 'Errores típicos: "between you and I" (debe ser me), "her and me went" (debe ser she and I), o confusión entre "it\'s" (contracción de it is) e "its" (posesivo).',
  },
  blocks: [
    {
      type: 'main_rule',
      accent: 'green',
      icon: 'checkmark-circle-outline',
      title: { ru: 'Субъект vs объект', uk: 'Суб\'єкт vs об\'єкт', es: 'Sujeto vs objeto' },
      body: {
        ru: 'Субъект (кто делает): I, he, she, we, they. Объект (на кого направлено): me, him, her, us, them. Подсказка: если можно заменить на "he/she" — субъект. Если на "him/her" — объект.',
        uk: 'Суб\'єкт (хто робить): I, he, she, we, they. Об\'єкт (на кого спрямовано): me, him, her, us, them. Підказка: якщо можна замінити на "he/she" — суб\'єкт. Якщо на "him/her" — об\'єкт.',
        es: 'Sujeto (quién actúa): I, he, she, we, they. Objeto (sobre quién recae): me, him, her, us, them. Pista: si puedes sustituir por "he/she" — sujeto. Si por "him/her" — objeto.',
      },
    },
  ],
  exerciseIntroTitle: { ru: 'Закрепить на фразах', uk: 'Закріпити на фразах', es: 'Consolidar con frases' },
  exerciseIntroText: {
    ru: 'Повтори фразы с местоимениями, где ты ошибался.',
    uk: 'Повтори фрази із займенниками, де ти помилявся.',
    es: 'Repasa las frases con pronombres donde fallaste.',
  },
  exercises: [
    {
      situation: { ru: 'Ты говоришь "между тобой и мной". После between нужен объект.', uk: "Ти кажеш \"між тобою і мною\". Після between потрібен об'єкт.", es: 'Dices "entre tú y yo". Después de between necesitas objeto.' },
      question: { ru: 'Выбери правильное местоимение:', uk: 'Обери правильний займенник:', es: 'Elige el pronombre correcto:' },
      sentence: 'Between you and ___, this is a secret.',
      options: ['me', 'I', 'myself', 'mine'],
      correctIndex: 0,
      correctReason: { ru: 'Верно. Between - предлог, а после предлога нужна object form: me.', uk: "Вірно. Between - прийменник, а після прийменника потрібна object form: me.", es: 'Correcto. Between es preposición, y después de una preposición necesitas object form: me.' },
      wrongReason: { ru: 'I используется, когда человек делает действие: I know. После between нужен объект: between you and me.', uk: "I використовується, коли людина виконує дію: I know. Після between потрібен об'єкт: between you and me.", es: 'I se usa cuando la persona hace la acción: I know. Después de between necesitas objeto: between you and me.' },
      coachTip: { ru: 'После предлогов: with me, for him, to her, between you and me.', uk: 'Після прийменників: with me, for him, to her, between you and me.', es: 'Después de preposiciones: with me, for him, to her, between you and me.' },
    },
    {
      situation: { ru: 'Она сказала ему правду. Он получает действие.', uk: 'Вона сказала йому правду. Він отримує дію.', es: 'Ella le dijo la verdad. Él recibe la acción.' },
      question: { ru: 'Что правильно?', uk: 'Що правильно?', es: '¿Qué es correcto?' },
      sentence: 'She told ___ the truth.',
      options: ['him', 'he', 'his', 'himself'],
      correctIndex: 0,
      correctReason: { ru: 'Да. После told нужен объект: she told him. Он не делает действие, он получает информацию.', uk: "Так. Після told потрібен об'єкт: she told him. Він не виконує дію, він отримує інформацію.", es: 'Sí. Después de told necesitas objeto: she told him. Él no hace la acción, recibe la información.' },
      wrongReason: { ru: 'He был бы подлежащим: He told me. Но здесь действие делает she, а him получает действие.', uk: 'He був би підметом: He told me. Але тут дію робить she, а him отримує дію.', es: 'He sería sujeto: He told me. Pero aquí she hace la acción, y him la recibe.' },
      coachTip: { ru: 'После глагола, если местоимение получает действие: me/him/her/us/them.', uk: 'Після дієслова, якщо займенник отримує дію: me/him/her/us/them.', es: 'Después del verbo, si el pronombre recibe la acción: me/him/her/us/them.' },
    },
    {
      situation: { ru: 'Ты говоришь, что книга принадлежит тебе, и после местоимения стоит noun.', uk: 'Ти кажеш, що книга належить тобі, і після займенника стоїть noun.', es: 'Dices que el libro te pertenece, y después del pronombre viene un noun.' },
      question: { ru: 'My или mine?', uk: 'My чи mine?', es: '¿My o mine?' },
      sentence: 'This is ___ book.',
      options: ['my', 'mine', 'me', 'I'],
      correctIndex: 0,
      correctReason: { ru: 'Правильно. Перед noun используем my: my book. Mine используется без noun: This book is mine.', uk: 'Правильно. Перед noun використовуємо my: my book. Mine використовується без noun: This book is mine.', es: 'Correcto. Antes de un noun usamos my: my book. Mine se usa sin noun: This book is mine.' },
      wrongReason: { ru: 'Mine уже заменяет "my book". Поэтому нельзя mine book. Если noun остаётся, нужен my.', uk: 'Mine вже замінює "my book". Тому не можна mine book. Якщо noun залишається, потрібен my.', es: 'Mine ya reemplaza "my book". Por eso no puedes decir mine book. Si el noun sigue ahí, necesitas my.' },
      coachTip: { ru: 'My + noun. Mine без noun.', uk: 'My + noun. Mine без noun.', es: 'My + noun. Mine sin noun.' },
    },
    {
      situation: { ru: 'Книга уже названа. Теперь ты говоришь "она моя" без повторения book.', uk: 'Книгу вже названо. Тепер ти кажеш "вона моя" без повторення book.', es: 'El libro ya fue mencionado. Ahora dices "es mío" sin repetir book.' },
      question: { ru: 'Выбери правильную форму:', uk: 'Обери правильну форму:', es: 'Elige la forma correcta:' },
      sentence: 'This book is ___.',
      options: ['mine', 'my', 'me', 'myself'],
      correctIndex: 0,
      correctReason: { ru: 'Да. После mine noun уже не нужен. This book is mine = эта книга моя.', uk: 'Так. Після mine noun вже не потрібен. This book is mine = ця книга моя.', es: 'Sí. Después de mine no necesitas noun. This book is mine = este libro es mío.' },
      wrongReason: { ru: 'My требует noun после себя: my book. Если noun уже назван и не повторяется, нужна форма mine.', uk: 'My вимагає noun після себе: my book. Якщо noun вже названий і не повторюється, потрібна форма mine.', es: 'My necesita un noun después: my book. Si el noun ya está mencionado y no se repite, necesitas mine.' },
      coachTip: { ru: 'This is my book. This book is mine.', uk: 'This is my book. This book is mine.', es: 'This is my book. This book is mine.' },
    },
    {
      situation: { ru: 'Кошка лизнула свою лапу. Нужно притяжательное its.', uk: 'Кішка лизнула свою лапу. Потрібне присвійне its.', es: 'El gato se lamió la pata. Necesitas posesivo its.' },
      question: { ru: "Its или it's?", uk: "Its чи it's?", es: "¿Its o it's?" },
      sentence: 'The cat licked ___ paw.',
      options: ['its', "it's", 'it', 'itself'],
      correctIndex: 0,
      correctReason: { ru: 'Верно. Its без апострофа значит "его/её" для животного или предмета. The cat licked its paw.', uk: 'Вірно. Its без апострофа означає "його/її" для тварини або предмета. The cat licked its paw.', es: 'Correcto. Its sin apóstrofo significa "su" para animal o cosa. The cat licked its paw.' },
      wrongReason: { ru: "It's с апострофом = it is или it has. Здесь не «it is paw», а «его/её лапа». Поэтому its.", uk: "It's з апострофом = it is або it has. Тут не «it is paw», а «його/її лапа». Тому its.", es: "It's con apóstrofo = it is o it has. Aquí no es \"it is paw\", sino \"su pata\". Por eso its." },
      coachTip: { ru: "It's = it is. Its = его/её.", uk: "It's = it is. Its = його/її.", es: "It's = it is. Its = su." },
    },
    {
      situation: { ru: 'Ты хочешь сказать "сделал это сам, без помощи".', uk: 'Ти хочеш сказати "зробив це сам, без допомоги".', es: 'Quieres decir "lo hice solo, sin ayuda".' },
      question: { ru: 'Какая форма нужна?', uk: 'Яка форма потрібна?', es: '¿Qué forma se necesita?' },
      sentence: 'I did it by ___.',
      options: ['myself', 'me', 'mine', 'I'],
      correctIndex: 0,
      correctReason: { ru: 'Правильно. By myself значит "сам / самостоятельно". Это не просто объект me.', uk: "Правильно. By myself означає \"сам / самостійно\". Це не просто об'єкт me.", es: 'Correcto. By myself significa "solo / sin ayuda". No es simplemente el objeto me.' },
      wrongReason: { ru: 'Для смысла "самостоятельно" нужна reflexive form: by myself, by yourself, by himself.', uk: 'Для сенсу "самостійно" потрібна reflexive form: by myself, by yourself, by himself.', es: 'Para el sentido "solo / sin ayuda" necesitas reflexive form: by myself, by yourself, by himself.' },
      coachTip: { ru: 'By myself = alone / without help.', uk: 'By myself = alone / without help.', es: 'By myself = alone / without help.' },
    },
    {
      situation: { ru: 'Ты говоришь, что они сами приготовили ужин.', uk: 'Ти говориш, що вони самі приготували вечерю.', es: 'Dices que ellos mismos prepararon la cena.' },
      question: { ru: 'Выбери reflexive pronoun:', uk: 'Обери reflexive pronoun:', es: 'Elige el pronombre reflexivo:' },
      sentence: 'They cooked dinner by ___.',
      options: ['themselves', 'them', 'their', 'theirs'],
      correctIndex: 0,
      correctReason: { ru: 'Да. By themselves значит "сами / без помощи".', uk: 'Так. By themselves означає "самі / без допомоги".', es: 'Sí. By themselves significa "ellos solos / sin ayuda".' },
      wrongReason: { ru: 'Them - просто объект. Для "сами" нужна reflexive form: themselves.', uk: "Them - просто об'єкт. Для \"самі\" потрібна reflexive form: themselves.", es: 'Them es solo objeto. Para "ellos mismos / solos" necesitas reflexive form: themselves.' },
      coachTip: { ru: 'By + reflexive = самостоятельно: by myself, by herself, by themselves.', uk: 'By + reflexive = самостійно: by myself, by herself, by themselves.', es: 'By + reflexive = sin ayuda: by myself, by herself, by themselves.' },
    },
    {
      situation: { ru: 'Ты говоришь о нескольких близких предметах.', uk: 'Ти говориш про кілька близьких предметів.', es: 'Hablas de varios objetos cercanos.' },
      question: { ru: 'This, that, these или those?', uk: 'This, that, these чи those?', es: '¿This, that, these o those?' },
      sentence: '___ shoes are too small.',
      options: ['These', 'This', 'That', 'Those'],
      correctIndex: 0,
      correctReason: { ru: 'Верно. Shoes - plural, и если они рядом, используем these.', uk: 'Вірно. Shoes - plural, і якщо вони поруч, використовуємо these.', es: 'Correcto. Shoes es plural, y si están cerca usamos these.' },
      wrongReason: { ru: 'This и that - singular. Shoes - plural. Если предметы рядом, нужно these. Если далеко - those.', uk: 'This і that - singular. Shoes - plural. Якщо предмети поруч, потрібно these. Якщо далеко - those.', es: 'This y that son singular. Shoes es plural. Si están cerca, necesitas these. Si están lejos, those.' },
      coachTip: { ru: 'This - один близко. These - много близко. That - один далеко. Those - много далеко.', uk: 'This - один близько. These - багато близько. That - один далеко. Those - багато далеко.', es: 'This - uno cerca. These - varios cerca. That - uno lejos. Those - varios lejos.' },
    },
  ],
  consolidationTitle: { ru: 'Перейти к тренировке', uk: 'Перейти до тренування', es: 'Ir al entrenamiento' },
  consolidationText: {
    ru: 'Тренируй местоимения на своих фразах.',
    uk: 'Тренуй займенники на своїх фразах.',
    es: 'Entrena los pronombres con tus frases.',
  },
};

const CONJUNCTION_LESSON: ProblemCoachLesson = {
  category: 'conjunction',
  heroLabel: { ru: 'PERSONAL DIAGNOSIS', uk: 'PERSONAL DIAGNOSIS', es: 'PERSONAL DIAGNOSIS' },
  heroTitle: {
    ru: 'Союзы соединяют, но по-разному',
    uk: 'Сполучники з\'єднують, але по-різному',
    es: 'Las conjunciones conectan, pero de formas distintas',
  },
  heroSubtitle: {
    ru: 'Although, however, despite — все "хотя/несмотря на", но ставятся по-разному. Ошибки здесь почти всегда связаны с буквальным переводом.',
    uk: 'Although, however, despite — всі "хоча/незважаючи на", але ставляться по-різному. Помилки тут майже завжди пов\'язані з буквальним перекладом.',
    es: 'Although, however, despite — todos pueden traducirse como "aunque/sin embargo", pero se usan de formas distintas. Los errores aquí casi siempre vienen de la traducción literal.',
  },
  diagnosisTitle: { ru: 'Что показал анализ', uk: 'Що показав аналіз', es: 'Qué mostró el análisis' },
  diagnosisText: {
    ru: 'Типичные ошибки: "despite he was tired" (нужно "despite being tired" или "although he was tired"), "however I went" в начале предложения без запятой, или путаница between/among.',
    uk: 'Типові помилки: "despite he was tired" (потрібно "despite being tired" або "although he was tired"), "however I went" на початку речення без коми, або плутанина between/among.',
    es: 'Errores típicos: "despite he was tired" (debe ser "despite being tired" o "although he was tired"), "however I went" al inicio sin coma, o confusión entre between/among.',
  },
  blocks: [
    {
      type: 'mental_model',
      accent: 'gold',
      icon: 'bulb-outline',
      title: { ru: 'Although vs However vs Despite', uk: 'Although vs However vs Despite', es: 'Although vs However vs Despite' },
      body: {
        ru: 'Although + предложение: Although it was cold, we went out. However — вводное слово с запятой: It was cold. However, we went out. Despite + существительное/герундий: Despite the cold, we went out.',
        uk: 'Although + речення: Although it was cold, we went out. However — вставне слово з комою: It was cold. However, we went out. Despite + іменник/герундій: Despite the cold, we went out.',
        es: 'Although + oración: Although it was cold, we went out. However — palabra introductoria con coma: It was cold. However, we went out. Despite + sustantivo/gerundio: Despite the cold, we went out.',
      },
    },
  ],
  exerciseIntroTitle: { ru: 'Закрепить на фразах', uk: 'Закріпити на фразах', es: 'Consolidar con frases' },
  exerciseIntroText: {
    ru: 'Повтори фразы с союзами, где ты ошибался.',
    uk: 'Повтори фрази зі сполучниками, де ти помилявся.',
    es: 'Repasa las frases con conjunciones donde fallaste.',
  },
  exercises: [
    {
      situation: { ru: 'Ты хочешь показать результат: устал, поэтому лёг рано.', uk: 'Ти хочеш показати результат: втомився, тому ліг рано.', es: 'Quieres mostrar resultado: estaba cansado, por eso se fue a dormir temprano.' },
      question: { ru: 'Выбери правильный союз:', uk: 'Обери правильний сполучник:', es: 'Elige la conjunción correcta:' },
      sentence: 'I was tired, ___ I went to bed early.',
      options: ['so', 'but', 'although', 'unless'],
      correctIndex: 0,
      correctReason: { ru: 'Верно. Здесь причина → результат. I was tired, so I went to bed early.', uk: 'Вірно. Тут причина → результат. I was tired, so I went to bed early.', es: 'Correcto. Aquí hay causa → resultado. I was tired, so I went to bed early.' },
      wrongReason: { ru: 'Здесь нет контраста и нет условия. Первая часть объясняет результат во второй. Поэтому нужен so.', uk: 'Тут немає контрасту і немає умови. Перша частина пояснює результат у другій. Тому потрібен so.', es: 'Aquí no hay contraste ni condición. La primera parte explica el resultado de la segunda. Por eso necesitas so.' },
      coachTip: { ru: 'So = результат. Because = причина.', uk: 'So = результат. Because = причина.', es: 'So = resultado. Because = causa.' },
    },
    {
      situation: { ru: 'Ты хочешь сказать "хотя было холодно, мы плавали".', uk: 'Ти хочеш сказати "хоча було холодно, ми плавали".', es: 'Quieres decir "aunque hacía frío, nadamos".' },
      question: { ru: 'Выбери правильную версию:', uk: 'Обери правильну версію:', es: 'Elige la versión correcta:' },
      sentence: 'Choose the correct version:',
      options: ['Although it was cold, we swam.', 'Although it was cold, but we swam.', 'Although it was cold but we swam.', 'It was cold although but we swam.'],
      correctIndex: 0,
      correctReason: { ru: 'Правильно. Although уже создаёт контраст. But больше не нужен.', uk: 'Правильно. Although вже створює контраст. But більше не потрібен.', es: 'Correcto. Although ya crea el contraste. But ya no hace falta.' },
      wrongReason: { ru: 'Although + but - классическая ошибка. Выбери один путь: Although it was cold, we swam. Или: It was cold, but we swam.', uk: 'Although + but - класична помилка. Обери один шлях: Although it was cold, we swam. Або: It was cold, but we swam.', es: 'Although + but es un error clásico. Elige una ruta: Although it was cold, we swam. O: It was cold, but we swam.' },
      coachTip: { ru: 'Хотя..., но... по-русски нормально. Although..., but... по-английски перегруз.', uk: 'Хоча..., але... українською нормально. Although..., but... англійською перевантаження.', es: '"Aunque..., pero..." puede sonar normal en tu idioma. Although..., but... en inglés es sobrecarga.' },
    },
    {
      situation: { ru: 'Ты хочешь дать причину: ушёл домой, потому что устал.', uk: 'Ти хочеш дати причину: пішов додому, тому що втомився.', es: 'Quieres dar la causa: se fue a casa porque estaba cansado.' },
      question: { ru: 'Что звучит правильно?', uk: 'Що звучить правильно?', es: '¿Qué suena correcto?' },
      sentence: 'I went home ___ I was tired.',
      options: ['because', 'so', 'although', 'unless'],
      correctIndex: 0,
      correctReason: { ru: 'Да. Because вводит причину: I went home because I was tired.', uk: 'Так. Because вводить причину: I went home because I was tired.', es: 'Sí. Because introduce la causa: I went home because I was tired.' },
      wrongReason: { ru: 'После went home ты объясняешь причину. Для причины нужен because. So показывает результат, а не причину.', uk: 'Після went home ти пояснюєш причину. Для причини потрібен because. So показує результат, а не причину.', es: 'Después de went home explicas la causa. Para causa necesitas because. So muestra resultado, no causa.' },
      coachTip: { ru: 'Because отвечает на "почему?". So отвечает на "и что в итоге?".', uk: 'Because відповідає на "чому?". So відповідає на "і що в результаті?".', es: 'Because responde "¿por qué?". So responde "¿y qué pasó como resultado?".' },
    },
    {
      situation: { ru: 'Ты хочешь сказать "если не поспешишь, опоздаешь".', uk: 'Ти хочеш сказати "якщо не поспішиш, запізнишся".', es: 'Quieres decir "si no te apuras, llegarás tarde".' },
      question: { ru: 'Выбери естественный вариант:', uk: 'Обери природний варіант:', es: 'Elige la opción natural:' },
      sentence: "___ you hurry, you'll be late.",
      options: ['Unless', 'If not', 'Although', 'Because'],
      correctIndex: 0,
      correctReason: { ru: 'Верно. Unless = if not. Unless you hurry = если ты не поспешишь.', uk: 'Вірно. Unless = if not. Unless you hurry = якщо ти не поспішиш.', es: 'Correcto. Unless = if not. Unless you hurry = si no te apuras.' },
      wrongReason: { ru: 'Тут нужна отрицательная условность: если не поспешишь. Одним словом это unless.', uk: 'Тут потрібна негативна умова: якщо не поспішиш. Одним словом це unless.', es: 'Aquí necesitas condición negativa: si no te apuras. En una palabra: unless.' },
      coachTip: { ru: "Unless уже содержит not. Поэтому не говори unless you don't hurry, если не хочешь двойное отрицание.", uk: "Unless вже містить not. Тому не кажи unless you don't hurry, якщо не хочеш подвійне заперечення.", es: "Unless ya contiene not. No digas unless you don't hurry si no quieres doble negación." },
    },
    {
      situation: { ru: 'Ты говоришь о будущем после when.', uk: 'Ти говориш про майбутнє після when.', es: 'Hablas del futuro después de when.' },
      question: { ru: 'Выбери правильную форму:', uk: 'Обери правильну форму:', es: 'Elige la forma correcta:' },
      sentence: "When I ___ home, I'll call you.",
      options: ['get', 'will get', 'got', 'getting'],
      correctIndex: 0,
      correctReason: { ru: 'Правильно. После when в будущем значении обычно используем Present Simple: When I get home, I\'ll call you.', uk: "Правильно. Після when у майбутньому значенні зазвичай використовуємо Present Simple: When I get home, I'll call you.", es: "Correcto. Después de when con sentido futuro normalmente usamos Present Simple: When I get home, I'll call you." },
      wrongReason: { ru: "В главной части будет will: I'll call you. После when не нужно will get. Английский не ставит два future-маркера в такой связке.", uk: "У головній частині буде will: I'll call you. Після when не потрібно will get. Англійська не ставить два future-маркери в такій зв'язці.", es: "La parte principal lleva will: I'll call you. Después de when no necesitas will get. El inglés no pone dos marcas de futuro en esta conexión." },
      coachTip: { ru: 'After when/if/as soon as для будущего часто Present Simple: when I arrive, if it rains.', uk: 'After when/if/as soon as для майбутнього часто Present Simple: when I arrive, if it rains.', es: 'After when/if/as soon as para futuro suele ir Present Simple: when I arrive, if it rains.' },
    },
    {
      situation: { ru: 'Ты хочешь показать цель: говорил медленно, чтобы они поняли.', uk: 'Ти хочеш показати ціль: говорив повільно, щоб вони зрозуміли.', es: 'Quieres mostrar propósito: habló despacio para que entendieran.' },
      question: { ru: 'Выбери лучший союз:', uk: 'Обери найкращий сполучник:', es: 'Elige la mejor conjunción:' },
      sentence: 'I spoke slowly ___ they could understand me.',
      options: ['so that', 'because', 'although', 'unless'],
      correctIndex: 0,
      correctReason: { ru: 'Да. So that показывает цель: я говорил медленно с какой целью? Чтобы они поняли.', uk: 'Так. So that показує ціль: я говорив повільно з якою метою? Щоб вони зрозуміли.', es: 'Sí. So that muestra propósito: ¿para qué hablé despacio? Para que me entendieran.' },
      wrongReason: { ru: 'Здесь не причина и не контраст. Это цель действия. Для цели хорошо подходит so that.', uk: 'Тут не причина і не контраст. Це ціль дії. Для цілі добре підходить so that.', es: 'Aquí no hay causa ni contraste. Es el propósito de la acción. Para propósito encaja so that.' },
      coachTip: { ru: 'So = результат. So that = цель.', uk: 'So = результат. So that = ціль.', es: 'So = resultado. So that = propósito.' },
    },
    {
      situation: { ru: 'Ты говоришь, что оба варианта подходят.', uk: 'Ти говориш, що обидва варіанти підходять.', es: 'Dices que ambas opciones sirven.' },
      question: { ru: 'Выбери правильную парную конструкцию:', uk: 'Обери правильну парну конструкцію:', es: 'Elige la construcción correlativa correcta:' },
      sentence: '___ tea ___ coffee are fine.',
      options: ['Both / and', 'Either / and', 'Neither / or', 'Not only / and'],
      correctIndex: 0,
      correctReason: { ru: 'Верно. Both...and значит "и то, и другое": Both tea and coffee are fine.', uk: 'Вірно. Both...and означає "і те, і те": Both tea and coffee are fine.', es: 'Correcto. Both...and significa "ambos": Both tea and coffee are fine.' },
      wrongReason: { ru: 'Если подходят оба варианта, нужна пара both...and. Either...or значит один из двух. Neither...nor значит ни один.', uk: 'Якщо підходять обидва варіанти, потрібна пара both...and. Either...or означає один із двох. Neither...nor означає жоден.', es: 'Si ambas opciones sirven, necesitas both...and. Either...or significa uno de dos. Neither...nor significa ninguno.' },
      coachTip: { ru: 'Both...and = оба. Either...or = один из двух. Neither...nor = ни один.', uk: 'Both...and = обидва. Either...or = один із двох. Neither...nor = жоден.', es: 'Both...and = ambos. Either...or = uno de dos. Neither...nor = ninguno.' },
    },
    {
      situation: { ru: 'Ты говоришь, что ни он, ни она не были там.', uk: 'Ти говориш, що ні він, ні вона не були там.', es: 'Dices que ni él ni ella estaban allí.' },
      question: { ru: 'Выбери правильную пару:', uk: 'Обери правильну пару:', es: 'Elige la pareja correcta:' },
      sentence: '___ he ___ she was there.',
      options: ['Neither / nor', 'Either / or', 'Both / and', 'Although / but'],
      correctIndex: 0,
      correctReason: { ru: 'Правильно. Neither...nor значит "ни...ни". Ближайшее подлежащее she, поэтому was.', uk: 'Правильно. Neither...nor означає "ні...ні". Найближчий підмет she, тому was.', es: 'Correcto. Neither...nor significa "ni...ni". El sujeto más cercano es she, por eso was.' },
      wrongReason: { ru: 'Для "ни он, ни она" нужна пара neither...nor. Either...or - это выбор одного из двух.', uk: 'Для "ні він, ні вона" потрібна пара neither...nor. Either...or - це вибір одного з двох.', es: 'Para "ni él ni ella" necesitas neither...nor. Either...or es elección entre dos.' },
      coachTip: { ru: 'Neither...nor = двойное отрицание внутри одной парной конструкции. Не добавляй ещё not.', uk: 'Neither...nor = подвійне заперечення всередині однієї парної конструкції. Не додавай ще not.', es: 'Neither...nor ya contiene negación doble dentro de la pareja. No añadas otro not.' },
    },
  ],
  consolidationTitle: { ru: 'Перейти к тренировке', uk: 'Перейти до тренування', es: 'Ir al entrenamiento' },
  consolidationText: {
    ru: 'Тренируй союзы на своих фразах.',
    uk: 'Тренуй сполучники на своїх фразах.',
    es: 'Entrena las conjunciones con tus frases.',
  },
};

const OTHER_LESSON: ProblemCoachLesson = {
  category: 'other',
  heroLabel: { ru: 'SENTENCE LOGIC', uk: 'SENTENCE LOGIC', es: 'SENTENCE LOGIC' },
  heroTitle: {
    ru: 'Разные ошибки — одна причина',
    uk: 'Різні помилки — одна причина',
    es: 'Errores distintos — una sola causa',
  },
  heroSubtitle: {
    ru: 'Ошибки из разных категорий обычно означают одно: автоматический перевод с родного языка. Структура English и русского принципиально разная.',
    uk: 'Помилки з різних категорій зазвичай означають одне: автоматичний переклад з рідної мови. Структура англійської та рідної мови принципово різна.',
    es: 'Los errores de distintas categorías suelen significar lo mismo: traducción automática de la lengua materna. La estructura del inglés y el español es fundamentalmente diferente.',
  },
  diagnosisTitle: { ru: 'Что показал анализ', uk: 'Що показав аналіз', es: 'Qué mostró el análisis' },
  diagnosisText: {
    ru: 'Когда ошибки смешанные, самый эффективный способ — не учить правила, а повторять конкретные фразы, где ты ошибся. Мозг запоминает через контекст лучше, чем через список.',
    uk: 'Коли помилки змішані, найефективніший спосіб — не вчити правила, а повторювати конкретні фрази, де ти помилився. Мозок запам\'ятовує через контекст краще, ніж через список.',
    es: 'Cuando los errores son mixtos, el método más eficaz no es estudiar reglas, sino repasar frases concretas donde fallaste. El cerebro recuerda mejor por contexto que por lista.',
  },
  blocks: [
    {
      type: 'mental_model',
      accent: 'gold',
      icon: 'bulb-outline',
      title: { ru: 'Лучший следующий шаг', uk: 'Найкращий наступний крок', es: 'El mejor siguiente paso' },
      body: {
        ru: 'Не читай правила — тренируй фразы. Каждая фраза, которую ты повторяешь после ошибки, закрепляется в памяти сильнее, чем десять прочитанных правил.',
        uk: 'Не читай правила — тренуй фрази. Кожна фраза, яку ти повторюєш після помилки, закріплюється в пам\'яті сильніше, ніж десять прочитаних правил.',
        es: 'No leas reglas — entrena frases. Cada frase que repites después de un error se graba en la memoria con más fuerza que diez reglas leídas.',
      },
    },
  ],
  exerciseIntroTitle: { ru: 'Теперь проверим сборку предложения', uk: 'Тепер перевіримо збірку речення', es: 'Ahora comprobemos la construcción de la frase' },
  exerciseIntroText: {
    ru: 'Не смотри только на отдельное слово. Проверь скелет: утверждение, вопрос или отрицание?',
    uk: 'Не дивись лише на окреме слово. Перевір скелет: твердження, питання чи заперечення?',
    es: 'No mires solo una palabra. Revisa el esqueleto: ¿afirmación, pregunta o negación?',
  },
  exercises: [
    {
      situation: { ru: 'Ты делаешь отрицание в Present Simple.', uk: 'Ти робиш заперечення в Present Simple.', es: 'Haces una negación en Present Simple.' },
      question: { ru: 'Выбери правильный вариант:', uk: 'Обери правильний варіант:', es: 'Elige la opción correcta:' },
      sentence: 'She ___ coffee.',
      options: ["doesn't like", 'not likes', "don't likes", 'likes not'],
      correctIndex: 0,
      correctReason: { ru: "В Present Simple отрицание строится через помощник: doesn't + базовый глагол. Поэтому She doesn't like coffee.", uk: "У Present Simple заперечення будується через помічник: doesn't + базове дієслово. Тому She doesn't like coffee.", es: "En Present Simple la negación se construye con auxiliar: doesn't + verbo base. Por eso She doesn't like coffee." },
      wrongReason: { ru: "Not нельзя просто приклеить к основному глаголу: She not likes - это не английская сборка. Нужен помощник doesn't.", uk: "Not не можна просто приклеїти до головного дієслова: She not likes - це не англійська збірка. Потрібен помічник doesn't.", es: "No puedes pegar not directamente al verbo principal: She not likes no es construcción inglesa. Necesitas el auxiliar doesn't." },
      coachTip: { ru: 'Отрицание: subject + auxiliary not + base verb.', uk: 'Заперечення: subject + auxiliary not + base verb.', es: 'Negación: subject + auxiliary not + base verb.' },
    },
    {
      situation: { ru: 'Ты задаёшь вопрос с why.', uk: 'Ти ставиш питання з why.', es: 'Haces una pregunta con why.' },
      question: { ru: 'Выбери правильный порядок слов:', uk: 'Обери правильний порядок слів:', es: 'Elige el orden correcto:' },
      sentence: '___ here?',
      options: ['Why are you', 'Why you are', 'Why do you are', 'Why you'],
      correctIndex: 0,
      correctReason: { ru: 'Правильно. В вопросе be выходит перед подлежащим: Why are you here?', uk: 'Правильно. У питанні be виходить перед підметом: Why are you here?', es: 'Correcto. En pregunta, be va antes del sujeto: Why are you here?' },
      wrongReason: { ru: 'Why you are here - это порядок утверждения после why. В английском вопросе нужен разворот: Why are you here?', uk: 'Why you are here - це порядок твердження після why. В англійському питанні потрібен розворот: Why are you here?', es: 'Why you are here mantiene orden afirmativo después de why. En pregunta inglesa necesitas inversión: Why are you here?' },
      coachTip: { ru: 'Question word + auxiliary/be + subject: Why are you, Where do you, What did he.', uk: 'Question word + auxiliary/be + subject: Why are you, Where do you, What did he.', es: 'Question word + auxiliary/be + subject: Why are you, Where do you, What did he.' },
    },
    {
      situation: { ru: 'Ты хочешь сказать, что ничего не знаешь.', uk: 'Ти хочеш сказати, що нічого не знаєш.', es: 'Quieres decir que no sabes nada.' },
      question: { ru: 'Выбери стандартную английскую форму:', uk: 'Обери стандартну англійську форму:', es: 'Elige la forma estándar en inglés:' },
      sentence: "I don't know ___.",
      options: ['anything', 'nothing', 'something', 'no thing'],
      correctIndex: 0,
      correctReason: { ru: "В стандартном английском don't уже даёт отрицание, поэтому дальше anything: I don't know anything.", uk: "У стандартній англійській don't вже дає заперечення, тому далі anything: I don't know anything.", es: "En inglés estándar don't ya da la negación, así que después va anything: I don't know anything." },
      wrongReason: { ru: "I don't know nothing - двойное отрицание. В разговорной речи где-то встретишь, но стандартная форма: I don't know anything.", uk: "I don't know nothing - подвійне заперечення. У розмовній мові десь зустрінеш, але стандартна форма: I don't know anything.", es: "I don't know nothing es doble negación. Puede aparecer en habla informal, pero la forma estándar es: I don't know anything." },
      coachTip: { ru: "После don't/doesn't/didn't часто anything, anyone, anywhere.", uk: "Після don't/doesn't/didn't часто anything, anyone, anywhere.", es: "Después de don't/doesn't/didn't suele ir anything, anyone, anywhere." },
    },
    {
      situation: { ru: 'Ты добавляешь короткий вопрос в конце фразы.', uk: 'Ти додаєш коротке питання в кінці фрази.', es: 'Añades una pregunta corta al final de la frase.' },
      question: { ru: 'Выбери правильный tag question:', uk: 'Обери правильний tag question:', es: 'Elige la coletilla correcta:' },
      sentence: 'You speak French, ___?',
      options: ["don't you", 'do you', "aren't you", "doesn't you"],
      correctIndex: 0,
      correctReason: { ru: 'Да. Основная фраза положительная, поэтому tag отрицательный. Speak требует do: don\'t you?', uk: "Так. Основна фраза позитивна, тому tag негативний. Speak вимагає do: don't you?", es: "Sí. La frase principal es positiva, por eso la coletilla es negativa. Speak usa do: don't you?" },
      wrongReason: { ru: "Если главная фраза положительная, tag обычно отрицательный: You speak French, don't you?", uk: "Якщо головна фраза позитивна, tag зазвичай негативний: You speak French, don't you?", es: "Si la frase principal es positiva, la coletilla suele ser negativa: You speak French, don't you?" },
      coachTip: { ru: 'Positive sentence → negative tag. Negative sentence → positive tag.', uk: 'Positive sentence → negative tag. Negative sentence → positive tag.', es: 'Positive sentence → negative tag. Negative sentence → positive tag.' },
    },
    {
      situation: { ru: 'Ты говоришь, что коробка слишком тяжёлая, и ты не можешь её поднять.', uk: 'Ти говориш, що коробка занадто важка, і ти не можеш її підняти.', es: 'Dices que la caja es demasiado pesada y no puedes levantarla.' },
      question: { ru: 'Выбери правильную структуру:', uk: 'Обери правильну структуру:', es: 'Elige la estructura correcta:' },
      sentence: 'The box is ___ heavy to lift.',
      options: ['too', 'enough', 'very', 'so'],
      correctIndex: 0,
      correctReason: { ru: 'Правильно. Too + adjective + to значит "слишком..., чтобы...": too heavy to lift.', uk: 'Правильно. Too + adjective + to означає "занадто..., щоб...": too heavy to lift.', es: 'Correcto. Too + adjective + to significa "demasiado... para...": too heavy to lift.' },
      wrongReason: { ru: 'Здесь смысл "слишком тяжёлая, чтобы поднять". Для этого нужна структура too heavy to lift.', uk: 'Тут сенс "занадто важка, щоб підняти". Для цього потрібна структура too heavy to lift.', es: 'Aquí el sentido es "demasiado pesada para levantar". Para eso necesitas too heavy to lift.' },
      coachTip: { ru: 'Too + adjective + to: too expensive to buy, too tired to work.', uk: 'Too + adjective + to: too expensive to buy, too tired to work.', es: 'Too + adjective + to: too expensive to buy, too tired to work.' },
    },
    {
      situation: { ru: 'Ты говоришь, что человек достаточно взрослый, чтобы водить.', uk: 'Ти говориш, що людина достатньо доросла, щоб водити.', es: 'Dices que una persona es lo bastante mayor para conducir.' },
      question: { ru: 'Где должно стоять enough?', uk: 'Де має стояти enough?', es: '¿Dónde debe ir enough?' },
      sentence: 'He is old ___ to drive.',
      options: ['enough', 'too', 'very', 'so'],
      correctIndex: 0,
      correctReason: { ru: 'Верно. Enough после прилагательного: old enough, good enough, strong enough.', uk: 'Вірно. Enough після прикметника: old enough, good enough, strong enough.', es: 'Correcto. Enough va después del adjetivo: old enough, good enough, strong enough.' },
      wrongReason: { ru: 'Для "достаточно взрослый" английский ставит enough после adjective: old enough to drive.', uk: 'Для "достатньо дорослий" англійська ставить enough після adjective: old enough to drive.', es: 'Para "lo bastante mayor", el inglés pone enough después del adjetivo: old enough to drive.' },
      coachTip: { ru: 'Adjective + enough: good enough, fast enough, old enough.', uk: 'Adjective + enough: good enough, fast enough, old enough.', es: 'Adjective + enough: good enough, fast enough, old enough.' },
    },
    {
      situation: { ru: 'Ты спрашиваешь о вчерашнем действии.', uk: 'Ти питаєш про вчорашню дію.', es: 'Preguntas por una acción de ayer.' },
      question: { ru: 'Выбери правильный вопрос:', uk: 'Обери правильне питання:', es: 'Elige la pregunta correcta:' },
      sentence: '___ you see him yesterday?',
      options: ['Did', 'Do', 'Were', 'Have'],
      correctIndex: 0,
      correctReason: { ru: 'Да. Yesterday указывает на Past Simple, а вопрос строится через did: Did you see him yesterday?', uk: 'Так. Yesterday вказує на Past Simple, а питання будується через did: Did you see him yesterday?', es: 'Sí. Yesterday apunta a Past Simple, y la pregunta se construye con did: Did you see him yesterday?' },
      wrongReason: { ru: 'Для обычного действия в прошлом нужен did. После did глагол остаётся базовым: did you see, не did you saw.', uk: 'Для звичайної дії в минулому потрібен did. Після did дієслово залишається базовим: did you see, не did you saw.', es: 'Para una acción normal en pasado necesitas did. Después de did, el verbo queda base: did you see, no did you saw.' },
      coachTip: { ru: 'Past Simple question: Did + subject + base verb?', uk: 'Past Simple question: Did + subject + base verb?', es: 'Past Simple question: Did + subject + base verb?' },
    },
    {
      situation: { ru: 'Ты ставишь обстоятельство времени в естественное место.', uk: 'Ти ставиш обставину часу в природне місце.', es: 'Colocas el detalle de tiempo en una posición natural.' },
      question: { ru: 'Выбери естественный порядок слов:', uk: 'Обери природний порядок слів:', es: 'Elige el orden natural:' },
      sentence: 'Choose the natural version:',
      options: ['She reads books every day.', 'She reads every day books.', 'Every day books she reads.', 'Reads she books every day.'],
      correctIndex: 0,
      correctReason: { ru: 'Правильно. Базовый порядок: subject → verb → object → details. She reads books every day.', uk: 'Правильно. Базовий порядок: subject → verb → object → details. She reads books every day.', es: 'Correcto. Orden básico: subject → verb → object → details. She reads books every day.' },
      wrongReason: { ru: 'Every day лучше не вставлять между глаголом и объектом. Сначала reads books, потом деталь времени: every day.', uk: "Every day краще не вставляти між дієсловом і об'єктом. Спочатку reads books, потім деталь часу: every day.", es: 'Mejor no poner every day entre verbo y objeto. Primero reads books, luego el detalle de tiempo: every day.' },
      coachTip: { ru: 'Не разрывай verb + object без причины: read books, drink coffee, watch films.', uk: 'Не розривай verb + object без причини: read books, drink coffee, watch films.', es: 'No rompas verb + object sin motivo: read books, drink coffee, watch films.' },
    },
  ],
  consolidationTitle: { ru: 'Сборка предложения стала чище', uk: 'Збірка речення стала чистішою', es: 'La construcción de la frase ya está más limpia' },
  consolidationText: {
    ru: 'Теперь закрепи это на реальных фразах. Главная цель - видеть скелет: кто делает, что делает, кого касается действие и где стоят помощники в вопросах и отрицаниях.',
    uk: 'Тепер закріпи це на реальних фразах. Головна ціль - бачити скелет: хто робить, що робить, кого стосується дія і де стоять помічники в питаннях та запереченнях.',
    es: 'Ahora consolídalo con frases reales. El objetivo es ver el esqueleto: quién hace, qué hace, a quién afecta la acción y dónde van los auxiliares en preguntas y negaciones.',
  },
};

export const PROBLEM_COACH_LESSONS: Record<WordCategory, ProblemCoachLesson> = {
  article: ARTICLE_LESSON,
  preposition: PREPOSITION_LESSON,
  verb: VERB_LESSON,
  modal: MODAL_LESSON,
  'to-be': TO_BE_LESSON,
  phrasal_particle: PHRASAL_PARTICLE_LESSON,
  noun: NOUN_LESSON,
  adjective: ADJECTIVE_LESSON,
  adverb: ADVERB_LESSON,
  pronoun: PRONOUN_LESSON,
  conjunction: CONJUNCTION_LESSON,
  other: OTHER_LESSON,
};
