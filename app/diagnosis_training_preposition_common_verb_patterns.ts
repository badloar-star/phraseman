import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = ['listen to', 'wait for', 'depend on', 'look at', 'talk to', 'think about', 'ask for', 'believe in'];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'Сначала посмотри на сам глагол. У таких фраз предлог часто хранится вместе с глаголом: listen to, wait for, depend on.',
      'Спочатку подивися на саме дієслово. У таких фразах прийменник часто зберігається разом із дієсловом: listen to, wait for, depend on.',
      'First look at the verb. In these phrases, the preposition is stored with the verb: listen to, wait for, depend on.',
    ),
    depth2,
    depth3,
    depth4,
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Здесь нужен устойчивый блок с предлогом ${correct}.`,
    `Тут потрібен сталий блок із прийменником ${correct}.`,
    `This verb pattern needs ${correct}.`,
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
      'В английском некоторые глаголы требуют конкретный предлог. Не выбирай предлог по переводу отдельно: учи блок целиком.',
      'В англійській деякі дієслова потребують конкретний прийменник. Не обирай прийменник за перекладом окремо: вчи блок цілком.',
      'Some English verbs require a fixed preposition. Learn the whole block, not the preposition in isolation.',
    ),
    microTask: tri(
      'Выбери предлог, который завершает устойчивую связку verb + preposition.',
      'Обери прийменник, який завершує сталий зв’язок verb + preposition.',
      'Choose the preposition that completes the fixed verb + preposition pattern.',
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
      'Запомни связки блоками: listen to, wait for, depend on, look at, talk to, think about, ask for, believe in.',
      'Запам’ятай зв’язки блоками: listen to, wait for, depend on, look at, talk to, think about, ask for, believe in.',
      'Remember the chunks: listen to, wait for, depend on, look at, talk to, think about, ask for, believe in.',
    ),
    focusWords: input.focusWords,
  };
}

export const PREPOSITION_COMMON_VERB_PATTERNS_TRAINING: DiagnosisTraining = {
  id: 'preposition_common_verb_patterns',
  category: 'preposition',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 29,
  supportedLocales: ['ru', 'uk'],
  title: tri(
    'Listen to / Wait for / Depend on: предлог после глагола',
    'Listen to / Wait for / Depend on: прийменник після дієслова',
    'Listen to / Wait for / Depend on: preposition after the verb',
  ),
  shortTitle: tri('Verb + Preposition', 'Verb + Preposition', 'Verb + Preposition'),
  shortDiagnosis: tri(
    'Ты путаешь устойчивые связки verb + preposition: listen to, wait for, depend on, look at, talk to, think about.',
    'Ти плутаєш сталі зв’язки verb + preposition: listen to, wait for, depend on, look at, talk to, think about.',
    'You are mixing fixed verb + preposition patterns like listen to, wait for, depend on, and look at.',
  ),
  diagnosisText: tri(
    'Ты путаешь устойчивые связки verb + preposition: listen to, wait for, depend on, look at, talk to, think about. Главная проблема в том, что в английском предлог часто нельзя выбрать по русскому переводу. Его нужно знать как часть связки с конкретным глаголом.',
    'Ти плутаєш сталі зв’язки verb + preposition: listen to, wait for, depend on, look at, talk to, think about. Головна проблема в тому, що в англійській прийменник часто не можна вибрати за перекладом. Його потрібно знати як частину зв’язку з конкретним дієсловом.',
    'You are mixing fixed verb + preposition patterns. In English, the preposition often belongs to the verb pattern and cannot be chosen from translation alone.',
  ),
  mentalModel: tri(
    'Некоторые английские глаголы тянут за собой конкретный предлог. Не listen music, а listen to music. Не wait me, а wait for me. Не depend from, а depend on.',
    'Деякі англійські дієслова тягнуть за собою конкретний прийменник. Не listen music, а listen to music. Не wait me, а wait for me. Не depend from, а depend on.',
    'Some English verbs pull a fixed preposition with them: listen to music, wait for me, depend on the situation.',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'Listen to music. Wait for me. Depend on the situation. Look at the screen. Talk to him. Think about it. Ask for help. Believe in yourself.',
    'Listen to music. Wait for me. Depend on the situation. Look at the screen. Talk to him. Think about it. Ask for help. Believe in yourself.',
    'Listen to music. Wait for me. Depend on the situation. Look at the screen. Talk to him. Think about it. Ask for help. Believe in yourself.',
  ),
  whatUserMustLearn: {
    ru: [
      'После listen нужен to: listen to music, listen to me.',
      'После wait нужен for, если говорим кого/что ждем: wait for me, wait for the bus.',
      'После depend нужен on: It depends on the situation.',
      'После look нужен at, если направляем взгляд на объект: look at the screen.',
      'После talk часто нужен to или with: talk to him, talk with her.',
      'После think часто нужен about, если думаем о теме: think about it.',
      'После ask нужен for, если просим что-то: ask for help, ask for money.',
      'После believe часто нужен in, если речь о вере в идею/человека/себя: believe in yourself.',
      'Нельзя выбирать предлог только по русскому “на/о/к/за”. В английском важна связка.',
      'Такие связки лучше хранить блоками: listen to, wait for, depend on, look at.',
    ],
    uk: [
      'Після listen потрібен to: listen to music, listen to me.',
      'Після wait потрібен for, якщо говоримо кого/що чекаємо: wait for me, wait for the bus.',
      'Після depend потрібен on: It depends on the situation.',
      'Після look потрібен at, якщо спрямовуємо погляд на об’єкт: look at the screen.',
      'Після talk часто потрібен to або with: talk to him, talk with her.',
      'Після think часто потрібен about, якщо думаємо про тему: think about it.',
      'Після ask потрібен for, якщо просимо щось: ask for help, ask for money.',
      'Після believe часто потрібен in, якщо йдеться про віру в ідею/людину/себе: believe in yourself.',
      'Не можна обирати прийменник тільки за українським “на/про/до/за”. В англійській важливий зв’язок.',
      'Такі зв’язки краще зберігати блоками: listen to, wait for, depend on, look at.',
    ],
    es: [
      'After listen, use to: listen to music.',
      'After wait, use for when you name the person or thing: wait for me.',
      'After depend, use on: depends on the weather.',
      'Look at means direct your eyes at an object.',
      'Talk to names the person; talk about names the topic.',
      'Think about names the topic in your mind.',
      'Ask for means request something.',
      'Believe in means have faith in a person, idea, or ability.',
    ],
  },
  examples: [
    { en: 'I listen to music every day.', ru: 'Я слушаю музыку каждый день.', uk: 'Я слухаю музику щодня.', es: 'I listen to music every day.', why: tri('В английском listen требует to перед объектом: listen to music.', 'В англійській listen потребує to перед object: listen to music.', 'Listen takes to before the object: listen to music.') },
    { en: 'Please wait for me.', ru: 'Пожалуйста, подожди меня.', uk: 'Будь ласка, почекай мене.', es: 'Please wait for me.', why: tri('Wait требует for, когда говорим, кого ждем: wait for me.', 'Wait потребує for, коли говоримо, кого чекаємо: wait for me.', 'Wait takes for before the person or thing: wait for me.') },
    { en: 'It depends on the weather.', ru: 'Это зависит от погоды.', uk: 'Це залежить від погоди.', es: 'It depends on the weather.', why: tri('Depend устойчиво используется с on: depend on the weather.', 'Depend стало використовується з on: depend on the weather.', 'Depend is used with on: depend on the weather.') },
    { en: 'Look at the screen.', ru: 'Посмотри на экран.', uk: 'Подивися на екран.', es: 'Look at the screen.', why: tri('Look at = направить взгляд на объект.', 'Look at = спрямувати погляд на object.', 'Look at means direct your eyes at an object.') },
    { en: 'I need to talk to you.', ru: 'Мне нужно поговорить с тобой.', uk: 'Мені потрібно поговорити з тобою.', es: 'I need to talk to you.', why: tri('Talk to показывает адресата разговора: talk to you.', 'Talk to показує адресата розмови: talk to you.', 'Talk to names the person you speak with.') },
    { en: 'Think about your answer.', ru: 'Подумай о своём ответе.', uk: 'Подумай про свою відповідь.', es: 'Think about your answer.', why: tri('Think about используется, когда речь о теме мысли.', 'Think about використовується, коли йдеться про тему думки.', 'Think about names the topic of thought.') },
    { en: 'She asked for help.', ru: 'Она попросила помощи.', uk: 'Вона попросила допомоги.', es: 'She asked for help.', why: tri('Ask for = просить что-то. Help - то, что она просила.', 'Ask for = просити щось. Help - те, що вона просила.', 'Ask for means request something.') },
    { en: 'You have to believe in yourself.', ru: 'Ты должен верить в себя.', uk: 'Ти маєш вірити в себе.', es: 'You have to believe in yourself.', why: tri('Believe in используется для веры в человека, идею или способность.', 'Believe in використовується для віри в людину, ідею або здатність.', 'Believe in is used for faith in a person, idea, or ability.') },
  ],
  introBlocks: [
    {
      id: 'intro_problem',
      type: 'diagnosis',
      text: tri(
        'Похоже, ты пытаешься выбирать предлог логикой перевода. Но в английском часть предлогов живет не отдельно, а как хвост конкретного глагола: listen to, wait for, depend on.',
        'Схоже, ти намагаєшся обирати прийменник логікою перекладу. Але в англійській частина прийменників живе не окремо, а як хвіст конкретного дієслова: listen to, wait for, depend on.',
        'It looks like you are choosing the preposition from translation. In English, many prepositions live as part of the verb pattern.',
      ),
    },
    {
      id: 'intro_rule',
      type: 'rule',
      text: tri(
        'Не учи отдельно listen и отдельно to. Учи блоком: listen to. Не wait отдельно и for отдельно. Блок: wait for.',
        'Не вчи окремо listen і окремо to. Вчи блоком: listen to. Не wait окремо і for окремо. Блок: wait for.',
        'Do not learn listen and to separately. Learn the chunk: listen to. Same for wait for.',
      ),
    },
    {
      id: 'intro_warning',
      type: 'warning',
      text: tri(
        'Самые частые ошибки: listen music, wait me, depend from, look on. Правильно: listen to music, wait for me, depend on, look at.',
        'Найчастіші помилки: listen music, wait me, depend from, look on. Правильно: listen to music, wait for me, depend on, look at.',
        'Common mistakes: listen music, wait me, depend from, look on. Correct: listen to music, wait for me, depend on, look at.',
      ),
    },
  ],
  steps: [
    step({ id: 'verb_prep_easy_001', order: 1, difficulty: 'easy', targetSkill: 'listen_to', sentence: 'I listen ___ music every day.', translation: tri('Я слушаю музыку каждый день.', 'Я слухаю музику щодня.', 'I listen to music every day.'), options: ['to', 'for', 'on', 'at'], correctAnswer: 'to', correctFeedback: tri('Да. После listen перед объектом нужен to: listen to music.', 'Так. Після listen перед object потрібен to: listen to music.', 'Yes. Listen takes to: listen to music.'), wrong: { for: tri('Listen for значит прислушиваться к звуку, который ждешь. Здесь обычное “слушать музыку”: listen to music.', 'Listen for означає прислухатися до звуку, який чекаєш. Тут звичайне “слухати музику”: listen to music.', 'Listen for has a different meaning. Here you need listen to music.'), on: tri('Listen on music неправильно. Устойчивый блок: listen to music.', 'Listen on music неправильно. Сталий блок: listen to music.', 'Listen on music is not the pattern. Use listen to music.'), at: tri('Listen at music неправильно. После listen нужен to.', 'Listen at music неправильно. Після listen потрібен to.', 'Listen at music is wrong here. Use listen to.') }, retryFeedback: [tri('Слушать что-то = listen to.', 'Слухати щось = listen to.', 'Listen to something = listen to.'), tri('Listen to music.'), tri('Подсказка: I listen to music every day.', 'Підказка: I listen to music every day.', 'Hint: I listen to music every day.')], focusWords: ['listen to', 'music'] }),
    step({ id: 'verb_prep_easy_002', order: 2, difficulty: 'easy', targetSkill: 'wait_for', sentence: 'Please wait ___ me.', translation: tri('Пожалуйста, подожди меня.', 'Будь ласка, почекай мене.', 'Please wait for me.'), options: ['to', 'for', 'on', 'at'], correctAnswer: 'for', correctFeedback: tri('Да. Wait for someone = ждать кого-то.', 'Так. Wait for someone = чекати когось.', 'Yes. Wait for someone.'), wrong: { to: tri('Wait to me неправильно. Когда ждешь человека, нужен wait for me.', 'Wait to me неправильно. Коли чекаєш людину, потрібен wait for me.', 'Wait to me is wrong. Use wait for me.'), on: tri('Wait on может существовать в других значениях, но “подожди меня” = wait for me.', 'Wait on може існувати в інших значеннях, але “почекай мене” = wait for me.', 'Wait on has other meanings. Here use wait for me.'), at: tri('Wait at обычно требует место: wait at the station. Здесь человек, поэтому wait for me.', 'Wait at зазвичай потребує місце: wait at the station. Тут людина, тому wait for me.', 'Wait at takes a place. For a person, use wait for me.') }, retryFeedback: [tri('Ждать кого-то = wait for.', 'Чекати когось = wait for.', 'Wait for someone = wait for.'), tri('Wait for me.'), tri('Подсказка: Please wait for me.', 'Підказка: Please wait for me.', 'Hint: Please wait for me.')], focusWords: ['wait for', 'me'] }),
    step({ id: 'verb_prep_easy_003', order: 3, difficulty: 'easy', targetSkill: 'wait_for_bus', sentence: 'We are waiting ___ the bus.', translation: tri('Мы ждем автобус.', 'Ми чекаємо автобус.', 'We are waiting for the bus.'), options: ['to', 'for', 'on', 'at'], correctAnswer: 'for', correctFeedback: tri('Да. Wait for the bus = ждать автобус.', 'Так. Wait for the bus = чекати автобус.', 'Yes. Wait for the bus.'), wrong: { to: tri('Wait to the bus неправильно. Ждать автобус = wait for the bus.', 'Wait to the bus неправильно. Чекати автобус = wait for the bus.', 'Wait to the bus is wrong. Use wait for the bus.'), on: tri('Waiting on the bus может значить “ждать в автобусе/на автобусе” в другом контексте. Здесь ждём автобус: for.', 'Waiting on the bus може означати “чекати в автобусі/на автобусі” в іншому контексті. Тут чекаємо автобус: for.', 'Waiting on the bus can mean a different location. Here use waiting for the bus.'), at: tri('Wait at используется с местом: wait at the bus stop. Здесь ждём сам автобус: wait for the bus.', 'Wait at використовується з місцем: wait at the bus stop. Тут чекаємо сам автобус: wait for the bus.', 'Wait at takes a place. Here the bus is what you wait for.') }, retryFeedback: [tri('Ждать что-то = wait for.', 'Чекати щось = wait for.', 'Wait for something = wait for.'), tri('Waiting for the bus.'), tri('Подсказка: We are waiting for the bus.', 'Підказка: We are waiting for the bus.', 'Hint: We are waiting for the bus.')], focusWords: ['waiting for', 'bus'] }),
    step({ id: 'verb_prep_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'depend_on', sentence: 'It depends ___ the weather.', translation: tri('Это зависит от погоды.', 'Це залежить від погоди.', 'It depends on the weather.'), options: ['from', 'on', 'at', 'to'], correctAnswer: 'on', correctFeedback: tri('Да. Depend требует on: depends on the weather.', 'Так. Depend потребує on: depends on the weather.', 'Yes. Depend takes on.'), wrong: { from: tri('По-русски “зависит от”, но в английском блок другой: depend on.', 'Українською “залежить від”, але в англійській блок інший: depend on.', 'Translation may suggest from, but English uses depend on.'), at: tri('Depend at неправильно. Устойчивый блок: depend on.', 'Depend at неправильно. Сталий блок: depend on.', 'Depend at is wrong. Use depend on.'), to: tri('Depend to неправильно. Нужно depend on.', 'Depend to неправильно. Потрібно depend on.', 'Depend to is wrong. Use depend on.') }, retryFeedback: [tri('Зависит от = depends on.', 'Залежить від = depends on.', 'Depend = depend on.'), tri('Depends on the weather.'), tri('Подсказка: It depends on the weather.', 'Підказка: It depends on the weather.', 'Hint: It depends on the weather.')], focusWords: ['depends on', 'weather'] }),
    step({ id: 'verb_prep_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'look_at', sentence: 'Look ___ the screen.', translation: tri('Посмотри на экран.', 'Подивися на екран.', 'Look at the screen.'), options: ['to', 'for', 'on', 'at'], correctAnswer: 'at', correctFeedback: tri('Да. Look at = направить взгляд на объект.', 'Так. Look at = спрямувати погляд на object.', 'Yes. Look at means direct your eyes at something.'), wrong: { to: tri('Look to может быть в других значениях, но “посмотри на экран” = look at the screen.', 'Look to може бути в інших значеннях, але “подивися на екран” = look at the screen.', 'Look to has other uses. Here use look at the screen.'), for: tri('Look for значит искать. Здесь не искать экран, а смотреть на экран: look at.', 'Look for означає шукати. Тут не шукати екран, а дивитися на екран: look at.', 'Look for means search. Here you need look at the screen.'), on: tri('Look on the screen может значить “посмотри на экране” в другом контексте. Направить взгляд на экран = look at the screen.', 'Look on the screen може означати “подивися на екрані” в іншому контексті. Спрямувати погляд на екран = look at the screen.', 'Look on the screen has another meaning. For directing your eyes, use look at.') }, retryFeedback: [tri('Смотреть на объект = look at.', 'Дивитися на object = look at.', 'Look at an object = look at.'), tri('Look at the screen.'), tri('Подсказка: Look at the screen.', 'Підказка: Look at the screen.', 'Hint: Look at the screen.')], focusWords: ['look at', 'screen'] }),
    step({ id: 'verb_prep_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'look_for_vs_look_at', sentence: 'I am looking ___ my keys.', translation: tri('Я ищу свои ключи.', 'Я шукаю свої ключі.', 'I am looking for my keys.'), options: ['at', 'for', 'to', 'on'], correctAnswer: 'for', correctFeedback: tri('Да. Look for = искать. Looking for my keys = ищу ключи.', 'Так. Look for = шукати. Looking for my keys = шукаю ключі.', 'Yes. Look for means search for.'), wrong: { at: tri('Look at значит смотреть на объект. Но здесь “ищу ключи”, поэтому look for.', 'Look at означає дивитися на object. Але тут “шукаю ключі”, тому look for.', 'Look at means direct your eyes at something. Here use look for.'), to: tri('Looking to my keys не значит искать ключи. Нужно looking for my keys.', 'Looking to my keys не означає шукати ключі. Потрібно looking for my keys.', 'Looking to my keys does not mean searching. Use looking for.'), on: tri('Looking on my keys не значит искать ключи. Нужно looking for.', 'Looking on my keys не означає шукати ключі. Потрібно looking for.', 'Looking on my keys is not the search pattern. Use looking for.') }, retryFeedback: [tri('Искать = look for.', 'Шукати = look for.', 'Search = look for.'), tri('Looking for my keys.'), tri('Подсказка: I am looking for my keys.', 'Підказка: I am looking for my keys.', 'Hint: I am looking for my keys.')], focusWords: ['looking for', 'keys'] }),
    step({ id: 'verb_prep_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'talk_to', sentence: 'I need to talk ___ you.', translation: tri('Мне нужно поговорить с тобой.', 'Мені потрібно поговорити з тобою.', 'I need to talk to you.'), options: ['to', 'for', 'on', 'at'], correctAnswer: 'to', correctFeedback: tri('Да. Talk to someone = говорить с кем-то.', 'Так. Talk to someone = говорити з кимось.', 'Yes. Talk to someone.'), wrong: { for: tri('Talk for you может значить говорить вместо тебя/в твою пользу. Здесь поговорить с тобой = talk to you.', 'Talk for you може означати говорити замість тебе/на твою користь. Тут поговорити з тобою = talk to you.', 'Talk for you has another meaning. Here use talk to you.'), on: tri('Talk on you неправильно. Адресат разговора = talk to you.', 'Talk on you неправильно. Адресат розмови = talk to you.', 'Talk on you is wrong here. Use talk to you.'), at: tri('Talk at someone звучит как говорить на человека, часто без нормального диалога. Нейтрально: talk to you.', 'Talk at someone звучить як говорити на людину, часто без нормального діалогу. Нейтрально: talk to you.', 'Talk at someone sounds one-way. Neutral pattern: talk to you.') }, retryFeedback: [tri('Говорить с человеком = talk to.', 'Говорити з людиною = talk to.', 'Talk to a person = talk to.'), tri('Talk to you.'), tri('Подсказка: I need to talk to you.', 'Підказка: I need to talk to you.', 'Hint: I need to talk to you.')], focusWords: ['talk to', 'you'] }),
    step({ id: 'verb_prep_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'think_about', sentence: 'Think ___ your answer.', translation: tri('Подумай о своём ответе.', 'Подумай про свою відповідь.', 'Think about your answer.'), options: ['to', 'for', 'about', 'at'], correctAnswer: 'about', correctFeedback: tri('Да. Think about = думать о теме.', 'Так. Think about = думати про тему.', 'Yes. Think about names the topic.'), wrong: { to: tri('Think to your answer неправильно. Тема мысли = think about your answer.', 'Think to your answer неправильно. Тема думки = think about your answer.', 'Think to your answer is wrong. Use think about your answer.'), for: tri('Think for может встречаться в других структурах, но “подумай о” = think about.', 'Think for може зустрічатися в інших структурах, але “подумай про” = think about.', 'Think for has other uses. Here use think about.'), at: tri('Think at неправильно для темы мысли. Нужно think about.', 'Think at неправильно для теми думки. Потрібно think about.', 'Think at is wrong for a topic. Use think about.') }, retryFeedback: [tri('Думать о теме = think about.', 'Думати про тему = think about.', 'Think about a topic = think about.'), tri('Think about your answer.'), tri('Подсказка: Think about your answer.', 'Підказка: Think about your answer.', 'Hint: Think about your answer.')], focusWords: ['think about', 'answer'] }),
    step({ id: 'verb_prep_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'talk_about', sentence: 'We talked ___ the problem.', translation: tri('Мы поговорили о проблеме.', 'Ми поговорили про проблему.', 'We talked about the problem.'), options: ['to', 'for', 'about', 'at'], correctAnswer: 'about', correctFeedback: tri('Да. Talk about = говорить о теме.', 'Так. Talk about = говорити про тему.', 'Yes. Talk about names the topic.'), wrong: { to: tri('Talk to показывает человека, с кем говорим. Здесь тема разговора: talk about the problem.', 'Talk to показує людину, з ким говоримо. Тут тема розмови: talk about the problem.', 'Talk to names the person. Here the problem is the topic: talk about.'), for: tri('Talk for не передает “о проблеме”. Тема разговора = about.', 'Talk for не передає “про проблему”. Тема розмови = about.', 'Talk for does not name the topic. Use talk about.'), at: tri('Talk at the problem неправильно. О теме говорим через about.', 'Talk at the problem неправильно. Про тему говоримо через about.', 'Talk at the problem is wrong. Use talk about.') }, retryFeedback: [tri('Говорить о теме = talk about.', 'Говорити про тему = talk about.', 'Talk about a topic = talk about.'), tri('Talked about the problem.'), tri('Подсказка: We talked about the problem.', 'Підказка: We talked about the problem.', 'Hint: We talked about the problem.')], focusWords: ['talk about', 'problem'] }),
    step({ id: 'verb_prep_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'ask_for', sentence: 'She asked ___ help.', translation: tri('Она попросила помощи.', 'Вона попросила допомоги.', 'She asked for help.'), options: ['to', 'for', 'about', 'at'], correctAnswer: 'for', correctFeedback: tri('Да. Ask for help = попросить помощи.', 'Так. Ask for help = попросити допомоги.', 'Yes. Ask for help means request help.'), wrong: { to: tri('Ask to help означает попросить кого-то сделать действие в другой структуре. Просить помощь = ask for help.', 'Ask to help означає попросити когось зробити дію в іншій структурі. Просити допомогу = ask for help.', 'Ask to help is another structure. Request help = ask for help.'), about: tri('Ask about значит спрашивать о теме. Здесь она просила помощь, поэтому ask for help.', 'Ask about означає питати про тему. Тут вона просила допомогу, тому ask for help.', 'Ask about means ask about a topic. Here she requested help: ask for help.'), at: tri('Ask at help неправильно. Нужен блок ask for help.', 'Ask at help неправильно. Потрібен блок ask for help.', 'Ask at help is wrong. Use ask for help.') }, retryFeedback: [tri('Просить что-то = ask for.', 'Просити щось = ask for.', 'Request something = ask for.'), tri('Ask for help.'), tri('Подсказка: She asked for help.', 'Підказка: She asked for help.', 'Hint: She asked for help.')], focusWords: ['ask for', 'help'] }),
    step({ id: 'verb_prep_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'believe_in', sentence: 'You have to believe ___ yourself.', translation: tri('Ты должен верить в себя.', 'Ти маєш вірити в себе.', 'You have to believe in yourself.'), options: ['to', 'for', 'in', 'at'], correctAnswer: 'in', correctFeedback: tri('Да. Believe in yourself = верить в себя.', 'Так. Believe in yourself = вірити в себе.', 'Yes. Believe in yourself.'), wrong: { to: tri('Believe to yourself неправильно. Верить в себя = believe in yourself.', 'Believe to yourself неправильно. Вірити в себе = believe in yourself.', 'Believe to yourself is wrong. Use believe in yourself.'), for: tri('Believe for yourself не передает “верить в себя”. Нужен believe in yourself.', 'Believe for yourself не передає “вірити в себе”. Потрібен believe in yourself.', 'Believe for yourself does not mean believe in yourself.'), at: tri('Believe at yourself неправильно. Устойчивый блок: believe in.', 'Believe at yourself неправильно. Сталий блок: believe in.', 'Believe at yourself is wrong. Use believe in.') }, retryFeedback: [tri('Верить в = believe in.', 'Вірити в = believe in.', 'Believe in = believe in.'), tri('Believe in yourself.'), tri('Подсказка: You have to believe in yourself.', 'Підказка: You have to believe in yourself.', 'Hint: You have to believe in yourself.')], focusWords: ['believe in', 'yourself'] }),
    step({ id: 'verb_prep_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'ask_about_topic', sentence: 'He asked ___ the price.', translation: tri('Он спросил о цене.', 'Він запитав про ціну.', 'He asked about the price.'), options: ['for', 'about', 'to', 'at'], correctAnswer: 'about', correctFeedback: tri('Да. Ask about = спрашивать о теме. Price - тема вопроса.', 'Так. Ask about = питати про тему. Price - тема питання.', 'Yes. Ask about names the topic.'), wrong: { for: tri('Ask for the price может звучать как попросить назвать цену, но базово “спросил о цене” = asked about the price.', 'Ask for the price може звучати як попросити назвати ціну, але базово “запитав про ціну” = asked about the price.', 'Ask for the price can mean request the price. For the topic, use asked about the price.'), to: tri('Asked to the price неправильно. О теме вопроса говорим через about.', 'Asked to the price неправильно. Про тему питання говоримо через about.', 'Asked to the price is wrong. Use asked about.'), at: tri('Asked at the price неправильно. Нужна форма asked about the price.', 'Asked at the price неправильно. Потрібна форма asked about the price.', 'Asked at the price is wrong. Use asked about the price.') }, retryFeedback: [tri('Спрашивать о теме = ask about.', 'Питати про тему = ask about.', 'Ask about a topic = ask about.'), tri('Asked about the price.'), tri('Подсказка: He asked about the price.', 'Підказка: He asked about the price.', 'Hint: He asked about the price.')], focusWords: ['ask about', 'price'] }),
    step({ id: 'verb_prep_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_listen_wait', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.', 'Choose the correct pair.'), options: ['listen to music / wait for me', 'listen music / wait me', 'listen for music / wait to me', 'listen at music / wait on me'], correctAnswer: 'listen to music / wait for me', correctFeedback: tri('Да. Listen to music. Wait for me.', 'Так. Listen to music. Wait for me.', 'Yes. Listen to music. Wait for me.'), wrong: { 'listen music / wait me': tri('В обеих фразах пропущены нужные предлоги. Нужно listen to и wait for.', 'В обох фразах пропущені потрібні прийменники. Потрібно listen to і wait for.', 'Both phrases are missing required prepositions: listen to and wait for.'), 'listen for music / wait to me': tri('Listen for имеет другой смысл, а wait to me неправильно. Нужна пара listen to / wait for.', 'Listen for має інший сенс, а wait to me неправильно. Потрібна пара listen to / wait for.', 'Listen for has another meaning, and wait to me is wrong. Use listen to / wait for.'), 'listen at music / wait on me': tri('Listen at music неправильно. Wait on me не нейтрально для “подожди меня”. Нужна пара listen to / wait for.', 'Listen at music неправильно. Wait on me не нейтрально для “почекай мене”. Потрібна пара listen to / wait for.', 'Listen at music is wrong. Use listen to / wait for.') }, retryFeedback: [tri('Listen to. Wait for.', 'Listen to. Wait for.', 'Listen to. Wait for.'), tri('Listen to music / wait for me.'), tri('Подсказка: listen to music / wait for me.', 'Підказка: listen to music / wait for me.', 'Hint: listen to music / wait for me.')], focusWords: ['listen to', 'wait for'] }),
    step({ id: 'verb_prep_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_depend_look', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.', 'Choose the correct pair.'), options: ['depend on the situation / look at the screen', 'depend from the situation / look on the screen', 'depend to the situation / look for the screen', 'depend at the situation / look to the screen'], correctAnswer: 'depend on the situation / look at the screen', correctFeedback: tri('Да. Depend on. Look at.', 'Так. Depend on. Look at.', 'Yes. Depend on. Look at.'), wrong: { 'depend from the situation / look on the screen': tri('По-русски “зависит от”, но английский блок depend on. Смотреть на экран = look at.', 'Українською “залежить від”, але англійський блок depend on. Дивитися на екран = look at.', 'Translation may suggest from, but English uses depend on. Looking at a screen = look at.'), 'depend to the situation / look for the screen': tri('Depend to неправильно. Look for значит искать экран, а не смотреть на экран.', 'Depend to неправильно. Look for означає шукати екран, а не дивитися на екран.', 'Depend to is wrong. Look for means search, not look at.'), 'depend at the situation / look to the screen': tri('Depend at неправильно. Look to the screen не передает обычное “смотреть на экран”.', 'Depend at неправильно. Look to the screen не передає звичайне “дивитися на екран”.', 'Depend at is wrong. Look to the screen does not mean look at the screen here.') }, retryFeedback: [tri('Depend on. Look at.', 'Depend on. Look at.', 'Depend on. Look at.'), tri('Depend on / look at.'), tri('Подсказка: depend on the situation / look at the screen.', 'Підказка: depend on the situation / look at the screen.', 'Hint: depend on the situation / look at the screen.')], focusWords: ['depend on', 'look at'] }),
    step({ id: 'verb_prep_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.', 'Choose the correct sentence.'), options: ['I listened to him, waited for him, and talked to him.', 'I listened him, waited him, and talked him.', 'I listened at him, waited to him, and talked for him.', 'I listened for him, waited at him, and talked on him.'], correctAnswer: 'I listened to him, waited for him, and talked to him.', correctFeedback: tri('Да. Listen to, wait for, talk to.', 'Так. Listen to, wait for, talk to.', 'Yes. Listen to, wait for, talk to.'), wrong: { 'I listened him, waited him, and talked him.': tri('После listen, wait и talk здесь нужны предлоги: to, for, to.', 'Після listen, wait і talk тут потрібні прийменники: to, for, to.', 'After listen, wait, and talk, you need prepositions here: to, for, to.'), 'I listened at him, waited to him, and talked for him.': tri('Предлоги выбраны неверно. Нужны блоки: listened to, waited for, talked to.', 'Прийменники обрані неправильно. Потрібні блоки: listened to, waited for, talked to.', 'The prepositions are wrong. Use listened to, waited for, talked to.'), 'I listened for him, waited at him, and talked on him.': tri('Listen for, wait at и talk on дают другие или неправильные смыслы. Нужна базовая связка: listened to, waited for, talked to.', 'Listen for, wait at і talk on дають інші або неправильні сенси. Потрібен базовий зв’язок: listened to, waited for, talked to.', 'Listen for, wait at, and talk on have other or wrong meanings. Use listened to, waited for, talked to.') }, retryFeedback: [tri('Listen to. Wait for. Talk to.', 'Listen to. Wait for. Talk to.', 'Listen to. Wait for. Talk to.'), tri('Listened to him / waited for him / talked to him.'), tri('Подсказка: I listened to him, waited for him, and talked to him.', 'Підказка: I listened to him, waited for him, and talked to him.', 'Hint: I listened to him, waited for him, and talked to him.')], focusWords: ['listened to', 'waited for', 'talked to'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'listen_missing_to_error',
      'wait_missing_for_error',
      'depend_wrong_preposition_error',
      'look_wrong_preposition_error',
      'talk_wrong_preposition_error',
      'think_wrong_preposition_error',
      'ask_for_error',
      'believe_in_error',
      'translation_based_preposition_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Показываем глагол и его устойчивый предлог.', 'Показуємо дієслово і його сталий прийменник.', 'Show the verb and its fixed preposition.'),
    depth2: tri('Напоминаем готовый блок verb + preposition.', 'Нагадуємо готовий блок verb + preposition.', 'Remind the ready-made verb + preposition chunk.'),
    depth3: tri('Даем пару ошибка → правильный блок.', 'Даємо пару помилка → правильний блок.', 'Show mistake → correct chunk.'),
    depth4: tri('Почти подсказка: прямо указываем нужный предлог.', 'Майже підказка: прямо вказуємо потрібний прийменник.', 'Almost a hint: directly point to the needed preposition.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        'Остановись. Не переводи предлог отдельно. Вспоминай связку целиком: listen to, wait for, depend on, look at, talk to, think about, ask for, believe in.',
        'Зупинись. Не перекладай прийменник окремо. Згадуй зв’язок цілком: listen to, wait for, depend on, look at, talk to, think about, ask for, believe in.',
        'Pause. Do not translate the preposition separately. Recall the whole chunk: listen to, wait for, depend on, look at.',
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_verb_pattern_hint_then_retry',
      card: tri(
        'Подсказка по глаголу: система покажет сам глагол и тип связки, но не выберет предлог за пользователя.',
        'Підказка за дієсловом: система покаже саме дієслово і тип зв’язку, але не вибере прийменник за користувача.',
        'Verb-pattern hint: the system shows the verb and pattern type, but does not choose the preposition for the learner.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        'Режим подсказки: сначала выбери глагол. Потом система покажет список его возможных связок и вернет тебя к упражнению.',
        'Режим підказки: спочатку обери дієслово. Потім система покаже список його можливих зв’язків і поверне тебе до вправи.',
        'Guided mode: first choose the verb. Then the system shows possible chunks and returns you to the exercise.',
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_verb_prep_001', prompt: tri('Listen к объекту обычно идет с to или for?', 'Listen до object зазвичай іде з to чи for?', 'Before an object, does listen usually take to or for?'), options: ['to', 'for'], correctIndex: 0, thenReturnToExerciseId: 'verb_prep_easy_001' },
      { id: 'guided_verb_prep_002', prompt: tri('Wait кого-то обычно идет с to или for?', 'Wait когось зазвичай іде з to чи for?', 'When waiting for a person, does wait take to or for?'), options: ['to', 'for'], correctIndex: 1, thenReturnToExerciseId: 'verb_prep_easy_002' },
      { id: 'guided_verb_prep_003', prompt: tri('Depend обычно идет с from или on?', 'Depend зазвичай іде з from чи on?', 'Does depend usually take from or on?'), options: ['from', 'on'], correctIndex: 1, thenReturnToExerciseId: 'verb_prep_contrast_001' },
      { id: 'guided_verb_prep_004', prompt: tri('Look at значит смотреть на объект или искать объект?', 'Look at означає дивитися на object чи шукати object?', 'Does look at mean look at an object or search for an object?'), options: ['смотреть на объект', 'искать объект'], correctIndex: 0, thenReturnToExerciseId: 'verb_prep_contrast_002' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'preposition',
    microDiagnosisId: 'preposition_common_verb_patterns',
    diagnosisLabel: tri('Verb + Preposition', 'Verb + Preposition', 'Verb + Preposition'),
    contrastSet: CONTRAST,
    focusWords: ['listen to', 'wait for', 'depend on', 'look at', 'talk to', 'think about', 'ask for', 'believe in'],
    focusPatterns: [
      'listen_to',
      'wait_for',
      'wait_for_bus',
      'depend_on',
      'look_at',
      'look_for_vs_look_at',
      'talk_to',
      'think_about',
      'talk_about',
      'ask_for',
      'believe_in',
      'ask_about_topic',
      'mixed_listen_wait',
      'mixed_depend_look',
      'mixed_sentence_correction',
    ],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_preposition_common_verb_patterns_start',
    answer: 'diagnosis_training_preposition_common_verb_patterns_answer',
    mastery: 'diagnosis_training_preposition_common_verb_patterns_mastery',
    fallback: 'diagnosis_training_preposition_common_verb_patterns_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: {
      category: 'preposition',
      microDiagnosisId: 'preposition_common_verb_patterns',
      contrastSet: CONTRAST,
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logVerbPattern: true,
      logPreposition: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=preposition&microDiagnosisId=preposition_common_verb_patterns',
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


