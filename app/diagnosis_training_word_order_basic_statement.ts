import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = [
  'subject',
  'verb',
  'object',
  'place',
  'time',
  'adverb position',
  'Russian/Ukrainian flexible order',
];

const SMART_CONTRAST = ['subject', 'verb', 'object', 'place', 'time', 'adverb position'];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'Сначала найди subject и verb. Потом поставь object, place и time. В обычной фразе английский держит каркас: кто + делает + что.',
      'Спочатку знайди subject і verb. Потім постав object, place і time. У звичайній фразі англійська тримає каркас: хто + робить + що.',
      'First find the subject and verb. Then add object, place, and time.',
    ),
    depth2,
    depth3,
    depth4,
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Здесь нужен базовый порядок: ${correct} Сначала subject, потом verb, потом object/place/time.`,
    `Тут потрібен базовий порядок: ${correct} Спочатку subject, потім verb, потім object/place/time.`,
    `Use the basic order: ${correct}`,
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
      'В английском утверждении порядок слов обычно жесткий: subject + verb + object. Place и time добавляются после основной части или time может стоять в начале.',
      'В англійському ствердженні порядок слів зазвичай жорсткий: subject + verb + object. Place і time додаються після основної частини або time може стояти на початку.',
      'English statements usually keep a fixed order: subject + verb + object, then place/time.',
    ),
    microTask: tri(
      'Выбери предложение с нейтральным английским порядком слов.',
      'Обери речення з нейтральним англійським порядком слів.',
      'Choose the sentence with natural English word order.',
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
      'Правило-скелет: subject + verb + object. Потом place. Потом time. Time можно поставить в начало, но внутри основной части порядок не меняется.',
      'Правило-скелет: subject + verb + object. Потім place. Потім time. Time можна поставити на початок, але всередині основної частини порядок не змінюється.',
      'Core rule: subject + verb + object, then place, then time. Time can go first, but the main clause stays the same.',
    ),
    focusWords: input.focusWords,
  };
}

export const WORD_ORDER_BASIC_STATEMENT_TRAINING: DiagnosisTraining = {
  id: 'word_order_basic_statement',
  category: 'syntax',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 31,
  supportedLocales: ['ru', 'uk'],
  title: tri('Word Order: кто делает что', 'Word Order: хто робить що', 'Word Order: who does what'),
  shortTitle: tri('Basic Word Order', 'Basic Word Order', 'Basic Word Order'),
  shortDiagnosis: tri(
    'Ты путаешь базовый порядок слов в английском утверждении.',
    'Ти плутаєш базовий порядок слів в англійському ствердженні.',
    'You are mixing basic English statement word order.',
  ),
  diagnosisText: tri(
    'Ты путаешь базовый порядок слов в английском утверждении. Главная проблема в том, что в русском и украинском порядок слов может быть гибче, а английский обычно требует жесткий каркас: subject + verb + object/place/time.',
    'Ти плутаєш базовий порядок слів в англійському ствердженні. Головна проблема в тому, що в українській і російській порядок слів може бути гнучкішим, а англійська зазвичай потребує жорсткий каркас: subject + verb + object/place/time.',
    'English statements usually need a fixed frame: subject + verb + object/place/time.',
  ),
  mentalModel: tri(
    'Английское утверждение обычно начинается с того, кто делает действие. Потом идет действие. Потом объект или место. I drink coffee. She reads a book. They live in Dublin.',
    'Англійське ствердження зазвичай починається з того, хто робить дію. Потім іде дія. Потім object або place. I drink coffee. She reads a book. They live in Dublin.',
    'A normal English statement starts with who does the action, then the action, then the object/place.',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'Базовый порядок: subject + verb + object. I like English. She drinks coffee. We study grammar. Место обычно после объекта: I read books at home. Время часто в конце или начале: I work every day.',
    'Базовий порядок: subject + verb + object. I like English. She drinks coffee. We study grammar. Place зазвичай після object: I read books at home. Time часто в кінці або на початку: I work every day.',
    'Basic order: subject + verb + object. Place usually follows the object. Time often goes at the end or beginning.',
  ),
  whatUserMustLearn: {
    ru: [
      'В английском утверждении обычно сначала идет subject: I, you, he, she, we, they, my friend.',
      'После subject обычно идет verb: I work, she studies, they live.',
      'После verb часто идет object: I like coffee, she reads books.',
      'Нельзя начинать обычное утверждение с object, если нет специального акцента.',
      'Место обычно идет после object: I read books at home.',
      'Время часто ставится в конце или в начале: I work every day / Every day, I work.',
      'Adverb of frequency обычно стоит перед обычным глаголом: I usually work.',
      'После be adverb of frequency часто стоит после be: She is always late.',
      'Русский порядок “Кофе я люблю” нельзя автоматически переносить как Coffee I like.',
      'Чтобы звучать естественно, держи каркас: кто + делает + что/где/когда.',
    ],
    uk: [
      'В англійському ствердженні зазвичай спочатку йде subject: I, you, he, she, we, they, my friend.',
      'Після subject зазвичай іде verb: I work, she studies, they live.',
      'Після verb часто йде object: I like coffee, she reads books.',
      'Не можна починати звичайне ствердження з object, якщо немає спеціального акценту.',
      'Place зазвичай іде після object: I read books at home.',
      'Time часто ставиться в кінці або на початку: I work every day / Every day, I work.',
      'Adverb of frequency зазвичай стоїть перед звичайним дієсловом: I usually work.',
      'Після be adverb of frequency часто стоїть після be: She is always late.',
      'Український порядок “Каву я люблю” не можна автоматично переносити як Coffee I like.',
      'Щоб звучати природно, тримай каркас: хто + робить + що/де/коли.',
    ],
    es: [
      'Start normal statements with the subject.',
      'Put the verb after the subject.',
      'Put the object after the verb.',
      'Put place after the object and time at the end or beginning.',
    ],
  },
  examples: [
    { en: 'I like coffee.', ru: 'Я люблю кофе.', uk: 'Я люблю каву.', es: 'I like coffee.', why: tri('Базовый порядок: subject I + verb like + object coffee.', 'Базовий порядок: subject I + verb like + object coffee.', 'Subject + verb + object.') },
    { en: 'She reads books at home.', ru: 'Она читает книги дома.', uk: 'Вона читає книжки вдома.', es: 'She reads books at home.', why: tri('Subject she идет первым, потом verb reads, потом object books, потом place at home.', 'Subject she іде першим, потім verb reads, потім object books, потім place at home.', 'Subject, verb, object, place.') },
    { en: 'They live in Dublin.', ru: 'Они живут в Дублине.', uk: 'Вони живуть у Дубліні.', es: 'They live in Dublin.', why: tri('They = subject. Live = verb. In Dublin = place после глагола.', 'They = subject. Live = verb. In Dublin = place після дієслова.', 'Subject, verb, place.') },
    { en: 'My friend works every day.', ru: 'Мой друг работает каждый день.', uk: 'Мій друг працює щодня.', es: 'My friend works every day.', why: tri('My friend - subject, works - verb, every day - time marker в конце.', 'My friend - subject, works - verb, every day - time marker у кінці.', 'Time is at the end.') },
    { en: 'We usually study in the evening.', ru: 'Мы обычно учимся вечером.', uk: 'Ми зазвичай вчимося ввечері.', es: 'We usually study in the evening.', why: tri('Usually стоит перед обычным verb study.', 'Usually стоїть перед звичайним verb study.', 'Frequency adverb before main verb.') },
    { en: 'She is always busy.', ru: 'Она всегда занята.', uk: 'Вона завжди зайнята.', es: 'She is always busy.', why: tri('После be adverb always стоит после is: is always busy.', 'Після be adverb always стоїть після is: is always busy.', 'Frequency adverb after be.') },
    { en: 'I watched a film yesterday.', ru: 'Я посмотрел фильм вчера.', uk: 'Я подивився фільм учора.', es: 'I watched a film yesterday.', why: tri('Subject + verb + object + time.', 'Subject + verb + object + time.', 'Time is at the end.') },
    { en: 'Every morning, he drinks tea.', ru: 'Каждое утро он пьет чай.', uk: "Щоранку він п'є чай.", es: 'Every morning, he drinks tea.', why: tri('Time marker может стоять в начале, но внутри основной части порядок остается he + drinks + tea.', 'Time marker може стояти на початку, але всередині основної частини порядок залишається he + drinks + tea.', 'Time can go first; main clause still uses SVO.') },
  ],
  introBlocks: [
    {
      id: 'intro_problem',
      type: 'diagnosis',
      text: tri(
        'Похоже, ты иногда строишь английское предложение по русской или украинской логике. Но английский не любит хаос в утверждениях. Ему нужен каркас: кто делает что.',
        'Схоже, ти іноді будуєш англійське речення за українською або російською логікою. Але англійська не любить хаос у ствердженнях. Їй потрібен каркас: хто робить що.',
        'You may be building English statements with flexible native-language word order.',
      ),
    },
    { id: 'intro_rule', type: 'rule', text: tri('Базовый каркас: subject + verb + object. Потом место. Потом время. I read books at home every evening.', 'Базовий каркас: subject + verb + object. Потім place. Потім time. I read books at home every evening.', 'Basic frame: subject + verb + object, then place, then time.') },
    { id: 'intro_warning', type: 'warning', text: tri('Не начинай обычную фразу с object по логике “Кофе я люблю”. В английском базово: I like coffee.', 'Не починай звичайну фразу з object за логікою “Каву я люблю”. В англійській базово: I like coffee.', 'Do not start a normal statement with the object.') },
  ],
  steps: [
    step({ id: 'word_order_easy_001', order: 1, difficulty: 'easy', targetSkill: 'subject_verb_object', sentence: 'Choose the correct sentence.', translation: tri('Я люблю кофе.', 'Я люблю каву.', 'I like coffee.'), options: ['I like coffee.', 'Coffee I like.', 'Like I coffee.', 'I coffee like.'], correctAnswer: 'I like coffee.', correctFeedback: tri('Да. Базовый порядок: subject I + verb like + object coffee.', 'Так. Базовий порядок: subject I + verb like + object coffee.', 'Yes. Subject + verb + object.'), wrong: { 'Coffee I like.': tri('Object coffee поставлен первым. В обычном английском утверждении начинаем с subject: I like coffee.', 'Object coffee поставлено першим. У звичайному англійському ствердженні починаємо з subject: I like coffee.', 'The object is first. Use I like coffee.'), 'Like I coffee.': tri('Verb like поставлен перед subject. В утверждении нужен порядок I like coffee.', 'Verb like поставлено перед subject. У ствердженні потрібен порядок I like coffee.', 'The verb is before the subject.'), 'I coffee like.': tri('Object coffee стоит перед verb. Нужно subject + verb + object: I like coffee.', 'Object coffee стоїть перед verb. Потрібно subject + verb + object: I like coffee.', 'Put the verb before the object.') }, retryFeedback: [tri('Кто? I. Что делает? like. Что? coffee.', 'Хто? I. Що робить? like. Що? coffee.', 'Who? I. Does what? like. What? coffee.'), tri('I + like + coffee.'), tri('Подсказка: I like coffee.', 'Підказка: I like coffee.', 'Hint: I like coffee.')], focusWords: ['I', 'like', 'coffee'] }),
    step({ id: 'word_order_easy_002', order: 2, difficulty: 'easy', targetSkill: 'subject_verb_object', sentence: 'Choose the correct sentence.', translation: tri('Она читает книги.', 'Вона читає книжки.', 'She reads books.'), options: ['She reads books.', 'Books she reads.', 'Reads she books.', 'She books reads.'], correctAnswer: 'She reads books.', correctFeedback: tri('Да. Subject she + verb reads + object books.', 'Так. Subject she + verb reads + object books.', 'Yes. Subject + verb + object.'), wrong: { 'Books she reads.': tri('Books поставлено первым по гибкой логике перевода. Базово нужно She reads books.', 'Books поставлено першим за гнучкою логікою перекладу. Базово потрібно She reads books.', 'The object is first.'), 'Reads she books.': tri('Reads перед she - это не обычный порядок утверждения. Нужно She reads books.', 'Reads перед she - це не звичайний порядок ствердження. Потрібно She reads books.', 'Verb before subject is wrong here.'), 'She books reads.': tri('Object books стоит перед verb reads. Нужно She reads books.', 'Object books стоїть перед verb reads. Потрібно She reads books.', 'Put reads before books.') }, retryFeedback: [tri('Кто? She. Что делает? reads. Что? books.', 'Хто? She. Що робить? reads. Що? books.', 'Who? She. Does what? reads. What? books.'), tri('She reads books.'), tri('Подсказка: She reads books.', 'Підказка: She reads books.', 'Hint: She reads books.')], focusWords: ['she', 'reads', 'books'] }),
    step({ id: 'word_order_easy_003', order: 3, difficulty: 'easy', targetSkill: 'subject_verb_place', sentence: 'Choose the correct sentence.', translation: tri('Они живут в Дублине.', 'Вони живуть у Дубліні.', 'They live in Dublin.'), options: ['They live in Dublin.', 'In Dublin they live.', 'Live they in Dublin.', 'They in Dublin live.'], correctAnswer: 'They live in Dublin.', correctFeedback: tri('Да. Subject they + verb live + place in Dublin.', 'Так. Subject they + verb live + place in Dublin.', 'Yes. Subject + verb + place.'), wrong: { 'In Dublin they live.': tri('In Dublin в начале возможно только как особый акцент. Базовый порядок: They live in Dublin.', 'In Dublin на початку можливе тільки як особливий акцент. Базовий порядок: They live in Dublin.', 'Place-first is marked here.'), 'Live they in Dublin.': tri('Live перед they не подходит для обычного утверждения. Нужно They live in Dublin.', 'Live перед they не підходить для звичайного ствердження. Потрібно They live in Dublin.', 'Verb before subject is wrong here.'), 'They in Dublin live.': tri('Place стоит между subject и verb. В английском сначала subject + verb: They live in Dublin.', 'Place стоїть між subject і verb. В англійській спочатку subject + verb: They live in Dublin.', 'Do not put place between subject and verb.') }, retryFeedback: [tri('Кто? They. Что делают? live. Где? in Dublin.', 'Хто? They. Що роблять? live. Де? in Dublin.', 'Who? They. Do what? live. Where? in Dublin.'), tri('They live in Dublin.'), tri('Подсказка: They live in Dublin.', 'Підказка: They live in Dublin.', 'Hint: They live in Dublin.')], focusWords: ['they', 'live', 'in Dublin'] }),
    step({ id: 'word_order_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'object_place_order', sentence: 'Choose the correct sentence.', translation: tri('Я читаю книги дома.', 'Я читаю книжки вдома.', 'I read books at home.'), options: ['I read books at home.', 'I read at home books.', 'At home I read books.', 'I books read at home.'], correctAnswer: 'I read books at home.', correctFeedback: tri('Да. Object books идет после verb, place at home идет после object.', 'Так. Object books іде після verb, place at home іде після object.', 'Yes. Object before place.'), wrong: { 'I read at home books.': tri('Place at home стоит перед object books. Базово: I read books at home.', 'Place at home стоїть перед object books. Базово: I read books at home.', 'Place is before the object.'), 'At home I read books.': tri('At home в начале возможно, но базовый нейтральный порядок для тренировки: I read books at home.', 'At home на початку можливе, але базовий нейтральний порядок для тренування: I read books at home.', 'Place-first is possible, but not the neutral target here.'), 'I books read at home.': tri('Books стоит перед read. Нужно subject + verb + object: I read books at home.', 'Books стоїть перед read. Потрібно subject + verb + object: I read books at home.', 'The object is before the verb.') }, retryFeedback: [tri('I read what? Books. Where? At home.', 'I read що? Books. Where? At home.', 'Read what? Books. Where? At home.'), tri('I read books at home.'), tri('Подсказка: I read books at home.', 'Підказка: I read books at home.', 'Hint: I read books at home.')], focusWords: ['read books', 'at home'] }),
    step({ id: 'word_order_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'object_place_time_order', sentence: 'Choose the correct sentence.', translation: tri('Она пьет кофе на работе каждый день.', "Вона п'є каву на роботі щодня.", 'She drinks coffee at work every day.'), options: ['She drinks coffee at work every day.', 'She drinks at work coffee every day.', 'She every day drinks coffee at work.', 'Coffee she drinks at work every day.'], correctAnswer: 'She drinks coffee at work every day.', correctFeedback: tri('Да. Subject + verb + object + place + time.', 'Так. Subject + verb + object + place + time.', 'Yes. Subject + verb + object + place + time.'), wrong: { 'She drinks at work coffee every day.': tri('At work поставлено перед object coffee. Базово: drinks coffee at work.', 'At work поставлено перед object coffee. Базово: drinks coffee at work.', 'Place is before the object.'), 'She every day drinks coffee at work.': tri('Every day поставлено между subject и verb. В базовом порядке лучше: She drinks coffee at work every day.', 'Every day поставлено між subject і verb. У базовому порядку краще: She drinks coffee at work every day.', 'Time breaks the subject-verb core.'), 'Coffee she drinks at work every day.': tri('Coffee вынесено вперед. Для нейтральной фразы нужен порядок She drinks coffee.', 'Coffee винесено вперед. Для нейтральної фрази потрібен порядок She drinks coffee.', 'The object is first.') }, retryFeedback: [tri('Кто + делает + что + где + когда.', 'Хто + робить + що + де + коли.', 'Who + does + what + where + when.'), tri('She drinks coffee at work every day.'), tri('Подсказка: She drinks coffee at work every day.', 'Підказка: She drinks coffee at work every day.', 'Hint: She drinks coffee at work every day.')], focusWords: ['drinks coffee', 'at work', 'every day'] }),
    step({ id: 'word_order_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'past_object_time_order', sentence: 'Choose the correct sentence.', translation: tri('Я посмотрел фильм вчера.', 'Я подивився фільм учора.', 'I watched a film yesterday.'), options: ['I watched a film yesterday.', 'I yesterday watched a film.', 'A film I watched yesterday.', 'I watched yesterday a film.'], correctAnswer: 'I watched a film yesterday.', correctFeedback: tri('Да. Object a film идет после verb, time yesterday в конце.', 'Так. Object a film іде після verb, time yesterday у кінці.', 'Yes. Object then time.'), wrong: { 'I yesterday watched a film.': tri('Yesterday между subject и verb звучит не как базовый порядок. Лучше I watched a film yesterday.', 'Yesterday між subject і verb звучить не як базовий порядок. Краще I watched a film yesterday.', 'Time breaks the subject-verb core.'), 'A film I watched yesterday.': tri('Object вынесен вперед. Для нейтральной фразы: I watched a film yesterday.', 'Object винесено вперед. Для нейтральної фрази: I watched a film yesterday.', 'The object is first.'), 'I watched yesterday a film.': tri('Yesterday стоит перед object. Базово object идет сразу после verb: watched a film yesterday.', 'Yesterday стоїть перед object. Базово object іде одразу після verb: watched a film yesterday.', 'Time is before the object.') }, retryFeedback: [tri('Watched what? A film. When? Yesterday.', 'Watched що? A film. When? Yesterday.', 'Watched what? A film. When? Yesterday.'), tri('I watched a film yesterday.'), tri('Подсказка: I watched a film yesterday.', 'Підказка: I watched a film yesterday.', 'Hint: I watched a film yesterday.')], focusWords: ['watched', 'a film', 'yesterday'] }),
    step({ id: 'word_order_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'time_beginning_core_order', sentence: 'Choose the correct sentence.', translation: tri('Каждое утро он пьет чай.', "Щоранку він п'є чай.", 'Every morning, he drinks tea.'), options: ['Every morning, he drinks tea.', 'Every morning drinks he tea.', 'Every morning tea he drinks.', 'Every morning he tea drinks.'], correctAnswer: 'Every morning, he drinks tea.', correctFeedback: tri('Да. Time marker может стоять в начале, но основная часть остается subject + verb + object.', 'Так. Time marker може стояти на початку, але основна частина залишається subject + verb + object.', 'Yes. Time first, main clause still SVO.'), wrong: { 'Every morning drinks he tea.': tri('После time marker не нужно переворачивать subject и verb. Нужен порядок he drinks tea.', 'Після time marker не потрібно перевертати subject і verb. Потрібен порядок he drinks tea.', 'Do not invert after a time marker.'), 'Every morning tea he drinks.': tri('Tea вынесено перед subject. Базово после time marker: he drinks tea.', 'Tea винесено перед subject. Базово після time marker: he drinks tea.', 'The object is before the subject.'), 'Every morning he tea drinks.': tri('Object tea стоит перед verb drinks. Нужно he drinks tea.', 'Object tea стоїть перед verb drinks. Потрібно he drinks tea.', 'Put the verb before the object.') }, retryFeedback: [tri('Every morning + he drinks tea.', 'Every morning + he drinks tea.', 'Every morning + he drinks tea.'), tri('He drinks tea.'), tri('Подсказка: Every morning, he drinks tea.', 'Підказка: Every morning, he drinks tea.', 'Hint: Every morning, he drinks tea.')], focusWords: ['every morning', 'he drinks tea'] }),
    step({ id: 'word_order_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'time_beginning_past', sentence: 'Choose the correct sentence.', translation: tri('Вчера она купила телефон.', 'Учора вона купила телефон.', 'Yesterday, she bought a phone.'), options: ['Yesterday, she bought a phone.', 'Yesterday bought she a phone.', 'Yesterday a phone she bought.', 'Yesterday she a phone bought.'], correctAnswer: 'Yesterday, she bought a phone.', correctFeedback: tri('Да. Yesterday может стоять в начале, но дальше идет she + bought + a phone.', 'Так. Yesterday може стояти на початку, але далі йде she + bought + a phone.', 'Yes. Time first, then SVO.'), wrong: { 'Yesterday bought she a phone.': tri('После yesterday не нужен обратный порядок. Нужно she bought a phone.', 'Після yesterday не потрібен зворотний порядок. Потрібно she bought a phone.', 'Do not invert after yesterday.'), 'Yesterday a phone she bought.': tri('A phone поставлено перед subject. Базово: she bought a phone.', 'A phone поставлено перед subject. Базово: she bought a phone.', 'The object is before the subject.'), 'Yesterday she a phone bought.': tri('A phone стоит перед bought. Нужно she bought a phone.', 'A phone стоїть перед bought. Потрібно she bought a phone.', 'Put bought before a phone.') }, retryFeedback: [tri('Yesterday + she bought a phone.', 'Yesterday + she bought a phone.', 'Yesterday + she bought a phone.'), tri('She bought a phone.'), tri('Подсказка: Yesterday, she bought a phone.', 'Підказка: Yesterday, she bought a phone.', 'Hint: Yesterday, she bought a phone.')], focusWords: ['yesterday', 'she bought', 'a phone'] }),
    step({ id: 'word_order_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'time_beginning_place', sentence: 'Choose the correct sentence.', translation: tri('После работы мы пошли домой.', 'Після роботи ми пішли додому.', 'After work, we went home.'), options: ['After work, we went home.', 'After work went we home.', 'After work home we went.', 'After work we home went.'], correctAnswer: 'After work, we went home.', correctFeedback: tri('Да. After work может стоять в начале, но основная часть: we went home.', 'Так. After work може стояти на початку, але основна частина: we went home.', 'Yes. Time first, then normal order.'), wrong: { 'After work went we home.': tri('Went перед we ломает порядок утверждения. Нужно we went home.', 'Went перед we ламає порядок ствердження. Потрібно we went home.', 'Verb before subject is wrong here.'), 'After work home we went.': tri('Home стоит перед subject. В базовой фразе: we went home.', 'Home стоїть перед subject. У базовій фразі: we went home.', 'Place is before the subject.'), 'After work we home went.': tri('Home стоит перед went. Нужно we went home.', 'Home стоїть перед went. Потрібно we went home.', 'Place is before the verb.') }, retryFeedback: [tri('After work + we went home.', 'After work + we went home.', 'After work + we went home.'), tri('We went home.'), tri('Подсказка: After work, we went home.', 'Підказка: After work, we went home.', 'Hint: After work, we went home.')], focusWords: ['after work', 'we went home'] }),
    step({ id: 'word_order_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'frequency_before_main_verb', sentence: 'Choose the correct sentence.', translation: tri('Я обычно работаю дома.', 'Я зазвичай працюю вдома.', 'I usually work at home.'), options: ['I usually work at home.', 'I work usually at home.', 'Usually I at home work.', 'I at home usually work.'], correctAnswer: 'I usually work at home.', correctFeedback: tri('Да. Usually стоит перед обычным verb work.', 'Так. Usually стоїть перед звичайним verb work.', 'Yes. Usually before the main verb.'), wrong: { 'I work usually at home.': tri('Usually обычно ставится перед обычным глаголом: I usually work.', 'Usually зазвичай ставиться перед звичайним дієсловом: I usually work.', 'Usually should go before work.'), 'Usually I at home work.': tri('At home стоит между subject и verb. Нужно I usually work at home.', 'At home стоїть між subject і verb. Потрібно I usually work at home.', 'Place breaks the subject-verb core.'), 'I at home usually work.': tri('At home вставлено между subject и verb. Базово: I usually work at home.', 'At home вставлено між subject і verb. Базово: I usually work at home.', 'Place breaks the subject-verb core.') }, retryFeedback: [tri('I + usually + work + at home.', 'I + usually + work + at home.', 'I + usually + work + at home.'), tri('I usually work at home.'), tri('Подсказка: I usually work at home.', 'Підказка: I usually work at home.', 'Hint: I usually work at home.')], focusWords: ['usually', 'work', 'at home'] }),
    step({ id: 'word_order_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'frequency_after_be', sentence: 'Choose the correct sentence.', translation: tri('Она всегда занята.', 'Вона завжди зайнята.', 'She is always busy.'), options: ['She is always busy.', 'She always is busy.', 'Always she is busy.', 'She busy is always.'], correctAnswer: 'She is always busy.', correctFeedback: tri('Да. После be usually/always часто стоит после is: is always busy.', 'Так. Після be usually/always часто стоїть після is: is always busy.', 'Yes. Always goes after be here.'), wrong: { 'She always is busy.': tri('В базовом порядке с be лучше: She is always busy.', 'У базовому порядку з be краще: She is always busy.', 'With be, use She is always busy.'), 'Always she is busy.': tri('Always в начале звучит как сильный акцент. Базово: She is always busy.', 'Always на початку звучить як сильний акцент. Базово: She is always busy.', 'Always first is marked.'), 'She busy is always.': tri('Busy не ставится перед is в обычной фразе. Нужно She is always busy.', 'Busy не ставиться перед is у звичайній фразі. Потрібно She is always busy.', 'Busy should not go before is here.') }, retryFeedback: [tri('She + is + always + busy.', 'She + is + always + busy.', 'She + is + always + busy.'), tri('She is always busy.'), tri('Подсказка: She is always busy.', 'Підказка: She is always busy.', 'Hint: She is always busy.')], focusWords: ['is', 'always', 'busy'] }),
    step({ id: 'word_order_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'frequency_question_not_target_but_statement', sentence: 'Choose the correct sentence.', translation: tri('Они часто звонят мне после работы.', 'Вони часто дзвонять мені після роботи.', 'They often call me after work.'), options: ['They often call me after work.', 'They call often me after work.', 'Often they me call after work.', 'They me often call after work.'], correctAnswer: 'They often call me after work.', correctFeedback: tri('Да. Often стоит перед обычным verb call, object me идет после call.', 'Так. Often стоїть перед звичайним verb call, object me іде після call.', 'Yes. Often before call; me after call.'), wrong: { 'They call often me after work.': tri('Often не должен разрывать call me. Базово: They often call me.', 'Often не має розривати call me. Базово: They often call me.', 'Often should not split call me.'), 'Often they me call after work.': tri('Me стоит перед call. Нужно they often call me.', 'Me стоїть перед call. Потрібно they often call me.', 'The object is before the verb.'), 'They me often call after work.': tri('Me стоит перед verb call. Базовый порядок: They often call me.', 'Me стоїть перед verb call. Базовий порядок: They often call me.', 'The object is before the verb.') }, retryFeedback: [tri('They + often + call + me.', 'They + often + call + me.', 'They + often + call + me.'), tri('They often call me.'), tri('Подсказка: They often call me after work.', 'Підказка: They often call me after work.', 'Hint: They often call me after work.')], focusWords: ['often', 'call me', 'after work'] }),
    step({ id: 'word_order_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_svo_place_time', sentence: 'Choose the correct sentence.', translation: tri('Мы изучаем английский дома каждый вечер.', 'Ми вивчаємо англійську вдома щовечора.', 'We study English at home every evening.'), options: ['We study English at home every evening.', 'We study at home English every evening.', 'English we study at home every evening.', 'We every evening study English at home.'], correctAnswer: 'We study English at home every evening.', correctFeedback: tri('Да. Subject + verb + object + place + time.', 'Так. Subject + verb + object + place + time.', 'Yes. SVO + place + time.'), wrong: { 'We study at home English every evening.': tri('At home стоит перед object English. Базово: study English at home.', 'At home стоїть перед object English. Базово: study English at home.', 'Place is before the object.'), 'English we study at home every evening.': tri('English вынесено вперед. Нейтрально: We study English.', 'English винесено вперед. Нейтрально: We study English.', 'The object is first.'), 'We every evening study English at home.': tri('Every evening поставлено между subject и verb. Базово: We study English at home every evening.', 'Every evening поставлено між subject і verb. Базово: We study English at home every evening.', 'Time breaks the subject-verb core.') }, retryFeedback: [tri('We study what? English. Where? At home. When? Every evening.', 'We study що? English. Where? At home. When? Every evening.', 'Study what? English. Where? At home. When? Every evening.'), tri('We study English at home every evening.'), tri('Подсказка: We study English at home every evening.', 'Підказка: We study English at home every evening.', 'Hint: We study English at home every evening.')], focusWords: ['study English', 'at home', 'every evening'] }),
    step({ id: 'word_order_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_time_beginning_core', sentence: 'Choose the correct sentence.', translation: tri('Каждый день я слушаю музыку на работе.', 'Щодня я слухаю музику на роботі.', 'Every day, I listen to music at work.'), options: ['Every day, I listen to music at work.', 'Every day listen I to music at work.', 'Every day music I listen to at work.', 'Every day I at work listen to music.'], correctAnswer: 'Every day, I listen to music at work.', correctFeedback: tri('Да. Time marker в начале возможен, но основа: I listen to music at work.', 'Так. Time marker на початку можливий, але основа: I listen to music at work.', 'Yes. Time first, then normal order.'), wrong: { 'Every day listen I to music at work.': tri('После Every day не нужен обратный порядок. Нужно I listen to music.', 'Після Every day не потрібен зворотний порядок. Потрібно I listen to music.', 'Do not invert after Every day.'), 'Every day music I listen to at work.': tri('Music вынесено перед subject. Базово: I listen to music.', 'Music винесено перед subject. Базово: I listen to music.', 'The object is before the subject.'), 'Every day I at work listen to music.': tri('At work вставлено между subject и verb. Лучше: I listen to music at work.', 'At work вставлено між subject і verb. Краще: I listen to music at work.', 'Place breaks the subject-verb core.') }, retryFeedback: [tri('Every day + I listen to music at work.', 'Every day + I listen to music at work.', 'Every day + I listen to music at work.'), tri('I listen to music at work.'), tri('Подсказка: Every day, I listen to music at work.', 'Підказка: Every day, I listen to music at work.', 'Hint: Every day, I listen to music at work.')], focusWords: ['every day', 'listen to music', 'at work'] }),
    step({ id: 'word_order_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Вчера я отправил ей файл с работы.', 'Учора я надіслав їй файл з роботи.', 'Yesterday, I sent her the file from work.'), options: ['Yesterday, I sent her the file from work.', 'Yesterday sent I her the file from work.', 'Yesterday the file I sent her from work.', 'Yesterday I from work sent her the file.'], correctAnswer: 'Yesterday, I sent her the file from work.', correctFeedback: tri('Да. Yesterday может быть в начале, дальше I + sent + her + the file + from work.', 'Так. Yesterday може бути на початку, далі I + sent + her + the file + from work.', 'Yes. Time first, then normal order.'), wrong: { 'Yesterday sent I her the file from work.': tri('После yesterday не нужен порядок sent I. Нужно I sent.', 'Після yesterday не потрібен порядок sent I. Потрібно I sent.', 'Do not invert after yesterday.'), 'Yesterday the file I sent her from work.': tri('The file вынесено перед subject. Базово: I sent her the file.', 'The file винесено перед subject. Базово: I sent her the file.', 'The object is before the subject.'), 'Yesterday I from work sent her the file.': tri('From work вставлено между subject и verb. Базово: I sent her the file from work.', 'From work вставлено між subject і verb. Базово: I sent her the file from work.', 'Place/source breaks the subject-verb core.') }, retryFeedback: [tri('Yesterday + I sent her the file from work.', 'Yesterday + I sent her the file from work.', 'Yesterday + I sent her the file from work.'), tri('I sent her the file.'), tri('Подсказка: Yesterday, I sent her the file from work.', 'Підказка: Yesterday, I sent her the file from work.', 'Hint: Yesterday, I sent her the file from work.')], focusWords: ['yesterday', 'sent her the file', 'from work'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'object_first_error',
      'verb_before_subject_error',
      'missing_subject_error',
      'place_before_object_error',
      'time_inside_core_error',
      'adverb_frequency_position_error',
      'be_adverb_position_error',
      'russian_ukrainian_order_transfer_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем subject, verb, object, place и time.', 'Звичайне пояснення: показуємо subject, verb, object, place і time.', 'Show subject, verb, object, place, and time.'),
    depth2: tri('Проще: собираем фразу по схеме кто + делает + что.', 'Простіше: збираємо фразу за схемою хто + робить + що.', 'Build the sentence as who + does + what.'),
    depth3: tri('Еще проще: показываем готовый шаблон I like coffee / She reads books.', 'Ще простіше: показуємо готовий шаблон I like coffee / She reads books.', 'Show model chunks: I like coffee / She reads books.'),
    depth4: tri('Почти подсказка: прямо указываем правильный порядок слов.', 'Майже підказка: прямо вказуємо правильний порядок слів.', 'Almost a hint: show the correct word order.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: {
        ru: 'Остановись. В обычном утверждении держи каркас: subject + verb + object. Потом place. Потом time. Time можно поставить в начало, но внутри основной части порядок не ломается.',
        uk: 'Зупинись. У звичайному ствердженні тримай каркас: subject + verb + object. Потім place. Потім time. Time можна поставити на початок, але всередині основної частини порядок не ламається.',
        es: 'Pause. Keep the frame: subject + verb + object, then place, then time.',
      },
    },
    afterThreeWrongInSameExercise: {
      action: 'show_sentence_parts_hint_then_retry',
      card: {
        ru: 'Подсказка по частям: система покажет, где subject, verb, object, place и time, но не соберет фразу за пользователя.',
        uk: 'Підказка за частинами: система покаже, де subject, verb, object, place і time, але не збере фразу за користувача.',
        es: 'Hint by sentence parts: show subject, verb, object, place, and time.',
      },
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: {
        ru: 'Режим подсказки: сначала выбери subject, потом verb, потом object. После этого система вернет тебя к полному предложению.',
        uk: 'Режим підказки: спочатку обери subject, потім verb, потім object. Після цього система поверне тебе до повного речення.',
        es: 'Guided mode: choose subject, then verb, then object.',
      },
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_word_order_001', prompt: { ru: 'В I like coffee что является subject?', uk: 'У I like coffee що є subject?', es: 'In I like coffee, what is the subject?' }, options: ['I', 'coffee'], correctIndex: 0, thenReturnToExerciseId: 'word_order_easy_001' },
      { id: 'guided_word_order_002', prompt: { ru: 'В She reads books что должно идти сразу после subject?', uk: 'У She reads books що має йти одразу після subject?', es: 'What goes right after the subject?' }, options: ['verb', 'object'], correctIndex: 0, thenReturnToExerciseId: 'word_order_easy_002' },
      { id: 'guided_word_order_003', prompt: { ru: 'В I read books at home что идет раньше: object books или place at home?', uk: 'У I read books at home що йде раніше: object books чи place at home?', es: 'What comes first: object or place?' }, options: ['object books', 'place at home'], correctIndex: 0, thenReturnToExerciseId: 'word_order_contrast_001' },
      { id: 'guided_word_order_004', prompt: { ru: 'Если Every morning стоит в начале, порядок he drinks tea внутри основной части меняется?', uk: 'Якщо Every morning стоїть на початку, порядок he drinks tea всередині основної частини змінюється?', es: 'Does the main-clause order change after Every morning?' }, options: ['да', 'нет'], correctIndex: 1, thenReturnToExerciseId: 'word_order_contrast_004' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'syntax',
    microDiagnosisId: 'word_order_basic_statement',
    diagnosisLabel: tri('Порядок слов в утверждении', 'Порядок слів у ствердженні', 'Statement word order'),
    contrastSet: SMART_CONTRAST,
    difficultyLevel: 2,
    focusWords: SMART_CONTRAST,
    focusPatterns: [
      'subject_verb_object',
      'subject_verb_place',
      'object_place_order',
      'object_place_time_order',
      'past_object_time_order',
      'time_beginning_core_order',
      'time_beginning_past',
      'time_beginning_place',
      'frequency_before_main_verb',
      'frequency_after_be',
      'frequency_question_not_target_but_statement',
      'mixed_svo_place_time',
      'mixed_time_beginning_core',
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
    start: 'diagnosis_training_word_order_basic_statement_start',
    answer: 'diagnosis_training_word_order_basic_statement_answer',
    mastery: 'diagnosis_training_word_order_basic_statement_mastery',
    fallback: 'diagnosis_training_word_order_basic_statement_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: {
      category: 'syntax',
      microDiagnosisId: 'word_order_basic_statement',
      contrastSet: SMART_CONTRAST,
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logSentencePartOrder: true,
      logMovedElement: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=syntax&microDiagnosisId=word_order_basic_statement',
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


