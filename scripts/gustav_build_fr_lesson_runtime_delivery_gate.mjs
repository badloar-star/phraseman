import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server');
const RUNTIME_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime');

const SERVER_MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson_server_pack_manifest_v1.json');
const SERVER_GATE_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson_server_pack_manifest_gate_audit_v1.json');
const SERVER_UPLOAD_EVIDENCE_GATE_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson_server_upload_evidence_gate_audit_v1.json');
const COURSE_PACK_LOADER_PATH = path.join(ROOT, 'app', 'course_pack_loader.ts');
const COURSE_PACK_INDEX_PATH = path.join(ROOT, 'app', 'course_pack_index.ts');
const STUDY_TARGET_PATH = path.join(ROOT, 'app', 'study_target.ts');
const RUNTIME_GATE_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson_runtime_delivery_gate_audit_v1.json');

const EXPECTED_SERVER_ENTRIES = 4;
const EXPECTED_RUNTIME_SURFACES = ['lesson', 'audio_metadata'];
const SOURCE_LOCALES = ['ru', 'uk'];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
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

function hasRuntimeNetworkAccess(loaderSource) {
  return /fetch\s*\(|XMLHttpRequest|firebase|firestore|storage\s*\(|expo-file-system|AsyncStorage/i.test(loaderSource);
}

function main() {
  const generatedAt = new Date().toISOString();
  const serverManifest = readJson(SERVER_MANIFEST_PATH);
  const serverGate = readJson(SERVER_GATE_AUDIT_PATH);
  const uploadEvidenceGate = readJson(SERVER_UPLOAD_EVIDENCE_GATE_AUDIT_PATH);
  const loaderSource = readText(COURSE_PACK_LOADER_PATH);
  const indexSource = readText(COURSE_PACK_INDEX_PATH);
  const studyTargetSource = readText(STUDY_TARGET_PATH);
  const blockers = [];
  const warnings = [];

  if (serverManifest.schemaVersion !== 'gustav-fr-lesson-server-pack-manifest-v1') blockers.push('server manifest schemaVersion mismatch');
  if (serverGate.schemaVersion !== 'gustav-fr-lesson-server-pack-manifest-gate-audit-v1') blockers.push('server gate schemaVersion mismatch');
  if (uploadEvidenceGate.schemaVersion !== 'gustav-fr-lesson-server-upload-evidence-gate-audit-v1') {
    blockers.push('server upload evidence gate schemaVersion mismatch');
  }
  if (!Array.isArray(serverManifest.entries) || serverManifest.entries.length !== EXPECTED_SERVER_ENTRIES) {
    blockers.push(`expected ${EXPECTED_SERVER_ENTRIES} server manifest entries`);
  }

  const legacyRemoteLoaderEnabled = /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*true/.test(loaderSource);
  const legacyRemoteLoaderDisabled = /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource);
  const embeddedIndexHasFrenchEntries = /studyTarget:\s*['"]fr['"]/.test(indexSource);
  const loaderHasNetworkAccess = hasRuntimeNetworkAccess(loaderSource);
  const productionStudyTargetHasFrench =
    /ProductionStudyTarget\s*=\s*[^;\n]*['"]fr['"]/.test(studyTargetSource) ||
    /PRODUCTION_STUDY_TARGETS[^\n]+['"]fr['"]/.test(studyTargetSource);

  if (legacyRemoteLoaderEnabled) blockers.push('legacy course pack remote loader is enabled');
  if (!legacyRemoteLoaderDisabled) warnings.push('could not prove COURSE_PACK_REMOTE_LOADING_ENABLED=false as const');
  if (embeddedIndexHasFrenchEntries) blockers.push('embedded course pack index contains French entries before activation');
  if (loaderHasNetworkAccess) blockers.push('legacy course pack loader contains direct network/storage access');
  if (productionStudyTargetHasFrench) warnings.push('study target source mentions French production activation; exact activation gate must still prove approval');
  if (serverGate.summary?.readyForRuntimeDelivery === true) {
    warnings.push('server gate claims runtime delivery ready; verify upload/audio gates before enabling runtime');
  }
  const uploadEvidenceReady = uploadEvidenceGate.summary?.uploadEvidenceReady === true;
  const uploadEvidenceAcceptedObjects = Number(uploadEvidenceGate.summary?.acceptedObjects || 0);
  const uploadEvidenceExpectedObjects = Number(uploadEvidenceGate.summary?.expectedObjects || 0);
  if (!uploadEvidenceReady) {
    warnings.push('runtime delivery blocked until server upload evidence gate PASS with accepted remote objects');
  }

  const readinessMatrix = SOURCE_LOCALES.flatMap((sourceLocale) =>
    EXPECTED_RUNTIME_SURFACES.map((surface) => ({
      studyTarget: 'fr',
      sourceLocale,
      surface,
      selectionConfirmed: true,
      expectedReadinessState: 'missing',
      expectedReadinessReason: 'no_index_entry',
      uploadEvidenceRequired: true,
      uploadEvidenceReady: false,
      runtimeEntryAllowedNow: false,
      cacheKeyAllowedNow: false,
      runtimeDownloadAllowedNow: false,
      activationApproved: false,
    })),
  );

  const openServerEntries = serverManifest.entries.filter((entry) =>
    entry.serverUploadAllowed ||
    entry.firebaseUploadAllowed ||
    entry.downloadablePacksPublished ||
    entry.runtimeDownloadsEnabled ||
    entry.activationApproved,
  ).length;
  if (openServerEntries > 0) blockers.push(`${openServerEntries} server manifest entries opened runtime/server/activation flags`);

  const audit = {
    schemaVersion: 'gustav-fr-lesson-runtime-delivery-gate-audit-v1',
    generatedAt,
    status: blockers.length > 0 ? 'BLOCK' : 'HOLD',
    activationApproved: false,
    sourceArtifacts: {
      serverManifest: rel(SERVER_MANIFEST_PATH),
      serverPackManifestGate: rel(SERVER_GATE_AUDIT_PATH),
      serverUploadEvidenceGate: rel(SERVER_UPLOAD_EVIDENCE_GATE_AUDIT_PATH),
      coursePackLoader: rel(COURSE_PACK_LOADER_PATH),
      coursePackIndex: rel(COURSE_PACK_INDEX_PATH),
      studyTarget: rel(STUDY_TARGET_PATH),
    },
    hashes: {
      serverManifestSha256: sha256(SERVER_MANIFEST_PATH),
      serverPackManifestGateSha256: sha256(SERVER_GATE_AUDIT_PATH),
      serverUploadEvidenceGateSha256: sha256(SERVER_UPLOAD_EVIDENCE_GATE_AUDIT_PATH),
      coursePackLoaderSha256: sha256(COURSE_PACK_LOADER_PATH),
      coursePackIndexSha256: sha256(COURSE_PACK_INDEX_PATH),
      studyTargetSha256: sha256(STUDY_TARGET_PATH),
    },
    summary: {
      serverManifestEntries: serverManifest.entries?.length || 0,
      openServerManifestEntries: openServerEntries,
      uploadEvidenceReady,
      uploadEvidenceAcceptedObjects,
      uploadEvidenceExpectedObjects,
      uploadEvidenceBlocksRuntimeDelivery: !uploadEvidenceReady,
      legacyRemoteLoaderDisabled,
      legacyRemoteLoaderEnabled,
      embeddedIndexHasFrenchEntries,
      loaderHasNetworkAccess,
      productionStudyTargetHasFrench,
      readinessRows: readinessMatrix.length,
      readinessRowsMissingNoIndexEntry: readinessMatrix.filter((row) => row.expectedReadinessReason === 'no_index_entry').length,
      readinessRowsRequiringUploadEvidence: readinessMatrix.filter((row) => row.uploadEvidenceRequired).length,
      readinessRowsWithUploadEvidenceReady: readinessMatrix.filter((row) => row.uploadEvidenceReady).length,
      runtimeEntryAllowedRows: readinessMatrix.filter((row) => row.runtimeEntryAllowedNow).length,
      cacheKeyAllowedRows: readinessMatrix.filter((row) => row.cacheKeyAllowedNow).length,
      runtimeDownloadAllowedRows: readinessMatrix.filter((row) => row.runtimeDownloadAllowedNow).length,
      activationApprovedRows: readinessMatrix.filter((row) => row.activationApproved).length,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      blockers: blockers.length,
      warnings: warnings.length,
    },
    readinessMatrix,
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
      'server_upload_evidence_gate',
      'runtime_delivery_gate',
      'admin_parity_gate',
      'storage_cloud_isolation_gate',
      'rollback_gate',
      'explicit_activation_approval_gate',
    ],
  };
  writeJson(RUNTIME_GATE_AUDIT_PATH, audit);

  console.log(`Gustav French lesson runtime delivery gate: ${audit.status}`);
  console.log(`Legacy remote loader disabled: ${legacyRemoteLoaderDisabled ? 'yes' : 'no'}`);
  console.log(`Embedded French index entries: ${embeddedIndexHasFrenchEntries ? 'yes' : 'no'}`);
  console.log(`Runtime readiness rows: ${readinessMatrix.length}`);
  console.log(`Ready for runtime delivery: no`);
  console.log(`Ready for apply: no`);
  console.log(rel(RUNTIME_GATE_AUDIT_PATH));

  if (blockers.length > 0) process.exitCode = 1;
}

main();
