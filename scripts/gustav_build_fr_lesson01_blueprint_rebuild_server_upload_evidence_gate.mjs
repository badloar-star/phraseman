import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'lesson01_blueprint_rebuild');
const RUNTIME_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', 'lesson01_blueprint_rebuild');
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'lesson01_blueprint_rebuild');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

const SERVER_MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_server_pack_manifest_v1.json');
const PAYLOAD_HASH_LOCK_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json');
const ROLLBACK_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_rollback_manifest_gate_audit_v1.json');
const RUNTIME_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson01_blueprint_rebuild_runtime_delivery_gate_audit_v1.json');
const AUDIO_AUDIT_PATH = path.join(AUDIO_DIR, 'fr_lesson01_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json');
const EXPECTED_UPLOAD_EVIDENCE_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_server_upload_evidence_v1.json');
const GATE_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_server_upload_evidence_gate_v1.json');
const AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json');
const MD_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_server_upload_evidence_gate_v1.md');

const SOURCE_LOCALES = ['ru', 'uk'];
const DENIED_REMOTE_PATH_TOKENS = ['course-packs/en/', 'uiLocale', 'sourceLocale', '..', 'card_packs/', 'community_packs/'];

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

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function maybeSha256File(filePath) {
  return fs.existsSync(filePath) ? sha256File(filePath) : '';
}

function inspectUploadEvidence(entry, evidenceByPackId) {
  const evidence = evidenceByPackId.get(entry.packId);
  const expectedRemotePathPrefix = `course-packs/fr/${entry.sourceLocale}/${entry.surface}/lesson01_blueprint_rebuild/`;
  const evidenceRemotePath = evidence?.remotePath || '';
  const remotePathSourceScoped = evidenceRemotePath.startsWith(expectedRemotePathPrefix);
  const remotePathDenied = DENIED_REMOTE_PATH_TOKENS.some((token) => evidenceRemotePath.includes(token));
  const remoteShaMatches = evidence?.sha256 === entry.localArtifactSha256 && /^[a-f0-9]{64}$/.test(entry.localArtifactSha256 || '');
  const remoteByteSizeMatches = Number(evidence?.byteSize || 0) === Number(entry.localArtifactByteSize || 0) && entry.localArtifactByteSize > 0;
  const uploadReceiptValid = typeof evidence?.uploadReceiptId === 'string' && evidence.uploadReceiptId.startsWith('fr-lesson01-upload-');
  const rollbackHashLockIdValid =
    typeof evidence?.rollbackHashLockId === 'string' &&
    evidence.rollbackHashLockId === `fr.lesson01.blueprint_rebuild.${entry.sourceLocale}.${entry.surface}.hash_lock.v1`;
  const activationApprovedFalse = evidence?.activationApproved === false;
  const accepted = Boolean(evidence) &&
    entry.studyTarget === 'fr' &&
    entry.targetContentLang === 'fr' &&
    SOURCE_LOCALES.includes(entry.sourceLocale) &&
    remotePathSourceScoped &&
    !remotePathDenied &&
    remoteShaMatches &&
    remoteByteSizeMatches &&
    uploadReceiptValid &&
    rollbackHashLockIdValid &&
    activationApprovedFalse;

  return {
    entryId: entry.entryId,
    packId: entry.packId,
    studyTarget: entry.studyTarget,
    targetContentLang: entry.targetContentLang,
    sourceLocale: entry.sourceLocale,
    surface: entry.surface,
    expectedRemotePathPrefix,
    expectedSha256: entry.localArtifactSha256,
    expectedByteSize: entry.localArtifactByteSize,
    evidencePresent: Boolean(evidence),
    evidenceRemotePath,
    remotePathSourceScoped,
    remotePathDenied,
    remoteShaMatches,
    remoteByteSizeMatches,
    uploadReceiptValid,
    rollbackHashLockIdValid,
    activationApprovedFalse,
    accepted,
    errors: [
      ...(evidence ? [] : ['upload evidence missing']),
      ...(remotePathSourceScoped ? [] : ['remote path is not lesson01 sourceLocale scoped']),
      ...(!remotePathDenied ? [] : ['remote path contains denied token']),
      ...(remoteShaMatches ? [] : ['remote sha does not match local artifact hash']),
      ...(remoteByteSizeMatches ? [] : ['remote byteSize does not match local artifact byteSize']),
      ...(uploadReceiptValid ? [] : ['upload receipt missing or invalid']),
      ...(rollbackHashLockIdValid ? [] : ['rollback hash-lock id missing or invalid']),
      ...(activationApprovedFalse ? [] : ['activationApproved must remain false in upload evidence']),
    ],
  };
}

function markdownFor(audit) {
  const lines = [
    '# French Lesson 1 Blueprint Rebuild Server Upload Evidence Gate',
    '',
    `Status: ${audit.status}`,
    `Expected objects: ${audit.summary.expectedObjects}`,
    `Accepted objects: ${audit.summary.acceptedObjects}`,
    `Evidence file exists: ${audit.summary.uploadEvidenceFileExists}`,
    '',
    '## Current Hold',
    '',
    ...audit.blockers.map((blocker) => `- ${blocker}`),
    '',
    '## Safety',
    '',
    `- firebaseOrServerUploadStarted: ${audit.safety.firebaseOrServerUploadStarted}`,
    `- uploadEvidenceWrittenByThisScript: ${audit.safety.uploadEvidenceWrittenByThisScript}`,
    `- runtimeDownloadsEnabled: ${audit.safety.runtimeDownloadsEnabled}`,
    `- activationApproved: ${audit.safety.activationApproved}`,
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function main() {
  const generatedAt = new Date().toISOString();
  const serverManifest = readJson(SERVER_MANIFEST_PATH);
  const payloadAudit = readJson(PAYLOAD_HASH_LOCK_AUDIT_PATH);
  const rollbackAudit = readJson(ROLLBACK_AUDIT_PATH);
  const runtimeAudit = readJson(RUNTIME_AUDIT_PATH);
  const audioAudit = readJson(AUDIO_AUDIT_PATH);
  const evidenceExists = fs.existsSync(EXPECTED_UPLOAD_EVIDENCE_PATH);
  const evidence = evidenceExists ? readJson(EXPECTED_UPLOAD_EVIDENCE_PATH) : null;
  const blockers = [];

  if (serverManifest.schemaVersion !== 'gustav-fr-lesson01-blueprint-rebuild-server-pack-manifest-v1') blockers.push('SERVER_MANIFEST_SCHEMA_MISMATCH');
  if (payloadAudit.status !== 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED') blockers.push('PAYLOAD_HASH_LOCK_GATE_NOT_HOLD');
  if (rollbackAudit.status !== 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED') blockers.push('ROLLBACK_MANIFEST_GATE_NOT_HOLD');
  if (runtimeAudit.status !== 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED') blockers.push('RUNTIME_GATE_NOT_HOLD');
  if (audioAudit.status !== 'HOLD_AUDIO_TTS_NOT_GENERATED') blockers.push('AUDIO_TTS_GATE_NOT_HOLD');
  if (evidence && evidence.schemaVersion !== 'gustav-fr-lesson01-blueprint-rebuild-server-upload-evidence-v1') blockers.push('UPLOAD_EVIDENCE_SCHEMA_MISMATCH');

  const entries = Array.isArray(serverManifest.entries) ? serverManifest.entries : [];
  if (entries.length !== 4) blockers.push('EXPECTED_4_SERVER_MANIFEST_ENTRIES');
  const evidenceByPackId = new Map((evidence?.objects || []).map((item) => [item.packId, item]));
  const objectEvidenceInspections = entries.map((entry) => inspectUploadEvidence(entry, evidenceByPackId));

  const payloadHashLockReady = payloadAudit.summary?.hashLockManifestReady === true;
  const rollbackReady = rollbackAudit.summary?.readyForRollbackExecution === true;
  const runtimeReady = runtimeAudit.summary?.readyForRuntimeDelivery === true;
  const audioChecksumReady = Number(audioAudit.summary?.checksumReadySlots || 0) === Number(audioAudit.summary?.audioSlots || 100) &&
    Number(audioAudit.summary?.checksumReadySlots || 0) > 0;
  const allObjectsAccepted = objectEvidenceInspections.length > 0 && objectEvidenceInspections.every((item) => item.accepted);
  const uploadEvidenceReady = evidenceExists && allObjectsAccepted && payloadHashLockReady && rollbackReady && audioChecksumReady;

  const summary = {
    expectedObjects: entries.length,
    uploadEvidenceFileExists: evidenceExists,
    uploadEvidenceSchemaValid: evidence?.schemaVersion === 'gustav-fr-lesson01-blueprint-rebuild-server-upload-evidence-v1',
    evidenceObjects: evidence?.objects?.length || 0,
    acceptedObjects: objectEvidenceInspections.filter((item) => item.accepted).length,
    missingEvidenceObjects: objectEvidenceInspections.filter((item) => !item.evidencePresent).length,
    sourceLocaleScopedRemoteObjects: objectEvidenceInspections.filter((item) => item.remotePathSourceScoped).length,
    deniedRemotePathHits: objectEvidenceInspections.filter((item) => item.remotePathDenied).length,
    shaMatchedObjects: objectEvidenceInspections.filter((item) => item.remoteShaMatches).length,
    byteSizeMatchedObjects: objectEvidenceInspections.filter((item) => item.remoteByteSizeMatches).length,
    uploadReceiptValidObjects: objectEvidenceInspections.filter((item) => item.uploadReceiptValid).length,
    rollbackHashLockValidObjects: objectEvidenceInspections.filter((item) => item.rollbackHashLockIdValid).length,
    payloadHashLockReady,
    rollbackReady,
    audioChecksumReady,
    runtimeReadyBeforeEvidence: runtimeReady,
    uploadEvidenceReady,
    runtimeDeliveryMayOpen: false,
    runtimeDownloadsEnabled: false,
    activationApproved: false,
    readyForRuntimeDelivery: false,
    readyForApply: false,
  };

  const gate = {
    schemaVersion: 'gustav-fr-lesson01-blueprint-rebuild-server-upload-evidence-gate-v1',
    generatedAt,
    status: blockers.length === 0 ? 'HOLD_UPLOAD_EVIDENCE_MISSING' : 'BLOCK_UPLOAD_EVIDENCE_GATE_INVALID',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: 1,
    sourceArtifacts: {
      serverManifest: rel(SERVER_MANIFEST_PATH),
      payloadHashLockGateAudit: rel(PAYLOAD_HASH_LOCK_AUDIT_PATH),
      rollbackManifestGateAudit: rel(ROLLBACK_AUDIT_PATH),
      runtimeDeliveryGateAudit: rel(RUNTIME_AUDIT_PATH),
      audioTtsManifestGateAudit: rel(AUDIO_AUDIT_PATH),
      expectedUploadEvidence: rel(EXPECTED_UPLOAD_EVIDENCE_PATH),
    },
    requiredEvidenceContract: {
      expectedUploadEvidence: rel(EXPECTED_UPLOAD_EVIDENCE_PATH),
      expectedSchemaVersion: 'gustav-fr-lesson01-blueprint-rebuild-server-upload-evidence-v1',
      remoteObjectPathsMustStartWith: ['course-packs/fr/ru/', 'course-packs/fr/uk/'],
      deniedRemotePathTokens: DENIED_REMOTE_PATH_TOKENS,
      requiresPayloadHashLockReady: true,
      requiresRollbackReady: true,
      requiresAudioChecksums: true,
      requiresRemoteShaMatch: true,
      requiresRemoteByteSizeMatch: true,
      requiresUploadReceiptId: true,
      requiresRollbackHashLockId: true,
      requiresActivationApprovedFalse: true,
      mayOpenRuntimeDelivery: false,
    },
    objectEvidenceInspections,
    summary,
    productionBlockers: [
      'UPLOAD_EVIDENCE_FILE_MISSING',
      'UPLOAD_OBJECT_EVIDENCE_INCOMPLETE_OR_INVALID',
      'PAYLOAD_HASH_LOCK_NOT_READY',
      'ROLLBACK_EXECUTION_NOT_READY',
      'AUDIO_CHECKSUMS_NOT_READY',
      'RUNTIME_DELIVERY_CLOSED_UNTIL_UPLOAD_EVIDENCE_PASS',
      'FULL_32_LESSON_PARITY_NOT_DONE',
    ],
    safety: {
      readOnly: true,
      firebaseOrServerUploadStarted: false,
      uploadEvidenceWrittenByThisScript: false,
      runtimeIndexModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };
  writeJson(GATE_PATH, gate);

  const audit = {
    schemaVersion: 'gustav-fr-lesson01-blueprint-rebuild-server-upload-evidence-gate-audit-v1',
    generatedAt,
    status: gate.status,
    blockers: blockers.length === 0 ? ['blocked_pending_payload_hash_lock_audio_upload_evidence'] : blockers,
    sourceArtifacts: gate.sourceArtifacts,
    hashes: {
      serverManifestSha256: sha256File(SERVER_MANIFEST_PATH),
      payloadHashLockGateAuditSha256: sha256File(PAYLOAD_HASH_LOCK_AUDIT_PATH),
      rollbackManifestGateAuditSha256: sha256File(ROLLBACK_AUDIT_PATH),
      runtimeDeliveryGateAuditSha256: sha256File(RUNTIME_AUDIT_PATH),
      audioTtsManifestGateAuditSha256: sha256File(AUDIO_AUDIT_PATH),
      uploadEvidenceSha256: maybeSha256File(EXPECTED_UPLOAD_EVIDENCE_PATH),
      gateSha256: sha256File(GATE_PATH),
    },
    summary,
    productionBlockers: gate.productionBlockers,
    safety: gate.safety,
    nextRequiredGates: [
      'audio_checksum_gate',
      'payload_materialization_execution_gate',
      'hash_lock_manifest_materialization_gate',
      'server_upload_execution_and_evidence_import_gate',
      'runtime_delivery_apply_gate',
      'explicit_activation_approval_gate',
    ],
  };
  writeJson(AUDIT_PATH, audit);
  fs.writeFileSync(MD_PATH, markdownFor(audit), 'utf8');

  if (fs.existsSync(STATE_PATH)) {
    const state = readJson(STATE_PATH);
    state.lesson01BlueprintRebuildServerUploadEvidenceGate = rel(GATE_PATH);
    state.lesson01BlueprintRebuildServerUploadEvidenceGateAudit = rel(AUDIT_PATH);
    state.lesson01BlueprintRebuildServerUploadEvidenceStatus = audit.status;
    state.lesson01BlueprintRebuildServerUploadEvidenceSummary = audit.summary;
    state.nextPassPlan = [
      'Create Lesson 1 runtime cache integrity gate tied to rollback/upload evidence.',
      'Create Lesson 1 explicit activation receipt schema gate that remains closed.',
      'Then start Lesson 2 blueprint-first rebuild using Lesson 1 gates as template.',
    ];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`${audit.status} accepted=${summary.acceptedObjects}/${summary.expectedObjects} evidence=${summary.uploadEvidenceFileExists} runtime=false activation=false blockers=${blockers.length}`);
  if (audit.status === 'BLOCK_UPLOAD_EVIDENCE_GATE_INVALID') process.exitCode = 1;
}

main();
