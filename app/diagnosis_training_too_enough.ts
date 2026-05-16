import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = ['too + adjective', 'adjective + enough', 'enough + noun', 'too much', 'too many', 'not enough', 'too ... to'];
const SMART_CONTRAST = ['too + adjective', 'adjective + enough', 'enough + noun', 'too much', 'too many', 'not enough'];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'Сначала реши смысл: too = слишком и обычно проблема, enough = достаточно. Потом проверь позицию: too перед adjective/adverb, enough после adjective/adverb, но перед noun.',
      'Спочатку виріши сенс: too = занадто і зазвичай проблема, enough = достатньо. Потім перевір позицію: too перед adjective/adverb, enough після adjective/adverb, але перед noun.',
      'First decide the meaning: too means excessive, enough means sufficient. Then check the position.',
    ),
    depth2,
    depth3,
    depth4,
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Здесь ошибка в значении или позиции too/enough. Нужная форма: ${correct}.`,
    `Тут помилка у значенні або позиції too/enough. Потрібна форма: ${correct}.`,
    `Use this too/enough pattern: ${correct}.`,
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
      'Too показывает избыток, который мешает: too hot, too expensive. Enough показывает достаточность: good enough, enough time. Позиция зависит от типа слова.',
      'Too показує надлишок, який заважає: too hot, too expensive. Enough показує достатність: good enough, enough time. Позиція залежить від типу слова.',
      'Too marks excess. Enough marks sufficiency. Their position depends on the word type.',
    ),
    microTask: tri(
      'Выбери правильную форму too/enough и проверь порядок слов.',
      'Обери правильну форму too/enough і перевір порядок слів.',
      'Choose the correct too/enough pattern.',
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
      'Скелет: too + adjective/adverb. Adjective/adverb + enough. Enough + noun. Too much + uncountable noun. Too many + plural noun.',
      'Скелет: too + adjective/adverb. Adjective/adverb + enough. Enough + noun. Too much + uncountable noun. Too many + plural noun.',
      'Too before adjectives/adverbs. Enough after adjectives/adverbs but before nouns.',
    ),
    focusWords: input.focusWords,
  };
}

export const TOO_ENOUGH_TRAINING: DiagnosisTraining = {
  id: 'too_enough',
  category: 'modifier',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 34,
  supportedLocales: ['ru', 'uk'],
  title: tri('Too / Enough: слишком или достаточно', 'Too / Enough: занадто чи достатньо'),
  shortTitle: tri('Too / Enough', 'Too / Enough'),
  shortDiagnosis: tri(
    'Ты путаешь too и enough: too показывает избыток, а enough показывает достаточность.',
    'Ти плутаєш too і enough: too показує надлишок, а enough показує достатність.',
  ),
  diagnosisText: tri(
    'Ты путаешь too и enough. Главная проблема в том, что too показывает избыток, который мешает, а enough показывает достаточность. Плюс они стоят в разных местах: too перед adjective/adverb, enough после adjective/adverb, но перед noun.',
    'Ти плутаєш too і enough. Головна проблема в тому, що too показує надлишок, який заважає, а enough показує достатність. Плюс вони стоять у різних місцях: too перед adjective/adverb, enough після adjective/adverb, але перед noun.',
  ),
  mentalModel: tri(
    'Too = слишком, больше нормы, из-за этого проблема: too expensive. Enough = достаточно: old enough, enough money. Too стоит перед adjective. Enough после adjective, но перед noun.',
    'Too = занадто, більше норми, через це проблема: too expensive. Enough = достатньо: old enough, enough money. Too стоїть перед adjective. Enough після adjective, але перед noun.',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'Too expensive = слишком дорого. Good enough = достаточно хорошо. Enough money = достаточно денег. Not enough time = недостаточно времени. Too tired to work = слишком устал, чтобы работать.',
    'Too expensive = занадто дорого. Good enough = достатньо добре. Enough money = достатньо грошей. Not enough time = недостатньо часу. Too tired to work = занадто втомлений, щоб працювати.',
  ),
  whatUserMustLearn: {
    ru: [
      'Too ставится перед adjective/adverb: too expensive, too late, too fast.',
      'Too обычно показывает проблему: слишком дорого, слишком поздно, слишком быстро.',
      'Enough после adjective/adverb: good enough, old enough, fast enough.',
      'Enough перед noun: enough money, enough time, enough people.',
      'Not enough означает недостаточно: not enough time, not good enough.',
      'Too much используется с uncountable nouns: too much water, too much time.',
      'Too many используется с plural countable nouns: too many people, too many questions.',
      'Too ... to часто означает слишком ..., чтобы ...: too tired to work.',
      'Нельзя говорить enough good. Нужно good enough.',
      'Нельзя говорить money enough в базовой форме. Нужно enough money.',
    ],
    uk: [
      'Too ставиться перед adjective/adverb: too expensive, too late, too fast.',
      'Too зазвичай показує проблему: занадто дорого, занадто пізно, занадто швидко.',
      'Enough після adjective/adverb: good enough, old enough, fast enough.',
      'Enough перед noun: enough money, enough time, enough people.',
      'Not enough означає недостатньо: not enough time, not good enough.',
      'Too much використовується з uncountable nouns: too much water, too much time.',
      'Too many використовується з plural countable nouns: too many people, too many questions.',
      'Too ... to часто означає занадто ..., щоб ...: too tired to work.',
      'Не можна говорити enough good. Потрібно good enough.',
      'Не можна говорити money enough у базовій формі. Потрібно enough money.',
    ],
    es: [
      'Too goes before adjectives and adverbs.',
      'Too usually marks a problem or excess.',
      'Enough goes after adjectives and adverbs.',
      'Enough goes before nouns.',
      'Not enough means insufficient.',
      'Too much goes with uncountable nouns.',
      'Too many goes with plural countable nouns.',
      'Too ... to means too much for an action.',
      'Say good enough, not enough good.',
      'Say enough money, not money enough.',
    ],
  },
  examples: [
    { en: 'This coffee is too hot.', ru: 'Этот кофе слишком горячий.', uk: 'Ця кава занадто гаряча.', es: 'This coffee is too hot.', why: tri('Too стоит перед adjective hot и показывает проблему.', 'Too стоїть перед adjective hot і показує проблему.') },
    { en: 'This coffee is hot enough.', ru: 'Этот кофе достаточно горячий.', uk: 'Ця кава достатньо гаряча.', es: 'This coffee is hot enough.', why: tri('Enough стоит после adjective hot: hot enough.', 'Enough стоїть після adjective hot: hot enough.') },
    { en: "I don't have enough time.", ru: 'У меня недостаточно времени.', uk: 'У мене недостатньо часу.', es: "I don't have enough time.", why: tri('Time - noun. Enough перед noun: enough time.', 'Time - noun. Enough перед noun: enough time.') },
    { en: 'She is old enough to drive.', ru: 'Она достаточно взрослая, чтобы водить.', uk: 'Вона достатньо доросла, щоб водити.', es: 'She is old enough to drive.', why: tri('Enough после adjective old: old enough.', 'Enough після adjective old: old enough.') },
    { en: 'He is too tired to work.', ru: 'Он слишком устал, чтобы работать.', uk: 'Він занадто втомлений, щоб працювати.', es: 'He is too tired to work.', why: tri('Too tired показывает избыток состояния, который мешает действию work.', 'Too tired показує надлишок стану, який заважає дії work.') },
    { en: 'There are too many people here.', ru: 'Здесь слишком много людей.', uk: 'Тут занадто багато людей.', es: 'There are too many people here.', why: tri('People - plural countable noun. С ним используется too many.', 'People - plural countable noun. З ним використовується too many.') },
    { en: 'There is too much noise.', ru: 'Слишком много шума.', uk: 'Занадто багато шуму.', es: 'There is too much noise.', why: tri('Noise - uncountable noun. С ним используется too much.', 'Noise - uncountable noun. З ним використовується too much.') },
    { en: 'This answer is not good enough.', ru: 'Этот ответ недостаточно хороший.', uk: 'Ця відповідь недостатньо хороша.', es: 'This answer is not good enough.', why: tri('Not enough показывает нехватку качества. Enough после adjective good.', 'Not enough показує нестачу якості. Enough після adjective good.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты смешиваешь слишком и достаточно, а еще ставишь enough не туда.', 'Схоже, ти змішуєш занадто і достатньо, а ще ставиш enough не туди.') },
    { id: 'intro_rule', type: 'rule', text: tri('Too перед adjective: too expensive. Enough после adjective: good enough. Enough перед noun: enough money.', 'Too перед adjective: too expensive. Enough після adjective: good enough. Enough перед noun: enough money.') },
    { id: 'intro_warning', type: 'warning', text: tri('Главные ошибки: enough good, money enough, too much people. Правильно: good enough, enough money, too many people.', 'Головні помилки: enough good, money enough, too much people. Правильно: good enough, enough money, too many people.') },
  ],
  steps: [
    step({ id: 'too_enough_easy_001', order: 1, difficulty: 'easy', targetSkill: 'too_adjective_hot', sentence: 'This coffee is ___ hot.', translation: tri('Этот кофе слишком горячий.', 'Ця кава занадто гаряча.'), options: ['too', 'enough', 'too much', 'many'], correctAnswer: 'too', correctFeedback: tri('Да. Too стоит перед adjective hot и означает слишком.', 'Так. Too стоїть перед adjective hot і означає занадто.'), wrong: { enough: tri('Enough означает достаточно, а не слишком. Для слишком горячий нужно too hot.', 'Enough означає достатньо, а не занадто. Для занадто гаряча потрібно too hot.'), 'too much': tri('Too much используется с nouns. Перед adjective hot нужен просто too.', 'Too much використовується з nouns. Перед adjective hot потрібен просто too.'), many: tri('Many используется с plural nouns. Hot - adjective, поэтому too hot.', 'Many використовується з plural nouns. Hot - adjective, тому too hot.') }, retryFeedback: [tri('Слишком + adjective = too + adjective.', 'Занадто + adjective = too + adjective.'), tri('Too hot.'), tri('Подсказка: This coffee is too hot.', 'Підказка: This coffee is too hot.')], focusWords: ['too', 'hot'] }),
    step({ id: 'too_enough_easy_002', order: 2, difficulty: 'easy', targetSkill: 'too_adjective_expensive', sentence: 'This phone is ___ expensive.', translation: tri('Этот телефон слишком дорогой.', 'Цей телефон занадто дорогий.'), options: ['too', 'enough', 'too many', 'many'], correctAnswer: 'too', correctFeedback: tri('Да. Expensive - adjective. Слишком дорогой = too expensive.', 'Так. Expensive - adjective. Занадто дорогий = too expensive.'), wrong: { enough: tri('Enough expensive неправильно и по смыслу, и по позиции. Слишком дорогой = too expensive.', 'Enough expensive неправильно і за змістом, і за позицією. Занадто дорогий = too expensive.'), 'too many': tri('Too many используется с plural nouns. Expensive - adjective, поэтому too expensive.', 'Too many використовується з plural nouns. Expensive - adjective, тому too expensive.'), many: tri('Many не ставится перед expensive. Нужна форма too expensive.', 'Many не ставиться перед expensive. Потрібна форма too expensive.') }, retryFeedback: [tri('Too + expensive.'), tri('Too expensive.'), tri('Подсказка: This phone is too expensive.', 'Підказка: This phone is too expensive.')], focusWords: ['too', 'expensive'] }),
    step({ id: 'too_enough_easy_003', order: 3, difficulty: 'easy', targetSkill: 'too_adverb_fast', sentence: 'You are speaking ___ fast.', translation: tri('Ты говоришь слишком быстро.', 'Ти говориш занадто швидко.'), options: ['too', 'enough', 'too many', 'many'], correctAnswer: 'too', correctFeedback: tri('Да. Fast здесь adverb. Слишком быстро = too fast.', 'Так. Fast тут adverb. Занадто швидко = too fast.'), wrong: { enough: tri('Fast enough значит достаточно быстро. Здесь смысл слишком быстро, поэтому too fast.', 'Fast enough означає достатньо швидко. Тут сенс занадто швидко, тому too fast.'), 'too many': tri('Too many используется с plural nouns. Fast - adverb, поэтому too fast.', 'Too many використовується з plural nouns. Fast - adverb, тому too fast.'), many: tri('Many не подходит к fast. Нужна форма too fast.', 'Many не підходить до fast. Потрібна форма too fast.') }, retryFeedback: [tri('Слишком быстро = too fast.', 'Занадто швидко = too fast.'), tri('Speaking too fast.'), tri('Подсказка: You are speaking too fast.', 'Підказка: You are speaking too fast.')], focusWords: ['too', 'fast'] }),
    step({ id: 'too_enough_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'adjective_enough_good', sentence: 'This answer is good ___.', translation: tri('Этот ответ достаточно хороший.', 'Ця відповідь достатньо хороша.'), options: ['enough', 'too', 'enough good', 'many'], correctAnswer: 'enough', correctFeedback: tri('Да. Enough стоит после adjective: good enough.', 'Так. Enough стоїть після adjective: good enough.'), wrong: { too: tri('Good too не выражает достаточно хороший. Нужно good enough.', 'Good too не передає достатньо хороший. Потрібно good enough.'), 'enough good': tri('Enough перед adjective неправильно. Нужно adjective + enough: good enough.', 'Enough перед adjective неправильно. Потрібно adjective + enough: good enough.'), many: tri('Many используется с plural nouns. Good - adjective. Нужно good enough.', 'Many використовується з plural nouns. Good - adjective. Потрібно good enough.') }, retryFeedback: [tri('Adjective + enough.'), tri('Good enough.'), tri('Подсказка: This answer is good enough.', 'Підказка: This answer is good enough.')], focusWords: ['good enough', 'enough'] }),
    step({ id: 'too_enough_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'adjective_enough_old', sentence: 'She is old ___ to drive.', translation: tri('Она достаточно взрослая, чтобы водить.', 'Вона достатньо доросла, щоб водити.'), options: ['enough', 'too', 'enough old', 'many'], correctAnswer: 'enough', correctFeedback: tri('Да. Enough стоит после adjective old: old enough to drive.', 'Так. Enough стоїть після adjective old: old enough to drive.'), wrong: { too: tri('Old too не работает здесь. Достаточно взрослая = old enough.', 'Old too не працює тут. Достатньо доросла = old enough.'), 'enough old': tri('Enough old неправильно. После adjective: old enough.', 'Enough old неправильно. Після adjective: old enough.'), many: tri('Many не подходит к adjective old. Нужно old enough.', 'Many не підходить до adjective old. Потрібно old enough.') }, retryFeedback: [tri('Old + enough + to drive.'), tri('Old enough.'), tri('Подсказка: She is old enough to drive.', 'Підказка: She is old enough to drive.')], focusWords: ['old enough', 'enough to'] }),
    step({ id: 'too_enough_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'adverb_enough_fast', sentence: 'He runs fast ___.', translation: tri('Он бегает достаточно быстро.', 'Він бігає достатньо швидко.'), options: ['enough', 'too', 'enough fast', 'many'], correctAnswer: 'enough', correctFeedback: tri('Да. Enough стоит после adverb fast: fast enough.', 'Так. Enough стоїть після adverb fast: fast enough.'), wrong: { too: tri('Fast too не выражает достаточно быстро. Нужно fast enough.', 'Fast too не передає достатньо швидко. Потрібно fast enough.'), 'enough fast': tri('Enough fast неправильно. Enough после adverb: fast enough.', 'Enough fast неправильно. Enough після adverb: fast enough.'), many: tri('Many не подходит к fast. Нужно fast enough.', 'Many не підходить до fast. Потрібно fast enough.') }, retryFeedback: [tri('Fast + enough.'), tri('Fast enough.'), tri('Подсказка: He runs fast enough.', 'Підказка: He runs fast enough.')], focusWords: ['fast enough'] }),
    step({ id: 'too_enough_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'enough_before_noun_time', sentence: "I don't have ___ time.", translation: tri('У меня недостаточно времени.', 'У мене недостатньо часу.'), options: ['enough', 'time enough', 'too', 'many'], correctAnswer: 'enough', correctFeedback: tri('Да. Enough стоит перед noun time: enough time.', 'Так. Enough стоїть перед noun time: enough time.'), wrong: { 'time enough': tri('Time enough не базовый порядок. С noun нужно enough time.', 'Time enough не базовий порядок. З noun потрібно enough time.'), too: tri('Too time неправильно. Недостаточно времени = not enough time.', 'Too time неправильно. Недостатньо часу = not enough time.'), many: tri('Time как ресурс uncountable, и смысл недостаточности: enough time.', 'Time як ресурс uncountable, і сенс недостатності: enough time.') }, retryFeedback: [tri('Enough + noun.'), tri('Enough time.'), tri("Подсказка: I don't have enough time.", "Підказка: I don't have enough time.")], focusWords: ['enough time', 'not enough'] }),
    step({ id: 'too_enough_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'enough_before_noun_money', sentence: 'Do you have ___ money?', translation: tri('У тебя достаточно денег?', 'У тебе достатньо грошей?'), options: ['enough', 'money enough', 'too', 'many'], correctAnswer: 'enough', correctFeedback: tri('Да. Enough перед noun money: enough money.', 'Так. Enough перед noun money: enough money.'), wrong: { 'money enough': tri('Money enough не базовый порядок. Нужно enough money.', 'Money enough не базовий порядок. Потрібно enough money.'), too: tri('Too money неправильно. Можно too much money, но здесь смысл достаточно денег: enough money.', 'Too money неправильно. Можна too much money, але тут сенс достатньо грошей: enough money.'), many: tri('Money в английском uncountable. Для достаточно денег нужно enough money.', 'Money в англійській uncountable. Для достатньо грошей потрібно enough money.') }, retryFeedback: [tri('Enough + money.'), tri('Enough money.'), tri('Подсказка: Do you have enough money?', 'Підказка: Do you have enough money?')], focusWords: ['enough money'] }),
    step({ id: 'too_enough_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'enough_before_plural_noun', sentence: "There aren't ___ chairs.", translation: tri('Стульев недостаточно.', 'Стільців недостатньо.'), options: ['enough', 'chairs enough', 'too', 'much'], correctAnswer: 'enough', correctFeedback: tri('Да. Enough перед plural noun chairs: enough chairs.', 'Так. Enough перед plural noun chairs: enough chairs.'), wrong: { 'chairs enough': tri('Chairs enough не базовый порядок. Нужно enough chairs.', 'Chairs enough не базовий порядок. Потрібно enough chairs.'), too: tri('Too chairs неправильно. Для недостаточно стульев нужно enough chairs в отрицании.', 'Too chairs неправильно. Для недостатньо стільців потрібно enough chairs у запереченні.'), much: tri('Chairs plural countable, поэтому much не подходит. Здесь нужно enough chairs.', 'Chairs plural countable, тому much не підходить. Тут потрібно enough chairs.') }, retryFeedback: [tri('Enough + chairs.'), tri('Enough chairs.'), tri("Подсказка: There aren't enough chairs.", "Підказка: There aren't enough chairs.")], focusWords: ['enough chairs'] }),
    step({ id: 'too_enough_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'too_many_plural', sentence: 'There are ___ people here.', translation: tri('Здесь слишком много людей.', 'Тут занадто багато людей.'), options: ['too many', 'too much', 'enough', 'many enough'], correctAnswer: 'too many', correctFeedback: tri('Да. People работает как plural countable. С ним используется too many.', 'Так. People працює як plural countable. З ним використовується too many.'), wrong: { 'too much': tri('Too much используется с uncountable nouns. People plural, поэтому too many people.', 'Too much використовується з uncountable nouns. People plural, тому too many people.'), enough: tri('Enough people значит достаточно людей. Здесь смысл слишком много людей: too many people.', 'Enough people означає достатньо людей. Тут сенс занадто багато людей: too many people.'), 'many enough': tri('Many enough people здесь неправильно. Нужно too many people.', 'Many enough people тут неправильно. Потрібно too many people.') }, retryFeedback: [tri('People plural = too many people.'), tri('Too many people.'), tri('Подсказка: There are too many people here.', 'Підказка: There are too many people here.')], focusWords: ['too many', 'people'] }),
    step({ id: 'too_enough_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'too_much_uncountable', sentence: 'There is ___ noise.', translation: tri('Слишком много шума.', 'Занадто багато шуму.'), options: ['too much', 'too many', 'enough', 'many'], correctAnswer: 'too much', correctFeedback: tri('Да. Noise - uncountable noun. С ним используется too much.', 'Так. Noise - uncountable noun. З ним використовується too much.'), wrong: { 'too many': tri('Too many используется с plural countable nouns. Noise uncountable, поэтому too much noise.', 'Too many використовується з plural countable nouns. Noise uncountable, тому too much noise.'), enough: tri('Enough noise значит достаточно шума. Здесь смысл слишком много шума: too much noise.', 'Enough noise означає достатньо шуму. Тут сенс занадто багато шуму: too much noise.'), many: tri('Many не подходит к uncountable noise. Нужно too much noise.', 'Many не підходить до uncountable noise. Потрібно too much noise.') }, retryFeedback: [tri('Noise uncountable = too much.'), tri('Too much noise.'), tri('Подсказка: There is too much noise.', 'Підказка: There is too much noise.')], focusWords: ['too much', 'noise'] }),
    step({ id: 'too_enough_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'too_to_structure', sentence: 'He is ___ tired to work.', translation: tri('Он слишком устал, чтобы работать.', 'Він занадто втомлений, щоб працювати.'), options: ['too', 'enough', 'too much', 'many'], correctAnswer: 'too', correctFeedback: tri('Да. Too tired to work = слишком устал, чтобы работать.', 'Так. Too tired to work = занадто втомлений, щоб працювати.'), wrong: { enough: tri('Tired enough to work означает достаточно устал, чтобы работать, что нелогично. Здесь слишком устал = too tired.', 'Tired enough to work означає достатньо втомлений, щоб працювати, що нелогічно. Тут занадто втомлений = too tired.'), 'too much': tri('Too much не ставится перед adjective tired. Нужно too tired.', 'Too much не ставиться перед adjective tired. Потрібно too tired.'), many: tri('Many не подходит к adjective tired. Нужно too tired.', 'Many не підходить до adjective tired. Потрібно too tired.') }, retryFeedback: [tri('Too + adjective + to verb.'), tri('Too tired to work.'), tri('Подсказка: He is too tired to work.', 'Підказка: He is too tired to work.')], focusWords: ['too tired', 'too ... to'] }),
    step({ id: 'too_enough_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_too_enough_position', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.'), options: ['too expensive / good enough', 'expensive too / enough good', 'too expensive / enough good', 'expensive enough / too good'], correctAnswer: 'too expensive / good enough', correctFeedback: tri('Да. Too перед adjective. Enough после adjective.', 'Так. Too перед adjective. Enough після adjective.'), wrong: { 'expensive too / enough good': tri('Позиции перепутаны. Нужно too expensive и good enough.', 'Позиції переплутані. Потрібно too expensive і good enough.'), 'too expensive / enough good': tri('Too expensive правильно, но enough good неправильно. Нужно good enough.', 'Too expensive правильно, але enough good неправильно. Потрібно good enough.'), 'expensive enough / too good': tri('Expensive enough значит достаточно дорогой, а too good значит слишком хороший. Это не нужная пара для позиции too/enough.', 'Expensive enough означає достатньо дорогий, а too good означає занадто хороший. Це не потрібна пара для позиції too/enough.') }, retryFeedback: [tri('Too before. Enough after.'), tri('Too expensive / good enough.'), tri('Подсказка: too expensive / good enough.', 'Підказка: too expensive / good enough.')], focusWords: ['too expensive', 'good enough'] }),
    step({ id: 'too_enough_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_enough_adjective_noun', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.'), options: ['old enough / enough money', 'enough old / money enough', 'old enough / money enough', 'enough old / enough money'], correctAnswer: 'old enough / enough money', correctFeedback: tri('Да. С adjective enough после: old enough. С noun enough перед: enough money.', 'Так. З adjective enough після: old enough. З noun enough перед: enough money.'), wrong: { 'enough old / money enough': tri('Обе позиции перепутаны. Нужно old enough и enough money.', 'Обидві позиції переплутані. Потрібно old enough і enough money.'), 'old enough / money enough': tri('Old enough правильно, но money enough неправильно. Нужно enough money.', 'Old enough правильно, але money enough неправильно. Потрібно enough money.'), 'enough old / enough money': tri('Enough money правильно, но enough old неправильно. Нужно old enough.', 'Enough money правильно, але enough old неправильно. Потрібно old enough.') }, retryFeedback: [tri('Adjective + enough. Enough + noun.'), tri('Old enough / enough money.'), tri('Подсказка: old enough / enough money.', 'Підказка: old enough / enough money.')], focusWords: ['old enough', 'enough money'] }),
    step({ id: 'too_enough_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.'), options: ['The room is too small, and we don\'t have enough chairs.', 'The room is small too, and we don\'t have chairs enough.', 'The room is enough small, and we don\'t have too chairs.', 'The room is too much small, and we don\'t have many enough chairs.'], correctAnswer: 'The room is too small, and we don\'t have enough chairs.', correctFeedback: tri('Да. Too small = слишком маленькая. Enough chairs = достаточно стульев.', 'Так. Too small = занадто маленька. Enough chairs = достатньо стільців.'), wrong: { 'The room is small too, and we don\'t have chairs enough.': tri('Позиции нарушены. Нужно too small и enough chairs.', 'Позиції порушені. Потрібно too small і enough chairs.'), 'The room is enough small, and we don\'t have too chairs.': tri('Enough small неправильно. Too chairs тоже неправильно. Нужны too small и enough chairs.', 'Enough small неправильно. Too chairs теж неправильно. Потрібні too small і enough chairs.'), 'The room is too much small, and we don\'t have many enough chairs.': tri('Too much small неправильно. Many enough chairs тоже неправильно. Нужно too small / enough chairs.', 'Too much small неправильно. Many enough chairs теж неправильно. Потрібно too small / enough chairs.') }, retryFeedback: [tri('Too + small. Enough + chairs.'), tri('Too small / enough chairs.'), tri('Подсказка: The room is too small, and we don\'t have enough chairs.', 'Підказка: The room is too small, and we don\'t have enough chairs.')], focusWords: ['too small', 'enough chairs'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'enough_before_adjective_error',
      'enough_after_noun_error',
      'too_after_adjective_error',
      'too_enough_meaning_confusion',
      'too_much_many_confusion',
      'not_enough_position_error',
      'too_to_structure_error',
      'enough_to_structure_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Показываем значение и позицию too/enough.', 'Показуємо значення і позицію too/enough.'),
    depth2: tri('Спрашиваем: это избыток с проблемой или достаточность?', 'Питаємо: це надлишок з проблемою чи достатність?'),
    depth3: tri('Показываем пары too hot / hot enough / enough time.', 'Показуємо пари too hot / hot enough / enough time.'),
    depth4: tri('Почти подсказка: прямо указываем правильный порядок слов.', 'Майже підказка: прямо вказуємо правильний порядок слів.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        'Остановись. Too = слишком, обычно проблема. Too стоит перед adjective/adverb: too hot. Enough = достаточно. После adjective: hot enough. Перед noun: enough time.',
        'Зупинись. Too = занадто, зазвичай проблема. Too стоїть перед adjective/adverb: too hot. Enough = достатньо. Після adjective: hot enough. Перед noun: enough time.',
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_word_type_hint_then_retry',
      card: tri(
        'Подсказка по типу слова: система покажет, после too/enough идет adjective, adverb или noun, но не выберет ответ за пользователя.',
        'Підказка за типом слова: система покаже, після too/enough іде adjective, adverb або noun, але не вибере відповідь за користувача.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        'Режим подсказки: сначала выбери смысл - слишком или достаточно. Потом выбери тип слова - adjective или noun.',
        'Режим підказки: спочатку обери сенс - занадто чи достатньо. Потім обери тип слова - adjective чи noun.',
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_too_enough_001', prompt: tri('Too hot означает слишком горячий или достаточно горячий?', 'Too hot означає занадто гарячий чи достатньо гарячий?'), options: ['слишком горячий', 'достаточно горячий'], correctIndex: 0, thenReturnToExerciseId: 'too_enough_easy_001' },
      { id: 'guided_too_enough_002', prompt: tri('С adjective enough стоит до или после adjective?', 'З adjective enough стоїть до чи після adjective?'), options: ['до', 'после'], correctIndex: 1, thenReturnToExerciseId: 'too_enough_contrast_001' },
      { id: 'guided_too_enough_003', prompt: tri('С noun enough стоит до или после noun?', 'З noun enough стоїть до чи після noun?'), options: ['до', 'после'], correctIndex: 0, thenReturnToExerciseId: 'too_enough_contrast_004' },
      { id: 'guided_too_enough_004', prompt: tri('People это plural countable или uncountable?', 'People це plural countable чи uncountable?'), options: ['plural countable', 'uncountable'], correctIndex: 0, thenReturnToExerciseId: 'too_enough_mixed_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'modifier',
    microDiagnosisId: 'too_enough',
    diagnosisLabel: tri('Too / Enough', 'Too / Enough'),
    contrastSet: CONTRAST,
    focusWords: ['too hot', 'good enough', 'enough time', 'too much', 'too many', 'not enough'],
    focusPatterns: [
      'too_adjective_hot',
      'too_adjective_expensive',
      'too_adverb_fast',
      'adjective_enough_good',
      'adjective_enough_old',
      'adverb_enough_fast',
      'enough_before_noun_time',
      'enough_before_noun_money',
      'enough_before_plural_noun',
      'too_many_plural',
      'too_much_uncountable',
      'too_to_structure',
      'mixed_too_enough_position',
      'mixed_enough_adjective_noun',
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
    start: 'diagnosis_training_too_enough_start',
    answer: 'diagnosis_training_too_enough_answer',
    mastery: 'diagnosis_training_too_enough_mastery',
    fallback: 'diagnosis_training_too_enough_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: {
      category: 'modifier',
      microDiagnosisId: 'too_enough',
      contrastSet: SMART_CONTRAST,
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logModifierPosition: true,
      logWordType: true,
      logMeaningType: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=modifier&microDiagnosisId=too_enough',
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


