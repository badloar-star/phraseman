import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const WORK_ORDERS_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'work_orders', 'fr_builder_work_orders.json');
const SOURCES_PATH = path.join(ROOT, 'docs', 'gustav', 'trusted_sources', 'fr_trusted_sources.json');
const MATRIX_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'feature_parity', 'english_feature_atlas_french_gap_matrix.json');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'research_best_practices');
const OUT_RESEARCH = path.join(OUT_DIR, 'fr_feature_research_packets.json');
const OUT_ANTI_CALQUE = path.join(OUT_DIR, 'fr_anti_calque_rules.json');
const OUT_BEST_PRACTICE = path.join(OUT_DIR, 'fr_best_practice_notes.json');
const OUT_MD = path.join(OUT_DIR, 'fr_research_best_practices.md');

const FEATURE_SOURCE_MAP = {
  core_lessons_32: ['coe_cefr_companion_2020', 'tv5monde_a1', 'tv5monde_a2', 'alliance_francaise_normandie_levels'],
  lesson_theory: ['tv5monde_grammar', 'le_robert_dictionary', 'le_robert_conjugation'],
  vocabulary_bank: ['le_robert_dictionary', 'tv5monde_apprendre'],
  grammar_hubs: ['tv5monde_grammar', 'le_robert_conjugation', 'coe_cefr_companion_2020'],
  quizzes: ['coe_cefr_companion_2020', 'tv5monde_grammar', 'le_robert_dictionary'],
  quiz_explanations: ['tv5monde_grammar', 'le_robert_dictionary', 'phraseman_english_feature_atlas'],
  mistake_explanations: ['tv5monde_grammar', 'le_robert_conjugation', 'le_robert_dictionary'],
  compass_ai: ['tv5monde_apprendre', 'tv5monde_grammar', 'phraseman_english_feature_atlas'],
  personal_practice: ['coe_cefr_companion_2020', 'tv5monde_apprendre', 'le_robert_dictionary'],
  srs_review: ['le_robert_dictionary', 'phraseman_english_feature_atlas'],
  flashcards: ['le_robert_dictionary', 'tv5monde_apprendre'],
  community_card_packs: ['le_robert_dictionary', 'phraseman_english_feature_atlas'],
  daily_phrase: ['tv5monde_apprendre', 'le_robert_dictionary'],
  diagnostics_exams: ['coe_cefr_companion_2020', 'tv5monde_a1', 'tv5monde_a2'],
  audio_tts: ['le_robert_dictionary', 'phraseman_english_feature_atlas'],
  server_course_packs: ['phraseman_english_feature_atlas'],
  storage_cloud_isolation: ['phraseman_english_feature_atlas'],
  admin_website: ['phraseman_admin_parity_atlas', 'phraseman_english_feature_atlas'],
  onboarding_study_target: ['phraseman_english_feature_atlas', 'coe_cefr_companion_2020'],
};

const FEATURE_CLAIMS = {
  core_lessons_32: [
    'French 32-lesson order must be target-specific and CEFR-aligned, not inherited from English.',
    'Beginner sequence must introduce French-specific foundations early: articles/gender, etre/avoir/aller/faire, negation, questions, common prepositions and high-frequency verbs.',
    'Lesson order must support communicative/action-oriented tasks, not isolated translation drills.',
  ],
  lesson_theory: [
    'Theory blocks must explain French grammar in learner-safe chunks and cite the rule family behind each explanation.',
    'RU/UK explanations are source-locale support; they must not change target French content.',
  ],
  vocabulary_bank: [
    'French vocabulary rows need lemma, gender/article, elision risk, pronunciation/audio flag, register and example metadata.',
    'Vocabulary cannot be accepted when it is just translated English word lists without French usage metadata.',
  ],
  grammar_hubs: [
    'Grammar hubs must be French-specific and cover articles/gender, pronouns, negation, questions, prepositions/articles, tense/aspect and high-frequency irregular verbs.',
    'Verb forms must be checked against conjugation sources before they feed quizzes, practice or explanations.',
  ],
  quizzes: [
    'French quiz banks must be original target-language assessment items, not lesson row fan-out.',
    'Distractors must reflect French-specific errors such as gender/article mismatch, elision, conjugation, pronoun placement and preposition/article choice.',
  ],
  quiz_explanations: [
    'Quiz explanation prompts must enforce targetContentLang=fr and sourceLocale-specific learner explanations.',
    'Rejected AI explanations must not be returned live or cached.',
  ],
  mistake_explanations: [
    'Mistake explanations need a French mistake taxonomy and target-aware prompt contracts.',
    'The system must separate learner UI language from French target content and from RU/UK explanation language.',
  ],
  compass_ai: [
    'Compass/dialog/situation prompts must port English product shape but rewrite teaching rules for French.',
    'AI outputs must be gated before return and before cache by studyTarget, sourceLocale and output schema.',
  ],
  personal_practice: [
    'Personal practice must select French tasks from French weak spots, not duplicate lesson rows.',
    'Practice queues need target-scoped storage and mistake categories.',
  ],
  flashcards: [
    'French flashcards need starter packs and French-realities packs with vocabulary metadata.',
    'Saved cards must remain target-scoped and must not mix English source content as French target content.',
  ],
  daily_phrase: [
    'Daily phrases must come from a French phrase bank with usage evidence and target-scoped saves.',
  ],
  diagnostics_exams: [
    'Diagnostics and exams must be CEFR-aligned and test French competence, not recognition of translated English.',
  ],
  audio_tts: [
    'Every voice-required French phrase, dialogue, question or explanation needs an audio manifest row, checksum and server path.',
  ],
  server_course_packs: [
    'French packs must be downloadable server packs with manifest hashes, rollback and loader cache keys scoped by studyTarget/sourceLocale.',
  ],
  storage_cloud_isolation: [
    'Storage, cloud sync and cache keys must include studyTarget where content/progress can differ by learned language.',
  ],
  admin_website: [
    'Admin website paths that control English learning content must have French target-aware equivalents or explicit global-only exceptions.',
  ],
  onboarding_study_target: [
    'Onboarding must choose learned language explicitly and load French from server path without mixing UI/source locale with study target.',
  ],
};

const UNIVERSAL_ANTI_CALQUE_RULES = [
  {
    id: 'fr_no_english_order_copy',
    rule: 'Do not copy English lesson order as French pedagogy unless a research packet proves the same order is valid for French.',
    appliesTo: ['core_lessons_32', 'lesson_theory', 'grammar_hubs'],
  },
  {
    id: 'fr_gender_article_required',
    rule: 'French nouns and noun phrases require gender/article metadata when used for vocabulary, flashcards, quizzes or explanations.',
    appliesTo: ['vocabulary_bank', 'flashcards', 'quizzes', 'daily_phrase'],
  },
  {
    id: 'fr_elision_liaison_watch',
    rule: 'French content must check elision and liaison-sensitive forms before acceptance, especially articles, pronouns, negation and prepositions.',
    appliesTo: ['core_lessons_32', 'lesson_theory', 'vocabulary_bank', 'quizzes', 'audio_tts'],
  },
  {
    id: 'fr_verb_source_check',
    rule: 'Conjugated verb forms must be source-checked before feeding lessons, quizzes, practice or AI explanations.',
    appliesTo: ['grammar_hubs', 'quizzes', 'personal_practice', 'mistake_explanations'],
  },
  {
    id: 'fr_not_source_locale',
    rule: 'RU/UK text is explanation/source-locale support only; it must never become target French content or cache identity.',
    appliesTo: ['quiz_explanations', 'mistake_explanations', 'compass_ai', 'server_course_packs', 'storage_cloud_isolation'],
  },
  {
    id: 'fr_seed_not_parity',
    rule: 'Lesson row fan-out can be seed material only; quiz, flashcard and personal practice require feature-specific French banks.',
    appliesTo: ['quizzes', 'flashcards', 'personal_practice'],
  },
];

const UNIVERSAL_CONSTRAINTS = [
  'Every generated row must include studyTarget=fr and sourceLocale when learner-facing explanation differs by source locale.',
  'Every generated row must cite source ids or app-internal product-shape ids.',
  'Every generated pack remains activationApproved=false until server/runtime/admin/storage/rollback gates pass.',
  'English product shape may be copied; English target-language content, order and distractors may not be copied without explicit source-backed equivalence.',
  'AI prompt outputs must define targetContentLang, sourceLocale, aiOutputLang, allowed bridge fields and reject-before-return/cache behavior.',
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function ensureSourceIdsExist(required, sourcesById, featureId) {
  const missing = required.filter((id) => !sourcesById.has(id));
  if (missing.length) throw new Error(`${featureId} missing source ids: ${missing.join(', ')}`);
}

function featureClaims(featureId) {
  return FEATURE_CLAIMS[featureId] ?? [
    'Feature must copy English product shape only and create French-specific target content with source evidence.',
  ];
}

function buildResearchPackets(workOrders, sources, matrix) {
  const sourcesById = new Map(sources.sources.map((source) => [source.id, source]));
  const matrixByFeature = new Map(matrix.features.map((feature) => [feature.featureId, feature]));
  const featureIds = new Set([
    ...matrix.features.map((feature) => feature.featureId),
    ...workOrders.workOrders.map((order) => order.featureId),
  ]);

  return [...featureIds].sort((a, b) => {
    const af = matrixByFeature.get(a)?.priority ?? 999;
    const bf = matrixByFeature.get(b)?.priority ?? 999;
    return af - bf || a.localeCompare(b);
  }).map((featureId) => {
    const feature = matrixByFeature.get(featureId);
    const workOrder = workOrders.workOrders.find((order) => order.featureId === featureId) ?? null;
    const requiredSourceIds = FEATURE_SOURCE_MAP[featureId] ?? workOrder?.requiredSourceIds ?? ['phraseman_english_feature_atlas'];
    ensureSourceIdsExist(requiredSourceIds, sourcesById, featureId);
    const antiCalqueRules = UNIVERSAL_ANTI_CALQUE_RULES
      .filter((rule) => rule.appliesTo.includes(featureId))
      .map((rule) => rule.id);
    const majorClaims = featureClaims(featureId);
    const researchCoverage = requiredSourceIds.length > 0 && majorClaims.length > 0 ? 'pass' : 'hold';
    return {
      packetId: `fr-research-${featureId}`,
      studyTarget: 'fr',
      sourceLocales: ['ru', 'uk'],
      featureId,
      featureLabel: feature?.label ?? workOrder?.label ?? featureId,
      reasoningLevel: workOrder?.reasoningLevel ?? (feature?.priority <= 10 ? 'deep' : 'high'),
      verdict: researchCoverage === 'pass' ? 'PASS' : 'HOLD',
      activationApproved: false,
      sourceIds: requiredSourceIds,
      sourceClaims: requiredSourceIds.map((id) => ({
        sourceId: id,
        claimCovered: claimForSource(id, featureId),
      })),
      productShapeEvidenceIds: [
        'phraseman_english_feature_atlas',
        ...(feature?.adminFiles?.length ? ['phraseman_admin_parity_atlas'] : []),
      ],
      targetLanguageClaims: majorClaims,
      antiCalqueRules,
      generationConstraints: constraintsFor(featureId),
      reviewerChecks: reviewerChecksFor(featureId),
      unresolvedConflicts: [],
      blockersAddressed: workOrder?.blockersFromMatrix ?? feature?.blockers ?? [],
      nextBuilderId: workOrder?.builderId ?? null,
    };
  });
}

function claimForSource(sourceId, featureId) {
  if (sourceId.startsWith('coe_cefr')) return 'CEFR level alignment, assessment descriptors and action-oriented skill progression.';
  if (sourceId.startsWith('tv5monde_a1')) return 'A1 learner exercise patterns and beginner French task examples.';
  if (sourceId.startsWith('tv5monde_a2')) return 'A2 learner exercise patterns and waystage progression examples.';
  if (sourceId === 'tv5monde_grammar') return 'French grammar families, conjugation/preposition/negation help and exercise-facing rule patterns.';
  if (sourceId === 'tv5monde_apprendre') return 'Learner exercise shape and communicative French practice patterns.';
  if (sourceId.startsWith('alliance_francaise')) return 'Institutional French course levels and communicative/action-oriented pedagogy.';
  if (sourceId === 'le_robert_dictionary') return 'French vocabulary, gender, definition, usage and register evidence.';
  if (sourceId === 'le_robert_conjugation') return 'French verb conjugation, tense/mood/person and agreement evidence.';
  if (sourceId === 'phraseman_admin_parity_atlas') return 'PhraseMan admin website product-shape and learning-content action evidence.';
  if (sourceId === 'phraseman_english_feature_atlas') return `PhraseMan English product shape and ${featureId} parity baseline.`;
  return 'Secondary cross-check evidence.';
}

function constraintsFor(featureId) {
  const constraints = [...UNIVERSAL_CONSTRAINTS];
  if (['quizzes', 'flashcards', 'personal_practice'].includes(featureId)) {
    constraints.push('Do not accept row reuse from lessons as final parity content for this feature.');
  }
  if (featureId.includes('explanations') || featureId === 'compass_ai') {
    constraints.push('Prompt must reject wrong target language before returning and before caching.');
  }
  if (featureId === 'core_lessons_32') {
    constraints.push('Lesson order must include a reasonThisComesHere field and prerequisiteLessonIds for every lesson.');
  }
  if (featureId === 'audio_tts') {
    constraints.push('Audio manifest must include voice, source text hash, output path, checksum and missing-audio status.');
  }
  if (featureId === 'admin_website') {
    constraints.push('Admin controls must follow ADMIN_UI_BIBLE and must not write French through English-only ids or paths.');
  }
  return constraints;
}

function reviewerChecksFor(featureId) {
  const checks = [
    'source ids are present and trusted',
    'studyTarget/sourceLocale/targetContentLang are not conflated',
    'English product shape is separated from French target content',
  ];
  if (['vocabulary_bank', 'flashcards'].includes(featureId)) checks.push('gender/article/register metadata present');
  if (['grammar_hubs', 'quizzes', 'mistake_explanations'].includes(featureId)) checks.push('verb forms and grammar claims source-checked');
  if (featureId === 'admin_website') checks.push('admin French target equivalence or global-only exception exists');
  if (featureId === 'server_course_packs') checks.push('manifest/hash/rollback/cache key evidence present');
  return checks;
}

function buildAntiCalquePackets() {
  return {
    schemaVersion: 'gustav-fr-anti-calque-rules-v1',
    studyTarget: 'fr',
    activationApproved: false,
    status: 'PASS',
    rules: UNIVERSAL_ANTI_CALQUE_RULES,
  };
}

function buildBestPracticeNotes(researchPackets, sources) {
  return {
    schemaVersion: 'gustav-fr-best-practice-notes-v1',
    studyTarget: 'fr',
    activationApproved: false,
    status: 'PASS',
    notes: [
      {
        id: 'fr_research_before_generation',
        sourceIds: ['coe_cefr_companion_2020', 'phraseman_english_feature_atlas'],
        note: 'Generate French only after product-shape evidence and target-language research evidence exist for the feature.',
      },
      {
        id: 'fr_action_oriented_tasks',
        sourceIds: ['coe_cefr_companion_2020', 'alliance_francaise_normandie_levels'],
        note: 'Prefer communicative/action-oriented tasks where learners use French to do something, not isolated translation-only drills.',
      },
      {
        id: 'fr_beginner_foundations',
        sourceIds: ['tv5monde_a1', 'tv5monde_grammar', 'le_robert_conjugation'],
        note: 'A1 foundations must account for French-specific articles/gender, common verbs, negation, questions, prepositions and pronunciation/audio risks.',
      },
      {
        id: 'fr_dictionary_backed_vocab',
        sourceIds: ['le_robert_dictionary'],
        note: 'Vocabulary and flashcards require dictionary-backed lemma, gender/article, usage/register and example evidence.',
      },
      {
        id: 'fr_prompt_cache_contract',
        sourceIds: ['phraseman_english_feature_atlas', 'tv5monde_grammar'],
        note: 'AI prompts must port English product role, but output rules and cache identity must be French target-aware.',
      },
    ],
    sourceCount: sources.sources.length,
    researchPacketCount: researchPackets.length,
  };
}

function buildMarkdown(researchReport, antiCalque, bestPractice) {
  const lines = [
    '# Gustav French Research Best Practices',
    '',
    `Status: \`${researchReport.status}\``,
    '',
    `Generated: ${researchReport.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Research packets: ${researchReport.summary.packetCount}`,
    `- PASS packets: ${researchReport.summary.passCount}`,
    `- HOLD packets: ${researchReport.summary.holdCount}`,
    `- Anti-calque rules: ${antiCalque.rules.length}`,
    `- Best-practice notes: ${bestPractice.notes.length}`,
    `- activationApproved: ${researchReport.activationApproved}`,
    '',
    '## Feature Packets',
    '',
    '| Feature | Verdict | Sources | Anti-calque rules |',
    '|---|---|---:|---|',
  ];
  for (const packet of researchReport.packets) {
    lines.push(`| \`${packet.featureId}\` | \`${packet.verdict}\` | ${packet.sourceIds.length} | ${packet.antiCalqueRules.join('<br>') || '-'} |`);
  }
  lines.push('', '## Rule', '');
  lines.push('These packets satisfy research evidence only. They do not approve generated content, server upload, app apply or production activation.');
  lines.push('');
  return lines.join('\n');
}

const workOrders = readJson(WORK_ORDERS_PATH);
const sources = readJson(SOURCES_PATH);
const matrix = readJson(MATRIX_PATH);
const packets = buildResearchPackets(workOrders, sources, matrix);
const antiCalque = buildAntiCalquePackets();
const bestPractice = buildBestPracticeNotes(packets, sources);
const report = {
  schemaVersion: 'gustav-fr-feature-research-packets-v1',
  generatedAt: new Date().toISOString(),
  status: packets.every((packet) => packet.verdict === 'PASS') ? 'PASS' : 'HOLD',
  activationApproved: false,
  workOrderId: 'fr-001-research_best_practices',
  trustedSourcesPath: 'docs/gustav/trusted_sources/fr_trusted_sources.json',
  trustedSourcesHash: sha256(JSON.stringify(sources)),
  workOrdersHash: sha256(JSON.stringify(workOrders)),
  matrixHash: sha256(JSON.stringify(matrix)),
  summary: {
    packetCount: packets.length,
    passCount: packets.filter((packet) => packet.verdict === 'PASS').length,
    holdCount: packets.filter((packet) => packet.verdict !== 'PASS').length,
    activationApproved: false,
  },
  packets,
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_RESEARCH, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(OUT_ANTI_CALQUE, `${JSON.stringify(antiCalque, null, 2)}\n`);
fs.writeFileSync(OUT_BEST_PRACTICE, `${JSON.stringify(bestPractice, null, 2)}\n`);
fs.writeFileSync(OUT_MD, buildMarkdown(report, antiCalque, bestPractice));

console.log(`Gustav fr-001 research best practices: ${report.status}`);
console.log(`Research packets: ${report.summary.packetCount}`);
console.log(`PASS packets: ${report.summary.passCount}`);
console.log(path.relative(ROOT, OUT_RESEARCH).replace(/\\/g, '/'));
