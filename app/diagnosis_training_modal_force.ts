import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk: string, es: string): TriText => ({ ru, uk, es });

const CONTRAST = [
  'can',
  'could',
  'should',
  'must',
  'have to',
  "mustn't",
  "don't have to",
  'may',
  'might',
];

function modalForceStep(input: {
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
  retry: [TriText, TriText, TriText];
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
      'Сначала выбери силу смысла: можно, вежливая просьба, совет, обязанность, запрет, не обязательно или возможно.',
      'Спочатку обери силу сенсу: можна, ввічливе прохання, порада, обовʼязок, заборона, не обовʼязково або можливо.',
      'Primero elige la fuerza: permiso, petición amable, consejo, obligación, prohibición, no obligación o posibilidad.',
    ),
    microTask: tri(
      'Выбери слово или короткий блок с нужной силой.',
      'Обери слово або короткий блок із потрібною силою.',
      'Elige la palabra o bloque corto con la fuerza correcta.',
    ),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? tri(
        `${option} дает другую силу. Здесь нужен смысл "${input.correctAnswer}".`,
        `${option} дає іншу силу. Тут потрібен сенс "${input.correctAnswer}".`,
        `${option} da otra fuerza. Aquí necesitamos "${input.correctAnswer}".`,
      )])),
    retryFeedback: [
      input.retry[0],
      input.retry[1],
      input.retry[2],
      tri(
        `Подсказка: здесь подходит "${input.correctAnswer}".`,
        `Підказка: тут підходить "${input.correctAnswer}".`,
        `Pista: aquí encaja "${input.correctAnswer}".`,
      ),
    ],
    fallbackExplanation: tri(
      'Сравни смысл: can = можно или умею, should = стоит, must/have to = надо, must not = запрещено, do not have to = не обязательно, may/might = возможно.',
      'Порівняй сенс: can = можна або вмію, should = варто, must/have to = треба, must not = заборонено, do not have to = не обовʼязково, may/might = можливо.',
      'Compara el sentido: can = permiso o habilidad, should = consejo, must/have to = obligación, must not = prohibición, do not have to = no obligación, may/might = posibilidad.',
    ),
    focusWords: input.focusWords,
  };
}

export const MODAL_FORCE_TRAINING: DiagnosisTraining = {
  id: 'modal_force',
  category: 'modal',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 38,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri(
    'Can / Should / Must: выбираем силу',
    'Can / Should / Must: обираємо силу',
    'Can / Should / Must: elegir la fuerza',
  ),
  shortTitle: tri('Сила модального слова', 'Сила модального слова', 'Fuerza modal'),
  shortDiagnosis: tri(
    'Ты выбираешь похожее слово, но меняешь силу: можно, стоит, надо или запрещено.',
    'Ти обираєш схоже слово, але змінюєш силу: можна, варто, треба або заборонено.',
    'Eliges una palabra parecida, pero cambias la fuerza: permiso, consejo, obligación o prohibición.',
  ),
  diagnosisText: tri(
    'Ты путаешь смысловую силу can, could, should, must, have to, must not, do not have to, may и might. Проблема не в действии после них, а в том, насколько фраза строгая или мягкая.',
    'Ти плутаєш смислову силу can, could, should, must, have to, must not, do not have to, may і might. Проблема не в дії після них, а в тому, наскільки фраза сувора або мʼяка.',
    'Confundes la fuerza de can, could, should, must, have to, must not, do not have to, may y might. El problema no está en la acción, sino en cuán fuerte o suave es la frase.',
  ),
  mentalModel: tri(
    'Перед ответом спроси: это разрешение, способность, совет, правило, запрет, отсутствие обязанности или вероятность?',
    'Перед відповіддю спитай: це дозвіл, здатність, порада, правило, заборона, відсутність обовʼязку чи ймовірність?',
    'Antes de responder, pregunta: permiso, habilidad, consejo, regla, prohibición, no obligación o probabilidad?',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'Can = можно или умею. Could = мог раньше или вежливая просьба. Should = стоит. Must / have to = надо. Must not = запрещено. Do not have to = не обязательно. May / might = возможно.',
    'Can = можна або вмію. Could = міг раніше або ввічливе прохання. Should = варто. Must / have to = треба. Must not = заборонено. Do not have to = не обовʼязково. May / might = можливо.',
    'Can = permiso o habilidad. Could = habilidad pasada o petición amable. Should = consejo. Must / have to = obligación. Must not = prohibición. Do not have to = no obligación. May / might = posibilidad.',
  ),
  whatUserMustLearn: {
    ru: [
      'Can часто говорит, что можно или человек умеет.',
      'Could делает просьбу мягче или говорит о способности в прошлом.',
      'Should дает совет: стоит сделать, но это не приказ.',
      'Must и have to дают сильное “надо”.',
      'Must not значит запрещено.',
      'Do not have to значит не обязательно, но можно.',
      'May и might говорят о возможности, а не о правиле.',
    ],
    uk: [
      'Can часто каже, що можна або людина вміє.',
      'Could робить прохання мʼякшим або говорить про здатність у минулому.',
      'Should дає пораду: варто зробити, але це не наказ.',
      'Must і have to дають сильне “треба”.',
      'Must not означає заборонено.',
      'Do not have to означає не обовʼязково, але можна.',
      'May і might говорять про можливість, а не про правило.',
    ],
    es: [
      'Can suele expresar permiso o habilidad.',
      'Could hace una petición más amable o habla de habilidad pasada.',
      'Should da un consejo, no una orden.',
      'Must y have to expresan obligación fuerte.',
      'Must not expresa prohibición.',
      'Do not have to significa que no es obligatorio.',
      'May y might expresan posibilidad, no una regla.',
    ],
  },
  examples: [
    { en: 'You can sit here.', ru: 'Ты можешь сесть здесь.', uk: 'Ти можеш сісти тут.', es: 'Puedes sentarte aquí.', why: tri('Can дает разрешение.', 'Can дає дозвіл.', 'Can da permiso.') },
    { en: 'Could you open the window?', ru: 'Не мог бы ты открыть окно?', uk: 'Чи не міг би ти відчинити вікно?', es: 'Podrías abrir la ventana?', why: tri('Could делает просьбу вежливее.', 'Could робить прохання ввічливішим.', 'Could hace la petición más amable.') },
    { en: 'You should rest.', ru: 'Тебе стоит отдохнуть.', uk: 'Тобі варто відпочити.', es: 'Deberías descansar.', why: tri('Should звучит как совет.', 'Should звучить як порада.', 'Should suena como consejo.') },
    { en: 'You must wear a helmet.', ru: 'Ты обязан надеть шлем.', uk: 'Ти повинен одягнути шолом.', es: 'Debes llevar casco.', why: tri('Must дает сильное правило.', 'Must дає сильне правило.', 'Must da una regla fuerte.') },
    { en: 'You must not smoke here.', ru: 'Здесь нельзя курить.', uk: 'Тут не можна курити.', es: 'No debes fumar aquí.', why: tri('Must not значит запрещено.', 'Must not означає заборонено.', 'Must not significa prohibición.') },
    { en: "You don't have to come early.", ru: 'Тебе не обязательно приходить рано.', uk: 'Тобі не обовʼязково приходити рано.', es: 'No tienes que venir temprano.', why: tri('Do not have to значит не обязательно.', 'Do not have to означає не обовʼязково.', 'Do not have to significa no obligación.') },
    { en: 'She might be at home.', ru: 'Она, возможно, дома.', uk: 'Вона, можливо, вдома.', es: 'Puede que esté en casa.', why: tri('Might дает вероятность, не правило.', 'Might дає ймовірність, не правило.', 'Might expresa posibilidad, no regla.') },
    { en: 'When I was five, I could swim.', ru: 'Когда мне было пять, я умел плавать.', uk: 'Коли мені було пʼять, я вмів плавати.', es: 'Cuando tenía cinco años, podía nadar.', why: tri('Could здесь про способность в прошлом.', 'Could тут про здатність у минулому.', 'Could aquí habla de habilidad pasada.') },
  ],
  introBlocks: [
    {
      id: 'intro_problem',
      type: 'diagnosis',
      text: tri(
        'Похоже, ты выбираешь похожие слова, но фраза становится слишком строгой, слишком мягкой или вообще меняет смысл.',
        'Схоже, ти обираєш схожі слова, але фраза стає занадто суворою, занадто мʼякою або взагалі змінює сенс.',
        'Parece que eliges palabras parecidas, pero la frase queda demasiado fuerte, demasiado suave o cambia de sentido.',
      ),
    },
    {
      id: 'intro_scale',
      type: 'rule',
      text: tri(
        'Мини-шкала: can = можно, should = стоит, must/have to = надо, must not = запрещено, do not have to = не обязательно.',
        'Міні-шкала: can = можна, should = варто, must/have to = треба, must not = заборонено, do not have to = не обовʼязково.',
        'Escala pequeña: can = permiso, should = consejo, must/have to = obligación, must not = prohibición, do not have to = no obligación.',
      ),
    },
    {
      id: 'intro_probability',
      type: 'contrast',
      text: tri(
        'Отдельно держи may/might: это “возможно”, а не обязанность и не разрешение.',
        'Окремо тримай may/might: це “можливо”, а не обовʼязок і не дозвіл.',
        'Guarda may/might aparte: es posibilidad, no obligación ni permiso.',
      ),
    },
  ],
  steps: [
    modalForceStep({ id: 'modal_force_easy_001', order: 1, difficulty: 'easy', targetSkill: 'can_permission', sentence: 'You ___ sit here. This seat is free.', translation: tri('Ты можешь сесть здесь. Это место свободно.', 'Ти можеш сісти тут. Це місце вільне.', 'Puedes sentarte aquí. Este asiento está libre.'), options: ['can', 'must', 'should', "mustn't"], correctAnswer: 'can', correctFeedback: tri('Да. Здесь разрешение: можно сесть.', 'Так. Тут дозвіл: можна сісти.', 'Sí. Aquí hay permiso.'), wrong: { must: tri('Must звучит как обязанность: ты обязан сесть. Здесь просто разрешение.', 'Must звучить як обовʼязок: ти повинен сісти. Тут просто дозвіл.', 'Must suena como obligación. Aquí solo hay permiso.'), should: tri('Should звучит как совет: тебе стоит сесть. Здесь смысл можно.', 'Should звучить як порада: тобі варто сісти. Тут сенс можна.', 'Should suena como consejo. Aquí necesitamos permiso.'), "mustn't": tri("Mustn't значит запрещено. Это противоположный смысл.", "Mustn't означає заборонено. Це протилежний сенс.", "Mustn't significa prohibición. Es lo contrario.") }, retry: [tri('Нужно мягкое можно.', 'Потрібне мʼяке можна.', 'Necesitamos permiso.'), tri('Можно = can.', 'Можна = can.', 'Permiso = can.'), tri('Подсказка: You can sit here.', 'Підказка: You can sit here.', 'Pista: You can sit here.')], focusWords: ['can'] }),
    modalForceStep({ id: 'modal_force_easy_002', order: 2, difficulty: 'easy', targetSkill: 'should_advice', sentence: 'You ___ rest. You look tired.', translation: tri('Тебе стоит отдохнуть. Ты выглядишь уставшим.', 'Тобі варто відпочити. Ти виглядаєш втомленим.', 'Deberías descansar. Te ves cansado.'), options: ['should', 'must', 'can', "don't have to"], correctAnswer: 'should', correctFeedback: tri('Да. Should дает совет.', 'Так. Should дає пораду.', 'Sí. Should da consejo.'), wrong: { must: tri('Must звучит слишком строго: обязан. Здесь дружеский совет.', 'Must звучить занадто суворо: повинен. Тут дружня порада.', 'Must suena demasiado fuerte. Aquí es consejo.'), can: tri('Can говорит можно или умеешь, но не дает совет.', 'Can каже можна або вмієш, але не дає пораду.', 'Can expresa permiso o habilidad, no consejo.'), "don't have to": tri("Don't have to значит не обязательно. Здесь человеку стоит отдохнуть.", "Don't have to означає не обовʼязково. Тут людині варто відпочити.", "Don't have to significa no obligación. Aquí conviene descansar.") }, retry: [tri('Нужен смысл стоит сделать.', 'Потрібен сенс варто зробити.', 'Necesitamos consejo.'), tri('Совет = should.', 'Порада = should.', 'Consejo = should.'), tri('Подсказка: You should rest.', 'Підказка: You should rest.', 'Pista: You should rest.')], focusWords: ['should'] }),
    modalForceStep({ id: 'modal_force_easy_003', order: 3, difficulty: 'easy', targetSkill: 'must_rule', sentence: 'You ___ wear a helmet here. It is the rule.', translation: tri('Здесь ты обязан надеть шлем. Это правило.', 'Тут ти повинен одягнути шолом. Це правило.', 'Debes llevar casco aquí. Es la regla.'), options: ['must', 'can', 'might', "don't have to"], correctAnswer: 'must', correctFeedback: tri('Да. Must подходит для сильного правила.', 'Так. Must підходить для сильного правила.', 'Sí. Must encaja con una regla fuerte.'), wrong: { can: tri('Can дает разрешение, но не обязательное правило.', 'Can дає дозвіл, але не обовʼязкове правило.', 'Can da permiso, no obligación.'), might: tri('Might значит возможно. Правило требует must.', 'Might означає можливо. Правило вимагає must.', 'Might significa posibilidad. Una regla necesita must.'), "don't have to": tri("Don't have to значит не обязательно. Здесь наоборот обязательно.", "Don't have to означає не обовʼязково. Тут навпаки обовʼязково.", "Don't have to significa no obligación. Aquí sí hay obligación.") }, retry: [tri('Нужно сильное надо.', 'Потрібне сильне треба.', 'Necesitamos obligación fuerte.'), tri('Правило = must.', 'Правило = must.', 'Regla fuerte = must.'), tri('Подсказка: You must wear a helmet.', 'Підказка: You must wear a helmet.', 'Pista: You must wear a helmet.')], focusWords: ['must'] }),
    modalForceStep({ id: 'modal_force_easy_004', order: 4, difficulty: 'easy', targetSkill: 'must_not_prohibition', sentence: 'You ___ smoke here. It is forbidden.', translation: tri('Здесь нельзя курить. Это запрещено.', 'Тут не можна курити. Це заборонено.', 'No debes fumar aquí. Está prohibido.'), options: ["mustn't", "don't have to", 'should', 'may'], correctAnswer: "mustn't", correctFeedback: tri("Да. Mustn't значит запрещено.", "Так. Mustn't означає заборонено.", "Sí. Mustn't significa prohibición."), wrong: { "don't have to": tri("Don't have to значит не обязательно, но можно. Здесь нельзя.", "Don't have to означає не обовʼязково, але можна. Тут не можна.", "Don't have to significa no obligatorio, pero posible. Aquí está prohibido."), should: tri('Should not было бы советом не делать. Здесь сильный запрет.', 'Should not було б порадою не робити. Тут сильна заборона.', 'Should not sería consejo. Aquí hay prohibición.'), may: tri('May говорит возможно или разрешено. Здесь запрещено.', 'May каже можливо або дозволено. Тут заборонено.', 'May expresa posibilidad o permiso. Aquí está prohibido.') }, retry: [tri('Нужен смысл запрещено.', 'Потрібен сенс заборонено.', 'Necesitamos prohibición.'), tri('Запрещено = must not.', 'Заборонено = must not.', 'Prohibición = must not.'), tri("Подсказка: You mustn't smoke here.", "Підказка: You mustn't smoke here.", "Pista: You mustn't smoke here.")], focusWords: ["mustn't"] }),
    modalForceStep({ id: 'modal_force_contrast_001', order: 5, difficulty: 'contrast', targetSkill: 'no_obligation', sentence: 'You ___ come early. The meeting starts at ten.', translation: tri('Тебе не обязательно приходить рано. Встреча начинается в десять.', 'Тобі не обовʼязково приходити рано. Зустріч починається о десятій.', 'No tienes que venir temprano. La reunión empieza a las diez.'), options: ["don't have to", "mustn't", 'should', 'can'], correctAnswer: "don't have to", correctFeedback: tri("Да. Don't have to = не обязательно.", "Так. Don't have to = не обовʼязково.", "Sí. Don't have to = no obligación."), wrong: { "mustn't": tri("Mustn't значит запрещено приходить рано. Здесь просто не обязательно.", "Mustn't означає заборонено приходити рано. Тут просто не обовʼязково.", "Mustn't significa prohibido. Aquí solo no es obligatorio."), should: tri('Should дает совет прийти рано, а смысл обратный: не обязательно.', 'Should дає пораду прийти рано, а сенс протилежний: не обовʼязково.', 'Should aconseja venir temprano. Aquí no es obligatorio.'), can: tri('Can значит можешь, но не показывает отсутствие обязанности так ясно.', 'Can означає можеш, але не показує відсутність обовʼязку так чітко.', 'Can expresa permiso, pero no la falta de obligación tan claro.') }, retry: [tri('Не обязательно - это не запрет.', 'Не обовʼязково - це не заборона.', 'No obligación no es prohibición.'), tri('Не обязательно = do not have to.', 'Не обовʼязково = do not have to.', 'No obligación = do not have to.'), tri("Подсказка: You don't have to come early.", "Підказка: You don't have to come early.", "Pista: You don't have to come early.")], focusWords: ["don't have to"] }),
    modalForceStep({ id: 'modal_force_contrast_002', order: 6, difficulty: 'contrast', targetSkill: 'polite_request', sentence: '___ you help me, please?', translation: tri('Не могли бы вы мне помочь?', 'Чи не могли б ви мені допомогти?', 'Podrías ayudarme, por favor?'), options: ['Could', 'Must', 'Should', 'May'], correctAnswer: 'Could', correctFeedback: tri('Да. Could делает просьбу вежливой.', 'Так. Could робить прохання ввічливим.', 'Sí. Could hace la petición amable.'), wrong: { Must: tri('Must you help me звучит как странное требование, не просьба.', 'Must you help me звучить як дивна вимога, не прохання.', 'Must suena como exigencia, no petición.'), Should: tri('Should you help me звучит как вопрос о совете, не обычная просьба.', 'Should you help me звучить як питання про пораду, не звичайне прохання.', 'Should suena como pregunta de consejo, no petición normal.'), May: tri('May I ask можно для разрешения себе, но просьба к человеку мягче с could.', 'May I ask можна для дозволу собі, але прохання до людини мʼякше з could.', 'May sirve para pedir permiso; aquí could es la petición amable.') }, retry: [tri('Нужна вежливая просьба.', 'Потрібне ввічливе прохання.', 'Necesitamos petición amable.'), tri('Вежливо попросить = Could you...?', 'Ввічливо попросити = Could you...?', 'Petición amable = Could you...?'), tri('Подсказка: Could you help me?', 'Підказка: Could you help me?', 'Pista: Could you help me?')], focusWords: ['could'] }),
    modalForceStep({ id: 'modal_force_contrast_003', order: 7, difficulty: 'contrast', targetSkill: 'possibility_might', sentence: 'She ___ be at home, but I am not sure.', translation: tri('Она, возможно, дома, но я не уверен.', 'Вона, можливо, вдома, але я не впевнений.', 'Puede que esté en casa, pero no estoy seguro.'), options: ['might', 'must', 'can', "mustn't"], correctAnswer: 'might', correctFeedback: tri('Да. Might показывает неуверенную возможность.', 'Так. Might показує невпевнену можливість.', 'Sí. Might muestra posibilidad con duda.'), wrong: { must: tri('Must звучит как почти уверенный вывод. Здесь говорящий не уверен.', 'Must звучить як майже впевнений висновок. Тут мовець не впевнений.', 'Must suena como conclusión fuerte. Aquí no hay seguridad.'), can: tri('Can чаще про возможность вообще или разрешение, но здесь нужна вероятность с сомнением.', 'Can частіше про можливість взагалі або дозвіл, але тут потрібна ймовірність із сумнівом.', 'Can suele ser permiso o posibilidad general; aquí hay duda.'), "mustn't": tri("Mustn't значит запрещено. Это не про вероятность.", "Mustn't означає заборонено. Це не про ймовірність.", "Mustn't es prohibición, no probabilidad.") }, retry: [tri('Нужно возможно, но не уверен.', 'Потрібно можливо, але не впевнений.', 'Necesitamos posibilidad con duda.'), tri('Неуверенная возможность = might.', 'Невпевнена можливість = might.', 'Posibilidad con duda = might.'), tri('Подсказка: She might be at home.', 'Підказка: She might be at home.', 'Pista: She might be at home.')], focusWords: ['might'] }),
    modalForceStep({ id: 'modal_force_contrast_004', order: 8, difficulty: 'contrast', targetSkill: 'past_ability_could', sentence: 'When I was a child, I ___ run very fast.', translation: tri('Когда я был ребенком, я умел очень быстро бегать.', 'Коли я був дитиною, я вмів дуже швидко бігати.', 'Cuando era niño, podía correr muy rápido.'), options: ['could', 'can', 'must', 'should'], correctAnswer: 'could', correctFeedback: tri('Да. Could здесь про способность в прошлом.', 'Так. Could тут про здатність у минулому.', 'Sí. Could aquí habla de habilidad pasada.'), wrong: { can: tri('Can говорит про сейчас или вообще. Здесь явно прошлое: when I was a child.', 'Can говорить про зараз або взагалі. Тут явно минуле: when I was a child.', 'Can habla del presente o en general. Aquí es pasado.'), must: tri('Must говорит надо, не умел.', 'Must говорить треба, не вмів.', 'Must expresa obligación, no habilidad.'), should: tri('Should говорит стоит, не умел.', 'Should говорить варто, не вмів.', 'Should da consejo, no habilidad.') }, retry: [tri('Нужна способность в прошлом.', 'Потрібна здатність у минулому.', 'Necesitamos habilidad pasada.'), tri('Мог раньше = could.', 'Міг раніше = could.', 'Podía antes = could.'), tri('Подсказка: I could run very fast.', 'Підказка: I could run very fast.', 'Pista: I could run very fast.')], focusWords: ['could'] }),
    modalForceStep({ id: 'modal_force_mixed_001', order: 9, difficulty: 'mixed_review', targetSkill: 'external_requirement_have_to', sentence: 'I ___ work tomorrow. My boss asked me.', translation: tri('Мне нужно работать завтра. Начальник попросил.', 'Мені потрібно працювати завтра. Начальник попросив.', 'Tengo que trabajar mañana. Mi jefe me lo pidió.'), options: ['have to', 'should', 'might', "don't have to"], correctAnswer: 'have to', correctFeedback: tri('Да. Have to хорошо подходит для внешней необходимости.', 'Так. Have to добре підходить для зовнішньої необхідності.', 'Sí. Have to encaja con necesidad externa.'), wrong: { should: tri('Should звучит как совет, а здесь есть требование от начальника.', 'Should звучить як порада, а тут є вимога від начальника.', 'Should suena como consejo; aquí hay obligación externa.'), might: tri('Might значит возможно. Здесь человек обязан работать.', 'Might означає можливо. Тут людина повинна працювати.', 'Might significa posibilidad. Aquí hay obligación.'), "don't have to": tri("Don't have to значит не обязательно. Здесь наоборот надо.", "Don't have to означає не обовʼязково. Тут навпаки треба.", "Don't have to significa no obligación. Aquí sí hay obligación.") }, retry: [tri('Нужно надо из-за внешней ситуации.', 'Потрібно треба через зовнішню ситуацію.', 'Necesitamos obligación externa.'), tri('Внешнее надо = have to.', 'Зовнішнє треба = have to.', 'Obligación externa = have to.'), tri('Подсказка: I have to work tomorrow.', 'Підказка: I have to work tomorrow.', 'Pista: I have to work tomorrow.')], focusWords: ['have to'] }),
    modalForceStep({ id: 'modal_force_mixed_002', order: 10, difficulty: 'mixed_review', targetSkill: 'may_formal_permission', sentence: '___ I ask a question?', translation: tri('Можно задать вопрос?', 'Можна поставити питання?', 'Puedo hacer una pregunta?'), options: ['May', 'Must', 'Should', "Mustn't"], correctAnswer: 'May', correctFeedback: tri('Да. May I...? звучит как вежливое разрешение.', 'Так. May I...? звучить як ввічливий дозвіл.', 'Sí. May I...? suena como permiso amable.'), wrong: { Must: tri('Must I ask? значит обязан ли я спросить. Это не просьба о разрешении.', 'Must I ask? означає чи повинен я спитати. Це не прохання про дозвіл.', 'Must I ask? pregunta si estoy obligado, no pide permiso.'), Should: tri('Should I ask? значит стоит ли спросить. Это совет, не разрешение.', 'Should I ask? означає чи варто спитати. Це порада, не дозвіл.', 'Should I ask? pide consejo, no permiso.'), "Mustn't": tri("Mustn't I ask? не подходит. Нужен вежливый запрос разрешения.", "Mustn't I ask? не підходить. Потрібен ввічливий запит дозволу.", "Mustn't no encaja. Necesitamos permiso amable.") }, retry: [tri('Нужно спросить разрешение.', 'Потрібно спитати дозволу.', 'Necesitamos pedir permiso.'), tri('Вежливо: May I...?', 'Ввічливо: May I...?', 'Formal: May I...?'), tri('Подсказка: May I ask a question?', 'Підказка: May I ask a question?', 'Pista: May I ask a question?')], focusWords: ['may'] }),
    modalForceStep({ id: 'modal_force_mixed_003', order: 11, difficulty: 'mixed_review', targetSkill: 'strong_deduction_must', sentence: 'You ___ be tired after that long trip.', translation: tri('Ты, должно быть, устал после такой долгой поездки.', 'Ти, мабуть, втомився після такої довгої подорожі.', 'Debes de estar cansado después de ese viaje tan largo.'), options: ['must', 'can', "mustn't", "don't have to"], correctAnswer: 'must', correctFeedback: tri('Да. Must здесь значит сильный вывод: должно быть.', 'Так. Must тут означає сильний висновок: мабуть.', 'Sí. Must aquí expresa conclusión fuerte.'), wrong: { can: tri('Can не дает сильный вывод. Здесь говорящий почти уверен.', 'Can не дає сильний висновок. Тут мовець майже впевнений.', 'Can no da conclusión fuerte. Aquí hay seguridad.'), "mustn't": tri("Mustn't значит запрещено. Усталость нельзя запретить.", "Mustn't означає заборонено. Втому не можна заборонити.", "Mustn't es prohibición. No se prohíbe estar cansado."), "don't have to": tri("Don't have to значит не обязательно. Это не вывод о состоянии.", "Don't have to означає не обовʼязково. Це не висновок про стан.", "Don't have to es no obligación, no conclusión.") }, retry: [tri('Нужен смысл должно быть.', 'Потрібен сенс мабуть.', 'Necesitamos conclusión fuerte.'), tri('Сильный вывод = must.', 'Сильний висновок = must.', 'Conclusión fuerte = must.'), tri('Подсказка: You must be tired.', 'Підказка: You must be tired.', 'Pista: You must be tired.')], focusWords: ['must'] }),
    modalForceStep({ id: 'modal_force_mixed_004', order: 12, difficulty: 'mixed_review', targetSkill: 'should_not_advice', sentence: 'You ___ eat so much sugar.', translation: tri('Тебе не стоит есть так много сахара.', 'Тобі не варто їсти так багато цукру.', 'No deberías comer tanto azúcar.'), options: ["shouldn't", "mustn't", "don't have to", 'may not'], correctAnswer: "shouldn't", correctFeedback: tri("Да. Shouldn't дает совет не делать.", "Так. Shouldn't дає пораду не робити.", "Sí. Shouldn't da consejo de no hacerlo."), wrong: { "mustn't": tri("Mustn't звучит как строгий запрет. Здесь совет о здоровье.", "Mustn't звучить як сувора заборона. Тут порада про здоровʼя.", "Mustn't suena como prohibición fuerte. Aquí es consejo."), "don't have to": tri("Don't have to значит не обязан есть сахар, но смысл здесь: лучше не ешь.", "Don't have to означає не зобовʼязаний їсти цукор, але сенс тут: краще не їж.", "Don't have to significa no obligación. Aquí es mejor no hacerlo."), 'may not': tri('May not значит возможно не или нельзя в формальном стиле. Здесь нужен совет.', 'May not означає можливо ні або не можна у формальному стилі. Тут потрібна порада.', 'May not no da el consejo correcto aquí.') }, retry: [tri('Нужен мягкий совет не делать.', 'Потрібна мʼяка порада не робити.', 'Necesitamos consejo negativo.'), tri('Не стоит = should not.', 'Не варто = should not.', 'No deberías = should not.'), tri("Подсказка: You shouldn't eat so much sugar.", "Підказка: You shouldn't eat so much sugar.", "Pista: You shouldn't eat so much sugar.")], focusWords: ["shouldn't"] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['permission_vs_obligation', 'prohibition_vs_no_obligation', 'advice_vs_rule', 'possibility_vs_rule'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: называем силу выбранного слова.', 'Звичайне пояснення: називаємо силу обраного слова.', 'Explicación normal: nombramos la fuerza de la palabra elegida.'),
    depth2: tri('Проще: можно, стоит, надо, нельзя или не обязательно.', 'Простіше: можна, варто, треба, не можна або не обовʼязково.', 'Más simple: permiso, consejo, obligación, prohibición o no obligación.'),
    depth3: tri('Сравни пары: must not = запрещено, do not have to = не обязательно.', 'Порівняй пари: must not = заборонено, do not have to = не обовʼязково.', 'Compara: must not = prohibición, do not have to = no obligación.'),
    depth4: tri('Почти подсказка: выбери слово по русскому смыслу фразы.', 'Майже підказка: обери слово за українським сенсом фрази.', 'Casi pista: elige según el sentido de la frase.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card' },
    afterThreeWrongInSameExercise: { action: 'show_force_scale_then_retry' },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode' },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_modal_force_001', prompt: tri('Это совет или приказ?', 'Це порада чи наказ?', 'Es consejo u obligación?'), options: ['совет', 'приказ'], correctIndex: 0, thenReturnToExerciseId: 'modal_force_easy_002' },
      { id: 'guided_modal_force_002', prompt: tri('Must not - это запрещено или не обязательно?', 'Must not - це заборонено чи не обовʼязково?', 'Must not es prohibición o no obligación?'), options: ['запрещено', 'не обязательно'], correctIndex: 0, thenReturnToExerciseId: 'modal_force_easy_004' },
      { id: 'guided_modal_force_003', prompt: tri('Do not have to - это запрет или не обязательно?', 'Do not have to - це заборона чи не обовʼязково?', 'Do not have to es prohibición o no obligación?'), options: ['запрет', 'не обязательно'], correctIndex: 1, thenReturnToExerciseId: 'modal_force_contrast_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'modal',
    microDiagnosisId: 'modal_force',
    diagnosisLabel: tri('Сила can/should/must', 'Сила can/should/must', 'Fuerza can/should/must'),
    contrastSet: CONTRAST,
    focusWords: ['can', 'could', 'should', 'must', 'have to', "mustn't", "don't have to", 'may', 'might'],
    focusPatterns: ['can_permission', 'should_advice', 'must_rule', 'must_not_prohibition', 'no_obligation', 'polite_request', 'possibility_might', 'past_ability_could', 'external_requirement_have_to', 'may_formal_permission', 'strong_deduction_must', 'should_not_advice'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_modal_force_start',
    answer: 'diagnosis_training_modal_force_answer',
    mastery: 'diagnosis_training_modal_force_mastery',
    fallback: 'diagnosis_training_modal_force_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: {
      category: 'modal',
      microDiagnosisId: 'modal_force',
      contrastSet: CONTRAST,
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logModalForce: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=modal&microDiagnosisId=modal_force',
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
