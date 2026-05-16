import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = ['am/is/are + verb-ing', 'future arrangement', 'tomorrow', 'on Monday', 'tonight', 'next week', 'going to', 'will', 'present continuous now'];
const SMART_CONTRAST = ['am/is/are + verb-ing', 'future arrangement', 'tomorrow', 'on Monday', 'tonight', 'next week', 'going to', 'will'];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri('First find the time marker: now means current action, tomorrow/tonight/next week can mean a future arrangement.'),
    depth2,
    depth3,
    depth4,
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(`Check the time marker and the be + -ing form. Correct form: ${correct}.`);
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
      'Present Continuous can describe a future arrangement when a future time marker is present: I am meeting John tomorrow.',
    ),
    microTask: tri('Choose the correct future arrangement, current action, will, or going to form.'),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? defaultWrong(input.correctAnswer)])),
    retryFeedback: retry(...input.retryFeedback),
    fallbackExplanation: tri('Future arrangement = am/is/are + verb-ing with a future marker. Spontaneous decision = will. Intention = going to.'),
    focusWords: input.focusWords,
  };
}

export const FUTURE_PRESENT_CONTINUOUS_ARRANGEMENTS_TRAINING: DiagnosisTraining = {
  id: 'future_present_continuous_arrangements',
  category: 'verb',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 45,
  supportedLocales: ['ru', 'uk'],
  title: tri('Present Continuous for Future: arranged already', 'Present Continuous for Future: arranged already'),
  shortTitle: tri('Future Arrangements', 'Future Arrangements'),
  shortDiagnosis: tri('You are mixing Present Continuous future arrangements with now, will, and going to.'),
  diagnosisText: tri(
    'You are mixing Present Continuous for future with current actions, will, and going to. Am/is/are + -ing can describe the future if there is a specific arrangement and a future time marker.',
  ),
  mentalModel: tri(
    'Present Continuous for future = arranged already: I am meeting John tomorrow. She is flying to London on Monday. Tomorrow/on Monday makes the meaning future, not right now.',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'With a future marker and an arranged plan, use Present Continuous: I am meeting him tomorrow. We are having dinner tonight. She is leaving next week.',
  ),
  whatUserMustLearn: {
    ru: [
      'Present Continuous can describe future arrangements: I am meeting him tomorrow.',
      'Future meaning is usually visible through tomorrow, tonight, next week, on Monday, or at 6.',
      'The form stays am/is/are + verb-ing: I am meeting, she is flying, they are coming.',
      'The time context decides whether the action is now or future.',
      'Will often fits spontaneous decisions, promises, and predictions.',
      'Going to often shows intention or a plan.',
      'Present Continuous for future sounds like a concrete arrangement.',
      'Do not say I meeting him tomorrow. Use I am meeting.',
      'Do not say I am meet him tomorrow. Use I am meeting.',
      'Timetables often use Present Simple, but personal arrangements often use Present Continuous.',
    ],
    uk: [
      'Present Continuous can describe future arrangements: I am meeting him tomorrow.',
      'Future meaning is usually visible through tomorrow, tonight, next week, on Monday, or at 6.',
      'The form stays am/is/are + verb-ing: I am meeting, she is flying, they are coming.',
      'The time context decides whether the action is now or future.',
      'Will often fits spontaneous decisions, promises, and predictions.',
      'Going to often shows intention or a plan.',
      'Present Continuous for future sounds like a concrete arrangement.',
      'Do not say I meeting him tomorrow. Use I am meeting.',
      'Do not say I am meet him tomorrow. Use I am meeting.',
      'Timetables often use Present Simple, but personal arrangements often use Present Continuous.',
    ],
    es: [
      'Present Continuous can describe future arrangements.',
      'Future markers include tomorrow, tonight, next week, on Monday, at 6.',
      'Use am/is/are + verb-ing.',
      'Time context decides now or future.',
      'Will often marks spontaneous decisions.',
      'Going to often marks intention.',
      'Future arrangement sounds concrete.',
      'Do not omit be.',
      'Use -ing after be.',
      'Timetables often use Present Simple.',
    ],
  },
  examples: [
    { en: 'I am meeting John tomorrow.', ru: 'I am meeting John tomorrow.', uk: 'I am meeting John tomorrow.', es: 'I am meeting John tomorrow.', why: tri('Tomorrow marks the future; am meeting sounds like an arrangement.') },
    { en: 'She is flying to London on Monday.', ru: 'She is flying to London on Monday.', uk: 'She is flying to London on Monday.', es: 'She is flying to London on Monday.', why: tri('On Monday marks a future plan; is flying sounds organized.') },
    { en: 'We are having dinner tonight.', ru: 'We are having dinner tonight.', uk: 'We are having dinner tonight.', es: 'We are having dinner tonight.', why: tri('Tonight marks the future; are having shows an arranged plan.') },
    { en: 'They are coming next week.', ru: 'They are coming next week.', uk: 'They are coming next week.', es: 'They are coming next week.', why: tri('Next week sets future time; are coming shows a planned visit.') },
    { en: 'Are you working tomorrow?', ru: 'Are you working tomorrow?', uk: 'Are you working tomorrow?', es: 'Are you working tomorrow?', why: tri('Tomorrow makes the question about a planned work shift.') },
    { en: 'I am not going out tonight.', ru: 'I am not going out tonight.', uk: 'I am not going out tonight.', es: 'I am not going out tonight.', why: tri('Tonight makes the meaning future; am not going out states the evening plan.') },
    { en: 'I am calling him now.', ru: 'I am calling him now.', uk: 'I am calling him now.', es: 'I am calling him now.', why: tri('Now makes this normal Present Continuous, not future.') },
    { en: 'I am calling him tomorrow.', ru: 'I am calling him tomorrow.', uk: 'I am calling him tomorrow.', es: 'I am calling him tomorrow.', why: tri('Tomorrow changes the same form into a future plan.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('You may see am meeting and think only "now". But with tomorrow, tonight, or next week, the same form can mean a future plan.') },
    { id: 'intro_rule', type: 'rule', text: tri('The form is the same: am/is/are + verb-ing. With a future marker it often means arranged already.') },
    { id: 'intro_warning', type: 'warning', text: tri('Do not say I meeting tomorrow or I am meet tomorrow. Say I am meeting tomorrow.') },
  ],
  steps: [
    step({ id: 'future_pc_easy_001', order: 1, difficulty: 'easy', targetSkill: 'future_arrangement_meeting', sentence: 'I ___ John tomorrow.', translation: tri('I am meeting John tomorrow.'), options: ['am meeting', 'meet', 'meeting', 'am meet'], correctAnswer: 'am meeting', correctFeedback: tri('Yes. Tomorrow marks the future, and am meeting sounds like an arrangement.'), wrong: { meet: tri('Meet can be a schedule or regular fact, but for a personal arrangement tomorrow use am meeting.'), meeting: tri('Meeting without am is incomplete. Use am meeting.'), 'am meet': tri('After am use verb-ing: am meeting.') }, retryFeedback: [tri('Tomorrow + arrangement = am meeting.'), tri('I am meeting John tomorrow.'), tri('Hint: I am meeting John tomorrow.')], focusWords: ['am meeting', 'tomorrow'] }),
    step({ id: 'future_pc_easy_002', order: 2, difficulty: 'easy', targetSkill: 'future_arrangement_tonight', sentence: 'We ___ dinner tonight.', translation: tri('We are having dinner tonight.'), options: ['are having', 'have', 'having', 'are have'], correctAnswer: 'are having', correctFeedback: tri('Yes. Tonight marks a future plan. We takes are: are having.'), wrong: { have: tri('Have sounds like a general fact or habit. For tonight as a concrete plan use are having.'), having: tri('Having without are is incomplete. Use are having.'), 'are have': tri('After are use verb-ing: are having.') }, retryFeedback: [tri('We + are + having.'), tri('We are having dinner tonight.'), tri('Hint: We are having dinner tonight.')], focusWords: ['are having', 'tonight'] }),
    step({ id: 'future_pc_easy_003', order: 3, difficulty: 'easy', targetSkill: 'now_vs_tomorrow_pair', sentence: 'Choose the correct pair.', translation: tri('I am calling now / I am calling tomorrow'), options: ['I am calling now / I am calling tomorrow', 'I call now / I call tomorrow', 'I calling now / I calling tomorrow', 'I am call now / I am call tomorrow'], correctAnswer: 'I am calling now / I am calling tomorrow', correctFeedback: tri('Yes. Same form: now = current action, tomorrow = future plan.'), wrong: { 'I call now / I call tomorrow': tri('For the action now and the concrete plan tomorrow, am calling is more natural.'), 'I calling now / I calling tomorrow': tri('Calling needs am: I am calling.'), 'I am call now / I am call tomorrow': tri('After am use calling, not call.') }, retryFeedback: [tri('Am + calling. Now or tomorrow changes the meaning.'), tri('I am calling now / I am calling tomorrow.'), tri('Hint: I am calling now / I am calling tomorrow.')], focusWords: ['am calling now', 'am calling tomorrow'] }),
    step({ id: 'future_pc_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'she_is_flying', sentence: 'She ___ to London on Monday.', translation: tri('She is flying to London on Monday.'), options: ['is flying', 'are flying', 'flies', 'is fly'], correctAnswer: 'is flying', correctFeedback: tri('Yes. She takes is. On Monday marks a future plan: is flying.'), wrong: { 'are flying': tri('Are goes with you/we/they. She takes is.'), flies: tri('Flies can sound like a schedule or regular fact. For her organized trip use is flying.'), 'is fly': tri('After is use verb-ing: is flying.') }, retryFeedback: [tri('She + is + flying.'), tri('She is flying to London.'), tri('Hint: She is flying to London on Monday.')], focusWords: ['is flying', 'on Monday'] }),
    step({ id: 'future_pc_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'they_are_coming', sentence: 'They ___ next week.', translation: tri('They are coming next week.'), options: ['are coming', 'is coming', 'come', 'are come'], correctAnswer: 'are coming', correctFeedback: tri('Yes. They takes are. Next week marks a future plan.'), wrong: { 'is coming': tri('Is goes with he/she/it. They takes are.'), come: tri('Come can sound like a schedule or regular fact. For an arranged visit use are coming.'), 'are come': tri('After are use coming, not come.') }, retryFeedback: [tri('They + are + coming.'), tri('They are coming next week.'), tri('Hint: They are coming next week.')], focusWords: ['are coming', 'next week'] }),
    step({ id: 'future_pc_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'i_am_leaving', sentence: 'I ___ at 8 tomorrow.', translation: tri('I am leaving at 8 tomorrow.'), options: ['am leaving', 'leave', 'leaving', 'am leave'], correctAnswer: 'am leaving', correctFeedback: tri('Yes. At 8 tomorrow marks a concrete future plan: am leaving.'), wrong: { leave: tri('Leave can be a timetable, but for a personal plan use am leaving.'), leaving: tri('Leaving without am is incomplete. Use am leaving.'), 'am leave': tri('After am use leaving, not leave.') }, retryFeedback: [tri('I + am + leaving.'), tri('I am leaving at 8 tomorrow.'), tri('Hint: I am leaving at 8 tomorrow.')], focusWords: ['am leaving', 'at 8 tomorrow'] }),
    step({ id: 'future_pc_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'question_are_you_working', sentence: '___ you working tomorrow?', translation: tri('Are you working tomorrow?'), options: ['Are', 'Do', 'Will', 'Did'], correctAnswer: 'Are', correctFeedback: tri('Yes. In a Present Continuous question, are comes before you: Are you working tomorrow?'), wrong: { Do: tri('Do you working is wrong. Use Are you working?'), Will: tri('Will you work is possible with a different nuance, but for a planned shift use Are you working tomorrow?'), Did: tri('Did is past. Tomorrow asks about a future plan: Are you working?') }, retryFeedback: [tri('Question: Are + you + working?'), tri('Are you working tomorrow?'), tri('Hint: Are you working tomorrow?')], focusWords: ['are you working'] }),
    step({ id: 'future_pc_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'negative_not_going_out', sentence: 'I ___ going out tonight.', translation: tri('I am not going out tonight.'), options: ['am not', 'do not', 'will not', 'did not'], correctAnswer: 'am not', correctFeedback: tri('Yes. Present Continuous negative: am not going out.'), wrong: { 'do not': tri('Do not going out is wrong. Use am not going out.'), 'will not': tri('Will not go out is possible, but for a settled plan tonight use am not going out.'), 'did not': tri('Did not is past. Tonight is future here.') }, retryFeedback: [tri('I am not + going out.'), tri('I am not going out tonight.'), tri('Hint: I am not going out tonight.')], focusWords: ['am not going out'] }),
    step({ id: 'future_pc_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'question_pair', sentence: 'Choose the correct question.', translation: tri('What are you doing tomorrow evening?'), options: ['What are you doing tomorrow evening?', 'What do you doing tomorrow evening?', 'What will you doing tomorrow evening?', 'What did you doing tomorrow evening?'], correctAnswer: 'What are you doing tomorrow evening?', correctFeedback: tri('Yes. Question word + are + you + doing + future marker.'), wrong: { 'What do you doing tomorrow evening?': tri('Do you doing is wrong. Use are you doing.'), 'What will you doing tomorrow evening?': tri('Will you doing is wrong. With will, use will do; for plans use are you doing.'), 'What did you doing tomorrow evening?': tri('Did is past and does not work with doing here. Use are you doing.') }, retryFeedback: [tri('What + are + you + doing?'), tri('What are you doing tomorrow evening?'), tri('Hint: What are you doing tomorrow evening?')], focusWords: ['what are you doing'] }),
    step({ id: 'future_pc_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'arrangement_vs_will', sentence: 'I ___ my doctor at 3 tomorrow.', translation: tri('I am seeing my doctor at 3 tomorrow.'), options: ['am seeing', 'will see', 'see', 'am see'], correctAnswer: 'am seeing', correctFeedback: tri('Yes. At 3 tomorrow sounds like a concrete appointment: am seeing.'), wrong: { 'will see': tri('Will see can work in another meaning, but for a booked appointment use am seeing.'), see: tri('See is not the best form for a personal appointment. Use am seeing.'), 'am see': tri('After am use seeing, not see.') }, retryFeedback: [tri('Doctor appointment = am seeing.'), tri('I am seeing my doctor tomorrow.'), tri('Hint: I am seeing my doctor at 3 tomorrow.')], focusWords: ['am seeing', 'doctor at 3'] }),
    step({ id: 'future_pc_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'spontaneous_will', sentence: 'The phone is ringing. I ___ answer it.', translation: tri('The phone is ringing. I will answer it.'), options: ['will', 'am answering', 'answer', 'am answer'], correctAnswer: 'will', correctFeedback: tri('Yes. This is a decision made now, not an arranged plan. Use will.'), wrong: { 'am answering': tri('Am answering sounds like now or a plan. Here the decision happens as you speak: will answer.'), answer: tri('I answer it does not express this spontaneous future decision. Use I will answer it.'), 'am answer': tri('Am answer is wrong. Use will answer for the spontaneous decision.') }, retryFeedback: [tri('Decision now = will.'), tri('I will answer it.'), tri('Hint: The phone is ringing. I will answer it.')], focusWords: ['will answer'] }),
    step({ id: 'future_pc_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'going_to_intention', sentence: 'I ___ start learning English next month.', translation: tri('I am going to start learning English next month.'), options: ['am going to', 'am starting', 'will to', 'going'], correctAnswer: 'am going to', correctFeedback: tri('Yes. Going to shows intention: am going to start.'), wrong: { 'am starting': tri('Am starting is possible with a concrete arrangement, but for intention "going to" fits better.'), 'will to': tri('Will to is wrong. Do not use to after will.'), going: tri('Do not say I going to. Use I am going to.') }, retryFeedback: [tri('Intention = am going to.'), tri('I am going to start.'), tri('Hint: I am going to start learning English next month.')], focusWords: ['am going to'] }),
    step({ id: 'future_pc_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_now_future_pair', sentence: 'Choose the correct pair.', translation: tri('She is flying now / She is flying on Monday'), options: ['She is flying now / She is flying on Monday', 'She flies now / She flies on Monday', 'She flying now / She flying on Monday', 'She is fly now / She is fly on Monday'], correctAnswer: 'She is flying now / She is flying on Monday', correctFeedback: tri('Yes. Same form: now = current action, on Monday = future plan.'), wrong: { 'She flies now / She flies on Monday': tri('Flies sounds like schedule or regularity. For now and a personal plan, use is flying.'), 'She flying now / She flying on Monday': tri('Flying without is is incomplete. Use she is flying.'), 'She is fly now / She is fly on Monday': tri('After is use flying, not fly.') }, retryFeedback: [tri('Is flying now / is flying on Monday.'), tri('She is flying now / She is flying on Monday.'), tri('Hint: She is flying now / She is flying on Monday.')], focusWords: ['is flying now', 'is flying on Monday'] }),
    step({ id: 'future_pc_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_arrangement_will_intention', sentence: 'Choose the best set.', translation: tri('I am seeing my doctor at 3 / I will answer it / I am going to study'), options: ['I am seeing my doctor at 3 / I will answer it / I am going to study', 'I will see my doctor at 3 / I am answering it / I studying', 'I see my doctor at 3 / I will to answer it / I going to study', 'I am see my doctor at 3 / I answer it / I am going study'], correctAnswer: 'I am seeing my doctor at 3 / I will answer it / I am going to study', correctFeedback: tri('Yes. Arrangement = am seeing. Spontaneous decision = will answer. Intention = am going to study.'), wrong: { 'I will see my doctor at 3 / I am answering it / I studying': tri('Doctor at 3 is better as an arrangement, phone decision is will, and I studying is wrong.'), 'I see my doctor at 3 / I will to answer it / I going to study': tri('Will to answer is wrong, and I going to study is missing am.'), 'I am see my doctor at 3 / I answer it / I am going study': tri('Am see is wrong. Am going study is missing to.') }, retryFeedback: [tri('Arrangement = am seeing. Decision = will. Intention = going to.'), tri('I am seeing / I will answer / I am going to study.'), tri('Hint: I am seeing my doctor at 3 / I will answer it / I am going to study.')], focusWords: ['am seeing', 'will answer', 'going to'] }),
    step({ id: 'future_pc_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('I am working tomorrow, and I am meeting a friend in the evening.'), options: ['I am working tomorrow, and I am meeting a friend in the evening.', 'I work tomorrow, and I meet a friend in the evening.', 'I working tomorrow, and I meeting a friend in the evening.', 'I am work tomorrow, and I am meet a friend in the evening.'], correctAnswer: 'I am working tomorrow, and I am meeting a friend in the evening.', correctFeedback: tri('Yes. Tomorrow and in the evening mark future plans: am working / am meeting.'), wrong: { 'I work tomorrow, and I meet a friend in the evening.': tri('Present Simple can work for some schedules, but for personal plans Present Continuous is more natural.'), 'I working tomorrow, and I meeting a friend in the evening.': tri('Both parts are missing am.'), 'I am work tomorrow, and I am meet a friend in the evening.': tri('After am use verb-ing: working, meeting.') }, retryFeedback: [tri('Am working tomorrow / am meeting in the evening.'), tri('I am working tomorrow. I am meeting a friend.'), tri('Hint: I am working tomorrow, and I am meeting a friend in the evening.')], focusWords: ['am working tomorrow', 'am meeting'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'missing_be_future_arrangement_error',
      'be_plus_base_error',
      'wrong_be_form_error',
      'present_now_future_confusion_error',
      'will_instead_of_arrangement_error',
      'going_to_vs_arrangement_error',
      'time_marker_misread_error',
      'question_order_error',
      'negative_order_error',
      'present_simple_schedule_confusion_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Normal explanation: show the future marker and the am/is/are + -ing form.'),
    depth2: tri('Simpler: ask whether the action is happening now or planned for the future.'),
    depth3: tri('Even simpler: compare I am calling now / I am calling tomorrow.'),
    depth4: tri('Almost a hint: point directly to am/is/are + verb-ing for a future arrangement.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri('Present Continuous can describe the future with a future marker: tomorrow, tonight, next week, at 6. Formula: am/is/are + verb-ing. I am meeting him tomorrow = arranged already.'),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_time_marker_hint_then_retry',
      card: tri('Hint: the system shows the time marker and whether this is now or a future plan, but does not choose the form.'),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri('Guided mode: first choose now or future marker. Then choose the be + -ing form.'),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_future_pc_001', prompt: tri('Does tomorrow show an action now or a future plan?'), options: ['action now', 'future plan'], correctIndex: 1, thenReturnToExerciseId: 'future_pc_easy_001' },
      { id: 'guided_future_pc_002', prompt: tri('After am/is/are, do we need meet or meeting?'), options: ['meet', 'meeting'], correctIndex: 1, thenReturnToExerciseId: 'future_pc_easy_001' },
      { id: 'guided_future_pc_003', prompt: tri('With she, do we need is flying or are flying?'), options: ['is flying', 'are flying'], correctIndex: 0, thenReturnToExerciseId: 'future_pc_contrast_001' },
      { id: 'guided_future_pc_004', prompt: tri('The phone is ringing. I will answer it: arrangement or decision now?'), options: ['arrangement', 'decision now'], correctIndex: 1, thenReturnToExerciseId: 'future_pc_mixed_002' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'future_present_continuous_arrangements',
    diagnosisLabel: tri('Future arrangements', 'Future arrangements'),
    contrastSet: SMART_CONTRAST,
    difficultyLevel: 2,
    focusWords: ['am meeting tomorrow', 'are having tonight', 'is flying on Monday', 'are you working tomorrow', 'will answer', 'going to'],
    focusPatterns: [
      'future_arrangement_meeting',
      'future_arrangement_tonight',
      'now_vs_tomorrow_pair',
      'she_is_flying',
      'they_are_coming',
      'i_am_leaving',
      'question_are_you_working',
      'negative_not_going_out',
      'question_pair',
      'arrangement_vs_will',
      'spontaneous_will',
      'going_to_intention',
      'mixed_now_future_pair',
      'mixed_arrangement_will_intention',
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
      microDiagnosisId: 'future_present_continuous_arrangements',
      contrastSet: ['present continuous future', 'arrangement', 'will', 'going to'],
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logTimeMarker: true,
      logFutureMeaningType: true,
      logBeForm: true,
      logVerbIngForm: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=future_present_continuous_arrangements',
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


