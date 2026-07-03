import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const SCOPE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'core_lessons_32', 'fr_lesson_scope_sequence_packet.json');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'core_lessons_32');
const OUT_REPORT = path.join(OUT_DIR, 'fr_lesson_sequence_reconciliation_report.json');
const OUT_INPUTS = path.join(OUT_DIR, 'fr_lesson_builder_inputs_v1.json');
const OUT_MD = path.join(OUT_DIR, 'fr_lesson_sequence_reconciliation_report.md');

const CONCEPT_PATTERNS = [
  ['greetings', /greeting|salutation|classroom|tu_vous|pronoun_subject|je_tu/i],
  ['etre', /etre|c_est|il_est/i],
  ['avoir', /avoir|idiom_avoir|possession/i],
  ['articles_gender', /article|definite|indefinite|partitive|gender|noun|plural_article|definite_plural/i],
  ['regular_present', /present_regular|present_irregular|present_stem|present_idiom/i],
  ['negation', /negation|negative|ne_pas/i],
  ['questions', /question|est_ce|question_word|wh_question/i],
  ['aller_future_proche', /future_proche|near_future/i],
  ['faire', /faire|weather/i],
  ['modals_infinitive', /modal|pouvoir|vouloir|devoir|savoir|verb_plus_infinitive|infinitive/i],
  ['prepositions_place', /preposition|location|near|sur|sous|dans|chez|du|de_la|au|aux/i],
  ['partitives_food', /partitive|food|coffee|water|negative_partitive/i],
  ['adjectives', /adjective|comparative_adjective|agreement|meilleur/i],
  ['possessives_demonstratives', /possessive|demonstrative/i],
  ['reflexive', /reflexive|se_/i],
  ['imperative', /imperative/i],
  ['object_pronouns', /object_pronoun|direct_object|indirect_object|le_la_les|me_te/i],
  ['passe_compose_avoir', /passe_compose_avoir|past_state_imparfait/i],
  ['passe_compose_etre_reflexive', /passe_compose_etre|reflexive_passe/i],
  ['irregular_participles', /irregular_participle|passe_compose_irregular|past_participle/i],
  ['imparfait', /imparfait|past_state/i],
  ['future_simple_si', /future_si|simple_future|future_question/i],
  ['comparatives', /comparative|superlative|meilleur|mieux|pire/i],
  ['y_en_pronouns', /y_|en_|pronoun_y|pronoun_en/i],
  ['double_pronouns', /double_pronoun|direct_indirect|pronoun_order/i],
  ['relative_basic', /relative_qui|relative_que|relative_ou/i],
  ['relative_dont', /relative_dont|dont_/i],
  ['conditionnel', /conditionnel|conditional/i],
  ['subjunctive_awareness', /subjunctive|il_faut_que/i],
  ['faire_causative', /faire_causative|causative/i],
  ['mixed_review', /mixed_review|exam_readiness|continuing_action/i],
];

const TARGET_CONCEPT_HINTS = {
  greetings: ['greetings', 'classroom survival', 'tu/vous', 'je/tu/il/elle'],
  etre: ['etre present', 'c est / il est contrast'],
  articles_gender: ['gender', 'definite articles', 'indefinite articles', 'plural basics'],
  avoir: ['avoir present', 'age with avoir', 'possession', 'common avoir expressions'],
  regular_present: ['regular -er present', 'subject pronouns', 'basic sentence order'],
  negation: ['negation ne...pas', 'article changes after negation', 'basic adverbs'],
  questions: ['yes/no questions', 'est-ce que', 'question words', 'qui/quoi/ou/quand/comment/pourquoi'],
  aller_future_proche: ['aller present', 'near future aller + infinitive'],
  faire: ['faire present', 'weather with faire'],
  modals_infinitive: ['modal pouvoir', 'modal vouloir', 'modal devoir', 'verb + infinitive'],
  prepositions_place: ['prepositions of place', 'de / du / de la / des', 'chez', 'dans/sur/a'],
  partitives_food: ['partitive articles', 'food quantities', 'negative de'],
  adjectives: ['adjective position', 'agreement', 'common irregular adjectives', 'comparatives', 'superlatives'],
  possessives_demonstratives: ['possessive adjectives', 'demonstrative adjectives'],
  reflexive: ['reflexive verbs present', 'daily routine', 'reflexive past'],
  imperative: ['imperative', 'polite commands', 'negative imperative'],
  object_pronouns: ['object pronouns le/la/les', 'me/te/nous/vous'],
  passe_compose_avoir: ['passe compose with avoir', 'regular participles'],
  passe_compose_etre_reflexive: ['passe compose with etre', 'movement verbs', 'reflexive past'],
  irregular_participles: ['irregular past participles', 'avoir/etre review'],
  imparfait: ['imparfait introduction', 'passe compose vs imparfait contrast'],
  future_simple_si: ['simple future introduction', 'si + present/future'],
  y_en_pronouns: ['pronouns y and en', 'de/a complements'],
  double_pronouns: ['double pronoun awareness', 'direct/indirect object contrast'],
  relative_basic: ['relative pronouns qui/que/ou'],
  relative_dont: ['relative dont', 'de-linked relatives'],
  conditionnel: ['conditionnel present', 'polite requests', 'advice'],
  subjunctive_awareness: ['subjunctive awareness', 'il faut que'],
  faire_causative: ['faire causative', 'laisser + infinitive'],
  mixed_review: ['mixed review', 'dialogue integration', 'exam readiness'],
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function extractCurrentLessons() {
  const lessons = [];
  for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
    const file = path.join(ROOT, 'scripts', `gustav_generate_french_lesson${lessonId}_ledger.ts`);
    const source = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    const categories = [...new Set([...source.matchAll(/'([^']+)'/g)].map((match) => match[1]))]
      .filter((value) => /^(etre|avoir|aller|faire|modal|present|passe|future|near|neg|question|pronoun|preposition|location|article|adjective|adverb|imperative|comparative|condition|verb|c_est|idiom|noun|gender|possessive|demonstrative|partitive|reflexive|relative|object|y_|en_|imparfait|subjunctive)/i.test(value));
    const joined = categories.join(' ');
    const concepts = [...new Set(CONCEPT_PATTERNS.filter(([, re]) => re.test(joined)).map(([concept]) => concept))];
    lessons.push({
      currentLessonId: lessonId,
      sourceFile: path.relative(ROOT, file).replace(/\\/g, '/'),
      itemCallCount: (source.match(/item\(/g) || []).length,
      concepts,
      grammarCategorySample: categories.slice(0, 24),
      sourceHash: sha256(source),
    });
  }
  return lessons;
}

function targetConcepts(targetLesson) {
  const text = [...targetLesson.targetGrammarFocus, ...targetLesson.targetVocabularyFocus].join(' ').toLowerCase();
  const concepts = [];
  for (const [concept, hints] of Object.entries(TARGET_CONCEPT_HINTS)) {
    if (hints.some((hint) => text.includes(hint.toLowerCase()))) concepts.push(concept);
  }
  return [...new Set(concepts)];
}

function scoreCandidate(targetConceptsList, current) {
  const overlap = targetConceptsList.filter((concept) => current.concepts.includes(concept));
  return {
    currentLessonId: current.currentLessonId,
    sourceFile: current.sourceFile,
    overlap,
    score: overlap.length,
    itemCallCount: current.itemCallCount,
  };
}

function actionFor(targetLesson, candidates) {
  const best = candidates[0];
  if (!best || best.score === 0) return 'BUILD_NEW';
  if (best.currentLessonId === targetLesson.lessonId && best.score >= 1) return 'KEEP_WITH_REVIEW';
  if (best.score >= 2) return 'MOVE_AND_REBUILD';
  return 'MERGE_AND_REBUILD';
}

function buildReport() {
  const scope = readJson(SCOPE_PATH);
  const currentLessons = extractCurrentLessons();
  const targetRows = scope.targetLessonOrder.map((targetLesson) => {
    const concepts = targetConcepts(targetLesson);
    const candidates = currentLessons
      .map((current) => scoreCandidate(concepts, current))
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score || a.currentLessonId - b.currentLessonId)
      .slice(0, 5);
    const action = actionFor(targetLesson, candidates);
    const best = candidates[0] ?? null;
    return {
      targetLessonId: targetLesson.lessonId,
      cefrBand: targetLesson.cefrBand,
      targetConcepts: concepts,
      targetGrammarFocus: targetLesson.targetGrammarFocus,
      targetVocabularyFocus: targetLesson.targetVocabularyFocus,
      bestCurrentCandidate: best,
      candidateCurrentLessons: candidates,
      action,
      status: action === 'KEEP_WITH_REVIEW' ? 'NEEDS_REVIEW' : 'REBUILD_REQUIRED',
      reason: reasonFor(action, targetLesson, best),
    };
  });

  const currentUsage = new Map();
  for (const row of targetRows) {
    for (const candidate of row.candidateCurrentLessons) {
      currentUsage.set(candidate.currentLessonId, (currentUsage.get(candidate.currentLessonId) ?? 0) + 1);
    }
  }
  const orphanCurrentLessons = currentLessons
    .filter((lesson) => !targetRows.some((row) => row.bestCurrentCandidate?.currentLessonId === lesson.currentLessonId))
    .map((lesson) => ({
      currentLessonId: lesson.currentLessonId,
      sourceFile: lesson.sourceFile,
      concepts: lesson.concepts,
      itemCallCount: lesson.itemCallCount,
      usageCountAsCandidate: currentUsage.get(lesson.currentLessonId) ?? 0,
    }));

  const rebuildRequired = targetRows.filter((row) => row.status === 'REBUILD_REQUIRED').length;
  return {
    schemaVersion: 'gustav-fr-lesson-sequence-reconciliation-v1',
    generatedAt: new Date().toISOString(),
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    status: rebuildRequired > 0 ? 'HOLD' : 'PASS',
    activationApproved: false,
    scopeSequencePath: 'docs/gustav/generated/fr/core_lessons_32/fr_lesson_scope_sequence_packet.json',
    scopeSequenceHash: sha256(JSON.stringify(scope)),
    summary: {
      targetLessons: targetRows.length,
      currentLessons: currentLessons.length,
      rebuildRequired,
      needsReview: targetRows.filter((row) => row.status === 'NEEDS_REVIEW').length,
      orphanCurrentLessons: orphanCurrentLessons.length,
      activationApproved: false,
    },
    gates: {
      target_sequence_exists: scope.status === 'PASS' ? 'PASS' : 'BLOCK',
      current_generators_reconciled: rebuildRequired === 0 ? 'PASS' : 'HOLD',
      builder_inputs_created: 'PASS',
      activationApproved: false,
    },
    targetRows,
    currentLessonFingerprints: currentLessons,
    orphanCurrentLessons,
    nextRequiredArtifacts: [
      'regenerated_fr_lesson_ledgers_against_scope_sequence',
      'fr_lesson_theory_pack.json',
      'fr_vocabulary_bank.json',
      'fr_grammar_hubs.json',
    ],
  };
}

function reasonFor(action, targetLesson, best) {
  if (action === 'BUILD_NEW') return 'No current generated lesson has clear concept overlap with this target French lesson.';
  if (action === 'KEEP_WITH_REVIEW') return 'Current lesson id overlaps the target concept but still requires source/judge review before activation.';
  if (action === 'MOVE_AND_REBUILD') return `Best current content appears in lesson ${best.currentLessonId}, so target lesson ${targetLesson.lessonId} needs move/rebuild against the French sequence.`;
  return `Only partial current overlap found${best ? ` in lesson ${best.currentLessonId}` : ''}; rebuild target lesson from scope sequence and research packet.`;
}

function buildInputs(report) {
  return {
    schemaVersion: 'gustav-fr-lesson-builder-inputs-v1',
    generatedAt: report.generatedAt,
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    status: 'READY',
    activationApproved: false,
    reconciliationReport: 'docs/gustav/generated/fr/core_lessons_32/fr_lesson_sequence_reconciliation_report.json',
    lessons: report.targetRows.map((row) => ({
      lessonId: row.targetLessonId,
      cefrBand: row.cefrBand,
      action: row.action,
      targetConcepts: row.targetConcepts,
      targetGrammarFocus: row.targetGrammarFocus,
      targetVocabularyFocus: row.targetVocabularyFocus,
      sourceCandidateLessons: row.candidateCurrentLessons.map((candidate) => candidate.currentLessonId),
      requiredResearchPacket: 'fr-research-core_lessons_32',
      requiredGates: [
        'official_source_evidence_gate',
        'target_sequence_fit_gate',
        'no_english_order_copy_gate',
        'has_broken_elision_gate',
        'source_locale_isolation_gate',
      ],
      outputLedgerPath: `docs/gustav/generated/fr/lessons/lesson${row.targetLessonId}_row_ledger.json`,
    })),
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Gustav French Lesson Sequence Reconciliation',
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Target lessons: ${report.summary.targetLessons}`,
    `- Current lessons: ${report.summary.currentLessons}`,
    `- Rebuild required: ${report.summary.rebuildRequired}`,
    `- Needs review: ${report.summary.needsReview}`,
    `- Orphan current lessons: ${report.summary.orphanCurrentLessons}`,
    `- activationApproved: ${report.activationApproved}`,
    '',
    '## Reconciliation Rows',
    '',
    '| Target | Status | Action | Best current candidate | Concepts |',
    '|---:|---|---|---|---|',
  ];
  for (const row of report.targetRows) {
    const best = row.bestCurrentCandidate ? `lesson ${row.bestCurrentCandidate.currentLessonId} (${row.bestCurrentCandidate.overlap.join(', ')})` : '-';
    lines.push(`| ${row.targetLessonId} | \`${row.status}\` | \`${row.action}\` | ${best} | ${row.targetConcepts.join(', ')} |`);
  }
  lines.push('', '## Rule', '');
  lines.push('This report does not regenerate content. It converts the approved French scope sequence into builder inputs and keeps current generated ledgers on HOLD until rebuilt/reviewed.');
  lines.push('');
  return lines.join('\n');
}

const report = buildReport();
const inputs = buildInputs(report);
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_REPORT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(OUT_INPUTS, `${JSON.stringify(inputs, null, 2)}\n`);
fs.writeFileSync(OUT_MD, renderMarkdown(report));

console.log(`Gustav French lesson sequence reconciliation: ${report.status}`);
console.log(`Rebuild required: ${report.summary.rebuildRequired}`);
console.log(`Builder inputs: ${inputs.lessons.length}`);
console.log(path.relative(ROOT, OUT_REPORT).replace(/\\/g, '/'));
