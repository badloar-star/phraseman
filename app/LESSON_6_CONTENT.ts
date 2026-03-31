// ==================== LESSON 6 ====================
// Lesson 6: Special Questions (Where, What, When, Why, How)

const LESSON_6_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    textRU: 'Добро пожаловать в урок 6! Сегодня мы учим специальные вопросы — Where, What, When, Why, How. Это ключ к настоящему диалогу. Когда вы можете задать вопрос, вы можете начать разговор!',
    textUK: 'Добро пожалувати на урок 6! Сьогодні ми вчимо спеціальні питання — Where, What, When, Why, How. Це ключ до справжнього діалогу. Коли ви можете поставити питання, ви можете почати розмову!',
  },
  {
    textRU: 'Формула проста: вопросительное слово + do/does + подлежащее + глагол. Where do you work? When does she call? Главное — выбрать правильное вспомогательное слово!',
    textUK: 'Формула проста: питальне слово + do/does + підмет + дієслово. Where do you work? When does she call? Головне — вибрати правильне допоміжне дієслово!',
  },
  {
    textRU: 'С этими вопросами ты сможешь узнать всё о других людях. Практикуйся, и вскоре вопросы будут потоком изо рта. Поехали! 🚀',
    textUK: 'З цими питаннями ти зможеш дізнатися все про інших людей. Практикуйся, і незабаром питання будуть потоком з уст. Поїхали! 🚀',
  },
];

const LESSON_6_ENCOURAGEMENT_SCREENS: LessonIntroScreen[] = [
  {
    textRU: 'Отлично! Ты уже начинаешь думать на английском!',
    textUK: 'Чудово! Ти вже починаєш думати англійською!',
  },
  {
    textRU: 'Замечание правильного порядка слов в вопросе — это большой шаг вперед! Продолжай в том же духе!',
    textUK: 'Помітити правильний порядок слів у питанні — це великий крок вперед! Продовжуй в тому ж дусі!',
  },
  {
    textRU: 'С каждой правильной фразой ты становишься всё ближе к свободному английскому. Так держать! ⚡',
    textUK: 'З кожною правильною фразою ти стаєш все ближче до вільної англійської. Так тримати! ⚡',
  },
];

const LESSON_6_PHRASES: LessonPhrase[] = [
  { id: 'lesson6_phrase_1', english: 'Where do you live?', russian: 'Где ты живешь?', ukrainian: 'Де ти живеш?', words: [{ text: 'Where', correct: 'Where', distractors: ['When', 'What', 'Were', 'Who', 'Why'] }, { text: 'do', correct: 'do', distractors: ['does', 'done', 'did', 'dot', 'dog'] }, { text: 'you', correct: 'you', distractors: ['your', 'yours', 'you\'re', 'u', 'youth'] }, { text: 'live?', correct: 'live?', distractors: ['lives', 'living', 'life', 'leaf', 'leave'] }] },
  { id: 'lesson6_phrase_2', english: 'What does he eat?', russian: 'Что он ест?', ukrainian: 'Що він їсть?', words: [{ text: 'What', correct: 'What', distractors: ['Wait', 'Want', 'White', 'When', 'Which'] }, { text: 'does', correct: 'does', distractors: ['do', 'dose', 'goes', 'dies', 'done'] }, { text: 'he', correct: 'he', distractors: ['his', 'him', 'she', 'hey', 'hi'] }, { text: 'eat?', correct: 'eat?', distractors: ['eats', 'eating', 'ate', 'ears', 'east'] }] },
  { id: 'lesson6_phrase_3', english: 'When do we start?', russian: 'Когда мы начинаем?', ukrainian: 'Коли ми починаємо?', words: [{ text: 'When', correct: 'When', distractors: ['Where', 'Went', 'Want', 'Win', 'West'] }, { text: 'do', correct: 'do', distractors: ['does', 'done', 'did', 'dot', 'dog'] }, { text: 'we', correct: 'we', distractors: ['way', 'us', 'our', 'why', 'west'] }, { text: 'start?', correct: 'start?', distractors: ['starts', 'starting', 'stay', 'star', 'stair'] }] },
  { id: 'lesson6_phrase_4', english: 'Why does she cry?', russian: 'Почему она плачет?', ukrainian: 'Чому вона плаче?', words: [{ text: 'Why', correct: 'Why', distractors: ['Who', 'Way', 'White', 'While', 'When'] }, { text: 'does', correct: 'does', distractors: ['do', 'dose', 'dies', 'done', 'dish'] }, { text: 'she', correct: 'she', distractors: ['her', 'see', 'sea', 'shy', 'show'] }, { text: 'cry?', correct: 'cry?', distractors: ['cries', 'crying', 'dry', 'try', 'fly'] }] },
  { id: 'lesson6_phrase_5', english: 'How do they work?', russian: 'Как они работают?', ukrainian: 'Як вони працюють?', words: [{ text: 'How', correct: 'How', distractors: ['Who', 'Now', 'Low', 'Hey', 'Has'] }, { text: 'do', correct: 'do', distractors: ['does', 'done', 'did', 'dot', 'dog'] }, { text: 'they', correct: 'they', distractors: ['them', 'their', 'there', 'those', 'these'] }, { text: 'work?', correct: 'work?', distractors: ['works', 'working', 'worker', 'word', 'walk'] }] },
  { id: 'lesson6_phrase_6', english: 'How much does it cost?', russian: 'Сколько это стоит?', ukrainian: 'Скільки це коштує?', words: [{ text: 'How', correct: 'How', distractors: ['Who', 'Now', 'Low', 'Has', 'His'] }, { text: 'much', correct: 'much', distractors: ['many', 'match', 'must', 'such', 'march'] }, { text: 'does', correct: 'does', distractors: ['do', 'dose', 'goes', 'dies', 'done'] }, { text: 'it', correct: 'it', distractors: ['its', 'in', 'at', 'is', 'if'] }, { text: 'cost?', correct: 'cost?', distractors: ['costs', 'coast', 'cast', 'cash', 'cold'] }] },
  { id: 'lesson6_phrase_7', english: 'What do you drink?', russian: 'Что ты пьешь?', ukrainian: 'Що ти п\'єш?', words: [{ text: 'What', correct: 'What', distractors: ['Wait', 'Want', 'White', 'When', 'Which'] }, { text: 'do', correct: 'do', distractors: ['does', 'done', 'did', 'dot', 'dog'] }, { text: 'you', correct: 'you', distractors: ['your', 'yours', 'you\'re', 'u', 'youth'] }, { text: 'drink?', correct: 'drink?', distractors: ['drinks', 'drinking', 'drunk', 'dress', 'dream'] }] },
  { id: 'lesson6_phrase_8', english: 'Where do they buy tickets?', russian: 'Где они покупают билеты?', ukrainian: 'Де вони купують квитки?', words: [{ text: 'Where', correct: 'Where', distractors: ['Were', 'When', 'What', 'Who', 'Why'] }, { text: 'do', correct: 'do', distractors: ['does', 'done', 'did', 'dot', 'dog'] }, { text: 'they', correct: 'they', distractors: ['them', 'their', 'there', 'those', 'these'] }, { text: 'buy', correct: 'buy', distractors: ['buys', 'buying', 'boy', 'by', 'bought'] }, { text: 'tickets?', correct: 'tickets?', distractors: ['ticket', 'thicket', 'tricks', 'takes', 'tastes'] }] },
  { id: 'lesson6_phrase_9', english: 'When does she call?', russian: 'Когда она звонит?', ukrainian: 'Коли вона телефонує?', words: [{ text: 'When', correct: 'When', distractors: ['Where', 'Went', 'Want', 'Win', 'West'] }, { text: 'does', correct: 'does', distractors: ['do', 'dose', 'dies', 'done', 'dish'] }, { text: 'she', correct: 'she', distractors: ['her', 'see', 'sea', 'shy', 'show'] }, { text: 'call?', correct: 'call?', distractors: ['calls', 'calling', 'ball', 'tall', 'cell'] }] },
  { id: 'lesson6_phrase_10', english: 'Why do we wait?', russian: 'Почему мы ждем?', ukrainian: 'Чому ми чекаємо?', words: [{ text: 'Why', correct: 'Why', distractors: ['Who', 'Way', 'White', 'While', 'When'] }, { text: 'do', correct: 'do', distractors: ['does', 'done', 'did', 'dot', 'dog'] }, { text: 'we', correct: 'we', distractors: ['way', 'us', 'our', 'why', 'west'] }, { text: 'wait?', correct: 'wait?', distractors: ['waits', 'waiting', 'want', 'went', 'wet'] }] },
];
