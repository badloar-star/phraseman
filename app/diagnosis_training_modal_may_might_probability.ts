import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = ['may + base verb', 'might + base verb', 'possibility', 'probability', 'uncertainty', 'may not', 'might not', 'can vs may', 'will vs may'];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri('First decide the meaning: certain future, possible future, ability, or possible negative.'),
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
    explanationBlock: tri('May/might show probability: maybe it is true or maybe it will happen. After may/might use the base verb.'),
    microTask: tri('Choose the modal that matches probability, certainty, or ability.'),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? tri(`Use ${input.correctAnswer}; check probability and base verb form.`)])),
    retryFeedback: retry(...input.retryFeedback),
    fallbackExplanation: tri("May/might = maybe. Will = more certain. Can = ability/general possibility. Negative: may not / might not. No to, no -s, no do with may/might."),
    focusWords: input.focusWords,
  };
}

export const MODAL_MAY_MIGHT_PROBABILITY_TRAINING: DiagnosisTraining = {
  id: 'modal_may_might_probability',
  category: 'modal',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 48,
  supportedLocales: ['ru', 'uk'],
  title: tri('May / Might: possibility and probability', 'May / Might: possibility and probability'),
  shortTitle: tri('May / Might', 'May / Might'),
  shortDiagnosis: tri('You are mixing may/might probability with can ability, will certainty, and wrong modal verb forms.'),
  diagnosisText: tri('You are mixing may and might or using can where the meaning is probability, not ability. May/might mean maybe: possible, but not certain.'),
  mentalModel: tri('May/might = maybe. It may rain. She might be busy. Might often sounds a little less certain than may. After may/might use the base verb.'),
  contrastSet: CONTRAST,
  coreRule: tri("May/might + base verb shows probability: It may rain. He might come. Negative: may not / might not. Do not use to, -s, or do/does with may/might."),
  whatUserMustLearn: {
    ru: [
      'May shows possibility or probability: It may rain.',
      'Might shows possibility, often a little less certain: It might rain.',
      'After may/might use the base verb: may go, might come, may be.',
      'Do not say may to go or might to come.',
      'Do not add -s after may/might: she may know.',
      'Do not use do/does with may/might: It might not work.',
      'May not / might not means maybe not.',
      'Can is often ability/general possibility; may/might is probability in a situation.',
      'Will is more certain: He will come. Might is uncertain: He might come.',
      'Maybe is a separate adverb: Maybe he will come. Modal: He might come.',
    ],
    uk: [
      'May shows possibility or probability: It may rain.',
      'Might shows possibility, often a little less certain: It might rain.',
      'After may/might use the base verb: may go, might come, may be.',
      'Do not say may to go or might to come.',
      'Do not add -s after may/might: she may know.',
      'Do not use do/does with may/might: It might not work.',
      'May not / might not means maybe not.',
      'Can is often ability/general possibility; may/might is probability in a situation.',
      'Will is more certain: He will come. Might is uncertain: He might come.',
      'Maybe is a separate adverb: Maybe he will come. Modal: He might come.',
    ],
    es: [
      'May shows probability.',
      'Might shows less certain probability.',
      'Use base verb after may/might.',
      'Do not use to after may/might.',
      'Do not add -s after may/might.',
      'Do not use do/does with may/might.',
      'May not / might not means maybe not.',
      'Can is often ability.',
      'Will is more certain.',
      'Maybe is a separate adverb.',
    ],
  },
  examples: [
    { en: 'It may rain tomorrow.', ru: 'It may rain tomorrow.', uk: 'It may rain tomorrow.', es: 'It may rain tomorrow.', why: tri('May shows probability: maybe it will rain.') },
    { en: 'It might rain tomorrow.', ru: 'It might rain tomorrow.', uk: 'It might rain tomorrow.', es: 'It might rain tomorrow.', why: tri('Might also shows probability, often less certain.') },
    { en: 'She may be at work.', ru: 'She may be at work.', uk: 'She may be at work.', es: 'She may be at work.', why: tri('After may, use base verb be.') },
    { en: 'He might come later.', ru: 'He might come later.', uk: 'He might come later.', es: 'He might come later.', why: tri('Might come shows uncertain future probability.') },
    { en: 'This might help.', ru: 'This might help.', uk: 'This might help.', es: 'This might help.', why: tri('Might help means maybe it will help, not physical ability.') },
    { en: 'He may not know the answer.', ru: 'He may not know the answer.', uk: 'He may not know the answer.', es: 'He may not know the answer.', why: tri('May not means maybe not, not prohibition.') },
    { en: 'She will come.', ru: 'She will come.', uk: 'She will come.', es: 'She will come.', why: tri('Will sounds more certain than may/might.') },
    { en: 'She might come.', ru: 'She might come.', uk: 'She might come.', es: 'She might come.', why: tri('Might shows uncertainty: maybe yes, maybe no.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('You may be using can when you mean maybe. Can often means ability; may/might mean probability.') },
    { id: 'intro_rule', type: 'rule', text: tri('May/might + base verb = maybe. It may rain. He might come. She may be busy.') },
    { id: 'intro_warning', type: 'warning', text: tri("Main mistakes: may to rain, she may knows, it doesn't might work. Correct: may rain, she may know, it might not work.") },
  ],
  steps: [
    step({ id: 'modal_may_might_easy_001', order: 1, difficulty: 'easy', targetSkill: 'may_rain', sentence: 'It ___ rain tomorrow.', translation: tri('It may rain tomorrow.'), options: ['may', 'can', 'is', 'does'], correctAnswer: 'may', correctFeedback: tri('Yes. May rain shows probability: maybe it will rain.'), wrong: { can: tri('Can rain can sound like general possibility. For a forecast maybe, use may rain.'), is: tri('Is rain is wrong. For probability, use may rain.'), does: tri('Does rain does not fit here. Use modal may.') }, retryFeedback: [tri('Maybe it will = may.'), tri('It may rain tomorrow.'), tri('Hint: It may rain tomorrow.')], focusWords: ['may rain'] }),
    step({ id: 'modal_may_might_easy_002', order: 2, difficulty: 'easy', targetSkill: 'may_be_busy', sentence: 'She ___ be busy.', translation: tri('She may be busy.'), options: ['may', 'can', 'does', 'is'], correctAnswer: 'may', correctFeedback: tri('Yes. May be busy = maybe she is busy.'), wrong: { can: tri('Can be busy is general possibility. Here it is a guess now: may be busy.'), does: tri('Does be busy is wrong. Use may be busy.'), is: tri('She is busy is certain. Maybe needs may.') }, retryFeedback: [tri('Maybe busy = may be busy.'), tri('She may be busy.'), tri('Hint: She may be busy.')], focusWords: ['may be'] }),
    step({ id: 'modal_may_might_easy_003', order: 3, difficulty: 'easy', targetSkill: 'may_help', sentence: 'This ___ help.', translation: tri('This may help.'), options: ['may', 'is', 'does', 'has'], correctAnswer: 'may', correctFeedback: tri('Yes. May help = maybe it will help.'), wrong: { is: tri('Is help is wrong. Use may help.'), does: tri('Does help can be a fact, but it does not show maybe. Use may help.'), has: tri('Has help is wrong. Use may help.') }, retryFeedback: [tri('Maybe help = may help.'), tri('This may help.'), tri('Hint: This may help.')], focusWords: ['may help'] }),
    step({ id: 'modal_may_might_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'might_less_certain', sentence: 'He ___ come later.', translation: tri('He might come later.'), options: ['might', 'does', 'is', 'has'], correctAnswer: 'might', correctFeedback: tri('Yes. Might come shows cautious probability.'), wrong: { does: tri('Does come does not show maybe. Use might come.'), is: tri('Is come is wrong. Use might come.'), has: tri('Has come means has arrived. Here future is possible: might come.') }, retryFeedback: [tri('Maybe he will come = might come.'), tri('He might come later.'), tri('Hint: He might come later.')], focusWords: ['might come'] }),
    step({ id: 'modal_may_might_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'might_work', sentence: 'It ___ work.', translation: tri('It might work.'), options: ['might', 'is', 'does', 'can to'], correctAnswer: 'might', correctFeedback: tri('Yes. Might work = maybe it will work.'), wrong: { is: tri('Is work is wrong. Use might work.'), does: tri('Does work means it works as a fact. Here probability = might work.'), 'can to': tri('Can to is wrong. For probability, use might work.') }, retryFeedback: [tri('Maybe it will work = might work.'), tri('It might work.'), tri('Hint: It might work.')], focusWords: ['might work'] }),
    step({ id: 'modal_may_might_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'may_vs_will_certainty', sentence: 'Choose the less certain sentence.', translation: tri('Choose the less certain sentence.'), options: ['She might come.', 'She will come.', 'She is here.', 'She came.'], correctAnswer: 'She might come.', correctFeedback: tri('Yes. Might come is less certain than will come.'), wrong: { 'She will come.': tri('Will come sounds certain. For less certainty, use might come.'), 'She is here.': tri('She is here is a fact, not probability.'), 'She came.': tri('She came is a past fact, not uncertain future.') }, retryFeedback: [tri('Less certain = might.'), tri('She might come.'), tri('Hint: She might come.')], focusWords: ['might come', 'will come'] }),
    step({ id: 'modal_may_might_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'may_base_no_to', sentence: 'She may ___ the answer.', translation: tri('She may know the answer.'), options: ['know', 'knows', 'to know', 'knowing'], correctAnswer: 'know', correctFeedback: tri('Yes. After may, use the base verb: may know.'), wrong: { knows: tri('After may do not add -s. Use may know.'), 'to know': tri('After may do not use to. Use may know.'), knowing: tri('May knowing is wrong. Use may know.') }, retryFeedback: [tri('May + base verb.'), tri('She may know the answer.'), tri('Hint: She may know the answer.')], focusWords: ['may know'] }),
    step({ id: 'modal_may_might_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'might_base_no_to', sentence: 'He might ___ late.', translation: tri('He might be late.'), options: ['be', 'is', 'to be', 'being'], correctAnswer: 'be', correctFeedback: tri('Yes. After might, use base verb be: might be late.'), wrong: { is: tri('After might do not use is. Use might be.'), 'to be': tri('After might do not use to. Use might be.'), being: tri('Might being is wrong. Use might be.') }, retryFeedback: [tri('Might + be.'), tri('He might be late.'), tri('Hint: He might be late.')], focusWords: ['might be'] }),
    step({ id: 'modal_may_might_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'may_base_pair', sentence: 'Choose the correct pair.', translation: tri('may know / might come'), options: ['may know / might come', 'may knows / might comes', 'may to know / might to come', 'may knowing / might coming'], correctAnswer: 'may know / might come', correctFeedback: tri('Yes. After may/might, use base verbs: know, come.'), wrong: { 'may knows / might comes': tri('After may/might do not add -s. Use know/come.'), 'may to know / might to come': tri('After may/might do not use to.'), 'may knowing / might coming': tri('After may/might do not use -ing here.') }, retryFeedback: [tri('May/might + base verb.'), tri('May know / might come.'), tri('Hint: may know / might come.')], focusWords: ['may know', 'might come'] }),
    step({ id: 'modal_may_might_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'may_not_probability', sentence: 'He ___ know the answer.', translation: tri('He may not know the answer.'), options: ['may not', "doesn't may", "may doesn't", 'not may'], correctAnswer: 'may not', correctFeedback: tri('Yes. May not = maybe not. After may not, use know.'), wrong: { "doesn't may": tri("May does not need doesn't. Correct: may not know."), "may doesn't": tri("After may do not use doesn't. Use may not know."), 'not may': tri('Not goes after may: may not.') }, retryFeedback: [tri('Maybe not = may not.'), tri('He may not know.'), tri('Hint: He may not know the answer.')], focusWords: ['may not know'] }),
    step({ id: 'modal_may_might_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'might_not_work', sentence: 'It ___ work.', translation: tri('It might not work.'), options: ['might not', "doesn't might", "might doesn't", 'not might'], correctAnswer: 'might not', correctFeedback: tri('Yes. Might not work = maybe it will not work.'), wrong: { "doesn't might": tri("Might does not need doesn't. Use might not work."), "might doesn't": tri("After might do not use doesn't. Use might not work."), 'not might': tri('Not goes after might: might not.') }, retryFeedback: [tri('Maybe not = might not.'), tri('It might not work.'), tri('Hint: It might not work.')], focusWords: ['might not work'] }),
    step({ id: 'modal_may_might_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'maybe_vs_might', sentence: 'Choose the correct sentence.', translation: tri('She might come.'), options: ['She might come.', 'She maybe come.', 'She might to come.', 'She may comes.'], correctAnswer: 'She might come.', correctFeedback: tri('Yes. With a modal, use might + base verb: might come.'), wrong: { 'She maybe come.': tri('Maybe is usually separate: Maybe she will come. With a modal: She might come.'), 'She might to come.': tri('After might do not use to. Use might come.'), 'She may comes.': tri('After may do not add -s. Use may come.') }, retryFeedback: [tri('Modal + base verb = might come.'), tri('She might come.'), tri('Hint: She might come.')], focusWords: ['might come'] }),
    step({ id: 'modal_may_might_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_can_may_will', sentence: 'Choose the correct set.', translation: tri('I can swim / It may rain / She will come'), options: ['I can swim / It may rain / She will come', 'I may swim / It can rain / She might come', 'I will swim / It does may rain / She may comes', 'I can to swim / It may to rain / She will to come'], correctAnswer: 'I can swim / It may rain / She will come', correctFeedback: tri('Yes. Ability = can. Probability = may. Certain future = will.'), wrong: { 'I may swim / It can rain / She might come': tri('May swim means maybe I will swim, not ability. Might come is not certain.'), 'I will swim / It does may rain / She may comes': tri('Does may rain and may comes are wrong. Will swim does not mean ability.'), 'I can to swim / It may to rain / She will to come': tri('After can/may/will do not use to.') }, retryFeedback: [tri('Ability = can. Probability = may. Certainty = will.'), tri('Can swim / may rain / will come.'), tri('Hint: I can swim / It may rain / She will come.')], focusWords: ['can', 'may', 'will'] }),
    step({ id: 'modal_may_might_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_may_might_negative', sentence: 'Choose the correct pair.', translation: tri('It may help / It might not work'), options: ['It may help / It might not work', "It may to help / It doesn't might work", "It may helps / It might doesn't work", 'It maybe help / It not might work'], correctAnswer: 'It may help / It might not work', correctFeedback: tri('Yes. May help = maybe it will help. Might not work = maybe it will not work.'), wrong: { "It may to help / It doesn't might work": tri("After may do not use to. Might does not need doesn't."), "It may helps / It might doesn't work": tri("After may do not add -s. After might do not use doesn't."), 'It maybe help / It not might work': tri('Maybe does not work like that inside the structure, and not goes after might.') }, retryFeedback: [tri('May help / might not work.'), tri('It may help / It might not work.'), tri('Hint: It may help / It might not work.')], focusWords: ['may help', 'might not work'] }),
    step({ id: 'modal_may_might_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('She may be busy, so she might not answer.'), options: ['She may be busy, so she might not answer.', "She may is busy, so she doesn't might answer.", "She maybe busy, so she might doesn't answer.", 'She may to be busy, so she might not to answer.'], correctAnswer: 'She may be busy, so she might not answer.', correctFeedback: tri('Yes. May be busy and might not answer correctly show probability.'), wrong: { "She may is busy, so she doesn't might answer.": tri("After may use be, not is. Might does not need doesn't."), "She maybe busy, so she might doesn't answer.": tri("Maybe busy is missing be. After might do not use doesn't."), 'She may to be busy, so she might not to answer.': tri('After may/might do not use to. Use may be / might not answer.') }, retryFeedback: [tri('May be / might not answer.'), tri('She may be busy. She might not answer.'), tri('Hint: She may be busy, so she might not answer.')], focusWords: ['may be', 'might not answer'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['may_to_error', 'might_to_error', 'modal_plus_s_error', 'modal_plus_ing_error', 'can_probability_confusion', 'will_probability_confusion', 'may_not_meaning_error', 'do_with_modal_error', 'maybe_modal_confusion', 'wrong_uncertainty_strength_error'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Normal explanation: show probability, certainty strength, and base verb after may/might.'),
    depth2: tri('Simpler: ask whether this is certain, possible, or ability.'),
    depth3: tri('Even simpler: compare will come / might come / can swim.'),
    depth4: tri('Almost a hint: point directly to may, might, may not, or might not.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri("May/might = maybe. After may/might use base verb: may be, may know, might come. Not goes after modal: may not, might not. Do/does is not needed.") },
    afterThreeWrongInSameExercise: { action: 'show_probability_hint_then_retry', card: tri('Hint: the system shows whether this is probability, certainty, or ability, but does not choose the modal.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Guided mode: first choose maybe, certain, or ability. Then choose may/might/can/will and the base verb.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_modal_may_might_001', prompt: tri('Does may rain mean certainly rain or maybe rain?'), options: ['certainly rain', 'maybe rain'], correctIndex: 1, thenReturnToExerciseId: 'modal_may_might_easy_001' },
      { id: 'guided_modal_may_might_002', prompt: tri('After may, is knows or know correct?'), options: ['knows', 'know'], correctIndex: 1, thenReturnToExerciseId: 'modal_may_might_contrast_004' },
      { id: 'guided_modal_may_might_003', prompt: tri('Does might not mean maybe not or definitely not?'), options: ['maybe not', 'definitely not'], correctIndex: 0, thenReturnToExerciseId: 'modal_may_might_mixed_002' },
      { id: 'guided_modal_may_might_004', prompt: tri('Is can more often ability or probability?'), options: ['ability', 'probability'], correctIndex: 0, thenReturnToExerciseId: 'modal_may_might_mixed_004' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'modal',
    microDiagnosisId: 'modal_may_might_probability',
    diagnosisLabel: tri('May / Might', 'May / Might'),
    contrastSet: CONTRAST,
    difficultyLevel: 2,
    focusWords: ['may rain', 'may be', 'might come', 'might work', 'may not know', 'might not work'],
    focusPatterns: ['may_rain', 'may_be_busy', 'may_help', 'might_less_certain', 'might_work', 'may_vs_will_certainty', 'may_base_no_to', 'might_base_no_to', 'may_base_pair', 'may_not_probability', 'might_not_work', 'maybe_vs_might', 'mixed_can_may_will', 'mixed_may_might_negative', 'mixed_sentence_correction'],
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
    payload: { category: 'modal', microDiagnosisId: 'modal_may_might_probability', contrastSet: ['may', 'might', 'may not', 'might not', 'can', 'will'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logModalMeaning: true, logProbabilityStrength: true, logVerbFormAfterModal: true, logPolarity: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=modal&microDiagnosisId=modal_may_might_probability',
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


