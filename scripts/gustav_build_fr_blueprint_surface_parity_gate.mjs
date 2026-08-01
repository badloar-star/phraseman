import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'english_blueprint');
const PLAN_PATH = path.join(OUT_DIR, 'fr_blueprint_surface_parity_plan_v1.json');
const INVENTORY_PATH = path.join(OUT_DIR, 'english_blueprint_inventory_v1.json');
const APP_LEVEL_GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'core_lessons_32', 'fr_app_level_parity_gate_audit_v1.json');

const SURFACE_PLANS = {
  core_lessons: {
    copyProductContract: ['32 lessons', '50 rows per lesson', 'phrase row object shape', 'answer blank/correct/distractor shape', 'target-aware isolation fields'],
    rebuildNatively: ['French scope and sequence', 'French phrases', 'French word tokens', 'French grammar categories', 'French distractors'],
    currentFrenchArtifacts: ['docs/gustav/generated/fr/lessons/lesson*_row_ledger.json'],
    nextBuildScripts: ['scripts/gustav_build_fr_app_level_parity_gate.mjs', 'scripts/gustav_build_fr_lesson_rebuild_candidate.mjs'],
    productionBlockers: ['LLM_OFFICIAL_SOURCE_REVIEW_INCOMPLETE', 'APP_LEVEL_METADATA_NOT_MATERIALIZED', 'B1_B2_COVERAGE_NOT_PROVEN'],
  },
  lesson_theory: {
    copyProductContract: ['one theory entry per lesson', 'title/topic/explanation/examples/common mistakes shape', 'lesson id registry'],
    rebuildNatively: ['French grammar explanations', 'French-native examples', 'French common mistakes', 'source-backed notes'],
    currentFrenchArtifacts: [],
    nextBuildScripts: ['new scripts/gustav_build_fr_theory_parity_gate.mjs'],
    productionBlockers: ['FRENCH_THEORY_NOT_MATERIALIZED_FOR_32_LESSONS'],
  },
  lesson_intro_screens: {
    copyProductContract: ['intro screen sequence per lesson', 'lesson registry exports', 'localized UI wrapper compatibility'],
    rebuildNatively: ['French lesson intros', 'French learner warnings', 'French examples'],
    currentFrenchArtifacts: [],
    nextBuildScripts: ['new scripts/gustav_build_fr_intro_surface_parity_gate.mjs'],
    productionBlockers: ['FRENCH_INTRO_SCREENS_NOT_MATERIALIZED'],
  },
  vocabulary_word_training: {
    copyProductContract: ['word token training shape', 'lesson router connection', 'same source-locale UI behavior'],
    rebuildNatively: ['French vocabulary banks from French lessons/features', 'French morphology-aware distractors', 'French audio references'],
    currentFrenchArtifacts: [],
    nextBuildScripts: ['new scripts/gustav_build_fr_vocab_drill_parity_gate.mjs'],
    productionBlockers: ['FRENCH_VOCAB_BANK_NOT_PROVEN_AS_NATIVE_BANK'],
  },
  preposition_drills: {
    copyProductContract: ['drill route intent', 'explanation/result contract', 'mistake training flow'],
    rebuildNatively: ['French prepositions', 'a/de contractions', 'place/time/function usage', 'French source-backed examples'],
    currentFrenchArtifacts: [],
    nextBuildScripts: ['new scripts/gustav_build_fr_preposition_drill_gate.mjs'],
    productionBlockers: ['FRENCH_PREPOSITION_DRILL_NOT_MATERIALIZED'],
  },
  irregular_or_conjugation_drills: {
    copyProductContract: ['verb drill intent', 'SRS/review behavior', 'answer option contract'],
    rebuildNatively: ['French conjugation families', 'high-frequency irregular French verbs', 'tense/person agreement distractors'],
    currentFrenchArtifacts: [],
    nextBuildScripts: ['new scripts/gustav_build_fr_conjugation_drill_gate.mjs'],
    productionBlockers: ['FRENCH_CONJUGATION_DRILL_NOT_MATERIALIZED'],
  },
  quiz_surfaces: {
    copyProductContract: ['quiz session shape', 'theme/level packs', 'answer/explanation contract', 'source-locale UI'],
    rebuildNatively: ['French-native quiz banks', 'French explanations', 'French distractors', 'French thematic packs'],
    currentFrenchArtifacts: ['app/french_quiz_remote_runtime.ts'],
    nextBuildScripts: ['new scripts/gustav_build_fr_quiz_bank_parity_gate.mjs'],
    productionBlockers: ['FRENCH_QUIZZES_NOT_PROVEN_AS_NATIVE_BANKS'],
  },
  arena_questions: {
    copyProductContract: ['arena question object shape', 'level buckets', 'duel/runtime result flow'],
    rebuildNatively: ['French-native arena questions', 'French level distribution', 'French explanations where shown'],
    currentFrenchArtifacts: [],
    nextBuildScripts: ['new scripts/gustav_build_fr_arena_question_parity_gate.mjs'],
    productionBlockers: ['FRENCH_ARENA_QUESTION_BANK_NOT_MATERIALIZED'],
  },
  personal_practice_active_recall: {
    copyProductContract: ['practice routing', 'active recall session shape', 'mistake adapter isolation'],
    rebuildNatively: ['French practice banks', 'French mistake patterns', 'French spaced review prompts'],
    currentFrenchArtifacts: [],
    nextBuildScripts: ['new scripts/gustav_build_fr_personal_practice_parity_gate.mjs'],
    productionBlockers: ['FRENCH_PERSONAL_PRACTICE_NOT_PROVEN_AS_NATIVE_BANK'],
  },
  flashcards_collection_cards: {
    copyProductContract: ['flashcard pack shape', 'collection/marketplace surface', 'audio/card metadata contract'],
    rebuildNatively: ['French decks', 'French cultural/contextual examples', 'French collection cards'],
    currentFrenchArtifacts: ['app/french_flashcard_remote_runtime.ts'],
    nextBuildScripts: ['new scripts/gustav_build_fr_flashcard_collection_parity_gate.mjs'],
    productionBlockers: ['FRENCH_FLASHCARDS_NOT_PROVEN_AS_NATIVE_PACKS'],
  },
  ai_prompt_surfaces: {
    copyProductContract: ['prompt purpose per feature', 'target-language cache keys', 'rejected-output blocking', 'sourceLocale vs studyTarget separation'],
    rebuildNatively: ['French prompt variants', 'French grammar rubric', 'French mistake explanations', 'French dialogue/scenario rubric'],
    currentFrenchArtifacts: ['docs/gustav/GUSTAV_AI_PROMPT_PORTING_CONTRACT.md'],
    nextBuildScripts: ['new scripts/gustav_build_fr_ai_prompt_parity_gate.mjs'],
    productionBlockers: ['FRENCH_AI_PROMPT_PACKS_NOT_MATERIALIZED_FOR_ALL_SURFACES'],
  },
  server_runtime_admin_storage_cloud: {
    copyProductContract: ['server pack manifest', 'runtime loader/cache boundary', 'admin read/write isolation', 'storage/cloud target keys', 'rollback gates'],
    rebuildNatively: ['French pack payloads', 'French source-locale manifests', 'French activation evidence'],
    currentFrenchArtifacts: [
      'docs/gustav/generated/fr/server/fr_lesson_server_pack_manifest_gate_audit_v1.json',
      'docs/gustav/generated/fr/runtime/fr_lesson_runtime_delivery_gate_audit_v1.json',
      'docs/gustav/generated/fr/storage/fr_storage_cloud_isolation_gate_audit_v1.json',
    ],
    nextBuildScripts: [
      'scripts/gustav_build_fr_lesson_server_pack_manifest_gate.mjs',
      'scripts/gustav_build_fr_lesson_runtime_delivery_gate.mjs',
      'scripts/gustav_build_fr_admin_parity_isolation_gate.mjs',
      'scripts/gustav_build_fr_storage_cloud_isolation_gate.mjs',
    ],
    productionBlockers: ['SERVER_RUNTIME_ADMIN_STORAGE_CLOUD_NOT_READY_FOR_APPLY'],
  },
};

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function artifactExists(artifactPattern) {
  if (artifactPattern.includes('*')) {
    const dir = path.join(ROOT, path.dirname(artifactPattern));
    const basenamePattern = path.basename(artifactPattern).replace(/\*/g, '.*');
    return fs.existsSync(dir) && fs.readdirSync(dir).some((name) => new RegExp(`^${basenamePattern}$`).test(name));
  }
  return fs.existsSync(path.join(ROOT, artifactPattern));
}

function main() {
  const generatedAt = new Date().toISOString();
  const inventory = readJson(INVENTORY_PATH);
  const appLevelGate = readJson(APP_LEVEL_GATE_PATH);
  const blockers = [];

  if (inventory.schemaVersion !== 'gustav-english-blueprint-inventory-v1') blockers.push('ENGLISH_BLUEPRINT_INVENTORY_MISSING_OR_WRONG_SCHEMA');
  if (inventory.status !== 'PASS') blockers.push('ENGLISH_BLUEPRINT_INVENTORY_NOT_PASS');
  if (appLevelGate.schemaVersion !== 'gustav-fr-app-level-parity-gate-audit-v1') blockers.push('FR_APP_LEVEL_GATE_MISSING_OR_WRONG_SCHEMA');

  const surfacePlan = inventory.featureSurfaces.map((surface) => {
    const plan = SURFACE_PLANS[surface.id];
    if (!plan) blockers.push(`MISSING_SURFACE_PLAN_${surface.id}`);
    const currentArtifacts = plan?.currentFrenchArtifacts ?? [];
    const presentArtifacts = currentArtifacts.filter(artifactExists);
    const missingArtifacts = currentArtifacts.filter((artifact) => !artifactExists(artifact));
    return {
      id: surface.id,
      englishBlueprintStatus: surface.status,
      englishSourcePaths: surface.existingSourcePaths,
      copyProductContract: plan?.copyProductContract ?? [],
      rebuildNatively: plan?.rebuildNatively ?? [],
      forbiddenShortcut: 'Do not translate or fan out English rows as final French content.',
      currentFrenchArtifacts: currentArtifacts,
      presentFrenchArtifacts: presentArtifacts,
      missingFrenchArtifacts: missingArtifacts,
      nextBuildScripts: plan?.nextBuildScripts ?? [],
      productionBlockers: plan?.productionBlockers ?? [`${surface.id.toUpperCase()}_FRENCH_PLAN_MISSING`],
      parityStatus: plan && surface.status === 'MAPPED' ? 'PLANNED_HOLD' : 'BLOCK',
    };
  });

  const productionBlockers = [
    ...new Set(surfacePlan.flatMap((surface) => surface.productionBlockers)),
  ];
  const surfacesBlocked = surfacePlan.filter((surface) => surface.parityStatus !== 'PLANNED_HOLD').length;
  if (surfacesBlocked > 0) blockers.push('SURFACE_PLAN_BLOCKED');

  const gate = {
    schemaVersion: 'gustav-fr-blueprint-surface-parity-plan-v1',
    generatedAt,
    status: blockers.length > 0 ? 'BLOCK' : 'HOLD',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    readyForApply: false,
    inputs: {
      englishBlueprintInventory: rel(INVENTORY_PATH),
      frAppLevelParityGate: rel(APP_LEVEL_GATE_PATH),
    },
    invariants: {
      copyShapeNotEnglishContent: true,
      rebuildFrenchNatively: true,
      appLevelsMustRemainA1A2B1B2: true,
      internalFrenchBandsAreMetadataOnly: true,
      noLessonRowFanoutAsFeatureParity: true,
      serverPackDeliveryRequiredBeforeProduction: true,
    },
    surfacePlan,
    summary: {
      surfacesTotal: surfacePlan.length,
      surfacesPlanned: surfacePlan.filter((surface) => surface.parityStatus === 'PLANNED_HOLD').length,
      englishBlueprintSurfacesMapped: inventory.summary?.mappedFeatureSurfaces ?? 0,
      appLevelGateStatus: appLevelGate.status,
      appLevelGateProductionBlockers: appLevelGate.summary?.productionBlockers ?? 0,
      productionBlockers: productionBlockers.length,
      blockers: blockers.length,
      activationApproved: false,
      readyForApply: false,
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

  writeJson(PLAN_PATH, gate);
  console.log(`${gate.status} ${rel(PLAN_PATH)} surfaces=${gate.summary.surfacesPlanned}/${gate.summary.surfacesTotal} productionBlockers=${productionBlockers.length}`);
}

main();
