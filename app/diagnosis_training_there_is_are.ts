import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk: string, es: string): TriText => ({ ru, uk, es });

const CONTRAST = ['there is', 'there are', "there isn't", "there aren't", 'is there', 'are there', 'have/has'];

function retry(line: string): [TriText, TriText, TriText, TriText] {
  return [
    tri(line, line, line),
    tri('Look at the noun after there: singular, plural, or uncountable.', 'Look at the noun after there: singular, plural, or uncountable.', 'Mira el noun despues de there: singular, plural o uncountable.'),
    tri('Blocks: there is a book / there are books / there is water.', 'Blocks: there is a book / there are books / there is water.', 'Bloques: there is a book / there are books / there is water.'),
    tri('Hint: choose is for one/uncountable, are for plural.', 'Hint: choose is for one/uncountable, are for plural.', 'Pista: elige is para uno/uncountable, are para plural.'),
  ];
}

function wrong(correct: string): Record<string, TriText> {
  const msg = (option: string) => tri(
    `${option} ne podhodit. Zdes nuzhno ${correct}: smotri na noun number posle there.`,
    `${option} ne pidkhodyt. Tut potribno ${correct}: dyvys na noun number pislia there.`,
    `${option} no encaja. Aqui necesitamos ${correct}: mira el noun number despues de there.`,
  );
  return Object.fromEntries([
    'There is', 'There are', "There isn't", "There aren't", 'Is there', 'Are there',
    'It is', 'They are', 'Have', 'Has', 'There has', 'There have', 'There is no',
    'There are no', 'There are a problem', 'There is problems', 'Do there', "There don't",
  ].map((option) => [option, msg(option)]));
}

function thereStep(input: {
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
  const wrongFeedback = { ...wrong(input.correctAnswer), ...(input.wrong ?? {}) };
  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: input.translation,
    explanationBlock: tri(
      'There is / there are talks about existence, not ownership. First inspect the noun after the structure.',
      'There is / there are talks about existence, not ownership. First inspect the noun after the structure.',
      'There is / there are habla de existencia, no posesion. Primero mira el noun despues de la estructura.',
    ),
    microTask: tri('Choose the correct existential form.', 'Choose the correct existential form.', 'Elige la forma existential correcta.'),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, wrongFeedback[option] ?? tri(
        `Ne sovsem. Nuzhno ${input.correctAnswer}: singular/uncountable uses is, plural uses are.`,
        `Ne zovsim. Potribno ${input.correctAnswer}: singular/uncountable uses is, plural uses are.`,
        `No exactamente. Necesitamos ${input.correctAnswer}: singular/uncountable usa is, plural usa are.`,
      )])),
    retryFeedback: retry(input.retryLine),
    fallbackExplanation: tri(
      'There is = one thing or uncountable. There are = plural. In questions: Is there / Are there.',
      'There is = one thing or uncountable. There are = plural. In questions: Is there / Are there.',
      'There is = una cosa o uncountable. There are = plural. En preguntas: Is there / Are there.',
    ),
    focusWords: input.focusWords,
  };
}

export const THERE_IS_ARE_TRAINING: DiagnosisTraining = {
  id: 'there_is_are',
  category: 'existential',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 20,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('There is / There are: est, nahoditsya, exists', 'There is / There are: ye, znakhodytsia, exists', 'There is / There are: hay, esta, existe'),
  shortTitle: tri('There is / There are', 'There is / There are', 'There is / There are'),
  shortDiagnosis: tri('Ty putaesh there is i there are.', 'Ty plutaiesh there is i there are.', 'Confundes there is y there are.'),
  diagnosisText: tri(
    'Ty putaesh there is / there are ili perevodish est cherez have/is. There is / there are ne pro owner, a pro existence.',
    'Ty plutaiesh there is / there are abo perekladaiesh ye cherez have/is. There is / there are ne pro owner, a pro existence.',
    'Confundes there is / there are o traduces hay con have/is. There is / there are no habla de poseedor, sino de existencia.',
  ),
  mentalModel: tri(
    'There is = one thing or uncountable. There are = plural. First look at the noun after there.',
    'There is = one thing or uncountable. There are = plural. First look at the noun after there.',
    'There is = una cosa o uncountable. There are = plural. Primero mira el noun despues de there.',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    "There is a book. There are two books. There is water. There isn't any time. Are there any questions?",
    "There is a book. There are two books. There is water. There isn't any time. Are there any questions?",
    "There is a book. There are two books. There is water. There isn't any time. Are there any questions?",
  ),
  whatUserMustLearn: {
    ru: ['There is for one thing.', 'There are for plural.', 'There is for uncountable.', "There isn't for singular/uncountable negative.", "There aren't for plural negative.", 'Questions invert is/are: Is there? Are there?', 'There is is not literal there/tam.', 'It is describes a concrete thing.', 'Have needs an owner.', 'No there is many people. Use there are many people.'],
    uk: ['There is for one thing.', 'There are for plural.', 'There is for uncountable.', "There isn't for singular/uncountable negative.", "There aren't for plural negative.", 'Questions invert is/are: Is there? Are there?', 'There is is not literal there/tam.', 'It is describes a concrete thing.', 'Have needs an owner.', 'No there is many people. Use there are many people.'],
    es: ['There is para una cosa.', 'There are para plural.', 'There is para uncountable.', "There isn't para negacion singular/uncountable.", "There aren't para negacion plural.", 'Preguntas invierten is/are: Is there? Are there?', 'There is no es alli literal.', 'It is describe una cosa concreta.', 'Have necesita poseedor.', 'No there is many people. Usa there are many people.'],
  },
  examples: [
    { en: 'There is a book on the table.', ru: 'Na stole est kniga.', uk: 'Na stoli ye knyzhka.', es: 'Hay un libro en la mesa.', why: tri('A book = singular, so there is.', 'A book = singular, so there is.', 'A book = singular, por eso there is.') },
    { en: 'There are two books on the table.', ru: 'Na stole est dve knigi.', uk: 'Na stoli ye dvi knyzhky.', es: 'Hay dos libros en la mesa.', why: tri('Two books = plural, so there are.', 'Two books = plural, so there are.', 'Two books = plural, por eso there are.') },
    { en: 'There is some water in the glass.', ru: 'V stakane est voda.', uk: 'U skliantsi ye voda.', es: 'Hay agua en el vaso.', why: tri('Water = uncountable, so there is.', 'Water = uncountable, so there is.', 'Water = uncountable, por eso there is.') },
    { en: "There isn't any time.", ru: 'Vremeni net.', uk: 'Chasu nemaie.', es: 'No hay tiempo.', why: tri('Time = uncountable negative, so there is not.', 'Time = uncountable negative, so there is not.', 'Time = uncountable negative, por eso there is not.') },
    { en: "There aren't any chairs in the room.", ru: 'V komnate net stuliev.', uk: 'U kimnati nemaie stiltsiv.', es: 'No hay sillas.', why: tri('Chairs = plural negative, so there are not.', 'Chairs = plural negative, so there are not.', 'Chairs = plural negative, por eso there are not.') },
    { en: 'Is there a problem?', ru: 'Est problema?', uk: 'Ye problema?', es: 'Hay un problema?', why: tri('Question with singular: Is there?', 'Question with singular: Is there?', 'Pregunta singular: Is there?') },
    { en: 'Are there any questions?', ru: 'Est voprosy?', uk: 'Ye pytannia?', es: 'Hay preguntas?', why: tri('Questions = plural, so Are there?', 'Questions = plural, so Are there?', 'Questions = plural, por eso Are there?') },
    { en: 'There are many people outside.', ru: 'Snaruzhi mnogo lyudei.', uk: 'Zzovni bahato liudei.', es: 'Hay mucha gente afuera.', why: tri('People works as plural, so there are.', 'People works as plural, so there are.', 'People funciona como plural, por eso there are.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('There is / there are means something exists somewhere, not somebody owns it.', 'There is / there are means something exists somewhere, not somebody owns it.', 'There is / there are significa que algo existe, no que alguien lo posee.') },
    { id: 'intro_rule', type: 'rule', text: tri('One or uncountable = there is. Plural = there are.', 'One or uncountable = there is. Plural = there are.', 'Uno o uncountable = there is. Plural = there are.') },
    { id: 'intro_warning', type: 'warning', text: tri('Do not say there is people/questions/books. Plural noun needs there are.', 'Do not say there is people/questions/books. Plural noun needs there are.', 'No digas there is people/questions/books. Plural noun necesita there are.') },
  ],
  steps: [
    thereStep({ id: 'there_easy_001', order: 1, difficulty: 'easy', targetSkill: 'there_is_singular', sentence: '___ a book on the table.', translation: tri('Na stole est kniga.', 'Na stoli ye knyzhka.', 'Hay un libro en la mesa.'), options: ['There is', 'There are', 'It is', 'Have'], correctAnswer: 'There is', correctFeedback: tri('Yes. A book = one thing. Use there is.', 'Yes. A book = one thing. Use there is.', 'Si. A book = una cosa. Usa there is.'), wrong: { 'There are': tri('There are is for plural. A book is singular, so there is.', 'There are is for plural. A book is singular, so there is.', 'There are es para plural. A book es singular, por eso there is.'), 'It is': tri('It is describes a concrete thing. Here we say a book exists on the table: there is.', 'It is describes a concrete thing. Here we say a book exists on the table: there is.', 'It is describe una cosa concreta. Aqui decimos que hay un libro: there is.'), Have: tri('Have shows ownership. Here existence on the table = there is.', 'Have shows ownership. Here existence on the table = there is.', 'Have muestra posesion. Aqui existencia en la mesa = there is.') }, retryLine: 'A book = one thing. One thing exists somewhere = there is.', focusWords: ['there is'] }),
    thereStep({ id: 'there_easy_002', order: 2, difficulty: 'easy', targetSkill: 'there_is_singular', sentence: '___ a problem with this app.', translation: tri('S etim app est problema.', 'Z tsym app ye problema.', 'Hay un problema con esta app.'), options: ['There is', 'There are', 'They are', 'Have'], correctAnswer: 'There is', correctFeedback: tri('Yes. A problem = singular. Use there is.', 'Yes. A problem = singular. Use there is.', 'Si. A problem = singular. Usa there is.'), retryLine: 'A problem = one. One = there is.', focusWords: ['there is'] }),
    thereStep({ id: 'there_easy_003', order: 3, difficulty: 'easy', targetSkill: 'there_are_plural', sentence: '___ two chairs in the room.', translation: tri('V komnate est dva stula.', 'U kimnati ye dva stiltsi.', 'Hay dos sillas.'), options: ['There is', 'There are', 'It is', 'Has'], correctAnswer: 'There are', correctFeedback: tri('Yes. Two chairs = plural. Use there are.', 'Yes. Two chairs = plural. Use there are.', 'Si. Two chairs = plural. Usa there are.'), wrong: { 'There is': tri('There is is for one/uncountable. Two chairs is plural, so there are.', 'There is is for one/uncountable. Two chairs is plural, so there are.', 'There is es para uno/uncountable. Two chairs es plural, por eso there are.') }, retryLine: 'Two chairs = plural. Plural = there are.', focusWords: ['there are'] }),
    thereStep({ id: 'there_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'there_are_plural_people', sentence: '___ many people outside.', translation: tri('Snaruzhi mnogo lyudei.', 'Zzovni bahato liudei.', 'Hay mucha gente afuera.'), options: ['There is', 'There are', 'It is', 'There has'], correctAnswer: 'There are', correctFeedback: tri('Yes. People works as plural. Use there are many people.', 'Yes. People works as plural. Use there are many people.', 'Si. People funciona como plural. Usa there are many people.'), wrong: { 'There is': tri('There is many people is a common error. People is plural, so there are.', 'There is many people is a common error. People is plural, so there are.', 'There is many people es error comun. People es plural, por eso there are.') }, retryLine: 'People = plural. There are people.', focusWords: ['there are', 'people'] }),
    thereStep({ id: 'there_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'there_are_plural_questions', sentence: '___ any questions?', translation: tri('Est kakie-nibud voprosy?', 'Ye yakis pytannia?', 'Hay preguntas?'), options: ['Is there', 'Are there', 'There is', 'Do there'], correctAnswer: 'Are there', correctFeedback: tri('Yes. Questions = plural. In a question use Are there.', 'Yes. Questions = plural. In a question use Are there.', 'Si. Questions = plural. En pregunta usa Are there.'), wrong: { 'Is there': tri('Is there is for singular/uncountable. Questions is plural, so are there.', 'Is there is for singular/uncountable. Questions is plural, so are there.', 'Is there es para singular/uncountable. Questions es plural, por eso are there.'), 'There is': tri('This is a question, so are moves first: Are there any questions?', 'This is a question, so are moves first: Are there any questions?', 'Es pregunta, por eso are va primero: Are there any questions?') }, retryLine: 'Questions plural. Question = Are there.', focusWords: ['are there'] }),
    thereStep({ id: 'there_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'there_arent_plural_negative', sentence: "___ any chairs in the room.", translation: tri('V komnate net stuliev.', 'U kimnati nemaie stiltsiv.', 'No hay sillas.'), options: ["There isn't", "There aren't", 'There is no', "It isn't"], correctAnswer: "There aren't", correctFeedback: tri("Yes. Chairs = plural negative. Use there aren't.", "Yes. Chairs = plural negative. Use there aren't.", "Si. Chairs = plural negative. Usa there aren't."), wrong: { "There isn't": tri("There isn't is for singular/uncountable. Chairs is plural, so there aren't.", "There isn't is for singular/uncountable. Chairs is plural, so there aren't.", "There isn't es para singular/uncountable. Chairs es plural, por eso there aren't."), 'There is no': tri("There is no chairs is not standard. Use there are no chairs or there aren't any chairs.", "There is no chairs is not standard. Use there are no chairs or there aren't any chairs.", "There is no chairs no es estandar. Usa there are no chairs o there aren't any chairs.") }, retryLine: "Chairs plural. Negative plural = there aren't.", focusWords: ["there aren't"] }),
    thereStep({ id: 'there_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'there_is_uncountable_water', sentence: '___ some water in the glass.', translation: tri('V stakane est voda.', 'U skliantsi ye voda.', 'Hay agua en el vaso.'), options: ['There is', 'There are', 'They are', 'Have'], correctAnswer: 'There is', correctFeedback: tri('Yes. Water = uncountable. Use there is.', 'Yes. Water = uncountable. Use there is.', 'Si. Water = uncountable. Usa there is.'), wrong: { 'There are': tri('There are is for plural countable. Water is uncountable, so there is.', 'There are is for plural countable. Water is uncountable, so there is.', 'There are es para plural countable. Water es uncountable, por eso there is.') }, retryLine: 'Water = mass. Mass = there is.', focusWords: ['there is', 'water'] }),
    thereStep({ id: 'there_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'there_is_uncountable_time', sentence: '___ no time left.', translation: tri('Vremeni ne ostalos.', 'Chasu ne zalyshylosia.', 'No queda tiempo.'), options: ['There is', 'There are', 'There have', 'They are'], correctAnswer: 'There is', correctFeedback: tri('Yes. Time as a resource is uncountable. Use there is no time.', 'Yes. Time as a resource is uncountable. Use there is no time.', 'Si. Time como recurso es uncountable. Usa there is no time.'), retryLine: 'Time = uncountable. There is no time.', focusWords: ['there is', 'time'] }),
    thereStep({ id: 'there_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'there_is_uncountable_information', sentence: '___ a lot of information in this lesson.', translation: tri('V etom uroke mnogo informatsii.', 'U tsomu urotsi bahato informatsii.', 'Hay mucha informacion en esta leccion.'), options: ['There is', 'There are', 'They are', 'There have'], correctAnswer: 'There is', correctFeedback: tri('Yes. Information is uncountable in English. Use there is.', 'Yes. Information is uncountable in English. Use there is.', 'Si. Information es uncountable en ingles. Usa there is.'), wrong: { 'There are': tri('There are does not fit because information is not plural. Use there is.', 'There are does not fit because information is not plural. Use there is.', 'There are no encaja porque information no es plural. Usa there is.') }, retryLine: 'Information = uncountable. There is.', focusWords: ['there is', 'information'] }),
    thereStep({ id: 'there_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'is_there_question_singular', sentence: '___ a bathroom here?', translation: tri('Zdes est bathroom?', 'Tut ye bathroom?', 'Hay un bano aqui?'), options: ['Is there', 'Are there', 'There is', 'Do there'], correctAnswer: 'Is there', correctFeedback: tri('Yes. A bathroom = singular. Question = Is there.', 'Yes. A bathroom = singular. Question = Is there.', 'Si. A bathroom = singular. Pregunta = Is there.'), wrong: { 'There is': tri('In a question, is moves first. Say Is there a bathroom?', 'In a question, is moves first. Say Is there a bathroom?', 'En pregunta, is va primero. Di Is there a bathroom?') }, retryLine: 'A bathroom is one. Question = Is there.', focusWords: ['is there'] }),
    thereStep({ id: 'there_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'are_there_question_plural', sentence: '___ any messages for me?', translation: tri('Dlya menya est messages?', 'Dlia mene ye messages?', 'Hay mensajes para mi?'), options: ['Is there', 'Are there', 'There are', 'Do there'], correctAnswer: 'Are there', correctFeedback: tri('Yes. Messages = plural. Question = Are there.', 'Yes. Messages = plural. Question = Are there.', 'Si. Messages = plural. Pregunta = Are there.'), wrong: { 'There are': tri('This is a question, so are moves first: Are there any messages?', 'This is a question, so are moves first: Are there any messages?', 'Es pregunta, por eso are va primero: Are there any messages?') }, retryLine: 'Messages plural. Question = Are there.', focusWords: ['are there'] }),
    thereStep({ id: 'there_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'there_isnt_uncountable', sentence: "___ any information about this.", translation: tri('Ob etom net informatsii.', 'Pro tse nemaie informatsii.', 'No hay informacion sobre esto.'), options: ["There isn't", "There aren't", "There don't", "It isn't"], correctAnswer: "There isn't", correctFeedback: tri("Yes. Information = uncountable negative. Use there isn't.", "Yes. Information = uncountable negative. Use there isn't.", "Si. Information = uncountable negative. Usa there isn't."), wrong: { "There aren't": tri("There aren't is for plural. Information is uncountable, so there isn't.", "There aren't is for plural. Information is uncountable, so there isn't.", "There aren't es para plural. Information es uncountable, por eso there isn't.") }, retryLine: "Information uncountable. Negative = there isn't.", focusWords: ["there isn't", 'information'] }),
    thereStep({ id: 'there_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_is_are_pair', sentence: 'Choose the correct pair.', translation: tri('Vyberi pravilnuyu paru.', 'Obery pravylnu paru.', 'Elige la pareja correcta.'), options: ['There is a problem / There are problems', 'There are a problem / There is problems', 'There is a problem / There is problems', 'There are problem / There are a problems'], correctAnswer: 'There is a problem / There are problems', correctFeedback: tri('Yes. A problem = singular there is. Problems = plural there are.', 'Yes. A problem = singular there is. Problems = plural there are.', 'Si. A problem = singular there is. Problems = plural there are.'), retryLine: 'One problem = is. Many problems = are.', focusWords: ['there is', 'there are'] }),
    thereStep({ id: 'there_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_question_pair', sentence: 'Choose the correct pair.', translation: tri('Vyberi pravilnuyu paru.', 'Obery pravylnu paru.', 'Elige la pareja correcta.'), options: ['Is there a question? / Are there any questions?', 'Are there a question? / Is there any questions?', 'There is a question? / There are any questions?', 'Do there a question? / Do there any questions?'], correctAnswer: 'Is there a question? / Are there any questions?', correctFeedback: tri('Yes. Singular question = Is there. Plural questions = Are there.', 'Yes. Singular question = Is there. Plural questions = Are there.', 'Si. Singular question = Is there. Plural questions = Are there.'), retryLine: 'Question: Is there one? Are there many?', focusWords: ['is there', 'are there'] }),
    thereStep({ id: 'there_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Vyberi pravilnoe predlozhenie.', 'Obery pravylne rechennia.', 'Elige la oracion correcta.'), options: ["There is some water, but there aren't any cups.", "There are some water, but there isn't any cups.", "It is some water, but they aren't any cups.", "There have some water, but there don't any cups."], correctAnswer: "There is some water, but there aren't any cups.", correctFeedback: tri("Yes. Water uncountable = there is. Cups plural negative = there aren't.", "Yes. Water uncountable = there is. Cups plural negative = there aren't.", "Si. Water uncountable = there is. Cups plural negative = there aren't."), retryLine: "Water = there is. Cups = there aren't.", focusWords: ['there is', "there aren't"] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['there_is_plural_error', 'there_are_singular_error', 'there_are_uncountable_error', 'question_order_error', 'negative_singular_plural_error', 'there_is_vs_it_is_confusion', 'there_is_vs_have_confusion', 'uncountable_there_is_error'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Show noun after there and choose is/are.', 'Show noun after there and choose is/are.', 'Mostramos el noun despues de there y elegimos is/are.'),
    depth2: tri('Ask: singular, uncountable, or plural?', 'Ask: singular, uncountable, or plural?', 'Pregunta: singular, uncountable o plural?'),
    depth3: tri('Blocks: there is a book / there are books / there is water.', 'Blocks: there is a book / there are books / there is water.', 'Bloques: there is a book / there are books / there is water.'),
    depth4: tri('Almost hint: point directly to there is or there are.', 'Almost hint: point directly to there is or there are.', 'Casi pista: indicamos there is o there are.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('One/uncountable = there is. Plural = there are. In questions, is/are moves first.', 'One/uncountable = there is. Plural = there are. In questions, is/are moves first.', 'Uno/uncountable = there is. Plural = there are. En preguntas, is/are va primero.') },
    afterThreeWrongInSameExercise: { action: 'show_noun_number_hint_then_retry', card: tri('The system shows singular/plural/uncountable, but does not choose there is/are.', 'The system shows singular/plural/uncountable, but does not choose there is/are.', 'El sistema muestra singular/plural/uncountable, pero no elige there is/are.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Guided mode: first choose noun type, then return to there is / there are.', 'Guided mode: first choose noun type, then return to there is / there are.', 'Modo guiado: primero elige tipo de noun, luego vuelve a there is / there are.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_there_001', prompt: tri('A book: one or plural?', 'A book: one or plural?', 'A book: one or plural?'), options: ['one', 'plural'], correctIndex: 0, thenReturnToExerciseId: 'there_easy_001' },
      { id: 'guided_there_002', prompt: tri('Two chairs: one or plural?', 'Two chairs: one or plural?', 'Two chairs: one or plural?'), options: ['one', 'plural'], correctIndex: 1, thenReturnToExerciseId: 'there_easy_003' },
      { id: 'guided_there_003', prompt: tri('Water: plural or uncountable?', 'Water: plural or uncountable?', 'Water: plural or uncountable?'), options: ['plural', 'uncountable'], correctIndex: 1, thenReturnToExerciseId: 'there_contrast_004' },
      { id: 'guided_there_004', prompt: tri('In questions, is/are stays after there or moves first?', 'In questions, is/are stays after there or moves first?', 'En preguntas, is/are queda despues de there o va primero?'), options: ['stays after there', 'moves first'], correctIndex: 1, thenReturnToExerciseId: 'there_mixed_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'existential',
    microDiagnosisId: 'there_is_are',
    diagnosisLabel: tri('There is / There are', 'There is / There are', 'There is / There are'),
    contrastSet: CONTRAST,
    focusWords: ['there is', 'there are', "there isn't", "there aren't", 'is there', 'are there'],
    focusPatterns: ['there_is_singular', 'there_are_plural', 'there_are_plural_people', 'there_are_plural_questions', 'there_arent_plural_negative', 'there_is_uncountable_water', 'there_is_uncountable_time', 'there_is_uncountable_information', 'is_there_question_singular', 'are_there_question_plural', 'there_isnt_uncountable', 'mixed_is_are_pair', 'mixed_question_pair', 'mixed_sentence_correction'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_there_is_are_start',
    answer: 'diagnosis_training_there_is_are_answer',
    mastery: 'diagnosis_training_there_is_are_mastery',
    fallback: 'diagnosis_training_there_is_are_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'existential', microDiagnosisId: 'there_is_are', contrastSet: ["there is", "there are", "there isn't", "there aren't", 'is there', 'are there'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logNounNumber: true, logExistentialForm: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=existential&microDiagnosisId=there_is_are',
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


