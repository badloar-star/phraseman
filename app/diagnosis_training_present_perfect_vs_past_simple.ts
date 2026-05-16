import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = ['present perfect', 'past simple', 'result now', 'life experience', 'finished time', 'yesterday', 'last week', 'ago', 'ever', 'never'];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'Сначала спроси: есть конкретное время в прошлом или важен результат/опыт сейчас?',
      'Спочатку спитай: є конкретний час у минулому чи важливий результат/досвід зараз?',
      'First ask: is there a specific past time, or is the result/experience relevant now?',
    ),
    depth2,
    depth3,
    depth4,
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Проверь маркер времени. Нужная форма здесь: ${correct}.`,
    `Перевір marker часу. Потрібна форма тут: ${correct}.`,
    `Check the time marker. Correct form here: ${correct}.`,
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
      'Present Perfect выбирает связь с настоящим: опыт или результат сейчас. Past Simple выбирает законченное время в прошлом: yesterday, last week, in 2020, ago.',
      'Present Perfect обирає зв’язок із теперішнім: досвід або результат зараз. Past Simple обирає завершений час у минулому: yesterday, last week, in 2020, ago.',
      'Present Perfect connects to now: experience or result. Past Simple uses a finished past time.',
    ),
    microTask: tri(
      'Выбери между Present Perfect и Past Simple по смыслу и маркеру времени.',
      'Обери між Present Perfect і Past Simple за змістом і marker часу.',
      'Choose between Present Perfect and Past Simple by meaning and time marker.',
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
      'Если есть yesterday/last week/in 2020/ago - чаще Past Simple. Если ever/never/already/yet или результат сейчас - чаще Present Perfect.',
      'Якщо є yesterday/last week/in 2020/ago - частіше Past Simple. Якщо ever/never/already/yet або результат зараз - частіше Present Perfect.',
      'Finished time usually means Past Simple. Experience/result now usually means Present Perfect.',
    ),
    focusWords: input.focusWords,
  };
}

export const PRESENT_PERFECT_VS_PAST_SIMPLE_TRAINING: DiagnosisTraining = {
  id: 'present_perfect_vs_past_simple',
  category: 'verb',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 39,
  supportedLocales: ['ru', 'uk'],
  title: tri('Present Perfect vs Past Simple: результат сейчас или время в прошлом', 'Present Perfect vs Past Simple: результат зараз чи час у минулому'),
  shortTitle: tri('Perfect vs Past', 'Perfect vs Past'),
  shortDiagnosis: tri(
    'Ты путаешь Present Perfect и Past Simple: результат/опыт сейчас против конкретного времени в прошлом.',
    'Ти плутаєш Present Perfect і Past Simple: результат/досвід зараз проти конкретного часу в минулому.',
  ),
  diagnosisText: tri(
    'Ты путаешь Present Perfect и Past Simple. Главная проблема в том, что оба могут переводиться прошедшим временем, но английский смотрит на другое: есть ли связь с настоящим или указан конкретный момент в прошлом.',
    'Ти плутаєш Present Perfect і Past Simple. Головна проблема в тому, що обидва можуть перекладатися минулим часом, але англійська дивиться на інше: чи є зв’язок із теперішнім або вказаний конкретний момент у минулому.',
  ),
  mentalModel: tri(
    'Present Perfect = важен результат/опыт сейчас: I have lost my keys. Past Simple = важно когда это случилось: I lost my keys yesterday. Если есть yesterday, last week, in 2020, ago - почти всегда Past Simple.',
    'Present Perfect = важливий результат/досвід зараз: I have lost my keys. Past Simple = важливо коли це сталося: I lost my keys yesterday. Якщо є yesterday, last week, in 2020, ago - майже завжди Past Simple.',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'I have lost my keys = результат сейчас, ключей нет. I lost my keys yesterday = конкретное время в прошлом. Have you ever tried it? = опыт. Did you try it yesterday? = конкретный момент в прошлом.',
    'I have lost my keys = результат зараз, ключів немає. I lost my keys yesterday = конкретний час у минулому. Have you ever tried it? = досвід. Did you try it yesterday? = конкретний момент у минулому.',
  ),
  whatUserMustLearn: {
    ru: [
      'Present Perfect используется, когда важен результат сейчас: I have lost my keys.',
      'Past Simple используется, когда указан конкретный момент в прошлом: I lost my keys yesterday.',
      'С yesterday, last night, last week, in 2020, ago обычно нужен Past Simple.',
      'С ever/never для жизненного опыта обычно нужен Present Perfect.',
      'С already/yet часто используется Present Perfect.',
      'Если спрашиваем “когда?”, чаще нужен Past Simple: When did you arrive?',
      'Если спрашиваем про опыт, чаще нужен Present Perfect: Have you ever tried it?',
      'Нельзя говорить I have seen him yesterday. Нужно I saw him yesterday.',
      'Нельзя говорить Did you ever been there? Лучше Have you ever been there?',
      'Present Perfect не заменяет всё прошлое. Он нужен, когда прошлое связано с настоящим.',
    ],
    uk: [
      'Present Perfect використовується, коли важливий результат зараз: I have lost my keys.',
      'Past Simple використовується, коли вказаний конкретний момент у минулому: I lost my keys yesterday.',
      'З yesterday, last night, last week, in 2020, ago зазвичай потрібен Past Simple.',
      'З ever/never для життєвого досвіду зазвичай потрібен Present Perfect.',
      'З already/yet часто використовується Present Perfect.',
      'Якщо питаємо “коли?”, частіше потрібен Past Simple: When did you arrive?',
      'Якщо питаємо про досвід, частіше потрібен Present Perfect: Have you ever tried it?',
      'Не можна говорити I have seen him yesterday. Потрібно I saw him yesterday.',
      'Не можна говорити Did you ever been there? Краще Have you ever been there?',
      'Present Perfect не замінює все минуле. Він потрібен, коли минуле пов’язане з теперішнім.',
    ],
    es: [
      'Present Perfect is used for a result now.',
      'Past Simple is used with a specific past time.',
      'Yesterday, last week, in 2020, and ago usually need Past Simple.',
      'Ever/never for life experience usually need Present Perfect.',
      'Already/yet often use Present Perfect.',
      'When questions often use Past Simple.',
      'Experience questions often use Present Perfect.',
      'Do not use Present Perfect with yesterday.',
      'Use Have you ever been for experience.',
      'Present Perfect does not replace all past events.',
    ],
  },
  examples: [
    { en: 'I have lost my keys.', ru: 'Я потерял ключи.', uk: 'Я загубив ключі.', es: 'I have lost my keys.', why: tri('Фокус на результате сейчас: ключей нет. Поэтому Present Perfect.', 'Фокус на результаті зараз: ключів немає. Тому Present Perfect.') },
    { en: 'I lost my keys yesterday.', ru: 'Я потерял ключи вчера.', uk: 'Я загубив ключі вчора.', es: 'I lost my keys yesterday.', why: tri('Yesterday указывает конкретное время в прошлом. Поэтому Past Simple.', 'Yesterday вказує конкретний час у минулому. Тому Past Simple.') },
    { en: 'She has already finished the task.', ru: 'Она уже закончила задачу.', uk: 'Вона вже закінчила завдання.', es: 'She has already finished the task.', why: tri('Already показывает результат к текущему моменту. Поэтому has finished.', 'Already показує результат до поточного моменту. Тому has finished.') },
    { en: 'She finished the task last night.', ru: 'Она закончила задачу вчера вечером.', uk: 'Вона закінчила завдання вчора ввечері.', es: 'She finished the task last night.', why: tri('Last night - конкретное законченное время в прошлом. Поэтому finished.', 'Last night - конкретний завершений час у минулому. Тому finished.') },
    { en: 'Have you ever tried sushi?', ru: 'Ты когда-нибудь пробовал суши?', uk: 'Ти коли-небудь пробував суші?', es: 'Have you ever tried sushi?', why: tri('Ever спрашивает о жизненном опыте до настоящего момента. Поэтому Present Perfect.', 'Ever питає про життєвий досвід до теперішнього моменту. Тому Present Perfect.') },
    { en: 'Did you try sushi yesterday?', ru: 'Ты пробовал суши вчера?', uk: 'Ти пробував суші вчора?', es: 'Did you try sushi yesterday?', why: tri('Yesterday задает конкретное время. Поэтому Did you try, не Have you tried.', 'Yesterday задає конкретний час. Тому Did you try, не Have you tried.') },
    { en: 'I have never been to London.', ru: 'Я никогда не был в Лондоне.', uk: 'Я ніколи не був у Лондоні.', es: 'I have never been to London.', why: tri('Never говорит об отсутствии опыта до настоящего момента. Поэтому Present Perfect.', 'Never говорить про відсутність досвіду до теперішнього моменту. Тому Present Perfect.') },
    { en: 'I went to London in 2020.', ru: 'Я ездил в Лондон в 2020 году.', uk: 'Я їздив до Лондона у 2020 році.', es: 'I went to London in 2020.', why: tri('In 2020 - конкретный период в прошлом. Поэтому Past Simple.', 'In 2020 - конкретний період у минулому. Тому Past Simple.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты выбираешь время по русскому переводу “сделал / видел / был”. Но английский выбирает по смыслу: результат сейчас или конкретное время в прошлом.', 'Схоже, ти обираєш час за перекладом “зробив / бачив / був”. Але англійська обирає за змістом: результат зараз чи конкретний час у минулому.') },
    { id: 'intro_rule', type: 'rule', text: tri('Если есть конкретное время: Past Simple. Если важен опыт или результат сейчас: Present Perfect.', 'Якщо є конкретний час: Past Simple. Якщо важливий досвід або результат зараз: Present Perfect.') },
    { id: 'intro_warning', type: 'warning', text: tri('Не смешивай Present Perfect с yesterday: I have seen him yesterday неправильно. Нужно I saw him yesterday.', 'Не змішуй Present Perfect з yesterday: I have seen him yesterday неправильно. Потрібно I saw him yesterday.') },
  ],
  steps: [
    step({ id: 'pp_vs_past_easy_001', order: 1, difficulty: 'easy', targetSkill: 'result_now_present_perfect', sentence: "I ___ my keys. I can't find them.", translation: tri('Я потерял ключи. Я не могу их найти.', 'Я загубив ключі. Я не можу їх знайти.'), options: ['have lost', 'lost yesterday', 'lose', 'have lose'], correctAnswer: 'have lost', correctFeedback: tri('Да. Результат важен сейчас: ключей нет. Поэтому have lost.', 'Так. Результат важливий зараз: ключів немає. Тому have lost.'), wrong: { 'lost yesterday': tri('Lost yesterday добавляет конкретное время, которого в смысле нет. Здесь фокус на результате сейчас: have lost.', 'Lost yesterday додає конкретний час, якого в змісті немає. Тут фокус на результаті зараз: have lost.'), lose: tri('Lose - present/base form. Здесь нужен результат к настоящему: have lost.', 'Lose - present/base form. Тут потрібен результат до теперішнього: have lost.'), 'have lose': tri('После have нужен past participle: lost, не lose.', 'Після have потрібен past participle: lost, не lose.') }, retryFeedback: [tri('Ключей сейчас нет = have lost.', 'Ключів зараз немає = have lost.'), tri('I have lost my keys.'), tri("Подсказка: I have lost my keys. I can't find them.", "Підказка: I have lost my keys. I can't find them.")], focusWords: ['have lost', 'result now'] }),
    step({ id: 'pp_vs_past_easy_002', order: 2, difficulty: 'easy', targetSkill: 'yesterday_past_simple', sentence: 'I ___ my keys yesterday.', translation: tri('Я потерял ключи вчера.', 'Я загубив ключі вчора.'), options: ['lost', 'have lost', 'have lose', 'lose'], correctAnswer: 'lost', correctFeedback: tri('Да. Yesterday - конкретное время в прошлом. Поэтому Past Simple: lost.', 'Так. Yesterday - конкретний час у минулому. Тому Past Simple: lost.'), wrong: { 'have lost': tri('С yesterday стандартно нужен Past Simple. Не have lost yesterday, а lost yesterday.', 'З yesterday стандартно потрібен Past Simple. Не have lost yesterday, а lost yesterday.'), 'have lose': tri('Have lose неправильно, и с yesterday всё равно нужен Past Simple: lost.', 'Have lose неправильно, і з yesterday усе одно потрібен Past Simple: lost.'), lose: tri('Lose - present/base form. Yesterday требует lost.', 'Lose - present/base form. Yesterday потребує lost.') }, retryFeedback: [tri('Yesterday = Past Simple.'), tri('I lost my keys yesterday.'), tri('Подсказка: I lost my keys yesterday.', 'Підказка: I lost my keys yesterday.')], focusWords: ['yesterday', 'lost'] }),
    step({ id: 'pp_vs_past_easy_003', order: 3, difficulty: 'easy', targetSkill: 'result_vs_time_pair', sentence: 'Choose the correct pair.', translation: tri('Я потерял ключи, их нет сейчас / я потерял ключи вчера', 'Я загубив ключі, їх немає зараз / я загубив ключі вчора'), options: ['I have lost my keys / I lost my keys yesterday', 'I lost my keys / I have lost my keys yesterday', 'I have lose my keys / I lost my keys yesterday', 'I lost my keys yesterday / I have lost my keys yesterday'], correctAnswer: 'I have lost my keys / I lost my keys yesterday', correctFeedback: tri('Да. Результат сейчас = have lost. Конкретное время yesterday = lost.', 'Так. Результат зараз = have lost. Конкретний час yesterday = lost.'), wrong: { 'I lost my keys / I have lost my keys yesterday': tri('Вторая часть неправильная: с yesterday нужен Past Simple.', 'Друга частина неправильна: з yesterday потрібен Past Simple.'), 'I have lose my keys / I lost my keys yesterday': tri('Have lose неправильно. Нужно have lost.', 'Have lose неправильно. Потрібно have lost.'), 'I lost my keys yesterday / I have lost my keys yesterday': tri('Обе части не различают результат сейчас и finished time. С yesterday - lost, без времени с результатом - have lost.', 'Обидві частини не розрізняють результат зараз і finished time. З yesterday - lost, без часу з результатом - have lost.') }, retryFeedback: [tri('Result now = have lost. Yesterday = lost.'), tri('Have lost / lost yesterday.'), tri('Подсказка: I have lost my keys / I lost my keys yesterday.', 'Підказка: I have lost my keys / I lost my keys yesterday.')], focusWords: ['have lost', 'lost yesterday'] }),
    step({ id: 'pp_vs_past_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'experience_present_perfect', sentence: '___ you ever tried sushi?', translation: tri('Ты когда-нибудь пробовал суши?', 'Ти коли-небудь пробував суші?'), options: ['Have', 'Did', 'Do', 'Are'], correctAnswer: 'Have', correctFeedback: tri('Да. Ever спрашивает об опыте до настоящего момента. Нужен Present Perfect: Have you ever tried.', 'Так. Ever питає про досвід до теперішнього моменту. Потрібен Present Perfect: Have you ever tried.'), wrong: { Did: tri('Did подходит для конкретного времени: Did you try it yesterday? Для опыта с ever лучше Have you ever tried?', 'Did підходить для конкретного часу: Did you try it yesterday? Для досвіду з ever краще Have you ever tried?'), Do: tri('Do относится к настоящему простому времени. Для опыта нужен Have.', 'Do належить до теперішнього простого часу. Для досвіду потрібен Have.'), Are: tri('Are не строит Present Perfect. Нужно Have you ever tried?', 'Are не будує Present Perfect. Потрібно Have you ever tried?') }, retryFeedback: [tri('Ever + experience = Have you ever...?'), tri('Have you ever tried sushi?'), tri('Подсказка: Have you ever tried sushi?', 'Підказка: Have you ever tried sushi?')], focusWords: ['ever', 'have tried'] }),
    step({ id: 'pp_vs_past_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'specific_time_past_question', sentence: '___ you try sushi yesterday?', translation: tri('Ты пробовал суши вчера?', 'Ти пробував суші вчора?'), options: ['Did', 'Have', 'Do', 'Are'], correctAnswer: 'Did', correctFeedback: tri('Да. Yesterday - конкретное время в прошлом. Нужен Past Simple question: Did you try.', 'Так. Yesterday - конкретний час у минулому. Потрібен Past Simple question: Did you try.'), wrong: { Have: tri('Have you tried обычно для опыта/результата. С yesterday нужен Did you try.', 'Have you tried зазвичай для досвіду/результату. З yesterday потрібно Did you try.'), Do: tri('Do - настоящее. Yesterday требует Did.', 'Do - теперішній час. Yesterday потребує Did.'), Are: tri('Are не используется с обычным verb try. Нужен Did.', 'Are не використовується зі звичайним verb try. Потрібен Did.') }, retryFeedback: [tri('Yesterday question = Did.'), tri('Did you try sushi yesterday?'), tri('Подсказка: Did you try sushi yesterday?', 'Підказка: Did you try sushi yesterday?')], focusWords: ['did try', 'yesterday'] }),
    step({ id: 'pp_vs_past_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'experience_vs_specific_pair', sentence: 'Choose the correct pair.', translation: tri('Ты когда-нибудь был там? / ты был там вчера?', 'Ти коли-небудь був там? / ти був там учора?'), options: ['Have you ever been there? / Were you there yesterday?', 'Did you ever been there? / Have you been there yesterday?', 'Have you ever was there? / Were you been there yesterday?', 'Did you ever were there? / Have you were there yesterday?'], correctAnswer: 'Have you ever been there? / Were you there yesterday?', correctFeedback: tri('Да. Опыт = Have you ever been. Конкретное yesterday с be = Were you there.', 'Так. Досвід = Have you ever been. Конкретне yesterday з be = Were you there.'), wrong: { 'Did you ever been there? / Have you been there yesterday?': tri('Did you ever been неправильно. Have you been there yesterday тоже неправильно из-за yesterday.', 'Did you ever been неправильно. Have you been there yesterday теж неправильно через yesterday.'), 'Have you ever was there? / Were you been there yesterday?': tri('После have нужен been, не was. Were you been неправильно.', 'Після have потрібен been, не was. Were you been неправильно.'), 'Did you ever were there? / Have you were there yesterday?': tri('С be в прошлом вопрос строится через was/were, а опыт через have been.', 'З be в минулому питання будується через was/were, а досвід через have been.') }, retryFeedback: [tri('Experience = have been. Yesterday = were.'), tri('Have you ever been? / Were you there yesterday?'), tri('Подсказка: Have you ever been there? / Were you there yesterday?', 'Підказка: Have you ever been there? / Were you there yesterday?')], focusWords: ['have been', 'were yesterday'] }),
    step({ id: 'pp_vs_past_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'last_week_past_simple', sentence: 'She ___ the task last week.', translation: tri('Она закончила задачу на прошлой неделе.', 'Вона закінчила завдання минулого тижня.'), options: ['finished', 'has finished', 'has finish', 'finish'], correctAnswer: 'finished', correctFeedback: tri('Да. Last week - конкретное законченное время. Нужен Past Simple.', 'Так. Last week - конкретний завершений час. Потрібен Past Simple.'), wrong: { 'has finished': tri('С last week обычно не используем Present Perfect. Нужно finished.', 'З last week зазвичай не використовуємо Present Perfect. Потрібно finished.'), 'has finish': tri('Has finish неправильно, и с last week нужен Past Simple: finished.', 'Has finish неправильно, і з last week потрібен Past Simple: finished.'), finish: tri('Finish - base form. Last week требует finished.', 'Finish - base form. Last week потребує finished.') }, retryFeedback: [tri('Last week = Past Simple.'), tri('She finished last week.'), tri('Подсказка: She finished the task last week.', 'Підказка: She finished the task last week.')], focusWords: ['last week', 'finished'] }),
    step({ id: 'pp_vs_past_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'ago_past_simple', sentence: 'They ___ two days ago.', translation: tri('Они уехали два дня назад.', 'Вони поїхали два дні тому.'), options: ['left', 'have left', 'have leave', 'leave'], correctAnswer: 'left', correctFeedback: tri('Да. Ago указывает конкретную дистанцию в прошлом. Нужен Past Simple: left.', 'Так. Ago вказує конкретну дистанцію в минулому. Потрібен Past Simple: left.'), wrong: { 'have left': tri('С two days ago обычно нужен Past Simple, не Present Perfect.', 'З two days ago зазвичай потрібен Past Simple, не Present Perfect.'), 'have leave': tri('Have leave неправильно, и с ago нужен left.', 'Have leave неправильно, і з ago потрібен left.'), leave: tri('Leave - base form. Two days ago требует left.', 'Leave - base form. Two days ago потребує left.') }, retryFeedback: [tri('Ago = Past Simple.'), tri('They left two days ago.'), tri('Подсказка: They left two days ago.', 'Підказка: They left two days ago.')], focusWords: ['ago', 'left'] }),
    step({ id: 'pp_vs_past_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'in_2020_past_simple', sentence: 'I ___ to London in 2020.', translation: tri('Я ездил в Лондон в 2020 году.', 'Я їздив до Лондона у 2020 році.'), options: ['went', 'have been', 'have went', 'go'], correctAnswer: 'went', correctFeedback: tri('Да. In 2020 - конкретный период в прошлом. Нужен Past Simple: went.', 'Так. In 2020 - конкретний період у минулому. Потрібен Past Simple: went.'), wrong: { 'have been': tri('Have been подходит для опыта без конкретного времени. С in 2020 нужен went.', 'Have been підходить для досвіду без конкретного часу. З in 2020 потрібен went.'), 'have went': tri('Have went неправильно, и с in 2020 нужен Past Simple: went.', 'Have went неправильно, і з in 2020 потрібен Past Simple: went.'), go: tri('Go - base form. In 2020 требует went.', 'Go - base form. In 2020 потребує went.') }, retryFeedback: [tri('In 2020 = Past Simple.'), tri('I went to London in 2020.'), tri('Подсказка: I went to London in 2020.', 'Підказка: I went to London in 2020.')], focusWords: ['in 2020', 'went'] }),
    step({ id: 'pp_vs_past_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'already_present_perfect', sentence: 'She ___ already finished the task.', translation: tri('Она уже закончила задачу.', 'Вона вже закінчила завдання.'), options: ['has', 'did', 'finished', 'does'], correctAnswer: 'has', correctFeedback: tri('Да. Already часто идет с Present Perfect: has already finished.', 'Так. Already часто йде з Present Perfect: has already finished.'), wrong: { did: tri('Did already finished неправильно. Нужно has already finished.', 'Did already finished неправильно. Потрібно has already finished.'), finished: tri('Finished already возможно в разговоре в некоторых вариантах, но в этом блоке тренируем стандартное has already finished.', 'Finished already можливе в розмові в деяких варіантах, але в цьому блоці тренуємо стандартне has already finished.'), does: tri('Does не строит Present Perfect. Нужно has.', 'Does не будує Present Perfect. Потрібно has.') }, retryFeedback: [tri('She + has already finished.'), tri('Has already finished.'), tri('Подсказка: She has already finished the task.', 'Підказка: She has already finished the task.')], focusWords: ['has already', 'finished'] }),
    step({ id: 'pp_vs_past_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'yet_present_perfect_negative', sentence: 'I ___ finished it yet.', translation: tri('Я ещё не закончил это.', 'Я ще не закінчив це.'), options: ["haven't", "didn't", "don't", "wasn't"], correctAnswer: "haven't", correctFeedback: tri("Да. Not yet часто идет с Present Perfect: haven't finished yet.", "Так. Not yet часто йде з Present Perfect: haven't finished yet."), wrong: { "didn't": tri("Didn't finished неправильно. Для “ещё не закончил” нужно haven't finished yet.", "Didn't finished неправильно. Для “ще не закінчив” потрібно haven't finished yet."), "don't": tri("Don't finished неправильно. Нужна форма haven't finished.", "Don't finished неправильно. Потрібна форма haven't finished."), "wasn't": tri("Wasn't finished может быть passive/adjective в другом контексте. Здесь нужно haven't finished.", "Wasn't finished може бути passive/adjective в іншому контексті. Тут потрібно haven't finished.") }, retryFeedback: [tri("Ещё не = haven't + V3 + yet.", "Ще не = haven't + V3 + yet."), tri("Haven't finished yet."), tri("Подсказка: I haven't finished it yet.", "Підказка: I haven't finished it yet.")], focusWords: ["haven't", 'yet'] }),
    step({ id: 'pp_vs_past_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'never_present_perfect', sentence: 'I ___ never tried it.', translation: tri('Я никогда этого не пробовал.', 'Я ніколи цього не пробував.'), options: ['have', 'did', 'was', 'do'], correctAnswer: 'have', correctFeedback: tri('Да. Never для опыта до настоящего момента часто идет с Present Perfect: have never tried.', 'Так. Never для досвіду до теперішнього моменту часто йде з Present Perfect: have never tried.'), wrong: { did: tri('Did never tried неправильно. Для опыта нужен have never tried.', 'Did never tried неправильно. Для досвіду потрібно have never tried.'), was: tri('Was never tried не подходит для этого смысла. Нужно have never tried.', 'Was never tried не підходить для цього сенсу. Потрібно have never tried.'), do: tri('Do never tried неправильно. Нужна форма have never tried.', 'Do never tried неправильно. Потрібна форма have never tried.') }, retryFeedback: [tri('Never + experience = have never tried.'), tri('I have never tried it.'), tri('Подсказка: I have never tried it.', 'Підказка: I have never tried it.')], focusWords: ['have never', 'tried'] }),
    step({ id: 'pp_vs_past_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_experience_yesterday', sentence: 'Choose the correct pair.', translation: tri('Ты когда-нибудь пробовал это? / ты пробовал это вчера?', 'Ти коли-небудь пробував це? / ти пробував це вчора?'), options: ['Have you ever tried it? / Did you try it yesterday?', 'Did you ever tried it? / Have you tried it yesterday?', 'Have you ever try it? / Did you tried it yesterday?', 'Do you ever tried it? / Did you have tried it yesterday?'], correctAnswer: 'Have you ever tried it? / Did you try it yesterday?', correctFeedback: tri('Да. Ever experience = Have you ever tried. Yesterday = Did you try.', 'Так. Ever experience = Have you ever tried. Yesterday = Did you try.'), wrong: { 'Did you ever tried it? / Have you tried it yesterday?': tri('После did нужен try, не tried. С yesterday нужен Did you try, не Have you tried.', 'Після did потрібен try, не tried. З yesterday потрібно Did you try, не Have you tried.'), 'Have you ever try it? / Did you tried it yesterday?': tri('После have нужен tried. После did нужен try.', 'Після have потрібен tried. Після did потрібен try.'), 'Do you ever tried it? / Did you have tried it yesterday?': tri('Обе структуры сломаны. Нужна пара Have you ever tried / Did you try yesterday.', 'Обидві структури зламані. Потрібна пара Have you ever tried / Did you try yesterday.') }, retryFeedback: [tri('Ever = have tried. Yesterday = did try.'), tri('Have you ever tried? / Did you try yesterday?'), tri('Подсказка: Have you ever tried it? / Did you try it yesterday?', 'Підказка: Have you ever tried it? / Did you try it yesterday?')], focusWords: ['ever', 'yesterday'] }),
    step({ id: 'pp_vs_past_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_already_last_week', sentence: 'Choose the correct pair.', translation: tri('Она уже закончила / она закончила на прошлой неделе', 'Вона вже закінчила / вона закінчила минулого тижня'), options: ['She has already finished / She finished last week', 'She already finished / She has finished last week', 'She has already finish / She has finished last week', 'She did already finished / She finished already last week'], correctAnswer: 'She has already finished / She finished last week', correctFeedback: tri('Да. Already с результатом = has already finished. Last week = finished.', 'Так. Already з результатом = has already finished. Last week = finished.'), wrong: { 'She already finished / She has finished last week': tri('Вторая часть неправильная: с last week нужен Past Simple. Для первой в этом блоке лучше has already finished.', 'Друга частина неправильна: з last week потрібен Past Simple. Для першої в цьому блоці краще has already finished.'), 'She has already finish / She has finished last week': tri('После has нужен finished, а с last week не используем Present Perfect.', 'Після has потрібен finished, а з last week не використовуємо Present Perfect.'), 'She did already finished / She finished already last week': tri('Did already finished неправильно. Finished already last week звучит плохо для этой пары.', 'Did already finished неправильно. Finished already last week звучить погано для цієї пари.') }, retryFeedback: [tri('Already = has finished. Last week = finished.'), tri('Has already finished / finished last week.'), tri('Подсказка: She has already finished / She finished last week.', 'Підказка: She has already finished / She finished last week.')], focusWords: ['already', 'last week'] }),
    step({ id: 'pp_vs_past_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Я никогда не был в Лондоне, но я ездил в Дублин в 2020 году.', 'Я ніколи не був у Лондоні, але я їздив до Дубліна у 2020 році.'), options: ['I have never been to London, but I went to Dublin in 2020.', 'I never was to London, but I have been to Dublin in 2020.', 'I have never was to London, but I have went to Dublin in 2020.', 'I did never been to London, but I went to Dublin in 2020.'], correctAnswer: 'I have never been to London, but I went to Dublin in 2020.', correctFeedback: tri('Да. Never experience = have never been. In 2020 = went.', 'Так. Never experience = have never been. In 2020 = went.'), wrong: { 'I never was to London, but I have been to Dublin in 2020.': tri('Для опыта лучше have never been. С in 2020 нужен Past Simple: went.', 'Для досвіду краще have never been. З in 2020 потрібен Past Simple: went.'), 'I have never was to London, but I have went to Dublin in 2020.': tri('После have нужен been, не was. Have went неправильно, и с in 2020 нужен went.', 'Після have потрібен been, не was. Have went неправильно, і з in 2020 потрібен went.'), 'I did never been to London, but I went to Dublin in 2020.': tri('Did never been неправильно. Для опыта нужен have never been.', 'Did never been неправильно. Для досвіду потрібен have never been.') }, retryFeedback: [tri('Never experience = have been. In 2020 = went.'), tri('Have never been / went in 2020.'), tri('Подсказка: I have never been to London, but I went to Dublin in 2020.', 'Підказка: I have never been to London, but I went to Dublin in 2020.')], focusWords: ['never', 'in 2020'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'present_perfect_with_finished_time_error',
      'past_simple_instead_of_experience_error',
      'past_simple_instead_of_result_now_error',
      'wrong_auxiliary_for_experience_error',
      'have_seen_yesterday_error',
      'did_ever_been_error',
      'when_present_perfect_error',
      'already_yet_past_simple_confusion',
      'specific_time_marker_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем, есть ли конкретное время или связь с настоящим.', 'Звичайне пояснення: показуємо, чи є конкретний час або зв’язок із теперішнім.'),
    depth2: tri('Проще: спрашиваем “когда?” или “есть результат/опыт сейчас?”.', 'Простіше: питаємо “коли?” або “є результат/досвід зараз?”.'),
    depth3: tri('Еще проще: показываем пары have lost / lost yesterday, have tried / tried yesterday.', 'Ще простіше: показуємо пари have lost / lost yesterday, have tried / tried yesterday.'),
    depth4: tri('Почти подсказка: прямо указываем Present Perfect или Past Simple.', 'Майже підказка: прямо вказуємо Present Perfect або Past Simple.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        'Остановись. Если есть конкретное время в прошлом: yesterday, last week, in 2020, ago - выбирай Past Simple. Если важен опыт, результат сейчас, already/yet/ever/never - часто выбирай Present Perfect.',
        'Зупинись. Якщо є конкретний час у минулому: yesterday, last week, in 2020, ago - обирай Past Simple. Якщо важливий досвід, результат зараз, already/yet/ever/never - часто обирай Present Perfect.',
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_time_connection_hint_then_retry',
      card: tri('Подсказка по времени: система покажет, есть ли finished time marker или связь с настоящим, но не выберет время за пользователя.', 'Підказка за часом: система покаже, чи є finished time marker або зв’язок із теперішнім, але не вибере час за користувача.'),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri('Режим подсказки: сначала выбери, есть конкретное время в прошлом или нет. Потом выбери, это опыт/результат сейчас или обычное прошлое событие.', 'Режим підказки: спочатку обери, є конкретний час у минулому чи ні. Потім обери, це досвід/результат зараз чи звичайна минула подія.'),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_pp_vs_past_001', prompt: tri('Yesterday обычно требует Present Perfect или Past Simple?', 'Yesterday зазвичай потребує Present Perfect чи Past Simple?'), options: ['Present Perfect', 'Past Simple'], correctIndex: 1, thenReturnToExerciseId: 'pp_vs_past_easy_002' },
      { id: 'guided_pp_vs_past_002', prompt: tri('Ever в вопросе обычно говорит об опыте или конкретном времени?', 'Ever у питанні зазвичай говорить про досвід чи конкретний час?'), options: ['опыт', 'конкретное время'], correctIndex: 0, thenReturnToExerciseId: 'pp_vs_past_contrast_001' },
      { id: 'guided_pp_vs_past_003', prompt: tri('In 2020 - это конкретное время в прошлом?', 'In 2020 - це конкретний час у минулому?'), options: ['да', 'нет'], correctIndex: 0, thenReturnToExerciseId: 'pp_vs_past_contrast_006' },
      { id: 'guided_pp_vs_past_004', prompt: tri('Если ключей сейчас нет, это результат сейчас или просто дата в прошлом?', 'Якщо ключів зараз немає, це результат зараз чи просто дата в минулому?'), options: ['результат сейчас', 'дата в прошлом'], correctIndex: 0, thenReturnToExerciseId: 'pp_vs_past_easy_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'present_perfect_vs_past_simple',
    diagnosisLabel: tri('Present Perfect vs Past Simple', 'Present Perfect vs Past Simple'),
    contrastSet: CONTRAST,
    difficultyLevel: 2,
    focusWords: ['have lost', 'lost yesterday', 'ever', 'never', 'already', 'yet', 'last week', 'ago', 'in 2020'],
    focusPatterns: [
      'result_now_present_perfect',
      'yesterday_past_simple',
      'result_vs_time_pair',
      'experience_present_perfect',
      'specific_time_past_question',
      'experience_vs_specific_pair',
      'last_week_past_simple',
      'ago_past_simple',
      'in_2020_past_simple',
      'already_present_perfect',
      'yet_present_perfect_negative',
      'never_present_perfect',
      'mixed_experience_yesterday',
      'mixed_already_last_week',
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
      microDiagnosisId: 'present_perfect_vs_past_simple',
      contrastSet: ['present perfect', 'past simple', 'result now', 'life experience', 'finished time'],
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logTimeMarker: true,
      logMeaningType: true,
      logChosenTense: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=present_perfect_vs_past_simple',
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


