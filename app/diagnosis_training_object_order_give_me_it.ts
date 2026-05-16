import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = [
  'verb + person + thing',
  'verb + thing + to + person',
  'verb + thing + for + person',
  'give it to me',
  'send it to her',
  'buy it for him',
];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'Сначала найди два объекта: person и thing. Потом выбери порядок: person + thing или thing + to/for + person.',
      'Спочатку знайди два objects: person і thing. Потім обери порядок: person + thing або thing + to/for + person.',
      'First find the two objects: person and thing. Then choose person + thing or thing + to/for + person.',
    ),
    depth2,
    depth3,
    depth4,
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Здесь нужен порядок ${correct}. С it/them обычно безопаснее схема thing + to/for + person.`,
    `Тут потрібен порядок ${correct}. З it/them зазвичай безпечніше схема thing + to/for + person.`,
    `Use the order ${correct}. With it/them, the safer pattern is thing + to/for + person.`,
  );
}

function step(input: {
  id: string;
  order: number;
  difficulty: DiagnosisTrainingStep['difficulty'];
  targetSkill: string;
  sentence: string;
  translation: TriText;
  options: string[];
  correctAnswer: string;
  correctFeedback: TriText;
  wrong: Record<string, TriText>;
  retryFeedback: [TriText, TriText, TriText];
  focusWords: string[];
}): DiagnosisTrainingStep {
  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: input.translation,
    explanationBlock: tri(
      'В английском после give/send/show/tell/buy/make важно не просто назвать два объекта, а поставить их в правильный шаблон.',
      'В англійській після give/send/show/tell/buy/make важливо не просто назвати два objects, а поставити їх у правильний шаблон.',
      'After give/send/show/tell/buy/make, English needs the two objects in a fixed pattern.',
    ),
    microTask: tri(
      'Выбери естественный порядок двух объектов.',
      'Обери природний порядок двох objects.',
      'Choose the natural order for the two objects.',
    ),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? defaultWrong(input.correctAnswer)])),
    retryFeedback: retry(...input.retryFeedback),
    fallbackExplanation: tri(
      'Правило-скелет: give me the book, но give it to me. Send her the file, но send it to her. Buy me coffee, но buy it for me.',
      'Правило-скелет: give me the book, але give it to me. Send her the file, але send it to her. Buy me coffee, але buy it for me.',
      'Core pattern: give me the book, but give it to me. Send her the file, but send it to her. Buy me coffee, but buy it for me.',
    ),
    focusWords: input.focusWords,
  };
}

export const OBJECT_ORDER_GIVE_ME_IT_TRAINING: DiagnosisTraining = {
  id: 'object_order_give_me_it',
  category: 'syntax',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 30,
  supportedLocales: ['ru', 'uk'],
  title: tri(
    'Give me it / Give it to me: порядок объектов',
    'Give me it / Give it to me: порядок об’єктів',
    'Give me it / Give it to me: object order',
  ),
  shortTitle: tri('Object Order', 'Object Order', 'Object Order'),
  shortDiagnosis: tri(
    'Ты путаешь порядок двух объектов после give, send, show, tell, bring, buy.',
    'Ти плутаєш порядок двох objects після give, send, show, tell, bring, buy.',
    'You are mixing the order of two objects after give, send, show, tell, bring, and buy.',
  ),
  diagnosisText: tri(
    'Ты путаешь порядок двух объектов после глаголов give, send, show, tell, bring, buy. Главная проблема в том, что в английском нельзя просто ставить слова как в русском. Нужно выбрать одну из двух нормальных схем: give me the book или give the book to me.',
    'Ти плутаєш порядок двох об’єктів після дієслів give, send, show, tell, bring, buy. Головна проблема в тому, що в англійській не можна просто ставити слова як в українській. Потрібно вибрати одну з двох нормальних схем: give me the book або give the book to me.',
    'You are mixing the order of two objects. English needs one of two patterns: give me the book or give the book to me.',
  ),
  mentalModel: tri(
    'Если после глагола два объекта, есть две основные схемы. Схема 1: verb + person + thing: give me the book. Схема 2: verb + thing + to/for + person: give the book to me. Но если thing = it/them, чаще нужна схема give it to me.',
    'Якщо після дієслова два objects, є дві основні схеми. Схема 1: verb + person + thing: give me the book. Схема 2: verb + thing + to/for + person: give the book to me. Але якщо thing = it/them, частіше потрібна схема give it to me.',
    'Two-object verbs have two patterns: give me the book or give the book to me. With it/them, use give it to me.',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'Give me the book = Give the book to me. Send her the file = Send the file to her. Buy me coffee = Buy coffee for me. Но с it/them: Give it to me, Send it to her, Buy it for me.',
    'Give me the book = Give the book to me. Send her the file = Send the file to her. Buy me coffee = Buy coffee for me. Але з it/them: Give it to me, Send it to her, Buy it for me.',
    'Give me the book = Give the book to me. With it/them: Give it to me, Send it to her, Buy it for me.',
  ),
  whatUserMustLearn: {
    ru: [
      'Некоторые verbs могут иметь два объекта: человек и вещь.',
      'Первая схема: verb + person + thing: Give me the book.',
      'Вторая схема: verb + thing + to + person: Give the book to me.',
      'Give, send, show, tell часто используют to во второй схеме: give it to me, send it to her, show it to them, tell it to me.',
      'Buy, make, get часто используют for во второй схеме: buy it for me, make it for her, get it for them.',
      'Если вещь выражена местоимением it/them, обычно не ставим person сразу после глагола: Give it to me, не Give me it.',
      'Tell me the truth нормально, потому что the truth - полная noun phrase.',
      'Не смешивай две схемы: Give to me the book неправильно в обычном порядке.',
    ],
    uk: [
      'Деякі verbs можуть мати два objects: людину і річ.',
      'Перша схема: verb + person + thing: Give me the book.',
      'Друга схема: verb + thing + to + person: Give the book to me.',
      'Give, send, show, tell часто використовують to у другій схемі: give it to me, send it to her, show it to them, tell it to me.',
      'Buy, make, get часто використовують for у другій схемі: buy it for me, make it for her, get it for them.',
      'Якщо річ виражена займенником it/them, зазвичай не ставимо person одразу після дієслова: Give it to me, не Give me it.',
      'Tell me the truth нормально, бо the truth - повна noun phrase.',
      'Не змішуй дві схеми: Give to me the book неправильно у звичайному порядку.',
    ],
    es: [
      'Some verbs can take two objects: person and thing.',
      'Pattern 1: verb + person + thing.',
      'Pattern 2: verb + thing + to/for + person.',
      'With it/them, prefer thing + to/for + person.',
    ],
  },
  examples: [
    { en: 'Give me the book.', ru: 'Дай мне книгу.', uk: 'Дай мені книжку.', es: 'Give me the book.', why: tri('Схема verb + person + thing: give + me + the book.', 'Схема verb + person + thing: give + me + the book.', 'Pattern: verb + person + thing.') },
    { en: 'Give the book to me.', ru: 'Дай книгу мне.', uk: 'Дай книжку мені.', es: 'Give the book to me.', why: tri('Схема verb + thing + to + person: give + the book + to me.', 'Схема verb + thing + to + person: give + the book + to me.', 'Pattern: verb + thing + to + person.') },
    { en: 'Give it to me.', ru: 'Дай это мне.', uk: 'Дай це мені.', es: 'Give it to me.', why: tri('Когда вещь = it, естественная схема: thing + to + person.', 'Коли річ = it, природна схема: thing + to + person.', 'With it, use thing + to + person.') },
    { en: 'Send her the file.', ru: 'Отправь ей файл.', uk: 'Надішли їй файл.', es: 'Send her the file.', why: tri('Схема person + thing: send + her + the file.', 'Схема person + thing: send + her + the file.', 'Pattern: person + thing.') },
    { en: 'Send it to her.', ru: 'Отправь это ей.', uk: 'Надішли це їй.', es: 'Send it to her.', why: tri('С it используется схема send it to her, не send her it.', 'З it використовується схема send it to her, не send her it.', 'With it, use send it to her.') },
    { en: 'Show me your phone.', ru: 'Покажи мне свой телефон.', uk: 'Покажи мені свій телефон.', es: 'Show me your phone.', why: tri('Your phone - полная noun phrase. Можно show me your phone.', 'Your phone - повна noun phrase. Можна show me your phone.', 'A full noun phrase can follow the person.') },
    { en: 'Show it to me.', ru: 'Покажи это мне.', uk: 'Покажи це мені.', es: 'Show it to me.', why: tri('С it естественно: show it to me.', 'З it природно: show it to me.', 'With it, use show it to me.') },
    { en: 'Buy it for me.', ru: 'Купи это для меня.', uk: 'Купи це для мене.', es: 'Buy it for me.', why: tri('Buy часто использует for, когда показываем, для кого покупка.', 'Buy часто використовує for, коли показуємо, для кого покупка.', 'Buy often uses for for the beneficiary.') },
  ],
  introBlocks: [
    {
      id: 'intro_problem',
      type: 'diagnosis',
      text: tri(
        'Похоже, ты иногда ставишь два объекта после глагола в русском порядке. В английском важно выбрать правильную схему: человек потом вещь, или вещь потом to/for + человек.',
        'Схоже, ти іноді ставиш два objects після дієслова в українському порядку. В англійській важливо вибрати правильну схему: людина потім річ, або річ потім to/for + людина.',
        'You may be placing the two objects in native-language order. English needs one of two patterns.',
      ),
    },
    { id: 'intro_rule', type: 'rule', text: tri('Две безопасные схемы: Give me the book. Give the book to me. Но с it лучше: Give it to me.', 'Дві безпечні схеми: Give me the book. Give the book to me. Але з it краще: Give it to me.', 'Two safe patterns: Give me the book. Give the book to me. With it: Give it to me.') },
    { id: 'intro_warning', type: 'warning', text: tri('Главная ловушка: Give me it. Для стандартного учебного английского лучше Give it to me.', 'Головна пастка: Give me it. Для стандартної навчальної англійської краще Give it to me.', 'Main trap: Give me it. In standard learner English, prefer Give it to me.') },
  ],
  steps: [
    step({ id: 'object_order_easy_001', order: 1, difficulty: 'easy', targetSkill: 'give_person_thing', sentence: 'Give ___ the book.', translation: tri('Дай мне книгу.', 'Дай мені книжку.', 'Give me the book.'), options: ['me', 'to me', 'it', 'for me'], correctAnswer: 'me', correctFeedback: tri('Да. Схема verb + person + thing: give me the book.', 'Так. Схема verb + person + thing: give me the book.', 'Yes. Pattern: give me the book.'), wrong: { 'to me': tri('Give to me the book - не базовый порядок. Либо give me the book, либо give the book to me.', 'Give to me the book - не базовий порядок. Або give me the book, або give the book to me.', 'Give to me the book is not the basic order.'), it: tri('Give it the book неправильно. Здесь нужен получатель me.', 'Give it the book неправильно. Тут потрібен отримувач me.', 'Here you need the receiver: me.'), 'for me': tri('Give обычно использует to во второй схеме, но здесь первая схема: give me the book.', 'Give зазвичай використовує to у другій схемі, але тут перша схема: give me the book.', 'Give uses to in the second pattern, but here use give me the book.') }, retryFeedback: [tri('Дай кому? Me. Give me the book.', 'Дай кому? Me. Give me the book.', 'Receiver = me.'), tri('Give me the book.'), tri('Подсказка: Give me the book.', 'Підказка: Give me the book.', 'Hint: Give me the book.')], focusWords: ['give', 'me', 'the book'] }),
    step({ id: 'object_order_easy_002', order: 2, difficulty: 'easy', targetSkill: 'send_person_thing', sentence: 'Send ___ the file.', translation: tri('Отправь ей файл.', 'Надішли їй файл.', 'Send her the file.'), options: ['her', 'to her', 'it', 'for her'], correctAnswer: 'her', correctFeedback: tri('Да. Схема verb + person + thing: send her the file.', 'Так. Схема verb + person + thing: send her the file.', 'Yes. Send her the file.'), wrong: { 'to her': tri('Send to her the file - не базовый порядок. Лучше send her the file или send the file to her.', 'Send to her the file - не базовий порядок. Краще send her the file або send the file to her.', 'Use send her the file or send the file to her.'), it: tri('Send it the file неправильно. Здесь нужен получатель her.', 'Send it the file неправильно. Тут потрібен отримувач her.', 'Here you need the receiver: her.'), 'for her': tri('Send обычно использует to для получателя. Здесь нужна схема send her the file.', 'Send зазвичай використовує to для отримувача. Тут потрібна схема send her the file.', 'Send uses to for the receiver; here use send her the file.') }, retryFeedback: [tri('Отправь кому? Her. Send her the file.', 'Надішли кому? Her. Send her the file.', 'Receiver = her.'), tri('Send her the file.'), tri('Подсказка: Send her the file.', 'Підказка: Send her the file.', 'Hint: Send her the file.')], focusWords: ['send', 'her', 'the file'] }),
    step({ id: 'object_order_easy_003', order: 3, difficulty: 'easy', targetSkill: 'show_person_thing', sentence: 'Show ___ your phone.', translation: tri('Покажи мне свой телефон.', 'Покажи мені свій телефон.', 'Show me your phone.'), options: ['me', 'to me', 'it', 'for me'], correctAnswer: 'me', correctFeedback: tri('Да. Show me your phone - нормальная схема person + thing.', 'Так. Show me your phone - нормальна схема person + thing.', 'Yes. Show me your phone is natural.'), wrong: { 'to me': tri('Show to me your phone звучит неестественно. Лучше show me your phone или show your phone to me.', 'Show to me your phone звучить неприродно. Краще show me your phone або show your phone to me.', 'Use show me your phone or show your phone to me.'), it: tri('Show it your phone неправильно. Нужен получатель me.', 'Show it your phone неправильно. Потрібен отримувач me.', 'Here you need me.'), 'for me': tri('Show обычно использует to во второй схеме, не for. Здесь лучше show me your phone.', 'Show зазвичай використовує to у другій схемі, не for. Тут краще show me your phone.', 'Show uses to, not for, for the receiver.') }, retryFeedback: [tri('Покажи кому? Me. Show me your phone.', 'Покажи кому? Me. Show me your phone.', 'Receiver = me.'), tri('Show me your phone.'), tri('Подсказка: Show me your phone.', 'Підказка: Show me your phone.', 'Hint: Show me your phone.')], focusWords: ['show', 'me', 'your phone'] }),
    step({ id: 'object_order_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'give_thing_to_person', sentence: 'Give the book ___ me.', translation: tri('Дай книгу мне.', 'Дай книжку мені.', 'Give the book to me.'), options: ['to', 'for', 'at', 'into'], correctAnswer: 'to', correctFeedback: tri('Да. Схема thing + to + person: give the book to me.', 'Так. Схема thing + to + person: give the book to me.', 'Yes. Thing + to + person.'), wrong: { for: tri('Give обычно передает получателя через to: give the book to me.', 'Give зазвичай передає отримувача через to: give the book to me.', 'Give uses to for the receiver.'), at: tri('Give the book at me неправильно. Получатель после give = to me.', 'Give the book at me неправильно. Отримувач після give = to me.', 'Use to me.'), into: tri('Into показывает движение внутрь, не получателя. Нужно to me.', 'Into показує рух усередину, не отримувача. Потрібно to me.', 'Into is not for the receiver here.') }, retryFeedback: [tri('Вещь + to + человек.', 'Річ + to + людина.', 'Thing + to + person.'), tri('Give the book to me.'), tri('Подсказка: Give the book to me.', 'Підказка: Give the book to me.', 'Hint: Give the book to me.')], focusWords: ['give', 'to me'] }),
    step({ id: 'object_order_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'send_thing_to_person', sentence: 'Send the file ___ her.', translation: tri('Отправь файл ей.', 'Надішли файл їй.', 'Send the file to her.'), options: ['to', 'for', 'at', 'from'], correctAnswer: 'to', correctFeedback: tri('Да. Send the file to her - стандартная схема thing + to + person.', 'Так. Send the file to her - стандартна схема thing + to + person.', 'Yes. Send the file to her.'), wrong: { for: tri('Send обычно использует to для получателя: send the file to her.', 'Send зазвичай використовує to для отримувача: send the file to her.', 'Send uses to for the receiver.'), at: tri('Send the file at her неправильно. Получатель = to her.', 'Send the file at her неправильно. Отримувач = to her.', 'Use to her.'), from: tri('From her означает от нее. Здесь файл отправляют ей: to her.', 'From her означає від неї. Тут файл надсилають їй: to her.', 'From her means from her, not to her.') }, retryFeedback: [tri('Отправить кому? To her.', 'Надіслати кому? To her.', 'Receiver = to her.'), tri('Send the file to her.'), tri('Подсказка: Send the file to her.', 'Підказка: Send the file to her.', 'Hint: Send the file to her.')], focusWords: ['send', 'to her'] }),
    step({ id: 'object_order_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'show_thing_to_person', sentence: 'Show the photo ___ them.', translation: tri('Покажи фото им.', 'Покажи фото їм.', 'Show the photo to them.'), options: ['to', 'for', 'at', 'on'], correctAnswer: 'to', correctFeedback: tri('Да. Show the photo to them - нормальная схема thing + to + person.', 'Так. Show the photo to them - нормальна схема thing + to + person.', 'Yes. Show the photo to them.'), wrong: { for: tri('Show обычно использует to для того, кому показываем: show it to them.', 'Show зазвичай використовує to для того, кому показуємо: show it to them.', 'Show uses to for the receiver.'), at: tri('Show the photo at them неправильно. Нужна форма to them.', 'Show the photo at them неправильно. Потрібна форма to them.', 'Use to them.'), on: tri('On не показывает получателя после show. Нужен to.', 'On не показує отримувача після show. Потрібен to.', 'On is not for the receiver here.') }, retryFeedback: [tri('Показать кому? To them.', 'Показати кому? To them.', 'Receiver = to them.'), tri('Show the photo to them.'), tri('Подсказка: Show the photo to them.', 'Підказка: Show the photo to them.', 'Hint: Show the photo to them.')], focusWords: ['show', 'to them'] }),
    step({ id: 'object_order_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'give_it_to_me', sentence: 'Give ___.', translation: tri('Дай это мне.', 'Дай це мені.', 'Give it to me.'), options: ['it to me', 'me it', 'to me it', 'it for me'], correctAnswer: 'it to me', correctFeedback: tri('Да. С it безопасный порядок: give it to me.', 'Так. З it безпечний порядок: give it to me.', 'Yes. With it: give it to me.'), wrong: { 'me it': tri('Give me it звучит неестественно в стандартном учебном английском. Лучше give it to me.', 'Give me it звучить неприродно у стандартній навчальній англійській. Краще give it to me.', 'Give me it sounds unnatural in standard learner English. Use give it to me.'), 'to me it': tri('Give to me it неправильно. Нужен порядок give it to me.', 'Give to me it неправильно. Потрібен порядок give it to me.', 'Use give it to me.'), 'it for me': tri('С give получатель обычно идет через to: give it to me.', 'З give отримувач зазвичай іде через to: give it to me.', 'Give uses to here.') }, retryFeedback: [tri('С it: вещь + to + person.', 'З it: річ + to + person.', 'With it: thing + to + person.'), tri('Give it to me.'), tri('Подсказка: Give it to me.', 'Підказка: Give it to me.', 'Hint: Give it to me.')], focusWords: ['give it to me'] }),
    step({ id: 'object_order_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'send_it_to_her', sentence: 'Send ___.', translation: tri('Отправь это ей.', 'Надішли це їй.', 'Send it to her.'), options: ['it to her', 'her it', 'to her it', 'it for her'], correctAnswer: 'it to her', correctFeedback: tri('Да. С it естественно: send it to her.', 'Так. З it природно: send it to her.', 'Yes. Send it to her.'), wrong: { 'her it': tri('Send her it звучит неестественно для стандартного учебного английского. Лучше send it to her.', 'Send her it звучить неприродно для стандартної навчальної англійської. Краще send it to her.', 'Use send it to her.'), 'to her it': tri('Send to her it неправильно. Нужен порядок send it to her.', 'Send to her it неправильно. Потрібен порядок send it to her.', 'Use send it to her.'), 'it for her': tri('С send получатель обычно идет через to: send it to her.', 'З send отримувач зазвичай іде через to: send it to her.', 'Send uses to here.') }, retryFeedback: [tri('Send + it + to her.', 'Send + it + to her.', 'Send + it + to her.'), tri('Send it to her.'), tri('Подсказка: Send it to her.', 'Підказка: Send it to her.', 'Hint: Send it to her.')], focusWords: ['send it to her'] }),
    step({ id: 'object_order_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'show_it_to_me', sentence: 'Show ___.', translation: tri('Покажи это мне.', 'Покажи це мені.', 'Show it to me.'), options: ['it to me', 'me it', 'to me it', 'it for me'], correctAnswer: 'it to me', correctFeedback: tri('Да. С it: show it to me.', 'Так. З it: show it to me.', 'Yes. Show it to me.'), wrong: { 'me it': tri('Show me it звучит неестественно в стандартном учебном английском. Лучше show it to me.', 'Show me it звучить неприродно у стандартній навчальній англійській. Краще show it to me.', 'Use show it to me.'), 'to me it': tri('Show to me it неправильно. Нужен порядок show it to me.', 'Show to me it неправильно. Потрібен порядок show it to me.', 'Use show it to me.'), 'it for me': tri('С show получатель обычно идет через to: show it to me.', 'З show отримувач зазвичай іде через to: show it to me.', 'Show uses to here.') }, retryFeedback: [tri('Show + it + to me.', 'Show + it + to me.', 'Show + it + to me.'), tri('Show it to me.'), tri('Подсказка: Show it to me.', 'Підказка: Show it to me.', 'Hint: Show it to me.')], focusWords: ['show it to me'] }),
    step({ id: 'object_order_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'buy_it_for_me', sentence: 'Buy ___.', translation: tri('Купи это для меня.', 'Купи це для мене.', 'Buy it for me.'), options: ['it for me', 'it to me', 'me it', 'for me it'], correctAnswer: 'it for me', correctFeedback: tri('Да. Buy часто использует for: buy it for me.', 'Так. Buy часто використовує for: buy it for me.', 'Yes. Buy it for me.'), wrong: { 'it to me': tri('С buy обычно показываем, для кого покупка, через for: buy it for me.', 'З buy зазвичай показуємо, для кого покупка, через for: buy it for me.', 'Buy uses for here: buy it for me.'), 'me it': tri('Buy me it звучит неестественно. С it лучше buy it for me.', 'Buy me it звучить неприродно. З it краще buy it for me.', 'Use buy it for me.'), 'for me it': tri('Buy for me it неправильно. Нужен порядок buy it for me.', 'Buy for me it неправильно. Потрібен порядок buy it for me.', 'Use buy it for me.') }, retryFeedback: [tri('Buy + it + for me.', 'Buy + it + for me.', 'Buy + it + for me.'), tri('Buy it for me.'), tri('Подсказка: Buy it for me.', 'Підказка: Buy it for me.', 'Hint: Buy it for me.')], focusWords: ['buy it for me'] }),
    step({ id: 'object_order_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'make_it_for_her', sentence: 'Make ___.', translation: tri('Сделай это для неё.', 'Зроби це для неї.', 'Make it for her.'), options: ['it for her', 'it to her', 'her it', 'for her it'], correctAnswer: 'it for her', correctFeedback: tri('Да. Make часто использует for: make it for her.', 'Так. Make часто використовує for: make it for her.', 'Yes. Make it for her.'), wrong: { 'it to her': tri('С make обычно нужен for, если речь о том, для кого делаем: make it for her.', 'З make зазвичай потрібен for, якщо йдеться про те, для кого робимо: make it for her.', 'Make uses for here.'), 'her it': tri('Make her it звучит неестественно. С it лучше make it for her.', 'Make her it звучить неприродно. З it краще make it for her.', 'Use make it for her.'), 'for her it': tri('Make for her it неправильно. Нужен порядок make it for her.', 'Make for her it неправильно. Потрібен порядок make it for her.', 'Use make it for her.') }, retryFeedback: [tri('Make + it + for her.', 'Make + it + for her.', 'Make + it + for her.'), tri('Make it for her.'), tri('Подсказка: Make it for her.', 'Підказка: Make it for her.', 'Hint: Make it for her.')], focusWords: ['make it for her'] }),
    step({ id: 'object_order_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'tell_me_truth_tell_it_to_me', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.', 'Choose the correct pair.'), options: ['Tell me the truth / Tell it to me', 'Tell me it / Tell to me the truth', 'Tell it for me / Tell me to it', 'Tell to me it / Tell the truth me'], correctAnswer: 'Tell me the truth / Tell it to me', correctFeedback: tri('Да. С полной noun phrase можно tell me the truth. С it лучше tell it to me.', 'Так. З повною noun phrase можна tell me the truth. З it краще tell it to me.', 'Yes. Full noun: tell me the truth. It: tell it to me.'), wrong: { 'Tell me it / Tell to me the truth': tri('Tell me it неестественно. Tell to me the truth тоже не базовый порядок. Нужно tell me the truth / tell it to me.', 'Tell me it неприродно. Tell to me the truth теж не базовий порядок. Потрібно tell me the truth / tell it to me.', 'Use tell me the truth / tell it to me.'), 'Tell it for me / Tell me to it': tri('Tell использует to для адресата во второй схеме: tell it to me.', 'Tell використовує to для адресата у другій схемі: tell it to me.', 'Tell uses to for the addressee.'), 'Tell to me it / Tell the truth me': tri('Обе формы нарушают порядок. Нужны tell it to me или tell me the truth.', 'Обидві форми порушують порядок. Потрібні tell it to me або tell me the truth.', 'Both orders are wrong.') }, retryFeedback: [tri('Полная вещь: tell me the truth. It: tell it to me.', 'Повна річ: tell me the truth. It: tell it to me.', 'Full noun: tell me the truth. It: tell it to me.'), tri('Tell me the truth / Tell it to me.'), tri('Подсказка: Tell me the truth / Tell it to me.', 'Підказка: Tell me the truth / Tell it to me.', 'Hint: Tell me the truth / Tell it to me.')], focusWords: ['tell me the truth', 'tell it to me'] }),
    step({ id: 'object_order_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_give_patterns', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.', 'Choose the correct pair.'), options: ['Give me the book / Give it to me', 'Give me it / Give to me the book', 'Give it for me / Give to me it', 'Give the book me / Give me to it'], correctAnswer: 'Give me the book / Give it to me', correctFeedback: tri('Да. Полный noun: give me the book. It: give it to me.', 'Так. Повний noun: give me the book. It: give it to me.', 'Yes. Full noun: give me the book. It: give it to me.'), wrong: { 'Give me it / Give to me the book': tri('Give me it и give to me the book не лучшие стандартные формы. Нужна пара give me the book / give it to me.', 'Give me it і give to me the book не найкращі стандартні форми. Потрібна пара give me the book / give it to me.', 'Use give me the book / give it to me.'), 'Give it for me / Give to me it': tri('С give получатель идет через to, а порядок с it: give it to me.', 'З give отримувач іде через to, а порядок з it: give it to me.', 'Give uses to; with it use give it to me.'), 'Give the book me / Give me to it': tri('Give the book me нарушает порядок. Нужно give the book to me или give me the book.', 'Give the book me порушує порядок. Потрібно give the book to me або give me the book.', 'Use give the book to me or give me the book.') }, retryFeedback: [tri('Book: give me the book. It: give it to me.', 'Book: give me the book. It: give it to me.', 'Book: give me the book. It: give it to me.'), tri('Give me the book / Give it to me.'), tri('Подсказка: Give me the book / Give it to me.', 'Підказка: Give me the book / Give it to me.', 'Hint: Give me the book / Give it to me.')], focusWords: ['give me the book', 'give it to me'] }),
    step({ id: 'object_order_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_to_for', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.', 'Choose the correct pair.'), options: ['Send it to her / Buy it for her', 'Send it for her / Buy it to her', 'Send her it / Buy her it', 'Send to her it / Buy for her it'], correctAnswer: 'Send it to her / Buy it for her', correctFeedback: tri('Да. Send использует to для получателя. Buy использует for для человека, для которого покупают.', 'Так. Send використовує to для отримувача. Buy використовує for для людини, для якої купують.', 'Yes. Send uses to; buy uses for.'), wrong: { 'Send it for her / Buy it to her': tri('To/for перепутаны. Send it to her, но buy it for her.', 'To/for переплутані. Send it to her, але buy it for her.', 'To/for are reversed. Use Send it to her / Buy it for her.'), 'Send her it / Buy her it': tri('С it лучше использовать thing + to/for + person: send it to her, buy it for her.', 'З it краще використовувати thing + to/for + person: send it to her, buy it for her.', 'With it, use thing + to/for + person.'), 'Send to her it / Buy for her it': tri('Порядок неверный. Нужен send it to her / buy it for her.', 'Порядок неправильний. Потрібен send it to her / buy it for her.', 'Wrong order. Use send it to her / buy it for her.') }, retryFeedback: [tri('Send to. Buy for.', 'Send to. Buy for.', 'Send to. Buy for.'), tri('Send it to her / Buy it for her.'), tri('Подсказка: Send it to her / Buy it for her.', 'Підказка: Send it to her / Buy it for her.', 'Hint: Send it to her / Buy it for her.')], focusWords: ['send it to her', 'buy it for her'] }),
    step({ id: 'object_order_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.', 'Choose the correct sentence.'), options: ['Show me the photo, then send it to her.', 'Show me it, then send her it.', 'Show to me the photo, then send to her it.', 'Show it for me, then send it for her.'], correctAnswer: 'Show me the photo, then send it to her.', correctFeedback: tri('Да. Show me the photo с полной noun phrase. Send it to her с it.', 'Так. Show me the photo з повною noun phrase. Send it to her з it.', 'Yes. Full noun phrase: show me the photo. With it: send it to her.'), wrong: { 'Show me it, then send her it.': tri('С it лучше show it to me и send it to her. В выбранной фразе первая часть должна быть show me the photo.', 'З it краще show it to me і send it to her. У вибраній фразі перша частина має бути show me the photo.', 'With it, use show it to me and send it to her.'), 'Show to me the photo, then send to her it.': tri('Порядок с to нарушен. Нужны show me the photo / send it to her.', 'Порядок з to порушений. Потрібні show me the photo / send it to her.', 'The to order is wrong.'), 'Show it for me, then send it for her.': tri('Show и send обычно используют to для получателя: show it to me, send it to her.', 'Show і send зазвичай використовують to для отримувача: show it to me, send it to her.', 'Show and send use to for the receiver.') }, retryFeedback: [tri('Show me the photo. Send it to her.', 'Show me the photo. Send it to her.', 'Show me the photo. Send it to her.'), tri('Photo = show me the photo. It = send it to her.', 'Photo = show me the photo. It = send it to her.', 'Photo = show me the photo. It = send it to her.'), tri('Подсказка: Show me the photo, then send it to her.', 'Підказка: Show me the photo, then send it to her.', 'Hint: Show me the photo, then send it to her.')], focusWords: ['show me the photo', 'send it to her'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'give_me_it_error',
      'send_her_it_error',
      'show_me_it_error',
      'wrong_to_order_error',
      'to_for_confusion',
      'pronoun_object_order_error',
      'double_object_pattern_confusion',
      'mixed_pattern_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем две допустимые схемы и почему выбранная форма лучше.', 'Звичайне пояснення: показуємо дві допустимі схеми і чому вибрана форма краща.', 'Explain the two possible patterns and the better choice.'),
    depth2: tri('Проще: спрашиваем, вещь названа полным noun или местоимением it/them.', 'Простіше: питаємо, річ названа повним noun чи займенником it/them.', 'Ask whether the thing is a full noun phrase or it/them.'),
    depth3: tri('Еще проще: показываем пары give me the book / give it to me.', 'Ще простіше: показуємо пари give me the book / give it to me.', 'Show the model pairs: give me the book / give it to me.'),
    depth4: tri('Почти подсказка: прямо указываем правильный порядок слов.', 'Майже підказка: прямо вказуємо правильний порядок слів.', 'Almost a hint: show the correct word order.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: {
        ru: 'Остановись. Если вещь названа полностью: give me the book. Если вещь = it/them: give it to me. Для give/send/show/tell чаще to. Для buy/make/get чаще for.',
        uk: 'Зупинись. Якщо річ названа повністю: give me the book. Якщо річ = it/them: give it to me. Для give/send/show/tell частіше to. Для buy/make/get частіше for.',
        es: 'Pause. Full noun: give me the book. It/them: give it to me. Give/send/show/tell use to. Buy/make/get use for.',
      },
    },
    afterThreeWrongInSameExercise: {
      action: 'show_object_type_hint_then_retry',
      card: {
        ru: 'Подсказка по объектам: система покажет, где person и где thing, а также thing это noun phrase или it/them, но не выберет порядок за пользователя.',
        uk: 'Підказка за objects: система покаже, де person і де thing, а також thing це noun phrase чи it/them, але не вибере порядок за користувача.',
        es: 'Object hint: show person and thing, and whether thing is a noun phrase or it/them.',
      },
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: {
        ru: 'Режим подсказки: сначала выбери, thing выражено полным noun или it/them. Потом система спросит, нужен to или for, и вернет тебя к фразе.',
        uk: 'Режим підказки: спочатку обери, thing виражено повним noun чи it/them. Потім система спитає, потрібен to чи for, і поверне тебе до фрази.',
        es: 'Guided mode: first choose full noun or it/them, then choose to or for.',
      },
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_object_order_001', prompt: { ru: 'В Give me the book слово the book - это полный noun или it?', uk: 'У Give me the book слово the book - це повний noun чи it?', es: 'In Give me the book, is the book a full noun or it?' }, options: ['полный noun', 'it'], correctIndex: 0, thenReturnToExerciseId: 'object_order_easy_001' },
      { id: 'guided_object_order_002', prompt: { ru: 'Если thing = it, лучше Give me it или Give it to me?', uk: 'Якщо thing = it, краще Give me it чи Give it to me?', es: 'If thing = it, which is better?' }, options: ['Give me it', 'Give it to me'], correctIndex: 1, thenReturnToExerciseId: 'object_order_contrast_004' },
      { id: 'guided_object_order_003', prompt: { ru: 'Send обычно передает получателя через to или for?', uk: 'Send зазвичай передає отримувача через to чи for?', es: 'Does send usually use to or for for the receiver?' }, options: ['to', 'for'], correctIndex: 0, thenReturnToExerciseId: 'object_order_contrast_002' },
      { id: 'guided_object_order_004', prompt: { ru: 'Buy показывает человека, для которого покупают, через to или for?', uk: 'Buy показує людину, для якої купують, через to чи for?', es: 'Does buy use to or for for the beneficiary?' }, options: ['to', 'for'], correctIndex: 1, thenReturnToExerciseId: 'object_order_mixed_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'syntax',
    microDiagnosisId: 'object_order_give_me_it',
    diagnosisLabel: tri('Порядок двух объектов', 'Порядок двох objects', 'Two-object order'),
    contrastSet: CONTRAST,
    focusWords: ['give me the book', 'give it to me', 'send it to her', 'buy it for me'],
    focusPatterns: [
      'give_person_thing',
      'send_person_thing',
      'show_person_thing',
      'give_thing_to_person',
      'send_thing_to_person',
      'show_thing_to_person',
      'give_it_to_me',
      'send_it_to_her',
      'show_it_to_me',
      'buy_it_for_me',
      'make_it_for_her',
      'tell_me_truth_tell_it_to_me',
      'mixed_give_patterns',
      'mixed_to_for',
      'mixed_sentence_correction',
    ],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: {
      start: 'easy',
      afterCorrectInRow: 3,
      next: 'contrast',
      afterCorrectInRowAtContrast: 3,
      final: 'mixed_review',
    },
  },
  analyticsEvents: {
    start: 'diagnosis_training_started',
    answer: 'diagnosis_training_answer',
    mastery: 'diagnosis_training_mastered',
    fallback: 'diagnosis_training_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: {
      category: 'syntax',
      microDiagnosisId: 'object_order_give_me_it',
      contrastSet: ['verb + person + thing', 'verb + thing + to + person', 'verb + thing + for + person', 'it/them order'],
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logObjectType: true,
      logObjectOrderPattern: true,
      logPreposition: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=syntax&microDiagnosisId=object_order_give_me_it',
  },
  qualityChecklist: {
    hasStableId: true,
    hasCategory: true,
    hasMultilingualTitle: true,
    hasPlainDiagnosisText: true,
    hasMentalModel: true,
    hasContrastSet: true,
    hasAtLeastSixExamples: true,
    hasAtLeastTwelveExercises: true,
    hasEasyContrastMixedStructure: true,
    hasDistractorSpecificFeedback: true,
    hasRetryFeedbackLevels: true,
    hasGuidedModeForRepeatedMistakes: true,
    hasMasteryRules: true,
    hasSmartTrainerConfig: true,
    hasAnalyticsPayload: true,
    hasFallbackRoute: true,
  },
};


