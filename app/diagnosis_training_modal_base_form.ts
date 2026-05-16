import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk: string, es: string): TriText => ({ ru, uk, es });

function modalStep(input: {
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
      'После modal основной глагол остается простым: can go, must work, should be. Не добавляй to, -s, -ed или -ing.',
      'Після modal основне дієслово залишається простим: can go, must work, should be. Не додавай to, -s, -ed або -ing.',
      'Después del modal, el verbo principal queda simple: can go, must work, should be. No añadas to, -s, -ed ni -ing.',
    ),
    microTask: tri('Выбери форму после modal.', 'Обери форму після modal.', 'Elige la forma después del modal.'),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex,
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? tri(
        'Не совсем. Modal уже сделал грамматическую работу, поэтому следующий глагол должен быть в base form.',
        'Не зовсім. Modal уже зробив граматичну роботу, тому наступне дієслово має бути в base form.',
        'No exactamente. El modal ya hizo el trabajo gramatical, así que el siguiente verbo debe ir en base form.',
      )])),
    retryFeedback: [
      input.retry[0],
      input.retry[1],
      input.retry[2],
      tri(
        `Подсказка: правильный блок - "${input.correctAnswer}".`,
        `Підказка: правильний блок - "${input.correctAnswer}".`,
        `Pista: el bloque correcto es "${input.correctAnswer}".`,
      ),
    ],
    fallbackExplanation: tri(
      'Найди modal: can, must, should, may, might, could, would. После него основной глагол идет голым: go, work, be, help.',
      'Знайди modal: can, must, should, may, might, could, would. Після нього основне дієслово йде голим: go, work, be, help.',
      'Encuentra el modal: can, must, should, may, might, could, would. Después va el verbo desnudo: go, work, be, help.',
    ),
    focusWords: input.focusWords,
  };
}

export const MODAL_BASE_FORM_TRAINING: DiagnosisTraining = {
  id: 'modal_base_form',
  category: 'modal',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 10,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('Modal + Verb: после модального глагола', 'Modal + Verb: після модального дієслова', 'Modal + Verb: después del verbo modal'),
  shortTitle: tri('Modal + base verb', 'Modal + base verb', 'Modal + base verb'),
  shortDiagnosis: tri(
    'Ты добавляешь лишнюю форму после modal: to, -s, -ed или -ing.',
    'Ти додаєш зайву форму після modal: to, -s, -ed або -ing.',
    'Añades una forma extra después del modal: to, -s, -ed o -ing.',
  ),
  diagnosisText: tri(
    'Ты ошибаешься в структуре после модальных глаголов: can, must, should, may, might, could, would. После modal почти всегда идет простой глагол без изменений.',
    'Ти помиляєшся в структурі після модальних дієслів: can, must, should, may, might, could, would. Після modal майже завжди йде просте дієслово без змін.',
    'Cometes errores en la estructura después de verbos modales: can, must, should, may, might, could, would. Después del modal casi siempre va el verbo simple sin cambios.',
  ),
  mentalModel: tri(
    'Модальный глагол уже несет грамматику. После него основной глагол не меняется: can go, must work, should be, may come.',
    'Модальне дієслово вже несе граматику. Після нього основне дієслово не змінюється: can go, must work, should be, may come.',
    'El verbo modal ya lleva la gramática. Después de él, el verbo principal no cambia: can go, must work, should be, may come.',
  ),
  contrastSet: ['modal + base verb', 'modal + to verb', 'modal + verb+s', 'modal + verb+ed', 'modal + be'],
  coreRule: tri(
    'Правильно: can go, must work, should study, may come, might be, could help, would like. Неправильно: can to go, must works, should studied, may comes.',
    'Правильно: can go, must work, should study, may come, might be, could help, would like. Неправильно: can to go, must works, should studied, may comes.',
    'Correcto: can go, must work, should study, may come, might be, could help, would like. Incorrecto: can to go, must works, should studied, may comes.',
  ),
  whatUserMustLearn: {
    ru: [
      'После can основной глагол идет без to: can go, can help.',
      'После must основной глагол идет без -s: he must work, she must go.',
      'После should основной глагол идет в base form: should study, should be.',
      'После may/might/could/would основной глагол тоже простой: may come, might know, could help, would like.',
      'Если нужен be, он тоже идет в base form: should be, must be, can be.',
      'В отрицании not ставится после modal: cannot go, should not do.',
      'В вопросе modal выходит вперед: Can you help? Should I wait?',
    ],
    uk: [
      'Після can основне дієслово йде без to: can go, can help.',
      'Після must основне дієслово йде без -s: he must work, she must go.',
      'Після should основне дієслово йде в base form: should study, should be.',
      'Після may/might/could/would основне дієслово теж просте: may come, might know, could help, would like.',
      'Якщо потрібен be, він теж іде в base form: should be, must be, can be.',
      'У запереченні not ставиться після modal: cannot go, should not do.',
      'У питанні modal виходить вперед: Can you help? Should I wait?',
    ],
    es: [
      'Después de can, el verbo principal va sin to: can go, can help.',
      'Después de must, el verbo principal va sin -s: he must work, she must go.',
      'Después de should, el verbo principal va en base form: should study, should be.',
      'Después de may/might/could/would, el verbo principal también va simple: may come, might know, could help, would like.',
      'Si necesitas be, también va en base form: should be, must be, can be.',
      'En negación, not va después del modal: cannot go, should not do.',
      'En pregunta, el modal va al principio: Can you help? Should I wait?',
    ],
  },
  examples: [
    { en: 'I can help you.', ru: 'Я могу тебе помочь.', uk: 'Я можу тобі допомогти.', es: 'Puedo ayudarte.', why: tri('После can идет простой help.', 'Після can іде просте help.', 'Después de can va help simple.') },
    { en: 'She must work today.', ru: 'Она должна работать сегодня.', uk: 'Вона повинна працювати сьогодні.', es: 'Ella debe trabajar hoy.', why: tri('Даже с she после must нет -s: must work.', 'Навіть з she після must немає -s: must work.', 'Incluso con she, después de must no hay -s: must work.') },
    { en: 'You should be careful.', ru: 'Тебе следует быть осторожным.', uk: 'Тобі слід бути обережним.', es: 'Deberías tener cuidado.', why: tri('После should для смысла быть нужна форма be.', 'Після should для змісту бути потрібна форма be.', 'Después de should usamos be para ser/estar.') },
    { en: 'He might come later.', ru: 'Он, возможно, придет позже.', uk: 'Він, можливо, прийде пізніше.', es: 'Puede que venga más tarde.', why: tri('После might основной глагол простой: come.', 'Після might основне дієслово просте: come.', 'Después de might el verbo va simple: come.') },
    { en: 'Can you wait here?', ru: 'Ты можешь подождать здесь?', uk: 'Ти можеш почекати тут?', es: 'Puedes esperar aquí?', why: tri('В вопросе modal выходит вперед.', 'У питанні modal виходить вперед.', 'En pregunta, el modal va al principio.') },
    { en: "They can't find the keys.", ru: 'Они не могут найти ключи.', uk: 'Вони не можуть знайти ключі.', es: 'No pueden encontrar las llaves.', why: tri("После can't глагол остается простым: find.", "Після can't дієслово залишається простим: find.", "Después de can't el verbo queda simple: find.") },
    { en: 'We would like some coffee.', ru: 'Мы бы хотели кофе.', uk: 'Ми б хотіли кави.', es: 'Nos gustaría café.', why: tri('Would like - готовый блок: после would идет like.', 'Would like - готовий блок: після would іде like.', 'Would like es un bloque: después de would va like.') },
    { en: 'He could speak English before.', ru: 'Он раньше мог говорить по-английски.', uk: 'Він раніше міг говорити англійською.', es: 'Antes podía hablar inglés.', why: tri('Could уже показывает прошлый смысл; после него speak.', 'Could уже показує минулий зміст; після нього speak.', 'Could ya muestra pasado; después va speak.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты спотыкаешься после модальных глаголов.', 'Схоже, ти спотикаєшся після модальних дієслів.', 'Parece que te trabas después de los verbos modales.') },
    { id: 'intro_rule', type: 'rule', text: tri('Формула: modal + base verb. Can go. Must work. Should be.', 'Формула: modal + base verb. Can go. Must work. Should be.', 'Fórmula: modal + base verb. Can go. Must work. Should be.') },
    { id: 'intro_warning', type: 'warning', text: tri('Не добавляй после modal ни to, ни -s, ни -ed.', 'Не додавай після modal ні to, ні -s, ні -ed.', 'No añadas después del modal ni to, ni -s, ni -ed.') },
  ],
  steps: [
    modalStep({ id: 'modal_base_easy_001', order: 1, difficulty: 'easy', targetSkill: 'can_base_verb', sentence: 'I can ___ you.', translation: tri('Я могу тебе помочь.', 'Я можу тобі допомогти.', 'Puedo ayudarte.'), options: ['help', 'to help', 'helps', 'helping'], correctAnswer: 'help', correctFeedback: tri('Да. После can нужен простой глагол: can help.', 'Так. Після can потрібне просте дієслово: can help.', 'Sí. Después de can necesitamos verbo simple: can help.'), wrong: { 'to help': tri('После can не ставим to. Правильно: can help.', 'Після can не ставимо to. Правильно: can help.', 'Después de can no ponemos to. Correcto: can help.'), helps: tri('После can нельзя helps. Нужен help.', 'Після can не можна helps. Потрібен help.', 'Después de can no va helps. Necesitamos help.'), helping: tri('После can не ставим helping. Нужна base form: help.', 'Після can не ставимо helping. Потрібна base form: help.', 'Después de can no ponemos helping. Necesitamos help.') }, retry: [tri('Can уже помощник. После него глагол простой.', 'Can уже помічник. Після нього дієслово просте.', 'Can ya es auxiliar. Después va verbo simple.'), tri('Can help. Без to.', 'Can help. Без to.', 'Can help. Sin to.'), tri('Подсказка: I can help you.', 'Підказка: I can help you.', 'Pista: I can help you.')], focusWords: ['can', 'help'] }),
    modalStep({ id: 'modal_base_easy_002', order: 2, difficulty: 'easy', targetSkill: 'must_base_verb', sentence: 'You must ___ now.', translation: tri('Ты должен уйти сейчас.', 'Ти повинен піти зараз.', 'Debes irte ahora.'), options: ['leave', 'to leave', 'leaves', 'left'], correctAnswer: 'leave', correctFeedback: tri('Да. После must глагол идет в base form: must leave.', 'Так. Після must дієслово йде в base form: must leave.', 'Sí. Después de must el verbo va en base form: must leave.'), wrong: { 'to leave': tri('После must не ставим to. Правильно: must leave.', 'Після must не ставимо to. Правильно: must leave.', 'Después de must no ponemos to. Correcto: must leave.'), leaves: tri('После must нельзя leaves. После modal нет -s.', 'Після must не можна leaves. Після modal немає -s.', 'Después de must no va leaves. Después del modal no hay -s.'), left: tri('После must нельзя left. Нужен простой leave.', 'Після must не можна left. Потрібне просте leave.', 'Después de must no va left. Necesitamos leave simple.') }, retry: [tri('Must + простой глагол.', 'Must + просте дієслово.', 'Must + verbo simple.'), tri('Must leave. Без to, -s и past.', 'Must leave. Без to, -s і past.', 'Must leave. Sin to, -s ni pasado.'), tri('Подсказка: You must leave now.', 'Підказка: You must leave now.', 'Pista: You must leave now.')], focusWords: ['must', 'leave'] }),
    modalStep({ id: 'modal_base_easy_003', order: 3, difficulty: 'easy', targetSkill: 'should_base_verb', sentence: 'We should ___ more.', translation: tri('Нам следует больше практиковаться.', 'Нам слід більше практикуватися.', 'Deberíamos practicar más.'), options: ['practice', 'to practice', 'practices', 'practiced'], correctAnswer: 'practice', correctFeedback: tri('Да. После should нужен base verb: should practice.', 'Так. Після should потрібен base verb: should practice.', 'Sí. Después de should necesitamos base verb: should practice.'), wrong: { 'to practice': tri('После should не ставим to. Правильно: should practice.', 'Після should не ставимо to. Правильно: should practice.', 'Después de should no ponemos to. Correcto: should practice.'), practices: tri('После should нельзя practices. Нужен practice.', 'Після should не можна practices. Потрібен practice.', 'Después de should no va practices. Necesitamos practice.'), practiced: tri('После should нельзя practiced в этой структуре. Нужен practice.', 'Після should не можна practiced у цій структурі. Потрібен practice.', 'Después de should no va practiced aquí. Necesitamos practice.') }, retry: [tri('Should + простой глагол.', 'Should + просте дієслово.', 'Should + verbo simple.'), tri('Should practice. Без to.', 'Should practice. Без to.', 'Should practice. Sin to.'), tri('Подсказка: We should practice more.', 'Підказка: We should practice more.', 'Pista: We should practice more.')], focusWords: ['should', 'practice'] }),
    modalStep({ id: 'modal_base_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'no_to_after_can', sentence: 'She can ___ English.', translation: tri('Она может говорить по-английски.', 'Вона може говорити англійською.', 'Ella puede hablar inglés.'), options: ['speak', 'to speak', 'speaks', 'speaking'], correctAnswer: 'speak', correctFeedback: tri('Да. После can нужен простой глагол: can speak.', 'Так. Після can потрібне просте дієслово: can speak.', 'Sí. Después de can necesitamos verbo simple: can speak.'), wrong: { 'to speak': tri('Can to speak - частая ошибка. После can не нужен to.', 'Can to speak - часта помилка. Після can не потрібен to.', 'Can to speak es un error común. Después de can no necesitamos to.'), speaks: tri('She speaks в обычном утверждении, но после can форма speak.', 'She speaks у звичайному ствердженні, але після can форма speak.', 'She speaks en afirmación normal, pero después de can va speak.'), speaking: tri('Can speaking неправильно. После can нужен speak.', 'Can speaking неправильно. Після can потрібен speak.', 'Can speaking es incorrecto. Después de can necesitamos speak.') }, retry: [tri('Даже с she после can нет -s.', 'Навіть з she після can немає -s.', 'Incluso con she, después de can no hay -s.'), tri('Can speak. Не can to speak.', 'Can speak. Не can to speak.', 'Can speak. No can to speak.'), tri('Подсказка: She can speak English.', 'Підказка: She can speak English.', 'Pista: She can speak English.')], focusWords: ['can', 'speak'] }),
    modalStep({ id: 'modal_base_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'no_to_after_should', sentence: 'You should ___ a doctor.', translation: tri('Тебе следует обратиться к врачу.', 'Тобі слід звернутися до лікаря.', 'Deberías ver a un médico.'), options: ['see', 'to see', 'sees', 'saw'], correctAnswer: 'see', correctFeedback: tri('Да. После should нужен простой глагол: should see.', 'Так. Після should потрібне просте дієслово: should see.', 'Sí. Después de should necesitamos verbo simple: should see.'), wrong: { 'to see': tri('Should to see неправильно. После should не ставим to.', 'Should to see неправильно. Після should не ставимо to.', 'Should to see es incorrecto. Después de should no ponemos to.'), sees: tri('После should нельзя sees. Нужна base form: see.', 'Після should не можна sees. Потрібна base form: see.', 'Después de should no va sees. Necesitamos see.'), saw: tri('После should нельзя saw. Нужен простой see.', 'Після should не можна saw. Потрібне просте see.', 'Después de should no va saw. Necesitamos see simple.') }, retry: [tri('Should уже стоит перед глаголом.', 'Should уже стоїть перед дієсловом.', 'Should ya está antes del verbo.'), tri('Should see.', 'Should see.', 'Should see.'), tri('Подсказка: You should see a doctor.', 'Підказка: You should see a doctor.', 'Pista: You should see a doctor.')], focusWords: ['should', 'see'] }),
    modalStep({ id: 'modal_base_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'no_to_after_must', sentence: 'They must ___ the rules.', translation: tri('Они должны соблюдать правила.', 'Вони повинні дотримуватися правил.', 'Deben seguir las reglas.'), options: ['follow', 'to follow', 'follows', 'following'], correctAnswer: 'follow', correctFeedback: tri('Да. После must идет base verb: must follow.', 'Так. Після must іде base verb: must follow.', 'Sí. Después de must va base verb: must follow.'), wrong: { 'to follow': tri('Must to follow неправильно. После must не нужен to.', 'Must to follow неправильно. Після must не потрібен to.', 'Must to follow es incorrecto. Después de must no necesitamos to.'), follows: tri('Follows не подходит после must. Нужен follow.', 'Follows не підходить після must. Потрібен follow.', 'Follows no encaja después de must. Necesitamos follow.'), following: tri('Following здесь не подходит. После must нужен follow.', 'Following тут не підходить. Після must потрібен follow.', 'Following no encaja aquí. Después de must necesitamos follow.') }, retry: [tri('Must + follow. Никакого to.', 'Must + follow. Ніякого to.', 'Must + follow. Nada de to.'), tri('Must follow.', 'Must follow.', 'Must follow.'), tri('Подсказка: They must follow the rules.', 'Підказка: They must follow the rules.', 'Pista: They must follow the rules.')], focusWords: ['must', 'follow'] }),
    modalStep({ id: 'modal_base_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'no_s_after_modal', sentence: 'He must ___ harder.', translation: tri('Он должен работать усерднее.', 'Він повинен працювати старанніше.', 'Debe trabajar más duro.'), options: ['work', 'works', 'worked', 'working'], correctAnswer: 'work', correctFeedback: tri('Да. Даже с he после must не ставим -s: he must work.', 'Так. Навіть з he після must не ставимо -s: he must work.', 'Sí. Incluso con he, después de must no ponemos -s: he must work.'), wrong: { works: tri('He works без modal, но he must work после modal.', 'He works без modal, але he must work після modal.', 'He works sin modal, pero he must work después del modal.'), worked: tri('После must нельзя worked. Нужен work.', 'Після must не можна worked. Потрібен work.', 'Después de must no va worked. Necesitamos work.'), working: tri('После must не ставим working. Нужен work.', 'Після must не ставимо working. Потрібен work.', 'Después de must no ponemos working. Necesitamos work.') }, retry: [tri('He без modal: works. После must: work.', 'He без modal: works. Після must: work.', 'He sin modal: works. Después de must: work.'), tri('Must work. Не must works.', 'Must work. Не must works.', 'Must work. No must works.'), tri('Подсказка: He must work harder.', 'Підказка: He must work harder.', 'Pista: He must work harder.')], focusWords: ['must', 'work'] }),
    modalStep({ id: 'modal_base_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'no_past_after_could', sentence: 'When I was younger, I could ___ fast.', translation: tri('Когда я был моложе, я мог быстро бегать.', 'Коли я був молодшим, я міг швидко бігати.', 'Cuando era más joven, podía correr rápido.'), options: ['run', 'ran', 'running', 'to run'], correctAnswer: 'run', correctFeedback: tri('Да. Could уже показывает прошлую способность. После could нужен run.', 'Так. Could уже показує минулу здатність. Після could потрібен run.', 'Sí. Could ya muestra habilidad pasada. Después de could necesitamos run.'), wrong: { ran: tri('Could ran неправильно. Could уже несет past-смысл, поэтому нужен run.', 'Could ran неправильно. Could уже несе past-зміст, тому потрібен run.', 'Could ran es incorrecto. Could ya lleva pasado, por eso necesitamos run.'), running: tri('Could running неправильно. После could нужен run.', 'Could running неправильно. Після could потрібен run.', 'Could running es incorrecto. Después de could necesitamos run.'), 'to run': tri('После could не ставим to. Правильно: could run.', 'Після could не ставимо to. Правильно: could run.', 'Después de could no ponemos to. Correcto: could run.') }, retry: [tri('Could уже дает прошлый смысл.', 'Could уже дає минулий зміст.', 'Could ya da el sentido pasado.'), tri('Could run. Не could ran.', 'Could run. Не could ran.', 'Could run. No could ran.'), tri('Подсказка: I could run fast.', 'Підказка: I could run fast.', 'Pista: I could run fast.')], focusWords: ['could', 'run'] }),
    modalStep({ id: 'modal_base_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'would_base_verb', sentence: 'I would ___ some tea.', translation: tri('Я бы хотел чаю.', 'Я б хотів чаю.', 'Me gustaría un té.'), options: ['like', 'liked', 'to like', 'likes'], correctAnswer: 'like', correctFeedback: tri('Да. Would like - готовая конструкция. После would идет like.', 'Так. Would like - готова конструкція. Після would іде like.', 'Sí. Would like es una estructura lista. Después de would va like.'), wrong: { liked: tri('Would liked неправильно. После would нужен like.', 'Would liked неправильно. Після would потрібен like.', 'Would liked es incorrecto. Después de would necesitamos like.'), 'to like': tri('Would to like неправильно. Нужен would like.', 'Would to like неправильно. Потрібно would like.', 'Would to like es incorrecto. Necesitamos would like.'), likes: tri('После would нельзя likes. Нужен like.', 'Після would не можна likes. Потрібен like.', 'Después de would no va likes. Necesitamos like.') }, retry: [tri('Would like - готовый блок.', 'Would like - готовий блок.', 'Would like - bloque listo.'), tri('I would like.', 'I would like.', 'I would like.'), tri('Подсказка: I would like some tea.', 'Підказка: I would like some tea.', 'Pista: I would like some tea.')], focusWords: ['would', 'like'] }),
    modalStep({ id: 'modal_base_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'modal_plus_be', sentence: 'You should ___ careful.', translation: tri('Тебе следует быть осторожным.', 'Тобі слід бути обережним.', 'Deberías tener cuidado.'), options: ['be', 'are', 'to be', 'being'], correctAnswer: 'be', correctFeedback: tri('Да. После should нужна base form. Для смысла быть используется be.', 'Так. Після should потрібна base form. Для змісту бути використовується be.', 'Sí. Después de should necesitamos base form. Para ser/estar usamos be.'), wrong: { are: tri('Are не ставится после should. После modal нужна форма be.', 'Are не ставиться після should. Після modal потрібна форма be.', 'Are no va después de should. Después del modal necesitamos be.'), 'to be': tri('После should не ставим to. Правильно: should be.', 'Після should не ставимо to. Правильно: should be.', 'Después de should no ponemos to. Correcto: should be.'), being: tri('Should being неправильно. После should нужен be.', 'Should being неправильно. Після should потрібен be.', 'Should being es incorrecto. Después de should necesitamos be.') }, retry: [tri('После modal даже be становится простой формой.', 'Після modal навіть be стає простою формою.', 'Después del modal, incluso be va simple.'), tri('Should be.', 'Should be.', 'Should be.'), tri('Подсказка: You should be careful.', 'Підказка: You should be careful.', 'Pista: You should be careful.')], focusWords: ['should', 'be'] }),
    modalStep({ id: 'modal_base_mixed_002', order: 11, difficulty: 'mixed_review', targetSkill: 'modal_question_order', sentence: '___ you help me?', translation: tri('Ты можешь мне помочь?', 'Ти можеш мені допомогти?', 'Puedes ayudarme?'), options: ['Can', 'Do can', 'Can to', 'Are can'], correctAnswer: 'Can', correctFeedback: tri('Да. В вопросе modal выходит вперед: Can you help me?', 'Так. У питанні modal виходить вперед: Can you help me?', 'Sí. En pregunta, el modal va al principio: Can you help me?'), wrong: { 'Do can': tri('С modal не нужен do. Can сам выходит вперед.', 'З modal не потрібен do. Can сам виходить вперед.', 'Con modal no necesitamos do. Can va al principio por sí mismo.'), 'Can to': tri('Can to help неправильно. После can не ставим to.', 'Can to help неправильно. Після can не ставимо to.', 'Can to help es incorrecto. Después de can no ponemos to.'), 'Are can': tri('Are can неправильно. Вопрос с can начинается прямо с Can.', 'Are can неправильно. Питання з can починається прямо з Can.', 'Are can es incorrecto. La pregunta con can empieza con Can.') }, retry: [tri('Modal сам делает вопрос.', 'Modal сам робить питання.', 'El modal hace la pregunta por sí mismo.'), tri('Can you help?', 'Can you help?', 'Can you help?'), tri('Подсказка: Can you help me?', 'Підказка: Can you help me?', 'Pista: Can you help me?')], focusWords: ['can', 'help'] }),
    modalStep({ id: 'modal_base_mixed_003', order: 12, difficulty: 'mixed_review', targetSkill: 'mixed_modal_question_negative', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.', 'Elige la pareja correcta.'), options: ['Can you wait? / You cannot wait here.', 'Do you can wait? / You do not can wait here.', 'Can you to wait? / You cannot to wait here.', 'Are you can wait? / You are not can wait here.'], correctAnswer: 'Can you wait? / You cannot wait here.', correctFeedback: tri('Да. В вопросе modal вперед: Can you wait? В отрицании cannot + base verb.', 'Так. У питанні modal вперед: Can you wait? У запереченні cannot + base verb.', 'Sí. En pregunta el modal va al principio. En negación cannot + base verb.'), wrong: { 'Do you can wait? / You do not can wait here.': tri('С modal не нужен do. Can сам строит вопрос и отрицание.', 'З modal не потрібен do. Can сам будує питання і заперечення.', 'Con modal no necesitamos do. Can forma pregunta y negación por sí mismo.'), 'Can you to wait? / You cannot to wait here.': tri('После can/cannot не ставим to. Нужен wait.', 'Після can/cannot не ставимо to. Потрібен wait.', 'Después de can/cannot no ponemos to. Necesitamos wait.'), 'Are you can wait? / You are not can wait here.': tri('Are не нужен с can. Modal сам работает как помощник.', 'Are не потрібен з can. Modal сам працює як помічник.', 'Are no se necesita con can. El modal ya funciona como auxiliar.') }, retry: [tri('Can сам делает вопрос и отрицание.', 'Can сам робить питання і заперечення.', 'Can hace pregunta y negación por sí mismo.'), tri('Can you wait? You cannot wait.', 'Can you wait? You cannot wait.', 'Can you wait? You cannot wait.'), tri('Подсказка: Can you wait? / You cannot wait here.', 'Підказка: Can you wait? / You cannot wait here.', 'Pista: Can you wait? / You cannot wait here.')], focusWords: ['can', 'wait'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['modal_to_error', 'modal_third_person_s_error', 'modal_past_form_error', 'modal_ing_error', 'modal_be_form_error', 'modal_question_order_error', 'modal_negative_order_error'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем modal и форму основного глагола.', 'Звичайне пояснення: показуємо modal і форму основного дієслова.', 'Explicación normal: mostramos modal y forma del verbo principal.'),
    depth2: tri('Проще: modal уже сделал грамматическую работу.', 'Простіше: modal уже зробив граматичну роботу.', 'Más simple: el modal ya hizo el trabajo gramatical.'),
    depth3: tri('Готовые пары: can go / must work / should be.', 'Готові пари: can go / must work / should be.', 'Parejas listas: can go / must work / should be.'),
    depth4: tri('Почти подсказка: после modal нужен base verb.', 'Майже підказка: після modal потрібен base verb.', 'Casi pista: después del modal necesitamos base verb.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Остановись. Найди modal. Если он есть, после него нужен простой глагол: go, work, be, help.', 'Зупинись. Знайди modal. Якщо він є, після нього потрібне просте дієслово: go, work, be, help.', 'Detente. Encuentra el modal. Si está, después necesitamos verbo simple: go, work, be, help.') },
    afterThreeWrongInSameExercise: { action: 'show_modal_base_hint_then_retry', card: tri('Система покажет modal и основной глагол, но не выберет ответ за пользователя.', 'Система покаже modal і основне дієслово, але не вибере відповідь за користувача.', 'El sistema mostrará el modal y el verbo principal, pero no elegirá la respuesta.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Режим подсказки: сначала реши, есть ли modal. Потом вернемся к форме основного глагола.', 'Режим підказки: спочатку виріши, чи є modal. Потім повернемося до форми основного дієслова.', 'Modo guiado: primero decide si hay modal. Luego volvemos a la forma del verbo principal.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_modal_base_001', prompt: tri('В фразе I can ___ you слово can - это modal?', 'У фразі I can ___ you слово can - це modal?', 'En I can ___ you, can es modal?'), options: ['да', 'нет'], correctIndex: 0, thenReturnToExerciseId: 'modal_base_easy_001' },
      { id: 'guided_modal_base_002', prompt: tri('После can нужен to help или help?', 'Після can потрібно to help чи help?', 'Después de can necesitamos to help o help?'), options: ['to help', 'help'], correctIndex: 1, thenReturnToExerciseId: 'modal_base_easy_001' },
      { id: 'guided_modal_base_003', prompt: tri('После must с he нужен works или work?', 'Після must з he потрібно works чи work?', 'Después de must con he necesitamos works o work?'), options: ['works', 'work'], correctIndex: 1, thenReturnToExerciseId: 'modal_base_contrast_004' },
      { id: 'guided_modal_base_004', prompt: tri('После should форма be остается be или меняется на are?', 'Після should форма be залишається be чи змінюється на are?', 'Después de should, be queda be o cambia a are?'), options: ['be', 'are'], correctIndex: 0, thenReturnToExerciseId: 'modal_base_mixed_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'modal',
    microDiagnosisId: 'modal_base_form',
    diagnosisLabel: tri('Modal + base verb', 'Modal + base verb', 'Modal + base verb'),
    contrastSet: ['modal + base verb', 'modal + to verb', 'modal + verb+s', 'modal + verb+ed', 'modal + be'],
    focusWords: ['can', 'must', 'should', 'be'],
    focusPatterns: ['can_base_verb', 'must_base_verb', 'should_base_verb', 'no_to_after_can', 'no_to_after_should', 'no_to_after_must', 'no_s_after_modal', 'no_past_after_could', 'would_base_verb', 'modal_plus_be', 'modal_question_order', 'mixed_modal_question_negative'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_modal_base_form_start',
    answer: 'diagnosis_training_modal_base_form_answer',
    mastery: 'diagnosis_training_modal_base_form_mastery',
    fallback: 'diagnosis_training_modal_base_form_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'modal', microDiagnosisId: 'modal_base_form', contrastSet: ['modal + base verb', 'modal + to verb', 'modal + verb+s', 'modal + verb+ed', 'modal + be'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logModalVerb: true, logMainVerbForm: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=modal&microDiagnosisId=modal_base_form',
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


