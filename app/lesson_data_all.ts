// Lesson Data with Per-Word Distractors
// Each phrase has exact distractors per word (not random pools)

export interface LessonWord {
  text: string;           // The word
  correct: string;        // Same as text (for validation)
  distractors: string[];  // 5 specific distractors
  category?: string;      // 'pronoun', 'to-be', 'article', etc.
}

export interface LessonPhrase {
  id: string;
  english: string;
  russian: string;
  ukrainian: string;
  words: LessonWord[];
}

export interface LessonIntroScreen {
  textRU: string;
  textUK: string;
}

export interface LessonData {
  id: number;
  titleRU: string;
  titleUK: string;
  introScreens: LessonIntroScreen[];
  phrases: LessonPhrase[];
}

// ==================== LESSON 1 ====================

const LESSON_1_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    textRU: 'Рад тебе! Забудь о скучных учебниках. Сегодня мы просто поиграем в конструктор: соберем твои первые фразы на английском легко и с удовольствием.',
    textUK: 'Радий тебе! Забудь про нудні підручники. Сьогодні ми просто пограємось в конструктор: зберемо твої перші фрази англійською легко й з задоволенням.',
  },
  {
    textRU: 'Главная фишка: в английском всегда нужен «глагол-двигатель». Там, где мы молчим, они говорят am, is или are. Это как связующий клей для слов.',
    textUK: 'Головна фішка: в англійській завжди потрібний «дієслово-двигун». Там, де ми мовчимо, вони кажуть am, is або are. Це як в\'яжучий клей для слів.',
  },
  {
    textRU: 'Наша формула успеха: Кто + Связка + артикль + Слово. Расслабься, у тебя всё получится. Погнали! ⚡️',
    textUK: 'Наша формула успіху: Хто + Зв\'язка + артикль + Слово. Розслабся, у тебе все вийде. Поїхали! ⚡️',
  },
];

const LESSON_1_ENCOURAGEMENT_SCREENS: LessonIntroScreen[] = [
  {
    textRU: 'Идем на взлет! ✈️',
    textUK: 'Йдемо на злет! ✈️',
  },
  {
    textRU: 'Ты на правильном пути! Заметил, как фразы складываются сами собой? Это и есть магия практики. Главное — не давай дистракторам себя запутать.',
    textUK: 'Ти на правильному шляху! Помітив, як фрази складаються самі по собі? Це і є магія практики. Головне — не дай дистракторам себе збити з толку.',
  },
  {
    textRU: 'Сейчас мы добавим слова, которые сделают твою речь солиднее. Принцип тот же: Кто + am/is/are + слово. Расслабься и получай удовольствие от процесса!',
    textUK: 'Зараз ми додамо слова, які зроблять твоє мовлення більш солідним. Принцип той самий: Хто + am/is/are + слово. Розслабся й отримуй задоволення від процесу!',
  },
];

const LESSON_1_PHRASES: LessonPhrase[] = [
  // 1-5
  {
    id: 'lesson1_phrase_1',
    english: 'I am here',
    russian: 'Я здесь',
    ukrainian: 'Я тут',
    words: [
      { text: 'I', correct: 'I', distractors: ['me', 'my', 'mine', 'eye', 'hi'], category: 'pronoun' },
      { text: 'am', correct: 'am', distractors: ['is', 'are', 'be', 'been', 'being'], category: 'to-be' },
      { text: 'here', correct: 'here', distractors: ['hear', 'her', 'there', 'where', 'hair'], category: 'adverb' },
    ],
  },
  {
    id: 'lesson1_phrase_2',
    english: 'You are ready',
    russian: 'Ты готов',
    ukrainian: 'Ти готовий',
    words: [
      { text: 'You', correct: 'You', distractors: ['your', "yells", 'yours', 'u', 'youth'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'air', 'arm'], category: 'to-be' },
      { text: 'ready', correct: 'ready', distractors: ['read', 'red', 'road', 'real', 'already'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson1_phrase_3',
    english: 'He is busy',
    russian: 'Он занят',
    ukrainian: 'Він зайнятий',
    words: [
      { text: 'He', correct: 'He', distractors: ['his', 'him', 'she', 'hey', 'hi'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'busy', correct: 'busy', distractors: ['bus', 'business', 'bossy', 'buy', 'easy'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson1_phrase_4',
    english: 'She is home',
    russian: 'Она дома',
    ukrainian: 'Вона вдома',
    words: [
      { text: 'She', correct: 'She', distractors: ['her', 'see', 'sea', 'shy', 'show'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'in', 'it', 'if'], category: 'to-be' },
      { text: 'home', correct: 'home', distractors: ['house', 'hope', 'hole', 'horse', 'ham'], category: 'noun' },
    ],
  },
  {
    id: 'lesson1_phrase_5',
    english: 'We are together',
    russian: 'Мы вместе',
    ukrainian: 'Ми разом',
    words: [
      { text: 'We', correct: 'We', distractors: ['way', 'us', 'our', 'west', 'wet'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'age', 'ate'], category: 'to-be' },
      { text: 'together', correct: 'together', distractors: ['weather', 'tomorrow', 'gather', 'today', 'togezer'], category: 'adverb' },
    ],
  },
  // 6-10
  {
    id: 'lesson1_phrase_6',
    english: 'They are here',
    russian: 'Они здесь',
    ukrainian: 'Вони тут',
    words: [
      { text: 'They', correct: 'They', distractors: ['Them', 'Their', 'There', 'This', 'That'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'air', 'arm', 'art'], category: 'to-be' },
      { text: 'here', correct: 'here', distractors: ['hear', 'her', 'heir', 'hair', 'there'], category: 'adverb' },
    ],
  },
  {
    id: 'lesson1_phrase_7',
    english: 'It is important',
    russian: 'Это важно',
    ukrainian: 'Це важливо',
    words: [
      { text: 'It', correct: 'It', distractors: ['Its', 'Eat', 'In', 'At', 'If'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'important', correct: 'important', distractors: ['import', 'improve', 'imagine', 'impact', 'impose'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson1_phrase_8',
    english: 'I am okay',
    russian: 'Я в порядке',
    ukrainian: 'Я в порядку',
    words: [
      { text: 'I', correct: 'I', distractors: ['me', 'my', 'eye', 'high', 'mine'], category: 'pronoun' },
      { text: 'am', correct: 'am', distractors: ['is', 'are', 'be', 'being', 'been'], category: 'to-be' },
      { text: 'okay', correct: 'okay', distractors: ['oak', 'key', 'obey', 'ocean', 'only'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson1_phrase_9',
    english: 'You are right',
    russian: 'Вы правы',
    ukrainian: 'Ви праві',
    words: [
      { text: 'You', correct: 'You', distractors: ['your', "yells", 'u', 'youth', 'year'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'air', 'arm'], category: 'to-be' },
      { text: 'right', correct: 'right', distractors: ['write', 'light', 'night', 'bright', 'ride'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson1_phrase_10',
    english: 'We are safe',
    russian: 'Мы в безопасности',
    ukrainian: 'Ми в безпеці',
    words: [
      { text: 'We', correct: 'We', distractors: ['way', 'us', 'our', 'why', 'wet'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'age', 'ate'], category: 'to-be' },
      { text: 'safe', correct: 'safe', distractors: ['save', 'soft', 'self', 'side', 'salt'], category: 'adjective' },
    ],
  },
  // 11-15
  {
    id: 'lesson1_phrase_11',
    english: 'He is sick',
    russian: 'Он болен',
    ukrainian: 'Він хворий',
    words: [
      { text: 'He', correct: 'He', distractors: ['His', 'Him', 'She', 'Hey', 'Hi'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'sick', correct: 'sick', distractors: ['silk', 'sock', 'suck', 'sink', 'sicky'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson1_phrase_12',
    english: 'It is cheap',
    russian: 'Это дешево',
    ukrainian: 'Це дешево',
    words: [
      { text: 'It', correct: 'It', distractors: ['Its', 'Eat', 'In', 'At', 'If'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'cheap', correct: 'cheap', distractors: ['chip', 'check', 'chess', 'chief', 'chop'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson1_phrase_13',
    english: 'We are here',
    russian: 'Мы здесь',
    ukrainian: 'Ми тут',
    words: [
      { text: 'We', correct: 'We', distractors: ['Way', 'Us', 'Our', 'Why', 'Wet'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'air', 'arm'], category: 'to-be' },
      { text: 'here', correct: 'here', distractors: ['hear', 'her', 'heir', 'hair', 'there'], category: 'adverb' },
    ],
  },
  {
    id: 'lesson1_phrase_14',
    english: 'She is upset',
    russian: 'Она расстроена',
    ukrainian: 'Вона засмучена',
    words: [
      { text: 'She', correct: 'She', distractors: ['Sea', 'See', 'Shy', 'Shell', 'Show'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'in', 'it', 'if'], category: 'to-be' },
      { text: 'upset', correct: 'upset', distractors: ['update', 'upper', 'upward', 'useful', 'upsetted'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson1_phrase_15',
    english: 'You are late',
    russian: 'Вы опоздали',
    ukrainian: 'Ви спізнилися',
    words: [
      { text: 'You', correct: 'You', distractors: ['Your', "You're", 'U', 'Youth', 'Year'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'age', 'ate'], category: 'to-be' },
      { text: 'late', correct: 'late', distractors: ['let', 'light', 'last', 'lake', 'lady'], category: 'adjective' },
    ],
  },
  // 16-20
  {
    id: 'lesson1_phrase_16',
    english: 'I am at work',
    russian: 'Я на работе',
    ukrainian: 'Я на роботі',
    words: [
      { text: 'I', correct: 'I', distractors: ['me', 'my', 'mine', 'eye', 'hi'], category: 'pronoun' },
      { text: 'am', correct: 'am', distractors: ['is', 'are', 'be', 'been', 'being'], category: 'to-be' },
      { text: 'at', correct: 'at', distractors: ['to', 'in', 'on', 'of', 'by'], category: 'preposition' },
      { text: 'work', correct: 'work', distractors: ['word', 'walk', 'week', 'wake', 'world'], category: 'noun' },
    ],
  },
  {
    id: 'lesson1_phrase_17',
    english: 'We are on the way',
    russian: 'Мы в пути',
    ukrainian: 'Ми в дорозі',
    words: [
      { text: 'We', correct: 'We', distractors: ['Way', 'Us', 'Our', 'Why', 'Wet'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'air', 'arm'], category: 'to-be' },
      { text: 'on', correct: 'on', distractors: ['in', 'at', 'of', 'to', 'by'], category: 'preposition' },
      { text: 'the', correct: 'the', distractors: ['those', 'these', 'through', 'though', 'thought'], category: 'article' },
      { text: 'way', correct: 'way', distractors: ['wait', 'weight', 'why', 'away', 'wave'], category: 'noun' },
    ],
  },
  {
    id: 'lesson1_phrase_18',
    english: 'They are in the car',
    russian: 'Они в машине',
    ukrainian: 'Вони в машині',
    words: [
      { text: 'They', correct: 'They', distractors: ['Them', 'Their', 'There', 'This', 'That'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'air', 'arm', 'art'], category: 'to-be' },
      { text: 'in', correct: 'in', distractors: ['on', 'at', 'of', 'to', 'by'], category: 'preposition' },
      { text: 'the', correct: 'the', distractors: ['then', 'than', 'that', 'this', 'thus'], category: 'article' },
      { text: 'car', correct: 'car', distractors: ['cat', 'can', 'care', 'card', 'case'], category: 'noun' },
    ],
  },
  {
    id: 'lesson1_phrase_19',
    english: 'She is on holiday',
    russian: 'Она в отпуске',
    ukrainian: 'Вона у відпустці',
    words: [
      { text: 'She', correct: 'She', distractors: ['sea', 'see', 'shy', 'shell', 'show'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'in', 'it', 'if'], category: 'to-be' },
      { text: 'on', correct: 'on', distractors: ['in', 'at', 'of', 'to', 'by'], category: 'preposition' },
      { text: 'holiday', correct: 'holiday', distractors: ['holy', 'hollow', 'holly', 'holder', 'holidaying'], category: 'noun' },
    ],
  },
  {
    id: 'lesson1_phrase_20',
    english: 'It is free',
    russian: 'Это бесплатно',
    ukrainian: 'Це безкоштовно',
    words: [
      { text: 'It', correct: 'It', distractors: ['its', 'eat', 'in', 'at', 'if'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'free', correct: 'free', distractors: ['tree', 'fry', 'feel', 'fire', 'four'], category: 'adjective' },
    ],
  },
  // 21-25
  {
    id: 'lesson1_phrase_21',
    english: 'I am in the line',
    russian: 'Я в очереди',
    ukrainian: 'Я в черзі',
    words: [
      { text: 'I', correct: 'I', distractors: ['me', 'my', 'eye', 'high', 'mine'], category: 'pronoun' },
      { text: 'am', correct: 'am', distractors: ['is', 'are', 'be', 'being', 'been'], category: 'to-be' },
      { text: 'in', correct: 'in', distractors: ['on', 'at', 'of', 'to', 'by'], category: 'preposition' },
      { text: 'the', correct: 'the', distractors: ['then', 'than', 'that', 'this', 'thus'], category: 'article' },
      { text: 'line', correct: 'line', distractors: ['lane', 'lion', 'lie', 'life', 'light'], category: 'noun' },
    ],
  },
  {
    id: 'lesson1_phrase_22',
    english: 'We are in the elevator',
    russian: 'Мы в лифте',
    ukrainian: 'Ми в ліфті',
    words: [
      { text: 'We', correct: 'We', distractors: ['way', 'us', 'our', 'why', 'wet'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'age', 'ate'], category: 'to-be' },
      { text: 'in', correct: 'in', distractors: ['out', 'for', 'with', 'from', 'about'], category: 'preposition' },
      { text: 'the', correct: 'the', distractors: ['these', 'those', 'through', 'though', 'thought'], category: 'article' },
      { text: 'elevator', correct: 'elevator', distractors: ['elephant', 'element', 'electric', 'elevate', 'eleven'], category: 'noun' },
    ],
  },
  {
    id: 'lesson1_phrase_23',
    english: 'He is in the kitchen',
    russian: 'Он на кухне',
    ukrainian: 'Він на кухні',
    words: [
      { text: 'He', correct: 'He', distractors: ['hi', 'his', 'her', 'here', 'hey'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'in', correct: 'in', distractors: ['up', 'down', 'near', 'far', 'back'], category: 'preposition' },
      { text: 'the', correct: 'the', distractors: ['they', 'their', 'there', 'them', 'then'], category: 'article' },
      { text: 'kitchen', correct: 'kitchen', distractors: ['chicken', 'kitten', 'kitchener', 'kicker', 'kitch'], category: 'noun' },
    ],
  },
  {
    id: 'lesson1_phrase_24',
    english: 'You are very kind',
    russian: 'Ты очень добрый',
    ukrainian: 'Ти дуже добрий',
    words: [
      { text: 'You', correct: 'You', distractors: ['your', "yells", 'u', 'youth', 'year'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'air', 'arm'], category: 'to-be' },
      { text: 'very', correct: 'very', distractors: ['vary', 'every', 'valley', 'view', 'victory'], category: 'adverb' },
      { text: 'kind', correct: 'kind', distractors: ['king', 'kids', 'kiss', 'kill', 'mind'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson1_phrase_25',
    english: 'It is urgent',
    russian: 'Это срочно',
    ukrainian: 'Це терміново',
    words: [
      { text: 'It', correct: 'It', distractors: ['its', 'eat', 'in', 'at', 'if'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'urgent', correct: 'urgent', distractors: ['agent', 'urban', 'uncle', 'until', 'useful'], category: 'adjective' },
    ],
  },
  // 26-30
  {
    id: 'lesson1_phrase_26',
    english: 'I am shocked',
    russian: 'Я в шоке',
    ukrainian: 'Я в шоці',
    words: [
      { text: 'I', correct: 'I', distractors: ['me', 'my', 'mine', 'eye', 'hi'], category: 'pronoun' },
      { text: 'am', correct: 'am', distractors: ['is', 'are', 'be', 'been', 'being'], category: 'to-be' },
      { text: 'shocked', correct: 'shocked', distractors: ['shock', 'shake', 'shark', 'short', 'sharp'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson1_phrase_27',
    english: 'We are in the taxi',
    russian: 'Мы в такси',
    ukrainian: 'Ми в таксі',
    words: [
      { text: 'We', correct: 'We', distractors: ['way', 'us', 'our', 'west', 'wet'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'age', 'ate'], category: 'to-be' },
      { text: 'in', correct: 'in', distractors: ['on', 'at', 'of', 'to', 'by'], category: 'preposition' },
      { text: 'the', correct: 'the', distractors: ['then', 'than', 'that', 'this', 'thus'], category: 'article' },
      { text: 'taxi', correct: 'taxi', distractors: ['tax', 'text', 'task', 'axis', 'take'], category: 'noun' },
    ],
  },
  {
    id: 'lesson1_phrase_28',
    english: 'She is married',
    russian: 'Она замужем',
    ukrainian: 'Вона заміжня',
    words: [
      { text: 'She', correct: 'She', distractors: ['her', 'see', 'sea', 'shy', 'show'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'married', correct: 'married', distractors: ['marry', 'marriage', 'mirror', 'merry', 'market'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson1_phrase_29',
    english: 'You are safe',
    russian: 'Ты в безопасности',
    ukrainian: 'Ти в безпеці',
    words: [
      { text: 'You', correct: 'You', distractors: ['your', "yells", 'yours', 'u', 'youth'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'air', 'arm'], category: 'to-be' },
      { text: 'safe', correct: 'safe', distractors: ['save', 'salt', 'self', 'soft', 'side'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson1_phrase_30',
    english: 'They are outside',
    russian: 'Они на улице',
    ukrainian: 'Вони на вулиці',
    words: [
      { text: 'They', correct: 'They', distractors: ['them', 'their', 'there', 'those', 'these'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'air', 'arm', 'art'], category: 'to-be' },
      { text: 'outside', correct: 'outside', distractors: ['out', 'side', 'inside', 'outfit', 'outdoor'], category: 'adverb' },
    ],
  },
  // 31-35
  {
    id: 'lesson1_phrase_31',
    english: 'I am at the airport',
    russian: 'Я в аэропорту',
    ukrainian: 'Я в аеропорту',
    words: [
      { text: 'I', correct: 'I', distractors: ['me', 'my', 'mine', 'eye', 'hi'], category: 'pronoun' },
      { text: 'am', correct: 'am', distractors: ['is', 'are', 'be', 'been', 'being'], category: 'to-be' },
      { text: 'at', correct: 'at', distractors: ['to', 'in', 'on', 'of', 'by'], category: 'preposition' },
      { text: 'the', correct: 'the', distractors: ['then', 'than', 'that', 'this', 'thus'], category: 'article' },
      { text: 'airport', correct: 'airport', distractors: ['airplane', 'air', 'port', 'support', 'report'], category: 'noun' },
    ],
  },
  {
    id: 'lesson1_phrase_32',
    english: 'We are on the train',
    russian: 'Мы в поезде',
    ukrainian: 'Ми в поїзді',
    words: [
      { text: 'We', correct: 'We', distractors: ['way', 'us', 'our', 'west', 'wet'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'age', 'ate'], category: 'to-be' },
      { text: 'on', correct: 'on', distractors: ['in', 'at', 'of', 'to', 'by'], category: 'preposition' },
      { text: 'the', correct: 'the', distractors: ['those', 'these', 'through', 'though', 'thought'], category: 'article' },
      { text: 'train', correct: 'train', distractors: ['rain', 'brain', 'travel', 'trail', 'training'], category: 'noun' },
    ],
  },
  {
    id: 'lesson1_phrase_33',
    english: 'He is in the bathroom',
    russian: 'Он в ванной',
    ukrainian: 'Він у ванній',
    words: [
      { text: 'He', correct: 'He', distractors: ['his', 'him', 'she', 'hey', 'hi'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'in', correct: 'in', distractors: ['up', 'down', 'near', 'far', 'back'], category: 'preposition' },
      { text: 'the', correct: 'the', distractors: ['they', 'their', 'there', 'them', 'then'], category: 'article' },
      { text: 'bathroom', correct: 'bathroom', distractors: ['bedroom', 'bath', 'room', 'board', 'broom'], category: 'noun' },
    ],
  },
  {
    id: 'lesson1_phrase_34',
    english: 'You are right',
    russian: 'Ты прав',
    ukrainian: 'Ти правий',
    words: [
      { text: 'You', correct: 'You', distractors: ['your', "yells", 'yours', 'u', 'youth'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'air', 'arm'], category: 'to-be' },
      { text: 'right', correct: 'right', distractors: ['write', 'light', 'night', 'bright', 'ride'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson1_phrase_35',
    english: 'She is at the shop',
    russian: 'Она в магазине',
    ukrainian: 'Вона в магазині',
    words: [
      { text: 'She', correct: 'She', distractors: ['her', 'see', 'sea', 'shy', 'show'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'in', 'it', 'if'], category: 'to-be' },
      { text: 'at', correct: 'at', distractors: ['to', 'in', 'on', 'of', 'by'], category: 'preposition' },
      { text: 'the', correct: 'the', distractors: ['those', 'these', 'through', 'though', 'thought'], category: 'article' },
      { text: 'shop', correct: 'shop', distractors: ['ship', 'stop', 'sheep', 'shopify', 'sharp'], category: 'noun' },
    ],
  },
  // 36-40
  {
    id: 'lesson1_phrase_36',
    english: 'I am in the gym',
    russian: 'Я в спортзале',
    ukrainian: 'Я у спортзалі',
    words: [
      { text: 'I', correct: 'I', distractors: ['me', 'my', 'eye', 'high', 'mine'], category: 'pronoun' },
      { text: 'am', correct: 'am', distractors: ['is', 'are', 'be', 'being', 'been'], category: 'to-be' },
      { text: 'in', correct: 'in', distractors: ['on', 'at', 'of', 'to', 'by'], category: 'preposition' },
      { text: 'the', correct: 'the', distractors: ['then', 'than', 'that', 'this', 'thus'], category: 'article' },
      { text: 'gym', correct: 'gym', distractors: ['game', 'gum', 'gem', 'guy', 'gymnasium'], category: 'noun' },
    ],
  },
  {
    id: 'lesson1_phrase_37',
    english: 'We are on the bus',
    russian: 'Мы в автобусе',
    ukrainian: 'Ми в автобусі',
    words: [
      { text: 'We', correct: 'We', distractors: ['way', 'us', 'our', 'west', 'wet'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'age', 'ate'], category: 'to-be' },
      { text: 'on', correct: 'on', distractors: ['in', 'at', 'of', 'to', 'by'], category: 'preposition' },
      { text: 'the', correct: 'the', distractors: ['those', 'these', 'through', 'though', 'thought'], category: 'article' },
      { text: 'bus', correct: 'bus', distractors: ['boss', 'base', 'busy', 'buy', 'bust'], category: 'noun' },
    ],
  },
  {
    id: 'lesson1_phrase_38',
    english: 'It is near',
    russian: 'Это рядом',
    ukrainian: 'Це поруч',
    words: [
      { text: 'It', correct: 'It', distractors: ['its', 'eat', 'in', 'at', 'if'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'near', correct: 'near', distractors: ['next', 'neat', 'nearly', 'narrow', 'night'], category: 'adverb' },
    ],
  },
  {
    id: 'lesson1_phrase_39',
    english: 'They are desperate',
    russian: 'Они в отчаянии',
    ukrainian: 'Вони у розпачі',
    words: [
      { text: 'They', correct: 'They', distractors: ['them', 'their', 'there', 'those', 'these'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'air', 'arm', 'art'], category: 'to-be' },
      { text: 'desperate', correct: 'desperate', distractors: ['deep', 'desert', 'depend', 'despite', 'depart'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson1_phrase_40',
    english: 'You are on the list',
    russian: 'Вы в списке',
    ukrainian: 'Ви у списку',
    words: [
      { text: 'You', correct: 'You', distractors: ['your', "yells", 'yours', 'u', 'youth'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'air', 'arm'], category: 'to-be' },
      { text: 'on', correct: 'on', distractors: ['in', 'at', 'of', 'to', 'by'], category: 'preposition' },
      { text: 'the', correct: 'the', distractors: ['then', 'than', 'that', 'this', 'thus'], category: 'article' },
      { text: 'list', correct: 'list', distractors: ['lost', 'last', 'least', 'listen', 'light'], category: 'noun' },
    ],
  },
  // 41-45
  {
    id: 'lesson1_phrase_41',
    english: 'I am at the pharmacy',
    russian: 'Я в аптеке',
    ukrainian: 'Я в аптеці',
    words: [
      { text: 'I', correct: 'I', distractors: ['me', 'my', 'eye', 'hi', 'mine'], category: 'pronoun' },
      { text: 'am', correct: 'am', distractors: ['is', 'are', 'be', 'been', 'being'], category: 'to-be' },
      { text: 'at', correct: 'at', distractors: ['to', 'in', 'on', 'of', 'by'], category: 'preposition' },
      { text: 'the', correct: 'the', distractors: ['then', 'than', 'that', 'this', 'thus'], category: 'article' },
      { text: 'pharmacy', correct: 'pharmacy', distractors: ['farmer', 'factory', 'phone', 'physics', 'primary'], category: 'noun' },
    ],
  },
  {
    id: 'lesson1_phrase_42',
    english: 'She is at the airport',
    russian: 'Она в аэропорту',
    ukrainian: 'Вона в аеропорту',
    words: [
      { text: 'She', correct: 'She', distractors: ['her', 'see', 'sea', 'shy', 'show'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'at', correct: 'at', distractors: ['to', 'in', 'on', 'of', 'by'], category: 'preposition' },
      { text: 'the', correct: 'the', distractors: ['those', 'these', 'through', 'though', 'thought'], category: 'article' },
      { text: 'airport', correct: 'airport', distractors: ['airplane', 'air', 'port', 'support', 'report'], category: 'noun' },
    ],
  },
  {
    id: 'lesson1_phrase_43',
    english: 'We are abroad',
    russian: 'Мы за границей',
    ukrainian: 'Ми за кордоном',
    words: [
      { text: 'We', correct: 'We', distractors: ['way', 'us', 'our', 'west', 'wet'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'age', 'ate'], category: 'to-be' },
      { text: 'abroad', correct: 'abroad', distractors: ['board', 'broad', 'about', 'above', 'road'], category: 'adverb' },
    ],
  },
  {
    id: 'lesson1_phrase_44',
    english: 'You are safe',
    russian: 'Вы в безопасности',
    ukrainian: 'Ви в безпеці',
    words: [
      { text: 'You', correct: 'You', distractors: ['your', "yells", 'yours', 'u', 'youth'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'air', 'arm'], category: 'to-be' },
      { text: 'safe', correct: 'safe', distractors: ['save', 'salt', 'self', 'soft', 'side'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson1_phrase_45',
    english: 'It is broken',
    russian: 'Это сломанно',
    ukrainian: 'Це зламано',
    words: [
      { text: 'It', correct: 'It', distractors: ['its', 'eat', 'in', 'at', 'if'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'broken', correct: 'broken', distractors: ['break', 'broke', 'brake', 'brokeh', 'broke-in'], category: 'adjective' },
    ],
  },
  // 46-50
  {
    id: 'lesson1_phrase_46',
    english: 'I am shocked',
    russian: 'Я в шоке',
    ukrainian: 'Я в шоці',
    words: [
      { text: 'I', correct: 'I', distractors: ['me', 'my', 'high', 'mine', 'eye'], category: 'pronoun' },
      { text: 'am', correct: 'am', distractors: ['is', 'are', 'be', 'been', 'being'], category: 'to-be' },
      { text: 'shocked', correct: 'shocked', distractors: ['shock', 'shark', 'shake', 'short', 'sharp'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson1_phrase_47',
    english: 'We are in the taxi',
    russian: 'Мы в такси',
    ukrainian: 'Ми в таксі',
    words: [
      { text: 'We', correct: 'We', distractors: ['way', 'us', 'our', 'west', 'wet'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'age', 'ate'], category: 'to-be' },
      { text: 'in', correct: 'in', distractors: ['on', 'at', 'of', 'to', 'by'], category: 'preposition' },
      { text: 'the', correct: 'the', distractors: ['then', 'than', 'that', 'this', 'thus'], category: 'article' },
      { text: 'taxi', correct: 'taxi', distractors: ['tax', 'text', 'task', 'axis', 'take'], category: 'noun' },
    ],
  },
  {
    id: 'lesson1_phrase_48',
    english: 'He is outside',
    russian: 'Он на улице',
    ukrainian: 'Він на вулиці',
    words: [
      { text: 'He', correct: 'He', distractors: ['hi', 'his', 'her', 'here', 'hey'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'outside', correct: 'outside', distractors: ['out', 'side', 'inside', 'outdoor', 'outfit'], category: 'adverb' },
    ],
  },
  {
    id: 'lesson1_phrase_49',
    english: 'It is empty',
    russian: 'Это пустое',
    ukrainian: 'Це порожнє',
    words: [
      { text: 'It', correct: 'It', distractors: ['its', 'eat', 'in', 'at', 'if'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'empty', correct: 'empty', distractors: ['entry', 'enemy', 'early', 'every', 'enjoy'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson1_phrase_50',
    english: 'They are desperate',
    russian: 'Они в отчаянии',
    ukrainian: 'Вони у розпачі',
    words: [
      { text: 'They', correct: 'They', distractors: ['them', 'their', 'there', 'those', 'these'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'air', 'arm', 'art'], category: 'to-be' },
      { text: 'desperate', correct: 'desperate', distractors: ['deep', 'desert', 'depend', 'despite', 'depart'], category: 'adjective' },
    ],
  },
];

// ==================== LESSON DATA EXPORT ====================

export const LESSON_DATA: Record<number, LessonData> = {
  1: {
    id: 1,
    titleRU: 'Урок 1: Местоимения и глагол To Be',
    titleUK: 'Урок 1: Займенники й дієслово To Be',
    introScreens: LESSON_1_INTRO_SCREENS,
    phrases: LESSON_1_PHRASES,
  },
};

export const LESSON_ENCOURAGEMENT_SCREENS: Record<number, LessonIntroScreen[]> = {
  1: LESSON_1_ENCOURAGEMENT_SCREENS,
};

export function getLessonData(lessonId: number): LessonPhrase[] {
  return LESSON_DATA[lessonId]?.phrases || [];
}

export function getLessonIntroScreens(lessonId: number): LessonIntroScreen[] {
  return LESSON_DATA[lessonId]?.introScreens || [];
}

export function getLessonEncouragementScreens(lessonId: number): LessonIntroScreen[] {
  return LESSON_ENCOURAGEMENT_SCREENS[lessonId] || [];
}

// Export lesson data indexed by lessonId for RU/UK lookups
export const ALL_LESSONS_RU: Record<number, { english: string; russian: string }[]> = {
  1: LESSON_1_PHRASES.map(p => ({ english: p.english, russian: p.russian })),
};

export const ALL_LESSONS_UK: Record<number, { english: string; ukrainian: string }[]> = {
  1: LESSON_1_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),
};
