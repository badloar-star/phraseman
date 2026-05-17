// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.

import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = ['and', 'but', 'because', 'so', 'if', 'when', 'although'];

function defaultWrong(correct: string): Record<string, TriText> {
  return {
    and: tri(
      `And просто добавляет еще одну мысль. Здесь связь другая, нужен ${correct}.`,
      `And просто додає ще одну думку. Тут звʼязок iнший, потрiбен ${correct}.`,
      `And only adds another idea. Here the logic needs ${correct}.`,
    ),
    but: tri(
      `But показывает поворот или контраст. Здесь связь другая, нужен ${correct}.`,
      `But показує поворот або контраст. Тут звʼязок iнший, потрiбен ${correct}.`,
      `But shows contrast. Here the logic needs ${correct}.`,
    ),
    because: tri(
      `Because объясняет причину. Здесь нужна другая связь: ${correct}.`,
      `Because пояснює причину. Тут потрiбен iнший звʼязок: ${correct}.`,
      `Because explains the reason. Here the logic needs ${correct}.`,
    ),
    so: tri(
      `So показывает результат. Здесь нужна другая связь: ${correct}.`,
      `So показує результат. Тут потрiбен iнший звʼязок: ${correct}.`,
      `So shows the result. Here the logic needs ${correct}.`,
    ),
    if: tri(
      `If ставит условие. Здесь нужна другая связь: ${correct}.`,
      `If ставить умову. Тут потрiбен iнший звʼязок: ${correct}.`,
      `If sets a condition. Here the logic needs ${correct}.`,
    ),
    If: tri(
      `If звучит как условие. Здесь нужен ${correct}.`,
      `If звучить як умова. Тут потрiбен ${correct}.`,
      `If sounds like a condition. Here we need ${correct}.`,
    ),
    when: tri(
      `When говорит о моменте времени. Здесь нужна другая связь: ${correct}.`,
      `When говорить про момент часу. Тут потрiбен iнший звʼязок: ${correct}.`,
      `When points to time. Here the logic needs ${correct}.`,
    ),
    When: tri(
      `When говорит о времени. Здесь нужен ${correct}.`,
      `When говорить про час. Тут потрiбен ${correct}.`,
      `When points to time. Here we need ${correct}.`,
    ),
    although: tri(
      `Although значит "хотя": есть препятствие, но действие все равно происходит. Здесь нужен ${correct}.`,
      `Although означає "хоча": є перешкода, але дiя все одно вiдбувається. Тут потрiбен ${correct}.`,
      `Although means "although": something gets in the way, but the action still happens. Here we need ${correct}.`,
    ),
    Although: tri(
      `Although значит "хотя". Здесь нужен ${correct}.`,
      `Although означає "хоча". Тут потрiбен ${correct}.`,
      `Although means "although". Here we need ${correct}.`,
    ),
  };
}

function retry(clue: TriText, finalHint: TriText): [TriText, TriText, TriText, TriText] {
  return [
    clue,
    tri(
      'Смотри не на одно слово, а на связь между двумя частями: добавление, поворот, причина, результат, условие, время или "хотя".',
      'Дивись не на одне слово, а на звʼязок мiж двома частинами: додавання, поворот, причина, результат, умова, час або "хоча".',
      'Look at the link between the two parts: addition, contrast, reason, result, condition, time, or although.',
    ),
    finalHint,
    tri(
      'Если можешь задать вопрос "почему?", часто нужен because. Если видишь последствие, часто нужен so.',
      'Якщо можеш поставити питання "чому?", часто потрiбен because. Якщо бачиш наслiдок, часто потрiбен so.',
      'If it answers why, use because. If it shows what happened next, use so.',
    ),
  ];
}

function makeStep(input: {
  id: string;
  order: number;
  difficulty: DiagnosisTrainingStep['difficulty'];
  targetSkill: string;
  sentence: string;
  translation: TriText;
  options: string[];
  correctAnswer: string;
  correctFeedback: TriText;
  wrong?: Record<string, TriText>;
  clue: TriText;
  finalHint: TriText;
  focusWords: string[];
}): DiagnosisTrainingStep {
  const fallbackWrong = defaultWrong(input.correctAnswer);

  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: input.translation,
    explanationBlock: tri(
      'Союз в английском - это не украшение. Он показывает, как две части связаны: "и", "но", "потому что", "поэтому", "если", "когда" или "хотя".',
      'Сполучник в англiйськiй - це не прикраса. Вiн показує, як двi частини повʼязанi: "i", "але", "тому що", "тому", "якщо", "коли" або "хоча".',
      'A connector shows how two parts are linked: and, but, because, so, if, when, or although.',
    ),
    microTask: tri(
      'Выбери слово по логике между двумя частями.',
      'Обери слово за логiкою мiж двома частинами.',
      'Choose the connector by the logic between the two parts.',
    ),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(
      input.options
        .filter((option) => option !== input.correctAnswer)
        .map((option) => [
          option,
          input.wrong?.[option] ??
            fallbackWrong[option] ??
            tri(
              `Почти, но связь другая. Здесь нужен ${input.correctAnswer}.`,
              `Майже, але звʼязок iнший. Тут потрiбен ${input.correctAnswer}.`,
              `Almost. The link needs ${input.correctAnswer}.`,
            ),
        ]),
    ),
    retryFeedback: retry(input.clue, input.finalHint),
    fallbackExplanation: tri(
      'Карта: and добавляет, but разворачивает, because объясняет причину, so показывает результат, if ставит условие, when говорит о времени, although значит "хотя".',
      'Карта: and додає, but розвертає, because пояснює причину, so показує результат, if ставить умову, when говорить про час, although означає "хоча".',
      'Map: and adds, but contrasts, because gives the reason, so gives the result, if gives a condition, when gives time, although means although.',
    ),
    focusWords: input.focusWords,
  };
}

export const CONJUNCTION_LOGIC_TRAINING: DiagnosisTraining = {
  id: 'conjunction_logic',
  category: 'conjunction',
  version: '1.0.0',
  status: 'active',
  priority: 16,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri(
    'And / But / Because / So / If / When: как не ломать связь',
    'And / But / Because / So / If / When: як не ламати звʼязок',
    'And / But / Because / So / If / When',
  ),
  shortTitle: tri('Connector Logic', 'Connector Logic', 'Connector Logic'),
  shortDiagnosis: tri(
    'Ты выбираешь and, but, because, so, if, when и although по переводу, а нужно выбирать по связи между мыслями.',
    'Ти обираєш and, but, because, so, if, when i although за перекладом, а треба обирати за звʼязком мiж думками.',
    'You choose connectors by translation, but you need to choose them by logic.',
  ),
  diagnosisText: tri(
    'В русском можно долго держать связь на интонации. В английском часто нужно прямо показать, что происходит между двумя частями: ты добавляешь мысль, споришь с ожиданием, объясняешь причину, показываешь результат, ставишь условие или говоришь о времени.',
    'Українською можна довго тримати звʼязок на iнтонацiї. В англiйськiй часто треба прямо показати, що вiдбувається мiж двома частинами: ти додаєш думку, йдеш проти очiкування, пояснюєш причину, показуєш результат, ставиш умову або говориш про час.',
    'In English, the connector often has to show the relationship directly: addition, contrast, reason, result, condition, or time.',
  ),
  mentalModel: tri(
    'Не спрашивай "как переводится это слово?". Спроси: "что делает вторая часть?". Добавляет - and. Поворачивает - but. Объясняет причину - because. Показывает результат - so. Ставит условие - if. Называет момент - when. Идет через препятствие - although.',
    'Не питай "як перекладається це слово?". Запитай: "що робить друга частина?". Додає - and. Повертає - but. Пояснює причину - because. Показує результат - so. Ставить умову - if. Називає момент - when. Iде через перешкоду - although.',
    'Ask what the second part does: adds, contrasts, explains why, shows a result, sets a condition, names a time, or goes against an obstacle.',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'and = еще одна мысль. but = поворот. because = причина. so = результат. if = условие. when = время. although = хотя, вопреки препятствию.',
    'and = ще одна думка. but = поворот. because = причина. so = результат. if = умова. when = час. although = хоча, попри перешкоду.',
    'and = addition. but = contrast. because = reason. so = result. if = condition. when = time. although = although / despite.',
  ),
  whatUserMustLearn: {
    ru: [
      'And соединяет две похожие или последовательные мысли.',
      'But показывает поворот: ожидали одно, а произошло другое.',
      'Because отвечает на вопрос "почему?".',
      'So показывает результат: что случилось из-за первой части.',
      'If ставит условие: может случиться, а может нет.',
      'When говорит о времени или моменте.',
      'Although значит "хотя": препятствие есть, но действие происходит.',
      'Because и so нельзя менять местами: причина и результат идут в разные стороны.',
    ],
    uk: [
      'And зʼєднує двi схожi або послiдовнi думки.',
      'But показує поворот: очiкували одне, а сталося iнше.',
      'Because вiдповiдає на питання "чому?".',
      'So показує результат: що сталося через першу частину.',
      'If ставить умову: може статися, а може нi.',
      'When говорить про час або момент.',
      'Although означає "хоча": перешкода є, але дiя вiдбувається.',
      'Because i so не можна мiняти мiсцями: причина i результат iдуть у рiзнi боки.',
    ],
    es: [
      'And connects two similar or sequential ideas.',
      'But shows contrast.',
      'Because answers why.',
      'So shows the result.',
      'If gives a condition.',
      'When points to time.',
      'Although means although / despite.',
      'Because and so go in opposite directions.',
    ],
  },
  examples: [
    {
      en: 'I came home and made dinner.',
      ru: 'Я пришел домой и приготовил ужин.',
      uk: 'Я прийшов додому i приготував вечерю.',
      es: 'Llegue a casa e hice la cena.',
      why: tri('Два действия добавляются друг к другу: and.', 'Двi дiї додаються одна до одної: and.', 'Two actions are added: and.'),
    },
    {
      en: 'I was tired, but I kept working.',
      ru: 'Я устал, но продолжил работать.',
      uk: 'Я втомився, але продовжив працювати.',
      es: 'Estaba cansado, pero segui trabajando.',
      why: tri('Вторая часть идет против ожидания: but.', 'Друга частина йде проти очiкування: but.', 'The second part goes against expectation: but.'),
    },
    {
      en: 'I stayed home because I was sick.',
      ru: 'Я остался дома, потому что болел.',
      uk: 'Я залишився вдома, тому що хворiв.',
      es: 'Me quede en casa porque estaba enfermo.',
      why: tri('I was sick объясняет причину: because.', 'I was sick пояснює причину: because.', 'I was sick gives the reason: because.'),
    },
    {
      en: 'I was sick, so I stayed home.',
      ru: 'Я болел, поэтому остался дома.',
      uk: 'Я хворiв, тому залишився вдома.',
      es: 'Estaba enfermo, asi que me quede en casa.',
      why: tri('I stayed home - результат: so.', 'I stayed home - результат: so.', 'I stayed home is the result: so.'),
    },
    {
      en: 'If it rains, we will stay inside.',
      ru: 'Если пойдет дождь, мы останемся внутри.',
      uk: 'Якщо пiде дощ, ми залишимося всерединi.',
      es: 'Si llueve, nos quedaremos dentro.',
      why: tri('Дождь может быть, а может нет: if.', 'Дощ може бути, а може нi: if.', 'Rain may or may not happen: if.'),
    },
    {
      en: 'When I get home, I will call you.',
      ru: 'Когда я приду домой, я позвоню тебе.',
      uk: 'Коли я прийду додому, я подзвоню тобi.',
      es: 'Cuando llegue a casa, te llamare.',
      why: tri('Это момент времени: when.', 'Це момент часу: when.', 'This is a time point: when.'),
    },
    {
      en: 'Although it was expensive, I bought it.',
      ru: 'Хотя это было дорого, я купил это.',
      uk: 'Хоча це було дорого, я купив це.',
      es: 'Aunque era caro, lo compre.',
      why: tri('Цена мешала, но действие произошло: although.', 'Цiна заважала, але дiя вiдбулася: although.', 'The price was an obstacle, but the action happened: although.'),
    },
  ],
  introBlocks: [
    {
      id: 'intro_problem',
      type: 'diagnosis',
      text: tri(
        'Если выбрать союз только по переводу, фраза может сказать не то: причину вместо результата, условие вместо времени, добавление вместо поворота.',
        'Якщо обрати сполучник лише за перекладом, фраза може сказати не те: причину замiсть результату, умову замiсть часу, додавання замiсть повороту.',
        'If you choose by translation only, the sentence can say the wrong thing.',
      ),
    },
    {
      id: 'intro_rule',
      type: 'rule',
      text: tri(
        'Сначала назови связь между частями. Потом выбирай слово.',
        'Спочатку назви звʼязок мiж частинами. Потiм обирай слово.',
        'Name the relationship first. Then choose the connector.',
      ),
    },
    {
      id: 'intro_warning',
      type: 'warning',
      text: tri(
        'Самая частая ловушка: because - причина, so - результат. Они смотрят в разные стороны.',
        'Найчастiша пастка: because - причина, so - результат. Вони дивляться у рiзнi боки.',
        'Common trap: because is the reason, so is the result.',
      ),
    },
  ],
  steps: [
    makeStep({
      id: 'conj_easy_001',
      order: 1,
      difficulty: 'easy',
      targetSkill: 'addition_and',
      sentence: 'I came home ___ made dinner.',
      translation: tri('Я пришел домой и приготовил ужин.', 'Я прийшов додому i приготував вечерю.', 'I came home and made dinner.'),
      options: ['and', 'but', 'because', 'although'],
      correctAnswer: 'and',
      correctFeedback: tri('Да. Два действия просто идут рядом: and.', 'Так. Двi дiї просто йдуть поруч: and.', 'Yes. Two actions are added: and.'),
      clue: tri('Домой пришел. Ужин приготовил. Это добавление: and.', 'Додому прийшов. Вечерю приготував. Це додавання: and.', 'Action plus action: and.'),
      finalHint: tri('Фраза: I came home and made dinner.', 'Фраза: I came home and made dinner.', 'Sentence: I came home and made dinner.'),
      focusWords: ['and'],
    }),
    makeStep({
      id: 'conj_easy_002',
      order: 2,
      difficulty: 'easy',
      targetSkill: 'contrast_but',
      sentence: 'I was tired, ___ I kept working.',
      translation: tri('Я устал, но продолжил работать.', 'Я втомився, але продовжив працювати.', 'I was tired, but I kept working.'),
      options: ['and', 'but', 'because', 'so'],
      correctAnswer: 'but',
      correctFeedback: tri('Да. Устал - ожидали остановку, но работа продолжилась: but.', 'Так. Втомився - очiкували зупинку, але робота продовжилась: but.', 'Yes. Expected stop, but continued: but.'),
      clue: tri('Вторая часть идет против ожидания.', 'Друга частина йде проти очiкування.', 'The second part goes against expectation.'),
      finalHint: tri('Фраза: I was tired, but I kept working.', 'Фраза: I was tired, but I kept working.', 'Sentence: I was tired, but I kept working.'),
      focusWords: ['but', 'tired'],
    }),
    makeStep({
      id: 'conj_easy_003',
      order: 3,
      difficulty: 'easy',
      targetSkill: 'addition_and_sequence',
      sentence: 'She opened the app ___ started the lesson.',
      translation: tri('Она открыла приложение и начала урок.', 'Вона вiдкрила застосунок i почала урок.', 'She opened the app and started the lesson.'),
      options: ['and', 'but', 'so', 'if'],
      correctAnswer: 'and',
      correctFeedback: tri('Да. Два последовательных действия: and.', 'Так. Двi послiдовнi дiї: and.', 'Yes. Two actions in sequence: and.'),
      clue: tri('Открыла приложение, начала урок. Просто добавляем действие.', 'Вiдкрила застосунок, почала урок. Просто додаємо дiю.', 'Two actions in sequence.'),
      finalHint: tri('Сначала одно действие, потом второе. Здесь нужна простая связка добавления: and.', 'Спочатку одна дія, потім друга. Тут потрібна проста звʼязка додавання: and.', 'Sentence: She opened the app and started the lesson.'),
      focusWords: ['and'],
    }),
    makeStep({
      id: 'conj_contrast_001',
      order: 4,
      difficulty: 'contrast',
      targetSkill: 'cause_because',
      sentence: 'I stayed home ___ I was sick.',
      translation: tri('Я остался дома, потому что болел.', 'Я залишився вдома, тому що хворiв.', 'I stayed home because I was sick.'),
      options: ['because', 'so', 'but', 'if'],
      correctAnswer: 'because',
      correctFeedback: tri('Да. I was sick объясняет почему: because.', 'Так. I was sick пояснює чому: because.', 'Yes. I was sick explains why: because.'),
      wrong: {
        so: tri('So показывает результат, а здесь после пропуска стоит причина. Нужен because.', 'So показує результат, а тут пiсля пропуску стоїть причина. Потрiбен because.', 'So shows a result. Here we need the reason: because.'),
      },
      clue: tri('После пропуска идет причина: почему остался дома?', 'Пiсля пропуску йде причина: чому залишився вдома?', 'After the blank comes the reason.'),
      finalHint: tri('Фраза: I stayed home because I was sick.', 'Фраза: I stayed home because I was sick.', 'Sentence: I stayed home because I was sick.'),
      focusWords: ['because', 'sick'],
    }),
    makeStep({
      id: 'conj_contrast_002',
      order: 5,
      difficulty: 'contrast',
      targetSkill: 'result_so',
      sentence: 'I was sick, ___ I stayed home.',
      translation: tri('Я болел, поэтому остался дома.', 'Я хворiв, тому залишився вдома.', 'I was sick, so I stayed home.'),
      options: ['because', 'so', 'but', 'although'],
      correctAnswer: 'so',
      correctFeedback: tri('Да. Stayed home - результат болезни: so.', 'Так. Stayed home - результат хвороби: so.', 'Yes. Stayed home is the result: so.'),
      wrong: {
        because: tri('Because вводит причину. Здесь причина уже есть: I was sick. Дальше идет результат, нужен so.', 'Because вводить причину. Тут причина вже є: I was sick. Далi йде результат, потрiбен so.', 'Because introduces a reason. Here the result needs so.'),
      },
      clue: tri('Сначала причина, потом результат.', 'Спочатку причина, потiм результат.', 'Reason first, result second.'),
      finalHint: tri('Фраза: I was sick, so I stayed home.', 'Фраза: I was sick, so I stayed home.', 'Sentence: I was sick, so I stayed home.'),
      focusWords: ['so', 'sick'],
    }),
    makeStep({
      id: 'conj_contrast_003',
      order: 6,
      difficulty: 'contrast',
      targetSkill: 'because_so_direction',
      sentence: 'Choose the correct pair.',
      translation: tri('Выбери пару, где причина и результат стоят нормально.', 'Обери пару, де причина i результат стоять нормально.', 'Choose the pair with the reason and result in the right direction.'),
      options: [
        'I left because I was tired / I was tired, so I left',
        'I left so I was tired / I was tired because I left',
        'I left but I was tired / I was tired although I left',
        'I left if I was tired / I was tired when I left',
      ],
      correctAnswer: 'I left because I was tired / I was tired, so I left',
      correctFeedback: tri('Да. Because ведет к причине, so ведет к результату.', 'Так. Because веде до причини, so веде до результату.', 'Yes. Because points to the reason, so points to the result.'),
      clue: tri('Усталость - причина. Ушел - результат.', 'Втома - причина. Пiшов - результат.', 'Tired is the reason. Left is the result.'),
      finalHint: tri('Проверь направление: because ведет к причине, а so ведет к результату.', 'Перевір напрямок: because веде до причини, а so веде до результату.', 'Answer: I left because I was tired / I was tired, so I left.'),
      focusWords: ['because', 'so'],
    }),
    makeStep({
      id: 'conj_contrast_004',
      order: 7,
      difficulty: 'contrast',
      targetSkill: 'condition_if',
      sentence: '___ it rains, we will stay inside.',
      translation: tri('Если пойдет дождь, мы останемся внутри.', 'Якщо пiде дощ, ми залишимося всерединi.', 'If it rains, we will stay inside.'),
      options: ['If', 'When', 'Because', 'Although'],
      correctAnswer: 'If',
      correctFeedback: tri('Да. Дождь может быть, а может нет: If.', 'Так. Дощ може бути, а може нi: If.', 'Yes. Rain may or may not happen: If.'),
      wrong: {
        When: tri('When звучит как момент, которого мы ждем. Здесь условие: если пойдет дождь. Нужен If.', 'When звучить як момент, якого ми чекаємо. Тут умова: якщо пiде дощ. Потрiбен If.', 'When sounds like a time point. Here it is a condition: If.'),
      },
      clue: tri('Дождь может случиться, а может нет.', 'Дощ може статися, а може нi.', 'It may rain or not.'),
      finalHint: tri('Дождь может случиться, а может нет. Это условие, поэтому нужна связка If.', 'Дощ може статися, а може ні. Це умова, тому потрібна звʼязка If.', 'Sentence: If it rains, we will stay inside.'),
      focusWords: ['if', 'rains'],
    }),
    makeStep({
      id: 'conj_contrast_005',
      order: 8,
      difficulty: 'contrast',
      targetSkill: 'time_when',
      sentence: '___ I get home, I will call you.',
      translation: tri('Когда я приду домой, я позвоню тебе.', 'Коли я прийду додому, я подзвоню тобi.', 'When I get home, I will call you.'),
      options: ['If', 'When', 'Because', 'So'],
      correctAnswer: 'When',
      correctFeedback: tri('Да. Речь о моменте времени: when.', 'Так. Йдеться про момент часу: when.', 'Yes. It is a time point: when.'),
      wrong: {
        If: tri('If звучит так, будто ты сомневаешься, попадешь ли домой. Здесь обычный момент времени, нужен when.', 'If звучить так, нiби ти сумнiваєшся, чи потрапиш додому. Тут звичайний момент часу, потрiбен when.', 'If sounds like doubt. Here we need the time connector: when.'),
      },
      clue: tri('Не условие, а момент: когда приду домой.', 'Не умова, а момент: коли прийду додому.', 'Not a condition, a time point.'),
      finalHint: tri('Фраза: When I get home, I will call you.', 'Фраза: When I get home, I will call you.', 'Sentence: When I get home, I will call you.'),
      focusWords: ['when'],
    }),
    makeStep({
      id: 'conj_contrast_006',
      order: 9,
      difficulty: 'contrast',
      targetSkill: 'if_when_difference',
      sentence: 'Choose the correct pair.',
      translation: tri('Выбери пару с правильной логикой.', 'Обери пару з правильною логiкою.', 'Choose the pair with the right logic.'),
      options: [
        'If it rains, I will stay home / When I get home, I will call you',
        'When it rains, I will stay home / If I get home, I will call you',
        'Because it rains, I will stay home / So I get home, I will call you',
        'Although it rains, I will stay home / But I get home, I will call you',
      ],
      correctAnswer: 'If it rains, I will stay home / When I get home, I will call you',
      correctFeedback: tri('Да. If - возможное условие. When - момент времени.', 'Так. If - можлива умова. When - момент часу.', 'Yes. If is a possible condition. When is a time point.'),
      clue: tri('Дождь может быть или нет. Возвращение домой - момент.', 'Дощ може бути або нi. Повернення додому - момент.', 'Rain is possible; getting home is a time point.'),
      finalHint: tri('Дождь может случиться или нет: if. Возвращение домой здесь как момент времени: when.', 'Дощ може статися або ні: if. Повернення додому тут як момент часу: when.', 'Answer: If it rains, I will stay home / When I get home, I will call you.'),
      focusWords: ['if', 'when'],
    }),
    makeStep({
      id: 'conj_mixed_001',
      order: 10,
      difficulty: 'mixed',
      targetSkill: 'although_concession',
      sentence: '___ it was expensive, I bought it.',
      translation: tri('Хотя это было дорого, я купил это.', 'Хоча це було дорого, я купив це.', 'Although it was expensive, I bought it.'),
      options: ['Although', 'Because', 'So', 'And'],
      correctAnswer: 'Although',
      correctFeedback: tri('Да. Цена мешала, но покупка все равно случилась: Although.', 'Так. Цiна заважала, але покупка все одно сталася: Although.', 'Yes. The price was an obstacle, but the action happened: Although.'),
      clue: tri('"Хотя было дорого" = Although it was expensive.', '"Хоча було дорого" = Although it was expensive.', 'Although it was expensive.'),
      finalHint: tri('Цена мешала, но покупка всё равно произошла. Для такой связи нужен although.', 'Ціна заважала, але покупка все одно сталася. Для такого звʼязку потрібен although.', 'Sentence: Although it was expensive, I bought it.'),
      focusWords: ['although'],
    }),
    makeStep({
      id: 'conj_mixed_002',
      order: 11,
      difficulty: 'mixed',
      targetSkill: 'but_contrast',
      sentence: 'It was expensive, ___ I bought it.',
      translation: tri('Это было дорого, но я купил это.', 'Це було дорого, але я купив це.', 'It was expensive, but I bought it.'),
      options: ['but', 'because', 'so', 'if'],
      correctAnswer: 'but',
      correctFeedback: tri('Да. Дорого, но купил: but.', 'Так. Дорого, але купив: but.', 'Yes. Expensive, but bought it: but.'),
      clue: tri('Две части конфликтуют: дорого, но купил.', 'Двi частини конфлiктують: дорого, але купив.', 'The two parts contrast.'),
      finalHint: tri('Фраза: It was expensive, but I bought it.', 'Фраза: It was expensive, but I bought it.', 'Sentence: It was expensive, but I bought it.'),
      focusWords: ['but'],
    }),
    makeStep({
      id: 'conj_mixed_003',
      order: 12,
      difficulty: 'mixed',
      targetSkill: 'although_but_structure',
      sentence: 'Choose the correct pair.',
      translation: tri('Выбери две естественные версии.', 'Обери двi природнi версiї.', 'Choose two natural versions.'),
      options: [
        'Although I was tired, I kept working / I was tired, but I kept working',
        'But I was tired, I kept working / I was tired, although I kept working',
        'Because I was tired, I kept working / I was tired, so I kept working',
        'If I was tired, I kept working / I was tired, when I kept working',
      ],
      correctAnswer: 'Although I was tired, I kept working / I was tired, but I kept working',
      correctFeedback: tri('Да. Although открывает препятствие. But ставится между двумя частями.', 'Так. Although вiдкриває перешкоду. But стоїть мiж двома частинами.', 'Yes. Although opens the obstacle; but sits between the two parts.'),
      clue: tri('Обе версии говорят: устал, но продолжил.', 'Обидвi версiї кажуть: втомився, але продовжив.', 'Both mean: tired, but continued.'),
      finalHint: tri('Обе версии держат один смысл: усталость мешала, но действие продолжилось.', 'Обидві версії тримають один зміст: втома заважала, але дія продовжилась.', 'Answer: Although I was tired, I kept working / I was tired, but I kept working.'),
      focusWords: ['although', 'but'],
    }),
    makeStep({
      id: 'conj_mixed_004',
      order: 13,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_logic_choice',
      sentence: "I wanted to help, ___ I didn't know what to do.",
      translation: tri('Я хотел помочь, но не знал, что делать.', 'Я хотiв допомогти, але не знав, що робити.', "I wanted to help, but I didn't know what to do."),
      options: ['and', 'but', 'because', 'so'],
      correctAnswer: 'but',
      correctFeedback: tri('Да. Хотел помочь, но была проблема: but.', 'Так. Хотiв допомогти, але була проблема: but.', 'Yes. Wanted to help, but there was a problem: but.'),
      clue: tri('Желание помочь сталкивается с проблемой.', 'Бажання допомогти стикається з проблемою.', 'The wish meets a problem.'),
      finalHint: tri('Желание помочь сталкивается с проблемой. Это поворот, поэтому нужна связка but.', 'Бажання допомогти стикається з проблемою. Це поворот, тому потрібна звʼязка but.', "Sentence: I wanted to help, but I didn't know what to do."),
      focusWords: ['but'],
    }),
    makeStep({
      id: 'conj_mixed_005',
      order: 14,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_cause_result_condition',
      sentence: '___ you need help, call me.',
      translation: tri('Если тебе нужна помощь, позвони мне.', 'Якщо тобi потрiбна допомога, подзвони менi.', 'If you need help, call me.'),
      options: ['If', 'Because', 'So', 'But'],
      correctAnswer: 'If',
      correctFeedback: tri('Да. Нужна помощь? Тогда позвони. Это условие: If.', 'Так. Потрiбна допомога? Тодi подзвони. Це умова: If.', 'Yes. Need help? Then call me: If.'),
      clue: tri('Фраза работает как условие.', 'Фраза працює як умова.', 'This is a condition.'),
      finalHint: tri('Фраза: If you need help, call me.', 'Фраза: If you need help, call me.', 'Sentence: If you need help, call me.'),
      focusWords: ['if'],
    }),
    makeStep({
      id: 'conj_mixed_006',
      order: 15,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_sentence_correction',
      sentence: 'Choose the correct sentence.',
      translation: tri('Выбери естественное предложение.', 'Обери природне речення.', 'Choose the natural sentence.'),
      options: [
        'I was tired, but I finished the work because it was important.',
        'I was tired, because I finished the work but it was important.',
        'I was tired, so it was important although I finished the work.',
        'I was tired, if I finished the work because it was important.',
      ],
      correctAnswer: 'I was tired, but I finished the work because it was important.',
      correctFeedback: tri('Да. But показывает поворот: tired but finished. Because объясняет причину: it was important.', 'Так. But показує поворот: tired but finished. Because пояснює причину: it was important.', 'Yes. But shows contrast; because gives the reason.'),
      clue: tri('Устал, но закончил. Закончил, потому что это было важно.', 'Втомився, але закiнчив. Закiнчив, тому що це було важливо.', 'Tired but finished. Finished because it was important.'),
      finalHint: tri('Собери две связи: устал, но закончил; закончил, потому что это было важно.', 'Збери два звʼязки: втомився, але закінчив; закінчив, тому що це було важливо.', 'Sentence: I was tired, but I finished the work because it was important.'),
      focusWords: ['but', 'because'],
    }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'because_so_confusion',
      'and_but_confusion',
      'if_when_confusion',
      'although_but_confusion',
      'wrong_connector_logic',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri(
      'Показываем связь между двумя частями.',
      'Показуємо звʼязок мiж двома частинами.',
      'Show the link between the two parts.',
    ),
    depth2: tri(
      'Проще: причина, результат, поворот, условие или время?',
      'Простiше: причина, результат, поворот, умова чи час?',
      'Simpler: reason, result, contrast, condition, or time?',
    ),
    depth3: tri(
      'Готовые пары: because = почему, so = поэтому, but = но.',
      'Готовi пари: because = чому, so = тому, but = але.',
      'Ready pairs: because = why, so = result, but = contrast.',
    ),
    depth4: tri(
      'Почти подсказка: прямо показываем нужную связь.',
      'Майже пiдказка: прямо показуємо потрiбний звʼязок.',
      'Near answer: show the needed link.',
    ),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        'Не переводи союз отдельно. Смотри на связь: and добавляет, but разворачивает, because объясняет, so показывает результат, if ставит условие, when дает время, although значит "хотя".',
        'Не перекладай сполучник окремо. Дивись на звʼязок: and додає, but розвертає, because пояснює, so показує результат, if ставить умову, when дає час, although означає "хоча".',
        'Do not translate the connector alone. Look at the link between the clauses.',
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_logic_type_hint_then_retry',
      card: tri(
        'Система покажет тип связи, но не выберет слово за пользователя.',
        'Система покаже тип звʼязку, але не обере слово за користувача.',
        'The system shows the link type, but does not choose the connector for the user.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        'Режим подсказки: сначала выбираем связь, потом возвращаемся к полной фразе.',
        'Режим пiдказки: спочатку обираємо звʼязок, потiм повертаємося до повної фрази.',
        'Guided mode: choose the link, then return to the sentence.',
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      {
        id: 'guided_conj_001',
        prompt: tri('I was tired, ___ I kept working: вторая часть добавляет или спорит с ожиданием?', 'I was tired, ___ I kept working: друга частина додає чи йде проти очiкування?', 'I was tired, ___ I kept working: addition or contrast?'),
        options: ['добавляет', 'спорит с ожиданием'],
        correctIndex: 1,
        thenReturnToExerciseId: 'conj_easy_002',
      },
      {
        id: 'guided_conj_002',
        prompt: tri('I stayed home ___ I was sick: I was sick - причина или результат?', 'I stayed home ___ I was sick: I was sick - причина чи результат?', 'I stayed home ___ I was sick: reason or result?'),
        options: ['причина', 'результат'],
        correctIndex: 0,
        thenReturnToExerciseId: 'conj_contrast_001',
      },
      {
        id: 'guided_conj_003',
        prompt: tri('I was sick, ___ I stayed home: I stayed home - причина или результат?', 'I was sick, ___ I stayed home: I stayed home - причина чи результат?', 'I was sick, ___ I stayed home: reason or result?'),
        options: ['причина', 'результат'],
        correctIndex: 1,
        thenReturnToExerciseId: 'conj_contrast_002',
      },
      {
        id: 'guided_conj_004',
        prompt: tri('When I get home - это условие или момент времени?', 'When I get home - це умова чи момент часу?', 'When I get home - condition or time point?'),
        options: ['условие', 'момент времени'],
        correctIndex: 1,
        thenReturnToExerciseId: 'conj_contrast_005',
      },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'conjunction',
    microDiagnosisId: 'conjunction_logic',
    diagnosisLabel: tri('Логика союзов', 'Логiка сполучникiв', 'Connector logic'),
    contrastSet: CONTRAST,
    difficultyLevel: 2,
    focusWords: ['and', 'but', 'because', 'so', 'if', 'when', 'although'],
    focusPatterns: [
      'addition_and',
      'contrast_but',
      'cause_because',
      'result_so',
      'because_so_direction',
      'condition_if',
      'time_when',
      'if_when_difference',
      'although_concession',
      'although_but_structure',
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
    start: 'diagnosis_training_conjunction_logic_start',
    answer: 'diagnosis_training_conjunction_logic_answer',
    mastery: 'diagnosis_training_conjunction_logic_mastery',
    fallback: 'diagnosis_training_conjunction_logic_fallback',
    smartTrainerUnlocked: 'diagnosis_training_conjunction_logic_smart_trainer_unlocked',
    payload: {
      category: 'conjunction',
      microDiagnosisId: 'conjunction_logic',
      contrastSet: CONTRAST,
      priority: 16,
    },
  },
  routing: {
    appScreen: 'ProblemCoach',
    webPath: '/problem-coach/conjunction/logic',
    deepLink: 'phraseman://problem-coach/conjunction/logic',
    diagnosisTrainerRoute: '/problem_coach?category=conjunction&microDiagnosisId=conjunction_logic',
    smartTrainerRoute: '/smart_trainer?source=diagnosis_training&microDiagnosisId=conjunction_logic',
  },
  qualityChecklist: {
    hasContrastiveMinimalPairs: true,
    hasDistractorSpecificFeedback: true,
    hasNegativeTransferWarning: true,
    hasMicroDiagnosis: true,
    hasAdaptiveFeedback: true,
    hasSmartTrainerUnlock: true,
  },
};
