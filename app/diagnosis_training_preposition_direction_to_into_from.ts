import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = ['to', 'into', 'from', 'out of', 'towards', 'in', 'direction', 'source'];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'Сначала нарисуй движение: к месту, внутрь, откуда или изнутри наружу.',
      'Спочатку намалюй рух: до місця, всередину, звідки або зсередини назовні.',
    ),
    depth2,
    depth3,
    depth4,
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Не этот предлог направления. Здесь нужен ${correct}.`,
    `Не цей прийменник напрямку. Тут потрібен ${correct}.`,
  );
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
      'To показывает движение к месту или получателю. Into показывает движение внутрь. From показывает источник или точку отправления. Out of показывает движение изнутри наружу.',
      'To показує рух до місця або отримувача. Into показує рух усередину. From показує джерело або точку відправлення. Out of показує рух зсередини назовні.',
    ),
    microTask: tri(
      'Выбери предлог по траектории движения, а не по прямому переводу.',
      'Обери прийменник за траєкторією руху, а не за прямим перекладом.',
    ),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? defaultWrong(input.correctAnswer)])),
    retryFeedback: retry(...input.retryFeedback),
    fallbackExplanation: tri(
      'Карта движения: to = к месту, into = внутрь, from = откуда, out of = изнутри наружу. In обычно значит уже внутри, а towards - в сторону.',
      'Карта руху: to = до місця, into = всередину, from = звідки, out of = зсередини назовні. In зазвичай означає вже всередині, а towards - у бік.',
    ),
    focusWords: input.focusWords,
  };
}

export const PREPOSITION_DIRECTION_TO_INTO_FROM_TRAINING: DiagnosisTraining = {
  id: 'preposition_direction_to_into_from',
  category: 'preposition',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 28,
  supportedLocales: ['ru', 'uk'],
  title: tri('To / Into / From / Out of: направление движения', 'To / Into / From / Out of: напрям руху'),
  shortTitle: tri('Direction Prepositions', 'Direction Prepositions'),
  shortDiagnosis: tri(
    'Ты путаешь to, into, from и out of: к месту, внутрь, откуда или изнутри наружу.',
    'Ти плутаєш to, into, from і out of: до місця, всередину, звідки або зсередини назовні.',
  ),
  diagnosisText: tri(
    'Ты путаешь предлоги направления: to, into, from, out of. Главная проблема в том, что английский различает движение к месту, движение внутрь, движение из точки отправления и движение наружу изнутри.',
    'Ти плутаєш прийменники напрямку: to, into, from, out of. Головна проблема в тому, що англійська розрізняє рух до місця, рух усередину, рух із точки відправлення і рух назовні зсередини.',
  ),
  mentalModel: tri(
    'To = к месту. Into = внутрь. From = из/откуда началось движение. Out of = изнутри наружу. Go to the room = идти к комнате/в комнату как пункт назначения. Go into the room = войти внутрь комнаты.',
    'To = до місця. Into = всередину. From = з/звідки почався рух. Out of = зсередини назовні. Go to the room = іти до кімнати/в кімнату як пункт призначення. Go into the room = увійти всередину кімнати.',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'Go to school. Walk into the room. Come from Ukraine. Take it out of the bag. To показывает пункт назначения, into показывает вход внутрь, from показывает источник, out of показывает выход изнутри.',
    'Go to school. Walk into the room. Come from Ukraine. Take it out of the bag. To показує пункт призначення, into показує вхід усередину, from показує джерело, out of показує вихід зсередини.',
  ),
  whatUserMustLearn: {
    ru: [
      'To показывает направление к месту или пункт назначения: go to work, drive to Dublin, send it to me.',
      'Into показывает движение внутрь: go into the room, put it into the bag.',
      'From показывает точку отправления, источник или происхождение: from home, from Ukraine, from my friend.',
      'Out of показывает движение изнутри наружу: get out of the car, take it out of the box.',
      'In обычно показывает положение внутри, а into - движение внутрь: I am in the room, I went into the room.',
      'To не всегда означает физическое движение, оно также показывает получателя: give it to me, send it to her.',
      'Towards означает направление в сторону, но не обязательно достижение точки: walk towards the door.',
      'From и out of не одно и то же: from может быть общим источником, out of подчеркивает выход изнутри.',
      'Нельзя говорить go in the room, если нужен акцент на вход внутрь. Лучше go into the room.',
      'Нельзя говорить come out Ukraine. Нужно come from Ukraine.',
    ],
    uk: [
      'To показує напрям до місця або пункт призначення: go to work, drive to Dublin, send it to me.',
      'Into показує рух усередину: go into the room, put it into the bag.',
      'From показує точку відправлення, джерело або походження: from home, from Ukraine, from my friend.',
      'Out of показує рух зсередини назовні: get out of the car, take it out of the box.',
      'In зазвичай показує положення всередині, а into - рух усередину: I am in the room, I went into the room.',
      'To не завжди означає фізичний рух, воно також показує отримувача: give it to me, send it to her.',
      'Towards означає напрям у бік, але не обов’язково досягнення точки: walk towards the door.',
      'From і out of не одне й те саме: from може бути загальним джерелом, out of підкреслює вихід зсередини.',
      'Не можна говорити go in the room, якщо потрібен акцент на вхід усередину. Краще go into the room.',
      'Не можна говорити come out Ukraine. Потрібно come from Ukraine.',
    ],
    es: [
      'To shows destination or recipient.',
      'Into shows movement inside.',
      'From shows source or origin.',
      'Out of shows movement from inside to outside.',
      'In usually shows position inside; into shows movement inside.',
      'Towards means in the direction of, not necessarily reaching the place.',
    ],
  },
  examples: [
    { en: 'I go to work every day.', ru: 'Я хожу на работу каждый день.', uk: 'Я ходжу на роботу щодня.', es: 'I go to work every day.', why: tri('Work здесь пункт назначения. Для направления к месту используется to.', 'Work тут пункт призначення. Для напрямку до місця використовується to.') },
    { en: 'She walked into the room.', ru: 'Она вошла в комнату.', uk: 'Вона увійшла в кімнату.', es: 'She walked into the room.', why: tri('Движение идет внутрь комнаты. Для входа внутрь используется into.', 'Рух іде всередину кімнати. Для входу всередину використовується into.') },
    { en: 'He came from work late.', ru: 'Он пришел с работы поздно.', uk: 'Він прийшов з роботи пізно.', es: 'He came from work late.', why: tri('Work здесь точка отправления. Откуда пришел? From work.', 'Work тут точка відправлення. Звідки прийшов? From work.') },
    { en: 'Take the phone out of the bag.', ru: 'Достань телефон из сумки.', uk: 'Дістань телефон із сумки.', es: 'Take the phone out of the bag.', why: tri('Телефон был внутри сумки и движется наружу. Поэтому out of the bag.', 'Телефон був усередині сумки і рухається назовні. Тому out of the bag.') },
    { en: 'I am in the room.', ru: 'Я в комнате.', uk: 'Я в кімнаті.', es: 'I am in the room.', why: tri('In показывает положение внутри, а не движение внутрь.', 'In показує положення всередині, а не рух усередину.') },
    { en: 'I went into the room.', ru: 'Я вошел в комнату.', uk: 'Я увійшов у кімнату.', es: 'I went into the room.', why: tri('Went показывает движение. Into показывает, что движение закончилось внутри комнаты.', 'Went показує рух. Into показує, що рух завершився всередині кімнати.') },
    { en: 'Send it to me.', ru: 'Отправь это мне.', uk: 'Надішли це мені.', es: 'Send it to me.', why: tri('To может показывать получателя, не только физическое направление.', 'To може показувати отримувача, не тільки фізичний напрям.') },
    { en: 'She walked towards the door.', ru: 'Она пошла к двери.', uk: 'Вона пішла до дверей.', es: 'She walked towards the door.', why: tri('Towards показывает движение в сторону двери, но не обязательно вход или достижение.', 'Towards показує рух у бік дверей, але не обов’язково вхід або досягнення.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты переводишь “в”, “из”, “к” слишком прямо. В английском важнее не перевод, а траектория: к месту, внутрь, из точки или изнутри наружу.', 'Схоже, ти перекладаєш “в”, “з”, “до” занадто прямо. В англійській важливіший не переклад, а траєкторія: до місця, всередину, з точки або зсередини назовні.') },
    { id: 'intro_rule', type: 'rule', text: tri('Карта движения: to - к месту, into - внутрь, from - откуда, out of - изнутри наружу.', 'Карта руху: to - до місця, into - всередину, from - звідки, out of - зсередини назовні.') },
    { id: 'intro_warning', type: 'warning', text: tri('Не путай in и into. In - уже внутри. Into - движение внутрь. I am in the room, но I went into the room.', 'Не плутай in і into. In - уже всередині. Into - рух усередину. I am in the room, але I went into the room.') },
  ],
  steps: [
    step({ id: 'prep_dir_easy_001', order: 1, difficulty: 'easy', targetSkill: 'to_destination', sentence: 'I go ___ work every day.', translation: tri('Я хожу на работу каждый день.', 'Я ходжу на роботу щодня.'), options: ['to', 'into', 'from', 'out of'], correctAnswer: 'to', correctFeedback: tri('Да. Work здесь пункт назначения. Движение к месту = to work.', 'Так. Work тут пункт призначення. Рух до місця = to work.'), wrong: { into: tri('Into означает движение внутрь. Work здесь пункт назначения, поэтому to work.', 'Into означає рух усередину. Work тут пункт призначення, тому to work.'), from: tri('From означает откуда. Здесь движение не от работы, а к работе. Нужно to.', 'From означає звідки. Тут рух не з роботи, а до роботи. Потрібно to.'), 'out of': tri('Out of означает изнутри наружу. Здесь нужен пункт назначения: to work.', 'Out of означає зсередини назовні. Тут потрібен пункт призначення: to work.') }, retryFeedback: [tri('Куда? К работе. Куда = to.', 'Куди? До роботи. Куди = to.'), tri('Go to work.'), tri('Подсказка: I go to work every day.', 'Підказка: I go to work every day.')], focusWords: ['go', 'work', 'to'] }),
    step({ id: 'prep_dir_easy_002', order: 2, difficulty: 'easy', targetSkill: 'to_city_destination', sentence: 'We drove ___ Dublin.', translation: tri('Мы поехали в Дублин.', 'Ми поїхали до Дубліна.'), options: ['to', 'into', 'from', 'out of'], correctAnswer: 'to', correctFeedback: tri('Да. Dublin - пункт назначения. Для движения к городу используется to.', 'Так. Dublin - пункт призначення. Для руху до міста використовується to.'), wrong: { into: tri('Into подчеркивает вход внутрь пространства. Для обычного направления в город нужен to Dublin.', 'Into підкреслює вхід усередину простору. Для звичайного напрямку до міста потрібно to Dublin.'), from: tri('From Dublin означало бы “из Дублина”. Здесь поехали в Дублин: to Dublin.', 'From Dublin означало б “з Дубліна”. Тут поїхали до Дубліна: to Dublin.'), 'out of': tri('Out of Dublin означало бы “из Дублина наружу”. Здесь нужно to Dublin.', 'Out of Dublin означало б “з Дубліна назовні”. Тут потрібно to Dublin.') }, retryFeedback: [tri('Куда поехали? В Дублин = to Dublin.', 'Куди поїхали? До Дубліна = to Dublin.'), tri('Drive to Dublin.'), tri('Подсказка: We drove to Dublin.', 'Підказка: We drove to Dublin.')], focusWords: ['drove', 'Dublin', 'to'] }),
    step({ id: 'prep_dir_easy_003', order: 3, difficulty: 'easy', targetSkill: 'to_recipient', sentence: 'Send it ___ me.', translation: tri('Отправь это мне.', 'Надішли це мені.'), options: ['to', 'into', 'from', 'out of'], correctAnswer: 'to', correctFeedback: tri('Да. Me здесь получатель. Получатель после send = to me.', 'Так. Me тут отримувач. Отримувач після send = to me.'), wrong: { into: tri('Into означает внутрь. Me не место-контейнер. Получатель = to me.', 'Into означає всередину. Me не місце-контейнер. Отримувач = to me.'), from: tri('From me означает от меня. Здесь отправь мне, поэтому to me.', 'From me означає від мене. Тут надішли мені, тому to me.'), 'out of': tri('Out of me не подходит. Получатель после send = to me.', 'Out of me не підходить. Отримувач після send = to me.') }, retryFeedback: [tri('Кому? Мне = to me.', 'Кому? Мені = to me.'), tri('Send it to me.'), tri('Подсказка: Send it to me.', 'Підказка: Send it to me.')], focusWords: ['send', 'me', 'to'] }),
    step({ id: 'prep_dir_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'into_room', sentence: 'She walked ___ the room.', translation: tri('Она вошла в комнату.', 'Вона увійшла в кімнату.'), options: ['to', 'into', 'from', 'out of'], correctAnswer: 'into', correctFeedback: tri('Да. Она двигалась внутрь комнаты. Движение внутрь = into.', 'Так. Вона рухалася всередину кімнати. Рух усередину = into.'), wrong: { to: tri('To показывает направление к месту. Но “вошла” подчеркивает вход внутрь, поэтому into.', 'To показує напрям до місця. Але “увійшла” підкреслює вхід усередину, тому into.'), from: tri('From означает из/откуда. Здесь движение внутрь комнаты, поэтому into.', 'From означає з/звідки. Тут рух усередину кімнати, тому into.'), 'out of': tri('Out of означает наружу из комнаты. Здесь наоборот: внутрь комнаты. Нужно into.', 'Out of означає назовні з кімнати. Тут навпаки: всередину кімнати. Потрібно into.') }, retryFeedback: [tri('Вошла = внутрь. Внутрь = into.', 'Увійшла = всередину. Всередину = into.'), tri('Walk into the room.'), tri('Подсказка: She walked into the room.', 'Підказка: She walked into the room.')], focusWords: ['walked', 'room', 'into'] }),
    step({ id: 'prep_dir_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'into_bag', sentence: 'Put the phone ___ the bag.', translation: tri('Положи телефон в сумку.', 'Поклади телефон у сумку.'), options: ['to', 'into', 'from', 'out of'], correctAnswer: 'into', correctFeedback: tri('Да. Телефон движется внутрь сумки. Поэтому into the bag.', 'Так. Телефон рухається всередину сумки. Тому into the bag.'), wrong: { to: tri('To the bag означало бы просто к сумке. Но телефон нужно положить внутрь сумки, поэтому into.', 'To the bag означало б просто до сумки. Але телефон потрібно покласти всередину сумки, тому into.'), from: tri('From the bag означает из сумки. Здесь движение внутрь сумки: into the bag.', 'From the bag означає з сумки. Тут рух усередину сумки: into the bag.'), 'out of': tri('Out of the bag означает из сумки наружу. Здесь наоборот: внутрь. Нужно into.', 'Out of the bag означає з сумки назовні. Тут навпаки: всередину. Потрібно into.') }, retryFeedback: [tri('Положить внутрь = put into.', 'Покласти всередину = put into.'), tri('Put it into the bag.'), tri('Подсказка: Put the phone into the bag.', 'Підказка: Put the phone into the bag.')], focusWords: ['put', 'bag', 'into'] }),
    step({ id: 'prep_dir_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'in_vs_into', sentence: 'I went ___ the room.', translation: tri('Я вошел в комнату.', 'Я увійшов у кімнату.'), options: ['in', 'into', 'from', 'out of'], correctAnswer: 'into', correctFeedback: tri('Да. Went показывает движение. Движение внутрь комнаты = into the room.', 'Так. Went показує рух. Рух усередину кімнати = into the room.'), wrong: { in: tri('In обычно показывает положение внутри: I am in the room. Но went показывает движение внутрь, поэтому into.', 'In зазвичай показує положення всередині: I am in the room. Але went показує рух усередину, тому into.'), from: tri('From the room означает из комнаты. Здесь вошел внутрь комнаты, поэтому into.', 'From the room означає з кімнати. Тут увійшов усередину кімнати, тому into.'), 'out of': tri('Out of the room означает выйти из комнаты. Здесь вошел в комнату, поэтому into.', 'Out of the room означає вийти з кімнати. Тут увійшов у кімнату, тому into.') }, retryFeedback: [tri('Went = движение. Внутрь = into.', 'Went = рух. Всередину = into.'), tri('Went into the room.'), tri('Подсказка: I went into the room.', 'Підказка: I went into the room.')], focusWords: ['went', 'room', 'into'] }),
    step({ id: 'prep_dir_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'from_work', sentence: 'He came ___ work late.', translation: tri('Он пришел с работы поздно.', 'Він прийшов з роботи пізно.'), options: ['to', 'into', 'from', 'out of'], correctAnswer: 'from', correctFeedback: tri('Да. Work - точка отправления. Откуда пришел? From work.', 'Так. Work - точка відправлення. Звідки прийшов? From work.'), wrong: { to: tri('To work означает на работу. Здесь пришел с работы, поэтому from work.', 'To work означає на роботу. Тут прийшов з роботи, тому from work.'), into: tri('Into означает внутрь. Здесь источник движения: from work.', 'Into означає всередину. Тут джерело руху: from work.'), 'out of': tri('Out of подчеркивает выход изнутри. Для общей точки отправления “с работы” нужен from.', 'Out of підкреслює вихід зсередини. Для загальної точки відправлення “з роботи” потрібен from.') }, retryFeedback: [tri('Откуда? С работы = from work.', 'Звідки? З роботи = from work.'), tri('Came from work.'), tri('Подсказка: He came from work late.', 'Підказка: He came from work late.')], focusWords: ['came', 'work', 'from'] }),
    step({ id: 'prep_dir_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'from_country', sentence: 'She is ___ Ukraine.', translation: tri('Она из Украины.', 'Вона з України.'), options: ['to', 'into', 'from', 'out of'], correctAnswer: 'from', correctFeedback: tri('Да. Происхождение или страна, откуда человек, выражается через from.', 'Так. Походження або країна, звідки людина, виражається через from.'), wrong: { to: tri('To Ukraine означает в Украину как направление. Здесь “из Украины”: from Ukraine.', 'To Ukraine означає в Україну як напрям. Тут “з України”: from Ukraine.'), into: tri('Into Ukraine означает движение внутрь страны. Здесь происхождение: from Ukraine.', 'Into Ukraine означає рух усередину країни. Тут походження: from Ukraine.'), 'out of': tri('Out of Ukraine может значить выход/вывоз из страны. Для происхождения человека нужно from Ukraine.', 'Out of Ukraine може означати вихід/вивезення з країни. Для походження людини потрібно from Ukraine.') }, retryFeedback: [tri('Откуда человек? From Ukraine.', 'Звідки людина? From Ukraine.'), tri('She is from Ukraine.'), tri('Подсказка: She is from Ukraine.', 'Підказка: She is from Ukraine.')], focusWords: ['Ukraine', 'from'] }),
    step({ id: 'prep_dir_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'from_person_source', sentence: 'I got a message ___ my friend.', translation: tri('Я получил сообщение от друга.', 'Я отримав повідомлення від друга.'), options: ['to', 'into', 'from', 'out of'], correctAnswer: 'from', correctFeedback: tri('Да. Friend - источник сообщения. От кого? From my friend.', 'Так. Friend - джерело повідомлення. Від кого? From my friend.'), wrong: { to: tri('To my friend означало бы другу как получателю. Здесь сообщение пришло от друга: from.', 'To my friend означало б другу як отримувачу. Тут повідомлення прийшло від друга: from.'), into: tri('Into не подходит к источнику сообщения. Нужно from my friend.', 'Into не підходить до джерела повідомлення. Потрібно from my friend.'), 'out of': tri('Out of my friend не подходит. Источник сообщения = from my friend.', 'Out of my friend не підходить. Джерело повідомлення = from my friend.') }, retryFeedback: [tri('От кого? От друга = from my friend.', 'Від кого? Від друга = from my friend.'), tri('A message from my friend.'), tri('Подсказка: I got a message from my friend.', 'Підказка: I got a message from my friend.')], focusWords: ['message', 'friend', 'from'] }),
    step({ id: 'prep_dir_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'out_of_car', sentence: 'Get ___ the car.', translation: tri('Выйди из машины.', 'Вийди з машини.'), options: ['to', 'into', 'from', 'out of'], correctAnswer: 'out of', correctFeedback: tri('Да. Человек внутри машины и выходит наружу. Поэтому out of the car.', 'Так. Людина всередині машини і виходить назовні. Тому out of the car.'), wrong: { to: tri('To the car означает к машине. Здесь нужно выйти изнутри машины: out of.', 'To the car означає до машини. Тут потрібно вийти зсередини машини: out of.'), into: tri('Into the car означает сесть внутрь машины. Здесь выйти наружу: out of.', 'Into the car означає сісти всередину машини. Тут вийти назовні: out of.'), from: tri('From показывает источник, но для выхода изнутри машины естественно out of the car.', 'From показує джерело, але для виходу зсередини машини природно out of the car.') }, retryFeedback: [tri('Изнутри машины наружу = out of the car.', 'Зсередини машини назовні = out of the car.'), tri('Get out of the car.'), tri('Подсказка: Get out of the car.', 'Підказка: Get out of the car.')], focusWords: ['get', 'car', 'out of'] }),
    step({ id: 'prep_dir_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'out_of_bag', sentence: 'Take it ___ the bag.', translation: tri('Достань это из сумки.', 'Дістань це із сумки.'), options: ['to', 'into', 'from', 'out of'], correctAnswer: 'out of', correctFeedback: tri('Да. Предмет был внутри сумки и выходит наружу. Поэтому out of the bag.', 'Так. Предмет був усередині сумки і виходить назовні. Тому out of the bag.'), wrong: { to: tri('To the bag означает к сумке. Здесь достать изнутри сумки: out of.', 'To the bag означає до сумки. Тут дістати зсередини сумки: out of.'), into: tri('Into the bag означает положить внутрь сумки. Здесь достать наружу: out of.', 'Into the bag означає покласти всередину сумки. Тут дістати назовні: out of.'), from: tri('From возможно как общий источник, но с take из контейнера естественнее out of the bag.', 'From можливе як загальне джерело, але з take з контейнера природніше out of the bag.') }, retryFeedback: [tri('Достать изнутри = take out of.', 'Дістати зсередини = take out of.'), tri('Take it out of the bag.'), tri('Подсказка: Take it out of the bag.', 'Підказка: Take it out of the bag.')], focusWords: ['take', 'bag', 'out of'] }),
    step({ id: 'prep_dir_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'into_out_of_pair', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.'), options: ['put it into the bag / take it out of the bag', 'put it out of the bag / take it into the bag', 'put it from the bag / take it to the bag', 'put it to the bag / take it from the bag'], correctAnswer: 'put it into the bag / take it out of the bag', correctFeedback: tri('Да. Put into = положить внутрь. Take out of = достать наружу.', 'Так. Put into = покласти всередину. Take out of = дістати назовні.'), wrong: { 'put it out of the bag / take it into the bag': tri('Направления перепутаны. Кладем внутрь = into. Достаем наружу = out of.', 'Напрямки переплутані. Кладемо всередину = into. Дістаємо назовні = out of.'), 'put it from the bag / take it to the bag': tri('From/to не передают движение внутрь и наружу из контейнера. Нужны into/out of.', 'From/to не передають рух усередину і назовні з контейнера. Потрібні into/out of.'), 'put it to the bag / take it from the bag': tri('To/from слишком общие. Для сумки как контейнера лучше into/out of.', 'To/from занадто загальні. Для сумки як контейнера краще into/out of.') }, retryFeedback: [tri('Внутрь = into. Наружу изнутри = out of.', 'Всередину = into. Назовні зсередини = out of.'), tri('Into the bag / out of the bag.'), tri('Подсказка: put it into the bag / take it out of the bag.', 'Підказка: put it into the bag / take it out of the bag.')], focusWords: ['into', 'out of', 'bag'] }),
    step({ id: 'prep_dir_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_to_from', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.'), options: ['go to work / come from work', 'go from work / come to work', 'go into work / come out of work', 'go out of work / come into work'], correctAnswer: 'go to work / come from work', correctFeedback: tri('Да. Go to work = идти на работу. Come from work = прийти с работы.', 'Так. Go to work = іти на роботу. Come from work = прийти з роботи.'), wrong: { 'go from work / come to work': tri('Формы перепутаны. На работу = to work. С работы = from work.', 'Форми переплутані. На роботу = to work. З роботи = from work.'), 'go into work / come out of work': tri('Into/out of подчеркивают вход/выход изнутри. Для обычного направления на работу и с работы нужны to/from.', 'Into/out of підкреслюють вхід/вихід зсередини. Для звичайного напрямку на роботу і з роботи потрібні to/from.'), 'go out of work / come into work': tri('Это меняет смысл. Базовая пара: go to work / come from work.', 'Це змінює сенс. Базова пара: go to work / come from work.') }, retryFeedback: [tri('Куда = to. Откуда = from.', 'Куди = to. Звідки = from.'), tri('To work / from work.'), tri('Подсказка: go to work / come from work.', 'Підказка: go to work / come from work.')], focusWords: ['to work', 'from work'] }),
    step({ id: 'prep_dir_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_in_into', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.'), options: ['I am in the room / I went into the room', 'I am into the room / I went in the room', 'I am from the room / I went out of the room', 'I am to the room / I went from the room'], correctAnswer: 'I am in the room / I went into the room', correctFeedback: tri('Да. In = положение внутри. Into = движение внутрь.', 'Так. In = положення всередині. Into = рух усередину.'), wrong: { 'I am into the room / I went in the room': tri('Положение внутри = in the room. Движение внутрь = into the room.', 'Положення всередині = in the room. Рух усередину = into the room.'), 'I am from the room / I went out of the room': tri('Went out of the room правильно для выхода, но первая часть должна быть in the room.', 'Went out of the room правильно для виходу, але перша частина має бути in the room.'), 'I am to the room / I went from the room': tri('Am to the room неправильно для положения. Нужно in the room. Went from не значит вошел внутрь.', 'Am to the room неправильно для положення. Потрібно in the room. Went from не означає увійшов усередину.') }, retryFeedback: [tri('Где? In. Куда внутрь? Into.', 'Де? In. Куди всередину? Into.'), tri('In the room / into the room.'), tri('Подсказка: I am in the room / I went into the room.', 'Підказка: I am in the room / I went into the room.')], focusWords: ['in', 'into', 'room'] }),
    step({ id: 'prep_dir_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.'), options: ['She came from work and went into the room.', 'She came to work and went from the room.', 'She came out of work and went to the room.', 'She came into work and went out of the room.'], correctAnswer: 'She came from work and went into the room.', correctFeedback: tri('Да. Came from work = пришла с работы. Went into the room = вошла в комнату.', 'Так. Came from work = прийшла з роботи. Went into the room = увійшла в кімнату.'), wrong: { 'She came to work and went from the room.': tri('Came to work означает пришла на работу. Went from the room не значит вошла в комнату.', 'Came to work означає прийшла на роботу. Went from the room не означає увійшла в кімнату.'), 'She came out of work and went to the room.': tri('Out of work не подходит для обычного “с работы”. Went to the room слабее, чем “вошла в комнату”. Нужно from work / into the room.', 'Out of work не підходить для звичайного “з роботи”. Went to the room слабше, ніж “увійшла в кімнату”. Потрібно from work / into the room.'), 'She came into work and went out of the room.': tri('Это другой смысл: пришла на работу и вышла из комнаты. Нужно пришла с работы и вошла в комнату.', 'Це інший сенс: прийшла на роботу і вийшла з кімнати. Потрібно прийшла з роботи і увійшла в кімнату.') }, retryFeedback: [tri('С работы = from work. В комнату внутрь = into the room.', 'З роботи = from work. У кімнату всередину = into the room.'), tri('From work / into the room.'), tri('Подсказка: She came from work and went into the room.', 'Підказка: She came from work and went into the room.')], focusWords: ['from work', 'into the room'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'to_into_confusion',
      'in_into_confusion',
      'from_out_of_confusion',
      'from_missing_source_error',
      'out_of_missing_inside_error',
      'to_recipient_error',
      'towards_to_confusion',
      'wrong_direction_preposition',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Показываем траекторию движения и нужный предлог.', 'Показуємо траєкторію руху і потрібний прийменник.'),
    depth2: tri('Спрашиваем: движение идет к месту, внутрь, откуда-то или наружу изнутри.', 'Питаємо: рух іде до місця, всередину, звідкись або назовні зсередини.'),
    depth3: tri('Показываем готовые пары go to work / go into the room / come from work / get out of the car.', 'Показуємо готові пари go to work / go into the room / come from work / get out of the car.'),
    depth4: tri('Почти подсказка: прямо указываем to, into, from или out of.', 'Майже підказка: прямо вказуємо to, into, from або out of.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        'Остановись. Нарисуй движение. К месту = to. Внутрь = into. Откуда = from. Изнутри наружу = out of. Если движения нет, а предмет уже внутри, часто нужен in.',
        'Зупинись. Намалюй рух. До місця = to. Всередину = into. Звідки = from. Зсередини назовні = out of. Якщо руху немає, а предмет уже всередині, часто потрібен in.',
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_direction_hint_then_retry',
      card: tri(
        'Подсказка по траектории: система покажет тип движения, но не выберет предлог за пользователя.',
        'Підказка за траєкторією: система покаже тип руху, але не вибере прийменник за користувача.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        'Режим подсказки: сначала выбери траекторию движения: к месту, внутрь, откуда или наружу изнутри. Потом система вернет тебя к предлогу.',
        'Режим підказки: спочатку обери траєкторію руху: до місця, всередину, звідки або назовні зсередини. Потім система поверне тебе до прийменника.',
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_prep_dir_001', prompt: tri('Go to work показывает движение к месту или внутрь контейнера?', 'Go to work показує рух до місця чи всередину контейнера?'), options: ['к месту', 'внутрь контейнера'], correctIndex: 0, thenReturnToExerciseId: 'prep_dir_easy_001' },
      { id: 'guided_prep_dir_002', prompt: tri('Walk into the room показывает движение внутрь или откуда?', 'Walk into the room показує рух всередину чи звідки?'), options: ['внутрь', 'откуда'], correctIndex: 0, thenReturnToExerciseId: 'prep_dir_contrast_001' },
      { id: 'guided_prep_dir_003', prompt: tri('Come from work отвечает на вопрос куда или откуда?', 'Come from work відповідає на питання куди чи звідки?'), options: ['куда', 'откуда'], correctIndex: 1, thenReturnToExerciseId: 'prep_dir_contrast_004' },
      { id: 'guided_prep_dir_004', prompt: tri('Get out of the car показывает движение внутрь машины или изнутри наружу?', 'Get out of the car показує рух усередину машини чи зсередини назовні?'), options: ['внутрь', 'изнутри наружу'], correctIndex: 1, thenReturnToExerciseId: 'prep_dir_mixed_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'preposition',
    microDiagnosisId: 'preposition_direction_to_into_from',
    diagnosisLabel: tri('To / Into / From / Out of', 'To / Into / From / Out of'),
    contrastSet: CONTRAST,
    focusWords: ['to', 'into', 'from', 'out of', 'in', 'towards'],
    focusPatterns: [
      'to_destination',
      'to_city_destination',
      'to_recipient',
      'into_room',
      'into_bag',
      'in_vs_into',
      'from_work',
      'from_country',
      'from_person_source',
      'out_of_car',
      'out_of_bag',
      'into_out_of_pair',
      'mixed_to_from',
      'mixed_in_into',
      'mixed_sentence_correction',
    ],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_preposition_direction_to_into_from_start',
    answer: 'diagnosis_training_preposition_direction_to_into_from_answer',
    mastery: 'diagnosis_training_preposition_direction_to_into_from_mastery',
    fallback: 'diagnosis_training_preposition_direction_to_into_from_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: {
      category: 'preposition',
      microDiagnosisId: 'preposition_direction_to_into_from',
      contrastSet: ['to', 'into', 'from', 'out of', 'towards', 'in'],
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logMovementType: true,
      logPreposition: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=preposition&microDiagnosisId=preposition_direction_to_into_from',
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


