import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.

const tri = (ru: string, uk: string, es: string): TriText => ({ ru, uk, es });

function beStep(input: {
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
  const correctIndex = input.options.findIndex((option) => option === input.correctAnswer);
  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: input.translation,
    explanationBlock: tri(
      'Am, is и are зависят от того, о ком говорим. В английском это слово нельзя пропускать перед состоянием, профессией или местом.',
      'Am, is та are залежать від того, про кого говоримо. В англійській це слово не можна пропускати перед станом, професією або місцем.',
      'Be cambia según el subject: I am, he/she/it is, you/we/they are. En inglés no omitimos be antes de estado, rol o lugar.',
    ),
    microTask: tri('Выбери am, is или are.', 'Обери am, is або are.', 'Elige la forma correcta de be.'),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex,
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? tri(
        'Не совсем. Сначала найди, о ком говорим: I идет с am, he/she/it или один предмет — с is, you/we/they или несколько предметов — с are.',
        'Не зовсім. Спочатку знайди, про кого говоримо: I йде з am, he/she/it або один предмет — з is, you/we/they або кілька предметів — з are.',
        'No exactamente. Encuentra el subject y elige: I = am, he/she/it/one thing = is, you/we/they/plural = are.',
      )])),
    retryFeedback: [
      input.retry[0],
      input.retry[1],
      input.retry[2],
      tri(`Подсказка: правильная форма - "${input.correctAnswer}".`, `Підказка: правильна форма - "${input.correctAnswer}".`, `Pista: la forma correcta es "${input.correctAnswer}".`),
    ],
    fallbackExplanation: tri(
      'Карта простая: I am. He/she/it is. You/we/they are. Если дальше идет состояние, место или роль, am/is/are почти точно нужны.',
      'Карта проста: I am. He/she/it is. You/we/they are. Якщо далі йде стан, місце або роль, am/is/are майже точно потрібні.',
      'Mapa de be: I am. He/she/it is. You/we/they are. Si después del subject hay adjective, place o role, casi seguro necesitas be.',
    ),
    focusWords: input.focusWords,
  };
}

const options = ['am', 'is', 'are', 'no be'];

export const TO_BE_PRESENT_AGREEMENT_TRAINING: DiagnosisTraining = {
  id: 'to_be_present_agreement',
  category: 'to-be',
  version: '1.0.0',
  status: 'active',
  priority: 9,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('Am / Is / Are: кто с кем идет', 'Am / Is / Are: хто з ким іде', 'Am / Is / Are: qué forma usar'),
  shortTitle: tri('Am / Is / Are', 'Am / Is / Are', 'Am / Is / Are'),
  shortDiagnosis: tri('Ты путаешь am, is и are в настоящем времени.', 'Ти плутаєш am, is і are у теперішньому часі.', 'Confundes am, is y are en presente.'),
  diagnosisText: tri(
    'Ты путаешь am, is и are в настоящем времени. В русском часто нет отдельного слова "есть" в таких фразах, а в английском его нужно ставить: I am, he is, they are.',
    'Ти плутаєш am, is і are у теперішньому часі. Українською часто немає окремого слова "є" в таких фразах, а в англійській його потрібно ставити: I am, he is, they are.',
    'Confundes am, is y are en presente. En español muchas veces be se siente diferente, pero el inglés casi siempre necesita una forma de be: I am, he is, they are.',
  ),
  mentalModel: tri(
    'Смотри, о ком говорим. I = am. He/she/it или один предмет = is. You/we/they или несколько предметов = are.',
    'Дивись, про кого говоримо. I = am. He/she/it або один предмет = is. You/we/they або кілька предметів = are.',
    'Be cambia según el subject. I = am. He/she/it/one thing = is. You/we/they/plural = are.',
  ),
  contrastSet: ['am', 'is', 'are', 'no be'],
  coreRule: tri(
    'I am ready. He is tired. She is at home. It is cold. You are right. We are here. They are busy.',
    'I am ready. He is tired. She is at home. It is cold. You are right. We are here. They are busy.',
    'I am ready. He is tired. She is at home. It is cold. You are right. We are here. They are busy.',
  ),
  whatUserMustLearn: {
    ru: [
      'Если говорим о роли, ставим am/is/are: He is a doctor.',
      'Если говорим о качестве или состоянии, тоже ставим am/is/are: She is tired, I am ready.',
      'Если говорим, где кто-то находится, am/is/are обычно нужны: They are at home.',
      'I всегда идет с am.',
      'He/she/it и один предмет идут с is.',
      'You/we/they и множественное число идут с are.',
      'В вопросе am/is/are выходит вперед: Is she ready?',
      'В отрицании not идет после am/is/are: They are not here.',
    ],
    uk: [
      'Якщо говоримо про роль, ставимо am/is/are: He is a doctor.',
      'Якщо говоримо про якість або стан, теж ставимо am/is/are: She is tired, I am ready.',
      'Якщо говоримо, де хтось перебуває, am/is/are зазвичай потрібні: They are at home.',
      'I завжди йде з am.',
      'He/she/it і один предмет ідуть з is.',
      'You/we/they і множина йдуть з are.',
      'У питанні am/is/are виходить вперед: Is she ready?',
      'У запереченні not іде після am/is/are: They are not here.',
    ],
    es: [
      'Be se necesita con rol: He is a doctor.',
      'Be se necesita con cualidad/estado: She is tired, I am ready.',
      'Be se necesita con lugar: They are at home.',
      'I siempre va con am.',
      'He/she/it y una cosa singular van con is.',
      'You/we/they y plural van con are.',
      'En pregunta, be va al principio: Is she ready?',
      'En negación, not va después de be: They are not here.',
    ],
  },
  examples: [
    { en: 'I am ready.', ru: 'Я готов.', uk: 'Я готовий.', es: 'Estoy listo.', why: tri('I всегда требует am.', 'I завжди потребує am.', 'I siempre necesita am.') },
    { en: 'She is tired.', ru: 'Она устала.', uk: 'Вона втомлена.', es: 'Ella está cansada.', why: tri('She идет с is. Tired - состояние.', 'She йде з is. Tired - стан.', 'She va con is. Tired es estado.') },
    { en: 'They are at home.', ru: 'Они дома.', uk: 'Вони вдома.', es: 'Están en casa.', why: tri('They идет с are. At home - место.', 'They йде з are. At home - місце.', 'They va con are. At home es lugar.') },
    { en: 'It is cold today.', ru: 'Сегодня холодно.', uk: 'Сьогодні холодно.', es: 'Hace frío hoy.', why: tri('Для погоды часто используется it is.', 'Для погоди часто використовується it is.', 'Para clima muchas veces usamos it is.') },
    { en: 'You are right.', ru: 'Ты прав.', uk: 'Ти правий.', es: 'Tienes razón.', why: tri('You всегда идет с are.', 'You завжди йде з are.', 'You siempre va con are.') },
    { en: 'The lesson is difficult.', ru: 'Урок сложный.', uk: 'Урок складний.', es: 'La lección es difícil.', why: tri('The lesson — это один урок, поэтому is.', 'The lesson — це один урок, тому is.', 'The lesson = one thing, por eso is.') },
    { en: 'The books are on the table.', ru: 'Книги на столе.', uk: 'Книги на столі.', es: 'Los libros están sobre la mesa.', why: tri('Books — это несколько книг, поэтому are.', 'Books — це кілька книжок, тому are.', 'Books = plural, por eso are.') },
    { en: 'Is she ready?', ru: 'Она готова?', uk: 'Вона готова?', es: 'Está lista?', why: tri('В вопросе is выходит вперед.', 'У питанні is виходить вперед.', 'En pregunta, is va al principio.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты путаешь am, is и are или пропускаешь это маленькое слово там, где английский без него разваливается.', 'Схоже, ти плутаєш am, is і are або пропускаєш це маленьке слово там, де англійська без нього розвалюється.', 'Parece que confundes am, is y are u omites be donde el inglés lo necesita.') },
    { id: 'intro_rule', type: 'rule', text: tri('Карта: I am. He/she/it is. You/we/they are.', 'Карта: I am. He/she/it is. You/we/they are.', 'Mapa: I am. He/she/it is. You/we/they are.') },
    { id: 'intro_warning', type: 'warning', text: tri('Не говорим She at home. Полная английская фраза: She is at home.', 'Не кажемо She at home. Повна англійська фраза: She is at home.', 'No omitas be: no She at home, sino She is at home.') },
  ],
  steps: [
    beStep({ id: 'be_present_easy_001', order: 1, difficulty: 'easy', targetSkill: 'i_am', sentence: 'I ___ ready.', translation: tri('Я готов.', 'Я готовий.', 'Estoy listo.'), options, correctAnswer: 'am', correctFeedback: tri('Да. I всегда идет с am.', 'Так. I завжди йде з am.', 'Sí. I siempre va con am.'), wrong: { is: tri('Is используется с he/she/it. С I нужна форма am.', 'Is використовується з he/she/it. З I потрібна форма am.', 'Is se usa con he/she/it. Con I necesitamos am.'), are: tri('Are используется с you/we/they. С I нужна форма am.', 'Are використовується з you/we/they. З I потрібна форма am.', 'Are se usa con you/we/they. Con I necesitamos am.'), 'no be': tri('I ready неправильно. После I нужна связка: I am ready.', 'I ready неправильно. Після I потрібна зв’язка: I am ready.', 'I ready es incorrecto. Antes de ready necesitamos be: I am ready.') }, retry: [tri('I имеет свою форму: am.', 'I має свою форму: am.', 'I tiene su propia forma: am.'), tri('I am. Всегда.', 'I am. Завжди.', 'I am. Siempre.'), tri('Подсказка: I am ready.', 'Підказка: I am ready.', 'Pista: I am ready.')], focusWords: ['I', 'am'] }),
    beStep({ id: 'be_present_easy_002', order: 2, difficulty: 'easy', targetSkill: 'she_is', sentence: 'She ___ tired.', translation: tri('Она устала.', 'Вона втомлена.', 'Ella está cansada.'), options, correctAnswer: 'is', correctFeedback: tri('Да. She идет с is.', 'Так. She йде з is.', 'Sí. She va con is.'), wrong: { am: tri('Am используется только с I. С she нужна is.', 'Am використовується тільки з I. З she потрібна is.', 'Am se usa solo con I. Con she necesitamos is.'), are: tri('Are используется с you/we/they. С she нужна is.', 'Are використовується з you/we/they. З she потрібна is.', 'Are se usa con you/we/they. Con she necesitamos is.'), 'no be': tri('She tired неправильно. Нужно She is tired.', 'She tired неправильно. Потрібно She is tired.', 'She tired es incorrecto. Necesitamos She is tired.') }, retry: [tri('She = is.', 'She = is.', 'She = is.'), tri('She is tired.', 'She is tired.', 'She is tired.'), tri('Подсказка: She is tired.', 'Підказка: She is tired.', 'Pista: She is tired.')], focusWords: ['she', 'is'] }),
    beStep({ id: 'be_present_easy_003', order: 3, difficulty: 'easy', targetSkill: 'they_are', sentence: 'They ___ busy.', translation: tri('Они заняты.', 'Вони зайняті.', 'Están ocupados.'), options, correctAnswer: 'are', correctFeedback: tri('Да. They идет с are.', 'Так. They йде з are.', 'Sí. They va con are.'), wrong: { am: tri('Am используется только с I. They требует are.', 'Am використовується тільки з I. They потребує are.', 'Am se usa solo con I. They necesita are.'), is: tri('Is используется с he/she/it. С they нужна форма are.', 'Is використовується з he/she/it. З they потрібна форма are.', 'Is se usa con he/she/it. They es plural, por eso are.'), 'no be': tri('They busy неправильно. Нужно They are busy.', 'They busy неправильно. Потрібно They are busy.', 'They busy es incorrecto. Necesitamos They are busy.') }, retry: [tri('They = are.', 'They = are.', 'They = are.'), tri('They are busy.', 'They are busy.', 'They are busy.'), tri('Подсказка: They are busy.', 'Підказка: They are busy.', 'Pista: They are busy.')], focusWords: ['they', 'are'] }),
    beStep({ id: 'be_present_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'you_are', sentence: 'You ___ right.', translation: tri('Ты прав.', 'Ти правий.', 'Tienes razón.'), options, correctAnswer: 'are', correctFeedback: tri('Да. You всегда идет с are.', 'Так. You завжди йде з are.', 'Sí. You siempre va con are.'), wrong: { am: tri('Am только с I. You требует are.', 'Am тільки з I. You потребує are.', 'Am solo con I. You necesita are.'), is: tri('Is не используется с you. Нужно are.', 'Is не використовується з you. Потрібно are.', 'Is no se usa con you. Necesitamos are.'), 'no be': tri('You right неправильно. Нужно You are right.', 'You right неправильно. Потрібно You are right.', 'You right es incorrecto. Necesitamos You are right.') }, retry: [tri('You = are.', 'You = are.', 'You = are.'), tri('Даже один человек: you are.', 'Навіть одна людина: you are.', 'Incluso una persona: you are.'), tri('Подсказка: You are right.', 'Підказка: You are right.', 'Pista: You are right.')], focusWords: ['you', 'are'] }),
    beStep({ id: 'be_present_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'it_is', sentence: 'It ___ cold today.', translation: tri('Сегодня холодно.', 'Сьогодні холодно.', 'Hace frío hoy.'), options, correctAnswer: 'is', correctFeedback: tri('Да. It идет с is.', 'Так. It йде з is.', 'Sí. It va con is.'), wrong: { am: tri('Am только с I. It требует is.', 'Am тільки з I. It потребує is.', 'Am solo con I. It necesita is.'), are: tri('Are с you/we/they. С it нужна форма is.', 'Are з you/we/they. З it потрібна форма is.', 'Are con you/we/they. It es one thing/situation, por eso is.'), 'no be': tri('It cold today неправильно. Нужно It is cold today.', 'It cold today неправильно. Потрібно It is cold today.', 'It cold today es incorrecto. Necesitamos It is cold today.') }, retry: [tri('It = is.', 'It = is.', 'It = is.'), tri('It is cold.', 'It is cold.', 'It is cold.'), tri('Подсказка: It is cold today.', 'Підказка: It is cold today.', 'Pista: It is cold today.')], focusWords: ['it', 'is'] }),
    beStep({ id: 'be_present_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'we_are', sentence: 'We ___ ready to start.', translation: tri('Мы готовы начать.', 'Ми готові почати.', 'Estamos listos para empezar.'), options, correctAnswer: 'are', correctFeedback: tri('Да. We идет с are.', 'Так. We йде з are.', 'Sí. We va con are.'), wrong: { am: tri('Am только с I. We требует are.', 'Am тільки з I. We потребує are.', 'Am solo con I. We necesita are.'), is: tri('Is с he/she/it. We требует are.', 'Is з he/she/it. We потребує are.', 'Is con he/she/it. We necesita are.'), 'no be': tri('We ready неправильно. Нужно We are ready.', 'We ready неправильно. Потрібно We are ready.', 'We ready es incorrecto. Necesitamos We are ready.') }, retry: [tri('We = are.', 'We = are.', 'We = are.'), tri('We are ready.', 'We are ready.', 'We are ready.'), tri('Подсказка: We are ready to start.', 'Підказка: We are ready to start.', 'Pista: We are ready to start.')], focusWords: ['we', 'are'] }),
    beStep({ id: 'be_present_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'be_with_place_singular', sentence: 'She ___ at home.', translation: tri('Она дома.', 'Вона вдома.', 'Ella está en casa.'), options, correctAnswer: 'is', correctFeedback: tri('Да. She идет с is. В английском “дома” не цепляется сразу к she.', 'Так. She йде з is. В англійській “вдома” не чіпляється одразу до she.', 'Sí. She va con is. At home es lugar, necesitamos be.'), wrong: { am: tri('Am только с I. She требует is.', 'Am тільки з I. She потребує is.', 'Am solo con I. She necesita is.'), are: tri('Are с you/we/they. She требует is.', 'Are з you/we/they. She потребує is.', 'Are con you/we/they. She necesita is.'), 'no be': tri('She at home неправильно. Нужно She is at home.', 'She at home неправильно. Потрібно She is at home.', 'She at home es incorrecto. Necesitamos She is at home.') }, retry: [tri('Она дома = She is at home.', 'Вона вдома = She is at home.', 'Ella en casa = She is at home.'), tri('She is.', 'She is.', 'She is.'), tri('Подсказка: She is at home.', 'Підказка: She is at home.', 'Pista: She is at home.')], focusWords: ['she', 'is'] }),
    beStep({ id: 'be_present_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'be_with_place_plural', sentence: 'They ___ in the office.', translation: tri('Они в офисе.', 'Вони в офісі.', 'Están en la oficina.'), options, correctAnswer: 'are', correctFeedback: tri('Да. They идет с are. In the office добавляется уже после связки.', 'Так. They йде з are. In the office додається вже після зв’язки.', 'Sí. They va con are. In the office es lugar.'), wrong: { am: tri('Am только с I. They требует are.', 'Am тільки з I. They потребує are.', 'Am solo con I. They necesita are.'), is: tri('Is с he/she/it. They требует are.', 'Is з he/she/it. They потребує are.', 'Is con he/she/it. They necesita are.'), 'no be': tri('They in the office неправильно. Нужно They are in the office.', 'They in the office неправильно. Потрібно They are in the office.', 'They in the office es incorrecto. Necesitamos They are in the office.') }, retry: [tri('They = are.', 'They = are.', 'They = are.'), tri('Они в офисе = They are in the office.', 'Вони в офісі = They are in the office.', 'Lugar también necesita be.'), tri('Подсказка: They are in the office.', 'Підказка: They are in the office.', 'Pista: They are in the office.')], focusWords: ['they', 'are'] }),
    beStep({ id: 'be_present_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'be_with_place_object', sentence: 'The keys ___ on the table.', translation: tri('Ключи на столе.', 'Ключі на столі.', 'Las llaves están sobre la mesa.'), options, correctAnswer: 'are', correctFeedback: tri('Да. The keys — это они, поэтому are.', 'Так. The keys — це вони, тому are.', 'Sí. The keys = plural/they. Por eso are.'), wrong: { am: tri('Am только с I. Keys — это “они”, поэтому are.', 'Am тільки з I. Keys — це “вони”, тому are.', 'Am solo con I. Keys es plural, por eso are.'), is: tri('Is нужен для одного предмета. Keys — это несколько ключей, поэтому are.', 'Is потрібен для одного предмета. Keys — це кілька ключів, тому are.', 'Is se usa para una cosa. Keys es plural, por eso are.'), 'no be': tri('The keys on the table неправильно как полное предложение. Нужно are.', 'The keys on the table неправильно як повне речення. Потрібно are.', 'The keys on the table es incorrecto como oración completa. Necesitamos are.') }, retry: [tri('Keys = they.', 'Keys = they.', 'Keys = they.'), tri('The keys are.', 'The keys are.', 'The keys are.'), tri('Подсказка: The keys are on the table.', 'Підказка: The keys are on the table.', 'Pista: The keys are on the table.')], focusWords: ['keys', 'are'] }),
    beStep({ id: 'be_present_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'singular_noun_is', sentence: 'The lesson ___ difficult.', translation: tri('Урок сложный.', 'Урок складний.', 'La lección es difícil.'), options, correctAnswer: 'is', correctFeedback: tri('Да. The lesson — это один урок. Один предмет идет с is.', 'Так. The lesson — це один урок. Один предмет іде з is.', 'Sí. The lesson = one thing/it. Una cosa va con is.'), wrong: { am: tri('Am только с I. The lesson — один урок, поэтому is.', 'Am тільки з I. The lesson — один урок, тому is.', 'Am solo con I. The lesson es one thing, por eso is.'), are: tri('Are нужно для нескольких людей или предметов. The lesson — один урок, поэтому is.', 'Are потрібне для кількох людей або предметів. The lesson — один урок, тому is.', 'Are es para plural. The lesson es singular, por eso is.'), 'no be': tri('The lesson difficult неправильно. Нужно is.', 'The lesson difficult неправильно. Потрібно is.', 'The lesson difficult es incorrecto. Necesitamos is.') }, retry: [tri('The lesson = it.', 'The lesson = it.', 'The lesson = it.'), tri('Один урок = is.', 'Один урок = is.', 'One thing = is.'), tri('Подсказка: The lesson is difficult.', 'Підказка: The lesson is difficult.', 'Pista: The lesson is difficult.')], focusWords: ['lesson', 'is'] }),
    beStep({ id: 'be_present_mixed_002', order: 11, difficulty: 'mixed_review', targetSkill: 'be_question_order', sentence: '___ she ready?', translation: tri('Она готова?', 'Вона готова?', 'Está lista?'), options: ['Am', 'Is', 'Are', 'Does'], correctAnswer: 'Is', correctFeedback: tri('Да. She идет с is. В вопросе is выходит вперед.', 'Так. She йде з is. У питанні is виходить вперед.', 'Sí. She va con is. En pregunta, is va al principio.'), wrong: { Am: tri('Am только с I. С she нужна Is.', 'Am тільки з I. З she потрібна Is.', 'Am solo con I. Con she necesitamos Is.'), Are: tri('Are с you/we/they. С she нужна Is.', 'Are з you/we/they. З she потрібна Is.', 'Are con you/we/they. Con she necesitamos Is.'), Does: tri('Ready здесь прилагательное, поэтому Does не подходит. Мы спрашиваем “она готова?”: Is she ready?', 'Does тут не підходить: ми питаємо “вона готова?”, тому Is she ready?', 'Does se usa con verbos normales. Ready es adjective, por eso Is she ready?') }, retry: [tri('She is ready -> Is she ready?', 'She is ready -> Is she ready?', 'She is ready -> Is she ready?'), tri('В вопросе is ставим перед she.', 'У питанні is ставимо перед she.', 'Pregunta con be: be al principio.'), tri('Подсказка: Is she ready?', 'Підказка: Is she ready?', 'Pista: Is she ready?')], focusWords: ['is', 'she'] }),
    beStep({ id: 'be_present_mixed_003', order: 12, difficulty: 'mixed_review', targetSkill: 'mixed_be_agreement', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.', 'Elige la pareja correcta.'), options: ['I am ready / They are ready', 'I is ready / They are ready', 'I am ready / They is ready', 'I ready / They ready'], correctAnswer: 'I am ready / They are ready', correctFeedback: tri('Да. I идет с am. They идет с are.', 'Так. I йде з am. They йде з are.', 'Sí. I va con am. They va con are.'), wrong: { 'I is ready / They are ready': tri('They are правильно, но I is неправильно. С I всегда am.', 'They are правильно, але I is неправильно. З I завжди am.', 'They are está bien, pero I is es incorrecto. Con I siempre am.'), 'I am ready / They is ready': tri('I am правильно, но They is неправильно. They требует are.', 'I am правильно, але They is неправильно. They потребує are.', 'I am está bien, pero They is es incorrecto. They necesita are.'), 'I ready / They ready': tri('В обеих фразах не хватает связки: I am ready / They are ready.', 'В обох фразах бракує зв’язки: I am ready / They are ready.', 'En ambas frases falta be: I am ready / They are ready.') }, retry: [tri('I = am.', 'I = am.', 'I = am.'), tri('They = are.', 'They = are.', 'They = are.'), tri('Подсказка: I am ready / They are ready.', 'Підказка: I am ready / They are ready.', 'Pista: I am ready / They are ready.')], focusWords: ['am', 'are'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['i_am_error', 'he_she_it_is_error', 'you_we_they_are_error', 'missing_be_before_adjective', 'missing_be_before_place', 'singular_plural_be_confusion', 'question_order_be_error'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем, о ком говорим, и нужную форму am/is/are.', 'Звичайне пояснення: показуємо, про кого говоримо, і потрібну форму am/is/are.', 'Explicación normal: mostramos subject y la forma correcta de be.'),
    depth2: tri('Проще: I / he-she-it / you-we-they.', 'Простіше: I / he-she-it / you-we-they.', 'Más simple: I / he-she-it / you-we-they.'),
    depth3: tri('Готовая пара: I am, she is, they are.', 'Готова пара: I am, she is, they are.', 'Pareja lista: I am, she is, they are.'),
    depth4: tri('Почти подсказка: прямо указываем am/is/are.', 'Майже підказка: прямо вказуємо am/is/are.', 'Casi pista: indicamos am/is/are directamente.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Остановись. I = am. He/she/it или один предмет = is. You/we/they или несколько предметов = are.', 'Зупинись. I = am. He/she/it або один предмет = is. You/we/they або кілька предметів = are.', 'Detente. I = am. He/she/it/one thing = is. You/we/they/many things = are.') },
    afterThreeWrongInSameExercise: { action: 'show_subject_be_hint_then_retry', card: tri('Система покажет, о ком говорится, но не выберет am/is/are за пользователя.', 'Система покаже, про кого йдеться, але не вибере am/is/are за користувача.', 'El sistema mostrará el grupo del subject, pero no elegirá la forma be.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Режим подсказки: сначала выбери, о ком говорим. Потом вернемся к am/is/are.', 'Режим підказки: спочатку обери, про кого говоримо. Потім повернемося до am/is/are.', 'Modo guiado: primero elige el grupo del subject. Luego volvemos a am/is/are.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_be_present_001', prompt: tri('Какое слово ставим после I?', 'Яке слово ставимо після I?', 'I va con qué forma de be?'), options: ['am', 'is', 'are'], correctIndex: 0, thenReturnToExerciseId: 'be_present_easy_001' },
      { id: 'guided_be_present_002', prompt: tri('She относится к какой группе?', 'She належить до якої групи?', 'She pertenece a qué grupo?'), options: ['I', 'he/she/it', 'they'], correctIndex: 1, thenReturnToExerciseId: 'be_present_easy_002' },
      { id: 'guided_be_present_003', prompt: tri('The keys — это один предмет или несколько?', 'The keys — це один предмет чи кілька?', 'The keys es una cosa singular o plural?'), options: ['one thing', 'plural'], correctIndex: 1, thenReturnToExerciseId: 'be_present_contrast_006' },
      { id: 'guided_be_present_004', prompt: tri('В вопросе is выходит перед she?', 'У питанні is виходить перед she?', 'En pregunta con be, be va al principio?'), options: ['да', 'нет'], correctIndex: 0, thenReturnToExerciseId: 'be_present_mixed_002' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'to-be',
    microDiagnosisId: 'to_be_present_agreement',
    diagnosisLabel: tri('Am / Is / Are в настоящем', 'Am / Is / Are у теперішньому', 'Am / Is / Are en presente'),
    contrastSet: ['am', 'is', 'are', 'no be'],
    focusWords: ['am', 'is', 'are'],
    focusPatterns: ['i_am', 'she_is', 'they_are', 'you_are', 'it_is', 'we_are', 'be_with_place_singular', 'be_with_place_plural', 'singular_noun_is', 'be_question_order', 'mixed_be_agreement'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_to_be_present_agreement_start',
    answer: 'diagnosis_training_to_be_present_agreement_answer',
    mastery: 'diagnosis_training_to_be_present_agreement_mastery',
    fallback: 'diagnosis_training_to_be_present_agreement_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'to-be', microDiagnosisId: 'to_be_present_agreement', contrastSet: ['am', 'is', 'are', 'no be'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logSubjectGroup: true, logBeForm: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=to-be&microDiagnosisId=to_be_present_agreement',
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


