import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk: string, es: string): TriText => ({ ru, uk, es });

const DEMO_CONTRAST = ['this', 'that', 'these', 'those', 'singular', 'plural', 'near', 'far'];

function demoWrong(correct: string): Record<string, TriText> {
  return {
    This: tri(`This ne podhodit zdes. Nuzhen ${correct}: prover singular/plural i near/far.`, `This ne pidkhodyt tut. Potriben ${correct}: perevir singular/plural i near/far.`, `This no encaja aqui. Necesitamos ${correct}: revisa singular/plural y near/far.`),
    That: tri(`That ne podhodit zdes. Nuzhen ${correct}: prover singular/plural i near/far.`, `That ne pidkhodyt tut. Potriben ${correct}: perevir singular/plural i near/far.`, `That no encaja aqui. Necesitamos ${correct}: revisa singular/plural y near/far.`),
    These: tri(`These ne podhodit zdes. Nuzhen ${correct}: prover singular/plural i near/far.`, `These ne pidkhodyt tut. Potriben ${correct}: perevir singular/plural i near/far.`, `These no encaja aqui. Necesitamos ${correct}: revisa singular/plural y near/far.`),
    Those: tri(`Those ne podhodit zdes. Nuzhen ${correct}: prover singular/plural i near/far.`, `Those ne pidkhodyt tut. Potriben ${correct}: perevir singular/plural i near/far.`, `Those no encaja aqui. Necesitamos ${correct}: revisa singular/plural y near/far.`),
    this: tri(`This ne podhodit zdes. Nuzhen ${correct}: prover noun number i distance.`, `This ne pidkhodyt tut. Potriben ${correct}: perevir noun number i distance.`, `This no encaja aqui. Necesitamos ${correct}: revisa noun number y distance.`),
    that: tri(`That ne podhodit zdes. Nuzhen ${correct}: prover noun number i distance.`, `That ne pidkhodyt tut. Potriben ${correct}: perevir noun number i distance.`, `That no encaja aqui. Necesitamos ${correct}: revisa noun number y distance.`),
    these: tri(`These ne podhodit zdes. Nuzhen ${correct}: prover noun number i distance.`, `These ne pidkhodyt tut. Potriben ${correct}: perevir noun number i distance.`, `These no encaja aqui. Necesitamos ${correct}: revisa noun number y distance.`),
    those: tri(`Those ne podhodit zdes. Nuzhen ${correct}: prover noun number i distance.`, `Those ne pidkhodyt tut. Potriben ${correct}: perevir noun number i distance.`, `Those no encaja aqui. Necesitamos ${correct}: revisa noun number y distance.`),
    Any: tri(`Any znachit any/cualquier, no zdes nuzhen demonstrative ${correct}.`, `Any oznachaie any/cualquier, ale tut potriben demonstrative ${correct}.`, `Any significa cualquier, pero aqui necesitamos demonstrative ${correct}.`),
    them: tri(`Them eto object pronoun, ne determiner pered noun. Nuzhen ${correct}.`, `Them tse object pronoun, ne determiner pered noun. Potriben ${correct}.`, `Them es object pronoun, no determiner antes de noun. Necesitamos ${correct}.`),
    Them: tri(`Them eto object pronoun. Dlya ukazaniya na predmet nuzhen ${correct}.`, `Them tse object pronoun. Dlia vkazannia na predmet potriben ${correct}.`, `Them es object pronoun. Para senalar la cosa necesitamos ${correct}.`),
    It: tri(`It = one thing. Esli predmetov mnogo, nuzhna plural demonstrative forma: ${correct}.`, `It = one thing. Yakshcho predmetiv bahato, potribna plural demonstrative forma: ${correct}.`, `It = una cosa. Si hay varias, necesitamos forma plural demonstrative: ${correct}.`),
  };
}

function retry(line: string): [TriText, TriText, TriText, TriText] {
  return [
    tri(line, line, line),
    tri('Sdelai dve proverki: one or many? near or far?', 'Zroby dvi perevirky: one or many? near or far?', 'Haz dos comprobaciones: one or many? near or far?'),
    tri('Table: this book / that book / these books / those books.', 'Table: this book / that book / these books / those books.', 'Tabla: this book / that book / these books / those books.'),
    tri('Pochti podskazka: vyberi formu po number + distance.', 'Maizhe pidkazka: obery formu za number + distance.', 'Casi pista: elige la forma por number + distance.'),
  ];
}

function demoStep(input: {
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
  context?: TriText;
}): DiagnosisTrainingStep {
  const wrong = { ...demoWrong(input.correctAnswer), ...(input.wrong ?? {}) };
  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: input.translation,
    explanationBlock: input.context ?? tri(
      'Snachala prover noun number, potom distance ot speaker.',
      'Spershu perevir noun number, potim distance vid speaker.',
      'Primero revisa noun number, luego distance desde el hablante.',
    ),
    microTask: tri(
      'Vyberi this, that, these ili those.',
      'Obery this, that, these abo those.',
      'Elige this, that, these o those.',
    ),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, wrong[option] ?? tri(
        `Ne sovsem. Zdes nuzhen "${input.correctAnswer}": number + distance reshayut vybor.`,
        `Ne zovsim. Tut potriben "${input.correctAnswer}": number + distance vyrishuiut vybir.`,
        `No exactamente. Aqui necesitamos "${input.correctAnswer}": number + distance deciden.`,
      )])),
    retryFeedback: retry(input.retryLine),
    fallbackExplanation: tri(
      'This = one near. That = one far. These = many near. Those = many far.',
      'This = one near. That = one far. These = many near. Those = many far.',
      'This = one near. That = one far. These = many near. Those = many far.',
    ),
    focusWords: input.focusWords,
  };
}

export const DETERMINER_THIS_THAT_THESE_THOSE_TRAINING: DiagnosisTraining = {
  id: 'determiner_this_that_these_those',
  category: 'determiner',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 19,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('This / That / These / Those: blizko, daleko, odin ili mnogo', 'This / That / These / Those: blyzko, daleko, odyn chy bahato', 'This / That / These / Those: cerca, lejos, uno o varios'),
  shortTitle: tri('This / That / These / Those', 'This / That / These / Those', 'This / That / These / Those'),
  shortDiagnosis: tri('Ty putaesh this, that, these i those.', 'Ty plutaiesh this, that, these i those.', 'Confundes this, that, these y those.'),
  diagnosisText: tri(
    'Ty putaesh demonstratives. Angliiskii trebuet dve proverki: odin predmet ili mnogo, i predmet blizko ili daleko ot speaker.',
    'Ty plutaiesh demonstratives. Anhliiska potrebuie dvi perevirky: odyn predmet chy bahato, i predmet blyzko chy daleko vid speaker.',
    'Confundes demonstratives. El ingles exige dos comprobaciones: una cosa o varias, y cerca o lejos del hablante.',
  ),
  mentalModel: tri(
    'This = odin predmet ryadom. That = odin predmet daleko. These = neskolko predmetov ryadom. Those = neskolko predmetov daleko.',
    'This = odyn predmet poruch. That = odyn predmet daleko. These = kilka predmetiv poruch. Those = kilka predmetiv daleko.',
    'This = una cosa cerca. That = una cosa lejos. These = varias cosas cerca. Those = varias cosas lejos.',
  ),
  contrastSet: DEMO_CONTRAST,
  coreRule: tri(
    'this phone = odin phone ryadom. that phone = odin phone daleko. these phones = phones ryadom. those phones = phones daleko.',
    'this phone = odyn phone poruch. that phone = odyn phone daleko. these phones = phones poruch. those phones = phones daleko.',
    'this phone = este telefono cerca. that phone = ese telefono lejos. these phones = estos telefonos cerca. those phones = esos telefonos lejos.',
  ),
  whatUserMustLearn: {
    ru: ['This + singular near.', 'That + singular far.', 'These + plural near.', 'Those + plural far.', 'This/that require singular noun.', 'These/those require plural noun.', 'Ne this books i ne these book.', 'This/that can stand alone: This is good.', 'These/those can stand alone: These are mine.', 'Time: this week = current period, that day = known/past period.'],
    uk: ['This + singular near.', 'That + singular far.', 'These + plural near.', 'Those + plural far.', 'This/that require singular noun.', 'These/those require plural noun.', 'Ne this books i ne these book.', 'This/that can stand alone: This is good.', 'These/those can stand alone: These are mine.', 'Time: this week = current period, that day = known/past period.'],
    es: ['This + singular near.', 'That + singular far.', 'These + plural near.', 'Those + plural far.', 'This/that necesitan singular noun.', 'These/those necesitan plural noun.', 'No this books ni these book.', 'This/that pueden ir solos: This is good.', 'These/those pueden ir solos: These are mine.', 'Tiempo: this week = periodo actual, that day = periodo conocido/pasado.'],
  },
  examples: [
    { en: 'This book is useful.', ru: 'Eta kniga poleznaya.', uk: 'Tsia knyha korysna.', es: 'Este libro es util.', why: tri('Book = one near, znachit this.', 'Book = one near, otzhe this.', 'Book = one near, por eso this.') },
    { en: 'That book is expensive.', ru: 'Ta kniga dorogaya.', uk: 'Ta knyha doroha.', es: 'Ese/aquel libro es caro.', why: tri('Book = one far, znachit that.', 'Book = one far, otzhe that.', 'Book = one far, por eso that.') },
    { en: 'These books are useful.', ru: 'Eti knigi poleznye.', uk: 'Tsi knyhy korysni.', es: 'Estos libros son utiles.', why: tri('Books = plural near, znachit these.', 'Books = plural near, otzhe these.', 'Books = plural near, por eso these.') },
    { en: 'Those books are expensive.', ru: 'Te knigi dorogie.', uk: 'Ti knyhy dorohi.', es: 'Esos/aquellos libros son caros.', why: tri('Books = plural far, znachit those.', 'Books = plural far, otzhe those.', 'Books = plural far, por eso those.') },
    { en: 'This is my phone.', ru: 'Eto moi telefon.', uk: 'Tse mii telefon.', es: 'Este es mi telefono.', why: tri('This can stand alone for one near thing.', 'This can stand alone for one near thing.', 'This puede ir solo para una cosa cerca.') },
    { en: 'Those are not my keys.', ru: 'Te klyuchi ne moi.', uk: 'Ti kliuchi ne moi.', es: 'Esas no son mis llaves.', why: tri('Those stands alone for plural far things.', 'Those stands alone for plural far things.', 'Those va solo para varias cosas lejos.') },
    { en: "I don't understand this question.", ru: 'Ya ne ponimayu etot vopros.', uk: 'Ya ne rozumiiu tse pytannia.', es: 'No entiendo esta pregunta.', why: tri('Question = one current thing before us: this question.', 'Question = one current thing before us: this question.', 'Question = una cosa actual delante: this question.') },
    { en: 'Do you remember that day?', ru: 'Ty pomnish tot den?', uk: 'Ty pamiataiesh toi den?', es: 'Recuerdas aquel dia?', why: tri('That day points to a known or distant day in the past.', 'That day points to a known or distant day in the past.', 'That day senala un dia conocido o lejano en el pasado.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Ne perevodi tolko kak etot/tot. Snachala prover: one or many, near or far.', 'Ne perekladai lyshe yak tsei/toi. Spershu perevir: one or many, near or far.', 'No traduzcas solo como este/ese. Primero revisa: one or many, near or far.') },
    { id: 'intro_rule', type: 'rule', text: tri('Map: this = one near, that = one far, these = many near, those = many far.', 'Map: this = one near, that = one far, these = many near, those = many far.', 'Mapa: this = one near, that = one far, these = many near, those = many far.') },
    { id: 'intro_warning', type: 'warning', text: tri('Main error: number. This book, but these books. That lesson, but those lessons.', 'Main error: number. This book, but these books. That lesson, but those lessons.', 'Error principal: number. This book, pero these books. That lesson, pero those lessons.') },
  ],
  steps: [
    demoStep({ id: 'demo_easy_001', order: 1, difficulty: 'easy', targetSkill: 'this_singular_near', sentence: '___ book is useful.', translation: tri('Eta kniga poleznaya.', 'Tsia knyha korysna.', 'Este libro es util.'), context: tri('Book ryadom so speaker.', 'Book poruch iz speaker.', 'El libro esta cerca del hablante.'), options: ['This', 'These', 'Those', 'Any'], correctAnswer: 'This', correctFeedback: tri('Da. Book = one near. One near = this.', 'Tak. Book = one near. One near = this.', 'Si. Book = one near. One near = this.'), wrong: { These: tri('These is plural: these books. Zdes one book, so this.', 'These is plural: these books. Tut one book, so this.', 'These es plural: these books. Aqui hay one book, por eso this.'), Those: tri('Those is plural far: those books. Zdes one book near, so this.', 'Those is plural far: those books. Tut one book near, so this.', 'Those es plural lejos: those books. Aqui hay one book near, por eso this.') }, retryLine: 'One book near = this book.', focusWords: ['this'] }),
    demoStep({ id: 'demo_easy_002', order: 2, difficulty: 'easy', targetSkill: 'that_singular_far', sentence: '___ house is beautiful.', translation: tri('Tot dom krasivyi.', 'Toi budynok krasyvyi.', 'Esa/aquella casa es bonita.'), context: tri('House daleko ot speaker.', 'House daleko vid speaker.', 'La casa esta lejos del hablante.'), options: ['This', 'That', 'These', 'Those'], correctAnswer: 'That', correctFeedback: tri('Da. House = one far. One far = that.', 'Tak. House = one far. One far = that.', 'Si. House = one far. One far = that.'), wrong: { This: tri('This = one near. House is far, so that.', 'This = one near. House is far, so that.', 'This = one near. House esta lejos, por eso that.'), Those: tri('Those = plural far. House is singular, so that.', 'Those = plural far. House is singular, so that.', 'Those = plural far. House es singular, por eso that.') }, retryLine: 'One house far = that house.', focusWords: ['that'] }),
    demoStep({ id: 'demo_easy_003', order: 3, difficulty: 'easy', targetSkill: 'this_singular_near', sentence: "I don't understand ___ question.", translation: tri('Ya ne ponimayu etot vopros.', 'Ya ne rozumiiu tse pytannia.', 'No entiendo esta pregunta.'), context: tri('Question pryamo seichas pered student.', 'Question pryamo zaraz pered student.', 'La pregunta esta justo ahora delante del alumno.'), options: ['this', 'these', 'those', 'them'], correctAnswer: 'this', correctFeedback: tri('Da. Question = one current thing before us. Use this question.', 'Tak. Question = one current thing before us. Use this question.', 'Si. Question = one current thing before us. Usa this question.'), wrong: { these: tri('These needs plural noun: these questions. Here question is singular, so this.', 'These needs plural noun: these questions. Here question is singular, so this.', 'These necesita plural noun: these questions. Aqui question es singular, por eso this.'), those: tri('Those needs plural and usually far distance. Here one current question = this.', 'Those needs plural and usually far distance. Here one current question = this.', 'Those necesita plural y distancia lejana. Aqui one current question = this.') }, retryLine: 'Current singular question = this question.', focusWords: ['this'] }),
    demoStep({ id: 'demo_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'these_plural_near', sentence: '___ books are useful.', translation: tri('Eti knigi poleznye.', 'Tsi knyhy korysni.', 'Estos libros son utiles.'), context: tri('Books ryadom so speaker.', 'Books poruch iz speaker.', 'Los libros estan cerca del hablante.'), options: ['This', 'That', 'These', 'Those'], correctAnswer: 'These', correctFeedback: tri('Da. Books = plural near. Many near = these.', 'Tak. Books = plural near. Many near = these.', 'Si. Books = plural near. Many near = these.'), wrong: { This: tri('This is singular: this book. Here books is plural, so use these books.', 'This is singular: this book. Here books is plural, so use these books.', 'This es singular: this book. Aqui books es plural, por eso these books.'), That: tri('That is singular: that book. Here books is plural and near, so these.', 'That is singular: that book. Here books is plural and near, so these.', 'That es singular: that book. Aqui books es plural y cerca, por eso these.'), Those: tri('Those = plural far. Books are near, so these.', 'Those = plural far. Books are near, so these.', 'Those = plural far. Books estan cerca, por eso these.') }, retryLine: 'Books = plural. Near = these.', focusWords: ['these'] }),
    demoStep({ id: 'demo_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'those_plural_far', sentence: '___ shoes are too expensive.', translation: tri('Te tufli slishkom dorogie.', 'Ti tufli zanadto dorohi.', 'Esos zapatos son demasiado caros.'), context: tri('Shoes daleko ot speaker.', 'Shoes daleko vid speaker.', 'Los zapatos estan lejos del hablante.'), options: ['This', 'That', 'These', 'Those'], correctAnswer: 'Those', correctFeedback: tri('Da. Shoes = plural far. Many far = those.', 'Tak. Shoes = plural far. Many far = those.', 'Si. Shoes = plural far. Many far = those.'), wrong: { This: tri('This = singular near. Shoes is plural, so not this.', 'This = singular near. Shoes is plural, so not this.', 'This = singular near. Shoes es plural, por eso no this.'), That: tri('That = one far. Shoes are plural, so use those shoes.', 'That = one far. Shoes are plural, so use those shoes.', 'That = one far. Shoes es plural, por eso those shoes.'), These: tri('These = plural near. Shoes are far, so those.', 'These = plural near. Shoes are far, so those.', 'These = plural near. Shoes estan lejos, por eso those.') }, retryLine: 'Shoes = plural. Far = those.', focusWords: ['those'] }),
    demoStep({ id: 'demo_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'these_plural_near', sentence: 'I like ___ examples.', translation: tri('Mne nravyatsya eti primery.', 'Meni podobaiutsia tsi pryklady.', 'Me gustan estos ejemplos.'), context: tri('Examples v current lesson.', 'Examples v current lesson.', 'Los ejemplos estan en la leccion actual.'), options: ['this', 'that', 'these', 'those'], correctAnswer: 'these', correctFeedback: tri('Da. Examples = plural and current/near. Use these examples.', 'Tak. Examples = plural and current/near. Use these examples.', 'Si. Examples = plural and current/near. Usa these examples.'), wrong: { this: tri('This = singular: this example. Here examples is plural, so these.', 'This = singular: this example. Here examples is plural, so these.', 'This = singular: this example. Aqui examples es plural, por eso these.'), that: tri('That = singular: that example. Here examples is plural, so these.', 'That = singular: that example. Here examples is plural, so these.', 'That = singular: that example. Aqui examples es plural, por eso these.'), those: tri('Those usually marks plural far. These examples are current/near, so these.', 'Those usually marks plural far. These examples are current/near, so these.', 'Those suele marcar plural lejos. Estos ejemplos son actuales/cerca, por eso these.') }, retryLine: 'Examples plural and current = these examples.', focusWords: ['these'] }),
    demoStep({ id: 'demo_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'this_singular_agreement', sentence: 'Choose the correct phrase.', translation: tri('Vyberi pravilnuyu frazu.', 'Obery pravylnu frazu.', 'Elige la frase correcta.'), options: ['this lesson', 'this lessons', 'these lesson', 'those lesson'], correctAnswer: 'this lesson', correctFeedback: tri('Da. This requires singular noun: this lesson.', 'Tak. This requires singular noun: this lesson.', 'Si. This necesita singular noun: this lesson.'), retryLine: 'This/that + singular. These/those + plural.', focusWords: ['this'] }),
    demoStep({ id: 'demo_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'these_plural_agreement', sentence: 'Choose the correct phrase.', translation: tri('Vyberi pravilnuyu frazu.', 'Obery pravylnu frazu.', 'Elige la frase correcta.'), options: ['these lessons', 'these lesson', 'this lessons', 'that lessons'], correctAnswer: 'these lessons', correctFeedback: tri('Da. These requires plural noun: these lessons.', 'Tak. These requires plural noun: these lessons.', 'Si. These necesita plural noun: these lessons.'), retryLine: 'Lessons plural. Plural near = these lessons.', focusWords: ['these'] }),
    demoStep({ id: 'demo_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'those_plural_agreement', sentence: 'Choose the correct phrase.', translation: tri('Vyberi pravilnuyu frazu.', 'Obery pravylnu frazu.', 'Elige la frase correcta.'), options: ['those people', 'that people', 'this people', 'those person'], correctAnswer: 'those people', correctFeedback: tri('Da. People works as plural. Plural far = those people.', 'Tak. People works as plural. Plural far = those people.', 'Si. People funciona como plural. Plural far = those people.'), retryLine: 'People = plural. Plural far = those.', focusWords: ['those'] }),
    demoStep({ id: 'demo_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'standalone_this_is', sentence: '___ is my phone.', translation: tri('Eto moi telefon.', 'Tse mii telefon.', 'Este es mi telefono.'), context: tri('Phone ryadom so speaker.', 'Phone poruch iz speaker.', 'El telefono esta cerca del hablante.'), options: ['This', 'These', 'Those', 'Them'], correctAnswer: 'This', correctFeedback: tri('Da. One thing near, standalone: this is.', 'Tak. One thing near, standalone: this is.', 'Si. One thing near, standalone: this is.'), wrong: { These: tri('These = plural and needs are: These are. Here one phone, so This is.', 'These = plural and needs are: These are. Here one phone, so This is.', 'These = plural y necesita are: These are. Aqui one phone, por eso This is.'), Those: tri('Those = plural far. Here one phone near, so This.', 'Those = plural far. Here one phone near, so This.', 'Those = plural far. Aqui one phone near, por eso This.') }, retryLine: 'One near thing = this. After this goes is.', focusWords: ['this'] }),
    demoStep({ id: 'demo_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'standalone_these_are', sentence: '___ are my keys.', translation: tri('Eto moi klyuchi.', 'Tse moi kliuchi.', 'Estas son mis llaves.'), context: tri('Keys ryadom so speaker.', 'Keys poruch iz speaker.', 'Las llaves estan cerca del hablante.'), options: ['This', 'That', 'These', 'It'], correctAnswer: 'These', correctFeedback: tri('Da. Keys = plural near. Use these are.', 'Tak. Keys = plural near. Use these are.', 'Si. Keys = plural near. Usa these are.'), wrong: { This: tri('This = one thing and usually this is. Keys are plural, so these are.', 'This = one thing and usually this is. Keys are plural, so these are.', 'This = one thing y normalmente this is. Keys es plural, por eso these are.'), That: tri('That = one thing far and goes with is. Keys are plural, so these are.', 'That = one thing far and goes with is. Keys are plural, so these are.', 'That = one thing far y va con is. Keys es plural, por eso these are.') }, retryLine: 'Keys plural near = these are.', focusWords: ['these'] }),
    demoStep({ id: 'demo_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'standalone_those_are', sentence: '___ are not my bags.', translation: tri('Te sumki ne moi.', 'Ti sumky ne moi.', 'Esas no son mis bolsas.'), context: tri('Bags daleko ot speaker.', 'Bags daleko vid speaker.', 'Las bolsas estan lejos del hablante.'), options: ['That', 'This', 'Those', 'It'], correctAnswer: 'Those', correctFeedback: tri('Da. Bags = plural far. Use those are.', 'Tak. Bags = plural far. Use those are.', 'Si. Bags = plural far. Usa those are.'), wrong: { That: tri('That = one far. Bags are plural, so those.', 'That = one far. Bags are plural, so those.', 'That = one far. Bags es plural, por eso those.'), This: tri('This = one near. Bags are plural and far, so those.', 'This = one near. Bags are plural and far, so those.', 'This = one near. Bags es plural y lejos, por eso those.') }, retryLine: 'Bags plural far = those are.', focusWords: ['those'] }),
    demoStep({ id: 'demo_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'time_this_current', sentence: 'I am busy ___ week.', translation: tri('Ya zanyat na etoi nedele.', 'Ya zainiatyi tsoho tyzhnia.', 'Estoy ocupado esta semana.'), context: tri('Current week.', 'Current week.', 'Semana actual.'), options: ['this', 'that', 'these', 'those'], correctAnswer: 'this', correctFeedback: tri('Da. Current week = this week.', 'Tak. Current week = this week.', 'Si. Current week = this week.'), wrong: { that: tri('That week usually means an mentioned/past/future week. Current week = this week.', 'That week usually means an mentioned/past/future week. Current week = this week.', 'That week suele ser una semana mencionada/pasada/futura. Current week = this week.') }, retryLine: 'Current period = this.', focusWords: ['this'] }),
    demoStep({ id: 'demo_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'time_that_past_reference', sentence: 'I will never forget ___ day.', translation: tri('Ya nikogda ne zabudu tot den.', 'Ya nikoly ne zabudu toi den.', 'Nunca olvidare aquel dia.'), context: tri('Important day in the past, clear from context.', 'Important day in the past, clear from context.', 'Dia importante del pasado, claro por contexto.'), options: ['this', 'that', 'these', 'those'], correctAnswer: 'that', correctFeedback: tri('Da. Day = singular, known/distant in the past. Use that day.', 'Tak. Day = singular, known/distant in the past. Use that day.', 'Si. Day = singular, known/distant in the past. Usa that day.'), wrong: { this: tri('This day sounds current/near. Here it is a known past day, so that.', 'This day sounds current/near. Here it is a known past day, so that.', 'This day suena actual/cercano. Aqui es dia pasado conocido, por eso that.') }, retryLine: 'One known day in the past = that day.', focusWords: ['that'] }),
    demoStep({ id: 'demo_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_demonstrative_pair', sentence: 'Choose the correct pair.', translation: tri('Vyberi pravilnuyu paru.', 'Obery pravylnu paru.', 'Elige la pareja correcta.'), options: ['this book / these books', 'this books / these book', 'that books / those book', 'these book / those book'], correctAnswer: 'this book / these books', correctFeedback: tri('Da. This + singular book. These + plural books.', 'Tak. This + singular book. These + plural books.', 'Si. This + singular book. These + plural books.'), retryLine: 'This/that one. These/those many.', focusWords: ['this', 'these'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['this_plural_error', 'these_singular_error', 'that_plural_error', 'those_singular_error', 'near_far_confusion', 'standalone_this_these_agreement_error', 'be_agreement_with_demonstrative_error', 'time_reference_this_that_error'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Pokazyvaem noun number i distance.', 'Pokazuiemo noun number i distance.', 'Mostramos noun number y distance.'),
    depth2: tri('Proshche: one or many? near or far?', 'Prostishe: one or many? near or far?', 'Mas simple: one or many? near or far?'),
    depth3: tri('Table: this book / that book / these books / those books.', 'Table: this book / that book / these books / those books.', 'Tabla: this book / that book / these books / those books.'),
    depth4: tri('Pochti podskazka: priamo ukazyvaem this/that/these/those.', 'Maizhe pidkazka: priamo vkazuiemo this/that/these/those.', 'Casi pista: indicamos this/that/these/those.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('One near = this. One far = that. Many near = these. Many far = those.', 'One near = this. One far = that. Many near = these. Many far = those.', 'One near = this. One far = that. Many near = these. Many far = those.') },
    afterThreeWrongInSameExercise: { action: 'show_number_distance_hint_then_retry', card: tri('Sistema pokazhet number i distance, no ne vyberet formu.', 'Systema pokazhe number i distance, ale ne obere formu.', 'El sistema muestra number y distance, pero no elige la forma.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Guided mode: first one/many, then near/far.', 'Guided mode: first one/many, then near/far.', 'Modo guiado: primero one/many, luego near/far.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_demo_001', prompt: tri('Book = one thing or many?', 'Book = one thing or many?', 'Book = one thing or many?'), options: ['one', 'many'], correctIndex: 0, thenReturnToExerciseId: 'demo_easy_001' },
      { id: 'guided_demo_002', prompt: tri('Books = one thing or many?', 'Books = one thing or many?', 'Books = one thing or many?'), options: ['one', 'many'], correctIndex: 1, thenReturnToExerciseId: 'demo_contrast_001' },
      { id: 'guided_demo_003', prompt: tri('One thing far: this or that?', 'One thing far: this or that?', 'One thing far: this or that?'), options: ['this', 'that'], correctIndex: 1, thenReturnToExerciseId: 'demo_easy_002' },
      { id: 'guided_demo_004', prompt: tri('Many things near: these or those?', 'Many things near: these or those?', 'Many things near: these or those?'), options: ['these', 'those'], correctIndex: 0, thenReturnToExerciseId: 'demo_contrast_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'determiner',
    microDiagnosisId: 'determiner_this_that_these_those',
    diagnosisLabel: tri('This / That / These / Those', 'This / That / These / Those', 'This / That / These / Those'),
    contrastSet: DEMO_CONTRAST,
    focusWords: ['this', 'that', 'these', 'those'],
    focusPatterns: ['this_singular_near', 'that_singular_far', 'these_plural_near', 'those_plural_far', 'this_singular_agreement', 'these_plural_agreement', 'those_plural_agreement', 'standalone_this_is', 'standalone_these_are', 'standalone_those_are', 'time_this_current', 'time_that_past_reference', 'mixed_demonstrative_pair'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_determiner_demonstrative_start',
    answer: 'diagnosis_training_determiner_demonstrative_answer',
    mastery: 'diagnosis_training_determiner_demonstrative_mastery',
    fallback: 'diagnosis_training_determiner_demonstrative_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'determiner', microDiagnosisId: 'determiner_this_that_these_those', contrastSet: ['this', 'that', 'these', 'those'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logNounNumber: true, logDistance: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=determiner&microDiagnosisId=determiner_this_that_these_those',
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


