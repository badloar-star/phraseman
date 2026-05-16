import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk: string, es: string): TriText => ({ ru, uk, es });

function comparisonStep(input: {
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
  retry: [TriText, TriText, TriText];
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
      'Сначала определи тип adjective. Короткое слово часто получает -er: cheaper. Длинное слово обычно получает more: more expensive. Good и bad идут отдельно: better, worse. Не смешивай more и -er.',
      'Спочатку визнач тип adjective. Коротке слово часто отримує -er: cheaper. Довге слово зазвичай отримує more: more expensive. Good і bad ідуть окремо: better, worse. Не змішуй more і -er.',
      'Primero identifica el tipo de adjective. Palabra corta muchas veces recibe -er: cheaper. Palabra larga normalmente recibe more: more expensive. Good y bad van aparte: better, worse. No mezcles more y -er.',
    ),
    microTask: tri(
      'Выбери comparative form.',
      'Обери comparative form.',
      'Elige la comparative form.',
    ),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? tri(
        'Не совсем. Проверь: слово короткое, длинное или irregular? И нет ли одновременно more и -er?',
        'Не зовсім. Перевір: слово коротке, довге чи irregular? І чи немає одночасно more і -er?',
        'No exactamente. Revisa: la palabra es corta, larga o irregular? Y no hay more y -er al mismo tiempo?',
      )])),
    retryFeedback: [
      input.retry[0],
      input.retry[1],
      input.retry[2],
      tri(
        `Подсказка: правильная форма здесь - "${input.correctAnswer}".`,
        `Підказка: правильна форма тут - "${input.correctAnswer}".`,
        `Pista: la forma correcta aquí es "${input.correctAnswer}".`,
      ),
    ],
    fallbackExplanation: tri(
      'Короткое adjective: чаще -er. Длинное adjective: more. Good/bad: better/worse. После прямого сравнения часто нужен than.',
      'Коротке adjective: частіше -er. Довге adjective: more. Good/bad: better/worse. Після прямого порівняння часто потрібен than.',
      'Adjective corto: normalmente -er. Adjective largo: more. Good/bad: better/worse. Después de comparación directa muchas veces necesitamos than.',
    ),
    focusWords: input.focusWords,
  };
}

export const ADJECTIVE_COMPARISON_TRAINING: DiagnosisTraining = {
  id: 'adjective_comparison',
  category: 'adjective',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 13,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('Bigger / More Interesting: сравнение', 'Bigger / More Interesting: порівняння', 'Bigger / More Interesting: comparación'),
  shortTitle: tri('Comparatives', 'Comparatives', 'Comparatives'),
  shortDiagnosis: tri(
    'Ты смешиваешь -er, more, than и irregular forms вроде better/worse.',
    'Ти змішуєш -er, more, than та irregular forms на кшталт better/worse.',
    'Mezclas -er, more, than e irregular forms como better/worse.',
  ),
  diagnosisText: tri(
    'Ты путаешь сравнительную степень прилагательных: bigger, easier, more expensive, better, worse. Обычно проблема в том, что ты смешиваешь две системы: короткие прилагательные получают -er, длинные обычно получают more.',
    'Ти плутаєш вищий ступінь прикметників: bigger, easier, more expensive, better, worse. Зазвичай проблема в тому, що ти змішуєш дві системи: короткі прикметники отримують -er, довгі зазвичай отримують more.',
    'Confundes el comparativo de los adjetivos: bigger, easier, more expensive, better, worse. Normalmente el problema es mezclar dos sistemas: los adjetivos cortos reciben -er, los largos normalmente reciben more.',
  ),
  mentalModel: tri(
    'Короткое качество часто становится -er: fast -> faster, cheap -> cheaper. Длинное качество обычно получает more: expensive -> more expensive. После сравнения часто идет than.',
    'Коротка якість часто стає -er: fast -> faster, cheap -> cheaper. Довга якість зазвичай отримує more: expensive -> more expensive. Після порівняння часто йде than.',
    'La cualidad corta muchas veces toma -er: fast -> faster, cheap -> cheaper. La cualidad larga normalmente toma more: expensive -> more expensive. Después de la comparación muchas veces va than.',
  ),
  contrastSet: ['adjective+er', 'more + adjective', 'than', 'better', 'worse', 'as ... as'],
  coreRule: tri(
    'cheap -> cheaper, big -> bigger, easy -> easier. expensive -> more expensive, interesting -> more interesting. good -> better, bad -> worse. Сравнение: This is cheaper than that.',
    'cheap -> cheaper, big -> bigger, easy -> easier. expensive -> more expensive, interesting -> more interesting. good -> better, bad -> worse. Порівняння: This is cheaper than that.',
    'cheap -> cheaper, big -> bigger, easy -> easier. expensive -> more expensive, interesting -> more interesting. good -> better, bad -> worse. Comparación: This is cheaper than that.',
  ),
  whatUserMustLearn: {
    ru: [
      'Короткие прилагательные часто получают -er: fast -> faster, cheap -> cheaper.',
      'Big/hot удваивают последнюю согласную: bigger, hotter.',
      'Easy/happy меняют y на i + er: easier, happier.',
      'Длинные прилагательные обычно получают more: more expensive, more interesting.',
      'Нельзя смешивать две системы: more cheaper и more bigger неправильно.',
      'Good -> better, bad -> worse.',
      'После comparative form часто идет than.',
      'Если сравнение равное, используется as ... as.',
    ],
    uk: [
      'Короткі прикметники часто отримують -er: fast -> faster, cheap -> cheaper.',
      'Big/hot подвоюють останню приголосну: bigger, hotter.',
      'Easy/happy змінюють y на i + er: easier, happier.',
      'Довгі прикметники зазвичай отримують more: more expensive, more interesting.',
      'Не можна змішувати дві системи: more cheaper і more bigger неправильно.',
      'Good -> better, bad -> worse.',
      'Після comparative form часто йде than.',
      'Якщо порівняння рівне, використовується as ... as.',
    ],
    es: [
      'Los adjetivos cortos muchas veces reciben -er: fast -> faster, cheap -> cheaper.',
      'Big/hot duplican la última consonante: bigger, hotter.',
      'Easy/happy cambian y a i + er: easier, happier.',
      'Los adjetivos largos normalmente reciben more: more expensive, more interesting.',
      'No mezcles dos sistemas: more cheaper y more bigger son incorrectos.',
      'Good -> better, bad -> worse.',
      'Después de comparative form muchas veces va than.',
      'Si la comparación es igual, usamos as ... as.',
    ],
  },
  examples: [
    { en: 'This car is cheaper than that one.', ru: 'Эта машина дешевле той.', uk: 'Ця машина дешевша за ту.', es: 'Este coche es más barato que ese.', why: tri('Cheap короткое, поэтому cheaper. После сравнения than.', 'Cheap коротке, тому cheaper. Після порівняння than.', 'Cheap es corto, por eso cheaper. Después de comparación va than.') },
    { en: 'My room is bigger than yours.', ru: 'Моя комната больше твоей.', uk: 'Моя кімната більша за твою.', es: 'Mi habitación es más grande que la tuya.', why: tri('Big удваивает g: bigger.', 'Big подвоює g: bigger.', 'Big duplica g: bigger.') },
    { en: 'This question is easier than the last one.', ru: 'Этот вопрос легче предыдущего.', uk: 'Це питання легше за попереднє.', es: 'Esta pregunta es más fácil que la anterior.', why: tri('Easy меняет y на i: easier.', 'Easy змінює y на i: easier.', 'Easy cambia y a i: easier.') },
    { en: 'This course is more expensive than I expected.', ru: 'Этот курс дороже, чем я ожидал.', uk: 'Цей курс дорожчий, ніж я очікував.', es: 'Este curso es más caro de lo que esperaba.', why: tri('Expensive длинное, поэтому more expensive.', 'Expensive довге, тому more expensive.', 'Expensive es largo, por eso more expensive.') },
    { en: 'This book is more interesting than the film.', ru: 'Эта книга интереснее фильма.', uk: 'Ця книга цікавіша за фільм.', es: 'Este libro es más interesante que la película.', why: tri('Interesting длинное: more interesting.', 'Interesting довге: more interesting.', 'Interesting es largo: more interesting.') },
    { en: 'This answer is better.', ru: 'Этот ответ лучше.', uk: 'Ця відповідь краща.', es: 'Esta respuesta es mejor.', why: tri('Good имеет irregular form: better.', 'Good має irregular form: better.', 'Good tiene irregular form: better.') },
    { en: 'The situation is worse now.', ru: 'Ситуация сейчас хуже.', uk: 'Ситуація зараз гірша.', es: 'La situación está peor ahora.', why: tri('Bad имеет irregular form: worse.', 'Bad має irregular form: worse.', 'Bad tiene irregular form: worse.') },
    { en: 'This phone is as good as mine.', ru: 'Этот телефон такой же хороший, как мой.', uk: 'Цей телефон такий самий хороший, як мій.', es: 'Este teléfono es tan bueno como el mío.', why: tri('Равное сравнение строится через as ... as.', 'Рівне порівняння будується через as ... as.', 'La comparación igual se forma con as ... as.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты путаешь сравнение прилагательных: где -er, где more, а где better/worse.', 'Схоже, ти плутаєш порівняння прикметників: де -er, де more, а де better/worse.', 'Parece que confundes la comparación de adjetivos: dónde va -er, dónde more y dónde better/worse.') },
    { id: 'intro_rule', type: 'rule', text: tri('База простая: короткое слово часто получает -er. Длинное слово получает more. Good и bad: better и worse.', 'База проста: коротке слово часто отримує -er. Довге слово отримує more. Good і bad: better і worse.', 'La base es simple: palabra corta muchas veces recibe -er. Palabra larga recibe more. Good y bad: better y worse.') },
    { id: 'intro_warning', type: 'warning', text: tri('Не смешивай more и -er: не more cheaper, не more bigger.', 'Не змішуй more і -er: не more cheaper, не more bigger.', 'No mezcles more y -er: no more cheaper, no more bigger.') },
  ],
  steps: [
    comparisonStep({ id: 'comparison_easy_001', order: 1, difficulty: 'easy', targetSkill: 'short_adjective_er', sentence: 'This bag is ___ than mine.', translation: tri('Эта сумка дешевле моей.', 'Ця сумка дешевша за мою.', 'Este bolso es más barato que el mío.'), options: ['cheap', 'cheaper', 'more cheap', 'more cheaper'], correctAnswer: 'cheaper', correctFeedback: tri('Да. Cheap короткое прилагательное, поэтому cheap -> cheaper. More не нужен.', 'Так. Cheap короткий прикметник, тому cheap -> cheaper. More не потрібен.', 'Sí. Cheap es adjetivo corto, por eso cheap -> cheaper. No necesitamos more.'), wrong: { cheap: tri('Cheap просто описывает качество. Но есть than mine, значит нужно сравнение: cheaper.', 'Cheap просто описує якість. Але є than mine, значить потрібне порівняння: cheaper.', 'Cheap solo describe la cualidad. Pero hay than mine, así que necesitamos comparación: cheaper.'), 'more cheap': tri('More cheap можно услышать как разговорную ошибку, но стандартная форма для cheap - cheaper.', 'More cheap можна почути як розмовну помилку, але стандартна форма для cheap - cheaper.', 'More cheap puede oírse como error coloquial, pero la forma estándar de cheap es cheaper.'), 'more cheaper': tri('More cheaper смешивает две системы сразу. Нужна одна форма: cheaper.', 'More cheaper змішує дві системи одразу. Потрібна одна форма: cheaper.', 'More cheaper mezcla dos sistemas a la vez. Necesitamos una sola forma: cheaper.') }, retry: [tri('Cheap короткое. Короткое слово получает -er: cheaper.', 'Cheap коротке. Коротке слово отримує -er: cheaper.', 'Cheap es corto. Palabra corta recibe -er: cheaper.'), tri('Cheap -> cheaper.', 'Cheap -> cheaper.', 'Cheap -> cheaper.'), tri('Подсказка: This bag is cheaper than mine.', 'Підказка: This bag is cheaper than mine.', 'Pista: This bag is cheaper than mine.')], focusWords: ['cheap', 'cheaper', 'than'] }),
    comparisonStep({ id: 'comparison_easy_002', order: 2, difficulty: 'easy', targetSkill: 'short_adjective_er', sentence: 'My car is ___ than yours.', translation: tri('Моя машина быстрее твоей.', 'Моя машина швидша за твою.', 'Mi coche es más rápido que el tuyo.'), options: ['fast', 'faster', 'more fast', 'more faster'], correctAnswer: 'faster', correctFeedback: tri('Да. Fast короткое прилагательное. Comparative form - faster.', 'Так. Fast короткий прикметник. Comparative form - faster.', 'Sí. Fast es adjetivo corto. La forma comparativa es faster.'), wrong: { fast: tri('Fast не показывает сравнение. Than yours требует comparative form: faster.', 'Fast не показує порівняння. Than yours потребує comparative form: faster.', 'Fast no muestra comparación. Than yours necesita comparative form: faster.'), 'more fast': tri('Fast короткое слово, поэтому стандартно faster, не more fast.', 'Fast коротке слово, тому стандартно faster, не more fast.', 'Fast es palabra corta, por eso la forma estándar es faster, no more fast.'), 'more faster': tri('More faster неправильно, потому что faster уже comparative form. More добавлять нельзя.', 'More faster неправильно, бо faster уже comparative form. More додавати не можна.', 'More faster es incorrecto porque faster ya es forma comparativa. No añadimos more.') }, retry: [tri('Fast + er = faster.', 'Fast + er = faster.', 'Fast + er = faster.'), tri('Faster than yours.', 'Faster than yours.', 'Faster than yours.'), tri('Подсказка: My car is faster than yours.', 'Підказка: My car is faster than yours.', 'Pista: My car is faster than yours.')], focusWords: ['fast', 'faster', 'than'] }),
    comparisonStep({ id: 'comparison_easy_003', order: 3, difficulty: 'easy', targetSkill: 'more_long_adjective', sentence: 'This hotel is ___ than the last one.', translation: tri('Этот отель дороже предыдущего.', 'Цей готель дорожчий за попередній.', 'Este hotel es más caro que el anterior.'), options: ['expensive', 'expensiver', 'more expensive', 'more expensiver'], correctAnswer: 'more expensive', correctFeedback: tri('Да. Expensive длинное прилагательное. Поэтому more expensive.', 'Так. Expensive довгий прикметник. Тому more expensive.', 'Sí. Expensive es adjetivo largo. Por eso more expensive.'), wrong: { expensive: tri('Expensive просто описывает качество. Than the last one требует сравнение: more expensive.', 'Expensive просто описує якість. Але than the last one потребує порівняння: more expensive.', 'Expensive solo describe cualidad. Pero than the last one necesita comparación: more expensive.'), expensiver: tri('Expensiver не является стандартной формой. Для expensive используется more expensive.', 'Expensiver не є стандартною формою. Для expensive використовується more expensive.', 'Expensiver no es forma estándar. Para expensive usamos more expensive.'), 'more expensiver': tri('More expensiver смешивает more и -er. Для expensive нужна только форма more expensive.', 'More expensiver змішує more і -er. Для expensive потрібна тільки форма more expensive.', 'More expensiver mezcla more y -er. Para expensive solo necesitamos more expensive.') }, retry: [tri('Expensive длинное. Длинное слово получает more.', 'Expensive довге. Довге слово отримує more.', 'Expensive es largo. Palabra larga recibe more.'), tri('Expensive -> more expensive.', 'Expensive -> more expensive.', 'Expensive -> more expensive.'), tri('Подсказка: This hotel is more expensive than the last one.', 'Підказка: This hotel is more expensive than the last one.', 'Pista: This hotel is more expensive than the last one.')], focusWords: ['expensive', 'more expensive'] }),
    comparisonStep({ id: 'comparison_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'double_consonant_bigger', sentence: 'This room is ___ than mine.', translation: tri('Эта комната больше моей.', 'Ця кімната більша за мою.', 'Esta habitación es más grande que la mía.'), options: ['big', 'biger', 'bigger', 'more bigger'], correctAnswer: 'bigger', correctFeedback: tri('Да. Big короткое слово, но последняя g удваивается: big -> bigger.', 'Так. Big коротке слово, але остання g подвоюється: big -> bigger.', 'Sí. Big es palabra corta, pero la última g se duplica: big -> bigger.'), wrong: { big: tri('Big не показывает сравнение. Than mine требует comparative form: bigger.', 'Big не показує порівняння. Than mine потребує comparative form: bigger.', 'Big no muestra comparación. Than mine necesita comparative form: bigger.'), biger: tri('Biger написано неправильно. В слове big последняя g удваивается: bigger.', 'Biger написано неправильно. У слові big остання g подвоюється: bigger.', 'Biger está mal escrito. En big la última g se duplica: bigger.'), 'more bigger': tri('More bigger неправильно. Bigger уже означает "больше", more добавлять нельзя.', 'More bigger неправильно. Bigger уже означає "більший", more додавати не можна.', 'More bigger es incorrecto. Bigger ya significa "más grande", no añadimos more.') }, retry: [tri('Big -> bigger. Две g.', 'Big -> bigger. Дві g.', 'Big -> bigger. Dos g.'), tri('Bigger than mine.', 'Bigger than mine.', 'Bigger than mine.'), tri('Подсказка: This room is bigger than mine.', 'Підказка: This room is bigger than mine.', 'Pista: This room is bigger than mine.')], focusWords: ['big', 'bigger'] }),
    comparisonStep({ id: 'comparison_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'double_consonant_hotter', sentence: 'Today is ___ than yesterday.', translation: tri('Сегодня жарче, чем вчера.', 'Сьогодні спекотніше, ніж учора.', 'Hoy hace más calor que ayer.'), options: ['hot', 'hoter', 'hotter', 'more hot'], correctAnswer: 'hotter', correctFeedback: tri('Да. Hot короткое слово, последняя t удваивается: hot -> hotter.', 'Так. Hot коротке слово, остання t подвоюється: hot -> hotter.', 'Sí. Hot es palabra corta, la última t se duplica: hot -> hotter.'), wrong: { hot: tri('Hot просто описывает качество. Than yesterday требует сравнение: hotter.', 'Hot просто описує якість. Than yesterday потребує порівняння: hotter.', 'Hot solo describe cualidad. Than yesterday necesita comparación: hotter.'), hoter: tri('Hoter написано неправильно. В сравнении hot получает двойную t: hotter.', 'Hoter написано неправильно. У порівнянні hot отримує подвійну t: hotter.', 'Hoter está mal escrito. En comparación hot recibe doble t: hotter.'), 'more hot': tri('Hot короткое слово. Стандартная форма - hotter, не more hot.', 'Hot коротке слово. Стандартна форма - hotter, не more hot.', 'Hot es palabra corta. La forma estándar es hotter, no more hot.') }, retry: [tri('Hot -> hotter. Две t.', 'Hot -> hotter. Дві t.', 'Hot -> hotter. Dos t.'), tri('Hotter than yesterday.', 'Hotter than yesterday.', 'Hotter than yesterday.'), tri('Подсказка: Today is hotter than yesterday.', 'Підказка: Today is hotter than yesterday.', 'Pista: Today is hotter than yesterday.')], focusWords: ['hot', 'hotter'] }),
    comparisonStep({ id: 'comparison_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'y_to_ier', sentence: 'This exercise is ___ than the first one.', translation: tri('Это упражнение легче первого.', 'Ця вправа легша за першу.', 'Este ejercicio es más fácil que el primero.'), options: ['easy', 'easyer', 'easier', 'more easier'], correctAnswer: 'easier', correctFeedback: tri('Да. Easy заканчивается на consonant + y. Y меняется на i: easy -> easier.', 'Так. Easy закінчується на consonant + y. Y змінюється на i: easy -> easier.', 'Sí. Easy termina en consonant + y. Y cambia a i: easy -> easier.'), wrong: { easy: tri('Easy не показывает сравнение. Than the first one требует comparative form: easier.', 'Easy не показує порівняння. Than the first one потребує comparative form: easier.', 'Easy no muestra comparación. Than the first one necesita comparative form: easier.'), easyer: tri('Easyer написано неправильно. Когда consonant + y, y меняется на i: easier.', 'Easyer написано неправильно. Коли consonant + y, y змінюється на i: easier.', 'Easyer está mal escrito. Cuando hay consonant + y, y cambia a i: easier.'), 'more easier': tri('More easier неправильно. Easier уже comparative form, more не нужен.', 'More easier неправильно. Easier уже comparative form, more не потрібен.', 'More easier es incorrecto. Easier ya es forma comparativa, no necesitamos more.') }, retry: [tri('Easy -> easier. Y меняется на i.', 'Easy -> easier. Y змінюється на i.', 'Easy -> easier. Y cambia a i.'), tri('Easier than the first one.', 'Easier than the first one.', 'Easier than the first one.'), tri('Подсказка: This exercise is easier than the first one.', 'Підказка: This exercise is easier than the first one.', 'Pista: This exercise is easier than the first one.')], focusWords: ['easy', 'easier'] }),
    comparisonStep({ id: 'comparison_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'more_long_adjective', sentence: 'This story is ___ than the last one.', translation: tri('Эта история интереснее предыдущей.', 'Ця історія цікавіша за попередню.', 'Esta historia es más interesante que la anterior.'), options: ['interesting', 'interestinger', 'more interesting', 'more interestinger'], correctAnswer: 'more interesting', correctFeedback: tri('Да. Interesting длинное прилагательное. Поэтому more interesting.', 'Так. Interesting довгий прикметник. Тому more interesting.', 'Sí. Interesting es adjetivo largo. Por eso more interesting.'), wrong: { interesting: tri('Interesting просто описывает качество. Than the last one требует сравнение: more interesting.', 'Interesting просто описує якість. Than the last one потребує порівняння: more interesting.', 'Interesting solo describe cualidad. Than the last one necesita comparación: more interesting.'), interestinger: tri('Interestinger не стандартная форма. Для interesting используется more interesting.', 'Interestinger не стандартна форма. Для interesting використовується more interesting.', 'Interestinger no es forma estándar. Para interesting usamos more interesting.'), 'more interestinger': tri('More interestinger смешивает две системы. Нужна одна: more interesting.', 'More interestinger змішує дві системи. Потрібна одна: more interesting.', 'More interestinger mezcla dos sistemas. Necesitamos una: more interesting.') }, retry: [tri('Interesting длинное. Длинное слово получает more.', 'Interesting довге. Довге слово отримує more.', 'Interesting es largo. Palabra larga recibe more.'), tri('More interesting.', 'More interesting.', 'More interesting.'), tri('Подсказка: This story is more interesting.', 'Підказка: This story is more interesting.', 'Pista: This story is more interesting.')], focusWords: ['interesting', 'more interesting'] }),
    comparisonStep({ id: 'comparison_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'more_long_adjective', sentence: 'This chair is ___ than that one.', translation: tri('Этот стул удобнее того.', 'Цей стілець зручніший за той.', 'Esta silla es más cómoda que aquella.'), options: ['comfortable', 'comfortabler', 'more comfortable', 'more comfortabler'], correctAnswer: 'more comfortable', correctFeedback: tri('Да. Comfortable длинное прилагательное. Стандартная форма: more comfortable.', 'Так. Comfortable довгий прикметник. Стандартна форма: more comfortable.', 'Sí. Comfortable es adjetivo largo. Forma estándar: more comfortable.'), wrong: { comfortable: tri('Comfortable просто описывает качество. Для сравнения нужен more comfortable.', 'Comfortable просто описує якість. Для порівняння потрібен more comfortable.', 'Comfortable solo describe cualidad. Para comparación necesitamos more comfortable.'), comfortabler: tri('Comfortabler не стандартная форма. Лучше more comfortable.', 'Comfortabler не стандартна форма. Краще more comfortable.', 'Comfortabler no es forma estándar. Mejor more comfortable.'), 'more comfortabler': tri('More comfortabler неправильно: нельзя одновременно more и -er. Нужно more comfortable.', 'More comfortabler неправильно: не можна одночасно more і -er. Потрібно more comfortable.', 'More comfortabler es incorrecto: no usamos more y -er a la vez. Necesitamos more comfortable.') }, retry: [tri('Comfortable длинное. Используй more comfortable.', 'Comfortable довге. Використовуй more comfortable.', 'Comfortable es largo. Usa more comfortable.'), tri('More comfortable than that one.', 'More comfortable than that one.', 'More comfortable than that one.'), tri('Подсказка: This chair is more comfortable than that one.', 'Підказка: This chair is more comfortable than that one.', 'Pista: This chair is more comfortable than that one.')], focusWords: ['comfortable', 'more comfortable'] }),
    comparisonStep({ id: 'comparison_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'double_comparative', sentence: 'This option is ___ than the other one.', translation: tri('Этот вариант лучше другого.', 'Цей варіант кращий за інший.', 'Esta opción es mejor que la otra.'), options: ['better', 'more better', 'gooder', 'more good'], correctAnswer: 'better', correctFeedback: tri('Да. Good имеет irregular comparative form: better. Не gooder и не more better.', 'Так. Good має irregular comparative form: better. Не gooder і не more better.', 'Sí. Good tiene forma comparativa irregular: better. No gooder ni more better.'), wrong: { 'more better': tri('More better неправильно. Better уже означает "лучше", more добавлять нельзя.', 'More better неправильно. Better уже означає "краще", more додавати не можна.', 'More better es incorrecto. Better ya significa "mejor", no añadimos more.'), gooder: tri('Gooder неправильно. Good меняется нерегулярно: good -> better.', 'Gooder неправильно. Good змінюється нерегулярно: good -> better.', 'Gooder es incorrecto. Good cambia irregularmente: good -> better.'), 'more good': tri('More good не стандартная форма для сравнения. Правильно: better.', 'More good не стандартна форма для порівняння. Правильно: better.', 'More good no es forma estándar de comparación. Correcto: better.') }, retry: [tri('Good не получает -er и не получает more. У него своя форма: better.', 'Good не отримує -er і не отримує more. У нього своя форма: better.', 'Good no recibe -er ni more. Tiene su propia forma: better.'), tri('Good -> better.', 'Good -> better.', 'Good -> better.'), tri('Подсказка: This option is better than the other one.', 'Підказка: This option is better than the other one.', 'Pista: This option is better than the other one.')], focusWords: ['good', 'better'] }),
    comparisonStep({ id: 'comparison_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'irregular_bad_worse', sentence: 'The situation is ___ than before.', translation: tri('Ситуация хуже, чем раньше.', 'Ситуація гірша, ніж раніше.', 'La situación está peor que antes.'), options: ['bad', 'badder', 'worse', 'more bad'], correctAnswer: 'worse', correctFeedback: tri('Да. Bad имеет irregular comparative form: worse.', 'Так. Bad має irregular comparative form: worse.', 'Sí. Bad tiene forma comparativa irregular: worse.'), wrong: { bad: tri('Bad просто описывает качество. Than before требует сравнение: worse.', 'Bad просто описує якість. Than before потребує порівняння: worse.', 'Bad solo describe cualidad. Than before necesita comparación: worse.'), badder: tri('Badder не стандартная форма. Bad меняется нерегулярно: worse.', 'Badder не стандартна форма. Bad змінюється нерегулярно: worse.', 'Badder no es forma estándar. Bad cambia irregularmente: worse.'), 'more bad': tri('More bad не стандартная comparative form. Правильно: worse.', 'More bad не стандартна comparative form. Правильно: worse.', 'More bad no es forma comparativa estándar. Correcto: worse.') }, retry: [tri('Bad имеет свою форму: worse.', 'Bad має свою форму: worse.', 'Bad tiene su propia forma: worse.'), tri('Bad -> worse.', 'Bad -> worse.', 'Bad -> worse.'), tri('Подсказка: The situation is worse than before.', 'Підказка: The situation is worse than before.', 'Pista: The situation is worse than before.')], focusWords: ['bad', 'worse'] }),
    comparisonStep({ id: 'comparison_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'than_after_comparative', sentence: 'This lesson is easier ___ the last one.', translation: tri('Этот урок легче предыдущего.', 'Цей урок легший за попередній.', 'Esta lección es más fácil que la anterior.'), options: ['that', 'then', 'than', 'as'], correctAnswer: 'than', correctFeedback: tri('Да. После comparative form для прямого сравнения используется than: easier than.', 'Так. Після comparative form для прямого порівняння використовується than: easier than.', 'Sí. Después de comparative form para comparación directa usamos than: easier than.'), wrong: { that: tri('That означает "что/тот", но в сравнении нужен than: easier than.', 'That означає "що/той", але в порівнянні потрібен than: easier than.', 'That significa "que/ese", pero en comparación necesitamos than: easier than.'), then: tri('Then означает "потом/тогда". Для сравнения используется than.', 'Then означає "потім/тоді". Для порівняння використовується than.', 'Then significa "después/entonces". Para comparación usamos than.'), as: tri('As используется в равном сравнении: as easy as. Здесь форма easier требует than.', 'As використовується в рівному порівнянні: as easy as. Тут форма easier потребує than.', 'As se usa en comparación igual: as easy as. Aquí la forma easier necesita than.') }, retry: [tri('Easier требует than.', 'Easier потребує than.', 'Easier necesita than.'), tri('Easier than.', 'Easier than.', 'Easier than.'), tri('Подсказка: easier than the last one.', 'Підказка: easier than the last one.', 'Pista: easier than the last one.')], focusWords: ['easier', 'than'] }),
    comparisonStep({ id: 'comparison_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'as_as_equal_comparison', sentence: 'This phone is ___ good ___ mine.', translation: tri('Этот телефон такой же хороший, как мой.', 'Цей телефон такий самий хороший, як мій.', 'Este teléfono es tan bueno como el mío.'), options: ['as / as', 'than / than', 'better / than', 'more / as'], correctAnswer: 'as / as', correctFeedback: tri('Да. Для равного сравнения используется as ... as: as good as mine.', 'Так. Для рівного порівняння використовується as ... as: as good as mine.', 'Sí. Para comparación igual usamos as ... as: as good as mine.'), wrong: { 'than / than': tri('Than используется после comparative form: better than. Здесь сравнение равное: as good as.', 'Than використовується після comparative form: better than. Тут порівняння рівне: as good as.', 'Than se usa después de comparative form: better than. Aquí la comparación es igual: as good as.'), 'better / than': tri('Better than означает "лучше, чем". Но перевод "такой же хороший, как" требует as good as.', 'Better than означає "кращий, ніж". Але переклад "такий самий хороший, як" потребує as good as.', 'Better than significa "mejor que". Pero el sentido "tan bueno como" necesita as good as.'), 'more / as': tri('More as не строит равное сравнение. Нужна рамка as ... as.', 'More as не будує рівне порівняння. Потрібна рамка as ... as.', 'More as no forma comparación igual. Necesitamos el marco as ... as.') }, retry: [tri('Такой же ... как = as ... as.', 'Такий самий ... як = as ... as.', 'Tan ... como = as ... as.'), tri('As good as.', 'As good as.', 'As good as.'), tri('Подсказка: This phone is as good as mine.', 'Підказка: This phone is as good as mine.', 'Pista: This phone is as good as mine.')], focusWords: ['as', 'good'] }),
    comparisonStep({ id: 'comparison_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_short_long', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.', 'Elige la pareja correcta.'), options: ['cheap -> cheaper / expensive -> more expensive', 'cheap -> more cheap / expensive -> expensiver', 'cheap -> more cheaper / expensive -> more expensiver', 'cheap -> cheapier / expensive -> expensiver'], correctAnswer: 'cheap -> cheaper / expensive -> more expensive', correctFeedback: tri('Да. Cheap короткое -> cheaper. Expensive длинное -> more expensive.', 'Так. Cheap коротке -> cheaper. Expensive довге -> more expensive.', 'Sí. Cheap es corto -> cheaper. Expensive es largo -> more expensive.'), wrong: { 'cheap -> more cheap / expensive -> expensiver': tri('Системы перепутаны. Cheap обычно получает -er, а expensive получает more.', 'Системи переплутані. Cheap зазвичай отримує -er, а expensive отримує more.', 'Los sistemas están invertidos. Cheap normalmente recibe -er, y expensive recibe more.'), 'cheap -> more cheaper / expensive -> more expensiver': tri('В обеих формах смешаны more и -er. Нужны чистые формы: cheaper / more expensive.', 'В обох формах змішані more і -er. Потрібні чисті форми: cheaper / more expensive.', 'En ambas formas se mezclan more y -er. Necesitamos formas limpias: cheaper / more expensive.'), 'cheap -> cheapier / expensive -> expensiver': tri('Cheapier неправильно, потому что cheap -> cheaper. Expensiver тоже не стандартно, нужно more expensive.', 'Cheapier неправильно, бо cheap -> cheaper. Expensiver теж не стандартно, потрібно more expensive.', 'Cheapier es incorrecto porque cheap -> cheaper. Expensiver tampoco es estándar, necesitamos more expensive.') }, retry: [tri('Короткое cheap = cheaper. Длинное expensive = more expensive.', 'Коротке cheap = cheaper. Довге expensive = more expensive.', 'Corto cheap = cheaper. Largo expensive = more expensive.'), tri('Cheaper / more expensive.', 'Cheaper / more expensive.', 'Cheaper / more expensive.'), tri('Подсказка: cheap -> cheaper / expensive -> more expensive.', 'Підказка: cheap -> cheaper / expensive -> more expensive.', 'Pista: cheap -> cheaper / expensive -> more expensive.')], focusWords: ['cheap', 'expensive'] }),
    comparisonStep({ id: 'comparison_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_irregular', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.', 'Elige la pareja correcta.'), options: ['good -> better / bad -> worse', 'good -> gooder / bad -> badder', 'good -> more good / bad -> more bad', 'good -> more better / bad -> more worse'], correctAnswer: 'good -> better / bad -> worse', correctFeedback: tri('Да. Good и bad неправильные: better и worse.', 'Так. Good і bad неправильні: better і worse.', 'Sí. Good y bad son irregulares: better y worse.'), wrong: { 'good -> gooder / bad -> badder': tri('Gooder и badder не являются стандартными формами. Нужны better и worse.', 'Gooder і badder не є стандартними формами. Потрібні better і worse.', 'Gooder y badder no son formas estándar. Necesitamos better y worse.'), 'good -> more good / bad -> more bad': tri('More good и more bad не стандартные comparative forms. Используй better и worse.', 'More good і more bad не стандартні comparative forms. Використовуй better і worse.', 'More good y more bad no son formas comparativas estándar. Usa better y worse.'), 'good -> more better / bad -> more worse': tri('Better и worse уже comparative forms. More добавлять нельзя.', 'Better і worse уже comparative forms. More додавати не можна.', 'Better y worse ya son formas comparativas. No añadimos more.') }, retry: [tri('Good и bad надо запомнить отдельно.', 'Good і bad треба запамʼятати окремо.', 'Good y bad hay que memorizarlos aparte.'), tri('Good better. Bad worse.', 'Good better. Bad worse.', 'Good better. Bad worse.'), tri('Подсказка: good -> better / bad -> worse.', 'Підказка: good -> better / bad -> worse.', 'Pista: good -> better / bad -> worse.')], focusWords: ['good', 'bad'] }),
    comparisonStep({ id: 'comparison_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.', 'Elige la oración correcta.'), options: ['This app is easier and more useful than the old one.', 'This app is more easier and usefuler than the old one.', 'This app is easyer and more usefuler than the old one.', 'This app is more easy and more usefuler than the old one.'], correctAnswer: 'This app is easier and more useful than the old one.', correctFeedback: tri('Да. Easy -> easier. Useful чаще используется как more useful. После сравнения идет than.', 'Так. Easy -> easier. Useful частіше використовується як more useful. Після порівняння йде than.', 'Sí. Easy -> easier. Useful normalmente se usa como more useful. Después de comparación va than.'), wrong: { 'This app is more easier and usefuler than the old one.': tri('More easier неправильно: easier уже comparative. Usefuler лучше заменить на more useful.', 'More easier неправильно: easier уже comparative. Usefuler краще замінити на more useful.', 'More easier es incorrecto: easier ya es comparativo. Usefuler es mejor como more useful.'), 'This app is easyer and more usefuler than the old one.': tri('Easyer неправильно: easy -> easier. More usefuler смешивает more и -er. Нужно more useful.', 'Easyer неправильно: easy -> easier. More usefuler змішує more і -er. Потрібно more useful.', 'Easyer es incorrecto: easy -> easier. More usefuler mezcla more y -er. Necesitamos more useful.'), 'This app is more easy and more usefuler than the old one.': tri('More easy лучше заменить на easier. More usefuler неправильно, нужно more useful.', 'More easy краще замінити на easier. More usefuler неправильно, потрібно more useful.', 'More easy es mejor como easier. More usefuler es incorrecto, necesitamos more useful.') }, retry: [tri('Easy становится easier. Useful лучше more useful. Не смешивай more и -er.', 'Easy стає easier. Useful краще more useful. Не змішуй more і -er.', 'Easy se vuelve easier. Useful mejor more useful. No mezcles more y -er.'), tri('Easier and more useful.', 'Easier and more useful.', 'Easier and more useful.'), tri('Подсказка: This app is easier and more useful than the old one.', 'Підказка: This app is easier and more useful than the old one.', 'Pista: This app is easier and more useful than the old one.')], focusWords: ['easier', 'more useful'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['short_adjective_more_error', 'long_adjective_er_error', 'double_comparative_error', 'than_missing_error', 'irregular_good_bad_error', 'spelling_double_consonant_error', 'y_to_ier_error', 'as_as_confusion'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем тип adjective и нужную comparative form.', 'Звичайне пояснення: показуємо тип adjective і потрібну comparative form.', 'Explicación normal: mostramos el tipo de adjective y la comparative form correcta.'),
    depth2: tri('Проще: слово короткое, длинное или неправильное?', 'Простіше: слово коротке, довге чи неправильне?', 'Más simple: la palabra es corta, larga o irregular?'),
    depth3: tri('Готовые пары: cheap -> cheaper, expensive -> more expensive.', 'Готові пари: cheap -> cheaper, expensive -> more expensive.', 'Parejas listas: cheap -> cheaper, expensive -> more expensive.'),
    depth4: tri('Почти подсказка: нужна форма -er, more или irregular.', 'Майже підказка: потрібна форма -er, more або irregular.', 'Casi pista: hace falta -er, more o irregular.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Остановись. Короткое слово - часто -er. Длинное слово - more. Good/bad - better/worse. Не ставь more и -er вместе.', 'Зупинись. Коротке слово - часто -er. Довге слово - more. Good/bad - better/worse. Не став more і -er разом.', 'Detente. Palabra corta - muchas veces -er. Palabra larga - more. Good/bad - better/worse. No pongas more y -er juntos.') },
    afterThreeWrongInSameExercise: { action: 'show_adjective_type_hint_then_retry', card: tri('Система покажет, adjective короткий, длинный или irregular, но не выберет ответ за пользователя.', 'Система покаже, adjective короткий, довгий чи irregular, але не вибере відповідь за користувача.', 'El sistema mostrará si el adjective es corto, largo o irregular, pero no elegirá la respuesta.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Режим подсказки: сначала выбери тип adjective. Потом вернемся к comparative form.', 'Режим підказки: спочатку обери тип adjective. Потім повернемося до comparative form.', 'Modo guiado: primero elige el tipo de adjective. Luego volvemos a comparative form.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_comparison_001', prompt: tri('Cheap - это короткое или длинное adjective?', 'Cheap - це коротке чи довге adjective?', 'Cheap es adjective corto o largo?'), options: ['короткое', 'длинное'], correctIndex: 0, thenReturnToExerciseId: 'comparison_easy_001' },
      { id: 'guided_comparison_002', prompt: tri('Expensive - это короткое или длинное adjective?', 'Expensive - це коротке чи довге adjective?', 'Expensive es adjective corto o largo?'), options: ['короткое', 'длинное'], correctIndex: 1, thenReturnToExerciseId: 'comparison_easy_003' },
      { id: 'guided_comparison_003', prompt: tri('Big в сравнении получает одну g или две g?', 'Big у порівнянні отримує одну g чи дві g?', 'Big en comparación recibe una g o dos g?'), options: ['одну g', 'две g'], correctIndex: 1, thenReturnToExerciseId: 'comparison_contrast_001' },
      { id: 'guided_comparison_004', prompt: tri('Good в сравнении становится gooder или better?', 'Good у порівнянні стає gooder чи better?', 'Good en comparación se vuelve gooder o better?'), options: ['gooder', 'better'], correctIndex: 1, thenReturnToExerciseId: 'comparison_contrast_006' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'adjective',
    microDiagnosisId: 'adjective_comparison',
    diagnosisLabel: tri('Comparatives: -er / more / than', 'Comparatives: -er / more / than', 'Comparatives: -er / more / than'),
    contrastSet: ['adjective+er', 'more + adjective', 'than', 'better', 'worse', 'as ... as'],
    focusWords: ['cheaper', 'bigger', 'easier', 'more expensive', 'better', 'worse', 'than'],
    focusPatterns: ['short_adjective_er', 'more_long_adjective', 'double_consonant_bigger', 'double_consonant_hotter', 'y_to_ier', 'double_comparative', 'irregular_bad_worse', 'than_after_comparative', 'as_as_equal_comparison', 'mixed_short_long', 'mixed_irregular', 'mixed_sentence_correction'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_adjective_comparison_start',
    answer: 'diagnosis_training_adjective_comparison_answer',
    mastery: 'diagnosis_training_adjective_comparison_mastery',
    fallback: 'diagnosis_training_adjective_comparison_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'adjective', microDiagnosisId: 'adjective_comparison', contrastSet: ['adjective+er', 'more + adjective', 'than', 'better', 'worse', 'as ... as'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logAdjectiveType: true, logComparativeForm: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=adjective&microDiagnosisId=adjective_comparison',
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


