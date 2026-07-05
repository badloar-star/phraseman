import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const RUN_ID = '2026-07-04_flashcard_pack_generator_v1';
const RUN_DIR = path.join(ROOT, 'docs', 'gustav', 'runs', RUN_ID);
const BUILD_DIR = path.join(RUN_DIR, 'build');
const REVIEW_DIR = path.join(RUN_DIR, 'review');
const GENERATED_AT = new Date().toISOString();

const REPRESENTATIVE_CARD_FILES = [
  'app/flashcards/bundles/official_peaky_blinders_en.json',
  'app/flashcards/bundles/royal_tea/royal_tea_part1.ts',
  'app/flashcards/bundles/negotiator/negotiator_part1.ts',
  'app/flashcards/bundles/phrasal_verbs/phrasal_verbs_cards.ts',
  'app/flashcards/bundles/movie_series/movie_series_cards.ts',
  'app/flashcards/bundles/prep_in/prep_in_cards.ts',
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
}

function readText(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function textStats(values) {
  const lengths = values.map((value) => String(value || '').length);
  return {
    min: Math.min(...lengths),
    max: Math.max(...lengths),
    avg: Math.round(lengths.reduce((sum, value) => sum + value, 0) / Math.max(1, lengths.length)),
  };
}

function classifyPack(pack) {
  if (pack.id.includes('prep_') || pack.id.includes('phrasal_verbs')) return 'grammar_utility';
  if (pack.id.includes('movie_series')) return 'everyday_functional';
  if (['official_negotiator_en'].includes(pack.id)) return 'everyday_functional';
  return 'culture_native';
}

function extractRepresentativeSignals(file) {
  const text = readText(file);
  return {
    file,
    bytes: Buffer.byteLength(text, 'utf8'),
    hasExplanationRu: /explanationRu/.test(text),
    hasExplanationUk: /explanationUk/.test(text),
    hasLiteralRu: /literalRu/.test(text),
    hasExampleEn: /exampleEn/.test(text),
    hasRegister: /register/.test(text),
    sampleNeedles: [
      /contextRu/.test(text) ? 'contextRu' : null,
      /usageNoteRu/.test(text) ? 'usageNoteRu' : null,
      /level/.test(text) ? 'level' : null,
      /sourceLocales/.test(text) ? 'sourceLocales' : null,
    ].filter(Boolean),
  };
}

function buildEnglishBlueprint() {
  const manifest = readJson('app/flashcards/bundles/bundled_marketplace_manifest.json');
  const packs = manifest.packs || [];
  const categories = [...new Set(packs.map((pack) => pack.category))].sort();
  const packMetadataFields = [...new Set(packs.flatMap((pack) => Object.keys(pack)))].sort();
  const styleFamilies = packs.reduce((acc, pack) => {
    const family = classifyPack(pack);
    acc[family] ||= [];
    acc[family].push(pack.id);
    return acc;
  }, {});
  return {
    schemaVersion: 'gustav-english-flashcard-pack-blueprint-inventory-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    sourceFiles: [
      'app/flashcards/bundles/bundled_marketplace_manifest.json',
      'app/flashcards/bundles/victoriaBundleShared.ts',
      'app/flashcards/types.ts',
      'app/flashcards/marketplace.ts',
      'app/flashcards/bundles/packIds.ts',
      ...REPRESENTATIVE_CARD_FILES,
    ],
    packCount: packs.length,
    totalCards: packs.reduce((sum, pack) => sum + Number(pack.cardCount || 0), 0),
    categories,
    priceShards: [...new Set(packs.map((pack) => pack.priceShards))].sort((a, b) => a - b),
    packMetadataFields,
    requiredCardFields: [
      'id',
      'en',
      'ru',
      'uk',
      'literalRu',
      'literalUk',
      'explanationRu',
      'explanationUk',
      'transcription',
    ],
    optionalCardFields: [
      'es',
      'sourceLocales',
      'literalEs',
      'explanationEs',
      'exampleEn',
      'exampleRu',
      'exampleUk',
      'usageNoteRu',
      'usageNoteUk',
      'register',
      'level',
      'abbrev',
      'expansionEn',
    ],
    titleRuStats: textStats(packs.map((pack) => pack.titleRu)),
    descriptionRuStats: textStats(packs.map((pack) => pack.descriptionRu)),
    styleFamilies,
    packs: packs.map((pack) => ({
      id: pack.id,
      codeName: pack.codeName,
      category: pack.category,
      styleFamily: classifyPack(pack),
      cardCount: pack.cardCount,
      priceShards: pack.priceShards,
      titleRu: pack.titleRu,
      descriptionRu: pack.descriptionRu,
      titleUk: pack.titleUk,
      descriptionUk: pack.descriptionUk,
      localeFields: Object.keys(pack).filter((key) => /^title|^description/.test(key)).sort(),
    })),
    representativeCardSignals: REPRESENTATIVE_CARD_FILES.map(extractRepresentativeSignals),
  };
}

function buildGeneratorContract(blueprint) {
  return {
    schemaVersion: 'gustav-flashcard-pack-generator-contract-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    generatorId: 'gustav_flashcard_pack_generator',
    reusableAcrossTargets: true,
    firstTarget: 'fr',
    activationApproved: false,
    requiredInputs: [
      'targetLanguage',
      'studyTarget',
      'sourceLocales',
      'packPlan',
      'trustedSourcePolicy',
      'englishBlueprintInventory',
      'outputRunId',
    ],
    packTaxonomy: [
      'grammar_utility',
      'everyday_functional',
      'culture_native',
      'media_register',
      'exam_or_school',
      'travel_or_city',
    ],
    sourcePolicy: {
      requiredPerAcceptedRow: true,
      acceptedFamilies: [
        'le_robert_dictionary',
        'larousse_dictionary',
        'cnrtl',
        'tv5monde_apprendre',
        'france_education_international',
        'alliance_francaise',
        'official_public_service_or_transport_site',
        'cefr_for_level_framing_only',
      ],
      rowEvidenceMustVerify: ['expression_or_phrase', 'meaning', 'register_or_context', 'grammar_or_culture_when_relevant'],
    },
    descriptionStylePolicy: {
      required: true,
      sourceBlueprint: 'english_marketplace_product_copy',
      requiredSignals: [
        'scene_first',
        'conflict_or_tension',
        'concrete_social_fantasy',
        'useful_learning_promise',
        'compact_voice_with_bite',
      ],
      blockedSignals: [
        'contains_phrases_about',
        'this_pack_teaches',
        'topic_summary_only',
        'набор_для',
        'набір_для',
      ],
      driftVerdict: 'BLOCK_PRODUCT_COPY_DRIFT',
    },
    hardRules: [
      'Do not translate English marketplace packs as target-language source of truth.',
      'Use English packs only as product-shape and style blueprint.',
      'Marketplace pack descriptions must keep English product-copy voice: scene, tension, social fantasy, useful promise.',
      'Reject bland topic descriptions such as "набор для..." or "contains phrases about...".',
      'Reject lesson-row fanout as official marketplace pack parity.',
      'Reject generic phrasebook padding.',
      'Keep server paths target/source-locale scoped.',
      'Keep activationApproved=false until explicit activation approval.',
    ],
    outputArtifacts: [
      'english_flashcard_pack_blueprint_inventory.json',
      'flashcard_pack_generator_contract.json',
      'target_flashcard_pack_plan.json',
      'target_flashcard_pack_candidates.json',
      'target_flashcard_source_evidence.json',
      'target_flashcard_duplicate_audit.json',
      'target_flashcard_server_pack_manifest.json',
      'target_flashcard_admin_workflow_manifest.json',
      'target_flashcard_final_gate.json',
      'target_flashcard_review.json',
      'target_flashcard_review.md',
    ],
    gates: [
      'english_blueprint_inventory_gate',
      'generator_contract_gate',
      'pack_taxonomy_gate',
      'source_evidence_gate',
      'duplicate_near_duplicate_gate',
      'ru_uk_copy_integrity_gate',
      'target_language_leakage_gate',
      'lesson_row_fanout_rejection_gate',
      'runtime_storage_isolation_gate',
      'server_pack_dry_run_gate',
      'admin_workflow_surface_gate',
      'rollback_gate',
      'final_production_readiness_gate',
    ],
    englishBlueprintSummary: {
      packCount: blueprint.packCount,
      totalCards: blueprint.totalCards,
      categories: blueprint.categories,
      styleFamilies: Object.keys(blueprint.styleFamilies).sort(),
    },
  };
}

function buildFrenchPackPlan() {
  const commonPacks = [
    ['fr_core_verbs_foundation', 'grammar_utility', 'Core French verbs', 40],
    ['fr_pronouns_and_politeness', 'grammar_utility', 'Pronouns, tu/vous and politeness', 35],
    ['fr_articles_prepositions_city', 'grammar_utility', 'Articles and prepositions in real places', 40],
    ['fr_connectors_everyday_speech', 'everyday_functional', 'Connectors for everyday French', 40],
    ['fr_texting_and_reactions', 'media_register', 'Texting, reactions and softeners', 40],
  ];
  const culturePacks = [
    ['fr_cafe_terrace_life', 'culture_native', 'Cafe, terrace and ordering culture', 40],
    ['fr_boulangerie_market', 'culture_native', 'Boulangerie, market and food counters', 40],
    ['fr_metro_train_city', 'travel_or_city', 'Metro, train and city movement', 40],
    ['fr_bureaucracy_paperwork', 'culture_native', 'Appointments, forms and bureaucracy', 40],
    ['fr_apero_social_life', 'culture_native', 'Apero, invitations and social rituals', 40],
    ['fr_renting_housing', 'everyday_functional', 'Renting, housing and neighbors', 40],
    ['fr_pharmacy_healthcare', 'everyday_functional', 'Pharmacy, symptoms and appointments', 40],
  ];
  const toPack = ([id, taxonomy, title, targetCardCount], index) => ({
    id,
    order: index + 1,
    studyTarget: 'fr',
    targetLanguage: 'fr',
    taxonomy,
    targetCardCount,
    titleWorking: title,
    sourceLocales: ['ru', 'uk'],
    status: 'PLANNED_SOURCE_RESEARCH_REQUIRED',
    generationMode: taxonomy === 'culture_native' || taxonomy === 'travel_or_city'
      ? 'french_culture_native'
      : 'french_learner_utility',
    requiredEvidence: ['trusted_source_per_row', 'ru_uk_copy_review', 'no_english_translation_source'],
  });
  return {
    schemaVersion: 'gustav-target-flashcard-pack-plan-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    targetLanguage: 'fr',
    studyTarget: 'fr',
    activationApproved: false,
    commonPacks: commonPacks.map(toPack),
    cultureNativePacks: culturePacks.map((row, index) => toPack(row, commonPacks.length + index)),
    status: 'PLAN_READY_CONTENT_GENERATION_HOLD',
  };
}

function buildHoldArtifact(schemaVersion, extra = {}) {
  return {
    schemaVersion,
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    activationApproved: false,
    status: 'HOLD_NOT_GENERATED_FROM_SOURCES_YET',
    ...extra,
  };
}

function main() {
  ensureDir(BUILD_DIR);
  ensureDir(REVIEW_DIR);

  const blueprint = buildEnglishBlueprint();
  const contract = buildGeneratorContract(blueprint);
  const plan = buildFrenchPackPlan();
  const candidates = buildHoldArtifact('gustav-target-flashcard-pack-candidates-v1', {
    targetLanguage: 'fr',
    acceptedPacks: 0,
    acceptedRows: 0,
    repairQueue: [],
  });
  const sourceEvidence = buildHoldArtifact('gustav-target-flashcard-source-evidence-v1', {
    requiredPerAcceptedRow: true,
    acceptedRowsWithEvidence: 0,
  });
  const duplicateAudit = buildHoldArtifact('gustav-target-flashcard-duplicate-audit-v1', {
    duplicateCount: 0,
    status: 'PASS_EMPTY_CANDIDATE_SET',
  });
  const serverManifest = buildHoldArtifact('gustav-target-flashcard-server-pack-manifest-v1', {
    targetScoped: true,
    proposedPathTemplate: 'course-packs/fr/{ru|uk}/flashcard/{contentVersion}/{sha256}.json',
    uploadPerformed: false,
  });
  const adminManifest = buildHoldArtifact('gustav-target-flashcard-admin-workflow-manifest-v1', {
    requiredSurfaces: ['status', 'preview', 'source_review', 'publish_draft', 'activation_request', 'rollback'],
  });
  const finalGate = {
    schemaVersion: 'gustav-flashcard-pack-generator-final-gate-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    productionReady: false,
    generatorContractReady: true,
    frenchPackContentReady: false,
    activationApproved: false,
    status: 'GENERATOR_CONTRACT_READY_CONTENT_GENERATION_HOLD',
    gates: {
      englishBlueprintInventory: blueprint.packCount === 12 && blueprint.totalCards === 385 ? 'PASS' : 'HOLD',
      generatorContract: contract.reusableAcrossTargets ? 'PASS' : 'HOLD',
      packTaxonomy: plan.commonPacks.length > 0 && plan.cultureNativePacks.length > 0 ? 'PASS' : 'HOLD',
      sourceEvidence: 'HOLD_CONTENT_NOT_GENERATED',
      duplicateAudit: duplicateAudit.status,
      runtimeStorageIsolation: 'HOLD_CONTENT_NOT_GENERATED',
      serverPackDryRun: 'HOLD_CONTENT_NOT_GENERATED',
      adminWorkflowSurface: 'HOLD_CONTENT_NOT_GENERATED',
      rollback: 'HOLD_CONTENT_NOT_GENERATED',
      activationClosed: 'PASS',
    },
    holdGates: [
      'sourceEvidence',
      'runtimeStorageIsolation',
      'serverPackDryRun',
      'adminWorkflowSurface',
      'rollback',
    ],
  };
  const review = {
    schemaVersion: 'gustav-flashcard-pack-generator-review-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    verdict: 'PASS_GENERATOR_CONTRACT_HOLD_CONTENT',
    passed: ['english_blueprint_inventory', 'generator_contract', 'french_pack_plan'],
    holds: finalGate.holdGates,
    activationApproved: false,
  };

  writeJson(path.join(BUILD_DIR, 'english_flashcard_pack_blueprint_inventory.json'), blueprint);
  writeJson(path.join(BUILD_DIR, 'flashcard_pack_generator_contract.json'), contract);
  writeJson(path.join(BUILD_DIR, 'target_flashcard_pack_plan.json'), plan);
  writeJson(path.join(BUILD_DIR, 'target_flashcard_pack_candidates.json'), candidates);
  writeJson(path.join(BUILD_DIR, 'target_flashcard_source_evidence.json'), sourceEvidence);
  writeJson(path.join(BUILD_DIR, 'target_flashcard_duplicate_audit.json'), duplicateAudit);
  writeJson(path.join(BUILD_DIR, 'target_flashcard_server_pack_manifest.json'), serverManifest);
  writeJson(path.join(BUILD_DIR, 'target_flashcard_admin_workflow_manifest.json'), adminManifest);
  writeJson(path.join(BUILD_DIR, 'target_flashcard_final_gate.json'), finalGate);
  writeJson(path.join(REVIEW_DIR, 'target_flashcard_review.json'), review);
  fs.writeFileSync(path.join(REVIEW_DIR, 'target_flashcard_review.md'), [
    '# Gustav Flashcard Pack Generator Review',
    '',
    `Run: ${RUN_ID}`,
    `Verdict: ${review.verdict}`,
    `Activation approved: ${review.activationApproved}`,
    '',
    'Generator contract and French-first pack plan are ready. Actual target-language pack content remains on HOLD until source-backed generation and review.',
    '',
  ].join('\n'));

  console.log(JSON.stringify(finalGate, null, 2));
}

main();
