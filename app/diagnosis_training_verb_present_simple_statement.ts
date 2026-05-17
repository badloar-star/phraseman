// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.
import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = ['base verb', 'verb+s', 'habit', 'fact', 'routine', 'schedule', 'present continuous'];

const option = (text: string) => ({ id: text, text });

const defaultWrong = (correct: string): TriText => tri(
  `Не эта форма. Здесь нужно "${correct}": говорим о привычке, факте или расписании.`,
  `Не ця форма. Тут потрібно "${correct}": говоримо про звичку, факт або розклад.`,
  `Not this form. Use "${correct}" for a habit, fact, or schedule.`,
);

function retry(line: string, model: string): [TriText, TriText, TriText, TriText] {
  return [
    tri(line, line, `Check the signal and use the model: ${model}.`),
    tri(
      'Спроси себя: это обычно правда или происходит прямо сейчас?',
      'Запитай себе: це зазвичай правда чи відбувається просто зараз?',
      'Ask: is it usually true, or happening right now?',
    ),
    tri(
      'Держи смысл: обычная правда не просит am/is/are перед действием.',
      'Тримай сенс: звичайна правда не просить am/is/are перед дією.',
      `Keep the model: ${model}.`,
    ),
    tri(
      'Почти подсказка: I/you/we/they берут простое действие; he/she/it добавляет -s или -es.',
      'Майже підказка: I/you/we/they беруть просту дію; he/she/it додає -s або -es.',
      'Almost a hint: I/you/we/they use the simple action; he/she/it adds -s or -es.',
    ),
  ];
}

function psStep(input: {
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
  retryLine: string;
  model: string;
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
      'Эта форма нужна для привычек, фактов, расписаний и стабильных состояний. Не добавляй am/is/are перед обычным действием.',
      'Ця форма потрібна для звичок, фактів, розкладів і стабільних станів. Не додавай am/is/are перед звичайною дією.',
      'Use this for habits, facts, schedules, and stable states. Do not add am/is/are before a normal action.',
    ),
    microTask: tri(
      'Выбери нормальную форму для привычки, факта или расписания.',
      'Вибери нормальну форму для звички, факту або розкладу.',
      'Choose the normal form for a habit, fact, or schedule.',
    ),
    sentence: input.sentence,
    answerOptions: input.options.map(option),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((item) => item === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(
      input.options
        .filter((item) => item !== input.correctAnswer)
        .map((item) => [item, input.wrong?.[item] ?? defaultWrong(input.correctAnswer)]),
    ),
    retryFeedback: retry(input.retryLine, input.model),
    fallbackExplanation: tri(
      'Смотри на две вещи: это привычка, факт или расписание; и кто делает действие. Для I/you/we/they форма проще, для he/she/it добавляется -s или -es.',
      'Дивись на дві речі: це звичка, факт або розклад; і хто робить дію. Для I/you/we/they форма простіша, для he/she/it додається -s або -es.',
      'I, you, we, they: I work, they live. He, she, it: she works, the shop opens. Every day, usually, often, always, and schedules often point here.',
    ),
    focusWords: input.focusWords,
  };
}

export const VERB_PRESENT_SIMPLE_STATEMENT_TRAINING: DiagnosisTraining = {
  id: 'verb_present_simple_statement',
  category: 'verb',
  version: '1.0.0',
  status: 'active',
  priority: 22,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('I work / She works: привычки и факты', 'I work / She works: звички і факти', 'I work / She works: habits and facts'),
  shortTitle: tri('I work / She works'),
  shortDiagnosis: tri(
    'Ты добавляешь am/is/are или -ing там, где нужна обычная фраза: I work, she works.',
    'Ти додаєш am/is/are або -ing там, де потрібна звичайна фраза: I work, she works.',
    'You add am/is/are or -ing where the normal phrase is I work, she works.',
  ),
  diagnosisText: tri(
    'Ошибка в том, что привычку или факт ты делаешь по модели "сейчас": I am work, I working. Для обычного факта нужно I work. Для he/she/it: works.',
    'Помилка в тому, що звичку або факт ти робиш за моделлю "зараз": I am work, I working. Для звичайного факту потрібно I work. Для he/she/it: works.',
    'The mistake is using a now-action shape for habits or facts: I am work, I working. For normal facts use I work. For he/she/it: works.',
  ),
  mentalModel: tri(
    'Думай не о времени на часах, а о смысле. Every day, usually, расписания и стабильные факты: I work, she works, the shop opens.',
    'Думай не про час на годиннику, а про сенс. Every day, usually, розклади і стабільні факти: I work, she works, the shop opens.',
    'Think about meaning, not the clock. Every day, usually, schedules, and stable facts: I work, she works, the shop opens.',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'Для обычной правды, привычки или расписания не ставим am/is/are перед действием. С I/you/we/they берем простую форму. С he/she/it добавляем -s или -es.',
    'Для звичайної правди, звички або розкладу не ставимо am/is/are перед дією. З I/you/we/they беремо просту форму. З he/she/it додаємо -s або -es.',
    'I/you/we/they: I work, they live. He/she/it: she works, the shop opens. Signals: every day, usually, often, always, on Mondays.',
  ),
  whatUserMustLearn: {
    ru: [
      'Для привычки: I drink coffee every morning.',
      'Для факта: Water freezes at 0C.',
      'Для расписания: The bus leaves at 8.',
      'С I/you/we/they действие идет как в словаре: work, live, eat.',
      'С he/she/it добавляем -s или -es: works, goes, opens.',
      'Every day, usually, often, always часто показывают привычку.',
      'Не ставь am/is/are перед обычным действием.',
      'Не используй -ing для привычки без смысла "прямо сейчас".',
      'Эта форма не обязательно значит "сейчас".',
      'Для работы, вкуса, расписания и стабильных фактов берем I work / she works.',
    ],
    uk: [
      'Для звички: I drink coffee every morning.',
      'Для факту: Water freezes at 0C.',
      'Для розкладу: The bus leaves at 8.',
      'З I/you/we/they дія йде як у словнику: work, live, eat.',
      'З he/she/it додаємо -s або -es: works, goes, opens.',
      'Every day, usually, often, always часто показують звичку.',
      'Не став am/is/are перед звичайною дією.',
      'Не використовуй -ing для звички без сенсу "просто зараз".',
      'Ця форма не обовʼязково означає "зараз".',
      'Для роботи, смаку, розкладу і стабільних фактів беремо I work / she works.',
    ],
    es: [
      'For a habit: I drink coffee every morning.',
      'For a fact: Water freezes at 0C.',
      'For a schedule: The bus leaves at 8.',
      'With I/you/we/they use work, live, eat.',
      'With he/she/it add -s or -es: works, goes, opens.',
      'Every day, usually, often, always often show habit.',
      'Do not put am/is/are before a normal action.',
      'Do not use -ing for a habit unless the meaning is right now.',
      'This form does not always mean right now.',
      'For work, taste, schedules, and stable facts use I work / she works.',
    ],
  },
  examples: [
    { en: 'I work every day.', ru: 'Я работаю каждый день.', uk: 'Я працюю щодня.', es: 'Trabajo todos los dias.', why: tri('Every day = привычка. С I: work.', 'Every day = звичка. З I: work.', 'Every day = habit. With I: work.') },
    { en: 'She works every day.', ru: 'Она работает каждый день.', uk: 'Вона працює щодня.', es: 'She works every day.', why: tri('She добавляет -s: works.', 'She додає -s: works.', 'She adds -s: works.') },
    { en: 'They live in Dublin.', ru: 'Они живут в Дублине.', uk: 'Вони живуть у Дубліні.', es: 'They live in Dublin.', why: tri('They = live, без -s.', 'They = live, без -s.', 'They = live, no -s.') },
    { en: 'He likes coffee.', ru: 'Он любит кофе.', uk: 'Він любить каву.', es: 'He likes coffee.', why: tri('He добавляет -s: likes.', 'He додає -s: likes.', 'He adds -s: likes.') },
    { en: 'The shop opens at 9.', ru: 'Магазин открывается в 9.', uk: 'Магазин відкривається о 9.', es: 'The shop opens at 9.', why: tri('Расписание: the shop opens.', 'Розклад: the shop opens.', 'Schedule: the shop opens.') },
    { en: 'Water freezes at 0C.', ru: 'Вода замерзает при 0C.', uk: 'Вода замерзає при 0C.', es: 'Water freezes at 0C.', why: tri('Общий факт: water freezes.', 'Загальний факт: water freezes.', 'General fact: water freezes.') },
    { en: 'We usually eat at home.', ru: 'Мы обычно едим дома.', uk: 'Ми зазвичай їмо вдома.', es: 'We usually eat at home.', why: tri('Usually = привычка. We eat.', 'Usually = звичка. We eat.', 'Usually = habit. We eat.') },
    { en: 'My brother studies English.', ru: 'Мой брат учит английский.', uk: 'Мій брат вчить англійську.', es: 'My brother studies English.', why: tri('My brother = he. Study становится studies.', 'My brother = he. Study стає studies.', 'My brother = he. Study becomes studies.') },
  ],
  introBlocks: [
    {
      id: 'intro_problem',
      type: 'diagnosis',
      text: tri(
        'Похоже, ты лечишь привычку через am/is/are или -ing. Но I am work и I working не работают. Нормально: I work every day.',
        'Схоже, ти лікуєш звичку через am/is/are або -ing. Але I am work і I working не працюють. Нормально: I work every day.',
        'You may be treating a habit as a right-now action. I am work and I working do not work. Use: I work every day.',
      ),
    },
    { id: 'intro_rule', type: 'rule', text: tri('Формула простая: с I/you/we/they действие без хвоста. С he/she/it появляется -s или -es.', 'Формула проста: з I/you/we/they дія без хвоста. З he/she/it зʼявляється -s або -es.', 'Formula: I work, you work, we work, they work. But he/she/it: works.') },
    { id: 'intro_warning', type: 'warning', text: tri('Не говори I am work или I working every day. Для привычки: I work every day.', 'Не кажи I am work або I working every day. Для звички: I work every day.', 'Do not say I am work or I working every day. For a habit: I work every day.') },
  ],
  steps: [
    psStep({ id: 'ps_statement_easy_001', order: 1, difficulty: 'easy', targetSkill: 'habit_base_i', sentence: 'I ___ every day.', translation: tri('Я работаю каждый день.', 'Я працюю щодня.', 'I work every day.'), options: ['work', 'works', 'am work', 'working'], correctAnswer: 'work', correctFeedback: tri('Да. Every day показывает привычку. С I: work.', 'Так. Every day показує звичку. З I: work.', 'Yes. Every day shows habit. With I: work.'), wrong: { works: tri('Works для he/she/it. С I нужно work.', 'Works для he/she/it. З I потрібно work.', 'Works is for he/she/it. With I, use work.'), 'am work': tri('I am work не работает. Не ставь am перед work. Скажи I work.', 'I am work не працює. Не став am перед work. Скажи I work.', 'I am work does not work. Do not put am before work. Say I work.'), working: tri('Working нужно со словом am для действия прямо сейчас. Для every day скажи I work.', 'Working потрібне зі словом am для дії просто зараз. Для every day скажи I work.', 'Working needs am for an action right now. For every day, say I work.') }, retryLine: 'Every day = привычка. I + work.', model: 'I work every day / She works every day', focusWords: ['I', 'work'] }),
    psStep({ id: 'ps_statement_easy_002', order: 2, difficulty: 'easy', targetSkill: 'habit_base_they', sentence: 'They ___ in Dublin.', translation: tri('Они живут в Дублине.', 'Вони живуть у Дубліні.', 'They live in Dublin.'), options: ['live', 'lives', 'are live', 'living'], correctAnswer: 'live', correctFeedback: tri('Да. С they нужно live.', 'Так. З they потрібно live.', 'Yes. With they use live.'), wrong: { lives: tri('Lives для he/she/it. They нужно live.', 'Lives для he/she/it. They потрібно live.', 'Lives is for he/she/it. With they, use live.'), 'are live': tri('Are live не работает. С обычным действием не ставь are. Скажи They live.', 'Are live не працює. Зі звичайною дією не став are. Скажи They live.', 'Are live does not work. Do not put are before a normal action. Say They live.'), living: tri('Living без are не работает. Для стабильного места жизни: They live.', 'Living без are не працює. Для стабільного місця життя: They live.', 'Living without are does not work. For a stable place of living: They live.') }, retryLine: 'They = live. Без -s.', model: 'They live / He lives', focusWords: ['they', 'live'] }),
    psStep({ id: 'ps_statement_easy_003', order: 3, difficulty: 'easy', targetSkill: 'habit_base_we', sentence: 'We usually ___ at home.', translation: tri('Мы обычно едим дома.', 'Ми зазвичай їмо вдома.', 'We usually eat at home.'), options: ['eat', 'eats', 'are eat', 'eating'], correctAnswer: 'eat', correctFeedback: tri('Да. Usually показывает привычку. С we: eat.', 'Так. Usually показує звичку. З we: eat.', 'Yes. Usually shows habit. With we: eat.'), wrong: { eats: tri('Eats для he/she/it. We нужно eat.', 'Eats для he/she/it. We потрібно eat.', 'Eats is for he/she/it. With we, use eat.'), 'are eat': tri('Are eat не работает. Скажи We eat.', 'Are eat не працює. Скажи We eat.', 'Are eat does not work. Say We eat.'), eating: tri('Eating без are не работает. Usually ведет к We usually eat.', 'Eating без are не працює. Usually веде до We usually eat.', 'Eating without are does not work. Usually points to We usually eat.') }, retryLine: 'Usually = привычка. We + eat.', model: 'We eat / She eats', focusWords: ['usually', 'eat'] }),
    psStep({ id: 'ps_statement_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'third_person_s_likes', sentence: 'He ___ coffee.', translation: tri('Он любит кофе.', 'Він любить каву.', 'He likes coffee.'), options: ['like', 'likes', 'is like', 'liking'], correctAnswer: 'likes', correctFeedback: tri('Да. He добавляет -s: likes.', 'Так. He додає -s: likes.', 'Yes. He adds -s: likes.'), wrong: { like: tri('Like без -s для I/you/we/they. С he нужно likes.', 'Like без -s для I/you/we/they. З he потрібно likes.', 'Like without -s is for I/you/we/they. With he, use likes.'), 'is like': tri('Is like может значить "похож на". Для вкуса скажи He likes.', 'Is like може означати "схожий на". Для смаку скажи He likes.', 'Is like can mean "looks like". For taste, say He likes.'), liking: tri('Liking здесь не подходит. Стабильный вкус: likes.', 'Liking тут не підходить. Стабільний смак: likes.', 'Liking does not fit here. Stable taste: likes.') }, retryLine: 'He + -s. He likes.', model: 'I like / He likes', focusWords: ['he', 'likes'] }),
    psStep({ id: 'ps_statement_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'third_person_es_goes', sentence: 'She ___ to the gym every morning.', translation: tri('Она ходит в gym каждое утро.', 'Вона ходить у gym щоранку.', 'She goes to the gym every morning.'), options: ['go', 'goes', 'is go', 'going'], correctAnswer: 'goes', correctFeedback: tri('Да. She + go становится goes.', 'Так. She + go стає goes.', 'Yes. She + go becomes goes.'), wrong: { go: tri('Go для I/you/we/they. С she нужно goes.', 'Go для I/you/we/they. З she потрібно goes.', 'Go is for I/you/we/they. With she, use goes.'), 'is go': tri('Is go не работает. Для every morning скажи She goes.', 'Is go не працює. Для every morning скажи She goes.', 'Is go does not work. For every morning, say She goes.'), going: tri('Going без is не работает, и every morning ведет к goes.', 'Going без is не працює, і every morning веде до goes.', 'Going without is does not work, and every morning points to goes.') }, retryLine: 'She + go = goes.', model: 'I go / She goes', focusWords: ['she', 'goes'] }),
    psStep({ id: 'ps_statement_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'third_person_ies_studies', sentence: 'My brother ___ English.', translation: tri('Мой брат учит английский.', 'Мій брат вчить англійську.', 'My brother studies English.'), options: ['study', 'studies', 'studys', 'is study'], correctAnswer: 'studies', correctFeedback: tri('Да. My brother = he. Study становится studies.', 'Так. My brother = he. Study стає studies.', 'Yes. My brother = he. Study becomes studies.'), wrong: { study: tri('Для my brother работает как для he: нужна форма studies.', 'Для my brother працює як для he: потрібна форма studies.', 'Study is for I/you/we/they. My brother = he, so use studies.'), studys: tri('Studys не работает. Study меняется в studies.', 'Studys не працює. Study змінюється на studies.', 'Studys does not work. Study becomes studies.'), 'is study': tri('Is study не работает. Скажи My brother studies.', 'Is study не працює. Скажи My brother studies.', 'Is study does not work. Say My brother studies.') }, retryLine: 'Brother = he. Study -> studies.', model: 'I study / He studies', focusWords: ['brother', 'studies'] }),
    psStep({ id: 'ps_statement_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'no_be_with_main_verb', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.', 'Choose the correct sentence.'), options: ['I work every day.', 'I am work every day.', 'I working every day.', 'I am works every day.'], correctAnswer: 'I work every day.', correctFeedback: tri('Да. Для привычки every day: I work.', 'Так. Для звички every day: I work.', 'Yes. For habit every day: I work.'), wrong: { 'I am work every day.': tri('Am не ставим перед work в такой фразе. Нужно I work.', 'Am не ставимо перед work у такій фразі. Потрібно I work.', 'Do not put am before work in this phrase. Use I work.'), 'I working every day.': tri('I working не работает. Для привычки нужно I work.', 'I working не працює. Для звички потрібно I work.', 'I working does not work. For a habit, use I work.'), 'I am works every day.': tri('Тут лишнее am и неверное works с I. Нужно I work.', 'Тут зайве am і неправильне works з I. Потрібно I work.', 'Here am is extra, and works is wrong with I. Use I work.') }, retryLine: 'Привычка: I work. Без am и без -ing.', model: 'I work every day', focusWords: ['I work'] }),
    psStep({ id: 'ps_statement_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'no_ing_for_habit', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.', 'Choose the correct sentence.'), options: ['They play football on Sundays.', 'They playing football on Sundays.', 'They are play football on Sundays.', 'They plays football on Sundays.'], correctAnswer: 'They play football on Sundays.', correctFeedback: tri('Да. On Sundays показывает привычку. They play.', 'Так. On Sundays показує звичку. They play.', 'Yes. On Sundays shows routine. They play.'), wrong: { 'They playing football on Sundays.': tri('They playing не работает. Для on Sundays: They play.', 'Без are такая форма не працює. Для on Sundays: They play.', 'They playing does not work. For on Sundays: They play.'), 'They are play football on Sundays.': tri('Are play не работает. Не ставь are перед play в такой фразе.', 'Are play не працює. Не став are перед play у такій фразі.', 'Are play does not work. Do not put are before play in this phrase.'), 'They plays football on Sundays.': tri('Plays для he/she/it. They нужно play.', 'Plays для he/she/it. They потрібно play.', 'Plays is for he/she/it. With they, use play.') }, retryLine: 'They + play. On Sundays = привычка.', model: 'They play / He plays', focusWords: ['they play'] }),
    psStep({ id: 'ps_statement_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'unneeded_auxiliary_in_statement', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.', 'Choose the correct sentence.'), options: ['We study English every evening.', 'We do study English every evening.', 'We are study English every evening.', 'We studies English every evening.'], correctAnswer: 'We study English every evening.', correctFeedback: tri('Да. Нормальная фраза: We study.', 'Так. Нормальна фраза: We study.', 'Yes. Normal sentence: We study.'), wrong: { 'We do study English every evening.': tri('Do study может быть сильным акцентом, но обычная фраза здесь: We study.', 'Do study може бути сильним акцентом, але звичайна фраза тут: We study.', 'Do study can be strong emphasis, but the normal phrase here is We study.'), 'We are study English every evening.': tri('Are study не работает. Нужно We study.', 'Are study не працює. Потрібно We study.', 'Are study does not work. Use We study.'), 'We studies English every evening.': tri('Studies для he/she/it. We нужно study.', 'Studies для he/she/it. We потрібно study.', 'Studies is for he/she/it. With we, use study.') }, retryLine: 'We + study.', model: 'We study / She studies', focusWords: ['we study'] }),
    psStep({ id: 'ps_statement_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'schedule_present_simple', sentence: 'The shop ___ at 9.', translation: tri('Магазин открывается в 9.', 'Магазин відкривається о 9.', 'The shop opens at 9.'), options: ['open', 'opens', 'is open', 'opening'], correctAnswer: 'opens', correctFeedback: tri('Да. Это расписание. The shop = it, поэтому opens.', 'Так. Це розклад. The shop = it, тому opens.', 'Yes. This is a schedule. The shop = it, so opens.'), wrong: { open: tri('The shop = it. В такой фразе нужно opens.', 'The shop = it. У такій фразі потрібно opens.', 'The shop = it. In this phrase, use opens.'), 'is open': tri('Is open может значить, что магазин открыт сейчас. Расписание открытия = opens at 9.', 'Is open може означати, що магазин відкритий зараз. Розклад відкриття = opens at 9.', 'Is open can mean the shop is open now. Opening schedule = opens at 9.'), opening: tri('Opening без is не работает, а расписание ведет к opens.', 'Opening без is не працює, а розклад веде до opens.', 'Opening without is does not work, and a schedule points to opens.') }, retryLine: 'Расписание = The shop opens.', model: 'The shop opens at 9', focusWords: ['opens'] }),
    psStep({ id: 'ps_statement_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'fact_present_simple', sentence: 'Water ___ at 0C.', translation: tri('Вода замерзает при 0C.', 'Вода замерзає при 0C.', 'Water freezes at 0C.'), options: ['freeze', 'freezes', 'is freeze', 'freezing'], correctAnswer: 'freezes', correctFeedback: tri('Да. Это общий факт. Water = it, поэтому freezes.', 'Так. Це загальний факт. Water = it, тому freezes.', 'Yes. This is a general fact. Water = it, so freezes.'), wrong: { freeze: tri('Water = it. В такой фразе нужно freezes.', 'Water = it. У такій фразі потрібно freezes.', 'Water = it. In this phrase, use freezes.'), 'is freeze': tri('Is freeze не работает. Для факта нужно freezes.', 'Is freeze не працює. Для факту потрібно freezes.', 'Is freeze does not work. For a fact, use freezes.'), freezing: tri('Freezing без is не работает. Для общего факта нужно freezes.', 'Freezing без is не працює. Для загального факту потрібно freezes.', 'Freezing without is does not work. For a general fact, use freezes.') }, retryLine: 'Факт = Water freezes.', model: 'Water freezes at 0C', focusWords: ['water', 'freezes'] }),
    psStep({ id: 'ps_statement_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'state_verb_likes', sentence: 'She ___ this idea.', translation: tri('Ей нравится эта идея.', 'Їй подобається ця ідея.', 'She likes this idea.'), options: ['like', 'likes', 'is liking', 'liking'], correctAnswer: 'likes', correctFeedback: tri('Да. Like здесь про стабильное отношение. She needs likes.', 'Так. Like тут про стабільне ставлення. She needs likes.', 'Yes. Like here is stable attitude. She needs likes.'), wrong: { like: tri('С she нужно likes.', 'З she потрібно likes.', 'With she, use likes.'), 'is liking': tri('Is liking возможно только в особом контексте. Нормально: likes.', 'Is liking можливе тільки в особливому контексті. Нормально: likes.', 'Is liking is possible only in a special context. Normal form: likes.'), liking: tri('Liking без is не работает. Здесь нужно likes.', 'Liking без is не працює. Тут потрібно likes.', 'Liking without is does not work. Here you need likes.') }, retryLine: 'She + likes.', model: 'I like / She likes', focusWords: ['she', 'likes'] }),
    psStep({ id: 'ps_statement_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_subject_forms', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.', 'Choose the correct pair.'), options: ['I work / She works', 'I works / She work', 'I am work / She is works', 'I working / She working'], correctAnswer: 'I work / She works', correctFeedback: tri('Да. I work. She works.', 'Так. I work. She works.', 'Yes. I work. She works.'), wrong: { 'I works / She work': tri('Формы перевернуты: нужно I work / She works.', 'Форми перевернуті: потрібно I work / She works.', 'The forms are reversed: use I work / She works.'), 'I am work / She is works': tri('Am/is здесь лишние. Нужно I work / She works.', 'Am/is тут зайві. Потрібно I work / She works.', 'Am/is are extra here. Use I work / She works.'), 'I working / She working': tri('Working без am/is не работает, и это пара про привычку: I work / She works.', 'Working без am/is не працює, і це пара про звичку: I work / She works.', 'Working without am/is does not work, and this pair is about habit: I work / She works.') }, retryLine: 'I = work. She = works.', model: 'I work / She works', focusWords: ['work', 'works'] }),
    psStep({ id: 'ps_statement_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_habit_schedule_fact', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.', 'Choose the correct sentence.'), options: ['He works every day, and the shop opens at 9.', 'He work every day, and the shop open at 9.', 'He is work every day, and the shop is open at 9.', 'He working every day, and the shop opening at 9.'], correctAnswer: 'He works every day, and the shop opens at 9.', correctFeedback: tri('Да. He works. The shop opens. Привычка и расписание.', 'Так. He works. The shop opens. Звичка і розклад.', 'Yes. He works. The shop opens. Habit and schedule.'), wrong: { 'He work every day, and the shop open at 9.': tri('He нужно works, the shop нужно opens.', 'He потрібно works, the shop потрібно opens.', 'He needs works, the shop needs opens.'), 'He is work every day, and the shop is open at 9.': tri('Is work не работает; is open меняет смысл. Нужно works / opens.', 'Is work не працює; is open змінює сенс. Потрібно works / opens.', 'Is work does not work; is open changes the meaning. Use works / opens.'), 'He working every day, and the shop opening at 9.': tri('Working/opening здесь ломают фразу. Нужно works / opens.', 'Working/opening тут ламають фразу. Потрібно works / opens.', 'Working/opening break the sentence here. Use works / opens.') }, retryLine: 'He works. Shop opens.', model: 'He works / The shop opens', focusWords: ['works', 'opens'] }),
    psStep({ id: 'ps_statement_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.', 'Choose the correct sentence.'), options: ['They usually study at night, but my sister studies in the morning.', 'They usually studies at night, but my sister study in the morning.', 'They are usually study at night, but my sister is studies in the morning.', 'They usually studying at night, but my sister studying in the morning.'], correctAnswer: 'They usually study at night, but my sister studies in the morning.', correctFeedback: tri('Да. They study. My sister studies.', 'Так. They study. My sister studies.', 'Yes. They study. My sister studies.'), wrong: { 'They usually studies at night, but my sister study in the morning.': tri('Нужно наоборот: They study, my sister studies.', 'Потрібно навпаки: They study, my sister studies.', 'It should be the opposite: They study, my sister studies.'), 'They are usually study at night, but my sister is studies in the morning.': tri('Are/is здесь лишние. Нужно study / studies.', 'Are/is тут зайві. Потрібно study / studies.', 'Are/is are extra here. Use study / studies.'), 'They usually studying at night, but my sister studying in the morning.': tri('Studying без are/is не работает. Нужно study / studies.', 'Studying без are/is не працює. Потрібно study / studies.', 'Studying without are/is does not work. Use study / studies.') }, retryLine: 'They study. Sister studies.', model: 'They study / My sister studies', focusWords: ['study', 'studies'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['be_plus_base_error', 'missing_third_person_s_statement', 'wrong_s_with_plural_subject', 'ing_instead_of_present_simple', 'habit_tense_confusion', 'schedule_present_simple_error', 'state_verb_simple_error', 'unneeded_auxiliary_in_statement'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Показываем, это привычка, факт или расписание, и какая форма нужна.', 'Показуємо, це звичка, факт або розклад, і яка форма потрібна.', 'Show whether this is a habit, fact, or schedule, and which form is needed.'),
    depth2: tri('Проще: обычно правда или прямо сейчас?', 'Простіше: зазвичай правда чи просто зараз?', 'Simpler: usually true or right now?'),
    depth3: tri('Модель по смыслу: обычная привычка плюс форма по первому слову.', 'Модель за сенсом: звичайна звичка плюс форма за першим словом.', 'Models: I work every day / She works every day.'),
    depth4: tri('Почти подсказка: выбери между work и works по первому слову.', 'Майже підказка: вибери між work і works за першим словом.', 'Almost a hint: choose between work and works from the first word.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Привычка, факт, расписание или стабильное состояние: обычное действие без am/is/are. Потом проверяем, нужен ли хвост -s.', 'Звичка, факт, розклад або стабільний стан: звичайна дія без am/is/are. Потім перевіряємо, чи потрібен хвіст -s.', 'Habit/fact/schedule/stable state: I work, they live, she works, the shop opens. Do not add am/is/are before a normal action.') },
    afterThreeWrongInSameExercise: { action: 'show_subject_and_meaning_hint_then_retry', card: tri('Система покажет смысл и первое слово фразы, но форму выберешь ты.', 'Система покаже сенс і перше слово фрази, але форму обереш ти.', 'The system shows the meaning and first word, but does not choose the form for you.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Guided mode: сначала выбери привычка/факт или сейчас. Потом смотри на первое слово.', 'Guided mode: спочатку вибери звичка/факт або зараз. Потім дивись на перше слово.', 'Guided mode: first choose habit/fact or now. Then look at the first word.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_ps_statement_001', prompt: tri('Every day: это привычка или прямо сейчас?', 'Every day: це звичка чи просто зараз?', 'Every day: habit or right now?'), options: ['habit', 'right now'], correctIndex: 0, thenReturnToExerciseId: 'ps_statement_easy_001' },
      { id: 'guided_ps_statement_002', prompt: tri('She beret works ili work?', 'She bere works chy work?', 'She takes works or work?'), options: ['works', 'work'], correctIndex: 0, thenReturnToExerciseId: 'ps_statement_contrast_001' },
      { id: 'guided_ps_statement_003', prompt: tri('They beret works ili work?', 'They bere works chy work?', 'They takes works or work?'), options: ['works', 'work'], correctIndex: 1, thenReturnToExerciseId: 'ps_statement_easy_002' },
      { id: 'guided_ps_statement_004', prompt: tri('The shop opens at 9: это расписание?', 'The shop opens at 9: це розклад?', 'The shop opens at 9: is this a schedule?'), options: ['yes', 'no'], correctIndex: 0, thenReturnToExerciseId: 'ps_statement_mixed_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'verb_present_simple_statement',
    diagnosisLabel: tri('I work / She works'),
    contrastSet: CONTRAST,
    focusWords: ['work', 'works', 'live', 'likes', 'goes', 'studies', 'opens', 'freezes'],
    focusPatterns: ['habit_base_i', 'habit_base_they', 'habit_base_we', 'third_person_s_likes', 'third_person_es_goes', 'third_person_ies_studies', 'no_be_with_main_verb', 'no_ing_for_habit', 'unneeded_auxiliary_in_statement', 'schedule_present_simple', 'fact_present_simple', 'state_verb_likes', 'mixed_subject_forms', 'mixed_habit_schedule_fact', 'mixed_sentence_correction'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_verb_present_simple_statement_start',
    answer: 'diagnosis_training_verb_present_simple_statement_answer',
    mastery: 'diagnosis_training_verb_present_simple_statement_mastery',
    fallback: 'diagnosis_training_verb_present_simple_statement_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'verb', microDiagnosisId: 'verb_present_simple_statement', contrastSet: CONTRAST, logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logSubjectGroup: true, logVerbForm: true, logMeaningType: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=verb_present_simple_statement',
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
