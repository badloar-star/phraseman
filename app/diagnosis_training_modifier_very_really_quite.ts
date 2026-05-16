import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = [
  'very + adjective',
  'really + adjective',
  'quite + adjective',
  'gradable adjective',
  'strong adjective',
  'intensifier position',
  'too vs very',
];

const SMART_CONTRAST = ['very', 'really', 'quite', 'too'];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'Сначала реши оттенок: very = нейтрально очень, really = живо и эмоционально, quite = довольно или вполне, too = слишком с проблемой.',
      'Спочатку виріши відтінок: very = нейтрально дуже, really = живо й емоційно, quite = доволі або цілком, too = занадто з проблемою.',
      'First choose the nuance: very, really, quite, or too.',
    ),
    depth2,
    depth3,
    depth4,
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Здесь ошибка в оттенке или позиции усилителя. Нужная форма: ${correct}.`,
    `Тут помилка у відтінку або позиції підсилювача. Потрібна форма: ${correct}.`,
    `Use this modifier pattern: ${correct}.`,
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
      'Very, really и quite обычно стоят перед adjective/adverb. Very нейтрально усиливает, really звучит живее, quite часто делает оценку мягче. Too не просто усиливает, а показывает проблему.',
      'Very, really і quite зазвичай стоять перед adjective/adverb. Very нейтрально підсилює, really звучить живіше, quite часто робить оцінку м’якшою. Too не просто підсилює, а показує проблему.',
      'Very, really, and quite usually go before adjectives/adverbs. Too marks a problem.',
    ),
    microTask: tri(
      'Выбери усилитель, который точно передает оттенок фразы.',
      'Обери підсилювач, який точно передає відтінок фрази.',
      'Choose the modifier with the right nuance.',
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
      'Скелет: very/really/quite + adjective/adverb. Very = очень. Really = реально/эмоционально. Quite = довольно/мягче. Too = слишком, есть проблема.',
      'Скелет: very/really/quite + adjective/adverb. Very = дуже. Really = реально/емоційно. Quite = доволі/м’якше. Too = занадто, є проблема.',
      'Very/really/quite go before adjectives/adverbs; too marks excess.',
    ),
    focusWords: input.focusWords,
  };
}

export const MODIFIER_VERY_REALLY_QUITE_TRAINING: DiagnosisTraining = {
  id: 'modifier_very_really_quite',
  category: 'modifier',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 35,
  supportedLocales: ['ru', 'uk'],
  title: tri('Very / Really / Quite: степень и сила оценки', 'Very / Really / Quite: ступінь і сила оцінки'),
  shortTitle: tri('Very / Really / Quite', 'Very / Really / Quite'),
  shortDiagnosis: tri(
    'Ты путаешь very, really и quite: все они усиливают слово, но дают разный оттенок.',
    'Ти плутаєш very, really і quite: усі вони підсилюють слово, але дають різний відтінок.',
  ),
  diagnosisText: tri(
    'Ты путаешь very, really и quite. Главная проблема в том, что все они усиливают слово, но делают это по-разному: very нейтрально усиливает, really звучит живее и эмоциональнее, quite может значить “довольно” или “вполне” в зависимости от контекста.',
    'Ти плутаєш very, really і quite. Головна проблема в тому, що всі вони підсилюють слово, але роблять це по-різному: very нейтрально підсилює, really звучить живіше й емоційніше, quite може означати “доволі” або “цілком” залежно від контексту.',
  ),
  mentalModel: tri(
    'Very = очень, нейтрально и прямо. Really = реально/действительно, живее и сильнее в разговоре. Quite = довольно/вполне, часто мягче и осторожнее. Very good = очень хорошо. Really good = реально хорошо. Quite good = довольно хорошо.',
    'Very = дуже, нейтрально і прямо. Really = реально/дійсно, живіше і сильніше в розмові. Quite = доволі/цілком, часто м’якше і обережніше. Very good = дуже добре. Really good = реально добре. Quite good = доволі добре.',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'Very, really и quite обычно стоят перед adjective/adverb: very good, really tired, quite difficult. Very нейтрально усиливает. Really звучит разговорнее и эмоциональнее. Quite часто смягчает: quite good = довольно хорошо, но не обязательно идеально.',
    'Very, really і quite зазвичай стоять перед adjective/adverb: very good, really tired, quite difficult. Very нейтрально підсилює. Really звучить розмовніше й емоційніше. Quite часто пом’якшує: quite good = доволі добре, але не обов’язково ідеально.',
  ),
  whatUserMustLearn: {
    ru: [
      'Very ставится перед adjective/adverb: very good, very fast, very important.',
      'Really ставится перед adjective/adverb и звучит живее: really good, really fast, really important.',
      'Quite ставится перед adjective/adverb и часто означает “довольно/вполне”: quite good, quite difficult, quite interesting.',
      'Very обычно нейтральное и безопасное усиление.',
      'Really часто звучит более разговорно и эмоционально.',
      'Quite может звучать слабее, чем very/really: quite good часто не так сильно, как very good.',
      'Very не используется с некоторыми strong adjectives так естественно, как absolutely/really: не всегда very perfect, лучше absolutely perfect или really perfect в разговоре.',
      'Very не равно too. Very hot = очень горячий. Too hot = слишком горячий, есть проблема.',
      'Нельзя ставить very/really/quite после adjective в базовой форме: good very неправильно.',
      'Перед noun без adjective эти слова обычно не работают как обычные определители: very money неправильно, quite money неправильно.',
    ],
    uk: [
      'Very ставиться перед adjective/adverb: very good, very fast, very important.',
      'Really ставиться перед adjective/adverb і звучить живіше: really good, really fast, really important.',
      'Quite ставиться перед adjective/adverb і часто означає “доволі/цілком”: quite good, quite difficult, quite interesting.',
      'Very зазвичай нейтральне і безпечне підсилення.',
      'Really часто звучить більш розмовно й емоційно.',
      'Quite може звучати слабше, ніж very/really: quite good часто не так сильно, як very good.',
      'Very не використовується з деякими strong adjectives так природно, як absolutely/really: не завжди very perfect, краще absolutely perfect або really perfect у розмові.',
      'Very не дорівнює too. Very hot = дуже гарячий. Too hot = занадто гарячий, є проблема.',
      'Не можна ставити very/really/quite після adjective у базовій формі: good very неправильно.',
      'Перед noun без adjective ці слова зазвичай не працюють як звичайні визначники: very money неправильно, quite money неправильно.',
    ],
    es: [
      'Very goes before adjectives/adverbs.',
      'Really goes before adjectives/adverbs and sounds more emotional.',
      'Quite goes before adjectives/adverbs and often softens the evaluation.',
      'Very is neutral.',
      'Really is conversational.',
      'Quite can be weaker than very/really.',
      'Strong adjectives often prefer absolutely or really.',
      'Very is not too.',
      'The modifier usually goes before the adjective/adverb.',
      'Do not use very/really/quite directly before nouns like determiners.',
    ],
  },
  examples: [
    { en: 'This lesson is very useful.', ru: 'Этот урок очень полезный.', uk: 'Цей урок дуже корисний.', es: 'This lesson is very useful.', why: tri('Very стоит перед adjective useful и нейтрально усиливает качество.', 'Very стоїть перед adjective useful і нейтрально підсилює якість.') },
    { en: 'This lesson is really useful.', ru: 'Этот урок реально полезный.', uk: 'Цей урок реально корисний.', es: 'This lesson is really useful.', why: tri('Really стоит перед adjective useful и звучит живее, разговорнее.', 'Really стоїть перед adjective useful і звучить живіше, розмовніше.') },
    { en: 'This lesson is quite useful.', ru: 'Этот урок довольно полезный.', uk: 'Цей урок доволі корисний.', es: 'This lesson is quite useful.', why: tri('Quite стоит перед adjective useful и часто звучит мягче: полезный, но без сильного восторга.', 'Quite стоїть перед adjective useful і часто звучить м’якше: корисний, але без сильного захвату.') },
    { en: 'She speaks very fast.', ru: 'Она говорит очень быстро.', uk: 'Вона говорить дуже швидко.', es: 'She speaks very fast.', why: tri('Fast здесь adverb. Very ставится перед adverb: very fast.', 'Fast тут adverb. Very ставиться перед adverb: very fast.') },
    { en: 'I am really tired.', ru: 'Я реально устал.', uk: 'Я реально втомився.', es: 'I am really tired.', why: tri('Really tired звучит эмоциональнее, чем very tired.', 'Really tired звучить емоційніше, ніж very tired.') },
    { en: 'The test was quite difficult.', ru: 'Тест был довольно сложным.', uk: 'Тест був доволі складним.', es: 'The test was quite difficult.', why: tri('Quite difficult означает “довольно сложный”, часто мягче, чем very difficult.', 'Quite difficult означає “доволі складний”, часто м’якше, ніж very difficult.') },
    { en: 'This coffee is very hot.', ru: 'Этот кофе очень горячий.', uk: 'Ця кава дуже гаряча.', es: 'This coffee is very hot.', why: tri('Very hot просто усиливает hot. Это не обязательно проблема.', 'Very hot просто підсилює hot. Це не обов’язково проблема.') },
    { en: 'This coffee is too hot.', ru: 'Этот кофе слишком горячий.', uk: 'Ця кава занадто гаряча.', es: 'This coffee is too hot.', why: tri('Too hot показывает, что горячесть мешает. Это не просто very.', 'Too hot показує, що гарячість заважає. Це не просто very.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты используешь very, really и quite как одинаковые усилители. Но для носителя они дают разный оттенок: нейтрально сильно, эмоционально сильно или мягко-довольно.', 'Схоже, ти використовуєш very, really і quite як однакові підсилювачі. Але для носія вони дають різний відтінок: нейтрально сильно, емоційно сильно або м’яко-доволі.') },
    { id: 'intro_rule', type: 'rule', text: tri('Very = очень. Really = реально/действительно. Quite = довольно/вполне. Все три обычно стоят перед adjective или adverb.', 'Very = дуже. Really = реально/дійсно. Quite = доволі/цілком. Усі три зазвичай стоять перед adjective або adverb.') },
    { id: 'intro_warning', type: 'warning', text: tri('Не путай very и too. Very hot = очень горячий. Too hot = слишком горячий, уже проблема.', 'Не плутай very і too. Very hot = дуже гарячий. Too hot = занадто гарячий, уже проблема.') },
  ],
  steps: [
    step({ id: 'modifier_vrq_easy_001', order: 1, difficulty: 'easy', targetSkill: 'very_adjective_useful', sentence: 'This lesson is ___ useful.', translation: tri('Этот урок очень полезный.', 'Цей урок дуже корисний.'), options: ['very', 'very much', 'many', 'good'], correctAnswer: 'very', correctFeedback: tri('Да. Useful - adjective. “Очень полезный” = very useful.', 'Так. Useful - adjective. “Дуже корисний” = very useful.'), wrong: { 'very much': tri('Very much обычно не ставится прямо перед adjective useful. Нужно very useful.', 'Very much зазвичай не ставиться прямо перед adjective useful. Потрібно very useful.'), many: tri('Many используется с plural nouns. Useful - adjective. Нужно very useful.', 'Many використовується з plural nouns. Useful - adjective. Потрібно very useful.'), good: tri('Good useful не строит нормальную связку. Для “очень полезный” нужен very useful.', 'Good useful не будує нормальний зв’язок. Для “дуже корисний” потрібно very useful.') }, retryFeedback: [tri('Очень + adjective = very + adjective.', 'Дуже + adjective = very + adjective.'), tri('Very useful.'), tri('Подсказка: This lesson is very useful.', 'Підказка: This lesson is very useful.')], focusWords: ['very useful'] }),
    step({ id: 'modifier_vrq_easy_002', order: 2, difficulty: 'easy', targetSkill: 'very_adverb_fast', sentence: 'She speaks ___ fast.', translation: tri('Она говорит очень быстро.', 'Вона говорить дуже швидко.'), options: ['very', 'many', 'much', 'very much'], correctAnswer: 'very', correctFeedback: tri('Да. Fast здесь adverb. Очень быстро = very fast.', 'Так. Fast тут adverb. Дуже швидко = very fast.'), wrong: { many: tri('Many не подходит к fast. Нужна форма very fast.', 'Many не підходить до fast. Потрібна форма very fast.'), much: tri('Much fast неправильно. Перед fast нужен very.', 'Much fast неправильно. Перед fast потрібен very.'), 'very much': tri('Very much fast звучит неправильно. Нужно very fast.', 'Very much fast звучить неправильно. Потрібно very fast.') }, retryFeedback: [tri('Очень быстро = very fast.', 'Дуже швидко = very fast.'), tri('Speaks very fast.'), tri('Подсказка: She speaks very fast.', 'Підказка: She speaks very fast.')], focusWords: ['very fast'] }),
    step({ id: 'modifier_vrq_easy_003', order: 3, difficulty: 'easy', targetSkill: 'very_position', sentence: 'Choose the correct phrase.', translation: tri('Очень важно.', 'Дуже важливо.'), options: ['very important', 'important very', 'many important', 'important much'], correctAnswer: 'very important', correctFeedback: tri('Да. Very стоит перед adjective: very important.', 'Так. Very стоїть перед adjective: very important.'), wrong: { 'important very': tri('Very не ставится после adjective в базовом порядке. Нужно very important.', 'Very не ставиться після adjective у базовому порядку. Потрібно very important.'), 'many important': tri('Many не усиливает adjective important. Нужно very important.', 'Many не підсилює adjective important. Потрібно very important.'), 'important much': tri('Important much неправильно. Нужно very important.', 'Important much неправильно. Потрібно very important.') }, retryFeedback: [tri('Very перед important.'), tri('Very important.'), tri('Подсказка: very important.', 'Підказка: very important.')], focusWords: ['very important'] }),
    step({ id: 'modifier_vrq_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'really_emotional_tired', sentence: 'I am ___ tired.', translation: tri('Я реально устал.', 'Я реально втомився.'), options: ['really', 'many', 'much', 'really much'], correctAnswer: 'really', correctFeedback: tri('Да. Really tired звучит живо и эмоционально: реально устал.', 'Так. Really tired звучить живо й емоційно: реально втомився.'), wrong: { many: tri('Many не подходит к tired. Нужно really tired.', 'Many не підходить до tired. Потрібно really tired.'), much: tri('Much tired неправильно. В разговорной оценке нужен really tired.', 'Much tired неправильно. У розмовній оцінці потрібно really tired.'), 'really much': tri('Really much tired неправильно. Нужно really tired.', 'Really much tired неправильно. Потрібно really tired.') }, retryFeedback: [tri('Реально устал = really tired.', 'Реально втомився = really tired.'), tri('Really tired.'), tri('Подсказка: I am really tired.', 'Підказка: I am really tired.')], focusWords: ['really tired'] }),
    step({ id: 'modifier_vrq_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'really_adjective_interesting', sentence: 'This story is ___ interesting.', translation: tri('Эта история реально интересная.', 'Ця історія реально цікава.'), options: ['really', 'really much', 'many', 'interesting really'], correctAnswer: 'really', correctFeedback: tri('Да. Really стоит перед adjective interesting.', 'Так. Really стоїть перед adjective interesting.'), wrong: { 'really much': tri('Really much interesting неправильно. Нужно really interesting.', 'Really much interesting неправильно. Потрібно really interesting.'), many: tri('Many не подходит к adjective interesting. Нужно really interesting.', 'Many не підходить до adjective interesting. Потрібно really interesting.'), 'interesting really': tri('Really обычно стоит перед adjective: really interesting.', 'Really зазвичай стоїть перед adjective: really interesting.') }, retryFeedback: [tri('Really перед interesting.'), tri('Really interesting.'), tri('Подсказка: This story is really interesting.', 'Підказка: This story is really interesting.')], focusWords: ['really interesting'] }),
    step({ id: 'modifier_vrq_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'really_vs_very_style', sentence: 'Choose the best conversational phrase.', translation: tri('Это реально важно.', 'Це реально важливо.'), options: ["It's really important.", "It's important really.", "It's many important.", "It's much important."], correctAnswer: "It's really important.", correctFeedback: tri('Да. Really important звучит естественно и разговорно.', 'Так. Really important звучить природно й розмовно.'), wrong: { "It's important really.": tri('Really в базовой позиции стоит перед adjective: really important.', 'Really у базовій позиції стоїть перед adjective: really important.'), "It's many important.": tri('Many не усиливает adjective important. Нужно really important.', 'Many не підсилює adjective important. Потрібно really important.'), "It's much important.": tri('Much important неправильно в этой фразе. Нужно really important или very important.', 'Much important неправильно в цій фразі. Потрібно really important або very important.') }, retryFeedback: [tri('Реально важно = really important.', 'Реально важливо = really important.'), tri("It's really important."), tri("Подсказка: It's really important.", "Підказка: It's really important.")], focusWords: ['really important'] }),
    step({ id: 'modifier_vrq_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'quite_moderate_good', sentence: 'The lesson was ___ good.', translation: tri('Урок был довольно хорошим.', 'Урок був доволі хорошим.'), options: ['quite', 'many', 'too', 'good quite'], correctAnswer: 'quite', correctFeedback: tri('Да. Quite good = довольно хороший, мягкая положительная оценка.', 'Так. Quite good = доволі хороший, м’яка позитивна оцінка.'), wrong: { many: tri('Many не подходит к adjective good. Нужно quite good.', 'Many не підходить до adjective good. Потрібно quite good.'), too: tri('Too good значит слишком хороший или очень хороший в разговорном смысле, но не “довольно хороший”. Нужно quite good.', 'Too good означає занадто хороший або дуже хороший у розмовному сенсі, але не “доволі хороший”. Потрібно quite good.'), 'good quite': tri('Quite стоит перед adjective: quite good.', 'Quite стоїть перед adjective: quite good.') }, retryFeedback: [tri('Довольно хороший = quite good.', 'Доволі хороший = quite good.'), tri('Quite good.'), tri('Подсказка: The lesson was quite good.', 'Підказка: The lesson was quite good.')], focusWords: ['quite good'] }),
    step({ id: 'modifier_vrq_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'quite_difficult', sentence: 'The test was ___ difficult.', translation: tri('Тест был довольно сложным.', 'Тест був доволі складним.'), options: ['quite', 'quite much', 'many', 'difficult quite'], correctAnswer: 'quite', correctFeedback: tri('Да. Quite difficult = довольно сложный.', 'Так. Quite difficult = доволі складний.'), wrong: { 'quite much': tri('Quite much difficult неправильно. Нужно quite difficult.', 'Quite much difficult неправильно. Потрібно quite difficult.'), many: tri('Many не подходит к difficult. Нужно quite difficult.', 'Many не підходить до difficult. Потрібно quite difficult.'), 'difficult quite': tri('Quite в базовой позиции стоит перед adjective: quite difficult.', 'Quite у базовій позиції стоїть перед adjective: quite difficult.') }, retryFeedback: [tri('Довольно сложный = quite difficult.', 'Доволі складний = quite difficult.'), tri('Quite difficult.'), tri('Подсказка: The test was quite difficult.', 'Підказка: The test was quite difficult.')], focusWords: ['quite difficult'] }),
    step({ id: 'modifier_vrq_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'quite_interesting', sentence: 'This idea is ___ interesting.', translation: tri('Эта идея довольно интересная.', 'Ця ідея доволі цікава.'), options: ['quite', 'quite many', 'many', 'interesting quite'], correctAnswer: 'quite', correctFeedback: tri('Да. Quite interesting = довольно интересная.', 'Так. Quite interesting = доволі цікава.'), wrong: { 'quite many': tri('Quite many interesting неправильно. Нужно quite interesting.', 'Quite many interesting неправильно. Потрібно quite interesting.'), many: tri('Many не подходит к adjective interesting. Нужно quite interesting.', 'Many не підходить до adjective interesting. Потрібно quite interesting.'), 'interesting quite': tri('Quite стоит перед adjective: quite interesting.', 'Quite стоїть перед adjective: quite interesting.') }, retryFeedback: [tri('Quite перед interesting.'), tri('Quite interesting.'), tri('Подсказка: This idea is quite interesting.', 'Підказка: This idea is quite interesting.')], focusWords: ['quite interesting'] }),
    step({ id: 'modifier_vrq_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'very_vs_too_hot', sentence: 'This coffee is ___ hot, but I can drink it.', translation: tri('Этот кофе очень горячий, но я могу его пить.', 'Ця кава дуже гаряча, але я можу її пити.'), options: ['very', 'too', 'many', 'enough'], correctAnswer: 'very', correctFeedback: tri('Да. Very hot = очень горячий. Но можно пить, значит это не too hot.', 'Так. Very hot = дуже гаряча. Але можна пити, значить це не too hot.'), wrong: { too: tri('Too hot обычно означает слишком горячий, из-за этого проблема. Но здесь “я могу пить”, поэтому very hot.', 'Too hot зазвичай означає занадто гаряча, через це проблема. Але тут “я можу пити”, тому very hot.'), many: tri('Many не подходит к adjective hot. Нужно very hot.', 'Many не підходить до adjective hot. Потрібно very hot.'), enough: tri('Hot enough значит достаточно горячий и enough стоит после hot. Здесь “очень горячий” = very hot.', 'Hot enough означає достатньо гаряча і enough стоїть після hot. Тут “дуже гаряча” = very hot.') }, retryFeedback: [tri('Очень, но не проблема = very.', 'Дуже, але не проблема = very.'), tri('Very hot.'), tri('Подсказка: This coffee is very hot, but I can drink it.', 'Підказка: This coffee is very hot, but I can drink it.')], focusWords: ['very hot'] }),
    step({ id: 'modifier_vrq_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'too_problem_hot', sentence: "This coffee is ___ hot. I can't drink it.", translation: tri('Этот кофе слишком горячий. Я не могу его пить.', 'Ця кава занадто гаряча. Я не можу її пити.'), options: ['too', 'very', 'quite', 'many'], correctAnswer: 'too', correctFeedback: tri('Да. Too hot показывает проблему: кофе нельзя пить.', 'Так. Too hot показує проблему: каву не можна пити.'), wrong: { very: tri("Very hot значит просто очень горячий. Здесь есть проблема: can't drink it. Поэтому too hot.", "Very hot означає просто дуже гаряча. Тут є проблема: can't drink it. Тому too hot."), quite: tri('Quite hot значит довольно горячий. Но здесь сильная проблема, поэтому too hot.', 'Quite hot означає доволі гаряча. Але тут сильна проблема, тому too hot.'), many: tri('Many не подходит к adjective hot. Нужно too hot.', 'Many не підходить до adjective hot. Потрібно too hot.') }, retryFeedback: [tri('Слишком и нельзя пить = too hot.', 'Занадто і не можна пити = too hot.'), tri('Too hot.'), tri("Подсказка: This coffee is too hot. I can't drink it.", "Підказка: This coffee is too hot. I can't drink it.")], focusWords: ['too hot'] }),
    step({ id: 'modifier_vrq_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'quite_vs_really_tone', sentence: 'The film was ___ good, but not amazing.', translation: tri('Фильм был довольно хорошим, но не потрясающим.', 'Фільм був доволі хорошим, але не вражаючим.'), options: ['quite', 'too', 'many', 'good very'], correctAnswer: 'quite', correctFeedback: tri('Да. Quite good подходит, когда оценка положительная, но не максимально сильная.', 'Так. Quite good підходить, коли оцінка позитивна, але не максимально сильна.'), wrong: { too: tri('Too good не означает “довольно хороший” в этом контексте. Нужно quite good.', 'Too good не означає “доволі хороший” у цьому контексті. Потрібно quite good.'), many: tri('Many не подходит к good. Нужно quite good.', 'Many не підходить до good. Потрібно quite good.'), 'good very': tri('Very не ставится после good. Но здесь по смыслу “довольно”, значит quite good.', 'Very не ставиться після good. Але тут за змістом “доволі”, значить quite good.') }, retryFeedback: [tri('Довольно хорошо, но не вау = quite good.', 'Доволі добре, але не вау = quite good.'), tri('Quite good.'), tri('Подсказка: The film was quite good, but not amazing.', 'Підказка: The film was quite good, but not amazing.')], focusWords: ['quite good'] }),
    step({ id: 'modifier_vrq_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_very_really_quite', sentence: 'Choose the best pair.', translation: tri('Очень полезно / реально устал / довольно сложно', 'Дуже корисно / реально втомився / доволі складно'), options: ['very useful / really tired / quite difficult', 'useful very / tired really / difficult quite', 'many useful / much tired / many difficult', 'very useful / really much tired / quite much difficult'], correctAnswer: 'very useful / really tired / quite difficult', correctFeedback: tri('Да. Усилители стоят перед adjective: very useful, really tired, quite difficult.', 'Так. Підсилювачі стоять перед adjective: very useful, really tired, quite difficult.'), wrong: { 'useful very / tired really / difficult quite': tri('Усилитель стоит после adjective. В базовом порядке он должен быть перед adjective.', 'Підсилювач стоїть після adjective. У базовому порядку він має бути перед adjective.'), 'many useful / much tired / many difficult': tri('Many/much не усиливают эти adjectives так. Нужны very/really/quite.', 'Many/much не підсилюють ці adjectives так. Потрібні very/really/quite.'), 'very useful / really much tired / quite much difficult': tri('Really much tired и quite much difficult неправильные формы. Нужно really tired / quite difficult.', 'Really much tired і quite much difficult неправильні форми. Потрібно really tired / quite difficult.') }, retryFeedback: [tri('Very/really/quite перед adjective.'), tri('Very useful / really tired / quite difficult.'), tri('Подсказка: very useful / really tired / quite difficult.', 'Підказка: very useful / really tired / quite difficult.')], focusWords: ['very useful', 'really tired', 'quite difficult'] }),
    step({ id: 'modifier_vrq_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_very_too', sentence: 'Choose the correct pair.', translation: tri('Очень горячий, но можно пить / слишком горячий, нельзя пить', 'Дуже гарячий, але можна пити / занадто гарячий, не можна пити'), options: ['very hot, but I can drink it / too hot to drink', 'too hot, but I can drink it / very hot to drink', 'hot very, but I can drink it / hot too to drink', 'many hot, but I can drink it / too much hot to drink'], correctAnswer: 'very hot, but I can drink it / too hot to drink', correctFeedback: tri('Да. Very просто усиливает. Too показывает проблему или невозможность.', 'Так. Very просто підсилює. Too показує проблему або неможливість.'), wrong: { 'too hot, but I can drink it / very hot to drink': tri('Too hot обычно показывает проблему. Если можно пить, лучше very hot. Для невозможности пить - too hot to drink.', 'Too hot зазвичай показує проблему. Якщо можна пити, краще very hot. Для неможливості пити - too hot to drink.'), 'hot very, but I can drink it / hot too to drink': tri('Very/too стоят перед adjective: very hot, too hot.', 'Very/too стоять перед adjective: very hot, too hot.'), 'many hot, but I can drink it / too much hot to drink': tri('Many hot и too much hot неправильные формы. Нужно very hot / too hot.', 'Many hot і too much hot неправильні форми. Потрібно very hot / too hot.') }, retryFeedback: [tri('Very = очень. Too = слишком, проблема.', 'Very = дуже. Too = занадто, проблема.'), tri('Very hot / too hot.'), tri('Подсказка: very hot, but I can drink it / too hot to drink.', 'Підказка: very hot, but I can drink it / too hot to drink.')], focusWords: ['very hot', 'too hot'] }),
    step({ id: 'modifier_vrq_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.'), options: ['The course is really useful, but the last test was quite difficult.', 'The course is useful really, but the last test was difficult quite.', 'The course is many useful, but the last test was much difficult.', 'The course is really much useful, but the last test was quite much difficult.'], correctAnswer: 'The course is really useful, but the last test was quite difficult.', correctFeedback: tri('Да. Really useful и quite difficult - естественные связки с усилителями перед adjectives.', 'Так. Really useful і quite difficult - природні зв’язки з підсилювачами перед adjectives.'), wrong: { 'The course is useful really, but the last test was difficult quite.': tri('Really и quite стоят после adjectives. Нужно really useful и quite difficult.', 'Really і quite стоять після adjectives. Потрібно really useful і quite difficult.'), 'The course is many useful, but the last test was much difficult.': tri('Many useful и much difficult неправильные формы. Нужны really useful / quite difficult.', 'Many useful і much difficult неправильні форми. Потрібні really useful / quite difficult.'), 'The course is really much useful, but the last test was quite much difficult.': tri('Really much useful и quite much difficult неправильные формы. Нужно really useful / quite difficult.', 'Really much useful і quite much difficult неправильні форми. Потрібно really useful / quite difficult.') }, retryFeedback: [tri('Really useful. Quite difficult.'), tri('The course is really useful / the test was quite difficult.'), tri('Подсказка: The course is really useful, but the last test was quite difficult.', 'Підказка: The course is really useful, but the last test was quite difficult.')], focusWords: ['really useful', 'quite difficult'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'intensifier_after_adjective_error',
      'very_too_confusion',
      'quite_meaning_confusion',
      'really_position_error',
      'very_with_noun_error',
      'too_instead_of_very_error',
      'quite_overstatement_error',
      'strong_adjective_modifier_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем оттенок смысла и позицию усилителя.', 'Звичайне пояснення: показуємо відтінок сенсу і позицію підсилювача.'),
    depth2: tri('Проще: спрашиваем, нужно “очень”, “реально” или “довольно”.', 'Простіше: питаємо, потрібно “дуже”, “реально” чи “доволі”.'),
    depth3: tri('Еще проще: показываем пары very good / really good / quite good.', 'Ще простіше: показуємо пари very good / really good / quite good.'),
    depth4: tri('Почти подсказка: прямо указываем very, really, quite или too.', 'Майже підказка: прямо вказуємо very, really, quite або too.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        'Остановись. Усилитель обычно стоит перед adjective/adverb: very good, really tired, quite difficult. Very = нейтрально очень. Really = живо/эмоционально. Quite = довольно/мягче. Too = слишком, есть проблема.',
        'Зупинись. Підсилювач зазвичай стоїть перед adjective/adverb: very good, really tired, quite difficult. Very = нейтрально дуже. Really = живо/емоційно. Quite = доволі/м’якше. Too = занадто, є проблема.',
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_intensity_hint_then_retry',
      card: tri(
        'Подсказка по оттенку: система покажет, нужен нейтральный, эмоциональный, мягкий или проблемный усилитель, но не выберет слово за пользователя.',
        'Підказка за відтінком: система покаже, потрібен нейтральний, емоційний, м’який або проблемний підсилювач, але не вибере слово за користувача.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        'Режим подсказки: сначала выбери смысл: очень, реально, довольно или слишком. Потом система вернет тебя к полной фразе.',
        'Режим підказки: спочатку обери сенс: дуже, реально, доволі або занадто. Потім система поверне тебе до повної фрази.',
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_modifier_vrq_001', prompt: tri('Very обычно означает очень или слишком с проблемой?', 'Very зазвичай означає дуже чи занадто з проблемою?'), options: ['очень', 'слишком с проблемой'], correctIndex: 0, thenReturnToExerciseId: 'modifier_vrq_easy_001' },
      { id: 'guided_modifier_vrq_002', prompt: tri('Really tired звучит нейтрально-книжно или живо-разговорно?', 'Really tired звучить нейтрально-книжно чи живо-розмовно?'), options: ['нейтрально-книжно', 'живо-разговорно'], correctIndex: 1, thenReturnToExerciseId: 'modifier_vrq_contrast_001' },
      { id: 'guided_modifier_vrq_003', prompt: tri('Quite good чаще значит довольно хорошо или слишком хорошо?', 'Quite good частіше означає доволі добре чи занадто добре?'), options: ['довольно хорошо', 'слишком хорошо'], correctIndex: 0, thenReturnToExerciseId: 'modifier_vrq_contrast_004' },
      { id: 'guided_modifier_vrq_004', prompt: tri('Too hot обычно показывает просто силу или проблему?', 'Too hot зазвичай показує просто силу чи проблему?'), options: ['просто силу', 'проблему'], correctIndex: 1, thenReturnToExerciseId: 'modifier_vrq_mixed_002' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'modifier',
    microDiagnosisId: 'modifier_very_really_quite',
    diagnosisLabel: tri('Very / Really / Quite', 'Very / Really / Quite'),
    contrastSet: CONTRAST,
    focusWords: ['very useful', 'really tired', 'quite good', 'quite difficult', 'very hot', 'too hot'],
    focusPatterns: [
      'very_adjective_useful',
      'very_adverb_fast',
      'very_position',
      'really_emotional_tired',
      'really_adjective_interesting',
      'really_vs_very_style',
      'quite_moderate_good',
      'quite_difficult',
      'quite_interesting',
      'very_vs_too_hot',
      'too_problem_hot',
      'quite_vs_really_tone',
      'mixed_very_really_quite',
      'mixed_very_too',
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
    start: 'diagnosis_training_modifier_very_really_quite_start',
    answer: 'diagnosis_training_modifier_very_really_quite_answer',
    mastery: 'diagnosis_training_modifier_very_really_quite_mastery',
    fallback: 'diagnosis_training_modifier_very_really_quite_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: {
      category: 'modifier',
      microDiagnosisId: 'modifier_very_really_quite',
      contrastSet: SMART_CONTRAST,
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logModifier: true,
      logIntensityMeaning: true,
      logModifierPosition: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=modifier&microDiagnosisId=modifier_very_really_quite',
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


