import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = [
  'to + destination',
  'into + inside movement',
  'onto + surface movement',
  'from + origin',
  'out of + leaving inside',
  'movement vs location',
  'go to',
  'come from',
  'get into/out of',
];

const SMART_CONTRAST = [
  'to + destination',
  'into + inside movement',
  'onto + surface movement',
  'from + origin',
  'out of + leaving inside',
  'movement vs location',
];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri('First find the movement: to a goal, inside, onto a surface, from a source, or out from inside.'),
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
    explanationBlock: tri('Direction prepositions show movement: to = goal, into = inside, onto = surface, from = origin, out of = leaving an inside place.'),
    microTask: tri('Choose the preposition by the direction of movement, not by direct translation.'),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? tri(`Use ${input.correctAnswer}; this movement points to ${input.correctAnswer}.`)])),
    retryFeedback: retry(...input.retryFeedback),
    fallbackExplanation: tri('Use to for a destination, into for movement inside, onto for movement onto a surface, from for origin, and out of for movement from inside to outside.'),
    focusWords: input.focusWords,
  };
}

export const PREPOSITION_DIRECTION_TRAINING: DiagnosisTraining = {
  id: 'preposition_direction',
  category: 'preposition',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 55,
  supportedLocales: ['ru', 'uk'],
  title: tri('To / Into / Onto / From / Out of: направление движения', 'To / Into / Onto / From / Out of: напрямок руху'),
  shortTitle: tri('Direction Prepositions', 'Direction Prepositions'),
  shortDiagnosis: tri('You are mixing direction prepositions: to, into, onto, from, and out of.'),
  diagnosisText: tri('Ты путаешь предлоги направления: to, into, onto, from, out of. Они показывают движение: куда, внутрь чего, на поверхность чего, откуда или изнутри наружу.', 'Ти плутаєш прийменники напрямку: to, into, onto, from, out of. Вони показують рух: куди, всередину чого, на поверхню чого, звідки або зсередини назовні.'),
  mentalModel: tri('To = к месту. Into = внутрь. Onto = на поверхность. From = откуда. Out of = изнутри наружу.', 'To = до місця. Into = всередину. Onto = на поверхню. From = звідки. Out of = зсередини назовні.'),
  contrastSet: CONTRAST,
  coreRule: tri('If there is movement to a destination, use to. If the movement goes inside, use into. If it goes onto a surface, use onto. If it shows origin, use from. If it leaves an inside place, use out of.'),
  whatUserMustLearn: {
    ru: [
      'To показывает направление к месту или цели: go to work, drive to Dublin.',
      'Into показывает движение внутрь пространства: go into the room, get into the car.',
      'Onto показывает движение на поверхность: jump onto the table, put the bag onto the chair.',
      'From показывает источник или точку начала: from Dublin, from work.',
      'Out of показывает движение изнутри наружу: get out of the car, come out of the room.',
      'In/on/at часто показывают где находится объект, а to/into/onto/from/out of показывают движение.',
      'Не говори go to home. Home обычно без to: go home.',
      'Не говори arrive to Dublin. В базовой форме: arrive in Dublin или arrive at the station.',
      'Не говори get out from the car. Лучше get out of the car.',
      'Не говори go in the room, если хочешь подчеркнуть движение внутрь. Лучше go into the room.',
    ],
    uk: [
      'To показує напрямок до місця або цілі: go to work, drive to Dublin.',
      'Into показує рух всередину простору: go into the room, get into the car.',
      'Onto показує рух на поверхню: jump onto the table, put the bag onto the chair.',
      'From показує джерело або точку початку: from Dublin, from work.',
      'Out of показує рух зсередини назовні: get out of the car, come out of the room.',
      'In/on/at часто показують де знаходиться об’єкт, а to/into/onto/from/out of показують рух.',
      'Не говори go to home. Home зазвичай без to: go home.',
      'Не говори arrive to Dublin. У базовій формі: arrive in Dublin або arrive at the station.',
      'Не говори get out from the car. Краще get out of the car.',
      'Не говори go in the room, якщо хочеш підкреслити рух всередину. Краще go into the room.',
    ],
    es: [
      'To = destination.',
      'Into = movement inside.',
      'Onto = movement onto a surface.',
      'From = origin.',
      'Out of = leaving an inside place.',
      'In/on/at often show location.',
      'Use go home, not go to home.',
      'Use arrive in/at, not arrive to.',
      'Use out of the car.',
      'Use go into the room.',
    ],
  },
  examples: [
    { en: 'I am going to work.', ru: 'Я иду на работу.', uk: 'Я йду на роботу.', es: 'I am going to work.', why: tri('Work is the destination, so use to work.') },
    { en: 'She went into the room.', ru: 'Она вошла в комнату.', uk: 'Вона зайшла в кімнату.', es: 'She went into the room.', why: tri('The movement goes inside the room, so use into.') },
    { en: 'Put the phone onto the table.', ru: 'Положи телефон на стол.', uk: 'Поклади телефон на стіл.', es: 'Put the phone onto the table.', why: tri('The phone moves onto the table surface.') },
    { en: 'He came from Dublin.', ru: 'Он приехал из Дублина.', uk: 'Він приїхав із Дубліна.', es: 'He came from Dublin.', why: tri('From shows the origin.') },
    { en: 'Get out of the car.', ru: 'Выйди из машины.', uk: 'Вийди з машини.', es: 'Get out of the car.', why: tri('Out of shows movement from inside the car to outside.') },
    { en: 'He got into the car.', ru: 'Он сел в машину.', uk: 'Він сів у машину.', es: 'He got into the car.', why: tri('Into shows movement inside the car.') },
    { en: 'The cat jumped onto the sofa.', ru: 'Кот запрыгнул на диван.', uk: 'Кіт застрибнув на диван.', es: 'The cat jumped onto the sofa.', why: tri('Onto shows movement onto the sofa surface.') },
    { en: 'I came home late.', ru: 'Я пришёл домой поздно.', uk: 'Я прийшов додому пізно.', es: 'I came home late.', why: tri('Home is often used without to after go/come.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты выбираешь предлог как будто речь только о месте. Но здесь главное движение: к месту, внутрь, на поверхность, откуда или наружу.', 'Схоже, ти обираєш прийменник так, ніби йдеться тільки про місце. Але тут головне рух: до місця, всередину, на поверхню, звідки або назовні.') },
    { id: 'intro_rule', type: 'rule', text: tri('To = к цели. Into = внутрь. Onto = на поверхность. From = откуда. Out of = изнутри наружу.', 'To = до цілі. Into = всередину. Onto = на поверхню. From = звідки. Out of = зсередини назовні.') },
    { id: 'intro_warning', type: 'warning', text: tri('Главные ошибки: go to home, arrive to Dublin, get out from the car, go in the room. Правильно: go home, arrive in Dublin, get out of the car, go into the room.', 'Головні помилки: go to home, arrive to Dublin, get out from the car, go in the room. Правильно: go home, arrive in Dublin, get out of the car, go into the room.') },
  ],
  steps: [
    step({ id: 'prep_dir_easy_001', order: 1, difficulty: 'easy', targetSkill: 'to_destination_work', sentence: 'I am going ___ work.', translation: tri('Я иду на работу.', 'Я йду на роботу.'), options: ['to', 'in', 'from', 'out of'], correctAnswer: 'to', correctFeedback: tri('Yes. Work is the destination: go to work.'), wrong: { in: tri('In shows location inside, but this is movement to a destination: go to work.'), from: tri('From shows origin, but here the question is where to: to work.'), 'out of': tri('Out of means from inside to outside. Here the destination is work: to work.') }, retryFeedback: [tri('К цели = to.', 'До цілі = to.'), tri('Go to work.'), tri('Hint: I am going to work.')], focusWords: ['to work'] }),
    step({ id: 'prep_dir_easy_002', order: 2, difficulty: 'easy', targetSkill: 'to_destination_dublin', sentence: 'We drove ___ Dublin.', translation: tri('Мы поехали в Дублин.', 'Ми поїхали до Дубліна.'), options: ['to', 'in', 'from', 'out of'], correctAnswer: 'to', correctFeedback: tri('Yes. Dublin is the destination: drive to Dublin.'), wrong: { in: tri('In Dublin means location in the city. Movement toward Dublin needs to Dublin.'), from: tri('From Dublin means from Dublin. Here the direction is to Dublin.'), 'out of': tri('Out of Dublin means leaving Dublin. Here the movement is to Dublin.') }, retryFeedback: [tri('В Дублин как направление = to Dublin.', 'До Дубліна як напрямок = to Dublin.'), tri('Drove to Dublin.'), tri('Hint: We drove to Dublin.')], focusWords: ['to Dublin'] }),
    step({ id: 'prep_dir_easy_003', order: 3, difficulty: 'easy', targetSkill: 'home_no_to', sentence: 'I came ___ late.', translation: tri('Я пришёл домой поздно.', 'Я прийшов додому пізно.'), options: ['home', 'to home', 'in home', 'at home'], correctAnswer: 'home', correctFeedback: tri('Yes. After come/go, home is often used without to: came home.'), wrong: { 'to home': tri('Go/come home is usually without to. Use came home, not came to home.'), 'in home': tri('In home does not fit "came home". Use came home.'), 'at home': tri('At home is location. Came home is direction: home, without to.') }, retryFeedback: [tri('Come home без to.', 'Come home без to.'), tri('I came home late.'), tri('Hint: I came home late.')], focusWords: ['came home'] }),
    step({ id: 'prep_dir_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'into_room', sentence: 'She went ___ the room.', translation: tri('Она вошла в комнату.', 'Вона зайшла в кімнату.'), options: ['into', 'in', 'to', 'from'], correctAnswer: 'into', correctFeedback: tri('Yes. The movement goes inside the room: into the room.'), wrong: { in: tri('In often shows location. For movement inside, use into the room.'), to: tri('To shows direction to a place, but into makes the movement inside clear: into the room.'), from: tri('From shows origin. Here she moves inside: into the room.') }, retryFeedback: [tri('Внутрь комнаты = into the room.', 'Всередину кімнати = into the room.'), tri('Went into the room.'), tri('Hint: She went into the room.')], focusWords: ['into the room'] }),
    step({ id: 'prep_dir_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'into_car', sentence: 'He got ___ the car.', translation: tri('Он сел в машину.', 'Він сів у машину.'), options: ['into', 'in', 'onto', 'from'], correctAnswer: 'into', correctFeedback: tri('Yes. Get into the car means movement inside the car.'), wrong: { in: tri('In the car is location. Get into the car shows movement inside.'), onto: tri('Onto means onto a surface. Inside the car = into the car.'), from: tri('From the car means from/by the car. Here he moves inside: into.') }, retryFeedback: [tri('Внутрь машины = into the car.', 'Всередину машини = into the car.'), tri('He got into the car.'), tri('Hint: He got into the car.')], focusWords: ['into the car'] }),
    step({ id: 'prep_dir_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'into_bag', sentence: 'Put the keys ___ your bag.', translation: tri('Положи ключи в сумку.', 'Поклади ключі в сумку.'), options: ['into', 'onto', 'from', 'at'], correctAnswer: 'into', correctFeedback: tri('Yes. The keys move inside the bag: into your bag.'), wrong: { onto: tri('Onto means onto a surface. Inside the bag = into your bag.'), from: tri('From shows origin. Here the keys move inside: into.'), at: tri('At shows a point/location, not movement inside. Use into.') }, retryFeedback: [tri('Внутрь сумки = into.', 'Всередину сумки = into.'), tri('Put the keys into your bag.'), tri('Hint: Put the keys into your bag.')], focusWords: ['into your bag'] }),
    step({ id: 'prep_dir_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'onto_table', sentence: 'Put the phone ___ the table.', translation: tri('Положи телефон на стол.', 'Поклади телефон на стіл.'), options: ['onto', 'into', 'from', 'out of'], correctAnswer: 'onto', correctFeedback: tri('Yes. The phone moves onto the surface of the table: onto the table.'), wrong: { into: tri('Into means inside. The phone moves onto the table surface, so use onto.'), from: tri('From shows origin. Here the movement is onto a surface: onto the table.'), 'out of': tri('Out of means from inside to outside. Here the movement is onto a surface: onto.') }, retryFeedback: [tri('На поверхность = onto.', 'На поверхню = onto.'), tri('Put the phone onto the table.'), tri('Hint: Put the phone onto the table.')], focusWords: ['onto the table'] }),
    step({ id: 'prep_dir_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'jump_onto_sofa', sentence: 'The cat jumped ___ the sofa.', translation: tri('Кот запрыгнул на диван.', 'Кіт застрибнув на диван.'), options: ['onto', 'into', 'from', 'out of'], correctAnswer: 'onto', correctFeedback: tri('Yes. The movement lands on the sofa surface: onto the sofa.'), wrong: { into: tri('Into means inside. A sofa is a surface here, so use onto the sofa.'), from: tri('From the sofa means away from the sofa. Here the movement is onto the sofa.'), 'out of': tri('Out of means from inside to outside. Here the movement is onto a surface.') }, retryFeedback: [tri('Запрыгнул на поверхность = jumped onto.', 'Застрибнув на поверхню = jumped onto.'), tri('The cat jumped onto the sofa.'), tri('Hint: The cat jumped onto the sofa.')], focusWords: ['onto the sofa'] }),
    step({ id: 'prep_dir_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'onto_chair', sentence: 'She put her bag ___ the chair.', translation: tri('Она положила сумку на стул.', 'Вона поклала сумку на стілець.'), options: ['onto', 'into', 'from', 'out of'], correctAnswer: 'onto', correctFeedback: tri('Yes. The bag moves onto the chair surface: onto the chair.'), wrong: { into: tri('Into means inside. On a chair surface = onto the chair.'), from: tri('From shows where something starts, not where it goes. Use onto.'), 'out of': tri('Out of means from inside to outside. Here the movement is onto a surface.') }, retryFeedback: [tri('Положить на поверхность = put onto.', 'Покласти на поверхню = put onto.'), tri('She put her bag onto the chair.'), tri('Hint: She put her bag onto the chair.')], focusWords: ['onto the chair'] }),
    step({ id: 'prep_dir_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'from_origin_dublin', sentence: 'He came ___ Dublin.', translation: tri('Он приехал из Дублина.', 'Він приїхав із Дубліна.'), options: ['from', 'to', 'into', 'onto'], correctAnswer: 'from', correctFeedback: tri('Yes. From shows where he came from: from Dublin.'), wrong: { to: tri('To Dublin means toward Dublin. Here it means from Dublin.'), into: tri('Into shows movement inside. Here Dublin is the origin: from Dublin.'), onto: tri('Onto shows movement onto a surface. Here the origin is from Dublin.') }, retryFeedback: [tri('Из/откуда = from.', 'Із/звідки = from.'), tri('From Dublin.'), tri('Hint: He came from Dublin.')], focusWords: ['from Dublin'] }),
    step({ id: 'prep_dir_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'out_of_car', sentence: 'Get ___ the car.', translation: tri('Выйди из машины.', 'Вийди з машини.'), options: ['out of', 'from', 'to', 'into'], correctAnswer: 'out of', correctFeedback: tri('Yes. Out of shows movement from inside the car to outside: out of the car.'), wrong: { from: tri('From shows origin, but for leaving the inside of a car use out of the car.'), to: tri('To the car means toward the car. Here the movement is out of the car.'), into: tri('Into the car means inside the car. Here it is the opposite: out of the car.') }, retryFeedback: [tri('Изнутри наружу = out of.', 'Зсередини назовні = out of.'), tri('Get out of the car.'), tri('Hint: Get out of the car.')], focusWords: ['out of the car'] }),
    step({ id: 'prep_dir_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'out_of_room', sentence: 'She came ___ the room.', translation: tri('Она вышла из комнаты.', 'Вона вийшла з кімнати.'), options: ['out of', 'into', 'to', 'onto'], correctAnswer: 'out of', correctFeedback: tri('Yes. The room is an inside space, and she moves outside: out of the room.'), wrong: { into: tri('Into the room means into the room. Here she comes out of the room.'), to: tri('To the room means toward the room. Here the movement is out of the room.'), onto: tri('Onto means onto a surface. Here the movement is out of an inside space.') }, retryFeedback: [tri('Из комнаты наружу = out of the room.', 'З кімнати назовні = out of the room.'), tri('She came out of the room.'), tri('Hint: She came out of the room.')], focusWords: ['out of the room'] }),
    step({ id: 'prep_dir_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_to_from', sentence: 'Choose the correct pair.', translation: tri('в Дублин / из Дублина', 'до Дубліна / з Дубліна'), options: ['to Dublin / from Dublin', 'from Dublin / to Dublin', 'into Dublin / out of Dublin', 'at Dublin / in Dublin'], correctAnswer: 'to Dublin / from Dublin', correctFeedback: tri('Yes. To Dublin = direction to Dublin. From Dublin = origin.'), wrong: { 'from Dublin / to Dublin': tri('The pair is reversed: to = where to, from = where from.'), 'into Dublin / out of Dublin': tri('Into/out of can work in some contexts, but the basic city pair is to Dublin / from Dublin.'), 'at Dublin / in Dublin': tri('At/in show location, but this pair needs direction and origin: to Dublin / from Dublin.') }, retryFeedback: [tri('Куда = to. Откуда = from.', 'Куди = to. Звідки = from.'), tri('To Dublin / from Dublin.'), tri('Hint: to Dublin / from Dublin.')], focusWords: ['to Dublin', 'from Dublin'] }),
    step({ id: 'prep_dir_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_into_out_of', sentence: 'Choose the correct pair.', translation: tri('в машину / из машины', 'у машину / з машини'), options: ['into the car / out of the car', 'in the car / from the car', 'to the car / into the car', 'onto the car / off the car'], correctAnswer: 'into the car / out of the car', correctFeedback: tri('Yes. Into = inside the car. Out of = from inside the car to outside.'), wrong: { 'in the car / from the car': tri('In shows location. For movement, use into the car / out of the car.'), 'to the car / into the car': tri('To the car means toward the car, not inside. From inside to outside is out of the car.'), 'onto the car / off the car': tri('Onto/off the car means surface movement, not inside and outside.') }, retryFeedback: [tri('Внутрь = into. Изнутри наружу = out of.', 'Всередину = into. Зсередини назовні = out of.'), tri('Into the car / out of the car.'), tri('Hint: into the car / out of the car.')], focusWords: ['into the car', 'out of the car'] }),
    step({ id: 'prep_dir_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Он вышел из машины, вошёл в комнату и положил телефон на стол.', 'Він вийшов з машини, зайшов у кімнату і поклав телефон на стіл.'), options: ['He got out of the car, went into the room, and put the phone onto the table.', 'He got from the car, went in the room, and put the phone into the table.', 'He got to the car, went to the room, and put the phone from the table.', 'He got out from the car, went on the room, and put the phone at the table.'], correctAnswer: 'He got out of the car, went into the room, and put the phone onto the table.', correctFeedback: tri('Yes. Out of = leaving inside, into = moving inside, onto = moving onto a surface.'), wrong: { 'He got from the car, went in the room, and put the phone into the table.': tri('Use out of the car, into the room, onto the table. From/in/into the table change the movement.'), 'He got to the car, went to the room, and put the phone from the table.': tri('To the car and from the table say different directions. Use out of the car, into the room, onto the table.'), 'He got out from the car, went on the room, and put the phone at the table.': tri('Basic correction: out of the car, into the room, onto the table.') }, retryFeedback: [tri('Out of the car / into the room / onto the table.'), tri('He got out of the car, went into the room, and put the phone onto the table.'), tri('Hint: He got out of the car, went into the room, and put the phone onto the table.')], focusWords: ['out of the car', 'into the room', 'onto the table'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['to_into_confusion', 'into_in_confusion', 'onto_on_confusion', 'from_out_of_confusion', 'to_home_error', 'arrive_to_error', 'out_from_error', 'direction_location_confusion', 'wrong_origin_destination_error'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Show the movement and distinguish destination, inside movement, surface movement, origin, or leaving from inside.'),
    depth2: tri('Ask: where to, inside what, onto what, from where, or out of what?'),
    depth3: tri('Show simple pairs: go to work / go into the room / get out of the car.'),
    depth4: tri('Almost a hint: directly name the needed direction preposition.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Stop. Direction prepositions show movement. To = destination. Into = inside. Onto = surface. From = origin. Out of = from inside to outside.') },
    afterThreeWrongInSameExercise: { action: 'show_direction_hint_then_retry', card: tri('Hint: the system shows the type of movement but does not choose the preposition for the user.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Guided mode: first choose whether the movement goes to a place, inside, onto a surface, from a place, or out from inside.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_prep_dir_001', prompt: tri('Go to work показывает движение к цели или изнутри наружу?', 'Go to work показує рух до цілі чи зсередини назовні?'), options: ['к цели', 'изнутри наружу'], correctIndex: 0, thenReturnToExerciseId: 'prep_dir_easy_001' },
      { id: 'guided_prep_dir_002', prompt: tri('Into the room означает внутрь комнаты или из комнаты?', 'Into the room означає всередину кімнати чи з кімнати?'), options: ['внутрь комнаты', 'из комнаты'], correctIndex: 0, thenReturnToExerciseId: 'prep_dir_contrast_001' },
      { id: 'guided_prep_dir_003', prompt: tri('Onto the table означает внутрь стола или на поверхность стола?', 'Onto the table означає всередину столу чи на поверхню столу?'), options: ['внутрь стола', 'на поверхность стола'], correctIndex: 1, thenReturnToExerciseId: 'prep_dir_contrast_004' },
      { id: 'guided_prep_dir_004', prompt: tri('Out of the car означает в машину или из машины наружу?', 'Out of the car означає в машину чи з машини назовні?'), options: ['в машину', 'из машины наружу'], correctIndex: 1, thenReturnToExerciseId: 'prep_dir_mixed_002' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'preposition',
    microDiagnosisId: 'preposition_direction',
    diagnosisLabel: tri('Direction Prepositions', 'Direction Prepositions'),
    contrastSet: SMART_CONTRAST,
    focusWords: ['to work', 'into the room', 'onto the table', 'from Dublin', 'out of the car'],
    focusPatterns: ['to_destination_work', 'to_destination_dublin', 'home_no_to', 'into_room', 'into_car', 'into_bag', 'onto_table', 'jump_onto_sofa', 'onto_chair', 'from_origin_dublin', 'out_of_car', 'out_of_room', 'mixed_to_from', 'mixed_into_out_of', 'mixed_sentence_correction'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_preposition_direction_start',
    answer: 'diagnosis_training_preposition_direction_answer',
    mastery: 'diagnosis_training_preposition_direction_mastery',
    fallback: 'diagnosis_training_preposition_direction_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'preposition', microDiagnosisId: 'preposition_direction', contrastSet: ['to', 'into', 'onto', 'from', 'out of', 'direction'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logDirectionType: true, logPreposition: true, logMovementVsLocation: true, logOriginDestination: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=preposition&microDiagnosisId=preposition_direction',
    problemCoachRoute: '/problem_coach?category=preposition&microDiagnosisId=preposition_direction',
    smartTrainerRoute: '/trainer_smart_session?mode=weak&source=diagnosis_training&category=preposition&microDiagnosisId=preposition_direction',
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
