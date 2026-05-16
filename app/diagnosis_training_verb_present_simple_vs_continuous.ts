import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = ['present simple', 'present continuous', 'habit', 'current action', 'state verbs', 'temporary situation', 'time markers'];

function retry(line: string): [TriText, TriText, TriText, TriText] {
  return [
    tri(line),
    tri('Ask first: normally or now?', 'Ask first: normally or now?', 'Pregunta primero: normalmente o ahora?'),
    tri('Pair: I work every day / I am working now.', 'Pair: I work every day / I am working now.', 'Pareja: I work every day / I am working now.'),
    tri('Hint: choose Present Simple or Present Continuous from the marker.', 'Hint: choose Present Simple or Present Continuous from the marker.', 'Pista: elige Present Simple o Present Continuous por el marcador.'),
  ];
}

function baseWrong(correct: string): Record<string, TriText> {
  const msg = (option: string) => tri(
    `${option} ne podhodit. Nuzhno ${correct}: decide if the situation is normally true or happening now.`,
    `${option} ne pidkhodyt. Potribno ${correct}: decide if the situation is normally true or happening now.`,
    `${option} no encaja. Necesitamos ${correct}: decide si es normalmente cierto o ocurre ahora.`,
  );
  return Object.fromEntries([
    'work', 'am working', 'working', 'works',
    'studies', 'is studying', 'study', 'studying',
    'wait', 'are waiting', 'waits', 'waiting',
    'likes', 'is liking', 'like', 'liking',
    'leaves', 'is leaving', 'leave', 'leaving',
    'freezes', 'is freezing', 'freeze', 'freezing',
    'live', 'are living', 'lives', 'living',
  ].map((option) => [option, msg(option)]));
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
      'Present Simple is for habits, facts, schedules, and stable states. Present Continuous is for action now or a temporary current situation.',
      'Present Simple is for habits, facts, schedules, and stable states. Present Continuous is for action now or a temporary current situation.',
      'Present Simple es para habitos, hechos, horarios y estados. Present Continuous es accion ahora o situacion temporal actual.',
    ),
    microTask: tri('Choose Simple or Continuous from the meaning marker.', 'Choose Simple or Continuous from the meaning marker.', 'Elige Simple o Continuous por el marcador.'),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, wrongFeedback[option] ?? tri(
        `Not this form. Use ${input.correctAnswer}: check normally vs now.`,
        `Not this form. Use ${input.correctAnswer}: check normally vs now.`,
        `No esta forma. Usa ${input.correctAnswer}: revisa normalmente vs ahora.`,
      )])),
    retryFeedback: retry(input.retryLine),
    fallbackExplanation: tri(
      'Every day/usually/always/facts/schedules/states usually need Present Simple. Now/right now/at the moment/temporary current situations need Present Continuous.',
      'Every day/usually/always/facts/schedules/states usually need Present Simple. Now/right now/at the moment/temporary current situations need Present Continuous.',
      'Every day/usually/always/hechos/horarios/estados suelen usar Present Simple. Now/right now/at the moment/situaciones temporales usan Present Continuous.',
    ),
    focusWords: input.focusWords,
  };
}

export const VERB_PRESENT_SIMPLE_VS_CONTINUOUS_TRAINING: DiagnosisTraining = {
  id: 'verb_present_simple_vs_continuous',
  category: 'verb',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 24,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('Present Simple vs Continuous: obychno ili seichas', 'Present Simple vs Continuous: zazvychai chy zaraz', 'Present Simple vs Continuous: normalmente o ahora'),
  shortTitle: tri('Simple vs Continuous', 'Simple vs Continuous', 'Simple vs Continuous'),
  shortDiagnosis: tri('Ty putaesh usually/every day i now/right now.', 'Ty plutaiesh usually/every day i now/right now.', 'Confundes normally/every day y now/right now.'),
  diagnosisText: tri(
    'Both forms can translate as present, but English asks: habit/fact or action now?',
    'Both forms can translate as present, but English asks: habit/fact or action now?',
    'Ambas formas pueden traducirse como presente, pero English pregunta: habito/hecho o accion ahora?',
  ),
  mentalModel: tri(
    'Simple = usually, every day, fact, schedule, stable state. Continuous = now, right now, at the moment, temporary process.',
    'Simple = usually, every day, fact, schedule, stable state. Continuous = now, right now, at the moment, temporary process.',
    'Simple = usually, every day, hecho, horario, estado. Continuous = now, right now, at the moment, proceso temporal.',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'I work every day = habit. I am working now = action now. She studies English = stable. She is studying now = process now.',
    'I work every day = habit. I am working now = action now. She studies English = stable. She is studying now = process now.',
    'I work every day = habito. I am working now = accion ahora. She studies English = estable. She is studying now = proceso ahora.',
  ),
  whatUserMustLearn: {
    ru: ['Present Simple = habits: I work every day.', 'Present Continuous = action now: I am working now.', 'Every day/usually/often/always/on Mondays point to Simple.', 'Now/right now/at the moment point to Continuous.', 'Facts and schedules use Simple.', 'Temporary current situations often use Continuous.', 'State verbs like like/know/want often use Simple.', 'Do not use I am working every day for a normal habit.', 'Do not use I work now for action right now.', 'First decide meaning, then verb form.'],
    uk: ['Present Simple = habits: I work every day.', 'Present Continuous = action now: I am working now.', 'Every day/usually/often/always/on Mondays point to Simple.', 'Now/right now/at the moment point to Continuous.', 'Facts and schedules use Simple.', 'Temporary current situations often use Continuous.', 'State verbs like like/know/want often use Simple.', 'Do not use I am working every day for a normal habit.', 'Do not use I work now for action right now.', 'First decide meaning, then verb form.'],
    es: ['Present Simple = habitos: I work every day.', 'Present Continuous = accion ahora: I am working now.', 'Every day/usually/often/always/on Mondays apuntan a Simple.', 'Now/right now/at the moment apuntan a Continuous.', 'Hechos y horarios usan Simple.', 'Situaciones temporales actuales usan Continuous.', 'Verbos de estado como like/know/want suelen usar Simple.', 'No uses I am working every day para habito normal.', 'No uses I work now para accion ahora mismo.', 'Primero decide sentido, luego forma.'],
  },
  examples: [
    { en: 'I work every day.', ru: 'Ya rabotayu kazhdy den.', uk: 'Ya pratsiuiu shchodnia.', es: 'Trabajo todos los dias.', why: tri('Every day = habit, so Present Simple: work.', 'Every day = habit, so Present Simple: work.', 'Every day = habito, por eso Present Simple: work.') },
    { en: 'I am working now.', ru: 'Ya seichas rabotayu.', uk: 'Ya zaraz pratsiuiu.', es: 'Estoy trabajando ahora.', why: tri('Now = action now, so Present Continuous: am working.', 'Now = action now, so Present Continuous: am working.', 'Now = accion ahora, por eso Present Continuous: am working.') },
    { en: 'She usually studies at night.', ru: 'Ona obychno uchitsya nochyu.', uk: 'Vona zazvychai vchytsia vnochi.', es: 'Normalmente estudia por la noche.', why: tri('Usually = habit. She needs studies.', 'Usually = habit. She needs studies.', 'Usually = habito. She necesita studies.') },
    { en: 'She is studying right now.', ru: 'Ona uchitsya pryamo seichas.', uk: 'Vona vchytsia priamo zaraz.', es: 'Ella esta estudiando ahora mismo.', why: tri('Right now = process now: is studying.', 'Right now = process now: is studying.', 'Right now = proceso ahora: is studying.') },
    { en: 'He likes coffee.', ru: 'On lyubit coffee.', uk: 'Vin liubyt kavu.', es: 'Le gusta el cafe.', why: tri('Like is stable taste, so Present Simple: likes.', 'Like is stable taste, so Present Simple: likes.', 'Like es gusto estable, por eso Present Simple: likes.') },
    { en: 'The train leaves at 8.', ru: 'Poezd otpravlyaetsya v 8.', uk: 'Potiah vidpravliaietsia o 8.', es: 'El tren sale a las 8.', why: tri('Schedule often uses Present Simple. The train = it, so leaves.', 'Schedule often uses Present Simple. The train = it, so leaves.', 'Horario usa Present Simple. The train = it, por eso leaves.') },
    { en: 'I am working on a new project this month.', ru: 'V etom mesyatse ya rabotayu nad new project.', uk: 'Tsoho misiatsia ya pratsiuiu nad new project.', es: 'Este mes estoy trabajando en un proyecto nuevo.', why: tri('This month marks a temporary current situation, so Continuous.', 'This month marks a temporary current situation, so Continuous.', 'This month marca situacion temporal actual, por eso Continuous.') },
    { en: 'We live in Dublin.', ru: 'My zhivem v Dublin.', uk: 'My zhyvemo u Dublini.', es: 'Vivimos en Dublin.', why: tri('Stable situation, not process now. Use Present Simple: live.', 'Stable situation, not process now. Use Present Simple: live.', 'Situacion estable, no proceso ahora. Usa Present Simple: live.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Do not translate both forms as the same present. First choose situation type: normally or now.', 'Do not translate both forms as the same present. First choose situation type: normally or now.', 'No traduzcas ambas como el mismo presente. Primero elige: normalmente o ahora.') },
    { id: 'intro_rule', type: 'rule', text: tri('Main filter: every day/usually/always = Simple. Now/right now/at the moment = Continuous.', 'Main filter: every day/usually/always = Simple. Now/right now/at the moment = Continuous.', 'Filtro principal: every day/usually/always = Simple. Now/right now/at the moment = Continuous.') },
    { id: 'intro_warning', type: 'warning', text: tri('Do not make everything -ing. I am working now, but I work every day.', 'Do not make everything -ing. I am working now, but I work every day.', 'No pongas todo en -ing. I am working now, pero I work every day.') },
  ],
  steps: [
    step({ id: 'ps_pc_easy_001', order: 1, difficulty: 'easy', targetSkill: 'habit_present_simple', sentence: 'I ___ every day.', translation: tri('Ya rabotayu kazhdy den.', 'Ya pratsiuiu shchodnia.', 'Trabajo todos los dias.'), options: ['work', 'am working', 'working', 'works'], correctAnswer: 'work', correctFeedback: tri('Yes. Every day shows habit. Use Present Simple: work.', 'Yes. Every day shows habit. Use Present Simple: work.', 'Si. Every day muestra habito. Usa Present Simple: work.'), wrong: { 'am working': tri('Am working describes action now or temporary situation. Every day shows habit, so work.', 'Am working describes action now or temporary situation. Every day shows habit, so work.', 'Am working describe accion ahora o situacion temporal. Every day muestra habito, por eso work.'), working: tri('Working without am is incorrect, and every day needs Present Simple: work.', 'Working without am is incorrect, and every day needs Present Simple: work.', 'Working sin am es incorrecto, y every day necesita Present Simple: work.'), works: tri('Works is for he/she/it. With I use work.', 'Works is for he/she/it. With I use work.', 'Works va con he/she/it. Con I usa work.') }, retryLine: 'Every day = normally. Normally = Simple.', focusWords: ['every day', 'work'] }),
    step({ id: 'ps_pc_easy_002', order: 2, difficulty: 'easy', targetSkill: 'now_present_continuous', sentence: 'I ___ now.', translation: tri('Ya seichas rabotayu.', 'Ya zaraz pratsiuiu.', 'Estoy trabajando ahora.'), options: ['work', 'am working', 'works', 'am work'], correctAnswer: 'am working', correctFeedback: tri('Yes. Now shows action right now. Use Present Continuous: am working.', 'Yes. Now shows action right now. Use Present Continuous: am working.', 'Si. Now muestra accion ahora mismo. Usa Present Continuous: am working.'), wrong: { work: tri('Work usually means habit/fact. Now needs process now: am working.', 'Work usually means habit/fact. Now needs process now: am working.', 'Work suele ser habito/hecho. Now necesita proceso ahora: am working.'), works: tri('Works is not for I, and now needs am working.', 'Works is not for I, and now needs am working.', 'Works no va con I, y now necesita am working.'), 'am work': tri('After am, action now needs verb-ing. Not am work, but am working.', 'After am, action now needs verb-ing. Not am work, but am working.', 'Despues de am, accion ahora necesita verb-ing. No am work, sino am working.') }, retryLine: 'Now = right now. Right now = am working.', focusWords: ['now', 'am working'] }),
    step({ id: 'ps_pc_easy_003', order: 3, difficulty: 'easy', targetSkill: 'habit_vs_now_pair', sentence: 'Choose the correct pair.', translation: tri('Vyberi pravilnuyu paru.', 'Obery pravylnu paru.', 'Elige la pareja correcta.'), options: ['I work every day / I am working now', 'I am working every day / I work now', 'I working every day / I am work now', 'I works every day / I working now'], correctAnswer: 'I work every day / I am working now', correctFeedback: tri('Yes. Every day = Present Simple. Now = Present Continuous.', 'Yes. Every day = Present Simple. Now = Present Continuous.', 'Si. Every day = Present Simple. Now = Present Continuous.'), wrong: { 'I am working every day / I work now': tri('Forms are swapped. Every day points to Simple, now points to Continuous.', 'Forms are swapped. Every day points to Simple, now points to Continuous.', 'Las formas estan invertidas. Every day apunta a Simple, now apunta a Continuous.'), 'I working every day / I am work now': tri('I working is missing am. I am work is missing -ing.', 'I working is missing am. I am work is missing -ing.', 'I working falta am. I am work falta -ing.'), 'I works every day / I working now': tri('I does not take works. I working is missing am.', 'I does not take works. I working is missing am.', 'I no toma works. I working falta am.') }, retryLine: 'Every day = work. Now = am working.', focusWords: ['work', 'am working'] }),
    step({ id: 'ps_pc_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'usually_present_simple', sentence: 'She usually ___ at night.', translation: tri('Ona obychno uchitsya nochyu.', 'Vona zazvychai vchytsia vnochi.', 'Normalmente estudia por la noche.'), options: ['studies', 'is studying', 'study', 'studying'], correctAnswer: 'studies', correctFeedback: tri('Yes. Usually shows habit. She needs studies.', 'Yes. Usually shows habit. She needs studies.', 'Si. Usually muestra habito. She necesita studies.'), wrong: { 'is studying': tri('Is studying describes action now. Usually shows habit, so studies.', 'Is studying describes action now. Usually shows habit, so studies.', 'Is studying describe accion ahora. Usually muestra habito, por eso studies.'), study: tri('Study is for I/you/we/they. With she use studies.', 'Study is for I/you/we/they. With she use studies.', 'Study va con I/you/we/they. Con she usa studies.'), studying: tri('Studying without is is incorrect, and usually needs Present Simple.', 'Studying without is is incorrect, and usually needs Present Simple.', 'Studying sin is es incorrecto, y usually necesita Present Simple.') }, retryLine: 'Usually = habit. She = studies.', focusWords: ['usually', 'studies'] }),
    step({ id: 'ps_pc_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'right_now_present_continuous', sentence: 'She ___ right now.', translation: tri('Ona uchitsya pryamo seichas.', 'Vona vchytsia priamo zaraz.', 'Ella esta estudiando ahora mismo.'), options: ['studies', 'is studying', 'study', 'studying'], correctAnswer: 'is studying', correctFeedback: tri('Yes. Right now shows process now. Use is studying.', 'Yes. Right now shows process now. Use is studying.', 'Si. Right now muestra proceso ahora. Usa is studying.'), wrong: { studies: tri('Studies describes habit/stable situation. Right now needs is studying.', 'Studies describes habit/stable situation. Right now needs is studying.', 'Studies describe habito/situacion estable. Right now necesita is studying.'), study: tri('Study does not fit she, and right now needs is studying.', 'Study does not fit she, and right now needs is studying.', 'Study no encaja con she, y right now necesita is studying.'), studying: tri('Studying without is is incorrect. Use she is studying.', 'Studying without is is incorrect. Use she is studying.', 'Studying sin is es incorrecto. Usa she is studying.') }, retryLine: 'Right now = process now. She is studying.', focusWords: ['right now', 'is studying'] }),
    step({ id: 'ps_pc_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'at_the_moment_continuous', sentence: 'At the moment, they ___.', translation: tri('V danny moment oni zhdut.', 'U tsei moment vony chekaiut.', 'En este momento estan esperando.'), options: ['wait', 'are waiting', 'waits', 'waiting'], correctAnswer: 'are waiting', correctFeedback: tri('Yes. At the moment shows action now. They needs are waiting.', 'Yes. At the moment shows action now. They needs are waiting.', 'Si. At the moment muestra accion ahora. They necesita are waiting.'), wrong: { wait: tri('Wait describes habit/fact. At the moment needs are waiting.', 'Wait describes habit/fact. At the moment needs are waiting.', 'Wait describe habito/hecho. At the moment necesita are waiting.'), waits: tri('Waits is for he/she/it. They needs are waiting here.', 'Waits is for he/she/it. They needs are waiting here.', 'Waits va con he/she/it. They necesita are waiting aqui.'), waiting: tri('Waiting without are is incorrect. Use they are waiting.', 'Waiting without are is incorrect. Use they are waiting.', 'Waiting sin are es incorrecto. Usa they are waiting.') }, retryLine: 'At the moment = are waiting.', focusWords: ['at the moment', 'are waiting'] }),
    step({ id: 'ps_pc_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'state_verb_simple', sentence: 'He ___ coffee.', translation: tri('On lyubit coffee.', 'Vin liubyt kavu.', 'Le gusta el cafe.'), options: ['likes', 'is liking', 'like', 'liking'], correctAnswer: 'likes', correctFeedback: tri('Yes. Like usually describes stable taste. He needs likes.', 'Yes. Like usually describes stable taste. He needs likes.', 'Si. Like suele describir gusto estable. He necesita likes.'), wrong: { 'is liking': tri('Is liking works only in special contexts. Normal taste = likes.', 'Is liking works only in special contexts. Normal taste = likes.', 'Is liking solo funciona en contextos especiales. Gusto normal = likes.'), like: tri('He needs -s in Present Simple: likes.', 'He needs -s in Present Simple: likes.', 'He necesita -s en Present Simple: likes.'), liking: tri('Liking without is is incorrect, and normal taste needs likes.', 'Liking without is is incorrect, and normal taste needs likes.', 'Liking sin is es incorrecto, y gusto normal necesita likes.') }, retryLine: 'Taste = stable state = Simple.', focusWords: ['likes'] }),
    step({ id: 'ps_pc_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'schedule_simple', sentence: 'The train ___ at 8.', translation: tri('Poezd otpravlyaetsya v 8.', 'Potiah vidpravliaietsia o 8.', 'El tren sale a las 8.'), options: ['leaves', 'is leaving', 'leave', 'leaving'], correctAnswer: 'leaves', correctFeedback: tri('Yes. Schedule usually uses Present Simple. The train = it, so leaves.', 'Yes. Schedule usually uses Present Simple. The train = it, so leaves.', 'Si. Horario normalmente usa Present Simple. The train = it, por eso leaves.'), wrong: { 'is leaving': tri('Is leaving can work for a near plan, but a normal schedule is leaves at 8.', 'Is leaving can work for a near plan, but a normal schedule is leaves at 8.', 'Is leaving puede funcionar para plan cercano, pero horario normal = leaves at 8.'), leave: tri('The train = it, so use leaves.', 'The train = it, so use leaves.', 'The train = it, usa leaves.'), leaving: tri('Leaving without is is incorrect, and schedule needs leaves.', 'Leaving without is is incorrect, and schedule needs leaves.', 'Leaving sin is es incorrecto, y horario necesita leaves.') }, retryLine: 'Schedule = Simple. Train = leaves.', focusWords: ['leaves'] }),
    step({ id: 'ps_pc_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'fact_simple', sentence: 'Water ___ at 0C.', translation: tri('Voda zamerzaet pri 0C.', 'Voda zamerzaie pry 0C.', 'El agua se congela a 0C.'), options: ['freezes', 'is freezing', 'freeze', 'freezing'], correctAnswer: 'freezes', correctFeedback: tri('Yes. This is a general fact. Water = it, so freezes.', 'Yes. This is a general fact. Water = it, so freezes.', 'Si. Es un hecho general. Water = it, por eso freezes.'), wrong: { 'is freezing': tri('Is freezing describes process now. General fact needs Present Simple: freezes.', 'Is freezing describes process now. General fact needs Present Simple: freezes.', 'Is freezing describe proceso ahora. Hecho general necesita Present Simple: freezes.'), freeze: tri('Water = it. In Present Simple use freezes.', 'Water = it. In Present Simple use freezes.', 'Water = it. En Present Simple usa freezes.'), freezing: tri('Freezing without is is incorrect, and general fact needs freezes.', 'Freezing without is is incorrect, and general fact needs freezes.', 'Freezing sin is es incorrecto, y hecho general necesita freezes.') }, retryLine: 'Fact = Simple. Water freezes.', focusWords: ['freezes'] }),
    step({ id: 'ps_pc_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'temporary_situation_continuous', sentence: 'I ___ on a new project this month.', translation: tri('V etom mesyatse ya rabotayu nad new project.', 'Tsoho misiatsia ya pratsiuiu nad new project.', 'Este mes estoy trabajando en un proyecto nuevo.'), options: ['work', 'am working', 'works', 'working'], correctAnswer: 'am working', correctFeedback: tri('Yes. This month marks a temporary current situation. Use am working.', 'Yes. This month marks a temporary current situation. Use am working.', 'Si. This month marca situacion temporal actual. Usa am working.'), wrong: { work: tri('Work can describe permanent job/habit. This month highlights a temporary project, so am working.', 'Work can describe permanent job/habit. This month highlights a temporary project, so am working.', 'Work puede describir trabajo/habito permanente. This month subraya proyecto temporal, por eso am working.'), works: tri('Works is not for I. Here use am working.', 'Works is not for I. Here use am working.', 'Works no va con I. Aqui usa am working.'), working: tri('Working without am is incorrect. Use I am working.', 'Working without am is incorrect. Use I am working.', 'Working sin am es incorrecto. Usa I am working.') }, retryLine: 'This month = temporary now. I am working.', focusWords: ['this month', 'am working'] }),
    step({ id: 'ps_pc_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'stable_situation_simple', sentence: 'We ___ in Dublin.', translation: tri('My zhivem v Dublin.', 'My zhyvemo u Dublini.', 'Vivimos en Dublin.'), options: ['live', 'are living', 'lives', 'living'], correctAnswer: 'live', correctFeedback: tri('Yes. Stable situation. We uses base verb: live.', 'Yes. Stable situation. We uses base verb: live.', 'Si. Situacion estable. We usa base verb: live.'), wrong: { 'are living': tri('Are living can stress temporary residence. Normal stable situation = We live in Dublin.', 'Are living can stress temporary residence. Normal stable situation = We live in Dublin.', 'Are living puede marcar residencia temporal. Situacion estable normal = We live in Dublin.'), lives: tri('Lives is for he/she/it. We needs live.', 'Lives is for he/she/it. We needs live.', 'Lives va con he/she/it. We necesita live.'), living: tri('Living without are is incorrect. For stable situation here use live.', 'Living without are is incorrect. For stable situation here use live.', 'Living sin are es incorrecto. Para situacion estable aqui usa live.') }, retryLine: 'Stable residence = live.', focusWords: ['live'] }),
    step({ id: 'ps_pc_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'temporary_vs_permanent_pair', sentence: 'Choose the correct pair.', translation: tri('Vyberi pravilnuyu paru.', 'Obery pravylnu paru.', 'Elige la pareja correcta.'), options: ['I work in security / I am working on a new project this month', 'I am working in security / I work on a new project this month', 'I working in security / I am work on a new project this month', 'I works in security / I working on a new project this month'], correctAnswer: 'I work in security / I am working on a new project this month', correctFeedback: tri('Yes. Work in security = normal job. This month project = temporary current situation.', 'Yes. Work in security = normal job. This month project = temporary current situation.', 'Si. Work in security = trabajo normal. This month project = situacion temporal actual.'), wrong: { 'I am working in security / I work on a new project this month': tri('Can be possible if security work is temporary, but basic job = I work. This month project = am working.', 'Can be possible if security work is temporary, but basic job = I work. This month project = am working.', 'Puede ser posible si security work es temporal, pero trabajo base = I work. This month project = am working.'), 'I working in security / I am work on a new project this month': tri('I working is missing am. I am work is missing -ing.', 'I working is missing am. I am work is missing -ing.', 'I working falta am. I am work falta -ing.'), 'I works in security / I working on a new project this month': tri('I does not take works. I working is missing am.', 'I does not take works. I working is missing am.', 'I no toma works. I working falta am.') }, retryLine: 'Job = work. Temporary project = am working.', focusWords: ['work', 'am working'] }),
    step({ id: 'ps_pc_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_time_markers', sentence: 'Choose the correct sentence.', translation: tri('Vyberi pravilnoe predlozhenie.', 'Obery pravylne rechennia.', 'Elige la oracion correcta.'), options: ['He usually works at night, but he is sleeping now.', 'He is usually working at night, but he sleeps now.', 'He usually working at night, but he is sleep now.', 'He usually work at night, but he sleeping now.'], correctAnswer: 'He usually works at night, but he is sleeping now.', correctFeedback: tri('Yes. Usually = works. Now = is sleeping.', 'Yes. Usually = works. Now = is sleeping.', 'Si. Usually = works. Now = is sleeping.'), wrong: { 'He is usually working at night, but he sleeps now.': tri('Usually usually needs Present Simple: works. Now usually needs Present Continuous: is sleeping.', 'Usually usually needs Present Simple: works. Now usually needs Present Continuous: is sleeping.', 'Usually suele necesitar Present Simple: works. Now suele necesitar Present Continuous: is sleeping.'), 'He usually working at night, but he is sleep now.': tri('Usually working is wrong without is, and after is use sleeping, not sleep.', 'Usually working is wrong without is, and after is use sleeping, not sleep.', 'Usually working esta mal sin is, y despues de is usa sleeping, no sleep.'), 'He usually work at night, but he sleeping now.': tri('He usually needs works. He sleeping now needs is sleeping.', 'He usually needs works. He sleeping now needs is sleeping.', 'He usually necesita works. He sleeping now necesita is sleeping.') }, retryLine: 'Usually = works. Now = is sleeping.', focusWords: ['usually', 'now'] }),
    step({ id: 'ps_pc_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_state_action', sentence: 'Choose the correct sentence.', translation: tri('Vyberi pravilnoe predlozhenie.', 'Obery pravylne rechennia.', 'Elige la oracion correcta.'), options: ['She likes tea, but she is drinking coffee now.', 'She is liking tea, but she drinks coffee now.', 'She like tea, but she drinking coffee now.', 'She likes tea, but she is drink coffee now.'], correctAnswer: 'She likes tea, but she is drinking coffee now.', correctFeedback: tri('Yes. Likes = stable taste. Is drinking now = action now.', 'Yes. Likes = stable taste. Is drinking now = action now.', 'Si. Likes = gusto estable. Is drinking now = accion ahora.'), wrong: { 'She is liking tea, but she drinks coffee now.': tri('Like as stable taste is usually Simple: likes. Now with drinking needs Continuous.', 'Like as stable taste is usually Simple: likes. Now with drinking needs Continuous.', 'Like como gusto estable suele ser Simple: likes. Now con drinking necesita Continuous.'), 'She like tea, but she drinking coffee now.': tri('She needs likes. She drinking needs is drinking.', 'She needs likes. She drinking needs is drinking.', 'She necesita likes. She drinking necesita is drinking.'), 'She likes tea, but she is drink coffee now.': tri('First part is correct. In the second, after is use drinking, not drink.', 'First part is correct. In the second, after is use drinking, not drink.', 'La primera parte esta bien. En la segunda, despues de is usa drinking, no drink.') }, retryLine: 'Taste = likes. Drinking now = is drinking.', focusWords: ['likes', 'is drinking'] }),
    step({ id: 'ps_pc_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_schedule_current_action', sentence: 'Choose the correct sentence.', translation: tri('Vyberi pravilnoe predlozhenie.', 'Obery pravylne rechennia.', 'Elige la oracion correcta.'), options: ['The bus leaves at 8, but we are waiting now.', 'The bus is leaving at 8, but we wait now.', 'The bus leave at 8, but we waiting now.', 'The bus leaving at 8, but we are wait now.'], correctAnswer: 'The bus leaves at 8, but we are waiting now.', correctFeedback: tri('Yes. Schedule = leaves. Now = are waiting.', 'Yes. Schedule = leaves. Now = are waiting.', 'Si. Horario = leaves. Now = are waiting.'), wrong: { 'The bus is leaving at 8, but we wait now.': tri('For schedule, leaves is better. For action now, are waiting is better.', 'For schedule, leaves is better. For action now, are waiting is better.', 'Para horario, leaves es mejor. Para accion ahora, are waiting es mejor.'), 'The bus leave at 8, but we waiting now.': tri('The bus = it, so leaves. We waiting needs are waiting.', 'The bus = it, so leaves. We waiting needs are waiting.', 'The bus = it, por eso leaves. We waiting necesita are waiting.'), 'The bus leaving at 8, but we are wait now.': tri('The bus leaving is missing is, but schedule is better as leaves. Are wait is wrong; use are waiting.', 'The bus leaving is missing is, but schedule is better as leaves. Are wait is wrong; use are waiting.', 'The bus leaving falta is, pero horario va mejor como leaves. Are wait esta mal; usa are waiting.') }, retryLine: 'Schedule = leaves. Now = are waiting.', focusWords: ['leaves', 'are waiting'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['habit_vs_now_confusion', 'present_simple_instead_of_continuous_now', 'present_continuous_instead_of_habit', 'state_verb_continuous_error', 'schedule_continuous_error', 'temporary_situation_simple_error', 'third_person_s_error', 'missing_be_before_ing'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Show time marker and situation type.', 'Show time marker and situation type.', 'Mostramos marcador temporal y tipo de situacion.'),
    depth2: tri('Ask: normally or now?', 'Ask: normally or now?', 'Pregunta: normalmente o ahora?'),
    depth3: tri('Pair: I work every day / I am working now.', 'Pair: I work every day / I am working now.', 'Pareja: I work every day / I am working now.'),
    depth4: tri('Almost hint: Present Simple or Present Continuous.', 'Almost hint: Present Simple or Present Continuous.', 'Casi pista: Present Simple o Present Continuous.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Stop. First ask: normally or now? Normally/fact/schedule/state = Present Simple. Now/in progress/temporary = Present Continuous.', 'Stop. First ask: normally or now? Normally/fact/schedule/state = Present Simple. Now/in progress/temporary = Present Continuous.', 'Detente. Primero pregunta: normalmente o ahora? Normalmente/hecho/horario/estado = Present Simple. Ahora/en proceso/temporal = Present Continuous.') },
    afterThreeWrongInSameExercise: { action: 'show_time_marker_hint_then_retry', card: tri('The system shows the marker type, but does not choose the answer.', 'The system shows the marker type, but does not choose the answer.', 'El sistema muestra el tipo de marcador, pero no elige la respuesta.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Guided mode: first choose normally or now, then subject group.', 'Guided mode: first choose normally or now, then subject group.', 'Modo guiado: primero elige normalmente o ahora, luego subject group.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_ps_pc_001', prompt: tri('Every day shows habit or action right now?', 'Every day shows habit or action right now?', 'Every day muestra habito o accion ahora?'), options: ['habit', 'action now'], correctIndex: 0, thenReturnToExerciseId: 'ps_pc_easy_001' },
      { id: 'guided_ps_pc_002', prompt: tri('Now shows habit or action right now?', 'Now shows habit or action right now?', 'Now muestra habito o accion ahora?'), options: ['habit', 'action now'], correctIndex: 1, thenReturnToExerciseId: 'ps_pc_easy_002' },
      { id: 'guided_ps_pc_003', prompt: tri('Usually usually points to Simple or Continuous?', 'Usually usually points to Simple or Continuous?', 'Usually normalmente apunta a Simple o Continuous?'), options: ['Simple', 'Continuous'], correctIndex: 0, thenReturnToExerciseId: 'ps_pc_contrast_001' },
      { id: 'guided_ps_pc_004', prompt: tri('Right now usually points to Simple or Continuous?', 'Right now usually points to Simple or Continuous?', 'Right now normalmente apunta a Simple o Continuous?'), options: ['Simple', 'Continuous'], correctIndex: 1, thenReturnToExerciseId: 'ps_pc_contrast_002' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'verb_present_simple_vs_continuous',
    diagnosisLabel: tri('Present Simple vs Present Continuous', 'Present Simple vs Present Continuous', 'Present Simple vs Present Continuous'),
    contrastSet: CONTRAST,
    focusWords: ['every day', 'usually', 'now', 'right now', 'at the moment', 'this month'],
    focusPatterns: ['habit_present_simple', 'now_present_continuous', 'habit_vs_now_pair', 'usually_present_simple', 'right_now_present_continuous', 'at_the_moment_continuous', 'state_verb_simple', 'schedule_simple', 'fact_simple', 'temporary_situation_continuous', 'stable_situation_simple', 'temporary_vs_permanent_pair', 'mixed_time_markers', 'mixed_state_action', 'mixed_schedule_current_action'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_verb_present_simple_vs_continuous_start',
    answer: 'diagnosis_training_verb_present_simple_vs_continuous_answer',
    mastery: 'diagnosis_training_verb_present_simple_vs_continuous_mastery',
    fallback: 'diagnosis_training_verb_present_simple_vs_continuous_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'verb', microDiagnosisId: 'verb_present_simple_vs_continuous', contrastSet: CONTRAST, logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logTimeMarker: true, logMeaningType: true, logChosenTense: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=verb_present_simple_vs_continuous',
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


