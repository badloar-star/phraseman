import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.

const tri = (ru: string, uk: string, es: string): TriText => ({ ru, uk, es });

const CONTRAST = [
  'used to + base verb',
  'past habit',
  'past state',
  'not true now',
  "didn't use to",
  'did you use to',
  'be used to + noun/ing',
  'past simple',
];

const SMART_CONTRAST = [
  'used to + base verb',
  'past habit',
  'past state',
  'not true now',
  "didn't use to",
  'did you use to',
  'be used to + noun/ing',
];

const MODEL = tri(
  'Used to показывает прошлую привычку или состояние, которое сейчас уже не так: I used to smoke = раньше курил, сейчас нет. После used to ставим обычную форму действия: used to smoke, used to live, used to work. В отрицании и вопросе прошлое уже держит did, поэтому форма становится use to: I did not use to smoke. Did you use to smoke?',
  'Used to показує минулу звичку або стан, який зараз уже не такий: I used to smoke = раніше курив, зараз ні. Після used to ставимо звичайну форму дії: used to smoke, used to live, used to work. У запереченні й питанні минуле вже тримає did, тому форма стає use to: I did not use to smoke. Did you use to smoke?',
  'Used to shows an old habit or state that is different now. After used to, use the simple action form. After did or did not, use use to.',
);

function retry(correct: string): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'Сначала спроси себя: это было раньше и сейчас уже не так, это привычка сейчас или это “я привык”?',
      'Спочатку спитай себе: це було раніше й зараз уже не так, це звичка зараз чи це “я звик”?',
      'First decide the meaning: old and no longer true, current, or accustomed.',
    ),
    tri(
      'Если смысл “раньше, но теперь иначе”, чаще нужен used to: I used to smoke.',
      'Якщо зміст “раніше, але тепер інакше”, частіше потрібен used to: I used to smoke.',
      'If the meaning is old and different now, use used to.',
    ),
    tri(
      "После did или didn't не ставь used. Там нужно use to: Did you use to? I didn't use to.",
      "Після did або didn't не став used. Там потрібно use to: Did you use to? I didn't use to.",
      "After did or didn't, use use to.",
    ),
    tri(
      'Нужный вариант держит смысл “раньше было, сейчас иначе” и не добавляет лишнее used после did.',
      'Потрібний варіант тримає зміст “раніше було, зараз інакше” і не додає зайве used після did.',
      `The answer here is: ${correct}.`,
    ),
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Почти. Проверь смысл: прошлое уже не актуально, привычка сейчас или “я привык”. Здесь нужно: ${correct}.`,
    `Майже. Перевір зміст: минуле вже не актуальне, звичка зараз чи “я звик”. Тут потрібно: ${correct}.`,
    `Almost. Check the meaning and use: ${correct}.`,
  );
}

function usedToStep(input: {
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
      'Выбери форму по смыслу: раньше и сейчас уже нет, вопрос/отрицание с did или привычка сейчас.',
      'Обери форму за змістом: раніше й зараз уже ні, питання/заперечення з did або звичка зараз.',
      'Choose by meaning: old and not true now, did-form, or current habit.',
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
      "Коротко: used to = раньше было, сейчас уже нет. После didn't и Did you ставим use to. Если речь о привычке сейчас, нужен обычный present: I work now. Если “я привык”, будет be used to + слово или действие с -ing.",
      "Коротко: used to = раніше було, зараз уже ні. Після didn't і Did you ставимо use to. Якщо йдеться про звичку зараз, потрібен звичайний present: I work now. Якщо “я звик”, буде be used to + слово або дія з -ing.",
      "Short version: used to means old and different now. After did, use use to. Current habits use present. Accustomed uses be used to + word or -ing.",
    ),
    focusWords: input.focusWords,
  };
}

export const USED_TO_BASIC_TRAINING: DiagnosisTraining = {
  id: 'used_to_basic',
  category: 'verb',
  version: '1.0.0',
  status: 'active',
  priority: 44,
  supportedLocales: ['ru', 'uk'],
  title: tri(
    'Used to: раньше было, сейчас уже нет',
    'Used to: раніше було, зараз уже ні',
    'Used to: old habit, not true now',
  ),
  shortTitle: tri('Used to', 'Used to', 'Used to'),
  shortDiagnosis: tri(
    'Ты смешиваешь used to, did use to, be used to и привычки, которые происходят сейчас.',
    'Ти змішуєш used to, did use to, be used to і звички, які відбуваються зараз.',
    'You mix used to, did use to, be used to, and current habits.',
  ),
  diagnosisText: tri(
    'Ошибка появляется, когда ты переводишь “раньше” одним словом before или ставишь used to везде подряд. Английский различает три смысла: раньше было и теперь иначе, вопрос/отрицание с did, и “я привык”.',
    'Помилка зʼявляється, коли ти перекладаєш “раніше” одним словом before або ставиш used to всюди підряд. Англійська розрізняє три змісти: раніше було й тепер інакше, питання/заперечення з did, і “я звик”.',
    'The mistake appears when every old habit becomes before or used to everywhere. English separates old-and-different-now, did-forms, and accustomed meaning.',
  ),
  mentalModel: MODEL,
  contrastSet: CONTRAST,
  coreRule: tri(
    "Утверждение: I used to work at night. Отрицание: I didn't use to work at night. Вопрос: Did you use to work at night? Привычка сейчас: I work at night now. “Я привык”: I am used to working at night.",
    "Твердження: I used to work at night. Заперечення: I didn't use to work at night. Питання: Did you use to work at night? Звичка зараз: I work at night now. “Я звик”: I am used to working at night.",
    "Statement: I used to work at night. Negative: I didn't use to work at night. Question: Did you use to work at night? Current: I work now. Accustomed: I am used to working.",
  ),
  whatUserMustLearn: {
    ru: [
      'Used to говорит: раньше это было обычно, а сейчас уже не так: I used to smoke.',
      'Used to подходит и для прошлого состояния: She used to live here.',
      'После used to ставим обычную форму действия: used to work, used to live, used to play.',
      'Used to добавляет смысл “раньше, но теперь иначе”. Past Simple просто сообщает факт в прошлом.',
      "После didn't нужно use to: I didn't use to like coffee.",
      'После Did you тоже нужно use to: Did you use to play football?',
      'Не говори I used to working, если смысл “я раньше работал”. Нужно I used to work.',
      'Не путай I used to work и I am used to working. Второе значит “я привык работать”.',
      'Если привычка актуальна сейчас, используй обычный present: I work at night now.',
      'Слово before само по себе не заменяет used to, когда нужно показать “раньше, но теперь иначе”.',
    ],
    uk: [
      'Used to говорить: раніше це було зазвичай, а зараз уже не так: I used to smoke.',
      'Used to підходить і для минулого стану: She used to live here.',
      'Після used to ставимо звичайну форму дії: used to work, used to live, used to play.',
      'Used to додає зміст “раніше, але тепер інакше”. Past Simple просто повідомляє факт у минулому.',
      "Після didn't потрібно use to: I didn't use to like coffee.",
      'Після Did you теж потрібно use to: Did you use to play football?',
      'Не кажи I used to working, якщо зміст “я раніше працював”. Потрібно I used to work.',
      'Не плутай I used to work і I am used to working. Друге означає “я звик працювати”.',
      'Якщо звичка актуальна зараз, використовуй звичайний present: I work at night now.',
      'Слово before саме по собі не замінює used to, коли треба показати “раніше, але тепер інакше”.',
    ],
    es: [
      'Used to means old habit and different now.',
      'Used to can describe an old state.',
      'After used to, use the simple action form.',
      'Used to adds “before, but different now”.',
      "After didn't, use use to.",
      'After Did you, use use to.',
      'Do not use working after used to for old habit.',
      'Do not mix used to work with am used to working.',
      'Current habits use present.',
      'Before alone does not replace used to.',
    ],
  },
  examples: [
    {
      en: 'I used to smoke.',
      ru: 'Раньше я курил.',
      uk: 'Раніше я курив.',
      es: 'I used to smoke.',
      why: tri('Раньше курил, сейчас уже нет.', 'Раніше курив, зараз уже ні.', 'Old habit, not true now.'),
    },
    {
      en: 'She used to live in Dublin.',
      ru: 'Раньше она жила в Дублине.',
      uk: 'Раніше вона жила в Дубліні.',
      es: 'She used to live in Dublin.',
      why: tri('Это прошлое состояние, которое изменилось.', 'Це минулий стан, який змінився.', 'Old state that changed.'),
    },
    {
      en: 'We used to play football after school.',
      ru: 'Раньше мы играли в футбол после школы.',
      uk: 'Раніше ми грали у футбол після школи.',
      es: 'We used to play football after school.',
      why: tri('Повторялась привычка в прошлом.', 'Повторювалася звичка в минулому.', 'Repeated old habit.'),
    },
    {
      en: "He didn't use to drink coffee.",
      ru: 'Раньше он не пил кофе.',
      uk: 'Раніше він не пив каву.',
      es: "He didn't use to drink coffee.",
      why: tri("После didn't форма становится use to.", "Після didn't форма стає use to.", "After didn't, use use to."),
    },
    {
      en: 'Did you use to work at night?',
      ru: 'Ты раньше работал по ночам?',
      uk: 'Ти раніше працював ночами?',
      es: 'Did you use to work at night?',
      why: tri('После Did you тоже используем use to.', 'Після Did you теж використовуємо use to.', 'After Did you, use use to.'),
    },
    {
      en: 'I am used to working at night.',
      ru: 'Я привык работать по ночам.',
      uk: 'Я звик працювати ночами.',
      es: 'I am used to working at night.',
      why: tri('Это не “раньше работал”, а “мне привычно”.', 'Це не “раніше працював”, а “мені звично”.', 'This means accustomed, not an old habit.'),
    },
    {
      en: 'I work at night now.',
      ru: 'Сейчас я работаю по ночам.',
      uk: 'Зараз я працюю ночами.',
      es: 'I work at night now.',
      why: tri('Now показывает привычку сейчас, не used to.', 'Now показує звичку зараз, не used to.', 'Now points to a current habit.'),
    },
  ],
  introBlocks: [
    {
      id: 'intro_problem',
      type: 'diagnosis',
      text: tri(
        'Если в русском есть “раньше”, хочется поставить before или просто Past Simple. Но часто теряется важный смысл: сейчас уже по-другому.',
        'Якщо українською є “раніше”, хочеться поставити before або просто Past Simple. Але часто губиться важливий зміст: зараз уже інакше.',
        'The word before often loses the key idea: now it is different.',
      ),
    },
    {
      id: 'intro_rule',
      type: 'rule',
      text: tri(
        'Used to = раньше было обычно или было правдой, а сейчас уже нет: I used to work there.',
        'Used to = раніше було зазвичай або було правдою, а зараз уже ні: I used to work there.',
        'Used to means it was usually true before, but is not true now.',
      ),
    },
    {
      id: 'intro_warning',
      type: 'warning',
      text: tri(
        "Три частые ловушки: после used to добавляют -ing, после didn't оставляют used, а в вопросе снова ставят used. Нужно помнить: после did идет use to.",
        "Три часті пастки: після used to додають -ing, після didn't лишають used, а в питанні знову ставлять used. Треба памʼятати: після did іде use to.",
        "Three common traps: I used to working, I didn't used to, Did you used to.",
      ),
    },
  ],
  steps: [
    usedToStep({
      id: 'used_to_easy_001',
      order: 1,
      difficulty: 'easy',
      targetSkill: 'used_to_smoke',
      sentence: 'I ___ smoke.',
      translation: tri('Раньше я курил.', 'Раніше я курив.', 'I used to smoke.'),
      options: ['used to', 'use to', 'am used to', 'was used to'],
      correctAnswer: 'used to',
      correctFeedback: tri(
        'Да. Это старая привычка, которая сейчас уже не актуальна: used to smoke.',
        'Так. Це стара звичка, яка зараз уже не актуальна: used to smoke.',
        'Yes. Old habit, not true now: used to smoke.',
      ),
      wrong: {
        'use to': tri(
          'В утверждении о старой привычке нужно used to. Форма use to появляется после did или did not.',
          'У твердженні про стару звичку потрібно used to. Форма use to зʼявляється після did або did not.',
          'In a statement about an old habit, use used to.',
        ),
        'am used to': tri(
          'Am used to значит “я привык”. Здесь смысл другой: раньше курил, сейчас нет. Нужно used to smoke.',
          'Am used to означає “я звик”. Тут зміст інший: раніше курив, зараз ні. Потрібно used to smoke.',
          'Am used to means accustomed. Here use used to smoke.',
        ),
        'was used to': tri(
          'Was used to говорит о привычности, а не о старой привычке. Здесь нужно used to smoke.',
          'Was used to говорить про звичність, а не про стару звичку. Тут потрібно used to smoke.',
          'Was used to is about being accustomed. Here use used to smoke.',
        ),
      },
      focusWords: ['used to smoke'],
    }),
    usedToStep({
      id: 'used_to_easy_002',
      order: 2,
      difficulty: 'easy',
      targetSkill: 'used_to_play',
      sentence: 'We used to ___ football after school.',
      translation: tri(
        'Раньше мы играли в футбол после школы.',
        'Раніше ми грали у футбол після школи.',
        'We used to play football after school.',
      ),
      options: ['play', 'playing', 'played', 'to play'],
      correctAnswer: 'play',
      correctFeedback: tri(
        'Да. После used to действие идет в обычной форме: used to play.',
        'Так. Після used to дія йде у звичайній формі: used to play.',
        'Yes. After used to, use play.',
      ),
      wrong: {
        playing: tri(
          'Playing подходит после I am used to, когда смысл “я привык”. Для старой привычки нужно used to play.',
          'Playing підходить після I am used to, коли зміст “я звик”. Для старої звички потрібно used to play.',
          'Playing fits am used to. For the old habit, use used to play.',
        ),
        played: tri(
          'После used to не добавляем прошлую форму еще раз. Нужна обычная форма: used to play.',
          'Після used to не додаємо минулу форму ще раз. Потрібна звичайна форма: used to play.',
          'After used to, use play.',
        ),
        'to play': tri(
          'В used to уже есть to. Второй to не нужен. Нормально: used to play.',
          'У used to вже є to. Другий to не потрібен. Нормально: used to play.',
          'Used to already has to. Use used to play.',
        ),
      },
      focusWords: ['used to play'],
    }),
    usedToStep({
      id: 'used_to_easy_003',
      order: 3,
      difficulty: 'easy',
      targetSkill: 'used_to_work',
      sentence: 'He used to ___ at night.',
      translation: tri('Раньше он работал по ночам.', 'Раніше він працював ночами.', 'He used to work at night.'),
      options: ['work', 'working', 'worked', 'to work'],
      correctAnswer: 'work',
      correctFeedback: tri(
        'Да. Used to work = раньше работал, сейчас уже иначе.',
        'Так. Used to work = раніше працював, зараз уже інакше.',
        'Yes. Used to work means he worked before, but not now.',
      ),
      wrong: {
        working: tri(
          'Used to working звучит как часть другой конструкции. Если смысл “раньше работал”, нужно used to work.',
          'Used to working звучить як частина іншої конструкції. Якщо зміст “раніше працював”, потрібно used to work.',
          'For an old habit, use used to work.',
        ),
        worked: tri(
          'Worked уже показывает прошлое, но после used to нужно work: He used to work at night.',
          'Worked уже показує минуле, але після used to потрібно work: He used to work at night.',
          'After used to, use work.',
        ),
        'to work': tri(
          'Used to to work ломает фразу: лишний to. Нормально: used to work.',
          'Used to to work ламає фразу: зайвий to. Нормально: used to work.',
          'Do not double to. Use used to work.',
        ),
      },
      focusWords: ['used to work'],
    }),
    usedToStep({
      id: 'used_to_contrast_001',
      order: 4,
      difficulty: 'contrast',
      targetSkill: 'used_to_live',
      sentence: 'She used to ___ in Dublin.',
      translation: tri('Раньше она жила в Дублине.', 'Раніше вона жила в Дубліні.', 'She used to live in Dublin.'),
      options: ['live', 'living', 'lived', 'to live'],
      correctAnswer: 'live',
      correctFeedback: tri(
        'Да. Used to live показывает прошлое состояние, которое изменилось.',
        'Так. Used to live показує минулий стан, який змінився.',
        'Yes. Used to live shows an old state that changed.',
      ),
      wrong: {
        living: tri(
          'Used to living здесь звучит как “привыкла к жизни”. А нужно: раньше жила. Поэтому used to live.',
          'Used to living тут звучить як “звикла до життя”. А потрібно: раніше жила. Тому used to live.',
          'For an old state, use used to live.',
        ),
        lived: tri(
          'После used to не ставим lived. Нужна обычная форма: live.',
          'Після used to не ставимо lived. Потрібна звичайна форма: live.',
          'After used to, use live.',
        ),
        'to live': tri(
          'В used to уже есть to. Поэтому не used to to live, а used to live.',
          'У used to вже є свій to. Тому другий to перед live не потрібен.',
          'Do not double to. Use used to live.',
        ),
      },
      focusWords: ['used to live'],
    }),
    usedToStep({
      id: 'used_to_contrast_002',
      order: 5,
      difficulty: 'contrast',
      targetSkill: 'used_to_be',
      sentence: 'I used to ___ shy.',
      translation: tri('Раньше я был стеснительным.', 'Раніше я був соромʼязливим.', 'I used to be shy.'),
      options: ['be', 'being', 'was', 'to be'],
      correctAnswer: 'be',
      correctFeedback: tri(
        'Да. После used to здесь нужна форма be: I used to be shy.',
        'Так. Після used to тут потрібна форма be: I used to be shy.',
        'Yes. After used to, use be.',
      ),
      wrong: {
        being: tri(
          'Being здесь уводит в другую конструкцию. Для прошлого состояния нужно used to be.',
          'Being тут веде в іншу конструкцію. Для минулого стану потрібно used to be.',
          'For an old state, use used to be.',
        ),
        was: tri(
          'Was уже прошлое, но после used to нужно be: I used to be shy.',
          'Was уже минуле, але після used to потрібно be: I used to be shy.',
          'After used to, use be.',
        ),
        'to be': tri(
          'Used to to be звучит с лишним to. Нормально: used to be.',
          'Used to to be звучить із зайвим to. Нормально: used to be.',
          'Do not double to. Use used to be.',
        ),
      },
      focusWords: ['used to be'],
    }),
    usedToStep({
      id: 'used_to_contrast_003',
      order: 6,
      difficulty: 'contrast',
      targetSkill: 'past_state_no_longer_true',
      sentence: 'This building ___ a school.',
      translation: tri(
        'Раньше это здание было школой.',
        'Раніше ця будівля була школою.',
        'This building used to be a school.',
      ),
      options: ['used to be', 'was used to', 'used to being', 'use to be'],
      correctAnswer: 'used to be',
      correctFeedback: tri(
        'Да. Здание было школой раньше, но сейчас уже нет: used to be.',
        'Так. Будівля була школою раніше, але зараз уже ні: used to be.',
        'Yes. It was a school before, but not now: used to be.',
      ),
      wrong: {
        'was used to': tri(
          'Was used to значит “был привык”. Здание не привыкает. Здесь нужно used to be.',
          'Was used to означає “був звиклий”. Будівля не звикає. Тут потрібно used to be.',
          'Was used to means accustomed. Here use used to be.',
        ),
        'used to being': tri(
          'Для смысла “раньше было школой” нужно used to be, без being.',
          'Для змісту “раніше була школою” потрібно used to be, без being.',
          'Use used to be, not used to being.',
        ),
        'use to be': tri(
          'В обычном утверждении нужна форма used to be. Use to появляется после did.',
          'У звичайному твердженні потрібна форма used to be. Use to зʼявляється після did.',
          'In a statement, use used to be.',
        ),
      },
      focusWords: ['used to be'],
    }),
    usedToStep({
      id: 'used_to_contrast_004',
      order: 7,
      difficulty: 'contrast',
      targetSkill: 'didnt_use_to',
      sentence: "I didn't ___ like coffee.",
      translation: tri('Раньше я не любил кофе.', 'Раніше я не любив каву.', "I didn't use to like coffee."),
      options: ['use to', 'used to', 'using to', 'am used to'],
      correctAnswer: 'use to',
      correctFeedback: tri(
        "Да. После didn't прошлое уже показано, поэтому дальше идет use to, а не used to.",
        "Так. Після didn't ставимо use to: I didn't use to like coffee.",
        "Yes. After didn't, use use to.",
      ),
      wrong: {
        'used to': tri(
          "После didn't не нужно used. Правильно: didn't use to.",
          "Після didn't не потрібно used. Правильно: didn't use to.",
          "After didn't, use didn't use to.",
        ),
        'using to': tri(
          "Didn't using to не собирается в нормальную форму. Нужно didn't use to.",
          "Didn't using to не складається в нормальну форму. Потрібно didn't use to.",
          "Use didn't use to.",
        ),
        'am used to': tri(
          "Am used to значит “я привык”. Здесь речь о том, что раньше не любил кофе. Нужно didn't use to like.",
          "Am used to означає “я звик”. Тут ідеться про те, що раніше не любив каву. Потрібно didn't use to like.",
          "Am used to means accustomed. Here use didn't use to like.",
        ),
      },
      focusWords: ["didn't use to"],
    }),
    usedToStep({
      id: 'used_to_contrast_005',
      order: 8,
      difficulty: 'contrast',
      targetSkill: 'did_you_use_to',
      sentence: 'Did you ___ play football?',
      translation: tri('Ты раньше играл в футбол?', 'Ти раніше грав у футбол?', 'Did you use to play football?'),
      options: ['use to', 'used to', 'using to', 'were used to'],
      correctAnswer: 'use to',
      correctFeedback: tri(
        'Да. После Did you ставим use to: Did you use to play?',
        'Так. Після Did you ставимо use to: Did you use to play?',
        'Yes. After Did you, use use to.',
      ),
      wrong: {
        'used to': tri(
          'После Did you не ставим used. Нужно: Did you use to play?',
          'Після Did you не ставимо used. Потрібно: Did you use to play?',
          'After Did you, use use to.',
        ),
        'using to': tri(
          'Did you using to не работает. Нужна форма Did you use to.',
          'Did you using to не працює. Потрібна форма Did you use to.',
          'Use Did you use to.',
        ),
        'were used to': tri(
          'Were used to спрашивает про привычность. Здесь вопрос о старой привычке: Did you use to play?',
          'Were used to питає про звичність. Тут питання про стару звичку: Did you use to play?',
          'Were used to is about being accustomed. Here use Did you use to.',
        ),
      },
      focusWords: ['did you use to'],
    }),
    usedToStep({
      id: 'used_to_contrast_006',
      order: 9,
      difficulty: 'contrast',
      targetSkill: 'negative_question_pair',
      sentence: 'Choose the correct pair.',
      translation: tri(
        'Выбери пару: раньше не любил кофе / раньше пил кофе?',
        'Обери пару: раніше не любив каву / раніше пив каву?',
        "I didn't use to like coffee / Did you use to drink coffee?",
      ),
      options: [
        "I didn't use to like coffee / Did you use to drink coffee?",
        "I didn't used to like coffee / Did you used to drink coffee?",
        "I wasn't used to like coffee / Were you used to drink coffee?",
        "I didn't use to liking coffee / Did you use to drinking coffee?",
      ],
      correctAnswer: "I didn't use to like coffee / Did you use to drink coffee?",
      correctFeedback: tri(
        "Да. После did и didn't форма одна: use to.",
        "Так. Після did і didn't форма одна: use to.",
        "Yes. After did and didn't, use use to.",
      ),
      wrong: {
        "I didn't used to like coffee / Did you used to drink coffee?": tri(
          "В обоих местах did уже показывает прошлое. Нужно didn't use to и Did you use to.",
          "В обох місцях did уже показує минуле. Потрібно didn't use to і Did you use to.",
          "After did, use use to.",
        ),
        "I wasn't used to like coffee / Were you used to drink coffee?": tri(
          'Was/were used to говорит о привычности, а здесь нужны формы старой привычки.',
          'Was/were used to говорить про звичність, а тут потрібні форми старої звички.',
          'Was/were used to has a different meaning.',
        ),
        "I didn't use to liking coffee / Did you use to drinking coffee?": tri(
          'После use to нужны like и drink, без -ing.',
          'Після use to потрібні like і drink, без -ing.',
          'After use to, use like and drink.',
        ),
      },
      focusWords: ["didn't use to", 'did you use to'],
    }),
    usedToStep({
      id: 'used_to_mixed_001',
      order: 10,
      difficulty: 'mixed',
      targetSkill: 'be_used_to_working',
      sentence: 'I am used to ___ at night.',
      translation: tri('Я привык работать по ночам.', 'Я звик працювати ночами.', 'I am used to working at night.'),
      options: ['working', 'work', 'worked', 'to work'],
      correctAnswer: 'working',
      correctFeedback: tri(
        'Да. I am used to working = мне привычно работать по ночам.',
        'Так. I am used to working = мені звично працювати ночами.',
        'Yes. I am used to working means I am accustomed to it.',
      ),
      wrong: {
        work: tri(
          'Am used to work смешивает две конструкции. Для “я привык” нужно am used to working.',
          'Am used to work змішує дві конструкції. Для “я звик” потрібно am used to working.',
          'Use am used to working.',
        ),
        worked: tri(
          'Worked здесь не подходит: речь не о прошлом факте, а о привычности сейчас. Нужно working.',
          'Worked тут не підходить: ідеться не про минулий факт, а про звичність зараз. Потрібно working.',
          'Use working for the accustomed meaning.',
        ),
        'to work': tri(
          'Am used to to work звучит с лишним to. Нормально: am used to working.',
          'Am used to to work звучить із зайвим to. Нормально: am used to working.',
          'Use am used to working.',
        ),
      },
      focusWords: ['am used to working'],
    }),
    usedToStep({
      id: 'used_to_mixed_002',
      order: 11,
      difficulty: 'mixed',
      targetSkill: 'used_to_vs_be_used_to',
      sentence: 'Choose the correct pair.',
      translation: tri(
        'Раньше я работал по ночам / Я привык работать по ночам.',
        'Раніше я працював ночами / Я звик працювати ночами.',
        'I used to work at night / I am used to working at night',
      ),
      options: [
        'I used to work at night / I am used to working at night',
        'I am used to work at night / I used to working at night',
        'I used to working at night / I am used to work at night',
        'I was used to work at night / I used to worked at night',
      ],
      correctAnswer: 'I used to work at night / I am used to working at night',
      correctFeedback: tri(
        'Да. Used to work = раньше работал. Am used to working = привык работать.',
        'Так. Used to work = раніше працював. Am used to working = звик працювати.',
        'Yes. Used to work is old habit. Am used to working is accustomed.',
      ),
      wrong: {
        'I am used to work at night / I used to working at night': tri(
          'Формы перепутаны местами. Раньше работал: used to work. Привык: am used to working.',
          'Форми переплутані місцями. Раніше працював: used to work. Звик: am used to working.',
          'Use used to work / am used to working.',
        ),
        'I used to working at night / I am used to work at night': tri(
          'Здесь обе части сломаны: для старой привычки work, для “привык” working.',
          'Тут обидві частини зламані: для старої звички work, для “звик” working.',
          'Use work for old habit and working for accustomed meaning.',
        ),
        'I was used to work at night / I used to worked at night': tri(
          'Was used to work не передает “раньше работал”, а used to worked дублирует прошлое. Нужно used to work / am used to working.',
          'Was used to work не передає “раніше працював”, а used to worked дублює минуле. Потрібно used to work / am used to working.',
          'Use used to work / am used to working.',
        ),
      },
      focusWords: ['used to work', 'am used to working'],
    }),
    usedToStep({
      id: 'used_to_mixed_003',
      order: 12,
      difficulty: 'mixed',
      targetSkill: 'current_habit_present_simple',
      sentence: 'I ___ at night now.',
      translation: tri('Сейчас я работаю по ночам.', 'Зараз я працюю ночами.', 'I work at night now.'),
      options: ['work', 'used to work', 'use to work', 'am used to work'],
      correctAnswer: 'work',
      correctFeedback: tri(
        'Да. Now показывает привычку сейчас, поэтому просто work.',
        'Так. Now показує звичку зараз, тому просто work.',
        'Yes. Now points to a current habit, so use work.',
      ),
      wrong: {
        'used to work': tri(
          'Used to work значит “раньше работал, сейчас уже нет”. Но в предложении есть now. Здесь нужно work.',
          'Used to work означає “раніше працював, зараз уже ні”. Але в реченні є now. Тут потрібно work.',
          'Used to work means old and not true now. Here use work.',
        ),
        'use to work': tri(
          'Use to work не подходит для привычки сейчас. Здесь обычная форма: I work at night now.',
          'Use to work не підходить для звички зараз. Тут звичайна форма: I work at night now.',
          'For a current habit, use work.',
        ),
        'am used to work': tri(
          'Am used to work тоже не собирается. Если “я привык”, было бы am used to working. Но здесь просто work.',
          'Am used to work теж не складається. Якщо “я звик”, було б am used to working. Але тут просто work.',
          'Here use work.',
        ),
      },
      focusWords: ['work now'],
    }),
    usedToStep({
      id: 'used_to_mixed_004',
      order: 13,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_statement_negative_question',
      sentence: 'Choose the correct set.',
      translation: tri(
        'Раньше курил / раньше не курил / раньше курил?',
        'Раніше курив / раніше не курив / раніше курив?',
        "I used to smoke / I didn't use to smoke / Did you use to smoke?",
      ),
      options: [
        "I used to smoke / I didn't use to smoke / Did you use to smoke?",
        "I use to smoke / I didn't used to smoke / Did you used to smoke?",
        "I used to smoking / I didn't use to smoking / Did you use to smoking?",
        "I was used to smoke / I wasn't used to smoke / Were you used to smoke?",
      ],
      correctAnswer: "I used to smoke / I didn't use to smoke / Did you use to smoke?",
      correctFeedback: tri(
        "Да. Утверждение: used to. После did/didn't: use to.",
        "Так. Твердження: used to. Після did/didn't: use to.",
        "Yes. Statement: used to. After did/didn't: use to.",
      ),
      wrong: {
        "I use to smoke / I didn't used to smoke / Did you used to smoke?": tri(
          "В утверждении нужно used to, а после did/didn't наоборот use to.",
          "У твердженні потрібно used to, а після did/didn't навпаки use to.",
          "Use used to in a statement and use to after did.",
        ),
        "I used to smoking / I didn't use to smoking / Did you use to smoking?": tri(
          'После used to или use to здесь нужно smoke, без -ing.',
          'Після used to або use to тут потрібно smoke, без -ing.',
          'Use smoke, not smoking.',
        ),
        "I was used to smoke / I wasn't used to smoke / Were you used to smoke?": tri(
          'Was used to уводит в значение “привык”. Здесь нужны формы старой привычки.',
          'Was used to веде до значення “звик”. Тут потрібні форми старої звички.',
          'Was used to has the accustomed meaning. Here use old-habit forms.',
        ),
      },
      focusWords: ['used to', "didn't use to", 'did you use to'],
    }),
    usedToStep({
      id: 'used_to_mixed_005',
      order: 14,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_old_vs_now',
      sentence: 'Choose the correct pair.',
      translation: tri(
        'Раньше я жил здесь / Сейчас я живу здесь.',
        'Раніше я жив тут / Зараз я живу тут.',
        'I used to live here / I live here now',
      ),
      options: [
        'I used to live here / I live here now',
        'I live here used to / I used to live here now',
        'I used to living here / I am live here now',
        'I was used to live here / I used to live here now',
      ],
      correctAnswer: 'I used to live here / I live here now',
      correctFeedback: tri(
        'Да. Старое состояние: used to live. Сейчас актуально: live now.',
        'Так. Старий стан: used to live. Зараз актуально: live now.',
        'Yes. Old state: used to live. Current: live now.',
      ),
      wrong: {
        'I live here used to / I used to live here now': tri(
          'Used to не ставится в конце, и оно конфликтует с now. Нужно used to live / live now.',
          'Used to не ставиться в кінці, і воно конфліктує з now. Потрібно used to live / live now.',
          'Use used to live / live now.',
        ),
        'I used to living here / I am live here now': tri(
          'Used to living не подходит для старого состояния, а I am live не работает. Нужно used to live / live.',
          'Used to living не підходить для старого стану, а I am live не працює. Потрібно used to live / live.',
          'Use used to live / live.',
        ),
        'I was used to live here / I used to live here now': tri(
          'Was used to live не передает “раньше жил”, а used to live here now спорит само с собой. Нужно used to live / live now.',
          'Was used to live не передає “раніше жив”, а used to live here now сперечається саме з собою. Потрібно used to live / live now.',
          'Use used to live / live now.',
        ),
      },
      focusWords: ['used to live', 'live now'],
    }),
    usedToStep({
      id: 'used_to_mixed_006',
      order: 15,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_sentence_correction',
      sentence: 'Choose the correct sentence.',
      translation: tri(
        'Раньше я не любил кофе, но теперь пью его каждый день.',
        'Раніше я не любив каву, але тепер пʼю її щодня.',
        "I didn't use to like coffee, but now I drink it every day.",
      ),
      options: [
        "I didn't use to like coffee, but now I drink it every day.",
        "I didn't used to like coffee, but now I used to drink it every day.",
        "I wasn't used to like coffee, but now I drinking it every day.",
        "I didn't use to liking coffee, but now I am used to drink it every day.",
      ],
      correctAnswer: "I didn't use to like coffee, but now I drink it every day.",
      correctFeedback: tri(
        "Да. Раньше не любил: didn't use to like. Сейчас пью: I drink.",
        "Так. Раніше не любив: didn't use to like. Зараз пʼю: I drink.",
        "Yes. Old negative: didn't use to like. Current habit: I drink.",
      ),
      wrong: {
        "I didn't used to like coffee, but now I used to drink it every day.": tri(
          "После didn't нужно use to, а now не дружит с used to. Нужно: didn't use to like / now I drink.",
          "Після didn't потрібно use to, а now не дружить з used to. Потрібно: didn't use to like / now I drink.",
          "Use didn't use to like / now I drink.",
        ),
        "I wasn't used to like coffee, but now I drinking it every day.": tri(
          "Wasn't used to like не передает “раньше не любил”, а I drinking не работает. Нужно didn't use to like / I drink.",
          "Wasn't used to like не передає “раніше не любив”, а I drinking не працює. Потрібно didn't use to like / I drink.",
          "Use didn't use to like / I drink.",
        ),
        "I didn't use to liking coffee, but now I am used to drink it every day.": tri(
          "После use to нужно like, а am used to drink ломается. Здесь лучше: didn't use to like / I drink.",
          "Після use to потрібно like, а am used to drink ламається. Тут краще: didn't use to like / I drink.",
          "Use didn't use to like / I drink.",
        ),
      },
      focusWords: ["didn't use to like", 'now I drink'],
    }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'used_to_plus_ing_error',
      'used_to_missing_to_error',
      'didnt_used_to_error',
      'did_you_used_to_error',
      'used_to_vs_present_simple_error',
      'used_to_vs_past_simple_error',
      'be_used_to_confusion_error',
      'used_to_state_error',
      'wrong_current_habit_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri(
      'Обычное объяснение: покажи, что это старая привычка или состояние, и сейчас уже иначе.',
      'Звичайне пояснення: покажи, що це стара звичка або стан, і зараз уже інакше.',
      'Normal explanation: show old habit/state and different now.',
    ),
    depth2: tri(
      'Проще: спроси, это было раньше или происходит сейчас.',
      'Простіше: спитай, це було раніше чи відбувається зараз.',
      'Simpler: ask whether it happened before or happens now.',
    ),
    depth3: tri(
      'Еще проще: сравни I used to smoke и I smoke now.',
      'Ще простіше: порівняй I used to smoke і I smoke now.',
      'Even simpler: compare I used to smoke and I smoke now.',
    ),
    depth4: tri(
      "Почти подсказка: выбери used to, didn't use to, Did you use to или обычный present.",
      "Майже підказка: обери used to, didn't use to, Did you use to або звичайний present.",
      "Almost a hint: choose used to, didn't use to, Did you use to, or present.",
    ),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        "Used to = раньше было, сейчас уже нет. Утверждение: used to work. Отрицание: didn't use to work. Вопрос: Did you use to work? “Я привык”: am used to working.",
        "Used to = раніше було, зараз уже ні. Твердження: used to work. Заперечення: didn't use to work. Питання: Did you use to work? “Я звик”: am used to working.",
        "Used to = old and not true now. Statement: used to work. Negative: didn't use to work. Question: Did you use to work? Accustomed: am used to working.",
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_used_to_meaning_hint_then_retry',
      card: tri(
        'Подсказка: сначала выбери смысл: раньше и теперь иначе, сейчас, или “я привык”. Потом выбирай форму.',
        'Підказка: спочатку обери зміст: раніше й тепер інакше, зараз, або “я звик”. Потім обирай форму.',
        'Hint: first choose the meaning, then choose the form.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        "Guided mode: сначала отдели used to work от am used to working. Потом проверь did/didn't.",
        "Guided mode: спочатку відділи used to work від am used to working. Потім перевір did/didn't.",
        "Guided mode: separate used to work from am used to working, then check did/didn't.",
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      {
        id: 'guided_used_to_001',
        prompt: tri(
          'I used to smoke: это “курю сейчас” или “раньше курил”?',
          'I used to smoke: це “курю зараз” чи “раніше курив”?',
          'I used to smoke: now or before?',
        ),
        options: ['now', 'before'],
        correctIndex: 1,
        thenReturnToExerciseId: 'used_to_easy_001',
      },
      {
        id: 'guided_used_to_002',
        prompt: tri(
          'После used to здесь нужно work или working?',
          'Після used to тут потрібно work чи working?',
          'After used to, work or working?',
        ),
        options: ['work', 'working'],
        correctIndex: 0,
        thenReturnToExerciseId: 'used_to_easy_003',
      },
      {
        id: 'guided_used_to_003',
        prompt: tri(
          "После didn't что звучит нормально?",
          "Після didn't що звучить нормально?",
          "After didn't, which is correct?",
        ),
        options: ["didn't used to", "didn't use to"],
        correctIndex: 1,
        thenReturnToExerciseId: 'used_to_contrast_004',
      },
      {
        id: 'guided_used_to_004',
        prompt: tri(
          'I am used to working: это “раньше работал” или “привык работать”?',
          'I am used to working: це “раніше працював” чи “звик працювати”?',
          'I am used to working: old habit or accustomed?',
        ),
        options: ['old habit', 'accustomed'],
        correctIndex: 1,
        thenReturnToExerciseId: 'used_to_mixed_001',
      },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'used_to_basic',
    diagnosisLabel: tri('Used to', 'Used to', 'Used to'),
    contrastSet: SMART_CONTRAST,
    difficultyLevel: 2,
    focusWords: ['used to smoke', 'used to work', "didn't use to", 'did you use to', 'am used to working', 'now'],
    focusPatterns: [
      'used_to_smoke',
      'used_to_play',
      'used_to_work',
      'used_to_live',
      'used_to_be',
      'past_state_no_longer_true',
      'didnt_use_to',
      'did_you_use_to',
      'negative_question_pair',
      'be_used_to_working',
      'used_to_vs_be_used_to',
      'current_habit_present_simple',
      'mixed_statement_negative_question',
      'mixed_old_vs_now',
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
      microDiagnosisId: 'used_to_basic',
      contrastSet: ['used to', "didn't use to", 'did you use to', 'be used to', 'current habit'],
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logUsedToMeaning: true,
      logVerbFormAfterUsedTo: true,
      logCurrentRelevance: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=used_to_basic',
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
