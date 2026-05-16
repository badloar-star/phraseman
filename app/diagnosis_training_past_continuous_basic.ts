import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = ['was + verb-ing', 'were + verb-ing', 'at 8 yesterday', 'while', 'past process', 'past simple', 'interrupted action'];
const SMART_CONTRAST = ['was + verb-ing', 'were + verb-ing', 'at 8 yesterday', 'while', 'past process', 'past simple'];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'Сначала найди subject и момент прошлого. Past Continuous = was/were + verb-ing.',
      'Спочатку знайди subject і момент минулого. Past Continuous = was/were + verb-ing.',
      'First find the subject and past moment. Past Continuous = was/were + verb-ing.',
    ),
    depth2,
    depth3,
    depth4,
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Проверь was/were и -ing. Нужная форма: ${correct}.`,
    `Перевір was/were і -ing. Потрібна форма: ${correct}.`,
    `Check was/were and -ing. Correct form: ${correct}.`,
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
      'Past Continuous показывает процесс в прошлом: действие шло в конкретный момент. Формула: was/were + verb-ing.',
      'Past Continuous показує процес у минулому: дія тривала в конкретний момент. Формула: was/were + verb-ing.',
      'Past Continuous shows an action in progress in the past: was/were + verb-ing.',
    ),
    microTask: tri(
      'Выбери форму was/were + verb-ing или правильный Past Simple/Past Continuous контраст.',
      'Обери форму was/were + verb-ing або правильний Past Simple/Past Continuous contrast.',
      'Choose was/were + verb-ing or the correct Past Simple/Past Continuous contrast.',
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
      'I/he/she/it = was + -ing. You/we/they = were + -ing. Не I working и не I was work.',
      'I/he/she/it = was + -ing. You/we/they = were + -ing. Не I working і не I was work.',
      'I/he/she/it = was + -ing. You/we/they = were + -ing.',
    ),
    focusWords: input.focusWords,
  };
}

export const PAST_CONTINUOUS_BASIC_TRAINING: DiagnosisTraining = {
  id: 'past_continuous_basic',
  category: 'verb',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 42,
  supportedLocales: ['ru', 'uk'],
  title: tri('Past Continuous: действие шло в момент прошлого', 'Past Continuous: дія тривала в момент минулого'),
  shortTitle: tri('Was / Were + -ing', 'Was / Were + -ing'),
  shortDiagnosis: tri(
    'Ты путаешь Past Continuous: was/were + verb-ing для процесса в прошлом.',
    'Ти плутаєш Past Continuous: was/were + verb-ing для процесу в минулому.',
  ),
  diagnosisText: tri(
    'Ты путаешь Past Continuous: забываешь was/were, ставишь обычный глагол вместо -ing или используешь Past Simple там, где нужно показать процесс в конкретный момент прошлого. Главная логика: Past Continuous = was/were + verb-ing.',
    'Ти плутаєш Past Continuous: забуваєш was/were, ставиш звичайне дієслово замість -ing або використовуєш Past Simple там, де потрібно показати процес у конкретний момент минулого. Головна логіка: Past Continuous = was/were + verb-ing.',
  ),
  mentalModel: tri(
    'Past Continuous показывает, что действие было в процессе в прошлом: I was working at 8. She was sleeping. They were waiting. Это не просто “сделал”, а “делал в тот момент”.',
    'Past Continuous показує, що дія була в процесі в минулому: I was working at 8. She was sleeping. They were waiting. Це не просто “зробив”, а “робив у той момент”.',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'I/he/she/it + was + verb-ing: I was working, she was sleeping. You/we/they + were + verb-ing: you were waiting, they were talking.',
    'I/he/she/it + was + verb-ing: I was working, she was sleeping. You/we/they + were + verb-ing: you were waiting, they were talking.',
  ),
  whatUserMustLearn: {
    ru: [
      'Past Continuous строится через was/were + verb-ing: I was working.',
      'С I/he/she/it используется was.',
      'С you/we/they используется were.',
      'Past Continuous показывает процесс в прошлом, не просто факт завершения.',
      'At 8 yesterday, at that moment, while часто подсказывают Past Continuous.',
      'Нельзя говорить I working yesterday. Нужен was.',
      'Нельзя говорить I was work. После was нужен verb-ing.',
      'Past Simple показывает завершенное действие: I worked yesterday.',
      'Past Continuous показывает действие в процессе: I was working at 8 yesterday.',
      "В отрицании not идет после was/were: I wasn't working, they weren't waiting.",
    ],
    uk: [
      'Past Continuous будується через was/were + verb-ing: I was working.',
      'З I/he/she/it використовується was.',
      'З you/we/they використовується were.',
      'Past Continuous показує процес у минулому, не просто факт завершення.',
      'At 8 yesterday, at that moment, while часто підказують Past Continuous.',
      'Не можна говорити I working yesterday. Потрібен was.',
      'Не можна говорити I was work. Після was потрібен verb-ing.',
      'Past Simple показує завершену дію: I worked yesterday.',
      'Past Continuous показує дію в процесі: I was working at 8 yesterday.',
      "У запереченні not іде після was/were: I wasn't working, they weren't waiting.",
    ],
    es: [
      'Past Continuous uses was/were + verb-ing.',
      'I/he/she/it use was.',
      'You/we/they use were.',
      'Past Continuous shows a process in the past.',
      'At 8 yesterday and while often signal Past Continuous.',
      'Do not omit was/were.',
      'Use -ing after was/were.',
      'Past Simple shows a completed action.',
      'Past Continuous shows an action in progress.',
      'Negatives put not after was/were.',
    ],
  },
  examples: [
    { en: 'I was working at 8 yesterday.', ru: 'Я работал вчера в 8.', uk: 'Я працював учора о 8.', es: 'I was working at 8 yesterday.', why: tri('At 8 yesterday показывает конкретный момент в прошлом. Действие было в процессе: was working.', 'At 8 yesterday показує конкретний момент у минулому. Дія була в процесі: was working.') },
    { en: 'She was sleeping when I called.', ru: 'Она спала, когда я позвонил.', uk: 'Вона спала, коли я подзвонив.', es: 'She was sleeping when I called.', why: tri('Sleeping был процессом в прошлом. She требует was.', 'Sleeping був процесом у минулому. She потребує was.') },
    { en: 'They were waiting outside.', ru: 'Они ждали снаружи.', uk: 'Вони чекали зовні.', es: 'They were waiting outside.', why: tri('They требует were. Waiting показывает процесс.', 'They потребує were. Waiting показує процес.') },
    { en: 'We were watching TV at that moment.', ru: 'В тот момент мы смотрели телевизор.', uk: 'У той момент ми дивилися телевізор.', es: 'We were watching TV at that moment.', why: tri('At that moment показывает момент прошлого. We требует were.', 'At that moment показує момент минулого. We потребує were.') },
    { en: 'He was talking on the phone.', ru: 'Он разговаривал по телефону.', uk: 'Він розмовляв телефоном.', es: 'He was talking on the phone.', why: tri('He требует was. Talking показывает действие в процессе.', 'He потребує was. Talking показує дію в процесі.') },
    { en: "I wasn't listening.", ru: 'Я не слушал.', uk: 'Я не слухав.', es: "I wasn't listening.", why: tri("Отрицание строится через wasn't + verb-ing.", "Заперечення будується через wasn't + verb-ing.") },
    { en: 'Were you working yesterday evening?', ru: 'Ты работал вчера вечером?', uk: 'Ти працював учора ввечері?', es: 'Were you working yesterday evening?', why: tri('В вопросе were выходит перед subject you.', 'У питанні were виходить перед subject you.') },
    { en: 'It was raining all morning.', ru: 'Всё утро шёл дождь.', uk: 'Увесь ранок ішов дощ.', es: 'It was raining all morning.', why: tri('It was raining показывает длительный процесс в прошлом.', 'It was raining показує тривалий процес у минулому.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты говоришь о процессе в прошлом, но строишь фразу как обычное прошлое действие. Английский различает “я работал вчера” и “я работал в тот момент”. Для процесса нужен Past Continuous.', 'Схоже, ти говориш про процес у минулому, але будуєш фразу як звичайну минулу дію. Англійська розрізняє “я працював учора” і “я працював у той момент”. Для процесу потрібен Past Continuous.') },
    { id: 'intro_rule', type: 'rule', text: tri('Формула: was/were + verb-ing. I was working. She was sleeping. They were waiting.', 'Формула: was/were + verb-ing. I was working. She was sleeping. They were waiting.') },
    { id: 'intro_warning', type: 'warning', text: tri('Не говори I working и не говори I was work. Правильно: I was working.', 'Не говори I working і не говори I was work. Правильно: I was working.') },
  ],
  steps: [
    step({ id: 'past_cont_easy_001', order: 1, difficulty: 'easy', targetSkill: 'i_was_working', sentence: 'I ___ working at 8 yesterday.', translation: tri('Я работал вчера в 8.', 'Я працював учора о 8.'), options: ['was', 'were', 'did', 'am'], correctAnswer: 'was', correctFeedback: tri('Да. С I в Past Continuous используется was: I was working.', 'Так. З I у Past Continuous використовується was: I was working.'), wrong: { were: tri('Were используется с you/we/they. С I нужен was.', 'Were використовується з you/we/they. З I потрібен was.'), did: tri('Did не строит Continuous. Для working нужен was.', 'Did не будує Continuous. Для working потрібен was.'), am: tri('Am - настоящее. At 8 yesterday требует was.', 'Am - теперішній час. At 8 yesterday потребує was.') }, retryFeedback: [tri('I + was + working.'), tri('I was working.'), tri('Подсказка: I was working at 8 yesterday.', 'Підказка: I was working at 8 yesterday.')], focusWords: ['was working', 'at 8 yesterday'] }),
    step({ id: 'past_cont_easy_002', order: 2, difficulty: 'easy', targetSkill: 'she_was_sleeping', sentence: 'She ___ sleeping when I called.', translation: tri('Она спала, когда я позвонил.', 'Вона спала, коли я подзвонив.'), options: ['was', 'were', 'did', 'is'], correctAnswer: 'was', correctFeedback: tri('Да. She требует was: She was sleeping.', 'Так. She потребує was: She was sleeping.'), wrong: { were: tri('Were не используется с she в стандартной форме. Нужно was.', 'Were не використовується з she у стандартній формі. Потрібно was.'), did: tri('Did sleeping неправильно. Для Past Continuous нужно was sleeping.', 'Did sleeping неправильно. Для Past Continuous потрібно was sleeping.'), is: tri('Is sleeping - настоящее. Здесь прошлое: was sleeping.', 'Is sleeping - теперішній час. Тут минуле: was sleeping.') }, retryFeedback: [tri('She + was + sleeping.'), tri('She was sleeping.'), tri('Подсказка: She was sleeping when I called.', 'Підказка: She was sleeping when I called.')], focusWords: ['was sleeping'] }),
    step({ id: 'past_cont_easy_003', order: 3, difficulty: 'easy', targetSkill: 'it_was_raining', sentence: 'It ___ raining all morning.', translation: tri('Всё утро шёл дождь.', 'Увесь ранок ішов дощ.'), options: ['was', 'were', 'did', 'is'], correctAnswer: 'was', correctFeedback: tri('Да. It требует was: It was raining.', 'Так. It потребує was: It was raining.'), wrong: { were: tri('Were используется с you/we/they. It требует was.', 'Were використовується з you/we/they. It потребує was.'), did: tri('Did raining неправильно. Для процесса нужен was raining.', 'Did raining неправильно. Для процесу потрібен was raining.'), is: tri('Is raining - сейчас. All morning в прошлом контексте требует was raining.', 'Is raining - зараз. All morning у минулому контексті потребує was raining.') }, retryFeedback: [tri('It + was + raining.'), tri('It was raining.'), tri('Подсказка: It was raining all morning.', 'Підказка: It was raining all morning.')], focusWords: ['was raining'] }),
    step({ id: 'past_cont_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'they_were_waiting', sentence: 'They ___ waiting outside.', translation: tri('Они ждали снаружи.', 'Вони чекали зовні.'), options: ['were', 'was', 'did', 'are'], correctAnswer: 'were', correctFeedback: tri('Да. They требует were: They were waiting.', 'Так. They потребує were: They were waiting.'), wrong: { was: tri('Was используется с I/he/she/it. They требует were.', 'Was використовується з I/he/she/it. They потребує were.'), did: tri('Did waiting неправильно. Для Past Continuous нужно were waiting.', 'Did waiting неправильно. Для Past Continuous потрібно were waiting.'), are: tri('Are waiting - настоящее. Для прошлого процесса нужно were waiting.', 'Are waiting - теперішній час. Для минулого процесу потрібно were waiting.') }, retryFeedback: [tri('They + were + waiting.'), tri('They were waiting.'), tri('Подсказка: They were waiting outside.', 'Підказка: They were waiting outside.')], focusWords: ['were waiting'] }),
    step({ id: 'past_cont_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'we_were_watching', sentence: 'We ___ watching TV at that moment.', translation: tri('В тот момент мы смотрели телевизор.', 'У той момент ми дивилися телевізор.'), options: ['were', 'was', 'did', 'are'], correctAnswer: 'were', correctFeedback: tri('Да. We требует were: We were watching.', 'Так. We потребує were: We were watching.'), wrong: { was: tri('Was не используется с we. Нужно were.', 'Was не використовується з we. Потрібно were.'), did: tri('Did watching неправильно. Нужно were watching.', 'Did watching неправильно. Потрібно were watching.'), are: tri('Are watching - настоящее. At that moment в прошлом требует were watching.', 'Are watching - теперішній час. At that moment у минулому потребує were watching.') }, retryFeedback: [tri('We + were + watching.'), tri('We were watching TV.'), tri('Подсказка: We were watching TV at that moment.', 'Підказка: We were watching TV at that moment.')], focusWords: ['were watching'] }),
    step({ id: 'past_cont_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'you_were_working', sentence: 'You ___ working late yesterday.', translation: tri('Ты работал допоздна вчера.', 'Ти працював допізна вчора.'), options: ['were', 'was', 'did', 'are'], correctAnswer: 'were', correctFeedback: tri('Да. You требует were в Past Continuous.', 'Так. You потребує were у Past Continuous.'), wrong: { was: tri('В стандартной форме you требует were, не was.', 'У стандартній формі you потребує were, не was.'), did: tri('Did working неправильно. Нужно were working.', 'Did working неправильно. Потрібно were working.'), are: tri('Are working - настоящее. Yesterday требует were working.', 'Are working - теперішній час. Yesterday потребує were working.') }, retryFeedback: [tri('You + were + working.'), tri('You were working.'), tri('Подсказка: You were working late yesterday.', 'Підказка: You were working late yesterday.')], focusWords: ['you were working'] }),
    step({ id: 'past_cont_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'no_missing_was', sentence: 'Choose the correct sentence.', translation: tri('Я работал в тот момент.', 'Я працював у той момент.'), options: ['I was working at that moment.', 'I working at that moment.', 'I was work at that moment.', 'I worked at that moment.'], correctAnswer: 'I was working at that moment.', correctFeedback: tri('Да. At that moment требует процесс в прошлом: was working.', 'Так. At that moment потребує процес у минулому: was working.'), wrong: { 'I working at that moment.': tri('I working неправильно. Перед -ing нужна форма was.', 'I working неправильно. Перед -ing потрібна форма was.'), 'I was work at that moment.': tri('После was нужен verb-ing. Не was work, а was working.', 'Після was потрібен verb-ing. Не was work, а was working.'), 'I worked at that moment.': tri('Worked может звучать как факт, но at that moment требует процесс: was working.', 'Worked може звучати як факт, але at that moment потребує процес: was working.') }, retryFeedback: [tri('At that moment = was working.'), tri('I was working.'), tri('Подсказка: I was working at that moment.', 'Підказка: I was working at that moment.')], focusWords: ['at that moment', 'was working'] }),
    step({ id: 'past_cont_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'no_base_after_were', sentence: 'Choose the correct sentence.', translation: tri('Они ждали, когда я пришёл.', 'Вони чекали, коли я прийшов.'), options: ['They were waiting when I arrived.', 'They waiting when I arrived.', 'They were wait when I arrived.', 'They waited when I arrived.'], correctAnswer: 'They were waiting when I arrived.', correctFeedback: tri('Да. Они были в процессе ожидания, когда случилось другое действие: were waiting.', 'Так. Вони були в процесі очікування, коли сталася інша дія: were waiting.'), wrong: { 'They waiting when I arrived.': tri('They waiting неправильно. Нужна форма were waiting.', 'They waiting неправильно. Потрібна форма were waiting.'), 'They were wait when I arrived.': tri('После were нужен verb-ing: were waiting.', 'Після were потрібен verb-ing: were waiting.'), 'They waited when I arrived.': tri('Waited звучит как завершенный факт. Здесь процесс на фоне другого действия: were waiting.', 'Waited звучить як завершений факт. Тут процес на фоні іншої дії: were waiting.') }, retryFeedback: [tri('They + were + waiting.'), tri('They were waiting.'), tri('Подсказка: They were waiting when I arrived.', 'Підказка: They were waiting when I arrived.')], focusWords: ['were waiting', 'when'] }),
    step({ id: 'past_cont_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'process_at_time', sentence: 'At 9 last night, she ___ dinner.', translation: tri('Вчера в 9 вечера она ужинала.', 'Учора о 9 вечора вона вечеряла.'), options: ['was having', 'had', 'has', 'was have'], correctAnswer: 'was having', correctFeedback: tri('Да. At 9 last night показывает момент в прошлом. Процесс = was having.', 'Так. At 9 last night показує момент у минулому. Процес = was having.'), wrong: { had: tri('Had показывает факт. Здесь важно, что действие шло в 9 вечера: was having.', 'Had показує факт. Тут важливо, що дія тривала о 9 вечора: was having.'), has: tri('Has - не подходит к at 9 last night. Нужна прошлая форма процесса.', 'Has - не підходить до at 9 last night. Потрібна минула форма процесу.'), 'was have': tri('После was нужен verb-ing: was having.', 'Після was потрібен verb-ing: was having.') }, retryFeedback: [tri('At 9 last night = was having.'), tri('She was having dinner.'), tri('Подсказка: At 9 last night, she was having dinner.', 'Підказка: At 9 last night, she was having dinner.')], focusWords: ['at 9 last night', 'was having'] }),
    step({ id: 'past_cont_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'negative_wasnt_working', sentence: 'I ___ listening.', translation: tri('Я не слушал.', 'Я не слухав.'), options: ["wasn't", "weren't", "didn't", 'am not'], correctAnswer: "wasn't", correctFeedback: tri("Да. I требует was. Отрицание: wasn't listening.", "Так. I потребує was. Заперечення: wasn't listening."), wrong: { "weren't": tri("Weren't используется с you/we/they. С I нужно wasn't.", "Weren't використовується з you/we/they. З I потрібно wasn't."), "didn't": tri("Didn't listening неправильно. Для Continuous нужен wasn't listening.", "Didn't listening неправильно. Для Continuous потрібно wasn't listening."), 'am not': tri("Am not listening - настоящее. Здесь прошлое: wasn't listening.", "Am not listening - теперішній час. Тут минуле: wasn't listening.") }, retryFeedback: [tri("I was not = I wasn't."), tri("I wasn't listening."), tri("Подсказка: I wasn't listening.", "Підказка: I wasn't listening.")], focusWords: ["wasn't listening"] }),
    step({ id: 'past_cont_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'negative_werent_waiting', sentence: 'They ___ waiting for us.', translation: tri('Они нас не ждали.', 'Вони нас не чекали.'), options: ["weren't", "wasn't", "didn't", "aren't"], correctAnswer: "weren't", correctFeedback: tri("Да. They требует were. Отрицание: weren't waiting.", "Так. They потребує were. Заперечення: weren't waiting."), wrong: { "wasn't": tri("Wasn't используется с I/he/she/it. They требует weren't.", "Wasn't використовується з I/he/she/it. They потребує weren't."), "didn't": tri("Didn't waiting неправильно. Нужна форма weren't waiting.", "Didn't waiting неправильно. Потрібна форма weren't waiting."), "aren't": tri("Aren't waiting - настоящее. Здесь Past Continuous: weren't waiting.", "Aren't waiting - теперішній час. Тут Past Continuous: weren't waiting.") }, retryFeedback: [tri("They were not = they weren't."), tri("They weren't waiting."), tri("Подсказка: They weren't waiting for us.", "Підказка: They weren't waiting for us.")], focusWords: ["weren't waiting"] }),
    step({ id: 'past_cont_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'question_were_you_working', sentence: '___ you working yesterday evening?', translation: tri('Ты работал вчера вечером?', 'Ти працював учора ввечері?'), options: ['Were', 'Was', 'Did', 'Are'], correctAnswer: 'Were', correctFeedback: tri('Да. В вопросе were выходит перед you: Were you working?', 'Так. У питанні were виходить перед you: Were you working?'), wrong: { Was: tri('С you нужна форма were, не was.', 'З you потрібна форма were, не was.'), Did: tri('Did you working неправильно. Для Past Continuous нужен Were you working?', 'Did you working неправильно. Для Past Continuous потрібно Were you working?'), Are: tri('Are you working - настоящее. Yesterday evening требует Were you working.', 'Are you working - теперішній час. Yesterday evening потребує Were you working.') }, retryFeedback: [tri('Question: Were + you + working?'), tri('Were you working?'), tri('Подсказка: Were you working yesterday evening?', 'Підказка: Were you working yesterday evening?')], focusWords: ['were you working'] }),
    step({ id: 'past_cont_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_was_were_pair', sentence: 'Choose the correct pair.', translation: tri('Я работал / они ждали', 'Я працював / вони чекали'), options: ['I was working / They were waiting', 'I were working / They was waiting', 'I working / They waiting', 'I was work / They were wait'], correctAnswer: 'I was working / They were waiting', correctFeedback: tri('Да. I = was working. They = were waiting.', 'Так. I = was working. They = were waiting.'), wrong: { 'I were working / They was waiting': tri('Was/were перепутаны. I was, they were.', 'Was/were переплутані. I was, they were.'), 'I working / They waiting': tri('В обеих частях пропущены was/were.', 'В обох частинах пропущені was/were.'), 'I was work / They were wait': tri('После was/were нужен verb-ing: working/waiting.', 'Після was/were потрібен verb-ing: working/waiting.') }, retryFeedback: [tri('I was + -ing. They were + -ing.'), tri('I was working / They were waiting.'), tri('Подсказка: I was working / They were waiting.', 'Підказка: I was working / They were waiting.')], focusWords: ['was working', 'were waiting'] }),
    step({ id: 'past_cont_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_process_vs_completed', sentence: 'Choose the correct pair.', translation: tri('Я работал вчера / я работал вчера в 8', 'Я працював учора / я працював учора о 8'), options: ['I worked yesterday / I was working at 8 yesterday', 'I was working yesterday / I worked at 8 yesterday', 'I working yesterday / I was work at 8 yesterday', 'I did work yesterday / I did working at 8 yesterday'], correctAnswer: 'I worked yesterday / I was working at 8 yesterday', correctFeedback: tri('Да. Просто факт вчера = worked. Процесс в 8 = was working.', 'Так. Просто факт учора = worked. Процес о 8 = was working.'), wrong: { 'I was working yesterday / I worked at 8 yesterday': tri('At 8 требует процесс: was working. Просто yesterday без момента часто Past Simple.', 'At 8 потребує процес: was working. Просто yesterday без моменту часто Past Simple.'), 'I working yesterday / I was work at 8 yesterday': tri('I working неправильно без was. I was work неправильно без -ing.', 'I working неправильно без was. I was work неправильно без -ing.'), 'I did work yesterday / I did working at 8 yesterday': tri('Did work возможно как усиление, но не базовый вариант. Did working неправильно.', 'Did work можливе як підсилення, але не базовий варіант. Did working неправильно.') }, retryFeedback: [tri('Fact = worked. Process at 8 = was working.'), tri('Worked yesterday / was working at 8.'), tri('Подсказка: I worked yesterday / I was working at 8 yesterday.', 'Підказка: I worked yesterday / I was working at 8 yesterday.')], focusWords: ['worked', 'was working at 8'] }),
    step({ id: 'past_cont_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Она спала, а они смотрели телевизор.', 'Вона спала, а вони дивилися телевізор.'), options: ['She was sleeping, and they were watching TV.', 'She were sleeping, and they was watching TV.', 'She sleeping, and they watching TV.', 'She was sleep, and they were watch TV.'], correctAnswer: 'She was sleeping, and they were watching TV.', correctFeedback: tri('Да. She = was sleeping. They = were watching.', 'Так. She = was sleeping. They = were watching.'), wrong: { 'She were sleeping, and they was watching TV.': tri('Was/were перепутаны. She was, they were.', 'Was/were переплутані. She was, they were.'), 'She sleeping, and they watching TV.': tri('В обеих частях пропущены was/were.', 'В обох частинах пропущені was/were.'), 'She was sleep, and they were watch TV.': tri('После was/were нужен verb-ing: sleeping, watching.', 'Після was/were потрібен verb-ing: sleeping, watching.') }, retryFeedback: [tri('She was sleeping. They were watching.'), tri('Was sleeping / were watching.'), tri('Подсказка: She was sleeping, and they were watching TV.', 'Підказка: She was sleeping, and they were watching TV.')], focusWords: ['was sleeping', 'were watching'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'missing_was_were_error',
      'was_were_agreement_error',
      'was_were_plus_base_error',
      'past_simple_instead_of_past_continuous_error',
      'ing_without_was_were_error',
      'negative_order_error',
      'question_order_error',
      'wrong_time_marker_interpretation_error',
      'process_vs_completed_action_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем момент в прошлом, subject и нужную форму was/were + -ing.', 'Звичайне пояснення: показуємо момент у минулому, subject і потрібну форму was/were + -ing.'),
    depth2: tri('Проще: спрашиваем, действие было завершенным фактом или процессом в тот момент.', 'Простіше: питаємо, дія була завершеним фактом чи процесом у той момент.'),
    depth3: tri('Еще проще: показываем пары I worked yesterday / I was working at 8.', 'Ще простіше: показуємо пари I worked yesterday / I was working at 8.'),
    depth4: tri('Почти подсказка: прямо указываем was/were + verb-ing.', 'Майже підказка: прямо вказуємо was/were + verb-ing.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        'Остановись. Past Continuous = was/were + verb-ing. I/he/she/it = was. You/we/they = were. Если действие было в процессе в конкретный момент прошлого, выбирай was/were + -ing.',
        'Зупинись. Past Continuous = was/were + verb-ing. I/he/she/it = was. You/we/they = were. Якщо дія була в процесі у конкретний момент минулого, обирай was/were + -ing.',
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_subject_process_hint_then_retry',
      card: tri('Подсказка: система покажет subject group и подскажет, что действие было процессом, но не выберет форму за пользователя.', 'Підказка: система покаже subject group і підкаже, що дія була процесом, але не вибере форму за користувача.'),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri('Режим подсказки: сначала выбери subject group: was или were. Потом выбери, нужен base verb или verb-ing. После этого система вернет тебя к фразе.', 'Режим підказки: спочатку обери subject group: was чи were. Потім обери, потрібен base verb чи verb-ing. Після цього система поверне тебе до фрази.'),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_past_cont_001', prompt: tri('С I в Past Continuous нужен was или were?', 'З I у Past Continuous потрібен was чи were?'), options: ['was', 'were'], correctIndex: 0, thenReturnToExerciseId: 'past_cont_easy_001' },
      { id: 'guided_past_cont_002', prompt: tri('С they в Past Continuous нужен was или were?', 'З they у Past Continuous потрібен was чи were?'), options: ['was', 'were'], correctIndex: 1, thenReturnToExerciseId: 'past_cont_contrast_001' },
      { id: 'guided_past_cont_003', prompt: tri('После was/were в Past Continuous нужен work или working?', 'Після was/were у Past Continuous потрібен work чи working?'), options: ['work', 'working'], correctIndex: 1, thenReturnToExerciseId: 'past_cont_contrast_004' },
      { id: 'guided_past_cont_004', prompt: tri('At 8 yesterday показывает момент прошлого или обычную привычку?', 'At 8 yesterday показує момент минулого чи звичайну звичку?'), options: ['момент прошлого', 'обычную привычку'], correctIndex: 0, thenReturnToExerciseId: 'past_cont_easy_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'past_continuous_basic',
    diagnosisLabel: tri('Past Continuous', 'Past Continuous'),
    contrastSet: SMART_CONTRAST,
    difficultyLevel: 2,
    focusWords: ['was working', 'were waiting', 'was sleeping', 'were watching', 'at 8 yesterday', 'at that moment'],
    focusPatterns: [
      'i_was_working',
      'she_was_sleeping',
      'it_was_raining',
      'they_were_waiting',
      'we_were_watching',
      'you_were_working',
      'no_missing_was',
      'no_base_after_were',
      'process_at_time',
      'negative_wasnt_working',
      'negative_werent_waiting',
      'question_were_you_working',
      'mixed_was_were_pair',
      'mixed_process_vs_completed',
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
      microDiagnosisId: 'past_continuous_basic',
      contrastSet: ['was + verb-ing', 'were + verb-ing', 'past process', 'past simple'],
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logSubjectGroup: true,
      logBePastForm: true,
      logVerbIngForm: true,
      logTimeMarker: true,
      logProcessVsCompleted: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=past_continuous_basic',
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


