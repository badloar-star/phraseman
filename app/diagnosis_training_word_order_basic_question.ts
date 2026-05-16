import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = [
  'do questions',
  'does questions',
  'did questions',
  'be questions',
  'modal questions',
  'question words',
  'subject-auxiliary inversion',
];

const SMART_CONTRAST = ['do questions', 'does questions', 'did questions', 'be questions', 'modal questions', 'question words'];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'Сначала найди тип глагола: обычный verb, be или modal. Потом поставь helper перед subject.',
      'Спочатку знайди тип дієслова: звичайний verb, be чи modal. Потім постав helper перед subject.',
      'First find the verb type: ordinary verb, be, or modal. Then put the helper before the subject.',
    ),
    depth2,
    depth3,
    depth4,
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Здесь нужен вопросительный порядок: ${correct}`,
    `Тут потрібен питальний порядок: ${correct}`,
    `Use question order: ${correct}`,
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
      'В английском вопросе обычно нужен helper перед subject: do/does/did, be или modal. После do/does/did основной глагол идет в base form.',
      'В англійському питанні зазвичай потрібен helper перед subject: do/does/did, be або modal. Після do/does/did основне дієслово йде в base form.',
      'English questions usually need a helper before the subject.',
    ),
    microTask: tri(
      'Выбери правильный порядок английского вопроса.',
      'Обери правильний порядок англійського питання.',
      'Choose the correct English question order.',
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
      'Правило-скелет: ordinary verb = do/does/did + subject + base verb. Be выходит вперед сам. Modal выходит вперед сам. Question word ставится в начало.',
      'Правило-скелет: ordinary verb = do/does/did + subject + base verb. Be виходить вперед сам. Modal виходить вперед сам. Question word ставиться на початок.',
      'Core rule: ordinary verb uses do/does/did; be and modals move forward themselves.',
    ),
    focusWords: input.focusWords,
  };
}

export const WORD_ORDER_BASIC_QUESTION_TRAINING: DiagnosisTraining = {
  id: 'word_order_basic_question',
  category: 'syntax',
  version: '1.0.0',
  status: 'active',
  priority: 32,
  supportedLocales: ['ru', 'uk'],
  title: tri('Question Word Order: как строить вопросы', 'Question Word Order: як будувати питання', 'Question Word Order'),
  shortTitle: tri('Question Word Order', 'Question Word Order', 'Question Word Order'),
  shortDiagnosis: tri(
    'Ты путаешь порядок слов в английских вопросах.',
    'Ти плутаєш порядок слів в англійських питаннях.',
    'You are mixing English question word order.',
  ),
  diagnosisText: tri(
    'Ты путаешь порядок слов в английских вопросах. Главная проблема в том, что в русском и украинском вопрос часто строится интонацией, а английский обычно требует переставить помощник перед subject: Do you work? Are you ready? Can you help?',
    'Ти плутаєш порядок слів в англійських питаннях. Головна проблема в тому, що в українській і російській питання часто будується інтонацією, а англійська зазвичай потребує поставити helper перед subject: Do you work? Are you ready? Can you help?',
    'English questions usually need a helper before the subject.',
  ),
  mentalModel: tri(
    'В английском вопросе часто появляется передний помощник: do/does/did, am/is/are, can/will/should. Базовая схема: helper + subject + main verb. Do you work? Is she ready? Can they come?',
    'В англійському питанні часто з’являється передній helper: do/does/did, am/is/are, can/will/should. Базова схема: helper + subject + main verb. Do you work? Is she ready? Can they come?',
    'A question often starts with a helper: do/does/did, be, or a modal.',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'Обычный глагол: Do you work? Does she work? Did they work? Be: Are you ready? Is he at home? Modal: Can you help? Will they come? С question word: Where do you live?',
    'Звичайне дієслово: Do you work? Does she work? Did they work? Be: Are you ready? Is he at home? Modal: Can you help? Will they come? З question word: Where do you live?',
    'Ordinary verb: do/does/did. Be and modals move before the subject.',
  ),
  whatUserMustLearn: {
    ru: [
      'В вопросах с обычным глаголом нужен do/does/did: Do you work?',
      'С he/she/it в Present Simple используем does, а основной глагол возвращается в base form: Does she work?',
      'В Past Simple вопрос строится через did + base verb: Did you go? Не Did you went?',
      'С be не нужен do. Be сам выходит вперед: Are you ready? Is she at home?',
      'С modal verbs не нужен do. Modal выходит вперед: Can you help? Will they come?',
      'Question word обычно ставится в начало: Where do you live?',
      'После question word порядок всё равно вопросительный: Where do you live? Не Where you live?',
      'В вопросе с be: Where are you? Не Where do you are?',
      'В вопросе с modal: What can you do? Не What do you can do?',
      'Нельзя строить английский вопрос только интонацией: You work? возможно в разговоре, но базово нужно Do you work?',
    ],
    uk: [
      'У питаннях зі звичайним дієсловом потрібен do/does/did: Do you work?',
      'З he/she/it у Present Simple використовуємо does, а основне дієслово повертається в base form: Does she work?',
      'У Past Simple питання будується через did + base verb: Did you go? Не Did you went?',
      'З be не потрібен do. Be сам виходить вперед: Are you ready? Is she at home?',
      'З modal verbs не потрібен do. Modal виходить вперед: Can you help? Will they come?',
      'Question word зазвичай ставиться на початок: Where do you live?',
      'Після question word порядок усе одно питальний: Where do you live? Не Where you live?',
      'У питанні з be: Where are you? Не Where do you are?',
      'У питанні з modal: What can you do? Не What do you can do?',
      'Не можна будувати англійське питання тільки інтонацією: You work? можливе в розмові, але базово потрібно Do you work?',
    ],
    es: [
      'Ordinary verbs use do/does/did in questions.',
      'After does/did, use the base verb.',
      'Be and modals move before the subject.',
      'Question words go first.',
    ],
  },
  examples: [
    { en: 'Do you work here?', ru: 'Ты здесь работаешь?', uk: 'Ти тут працюєш?', es: 'Do you work here?', why: tri('Work - обычный глагол. Для вопроса с you нужен do перед subject.', 'Work - звичайне дієслово. Для питання з you потрібен do перед subject.', 'Ordinary verb with you uses do.') },
    { en: 'Does she speak English?', ru: 'Она говорит по-английски?', uk: 'Вона говорить англійською?', es: 'Does she speak English?', why: tri('She требует does. После does основной глагол идет в base form: speak, не speaks.', 'She потребує does. Після does основне дієслово йде в base form: speak, не speaks.', 'Does takes the -s, so speak stays base.') },
    { en: 'Did you call him?', ru: 'Ты позвонил ему?', uk: 'Ти подзвонив йому?', es: 'Did you call him?', why: tri('В Past Simple question используем did + base verb: did call.', 'У Past Simple question використовуємо did + base verb: did call.', 'Past question uses did + base verb.') },
    { en: 'Are you ready?', ru: 'Ты готов?', uk: 'Ти готовий?', es: 'Are you ready?', why: tri('Ready идет с be, поэтому are выходит вперед. Do здесь не нужен.', 'Ready іде з be, тому are виходить вперед. Do тут не потрібен.', 'Be moves forward.') },
    { en: 'Is he at home?', ru: 'Он дома?', uk: 'Він вдома?', es: 'Is he at home?', why: tri('At home описывает место/состояние с be. Поэтому Is he...?', 'At home описує місце/стан з be. Тому Is he...?', 'Be question: Is he...?') },
    { en: 'Can you help me?', ru: 'Ты можешь мне помочь?', uk: 'Ти можеш мені допомогти?', es: 'Can you help me?', why: tri('Can - modal verb. В вопросе can выходит перед subject.', 'Can - modal verb. У питанні can виходить перед subject.', 'The modal can moves before the subject.') },
    { en: 'Where do you live?', ru: 'Где ты живешь?', uk: 'Де ти живеш?', es: 'Where do you live?', why: tri('Where стоит в начале, потом вопросительный порядок do + you + live.', 'Where стоїть на початку, потім питальний порядок do + you + live.', 'Question word first, then do + subject + verb.') },
    { en: 'What did you buy?', ru: 'Что ты купил?', uk: 'Що ти купив?', es: 'What did you buy?', why: tri('Past question: did + subject + base verb. Поэтому did you buy, не did you bought.', 'Past question: did + subject + base verb. Тому did you buy, не did you bought.', 'Did is followed by base verb.') },
  ],
  introBlocks: [
    {
      id: 'intro_problem',
      type: 'diagnosis',
      text: tri(
        'Похоже, ты иногда строишь вопрос как утверждение и просто добавляешь вопросительную интонацию. В английском этого часто недостаточно. Вопросу нужен передний помощник.',
        'Схоже, ти іноді будуєш питання як ствердження і просто додаєш питальну інтонацію. В англійській цього часто недостатньо. Питанню потрібен передній helper.',
        'You may be building questions like statements with intonation only.',
      ),
    },
    { id: 'intro_rule', type: 'rule', text: tri('Каркас вопроса: helper + subject + verb. Do you work? Are you ready? Can you help?', 'Каркас питання: helper + subject + verb. Do you work? Are you ready? Can you help?', 'Question frame: helper + subject + verb.') },
    { id: 'intro_warning', type: 'warning', text: tri('Главные ошибки: You work? Where you live? Does she works? Did you went? Правильно: Do you work? Where do you live? Does she work? Did you go?', 'Головні помилки: You work? Where you live? Does she works? Did you went? Правильно: Do you work? Where do you live? Does she work? Did you go?', 'Main traps: missing helper, does + -s, did + past.') },
  ],
  steps: [
    step({ id: 'q_order_easy_001', order: 1, difficulty: 'easy', targetSkill: 'do_you_work', sentence: '___ you work here?', translation: tri('Ты здесь работаешь?', 'Ти тут працюєш?', 'Do you work here?'), options: ['Do', 'Does', 'Are', 'Is'], correctAnswer: 'Do', correctFeedback: tri('Да. Work - обычный глагол. С you в вопросе нужен do.', 'Так. Work - звичайне дієслово. З you у питанні потрібен do.', 'Yes. Ordinary verb with you uses do.'), wrong: { Does: tri('Does используется с he/she/it. С you нужен Do you work?', 'Does використовується з he/she/it. З you потрібно Do you work?', 'Does is for he/she/it.'), Are: tri('Are нужен с be-структурой или -ing: Are you ready? Are you working? Здесь обычный verb work, поэтому Do.', 'Are потрібен з be-структурою або -ing: Are you ready? Are you working? Тут звичайний verb work, тому Do.', 'Use are with be or -ing, not base work.'), Is: tri('Is не используется с you и не нужен для обычного verb work. Нужно Do.', 'Is не використовується з you і не потрібен для звичайного verb work. Потрібно Do.', 'Is does not fit you or work.') }, retryFeedback: [tri('Обычный verb + you = Do you...?', 'Звичайний verb + you = Do you...?', 'Ordinary verb + you = Do you...?'), tri('Do you work?'), tri('Подсказка: Do you work here?', 'Підказка: Do you work here?', 'Hint: Do you work here?')], focusWords: ['do', 'you', 'work'] }),
    step({ id: 'q_order_easy_002', order: 2, difficulty: 'easy', targetSkill: 'do_they_live', sentence: '___ they live near you?', translation: tri('Они живут рядом с тобой?', 'Вони живуть поруч із тобою?', 'Do they live near you?'), options: ['Do', 'Does', 'Are', 'Is'], correctAnswer: 'Do', correctFeedback: tri('Да. They + обычный глагол live. В вопросе нужен do.', 'Так. They + звичайне дієслово live. У питанні потрібен do.', 'Yes. They uses do with an ordinary verb.'), wrong: { Does: tri('Does используется с he/she/it. They требует Do.', 'Does використовується з he/she/it. They потребує Do.', 'Does is for he/she/it.'), Are: tri('Are they live неправильно. С обычным verb live нужен Do they live?', 'Are they live неправильно. Зі звичайним verb live потрібно Do they live?', 'Use Do they live?'), Is: tri('Is не подходит к they. И для обычного verb live нужен do.', 'Is не підходить до they. І для звичайного verb live потрібен do.', 'Is does not fit they.') }, retryFeedback: [tri('They + live = Do they live?', 'They + live = Do they live?', 'They + live = Do they live?'), tri('Do they live near you?'), tri('Подсказка: Do they live near you?', 'Підказка: Do they live near you?', 'Hint: Do they live near you?')], focusWords: ['do', 'they', 'live'] }),
    step({ id: 'q_order_easy_003', order: 3, difficulty: 'easy', targetSkill: 'statement_vs_question_order', sentence: 'Choose the correct question.', translation: tri('Ты говоришь по-английски?', 'Ти говориш англійською?', 'Do you speak English?'), options: ['Do you speak English?', 'You speak English?', 'Speak you English?', 'Are you speak English?'], correctAnswer: 'Do you speak English?', correctFeedback: tri('Да. С обычным verb speak нужен вопросительный helper do.', 'Так. Зі звичайним verb speak потрібен питальний helper do.', 'Yes. Speak uses do in the question.'), wrong: { 'You speak English?': tri('Это порядок утверждения. В базовом вопросе нужен Do you speak English?', 'Це порядок ствердження. У базовому питанні потрібно Do you speak English?', 'That is statement order.'), 'Speak you English?': tri('Speak you - старый/необычный порядок. Современный базовый вопрос: Do you speak English?', 'Speak you - старий/незвичний порядок. Сучасне базове питання: Do you speak English?', 'Modern basic order uses do.'), 'Are you speak English?': tri('Are you speak неправильно. Are нужен с ready/working, но с speak нужен Do.', 'Are you speak неправильно. Are потрібен з ready/working, але зі speak потрібен Do.', 'Use do with speak.') }, retryFeedback: [tri('Обычный verb speak = Do you speak?', 'Звичайний verb speak = Do you speak?', 'Ordinary verb speak = Do you speak?'), tri('Do you speak English?'), tri('Подсказка: Do you speak English?', 'Підказка: Do you speak English?', 'Hint: Do you speak English?')], focusWords: ['do', 'speak'] }),
    step({ id: 'q_order_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'does_she_work_base', sentence: '___ she work here?', translation: tri('Она здесь работает?', 'Вона тут працює?', 'Does she work here?'), options: ['Do', 'Does', 'Is', 'Are'], correctAnswer: 'Does', correctFeedback: tri('Да. She требует does, а основной глагол остается base form: work.', 'Так. She потребує does, а основне дієслово залишається base form: work.', 'Yes. She uses does, then base work.'), wrong: { Do: tri('Do используется с I/you/we/they. С she нужен Does.', 'Do використовується з I/you/we/they. З she потрібен Does.', 'Use does with she.'), Is: tri('Is she work неправильно. С обычным verb work нужен Does she work?', 'Is she work неправильно. Зі звичайним verb work потрібно Does she work?', 'Use does with work.'), Are: tri('Are не подходит к she и не нужен с обычным verb work. Нужно Does.', 'Are не підходить до she і не потрібен зі звичайним verb work. Потрібно Does.', 'Are does not fit she.') }, retryFeedback: [tri('She + question = Does she + base verb.', 'She + question = Does she + base verb.', 'She question = Does she + base verb.'), tri('Does she work?'), tri('Подсказка: Does she work here?', 'Підказка: Does she work here?', 'Hint: Does she work here?')], focusWords: ['does', 'she', 'work'] }),
    step({ id: 'q_order_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'does_plus_base_no_s', sentence: 'Choose the correct question.', translation: tri('Он любит кофе?', 'Він любить каву?', 'Does he like coffee?'), options: ['Does he like coffee?', 'Does he likes coffee?', 'Do he like coffee?', 'Is he like coffee?'], correctAnswer: 'Does he like coffee?', correctFeedback: tri('Да. Does уже берет -s на себя, поэтому основной глагол base form: like.', 'Так. Does уже бере -s на себе, тому основне дієслово base form: like.', 'Yes. Does carries the -s; like stays base.'), wrong: { 'Does he likes coffee?': tri('После does нельзя likes. Нужно base verb: Does he like?', 'Після does не можна likes. Потрібен base verb: Does he like?', 'After does, use like, not likes.'), 'Do he like coffee?': tri('С he нужен does, не do.', 'З he потрібен does, не do.', 'Use does with he.'), 'Is he like coffee?': tri('Is he like может значить “он похож на кофе?” в другой структуре. Для “любит” нужен Does he like?', 'Is he like може означати “він схожий на каву?” в іншій структурі. Для “любить” потрібно Does he like?', 'Use does for like meaning loves/enjoys.') }, retryFeedback: [tri('Does + he + like. Не likes.', 'Does + he + like. Не likes.', 'Does + he + like, not likes.'), tri('Does he like coffee?'), tri('Подсказка: Does he like coffee?', 'Підказка: Does he like coffee?', 'Hint: Does he like coffee?')], focusWords: ['does', 'like'] }),
    step({ id: 'q_order_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'does_she_speak', sentence: 'Choose the correct question.', translation: tri('Она говорит по-английски?', 'Вона говорить англійською?', 'Does she speak English?'), options: ['Does she speak English?', 'Does she speaks English?', 'Do she speak English?', 'She speaks English?'], correctAnswer: 'Does she speak English?', correctFeedback: tri('Да. Does + she + base verb speak.', 'Так. Does + she + base verb speak.', 'Yes. Does + she + speak.'), wrong: { 'Does she speaks English?': tri('После does основной глагол без -s: speak.', 'Після does основне дієслово без -s: speak.', 'After does, use speak.'), 'Do she speak English?': tri('С she нужен does, не do.', 'З she потрібен does, не do.', 'Use does with she.'), 'She speaks English?': tri('Это порядок утверждения. Базовый вопрос: Does she speak English?', 'Це порядок ствердження. Базове питання: Does she speak English?', 'That is statement order.') }, retryFeedback: [tri('She question = Does she speak?', 'She question = Does she speak?', 'She question = Does she speak?'), tri('Does she speak English?'), tri('Подсказка: Does she speak English?', 'Підказка: Does she speak English?', 'Hint: Does she speak English?')], focusWords: ['does', 'speak'] }),
    step({ id: 'q_order_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'did_plus_base_go', sentence: '___ you go home yesterday?', translation: tri('Ты пошел домой вчера?', 'Ти пішов додому вчора?', 'Did you go home yesterday?'), options: ['Did', 'Do', 'Does', 'Were'], correctAnswer: 'Did', correctFeedback: tri('Да. Yesterday показывает прошлое. В вопросе Past Simple нужен did + base verb go.', 'Так. Yesterday показує минуле. У Past Simple question потрібен did + base verb go.', 'Yes. Past question uses did + go.'), wrong: { Do: tri('Do используется для настоящего. Yesterday требует Did.', 'Do використовується для теперішнього. Yesterday потребує Did.', 'Yesterday needs did.'), Does: tri('Does не используется с you и не подходит к yesterday. Нужно Did.', 'Does не використовується з you і не підходить до yesterday. Потрібно Did.', 'Use did for the past.'), Were: tri('Were используется с be. Здесь обычный глагол go, поэтому Did you go?', 'Were використовується з be. Тут звичайне дієслово go, тому Did you go?', 'Use did with go.') }, retryFeedback: [tri('Past question = Did + base verb.', 'Past question = Did + base verb.', 'Past question = Did + base verb.'), tri('Did you go?'), tri('Подсказка: Did you go home yesterday?', 'Підказка: Did you go home yesterday?', 'Hint: Did you go home yesterday?')], focusWords: ['did', 'go', 'yesterday'] }),
    step({ id: 'q_order_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'did_no_past_after_did', sentence: 'Choose the correct question.', translation: tri('Что ты купил?', 'Що ти купив?', 'What did you buy?'), options: ['What did you buy?', 'What did you bought?', 'What you bought?', 'What do you bought?'], correctAnswer: 'What did you buy?', correctFeedback: tri('Да. После did основной глагол возвращается в base form: buy.', 'Так. Після did основне дієслово повертається в base form: buy.', 'Yes. After did, use buy.'), wrong: { 'What did you bought?': tri('После did нельзя bought. Нужно base verb: buy.', 'Після did не можна bought. Потрібен base verb: buy.', 'After did, use buy.'), 'What you bought?': tri('После question word нужен вопросительный порядок с did: What did you buy?', 'Після question word потрібен питальний порядок з did: What did you buy?', 'After what, use did you buy.'), 'What do you bought?': tri('Do не подходит к прошлому bought. В Past Simple question нужно did + buy.', 'Do не підходить до минулого bought. У Past Simple question потрібно did + buy.', 'Past question needs did + buy.') }, retryFeedback: [tri('Did + buy. Не did + bought.', 'Did + buy. Не did + bought.', 'Did + buy, not did + bought.'), tri('What did you buy?'), tri('Подсказка: What did you buy?', 'Підказка: What did you buy?', 'Hint: What did you buy?')], focusWords: ['what', 'did', 'buy'] }),
    step({ id: 'q_order_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'did_she_call', sentence: 'Choose the correct question.', translation: tri('Она тебе позвонила?', 'Вона тобі подзвонила?', 'Did she call you?'), options: ['Did she call you?', 'Did she called you?', 'Does she called you?', 'She called you?'], correctAnswer: 'Did she call you?', correctFeedback: tri('Да. Past Simple question: Did + subject + base verb.', 'Так. Past Simple question: Did + subject + base verb.', 'Yes. Did + she + call.'), wrong: { 'Did she called you?': tri('После did нельзя called. Нужно call.', 'Після did не можна called. Потрібно call.', 'After did, use call.'), 'Does she called you?': tri('Does для настоящего и после него нужен base verb. Здесь прошлое, поэтому Did she call?', 'Does для теперішнього і після нього потрібен base verb. Тут минуле, тому Did she call?', 'Use did for past.'), 'She called you?': tri('Это порядок утверждения. Базовый вопрос: Did she call you?', 'Це порядок ствердження. Базове питання: Did she call you?', 'That is statement order.') }, retryFeedback: [tri('Past question = Did she call?', 'Past question = Did she call?', 'Past question = Did she call?'), tri('Did she call you?'), tri('Подсказка: Did she call you?', 'Підказка: Did she call you?', 'Hint: Did she call you?')], focusWords: ['did', 'call'] }),
    step({ id: 'q_order_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'be_question_are_you', sentence: '___ you ready?', translation: tri('Ты готов?', 'Ти готовий?', 'Are you ready?'), options: ['Are', 'Do', 'Does', 'Did'], correctAnswer: 'Are', correctFeedback: tri('Да. Ready идет с be. В вопросе be выходит вперед: Are you ready?', 'Так. Ready іде з be. У питанні be виходить вперед: Are you ready?', 'Yes. Be moves forward.'), wrong: { Do: tri('Do не нужен с be. Не Do you ready?, а Are you ready?', 'Do не потрібен з be. Не Do you ready?, а Are you ready?', 'Use Are you ready?'), Does: tri('Does не подходит к you и не нужен с ready. Нужно Are.', 'Does не підходить до you і не потрібен з ready. Потрібно Are.', 'Use are with you.'), Did: tri('Did не нужен для состояния ready в настоящем. Нужно Are you ready?', 'Did не потрібен для стану ready у теперішньому. Потрібно Are you ready?', 'Use are, not did.') }, retryFeedback: [tri('Ready = be structure. Are you ready?', 'Ready = be structure. Are you ready?', 'Ready = be structure.'), tri('Are you ready?'), tri('Подсказка: Are you ready?', 'Підказка: Are you ready?', 'Hint: Are you ready?')], focusWords: ['are', 'ready'] }),
    step({ id: 'q_order_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'be_question_is_he', sentence: '___ he at home?', translation: tri('Он дома?', 'Він вдома?', 'Is he at home?'), options: ['Is', 'Does', 'Do', 'Did'], correctAnswer: 'Is', correctFeedback: tri('Да. At home требует be. He идет с is: Is he at home?', 'Так. At home потребує be. He іде з is: Is he at home?', 'Yes. He uses is here.'), wrong: { Does: tri('Does нужен с обычным глаголом. Здесь нет обычного глагола, нужна форма Is.', 'Does потрібен зі звичайним дієсловом. Тут немає звичайного дієслова, потрібна форма Is.', 'Use is for at home.'), Do: tri('Do не подходит к he и не нужен с at home. Нужно Is.', 'Do не підходить до he і не потрібен з at home. Потрібно Is.', 'Use is.'), Did: tri('Did не нужен для вопроса “он дома?” в настоящем. Нужно Is he at home?', 'Did не потрібен для питання “він вдома?” у теперішньому. Потрібно Is he at home?', 'Use is for present be.') }, retryFeedback: [tri('He + be = Is he...?', 'He + be = Is he...?', 'He + be = Is he...?'), tri('Is he at home?'), tri('Подсказка: Is he at home?', 'Підказка: Is he at home?', 'Hint: Is he at home?')], focusWords: ['is', 'he', 'at home'] }),
    step({ id: 'q_order_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'modal_question_can', sentence: '___ you help me?', translation: tri('Ты можешь мне помочь?', 'Ти можеш мені допомогти?', 'Can you help me?'), options: ['Can', 'Do can', 'Are can', 'Does'], correctAnswer: 'Can', correctFeedback: tri('Да. Can - modal verb. В вопросе can выходит вперед: Can you help?', 'Так. Can - modal verb. У питанні can виходить вперед: Can you help?', 'Yes. Can moves before you.'), wrong: { 'Do can': tri('С modal can не нужен do. Нельзя Do can you. Нужно Can you.', 'З modal can не потрібен do. Не можна Do can you. Потрібно Can you.', 'Do is not used with can.'), 'Are can': tri('Are can неправильно. Modal can сам выходит вперед.', 'Are can неправильно. Modal can сам виходить вперед.', 'Use can by itself.'), Does: tri('Does не используется с modal can. Нужно Can you help?', 'Does не використовується з modal can. Потрібно Can you help?', 'Use can, not does.') }, retryFeedback: [tri('Modal question = Can + subject + verb.', 'Modal question = Can + subject + verb.', 'Modal question = Can + subject + verb.'), tri('Can you help me?'), tri('Подсказка: Can you help me?', 'Підказка: Can you help me?', 'Hint: Can you help me?')], focusWords: ['can', 'you', 'help'] }),
    step({ id: 'q_order_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'where_do_you_live', sentence: 'Choose the correct question.', translation: tri('Где ты живешь?', 'Де ти живеш?', 'Where do you live?'), options: ['Where do you live?', 'Where you live?', 'Where are you live?', 'Where does you live?'], correctAnswer: 'Where do you live?', correctFeedback: tri('Да. Where + do + you + live.', 'Так. Where + do + you + live.', 'Yes. Where + do + you + live.'), wrong: { 'Where you live?': tri('После where нужен helper do: Where do you live?', 'Після where потрібен helper do: Where do you live?', 'After where, use do.'), 'Where are you live?': tri('Are you live неправильно. С обычным verb live нужен do.', 'Are you live неправильно. Зі звичайним verb live потрібен do.', 'Use do with live.'), 'Where does you live?': tri('Does не используется с you. Нужно do.', 'Does не використовується з you. Потрібно do.', 'Use do with you.') }, retryFeedback: [tri('Where + do + you + live?', 'Where + do + you + live?', 'Where + do + you + live?'), tri('Where do you live?'), tri('Подсказка: Where do you live?', 'Підказка: Where do you live?', 'Hint: Where do you live?')], focusWords: ['where', 'do', 'live'] }),
    step({ id: 'q_order_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'where_are_you', sentence: 'Choose the correct question.', translation: tri('Где ты?', 'Де ти?', 'Where are you?'), options: ['Where are you?', 'Where do you are?', 'Where you are?', 'Where is you?'], correctAnswer: 'Where are you?', correctFeedback: tri('Да. С be вопрос строится без do: Where are you?', 'Так. З be питання будується без do: Where are you?', 'Yes. Be moves forward without do.'), wrong: { 'Where do you are?': tri('С be не нужен do. Нужно Where are you?', 'З be не потрібен do. Потрібно Where are you?', 'Do is not used with be here.'), 'Where you are?': tri('В вопросе be выходит перед subject: Where are you?', 'У питанні be виходить перед subject: Where are you?', 'Move are before you.'), 'Where is you?': tri('You требует are, не is.', 'You потребує are, не is.', 'You uses are.') }, retryFeedback: [tri('Where + are + you?', 'Where + are + you?', 'Where + are + you?'), tri('Where are you?'), tri('Подсказка: Where are you?', 'Підказка: Where are you?', 'Hint: Where are you?')], focusWords: ['where', 'are', 'you'] }),
    step({ id: 'q_order_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'what_can_you_do', sentence: 'Choose the correct question.', translation: tri('Что ты можешь сделать?', 'Що ти можеш зробити?', 'What can you do?'), options: ['What can you do?', 'What do you can do?', 'What you can do?', 'What can do you?'], correctAnswer: 'What can you do?', correctFeedback: tri('Да. Question word + modal + subject + base verb: What can you do?', 'Так. Question word + modal + subject + base verb: What can you do?', 'Yes. What + can + you + do.'), wrong: { 'What do you can do?': tri('С can не нужен do. Нужно What can you do?', 'З can не потрібен do. Потрібно What can you do?', 'Do is not used with can.'), 'What you can do?': tri('После what нужен вопросительный порядок: can you.', 'Після what потрібен питальний порядок: can you.', 'After what, use can you.'), 'What can do you?': tri('После can должен идти subject you, потом verb do: What can you do?', 'Після can має йти subject you, потім verb do: What can you do?', 'After can, put subject you.') }, retryFeedback: [tri('What + can + you + do?', 'What + can + you + do?', 'What + can + you + do?'), tri('What can you do?'), tri('Подсказка: What can you do?', 'Підказка: What can you do?', 'Hint: What can you do?')], focusWords: ['what', 'can', 'you', 'do'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'missing_auxiliary_question_error',
      'statement_order_question_error',
      'does_plus_s_error',
      'did_plus_past_error',
      'do_with_be_error',
      'do_with_modal_error',
      'question_word_no_aux_error',
      'wrong_auxiliary_choice_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем тип глагола и нужный helper.', 'Звичайне пояснення: показуємо тип дієслова і потрібний helper.', 'Show verb type and helper.'),
    depth2: tri('Проще: спрашиваем, это обычный verb, be или modal.', 'Простіше: питаємо, це звичайний verb, be чи modal.', 'Ask: ordinary verb, be, or modal?'),
    depth3: tri('Еще проще: показываем готовые шаблоны Do you work? / Are you ready? / Can you help?', 'Ще простіше: показуємо готові шаблони Do you work? / Are you ready? / Can you help?', 'Show model questions.'),
    depth4: tri('Почти подсказка: прямо указываем правильный порядок вопроса.', 'Майже підказка: прямо вказуємо правильний порядок питання.', 'Almost a hint: show the question order.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: {
        ru: 'Остановись. В вопросе найди тип глагола. Обычный verb = do/does/did + subject + base verb. Be = am/is/are выходит вперед. Modal = can/will/should выходит вперед. Question word ставь в начало.',
        uk: 'Зупинись. У питанні знайди тип дієслова. Звичайний verb = do/does/did + subject + base verb. Be = am/is/are виходить вперед. Modal = can/will/should виходить вперед. Question word став на початок.',
        es: 'Pause. Ordinary verb uses do/does/did; be and modals move forward.',
      },
    },
    afterThreeWrongInSameExercise: {
      action: 'show_question_structure_hint_then_retry',
      card: {
        ru: 'Подсказка по структуре: система покажет тип вопроса: do-question, be-question или modal-question, но не соберет ответ за пользователя.',
        uk: 'Підказка за структурою: система покаже тип питання: do-question, be-question або modal-question, але не збере відповідь за користувача.',
        es: 'Hint: show whether this is a do, be, or modal question.',
      },
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: {
        ru: 'Режим подсказки: сначала выбери тип глагола: обычный, be или modal. Потом система вернет тебя к правильному порядку вопроса.',
        uk: 'Режим підказки: спочатку обери тип дієслова: звичайний, be або modal. Потім система поверне тебе до правильного порядку питання.',
        es: 'Guided mode: choose the verb type first.',
      },
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_q_order_001', prompt: { ru: 'В Do you work? work - это обычный verb или be?', uk: 'У Do you work? work - це звичайний verb чи be?', es: 'In Do you work?, is work ordinary verb or be?' }, options: ['обычный verb', 'be'], correctIndex: 0, thenReturnToExerciseId: 'q_order_easy_001' },
      { id: 'guided_q_order_002', prompt: { ru: 'После does основной глагол должен быть likes или like?', uk: 'Після does основне дієслово має бути likes чи like?', es: 'After does, should the verb be likes or like?' }, options: ['likes', 'like'], correctIndex: 1, thenReturnToExerciseId: 'q_order_contrast_002' },
      { id: 'guided_q_order_003', prompt: { ru: 'После did основной глагол должен быть went или go?', uk: 'Після did основне дієслово має бути went чи go?', es: 'After did, should the verb be went or go?' }, options: ['went', 'go'], correctIndex: 1, thenReturnToExerciseId: 'q_order_contrast_004' },
      { id: 'guided_q_order_004', prompt: { ru: 'В Are you ready? нужен do или be сам выходит вперед?', uk: 'У Are you ready? потрібен do чи be сам виходить вперед?', es: 'In Are you ready?, do we need do?' }, options: ['нужен do', 'be сам выходит вперед'], correctIndex: 1, thenReturnToExerciseId: 'q_order_mixed_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'syntax',
    microDiagnosisId: 'word_order_basic_question',
    diagnosisLabel: tri('Порядок слов в вопросах', 'Порядок слів у питаннях', 'Question word order'),
    contrastSet: SMART_CONTRAST,
    difficultyLevel: 2,
    focusWords: SMART_CONTRAST,
    focusPatterns: [
      'do_you_work',
      'do_they_live',
      'statement_vs_question_order',
      'does_she_work_base',
      'does_plus_base_no_s',
      'does_she_speak',
      'did_plus_base_go',
      'did_no_past_after_did',
      'did_she_call',
      'be_question_are_you',
      'be_question_is_he',
      'modal_question_can',
      'where_do_you_live',
      'where_are_you',
      'what_can_you_do',
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
    start: 'diagnosis_training_word_order_basic_question_start',
    answer: 'diagnosis_training_word_order_basic_question_answer',
    mastery: 'diagnosis_training_word_order_basic_question_mastery',
    fallback: 'diagnosis_training_word_order_basic_question_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: {
      category: 'syntax',
      microDiagnosisId: 'word_order_basic_question',
      contrastSet: SMART_CONTRAST,
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logQuestionType: true,
      logAuxiliary: true,
      logVerbFormAfterAuxiliary: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=syntax&microDiagnosisId=word_order_basic_question',
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


