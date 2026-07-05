import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'english_blueprint');
const OUT_PATH = path.join(OUT_DIR, 'fr_non_lesson_surface_backlog_gate_v1.json');
const PARITY_PLAN_PATH = path.join(OUT_DIR, 'fr_blueprint_surface_parity_plan_v1.json');
const INVENTORY_PATH = path.join(OUT_DIR, 'english_blueprint_inventory_v1.json');
const LESSON32_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review', 'lesson32_blueprint_rebuild_candidate_v1.json');
const QUIZ_BRIDGE_GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'quizzes', 'fr_standard_quiz_global_readiness_bridge_gate_v1.json');
const THEORY_VOCAB_INTRO_BRIDGE_GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'theory', 'fr_theory_vocab_intro_parity_gate_v1.json');
const ARENA_BRIDGE_GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'arena', 'fr_arena_question_parity_gate_v1.json');
const FLASHCARD_BRIDGE_GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'flashcards', 'fr_flashcard_global_readiness_bridge_gate_v1.json');
const COLLECTIBLE_BRIDGE_GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'collectibles', 'fr_collectible_candidate_bridge_gate_v1.json');
const DAILY_PHRASE_BRIDGE_GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'daily_phrases', 'fr_daily_phrase_global_readiness_bridge_gate_v1.json');
const STORAGE_CLOUD_BRIDGE_GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'storage', 'fr_storage_cloud_isolation_bridge_gate_v1.json');
const GRAMMAR_DRILL_BRIDGE_GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'grammar', 'fr_grammar_drill_global_readiness_bridge_gate_v1.json');
const AI_PROMPT_BRIDGE_GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'ai_prompts', 'fr_ai_prompt_parity_gate_v1.json');
const PERSONAL_PRACTICE_BRIDGE_GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'personal_practice', 'fr_personal_practice_active_recall_global_readiness_bridge_gate_v1.json');
const CORE_LESSON_DELIVERY_BRIDGE_GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'core_lessons_32', 'fr_core_lesson_delivery_closeout_bridge_gate_v1.json');
const ADMIN_BRIDGE_GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'admin', 'fr_admin_global_readiness_bridge_gate_v1.json');

const PRODUCTION_PLACEHOLDER_PATTERNS = [
  /\bthis\s+lesson\b[^.!?\n]{0,120}\b(under\s+review|not\s+ready|coming\s+soon)\b/iu,
  /\bthis\s+content\b[^.!?\n]{0,120}\b(under\s+review|not\s+ready|coming\s+soon)\b/iu,
  /\bcoming\s+soon\b[^.!?\n]{0,80}\b(lesson|content|pack|surface)\b/iu,
  /(?:этот|данный)\s+урок[^.!?\n]{0,120}(?:на\s+проверке|не\s+готов|скоро\s+будет)/iu,
  /(?:цей|цей\s+урок)[^.!?\n]{0,120}(?:на\s+перевірці|не\s+готовий|скоро\s+буде)/iu,
  /(?:заглушка|заглушку|заглушки)[^.!?\n]{0,120}(?:урок|контент|пак|раздел)/iu,
];
const MOJIBAKE_PATTERN = /(?:[\u00c3\u00d0\u00d1\u00e2][\u0080-\u00bf]|\ufffd)/u;

const BACKLOG = [
  {
    id: 'core_lesson_delivery_closeout',
    relatedParitySurfaces: ['core_lessons', 'server_runtime_admin_storage_cloud'],
    priority: 1,
    why: '32 French lessons now exist locally, but production delivery is still closed until review, audio, hashes, server payloads, runtime and rollback pass.',
    exactFiles: [
      'docs/gustav/generated/fr/review/lesson*_blueprint_rebuild_candidate_v1.json',
      'docs/gustav/generated/fr/audio/fr_lesson_audio_manifest_v1.json',
      'docs/gustav/generated/fr/server/fr_lesson_server_pack_manifest_v1.json',
      'app/course_pack_remote_loader.ts',
      'app/french_target_remote_registration.ts',
    ],
    exactScripts: [
      'scripts/gustav_build_fr_lesson_audio_tts_batch_plan.mjs',
      'scripts/gustav_build_fr_lesson_audio_checksum_gate.mjs',
      'scripts/gustav_build_fr_lesson_server_payload_materialization_gate.mjs',
      'scripts/gustav_build_fr_lesson_runtime_delivery_gate.mjs',
    ],
    exactTests: [
      'tests/gustav_fr_lesson_audio_tts_batch_plan.test.ts',
      'tests/gustav_fr_lesson_audio_checksum_gate.test.ts',
      'tests/gustav_fr_lesson_server_payload_materialization_gate.test.ts',
      'tests/gustav_fr_lesson_runtime_delivery_gate.test.ts',
    ],
    productionBlockers: ['LLM_TRUSTED_SOURCE_REVIEW_NOT_COMPLETE', 'AUDIO_FILES_MISSING', 'SERVER_PAYLOAD_HASHES_NOT_LOCKED'],
  },
  {
    id: 'lesson_theory_intro_vocab',
    relatedParitySurfaces: ['lesson_theory', 'lesson_intro_screens', 'vocabulary_word_training'],
    priority: 2,
    why: 'Every lesson needs the same English product shape: theory, intro screens and vocabulary training, but written for French grammar and French learner mistakes.',
    exactFiles: [
      'app/theory_content_registry.ts',
      'app/lesson_intro_screens_9_32.ts',
      'app/lesson_intro_screens_17_32.ts',
      'docs/gustav/generated/fr/theory',
      'docs/gustav/generated/fr/vocabulary',
    ],
    exactScripts: [
      'scripts/gustav_build_fr_theory_parity_gate.mjs',
      'scripts/gustav_build_fr_intro_surface_parity_gate.mjs',
      'scripts/gustav_build_fr_vocab_drill_parity_gate.mjs',
    ],
    exactTests: [
      'tests/gustav_fr_theory_parity_gate.test.ts',
      'tests/gustav_fr_intro_surface_parity_gate.test.ts',
      'tests/gustav_fr_vocab_drill_parity_gate.test.ts',
    ],
    productionBlockers: ['FRENCH_THEORY_32_NOT_PROVEN', 'FRENCH_INTROS_32_NOT_PROVEN', 'FRENCH_VOCAB_NATIVE_BANK_NOT_PROVEN'],
  },
  {
    id: 'standard_quiz_banks',
    relatedParitySurfaces: ['quiz_surfaces'],
    priority: 3,
    why: 'Quizzes must be French-native banks with explanations and distractors, not a fanout of lesson rows.',
    exactFiles: ['app/french_quiz_remote_runtime.ts', 'admin/french-quizzes-workflow.js', 'docs/gustav/generated/fr/quizzes'],
    exactScripts: ['scripts/gustav_build_fr_standard_quiz_global_readiness_bridge_gate.mjs'],
    exactTests: [
      'tests/gustav_fr_standard_quiz_global_readiness_bridge_gate.test.ts',
      'tests/gustav_fr_standard_quiz_runtime_full_sentence_adapter.test.ts',
      'tests/gustav_fr_standard_quiz_admin_surface_wiring.test.ts',
      'tests/gustav_fr_standard_quiz_admin_workflow_handlers.test.ts',
      'tests/gustav_fr_standard_quiz_activation_rollback_gate.test.ts',
    ],
    productionBlockers: ['FRENCH_STANDARD_QUIZ_NATIVE_BANK_NOT_MATERIALIZED', 'QUIZ_SERVER_PAYLOAD_UPLOAD_CLOSED'],
  },
  {
    id: 'arena_question_banks',
    relatedParitySurfaces: ['arena_questions'],
    priority: 4,
    why: 'Arena needs its own French questions by app level, because duel questions cannot leak English grammar or English explanations.',
    exactFiles: ['app/arena_game.tsx', 'app/arena_lobby.tsx', 'assets/arena_questions_a1.json', 'assets/arena_questions_a2.json', 'assets/arena_questions_b1.json', 'assets/arena_questions_b2.json'],
    exactScripts: ['scripts/gustav_build_fr_arena_question_parity_gate.mjs'],
    exactTests: ['tests/gustav_fr_arena_question_parity_gate.test.ts'],
    productionBlockers: ['FRENCH_ARENA_BANK_NOT_MATERIALIZED', 'ARENA_LEVEL_DISTRIBUTION_NOT_PROVEN'],
  },
  {
    id: 'personal_practice_active_recall',
    relatedParitySurfaces: ['personal_practice_active_recall'],
    priority: 5,
    why: 'Personal practice must train French weak spots with target-scoped storage and sourceLocale-safe prompts.',
    exactFiles: ['app/french_personal_practice_remote_runtime.ts', 'app/personal_practice_target_gate.ts', 'app/active_recall.ts', 'app/review.tsx'],
    exactScripts: ['scripts/gustav_build_fr_personal_practice_active_recall_v1.mjs'],
    exactTests: ['tests/gustav_fr_personal_practice_active_recall_v1.test.ts'],
    productionBlockers: ['FRENCH_PERSONAL_PRACTICE_NATIVE_BANK_NOT_COMPLETE', 'PROBLEM_COACH_ROUTE_STILL_HOLD'],
  },
  {
    id: 'flashcards_and_marketplace_cards',
    relatedParitySurfaces: ['flashcards_collection_cards'],
    priority: 6,
    why: 'Flashcards and marketplace packs need French reality/context packs, source-locale meanings and clean runtime metadata.',
    exactFiles: ['app/french_flashcard_remote_runtime.ts', 'admin/french-flashcard-packs-admin.js', 'admin/french-flashcard-packs-workflow.js'],
    exactScripts: ['scripts/gustav_build_fr_flashcard_phrase_packs_v1.mjs', 'scripts/gustav_build_fr_flashcard_packs_activation_readiness.mjs'],
    exactTests: ['tests/gustav_fr_flashcard_phrase_packs_v1.test.ts', 'tests/gustav_fr_flashcard_packs_activation_readiness.test.ts'],
    productionBlockers: ['FRENCH_FLASHCARD_PACKS_NOT_FULL_COVERAGE', 'MARKETPLACE_TEXT_CLEAN_ENCODING_NOT_PROVEN'],
  },
  {
    id: 'collectible_cards',
    relatedParitySurfaces: ['flashcards_collection_cards'],
    priority: 7,
    why: 'Collectible cards must be French-specific rewards/cards, not English collectibles with French labels.',
    exactFiles: ['functions/src/collectibles.ts', 'functions/src/collectibles_catalog.ts', 'docs/gustav/generated/fr/collectibles'],
    exactScripts: ['scripts/gustav_build_fr_collectible_cards_v1.mjs'],
    exactTests: ['tests/gustav_fr_collectible_cards_v1.test.ts'],
    productionBlockers: ['FRENCH_COLLECTIBLE_CARD_PACKS_NOT_PROVEN', 'COLLECTIBLE_ASSET_EVIDENCE_NOT_COMPLETE'],
  },
  {
    id: 'prepositions_and_conjugation_drills',
    relatedParitySurfaces: ['preposition_drills', 'irregular_or_conjugation_drills'],
    priority: 8,
    why: 'English prepositions/irregular verbs must become French preposition contraction and conjugation practice, not copied English categories.',
    exactFiles: ['app/preposition_drill.tsx', 'app/lesson_prepositions.ts', 'app/lesson_irregular_verbs.tsx', 'app/irregular_verbs_data.ts'],
    exactScripts: [
      'scripts/gustav_build_fr_preposition_drill_gate.mjs',
      'scripts/gustav_build_fr_conjugation_drill_gate.mjs',
      'scripts/gustav_build_fr_grammar_drill_global_readiness_bridge_gate.mjs',
    ],
    exactTests: [
      'tests/gustav_fr_preposition_drill_gate.test.ts',
      'tests/gustav_fr_conjugation_drill_gate.test.ts',
      'tests/gustav_fr_grammar_drill_global_readiness_bridge_gate.test.ts',
    ],
    productionBlockers: ['FRENCH_PREPOSITION_DRILLS_NOT_MATERIALIZED', 'FRENCH_CONJUGATION_DRILLS_NOT_MATERIALIZED'],
  },
  {
    id: 'ai_prompt_surfaces',
    relatedParitySurfaces: ['ai_prompt_surfaces'],
    priority: 9,
    why: 'Every AI explanation/dialogue/review prompt must have a French contract, target cache key, reject gate and source-locale separation.',
    exactFiles: [
      'functions/src/ai_language_contract.ts',
      'functions/src/explain/explain_prompts.ts',
      'functions/src/explain/choice_explain_prompts.ts',
      'functions/src/explain/quiz_explain_prompts.ts',
      'functions/src/compass/compass_prompts.ts',
      'functions/src/mistake_explain.ts',
      'functions/src/weekly_review.ts',
      'functions/src/stats_insights.ts',
      'functions/src/premium_dialog.ts',
    ],
    exactScripts: ['scripts/gustav_build_fr_ai_prompt_parity_gate.mjs'],
    exactTests: ['functions/src/ai_language_contract.test.ts', 'tests/quiz_explain_server_cache_contract.test.ts', 'tests/gustav_fr_ai_prompt_parity_gate.test.ts'],
    productionBlockers: ['FRENCH_AI_PROMPTS_NOT_ALL_MATERIALIZED', 'REJECTED_FRESH_AI_TEXT_RETURN_NOT_PROVEN_BLOCKED_EVERYWHERE'],
  },
  {
    id: 'admin_surfaces',
    relatedParitySurfaces: ['server_runtime_admin_storage_cloud'],
    priority: 10,
    why: 'Admin/index must show and control French packs, validation reports, rollback and activation status everywhere English content can be managed.',
    exactFiles: ['admin/index.html', 'admin/french-daily-phrases-admin.js', 'admin/french-flashcard-packs-admin.js', 'admin/french-quizzes-workflow.js'],
    exactScripts: [
      'scripts/gustav_build_fr_admin_equivalence_matrix.mjs',
      'scripts/gustav_build_fr_admin_parity_isolation_gate.mjs',
      'scripts/gustav_build_fr_admin_activation_rollback_gate.mjs',
    ],
    exactTests: [
      'tests/gustav_fr_admin_equivalence_matrix.test.ts',
      'tests/gustav_fr_admin_parity_isolation_gate.test.ts',
      'tests/gustav_fr_admin_activation_rollback_gate.test.ts',
    ],
    productionBlockers: ['ADMIN_FRENCH_EQUIVALENCE_NOT_COMPLETE', 'ADMIN_ACTIVATION_ROLLBACK_NOT_READY'],
  },
  {
    id: 'storage_cloud_runtime_isolation',
    relatedParitySurfaces: ['server_runtime_admin_storage_cloud'],
    priority: 11,
    why: 'French must never share cache, cloud state, storage keys or runtime pack registrations with English or UI locale.',
    exactFiles: ['app/target_storage_keys.ts', 'app/cloud_sync.ts', 'app/course_pack_storage_cloud_isolation.ts', 'app/course_pack_remote_loader.ts'],
    exactScripts: ['scripts/gustav_build_fr_storage_cloud_isolation_gate.mjs', 'scripts/gustav_build_fr_activation_completion_audit_v2.mjs'],
    exactTests: ['tests/gustav_fr_storage_cloud_isolation_gate.test.ts', 'tests/study_target_server_prefetch_contract.test.ts', 'tests/gustav_fr_activation_completion_audit_v2.test.ts'],
    productionBlockers: ['STORAGE_CLOUD_FULL_ISOLATION_NOT_FINAL_APPROVED', 'RUNTIME_DOWNLOADS_STILL_CLOSED'],
  },
  {
    id: 'daily_phrases',
    relatedParitySurfaces: ['server_runtime_admin_storage_cloud'],
    priority: 12,
    why: 'Daily phrases are a separate product surface and must use French packs/admin/runtime checks, not bundled English fallback content.',
    exactFiles: ['app/french_daily_phrase_remote_runtime.ts', 'admin/french-daily-phrases-admin.js', 'admin/french-daily-phrases-workflow.js'],
    exactScripts: ['scripts/gustav_build_fr_daily_phrases_production_v1.mjs'],
    exactTests: [
      'tests/gustav_fr_daily_phrase_production_v1_gate.test.ts',
      'tests/gustav_fr_daily_phrase_runtime_pack_adapter.test.ts',
      'tests/gustav_fr_daily_phrase_admin_surface_wiring.test.ts',
      'tests/gustav_fr_daily_phrase_admin_workflow_handlers.test.ts',
    ],
    productionBlockers: ['FRENCH_DAILY_PHRASES_NOT_PRODUCTION_PROVEN', 'DAILY_PHRASE_ADMIN_RUNTIME_HOLD'],
  },
];

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readIfExists(relPath) {
  const filePath = path.join(ROOT, relPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function fileExists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function scanText(relPath) {
  const text = readIfExists(relPath);
  const placeholderHitLines = [];
  const mojibakeHitLines = [];
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    const isCommentOnly = trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('<!--');
    const isTechnicalPlaceholderUse =
      /\bplaceholder(?:=|TextColor|\b)/i.test(line) ||
      /\.placeholder\b/.test(line) ||
      /hasAttribute\('placeholder'\)/.test(line) ||
      /setAttribute\('placeholder'/.test(line);
    const isMojibakeRepairCode =
      /fixMojibake|MOJIBAKE|mojibake|\/[^/\n]*(?:Ð|Ñ|Ã|ð)[^/\n]*\//i.test(line);
    if (!isCommentOnly && !isTechnicalPlaceholderUse && PRODUCTION_PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(line))) {
      placeholderHitLines.push(index + 1);
    }
    if (!isCommentOnly && !isMojibakeRepairCode && MOJIBAKE_PATTERN.test(line)) {
      mojibakeHitLines.push(index + 1);
    }
  }
  return {
    file: relPath,
    exists: Boolean(text),
    hasPlaceholderText: placeholderHitLines.length > 0,
    hasMojibake: mojibakeHitLines.length > 0,
    placeholderHitLines: placeholderHitLines.slice(0, 20),
    mojibakeHitLines: mojibakeHitLines.slice(0, 20),
  };
}

function main() {
  const generatedAt = new Date().toISOString();
  const parityPlan = readJson(PARITY_PLAN_PATH);
  const inventory = readJson(INVENTORY_PATH);
  const lesson32 = readJson(LESSON32_PATH);
  const quizBridgeGate = readJsonIfExists(QUIZ_BRIDGE_GATE_PATH);
  const theoryVocabIntroBridgeGate = readJsonIfExists(THEORY_VOCAB_INTRO_BRIDGE_GATE_PATH);
  const arenaBridgeGate = readJsonIfExists(ARENA_BRIDGE_GATE_PATH);
  const flashcardBridgeGate = readJsonIfExists(FLASHCARD_BRIDGE_GATE_PATH);
  const collectibleBridgeGate = readJsonIfExists(COLLECTIBLE_BRIDGE_GATE_PATH);
  const dailyPhraseBridgeGate = readJsonIfExists(DAILY_PHRASE_BRIDGE_GATE_PATH);
  const storageCloudBridgeGate = readJsonIfExists(STORAGE_CLOUD_BRIDGE_GATE_PATH);
  const grammarDrillBridgeGate = readJsonIfExists(GRAMMAR_DRILL_BRIDGE_GATE_PATH);
  const aiPromptBridgeGate = readJsonIfExists(AI_PROMPT_BRIDGE_GATE_PATH);
  const personalPracticeBridgeGate = readJsonIfExists(PERSONAL_PRACTICE_BRIDGE_GATE_PATH);
  const coreLessonDeliveryBridgeGate = readJsonIfExists(CORE_LESSON_DELIVERY_BRIDGE_GATE_PATH);
  const adminBridgeGate = readJsonIfExists(ADMIN_BRIDGE_GATE_PATH);
  const quizBridgeReady = quizBridgeGate?.status === 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD';
  const theoryVocabIntroBridgeReady = theoryVocabIntroBridgeGate?.status === 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD';
  const arenaBridgeReady = arenaBridgeGate?.status === 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD';
  const flashcardBridgeReady = flashcardBridgeGate?.status === 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD';
  const collectibleBridgeReady = collectibleBridgeGate?.status === 'PASS_SURFACE_CANDIDATE_READY_GLOBAL_FRENCH_HOLD';
  const dailyPhraseBridgeReady = dailyPhraseBridgeGate?.status === 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD';
  const storageCloudBridgeReady = storageCloudBridgeGate?.status === 'PASS_ISOLATION_READY_GLOBAL_FRENCH_HOLD';
  const grammarDrillBridgeReady = grammarDrillBridgeGate?.status === 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD';
  const aiPromptBridgeReady = aiPromptBridgeGate?.status === 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD';
  const personalPracticeBridgeReady = personalPracticeBridgeGate?.status === 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD';
  const paritySurfaceIds = new Set((parityPlan.surfacePlan ?? []).map((surface) => surface.id));
  const blockers = [];

  if (parityPlan.status !== 'HOLD') blockers.push('FR_BLUEPRINT_SURFACE_PARITY_PLAN_NOT_HOLD');
  if (inventory.status !== 'PASS') blockers.push('ENGLISH_BLUEPRINT_INVENTORY_NOT_PASS');
  if (lesson32?.lessonId !== 32 || lesson32?.summary?.rows !== 50) blockers.push('CORE_LESSON_32_EVIDENCE_NOT_READY');

  const queue = BACKLOG.map((item) => {
    const isClosedQuizBridge = item.id === 'standard_quiz_banks' && quizBridgeReady;
    const isClosedTheoryVocabIntroBridge = item.id === 'lesson_theory_intro_vocab' && theoryVocabIntroBridgeReady;
    const isClosedArenaBridge = item.id === 'arena_question_banks' && arenaBridgeReady;
    const isClosedFlashcardBridge = item.id === 'flashcards_and_marketplace_cards' && flashcardBridgeReady;
    const isClosedCollectibleBridge = item.id === 'collectible_cards' && collectibleBridgeReady;
    const isClosedGrammarDrillBridge = item.id === 'prepositions_and_conjugation_drills' && grammarDrillBridgeReady;
    const isClosedAiPromptBridge = item.id === 'ai_prompt_surfaces' && aiPromptBridgeReady;
    const isClosedPersonalPracticeBridge = item.id === 'personal_practice_active_recall' && personalPracticeBridgeReady;
    const isClosedDailyPhraseBridge = item.id === 'daily_phrases' && dailyPhraseBridgeReady;
    const isClosedStorageCloudBridge = item.id === 'storage_cloud_runtime_isolation' && storageCloudBridgeReady;
    const isClosedAdminBridge = item.id === 'admin_surfaces' &&
      (adminBridgeGate?.status === 'PASS_ADMIN_SURFACES_READY_GLOBAL_FRENCH_HOLD' ||
        adminBridgeGate?.status === 'PASS_ADMIN_SURFACES_READY_FOR_FINAL_ACTIVATION');
    const itemProductionBlockers = isClosedQuizBridge
      ? ['GLOBAL_FRENCH_ACTIVATION_STILL_HOLD']
      : isClosedTheoryVocabIntroBridge
        ? ['THEORY_VOCAB_INTRO_RUNTIME_DELIVERY_STILL_HOLD', 'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD']
      : isClosedArenaBridge
        ? ['FRENCH_ARENA_RUNTIME_LOADER_STILL_HOLD', 'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD']
      : isClosedFlashcardBridge
        ? ['FRENCH_FLASHCARD_RUNTIME_LOADER_STILL_HOLD', 'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD']
      : isClosedCollectibleBridge
        ? [
            'COLLECTIBLE_LIVE_SOURCE_CHECK_STILL_HOLD',
            'COLLECTIBLE_IMAGE_ASSETS_STILL_HOLD',
            'FRENCH_COLLECTIBLE_RUNTIME_LOADER_STILL_HOLD',
            'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD',
          ]
      : isClosedGrammarDrillBridge
        ? ['FRENCH_GRAMMAR_DRILL_RUNTIME_LOADER_STILL_HOLD', 'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD']
      : isClosedAiPromptBridge
        ? ['AI_PROMPT_ADMIN_OBSERVABILITY_STILL_HOLD', 'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD']
      : isClosedPersonalPracticeBridge
        ? [
            'FRENCH_PERSONAL_PRACTICE_NATIVE_DIAGNOSIS_BANK_STILL_HOLD',
            'PROBLEM_COACH_ROUTE_STILL_HOLD',
            'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD',
          ]
      : isClosedDailyPhraseBridge
        ? ['DAILY_PHRASE_LIVE_UPLOAD_STILL_HOLD', 'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD']
      : isClosedStorageCloudBridge
        ? ['RUNTIME_DOWNLOADS_STILL_CLOSED', 'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD']
      : isClosedAdminBridge
        ? ['ADMIN_ACTIVATION_ROLLBACK_NOT_READY', 'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD']
      : item.productionBlockers;
    const missingParitySurfaces = item.relatedParitySurfaces.filter((id) => !paritySurfaceIds.has(id));
    const filePresence = item.exactFiles.map((file) => ({ file, exists: file.includes('*') ? true : fileExists(file) }));
    const scans = item.exactFiles.filter((file) => !file.includes('*')).map(scanText);
    if (missingParitySurfaces.length > 0) blockers.push(`MISSING_PARITY_SURFACE_FOR_${item.id}`);
    return {
      ...item,
      missingParitySurfaces,
      filePresence,
      scan: {
        scannedFiles: scans.length,
        placeholderHits: scans.filter((entry) => entry.hasPlaceholderText).map((entry) => entry.file),
        mojibakeHits: scans.filter((entry) => entry.hasMojibake).map((entry) => entry.file),
      },
      bridgeGate: item.id === 'core_lesson_delivery_closeout'
        ? {
            artifact: rel(CORE_LESSON_DELIVERY_BRIDGE_GATE_PATH),
            status: coreLessonDeliveryBridgeGate?.status ?? 'MISSING',
            localSurfaceReady: coreLessonDeliveryBridgeGate?.status === 'PASS_CORE_LESSON_DELIVERY_READY_FOR_FINAL_ACTIVATION',
            closedLocalBlockers: [],
            remainingBlockers: coreLessonDeliveryBridgeGate?.blockers ?? [],
          }
        : item.id === 'standard_quiz_banks'
        ? {
            artifact: rel(QUIZ_BRIDGE_GATE_PATH),
            status: quizBridgeGate?.status ?? 'MISSING',
            localSurfaceReady: quizBridgeReady,
            closedLocalBlockers: quizBridgeReady
              ? ['FRENCH_STANDARD_QUIZ_NATIVE_BANK_NOT_MATERIALIZED', 'QUIZ_SERVER_PAYLOAD_UPLOAD_CLOSED']
              : [],
          }
        : item.id === 'lesson_theory_intro_vocab'
          ? {
              artifact: rel(THEORY_VOCAB_INTRO_BRIDGE_GATE_PATH),
              status: theoryVocabIntroBridgeGate?.status ?? 'MISSING',
              localSurfaceReady: theoryVocabIntroBridgeReady,
              closedLocalBlockers: theoryVocabIntroBridgeReady
                ? [
                    'FRENCH_THEORY_32_NOT_PROVEN',
                    'FRENCH_INTROS_32_NOT_PROVEN',
                    'FRENCH_VOCAB_NATIVE_BANK_NOT_PROVEN',
                  ]
                : [],
            }
        : item.id === 'arena_question_banks'
          ? {
              artifact: rel(ARENA_BRIDGE_GATE_PATH),
              status: arenaBridgeGate?.status ?? 'MISSING',
              localSurfaceReady: arenaBridgeReady,
              closedLocalBlockers: arenaBridgeReady
                ? [
                    'FRENCH_ARENA_BANK_NOT_MATERIALIZED',
                    'ARENA_LEVEL_DISTRIBUTION_NOT_PROVEN',
                  ]
                : [],
            }
        : item.id === 'flashcards_and_marketplace_cards'
          ? {
              artifact: rel(FLASHCARD_BRIDGE_GATE_PATH),
              status: flashcardBridgeGate?.status ?? 'MISSING',
              localSurfaceReady: flashcardBridgeReady,
              closedLocalBlockers: flashcardBridgeReady
                ? [
                    'FRENCH_FLASHCARD_PACKS_NOT_FULL_COVERAGE',
                    'MARKETPLACE_TEXT_CLEAN_ENCODING_NOT_PROVEN',
                  ]
                : [],
            }
        : item.id === 'collectible_cards'
          ? {
              artifact: rel(COLLECTIBLE_BRIDGE_GATE_PATH),
              status: collectibleBridgeGate?.status ?? 'MISSING',
              localSurfaceReady: collectibleBridgeReady,
              closedLocalBlockers: collectibleBridgeReady
                ? ['FRENCH_COLLECTIBLE_CARD_PACKS_NOT_PROVEN']
                : [],
            }
        : item.id === 'daily_phrases'
          ? {
              artifact: rel(DAILY_PHRASE_BRIDGE_GATE_PATH),
              status: dailyPhraseBridgeGate?.status ?? 'MISSING',
              localSurfaceReady: dailyPhraseBridgeReady,
              closedLocalBlockers: dailyPhraseBridgeReady
                ? [
                    'FRENCH_DAILY_PHRASES_NOT_PRODUCTION_PROVEN',
                    'DAILY_PHRASE_ADMIN_RUNTIME_HOLD',
                  ]
                : [],
            }
        : item.id === 'prepositions_and_conjugation_drills'
          ? {
              artifact: rel(GRAMMAR_DRILL_BRIDGE_GATE_PATH),
              status: grammarDrillBridgeGate?.status ?? 'MISSING',
              localSurfaceReady: grammarDrillBridgeReady,
              closedLocalBlockers: grammarDrillBridgeReady
                ? [
                    'FRENCH_PREPOSITION_DRILLS_NOT_MATERIALIZED',
                    'FRENCH_CONJUGATION_DRILLS_NOT_MATERIALIZED',
                  ]
                : [],
            }
        : item.id === 'ai_prompt_surfaces'
          ? {
              artifact: rel(AI_PROMPT_BRIDGE_GATE_PATH),
              status: aiPromptBridgeGate?.status ?? 'MISSING',
              localSurfaceReady: aiPromptBridgeReady,
              closedLocalBlockers: aiPromptBridgeReady
                ? [
                    'FRENCH_AI_PROMPTS_NOT_ALL_MATERIALIZED',
                    'REJECTED_FRESH_AI_TEXT_RETURN_NOT_PROVEN_BLOCKED_EVERYWHERE',
                  ]
                : [],
            }
        : item.id === 'personal_practice_active_recall'
          ? {
              artifact: rel(PERSONAL_PRACTICE_BRIDGE_GATE_PATH),
              status: personalPracticeBridgeGate?.status ?? 'MISSING',
              localSurfaceReady: personalPracticeBridgeReady,
              closedLocalBlockers: personalPracticeBridgeReady
                ? ['FRENCH_PERSONAL_PRACTICE_ACTIVE_RECALL_NOT_BRIDGED']
                : [],
            }
        : item.id === 'admin_surfaces'
          ? {
              artifact: rel(ADMIN_BRIDGE_GATE_PATH),
              status: adminBridgeGate?.status ?? 'MISSING',
              localSurfaceReady: adminBridgeGate?.status === 'PASS_ADMIN_SURFACES_READY_FOR_FINAL_ACTIVATION' ||
                adminBridgeGate?.status === 'PASS_ADMIN_SURFACES_READY_GLOBAL_FRENCH_HOLD',
              closedLocalBlockers: adminBridgeGate?.status === 'PASS_ADMIN_SURFACES_READY_GLOBAL_FRENCH_HOLD' ||
                adminBridgeGate?.status === 'PASS_ADMIN_SURFACES_READY_FOR_FINAL_ACTIVATION'
                ? [
                    'OFFICIAL_FRENCH_ADMIN_SURFACES_NOT_OBSERVED',
                    'ADMIN_SOURCE_LOCALE_DIMENSION_NOT_PROVEN',
                    'ADMIN_EQUIVALENCE_BLOCKED_ROWS_REMAIN',
                  ]
                : [],
              remainingBlockers: adminBridgeGate?.productionBlockers ?? [],
              missingSurfaces: adminBridgeGate?.missingSurfaces ?? [],
            }
        : item.id === 'storage_cloud_runtime_isolation'
          ? {
              artifact: rel(STORAGE_CLOUD_BRIDGE_GATE_PATH),
              status: storageCloudBridgeGate?.status ?? 'MISSING',
              localSurfaceReady: storageCloudBridgeReady,
              closedLocalBlockers: storageCloudBridgeReady
                ? ['STORAGE_CLOUD_FULL_ISOLATION_NOT_FINAL_APPROVED']
                : [],
            }
        : undefined,
      noHumanReviewGate: true,
      llmTrustedSourceReviewRequired: true,
      readyForProduction: false,
      activationApproved: false,
      productionBlockers: itemProductionBlockers,
    };
  });

  const mojibakeHits = queue.flatMap((item) => item.scan.mojibakeHits.map((file) => ({ surface: item.id, file })));
  const placeholderHits = queue.flatMap((item) => item.scan.placeholderHits.map((file) => ({ surface: item.id, file })));

  const gate = {
    schemaVersion: 'gustav-fr-non-lesson-surface-backlog-gate-v1',
    generatedAt,
    status: blockers.length > 0 ? 'BLOCK' : 'HOLD',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    readyForApply: false,
    inputs: {
      parityPlan: rel(PARITY_PLAN_PATH),
      inventory: rel(INVENTORY_PATH),
      lesson32Candidate: rel(LESSON32_PATH),
    },
    invariants: {
      noHumanReview: true,
      llmTrustedSourceReviewInstead: true,
      noPlaceholdersAllowedInProduction: true,
      noMojibakeAllowedInProduction: true,
      noLessonRowFanoutAsFinalFeatureContent: true,
      everySurfaceUsesStudyTargetFrAndSourceLocaleSeparately: true,
      serverPackBeforeActivation: true,
    },
    summary: {
      backlogItems: queue.length,
      firstPriority: queue[0].id,
      blueprintSurfacesMapped: inventory.summary?.mappedFeatureSurfaces ?? 0,
      coreLessonRowsBuiltLocally: 32 * 50,
      mojibakeHitFiles: mojibakeHits.length,
      placeholderHitFiles: placeholderHits.length,
      surfaceBridgeGatesPassed: [
        quizBridgeReady,
        theoryVocabIntroBridgeReady,
        arenaBridgeReady,
        flashcardBridgeReady,
        collectibleBridgeReady,
        grammarDrillBridgeReady,
        aiPromptBridgeReady,
        personalPracticeBridgeReady,
        dailyPhraseBridgeReady,
        storageCloudBridgeReady,
      ].filter(Boolean).length,
      productionBlockers: [...new Set(queue.flatMap((item) => item.productionBlockers))].length,
      activationApproved: false,
      readyForApply: false,
    },
    queue,
    qualityFindings: {
      mojibakeHits,
      placeholderHits,
      note: 'Hits are blockers for production, not permission to delete surfaces. Fix by regenerating/repairing the affected French-native artifacts.',
    },
    blockers,
    nextPassPlan: [
      'Close core lesson delivery evidence without enabling production: review/import readiness, audio plan/checksums, payload hashes, runtime gate.',
      'Build French-native standard quiz bank contract from English quiz shape, not lesson row fanout.',
      'Materialize French theory/intro/vocabulary parity gates for all 32 lessons.',
      'Repair any mojibake/placeholder hits in non-lesson French artifacts before those surfaces can move from HOLD.',
    ],
    safety: {
      productionAppFilesModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
    },
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(gate, null, 2)}\n`, 'utf8');
  console.log(`${gate.status} ${rel(OUT_PATH)} backlog=${queue.length} mojibakeHits=${mojibakeHits.length} placeholderHits=${placeholderHits.length}`);
}

main();
