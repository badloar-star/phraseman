import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk: string, es: string): TriText => ({ ru, uk, es });

const CONTRAST = ['am + verb-ing', 'is + verb-ing', 'are + verb-ing', 'now', 'right now', 'at the moment', 'present simple'];

function retry(line: string): [TriText, TriText, TriText, TriText] {
  return [
    tri(line, line, line),
    tri('Present Continuous needs two parts: be + verb-ing.', 'Present Continuous needs two parts: be + verb-ing.', 'Present Continuous necesita dos partes: be + verb-ing.'),
    tri('Blocks: I am working / She is working / They are working.', 'Blocks: I am working / She is working / They are working.', 'Bloques: I am working / She is working / They are working.'),
    tri('Hint: choose the correct am/is/are + -ing form.', 'Hint: choose the correct am/is/are + -ing form.', 'Pista: elige la forma correcta am/is/are + -ing.'),
  ];
}

function baseWrong(correct: string): Record<string, TriText> {
  const msg = (option: string) => tri(
    `${option} ne podhodit. Nuzhno ${correct}: for action now use subject + am/is/are + verb-ing.`,
    `${option} ne pidkhodyt. Potribno ${correct}: for action now use subject + am/is/are + verb-ing.`,
    `${option} no encaja. Necesitamos ${correct}: para accion ahora usa subject + am/is/are + verb-ing.`,
  );
  return Object.fromEntries([
    'am', 'is', 'are', 'do', 'does',
    'am not', 'not am', "don't", 'am no',
    'Are', 'Do', 'Is', 'You are',
    'reads', 'is reading', 'reading', 'does read',
  ].map((option) => [option, msg(option)]));
}

function pcStep(input: {
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
      'Present Continuous describes an action in progress now or around now. The formula always has be + verb-ing.',
      'Present Continuous describes an action in progress now or around now. The formula always has be + verb-ing.',
      'Present Continuous describe una accion en progreso ahora o alrededor de ahora. La formula siempre tiene be + verb-ing.',
    ),
    microTask: tri('Choose the correct Present Continuous form.', 'Choose the correct Present Continuous form.', 'Elige la forma correcta de Present Continuous.'),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, wrongFeedback[option] ?? tri(
        `Not this form. Use ${input.correctAnswer}: Present Continuous needs be + -ing.`,
        `Not this form. Use ${input.correctAnswer}: Present Continuous needs be + -ing.`,
        `No esta forma. Usa ${input.correctAnswer}: Present Continuous necesita be + -ing.`,
      )])),
    retryFeedback: retry(input.retryLine),
    fallbackExplanation: tri(
      'I am working. He/she/it is working. You/we/they are working. Do not say I working or I am work.',
      'I am working. He/she/it is working. You/we/they are working. Do not say I working or I am work.',
      'I am working. He/she/it is working. You/we/they are working. No digas I working ni I am work.',
    ),
    focusWords: input.focusWords,
  };
}

export const VERB_PRESENT_CONTINUOUS_BASIC_TRAINING: DiagnosisTraining = {
  id: 'verb_present_continuous_basic',
  category: 'verb',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 23,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('Present Continuous: deistvie proiskhodit seichas', 'Present Continuous: diia vidbuvaietsia zaraz', 'Present Continuous: accion que ocurre ahora'),
  shortTitle: tri('Am / Is / Are + -ing', 'Am / Is / Are + -ing', 'Am / Is / Are + -ing'),
  shortDiagnosis: tri('Ty propuskaesh am/is/are ili stavish -ing bez helper.', 'Ty propuskaiesh am/is/are abo stavish -ing bez helper.', 'Omites am/is/are o pones -ing sin auxiliar.'),
  diagnosisText: tri(
    'Ty putaesh Present Continuous. English stroi action now kak dve chasti: be + verb-ing.',
    'Ty plutaiesh Present Continuous. English buduye action now yak dvi chastyny: be + verb-ing.',
    'Confundes Present Continuous. English construye action now con dos partes: be + verb-ing.',
  ),
  mentalModel: tri(
    'Present Continuous = action in progress now. Formula: subject + am/is/are + verb-ing.',
    'Present Continuous = action in progress now. Formula: subject + am/is/are + verb-ing.',
    'Present Continuous = accion en progreso ahora. Formula: subject + am/is/are + verb-ing.',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'I am working. He/she/it is working. You/we/they are working. Need both parts: be + -ing.',
    'I am working. He/she/it is working. You/we/they are working. Need both parts: be + -ing.',
    'I am working. He/she/it is working. You/we/they are working. Necesitamos ambas partes: be + -ing.',
  ),
  whatUserMustLearn: {
    ru: ['Present Continuous for action now: I am working now.', 'Formula always has am/is/are + verb-ing.', 'I uses am.', 'He/she/it uses is.', 'You/we/they uses are.', 'Do not use -ing without am/is/are.', 'Do not use am/is/are without -ing for action.', 'Now/right now/at the moment often signal Continuous.', 'It can describe a temporary current situation.', 'Every day habits usually need Present Simple.'],
    uk: ['Present Continuous for action now: I am working now.', 'Formula always has am/is/are + verb-ing.', 'I uses am.', 'He/she/it uses is.', 'You/we/they uses are.', 'Do not use -ing without am/is/are.', 'Do not use am/is/are without -ing for action.', 'Now/right now/at the moment often signal Continuous.', 'It can describe a temporary current situation.', 'Every day habits usually need Present Simple.'],
    es: ['Present Continuous para accion ahora: I am working now.', 'La formula siempre tiene am/is/are + verb-ing.', 'I usa am.', 'He/she/it usa is.', 'You/we/they usa are.', 'No uses -ing sin am/is/are.', 'No uses am/is/are sin -ing para accion.', 'Now/right now/at the moment senalan Continuous.', 'Puede describir situacion temporal actual.', 'Habitos con every day normalmente usan Present Simple.'],
  },
  examples: [
    { en: 'I am working now.', ru: 'Ya seichas rabotayu.', uk: 'Ya zaraz pratsiuiu.', es: 'Estoy trabajando ahora.', why: tri('Now = action now. With I use am + working.', 'Now = action now. With I use am + working.', 'Now = accion ahora. Con I usa am + working.') },
    { en: 'She is studying at the moment.', ru: 'Ona seichas uchitsya.', uk: 'Vona zaraz vchytsia.', es: 'Ella esta estudiando ahora.', why: tri('At the moment = process now. She needs is + studying.', 'At the moment = process now. She needs is + studying.', 'At the moment = proceso ahora. She necesita is + studying.') },
    { en: 'They are waiting outside.', ru: 'Oni zhdut snaruzi.', uk: 'Vony chekaiut zovni.', es: 'Estan esperando afuera.', why: tri('They needs are. Action in progress: are waiting.', 'They needs are. Action in progress: are waiting.', 'They necesita are. Accion en proceso: are waiting.') },
    { en: 'He is talking on the phone.', ru: 'On govorit po telefonu.', uk: 'Vin rozmovliaie telefonom.', es: 'Esta hablando por telefono.', why: tri('He needs is. Talk becomes talking.', 'He needs is. Talk becomes talking.', 'He necesita is. Talk se convierte en talking.') },
    { en: 'We are having dinner now.', ru: 'My seichas uzhinaem.', uk: 'My zaraz vecheriaiemo.', es: 'Estamos cenando ahora.', why: tri('We needs are. Now shows process now.', 'We needs are. Now shows process now.', 'We necesita are. Now muestra proceso ahora.') },
    { en: 'The baby is sleeping.', ru: 'Rebenok spit.', uk: 'Dytyna spyt.', es: 'El bebe esta durmiendo.', why: tri('The baby is singular, so is sleeping.', 'The baby is singular, so is sleeping.', 'The baby es singular, por eso is sleeping.') },
    { en: 'You are making progress.', ru: 'U tebya est progress.', uk: 'U tebe ye progress.', es: 'Estas progresando.', why: tri('You needs are. Making progress is a current process.', 'You needs are. Making progress is a current process.', 'You necesita are. Making progress es proceso actual.') },
    { en: 'I am not working today.', ru: 'Ya segodnya ne rabotayu.', uk: 'Ya sohodni ne pratsiuiu.', es: 'Hoy no estoy trabajando.', why: tri('In negative, not goes after am/is/are: am not working.', 'In negative, not goes after am/is/are: am not working.', 'En negacion, not va despues de am/is/are: am not working.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Seeing -ing is not enough. Present Continuous needs am/is/are too.', 'Seeing -ing is not enough. Present Continuous needs am/is/are too.', 'Ver -ing no basta. Present Continuous tambien necesita am/is/are.') },
    { id: 'intro_rule', type: 'rule', text: tri('Formula: I am working. She is working. They are working.', 'Formula: I am working. She is working. They are working.', 'Formula: I am working. She is working. They are working.') },
    { id: 'intro_warning', type: 'warning', text: tri('Do not say I working, She studying, or I am work.', 'Do not say I working, She studying, or I am work.', 'No digas I working, She studying, ni I am work.') },
  ],
  steps: [
    pcStep({ id: 'pc_basic_easy_001', order: 1, difficulty: 'easy', targetSkill: 'i_am_ing', sentence: 'I ___ working now.', translation: tri('Ya seichas rabotayu.', 'Ya zaraz pratsiuiu.', 'Estoy trabajando ahora.'), options: ['am', 'is', 'are', 'do'], correctAnswer: 'am', correctFeedback: tri('Yes. With I use am: I am working.', 'Yes. With I use am: I am working.', 'Si. Con I usamos am: I am working.'), wrong: { is: tri('Is is for he/she/it. With I use am.', 'Is is for he/she/it. With I use am.', 'Is va con he/she/it. Con I usa am.'), are: tri('Are is for you/we/they. With I use am.', 'Are is for you/we/they. With I use am.', 'Are va con you/we/they. Con I usa am.'), do: tri('Do does not build Present Continuous. For -ing use be: am working.', 'Do does not build Present Continuous. For -ing use be: am working.', 'Do no construye Present Continuous. Para -ing usa be: am working.') }, retryLine: 'I always goes with am.', focusWords: ['am', 'working'] }),
    pcStep({ id: 'pc_basic_easy_002', order: 2, difficulty: 'easy', targetSkill: 'she_is_ing', sentence: 'She ___ studying at the moment.', translation: tri('Ona seichas uchitsya.', 'Vona zaraz vchytsia.', 'Ella esta estudiando ahora.'), options: ['am', 'is', 'are', 'does'], correctAnswer: 'is', correctFeedback: tri('Yes. She needs is: She is studying.', 'Yes. She needs is: She is studying.', 'Si. She necesita is: She is studying.'), wrong: { am: tri('Am is only for I. With she use is.', 'Am is only for I. With she use is.', 'Am solo va con I. Con she usa is.'), are: tri('Are is for you/we/they. With she use is.', 'Are is for you/we/they. With she use is.', 'Are va con you/we/they. Con she usa is.'), does: tri('Does does not go before studying. Use be: is studying.', 'Does does not go before studying. Use be: is studying.', 'Does no va antes de studying. Usa be: is studying.') }, retryLine: 'She = is.', focusWords: ['is', 'studying'] }),
    pcStep({ id: 'pc_basic_easy_003', order: 3, difficulty: 'easy', targetSkill: 'they_are_ing', sentence: 'They ___ waiting outside.', translation: tri('Oni zhdut snaruzi.', 'Vony chekaiut zovni.', 'Estan esperando afuera.'), options: ['am', 'is', 'are', 'do'], correctAnswer: 'are', correctFeedback: tri('Yes. They needs are: They are waiting.', 'Yes. They needs are: They are waiting.', 'Si. They necesita are: They are waiting.'), wrong: { am: tri('Am is only for I. They needs are.', 'Am is only for I. They needs are.', 'Am solo va con I. They necesita are.'), is: tri('Is is for he/she/it. They is plural, so are.', 'Is is for he/she/it. They is plural, so are.', 'Is va con he/she/it. They es plural, por eso are.'), do: tri('Do does not go before waiting in Present Continuous. Use are.', 'Do does not go before waiting in Present Continuous. Use are.', 'Do no va antes de waiting en Present Continuous. Usa are.') }, retryLine: 'They = are.', focusWords: ['are', 'waiting'] }),
    pcStep({ id: 'pc_basic_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'he_is_ing', sentence: 'He ___ talking on the phone.', translation: tri('On govorit po telefonu.', 'Vin rozmovliaie telefonom.', 'Esta hablando por telefono.'), options: ['am', 'is', 'are', 'does'], correctAnswer: 'is', correctFeedback: tri('Yes. He needs is: He is talking.', 'Yes. He needs is: He is talking.', 'Si. He necesita is: He is talking.'), wrong: { am: tri('Am is only for I. He needs is.', 'Am is only for I. He needs is.', 'Am solo va con I. He necesita is.'), are: tri('Are is for you/we/they. He needs is.', 'Are is for you/we/they. He needs is.', 'Are va con you/we/they. He necesita is.'), does: tri('Does does not go before talking in Present Continuous. Use is talking.', 'Does does not go before talking in Present Continuous. Use is talking.', 'Does no va antes de talking. Usa is talking.') }, retryLine: 'He = is. Then talking.', focusWords: ['is', 'talking'] }),
    pcStep({ id: 'pc_basic_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'we_are_ing', sentence: 'We ___ having dinner now.', translation: tri('My seichas uzhinaem.', 'My zaraz vecheriaiemo.', 'Estamos cenando ahora.'), options: ['am', 'is', 'are', 'do'], correctAnswer: 'are', correctFeedback: tri('Yes. We needs are: We are having dinner.', 'Yes. We needs are: We are having dinner.', 'Si. We necesita are: We are having dinner.'), retryLine: 'We = are.', focusWords: ['are', 'having'] }),
    pcStep({ id: 'pc_basic_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'noun_subject_is_ing', sentence: 'The baby ___ sleeping.', translation: tri('Rebenok spit.', 'Dytyna spyt.', 'El bebe esta durmiendo.'), options: ['am', 'is', 'are', 'does'], correctAnswer: 'is', correctFeedback: tri('Yes. The baby is one subject, so is sleeping.', 'Yes. The baby is one subject, so is sleeping.', 'Si. The baby es singular, por eso is sleeping.'), wrong: { are: tri('Are is for plural/you/we/they. The baby is singular, so is.', 'Are is for plural/you/we/they. The baby is singular, so is.', 'Are va con plural/you/we/they. The baby es singular, por eso is.') }, retryLine: 'The baby is one = is.', focusWords: ['is', 'sleeping'] }),
    pcStep({ id: 'pc_basic_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'missing_be_before_ing', sentence: 'Choose the correct sentence.', translation: tri('Vyberi pravilnoe predlozhenie.', 'Obery pravylne rechennia.', 'Elige la oracion correcta.'), options: ['I am working now.', 'I working now.', 'I am work now.', 'I work now.'], correctAnswer: 'I am working now.', correctFeedback: tri('Yes. Now shows process now. Use am + working.', 'Yes. Now shows process now. Use am + working.', 'Si. Now muestra proceso ahora. Usa am + working.'), wrong: { 'I working now.': tri('I working is incorrect because am is missing before -ing. Use I am working.', 'I working is incorrect because am is missing before -ing. Use I am working.', 'I working es incorrecto porque falta am antes de -ing. Usa I am working.'), 'I am work now.': tri('After am, action now needs verb-ing. Not am work, but am working.', 'After am, action now needs verb-ing. Not am work, but am working.', 'Despues de am, accion ahora necesita verb-ing. No am work, sino am working.'), 'I work now.': tri('I work now can mean now I have a job. For action right now, use I am working now.', 'I work now can mean now I have a job. For action right now, use I am working now.', 'I work now puede significar ahora tengo trabajo. Para accion ahora mismo, usa I am working now.') }, retryLine: 'Now + process = am working.', focusWords: ['am working'] }),
    pcStep({ id: 'pc_basic_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'be_plus_base_error', sentence: 'Choose the correct sentence.', translation: tri('Vyberi pravilnoe predlozhenie.', 'Obery pravylne rechennia.', 'Elige la oracion correcta.'), options: ['She is studying at the moment.', 'She studying at the moment.', 'She is study at the moment.', 'She studies at the moment.'], correctAnswer: 'She is studying at the moment.', correctFeedback: tri('Yes. At the moment shows process now. Use is + studying.', 'Yes. At the moment shows process now. Use is + studying.', 'Si. At the moment muestra proceso ahora. Usa is + studying.'), wrong: { 'She studying at the moment.': tri('She studying is incorrect because is is missing. Use She is studying.', 'She studying is incorrect because is is missing. Use She is studying.', 'She studying es incorrecto porque falta is. Usa She is studying.'), 'She is study at the moment.': tri('After is, process needs verb-ing. Not is study, but is studying.', 'After is, process needs verb-ing. Not is study, but is studying.', 'Despues de is, proceso necesita verb-ing. No is study, sino is studying.'), 'She studies at the moment.': tri('Studies describes habit/fact. At the moment needs process now: is studying.', 'Studies describes habit/fact. At the moment needs process now: is studying.', 'Studies describe habito/hecho. At the moment necesita proceso ahora: is studying.') }, retryLine: 'At the moment = is studying.', focusWords: ['is studying'] }),
    pcStep({ id: 'pc_basic_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'they_are_ing_full', sentence: 'Choose the correct sentence.', translation: tri('Vyberi pravilnoe predlozhenie.', 'Obery pravylne rechennia.', 'Elige la oracion correcta.'), options: ['They are waiting outside.', 'They waiting outside.', 'They are wait outside.', 'They waits outside.'], correctAnswer: 'They are waiting outside.', correctFeedback: tri('Yes. They needs are, and action in progress needs waiting.', 'Yes. They needs are, and action in progress needs waiting.', 'Si. They necesita are y accion en proceso necesita waiting.'), wrong: { 'They waiting outside.': tri('They waiting is incorrect. Before waiting use are.', 'They waiting is incorrect. Before waiting use are.', 'They waiting es incorrecto. Antes de waiting usa are.'), 'They are wait outside.': tri('Are wait is incorrect. After are use verb-ing: are waiting.', 'Are wait is incorrect. After are use verb-ing: are waiting.', 'Are wait es incorrecto. Despues de are usa verb-ing: are waiting.'), 'They waits outside.': tri('Waits is for he/she/it Present Simple. Here use are waiting.', 'Waits is for he/she/it Present Simple. Here use are waiting.', 'Waits va con he/she/it Present Simple. Aqui usa are waiting.') }, retryLine: 'They + are + waiting.', focusWords: ['are waiting'] }),
    pcStep({ id: 'pc_basic_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'negative_order', sentence: 'I ___ working today.', translation: tri('Ya segodnya ne rabotayu.', 'Ya sohodni ne pratsiuiu.', 'Hoy no estoy trabajando.'), options: ['am not', 'not am', "don't", 'am no'], correctAnswer: 'am not', correctFeedback: tri('Yes. In Present Continuous negative, not goes after am: I am not working.', 'Yes. In Present Continuous negative, not goes after am: I am not working.', 'Si. En negacion Present Continuous, not va despues de am: I am not working.'), wrong: { 'not am': tri('Wrong order. Use am not, not not am.', 'Wrong order. Use am not, not not am.', 'Orden incorrecto. Usa am not, no not am.'), "don't": tri("Don't is Present Simple. Before working use am not.", "Don't is Present Simple. Before working use am not.", "Don't es Present Simple. Antes de working usa am not."), 'am no': tri('Am no is incorrect. With be use not: am not.', 'Am no is incorrect. With be use not: am not.', 'Am no es incorrecto. Con be usa not: am not.') }, retryLine: 'Negative: am + not + working.', focusWords: ['am not'] }),
    pcStep({ id: 'pc_basic_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'question_order', sentence: '___ you working now?', translation: tri('Ty seichas rabotaesh?', 'Ty zaraz pratsiuesh?', 'Estas trabajando ahora?'), options: ['Are', 'Do', 'Is', 'You are'], correctAnswer: 'Are', correctFeedback: tri('Yes. In Present Continuous questions, be moves first: Are you working?', 'Yes. In Present Continuous questions, be moves first: Are you working?', 'Si. En preguntas Present Continuous, be va primero: Are you working?'), wrong: { Do: tri('Do does not go before working in Present Continuous. Use Are.', 'Do does not go before working in Present Continuous. Use Are.', 'Do no va antes de working. Usa Are.'), Is: tri('Is is for he/she/it. With you use are.', 'Is is for he/she/it. With you use are.', 'Is va con he/she/it. Con you usa are.'), 'You are': tri('You are working now is a statement. Question: Are you working now?', 'You are working now is a statement. Question: Are you working now?', 'You are working now es afirmacion. Pregunta: Are you working now?') }, retryLine: 'Question: Are + you + working?', focusWords: ['are you'] }),
    pcStep({ id: 'pc_basic_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'now_continuous_vs_simple', sentence: 'Right now, she ___.', translation: tri('Pryamo seichas ona chitaet.', 'Priamo zaraz vona chytaie.', 'Ahora mismo ella esta leyendo.'), options: ['reads', 'is reading', 'reading', 'does read'], correctAnswer: 'is reading', correctFeedback: tri('Yes. Right now shows action now. Use is reading.', 'Yes. Right now shows action now. Use is reading.', 'Si. Right now muestra accion ahora. Usa is reading.'), wrong: { reads: tri('Reads describes habit/fact. Right now needs is reading.', 'Reads describes habit/fact. Right now needs is reading.', 'Reads describe habito/hecho. Right now necesita is reading.'), reading: tri('Reading without is is incorrect. Use she is reading.', 'Reading without is is incorrect. Use she is reading.', 'Reading sin is es incorrecto. Usa she is reading.'), 'does read': tri('Does read does not fit normal action right now. Use is reading.', 'Does read does not fit normal action right now. Use is reading.', 'Does read no encaja para accion ahora. Usa is reading.') }, retryLine: 'Right now = is reading.', focusWords: ['is reading'] }),
    pcStep({ id: 'pc_basic_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_be_agreement', sentence: 'Choose the correct pair.', translation: tri('Vyberi pravilnuyu paru.', 'Obery pravylnu paru.', 'Elige la pareja correcta.'), options: ['I am working / They are waiting', 'I is working / They is waiting', 'I are working / They am waiting', 'I working / They waiting'], correctAnswer: 'I am working / They are waiting', correctFeedback: tri('Yes. I = am. They = are. Both need -ing.', 'Yes. I = am. They = are. Both need -ing.', 'Si. I = am. They = are. Ambas necesitan -ing.'), retryLine: 'I am. They are.', focusWords: ['am working', 'are waiting'] }),
    pcStep({ id: 'pc_basic_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_simple_vs_continuous_signal', sentence: 'Choose the correct pair.', translation: tri('Vyberi pravilnuyu paru.', 'Obery pravylnu paru.', 'Elige la pareja correcta.'), options: ['I work every day / I am working now', 'I am working every day / I work now', 'I working every day / I am work now', 'I am work every day / I working now'], correctAnswer: 'I work every day / I am working now', correctFeedback: tri('Yes. Every day = Present Simple. Now = Present Continuous.', 'Yes. Every day = Present Simple. Now = Present Continuous.', 'Si. Every day = Present Simple. Now = Present Continuous.'), wrong: { 'I am working every day / I work now': tri('Forms are swapped. Every day usually needs I work, now needs I am working.', 'Forms are swapped. Every day usually needs I work, now needs I am working.', 'Las formas estan invertidas. Every day normalmente necesita I work, now necesita I am working.'), 'I working every day / I am work now': tri('I working is missing am. I am work is missing -ing. Use I work / I am working.', 'I working is missing am. I am work is missing -ing. Use I work / I am working.', 'I working falta am. I am work falta -ing. Usa I work / I am working.'), 'I am work every day / I working now': tri('I am work is incorrect, and I working is also incorrect. Use I work / I am working.', 'I am work is incorrect, and I working is also incorrect. Use I work / I am working.', 'I am work es incorrecto, e I working tambien. Usa I work / I am working.') }, retryLine: 'Every day = work. Now = am working.', focusWords: ['work', 'am working'] }),
    pcStep({ id: 'pc_basic_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Vyberi pravilnoe predlozhenie.', 'Obery pravylne rechennia.', 'Elige la oracion correcta.'), options: ['She is studying now, but they are watching TV.', 'She studying now, but they watching TV.', 'She is study now, but they are watch TV.', 'She studies now, but they watches TV.'], correctAnswer: 'She is studying now, but they are watching TV.', correctFeedback: tri('Yes. She = is studying. They = are watching. Now shows process.', 'Yes. She = is studying. They = are watching. Now shows process.', 'Si. She = is studying. They = are watching. Now muestra proceso.'), retryLine: 'She is studying. They are watching.', focusWords: ['is studying', 'are watching'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['missing_be_before_ing', 'be_plus_base_error', 'wrong_be_form', 'present_simple_instead_of_continuous_now', 'ing_spelling_error', 'negative_order_error', 'question_order_error', 'habit_vs_now_confusion'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Show subject, be form, and -ing verb.', 'Show subject, be form, and -ing verb.', 'Mostramos subject, forma de be y verbo -ing.'),
    depth2: tri('For action now, use two parts: be + -ing.', 'For action now, use two parts: be + -ing.', 'Para accion ahora, usa dos partes: be + -ing.'),
    depth3: tri('Blocks: I am working / She is working / They are working.', 'Blocks: I am working / She is working / They are working.', 'Bloques: I am working / She is working / They are working.'),
    depth4: tri('Almost hint: point to exact am/is/are + -ing form.', 'Almost hint: point to exact am/is/are + -ing form.', 'Casi pista: indicamos la forma exacta am/is/are + -ing.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Action now needs full formula: subject + am/is/are + verb-ing. Do not skip be and do not leave the verb without -ing after be.', 'Action now needs full formula: subject + am/is/are + verb-ing. Do not skip be and do not leave the verb without -ing after be.', 'Accion ahora necesita formula completa: subject + am/is/are + verb-ing. No omitas be y no dejes el verbo sin -ing despues de be.') },
    afterThreeWrongInSameExercise: { action: 'show_subject_be_ing_hint_then_retry', card: tri('The system shows subject and correct be form, but does not choose the full answer.', 'The system shows subject and correct be form, but does not choose the full answer.', 'El sistema muestra subject y forma correcta de be, pero no elige toda la respuesta.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Guided mode: first choose be by subject, then check the -ing form.', 'Guided mode: first choose be by subject, then check the -ing form.', 'Modo guiado: primero elige be por subject, luego revisa la forma -ing.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_pc_basic_001', prompt: tri('I goes with am, is, or are?', 'I goes with am, is, or are?', 'I va con am, is o are?'), options: ['am', 'is', 'are'], correctIndex: 0, thenReturnToExerciseId: 'pc_basic_easy_001' },
      { id: 'guided_pc_basic_002', prompt: tri('She goes with am, is, or are?', 'She goes with am, is, or are?', 'She va con am, is o are?'), options: ['am', 'is', 'are'], correctIndex: 1, thenReturnToExerciseId: 'pc_basic_easy_002' },
      { id: 'guided_pc_basic_003', prompt: tri('They goes with am, is, or are?', 'They goes with am, is, or are?', 'They va con am, is o are?'), options: ['am', 'is', 'are'], correctIndex: 2, thenReturnToExerciseId: 'pc_basic_easy_003' },
      { id: 'guided_pc_basic_004', prompt: tri('After am/is/are for action now: normal verb or verb-ing?', 'After am/is/are for action now: normal verb or verb-ing?', 'Despues de am/is/are para accion ahora: verbo normal o verb-ing?'), options: ['normal verb', 'verb-ing'], correctIndex: 1, thenReturnToExerciseId: 'pc_basic_contrast_004' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'verb_present_continuous_basic',
    diagnosisLabel: tri('Present Continuous: am/is/are + -ing', 'Present Continuous: am/is/are + -ing', 'Present Continuous: am/is/are + -ing'),
    contrastSet: CONTRAST,
    focusWords: ['am working', 'is studying', 'are waiting', 'now', 'right now', 'at the moment'],
    focusPatterns: ['i_am_ing', 'she_is_ing', 'they_are_ing', 'he_is_ing', 'we_are_ing', 'noun_subject_is_ing', 'missing_be_before_ing', 'be_plus_base_error', 'they_are_ing_full', 'negative_order', 'question_order', 'now_continuous_vs_simple', 'mixed_be_agreement', 'mixed_simple_vs_continuous_signal', 'mixed_sentence_correction'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_verb_present_continuous_basic_start',
    answer: 'diagnosis_training_verb_present_continuous_basic_answer',
    mastery: 'diagnosis_training_verb_present_continuous_basic_mastery',
    fallback: 'diagnosis_training_verb_present_continuous_basic_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'verb', microDiagnosisId: 'verb_present_continuous_basic', contrastSet: CONTRAST, logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logBeForm: true, logVerbIngForm: true, logTimeSignal: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=verb_present_continuous_basic',
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


