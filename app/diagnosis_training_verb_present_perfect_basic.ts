import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = ['have + V3', 'has + V3', 'past participle', 'already', 'yet', 'ever', 'never', 'result now', 'life experience', 'past simple'];
const SMART_CONTRAST = ['have + V3', 'has + V3', 'past participle', 'already', 'yet', 'ever', 'never', 'result now', 'past simple'];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'Сначала найди have/has. Present Perfect строится как have/has + V3, а с конкретным прошлым временем часто нужен Past Simple.',
      'Спочатку знайди have/has. Present Perfect будується як have/has + V3, а з конкретним минулим часом часто потрібен Past Simple.',
      'First find have/has. Present Perfect is have/has + V3; a specific past time often needs Past Simple.',
    ),
    depth2,
    depth3,
    depth4,
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Здесь ошибка в have/has, V3 или слове already/yet/ever/never. Нужная форма: ${correct}.`,
    `Тут помилка в have/has, V3 або слові already/yet/ever/never. Потрібна форма: ${correct}.`,
    `Check have/has, V3, and already/yet/ever/never. Correct form: ${correct}.`,
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
      'Present Perfect связывает прошлое с настоящим: есть опыт, результат сейчас или действие уже/ещё не произошло. Форма: have/has + V3.',
      'Present Perfect пов’язує минуле з теперішнім: є досвід, результат зараз або дія вже/ще не сталася. Форма: have/has + V3.',
      'Present Perfect connects the past with now: experience, current result, already, or not yet. Form: have/has + V3.',
    ),
    microTask: tri(
      'Выбери форму, где правильно собраны have/has, V3 и маркеры already/yet/ever/never.',
      'Обери форму, де правильно зібрані have/has, V3 і маркери already/yet/ever/never.',
      'Choose the form with correct have/has, V3, and already/yet/ever/never.',
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
      'Скелет: I/you/we/they have + V3, he/she/it has + V3. Already обычно перед V3, yet в конце вопроса или отрицания.',
      'Скелет: I/you/we/they have + V3, he/she/it has + V3. Already зазвичай перед V3, yet у кінці питання або заперечення.',
      'Pattern: I/you/we/they have + V3, he/she/it has + V3. Already before V3; yet at the end of questions/negatives.',
    ),
    focusWords: input.focusWords,
  };
}

export const VERB_PRESENT_PERFECT_BASIC_TRAINING: DiagnosisTraining = {
  id: 'verb_present_perfect_basic',
  category: 'verb',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 38,
  supportedLocales: ['ru', 'uk'],
  title: tri('Present Perfect: опыт, результат, уже / ещё не', 'Present Perfect: досвід, результат, уже / ще не'),
  shortTitle: tri('Present Perfect', 'Present Perfect'),
  shortDiagnosis: tri(
    'Ты путаешь Present Perfect с Past Simple или строишь его без have/has.',
    'Ти плутаєш Present Perfect з Past Simple або будуєш його без have/has.',
  ),
  diagnosisText: tri(
    'Ты путаешь Present Perfect с Past Simple или строишь его без have/has. Главная проблема в том, что Present Perfect не просто “прошлое”. Он связывает прошлое действие с настоящим: есть опыт, есть результат сейчас, действие уже произошло или ещё не произошло.',
    'Ти плутаєш Present Perfect з Past Simple або будуєш його без have/has. Головна проблема в тому, що Present Perfect не просто “минуле”. Він зв’язує минулу дію з теперішнім: є досвід, є результат зараз, дія вже сталася або ще не сталася.',
  ),
  mentalModel: tri(
    'Present Perfect = have/has + past participle. I have finished = я закончил и результат важен сейчас. She has been there = у неё есть такой опыт. I have already done it = уже сделал. I haven’t done it yet = ещё не сделал.',
    'Present Perfect = have/has + past participle. I have finished = я закінчив і результат важливий зараз. She has been there = у неї є такий досвід. I have already done it = уже зробив. I haven’t done it yet = ще не зробив.',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'I/you/we/they have + V3: I have finished. He/she/it has + V3: She has finished. Already часто в утверждениях: I have already done it. Yet часто в вопросах и отрицаниях: Have you done it yet? I haven’t done it yet.',
    'I/you/we/they have + V3: I have finished. He/she/it has + V3: She has finished. Already часто у ствердженнях: I have already done it. Yet часто у питаннях і запереченнях: Have you done it yet? I haven’t done it yet.',
  ),
  whatUserMustLearn: {
    ru: [
      'Present Perfect строится через have/has + past participle: I have finished, she has finished.',
      'С I/you/we/they используется have: I have seen it, they have done it.',
      'С he/she/it используется has: he has seen it, she has done it.',
      'После have/has нужен past participle: have seen, не have saw.',
      'Already означает “уже” и часто стоит между have/has и V3: I have already finished.',
      'Yet означает “ещё / уже?” и часто идет в конце вопроса или отрицания.',
      'Ever используется в вопросах об опыте: Have you ever been there?',
      'Never используется для отсутствия опыта: I have never been there.',
      'Present Perfect часто говорит о результате сейчас: I have lost my keys = ключей сейчас нет.',
      'Past Simple нужен, когда важно конкретное время в прошлом: I lost my keys yesterday.',
    ],
    uk: [
      'Present Perfect будується через have/has + past participle: I have finished, she has finished.',
      'З I/you/we/they використовується have: I have seen it, they have done it.',
      'З he/she/it використовується has: he has seen it, she has done it.',
      'Після have/has потрібен past participle: have seen, не have saw.',
      'Already означає “уже” і часто стоїть між have/has і V3: I have already finished.',
      'Yet означає “ще / уже?” і часто йде в кінці питання або заперечення.',
      'Ever використовується у питаннях про досвід: Have you ever been there?',
      'Never використовується для відсутності досвіду: I have never been there.',
      'Present Perfect часто говорить про результат зараз: I have lost my keys = ключів зараз немає.',
      'Past Simple потрібен, коли важливий конкретний час у минулому: I lost my keys yesterday.',
    ],
    es: [
      'Present Perfect uses have/has + past participle.',
      'I/you/we/they use have.',
      'He/she/it uses has.',
      'Use the past participle after have/has.',
      'Already means already and often stands before V3.',
      'Yet is common at the end of questions and negatives.',
      'Ever asks about experience.',
      'Never says the experience is absent.',
      'Present Perfect often focuses on a result now.',
      'Past Simple is used with a specific past time.',
    ],
  },
  examples: [
    { en: 'I have finished the lesson.', ru: 'Я закончил урок.', uk: 'Я закінчив урок.', es: 'I have finished the lesson.', why: tri('Have finished показывает результат сейчас: урок уже закончен.', 'Have finished показує результат зараз: урок уже закінчений.') },
    { en: 'She has finished the lesson.', ru: 'Она закончила урок.', uk: 'Вона закінчила урок.', es: 'She has finished the lesson.', why: tri('She требует has. После has нужен past participle finished.', 'She потребує has. Після has потрібен past participle finished.') },
    { en: 'They have already left.', ru: 'Они уже ушли.', uk: 'Вони вже пішли.', es: 'They have already left.', why: tri('Already показывает, что действие уже произошло. Leave irregular: left.', 'Already показує, що дія вже сталася. Leave irregular: left.') },
    { en: 'I haven’t seen this film yet.', ru: 'Я ещё не видел этот фильм.', uk: 'Я ще не бачив цей фільм.', es: 'I haven’t seen this film yet.', why: tri('Haven’t + seen + yet = ещё не видел до текущего момента.', 'Haven’t + seen + yet = ще не бачив до поточного моменту.') },
    { en: 'Have you ever been to London?', ru: 'Ты когда-нибудь был в Лондоне?', uk: 'Ти коли-небудь був у Лондоні?', es: 'Have you ever been to London?', why: tri('Ever используется в вопросах об опыте. Been - past participle от be.', 'Ever використовується в питаннях про досвід. Been - past participle від be.') },
    { en: 'I have never tried it.', ru: 'Я никогда этого не пробовал.', uk: 'Я ніколи цього не пробував.', es: 'I have never tried it.', why: tri('Never показывает отсутствие опыта до настоящего момента.', 'Never показує відсутність досвіду до теперішнього моменту.') },
    { en: 'He has lost his keys.', ru: 'Он потерял ключи.', uk: 'Він загубив ключі.', es: 'He has lost his keys.', why: tri('Present Perfect подчеркивает результат сейчас: ключей нет.', 'Present Perfect підкреслює результат зараз: ключів немає.') },
    { en: 'I lost my keys yesterday.', ru: 'Я потерял ключи вчера.', uk: 'Я загубив ключі вчора.', es: 'I lost my keys yesterday.', why: tri('Yesterday - конкретное время в прошлом, поэтому Past Simple, не Present Perfect.', 'Yesterday - конкретний час у минулому, тому Past Simple, не Present Perfect.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты видишь прошлое действие и автоматически выбираешь Past Simple. Но иногда английский спрашивает не “когда?”, а “есть ли результат или опыт сейчас?”. Тогда нужен Present Perfect.', 'Схоже, ти бачиш минулу дію і автоматично обираєш Past Simple. Але іноді англійська питає не “коли?”, а “чи є результат або досвід зараз?”. Тоді потрібен Present Perfect.') },
    { id: 'intro_rule', type: 'rule', text: tri('Формула: have/has + V3. I have done. She has done. Have you done it yet?', 'Формула: have/has + V3. I have done. She has done. Have you done it yet?') },
    { id: 'intro_warning', type: 'warning', text: tri('Главные ошибки: I finished already, she have done, I have saw, Have you did it? Правильно: I have already finished, she has done, I have seen, Have you done it?', 'Головні помилки: I finished already, she have done, I have saw, Have you did it? Правильно: I have already finished, she has done, I have seen, Have you done it?') },
  ],
  steps: [
    step({ id: 'present_perfect_easy_001', order: 1, difficulty: 'easy', targetSkill: 'have_finished', sentence: 'I ___ finished the lesson.', translation: tri('Я закончил урок.', 'Я закінчив урок.'), options: ['have', 'has', 'did', 'am'], correctAnswer: 'have', correctFeedback: tri('Да. С I используется have: I have finished.', 'Так. З I використовується have: I have finished.'), wrong: { has: tri('Has используется с he/she/it. С I нужен have.', 'Has використовується з he/she/it. З I потрібен have.'), did: tri('Did не строит Present Perfect. Для finished в этой форме нужен have.', 'Did не будує Present Perfect. Для finished у цій формі потрібен have.'), am: tri('Am не строит Present Perfect. Нужна форма have finished.', 'Am не будує Present Perfect. Потрібна форма have finished.') }, retryFeedback: [tri('I + have + finished.'), tri('I have finished.'), tri('Подсказка: I have finished the lesson.', 'Підказка: I have finished the lesson.')], focusWords: ['I', 'have', 'finished'] }),
    step({ id: 'present_perfect_easy_002', order: 2, difficulty: 'easy', targetSkill: 'has_finished', sentence: 'She ___ finished the lesson.', translation: tri('Она закончила урок.', 'Вона закінчила урок.'), options: ['has', 'have', 'did', 'is'], correctAnswer: 'has', correctFeedback: tri('Да. She требует has: She has finished.', 'Так. She потребує has: She has finished.'), wrong: { have: tri('Have используется с I/you/we/they. С she нужен has.', 'Have використовується з I/you/we/they. З she потрібен has.'), did: tri('Did не строит Present Perfect. Нужна форма has finished.', 'Did не будує Present Perfect. Потрібна форма has finished.'), is: tri('Is finished может быть passive/adjective в другом контексте. Для Present Perfect нужен has finished.', 'Is finished може бути passive/adjective в іншому контексті. Для Present Perfect потрібен has finished.') }, retryFeedback: [tri('She + has + finished.'), tri('She has finished.'), tri('Подсказка: She has finished the lesson.', 'Підказка: She has finished the lesson.')], focusWords: ['she', 'has', 'finished'] }),
    step({ id: 'present_perfect_easy_003', order: 3, difficulty: 'easy', targetSkill: 'have_done', sentence: 'They ___ done it.', translation: tri('Они это сделали.', 'Вони це зробили.'), options: ['have', 'has', 'did', 'are'], correctAnswer: 'have', correctFeedback: tri('Да. They требует have. Done - past participle от do.', 'Так. They потребує have. Done - past participle від do.'), wrong: { has: tri('Has используется с he/she/it. They требует have.', 'Has використовується з he/she/it. They потребує have.'), did: tri('Did done неправильно. Present Perfect: have done.', 'Did done неправильно. Present Perfect: have done.'), are: tri('Are done не строит эту форму Present Perfect. Нужно have done.', 'Are done не будує цю форму Present Perfect. Потрібно have done.') }, retryFeedback: [tri('They + have + done.'), tri('They have done it.'), tri('Подсказка: They have done it.', 'Підказка: They have done it.')], focusWords: ['they', 'have', 'done'] }),
    step({ id: 'present_perfect_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'have_seen_not_saw', sentence: 'I have ___ this film.', translation: tri('Я видел этот фильм.', 'Я бачив цей фільм.'), options: ['seen', 'saw', 'see', 'seeing'], correctAnswer: 'seen', correctFeedback: tri('Да. После have нужен past participle: see → seen.', 'Так. Після have потрібен past participle: see → seen.'), wrong: { saw: tri('Saw - Past Simple форма. После have нужен past participle seen.', 'Saw - Past Simple форма. Після have потрібен past participle seen.'), see: tri('See - base form. После have нужен seen.', 'See - base form. Після have потрібен seen.'), seeing: tri('Seeing не подходит после have в Present Perfect. Нужно seen.', 'Seeing не підходить після have у Present Perfect. Потрібно seen.') }, retryFeedback: [tri('Have + seen. Не have saw.', 'Have + seen. Не have saw.'), tri('I have seen.'), tri('Подсказка: I have seen this film.', 'Підказка: I have seen this film.')], focusWords: ['have', 'seen', 'saw'] }),
    step({ id: 'present_perfect_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'has_been', sentence: 'She has ___ to London.', translation: tri('Она была в Лондоне.', 'Вона була в Лондоні.'), options: ['been', 'was', 'be', 'being'], correctAnswer: 'been', correctFeedback: tri('Да. Для опыта посещения используется has been to London.', 'Так. Для досвіду відвідування використовується has been to London.'), wrong: { was: tri('Was - Past Simple форма. После has нужен been.', 'Was - Past Simple форма. Після has потрібен been.'), be: tri('Be - base form. После has нужен been.', 'Be - base form. Після has потрібен been.'), being: tri('Being здесь не подходит. Для опыта нужен been.', 'Being тут не підходить. Для досвіду потрібен been.') }, retryFeedback: [tri('Has + been.'), tri('She has been to London.'), tri('Подсказка: She has been to London.', 'Підказка: She has been to London.')], focusWords: ['has', 'been'] }),
    step({ id: 'present_perfect_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'have_bought', sentence: 'We have ___ a new car.', translation: tri('Мы купили новую машину.', 'Ми купили нову машину.'), options: ['bought', 'buy', 'buyed', 'buying'], correctAnswer: 'bought', correctFeedback: tri('Да. Buy irregular. Past participle: bought.', 'Так. Buy irregular. Past participle: bought.'), wrong: { buy: tri('Buy - base form. После have нужен bought.', 'Buy - base form. Після have потрібен bought.'), buyed: tri('Buyed неправильно. Правильная форма: bought.', 'Buyed неправильно. Правильна форма: bought.'), buying: tri('Buying не подходит после have в Present Perfect. Нужно bought.', 'Buying не підходить після have у Present Perfect. Потрібно bought.') }, retryFeedback: [tri('Have + bought.'), tri('We have bought.'), tri('Подсказка: We have bought a new car.', 'Підказка: We have bought a new car.')], focusWords: ['have', 'bought'] }),
    step({ id: 'present_perfect_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'already_position', sentence: 'I have ___ finished the task.', translation: tri('Я уже закончил задачу.', 'Я вже закінчив завдання.'), options: ['already', 'yet', 'ever', 'never'], correctAnswer: 'already', correctFeedback: tri('Да. Already означает “уже” и часто стоит между have и V3.', 'Так. Already означає “уже” і часто стоїть між have і V3.'), wrong: { yet: tri('Yet обычно идет в вопросах и отрицаниях в конце. В утверждении “уже” = already.', 'Yet зазвичай йде в питаннях і запереченнях у кінці. У ствердженні “уже” = already.'), ever: tri('Ever используется в вопросах об опыте. Здесь “уже закончил” = already finished.', 'Ever використовується у питаннях про досвід. Тут “уже закінчив” = already finished.'), never: tri('Never означает никогда, но здесь смысл “уже”. Нужно already.', 'Never означає ніколи, але тут сенс “уже”. Потрібно already.') }, retryFeedback: [tri('Уже = already.', 'Уже = already.'), tri('Have already finished.'), tri('Подсказка: I have already finished the task.', 'Підказка: I have already finished the task.')], focusWords: ['already', 'finished'] }),
    step({ id: 'present_perfect_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'yet_negative', sentence: "I haven't finished the task ___.", translation: tri('Я ещё не закончил задачу.', 'Я ще не закінчив завдання.'), options: ['yet', 'already', 'ever', 'never'], correctAnswer: 'yet', correctFeedback: tri('Да. Yet часто стоит в конце отрицания: haven’t finished yet.', 'Так. Yet часто стоїть у кінці заперечення: haven’t finished yet.'), wrong: { already: tri('Already значит “уже”. В отрицании “ещё не” обычно нужен yet.', 'Already означає “уже”. У запереченні “ще не” зазвичай потрібен yet.'), ever: tri('Ever используется в вопросах об опыте. Здесь “ещё не” = yet.', 'Ever використовується в питаннях про досвід. Тут “ще не” = yet.'), never: tri('Never = никогда. Haven’t finished yet = ещё не закончил.', 'Never = ніколи. Haven’t finished yet = ще не закінчив.') }, retryFeedback: [tri('Ещё не = not ... yet.', 'Ще не = not ... yet.'), tri('Haven’t finished yet.'), tri('Подсказка: I haven’t finished the task yet.', 'Підказка: I haven’t finished the task yet.')], focusWords: ["haven't", 'yet'] }),
    step({ id: 'present_perfect_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'yet_question', sentence: 'Have you finished the task ___?', translation: tri('Ты уже закончил задачу?', 'Ти вже закінчив завдання?'), options: ['yet', 'already', 'never', 'still'], correctAnswer: 'yet', correctFeedback: tri('Да. В вопросе “уже?” часто используется yet в конце.', 'Так. У питанні “уже?” часто використовується yet у кінці.'), wrong: { already: tri('Already возможно в вопросах с оттенком удивления, но базовая учебная форма: Have you finished yet?', 'Already можливе в питаннях з відтінком здивування, але базова навчальна форма: Have you finished yet?'), never: tri('Never означает никогда. Здесь вопрос “уже?” = yet.', 'Never означає ніколи. Тут питання “уже?” = yet.'), still: tri('Still не завершает эту базовую структуру. Для “уже закончил?” нужно yet.', 'Still не завершує цю базову структуру. Для “уже закінчив?” потрібно yet.') }, retryFeedback: [tri('Уже? в вопросе = yet.', 'Уже? у питанні = yet.'), tri('Have you finished yet?'), tri('Подсказка: Have you finished the task yet?', 'Підказка: Have you finished the task yet?')], focusWords: ['have you', 'yet'] }),
    step({ id: 'present_perfect_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'ever_experience', sentence: 'Have you ___ been to London?', translation: tri('Ты когда-нибудь был в Лондоне?', 'Ти коли-небудь був у Лондоні?'), options: ['ever', 'never', 'yet', 'already'], correctAnswer: 'ever', correctFeedback: tri('Да. Ever используется в вопросах об опыте: Have you ever been...?', 'Так. Ever використовується в питаннях про досвід: Have you ever been...?'), wrong: { never: tri('Never означает никогда. В вопросе “когда-нибудь?” нужен ever.', 'Never означає ніколи. У питанні “коли-небудь?” потрібен ever.'), yet: tri('Yet спрашивает “уже?” про завершение. Для жизненного опыта нужен ever.', 'Yet питає “уже?” про завершення. Для життєвого досвіду потрібен ever.'), already: tri('Already не передает “когда-нибудь” в нейтральном вопросе об опыте. Нужно ever.', 'Already не передає “коли-небудь” у нейтральному питанні про досвід. Потрібно ever.') }, retryFeedback: [tri('Когда-нибудь? = ever.', 'Коли-небудь? = ever.'), tri('Have you ever been...?'), tri('Подсказка: Have you ever been to London?', 'Підказка: Have you ever been to London?')], focusWords: ['ever', 'been'] }),
    step({ id: 'present_perfect_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'never_experience', sentence: 'I have ___ been to London.', translation: tri('Я никогда не был в Лондоне.', 'Я ніколи не був у Лондоні.'), options: ['never', 'ever', 'yet', 'already'], correctAnswer: 'never', correctFeedback: tri('Да. Never показывает отсутствие опыта: I have never been.', 'Так. Never показує відсутність досвіду: I have never been.'), wrong: { ever: tri('Ever обычно используется в вопросах или с отрицанием. Здесь “никогда” = never.', 'Ever зазвичай використовується в питаннях або з запереченням. Тут “ніколи” = never.'), yet: tri('Yet = ещё/уже, обычно в конце. “Никогда” = never.', 'Yet = ще/уже, зазвичай у кінці. “Ніколи” = never.'), already: tri('Already = уже. Здесь смысл “никогда”, поэтому never.', 'Already = уже. Тут сенс “ніколи”, тому never.') }, retryFeedback: [tri('Никогда = never.', 'Ніколи = never.'), tri('I have never been.'), tri('Подсказка: I have never been to London.', 'Підказка: I have never been to London.')], focusWords: ['never', 'been'] }),
    step({ id: 'present_perfect_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'question_order_have', sentence: 'Choose the correct question.', translation: tri('Ты когда-нибудь пробовал это?', 'Ти коли-небудь пробував це?'), options: ['Have you ever tried it?', 'You have ever tried it?', 'Did you ever tried it?', 'Have you ever try it?'], correctAnswer: 'Have you ever tried it?', correctFeedback: tri('Да. В Present Perfect question have выходит перед subject, а try идет как tried.', 'Так. У Present Perfect question have виходить перед subject, а try іде як tried.'), wrong: { 'You have ever tried it?': tri('Это порядок утверждения. В вопросе нужно Have you ever tried it?', 'Це порядок ствердження. У питанні потрібно Have you ever tried it?'), 'Did you ever tried it?': tri('После did нельзя tried. А для опыта лучше Present Perfect: Have you ever tried it?', 'Після did не можна tried. А для досвіду краще Present Perfect: Have you ever tried it?'), 'Have you ever try it?': tri('После have нужен past participle: tried, не try.', 'Після have потрібен past participle: tried, не try.') }, retryFeedback: [tri('Have + you + ever + tried.'), tri('Have you ever tried it?'), tri('Подсказка: Have you ever tried it?', 'Підказка: Have you ever tried it?')], focusWords: ['have you', 'ever', 'tried'] }),
    step({ id: 'present_perfect_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'perfect_result_now', sentence: 'Choose the best sentence.', translation: tri('Он потерял ключи. Сейчас ключей нет.', 'Він загубив ключі. Зараз ключів немає.'), options: ['He has lost his keys.', 'He lost his keys yesterday.', 'He has lose his keys.', 'He have lost his keys.'], correctAnswer: 'He has lost his keys.', correctFeedback: tri('Да. Результат важен сейчас: ключей нет. He требует has, lost - V3.', 'Так. Результат важливий зараз: ключів немає. He потребує has, lost - V3.'), wrong: { 'He lost his keys yesterday.': tri('Эта фраза грамматически правильная, но добавляет конкретное время yesterday. Здесь фокус на результате сейчас, поэтому has lost.', 'Ця фраза граматично правильна, але додає конкретний час yesterday. Тут фокус на результаті зараз, тому has lost.'), 'He has lose his keys.': tri('После has нужен past participle. Нужно has lost, не has lose.', 'Після has потрібен past participle. Потрібно has lost, не has lose.'), 'He have lost his keys.': tri('He требует has, не have.', 'He потребує has, не have.') }, retryFeedback: [tri('Результат сейчас + he = has lost.', 'Результат зараз + he = has lost.'), tri('He has lost his keys.'), tri('Подсказка: He has lost his keys.', 'Підказка: He has lost his keys.')], focusWords: ['has lost', 'result now'] }),
    step({ id: 'present_perfect_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'past_simple_with_yesterday', sentence: 'Choose the best sentence.', translation: tri('Я потерял ключи вчера.', 'Я загубив ключі вчора.'), options: ['I lost my keys yesterday.', 'I have lost my keys yesterday.', 'I have lose my keys yesterday.', 'I have lost my keys yet.'], correctAnswer: 'I lost my keys yesterday.', correctFeedback: tri('Да. Yesterday - конкретное время в прошлом, поэтому Past Simple: lost.', 'Так. Yesterday - конкретний час у минулому, тому Past Simple: lost.'), wrong: { 'I have lost my keys yesterday.': tri('С конкретным временем yesterday обычно нужен Past Simple, не Present Perfect.', 'З конкретним часом yesterday зазвичай потрібен Past Simple, не Present Perfect.'), 'I have lose my keys yesterday.': tri('Здесь две проблемы: после have нужен lost, но с yesterday всё равно лучше Past Simple: I lost.', 'Тут дві проблеми: після have потрібен lost, але з yesterday усе одно краще Past Simple: I lost.'), 'I have lost my keys yet.': tri('Yet не используется так в обычном положительном утверждении. Для yesterday нужен Past Simple.', 'Yet не використовується так у звичайному позитивному ствердженні. Для yesterday потрібен Past Simple.') }, retryFeedback: [tri('Yesterday = Past Simple.'), tri('I lost my keys yesterday.'), tri('Подсказка: I lost my keys yesterday.', 'Підказка: I lost my keys yesterday.')], focusWords: ['yesterday', 'Past Simple'] }),
    step({ id: 'present_perfect_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Я уже сделал это, но она ещё не видела результат.', 'Я вже зробив це, але вона ще не бачила результат.'), options: ['I have already done it, but she hasn’t seen the result yet.', 'I already did it, but she hasn’t saw the result yet.', 'I have already did it, but she hasn’t seen the result already.', 'I have done already it, but she haven’t seen the result yet.'], correctAnswer: 'I have already done it, but she hasn’t seen the result yet.', correctFeedback: tri('Да. Have already done, hasn’t seen, yet в конце отрицания.', 'Так. Have already done, hasn’t seen, yet у кінці заперечення.'), wrong: { 'I already did it, but she hasn’t saw the result yet.': tri('Hasn’t saw неправильно. После hasn’t нужен seen. Первая часть возможна как Past Simple, но для “уже сделал” в этом блоке тренируем have already done.', 'Hasn’t saw неправильно. Після hasn’t потрібен seen. Перша частина можлива як Past Simple, але для “уже зробив” у цьому блоці тренуємо have already done.'), 'I have already did it, but she hasn’t seen the result already.': tri('Have already did неправильно, нужно done. В отрицании “ещё не” нужен yet, не already.', 'Have already did неправильно, потрібно done. У запереченні “ще не” потрібен yet, не already.'), 'I have done already it, but she haven’t seen the result yet.': tri('Already лучше между have и done. She требует hasn’t, не haven’t.', 'Already краще між have і done. She потребує hasn’t, не haven’t.') }, retryFeedback: [tri('Have already done / hasn’t seen yet.'), tri('I have already done it / she hasn’t seen it yet.'), tri('Подсказка: I have already done it, but she hasn’t seen the result yet.', 'Підказка: I have already done it, but she hasn’t seen the result yet.')], focusWords: ['already done', 'hasn’t seen', 'yet'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'missing_have_has_error',
      'have_has_agreement_error',
      'wrong_past_participle_error',
      'have_plus_past_simple_irregular_error',
      'already_position_error',
      'yet_position_error',
      'ever_never_error',
      'present_perfect_vs_past_simple_time_marker_error',
      'question_order_have_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем have/has, subject и нужный past participle.', 'Звичайне пояснення: показуємо have/has, subject і потрібний past participle.'),
    depth2: tri('Проще: спрашиваем, есть результат/опыт сейчас или указан конкретный момент в прошлом.', 'Простіше: питаємо, є результат/досвід зараз чи вказаний конкретний момент у минулому.'),
    depth3: tri('Еще проще: показываем пары I have done / I did it yesterday.', 'Ще простіше: показуємо пари I have done / I did it yesterday.'),
    depth4: tri('Почти подсказка: прямо указываем have/has + V3 или Past Simple.', 'Майже підказка: прямо вказуємо have/has + V3 або Past Simple.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        'Остановись. Present Perfect = have/has + V3. I/you/we/they have. He/she/it has. После have/has нужен V3: done, seen, been, finished. Already = уже. Yet = ещё/уже? в конце вопроса или отрицания.',
        'Зупинись. Present Perfect = have/has + V3. I/you/we/they have. He/she/it has. Після have/has потрібен V3: done, seen, been, finished. Already = уже. Yet = ще/уже? у кінці питання або заперечення.',
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_perfect_structure_hint_then_retry',
      card: tri(
        'Подсказка по структуре: система покажет subject, нужную форму have/has и тип V3, но не выберет ответ за пользователя.',
        'Підказка за структурою: система покаже subject, потрібну форму have/has і тип V3, але не вибере відповідь за користувача.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        'Режим подсказки: сначала выбери subject group. Потом выбери have или has. Затем система спросит V3 форму и вернет тебя к полной фразе.',
        'Режим підказки: спочатку обери subject group. Потім обери have або has. Потім система спитає V3 форму і поверне тебе до повної фрази.',
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_present_perfect_001', prompt: tri('С I в Present Perfect нужен have или has?', 'З I у Present Perfect потрібен have чи has?'), options: ['have', 'has'], correctIndex: 0, thenReturnToExerciseId: 'present_perfect_easy_001' },
      { id: 'guided_present_perfect_002', prompt: tri('С she в Present Perfect нужен have или has?', 'З she у Present Perfect потрібен have чи has?'), options: ['have', 'has'], correctIndex: 1, thenReturnToExerciseId: 'present_perfect_easy_002' },
      { id: 'guided_present_perfect_003', prompt: tri('После have правильно have saw или have seen?', 'Після have правильно have saw чи have seen?'), options: ['have saw', 'have seen'], correctIndex: 1, thenReturnToExerciseId: 'present_perfect_contrast_001' },
      { id: 'guided_present_perfect_004', prompt: tri('С yesterday обычно нужен Present Perfect или Past Simple?', 'З yesterday зазвичай потрібен Present Perfect чи Past Simple?'), options: ['Present Perfect', 'Past Simple'], correctIndex: 1, thenReturnToExerciseId: 'present_perfect_mixed_005' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'verb_present_perfect_basic',
    diagnosisLabel: tri('Present Perfect', 'Present Perfect'),
    contrastSet: SMART_CONTRAST,
    difficultyLevel: 2,
    focusWords: ['have finished', 'has finished', 'have seen', 'has been', 'already', 'yet', 'ever', 'never', 'has lost'],
    focusPatterns: [
      'have_finished',
      'has_finished',
      'have_done',
      'have_seen_not_saw',
      'has_been',
      'have_bought',
      'already_position',
      'yet_negative',
      'yet_question',
      'ever_experience',
      'never_experience',
      'question_order_have',
      'perfect_result_now',
      'past_simple_with_yesterday',
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
      microDiagnosisId: 'verb_present_perfect_basic',
      contrastSet: ['have + V3', 'has + V3', 'already', 'yet', 'ever', 'never', 'past simple'],
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logSubjectGroup: true,
      logHaveHasForm: true,
      logPastParticiple: true,
      logTimeMarker: true,
      logMeaningType: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=verb_present_perfect_basic',
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


