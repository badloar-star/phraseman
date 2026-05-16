import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk: string, es: string): TriText => ({ ru, uk, es });

function qStep(input: {
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
  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: input.translation,
    explanationBlock: tri(
      'Snachala opredeli tip frazy: positive statement, negative, neutral question, offer, request ili free choice.',
      'Spershu vyznach typ frazy: positive statement, negative, neutral question, offer, request abo free choice.',
      'Primero identifica el tipo de frase: afirmacion, negacion, pregunta neutral, oferta, peticion o eleccion libre.',
    ),
    microTask: tri('Vyberi some, any, no ili compound po situatsii.', 'Obery some, any, no abo compound za sytuatsiieiu.', 'Elige some, any, no o compound segun la situacion.'),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? tri(
        `Ne sovsem. Zdes nuzhen "${input.correctAnswer}", potomu chto vazhen tip frazy, a ne tolko perevod.`,
        `Ne zovsim. Tut potriben "${input.correctAnswer}", bo vazhlyvyi typ frazy, a ne lyshe pereklad.`,
        `No exactamente. Aqui necesitamos "${input.correctAnswer}" porque importa el tipo de frase, no solo la traduccion.`,
      )])),
    retryFeedback: [
      input.retry[0],
      input.retry[1],
      input.retry[2],
      tri(
        `Podskazka: v etom slote nuzhno "${input.correctAnswer}".`,
        `Pidkazka: u tsomu sloti potribno "${input.correctAnswer}".`,
        `Pista: en este hueco necesitamos "${input.correctAnswer}".`,
      ),
    ],
    fallbackExplanation: tri(
      'Some = pozitivnoe kolichestvo, offer/request. Any = neutral question, negative, free choice. No = bez not/dont. Something positive, anything negative/question.',
      'Some = pozytyvna kilkist, offer/request. Any = neutral question, negative, free choice. No = bez not/dont. Something positive, anything negative/question.',
      'Some = cantidad positiva, oferta/peticion. Any = pregunta neutral, negacion, eleccion libre. No = sin not/dont. Something positivo, anything negacion/pregunta.',
    ),
    focusWords: input.focusWords,
  };
}

const basicWrong = (correct: string): Record<string, TriText> => ({
  some: tri(`Some ne podhodit zdes. V etoi situatsii nuzhen ${correct}.`, `Some ne pidkhodyt tut. U tsii sytuatsii potriben ${correct}.`, `Some no encaja aqui. En esta situacion necesitamos ${correct}.`),
  any: tri(`Any ne podhodit zdes. V etoi situatsii nuzhen ${correct}.`, `Any ne pidkhodyt tut. U tsii sytuatsii potriben ${correct}.`, `Any no encaja aqui. En esta situacion necesitamos ${correct}.`),
  no: tri(`No menyaet smysl na otritsanie. Zdes nuzhen ${correct}.`, `No zminiuie sens na zaperechennia. Tut potriben ${correct}.`, `No cambia el sentido a negacion. Aqui necesitamos ${correct}.`),
  none: tri(`None ne stavitsya tak pered noun. Nuzhen ${correct}.`, `None ne stavitsia tak pered noun. Potriben ${correct}.`, `None no va asi antes del noun. Necesitamos ${correct}.`),
  something: tri(`Something rabotaet kak compound noun, no zdes nuzhen ${correct}.`, `Something pratsiuie yak compound noun, ale tut potriben ${correct}.`, `Something funciona como compound noun, pero aqui necesitamos ${correct}.`),
  anything: tri(`Anything ne podhodit zdes. Nuzhen ${correct}.`, `Anything ne pidkhodyt tut. Potriben ${correct}.`, `Anything no encaja aqui. Necesitamos ${correct}.`),
  nothing: tri(`Nothing daet negativnyi smysl. Zdes nuzhen ${correct}.`, `Nothing daie zaperechnyi sens. Tut potriben ${correct}.`, `Nothing da sentido negativo. Aqui necesitamos ${correct}.`),
  anybody: tri(`Anybody pro lyudei, ne pro quantity. Zdes nuzhen ${correct}.`, `Anybody pro liudei, ne pro quantity. Tut potriben ${correct}.`, `Anybody es para personas, no cantidad. Aqui necesitamos ${correct}.`),
});

const retry = (a: string, b = a, c = a): [TriText, TriText, TriText] => [
  tri(a, b, c),
  tri('Positive amount = some. Negative/question = any. Offer/request = some. Free choice = any.', 'Positive amount = some. Negative/question = any. Offer/request = some. Free choice = any.', 'Cantidad positiva = some. Negacion/pregunta = any. Oferta/peticion = some. Eleccion libre = any.'),
  tri('Ne perevodi avtomaticheski: snachala tip frazy, potom quantifier.', 'Ne perekladai avtomatychno: spershu typ frazy, potim quantifier.', 'No traduzcas automaticamente: primero tipo de frase, luego quantifier.'),
];

export const QUANTIFIER_SOME_ANY_TRAINING: DiagnosisTraining = {
  id: 'quantifier_some_any',
  category: 'determiner',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 18,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('Some / Any: nemnogo, nikakoi, kakoi-nibud', 'Some / Any: trokhy, niiakyi, yakyi-nebud', 'Some / Any: algo, ninguno, cualquiera'),
  shortTitle: tri('Some / Any', 'Some / Any', 'Some / Any'),
  shortDiagnosis: tri('Ty putaesh some i any.', 'Ty plutaiesh some i any.', 'Confundes some y any.'),
  diagnosisText: tri(
    'Ty vybiraesh some/any po perevodu, no anglijskiy smotrit na tip frazy: utverzhdenie, vopros, otritsanie, prosba ili predlozhenie.',
    'Ty obyraiesh some/any za perekladom, ale anhliiska dyvytsia na typ frazy: stverdzhennia, pytannia, zaperechennia, prokhannia abo propozytsiia.',
    'Eliges some/any por traduccion, pero el ingles mira el tipo de frase: afirmacion, pregunta, negacion, peticion u oferta.',
  ),
  mentalModel: tri(
    'Some obychno daet pozitivnoe kolichestvo. Any proveriaet nalichie voobshche ili otritsaet. V prosbah i predlozheniyah some zvuchit myagche.',
    'Some zazvychai daie pozytyvnu kilkist. Any pereviriaie naiavnist vzahali abo zaperechuie. U prokhanniakh i propozytsiiakh some zvuchyt miakshe.',
    'Some da cantidad positiva. Any comprueba existencia o niega. En peticiones y ofertas, some suena mas natural.',
  ),
  contrastSet: ['some', 'any', 'no', 'not any', 'someone/anyone', 'something/anything'],
  coreRule: tri(
    "Statement: I have some money. Negative: I don't have any money. Question: Do you have any questions? Offer/request: Would you like some tea? Can I have some water?",
    "Statement: I have some money. Negative: I don't have any money. Question: Do you have any questions? Offer/request: Would you like some tea? Can I have some water?",
    "Afirmacion: I have some money. Negacion: I don't have any money. Pregunta: Do you have any questions? Oferta/peticion: Would you like some tea? Can I have some water?",
  ),
  whatUserMustLearn: {
    ru: ['Some v positive statements.', "Any posle don't/not.", 'Any v neutral questions.', 'Some v offers.', 'Some v requests.', 'Any = lyuboi v affirmative.', 'No + noun = not any.', 'Something positive.', 'Anything negative/question.', 'Question ne vsegda any: Would you like some coffee?'],
    uk: ['Some v positive statements.', "Any pislia don't/not.", 'Any v neutral questions.', 'Some v offers.', 'Some v requests.', 'Any = bud-yakyi v affirmative.', 'No + noun = not any.', 'Something positive.', 'Anything negative/question.', 'Question ne zavzhdy any: Would you like some coffee?'],
    es: ['Some en afirmaciones.', "Any despues de don't/not.", 'Any en preguntas neutrales.', 'Some en ofertas.', 'Some en peticiones.', 'Any = cualquier en afirmacion.', 'No + noun = not any.', 'Something positivo.', 'Anything negacion/pregunta.', 'Pregunta no siempre usa any: Would you like some coffee?'],
  },
  examples: [
    { en: 'I have some free time today.', ru: 'U menya est nemnogo vremeni.', uk: 'U mene ye trokhy chasu.', es: 'Tengo algo de tiempo.', why: tri('Positive amount = some.', 'Positive amount = some.', 'Cantidad positiva = some.') },
    { en: "I don't have any free time today.", ru: 'U menya net vremeni.', uk: 'U mene nemaie chasu.', es: 'No tengo tiempo.', why: tri("Don't + any.", "Don't + any.", "Don't + any.") },
    { en: 'Do you have any questions?', ru: 'Est voprosy?', uk: 'Ye pytannia?', es: 'Tienes preguntas?', why: tri('Neutral question = any.', 'Neutral question = any.', 'Pregunta neutral = any.') },
    { en: 'Would you like some tea?', ru: 'Hochesh chai?', uk: 'Khochesh chaiu?', es: 'Quieres te?', why: tri('Offer = some.', 'Offer = some.', 'Oferta = some.') },
    { en: 'Can I have some water?', ru: 'Mozhno vody?', uk: 'Mozhna vody?', es: 'Puedo tomar agua?', why: tri('Request = some.', 'Request = some.', 'Peticion = some.') },
    { en: 'You can choose any lesson.', ru: 'Mozhno vybrat lyuboi urok.', uk: 'Mozhna obraty bud-yakyi urok.', es: 'Puedes elegir cualquier leccion.', why: tri('Free choice = any.', 'Free choice = any.', 'Eleccion libre = any.') },
    { en: 'I need something to drink.', ru: 'Mne nuzhno chto-nibud vypit.', uk: 'Meni potribno shchos vypyty.', es: 'Necesito algo para beber.', why: tri('Positive need = something.', 'Positive need = something.', 'Necesidad positiva = something.') },
    { en: "I don't need anything.", ru: 'Mne nichego ne nuzhno.', uk: 'Meni nichoho ne potribno.', es: 'No necesito nada.', why: tri("Don't + anything.", "Don't + anything.", "Don't + anything.") },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Some/any nelzya vybirat tolko po perevodu.', 'Some/any ne mozhna obyraty lyshe za perekladom.', 'No elijas some/any solo por traduccion.') },
    { id: 'intro_rule', type: 'rule', text: tri('Baza: some positive/offers/requests. Any questions/negatives/free choice.', 'Baza: some positive/offers/requests. Any questions/negatives/free choice.', 'Base: some positivo/ofertas/peticiones. Any preguntas/negaciones/eleccion libre.') },
    { id: 'intro_warning', type: 'warning', text: tri('Ne kazhdyi question trebuet any: Would you like some coffee? eto offer.', 'Ne kozhne question potrebuie any: Would you like some coffee? tse offer.', 'No toda pregunta usa any: Would you like some coffee? es oferta.') },
  ],
  steps: [
    qStep({ id: 'some_any_easy_001', order: 1, difficulty: 'easy', targetSkill: 'some_positive_statement', sentence: 'I have ___ free time today.', translation: tri('U menya est nemnogo svobodnogo vremeni.', 'U mene ye trokhy vilnoho chasu.', 'Hoy tengo algo de tiempo libre.'), options: ['some', 'any', 'no', 'none'], correctAnswer: 'some', correctFeedback: tri('Da. Positive amount: time est. Nuzhen some.', 'Tak. Positive amount: chas ye. Potriben some.', 'Si. Cantidad positiva: hay tiempo. Necesitamos some.'), wrong: basicWrong('some'), retry: retry('Est nemnogo vremeni = some time.'), focusWords: ['some'] }),
    qStep({ id: 'some_any_easy_002', order: 2, difficulty: 'easy', targetSkill: 'some_positive_plural', sentence: 'She bought ___ apples.', translation: tri('Ona kupila neskolko yablok.', 'Vona kupyla kilka yabluk.', 'Ella compro algunas manzanas.'), options: ['some', 'any', 'no', 'anything'], correctAnswer: 'some', correctFeedback: tri('Da. Apples realno kupleny. Positive plural = some apples.', 'Tak. Apples realno kupleni. Positive plural = some apples.', 'Si. Las manzanas fueron compradas. Positivo plural = some apples.'), wrong: basicWrong('some'), retry: retry('Kupila neskolko = bought some.'), focusWords: ['some'] }),
    qStep({ id: 'some_any_easy_003', order: 3, difficulty: 'easy', targetSkill: 'any_negative', sentence: "I don't have ___ money.", translation: tri('U menya net deneg.', 'U mene nemaie hroshei.', 'No tengo dinero.'), options: ['some', 'any', 'something', 'somebody'], correctAnswer: 'any', correctFeedback: tri("Da. Don't have = negative. Nuzhno any money.", "Tak. Don't have = negative. Potribno any money.", "Si. Don't have = negacion. Necesitamos any money."), wrong: { ...basicWrong('any'), some: tri("Some posle don't v etom otritsanii ne rabotaet. Nuzhno any money.", "Some pislia don't u tsomu zaperechenni ne pratsiuie. Potribno any money.", "Some despues de don't no funciona aqui. Necesitamos any money.") }, retry: retry("Don't have = negative. Negative + quantity = any."), focusWords: ['any'] }),
    qStep({ id: 'some_any_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'any_neutral_question', sentence: 'Do you have ___ questions?', translation: tri('U tebya est kakie-nibud voprosy?', 'U tebe ye yakis pytannia?', 'Tienes alguna pregunta?'), options: ['some', 'any', 'no', 'something'], correctAnswer: 'any', correctFeedback: tri('Da. Neutral question about existence = any questions.', 'Tak. Neutral question about existence = any questions.', 'Si. Pregunta neutral de existencia = any questions.'), wrong: { ...basicWrong('any'), some: tri('Some in question vozmozhno pri expected yes, no zdes neutral question. Nuzhen any.', 'Some in question mozhlyve pry expected yes, ale tut neutral question. Potriben any.', 'Some en pregunta puede funcionar si esperas si, pero aqui es neutral. Necesitamos any.') }, retry: retry('Neutral question: est li voobshche? = any.'), focusWords: ['any'] }),
    qStep({ id: 'some_any_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'any_negative_plural', sentence: "There aren't ___ chairs in the room.", translation: tri('V komnate net stuliev.', 'U kimnati nemaie stiltsiv.', 'No hay sillas en la habitacion.'), options: ['some', 'any', 'no', 'none'], correctAnswer: 'any', correctFeedback: tri("Da. Aren't = negative, znachit aren't any chairs.", "Tak. Aren't = negative, otzhe aren't any chairs.", "Si. Aren't = negacion, entonces aren't any chairs."), wrong: { ...basicWrong('any'), no: tri("Aren't no chairs = double negative. Nuzhno aren't any chairs ili there are no chairs.", "Aren't no chairs = double negative. Potribno aren't any chairs abo there are no chairs.", "Aren't no chairs = doble negacion. Necesitamos aren't any chairs o there are no chairs.") }, retry: retry("Aren't + any. Ne aren't + no."), focusWords: ['any'] }),
    qStep({ id: 'some_any_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'no_vs_not_any', sentence: 'I have ___ idea.', translation: tri('U menya net idei.', 'U mene nemaie idei.', 'No tengo ninguna idea.'), options: ['some', 'any', 'no', 'none'], correctAnswer: 'no', correctFeedback: tri('Da. Bez dont mozhno no + noun: I have no idea.', 'Tak. Bez dont mozhna no + noun: I have no idea.', 'Si. Sin dont usamos no + noun: I have no idea.'), wrong: { ...basicWrong('no'), any: tri("I have any idea ne delaet negative bez don't. Nuzhno no idea ili don't have any idea.", "I have any idea ne robyt negative bez don't. Potribno no idea abo don't have any idea.", "I have any idea no niega sin don't. Necesitamos no idea o don't have any idea.") }, retry: retry('Bez dont negative mozhet byt no + noun.'), focusWords: ['no'] }),
    qStep({ id: 'some_any_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'some_offer', sentence: 'Would you like ___ coffee?', translation: tri('Hochesh coffee?', 'Khochesh kavy?', 'Quieres cafe?'), options: ['some', 'any', 'no', 'anything'], correctAnswer: 'some', correctFeedback: tri('Da. Eto offer. Govoryashchiy predlagaet coffee, poetomu some.', 'Tak. Tse offer. Movets proponuie coffee, tomu some.', 'Si. Es oferta. El hablante ofrece cafe, por eso some.'), wrong: { ...basicWrong('some'), any: tri('Any normalno v neutral question, no Would you like coffee? eto offer. Nuzhen some.', 'Any normalno v neutral question, ale Would you like coffee? tse offer. Potriben some.', 'Any funciona en pregunta neutral, pero Would you like coffee? es oferta. Necesitamos some.') }, retry: retry('Would you like...? often offer. Offer = some.'), focusWords: ['some'] }),
    qStep({ id: 'some_any_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'some_request', sentence: 'Can I have ___ water?', translation: tri('Mozhno mne vody?', 'Mozhna meni vody?', 'Puedo tomar un poco de agua?'), options: ['some', 'any', 'no', 'anything'], correctAnswer: 'some', correctFeedback: tri('Da. Eto request. Ty ozhidaesh poluchit water: some water.', 'Tak. Tse request. Ty ochikuiesh otrymaty water: some water.', 'Si. Es peticion. Esperas recibir agua: some water.'), wrong: { ...basicWrong('some'), any: tri('Can I have any water? vozmozhno v osobom smysle, no obychnaya request = some water.', 'Can I have any water? mozhlyve v osoblyvomu sensi, ale zvychaina request = some water.', 'Can I have any water? puede funcionar con sentido especial, pero la peticion normal es some water.') }, retry: retry('Prosba poluchit chto-to = can I have some...'), focusWords: ['some'] }),
    qStep({ id: 'some_any_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'some_offer_plural', sentence: 'Would you like ___ cookies?', translation: tri('Hochesh cookies?', 'Khochesh pechyva?', 'Quieres unas galletas?'), options: ['some', 'any', 'no', 'anybody'], correctAnswer: 'some', correctFeedback: tri('Da. Offer food = some cookies.', 'Tak. Offer food = some cookies.', 'Si. Oferta de comida = some cookies.'), wrong: { ...basicWrong('some'), any: tri('Any cookies zvuchit kak neutral check, no eto offer food. Nuzhen some.', 'Any cookies zvuchyt yak neutral check, ale tse offer food. Potriben some.', 'Any cookies suena como comprobacion neutral, pero es oferta. Necesitamos some.') }, retry: retry('Predlagaesh edu = would you like some...'), focusWords: ['some'] }),
    qStep({ id: 'some_any_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'any_choice_any', sentence: 'You can choose ___ lesson.', translation: tri('Mozhno vybrat lyuboi urok.', 'Mozhna obraty bud-yakyi urok.', 'Puedes elegir cualquier leccion.'), options: ['some', 'any', 'no', 'nothing'], correctAnswer: 'any', correctFeedback: tri('Da. Free choice bez ogranicheniya = any lesson.', 'Tak. Free choice bez obmezhen = any lesson.', 'Si. Eleccion libre sin limite = any lesson.'), wrong: { ...basicWrong('any'), some: tri('Some lesson znachit kakoi-to lesson, no dlya smysla lyuboi nuzhen any lesson.', 'Some lesson znachyt yakyis lesson, ale dlia sensu bud-yakyi potriben any lesson.', 'Some lesson significa alguna leccion, pero para cualquier necesitamos any lesson.') }, retry: retry('Lyuboi bez ogranicheniya = any.'), focusWords: ['any'] }),
    qStep({ id: 'some_any_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'something_positive', sentence: 'I need ___ to drink.', translation: tri('Mne nuzhno chto-nibud vypit.', 'Meni potribno shchos vypyty.', 'Necesito algo para beber.'), options: ['something', 'anything', 'nothing', 'any'], correctAnswer: 'something', correctFeedback: tri('Da. Positive need = something.', 'Tak. Positive need = something.', 'Si. Necesidad positiva = something.'), wrong: { ...basicWrong('something'), anything: tri('Anything mozhet znachit chto ugodno. Zdes natural positive need = something.', 'Anything mozhe znachyty shcho zavhodno. Tut natural positive need = something.', 'Anything puede sonar a cualquier cosa. Aqui la necesidad positiva normal es something.') }, retry: retry('Mne nuzhno chto-to = I need something.'), focusWords: ['something'] }),
    qStep({ id: 'some_any_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'anything_negative', sentence: "I don't need ___.", translation: tri('Mne nichego ne nuzhno.', 'Meni nichoho ne potribno.', 'No necesito nada.'), options: ['something', 'anything', 'nothing', 'some'], correctAnswer: 'anything', correctFeedback: tri("Da. Don't need = negative. Nuzhno anything.", "Tak. Don't need = negative. Potribno anything.", "Si. Don't need = negacion. Necesitamos anything."), wrong: { ...basicWrong('anything'), nothing: tri("Don't need nothing = double negative. Nuzhno don't need anything.", "Don't need nothing = double negative. Potribno don't need anything.", "Don't need nothing = doble negacion. Necesitamos don't need anything.") }, retry: retry("Don't need = negative. Negative compound = anything."), focusWords: ['anything'] }),
    qStep({ id: 'some_any_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_some_any_pair', sentence: 'Choose the correct pair.', translation: tri('Vyberi pravilnuyu paru.', 'Obery pravylnu paru.', 'Elige la pareja correcta.'), options: ["I have some time / I don't have any time", "I have any time / I don't have some time", "I have no time / I don't have no time", "I have any time / I don't have no time"], correctAnswer: "I have some time / I don't have any time", correctFeedback: tri('Da. Positive = some time. Negative after dont = any time.', 'Tak. Positive = some time. Negative after dont = any time.', 'Si. Positivo = some time. Negacion despues de dont = any time.'), wrong: {}, retry: retry('Est = some. Net posle dont = any.'), focusWords: ['some', 'any'] }),
    qStep({ id: 'some_any_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_question_offer', sentence: 'Choose the correct pair.', translation: tri('Vyberi pravilnuyu paru.', 'Obery pravylnu paru.', 'Elige la pareja correcta.'), options: ['Do you have any questions? / Would you like some tea?', 'Do you have some questions? / Would you like any tea?', 'Do you have no questions? / Would you like no tea?', 'Do you have anything questions? / Would you like something tea?'], correctAnswer: 'Do you have any questions? / Would you like some tea?', correctFeedback: tri('Da. Neutral question = any questions. Offer = some tea.', 'Tak. Neutral question = any questions. Offer = some tea.', 'Si. Pregunta neutral = any questions. Oferta = some tea.'), wrong: {}, retry: retry('Neutral question = any. Offer = some.'), focusWords: ['any', 'some'] }),
    qStep({ id: 'some_any_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Vyberi pravilnoe predlozhenie.', 'Obery pravylne rechennia.', 'Elige la oracion correcta.'), options: ["I need something to drink, but I don't want any coffee.", "I need anything to drink, but I don't want some coffee.", "I need nothing to drink, but I don't want no coffee.", "I need any to drink, but I don't want something coffee."], correctAnswer: "I need something to drink, but I don't want any coffee.", correctFeedback: tri('Da. Positive need = something. Negative after dont = any coffee.', 'Tak. Positive need = something. Negative after dont = any coffee.', 'Si. Necesidad positiva = something. Negacion despues de dont = any coffee.'), wrong: {}, retry: retry('Positive need = something. Dont want = any.'), focusWords: ['something', 'any'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['some_in_negative_error', 'any_in_positive_quantity_error', 'any_offer_error', 'some_neutral_question_error', 'any_as_anyone_anything_confusion', 'no_not_any_confusion', 'double_negative_any_error', 'any_any_choice_error'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Pokazyvaem tip frazy.', 'Pokazuiemo typ frazy.', 'Mostramos el tipo de frase.'),
    depth2: tri('Proshche: positive, negative ili neutral question?', 'Prostishe: positive, negative chy neutral question?', 'Mas simple: positiva, negativa o pregunta neutral?'),
    depth3: tri('Gotovye bloki: some time / any time / would you like some.', 'Hotovi bloky: some time / any time / would you like some.', 'Bloques listos: some time / any time / would you like some.'),
    depth4: tri('Pochti podskazka: priamo ukazyvaem some ili any.', 'Maizhe pidkazka: priamo vkazuiemo some chy any.', 'Casi pista: indicamos some o any.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Positive amount = some. Negative after dont/not = any. Neutral question = any. Offer/request = some. Free choice = any.', 'Positive amount = some. Negative after dont/not = any. Neutral question = any. Offer/request = some. Free choice = any.', 'Cantidad positiva = some. Negacion despues de dont/not = any. Pregunta neutral = any. Oferta/peticion = some. Eleccion libre = any.') },
    afterThreeWrongInSameExercise: { action: 'show_sentence_type_hint_then_retry', card: tri('Sistema pokazhet sentence type, no ne vyberet some/any.', 'Systema pokazhe sentence type, ale ne obere some/any.', 'El sistema muestra el tipo de frase, pero no elige some/any.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Guided mode: snachala vyberi situation type, potom some/any/no.', 'Guided mode: spershu obery situation type, potim some/any/no.', 'Modo guiado: primero elige tipo de situacion, luego some/any/no.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_some_any_001', prompt: tri('I have ___ free time: positive ili negative?', 'I have ___ free time: positive chy negative?', 'I have ___ free time: positiva o negativa?'), options: ['positive', 'negative'], correctIndex: 0, thenReturnToExerciseId: 'some_any_easy_001' },
      { id: 'guided_some_any_002', prompt: tri("I don't have ___ money: est dont?", "I don't have ___ money: ye dont?", "I don't have ___ money: hay dont?"), options: ['yes', 'no'], correctIndex: 0, thenReturnToExerciseId: 'some_any_easy_003' },
      { id: 'guided_some_any_003', prompt: tri('Would you like ___ coffee: neutral question ili offer?', 'Would you like ___ coffee: neutral question chy offer?', 'Would you like ___ coffee: pregunta neutral u oferta?'), options: ['neutral question', 'offer'], correctIndex: 1, thenReturnToExerciseId: 'some_any_contrast_004' },
      { id: 'guided_some_any_004', prompt: tri('Choose ___ lesson: smysl any lesson bez limita?', 'Choose ___ lesson: sens any lesson bez limita?', 'Choose ___ lesson: sentido cualquier leccion sin limite?'), options: ['yes', 'no'], correctIndex: 0, thenReturnToExerciseId: 'some_any_mixed_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'determiner',
    microDiagnosisId: 'quantifier_some_any',
    diagnosisLabel: tri('Some / Any', 'Some / Any', 'Some / Any'),
    contrastSet: ['some', 'any', 'no', 'not any', 'something', 'anything'],
    focusWords: ['some', 'any', 'no', 'something', 'anything'],
    focusPatterns: ['some_positive_statement', 'some_positive_plural', 'any_negative', 'any_neutral_question', 'any_negative_plural', 'no_vs_not_any', 'some_offer', 'some_request', 'some_offer_plural', 'any_choice_any', 'something_positive', 'anything_negative', 'mixed_some_any_pair', 'mixed_question_offer', 'mixed_sentence_correction'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_quantifier_some_any_start',
    answer: 'diagnosis_training_quantifier_some_any_answer',
    mastery: 'diagnosis_training_quantifier_some_any_mastery',
    fallback: 'diagnosis_training_quantifier_some_any_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'determiner', microDiagnosisId: 'quantifier_some_any', contrastSet: ['some', 'any', 'no', 'not any', 'something', 'anything'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logSentenceType: true, logQuantifier: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=determiner&microDiagnosisId=quantifier_some_any',
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



