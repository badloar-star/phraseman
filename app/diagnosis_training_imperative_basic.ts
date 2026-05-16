import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = ['base verb imperative', "don't + base verb", 'please', "let's", 'negative imperative', 'instructions', 'commands', 'requests'];
const SMART_CONTRAST = ['base verb imperative', "don't + base verb", 'please', "let's", 'negative imperative', 'instructions', 'commands'];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri('First decide the imperative type: command, negative command, polite request, or let us suggestion.'),
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
    explanationBlock: tri("Imperative usually starts with the base verb: Open, Wait, Be. Negative imperative uses don't + base verb."),
    microTask: tri('Choose the form that works as a command, instruction, request, or suggestion.'),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? tri(`Use ${input.correctAnswer}; imperative needs base verb or don't + base verb.`)])),
    retryFeedback: retry(...input.retryFeedback),
    fallbackExplanation: tri("Command = base verb. Negative command = don't + base verb. Please keeps the same grammar. Let's + base verb means doing it together."),
    focusWords: input.focusWords,
  };
}

export const IMPERATIVE_BASIC_TRAINING: DiagnosisTraining = {
  id: 'imperative_basic',
  category: 'syntax',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 49,
  supportedLocales: ['ru', 'uk'],
  title: tri('Imperative: commands, requests, and instructions', 'Imperative: commands, requests, and instructions'),
  shortTitle: tri('Imperative', 'Imperative'),
  shortDiagnosis: tri("You are building commands like normal statements, or using no/to/you where English wants base verb or don't + base verb."),
  diagnosisText: tri("You are mixing English imperatives: adding unnecessary you, putting to before the verb, or using no instead of don't. Commands usually start with the base verb: Open the door. Don't touch it."),
  mentalModel: tri("Imperative = action immediately. Open the door. Wait here. Please sit down. Negative instruction: Don't open it. Don't be late. Usually no subject you."),
  contrastSet: CONTRAST,
  coreRule: tri("Positive command: base verb. Open the window. Wait here. Be careful. Negative command: Don't + base verb. Don't open it. Polite: Please wait. Let's + base verb = let's do it together."),
  whatUserMustLearn: {
    ru: [
      'Commands usually start with the base verb: Open the door.',
      'Subject you is usually not needed: Open the door.',
      'After please, the structure stays the same: Please wait here.',
      "Negative imperative uses don't + base verb: Don't touch it.",
      "Do not say No touch it. Say Don't touch it.",
      "Do not say Don't to open. Say Don't open.",
      "With be, use Don't be: Don't be late.",
      'Be careful is a normal command with be.',
      "Let's + base verb means let us: Let's go.",
      'Please makes a command softer, but it does not replace grammar.',
    ],
    uk: [
      'Commands usually start with the base verb: Open the door.',
      'Subject you is usually not needed: Open the door.',
      'After please, the structure stays the same: Please wait here.',
      "Negative imperative uses don't + base verb: Don't touch it.",
      "Do not say No touch it. Say Don't touch it.",
      "Do not say Don't to open. Say Don't open.",
      "With be, use Don't be: Don't be late.",
      'Be careful is a normal command with be.',
      "Let's + base verb means let us: Let's go.",
      'Please makes a command softer, but it does not replace grammar.',
    ],
    es: [
      'Commands start with base verb.',
      'You is usually not needed.',
      'Please keeps the same structure.',
      "Negative commands use don't + base verb.",
      "Do not say No touch it.",
      "Do not say Don't to open.",
      "Use Don't be with be.",
      'Be careful is a command.',
      "Let's + base verb means let us.",
      'Please makes commands softer.',
    ],
  },
  examples: [
    { en: 'Open the door.', ru: 'Open the door.', uk: 'Open the door.', es: 'Open the door.', why: tri('The command starts with base verb open; no subject you is needed.') },
    { en: 'Please wait here.', ru: 'Please wait here.', uk: 'Please wait here.', es: 'Please wait here.', why: tri('Please makes the request polite, but the verb stays base form: wait.') },
    { en: "Don't touch it.", ru: "Don't touch it.", uk: "Don't touch it.", es: "Don't touch it.", why: tri("Negative command = don't + base verb.") },
    { en: "Don't be late.", ru: "Don't be late.", uk: "Don't be late.", es: "Don't be late.", why: tri("With be in a negative command, use don't be.") },
    { en: 'Be careful.', ru: 'Be careful.', uk: 'Be careful.', es: 'Be careful.', why: tri('Positive command with be starts with base form be.') },
    { en: "Let's start.", ru: "Let's start.", uk: "Let's start.", es: "Let's start.", why: tri("Let's + base verb suggests doing something together.") },
    { en: "Don't forget your keys.", ru: "Don't forget your keys.", uk: "Don't forget your keys.", es: "Don't forget your keys.", why: tri("Don't + forget is a negative instruction.") },
    { en: 'Turn left and go straight.', ru: 'Turn left and go straight.', uk: 'Turn left and go straight.', es: 'Turn left and go straight.', why: tri('Instructions can have multiple base verbs: turn and go.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('You may be building commands like normal statements. English commands usually start directly with the action: Open, Wait, Go, Do not touch.') },
    { id: 'intro_rule', type: 'rule', text: tri("Positive command = base verb. Negative command = don't + base verb. Polite request = please + base verb.") },
    { id: 'intro_warning', type: 'warning', text: tri("Main mistakes: You open the door, To wait here, No touch it, Don't to go. Correct: Open the door, Wait here, Don't touch it, Don't go.") },
  ],
  steps: [
    step({ id: 'imperative_easy_001', order: 1, difficulty: 'easy', targetSkill: 'positive_command_open', sentence: '___ the door.', translation: tri('Open the door.'), options: ['Open', 'You open', 'To open', 'Opening'], correctAnswer: 'Open', correctFeedback: tri('Yes. A command starts with the base verb: Open the door.'), wrong: { 'You open': tri('In a normal command, you is not needed. Use Open the door.'), 'To open': tri('A command does not start with to. Use Open.'), Opening: tri('Opening does not work as this command. Use base verb Open.') }, retryFeedback: [tri('Command = action immediately.'), tri('Open the door.'), tri('Hint: Open the door.')], focusWords: ['open'] }),
    step({ id: 'imperative_easy_002', order: 2, difficulty: 'easy', targetSkill: 'positive_command_wait', sentence: '___ here.', translation: tri('Wait here.'), options: ['Wait', 'You wait', 'To wait', 'Waiting'], correctAnswer: 'Wait', correctFeedback: tri('Yes. A command starts with the base verb: Wait here.'), wrong: { 'You wait': tri('You can be used for strong emphasis, but the basic command is Wait here.'), 'To wait': tri('To wait does not work as a command. Use Wait here.'), Waiting: tri('Waiting is not this command. Use base verb Wait.') }, retryFeedback: [tri('Wait here = Wait.'), tri('Wait here.'), tri('Hint: Wait here.')], focusWords: ['wait'] }),
    step({ id: 'imperative_easy_003', order: 3, difficulty: 'easy', targetSkill: 'positive_instruction_turn', sentence: '___ left.', translation: tri('Turn left.'), options: ['Turn', 'You turn', 'To turn', 'Turning'], correctAnswer: 'Turn', correctFeedback: tri('Yes. The instruction starts with base verb: Turn left.'), wrong: { 'You turn': tri('In instructions, you is usually not needed. Use Turn left.'), 'To turn': tri('To turn is not the normal command. Use Turn.'), Turning: tri('Turning does not work as this instruction. Use Turn.') }, retryFeedback: [tri('Instruction = base verb.'), tri('Turn left.'), tri('Hint: Turn left.')], focusWords: ['turn'] }),
    step({ id: 'imperative_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'negative_command_touch', sentence: '___ touch it.', translation: tri("Don't touch it."), options: ["Don't", 'No', 'Not', "Doesn't"], correctAnswer: "Don't", correctFeedback: tri("Yes. Negative command = Don't + base verb."), wrong: { No: tri("No touch it is wrong. Use Don't touch it."), Not: tri("Not touch it is wrong. For a command, use Don't touch it."), "Doesn't": tri("Doesn't is for he/she/it statements, not direct commands. Use Don't.") }, retryFeedback: [tri("Do not do it = Don't + verb."), tri("Don't touch it."), tri("Hint: Don't touch it.")], focusWords: ["don't touch"] }),
    step({ id: 'imperative_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'negative_command_open', sentence: "Don't ___ the window.", translation: tri("Don't open the window."), options: ['open', 'to open', 'opening', 'opens'], correctAnswer: 'open', correctFeedback: tri("Yes. After don't in a command, use base verb: Don't open."), wrong: { 'to open': tri("After don't, do not use to. Use Don't open."), opening: tri("Don't opening is wrong. Use base verb open."), opens: tri("After don't, do not add -s. Use open.") }, retryFeedback: [tri("Don't + open."), tri("Don't open the window."), tri("Hint: Don't open the window.")], focusWords: ["don't open"] }),
    step({ id: 'imperative_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'negative_command_forget', sentence: '___ forget your keys.', translation: tri("Don't forget your keys."), options: ["Don't", 'No', 'Not', "Aren't"], correctAnswer: "Don't", correctFeedback: tri("Yes. Don't forget = negative instruction."), wrong: { No: tri("No forget is wrong. Use Don't forget."), Not: tri("Not forget is wrong. Use Don't."), "Aren't": tri("Aren't forget is wrong. Use Don't forget.") }, retryFeedback: [tri("Do not forget = Don't forget."), tri("Don't forget your keys."), tri("Hint: Don't forget your keys.")], focusWords: ["don't forget"] }),
    step({ id: 'imperative_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'be_careful', sentence: '___ careful.', translation: tri('Be careful.'), options: ['Be', 'You are', 'To be', 'Being'], correctAnswer: 'Be', correctFeedback: tri('Yes. A command with be starts with base form: Be careful.'), wrong: { 'You are': tri('You are careful is a statement, not a command.'), 'To be': tri('To be careful is not the direct command. Use Be careful.'), Being: tri('Being careful is not this command. Use Be careful.') }, retryFeedback: [tri('Be careful starts with Be.'), tri('Be careful.'), tri('Hint: Be careful.')], focusWords: ['be careful'] }),
    step({ id: 'imperative_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'dont_be_late', sentence: '___ be late.', translation: tri("Don't be late."), options: ["Don't", 'No', 'Not', "Doesn't"], correctAnswer: "Don't", correctFeedback: tri("Yes. With be in a negative command, use Don't be."), wrong: { No: tri("No be late is wrong. Use Don't be late."), Not: tri("Not be late is not the command form. Use Don't be late."), "Doesn't": tri("Doesn't be late is wrong for a command. Use Don't be late.") }, retryFeedback: [tri("Do not be = Don't be."), tri("Don't be late."), tri("Hint: Don't be late.")], focusWords: ["don't be"] }),
    step({ id: 'imperative_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'dont_be_afraid', sentence: "Don't ___ afraid.", translation: tri("Don't be afraid."), options: ['be', 'to be', 'being', 'are'], correctAnswer: 'be', correctFeedback: tri("Yes. After don't in a command, use base verb be: Don't be afraid."), wrong: { 'to be': tri("Don't to be is wrong. Use Don't be."), being: tri("Don't being is wrong. Use Don't be."), are: tri("Don't are is wrong. After don't, use be.") }, retryFeedback: [tri("Don't + be."), tri("Don't be afraid."), tri("Hint: Don't be afraid.")], focusWords: ["don't be"] }),
    step({ id: 'imperative_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'please_wait', sentence: '___ wait here.', translation: tri('Please wait here.'), options: ['Please', 'To please', 'You please', "Don't please"], correctAnswer: 'Please', correctFeedback: tri('Yes. Please + base verb makes a polite request.'), wrong: { 'To please': tri('To please wait is wrong for this request. Use Please wait.'), 'You please': tri('You please wait is not the basic polite request. Use Please wait.'), "Don't please": tri("Don't please wait changes the meaning and sounds wrong here. Use Please wait.") }, retryFeedback: [tri('Polite = Please + verb.'), tri('Please wait here.'), tri('Hint: Please wait here.')], focusWords: ['please wait'] }),
    step({ id: 'imperative_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'lets_go', sentence: '___ go.', translation: tri("Let's go."), options: ["Let's", 'Let', "Let's to", 'We'], correctAnswer: "Let's", correctFeedback: tri("Yes. Let's + base verb = let us: Let's go."), wrong: { Let: tri("For this meaning, use Let's, not just Let."), "Let's to": tri("After let's, do not use to. Use Let's go."), We: tri("We go is a statement, not a let's suggestion. Use Let's go.") }, retryFeedback: [tri("Let us = Let's."), tri("Let's go."), tri("Hint: Let's go.")], focusWords: ["let's go"] }),
    step({ id: 'imperative_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'lets_start', sentence: "Let's ___ now.", translation: tri("Let's start now."), options: ['start', 'to start', 'starting', 'starts'], correctAnswer: 'start', correctFeedback: tri("Yes. After let's, use base verb: Let's start."), wrong: { 'to start': tri("After let's, do not use to. Use Let's start."), starting: tri("Let's starting is wrong. Use base verb start."), starts: tri("After let's, do not add -s. Use start.") }, retryFeedback: [tri("Let's + start."), tri("Let's start now."), tri("Hint: Let's start now.")], focusWords: ["let's start"] }),
    step({ id: 'imperative_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_positive_negative', sentence: 'Choose the correct pair.', translation: tri("Open the door / Don't touch it"), options: ["Open the door / Don't touch it", 'You open the door / No touch it', 'To open the door / Not touch it', "Opening the door / Doesn't touch it"], correctAnswer: "Open the door / Don't touch it", correctFeedback: tri("Yes. Positive command = base verb. Negative command = Don't + base verb."), wrong: { 'You open the door / No touch it': tri("You is unnecessary in the basic command, and No touch it is wrong. Use Open / Don't touch."), 'To open the door / Not touch it': tri("A command does not start with to, and a negative command needs Don't."), "Opening the door / Doesn't touch it": tri("Opening is not the command, and doesn't is not used for direct commands.") }, retryFeedback: [tri("Open / Don't touch."), tri("Open the door / Don't touch it."), tri("Hint: Open the door / Don't touch it.")], focusWords: ['open', "don't touch"] }),
    step({ id: 'imperative_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_be_negative_lets', sentence: 'Choose the correct set.', translation: tri("Be careful / Don't be late / Let's start"), options: ["Be careful / Don't be late / Let's start", "You are careful / No be late / Let's to start", 'To be careful / Not be late / Let start', "Being careful / Doesn't be late / We start"], correctAnswer: "Be careful / Don't be late / Let's start", correctFeedback: tri("Yes. Be careful, Don't be late, and Let's start are the correct base forms."), wrong: { "You are careful / No be late / Let's to start": tri("You are careful is a statement, No be late is wrong, and Let's to start is wrong."), 'To be careful / Not be late / Let start': tri("To be and Not be are not direct commands. For let us, use Let's."), "Being careful / Doesn't be late / We start": tri("These do not give the needed imperative forms.") }, retryFeedback: [tri("Be / Don't be / Let's."), tri("Be careful / Don't be late / Let's start."), tri("Hint: Be careful / Don't be late / Let's start.")], focusWords: ['be careful', "don't be", "let's start"] }),
    step({ id: 'imperative_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri("Please wait here and don't open the door."), options: ["Please wait here and don't open the door.", "Please to wait here and no open the door.", "You please wait here and don't to open the door.", "Please waiting here and doesn't open the door."], correctAnswer: "Please wait here and don't open the door.", correctFeedback: tri("Yes. Please wait + don't open is the correct polite instruction."), wrong: { "Please to wait here and no open the door.": tri("After please, do not use to, and no open is wrong. Use Please wait / don't open."), "You please wait here and don't to open the door.": tri("You is unnecessary, and after don't do not use to."), "Please waiting here and doesn't open the door.": tri("Please waiting is wrong, and doesn't open is not a direct command.") }, retryFeedback: [tri("Please wait + don't open."), tri("Please wait here and don't open the door."), tri("Hint: Please wait here and don't open the door.")], focusWords: ['please wait', "don't open"] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['unnecessary_you_imperative_error', 'to_before_imperative_error', 'no_instead_of_dont_error', 'dont_to_error', 'dont_plus_ing_error', 'dont_be_error', 'lets_to_error', 'please_wrong_order_error', 'imperative_base_form_error'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Normal explanation: show whether this is a command, prohibition, request, or suggestion together.'),
    depth2: tri('Simpler: ask whether the phrase says do the action or do not do the action.'),
    depth3: tri("Even simpler: compare Open / Don't open / Please open / Let's open."),
    depth4: tri("Almost a hint: point directly to base verb or don't + base verb."),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri("Command = base verb: Open, Wait, Go. Prohibition = Don't + base verb: Don't touch, Don't open, Don't be. Please makes it polite. Let's means let us.") },
    afterThreeWrongInSameExercise: { action: 'show_imperative_type_hint_then_retry', card: tri("Hint: the system shows the phrase type: command, prohibition, request, or let's suggestion, but does not choose the answer.") },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri("Guided mode: first choose action or prohibition. Then choose base verb or don't + base verb.") },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_imperative_001', prompt: tri('Does the command Open the door start with Open or You open?'), options: ['Open', 'You open'], correctIndex: 0, thenReturnToExerciseId: 'imperative_easy_001' },
      { id: 'guided_imperative_002', prompt: tri("Is the negative command No touch or Don't touch?"), options: ['No touch', "Don't touch"], correctIndex: 1, thenReturnToExerciseId: 'imperative_contrast_001' },
      { id: 'guided_imperative_003', prompt: tri("After don't, do you need open or to open?"), options: ['open', 'to open'], correctIndex: 0, thenReturnToExerciseId: 'imperative_contrast_002' },
      { id: 'guided_imperative_004', prompt: tri("Does let's mean a command to one person or a suggestion to do it together?"), options: ['command to one person', 'suggestion together'], correctIndex: 1, thenReturnToExerciseId: 'imperative_mixed_002' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'syntax',
    microDiagnosisId: 'imperative_basic',
    diagnosisLabel: tri('Imperative', 'Imperative'),
    contrastSet: SMART_CONTRAST,
    difficultyLevel: 2,
    focusWords: ['open', 'wait', "don't touch", "don't open", 'be careful', "let's start"],
    focusPatterns: ['positive_command_open', 'positive_command_wait', 'positive_instruction_turn', 'negative_command_touch', 'negative_command_open', 'negative_command_forget', 'be_careful', 'dont_be_late', 'dont_be_afraid', 'please_wait', 'lets_go', 'lets_start', 'mixed_positive_negative', 'mixed_be_negative_lets', 'mixed_sentence_correction'],
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
    payload: { category: 'syntax', microDiagnosisId: 'imperative_basic', contrastSet: ['positive imperative', 'negative imperative', 'please', "let's"], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logImperativeType: true, logVerbForm: true, logPolitenessMarker: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=syntax&microDiagnosisId=imperative_basic',
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


