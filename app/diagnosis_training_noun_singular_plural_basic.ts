import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk: string, es: string): TriText => ({ ru, uk, es });

const CONTRAST = ['singular noun', 'plural noun', '-s plural', '-es plural', '-ies plural', 'irregular plural', 'uncountable noun'];

function retry(line: string): [TriText, TriText, TriText, TriText] {
  return [
    tri(line, line, line),
    tri('Ask first: one thing or several things?', 'Ask first: one thing or several things?', 'Primero pregunta: una cosa o varias?'),
    tri('Blocks: a book / two books / this lesson / these lessons.', 'Blocks: a book / two books / this lesson / these lessons.', 'Bloques: a book / two books / this lesson / these lessons.'),
    tri('Hint: choose singular or plural from the signal before the noun.', 'Hint: choose singular or plural from the signal before the noun.', 'Pista: elige singular o plural por la senal antes del noun.'),
  ];
}

function baseWrong(correct: string): Record<string, TriText> {
  const msg = (option: string) => tri(
    `${option} ne podhodit. Nuzhno ${correct}: signal before the noun tells singular, plural, or uncountable.`,
    `${option} ne pidkhodyt. Potribno ${correct}: signal before the noun tells singular, plural, or uncountable.`,
    `${option} no encaja. Necesitamos ${correct}: la senal antes del noun marca singular, plural o uncountable.`,
  );
  return Object.fromEntries([
    'book', 'books', 'bookes', 'booking', "book's",
    'question', 'questions', "question's", 'questioning',
    'This', 'These', 'Those', 'Many', 'That', 'A',
    'mistake', 'mistakes', "mistake's", 'mistaking',
    'box', 'boxs', 'boxes', 'boxies',
    'story', 'storys', 'stories', 'storyes',
    'watch', 'watchs', 'watches', 'watchies',
    'child', 'childs', 'children', 'childrens',
    'person', 'persons', 'people', 'peoples',
    'information', 'informations', 'an information', 'informationes',
  ].map((option) => [option, msg(option)]));
}

function nounStep(input: {
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
      'English needs a clear noun number signal: singular, plural, irregular plural, or uncountable.',
      'English needs a clear noun number signal: singular, plural, irregular plural, or uncountable.',
      'El ingles necesita una senal clara de number: singular, plural, irregular plural o uncountable.',
    ),
    microTask: tri('Choose the correct noun form.', 'Choose the correct noun form.', 'Elige la forma correcta del noun.'),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, wrongFeedback[option] ?? tri(
        `Not this form. Use ${input.correctAnswer}: the signal before the noun controls singular/plural.`,
        `Not this form. Use ${input.correctAnswer}: the signal before the noun controls singular/plural.`,
        `No esta forma. Usa ${input.correctAnswer}: la senal antes del noun controla singular/plural.`,
      )])),
    retryFeedback: retry(input.retryLine),
    fallbackExplanation: tri(
      'A/one/this = singular. Two/many/few/these/those = plural. Information/money/advice/water usually stay without plural -s.',
      'A/one/this = singular. Two/many/few/these/those = plural. Information/money/advice/water usually stay without plural -s.',
      'A/one/this = singular. Two/many/few/these/those = plural. Information/money/advice/water normalmente van sin plural -s.',
    ),
    focusWords: input.focusWords,
  };
}

export const NOUN_SINGULAR_PLURAL_BASIC_TRAINING: DiagnosisTraining = {
  id: 'noun_singular_plural_basic',
  category: 'noun',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 21,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('Book / Books: odin predmet ili neskolko', 'Book / Books: odyn predmet chy kilka', 'Book / Books: una cosa o varias'),
  shortTitle: tri('Singular / Plural Nouns', 'Singular / Plural Nouns', 'Singular / Plural Nouns'),
  shortDiagnosis: tri('Ty putaesh singular i plural nouns.', 'Ty plutaiesh singular i plural nouns.', 'Confundes singular y plural nouns.'),
  diagnosisText: tri(
    'Ty putaesh book/books, question/questions, child/children. English trebuet pokazat one thing or several things i soglasovat noun s article, determiner i verb.',
    'Ty plutaiesh book/books, question/questions, child/children. English vymahaie pokazaty one thing or several things i uzghodyty noun z article, determiner i verb.',
    'Confundes book/books, question/questions, child/children. English exige mostrar one thing or several things y concordar noun con article, demonstrative y verb.',
  ),
  mentalModel: tri(
    'Singular = one thing: a book, this question. Plural = several things: books, these questions. Usually add -s/-es, but some forms are irregular or uncountable.',
    'Singular = one thing: a book, this question. Plural = several things: books, these questions. Usually add -s/-es, but some forms are irregular or uncountable.',
    'Singular = una cosa: a book, this question. Plural = varias: books, these questions. Normalmente -s/-es, pero hay irregular y uncountable.',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'One thing: a book, one question, this lesson. Several things: books, two questions, these lessons. After a/an no plural. After many/two/these use plural.',
    'One thing: a book, one question, this lesson. Several things: books, two questions, these lessons. After a/an no plural. After many/two/these use plural.',
    'Una cosa: a book, one question, this lesson. Varias: books, two questions, these lessons. Despues de a/an no plural. Despues de many/two/these usa plural.',
  ),
  whatUserMustLearn: {
    ru: ['Singular noun for one thing: a book, this lesson.', 'Plural noun for several things: books, two questions.', 'Regular plural often adds -s.', 'After -s/-x/-ch/-sh often add -es.', 'Consonant + y changes to -ies.', 'Some plural forms are irregular: child/children, person/people.', 'After a/an use singular.', 'After numbers above one use plural.', 'After many/few/these/those use plural.', 'Uncountable nouns usually do not take plural -s.'],
    uk: ['Singular noun for one thing: a book, this lesson.', 'Plural noun for several things: books, two questions.', 'Regular plural often adds -s.', 'After -s/-x/-ch/-sh often add -es.', 'Consonant + y changes to -ies.', 'Some plural forms are irregular: child/children, person/people.', 'After a/an use singular.', 'After numbers above one use plural.', 'After many/few/these/those use plural.', 'Uncountable nouns usually do not take plural -s.'],
    es: ['Singular noun para una cosa: a book, this lesson.', 'Plural noun para varias cosas: books, two questions.', 'Regular plural muchas veces anade -s.', 'After -s/-x/-ch/-sh often add -es.', 'Consonant + y cambia a -ies.', 'Algunos plurales son irregular: child/children, person/people.', 'Despues de a/an usa singular.', 'Despues de numeros mayores que uno usa plural.', 'Despues de many/few/these/those usa plural.', 'Uncountable nouns normalmente no llevan plural -s.'],
  },
  examples: [
    { en: 'I have a book.', ru: 'U menya est kniga.', uk: 'U mene ye knyzhka.', es: 'Tengo un libro.', why: tri('A shows one thing. After a use singular noun: book.', 'A shows one thing. After a use singular noun: book.', 'A muestra una cosa. Despues de a usa singular noun: book.') },
    { en: 'I have two books.', ru: 'U menya est dve knigi.', uk: 'U mene ye dvi knyzhky.', es: 'Tengo dos libros.', why: tri('Two shows several things. Use plural noun: books.', 'Two shows several things. Use plural noun: books.', 'Two muestra varias cosas. Usa plural noun: books.') },
    { en: 'These lessons are useful.', ru: 'Eti uroki poleznye.', uk: 'Tsi uroky korysni.', es: 'Estas lecciones son utiles.', why: tri('These requires plural noun: lessons.', 'These requires plural noun: lessons.', 'These necesita plural noun: lessons.') },
    { en: 'This lesson is useful.', ru: 'Etot urok polezny.', uk: 'Tsei urok korysnyi.', es: 'Esta leccion es util.', why: tri('This requires singular noun: lesson.', 'This requires singular noun: lesson.', 'This necesita singular noun: lesson.') },
    { en: 'There are many boxes in the room.', ru: 'V komnate mnogo korobok.', uk: 'U kimnati bahato korobok.', es: 'Hay muchas cajas en la habitacion.', why: tri('Box ends in -x, so plural is boxes.', 'Box ends in -x, so plural is boxes.', 'Box termina en -x, por eso plural is boxes.') },
    { en: 'She told me two stories.', ru: 'Ona rasskazala mne dve istorii.', uk: 'Vona rozpovila meni dvi istorii.', es: 'Me conto dos historias.', why: tri('Story ends in consonant + y, so stories.', 'Story ends in consonant + y, so stories.', 'Story termina en consonant + y, por eso stories.') },
    { en: 'There are many people here.', ru: 'Zdes mnogo lyudei.', uk: 'Tut bahato liudei.', es: 'Hay mucha gente aqui.', why: tri('Person has irregular plural people.', 'Person has irregular plural people.', 'Person tiene plural irregular people.') },
    { en: 'I need some information.', ru: 'Mne nuzhna informatsiya.', uk: 'Meni potribna informatsiia.', es: 'Necesito informacion.', why: tri('Information is uncountable, so no -s.', 'Information is uncountable, so no -s.', 'Information es uncountable, sin -s.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Book and books are different grammar signals. English cannot leave one vs many unclear.', 'Book and books are different grammar signals. English cannot leave one vs many unclear.', 'Book y books son senales diferentes. English no deja uno vs varios borroso.') },
    { id: 'intro_rule', type: 'rule', text: tri('One thing = singular: a book, this lesson. Several = plural: two books, these lessons.', 'One thing = singular: a book, this lesson. Several = plural: two books, these lessons.', 'Una cosa = singular: a book, this lesson. Varias = plural: two books, these lessons.') },
    { id: 'intro_warning', type: 'warning', text: tri('Do not mix signals: a books, two book, these lesson, many question.', 'Do not mix signals: a books, two book, these lesson, many question.', 'No mezcles senales: a books, two book, these lesson, many question.') },
  ],
  steps: [
    nounStep({ id: 'noun_plural_easy_001', order: 1, difficulty: 'easy', targetSkill: 'singular_after_a', sentence: 'I have a ___.', translation: tri('U menya est kniga.', 'U mene ye knyzhka.', 'Tengo un libro.'), options: ['book', 'books', 'bookes', 'booking'], correctAnswer: 'book', correctFeedback: tri('Yes. After a use singular noun: a book.', 'Yes. After a use singular noun: a book.', 'Si. Despues de a usamos singular noun: a book.'), wrong: { books: tri('Books is plural. After a no plural: use a book.', 'Books is plural. After a no plural: use a book.', 'Books es plural. Despues de a no va plural: a book.'), bookes: tri('Bookes is not correct, and after a you need singular: book.', 'Bookes is not correct, and after a you need singular: book.', 'Bookes no es correcto, y despues de a necesitas singular: book.'), booking: tri('Booking is another word/form. Here the noun is book.', 'Booking is another word/form. Here the noun is book.', 'Booking es otra palabra/forma. Aqui necesitamos book.') }, retryLine: 'A = one. One = book.', focusWords: ['a book'] }),
    nounStep({ id: 'noun_plural_easy_002', order: 2, difficulty: 'easy', targetSkill: 'plural_after_number', sentence: 'I have two ___.', translation: tri('U menya est dve knigi.', 'U mene ye dvi knyzhky.', 'Tengo dos libros.'), options: ['book', 'books', "book's", 'booking'], correctAnswer: 'books', correctFeedback: tri('Yes. After two use plural noun: two books.', 'Yes. After two use plural noun: two books.', 'Si. Despues de two usamos plural noun: two books.'), wrong: { book: tri('Book is singular. After two use plural: books.', 'Book is singular. After two use plural: books.', 'Book es singular. Despues de two necesitamos plural: books.'), "book's": tri("Book's is possession/short form, not normal plural. Use books.", "Book's is possession/short form, not normal plural. Use books.", "Book's es posesion/contraccion, no plural normal. Usa books."), booking: tri('Booking is another word. After two use noun plural: books.', 'Booking is another word. After two use noun plural: books.', 'Booking es otra palabra. Despues de two necesitamos plural: books.') }, retryLine: 'Two = more than one. More than one = books.', focusWords: ['two books'] }),
    nounStep({ id: 'noun_plural_easy_003', order: 3, difficulty: 'easy', targetSkill: 'plural_after_many', sentence: 'There are many ___.', translation: tri('Est mnogo voprosov.', 'Ye bahato pytan.', 'Hay muchas preguntas.'), options: ['question', 'questions', "question's", 'questioning'], correctAnswer: 'questions', correctFeedback: tri('Yes. After many use plural noun: many questions.', 'Yes. After many use plural noun: many questions.', 'Si. Despues de many usamos plural noun: many questions.'), wrong: { question: tri('Question is singular. After many use plural: questions.', 'Question is singular. After many use plural: questions.', 'Question es singular. Despues de many necesitamos plural: questions.'), "question's": tri("Question's is not normal plural. Use questions.", "Question's is not normal plural. Use questions.", "Question's no es plural normal. Usa questions."), questioning: tri('Questioning is another form. After many use plural noun: questions.', 'Questioning is another form. After many use plural noun: questions.', 'Questioning es otra forma. Despues de many usa questions.') }, retryLine: 'Many = several items. Use plural.', focusWords: ['many questions'] }),
    nounStep({ id: 'noun_plural_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'this_singular_noun', sentence: '___ lesson is important.', translation: tri('Etot urok vazhny.', 'Tsei urok vazhlyvyi.', 'Esta leccion es importante.'), options: ['This', 'These', 'Those', 'Many'], correctAnswer: 'This', correctFeedback: tri('Yes. Lesson is singular. Use this lesson.', 'Yes. Lesson is singular. Use this lesson.', 'Si. Lesson es singular. Usa this lesson.'), wrong: { These: tri('These requires plural noun: these lessons. Here lesson is singular.', 'These requires plural noun: these lessons. Here lesson is singular.', 'These necesita plural noun: these lessons. Aqui lesson es singular.'), Those: tri('Those requires plural noun: those lessons. Here lesson is singular.', 'Those requires plural noun: those lessons. Here lesson is singular.', 'Those necesita plural noun: those lessons. Aqui lesson es singular.'), Many: tri('Many requires plural noun: many lessons. Here lesson is singular.', 'Many requires plural noun: many lessons. Here lesson is singular.', 'Many necesita plural noun: many lessons. Aqui lesson es singular.') }, retryLine: 'Lesson is one. This lesson.', focusWords: ['this lesson'] }),
    nounStep({ id: 'noun_plural_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'these_plural_noun', sentence: '___ lessons are important.', translation: tri('Eti uroki vazhnye.', 'Tsi uroky vazhlyvi.', 'Estas lecciones son importantes.'), options: ['This', 'These', 'That', 'A'], correctAnswer: 'These', correctFeedback: tri('Yes. Lessons is plural. Use these lessons.', 'Yes. Lessons is plural. Use these lessons.', 'Si. Lessons es plural. Usa these lessons.'), wrong: { This: tri('This requires singular noun: this lesson. Lessons is plural, so these.', 'This requires singular noun: this lesson. Lessons is plural, so these.', 'This necesita singular noun: this lesson. Lessons es plural, por eso these.'), That: tri('That requires singular noun: that lesson. Lessons is plural.', 'That requires singular noun: that lesson. Lessons is plural.', 'That necesita singular noun: that lesson. Lessons es plural.'), A: tri('A cannot go before plural noun. No a lessons.', 'A cannot go before plural noun. No a lessons.', 'A no va antes de plural noun. No a lessons.') }, retryLine: 'Lessons plural. These lessons.', focusWords: ['these lessons'] }),
    nounStep({ id: 'noun_plural_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'plural_after_few', sentence: 'There are few ___ in this text.', translation: tri('V etom texte malo oshibok.', 'U tsomu teksti malo pomylok.', 'Hay pocos errores en este texto.'), options: ['mistake', 'mistakes', "mistake's", 'mistaking'], correctAnswer: 'mistakes', correctFeedback: tri('Yes. Few requires plural noun: few mistakes.', 'Yes. Few requires plural noun: few mistakes.', 'Si. Few necesita plural noun: few mistakes.'), wrong: { mistake: tri('Mistake is singular. After few use plural: mistakes.', 'Mistake is singular. After few use plural: mistakes.', 'Mistake es singular. Despues de few necesitamos plural: mistakes.'), "mistake's": tri("Mistake's is not normal plural. Use mistakes.", "Mistake's is not normal plural. Use mistakes.", "Mistake's no es plural normal. Usa mistakes."), mistaking: tri('Mistaking is another form. After few use plural noun: mistakes.', 'Mistaking is another form. After few use plural noun: mistakes.', 'Mistaking es otra forma. Despues de few usa mistakes.') }, retryLine: 'Few = several items. Use plural.', focusWords: ['few mistakes'] }),
    nounStep({ id: 'noun_plural_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'es_plural_spelling', sentence: 'There are three ___ on the table.', translation: tri('Na stole tri korobki.', 'Na stoli try korobky.', 'Hay tres cajas en la mesa.'), options: ['box', 'boxs', 'boxes', 'boxies'], correctAnswer: 'boxes', correctFeedback: tri('Yes. Box ends in -x. Plural: boxes.', 'Yes. Box ends in -x. Plural: boxes.', 'Si. Box termina en -x. Plural: boxes.'), wrong: { box: tri('After three use plural. Not box, but boxes.', 'After three use plural. Not box, but boxes.', 'Despues de three usa plural. No box, sino boxes.'), boxs: tri('Boxs is incorrect. After -x add -es: boxes.', 'Boxs is incorrect. After -x add -es: boxes.', 'Boxs es incorrecto. Despues de -x anade -es: boxes.'), boxies: tri('Boxies is incorrect. Correct plural is boxes.', 'Boxies is incorrect. Correct plural is boxes.', 'Boxies es incorrecto. Correcto: boxes.') }, retryLine: 'Box + es = boxes.', focusWords: ['boxes'] }),
    nounStep({ id: 'noun_plural_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'ies_plural_spelling', sentence: 'I know two interesting ___.', translation: tri('Ya znayu dve interesnye istorii.', 'Ya znaiu dvi tsikavi istorii.', 'Conozco dos historias interesantes.'), options: ['story', 'storys', 'stories', 'storyes'], correctAnswer: 'stories', correctFeedback: tri('Yes. Story ends in consonant + y. Y changes to ies: stories.', 'Yes. Story ends in consonant + y. Y changes to ies: stories.', 'Si. Story termina en consonant + y. Y cambia a ies: stories.'), wrong: { story: tri('After two use plural. Not story, but stories.', 'After two use plural. Not story, but stories.', 'Despues de two usa plural. No story, sino stories.'), storys: tri('Storys is incorrect. Y changes to ies: stories.', 'Storys is incorrect. Y changes to ies: stories.', 'Storys es incorrecto. Y cambia a ies: stories.'), storyes: tri('Storyes is incorrect. Correct plural is stories.', 'Storyes is incorrect. Correct plural is stories.', 'Storyes es incorrecto. Correcto: stories.') }, retryLine: 'Story -> stories.', focusWords: ['stories'] }),
    nounStep({ id: 'noun_plural_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'es_plural_ch', sentence: 'She has two expensive ___.', translation: tri('U nee dvoe dorogih chasov.', 'U nei dva dorohi hodynnyky.', 'Ella tiene dos relojes caros.'), options: ['watch', 'watchs', 'watches', 'watchies'], correctAnswer: 'watches', correctFeedback: tri('Yes. Watch ends in -ch. Plural: watches.', 'Yes. Watch ends in -ch. Plural: watches.', 'Si. Watch termina en -ch. Plural: watches.'), wrong: { watch: tri('After two use plural. Not watch, but watches.', 'After two use plural. Not watch, but watches.', 'Despues de two usa plural. No watch, sino watches.'), watchs: tri('Watchs is incorrect. After -ch add -es: watches.', 'Watchs is incorrect. After -ch add -es: watches.', 'Watchs es incorrecto. Despues de -ch anade -es: watches.'), watchies: tri('Watchies is incorrect. Correct plural is watches.', 'Watchies is incorrect. Correct plural is watches.', 'Watchies es incorrecto. Correcto: watches.') }, retryLine: 'Watch + es = watches.', focusWords: ['watches'] }),
    nounStep({ id: 'noun_plural_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'irregular_plural_children', sentence: 'There are many ___ in the park.', translation: tri('V parke mnogo detei.', 'U parku bahato ditei.', 'Hay muchos ninos en el parque.'), options: ['child', 'childs', 'children', 'childrens'], correctAnswer: 'children', correctFeedback: tri('Yes. Child has irregular plural: children.', 'Yes. Child has irregular plural: children.', 'Si. Child tiene plural irregular: children.'), wrong: { child: tri('Child is singular. After many use plural: children.', 'Child is singular. After many use plural: children.', 'Child es singular. Despues de many usa plural: children.'), childs: tri('Childs is not the normal plural. Correct: children.', 'Childs is not the normal plural. Correct: children.', 'Childs no es plural normal. Correcto: children.'), childrens: tri('Children is already plural. Do not add -s.', 'Children is already plural. Do not add -s.', 'Children ya es plural. No anadas -s.') }, retryLine: 'Child -> children. It is irregular.', focusWords: ['children'] }),
    nounStep({ id: 'noun_plural_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'irregular_plural_people', sentence: 'I met three interesting ___.', translation: tri('Ya vstretil treh interesnyh lyudei.', 'Ya zustriv trokh tsikavykh liudei.', 'Conoci a tres personas interesantes.'), options: ['person', 'persons', 'people', 'peoples'], correctAnswer: 'people', correctFeedback: tri('Yes. Normal plural of person is people.', 'Yes. Normal plural of person is people.', 'Si. El plural normal de person es people.'), wrong: { person: tri('After three use plural. Person is singular, so people.', 'After three use plural. Person is singular, so people.', 'Despues de three usa plural. Person es singular, por eso people.'), persons: tri('Persons can be formal/legal, but normal people = people.', 'Persons can be formal/legal, but normal people = people.', 'Persons puede ser formal/legal, pero personas normal = people.'), peoples: tri('Peoples usually means nations, not normal people here.', 'Peoples usually means nations, not normal people here.', 'Peoples normalmente significa pueblos, no personas aqui.') }, retryLine: 'Person -> people.', focusWords: ['people'] }),
    nounStep({ id: 'noun_plural_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'uncountable_no_plural', sentence: 'I need more ___.', translation: tri('Mne nuzhno bolshe informatsii.', 'Meni potribno bilshe informatsii.', 'Necesito mas informacion.'), options: ['information', 'informations', 'an information', 'informationes'], correctAnswer: 'information', correctFeedback: tri('Yes. Information is uncountable, so no -s.', 'Yes. Information is uncountable, so no -s.', 'Si. Information es uncountable, sin -s.'), wrong: { informations: tri('Informations is usually an error. Information is uncountable and does not take plural -s.', 'Informations is usually an error. Information is uncountable and does not take plural -s.', 'Informations normalmente es error. Information es uncountable y no lleva plural -s.'), 'an information': tri('An information is incorrect because information is uncountable. Say a piece of information.', 'An information is incorrect because information is uncountable. Say a piece of information.', 'An information es incorrecto porque information es uncountable. Di a piece of information.'), informationes: tri('Informationes is incorrect. Use information.', 'Informationes is incorrect. Use information.', 'Informationes es incorrecto. Usa information.') }, retryLine: 'Information is uncountable. No -s.', focusWords: ['information'] }),
    nounStep({ id: 'noun_plural_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_a_two_many', sentence: 'Choose the correct pair.', translation: tri('Vyberi pravilnuyu paru.', 'Obery pravylnu paru.', 'Elige la pareja correcta.'), options: ['a question / two questions / many questions', 'a questions / two question / many question', 'a question / two question / many questions', 'a questions / two questions / many question'], correctAnswer: 'a question / two questions / many questions', correctFeedback: tri('Yes. A requires singular. Two and many require plural.', 'Yes. A requires singular. Two and many require plural.', 'Si. A necesita singular. Two y many necesitan plural.'), retryLine: 'A = one. Two/many = several.', focusWords: ['a question', 'two questions'] }),
    nounStep({ id: 'noun_plural_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_this_these', sentence: 'Choose the correct pair.', translation: tri('Vyberi pravilnuyu paru.', 'Obery pravylnu paru.', 'Elige la pareja correcta.'), options: ['this lesson / these lessons', 'this lessons / these lesson', 'this lesson / these lesson', 'this lessons / these lessons'], correctAnswer: 'this lesson / these lessons', correctFeedback: tri('Yes. This requires singular. These requires plural.', 'Yes. This requires singular. These requires plural.', 'Si. This necesita singular. These necesita plural.'), retryLine: 'This = one. These = several.', focusWords: ['this lesson', 'these lessons'] }),
    nounStep({ id: 'noun_plural_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Vyberi pravilnoe predlozhenie.', 'Obery pravylne rechennia.', 'Elige la oracion correcta.'), options: ['I have two questions, but I need more information.', 'I have two question, but I need more informations.', 'I have a questions, but I need an information.', 'I have many question, but I need more informations.'], correctAnswer: 'I have two questions, but I need more information.', correctFeedback: tri('Yes. Two requires questions. Information is uncountable, so no -s.', 'Yes. Two requires questions. Information is uncountable, so no -s.', 'Si. Two necesita questions. Information es uncountable, sin -s.'), retryLine: 'Two questions. More information.', focusWords: ['questions', 'information'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['singular_after_number_error', 'plural_after_a_an_error', 'this_plural_error', 'these_singular_error', 'many_singular_error', 'es_plural_spelling_error', 'ies_plural_spelling_error', 'irregular_plural_error', 'uncountable_plural_error'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Show the signal before the noun and the required noun form.', 'Show the signal before the noun and the required noun form.', 'Mostramos la senal antes del noun y la forma necesaria.'),
    depth2: tri('Ask: one thing or several things?', 'Ask: one thing or several things?', 'Pregunta: una cosa o varias?'),
    depth3: tri('Blocks: a book / two books / this lesson / these lessons.', 'Blocks: a book / two books / this lesson / these lessons.', 'Bloques: a book / two books / this lesson / these lessons.'),
    depth4: tri('Almost hint: point directly to singular or plural.', 'Almost hint: point directly to singular or plural.', 'Casi pista: indicamos singular o plural.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Find the signal before the noun. A/one/this = singular. Two/many/few/these/those = plural. Information/money/advice/water usually stay without -s.', 'Find the signal before the noun. A/one/this = singular. Two/many/few/these/those = plural. Information/money/advice/water usually stay without -s.', 'Encuentra la senal antes del noun. A/one/this = singular. Two/many/few/these/those = plural. Information/money/advice/water normalmente sin -s.') },
    afterThreeWrongInSameExercise: { action: 'show_number_signal_hint_then_retry', card: tri('The system shows whether the signal needs singular or plural, but does not choose the noun form.', 'The system shows whether the signal needs singular or plural, but does not choose the noun form.', 'El sistema muestra si la senal necesita singular o plural, pero no elige la forma.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Guided mode: first choose whether the signal means one or several. Then return to the noun form.', 'Guided mode: first choose whether the signal means one or several. Then return to the noun form.', 'Modo guiado: primero elige si la senal significa uno o varios. Luego vuelve a la forma del noun.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_noun_plural_001', prompt: tri('After a, do we need singular or plural?', 'After a, do we need singular or plural?', 'Despues de a necesitamos singular o plural?'), options: ['singular', 'plural'], correctIndex: 0, thenReturnToExerciseId: 'noun_plural_easy_001' },
      { id: 'guided_noun_plural_002', prompt: tri('After two, do we need singular or plural?', 'After two, do we need singular or plural?', 'Despues de two necesitamos singular o plural?'), options: ['singular', 'plural'], correctIndex: 1, thenReturnToExerciseId: 'noun_plural_easy_002' },
      { id: 'guided_noun_plural_003', prompt: tri('These needs one thing or several things?', 'These needs one thing or several things?', 'These necesita una cosa o varias?'), options: ['one', 'several'], correctIndex: 1, thenReturnToExerciseId: 'noun_plural_contrast_002' },
      { id: 'guided_noun_plural_004', prompt: tri('Does information usually take plural -s?', 'Does information usually take plural -s?', 'Information normalmente recibe plural -s?'), options: ['yes', 'no'], correctIndex: 1, thenReturnToExerciseId: 'noun_plural_mixed_003' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'noun',
    microDiagnosisId: 'noun_singular_plural_basic',
    diagnosisLabel: tri('Singular / Plural Nouns', 'Singular / Plural Nouns', 'Singular / Plural Nouns'),
    contrastSet: CONTRAST,
    focusWords: ['book', 'books', 'questions', 'lessons', 'boxes', 'stories', 'children', 'people', 'information'],
    focusPatterns: ['singular_after_a', 'plural_after_number', 'plural_after_many', 'this_singular_noun', 'these_plural_noun', 'plural_after_few', 'es_plural_spelling', 'ies_plural_spelling', 'es_plural_ch', 'irregular_plural_children', 'irregular_plural_people', 'uncountable_no_plural', 'mixed_a_two_many', 'mixed_this_these', 'mixed_sentence_correction'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_noun_singular_plural_basic_start',
    answer: 'diagnosis_training_noun_singular_plural_basic_answer',
    mastery: 'diagnosis_training_noun_singular_plural_basic_mastery',
    fallback: 'diagnosis_training_noun_singular_plural_basic_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'noun', microDiagnosisId: 'noun_singular_plural_basic', contrastSet: CONTRAST, logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logNounNumber: true, logPluralPattern: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=noun&microDiagnosisId=noun_singular_plural_basic',
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


