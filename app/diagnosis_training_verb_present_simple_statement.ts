import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk: string, es: string): TriText => ({ ru, uk, es });

const CONTRAST = ['base verb', 'verb+s', 'habit', 'fact', 'routine', 'schedule', 'present continuous'];

function retry(line: string): [TriText, TriText, TriText, TriText] {
  return [
    tri(line, line, line),
    tri('Ask: is it normally true, or happening right now?', 'Ask: is it normally true, or happening right now?', 'Pregunta: pasa normalmente o ahora mismo?'),
    tri('Blocks: I work every day / She works every day.', 'Blocks: I work every day / She works every day.', 'Bloques: I work every day / She works every day.'),
    tri('Hint: choose base verb or verb+s from the subject.', 'Hint: choose base verb or verb+s from the subject.', 'Pista: elige base verb o verb+s por el subject.'),
  ];
}

function baseWrong(correct: string): Record<string, TriText> {
  const msg = (option: string) => tri(
    `${option} ne podhodit. Nuzhno ${correct}: Present Simple statement uses base verb with I/you/we/they and verb+s with he/she/it.`,
    `${option} ne pidkhodyt. Potribno ${correct}: Present Simple statement uses base verb with I/you/we/they and verb+s with he/she/it.`,
    `${option} no encaja. Necesitamos ${correct}: Present Simple statement usa base verb con I/you/we/they y verb+s con he/she/it.`,
  );
  return Object.fromEntries([
    'work', 'works', 'am work', 'working',
    'live', 'lives', 'are live', 'living',
    'eat', 'eats', 'are eat', 'eating',
    'like', 'likes', 'is like', 'liking', 'is liking',
    'go', 'goes', 'is go', 'going',
    'study', 'studies', 'studys', 'is study',
    'open', 'opens', 'is open', 'opening',
    'freeze', 'freezes', 'is freeze', 'freezing',
  ].map((option) => [option, msg(option)]));
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
  focusWords: string[];
}): DiagnosisTrainingStep {
  const wrongFeedback = { ...baseWrong(input.correctAnswer), ...(input.wrong ?? {}) };
  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: input.translation,
    explanationBlock: tri(
      'Present Simple statements describe habits, facts, schedules, and stable states. Do not add be before a normal verb.',
      'Present Simple statements describe habits, facts, schedules, and stable states. Do not add be before a normal verb.',
      'Present Simple statements describen habitos, hechos, horarios y estados estables. No anadas be antes de un verbo normal.',
    ),
    microTask: tri('Choose the correct Present Simple statement form.', 'Choose the correct Present Simple statement form.', 'Elige la forma correcta de Present Simple statement.'),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, wrongFeedback[option] ?? tri(
        `Not this form. Use ${input.correctAnswer}: habit/fact/schedule uses Present Simple.`,
        `Not this form. Use ${input.correctAnswer}: habit/fact/schedule uses Present Simple.`,
        `No esta forma. Usa ${input.correctAnswer}: habit/fact/schedule usa Present Simple.`,
      )])),
    retryFeedback: retry(input.retryLine),
    fallbackExplanation: tri(
      'I/you/we/they + base verb. He/she/it + verb+s. Every day, usually, always, and schedules usually point to Present Simple.',
      'I/you/we/they + base verb. He/she/it + verb+s. Every day, usually, always, and schedules usually point to Present Simple.',
      'I/you/we/they + base verb. He/she/it + verb+s. Every day, usually, always y horarios apuntan a Present Simple.',
    ),
    focusWords: input.focusWords,
  };
}

export const VERB_PRESENT_SIMPLE_STATEMENT_TRAINING: DiagnosisTraining = {
  id: 'verb_present_simple_statement',
  category: 'verb',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 22,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('Present Simple: obychnye fakty i privychki', 'Present Simple: zvychaini fakty i zvychky', 'Present Simple: hechos y habitos'),
  shortTitle: tri('Present Simple Statements', 'Present Simple Statements', 'Present Simple Statements'),
  shortDiagnosis: tri('Ty putaesh Present Simple v utverzhdeniyah.', 'Ty plutaiesh Present Simple u stverdzhenniakh.', 'Confundes Present Simple en afirmaciones.'),
  diagnosisText: tri(
    'Ty putaesh Present Simple statements: habit/fact/schedule vs action now, and forget he/she/it verb+s.',
    'Ty plutaiesh Present Simple statements: habit/fact/schedule vs action now, and forget he/she/it verb+s.',
    'Confundes Present Simple statements: habit/fact/schedule vs accion ahora, y olvidas he/she/it verb+s.',
  ),
  mentalModel: tri(
    'Present Simple = ordinary truth, habit, schedule, stable fact. I work, you work, we work, they work. But he/she/it works.',
    'Present Simple = ordinary truth, habit, schedule, stable fact. I work, you work, we work, they work. But he/she/it works.',
    'Present Simple = verdad habitual, habito, horario, hecho estable. I work, you work, we work, they work. Pero he/she/it works.',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'I/you/we/they + base verb: I work. He/she/it + verb+s: She works. Signals: every day, usually, often, always, on Mondays.',
    'I/you/we/they + base verb: I work. He/she/it + verb+s: She works. Signals: every day, usually, often, always, on Mondays.',
    'I/you/we/they + base verb: I work. He/she/it + verb+s: She works. Senales: every day, usually, often, always, on Mondays.',
  ),
  whatUserMustLearn: {
    ru: ['Present Simple for habits: I drink coffee every morning.', 'Present Simple for facts: Water boils.', 'Present Simple for schedules: The bus leaves at 8.', 'I/you/we/they use base verb.', 'He/she/it uses -s/-es in statements.', 'Every day/usually/often/always often signal Present Simple.', 'Do not add be before a normal verb.', 'Do not use -ing for a habit without be/action-now context.', 'Present Simple does not always mean right now.', 'For work, habits, likes, schedules, stable states, use Present Simple.'],
    uk: ['Present Simple for habits: I drink coffee every morning.', 'Present Simple for facts: Water boils.', 'Present Simple for schedules: The bus leaves at 8.', 'I/you/we/they use base verb.', 'He/she/it uses -s/-es in statements.', 'Every day/usually/often/always often signal Present Simple.', 'Do not add be before a normal verb.', 'Do not use -ing for a habit without be/action-now context.', 'Present Simple does not always mean right now.', 'For work, habits, likes, schedules, stable states, use Present Simple.'],
    es: ['Present Simple para habitos: I drink coffee every morning.', 'Present Simple para hechos: Water boils.', 'Present Simple para horarios: The bus leaves at 8.', 'I/you/we/they usan base verb.', 'He/she/it usa -s/-es en afirmaciones.', 'Every day/usually/often/always senalan Present Simple.', 'No anadas be antes de verbo normal.', 'No uses -ing para habito sin be/contexto de ahora.', 'Present Simple no siempre significa ahora mismo.', 'Para trabajo, habitos, gustos, horarios, estados estables, usa Present Simple.'],
  },
  examples: [
    { en: 'I work every day.', ru: 'Ya rabotayu kazhdy den.', uk: 'Ya pratsiuiu shchodnia.', es: 'Trabajo todos los dias.', why: tri('Every day = habit. With I use base verb: work.', 'Every day = habit. With I use base verb: work.', 'Every day = habito. Con I usa base verb: work.') },
    { en: 'She works every day.', ru: 'Ona rabotaet kazhdy den.', uk: 'Vona pratsiuie shchodnia.', es: 'Ella trabaja todos los dias.', why: tri('She needs -s in a Present Simple statement: works.', 'She needs -s in a Present Simple statement: works.', 'She necesita -s en afirmacion Present Simple: works.') },
    { en: 'They live in Dublin.', ru: 'Oni zhivut v Dublin.', uk: 'Vony zhyvut u Dublini.', es: 'Viven en Dublin.', why: tri('Stable fact. They uses base verb: live.', 'Stable fact. They uses base verb: live.', 'Hecho estable. They usa base verb: live.') },
    { en: 'He likes coffee.', ru: 'On lyubit coffee.', uk: 'Vin liubyt kavu.', es: 'Le gusta el cafe.', why: tri('Like describes stable taste. He needs likes.', 'Like describes stable taste. He needs likes.', 'Like describe gusto estable. He necesita likes.') },
    { en: 'The shop opens at 9.', ru: 'Magazin otkryvaetsya v 9.', uk: 'Mahazyn vidkryvaietsia o 9.', es: 'La tienda abre a las 9.', why: tri('Schedule uses Present Simple. The shop = it, so opens.', 'Schedule uses Present Simple. The shop = it, so opens.', 'Horario usa Present Simple. The shop = it, por eso opens.') },
    { en: 'Water freezes at 0°C.', ru: 'Voda zamerzaet pri 0C.', uk: 'Voda zamerzaie pry 0C.', es: 'El agua se congela a 0C.', why: tri('General fact. Water = it, so freezes.', 'General fact. Water = it, so freezes.', 'Hecho general. Water = it, por eso freezes.') },
    { en: 'We usually eat at home.', ru: 'My obychno edim doma.', uk: 'My zazvychai yimo vdoma.', es: 'Normalmente comemos en casa.', why: tri('Usually = habit. We uses base verb: eat.', 'Usually = habit. We uses base verb: eat.', 'Usually = habito. We usa base verb: eat.') },
    { en: 'My brother studies English.', ru: 'Moi brat uchit English.', uk: 'Mii brat vchyt English.', es: 'Mi hermano estudia ingles.', why: tri('My brother = he. Study changes to studies.', 'My brother = he. Study changes to studies.', 'My brother = he. Study cambia a studies.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('You may be adding be or -ing where English wants ordinary Present Simple.', 'You may be adding be or -ing where English wants ordinary Present Simple.', 'Puede que anadas be o -ing donde English quiere Present Simple normal.') },
    { id: 'intro_rule', type: 'rule', text: tri('Formula: I/you/we/they work. He/she/it works.', 'Formula: I/you/we/they work. He/she/it works.', 'Formula: I/you/we/they work. He/she/it works.') },
    { id: 'intro_warning', type: 'warning', text: tri('Do not say I am work or I working every day. For a habit: I work every day.', 'Do not say I am work or I working every day. For a habit: I work every day.', 'No digas I am work ni I working every day. Para habito: I work every day.') },
  ],
  steps: [
    psStep({ id: 'ps_statement_easy_001', order: 1, difficulty: 'easy', targetSkill: 'habit_base_i', sentence: 'I ___ every day.', translation: tri('Ya rabotayu kazhdy den.', 'Ya pratsiuiu shchodnia.', 'Trabajo todos los dias.'), options: ['work', 'works', 'am work', 'working'], correctAnswer: 'work', correctFeedback: tri('Yes. Every day shows habit. With I use base verb: work.', 'Yes. Every day shows habit. With I use base verb: work.', 'Si. Every day muestra habito. Con I usamos base verb: work.'), wrong: { works: tri('Works is for he/she/it. With I use work.', 'Works is for he/she/it. With I use work.', 'Works va con he/she/it. Con I usamos work.'), 'am work': tri('I am work is incorrect. Do not put am before the normal verb work. Say I work.', 'I am work is incorrect. Do not put am before the normal verb work. Say I work.', 'I am work es incorrecto. No pongas am antes de work. Di I work.'), working: tri('Working needs be for action now: I am working. For habit every day use I work.', 'Working needs be for action now: I am working. For habit every day use I work.', 'Working necesita be para accion ahora: I am working. Para habito every day usa I work.') }, retryLine: 'Every day = habit. I + work.', focusWords: ['I', 'work'] }),
    psStep({ id: 'ps_statement_easy_002', order: 2, difficulty: 'easy', targetSkill: 'habit_base_they', sentence: 'They ___ in Dublin.', translation: tri('Oni zhivut v Dublin.', 'Vony zhyvut u Dublini.', 'Viven en Dublin.'), options: ['live', 'lives', 'are live', 'living'], correctAnswer: 'live', correctFeedback: tri('Yes. They uses base verb: live.', 'Yes. They uses base verb: live.', 'Si. They usa base verb: live.'), wrong: { lives: tri('Lives is for he/she/it. They needs live.', 'Lives is for he/she/it. They needs live.', 'Lives va con he/she/it. They necesita live.'), 'are live': tri('Are live is incorrect. With normal verb live, do not add are. Say They live.', 'Are live is incorrect. With normal verb live, do not add are. Say They live.', 'Are live es incorrecto. Con verbo normal live no anadas are. Di They live.'), living: tri('Living without are is incorrect. For stable residence, use They live.', 'Living without are is incorrect. For stable residence, use They live.', 'Living sin are es incorrecto. Para residencia estable usa They live.') }, retryLine: 'They = live. No -s.', focusWords: ['they', 'live'] }),
    psStep({ id: 'ps_statement_easy_003', order: 3, difficulty: 'easy', targetSkill: 'habit_base_we', sentence: 'We usually ___ at home.', translation: tri('My obychno edim doma.', 'My zazvychai yimo vdoma.', 'Normalmente comemos en casa.'), options: ['eat', 'eats', 'are eat', 'eating'], correctAnswer: 'eat', correctFeedback: tri('Yes. Usually shows habit. We uses base verb: eat.', 'Yes. Usually shows habit. We uses base verb: eat.', 'Si. Usually muestra habito. We usa base verb: eat.'), wrong: { eats: tri('Eats is for he/she/it. We needs eat.', 'Eats is for he/she/it. We needs eat.', 'Eats va con he/she/it. We necesita eat.'), 'are eat': tri('Are eat is incorrect. In Present Simple say We eat.', 'Are eat is incorrect. In Present Simple say We eat.', 'Are eat es incorrecto. En Present Simple decimos We eat.'), eating: tri('Eating without are is incorrect. Usually shows habit, so We usually eat.', 'Eating without are is incorrect. Usually shows habit, so We usually eat.', 'Eating sin are es incorrecto. Usually muestra habito: We usually eat.') }, retryLine: 'Usually = habit. We + eat.', focusWords: ['usually', 'eat'] }),
    psStep({ id: 'ps_statement_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'third_person_s_likes', sentence: 'He ___ coffee.', translation: tri('On lyubit coffee.', 'Vin liubyt kavu.', 'Le gusta el cafe.'), options: ['like', 'likes', 'is like', 'liking'], correctAnswer: 'likes', correctFeedback: tri('Yes. He needs -s in a Present Simple statement: likes.', 'Yes. He needs -s in a Present Simple statement: likes.', 'Si. He necesita -s en Present Simple statement: likes.'), wrong: { like: tri('Like without -s is for I/you/we/they. With he use likes.', 'Like without -s is for I/you/we/they. With he use likes.', 'Like sin -s va con I/you/we/they. Con he usa likes.'), 'is like': tri('Is like can mean resembles in another structure. For taste, say He likes.', 'Is like can mean resembles in another structure. For taste, say He likes.', 'Is like puede significar se parece a. Para gusto, di He likes.'), liking: tri('Liking does not fit here. Stable taste uses Present Simple: likes.', 'Liking does not fit here. Stable taste uses Present Simple: likes.', 'Liking no encaja. Gusto estable usa Present Simple: likes.') }, retryLine: 'He + verb+s. He likes.', focusWords: ['he', 'likes'] }),
    psStep({ id: 'ps_statement_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'third_person_es_goes', sentence: 'She ___ to the gym every morning.', translation: tri('Ona hodit v gym kazhdoe utro.', 'Vona khodyt u gym shchoranku.', 'Ella va al gimnasio cada manana.'), options: ['go', 'goes', 'is go', 'going'], correctAnswer: 'goes', correctFeedback: tri('Yes. She needs third person form. Go becomes goes.', 'Yes. She needs third person form. Go becomes goes.', 'Si. She necesita third person form. Go se vuelve goes.'), wrong: { go: tri('Go is for I/you/we/they. With she use goes.', 'Go is for I/you/we/they. With she use goes.', 'Go va con I/you/we/they. Con she usa goes.'), 'is go': tri('Is go is incorrect. For habit every morning use She goes.', 'Is go is incorrect. For habit every morning use She goes.', 'Is go es incorrecto. Para habito every morning usa She goes.'), going: tri('Going without is is incorrect, and every morning needs Present Simple: goes.', 'Going without is is incorrect, and every morning needs Present Simple: goes.', 'Going sin is es incorrecto, y every morning necesita Present Simple: goes.') }, retryLine: 'She + go = goes.', focusWords: ['she', 'goes'] }),
    psStep({ id: 'ps_statement_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'third_person_ies_studies', sentence: 'My brother ___ English.', translation: tri('Moi brat uchit English.', 'Mii brat vchyt English.', 'Mi hermano estudia ingles.'), options: ['study', 'studies', 'studys', 'is study'], correctAnswer: 'studies', correctFeedback: tri('Yes. My brother = he. Study becomes studies.', 'Yes. My brother = he. Study becomes studies.', 'Si. My brother = he. Study se vuelve studies.'), wrong: { study: tri('Study is for I/you/we/they. My brother = he, so studies.', 'Study is for I/you/we/they. My brother = he, so studies.', 'Study va con I/you/we/they. My brother = he, por eso studies.'), studys: tri('Studys is incorrect. Study ends in consonant + y, so studies.', 'Studys is incorrect. Study ends in consonant + y, so studies.', 'Studys es incorrecto. Study termina en consonant + y, por eso studies.'), 'is study': tri('Is study is incorrect. In Present Simple say My brother studies.', 'Is study is incorrect. In Present Simple say My brother studies.', 'Is study es incorrecto. En Present Simple di My brother studies.') }, retryLine: 'Brother = he. Study -> studies.', focusWords: ['brother', 'studies'] }),
    psStep({ id: 'ps_statement_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'no_be_with_main_verb', sentence: 'Choose the correct sentence.', translation: tri('Vyberi pravilnoe predlozhenie.', 'Obery pravylne rechennia.', 'Elige la oracion correcta.'), options: ['I work every day.', 'I am work every day.', 'I working every day.', 'I am works every day.'], correctAnswer: 'I work every day.', correctFeedback: tri('Yes. For habit every day use Present Simple: I work.', 'Yes. For habit every day use Present Simple: I work.', 'Si. Para habito every day usa Present Simple: I work.'), wrong: { 'I am work every day.': tri('Am does not go before normal verb work in Present Simple.', 'Am does not go before normal verb work in Present Simple.', 'Am no va antes del verbo normal work en Present Simple.'), 'I working every day.': tri('I working is incorrect. For a habit use I work.', 'I working is incorrect. For a habit use I work.', 'I working es incorrecto. Para habito usa I work.'), 'I am works every day.': tri('There is extra am and wrong works with I. Use I work.', 'There is extra am and wrong works with I. Use I work.', 'Sobra am y works es incorrecto con I. Usa I work.') }, retryLine: 'Habit: I work. No am, no -ing.', focusWords: ['I work'] }),
    psStep({ id: 'ps_statement_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'no_ing_for_habit', sentence: 'Choose the correct sentence.', translation: tri('Vyberi pravilnoe predlozhenie.', 'Obery pravylne rechennia.', 'Elige la oracion correcta.'), options: ['They play football on Sundays.', 'They playing football on Sundays.', 'They are play football on Sundays.', 'They plays football on Sundays.'], correctAnswer: 'They play football on Sundays.', correctFeedback: tri('Yes. On Sundays shows routine. They + base verb: play.', 'Yes. On Sundays shows routine. They + base verb: play.', 'Si. On Sundays muestra rutina. They + base verb: play.'), wrong: { 'They playing football on Sundays.': tri('They playing is incorrect. For routine on Sundays use They play.', 'They playing is incorrect. For routine on Sundays use They play.', 'They playing es incorrecto. Para rutina on Sundays usa They play.'), 'They are play football on Sundays.': tri('Are play is incorrect. Do not add are before normal verb in Present Simple.', 'Are play is incorrect. Do not add are before normal verb in Present Simple.', 'Are play es incorrecto. No anadas are antes de verbo normal en Present Simple.'), 'They plays football on Sundays.': tri('Plays is for he/she/it. They needs play.', 'Plays is for he/she/it. They needs play.', 'Plays va con he/she/it. They necesita play.') }, retryLine: 'They + play. On Sundays = habit.', focusWords: ['they play'] }),
    psStep({ id: 'ps_statement_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'unneeded_auxiliary_in_statement', sentence: 'Choose the correct sentence.', translation: tri('Vyberi pravilnoe predlozhenie.', 'Obery pravylne rechennia.', 'Elige la oracion correcta.'), options: ['We study English every evening.', 'We do study English every evening.', 'We are study English every evening.', 'We studies English every evening.'], correctAnswer: 'We study English every evening.', correctFeedback: tri('Yes. Normal Present Simple statement: We study.', 'Yes. Normal Present Simple statement: We study.', 'Si. Afirmacion normal de Present Simple: We study.'), wrong: { 'We do study English every evening.': tri('Do study can be strong emphasis, but normal statement here is We study.', 'Do study can be strong emphasis, but normal statement here is We study.', 'Do study puede ser enfasis fuerte, pero la afirmacion normal aqui es We study.'), 'We are study English every evening.': tri('Are study is incorrect. Use We study.', 'Are study is incorrect. Use We study.', 'Are study es incorrecto. Usa We study.'), 'We studies English every evening.': tri('Studies is for he/she/it. We needs study.', 'Studies is for he/she/it. We needs study.', 'Studies va con he/she/it. We necesita study.') }, retryLine: 'We + base verb. We study.', focusWords: ['we study'] }),
    psStep({ id: 'ps_statement_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'schedule_present_simple', sentence: 'The shop ___ at 9.', translation: tri('Magazin otkryvaetsya v 9.', 'Mahazyn vidkryvaietsia o 9.', 'La tienda abre a las 9.'), options: ['open', 'opens', 'is open', 'opening'], correctAnswer: 'opens', correctFeedback: tri('Yes. Schedule uses Present Simple. The shop = it, so opens.', 'Yes. Schedule uses Present Simple. The shop = it, so opens.', 'Si. Horario usa Present Simple. The shop = it, por eso opens.'), wrong: { open: tri('The shop = it. In Present Simple statement use opens.', 'The shop = it. In Present Simple statement use opens.', 'The shop = it. En Present Simple statement usa opens.'), 'is open': tri('Is open can mean the shop is open. But schedule of opening = opens at 9.', 'Is open can mean the shop is open. But schedule of opening = opens at 9.', 'Is open puede significar esta abierto. Pero horario de apertura = opens at 9.'), opening: tri('Opening without is is incorrect, and schedule needs Present Simple: opens.', 'Opening without is is incorrect, and schedule needs Present Simple: opens.', 'Opening sin is es incorrecto, y horario necesita Present Simple: opens.') }, retryLine: 'Schedule = Present Simple. Shop = it = opens.', focusWords: ['opens'] }),
    psStep({ id: 'ps_statement_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'fact_present_simple', sentence: 'Water ___ at 0°C.', translation: tri('Voda zamerzaet pri 0C.', 'Voda zamerzaie pry 0C.', 'El agua se congela a 0C.'), options: ['freeze', 'freezes', 'is freeze', 'freezing'], correctAnswer: 'freezes', correctFeedback: tri('Yes. This is a general fact. Water = it, so freezes.', 'Yes. This is a general fact. Water = it, so freezes.', 'Si. Es un hecho general. Water = it, por eso freezes.'), wrong: { freeze: tri('Water = it. In Present Simple statement use freezes.', 'Water = it. In Present Simple statement use freezes.', 'Water = it. En Present Simple statement usa freezes.'), 'is freeze': tri('Is freeze is incorrect. For a fact use simple verb freezes.', 'Is freeze is incorrect. For a fact use simple verb freezes.', 'Is freeze es incorrecto. Para hecho usa freezes.'), freezing: tri('Freezing without is is incorrect. For general fact use Present Simple: freezes.', 'Freezing without is is incorrect. For general fact use Present Simple: freezes.', 'Freezing sin is es incorrecto. Para hecho general usa Present Simple: freezes.') }, retryLine: 'Natural fact = Present Simple. Water freezes.', focusWords: ['water', 'freezes'] }),
    psStep({ id: 'ps_statement_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'state_verb_likes', sentence: 'She ___ this idea.', translation: tri('Ei nravitsya eta idea.', 'Yii podobaietsia tsia ideia.', 'A ella le gusta esta idea.'), options: ['like', 'likes', 'is liking', 'liking'], correctAnswer: 'likes', correctFeedback: tri('Yes. Like often describes stable attitude/taste. She needs likes.', 'Yes. Like often describes stable attitude/taste. She needs likes.', 'Si. Like describe actitud/gusto estable. She necesita likes.'), wrong: { like: tri('With she use verb+s: likes.', 'With she use verb+s: likes.', 'Con she usa verb+s: likes.'), 'is liking': tri('Is liking works only in special context. Normal taste/attitude = likes.', 'Is liking works only in special context. Normal taste/attitude = likes.', 'Is liking solo funciona en contexto especial. Gusto/actitud normal = likes.'), liking: tri('Liking without is is incorrect. Here use Present Simple: likes.', 'Liking without is is incorrect. Here use Present Simple: likes.', 'Liking sin is es incorrecto. Aqui usa Present Simple: likes.') }, retryLine: 'She + likes.', focusWords: ['she', 'likes'] }),
    psStep({ id: 'ps_statement_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_subject_forms', sentence: 'Choose the correct pair.', translation: tri('Vyberi pravilnuyu paru.', 'Obery pravylnu paru.', 'Elige la pareja correcta.'), options: ['I work / She works', 'I works / She work', 'I am work / She is works', 'I working / She working'], correctAnswer: 'I work / She works', correctFeedback: tri('Yes. I uses work. She uses works.', 'Yes. I uses work. She uses works.', 'Si. I usa work. She usa works.'), retryLine: 'I = work. She = works.', focusWords: ['work', 'works'] }),
    psStep({ id: 'ps_statement_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_habit_schedule_fact', sentence: 'Choose the correct sentence.', translation: tri('Vyberi pravilnoe predlozhenie.', 'Obery pravylne rechennia.', 'Elige la oracion correcta.'), options: ['He works every day, and the shop opens at 9.', 'He work every day, and the shop open at 9.', 'He is work every day, and the shop is open at 9.', 'He working every day, and the shop opening at 9.'], correctAnswer: 'He works every day, and the shop opens at 9.', correctFeedback: tri('Yes. He = works. The shop = it = opens. Habit and schedule.', 'Yes. He = works. The shop = it = opens. Habit and schedule.', 'Si. He = works. The shop = it = opens. Habito y horario.'), retryLine: 'He works. Shop opens.', focusWords: ['works', 'opens'] }),
    psStep({ id: 'ps_statement_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Vyberi pravilnoe predlozhenie.', 'Obery pravylne rechennia.', 'Elige la oracion correcta.'), options: ['They usually study at night, but my sister studies in the morning.', 'They usually studies at night, but my sister study in the morning.', 'They are usually study at night, but my sister is studies in the morning.', 'They usually studying at night, but my sister studying in the morning.'], correctAnswer: 'They usually study at night, but my sister studies in the morning.', correctFeedback: tri('Yes. They = study. My sister = she = studies.', 'Yes. They = study. My sister = she = studies.', 'Si. They = study. My sister = she = studies.'), retryLine: 'They study. Sister studies.', focusWords: ['study', 'studies'] }),
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
    depth1: tri('Show why this is habit/fact/schedule and what verb form is needed.', 'Show why this is habit/fact/schedule and what verb form is needed.', 'Mostramos por que es habit/fact/schedule y que forma verbal necesita.'),
    depth2: tri('Ask: usually true or happening now?', 'Ask: usually true or happening now?', 'Pregunta: normalmente o ahora?'),
    depth3: tri('Blocks: I work every day / She works every day.', 'Blocks: I work every day / She works every day.', 'Bloques: I work every day / She works every day.'),
    depth4: tri('Almost hint: base verb or verb+s.', 'Almost hint: base verb or verb+s.', 'Casi pista: base verb o verb+s.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Habit/fact/schedule/stable state = Present Simple. I/you/we/they + base verb. He/she/it + verb+s. Do not add am/is/are before normal verb.', 'Habit/fact/schedule/stable state = Present Simple. I/you/we/they + base verb. He/she/it + verb+s. Do not add am/is/are before normal verb.', 'Habito/hecho/horario/estado estable = Present Simple. I/you/we/they + base verb. He/she/it + verb+s. No anadas am/is/are antes de verbo normal.') },
    afterThreeWrongInSameExercise: { action: 'show_subject_and_meaning_hint_then_retry', card: tri('The system shows meaning type and subject group, but does not choose the verb form.', 'The system shows meaning type and subject group, but does not choose the verb form.', 'El sistema muestra tipo de sentido y subject group, pero no elige la forma verbal.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Guided mode: first choose habit/fact or action now. Then choose subject group.', 'Guided mode: first choose habit/fact or action now. Then choose subject group.', 'Modo guiado: primero elige habito/hecho o accion ahora. Luego elige subject group.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_ps_statement_001', prompt: tri('Every day shows habit or action right now?', 'Every day shows habit or action right now?', 'Every day muestra habito o accion ahora?'), options: ['habit', 'action now'], correctIndex: 0, thenReturnToExerciseId: 'ps_statement_easy_001' },
      { id: 'guided_ps_statement_002', prompt: tri('She belongs to he/she/it or I/you/we/they?', 'She belongs to he/she/it or I/you/we/they?', 'She pertenece a he/she/it o I/you/we/they?'), options: ['he/she/it', 'I/you/we/they'], correctIndex: 0, thenReturnToExerciseId: 'ps_statement_contrast_001' },
      { id: 'guided_ps_statement_003', prompt: tri('Does They need verb+s in a Present Simple statement?', 'Does They need verb+s in a Present Simple statement?', 'They necesita verb+s en Present Simple statement?'), options: ['yes', 'no'], correctIndex: 1, thenReturnToExerciseId: 'ps_statement_easy_002' },
      { id: 'guided_ps_statement_004', prompt: tri('The shop opens at 9: is this a schedule?', 'The shop opens at 9: is this a schedule?', 'The shop opens at 9: es horario?'), options: ['yes', 'no'], correctIndex: 0, thenReturnToExerciseId: 'ps_statement_mixed_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'verb_present_simple_statement',
    diagnosisLabel: tri('Present Simple v utverzhdeniyah', 'Present Simple u stverdzhenniakh', 'Present Simple en afirmaciones'),
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


