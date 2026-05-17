import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.

const tri = (ru: string, uk: string, es: string): TriText => ({ ru, uk, es });

const CONTRAST = [
  'am/is/are + verb-ing',
  'future arrangement',
  'tomorrow',
  'on Monday',
  'tonight',
  'next week',
  'going to',
  'will',
  'present continuous now',
];

const SMART_CONTRAST = [
  'am/is/are + verb-ing',
  'future arrangement',
  'tomorrow',
  'on Monday',
  'tonight',
  'next week',
  'going to',
  'will',
];

const MODEL = tri(
  'Present Continuous может говорить не только о действии прямо сейчас. Если рядом есть tomorrow, tonight, next week, on Monday или точное время, та же форма часто показывает уже договоренный план: I am meeting John tomorrow. Форма остается та же: am/is/are + действие с -ing.',
  'Present Continuous може говорити не тільки про дію прямо зараз. Якщо поруч є tomorrow, tonight, next week, on Monday або точний час, та сама форма часто показує вже домовлений план: I am meeting John tomorrow. Форма лишається та сама: am/is/are + дія з -ing.',
  'Present Continuous can describe a future arrangement when a future time marker is present.',
);

function retry(correct: string): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'Сначала найди маркер времени: now, tomorrow, tonight, next week, on Monday, at 3.',
      'Спочатку знайди маркер часу: now, tomorrow, tonight, next week, on Monday, at 3.',
      'First find the time marker.',
    ),
    tri(
      'Если это конкретная договоренность в будущем, часто нужна форма am/is/are + -ing.',
      'Якщо це конкретна домовленість у майбутньому, часто потрібна форма am/is/are + -ing.',
      'Future arrangement often uses am/is/are + -ing.',
    ),
    tri(
      'Проверь маленькое слово перед действием: I am, she is, we/they are.',
      'Перевір маленьке слово перед дією: I am, she is, we/they are.',
      'Check the small word before the action: am, is, or are.',
    ),
    tri(
      'Нужный вариант здесь тот, где договорённость, решение сейчас и план не смешаны.',
      'Потрібний варіант тут той, де домовленість, рішення зараз і план не змішані.',
      `The answer here is: ${correct}.`,
    ),
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Почти. Проверь время и форму am/is/are + -ing. Здесь нужно: ${correct}.`,
    `Майже. Перевір час і форму am/is/are + -ing. Тут потрібно: ${correct}.`,
    `Almost. Check the time marker and use: ${correct}.`,
  );
}

function futurePcStep(input: {
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
  focusWords: string[];
}): DiagnosisTrainingStep {
  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: input.translation,
    teachingText: MODEL,
    explanationBlock: MODEL,
    microTask: tri(
      'Выбери форму для будущей договоренности, действия сейчас, решения через will или намерения через going to.',
      'Обери форму для майбутньої домовленості, дії зараз, рішення через will або наміру через going to.',
      'Choose the form for arrangement, now-action, will, or going to.',
    ),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(
      input.options
        .filter((option) => option !== input.correctAnswer)
        .map((option) => [option, input.wrong[option] ?? defaultWrong(input.correctAnswer)]),
    ),
    retryFeedback: retry(input.correctAnswer),
    fallbackExplanation: tri(
      'Коротко: tomorrow, tonight, next week или on Monday могут делать Present Continuous будущим планом. I am meeting tomorrow = уже договорился. The phone is ringing. I will answer it = решение прямо сейчас.',
      'Коротко: tomorrow, tonight, next week або on Monday можуть робити Present Continuous майбутнім планом. I am meeting tomorrow = уже домовився. The phone is ringing. I will answer it = рішення прямо зараз.',
      'Short version: future marker plus am/is/are + -ing can show an arrangement. Will often shows a decision now.',
    ),
    focusWords: input.focusWords,
  };
}

export const FUTURE_PRESENT_CONTINUOUS_ARRANGEMENTS_TRAINING: DiagnosisTraining = {
  id: 'future_present_continuous_arrangements',
  category: 'verb',
  version: '1.0.0',
  status: 'active',
  priority: 45,
  supportedLocales: ['ru', 'uk'],
  title: tri(
    'Present Continuous для будущих договоренностей',
    'Present Continuous для майбутніх домовленостей',
    'Present Continuous for future arrangements',
  ),
  shortTitle: tri('Future arrangements', 'Future arrangements', 'Future arrangements'),
  shortDiagnosis: tri(
    'Ты видишь am meeting и думаешь только “прямо сейчас”, хотя tomorrow может делать это будущим планом.',
    'Ти бачиш am meeting і думаєш тільки “прямо зараз”, хоча tomorrow може робити це майбутнім планом.',
    'You treat am meeting only as now, even when tomorrow makes it future.',
  ),
  diagnosisText: tri(
    'Ошибка появляется, когда форма am/is/are + -ing автоматически воспринимается как действие сейчас. Но I am meeting John tomorrow не значит “я прямо сейчас его встречаю”. Это уже назначенная встреча в будущем.',
    'Помилка зʼявляється, коли форма am/is/are + -ing автоматично сприймається як дія зараз. Але I am meeting John tomorrow не означає “я прямо зараз його зустрічаю”. Це вже призначена зустріч у майбутньому.',
    'The mistake appears when am/is/are + -ing is treated only as now. With tomorrow, it can be a future arrangement.',
  ),
  mentalModel: MODEL,
  contrastSet: CONTRAST,
  coreRule: tri(
    'Для личной договоренности в будущем часто звучит Present Continuous: I am meeting him tomorrow. We are having dinner tonight. She is leaving next week. Для решения в момент речи часто звучит will: I will answer it.',
    'Для особистої домовленості в майбутньому часто звучить Present Continuous: I am meeting him tomorrow. We are having dinner tonight. She is leaving next week. Для рішення в момент мовлення часто звучить will: I will answer it.',
    'Future arrangement: I am meeting him tomorrow. Decision now: I will answer it.',
  ),
  whatUserMustLearn: {
    ru: [
      'Present Continuous может описывать будущую договоренность: I am meeting him tomorrow.',
      'Будущий смысл обычно виден через tomorrow, tonight, next week, on Monday или at 6.',
      'Форма остается am/is/are + -ing: I am meeting, she is flying, they are coming.',
      'Контекст времени решает, это действие сейчас или будущий план.',
      'Will часто подходит для решения прямо сейчас, обещания или прогноза.',
      'Going to часто показывает намерение или план, но не обязательно уже назначенную встречу.',
      'Present Continuous для будущего звучит как конкретная договоренность.',
      'Не говори I meeting him tomorrow. Нужно I am meeting.',
      'Не говори I am meet him tomorrow. Нужно I am meeting.',
      'Личные договоренности часто звучат через Present Continuous.',
    ],
    uk: [
      'Present Continuous може описувати майбутню домовленість: I am meeting him tomorrow.',
      'Майбутній зміст зазвичай видно через tomorrow, tonight, next week, on Monday або at 6.',
      'Форма лишається am/is/are + -ing: I am meeting, she is flying, they are coming.',
      'Контекст часу вирішує, це дія зараз чи майбутній план.',
      'Will часто підходить для рішення прямо зараз, обіцянки або прогнозу.',
      'Going to часто показує намір або план, але не обовʼязково вже призначену зустріч.',
      'Present Continuous для майбутнього звучить як конкретна домовленість.',
      'Не кажи I meeting him tomorrow. Потрібно I am meeting.',
      'Не кажи I am meet him tomorrow. Потрібно I am meeting.',
      'Особисті домовленості часто звучать через Present Continuous.',
    ],
    es: [
      'Present Continuous can describe a future arrangement.',
      'Future meaning is often visible through tomorrow, tonight, next week, on Monday, or at 6.',
      'Use am/is/are + -ing.',
      'The time context decides now or future.',
      'Will often fits a decision now, promise, or prediction.',
      'Going to often shows intention.',
      'Present Continuous for future sounds concrete.',
      'Do not omit am/is/are.',
      'Do not use am meet.',
      'Personal arrangements often use Present Continuous.',
    ],
  },
  examples: [
    {
      en: 'I am meeting John tomorrow.',
      ru: 'Я завтра встречаюсь с Джоном.',
      uk: 'Я завтра зустрічаюся з Джоном.',
      es: 'I am meeting John tomorrow.',
      why: tri('Tomorrow делает это будущей договоренностью.', 'Tomorrow робить це майбутньою домовленістю.', 'Tomorrow makes it a future arrangement.'),
    },
    {
      en: 'She is flying to London on Monday.',
      ru: 'Она летит в Лондон в понедельник.',
      uk: 'Вона летить до Лондона в понеділок.',
      es: 'She is flying to London on Monday.',
      why: tri('On Monday показывает будущий план.', 'On Monday показує майбутній план.', 'On Monday marks a future plan.'),
    },
    {
      en: 'We are having dinner tonight.',
      ru: 'Мы сегодня вечером ужинаем.',
      uk: 'Ми сьогодні ввечері вечеряємо.',
      es: 'We are having dinner tonight.',
      why: tri('Tonight показывает договоренность на вечер.', 'Tonight показує домовленість на вечір.', 'Tonight marks an arranged evening plan.'),
    },
    {
      en: 'They are coming next week.',
      ru: 'Они приезжают на следующей неделе.',
      uk: 'Вони приїжджають наступного тижня.',
      es: 'They are coming next week.',
      why: tri('Next week переносит форму в будущее.', 'Next week переносить форму в майбутнє.', 'Next week sets future time.'),
    },
    {
      en: 'Are you working tomorrow?',
      ru: 'Ты завтра работаешь?',
      uk: 'Ти завтра працюєш?',
      es: 'Are you working tomorrow?',
      why: tri('Вопрос про смену или план на завтра.', 'Питання про зміну або план на завтра.', 'A question about a planned shift.'),
    },
    {
      en: 'I am not going out tonight.',
      ru: 'Я сегодня вечером никуда не иду.',
      uk: 'Я сьогодні ввечері нікуди не йду.',
      es: 'I am not going out tonight.',
      why: tri('Tonight делает отрицание будущим планом.', 'Tonight робить заперечення майбутнім планом.', 'Tonight makes it a future plan.'),
    },
    {
      en: 'I am calling him now.',
      ru: 'Я звоню ему сейчас.',
      uk: 'Я дзвоню йому зараз.',
      es: 'I am calling him now.',
      why: tri('Now показывает действие сейчас.', 'Now показує дію зараз.', 'Now means current action.'),
    },
    {
      en: 'I am calling him tomorrow.',
      ru: 'Я позвоню ему завтра.',
      uk: 'Я зателефоную йому завтра.',
      es: 'I am calling him tomorrow.',
      why: tri('Tomorrow меняет тот же шаблон на будущий план.', 'Tomorrow змінює той самий шаблон на майбутній план.', 'Tomorrow turns the same form into a future plan.'),
    },
  ],
  introBlocks: [
    {
      id: 'intro_problem',
      type: 'diagnosis',
      text: tri(
        'Ты можешь увидеть am meeting и подумать: “это же сейчас”. Но завтра в предложении меняет сцену.',
        'Ти можеш побачити am meeting і подумати: “це ж зараз”. Але завтра в реченні змінює сцену.',
        'A future marker changes the scene.',
      ),
    },
    {
      id: 'intro_rule',
      type: 'rule',
      text: tri(
        'Форма та же: am/is/are + -ing. Но с tomorrow, tonight или next week она часто значит: это уже договорено.',
        'Форма та сама: am/is/are + -ing. Але з tomorrow, tonight або next week вона часто означає: це вже домовлено.',
        'Same form, future marker, arranged already.',
      ),
    },
    {
      id: 'intro_warning',
      type: 'warning',
      text: tri(
        'Не обрезай маленькое am/is/are: не I meeting tomorrow, а I am meeting tomorrow.',
        'Не обрізай маленьке am/is/are: не I meeting tomorrow, а I am meeting tomorrow.',
        'Do not omit am/is/are.',
      ),
    },
  ],
  steps: [
    futurePcStep({
      id: 'future_pc_easy_001',
      order: 1,
      difficulty: 'easy',
      targetSkill: 'future_arrangement_meeting',
      sentence: 'I ___ John tomorrow.',
      translation: tri('Я завтра встречаюсь с Джоном.', 'Я завтра зустрічаюся з Джоном.', 'I am meeting John tomorrow.'),
      options: ['am meeting', 'meet', 'meeting', 'am meet'],
      correctAnswer: 'am meeting',
      correctFeedback: tri(
        'Да. Tomorrow показывает будущую договоренность: I am meeting John tomorrow.',
        'Так. Tomorrow показує майбутню домовленість: I am meeting John tomorrow.',
        'Yes. Tomorrow marks a future arrangement: am meeting.',
      ),
      wrong: {
        meet: tri(
          'Meet звучит как расписание или общий факт. Для личной встречи завтра здесь лучше am meeting.',
          'Meet звучить як розклад або загальний факт. Для особистої зустрічі завтра тут краще am meeting.',
          'For a personal arrangement tomorrow, use am meeting.',
        ),
        meeting: tri(
          'Meeting без am неполное. Нужно am meeting.',
          'Meeting без am неповне. Потрібно am meeting.',
          'Meeting needs am: am meeting.',
        ),
        'am meet': tri(
          'После am действие идет с -ing: am meeting.',
          'Після am дія йде з -ing: am meeting.',
          'After am, use meeting.',
        ),
      },
      focusWords: ['am meeting', 'tomorrow'],
    }),
    futurePcStep({
      id: 'future_pc_easy_002',
      order: 2,
      difficulty: 'easy',
      targetSkill: 'future_arrangement_tonight',
      sentence: 'We ___ dinner tonight.',
      translation: tri('Мы сегодня вечером ужинаем.', 'Ми сьогодні ввечері вечеряємо.', 'We are having dinner tonight.'),
      options: ['are having', 'have', 'having', 'are have'],
      correctAnswer: 'are having',
      correctFeedback: tri(
        'Да. Tonight показывает план на вечер, а we берет are: are having.',
        'Так. Tonight показує план на вечір, а we бере are: are having.',
        'Yes. Tonight marks a future plan, and we takes are.',
      ),
      wrong: {
        have: tri(
          'Have звучит как обычная привычка. Для конкретного плана сегодня вечером нужно are having.',
          'Have звучить як звичайна звичка. Для конкретного плану сьогодні ввечері потрібно are having.',
          'For a concrete plan tonight, use are having.',
        ),
        having: tri(
          'Having без are неполное. Нужно are having.',
          'Having без are неповне. Потрібно are having.',
          'Having needs are.',
        ),
        'are have': tri(
          'После are действие идет с -ing: are having.',
          'Після are дія йде з -ing: are having.',
          'After are, use having.',
        ),
      },
      focusWords: ['are having', 'tonight'],
    }),
    futurePcStep({
      id: 'future_pc_easy_003',
      order: 3,
      difficulty: 'easy',
      targetSkill: 'now_vs_tomorrow_pair',
      sentence: 'Choose the correct pair.',
      translation: tri(
        'Выбери пару: звоню сейчас / звоню завтра.',
        'Обери пару: дзвоню зараз / дзвоню завтра.',
        'I am calling now / I am calling tomorrow',
      ),
      options: [
        'I am calling now / I am calling tomorrow',
        'I call now / I call tomorrow',
        'I calling now / I calling tomorrow',
        'I am call now / I am call tomorrow',
      ],
      correctAnswer: 'I am calling now / I am calling tomorrow',
      correctFeedback: tri(
        'Да. Форма одна, но now дает действие сейчас, а tomorrow дает будущий план.',
        'Так. Форма одна, але now дає дію зараз, а tomorrow дає майбутній план.',
        'Yes. Same form, different time marker.',
      ),
      wrong: {
        'I call now / I call tomorrow': tri(
          'Для действия сейчас и конкретного плана завтра естественнее I am calling.',
          'Для дії зараз і конкретного плану завтра природніше I am calling.',
          'For now-action and concrete plan, use I am calling.',
        ),
        'I calling now / I calling tomorrow': tri(
          'Calling без am неполное. Нужно I am calling.',
          'Calling без am неповне. Потрібно I am calling.',
          'Calling needs am.',
        ),
        'I am call now / I am call tomorrow': tri(
          'После am нужно calling: I am calling.',
          'Після am потрібно calling: I am calling.',
          'After am, use calling.',
        ),
      },
      focusWords: ['am calling now', 'am calling tomorrow'],
    }),
    futurePcStep({
      id: 'future_pc_contrast_001',
      order: 4,
      difficulty: 'contrast',
      targetSkill: 'she_is_flying',
      sentence: 'She ___ to London on Monday.',
      translation: tri('Она летит в Лондон в понедельник.', 'Вона летить до Лондона в понеділок.', 'She is flying to London on Monday.'),
      options: ['is flying', 'are flying', 'flies', 'is fly'],
      correctAnswer: 'is flying',
      correctFeedback: tri(
        'Да. She берет is, а on Monday показывает будущий план: is flying.',
        'Так. She бере is, а on Monday показує майбутній план: is flying.',
        'Yes. She takes is, and on Monday marks a future plan.',
      ),
      wrong: {
        'are flying': tri(
          'Are не подходит к she. Здесь нужно is flying.',
          'Are не підходить до she. Тут потрібно is flying.',
          'She takes is flying.',
        ),
        flies: tri(
          'Flies может звучать как расписание. Для ее личной поездки в понедельник лучше is flying.',
          'Flies може звучати як розклад. Для її особистої поїздки в понеділок краще is flying.',
          'For her arranged trip, use is flying.',
        ),
        'is fly': tri(
          'После is нужно flying: is flying.',
          'Після is потрібно flying: is flying.',
          'After is, use flying.',
        ),
      },
      focusWords: ['is flying', 'on Monday'],
    }),
    futurePcStep({
      id: 'future_pc_contrast_002',
      order: 5,
      difficulty: 'contrast',
      targetSkill: 'they_are_coming',
      sentence: 'They ___ next week.',
      translation: tri('Они приезжают на следующей неделе.', 'Вони приїжджають наступного тижня.', 'They are coming next week.'),
      options: ['are coming', 'is coming', 'come', 'are come'],
      correctAnswer: 'are coming',
      correctFeedback: tri(
        'Да. They берет are, а next week переносит действие в будущий план.',
        'Так. They бере are, а next week переносить дію в майбутній план.',
        'Yes. They takes are, and next week sets future time.',
      ),
      wrong: {
        'is coming': tri(
          'Is не подходит к they. Нужно are coming.',
          'Is не підходить до they. Потрібно are coming.',
          'They takes are coming.',
        ),
        come: tri(
          'Come может звучать как факт или расписание. Для договоренного визита лучше are coming.',
          'Come може звучати як факт або розклад. Для домовленого візиту краще are coming.',
          'For an arranged visit, use are coming.',
        ),
        'are come': tri(
          'После are нужно coming: are coming.',
          'Після are потрібно coming: are coming.',
          'After are, use coming.',
        ),
      },
      focusWords: ['are coming', 'next week'],
    }),
    futurePcStep({
      id: 'future_pc_contrast_003',
      order: 6,
      difficulty: 'contrast',
      targetSkill: 'i_am_leaving',
      sentence: 'I ___ at 8 tomorrow.',
      translation: tri('Я завтра ухожу в 8.', 'Я завтра йду о 8.', 'I am leaving at 8 tomorrow.'),
      options: ['am leaving', 'leave', 'leaving', 'am leave'],
      correctAnswer: 'am leaving',
      correctFeedback: tri(
        'Да. At 8 tomorrow звучит как конкретный план: am leaving.',
        'Так. At 8 tomorrow звучить як конкретний план: am leaving.',
        'Yes. At 8 tomorrow sounds like a concrete plan.',
      ),
      wrong: {
        leave: tri(
          'Leave может быть расписанием, но для личного плана здесь естественнее am leaving.',
          'Leave може бути розкладом, але для особистого плану тут природніше am leaving.',
          'For a personal plan, use am leaving.',
        ),
        leaving: tri(
          'Leaving без am неполное. Нужно am leaving.',
          'Leaving без am неповне. Потрібно am leaving.',
          'Leaving needs am.',
        ),
        'am leave': tri(
          'После am нужно leaving: am leaving.',
          'Після am потрібно leaving: am leaving.',
          'After am, use leaving.',
        ),
      },
      focusWords: ['am leaving', 'at 8 tomorrow'],
    }),
    futurePcStep({
      id: 'future_pc_contrast_004',
      order: 7,
      difficulty: 'contrast',
      targetSkill: 'question_are_you_working',
      sentence: '___ you working tomorrow?',
      translation: tri('Ты завтра работаешь?', 'Ти завтра працюєш?', 'Are you working tomorrow?'),
      options: ['Are', 'Do', 'Will', 'Did'],
      correctAnswer: 'Are',
      correctFeedback: tri(
        'Да. В вопросе Present Continuous маленькое слово выходит вперед: Are you working tomorrow?',
        'Так. У питанні Present Continuous маленьке слово виходить уперед: Are you working tomorrow?',
        'Yes. In the question, are goes before you.',
      ),
      wrong: {
        Do: tri(
          'Do you working не работает. Нужна форма Are you working tomorrow?',
          'Do you working не працює. Потрібна форма Are you working tomorrow?',
          'Use Are you working tomorrow?',
        ),
        Will: tri(
          'Will you work возможно в другом оттенке. Но для запланированной смены здесь нужно Are you working tomorrow?',
          'Will you work можливе в іншому відтінку. Але для запланованої зміни тут потрібно Are you working tomorrow?',
          'For a planned shift, use Are you working tomorrow?',
        ),
        Did: tri(
          'Did уводит в прошлое. Tomorrow просит будущий план: Are you working tomorrow?',
          'Did веде в минуле. Tomorrow просить майбутній план: Are you working tomorrow?',
          'Tomorrow needs a future plan: Are you working tomorrow?',
        ),
      },
      focusWords: ['are you working'],
    }),
    futurePcStep({
      id: 'future_pc_contrast_005',
      order: 8,
      difficulty: 'contrast',
      targetSkill: 'negative_not_going_out',
      sentence: 'I ___ going out tonight.',
      translation: tri('Я сегодня вечером никуда не иду.', 'Я сьогодні ввечері нікуди не йду.', 'I am not going out tonight.'),
      options: ['am not', 'do not', 'will not', 'did not'],
      correctAnswer: 'am not',
      correctFeedback: tri(
        'Да. Отрицание в этой форме: am not going out.',
        'Так. Заперечення в цій формі: am not going out.',
        'Yes. Present Continuous negative: am not going out.',
      ),
      wrong: {
        'do not': tri(
          'Do not going out не работает. Нужно am not going out.',
          'Do not going out не працює. Потрібно am not going out.',
          'Use am not going out.',
        ),
        'will not': tri(
          'Will not go out возможно, но как уже решенный план на tonight естественнее am not going out.',
          'Will not go out можливо, але як уже вирішений план на tonight природніше am not going out.',
          'For a settled plan tonight, use am not going out.',
        ),
        'did not': tri(
          'Did not уводит в прошлое, а tonight здесь про будущий вечер.',
          'Did not веде в минуле, а tonight тут про майбутній вечір.',
          'Did not is past. Tonight is future here.',
        ),
      },
      focusWords: ['am not going out'],
    }),
    futurePcStep({
      id: 'future_pc_contrast_006',
      order: 9,
      difficulty: 'contrast',
      targetSkill: 'question_pair',
      sentence: 'Choose the correct question.',
      translation: tri(
        'Что ты делаешь завтра вечером?',
        'Що ти робиш завтра ввечері?',
        'What are you doing tomorrow evening?',
      ),
      options: [
        'What are you doing tomorrow evening?',
        'What do you doing tomorrow evening?',
        'What will you doing tomorrow evening?',
        'What did you doing tomorrow evening?',
      ],
      correctAnswer: 'What are you doing tomorrow evening?',
      correctFeedback: tri(
        'Да. Вопрос звучит так: What are you doing tomorrow evening?',
        'Так. Питання звучить так: What are you doing tomorrow evening?',
        'Yes. Question word + are + you + doing.',
      ),
      wrong: {
        'What do you doing tomorrow evening?': tri(
          'Do you doing не работает. Нужно are you doing.',
          'Do you doing не працює. Потрібно are you doing.',
          'Use are you doing.',
        ),
        'What will you doing tomorrow evening?': tri(
          'Will you doing не работает. С will было бы will do, а для планов здесь лучше are you doing.',
          'Will you doing не працює. З will було б will do, а для планів тут краще are you doing.',
          'Use are you doing for plans.',
        ),
        'What did you doing tomorrow evening?': tri(
          'Did не подходит к tomorrow evening и не работает с doing. Нужно What are you doing tomorrow evening?',
          'Did не підходить до tomorrow evening і не працює з doing. Потрібно What are you doing tomorrow evening?',
          'Use What are you doing tomorrow evening?',
        ),
      },
      focusWords: ['what are you doing'],
    }),
    futurePcStep({
      id: 'future_pc_mixed_001',
      order: 10,
      difficulty: 'mixed',
      targetSkill: 'arrangement_vs_will',
      sentence: 'I ___ my doctor at 3 tomorrow.',
      translation: tri('Я завтра в 3 иду к врачу.', 'Я завтра о 3 йду до лікаря.', 'I am seeing my doctor at 3 tomorrow.'),
      options: ['am seeing', 'will see', 'see', 'am see'],
      correctAnswer: 'am seeing',
      correctFeedback: tri(
        'Да. Врач в 3 завтра звучит как назначенная встреча: am seeing.',
        'Так. Лікар о 3 завтра звучить як призначена зустріч: am seeing.',
        'Yes. Appointment at 3 tomorrow: am seeing.',
      ),
      wrong: {
        'will see': tri(
          'Will see возможно в другом смысле. Но для записанного приема лучше am seeing.',
          'Will see можливе в іншому сенсі. Але для записаного прийому краще am seeing.',
          'For a booked appointment, use am seeing.',
        ),
        see: tri(
          'See здесь слишком похоже на расписание или общий факт. Для личной записи лучше am seeing.',
          'See тут занадто схоже на розклад або загальний факт. Для особистого запису краще am seeing.',
          'For a personal appointment, use am seeing.',
        ),
        'am see': tri(
          'После am нужно seeing: am seeing.',
          'Після am потрібно seeing: am seeing.',
          'After am, use seeing.',
        ),
      },
      focusWords: ['am seeing', 'doctor at 3'],
    }),
    futurePcStep({
      id: 'future_pc_mixed_002',
      order: 11,
      difficulty: 'mixed',
      targetSkill: 'spontaneous_will',
      sentence: 'The phone is ringing. I ___ answer it.',
      translation: tri('Звонит телефон. Я отвечу.', 'Дзвонить телефон. Я відповім.', 'The phone is ringing. I will answer it.'),
      options: ['will', 'am answering', 'answer', 'am answer'],
      correctAnswer: 'will',
      correctFeedback: tri(
        'Да. Это решение прямо сейчас, не заранее назначенный план: will answer.',
        'Так. Це рішення прямо зараз, не заздалегідь призначений план: will answer.',
        'Yes. Decision now: will answer.',
      ),
      wrong: {
        'am answering': tri(
          'Am answering звучит как действие сейчас или договоренный план. Тут решение принимается в момент речи: will answer.',
          'Am answering звучить як дія зараз або домовлений план. Тут рішення приймається в момент мовлення: will answer.',
          'Decision now: will answer.',
        ),
        answer: tri(
          'I answer it не передает решение “сейчас отвечу”. Нужна форма I will answer it.',
          'I answer it не передає рішення “зараз відповім”. Потрібна форма I will answer it.',
          'Use I will answer it.',
        ),
        'am answer': tri(
          'Am answer не работает. Для решения прямо сейчас нужно will answer.',
          'Am answer не працює. Для рішення прямо зараз потрібно will answer.',
          'Use will answer for the decision now.',
        ),
      },
      focusWords: ['will answer'],
    }),
    futurePcStep({
      id: 'future_pc_mixed_003',
      order: 12,
      difficulty: 'mixed',
      targetSkill: 'going_to_intention',
      sentence: 'I ___ start learning English next month.',
      translation: tri(
        'Я собираюсь начать учить английский в следующем месяце.',
        'Я збираюся почати вчити англійську наступного місяця.',
        'I am going to start learning English next month.',
      ),
      options: ['am going to', 'am starting', 'will to', 'going'],
      correctAnswer: 'am going to',
      correctFeedback: tri(
        'Да. Для намерения здесь хорошо звучит am going to start.',
        'Так. Для наміру тут добре звучить am going to start.',
        'Yes. For intention, use am going to start.',
      ),
      wrong: {
        'am starting': tri(
          'Am starting возможно при конкретной договоренности. Но здесь смысл намерения: am going to start.',
          'Am starting можливе за конкретної домовленості. Але тут зміст наміру: am going to start.',
          'For intention, going to fits better.',
        ),
        'will to': tri(
          'Will to не работает. Не ставь to сразу после will.',
          'Will to не працює. Не став to одразу після will.',
          'Do not use will to.',
        ),
        going: tri(
          'I going to неполное. Нужно I am going to.',
          'I going to неповне. Потрібно I am going to.',
          'Use I am going to.',
        ),
      },
      focusWords: ['am going to'],
    }),
    futurePcStep({
      id: 'future_pc_mixed_004',
      order: 13,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_now_future_pair',
      sentence: 'Choose the correct pair.',
      translation: tri(
        'Она летит сейчас / Она летит в понедельник.',
        'Вона летить зараз / Вона летить у понеділок.',
        'She is flying now / She is flying on Monday',
      ),
      options: [
        'She is flying now / She is flying on Monday',
        'She flies now / She flies on Monday',
        'She flying now / She flying on Monday',
        'She is fly now / She is fly on Monday',
      ],
      correctAnswer: 'She is flying now / She is flying on Monday',
      correctFeedback: tri(
        'Да. Та же форма: now = сейчас, on Monday = будущий план.',
        'Так. Та сама форма: now = зараз, on Monday = майбутній план.',
        'Yes. Same form, different time marker.',
      ),
      wrong: {
        'She flies now / She flies on Monday': tri(
          'Flies звучит как расписание или регулярность. Для действия сейчас и личного плана лучше is flying.',
          'Flies звучить як розклад або регулярність. Для дії зараз і особистого плану краще is flying.',
          'For now and a personal plan, use is flying.',
        ),
        'She flying now / She flying on Monday': tri(
          'Flying без is неполное. Нужно she is flying.',
          'Flying без is неповне. Потрібно she is flying.',
          'Flying needs is.',
        ),
        'She is fly now / She is fly on Monday': tri(
          'После is нужно flying: she is flying.',
          'Після is потрібно flying: she is flying.',
          'After is, use flying.',
        ),
      },
      focusWords: ['is flying now', 'is flying on Monday'],
    }),
    futurePcStep({
      id: 'future_pc_mixed_005',
      order: 14,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_arrangement_will_intention',
      sentence: 'Choose the best set.',
      translation: tri(
        'Иду к врачу в 3 / сейчас отвечу / собираюсь учиться.',
        'Йду до лікаря о 3 / зараз відповім / збираюся вчитися.',
        'I am seeing my doctor at 3 / I will answer it / I am going to study',
      ),
      options: [
        'I am seeing my doctor at 3 / I will answer it / I am going to study',
        'I will see my doctor at 3 / I am answering it / I studying',
        'I see my doctor at 3 / I will to answer it / I going to study',
        'I am see my doctor at 3 / I answer it / I am going study',
      ],
      correctAnswer: 'I am seeing my doctor at 3 / I will answer it / I am going to study',
      correctFeedback: tri(
        'Да. Договоренность: am seeing. Решение сейчас: will answer. Намерение: am going to study.',
        'Так. Домовленість: am seeing. Рішення зараз: will answer. Намір: am going to study.',
        'Yes. Arrangement, decision now, intention.',
      ),
      wrong: {
        'I will see my doctor at 3 / I am answering it / I studying': tri(
          'Запись к врачу лучше как am seeing, телефонное решение как will answer, а I studying неполное.',
          'Запис до лікаря краще як am seeing, телефонне рішення як will answer, а I studying неповне.',
          'Use am seeing / will answer / am going to study.',
        ),
        'I see my doctor at 3 / I will to answer it / I going to study': tri(
          'Will to answer не работает, и I going to study без am тоже не работает.',
          'Will to answer не працює, і I going to study без am теж не працює.',
          'Use will answer and I am going to study.',
        ),
        'I am see my doctor at 3 / I answer it / I am going study': tri(
          'После am нужно seeing, а после going нужен to: am going to study.',
          'Після am потрібно seeing, а після going потрібен to: am going to study.',
          'Use am seeing and am going to study.',
        ),
      },
      focusWords: ['am seeing', 'will answer', 'going to'],
    }),
    futurePcStep({
      id: 'future_pc_mixed_006',
      order: 15,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_sentence_correction',
      sentence: 'Choose the correct sentence.',
      translation: tri(
        'Я завтра работаю и вечером встречаюсь с другом.',
        'Я завтра працюю і ввечері зустрічаюся з другом.',
        'I am working tomorrow, and I am meeting a friend in the evening.',
      ),
      options: [
        'I am working tomorrow, and I am meeting a friend in the evening.',
        'I work tomorrow, and I meet a friend in the evening.',
        'I working tomorrow, and I meeting a friend in the evening.',
        'I am work tomorrow, and I am meet a friend in the evening.',
      ],
      correctAnswer: 'I am working tomorrow, and I am meeting a friend in the evening.',
      correctFeedback: tri(
        'Да. Tomorrow и in the evening показывают планы: am working / am meeting.',
        'Так. Tomorrow і in the evening показують плани: am working / am meeting.',
        'Yes. Future markers show plans: am working / am meeting.',
      ),
      wrong: {
        'I work tomorrow, and I meet a friend in the evening.': tri(
          'Так можно услышать для расписаний, но для личных планов естественнее am working и am meeting.',
          'Так можна почути для розкладів, але для особистих планів природніше am working і am meeting.',
          'For personal plans, use am working and am meeting.',
        ),
        'I working tomorrow, and I meeting a friend in the evening.': tri(
          'В обеих частях не хватает am: I am working, I am meeting.',
          'В обох частинах бракує am: I am working, I am meeting.',
          'Both parts need am.',
        ),
        'I am work tomorrow, and I am meet a friend in the evening.': tri(
          'После am нужно working и meeting.',
          'Після am потрібно working і meeting.',
          'After am, use working and meeting.',
        ),
      },
      focusWords: ['am working tomorrow', 'am meeting'],
    }),
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
    depth1: tri(
      'Обычное объяснение: покажи маркер будущего времени и форму am/is/are + -ing.',
      'Звичайне пояснення: покажи маркер майбутнього часу і форму am/is/are + -ing.',
      'Normal explanation: show the future marker and the am/is/are + -ing form.',
    ),
    depth2: tri(
      'Проще: спроси, действие происходит сейчас или уже запланировано на будущее.',
      'Простіше: спитай, дія відбувається зараз чи вже запланована на майбутнє.',
      'Simpler: ask now or future plan.',
    ),
    depth3: tri(
      'Еще проще: сравни I am calling now и I am calling tomorrow.',
      'Ще простіше: порівняй I am calling now і I am calling tomorrow.',
      'Even simpler: compare I am calling now and I am calling tomorrow.',
    ),
    depth4: tri(
      'Почти подсказка: для будущей договоренности ищи am/is/are + -ing.',
      'Майже підказка: для майбутньої домовленості шукай am/is/are + -ing.',
      'Almost a hint: future arrangement uses am/is/are + -ing.',
    ),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        'Present Continuous может быть будущим планом, если рядом tomorrow, tonight, next week или точное время. I am meeting him tomorrow = встреча уже назначена.',
        'Present Continuous може бути майбутнім планом, якщо поруч tomorrow, tonight, next week або точний час. I am meeting him tomorrow = зустріч уже призначена.',
        'Present Continuous can describe the future with a future marker.',
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_time_marker_hint_then_retry',
      card: tri(
        'Подсказка: сначала найди слово времени. Оно говорит, это сейчас или будущий план.',
        'Підказка: спочатку знайди слово часу. Воно говорить, це зараз чи майбутній план.',
        'Hint: find the time marker first.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        'Guided mode: сначала выбери now или будущий маркер. Потом собери am/is/are + -ing.',
        'Guided mode: спочатку обери now або майбутній маркер. Потім збери am/is/are + -ing.',
        'Guided mode: choose now/future marker, then build am/is/are + -ing.',
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      {
        id: 'guided_future_pc_001',
        prompt: tri(
          'Tomorrow показывает действие сейчас или будущий план?',
          'Tomorrow показує дію зараз чи майбутній план?',
          'Does tomorrow show now or a future plan?',
        ),
        options: ['now', 'future plan'],
        correctIndex: 1,
        thenReturnToExerciseId: 'future_pc_easy_001',
      },
      {
        id: 'guided_future_pc_002',
        prompt: tri(
          'После am здесь нужно meet или meeting?',
          'Після am тут потрібно meet чи meeting?',
          'After am, meet or meeting?',
        ),
        options: ['meet', 'meeting'],
        correctIndex: 1,
        thenReturnToExerciseId: 'future_pc_easy_001',
      },
      {
        id: 'guided_future_pc_003',
        prompt: tri(
          'С she нужно is flying или are flying?',
          'З she потрібно is flying чи are flying?',
          'With she, is flying or are flying?',
        ),
        options: ['is flying', 'are flying'],
        correctIndex: 0,
        thenReturnToExerciseId: 'future_pc_contrast_001',
      },
      {
        id: 'guided_future_pc_004',
        prompt: tri(
          'The phone is ringing. I will answer it: это договоренность или решение сейчас?',
          'The phone is ringing. I will answer it: це домовленість чи рішення зараз?',
          'Arrangement or decision now?',
        ),
        options: ['arrangement', 'decision now'],
        correctIndex: 1,
        thenReturnToExerciseId: 'future_pc_mixed_002',
      },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'future_present_continuous_arrangements',
    diagnosisLabel: tri('Future arrangements', 'Future arrangements', 'Future arrangements'),
    contrastSet: SMART_CONTRAST,
    difficultyLevel: 2,
    focusWords: [
      'am meeting tomorrow',
      'are having tonight',
      'is flying on Monday',
      'are you working tomorrow',
      'will answer',
      'going to',
    ],
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
