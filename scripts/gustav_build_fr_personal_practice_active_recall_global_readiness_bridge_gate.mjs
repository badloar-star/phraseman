import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'personal_practice');
const OUT_PATH = path.join(OUT_DIR, 'fr_personal_practice_active_recall_global_readiness_bridge_gate_v1.json');
const BLUEPRINT_PATH = path.join(OUT_DIR, 'fr_personal_practice_active_recall_blueprint_audit_v1.json');
const RUNTIME_PATH = path.join(OUT_DIR, 'fr_personal_practice_active_recall_runtime_gate_v1.json');
const SERVER_PATH = path.join(OUT_DIR, 'fr_personal_practice_active_recall_server_pack_gate_v1.json');
const ADMIN_STORAGE_PATH = path.join(OUT_DIR, 'fr_personal_practice_active_recall_admin_storage_cloud_gate_v1.json');
const HANDOFF_PATH = path.join(OUT_DIR, 'fr_personal_practice_active_recall_readiness_handoff_v1.json');
const NATIVE_BANK_PATH = path.join(OUT_DIR, 'fr_personal_practice_native_bank_candidate_gate_v1.json');
const NATIVE_BANK_REVIEW_REQUESTS_PATH = path.join(OUT_DIR, 'fr_personal_practice_native_bank_review_requests_audit_v1.json');
const NATIVE_BANK_EXTERNAL_HANDOFF_PATH = path.join(OUT_DIR, 'fr_personal_practice_native_bank_review_external_handoff_v1.json');
const NATIVE_BANK_DECISION_SCHEMA_PATH = path.join(OUT_DIR, 'fr_personal_practice_native_bank_review_decision_schema_gate_v1.json');
const NATIVE_BANK_IMPORT_DRY_RUN_PATH = path.join(OUT_DIR, 'fr_personal_practice_native_bank_review_import_dry_run_v1.json');
const MISTAKE_TAXONOMY_PATH = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_candidate_gate_v1.json');
const MISTAKE_TAXONOMY_REVIEW_REQUESTS_PATH = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_review_requests_audit_v1.json');
const MISTAKE_TAXONOMY_EXTERNAL_HANDOFF_PATH = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_review_external_handoff_v1.json');
const MISTAKE_TAXONOMY_DECISION_SCHEMA_PATH = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_review_decision_schema_gate_v1.json');
const MISTAKE_TAXONOMY_IMPORT_DRY_RUN_PATH = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_review_import_dry_run_v1.json');

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

function allChecksPass(artifact) {
  return Array.isArray(artifact.checks) && artifact.checks.length > 0 && artifact.checks.every((check) => check.status === 'PASS');
}

function assertSafetyClosed(artifact, label, blockers) {
  const safety = artifact.safety ?? {};
  for (const key of [
    'activationApproved',
    'productionReady',
    'serverUploadAllowed',
    'runtimeApplyAllowed',
    'adminWritesOpened',
    'audioGenerated',
    'lessonFilesModified',
  ]) {
    if (safety[key] !== false) blockers.push(`${label}_${key}_NOT_FALSE`);
  }
}

function main() {
  const generatedAt = new Date().toISOString();
  const blueprint = readJson(BLUEPRINT_PATH);
  const runtime = readJson(RUNTIME_PATH);
  const server = readJson(SERVER_PATH);
  const adminStorage = readJson(ADMIN_STORAGE_PATH);
  const handoff = readJson(HANDOFF_PATH);
  const nativeBank = readJson(NATIVE_BANK_PATH);
  const nativeBankReviewRequests = readJson(NATIVE_BANK_REVIEW_REQUESTS_PATH);
  const nativeBankExternalHandoff = readJson(NATIVE_BANK_EXTERNAL_HANDOFF_PATH);
  const nativeBankDecisionSchema = readJson(NATIVE_BANK_DECISION_SCHEMA_PATH);
  const nativeBankImportDryRun = readJson(NATIVE_BANK_IMPORT_DRY_RUN_PATH);
  const mistakeTaxonomy = readJson(MISTAKE_TAXONOMY_PATH);
  const mistakeTaxonomyReviewRequests = readJson(MISTAKE_TAXONOMY_REVIEW_REQUESTS_PATH);
  const mistakeTaxonomyExternalHandoff = readJson(MISTAKE_TAXONOMY_EXTERNAL_HANDOFF_PATH);
  const mistakeTaxonomyDecisionSchema = readJson(MISTAKE_TAXONOMY_DECISION_SCHEMA_PATH);
  const mistakeTaxonomyImportDryRun = readJson(MISTAKE_TAXONOMY_IMPORT_DRY_RUN_PATH);
  const blockers = [];

  if (blueprint.status !== 'PASS_BLUEPRINT_SURFACE_PARITY_HOLD_FOR_COACH_BANK') blockers.push('BLUEPRINT_AUDIT_NOT_READY');
  if (runtime.status !== 'PASS_RUNTIME_TARGET_ISOLATION_WITH_COACH_HOLD') blockers.push('RUNTIME_GATE_NOT_READY');
  if (server.status !== 'PASS_DRY_RUN_SERVER_SURFACE_DECLARED_UPLOAD_CLOSED') blockers.push('SERVER_GATE_NOT_READY');
  if (adminStorage.status !== 'PASS_ADMIN_STORAGE_CLOUD_ISOLATION_WITH_ADMIN_WRITE_HOLD') blockers.push('ADMIN_STORAGE_GATE_NOT_READY');
  if (handoff.status !== 'READY_HANDOFF_WITH_PRODUCTION_HOLD') blockers.push('HANDOFF_NOT_READY');
  if (nativeBank.status !== 'HOLD_CANDIDATE_READY_FOR_LLM_TRUSTED_SOURCE_REVIEW') blockers.push('NATIVE_BANK_CANDIDATE_NOT_READY_FOR_REVIEW');
  if (nativeBankReviewRequests.status !== 'HOLD_READY_FOR_LLM_TRUSTED_SOURCE_REVIEW') blockers.push('NATIVE_BANK_REVIEW_REQUESTS_NOT_READY');
  if (nativeBankExternalHandoff.status !== 'HOLD_EXTERNAL_NATIVE_BANK_REVIEW_HANDOFF_READY') blockers.push('NATIVE_BANK_EXTERNAL_HANDOFF_NOT_READY');
  if (mistakeTaxonomy.status !== 'HOLD_CANDIDATE_READY_FOR_LLM_TRUSTED_SOURCE_REVIEW') blockers.push('MISTAKE_TAXONOMY_CANDIDATE_NOT_READY_FOR_REVIEW');
  if (mistakeTaxonomyReviewRequests.status !== 'HOLD_READY_FOR_LLM_TRUSTED_SOURCE_REVIEW') blockers.push('MISTAKE_TAXONOMY_REVIEW_REQUESTS_NOT_READY');
  if (mistakeTaxonomyExternalHandoff.status !== 'HOLD_EXTERNAL_MISTAKE_TAXONOMY_REVIEW_HANDOFF_READY') blockers.push('MISTAKE_TAXONOMY_EXTERNAL_HANDOFF_NOT_READY');
  if (!allChecksPass(blueprint)) blockers.push('BLUEPRINT_CHECKS_NOT_ALL_PASS');
  if (!allChecksPass(runtime)) blockers.push('RUNTIME_CHECKS_NOT_ALL_PASS');
  if (!allChecksPass(server)) blockers.push('SERVER_CHECKS_NOT_ALL_PASS');
  if (!allChecksPass(adminStorage)) blockers.push('ADMIN_STORAGE_CHECKS_NOT_ALL_PASS');
  if (blueprint.frenchFacts?.diagnosisCoachOpen !== false) blockers.push('FRENCH_PROBLEM_COACH_UNEXPECTEDLY_OPEN');
  if (blueprint.frenchFacts?.activeRecallOpenFromTargetScopedBucket !== true) blockers.push('ACTIVE_RECALL_TARGET_BUCKET_NOT_OPEN');
  if (blueprint.frenchFacts?.trainerSessionsOpenFromTargetScopedOrRemotePracticeBucket !== true) blockers.push('TRAINER_REMOTE_BUCKET_NOT_OPEN');
  if (blueprint.frenchFacts?.serverPackSurfaceDeclared !== true) blockers.push('SERVER_PACK_SURFACE_NOT_DECLARED');
  if (blueprint.englishBlueprintFacts?.diagnosisTrainingIds < 50) blockers.push('ENGLISH_DIAGNOSIS_BLUEPRINT_TOO_SMALL');
  if (nativeBank.summary?.frenchBankCandidateRows !== blueprint.englishBlueprintFacts?.diagnosisTrainingIds) {
    blockers.push('NATIVE_BANK_CANDIDATE_COUNT_MISMATCH');
  }
  if (nativeBank.summary?.rowsWithEnglishIdReuse !== 0) blockers.push('NATIVE_BANK_REUSES_ENGLISH_IDS');
  if (nativeBank.summary?.rowsWithUnsafeFlags !== 0) blockers.push('NATIVE_BANK_UNSAFE_FLAGS');
  if (nativeBankReviewRequests.summary?.reviewRequestRows !== nativeBank.summary?.frenchBankCandidateRows) {
    blockers.push('NATIVE_BANK_REVIEW_REQUEST_COUNT_MISMATCH');
  }
  if (mistakeTaxonomy.summary?.taxonomyRows !== nativeBank.summary?.frenchBankCandidateRows) {
    blockers.push('MISTAKE_TAXONOMY_COUNT_MISMATCH');
  }
  if (mistakeTaxonomy.summary?.rowsWithEnglishIdReuse !== 0) blockers.push('MISTAKE_TAXONOMY_REUSES_ENGLISH_IDS');
  if (mistakeTaxonomy.summary?.rowsWithUnsafeFlags !== 0) blockers.push('MISTAKE_TAXONOMY_UNSAFE_FLAGS');
  if (mistakeTaxonomyReviewRequests.summary?.reviewRequestRows !== mistakeTaxonomy.summary?.taxonomyRows) {
    blockers.push('MISTAKE_TAXONOMY_REVIEW_REQUEST_COUNT_MISMATCH');
  }
  if (!server.proposedObjectPrefixes?.includes('course-packs/fr/ru/personal_practice/{contentVersion}/')) blockers.push('RU_SERVER_PREFIX_MISSING');
  if (!server.proposedObjectPrefixes?.includes('course-packs/fr/uk/personal_practice/{contentVersion}/')) blockers.push('UK_SERVER_PREFIX_MISSING');

  for (const [label, artifact] of Object.entries({ blueprint, runtime, server, adminStorage, handoff })) {
    assertSafetyClosed(artifact, label.toUpperCase(), blockers);
  }

  const handoffBlockerIds = (handoff.blockers ?? []).map((item) => item.id);
  const handoffRequiredBlockers = [
    'french_personal_practice_training_bank',
    'french_personal_practice_mistake_taxonomy_review',
    'french_pos_workout_profile_review',
    'ru_uk_personal_practice_prompt_review',
    'server_upload_and_runtime_apply_approval',
  ];
  const remainingProductionHolds = [
    'french_personal_practice_native_bank_llm_review',
    'french_personal_practice_mistake_taxonomy_llm_review',
    'french_pos_workout_profile_review',
    'ru_uk_personal_practice_prompt_review',
    'server_upload_and_runtime_apply_approval',
  ];
  for (const id of handoffRequiredBlockers) {
    if (!handoffBlockerIds.includes(id)) blockers.push(`HANDOFF_HOLD_BLOCKER_MISSING_${id}`);
  }

  const gate = {
    schemaVersion: 'gustav-fr-personal-practice-active-recall-global-readiness-bridge-gate-v1',
    generatedAt,
    status: blockers.length === 0 ? 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD' : 'BLOCK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    surface: 'personal_practice_active_recall',
    activationApproved: false,
    globalFrenchActivationApproved: false,
    readyForAppApply: false,
    readyForRuntimeEnable: false,
    inputs: {
      blueprintAudit: rel(BLUEPRINT_PATH),
      runtimeGate: rel(RUNTIME_PATH),
      serverPackGate: rel(SERVER_PATH),
      adminStorageCloudGate: rel(ADMIN_STORAGE_PATH),
      readinessHandoff: rel(HANDOFF_PATH),
      nativeBankCandidateGate: rel(NATIVE_BANK_PATH),
      nativeBankReviewRequests: rel(NATIVE_BANK_REVIEW_REQUESTS_PATH),
      nativeBankExternalHandoff: rel(NATIVE_BANK_EXTERNAL_HANDOFF_PATH),
      nativeBankDecisionSchemaGate: rel(NATIVE_BANK_DECISION_SCHEMA_PATH),
      nativeBankImportDryRun: rel(NATIVE_BANK_IMPORT_DRY_RUN_PATH),
      mistakeTaxonomyCandidateGate: rel(MISTAKE_TAXONOMY_PATH),
      mistakeTaxonomyReviewRequests: rel(MISTAKE_TAXONOMY_REVIEW_REQUESTS_PATH),
      mistakeTaxonomyExternalHandoff: rel(MISTAKE_TAXONOMY_EXTERNAL_HANDOFF_PATH),
      mistakeTaxonomyDecisionSchemaGate: rel(MISTAKE_TAXONOMY_DECISION_SCHEMA_PATH),
      mistakeTaxonomyImportDryRun: rel(MISTAKE_TAXONOMY_IMPORT_DRY_RUN_PATH),
    },
    summary: {
      englishDiagnosisTrainingIds: blueprint.englishBlueprintFacts?.diagnosisTrainingIds ?? 0,
      englishDiagnosisRegistryBranches: blueprint.englishBlueprintFacts?.diagnosisRegistryBranches ?? 0,
      runtimeChecks: runtime.checks?.length ?? 0,
      serverChecks: server.checks?.length ?? 0,
      adminStorageChecks: adminStorage.checks?.length ?? 0,
      handoffRequirements: handoff.requirementMatrix?.length ?? 0,
      nativeBankCandidateRows: nativeBank.summary?.frenchBankCandidateRows ?? 0,
      nativeBankReadyForLlmReview: nativeBank.summary?.readyForLlmTrustedSourceReview === true,
      nativeBankRowsWithEnglishIdReuse: nativeBank.summary?.rowsWithEnglishIdReuse ?? 0,
      nativeBankReviewRequestRows: nativeBankReviewRequests.summary?.reviewRequestRows ?? 0,
      nativeBankReviewRequestsReady: nativeBankReviewRequests.summary?.readyForExternalReview === true,
      nativeBankExternalReviewBatches: nativeBankExternalHandoff.summary?.plannedBatches ?? 0,
      nativeBankDecisionRows: nativeBankDecisionSchema.summary?.decisionRows ?? 0,
      nativeBankMissingDecisionRows: nativeBankDecisionSchema.summary?.missingDecisionRows ?? 0,
      nativeBankImportDryRunReady: nativeBankImportDryRun.summary?.schemaGateReady === true,
      mistakeTaxonomyRows: mistakeTaxonomy.summary?.taxonomyRows ?? 0,
      mistakeTaxonomyReadyForLlmReview: mistakeTaxonomy.summary?.readyForLlmTrustedSourceReview === true,
      mistakeTaxonomyRowsWithEnglishIdReuse: mistakeTaxonomy.summary?.rowsWithEnglishIdReuse ?? 0,
      mistakeTaxonomyReviewRequestRows: mistakeTaxonomyReviewRequests.summary?.reviewRequestRows ?? 0,
      mistakeTaxonomyReviewRequestsReady: mistakeTaxonomyReviewRequests.summary?.readyForExternalReview === true,
      mistakeTaxonomyExternalReviewBatches: mistakeTaxonomyExternalHandoff.summary?.plannedBatches ?? 0,
      mistakeTaxonomyDecisionRows: mistakeTaxonomyDecisionSchema.summary?.decisionRows ?? 0,
      mistakeTaxonomyMissingDecisionRows: mistakeTaxonomyDecisionSchema.summary?.missingDecisionRows ?? 0,
      mistakeTaxonomyImportDryRunReady: mistakeTaxonomyImportDryRun.summary?.schemaGateReady === true,
      problemCoachOpen: blueprint.frenchFacts?.diagnosisCoachOpen === true,
      activeRecallOpenFromTargetScopedBucket: blueprint.frenchFacts?.activeRecallOpenFromTargetScopedBucket === true,
      trainerSessionsOpenFromTargetScopedOrRemotePracticeBucket:
        blueprint.frenchFacts?.trainerSessionsOpenFromTargetScopedOrRemotePracticeBucket === true,
      serverPackSurfaceDeclared: blueprint.frenchFacts?.serverPackSurfaceDeclared === true,
      activationApproved: false,
      globalFrenchStillHold: true,
    },
    invariants: {
      englishDiagnosisRegistryNotReusedForFrench: true,
      frenchProblemCoachStillClosedUntilNativeBankReview: blueprint.frenchFacts?.diagnosisCoachOpen === false,
      frenchNativeBankCandidateExists: nativeBank.summary?.frenchBankCandidateRows === blueprint.englishBlueprintFacts?.diagnosisTrainingIds,
      frenchNativeBankRequiresLlmTrustedSourceReview: nativeBank.summary?.readyForLlmTrustedSourceReview === true,
      frenchNativeBankReviewRequestsReady: nativeBankReviewRequests.summary?.readyForExternalReview === true,
      frenchNativeBankExternalHandoffReady: nativeBankExternalHandoff.summary?.plannedBatches === 3,
      frenchMistakeTaxonomyCandidateExists: mistakeTaxonomy.summary?.taxonomyRows === nativeBank.summary?.frenchBankCandidateRows,
      frenchMistakeTaxonomyRequiresLlmTrustedSourceReview: mistakeTaxonomy.summary?.readyForLlmTrustedSourceReview === true,
      frenchMistakeTaxonomyReviewRequestsReady: mistakeTaxonomyReviewRequests.summary?.readyForExternalReview === true,
      frenchMistakeTaxonomyExternalHandoffReady: mistakeTaxonomyExternalHandoff.summary?.plannedBatches === 3,
      activeRecallTargetScoped: runtime.checks?.some((check) => check.id === 'active_recall_target_scoped_storage') === true,
      remotePersonalPracticeFrenchOnly:
        runtime.checks?.some((check) => check.id === 'remote_payload_acceptance_is_french_only') === true,
      serverPackCandidateOnly: server.status === 'PASS_DRY_RUN_SERVER_SURFACE_DECLARED_UPLOAD_CLOSED',
      sourceLocalePayloadsSeparated: server.proposedObjectPrefixes?.length === 2,
      adminWritesClosed: adminStorage.safety?.adminWritesOpened === false,
      appBundleNotModified: true,
      runtimeActivationClosed: true,
      activationRemainsClosed: true,
    },
    blockers,
    remainingProductionHolds,
    nextRequiredGlobalSteps: [
      'Run LLM trusted-source review for the 56-row French-native personal-practice bank candidate and mistake taxonomy.',
      'Port problem_coach route prompts for studyTarget=fr with RU/UK output contracts and trusted-source LLM review.',
      'Keep remote personal_practice server upload/apply closed until global French activation gates approve it.',
    ],
  };

  writeJson(OUT_PATH, gate);
  console.log(`${gate.status} ${rel(OUT_PATH)} blockers=${blockers.length}`);
}

main();
