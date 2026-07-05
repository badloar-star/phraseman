import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio');
const QUEUE_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_queue_v1.json');
const IMPORT_DRY_RUN_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_decision_import_dry_run_audit_v1.json');
const MANIFEST_PATH = path.join(AUDIO_DIR, 'fr_lesson_audio_manifest_v1.json');
const AUDIT_PATH = path.join(AUDIO_DIR, 'fr_lesson_audio_manifest_gate_audit_v1.json');

const EXPECTED_ROWS = 1600;
const TTS_PROVIDER = 'openai';
const TTS_MODEL = 'gpt-4o-mini-tts';
const TTS_VOICE = 'alloy';
const TTS_RESPONSE_FORMAT = 'mp3';
const AUDIO_ROOT = 'course-packs/fr/audio/lessons';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(filePath) {
  return fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : '';
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function audioObjectPath(row) {
  return `${AUDIO_ROOT}/lesson${String(row.lessonId).padStart(2, '0')}/${row.phraseId}.mp3`;
}

function buildSlot(row, importDryRun) {
  const acceptedReady = importDryRun.summary?.readyForAudioManifestGate === true;
  return {
    audioSlotId: `fr.lesson.${String(row.lessonId).padStart(2, '0')}.row.${String(row.rowNumber).padStart(2, '0')}.audio.v1`,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocaleCoverage: ['ru', 'uk'],
    lessonId: row.lessonId,
    rowNumber: row.rowNumber,
    phraseId: row.phraseId,
    sourceQueueIndex: row.sourceQueueIndex,
    textForTts: row.candidateTargetText,
    textForTtsSource: acceptedReady ? 'accepted_llm_review_decision' : 'candidate_pending_llm_review',
    ttsProvider: TTS_PROVIDER,
    ttsModel: TTS_MODEL,
    voiceId: `${TTS_PROVIDER}:${TTS_VOICE}`,
    responseFormat: TTS_RESPONSE_FORMAT,
    storageObjectPath: audioObjectPath(row),
    localOutputPath: `.codex-tmp/gustav/fr/audio/lessons/lesson${String(row.lessonId).padStart(2, '0')}/${row.phraseId}.mp3`,
    expectedContentType: 'audio/mpeg',
    expectedSha256: '',
    expectedDurationMs: null,
    generatedAt: '',
    ttsGenerationAllowed: acceptedReady,
    serverUploadAllowed: false,
    runtimeDeliveryAllowed: false,
    activationApproved: false,
    blockers: acceptedReady ? [] : ['blocked_pending_1600_accepted_llm_review_decisions'],
  };
}

function main() {
  const generatedAt = new Date().toISOString();
  const queue = readJson(QUEUE_PATH);
  const importDryRun = readJson(IMPORT_DRY_RUN_PATH);
  const blockers = [];
  const warnings = [];

  if (queue.schemaVersion !== 'gustav-fr-lesson-review-queue-v1') blockers.push('review queue schemaVersion mismatch');
  if (!Array.isArray(queue.rows) || queue.rows.length !== EXPECTED_ROWS) blockers.push(`expected ${EXPECTED_ROWS} review queue rows`);
  if (importDryRun.schemaVersion !== 'gustav-fr-lesson-review-decision-import-dry-run-audit-v1') {
    blockers.push('import dry-run schemaVersion mismatch');
  }

  const readyForAudio = importDryRun.summary?.readyForAudioManifestGate === true;
  if (!readyForAudio) {
    warnings.push('audio manifest generation is blocked until import dry-run reports readyForAudioManifestGate=true');
  }

  const slots = queue.rows.map((row) => buildSlot(row, importDryRun));
  const allowedSlots = slots.filter((slot) => slot.ttsGenerationAllowed).length;
  const blockedSlots = slots.length - allowedSlots;
  const openServerSlots = slots.filter((slot) => slot.serverUploadAllowed || slot.runtimeDeliveryAllowed || slot.activationApproved).length;
  if (openServerSlots > 0) blockers.push(`${openServerSlots} audio slots opened server/runtime/activation flags`);
  if (slots.length !== EXPECTED_ROWS) blockers.push(`expected ${EXPECTED_ROWS} audio slots, got ${slots.length}`);

  const manifest = {
    schemaVersion: 'gustav-fr-lesson-audio-manifest-v1',
    generatedAt,
    status: blockers.length > 0 ? 'BLOCK' : readyForAudio ? 'READY_FOR_TTS_GENERATION' : 'HOLD_PENDING_LLM_ACCEPTANCE',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    ttsProvider: TTS_PROVIDER,
    ttsModel: TTS_MODEL,
    voiceId: `${TTS_PROVIDER}:${TTS_VOICE}`,
    responseFormat: TTS_RESPONSE_FORMAT,
    sourceArtifacts: {
      reviewQueue: rel(QUEUE_PATH),
      reviewDecisionImportDryRun: rel(IMPORT_DRY_RUN_PATH),
    },
    safety: {
      manifestOnly: true,
      ttsApiCalledByThisScript: false,
      audioFilesGeneratedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
    slots,
  };
  writeJson(MANIFEST_PATH, manifest);

  const audit = {
    schemaVersion: 'gustav-fr-lesson-audio-manifest-gate-audit-v1',
    generatedAt,
    status: blockers.length > 0 ? 'BLOCK' : 'HOLD',
    activationApproved: false,
    sourceArtifacts: {
      reviewQueue: rel(QUEUE_PATH),
      reviewDecisionImportDryRun: rel(IMPORT_DRY_RUN_PATH),
      manifest: rel(MANIFEST_PATH),
    },
    hashes: {
      reviewQueueSha256: sha256(QUEUE_PATH),
      reviewDecisionImportDryRunSha256: sha256(IMPORT_DRY_RUN_PATH),
      manifestSha256: sha256(MANIFEST_PATH),
    },
    summary: {
      reviewQueueRows: queue.rows?.length || 0,
      importDryRunReadyForAudioManifestGate: readyForAudio,
      audioSlots: slots.length,
      ttsGenerationAllowedSlots: allowedSlots,
      ttsGenerationBlockedSlots: blockedSlots,
      serverUploadAllowedSlots: slots.filter((slot) => slot.serverUploadAllowed).length,
      runtimeDeliveryAllowedSlots: slots.filter((slot) => slot.runtimeDeliveryAllowed).length,
      activationApprovedSlots: slots.filter((slot) => slot.activationApproved).length,
      ttsProvider: TTS_PROVIDER,
      ttsModel: TTS_MODEL,
      voiceId: `${TTS_PROVIDER}:${TTS_VOICE}`,
      readyForTtsGeneration: blockers.length === 0 && readyForAudio && allowedSlots === EXPECTED_ROWS,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      blockers: blockers.length,
      warnings: warnings.length,
    },
    blockers,
    warnings,
    nextRequiredGates: [
      'execute_llm_official_source_review_requests',
      'llm_review_decision_schema_gate',
      'review_decision_import_dry_run_gate',
      'audio_tts_generation_gate',
      'audio_checksum_gate',
      'server_pack_manifest_gate',
      'runtime_delivery_gate',
      'admin_parity_gate',
      'storage_cloud_isolation_gate',
      'rollback_gate',
      'explicit_activation_approval_gate',
    ],
  };
  writeJson(AUDIT_PATH, audit);

  console.log(`Gustav French lesson audio manifest gate: ${audit.status}`);
  console.log(`Audio slots: ${slots.length}`);
  console.log(`TTS allowed: ${allowedSlots}/${EXPECTED_ROWS}`);
  console.log(`Ready for TTS generation: ${audit.summary.readyForTtsGeneration ? 'yes' : 'no'}`);
  console.log(`Ready for apply: no`);
  console.log(rel(AUDIT_PATH));

  if (blockers.length > 0) process.exitCode = 1;
}

main();
