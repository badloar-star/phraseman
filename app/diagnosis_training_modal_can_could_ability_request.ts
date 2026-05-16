import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = ['can + base verb', 'could + base verb', 'present ability', 'past ability', 'polite request', 'permission', "can't", "couldn't"];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri('First decide the meaning: ability now, ability in the past, no ability now, no ability in the past, or a request.'),
    depth2,
    depth3,
    depth4,
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(`Check the time, politeness, and base verb after can/could. Correct answer: ${correct}.`);
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
    explanationBlock: tri('Can = ability now or a direct request. Could = past ability or a more polite request. After can/could use the base verb.'),
    microTask: tri('Choose the can/could form that matches the time, tone, and verb form.'),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? defaultWrong(input.correctAnswer)])),
    retryFeedback: retry(...input.retryFeedback),
    fallbackExplanation: tri("Can = now. Could = past or polite. Can't = cannot now. Couldn't = could not in the past. After can/could use the base verb."),
    focusWords: input.focusWords,
  };
}

export const MODAL_CAN_COULD_ABILITY_REQUEST_TRAINING: DiagnosisTraining = {
  id: 'modal_can_could_ability_request',
  category: 'modal',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 47,
  supportedLocales: ['ru', 'uk'],
  title: tri('Can / Could: ability, past ability, and requests', 'Can / Could: ability, past ability, and requests'),
  shortTitle: tri('Can / Could', 'Can / Could'),
  shortDiagnosis: tri('You are mixing can and could for present ability, past ability, polite requests, and base verb form.'),
  diagnosisText: tri('You are mixing can and could. Can often means ability now. Could often means ability in the past or a more polite request. After can/could, use the base verb.'),
  mentalModel: tri('Can = I can now. Could = I could in the past or a polite request. Examples: I can swim. I could swim when I was a child. Could you help me?'),
  contrastSet: CONTRAST,
  coreRule: tri("Can + base verb = ability now or direct request. Could + base verb = past ability or polite request. Negative forms: can't / couldn't. Do not use to or -s after can/could."),
  whatUserMustLearn: {
    ru: [
      'Can is for ability now: I can drive.',
      'Could is for ability in the past: I could swim when I was a child.',
      'Could makes a request more polite: Could you help me?',
      'Can can also make a direct request: Can you open the window?',
      'After can/could use the base verb: can go, could help.',
      'Do not say can to go or could to help.',
      'Do not add -s after can/could: She can speak.',
      "Can't means cannot now: I can't hear you.",
      "Couldn't often means could not in the past: I couldn't sleep last night.",
      'For one successful past action, was able to can be better, but this training focuses on basic can/could.',
    ],
    uk: [
      'Can is for ability now: I can drive.',
      'Could is for ability in the past: I could swim when I was a child.',
      'Could makes a request more polite: Could you help me?',
      'Can can also make a direct request: Can you open the window?',
      'After can/could use the base verb: can go, could help.',
      'Do not say can to go or could to help.',
      'Do not add -s after can/could: She can speak.',
      "Can't means cannot now: I can't hear you.",
      "Couldn't often means could not in the past: I couldn't sleep last night.",
      'For one successful past action, was able to can be better, but this training focuses on basic can/could.',
    ],
    es: [
      'Can is ability now.',
      'Could is past ability.',
      'Could is also a polite request.',
      'Can is also a direct request.',
      'Use base verb after can/could.',
      'Do not use to after can/could.',
      'Do not add -s after can/could.',
      "Can't means cannot now.",
      "Couldn't means could not in the past.",
      'This training focuses on basic can/could.',
    ],
  },
  examples: [
    { en: 'I can speak English.', ru: 'I can speak English.', uk: 'I can speak English.', es: 'I can speak English.', why: tri('Can shows ability now. After can, use speak.') },
    { en: 'She can drive.', ru: 'She can drive.', uk: 'She can drive.', es: 'She can drive.', why: tri('She does not change the verb after can: can drive, not can drives.') },
    { en: 'I could swim when I was a child.', ru: 'I could swim when I was a child.', uk: 'I could swim when I was a child.', es: 'I could swim when I was a child.', why: tri('Could shows ability in the past.') },
    { en: 'Could you help me?', ru: 'Could you help me?', uk: 'Could you help me?', es: 'Could you help me?', why: tri('Could makes the request softer and more polite.') },
    { en: 'Can you open the window?', ru: 'Can you open the window?', uk: 'Can you open the window?', es: 'Can you open the window?', why: tri('Can is fine for a normal direct request.') },
    { en: "I can't hear you.", ru: "I can't hear you.", uk: "I can't hear you.", es: "I can't hear you.", why: tri("Can't shows inability now.") },
    { en: "I couldn't sleep last night.", ru: "I couldn't sleep last night.", uk: "I couldn't sleep last night.", es: "I couldn't sleep last night.", why: tri("Last night points to the past, so use couldn't.") },
    { en: 'Could I ask you a question?', ru: 'Could I ask you a question?', uk: 'Could I ask you a question?', es: 'Could I ask you a question?', why: tri('Could I is polite permission/request language.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('You may translate can/could as "can", but English separates time and tone: now, past, direct request, polite request.') },
    { id: 'intro_rule', type: 'rule', text: tri('Can = ability now. Could = past ability or more polite. After can/could always use the base verb.') },
    { id: 'intro_warning', type: 'warning', text: tri('Main mistakes: can to go, could to help, she can speaks. Correct: can go, could help, she can speak.') },
  ],
  steps: [
    step({ id: 'modal_can_could_easy_001', order: 1, difficulty: 'easy', targetSkill: 'can_present_ability', sentence: 'I ___ speak English.', translation: tri('I can speak English.'), options: ['can', 'could', 'am', 'have'], correctAnswer: 'can', correctFeedback: tri('Yes. This is ability now, so use can.'), wrong: { could: tri('Could usually points to past ability or politeness. For ability now, use can.'), am: tri('Am speak is wrong. For ability, use can speak.'), have: tri('Have speak is wrong. Use can speak.') }, retryFeedback: [tri('Ability now = can.'), tri('I can speak English.'), tri('Hint: I can speak English.')], focusWords: ['can speak'] }),
    step({ id: 'modal_can_could_easy_002', order: 2, difficulty: 'easy', targetSkill: 'can_drive', sentence: 'She ___ drive.', translation: tri('She can drive.'), options: ['can', 'cans', 'can to', 'is can'], correctAnswer: 'can', correctFeedback: tri('Yes. Can does not change after she: she can drive.'), wrong: { cans: tri('Can does not take -s with she. Use she can.'), 'can to': tri('After can do not use to. Use can drive.'), 'is can': tri('Is can is wrong. The modal can goes directly after the subject.') }, retryFeedback: [tri('She + can + drive.'), tri('She can drive.'), tri('Hint: She can drive.')], focusWords: ['can drive'] }),
    step({ id: 'modal_can_could_easy_003', order: 3, difficulty: 'easy', targetSkill: 'cant_hear', sentence: 'I ___ hear you.', translation: tri("I can't hear you."), options: ["can't", "couldn't", "don't can", 'am not can'], correctAnswer: "can't", correctFeedback: tri("Yes. Cannot now = can't hear."), wrong: { "couldn't": tri("Couldn't usually points to the past. Here the problem is now, so use can't."), "don't can": tri("Don't can is wrong. The negative of can is can't."), 'am not can': tri("Am not can is wrong. Use can't.") }, retryFeedback: [tri("Cannot now = can't."), tri("I can't hear you."), tri("Hint: I can't hear you.")], focusWords: ["can't hear"] }),
    step({ id: 'modal_can_could_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'can_base_no_to', sentence: 'You can ___ here.', translation: tri('You can wait here.'), options: ['wait', 'to wait', 'waiting', 'waits'], correctAnswer: 'wait', correctFeedback: tri('Yes. After can use the base verb: can wait.'), wrong: { 'to wait': tri('After can do not use to. Use can wait.'), waiting: tri('Can waiting is wrong. After can, use wait.'), waits: tri('After can do not add -s. Use wait.') }, retryFeedback: [tri('Can + base verb.'), tri('You can wait here.'), tri('Hint: You can wait here.')], focusWords: ['can wait'] }),
    step({ id: 'modal_can_could_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'could_base_no_to', sentence: 'Could you ___ me?', translation: tri('Could you help me?'), options: ['help', 'to help', 'helping', 'helps'], correctAnswer: 'help', correctFeedback: tri('Yes. After could use the base verb: could help.'), wrong: { 'to help': tri('After could do not use to. Use could help.'), helping: tri('Could helping is wrong. After could, use help.'), helps: tri('After could do not add -s. Use help.') }, retryFeedback: [tri('Could + base verb.'), tri('Could you help me?'), tri('Hint: Could you help me?')], focusWords: ['could help'] }),
    step({ id: 'modal_can_could_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'she_can_speak_no_s', sentence: 'She can ___ English.', translation: tri('She can speak English.'), options: ['speak', 'speaks', 'to speak', 'speaking'], correctAnswer: 'speak', correctFeedback: tri('Yes. After can, the verb does not take -s: she can speak.'), wrong: { speaks: tri('She speaks without can, but she can speak with can. After can do not add -s.'), 'to speak': tri('Can to speak is wrong. Use can speak.'), speaking: tri('Can speaking is wrong. Use can speak.') }, retryFeedback: [tri('Can + speak, not speaks.'), tri('She can speak English.'), tri('Hint: She can speak English.')], focusWords: ['can speak'] }),
    step({ id: 'modal_can_could_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'could_past_ability', sentence: 'I ___ swim when I was a child.', translation: tri('I could swim when I was a child.'), options: ['could', 'can', 'am able', 'can to'], correctAnswer: 'could', correctFeedback: tri('Yes. When I was a child points to the past. Past ability = could.'), wrong: { can: tri('Can shows ability now. Here it is past: could.'), 'am able': tri('Am able is present. When I was a child needs could.'), 'can to': tri('Can to is wrong and does not fit the past. Use could swim.') }, retryFeedback: [tri('Ability in the past = could.'), tri('I could swim when I was a child.'), tri('Hint: I could swim when I was a child.')], focusWords: ['could swim'] }),
    step({ id: 'modal_can_could_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'couldnt_past_negative', sentence: 'I ___ sleep last night.', translation: tri("I couldn't sleep last night."), options: ["couldn't", "can't", "don't can", 'am not can'], correctAnswer: "couldn't", correctFeedback: tri("Yes. Last night points to the past. Use couldn't sleep."), wrong: { "can't": tri("Can't points to now. Last night needs couldn't."), "don't can": tri("Don't can is wrong. The past negative is couldn't."), 'am not can': tri("Am not can is wrong. Use couldn't sleep.") }, retryFeedback: [tri("Last night + could not = couldn't."), tri("I couldn't sleep last night."), tri("Hint: I couldn't sleep last night.")], focusWords: ["couldn't sleep"] }),
    step({ id: 'modal_can_could_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'past_present_ability_pair', sentence: 'Choose the correct pair.', translation: tri('I can swim now / I could swim when I was a child'), options: ['I can swim now / I could swim when I was a child', 'I could swim now / I can swim when I was a child', 'I can to swim now / I could to swim when I was a child', 'I am can swim now / I was could swim when I was a child'], correctAnswer: 'I can swim now / I could swim when I was a child', correctFeedback: tri('Yes. Now = can. Past = could.'), wrong: { 'I could swim now / I can swim when I was a child': tri('Can/could are reversed. Now needs can, when I was a child needs could.'), 'I can to swim now / I could to swim when I was a child': tri('After can/could do not use to. Use can swim / could swim.'), 'I am can swim now / I was could swim when I was a child': tri('Am can and was could are wrong. The modal goes directly after the subject.') }, retryFeedback: [tri('Now = can. Past = could.'), tri('Can swim now / could swim when I was a child.'), tri('Hint: I can swim now / I could swim when I was a child.')], focusWords: ['can swim', 'could swim'] }),
    step({ id: 'modal_can_could_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'polite_request_could', sentence: '___ you help me, please?', translation: tri('Could you help me, please?'), options: ['Could', 'Did', 'Are', 'Have'], correctAnswer: 'Could', correctFeedback: tri('Yes. Could you...? is a polite request.'), wrong: { Did: tri('Did you help? asks about the past. For a request, use Could you help?'), Are: tri('Are you help is wrong. For a request, use Could you help?'), Have: tri('Have you help is wrong. For a request, use Could you help?') }, retryFeedback: [tri('Polite request = Could you...?'), tri('Could you help me?'), tri('Hint: Could you help me, please?')], focusWords: ['could you help'] }),
    step({ id: 'modal_can_could_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'permission_could_i', sentence: '___ I ask you a question?', translation: tri('Could I ask you a question?'), options: ['Could', 'Do', 'Am', 'Have'], correctAnswer: 'Could', correctFeedback: tri('Yes. Could I...? sounds polite when asking permission.'), wrong: { Do: tri('Do I ask...? does not mean polite permission. Use Could I ask...?'), Am: tri('Am I ask is wrong. Use Could I ask.'), Have: tri('Have I ask is wrong. Use Could I ask.') }, retryFeedback: [tri('May I politely? = Could I...?'), tri('Could I ask you a question?'), tri('Hint: Could I ask you a question?')], focusWords: ['could i ask'] }),
    step({ id: 'modal_can_could_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'can_direct_request', sentence: '___ you open the window?', translation: tri('Can you open the window?'), options: ['Can', 'Do', 'Are', 'Did'], correctAnswer: 'Can', correctFeedback: tri('Yes. Can you...? is a normal direct request.'), wrong: { Do: tri('Do you open...? asks about a habit/fact. For a request, use Can you open?'), Are: tri('Are you open? has another meaning. For a request, use Can you open?'), Did: tri('Did you open? asks about the past. For a request, use Can you open?') }, retryFeedback: [tri('Can you + verb = direct request.'), tri('Can you open the window?'), tri('Hint: Can you open the window?')], focusWords: ['can you open'] }),
    step({ id: 'modal_can_could_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_ability_request', sentence: 'Choose the correct pair.', translation: tri('I can speak English / Could you help me?'), options: ['I can speak English / Could you help me?', 'I can to speak English / Could you to help me?', 'I could speak English now / Can you helped me?', 'I am can speak English / Are you could help me?'], correctAnswer: 'I can speak English / Could you help me?', correctFeedback: tri('Yes. Can speak = ability now. Could you help = polite request.'), wrong: { 'I can to speak English / Could you to help me?': tri('After can/could do not use to. Use can speak / could help.'), 'I could speak English now / Can you helped me?': tri('Now is better with can, and after can use help, not helped.'), 'I am can speak English / Are you could help me?': tri('Am can and are could are wrong. The modal goes directly after the subject.') }, retryFeedback: [tri('Can speak / Could you help.'), tri('I can speak English / Could you help me?'), tri('Hint: I can speak English / Could you help me?')], focusWords: ['can speak', 'could help'] }),
    step({ id: 'modal_can_could_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_present_past_negative', sentence: 'Choose the correct set.', translation: tri("I can drive / I couldn't sleep last night / I can't hear you"), options: ["I can drive / I couldn't sleep last night / I can't hear you", "I could drive now / I can't sleep last night / I don't can hear you", "I can to drive / I couldn't to sleep last night / I am not can hear you", "I cans drive / I couldn't slept last night / I can't hearing you"], correctAnswer: "I can drive / I couldn't sleep last night / I can't hear you", correctFeedback: tri("Yes. Can = now. Couldn't = past negative. Can't = cannot now."), wrong: { "I could drive now / I can't sleep last night / I don't can hear you": tri("Now needs can, last night needs couldn't, and don't can is wrong."), "I can to drive / I couldn't to sleep last night / I am not can hear you": tri("After can/couldn't do not use to. Am not can is wrong."), "I cans drive / I couldn't slept last night / I can't hearing you": tri("Can does not take -s, after couldn't use sleep, after can't use hear.") }, retryFeedback: [tri("Can drive / couldn't sleep / can't hear."), tri("I can drive / I couldn't sleep / I can't hear you."), tri("Hint: I can drive / I couldn't sleep last night / I can't hear you.")], focusWords: ['can drive', "couldn't sleep", "can't hear"] }),
    step({ id: 'modal_can_could_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri("I couldn't speak English before, but now I can."), options: ["I couldn't speak English before, but now I can.", "I can't speak English before, but now I could.", "I couldn't to speak English before, but now I can to.", "I couldn't spoke English before, but now I cans."], correctAnswer: "I couldn't speak English before, but now I can.", correctFeedback: tri("Yes. Before = couldn't speak. Now = can."), wrong: { "I can't speak English before, but now I could.": tri("Before needs couldn't, now needs can."), "I couldn't to speak English before, but now I can to.": tri("After couldn't/can do not use to."), "I couldn't spoke English before, but now I cans.": tri("After couldn't use speak, not spoke. Can does not take -s.") }, retryFeedback: [tri("Before = couldn't speak. Now = can."), tri("I couldn't speak English before, but now I can."), tri("Hint: I couldn't speak English before, but now I can.")], focusWords: ["couldn't speak", 'now I can'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'can_could_time_confusion',
      'can_to_error',
      'could_to_error',
      'modal_plus_s_error',
      'modal_plus_ing_error',
      'can_for_past_ability_error',
      'could_for_present_ability_error',
      'request_politeness_confusion',
      'cant_couldnt_time_confusion',
      'question_order_modal_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Normal explanation: show time, tone, and base verb after can/could.'),
    depth2: tri('Simpler: ask whether this is ability now, ability before, or a polite request.'),
    depth3: tri('Even simpler: compare can speak / could swim / could you help.'),
    depth4: tri("Almost a hint: point directly to can/could/can't/couldn't and the base verb."),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri("Can = ability now. Could = ability in the past or polite request. Can't = cannot now. Couldn't = could not in the past. After can/could use the base verb without to or -s."),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_can_could_meaning_hint_then_retry',
      card: tri('Hint: the system shows whether this is ability now, ability in the past, or a request, but does not choose can/could for you.'),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri("Guided mode: first choose time or tone: now, past, polite request. Then choose can/could/can't/couldn't and the base verb."),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_modal_can_could_001', prompt: tri('Does can usually talk about ability now or in the past?'), options: ['now', 'in the past'], correctIndex: 0, thenReturnToExerciseId: 'modal_can_could_easy_001' },
      { id: 'guided_modal_can_could_002', prompt: tri('In I could swim when I was a child, is could past or present?'), options: ['past', 'present'], correctIndex: 0, thenReturnToExerciseId: 'modal_can_could_contrast_004' },
      { id: 'guided_modal_can_could_003', prompt: tri('After can, do you need to speak or speak?'), options: ['to speak', 'speak'], correctIndex: 1, thenReturnToExerciseId: 'modal_can_could_contrast_003' },
      { id: 'guided_modal_can_could_004', prompt: tri('Does Could you help me sound direct or more polite?'), options: ['direct', 'more polite'], correctIndex: 1, thenReturnToExerciseId: 'modal_can_could_mixed_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'modal',
    microDiagnosisId: 'modal_can_could_ability_request',
    diagnosisLabel: tri('Can / Could', 'Can / Could'),
    contrastSet: CONTRAST,
    difficultyLevel: 2,
    focusWords: ['can speak', 'can drive', "can't hear", 'could swim', "couldn't sleep", 'could you help'],
    focusPatterns: [
      'can_present_ability',
      'can_drive',
      'cant_hear',
      'can_base_no_to',
      'could_base_no_to',
      'she_can_speak_no_s',
      'could_past_ability',
      'couldnt_past_negative',
      'past_present_ability_pair',
      'polite_request_could',
      'permission_could_i',
      'can_direct_request',
      'mixed_ability_request',
      'mixed_present_past_negative',
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
      microDiagnosisId: 'modal_can_could_ability_request',
      contrastSet: ['can', 'could', "can't", "couldn't", 'ability', 'request'],
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logModalMeaning: true,
      logTimeReference: true,
      logVerbFormAfterModal: true,
      logRequestPoliteness: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=modal&microDiagnosisId=modal_can_could_ability_request',
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


