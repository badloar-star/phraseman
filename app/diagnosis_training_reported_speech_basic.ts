import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = ['said that', 'told someone that', 'asked if', 'asked what', 'pronoun shift', 'tense backshift', 'reported question', 'direct speech'];
const SMART_CONTRAST = ['said that', 'told someone that', 'asked if', 'asked what', 'pronoun shift', 'tense backshift', 'reported question'];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri('First decide the source type: statement, yes/no question, or wh-question. Then change pronouns, backshift, and word order.'),
    depth2,
    depth3,
    depth4,
  ];
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
    explanationBlock: tri('Reported speech retells someone words as a normal sentence: pronouns change, tenses often backshift, and reported questions use statement word order.'),
    microTask: tri('Choose the reported-speech form that correctly changes pronouns, tense, reporting verb, or question order.'),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? tri(`Use ${input.correctAnswer}; reported speech needs normal sentence order and standard backshift.`)])),
    retryFeedback: retry(...input.retryFeedback),
    fallbackExplanation: tri('Statement: said that + normal order. Yes/no question: asked if + normal order. Wh-question: asked where/what/when + normal order. Told needs an object.'),
    focusWords: input.focusWords,
  };
}

export const REPORTED_SPEECH_BASIC_TRAINING: DiagnosisTraining = {
  id: 'reported_speech_basic',
  category: 'syntax',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 53,
  supportedLocales: ['ru', 'uk'],
  title: tri('Reported Speech: he said that...', 'Reported Speech: he said that...'),
  shortTitle: tri('Reported Speech', 'Reported Speech'),
  shortDiagnosis: tri('You are leaving direct-speech pronouns, tense, or question order inside reported speech.'),
  diagnosisText: tri('You are mixing direct speech and reported speech: keeping quote-like word order, not shifting pronouns, using question order after asked, or missing standard backshift.'),
  mentalModel: tri('Direct speech is a quote: He said, "I am tired." Reported speech is retelling: He said that he was tired. It works like a normal sentence.'),
  contrastSet: CONTRAST,
  coreRule: tri('Statement: He said, "I am tired" -> He said that he was tired. Told needs object: He told me that he was tired. Yes/no question: He asked if I was busy. Wh-question: He asked where I lived.'),
  whatUserMustLearn: {
    ru: [
      'Reported speech retells words, not as an exact quote.',
      'After said, that is common: He said that he was tired.',
      'Told needs an object: He told me that he was tired.',
      'Pronouns change by meaning: I -> he/she, my -> his/her.',
      'With a past reporting verb, tenses often backshift: am/is -> was, will -> would, can -> could.',
      'Reported questions use normal word order.',
      'Yes/no questions use if or whether.',
      'Wh-questions keep the question word.',
      'Reported speech usually does not keep the question mark inside the clause.',
      'Backshift can sometimes be optional, but this basic trainer practices standard backshift.',
    ],
    uk: [
      'Reported speech retells words, not as an exact quote.',
      'After said, that is common: He said that he was tired.',
      'Told needs an object: He told me that he was tired.',
      'Pronouns change by meaning: I -> he/she, my -> his/her.',
      'With a past reporting verb, tenses often backshift: am/is -> was, will -> would, can -> could.',
      'Reported questions use normal word order.',
      'Yes/no questions use if or whether.',
      'Wh-questions keep the question word.',
      'Reported speech usually does not keep the question mark inside the clause.',
      'Backshift can sometimes be optional, but this basic trainer practices standard backshift.',
    ],
    es: [
      'Reported speech retells words.',
      'Use said that for statements.',
      'Told needs an object.',
      'Pronouns change by meaning.',
      'Past reporting verbs often cause backshift.',
      'Reported questions use normal word order.',
      'Yes/no questions use if/whether.',
      'Wh-questions keep the question word.',
      'Do not keep question order.',
      'This trainer practices standard backshift.',
    ],
  },
  examples: [
    { en: 'He said that he was tired.', ru: 'He said that he was tired.', uk: 'He said that he was tired.', es: 'He said that he was tired.', why: tri('I am tired becomes he was tired: pronoun and tense change.') },
    { en: 'She said that she was busy.', ru: 'She said that she was busy.', uk: 'She said that she was busy.', es: 'She said that she was busy.', why: tri('I am busy becomes she was busy after a past reporting verb.') },
    { en: 'He told me that he needed help.', ru: 'He told me that he needed help.', uk: 'He told me that he needed help.', es: 'He told me that he needed help.', why: tri('Told needs object me, and need backshifts to needed.') },
    { en: 'She said that she would call me.', ru: 'She said that she would call me.', uk: 'She said that she would call me.', es: 'She said that she would call me.', why: tri('Will often becomes would in reported speech.') },
    { en: 'He asked if I was busy.', ru: 'He asked if I was busy.', uk: 'He asked if I was busy.', es: 'He asked if I was busy.', why: tri('A yes/no question uses if and normal order: I was, not was I.') },
    { en: 'She asked where I lived.', ru: 'She asked where I lived.', uk: 'She asked where I lived.', es: 'She asked where I lived.', why: tri('Where stays, but the order becomes normal: I lived.') },
    { en: 'He asked me what I wanted.', ru: 'He asked me what I wanted.', uk: 'He asked me what I wanted.', es: 'He asked me what I wanted.', why: tri('What stays, do disappears, and wanted follows subject I.') },
    { en: "She said that she couldn't come.", ru: "She said that she couldn't come.", uk: "She said that she couldn't come.", es: "She said that she couldn't come.", why: tri("Can often becomes could; negative is couldn't.") },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('You may be retelling a sentence as if it were still a direct quote. Reported speech changes pronouns, word order, and often tense.') },
    { id: 'intro_rule', type: 'rule', text: tri('Statement: said that + normal order. Question: asked if/where/what + normal order.') },
    { id: 'intro_warning', type: 'warning', text: tri('Main mistakes: He said I am tired, He asked where did I live, He told that he was busy. Correct: He said he was tired, He asked where I lived, He told me that he was busy.') },
  ],
  steps: [
    step({ id: 'reported_easy_001', order: 1, difficulty: 'easy', targetSkill: 'said_he_was_tired', sentence: 'Direct: He said, "I am tired." Reported: He said that ___ tired.', translation: tri('He said that he was tired.'), options: ['he was', 'I am', 'he is', 'was he'], correctAnswer: 'he was', correctFeedback: tri('Yes. I -> he, am -> was. The result is he was tired.'), wrong: { 'I am': tri('You kept direct speech. In a report from he, use he was.'), 'he is': tri('The pronoun changed, but after said we usually backshift am/is to was.'), 'was he': tri('This is question order. In a reported statement, use normal order: he was.') }, retryFeedback: [tri('I am -> he was.'), tri('He said that he was tired.'), tri('Hint: He said that he was tired.')], focusWords: ['he was'] }),
    step({ id: 'reported_easy_002', order: 2, difficulty: 'easy', targetSkill: 'said_she_was_busy', sentence: 'Direct: She said, "I am busy." Reported: She said that ___ busy.', translation: tri('She said that she was busy.'), options: ['she was', 'I am', 'she is', 'was she'], correctAnswer: 'she was', correctFeedback: tri('Yes. I -> she, am -> was.'), wrong: { 'I am': tri('This is still direct speech. In reported speech, use she was.'), 'she is': tri('In basic reported speech after said, use was.'), 'was she': tri('Reported statements need normal order: she was, not was she.') }, retryFeedback: [tri('I am busy -> she was busy.'), tri('She said that she was busy.'), tri('Hint: She said that she was busy.')], focusWords: ['she was'] }),
    step({ id: 'reported_easy_003', order: 3, difficulty: 'easy', targetSkill: 'will_to_would', sentence: 'Direct: She said, "I will call you." Reported: She said that she ___ me.', translation: tri('She said that she would call me.'), options: ['would call', 'will call', 'called', 'would called'], correctAnswer: 'would call', correctFeedback: tri('Yes. Will often becomes would after said.'), wrong: { 'will call': tri('In basic reported speech, will backshifts to would.'), called: tri('Called changes the meaning. From will call, use would call.'), 'would called': tri('After would, use base verb call, not called.') }, retryFeedback: [tri('Will call -> would call.'), tri('She said that she would call me.'), tri('Hint: She said that she would call me.')], focusWords: ['would call'] }),
    step({ id: 'reported_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'told_me_object', sentence: 'He ___ that he needed help.', translation: tri('He told me that he needed help.'), options: ['told me', 'told', 'said me', 'said to me me'], correctAnswer: 'told me', correctFeedback: tri('Yes. Told needs an object: told me.'), wrong: { told: tri('Told usually needs an object. Use told me.'), 'said me': tri('Said me is wrong. Use told me, or said to me.'), 'said to me me': tri('Said to me me is wrong. Use told me or said to me.') }, retryFeedback: [tri('Tell -> told me.'), tri('He told me that he needed help.'), tri('Hint: He told me that he needed help.')], focusWords: ['told me'] }),
    step({ id: 'reported_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'said_not_said_me', sentence: 'She ___ that she was ready.', translation: tri('She said that she was ready.'), options: ['said', 'said me', 'told', 'told to'], correctAnswer: 'said', correctFeedback: tri('Yes. Said can be used without an object: She said that...'), wrong: { 'said me': tri('Said me is wrong. If you need an object, use told me or said to me.'), told: tri('Told needs an object: told me/her/us. Without an object, use said.'), 'told to': tri('Told to that is wrong. Use said that or told someone that.') }, retryFeedback: [tri('Said that. Told someone that.'), tri('She said that she was ready.'), tri('Hint: She said that she was ready.')], focusWords: ['said that'] }),
    step({ id: 'reported_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'can_to_could', sentence: 'Direct: She said, "I can\'t come." Reported: She said that she ___.', translation: tri("She said that she couldn't come."), options: ["couldn't come", "can't come", "couldn't came", "doesn't can come"], correctAnswer: "couldn't come", correctFeedback: tri("Yes. Can't often becomes couldn't after said."), wrong: { "can't come": tri("In basic reported speech, can't backshifts to couldn't."), "couldn't came": tri("After couldn't, use base verb come, not came."), "doesn't can come": tri("Doesn't can is wrong. Use couldn't come.") }, retryFeedback: [tri("Can't come -> couldn't come."), tri("She said that she couldn't come."), tri("Hint: She said that she couldn't come.")], focusWords: ["couldn't come"] }),
    step({ id: 'reported_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'asked_if_busy', sentence: 'Direct: He asked, "Are you busy?" Reported: He asked ___ busy.', translation: tri('He asked if I was busy.'), options: ['if I was', 'was I', 'if was I', 'that I am'], correctAnswer: 'if I was', correctFeedback: tri('Yes. A yes/no question uses if + normal order: if I was.'), wrong: { 'was I': tri('A reported yes/no question needs if, and no question order.'), 'if was I': tri('After if, use normal order: if I was, not if was I.'), 'that I am': tri('This is a yes/no question, so use if. Also basic backshift is am -> was.') }, retryFeedback: [tri('Are you busy? -> if I was busy.'), tri('He asked if I was busy.'), tri('Hint: He asked if I was busy.')], focusWords: ['asked if', 'I was'] }),
    step({ id: 'reported_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'asked_if_could_help', sentence: 'Direct: She asked, "Can you help me?" Reported: She asked if I ___ help her.', translation: tri('She asked if I could help her.'), options: ['could', 'can', 'did can', 'would can'], correctAnswer: 'could', correctFeedback: tri('Yes. Can often becomes could in reported speech.'), wrong: { can: tri('In this basic trainer, after asked, backshift can to could.'), 'did can': tri('Did can is wrong. Use modal could.'), 'would can': tri('Would can is wrong. Use could help.') }, retryFeedback: [tri('Can you help? -> if I could help.'), tri('She asked if I could help her.'), tri('Hint: She asked if I could help her.')], focusWords: ['if I could'] }),
    step({ id: 'reported_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'asked_if_finished', sentence: 'Direct: He asked, "Did you finish?" Reported: He asked if I ___.', translation: tri('He asked if I had finished.'), options: ['had finished', 'did finish', 'finished?', 'have finished'], correctAnswer: 'had finished', correctFeedback: tri('Yes. Did you finish? often becomes if I had finished in classic backshift.'), wrong: { 'did finish': tri('In a reported question, did usually disappears. Use normal order and backshift.'), 'finished?': tri('Reported speech usually does not keep a question mark inside the clause. Use had finished.'), 'have finished': tri('In classic reported speech after asked, use had finished.') }, retryFeedback: [tri('Did you finish? -> if I had finished.'), tri('He asked if I had finished.'), tri('Hint: He asked if I had finished.')], focusWords: ['if I had finished'] }),
    step({ id: 'reported_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'asked_where_i_lived', sentence: 'Direct: She asked, "Where do you live?" Reported: She asked where I ___.', translation: tri('She asked where I lived.'), options: ['lived', 'did live', 'do live', 'live?'], correctAnswer: 'lived', correctFeedback: tri('Yes. In a reported question, do disappears and the order is normal: where I lived.'), wrong: { 'did live': tri('In a reported question, did is not needed. Use where I lived.'), 'do live': tri('Do live keeps the direct question structure. Use lived.'), 'live?': tri('Reported speech does not keep question form here. Use lived.') }, retryFeedback: [tri('Where do you live? -> where I lived.'), tri('She asked where I lived.'), tri('Hint: She asked where I lived.')], focusWords: ['where I lived'] }),
    step({ id: 'reported_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'asked_what_i_wanted', sentence: 'Direct: He asked, "What do you want?" Reported: He asked what I ___.', translation: tri('He asked what I wanted.'), options: ['wanted', 'did want', 'want', 'do want'], correctAnswer: 'wanted', correctFeedback: tri('Yes. What do you want? becomes what I wanted.'), wrong: { 'did want': tri('Did/do is not needed in a reported question. Use normal order: I wanted.'), want: tri('For basic reported speech after asked, use wanted.'), 'do want': tri('Do want keeps question structure. Use wanted.') }, retryFeedback: [tri('What do you want? -> what I wanted.'), tri('He asked what I wanted.'), tri('Hint: He asked what I wanted.')], focusWords: ['what I wanted'] }),
    step({ id: 'reported_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'asked_when_i_would_arrive', sentence: 'Direct: She asked, "When will you arrive?" Reported: She asked when I ___.', translation: tri('She asked when I would arrive.'), options: ['would arrive', 'will arrive', 'would arrived', 'will I arrive'], correctAnswer: 'would arrive', correctFeedback: tri('Yes. Will -> would, with normal order: I would arrive.'), wrong: { 'will arrive': tri('In basic reported speech, will backshifts to would.'), 'would arrived': tri('After would, use base verb arrive, not arrived.'), 'will I arrive': tri('This is question order. In a reported question, use normal order: I would arrive.') }, retryFeedback: [tri('When will you arrive? -> when I would arrive.'), tri('She asked when I would arrive.'), tri('Hint: She asked when I would arrive.')], focusWords: ['when I would arrive'] }),
    step({ id: 'reported_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_statement_question_pair', sentence: 'Choose the correct pair.', translation: tri('He said that he was tired / He asked if I was busy'), options: ['He said that he was tired / He asked if I was busy', 'He said that I am tired / He asked was I busy', 'He told that he was tired / He asked if was I busy', 'He said he is tired / He asked that I am busy'], correctAnswer: 'He said that he was tired / He asked if I was busy', correctFeedback: tri('Yes. Statement uses said that. Yes/no question uses asked if + normal order.'), wrong: { 'He said that I am tired / He asked was I busy': tri('I am must become he was, and the reported question needs if I was.'), 'He told that he was tired / He asked if was I busy': tri('Told needs an object, and after if use normal order: if I was.'), 'He said he is tired / He asked that I am busy': tri('In basic reported speech, he is -> he was, and a yes/no question needs if, not that.') }, retryFeedback: [tri('Said he was / asked if I was.'), tri('He said that he was tired / He asked if I was busy.'), tri('Hint: He said that he was tired / He asked if I was busy.')], focusWords: ['said that', 'asked if'] }),
    step({ id: 'reported_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_wh_questions', sentence: 'Choose the correct pair.', translation: tri('She asked where I lived / He asked what I wanted'), options: ['She asked where I lived / He asked what I wanted', 'She asked where did I live / He asked what did I want', 'She asked where do I live / He asked what do I want', 'She asked where I live? / He asked what I want?'], correctAnswer: 'She asked where I lived / He asked what I wanted', correctFeedback: tri('Yes. Reported wh-questions use normal order: I lived, I wanted.'), wrong: { 'She asked where did I live / He asked what did I want': tri('Did is not needed in reported questions. Use normal order.'), 'She asked where do I live / He asked what do I want': tri('Do is not needed in reported questions. Use subject + verb.'), 'She asked where I live? / He asked what I want?': tri('Reported speech usually does not put a question mark inside the clause and this trainer uses backshift.') }, retryFeedback: [tri('Where I lived / what I wanted.'), tri('She asked where I lived / He asked what I wanted.'), tri('Hint: She asked where I lived / He asked what I wanted.')], focusWords: ['where I lived', 'what I wanted'] }),
    step({ id: 'reported_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri("She said that she couldn't come and asked when I would arrive."), options: ["She said that she couldn't come and asked when I would arrive.", "She said that she can't come and asked when will I arrive.", "She told that she couldn't came and asked when I will arrive.", 'She said that I couldn\'t come and asked when would I arrive.'], correctAnswer: "She said that she couldn't come and asked when I would arrive.", correctFeedback: tri("Yes. Can't -> couldn't, will -> would, and word order is normal: I would arrive."), wrong: { "She said that she can't come and asked when will I arrive.": tri("Can't should backshift to couldn't, and when will I arrive is question order."), "She told that she couldn't came and asked when I will arrive.": tri("Told needs an object, after couldn't use come, and will should backshift to would."), "She said that I couldn't come and asked when would I arrive.": tri("She spoke about herself: she couldn't come. In the reported question, use I would arrive.") }, retryFeedback: [tri("She couldn't come / when I would arrive."), tri("She said that she couldn't come and asked when I would arrive."), tri("Hint: She said that she couldn't come and asked when I would arrive.")], focusWords: ["couldn't come", 'when I would arrive'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['missing_pronoun_shift_error', 'missing_backshift_error', 'reported_question_word_order_error', 'did_in_reported_question_error', 'yes_no_question_missing_if_error', 'told_without_object_error', 'said_with_object_error', 'will_not_backshifted_error', 'can_not_backshifted_error', 'direct_speech_left_inside_report_error'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Normal explanation: show the direct phrase, who said it, and what changes in the report.'),
    depth2: tri('Simpler: ask whether this is a statement, yes/no question, or wh-question.'),
    depth3: tri('Even simpler: compare I am -> he was, will -> would, where do you live -> where I lived.'),
    depth4: tri('Almost a hint: point directly to said that, asked if, or asked where.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Reported speech is not a quote. Statement: said that + normal order. Yes/no question: asked if + normal order. Wh-question: asked where/what/when + normal order. Told needs object: told me.') },
    afterThreeWrongInSameExercise: { action: 'show_report_type_hint_then_retry', card: tri('Hint: the system shows the source type: statement, yes/no question, or wh-question, but does not choose the whole answer.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Guided mode: first choose the direct-speech type. Then choose said that, asked if, or asked where/what.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_reported_001', prompt: tri('He said, "I am tired." In the report, does I become he or I?'), options: ['he', 'I'], correctIndex: 0, thenReturnToExerciseId: 'reported_easy_001' },
      { id: 'guided_reported_002', prompt: tri('Told usually needs an object: told me or told that?'), options: ['told me', 'told that'], correctIndex: 0, thenReturnToExerciseId: 'reported_contrast_001' },
      { id: 'guided_reported_003', prompt: tri('Are you busy? In reported speech, choose asked if I was busy or asked was I busy.'), options: ['asked if I was busy', 'asked was I busy'], correctIndex: 0, thenReturnToExerciseId: 'reported_contrast_004' },
      { id: 'guided_reported_004', prompt: tri('Where do you live? In reported speech, choose where I lived or where did I live.'), options: ['where I lived', 'where did I live'], correctIndex: 0, thenReturnToExerciseId: 'reported_mixed_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'syntax',
    microDiagnosisId: 'reported_speech_basic',
    diagnosisLabel: tri('Reported Speech', 'Reported Speech'),
    contrastSet: SMART_CONTRAST,
    difficultyLevel: 2,
    focusWords: ['said that', 'told me', 'asked if', 'where I lived', 'would call'],
    focusPatterns: ['said_he_was_tired', 'said_she_was_busy', 'will_to_would', 'told_me_object', 'said_not_said_me', 'can_to_could', 'asked_if_busy', 'asked_if_could_help', 'asked_if_finished', 'asked_where_i_lived', 'asked_what_i_wanted', 'asked_when_i_would_arrive', 'mixed_statement_question_pair', 'mixed_wh_questions', 'mixed_sentence_correction'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
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
    payload: { category: 'syntax', microDiagnosisId: 'reported_speech_basic', contrastSet: ['said that', 'told me', 'asked if', 'reported question', 'backshift'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logReportType: true, logReportingVerb: true, logPronounShift: true, logBackshift: true, logReportedQuestionOrder: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=syntax&microDiagnosisId=reported_speech_basic',
    problemCoachRoute: '/problem_coach?category=syntax&microDiagnosisId=reported_speech_basic',
    fallbackIfTrainingMissing: '/problem_coach?category=syntax',
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
