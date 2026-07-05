import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'english_blueprint');
const OUT_PATH = path.join(OUT_DIR, 'english_lesson_surgical_blueprint_v1.json');

const LESSON_SOURCES = [
  path.join(ROOT, 'app', 'lesson_data_1_8_phrases_es.gen.ts'),
  path.join(ROOT, 'app', 'lesson_data_9_16_phrases_es.gen.ts'),
  path.join(ROOT, 'app', 'lesson_data_17_24.ts'),
  path.join(ROOT, 'app', 'lesson_data_25_32.ts'),
];

const SOURCE_PATHS = {
  courseLevels: path.join(ROOT, 'app', 'course_levels.ts'),
  lessonNames: path.join(ROOT, 'constants', 'lessons.ts'),
  theoryRegistry: path.join(ROOT, 'app', 'theory_content_registry.ts'),
  irregularVerbs: path.join(ROOT, 'app', 'irregular_verbs_data.ts'),
  prepositions: path.join(ROOT, 'app', 'lesson_prepositions.ts'),
  prepositionExplanations: path.join(ROOT, 'app', 'preposition_explanations.ts'),
};

const PEDAGOGY_NOTES = {
  1: {
    topic: 'Pronouns and to be affirmative',
    sequencingReason: 'Starts with the smallest usable English sentence frame: subject + am/is/are + state/place/quality.',
    vocabularyPrinciple: 'High-frequency pronouns, simple adjectives, place/state adverbs; low cognitive load.',
    frenchNativeTransferRule: 'Start French with greeting/identity and etre only if it serves French sentence logic; include je/tu/il/elle and tu/vous early.',
  },
  2: {
    topic: 'To be negation and questions',
    sequencingReason: 'Adds polarity and yes/no question mechanics after the learner can already build affirmative to be frames.',
    vocabularyPrinciple: 'Reuses lesson 1 slots while changing not/question order to isolate one new operation.',
    frenchNativeTransferRule: 'Use ne...pas and est-ce que / inversion only in a staged French-native order.',
  },
  3: {
    topic: 'Present Simple affirmative',
    sequencingReason: 'Moves from identity/state to regular habitual action while keeping sentence type affirmative.',
    vocabularyPrinciple: 'Everyday verbs and routines; distractors focus on person/verb/base-form confusion.',
    frenchNativeTransferRule: 'Use present-tense -er verbs and high-frequency irregulars only when French requires them.',
  },
  4: {
    topic: 'Present Simple negation',
    sequencingReason: 'Adds do/does not after affirmative present simple so auxiliary logic is isolated.',
    vocabularyPrinciple: 'Reuses action vocabulary with negative polarity and third-person contrasts.',
    frenchNativeTransferRule: 'Use French ne...pas with present verbs; do not import English do-support logic.',
  },
  5: {
    topic: 'Present Simple questions',
    sequencingReason: 'Adds do/does question order after affirmative/negative forms are stable.',
    vocabularyPrinciple: 'Question forms target auxiliary placement and subject-verb agreement.',
    frenchNativeTransferRule: 'Teach French yes/no questions through intonation, est-ce que, and selected inversion in the right order.',
  },
  6: {
    topic: 'Wh questions',
    sequencingReason: 'Builds open questions on top of yes/no question grammar.',
    vocabularyPrinciple: 'Question words are the main lexical focus; distractors confuse wh-word choice and word order.',
    frenchNativeTransferRule: 'Use qui/quoi/ou/quand/comment/pourquoi with French word-order variants.',
  },
  7: {
    topic: 'Have',
    sequencingReason: 'Introduces possession/need-like ownership after to be and simple action frames.',
    vocabularyPrinciple: 'Possessions, people, everyday objects; contrasts have/has.',
    frenchNativeTransferRule: 'Use avoir as a core French anchor because it also supports age and compound-tense foundations.',
  },
  8: {
    topic: 'Prepositions of time',
    sequencingReason: 'Adds compact function words once basic clauses are available.',
    vocabularyPrinciple: 'Time expressions force in/on/at contrasts with narrow semantic slots.',
    frenchNativeTransferRule: 'Use French time prepositions and articles/contractions instead of copying in/on/at logic.',
  },
  9: {
    topic: 'There is / there are',
    sequencingReason: 'Introduces existence/location frames after basic possession/place language.',
    vocabularyPrinciple: 'Objects and places; singular/plural contrast is central.',
    frenchNativeTransferRule: 'Use il y a and location phrases as a French-native existential frame.',
  },
  10: {
    topic: 'Modal verbs',
    sequencingReason: 'Adds ability/permission/obligation before past/future tense expansion.',
    vocabularyPrinciple: 'Common actions with can/must/should-like slots.',
    frenchNativeTransferRule: 'Use pouvoir/devoir/vouloir carefully with infinitives and present conjugation.',
  },
  11: {
    topic: 'Past Simple regular verbs',
    sequencingReason: 'Introduces past time with predictable -ed before irregular verbs.',
    vocabularyPrinciple: 'Regular action verbs and past-time adverbs.',
    frenchNativeTransferRule: 'Use French passe compose/imparfait staging based on real communicative function, not English -ed.',
  },
  12: {
    topic: 'Past Simple irregular verbs',
    sequencingReason: 'Follows regular past with memorized high-frequency irregular forms.',
    vocabularyPrinciple: 'High-frequency irregular verbs grouped in manageable waves.',
    frenchNativeTransferRule: 'Replace with French high-frequency irregular/conjugation practice, including etre/avoir auxiliaries later.',
  },
  13: {
    topic: 'Future Simple',
    sequencingReason: 'Adds future planning after present and past foundations.',
    vocabularyPrinciple: 'Plans, tomorrow/next markers, will/verb contrast.',
    frenchNativeTransferRule: 'Use futur proche before or alongside futur simple depending on French-native progression.',
  },
  14: {
    topic: 'Comparatives',
    sequencingReason: 'Adds comparison once adjective/noun inventory exists.',
    vocabularyPrinciple: 'Adjectives/adverbs with more/less/as slots and common comparison nouns.',
    frenchNativeTransferRule: 'Use plus/moins/aussi...que and French adjective agreement.',
  },
  15: {
    topic: 'Possessives',
    sequencingReason: 'Extends pronoun work into ownership agreement and noun phrase control.',
    vocabularyPrinciple: 'Family/objects with my/your/his/her/our/their contrasts.',
    frenchNativeTransferRule: 'Use mon/ma/mes etc. with noun gender/number, not owner gender.',
  },
  16: {
    topic: 'Phrasal verbs',
    sequencingReason: 'Introduces particle meaning after verbs/prepositions exist.',
    vocabularyPrinciple: 'Common verb-particle chunks, often with lexicalized meanings.',
    frenchNativeTransferRule: 'Replace with French verb+preposition/idiomatic constructions, not phrasal-verb calques.',
  },
  17: {
    topic: 'Present Continuous',
    sequencingReason: 'Contrasts current action with habitual present simple.',
    vocabularyPrinciple: 'Now/actions; be + -ing slot control.',
    frenchNativeTransferRule: 'Use present tense and etre en train de only where French naturally needs progressive emphasis.',
  },
  18: {
    topic: 'Imperative',
    sequencingReason: 'Adds command/request form after present verb control.',
    vocabularyPrinciple: 'Short commands, classroom/service actions, politeness markers.',
    frenchNativeTransferRule: 'Use tu/vous imperative and polite request alternatives.',
  },
  19: {
    topic: 'Prepositions of place',
    sequencingReason: 'Moves from time prepositions to spatial relation control in B1 app tier.',
    vocabularyPrinciple: 'Places/objects with in/on/at/under/behind/near contrasts.',
    frenchNativeTransferRule: 'Use French spatial prepositions and contracted articles with real place-noun behavior.',
  },
  20: {
    topic: 'Articles',
    sequencingReason: 'Targets noun phrase precision once learners have many nouns.',
    vocabularyPrinciple: 'Definite/indefinite/zero-like choices and countability contexts.',
    frenchNativeTransferRule: 'Make articles central much earlier in French; gender/number and partitives are required.',
  },
  21: {
    topic: 'Indefinite pronouns',
    sequencingReason: 'Adds someone/anything/nobody-like reference after question/negation systems.',
    vocabularyPrinciple: 'Pronoun families and polarity-sensitive forms.',
    frenchNativeTransferRule: 'Use quelqu un/quelque chose/personne/rien with ne and French polarity rules.',
  },
  22: {
    topic: 'Gerund',
    sequencingReason: 'Adds verb-as-noun and after-preposition -ing patterns.',
    vocabularyPrinciple: 'Activities and preference/collocation frames.',
    frenchNativeTransferRule: 'Use French infinitive/gerondif only where French grammar actually uses them.',
  },
  23: {
    topic: 'Passive voice',
    sequencingReason: 'Introduces voice transformation after tense and object control exist.',
    vocabularyPrinciple: 'Agent/action/result phrases; by-agent optionality.',
    frenchNativeTransferRule: 'Use etre + past participle and agreement, plus French alternatives when passive is unnatural.',
  },
  24: {
    topic: 'Present Perfect',
    sequencingReason: 'Adds experience/result past that contrasts with simple past.',
    vocabularyPrinciple: 'Ever/never/already/just/yet and participle choices.',
    frenchNativeTransferRule: 'Map to passe compose and aspectual adverbs, not English present perfect mechanics.',
  },
  25: {
    topic: 'Past Continuous',
    sequencingReason: 'Adds background action and interruption logic after simple past.',
    vocabularyPrinciple: 'While/when scenes and ongoing past actions.',
    frenchNativeTransferRule: 'Use imparfait vs passe compose contrast as a French-native core B1 topic.',
  },
  26: {
    topic: 'Conditionals',
    sequencingReason: 'Combines tense, modality, and clause logic for hypotheticals.',
    vocabularyPrinciple: 'If-clauses, would/could consequences, realistic scenarios.',
    frenchNativeTransferRule: 'Use si clauses and conditionnel with French tense-sequence constraints.',
  },
  27: {
    topic: 'Reported speech',
    sequencingReason: 'Requires stable tense/pronoun/time expression transformation.',
    vocabularyPrinciple: 'Say/tell/ask and pronoun/time-shift slots.',
    frenchNativeTransferRule: 'Use discours indirect with que/si and French tense/pronoun changes.',
  },
  28: {
    topic: 'Reflexive pronouns',
    sequencingReason: 'Adds self-reference and object-pronoun behavior late in B1.',
    vocabularyPrinciple: 'Self-care/actions and pronoun agreement slots.',
    frenchNativeTransferRule: 'French pronominal verbs are core and should be treated as a native verb class.',
  },
  29: {
    topic: 'Used to',
    sequencingReason: 'B2 tier starts with subtle past-habit/state contrast and common learner confusion with be/get used to.',
    vocabularyPrinciple: 'Past habits, states, contrast with now; distractors target used/use/using.',
    frenchNativeTransferRule: 'Use imparfait for past habit/state and explicit avant/habituellement where needed.',
  },
  30: {
    topic: 'Relative clauses',
    sequencingReason: 'Builds longer noun descriptions and clause embedding.',
    vocabularyPrinciple: 'Who/which/that/where slots and noun antecedents.',
    frenchNativeTransferRule: 'Use qui/que/ou/dont with French object/subject distinction.',
  },
  31: {
    topic: 'Complex object',
    sequencingReason: 'Teaches verb + object + infinitive constructions after clause control.',
    vocabularyPrinciple: 'Want/ask/tell/let/help-type frames and object pronouns.',
    frenchNativeTransferRule: 'Map to faire/laisser/demander a/vouloir que or infinitive structures based on French valency.',
  },
  32: {
    topic: 'Final review',
    sequencingReason: 'Consolidates all prior grammar families and tests cross-topic switching.',
    vocabularyPrinciple: 'Mixed review with distractors from multiple earlier categories.',
    frenchNativeTransferRule: 'Build a French synthesis review from all French-native lessons, not an English grammar mirror.',
  },
};

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256Text(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function appLevelForLesson(lessonId) {
  if (lessonId <= 8) return 'A1';
  if (lessonId <= 18) return 'A2';
  if (lessonId <= 28) return 'B1';
  return 'B2';
}

function extractLessonSection(source, lessonId) {
  const startRegex = new RegExp(`export\\s+const\\s+LESSON_${lessonId}_PHRASES[\\s\\S]*?=\\s*\\[`);
  const startMatch = source.match(startRegex);
  if (!startMatch || startMatch.index === undefined) return '';
  const start = startMatch.index;
  const rest = source.slice(start + startMatch[0].length);
  const nextMatch = rest.match(/\nexport\s+const\s+LESSON_\d+_PHRASES/);
  const end = nextMatch?.index ?? rest.length;
  return source.slice(start, start + startMatch[0].length + end);
}

function stringMatches(source, key) {
  const out = [];
  const regex = new RegExp(`${key}:\\s*(['"\`])([\\s\\S]*?)\\1`, 'g');
  for (const match of source.matchAll(regex)) out.push(match[2]);
  return out;
}

function inc(map, key, amount = 1) {
  if (!key) return;
  map[key] = (map[key] ?? 0) + amount;
}

function topEntries(map, limit = 12) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

function parseWordSlots(section, arrayName) {
  const slots = [];
  let inTargetArray = false;
  for (const line of section.split(/\r?\n/)) {
    if (line.includes(`${arrayName}: [`)) {
      inTargetArray = true;
      continue;
    }
    if (inTargetArray && /^\s*\],?\s*$/.test(line)) {
      inTargetArray = false;
      continue;
    }
    if (!inTargetArray) continue;
    const correct = line.match(/correct:\s*(['"`])([\s\S]*?)\1/)?.[2] ?? null;
    const category = line.match(/category:\s*(['"`])([\s\S]*?)\1/)?.[2] ?? null;
    const distractorBlock = line.match(/distractors:\s*\[([^\]]*)\]/)?.[1] ?? '';
    const distractors = [...distractorBlock.matchAll(/(['"`])([\s\S]*?)\1/g)].map((match) => match[2]);
    if (correct || category || distractors.length > 0) slots.push({ correct, category, distractors });
  }
  return slots;
}

function analyzeDistractors(slots) {
  const byCategory = {};
  const setSizeDistribution = {};
  let duplicateCorrectInDistractors = 0;
  let duplicateDistractors = 0;
  let totalDistractors = 0;
  for (const slot of slots) {
    inc(byCategory, slot.category ?? 'unknown');
    inc(setSizeDistribution, String(slot.distractors.length));
    totalDistractors += slot.distractors.length;
    const normalizedCorrect = String(slot.correct ?? '').trim().toLowerCase();
    const normalizedDistractors = slot.distractors.map((value) => String(value).trim().toLowerCase());
    if (normalizedCorrect && normalizedDistractors.includes(normalizedCorrect)) duplicateCorrectInDistractors += 1;
    if (new Set(normalizedDistractors).size !== normalizedDistractors.length) duplicateDistractors += 1;
  }
  return {
    slotsTotal: slots.length,
    totalDistractors,
    averageDistractorsPerSlot: slots.length ? Number((totalDistractors / slots.length).toFixed(2)) : 0,
    setSizeDistribution,
    categoryDistribution: byCategory,
    duplicateCorrectInDistractors,
    duplicateDistractorSets: duplicateDistractors,
    inferredPrinciples: [
      'Distractors are attached to a specific word slot, not to the whole phrase.',
      'Most slots use same-category alternatives: pronoun vs pronoun, verb form vs verb form, adjective vs adjective.',
      'Early lessons mix grammatical confusions with spelling/near-form confusions to train recognition.',
      'Production French must generate distractors from French grammar slots and plausible French learner errors, not English alternatives.',
    ],
  };
}

function analyzeLesson(lessonId, combinedSource) {
  const section = extractLessonSection(combinedSource, lessonId);
  const phraseIds = new Set([...section.matchAll(new RegExp(`\\b(lesson${lessonId}_phrase_\\d+)\\b`, 'g'))].map((match) => match[1]));
  const englishPhrases = stringMatches(section, 'english');
  const wordsEnSlots = parseWordSlots(section, 'wordsEn');
  const fallbackWordsSlots = wordsEnSlots.length > 0 ? [] : parseWordSlots(section, 'words');
  const analyzedSlots = wordsEnSlots.length > 0 ? wordsEnSlots : fallbackWordsSlots;
  const categoryCounts = {};
  const correctCounts = {};
  for (const slot of analyzedSlots) {
    inc(categoryCounts, slot.category ?? 'unknown');
    inc(correctCounts, slot.correct ?? 'unknown');
  }
  const phraseLengths = englishPhrases.map((phrase) => (phrase.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? []).length);
  const note = PEDAGOGY_NOTES[lessonId];
  return {
    lessonId,
    appCourseLevel: appLevelForLesson(lessonId),
    englishTopic: note.topic,
    sequencingReason: note.sequencingReason,
    vocabularyPrinciple: note.vocabularyPrinciple,
    frenchNativeTransferRule: note.frenchNativeTransferRule,
    sourcePaths: LESSON_SOURCES.map(rel).filter((sourcePath) => section.includes(path.basename(sourcePath).replace(/\\/g, '/')) === false),
    phraseBlueprint: {
      phraseRows: phraseIds.size,
      expectedPhraseRows: 50,
      sampleEnglishPhrases: englishPhrases.slice(0, 8),
      averageEnglishTokenLength: phraseLengths.length
        ? Number((phraseLengths.reduce((sum, value) => sum + value, 0) / phraseLengths.length).toFixed(2))
        : 0,
      minEnglishTokenLength: phraseLengths.length ? Math.min(...phraseLengths) : 0,
      maxEnglishTokenLength: phraseLengths.length ? Math.max(...phraseLengths) : 0,
      wordSlotSource: wordsEnSlots.length > 0 ? 'wordsEn' : fallbackWordsSlots.length > 0 ? 'words_fallback' : 'missing',
      wordsEnSlots: wordsEnSlots.length,
      analyzedWordSlots: analyzedSlots.length,
      topWordsEnCorrect: topEntries(correctCounts),
      categoryDistribution: categoryCounts,
      topCategories: topEntries(categoryCounts),
    },
    distractorBlueprint: analyzeDistractors(analyzedSlots),
  };
}

function analyzeTheory(lessonId) {
  const filePath = path.join(ROOT, 'app', `theory_content_lesson${lessonId}.ts`);
  const source = readText(filePath);
  const blockKinds = {};
  const drillTypes = {};
  for (const match of source.matchAll(/kind:\s*['"`]([^'"`]+)['"`]/g)) inc(blockKinds, match[1]);
  for (const match of source.matchAll(/type:\s*['"`]([^'"`]+)['"`]/g)) inc(drillTypes, match[1]);
  return {
    lessonId,
    path: rel(filePath),
    titleRuPresent: /titleRu:\s*['"`]/.test(source),
    titleUkPresent: /titleUk:\s*['"`]/.test(source),
    sectionCount: [...source.matchAll(/\n\s*num:\s*['"`]\d+['"`]/g)].length,
    exampleCountMarkers: [...source.matchAll(/exampleCount:\s*(\d+)/g)].map((match) => Number(match[1])),
    exampleRows: [...source.matchAll(/\{\s*en:\s*['"`]/g)].length,
    fixRows: [...source.matchAll(/wrong:\s*['"`][\s\S]*?right:\s*['"`]/g)].length,
    blockKinds,
    drillTypes,
    shapePrinciple: 'French theory must keep the same structured section/block/drill shape but explain French grammar and French learner mistakes.',
  };
}

function analyzeIrregularVerbs() {
  const source = readText(SOURCE_PATHS.irregularVerbs);
  const glossary = [...source.matchAll(/^\s*([a-z]+):\s*\{\s*base:\s*['"`]([^'"`]+)['"`],\s*past:\s*['"`]([^'"`]+)['"`],\s*pp:\s*['"`]([^'"`]+)['"`]/gm)]
    .map((match) => ({ key: match[1], base: match[2], past: match[3], pp: match[4] }));
  const lessonBaseBlock = source.match(/const LESSON_IRREGULAR_BASES = \{([\s\S]*?)\n\}\s*(?:as const|satisfies [^;]+);/)?.[1] ?? '';
  const byLesson = [];
  for (const match of lessonBaseBlock.matchAll(/^\s*(\d+):\s*\[([^\]]*)\]/gm)) {
    const lessonId = Number(match[1]);
    const bases = [...match[2].matchAll(/['"`]([^'"`]+)['"`]/g)].map((m) => m[1]);
    byLesson.push({ lessonId, count: bases.length, bases });
  }
  return {
    path: rel(SOURCE_PATHS.irregularVerbs),
    glossaryCount: glossary.length,
    lessonsWithIrregulars: byLesson.filter((row) => row.count > 0).length,
    portionSize: Number(source.match(/IRREGULAR_VERB_PORTION_SIZE\s*=\s*(\d+)/)?.[1] ?? 0),
    byLesson,
    sampleVerbs: glossary.slice(0, 12),
    principle: 'English irregular verbs are high-frequency base/past/participle triples grouped by lesson and portioned to reduce load; French must replace this with conjugation-family and high-frequency irregular verb practice.',
  };
}

function analyzePrepositions() {
  const source = readText(SOURCE_PATHS.prepositions);
  const explanations = readText(SOURCE_PATHS.prepositionExplanations);
  const setSizes = {};
  for (const name of ['directionSet', 'placeSet', 'timeSet', 'TRUE_PREPOSITIONS', 'COMPOUND_PREPOSITIONS']) {
    const setBlock = source.match(new RegExp(`const ${name} = (?:new Set\\()?\\[([\\s\\S]*?)\\]`))?.[1] ?? '';
    setSizes[name] = [...setBlock.matchAll(/['"`]([^'"`]+)['"`]/g)].length;
  }
  return {
    paths: [rel(SOURCE_PATHS.prepositions), rel(SOURCE_PATHS.prepositionExplanations)],
    setSizes,
    taggedSlotDetection: source.includes('isPrepositionSlot') && source.includes('taggedPrepositionAnswers'),
    autoOccurrenceDetection: source.includes('isDrillPrepositionOccurrence'),
    phrasalParticleExclusions: source.includes('PARTICLE_WORDS') && source.includes('return false'),
    explanationRules: [...explanations.matchAll(/preposition:\s*['"`]([^'"`]+)['"`]/g)].length,
    principle: 'English preposition drills combine tagged word slots, auto-detected true prepositions, kind classification, phrasal-particle exclusions, and context explanations; French must rebuild this around French prepositions, contractions, and valency.',
  };
}

function main() {
  const generatedAt = new Date().toISOString();
  const combinedLessonSource = LESSON_SOURCES.map(readText).join('\n');
  const lessons = Array.from({ length: 32 }, (_, index) => analyzeLesson(index + 1, combinedLessonSource));
  const theory = Array.from({ length: 32 }, (_, index) => analyzeTheory(index + 1));
  const irregularVerbs = analyzeIrregularVerbs();
  const prepositions = analyzePrepositions();

  const blockers = [];
  const productionBlockers = [
    'FRENCH_32_LESSON_CONTENT_MUST_BE_REBUILT_FROM_SURGICAL_BLUEPRINT',
    'FRENCH_WORDS_AND_DISTRACTORS_MUST_BE_NATIVE_PER_LESSON',
    'FRENCH_THEORY_MUST_BE_WRITTEN_IN_THE_SAME_SHAPE_FOR_32_LESSONS',
    'FRENCH_PREPOSITION_AND_CONJUGATION_DRILLS_MUST_REPLACE_ENGLISH_SPECIFICS',
  ];

  if (lessons.length !== 32) blockers.push('LESSON_BLUEPRINT_NOT_32');
  if (lessons.some((lesson) => lesson.phraseBlueprint.phraseRows !== 50)) blockers.push('LESSON_PHRASE_ROWS_NOT_50');
  if (lessons.some((lesson) => lesson.phraseBlueprint.analyzedWordSlots <= 0)) blockers.push('WORD_SLOTS_MISSING');
  if (lessons.some((lesson) => lesson.distractorBlueprint.slotsTotal <= 0)) blockers.push('DISTRACTOR_BLUEPRINT_MISSING');
  if (theory.some((lesson) => lesson.sectionCount <= 0 || !lesson.titleRuPresent || !lesson.titleUkPresent)) blockers.push('THEORY_SHAPE_INCOMPLETE');
  if (irregularVerbs.glossaryCount <= 0 || irregularVerbs.lessonsWithIrregulars <= 0) blockers.push('IRREGULAR_VERB_BLUEPRINT_MISSING');
  if (!prepositions.taggedSlotDetection || !prepositions.autoOccurrenceDetection) blockers.push('PREPOSITION_BLUEPRINT_MISSING');

  const audit = {
    schemaVersion: 'gustav-english-lesson-surgical-blueprint-v1',
    generatedAt,
    status: blockers.length === 0 ? 'PASS' : 'BLOCK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    readyForApply: false,
    lessonSources: LESSON_SOURCES.map(rel),
    lessons,
    theory,
    drills: {
      irregularVerbs,
      prepositions,
    },
    globalPrinciplesForFrench: [
      'Keep the English product shape: 32 lessons, 50 rows each, word slots, categories, distractors, theory sections, drills.',
      'Do not copy English sequence mechanically where French grammar requires earlier/later treatment.',
      'For every French row, choose words and distractors from the French grammar slot being trained.',
      'For every French theory page, preserve structure but explain French-specific grammar and common mistakes.',
      'Replace English irregular verbs and prepositions with French conjugation/preposition systems.',
    ],
    summary: {
      lessonCount: lessons.length,
      lessonsWith50Rows: lessons.filter((lesson) => lesson.phraseBlueprint.phraseRows === 50).length,
      totalPhraseRows: lessons.reduce((sum, lesson) => sum + lesson.phraseBlueprint.phraseRows, 0),
      totalWordsEnSlots: lessons.reduce((sum, lesson) => sum + lesson.phraseBlueprint.wordsEnSlots, 0),
      totalAnalyzedWordSlots: lessons.reduce((sum, lesson) => sum + lesson.phraseBlueprint.analyzedWordSlots, 0),
      lessonsUsingWordsFallback: lessons.filter((lesson) => lesson.phraseBlueprint.wordSlotSource === 'words_fallback').map((lesson) => lesson.lessonId),
      totalDistractorSlots: lessons.reduce((sum, lesson) => sum + lesson.distractorBlueprint.slotsTotal, 0),
      duplicateCorrectInDistractors: lessons.reduce((sum, lesson) => sum + lesson.distractorBlueprint.duplicateCorrectInDistractors, 0),
      theoryLessons: theory.length,
      theorySections: theory.reduce((sum, lesson) => sum + lesson.sectionCount, 0),
      irregularVerbGlossaryCount: irregularVerbs.glossaryCount,
      lessonsWithIrregulars: irregularVerbs.lessonsWithIrregulars,
      prepositionExplanationRules: prepositions.explanationRules,
      blockers: blockers.length,
      productionBlockers: productionBlockers.length,
      activationApproved: false,
      readyForApply: false,
      sourceHash: sha256Text([
        combinedLessonSource,
        ...Array.from({ length: 32 }, (_, index) => readText(path.join(ROOT, 'app', `theory_content_lesson${index + 1}.ts`))),
        readText(SOURCE_PATHS.irregularVerbs),
        readText(SOURCE_PATHS.prepositions),
        readText(SOURCE_PATHS.prepositionExplanations),
      ].join('\n')),
    },
    blockers,
    productionBlockers,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      frenchContentModifiedByThisScript: false,
      appApplyStarted: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(OUT_PATH, audit);
  console.log(`${audit.status} ${rel(OUT_PATH)} lessons=${audit.summary.lessonsWith50Rows}/32 slots=${audit.summary.totalWordsEnSlots} theorySections=${audit.summary.theorySections}`);
}

main();
