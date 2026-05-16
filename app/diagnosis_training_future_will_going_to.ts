import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = ['will', 'going to', 'instant decision', 'promise', 'prediction', 'plan', 'intention', 'evidence'];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'Сначала реши смысл будущего: решение сейчас, обещание, прогноз, план или видимый признак.',
      'Спочатку виріши сенс майбутнього: рішення зараз, обіцянка, прогноз, план або видима ознака.',
    ),
    depth2,
    depth3,
    depth4,
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Не эта future form. Здесь нужно ${correct}.`,
    `Не ця future form. Тут потрібно ${correct}.`,
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
      'Will часто показывает решение сейчас, обещание или прогноз. Going to часто показывает уже готовый план, намерение или видимый признак.',
      'Will часто показує рішення зараз, обіцянку або прогноз. Going to часто показує вже готовий план, намір або видиму ознаку.',
    ),
    microTask: tri(
      'Выбери future form и проверь структуру: will + base verb или am/is/are going to + base verb.',
      'Обери future form і перевір структуру: will + base verb або am/is/are going to + base verb.',
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
      'Правило: will + base verb без to. Going to требует be: I am going to, she is going to, they are going to. После going to тоже нужен base verb.',
      'Правило: will + base verb без to. Going to потребує be: I am going to, she is going to, they are going to. Після going to теж потрібен base verb.',
    ),
    focusWords: input.focusWords,
  };
}

export const FUTURE_WILL_GOING_TO_TRAINING: DiagnosisTraining = {
  id: 'future_will_going_to',
  category: 'verb',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 27,
  supportedLocales: ['ru', 'uk'],
  title: tri('Will / Going to: будущее, решение, план', 'Will / Going to: майбутнє, рішення, план'),
  shortTitle: tri('Will / Going to', 'Will / Going to'),
  shortDiagnosis: tri(
    'Ты путаешь will и going to: решение сейчас, обещание или прогноз против уже готового плана.',
    'Ти плутаєш will і going to: рішення зараз, обіцянка або прогноз проти вже готового плану.',
  ),
  diagnosisText: tri(
    'Ты путаешь will и going to. Обе формы могут переводиться как "буду", но английский часто различает: will для решения в момент речи, обещания или прогноза, а going to для уже существующего плана или намерения.',
    'Ти плутаєш will і going to. Обидві форми можуть перекладатися як "буду", але англійська часто розрізняє: will для рішення в момент мовлення, обіцянки або прогнозу, а going to для вже існуючого плану або наміру.',
  ),
  mentalModel: tri(
    'Will часто звучит как "я сейчас решил / обещаю / думаю, что случится". Going to часто звучит как "я уже собираюсь / у меня уже есть план / это явно идет к этому".',
    'Will часто звучить як "я зараз вирішив / обіцяю / думаю, що станеться". Going to часто звучить як "я вже збираюся / у мене вже є план / це явно до цього йде".',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'Will + base verb: I will help you. Going to + base verb: I am going to study tonight. После will не ставим to. После going to нужен be: am/is/are going to.',
    'Will + base verb: I will help you. Going to + base verb: I am going to study tonight. Після will не ставимо to. Після going to потрібен be: am/is/are going to.',
  ),
  whatUserMustLearn: {
    ru: [
      'Will используется для решения в момент речи: I will call him now.',
      'Will используется для обещания: I will help you.',
      'Will используется для прогноза или мнения о будущем: I think it will rain.',
      'Going to используется для уже существующего плана: I am going to study tonight.',
      'Going to используется для намерения: She is going to start a course.',
      'Going to используется, когда есть видимые признаки будущего события: Look at the clouds. It is going to rain.',
      'После will всегда base verb: will go, will help, will study. Нельзя will to go.',
      'Going to требует am/is/are: I am going to, she is going to, they are going to.',
      'После going to тоже нужен base verb: going to go, going to help, going to study.',
      'Will и going to иногда оба возможны, но смысл меняется: спонтанное решение против уже готового плана.',
    ],
    uk: [
      'Will використовується для рішення в момент мовлення: I will call him now.',
      'Will використовується для обіцянки: I will help you.',
      'Will використовується для прогнозу або думки про майбутнє: I think it will rain.',
      'Going to використовується для вже існуючого плану: I am going to study tonight.',
      'Going to використовується для наміру: She is going to start a course.',
      'Going to використовується, коли є видимі ознаки майбутньої події: Look at the clouds. It is going to rain.',
      'Після will завжди base verb: will go, will help, will study. Не можна will to go.',
      'Going to потребує am/is/are: I am going to, she is going to, they are going to.',
      'Після going to теж потрібен base verb: going to go, going to help, going to study.',
      'Will і going to іноді обидві можливі, але сенс змінюється: спонтанне рішення проти вже готового плану.',
    ],
    es: [
      'Will often marks an instant decision, promise, or prediction.',
      'Going to often marks an existing plan, intention, or visible evidence.',
      'Use will + base verb.',
      'Do not say will to go.',
      'Use am/is/are going to + base verb.',
      'Do not say I going to study.',
      'I think often points to will.',
      'Visible evidence often points to going to.',
      'Plans for tonight or next month often point to going to.',
      'Will and going to can both be possible, but the meaning changes.',
    ],
  },
  examples: [
    { en: 'I will help you.', ru: 'Я помогу тебе.', uk: 'Я допоможу тобі.', es: 'I will help you.', why: tri('Will часто используется для обещания или решения помочь.', 'Will часто використовується для обіцянки або рішення допомогти.') },
    { en: 'I am going to study tonight.', ru: 'Я собираюсь учиться сегодня вечером.', uk: 'Я збираюся вчитися сьогодні ввечері.', es: 'I am going to study tonight.', why: tri('Going to показывает уже существующий план на вечер.', 'Going to показує вже існуючий план на вечір.') },
    { en: 'She is going to start a new job.', ru: 'Она собирается начать новую работу.', uk: 'Вона збирається почати нову роботу.', es: 'She is going to start a new job.', why: tri('Это намерение или план, который уже есть. Поэтому going to.', 'Це намір або план, який уже є. Тому going to.') },
    { en: 'I think it will rain tomorrow.', ru: 'Думаю, завтра будет дождь.', uk: 'Думаю, завтра буде дощ.', es: 'I think it will rain tomorrow.', why: tri('I think показывает прогноз/мнение. Часто используется will.', 'I think показує прогноз/думку. Часто використовується will.') },
    { en: 'Look at the clouds. It is going to rain.', ru: 'Посмотри на облака. Сейчас будет дождь.', uk: 'Подивися на хмари. Зараз буде дощ.', es: 'Look at the clouds. It is going to rain.', why: tri('Есть видимые признаки: облака. Поэтому going to.', 'Є видимі ознаки: хмари. Тому going to.') },
    { en: 'I will call you later.', ru: 'Я позвоню тебе позже.', uk: 'Я подзвоню тобі пізніше.', es: 'I will call you later.', why: tri('Will может звучать как обещание или решение.', 'Will може звучати як обіцянка або рішення.') },
    { en: 'They are going to move next month.', ru: 'Они собираются переехать в следующем месяце.', uk: 'Вони збираються переїхати наступного місяця.', es: 'They are going to move next month.', why: tri('Next month и move здесь звучат как уже запланированное действие. Поэтому are going to move.', 'Next month і move тут звучать як уже запланована дія. Тому are going to move.') },
    { en: "Don't worry. Everything will be fine.", ru: 'Не переживай. Всё будет хорошо.', uk: 'Не хвилюйся. Усе буде добре.', es: "Don't worry. Everything will be fine.", why: tri('Will часто используется для уверенного прогноза или поддержки.', 'Will часто використовується для впевненого прогнозу або підтримки.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты переводишь will и going to одинаково как "буду". Но английский часто спрашивает: ты решил это сейчас или план уже был раньше?', 'Схоже, ти перекладаєш will і going to однаково як "буду". Але англійська часто питає: ти вирішив це зараз чи план уже був раніше?') },
    { id: 'intro_rule', type: 'rule', text: tri('Will - решение, обещание, прогноз. Going to - план, намерение, видимые признаки.', 'Will - рішення, обіцянка, прогноз. Going to - план, намір, видимі ознаки.') },
    { id: 'intro_warning', type: 'warning', text: tri('Не говори will to go. После will всегда base verb: will go. И не говори I going to go. Нужно I am going to go.', 'Не говори will to go. Після will завжди base verb: will go. І не говори I going to go. Потрібно I am going to go.') },
  ],
  steps: [
    step({ id: 'future_easy_001', order: 1, difficulty: 'easy', targetSkill: 'will_promise', sentence: "Don't worry. I ___ help you.", translation: tri('Не переживай. Я помогу тебе.', 'Не хвилюйся. Я допоможу тобі.'), options: ['will', 'am going', 'going to', 'will to'], correctAnswer: 'will', correctFeedback: tri('Да. Это обещание/решение помочь. После will идет base verb: will help.', 'Так. Це обіцянка/рішення допомогти. Після will іде base verb: will help.'), wrong: { 'am going': tri('Am going без to не завершает future structure. Можно I am going to help, но здесь естественно I will help.', 'Am going без to не завершує future structure. Можна I am going to help, але тут природно I will help.'), 'going to': tri('Нельзя I going to help. Нужно I am going to help. Но для обещания здесь лучше will.', 'Не можна I going to help. Потрібно I am going to help. Але для обіцянки тут краще will.'), 'will to': tri('После will не ставим to. Нужно will help, не will to help.', 'Після will не ставимо to. Потрібно will help, не will to help.') }, retryFeedback: [tri('Обещание = will. Will + help.', 'Обіцянка = will. Will + help.'), tri('I will help you.'), tri("Подсказка: Don't worry. I will help you.", "Підказка: Don't worry. I will help you.")], focusWords: ['will', 'help', 'promise'] }),
    step({ id: 'future_easy_002', order: 2, difficulty: 'easy', targetSkill: 'will_instant_decision', sentence: 'The phone is ringing. I ___ answer it.', translation: tri('Телефон звонит. Я отвечу.', 'Телефон дзвонить. Я відповім.'), options: ['will', 'am going to', 'going', 'will to'], correctAnswer: 'will', correctFeedback: tri('Да. Это решение в момент речи: телефон звонит, и ты решил ответить. Поэтому will.', 'Так. Це рішення в момент мовлення: телефон дзвонить, і ти вирішив відповісти. Тому will.'), wrong: { 'am going to': tri('Am going to возможно, если план был заранее. Но здесь решение появляется прямо сейчас, поэтому will.', 'Am going to можливе, якщо план був заздалегідь. Але тут рішення з’являється прямо зараз, тому will.'), going: tri('Going без am/is/are и to не строит будущее. Здесь нужно will answer.', 'Going без am/is/are і to не будує майбутнє. Тут потрібно will answer.'), 'will to': tri('После will не ставим to. Нужно will answer.', 'Після will не ставимо to. Потрібно will answer.') }, retryFeedback: [tri('Решил сейчас = will.', 'Вирішив зараз = will.'), tri('I will answer it.'), tri('Подсказка: The phone is ringing. I will answer it.', 'Підказка: The phone is ringing. I will answer it.')], focusWords: ['will', 'answer', 'instant decision'] }),
    step({ id: 'future_easy_003', order: 3, difficulty: 'easy', targetSkill: 'will_opinion_prediction', sentence: 'I think it ___ be fine.', translation: tri('Думаю, всё будет нормально.', 'Думаю, усе буде нормально.'), options: ['will', 'is going', 'going to', 'will to'], correctAnswer: 'will', correctFeedback: tri('Да. I think часто вводит прогноз/мнение. После will идет base verb: will be.', 'Так. I think часто вводить прогноз/думку. Після will іде base verb: will be.'), wrong: { 'is going': tri('Is going без to здесь неполно. Можно is going to be, но с I think естественно will be.', 'Is going без to тут неповно. Можна is going to be, але з I think природно will be.'), 'going to': tri('Going to требует be: is going to be. Но с I think чаще используется will.', 'Going to потребує be: is going to be. Але з I think частіше використовується will.'), 'will to': tri('После will не ставим to. Нужно will be.', 'Після will не ставимо to. Потрібно will be.') }, retryFeedback: [tri('I think + прогноз = will.', 'I think + прогноз = will.'), tri('It will be fine.'), tri('Подсказка: I think it will be fine.', 'Підказка: I think it will be fine.')], focusWords: ['will', 'I think', 'prediction'] }),
    step({ id: 'future_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'going_to_plan_i', sentence: 'I ___ study tonight.', translation: tri('Я собираюсь учиться сегодня вечером.', 'Я збираюся вчитися сьогодні ввечері.'), options: ['will', 'am going to', 'going to', 'am going'], correctAnswer: 'am going to', correctFeedback: tri('Да. Это уже существующий план на вечер. С I нужна форма am going to.', 'Так. Це вже існуючий план на вечір. З I потрібна форма am going to.'), wrong: { will: tri('Will возможно, если ты решаешь сейчас. Но "собираюсь учиться сегодня вечером" звучит как план, поэтому am going to.', 'Will можливе, якщо ти вирішуєш зараз. Але "збираюся вчитися сьогодні ввечері" звучить як план, тому am going to.'), 'going to': tri('Нельзя I going to study. Нужно I am going to study.', 'Не можна I going to study. Потрібно I am going to study.'), 'am going': tri('Am going без to study звучит неполно для этой конструкции. Нужно am going to study.', 'Am going без to study звучить неповно для цієї конструкції. Потрібно am going to study.') }, retryFeedback: [tri('План = am going to.', 'План = am going to.'), tri('I am going to study.'), tri('Подсказка: I am going to study tonight.', 'Підказка: I am going to study tonight.')], focusWords: ['am going to', 'study', 'plan'] }),
    step({ id: 'future_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'going_to_plan_she', sentence: 'She ___ start a new course.', translation: tri('Она собирается начать новый курс.', 'Вона збирається почати новий курс.'), options: ['is going to', 'are going to', 'going to', 'will to'], correctAnswer: 'is going to', correctFeedback: tri('Да. She требует is. Полная форма: she is going to start.', 'Так. She потребує is. Повна форма: she is going to start.'), wrong: { 'are going to': tri('Are going to используется с you/we/they. С she нужна форма is going to.', 'Are going to використовується з you/we/they. З she потрібна форма is going to.'), 'going to': tri('Нельзя she going to start. Нужно she is going to start.', 'Не можна she going to start. Потрібно she is going to start.'), 'will to': tri('Will to неправильно. Если will, то will start. Но для плана здесь лучше is going to start.', 'Will to неправильно. Якщо will, то will start. Але для плану тут краще is going to start.') }, retryFeedback: [tri('She = is going to.'), tri('She is going to start.'), tri('Подсказка: She is going to start a new course.', 'Підказка: She is going to start a new course.')], focusWords: ['she', 'is going to', 'plan'] }),
    step({ id: 'future_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'going_to_plan_they', sentence: 'They ___ move next month.', translation: tri('Они собираются переехать в следующем месяце.', 'Вони збираються переїхати наступного місяця.'), options: ['is going to', 'are going to', 'going to', 'will to'], correctAnswer: 'are going to', correctFeedback: tri('Да. They требует are. План на следующий месяц = are going to move.', 'Так. They потребує are. План на наступний місяць = are going to move.'), wrong: { 'is going to': tri('Is going to используется с he/she/it. They требует are going to.', 'Is going to використовується з he/she/it. They потребує are going to.'), 'going to': tri('Нельзя they going to move. Нужно they are going to move.', 'Не можна they going to move. Потрібно they are going to move.'), 'will to': tri('Will to неправильно. Если will, то will move. Но для плана здесь лучше are going to move.', 'Will to неправильно. Якщо will, то will move. Але для плану тут краще are going to move.') }, retryFeedback: [tri('They = are going to.'), tri('They are going to move.'), tri('Подсказка: They are going to move next month.', 'Підказка: They are going to move next month.')], focusWords: ['they', 'are going to', 'next month'] }),
    step({ id: 'future_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'will_base_no_to', sentence: 'I will ___ you later.', translation: tri('Я позвоню тебе позже.', 'Я подзвоню тобі пізніше.'), options: ['call', 'to call', 'calling', 'called'], correctAnswer: 'call', correctFeedback: tri('Да. После will нужен base verb без to: will call.', 'Так. Після will потрібен base verb без to: will call.'), wrong: { 'to call': tri('После will не ставим to. Нужно will call.', 'Після will не ставимо to. Потрібно will call.'), calling: tri('Will calling неправильно. После will нужен base verb: call.', 'Will calling неправильно. Після will потрібен base verb: call.'), called: tri('Will called неправильно. После will нужен base verb: call.', 'Will called неправильно. Після will потрібен base verb: call.') }, retryFeedback: [tri('Will + base verb. Без to.', 'Will + base verb. Без to.'), tri('Will call.'), tri('Подсказка: I will call you later.', 'Підказка: I will call you later.')], focusWords: ['will', 'call', 'base verb'] }),
    step({ id: 'future_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'going_to_base_verb', sentence: 'I am going to ___ dinner.', translation: tri('Я собираюсь приготовить ужин.', 'Я збираюся приготувати вечерю.'), options: ['make', 'making', 'made', 'makes'], correctAnswer: 'make', correctFeedback: tri('Да. После going to нужен base verb: going to make.', 'Так. Після going to потрібен base verb: going to make.'), wrong: { making: tri('Going to making неправильно. После going to нужен base verb: make.', 'Going to making неправильно. Після going to потрібен base verb: make.'), made: tri('Going to made неправильно. После going to нужен base verb: make.', 'Going to made неправильно. Після going to потрібен base verb: make.'), makes: tri('Going to makes неправильно. После going to нужен base verb: make.', 'Going to makes неправильно. Після going to потрібен base verb: make.') }, retryFeedback: [tri('Going to + base verb.', 'Going to + base verb.'), tri('Going to make.'), tri('Подсказка: I am going to make dinner.', 'Підказка: I am going to make dinner.')], focusWords: ['going to', 'make', 'base verb'] }),
    step({ id: 'future_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'missing_be_going_to', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.'), options: ['I am going to study tonight.', 'I going to study tonight.', 'I am going study tonight.', 'I will to study tonight.'], correctAnswer: 'I am going to study tonight.', correctFeedback: tri('Да. Полная форма: I am going to study.', 'Так. Повна форма: I am going to study.'), wrong: { 'I going to study tonight.': tri('В going to конструкции нельзя пропускать am. Нужно I am going to study.', 'У going to конструкції не можна пропускати am. Потрібно I am going to study.'), 'I am going study tonight.': tri('В этой future structure нужно going to, не просто going. Нужно am going to study.', 'У цій future structure потрібно going to, не просто going. Потрібно am going to study.'), 'I will to study tonight.': tri('После will не ставим to. Можно I will study, но здесь правильная going to форма: I am going to study.', 'Після will не ставимо to. Можна I will study, але тут правильна going to форма: I am going to study.') }, retryFeedback: [tri('I + am + going to + study.'), tri('I am going to study.'), tri('Подсказка: I am going to study tonight.', 'Підказка: I am going to study tonight.')], focusWords: ['I am going to', 'study'] }),
    step({ id: 'future_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'evidence_going_to', sentence: 'Look at the clouds. It ___ rain.', translation: tri('Посмотри на облака. Сейчас будет дождь.', 'Подивися на хмари. Зараз буде дощ.'), options: ['will', 'is going to', 'going to', 'will to'], correctAnswer: 'is going to', correctFeedback: tri('Да. Есть видимые признаки: облака. It требует is going to.', 'Так. Є видимі ознаки: хмари. It потребує is going to.'), wrong: { will: tri('Will возможен как общий прогноз, но здесь есть видимые признаки. Поэтому естественнее is going to rain.', 'Will можливий як загальний прогноз, але тут є видимі ознаки. Тому природніше is going to rain.'), 'going to': tri('Нельзя It going to rain. Нужно It is going to rain.', 'Не можна It going to rain. Потрібно It is going to rain.'), 'will to': tri('Will to неправильно. Если will, то will rain. Но по признакам лучше is going to rain.', 'Will to неправильно. Якщо will, то will rain. Але за ознаками краще is going to rain.') }, retryFeedback: [tri('Видимые признаки = going to.', 'Видимі ознаки = going to.'), tri('It is going to rain.'), tri('Подсказка: Look at the clouds. It is going to rain.', 'Підказка: Look at the clouds. It is going to rain.')], focusWords: ['clouds', 'is going to', 'evidence'] }),
    step({ id: 'future_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'opinion_prediction_will', sentence: 'I think they ___ win.', translation: tri('Думаю, они победят.', 'Думаю, вони переможуть.'), options: ['will', 'are going', 'going to', 'will to'], correctAnswer: 'will', correctFeedback: tri('Да. I think показывает мнение/прогноз. После will нужен base verb: win.', 'Так. I think показує думку/прогноз. Після will потрібен base verb: win.'), wrong: { 'are going': tri('Are going без to win неполно. Можно are going to win, но с I think часто естественно will win.', 'Are going без to win неповно. Можна are going to win, але з I think часто природно will win.'), 'going to': tri('Нельзя they going to win. Нужно they are going to win. Но с I think естественно will.', 'Не можна they going to win. Потрібно they are going to win. Але з I think природно will.'), 'will to': tri('После will не ставим to. Нужно will win.', 'Після will не ставимо to. Потрібно will win.') }, retryFeedback: [tri('I think + прогноз = will.', 'I think + прогноз = will.'), tri('They will win.'), tri('Подсказка: I think they will win.', 'Підказка: I think they will win.')], focusWords: ['I think', 'will', 'win'] }),
    step({ id: 'future_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'instant_decision_vs_plan', sentence: 'I forgot to call him. I ___ call him now.', translation: tri('Я забыл ему позвонить. Я позвоню ему сейчас.', 'Я забув йому подзвонити. Я подзвоню йому зараз.'), options: ['will', 'am going to', 'going to', 'will to'], correctAnswer: 'will', correctFeedback: tri('Да. Это решение прямо сейчас после того, как человек вспомнил. Поэтому will.', 'Так. Це рішення прямо зараз після того, як людина згадала. Тому will.'), wrong: { 'am going to': tri('Am going to звучало бы как уже готовый план. Здесь решение появилось сейчас, поэтому will.', 'Am going to звучало б як уже готовий план. Тут рішення з’явилося зараз, тому will.'), 'going to': tri('Нельзя I going to call. Нужно I am going to call. Но здесь лучше will.', 'Не можна I going to call. Потрібно I am going to call. Але тут краще will.'), 'will to': tri('После will не ставим to. Нужно will call.', 'Після will не ставимо to. Потрібно will call.') }, retryFeedback: [tri('Вспомнил и решил сейчас = will.', 'Згадав і вирішив зараз = will.'), tri('I will call him now.'), tri('Подсказка: I forgot to call him. I will call him now.', 'Підказка: I forgot to call him. I will call him now.')], focusWords: ['forgot', 'will', 'now'] }),
    step({ id: 'future_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_will_going_to_pair', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.'), options: ['I will help you / I am going to study tonight', 'I will to help you / I going to study tonight', 'I am will help you / I am going study tonight', 'I will helping you / I am going to studying tonight'], correctAnswer: 'I will help you / I am going to study tonight', correctFeedback: tri('Да. Will + base verb. I am going to + base verb.', 'Так. Will + base verb. I am going to + base verb.'), wrong: { 'I will to help you / I going to study tonight': tri('После will не нужен to. В going to нельзя пропускать am.', 'Після will не потрібен to. У going to не можна пропускати am.'), 'I am will help you / I am going study tonight': tri('Am will неправильно. Am going study тоже неполно: нужно am going to study.', 'Am will неправильно. Am going study теж неповно: потрібно am going to study.'), 'I will helping you / I am going to studying tonight': tri('После will и going to нужен base verb: help, study. Не helping/studying.', 'Після will і going to потрібен base verb: help, study. Не helping/studying.') }, retryFeedback: [tri('Will help. Am going to study.'), tri('I will help / I am going to study.'), tri('Подсказка: I will help you / I am going to study tonight.', 'Підказка: I will help you / I am going to study tonight.')], focusWords: ['will help', 'am going to study'] }),
    step({ id: 'future_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_evidence_opinion', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.'), options: ['I think it will rain / Look at the clouds. It is going to rain', 'I think it is going to rain / Look at the clouds. It will to rain', 'I think it will to rain / Look at the clouds. It going to rain', 'I think it going to rain / Look at the clouds. It is will rain'], correctAnswer: 'I think it will rain / Look at the clouds. It is going to rain', correctFeedback: tri('Да. I think = мнение/прогноз с will. Облака = видимый признак с going to.', 'Так. I think = думка/прогноз з will. Хмари = видима ознака з going to.'), wrong: { 'I think it is going to rain / Look at the clouds. It will to rain': tri('Первая часть возможна, но вторая содержит ошибку: will to rain нельзя. Нужна пара с will rain и is going to rain.', 'Перша частина можлива, але друга містить помилку: will to rain не можна. Потрібна пара з will rain і is going to rain.'), 'I think it will to rain / Look at the clouds. It going to rain': tri('Will to rain неправильно. It going to rain тоже неправильно без is.', 'Will to rain неправильно. It going to rain теж неправильно без is.'), 'I think it going to rain / Look at the clouds. It is will rain': tri('It going to rain пропускает is. It is will rain неправильно: нельзя смешивать is и will так.', 'It going to rain пропускає is. It is will rain неправильно: не можна так змішувати is і will.') }, retryFeedback: [tri('Мнение = will. Видимые признаки = going to.', 'Думка = will. Видимі ознаки = going to.'), tri('Will rain / is going to rain.'), tri('Подсказка: I think it will rain / Look at the clouds. It is going to rain.', 'Підказка: I think it will rain / Look at the clouds. It is going to rain.')], focusWords: ['I think', 'clouds', 'will', 'going to'] }),
    step({ id: 'future_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.'), options: ['I will call you later, but I am going to study tonight.', 'I will to call you later, but I going to study tonight.', 'I am will call you later, but I am going study tonight.', 'I will calling you later, but I am going to studying tonight.'], correctAnswer: 'I will call you later, but I am going to study tonight.', correctFeedback: tri('Да. Will call = обещание/решение. Am going to study = план.', 'Так. Will call = обіцянка/рішення. Am going to study = план.'), wrong: { 'I will to call you later, but I going to study tonight.': tri('Will to call неправильно. I going to study пропускает am.', 'Will to call неправильно. I going to study пропускає am.'), 'I am will call you later, but I am going study tonight.': tri('Am will call неправильно. Am going study пропускает to.', 'Am will call неправильно. Am going study пропускає to.'), 'I will calling you later, but I am going to studying tonight.': tri('После will и going to нужен base verb: call, study.', 'Після will і going to потрібен base verb: call, study.') }, retryFeedback: [tri('Will + call. Am going to + study.'), tri('I will call / I am going to study.'), tri('Подсказка: I will call you later, but I am going to study tonight.', 'Підказка: I will call you later, but I am going to study tonight.')], focusWords: ['will call', 'am going to study'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'will_to_error',
      'missing_be_going_to_error',
      'going_to_without_base_verb_error',
      'instant_decision_vs_plan_confusion',
      'prediction_vs_evidence_confusion',
      'wrong_be_form_going_to',
      'will_plus_ing_error',
      'double_future_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Показываем тип будущего смысла и нужную форму.', 'Показуємо тип майбутнього сенсу і потрібну форму.'),
    depth2: tri('Спрашиваем: это решение сейчас, обещание, прогноз или уже готовый план.', 'Питаємо: це рішення зараз, обіцянка, прогноз чи вже готовий план.'),
    depth3: tri('Показываем готовые пары I will help / I am going to study.', 'Показуємо готові пари I will help / I am going to study.'),
    depth4: tri('Почти подсказка: прямо указываем will или am/is/are going to.', 'Майже підказка: прямо вказуємо will або am/is/are going to.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        'Остановись. Если решение сейчас, обещание или мнение о будущем - will + base verb. Если уже есть план, намерение или видимые признаки - am/is/are going to + base verb.',
        'Зупинись. Якщо рішення зараз, обіцянка або думка про майбутнє - will + base verb. Якщо вже є план, намір або видимі ознаки - am/is/are going to + base verb.',
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_future_meaning_hint_then_retry',
      card: tri(
        'Подсказка по смыслу: система покажет, это решение сейчас, обещание, прогноз, план или видимый признак, но не выберет форму за пользователя.',
        'Підказка за сенсом: система покаже, це рішення зараз, обіцянка, прогноз, план чи видима ознака, але не вибере форму за користувача.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        'Режим подсказки: сначала выбери тип будущего смысла. Потом система спросит форму: will или am/is/are going to.',
        'Режим підказки: спочатку обери тип майбутнього сенсу. Потім система спитає форму: will або am/is/are going to.',
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_future_001', prompt: tri('После will нужен to + verb или base verb без to?', 'Після will потрібен to + verb чи base verb без to?'), options: ['to + verb', 'base verb без to'], correctIndex: 1, thenReturnToExerciseId: 'future_contrast_004' },
      { id: 'guided_future_002', prompt: tri('I going to study - здесь не хватает am?', 'I going to study - тут бракує am?'), options: ['да', 'нет'], correctIndex: 0, thenReturnToExerciseId: 'future_contrast_006' },
      { id: 'guided_future_003', prompt: tri('Если решение принято прямо сейчас, чаще will или going to?', 'Якщо рішення прийняте прямо зараз, частіше will чи going to?'), options: ['will', 'going to'], correctIndex: 0, thenReturnToExerciseId: 'future_easy_002' },
      { id: 'guided_future_004', prompt: tri('Если план уже есть заранее, чаще will или going to?', 'Якщо план уже є заздалегідь, частіше will чи going to?'), options: ['will', 'going to'], correctIndex: 1, thenReturnToExerciseId: 'future_contrast_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'future_will_going_to',
    diagnosisLabel: tri('Will / Going to', 'Will / Going to'),
    contrastSet: CONTRAST,
    focusWords: ['will', 'going to', 'am going to', 'is going to', 'are going to', 'plan', 'promise'],
    focusPatterns: [
      'will_promise',
      'will_instant_decision',
      'will_opinion_prediction',
      'going_to_plan_i',
      'going_to_plan_she',
      'going_to_plan_they',
      'will_base_no_to',
      'going_to_base_verb',
      'missing_be_going_to',
      'evidence_going_to',
      'opinion_prediction_will',
      'instant_decision_vs_plan',
      'mixed_will_going_to_pair',
      'mixed_evidence_opinion',
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
    start: 'diagnosis_training_future_will_going_to_start',
    answer: 'diagnosis_training_future_will_going_to_answer',
    mastery: 'diagnosis_training_future_will_going_to_mastery',
    fallback: 'diagnosis_training_future_will_going_to_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: {
      category: 'verb',
      microDiagnosisId: 'future_will_going_to',
      contrastSet: CONTRAST,
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logFutureMeaningType: true,
      logFutureForm: true,
      logBeForm: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=future_will_going_to',
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


