import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = ['used to + base verb', 'past habit', 'past state', 'not true now', "didn't use to", 'did you use to', 'be used to + noun/ing', 'past simple'];
const SMART_CONTRAST = ['used to + base verb', 'past habit', 'past state', 'not true now', "didn't use to", 'did you use to', 'be used to + noun/ing'];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri('First decide the meaning: past no longer true, current habit, or being accustomed to something.'),
    depth2,
    depth3,
    depth4,
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(`Check the meaning and the verb form after used to. Correct form: ${correct}.`);
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
    explanationBlock: tri(
      'Used to + base verb means a past habit or state that is no longer true now. Be used to + noun/ing means being accustomed to something.',
    ),
    microTask: tri('Choose the correct used to, did use to, be used to, or current-habit form.'),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? defaultWrong(input.correctAnswer)])),
    retryFeedback: retry(...input.retryFeedback),
    fallbackExplanation: tri("Past no longer true = used to + base verb. Negative/question after did = use to. Accustomed = be used to + -ing."),
    focusWords: input.focusWords,
  };
}

export const USED_TO_BASIC_TRAINING: DiagnosisTraining = {
  id: 'used_to_basic',
  category: 'verb',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 44,
  supportedLocales: ['ru', 'uk'],
  title: tri('Used to: past habit, not true now', 'Used to: past habit, not true now'),
  shortTitle: tri('Used to', 'Used to'),
  shortDiagnosis: tri('You are mixing used to, did use to, be used to, and current habits.'),
  diagnosisText: tri(
    'You are mixing used to with normal Past Simple, use to, and be used to. Used to shows a past habit or state that is no longer true now.',
  ),
  mentalModel: tri(
    'Used to = it was usually true before, but not now. I used to smoke = I smoked before, but I do not smoke now. After used to use the base verb: used to work, used to live, used to play.',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    "Statement: I used to work at night. Negative: I didn't use to work at night. Question: Did you use to work at night? After did, used becomes use.",
  ),
  whatUserMustLearn: {
    ru: [
      'Used to is for a past habit that is no longer true: I used to smoke.',
      'Used to is also for a past state that changed: She used to live here.',
      'After used to use a base verb: used to work, used to live, used to play.',
      'Used to adds the idea "before, but not now"; Past Simple only says the action happened.',
      "After didn't use use to, not used to: I didn't use to like coffee.",
      'After did use use to: Did you use to play football?',
      'Do not say I used to working. Say I used to work.',
      'Do not confuse used to work with be used to working.',
      'Would can also describe old habits, but used to is safer for basic level and states.',
      'If the habit is still true now, use Present Simple: I work at night.',
    ],
    uk: [
      'Used to is for a past habit that is no longer true: I used to smoke.',
      'Used to is also for a past state that changed: She used to live here.',
      'After used to use a base verb: used to work, used to live, used to play.',
      'Used to adds the idea "before, but not now"; Past Simple only says the action happened.',
      "After didn't use use to, not used to: I didn't use to like coffee.",
      'After did use use to: Did you use to play football?',
      'Do not say I used to working. Say I used to work.',
      'Do not confuse used to work with be used to working.',
      'Would can also describe old habits, but used to is safer for basic level and states.',
      'If the habit is still true now, use Present Simple: I work at night.',
    ],
    es: [
      'Used to shows a past habit no longer true.',
      'Used to can show a past state.',
      'After used to use the base verb.',
      'Used to adds "before, not now".',
      "After didn't use use to.",
      'After did use use to.',
      'Do not use -ing after used to for this meaning.',
      'Be used to + -ing means accustomed.',
      'Used to is safe for basic states.',
      'Current habits use Present Simple.',
    ],
  },
  examples: [
    { en: 'I used to smoke.', ru: 'I used to smoke.', uk: 'I used to smoke.', es: 'I used to smoke.', why: tri('Used to shows an old habit that is no longer true.') },
    { en: 'She used to live in Dublin.', ru: 'She used to live in Dublin.', uk: 'She used to live in Dublin.', es: 'She used to live in Dublin.', why: tri('Used to live shows a past state that changed.') },
    { en: 'We used to play football after school.', ru: 'We used to play football after school.', uk: 'We used to play football after school.', es: 'We used to play football after school.', why: tri('This is a repeated old habit; after used to use base verb play.') },
    { en: "He didn't use to drink coffee.", ru: "He didn't use to drink coffee.", uk: "He didn't use to drink coffee.", es: "He didn't use to drink coffee.", why: tri("After didn't use use to because did already marks the past.") },
    { en: 'Did you use to work at night?', ru: 'Did you use to work at night?', uk: 'Did you use to work at night?', es: 'Did you use to work at night?', why: tri('In questions after did use use to, not used to.') },
    { en: 'I used to be shy.', ru: 'I used to be shy.', uk: 'I used to be shy.', es: 'I used to be shy.', why: tri('Used to can describe a past state.') },
    { en: 'I am used to working at night.', ru: 'I am used to working at night.', uk: 'I am used to working at night.', es: 'I am used to working at night.', why: tri('Be used to + -ing means accustomed. It is not the old-habit structure.') },
    { en: 'I work at night now.', ru: 'I work at night now.', uk: 'I work at night now.', es: 'I work at night now.', why: tri('If the habit is current, use Present Simple, not used to.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('You may be saying "before" with plain Past Simple and losing the important meaning: now it is different. English uses used to for that.') },
    { id: 'intro_rule', type: 'rule', text: tri('Used to + base verb = it was usually true before, but is not true now: I used to work there.') },
    { id: 'intro_warning', type: 'warning', text: tri("Main errors: I used to working, I didn't used to, Did you used to. Correct: I used to work, I didn't use to, Did you use to.") },
  ],
  steps: [
    step({ id: 'used_to_easy_001', order: 1, difficulty: 'easy', targetSkill: 'used_to_smoke', sentence: 'I ___ smoke.', translation: tri('I used to smoke.'), options: ['used to', 'use to', 'am used to', 'was used to'], correctAnswer: 'used to', correctFeedback: tri('Yes. It was a past habit and is not true now: used to smoke.'), wrong: { 'use to': tri('In an affirmative old-habit sentence use used to, not use to.'), 'am used to': tri('Am used to means accustomed. For "I smoked before", use used to smoke.'), 'was used to': tri('Was used to means was accustomed. Here you need the old habit: used to smoke.') }, retryFeedback: [tri('Past habit = used to.'), tri('I used to smoke.'), tri('Hint: I used to smoke.')], focusWords: ['used to smoke'] }),
    step({ id: 'used_to_easy_002', order: 2, difficulty: 'easy', targetSkill: 'used_to_play', sentence: 'We used to ___ football after school.', translation: tri('We used to play football after school.'), options: ['play', 'playing', 'played', 'to play'], correctAnswer: 'play', correctFeedback: tri('Yes. After used to use the base verb: used to play.'), wrong: { playing: tri('Used to playing is not the old-habit form. Use used to play.'), played: tri('After used to do not use Past Simple. Use play.'), 'to play': tri('Used to already contains to. Do not say used to to play.') }, retryFeedback: [tri('Used to + base verb.'), tri('Used to play.'), tri('Hint: We used to play football after school.')], focusWords: ['used to play'] }),
    step({ id: 'used_to_easy_003', order: 3, difficulty: 'easy', targetSkill: 'used_to_work', sentence: 'He used to ___ at night.', translation: tri('He used to work at night.'), options: ['work', 'working', 'worked', 'to work'], correctAnswer: 'work', correctFeedback: tri('Yes. After used to use the base verb: work.'), wrong: { working: tri('Used to working is not right for "worked before". Use used to work.'), worked: tri('After used to do not use worked. Use work.'), 'to work': tri('Used to to work is wrong. Use used to work.') }, retryFeedback: [tri('Used to + work.'), tri('He used to work at night.'), tri('Hint: He used to work at night.')], focusWords: ['used to work'] }),
    step({ id: 'used_to_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'used_to_live', sentence: 'She used to ___ in Dublin.', translation: tri('She used to live in Dublin.'), options: ['live', 'living', 'lived', 'to live'], correctAnswer: 'live', correctFeedback: tri('Yes. Used to live shows a past state that changed.'), wrong: { living: tri('Used to living does not mean "lived before" here. Use used to live.'), lived: tri('After used to use base verb live, not lived.'), 'to live': tri('Used to already contains to. Do not say used to to live.') }, retryFeedback: [tri('Old state = used to live.'), tri('She used to live in Dublin.'), tri('Hint: She used to live in Dublin.')], focusWords: ['used to live'] }),
    step({ id: 'used_to_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'used_to_be', sentence: 'I used to ___ shy.', translation: tri('I used to be shy.'), options: ['be', 'being', 'was', 'to be'], correctAnswer: 'be', correctFeedback: tri('Yes. After used to use the base verb. For be, the base form is be.'), wrong: { being: tri('Used to being is not the old-state form here. Use used to be.'), was: tri('After used to do not use was. Use be.'), 'to be': tri('Used to to be is wrong. Use used to be.') }, retryFeedback: [tri('Used to + be.'), tri('I used to be shy.'), tri('Hint: I used to be shy.')], focusWords: ['used to be'] }),
    step({ id: 'used_to_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'past_state_no_longer_true', sentence: 'This building ___ a school.', translation: tri('This building used to be a school.'), options: ['used to be', 'was used to', 'used to being', 'use to be'], correctAnswer: 'used to be', correctFeedback: tri('Yes. It was a school before, but not now: used to be.'), wrong: { 'was used to': tri('Was used to means was accustomed, which does not fit a building. Use used to be.'), 'used to being': tri('For the old state use base verb be, not being.'), 'use to be': tri('In an affirmative statement use used to be.') }, retryFeedback: [tri('Before, not now = used to be.'), tri('This building used to be a school.'), tri('Hint: This building used to be a school.')], focusWords: ['used to be'] }),
    step({ id: 'used_to_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'didnt_use_to', sentence: "I didn't ___ like coffee.", translation: tri("I didn't use to like coffee."), options: ['use to', 'used to', 'using to', 'am used to'], correctAnswer: 'use to', correctFeedback: tri("Yes. After didn't use use to because did already marks the past."), wrong: { 'used to': tri("After didn't do not use used. Use didn't use to."), 'using to': tri("Didn't using to is wrong. Use didn't use to."), 'am used to': tri("Am used to means accustomed. Here use didn't use to like.") }, retryFeedback: [tri("Didn't + use to."), tri("I didn't use to like coffee."), tri("Hint: I didn't use to like coffee.")], focusWords: ["didn't use to"] }),
    step({ id: 'used_to_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'did_you_use_to', sentence: 'Did you ___ play football?', translation: tri('Did you use to play football?'), options: ['use to', 'used to', 'using to', 'were used to'], correctAnswer: 'use to', correctFeedback: tri('Yes. In questions after did use use to: Did you use to play?'), wrong: { 'used to': tri('After did do not use used. Use Did you use to...?'), 'using to': tri('Did you using to is wrong. Use Did you use to.'), 'were used to': tri('Were used to means accustomed. Here ask about an old habit: Did you use to.') }, retryFeedback: [tri('Did + use to.'), tri('Did you use to play football?'), tri('Hint: Did you use to play football?')], focusWords: ['did you use to'] }),
    step({ id: 'used_to_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'negative_question_pair', sentence: 'Choose the correct pair.', translation: tri("I didn't use to like coffee / Did you use to drink coffee?"), options: ["I didn't use to like coffee / Did you use to drink coffee?", "I didn't used to like coffee / Did you used to drink coffee?", "I wasn't used to like coffee / Were you used to drink coffee?", "I didn't use to liking coffee / Did you use to drinking coffee?"], correctAnswer: "I didn't use to like coffee / Did you use to drink coffee?", correctFeedback: tri('Yes. After did/did not use use to + base verb.'), wrong: { "I didn't used to like coffee / Did you used to drink coffee?": tri("After did/didn't do not use used to. Use use to."), "I wasn't used to like coffee / Were you used to drink coffee?": tri('Was/were used to is a different structure about being accustomed. Here use old-habit forms.'), "I didn't use to liking coffee / Did you use to drinking coffee?": tri('After use to use base verbs: like, drink.') }, retryFeedback: [tri("Didn't use to + verb / Did you use to + verb."), tri("Didn't use to like / Did you use to drink?"), tri("Hint: I didn't use to like coffee / Did you use to drink coffee?")], focusWords: ["didn't use to", 'did you use to'] }),
    step({ id: 'used_to_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'be_used_to_working', sentence: 'I am used to ___ at night.', translation: tri('I am used to working at night.'), options: ['working', 'work', 'worked', 'to work'], correctAnswer: 'working', correctFeedback: tri('Yes. Be used to takes a noun or -ing: am used to working.'), wrong: { work: tri('Am used to work mixes two structures. For accustomed, use am used to working.'), worked: tri('After be used to use -ing or a noun, not worked.'), 'to work': tri('Am used to to work is wrong. Use am used to working.') }, retryFeedback: [tri('Be used to + -ing = accustomed.'), tri('I am used to working.'), tri('Hint: I am used to working at night.')], focusWords: ['am used to working'] }),
    step({ id: 'used_to_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'used_to_vs_be_used_to', sentence: 'Choose the correct pair.', translation: tri('I used to work at night / I am used to working at night'), options: ['I used to work at night / I am used to working at night', 'I am used to work at night / I used to working at night', 'I used to working at night / I am used to work at night', 'I was used to work at night / I used to worked at night'], correctAnswer: 'I used to work at night / I am used to working at night', correctFeedback: tri('Yes. Used to work = worked before. Am used to working = accustomed to working.'), wrong: { 'I am used to work at night / I used to working at night': tri('The forms are reversed. After used to use work; after am used to use working.'), 'I used to working at night / I am used to work at night': tri('Used to working is wrong for old habit. Am used to work is wrong for accustomed.'), 'I was used to work at night / I used to worked at night': tri('These forms do not fit. Use used to work / am used to working.') }, retryFeedback: [tri('Before = used to work. Accustomed = am used to working.'), tri('Used to work / am used to working.'), tri('Hint: I used to work at night / I am used to working at night.')], focusWords: ['used to work', 'am used to working'] }),
    step({ id: 'used_to_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'current_habit_present_simple', sentence: 'I ___ at night now.', translation: tri('I work at night now.'), options: ['work', 'used to work', 'use to work', 'am used to work'], correctAnswer: 'work', correctFeedback: tri('Yes. Now shows a current habit, so use Present Simple: work.'), wrong: { 'used to work': tri('Used to work means before, but not now. Here it says now, so use work.'), 'use to work': tri('Use to work does not fit a current habit. Use Present Simple: work.'), 'am used to work': tri('Am used to work is wrong. If accustomed, use am used to working; here simply use work.') }, retryFeedback: [tri('Now = current habit = work.'), tri('I work at night now.'), tri('Hint: I work at night now.')], focusWords: ['work now'] }),
    step({ id: 'used_to_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_statement_negative_question', sentence: 'Choose the correct set.', translation: tri("I used to smoke / I didn't use to smoke / Did you use to smoke?"), options: ["I used to smoke / I didn't use to smoke / Did you use to smoke?", "I use to smoke / I didn't used to smoke / Did you used to smoke?", "I used to smoking / I didn't use to smoking / Did you use to smoking?", "I was used to smoke / I wasn't used to smoke / Were you used to smoke?"], correctAnswer: "I used to smoke / I didn't use to smoke / Did you use to smoke?", correctFeedback: tri('Yes. Statement: used to. Negative/question after did: use to.'), wrong: { "I use to smoke / I didn't used to smoke / Did you used to smoke?": tri("Statement needs used to; after did/didn't use use to."), "I used to smoking / I didn't use to smoking / Did you use to smoking?": tri('After used/use to use base verb smoke, not smoking.'), "I was used to smoke / I wasn't used to smoke / Were you used to smoke?": tri('Was used to is the accustomed structure. Here use old-habit forms.') }, retryFeedback: [tri("Used to / didn't use to / Did you use to."), tri("I used to smoke / I didn't use to smoke / Did you use to smoke?"), tri("Hint: I used to smoke / I didn't use to smoke / Did you use to smoke?")], focusWords: ['used to', "didn't use to", 'did you use to'] }),
    step({ id: 'used_to_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_old_vs_now', sentence: 'Choose the correct pair.', translation: tri('I used to live here / I live here now'), options: ['I used to live here / I live here now', 'I live here used to / I used to live here now', 'I used to living here / I am live here now', 'I was used to live here / I used to live here now'], correctAnswer: 'I used to live here / I live here now', correctFeedback: tri('Yes. Old and no longer true = used to live. Current = live now.'), wrong: { 'I live here used to / I used to live here now': tri('Used to does not go at the end like that, and it conflicts with now.'), 'I used to living here / I am live here now': tri('Used to living is wrong for old state, and I am live is wrong. Use used to live / live.'), 'I was used to live here / I used to live here now': tri('Was used to live is wrong for the old state, and used to conflicts with now.') }, retryFeedback: [tri('Past no longer true = used to live. Now true = live now.'), tri('I used to live here / I live here now.'), tri('Hint: I used to live here / I live here now.')], focusWords: ['used to live', 'live now'] }),
    step({ id: 'used_to_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri("I didn't use to like coffee, but now I drink it every day."), options: ["I didn't use to like coffee, but now I drink it every day.", "I didn't used to like coffee, but now I used to drink it every day.", "I wasn't used to like coffee, but now I drinking it every day.", "I didn't use to liking coffee, but now I am used to drink it every day."], correctAnswer: "I didn't use to like coffee, but now I drink it every day.", correctFeedback: tri("Yes. Before not true = didn't use to like. Current habit = I drink."), wrong: { "I didn't used to like coffee, but now I used to drink it every day.": tri("After didn't use use to. With now, do not use used to for a current habit."), "I wasn't used to like coffee, but now I drinking it every day.": tri("Wasn't used to like does not mean 'did not like before', and I drinking is wrong."), "I didn't use to liking coffee, but now I am used to drink it every day.": tri('After use to use like. After am used to use drinking, but here the better current-habit form is I drink.') }, retryFeedback: [tri("Didn't use to like / now I drink."), tri("I didn't use to like coffee, but now I drink it."), tri("Hint: I didn't use to like coffee, but now I drink it every day.")], focusWords: ["didn't use to like", 'now I drink'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'used_to_plus_ing_error',
      'used_to_missing_to_error',
      'didnt_used_to_error',
      'did_you_used_to_error',
      'used_to_vs_present_simple_error',
      'used_to_vs_past_simple_error',
      'be_used_to_confusion_error',
      'used_to_state_error',
      'wrong_current_habit_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Normal explanation: show that this is a past habit/state and now it is different.'),
    depth2: tri('Simpler: ask whether it happened regularly before or happens now.'),
    depth3: tri('Even simpler: compare I used to smoke / I smoke now.'),
    depth4: tri('Almost a hint: point directly to used to + base verb or Present Simple.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri("Used to = before, but not now. Statement: used to + base verb. Negative: didn't use to + base verb. Question: Did you use to + base verb? Be used to + -ing = accustomed."),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_used_to_meaning_hint_then_retry',
      card: tri('Hint: the system shows whether the meaning is "before but not now", "current", or "accustomed", but does not choose the full form.'),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri("Guided mode: first choose the meaning: before/current/accustomed. Then choose used to, didn't use to, Did you use to, or be used to + -ing."),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_used_to_001', prompt: tri('Used to smoke means smokes now or smoked before?'), options: ['smokes now', 'smoked before'], correctIndex: 1, thenReturnToExerciseId: 'used_to_easy_001' },
      { id: 'guided_used_to_002', prompt: tri('After used to do we need work or working?'), options: ['work', 'working'], correctIndex: 0, thenReturnToExerciseId: 'used_to_easy_003' },
      { id: 'guided_used_to_003', prompt: tri("After didn't, which is correct?"), options: ["didn't used to", "didn't use to"], correctIndex: 1, thenReturnToExerciseId: 'used_to_contrast_004' },
      { id: 'guided_used_to_004', prompt: tri('I am used to working means worked before or accustomed to working?'), options: ['worked before', 'accustomed to working'], correctIndex: 1, thenReturnToExerciseId: 'used_to_mixed_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'used_to_basic',
    diagnosisLabel: tri('Used to', 'Used to'),
    contrastSet: SMART_CONTRAST,
    difficultyLevel: 2,
    focusWords: ['used to smoke', 'used to work', "didn't use to", 'did you use to', 'am used to working', 'now'],
    focusPatterns: [
      'used_to_smoke',
      'used_to_play',
      'used_to_work',
      'used_to_live',
      'used_to_be',
      'past_state_no_longer_true',
      'didnt_use_to',
      'did_you_use_to',
      'negative_question_pair',
      'be_used_to_working',
      'used_to_vs_be_used_to',
      'current_habit_present_simple',
      'mixed_statement_negative_question',
      'mixed_old_vs_now',
      'mixed_sentence_correction',
    ],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyEscalation: {
      start: 'easy',
      afterCorrectInRow: 3,
      next: 'contrast',
      afterCorrectInRowAtContrast: 3,
      final: 'mixed_review',
    },
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
    payload: {
      category: 'verb',
      microDiagnosisId: 'used_to_basic',
      contrastSet: ['used to', "didn't use to", 'did you use to', 'be used to', 'current habit'],
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logUsedToMeaning: true,
      logVerbFormAfterUsedTo: true,
      logCurrentRelevance: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=used_to_basic',
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


