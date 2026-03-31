// ==================== LESSON 6 ====================
// Lesson 6: Специальные вопросы (Special Questions)

const LESSON_6_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    textRU: 'Пришла пора настоящего интерактива! Забудь о монологах. В реальной жизни люди задают вопросы и ждут ответов. Именно этому ты научишься в этом уроке!',
    textUK: 'Прийшла пора справжнього інтерактиву! Забудь про монологи. У реальному житті люди задають питання й чекають відповідей. Саме цьому ти навчишся у цьому уроці!',
  },
  {
    textRU: 'Сегодня: специальные вопросы (WHERE, WHEN, WHAT, WHY, HOW). Просто: подставляй нужное слово в начало фразы, и готово!',
    textUK: 'Сьогодні: спеціальні питання (WHERE, WHEN, WHAT, WHY, HOW). Просто: підстав потрібне слово на початок фрази й готово!',
  },
];

// Lesson 6 Vocabulary
export const LESSON_6_VOCABULARY = [
  { english: 'Always', russian: 'Всегда', ukrainian: 'Завжди' }},
  { english: 'Ask', russian: 'Просить (с предлогом for)', ukrainian: 'Просити' }},
  { english: 'Bag', russian: 'Сумка', ukrainian: 'Сумка' }},
  { english: 'Bill', russian: 'Счет (в ресторане)', ukrainian: 'Рахунок' }},
  { english: 'Book', russian: 'Бронировать', ukrainian: 'Бронювати' }},
  { english: 'Buy', russian: 'Покупать', ukrainian: 'Купувати' }},
  { english: 'Buy (bought, bought)', russian: 'Покупать', ukrainian: 'Купувати' }},
  { english: 'Call', russian: 'Звонить', ukrainian: 'Телефонувати' }},
  { english: 'Carry', russian: 'Носить (в руках/при себе)', ukrainian: 'Носити (в руках/при собі)' }},
  { english: 'Check', russian: 'Проверять', ukrainian: 'Перевіряти' }},
  { english: 'Close', russian: 'Закрывать', ukrainian: 'Зачиняти' }},
  { english: 'Come', russian: 'Приходить', ukrainian: 'Приходити' }},
  { english: 'Come (came, come)', russian: 'Приходить', ukrainian: 'Приходити' }},
  { english: 'Confirmation', russian: 'Подтверждение', ukrainian: 'Підтвердження' }},
  { english: 'Cook', russian: 'Готовить', ukrainian: 'Готувати' }},
  { english: 'Cost', russian: 'Стоить', ukrainian: 'Коштувати' }},
  { english: 'Cost (cost, cost)', russian: 'Стоить', ukrainian: 'Коштувати' }},
  { english: 'Cry', russian: 'Плакать', ukrainian: 'Плакати' }},
  { english: 'Do', russian: 'Делать', ukrainian: 'Робити' }},
  { english: 'Do (did, done)', russian: 'Делать', ukrainian: 'Робити' }},
  { english: 'Document', russian: 'Документ', ukrainian: 'Документ' }},
  { english: 'Door', russian: 'Дверь', ukrainian: 'Двері' }},
  { english: 'Drink', russian: 'Пить', ukrainian: 'Пити' }},
  { english: 'Drink (drank, drunk)', russian: 'Пить', ukrainian: 'Пити' }},
  { english: 'Eat', russian: 'Есть', ukrainian: 'Їсти' }},
  { english: 'Eat (ate, eaten)', russian: 'Есть', ukrainian: 'Їсти' }},
  { english: 'Exit', russian: 'Выход', ukrainian: 'Вихід' }},
  { english: 'Find', russian: 'Находить', ukrainian: 'Знаходити' }},
  { english: 'Find (found, found)', russian: 'Находить', ukrainian: 'Знаходити' }},
  { english: 'Finish', russian: 'Заканчивать', ukrainian: 'Закінчувати' }},
  { english: 'Go', russian: 'Идти', ukrainian: 'Йти' }},
  { english: 'Go (went, gone)', russian: 'Идти', ukrainian: 'Йти' }},
  { english: 'Groceries', russian: 'Продукты (бакалея)', ukrainian: 'Продукти' }},
  { english: 'Guest', russian: 'Гость', ukrainian: 'Гість' }},
  { english: 'Help', russian: 'Помогать', ukrainian: 'Допомагати' }},
  { english: 'Home', russian: 'Дом (домой)', ukrainian: 'Дім (додому)' }},
  { english: 'How', russian: 'Как', ukrainian: 'Як' }},
  { english: 'Keep', russian: 'Хранить', ukrainian: 'Зберігати' }},
  { english: 'Keep (kept, kept)', russian: 'Хранить', ukrainian: 'Зберігати' }},
  { english: 'Key', russian: 'Ключ', ukrainian: 'Ключ' }},
  { english: 'Leave', russian: 'Уходить (покидать)', ukrainian: 'Йти (покидати)' }},
  { english: 'Leave (left, left)', russian: 'Уходить', ukrainian: 'Йти' }},
  { english: 'Live', russian: 'Жить', ukrainian: 'Жити' }},
  { english: 'Luggage', russian: 'Багаж', ukrainian: 'Багаж' }},
  { english: 'Lunch', russian: 'Обед', ukrainian: 'Обід' }},
  { english: 'Mail', russian: 'Почта', ukrainian: 'Пошта' }},
  { english: 'Meet', russian: 'Встречать', ukrainian: 'Зустрічати' }},
  { english: 'Meet (met, met)', russian: 'Встречать', ukrainian: 'Зустрічати' }},
  { english: 'Meeting', russian: 'Встреча', ukrainian: 'Зустріч' }},
  { english: 'Much', russian: 'Много', ukrainian: 'Багато' }},
  { english: 'Now', russian: 'Сейчас', ukrainian: 'Зараз' }},
  { english: 'Open', russian: 'Открывать', ukrainian: 'Відчиняти' }},
  { english: 'Order', russian: 'Заказывать', ukrainian: 'Замовляти' }},
  { english: 'Parcel', russian: 'Посылка', ukrainian: 'Посилка' }},
  { english: 'Pay', russian: 'Платить', ukrainian: 'Платити' }},
  { english: 'Pay (paid, paid)', russian: 'Платить', ukrainian: 'Платити' }},
  { english: 'Pronounce', russian: 'Произносить', ukrainian: 'Вимовляти' }},
  { english: 'Put', russian: 'Класть', ukrainian: 'Класти' }},
  { english: 'Put (put, put)', russian: 'Класть', ukrainian: 'Класти' }},
  { english: 'Read', russian: 'Читать', ukrainian: 'Читати' }},
  { english: 'Read (read, read)', russian: 'Читать', ukrainian: 'Читати' }},
  { english: 'Report', russian: 'Отчет', ukrainian: 'Звіт' }},
  { english: 'See', russian: 'Видеть', ukrainian: 'Бачити' }},
  { english: 'See (saw, seen)', russian: 'Видеть', ukrainian: 'Бачити' }},
  { english: 'Send', russian: 'Отправлять', ukrainian: 'Відправляти' }},
  { english: 'Send (sent, sent)', russian: 'Отправлять', ukrainian: 'Відправляти' }},
  { english: 'Ship', russian: 'Отправлять (груз/посылку)', ukrainian: 'Відправляти (вантаж/посилку)' }},
  { english: 'Sign', russian: 'Подписывать', ukrainian: 'Підписувати' }},
  { english: 'Slowly', russian: 'Медленно', ukrainian: 'Повільно' }},
  { english: 'Speak', russian: 'Говорить', ukrainian: 'Говорити' }},
  { english: 'Speak (spoke, spoken)', russian: 'Говорить', ukrainian: 'Говорити' }},
  { english: 'Start', russian: 'Начинать', ukrainian: 'Починати' }},
  { english: 'This', russian: 'Этот (эта)', ukrainian: 'Цей (ця)' }},
  { english: 'Ticket', russian: 'Билет', ukrainian: 'Квиток' }},
  { english: 'Usually', russian: 'Обычно', ukrainian: 'Зазвичай' }},
  { english: 'Wait', russian: 'Ждать', ukrainian: 'Чекати' }},
  { english: 'Want', russian: 'Хотеть', ukrainian: 'Хотіти' }},
  { english: 'Way', russian: 'Путь (дорога)', ukrainian: 'Шлях (дорога)' }},
  { english: 'Wear', russian: 'Носить (одежду)', ukrainian: 'Носити (одяг)' }},
  { english: 'Wear (wore, worn)', russian: 'Носить', ukrainian: 'Носити' }},
  { english: 'What', russian: 'Что', ukrainian: 'Що' }},
  { english: 'When', russian: 'Когда', ukrainian: 'Коли' }},
  { english: 'Where', russian: 'Где', ukrainian: 'Де' }},
  { english: 'Why', russian: 'Почему', ukrainian: 'Чому' }},
  { english: 'Window', russian: 'Окно', ukrainian: 'Вікно' }},
  { english: 'Work', russian: 'Работа', ukrainian: 'Робота' }},
];

// Lesson 6 Irregular Verbs
export const LESSON_6_IRREGULAR_VERBS = [
  { verb: 'Buy', past: 'bought', participle: 'bought', russian: 'Покупать', ukrainian: 'Купувати11. Как ты произносишь это?' }},
  { verb: 'Come', past: 'came', participle: 'come', russian: 'Приходить', ukrainian: 'Приходити16. Что ты обычно покупаешь?' }},
  { verb: 'Cost', past: 'cost', participle: 'cost', russian: 'Стоить', ukrainian: 'Коштувати' }},
  { verb: 'Do', past: 'did', participle: 'done', russian: 'Делать', ukrainian: 'Робити' }},
  { verb: 'Drink', past: 'drank', participle: 'drunk', russian: 'Пить', ukrainian: 'Пити' }},
  { verb: 'Eat', past: 'ate', participle: 'eaten', russian: 'Есть', ukrainian: 'Їсти6. Сколько это стоит?' }},
  { verb: 'Find', past: 'found', participle: 'found', russian: 'Находить', ukrainian: 'Знаходити31. Где мы встречаем гостей?' }},
  { verb: 'Go', past: 'went', participle: 'gone', russian: 'Идти', ukrainian: 'Йти' }},
  { verb: 'Keep', past: 'kept', participle: 'kept', russian: 'Хранить', ukrainian: 'Зберігати' }},
  { verb: 'Leave', past: 'left', participle: 'left', russian: 'Уходить', ukrainian: 'Йти26. Что ты видишь?' }},
  { verb: 'Meet', past: 'met', participle: 'met', russian: 'Встречать', ukrainian: 'Зустрічати' }},
  { verb: 'Pay', past: 'paid', participle: 'paid', russian: 'Платить', ukrainian: 'Платити' }},
  { verb: 'Put', past: 'put', participle: 'put', russian: 'Класть', ukrainian: 'Класти' }},
  { verb: 'Read', past: 'read', participle: 'read', russian: 'Читать', ukrainian: 'Читати' }},
  { verb: 'See', past: 'saw', participle: 'seen', russian: 'Видеть', ukrainian: 'Бачити' }},
  { verb: 'Send', past: 'sent', participle: 'sent', russian: 'Отправлять', ukrainian: 'Відправляти' }},
  { verb: 'Speak', past: 'spoke', participle: 'spoken', russian: 'Говорить', ukrainian: 'Говорити41. Что я подписываю сейчас?' }},
  { verb: 'Wear', past: 'wore', participle: 'worn', russian: 'Носить', ukrainian: 'Носити' }},
];

// Lesson 6 Phrases (41 phrases from raw data)
const LESSON_6_PHRASES: LessonPhrase[] = [
  // Phrase 1
  {
    id: 'lesson6_phrase_1',
    english: 'Where do you live?',
    russian: 'Где ты живешь?',
    ukrainian: 'Де ти живеш?',
    words: [
      {
        text: 'Where',
        correct: 'Where',
        distractors: ['When', 'What', 'Were', 'Who', 'Why'],
      },
      {
        text: 'do',
        correct: 'do',
        distractors: ['does', 'done', 'did', 'dot', 'dog'],
      },
      {
        text: 'you',
        correct: 'you',
        distractors: ['your', 'yours', 'you're', 'u', 'youth'],
      },
      {
        text: 'live',
        correct: 'live',
        distractors: ['lives', 'living', 'life', 'leaf', 'leave'],
      },
    ],
  },
  // Phrase 2
  {
    id: 'lesson6_phrase_2',
    english: 'What does he eat?',
    russian: 'Что он ест?',
    ukrainian: 'Що він їсть?',
    words: [
      {
        text: 'What',
        correct: 'What',
        distractors: ['Wait', 'Want', 'White', 'When', 'Which'],
      },
      {
        text: 'does',
        correct: 'does',
        distractors: ['do', 'dose', 'goes', 'dies', 'done'],
      },
      {
        text: 'he',
        correct: 'he',
        distractors: ['his', 'him', 'she', 'hey', 'hi'],
      },
      {
        text: 'eat',
        correct: 'eat',
        distractors: ['eats', 'eating', 'ate', 'ears', 'east'],
      },
    ],
  },
  // Phrase 3
  {
    id: 'lesson6_phrase_3',
    english: 'When do we start?',
    russian: 'Когда мы начинаем?',
    ukrainian: 'Коли ми починаємо?',
    words: [
      {
        text: 'When',
        correct: 'When',
        distractors: ['Where', 'Went', 'Want', 'Win', 'West'],
      },
      {
        text: 'do',
        correct: 'do',
        distractors: ['due', 'day', 'die', 'door', 'dog'],
      },
      {
        text: 'we',
        correct: 'we',
        distractors: ['way', 'us', 'our', 'why', 'west'],
      },
      {
        text: 'start',
        correct: 'start',
        distractors: ['starts', 'starting', 'stay', 'star', 'stair'],
      },
    ],
  },
  // Phrase 4
  {
    id: 'lesson6_phrase_4',
    english: 'Why does she cry?',
    russian: 'Почему она плачет?',
    ukrainian: 'Чому вона плаче?',
    words: [
      {
        text: 'Why',
        correct: 'Why',
        distractors: ['Who', 'Way', 'White', 'While', 'When'],
      },
      {
        text: 'does',
        correct: 'does',
        distractors: ['dusting', 'doing', 'dish', 'dose', 'do'],
      },
      {
        text: 'she',
        correct: 'she',
        distractors: ['her', 'see', 'sea', 'shy', 'show'],
      },
      {
        text: 'cry',
        correct: 'cry',
        distractors: ['cries', 'crying', 'dry', 'try', 'fly'],
      },
    ],
  },
  // Phrase 5
  {
    id: 'lesson6_phrase_5',
    english: 'How do they work?',
    russian: 'Как они работают?',
    ukrainian: 'Як вони працюють?',
    words: [
      {
        text: 'How',
        correct: 'How',
        distractors: ['Who', 'Now', 'Low', 'Hey', 'Has'],
      },
      {
        text: 'do',
        correct: 'do',
        distractors: ['does', 'done', 'did', 'dot', 'dog'],
      },
      {
        text: 'they',
        correct: 'they',
        distractors: ['them', 'their', 'there', 'those', 'these'],
      },
      {
        text: 'work',
        correct: 'work',
        distractors: ['works', 'working', 'worker', 'word', 'walk'],
      },
    ],
  },
  // Phrase 7
  {
    id: 'lesson6_phrase_7',
    english: 'What do you drink?',
    russian: 'Что ты пьешь?',
    ukrainian: 'Що ти п'єш?',
    words: [
      {
        text: 'What',
        correct: 'What',
        distractors: ['Wait', 'Want', 'White', 'When', 'Which'],
      },
      {
        text: 'do',
        correct: 'do',
        distractors: ['does', 'done', 'did', 'dot', 'dog'],
      },
      {
        text: 'you',
        correct: 'you',
        distractors: ['your', 'yours', 'you're', 'u', 'youth'],
      },
      {
        text: 'drink',
        correct: 'drink',
        distractors: ['drinks', 'drinking', 'drunk', 'dress', 'dream'],
      },
    ],
  },
  // Phrase 8
  {
    id: 'lesson6_phrase_8',
    english: 'Where do they buy tickets?',
    russian: 'Где они покупают билеты?',
    ukrainian: 'Де вони купують квитки?',
    words: [
      {
        text: 'Where',
        correct: 'Where',
        distractors: ['Were', 'When', 'What', 'Who', 'Why'],
      },
      {
        text: 'do',
        correct: 'do',
        distractors: ['due', 'day', 'die', 'door', 'dog'],
      },
      {
        text: 'they',
        correct: 'they',
        distractors: ['them', 'their', 'there', 'those', 'these'],
      },
      {
        text: 'buy',
        correct: 'buy',
        distractors: ['buys', 'buying', 'boy', 'by', 'bought'],
      },
      {
        text: 'tickets',
        correct: 'tickets',
        distractors: ['ticket', 'thicket', 'tricks', 'takes', 'tastes'],
      },
    ],
  },
  // Phrase 9
  {
    id: 'lesson6_phrase_9',
    english: 'When does she call?',
    russian: 'Когда она звонит?',
    ukrainian: 'Коли вона телефонує?',
    words: [
      {
        text: 'When',
        correct: 'When',
        distractors: ['Where', 'Went', 'Want', 'Win', 'West'],
      },
      {
        text: 'does',
        correct: 'does',
        distractors: ['do', 'dose', 'dish', 'dies', 'done'],
      },
      {
        text: 'she',
        correct: 'she',
        distractors: ['her', 'see', 'sea', 'shy', 'show'],
      },
      {
        text: 'call',
        correct: 'call',
        distractors: ['calls', 'calling', 'ball', 'tall', 'cell'],
      },
    ],
  },
  // Phrase 10
  {
    id: 'lesson6_phrase_10',
    english: 'Why do we wait?',
    russian: 'Почему мы ждем?',
    ukrainian: 'Чому ми чекаємо?',
    words: [
      {
        text: 'Why',
        correct: 'Why',
        distractors: ['Who', 'Way', 'White', 'While', 'When'],
      },
      {
        text: 'do',
        correct: 'do',
        distractors: ['does', 'done', 'did', 'dot', 'dog'],
      },
      {
        text: 'we',
        correct: 'we',
        distractors: ['way', 'us', 'our', 'why', 'west'],
      },
      {
        text: 'wait',
        correct: 'wait',
        distractors: ['waits', 'waiting', 'want', 'went', 'wet'],
      },
    ],
  },
  // Phrase 12
  {
    id: 'lesson6_phrase_12',
    english: 'Where does he go?',
    russian: 'Куда он идет?',
    ukrainian: 'Куди він йде?',
    words: [
      {
        text: 'Where',
        correct: 'Where',
        distractors: ['Were', 'When', 'What', 'Who', 'Why'],
      },
      {
        text: 'does',
        correct: 'does',
        distractors: ['do', 'dose', 'goes', 'dies', 'done'],
      },
      {
        text: 'he',
        correct: 'he',
        distractors: ['his', 'him', 'she', 'hey', 'hi'],
      },
      {
        text: 'go',
        correct: 'go',
        distractors: ['goes', 'going', 'gone', 'got', 'get'],
      },
    ],
  },
  // Phrase 13
  {
    id: 'lesson6_phrase_13',
    english: 'What do we read?',
    russian: 'Что мы читаем?',
    ukrainian: 'Що ми читаємо?',
    words: [
      {
        text: 'What',
        correct: 'What',
        distractors: ['Wait', 'Want', 'White', 'When', 'Which'],
      },
      {
        text: 'do',
        correct: 'do',
        distractors: ['due', 'day', 'die', 'door', 'dog'],
      },
      {
        text: 'we',
        correct: 'we',
        distractors: ['way', 'us', 'our', 'why', 'west'],
      },
      {
        text: 'read',
        correct: 'read',
        distractors: ['reads', 'reading', 'red', 'road', 'ready'],
      },
    ],
  },
  // Phrase 14
  {
    id: 'lesson6_phrase_14',
    english: 'When does she usually come?',
    russian: 'Когда она обычно приходит?',
    ukrainian: 'Коли вона зазвичай приходить?',
    words: [
      {
        text: 'When',
        correct: 'When',
        distractors: ['Where', 'Went', 'Want', 'Win', 'West'],
      },
      {
        text: 'does',
        correct: 'does',
        distractors: ['do', 'dose', 'dish', 'dies', 'done'],
      },
      {
        text: 'she',
        correct: 'she',
        distractors: ['her', 'see', 'sea', 'shy', 'show'],
      },
      {
        text: 'usually',
        correct: 'usually',
        distractors: ['usual', 'use', 'used', 'useful', 'usuallyly'],
      },
      {
        text: 'come',
        correct: 'come',
        distractors: ['comes', 'coming', 'came', 'calm', 'cold'],
      },
    ],
  },
  // Phrase 15
  {
    id: 'lesson6_phrase_15',
    english: 'Why do they close /the/ door?',
    russian: 'Почему они закрывают дверь?',
    ukrainian: 'Чому вони зачиняють двері?',
    words: [
      {
        text: 'Why',
        correct: 'Why',
        distractors: ['Who', 'Way', 'White', 'While', 'When'],
      },
      {
        text: 'do',
        correct: 'do',
        distractors: ['does', 'done', 'did', 'dot', 'dog'],
      },
      {
        text: 'they',
        correct: 'they',
        distractors: ['them', 'their', 'there', 'those', 'these'],
      },
      {
        text: 'close',
        correct: 'close',
        distractors: ['closes', 'closing', 'class', 'clean', 'chose'],
      },
      {
        text: '/the/',
        correct: '/the/',
        distractors: ['then', 'than', 'that', 'this', 'thus'],
      },
      {
        text: 'door',
        correct: 'door',
        distractors: ['floor', 'poor', 'board', 'do', 'doll'],
      },
    ],
  },
  // Phrase 17
  {
    id: 'lesson6_phrase_17',
    english: 'Where does he work?',
    russian: 'Где он работает?',
    ukrainian: 'Де він працює?',
    words: [
      {
        text: 'Where',
        correct: 'Where',
        distractors: ['Were', 'When', 'Who', 'Why', 'Wear'],
      },
      {
        text: 'does',
        correct: 'does',
        distractors: ['do', 'dose', 'goes', 'dies', 'done'],
      },
      {
        text: 'he',
        correct: 'he',
        distractors: ['his', 'him', 'she', 'hey', 'hi'],
      },
      {
        text: 'work',
        correct: 'work',
        distractors: ['works', 'working', 'worker', 'word', 'walk'],
      },
    ],
  },
  // Phrase 18
  {
    id: 'lesson6_phrase_18',
    english: 'Why do we pay now?',
    russian: 'Почему мы платим сейчас?',
    ukrainian: 'Чому ми платимо зараз?',
    words: [
      {
        text: 'Why',
        correct: 'Why',
        distractors: ['Who', 'Way', 'White', 'While', 'When'],
      },
      {
        text: 'do',
        correct: 'do',
        distractors: ['due', 'day', 'die', 'door', 'dog'],
      },
      {
        text: 'we',
        correct: 'we',
        distractors: ['way', 'us', 'our', 'why', 'west'],
      },
      {
        text: 'pay',
        correct: 'pay',
        distractors: ['pays', 'paying', 'play', 'pray', 'paid'],
      },
      {
        text: 'now',
        correct: 'now',
        distractors: ['know', 'new', 'no', 'nor', 'not'],
      },
    ],
  },
  // Phrase 19
  {
    id: 'lesson6_phrase_19',
    english: 'How does she open /the/ window?',
    russian: 'Как она открывает окно?',
    ukrainian: 'Як вона відчиняє вікно?',
    words: [
      {
        text: 'How',
        correct: 'How',
        distractors: ['Who', 'Now', 'Low', 'Has', 'His'],
      },
      {
        text: 'does',
        correct: 'does',
        distractors: ['do', 'dose', 'dish', 'dies', 'done'],
      },
      {
        text: 'she',
        correct: 'she',
        distractors: ['her', 'see', 'sea', 'shy', 'show'],
      },
      {
        text: 'open',
        correct: 'open',
        distractors: ['opens', 'opening', 'often', 'oven', 'offer'],
      },
      {
        text: '/the/',
        correct: '/the/',
        distractors: ['then', 'than', 'that', 'this', 'thus'],
      },
      {
        text: 'window',
        correct: 'window',
        distractors: ['winter', 'windy', 'wind', 'widow', 'yellow'],
      },
    ],
  },
  // Phrase 20
  {
    id: 'lesson6_phrase_20',
    english: 'When do they come home?',
    russian: 'Когда они приходят домой?',
    ukrainian: 'Коли вони приходять додому?',
    words: [
      {
        text: 'When',
        correct: 'When',
        distractors: ['Where', 'Went', 'Want', 'Win', 'West'],
      },
      {
        text: 'do',
        correct: 'do',
        distractors: ['does', 'done', 'did', 'dot', 'dog'],
      },
      {
        text: 'they',
        correct: 'they',
        distractors: ['them', 'their', 'there', 'those', 'these'],
      },
      {
        text: 'come',
        correct: 'come',
        distractors: ['comes', 'coming', 'came', 'calm', 'cold'],
      },
      {
        text: 'home',
        correct: 'home',
        distractors: ['house', 'hope', 'horse', 'hole', 'home-y'],
      },
    ],
  },
  // Phrase 22
  {
    id: 'lesson6_phrase_22',
    english: 'Where do we send /the/ report?',
    russian: 'Куда мы отправляем отчет?',
    ukrainian: 'Куди ми відправляємо звіт?',
    words: [
      {
        text: 'Where',
        correct: 'Where',
        distractors: ['Were', 'When', 'What', 'Who', 'Why'],
      },
      {
        text: 'do',
        correct: 'do',
        distractors: ['due', 'day', 'die', 'door', 'dog'],
      },
      {
        text: 'we',
        correct: 'we',
        distractors: ['way', 'us', 'our', 'why', 'west'],
      },
      {
        text: 'send',
        correct: 'send',
        distractors: ['sends', 'sending', 'sand', 'sound', 'sent'],
      },
      {
        text: '/the/',
        correct: '/the/',
        distractors: ['then', 'than', 'that', 'this', 'thus'],
      },
      {
        text: 'report',
        correct: 'report',
        distractors: ['repeat', 'repair', 'record', 'resort', 'report-y'],
      },
    ],
  },
  // Phrase 23
  {
    id: 'lesson6_phrase_23',
    english: 'How does he do it?',
    russian: 'Как он это делает?',
    ukrainian: 'Як він це робить?',
    words: [
      {
        text: 'How',
        correct: 'How',
        distractors: ['Who', 'Now', 'Low', 'Has', 'His'],
      },
      {
        text: 'does',
        correct: 'does',
        distractors: ['do', 'dose', 'goes', 'dies', 'done'],
      },
      {
        text: 'he',
        correct: 'he',
        distractors: ['his', 'him', 'she', 'hey', 'hi'],
      },
      {
        text: 'do',
        correct: 'do',
        distractors: ['does', 'doing', 'did', 'done', 'dot'],
      },
      {
        text: 'it',
        correct: 'it',
        distractors: ['its', 'in', 'at', 'is', 'if'],
      },
    ],
  },
  // Phrase 24
  {
    id: 'lesson6_phrase_24',
    english: 'Why does she want /to/ leave?',
    russian: 'Почему она хочет уйти?',
    ukrainian: 'Чому вона хоче піти?',
    words: [
      {
        text: 'Why',
        correct: 'Why',
        distractors: ['Who', 'Way', 'White', 'While', 'When'],
      },
      {
        text: 'does',
        correct: 'does',
        distractors: ['do', 'dose', 'dish', 'dies', 'done'],
      },
      {
        text: 'she',
        correct: 'she',
        distractors: ['her', 'see', 'sea', 'shy', 'show'],
      },
      {
        text: 'want',
        correct: 'want',
        distractors: ['wants', 'waiting', 'went', 'what', 'won't'],
      },
      {
        text: '/to/',
        correct: '/to/',
        distractors: ['too', 'two', 'the', 'through', 'till'],
      },
      {
        text: 'leave',
        correct: 'leave',
        distractors: ['leaves', 'leaving', 'live', 'life', 'leaf'],
      },
    ],
  },
  // Phrase 25
  {
    id: 'lesson6_phrase_25',
    english: 'When do they finish work?',
    russian: 'Когда они заканчивают работу?',
    ukrainian: 'Коли вони закінчують роботу?',
    words: [
      {
        text: 'When',
        correct: 'When',
        distractors: ['Where', 'Went', 'Want', 'Win', 'West'],
      },
      {
        text: 'do',
        correct: 'do',
        distractors: ['does', 'done', 'did', 'dot', 'dog'],
      },
      {
        text: 'they',
        correct: 'they',
        distractors: ['them', 'their', 'there', 'those', 'these'],
      },
      {
        text: 'finish',
        correct: 'finish',
        distractors: ['finishes', 'finishing', 'fish', 'fine', 'final'],
      },
      {
        text: 'work',
        correct: 'work',
        distractors: ['works', 'working', 'worker', 'word', 'walk'],
      },
    ],
  },
  // Phrase 27
  {
    id: 'lesson6_phrase_27',
    english: 'Where does he keep keys?',
    russian: 'Где он хранит ключи?',
    ukrainian: 'Де він зберігає ключі?',
    words: [
      {
        text: 'Where',
        correct: 'Where',
        distractors: ['Were', 'When', 'What', 'Who', 'Why'],
      },
      {
        text: 'does',
        correct: 'does',
        distractors: ['do', 'dose', 'goes', 'dies', 'done'],
      },
      {
        text: 'he',
        correct: 'he',
        distractors: ['his', 'him', 'she', 'hey', 'hi'],
      },
      {
        text: 'keep',
        correct: 'keep',
        distractors: ['keeps', 'keeping', 'sleep', 'deep', 'keen'],
      },
      {
        text: 'keys',
        correct: 'keys',
        distractors: ['key', 'kiss', 'knees', 'kids', 'keeps'],
      },
    ],
  },
  // Phrase 28
  {
    id: 'lesson6_phrase_28',
    english: 'How do we find /the/ exit?',
    russian: 'Как мы находим выход?',
    ukrainian: 'Як ми знаходимо вихід?',
    words: [
      {
        text: 'How',
        correct: 'How',
        distractors: ['Who', 'Now', 'Low', 'Has', 'His'],
      },
      {
        text: 'do',
        correct: 'do',
        distractors: ['due', 'day', 'die', 'door', 'dog'],
      },
      {
        text: 'we',
        correct: 'we',
        distractors: ['way', 'us', 'our', 'why', 'west'],
      },
      {
        text: 'find',
        correct: 'find',
        distractors: ['finds', 'finding', 'fine', 'kind', 'mind'],
      },
      {
        text: '/the/',
        correct: '/the/',
        distractors: ['then', 'than', 'that', 'this', 'thus'],
      },
      {
        text: 'exit',
        correct: 'exit',
        distractors: ['exist', 'edit', 'next', 'exam', 'exercise'],
      },
    ],
  },
  // Phrase 29
  {
    id: 'lesson6_phrase_29',
    english: 'Why does she carry this bag?',
    russian: 'Почему она носит эту сумку?',
    ukrainian: 'Чому вона носить цю сумку?',
    words: [
      {
        text: 'Why',
        correct: 'Why',
        distractors: ['Who', 'Way', 'White', 'While', 'When'],
      },
      {
        text: 'does',
        correct: 'does',
        distractors: ['do', 'dose', 'dish', 'dies', 'done'],
      },
      {
        text: 'she',
        correct: 'she',
        distractors: ['her', 'see', 'sea', 'shy', 'show'],
      },
      {
        text: 'carry',
        correct: 'carry',
        distractors: ['carries', 'carrying', 'sorry', 'marry', 'berry'],
      },
      {
        text: 'this',
        correct: 'this',
        distractors: ['these', 'those', 'that', 'thin', 'thus'],
      },
      {
        text: 'bag',
        correct: 'bag',
        distractors: ['big', 'back', 'bad', 'bed', 'bug'],
      },
    ],
  },
  // Phrase 30
  {
    id: 'lesson6_phrase_30',
    english: 'When do they ship /the/ parcel?',
    russian: 'Когда они отправляют посылку?',
    ukrainian: 'Коли вони відправляють посилку?',
    words: [
      {
        text: 'When',
        correct: 'When',
        distractors: ['Where', 'Went', 'Want', 'Win', 'West'],
      },
      {
        text: 'do',
        correct: 'do',
        distractors: ['does', 'done', 'did', 'dot', 'dog'],
      },
      {
        text: 'they',
        correct: 'they',
        distractors: ['them', 'their', 'there', 'those', 'these'],
      },
      {
        text: 'ship',
        correct: 'ship',
        distractors: ['ships', 'shipping', 'sheep', 'shop', 'skip'],
      },
      {
        text: '/the/',
        correct: '/the/',
        distractors: ['then', 'than', 'that', 'this', 'thus'],
      },
      {
        text: 'parcel',
        correct: 'parcel',
        distractors: ['paper', 'parent', 'partial', 'park', 'pencil'],
      },
    ],
  },
  // Phrase 32
  {
    id: 'lesson6_phrase_32',
    english: 'What does she usually cook?',
    russian: 'Что она обычно готовит?',
    ukrainian: 'Що вона зазвичай готує?',
    words: [
      {
        text: 'What',
        correct: 'What',
        distractors: ['Wait', 'Want', 'White', 'When', 'Which'],
      },
      {
        text: 'does',
        correct: 'does',
        distractors: ['do', 'dose', 'goes', 'dies', 'done'],
      },
      {
        text: 'she',
        correct: 'she',
        distractors: ['her', 'see', 'sea', 'shy', 'show'],
      },
      {
        text: 'usually',
        correct: 'usually',
        distractors: ['usual', 'useful', 'use', 'used', 'usuallyly'],
      },
      {
        text: 'cook',
        correct: 'cook',
        distractors: ['cooks', 'cooking', 'cool', 'book', 'look'],
      },
    ],
  },
  // Phrase 33
  {
    id: 'lesson6_phrase_33',
    english: 'Why do they ask /for/ help?',
    russian: 'Почему они просят помощи?',
    ukrainian: 'Чому вони просять допомоги?',
    words: [
      {
        text: 'Why',
        correct: 'Why',
        distractors: ['Who', 'Way', 'White', 'While', 'When'],
      },
      {
        text: 'do',
        correct: 'do',
        distractors: ['due', 'day', 'die', 'door', 'dog'],
      },
      {
        text: 'they',
        correct: 'they',
        distractors: ['them', 'their', 'there', 'those', 'these'],
      },
      {
        text: 'ask',
        correct: 'ask',
        distractors: ['asks', 'asking', 'task', 'mask', 'answer'],
      },
      {
        text: '/for/',
        correct: '/for/',
        distractors: ['from', 'far', 'four', 'forward', 'form'],
      },
      {
        text: 'help',
        correct: 'help',
        distractors: ['helps', 'helping', 'hello', 'health', 'held'],
      },
    ],
  },
  // Phrase 34
  {
    id: 'lesson6_phrase_34',
    english: 'When does he check mail?',
    russian: 'Когда он проверяет почту?',
    ukrainian: 'Коли він перевіряє пошту?',
    words: [
      {
        text: 'When',
        correct: 'When',
        distractors: ['Where', 'Went', 'Want', 'Win', 'West'],
      },
      {
        text: 'does',
        correct: 'does',
        distractors: ['do', 'dose', 'dish', 'dies', 'done'],
      },
      {
        text: 'he',
        correct: 'he',
        distractors: ['his', 'him', 'she', 'hey', 'hi'],
      },
      {
        text: 'check',
        correct: 'check',
        distractors: ['checks', 'checking', 'cheek', 'chess', 'chick'],
      },
      {
        text: 'mail',
        correct: 'mail',
        distractors: ['male', 'main', 'meal', 'mile', 'mall'],
      },
    ],
  },
  // Phrase 35
  {
    id: 'lesson6_phrase_35',
    english: 'How do you find it?',
    russian: 'Как ты это находишь?',
    ukrainian: 'Як ти це знаходиш?',
    words: [
      {
        text: 'How',
        correct: 'How',
        distractors: ['Who', 'Now', 'Low', 'Has', 'His'],
      },
      {
        text: 'do',
        correct: 'do',
        distractors: ['does', 'done', 'did', 'dot', 'dog'],
      },
      {
        text: 'you',
        correct: 'you',
        distractors: ['your', 'yours', 'you're', 'u', 'youth'],
      },
      {
        text: 'find',
        correct: 'find',
        distractors: ['finds', 'finding', 'fine', 'kind', 'mind'],
      },
      {
        text: 'it',
        correct: 'it',
        distractors: ['its', 'in', 'at', 'is', 'if'],
      },
    ],
  },
  // Phrase 37
  {
    id: 'lesson6_phrase_37',
    english: 'Where does he buy groceries?',
    russian: 'Где он покупает продукты?',
    ukrainian: 'Де він купує продукти?',
    words: [
      {
        text: 'Where',
        correct: 'Where',
        distractors: ['Were', 'When', 'What', 'Who', 'Why'],
      },
      {
        text: 'does',
        correct: 'does',
        distractors: ['do', 'dose', 'goes', 'dies', 'done'],
      },
      {
        text: 'he',
        correct: 'he',
        distractors: ['his', 'him', 'she', 'hey', 'hi'],
      },
      {
        text: 'buy',
        correct: 'buy',
        distractors: ['buys', 'buying', 'boy', 'by', 'bought'],
      },
      {
        text: 'groceries',
        correct: 'groceries',
        distractors: ['grocery', 'grass', 'grains', 'green', 'gross'],
      },
    ],
  },
  // Phrase 38
  {
    id: 'lesson6_phrase_38',
    english: 'How do we book it?',
    russian: 'Как мы бронируем это?',
    ukrainian: 'Як ми бронюємо це?',
    words: [
      {
        text: 'How',
        correct: 'How',
        distractors: ['Who', 'Now', 'Low', 'Has', 'His'],
      },
      {
        text: 'do',
        correct: 'do',
        distractors: ['due', 'day', 'die', 'door', 'dog'],
      },
      {
        text: 'we',
        correct: 'we',
        distractors: ['way', 'us', 'our', 'why', 'west'],
      },
      {
        text: 'book',
        correct: 'book',
        distractors: ['books', 'look', 'back', 'box', 'boots'],
      },
      {
        text: 'it',
        correct: 'it',
        distractors: ['its', 'in', 'at', 'is', 'if'],
      },
    ],
  },
  // Phrase 39
  {
    id: 'lesson6_phrase_39',
    english: 'Why does she speak slowly?',
    russian: 'Почему она говорит медленно?',
    ukrainian: 'Чому вона говорить повільно?',
    words: [
      {
        text: 'Why',
        correct: 'Why',
        distractors: ['Who', 'Way', 'White', 'While', 'When'],
      },
      {
        text: 'does',
        correct: 'does',
        distractors: ['do', 'dose', 'dish', 'dies', 'done'],
      },
      {
        text: 'she',
        correct: 'she',
        distractors: ['her', 'see', 'sea', 'shy', 'show'],
      },
      {
        text: 'speak',
        correct: 'speak',
        distractors: ['speaks', 'speaking', 'speech', 'speed', 'spend'],
      },
      {
        text: 'slowly',
        correct: 'slowly',
        distractors: ['slow', 'sleep', 'slot', 'snowy', 'slowlyly'],
      },
    ],
  },
  // Phrase 40
  {
    id: 'lesson6_phrase_40',
    english: 'When do they start /the/ meeting?',
    russian: 'Когда они начинают встречу?',
    ukrainian: 'Коли вони починають зустріч?',
    words: [
      {
        text: 'When',
        correct: 'When',
        distractors: ['Where', 'Went', 'Want', 'Win', 'West'],
      },
      {
        text: 'do',
        correct: 'do',
        distractors: ['does', 'done', 'did', 'dot', 'dog'],
      },
      {
        text: 'they',
        correct: 'they',
        distractors: ['them', 'their', 'there', 'those', 'these'],
      },
      {
        text: 'start',
        correct: 'start',
        distractors: ['starts', 'starting', 'stay', 'star', 'stair'],
      },
      {
        text: '/the/',
        correct: '/the/',
        distractors: ['then', 'than', 'that', 'this', 'thus'],
      },
      {
        text: 'meeting',
        correct: 'meeting',
        distractors: ['meet', 'meat', 'metal', 'meaning', 'melt'],
      },
    ],
  },
  // Phrase 42
  {
    id: 'lesson6_phrase_42',
    english: 'Where do we put luggage?',
    russian: 'Куда мы кладем багаж?',
    ukrainian: 'Куди ми кладемо багаж?',
    words: [
      {
        text: 'Where',
        correct: 'Where',
        distractors: ['Were', 'When', 'What', 'Who', 'Why'],
      },
      {
        text: 'do',
        correct: 'do',
        distractors: ['due', 'day', 'die', 'door', 'dog'],
      },
      {
        text: 'we',
        correct: 'we',
        distractors: ['way', 'us', 'our', 'why', 'west'],
      },
      {
        text: 'put',
        correct: 'put',
        distractors: ['puts', 'putting', 'pull', 'push', 'part'],
      },
      {
        text: 'luggage',
        correct: 'luggage',
        distractors: ['baggage', 'language', 'luggage-y', 'large', 'luck'],
      },
    ],
  },
  // Phrase 43
  {
    id: 'lesson6_phrase_43',
    english: 'How does he find /the/ way?',
    russian: 'Как он находит дорогу?',
    ukrainian: 'Як він знаходить дорогу?',
    words: [
      {
        text: 'How',
        correct: 'How',
        distractors: ['Who', 'Now', 'Low', 'Has', 'His'],
      },
      {
        text: 'does',
        correct: 'does',
        distractors: ['do', 'dose', 'goes', 'dies', 'done'],
      },
      {
        text: 'he',
        correct: 'he',
        distractors: ['his', 'him', 'she', 'hey', 'hi'],
      },
      {
        text: 'find',
        correct: 'find',
        distractors: ['finds', 'finding', 'fine', 'kind', 'mind'],
      },
      {
        text: '/the/',
        correct: '/the/',
        distractors: ['then', 'than', 'that', 'this', 'thus'],
      },
      {
        text: 'way',
        correct: 'way',
        distractors: ['away', 'say', 'pay', 'day', 'why'],
      },
    ],
  },
  // Phrase 44
  {
    id: 'lesson6_phrase_44',
    english: 'Why does she close /the/ window?',
    russian: 'Почему она закрывает окно?',
    ukrainian: 'Чому вона зачиняє вікно?',
    words: [
      {
        text: 'Why',
        correct: 'Why',
        distractors: ['Who', 'Way', 'White', 'While', 'When'],
      },
      {
        text: 'does',
        correct: 'does',
        distractors: ['do', 'dose', 'dish', 'dies', 'done'],
      },
      {
        text: 'she',
        correct: 'she',
        distractors: ['her', 'see', 'sea', 'shy', 'show'],
      },
      {
        text: 'close',
        correct: 'close',
        distractors: ['closes', 'closing', 'class', 'clean', 'chose'],
      },
      {
        text: '/the/',
        correct: '/the/',
        distractors: ['then', 'than', 'that', 'this', 'thus'],
      },
      {
        text: 'window',
        correct: 'window',
        distractors: ['winter', 'windy', 'wind', 'widow', 'yellow'],
      },
    ],
  },
  // Phrase 45
  {
    id: 'lesson6_phrase_45',
    english: 'When do they finish lunch?',
    russian: 'Когда они заканчивают обед?',
    ukrainian: 'Коли вони закінчують обід?',
    words: [
      {
        text: 'When',
        correct: 'When',
        distractors: ['Where', 'Went', 'Want', 'Win', 'West'],
      },
      {
        text: 'do',
        correct: 'do',
        distractors: ['does', 'done', 'did', 'dot', 'dog'],
      },
      {
        text: 'they',
        correct: 'they',
        distractors: ['them', 'their', 'there', 'those', 'these'],
      },
      {
        text: 'finish',
        correct: 'finish',
        distractors: ['finishes', 'finishing', 'fish', 'fine', 'final'],
      },
      {
        text: 'lunch',
        correct: 'lunch',
        distractors: ['launch', 'lunch-y', 'bench', 'bunch', 'punch'],
      },
    ],
  },
  // Phrase 47
  {
    id: 'lesson6_phrase_47',
    english: 'Where does he keep documents?',
    russian: 'Где он хранит документы?',
    ukrainian: 'Де він зберігає документи?',
    words: [
      {
        text: 'Where',
        correct: 'Where',
        distractors: ['Were', 'When', 'What', 'Who', 'Why'],
      },
      {
        text: 'does',
        correct: 'does',
        distractors: ['do', 'dose', 'goes', 'dies', 'done'],
      },
      {
        text: 'he',
        correct: 'he',
        distractors: ['his', 'him', 'she', 'hey', 'hi'],
      },
      {
        text: 'keep',
        correct: 'keep',
        distractors: ['keeps', 'keeping', 'sleep', 'deep', 'keen'],
      },
      {
        text: 'documents',
        correct: 'documents',
        distractors: ['document', 'doctor', 'double', 'dollar', 'during'],
      },
    ],
  },
  // Phrase 48
  {
    id: 'lesson6_phrase_48',
    english: 'How do we check /the/ bill?',
    russian: 'Как мы проверяем счет?',
    ukrainian: 'Як ми перевіряємо рахунок?',
    words: [
      {
        text: 'How',
        correct: 'How',
        distractors: ['Who', 'Now', 'Low', 'Has', 'His'],
      },
      {
        text: 'do',
        correct: 'do',
        distractors: ['due', 'day', 'die', 'door', 'dog'],
      },
      {
        text: 'we',
        correct: 'we',
        distractors: ['way', 'us', 'our', 'why', 'west'],
      },
      {
        text: 'check',
        correct: 'check',
        distractors: ['checks', 'checking', 'chess', 'cheek', 'chicken'],
      },
      {
        text: '/the/',
        correct: '/the/',
        distractors: ['then', 'than', 'that', 'this', 'thus'],
      },
      {
        text: 'bill',
        correct: 'bill',
        distractors: ['ball', 'bell', 'belt', 'bill-y', 'build'],
      },
    ],
  },
  // Phrase 49
  {
    id: 'lesson6_phrase_49',
    english: 'Why does she always help?',
    russian: 'Почему она всегда помогает?',
    ukrainian: 'Чому вона завжди допомагає?',
    words: [
      {
        text: 'Why',
        correct: 'Why',
        distractors: ['Who', 'Way', 'White', 'While', 'When'],
      },
      {
        text: 'does',
        correct: 'does',
        distractors: ['do', 'dose', 'dish', 'dies', 'done'],
      },
      {
        text: 'she',
        correct: 'she',
        distractors: ['her', 'see', 'sea', 'shy', 'show'],
      },
      {
        text: 'always',
        correct: 'always',
        distractors: ['allow', 'away', 'also', 'alone', 'almost'],
      },
      {
        text: 'help',
        correct: 'help',
        distractors: ['helps', 'helping', 'hello', 'health', 'held'],
      },
    ],
  },
  // Phrase 50
  {
    id: 'lesson6_phrase_50',
    english: 'When do they send /the/ confirmation?',
    russian: 'Когда они отправляют подтверждение?',
    ukrainian: 'Коли вони відправляють підтвердження?',
    words: [
      {
        text: 'When',
        correct: 'When',
        distractors: ['Where', 'Went', 'Want', 'Win', 'West'],
      },
      {
        text: 'do',
        correct: 'do',
        distractors: ['does', 'done', 'did', 'dot', 'dog'],
      },
      {
        text: 'they',
        correct: 'they',
        distractors: ['them', 'their', 'there', 'those', 'these'],
      },
      {
        text: 'send',
        correct: 'send',
        distractors: ['sends', 'sending', 'sand', 'sound', 'sent'],
      },
      {
        text: '/the/',
        correct: '/the/',
        distractors: ['then', 'than', 'that', 'this', 'thus'],
      },
      {
        text: 'confirmation',
        correct: 'confirmation',
        distractors: ['confirm', 'information', 'condition', 'conversation', 'configuration'],
      },
    ],
  },
];
