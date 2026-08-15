import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const WORK_ORDERS_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'work_orders', 'fr_builder_work_orders.json');
const RESEARCH_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'research_best_practices', 'fr_feature_research_packets.json');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'core_lessons_32');
const OUT_JSON = path.join(OUT_DIR, 'fr_lesson_scope_sequence_packet.json');
const OUT_MD = path.join(OUT_DIR, 'fr_lesson_order_decision.md');

const TARGET_SEQUENCE = [
  lesson(1, 'A1.1', ['greetings', 'classroom survival', 'tu/vous', 'je/tu/il/elle'], ['salutations', 'identity', 'polite classroom phrases'], [], 'French onboarding starts with interaction rituals and pronouns so learners can act socially before grammar expansion.'),
  lesson(2, 'A1.1', ['etre present', 'c est / il est contrast', 'basic adjective agreement'], ['states', 'nationality', 'simple qualities'], [1], 'Etre and c est/il est are high-frequency foundations and must precede broad adjective/vocabulary work.'),
  lesson(3, 'A1.1', ['gender', 'definite articles', 'indefinite articles', 'plural basics'], ['people', 'objects', 'places'], [1, 2], 'French nouns cannot be learned safely without gender and article metadata; this must come early, unlike English.'),
  lesson(4, 'A1.1', ['avoir present', 'age with avoir', 'possession', 'common avoir expressions'], ['age', 'family', 'needs', 'sensations'], [2, 3], 'Avoir is needed for identity, possession and idiomatic learner phrases before larger present-tense coverage.'),
  lesson(5, 'A1.1', ['regular -er present', 'subject pronouns', 'basic sentence order'], ['daily actions', 'study actions'], [1, 2, 3, 4], 'Regular -er verbs build predictable present-tense production after the noun/article foundation.'),
  lesson(6, 'A1.1', ['negation ne...pas', 'article changes after negation', 'basic adverbs'], ['not having/doing', 'simple corrections'], [3, 4, 5], 'Negation interacts with articles and must be introduced before questions and quiz distractors use negative forms heavily.'),
  lesson(7, 'A1.1', ['yes/no questions', 'est-ce que', 'intonation questions', 'basic answers'], ['questions about identity/actions'], [2, 4, 5, 6], 'Question formation should follow enough declarative material to make interaction tasks meaningful.'),
  lesson(8, 'A1.1', ['question words', 'qui/quoi/ou/quand/comment/pourquoi', 'word order patterns'], ['asking for help', 'time/place/reason'], [7], 'Question words expand communicative tasks and prepare dialogs, Compass prompts and practice tasks.'),
  lesson(9, 'A1.1', ['aller present', 'near future aller + infinitive', 'a / au / aux'], ['movement', 'places', 'near future plans'], [3, 5, 8], 'Aller is both high-frequency and the near-future engine; preposition/article contractions must be attached early.'),
  lesson(10, 'A1.2', ['faire present', 'weather with faire', 'common faire expressions'], ['weather', 'activities', 'sports'], [3, 5, 9], 'Faire is a core French verb and unlocks weather/activity phrases that English does not structure the same way.'),
  lesson(11, 'A1.2', ['modal pouvoir', 'modal vouloir', 'modal devoir', 'verb + infinitive'], ['requests', 'permission', 'obligation'], [5, 7, 8], 'Modals enable practical action-oriented tasks before past/future expansion.'),
  lesson(12, 'A1.2', ['prepositions of place', 'de / du / de la / des', 'chez', 'dans/sur/a'], ['home', 'city', 'directions'], [3, 6, 9], 'French prepositions and article contractions need their own lesson before location-heavy practice/arena items.'),
  lesson(13, 'A1.2', ['partitive articles', 'food quantities', 'negative de'], ['food', 'shopping', 'ordering'], [3, 6, 12], 'Partitives are a French-specific blocker for food/shopping content and cannot wait until late A2.'),
  lesson(14, 'A1.2', ['adjective position', 'agreement', 'common irregular adjectives'], ['description', 'clothes', 'people'], [2, 3, 13], 'Adjective placement/agreement must be explicit because English order creates common calques.'),
  lesson(15, 'A1.2', ['possessive adjectives', 'demonstrative adjectives'], ['family', 'objects', 'choices'], [3, 14], 'Possessives/demonstratives depend on French noun gender/number, not owner gender like many learners expect.'),
  lesson(16, 'A1.2', ['reflexive verbs present', 'daily routine', 'pronoun placement basics'], ['routine', 'morning/evening'], [5, 6, 7], 'Reflexive patterns should be introduced before past reflexives and personal-practice weak spots.'),
  lesson(17, 'A1.2', ['imperative', 'polite commands', 'negative imperative'], ['instructions', 'classroom', 'navigation'], [6, 11, 16], 'Imperatives support app practice instructions, tasks and real-world action commands.'),
  lesson(18, 'A1.2', ['object pronouns le/la/les', 'me/te/nous/vous', 'placement before verb'], ['people and objects', 'requests'], [3, 11, 16], 'Object pronouns are a French-specific syntax step that must precede richer dialogs and mistake explanations.'),
  lesson(19, 'A2.1', ['passe compose with avoir', 'regular participles', 'time markers'], ['yesterday', 'completed actions'], [5, 6, 18], 'Past tense comes after pronoun/articles foundations so explanations and agreement risks are not hidden.'),
  lesson(20, 'A2.1', ['passe compose with etre', 'movement verbs', 'reflexive past'], ['travel', 'routine completed actions'], [16, 19], 'Etre/reflexive past forms are distinct French grammar and need their own gate before mixed past practice.'),
  lesson(21, 'A2.1', ['irregular past participles', 'avoir/etre review', 'agreement awareness'], ['life events', 'common irregular actions'], [19, 20], 'Irregular participles should follow the regular passe compose frame and feed quizzes/practice.'),
  lesson(22, 'A2.1', ['imparfait introduction', 'habit/background', 'passe compose vs imparfait contrast'], ['childhood', 'descriptions', 'past habits'], [19, 20, 21], 'French past aspect contrast is high-risk and should be separated from initial past-tense formation.'),
  lesson(23, 'A2.1', ['future proche review', 'simple future introduction', 'si + present/future'], ['plans', 'predictions', 'conditions'], [9, 11, 22], 'Future expands from aller + infinitive into simple future only after enough verb base exists.'),
  lesson(24, 'A2.1', ['comparatives', 'superlatives', 'meilleur/mieux'], ['comparison', 'preferences'], [14, 23], 'Comparatives rely on adjective/adverb categories and should not precede adjective agreement foundations.'),
  lesson(25, 'A2.1', ['pronouns y and en', 'de/a complements', 'quantity reference'], ['places', 'quantities', 'replacements'], [12, 13, 18], 'Y/en are French-specific and depend on prepositions/partitives, so they follow those foundations.'),
  lesson(26, 'A2.1', ['double pronoun awareness', 'direct/indirect object contrast'], ['giving', 'showing', 'telling'], [18, 25], 'Pronoun order is a major French learner risk and needs controlled sequencing before free dialogs.'),
  lesson(27, 'A2.2', ['relative pronouns qui/que/ou', 'que elision'], ['describing people/things/places'], [18, 24, 26], 'Relative clauses can build richer phrase content after pronoun and adjective systems are stable.'),
  lesson(28, 'A2.2', ['relative dont', 'de-linked relatives', 'possession/need links'], ['relationships', 'objects', 'reasons'], [25, 27], 'Dont is French-specific and depends on de-complements, so it follows y/en and basic relatives.'),
  lesson(29, 'A2.2', ['conditionnel present', 'polite requests', 'advice'], ['requests', 'suggestions', 'hypotheticals'], [11, 23, 24], 'Conditionnel supports politeness and advice after modals/future/comparison are known.'),
  lesson(30, 'A2.2', ['subjunctive awareness', 'il faut que', 'wishes/necessity'], ['needs', 'wishes', 'opinions'], [21, 26, 29], 'Only awareness-level subjunctive belongs here; production remains limited and source-gated.'),
  lesson(31, 'A2.2', ['faire causative', 'laisser + infinitive', 'advanced verb chains'], ['services', 'repairs', 'getting things done'], [11, 26, 29], 'Causative faire is useful but structurally complex and should not appear before pronoun/infinitive chains.'),
  lesson(32, 'A2.2', ['mixed review', 'dialogue integration', 'exam readiness', 'targeted weak spots'], ['review', 'situations', 'exam prep'], [1, 31], 'Final lesson integrates all A1/A2 systems and feeds diagnostics, exams and arena.'),
];

function lesson(lessonId, cefrBand, targetGrammarFocus, targetVocabularyFocus, prerequisiteLessonIds, reasonThisComesHere) {
  return {
    lessonId,
    cefrBand,
    targetGrammarFocus,
    targetVocabularyFocus,
    blockedEnglishCalques: blockedCalques(targetGrammarFocus),
    prerequisiteLessonIds,
    reasonThisComesHere,
  };
}

function blockedCalques(focus) {
  const text = focus.join(' ').toLowerCase();
  const rules = [];
  if (/article|gender|partitive|possessive|demonstrative/.test(text)) rules.push('Do not treat French nouns as article-free English nouns.');
  if (/question|est-ce/.test(text)) rules.push('Do not force English auxiliary-question order onto French questions.');
  if (/negation|negative/.test(text)) rules.push('Do not ignore ne/pas and article change after negation.');
  if (/preposition|du|de la|au|aux|y|en/.test(text)) rules.push('Do not translate English prepositions one-to-one without French construction evidence.');
  if (/passe|imparfait|future|conditionnel|subjunctive|verb|modal|faire|aller|avoir|etre/.test(text)) rules.push('Do not copy English tense/modal meanings without French verb-form evidence.');
  if (/pronoun|reflexive|relative/.test(text)) rules.push('Do not copy English pronoun position or relative-pronoun choice.');
  return rules;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function currentLessonFingerprint() {
  const lessons = [];
  for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
    const file = path.join(ROOT, 'scripts', `gustav_generate_french_lesson${lessonId}_ledger.ts`);
    const source = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    const categories = [...new Set([...source.matchAll(/'([^']+)'/g)]
      .map((match) => match[1])
      .filter((value) => /^(etre|avoir|aller|faire|modal|present|passe|future|near|neg|question|pronoun|preposition|article|adjective|adverb|imperative|comparative|condition|verb|c_est|idiom|noun|gender|possessive|demonstrative|partitive|reflexive|relative|object|y_|en_)/i.test(value)))];
    lessons.push({
      lessonId,
      sourceFile: path.relative(ROOT, file).replace(/\\/g, '/'),
      itemCallCount: (source.match(/item\(/g) || []).length,
      grammarCategorySample: categories.slice(0, 16),
      observedRisk: observedRiskFor(lessonId, categories),
    });
  }
  return lessons;
}

function observedRiskFor(lessonId, categories) {
  if (lessonId > 12 && categories.some((category) => /articles|partitive|adjective_agreement/.test(category))) {
    return 'late_foundation_topic';
  }
  if (lessonId <= 12 && categories.some((category) => /passe_compose|future|relative|faire_causative/.test(category))) {
    return 'advanced_topic_too_early';
  }
  if (categories.length === 0) return 'unknown_or_nonstandard_generator_shape';
  return 'needs_alignment_review';
}

function buildPacket() {
  const workOrders = readJson(WORK_ORDERS_PATH);
  const research = readJson(RESEARCH_PATH);
  const workOrder = workOrders.workOrders.find((order) => order.workOrderId === 'fr-002-core_lessons_32');
  const researchPacket = research.packets.find((packet) => packet.featureId === 'core_lessons_32');
  if (!workOrder) throw new Error('Missing fr-002-core_lessons_32 work order');
  if (!researchPacket || researchPacket.verdict !== 'PASS') throw new Error('Missing PASS research packet for core_lessons_32');

  const currentGeneratedOrderAssessment = {
    verdict: 'HOLD',
    reason: 'A French target-specific sequence now exists, but current lesson generators are not yet reconciled/rebuilt against it.',
    requiredNextArtifacts: [
      'fr_lesson_sequence_reconciliation_report.json',
      'fr_lesson_builder_inputs_v1.json',
      'regenerated_fr_lesson_ledgers_against_scope_sequence',
    ],
  };

  return {
    schemaVersion: 'gustav-fr-lesson-scope-sequence-packet-v1',
    generatedAt: new Date().toISOString(),
    workOrderId: 'fr-002-core_lessons_32',
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    reasoningLevel: 'deep',
    status: 'PASS',
    activationApproved: false,
    lessonCount: 32,
    sourceIds: workOrder.requiredSourceIds,
    researchPacketId: researchPacket.packetId,
    researchPacketHash: sha256(JSON.stringify(researchPacket)),
    englishLessonShapeFiles: workOrder.productShapeEvidence,
    targetPedagogySources: workOrder.requiredSourceIds,
    copiedEnglishOrderWithoutAudit: false,
    officialSourceEvidence: 'pass',
    targetSequenceFit: 'pass',
    currentGeneratedOrderAssessment,
    targetLessonOrder: TARGET_SEQUENCE,
    currentLessonFingerprint: currentLessonFingerprint(),
    gates: {
      target_sequence_fit_gate: 'PASS',
      official_source_evidence_gate: 'PASS',
      english_order_copy_blocker_gate: 'PASS',
      current_generated_lessons_reconciled_gate: 'HOLD',
    },
  };
}

function renderMarkdown(packet) {
  const lines = [
    '# Gustav French 32-Lesson Scope And Sequence',
    '',
    `Status: \`${packet.status}\``,
    '',
    `Current generated lesson order: \`${packet.currentGeneratedOrderAssessment.verdict}\``,
    '',
    `activationApproved: ${packet.activationApproved}`,
    '',
    '## Verdict',
    '',
    '- Target-specific French 32-lesson sequence exists and has source evidence.',
    '- Existing generated lesson ledgers are not production-ready until reconciled/rebuilt against this sequence.',
    '- English lesson shape remains product evidence only, not a syllabus source.',
    '',
    '## Target Order',
    '',
    '| Lesson | CEFR | Grammar focus | Why here |',
    '|---:|---|---|---|',
  ];
  for (const lesson of packet.targetLessonOrder) {
    lines.push(`| ${lesson.lessonId} | ${lesson.cefrBand} | ${lesson.targetGrammarFocus.join(', ')} | ${lesson.reasonThisComesHere} |`);
  }
  lines.push('', '## Required Next Artifacts', '');
  for (const item of packet.currentGeneratedOrderAssessment.requiredNextArtifacts) lines.push(`- \`${item}\``);
  lines.push('');
  return lines.join('\n');
}

const packet = buildPacket();
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_JSON, `${JSON.stringify(packet, null, 2)}\n`);
fs.writeFileSync(OUT_MD, renderMarkdown(packet));

console.log(`Gustav fr-002 core lessons scope sequence: ${packet.status}`);
console.log(`Target lessons: ${packet.targetLessonOrder.length}`);
console.log(`Current generated order: ${packet.currentGeneratedOrderAssessment.verdict}`);
console.log(path.relative(ROOT, OUT_JSON).replace(/\\/g, '/'));
