import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = ['did + base verb', "didn't + base verb", 'past statement', 'past question', 'past negative', 'did vs do', 'base verb after did'];
const SMART_CONTRAST = ['did + base verb', "didn't + base verb", 'past statement', 'past question', 'past negative', 'did vs do'];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      "Сначала найди did/didn't. Если оно уже есть, прошлое уже показано, и следующий глагол должен быть base form.",
      "Спочатку знайди did/didn't. Якщо воно вже є, минуле вже показано, і наступне дієслово має бути base form.",
      "Find did/didn't. If it is present, the next verb must be base form.",
    ),
    depth2,
    depth3,
    depth4,
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Здесь ошибка в did/didn't или форме глагола после него. Нужная форма: ${correct}.`,
    `Тут помилка в did/didn't або формі дієслова після нього. Потрібна форма: ${correct}.`,
    `Use this Past Simple question/negative pattern: ${correct}.`,
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
      "В Past Simple questions/negatives прошлое несет did/didn't. Поэтому основной глагол возвращается в base form: Did you go? I didn't go.",
      "У Past Simple questions/negatives минуле несе did/didn't. Тому основне дієслово повертається в base form: Did you go? I didn't go.",
      "In Past Simple questions/negatives, did/didn't carries the past, so the main verb is base form.",
    ),
    microTask: tri(
      "Выбери форму с правильным did/didn't и base verb после него.",
      "Обери форму з правильним did/didn't і base verb після нього.",
      "Choose the correct did/didn't + base verb form.",
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
      "Скелет: Did + subject + base verb? Didn't + base verb. Did you go? I didn't go. Не Did you went и не didn't bought.",
      "Скелет: Did + subject + base verb? Didn't + base verb. Did you go? I didn't go. Не Did you went і не didn't bought.",
      "Did + subject + base verb? Didn't + base verb.",
    ),
    focusWords: input.focusWords,
  };
}

export const VERB_PAST_SIMPLE_NEGATIVE_QUESTION_TRAINING: DiagnosisTraining = {
  id: 'verb_past_simple_negative_question',
  category: 'verb',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 37,
  supportedLocales: ['ru', 'uk'],
  title: tri("Did / Didn't: вопросы и отрицания в прошлом", "Did / Didn't: питання і заперечення в минулому"),
  shortTitle: tri("Did / Didn't", "Did / Didn't"),
  shortDiagnosis: tri(
    "Ты путаешь Past Simple questions/negatives: после did/didn't ставишь past form вместо base form.",
    "Ти плутаєш Past Simple questions/negatives: після did/didn't ставиш past form замість base form.",
  ),
  diagnosisText: tri(
    "Ты путаешь Past Simple в вопросах и отрицаниях: ставишь went после did, забываешь did, используешь don't вместо didn't или оставляешь глагол в прошедшей форме после didn't. Главная логика простая: did/didn't уже показывает прошлое, поэтому основной глагол возвращается в base form.",
    "Ти плутаєш Past Simple у питаннях і запереченнях: ставиш went після did, забуваєш did, використовуєш don't замість didn't або залишаєш дієслово в минулій формі після didn't. Головна логіка проста: did/didn't уже показує минуле, тому основне дієслово повертається в base form.",
  ),
  mentalModel: tri(
    "В Past Simple утверждении прошлое сидит в глаголе: I went. В вопросе и отрицании прошлое переезжает в did/didn't: Did you go? I didn't go. Поэтому не Did you went и не I didn't went.",
    "У Past Simple ствердженні минуле сидить у дієслові: I went. У питанні й запереченні минуле переїжджає в did/didn't: Did you go? I didn't go. Тому не Did you went і не I didn't went.",
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    "Утверждение: I went home. Вопрос: Did you go home? Отрицание: I didn't go home. После did/didn't всегда base verb: go, call, buy, see, work.",
    "Ствердження: I went home. Питання: Did you go home? Заперечення: I didn't go home. Після did/didn't завжди base verb: go, call, buy, see, work.",
  ),
  whatUserMustLearn: {
    ru: [
      'В Past Simple question используется did + subject + base verb: Did you go?',
      'После did нельзя ставить past form: Did you went неправильно.',
      "В Past Simple negative используется didn't + base verb: I didn't go.",
      "После didn't нельзя ставить past form: I didn't went неправильно.",
      "Did/didn't одинаковы для всех subjects: Did I, did he, did they; didn't I, didn't she, didn't we.",
      'Do/does используются для настоящего, did используется для прошлого.',
      "Yesterday, last night, last week, ago часто требуют did/didn't в вопросах и отрицаниях.",
      'В question word questions порядок такой: What did you buy? Where did she go?',
      'Если глагол be, не используем did: Was he ready? Were they home?',
      'Если есть modal, не используем did: Could you help? Would you come?',
    ],
    uk: [
      'У Past Simple question використовується did + subject + base verb: Did you go?',
      'Після did не можна ставити past form: Did you went неправильно.',
      "У Past Simple negative використовується didn't + base verb: I didn't go.",
      "Після didn't не можна ставити past form: I didn't went неправильно.",
      "Did/didn't однакові для всіх subjects: Did I, did he, did they; didn't I, didn't she, didn't we.",
      'Do/does використовуються для теперішнього, did використовується для минулого.',
      "Yesterday, last night, last week, ago часто потребують did/didn't у питаннях і запереченнях.",
      'У question word questions порядок такий: What did you buy? Where did she go?',
      'Якщо дієслово be, не використовуємо did: Was he ready? Were they home?',
      'Якщо є modal, не використовуємо did: Could you help? Would you come?',
    ],
    es: [
      'Past Simple questions use did + subject + base verb.',
      'Do not use past form after did.',
      "Past Simple negatives use didn't + base verb.",
      "Do not use past form after didn't.",
      "Did/didn't are the same for all subjects.",
      'Do/does are present; did is past.',
      'Past time markers often need did in questions.',
      'Question word questions use question word + did + subject + base verb.',
      'Be uses was/were, not did.',
      'Modals do not use did.',
    ],
  },
  examples: [
    { en: 'Did you go home?', ru: 'Ты пошел домой?', uk: 'Ти пішов додому?', es: 'Did you go home?', why: tri('Did уже показывает прошлое, поэтому основной глагол base form: go.', 'Did уже показує минуле, тому основне дієслово base form: go.') },
    { en: "I didn't go home.", ru: 'Я не пошел домой.', uk: 'Я не пішов додому.', es: "I didn't go home.", why: tri("Didn't уже показывает отрицание в прошлом, поэтому после него go, не went.", "Didn't уже показує заперечення в минулому, тому після нього go, не went.") },
    { en: 'Did she call you?', ru: 'Она тебе позвонила?', uk: 'Вона тобі подзвонила?', es: 'Did she call you?', why: tri('В вопросе Past Simple: Did + she + call. Не called.', 'У Past Simple question: Did + she + call. Не called.') },
    { en: "She didn't call me.", ru: 'Она мне не позвонила.', uk: 'Вона мені не подзвонила.', es: "She didn't call me.", why: tri("После didn't нужен base verb call.", "Після didn't потрібен base verb call.") },
    { en: 'What did you buy?', ru: 'Что ты купил?', uk: 'Що ти купив?', es: 'What did you buy?', why: tri('Question word в начале, потом did + subject + base verb.', 'Question word на початку, потім did + subject + base verb.') },
    { en: 'Where did they live before?', ru: 'Где они жили раньше?', uk: 'Де вони жили раніше?', es: 'Where did they live before?', why: tri('Before указывает на прошлый период. В вопросе нужен did + live.', 'Before вказує на минулий період. У питанні потрібен did + live.') },
    { en: "He didn't see the message.", ru: 'Он не видел сообщение.', uk: 'Він не бачив повідомлення.', es: "He didn't see the message.", why: tri("See irregular в утверждении дает saw, но после didn't возвращается see.", "See irregular у ствердженні дає saw, але після didn't повертається see.") },
    { en: 'Did they work yesterday?', ru: 'Они работали вчера?', uk: 'Вони працювали вчора?', es: 'Did they work yesterday?', why: tri('Yesterday показывает прошлое. В вопросе используем did + work.', 'Yesterday показує минуле. У питанні використовуємо did + work.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri("Похоже, ты пытаешься показать прошлое два раза: Did you went? I didn't called. В английском так нельзя. Если уже есть did или didn't, основной глагол становится обычным.", "Схоже, ти намагаєшся показати минуле двічі: Did you went? I didn't called. В англійській так не можна. Якщо вже є did або didn't, основне дієслово стає звичайним.") },
    { id: 'intro_rule', type: 'rule', text: tri("Формула: Did + subject + base verb? Didn't + base verb. Did you go? I didn't go.", "Формула: Did + subject + base verb? Didn't + base verb. Did you go? I didn't go.") },
    { id: 'intro_warning', type: 'warning', text: tri("Главная ошибка: did + past form. Нельзя Did you went? Нельзя I didn't bought. Правильно: Did you go? I didn't buy.", "Головна помилка: did + past form. Не можна Did you went? Не можна I didn't bought. Правильно: Did you go? I didn't buy.") },
  ],
  steps: [
    step({ id: 'past_neg_q_easy_001', order: 1, difficulty: 'easy', targetSkill: 'did_you_go', sentence: '___ you go home yesterday?', translation: tri('Ты пошел домой вчера?', 'Ти пішов додому вчора?'), options: ['Did', 'Do', 'Does', 'Are'], correctAnswer: 'Did', correctFeedback: tri('Да. Yesterday показывает прошлое. В вопросе нужен did + go.', 'Так. Yesterday показує минуле. У питанні потрібен did + go.'), wrong: { Do: tri('Do используется для настоящего. Здесь yesterday, поэтому нужен Did.', 'Do використовується для теперішнього. Тут yesterday, тому потрібен Did.'), Does: tri('Does используется для he/she/it в настоящем. Здесь прошлое и you, поэтому Did.', 'Does використовується для he/she/it у теперішньому. Тут минуле і you, тому Did.'), Are: tri('Are не используется с обычным verb go. В прошлом вопросе нужен Did.', 'Are не використовується зі звичайним verb go. У минулому питанні потрібен Did.') }, retryFeedback: [tri('Yesterday + question = Did.'), tri('Did you go?'), tri('Подсказка: Did you go home yesterday?', 'Підказка: Did you go home yesterday?')], focusWords: ['did', 'go', 'yesterday'] }),
    step({ id: 'past_neg_q_easy_002', order: 2, difficulty: 'easy', targetSkill: 'did_she_call', sentence: '___ she call you last night?', translation: tri('Она звонила тебе вчера вечером?', 'Вона дзвонила тобі вчора ввечері?'), options: ['Did', 'Does', 'Do', 'Is'], correctAnswer: 'Did', correctFeedback: tri('Да. Last night показывает прошлое. В вопросе нужен Did she call.', 'Так. Last night показує минуле. У питанні потрібно Did she call.'), wrong: { Does: tri('Does используется для настоящего. Last night требует Did.', 'Does використовується для теперішнього. Last night потребує Did.'), Do: tri('Do не подходит к last night. Для прошлого нужен Did.', 'Do не підходить до last night. Для минулого потрібен Did.'), Is: tri('Is she call неправильно. С обычным verb call в прошлом вопросе нужен Did.', 'Is she call неправильно. Зі звичайним verb call у минулому питанні потрібен Did.') }, retryFeedback: [tri('Last night = Did.'), tri('Did she call you?'), tri('Подсказка: Did she call you last night?', 'Підказка: Did she call you last night?')], focusWords: ['did', 'call', 'last night'] }),
    step({ id: 'past_neg_q_easy_003', order: 3, difficulty: 'easy', targetSkill: 'did_they_work', sentence: '___ they work yesterday?', translation: tri('Они работали вчера?', 'Вони працювали вчора?'), options: ['Did', 'Do', 'Does', 'Were'], correctAnswer: 'Did', correctFeedback: tri('Да. Work - обычный verb. В вопросе прошлого времени нужен Did.', 'Так. Work - звичайний verb. У питанні минулого часу потрібен Did.'), wrong: { Do: tri('Do they work? - настоящее. Yesterday требует Did they work?', 'Do they work? - теперішній час. Yesterday потребує Did they work?'), Does: tri('Does не используется с they и не подходит к yesterday. Нужно Did.', 'Does не використовується з they і не підходить до yesterday. Потрібно Did.'), Were: tri('Were используется с be, но work здесь обычный verb. Нужно Did they work?', 'Were використовується з be, але work тут звичайний verb. Потрібно Did they work?') }, retryFeedback: [tri('Past question with work = Did they work?'), tri('Did they work?'), tri('Подсказка: Did they work yesterday?', 'Підказка: Did they work yesterday?')], focusWords: ['did', 'work', 'yesterday'] }),
    step({ id: 'past_neg_q_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'didnt_go', sentence: 'I ___ go home yesterday.', translation: tri('Я не пошел домой вчера.', 'Я не пішов додому вчора.'), options: ["didn't", "don't", "doesn't", "wasn't"], correctAnswer: "didn't", correctFeedback: tri("Да. Yesterday показывает прошлое. Отрицание Past Simple = didn't + go.", "Так. Yesterday показує минуле. Past Simple negative = didn't + go."), wrong: { "don't": tri("Don't используется для настоящего. С yesterday нужен didn't.", "Don't використовується для теперішнього. З yesterday потрібен didn't."), "doesn't": tri("Doesn't используется с he/she/it в настоящем. Здесь I и прошлое, поэтому didn't.", "Doesn't використовується з he/she/it у теперішньому. Тут I і минуле, тому didn't."), "wasn't": tri("Wasn't используется с be. Здесь обычный verb go, поэтому didn't go.", "Wasn't використовується з be. Тут звичайний verb go, тому didn't go.") }, retryFeedback: [tri("Yesterday + negative = didn't."), tri("I didn't go."), tri("Подсказка: I didn't go home yesterday.", "Підказка: I didn't go home yesterday.")], focusWords: ["didn't", 'go', 'yesterday'] }),
    step({ id: 'past_neg_q_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'didnt_call', sentence: "She didn't ___ me.", translation: tri('Она мне не позвонила.', 'Вона мені не подзвонила.'), options: ['call', 'called', 'calls', 'calling'], correctAnswer: 'call', correctFeedback: tri("Да. После didn't нужен base verb: call.", "Так. Після didn't потрібен base verb: call."), wrong: { called: tri("Didn't уже показывает прошлое. Нельзя didn't called. Нужно didn't call.", "Didn't уже показує минуле. Не можна didn't called. Потрібно didn't call."), calls: tri("После didn't не используется calls. Нужен base verb call.", "Після didn't не використовується calls. Потрібен base verb call."), calling: tri("После didn't не нужна -ing форма. Нужно didn't call.", "Після didn't не потрібна -ing форма. Потрібно didn't call.") }, retryFeedback: [tri("Didn't + base verb."), tri("Didn't call."), tri("Подсказка: She didn't call me.", "Підказка: She didn't call me.")], focusWords: ["didn't", 'call'] }),
    step({ id: 'past_neg_q_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'didnt_work', sentence: "They didn't ___ last week.", translation: tri('Они не работали на прошлой неделе.', 'Вони не працювали минулого тижня.'), options: ['work', 'worked', 'works', 'working'], correctAnswer: 'work', correctFeedback: tri("Да. После didn't нужен base verb: work.", "Так. Після didn't потрібен base verb: work."), wrong: { worked: tri("Didn't worked неправильно. Didn't уже показывает прошлое, поэтому work.", "Didn't worked неправильно. Didn't уже показує минуле, тому work."), works: tri("После didn't не ставим works. Нужен base verb work.", "Після didn't не ставимо works. Потрібен base verb work."), working: tri("Didn't working неправильно. Нужна форма didn't work.", "Didn't working неправильно. Потрібна форма didn't work.") }, retryFeedback: [tri("Didn't + work."), tri("They didn't work."), tri("Подсказка: They didn't work last week.", "Підказка: They didn't work last week.")], focusWords: ["didn't", 'work', 'last week'] }),
    step({ id: 'past_neg_q_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'did_go_not_went', sentence: 'Choose the correct question.', translation: tri('Ты ходил в магазин?', 'Ти ходив до магазину?'), options: ['Did you go to the shop?', 'Did you went to the shop?', 'You went to the shop?', 'Do you went to the shop?'], correctAnswer: 'Did you go to the shop?', correctFeedback: tri('Да. После did нужен go, не went.', 'Так. Після did потрібен go, не went.'), wrong: { 'Did you went to the shop?': tri('Did you went неправильно. Did уже показывает прошлое, поэтому go.', 'Did you went неправильно. Did уже показує минуле, тому go.'), 'You went to the shop?': tri('Это порядок утверждения. Базовый вопрос: Did you go to the shop?', 'Це порядок ствердження. Базове питання: Did you go to the shop?'), 'Do you went to the shop?': tri('Do не подходит к прошлому, и went после do/did не нужен. Правильно: Did you go?', 'Do не підходить до минулого, і went після do/did не потрібен. Правильно: Did you go?') }, retryFeedback: [tri('Did + go. Не did + went.'), tri('Did you go?'), tri('Подсказка: Did you go to the shop?', 'Підказка: Did you go to the shop?')], focusWords: ['did', 'go', 'went'] }),
    step({ id: 'past_neg_q_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'did_see_not_saw', sentence: '___ you see the message?', translation: tri('Ты видел сообщение?', 'Ти бачив повідомлення?'), options: ['Did', 'Do', 'Saw', 'Were'], correctAnswer: 'Did', correctFeedback: tri('Да. Вопрос в прошлом с обычным verb see строится через Did you see?', 'Так. Питання в минулому зі звичайним verb see будується через Did you see?'), wrong: { Do: tri('Do you see? - настоящее. Для “видел?” нужен Did you see?', 'Do you see? - теперішній час. Для “бачив?” потрібно Did you see?'), Saw: tri('Saw you see не строит нужный вопрос. Нужен Did you see?', 'Saw you see не будує потрібне питання. Потрібно Did you see?'), Were: tri('Were используется с be, но see - обычный verb. Нужен Did.', 'Were використовується з be, але see - звичайний verb. Потрібен Did.') }, retryFeedback: [tri('Past question with see = Did you see?'), tri('Did you see?'), tri('Подсказка: Did you see the message?', 'Підказка: Did you see the message?')], focusWords: ['did', 'see'] }),
    step({ id: 'past_neg_q_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'didnt_buy_not_bought', sentence: "I didn't ___ anything.", translation: tri('Я ничего не купил.', 'Я нічого не купив.'), options: ['buy', 'bought', 'buys', 'buying'], correctAnswer: 'buy', correctFeedback: tri("Да. После didn't нужен base verb buy.", "Так. Після didn't потрібен base verb buy."), wrong: { bought: tri("Didn't bought неправильно. Didn't уже показывает прошлое, поэтому buy.", "Didn't bought неправильно. Didn't уже показує минуле, тому buy."), buys: tri("После didn't не ставим buys. Нужен base verb buy.", "Після didn't не ставимо buys. Потрібен base verb buy."), buying: tri("Didn't buying неправильно. Нужно didn't buy.", "Didn't buying неправильно. Потрібно didn't buy.") }, retryFeedback: [tri("Didn't + buy."), tri("I didn't buy anything."), tri("Подсказка: I didn't buy anything.", "Підказка: I didn't buy anything.")], focusWords: ["didn't", 'buy', 'bought'] }),
    step({ id: 'past_neg_q_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'what_did_you_buy', sentence: '___ did you buy?', translation: tri('Что ты купил?', 'Що ти купив?'), options: ['What', 'Where', 'When', 'Why'], correctAnswer: 'What', correctFeedback: tri('Да. Спрашиваем “что?”, поэтому What did you buy?', 'Так. Питаємо “що?”, тому What did you buy?'), wrong: { Where: tri('Where спрашивает где/куда. Здесь нужен вопрос “что?”: What did you buy?', 'Where питає де/куди. Тут потрібне питання “що?”: What did you buy?'), When: tri('When спрашивает когда. Здесь нужен What.', 'When питає коли. Тут потрібне What.'), Why: tri('Why спрашивает почему. Здесь нужен What.', 'Why питає чому. Тут потрібне What.') }, retryFeedback: [tri('Что = What.', 'Що = What.'), tri('What did you buy?'), tri('Подсказка: What did you buy?', 'Підказка: What did you buy?')], focusWords: ['what did', 'buy'] }),
    step({ id: 'past_neg_q_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'where_did_she_go', sentence: 'Where did she ___?', translation: tri('Куда она пошла?', 'Куди вона пішла?'), options: ['go', 'went', 'goes', 'going'], correctAnswer: 'go', correctFeedback: tri('Да. После did нужен base verb: go.', 'Так. Після did потрібен base verb: go.'), wrong: { went: tri('Where did she went неправильно. Did уже показывает прошлое, поэтому go.', 'Where did she went неправильно. Did уже показує минуле, тому go.'), goes: tri('После did не ставим goes. Нужен go.', 'Після did не ставимо goes. Потрібен go.'), going: tri('После did не нужна -ing форма. Нужно go.', 'Після did не потрібна -ing форма. Потрібно go.') }, retryFeedback: [tri('Did + go.'), tri('Where did she go?'), tri('Подсказка: Where did she go?', 'Підказка: Where did she go?')], focusWords: ['where did', 'go'] }),
    step({ id: 'past_neg_q_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'why_didnt_you_call', sentence: "Why didn't you ___ me?", translation: tri('Почему ты мне не позвонил?', 'Чому ти мені не подзвонив?'), options: ['call', 'called', 'calls', 'calling'], correctAnswer: 'call', correctFeedback: tri("Да. После didn't нужен base verb call.", "Так. Після didn't потрібен base verb call."), wrong: { called: tri("Why didn't you called неправильно. Нужно didn't you call.", "Why didn't you called неправильно. Потрібно didn't you call."), calls: tri("После didn't не ставим calls. Нужен call.", "Після didn't не ставимо calls. Потрібен call."), calling: tri("Didn't you calling неправильно. Нужно didn't you call.", "Didn't you calling неправильно. Потрібно didn't you call.") }, retryFeedback: [tri("Didn't + call."), tri("Why didn't you call me?"), tri("Подсказка: Why didn't you call me?", "Підказка: Why didn't you call me?")], focusWords: ["why didn't", 'call'] }),
    step({ id: 'past_neg_q_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_statement_question_negative', sentence: 'Choose the correct set.', translation: tri('Я пошел / Ты пошел? / Я не пошел', 'Я пішов / Ти пішов? / Я не пішов'), options: ["I went / Did you go? / I didn't go", "I went / Did you went? / I didn't went", "I go / Did you go? / I don't went", "I did went / You went? / I didn't went"], correctAnswer: "I went / Did you go? / I didn't go", correctFeedback: tri("Да. В утверждении went, но после did/didn't форма go.", "Так. У ствердженні went, але після did/didn't форма go."), wrong: { "I went / Did you went? / I didn't went": tri("После did/didn't нельзя went. Нужно go.", "Після did/didn't не можна went. Потрібно go."), "I go / Did you go? / I don't went": tri("I go - не Past Simple. Don't went неправильно. Нужно I went / I didn't go.", "I go - не Past Simple. Don't went неправильно. Потрібно I went / I didn't go."), "I did went / You went? / I didn't went": tri("Did went и didn't went неправильны. You went? - порядок утверждения, не базовый вопрос.", "Did went і didn't went неправильні. You went? - порядок ствердження, не базове питання.") }, retryFeedback: [tri("Statement: went. Question/negative: did go / didn't go."), tri("Went / Did go / didn't go."), tri("Подсказка: I went / Did you go? / I didn't go.", "Підказка: I went / Did you go? / I didn't go.")], focusWords: ['went', 'did go', "didn't go"] }),
    step({ id: 'past_neg_q_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_regular_verb', sentence: 'Choose the correct set.', translation: tri('Она позвонила / Она позвонила? / Она не позвонила', 'Вона подзвонила / Вона подзвонила? / Вона не подзвонила'), options: ["She called / Did she call? / She didn't call", "She called / Did she called? / She didn't called", "She calls / Does she called? / She doesn't called", "She did called / She called? / She didn't called"], correctAnswer: "She called / Did she call? / She didn't call", correctFeedback: tri("Да. В утверждении called, но после did/didn't нужен call.", "Так. У ствердженні called, але після did/didn't потрібен call."), wrong: { "She called / Did she called? / She didn't called": tri("После did/didn't нельзя called. Нужно call.", "Після did/didn't не можна called. Потрібно call."), "She calls / Does she called? / She doesn't called": tri("Calls/does/doesn't относятся к настоящему, а called после does/doesn't неправильно.", "Calls/does/doesn't належать до теперішнього, а called після does/doesn't неправильно."), "She did called / She called? / She didn't called": tri("Did called и didn't called неправильны. Для базового вопроса нужен Did she call?", "Did called і didn't called неправильні. Для базового питання потрібно Did she call?") }, retryFeedback: [tri("Called / Did call / didn't call."), tri("She called / Did she call? / She didn't call."), tri("Подсказка: She called / Did she call? / She didn't call.", "Підказка: She called / Did she call? / She didn't call.")], focusWords: ['called', 'did call', "didn't call"] }),
    step({ id: 'past_neg_q_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Я не купил телефон, но ты купил его?', 'Я не купив телефон, але ти купив його?'), options: ["I didn't buy the phone, but did you buy it?", "I didn't bought the phone, but did you bought it?", "I don't bought the phone, but do you bought it?", "I didn't buy the phone, but you bought it?"], correctAnswer: "I didn't buy the phone, but did you buy it?", correctFeedback: tri("Да. После didn't и did нужен base verb buy.", "Так. Після didn't і did потрібен base verb buy."), wrong: { "I didn't bought the phone, but did you bought it?": tri("Bought после didn't/did неправильно. Нужно buy.", "Bought після didn't/did неправильно. Потрібно buy."), "I don't bought the phone, but do you bought it?": tri("Don't/do не подходят к прошлому bought. Нужно didn't/did + buy.", "Don't/do не підходять до минулого bought. Потрібно didn't/did + buy."), "I didn't buy the phone, but you bought it?": tri('Первая часть правильная. Во второй части базовый вопрос требует did: did you buy it?', 'Перша частина правильна. У другій частині базове питання потребує did: did you buy it?') }, retryFeedback: [tri("Didn't buy / did you buy."), tri("I didn't buy / did you buy?"), tri("Подсказка: I didn't buy the phone, but did you buy it?", "Підказка: I didn't buy the phone, but did you buy it?")], focusWords: ["didn't buy", 'did buy'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'did_plus_past_error',
      'didnt_plus_past_error',
      'missing_did_question_error',
      'do_instead_of_did_error',
      'does_instead_of_did_error',
      'question_word_no_did_error',
      'did_with_be_error',
      'double_past_error',
      'base_after_did_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri("Обычное объяснение: показываем did/didn't и возвращаем основной глагол в base form.", "Звичайне пояснення: показуємо did/didn't і повертаємо основне дієслово в base form."),
    depth2: tri("Проще: спрашиваем, прошлое уже показано словом did/didn't или еще нет.", "Простіше: питаємо, минуле вже показано словом did/didn't чи ще ні."),
    depth3: tri("Еще проще: показываем пары went → Did you go? / didn't go.", "Ще простіше: показуємо пари went → Did you go? / didn't go."),
    depth4: tri("Почти подсказка: прямо указываем нужную форму после did/didn't.", "Майже підказка: прямо вказуємо потрібну форму після did/didn't."),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        "Остановись. Did/didn't уже несут прошлое. После них основной глагол всегда обычный: did go, didn't go, did buy, didn't buy, did see, didn't see. Не did went, не didn't bought.",
        "Зупинись. Did/didn't уже несуть минуле. Після них основне дієслово завжди звичайне: did go, didn't go, did buy, didn't buy, did see, didn't see. Не did went, не didn't bought.",
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_auxiliary_base_hint_then_retry',
      card: tri(
        "Подсказка по форме: система покажет did/didn't и напомнит, что следующий глагол должен быть base form, но не выберет ответ за пользователя.",
        "Підказка за формою: система покаже did/didn't і нагадає, що наступне дієслово має бути base form, але не вибере відповідь за користувача.",
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        "Режим подсказки: сначала выбери, это утверждение, вопрос или отрицание. Потом система спросит, где находится Past Simple marker: в основном глаголе или в did/didn't.",
        "Режим підказки: спочатку обери, це ствердження, питання чи заперечення. Потім система спитає, де знаходиться Past Simple marker: в основному дієслові чи в did/didn't.",
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_past_neg_q_001', prompt: tri('После did нужен go или went?', 'Після did потрібен go чи went?'), options: ['go', 'went'], correctIndex: 0, thenReturnToExerciseId: 'past_neg_q_contrast_004' },
      { id: 'guided_past_neg_q_002', prompt: tri("После didn't нужен bought или buy?", "Після didn't потрібен bought чи buy?"), options: ['bought', 'buy'], correctIndex: 1, thenReturnToExerciseId: 'past_neg_q_contrast_006' },
      { id: 'guided_past_neg_q_003', prompt: tri('Yesterday в вопросе требует do или did?', 'Yesterday у питанні потребує do чи did?'), options: ['do', 'did'], correctIndex: 1, thenReturnToExerciseId: 'past_neg_q_easy_001' },
      { id: 'guided_past_neg_q_004', prompt: tri("В I didn't go прошлое показано в didn't или в go?", "У I didn't go минуле показано в didn't чи в go?"), options: ["в didn't", 'в go'], correctIndex: 0, thenReturnToExerciseId: 'past_neg_q_contrast_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'verb_past_simple_negative_question',
    diagnosisLabel: tri("Past Simple: Did / Didn't", "Past Simple: Did / Didn't"),
    contrastSet: SMART_CONTRAST,
    focusWords: ['did go', "didn't go", 'did call', "didn't call", 'did buy', "didn't buy"],
    focusPatterns: [
      'did_you_go',
      'did_she_call',
      'did_they_work',
      'didnt_go',
      'didnt_call',
      'didnt_work',
      'did_go_not_went',
      'did_see_not_saw',
      'didnt_buy_not_bought',
      'what_did_you_buy',
      'where_did_she_go',
      'why_didnt_you_call',
      'mixed_statement_question_negative',
      'mixed_regular_verb',
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
    start: 'diagnosis_training_verb_past_simple_negative_question_start',
    answer: 'diagnosis_training_verb_past_simple_negative_question_answer',
    mastery: 'diagnosis_training_verb_past_simple_negative_question_mastery',
    fallback: 'diagnosis_training_verb_past_simple_negative_question_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: {
      category: 'verb',
      microDiagnosisId: 'verb_past_simple_negative_question',
      contrastSet: ['did + base verb', "didn't + base verb", 'past statement', 'past question', 'past negative'],
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logAuxiliary: true,
      logVerbFormAfterDid: true,
      logSentencePolarity: true,
      logTimeMarker: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=verb_past_simple_negative_question',
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


