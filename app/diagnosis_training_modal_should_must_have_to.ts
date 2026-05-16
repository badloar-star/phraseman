import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = ['should + base verb', 'must + base verb', 'have to + base verb', 'has to', "don't have to", "mustn't", 'advice', 'obligation', 'external necessity'];
const SMART_CONTRAST = ['should + base verb', 'must + base verb', 'have to + base verb', 'has to', "don't have to", "mustn't", 'advice', 'obligation'];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri('First decide the force: advice, strong obligation, external necessity, prohibition, or no obligation.'),
    depth2,
    depth3,
    depth4,
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(`Check the modal meaning and the base verb form. Correct answer: ${correct}.`);
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
    explanationBlock: tri('Should = advice. Must = strong obligation/prohibition. Have to = external necessity. After these expressions use the base verb.'),
    microTask: tri('Choose the modal expression that matches the strength of the meaning.'),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? defaultWrong(input.correctAnswer)])),
    retryFeedback: retry(...input.retryFeedback),
    fallbackExplanation: tri("Should = advice. Mustn't = prohibited. Don't have to = not necessary. Have to/has to = external necessity."),
    focusWords: input.focusWords,
  };
}

export const MODAL_SHOULD_MUST_HAVE_TO_TRAINING: DiagnosisTraining = {
  id: 'modal_should_must_have_to',
  category: 'modal',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 46,
  supportedLocales: ['ru', 'uk'],
  title: tri('Should / Must / Have to: advice, obligation, necessity', 'Should / Must / Have to: advice, obligation, necessity'),
  shortTitle: tri('Should / Must / Have to', 'Should / Must / Have to'),
  shortDiagnosis: tri('You are mixing advice, strong obligation, external necessity, prohibition, and no obligation.'),
  diagnosisText: tri('You are mixing should, must, and have to. They can all feel like "need to", but the strength is different: advice, obligation, or external necessity.'),
  mentalModel: tri('Should = it is a good idea. Must = strong rule or obligation. Have to = necessary because of a rule, work, schedule, or situation.'),
  contrastSet: CONTRAST,
  coreRule: tri('Should + base verb = advice. Must + base verb = strong obligation/prohibition. Have to + base verb = external necessity. He/she/it uses has to.'),
  whatUserMustLearn: {
    ru: [
      'Should gives advice: You should rest.',
      'Must gives a strong rule or obligation: You must stop.',
      'Have to gives external necessity: I have to work.',
      'After should and must use the base verb: should go, must go.',
      'After have to use the base verb: have to go, has to work.',
      'With he/she/it use has to: She has to work.',
      "Don't have to means not necessary.",
      "Mustn't means prohibited, not not necessary.",
      "Shouldn't means it is not a good idea.",
      'Have to questions use do/does: Do you have to work?',
    ],
    uk: [
      'Should gives advice: You should rest.',
      'Must gives a strong rule or obligation: You must stop.',
      'Have to gives external necessity: I have to work.',
      'After should and must use the base verb: should go, must go.',
      'After have to use the base verb: have to go, has to work.',
      'With he/she/it use has to: She has to work.',
      "Don't have to means not necessary.",
      "Mustn't means prohibited, not not necessary.",
      "Shouldn't means it is not a good idea.",
      'Have to questions use do/does: Do you have to work?',
    ],
    es: [
      'Should gives advice.',
      'Must gives strong obligation.',
      'Have to gives external necessity.',
      'Use base verb after should and must.',
      'Use base verb after have to.',
      'He/she/it uses has to.',
      "Don't have to means not necessary.",
      "Mustn't means prohibited.",
      "Shouldn't means advice not to.",
      'Have to questions use do/does.',
    ],
  },
  examples: [
    { en: 'You should rest.', ru: 'You should rest.', uk: 'You should rest.', es: 'You should rest.', why: tri('Should gives advice, not a strict obligation.') },
    { en: 'You must wear a seatbelt.', ru: 'You must wear a seatbelt.', uk: 'You must wear a seatbelt.', es: 'You must wear a seatbelt.', why: tri('Must sounds like a strong rule or obligation.') },
    { en: 'I have to work tomorrow.', ru: 'I have to work tomorrow.', uk: 'I have to work tomorrow.', es: 'I have to work tomorrow.', why: tri('Have to shows necessity from a schedule or situation.') },
    { en: 'She has to leave early.', ru: 'She has to leave early.', uk: 'She has to leave early.', es: 'She has to leave early.', why: tri('She needs has to, not have to.') },
    { en: "You don't have to come.", ru: "You don't have to come.", uk: "You don't have to come.", es: "You don't have to come.", why: tri("Don't have to means no necessity, not prohibition.") },
    { en: "You mustn't smoke here.", ru: "You mustn't smoke here.", uk: "You mustn't smoke here.", es: "You mustn't smoke here.", why: tri("Mustn't means prohibited.") },
    { en: "You shouldn't worry.", ru: "You shouldn't worry.", uk: "You shouldn't worry.", es: "You shouldn't worry.", why: tri("Shouldn't gives advice not to do something.") },
    { en: 'Do you have to work tomorrow?', ru: 'Do you have to work tomorrow?', uk: 'Do you have to work tomorrow?', es: 'Do you have to work tomorrow?', why: tri('Have to questions use do.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('You may translate all of these as "need to", but English separates advice, strict obligation, and necessity from the situation.') },
    { id: 'intro_rule', type: 'rule', text: tri("Should = good idea. Must = obligation/prohibition. Have to = necessary because of the situation. Don't have to = not necessary.") },
    { id: 'intro_warning', type: 'warning', text: tri("Main trap: don't have to and mustn't. Don't have to = not necessary. Mustn't = prohibited.") },
  ],
  steps: [
    step({ id: 'modal_smh_easy_001', order: 1, difficulty: 'easy', targetSkill: 'should_advice_rest', sentence: 'You ___ rest.', translation: tri('You should rest.'), options: ['should', 'must', 'have to', "mustn't"], correctAnswer: 'should', correctFeedback: tri('Yes. This is soft advice, so use should.'), wrong: { must: tri('Must sounds like a strict obligation. For advice, use should.'), 'have to': tri('Have to sounds like necessity from circumstances. Here it is advice: should.'), "mustn't": tri("Mustn't means prohibited, the opposite meaning.") }, retryFeedback: [tri('Good idea = should.'), tri('You should rest.'), tri('Hint: You should rest.')], focusWords: ['should rest'] }),
    step({ id: 'modal_smh_easy_002', order: 2, difficulty: 'easy', targetSkill: 'should_base_form', sentence: 'She should ___ him.', translation: tri('She should call him.'), options: ['call', 'calls', 'to call', 'calling'], correctAnswer: 'call', correctFeedback: tri('Yes. After should use the base verb: should call.'), wrong: { calls: tri('After should do not add -s. Use should call.'), 'to call': tri('After should do not use to. Use should call.'), calling: tri('After should do not use -ing. Use should call.') }, retryFeedback: [tri('Should + base verb.'), tri('She should call him.'), tri('Hint: She should call him.')], focusWords: ['should call'] }),
    step({ id: 'modal_smh_easy_003', order: 3, difficulty: 'easy', targetSkill: 'shouldnt_advice', sentence: 'You ___ worry.', translation: tri("You shouldn't worry."), options: ["shouldn't", "mustn't", "don't have to", "haven't to"], correctAnswer: "shouldn't", correctFeedback: tri("Yes. Not a good idea = shouldn't."), wrong: { "mustn't": tri("Mustn't sounds like prohibition. For soft advice, use shouldn't."), "don't have to": tri("Don't have to means not necessary. Here use shouldn't worry."), "haven't to": tri("Haven't to is not the basic form. Use shouldn't worry.") }, retryFeedback: [tri("Not a good idea = shouldn't."), tri("You shouldn't worry."), tri("Hint: You shouldn't worry.")], focusWords: ["shouldn't worry"] }),
    step({ id: 'modal_smh_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'must_rule', sentence: 'You ___ wear a seatbelt.', translation: tri('You must wear a seatbelt.'), options: ['must', 'should', "don't have to", "shouldn't"], correctAnswer: 'must', correctFeedback: tri('Yes. This is a rule/obligation, so use must.'), wrong: { should: tri('Should sounds like advice, but this is an obligation. Use must.'), "don't have to": tri("Don't have to means not necessary. Here the opposite is true."), "shouldn't": tri("Shouldn't means not a good idea, the opposite meaning.") }, retryFeedback: [tri('Rule/obligation = must.'), tri('You must wear a seatbelt.'), tri('Hint: You must wear a seatbelt.')], focusWords: ['must wear'] }),
    step({ id: 'modal_smh_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'must_base_form', sentence: 'He must ___ now.', translation: tri('He must leave now.'), options: ['leave', 'leaves', 'to leave', 'leaving'], correctAnswer: 'leave', correctFeedback: tri('Yes. After must use the base verb: must leave.'), wrong: { leaves: tri('After must do not add -s. Use must leave.'), 'to leave': tri('After must do not use to. Use must leave.'), leaving: tri('After must do not use -ing. Use must leave.') }, retryFeedback: [tri('Must + base verb.'), tri('He must leave now.'), tri('Hint: He must leave now.')], focusWords: ['must leave'] }),
    step({ id: 'modal_smh_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'mustnt_prohibition', sentence: 'You ___ smoke here.', translation: tri("You mustn't smoke here."), options: ["mustn't", "don't have to", 'should', 'have to'], correctAnswer: "mustn't", correctFeedback: tri("Yes. Prohibition = mustn't."), wrong: { "don't have to": tri("Don't have to means not necessary. Here it is prohibited: mustn't."), should: tri('Should smoke means it is a good idea to smoke, the opposite meaning.'), 'have to': tri('Have to smoke means it is necessary to smoke. Here smoking is prohibited.') }, retryFeedback: [tri("Prohibited = mustn't."), tri("You mustn't smoke here."), tri("Hint: You mustn't smoke here.")], focusWords: ["mustn't smoke"] }),
    step({ id: 'modal_smh_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'have_to_external_necessity', sentence: 'I ___ work tomorrow.', translation: tri('I have to work tomorrow.'), options: ['have to', 'has to', 'should to', 'must to'], correctAnswer: 'have to', correctFeedback: tri('Yes. I takes have to. This is necessity from work/schedule.'), wrong: { 'has to': tri('Has to goes with he/she/it. With I use have to.'), 'should to': tri('Should to is wrong. After should do not use to.'), 'must to': tri('Must to is wrong. After must do not use to.') }, retryFeedback: [tri('I + have to.'), tri('I have to work tomorrow.'), tri('Hint: I have to work tomorrow.')], focusWords: ['have to work'] }),
    step({ id: 'modal_smh_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'has_to', sentence: 'She ___ leave early.', translation: tri('She has to leave early.'), options: ['has to', 'have to', 'must to', 'should to'], correctAnswer: 'has to', correctFeedback: tri('Yes. She takes has to.'), wrong: { 'have to': tri('Have to goes with I/you/we/they. With she use has to.'), 'must to': tri('Must to is wrong. If must, say must leave.'), 'should to': tri('Should to is wrong. If should, say should leave.') }, retryFeedback: [tri('She + has to.'), tri('She has to leave early.'), tri('Hint: She has to leave early.')], focusWords: ['has to leave'] }),
    step({ id: 'modal_smh_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'question_have_to', sentence: '___ you have to work tomorrow?', translation: tri('Do you have to work tomorrow?'), options: ['Do', 'Have', 'Must', 'Are'], correctAnswer: 'Do', correctFeedback: tri('Yes. Have to questions use do: Do you have to work?'), wrong: { Have: tri('Have you to work? is not the basic modern form. Use Do you have to work?'), Must: tri('Must you work? has a different, formal feel. For have to question use Do.'), Are: tri('Are you have to work? is wrong. Use Do you have to work?') }, retryFeedback: [tri('Question with have to = Do you have to...?'), tri('Do you have to work tomorrow?'), tri('Hint: Do you have to work tomorrow?')], focusWords: ['do you have to'] }),
    step({ id: 'modal_smh_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'dont_have_to_no_obligation', sentence: "You ___ come if you're busy.", translation: tri("You don't have to come if you're busy."), options: ["don't have to", "mustn't", "shouldn't", 'must'], correctAnswer: "don't have to", correctFeedback: tri("Yes. Not necessary = don't have to."), wrong: { "mustn't": tri("Mustn't means prohibited. Here there is no obligation, not a ban."), "shouldn't": tri("Shouldn't means not a good idea. Here not necessary = don't have to."), must: tri('Must means obligated. Here the opposite: not necessary.') }, retryFeedback: [tri("Not necessary = don't have to."), tri("You don't have to come."), tri("Hint: You don't have to come if you're busy.")], focusWords: ["don't have to"] }),
    step({ id: 'modal_smh_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'doesnt_have_to', sentence: 'She ___ work tomorrow.', translation: tri("She doesn't have to work tomorrow."), options: ["doesn't have to", "don't have to", "mustn't", "hasn't to"], correctAnswer: "doesn't have to", correctFeedback: tri("Yes. With she, use doesn't have to."), wrong: { "don't have to": tri("With she, use doesn't have to, not don't have to."), "mustn't": tri("Mustn't means prohibited from working. Here it is not necessary."), "hasn't to": tri("Hasn't to is not the basic form. Use doesn't have to.") }, retryFeedback: [tri("She + doesn't have to."), tri("She doesn't have to work tomorrow."), tri("Hint: She doesn't have to work tomorrow.")], focusWords: ["doesn't have to"] }),
    step({ id: 'modal_smh_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'mustnt_vs_dont_have_to', sentence: 'Choose the correct pair.', translation: tri("You don't have to come / You mustn't smoke here"), options: ["You don't have to come / You mustn't smoke here", "You mustn't come / You don't have to smoke here", "You shouldn't come / You must smoke here", "You haven't to come / You mustn't to smoke here"], correctAnswer: "You don't have to come / You mustn't smoke here", correctFeedback: tri("Yes. Don't have to = not necessary. Mustn't = prohibited."), wrong: { "You mustn't come / You don't have to smoke here": tri("The forms are reversed. Mustn't = prohibition. Don't have to = not necessary."), "You shouldn't come / You must smoke here": tri("Shouldn't = advice not to, and must smoke means obligation to smoke. Wrong meanings."), "You haven't to come / You mustn't to smoke here": tri("Haven't to and mustn't to are wrong forms.") }, retryFeedback: [tri("Not necessary = don't have to. Prohibited = mustn't."), tri("Don't have to come / mustn't smoke."), tri("Hint: You don't have to come / You mustn't smoke here.")], focusWords: ["don't have to", "mustn't"] }),
    step({ id: 'modal_smh_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_advice_obligation_necessity', sentence: 'Choose the correct set.', translation: tri('You should rest / You must stop / I have to work'), options: ['You should rest / You must stop / I have to work', 'You must rest / You should stop / I must to work', 'You should to rest / You must to stop / I have work', "You have to rest / You don't have to stop / I should to work"], correctAnswer: 'You should rest / You must stop / I have to work', correctFeedback: tri('Yes. Advice = should. Strong obligation = must. External necessity = have to.'), wrong: { 'You must rest / You should stop / I must to work': tri('Must rest is too strong for advice, should stop is weaker than obligation, and must to is wrong.'), 'You should to rest / You must to stop / I have work': tri('After should/must do not use to. Have work is missing to in have to.'), "You have to rest / You don't have to stop / I should to work": tri('Meanings and forms are mixed. Should to is wrong.') }, retryFeedback: [tri('Advice = should. Obligation = must. Necessity = have to.'), tri('Should rest / must stop / have to work.'), tri('Hint: You should rest / You must stop / I have to work.')], focusWords: ['should', 'must', 'have to'] }),
    step({ id: 'modal_smh_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_have_to_question_negative', sentence: 'Choose the correct pair.', translation: tri("Do you have to work? / She doesn't have to work"), options: ["Do you have to work? / She doesn't have to work", "Have you to work? / She hasn't to work", "Must you have to work? / She don't have to work", "Do you has to work? / She doesn't has to work"], correctAnswer: "Do you have to work? / She doesn't have to work", correctFeedback: tri("Yes. Question: Do you have to...? Negative with she: doesn't have to."), wrong: { "Have you to work? / She hasn't to work": tri('Have you to and hasn\'t to are not the basic modern forms. Use do/does.'), "Must you have to work? / She don't have to work": tri("Must you have to is redundant, and she needs doesn't, not don't."), "Do you has to work? / She doesn't has to work": tri('After do/does use have to, not has to.') }, retryFeedback: [tri("Do you have to? / She doesn't have to."), tri("Do you have to work? / She doesn't have to work."), tri("Hint: Do you have to work? / She doesn't have to work.")], focusWords: ['do you have to', "doesn't have to"] }),
    step({ id: 'modal_smh_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri("You should rest, but you don't have to go home."), options: ["You should rest, but you don't have to go home.", "You must rest, but you mustn't go home.", "You should to rest, but you haven't to go home.", "You have to rest, but you don't must go home."], correctAnswer: "You should rest, but you don't have to go home.", correctFeedback: tri("Yes. Advice = should rest. Not necessary = don't have to go."), wrong: { "You must rest, but you mustn't go home.": tri("Must rest is an obligation, and mustn't go home means prohibited. Too strong and wrong meaning."), "You should to rest, but you haven't to go home.": tri("Should to is wrong. Haven't to is not the basic form. Use should rest / don't have to go."), "You have to rest, but you don't must go home.": tri("Have to rest is necessity, and don't must is wrong. Use don't have to.") }, retryFeedback: [tri("Good idea = should. Not necessary = don't have to."), tri("You should rest / you don't have to go."), tri("Hint: You should rest, but you don't have to go home.")], focusWords: ['should rest', "don't have to go"] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'should_must_have_to_meaning_confusion',
      'should_to_error',
      'must_to_error',
      'modal_plus_s_error',
      'have_to_agreement_error',
      'dont_have_to_mustnt_confusion',
      'question_have_to_error',
      'shouldnt_mustnt_confusion',
      'has_to_base_form_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Normal explanation: show the strength of necessity and the form after the modal expression.'),
    depth2: tri('Simpler: ask whether this is advice, rule/prohibition, or external necessity.'),
    depth3: tri('Even simpler: compare should rest / must stop / have to work.'),
    depth4: tri("Almost a hint: point directly to should, must, have to, don't have to, or mustn't."),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri("Should = advice. Must = obligation or prohibition in mustn't. Have to = necessary because of situation. Don't have to = not necessary. After should/must/have to use base verb."),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_modal_strength_hint_then_retry',
      card: tri('Hint: the system shows the strength: advice, obligation, prohibition, or no obligation, but does not choose the form.'),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri('Guided mode: first choose advice, obligation, necessity, prohibition, or not necessary. Then return to the full sentence.'),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_modal_smh_001', prompt: tri('Should usually means advice or strict obligation?'), options: ['advice', 'strict obligation'], correctIndex: 0, thenReturnToExerciseId: 'modal_smh_easy_001' },
      { id: 'guided_modal_smh_002', prompt: tri("Does mustn't mean not necessary or prohibited?"), options: ['not necessary', 'prohibited'], correctIndex: 1, thenReturnToExerciseId: 'modal_smh_contrast_003' },
      { id: 'guided_modal_smh_003', prompt: tri("Does don't have to mean not necessary or prohibited?"), options: ['not necessary', 'prohibited'], correctIndex: 0, thenReturnToExerciseId: 'modal_smh_mixed_001' },
      { id: 'guided_modal_smh_004', prompt: tri('With she, is has to or have to correct?'), options: ['has to', 'have to'], correctIndex: 0, thenReturnToExerciseId: 'modal_smh_contrast_005' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'modal',
    microDiagnosisId: 'modal_should_must_have_to',
    diagnosisLabel: tri('Should / Must / Have to', 'Should / Must / Have to'),
    contrastSet: SMART_CONTRAST,
    difficultyLevel: 2,
    focusWords: ['should rest', 'must wear', 'have to work', 'has to leave', "don't have to", "mustn't"],
    focusPatterns: [
      'should_advice_rest',
      'should_base_form',
      'shouldnt_advice',
      'must_rule',
      'must_base_form',
      'mustnt_prohibition',
      'have_to_external_necessity',
      'has_to',
      'question_have_to',
      'dont_have_to_no_obligation',
      'doesnt_have_to',
      'mustnt_vs_dont_have_to',
      'mixed_advice_obligation_necessity',
      'mixed_have_to_question_negative',
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
      category: 'modal',
      microDiagnosisId: 'modal_should_must_have_to',
      contrastSet: ['should', 'must', 'have to', "don't have to", "mustn't"],
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logModalMeaning: true,
      logObligationStrength: true,
      logVerbFormAfterModal: true,
      logPolarity: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=modal&microDiagnosisId=modal_should_must_have_to',
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


