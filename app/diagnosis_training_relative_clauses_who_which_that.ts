import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = ['who for people', 'which for things', 'that for people or things', 'subject relative clause', 'object relative clause', 'relative pronoun omission', 'defining relative clause'];
const SMART_CONTRAST = ['who for people', 'which for things', 'that for people or things', 'whose', 'relative clause word order', 'object omission'];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri('First find the noun before the relative clause: person, thing/idea, or possession. Then choose who, which, that, or whose.'),
    depth2,
    depth3,
    depth4,
  ];
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
  wrong: Record<string, TriText>;
  retryFeedback: [TriText, TriText, TriText];
  focusWords: string[];
}): DiagnosisTrainingStep {
  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: input.translation,
    explanationBlock: tri('Relative clauses connect a noun to extra information. People usually take who/that, things and ideas take which/that, and possession takes whose.'),
    microTask: tri('Choose the relative word or sentence structure that correctly connects the noun to the extra information.'),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? tri(`Use ${input.correctAnswer}; choose the relative word by noun type and clause role.`)])),
    retryFeedback: retry(...input.retryFeedback),
    fallbackExplanation: tri('People = who/that. Things/ideas = which/that. Possession = whose. Do not repeat he/it when the relative clause already contains that role.'),
    focusWords: input.focusWords,
  };
}

export const RELATIVE_CLAUSES_WHO_WHICH_THAT_TRAINING: DiagnosisTraining = {
  id: 'relative_clauses_who_which_that',
  category: 'syntax',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 52,
  supportedLocales: ['ru', 'uk'],
  title: tri('Who / Which / That: relative clauses', 'Who / Which / That: relative clauses'),
  shortTitle: tri('Who / Which / That', 'Who / Which / That'),
  shortDiagnosis: tri('You are translating "which/that/who" as one generic connector instead of choosing by noun type and clause role.'),
  diagnosisText: tri('You are mixing who, which, and that in relative clauses. English chooses the connector by the noun before it: person, thing, animal, idea, or possession.'),
  mentalModel: tri('Who is usually for people: the man who called. Which is for things/ideas: the phone which broke. That can often replace who/which in defining clauses: the person that I met, the phone that broke.'),
  contrastSet: CONTRAST,
  coreRule: tri('People: who or that. The woman who helped me. Things/ideas: which or that. The app which helps me. That often works in defining clauses. Whose means belonging to whom/which.'),
  whatUserMustLearn: {
    ru: [
      'Who is used for people: the man who called.',
      'Which is used for things, animals, ideas, and situations.',
      'That can be used for people and things in defining clauses.',
      'Do not repeat the subject after who/which/that when the relative word is already the subject.',
      'In object relative clauses, that can often be omitted: the book I bought.',
      'If the relative word is the subject, do not simply omit it.',
      'Who is not used for ordinary things.',
      'Which is not the basic choice for people.',
      'That is not used after a comma in strict non-defining clauses.',
      'Whose means whose/of whom/of which.',
    ],
    uk: [
      'Who is used for people: the man who called.',
      'Which is used for things, animals, ideas, and situations.',
      'That can be used for people and things in defining clauses.',
      'Do not repeat the subject after who/which/that when the relative word is already the subject.',
      'In object relative clauses, that can often be omitted: the book I bought.',
      'If the relative word is the subject, do not simply omit it.',
      'Who is not used for ordinary things.',
      'Which is not the basic choice for people.',
      'That is not used after a comma in strict non-defining clauses.',
      'Whose means whose/of whom/of which.',
    ],
    es: [
      'Who is for people.',
      'Which is for things and ideas.',
      'That can be used for people and things in defining clauses.',
      'Do not repeat the subject after the relative word.',
      'Object relative that can often be omitted.',
      'Subject relative words usually cannot be omitted.',
      'Who is not for ordinary things.',
      'Which is not the basic choice for people.',
      'Do not use that after a comma in strict non-defining clauses.',
      'Whose means possession.',
    ],
  },
  examples: [
    { en: 'The man who called you is here.', ru: 'The man who called you is here.', uk: 'The man who called you is here.', es: 'The man who called you is here.', why: tri('Man is a person, so who is natural.') },
    { en: 'The book which helped me is on the table.', ru: 'The book which helped me is on the table.', uk: 'The book which helped me is on the table.', es: 'The book which helped me is on the table.', why: tri('Book is a thing, so which works.') },
    { en: 'The book that helped me is on the table.', ru: 'The book that helped me is on the table.', uk: 'The book that helped me is on the table.', es: 'The book that helped me is on the table.', why: tri('That can replace which in this defining clause.') },
    { en: 'The person that I met yesterday was very kind.', ru: 'The person that I met yesterday was very kind.', uk: 'The person that I met yesterday was very kind.', es: 'The person that I met yesterday was very kind.', why: tri('That connects person to I met yesterday.') },
    { en: 'The phone that I bought is expensive.', ru: 'The phone that I bought is expensive.', uk: 'The phone that I bought is expensive.', es: 'The phone that I bought is expensive.', why: tri('Phone is a thing, and that works in this defining clause.') },
    { en: 'The phone I bought is expensive.', ru: 'The phone I bought is expensive.', uk: 'The phone I bought is expensive.', es: 'The phone I bought is expensive.', why: tri('In an object relative clause, that can be omitted.') },
    { en: 'I know a woman whose son lives in Cork.', ru: 'I know a woman whose son lives in Cork.', uk: 'I know a woman whose son lives in Cork.', es: 'I know a woman whose son lives in Cork.', why: tri('Whose shows possession: whose son.') },
    { en: 'My brother, who lives in Dublin, is a doctor.', ru: 'My brother, who lives in Dublin, is a doctor.', uk: 'My brother, who lives in Dublin, is a doctor.', es: 'My brother, who lives in Dublin, is a doctor.', why: tri('After a comma for a person, use who, not that.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('You may be translating every relative clause with one connector. In English, first look at the noun: person, thing/idea, or possession.') },
    { id: 'intro_rule', type: 'rule', text: tri('People = who/that. Things and ideas = which/that. Possession = whose.') },
    { id: 'intro_warning', type: 'warning', text: tri('Main mistakes: the man which called, the phone who broke, the man who he called. Correct: the man who called, the phone which broke.') },
  ],
  steps: [
    step({ id: 'relative_easy_001', order: 1, difficulty: 'easy', targetSkill: 'who_person_called', sentence: 'The man ___ called you is here.', translation: tri('The man who called you is here.'), options: ['who', 'which', 'where', 'what'], correctAnswer: 'who', correctFeedback: tri('Yes. Man is a person, so use who.'), wrong: { which: tri('Which is not the basic choice for a person. Use who.'), where: tri('Where is for a place. Here the noun is a person, so use who.'), what: tri('What does not connect man to called you here. Use who.') }, retryFeedback: [tri('Man = person = who.'), tri('The man who called you.'), tri('Hint: The man who called you is here.')], focusWords: ['man who'] }),
    step({ id: 'relative_easy_002', order: 2, difficulty: 'easy', targetSkill: 'who_woman_helped', sentence: 'The woman ___ helped me was very kind.', translation: tri('The woman who helped me was very kind.'), options: ['who', 'which', 'where', 'whose'], correctAnswer: 'who', correctFeedback: tri('Yes. Woman is a person. Use who.'), wrong: { which: tri('Which is not the best basic choice for a person. Use who.'), where: tri('Where is for places, but woman is a person.'), whose: tri('Whose means possession. Here you need who helped.') }, retryFeedback: [tri('Woman = person = who.'), tri('The woman who helped me.'), tri('Hint: The woman who helped me was very kind.')], focusWords: ['woman who'] }),
    step({ id: 'relative_easy_003', order: 3, difficulty: 'easy', targetSkill: 'person_who_lives', sentence: 'I know a person ___ lives near you.', translation: tri('I know a person who lives near you.'), options: ['who', 'which', 'where', 'what'], correctAnswer: 'who', correctFeedback: tri('Yes. Person needs who.'), wrong: { which: tri('Which is not the basic choice for person. Use who.'), where: tri('Where is for places. Person needs who.'), what: tri('What does not work here. Use who.') }, retryFeedback: [tri('Person = who.'), tri('A person who lives near you.'), tri('Hint: I know a person who lives near you.')], focusWords: ['person who'] }),
    step({ id: 'relative_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'which_book_helped', sentence: 'The book ___ helped me is on the table.', translation: tri('The book which helped me is on the table.'), options: ['which', 'who', 'where', 'whose'], correctAnswer: 'which', correctFeedback: tri('Yes. Book is a thing, so which works.'), wrong: { who: tri('Who is for people. Book is a thing, so use which.'), where: tri('Where is for places. Book is a thing, so use which.'), whose: tri('Whose means possession. Here you need which helped.') }, retryFeedback: [tri('Book = thing = which.'), tri('The book which helped me.'), tri('Hint: The book which helped me is on the table.')], focusWords: ['book which'] }),
    step({ id: 'relative_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'which_phone_broke', sentence: 'The phone ___ broke was new.', translation: tri('The phone which broke was new.'), options: ['which', 'who', 'where', 'what'], correctAnswer: 'which', correctFeedback: tri('Yes. Phone is a thing. Use which.'), wrong: { who: tri('Who is for people. Phone is a thing.'), where: tri('Where is for places, not a phone.'), what: tri('What does not connect phone to broke. Use which.') }, retryFeedback: [tri('Phone = thing = which.'), tri('The phone which broke.'), tri('Hint: The phone which broke was new.')], focusWords: ['phone which'] }),
    step({ id: 'relative_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'which_idea_works', sentence: 'I like the idea ___ works in real life.', translation: tri('I like the idea which works in real life.'), options: ['which', 'who', 'where', 'whose'], correctAnswer: 'which', correctFeedback: tri('Yes. Idea is not a person. Use which.'), wrong: { who: tri('Who is for people. Idea needs which or that.'), where: tri('Where is for places. Idea is an idea, so use which.'), whose: tri('Whose means possession. Here you need which.') }, retryFeedback: [tri('Idea = idea/thing = which.'), tri('The idea which works.'), tri('Hint: I like the idea which works in real life.')], focusWords: ['idea which'] }),
    step({ id: 'relative_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'that_person_met', sentence: 'The person ___ I met yesterday was very kind.', translation: tri('The person that I met yesterday was very kind.'), options: ['that', 'where', 'what', 'whose'], correctAnswer: 'that', correctFeedback: tri('Yes. That works for a defining detail about a person: the person that I met.'), wrong: { where: tri('Where is for places. Person is a person.'), what: tri('What does not connect person to I met. Use that or who/whom.'), whose: tri('Whose means possession. Here use that I met.') }, retryFeedback: [tri('Person + I met = that I met.'), tri('The person that I met.'), tri('Hint: The person that I met yesterday was very kind.')], focusWords: ['person that I met'] }),
    step({ id: 'relative_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'that_phone_bought', sentence: 'The phone ___ I bought is expensive.', translation: tri('The phone that I bought is expensive.'), options: ['that', 'who', 'where', 'whose'], correctAnswer: 'that', correctFeedback: tri('Yes. That works for a defining detail about a thing: the phone that I bought.'), wrong: { who: tri('Who is for people. Phone is a thing.'), where: tri('Where is for places. Here the noun is phone.'), whose: tri('Whose means possession. Here use that I bought.') }, retryFeedback: [tri('Phone + I bought = that I bought.'), tri('The phone that I bought.'), tri('Hint: The phone that I bought is expensive.')], focusWords: ['phone that I bought'] }),
    step({ id: 'relative_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'that_people_things_pair', sentence: 'Choose the correct pair.', translation: tri('the person that I met / the phone that I bought'), options: ['the person that I met / the phone that I bought', 'the person where I met / the phone who I bought', 'the person what I met / the phone what I bought', 'the person whose I met / the phone whose I bought'], correctAnswer: 'the person that I met / the phone that I bought', correctFeedback: tri('Yes. That can work with both person and phone in these defining clauses.'), wrong: { 'the person where I met / the phone who I bought': tri('Where is for places, and who does not fit phone.'), 'the person what I met / the phone what I bought': tri('What is not used this way after person/phone. Use that.'), 'the person whose I met / the phone whose I bought': tri('Whose means possession, but this is not possession.') }, retryFeedback: [tri('Person that I met / phone that I bought.'), tri('The person that I met / the phone that I bought.'), tri('Hint: the person that I met / the phone that I bought.')], focusWords: ['person that', 'phone that'] }),
    step({ id: 'relative_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'no_duplicate_subject', sentence: 'Choose the correct sentence.', translation: tri('The man who called you is here.'), options: ['The man who called you is here.', 'The man who he called you is here.', 'The man which called you is here.', 'The man what called you is here.'], correctAnswer: 'The man who called you is here.', correctFeedback: tri('Yes. Who is already the subject of called. Do not repeat he.'), wrong: { 'The man who he called you is here.': tri('After who, do not add he when who already does the action.'), 'The man which called you is here.': tri('Man is a person, so who is better, not which.'), 'The man what called you is here.': tri('What does not work here. Use who.') }, retryFeedback: [tri('Who called. Not who he called.'), tri('The man who called you.'), tri('Hint: The man who called you is here.')], focusWords: ['who called'] }),
    step({ id: 'relative_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'object_relative_omission', sentence: 'Choose the correct sentence.', translation: tri('The phone I bought is expensive.'), options: ['The phone I bought is expensive.', 'The phone bought I is expensive.', 'The phone who I bought is expensive.', 'The phone I bought it is expensive.'], correctAnswer: 'The phone I bought is expensive.', correctFeedback: tri('Yes. In an object relative clause, that can be omitted: the phone I bought.'), wrong: { 'The phone bought I is expensive.': tri('The word order should be I bought, not bought I.'), 'The phone who I bought is expensive.': tri('Who is for people. Phone is a thing.'), 'The phone I bought it is expensive.': tri('Do not repeat it. The phone is already the object of bought.') }, retryFeedback: [tri('The phone I bought. No it.'), tri('The phone I bought is expensive.'), tri('Hint: The phone I bought is expensive.')], focusWords: ['phone I bought'] }),
    step({ id: 'relative_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'subject_relative_not_omit', sentence: 'Choose the clearest sentence.', translation: tri('The book that helped me is on the table.'), options: ['The book that helped me is on the table.', 'The book helped me is on the table.', 'The book who helped me is on the table.', 'The book that it helped me is on the table.'], correctAnswer: 'The book that helped me is on the table.', correctFeedback: tri('Yes. That is the subject of helped, so the sentence is clear.'), wrong: { 'The book helped me is on the table.': tri('When that is the subject, do not omit it here. The sentence breaks.'), 'The book who helped me is on the table.': tri('Book is a thing, so who does not fit.'), 'The book that it helped me is on the table.': tri('That is already the subject; do not repeat it.') }, retryFeedback: [tri('Book that helped. Not that it helped.'), tri('The book that helped me.'), tri('Hint: The book that helped me is on the table.')], focusWords: ['book that helped'] }),
    step({ id: 'relative_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'whose_possession', sentence: 'I know a woman ___ son lives in Cork.', translation: tri('I know a woman whose son lives in Cork.'), options: ['whose', 'who', 'which', 'that'], correctAnswer: 'whose', correctFeedback: tri('Yes. Whose shows possession: whose son.'), wrong: { who: tri('Who means who/that person. Here you need whose son.'), which: tri('Which does not show possession. Use whose.'), that: tri('That does not mean whose. Use whose.') }, retryFeedback: [tri('Possession = whose.'), tri('A woman whose son lives in Cork.'), tri('Hint: I know a woman whose son lives in Cork.')], focusWords: ['whose son'] }),
    step({ id: 'relative_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'comma_who_not_that', sentence: 'My brother, ___ lives in Dublin, is a doctor.', translation: tri('My brother, who lives in Dublin, is a doctor.'), options: ['who', 'that', 'which', 'what'], correctAnswer: 'who', correctFeedback: tri('Yes. After a comma for a person, strict usage wants who, not that.'), wrong: { that: tri('That is usually not used after a comma in a non-defining clause. Use who.'), which: tri('Brother is a person, so use who.'), what: tri('What does not fit after brother here. Use who.') }, retryFeedback: [tri('Person after comma = who.'), tri('My brother, who lives in Dublin.'), tri('Hint: My brother, who lives in Dublin, is a doctor.')], focusWords: ['brother who'] }),
    step({ id: 'relative_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('The person that I met yesterday showed me the app that he created.'), options: ['The person that I met yesterday showed me the app that he created.', 'The person where I met yesterday showed me the app who he created.', 'The person that I met him yesterday showed me the app that he created it.', 'The person which I met yesterday showed me the app whose he created.'], correctAnswer: 'The person that I met yesterday showed me the app that he created.', correctFeedback: tri('Yes. That I met and that he created connect the nouns without extra him/it.'), wrong: { 'The person where I met yesterday showed me the app who he created.': tri('Where does not fit person, and who does not fit app.'), 'The person that I met him yesterday showed me the app that he created it.': tri('Him and it are extra. Person/app are already the objects in the relative clauses.'), 'The person which I met yesterday showed me the app whose he created.': tri('Which does not fit person, and whose does not mean the app he created.') }, retryFeedback: [tri('Person that I met / app that he created.'), tri('The person that I met showed me the app that he created.'), tri('Hint: The person that I met yesterday showed me the app that he created.')], focusWords: ['person that I met', 'app that he created'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['who_for_thing_error', 'which_for_person_error', 'duplicate_subject_error', 'wrong_relative_pronoun_error', 'object_relative_omission_confusion', 'subject_relative_omission_error', 'whose_confusion_error', 'that_after_comma_error', 'relative_clause_word_order_error'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Normal explanation: show the noun before the relative clause and choose who/which/that.'),
    depth2: tri('Simpler: ask whether the noun is a person or a thing/idea.'),
    depth3: tri('Even simpler: compare man who / book which / thing that.'),
    depth4: tri('Almost a hint: point directly to the needed connector.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Find the noun before the gap. Person = who/that. Thing/idea = which/that. Possession = whose. Do not repeat he/it when the relative clause already has that role.') },
    afterThreeWrongInSameExercise: { action: 'show_noun_type_hint_then_retry', card: tri('Hint: the system shows whether the noun is a person, thing/idea, or possession, but does not choose the connector.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Guided mode: first choose person, thing, or possession. Then return to the full phrase.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_relative_001', prompt: tri('Is man a person or a thing?'), options: ['person', 'thing'], correctIndex: 0, thenReturnToExerciseId: 'relative_easy_001' },
      { id: 'guided_relative_002', prompt: tri('Is phone a person or a thing?'), options: ['person', 'thing'], correctIndex: 1, thenReturnToExerciseId: 'relative_contrast_002' },
      { id: 'guided_relative_003', prompt: tri('In the man who called, do we repeat he after who?'), options: ['yes', 'no'], correctIndex: 1, thenReturnToExerciseId: 'relative_mixed_001' },
      { id: 'guided_relative_004', prompt: tri('Does whose mean which or whose?'), options: ['which', 'whose'], correctIndex: 1, thenReturnToExerciseId: 'relative_mixed_004' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'syntax',
    microDiagnosisId: 'relative_clauses_who_which_that',
    diagnosisLabel: tri('Who / Which / That', 'Who / Which / That'),
    contrastSet: SMART_CONTRAST,
    difficultyLevel: 2,
    focusWords: ['who', 'which', 'that', 'whose', 'the man who', 'the phone that'],
    focusPatterns: ['who_person_called', 'who_woman_helped', 'person_who_lives', 'which_book_helped', 'which_phone_broke', 'which_idea_works', 'that_person_met', 'that_phone_bought', 'that_people_things_pair', 'no_duplicate_subject', 'object_relative_omission', 'subject_relative_not_omit', 'whose_possession', 'comma_who_not_that', 'mixed_sentence_correction'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_started',
    answer: 'diagnosis_training_answer',
    mastery: 'diagnosis_training_mastered',
    fallback: 'diagnosis_training_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'syntax', microDiagnosisId: 'relative_clauses_who_which_that', contrastSet: ['who', 'which', 'that', 'whose', 'relative clause'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logNounType: true, logRelativePronoun: true, logClauseRole: true, logOmissionAllowed: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=syntax&microDiagnosisId=relative_clauses_who_which_that',
    problemCoachRoute: '/problem_coach?category=syntax&microDiagnosisId=relative_clauses_who_which_that',
    fallbackIfTrainingMissing: '/problem_coach?category=syntax',
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


