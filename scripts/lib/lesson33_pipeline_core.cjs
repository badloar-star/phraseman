'use strict';

const fs = require('node:fs');
const path = require('node:path');

const LESSON_33_TOPIC = 'have/get something done';
const DEFAULT_OUT_ROOT = path.join('docs', 'lesson33', 'runs');
const MIN_CAUSATIVE_PATTERN_PHRASES = 35;
const ALLOWED_PACKAGE_STATUSES = new Set(['ready_for_review', 'final_candidate']);

const LESSON_33_TO_60_ROADMAP = [
  {
    lessonId: 33,
    cefr: 'B2',
    topic: 'have/get something done',
    role: 'Focused continuation after Lesson 32 object-result patterns.',
    prerequisites: ['Lesson 23 passive voice', 'Lesson 31 complex object', 'Lesson 32 mixed review'],
    recycledFrom: ['need/want + object + V3', 'passive result language', 'service-result phrases'],
    newSkill: 'Arrange an action/result without saying the learner did it personally.',
    risk: 'Learners may confuse I repaired it with I had it repaired.',
    whyHere: 'Lesson 32 already introduces need/want + object + V3, so Lesson 33 safely narrows that bridge into one B2 pattern.',
  },
  {
    lessonId: 34,
    cefr: 'B2',
    topic: 'wish / if only',
    role: 'Unreal present and regret without broad C1 overload.',
    prerequisites: ['past simple for unreal meaning', 'modal would', 'Lesson 32 mixed review'],
    recycledFrom: ['past forms', 'advice and regret phrases', 'personal-state sentences'],
    newSkill: 'Express unreal present wishes and controlled regrets.',
    risk: 'Learners may overuse would after wish with the same subject.',
    whyHere: 'After Lesson 33 result control, the course shifts into unreal meaning before full conditionals.',
  },
  {
    lessonId: 35,
    cefr: 'B2',
    topic: 'third conditional basics',
    role: 'Past unreal cause and result.',
    prerequisites: ['wish / if only', 'past perfect', 'would have + V3'],
    recycledFrom: ['regret phrases', 'past result logic', 'V3 recognition'],
    newSkill: 'Build if + past perfect, would have + V3 sentences.',
    risk: 'Learners may mix second and third conditional forms too early.',
    whyHere: 'Wish/regret gives the meaning first; third conditional then adds the full cause-result frame.',
  },
  {
    lessonId: 36,
    cefr: 'B2',
    topic: 'mixed conditionals basics',
    role: 'Controlled present result from past condition.',
    prerequisites: ['third conditional basics', 'second conditional meaning', 'would + V'],
    recycledFrom: ['past unreal condition', 'present result phrases', 'regret logic'],
    newSkill: 'Connect a past unreal cause to a present result.',
    risk: 'Learners may treat every mixed conditional as free-form tense mixing.',
    whyHere: 'It comes only after third conditional basics, so the timeline shift is explicit and not random.',
  },
  {
    lessonId: 37,
    cefr: 'B2',
    topic: 'present perfect continuous',
    role: 'Duration and visible result.',
    prerequisites: ['present perfect', 'for/since', 'state vs action verbs'],
    recycledFrom: ['visible result language', 'duration phrases', 'current-state descriptions'],
    newSkill: 'Explain ongoing activity leading to a present result.',
    risk: 'Learners may use it with stative verbs or confuse it with simple present perfect.',
    whyHere: 'After unreal-condition work, the course returns to high-frequency tense control before adding past/future complexity.',
  },
  {
    lessonId: 38,
    cefr: 'B2',
    topic: 'past perfect continuous',
    role: 'Background duration before a past event.',
    prerequisites: ['present perfect continuous', 'past perfect', 'past time clauses'],
    recycledFrom: ['duration phrases', 'background context', 'before/when clauses'],
    newSkill: 'Show an activity continuing before another past point.',
    risk: 'Learners may overuse it where past simple is enough.',
    whyHere: 'It naturally extends Lesson 37 duration logic into past narrative sequencing.',
  },
  {
    lessonId: 39,
    cefr: 'B2',
    topic: 'future continuous and future perfect',
    role: 'Future process and completion.',
    prerequisites: ['future forms', 'continuous aspect', 'perfect aspect'],
    recycledFrom: ['time markers', 'completion logic', 'process vs result contrast'],
    newSkill: 'Separate future activity in progress from future completion by a deadline.',
    risk: 'Learners may choose forms by translation instead of time perspective.',
    whyHere: 'After present/past perfect continuous, future aspect completes the B2 tense-aspect set.',
  },
  {
    lessonId: 40,
    cefr: 'B2',
    topic: 'advanced modal deduction',
    role: 'must have, might have, cannot have.',
    prerequisites: ['modals', 'perfect infinitive', 'V3 forms'],
    recycledFrom: ['past result evidence', 'certainty phrases', 'would have + V3 recognition'],
    newSkill: 'Make past deductions with modal + have + V3.',
    risk: 'Learners may confuse deduction with obligation or advice.',
    whyHere: 'It uses the V3 confidence built in Lessons 33, 35, and 39 before the B2+ nuance block.',
  },
  {
    lessonId: 41,
    cefr: 'B2+',
    topic: 'permission, obligation, and necessity nuance',
    role: 'have to, need to, be supposed to, be allowed to.',
    prerequisites: ['basic modals', 'advanced modal deduction', 'need/want forms'],
    recycledFrom: ['need to', 'have to', 'allowed to', 'supposed to'],
    newSkill: 'Choose obligation, expectation, necessity, and permission with nuance.',
    risk: 'Learners may flatten all forms into must/can.',
    whyHere: 'It starts B2+ with meaning nuance, using modal control from Lesson 40.',
  },
  {
    lessonId: 42,
    cefr: 'B2+',
    topic: 'concession clauses',
    role: 'although, even though, despite, in spite of.',
    prerequisites: ['compound sentences', 'contrast language', 'gerunds/noun phrases'],
    recycledFrom: ['however contrast', 'although clauses', 'despite + noun/V-ing'],
    newSkill: 'Express contrast inside one sentence with clause vs phrase patterns.',
    risk: 'Learners may write despite that or although of.',
    whyHere: 'After modal nuance, the course expands sentence architecture without jumping to C1.',
  },
  {
    lessonId: 43,
    cefr: 'B2+',
    topic: 'purpose and result clauses',
    role: 'so that, in order to, such that, so/such.',
    prerequisites: ['concession clauses', 'infinitives', 'result language'],
    recycledFrom: ['so', 'because', 'to + verb', 'result phrases'],
    newSkill: 'Distinguish purpose from result in longer sentences.',
    risk: 'Learners may confuse so that purpose with so result.',
    whyHere: 'It pairs with Lesson 42: contrast first, purpose/result next.',
  },
  {
    lessonId: 44,
    cefr: 'B2+',
    topic: 'reason and contrast connectors',
    role: 'therefore, however, nevertheless, whereas.',
    prerequisites: ['concession clauses', 'purpose and result clauses', 'paragraph connectors'],
    recycledFrom: ['because/so', 'although/however', 'cause-result sequencing'],
    newSkill: 'Link ideas across clauses and sentences with formal connectors.',
    risk: 'Learners may use connectors mechanically without matching logic.',
    whyHere: 'It consolidates Lessons 42-43 into discourse-level control.',
  },
  {
    lessonId: 45,
    cefr: 'B2+',
    topic: 'noun clauses',
    role: 'what I need, where we met, whether it works.',
    prerequisites: ['question word order', 'embedded clauses', 'object complements'],
    recycledFrom: ['what/where/whether', 'reported speech word order', 'object slots'],
    newSkill: 'Use whole clauses as subjects, objects, and complements.',
    risk: 'Learners may keep question word order inside noun clauses.',
    whyHere: 'After connector work, learners are ready for clause-as-unit grammar.',
  },
  {
    lessonId: 46,
    cefr: 'B2+',
    topic: 'reported questions advanced',
    role: 'Embedded questions and reporting verbs.',
    prerequisites: ['noun clauses', 'reported speech', 'question word order'],
    recycledFrom: ['where we met', 'whether it works', 'reported speech anchors'],
    newSkill: 'Report questions with embedded word order and tense control.',
    risk: 'Learners may write asked where did he go.',
    whyHere: 'Noun clauses make embedded question structure teachable instead of memorized.',
  },
  {
    lessonId: 47,
    cefr: 'B2+',
    topic: 'reporting verbs with patterns',
    role: 'admit, deny, suggest, warn, promise.',
    prerequisites: ['reported questions advanced', 'gerunds', 'infinitives'],
    recycledFrom: ['reported speech', 'that clauses', 'to + verb and V-ing patterns'],
    newSkill: 'Select the correct grammar pattern after common reporting verbs.',
    risk: 'Learners may attach every reporting verb to a that clause.',
    whyHere: 'It broadens reporting after Lesson 46 while keeping pattern choice explicit.',
  },
  {
    lessonId: 48,
    cefr: 'B2+',
    topic: 'passive reporting structures',
    role: 'It is said that, he is believed to.',
    prerequisites: ['passive voice', 'reporting verbs with patterns', 'to-infinitive clauses'],
    recycledFrom: ['passive forms', 'reported speech', 'formal claim language'],
    newSkill: 'Build formal impersonal reporting structures.',
    risk: 'Learners may mix it is said to he or he is said that.',
    whyHere: 'It is the formal passive extension of Lessons 46-47 before participle compression.',
  },
  {
    lessonId: 49,
    cefr: 'B2+',
    topic: 'participle clauses basics',
    role: 'Walking home, having finished, seen from here.',
    prerequisites: ['passive reporting structures', 'V-ing clauses', 'V3 passive meaning'],
    recycledFrom: ['V-ing modifiers', 'V3 result language', 'time/reason clauses'],
    newSkill: 'Compress time, reason, and passive meaning into participle clauses.',
    risk: 'Learners may create dangling participles.',
    whyHere: 'It uses strong V3/passive control from Lessons 33 and 48.',
  },
  {
    lessonId: 50,
    cefr: 'B2+',
    topic: 'reduced relative clauses',
    role: 'people living here, documents checked yesterday.',
    prerequisites: ['relative clauses', 'participle clauses basics', 'active/passive participles'],
    recycledFrom: ['relative clauses', 'V-ing active modifiers', 'V3 passive modifiers'],
    newSkill: 'Reduce relative clauses into active and passive participle modifiers.',
    risk: 'Learners may confuse reduced relatives with full participle clauses.',
    whyHere: 'It completes the B2+ clause-compression block before C1 emphasis and inversion.',
  },
  {
    lessonId: 51,
    cefr: 'C1',
    topic: 'inversion basics',
    role: 'Never have I, only then did I.',
    prerequisites: ['conditionals', 'modal auxiliaries', 'reported clauses', 'negative adverbials'],
    recycledFrom: ['auxiliary questions', 'negative emphasis', 'only/never structures'],
    newSkill: 'Use subject-auxiliary inversion after fronted negative or limiting adverbials.',
    risk: 'Learners may invert without an inversion trigger.',
    whyHere: 'It opens C1 only after conditionals, modal control, and clause work are stable.',
  },
  {
    lessonId: 52,
    cefr: 'C1',
    topic: 'cleft sentences',
    role: 'What I need is, It was John who.',
    prerequisites: ['noun clauses', 'relative clauses', 'sentence focus'],
    recycledFrom: ['what clauses', 'it was...who', 'emphasis patterns'],
    newSkill: 'Move important information into focused cleft structures.',
    risk: 'Learners may overbuild heavy sentences with unclear focus.',
    whyHere: 'After inversion, the course teaches a second C1 emphasis tool with less word-order risk.',
  },
  {
    lessonId: 53,
    cefr: 'C1',
    topic: 'emphasis with do and auxiliaries',
    role: 'I do understand, he did call.',
    prerequisites: ['auxiliary verbs', 'cleft sentences', 'contrastive stress'],
    recycledFrom: ['do-support', 'modal/auxiliary choice', 'correction phrases'],
    newSkill: 'Add spoken/written emphasis with do and auxiliary stress.',
    risk: 'Learners may use emphatic do where tense or register makes it awkward.',
    whyHere: 'It follows heavier C1 emphasis structures with a compact high-frequency emphasis tool.',
  },
  {
    lessonId: 54,
    cefr: 'C1',
    topic: 'hedging and cautious claims',
    role: 'seems to, appears to, is likely to.',
    prerequisites: ['modal deduction', 'passive reporting structures', 'formal claim language'],
    recycledFrom: ['seems', 'likely', 'reported claims', 'certainty scale'],
    newSkill: 'Make cautious claims instead of overstrong statements.',
    risk: 'Learners may hedge every sentence or mix certainty levels.',
    whyHere: 'It builds directly from deduction and formal reporting into C1 academic/professional stance.',
  },
  {
    lessonId: 55,
    cefr: 'C1',
    topic: 'advanced adjective and noun complements',
    role: 'aware of, responsible for, the fact that.',
    prerequisites: ['noun clauses', 'preposition patterns', 'hedging and cautious claims'],
    recycledFrom: ['that clauses', 'preposition complements', 'formal noun phrases'],
    newSkill: 'Attach clauses and prepositional complements to adjectives and nouns accurately.',
    risk: 'Learners may translate complements word-for-word from L1.',
    whyHere: 'Hedging needs precise complement patterns, so this stabilizes the grammar behind C1 claims.',
  },
  {
    lessonId: 56,
    cefr: 'C1',
    topic: 'advanced preposition patterns',
    role: 'dependent on, associated with, involved in.',
    prerequisites: ['advanced adjective and noun complements', 'passive forms', 'formal vocabulary'],
    recycledFrom: ['adjective + preposition', 'noun + preposition', 'passive adjective patterns'],
    newSkill: 'Control fixed preposition patterns in formal and professional phrases.',
    risk: 'Learners may memorize lists without phrase-level production.',
    whyHere: 'It follows complement work so prepositions are learned as grammar slots, not isolated words.',
  },
  {
    lessonId: 57,
    cefr: 'C1',
    topic: 'formal cause and consequence',
    role: 'thereby, hence, consequently, due to.',
    prerequisites: ['reason and contrast connectors', 'purpose/result clauses', 'advanced preposition patterns'],
    recycledFrom: ['therefore/however', 'due to', 'result clauses', 'formal connectors'],
    newSkill: 'State formal cause and consequence across clauses and sentences.',
    risk: 'Learners may overuse formal connectors in casual phrases.',
    whyHere: 'It upgrades the B2+ connector block with C1 register and precision.',
  },
  {
    lessonId: 58,
    cefr: 'C1',
    topic: 'stance and evaluation',
    role: 'arguably, admittedly, presumably, supposedly.',
    prerequisites: ['hedging and cautious claims', 'formal cause and consequence', 'discourse connectors'],
    recycledFrom: ['cautious claims', 'contrast markers', 'certainty adverbs'],
    newSkill: 'Signal stance, evaluation, and source attitude in compact adverbials.',
    risk: 'Learners may choose stance adverbs by translation, not speaker attitude.',
    whyHere: 'It completes the C1 claim-making sequence before integrated review.',
  },
  {
    lessonId: 59,
    cefr: 'C1',
    topic: 'advanced mixed review 33-58',
    role: 'Integrated production with controlled complexity.',
    prerequisites: ['lessons 33-58', 'B2+ clause control', 'C1 emphasis and stance'],
    recycledFrom: ['33-58 target patterns', 'mixed production', 'error repair'],
    newSkill: 'Combine causative, clauses, reporting, inversion, emphasis, and stance in one controlled set.',
    risk: 'Learners may pass recognition but fail mixed production.',
    whyHere: 'It is the stress test before the final bridge review, not a new grammar overload.',
  },
  {
    lessonId: 60,
    cefr: 'C1',
    topic: 'final C1 bridge review',
    role: 'Course capstone and readiness for future C1 modules.',
    prerequisites: ['advanced mixed review 33-58', 'all Lesson 33-59 production gates'],
    recycledFrom: ['33-59 course spine', 'high-risk patterns', 'personal training weak spots'],
    newSkill: 'Demonstrate readiness for later C1 modules through integrated review and self-correction.',
    risk: 'Learners may need more recycling before moving into denser C1 material.',
    whyHere: 'It caps the 33-60 expansion and decides what future C1 modules should recycle first.',
  },
];

const REQUIRED_ROOM_FILES = [
  'tools/lesson_33_agent_room/README.md',
  'tools/lesson_33_agent_room/ROOM.md',
  'tools/lesson_33_agent_room/prompts/00_ORCHESTRATOR.md',
  'tools/lesson_33_agent_room/prompts/10_CURRICULUM_ARCHITECT.md',
  'tools/lesson_33_agent_room/prompts/20_PHRASE_WRITER.md',
  'tools/lesson_33_agent_room/prompts/30_INTRO_THEORY_WRITER.md',
  'tools/lesson_33_agent_room/prompts/40_PERSONAL_TRAINING_WRITER.md',
  'tools/lesson_33_agent_room/prompts/90_QA_GATEKEEPER.md',
  'tools/lesson_33_agent_room/templates/lesson_package.schema.md',
  'docs/lesson33/PIPELINE.md',
];

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function validateRunId(runId) {
  if (!hasText(runId)) return;
  const normalized = String(runId).trim();
  if (!/^[A-Za-z0-9._-]+$/.test(normalized)) {
    throw new Error('runId must contain only letters, numbers, dots, underscores, and hyphens');
  }
  if (normalized === '.' || normalized === '..') {
    throw new Error('runId must not be a dot directory segment');
  }
}

function normalizePath(value) {
  return String(value).split(path.sep).join('/');
}

function isPathWithin(child, parent) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function assertPathWithinLesson33Runs(absPath, root, label) {
  const runsRoot = path.resolve(root, DEFAULT_OUT_ROOT);
  if (!isPathWithin(absPath, runsRoot)) {
    throw new Error(`${label} must be under ${normalizePath(DEFAULT_OUT_ROOT)}`);
  }
}

function ensureLesson33(lessonId) {
  if (Number(lessonId) !== 33) {
    throw new Error('Lesson 33 pipeline only accepts lessonId=33');
  }
}

function buildLesson33Manifest(input = {}) {
  const root = input.root || process.cwd();
  const lessonId = Number(input.lessonId ?? 33);
  ensureLesson33(lessonId);
  const runId = input.runId || timestampSlug();
  validateRunId(runId);
  const outRoot = input.outRoot || DEFAULT_OUT_ROOT;
  assertPathWithinLesson33Runs(path.resolve(root, outRoot), root, 'outRoot');
  const outputDir = normalizePath(path.join(outRoot, runId));

  return {
    pipeline: 'lesson-33',
    version: 1,
    lessonId,
    runId,
    generatedAt: new Date().toISOString(),
    outputDir,
    cefrTarget: 'B2',
    primaryTopic: `Causative/result object: ${LESSON_33_TOPIC}`,
    sourceOfTruth: [
      'app/lesson_data_all.ts',
      'app/lesson_data_25_32.ts',
      'app/lesson_help.tsx',
      'app/lesson_intros_17_32.ts',
      'app/diagnosis_trainings.ts',
      'tools/lesson_qa/prompts/00_rules.md',
    ],
    continuationAnchor: [
      'Lesson 31 trains complex object after made/let/heard/saw/felt/helped.',
      'Lesson 32 mixes be used to + V-ing, relative clauses, reported speech, passive, and need/want + object + V3.',
      `Lesson 33 narrows that bridge into ${LESSON_33_TOPIC} with controlled B2 phrase progression.`,
    ],
    requiredOutputs: [
      'manifest.json',
      'lesson_package.json',
      'curriculum_brief.md',
      'curriculum_roadmap_33_60.md',
      'phrase_blueprint.md',
      'intro_theory_plan.md',
      'personal_training_plan.md',
      'qa_report.md',
    ],
    requiredChecks: [
      'npm run lesson:qa',
      'npm run audit:lesson-intros',
      'npm run audit:lesson-deep-content',
      'npm run audit:translations',
      'npx tsc --noEmit --pretty false',
    ],
    prohibitedWriteTargets: [
      'app/lesson_data_25_32.ts',
      'app/lesson_data_all.ts',
      'app/lesson_help.tsx',
      'app/lesson_intros_17_32.ts',
      'constants/lessons.ts',
      'tests/',
    ],
    curriculumRoadmap: LESSON_33_TO_60_ROADMAP,
    integrationPolicy: 'This pipeline creates review artifacts only. App source integration requires a separate explicit approval step.',
  };
}

function lessonPackageStub(manifest) {
  return {
    lessonId: manifest.lessonId,
    status: 'draft_package_shell',
    cefrTarget: manifest.cefrTarget,
    title: {
      ru: 'Causative: сделать так, чтобы что-то сделали',
      uk: 'Causative: зробити так, щоб щось зробили',
      es: 'Causative: hacer que algo sea hecho',
    },
    topic: {
      primary: LESSON_33_TOPIC,
      contrastWith: ['do something yourself', 'need/want something done', 'passive result'],
      prerequisites: ['Lesson 23 Passive Voice', 'Lesson 31 Complex Object', 'Lesson 32 final mixed review'],
    },
    phraseTargets: {
      count: 50,
      progression: [
        '1-10: have/get + object + V3 in everyday service situations',
        '11-20: need/want + object + V3, controlled result focus',
        '21-30: questions and negatives',
        '31-40: time/place/object expansion without overloading',
        '41-50: mixed review with Lesson 32 anchors',
      ],
    },
    outputsToFill: {
      phrases: [],
      introScreens: [],
      theoryBlocks: [],
      personalTraining: null,
      qaNotes: [],
    },
  };
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasTopic(value) {
  return hasText(value) && value.toLowerCase().includes(LESSON_33_TOPIC);
}

function mentionsLesson32(values) {
  return Array.isArray(values) && values.some((item) => /\blesson\s*32\b/i.test(String(item)));
}

function validateWordsEn(phrase, phraseIndex, errors, warnings) {
  if (!Array.isArray(phrase?.wordsEn) || phrase.wordsEn.length === 0) {
    errors.push(`phrases[${phraseIndex}].wordsEn must contain token data`);
    return;
  }
  phrase.wordsEn.forEach((word, wordIndex) => {
    if (!hasText(word?.text)) {
      errors.push(`phrases[${phraseIndex}].wordsEn[${wordIndex}].text is required`);
    }
    if (!hasText(word?.correct)) {
      errors.push(`phrases[${phraseIndex}].wordsEn[${wordIndex}].correct is required`);
    } else if (normalizeToken(word?.text) !== normalizeToken(word?.correct)) {
      errors.push(`phrases[${phraseIndex}].wordsEn[${wordIndex}].correct must match text`);
    }
    if (!Array.isArray(word?.distractors) || word.distractors.length < 5) {
      errors.push(`phrases[${phraseIndex}].wordsEn[${wordIndex}].distractors must contain at least 5 items`);
    } else {
      const normalizedDistractors = word.distractors.map((item) => String(item).trim().toLowerCase());
      if (normalizedDistractors.some((item) => item.length === 0)) {
        errors.push(`phrases[${phraseIndex}].wordsEn[${wordIndex}].distractors must not contain blank items`);
      }
      const unique = new Set(normalizedDistractors);
      if (unique.size !== word.distractors.length) {
        errors.push(`phrases[${phraseIndex}].wordsEn[${wordIndex}].distractors contains duplicates`);
      }
      if (unique.has(String(word.correct || '').trim().toLowerCase())) {
        errors.push(`phrases[${phraseIndex}].wordsEn[${wordIndex}].distractors must not contain the correct answer`);
      }
    }
  });
  const englishTokens = tokenizeEnglish(phrase.english);
  const wordsEnTokens = phrase.wordsEn.map((word) => normalizeToken(word?.text)).filter(Boolean);
  if (englishTokens.join(' ') !== wordsEnTokens.join(' ')) {
    errors.push(
      `phrases[${phraseIndex}].wordsEn token sequence must match english: expected "${englishTokens.join(' ')}", got "${wordsEnTokens.join(' ')}"`,
    );
  }
}

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:]+$/g, '');
}

function tokenizeEnglish(value) {
  return String(value || '')
    .split(/\s+/)
    .map(normalizeToken)
    .filter(Boolean);
}

function hasLesson33CausativePattern(english) {
  const words = tokenizeEnglish(english);
  const triggers = new Set(['had', 'has', 'have', 'having', 'got', 'get', 'gets', 'getting', 'need', 'needs', 'needed', 'want', 'wants', 'wanted']);
  const participles = new Set(['done', 'made', 'seen', 'shown', 'known', 'built', 'sent', 'kept', 'left', 'brought', 'bought', 'caught', 'taught', 'thought', 'fixed', 'checked', 'cleaned', 'repaired', 'renewed', 'solved', 'signed', 'delivered', 'printed', 'installed', 'washed', 'painted']);
  const determiners = new Set(['a', 'an', 'the', 'my', 'your', 'his', 'her', 'our', 'their', 'this', 'that', 'these', 'those']);

  return words.some((word, index) => {
    if (!triggers.has(word)) return false;
    for (let candidateIndex = index + 2; candidateIndex < words.length; candidateIndex += 1) {
      const candidate = words[candidateIndex];
      if (!looksLikeParticiple(candidate, participles)) continue;
      const looksAttributive =
        candidateIndex === index + 2 &&
        determiners.has(words[index + 1]) &&
        hasText(words[candidateIndex + 1]);
      if (!looksAttributive) return true;
    }
    return false;
  });
}

function looksLikeParticiple(word, knownParticiples) {
  return knownParticiples.has(word) || /^[a-z]+(?:ed|en|wn|lt|pt|ght|nt|d)$/.test(word);
}

function hasNeedWantPattern(english) {
  const words = tokenizeEnglish(english);
  const triggers = new Set(['need', 'needs', 'needed', 'want', 'wants', 'wanted']);
  const participles = new Set(['done', 'made', 'seen', 'shown', 'known', 'built', 'sent', 'kept', 'left', 'brought', 'bought', 'caught', 'taught', 'thought', 'fixed', 'checked', 'cleaned', 'repaired', 'renewed', 'solved', 'signed', 'delivered', 'printed', 'installed', 'washed', 'painted']);
  return words.some((word, index) => (
    triggers.has(word) &&
    words.slice(index + 2).some((candidate) => looksLikeParticiple(candidate, participles))
  ));
}

function isQuestionPhrase(english) {
  return /\?\s*$/.test(String(english || '').trim());
}

function isNegativePhrase(english) {
  return /\b(?:not|never|no)\b|n't\b/i.test(String(english || ''));
}

function targetMentionsLesson33Skill(value) {
  const text = String(value || '').toLowerCase();
  return text.includes('have/get') || text.includes('need/want') || text.includes('causative') || text.includes('object + v3');
}

function collectText(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(collectText).join(' ');
  if (typeof value === 'object') return Object.values(value).map(collectText).join(' ');
  return '';
}

function hasAny(text, terms) {
  const lower = String(text || '').toLowerCase();
  return terms.some((term) => lower.includes(term));
}

function normalizeComparableText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?;:]+$/g, '');
}

function validatePhraseTranslations(phrase, phraseIndex, errors) {
  const english = normalizeComparableText(phrase?.english);
  const locales = [
    ['russian', phrase?.russian],
    ['ukrainian', phrase?.ukrainian],
    ['spanish', phrase?.spanish],
  ];
  for (const [field, value] of locales) {
    if (english && normalizeComparableText(value) === english) {
      errors.push(`phrases[${phraseIndex}].${field} must not duplicate english`);
    }
  }
  const normalizedTranslations = locales
    .map(([, value]) => normalizeComparableText(value))
    .filter(Boolean);
  if (normalizedTranslations.length === 3 && new Set(normalizedTranslations).size === 1) {
    errors.push(`phrases[${phraseIndex}] translations must differ across RU, UK, and ES`);
  }
}

function validateLocalizedTitle(title, errors) {
  const localized = ['ru', 'uk', 'es']
    .map((locale) => normalizeComparableText(title?.[locale]))
    .filter(Boolean);
  if (localized.length === 3 && new Set(localized).size === 1) {
    errors.push('title translations must differ across RU, UK, and ES');
  }
}

function introCoversLesson33Shape(introScreens) {
  const text = collectText(introScreens);
  return (
    hasAny(text, ['result', 'arrange', 'service']) &&
    hasAny(text, ['have/get', 'object + v3', 'formula']) &&
    hasAny(text, ['practice', 'build', 'assemble'])
  );
}

function theoryCoversLesson33Shape(theoryBlocks) {
  const text = collectText(theoryBlocks);
  return (
    hasAny(text, ['have/get', 'object + v3', 'formula']) &&
    hasAny(text, ['contrast', 'yourself', 'arranged result']) &&
    hasAny(text, ['question', 'negative']) &&
    hasAny(text, ['trap', 'avoid'])
  );
}

function validateLesson33Package(pkg) {
  const errors = [];
  const warnings = [];
  if (!pkg || typeof pkg !== 'object') {
    return {
      ok: false,
      errors: ['package must be a JSON object'],
      warnings,
      summary: { phraseCount: 0, introCount: 0, theoryBlockCount: 0, personalTrainingSteps: 0 },
    };
  }

  if (Number(pkg.lessonId) !== 33) errors.push('lessonId must be 33');
  if (!ALLOWED_PACKAGE_STATUSES.has(String(pkg.status || ''))) {
    errors.push('status must be ready_for_review or final_candidate');
  }
  if (pkg.cefrTarget !== 'B2') errors.push('cefrTarget must be B2');
  for (const locale of ['ru', 'uk', 'es']) {
    if (!hasText(pkg.title?.[locale])) errors.push(`title.${locale} is required`);
  }
  validateLocalizedTitle(pkg.title, errors);
  if (!hasTopic(pkg.topic?.primary)) errors.push(`topic.primary must mention ${LESSON_33_TOPIC}`);
  if (!mentionsLesson32(pkg.topic?.prerequisites)) errors.push('topic.prerequisites must mention Lesson 32');
  if (pkg.phraseTargets?.count != null && Number(pkg.phraseTargets.count) !== 50) {
    errors.push('phraseTargets.count must be 50');
  }

  if (!Array.isArray(pkg.phrases)) {
    errors.push('phrases must be an array');
  } else {
    if (pkg.phrases.length !== 50) errors.push('phrases must contain exactly 50 items');
    const causativeCount = pkg.phrases.filter((phrase) => hasLesson33CausativePattern(phrase?.english)).length;
    const needWantCount = pkg.phrases.filter((phrase) => hasNeedWantPattern(phrase?.english)).length;
    const questionCount = pkg.phrases.filter((phrase) => isQuestionPhrase(phrase?.english)).length;
    const negativeCount = pkg.phrases.filter((phrase) => isNegativePhrase(phrase?.english)).length;
    if (causativeCount < MIN_CAUSATIVE_PATTERN_PHRASES) {
      errors.push(`at least ${MIN_CAUSATIVE_PATTERN_PHRASES} phrases must use a Lesson 33 causative/result-object pattern`);
    }
    if (needWantCount < 10) errors.push('at least 10 phrases must use need/want + object + V3');
    if (questionCount < 5) errors.push('at least 5 phrases must be questions');
    if (negativeCount < 5) errors.push('at least 5 phrases must be negatives');
    const ids = new Set();
    const english = new Set();
    pkg.phrases.forEach((phrase, index) => {
      if (!phrase || typeof phrase !== 'object' || Array.isArray(phrase)) {
        errors.push(`phrases[${index}] must be an object`);
        return;
      }
      const expectedId = `lesson33_phrase_${index + 1}`;
      if (!hasText(phrase?.id)) errors.push(`phrases[${index}].id is required`);
      else if (phrase.id !== expectedId) errors.push(`phrases[${index}].id must be ${expectedId}`);
      else if (ids.has(phrase.id)) errors.push(`phrases[${index}].id is duplicated`);
      else ids.add(phrase.id);

      if (!hasText(phrase?.english)) errors.push(`phrases[${index}].english is required`);
      else {
        const normalizedEnglish = phrase.english.trim().toLowerCase();
        if (english.has(normalizedEnglish)) errors.push(`phrases[${index}].english is duplicated`);
        english.add(normalizedEnglish);
      }
      if (!hasText(phrase?.russian)) errors.push(`phrases[${index}].russian is required`);
      if (!hasText(phrase?.ukrainian)) errors.push(`phrases[${index}].ukrainian is required`);
      if (!hasText(phrase?.spanish)) errors.push(`phrases[${index}].spanish is required`);
      validatePhraseTranslations(phrase, index, errors);
      validateWordsEn(phrase, index, errors, warnings);
    });
  }

  if (!Array.isArray(pkg.introScreens) || pkg.introScreens.length < 3) {
    errors.push('introScreens must contain at least 3 items');
  } else if (!introCoversLesson33Shape(pkg.introScreens)) {
    errors.push('introScreens must explain result, formula, and practice');
  }
  if (!Array.isArray(pkg.theoryBlocks) || pkg.theoryBlocks.length < 3) {
    errors.push('theoryBlocks must contain at least 3 items');
  } else if (!theoryCoversLesson33Shape(pkg.theoryBlocks)) {
    errors.push('theoryBlocks must cover formula, contrast, questions/negatives, and traps');
  }
  if (!pkg.personalTraining || typeof pkg.personalTraining !== 'object') {
    errors.push('personalTraining is required');
  } else {
    if (!hasText(pkg.personalTraining.id)) errors.push('personalTraining.id is required');
    else if (pkg.personalTraining.id !== 'causative_have_get_done') errors.push('personalTraining.id must be causative_have_get_done');
    if (!Array.isArray(pkg.personalTraining.steps) || pkg.personalTraining.steps.length < 12) {
      errors.push('personalTraining.steps must contain at least 12 items');
    } else {
      const stepTypes = new Set(pkg.personalTraining.steps.map((step) => String(step?.type || '').trim()));
      for (const requiredType of ['recognition', 'production', 'mixed_review']) {
        if (!stepTypes.has(requiredType)) {
          errors.push('personalTraining.steps must cover recognition, production, and mixed_review');
          break;
        }
      }
      pkg.personalTraining.steps.forEach((step, index) => {
        if (!hasText(step?.prompt)) errors.push(`personalTraining.steps[${index}].prompt is required`);
        if (!targetMentionsLesson33Skill(step?.target)) {
          errors.push(`personalTraining.steps[${index}].target must mention the Lesson 33 causative skill`);
        }
      });
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    summary: {
      phraseCount: Array.isArray(pkg.phrases) ? pkg.phrases.length : 0,
      causativePatternCount: Array.isArray(pkg.phrases)
        ? pkg.phrases.filter((phrase) => hasLesson33CausativePattern(phrase?.english)).length
        : 0,
      needWantPatternCount: Array.isArray(pkg.phrases)
        ? pkg.phrases.filter((phrase) => hasNeedWantPattern(phrase?.english)).length
        : 0,
      questionCount: Array.isArray(pkg.phrases)
        ? pkg.phrases.filter((phrase) => isQuestionPhrase(phrase?.english)).length
        : 0,
      negativeCount: Array.isArray(pkg.phrases)
        ? pkg.phrases.filter((phrase) => isNegativePhrase(phrase?.english)).length
        : 0,
      introCount: Array.isArray(pkg.introScreens) ? pkg.introScreens.length : 0,
      theoryBlockCount: Array.isArray(pkg.theoryBlocks) ? pkg.theoryBlocks.length : 0,
      personalTrainingSteps: Array.isArray(pkg.personalTraining?.steps) ? pkg.personalTraining.steps.length : 0,
    },
  };
}

function gateReportMarkdown(report, packagePath) {
  const status = report.ok ? 'PASS' : 'BLOCKED';
  return `# Lesson 33 Gate Report

Status: ${status}

Package: \`${normalizePath(packagePath)}\`

## Summary

- Phrases: ${report.summary.phraseCount}
- Lesson 33 causative patterns: ${report.summary.causativePatternCount}
- Need/want patterns: ${report.summary.needWantPatternCount}
- Questions: ${report.summary.questionCount}
- Negatives: ${report.summary.negativeCount}
- Intro screens: ${report.summary.introCount}
- Theory blocks: ${report.summary.theoryBlockCount}
- Personal training steps: ${report.summary.personalTrainingSteps}

## Errors

${report.errors.length ? report.errors.map((item) => `- ${item}`).join('\n') : '- None'}

## Warnings

${report.warnings.length ? report.warnings.map((item) => `- ${item}`).join('\n') : '- None'}
`;
}

function curriculumBriefMarkdown(manifest) {
  return `# Lesson 33 Curriculum Brief

Lesson 33 continues Lesson 32 by turning its final advanced object-result patterns into one teachable B2 unit: **${LESSON_33_TOPIC}**.

## Objective

Teach learners to say that they arrange, need, want, or get a result done by someone else:

- I had my phone repaired.
- She got her documents checked.
- We need the room cleaned before evening.
- They want the problem solved quickly.

## Boundaries

- Keep the lesson at B2, not C1.
- Use 50 phrases, matching lessons 1-32.
- Do not introduce a new unrelated tense.
- Do not write directly into app source files from this pipeline.
- Preserve Lesson 32 as the anchor: it is the bridge, Lesson 33 is the focused continuation.

## Required Checks

${manifest.requiredChecks.map((check) => `- ${check}`).join('\n')}
`;
}

function phraseBlueprintMarkdown() {
  return `# Lesson 33 Phrase Blueprint

## Phrase Count

Create exactly 50 phrases.

## Progression

1. Phrases 1-10: clear service-result causative.
2. Phrases 11-20: need/want + object + V3.
3. Phrases 21-30: questions and negatives.
4. Phrases 31-40: longer objects with time/place modifiers.
5. Phrases 41-50: mixed review with Lesson 31-32 structures.

## Hard Rules

- Every English phrase must be natural American English.
- Every phrase needs RU, UK, and ES text.
- Every target token needs wordsEn with five useful distractors.
- Distractors must confuse grammar role, not random spelling.
- Reuse known vocabulary where possible, then add only the vocabulary needed for the new topic.
`;
}

function curriculumRoadmapMarkdown() {
  return `# Curriculum Roadmap 33-60

This roadmap keeps Lesson 33 connected to a minimum 60-lesson course expansion.

| Lesson | CEFR | Topic | Role | Prerequisites | Recycles | New skill | Risk | Why here |
|---:|---|---|---|---|---|---|---|---|
${LESSON_33_TO_60_ROADMAP.map((item) => `| ${item.lessonId} | ${item.cefr} | ${item.topic} | ${item.role} | ${item.prerequisites.join('; ')} | ${item.recycledFrom.join('; ')} | ${item.newSkill} | ${item.risk} | ${item.whyHere} |`).join('\n')}
`;
}

function introTheoryPlanMarkdown() {
  return `# Lesson 33 Intro And Theory Plan

## Intro Screens

Use 4 screens:

1. Concept: you are not doing the action yourself, you arrange the result.
2. Formula: have/get + object + V3.
3. Contrast: do it yourself vs have/get it done.
4. Practice: how to assemble object chunks and V3 endings.

## Theory Shape

Mirror existing \`lesson_help.tsx\` lessons:

- Start with "What you train in this lesson".
- Add a comparison table.
- Explain have vs get without overpromising a universal rule.
- Add questions and negatives.
- Add common traps.
- End with "What to take from the lesson".
`;
}

function personalTrainingPlanMarkdown() {
  return `# Lesson 33 Personal Training Plan

Recommended micro-diagnosis id: \`causative_have_get_done\`.

## Training Shape

- Category: syntax or verb.
- CEFR: B2.
- Prerequisites: passive voice, complex object, present/past participles.
- Steps: 15.
- Difficulties: easy -> contrast -> mixed -> mixed_review.

## Contrast Set

- do it myself
- have something done
- get something done
- need something done
- want something done
- by someone
- result now
`;
}

function qaReportMarkdown(manifest) {
  return `# Lesson 33 QA Report

Status: scaffolded

## Gate

This run is not ready for app integration until all required outputs are filled and all checks pass.

## Required Checks

${manifest.requiredChecks.map((check) => `- [ ] ${check}`).join('\n')}

## Source Write Guard

The pipeline must not modify:

${manifest.prohibitedWriteTargets.map((target) => `- ${target}`).join('\n')}
`;
}

function writeText(abs, text) {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text.endsWith('\n') ? text : `${text}\n`, 'utf8');
}

function writeJson(abs, value) {
  writeText(abs, JSON.stringify(value, null, 2));
}

function createLesson33Run(input = {}) {
  const root = input.root || process.cwd();
  const manifest = buildLesson33Manifest(input);
  const absOutDir = path.join(root, manifest.outputDir);

  writeJson(path.join(absOutDir, 'manifest.json'), manifest);
  writeJson(path.join(absOutDir, 'lesson_package.json'), lessonPackageStub(manifest));
  writeText(path.join(absOutDir, 'curriculum_brief.md'), curriculumBriefMarkdown(manifest));
  writeText(path.join(absOutDir, 'curriculum_roadmap_33_60.md'), curriculumRoadmapMarkdown());
  writeText(path.join(absOutDir, 'phrase_blueprint.md'), phraseBlueprintMarkdown());
  writeText(path.join(absOutDir, 'intro_theory_plan.md'), introTheoryPlanMarkdown());
  writeText(path.join(absOutDir, 'personal_training_plan.md'), personalTrainingPlanMarkdown());
  writeText(path.join(absOutDir, 'qa_report.md'), qaReportMarkdown(manifest));

  return manifest;
}

function runLesson33Gate(input = {}) {
  const root = input.root || process.cwd();
  const packagePath = input.packagePath;
  if (!packagePath) throw new Error('--package is required for gate mode');
  const absPackagePath = path.resolve(root, packagePath);
  assertPathWithinLesson33Runs(absPackagePath, root, 'gate package');
  const raw = fs.readFileSync(absPackagePath, 'utf8');
  const pkg = JSON.parse(raw);
  const report = validateLesson33Package(pkg);
  const outDir = input.outDir
    ? path.resolve(root, input.outDir)
    : path.dirname(absPackagePath);
  assertPathWithinLesson33Runs(outDir, root, 'gate report output');
  const reportJson = path.join(outDir, 'gate_report.json');
  const reportMd = path.join(outDir, 'gate_report.md');
  writeJson(reportJson, {
    ...report,
    packagePath: normalizePath(path.relative(root, absPackagePath)),
    generatedAt: new Date().toISOString(),
  });
  writeText(reportMd, gateReportMarkdown(report, path.relative(root, absPackagePath)));
  return {
    ...report,
    reportJson: normalizePath(path.relative(root, reportJson)),
    reportMd: normalizePath(path.relative(root, reportMd)),
  };
}

function checkProtocol(root = process.cwd()) {
  const missing = REQUIRED_ROOM_FILES.filter((file) => !fs.existsSync(path.join(root, file)));
  const contentRequirements = [
    { file: 'tools/lesson_33_agent_room/ROOM.md', text: 'Lesson 32' },
    { file: 'tools/lesson_33_agent_room/ROOM.md', text: 'have/get something done' },
    { file: 'docs/lesson33/PIPELINE.md', text: 'ready_for_review' },
    { file: 'docs/lesson33/PIPELINE.md', text: 'whyHere' },
    { file: 'tools/lesson_33_agent_room/templates/lesson_package.schema.md', text: 'ready_for_review' },
    { file: 'tools/lesson_33_agent_room/templates/lesson_package.schema.md', text: 'personalTraining.id' },
    { file: 'tools/lesson_33_agent_room/templates/lesson_package.schema.md', text: 'recycledFrom' },
  ];
  const contentErrors = [];
  for (const requirement of contentRequirements) {
    const abs = path.join(root, requirement.file);
    if (!fs.existsSync(abs)) continue;
    const content = fs.readFileSync(abs, 'utf8');
    if (!content.includes(requirement.text)) {
      contentErrors.push(`${requirement.file} must mention ${requirement.text}`);
    }
  }
  return {
    ok: missing.length === 0 && contentErrors.length === 0,
    missing,
    contentErrors,
    requiredFiles: REQUIRED_ROOM_FILES,
  };
}

module.exports = {
  DEFAULT_OUT_ROOT,
  LESSON_33_TO_60_ROADMAP,
  LESSON_33_TOPIC,
  REQUIRED_ROOM_FILES,
  buildLesson33Manifest,
  checkProtocol,
  createLesson33Run,
  runLesson33Gate,
  timestampSlug,
  validateLesson33Package,
};
