/**
 * Интро уроков 9–16 строго по теме упражнений (Present/Past/Future Simple, там/bem там and т.п.).
 */
import type { LessonIntroScreen } from './lesson_data_types';

const HOW_APP_WORKS: LessonIntroScreen = {
  kind: 'mechanic',
  titleRU: 'Как это работает',
  titleUK: 'Як це працює',
  titleES: 'Cómo funciona la app',
  textRU:
    'Подсказка показана на языке приложения — собирай английскую фразу из кнопок в нужном порядке. Кнопка «½» убирает часть ошибочных слов; раздел «Теория» снова открывает эти слайды.',
  textUK:
    'Підказка вашою мовою — склади англійську фразу за кнопками послідовно. «½» скорочує зайві варіанти.',
  textES:
    'La pista va en tu idioma; ordena las palabras en inglés bien. «½» ayuda cuando hay muchos distractores.',
};

function bundle(
  why: Pick<LessonIntroScreen, 'titleRU' | 'titleUK' | 'titleES' | 'textRU' | 'textUK' | 'textES'>,
  how: Pick<LessonIntroScreen, 'textRU' | 'textUK' | 'textES' | 'examples'>,
  trap: Pick<LessonIntroScreen, 'textRU' | 'textUK' | 'textES'>,
): LessonIntroScreen[] {
  return [
    { kind: 'why', ...why },
    {
      kind: 'how',
      titleRU: 'Как строится фраза',
      titleUK: 'Як будується фраза',
      titleES: 'Cómo se forma',
      ...how,
    },
    {
      kind: 'trap',
      titleRU: 'Главная ловушка',
      titleUK: 'Головна пастка',
      titleES: 'Evita errores típicos',
      ...trap,
    },
    HOW_APP_WORKS,
  ];
}

export const LESSON_9_INTRO_SCREENS: LessonIntroScreen[] = bundle(
  {
    titleRU: 'There is / There are',
    titleUK: 'There is / There are',
    titleES: 'There is / There are',
    textRU:
      'Нужно сказать простыми словами, что где-то что-то находится или отсутствует: предмет в комнате, ключи в сумке, аптека в аэропорту. Такой способ сообщения информации звучит естественно в английском.',
    textUK:
      'Коротко сказати, що є в кімнаті, сумці або місті без довгих уточнень — із there is та there are.',
    textES:
      'Para decir si algo existe en un lugar: habitación, bolso, calle.',
  },
  {
    textRU:
      'There is + один предмет, there are + несколько или предмет во множественном числе. Чтобы спросить, меняются местами форма из is/are и there: Is there a pharmacy?',
    textUK:
      'is з одним об’єктом, are з декількома; запит починається з Is there / Are there.',
    textES:
      'There is + singular · there are + plural; ¿Is there…? / ¿Are there…?',
    examples: [
      { en: 'There is a bed in my room.', trRU: 'В моей комнате есть кровать.', trUK: 'У моїй кімнаті є ліжко.', trES: 'En mi cuarto hay una cama.' },
      { en: 'There are some keys in the bag.', trRU: 'В сумке есть ключи.', trUK: 'У сумці є ключі.', trES: 'Hay llaves en el bolso.' },
      { en: 'Is there a pharmacy at the airport?', trRU: 'В аэропорту есть аптека?', trUK: 'Чи є в аеропорту аптека?', trES: '¿Hay farmacia en el aeropuerto?' },
    ],
  },
  {
    textRU:
      'Не пиши конструкцию как в русском «они есть»: *They is* неверно. Начинай с there и подбирай форму глагола is или are:',
    textUK:
      'Ніколи *they is*. У шаблоні спочатку there, потім правильний is або are.',
    textES:
      'No pongas «they» con «is»: usa there is / there are.',
  },
);

export const LESSON_10_INTRO_SCREENS: LessonIntroScreen[] = bundle(
  {
    titleRU: 'Модальные глаголы',
    titleUK: 'Модальні дієслова',
    titleES: 'Verbos modales (inglés)',
    textRU:
      'Модальные слова (can, could, may, might, must, shall, should, will, would) задают оттенок: умение, долг, разрешение, вероятность, совет, будущее. После них в английском идёт смысловой глагол в начальной форме без частицы to. В этом же уроке есть конструкции have to и need to — смысл близок к «должен / нужно», но to там часть выражения, а не «лишняя» частица после модалки.',
    textUK:
      'Модальні слова (can, could, may, might, must, shall, should, will, would) задають відтінок: вміння, обов’язок, дозвіл, ймовірність, порада, майбутнє. Після них — дієслово без to. Окремо в уроці — have to та need to: to там частина конструкції.',
    textES:
      'Los modales en inglés van seguidos del infinitivo sin «to». En esta lección también practicas have to y need to: ahí «to» forma parte de la perífrasis (obligación o necesidad), no es un error.',
  },
  {
    textRU:
      'Кратко по каждому: can — умение или возможность сейчас; could — прошлая способность, мягкая просьба, «смягчение» по сравнению с can; may — разрешение или нейтральная возможность, May I… — вежливый вопрос; might — меньше уверенности, чем may; must — сильный долг или уверенный вывод, must not — запрет; shall — предложение действия (часто Shall we…? / Shall I…?); should — совет или оценка «так лучше»; will — решение, прогноз, будущее; would — вежливая просьба, условие, «мягкое» поведение в прошлом. Отдельно: have to / need to + глагол — внешнее требование или необходимость (не одно слово-модалка).',
    textUK:
      'Стисло: can — здібність/можливість; could — минуле вміння або ввічлива просьба; may — дозвіл чи можливість; might — менша впевненість; must — сильний обов’язок; must not — заборона; shall — пропозиція (Shall we…?); should — порада; will — майбутнє/рішення; would — умовність або Would you…?; have to / need to — зовнішня необхідність (to — частина звороту).',
    textES:
      'can: habilidad; could: pasado cortés o posibilidad suave; may: permiso; might: menos certeza; must: obligación fuerte; must not: prohibición; shall: propuesta (¿Shall we…?); should: consejo; will: futuro/decisión; would: condicional o cortesía. have to / need to expresan deber externo (el «to» es obligatorio en la perífrasis).',
    examples: [
      { en: 'I can translate this document.', trRU: 'Я могу перевести этот документ.', trUK: 'Я можу перекласти цей документ.', trES: 'Puedo traducir este documento.' },
      { en: 'Could you help me with this task?', trRU: 'Вы могли бы помочь мне с этим заданием?', trUK: 'Ви могли б допомогти мені з цим завданням?', trES: '¿Podrías ayudarme con esta tarea?' },
      { en: 'May I ask a question?', trRU: 'Можно мне задать вопрос?', trUK: 'Можна мені поставити запитання?', trES: '¿Puedo hacer una pregunta?' },
      { en: 'She might join our meeting tomorrow.', trRU: 'Она может присоединиться к нашей встрече завтра.', trUK: 'Вона може приєднатися до нашої зустрічі завтра.', trES: 'Quizá se una a nuestra reunión mañana.' },
      { en: 'We must buy groceries today.', trRU: 'Мы должны купить продукты сегодня.', trUK: 'Ми повинні купити продукти сьогодні.', trES: 'Tenemos que comprar comida hoy.' },
      { en: 'Shall we start the meeting now?', trRU: 'Начнём встречу сейчас?', trUK: 'Почнемо зустріч зараз?', trES: '¿Empezamos la reunión ahora?' },
      { en: 'You should call a doctor.', trRU: 'Вам следует вызвать врача.', trUK: 'Вам слід викликати лікаря.', trES: 'Deberías llamar a un médico.' },
      { en: 'They will organize this holiday.', trRU: 'Они организуют этот праздник.', trUK: 'Вони організують це свято.', trES: 'Organizarán esta fiesta.' },
      { en: 'I would choose this option.', trRU: 'Я бы выбрал этот вариант.', trUK: 'Я б обрав цей варіант.', trES: 'Elegiría esta opción.' },
    ],
  },
  {
    textRU:
      'Не вставляй to сразу после настоящих модальных: *must to go* неверно — must go. У must not (запрет) и don\'t have to (нет обязанности) разный смысл. После модального второй глагол без -s: *she can goes* неверно. Для have to / need to используй полную форму: I have to go, You need to check…',
    textUK:
      'Не *must to go* — лише must go. must not ≠ don\'t have to. Після модалки без -s на другому дієслові: не *she can goes*. have to / need to — окремі звороти з to.',
    textES:
      'Tras un modal puro no pongas «to» (*must to* ✗). must not (prohibición) ≠ don\'t have to (no es obligatorio). Tras modal, verbo en base sin *-s* en tercera persona. Con have to / need to el «to» va siempre.',
  },
);

export const LESSON_11_INTRO_SCREENS: LessonIntroScreen[] = bundle(
  {
    titleRU: 'Past Simple: правильные глаголы',
    titleUK: 'Past Simple: правильні дієслова',
    titleES: 'Past Simple: verbos regulares',
    textRU:
      'Разговор о событии, которое уже завершено: ты переносишь действие во вчера, три дня назад или позапрошлую неделю. У многих глаголов достаточно окончания -ed без сложной таблицы.',
    textUK:
      'Подія уже сталась; для правильних дієслів часто просто суфікс -ed:',
    textES:
      'Hechos acabados ayer/hace tiempo: muchos verbos regulares llevan «-ed».',
  },
  {
    textRU:
      'I booked…, She cooked…, Обычное место времени во фразах — слова типа yesterday, ago, last week.',
    textUK:
      'Маркери часу yesterday, two hours ago, last week йдуть із простим минулим.',
    textES:
      'Ayer · hace dos horas · la semana pasada marcan el PASADO.',
    examples: [
      { en: 'I booked this table two hours ago.', trRU: 'Я забронировал столик два часа назад.', trUK: 'Я забронював столик дві години тому.', trES: 'Reservé la mesa hace dos horas.' },
      { en: 'She cooked a good dinner yesterday evening.', trRU: 'Она вчера приготовила хороший ужин.', trUK: 'Вона вчора приготувала вечерю.', trES: 'Ayer cocinó una buena cena.' },
      { en: 'We visited our friends last week.', trRU: 'Мы навестили друзей на прошлой неделе.', trUK: 'Минулого тижня відвідали друзів.', trES: 'La semana pasada visitamos a nuestros amigos.' },
    ],
  },
  {
    textRU:
      'Не прибавляй -ed лишний раз там, где глагол неправильный: в следующем блоке они выучиваются по спискам.',
    textUK:
      'Не плутай з неправильними минулими формами — там інші слова;',
    textES:
      'Aquí sólo patrones regulares; los irregulares van aparte.',
  },
);

export const LESSON_12_INTRO_SCREENS: LessonIntroScreen[] = bundle(
  {
    titleRU: 'Past Simple: неправильные глаголы',
    titleUK: 'Past Simple: неправильні дієслова',
    titleES: 'Past Simple: verbos irregulares',
    textRU:
      'Те же прошедшие ситуации, но вторую форму глагола нужно запоминать как отдельное слово: bought вместо *buyed*, brought вместо *bringed*. Время задают те же слова-сигналы, что и в прошлый раз.',
    textUK:
      'Друга форма — своя до кожного дієслова; yesterday / ago також підходять.',
    textES:
      'Misma idea de tiempo acabado, pero cada verbo lleva participio irregular propio.',
  },
  {
    textRU:
      'I bought this bread yesterday · She drank her coffee · We went to the gym.',
    textUK:
      'Не додавай -ed до форм на кшталт bought, went, drank — там своя друга форма.',
    textES:
      'Compró / fue / trajeron aparecen así, sin «ed» nuevo.',
    examples: [
      { en: 'I bought this fresh bread yesterday.', trRU: 'Вчера купил свежий хлеб.', trUK: 'Вчора купив свіжий хліб.', trES: 'Ayer compré pan fresco.' },
      { en: 'She drank her hot coffee three hours ago.', trRU: 'Она выпила кофе три часа назад.', trUK: 'Вона три години тому випила каву.', trES: 'Tomó café hace tres horas.' },
      { en: 'We went to that new gym last week.', trRU: 'На прошлой неделе ходили в новый спортзал.', trUK: 'Минулого тижня пішли в новий спортзал.', trES: 'La semana pasada fuimos al gimnasio nuevo.' },
    ],
  },
  {
    textRU:
      'Разные глаголы — разные формы: bought (от buy) и brought (от bring) нельзя подставлять друг вместо друга.',
    textUK:
      'Bought ≠ brought та інші пари перевір словником;',
    textES:
      'Parejas como buy/brought se confunden: repasa la lista corta.',
  },
);

export const LESSON_13_INTRO_SCREENS: LessonIntroScreen[] = bundle(
  {
    titleRU: 'Future Simple (will)',
    titleUK: 'Future Simple (will)',
    titleES: 'Future Simple',
    textRU:
      'Ставишь will перед обычным глаголом — и получаешь будущее. Will одинаковый для всех лиц: I will call, he will call, they will call. После will глагол не меняется — без -s.',
    textUK:
      'Will + початкова форма дієслова — однакова для всіх осіб: I will call, he will call;',
    textES:
      'Will + infinitivo: igual para todas las personas. Sin -s tras will.',
  },
  {
    textRU:
      'Утверждение: I will call you tomorrow. · Отрицание: I will not wait. · Вопрос: Will you call me?',
    textUK:
      'Стверджування → заперечення (will not) → питання (Will + підмет + дієслово?);',
    textES:
      'Afirmación → negación (will not) → pregunta (¿Will + sujeto + verbo?).',
    examples: [
      { en: 'I will call you tomorrow.', trRU: 'Я позвоню тебе завтра.', trUK: 'Я зателефоную тобі завтра.', trES: 'Te llamaré mañana.' },
      { en: 'I will not wait.', trRU: 'Я не буду ждать.', trUK: 'Я не буду чекати.', trES: 'No esperaré.' },
      { en: 'Will you call me tomorrow?', trRU: 'Ты позвонишь мне завтра?', trUK: 'Ти зателефонуєш мені завтра?', trES: '¿Me llamarás mañana?' },
    ],
  },
  {
    textRU:
      'Маркеры будущего: tomorrow, soon, later, tonight, next week, next month, in two days. Они помогают ученику сразу понять, что речь о будущем.',
    textUK:
      'Маркери майбутнього: tomorrow, soon, later, tonight, next week, in two days;',
    textES:
      'Marcadores de futuro: tomorrow, soon, later, tonight, next week, in two days.',
  },
);

export const LESSON_14_INTRO_SCREENS: LessonIntroScreen[] = bundle(
  {
    titleRU: 'Степени сравнения прилагательных',
    titleUK: 'Ступені порівняння прикметників',
    titleES: 'Grados de comparación',
    textRU:
      'Короткие прилагательные: добавь -er (cheaper, faster, easier). Длинные: ставь more перед ним (more expensive, more important). Неправильные: good → better, bad → worse.',
    textUK:
      'Короткі: -er (cheaper, faster); довгі: more + adj (more important); неправильні: good → better, bad → worse;',
    textES:
      'Cortos: -er; largos: more + adj; irregulares: good → better, bad → worse.',
  },
  {
    textRU:
      'Самый (superlative): the + -est или the most. Неправильные: the best, the worst.',
    textUK:
      'Найвищий ступінь: the + -est або the most; неправильні: the best, the worst;',
    textES:
      'Superlativo: the + -est o the most; irregulares: the best, the worst.',
    examples: [
      { en: 'This is cheaper.', trRU: 'Это дешевле.', trUK: 'Це дешевше.', trES: 'Esto es más barato.' },
      { en: 'This is the cheapest ticket.', trRU: 'Это самый дешёвый билет.', trUK: 'Це найдешевший квиток.', trES: 'Este es el billete más barato.' },
      { en: 'I feel much better today.', trRU: 'Я сегодня чувствую себя намного лучше.', trUK: 'Сьогодні я почуваюся набагато краще.', trES: 'Hoy me siento mucho mejor.' },
    ],
  },
  {
    textRU:
      'Не добавляй -er к длинным словам: *importanter* неверно. И не путай: cheaper = сравнение, the cheapest = превосходная степень.',
    textUK:
      'Не *importanter* — тільки more important; cheaper ≠ the cheapest;',
    textES:
      'No *importanter*; usa «more important». cheaper ≠ the cheapest.',
  },
);

export const LESSON_15_INTRO_SCREENS: LessonIntroScreen[] = bundle(
  {
    titleRU: 'Притяжательные местоимения',
    titleUK: 'Присвійні займенники',
    titleES: 'Pronombres posesivos',
    textRU:
      'Два типа: my/your/his/her/our/their — стоят перед существительным. Mine/yours/his/hers/ours/theirs — стоят без существительного, в конце фразы.',
    textUK:
      'my/your/his/her — перед іменником; mine/yours/hers — без іменника, в кінці;',
    textES:
      'my/your/his/her antes del sustantivo; mine/yours/hers sin sustantivo, al final.',
  },
  {
    textRU:
      'Главная ловушка: her (перед предметом) и hers (без предмета). His одинаковый в обоих случаях.',
    textUK:
      'her ticket (перед іменником) ≠ hers (без іменника); his однаковий в обох позиціях;',
    textES:
      'her ticket ≠ hers sin sustantivo; his igual en ambas posiciones.',
    examples: [
      { en: 'This phone is mine.', trRU: 'Этот телефон мой.', trUK: 'Цей телефон мій.', trES: 'Este teléfono es mío.' },
      { en: 'This is her ticket.', trRU: 'Это её билет.', trUK: 'Це її квиток.', trES: 'Este es su billete.' },
      { en: 'This ticket is hers.', trRU: 'Этот билет её.', trUK: 'Цей квиток її.', trES: 'Este billete es suyo.' },
    ],
  },
  {
    textRU:
      'Нельзя: This is hers ticket. Правильно: This is her ticket. / This ticket is hers.',
    textUK:
      'Не *This is hers ticket* — або her ticket, або This ticket is hers;',
    textES:
      'No *This is hers ticket*: usa her ticket o This ticket is hers.',
  },
);

export const LESSON_16_INTRO_SCREENS: LessonIntroScreen[] = bundle(
  {
    titleRU: 'Фразовые глаголы',
    titleUK: 'Фразові дієслова',
    titleES: 'Verbos frasales',
    textRU:
      'К глаголу добавляют маленькое слово — частицу: wake up, get up, look after — и значение меняется. Здесь только бытовые связки.',
    textUK:
      'Частинка після дієслова — частина значення, не «переклад по словах»;',
    textES:
      'Partícula + verbo = nuevo sentido (despertarse, levantarse, cuidar).',
  },
  {
    textRU:
      'Do I usually wake up early? · Do we get up from the sofa? · The guard looks after the entrance.',
    textUK:
      'Питання з Do/Does + фразове дієслово зберігає порядок частин;',
    textES:
      'Mantén la partícula junto al verbo en la oración.',
    examples: [
      { en: 'Do I usually wake up early in this bright room?', trRU: 'Я обычно рано просыпаюсь в этой комнате?', trUK: 'Чи зазвичай я рано прокидаюся в цій кімнаті?', trES: '¿Sueles despertarte pronto en esta habitación?' },
      { en: 'Do we usually get up from this soft sofa quickly?', trRU: 'Мы быстро встаём с дивана?', trUK: 'Чи швидко встаємо з дивана?', trES: '¿Nos levantamos rápido del sofá?' },
      { en: 'That reliable guard always looks after this entrance.', trRU: 'Охранник всегда присматривает за входом.', trUK: 'Охоронець наглядає за входом.', trES: 'Ese vigilante cuida siempre la entrada.' },
    ],
  },
  {
    textRU:
      'Не отрывай частицу от глагола смысловым ударением: *look the baby after* неверно — look after the baby.',
    textUK:
      'Порядок слів у фразових дієсловах фіксований;',
    textES:
      'No separes look · after en posiciones raras.',
  },
);
