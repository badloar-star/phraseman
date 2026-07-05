import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio');
const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server');

const REVIEW_QUEUE_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_queue_v1.json');
const IMPORT_DRY_RUN_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_decision_import_dry_run_audit_v1.json');
const AUDIO_MANIFEST_PATH = path.join(AUDIO_DIR, 'fr_lesson_audio_manifest_v1.json');
const AUDIO_GATE_PATH = path.join(AUDIO_DIR, 'fr_lesson_audio_manifest_gate_audit_v1.json');
const AUDIO_CHECKSUM_GATE_PATH = path.join(AUDIO_DIR, 'fr_lesson_audio_checksum_gate_audit_v1.json');
const SERVER_MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson_server_pack_manifest_v1.json');
const SERVER_GATE_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson_server_pack_manifest_gate_audit_v1.json');

const COURSE_PACK_SCHEMA_VERSION = 'course-pack-v1';
const EXPECTED_ROWS = 1600;
const SOURCE_LOCALES = ['ru', 'uk'];
const CONTENT_VERSION = 'fr-lessons-core32-v1.pending';
const ZERO_SHA = '0'.repeat(64);

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

function buildCoursePackEntry(sourceLocale, surface, entryIndex, blocker) {
  return {
    packId: `fr.${sourceLocale}.${surface}.lessons_core32_v1_pending`,
    studyTarget: 'fr',
    sourceLocale,
    surface,
    schemaVersion: COURSE_PACK_SCHEMA_VERSION,
    contentVersion: CONTENT_VERSION,
    minAppVersion: 'blocked_until_runtime_delivery_gate',
    sha256: ZERO_SHA,
    byteSize: 1,
    createdAt: '',
    dependencies: [],
    entryIndex,
    serverPath: `course-packs/fr/${sourceLocale}/${surface}/${CONTENT_VERSION}/${ZERO_SHA}.json`,
    serverUploadAllowed: false,
    firebaseUploadAllowed: false,
    downloadablePacksPublished: false,
    runtimeDownloadsEnabled: false,
    activationApproved: false,
    blockers: [blocker],
  };
}

function buildEntries(readyForServerPackManifest) {
  const blocker = readyForServerPackManifest
    ? 'blocked_pending_payload_materialization_and_checksum'
    : 'blocked_pending_llm_review_audio_tts_and_checksum';
  return SOURCE_LOCALES.flatMap((sourceLocale) => [
    buildCoursePackEntry(sourceLocale, 'lesson', `lessons/${sourceLocale}/index.json`, blocker),
    buildCoursePackEntry(sourceLocale, 'audio_metadata', `audio/${sourceLocale}/index.json`, blocker),
  ]);
}

function validateEntries(entries) {
  const problems = [];
  for (const entry of entries) {
    if (entry.studyTarget !== 'fr') problems.push(`${entry.packId}: studyTarget must be fr`);
    if (!SOURCE_LOCALES.includes(entry.sourceLocale)) problems.push(`${entry.packId}: sourceLocale must be ru|uk`);
    if (!entry.packId.startsWith(`fr.${entry.sourceLocale}.${entry.surface}.`)) problems.push(`${entry.packId}: packId identity mismatch`);
    if (!entry.serverPath.startsWith(`course-packs/fr/${entry.sourceLocale}/${entry.surface}/`)) {
      problems.push(`${entry.packId}: serverPath must be source-locale scoped`);
    }
    if (entry.serverPath.includes('uiLocale') || entry.serverPath.includes('sourceLocale') || entry.serverPath.includes('..')) {
      problems.push(`${entry.packId}: forbidden serverPath token`);
    }
    if (
      entry.serverUploadAllowed ||
      entry.firebaseUploadAllowed ||
      entry.downloadablePacksPublished ||
      entry.runtimeDownloadsEnabled ||
      entry.activationApproved
    ) {
      problems.push(`${entry.packId}: production flags must remain false`);
    }
  }
  return problems;
}

function main() {
  const generatedAt = new Date().toISOString();
  const reviewQueue = readJson(REVIEW_QUEUE_PATH);
  const importDryRun = readJson(IMPORT_DRY_RUN_PATH);
  const audioManifest = readJson(AUDIO_MANIFEST_PATH);
  const audioGate = readJson(AUDIO_GATE_PATH);
  const audioChecksumGate = readJson(AUDIO_CHECKSUM_GATE_PATH);
  const blockers = [];
  const warnings = [];

  if (reviewQueue.schemaVersion !== 'gustav-fr-lesson-review-queue-v1') blockers.push('review queue schemaVersion mismatch');
  if (!Array.isArray(reviewQueue.rows) || reviewQueue.rows.length !== EXPECTED_ROWS) blockers.push(`expected ${EXPECTED_ROWS} review rows`);
  if (audioManifest.schemaVersion !== 'gustav-fr-lesson-audio-manifest-v1') blockers.push('audio manifest schemaVersion mismatch');
  if (!Array.isArray(audioManifest.slots) || audioManifest.slots.length !== EXPECTED_ROWS) blockers.push(`expected ${EXPECTED_ROWS} audio slots`);
  if (audioGate.schemaVersion !== 'gustav-fr-lesson-audio-manifest-gate-audit-v1') blockers.push('audio gate schemaVersion mismatch');
  if (audioChecksumGate.schemaVersion !== 'gustav-fr-lesson-audio-checksum-gate-audit-v1') blockers.push('audio checksum gate schemaVersion mismatch');
  if (importDryRun.schemaVersion !== 'gustav-fr-lesson-review-decision-import-dry-run-audit-v1') blockers.push('import dry-run schemaVersion mismatch');

  const allRowsAccepted = importDryRun.summary?.allRowsAccepted === true;
  const audioManifestReadyForServer = audioGate.summary?.readyForServerUpload === true;
  const audioChecksumReadyForServer = audioChecksumGate.summary?.readyForServerUpload === true;
  const checksumReadySlots = Number(audioChecksumGate.summary?.checksumReadySlots || 0);
  const audioReadyForServer = audioManifestReadyForServer && audioChecksumReadyForServer && checksumReadySlots === EXPECTED_ROWS;
  const readyForServerPackManifest = allRowsAccepted && audioReadyForServer;
  if (!allRowsAccepted) warnings.push('server pack manifest blocked until all 1600 lesson rows are accepted by LLM review/import dry-run');
  if (!audioManifestReadyForServer) warnings.push('server pack manifest blocked until audio manifest gate is ready for server upload');
  if (!audioChecksumReadyForServer || checksumReadySlots !== EXPECTED_ROWS) warnings.push('server pack manifest blocked until audio checksum gate has 1600 checksum-ready mp3 files');

  const entries = buildEntries(readyForServerPackManifest);
  const entryProblems = validateEntries(entries);
  blockers.push(...entryProblems);

  const manifest = {
    schemaVersion: 'gustav-fr-lesson-server-pack-manifest-v1',
    generatedAt,
    status: blockers.length > 0 ? 'BLOCK' : 'HOLD_PENDING_REVIEW_AUDIO_AND_PAYLOADS',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    coursePackSchemaVersion: COURSE_PACK_SCHEMA_VERSION,
    contentVersion: CONTENT_VERSION,
    activationApproved: false,
    sourceArtifacts: {
      reviewQueue: rel(REVIEW_QUEUE_PATH),
      reviewDecisionImportDryRun: rel(IMPORT_DRY_RUN_PATH),
      audioManifest: rel(AUDIO_MANIFEST_PATH),
      audioGate: rel(AUDIO_GATE_PATH),
      audioChecksumGate: rel(AUDIO_CHECKSUM_GATE_PATH),
    },
    serverDelivery: {
      manifestOnly: true,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      downloadablePacksPublished: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
    uploadPolicy: {
      allowedStoragePathPrefixes: ['course-packs/fr/ru/', 'course-packs/fr/uk/'],
      deniedStoragePathPrefixes: ['course-packs/en/', 'course-packs/fr/uiLocale/', 'course-packs/fr/sourceLocale/', 'course-packs/fr/*/../../'],
      requiresPayloadSha256: true,
      requiresPayloadBytes: true,
      requiresRollbackManifest: true,
      requiresRuntimeDeliveryGate: true,
      requiresExplicitActivationApproval: true,
    },
    entries,
  };
  writeJson(SERVER_MANIFEST_PATH, manifest);

  const audit = {
    schemaVersion: 'gustav-fr-lesson-server-pack-manifest-gate-audit-v1',
    generatedAt,
    status: blockers.length > 0 ? 'BLOCK' : 'HOLD',
    activationApproved: false,
    sourceArtifacts: {
      reviewQueue: rel(REVIEW_QUEUE_PATH),
      reviewDecisionImportDryRun: rel(IMPORT_DRY_RUN_PATH),
      audioManifest: rel(AUDIO_MANIFEST_PATH),
      audioGate: rel(AUDIO_GATE_PATH),
      audioChecksumGate: rel(AUDIO_CHECKSUM_GATE_PATH),
      serverManifest: rel(SERVER_MANIFEST_PATH),
    },
    hashes: {
      reviewQueueSha256: sha256(REVIEW_QUEUE_PATH),
      reviewDecisionImportDryRunSha256: sha256(IMPORT_DRY_RUN_PATH),
      audioManifestSha256: sha256(AUDIO_MANIFEST_PATH),
      audioGateSha256: sha256(AUDIO_GATE_PATH),
      audioChecksumGateSha256: sha256(AUDIO_CHECKSUM_GATE_PATH),
      serverManifestSha256: sha256(SERVER_MANIFEST_PATH),
    },
    summary: {
      reviewRows: reviewQueue.rows?.length || 0,
      allRowsAccepted,
      audioSlots: audioManifest.slots?.length || 0,
      audioManifestReadyForServerUpload: audioManifestReadyForServer,
      audioChecksumReadyForServerUpload: audioChecksumReadyForServer,
      audioChecksumReadySlots: checksumReadySlots,
      audioChecksumMissingFiles: Number(audioChecksumGate.summary?.missingAudioFiles || 0),
      audioReadyForServerUpload: audioReadyForServer,
      serverManifestEntries: entries.length,
      sourceLocaleScopedEntries: entries.filter((entry) => entry.serverPath.startsWith(`course-packs/fr/${entry.sourceLocale}/`)).length,
      ruEntries: entries.filter((entry) => entry.sourceLocale === 'ru').length,
      ukEntries: entries.filter((entry) => entry.sourceLocale === 'uk').length,
      serverUploadAllowedEntries: entries.filter((entry) => entry.serverUploadAllowed).length,
      firebaseUploadAllowedEntries: entries.filter((entry) => entry.firebaseUploadAllowed).length,
      downloadablePublishedEntries: entries.filter((entry) => entry.downloadablePacksPublished).length,
      runtimeDownloadsEnabledEntries: entries.filter((entry) => entry.runtimeDownloadsEnabled).length,
      activationApprovedEntries: entries.filter((entry) => entry.activationApproved).length,
      readyForServerPackManifest: blockers.length === 0 && readyForServerPackManifest,
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
      'server_payload_materialization_gate',
      'server_pack_upload_policy_gate',
      'runtime_delivery_gate',
      'admin_parity_gate',
      'storage_cloud_isolation_gate',
      'rollback_gate',
      'explicit_activation_approval_gate',
    ],
  };
  writeJson(SERVER_GATE_AUDIT_PATH, audit);

  console.log(`Gustav French lesson server pack manifest gate: ${audit.status}`);
  console.log(`Server manifest entries: ${entries.length}`);
  console.log(`Source-scoped entries: ${audit.summary.sourceLocaleScopedEntries}/${entries.length}`);
  console.log(`Ready for server upload: no`);
  console.log(`Ready for apply: no`);
  console.log(rel(SERVER_GATE_AUDIT_PATH));

  if (blockers.length > 0) process.exitCode = 1;
}

main();
