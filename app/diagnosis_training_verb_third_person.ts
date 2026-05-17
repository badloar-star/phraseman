import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.

const tri = (ru: string, uk: string, es: string): TriText => ({ ru, uk, es });

function thirdStep(input: {
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
      'В обычном утверждении he, she и it добавляют к действию маленький хвост: -s, -es или особую форму has.',
      'У звичайному ствердженні he, she та it додають до дії маленький хвіст: -s, -es або особливу форму has.',
      'En afirmación de Present Simple, solo he/she/it añade una marca al verbo: -s, -es o la forma especial has.',
    ),
    microTask: tri(
      'Выбери форму действия под того, кто его делает.',
      'Обери форму дії під того, хто її робить.',
      'Elige la forma del verbo que encaja con el subject.',
    ),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex,
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? tri(
        'Не совсем. Сначала найди, кто делает действие: he/she/it обычно дают хвост -s или -es, а I/you/we/they оставляют действие простым.',
        'Не зовсім. Спочатку знайди, хто робить дію: he/she/it зазвичай дають хвіст -s або -es, а I/you/we/they залишають дію простою.',
        'No exactamente. Primero encuentra el subject: he/she/it necesita -s/-es, pero I/you/we/they usan base verb.',
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
      'Проверь две вещи: это утверждение или вопрос? В обычном утверждении he/she/it добавляют -s или -es. После does действие снова без хвоста.',
      'Перевір дві речі: це ствердження чи питання? У звичайному ствердженні he/she/it додають -s або -es. Після does дія знову без хвоста.',
      'Revisa dos cosas: es afirmación o pregunta? Si es afirmación y subject = he/she/it, necesitas verb+s/es. Después de does la forma vuelve a ser simple.',
    ),
    focusWords: input.focusWords,
  };
}

export const VERB_THIRD_PERSON_TRAINING: DiagnosisTraining = {
  id: 'verb_third_person',
  category: 'verb',
  version: '1.0.0',
  status: 'active',
  priority: 8,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('He / She / It: глагол с -s', 'He / She / It: дієслово з -s', 'He / She / It: verbo con -s'),
  shortTitle: tri('He / She / It + -s', 'He / She / It + -s', 'He / She / It + -s'),
  shortDiagnosis: tri(
    'Ты забываешь маленький хвост -s/-es после he, she и it.',
    'Ти забуваєш маленький хвіст -s/-es після he, she та it.',
    'Olvidas -s/-es en afirmaciones de Present Simple con he/she/it.',
  ),
  diagnosisText: tri(
    'Ты забываешь -s/-es после he, she, it в обычных утверждениях. Смысл понятен, но форма звучит незаконченно: в английском после he/she/it действие часто получает маленький хвост.',
    'Ти забуваєш -s/-es після he, she, it у звичайних ствердженнях. Зміст зрозумілий, але форма звучить незавершено: в англійській після he/she/it дія часто отримує маленький хвіст.',
    'Olvidas -s/-es después de he, she, it en afirmaciones de Present Simple. No es un error de significado, sino de forma: he/she/it necesita una pequeña marca gramatical en el verbo.',
  ),
  mentalModel: tri(
    'Сначала спроси: кто делает действие? I, you, we, they оставляют действие простым. He, she, it обычно добавляют -s или -es.',
    'Спочатку запитай: хто робить дію? I, you, we, they залишають дію простою. He, she, it зазвичай додають -s або -es.',
    'En afirmación de Present Simple: I/you/we/they usan verbo simple. He/she/it añade -s o -es: I work, she works. They go, he goes.',
  ),
  contrastSet: ['base verb', 'verb+s', 'verb+es', 'has', 'does'],
  coreRule: tri(
    'Для I/you/we/they действие остается простым. Для he/she/it добавь -s, иногда -es; у have отдельная форма has.',
    'Для I/you/we/they дія залишається простою. Для he/she/it додай -s, іноді -es; у have окрема форма has.',
    'I work, you work, we work, they work. Pero: he works, she works, it works. Después de -o, -ch, -sh, -s, -x muchas veces añadimos -es: goes, watches, finishes. Have cambia a has.',
  ),
  whatUserMustLearn: {
    ru: [
      'В обычном утверждении he/she/it требуют -s или -es на действии.',
      'С I/you/we/they действие остается простым.',
      'С he/she/it к действию обычно добавляется -s: works, lives, costs.',
      'После do/does/don\'t/doesn\'t -s не ставится. Это отдельная граница.',
      'После -o, -ch, -sh, -s, -x часто добавляем -es: goes, watches, washes, passes, fixes.',
      'Если слово заканчивается на согласную + y, y меняется на ies: study -> studies.',
      'Have меняется на has с he/she/it: I have, she has.',
    ],
    uk: [
      'У звичайному ствердженні he/she/it потребують -s або -es на дії.',
      'З I/you/we/they дія залишається простою.',
      'З he/she/it до дії зазвичай додається -s: works, lives, costs.',
      'Після do/does/don\'t/doesn\'t -s не ставиться. Це окрема межа.',
      'Після -o, -ch, -sh, -s, -x часто додаємо -es: goes, watches, washes, passes, fixes.',
      'Якщо слово закінчується на приголосну + y, y змінюється на ies: study -> studies.',
      'Have змінюється на has з he/she/it: I have, she has.',
    ],
    es: [
      'En afirmación de Present Simple, he/she/it necesita -s o -es en el verbo.',
      'I/you/we/they usan base verb: I work, they live.',
      'He/she/it usan verb+s: he works, she lives, it costs.',
      'Después de do/does/don\'t/doesn\'t no ponemos -s. Es otro límite.',
      'Después de -o, -ch, -sh, -s, -x muchas veces añadimos -es: goes, watches, washes, passes, fixes.',
      'Si el verbo termina en consonant + y, y cambia a ies: study -> studies.',
      'Have cambia a has con he/she/it: I have, she has.',
    ],
  },
  examples: [
    { en: 'She works every day.', ru: 'Она работает каждый день.', uk: 'Вона працює щодня.', es: 'Ella trabaja todos los días.', why: tri('She = he/she/it group. В утверждении нужен works.', 'She = he/she/it group. У ствердженні потрібно works.', 'She = grupo he/she/it. En afirmación necesitamos works.') },
    { en: 'He lives in Dublin.', ru: 'Он живет в Дублине.', uk: 'Він живе в Дубліні.', es: 'Él vive en Dublín.', why: tri('He требует -s: live -> lives.', 'He потребує -s: live -> lives.', 'He necesita -s: live -> lives.') },
    { en: 'It costs ten euros.', ru: 'Это стоит десять евро.', uk: 'Це коштує десять євро.', es: 'Cuesta diez euros.', why: tri('It требует -s: costs.', 'It потребує -s: costs.', 'It necesita -s: costs.') },
    { en: 'My brother watches films at night.', ru: 'Мой брат смотрит фильмы ночью.', uk: 'Мій брат дивиться фільми вночі.', es: 'Mi hermano ve películas de noche.', why: tri('My brother = he. Watch -> watches после -ch.', 'My brother = he. Watch -> watches після -ch.', 'My brother = he. Watch -> watches después de -ch.') },
    { en: 'She studies English.', ru: 'Она учит английский.', uk: 'Вона вчить англійську.', es: 'Ella estudia inglés.', why: tri('Study заканчивается на consonant + y: studies.', 'Study закінчується на consonant + y: studies.', 'Study termina en consonant + y: studies.') },
    { en: 'He has a car.', ru: 'У него есть машина.', uk: 'У нього є машина.', es: 'Él tiene coche.', why: tri('Have с he/she/it становится has.', 'Have з he/she/it стає has.', 'Have con he/she/it cambia a has.') },
    { en: 'They work from home.', ru: 'Они работают из дома.', uk: 'Вони працюють з дому.', es: 'Ellos trabajan desde casa.', why: tri('They не получает -s. Нужен base verb.', 'They не отримує -s. Потрібен base verb.', 'They no recibe -s. Necesita base verb.') },
    { en: 'Does she work here?', ru: 'Она здесь работает?', uk: 'Вона тут працює?', es: 'Ella trabaja aquí?', why: tri('После does основной глагол без -s. Это граница с утверждением She works.', 'Після does основне дієслово без -s. Це межа зі ствердженням She works.', 'Después de does el verbo va sin -s. Es el límite con She works.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты забываешь маленькую -s после he, she, it.', 'Схоже, ти забуваєш маленьку -s після he, she, it.', 'Parece que olvidas la pequeña -s después de he, she, it.') },
    { id: 'intro_rule', type: 'rule', text: tri('Обычное утверждение + he/she/it = добавь к действию -s или -es.', 'Звичайне ствердження + he/she/it = додай до дії -s або -es.', 'Present Simple + afirmación + he/she/it = añade -s o -es.') },
    { id: 'intro_warning', type: 'warning', text: tri('Но не ставь -s после does: She works, но Does she work?', 'Але не став -s після does: She works, але Does she work?', 'Pero no pongas -s después de does: She works, pero Does she work?') },
  ],
  steps: [
    thirdStep({ id: 'third_s_easy_001', order: 1, difficulty: 'easy', targetSkill: 'basic_third_person_s', sentence: 'She ___ every day.', translation: tri('Она работает каждый день.', 'Вона працює щодня.', 'Ella trabaja todos los días.'), options: ['work', 'works', 'working', 'does work'], correctAnswer: 'works', correctFeedback: tri('Да. She в утверждении требует -s: works.', 'Так. She у ствердженні потребує -s: works.', 'Sí. She en afirmación necesita -s: works.'), wrong: { work: tri('Work подходит для I/you/we/they. Здесь she, поэтому works.', 'Work підходить для I/you/we/they. Тут she, тому works.', 'Work va con I/you/we/they. Aquí hay she, por eso works.'), working: tri('Форма с -ing нужна вместе с be. Здесь обычное действие, поэтому нужен вариант с -s.', 'Форма з -ing потрібна разом з be. Тут звичайна дія, тому потрібен варіант з -s.', 'Working necesita be: She is working. Aquí es Present Simple: works.'), 'does work': tri('Does work возможно для усиления, но обычное утверждение: She works.', 'Does work можливе для підсилення, але звичайне ствердження: She works.', 'Does work puede ser énfasis, pero la afirmación normal es She works.') }, retry: [tri('She = нужен -s.', 'She = потрібен -s.', 'She = necesita -s.'), tri('I work, но she works.', 'I work, але she works.', 'I work, pero she works.'), tri('Подсказка: She works.', 'Підказка: She works.', 'Pista: She works.')], focusWords: ['she', 'works'] }),
    thirdStep({ id: 'third_s_easy_002', order: 2, difficulty: 'easy', targetSkill: 'basic_third_person_s', sentence: 'He ___ near the station.', translation: tri('Он живет возле станции.', 'Він живе біля станції.', 'Él vive cerca de la estación.'), options: ['live', 'lives', 'living', 'is live'], correctAnswer: 'lives', correctFeedback: tri('Да. He требует -s: lives.', 'Так. He потребує -s: lives.', 'Sí. He necesita -s: lives.'), wrong: { live: tri('Live подходит для I/you/we/they. С he нужно lives.', 'Live підходить для I/you/we/they. З he потрібно lives.', 'Live va con I/you/we/they. Con he necesitamos lives.'), living: tri('Living требует is. Здесь обычное утверждение: He lives.', 'Living потребує is. Тут звичайне ствердження: He lives.', 'Living necesita is. Aquí es afirmación normal: He lives.'), 'is live': tri('Is live неправильно. С be было бы is living, но здесь lives.', 'Is live неправильно. З be було б is living, але тут lives.', 'Is live es incorrecto. Con be sería is living, pero aquí lives.') }, retry: [tri('He = lives, не live.', 'He = lives, не live.', 'He = lives, no live.'), tri('He lives.', 'He lives.', 'He lives.'), tri('Подсказка: He lives near the station.', 'Підказка: He lives near the station.', 'Pista: He lives near the station.')], focusWords: ['he', 'lives'] }),
    thirdStep({ id: 'third_s_easy_003', order: 3, difficulty: 'easy', targetSkill: 'basic_third_person_s', sentence: 'It ___ too much.', translation: tri('Это стоит слишком дорого.', 'Це коштує занадто дорого.', 'Cuesta demasiado.'), options: ['cost', 'costs', 'costing', 'does cost'], correctAnswer: 'costs', correctFeedback: tri('Да. It требует -s: costs.', 'Так. It потребує -s: costs.', 'Sí. It necesita -s: costs.'), wrong: { cost: tri('Cost без -s подходит после does или с they/we/you/I. Здесь it в утверждении, поэтому costs.', 'Cost без -s підходить після does або з they/we/you/I. Тут it у ствердженні, тому costs.', 'Cost sin -s va después de does o con they/we/you/I. Aquí it está en afirmación, por eso costs.'), costing: tri('Costing нужен в другой структуре: It is costing. Здесь It costs.', 'Costing потрібен в іншій структурі: It is costing. Тут It costs.', 'Costing necesita otra estructura: It is costing. Aquí It costs.'), 'does cost': tri('Does cost возможно для усиления, но обычный вариант: It costs.', 'Does cost можливе для підсилення, але звичайний варіант: It costs.', 'Does cost puede ser énfasis, pero la opción normal es It costs.') }, retry: [tri('It = добавь -s.', 'It = додай -s.', 'It = añade -s.'), tri('Cost -> costs.', 'Cost -> costs.', 'Cost -> costs.'), tri('Подсказка: It costs too much.', 'Підказка: It costs too much.', 'Pista: It costs too much.')], focusWords: ['it', 'costs'] }),
    thirdStep({ id: 'third_s_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'plural_subject_base', sentence: 'They ___ from home.', translation: tri('Они работают из дома.', 'Вони працюють з дому.', 'Ellos trabajan desde casa.'), options: ['work', 'works', 'working', 'does work'], correctAnswer: 'work', correctFeedback: tri('Да. They не получает -s: work.', 'Так. They не отримує -s: work.', 'Sí. They no recibe -s: work.'), wrong: { works: tri('Works нужен с he/she/it. They = plural, поэтому work.', 'Works потрібен з he/she/it. They = plural, тому work.', 'Works va con he/she/it. They = plural, por eso work.'), working: tri('Форма с -ing требует are. Здесь обычное утверждение про they, поэтому действие остается простым.', 'Форма з -ing потребує are. Тут звичайне ствердження про they, тому дія залишається простою.', 'Working necesita are: They are working. Aquí They work.'), 'does work': tri('Does используется с he/she/it. С they обычное утверждение: They work.', 'Does використовується з he/she/it. З they звичайне ствердження: They work.', 'Does se usa con he/she/it. Con they la afirmación normal es They work.') }, retry: [tri('They = без -s.', 'They = без -s.', 'They = sin -s.'), tri('They work.', 'They work.', 'They work.'), tri('Подсказка: They work from home.', 'Підказка: They work from home.', 'Pista: They work from home.')], focusWords: ['they', 'work'] }),
    thirdStep({ id: 'third_s_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'third_person_s_vs_plural', sentence: 'My sister ___ in a hospital.', translation: tri('Моя сестра работает в больнице.', 'Моя сестра працює в лікарні.', 'Mi hermana trabaja en un hospital.'), options: ['work', 'works', 'working', 'do work'], correctAnswer: 'works', correctFeedback: tri('Да. My sister = she. Нужен works.', 'Так. My sister = she. Потрібно works.', 'Sí. My sister = she. Necesitamos works.'), wrong: { work: tri('My sister = she. В утверждении нужен works, не work.', 'My sister = she. У ствердженні потрібно works, не work.', 'My sister = she. En afirmación necesitamos works, no work.'), working: tri('Working требует is. Здесь My sister works.', 'Working потребує is. Тут My sister works.', 'Working necesita is. Aquí My sister works.'), 'do work': tri('Do work не подходит для обычного утверждения с my sister. Нужно works.', 'Do work не підходить для звичайного ствердження з my sister. Потрібно works.', 'Do work no encaja con my sister en afirmación normal. Necesitamos works.') }, retry: [tri('My sister = she.', 'My sister = she.', 'My sister = she.'), tri('Sister -> she -> works.', 'Sister -> she -> works.', 'Sister -> she -> works.'), tri('Подсказка: My sister works.', 'Підказка: My sister works.', 'Pista: My sister works.')], focusWords: ['sister', 'works'] }),
    thirdStep({ id: 'third_s_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'plural_subject_base', sentence: 'My friends ___ English well.', translation: tri('Мои друзья хорошо говорят по-английски.', 'Мої друзі добре говорять англійською.', 'Mis amigos hablan bien inglés.'), options: ['speak', 'speaks', 'speaking', 'does speak'], correctAnswer: 'speak', correctFeedback: tri('Да. My friends = they. Нужен speak.', 'Так. My friends = they. Потрібно speak.', 'Sí. My friends = they. Necesitamos speak.'), wrong: { speaks: tri('Speaks нужен с he/she/it. Но friends — это несколько людей, поэтому действие остается простым.', 'Speaks потрібен з he/she/it. Але friends — це кілька людей, тому дія залишається простою.', 'Speaks va con he/she/it. My friends es plural, por eso speak.'), speaking: tri('Speaking требует are. Здесь общий факт: speak.', 'Speaking потребує are. Тут загальний факт: speak.', 'Speaking necesita are. Aquí es hecho general: speak.'), 'does speak': tri('Does не используется с my friends. Нужен speak.', 'Does не використовується з my friends. Потрібно speak.', 'Does no se usa con my friends. Necesitamos speak.') }, retry: [tri('Friends = they.', 'Friends = they.', 'Friends = they.'), tri('Несколько людей = без -s.', 'Кілька людей = без -s.', 'Plural subject = sin -s.'), tri('Подсказка: My friends speak English.', 'Підказка: My friends speak English.', 'Pista: My friends speak English.')], focusWords: ['friends', 'speak'] }),
    thirdStep({ id: 'third_s_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'es_ending', sentence: 'He ___ to the gym every morning.', translation: tri('Он ходит в спортзал каждое утро.', 'Він ходить у спортзал щоранку.', 'Él va al gimnasio cada mañana.'), options: ['go', 'goes', 'gos', 'going'], correctAnswer: 'goes', correctFeedback: tri('Да. Go с he становится goes.', 'Так. Go з he стає goes.', 'Sí. Go con he se vuelve goes.'), wrong: { go: tri('Go подходит для I/you/we/they. С he нужно goes.', 'Go підходить для I/you/we/they. З he потрібно goes.', 'Go va con I/you/we/they. Con he necesitamos goes.'), gos: tri('Gos неправильная форма. У go форма third person singular - goes.', 'Gos неправильна форма. У go форма third person singular - goes.', 'Gos es incorrecto. La forma third person singular de go es goes.'), going: tri('Going требует is. Здесь привычка every morning: goes.', 'Going потребує is. Тут звичка every morning: goes.', 'Going necesita is. Aquí es hábito every morning: goes.') }, retry: [tri('Go + he = goes.', 'Go + he = goes.', 'Go + he = goes.'), tri('После -o часто -es.', 'Після -o часто -es.', 'Después de -o muchas veces -es.'), tri('Подсказка: He goes to the gym.', 'Підказка: He goes to the gym.', 'Pista: He goes to the gym.')], focusWords: ['he', 'goes'] }),
    thirdStep({ id: 'third_s_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'es_ending', sentence: 'She ___ TV after work.', translation: tri('Она смотрит телевизор после работы.', 'Вона дивиться телевізор після роботи.', 'Ella ve la tele después del trabajo.'), options: ['watch', 'watchs', 'watches', 'watching'], correctAnswer: 'watches', correctFeedback: tri('Да. Watch заканчивается на -ch, поэтому watches.', 'Так. Watch закінчується на -ch, тому watches.', 'Sí. Watch termina en -ch, por eso watches.'), wrong: { watch: tri('Watch без окончания подходит для I/you/we/they. С she нужно watches.', 'Watch без закінчення підходить для I/you/we/they. З she потрібно watches.', 'Watch sin terminación va con I/you/we/they. Con she necesitamos watches.'), watchs: tri('Watchs неправильно. После -ch добавляем -es: watches.', 'Watchs неправильно. Після -ch додаємо -es: watches.', 'Watchs es incorrecto. Después de -ch añadimos -es: watches.'), watching: tri('Watching требует is. Здесь привычное действие: watches.', 'Watching потребує is. Тут звична дія: watches.', 'Watching necesita is. Aquí es acción habitual: watches.') }, retry: [tri('Watch + she = watches.', 'Watch + she = watches.', 'Watch + she = watches.'), tri('После -ch: -es.', 'Після -ch: -es.', 'Después de -ch: -es.'), tri('Подсказка: She watches TV.', 'Підказка: She watches TV.', 'Pista: She watches TV.')], focusWords: ['she', 'watches'] }),
    thirdStep({ id: 'third_s_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'ies_ending', sentence: 'My daughter ___ English at school.', translation: tri('Моя дочь учит английский в школе.', 'Моя донька вчить англійську в школі.', 'Mi hija estudia inglés en la escuela.'), options: ['study', 'studys', 'studies', 'studying'], correctAnswer: 'studies', correctFeedback: tri('Да. Daughter = she. Study -> studies.', 'Так. Daughter = she. Study -> studies.', 'Sí. Daughter = she. Study -> studies.'), wrong: { study: tri('Study подходит для I/you/we/they. Daughter = she, поэтому studies.', 'Study підходить для I/you/we/they. Daughter = she, тому studies.', 'Study va con I/you/we/they. Daughter = she, por eso studies.'), studys: tri('Studys неправильно. После согласной и y хвост меняется на ies: studies.', 'Studys неправильно. Після приголосної та y хвіст змінюється на ies: studies.', 'Studys es incorrecto. Consonant + y cambia a ies: studies.'), studying: tri('Форма с -ing требует is. Здесь обычное утверждение, поэтому нужен вариант studies.', 'Форма з -ing потребує is. Тут звичайне ствердження, тому потрібен варіант studies.', 'Studying necesita is. Aquí es Present Simple: studies.') }, retry: [tri('Daughter = she.', 'Daughter = she.', 'Daughter = she.'), tri('Study -> studies.', 'Study -> studies.', 'Study -> studies.'), tri('Подсказка: My daughter studies English.', 'Підказка: My daughter studies English.', 'Pista: My daughter studies English.')], focusWords: ['daughter', 'studies'] }),
    thirdStep({ id: 'third_s_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'have_has', sentence: 'He ___ a new car.', translation: tri('У него есть новая машина.', 'У нього є нова машина.', 'Él tiene un coche nuevo.'), options: ['have', 'has', 'haves', 'having'], correctAnswer: 'has', correctFeedback: tri('Да. Have с he/she/it становится has.', 'Так. Have з he/she/it стає has.', 'Sí. Have con he/she/it se vuelve has.'), wrong: { have: tri('Have подходит для I/you/we/they. С he нужна форма has.', 'Have підходить для I/you/we/they. З he потрібна форма has.', 'Have va con I/you/we/they. Con he necesitamos has.'), haves: tri('Haves неправильно. У have особая форма: has.', 'Haves неправильно. У have особлива форма: has.', 'Haves es incorrecto. Have tiene forma especial: has.'), having: tri('Having здесь не подходит. Нужно He has.', 'Having тут не підходить. Потрібно He has.', 'Having no encaja aquí. Necesitamos He has.') }, retry: [tri('He + have = has.', 'He + have = has.', 'He + have = has.'), tri('He has.', 'He has.', 'He has.'), tri('Подсказка: He has a new car.', 'Підказка: He has a new car.', 'Pista: He has a new car.')], focusWords: ['he', 'has'] }),
    thirdStep({ id: 'third_s_mixed_002', order: 11, difficulty: 'mixed_review', targetSkill: 'does_boundary_no_s', sentence: 'Does she ___ English?', translation: tri('Она учит английский?', 'Вона вчить англійську?', 'Ella estudia inglés?'), options: ['study', 'studies', 'studys', 'studying'], correctAnswer: 'study', correctFeedback: tri('Да. После does основной глагол возвращается в base form: study.', 'Так. Після does основне дієслово повертається в base form: study.', 'Sí. Después de does el verbo vuelve a base form: study.'), wrong: { studies: tri('Studies правильно в утверждении: She studies. Но после does нужно study.', 'Studies правильно у ствердженні: She studies. Але після does потрібно study.', 'Studies es correcto en afirmación: She studies. Pero después de does necesitamos study.'), studys: tri('Studys неправильная форма, а после does нужен простой study.', 'Studys неправильна форма, а після does потрібне просте study.', 'Studys es forma incorrecta y después de does necesitamos study simple.'), studying: tri('После does не ставим -ing. Правильно: Does she study?', 'Після does не ставимо -ing. Правильно: Does she study?', 'Después de does no ponemos -ing. Correcto: Does she study?') }, retry: [tri('После does - без -s.', 'Після does - без -s.', 'Después de does - sin -s.'), tri('She studies, но Does she study?', 'She studies, але Does she study?', 'She studies, pero Does she study?'), tri('Подсказка: Does she study English?', 'Підказка: Does she study English?', 'Pista: Does she study English?')], focusWords: ['does', 'study'] }),
    thirdStep({ id: 'third_s_mixed_003', order: 12, difficulty: 'mixed_review', targetSkill: 'mixed_es_ies_has_review', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.', 'Elige la oración correcta.'), options: ['She study and has a job.', 'She studies and has a job.', 'She studies and have a job.', 'She studys and haves a job.'], correctAnswer: 'She studies and has a job.', correctFeedback: tri('Да. She требует studies и has.', 'Так. She потребує studies і has.', 'Sí. She necesita studies y has.'), wrong: { 'She study and has a job.': tri('Has правильный, но study должен стать studies.', 'Has правильний, але study має стати studies.', 'Has está bien, pero study debe convertirse en studies.'), 'She studies and have a job.': tri('Studies правильный, но have с she должен стать has.', 'Studies правильний, але have з she має стати has.', 'Studies está bien, pero have con she debe ser has.'), 'She studys and haves a job.': tri('Обе формы неправильные: study -> studies, have -> has.', 'Обидві форми неправильні: study -> studies, have -> has.', 'Las dos formas son incorrectas: study -> studies, have -> has.') }, retry: [tri('She + study = studies.', 'She + study = studies.', 'She + study = studies.'), tri('She + have = has.', 'She + have = has.', 'She + have = has.'), tri('Подсказка: She studies and has a job.', 'Підказка: She studies and has a job.', 'Pista: She studies and has a job.')], focusWords: ['studies', 'has'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['missing_third_person_s', 'wrong_s_with_plural_subject', 'es_ending_error', 'ies_ending_error', 'have_has_error', 'does_question_confusion'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем, кто делает действие, и какая форма нужна.', 'Звичайне пояснення: показуємо, хто робить дію, і яка форма потрібна.', 'Explicación normal: mostramos subject y forma del verbo.'),
    depth2: tri('Проще: делим на he/she/it и все остальные варианты.', 'Простіше: ділимо на he/she/it і всі інші варіанти.', 'Más simple: dividimos subject en he/she/it y todos los demás.'),
    depth3: tri('Еще проще: с I действие простое, с she появляется хвост -s.', 'Ще простіше: з I дія проста, з she зʼявляється хвіст -s.', 'Aún más simple: I work / she works.'),
    depth4: tri('Почти подсказка: прямо указываем, нужен ли -s.', 'Майже підказка: прямо вказуємо, чи потрібна -s.', 'Casi pista: indicamos directamente si hace falta -s.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Остановись. Сначала найди, кто делает действие. He/she/it или один предмет в утверждении = нужен хвост -s/-es. I/you/we/they или несколько людей/вещей = действие простое.', 'Зупинись. Спочатку знайди, хто робить дію. He/she/it або один предмет у ствердженні = потрібен хвіст -s/-es. I/you/we/they або кілька людей/речей = дія проста.', 'Detente. Primero encuentra el subject. He/she/it o una cosa singular en afirmación = -s/-es. I/you/we/they o plural = base verb.') },
    afterThreeWrongInSameExercise: { action: 'show_subject_group_hint_then_retry', card: tri('Подсказка: система покажет, кто делает действие, но не выберет форму за пользователя.', 'Підказка: система покаже, хто робить дію, але не вибере форму за користувача.', 'Pista de subject: el sistema mostrará el grupo del subject, pero no elegirá la forma.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Режим подсказки: сначала выбери, кто делает действие. Потом вернемся к форме глагола.', 'Режим підказки: спочатку обери, хто робить дію. Потім повернемося до форми дієслова.', 'Modo guiado: primero elige el grupo del subject. Luego volvemos a la forma del verbo.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_third_s_001', prompt: tri('She относится к группе he/she/it или I/you/we/they?', 'She належить до групи he/she/it чи I/you/we/they?', 'She pertenece al grupo he/she/it o I/you/we/they?'), options: ['he/she/it', 'I/you/we/they'], correctIndex: 0, thenReturnToExerciseId: 'third_s_easy_001' },
      { id: 'guided_third_s_002', prompt: tri('They требует глагол с -s в утверждении?', 'They потребує дієслово з -s у ствердженні?', 'They necesita verbo con -s en afirmación?'), options: ['да', 'нет'], correctIndex: 1, thenReturnToExerciseId: 'third_s_contrast_001' },
      { id: 'guided_third_s_003', prompt: tri('My sister можно заменить на she?', 'My sister можна замінити на she?', 'My sister se puede reemplazar por she?'), options: ['да', 'нет'], correctIndex: 0, thenReturnToExerciseId: 'third_s_contrast_002' },
      { id: 'guided_third_s_004', prompt: tri('После does основной глагол должен быть с -s?', 'Після does основне дієслово має бути з -s?', 'Después de does, el verbo principal debe tener -s?'), options: ['да', 'нет'], correctIndex: 1, thenReturnToExerciseId: 'third_s_mixed_002' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'verb_third_person',
    diagnosisLabel: tri('He / She / It + -s', 'He / She / It + -s', 'He / She / It + -s'),
    contrastSet: ['base verb', 'verb+s', 'verb+es', 'has', 'does'],
    focusWords: ['works', 'goes', 'studies', 'has'],
    focusPatterns: ['basic_third_person_s', 'plural_subject_base', 'third_person_s_vs_plural', 'es_ending', 'ies_ending', 'have_has', 'does_boundary_no_s', 'mixed_es_ies_has_review'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_verb_third_person_start',
    answer: 'diagnosis_training_verb_third_person_answer',
    mastery: 'diagnosis_training_verb_third_person_mastery',
    fallback: 'diagnosis_training_verb_third_person_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'verb', microDiagnosisId: 'verb_third_person', contrastSet: ['base verb', 'verb+s', 'verb+es', 'has', 'does'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logSubjectGroup: true, logVerbForm: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=verb_third_person',
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


