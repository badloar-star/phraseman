import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk: string, es: string): TriText => ({ ru, uk, es });

function possessiveStep(input: {
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
      'Проверь слово справа от пропуска. Если дальше сразу noun, нужна форма перед существительным: my, your, his, her, its, our, their. Если noun после формы нет, нужна самостоятельная форма: mine, yours, his, hers, ours, theirs.',
      'Перевір слово праворуч від пропуску. Якщо далі одразу noun, потрібна форма перед іменником: my, your, his, her, its, our, their. Якщо noun після форми немає, потрібна самостійна форма: mine, yours, his, hers, ours, theirs.',
      'Mira la palabra a la derecha del hueco. Si después viene un noun, necesitamos forma antes de sustantivo: my, your, his, her, its, our, their. Si no hay noun después, usamos forma independiente: mine, yours, his, hers, ours, theirs.',
    ),
    microTask: tri(
      'Выбери possessive form по позиции: перед noun или самостоятельно.',
      'Обери possessive form за позицією: перед noun чи самостійно.',
      'Elige la possessive form según la posición: antes de noun o sola.',
    ),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? tri(
        'Не совсем. Смотри вправо: есть noun после формы или форма стоит одна?',
        'Не зовсім. Дивись праворуч: є noun після форми чи форма стоїть сама?',
        'No exactamente. Mira a la derecha: hay noun después de la forma o la forma va sola?',
      )])),
    retryFeedback: [
      input.retry[0],
      input.retry[1],
      input.retry[2],
      tri(
        `Подсказка: правильная форма здесь - "${input.correctAnswer}".`,
        `Підказка: правильна форма тут - "${input.correctAnswer}".`,
        `Pista: la forma correcta aquí es "${input.correctAnswer}".`,
      ),
    ],
    fallbackExplanation: tri(
      'Остановись. Есть существительное после пропуска? Тогда my/your/her/our/their. Нет существительного? Тогда mine/yours/hers/ours/theirs. His одинаковый в обоих случаях.',
      'Зупинись. Є іменник після пропуску? Тоді my/your/her/our/their. Немає іменника? Тоді mine/yours/hers/ours/theirs. His однаковий в обох випадках.',
      'Detente. Hay sustantivo después del hueco? Entonces my/your/her/our/their. No hay sustantivo? Entonces mine/yours/hers/ours/theirs. His es igual en ambos casos.',
    ),
    focusWords: input.focusWords,
  };
}

const beforeNoun = (determiner: string, standalone: string, noun: string): TriText => tri(
  `${standalone[0].toUpperCase()}${standalone.slice(1)} не ставится перед существительным. Не ${standalone} ${noun}, а ${determiner} ${noun}.`,
  `${standalone[0].toUpperCase()}${standalone.slice(1)} не ставиться перед іменником. Не ${standalone} ${noun}, а ${determiner} ${noun}.`,
  `${standalone[0].toUpperCase()}${standalone.slice(1)} no va antes de sustantivo. No ${standalone} ${noun}, sino ${determiner} ${noun}.`,
);

const withoutNoun = (determiner: string, standalone: string, noun: string): TriText => tri(
  `${determiner[0].toUpperCase()}${determiner.slice(1)} требует существительное после себя: ${determiner} ${noun}. Здесь ${noun} уже названо, поэтому нужно ${standalone}.`,
  `${determiner[0].toUpperCase()}${determiner.slice(1)} потребує іменник після себе: ${determiner} ${noun}. Тут ${noun} уже названо, тому потрібно ${standalone}.`,
  `${determiner[0].toUpperCase()}${determiner.slice(1)} necesita sustantivo después: ${determiner} ${noun}. Aquí ${noun} ya fue nombrado, por eso necesitamos ${standalone}.`,
);

export const PRONOUN_POSSESSIVE_TRAINING: DiagnosisTraining = {
  id: 'pronoun_possessive',
  category: 'pronoun',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 12,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('My / Mine, Your / Yours: чей предмет', 'My / Mine, Your / Yours: чий предмет', 'My / Mine, Your / Yours: de quién es'),
  shortTitle: tri('Possessive Pronouns', 'Possessive Pronouns', 'Possessive Pronouns'),
  shortDiagnosis: tri(
    'Ты путаешь формы перед существительным и самостоятельные possessive forms.',
    'Ти плутаєш форми перед іменником і самостійні possessive forms.',
    'Confundes las formas antes de sustantivo y las possessive forms independientes.',
  ),
  diagnosisText: tri(
    'Ты путаешь притяжательные формы: my/mine, your/yours, her/hers, our/ours, their/theirs. Главная проблема в том, что часть форм ставится перед существительным, а часть используется самостоятельно без существительного.',
    'Ти плутаєш присвійні форми: my/mine, your/yours, her/hers, our/ours, their/theirs. Головна проблема в тому, що частина форм ставиться перед іменником, а частина використовується самостійно без іменника.',
    'Confundes formas posesivas: my/mine, your/yours, her/hers, our/ours, their/theirs. El problema principal es que unas formas van antes de un sustantivo y otras se usan solas sin sustantivo.',
  ),
  mentalModel: tri(
    'Если после слова сразу идет существительное - my, your, his, her, its, our, their. Если существительного после него нет - mine, yours, his, hers, ours, theirs.',
    'Якщо після слова одразу йде іменник - my, your, his, her, its, our, their. Якщо іменника після нього немає - mine, yours, his, hers, ours, theirs.',
    'Si después viene un sustantivo - my, your, his, her, its, our, their. Si no viene sustantivo después - mine, yours, his, hers, ours, theirs.',
  ),
  contrastSet: ['my/mine', 'your/yours', 'his', 'her/hers', 'our/ours', 'their/theirs', 'its'],
  coreRule: tri(
    'Перед существительным: my phone, your bag, her car, our house, their idea. Самостоятельно: mine, yours, hers, ours, theirs. His одинаковый: his car / this is his.',
    'Перед іменником: my phone, your bag, her car, our house, their idea. Самостійно: mine, yours, hers, ours, theirs. His однаковий: his car / this is his.',
    'Antes de sustantivo: my phone, your bag, her car, our house, their idea. Solos: mine, yours, hers, ours, theirs. His es igual: his car / this is his.',
  ),
  whatUserMustLearn: {
    ru: [
      'My, your, his, her, its, our, their ставятся перед существительным: my phone, their house.',
      'Mine, yours, his, hers, ours, theirs используются без существительного после них: This phone is mine.',
      'Нельзя говорить mine phone. Нужно my phone.',
      'Нельзя говорить this phone is my. Нужно this phone is mine.',
      'His не меняется: his phone и This phone is his.',
      'Her перед существительным: her bag. Hers самостоятельно: This bag is hers.',
      "Its используется для принадлежности: its toy. It's означает it is или it has.",
    ],
    uk: [
      'My, your, his, her, its, our, their ставляться перед іменником: my phone, their house.',
      'Mine, yours, his, hers, ours, theirs використовуються без іменника після них: This phone is mine.',
      'Не можна говорити mine phone. Потрібно my phone.',
      'Не можна говорити this phone is my. Потрібно this phone is mine.',
      'His не змінюється: his phone і This phone is his.',
      'Her перед іменником: her bag. Hers самостійно: This bag is hers.',
      "Its використовується для належності: its toy. It's означає it is або it has.",
    ],
    es: [
      'My, your, his, her, its, our, their van antes de sustantivo: my phone, their house.',
      'Mine, yours, his, hers, ours, theirs se usan sin sustantivo después: This phone is mine.',
      'No digas mine phone. Correcto: my phone.',
      'No digas this phone is my. Correcto: this phone is mine.',
      'His no cambia: his phone y This phone is his.',
      'Her va antes de sustantivo: her bag. Hers va sola: This bag is hers.',
      "Its se usa para posesión: its toy. It's significa it is o it has.",
    ],
  },
  examples: [
    { en: 'This is my phone.', ru: 'Это мой телефон.', uk: 'Це мій телефон.', es: 'Este es mi teléfono.', why: tri('После my идет phone. Перед существительным нужна форма my.', 'Після my йде phone. Перед іменником потрібна форма my.', 'Después de my viene phone. Antes de sustantivo usamos my.') },
    { en: 'This phone is mine.', ru: 'Этот телефон мой.', uk: 'Цей телефон мій.', es: 'Este teléfono es mío.', why: tri('После mine нет существительного. Форма стоит самостоятельно.', 'Після mine немає іменника. Форма стоїть самостійно.', 'Después de mine no hay sustantivo. La forma va sola.') },
    { en: 'Is this your bag?', ru: 'Это твоя сумка?', uk: 'Це твоя сумка?', es: 'Es tu bolso?', why: tri('После your идет bag, поэтому your.', 'Після your йде bag, тому your.', 'Después de your viene bag, por eso your.') },
    { en: 'Is this bag yours?', ru: 'Эта сумка твоя?', uk: 'Ця сумка твоя?', es: 'Este bolso es tuyo?', why: tri('После yours нет существительного.', 'Після yours немає іменника.', 'Después de yours no hay sustantivo.') },
    { en: 'She lost her keys.', ru: 'Она потеряла свои ключи.', uk: 'Вона загубила свої ключі.', es: 'Ella perdió sus llaves.', why: tri('После her идет keys. Перед noun нужна her.', 'Після her йде keys. Перед noun потрібна her.', 'Después de her viene keys. Antes de noun usamos her.') },
    { en: 'These keys are hers.', ru: 'Эти ключи ее.', uk: 'Ці ключі її.', es: 'Estas llaves son suyas.', why: tri('После hers нет существительного.', 'Після hers немає іменника.', 'Después de hers no hay sustantivo.') },
    { en: 'That is his car.', ru: 'Это его машина.', uk: 'Це його машина.', es: 'Ese es su coche.', why: tri('His используется перед car.', 'His використовується перед car.', 'His se usa antes de car.') },
    { en: 'That car is his.', ru: 'Та машина его.', uk: 'Та машина його.', es: 'Ese coche es suyo.', why: tri('His не меняется: his car / car is his.', 'His не змінюється: his car / car is his.', 'His no cambia: his car / car is his.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты путаешь формы типа my и mine. Это вопрос позиции: после слова есть существительное или нет.', 'Схоже, ти плутаєш форми типу my і mine. Це питання позиції: після слова є іменник чи ні.', 'Parece que confundes formas como my y mine. Es cuestión de posición: hay sustantivo después o no.') },
    { id: 'intro_rule', type: 'rule', text: tri('Если после слова идет предмет - my, your, her, our, their. Если предмет уже назван и слово стоит одно - mine, yours, hers, ours, theirs.', 'Якщо після слова йде предмет - my, your, her, our, their. Якщо предмет уже названий і слово стоїть саме - mine, yours, hers, ours, theirs.', 'Si después viene la cosa - my, your, her, our, their. Si la cosa ya fue nombrada y la palabra va sola - mine, yours, hers, ours, theirs.') },
    { id: 'intro_warning', type: 'warning', text: tri('Самая частая ошибка: mine phone или this phone is my. Правильно наоборот: my phone, но this phone is mine.', 'Найчастіша помилка: mine phone або this phone is my. Правильно навпаки: my phone, але this phone is mine.', 'El error más común: mine phone o this phone is my. Lo correcto es al revés: my phone, pero this phone is mine.') },
  ],
  steps: [
    possessiveStep({ id: 'possessive_easy_001', order: 1, difficulty: 'easy', targetSkill: 'my_before_noun', sentence: 'This is ___ phone.', translation: tri('Это мой телефон.', 'Це мій телефон.', 'Este es mi teléfono.'), options: ['my', 'mine', 'me', 'I'], correctAnswer: 'my', correctFeedback: tri('Да. После пропуска идет phone. Перед существительным нужна форма my.', 'Так. Після пропуску йде phone. Перед іменником потрібна форма my.', 'Sí. Después del hueco viene phone. Antes de sustantivo necesitamos my.'), wrong: { mine: beforeNoun('my', 'mine', 'phone'), me: tri('Me означает "меня/мне" как object. Здесь нужна принадлежность перед phone: my.', 'Me означає "мене/мені" як object. Тут потрібна належність перед phone: my.', 'Me significa "me/a mí" como objeto. Aquí necesitamos posesión antes de phone: my.'), I: tri('I означает "я" как subject. Перед phone нужна притяжательная форма: my.', 'I означає "я" як subject. Перед phone потрібна присвійна форма: my.', 'I significa "yo" como subject. Antes de phone necesitamos forma posesiva: my.') }, retry: [tri('После пропуска есть предмет: phone. Перед предметом - my.', 'Після пропуску є предмет: phone. Перед предметом - my.', 'Después del hueco hay cosa: phone. Antes de la cosa - my.'), tri('My phone. Mine без phone.', 'My phone. Mine без phone.', 'My phone. Mine sin phone.'), tri('Подсказка: This is my phone.', 'Підказка: This is my phone.', 'Pista: This is my phone.')], focusWords: ['my', 'mine', 'phone'] }),
    possessiveStep({ id: 'possessive_easy_002', order: 2, difficulty: 'easy', targetSkill: 'mine_without_noun', sentence: 'This phone is ___.', translation: tri('Этот телефон мой.', 'Цей телефон мій.', 'Este teléfono es mío.'), options: ['my', 'mine', 'me', 'I'], correctAnswer: 'mine', correctFeedback: tri('Да. После пропуска нет существительного. Форма стоит самостоятельно, поэтому mine.', 'Так. Після пропуску немає іменника. Форма стоїть самостійно, тому mine.', 'Sí. Después del hueco no hay sustantivo. La forma va sola, por eso mine.'), wrong: { my: withoutNoun('my', 'mine', 'phone'), me: tri('Me означает "меня/мне". Здесь смысл "мой", без существительного после него. Нужно mine.', 'Me означає "мене/мені". Тут зміст "мій", без іменника після нього. Потрібно mine.', 'Me significa "me/a mí". Aquí el sentido es "mío", sin sustantivo después. Necesitamos mine.'), I: tri('I означает "я". Здесь не subject, а принадлежность: mine.', 'I означає "я". Тут не subject, а належність: mine.', 'I significa "yo". Aquí no es subject, sino posesión: mine.') }, retry: [tri('После пропуска ничего нет. Значит нужна самостоятельная форма: mine.', 'Після пропуску нічого немає. Значить потрібна самостійна форма: mine.', 'Después del hueco no hay nada. Entonces necesitamos forma independiente: mine.'), tri('This is my phone. This phone is mine.', 'This is my phone. This phone is mine.', 'This is my phone. This phone is mine.'), tri('Подсказка: This phone is mine.', 'Підказка: This phone is mine.', 'Pista: This phone is mine.')], focusWords: ['my', 'mine', 'phone'] }),
    possessiveStep({ id: 'possessive_easy_003', order: 3, difficulty: 'easy', targetSkill: 'your_before_noun', sentence: 'Is this ___ bag?', translation: tri('Это твоя сумка?', 'Це твоя сумка?', 'Es tu bolso?'), options: ['your', 'yours', 'you', "you're"], correctAnswer: 'your', correctFeedback: tri('Да. После пропуска идет bag. Перед существительным нужна форма your.', 'Так. Після пропуску йде bag. Перед іменником потрібна форма your.', 'Sí. Después del hueco viene bag. Antes de sustantivo necesitamos your.'), wrong: { yours: beforeNoun('your', 'yours', 'bag'), you: tri('You означает "ты/тебя", но перед bag нужна форма принадлежности: your.', 'You означає "ти/тебе", але перед bag потрібна форма належності: your.', 'You significa "tú/te", pero antes de bag necesitamos posesivo: your.'), "you're": tri("You're = you are. Здесь нужен не 'ты есть', а 'твоя сумка': your bag.", "You're = you are. Тут потрібно не 'ти є', а 'твоя сумка': your bag.", "You're = you are. Aquí no necesitamos 'tú eres', sino 'tu bolso': your bag.") }, retry: [tri('Перед bag нужна форма your.', 'Перед bag потрібна форма your.', 'Antes de bag necesitamos your.'), tri('Your bag. Yours без bag.', 'Your bag. Yours без bag.', 'Your bag. Yours sin bag.'), tri('Подсказка: Is this your bag?', 'Підказка: Is this your bag?', 'Pista: Is this your bag?')], focusWords: ['your', 'yours', 'bag'] }),
    possessiveStep({ id: 'possessive_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'yours_without_noun', sentence: 'Is this bag ___?', translation: tri('Эта сумка твоя?', 'Ця сумка твоя?', 'Este bolso es tuyo?'), options: ['your', 'yours', 'you', "you're"], correctAnswer: 'yours', correctFeedback: tri('Да. После пропуска нет существительного. Нужна самостоятельная форма yours.', 'Так. Після пропуску немає іменника. Потрібна самостійна форма yours.', 'Sí. Después del hueco no hay sustantivo. Necesitamos la forma independiente yours.'), wrong: { your: withoutNoun('your', 'yours', 'bag'), you: tri('You означает "ты/тебя". Здесь нужна самостоятельная форма принадлежности: yours.', 'You означає "ти/тебе". Тут потрібна самостійна форма належності: yours.', 'You significa "tú/te". Aquí necesitamos forma posesiva independiente: yours.'), "you're": tri("You're = you are. Здесь нужен possessive pronoun: yours.", "You're = you are. Тут потрібен possessive pronoun: yours.", "You're = you are. Aquí necesitamos possessive pronoun: yours.") }, retry: [tri('Bag уже названо. После пропуска нового существительного нет. Значит yours.', 'Bag уже названо. Після пропуску нового іменника немає. Значить yours.', 'Bag ya fue nombrado. Después del hueco no hay nuevo sustantivo. Entonces yours.'), tri('Your bag. Bag is yours.', 'Your bag. Bag is yours.', 'Your bag. Bag is yours.'), tri('Подсказка: Is this bag yours?', 'Підказка: Is this bag yours?', 'Pista: Is this bag yours?')], focusWords: ['your', 'yours', 'bag'] }),
    possessiveStep({ id: 'possessive_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'her_before_noun', sentence: 'She lost ___ keys.', translation: tri('Она потеряла свои ключи.', 'Вона загубила свої ключі.', 'Ella perdió sus llaves.'), options: ['her', 'hers', 'she', "she's"], correctAnswer: 'her', correctFeedback: tri('Да. После пропуска идет keys. Перед существительным нужна форма her.', 'Так. Після пропуску йде keys. Перед іменником потрібна форма her.', 'Sí. Después del hueco viene keys. Antes de sustantivo necesitamos her.'), wrong: { hers: beforeNoun('her', 'hers', 'keys'), she: tri('She означает "она" как subject. Перед keys нужна притяжательная форма her.', 'She означає "вона" як subject. Перед keys потрібна присвійна форма her.', 'She significa "ella" como subject. Antes de keys necesitamos posesivo her.'), "she's": tri("She's = she is или she has. Здесь нужна принадлежность: her keys.", "She's = she is або she has. Тут потрібна належність: her keys.", "She's = she is o she has. Aquí necesitamos posesión: her keys.") }, retry: [tri('Перед keys нужна форма her.', 'Перед keys потрібна форма her.', 'Antes de keys necesitamos her.'), tri('Her keys. Hers без keys.', 'Her keys. Hers без keys.', 'Her keys. Hers sin keys.'), tri('Подсказка: She lost her keys.', 'Підказка: She lost her keys.', 'Pista: She lost her keys.')], focusWords: ['her', 'hers', 'keys'] }),
    possessiveStep({ id: 'possessive_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'hers_without_noun', sentence: 'These keys are ___.', translation: tri('Эти ключи ее.', 'Ці ключі її.', 'Estas llaves son suyas.'), options: ['her', 'hers', 'she', "she's"], correctAnswer: 'hers', correctFeedback: tri('Да. После пропуска нет существительного. Нужна самостоятельная форма hers.', 'Так. Після пропуску немає іменника. Потрібна самостійна форма hers.', 'Sí. Después del hueco no hay sustantivo. Necesitamos la forma independiente hers.'), wrong: { her: withoutNoun('her', 'hers', 'keys'), she: tri('She означает "она" как subject. Здесь нужна самостоятельная форма принадлежности: hers.', 'She означає "вона" як subject. Тут потрібна самостійна форма належності: hers.', 'She significa "ella" como subject. Aquí necesitamos forma posesiva independiente: hers.'), "she's": tri("She's = she is или she has. Здесь нужно hers: These keys are hers.", "She's = she is або she has. Тут потрібно hers: These keys are hers.", "She's = she is o she has. Aquí necesitamos hers: These keys are hers.") }, retry: [tri('Keys уже названо. После пропуска нет нового предмета. Значит hers.', 'Keys уже названо. Після пропуску немає нового предмета. Значить hers.', 'Keys ya fue nombrado. Después del hueco no hay nueva cosa. Entonces hers.'), tri('Her keys. Keys are hers.', 'Her keys. Keys are hers.', 'Her keys. Keys are hers.'), tri('Подсказка: These keys are hers.', 'Підказка: These keys are hers.', 'Pista: These keys are hers.')], focusWords: ['her', 'hers', 'keys'] }),
    possessiveStep({ id: 'possessive_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'our_before_noun', sentence: 'This is ___ house.', translation: tri('Это наш дом.', 'Це наш дім.', 'Esta es nuestra casa.'), options: ['our', 'ours', 'us', 'we'], correctAnswer: 'our', correctFeedback: tri('Да. После пропуска идет house. Перед существительным нужна форма our.', 'Так. Після пропуску йде house. Перед іменником потрібна форма our.', 'Sí. Después del hueco viene house. Antes de sustantivo necesitamos our.'), wrong: { ours: beforeNoun('our', 'ours', 'house'), us: tri('Us означает "нас/нам". Перед house нужна форма принадлежности: our.', 'Us означає "нас/нам". Перед house потрібна форма належності: our.', 'Us significa "nos/a nosotros". Antes de house necesitamos posesivo: our.'), we: tri('We означает "мы" как subject. Перед house нужна притяжательная форма our.', 'We означає "ми" як subject. Перед house потрібна присвійна форма our.', 'We significa "nosotros" como subject. Antes de house necesitamos posesivo our.') }, retry: [tri('Перед house нужна форма our.', 'Перед house потрібна форма our.', 'Antes de house necesitamos our.'), tri('Our house. Ours без house.', 'Our house. Ours без house.', 'Our house. Ours sin house.'), tri('Подсказка: This is our house.', 'Підказка: This is our house.', 'Pista: This is our house.')], focusWords: ['our', 'ours', 'house'] }),
    possessiveStep({ id: 'possessive_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'ours_without_noun', sentence: 'This house is ___.', translation: tri('Этот дом наш.', 'Цей дім наш.', 'Esta casa es nuestra.'), options: ['our', 'ours', 'us', 'we'], correctAnswer: 'ours', correctFeedback: tri('Да. После пропуска нет существительного. Нужна самостоятельная форма ours.', 'Так. Після пропуску немає іменника. Потрібна самостійна форма ours.', 'Sí. Después del hueco no hay sustantivo. Necesitamos la forma independiente ours.'), wrong: { our: withoutNoun('our', 'ours', 'house'), us: tri('Us означает "нас/нам". Здесь нужна самостоятельная форма принадлежности: ours.', 'Us означає "нас/нам". Тут потрібна самостійна форма належності: ours.', 'Us significa "nos/a nosotros". Aquí necesitamos forma posesiva independiente: ours.'), we: tri('We означает "мы". Здесь смысл "наш", без существительного после него. Нужно ours.', 'We означає "ми". Тут зміст "наш", без іменника після нього. Потрібно ours.', 'We significa "nosotros". Aquí el sentido es "nuestro", sin sustantivo después. Necesitamos ours.') }, retry: [tri('House уже названо. После пропуска нет нового существительного. Значит ours.', 'House уже названо. Після пропуску немає нового іменника. Значить ours.', 'House ya fue nombrado. Después del hueco no hay nuevo sustantivo. Entonces ours.'), tri('Our house. House is ours.', 'Our house. House is ours.', 'Our house. House is ours.'), tri('Подсказка: This house is ours.', 'Підказка: This house is ours.', 'Pista: This house is ours.')], focusWords: ['our', 'ours', 'house'] }),
    possessiveStep({ id: 'possessive_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'their_before_noun', sentence: 'I like ___ idea.', translation: tri('Мне нравится их идея.', 'Мені подобається їхня ідея.', 'Me gusta su idea.'), options: ['their', 'theirs', 'them', 'they'], correctAnswer: 'their', correctFeedback: tri('Да. После пропуска идет idea. Перед существительным нужна форма their.', 'Так. Після пропуску йде idea. Перед іменником потрібна форма their.', 'Sí. Después del hueco viene idea. Antes de sustantivo necesitamos their.'), wrong: { theirs: beforeNoun('their', 'theirs', 'idea'), them: tri('Them означает "их/им" как object. Перед idea нужна притяжательная форма their.', 'Them означає "їх/їм" як object. Перед idea потрібна присвійна форма their.', 'Them significa "los/les" como objeto. Antes de idea necesitamos posesivo their.'), they: tri('They означает "они" как subject. Перед idea нужна форма their.', 'They означає "вони" як subject. Перед idea потрібна форма their.', 'They significa "ellos" como subject. Antes de idea necesitamos their.') }, retry: [tri('Перед idea нужна форма their.', 'Перед idea потрібна форма their.', 'Antes de idea necesitamos their.'), tri('Their idea. Theirs без idea.', 'Their idea. Theirs без idea.', 'Their idea. Theirs sin idea.'), tri('Подсказка: I like their idea.', 'Підказка: I like their idea.', 'Pista: I like their idea.')], focusWords: ['their', 'theirs', 'idea'] }),
    possessiveStep({ id: 'possessive_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'theirs_without_noun', sentence: 'This idea is ___.', translation: tri('Эта идея их.', 'Ця ідея їхня.', 'Esta idea es suya.'), options: ['their', 'theirs', 'them', 'they'], correctAnswer: 'theirs', correctFeedback: tri('Да. После пропуска нет существительного. Нужна самостоятельная форма theirs.', 'Так. Після пропуску немає іменника. Потрібна самостійна форма theirs.', 'Sí. Después del hueco no hay sustantivo. Necesitamos la forma independiente theirs.'), wrong: { their: withoutNoun('their', 'theirs', 'idea'), them: tri('Them - object pronoun. Здесь нужна самостоятельная форма принадлежности: theirs.', 'Them - object pronoun. Тут потрібна самостійна форма належності: theirs.', 'Them es object pronoun. Aquí necesitamos forma posesiva independiente: theirs.'), they: tri('They означает "они". Здесь нужно "их" как принадлежность без существительного: theirs.', 'They означає "вони". Тут потрібно "їхня" як належність без іменника: theirs.', 'They significa "ellos". Aquí necesitamos "suya/de ellos" sin sustantivo: theirs.') }, retry: [tri('Idea уже названа. После пропуска нет нового noun. Значит theirs.', 'Idea уже названа. Після пропуску немає нового noun. Значить theirs.', 'Idea ya fue nombrada. Después del hueco no hay nuevo noun. Entonces theirs.'), tri('Their idea. Idea is theirs.', 'Their idea. Idea is theirs.', 'Their idea. Idea is theirs.'), tri('Подсказка: This idea is theirs.', 'Підказка: This idea is theirs.', 'Pista: This idea is theirs.')], focusWords: ['their', 'theirs', 'idea'] }),
    possessiveStep({ id: 'possessive_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'his_same_form_before_noun', sentence: 'That is ___ car.', translation: tri('Это его машина.', 'Це його машина.', 'Ese es su coche.'), options: ['he', 'him', 'his', "he's"], correctAnswer: 'his', correctFeedback: tri('Да. После пропуска идет car. Для "его машина" нужна форма his: his car.', 'Так. Після пропуску йде car. Для "його машина" потрібна форма his: his car.', 'Sí. Después del hueco viene car. Para "su coche/de él" necesitamos his: his car.'), wrong: { he: tri('He означает "он" как subject. Перед car нужна форма принадлежности: his.', 'He означає "він" як subject. Перед car потрібна форма належності: his.', 'He significa "él" como subject. Antes de car necesitamos posesivo: his.'), him: tri('Him используется после глагола или предлога. Перед car нужна форма his.', 'Him використовується після дієслова або прийменника. Перед car потрібна форма his.', 'Him se usa después de verbo o preposición. Antes de car necesitamos his.'), "he's": tri("He's = he is или he has. Здесь нужна принадлежность: his car.", "He's = he is або he has. Тут потрібна належність: his car.", "He's = he is o he has. Aquí necesitamos posesión: his car.") }, retry: [tri('His ставится перед car: his car.', 'His ставиться перед car: his car.', 'His va antes de car: his car.'), tri('His car.', 'His car.', 'His car.'), tri('Подсказка: That is his car.', 'Підказка: That is his car.', 'Pista: That is his car.')], focusWords: ['his', 'car'] }),
    possessiveStep({ id: 'possessive_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'his_same_form_without_noun', sentence: 'That car is ___.', translation: tri('Та машина его.', 'Та машина його.', 'Ese coche es suyo.'), options: ['he', 'him', 'his', "he's"], correctAnswer: 'his', correctFeedback: tri('Да. His одинаковый в двух ролях: his car и The car is his.', 'Так. His однаковий у двох ролях: his car і The car is his.', 'Sí. His es igual en los dos usos: his car y The car is his.'), wrong: { he: tri('He означает "он". Здесь нужна принадлежность: his.', 'He означає "він". Тут потрібна належність: his.', 'He significa "él". Aquí necesitamos posesión: his.'), him: tri('Him - object pronoun. Здесь не "его" как объект, а "его машина". Нужна форма his.', 'Him - object pronoun. Тут не "його" як object, а "його машина". Потрібна форма his.', 'Him es object pronoun. Aquí no es "a él" como objeto, sino "su coche". Necesitamos his.'), "he's": tri("He's = he is или he has. Здесь нужна самостоятельная притяжательная форма his.", "He's = he is або he has. Тут потрібна самостійна присвійна форма his.", "He's = he is o he has. Aquí necesitamos la forma posesiva independiente his.") }, retry: [tri('His не меняется: his car / car is his.', 'His не змінюється: his car / car is his.', 'His no cambia: his car / car is his.'), tri('The car is his.', 'The car is his.', 'The car is his.'), tri('Подсказка: That car is his.', 'Підказка: That car is his.', 'Pista: That car is his.')], focusWords: ['his', 'car'] }),
    possessiveStep({ id: 'possessive_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'its_possessive', sentence: 'The dog lost ___ toy.', translation: tri('Собака потеряла свою игрушку.', 'Собака загубила свою іграшку.', 'El perro perdió su juguete.'), options: ['its', "it's", 'it', 'his'], correctAnswer: 'its', correctFeedback: tri('Да. Its без апострофа показывает принадлежность: its toy.', 'Так. Its без апострофа показує належність: its toy.', 'Sí. Its sin apóstrofo muestra posesión: its toy.'), wrong: { "it's": tri("It's с апострофом означает it is или it has. Для принадлежности нужен its без апострофа.", "It's з апострофом означає it is або it has. Для належності потрібен its без апострофа.", "It's con apóstrofo significa it is o it has. Para posesión necesitamos its sin apóstrofo."), it: tri('It означает "оно/это". Перед toy нужна притяжательная форма its.', 'It означає "воно/це". Перед toy потрібна присвійна форма its.', 'It significa "eso/ello". Antes de toy necesitamos posesivo its.'), his: tri('His можно использовать, если пол животного важен. Нейтрально для dog здесь лучше its toy.', 'His можна використати, якщо стать тварини важлива. Нейтрально для dog тут краще its toy.', 'His puede usarse si el sexo del animal importa. Neutralmente para dog aquí es mejor its toy.') }, retry: [tri('Принадлежность у it = its. Без апострофа.', 'Належність у it = its. Без апострофа.', 'Posesión de it = its. Sin apóstrofo.'), tri("Its toy. It's = it is.", "Its toy. It's = it is.", "Its toy. It's = it is."), tri('Подсказка: The dog lost its toy.', 'Підказка: The dog lost its toy.', 'Pista: The dog lost its toy.')], focusWords: ['its', "it's", 'toy'] }),
    possessiveStep({ id: 'possessive_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_determiner_vs_pronoun', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.', 'Elige la pareja correcta.'), options: ['This is my book / This book is mine', 'This is mine book / This book is my', 'This is me book / This book is me', 'This is I book / This book is I'], correctAnswer: 'This is my book / This book is mine', correctFeedback: tri('Да. Перед book нужна форма my. Без book нужна форма mine.', 'Так. Перед book потрібна форма my. Без book потрібна форма mine.', 'Sí. Antes de book necesitamos my. Sin book necesitamos mine.'), wrong: { 'This is mine book / This book is my': tri('Формы перепутаны. Mine не ставится перед book, а my не стоит самостоятельно. Нужно my book / book is mine.', 'Форми переплутані. Mine не ставиться перед book, а my не стоїть самостійно. Потрібно my book / book is mine.', 'Las formas están invertidas. Mine no va antes de book, y my no va solo. Necesitamos my book / book is mine.'), 'This is me book / This book is me': tri('Me не показывает принадлежность в этих фразах. Нужны my и mine.', 'Me не показує належність у цих фразах. Потрібні my і mine.', 'Me no muestra posesión en estas frases. Necesitamos my y mine.'), 'This is I book / This book is I': tri('I - это subject pronoun, не форма принадлежности. Нужны my и mine.', 'I - це subject pronoun, не форма належності. Потрібні my і mine.', 'I es subject pronoun, no forma posesiva. Necesitamos my y mine.') }, retry: [tri('С book - my. Без book - mine.', 'З book - my. Без book - mine.', 'Con book - my. Sin book - mine.'), tri('My book / mine.', 'My book / mine.', 'My book / mine.'), tri('Подсказка: This is my book / This book is mine.', 'Підказка: This is my book / This book is mine.', 'Pista: This is my book / This book is mine.')], focusWords: ['my', 'mine', 'book'] }),
    possessiveStep({ id: 'possessive_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_all_possessives', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.', 'Elige la oración correcta.'), options: ['Their car is red, and ours is blue.', 'Theirs car is red, and our is blue.', 'Them car is red, and us is blue.', 'They car is red, and we is blue.'], correctAnswer: 'Their car is red, and ours is blue.', correctFeedback: tri('Да. Their стоит перед car. Ours стоит самостоятельно вместо our car.', 'Так. Their стоїть перед car. Ours стоїть самостійно замість our car.', 'Sí. Their va antes de car. Ours va solo en lugar de our car.'), wrong: { 'Theirs car is red, and our is blue.': tri('Theirs не ставится перед car, а our не стоит самостоятельно. Нужно their car и ours.', 'Theirs не ставиться перед car, а our не стоїть самостійно. Потрібно their car і ours.', 'Theirs no va antes de car, y our no va solo. Necesitamos their car y ours.'), 'Them car is red, and us is blue.': tri('Them и us - object pronouns, не формы принадлежности. Нужны their и ours.', 'Them і us - object pronouns, не форми належності. Потрібні their і ours.', 'Them y us son object pronouns, no formas posesivas. Necesitamos their y ours.'), 'They car is red, and we is blue.': tri('They и we - subject pronouns. Для принадлежности нужны their и ours.', 'They і we - subject pronouns. Для належності потрібні their і ours.', 'They y we son subject pronouns. Para posesión necesitamos their y ours.') }, retry: [tri('Перед car нужна форма their. Во второй части car уже понятно, поэтому ours.', 'Перед car потрібна форма their. У другій частині car уже зрозуміло, тому ours.', 'Antes de car necesitamos their. En la segunda parte car ya está claro, por eso ours.'), tri('Their car / ours.', 'Their car / ours.', 'Their car / ours.'), tri('Подсказка: Their car is red, and ours is blue.', 'Підказка: Their car is red, and ours is blue.', 'Pista: Their car is red, and ours is blue.')], focusWords: ['their', 'theirs', 'our', 'ours'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['possessive_determiner_vs_pronoun', 'my_mine_error', 'your_yours_error', 'her_hers_error', 'our_ours_error', 'their_theirs_error', 'his_same_form_confusion', 'its_its_apostrophe_confusion', 'missing_noun_after_determiner'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем, есть ли существительное после притяжательной формы.', 'Звичайне пояснення: показуємо, чи є іменник після присвійної форми.', 'Explicación normal: mostramos si hay sustantivo después de la forma posesiva.'),
    depth2: tri('Проще: после слова есть предмет или нет?', 'Простіше: після слова є предмет чи ні?', 'Más simple: hay cosa después o no?'),
    depth3: tri('Еще проще: my phone / mine.', 'Ще простіше: my phone / mine.', 'Aún más simple: my phone / mine.'),
    depth4: tri('Почти подсказка: прямо указываем, нужна форма перед существительным или самостоятельная форма.', 'Майже підказка: прямо вказуємо, потрібна форма перед іменником чи самостійна форма.', 'Casi pista: indicamos directamente si necesitas forma antes de sustantivo o forma independiente.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Остановись. Посмотри сразу после пропуска. Есть существительное? Тогда my/your/her/our/their. Нет существительного? Тогда mine/yours/hers/ours/theirs. His одинаковый.', 'Зупинись. Подивись одразу після пропуску. Є іменник? Тоді my/your/her/our/their. Немає іменника? Тоді mine/yours/hers/ours/theirs. His однаковий.', 'Detente. Mira justo después del hueco. Hay sustantivo? Entonces my/your/her/our/their. No hay sustantivo? Entonces mine/yours/hers/ours/theirs. His es igual.') },
    afterThreeWrongInSameExercise: { action: 'show_noun_presence_hint_then_retry', card: tri('Система покажет, есть ли существительное после пропуска, но не выберет форму за пользователя.', 'Система покаже, чи є іменник після пропуску, але не вибере форму за користувача.', 'El sistema mostrará si hay sustantivo después del hueco, pero no elegirá la forma.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Режим подсказки: сначала выбери, есть ли noun после пропуска. Потом вернемся к possessive form.', 'Режим підказки: спочатку обери, чи є noun після пропуску. Потім повернемося до possessive form.', 'Modo guiado: primero elige si hay noun después del hueco. Luego volvemos a possessive form.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_possessive_001', prompt: tri('В фразе This is ___ phone после пропуска есть существительное?', 'У фразі This is ___ phone після пропуску є іменник?', 'En This is ___ phone, hay sustantivo después del hueco?'), options: ['да', 'нет'], correctIndex: 0, thenReturnToExerciseId: 'possessive_easy_001' },
      { id: 'guided_possessive_002', prompt: tri('В фразе This phone is ___ после пропуска есть существительное?', 'У фразі This phone is ___ після пропуску є іменник?', 'En This phone is ___, hay sustantivo después del hueco?'), options: ['да', 'нет'], correctIndex: 1, thenReturnToExerciseId: 'possessive_easy_002' },
      { id: 'guided_possessive_003', prompt: tri('Your bag или yours bag?', 'Your bag чи yours bag?', 'Your bag o yours bag?'), options: ['your bag', 'yours bag'], correctIndex: 0, thenReturnToExerciseId: 'possessive_easy_003' },
      { id: 'guided_possessive_004', prompt: tri("It's означает принадлежность или it is / it has?", "It's означає належність чи it is / it has?", "It's significa posesión o it is / it has?"), options: ['принадлежность', 'it is / it has'], correctIndex: 1, thenReturnToExerciseId: 'possessive_mixed_004' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'pronoun',
    microDiagnosisId: 'pronoun_possessive',
    diagnosisLabel: tri('My / Mine и другие притяжательные формы', 'My / Mine та інші присвійні форми', 'My / Mine y otras formas posesivas'),
    contrastSet: ['my/mine', 'your/yours', 'his', 'her/hers', 'our/ours', 'their/theirs', "its/it's"],
    focusWords: ['my', 'mine', 'your', 'yours', 'his', 'her', 'hers', 'our', 'ours', 'their', 'theirs', 'its'],
    focusPatterns: ['my_before_noun', 'mine_without_noun', 'your_before_noun', 'yours_without_noun', 'her_before_noun', 'hers_without_noun', 'our_before_noun', 'ours_without_noun', 'their_before_noun', 'theirs_without_noun', 'his_same_form_before_noun', 'his_same_form_without_noun', 'its_possessive', 'mixed_determiner_vs_pronoun', 'mixed_all_possessives'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_pronoun_possessive_start',
    answer: 'diagnosis_training_pronoun_possessive_answer',
    mastery: 'diagnosis_training_pronoun_possessive_mastery',
    fallback: 'diagnosis_training_pronoun_possessive_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'pronoun', microDiagnosisId: 'pronoun_possessive', contrastSet: ['my/mine', 'your/yours', 'his', 'her/hers', 'our/ours', 'their/theirs', "its/it's"], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logPossessiveType: true, logHasFollowingNoun: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=pronoun&microDiagnosisId=pronoun_possessive',
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


