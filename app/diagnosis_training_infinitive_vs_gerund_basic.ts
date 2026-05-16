import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = ['to + base verb', 'verb-ing', 'want to', 'need to', 'decide to', 'enjoy doing', 'finish doing', 'avoid doing'];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'Сначала найди первый глагол. Он управляет вторым: to do или doing.',
      'Спочатку знайди перше дієслово. Воно керує другим: to do чи doing.',
      'First find the governing verb. It decides whether the next form is to do or doing.',
    ),
    depth2,
    depth3,
    depth4,
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Здесь первый глагол требует другую форму. Нужно: ${correct}.`,
    `Тут перше дієслово потребує іншої форми. Потрібно: ${correct}.`,
    `The first verb requires a different form: ${correct}.`,
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
      'После некоторых глаголов нужен to + base verb: want to learn, need to go. После других нужен verb-ing: enjoy learning, avoid making.',
      'Після деяких дієслів потрібен to + base verb: want to learn, need to go. Після інших потрібен verb-ing: enjoy learning, avoid making.',
      'Some verbs take to + base verb, and some take verb-ing.',
    ),
    microTask: tri(
      'Выбери форму второго глагола: to + base verb или verb-ing.',
      'Обери форму другого дієслова: to + base verb або verb-ing.',
      'Choose the second verb form.',
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
      'Правило-скелет: want/need/decide/plan/agree + to + base verb. Enjoy/finish/avoid/mind + verb-ing. После infinitive to не ставь -ing.',
      'Правило-скелет: want/need/decide/plan/agree + to + base verb. Enjoy/finish/avoid/mind + verb-ing. Після infinitive to не став -ing.',
      'Want/need/decide/plan/agree take to + base verb. Enjoy/finish/avoid/mind take verb-ing.',
    ),
    focusWords: input.focusWords,
  };
}

export const INFINITIVE_VS_GERUND_BASIC_TRAINING: DiagnosisTraining = {
  id: 'infinitive_vs_gerund_basic',
  category: 'verb',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 33,
  supportedLocales: ['ru', 'uk'],
  title: tri('To do / Doing: инфинитив или -ing', 'To do / Doing: інфінітив чи -ing'),
  shortTitle: tri('Infinitive vs Gerund', 'Infinitive vs Gerund'),
  shortDiagnosis: tri(
    'Ты путаешь, когда после первого глагола нужен to + verb, а когда verb-ing.',
    'Ти плутаєш, коли після першого дієслова потрібен to + verb, а коли verb-ing.',
  ),
  diagnosisText: tri(
    'Ты путаешь, когда после первого глагола нужен to + verb, а когда verb-ing. Русский и украинский часто дают одну форму "делать", а английский требует запомнить связку: want to do, need to do, enjoy doing, finish doing.',
    'Ти плутаєш, коли після першого дієслова потрібен to + verb, а коли verb-ing. Українська і російська часто дають одну форму "робити", а англійська потребує запам’ятати зв’язок: want to do, need to do, enjoy doing, finish doing.',
  ),
  mentalModel: tri(
    'Некоторые глаголы тянут за собой to + base verb: want to learn, need to go, decide to start. Другие тянут -ing: enjoy learning, finish working, avoid making mistakes.',
    'Деякі дієслова тягнуть за собою to + base verb: want to learn, need to go, decide to start. Інші тягнуть -ing: enjoy learning, finish working, avoid making mistakes.',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'Want/need/decide/plan + to + base verb: I want to learn. Enjoy/finish/avoid/mind + verb-ing: I enjoy learning. После to нужен base verb, не -ing. После enjoy нужен -ing, не to.',
    'Want/need/decide/plan + to + base verb: I want to learn. Enjoy/finish/avoid/mind + verb-ing: I enjoy learning. Після to потрібен base verb, не -ing. Після enjoy потрібен -ing, не to.',
  ),
  whatUserMustLearn: {
    ru: [
      'После want обычно нужен to + base verb: want to learn.',
      'После need обычно нужен to + base verb: need to go.',
      'После decide обычно нужен to + base verb: decide to start.',
      'После plan обычно нужен to + base verb: plan to study.',
      'После enjoy нужен verb-ing: enjoy learning.',
      'После finish нужен verb-ing: finish working.',
      'После avoid нужен verb-ing: avoid making mistakes.',
      'После mind нужен verb-ing: Do you mind waiting?',
      'После to в инфинитиве глагол идет в base form: to go, to learn, to study. Не to going.',
      'После глаголов типа enjoy/finish/avoid нельзя автоматически ставить to. Нужно учить блоками.',
    ],
    uk: [
      'Після want зазвичай потрібен to + base verb: want to learn.',
      'Після need зазвичай потрібен to + base verb: need to go.',
      'Після decide зазвичай потрібен to + base verb: decide to start.',
      'Після plan зазвичай потрібен to + base verb: plan to study.',
      'Після enjoy потрібен verb-ing: enjoy learning.',
      'Після finish потрібен verb-ing: finish working.',
      'Після avoid потрібен verb-ing: avoid making mistakes.',
      'Після mind потрібен verb-ing: Do you mind waiting?',
      'Після to в інфінітиві дієслово йде в base form: to go, to learn, to study. Не to going.',
      'Після дієслів типу enjoy/finish/avoid не можна автоматично ставити to. Потрібно вчити блоками.',
    ],
    es: [
      'Want usually takes to + base verb.',
      'Need usually takes to + base verb.',
      'Decide usually takes to + base verb.',
      'Plan usually takes to + base verb.',
      'Enjoy takes verb-ing.',
      'Finish takes verb-ing.',
      'Avoid takes verb-ing.',
      'Mind takes verb-ing.',
      'After infinitive to, use the base verb.',
      'Learn these forms as verb patterns.',
    ],
  },
  examples: [
    { en: 'I want to learn English.', ru: 'Я хочу выучить английский.', uk: 'Я хочу вивчити англійську.', es: 'I want to learn English.', why: tri('Want требует to + base verb: want to learn.', 'Want потребує to + base verb: want to learn.') },
    { en: 'She needs to go home.', ru: 'Ей нужно идти домой.', uk: 'Їй потрібно йти додому.', es: 'She needs to go home.', why: tri('Need требует to + base verb: needs to go.', 'Need потребує to + base verb: needs to go.') },
    { en: 'They decided to start again.', ru: 'Они решили начать снова.', uk: 'Вони вирішили почати знову.', es: 'They decided to start again.', why: tri('Decide требует to + base verb: decided to start.', 'Decide потребує to + base verb: decided to start.') },
    { en: 'I enjoy learning new words.', ru: 'Мне нравится учить новые слова.', uk: 'Мені подобається вчити нові слова.', es: 'I enjoy learning new words.', why: tri('Enjoy требует verb-ing: enjoy learning.', 'Enjoy потребує verb-ing: enjoy learning.') },
    { en: 'He finished working late.', ru: 'Он закончил работать поздно.', uk: 'Він закінчив працювати пізно.', es: 'He finished working late.', why: tri('Finish требует verb-ing: finished working.', 'Finish потребує verb-ing: finished working.') },
    { en: 'Avoid making the same mistake.', ru: 'Избегай делать ту же ошибку.', uk: 'Уникай робити ту саму помилку.', es: 'Avoid making the same mistake.', why: tri('Avoid требует verb-ing: avoid making.', 'Avoid потребує verb-ing: avoid making.') },
    { en: 'Do you mind waiting here?', ru: 'Ты не против подождать здесь?', uk: 'Ти не проти почекати тут?', es: 'Do you mind waiting here?', why: tri('Mind требует verb-ing: mind waiting.', 'Mind потребує verb-ing: mind waiting.') },
    { en: 'We plan to study tonight.', ru: 'Мы планируем учиться сегодня вечером.', uk: 'Ми плануємо вчитися сьогодні ввечері.', es: 'We plan to study tonight.', why: tri('Plan требует to + base verb: plan to study.', 'Plan потребує to + base verb: plan to study.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты видишь второй глагол и выбираешь форму наугад: to learn или learning. В английском первый глагол часто диктует форму второго.', 'Схоже, ти бачиш друге дієслово і обираєш форму навмання: to learn чи learning. В англійській перше дієслово часто диктує форму другого.') },
    { id: 'intro_rule', type: 'rule', text: tri('Два больших блока: want/need/decide/plan + to do. Enjoy/finish/avoid/mind + doing.', 'Два великі блоки: want/need/decide/plan + to do. Enjoy/finish/avoid/mind + doing.') },
    { id: 'intro_warning', type: 'warning', text: tri('Не говори I want learning и I enjoy to learn. Правильно: I want to learn, I enjoy learning.', 'Не говори I want learning і I enjoy to learn. Правильно: I want to learn, I enjoy learning.') },
  ],
  steps: [
    step({ id: 'inf_ger_easy_001', order: 1, difficulty: 'easy', targetSkill: 'want_to_learn', sentence: 'I want ___ English.', translation: tri('Я хочу выучить английский.', 'Я хочу вивчити англійську.'), options: ['to learn', 'learning', 'learn', 'to learning'], correctAnswer: 'to learn', correctFeedback: tri('Да. Want требует to + base verb: want to learn.', 'Так. Want потребує to + base verb: want to learn.'), wrong: { learning: tri('Want learning неправильно в этом значении. После want нужен to + base verb.', 'Want learning неправильно в цьому значенні. Після want потрібен to + base verb.'), learn: tri('После want нужен to. Не want learn, а want to learn.', 'Після want потрібен to. Не want learn, а want to learn.'), 'to learning': tri('После infinitive to нужен base verb: to learn, не to learning.', 'Після infinitive to потрібен base verb: to learn, не to learning.') }, retryFeedback: [tri('Want + to + learn.'), tri('Want to learn.'), tri('Подсказка: I want to learn English.', 'Підказка: I want to learn English.')], focusWords: ['want', 'to learn', 'base verb'] }),
    step({ id: 'inf_ger_easy_002', order: 2, difficulty: 'easy', targetSkill: 'need_to_go', sentence: 'She needs ___ home.', translation: tri('Ей нужно идти домой.', 'Їй потрібно йти додому.'), options: ['to go', 'going', 'go', 'to going'], correctAnswer: 'to go', correctFeedback: tri('Да. Need требует to + base verb: needs to go.', 'Так. Need потребує to + base verb: needs to go.'), wrong: { going: tri('Needs going неправильно в этом значении. Нужно needs to go.', 'Needs going неправильно в цьому значенні. Потрібно needs to go.'), go: tri('После need нужен to. Не needs go, а needs to go.', 'Після need потрібен to. Не needs go, а needs to go.'), 'to going': tri('После to нужен base verb: to go, не to going.', 'Після to потрібен base verb: to go, не to going.') }, retryFeedback: [tri('Need + to + go.'), tri('She needs to go.'), tri('Подсказка: She needs to go home.', 'Підказка: She needs to go home.')], focusWords: ['need', 'to go', 'base verb'] }),
    step({ id: 'inf_ger_easy_003', order: 3, difficulty: 'easy', targetSkill: 'want_to_help', sentence: 'They want ___ us.', translation: tri('Они хотят помочь нам.', 'Вони хочуть допомогти нам.'), options: ['to help', 'helping', 'help', 'to helping'], correctAnswer: 'to help', correctFeedback: tri('Да. Want требует to + base verb: want to help.', 'Так. Want потребує to + base verb: want to help.'), wrong: { helping: tri('Want helping неправильно. Нужно want to help.', 'Want helping неправильно. Потрібно want to help.'), help: tri('После want нужен to: want to help.', 'Після want потрібен to: want to help.'), 'to helping': tri('После to нужен base verb: to help, не to helping.', 'Після to потрібен base verb: to help, не to helping.') }, retryFeedback: [tri('Want + to help.'), tri('They want to help us.'), tri('Подсказка: They want to help us.', 'Підказка: They want to help us.')], focusWords: ['want', 'to help'] }),
    step({ id: 'inf_ger_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'decide_to_start', sentence: 'They decided ___ again.', translation: tri('Они решили начать снова.', 'Вони вирішили почати знову.'), options: ['to start', 'starting', 'start', 'to starting'], correctAnswer: 'to start', correctFeedback: tri('Да. Decide требует to + base verb: decided to start.', 'Так. Decide потребує to + base verb: decided to start.'), wrong: { starting: tri('Decided starting неправильно. После decide нужен to + base verb.', 'Decided starting неправильно. Після decide потрібен to + base verb.'), start: tri('После decide нужен to: decided to start.', 'Після decide потрібен to: decided to start.'), 'to starting': tri('После to нужен base verb: to start, не to starting.', 'Після to потрібен base verb: to start, не to starting.') }, retryFeedback: [tri('Decide + to start.'), tri('Decided to start.'), tri('Подсказка: They decided to start again.', 'Підказка: They decided to start again.')], focusWords: ['decide', 'to start'] }),
    step({ id: 'inf_ger_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'plan_to_study', sentence: 'We plan ___ tonight.', translation: tri('Мы планируем учиться сегодня вечером.', 'Ми плануємо вчитися сьогодні ввечері.'), options: ['to study', 'studying', 'study', 'to studying'], correctAnswer: 'to study', correctFeedback: tri('Да. Plan требует to + base verb: plan to study.', 'Так. Plan потребує to + base verb: plan to study.'), wrong: { studying: tri('Plan studying неправильно в этом значении. Нужно plan to study.', 'Plan studying неправильно в цьому значенні. Потрібно plan to study.'), study: tri('После plan нужен to: plan to study.', 'Після plan потрібен to: plan to study.'), 'to studying': tri('После to нужен base verb: to study, не to studying.', 'Після to потрібен base verb: to study, не to studying.') }, retryFeedback: [tri('Plan + to study.'), tri('We plan to study.'), tri('Подсказка: We plan to study tonight.', 'Підказка: We plan to study tonight.')], focusWords: ['plan', 'to study'] }),
    step({ id: 'inf_ger_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'agree_to_help', sentence: 'He agreed ___ me.', translation: tri('Он согласился помочь мне.', 'Він погодився допомогти мені.'), options: ['to help', 'helping', 'help', 'to helping'], correctAnswer: 'to help', correctFeedback: tri('Да. Agree требует to + base verb: agreed to help.', 'Так. Agree потребує to + base verb: agreed to help.'), wrong: { helping: tri('Agreed helping неправильно. После agree нужен to + base verb.', 'Agreed helping неправильно. Після agree потрібен to + base verb.'), help: tri('После agree нужен to: agreed to help.', 'Після agree потрібен to: agreed to help.'), 'to helping': tri('После to нужен base verb: to help, не to helping.', 'Після to потрібен base verb: to help, не to helping.') }, retryFeedback: [tri('Agree + to help.'), tri('He agreed to help me.'), tri('Подсказка: He agreed to help me.', 'Підказка: He agreed to help me.')], focusWords: ['agree', 'to help'] }),
    step({ id: 'inf_ger_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'enjoy_learning', sentence: 'I enjoy ___ new words.', translation: tri('Мне нравится учить новые слова.', 'Мені подобається вчити нові слова.'), options: ['to learn', 'learning', 'learn', 'to learning'], correctAnswer: 'learning', correctFeedback: tri('Да. Enjoy требует verb-ing: enjoy learning.', 'Так. Enjoy потребує verb-ing: enjoy learning.'), wrong: { 'to learn': tri('Enjoy to learn неправильно. После enjoy нужен verb-ing: learning.', 'Enjoy to learn неправильно. Після enjoy потрібен verb-ing: learning.'), learn: tri('Enjoy learn неправильно. Нужно enjoy learning.', 'Enjoy learn неправильно. Потрібно enjoy learning.'), 'to learning': tri('To learning здесь неправильно. После enjoy нужен просто verb-ing: learning.', 'To learning тут неправильно. Після enjoy потрібен просто verb-ing: learning.') }, retryFeedback: [tri('Enjoy + learning.'), tri('I enjoy learning.'), tri('Подсказка: I enjoy learning new words.', 'Підказка: I enjoy learning new words.')], focusWords: ['enjoy', 'learning'] }),
    step({ id: 'inf_ger_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'finish_working', sentence: 'He finished ___ late.', translation: tri('Он закончил работать поздно.', 'Він закінчив працювати пізно.'), options: ['to work', 'working', 'work', 'to working'], correctAnswer: 'working', correctFeedback: tri('Да. Finish требует verb-ing: finished working.', 'Так. Finish потребує verb-ing: finished working.'), wrong: { 'to work': tri('Finished to work неправильно в этом значении. После finish нужен verb-ing.', 'Finished to work неправильно в цьому значенні. Після finish потрібен verb-ing.'), work: tri('Finished work может значить "закончил работу как объект". Но "закончил работать" = finished working.', 'Finished work може означати "закінчив роботу як object". Але "закінчив працювати" = finished working.'), 'to working': tri('To working здесь неправильно. После finish нужен working.', 'To working тут неправильно. Після finish потрібен working.') }, retryFeedback: [tri('Finish + working.'), tri('He finished working.'), tri('Подсказка: He finished working late.', 'Підказка: He finished working late.')], focusWords: ['finish', 'working'] }),
    step({ id: 'inf_ger_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'enjoy_reading', sentence: 'She enjoys ___ books.', translation: tri('Ей нравится читать книги.', 'Їй подобається читати книжки.'), options: ['to read', 'reading', 'read', 'to reading'], correctAnswer: 'reading', correctFeedback: tri('Да. Enjoy требует verb-ing: enjoys reading.', 'Так. Enjoy потребує verb-ing: enjoys reading.'), wrong: { 'to read': tri('Enjoys to read неправильно. После enjoy нужен verb-ing.', 'Enjoys to read неправильно. Після enjoy потрібен verb-ing.'), read: tri('Enjoys read неправильно. Нужно enjoys reading.', 'Enjoys read неправильно. Потрібно enjoys reading.'), 'to reading': tri('To reading здесь неправильно. После enjoy нужен reading.', 'To reading тут неправильно. Після enjoy потрібен reading.') }, retryFeedback: [tri('Enjoy + reading.'), tri('She enjoys reading books.'), tri('Подсказка: She enjoys reading books.', 'Підказка: She enjoys reading books.')], focusWords: ['enjoys', 'reading'] }),
    step({ id: 'inf_ger_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'avoid_making', sentence: 'Avoid ___ the same mistake.', translation: tri('Избегай делать ту же ошибку.', 'Уникай робити ту саму помилку.'), options: ['to make', 'making', 'make', 'to making'], correctAnswer: 'making', correctFeedback: tri('Да. Avoid требует verb-ing: avoid making.', 'Так. Avoid потребує verb-ing: avoid making.'), wrong: { 'to make': tri('Avoid to make неправильно. После avoid нужен verb-ing: making.', 'Avoid to make неправильно. Після avoid потрібен verb-ing: making.'), make: tri('Avoid make неправильно. Нужно avoid making.', 'Avoid make неправильно. Потрібно avoid making.'), 'to making': tri('To making здесь неправильно. После avoid нужен making.', 'To making тут неправильно. Після avoid потрібен making.') }, retryFeedback: [tri('Avoid + making.'), tri('Avoid making mistakes.'), tri('Подсказка: Avoid making the same mistake.', 'Підказка: Avoid making the same mistake.')], focusWords: ['avoid', 'making'] }),
    step({ id: 'inf_ger_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'mind_waiting', sentence: 'Do you mind ___ here?', translation: tri('Ты не против подождать здесь?', 'Ти не проти почекати тут?'), options: ['to wait', 'waiting', 'wait', 'to waiting'], correctAnswer: 'waiting', correctFeedback: tri('Да. Mind требует verb-ing: mind waiting.', 'Так. Mind потребує verb-ing: mind waiting.'), wrong: { 'to wait': tri('Mind to wait неправильно. После mind нужен verb-ing: waiting.', 'Mind to wait неправильно. Після mind потрібен verb-ing: waiting.'), wait: tri('Mind wait неправильно. Нужно mind waiting.', 'Mind wait неправильно. Потрібно mind waiting.'), 'to waiting': tri('To waiting здесь неправильно. После mind нужен waiting.', 'To waiting тут неправильно. Після mind потрібен waiting.') }, retryFeedback: [tri('Mind + waiting.'), tri('Do you mind waiting?'), tri('Подсказка: Do you mind waiting here?', 'Підказка: Do you mind waiting here?')], focusWords: ['mind', 'waiting'] }),
    step({ id: 'inf_ger_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'avoid_being_late', sentence: 'Try to avoid ___ late.', translation: tri('Постарайся не опаздывать.', 'Постарайся не запізнюватися.'), options: ['to be', 'being', 'be', 'to being'], correctAnswer: 'being', correctFeedback: tri('Да. Avoid требует verb-ing. С be форма будет being: avoid being late.', 'Так. Avoid потребує verb-ing. З be форма буде being: avoid being late.'), wrong: { 'to be': tri('Avoid to be late неправильно. После avoid нужен being.', 'Avoid to be late неправильно. Після avoid потрібен being.'), be: tri('Avoid be late неправильно. Нужно avoid being late.', 'Avoid be late неправильно. Потрібно avoid being late.'), 'to being': tri('To being здесь неправильно. После avoid нужен being.', 'To being тут неправильно. Після avoid потрібен being.') }, retryFeedback: [tri('Avoid + being.'), tri('Avoid being late.'), tri('Подсказка: Try to avoid being late.', 'Підказка: Try to avoid being late.')], focusWords: ['avoid', 'being late'] }),
    step({ id: 'inf_ger_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_want_enjoy_pair', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.'), options: ['I want to learn / I enjoy learning', 'I want learning / I enjoy to learn', 'I want to learning / I enjoy learn', 'I want learn / I enjoy to learning'], correctAnswer: 'I want to learn / I enjoy learning', correctFeedback: tri('Да. Want требует to learn, enjoy требует learning.', 'Так. Want потребує to learn, enjoy потребує learning.'), wrong: { 'I want learning / I enjoy to learn': tri('Формы перепутаны. Нужно want to learn, но enjoy learning.', 'Форми переплутані. Потрібно want to learn, але enjoy learning.'), 'I want to learning / I enjoy learn': tri('После to нужен learn, не learning. После enjoy нужен learning, не learn.', 'Після to потрібен learn, не learning. Після enjoy потрібен learning, не learn.'), 'I want learn / I enjoy to learning': tri('После want нужен to. После enjoy не нужен to learning, нужен learning.', 'Після want потрібен to. Після enjoy не потрібен to learning, потрібен learning.') }, retryFeedback: [tri('Want to learn. Enjoy learning.'), tri('Want to / enjoy -ing.'), tri('Подсказка: I want to learn / I enjoy learning.', 'Підказка: I want to learn / I enjoy learning.')], focusWords: ['want to learn', 'enjoy learning'] }),
    step({ id: 'inf_ger_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_need_finish_pair', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.'), options: ['She needs to go / She finished working', 'She needs going / She finished to work', 'She needs to going / She finished work', 'She needs go / She finished to working'], correctAnswer: 'She needs to go / She finished working', correctFeedback: tri('Да. Need требует to go, finish требует working.', 'Так. Need потребує to go, finish потребує working.'), wrong: { 'She needs going / She finished to work': tri('Need going неправильно, finished to work тоже неправильно. Нужно needs to go / finished working.', 'Need going неправильно, finished to work теж неправильно. Потрібно needs to go / finished working.'), 'She needs to going / She finished work': tri('После to нужен go. Finished work может значить "закончила работу как объект", но "закончила работать" = finished working.', 'Після to потрібен go. Finished work може означати "закінчила роботу як object", але "закінчила працювати" = finished working.'), 'She needs go / She finished to working': tri('После need нужен to. Finished to working неправильно.', 'Після need потрібен to. Finished to working неправильно.') }, retryFeedback: [tri('Need to go. Finish working.'), tri('Needs to go / finished working.'), tri('Подсказка: She needs to go / She finished working.', 'Підказка: She needs to go / She finished working.')], focusWords: ['needs to go', 'finished working'] }),
    step({ id: 'inf_ger_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.'), options: ['I want to improve, but I avoid making the same mistakes.', 'I want improving, but I avoid to make the same mistakes.', 'I want to improving, but I avoid make the same mistakes.', 'I want improve, but I avoid to making the same mistakes.'], correctAnswer: 'I want to improve, but I avoid making the same mistakes.', correctFeedback: tri('Да. Want требует to improve, avoid требует making.', 'Так. Want потребує to improve, avoid потребує making.'), wrong: { 'I want improving, but I avoid to make the same mistakes.': tri('Want improving неправильно. Avoid to make тоже неправильно. Нужно want to improve / avoid making.', 'Want improving неправильно. Avoid to make теж неправильно. Потрібно want to improve / avoid making.'), 'I want to improving, but I avoid make the same mistakes.': tri('После to нужен improve. После avoid нужен making.', 'Після to потрібен improve. Після avoid потрібен making.'), 'I want improve, but I avoid to making the same mistakes.': tri('После want нужен to. Avoid to making неправильно.', 'Після want потрібен to. Avoid to making неправильно.') }, retryFeedback: [tri('Want to improve. Avoid making.'), tri('I want to improve / I avoid making mistakes.'), tri('Подсказка: I want to improve, but I avoid making the same mistakes.', 'Підказка: I want to improve, but I avoid making the same mistakes.')], focusWords: ['want to improve', 'avoid making'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'want_gerund_error',
      'need_gerund_error',
      'decide_gerund_error',
      'plan_gerund_error',
      'enjoy_to_error',
      'finish_to_error',
      'avoid_to_error',
      'mind_to_error',
      'to_plus_ing_error',
      'gerund_pattern_confusion',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Показываем первый глагол и форму, которую он требует после себя.', 'Показуємо перше дієслово і форму, яку воно потребує після себе.'),
    depth2: tri('Делим глаголы на две группы: to do или doing.', 'Ділимо дієслова на дві групи: to do або doing.'),
    depth3: tri('Показываем готовые пары want to learn / enjoy learning.', 'Показуємо готові пари want to learn / enjoy learning.'),
    depth4: tri('Почти подсказка: прямо указываем нужную форму: to + base verb или verb-ing.', 'Майже підказка: прямо вказуємо потрібну форму: to + base verb або verb-ing.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        'Остановись. Первый глагол управляет вторым. Want/need/decide/plan/agree = to + base verb. Enjoy/finish/avoid/mind = verb-ing. После to не ставь -ing.',
        'Зупинись. Перше дієслово керує другим. Want/need/decide/plan/agree = to + base verb. Enjoy/finish/avoid/mind = verb-ing. Після to не став -ing.',
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_governing_verb_hint_then_retry',
      card: tri(
        'Подсказка по первому глаголу: система покажет, первый глагол относится к группе to do или doing, но не выберет ответ за пользователя.',
        'Підказка за першим дієсловом: система покаже, перше дієслово належить до групи to do чи doing, але не вибере відповідь за користувача.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        'Режим подсказки: сначала выбери первый глагол. Потом система спросит, он требует to do или doing.',
        'Режим підказки: спочатку обери перше дієслово. Потім система спитає, воно потребує to do чи doing.',
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_inf_ger_001', prompt: tri('Want обычно требует to do или doing?', 'Want зазвичай потребує to do чи doing?'), options: ['to do', 'doing'], correctIndex: 0, thenReturnToExerciseId: 'inf_ger_easy_001' },
      { id: 'guided_inf_ger_002', prompt: tri('Enjoy обычно требует to do или doing?', 'Enjoy зазвичай потребує to do чи doing?'), options: ['to do', 'doing'], correctIndex: 1, thenReturnToExerciseId: 'inf_ger_contrast_004' },
      { id: 'guided_inf_ger_003', prompt: tri('После infinitive to нужен learn или learning?', 'Після infinitive to потрібен learn чи learning?'), options: ['learn', 'learning'], correctIndex: 0, thenReturnToExerciseId: 'inf_ger_easy_001' },
      { id: 'guided_inf_ger_004', prompt: tri('Avoid обычно требует make или making?', 'Avoid зазвичай потребує make чи making?'), options: ['make', 'making'], correctIndex: 1, thenReturnToExerciseId: 'inf_ger_mixed_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'infinitive_vs_gerund_basic',
    diagnosisLabel: tri('To do / Doing', 'To do / Doing'),
    contrastSet: CONTRAST,
    focusWords: ['want to', 'need to', 'decide to', 'plan to', 'enjoy -ing', 'finish -ing', 'avoid -ing'],
    focusPatterns: [
      'want_to_learn',
      'need_to_go',
      'want_to_help',
      'decide_to_start',
      'plan_to_study',
      'agree_to_help',
      'enjoy_learning',
      'finish_working',
      'enjoy_reading',
      'avoid_making',
      'mind_waiting',
      'avoid_being_late',
      'mixed_want_enjoy_pair',
      'mixed_need_finish_pair',
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
    start: 'diagnosis_training_infinitive_vs_gerund_basic_start',
    answer: 'diagnosis_training_infinitive_vs_gerund_basic_answer',
    mastery: 'diagnosis_training_infinitive_vs_gerund_basic_mastery',
    fallback: 'diagnosis_training_infinitive_vs_gerund_basic_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: {
      category: 'verb',
      microDiagnosisId: 'infinitive_vs_gerund_basic',
      contrastSet: CONTRAST,
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logGoverningVerb: true,
      logRequiredVerbPattern: true,
      logChosenVerbForm: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=infinitive_vs_gerund_basic',
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


