// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.
import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = 'This training is available for this interface language.'): TriText => ({ ru, uk, es });

const CONTRAST = [
  'who for people',
  'which for things',
  'that for people or things',
  'subject relative clause',
  'object relative clause',
  'relative pronoun omission',
  'defining relative clause',
];

const SMART_CONTRAST = [
  'who for people',
  'which for things',
  'that for people or things',
  'whose',
  'relative clause word order',
  'object omission',
];

const option = (text: string) => ({ id: text, text });

function retry(_depth2: TriText, _depth3: TriText, _depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'Сначала найди слово перед пропуском: человек, вещь, идея или принадлежность. Потом выбирай who, which, that или whose.',
      'Спочатку знайди слово перед пропуском: людина, річ, ідея або належність. Потім обирай who, which, that або whose.',
      'First find the word before the gap: person, thing/idea, or possession. Then choose who, which, that, or whose.',
    ),
    tri(
      'Если это человек, чаще всего подходит who или that. Если вещь или идея, чаще which или that.',
      'Якщо це людина, найчастіше підходить who або that. Якщо річ чи ідея, частіше which або that.',
      'People often take who/that; things and ideas often take which/that.',
    ),
    tri(
      'Если речь о принадлежности, нужен whose. Если связь уже закрыта, не добавляй лишние he или it.',
      'Якщо йдеться про належність, потрібен whose. Якщо звʼязок уже закритий, не додавай зайві he або it.',
      'For possession, use whose. Do not repeat he/it when the role is already filled.',
    ),
    tri(
      'Выбирай связку по слову перед пропуском, а не по русскому переводу.',
      'Обирай звʼязку за словом перед пропуском, а не за перекладом.',
      'Choose by the word before the gap, not by translation.',
    ),
  ];
}

const DEFAULT_WRONG = (correctAnswer: string) =>
  tri(
    `Здесь нужен вариант ${correctAnswer}. Смотри не на русский перевод, а на слово перед пропуском.`,
    `Тут потрібен варіант ${correctAnswer}. Дивись не на переклад, а на слово перед пропуском.`,
    `Use ${correctAnswer}; choose by person, thing, idea, or possession.`,
  );

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
      'Такие фразы добавляют уточнение к слову перед пропуском. Для людей часто берем who или that. Для вещей и идей - which или that. Для принадлежности - whose.',
      'Такі фрази додають уточнення до слова перед пропуском. Для людей часто беремо who або that. Для речей та ідей - which або that. Для належності - whose.',
      'These phrases add extra detail to the word before the gap. People often take who/that, things and ideas take which/that, and possession takes whose.',
    ),
    microTask: tri(
      'Выбери слово, которое нормально соединяет две части фразы.',
      'Обери слово, яке нормально поєднує дві частини фрази.',
      'Choose the word or structure that connects the two parts correctly.',
    ),
    sentence: input.sentence,
    answerOptions: input.options.map(option),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((item) => item === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(
      input.options
        .filter((item) => item !== input.correctAnswer)
        .map((item) => [item, input.wrong[item] ?? DEFAULT_WRONG(input.correctAnswer)]),
    ),
    retryFeedback: retry(...input.retryFeedback),
    fallbackExplanation: tri(
      'Люди - who/that. Вещи и идеи - which/that. Принадлежность - whose. И не добавляй he или it, если эту роль уже закрыла первая часть фразы.',
      'Люди - who/that. Речі та ідеї - which/that. Належність - whose. І не додавай he або it, якщо цю роль уже закрила перша частина фрази.',
      'People = who/that. Things/ideas = which/that. Possession = whose. Do not repeat he/it when the first part already fills that role.',
    ),
    focusWords: input.focusWords,
  };
}

export const RELATIVE_CLAUSES_WHO_WHICH_THAT_TRAINING: DiagnosisTraining = {
  id: 'relative_clauses_who_which_that',
  category: 'syntax',
  version: '1.0.0',
  status: 'active',
  priority: 52,
  supportedLocales: ['ru', 'uk'],
  title: tri('Who / Which / That: соединяем фразу', 'Who / Which / That: поєднуємо фразу'),
  shortTitle: tri('Who / Which / That'),
  shortDiagnosis: tri(
    'Ты ставишь одно и то же слово везде. А английский смотрит: это человек, вещь, идея или принадлежность?',
    'Ти ставиш одне й те саме слово всюди. А англійська дивиться: це людина, річ, ідея чи належність?',
  ),
  diagnosisText: tri(
    'Ты путаешь who, which и that, потому что перевод часто выглядит одинаково. В английском выбор зависит от слова перед пропуском: человек, вещь, животное, идея или принадлежность.',
    'Ти плутаєш who, which і that, бо переклад часто виглядає однаково. В англійській вибір залежить від слова перед пропуском: людина, річ, тварина, ідея або належність.',
  ),
  mentalModel: tri(
    'Who обычно про людей: the man who called. Which обычно про вещи и идеи: the phone which broke. That часто работает и с людьми, и с вещами, когда уточнение важно для смысла.',
    'Who зазвичай про людей: the man who called. Which зазвичай про речі та ідеї: the phone which broke. That часто працює і з людьми, і з речами, коли уточнення важливе для сенсу.',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'Люди: who или that. The woman who helped me. Вещи и идеи: which или that. The app which helps me. Whose показывает принадлежность.',
    'Люди: who або that. The woman who helped me. Речі та ідеї: which або that. The app which helps me. Whose показує належність.',
  ),
  whatUserMustLearn: {
    ru: [
      'Who часто ставим для людей: the man who called.',
      'Which часто ставим для вещей, животных, идей и ситуаций.',
      'That может работать с людьми и вещами, когда уточнение важно для смысла.',
      'Не повторяй he/it после who/which/that, если роль уже занята.',
      'В фразе the book I bought слово that можно опустить.',
      'Если после пропуска сразу идет действие, связка обычно нужна.',
      'Who не базовый выбор для обычных вещей.',
      'Which не базовый выбор для людей.',
      'That обычно не ставим после запятой в строгой норме.',
      'Whose = чей / у которого.',
    ],
    uk: [
      'Who часто ставимо для людей: the man who called.',
      'Which часто ставимо для речей, тварин, ідей та ситуацій.',
      'That може працювати з людьми і речами, коли уточнення важливе для сенсу.',
      'Не повторюй he/it після who/which/that, якщо роль уже зайнята.',
      'У фразі the book I bought слово that можна опустити.',
      'Якщо після пропуску одразу йде дія, звʼязка зазвичай потрібна.',
      'Who не базовий вибір для звичайних речей.',
      'Which не базовий вибір для людей.',
      'That зазвичай не ставимо після коми у строгій нормі.',
      'Whose = чий / у якого.',
    ],
    es: [
      'Who is often for people.',
      'Which is often for things, animals, ideas, and situations.',
      'That can work with people and things when the detail is essential.',
      'Do not repeat he/it after who/which/that when the role is already filled.',
      'In the phrase the book I bought, that can be left out.',
      'If action comes right after the gap, the connector is usually needed.',
      'Who is not the basic choice for ordinary things.',
      'Which is not the basic choice for people.',
      'That is usually not used after a comma in strict usage.',
      'Whose means possession.',
    ],
  },
  examples: [
    { en: 'The man who called you is here.', ru: 'The man who called you is here.', uk: 'The man who called you is here.', es: 'The man who called you is here.', why: tri('Man - человек, поэтому who звучит естественно.', 'Man - людина, тому who звучить природно.') },
    { en: 'The book which helped me is on the table.', ru: 'The book which helped me is on the table.', uk: 'The book which helped me is on the table.', es: 'The book which helped me is on the table.', why: tri('Book - вещь, поэтому which работает.', 'Book - річ, тому which працює.') },
    { en: 'The book that helped me is on the table.', ru: 'The book that helped me is on the table.', uk: 'The book that helped me is on the table.', es: 'The book that helped me is on the table.', why: tri('That может заменить which в таком важном уточнении.', 'That може замінити which у такому важливому уточненні.') },
    { en: 'The person that I met yesterday was very kind.', ru: 'The person that I met yesterday was very kind.', uk: 'The person that I met yesterday was very kind.', es: 'The person that I met yesterday was very kind.', why: tri('That соединяет person и I met yesterday.', 'That поєднує person та I met yesterday.') },
    { en: 'The phone that I bought is expensive.', ru: 'The phone that I bought is expensive.', uk: 'The phone that I bought is expensive.', es: 'The phone that I bought is expensive.', why: tri('Phone - вещь, и that здесь работает.', 'Phone - річ, і that тут працює.') },
    { en: 'The phone I bought is expensive.', ru: 'The phone I bought is expensive.', uk: 'The phone I bought is expensive.', es: 'The phone I bought is expensive.', why: tri('Здесь that можно не произносить.', 'Тут that можна не вимовляти.') },
    { en: 'I know a woman whose son lives in Cork.', ru: 'I know a woman whose son lives in Cork.', uk: 'I know a woman whose son lives in Cork.', es: 'I know a woman whose son lives in Cork.', why: tri('Whose показывает связь: whose son.', 'Whose показує звʼязок: whose son.') },
    { en: 'My brother, who lives in Dublin, is a doctor.', ru: 'My brother, who lives in Dublin, is a doctor.', uk: 'My brother, who lives in Dublin, is a doctor.', es: 'My brother, who lives in Dublin, is a doctor.', why: tri('После запятой про человека в строгой норме берем who, не that.', 'Після коми про людину у строгій нормі беремо who, не that.') },
  ],
  introBlocks: [
    {
      id: 'intro_problem',
      type: 'diagnosis',
      text: tri(
        'Возможно, ты переводишь все эти фразы одним словом. Но в английском сначала смотрим на слово перед пропуском: человек, вещь, идея или принадлежность.',
        'Можливо, ти перекладаєш усі ці фрази одним словом. Але в англійській спочатку дивимося на слово перед пропуском: людина, річ, ідея або належність.',
      ),
    },
    { id: 'intro_rule', type: 'rule', text: tri('Люди - who/that. Вещи и идеи - which/that. Принадлежность - whose.', 'Люди - who/that. Речі та ідеї - which/that. Належність - whose.') },
    { id: 'intro_warning', type: 'warning', text: tri('Главные ловушки: выбрать слово не по типу существительного или повторить лишнее местоимение после связки.', 'Головні пастки: вибрати слово не за типом іменника або повторити зайвий займенник після звʼязки.') },
  ],
  steps: [
    step({ id: 'relative_easy_001', order: 1, difficulty: 'easy', targetSkill: 'who_person_called', sentence: 'The man ___ called you is here.', translation: tri('The man who called you is here.'), options: ['who', 'which', 'where', 'what'], correctAnswer: 'who', correctFeedback: tri('Да. Man - человек, поэтому who.', 'Так. Man - людина, тому who.'), wrong: { which: tri('Which не базовый выбор для человека. Здесь нужно who.', 'Which не базовий вибір для людини. Тут потрібно who.'), where: tri('Where для места. Здесь слово man, поэтому who.', 'Where для місця. Тут слово man, тому who.'), what: tri('What здесь не соединяет man и called you. Нужно who.', 'What тут не поєднує man і called you. Потрібно who.') }, retryFeedback: [tri('Man - человек. Значит, who.', 'Man - людина. Отже, who.'), tri('Кусок фразы: The man who called you.', 'Шматок фрази: The man who called you.'), tri('Подсказка: The man who called you is here.', 'Підказка: The man who called you is here.')], focusWords: ['man who'] }),
    step({ id: 'relative_easy_002', order: 2, difficulty: 'easy', targetSkill: 'who_woman_helped', sentence: 'The woman ___ helped me was very kind.', translation: tri('The woman who helped me was very kind.'), options: ['who', 'which', 'where', 'whose'], correctAnswer: 'who', correctFeedback: tri('Да. Woman - человек. Берем who.', 'Так. Woman - людина. Беремо who.'), wrong: { which: tri('Which не лучший базовый выбор для человека. Нужно who.', 'Which не найкращий базовий вибір для людини. Потрібно who.'), where: tri('Where для мест, а woman - человек.', 'Where для місць, а woman - людина.'), whose: tri('Whose показывает принадлежность. Здесь нужно who helped.', 'Whose показує належність. Тут потрібно who helped.') }, retryFeedback: [tri('Woman - человек. Значит, who.', 'Woman - людина. Отже, who.'), tri('Кусок фразы: The woman who helped me.', 'Шматок фрази: The woman who helped me.'), tri('Подсказка: The woman who helped me was very kind.', 'Підказка: The woman who helped me was very kind.')], focusWords: ['woman who'] }),
    step({ id: 'relative_easy_003', order: 3, difficulty: 'easy', targetSkill: 'person_who_lives', sentence: 'I know a person ___ lives near you.', translation: tri('I know a person who lives near you.'), options: ['who', 'which', 'where', 'what'], correctAnswer: 'who', correctFeedback: tri('Да. Person просит who.', 'Так. Person просить who.'), wrong: { which: tri('Which не базовый выбор для person. Нужно who.', 'Which не базовий вибір для person. Потрібно who.'), where: tri('Where для мест. Person просит who.', 'Where для місць. Person просить who.'), what: tri('What здесь не работает. Нужно who.', 'What тут не працює. Потрібно who.') }, retryFeedback: [tri('Person - человек. Значит, who.', 'Person - людина. Отже, who.'), tri('Кусок фразы: a person who lives near you.', 'Шматок фрази: a person who lives near you.'), tri('Подсказка: I know a person who lives near you.', 'Підказка: I know a person who lives near you.')], focusWords: ['person who'] }),
    step({ id: 'relative_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'which_book_helped', sentence: 'The book ___ helped me is on the table.', translation: tri('The book which helped me is on the table.'), options: ['which', 'who', 'where', 'whose'], correctAnswer: 'which', correctFeedback: tri('Да. Book - вещь, поэтому which работает.', 'Так. Book - річ, тому which працює.'), wrong: { who: tri('Who для людей. Book - вещь, нужно which.', 'Who для людей. Book - річ, потрібно which.'), where: tri('Where для мест. Book - вещь, нужно which.', 'Where для місць. Book - річ, потрібно which.'), whose: tri('Whose показывает принадлежность. Здесь нужно which helped.', 'Whose показує належність. Тут потрібно which helped.') }, retryFeedback: [tri('Book - вещь. Значит, which.', 'Book - річ. Отже, which.'), tri('Кусок фразы: The book which helped me.', 'Шматок фрази: The book which helped me.'), tri('Подсказка: The book which helped me is on the table.', 'Підказка: The book which helped me is on the table.')], focusWords: ['book which'] }),
    step({ id: 'relative_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'which_phone_broke', sentence: 'The phone ___ broke was new.', translation: tri('The phone which broke was new.'), options: ['which', 'who', 'where', 'what'], correctAnswer: 'which', correctFeedback: tri('Да. Phone - вещь. Берем which.', 'Так. Phone - річ. Беремо which.'), wrong: { who: tri('Who для людей. Phone - вещь, поэтому which.', 'Who для людей. Phone - річ, тому which.'), where: tri('Where для мест, не для phone.', 'Where для місць, не для phone.'), what: tri('What не соединяет phone и broke. Нужно which.', 'What не поєднує phone і broke. Потрібно which.') }, retryFeedback: [tri('Phone - вещь. Значит, which.', 'Phone - річ. Отже, which.'), tri('Кусок фразы: The phone which broke.', 'Шматок фрази: The phone which broke.'), tri('Подсказка: The phone which broke was new.', 'Підказка: The phone which broke was new.')], focusWords: ['phone which'] }),
    step({ id: 'relative_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'which_idea_works', sentence: 'I like the idea ___ works in real life.', translation: tri('I like the idea which works in real life.'), options: ['which', 'who', 'where', 'whose'], correctAnswer: 'which', correctFeedback: tri('Да. Idea - не человек. Берем which.', 'Так. Idea - не людина. Беремо which.'), wrong: { who: tri('Who для людей. Idea просит which или that.', 'Who для людей. Idea просить which або that.'), where: tri('Where для мест. Idea - идея, поэтому which.', 'Where для місць. Idea - ідея, тому which.'), whose: tri('Whose показывает принадлежность. Здесь нужно which.', 'Whose показує належність. Тут потрібно which.') }, retryFeedback: [tri('Idea - идея. Значит, which.', 'Idea - ідея. Отже, which.'), tri('Кусок фразы: the idea which works.', 'Шматок фрази: the idea which works.'), tri('Подсказка: I like the idea which works in real life.', 'Підказка: I like the idea which works in real life.')], focusWords: ['idea which'] }),
    step({ id: 'relative_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'that_person_met', sentence: 'The person ___ I met yesterday was very kind.', translation: tri('The person that I met yesterday was very kind.'), options: ['that', 'where', 'what', 'whose'], correctAnswer: 'that', correctFeedback: tri('Да. That работает для важного уточнения про человека: the person that I met.', 'Так. That працює для важливого уточнення про людину: the person that I met.'), wrong: { where: tri('Where для мест. Person - человек.', 'Where для місць. Person - людина.'), what: tri('What не соединяет person и I met. Нужно that или who.', 'What не поєднує person і I met. Потрібно that або who.'), whose: tri('Whose показывает принадлежность. Здесь нужно that I met.', 'Whose показує належність. Тут потрібно that I met.') }, retryFeedback: [tri('Person + I met = that I met.', 'Person + I met = that I met.'), tri('Кусок фразы: The person that I met.', 'Шматок фрази: The person that I met.'), tri('Подсказка: The person that I met yesterday was very kind.', 'Підказка: The person that I met yesterday was very kind.')], focusWords: ['person that I met'] }),
    step({ id: 'relative_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'that_phone_bought', sentence: 'The phone ___ I bought is expensive.', translation: tri('The phone that I bought is expensive.'), options: ['that', 'who', 'where', 'whose'], correctAnswer: 'that', correctFeedback: tri('Да. That работает для важного уточнения про вещь: the phone that I bought.', 'Так. That працює для важливого уточнення про річ: the phone that I bought.'), wrong: { who: tri('Who для людей. Phone - вещь.', 'Who для людей. Phone - річ.'), where: tri('Where для мест. Здесь слово phone.', 'Where для місць. Тут слово phone.'), whose: tri('Whose показывает принадлежность. Здесь нужно that I bought.', 'Whose показує належність. Тут потрібно that I bought.') }, retryFeedback: [tri('Phone + I bought = that I bought.', 'Phone + I bought = that I bought.'), tri('Кусок фразы: The phone that I bought.', 'Шматок фрази: The phone that I bought.'), tri('Подсказка: The phone that I bought is expensive.', 'Підказка: The phone that I bought is expensive.')], focusWords: ['phone that I bought'] }),
    step({ id: 'relative_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'that_people_things_pair', sentence: 'Choose the correct pair.', translation: tri('the person that I met / the phone that I bought'), options: ['the person that I met / the phone that I bought', 'the person where I met / the phone who I bought', 'the person what I met / the phone what I bought', 'the person whose I met / the phone whose I bought'], correctAnswer: 'the person that I met / the phone that I bought', correctFeedback: tri('Да. That может работать и с person, и с phone в таких важных уточнениях.', 'Так. That може працювати і з person, і з phone у таких важливих уточненнях.'), wrong: { 'the person where I met / the phone who I bought': tri('Where для мест, а who не подходит для phone.', 'Where для місць, а who не підходить для phone.'), 'the person what I met / the phone what I bought': tri('What так не ставим после person/phone. Нужно that.', 'What так не ставимо після person/phone. Потрібно that.'), 'the person whose I met / the phone whose I bought': tri('Whose показывает принадлежность, а здесь не она.', 'Whose показує належність, а тут не вона.') }, retryFeedback: [tri('Нужная пара: person that I met / phone that I bought.', 'Потрібна пара: person that I met / phone that I bought.'), tri('Целиком: The person that I met / the phone that I bought.', 'Повністю: The person that I met / the phone that I bought.'), tri('Подсказка: the person that I met / the phone that I bought.', 'Підказка: the person that I met / the phone that I bought.')], focusWords: ['person that', 'phone that'] }),
    step({ id: 'relative_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'no_duplicate_subject', sentence: 'Choose the correct sentence.', translation: tri('The man who called you is here.'), options: ['The man who called you is here.', 'The man who he called you is here.', 'The man which called you is here.', 'The man what called you is here.'], correctAnswer: 'The man who called you is here.', correctFeedback: tri('Да. Who уже делает действие called. He не нужен.', 'Так. Who вже робить дію called. He не потрібен.'), wrong: { 'The man who he called you is here.': tri('После who не добавляй he, когда who уже делает действие.', 'Після who не додавай he, коли who вже робить дію.'), 'The man which called you is here.': tri('Man - человек, поэтому who лучше, не which.', 'Man - людина, тому who краще, не which.'), 'The man what called you is here.': tri('What здесь не работает. Нужно who.', 'What тут не працює. Потрібно who.') }, retryFeedback: [tri('Who called. Не who he called.', 'Who called. Не who he called.'), tri('Правильный кусок: The man who called you.', 'Правильний шматок: The man who called you.'), tri('Подсказка: The man who called you is here.', 'Підказка: The man who called you is here.')], focusWords: ['who called'] }),
    step({ id: 'relative_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'object_relative_omission', sentence: 'Choose the correct sentence.', translation: tri('The phone I bought is expensive.'), options: ['The phone I bought is expensive.', 'The phone bought I is expensive.', 'The phone who I bought is expensive.', 'The phone I bought it is expensive.'], correctAnswer: 'The phone I bought is expensive.', correctFeedback: tri('Да. Здесь that можно опустить: the phone I bought.', 'Так. Тут that можна опустити: the phone I bought.'), wrong: { 'The phone bought I is expensive.': tri('Порядок должен быть I bought, не bought I.', 'Порядок має бути I bought, не bought I.'), 'The phone who I bought is expensive.': tri('Who для людей. Phone - вещь.', 'Who для людей. Phone - річ.'), 'The phone I bought it is expensive.': tri('Не повторяй it. Phone уже связано с bought.', 'Не повторюй it. Phone уже повʼязане з bought.') }, retryFeedback: [tri('The phone I bought. Без it.', 'The phone I bought. Без it.'), tri('Целиком: The phone I bought is expensive.', 'Повністю: The phone I bought is expensive.'), tri('Подсказка: The phone I bought is expensive.', 'Підказка: The phone I bought is expensive.')], focusWords: ['phone I bought'] }),
    step({ id: 'relative_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'subject_relative_not_omit', sentence: 'Choose the clearest sentence.', translation: tri('The book that helped me is on the table.'), options: ['The book that helped me is on the table.', 'The book helped me is on the table.', 'The book who helped me is on the table.', 'The book that it helped me is on the table.'], correctAnswer: 'The book that helped me is on the table.', correctFeedback: tri('Да. That здесь нужно, чтобы фраза читалась чисто.', 'Так. That тут потрібне, щоб фраза читалася чисто.'), wrong: { 'The book helped me is on the table.': tri('Без that фраза ломается. Нужно: The book that helped me.', 'Без that фраза ламається. Потрібно: The book that helped me.'), 'The book who helped me is on the table.': tri('Book - вещь, поэтому who не подходит.', 'Book - річ, тому who не підходить.'), 'The book that it helped me is on the table.': tri('That уже соединяет часть фразы; it лишнее.', 'That уже поєднує частину фрази; it зайве.') }, retryFeedback: [tri('Book that helped. Не that it helped.', 'Book that helped. Не that it helped.'), tri('Правильный кусок: The book that helped me.', 'Правильний шматок: The book that helped me.'), tri('Подсказка: The book that helped me is on the table.', 'Підказка: The book that helped me is on the table.')], focusWords: ['book that helped'] }),
    step({ id: 'relative_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'whose_possession', sentence: 'I know a woman ___ son lives in Cork.', translation: tri('I know a woman whose son lives in Cork.'), options: ['whose', 'who', 'which', 'that'], correctAnswer: 'whose', correctFeedback: tri('Да. Whose показывает связь: whose son.', 'Так. Whose показує звʼязок: whose son.'), wrong: { who: tri('Who про человека, но здесь нужно whose son.', 'Who про людину, але тут потрібно whose son.'), which: tri('Which не показывает принадлежность. Нужно whose.', 'Which не показує належність. Потрібно whose.'), that: tri('That не значит whose. Нужно whose.', 'That не означає whose. Потрібно whose.') }, retryFeedback: [tri('Принадлежность - whose.', 'Належність - whose.'), tri('Кусок фразы: a woman whose son lives in Cork.', 'Шматок фрази: a woman whose son lives in Cork.'), tri('Подсказка: I know a woman whose son lives in Cork.', 'Підказка: I know a woman whose son lives in Cork.')], focusWords: ['whose son'] }),
    step({ id: 'relative_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'comma_who_not_that', sentence: 'My brother, ___ lives in Dublin, is a doctor.', translation: tri('My brother, who lives in Dublin, is a doctor.'), options: ['who', 'that', 'which', 'what'], correctAnswer: 'who', correctFeedback: tri('Да. После запятой про человека в строгой норме нужно who, не that.', 'Так. Після коми про людину у строгій нормі потрібно who, не that.'), wrong: { that: tri('That обычно не ставим после запятой в такой фразе. Нужно who.', 'That зазвичай не ставимо після коми в такій фразі. Потрібно who.'), which: tri('Brother - человек, поэтому who.', 'Brother - людина, тому who.'), what: tri('What здесь не подходит после brother. Нужно who.', 'What тут не підходить після brother. Потрібно who.') }, retryFeedback: [tri('Человек после запятой - who.', 'Людина після коми - who.'), tri('Кусок фразы: My brother, who lives in Dublin.', 'Шматок фрази: My brother, who lives in Dublin.'), tri('Подсказка: My brother, who lives in Dublin, is a doctor.', 'Підказка: My brother, who lives in Dublin, is a doctor.')], focusWords: ['brother who'] }),
    step({ id: 'relative_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('The person that I met yesterday showed me the app that he created.'), options: ['The person that I met yesterday showed me the app that he created.', 'The person where I met yesterday showed me the app who he created.', 'The person that I met him yesterday showed me the app that he created it.', 'The person which I met yesterday showed me the app whose he created.'], correctAnswer: 'The person that I met yesterday showed me the app that he created.', correctFeedback: tri('Да. That I met и that he created соединяют фразу без лишних him/it.', 'Так. That I met і that he created поєднують фразу без зайвих him/it.'), wrong: { 'The person where I met yesterday showed me the app who he created.': tri('Where не подходит для person, а who не подходит для app.', 'Where не підходить для person, а who не підходить для app.'), 'The person that I met him yesterday showed me the app that he created it.': tri('Him и it лишние. Person/app уже связаны с действиями.', 'Him і it зайві. Person/app уже повʼязані з діями.'), 'The person which I met yesterday showed me the app whose he created.': tri('Which не подходит для person, а whose не значит the app he created.', 'Which не підходить для person, а whose не означає the app he created.') }, retryFeedback: [tri('Нужные куски: person that I met / app that he created.', 'Потрібні шматки: person that I met / app that he created.'), tri('Целиком: The person that I met showed me the app that he created.', 'Повністю: The person that I met showed me the app that he created.'), tri('Подсказка: The person that I met yesterday showed me the app that he created.', 'Підказка: The person that I met yesterday showed me the app that he created.')], focusWords: ['person that I met', 'app that he created'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['who_for_thing_error', 'which_for_person_error', 'duplicate_subject_error', 'wrong_relative_pronoun_error', 'object_relative_omission_confusion', 'subject_relative_omission_error', 'whose_confusion_error', 'that_after_comma_error', 'relative_clause_word_order_error'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: смотрим на слово перед пропуском и выбираем who, which или that.', 'Звичайне пояснення: дивимося на слово перед пропуском і обираємо who, which або that.'),
    depth2: tri('Проще: это человек или вещь/идея?', 'Простіше: це людина чи річ/ідея?'),
    depth3: tri('Еще проще: человек просит одну группу связок, вещь или идея - другую, принадлежность - whose.', 'Ще простіше: людина просить одну групу звʼязок, річ або ідея - іншу, належність - whose.'),
    depth4: tri('Почти подсказка: проговори нужную связку вслух.', 'Майже підказка: проговори потрібну звʼязку вголос.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Найди слово перед пропуском. Человек - who/that. Вещь или идея - which/that. Принадлежность - whose. Не повторяй he/it, если роль уже занята.', 'Знайди слово перед пропуском. Людина - who/that. Річ або ідея - which/that. Належність - whose. Не повторюй he/it, якщо роль уже зайнята.') },
    afterThreeWrongInSameExercise: { action: 'show_noun_type_hint_then_retry', card: tri('Подсказка: система покажет, что перед пропуском - человек, вещь, идея или принадлежность. Но слово ты выбираешь сам.', 'Підказка: система покаже, що перед пропуском - людина, річ, ідея або належність. Але слово ти обираєш сам.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Guided mode: сначала выбери тип слова перед пропуском. Потом вернемся к полной фразе.', 'Guided mode: спочатку обери тип слова перед пропуском. Потім повернемося до повної фрази.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_relative_001', prompt: tri('Man: это человек или вещь?', 'Man: це людина чи річ?'), options: ['person', 'thing'], correctIndex: 0, thenReturnToExerciseId: 'relative_easy_001' },
      { id: 'guided_relative_002', prompt: tri('Phone: это человек или вещь?', 'Phone: це людина чи річ?'), options: ['person', 'thing'], correctIndex: 1, thenReturnToExerciseId: 'relative_contrast_002' },
      { id: 'guided_relative_003', prompt: tri('В the man who called нужно повторять he после who?', 'У the man who called треба повторювати he після who?'), options: ['yes', 'no'], correctIndex: 1, thenReturnToExerciseId: 'relative_mixed_001' },
      { id: 'guided_relative_004', prompt: tri('Whose означает принадлежность?', 'Whose означає належність?'), options: ['yes', 'no'], correctIndex: 0, thenReturnToExerciseId: 'relative_mixed_004' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'syntax',
    microDiagnosisId: 'relative_clauses_who_which_that',
    diagnosisLabel: tri('Who / Which / That'),
    contrastSet: SMART_CONTRAST,
    difficultyLevel: 2,
    focusWords: ['who', 'which', 'that', 'whose', 'the man who', 'the phone that'],
    focusPatterns: ['who_person_called', 'who_woman_helped', 'person_who_lives', 'which_book_helped', 'which_phone_broke', 'which_idea_works', 'that_person_met', 'that_phone_bought', 'that_people_things_pair', 'no_duplicate_subject', 'object_relative_omission', 'subject_relative_not_omit', 'whose_possession', 'comma_who_not_that', 'mixed_sentence_correction'],
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
    payload: { category: 'syntax', microDiagnosisId: 'relative_clauses_who_which_that', contrastSet: ['who', 'which', 'that', 'whose', 'relative clause'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logNounType: true, logRelativePronoun: true, logClauseRole: true, logOmissionAllowed: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=syntax&microDiagnosisId=relative_clauses_who_which_that',
    problemCoachRoute: '/problem_coach?category=syntax&microDiagnosisId=relative_clauses_who_which_that',
    fallbackIfTrainingMissing: '/problem_coach?category=syntax',
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
