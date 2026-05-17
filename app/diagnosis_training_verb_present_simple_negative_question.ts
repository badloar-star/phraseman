import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.

const tri = (ru: string, uk: string, es: string): TriText => ({ ru, uk, es });

function doStep(input: {
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
      'В Present Simple does уже забирает -s на себя. После do/does/don’t/doesn’t основной глагол идет в простой форме: work, like, know.',
      'У Present Simple does уже забирає -s на себе. Після do/does/don’t/doesn’t основне дієслово йде в простій формі: work, like, know.',
      'En Present Simple, does ya toma la -s. Después de do/does/don’t/doesn’t el verbo principal va en base form.',
    ),
    microTask: tri('Выбери правильную форму do/does или основного глагола.', 'Обери правильну форму do/does або основного дієслова.', 'Elige la forma correcta de do/does o del verbo principal.'),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex,
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? tri(
        'Не совсем. Проверь, кто делает действие: he/she/it = does/doesn’t. После do/does глагол идет без -s.',
        'Не зовсім. Перевір, хто робить дію: he/she/it = does/doesn’t. Після do/does дієслово йде без -s.',
        'No exactamente. Revisa subject y verbo principal: he/she/it = does/doesn’t, después de auxiliary el verbo va sin -s.',
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
      'Сначала найди, кто делает действие. He/she/it берут does или doesn’t. I/you/we/they берут do или don’t. После этого глагол без -s.',
      'Спочатку знайди, хто робить дію. He/she/it беруть does або doesn’t. I/you/we/they беруть do або don’t. Після цього дієслово без -s.',
      'Primero subject: he/she/it -> does/doesn’t. I/you/we/they -> do/don’t. Después de auxiliary siempre base verb: work, like, know.',
    ),
    focusWords: input.focusWords,
  };
}

export const VERB_PRESENT_SIMPLE_NEGATIVE_QUESTION_TRAINING: DiagnosisTraining = {
  id: 'verb_present_simple_negative_question',
  category: 'verb',
  version: '1.0.0',
  status: 'active',
  priority: 7,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('Do / Does: вопросы и отрицания', 'Do / Does: питання і заперечення', 'Do / Does: preguntas y negaciones'),
  shortTitle: tri('Do / Does', 'Do / Does', 'Do / Does + base verb'),
  shortDiagnosis: tri(
    'Ты путаешь do/does и оставляешь -s после does.',
    'Ти плутаєш do/does і залишаєш -s після does.',
    'Confundes do/does y dejas -s después de does.',
  ),
  diagnosisText: tri(
    "Ты ошибаешься в вопросах и отрицаниях Present Simple. Чаще всего проблема в том, что ты добавляешь -s два раза: Does she works? или She doesn't works. Does уже забирает грамматику на себя, поэтому основной глагол возвращается в базовую форму.",
    "Ти помиляєшся в питаннях і запереченнях Present Simple. Найчастіше проблема в тому, що ти додаєш -s двічі: Does she works? або She doesn't works. Does уже бере граматику на себе, тому основне дієслово повертається в базову форму.",
    "Cometes errores en preguntas y negaciones de Present Simple. Lo más común es marcar la -s dos veces: Does she works? o She doesn't works. Does ya lleva la gramática, por eso el verbo principal vuelve a su forma base.",
  ),
  mentalModel: tri(
    "В утверждении he/she/it получает -s: She works. В вопросе и отрицании does уже показывает he/she/it, поэтому основной глагол без -s: Does she work? She doesn't work.",
    "У ствердженні he/she/it отримує -s: She works. У питанні та запереченні does уже показує he/she/it, тому основне дієслово без -s: Does she work? She doesn't work.",
    "En afirmación he/she/it recibe -s: She works. En pregunta y negación does ya muestra he/she/it, por eso el verbo principal va sin -s: Does she work? She doesn't work.",
  ),
  contrastSet: ['do', 'does', "don't", "doesn't", 'base verb', 'verb+s'],
  coreRule: tri(
    "Утверждение: She works. Отрицание: She doesn't work. Вопрос: Does she work? После do/does/don't/doesn't основной глагол всегда без -s.",
    "Ствердження: She works. Заперечення: She doesn't work. Питання: Does she work? Після do/does/don't/doesn't основне дієслово завжди без -s.",
    "Afirmación: She works. Negación: She doesn't work. Pregunta: Does she work? Después de do/does/don't/doesn't el verbo principal siempre va en base form.",
  ),
  whatUserMustLearn: {
    ru: [
      'В Present Simple в утверждении he/she/it получает -s: he works, she likes, it costs.',
      "В отрицании с he/she/it используется doesn't, а глагол идет без -s: she doesn't work.",
      'В вопросе с he/she/it используется Does, а глагол идет без -s: Does she work?',
      'Нельзя говорить Does she works? Это двойная грамматика.',
      "Нельзя говорить She doesn't works. Doesn't уже несет -s.",
      "С I/you/we/they используется do/don't, а глагол тоже идет без -s: Do they work? They don't work.",
      'После do/does/don’t/doesn’t основной глагол не получает -s, -ed, to.',
    ],
    uk: [
      'У Present Simple в ствердженні he/she/it отримує -s: he works, she likes, it costs.',
      "У запереченні з he/she/it використовується doesn't, а дієслово йде без -s: she doesn't work.",
      'У питанні з he/she/it використовується Does, а дієслово йде без -s: Does she work?',
      'Не можна говорити Does she works? Це подвійна граматика.',
      "Не можна говорити She doesn't works. Doesn't уже несе -s.",
      "З I/you/we/they використовується do/don't, а дієслово теж йде без -s: Do they work? They don't work.",
      'Після do/does/don’t/doesn’t основне дієслово не отримує -s, -ed, to.',
    ],
    es: [
      'En Present Simple afirmativo, he/she/it recibe -s: he works, she likes, it costs.',
      "En negación con he/she/it usamos doesn't + base verb: she doesn't work.",
      'En pregunta con he/she/it usamos Does + subject + base verb: Does she work?',
      'No digas Does she works? Es gramática duplicada.',
      "No digas She doesn't works. Doesn't ya lleva la -s.",
      "Con I/you/we/they usamos do/don't + base verb: Do they work? They don't work.",
      "Después de do/does/don't/doesn't el verbo principal no recibe -s, -ed ni to.",
    ],
  },
  examples: [
    { en: 'She works every day.', ru: 'Она работает каждый день.', uk: 'Вона працює щодня.', es: 'Ella trabaja todos los días.', why: tri('Это утверждение. She получает -s, поэтому получается works.', 'Це ствердження. She отримує -s, тому виходить works.', 'Es afirmación. Subject she, por eso el verbo principal recibe -s: works.') },
    { en: "She doesn't work on Sundays.", ru: 'Она не работает по воскресеньям.', uk: 'Вона не працює по неділях.', es: 'Ella no trabaja los domingos.', why: tri("В отрицании doesn't уже показывает she/he/it. Основной глагол идет без -s: work.", "У запереченні doesn't уже показує she/he/it. Основне дієслово йде без -s: work.", "En negación, doesn't ya muestra she/he/it. El verbo principal va sin -s: work.") },
    { en: 'Does she work here?', ru: 'Она здесь работает?', uk: 'Вона тут працює?', es: 'Ella trabaja aquí?', why: tri('В вопросе does стоит перед she. После does глагол идет без -s: work.', 'У питанні does стоїть перед she. Після does дієслово йде без -s: work.', 'En pregunta, does va antes del subject. Después de does el verbo principal va en base form: work.') },
    { en: "They don't like coffee.", ru: 'Они не любят кофе.', uk: 'Вони не люблять каву.', es: 'A ellos no les gusta el café.', why: tri("They идет с don't, не с doesn't. После don't глагол тоже идет без -s: like.", "They йде з don't, не з doesn't. Після don't дієслово теж йде без -s: like.", "They va con don't, no con doesn't. Después de don't el verbo principal también va en base form: like.") },
    { en: 'Do they like coffee?', ru: 'Они любят кофе?', uk: 'Вони люблять каву?', es: 'Les gusta el café?', why: tri('They требует do в вопросе. Порядок: Do + they + like.', 'They потребує do в питанні. Порядок: Do + they + like.', 'They necesita do en pregunta. Orden: Do + they + like.') },
    { en: "He doesn't know the answer.", ru: 'Он не знает ответа.', uk: 'Він не знає відповіді.', es: 'Él no sabe la respuesta.', why: tri("He требует doesn't в отрицании. После doesn't нельзя knows, только know.", "He потребує doesn't у запереченні. Після doesn't не можна knows, тільки know.", "He necesita doesn't en negación. Después de doesn't no va knows, solo know.") },
    { en: 'Does it cost much?', ru: 'Это дорого стоит?', uk: 'Це дорого коштує?', es: 'Cuesta mucho?', why: tri('It требует does в вопросе. После does основной глагол без -s: cost.', 'It потребує does у питанні. Після does основне дієслово без -s: cost.', 'It necesita does en pregunta. Después de does el verbo principal va sin -s: cost.') },
    { en: "I don't understand.", ru: 'Я не понимаю.', uk: 'Я не розумію.', es: 'No entiendo.', why: tri("I идет с don't, не с doesn't. После don't глагол остается простым.", "I йде з don't, не з doesn't. Після don't дієслово залишається простим.", "I va con don't, no con doesn't. Después de don't el verbo va en base form.") },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты путаешь Present Simple в вопросах и отрицаниях. Самая частая ошибка - оставить -s на основном глаголе после does.', 'Схоже, ти плутаєш Present Simple у питаннях і запереченнях. Найчастіша помилка - залишити -s на основному дієслові після does.', 'Parece que confundes Present Simple en preguntas y negaciones. El error más común es dejar la -s en el verbo principal después de does.') },
    { id: 'intro_rule', type: 'rule', text: tri('В утверждении -s стоит на глаголе. В вопросе и отрицании -s переезжает в does.', 'У ствердженні -s стоїть на дієслові. У питанні та запереченні -s переїжджає в does.', 'En afirmación la -s está en el verbo. En pregunta y negación la -s se muda a does.') },
    { id: 'intro_warning', type: 'warning', text: tri("Не ставь -s дважды. Does she work? правильно. Does she works? неправильно. She doesn't work правильно. She doesn't works неправильно.", "Не став -s двічі. Does she work? правильно. Does she works? неправильно. She doesn't work правильно. She doesn't works неправильно.", "No marques la -s dos veces. Does she work? correcto. Does she works? incorrecto. She doesn't work correcto. She doesn't works incorrecto.") },
  ],
  steps: [
    doStep({ id: 'do_does_easy_001', order: 1, difficulty: 'easy', targetSkill: 'negative_doesnt_base', sentence: 'She ___ work on Sundays.', translation: tri('Она не работает по воскресеньям.', 'Вона не працює по неділях.', 'Ella no trabaja los domingos.'), options: ["don't", "doesn't", "doesn't works", "isn't"], correctAnswer: "doesn't", correctFeedback: tri("Да. She требует doesn't в отрицании. После doesn't основной глагол остается base form: work.", "Так. She потребує doesn't у запереченні. Після doesn't основне дієслово залишається base form: work.", "Sí. She necesita doesn't en negación. Después de doesn't el verbo queda en base form: work."), wrong: { "don't": tri("Don't используется с I/you/we/they. С she нужен doesn't: She doesn't work.", "Don't використовується з I/you/we/they. З she потрібен doesn't: She doesn't work.", "Don't se usa con I/you/we/they. Con she necesitamos doesn't."), "doesn't works": tri("Здесь двойная грамматика. Doesn't уже показывает she/he/it, поэтому works больше не нужно.", "Тут подвійна граматика. Doesn't уже показує she/he/it, тому works більше не потрібно.", "Aquí hay gramática doble. Doesn't ya marca she/he/it, por eso works ya no va."), "isn't": tri("Isn't используется с be: She isn't tired. Но с обычным глаголом work нужен doesn't.", "Isn't використовується з be: She isn't tired. Але зі звичайним дієсловом work потрібен doesn't.", "Isn't se usa con be. Pero con el verbo normal work necesitamos doesn't.") }, retry: [tri("She = doesn't. После doesn't глагол без -s: work.", "She = doesn't. Після doesn't дієслово без -s: work.", "She = doesn't. Después de doesn't el verbo va sin -s: work."), tri("She works, но She doesn't work.", "She works, але She doesn't work.", "She works, pero She doesn't work."), tri("Подсказка: She doesn't work.", "Підказка: She doesn't work.", "Pista: She doesn't work.")], focusWords: ['she', "doesn't", 'work'] }),
    doStep({ id: 'do_does_easy_002', order: 2, difficulty: 'easy', targetSkill: 'negative_dont_base', sentence: 'They ___ like coffee.', translation: tri('Они не любят кофе.', 'Вони не люблять каву.', 'A ellos no les gusta el café.'), options: ["doesn't", "don't", "doesn't likes", "aren't"], correctAnswer: "don't", correctFeedback: tri("Да. They идет с don't. После don't глагол остается простым: like.", "Так. They йде з don't. Після don't дієслово залишається простим: like.", "Sí. They va con don't. Después de don't el verbo queda en base form: like."), wrong: { "doesn't": tri("Doesn't используется с he/she/it. They требует don't.", "Doesn't використовується з he/she/it. They потребує don't.", "Doesn't se usa con he/she/it. They necesita don't."), "doesn't likes": tri("Здесь две ошибки: they не идет с doesn't, и после do/does нельзя likes.", "Тут дві помилки: they не йде з doesn't, і після do/does не можна likes.", "Aquí hay dos errores: they no va con doesn't, y después de auxiliary no va likes."), "aren't": tri("Aren't используется с be. Но like - обычный глагол, поэтому нужен don't.", "Aren't використовується з be. Але like - звичайне дієслово, тому потрібен don't.", "Aren't se usa con be. Pero like es verbo normal, por eso necesitamos don't.") }, retry: [tri("They = don't. Не doesn't.", "They = don't. Не doesn't.", "They = don't. No doesn't."), tri("They don't like.", "They don't like.", "They don't like."), tri("Подсказка: They don't like coffee.", "Підказка: They don't like coffee.", "Pista: They don't like coffee.")], focusWords: ['they', "don't", 'like'] }),
    doStep({ id: 'do_does_easy_003', order: 3, difficulty: 'easy', targetSkill: 'statement_third_person_s', sentence: 'He ___ English every day.', translation: tri('Он учит английский каждый день.', 'Він вчить англійську щодня.', 'Él estudia inglés todos los días.'), options: ['study', 'studies', 'does study', "don't study"], correctAnswer: 'studies', correctFeedback: tri('Да. Это утверждение. He требует -s/-es на основном глаголе: studies.', 'Так. Це ствердження. He потребує -s/-es на основному дієслові: studies.', 'Sí. Es afirmación. He necesita -s/-es en el verbo principal: studies.'), wrong: { study: tri('В утверждении с he нужен глагол с -s/-es. Поэтому не study, а studies.', 'У ствердженні з he потрібне дієслово з -s/-es. Тому не study, а studies.', 'En afirmación con he necesitamos verbo con -s/-es. Por eso studies.'), 'does study': tri('Does study возможно для усиления в особом контексте, но обычное утверждение: He studies.', 'Does study можливе для підсилення, але звичайне ствердження: He studies.', 'Does study puede ser énfasis, pero la afirmación normal es He studies.'), "don't study": tri("Don't study делает отрицание и не подходит с he. Здесь утверждение: He studies.", "Don't study робить заперечення і не підходить з he. Тут ствердження: He studies.", "Don't study crea negación y no va con he. Aquí es afirmación: He studies.") }, retry: [tri('Это не вопрос и не отрицание. Значит does нет. He + verb+s: studies.', 'Це не питання і не заперечення. Значить does немає. He + verb+s: studies.', 'No es pregunta ni negación. Entonces no hay does. He + verb+s: studies.'), tri('He studies.', 'He studies.', 'He studies.'), tri('Подсказка: He studies English.', 'Підказка: He studies English.', 'Pista: He studies English.')], focusWords: ['he', 'studies'] }),
    doStep({ id: 'do_does_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'question_does_base', sentence: '___ she work here?', translation: tri('Она здесь работает?', 'Вона тут працює?', 'Ella trabaja aquí?'), options: ['Do', 'Does', 'Is', 'Does works'], correctAnswer: 'Does', correctFeedback: tri('Да. She требует does в вопросе. После does глагол идет в base form: work.', 'Так. She потребує does у питанні. Після does дієслово йде в base form: work.', 'Sí. She necesita does en pregunta. Después de does el verbo va en base form: work.'), wrong: { Do: tri('Do используется с I/you/we/they. С she нужен does.', 'Do використовується з I/you/we/they. З she потрібен does.', 'Do se usa con I/you/we/they. Con she necesitamos does.'), Is: tri('Is нужен с be или -ing. Но с обычным work в Present Simple нужен does.', 'Is потрібен з be або -ing. Але зі звичайним work у Present Simple потрібен does.', 'Is se usa con be o -ing. Pero con work en Present Simple necesitamos does.'), 'Does works': tri('Does works - двойная грамматика. Does уже показывает she/he/it. После does только work.', 'Does works - подвійна граматика. Does уже показує she/he/it. Після does тільки work.', 'Does works es gramática doble. Does ya marca she/he/it. Después de does solo work.') }, retry: [tri('She в вопросе = Does she + простой глагол.', 'She у питанні = Does she + просте дієслово.', 'She en pregunta = Does she + verbo simple.'), tri('Does she work? Без -s на work.', 'Does she work? Без -s на work.', 'Does she work? Sin -s en work.'), tri('Подсказка: Does she work here?', 'Підказка: Does she work here?', 'Pista: Does she work here?')], focusWords: ['she', 'does', 'work'] }),
    doStep({ id: 'do_does_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'question_does_base', sentence: 'Does he ___ the answer?', translation: tri('Он знает ответ?', 'Він знає відповідь?', 'Él sabe la respuesta?'), options: ['know', 'knows', 'knowing', 'to know'], correctAnswer: 'know', correctFeedback: tri('Да. После does основной глагол идет без -s: know. Не knows.', 'Так. Після does основне дієслово йде без -s: know. Не knows.', 'Sí. Después de does el verbo principal va en base form: know. No knows.'), wrong: { knows: tri('Knows уже содержит -s. Но does уже забрал эту грамматику. После does нужен know.', 'Knows уже містить -s. Але does уже забрав цю граматику. Після does потрібен know.', 'Knows ya contiene -s. Pero does ya tomó esa gramática. Después de does necesitamos know.'), knowing: tri('Knowing здесь не подходит. После does нужен простой глагол: know.', 'Knowing тут не підходить. Після does потрібне просте дієслово: know.', 'Knowing no encaja. Después de does necesitamos verbo simple: know.'), 'to know': tri('После does не ставим to. Правильно: Does he know?', 'Після does не ставимо to. Правильно: Does he know?', 'Después de does no ponemos to. Correcto: Does he know?') }, retry: [tri('После does не -s, не -ing, не to. Только простая форма.', 'Після does не -s, не -ing, не to. Тільки проста форма.', 'Después de does no -s, no -ing, no to. Solo base verb.'), tri('Does he know?', 'Does he know?', 'Does he know?'), tri('Подсказка: Does he know the answer?', 'Підказка: Does he know the answer?', 'Pista: Does he know the answer?')], focusWords: ['does', 'know'] }),
    doStep({ id: 'do_does_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'negative_doesnt_base', sentence: 'It ___ cost much.', translation: tri('Это не стоит дорого.', 'Це не коштує дорого.', 'No cuesta mucho.'), options: ["don't", "doesn't", "doesn't costs", "isn't"], correctAnswer: "doesn't", correctFeedback: tri("Да. It требует doesn't. После doesn't основной глагол без -s: cost.", "Так. It потребує doesn't. Після doesn't основне дієслово без -s: cost.", "Sí. It necesita doesn't. Después de doesn't el verbo va sin -s: cost."), wrong: { "don't": tri("Don't используется с I/you/we/they. С it нужен doesn't.", "Don't використовується з I/you/we/they. З it потрібен doesn't.", "Don't se usa con I/you/we/they. Con it necesitamos doesn't."), "doesn't costs": tri("Doesn't costs - двойная грамматика. Doesn't уже показывает it, поэтому cost без -s.", "Doesn't costs - подвійна граматика. Doesn't уже показує it, тому cost без -s.", "Doesn't costs es gramática doble. Doesn't ya marca it, por eso cost va sin -s."), "isn't": tri("Isn't нужен с be/adjective. Но cost - обычный глагол, поэтому doesn't.", "Isn't потрібен з be/adjective. Але cost - звичайне дієслово, тому doesn't.", "Isn't se usa con be/adjective. Pero cost es verbo normal, por eso doesn't.") }, retry: [tri("It = doesn't. После doesn't: cost, не costs.", "It = doesn't. Після doesn't: cost, не costs.", "It = doesn't. Después de doesn't: cost, no costs."), tri("It doesn't cost.", "It doesn't cost.", "It doesn't cost."), tri("Подсказка: It doesn't cost much.", "Підказка: It doesn't cost much.", "Pista: It doesn't cost much.")], focusWords: ['it', "doesn't", 'cost'] }),
    doStep({ id: 'do_does_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'question_do_base', sentence: '___ they live nearby?', translation: tri('Они живут рядом?', 'Вони живуть поруч?', 'Viven cerca?'), options: ['Do', 'Does', 'Are', 'Does lives'], correctAnswer: 'Do', correctFeedback: tri('Да. They требует do в вопросе. После do основной глагол идет без -s: live.', 'Так. They потребує do у питанні. Після do основне дієслово йде без -s: live.', 'Sí. They necesita do en pregunta. Después de do el verbo va en base form: live.'), wrong: { Does: tri('Does используется с he/she/it. They требует do.', 'Does використовується з he/she/it. They потребує do.', 'Does se usa con he/she/it. They necesita do.'), Are: tri('Are нужен с be или -ing. Но live в Present Simple требует do.', 'Are потрібен з be або -ing. Але live у Present Simple потребує do.', 'Are se usa con be o -ing. Pero live en Present Simple necesita do.'), 'Does lives': tri('Две ошибки: they не идет с does, и после do/does нельзя lives.', 'Дві помилки: they не йде з does, і після do/does не можна lives.', 'Dos errores: they no va con does, y después de auxiliary no va lives.') }, retry: [tri('They = do. Вопрос: Do they live?', 'They = do. Питання: Do they live?', 'They = do. Pregunta: Do they live?'), tri('Do they + verb.', 'Do they + verb.', 'Do they + verb.'), tri('Подсказка: Do they live nearby?', 'Підказка: Do they live nearby?', 'Pista: Do they live nearby?')], focusWords: ['they', 'do', 'live'] }),
    doStep({ id: 'do_does_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'negative_dont_base', sentence: 'I ___ understand this rule.', translation: tri('Я не понимаю это правило.', 'Я не розумію це правило.', 'No entiendo esta regla.'), options: ["doesn't", "don't", 'am not', "don't understands"], correctAnswer: "don't", correctFeedback: tri("Да. I идет с don't. После don't основной глагол base form: understand.", "Так. I йде з don't. Після don't основне дієслово base form: understand.", "Sí. I va con don't. Después de don't el verbo va en base form: understand."), wrong: { "doesn't": tri("Doesn't используется с he/she/it. С I нужен don't.", "Doesn't використовується з he/she/it. З I потрібен don't.", "Doesn't se usa con he/she/it. Con I necesitamos don't."), 'am not': tri("Am not нужен с be/adjective. Но understand - обычный глагол, поэтому don't.", "Am not потрібен з be/adjective. Але understand - звичайне дієслово, тому don't.", "Am not se usa con be/adjective. Pero understand es verbo normal, por eso don't."), "don't understands": tri("После don't нельзя understands. После don't основной глагол всегда простой: understand.", "Після don't не можна understands. Після don't основне дієслово завжди просте: understand.", "Después de don't no va understands. El verbo principal siempre va simple.") }, retry: [tri("I = don't. После don't простой глагол: understand.", "I = don't. Після don't просте дієслово: understand.", "I = don't. Después de don't verbo simple: understand."), tri("I don't understand.", "I don't understand.", "I don't understand."), tri("Подсказка: I don't understand this rule.", "Підказка: I don't understand this rule.", "Pista: I don't understand this rule.")], focusWords: ['I', "don't", 'understand'] }),
    doStep({ id: 'do_does_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'question_do_base', sentence: '___ you need help?', translation: tri('Тебе нужна помощь?', 'Тобі потрібна допомога?', 'Necesitas ayuda?'), options: ['Do', 'Does', 'Are', 'Is'], correctAnswer: 'Do', correctFeedback: tri('Да. You требует do в вопросе: Do you need help?', 'Так. You потребує do у питанні: Do you need help?', 'Sí. You necesita do en pregunta: Do you need help?'), wrong: { Does: tri('Does используется с he/she/it. You требует do.', 'Does використовується з he/she/it. You потребує do.', 'Does se usa con he/she/it. You necesita do.'), Are: tri('Are нужен с be/adjective или -ing. Но need - обычный глагол, поэтому do.', 'Are потрібен з be/adjective або -ing. Але need - звичайне дієслово, тому do.', 'Are se usa con be/adjective o -ing. Pero need es verbo normal, por eso do.'), Is: tri('Is не подходит с you и не нужен с обычным глаголом need.', 'Is не підходить з you і не потрібен зі звичайним дієсловом need.', 'Is no va con you y no se usa con need.') }, retry: [tri('You в Present Simple вопросе = Do you.', 'You у Present Simple питанні = Do you.', 'You en pregunta de Present Simple = Do you.'), tri('Do you need?', 'Do you need?', 'Do you need?'), tri('Подсказка: Do you need help?', 'Підказка: Do you need help?', 'Pista: Do you need help?')], focusWords: ['you', 'do', 'need'] }),
    doStep({ id: 'do_does_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'question_word_order', sentence: 'Which sentence is correct?', translation: tri('Какое предложение правильное?', 'Яке речення правильне?', 'Qué oración es correcta?'), options: ['Does she likes tea?', 'Does she like tea?', 'She does like tea?', 'Do she like tea?'], correctAnswer: 'Does she like tea?', correctFeedback: tri('Да. Вопрос строится так: Does + she + глагол без -s.', 'Так. Питання будується так: Does + she + дієслово без -s.', 'Sí. La pregunta se construye así: Does + she + base verb.'), wrong: { 'Does she likes tea?': tri('После does нельзя likes. Does уже несет грамматику she.', 'Після does не можна likes. Does уже несе граматику she.', 'Después de does no va likes. Does ya lleva la gramática de she.'), 'She does like tea?': tri('Это не стандартный порядок вопроса. В обычном вопросе does идет в начало.', 'Це не стандартний порядок питання. У звичайному питанні does йде на початок.', 'No es el orden estándar de pregunta. Does va al principio.'), 'Do she like tea?': tri('С she нужен does, не do.', 'З she потрібен does, не do.', 'Con she necesitamos does, no do.') }, retry: [tri('She в вопросе: Does she + like. Не likes.', 'She у питанні: Does she + like. Не likes.', 'She en pregunta: Does she + like. No likes.'), tri('Does she like?', 'Does she like?', 'Does she like?'), tri('Подсказка: Does she like tea?', 'Підказка: Does she like tea?', 'Pista: Does she like tea?')], focusWords: ['does', 'she', 'like'] }),
    doStep({ id: 'do_does_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'negative_word_order', sentence: 'Which sentence is correct?', translation: tri('Какое предложение правильное?', 'Яке речення правильне?', 'Qué oración es correcta?'), options: ["He doesn't knows me.", "He don't know me.", "He doesn't know me.", "Doesn't he knows me."], correctAnswer: "He doesn't know me.", correctFeedback: tri("Да. He + doesn't + глагол без -s. Правильно: He doesn't know me.", "Так. He + doesn't + дієслово без -s. Правильно: He doesn't know me.", "Sí. He + doesn't + base verb. Correcto: He doesn't know me."), wrong: { "He doesn't knows me.": tri("После doesn't нельзя knows. Doesn't уже забрал -s.", "Після doesn't не можна knows. Doesn't уже забрав -s.", "Después de doesn't no va knows. Doesn't ya tomó la -s."), "He don't know me.": tri("С he нужен doesn't, не don't.", "З he потрібен doesn't, не don't.", "Con he necesitamos doesn't, no don't."), "Doesn't he knows me.": tri("Это похоже на вопрос, но порядок и форма неправильные. Для утверждения: He doesn't know me.", "Це схоже на питання, але порядок і форма неправильні. Для ствердження: He doesn't know me.", "Parece una pregunta, pero orden y forma son incorrectos. Para afirmación negativa: He doesn't know me.") }, retry: [tri("He = doesn't. После doesn't: know.", "He = doesn't. Після doesn't: know.", "He = doesn't. Después de doesn't: know."), tri("He doesn't know.", "He doesn't know.", "He doesn't know."), tri("Подсказка: He doesn't know me.", "Підказка: He doesn't know me.", "Pista: He doesn't know me.")], focusWords: ['he', "doesn't", 'know'] }),
    doStep({ id: 'do_does_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'base_form_after_auxiliary', sentence: 'Why ___ it matter?', translation: tri('Почему это важно?', 'Чому це має значення?', 'Por qué importa?'), options: ['do', 'does', 'does matters', 'is'], correctAnswer: 'does', correctFeedback: tri('Да. It требует does. После does основной глагол без -s: matter.', 'Так. It потребує does. Після does основне дієслово без -s: matter.', 'Sí. It necesita does. Después de does el verbo va sin -s: matter.'), wrong: { do: tri('С it нужен does, не do.', 'З it потрібен does, не do.', 'Con it necesitamos does, no do.'), 'does matters': tri('Does matters - двойная грамматика. После does глагол без -s: matter.', 'Does matters - подвійна граматика. Після does дієслово без -s: matter.', 'Does matters es gramática doble. Después de does el verbo va sin -s.'), is: tri('Is не подходит с обычным глаголом matter. В Present Simple вопросе нужен does.', 'Is не підходить зі звичайним дієсловом matter. У Present Simple питанні потрібен does.', 'Is no encaja con matter. En Present Simple pregunta necesitamos does.') }, retry: [tri('It в вопросе = does it + глагол без -s.', 'It у питанні = does it + дієслово без -s.', 'It en pregunta = does it + base verb.'), tri('Does it matter?', 'Does it matter?', 'Does it matter?'), tri('Подсказка: Why does it matter?', 'Підказка: Why does it matter?', 'Pista: Why does it matter?')], focusWords: ['it', 'does', 'matter'] }),
    doStep({ id: 'do_does_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'question_do_does_mixed', sentence: '___ your parents live nearby?', translation: tri('Твои родители живут рядом?', 'Твої батьки живуть поруч?', 'Tus padres viven cerca?'), options: ['Do', 'Does', 'Are', 'Is'], correctAnswer: 'Do', correctFeedback: tri('Да. Your parents = they. Поэтому в вопросе нужен do.', 'Так. Your parents = they. Тому в питанні потрібен do.', 'Sí. Your parents = they. Por eso en pregunta necesitamos do.'), wrong: { Does: tri('Does нужен для he/she/it. Your parents - множественное число, как they.', 'Does потрібен для he/she/it. Your parents - множина, як they.', 'Does se usa para he/she/it. Your parents es plural, como they.'), Are: tri('Are your parents nearby? было бы без live. Но с обычным live нужен do.', 'Are your parents nearby? було б без live. Але зі звичайним live потрібен do.', 'Are your parents nearby? funcionaría sin live. Pero con live necesitamos do.'), Is: tri('Is не подходит: parents - множественное число, и с live нужен do.', 'Is не підходить: parents - множина, і з live потрібен do.', 'Is no encaja: parents es plural y con live necesitamos do.') }, retry: [tri('Parents = they. They в вопросе = do.', 'Parents = they. They у питанні = do.', 'Parents = they. They en pregunta = do.'), tri('Do your parents live?', 'Do your parents live?', 'Do your parents live?'), tri('Подсказка: Do your parents live nearby?', 'Підказка: Do your parents live nearby?', 'Pista: Do your parents live nearby?')], focusWords: ['parents', 'do', 'live'] }),
    doStep({ id: 'do_does_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'negative_doesnt_base', sentence: 'My brother ___ drive.', translation: tri('Мой брат не водит.', 'Мій брат не водить.', 'Mi hermano no conduce.'), options: ["don't", "doesn't", "doesn't drives", "isn't"], correctAnswer: "doesn't", correctFeedback: tri("Да. My brother = he. Поэтому doesn't. После doesn't глагол без -s: drive.", "Так. My brother = he. Тому doesn't. Після doesn't дієслово без -s: drive.", "Sí. My brother = he. Por eso doesn't. Después de doesn't el verbo va sin -s: drive."), wrong: { "don't": tri("Don't нужен для I/you/we/they. My brother = he, поэтому doesn't.", "Don't потрібен для I/you/we/they. My brother = he, тому doesn't.", "Don't se usa con I/you/we/they. My brother = he, por eso doesn't."), "doesn't drives": tri("Doesn't drives - ошибка. Doesn't уже несет -s, поэтому drive без -s.", "Doesn't drives - помилка. Doesn't уже несе -s, тому drive без -s.", "Doesn't drives es error. Doesn't ya lleva la -s, por eso drive va sin -s."), "isn't": tri("Isn't нужен с be/adjective. С drive нужен doesn't.", "Isn't потрібен з be/adjective. З drive потрібен doesn't.", "Isn't se usa con be/adjective. Con drive necesitamos doesn't.") }, retry: [tri("My brother = he. He doesn't drive.", "My brother = he. He doesn't drive.", "My brother = he. He doesn't drive."), tri("Doesn't + drive.", "Doesn't + drive.", "Doesn't + drive."), tri("Подсказка: My brother doesn't drive.", "Підказка: My brother doesn't drive.", "Pista: My brother doesn't drive.")], focusWords: ['brother', "doesn't", 'drive'] }),
    doStep({ id: 'do_does_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_statement_question_negative', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.', 'Elige la pareja correcta.'), options: ['She works / Does she work?', 'She work / Does she works?', 'She works / Does she works?', 'She does works / Does she work?'], correctAnswer: 'She works / Does she work?', correctFeedback: tri('Да. В утверждении -s на глаголе: She works. В вопросе does забирает -s: Does she work?', 'Так. У ствердженні -s на дієслові: She works. У питанні does забирає -s: Does she work?', 'Sí. En afirmación la -s va en el verbo. En pregunta does toma la -s.'), wrong: { 'She work / Does she works?': tri('Логика перевернута. В утверждении she требует works. В вопросе после does нужен work.', 'Логіка перевернута. У ствердженні she потребує works. У питанні після does потрібен work.', 'La lógica está invertida. En afirmación she necesita works. Después de does necesitamos work.'), 'She works / Does she works?': tri('Первая часть правильная, но после does нельзя works.', 'Перша частина правильна, але після does не можна works.', 'La primera parte está bien, pero después de does no va works.'), 'She does works / Does she work?': tri('В обычном утверждении не нужно does works. Правильно She works.', 'У звичайному ствердженні не потрібно does works. Правильно She works.', 'En afirmación normal no necesitamos does works. Correcto: She works.') }, retry: [tri('Утверждение: she works. Вопрос: does she work. -s не может быть в двух местах.', 'Ствердження: she works. Питання: does she work. -s не може бути у двох місцях.', 'Afirmación: she works. Pregunta: does she work. La -s no puede estar en dos lugares.'), tri('She works -> Does she work?', 'She works -> Does she work?', 'She works -> Does she work?'), tri('Подсказка: She works / Does she work?', 'Підказка: She works / Does she work?', 'Pista: She works / Does she work?')], focusWords: ['works', 'does', 'work'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['double_marking_does_verb_s', 'wrong_auxiliary_do_does', 'negative_double_marking', 'question_word_order_error', 'missing_auxiliary_in_question', 'base_form_after_auxiliary_error'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем, кто делает действие, где стоит do/does и почему глагол идет без -s.', 'Звичайне пояснення: показуємо, хто робить дію, де стоїть do/does і чому дієслово йде без -s.', 'Explicación normal: mostramos subject, auxiliary y base verb.'),
    depth2: tri('Проще: объясняем, что does забирает -s.', 'Простіше: пояснюємо, що does забирає -s.', 'Más simple: explicamos que does se lleva la -s.'),
    depth3: tri('Еще проще: показываем пару She works -> Does she work?', 'Ще простіше: показуємо пару She works -> Does she work?', 'Aún más simple: mostramos la pareja She works -> Does she work?'),
    depth4: tri('Почти подсказка: прямо указываем, что после does нужен глагол без -s.', 'Майже підказка: прямо вказуємо, що після does потрібне дієслово без -s.', 'Casi pista: indicamos directamente que después de does va verbo sin -s.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri("Остановись. He/she/it = does/doesn't. I/you/we/they = do/don't. После do/does глагол всегда простой: work, like, know.", "Зупинись. He/she/it = does/doesn't. I/you/we/they = do/don't. Після do/does дієслово завжди просте: work, like, know.", "Detente. Subject: he/she/it = does/doesn't. I/you/we/they = do/don't. Después de auxiliary el verbo siempre va simple.") },
    afterThreeWrongInSameExercise: { action: 'show_auxiliary_subject_hint_then_retry', card: tri('Подсказка по структуре: система покажет, кто делает действие, и подскажет, нужен do или does, но не выберет весь ответ.', 'Підказка за структурою: система покаже, хто робить дію, і підкаже, потрібен do чи does, але не вибере всю відповідь.', 'Pista de estructura: el sistema mostrará el subject y dirá si necesitas do o does, pero no elegirá toda la respuesta.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Режим подсказки: сначала выбери группу I/you/we/they или he/she/it. Потом система вернет тебя к полной фразе.', 'Режим підказки: спочатку обери групу I/you/we/they або he/she/it. Потім система поверне тебе до повної фрази.', 'Modo guiado: primero elige subject group. Luego el sistema te devuelve a la frase completa.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_do_does_001', prompt: tri('She относится к какой группе?', 'She належить до якої групи?', 'She pertenece a qué grupo?'), options: ['he/she/it', 'I/you/we/they'], correctIndex: 0, thenReturnToExerciseId: 'do_does_easy_001' },
      { id: 'guided_do_does_002', prompt: tri('После does нужен works или work?', 'Після does потрібно works чи work?', 'Después de does necesitamos works o work?'), options: ['works', 'work'], correctIndex: 1, thenReturnToExerciseId: 'do_does_contrast_001' },
      { id: 'guided_do_does_003', prompt: tri('They относится к какой группе?', 'They належить до якої групи?', 'They pertenece a qué grupo?'), options: ['he/she/it', 'I/you/we/they'], correctIndex: 1, thenReturnToExerciseId: 'do_does_contrast_004' },
      { id: 'guided_do_does_004', prompt: tri('В вопросе Does she ___ tea основной глагол должен быть с -s?', 'У питанні Does she ___ tea основне дієслово має бути з -s?', 'En la pregunta Does she ___ tea, el verbo principal debe tener -s?'), options: ['да', 'нет'], correctIndex: 1, thenReturnToExerciseId: 'do_does_mixed_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'verb_present_simple_negative_question',
    diagnosisLabel: tri('Do / Does в вопросах и отрицаниях', 'Do / Does у питаннях і запереченнях', 'Do / Does en preguntas y negaciones'),
    contrastSet: ['do', 'does', "don't", "doesn't", 'base verb', 'verb+s'],
    focusWords: ['do', 'does', "don't", "doesn't", 'base verb'],
    focusPatterns: ['negative_doesnt_base', 'negative_dont_base', 'statement_third_person_s', 'question_does_base', 'question_do_base', 'question_word_order', 'negative_word_order', 'base_form_after_auxiliary', 'question_do_does_mixed', 'mixed_statement_question_negative'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_verb_present_simple_negative_question_start',
    answer: 'diagnosis_training_verb_present_simple_negative_question_answer',
    mastery: 'diagnosis_training_verb_present_simple_negative_question_mastery',
    fallback: 'diagnosis_training_verb_present_simple_negative_question_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'verb', microDiagnosisId: 'verb_present_simple_negative_question', contrastSet: ['do', 'does', "don't", "doesn't", 'base verb', 'verb+s'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logSubjectGroup: true, logVerbForm: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=verb_present_simple_negative_question',
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


