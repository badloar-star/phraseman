import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = ['if + past simple', 'would + base verb', 'unreal present', 'unlikely future', 'if I were', 'if I had', "wouldn't", 'first vs second conditional'];
const SMART_CONTRAST = ['if + past simple', 'would + base verb', 'unreal present', 'unlikely future', 'if I were', 'if I had', "wouldn't"];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri('First decide whether this is real future or unreal "if I had / if I were". Then use would + base verb for the result.'),
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
    explanationBlock: tri('Second Conditional uses if + Past Simple for an unreal or unlikely condition, and would + base verb for the imagined result.'),
    microTask: tri('Choose the form for the unreal condition or the would-result.'),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? tri(`Use ${input.correctAnswer}; Second Conditional uses if + past simple and would + base verb.`)])),
    retryFeedback: retry(...input.retryFeedback),
    fallbackExplanation: tri('Second Conditional = "if it were / if I had" imagination: If I had time, I would call. No will/would in the if-clause; no to after would.'),
    focusWords: input.focusWords,
  };
}

export const CONDITION_SECOND_BASIC_TRAINING: DiagnosisTraining = {
  id: 'condition_second_basic',
  category: 'syntax',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 51,
  supportedLocales: ['ru', 'uk'],
  title: tri('Second Conditional: unreal if', 'Second Conditional: unreal if'),
  shortTitle: tri('Second Conditional', 'Second Conditional'),
  shortDiagnosis: tri('You are mixing real future if with unreal "if I had / I would", often putting will or would in the if-clause.'),
  diagnosisText: tri('You are mixing Second Conditional with First Conditional. Second Conditional is not a real future plan; it is an imagined, unlikely, or unreal situation.'),
  mentalModel: tri('Second Conditional = if + Past Simple, would + base verb. If I had more time, I would study more. The past form after if shows distance from reality, not normal past time.'),
  contrastSet: CONTRAST,
  coreRule: tri('Second Conditional: If + Past Simple, would + base verb. If I had money, I would buy a car. With be, the strong learning form is were: If I were you, I would wait.'),
  whatUserMustLearn: {
    ru: [
      'Second Conditional is for imagined, unreal, or unlikely situations.',
      'Formula: if + Past Simple, would + base verb.',
      'Do not put will after if in Second Conditional.',
      'Use would in the main result clause.',
      'After would, use base verb: would go, would help, would buy.',
      'Past Simple after if can show unreality, not real past time.',
      'If I were you is the standard advice pattern.',
      'Were is often used with all subjects in unreal if-clauses.',
      'First Conditional: If I have time, I will call you.',
      'Second Conditional: If I had time, I would call you.',
    ],
    uk: [
      'Second Conditional is for imagined, unreal, or unlikely situations.',
      'Formula: if + Past Simple, would + base verb.',
      'Do not put will after if in Second Conditional.',
      'Use would in the main result clause.',
      'After would, use base verb: would go, would help, would buy.',
      'Past Simple after if can show unreality, not real past time.',
      'If I were you is the standard advice pattern.',
      'Were is often used with all subjects in unreal if-clauses.',
      'First Conditional: If I have time, I will call you.',
      'Second Conditional: If I had time, I would call you.',
    ],
    es: [
      'Second Conditional is for unreal situations.',
      'Use if + Past Simple, would + base verb.',
      'Do not put will after if.',
      'Use would in the result.',
      'After would, use base verb.',
      'Past Simple can show unreality.',
      'Use If I were you for advice.',
      'Were is common in unreal if-clauses.',
      'First uses have/will.',
      'Second uses had/would.',
    ],
  },
  examples: [
    { en: 'If I had more time, I would study more.', ru: 'If I had more time, I would study more.', uk: 'If I had more time, I would study more.', es: 'If I had more time, I would study more.', why: tri('Had shows an imagined condition; would study is the imagined result.') },
    { en: 'If I were you, I would wait.', ru: 'If I were you, I would wait.', uk: 'If I were you, I would wait.', es: 'If I were you, I would wait.', why: tri('If I were you is unreal advice, and would takes base verb wait.') },
    { en: 'If she knew the answer, she would tell us.', ru: 'If she knew the answer, she would tell us.', uk: 'If she knew the answer, she would tell us.', es: 'If she knew the answer, she would tell us.', why: tri('Knew is the unreal condition; would tell is the result.') },
    { en: 'If he had money, he would buy a car.', ru: 'If he had money, he would buy a car.', uk: 'If he had money, he would buy a car.', es: 'If he had money, he would buy a car.', why: tri('The condition is unreal or unlikely now, so use had + would buy.') },
    { en: 'I would help you if I could.', ru: 'I would help you if I could.', uk: 'I would help you if I could.', es: 'I would help you if I could.', why: tri('The if-clause can come second; could shows imagined ability.') },
    { en: 'If it rained tomorrow, we would stay home.', ru: 'If it rained tomorrow, we would stay home.', uk: 'If it rained tomorrow, we would stay home.', es: 'If it rained tomorrow, we would stay home.', why: tri('This is less likely or imagined, not a normal real forecast.') },
    { en: 'If I had time, I would call you.', ru: 'If I had time, I would call you.', uk: 'If I had time, I would call you.', es: 'If I had time, I would call you.', why: tri('Had time does not mean past here; it marks an unreal condition now.') },
    { en: 'If I have time, I will call you.', ru: 'If I have time, I will call you.', uk: 'If I have time, I will call you.', es: 'If I have time, I will call you.', why: tri('This is First Conditional: a real future possibility. Compare it with If I had time.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('You may be trying to say "if I had / if I were", but building it like a real future condition. English separates real if and unreal if.') },
    { id: 'intro_rule', type: 'rule', text: tri('Second Conditional: If + Past Simple, would + base verb. If I had time, I would call you.') },
    { id: 'intro_warning', type: 'warning', text: tri('Main mistakes: If I will have money, I would buy. If I had money, I would to buy. Correct: If I had money, I would buy.') },
  ],
  steps: [
    step({ id: 'cond_second_easy_001', order: 1, difficulty: 'easy', targetSkill: 'if_had_would_study', sentence: 'If I had more time, I ___ more.', translation: tri('If I had more time, I would study more.'), options: ['would study', 'will study', 'study', 'would studied'], correctAnswer: 'would study', correctFeedback: tri('Yes. Second Conditional: if I had, I would study.'), wrong: { 'will study': tri('Will study fits a real future condition. Here it means "if I had", so use would study.'), study: tri('Study without would does not mean "I would study". Use would study.'), 'would studied': tri('After would, use base verb study, not studied.') }, retryFeedback: [tri('If I had = would study.'), tri('I would study more.'), tri('Hint: If I had more time, I would study more.')], focusWords: ['if I had', 'would study'] }),
    step({ id: 'cond_second_easy_002', order: 2, difficulty: 'easy', targetSkill: 'if_had_would_buy', sentence: 'If he had money, he ___ a car.', translation: tri('If he had money, he would buy a car.'), options: ['would buy', 'will buy', 'buys', 'would bought'], correctAnswer: 'would buy', correctFeedback: tri('Yes. The imagined result uses would + base verb: would buy.'), wrong: { 'will buy': tri('Will buy sounds like real future. Here it is unreal, so use would buy.'), buys: tri('Buys does not express "he would buy". Use would buy.'), 'would bought': tri('After would, use buy, not bought.') }, retryFeedback: [tri('He would buy.'), tri('If he had money, he would buy a car.'), tri('Hint: If he had money, he would buy a car.')], focusWords: ['if he had', 'would buy'] }),
    step({ id: 'cond_second_easy_003', order: 3, difficulty: 'easy', targetSkill: 'if_knew_would_tell', sentence: 'If she knew the answer, she ___ us.', translation: tri('If she knew the answer, she would tell us.'), options: ['would tell', 'will tell', 'tells', 'would tells'], correctAnswer: 'would tell', correctFeedback: tri('Yes. If she knew is an imagined condition. The result is would tell.'), wrong: { 'will tell': tri('Will tell fits real future. Here it means "if she knew", so use would tell.'), tells: tri('Tells does not mean "she would tell". Use would tell.'), 'would tells': tri('After would, do not add -s. Use would tell.') }, retryFeedback: [tri('Would + tell.'), tri('She would tell us.'), tri('Hint: If she knew the answer, she would tell us.')], focusWords: ['if she knew', 'would tell'] }),
    step({ id: 'cond_second_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'no_will_in_if', sentence: 'Choose the correct sentence.', translation: tri('If I had money, I would buy a house.'), options: ['If I had money, I would buy a house.', 'If I would have money, I would buy a house.', 'If I will have money, I would buy a house.', 'If I had money, I would to buy a house.'], correctAnswer: 'If I had money, I would buy a house.', correctFeedback: tri('Yes. If I had + I would buy. No will/would in the if-clause.'), wrong: { 'If I would have money, I would buy a house.': tri('In the Second Conditional if-clause, do not use would. Use If I had money.'), 'If I will have money, I would buy a house.': tri('Will does not go in this if-clause. Use If I had money.'), 'If I had money, I would to buy a house.': tri('After would, do not use to. Use would buy.') }, retryFeedback: [tri('If I had money, I would buy.'), tri('If I had money, I would buy a house.'), tri('Hint: If I had money, I would buy a house.')], focusWords: ['if I had', 'would buy'] }),
    step({ id: 'cond_second_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'if_i_could_would_help', sentence: 'I would help you if I ___.', translation: tri('I would help you if I could.'), options: ['could', 'can', 'will can', 'would can'], correctAnswer: 'could', correctFeedback: tri('Yes. If I could = if I were able to, in an unreal condition.'), wrong: { can: tri('Can sounds like real ability now. For "if I could", use could.'), 'will can': tri('Will can is wrong. In this if-clause, use could.'), 'would can': tri('Would can is wrong. In this if-clause, use could.') }, retryFeedback: [tri('If I could.'), tri('I would help you if I could.'), tri('Hint: I would help you if I could.')], focusWords: ['would help', 'if I could'] }),
    step({ id: 'cond_second_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'if_rained_would_stay', sentence: 'If it ___ tomorrow, we would stay home.', translation: tri('If it rained tomorrow, we would stay home.'), options: ['rained', 'rains', 'will rain', 'would rain'], correctAnswer: 'rained', correctFeedback: tri('Yes. Imagined condition: if it rained. Result: would stay.'), wrong: { rains: tri('If it rains belongs with First Conditional: If it rains, we will stay. Here with would, use rained.'), 'will rain': tri('Do not put will after if. For Second Conditional, use rained.'), 'would rain': tri('Do not put would in the if-clause. Use If it rained.') }, retryFeedback: [tri('If it rained, we would stay.'), tri('If it rained tomorrow, we would stay home.'), tri('Hint: If it rained tomorrow, we would stay home.')], focusWords: ['if it rained', 'would stay'] }),
    step({ id: 'cond_second_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'would_base_no_to', sentence: 'I would ___ there.', translation: tri('I would go there.'), options: ['go', 'to go', 'went', 'going'], correctAnswer: 'go', correctFeedback: tri('Yes. After would, use base verb: would go.'), wrong: { 'to go': tri('After would, do not use to. Use would go.'), went: tri('After would, do not use past form. Use go.'), going: tri('Would going is wrong. Use would go.') }, retryFeedback: [tri('Would + base verb.'), tri('I would go there.'), tri('Hint: I would go there.')], focusWords: ['would go'] }),
    step({ id: 'cond_second_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'would_help_base', sentence: 'She would ___ us.', translation: tri('She would help us.'), options: ['help', 'helps', 'helped', 'to help'], correctAnswer: 'help', correctFeedback: tri('Yes. After would, the verb does not change: would help.'), wrong: { helps: tri('After would, do not add -s. Use help.'), helped: tri('After would, do not use helped. Use help.'), 'to help': tri('After would, do not use to. Use would help.') }, retryFeedback: [tri('Would help, not helps/helped/to help.'), tri('She would help us.'), tri('Hint: She would help us.')], focusWords: ['would help'] }),
    step({ id: 'cond_second_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'wouldnt_go', sentence: 'I ___ there if I were you.', translation: tri("I wouldn't go there if I were you."), options: ["wouldn't go", "wouldn't went", "don't go", "won't went"], correctAnswer: "wouldn't go", correctFeedback: tri("Yes. Negative result = wouldn't + base verb go."), wrong: { "wouldn't went": tri("After wouldn't, use go, not went."), "don't go": tri("Don't go is a command or present form. Here use wouldn't go."), "won't went": tri("Won't went is wrong and not Second Conditional. Use wouldn't go.") }, retryFeedback: [tri("Would not = wouldn't go."), tri("I wouldn't go there."), tri("Hint: I wouldn't go there if I were you.")], focusWords: ["wouldn't go", 'if I were'] }),
    step({ id: 'cond_second_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'if_i_were_you', sentence: 'If I ___ you, I would wait.', translation: tri('If I were you, I would wait.'), options: ['were', 'was', 'am', 'will be'], correctAnswer: 'were', correctFeedback: tri('Yes. The standard advice form is If I were you.'), wrong: { was: tri('Was is heard in speech, but the strong learning form is If I were you.'), am: tri('If I am you is not meaningful here. Use were for the unreal condition.'), 'will be': tri('Will be does not fit after if in this structure. Use were.') }, retryFeedback: [tri('Advice = If I were you.'), tri('If I were you, I would wait.'), tri('Hint: If I were you, I would wait.')], focusWords: ['if I were you', 'would wait'] }),
    step({ id: 'cond_second_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'if_he_were', sentence: 'If he ___ here, he would help us.', translation: tri('If he were here, he would help us.'), options: ['were', 'is', 'will be', 'would be'], correctAnswer: 'were', correctFeedback: tri('Yes. In an unreal if-clause with be, use were: If he were here.'), wrong: { is: tri('Is makes the condition real/present. Here "if he were" is unreal.'), 'will be': tri('Do not use will be in the if-clause of Second Conditional.'), 'would be': tri('Would normally belongs in the main clause, not the if-clause. Use If he were here.') }, retryFeedback: [tri('If he were here.'), tri('If he were here, he would help us.'), tri('Hint: If he were here, he would help us.')], focusWords: ['if he were', 'would help'] }),
    step({ id: 'cond_second_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'advice_if_i_were_you', sentence: 'Choose the best advice sentence.', translation: tri('If I were you, I would talk to him.'), options: ['If I were you, I would talk to him.', 'If I am you, I will talk to him.', 'If I would be you, I would talk to him.', 'If I were you, I would to talk to him.'], correctAnswer: 'If I were you, I would talk to him.', correctFeedback: tri('Yes. Standard advice: If I were you, I would talk.'), wrong: { 'If I am you, I will talk to him.': tri('If I am you is not meaningful. For advice, use If I were you.'), 'If I would be you, I would talk to him.': tri('Do not put would in the if-clause. Use If I were you.'), 'If I were you, I would to talk to him.': tri('After would, do not use to. Use would talk.') }, retryFeedback: [tri('If I were you, I would talk.'), tri('If I were you, I would talk to him.'), tri('Hint: If I were you, I would talk to him.')], focusWords: ['if I were you', 'would talk'] }),
    step({ id: 'cond_second_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'first_vs_second_pair', sentence: 'Choose the correct pair.', translation: tri('If I have time, I will call / If I had time, I would call'), options: ['If I have time, I will call / If I had time, I would call', 'If I had time, I will call / If I have time, I would call', 'If I will have time, I will call / If I would have time, I would call', 'If I have time, I would called / If I had time, I will called'], correctAnswer: 'If I have time, I will call / If I had time, I would call', correctFeedback: tri('Yes. Real future = have/will. Unreal if = had/would.'), wrong: { 'If I had time, I will call / If I have time, I would call': tri('The forms are mixed. First: have + will. Second: had + would.'), 'If I will have time, I will call / If I would have time, I would call': tri('Do not put will/would in the if-clause. Use have/had.'), 'If I have time, I would called / If I had time, I will called': tri('Would/will need base verb call, not called. The result forms are mixed.') }, retryFeedback: [tri('First: have/will. Second: had/would.'), tri('If I have, I will / If I had, I would.'), tri('Hint: If I have time, I will call / If I had time, I would call.')], focusWords: ['if I have', 'will call', 'if I had', 'would call'] }),
    step({ id: 'cond_second_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_second_conditional_set', sentence: 'Choose the correct set.', translation: tri('if I were / if she knew / if he had'), options: ['if I were / if she knew / if he had', 'if I am / if she knows / if he has', 'if I would be / if she would know / if he would have', 'if I will be / if she will know / if he will have'], correctAnswer: 'if I were / if she knew / if he had', correctFeedback: tri('Yes. Second Conditional uses Past Simple forms in the if-clause.'), wrong: { 'if I am / if she knows / if he has': tri('These are real/present forms. For unreal "if", use were/knew/had.'), 'if I would be / if she would know / if he would have': tri('Do not put would in the if-clause. Would belongs in the result.'), 'if I will be / if she will know / if he will have': tri('Will does not express "if I were / if she knew" and does not go in the if-clause.') }, retryFeedback: [tri('Unreal if = were/knew/had.'), tri('If I were / if she knew / if he had.'), tri('Hint: if I were / if she knew / if he had.')], focusWords: ['if I were', 'if she knew', 'if he had'] }),
    step({ id: 'cond_second_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('If I knew his number, I would call him.'), options: ['If I knew his number, I would call him.', 'If I know his number, I will call him.', 'If I would know his number, I would call him.', 'If I knew his number, I would to call him.'], correctAnswer: 'If I knew his number, I would call him.', correctFeedback: tri('Yes. If I knew + I would call. This is an imagined situation.'), wrong: { 'If I know his number, I will call him.': tri('This is First Conditional. The needed meaning is "if I knew".'), 'If I would know his number, I would call him.': tri('Do not put would in the if-clause. Use If I knew.'), 'If I knew his number, I would to call him.': tri('After would, do not use to. Use would call.') }, retryFeedback: [tri('If I knew, I would call.'), tri('If I knew his number, I would call him.'), tri('Hint: If I knew his number, I would call him.')], focusWords: ['if I knew', 'would call'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['will_in_if_second_conditional_error', 'would_in_if_clause_error', 'missing_would_main_clause_error', 'would_to_error', 'would_plus_past_error', 'first_second_conditional_confusion', 'if_i_was_instead_of_were_error', 'past_simple_literal_past_confusion', 'wrong_unreal_condition_form_error'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Normal explanation: show the unreal condition and the would-result.'),
    depth2: tri('Simpler: ask whether this is a real future possibility or "if I had / if I were".'),
    depth3: tri('Even simpler: compare If I have, I will / If I had, I would.'),
    depth4: tri('Almost a hint: point directly to if + past simple and would + base verb.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Second Conditional = unreal "if". Formula: If + Past Simple, would + base verb. No will/would in the if-clause. No to after would.') },
    afterThreeWrongInSameExercise: { action: 'show_unreal_condition_hint_then_retry', card: tri('Hint: the system shows whether this is a real condition or unreal "if", but does not choose the whole form.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Guided mode: first choose real or unreal condition. Then choose the if-form and would-result.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_cond_second_001', prompt: tri('If I had more time, I would study more: is this real future or unreal if?'), options: ['real future', 'unreal if'], correctIndex: 1, thenReturnToExerciseId: 'cond_second_easy_001' },
      { id: 'guided_cond_second_002', prompt: tri('In Second Conditional after if, which is right: had or will have?'), options: ['had', 'will have'], correctIndex: 0, thenReturnToExerciseId: 'cond_second_contrast_001' },
      { id: 'guided_cond_second_003', prompt: tri('After would, which is right: go or to go?'), options: ['go', 'to go'], correctIndex: 0, thenReturnToExerciseId: 'cond_second_contrast_004' },
      { id: 'guided_cond_second_004', prompt: tri('For advice "in your place", which learning form is standard?'), options: ['If I was you', 'If I were you'], correctIndex: 1, thenReturnToExerciseId: 'cond_second_mixed_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'syntax',
    microDiagnosisId: 'condition_second_basic',
    diagnosisLabel: tri('Second Conditional', 'Second Conditional'),
    contrastSet: SMART_CONTRAST,
    difficultyLevel: 2,
    focusWords: ['if I had', 'would study', 'if I were you', 'would buy', 'would call'],
    focusPatterns: ['if_had_would_study', 'if_had_would_buy', 'if_knew_would_tell', 'no_will_in_if', 'if_i_could_would_help', 'if_rained_would_stay', 'would_base_no_to', 'would_help_base', 'wouldnt_go', 'if_i_were_you', 'if_he_were', 'advice_if_i_were_you', 'first_vs_second_pair', 'mixed_second_conditional_set', 'mixed_sentence_correction'],
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
    payload: { category: 'syntax', microDiagnosisId: 'condition_second_basic', contrastSet: ['second conditional', 'if + past', 'would + base', 'unreal condition', 'if I were'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logConditionalType: true, logIfClauseForm: true, logMainClauseForm: true, logUnrealMeaning: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=syntax&microDiagnosisId=condition_second_basic',
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


