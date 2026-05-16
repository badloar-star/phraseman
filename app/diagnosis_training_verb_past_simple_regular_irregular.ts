import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = ['regular + ed', 'irregular past', 'y -> ied', 'double consonant + ed', 'past time marker', 'present simple'];

function retry(line: string): [TriText, TriText, TriText, TriText] {
  return [
    tri(line),
    tri(
      'Сначала найди маркер прошлого: yesterday, last night, ago, before.',
      'Спочатку знайди маркер минулого: yesterday, last night, ago, before.',
    ),
    tri(
      'Потом реши: regular verb получает -ed, irregular verb получает отдельную past form.',
      'Потім виріши: regular verb отримує -ed, irregular verb отримує окрему past form.',
    ),
    tri(
      'Подсказка: в обычном утверждении Past Simple нужен один past form, например worked или went.',
      'Підказка: у звичайному ствердженні Past Simple потрібен один past form, наприклад worked або went.',
    ),
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Не эта форма. Для завершенного действия в прошлом нужно ${correct}.`,
    `Не ця форма. Для завершеної дії в минулому потрібно ${correct}.`,
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
      'Past Simple показывает завершенное действие в прошлом. Regular verbs обычно получают -ed, а irregular verbs меняют форму отдельно.',
      'Past Simple показує завершену дію в минулому. Regular verbs зазвичай отримують -ed, а irregular verbs змінюють форму окремо.',
    ),
    microTask: tri(
      'Выбери past form: regular + -ed или irregular past.',
      'Обери past form: regular + -ed або irregular past.',
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
      'Если есть yesterday, last night, ago, before или смысл “сделал/случилось”, не оставляй present form. Нужен Past Simple: worked, opened, went, saw, bought.',
      'Якщо є yesterday, last night, ago, before або сенс “зробив/сталося”, не залишай present form. Потрібен Past Simple: worked, opened, went, saw, bought.',
    ),
    focusWords: input.focusWords,
  };
}

export const VERB_PAST_SIMPLE_REGULAR_IRREGULAR_TRAINING: DiagnosisTraining = {
  id: 'verb_past_simple_regular_irregular',
  category: 'verb',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 25,
  supportedLocales: ['ru', 'uk'],
  title: tri('Past Simple: было, сделал, случилось', 'Past Simple: було, зробив, сталося'),
  shortTitle: tri('Past Simple', 'Past Simple'),
  shortDiagnosis: tri(
    'Ты путаешь regular -ed, irregular past form и present form в прошлом.',
    'Ти плутаєш regular -ed, irregular past form і present form у минулому.',
  ),
  diagnosisText: tri(
    'Ты путаешь Past Simple: где нужен -ed, где неправильная форма, а где нельзя оставлять глагол в настоящем времени.',
    'Ти плутаєш Past Simple: де потрібен -ed, де неправильна форма, а де не можна залишати дієслово в теперішньому часі.',
  ),
  mentalModel: tri(
    'Past Simple = действие завершилось в прошлом. Regular verbs получают -ed: work -> worked. Irregular verbs меняют форму отдельно: go -> went, see -> saw, buy -> bought.',
    'Past Simple = дія завершилася в минулому. Regular verbs отримують -ed: work -> worked. Irregular verbs змінюють форму окремо: go -> went, see -> saw, buy -> bought.',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'В утверждении Past Simple основной глагол сразу стоит в past form: I worked yesterday. She opened the door. They went home. He saw me.',
    'У ствердженні Past Simple основне дієслово одразу стоїть у past form: I worked yesterday. She opened the door. They went home. He saw me.',
  ),
  whatUserMustLearn: {
    ru: [
      'Past Simple используется для завершенного действия в прошлом: yesterday, last week, two days ago, in 2020.',
      'Regular verbs обычно получают -ed: work -> worked, open -> opened, call -> called.',
      'Если глагол заканчивается на e, добавляем только -d: live -> lived.',
      'Если глагол заканчивается на consonant + y, y меняется на ied: study -> studied.',
      'Некоторые короткие глаголы удваивают последнюю согласную: stop -> stopped.',
      'Irregular verbs нужно знать отдельно: go -> went, see -> saw, buy -> bought, come -> came.',
      'В обычном утверждении Past Simple не нужен did перед past form: I went, не I did went.',
      'Нельзя оставлять present form с маркером прошлого: yesterday I go -> yesterday I went.',
      'Past Simple не меняется по subject: I worked, he worked, they worked.',
      'Отрицания и вопросы с did + base verb будут отдельной темой.',
    ],
    uk: [
      'Past Simple використовується для завершеної дії в минулому: yesterday, last week, two days ago, in 2020.',
      'Regular verbs зазвичай отримують -ed: work -> worked, open -> opened, call -> called.',
      'Якщо дієслово закінчується на e, додаємо тільки -d: live -> lived.',
      'Якщо дієслово закінчується на consonant + y, y змінюється на ied: study -> studied.',
      'Деякі короткі дієслова подвоюють останню приголосну: stop -> stopped.',
      'Irregular verbs потрібно знати окремо: go -> went, see -> saw, buy -> bought, come -> came.',
      'У звичайному ствердженні Past Simple не потрібен did перед past form: I went, не I did went.',
      'Не можна залишати present form з маркером минулого: yesterday I go -> yesterday I went.',
      'Past Simple не змінюється за subject: I worked, he worked, they worked.',
      'Заперечення і питання з did + base verb будуть окремою темою.',
    ],
    es: [
      'Past Simple = completed past action.',
      'Regular verbs take -ed.',
      'Irregular verbs have special past forms.',
      'Do not leave present form with yesterday.',
      'Do not use did + past form in a normal statement.',
      'Work -> worked.',
      'Go -> went.',
      'Study -> studied.',
      'Stop -> stopped.',
      'Past Simple does not change by subject.',
    ],
  },
  examples: [
    { en: 'I worked yesterday.', ru: 'Я работал вчера.', uk: 'Я працював учора.', es: 'I worked yesterday.', why: tri('Yesterday показывает прошлое. Work regular, поэтому worked.', 'Yesterday показує минуле. Work regular, тому worked.') },
    { en: 'She opened the door.', ru: 'Она открыла дверь.', uk: 'Вона відчинила двері.', es: 'She opened the door.', why: tri('Open regular verb. В Past Simple добавляем -ed: opened.', 'Open regular verb. У Past Simple додаємо -ed: opened.') },
    { en: 'They went home.', ru: 'Они пошли домой.', uk: 'Вони пішли додому.', es: 'They went home.', why: tri('Go irregular. Past form не goed, а went.', 'Go irregular. Past form не goed, а went.') },
    { en: 'He saw me at work.', ru: 'Он видел меня на работе.', uk: 'Він бачив мене на роботі.', es: 'He saw me at work.', why: tri('See irregular. Past form: saw.', 'See irregular. Past form: saw.') },
    { en: 'We studied English last night.', ru: 'Мы учили английский вчера вечером.', uk: 'Ми вчили англійську вчора ввечері.', es: 'We studied English last night.', why: tri('Study заканчивается на consonant + y. Y меняется на ied: studied.', 'Study закінчується на consonant + y. Y змінюється на ied: studied.') },
    { en: 'The bus stopped suddenly.', ru: 'Автобус внезапно остановился.', uk: 'Автобус раптово зупинився.', es: 'The bus stopped suddenly.', why: tri('Stop короткий regular verb. Последняя p удваивается: stopped.', 'Stop короткий regular verb. Остання p подвоюється: stopped.') },
    { en: 'I bought a new phone.', ru: 'Я купил новый телефон.', uk: 'Я купив новий телефон.', es: 'I bought a new phone.', why: tri('Buy irregular. Past form: bought.', 'Buy irregular. Past form: bought.') },
    { en: 'She came home late.', ru: 'Она пришла домой поздно.', uk: 'Вона прийшла додому пізно.', es: 'She came home late.', why: tri('Come irregular. Past form: came.', 'Come irregular. Past form: came.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты иногда говоришь о прошлом, но оставляешь глагол в настоящей форме. В английском прошлое действие должно быть видно в самом глаголе: worked, went, saw, bought.', 'Схоже, ти іноді говориш про минуле, але залишаєш дієслово в теперішній формі. В англійській минула дія має бути видно в самому дієслові: worked, went, saw, bought.') },
    { id: 'intro_rule', type: 'rule', text: tri('Если действие закончилось в прошлом, глагол уходит в past form: regular + -ed, irregular - отдельная форма.', 'Якщо дія завершилася в минулому, дієслово переходить у past form: regular + -ed, irregular - окрема форма.') },
    { id: 'intro_warning', type: 'warning', text: tri('Не говори yesterday I go или yesterday I work. Нужно yesterday I went и yesterday I worked.', 'Не говори yesterday I go або yesterday I work. Потрібно yesterday I went і yesterday I worked.') },
  ],
  steps: [
    step({ id: 'past_simple_easy_001', order: 1, difficulty: 'easy', targetSkill: 'regular_ed_worked', sentence: 'I ___ yesterday.', translation: tri('Я работал вчера.', 'Я працював учора.'), options: ['work', 'worked', 'works', 'am working'], correctAnswer: 'worked', correctFeedback: tri('Да. Yesterday показывает прошлое. Work regular, поэтому worked.', 'Так. Yesterday показує минуле. Work regular, тому worked.'), wrong: { work: tri('Work - present/base form. С yesterday нужен Past Simple: worked.', 'Work - present/base form. З yesterday потрібен Past Simple: worked.'), works: tri('Works - Present Simple с he/she/it. Здесь I и прошлое, поэтому worked.', 'Works - Present Simple з he/she/it. Тут I і минуле, тому worked.'), 'am working': tri('Am working описывает процесс сейчас. Yesterday требует Past Simple: worked.', 'Am working описує процес зараз. Yesterday потребує Past Simple: worked.') }, retryLine: 'Yesterday = прошлое. Work -> worked.', focusWords: ['yesterday', 'worked'] }),
    step({ id: 'past_simple_easy_002', order: 2, difficulty: 'easy', targetSkill: 'regular_ed_opened', sentence: 'She ___ the door.', translation: tri('Она открыла дверь.', 'Вона відчинила двері.'), options: ['open', 'opened', 'opens', 'is opening'], correctAnswer: 'opened', correctFeedback: tri('Да. Это завершенное действие в прошлом. Open regular, поэтому opened.', 'Так. Це завершена дія в минулому. Open regular, тому opened.'), wrong: { open: tri('Open - base form. Для прошлого действия нужна форма opened.', 'Open - base form. Для минулої дії потрібна форма opened.'), opens: tri('Opens - Present Simple. Здесь смысл “открыла”, поэтому opened.', 'Opens - Present Simple. Тут сенс “відчинила”, тому opened.'), 'is opening': tri('Is opening значит “открывает сейчас”. Здесь завершенное прошлое действие: opened.', 'Is opening означає “відчиняє зараз”. Тут завершена минула дія: opened.') }, retryLine: 'Open в прошлом = opened.', focusWords: ['opened'] }),
    step({ id: 'past_simple_easy_003', order: 3, difficulty: 'easy', targetSkill: 'regular_ed_called', sentence: 'They ___ me last night.', translation: tri('Они позвонили мне вчера вечером.', 'Вони подзвонили мені вчора ввечері.'), options: ['call', 'called', 'calls', 'are calling'], correctAnswer: 'called', correctFeedback: tri('Да. Last night показывает прошлое. Call regular, поэтому called.', 'Так. Last night показує минуле. Call regular, тому called.'), wrong: { call: tri('Call - base form. Last night требует Past Simple: called.', 'Call - base form. Last night потребує Past Simple: called.'), calls: tri('Calls не подходит с they и не подходит к last night. Нужно called.', 'Calls не підходить з they і не підходить до last night. Потрібно called.'), 'are calling': tri('Are calling описывает процесс сейчас. Last night требует called.', 'Are calling описує процес зараз. Last night потребує called.') }, retryLine: 'Last night = прошлое. Call -> called.', focusWords: ['last night', 'called'] }),
    step({ id: 'past_simple_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'irregular_go_went', sentence: 'They ___ home after work.', translation: tri('Они пошли домой после работы.', 'Вони пішли додому після роботи.'), options: ['go', 'goed', 'went', 'goes'], correctAnswer: 'went', correctFeedback: tri('Да. Go irregular. Past form: went.', 'Так. Go irregular. Past form: went.'), wrong: { go: tri('Go - base form. Для прошлого действия нужна past form: went.', 'Go - base form. Для минулої дії потрібна past form: went.'), goed: tri('Goed неправильно. Go irregular, поэтому went.', 'Goed неправильно. Go irregular, тому went.'), goes: tri('Goes - Present Simple с he/she/it. Здесь they и прошлое, поэтому went.', 'Goes - Present Simple з he/she/it. Тут they і минуле, тому went.') }, retryLine: 'Go в прошлом = went.', focusWords: ['went'] }),
    step({ id: 'past_simple_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'irregular_see_saw', sentence: 'He ___ me at work.', translation: tri('Он видел меня на работе.', 'Він бачив мене на роботі.'), options: ['see', 'seed', 'saw', 'sees'], correctAnswer: 'saw', correctFeedback: tri('Да. See irregular. Past form: saw.', 'Так. See irregular. Past form: saw.'), wrong: { see: tri('See - base form. Для прошлого действия нужна форма saw.', 'See - base form. Для минулої дії потрібна форма saw.'), seed: tri('Seed неправильно для past от see. Правильно saw.', 'Seed неправильно для past від see. Правильно saw.'), sees: tri('Sees - Present Simple. Здесь нужен Past Simple: saw.', 'Sees - Present Simple. Тут потрібен Past Simple: saw.') }, retryLine: 'See в прошлом = saw.', focusWords: ['saw'] }),
    step({ id: 'past_simple_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'irregular_buy_bought', sentence: 'I ___ a new phone.', translation: tri('Я купил новый телефон.', 'Я купив новий телефон.'), options: ['buy', 'buyed', 'bought', 'buys'], correctAnswer: 'bought', correctFeedback: tri('Да. Buy irregular. Past form: bought.', 'Так. Buy irregular. Past form: bought.'), wrong: { buy: tri('Buy - base form. Для прошлого действия нужна форма bought.', 'Buy - base form. Для минулої дії потрібна форма bought.'), buyed: tri('Buyed неправильно. Buy irregular, поэтому bought.', 'Buyed неправильно. Buy irregular, тому bought.'), buys: tri('Buys - Present Simple с he/she/it. Здесь I и прошлое, поэтому bought.', 'Buys - Present Simple з he/she/it. Тут I і минуле, тому bought.') }, retryLine: 'Buy в прошлом = bought.', focusWords: ['bought'] }),
    step({ id: 'past_simple_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'e_plus_d_lived', sentence: 'We ___ in Cork before.', translation: tri('Мы раньше жили в Корке.', 'Ми раніше жили в Корку.'), options: ['live', 'lived', 'liveed', 'living'], correctAnswer: 'lived', correctFeedback: tri('Да. Live уже заканчивается на e, поэтому добавляем только -d: lived.', 'Так. Live вже закінчується на e, тому додаємо тільки -d: lived.'), wrong: { live: tri('Live - present/base form. Before здесь указывает на прошлое, поэтому lived.', 'Live - present/base form. Before тут вказує на минуле, тому lived.'), liveed: tri('Liveed неправильно. Если глагол заканчивается на e, добавляем только -d: lived.', 'Liveed неправильно. Якщо дієслово закінчується на e, додаємо тільки -d: lived.'), living: tri('Living не выражает Past Simple. Нужна форма lived.', 'Living не виражає Past Simple. Потрібна форма lived.') }, retryLine: 'Live + d = lived.', focusWords: ['lived', 'before'] }),
    step({ id: 'past_simple_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'y_to_ied_studied', sentence: 'We ___ English last night.', translation: tri('Мы учили английский вчера вечером.', 'Ми вчили англійську вчора ввечері.'), options: ['study', 'studied', 'studyed', 'studying'], correctAnswer: 'studied', correctFeedback: tri('Да. Study заканчивается на consonant + y. Y меняется на ied: studied.', 'Так. Study закінчується на consonant + y. Y змінюється на ied: studied.'), wrong: { study: tri('Study - base form. Last night требует Past Simple: studied.', 'Study - base form. Last night потребує Past Simple: studied.'), studyed: tri('Studyed неправильно. Y меняется на ied: studied.', 'Studyed неправильно. Y змінюється на ied: studied.'), studying: tri('Studying не подходит для Past Simple. Нужна форма studied.', 'Studying не підходить для Past Simple. Потрібна форма studied.') }, retryLine: 'Study -> studied.', focusWords: ['studied', 'last night'] }),
    step({ id: 'past_simple_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'double_consonant_stopped', sentence: 'The bus ___ suddenly.', translation: tri('Автобус внезапно остановился.', 'Автобус раптово зупинився.'), options: ['stop', 'stoped', 'stopped', 'stops'], correctAnswer: 'stopped', correctFeedback: tri('Да. Stop в Past Simple получает double p: stopped.', 'Так. Stop у Past Simple отримує double p: stopped.'), wrong: { stop: tri('Stop - base form. Для прошлого действия нужна форма stopped.', 'Stop - base form. Для минулої дії потрібна форма stopped.'), stoped: tri('Stoped неправильно. В этой форме p удваивается: stopped.', 'Stoped неправильно. У цій формі p подвоюється: stopped.'), stops: tri('Stops - Present Simple. Здесь прошлое действие, поэтому stopped.', 'Stops - Present Simple. Тут минула дія, тому stopped.') }, retryLine: 'Stop -> stopped.', focusWords: ['stopped'] }),
    step({ id: 'past_simple_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'no_present_with_yesterday', sentence: 'Yesterday, I ___ to the shop.', translation: tri('Вчера я пошел в магазин.', 'Учора я пішов до магазину.'), options: ['go', 'went', 'goes', 'am going'], correctAnswer: 'went', correctFeedback: tri('Да. Yesterday требует Past Simple. Go irregular: went.', 'Так. Yesterday потребує Past Simple. Go irregular: went.'), wrong: { go: tri('Go нельзя оставлять с yesterday. Нужно went.', 'Go не можна залишати з yesterday. Потрібно went.'), goes: tri('Goes - Present Simple, не прошлое. Yesterday требует went.', 'Goes - Present Simple, не минуле. Yesterday потребує went.'), 'am going': tri('Am going описывает процесс сейчас или будущий план. Yesterday требует went.', 'Am going описує процес зараз або майбутній план. Yesterday потребує went.') }, retryLine: 'Yesterday + go = went.', focusWords: ['yesterday', 'went'] }),
    step({ id: 'past_simple_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'no_double_past_did', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.'), options: ['I went home.', 'I did went home.', 'I go home yesterday.', 'I goed home.'], correctAnswer: 'I went home.', correctFeedback: tri('Да. В утверждении Past Simple используем past form: went.', 'Так. У ствердженні Past Simple використовуємо past form: went.'), wrong: { 'I did went home.': tri('Did + went неправильно в обычном утверждении. Если используешь did, следующий глагол должен быть base form: did go. Но обычная форма здесь I went.', 'Did + went неправильно у звичайному ствердженні. Якщо використовуєш did, наступне дієслово має бути base form: did go. Але звичайна форма тут I went.'), 'I go home yesterday.': tri('Go с yesterday неправильно. Нужно went.', 'Go з yesterday неправильно. Потрібно went.'), 'I goed home.': tri('Goed неправильно. Go irregular: went.', 'Goed неправильно. Go irregular: went.') }, retryLine: 'Обычное утверждение: I went. Не did went.', focusWords: ['went', 'did go'] }),
    step({ id: 'past_simple_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'past_same_all_subjects', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.'), options: ['I worked / He worked', 'I worked / He works', 'I work / He worked', 'I did worked / He did worked'], correctAnswer: 'I worked / He worked', correctFeedback: tri('Да. Past Simple не меняется по subject: I worked, he worked.', 'Так. Past Simple не змінюється за subject: I worked, he worked.'), wrong: { 'I worked / He works': tri('He works - Present Simple. В прошлом нужно he worked.', 'He works - Present Simple. У минулому потрібно he worked.'), 'I work / He worked': tri('I work - не Past Simple. Если оба действия в прошлом, нужно I worked / He worked.', 'I work - не Past Simple. Якщо обидві дії в минулому, потрібно I worked / He worked.'), 'I did worked / He did worked': tri('Did worked неправильно. Обычное утверждение: worked.', 'Did worked неправильно. Звичайне ствердження: worked.') }, retryLine: 'В Past Simple форма одинаковая: worked.', focusWords: ['worked'] }),
    step({ id: 'past_simple_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_regular_irregular_pair', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.'), options: ['work -> worked / go -> went', 'work -> work / go -> goed', 'work -> works / go -> goes', 'work -> did worked / go -> did went'], correctAnswer: 'work -> worked / go -> went', correctFeedback: tri('Да. Work regular -> worked. Go irregular -> went.', 'Так. Work regular -> worked. Go irregular -> went.'), wrong: { 'work -> work / go -> goed': tri('Work в прошлом получает -ed, а go не становится goed. Правильно worked / went.', 'Work у минулому отримує -ed, а go не стає goed. Правильно worked / went.'), 'work -> works / go -> goes': tri('Works/goes - Present Simple, не Past Simple. Нужно worked/went.', 'Works/goes - Present Simple, не Past Simple. Потрібно worked/went.'), 'work -> did worked / go -> did went': tri('Did worked/did went неправильно. Обычные past forms: worked/went.', 'Did worked/did went неправильно. Звичайні past forms: worked/went.') }, retryLine: 'Regular = worked. Irregular go = went.', focusWords: ['worked', 'went'] }),
    step({ id: 'past_simple_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_spelling_pair', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.'), options: ['study -> studied / stop -> stopped', 'study -> studyed / stop -> stoped', 'study -> studys / stop -> stops', 'study -> studying / stop -> stopping'], correctAnswer: 'study -> studied / stop -> stopped', correctFeedback: tri('Да. Study -> studied. Stop -> stopped.', 'Так. Study -> studied. Stop -> stopped.'), wrong: { 'study -> studyed / stop -> stoped': tri('Studyed и stoped написаны неправильно. Нужны studied и stopped.', 'Studyed і stoped написані неправильно. Потрібні studied і stopped.'), 'study -> studys / stop -> stops': tri('Studys/stops не Past Simple. Нужно studied/stopped.', 'Studys/stops не Past Simple. Потрібно studied/stopped.'), 'study -> studying / stop -> stopping': tri('Studying/stopping - не Past Simple утверждение. Нужны studied/stopped.', 'Studying/stopping - не Past Simple ствердження. Потрібні studied/stopped.') }, retryLine: 'Study = studied. Stop = stopped.', focusWords: ['studied', 'stopped'] }),
    step({ id: 'past_simple_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.'), options: ['Yesterday, I went to the shop and bought some milk.', 'Yesterday, I go to the shop and buy some milk.', 'Yesterday, I goed to the shop and buyed some milk.', 'Yesterday, I did went to the shop and did bought some milk.'], correctAnswer: 'Yesterday, I went to the shop and bought some milk.', correctFeedback: tri('Да. Yesterday требует Past Simple. Go -> went, buy -> bought.', 'Так. Yesterday потребує Past Simple. Go -> went, buy -> bought.'), wrong: { 'Yesterday, I go to the shop and buy some milk.': tri('Go/buy оставлены в present form, но yesterday требует went/bought.', 'Go/buy залишені в present form, але yesterday потребує went/bought.'), 'Yesterday, I goed to the shop and buyed some milk.': tri('Goed и buyed неправильные формы. Go -> went, buy -> bought.', 'Goed і buyed неправильні форми. Go -> went, buy -> bought.'), 'Yesterday, I did went to the shop and did bought some milk.': tri('Did went / did bought неправильно в обычном утверждении. Нужно went / bought.', 'Did went / did bought неправильно у звичайному ствердженні. Потрібно went / bought.') }, retryLine: 'Yesterday = went + bought.', focusWords: ['yesterday', 'went', 'bought'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'present_form_with_past_marker',
      'regular_past_missing_ed',
      'irregular_past_error',
      'goed_error',
      'double_past_did_error',
      'y_to_ied_error',
      'double_consonant_error',
      'wrong_subject_based_past_change',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Показываем маркер прошлого и нужную past form.', 'Показуємо маркер минулого і потрібну past form.'),
    depth2: tri('Проще: спрашиваем, глагол regular или irregular.', 'Простіше: питаємо, дієслово regular чи irregular.'),
    depth3: tri('Еще проще: показываем пару work -> worked, go -> went.', 'Ще простіше: показуємо пару work -> worked, go -> went.'),
    depth4: tri('Почти подсказка: прямо указываем правильную past form.', 'Майже підказка: прямо вказуємо правильну past form.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        'Остановись. Есть маркер прошлого? Тогда нужен Past Simple. Regular verb получает -ed. Irregular verb получает отдельную past form: go -> went, see -> saw, buy -> bought.',
        'Зупинись. Є маркер минулого? Тоді потрібен Past Simple. Regular verb отримує -ed. Irregular verb отримує окрему past form: go -> went, see -> saw, buy -> bought.',
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_regular_irregular_hint_then_retry',
      card: tri(
        'Подсказка по глаголу: система покажет, глагол regular или irregular, но не выберет past form за пользователя.',
        'Підказка за дієсловом: система покаже, дієслово regular чи irregular, але не вибере past form за користувача.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        'Режим подсказки: сначала выбери, действие в прошлом или настоящем. Потом выбери regular/irregular.',
        'Режим підказки: спочатку обери, дія в минулому чи теперішньому. Потім обери regular/irregular.',
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_past_simple_001', prompt: tri('Yesterday показывает прошлое или настоящее?', 'Yesterday показує минуле чи теперішнє?'), options: ['прошлое', 'настоящее'], correctIndex: 0, thenReturnToExerciseId: 'past_simple_easy_001' },
      { id: 'guided_past_simple_002', prompt: tri('Work - regular или irregular verb?', 'Work - regular чи irregular verb?'), options: ['regular', 'irregular'], correctIndex: 0, thenReturnToExerciseId: 'past_simple_easy_001' },
      { id: 'guided_past_simple_003', prompt: tri('Go в прошлом - goed или went?', 'Go у минулому - goed чи went?'), options: ['goed', 'went'], correctIndex: 1, thenReturnToExerciseId: 'past_simple_contrast_001' },
      { id: 'guided_past_simple_004', prompt: tri('Если уже есть did, следующий глагол должен быть past form или base form?', 'Якщо вже є did, наступне дієслово має бути past form чи base form?'), options: ['past form', 'base form'], correctIndex: 1, thenReturnToExerciseId: 'past_simple_mixed_002' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'verb_past_simple_regular_irregular',
    diagnosisLabel: tri('Past Simple: regular / irregular', 'Past Simple: regular / irregular'),
    contrastSet: CONTRAST,
    focusWords: ['yesterday', 'last night', 'worked', 'went', 'saw', 'bought'],
    focusPatterns: [
      'regular_ed_worked',
      'regular_ed_opened',
      'regular_ed_called',
      'irregular_go_went',
      'irregular_see_saw',
      'irregular_buy_bought',
      'e_plus_d_lived',
      'y_to_ied_studied',
      'double_consonant_stopped',
      'no_present_with_yesterday',
      'no_double_past_did',
      'past_same_all_subjects',
      'mixed_regular_irregular_pair',
      'mixed_spelling_pair',
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
    start: 'diagnosis_training_verb_past_simple_regular_irregular_start',
    answer: 'diagnosis_training_verb_past_simple_regular_irregular_answer',
    mastery: 'diagnosis_training_verb_past_simple_regular_irregular_mastery',
    fallback: 'diagnosis_training_verb_past_simple_regular_irregular_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: {
      category: 'verb',
      microDiagnosisId: 'verb_past_simple_regular_irregular',
      contrastSet: CONTRAST,
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logVerbRegularity: true,
      logPastForm: true,
      logTimeMarker: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=verb_past_simple_regular_irregular',
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


