import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = ['was', 'were', 'am/is/are', "wasn't", "weren't", 'was there', 'were there'];

function retry(line: string): [TriText, TriText, TriText, TriText] {
  return [
    tri(line),
    tri(
      'Раздели subject на две группы: I/he/she/it = was, you/we/they = were.',
      'Розділи subject на дві групи: I/he/she/it = was, you/we/they = were.',
    ),
    tri(
      'Готовые пары: I was / she was / it was / you were / we were / they were.',
      'Готові пари: I was / she was / it was / you were / we were / they were.',
    ),
    tri(
      'Подсказка: выбери was или were по subject.',
      'Підказка: обери was або were за subject.',
    ),
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Не эта форма. Для past be здесь нужно ${correct}.`,
    `Не ця форма. Для past be тут потрібно ${correct}.`,
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
  retryLine: string;
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
      'Was/were - это be в прошлом. I/he/she/it идут с was, а you/we/they идут с were.',
      'Was/were - це be у минулому. I/he/she/it йдуть з was, а you/we/they йдуть з were.',
    ),
    microTask: tri(
      'Найди subject и выбери was или were.',
      'Знайди subject і обери was або were.',
    ),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? defaultWrong(input.correctAnswer)])),
    retryFeedback: retry(input.retryLine),
    fallbackExplanation: tri(
      'Для прошлого состояния, места, погоды или описания нужен past be: I/he/she/it was, you/we/they were. В отрицании: was not/wasn’t, were not/weren’t. В вопросе was/were выходит вперед.',
      'Для минулого стану, місця, погоди або опису потрібен past be: I/he/she/it was, you/we/they were. У запереченні: was not/wasn’t, were not/weren’t. У питанні was/were виходить вперед.',
    ),
    focusWords: input.focusWords,
  };
}

export const VERB_WAS_WERE_TRAINING: DiagnosisTraining = {
  id: 'verb_was_were',
  category: 'verb',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 26,
  supportedLocales: ['ru', 'uk'],
  title: tri('Was / Were: был, была, были', 'Was / Were: був, була, були'),
  shortTitle: tri('Was / Were', 'Was / Were'),
  shortDiagnosis: tri(
    'Ты путаешь was/were или оставляешь am/is/are в прошлом.',
    'Ти плутаєш was/were або залишаєш am/is/are у минулому.',
  ),
  diagnosisText: tri(
    'Ты путаешь was и were или используешь is/are там, где речь уже о прошлом. Be в прошлом имеет две основные формы: was для I/he/she/it и were для you/we/they.',
    'Ти плутаєш was і were або використовуєш is/are там, де йдеться вже про минуле. Be у минулому має дві основні форми: was для I/he/she/it і were для you/we/they.',
  ),
  mentalModel: tri(
    'Was/were = прошлая форма be. I was, he was, she was, it was. You were, we were, they were.',
    'Was/were = минула форма be. I was, he was, she was, it was. You were, we were, they were.',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'I was tired. He was late. She was at home. It was cold. You were right. We were busy. They were outside.',
    'I was tired. He was late. She was at home. It was cold. You were right. We were busy. They were outside.',
  ),
  whatUserMustLearn: {
    ru: [
      'Was используется с I: I was tired.',
      'Was используется с he/she/it: He was late, She was at home, It was cold.',
      'Were используется с you: You were right.',
      'Were используется с we/they: We were busy, They were outside.',
      'Was/were нужны, когда речь о прошлом состоянии, месте, возрасте, погоде или описании.',
      'Yesterday, last night, last week, in 2020 часто подсказывают прошлое и форму was/were.',
      'Нельзя говорить I were, he were, they was в стандартной грамматике.',
      'В отрицании используем wasn’t и weren’t: I wasn’t ready, They weren’t home.',
      'В вопросе was/were выходит вперед: Was he late? Were they ready?',
      'Was/were не используется перед обычным past verb: I was worked неправильно. Для действия нужно I worked.',
    ],
    uk: [
      'Was використовується з I: I was tired.',
      'Was використовується з he/she/it: He was late, She was at home, It was cold.',
      'Were використовується з you: You were right.',
      'Were використовується з we/they: We were busy, They were outside.',
      'Was/were потрібні, коли йдеться про минулий стан, місце, вік, погоду або опис.',
      'Yesterday, last night, last week, in 2020 часто підказують минуле і форму was/were.',
      'Не можна говорити I were, he were, they was у стандартній граматиці.',
      'У запереченні використовуємо wasn’t і weren’t: I wasn’t ready, They weren’t home.',
      'У питанні was/were виходить вперед: Was he late? Were they ready?',
      'Was/were не використовується перед звичайним past verb: I was worked неправильно. Для дії потрібно I worked.',
    ],
    es: [
      'Was/were = past be.',
      'I/he/she/it use was.',
      'You/we/they use were.',
      'Yesterday and last night often need was/were.',
      'Use wasn’t and weren’t in negatives.',
      'Questions start with was/were.',
      'Do not say they was.',
      'Do not say I were.',
      'Do not use is/are for past markers.',
      'Do not use was/were before normal past verbs like worked.',
    ],
  },
  examples: [
    { en: 'I was tired yesterday.', ru: 'Я был уставшим вчера.', uk: 'Я був втомлений учора.', es: 'I was tired yesterday.', why: tri('I в прошлом с be дает was. Tired описывает состояние.', 'I у минулому з be дає was. Tired описує стан.') },
    { en: 'She was at home last night.', ru: 'Она была дома вчера вечером.', uk: 'Вона була вдома вчора ввечері.', es: 'She was at home last night.', why: tri('She требует was. At home описывает место в прошлом.', 'She потребує was. At home описує місце в минулому.') },
    { en: 'They were busy yesterday.', ru: 'Они были заняты вчера.', uk: 'Вони були зайняті вчора.', es: 'They were busy yesterday.', why: tri('They требует were. Busy описывает состояние в прошлом.', 'They потребує were. Busy описує стан у минулому.') },
    { en: 'We were in Dublin in 2020.', ru: 'Мы были в Дублине в 2020 году.', uk: 'Ми були в Дубліні у 2020 році.', es: 'We were in Dublin in 2020.', why: tri('We требует were. In 2020 показывает прошлое.', 'We потребує were. In 2020 показує минуле.') },
    { en: 'It was cold this morning.', ru: 'Сегодня утром было холодно.', uk: 'Сьогодні вранці було холодно.', es: 'It was cold this morning.', why: tri('Погода часто идет с it. В прошлом: it was cold.', 'Погода часто йде з it. У минулому: it was cold.') },
    { en: 'You were right.', ru: 'Ты был прав.', uk: 'Ти мав рацію.', es: 'You were right.', why: tri('You в прошлом с be дает were, не was.', 'You у минулому з be дає were, не was.') },
    { en: "He wasn't ready.", ru: 'Он не был готов.', uk: 'Він не був готовий.', es: "He wasn't ready.", why: tri('He требует was. В отрицании: wasn’t.', 'He потребує was. У запереченні: wasn’t.') },
    { en: 'Were they at work?', ru: 'Они были на работе?', uk: 'Вони були на роботі?', es: 'Were they at work?', why: tri('В вопросе were выходит вперед. They требует were.', 'У питанні were виходить вперед. They потребує were.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты говоришь о прошлом состоянии, но оставляешь am/is/are или выбираешь was/were наугад. В английском be в прошлом зависит от subject.', 'Схоже, ти говориш про минулий стан, але залишаєш am/is/are або обираєш was/were навмання. В англійській be у минулому залежить від subject.') },
    { id: 'intro_rule', type: 'rule', text: tri('Формула простая: I/he/she/it was. You/we/they were.', 'Формула проста: I/he/she/it was. You/we/they were.') },
    { id: 'intro_warning', type: 'warning', text: tri('Не говори I were, he were, they was. И не ставь was/were перед обычным past verb: I was worked неправильно.', 'Не говори I were, he were, they was. І не став was/were перед звичайним past verb: I was worked неправильно.') },
  ],
  steps: [
    step({ id: 'was_were_easy_001', order: 1, difficulty: 'easy', targetSkill: 'i_was', sentence: 'I ___ tired yesterday.', translation: tri('Я был уставшим вчера.', 'Я був втомлений учора.'), options: ['was', 'were', 'am', 'are'], correctAnswer: 'was', correctFeedback: tri('Да. I в прошлом с be дает was.', 'Так. I у минулому з be дає was.'), wrong: { were: tri('Were используется с you/we/they. С I в обычном Past Simple нужен was.', 'Were використовується з you/we/they. З I у звичайному Past Simple потрібен was.'), am: tri('Am - настоящее время. Yesterday требует прошлое: was.', 'Am - теперішній час. Yesterday потребує минуле: was.'), are: tri('Are не используется с I и не подходит к yesterday. Нужно was.', 'Are не використовується з I і не підходить до yesterday. Потрібно was.') }, retryLine: 'I + past be = was.', focusWords: ['I', 'was', 'yesterday'] }),
    step({ id: 'was_were_easy_002', order: 2, difficulty: 'easy', targetSkill: 'she_was', sentence: 'She ___ at home last night.', translation: tri('Она была дома вчера вечером.', 'Вона була вдома вчора ввечері.'), options: ['was', 'were', 'is', 'are'], correctAnswer: 'was', correctFeedback: tri('Да. She в прошлом с be дает was.', 'Так. She у минулому з be дає was.'), wrong: { were: tri('Were используется с you/we/they. She требует was.', 'Were використовується з you/we/they. She потребує was.'), is: tri('Is - настоящее время. Last night требует was.', 'Is - теперішній час. Last night потребує was.'), are: tri('Are не подходит к she и к last night. Нужно was.', 'Are не підходить до she і до last night. Потрібно was.') }, retryLine: 'She + past be = was.', focusWords: ['she', 'was', 'last night'] }),
    step({ id: 'was_were_easy_003', order: 3, difficulty: 'easy', targetSkill: 'it_was', sentence: 'It ___ cold this morning.', translation: tri('Сегодня утром было холодно.', 'Сьогодні вранці було холодно.'), options: ['was', 'were', 'is', 'are'], correctAnswer: 'was', correctFeedback: tri('Да. С погодой часто используется it. В прошлом: it was cold.', 'Так. З погодою часто використовується it. У минулому: it was cold.'), wrong: { were: tri('It требует was, не were.', 'It потребує was, не were.'), is: tri('Is значит сейчас. This morning здесь говорит о прошлом периоде, поэтому was.', 'Is означає зараз. This morning тут говорить про минулий період, тому was.'), are: tri('Are не используется с it. Нужно was.', 'Are не використовується з it. Потрібно was.') }, retryLine: 'It + past be = was.', focusWords: ['it', 'was', 'cold'] }),
    step({ id: 'was_were_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'they_were', sentence: 'They ___ busy yesterday.', translation: tri('Они были заняты вчера.', 'Вони були зайняті вчора.'), options: ['was', 'were', 'are', 'is'], correctAnswer: 'were', correctFeedback: tri('Да. They в прошлом с be дает were.', 'Так. They у минулому з be дає were.'), wrong: { was: tri('Was используется с I/he/she/it. They требует were.', 'Was використовується з I/he/she/it. They потребує were.'), are: tri('Are - настоящее время. Yesterday требует were.', 'Are - теперішній час. Yesterday потребує were.'), is: tri('Is не подходит к they и к yesterday. Нужно were.', 'Is не підходить до they і до yesterday. Потрібно were.') }, retryLine: 'They + past be = were.', focusWords: ['they', 'were', 'yesterday'] }),
    step({ id: 'was_were_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'we_were', sentence: 'We ___ in Dublin in 2020.', translation: tri('Мы были в Дублине в 2020 году.', 'Ми були в Дубліні у 2020 році.'), options: ['was', 'were', 'are', 'am'], correctAnswer: 'were', correctFeedback: tri('Да. We требует were в прошлом.', 'Так. We потребує were у минулому.'), wrong: { was: tri('Was не используется с we. Нужно were.', 'Was не використовується з we. Потрібно were.'), are: tri('Are - настоящее время. In 2020 требует were.', 'Are - теперішній час. In 2020 потребує were.'), am: tri('Am используется только с I и в настоящем. We in 2020 требует were.', 'Am використовується тільки з I і в теперішньому. We in 2020 потребує were.') }, retryLine: 'We + past be = were.', focusWords: ['we', 'were', 'in 2020'] }),
    step({ id: 'was_were_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'you_were', sentence: 'You ___ right.', translation: tri('Ты был прав.', 'Ти мав рацію.'), options: ['was', 'were', 'is', 'am'], correctAnswer: 'were', correctFeedback: tri('Да. You в прошлом с be дает were.', 'Так. You у минулому з be дає were.'), wrong: { was: tri('В стандартной грамматике you требует were, не was.', 'У стандартній граматиці you потребує were, не was.'), is: tri('Is не используется с you. Если прошлое, нужно were.', 'Is не використовується з you. Якщо минуле, потрібно were.'), am: tri('Am используется только с I. You требует were в прошлом.', 'Am використовується тільки з I. You потребує were у минулому.') }, retryLine: 'You + past be = were.', focusWords: ['you', 'were'] }),
    step({ id: 'was_were_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'past_marker_not_is', sentence: 'He ___ late yesterday.', translation: tri('Он опоздал вчера.', 'Він запізнився вчора.'), options: ['is', 'was', 'were', 'are'], correctAnswer: 'was', correctFeedback: tri('Да. Yesterday показывает прошлое. He требует was.', 'Так. Yesterday показує минуле. He потребує was.'), wrong: { is: tri('Is - настоящее время. С yesterday нужен was.', 'Is - теперішній час. З yesterday потрібен was.'), were: tri('He требует was, не were.', 'He потребує was, не were.'), are: tri('Are не подходит к he и к yesterday. Нужно was.', 'Are не підходить до he і до yesterday. Потрібно was.') }, retryLine: 'He + yesterday = was.', focusWords: ['he', 'was', 'yesterday'] }),
    step({ id: 'was_were_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'past_marker_not_are', sentence: 'The rooms ___ clean last week.', translation: tri('Комнаты были чистыми на прошлой неделе.', 'Кімнати були чистими минулого тижня.'), options: ['was', 'were', 'are', 'is'], correctAnswer: 'were', correctFeedback: tri('Да. The rooms - plural. Last week показывает прошлое. Нужно were.', 'Так. The rooms - plural. Last week показує минуле. Потрібно were.'), wrong: { was: tri('The rooms plural, поэтому were, не was.', 'The rooms plural, тому were, не was.'), are: tri('Are - настоящее время. Last week требует were.', 'Are - теперішній час. Last week потребує were.'), is: tri('Is не подходит к plural rooms и к last week. Нужно were.', 'Is не підходить до plural rooms і до last week. Потрібно were.') }, retryLine: 'Rooms plural + past = were.', focusWords: ['rooms', 'were', 'last week'] }),
    step({ id: 'was_were_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'singular_noun_was', sentence: 'The lesson ___ useful.', translation: tri('Урок был полезным.', 'Урок був корисним.'), options: ['was', 'were', 'are', 'be'], correctAnswer: 'was', correctFeedback: tri('Да. The lesson - singular subject. В прошлом нужен was.', 'Так. The lesson - singular subject. У минулому потрібен was.'), wrong: { were: tri('The lesson один, поэтому was, не were.', 'The lesson один, тому was, не were.'), are: tri('Are - настоящее время и plural. Здесь singular past: was.', 'Are - теперішній час і plural. Тут singular past: was.'), be: tri('Be - базовая форма. В утверждении прошлого времени нужна форма was.', 'Be - базова форма. У ствердженні минулого часу потрібна форма was.') }, retryLine: 'The lesson один = was.', focusWords: ['lesson', 'was'] }),
    step({ id: 'was_were_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'wasnt_singular', sentence: 'He ___ ready.', translation: tri('Он не был готов.', 'Він не був готовий.'), options: ["wasn't", "weren't", "isn't", "aren't"], correctAnswer: "wasn't", correctFeedback: tri("Да. He требует was. В отрицании: wasn't.", "Так. He потребує was. У запереченні: wasn't."), wrong: { "weren't": tri("Weren't используется с you/we/they. He требует wasn't.", "Weren't використовується з you/we/they. He потребує wasn't."), "isn't": tri("Isn't - настоящее. Здесь “не был”, поэтому wasn't.", "Isn't - теперішній час. Тут “не був”, тому wasn't."), "aren't": tri("Aren't не подходит к he и не выражает прошлое. Нужно wasn't.", "Aren't не підходить до he і не виражає минуле. Потрібно wasn't.") }, retryLine: "He was -> he wasn't.", focusWords: ['he', "wasn't"] }),
    step({ id: 'was_were_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'werent_plural', sentence: 'They ___ at home.', translation: tri('Они не были дома.', 'Вони не були вдома.'), options: ["wasn't", "weren't", "isn't", 'was'], correctAnswer: "weren't", correctFeedback: tri("Да. They требует were. В отрицании: weren't.", "Так. They потребує were. У запереченні: weren't."), wrong: { "wasn't": tri("Wasn't используется с I/he/she/it. They требует weren't.", "Wasn't використовується з I/he/she/it. They потребує weren't."), "isn't": tri("Isn't не подходит к they и не выражает прошлое. Нужно weren't.", "Isn't не підходить до they і не виражає минуле. Потрібно weren't."), was: tri("Was не подходит к they и не дает отрицание. Нужно weren't.", "Was не підходить до they і не дає заперечення. Потрібно weren't.") }, retryLine: "They were -> they weren't.", focusWords: ['they', "weren't"] }),
    step({ id: 'was_were_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'question_were_they', sentence: '___ they at work?', translation: tri('Они были на работе?', 'Вони були на роботі?'), options: ['Was', 'Were', 'Are', 'Did'], correctAnswer: 'Were', correctFeedback: tri('Да. They требует were. В вопросе were выходит вперед.', 'Так. They потребує were. У питанні were виходить вперед.'), wrong: { Was: tri('Was не используется с they. Нужно Were they...?', 'Was не використовується з they. Потрібно Were they...?'), Are: tri('Are they at work? - настоящее. Здесь “были”, поэтому Were they...?', 'Are they at work? - теперішній час. Тут “були”, тому Were they...?'), Did: tri('С be в прошлом вопрос строится через was/were, не через did.', 'З be у минулому питання будується через was/were, не через did.') }, retryLine: 'They were. Вопрос = Were they?', focusWords: ['were', 'they'] }),
    step({ id: 'was_were_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_was_were_pair', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.'), options: ['I was tired / They were busy', 'I were tired / They was busy', 'I am tired / They are busy yesterday', 'I was tired / They was busy'], correctAnswer: 'I was tired / They were busy', correctFeedback: tri('Да. I требует was. They требует were.', 'Так. I потребує was. They потребує were.'), wrong: { 'I were tired / They was busy': tri('Формы перепутаны. I was, they were.', 'Форми переплутані. I was, they were.'), 'I am tired / They are busy yesterday': tri('Am/are - настоящее. С прошлым нужен was/were.', 'Am/are - теперішній час. З минулим потрібен was/were.'), 'I was tired / They was busy': tri('Первая часть правильная, но they требует were, не was.', 'Перша частина правильна, але they потребує were, не was.') }, retryLine: 'I was. They were.', focusWords: ['was', 'were'] }),
    step({ id: 'was_were_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_negative_pair', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.'), options: ["He wasn't ready / We weren't ready", "He weren't ready / We wasn't ready", "He isn't ready / We aren't ready yesterday", "He wasn't ready / We wasn't ready"], correctAnswer: "He wasn't ready / We weren't ready", correctFeedback: tri("Да. He wasn't, но we weren't.", "Так. He wasn't, але we weren't."), wrong: { "He weren't ready / We wasn't ready": tri("Формы перепутаны. He wasn't, we weren't.", "Форми переплутані. He wasn't, we weren't."), "He isn't ready / We aren't ready yesterday": tri("Isn't/aren't - настоящее. Для прошлого нужны wasn't/weren't.", "Isn't/aren't - теперішній час. Для минулого потрібні wasn't/weren't."), "He wasn't ready / We wasn't ready": tri("He wasn't правильно. We требует weren't.", "He wasn't правильно. We потребує weren't.") }, retryLine: "He was not = wasn't. We were not = weren't.", focusWords: ["wasn't", "weren't"] }),
    step({ id: 'was_were_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.'), options: ['She was at home, but they were at work.', 'She were at home, but they was at work.', 'She is at home yesterday, but they are at work yesterday.', 'She was worked at home, but they were worked at work.'], correctAnswer: 'She was at home, but they were at work.', correctFeedback: tri('Да. She требует was, they требует were. At home / at work описывает место.', 'Так. She потребує was, they потребує were. At home / at work описує місце.'), wrong: { 'She were at home, but they was at work.': tri('Формы перепутаны. She was, they were.', 'Форми переплутані. She was, they were.'), 'She is at home yesterday, but they are at work yesterday.': tri('Is/are не подходят к yesterday. Нужно was/were.', 'Is/are не підходять до yesterday. Потрібно was/were.'), 'She was worked at home, but they were worked at work.': tri('Was/were worked неправильно в этом смысле. Для места нужно was/were at home/work. Для действия нужно worked без was/were.', 'Was/were worked неправильно в цьому сенсі. Для місця потрібно was/were at home/work. Для дії потрібно worked без was/were.') }, retryLine: 'She was. They were.', focusWords: ['she was', 'they were'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'was_were_subject_agreement_error',
      'present_be_with_past_marker_error',
      'was_with_plural_subject_error',
      'were_with_singular_subject_error',
      'negative_wasnt_werent_error',
      'question_order_error',
      'was_were_plus_past_verb_error',
      'there_was_were_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Показываем subject и нужную форму was/were.', 'Показуємо subject і потрібну форму was/were.'),
    depth2: tri('Делим subject на две группы: I/he/she/it или you/we/they.', 'Ділимо subject на дві групи: I/he/she/it або you/we/they.'),
    depth3: tri('Показываем готовые пары I was / They were.', 'Показуємо готові пари I was / They were.'),
    depth4: tri('Почти подсказка: прямо указываем was или were.', 'Майже підказка: прямо вказуємо was або were.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        'Остановись. Это be в прошлом. I/he/she/it = was. You/we/they = were. В отрицании: wasn’t/weren’t. В вопросе was/were выходит вперед.',
        'Зупинись. Це be у минулому. I/he/she/it = was. You/we/they = were. У запереченні: wasn’t/weren’t. У питанні was/were виходить вперед.',
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_subject_group_hint_then_retry',
      card: tri(
        'Подсказка по subject: система покажет, subject относится к группе was или were, но не выберет ответ за пользователя.',
        'Підказка за subject: система покаже, subject належить до групи was чи were, але не вибере відповідь за користувача.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        'Режим подсказки: сначала выбери subject group. Потом система спросит, фраза утверждение, отрицание или вопрос.',
        'Режим підказки: спочатку обери subject group. Потім система спитає, фраза ствердження, заперечення чи питання.',
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_was_were_001', prompt: tri('I в прошлом с be дает was или were?', 'I у минулому з be дає was чи were?'), options: ['was', 'were'], correctIndex: 0, thenReturnToExerciseId: 'was_were_easy_001' },
      { id: 'guided_was_were_002', prompt: tri('They в прошлом с be дает was или were?', 'They у минулому з be дає was чи were?'), options: ['was', 'were'], correctIndex: 1, thenReturnToExerciseId: 'was_were_contrast_001' },
      { id: 'guided_was_were_003', prompt: tri('You в прошлом с be дает was или were?', 'You у минулому з be дає was чи were?'), options: ['was', 'were'], correctIndex: 1, thenReturnToExerciseId: 'was_were_contrast_003' },
      { id: 'guided_was_were_004', prompt: tri('В вопросе Were they at work? were стоит перед subject или после subject?', 'У питанні Were they at work? were стоїть перед subject чи після subject?'), options: ['перед subject', 'после subject'], correctIndex: 0, thenReturnToExerciseId: 'was_were_mixed_003' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'verb_was_were',
    diagnosisLabel: tri('Was / Were', 'Was / Were'),
    contrastSet: CONTRAST,
    focusWords: ['was', 'were', "wasn't", "weren't", 'yesterday', 'last night'],
    focusPatterns: [
      'i_was',
      'she_was',
      'it_was',
      'they_were',
      'we_were',
      'you_were',
      'past_marker_not_is',
      'past_marker_not_are',
      'singular_noun_was',
      'wasnt_singular',
      'werent_plural',
      'question_were_they',
      'mixed_was_were_pair',
      'mixed_negative_pair',
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
    start: 'diagnosis_training_verb_was_were_start',
    answer: 'diagnosis_training_verb_was_were_answer',
    mastery: 'diagnosis_training_verb_was_were_mastery',
    fallback: 'diagnosis_training_verb_was_were_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: {
      category: 'verb',
      microDiagnosisId: 'verb_was_were',
      contrastSet: ['was', 'were', 'am/is/are', "wasn't", "weren't", 'question order'],
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logSubjectGroup: true,
      logBePastForm: true,
      logSentencePolarity: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=verb_was_were',
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


