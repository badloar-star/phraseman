import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk: string, es: string): TriText => ({ ru, uk, es });

function freqStep(input: {
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
      'Найди глагольный центр. Обычный глагол: frequency adverb перед ним. Be: после be. Auxiliary/modal: между auxiliary/modal и main verb.',
      'Знайди дієслівний центр. Звичайне дієслово: frequency adverb перед ним. Be: після be. Auxiliary/modal: між auxiliary/modal і main verb.',
      'Encuentra el centro verbal. Verbo normal: frequency adverb antes. Be: después de be. Auxiliary/modal: entre auxiliary/modal y main verb.',
    ),
    microTask: tri('Выбери место frequency adverb.', 'Обери місце frequency adverb.', 'Elige la posición del frequency adverb.'),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? tri(
        'Не совсем. Сначала найди тип глагола: обычный, be или auxiliary/modal.',
        'Не зовсім. Спочатку знайди тип дієслова: звичайний, be або auxiliary/modal.',
        'No exactamente. Primero encuentra el tipo de verbo: normal, be o auxiliary/modal.',
      )])),
    retryFeedback: [
      input.retry[0],
      input.retry[1],
      input.retry[2],
      tri(
        `Подсказка: здесь нужна форма "${input.correctAnswer}".`,
        `Підказка: тут потрібна форма "${input.correctAnswer}".`,
        `Pista: aquí necesitamos "${input.correctAnswer}".`,
      ),
    ],
    fallbackExplanation: tri(
      'Обычный глагол: I always work. Be: She is always late. Auxiliary/modal: I have never seen, You should always check.',
      'Звичайне дієслово: I always work. Be: She is always late. Auxiliary/modal: I have never seen, You should always check.',
      'Verbo normal: I always work. Be: She is always late. Auxiliary/modal: I have never seen, You should always check.',
    ),
    focusWords: input.focusWords,
  };
}

export const ADVERB_FREQUENCY_POSITION_TRAINING: DiagnosisTraining = {
  id: 'adverb_frequency_position',
  category: 'adverb',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 15,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('Always / Often / Never: место в предложении', 'Always / Often / Never: місце в реченні', 'Always / Often / Never: posición en la frase'),
  shortTitle: tri('Frequency Adverbs', 'Frequency Adverbs', 'Frequency Adverbs'),
  shortDiagnosis: tri(
    'Ты путаешь позицию always, usually, often, sometimes, rarely, never.',
    'Ти плутаєш позицію always, usually, often, sometimes, rarely, never.',
    'Confundes la posición de always, usually, often, sometimes, rarely, never.',
  ),
  diagnosisText: tri(
    'Ты путаешь место наречий частоты. Английский требует стабильную позицию: перед обычным глаголом, после be, между auxiliary/modal и main verb.',
    'Ти плутаєш місце прислівників частоти. Англійська потребує стабільну позицію: перед звичайним дієсловом, після be, між auxiliary/modal і main verb.',
    'Confundes la posición de los adverbios de frecuencia. El inglés exige una posición estable: antes del verbo normal, después de be, entre auxiliary/modal y main verb.',
  ),
  mentalModel: tri(
    'Frequency adverb обычно стоит перед обычным глаголом: I always drink coffee. Но после be: She is always late. Если есть auxiliary, ставим между auxiliary и main verb: I have never seen it.',
    'Frequency adverb зазвичай стоїть перед звичайним дієсловом: I always drink coffee. Але після be: She is always late. Якщо є auxiliary, ставимо між auxiliary і main verb: I have never seen it.',
    'Frequency adverb normalmente va antes del verbo normal: I always drink coffee. Pero después de be: She is always late. Si hay auxiliary, va entre auxiliary y main verb: I have never seen it.',
  ),
  contrastSet: ['before main verb', 'after be', 'between auxiliary and main verb', 'sometimes flexible'],
  coreRule: tri(
    'Обычный глагол: I always work. Be: She is always ready. Auxiliary: I have never seen it. Modal: You should always check.',
    'Звичайне дієслово: I always work. Be: She is always ready. Auxiliary: I have never seen it. Modal: You should always check.',
    'Verbo normal: I always work. Be: She is always ready. Auxiliary: I have never seen it. Modal: You should always check.',
  ),
  whatUserMustLearn: {
    ru: [
      'Always, usually, often, sometimes, rarely, never показывают частоту.',
      'С обычным глаголом adverb обычно стоит перед глаголом: I always drink coffee.',
      'После be adverb стоит после am/is/are/was/were: She is always late.',
      'С auxiliary adverb ставится между auxiliary и main verb: I have never seen it.',
      'С modal adverb ставится после modal и перед main verb: You should always check.',
      'Never уже отрицательное слово, поэтому не используем don\'t never.',
      'Sometimes может стоять в начале: Sometimes I work late.',
      'В вопросах adverb обычно идет после subject: Do you often travel?',
    ],
    uk: [
      'Always, usually, often, sometimes, rarely, never показують частоту.',
      'Зі звичайним дієсловом adverb зазвичай стоїть перед дієсловом: I always drink coffee.',
      'Після be adverb стоїть після am/is/are/was/were: She is always late.',
      'З auxiliary adverb ставиться між auxiliary і main verb: I have never seen it.',
      'З modal adverb ставиться після modal і перед main verb: You should always check.',
      'Never уже заперечне слово, тому не використовуємо don\'t never.',
      'Sometimes може стояти на початку: Sometimes I work late.',
      'У питаннях adverb зазвичай іде після subject: Do you often travel?',
    ],
    es: [
      'Always, usually, often, sometimes, rarely, never muestran frecuencia.',
      'Con verbo normal, adverb normalmente va antes del verbo: I always drink coffee.',
      'Después de be, adverb va después de am/is/are/was/were: She is always late.',
      'Con auxiliary, adverb va entre auxiliary y main verb: I have never seen it.',
      'Con modal, adverb va después del modal y antes del main verb: You should always check.',
      'Never ya es negativo, por eso no usamos don\'t never.',
      'Sometimes puede ir al principio: Sometimes I work late.',
      'En preguntas, adverb normalmente va después del subject: Do you often travel?',
    ],
  },
  examples: [
    { en: 'I always drink coffee in the morning.', ru: 'Я всегда пью кофе утром.', uk: 'Я завжди п’ю каву вранці.', es: 'Siempre tomo café por la mañana.', why: tri('Drink - обычный глагол, always перед ним.', 'Drink - звичайне дієслово, always перед ним.', 'Drink es verbo normal, always va antes.') },
    { en: 'She is always late.', ru: 'Она всегда опаздывает.', uk: 'Вона завжди запізнюється.', es: 'Ella siempre llega tarde.', why: tri('С be порядок другой: is always.', 'З be порядок інший: is always.', 'Con be cambia el orden: is always.') },
    { en: 'They usually work from home.', ru: 'Они обычно работают из дома.', uk: 'Вони зазвичай працюють з дому.', es: 'Normalmente trabajan desde casa.', why: tri('Work - обычный глагол, usually перед work.', 'Work - звичайне дієслово, usually перед work.', 'Work es verbo normal, usually va antes de work.') },
    { en: 'He is never angry.', ru: 'Он никогда не злится.', uk: 'Він ніколи не злиться.', es: 'Él nunca se enfada.', why: tri('Never стоит после is.', 'Never стоїть після is.', 'Never va después de is.') },
    { en: 'I have never seen this film.', ru: 'Я никогда не видел этот фильм.', uk: 'Я ніколи не бачив цей фільм.', es: 'Nunca he visto esta película.', why: tri('Never стоит между have и seen.', 'Never стоїть між have і seen.', 'Never va entre have y seen.') },
    { en: 'You should always check the details.', ru: 'Тебе всегда следует проверять детали.', uk: 'Тобі завжди слід перевіряти деталі.', es: 'Siempre deberías revisar los detalles.', why: tri('Always стоит после modal should.', 'Always стоїть після modal should.', 'Always va después del modal should.') },
    { en: 'Do you often travel?', ru: 'Ты часто путешествуешь?', uk: 'Ти часто подорожуєш?', es: 'Viajas a menudo?', why: tri('В вопросе often после subject you.', 'У питанні often після subject you.', 'En pregunta, often va después del subject you.') },
    { en: 'Sometimes I work late.', ru: 'Иногда я работаю допоздна.', uk: 'Іноді я працюю допізна.', es: 'A veces trabajo hasta tarde.', why: tri('Sometimes может стоять в начале.', 'Sometimes може стояти на початку.', 'Sometimes puede ir al principio.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Ты знаешь always/often/never, но ставишь их не туда.', 'Ти знаєш always/often/never, але ставиш їх не туди.', 'Conoces always/often/never, pero los colocas en el lugar equivocado.') },
    { id: 'intro_rule', type: 'rule', text: tri('База: перед обычным глаголом, после be, между auxiliary и main verb.', 'База: перед звичайним дієсловом, після be, між auxiliary і main verb.', 'Base: antes del verbo normal, después de be, entre auxiliary y main verb.') },
    { id: 'intro_warning', type: 'warning', text: tri('Не I drink coffee always, а I always drink coffee.', 'Не I drink coffee always, а I always drink coffee.', 'No I drink coffee always, sino I always drink coffee.') },
  ],
  steps: [
    freqStep({ id: 'freq_easy_001', order: 1, difficulty: 'easy', targetSkill: 'before_main_verb_always', sentence: 'I ___ drink coffee in the morning.', translation: tri('Я всегда пью кофе утром.', 'Я завжди п’ю каву вранці.', 'Siempre tomo café por la mañana.'), options: ['always', 'drink always', 'am always', 'always am'], correctAnswer: 'always', correctFeedback: tri('Да. Drink - обычный глагол. Always ставится перед ним: I always drink.', 'Так. Drink - звичайне дієслово. Always ставиться перед ним: I always drink.', 'Sí. Drink es verbo normal. Always va antes: I always drink.'), wrong: { 'drink always': tri('Drink always ставит always после обычного глагола. Базовый порядок: always drink.', 'Drink always ставить always після звичайного дієслова. Базовий порядок: always drink.', 'Drink always pone always después del verbo normal. Orden básico: always drink.'), 'am always': tri('Am здесь не нужен, потому что главный глагол drink.', 'Am тут не потрібен, бо головне дієслово drink.', 'Am no se necesita aquí porque el verbo principal es drink.'), 'always am': tri('Always am не подходит: уже есть обычный глагол drink.', 'Always am не підходить: вже є звичайне дієслово drink.', 'Always am no encaja: ya está el verbo normal drink.') }, retry: [tri('Обычный глагол drink. Always перед drink.', 'Звичайне дієслово drink. Always перед drink.', 'Verbo normal drink. Always antes de drink.'), tri('I always drink.', 'I always drink.', 'I always drink.'), tri('Подсказка: I always drink coffee.', 'Підказка: I always drink coffee.', 'Pista: I always drink coffee.')], focusWords: ['always', 'drink'] }),
    freqStep({ id: 'freq_easy_002', order: 2, difficulty: 'easy', targetSkill: 'before_main_verb_usually', sentence: 'They ___ work from home.', translation: tri('Они обычно работают из дома.', 'Вони зазвичай працюють з дому.', 'Normalmente trabajan desde casa.'), options: ['usually', 'work usually', 'are usually', 'usually are'], correctAnswer: 'usually', correctFeedback: tri('Да. Work - обычный глагол. Usually перед ним.', 'Так. Work - звичайне дієслово. Usually перед ним.', 'Sí. Work es verbo normal. Usually va antes.'), wrong: { 'work usually': tri('С обычным глаголом ставь usually перед work.', 'Зі звичайним дієсловом став usually перед work.', 'Con verbo normal, pon usually antes de work.'), 'are usually': tri('Are нужен с be-структурой. Здесь есть work.', 'Are потрібен з be-структурою. Тут є work.', 'Are se usa con be. Aquí está work.'), 'usually are': tri('Главный глагол work, значит usually work.', 'Головне дієслово work, значить usually work.', 'El verbo principal es work, entonces usually work.') }, retry: [tri('They work. Usually перед work.', 'They work. Usually перед work.', 'They work. Usually antes de work.'), tri('They usually work.', 'They usually work.', 'They usually work.'), tri('Подсказка: They usually work from home.', 'Підказка: They usually work from home.', 'Pista: They usually work from home.')], focusWords: ['usually', 'work'] }),
    freqStep({ id: 'freq_easy_003', order: 3, difficulty: 'easy', targetSkill: 'before_main_verb_often', sentence: 'He ___ calls me after work.', translation: tri('Он часто звонит мне после работы.', 'Він часто дзвонить мені після роботи.', 'Él me llama a menudo después del trabajo.'), options: ['often', 'calls often', 'is often', 'often is'], correctAnswer: 'often', correctFeedback: tri('Да. Calls - обычный глагол. Often перед ним.', 'Так. Calls - звичайне дієслово. Often перед ним.', 'Sí. Calls es verbo normal. Often va antes.'), wrong: { 'calls often': tri('Базовый надежный порядок: He often calls.', 'Базовий надійний порядок: He often calls.', 'El orden básico seguro es: He often calls.'), 'is often': tri('Is нужен с adjective/place. Здесь calls.', 'Is потрібен з adjective/place. Тут calls.', 'Is se usa con adjective/place. Aquí está calls.'), 'often is': tri('Главный глагол calls, значит often calls.', 'Головне дієслово calls, значить often calls.', 'El verbo principal es calls, entonces often calls.') }, retry: [tri('Often перед calls.', 'Often перед calls.', 'Often antes de calls.'), tri('He often calls.', 'He often calls.', 'He often calls.'), tri('Подсказка: He often calls me after work.', 'Підказка: He often calls me after work.', 'Pista: He often calls me after work.')], focusWords: ['often', 'calls'] }),
    freqStep({ id: 'freq_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'after_be_always', sentence: 'She ___ late.', translation: tri('Она всегда опаздывает.', 'Вона завжди запізнюється.', 'Ella siempre llega tarde.'), options: ['always is', 'is always', 'always', 'late always'], correctAnswer: 'is always', correctFeedback: tri('Да. С be порядок: subject + be + frequency adverb.', 'Так. З be порядок: subject + be + frequency adverb.', 'Sí. Con be: subject + be + frequency adverb.'), wrong: { 'always is': tri('Перед be always обычно не ставится. Нужно is always.', 'Перед be always зазвичай не ставиться. Потрібно is always.', 'Antes de be, always normalmente no va. Necesitamos is always.'), always: tri('She always late пропускает be. Нужно She is always late.', 'She always late пропускає be. Потрібно She is always late.', 'She always late omite be. Necesitamos She is always late.'), 'late always': tri('С be нужно is always late.', 'З be потрібно is always late.', 'Con be necesitamos is always late.') }, retry: [tri('Если есть is, always после is.', 'Якщо є is, always після is.', 'Si hay is, always después de is.'), tri('She is always late.', 'She is always late.', 'She is always late.'), tri('Подсказка: She is always late.', 'Підказка: She is always late.', 'Pista: She is always late.')], focusWords: ['is', 'always'] }),
    freqStep({ id: 'freq_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'after_be_usually', sentence: 'They ___ busy on Mondays.', translation: tri('Они обычно заняты по понедельникам.', 'Вони зазвичай зайняті по понеділках.', 'Normalmente están ocupados los lunes.'), options: ['usually are', 'are usually', 'usually', 'busy usually'], correctAnswer: 'are usually', correctFeedback: tri('Да. С be usually стоит после are.', 'Так. З be usually стоїть після are.', 'Sí. Con be, usually va después de are.'), wrong: { 'usually are': tri('Базовый порядок здесь: are usually.', 'Базовий порядок тут: are usually.', 'El orden básico aquí es: are usually.'), usually: tri('They usually busy пропускает be.', 'They usually busy пропускає be.', 'They usually busy omite be.'), 'busy usually': tri('С be нужно are usually busy.', 'З be потрібно are usually busy.', 'Con be necesitamos are usually busy.') }, retry: [tri('They are busy. Usually после are.', 'They are busy. Usually після are.', 'They are busy. Usually después de are.'), tri('They are usually busy.', 'They are usually busy.', 'They are usually busy.'), tri('Подсказка: They are usually busy on Mondays.', 'Підказка: They are usually busy on Mondays.', 'Pista: They are usually busy on Mondays.')], focusWords: ['are', 'usually'] }),
    freqStep({ id: 'freq_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'after_be_never', sentence: 'He ___ angry.', translation: tri('Он никогда не злится.', 'Він ніколи не злиться.', 'Él nunca se enfada.'), options: ['never is', 'is never', 'does never', "isn't never"], correctAnswer: 'is never', correctFeedback: tri('Да. С be never стоит после is.', 'Так. З be never стоїть після is.', 'Sí. Con be, never va después de is.'), wrong: { 'never is': tri('Нужно is never angry.', 'Потрібно is never angry.', 'Necesitamos is never angry.'), 'does never': tri('Angry требует be. Нужна форма is never.', 'Angry потребує be. Потрібна форма is never.', 'Angry necesita be. Necesitamos is never.'), "isn't never": tri('Never уже отрицательное. Isn\'t never дает двойное отрицание.', 'Never уже заперечне. Isn\'t never дає подвійне заперечення.', 'Never ya es negativo. Isn\'t never da doble negación.') }, retry: [tri('Never после is.', 'Never після is.', 'Never después de is.'), tri('He is never angry.', 'He is never angry.', 'He is never angry.'), tri('Подсказка: He is never angry.', 'Підказка: He is never angry.', 'Pista: He is never angry.')], focusWords: ['is', 'never'] }),
    freqStep({ id: 'freq_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'between_auxiliary_main_never', sentence: 'I have ___ seen this film.', translation: tri('Я никогда не видел этот фильм.', 'Я ніколи не бачив цей фільм.', 'Nunca he visto esta película.'), options: ['never', 'seen never', 'have never', "don't never"], correctAnswer: 'never', correctFeedback: tri('Да. Have - auxiliary, seen - main verb. Never между ними.', 'Так. Have - auxiliary, seen - main verb. Never між ними.', 'Sí. Have es auxiliary, seen es main verb. Never va entre ellos.'), wrong: { 'seen never': tri('Never не после seen, а между have и seen.', 'Never не після seen, а між have і seen.', 'Never no va después de seen, sino entre have y seen.'), 'have never': tri('Have уже есть перед пропуском. Нужно только never.', 'Have вже є перед пропуском. Потрібно тільки never.', 'Have ya está antes del hueco. Necesitamos solo never.'), "don't never": tri('Don\'t never - двойное отрицание. Здесь have never seen.', 'Don\'t never - подвійне заперечення. Тут have never seen.', 'Don\'t never es doble negación. Aquí have never seen.') }, retry: [tri('Have + never + seen.', 'Have + never + seen.', 'Have + never + seen.'), tri('Have never seen.', 'Have never seen.', 'Have never seen.'), tri('Подсказка: I have never seen this film.', 'Підказка: I have never seen this film.', 'Pista: I have never seen this film.')], focusWords: ['have', 'never'] }),
    freqStep({ id: 'freq_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'after_modal_before_main', sentence: 'You should ___ check the details.', translation: tri('Тебе всегда следует проверять детали.', 'Тобі завжди слід перевіряти деталі.', 'Siempre deberías revisar los detalles.'), options: ['always', 'check always', 'should always', 'always should'], correctAnswer: 'always', correctFeedback: tri('Да. Should - modal. Always после should и перед check.', 'Так. Should - modal. Always після should і перед check.', 'Sí. Should es modal. Always después de should y antes de check.'), wrong: { 'check always': tri('С modal порядок: should always check.', 'З modal порядок: should always check.', 'Con modal: should always check.'), 'should always': tri('Should уже есть перед пропуском. Нужно только always.', 'Should вже є перед пропуском. Потрібно тільки always.', 'Should ya está antes del hueco. Necesitamos solo always.'), 'always should': tri('В базовой структуре modal перед adverb: should always check.', 'У базовій структурі modal перед adverb: should always check.', 'En estructura básica, modal antes del adverb: should always check.') }, retry: [tri('Should + always + check.', 'Should + always + check.', 'Should + always + check.'), tri('Should always check.', 'Should always check.', 'Should always check.'), tri('Подсказка: You should always check the details.', 'Підказка: You should always check the details.', 'Pista: You should always check the details.')], focusWords: ['should', 'always'] }),
    freqStep({ id: 'freq_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'modal_usually_position', sentence: 'I can ___ help you after work.', translation: tri('Я обычно могу помочь тебе после работы.', 'Я зазвичай можу допомогти тобі після роботи.', 'Normalmente puedo ayudarte después del trabajo.'), options: ['usually', 'help usually', 'can usually', 'usually can'], correctAnswer: 'usually', correctFeedback: tri('Да. Can уже стоит перед пропуском. Usually после can и перед help.', 'Так. Can уже стоїть перед пропуском. Usually після can і перед help.', 'Sí. Can ya está antes del hueco. Usually después de can y antes de help.'), wrong: { 'help usually': tri('С modal порядок: can usually help.', 'З modal порядок: can usually help.', 'Con modal: can usually help.'), 'can usually': tri('Can уже есть перед пропуском. Нужно только usually.', 'Can вже є перед пропуском. Потрібно тільки usually.', 'Can ya está antes del hueco. Necesitamos solo usually.'), 'usually can': tri('Здесь после I can ___ help нужно usually.', 'Тут після I can ___ help потрібно usually.', 'Aquí después de I can ___ help necesitamos usually.') }, retry: [tri('Can + usually + help.', 'Can + usually + help.', 'Can + usually + help.'), tri('Can usually help.', 'Can usually help.', 'Can usually help.'), tri('Подсказка: I can usually help you after work.', 'Підказка: I can usually help you after work.', 'Pista: I can usually help you after work.')], focusWords: ['can', 'usually'] }),
    freqStep({ id: 'freq_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'question_frequency_position', sentence: '___ you often travel for work?', translation: tri('Ты часто путешествуешь по работе?', 'Ти часто подорожуєш по роботі?', 'Viajas a menudo por trabajo?'), options: ['Do', 'Often do', 'Do often', 'Are'], correctAnswer: 'Do', correctFeedback: tri('Да. Вопрос: Do you often travel?', 'Так. Питання: Do you often travel?', 'Sí. Pregunta: Do you often travel?'), wrong: { 'Often do': tri('Базовый вопрос: Do you often travel?', 'Базове питання: Do you often travel?', 'Pregunta básica: Do you often travel?'), 'Do often': tri('Нужно Do + subject + often + main verb.', 'Потрібно Do + subject + often + main verb.', 'Necesitamos Do + subject + often + main verb.'), Are: tri('Travel - main verb, поэтому вопрос начинается с Do.', 'Travel - main verb, тому питання починається з Do.', 'Travel es main verb, por eso la pregunta empieza con Do.') }, retry: [tri('Do you often travel?', 'Do you often travel?', 'Do you often travel?'), tri('Do + you + often + travel.', 'Do + you + often + travel.', 'Do + you + often + travel.'), tri('Подсказка: Do you often travel for work?', 'Підказка: Do you often travel for work?', 'Pista: Do you often travel for work?')], focusWords: ['do', 'often'] }),
    freqStep({ id: 'freq_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'negative_frequency_position', sentence: 'I don\'t ___ eat breakfast.', translation: tri('Я обычно не завтракаю.', 'Я зазвичай не снідаю.', 'Normalmente no desayuno.'), options: ['usually', 'eat usually', "don't usually", "usually don't"], correctAnswer: 'usually', correctFeedback: tri('Да. После don\'t adverb перед main verb: don\'t usually eat.', 'Так. Після don\'t adverb перед main verb: don\'t usually eat.', 'Sí. Después de don\'t, adverb antes del main verb: don\'t usually eat.'), wrong: { 'eat usually': tri('В отрицании базово: don\'t usually eat.', 'У запереченні базово: don\'t usually eat.', 'En negación: don\'t usually eat.'), "don't usually": tri('Don\'t уже есть перед пропуском. Нужно только usually.', 'Don\'t вже є перед пропуском. Потрібно тільки usually.', 'Don\'t ya está antes del hueco. Necesitamos solo usually.'), "usually don't": tri('Так можно в I usually don\'t eat. Но здесь уже I don\'t ___ eat.', 'Так можна в I usually don\'t eat. Але тут уже I don\'t ___ eat.', 'Funciona en I usually don\'t eat. Pero aquí ya está I don\'t ___ eat.') }, retry: [tri('Don\'t + usually + eat.', 'Don\'t + usually + eat.', 'Don\'t + usually + eat.'), tri('I don\'t usually eat.', 'I don\'t usually eat.', 'I don\'t usually eat.'), tri('Подсказка: I don\'t usually eat breakfast.', 'Підказка: I don\'t usually eat breakfast.', 'Pista: I don\'t usually eat breakfast.')], focusWords: ["don't", 'usually'] }),
    freqStep({ id: 'freq_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'never_no_double_negative', sentence: 'She ___ forgets my birthday.', translation: tri('Она никогда не забывает мой день рождения.', 'Вона ніколи не забуває мій день народження.', 'Ella nunca olvida mi cumpleaños.'), options: ['never', "doesn't never", 'not never', 'for never'], correctAnswer: 'never', correctFeedback: tri('Да. Never уже отрицательное слово. С обычным глаголом оно стоит перед ним.', 'Так. Never уже заперечне слово. Зі звичайним дієсловом воно стоїть перед ним.', 'Sí. Never ya es negativo. Con verbo normal va antes.'), wrong: { "doesn't never": tri('Doesn\'t never - двойное отрицание. Нужно never forgets.', 'Doesn\'t never - подвійне заперечення. Потрібно never forgets.', 'Doesn\'t never es doble negación. Necesitamos never forgets.'), 'not never': tri('Not never звучит как двойное отрицание. Нужно never.', 'Not never звучить як подвійне заперечення. Потрібно never.', 'Not never suena como doble negación. Necesitamos never.'), 'for never': tri('For never не используется. Нужно never.', 'For never не використовується. Потрібно never.', 'For never no se usa. Necesitamos never.') }, retry: [tri('Never уже означает “никогда не”.', 'Never уже означає “ніколи не”.', 'Never ya significa “nunca/no”.'), tri('She never forgets.', 'She never forgets.', 'She never forgets.'), tri('Подсказка: She never forgets my birthday.', 'Підказка: She never forgets my birthday.', 'Pista: She never forgets my birthday.')], focusWords: ['never', 'forgets'] }),
    freqStep({ id: 'freq_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'sometimes_front_position', sentence: '___ I work late.', translation: tri('Иногда я работаю допоздна.', 'Іноді я працюю допізна.', 'A veces trabajo hasta tarde.'), options: ['Sometimes', 'Always', 'Never', 'Usually am'], correctAnswer: 'Sometimes', correctFeedback: tri('Да. Sometimes может стоять в начале предложения.', 'Так. Sometimes може стояти на початку речення.', 'Sí. Sometimes puede ir al principio.'), wrong: { Always: tri('Always = всегда, а нужен смысл “иногда”.', 'Always = завжди, а потрібен сенс “іноді”.', 'Always = siempre, pero necesitamos “a veces”.'), Never: tri('Never = никогда. Здесь sometimes.', 'Never = ніколи. Тут sometimes.', 'Never = nunca. Aquí sometimes.'), 'Usually am': tri('Usually am не подходит перед I work late.', 'Usually am не підходить перед I work late.', 'Usually am no encaja antes de I work late.') }, retry: [tri('Иногда = sometimes.', 'Іноді = sometimes.', 'A veces = sometimes.'), tri('Sometimes I work late.', 'Sometimes I work late.', 'Sometimes I work late.'), tri('Подсказка: Sometimes I work late.', 'Підказка: Sometimes I work late.', 'Pista: Sometimes I work late.')], focusWords: ['sometimes'] }),
    freqStep({ id: 'freq_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_be_vs_main_verb', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.', 'Elige la pareja correcta.'), options: ['I always work / I am always ready', 'I work always / I always am ready', 'I am always work / I always ready', 'I always am work / I ready always'], correctAnswer: 'I always work / I am always ready', correctFeedback: tri('Да. Перед обычным глаголом: always work. После be: am always ready.', 'Так. Перед звичайним дієсловом: always work. Після be: am always ready.', 'Sí. Antes del verbo normal: always work. Después de be: am always ready.'), wrong: { 'I work always / I always am ready': tri('Нужно always work, но am always ready.', 'Потрібно always work, але am always ready.', 'Necesitamos always work, pero am always ready.'), 'I am always work / I always ready': tri('Work - обычный глагол; ready требует be.', 'Work - звичайне дієслово; ready потребує be.', 'Work es verbo normal; ready necesita be.'), 'I always am work / I ready always': tri('Для действия: I always work. Для состояния: I am always ready.', 'Для дії: I always work. Для стану: I am always ready.', 'Para acción: I always work. Para estado: I am always ready.') }, retry: [tri('Work = always work. Am = am always ready.', 'Work = always work. Am = am always ready.', 'Work = always work. Am = am always ready.'), tri('Always work / am always ready.', 'Always work / am always ready.', 'Always work / am always ready.'), tri('Подсказка: I always work / I am always ready.', 'Підказка: I always work / I am always ready.', 'Pista: I always work / I am always ready.')], focusWords: ['always', 'work', 'am'] }),
    freqStep({ id: 'freq_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_aux_modal_question_negative', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.', 'Elige la oración correcta.'), options: ['Do you often work late, or do you usually leave early?', 'Do often you work late, or do you leave usually early?', 'Often do you work late, or usually do you leave early?', 'Do you work often late, or do you leave early usually?'], correctAnswer: 'Do you often work late, or do you usually leave early?', correctFeedback: tri('Да. В вопросе после Do + subject идет frequency adverb.', 'Так. У питанні після Do + subject іде frequency adverb.', 'Sí. En pregunta, después de Do + subject va frequency adverb.'), wrong: { 'Do often you work late, or do you leave usually early?': tri('Нужно Do you often work / do you usually leave.', 'Потрібно Do you often work / do you usually leave.', 'Necesitamos Do you often work / do you usually leave.'), 'Often do you work late, or usually do you leave early?': tri('Это marked порядок; базово Do you often work / do you usually leave.', 'Це marked порядок; базово Do you often work / do you usually leave.', 'Es orden marcado; básico: Do you often work / do you usually leave.'), 'Do you work often late, or do you leave early usually?': tri('Adverb стоит после main verb. Базово после subject.', 'Adverb стоїть після main verb. Базово після subject.', 'El adverbio va después del main verb. Básico: después del subject.') }, retry: [tri('Do + you + often/usually + main verb.', 'Do + you + often/usually + main verb.', 'Do + you + often/usually + main verb.'), tri('Do you often work? Do you usually leave?', 'Do you often work? Do you usually leave?', 'Do you often work? Do you usually leave?'), tri('Подсказка: Do you often work late, or do you usually leave early?', 'Підказка: Do you often work late, or do you usually leave early?', 'Pista: Do you often work late, or do you usually leave early?')], focusWords: ['often', 'usually'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['frequency_after_main_verb_error', 'frequency_before_be_error', 'frequency_auxiliary_position_error', 'frequency_modal_position_error', 'never_double_negative_error', 'question_frequency_position_error', 'negative_frequency_position_error', 'sometimes_position_confusion'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Показываем тип глагола и позицию adverb.', 'Показуємо тип дієслова і позицію adverb.', 'Mostramos el tipo de verbo y la posición del adverbio.'),
    depth2: tri('Проще: be, auxiliary/modal или обычный глагол?', 'Простіше: be, auxiliary/modal чи звичайне дієслово?', 'Más simple: be, auxiliary/modal o verbo normal?'),
    depth3: tri('Блоки: I always work / She is always ready / I have never seen.', 'Блоки: I always work / She is always ready / I have never seen.', 'Bloques: I always work / She is always ready / I have never seen.'),
    depth4: tri('Почти подсказка: прямо указываем место frequency adverb.', 'Майже підказка: прямо вказуємо місце frequency adverb.', 'Casi pista: indicamos directamente el lugar del frequency adverb.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Обычный глагол: always work. Be: is always ready. Auxiliary/modal: have never seen, should always check.', 'Звичайне дієслово: always work. Be: is always ready. Auxiliary/modal: have never seen, should always check.', 'Verbo normal: always work. Be: is always ready. Auxiliary/modal: have never seen, should always check.') },
    afterThreeWrongInSameExercise: { action: 'show_verb_type_hint_then_retry', card: tri('Система покажет тип глагола, но не выберет позицию за пользователя.', 'Система покаже тип дієслова, але не вибере позицію за користувача.', 'El sistema mostrará el tipo de verbo, pero no elegirá la posición.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Режим подсказки: сначала выбери тип глагола.', 'Режим підказки: спочатку обери тип дієслова.', 'Modo guiado: primero elige el tipo de verbo.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_frequency_001', prompt: tri('Drink - обычный глагол или be?', 'Drink - звичайне дієслово чи be?', 'Drink es verbo normal o be?'), options: ['обычный глагол', 'be'], correctIndex: 0, thenReturnToExerciseId: 'freq_easy_001' },
      { id: 'guided_frequency_002', prompt: tri('В She ___ late нужна структура с be?', 'У She ___ late потрібна структура з be?', 'En She ___ late, necesitamos be?'), options: ['да', 'нет'], correctIndex: 0, thenReturnToExerciseId: 'freq_contrast_001' },
      { id: 'guided_frequency_003', prompt: tri('Have в have ___ seen - auxiliary?', 'Have у have ___ seen - auxiliary?', 'Have en have ___ seen es auxiliary?'), options: ['да', 'нет'], correctIndex: 0, thenReturnToExerciseId: 'freq_contrast_004' },
      { id: 'guided_frequency_004', prompt: tri('Never уже делает фразу отрицательной?', 'Never уже робить фразу заперечною?', 'Never ya hace la frase negativa?'), options: ['да', 'нет'], correctIndex: 0, thenReturnToExerciseId: 'freq_mixed_003' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'adverb',
    microDiagnosisId: 'adverb_frequency_position',
    diagnosisLabel: tri('Позиция always / usually / often / never', 'Позиція always / usually / often / never', 'Posición de always / usually / often / never'),
    contrastSet: ['before main verb', 'after be', 'between auxiliary and main verb', 'sometimes flexible'],
    focusWords: ['always', 'usually', 'often', 'never', 'sometimes'],
    focusPatterns: ['before_main_verb_always', 'before_main_verb_usually', 'before_main_verb_often', 'after_be_always', 'after_be_usually', 'after_be_never', 'between_auxiliary_main_never', 'after_modal_before_main', 'modal_usually_position', 'question_frequency_position', 'negative_frequency_position', 'never_no_double_negative', 'sometimes_front_position', 'mixed_be_vs_main_verb', 'mixed_aux_modal_question_negative'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_adverb_frequency_position_start',
    answer: 'diagnosis_training_adverb_frequency_position_answer',
    mastery: 'diagnosis_training_adverb_frequency_position_mastery',
    fallback: 'diagnosis_training_adverb_frequency_position_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'adverb', microDiagnosisId: 'adverb_frequency_position', contrastSet: ['before main verb', 'after be', 'between auxiliary and main verb', 'sometimes flexible'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logVerbType: true, logAdverbPosition: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=adverb&microDiagnosisId=adverb_frequency_position',
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


