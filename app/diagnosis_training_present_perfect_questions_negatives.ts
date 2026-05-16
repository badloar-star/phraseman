import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = ['have you + V3', 'has she + V3', "haven't + V3", "hasn't + V3", 'yet', 'ever', 'already', 'did vs have'];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'Сначала реши: это question или negative. В question have/has выходит вперед; в negative not стоит после have/has. Основной verb всегда V3.',
      'Спочатку виріши: це question чи negative. У question have/has виходить вперед; у negative not стоїть після have/has. Основний verb завжди V3.',
      'First decide: question or negative. In questions have/has moves first; in negatives not follows have/has. The main verb is V3.',
    ),
    depth2,
    depth3,
    depth4,
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Проверь have/has, порядок вопроса и V3. Нужная форма: ${correct}.`,
    `Перевір have/has, порядок питання і V3. Потрібна форма: ${correct}.`,
    `Check have/has, question order, and V3. Correct form: ${correct}.`,
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
      "Present Perfect question = Have/Has + subject + V3? Negative = subject + haven't/hasn't + V3. Did здесь не нужен.",
      "Present Perfect question = Have/Has + subject + V3? Negative = subject + haven't/hasn't + V3. Did тут не потрібен.",
      "Present Perfect question = Have/Has + subject + V3? Negative = subject + haven't/hasn't + V3.",
    ),
    microTask: tri(
      'Выбери правильный вопрос или отрицание в Present Perfect.',
      'Обери правильне питання або заперечення у Present Perfect.',
      'Choose the correct Present Perfect question or negative.',
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
      "Скелет: Have you finished? Has she called? I haven't finished. She hasn't seen it. После have/has/haven't/hasn't нужен V3.",
      "Скелет: Have you finished? Has she called? I haven't finished. She hasn't seen it. Після have/has/haven't/hasn't потрібен V3.",
      "Pattern: Have you finished? Has she called? I haven't finished. She hasn't seen it.",
    ),
    focusWords: input.focusWords,
  };
}

export const PRESENT_PERFECT_QUESTIONS_NEGATIVES_TRAINING: DiagnosisTraining = {
  id: 'present_perfect_questions_negatives',
  category: 'verb',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 40,
  supportedLocales: ['ru', 'uk'],
  title: tri("Have you...? / Haven't: вопросы и отрицания", "Have you...? / Haven't: питання і заперечення"),
  shortTitle: tri('Perfect Questions / Negatives', 'Perfect Questions / Negatives'),
  shortDiagnosis: tri(
    'Ты путаешь вопросы и отрицания в Present Perfect: have/has, порядок вопроса, V3 и yet/ever/never.',
    'Ти плутаєш питання і заперечення в Present Perfect: have/has, порядок питання, V3 і yet/ever/never.',
  ),
  diagnosisText: tri(
    'Ты путаешь вопросы и отрицания в Present Perfect: забываешь have/has, ставишь did, используешь неправильную форму глагола после have/has или путаешь already и yet. Главная логика: в вопросе have/has выходит перед subject, в отрицании not идет после have/has, а основной глагол остается V3.',
    'Ти плутаєш питання і заперечення в Present Perfect: забуваєш have/has, ставиш did, використовуєш неправильну форму дієслова після have/has або плутаєш already і yet. Головна логіка: у питанні have/has виходить перед subject, у запереченні not іде після have/has, а основне дієслово залишається V3.',
  ),
  mentalModel: tri(
    "Present Perfect question = Have/Has + subject + V3? Have you finished? Has she called? Negative = subject + haven't/hasn't + V3: I haven't finished. She hasn't called. Did здесь не нужен.",
    "Present Perfect question = Have/Has + subject + V3? Have you finished? Has she called? Negative = subject + haven't/hasn't + V3: I haven't finished. She hasn't called. Did тут не потрібен.",
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    "Вопрос: Have you finished? Has she seen it? Отрицание: I haven't finished. She hasn't seen it. С yet: Have you finished yet? I haven't finished yet. С ever: Have you ever been there?",
    "Питання: Have you finished? Has she seen it? Заперечення: I haven't finished. She hasn't seen it. З yet: Have you finished yet? I haven't finished yet. З ever: Have you ever been there?",
  ),
  whatUserMustLearn: {
    ru: [
      'В вопросе Present Perfect have/has выходит перед subject: Have you finished?',
      'С he/she/it в вопросе используется has: Has she called?',
      'После have/has нужен V3: done, seen, finished, called.',
      'Нельзя говорить Did you have finished? или Did you finished?',
      "В отрицании используется haven't или hasn't.",
      "После haven't/hasn't нужен V3, не base form.",
      'Yet часто стоит в конце вопроса или отрицания.',
      'Ever используется в вопросах об опыте.',
      "Never уже несет отрицательный смысл: обычно не нужно haven't never.",
      'Already в вопросе возможно, но нейтральное “уже?” часто строится с yet.',
    ],
    uk: [
      'У питанні Present Perfect have/has виходить перед subject: Have you finished?',
      'З he/she/it у питанні використовується has: Has she called?',
      'Після have/has потрібен V3: done, seen, finished, called.',
      'Не можна говорити Did you have finished? або Did you finished?',
      "У запереченні використовується haven't або hasn't.",
      "Після haven't/hasn't потрібен V3, не base form.",
      'Yet часто стоїть у кінці питання або заперечення.',
      'Ever використовується в питаннях про досвід.',
      "Never уже несе заперечний сенс: зазвичай не потрібно haven't never.",
      'Already у питанні можливе, але нейтральне “уже?” часто будується з yet.',
    ],
    es: [
      'Present Perfect questions put have/has before the subject.',
      'He/she/it uses has.',
      'Have/has is followed by V3.',
      'Do not use did for Present Perfect questions.',
      "Negatives use haven't/hasn't.",
      "Haven't/hasn't is followed by V3.",
      'Yet often ends questions and negatives.',
      'Ever asks about experience.',
      'Never already makes the meaning negative.',
      'Neutral already? questions often use yet.',
    ],
  },
  examples: [
    { en: 'Have you finished the lesson?', ru: 'Ты закончил урок?', uk: 'Ти закінчив урок?', es: 'Have you finished the lesson?', why: tri('В вопросе Present Perfect have выходит перед subject you, затем идет V3 finished.', 'У питанні Present Perfect have виходить перед subject you, потім іде V3 finished.') },
    { en: 'Has she called you?', ru: 'Она тебе позвонила?', uk: 'Вона тобі подзвонила?', es: 'Has she called you?', why: tri('She требует has. Call regular, V3 = called.', 'She потребує has. Call regular, V3 = called.') },
    { en: "I haven't finished yet.", ru: 'Я ещё не закончил.', uk: 'Я ще не закінчив.', es: "I haven't finished yet.", why: tri("Haven't + V3 finished + yet в конце = ещё не закончил.", "Haven't + V3 finished + yet у кінці = ще не закінчив.") },
    { en: "She hasn't seen the message.", ru: 'Она не видела сообщение.', uk: 'Вона не бачила повідомлення.', es: "She hasn't seen the message.", why: tri("She требует hasn't. После hasn't нужен V3 seen, не see и не saw.", "She потребує hasn't. Після hasn't потрібен V3 seen, не see і не saw.") },
    { en: 'Have you ever tried it?', ru: 'Ты когда-нибудь это пробовал?', uk: 'Ти коли-небудь це пробував?', es: 'Have you ever tried it?', why: tri('Ever используется в вопросах об опыте. Структура: Have you ever + V3.', 'Ever використовується в питаннях про досвід. Структура: Have you ever + V3.') },
    { en: 'I have never tried it.', ru: 'Я никогда этого не пробовал.', uk: 'Я ніколи цього не пробував.', es: 'I have never tried it.', why: tri("Never уже делает смысл отрицательным. Поэтому have never tried, не haven't never tried.", "Never уже робить сенс заперечним. Тому have never tried, не haven't never tried.") },
    { en: 'Have they left yet?', ru: 'Они уже ушли?', uk: 'Вони вже пішли?', es: 'Have they left yet?', why: tri('В нейтральном вопросе “уже?” часто используем yet в конце.', 'У нейтральному питанні “уже?” часто використовуємо yet у кінці.') },
    { en: "They haven't left yet.", ru: 'Они ещё не ушли.', uk: 'Вони ще не пішли.', es: "They haven't left yet.", why: tri("Haven't left yet = ещё не ушли до текущего момента.", "Haven't left yet = ще не пішли до поточного моменту.") },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты строишь Present Perfect вопрос как Past Simple или как обычное утверждение. Но здесь вопрос начинается с have/has, а не с did и не с subject.', 'Схоже, ти будуєш Present Perfect question як Past Simple або як звичайне ствердження. Але тут питання починається з have/has, а не з did і не з subject.') },
    { id: 'intro_rule', type: 'rule', text: tri("Вопрос: Have/Has + subject + V3? Отрицание: subject + haven't/hasn't + V3.", "Питання: Have/Has + subject + V3? Заперечення: subject + haven't/hasn't + V3.") },
    { id: 'intro_warning', type: 'warning', text: tri("Главные ошибки: Did you finished? You have finished? She haven't seen. I haven't saw. Правильно: Have you finished? Has she seen? She hasn't seen. I haven't seen.", "Головні помилки: Did you finished? You have finished? She haven't seen. I haven't saw. Правильно: Have you finished? Has she seen? She hasn't seen. I haven't seen.") },
  ],
  steps: [
    step({ id: 'pp_qn_easy_001', order: 1, difficulty: 'easy', targetSkill: 'have_you_finished', sentence: '___ you finished the lesson?', translation: tri('Ты закончил урок?', 'Ти закінчив урок?'), options: ['Have', 'Did', 'Do', 'Are'], correctAnswer: 'Have', correctFeedback: tri('Да. Present Perfect question начинается с Have: Have you finished?', 'Так. Present Perfect question починається з Have: Have you finished?'), wrong: { Did: tri('Did не строит Present Perfect. Нельзя Did you finished. Нужно Have you finished.', 'Did не будує Present Perfect. Не можна Did you finished. Потрібно Have you finished.'), Do: tri('Do используется для Present Simple. Здесь finished в Present Perfect требует Have.', 'Do використовується для Present Simple. Тут finished у Present Perfect потребує Have.'), Are: tri('Are не строит Present Perfect. Нужно Have you finished.', 'Are не будує Present Perfect. Потрібно Have you finished.') }, retryFeedback: [tri('Question = Have + you + finished?'), tri('Have you finished?'), tri('Подсказка: Have you finished the lesson?', 'Підказка: Have you finished the lesson?')], focusWords: ['have you', 'finished'] }),
    step({ id: 'pp_qn_easy_002', order: 2, difficulty: 'easy', targetSkill: 'have_they_left', sentence: '___ they left yet?', translation: tri('Они уже ушли?', 'Вони вже пішли?'), options: ['Have', 'Has', 'Did', 'Are'], correctAnswer: 'Have', correctFeedback: tri('Да. They требует have. Left - V3 от leave.', 'Так. They потребує have. Left - V3 від leave.'), wrong: { Has: tri('Has используется с he/she/it. They требует have.', 'Has використовується з he/she/it. They потребує have.'), Did: tri('Did they left неправильно. Для Present Perfect нужен Have they left?', 'Did they left неправильно. Для Present Perfect потрібно Have they left?'), Are: tri('Are they left не строит Present Perfect. Нужно Have they left?', 'Are they left не будує Present Perfect. Потрібно Have they left?') }, retryFeedback: [tri('They = have.'), tri('Have they left yet?'), tri('Подсказка: Have they left yet?', 'Підказка: Have they left yet?')], focusWords: ['have they', 'left yet'] }),
    step({ id: 'pp_qn_easy_003', order: 3, difficulty: 'easy', targetSkill: 'question_order_have', sentence: 'Choose the correct question.', translation: tri('Ты сделал это?', 'Ти зробив це?'), options: ['Have you done it?', 'You have done it?', 'Did you done it?', 'Do you have done it?'], correctAnswer: 'Have you done it?', correctFeedback: tri('Да. В вопросе have выходит перед subject: Have you done it?', 'Так. У питанні have виходить перед subject: Have you done it?'), wrong: { 'You have done it?': tri('Это порядок утверждения. В базовом вопросе нужно Have you done it?', 'Це порядок ствердження. У базовому питанні потрібно Have you done it?'), 'Did you done it?': tri('Did you done неправильно. Для Present Perfect нужно Have you done.', 'Did you done неправильно. Для Present Perfect потрібно Have you done.'), 'Do you have done it?': tri('Do не нужен с Present Perfect. Have сам выходит вперед.', 'Do не потрібен з Present Perfect. Have сам виходить вперед.') }, retryFeedback: [tri('Have перед you.', 'Have перед you.'), tri('Have you done it?'), tri('Подсказка: Have you done it?', 'Підказка: Have you done it?')], focusWords: ['have you', 'done'] }),
    step({ id: 'pp_qn_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'has_she_called', sentence: '___ she called you?', translation: tri('Она тебе позвонила?', 'Вона тобі подзвонила?'), options: ['Has', 'Have', 'Did', 'Does'], correctAnswer: 'Has', correctFeedback: tri('Да. She требует has: Has she called you?', 'Так. She потребує has: Has she called you?'), wrong: { Have: tri('Have используется с I/you/we/they. She требует has.', 'Have використовується з I/you/we/they. She потребує has.'), Did: tri('Did she called неправильно. Для Present Perfect нужен Has she called?', 'Did she called неправильно. Для Present Perfect потрібно Has she called?'), Does: tri('Does используется для Present Simple. Здесь нужна форма Has she called?', 'Does використовується для Present Simple. Тут потрібна форма Has she called?') }, retryFeedback: [tri('She = has.'), tri('Has she called you?'), tri('Подсказка: Has she called you?', 'Підказка: Has she called you?')], focusWords: ['has she', 'called'] }),
    step({ id: 'pp_qn_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'has_he_seen', sentence: 'Has he ___ the message?', translation: tri('Он видел сообщение?', 'Він бачив повідомлення?'), options: ['seen', 'saw', 'see', 'seeing'], correctAnswer: 'seen', correctFeedback: tri('Да. После has нужен V3: seen.', 'Так. Після has потрібен V3: seen.'), wrong: { saw: tri('Saw - Past Simple форма. После has нужен V3 seen.', 'Saw - Past Simple форма. Після has потрібен V3 seen.'), see: tri('See - base form. После has нужен seen.', 'See - base form. Після has потрібен seen.'), seeing: tri('Seeing не подходит после has в Present Perfect. Нужно seen.', 'Seeing не підходить після has у Present Perfect. Потрібно seen.') }, retryFeedback: [tri('Has + seen.'), tri('Has he seen?'), tri('Подсказка: Has he seen the message?', 'Підказка: Has he seen the message?')], focusWords: ['has', 'seen'] }),
    step({ id: 'pp_qn_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'has_it_started', sentence: '___ it started?', translation: tri('Это началось?', 'Це почалося?'), options: ['Has', 'Have', 'Did', 'Is'], correctAnswer: 'Has', correctFeedback: tri('Да. It требует has: Has it started?', 'Так. It потребує has: Has it started?'), wrong: { Have: tri('Have не используется с it. Нужно has.', 'Have не використовується з it. Потрібно has.'), Did: tri('Did it started неправильно. В Present Perfect: Has it started?', 'Did it started неправильно. У Present Perfect: Has it started?'), Is: tri('Is it started не строит Present Perfect. Нужно Has it started?', 'Is it started не будує Present Perfect. Потрібно Has it started?') }, retryFeedback: [tri('It = has.'), tri('Has it started?'), tri('Подсказка: Has it started?', 'Підказка: Has it started?')], focusWords: ['has it', 'started'] }),
    step({ id: 'pp_qn_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'haven_t_finished', sentence: 'I ___ finished yet.', translation: tri('Я ещё не закончил.', 'Я ще не закінчив.'), options: ["haven't", "hasn't", "didn't", "don't"], correctAnswer: "haven't", correctFeedback: tri("Да. С I используется haven't: I haven't finished yet.", "Так. З I використовується haven't: I haven't finished yet."), wrong: { "hasn't": tri("Hasn't используется с he/she/it. С I нужно haven't.", "Hasn't використовується з he/she/it. З I потрібно haven't."), "didn't": tri("Didn't finished неправильно. Для Present Perfect negative нужно haven't finished.", "Didn't finished неправильно. Для Present Perfect negative потрібно haven't finished."), "don't": tri("Don't не строит Present Perfect. Нужно haven't.", "Don't не будує Present Perfect. Потрібно haven't.") }, retryFeedback: [tri("I = haven't."), tri("I haven't finished yet."), tri("Подсказка: I haven't finished yet.", "Підказка: I haven't finished yet.")], focusWords: ["haven't", 'finished yet'] }),
    step({ id: 'pp_qn_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'hasn_t_called', sentence: 'She ___ called me.', translation: tri('Она мне не позвонила.', 'Вона мені не подзвонила.'), options: ["hasn't", "haven't", "didn't", "doesn't"], correctAnswer: "hasn't", correctFeedback: tri("Да. She требует hasn't: She hasn't called me.", "Так. She потребує hasn't: She hasn't called me."), wrong: { "haven't": tri("Haven't используется с I/you/we/they. She требует hasn't.", "Haven't використовується з I/you/we/they. She потребує hasn't."), "didn't": tri("Didn't called неправильно. Для Present Perfect нужно hasn't called.", "Didn't called неправильно. Для Present Perfect потрібно hasn't called."), "doesn't": tri("Doesn't called неправильно. Здесь нужна форма hasn't called.", "Doesn't called неправильно. Тут потрібна форма hasn't called.") }, retryFeedback: [tri("She = hasn't."), tri("She hasn't called me."), tri("Подсказка: She hasn't called me.", "Підказка: She hasn't called me.")], focusWords: ["hasn't", 'called'] }),
    step({ id: 'pp_qn_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'haven_t_seen', sentence: "I haven't ___ it.", translation: tri('Я этого не видел.', 'Я цього не бачив.'), options: ['seen', 'saw', 'see', 'seeing'], correctAnswer: 'seen', correctFeedback: tri("Да. После haven't нужен V3: seen.", "Так. Після haven't потрібен V3: seen."), wrong: { saw: tri("Haven't saw неправильно. После haven't нужен seen.", "Haven't saw неправильно. Після haven't потрібен seen."), see: tri("Haven't see неправильно. После haven't нужен V3 seen.", "Haven't see неправильно. Після haven't потрібен V3 seen."), seeing: tri("Haven't seeing неправильно. Нужно haven't seen.", "Haven't seeing неправильно. Потрібно haven't seen.") }, retryFeedback: [tri("Haven't + seen."), tri("I haven't seen it."), tri("Подсказка: I haven't seen it.", "Підказка: I haven't seen it.")], focusWords: ["haven't", 'seen'] }),
    step({ id: 'pp_qn_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'yet_question', sentence: 'Have you finished ___?', translation: tri('Ты уже закончил?', 'Ти вже закінчив?'), options: ['yet', 'already', 'never', 'ever'], correctAnswer: 'yet', correctFeedback: tri('Да. В нейтральном вопросе “уже?” часто ставим yet в конце.', 'Так. У нейтральному питанні “уже?” часто ставимо yet у кінці.'), wrong: { already: tri('Already возможно с оттенком удивления, но базовый нейтральный вопрос: Have you finished yet?', 'Already можливе з відтінком здивування, але базове нейтральне питання: Have you finished yet?'), never: tri('Never означает никогда. Здесь вопрос “уже?” = yet.', 'Never означає ніколи. Тут питання “уже?” = yet.'), ever: tri('Ever спрашивает о жизненном опыте. Здесь завершение задачи: yet.', 'Ever питає про життєвий досвід. Тут завершення завдання: yet.') }, retryFeedback: [tri('Уже? в конце вопроса = yet.', 'Уже? в кінці питання = yet.'), tri('Have you finished yet?'), tri('Подсказка: Have you finished yet?', 'Підказка: Have you finished yet?')], focusWords: ['yet', 'question'] }),
    step({ id: 'pp_qn_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'ever_question', sentence: 'Have you ___ been there?', translation: tri('Ты когда-нибудь там был?', 'Ти коли-небудь там був?'), options: ['ever', 'yet', 'already', 'never'], correctAnswer: 'ever', correctFeedback: tri('Да. Ever используется в вопросах об опыте: Have you ever been there?', 'Так. Ever використовується в питаннях про досвід: Have you ever been there?'), wrong: { yet: tri('Yet спрашивает “уже?” о завершении. Для опыта “когда-нибудь” нужен ever.', 'Yet питає “уже?” про завершення. Для досвіду “коли-небудь” потрібен ever.'), already: tri('Already не передает нейтральное “когда-нибудь”. Нужно ever.', 'Already не передає нейтральне “коли-небудь”. Потрібно ever.'), never: tri('Never означает никогда, а вопрос “когда-нибудь?” = ever.', 'Never означає ніколи, а питання “коли-небудь?” = ever.') }, retryFeedback: [tri('Когда-нибудь? = ever.', 'Коли-небудь? = ever.'), tri('Have you ever been there?'), tri('Подсказка: Have you ever been there?', 'Підказка: Have you ever been there?')], focusWords: ['ever', 'been'] }),
    step({ id: 'pp_qn_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'never_no_double_negative', sentence: 'Choose the correct sentence.', translation: tri('Я никогда там не был.', 'Я ніколи там не був.'), options: ['I have never been there.', "I haven't never been there.", "I didn't never been there.", 'I have ever not been there.'], correctAnswer: 'I have never been there.', correctFeedback: tri("Да. Never уже делает смысл отрицательным. Не нужен haven't never.", "Так. Never уже робить сенс заперечним. Не потрібен haven't never."), wrong: { "I haven't never been there.": tri("Haven't never - двойное отрицание в учебной норме. Нужно I have never been there.", "Haven't never - подвійне заперечення в навчальній нормі. Потрібно I have never been there."), "I didn't never been there.": tri('Did never been неправильно. Для опыта нужен have never been.', 'Did never been неправильно. Для досвіду потрібно have never been.'), 'I have ever not been there.': tri('Для “никогда не был” нужна простая форма have never been.', 'Для “ніколи не був” потрібна проста форма have never been.') }, retryFeedback: [tri('Никогда = have never.', 'Ніколи = have never.'), tri('I have never been there.'), tri('Подсказка: I have never been there.', 'Підказка: I have never been there.')], focusWords: ['have never', 'been'] }),
    step({ id: 'pp_qn_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_question_negative_pair', sentence: 'Choose the correct pair.', translation: tri('Ты закончил? / я ещё не закончил', 'Ти закінчив? / я ще не закінчив'), options: ["Have you finished? / I haven't finished yet", "Did you finished? / I didn't finished yet", "You have finished? / I haven't finish yet", "Have you finish? / I didn't finish yet"], correctAnswer: "Have you finished? / I haven't finished yet", correctFeedback: tri("Да. Вопрос: Have you + V3. Отрицание: haven't + V3 + yet.", "Так. Питання: Have you + V3. Заперечення: haven't + V3 + yet."), wrong: { "Did you finished? / I didn't finished yet": tri("Did you finished и didn't finished неправильны. Для Present Perfect нужен have/haven't + finished.", "Did you finished і didn't finished неправильні. Для Present Perfect потрібен have/haven't + finished."), "You have finished? / I haven't finish yet": tri("Вопрос должен начинаться с Have. После haven't нужен finished, не finish.", "Питання має починатися з Have. Після haven't потрібен finished, не finish."), "Have you finish? / I didn't finish yet": tri("После have нужен finished. Для “ещё не” здесь лучше haven't finished yet.", "Після have потрібен finished. Для “ще не” тут краще haven't finished yet.") }, retryFeedback: [tri("Have you finished / haven't finished yet."), tri("Have you finished? / I haven't finished yet."), tri("Подсказка: Have you finished? / I haven't finished yet.", "Підказка: Have you finished? / I haven't finished yet.")], focusWords: ['have you', "haven't", 'yet'] }),
    step({ id: 'pp_qn_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_has_question_negative', sentence: 'Choose the correct pair.', translation: tri('Она звонила? / она ещё не звонила', 'Вона дзвонила? / вона ще не дзвонила'), options: ["Has she called? / She hasn't called yet", "Have she called? / She haven't called yet", "Did she called? / She didn't called yet", "Has she call? / She hasn't call yet"], correctAnswer: "Has she called? / She hasn't called yet", correctFeedback: tri("Да. She требует has/hasn't, а call идет как V3 called.", "Так. She потребує has/hasn't, а call іде як V3 called."), wrong: { "Have she called? / She haven't called yet": tri("She требует has и hasn't, не have/haven't.", "She потребує has і hasn't, не have/haven't."), "Did she called? / She didn't called yet": tri("Did she called и didn't called неправильны. Нужны Has she called / hasn't called.", "Did she called і didn't called неправильні. Потрібні Has she called / hasn't called."), "Has she call? / She hasn't call yet": tri("После has/hasn't нужен V3 called, не call.", "Після has/hasn't потрібен V3 called, не call.") }, retryFeedback: [tri("She = has/hasn't + called."), tri("Has she called? / She hasn't called yet."), tri("Подсказка: Has she called? / She hasn't called yet.", "Підказка: Has she called? / She hasn't called yet.")], focusWords: ['has she', "hasn't", 'called'] }),
    step({ id: 'pp_qn_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Ты когда-нибудь видел это? Я ещё этого не видел.', 'Ти коли-небудь бачив це? Я ще цього не бачив.'), options: ["Have you ever seen it? I haven't seen it yet.", "Did you ever saw it? I didn't saw it yet.", "Have you ever saw it? I haven't see it yet.", "You have ever seen it? I haven't seen it already."], correctAnswer: "Have you ever seen it? I haven't seen it yet.", correctFeedback: tri("Да. Have you ever seen = вопрос об опыте. Haven't seen yet = ещё не видел.", "Так. Have you ever seen = питання про досвід. Haven't seen yet = ще не бачив."), wrong: { "Did you ever saw it? I didn't saw it yet.": tri('Did you ever saw и didn’t saw неправильны. Для опыта и yet нужен Present Perfect.', 'Did you ever saw і didn’t saw неправильні. Для досвіду і yet потрібен Present Perfect.'), "Have you ever saw it? I haven't see it yet.": tri("После have/haven't нужен seen, не saw и не see.", "Після have/haven't потрібен seen, не saw і не see."), "You have ever seen it? I haven't seen it already.": tri('Вопрос должен начинаться с Have. В отрицании “ещё не” нужен yet, не already.', 'Питання має починатися з Have. У запереченні “ще не” потрібен yet, не already.') }, retryFeedback: [tri("Have you ever seen? Haven't seen yet."), tri("Have you ever seen it? / I haven't seen it yet."), tri("Подсказка: Have you ever seen it? I haven't seen it yet.", "Підказка: Have you ever seen it? I haven't seen it yet.")], focusWords: ['have you ever', "haven't seen", 'yet'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'question_order_have_has_error',
      'did_instead_of_have_error',
      'have_has_agreement_error',
      'negative_have_has_agreement_error',
      'wrong_past_participle_error',
      'haven_t_plus_base_error',
      'haven_t_plus_past_simple_error',
      'yet_position_error',
      'ever_question_error',
      'double_negative_never_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем have/has, subject и V3.', 'Звичайне пояснення: показуємо have/has, subject і V3.'),
    depth2: tri('Проще: спрашиваем, это вопрос или отрицание, и кто subject.', 'Простіше: питаємо, це питання чи заперечення, і хто subject.'),
    depth3: tri("Еще проще: показываем шаблоны Have you done? / She hasn't done.", "Ще простіше: показуємо шаблони Have you done? / She hasn't done."),
    depth4: tri("Почти подсказка: прямо указываем have/has/haven't/hasn't и нужный V3.", "Майже підказка: прямо вказуємо have/has/haven't/hasn't і потрібний V3."),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        "Остановись. Present Perfect вопрос: Have/Has + subject + V3? Present Perfect отрицание: subject + haven't/hasn't + V3. Did здесь не нужен. После have/has/haven't/hasn't нужен V3: done, seen, called, finished.",
        "Зупинись. Present Perfect питання: Have/Has + subject + V3? Present Perfect заперечення: subject + haven't/hasn't + V3. Did тут не потрібен. Після have/has/haven't/hasn't потрібен V3: done, seen, called, finished.",
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_question_negative_hint_then_retry',
      card: tri(
        'Подсказка по структуре: система покажет, это question или negative, subject group и нужную форму have/has, но не выберет весь ответ за пользователя.',
        'Підказка за структурою: система покаже, це question чи negative, subject group і потрібну форму have/has, але не вибере всю відповідь за користувача.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        "Режим подсказки: сначала выбери question или negative. Потом выбери have/has/haven't/hasn't. Затем система спросит V3 форму.",
        "Режим підказки: спочатку обери question або negative. Потім обери have/has/haven't/hasn't. Потім система спитає V3 форму.",
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_pp_qn_001', prompt: tri('В вопросе Present Perfect have стоит перед subject или после subject?', 'У питанні Present Perfect have стоїть перед subject чи після subject?'), options: ['перед subject', 'после subject'], correctIndex: 0, thenReturnToExerciseId: 'pp_qn_easy_001' },
      { id: 'guided_pp_qn_002', prompt: tri('С she в Present Perfect нужен has или have?', 'З she у Present Perfect потрібен has чи have?'), options: ['has', 'have'], correctIndex: 0, thenReturnToExerciseId: 'pp_qn_contrast_001' },
      { id: 'guided_pp_qn_003', prompt: tri("После haven't правильно seen или see?", "Після haven't правильно seen чи see?"), options: ['seen', 'see'], correctIndex: 0, thenReturnToExerciseId: 'pp_qn_contrast_006' },
      { id: 'guided_pp_qn_004', prompt: tri('В вопросе об опыте “когда-нибудь” обычно ever или yet?', 'У питанні про досвід “коли-небудь” зазвичай ever чи yet?'), options: ['ever', 'yet'], correctIndex: 0, thenReturnToExerciseId: 'pp_qn_mixed_002' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'present_perfect_questions_negatives',
    diagnosisLabel: tri('Present Perfect: вопросы и отрицания', 'Present Perfect: питання і заперечення'),
    contrastSet: CONTRAST,
    difficultyLevel: 2,
    focusWords: ['have you', 'has she', "haven't", "hasn't", 'seen', 'finished', 'yet', 'ever'],
    focusPatterns: [
      'have_you_finished',
      'have_they_left',
      'question_order_have',
      'has_she_called',
      'has_he_seen',
      'has_it_started',
      'haven_t_finished',
      'hasn_t_called',
      'haven_t_seen',
      'yet_question',
      'ever_question',
      'never_no_double_negative',
      'mixed_question_negative_pair',
      'mixed_has_question_negative',
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
      microDiagnosisId: 'present_perfect_questions_negatives',
      contrastSet: ['have/has question', "haven't/hasn't negative", 'yet', 'ever', 'never'],
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logSubjectGroup: true,
      logHaveHasForm: true,
      logPastParticiple: true,
      logSentencePolarity: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=present_perfect_questions_negatives',
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


