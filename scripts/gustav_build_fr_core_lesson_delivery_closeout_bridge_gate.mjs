import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'core_lessons_32');
const OUT_PATH = path.join(OUT_DIR, 'fr_core_lesson_delivery_closeout_bridge_gate_v1.json');
const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio');
const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server');
const RUNTIME_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime');

const PATHS = {
  reviewProgress: path.join(REVIEWER_DIR, 'fr_lesson_llm_review_decision_progress_gate_audit_v1.json'),
  importDryRun: path.join(REVIEWER_DIR, 'fr_lesson_review_decision_import_dry_run_audit_v1.json'),
  nonAcceptedRowsGate: path.join(REVIEWER_DIR, 'fr_lesson_non_accepted_rows_gate_audit_v1.json'),
  missingReviewBatchWorkOrder: path.join(REVIEWER_DIR, 'fr_lesson_missing_review_batch_work_order_audit_v1.json'),
  audioManifest: path.join(AUDIO_DIR, 'fr_lesson_audio_manifest_v1.json'),
  audioManifestGate: path.join(AUDIO_DIR, 'fr_lesson_audio_manifest_gate_audit_v1.json'),
  audioChecksumGate: path.join(AUDIO_DIR, 'fr_lesson_audio_checksum_gate_audit_v1.json'),
  serverManifestGate: path.join(SERVER_DIR, 'fr_lesson_server_pack_manifest_gate_audit_v1.json'),
  serverPayloadMaterializationGate: path.join(SERVER_DIR, 'fr_lesson_server_payload_materialization_gate_v1.json'),
  serverUploadEvidenceGate: path.join(SERVER_DIR, 'fr_lesson_server_upload_evidence_gate_audit_v1.json'),
  runtimeDeliveryGate: path.join(RUNTIME_DIR, 'fr_lesson_runtime_delivery_gate_audit_v1.json'),
  activationCompletionAudit: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'activation', 'fr_activation_completion_audit_v2.json'),
};

const EXPECTED_ROWS = 1600;
const EXPECTED_LESSONS = 32;
const EXPECTED_SERVER_OBJECTS = 4;
const MOJIBAKE_PATTERN = /(?:Ã|Â|Ð|Ñ|�)/u;

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

function listFiles(dir, predicate) {
  const result = [];
  function walk(current) {
    for (const name of fs.readdirSync(current)) {
      const filePath = path.join(current, name);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) walk(filePath);
      else if (predicate(name, filePath)) result.push(filePath);
    }
  }
  walk(dir);
  return result;
}

function countStatuses(files) {
  const statuses = {};
  const badFiles = [];
  for (const filePath of files) {
    try {
      const artifact = readJson(filePath);
      statuses[artifact.status ?? 'MISSING_STATUS'] = (statuses[artifact.status ?? 'MISSING_STATUS'] ?? 0) + 1;
    } catch (error) {
      statuses.UNREADABLE = (statuses.UNREADABLE ?? 0) + 1;
      badFiles.push({ file: rel(filePath), error: String(error?.message ?? error).slice(0, 180) });
    }
  }
  return { total: files.length, statuses, badFiles };
}

function countMojibakeAudioSlots(audioManifest) {
  const hits = [];
  for (const slot of audioManifest.slots ?? []) {
    if (typeof slot.textForTts === 'string' && MOJIBAKE_PATTERN.test(slot.textForTts)) {
      hits.push({
        audioSlotId: slot.audioSlotId,
        lessonId: slot.lessonId,
        rowNumber: slot.rowNumber,
        textForTts: slot.textForTts,
      });
    }
  }
  return hits;
}

function assertFalseSafety(artifact, label, blockers) {
  const safety = artifact.safety ?? {};
  for (const key of [
    'firebaseOrServerUploadStarted',
    'runtimeDownloadsEnabled',
    'productionApplyApproved',
    'appBundleModifiedByThisScript',
    'audioFilesGeneratedByThisScript',
  ]) {
    if (safety[key] === true) blockers.push(`${label}_${key}_UNEXPECTEDLY_TRUE`);
  }
  if (artifact.activationApproved === true || safety.activationApproved === true) {
    blockers.push(`${label}_ACTIVATION_APPROVED_UNEXPECTEDLY_TRUE`);
  }
}

function main() {
  const generatedAt = new Date().toISOString();
  const reviewProgress = readJson(PATHS.reviewProgress);
  const importDryRun = readJson(PATHS.importDryRun);
  const nonAcceptedRowsGate = readJson(PATHS.nonAcceptedRowsGate);
  const missingReviewBatchWorkOrder = readJson(PATHS.missingReviewBatchWorkOrder);
  const audioManifest = readJson(PATHS.audioManifest);
  const audioManifestGate = readJson(PATHS.audioManifestGate);
  const audioChecksumGate = readJson(PATHS.audioChecksumGate);
  const serverManifestGate = readJson(PATHS.serverManifestGate);
  const serverPayloadMaterializationGate = readJson(PATHS.serverPayloadMaterializationGate);
  const serverUploadEvidenceGate = readJson(PATHS.serverUploadEvidenceGate);
  const runtimeDeliveryGate = readJson(PATHS.runtimeDeliveryGate);
  const activationCompletionAudit = readJson(PATHS.activationCompletionAudit);

  const perLessonReview = countStatuses(listFiles(REVIEWER_DIR, (name) => /^fr_lesson\d{2}_blueprint_rebuild_review_gate_v1\.json$/.test(name)));
  const perLessonAudio = countStatuses(listFiles(AUDIO_DIR, (name) => /^fr_lesson\d{2}_blueprint_rebuild_audio_tts_manifest_gate_audit_v1\.json$/.test(name)));
  const perLessonServer = countStatuses(listFiles(SERVER_DIR, (name) => /^fr_lesson\d{2}_blueprint_rebuild_server_pack_manifest_gate_audit_v1\.json$/.test(name)));
  const perLessonHash = countStatuses(listFiles(SERVER_DIR, (name) => /^fr_lesson\d{2}_blueprint_rebuild_payload_hash_lock_gate_audit_v1\.json$/.test(name)));
  const perLessonRuntime = countStatuses(listFiles(RUNTIME_DIR, (name) => /^fr_lesson\d{2}_blueprint_rebuild_runtime_delivery_gate_audit_v1\.json$/.test(name)));
  const audioMojibakeHits = countMojibakeAudioSlots(audioManifest);

  const blockers = [];
  const reviewSummary = reviewProgress.summary ?? {};
  const importSummary = importDryRun.summary ?? {};
  const nonAcceptedSummary = nonAcceptedRowsGate.summary ?? {};
  const missingReviewSummary = missingReviewBatchWorkOrder.summary ?? {};
  const audioManifestSummary = audioManifestGate.summary ?? {};
  const audioChecksumSummary = audioChecksumGate.summary ?? {};
  const serverPayloadSummary = serverPayloadMaterializationGate.summary ?? {};
  const serverUploadSummary = serverUploadEvidenceGate.summary ?? {};
  const runtimeSummary = runtimeDeliveryGate.summary ?? {};
  const activationSummary = activationCompletionAudit.summary ?? {};

  if (reviewSummary.requestRows !== EXPECTED_ROWS) blockers.push('REVIEW_REQUEST_ROWS_NOT_1600');
  if (reviewSummary.decisionRows !== EXPECTED_ROWS) blockers.push('LLM_REVIEW_DECISIONS_INCOMPLETE');
  if (reviewSummary.missingDecisionRows !== 0) blockers.push('LLM_REVIEW_DECISIONS_MISSING');
  if (missingReviewSummary.missingReviewRows !== reviewSummary.missingDecisionRows) blockers.push('MISSING_REVIEW_WORK_ORDER_NOT_IN_SYNC');
  if (importSummary.acceptedRows !== EXPECTED_ROWS || importSummary.allRowsAccepted !== true) blockers.push('REVIEW_IMPORT_NOT_ACCEPTED_FOR_ALL_1600_ROWS');
  if ((importSummary.regenerationRows ?? 0) > 0) blockers.push('REGENERATION_ROWS_REMAIN');
  if ((importSummary.skippedRows ?? 0) > 0) blockers.push('SKIPPED_ROWS_REMAIN');
  if (nonAcceptedSummary.audioBlockedByNonAcceptedRows === true) blockers.push('NON_ACCEPTED_ROWS_BLOCK_AUDIO');
  if (audioManifest.slots?.length !== EXPECTED_ROWS) blockers.push('AUDIO_MANIFEST_SLOT_COUNT_NOT_1600');
  if (audioMojibakeHits.length > 0) blockers.push('AUDIO_MANIFEST_TEXT_MOJIBAKE_PRESENT');
  if (audioManifestSummary.readyForTtsGeneration !== true) blockers.push('AUDIO_TTS_GENERATION_NOT_READY');
  if (audioChecksumSummary.checksumReadySlots !== EXPECTED_ROWS) blockers.push('AUDIO_CHECKSUMS_NOT_READY');
  if ((audioChecksumSummary.missingAudioFiles ?? EXPECTED_ROWS) > 0) blockers.push('AUDIO_FILES_MISSING');
  if (serverPayloadSummary.payloadsReadyForManifest !== EXPECTED_SERVER_OBJECTS) blockers.push('SERVER_PAYLOADS_NOT_READY_FOR_MANIFEST');
  if ((serverPayloadSummary.manifestShaPlaceholderEntries ?? 0) > 0) blockers.push('SERVER_MANIFEST_SHA_PLACEHOLDERS_REMAIN');
  if (serverUploadSummary.uploadEvidenceReady !== true) blockers.push('SERVER_UPLOAD_EVIDENCE_NOT_READY');
  if (runtimeSummary.readyForRuntimeDelivery !== true) blockers.push('RUNTIME_DELIVERY_NOT_READY');
  if (activationSummary.readyForProductionActivation !== true) blockers.push('FINAL_ACTIVATION_AUDIT_NOT_READY');
  if (activationCompletionAudit.activationApproved !== false) blockers.push('ACTIVATION_APPROVED_NOT_FALSE');

  for (const [label, artifact] of Object.entries({
    reviewProgress,
    importDryRun,
    nonAcceptedRowsGate,
    missingReviewBatchWorkOrder,
    audioManifest,
    audioManifestGate,
    audioChecksumGate,
    serverManifestGate,
    serverPayloadMaterializationGate,
    serverUploadEvidenceGate,
    runtimeDeliveryGate,
    activationCompletionAudit,
  })) {
    assertFalseSafety(artifact, label.toUpperCase(), blockers);
  }

  const gate = {
    schemaVersion: 'gustav-fr-core-lesson-delivery-closeout-bridge-gate-v1',
    generatedAt,
    status: blockers.length === 0 ? 'PASS_CORE_LESSON_DELIVERY_READY_FOR_FINAL_ACTIVATION' : 'HOLD_CORE_LESSON_DELIVERY_NOT_READY',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    surface: 'core_lesson_delivery_closeout',
    activationApproved: false,
    readyForAppApply: false,
    readyForRuntimeEnable: false,
    inputs: Object.fromEntries(Object.entries(PATHS).map(([key, filePath]) => [key, rel(filePath)])),
    summary: {
      requestRows: reviewSummary.requestRows ?? 0,
      decisionRows: reviewSummary.decisionRows ?? 0,
      missingDecisionRows: reviewSummary.missingDecisionRows ?? 0,
      nextBatchStartIndex: reviewSummary.nextBatchStartIndex ?? null,
      acceptedRows: importSummary.acceptedRows ?? 0,
      regenerationRows: importSummary.regenerationRows ?? 0,
      skippedRows: importSummary.skippedRows ?? 0,
      nonAcceptedRows: nonAcceptedSummary.nonAcceptedRows ?? 0,
      missingDecisionBatches: nonAcceptedRowsGate.missingDecisionBatches?.length ?? 0,
      firstMissingDecisionBatchStartIndex: nonAcceptedRowsGate.missingDecisionBatches?.[0]?.startIndex ?? null,
      firstMissingDecisionBatchLimit: nonAcceptedRowsGate.missingDecisionBatches?.[0]?.limit ?? null,
      missingReviewBatchArtifacts: missingReviewSummary.batchArtifacts ?? 0,
      missingReviewWorkOrderReady: missingReviewBatchWorkOrder.status === 'HOLD_MISSING_REVIEW_BATCH_WORK_ORDER_READY',
      audioSlots: audioManifest.slots?.length ?? 0,
      audioMojibakeSlots: audioMojibakeHits.length,
      ttsGenerationAllowedSlots: audioManifestSummary.ttsGenerationAllowedSlots ?? 0,
      existingAudioFiles: audioChecksumSummary.existingAudioFiles ?? 0,
      checksumReadySlots: audioChecksumSummary.checksumReadySlots ?? 0,
      expectedServerObjects: EXPECTED_SERVER_OBJECTS,
      payloadsReadyForManifest: serverPayloadSummary.payloadsReadyForManifest ?? 0,
      uploadEvidenceAcceptedObjects: serverUploadSummary.acceptedObjects ?? 0,
      runtimeDownloadAllowedRows: runtimeSummary.runtimeDownloadAllowedRows ?? 0,
      activationRequirementsPassed: activationSummary.requirementsPassed ?? 0,
      activationRequirementsBlocked: activationSummary.requirementsBlocked ?? 0,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    },
    perLessonEvidence: {
      expectedLessons: EXPECTED_LESSONS,
      review: perLessonReview,
      audio: perLessonAudio,
      serverPack: perLessonServer,
      payloadHashLock: perLessonHash,
      runtimeDelivery: perLessonRuntime,
    },
    invariants: {
      noHumanReviewGate: true,
      llmTrustedSourceReviewInstead: true,
      serverPackBasedDeliveryOnly: true,
      noAppBundleFrenchProductionContentApplied: true,
      noFirebaseOrServerUploadStarted: true,
      runtimeDownloadsClosed: true,
      activationRemainsClosed: true,
      audioMustBeRealMp3WithShaBeforeServer: true,
      payloadHashesMustBeRealBeforeRuntime: true,
      mojibakeBlocksAudioAndProduction: true,
    },
    blockers: [...new Set(blockers)],
    evidenceSamples: {
      audioMojibakeHits: audioMojibakeHits.slice(0, 10),
      firstBlockedLessons: (nonAcceptedRowsGate.firstBlockedLessons ?? []).slice(0, 5),
      firstMissingDecisionBatches: (nonAcceptedRowsGate.missingDecisionBatches ?? []).slice(0, 3),
      missingReviewWorkOrder: rel(PATHS.missingReviewBatchWorkOrder),
    },
    nextRequiredWork: [
      reviewSummary.nextBatchExecuteCommand ?? 'continue LLM trusted-source review decisions until all 1600 rows are decided',
      'Resolve regeneration/skipped rows so import dry-run reports allRowsAccepted=true.',
      'Regenerate audio manifest from accepted clean rows only; block mojibake before TTS.',
      'Generate 1600 real OpenAI TTS mp3 files, then lock sha256 and durations.',
      'Materialize source-locale scoped server payloads and rewrite manifest hashes/byte sizes.',
      'Only after upload evidence and runtime gates pass, revisit activation audit.',
    ],
    safety: {
      readOnly: true,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
    },
  };

  writeJson(OUT_PATH, gate);
  console.log(`${gate.status} ${rel(OUT_PATH)} blockers=${gate.blockers.length} decisions=${gate.summary.decisionRows}/${EXPECTED_ROWS} accepted=${gate.summary.acceptedRows}/${EXPECTED_ROWS} audio=${gate.summary.checksumReadySlots}/${EXPECTED_ROWS}`);
}

main();
