import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = [
  'in + enclosed place',
  'on + surface',
  'at + point/location',
  'in + month/year/period',
  'on + day/date',
  'at + exact time',
  'time vs place scale',
  'fixed expressions',
];

const SMART_CONTRAST = [
  'in + enclosed place',
  'on + surface',
  'at + point/location',
  'in + period',
  'on + day/date',
  'at + exact time',
  'fixed expressions',
];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri('First decide: time or place. Then choose the scale: space/surface/point or period/day/exact time.'),
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
    explanationBlock: tri('For place: in = inside/area, on = surface/line, at = point/location. For time: in = period, on = day/date, at = exact time.'),
    microTask: tri('Choose in, on, at, or to by scale, not by direct translation.'),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? tri(`Use ${input.correctAnswer}; the scale of this phrase points to ${input.correctAnswer}.`)])),
    retryFeedback: retry(...input.retryFeedback),
    fallbackExplanation: tri('Place: in the room, on the table, at the door. Time: in July, on Monday, at 8. Some blocks are fixed: at work, on the bus, in the car.'),
    focusWords: input.focusWords,
  };
}

export const PREPOSITION_TIME_PLACE_TRAINING: DiagnosisTraining = {
  id: 'preposition_time_place',
  category: 'preposition',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 54,
  supportedLocales: ['ru', 'uk'],
  title: tri('In / On / At: время и место в одном блоке', 'In / On / At: час і місце в одному блоці'),
  shortTitle: tri('In / On / At', 'In / On / At'),
  shortDiagnosis: tri('You are mixing in, on, and at for both time and place, especially scale: space, surface, point, period, day, exact time.'),
  diagnosisText: tri('You are mixing in, on, and at when speaking about time and place. The issue is that English chooses by scale: big space, surface, point; long period, day/date, exact time.'),
  mentalModel: tri('Place: in = inside/area, on = surface/line, at = point/location. Time: in = month/year/period, on = day/date, at = exact time.'),
  contrastSet: CONTRAST,
  coreRule: tri("Place: in the room, in Dublin, in the car; on the table, on the bus; at the door, at work. Time: in July, in 2025; on Monday, on May 5th; at 8 o'clock, at night, at the weekend."),
  whatUserMustLearn: {
    ru: [
      'In often means inside or within a space: in the room, in the city, in the car.',
      'On often means surface, line, or public transport platform: on the table, on the wall, on the bus.',
      'At often means point, exact location, or function of a place: at the door, at the station, at work.',
      'In is used with long time periods: in the morning, in July, in 2025, in winter.',
      'On is used with days and dates: on Monday, on Friday morning, on May 5th.',
      'At is used with exact time and fixed expressions: at 8, at night, at the weekend.',
      'Use in the room, not on the room.',
      'Use on Monday, not in Monday.',
      "Use at 8 o'clock, not on 8 o'clock.",
      'Learn common blocks: at home, at work, at school, on the bus, in bed.',
    ],
    uk: [
      'In often means inside or within a space: in the room, in the city, in the car.',
      'On often means surface, line, or public transport platform: on the table, on the wall, on the bus.',
      'At often means point, exact location, or function of a place: at the door, at the station, at work.',
      'In is used with long time periods: in the morning, in July, in 2025, in winter.',
      'On is used with days and dates: on Monday, on Friday morning, on May 5th.',
      'At is used with exact time and fixed expressions: at 8, at night, at the weekend.',
      'Use in the room, not on the room.',
      'Use on Monday, not in Monday.',
      "Use at 8 o'clock, not on 8 o'clock.",
      'Learn common blocks: at home, at work, at school, on the bus, in bed.',
    ],
    es: [
      'In = inside or area.',
      'On = surface or line.',
      'At = point or location.',
      'In = long time period.',
      'On = day or date.',
      'At = exact time.',
      'Use in the room.',
      'Use on Monday.',
      'Use at 8.',
      'Learn fixed blocks.',
    ],
  },
  examples: [
    { en: 'I am in the room.', ru: 'Я в комнате.', uk: 'Я в кімнаті.', es: 'I am in the room.', why: tri('Room is an enclosed space, so we use in the room.') },
    { en: 'The keys are on the table.', ru: 'Ключи на столе.', uk: 'Ключі на столі.', es: 'The keys are on the table.', why: tri('Table is a surface, so we use on the table.') },
    { en: 'I am at the door.', ru: 'Я у двери.', uk: 'Я біля дверей.', es: 'I am at the door.', why: tri('Door is treated as a point/location, so we use at the door.') },
    { en: 'She lives in Dublin.', ru: 'Она живёт в Дублине.', uk: 'Вона живе в Дубліні.', es: 'She lives in Dublin.', why: tri('A city is an area/space, so we use in Dublin.') },
    { en: 'I work on Monday.', ru: 'Я работаю в понедельник.', uk: 'Я працюю в понеділок.', es: 'I work on Monday.', why: tri('Monday is a day, so we use on Monday.') },
    { en: 'The meeting starts at 8.', ru: 'Встреча начинается в 8.', uk: 'Зустріч починається о 8.', es: 'The meeting starts at 8.', why: tri('8 is an exact time, so we use at 8.') },
    { en: 'I was born in 1990.', ru: 'Я родился в 1990 году.', uk: 'Я народився у 1990 році.', es: 'I was born in 1990.', why: tri('A year is a long period, so we use in 1990.') },
    { en: 'I usually study in the evening.', ru: 'Я обычно учусь вечером.', uk: 'Я зазвичай навчаюся ввечері.', es: 'I usually study in the evening.', why: tri('Evening as a part of the day usually takes in: in the evening.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('You may be choosing in/on/at by translating “в/на/у”. English instead checks scale: space, surface, point; period, day, exact time.') },
    { id: 'intro_rule', type: 'rule', text: tri('Place: in = inside, on = surface, at = point. Time: in = period, on = day/date, at = exact time.') },
    { id: 'intro_warning', type: 'warning', text: tri("Main mistakes: in Monday, on 8 o'clock, on the room, in the door. Correct: on Monday, at 8 o'clock, in the room, at the door.") },
  ],
  steps: [
    step({ id: 'prep_tp_easy_001', order: 1, difficulty: 'easy', targetSkill: 'place_in_room', sentence: 'I am ___ the room.', translation: tri('Я в комнате.', 'Я в кімнаті.'), options: ['in', 'on', 'at', 'to'], correctAnswer: 'in', correctFeedback: tri('Yes. Room is a space you can be inside: in the room.'), wrong: { on: tri('On means surface. A room is an enclosed space, so use in the room.'), at: tri('At marks a point/location. If you are inside the room, use in.'), to: tri('To shows direction. This is location, so use in.') }, retryFeedback: [tri('Inside a room = in.'), tri('In the room.'), tri('Hint: I am in the room.')], focusWords: ['in the room'] }),
    step({ id: 'prep_tp_easy_002', order: 2, difficulty: 'easy', targetSkill: 'place_on_table', sentence: 'The keys are ___ the table.', translation: tri('Ключи на столе.', 'Ключі на столі.'), options: ['on', 'in', 'at', 'to'], correctAnswer: 'on', correctFeedback: tri('Yes. Table is a surface: on the table.'), wrong: { in: tri('In would mean inside the table/drawer. On the surface of the table = on.'), at: tri('At marks a point/location. For the surface of a table, use on.'), to: tri('To shows movement. The keys are located on the table.') }, retryFeedback: [tri('Surface = on.'), tri('On the table.'), tri('Hint: The keys are on the table.')], focusWords: ['on the table'] }),
    step({ id: 'prep_tp_easy_003', order: 3, difficulty: 'easy', targetSkill: 'place_at_door', sentence: 'I am ___ the door.', translation: tri('Я у двери.', 'Я біля дверей.'), options: ['at', 'in', 'on', 'to'], correctAnswer: 'at', correctFeedback: tri('Yes. Door is treated as a point/location: at the door.'), wrong: { in: tri('In the door sounds like inside the door. At the door means by the door.'), on: tri('On the door means on the surface of the door. By the door = at the door.'), to: tri('To the door shows movement. This is location: at the door.') }, retryFeedback: [tri('Point/location = at.'), tri('At the door.'), tri('Hint: I am at the door.')], focusWords: ['at the door'] }),
    step({ id: 'prep_tp_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'time_on_monday', sentence: 'I work ___ Monday.', translation: tri('Я работаю в понедельник.', 'Я працюю в понеділок.'), options: ['on', 'in', 'at', 'to'], correctAnswer: 'on', correctFeedback: tri('Yes. Monday is a day, so use on Monday.'), wrong: { in: tri('In is for months/years/periods. A day of the week needs on.'), at: tri('At is for exact time. Monday is a day, so use on.'), to: tri('To is not used for a weekday in this meaning. Use on.') }, retryFeedback: [tri('Day of the week = on.'), tri('On Monday.'), tri('Hint: I work on Monday.')], focusWords: ['on Monday'] }),
    step({ id: 'prep_tp_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'time_at_exact', sentence: 'The meeting starts ___ 8.', translation: tri('Встреча начинается в 8.', 'Зустріч починається о 8.'), options: ['at', 'on', 'in', 'to'], correctAnswer: 'at', correctFeedback: tri('Yes. 8 is an exact time: at 8.'), wrong: { on: tri('On is for days/dates. Exact time needs at.'), in: tri('In is for periods. Exact time needs at.'), to: tri('To is not used for starting at a specific time. Use at.') }, retryFeedback: [tri('Exact time = at.'), tri('At 8.'), tri('Hint: The meeting starts at 8.')], focusWords: ['at 8'] }),
    step({ id: 'prep_tp_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'time_in_year', sentence: 'I was born ___ 1990.', translation: tri('Я родился в 1990 году.', 'Я народився у 1990 році.'), options: ['in', 'on', 'at', 'to'], correctAnswer: 'in', correctFeedback: tri('Yes. A year is a long period: in 1990.'), wrong: { on: tri('On is for days/dates. A year needs in.'), at: tri('At is for exact time. A year needs in.'), to: tri('To does not fit a year of birth. Use in.') }, retryFeedback: [tri('Year = in.'), tri('In 1990.'), tri('Hint: I was born in 1990.')], focusWords: ['in 1990'] }),
    step({ id: 'prep_tp_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'place_in_city', sentence: 'She lives ___ Dublin.', translation: tri('Она живёт в Дублине.', 'Вона живе в Дубліні.'), options: ['in', 'on', 'at', 'to'], correctAnswer: 'in', correctFeedback: tri('Yes. A city is an area/space: in Dublin.'), wrong: { on: tri('On is not used for living in a city. Use in Dublin.'), at: tri('At Dublin can sound like an arrival point in some contexts, but living in a city = in Dublin.'), to: tri('To Dublin is direction. Lives needs in Dublin.') }, retryFeedback: [tri('In a city = in.'), tri('In Dublin.'), tri('Hint: She lives in Dublin.')], focusWords: ['in Dublin'] }),
    step({ id: 'prep_tp_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'time_in_evening', sentence: 'I usually study ___ the evening.', translation: tri('Я обычно учусь вечером.', 'Я зазвичай навчаюся ввечері.'), options: ['in', 'on', 'at', 'to'], correctAnswer: 'in', correctFeedback: tri('Yes. Parts of the day usually use in: in the evening.'), wrong: { on: tri('On is for a specific day/date. Usually: in the evening.'), at: tri('At night is an exception, but evening usually takes in: in the evening.'), to: tri('To is not used for evening in this meaning. Use in.') }, retryFeedback: [tri('Evening = in the evening.'), tri('In the evening.'), tri('Hint: I usually study in the evening.')], focusWords: ['in the evening'] }),
    step({ id: 'prep_tp_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'date_on_may_5', sentence: 'The exam is ___ May 5th.', translation: tri('Экзамен 5 мая.', 'Іспит 5 травня.'), options: ['on', 'in', 'at', 'to'], correctAnswer: 'on', correctFeedback: tri('Yes. May 5th is a date: on May 5th.'), wrong: { in: tri('In May = in the month of May, but on May 5th = on that date.'), at: tri('At is for exact time. A date needs on.'), to: tri('To is not used for an exam date. Use on.') }, retryFeedback: [tri('Date = on.'), tri('On May 5th.'), tri('Hint: The exam is on May 5th.')], focusWords: ['on May 5th'] }),
    step({ id: 'prep_tp_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'fixed_at_work', sentence: 'I am ___ work.', translation: tri('Я на работе.', 'Я на роботі.'), options: ['at', 'in', 'on', 'to'], correctAnswer: 'at', correctFeedback: tri('Yes. At work is a fixed expression.'), wrong: { in: tri('In work does not mean "at work". Use the fixed expression at work.'), on: tri('On work is not used in this meaning. Use at work.'), to: tri('To work means direction. "I am at work" = location.') }, retryFeedback: [tri('At work is the block.'), tri('At work.'), tri('Hint: I am at work.')], focusWords: ['at work'] }),
    step({ id: 'prep_tp_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'fixed_on_bus', sentence: 'She is ___ the bus.', translation: tri('Она в автобусе.', 'Вона в автобусі.'), options: ['on', 'in', 'at', 'to'], correctAnswer: 'on', correctFeedback: tri('Yes. For a bus as public transport, the usual block is on the bus.'), wrong: { in: tri('In the bus is possible physically, but standard "travel/be on a bus" = on the bus.'), at: tri('At the bus sounds like by the bus, not inside the transport. Use on the bus.'), to: tri('To the bus means toward the bus. Here she is on the bus.') }, retryFeedback: [tri('Public transport bus = on the bus.'), tri('On the bus.'), tri('Hint: She is on the bus.')], focusWords: ['on the bus'] }),
    step({ id: 'prep_tp_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'fixed_in_car', sentence: 'He is ___ the car.', translation: tri('Он в машине.', 'Він у машині.'), options: ['in', 'on', 'at', 'to'], correctAnswer: 'in', correctFeedback: tri('Yes. A car is treated as an enclosed space: in the car.'), wrong: { on: tri('On the car means on the surface of the car. Inside the car = in the car.'), at: tri('At the car means by the car. In the car = inside it.'), to: tri('To the car means toward the car. Here he is inside: in.') }, retryFeedback: [tri('Inside a car = in.'), tri('In the car.'), tri('Hint: He is in the car.')], focusWords: ['in the car'] }),
    step({ id: 'prep_tp_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_time_place_pair', sentence: 'Choose the correct pair.', translation: tri('в комнате / в понедельник', 'у кімнаті / у понеділок'), options: ['in the room / on Monday', 'on the room / in Monday', 'at the room / at Monday', 'to the room / to Monday'], correctAnswer: 'in the room / on Monday', correctFeedback: tri('Yes. Room = space -> in. Monday = day -> on.'), wrong: { 'on the room / in Monday': tri('Room is not a surface, and Monday is not a period. Use in the room / on Monday.'), 'at the room / at Monday': tri('At does not fit a room as a space or a weekday. Use in the room / on Monday.'), 'to the room / to Monday': tri('To shows direction, not static place or weekday. Use in the room / on Monday.') }, retryFeedback: [tri('Room = in. Monday = on.'), tri('In the room / on Monday.'), tri('Hint: in the room / on Monday.')], focusWords: ['in the room', 'on Monday'] }),
    step({ id: 'prep_tp_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_surface_exact_time', sentence: 'Choose the correct pair.', translation: tri('на столе / в 8 часов', 'на столі / о 8 годині'), options: ["on the table / at 8 o'clock", "in the table / on 8 o'clock", "at the table / in 8 o'clock", "to the table / to 8 o'clock"], correctAnswer: "on the table / at 8 o'clock", correctFeedback: tri('Yes. Table = surface -> on. Exact time = at.'), wrong: { "in the table / on 8 o'clock": tri('On the surface of the table = on. Exact time = at.'), "at the table / in 8 o'clock": tri('At the table can mean sitting/standing by a table, but "on the table" is on the surface. At 8 is exact time.'), "to the table / to 8 o'clock": tri('To does not fit a surface or exact time. Use on the table / at 8.') }, retryFeedback: [tri('Surface = on. Exact time = at.'), tri("On the table / at 8 o'clock."), tri("Hint: on the table / at 8 o'clock.")], focusWords: ['on the table', "at 8 o'clock"] }),
    step({ id: 'prep_tp_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Я живу в Дублине, работаю по понедельникам и начинаю в 8.', 'Я живу в Дубліні, працюю по понеділках і починаю о 8.'), options: ['I live in Dublin, work on Mondays, and start at 8.', 'I live at Dublin, work in Mondays, and start on 8.', 'I live on Dublin, work at Mondays, and start in 8.', 'I live to Dublin, work to Mondays, and start to 8.'], correctAnswer: 'I live in Dublin, work on Mondays, and start at 8.', correctFeedback: tri('Yes. City = in, day = on, exact time = at.'), wrong: { 'I live at Dublin, work in Mondays, and start on 8.': tri('Use in Dublin, on Mondays, at 8.'), 'I live on Dublin, work at Mondays, and start in 8.': tri('The prepositions are mixed: city = in, day = on, exact time = at.'), 'I live to Dublin, work to Mondays, and start to 8.': tri('To shows direction, but this sentence needs static place, day, and exact time: in Dublin, on Mondays, at 8.') }, retryFeedback: [tri('In Dublin / on Mondays / at 8.'), tri('I live in Dublin, work on Mondays, and start at 8.'), tri('Hint: I live in Dublin, work on Mondays, and start at 8.')], focusWords: ['in Dublin', 'on Mondays', 'at 8'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['in_on_at_time_place_confusion', 'in_with_day_error', 'on_with_exact_time_error', 'at_with_month_year_error', 'on_with_enclosed_place_error', 'in_with_surface_error', 'at_in_city_error', 'fixed_expression_error', 'time_place_scale_error'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Show whether the phrase is time or place, then show the scale.'),
    depth2: tri('Ask: inside, surface, or point; month/day/exact time?'),
    depth3: tri('Show simple pairs: in the room / on the table / at 8.'),
    depth4: tri('Almost a hint: directly name the needed preposition.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Stop. First decide: time or place. Place: in = inside/space, on = surface, at = point. Time: in = period, on = day/date, at = exact time.') },
    afterThreeWrongInSameExercise: { action: 'show_scale_hint_then_retry', card: tri('Hint: the system will show the scale - space, surface, point, period, day, or exact time - but will not choose the preposition for the user.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Guided mode: first choose time or place. Then choose the scale. After that, return to the full phrase.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_prep_tp_001', prompt: tri('Room - is it inside space or a surface?'), options: ['пространство внутри', 'поверхность'], correctIndex: 0, thenReturnToExerciseId: 'prep_tp_easy_001' },
      { id: 'guided_prep_tp_002', prompt: tri('Monday - is it a day or exact time?'), options: ['день', 'точное время'], correctIndex: 0, thenReturnToExerciseId: 'prep_tp_contrast_001' },
      { id: 'guided_prep_tp_003', prompt: tri("8 o'clock - is it a day or exact time?"), options: ['день', 'точное время'], correctIndex: 1, thenReturnToExerciseId: 'prep_tp_contrast_002' },
      { id: 'guided_prep_tp_004', prompt: tri('Dublin - is it a city-space or a surface?'), options: ['город-пространство', 'поверхность'], correctIndex: 0, thenReturnToExerciseId: 'prep_tp_contrast_004' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'preposition',
    microDiagnosisId: 'preposition_time_place',
    diagnosisLabel: tri('In / On / At: время и место', 'In / On / At: час і місце'),
    contrastSet: SMART_CONTRAST,
    focusWords: ['in the room', 'on the table', 'at the door', 'on Monday', 'at 8', 'in Dublin'],
    focusPatterns: ['place_in_room', 'place_on_table', 'place_at_door', 'time_on_monday', 'time_at_exact', 'time_in_year', 'place_in_city', 'time_in_evening', 'date_on_may_5', 'fixed_at_work', 'fixed_on_bus', 'fixed_in_car', 'mixed_time_place_pair', 'mixed_surface_exact_time', 'mixed_sentence_correction'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_preposition_time_place_start',
    answer: 'diagnosis_training_preposition_time_place_answer',
    mastery: 'diagnosis_training_preposition_time_place_mastery',
    fallback: 'diagnosis_training_preposition_time_place_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'preposition', microDiagnosisId: 'preposition_time_place', contrastSet: ['in', 'on', 'at', 'time', 'place'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logTimeOrPlace: true, logScaleType: true, logPreposition: true, logFixedExpression: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=preposition&microDiagnosisId=preposition_time_place',
    problemCoachRoute: '/problem_coach?category=preposition&microDiagnosisId=preposition_time_place',
    fallbackIfTrainingMissing: '/problem_coach?category=preposition',
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
