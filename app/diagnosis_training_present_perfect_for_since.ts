import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = ['for + duration', 'since + starting point', 'have been', 'has lived', 'how long', 'started in past and continues now', 'present perfect', 'past simple'];
const SMART_CONTRAST = ['for + duration', 'since + starting point', 'have been', 'has lived', 'how long', 'started in past and continues now'];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'Сначала реши: после пропуска длительность или точка старта. Duration = for. Starting point = since.',
      'Спочатку виріши: після пропуску тривалість чи точка старту. Duration = for. Starting point = since.',
      'First decide: duration or starting point. Duration = for. Starting point = since.',
    ),
    depth2,
    depth3,
    depth4,
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Проверь: это длительность или точка старта. Нужная форма: ${correct}.`,
    `Перевір: це тривалість чи точка старту. Потрібна форма: ${correct}.`,
    `Check duration vs starting point. Correct form: ${correct}.`,
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
      'For отвечает “как долго?”: for three years. Since отвечает “с какого момента?”: since 2021. Если ситуация продолжается сейчас, часто нужен Present Perfect.',
      'For відповідає “як довго?”: for three years. Since відповідає “з якого моменту?”: since 2021. Якщо ситуація триває зараз, часто потрібен Present Perfect.',
      'For answers how long; since answers since when. Continuing situations often use Present Perfect.',
    ),
    microTask: tri(
      'Выбери for/since или правильную Present Perfect форму для продолжающейся ситуации.',
      'Обери for/since або правильну Present Perfect форму для ситуації, що триває.',
      'Choose for/since or the correct Present Perfect form.',
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
      'For + длительность: for three years, for a long time. Since + старт: since 2020, since Monday, since I arrived.',
      'For + тривалість: for three years, for a long time. Since + старт: since 2020, since Monday, since I arrived.',
      'For + duration. Since + starting point.',
    ),
    focusWords: input.focusWords,
  };
}

export const PRESENT_PERFECT_FOR_SINCE_TRAINING: DiagnosisTraining = {
  id: 'present_perfect_for_since',
  category: 'verb',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 41,
  supportedLocales: ['ru', 'uk'],
  title: tri('For / Since: как давно это длится', 'For / Since: як давно це триває'),
  shortTitle: tri('For / Since', 'For / Since'),
  shortDiagnosis: tri(
    'Ты путаешь for и since в Present Perfect: длительность против точки старта.',
    'Ти плутаєш for і since у Present Perfect: тривалість проти точки старту.',
  ),
  diagnosisText: tri(
    'Ты путаешь for и since в Present Perfect. Главная проблема в том, что оба могут переводиться как “уже / в течение / с”, но английский различает длительность и точку старта. For отвечает “как долго?”, since отвечает “с какого момента?”.',
    'Ти плутаєш for і since у Present Perfect. Головна проблема в тому, що обидва можуть перекладатися як “уже / протягом / з”, але англійська розрізняє тривалість і точку старту. For відповідає “як довго?”, since відповідає “з якого моменту?”.',
  ),
  mentalModel: tri(
    'For = период длительности: for two years, for three days, for a long time. Since = точка старта: since 2020, since Monday, since I moved here. Present Perfect с for/since показывает, что ситуация началась в прошлом и продолжается сейчас.',
    'For = період тривалості: for two years, for three days, for a long time. Since = точка старту: since 2020, since Monday, since I moved here. Present Perfect з for/since показує, що ситуація почалася в минулому і триває зараз.',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'For + период: for two years, for a week, for a long time. Since + точка старта: since 2020, since Monday, since yesterday, since I arrived. How long have you lived here? I have lived here for three years / since 2021.',
    'For + період: for two years, for a week, for a long time. Since + точка старту: since 2020, since Monday, since yesterday, since I arrived. How long have you lived here? I have lived here for three years / since 2021.',
  ),
  whatUserMustLearn: {
    ru: [
      'For используется с длительностью: for two years, for five minutes, for a long time.',
      'Since используется с точкой старта: since 2020, since Monday, since yesterday.',
      'For отвечает на вопрос how long: How long? For three years.',
      'Since отвечает на вопрос since when: Since when? Since 2021.',
      'Present Perfect с for/since часто показывает ситуацию, которая началась в прошлом и продолжается сейчас.',
      'С he/she/it используется has.',
      'С I/you/we/they используется have.',
      'Нельзя говорить since three years. Нужно for three years.',
      'Нельзя говорить for 2020. Нужно since 2020.',
      "Если ситуация закончилась в прошлом, часто нужен Past Simple: I lived there for three years, but I don't live there now.",
    ],
    uk: [
      'For використовується з тривалістю: for two years, for five minutes, for a long time.',
      'Since використовується з точкою старту: since 2020, since Monday, since yesterday.',
      'For відповідає на питання how long: How long? For three years.',
      'Since відповідає на питання since when: Since when? Since 2021.',
      'Present Perfect з for/since часто показує ситуацію, яка почалася в минулому і триває зараз.',
      'З he/she/it використовується has.',
      'З I/you/we/they використовується have.',
      'Не можна говорити since three years. Потрібно for three years.',
      'Не можна говорити for 2020. Потрібно since 2020.',
      "Якщо ситуація завершилася в минулому, часто потрібен Past Simple: I lived there for three years, but I don't live there now.",
    ],
    es: [
      'For is used with duration.',
      'Since is used with a starting point.',
      'For answers how long.',
      'Since answers since when.',
      'Present Perfect with for/since often shows a continuing situation.',
      'He/she/it uses has.',
      'I/you/we/they use have.',
      'Use for three years, not since three years.',
      'Use since 2020, not for 2020.',
      'If the situation ended in the past, Past Simple is often used.',
    ],
  },
  examples: [
    { en: 'I have lived here for three years.', ru: 'Я живу здесь уже три года.', uk: 'Я живу тут уже три роки.', es: 'I have lived here for three years.', why: tri('Three years - длительность. Поэтому for three years.', 'Three years - тривалість. Тому for three years.') },
    { en: 'I have lived here since 2021.', ru: 'Я живу здесь с 2021 года.', uk: 'Я живу тут з 2021 року.', es: 'I have lived here since 2021.', why: tri('2021 - точка старта. Поэтому since 2021.', '2021 - точка старту. Тому since 2021.') },
    { en: 'She has worked here for six months.', ru: 'Она работает здесь уже шесть месяцев.', uk: 'Вона працює тут уже шість місяців.', es: 'She has worked here for six months.', why: tri('Six months - период длительности. Поэтому for.', 'Six months - період тривалості. Тому for.') },
    { en: 'She has worked here since Monday.', ru: 'Она работает здесь с понедельника.', uk: 'Вона працює тут з понеділка.', es: 'She has worked here since Monday.', why: tri('Monday - точка старта. Поэтому since.', 'Monday - точка старту. Тому since.') },
    { en: 'We have known each other for a long time.', ru: 'Мы давно знаем друг друга.', uk: 'Ми давно знаємо одне одного.', es: 'We have known each other for a long time.', why: tri('A long time - длительность. Поэтому for a long time.', 'A long time - тривалість. Тому for a long time.') },
    { en: "I haven't seen him since last week.", ru: 'Я не видел его с прошлой недели.', uk: 'Я не бачив його з минулого тижня.', es: "I haven't seen him since last week.", why: tri('Last week - точка отсчета. Поэтому since last week.', 'Last week - точка відліку. Тому since last week.') },
    { en: 'How long have you lived here?', ru: 'Как давно ты здесь живёшь?', uk: 'Як давно ти тут живеш?', es: 'How long have you lived here?', why: tri('How long спрашивает о длительности ситуации, которая продолжается сейчас.', 'How long питає про тривалість ситуації, яка триває зараз.') },
    { en: 'I lived there for three years.', ru: 'Я жил там три года.', uk: 'Я жив там три роки.', es: 'I lived there for three years.', why: tri('Past Simple показывает, что период закончился в прошлом или не связан с настоящим.', 'Past Simple показує, що період завершився в минулому або не пов’язаний із теперішнім.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты видишь “уже три года” или “с 2020” и выбираешь for/since наугад. В английском это не угадайка: for - длительность, since - стартовая точка.', 'Схоже, ти бачиш “уже три роки” або “з 2020” і обираєш for/since навмання. В англійській це не вгадування: for - тривалість, since - стартова точка.') },
    { id: 'intro_rule', type: 'rule', text: tri('For отвечает “как долго?”: for three years. Since отвечает “с какого момента?”: since 2021.', 'For відповідає “як довго?”: for three years. Since відповідає “з якого моменту?”: since 2021.') },
    { id: 'intro_warning', type: 'warning', text: tri('Главные ошибки: since three years, for 2020. Правильно: for three years, since 2020.', 'Головні помилки: since three years, for 2020. Правильно: for three years, since 2020.') },
  ],
  steps: [
    step({ id: 'pp_for_since_easy_001', order: 1, difficulty: 'easy', targetSkill: 'for_duration_years', sentence: 'I have lived here ___ three years.', translation: tri('Я живу здесь уже три года.', 'Я живу тут уже три роки.'), options: ['for', 'since', 'from', 'during'], correctAnswer: 'for', correctFeedback: tri('Да. Three years - длительность. Нужен for.', 'Так. Three years - тривалість. Потрібен for.'), wrong: { since: tri('Since нужен с точкой старта, а three years - длительность. Нужно for three years.', 'Since потрібен з точкою старту, а three years - тривалість. Потрібно for three years.'), from: tri('From показывает стартовую точку, но здесь период длительности. Нужно for.', 'From показує стартову точку, але тут період тривалості. Потрібно for.'), during: tri('During показывает внутри какого события/периода, но не длительность “сколько времени”. Нужно for.', 'During показує всередині якої події/періоду, але не тривалість “скільки часу”. Потрібно for.') }, retryFeedback: [tri('Three years = период. Период = for.', 'Three years = період. Період = for.'), tri('For three years.'), tri('Подсказка: I have lived here for three years.', 'Підказка: I have lived here for three years.')], focusWords: ['for three years'] }),
    step({ id: 'pp_for_since_easy_002', order: 2, difficulty: 'easy', targetSkill: 'for_duration_minutes', sentence: 'We have waited ___ twenty minutes.', translation: tri('Мы ждём уже двадцать минут.', 'Ми чекаємо вже двадцять хвилин.'), options: ['for', 'since', 'from', 'during'], correctAnswer: 'for', correctFeedback: tri('Да. Twenty minutes - длительность. Нужен for.', 'Так. Twenty minutes - тривалість. Потрібен for.'), wrong: { since: tri('Since не ставится с длительностью twenty minutes. Нужно for twenty minutes.', 'Since не ставиться з тривалістю twenty minutes. Потрібно for twenty minutes.'), from: tri("From нужен с точкой начала, например from 9 o'clock. Здесь длительность: for twenty minutes.", "From потрібен з точкою початку, наприклад from 9 o'clock. Тут тривалість: for twenty minutes."), during: tri('During twenty minutes звучит неправильно в этом смысле. Для длительности ожидания нужен for.', 'During twenty minutes звучить неправильно в цьому сенсі. Для тривалості очікування потрібен for.') }, retryFeedback: [tri('Twenty minutes = how long = for.'), tri('For twenty minutes.'), tri('Подсказка: We have waited for twenty minutes.', 'Підказка: We have waited for twenty minutes.')], focusWords: ['for twenty minutes'] }),
    step({ id: 'pp_for_since_easy_003', order: 3, difficulty: 'easy', targetSkill: 'for_a_long_time', sentence: 'I have known him ___ a long time.', translation: tri('Я давно его знаю.', 'Я давно його знаю.'), options: ['for', 'since', 'from', 'during'], correctAnswer: 'for', correctFeedback: tri('Да. A long time - длительность. Нужен for.', 'Так. A long time - тривалість. Потрібен for.'), wrong: { since: tri('Since нужен с точкой начала. A long time - длительность, поэтому for.', 'Since потрібен з точкою початку. A long time - тривалість, тому for.'), from: tri('From не подходит к a long time в этой структуре. Нужно for a long time.', 'From не підходить до a long time у цій структурі. Потрібно for a long time.'), during: tri('During a long time не подходит для “давно знаю”. Нужно for a long time.', 'During a long time не підходить для “давно знаю”. Потрібно for a long time.') }, retryFeedback: [tri('A long time = длительность = for.', 'A long time = тривалість = for.'), tri('For a long time.'), tri('Подсказка: I have known him for a long time.', 'Підказка: I have known him for a long time.')], focusWords: ['for a long time'] }),
    step({ id: 'pp_for_since_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'since_starting_year', sentence: 'I have lived here ___ 2021.', translation: tri('Я живу здесь с 2021 года.', 'Я живу тут з 2021 року.'), options: ['since', 'for', 'during', 'by'], correctAnswer: 'since', correctFeedback: tri('Да. 2021 - точка старта. Нужен since.', 'Так. 2021 - точка старту. Потрібен since.'), wrong: { for: tri('For нужен с длительностью, например for three years. 2021 - точка старта, поэтому since.', 'For потрібен з тривалістю, наприклад for three years. 2021 - точка старту, тому since.'), during: tri('During 2021 значит в течение 2021 года, не с 2021 до сейчас. Нужно since 2021.', 'During 2021 означає протягом 2021 року, не з 2021 до зараз. Потрібно since 2021.'), by: tri('By 2021 значит к 2021 году. Здесь “с 2021” = since 2021.', 'By 2021 означає до 2021 року. Тут “з 2021” = since 2021.') }, retryFeedback: [tri('2021 = старт. Старт = since.', '2021 = старт. Старт = since.'), tri('Since 2021.'), tri('Подсказка: I have lived here since 2021.', 'Підказка: I have lived here since 2021.')], focusWords: ['since 2021'] }),
    step({ id: 'pp_for_since_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'since_monday', sentence: 'She has worked here ___ Monday.', translation: tri('Она работает здесь с понедельника.', 'Вона працює тут з понеділка.'), options: ['since', 'for', 'during', 'by'], correctAnswer: 'since', correctFeedback: tri('Да. Monday - точка старта. Нужен since.', 'Так. Monday - точка старту. Потрібен since.'), wrong: { for: tri('For нужен с длительностью: for three days. Monday - стартовая точка, поэтому since Monday.', 'For потрібен з тривалістю: for three days. Monday - стартова точка, тому since Monday.'), during: tri('During Monday не значит “с понедельника до сейчас”. Нужно since Monday.', 'During Monday не означає “з понеділка до зараз”. Потрібно since Monday.'), by: tri('By Monday значит к понедельнику. Здесь “с понедельника” = since Monday.', 'By Monday означає до понеділка. Тут “з понеділка” = since Monday.') }, retryFeedback: [tri('Monday = старт = since.', 'Monday = старт = since.'), tri('Since Monday.'), tri('Подсказка: She has worked here since Monday.', 'Підказка: She has worked here since Monday.')], focusWords: ['since Monday'] }),
    step({ id: 'pp_for_since_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'since_clause', sentence: 'I have known her ___ we were children.', translation: tri('Я знаю её с тех пор, как мы были детьми.', 'Я знаю її з тих пір, як ми були дітьми.'), options: ['since', 'for', 'during', 'by'], correctAnswer: 'since', correctFeedback: tri('Да. Since может вводить стартовую ситуацию: since we were children.', 'Так. Since може вводити стартову ситуацію: since we were children.'), wrong: { for: tri('For не вводит такую стартовую clause. Нужно since we were children.', 'For не вводить таку стартову clause. Потрібно since we were children.'), during: tri('During we were children неправильно. Здесь нужна форма since we were children.', 'During we were children неправильно. Тут потрібна форма since we were children.'), by: tri('By не подходит для “с тех пор как”. Нужно since.', 'By не підходить для “з тих пір як”. Потрібно since.') }, retryFeedback: [tri('С тех пор как = since.', 'З тих пір як = since.'), tri('Since we were children.'), tri('Подсказка: I have known her since we were children.', 'Підказка: I have known her since we were children.')], focusWords: ['since clause'] }),
    step({ id: 'pp_for_since_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'have_lived_for', sentence: 'I ___ lived here for three years.', translation: tri('Я живу здесь уже три года.', 'Я живу тут уже три роки.'), options: ['have', 'has', 'did', 'am'], correctAnswer: 'have', correctFeedback: tri('Да. С I в Present Perfect используется have.', 'Так. З I у Present Perfect використовується have.'), wrong: { has: tri('Has используется с he/she/it. С I нужен have.', 'Has використовується з he/she/it. З I потрібен have.'), did: tri('Did lived неправильно. Ситуация продолжается сейчас, поэтому have lived.', 'Did lived неправильно. Ситуація триває зараз, тому have lived.'), am: tri('Am lived неправильно. Нужна форма have lived.', 'Am lived неправильно. Потрібна форма have lived.') }, retryFeedback: [tri('I + have lived.'), tri('I have lived here.'), tri('Подсказка: I have lived here for three years.', 'Підказка: I have lived here for three years.')], focusWords: ['have lived'] }),
    step({ id: 'pp_for_since_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'has_worked_since', sentence: 'She ___ worked here since 2020.', translation: tri('Она работает здесь с 2020 года.', 'Вона працює тут з 2020 року.'), options: ['has', 'have', 'did', 'is'], correctAnswer: 'has', correctFeedback: tri('Да. She требует has: She has worked here since 2020.', 'Так. She потребує has: She has worked here since 2020.'), wrong: { have: tri('Have используется с I/you/we/they. She требует has.', 'Have використовується з I/you/we/they. She потребує has.'), did: tri('Did worked неправильно. С since 2020 и продолжающейся ситуацией нужно has worked.', 'Did worked неправильно. З since 2020 і ситуацією, що триває, потрібно has worked.'), is: tri('Is worked не подходит для этой структуры. Нужно has worked.', 'Is worked не підходить для цієї структури. Потрібно has worked.') }, retryFeedback: [tri('She + has worked.'), tri('She has worked here.'), tri('Подсказка: She has worked here since 2020.', 'Підказка: She has worked here since 2020.')], focusWords: ['has worked'] }),
    step({ id: 'pp_for_since_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'haven_t_seen_since', sentence: "I haven't ___ him since last week.", translation: tri('Я не видел его с прошлой недели.', 'Я не бачив його з минулого тижня.'), options: ['seen', 'saw', 'see', 'seeing'], correctAnswer: 'seen', correctFeedback: tri("Да. После haven't нужен V3: seen.", "Так. Після haven't потрібен V3: seen."), wrong: { saw: tri("Saw - Past Simple. После haven't нужен seen.", "Saw - Past Simple. Після haven't потрібен seen."), see: tri("See - base form. После haven't нужен V3 seen.", "See - base form. Після haven't потрібен V3 seen."), seeing: tri("Seeing не подходит после haven't. Нужно haven't seen.", "Seeing не підходить після haven't. Потрібно haven't seen.") }, retryFeedback: [tri("Haven't + seen."), tri("I haven't seen him."), tri("Подсказка: I haven't seen him since last week.", "Підказка: I haven't seen him since last week.")], focusWords: ["haven't seen", 'since last week'] }),
    step({ id: 'pp_for_since_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'how_long_have_you_lived', sentence: 'How long ___ you lived here?', translation: tri('Как давно ты здесь живёшь?', 'Як давно ти тут живеш?'), options: ['have', 'has', 'did', 'do'], correctAnswer: 'have', correctFeedback: tri('Да. How long + have you + V3 для ситуации, которая продолжается сейчас.', 'Так. How long + have you + V3 для ситуації, яка триває зараз.'), wrong: { has: tri('Has не используется с you. Нужно have.', 'Has не використовується з you. Потрібно have.'), did: tri('Did you live? спрашивает о прошлом периоде. Здесь “живёшь сейчас”, поэтому have you lived.', 'Did you live? питає про минулий період. Тут “живеш зараз”, тому have you lived.'), do: tri('Do you lived неправильно. Нужно have you lived.', 'Do you lived неправильно. Потрібно have you lived.') }, retryFeedback: [tri('How long + have you lived?'), tri('How long have you lived here?'), tri('Подсказка: How long have you lived here?', 'Підказка: How long have you lived here?')], focusWords: ['how long', 'have lived'] }),
    step({ id: 'pp_for_since_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'how_long_has_she_worked', sentence: 'How long ___ she worked here?', translation: tri('Как давно она здесь работает?', 'Як давно вона тут працює?'), options: ['has', 'have', 'did', 'does'], correctAnswer: 'has', correctFeedback: tri('Да. She требует has: How long has she worked here?', 'Так. She потребує has: How long has she worked here?'), wrong: { have: tri('Have не используется с she. Нужно has.', 'Have не використовується з she. Потрібно has.'), did: tri('Did she work? больше про законченный прошлый период. Здесь она работает сейчас, поэтому has worked.', 'Did she work? більше про завершений минулий період. Тут вона працює зараз, тому has worked.'), does: tri('Does she worked неправильно. Нужна форма has she worked.', 'Does she worked неправильно. Потрібна форма has she worked.') }, retryFeedback: [tri('How long + has she worked?'), tri('How long has she worked here?'), tri('Подсказка: How long has she worked here?', 'Підказка: How long has she worked here?')], focusWords: ['how long', 'has worked'] }),
    step({ id: 'pp_for_since_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'answer_how_long_for', sentence: 'How long have you known him? ___ five years.', translation: tri('Как давно ты его знаешь? Пять лет.', "Як давно ти його знаєш? П'ять років."), options: ['For', 'Since', 'From', 'During'], correctAnswer: 'For', correctFeedback: tri('Да. Five years - длительность. Ответ: For five years.', 'Так. Five years - тривалість. Відповідь: For five years.'), wrong: { Since: tri('Since нужен с точкой старта. Five years - длительность, поэтому for.', 'Since потрібен з точкою старту. Five years - тривалість, тому for.'), From: tri('From не отвечает на how long с длительностью. Нужно for.', 'From не відповідає на how long з тривалістю. Потрібно for.'), During: tri('During не используется для такого ответа на how long. Нужно for.', 'During не використовується для такої відповіді на how long. Потрібно for.') }, retryFeedback: [tri('How long? For five years.'), tri('For five years.'), tri('Подсказка: For five years.', 'Підказка: For five years.')], focusWords: ['how long', 'for five years'] }),
    step({ id: 'pp_for_since_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'for_since_pair', sentence: 'Choose the correct pair.', translation: tri('три года / с 2021 года', 'три роки / з 2021 року'), options: ['for three years / since 2021', 'since three years / for 2021', 'during three years / from 2021', 'for 2021 / since three years'], correctAnswer: 'for three years / since 2021', correctFeedback: tri('Да. Three years - длительность = for. 2021 - точка старта = since.', 'Так. Three years - тривалість = for. 2021 - точка старту = since.'), wrong: { 'since three years / for 2021': tri('Пары перепутаны. Длительность идет с for, точка старта с since.', 'Пари переплутані. Тривалість іде з for, точка старту з since.'), 'during three years / from 2021': tri('During/from не являются базовой парой для этого смысла. Нужно for/since.', 'During/from не є базовою парою для цього сенсу. Потрібно for/since.'), 'for 2021 / since three years': tri('For 2021 и since three years неправильны в этом смысле. Нужно for three years / since 2021.', 'For 2021 і since three years неправильні в цьому сенсі. Потрібно for three years / since 2021.') }, retryFeedback: [tri('Duration = for. Start = since.'), tri('For three years / since 2021.'), tri('Подсказка: for three years / since 2021.', 'Підказка: for three years / since 2021.')], focusWords: ['for', 'since'] }),
    step({ id: 'pp_for_since_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'continuing_vs_finished_period', sentence: 'Choose the best sentence.', translation: tri('Я живу здесь три года и всё ещё живу здесь.', 'Я живу тут три роки і все ще живу тут.'), options: ['I have lived here for three years.', 'I lived here for three years.', 'I live here since three years.', 'I have lived here since three years.'], correctAnswer: 'I have lived here for three years.', correctFeedback: tri('Да. Ситуация продолжается сейчас, и three years - длительность. Поэтому have lived + for.', 'Так. Ситуація триває зараз, і three years - тривалість. Тому have lived + for.'), wrong: { 'I lived here for three years.': tri('Lived here for three years часто звучит как завершенный прошлый период. Здесь ты всё ещё живешь здесь, поэтому have lived.', 'Lived here for three years часто звучить як завершений минулий період. Тут ти все ще живеш тут, тому have lived.'), 'I live here since three years.': tri('Since three years неправильно, и для продолжающейся ситуации нужен Present Perfect. Правильно: have lived for three years.', 'Since three years неправильно, і для ситуації, що триває, потрібен Present Perfect. Правильно: have lived for three years.'), 'I have lived here since three years.': tri('Since three years неправильно. Three years - длительность, нужен for.', 'Since three years неправильно. Three years - тривалість, потрібен for.') }, retryFeedback: [tri('Still now + duration = have lived for.'), tri('I have lived here for three years.'), tri('Подсказка: I have lived here for three years.', 'Підказка: I have lived here for three years.')], focusWords: ['still now', 'have lived for'] }),
    step({ id: 'pp_for_since_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Она работает здесь с 2020 года, а я знаю её уже пять лет.', "Вона працює тут з 2020 року, а я знаю її вже п'ять років."), options: ['She has worked here since 2020, and I have known her for five years.', 'She has worked here for 2020, and I have known her since five years.', 'She worked here since 2020, and I know her for five years.', 'She has work here since 2020, and I have knew her for five years.'], correctAnswer: 'She has worked here since 2020, and I have known her for five years.', correctFeedback: tri('Да. Since 2020 = точка старта. For five years = длительность. Обе ситуации продолжаются сейчас.', 'Так. Since 2020 = точка старту. For five years = тривалість. Обидві ситуації тривають зараз.'), wrong: { 'She has worked here for 2020, and I have known her since five years.': tri('For/since перепутаны. 2020 требует since, five years требует for.', 'For/since переплутані. 2020 потребує since, five years потребує for.'), 'She worked here since 2020, and I know her for five years.': tri('Если она всё ещё работает, и ты всё ещё её знаешь, нужен Present Perfect: has worked / have known.', 'Якщо вона все ще працює, і ти все ще її знаєш, потрібен Present Perfect: has worked / have known.'), 'She has work here since 2020, and I have knew her for five years.': tri('После has/have нужен V3: has worked, have known. Не has work и не have knew.', 'Після has/have потрібен V3: has worked, have known. Не has work і не have knew.') }, retryFeedback: [tri('Since 2020 / for five years.'), tri('Has worked since 2020 / have known for five years.'), tri('Подсказка: She has worked here since 2020, and I have known her for five years.', 'Підказка: She has worked here since 2020, and I have known her for five years.')], focusWords: ['since 2020', 'for five years'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'since_duration_error',
      'for_starting_point_error',
      'present_perfect_missing_have_has_error',
      'have_has_agreement_error',
      'past_simple_instead_of_continuing_situation_error',
      'present_simple_instead_of_present_perfect_error',
      'how_long_structure_error',
      'since_clause_error',
      'finished_period_confusion_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем, это длительность или точка старта.', 'Звичайне пояснення: показуємо, це тривалість чи точка старту.'),
    depth2: tri('Проще: спрашиваем how long или since when.', 'Простіше: питаємо how long чи since when.'),
    depth3: tri('Еще проще: показываем готовые пары for three years / since 2021.', 'Ще простіше: показуємо готові пари for three years / since 2021.'),
    depth4: tri('Почти подсказка: прямо указываем for или since.', 'Майже підказка: прямо вказуємо for або since.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        'Остановись. For = сколько времени: for three years, for a week. Since = с какого момента: since 2020, since Monday. Если ситуация продолжается сейчас, часто нужен Present Perfect: have/has + V3.',
        'Зупинись. For = скільки часу: for three years, for a week. Since = з якого моменту: since 2020, since Monday. Якщо ситуація триває зараз, часто потрібен Present Perfect: have/has + V3.',
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_duration_start_hint_then_retry',
      card: tri('Подсказка: система покажет, выражение после пропуска является длительностью или точкой старта, но не выберет for/since за пользователя.', 'Підказка: система покаже, вираз після пропуску є тривалістю чи точкою старту, але не вибере for/since за користувача.'),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri('Режим подсказки: сначала выбери, это duration или starting point. Потом выбери, продолжается ли ситуация сейчас. После этого система вернет тебя к фразе.', 'Режим підказки: спочатку обери, це duration чи starting point. Потім обери, чи триває ситуація зараз. Після цього система поверне тебе до фрази.'),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_pp_for_since_001', prompt: tri('Three years - это длительность или точка старта?', 'Three years - це тривалість чи точка старту?'), options: ['длительность', 'точка старта'], correctIndex: 0, thenReturnToExerciseId: 'pp_for_since_easy_001' },
      { id: 'guided_pp_for_since_002', prompt: tri('2021 - это длительность или точка старта?', '2021 - це тривалість чи точка старту?'), options: ['длительность', 'точка старта'], correctIndex: 1, thenReturnToExerciseId: 'pp_for_since_contrast_001' },
      { id: 'guided_pp_for_since_003', prompt: tri('How long спрашивает о длительности или точке старта?', 'How long питає про тривалість чи точку старту?'), options: ['длительности', 'точке старта'], correctIndex: 0, thenReturnToExerciseId: 'pp_for_since_mixed_001' },
      { id: 'guided_pp_for_since_004', prompt: tri('Если человек всё ещё живет здесь, лучше I lived here или I have lived here?', 'Якщо людина все ще живе тут, краще I lived here чи I have lived here?'), options: ['I lived here', 'I have lived here'], correctIndex: 1, thenReturnToExerciseId: 'pp_for_since_mixed_005' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'present_perfect_for_since',
    diagnosisLabel: tri('Present Perfect: For / Since', 'Present Perfect: For / Since'),
    contrastSet: SMART_CONTRAST,
    difficultyLevel: 2,
    focusWords: ['for three years', 'since 2021', 'since Monday', 'how long', 'have lived', 'has worked'],
    focusPatterns: [
      'for_duration_years',
      'for_duration_minutes',
      'for_a_long_time',
      'since_starting_year',
      'since_monday',
      'since_clause',
      'have_lived_for',
      'has_worked_since',
      'haven_t_seen_since',
      'how_long_have_you_lived',
      'how_long_has_she_worked',
      'answer_how_long_for',
      'for_since_pair',
      'continuing_vs_finished_period',
      'mixed_sentence_correction',
    ],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
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
      category: 'verb',
      microDiagnosisId: 'present_perfect_for_since',
      contrastSet: ['for + duration', 'since + starting point', 'how long', 'continuing situation'],
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logTimeExpressionType: true,
      logPreposition: true,
      logTense: true,
      logContinuingSituation: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=present_perfect_for_since',
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


