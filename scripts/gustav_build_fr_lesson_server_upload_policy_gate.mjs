import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server');
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio');
const ADMIN_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'admin');

const SERVER_MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson_server_pack_manifest_v1.json');
const SERVER_MANIFEST_GATE_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson_server_pack_manifest_gate_audit_v1.json');
const AUDIO_CHECKSUM_GATE_AUDIT_PATH = path.join(AUDIO_DIR, 'fr_lesson_audio_checksum_gate_audit_v1.json');
const ACTIVATION_ROLLBACK_GATE_AUDIT_PATH = path.join(ADMIN_DIR, 'fr_admin_activation_rollback_gate_audit_v1.json');
const POLICY_PATH = path.join(SERVER_DIR, 'fr_lesson_server_upload_policy_gate_v1.json');
const AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson_server_upload_policy_gate_audit_v1.json');

const EXPECTED_AUDIO_SLOTS = 1600;
const SOURCE_LOCALES = ['ru', 'uk'];
const ALLOWED_UPLOAD_PREFIXES = ['course-packs/fr/ru/', 'course-packs/fr/uk/'];
const DENIED_UPLOAD_PREFIXES = [
  'course-packs/en/',
  'course-packs/fr/uiLocale/',
  'course-packs/fr/sourceLocale/',
  'course-packs/fr/../',
  'course-packs/fr/ru/../',
  'course-packs/fr/uk/../',
  'card_packs/',
  'community_packs/',
];
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

function hasDeniedPathToken(serverPath) {
  return (
    serverPath.includes('course-packs/en/') ||
    serverPath.includes('uiLocale') ||
    serverPath.includes('sourceLocale') ||
    serverPath.includes('..') ||
    serverPath.startsWith('card_packs/') ||
    serverPath.startsWith('community_packs/')
  );
}

function inspectEntry(entry) {
  const expectedPrefix = `course-packs/fr/${entry.sourceLocale}/${entry.surface}/`;
  const sourceLocaleScoped = SOURCE_LOCALES.includes(entry.sourceLocale) && entry.serverPath.startsWith(expectedPrefix);
  const allowedPrefix = ALLOWED_UPLOAD_PREFIXES.find((prefix) => entry.serverPath.startsWith(prefix)) || '';
  const deniedPathToken = hasDeniedPathToken(entry.serverPath);
  const zeroSha = entry.sha256 === ZERO_SHA;
  const shaLooksReal = /^[a-f0-9]{64}$/.test(entry.sha256 || '') && !zeroSha;
  const byteSizeLooksReal = Number(entry.byteSize || 0) > 1;
  const productionFlagsClosed =
    entry.serverUploadAllowed === false &&
    entry.firebaseUploadAllowed === false &&
    entry.downloadablePacksPublished === false &&
    entry.runtimeDownloadsEnabled === false &&
    entry.activationApproved === false;

  return {
    packId: entry.packId,
    studyTarget: entry.studyTarget,
    sourceLocale: entry.sourceLocale,
    surface: entry.surface,
    serverPath: entry.serverPath,
    expectedPrefix,
    allowedPrefix,
    sourceLocaleScoped,
    deniedPathToken,
    traversalHit: entry.serverPath.includes('..'),
    zeroSha,
    shaLooksReal,
    byteSizeLooksReal,
    productionFlagsClosed,
    uploadTargetValid: entry.studyTarget === 'fr' && sourceLocaleScoped && Boolean(allowedPrefix) && !deniedPathToken,
    payloadMaterialized: shaLooksReal && byteSizeLooksReal,
  };
}

function main() {
  const generatedAt = new Date().toISOString();
  const serverManifest = readJson(SERVER_MANIFEST_PATH);
  const serverManifestGateAudit = readJson(SERVER_MANIFEST_GATE_AUDIT_PATH);
  const audioChecksumGateAudit = readJson(AUDIO_CHECKSUM_GATE_AUDIT_PATH);
  const activationRollbackGateAudit = readJson(ACTIVATION_ROLLBACK_GATE_AUDIT_PATH);

  const structuralBlockers = [];
  if (serverManifest.schemaVersion !== 'gustav-fr-lesson-server-pack-manifest-v1') {
    structuralBlockers.push('SERVER_MANIFEST_SCHEMA_MISMATCH');
  }
  if (serverManifestGateAudit.schemaVersion !== 'gustav-fr-lesson-server-pack-manifest-gate-audit-v1') {
    structuralBlockers.push('SERVER_MANIFEST_GATE_AUDIT_SCHEMA_MISMATCH');
  }
  if (audioChecksumGateAudit.schemaVersion !== 'gustav-fr-lesson-audio-checksum-gate-audit-v1') {
    structuralBlockers.push('AUDIO_CHECKSUM_GATE_AUDIT_SCHEMA_MISMATCH');
  }
  if (activationRollbackGateAudit.schemaVersion !== 'gustav-fr-admin-activation-rollback-gate-audit-v1') {
    structuralBlockers.push('ACTIVATION_ROLLBACK_GATE_AUDIT_SCHEMA_MISMATCH');
  }
  if (serverManifest.studyTarget !== 'fr') structuralBlockers.push('SERVER_MANIFEST_STUDY_TARGET_NOT_FR');
  if (serverManifest.activationApproved !== false) structuralBlockers.push('SERVER_MANIFEST_ACTIVATION_MUST_REMAIN_FALSE');

  const entries = Array.isArray(serverManifest.entries) ? serverManifest.entries : [];
  const entryInspections = entries.map(inspectEntry);
  for (const inspection of entryInspections) {
    if (!inspection.uploadTargetValid) structuralBlockers.push(`UPLOAD_TARGET_INVALID:${inspection.packId}`);
    if (!inspection.productionFlagsClosed) structuralBlockers.push(`PRODUCTION_FLAGS_OPEN:${inspection.packId}`);
  }

  const serverManifestReadyForUpload = serverManifestGateAudit.summary?.readyForServerUpload === true;
  const checksumReadySlots = Number(audioChecksumGateAudit.summary?.checksumReadySlots || 0);
  const audioChecksumReadyForUpload =
    audioChecksumGateAudit.summary?.readyForServerUpload === true &&
    checksumReadySlots === EXPECTED_AUDIO_SLOTS;
  const activationRollbackReady =
    activationRollbackGateAudit.summary?.activeApprovalReceiptExists === true &&
    activationRollbackGateAudit.summary?.activeHashLockManifestExists === true &&
    activationRollbackGateAudit.summary?.readyForApply === true;
  const payloadsMaterialized = entryInspections.length > 0 && entryInspections.every((entry) => entry.payloadMaterialized);
  const currentProductionFlagsClosed =
    serverManifest.serverDelivery?.serverUploadAllowed === false &&
    serverManifest.serverDelivery?.firebaseUploadAllowed === false &&
    serverManifest.serverDelivery?.runtimeDownloadsEnabled === false &&
    serverManifest.serverDelivery?.productionApplyApproved === false &&
    entries.every((entry) =>
      entry.serverUploadAllowed === false &&
      entry.firebaseUploadAllowed === false &&
      entry.runtimeDownloadsEnabled === false &&
      entry.activationApproved === false
    );

  const productionBlockers = [];
  if (!serverManifestReadyForUpload) productionBlockers.push('SERVER_MANIFEST_GATE_NOT_READY_FOR_UPLOAD');
  if (!audioChecksumReadyForUpload) productionBlockers.push('AUDIO_CHECKSUM_GATE_NOT_READY');
  if (!payloadsMaterialized) productionBlockers.push('SERVER_PAYLOADS_NOT_MATERIALIZED_WITH_REAL_SHA_AND_BYTES');
  if (!activationRollbackReady) productionBlockers.push('ROLLBACK_OR_HASH_LOCKS_NOT_READY');
  productionBlockers.push('UPLOAD_EXECUTION_CLOSED');

  const uploadExecutionAllowed =
    structuralBlockers.length === 0 &&
    serverManifestReadyForUpload &&
    audioChecksumReadyForUpload &&
    payloadsMaterialized &&
    activationRollbackReady &&
    false;

  const summary = {
    serverManifestEntries: entries.length,
    sourceLocaleScopedEntries: entryInspections.filter((entry) => entry.sourceLocaleScoped).length,
    allowedUploadTargetEntries: entryInspections.filter((entry) => entry.uploadTargetValid).length,
    deniedUploadTargetHits: entryInspections.filter((entry) => entry.deniedPathToken).length,
    traversalHits: entryInspections.filter((entry) => entry.traversalHit).length,
    zeroShaEntries: entryInspections.filter((entry) => entry.zeroSha).length,
    materializedPayloadEntries: entryInspections.filter((entry) => entry.payloadMaterialized).length,
    checksumReadySlots,
    expectedAudioSlots: EXPECTED_AUDIO_SLOTS,
    serverManifestReadyForUpload,
    audioChecksumReadyForUpload,
    activationRollbackReady,
    payloadsMaterialized,
    currentProductionFlagsClosed,
    uploadExecutionAllowed,
    firebaseUploadAllowed: false,
    runtimeDownloadsEnabled: false,
    activationApproved: false,
    readyForRuntimeDelivery: false,
    readyForApply: false,
    structuralBlockers: structuralBlockers.length,
    productionBlockers: productionBlockers.length,
  };

  const policy = {
    schemaVersion: 'gustav-fr-lesson-server-upload-policy-gate-v1',
    generatedAt,
    status: structuralBlockers.length > 0 ? 'BLOCK' : 'HOLD_UPLOAD_EXECUTION_CLOSED',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    activationApproved: false,
    sourceArtifacts: {
      serverManifest: rel(SERVER_MANIFEST_PATH),
      serverManifestGateAudit: rel(SERVER_MANIFEST_GATE_AUDIT_PATH),
      audioChecksumGateAudit: rel(AUDIO_CHECKSUM_GATE_AUDIT_PATH),
      activationRollbackGateAudit: rel(ACTIVATION_ROLLBACK_GATE_AUDIT_PATH),
    },
    allowedUploadPrefixes: ALLOWED_UPLOAD_PREFIXES,
    deniedUploadPrefixes: DENIED_UPLOAD_PREFIXES,
    requiredBeforeUpload: [
      'all 1600 French lesson rows accepted by LLM official-source review/import dry-run',
      'audio checksum gate has 1600 checksum-ready mp3 files',
      'server payloads are materialized with non-zero sha256 and byteSize > 1',
      'server paths are scoped to course-packs/fr/{sourceLocale}/{surface}/',
      'active explicit approval receipt exists',
      'active hash lock manifest exists',
      'rollback scopes are exactly course-packs/fr/ru/ and course-packs/fr/uk/',
    ],
    entryInspections,
    summary,
    productionBlockers,
    safety: {
      readOnly: true,
      serverUploadStartedByThisScript: false,
      firebaseUploadStartedByThisScript: false,
      serverManifestModifiedByThisScript: false,
      audioFilesGeneratedByThisScript: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };
  writeJson(POLICY_PATH, policy);

  const audit = {
    schemaVersion: 'gustav-fr-lesson-server-upload-policy-gate-audit-v1',
    generatedAt,
    status: structuralBlockers.length > 0 ? 'BLOCK' : 'HOLD',
    activationApproved: false,
    sourceArtifacts: policy.sourceArtifacts,
    hashes: {
      serverManifestSha256: sha256(SERVER_MANIFEST_PATH),
      serverManifestGateAuditSha256: sha256(SERVER_MANIFEST_GATE_AUDIT_PATH),
      audioChecksumGateAuditSha256: sha256(AUDIO_CHECKSUM_GATE_AUDIT_PATH),
      activationRollbackGateAuditSha256: sha256(ACTIVATION_ROLLBACK_GATE_AUDIT_PATH),
      uploadPolicySha256: sha256(POLICY_PATH),
    },
    summary,
    structuralBlockers,
    productionBlockers,
    safety: policy.safety,
    nextRequiredGates: [
      'complete_llm_official_source_review_decisions',
      'review_decision_import_dry_run_gate',
      'audio_tts_generation_gate',
      'audio_checksum_gate',
      'server_payload_materialization_gate',
      'activation_hash_lock_and_rollback_gate',
      'runtime_delivery_gate',
      'explicit_activation_approval_gate',
    ],
  };
  writeJson(AUDIT_PATH, audit);

  console.log(`Gustav French lesson server upload policy gate: ${audit.status}`);
  console.log(`Upload targets valid: ${summary.allowedUploadTargetEntries}/${summary.serverManifestEntries}`);
  console.log(`Denied/traversal hits: ${summary.deniedUploadTargetHits}/${summary.traversalHits}`);
  console.log(`Checksum-ready audio slots: ${summary.checksumReadySlots}/${summary.expectedAudioSlots}`);
  console.log(`Upload execution allowed: ${summary.uploadExecutionAllowed}`);
  console.log(rel(AUDIT_PATH));

  if (structuralBlockers.length > 0) process.exitCode = 1;
}

main();
