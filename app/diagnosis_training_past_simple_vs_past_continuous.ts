import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = ['past simple', 'past continuous', 'completed action', 'background action', 'interrupted action', 'when', 'while', 'at that moment'];
const SMART_CONTRAST = CONTRAST;

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'First decide the action role: finished fact/event or background process in a past moment.',
      'First decide the action role: finished fact/event or background process in a past moment.',
      'First decide the action role: finished fact/event or background process in a past moment.',
    ),
    depth2,
    depth3,
    depth4,
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Check whether this is a fact/event or a process in the past. Correct form: ${correct}.`,
    `Check whether this is a fact/event or a process in the past. Correct form: ${correct}.`,
    `Check whether this is a fact/event or a process in the past. Correct form: ${correct}.`,
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
      'Past Simple shows a fact, event, or sequence. Past Continuous shows a background process or action in progress at a past moment.',
      'Past Simple shows a fact, event, or sequence. Past Continuous shows a background process or action in progress at a past moment.',
      'Past Simple shows a fact, event, or sequence. Past Continuous shows a background process or action in progress at a past moment.',
    ),
    microTask: tri(
      'Choose Past Simple or Past Continuous by the role of the action.',
      'Choose Past Simple or Past Continuous by the role of the action.',
      'Choose Past Simple or Past Continuous by the role of the action.',
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
      'Fact/event/sequence = Past Simple. Background/process at a past moment = was/were + verb-ing.',
      'Fact/event/sequence = Past Simple. Background/process at a past moment = was/were + verb-ing.',
      'Fact/event/sequence = Past Simple. Background/process at a past moment = was/were + verb-ing.',
    ),
    focusWords: input.focusWords,
  };
}

export const PAST_SIMPLE_VS_PAST_CONTINUOUS_TRAINING: DiagnosisTraining = {
  id: 'past_simple_vs_past_continuous',
  category: 'verb',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 43,
  supportedLocales: ['ru', 'uk'],
  title: tri('Past Simple vs Past Continuous: fact or process', 'Past Simple vs Past Continuous: fact or process'),
  shortTitle: tri('Past Simple vs Continuous', 'Past Simple vs Continuous'),
  shortDiagnosis: tri(
    'You are mixing a finished past fact with a past background process.',
    'You are mixing a finished past fact with a past background process.',
  ),
  diagnosisText: tri(
    'You are mixing Past Simple and Past Continuous. Both can translate as past tense, but English separates a completed fact/event from an action in progress at a specific past moment.',
    'You are mixing Past Simple and Past Continuous. Both can translate as past tense, but English separates a completed fact/event from an action in progress at a specific past moment.',
  ),
  mentalModel: tri(
    'Past Simple = event, fact, sequence: I opened the door. Past Continuous = background, process, action in that moment: I was opening the door. When often joins a short event to a background: I was working when he called.',
    'Past Simple = event, fact, sequence: I opened the door. Past Continuous = background, process, action in that moment: I was opening the door. When often joins a short event to a background: I was working when he called.',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'Past Simple: I worked yesterday, he called, she opened the door. Past Continuous: I was working at 8, she was opening the door. Background = was/were + -ing, short event = Past Simple.',
    'Past Simple: I worked yesterday, he called, she opened the door. Past Continuous: I was working at 8, she was opening the door. Background = was/were + -ing, short event = Past Simple.',
  ),
  whatUserMustLearn: {
    ru: [
      'Past Simple shows a finished action or past fact: I worked yesterday.',
      'Past Continuous shows a process at a specific past moment: I was working at 8.',
      'At that moment, at 8 yesterday, and while often signal Past Continuous.',
      'Yesterday, last night, and two days ago without process focus often signal Past Simple.',
      'When often introduces the short event: when he called.',
      'While often introduces the process or background: while I was working.',
      'If one action interrupted another, the background is usually Past Continuous and the event is Past Simple.',
      'Two parallel long actions often use Past Continuous in both parts.',
      'Do not say I was worked. After was/were use verb-ing.',
      'Do not choose Past Continuous just because the translation says worked; decide fact or process.',
    ],
    uk: [
      'Past Simple shows a finished action or past fact: I worked yesterday.',
      'Past Continuous shows a process at a specific past moment: I was working at 8.',
      'At that moment, at 8 yesterday, and while often signal Past Continuous.',
      'Yesterday, last night, and two days ago without process focus often signal Past Simple.',
      'When often introduces the short event: when he called.',
      'While often introduces the process or background: while I was working.',
      'If one action interrupted another, the background is usually Past Continuous and the event is Past Simple.',
      'Two parallel long actions often use Past Continuous in both parts.',
      'Do not say I was worked. After was/were use verb-ing.',
      'Do not choose Past Continuous just because the translation says worked; decide fact or process.',
    ],
    es: [
      'Past Simple shows a finished action or past fact.',
      'Past Continuous shows a process at a specific past moment.',
      'At that moment and while often signal Past Continuous.',
      'Finished time without process often signals Past Simple.',
      'When often introduces the short event.',
      'While often introduces the background process.',
      'Interrupted background often uses Past Continuous.',
      'Parallel long actions often use Past Continuous.',
      'Use verb-ing after was/were.',
      'Choose by meaning, not translation.',
    ],
  },
  examples: [
    { en: 'I worked yesterday.', ru: 'I worked yesterday.', uk: 'I worked yesterday.', es: 'I worked yesterday.', why: tri('This is a general fact about yesterday, not a process at one moment.') },
    { en: 'I was working at 8 yesterday.', ru: 'I was working at 8 yesterday.', uk: 'I was working at 8 yesterday.', es: 'I was working at 8 yesterday.', why: tri('At 8 yesterday marks a past moment. The action was in progress.') },
    { en: 'She was sleeping when I called.', ru: 'She was sleeping when I called.', uk: 'She was sleeping when I called.', es: 'She was sleeping when I called.', why: tri('Sleeping is the background process. Called is the short event.') },
    { en: 'I called her last night.', ru: 'I called her last night.', uk: 'I called her last night.', es: 'I called her last night.', why: tri('Called is a completed past event.') },
    { en: 'While I was cooking, he was studying.', ru: 'While I was cooking, he was studying.', uk: 'While I was cooking, he was studying.', es: 'While I was cooking, he was studying.', why: tri('Both activities continued in parallel.') },
    { en: 'The phone rang while I was sleeping.', ru: 'The phone rang while I was sleeping.', uk: 'The phone rang while I was sleeping.', es: 'The phone rang while I was sleeping.', why: tri('Rang is the event. Was sleeping is the background.') },
    { en: 'They watched a film yesterday.', ru: 'They watched a film yesterday.', uk: 'They watched a film yesterday.', es: 'They watched a film yesterday.', why: tri('The film is treated as a completed event.') },
    { en: 'They were watching a film when I arrived.', ru: 'They were watching a film when I arrived.', uk: 'They were watching a film when I arrived.', es: 'They were watching a film when I arrived.', why: tri('Were watching was already in progress when I arrived.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('The translation may look the same, but English asks whether the action is a fact or a background process.') },
    { id: 'intro_rule', type: 'rule', text: tri('Fact/event = Past Simple. Background/process in a past moment = Past Continuous.') },
    { id: 'intro_warning', type: 'warning', text: tri('Do not put was/were everywhere. I worked yesterday and I was working at 8 yesterday mean different things.') },
  ],
  steps: [
    step({ id: 'past_simple_cont_easy_001', order: 1, difficulty: 'easy', targetSkill: 'past_simple_fact', sentence: 'I ___ yesterday.', translation: tri('I worked yesterday.'), options: ['worked', 'was working', 'working', 'was worked'], correctAnswer: 'worked', correctFeedback: tri('Yes. This is a general fact about yesterday, so use Past Simple: worked.'), wrong: { 'was working': tri('Was working needs a process or background. Here it is just a fact: worked.'), working: tri('Working without was/were is incomplete, and here the best form is Past Simple: worked.'), 'was worked': tri('Was worked is not the active past form. Use worked.') }, retryFeedback: [tri('Simple fact yesterday = worked.'), tri('I worked yesterday.'), tri('Hint: I worked yesterday.')], focusWords: ['worked', 'yesterday'] }),
    step({ id: 'past_simple_cont_easy_002', order: 2, difficulty: 'easy', targetSkill: 'past_continuous_at_time', sentence: 'I ___ at 8 yesterday.', translation: tri('I was working at 8 yesterday.'), options: ['was working', 'worked', 'work', 'was worked'], correctAnswer: 'was working', correctFeedback: tri('Yes. At 8 yesterday marks a past moment, so use the process form: was working.'), wrong: { worked: tri('Worked is a fact. At 8 yesterday asks what was happening then: was working.'), work: tri('Work is base/present form. Use was working.'), 'was worked': tri('After was in Past Continuous use verb-ing: was working.') }, retryFeedback: [tri('At 8 = process in that moment.'), tri('I was working at 8.'), tri('Hint: I was working at 8 yesterday.')], focusWords: ['was working', 'at 8 yesterday'] }),
    step({ id: 'past_simple_cont_easy_003', order: 3, difficulty: 'easy', targetSkill: 'fact_vs_process_pair', sentence: 'Choose the correct pair.', translation: tri('I worked yesterday / I was working at 8 yesterday'), options: ['I worked yesterday / I was working at 8 yesterday', 'I was working yesterday / I worked at 8 yesterday', 'I working yesterday / I was work at 8 yesterday', 'I was worked yesterday / I worked working at 8 yesterday'], correctAnswer: 'I worked yesterday / I was working at 8 yesterday', correctFeedback: tri('Yes. Fact = worked. Process at a specific moment = was working.'), wrong: { 'I was working yesterday / I worked at 8 yesterday': tri('The at 8 part needs a process: was working. The plain yesterday part is usually a fact: worked.'), 'I working yesterday / I was work at 8 yesterday': tri('I working is missing was. I was work is missing -ing.'), 'I was worked yesterday / I worked working at 8 yesterday': tri('Was worked and worked working are not the right active forms.') }, retryFeedback: [tri('Fact = worked. Process = was working.'), tri('Worked yesterday / was working at 8.'), tri('Hint: I worked yesterday / I was working at 8 yesterday.')], focusWords: ['worked', 'was working'] }),
    step({ id: 'past_simple_cont_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'background_when_event', sentence: 'She ___ when I called.', translation: tri('She was sleeping when I called.'), options: ['was sleeping', 'slept', 'sleep', 'was slept'], correctAnswer: 'was sleeping', correctFeedback: tri('Yes. Sleep was the background process; called was the short event.'), wrong: { slept: tri('Slept is a fact. Here sleep was happening when the call happened: was sleeping.'), sleep: tri('Sleep is base form. Use was sleeping.'), 'was slept': tri('Was slept is not the active process. Use was sleeping.') }, retryFeedback: [tri('Background = was sleeping. Event = called.'), tri('She was sleeping when I called.'), tri('Hint: She was sleeping when I called.')], focusWords: ['was sleeping', 'called'] }),
    step({ id: 'past_simple_cont_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'event_when_background', sentence: 'The phone ___ while I was sleeping.', translation: tri('The phone rang while I was sleeping.'), options: ['rang', 'was ringing', 'ringing', 'was rang'], correctAnswer: 'rang', correctFeedback: tri('Yes. The phone rang is the short event; while I was sleeping is the background.'), wrong: { 'was ringing': tri('Was ringing can be a longer process, but here the phone event interrupted sleep: rang.'), ringing: tri('Ringing without was/were is incomplete, and here the event is rang.'), 'was rang': tri('Was rang is not correct. For the short event use rang.') }, retryFeedback: [tri('What happened? The phone rang.'), tri('The phone rang while I was sleeping.'), tri('Hint: The phone rang while I was sleeping.')], focusWords: ['rang', 'while'] }),
    step({ id: 'past_simple_cont_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'arrived_interrupting_action', sentence: 'They ___ a film when I arrived.', translation: tri('They were watching a film when I arrived.'), options: ['were watching', 'watched', 'watch', 'were watched'], correctAnswer: 'were watching', correctFeedback: tri('Yes. They were in the process of watching when I arrived.'), wrong: { watched: tri('Watched sounds like a completed fact. Here it was background: were watching.'), watch: tri('Watch is base/present form. Use were watching.'), 'were watched': tri('Were watched is passive. For the active process use were watching.') }, retryFeedback: [tri('Background at arrival = were watching.'), tri('They were watching a film.'), tri('Hint: They were watching a film when I arrived.')], focusWords: ['were watching', 'arrived'] }),
    step({ id: 'past_simple_cont_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'while_background', sentence: 'While I ___, she was studying.', translation: tri('While I was cooking, she was studying.'), options: ['was cooking', 'cooked', 'cook', 'was cooked'], correctAnswer: 'was cooking', correctFeedback: tri('Yes. While introduces a continuing background process: I was cooking.'), wrong: { cooked: tri('Cooked is a fact. Here two activities continued in parallel: was cooking.'), cook: tri('Cook is base form. Use was cooking.'), 'was cooked': tri('Was cooked is passive. For active cooking use was cooking.') }, retryFeedback: [tri('While + process = was cooking.'), tri('While I was cooking.'), tri('Hint: While I was cooking, she was studying.')], focusWords: ['while', 'was cooking'] }),
    step({ id: 'past_simple_cont_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'two_parallel_actions', sentence: 'While we ___ dinner, they were watching TV.', translation: tri('While we were having dinner, they were watching TV.'), options: ['were having', 'had', 'have', 'were had'], correctAnswer: 'were having', correctFeedback: tri('Yes. Two activities continued in parallel. We needs were: were having.'), wrong: { had: tri('Had can be a fact, but while + parallel process calls for were having.'), have: tri('Have is present/base form. Use were having.'), 'were had': tri('Were had is not correct. After were use having.') }, retryFeedback: [tri('We + were + having.'), tri('We were having dinner.'), tri('Hint: While we were having dinner, they were watching TV.')], focusWords: ['were having', 'while'] }),
    step({ id: 'past_simple_cont_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'while_pair', sentence: 'Choose the correct pair.', translation: tri('while I was working / when he called'), options: ['while I was working / when he called', 'while I worked / when he was calling', 'while I was worked / when he was called', 'while I working / when he calling'], correctAnswer: 'while I was working / when he called', correctFeedback: tri('Yes. While introduces the background process; when introduces the short event.'), wrong: { 'while I worked / when he was calling': tri('The background is better as I was working, and the short event is he called.'), 'while I was worked / when he was called': tri('Was worked/was called do not fit these active actions.'), 'while I working / when he calling': tri('Missing was and the Past Simple event form. Use I was working / he called.') }, retryFeedback: [tri('While = was working. When = called.'), tri('While I was working / when he called.'), tri('Hint: while I was working / when he called.')], focusWords: ['while', 'when'] }),
    step({ id: 'past_simple_cont_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'sequence_past_simple', sentence: 'I came home, opened the door, and ___ her.', translation: tri('I came home, opened the door, and called her.'), options: ['called', 'was calling', 'calling', 'was called'], correctAnswer: 'called', correctFeedback: tri('Yes. This is a sequence of completed actions: came, opened, called.'), wrong: { 'was calling': tri('Was calling is a background process. Here the actions happen one after another: called.'), calling: tri('Calling without was/were is incomplete, and in this sequence use called.'), 'was called': tri('Was called is passive. Here the active action is called her.') }, retryFeedback: [tri('Sequence = came, opened, called.'), tri('I called her.'), tri('Hint: I came home, opened the door, and called her.')], focusWords: ['sequence', 'called'] }),
    step({ id: 'past_simple_cont_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'background_then_event', sentence: 'I ___ when she arrived.', translation: tri('I was cooking when she arrived.'), options: ['was cooking', 'cooked', 'cook', 'was cooked'], correctAnswer: 'was cooking', correctFeedback: tri('Yes. Cooking was the process in progress when she arrived.'), wrong: { cooked: tri('Cooked is a fact. Here cooking was the background: was cooking.'), cook: tri('Cook is base form. Use was cooking.'), 'was cooked': tri('Was cooked means something was prepared. For I cooked as a process, use was cooking.') }, retryFeedback: [tri('Background = was cooking. Event = arrived.'), tri('I was cooking when she arrived.'), tri('Hint: I was cooking when she arrived.')], focusWords: ['was cooking', 'arrived'] }),
    step({ id: 'past_simple_cont_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'event_during_background', sentence: 'He ___ while we were talking.', translation: tri('He came in while we were talking.'), options: ['came in', 'was coming in', 'coming in', 'was came in'], correctAnswer: 'came in', correctFeedback: tri('Yes. Came in is the short event on the background of talking.'), wrong: { 'was coming in': tri('Was coming in can show a process of entering, but here the neutral event is came in.'), 'coming in': tri('Coming in without was/were is incomplete, and here use came in.'), 'was came in': tri('Was came in is not correct. Use came in for the event.') }, retryFeedback: [tri('What happened? He came in.'), tri('He came in while we were talking.'), tri('Hint: He came in while we were talking.')], focusWords: ['came in', 'while'] }),
    step({ id: 'past_simple_cont_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_interruption_pair', sentence: 'Choose the correct pair.', translation: tri('She was sleeping when I called / I called her yesterday'), options: ['She was sleeping when I called / I called her yesterday', 'She slept when I was calling / I was calling her yesterday', 'She was slept when I called / I called was her yesterday', 'She sleeping when I called / I calling her yesterday'], correctAnswer: 'She was sleeping when I called / I called her yesterday', correctFeedback: tri('Yes. Background = was sleeping, event/fact = called.'), wrong: { 'She slept when I was calling / I was calling her yesterday': tri('Sleep was the background and the call was the event. The separate fact yesterday is called.'), 'She was slept when I called / I called was her yesterday': tri('Was slept and called was are wrong forms.'), 'She sleeping when I called / I calling her yesterday': tri('Missing was for the background and the Past Simple form for the event.') }, retryFeedback: [tri('Was sleeping when called / called yesterday.'), tri('She was sleeping when I called / I called her yesterday.'), tri('Hint: She was sleeping when I called / I called her yesterday.')], focusWords: ['was sleeping', 'called'] }),
    step({ id: 'past_simple_cont_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_sequence_background', sentence: 'Choose the correct sentence.', translation: tri('I entered the room, and they were watching TV.'), options: ['I entered the room, and they were watching TV.', 'I was entering the room, and they watched TV.', 'I entered the room, and they watched TV.', 'I was entered the room, and they were watched TV.'], correctAnswer: 'I entered the room, and they were watching TV.', correctFeedback: tri('Yes. Entered is the event. Were watching is the process already in progress.'), wrong: { 'I was entering the room, and they watched TV.': tri('Entering is usually the event here, and watching TV was the background: entered / were watching.'), 'I entered the room, and they watched TV.': tri('They watched TV sounds like a completed fact. Here they were in the process: were watching.'), 'I was entered the room, and they were watched TV.': tri('Was entered / were watched are passive-like forms and do not fit these active actions.') }, retryFeedback: [tri('Entered = event. Were watching = background.'), tri('I entered / they were watching.'), tri('Hint: I entered the room, and they were watching TV.')], focusWords: ['entered', 'were watching'] }),
    step({ id: 'past_simple_cont_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('When I came home, my wife was cooking dinner, and the baby was sleeping.'), options: ['When I came home, my wife was cooking dinner, and the baby was sleeping.', 'When I was coming home, my wife cooked dinner, and the baby slept.', 'When I came home, my wife was cooked dinner, and the baby was slept.', 'When I coming home, my wife cooking dinner, and the baby sleeping.'], correctAnswer: 'When I came home, my wife was cooking dinner, and the baby was sleeping.', correctFeedback: tri('Yes. Came home is the event; was cooking and was sleeping are background processes.'), wrong: { 'When I was coming home, my wife cooked dinner, and the baby slept.': tri('Coming home is the event here; cooking and sleeping were background processes.'), 'When I came home, my wife was cooked dinner, and the baby was slept.': tri('Was cooked / was slept do not fit active background processes. Use was cooking / was sleeping.'), 'When I coming home, my wife cooking dinner, and the baby sleeping.': tri('This misses came, was cooking, and was sleeping.') }, retryFeedback: [tri('Came home + was cooking + was sleeping.'), tri('When I came home, she was cooking, and the baby was sleeping.'), tri('Hint: When I came home, my wife was cooking dinner, and the baby was sleeping.')], focusWords: ['came home', 'was cooking', 'was sleeping'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'past_continuous_instead_of_past_simple_fact_error',
      'past_simple_instead_of_background_process_error',
      'wrong_when_while_structure_error',
      'was_were_plus_past_error',
      'missing_was_were_process_error',
      'interrupted_action_confusion_error',
      'parallel_actions_error',
      'time_marker_misread_error',
      'sequence_vs_background_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Normal explanation: identify whether the action is a fact, short event, or background process.'),
    depth2: tri('Simpler: ask "what happened?" or "what was happening at that moment?".'),
    depth3: tri('Even simpler: compare I worked yesterday / I was working when he called.'),
    depth4: tri('Almost a hint: point directly to Past Simple or Past Continuous.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri('Past Simple = what happened or what someone did. Past Continuous = what was happening at that moment. Background = was/were + -ing. Short event or sequence = Past Simple.'),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_action_role_hint_then_retry',
      card: tri('Hint: the system shows whether the action is background, process, short event, or sequence, but does not choose the form for the user.'),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri('Guided mode: first choose background or event. Then choose Past Simple or was/were + -ing.'),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_past_simple_cont_001', prompt: tri('At 8 yesterday shows a day fact or a process in a specific moment?'), options: ['day fact', 'process in a specific moment'], correctIndex: 1, thenReturnToExerciseId: 'past_simple_cont_easy_002' },
      { id: 'guided_past_simple_cont_002', prompt: tri('In "She was sleeping when I called", what is the background?'), options: ['was sleeping', 'called'], correctIndex: 0, thenReturnToExerciseId: 'past_simple_cont_contrast_001' },
      { id: 'guided_past_simple_cont_003', prompt: tri('In "The phone rang while I was sleeping", what is the short event?'), options: ['rang', 'was sleeping'], correctIndex: 0, thenReturnToExerciseId: 'past_simple_cont_contrast_002' },
      { id: 'guided_past_simple_cont_004', prompt: tri('If actions happen one after another, which tense is more common?'), options: ['Past Simple', 'Past Continuous'], correctIndex: 0, thenReturnToExerciseId: 'past_simple_cont_mixed_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'past_simple_vs_past_continuous',
    diagnosisLabel: tri('Past Simple vs Past Continuous', 'Past Simple vs Past Continuous'),
    contrastSet: SMART_CONTRAST,
    difficultyLevel: 2,
    focusWords: ['worked', 'was working', 'called', 'was sleeping', 'rang', 'while', 'when', 'entered', 'were watching'],
    focusPatterns: [
      'past_simple_fact',
      'past_continuous_at_time',
      'fact_vs_process_pair',
      'background_when_event',
      'event_when_background',
      'arrived_interrupting_action',
      'while_background',
      'two_parallel_actions',
      'while_pair',
      'sequence_past_simple',
      'background_then_event',
      'event_during_background',
      'mixed_interruption_pair',
      'mixed_sequence_background',
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
      microDiagnosisId: 'past_simple_vs_past_continuous',
      contrastSet: ['past simple', 'past continuous', 'background', 'event', 'when', 'while'],
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logActionRole: true,
      logTimeMarker: true,
      logChosenTense: true,
      logProcessVsEvent: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=past_simple_vs_past_continuous',
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


