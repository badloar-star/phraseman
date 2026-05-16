import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = ['if + present simple, present simple', 'if + present simple, will + base verb', 'zero conditional', 'first conditional', 'general truth', 'real future possibility', 'if clause', 'main clause'];
const SMART_CONTRAST = ['zero conditional', 'first conditional', 'if + present', 'will + base verb', 'unless', 'when'];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri('First decide the meaning: general fact or real future condition. Then put will only in the result clause.'),
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
    explanationBlock: tri('Zero Conditional uses if + present, present for facts. First Conditional uses if + present, will + base verb for real future results.'),
    microTask: tri('Choose the form that matches the condition type and keeps will out of the if/when/unless clause.'),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? tri(`Use ${input.correctAnswer}; after if/when/unless, use present simple in this future condition.`)])),
    retryFeedback: retry(...input.retryFeedback),
    fallbackExplanation: tri('Zero = always/usually true: If you heat ice, it melts. First = real future: If it rains, I will stay. No will after if.'),
    focusWords: input.focusWords,
  };
}

export const CONDITION_ZERO_FIRST_TRAINING: DiagnosisTraining = {
  id: 'condition_zero_first',
  category: 'syntax',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 50,
  supportedLocales: ['ru', 'uk'],
  title: tri('Zero / First Conditional: always or possible future', 'Zero / First Conditional: always or possible future'),
  shortTitle: tri('Zero / First Conditional', 'Zero / First Conditional'),
  shortDiagnosis: tri('You are mixing general facts with real future conditions, often putting will after if.'),
  diagnosisText: tri('You are mixing Zero Conditional and First Conditional. Both start with if, but Zero is facts/rules/habits, while First is a real future possibility.'),
  mentalModel: tri('Zero = if this happens, the result is always/usually true. First = if this happens in the future, this result will happen. After if in First Conditional, do not use will.'),
  contrastSet: CONTRAST,
  coreRule: tri('Zero Conditional: If + Present Simple, Present Simple. If you heat ice, it melts. First Conditional: If + Present Simple, will + base verb. If it rains, I will stay home.'),
  whatUserMustLearn: {
    ru: [
      'Zero Conditional is for facts, rules, and typical results: If you heat water, it boils.',
      'Zero often uses Present Simple in both parts.',
      'First Conditional is for real future possibilities: If it rains, I will stay home.',
      'In First Conditional, the if-clause uses Present Simple and the result often uses will.',
      'Do not put will after if in the basic pattern.',
      'Will belongs in the main result clause.',
      'The clauses can change order: I will call you if I finish early.',
      'If the if-clause comes first, a comma is usually used after it.',
      'When means an expected moment; if means a possible condition.',
      'Unless means if not.',
    ],
    uk: [
      'Zero Conditional is for facts, rules, and typical results: If you heat water, it boils.',
      'Zero often uses Present Simple in both parts.',
      'First Conditional is for real future possibilities: If it rains, I will stay home.',
      'In First Conditional, the if-clause uses Present Simple and the result often uses will.',
      'Do not put will after if in the basic pattern.',
      'Will belongs in the main result clause.',
      'The clauses can change order: I will call you if I finish early.',
      'If the if-clause comes first, a comma is usually used after it.',
      'When means an expected moment; if means a possible condition.',
      'Unless means if not.',
    ],
    es: [
      'Zero Conditional is for facts and rules.',
      'Zero often uses Present Simple in both parts.',
      'First Conditional is for real future possibilities.',
      'The if-clause uses Present Simple.',
      'Do not put will after if.',
      'Will belongs in the main result clause.',
      'The clauses can change order.',
      'Use a comma when the if-clause comes first.',
      'When is expected; if is possible.',
      'Unless means if not.',
    ],
  },
  examples: [
    { en: 'If you heat water, it boils.', ru: 'If you heat water, it boils.', uk: 'If you heat water, it boils.', es: 'If you heat water, it boils.', why: tri('This is a general fact, so both parts use Present Simple.') },
    { en: 'If I am tired, I go to bed early.', ru: 'If I am tired, I go to bed early.', uk: 'If I am tired, I go to bed early.', es: 'If I am tired, I go to bed early.', why: tri('This is a typical result, not one future event.') },
    { en: 'If it rains, I will stay home.', ru: 'If it rains, I will stay home.', uk: 'If it rains, I will stay home.', es: 'If it rains, I will stay home.', why: tri('This is a real future possibility: if + present, will + base verb.') },
    { en: 'If I have time, I will call you.', ru: 'If I have time, I will call you.', uk: 'If I have time, I will call you.', es: 'If I have time, I will call you.', why: tri('After if, use have, not will have. Will is in the result.') },
    { en: 'I will call you if I finish early.', ru: 'I will call you if I finish early.', uk: 'I will call you if I finish early.', es: 'I will call you if I finish early.', why: tri('The if-clause can come second; it still uses Present Simple.') },
    { en: "If you don't hurry, you will be late.", ru: "If you don't hurry, you will be late.", uk: "If you don't hurry, you will be late.", es: "If you don't hurry, you will be late.", why: tri("The condition uses don't hurry; the future result uses will be.") },
    { en: 'Unless you hurry, you will be late.', ru: 'Unless you hurry, you will be late.', uk: 'Unless you hurry, you will be late.', es: 'Unless you hurry, you will be late.', why: tri('Unless means if not, and the result uses will be.') },
    { en: 'When I get home, I will text you.', ru: 'When I get home, I will text you.', uk: 'When I get home, I will text you.', es: 'When I get home, I will text you.', why: tri('When marks an expected future moment, but the time clause still uses Present Simple.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('You may be seeing if and automatically adding will next to it. In English, the future result gets will, but the if-clause usually stays Present Simple.') },
    { id: 'intro_rule', type: 'rule', text: tri('Fact: If + Present, Present. Future condition: If + Present, will + verb.') },
    { id: 'intro_warning', type: 'warning', text: tri('Main mistake: If it will rain, I will stay home. Correct: If it rains, I will stay home.') },
  ],
  steps: [
    step({ id: 'cond_zero_first_easy_001', order: 1, difficulty: 'easy', targetSkill: 'zero_fact_water', sentence: 'If you heat water, it ___.', translation: tri('If you heat water, it boils.'), options: ['boils', 'will boil', 'boil', 'is boiling'], correctAnswer: 'boils', correctFeedback: tri('Yes. This is a general fact. Zero Conditional: Present Simple + Present Simple.'), wrong: { 'will boil': tri('Will boil can fit a future case, but this is a universal fact. Use boils.'), boil: tri('Water = it, so Present Simple needs boils.'), 'is boiling': tri('Is boiling is a process now. This general fact needs boils.') }, retryFeedback: [tri('General fact = Present Simple.'), tri('It boils.'), tri('Hint: If you heat water, it boils.')], focusWords: ['boils'] }),
    step({ id: 'cond_zero_first_easy_002', order: 2, difficulty: 'easy', targetSkill: 'zero_habit_tired', sentence: 'If I am tired, I ___ to bed early.', translation: tri('If I am tired, I go to bed early.'), options: ['go', 'will go', 'goes', 'am going'], correctAnswer: 'go', correctFeedback: tri('Yes. This is a typical result. Zero Conditional: if I am tired, I go.'), wrong: { 'will go': tri('Will go fits a concrete future case. Here it is a habit: I go.'), goes: tri('With I, use go, not goes.'), 'am going': tri('Am going suggests a plan/process. This typical result needs go.') }, retryFeedback: [tri('Typical result = I go.'), tri('If I am tired, I go to bed early.'), tri('Hint: If I am tired, I go to bed early.')], focusWords: ['if I am tired', 'go'] }),
    step({ id: 'cond_zero_first_easy_003', order: 3, difficulty: 'easy', targetSkill: 'zero_rule_pair', sentence: 'Choose the correct Zero Conditional sentence.', translation: tri('Choose the sentence with a general rule.'), options: ['If you press this button, the machine starts.', 'If you will press this button, the machine starts.', 'If you press this button, the machine will started.', 'If you pressing this button, the machine starts.'], correctAnswer: 'If you press this button, the machine starts.', correctFeedback: tri('Yes. This is a machine rule: Present Simple + Present Simple.'), wrong: { 'If you will press this button, the machine starts.': tri('After if, do not use will. Use If you press.'), 'If you press this button, the machine will started.': tri('After will, use base verb start, but for this general rule use starts.'), 'If you pressing this button, the machine starts.': tri('If you pressing is wrong. Use If you press.') }, retryFeedback: [tri('Rule = If you press, it starts.'), tri('If you press this button, the machine starts.'), tri('Hint: If you press this button, the machine starts.')], focusWords: ['if you press', 'starts'] }),
    step({ id: 'cond_zero_first_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'first_rain_will_stay', sentence: 'If it rains, I ___ home.', translation: tri('If it rains, I will stay home.'), options: ['will stay', 'stay', 'stayed', 'am stay'], correctAnswer: 'will stay', correctFeedback: tri('Yes. This is a real future condition. The result is will stay.'), wrong: { stay: tri('Stay sounds like a habit. Here the concrete future result is will stay.'), stayed: tri('Stayed is past. This result is future.'), 'am stay': tri('Am stay is wrong. Use will stay.') }, retryFeedback: [tri('Future result = will stay.'), tri('If it rains, I will stay home.'), tri('Hint: If it rains, I will stay home.')], focusWords: ['if it rains', 'will stay'] }),
    step({ id: 'cond_zero_first_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'first_have_time_call', sentence: 'If I have time, I ___ you.', translation: tri('If I have time, I will call you.'), options: ['will call', 'call', 'called', 'am call'], correctAnswer: 'will call', correctFeedback: tri('Yes. If I have time is the condition; I will call you is the future result.'), wrong: { call: tri('Call can sound like a habit. This future result needs will call.'), called: tri('Called is past. Use a future result.'), 'am call': tri('Am call is wrong. Use will call.') }, retryFeedback: [tri('If I have time -> I will call.'), tri('I will call you.'), tri('Hint: If I have time, I will call you.')], focusWords: ['if I have time', 'will call'] }),
    step({ id: 'cond_zero_first_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'first_dont_hurry_late', sentence: "If you don't hurry, you ___ late.", translation: tri("If you don't hurry, you will be late."), options: ['will be', 'are', 'were', 'will are'], correctAnswer: 'will be', correctFeedback: tri('Yes. This is the future result of the condition: you will be late.'), wrong: { are: tri('Are late means you are late now. The future result is will be late.'), were: tri('Were is past. Use the future result.'), 'will are': tri('After will, use base verb be, not are.') }, retryFeedback: [tri('After will, use be.'), tri('You will be late.'), tri("Hint: If you don't hurry, you will be late.")], focusWords: ["if you don't hurry", 'will be'] }),
    step({ id: 'cond_zero_first_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'no_will_after_if_rain', sentence: 'Choose the correct sentence.', translation: tri('If it rains tomorrow, I will stay home.'), options: ['If it rains tomorrow, I will stay home.', 'If it will rain tomorrow, I will stay home.', 'If it rains tomorrow, I stay home.', 'If it raining tomorrow, I will stay home.'], correctAnswer: 'If it rains tomorrow, I will stay home.', correctFeedback: tri('Yes. After if, use rains, not will rain.'), wrong: { 'If it will rain tomorrow, I will stay home.': tri('After if in First Conditional, do not use will. Use If it rains.'), 'If it rains tomorrow, I stay home.': tri('I stay home sounds like a habit. Here the future result is I will stay home.'), 'If it raining tomorrow, I will stay home.': tri('If it raining is wrong. Use If it rains.') }, retryFeedback: [tri('If + rains, will stay.'), tri('If it rains, I will stay.'), tri('Hint: If it rains tomorrow, I will stay home.')], focusWords: ['if it rains', 'will stay'] }),
    step({ id: 'cond_zero_first_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'no_will_after_if_have', sentence: 'Choose the correct sentence.', translation: tri('If I have time, I will help you.'), options: ['If I have time, I will help you.', 'If I will have time, I will help you.', 'If I have time, I help you.', 'If I had time, I will help you.'], correctAnswer: 'If I have time, I will help you.', correctFeedback: tri('Yes. After if, use have; in the result, use will help.'), wrong: { 'If I will have time, I will help you.': tri('After if, do not use will. Use If I have time.'), 'If I have time, I help you.': tri('I help you sounds like a habit. For a future result, use I will help you.'), 'If I had time, I will help you.': tri('Had time belongs to another conditional pattern. For real future, use If I have time.') }, retryFeedback: [tri('If I have, I will help.'), tri('If I have time, I will help you.'), tri('Hint: If I have time, I will help you.')], focusWords: ['if I have time', 'will help'] }),
    step({ id: 'cond_zero_first_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'main_clause_first', sentence: 'I will call you if I ___ early.', translation: tri('I will call you if I finish early.'), options: ['finish', 'will finish', 'finished', 'am finish'], correctAnswer: 'finish', correctFeedback: tri('Yes. Even when the if-clause comes second, after if use Present Simple: if I finish.'), wrong: { 'will finish': tri('After if, do not use will. Use if I finish.'), finished: tri('Finished is past. This real future condition uses finish.'), 'am finish': tri('Am finish is wrong. Use finish.') }, retryFeedback: [tri('After if = finish, not will finish.'), tri('I will call you if I finish early.'), tri('Hint: I will call you if I finish early.')], focusWords: ['will call', 'if I finish'] }),
    step({ id: 'cond_zero_first_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'unless_if_not', sentence: 'Unless you hurry, you ___ late.', translation: tri('Unless you hurry, you will be late.'), options: ['will be', 'are', 'will are', 'were'], correctAnswer: 'will be', correctFeedback: tri('Yes. Unless you hurry = if you do not hurry. The result is you will be late.'), wrong: { are: tri('Are late means late now. Here the future result is will be late.'), 'will are': tri('After will, use be, not are.'), were: tri('Were is past. Use the future result.') }, retryFeedback: [tri('Unless = if not. Result = will be.'), tri('Unless you hurry, you will be late.'), tri('Hint: Unless you hurry, you will be late.')], focusWords: ['unless you hurry', 'will be'] }),
    step({ id: 'cond_zero_first_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'when_future_time_clause', sentence: 'When I ___ home, I will text you.', translation: tri('When I get home, I will text you.'), options: ['get', 'will get', 'got', 'am get'], correctAnswer: 'get', correctFeedback: tri('Yes. After when in a future time clause, use Present Simple: when I get home.'), wrong: { 'will get': tri('After when in a future time clause, do not use will. Use when I get.'), got: tri('Got is past. Here the future time clause uses Present Simple: get.'), 'am get': tri('Am get is wrong. Use get.') }, retryFeedback: [tri('When I get, I will text.'), tri('When I get home, I will text you.'), tri('Hint: When I get home, I will text you.')], focusWords: ['when I get', 'will text'] }),
    step({ id: 'cond_zero_first_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'if_vs_when', sentence: 'Choose the better word: ___ I get home, I will text you. I am already on my way.', translation: tri('When I get home, I will text you. I am already on my way.'), options: ['When', 'If', 'Unless', 'Because'], correctAnswer: 'When', correctFeedback: tri('Yes. The speaker is already on the way, so the event is expected. When is better.'), wrong: { If: tri('If adds uncertainty. Here the speaker is already on the way, so use when.'), Unless: tri('Unless means if not. Here you need when.'), Because: tri('Because means for the reason that. Here you need the time word when.') }, retryFeedback: [tri('Expected event = when.'), tri('When I get home, I will text you.'), tri('Hint: When I get home, I will text you.')], focusWords: ['when I get'] }),
    step({ id: 'cond_zero_first_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_zero_first_pair', sentence: 'Choose the correct pair.', translation: tri('If you heat ice, it melts / If it rains tomorrow, I will stay home'), options: ['If you heat ice, it melts / If it rains tomorrow, I will stay home', 'If you will heat ice, it will melts / If it will rain tomorrow, I stay home', 'If you heat ice, it will melted / If it rains tomorrow, I stay home', 'If you heating ice, it melts / If it raining tomorrow, I will stay home'], correctAnswer: 'If you heat ice, it melts / If it rains tomorrow, I will stay home', correctFeedback: tri('Yes. Fact = Present + Present. Future condition = If + Present, will + verb.'), wrong: { 'If you will heat ice, it will melts / If it will rain tomorrow, I stay home': tri('After if, do not use will; will melts is wrong; the second result needs will stay.'), 'If you heat ice, it will melted / If it rains tomorrow, I stay home': tri('Will melted is wrong. The future result needs I will stay.'), 'If you heating ice, it melts / If it raining tomorrow, I will stay home': tri('If you heating and if it raining are wrong. Use heat/rains.') }, retryFeedback: [tri('Zero: if heat, melts. First: if rains, will stay.'), tri('If you heat ice, it melts / If it rains, I will stay.'), tri('Hint: If you heat ice, it melts / If it rains tomorrow, I will stay home.')], focusWords: ['if you heat', 'melts', 'if it rains', 'will stay'] }),
    step({ id: 'cond_zero_first_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_if_when_unless', sentence: 'Choose the correct set.', translation: tri('if I have time / when I arrive / unless you hurry'), options: ['if I have time / when I arrive / unless you hurry', 'if I will have time / when I will arrive / unless you will hurry', "if I have time / when I will arrive / unless you don't hurry", "if I will have time / when I arrive / unless you don't hurry"], correctAnswer: 'if I have time / when I arrive / unless you hurry', correctFeedback: tri('Yes. After if/when/unless in this future meaning, use Present Simple.'), wrong: { 'if I will have time / when I will arrive / unless you will hurry': tri('After if/when/unless in these clauses, do not use will.'), "if I have time / when I will arrive / unless you don't hurry": tri("After when, do not use will. Unless already means if not, so unless you don't hurry doubles the negative idea."), "if I will have time / when I arrive / unless you don't hurry": tri('After if, do not use will. Unless already contains the negative meaning.') }, retryFeedback: [tri('If/when/unless + Present Simple.'), tri('If I have / when I arrive / unless you hurry.'), tri('Hint: if I have time / when I arrive / unless you hurry.')], focusWords: ['if I have', 'when I arrive', 'unless you hurry'] }),
    step({ id: 'cond_zero_first_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('If I finish early, I will call you, and when I get home, I will text you.'), options: ['If I finish early, I will call you, and when I get home, I will text you.', 'If I will finish early, I will call you, and when I will get home, I will text you.', 'If I finish early, I call you, and when I get home, I text you.', 'If I finished early, I will call you, and when I got home, I will text you.'], correctAnswer: 'If I finish early, I will call you, and when I get home, I will text you.', correctFeedback: tri('Yes. After if/when, use Present Simple; in the result clauses, use will.'), wrong: { 'If I will finish early, I will call you, and when I will get home, I will text you.': tri('After if and when in future meaning, do not use will.'), 'If I finish early, I call you, and when I get home, I text you.': tri('I call/I text sounds like a habit. Here the future results are will call / will text.'), 'If I finished early, I will call you, and when I got home, I will text you.': tri('Finished/got point to past or another conditional. For real future, use finish/get.') }, retryFeedback: [tri('If I finish -> I will call. When I get -> I will text.'), tri('If I finish early, I will call you. When I get home, I will text you.'), tri('Hint: If I finish early, I will call you, and when I get home, I will text you.')], focusWords: ['if I finish', 'will call', 'when I get', 'will text'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['will_in_if_clause_error', 'zero_first_meaning_confusion', 'missing_will_main_clause_error', 'present_simple_result_instead_of_future_error', 'wrong_present_simple_third_person_error', 'unless_meaning_error', 'when_if_confusion_error', 'if_clause_order_error', 'main_clause_order_error'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Normal explanation: show whether this is a general fact or a real future condition.'),
    depth2: tri('Simpler: ask whether the result is always/usually true or happens only if the future condition happens.'),
    depth3: tri('Even simpler: compare If water boils / If it rains, I will stay.'),
    depth4: tri('Almost a hint: point directly to Zero Conditional or First Conditional.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Zero Conditional = fact: If + Present, Present. First Conditional = real future: If + Present, will + verb. After if/when/unless, usually no will.') },
    afterThreeWrongInSameExercise: { action: 'show_condition_type_hint_then_retry', card: tri('Hint: the system shows whether this is a general fact or real future condition, but does not choose the form.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Guided mode: first choose always/usually or possible future. Then choose the if-clause and result form.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_cond_zero_first_001', prompt: tri('If you heat water, it boils: is this a general fact or a future plan?'), options: ['general fact', 'future plan'], correctIndex: 0, thenReturnToExerciseId: 'cond_zero_first_easy_001' },
      { id: 'guided_cond_zero_first_002', prompt: tri('In First Conditional after if, do we usually use rains or will rain?'), options: ['rains', 'will rain'], correctIndex: 0, thenReturnToExerciseId: 'cond_zero_first_contrast_004' },
      { id: 'guided_cond_zero_first_003', prompt: tri('In I will call you if I finish early, is will in the if-clause or the main clause?'), options: ['if-clause', 'main clause'], correctIndex: 1, thenReturnToExerciseId: 'cond_zero_first_contrast_006' },
      { id: 'guided_cond_zero_first_004', prompt: tri("Does Unless you hurry mean if you hurry or if you don't hurry?"), options: ['if you hurry', "if you don't hurry"], correctIndex: 1, thenReturnToExerciseId: 'cond_zero_first_mixed_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'syntax',
    microDiagnosisId: 'condition_zero_first',
    diagnosisLabel: tri('Zero / First Conditional', 'Zero / First Conditional'),
    contrastSet: SMART_CONTRAST,
    difficultyLevel: 2,
    focusWords: ['if it rains', 'will stay', 'if I have time', 'unless you hurry', 'when I get'],
    focusPatterns: ['zero_fact_water', 'zero_habit_tired', 'zero_rule_pair', 'first_rain_will_stay', 'first_have_time_call', 'first_dont_hurry_late', 'no_will_after_if_rain', 'no_will_after_if_have', 'main_clause_first', 'unless_if_not', 'when_future_time_clause', 'if_vs_when', 'mixed_zero_first_pair', 'mixed_if_when_unless', 'mixed_sentence_correction'],
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
    payload: { category: 'syntax', microDiagnosisId: 'condition_zero_first', contrastSet: ['zero conditional', 'first conditional', 'if clause', 'main clause', 'unless', 'when'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logConditionalType: true, logIfClauseTense: true, logMainClauseTense: true, logConjunction: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=syntax&microDiagnosisId=condition_zero_first',
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


