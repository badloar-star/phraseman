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
const UPLOAD_POLICY_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson_server_upload_policy_gate_audit_v1.json');
const BOUNDARY_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson_manifest_writer_apply_boundary_gate_audit_v1.json');
const RUNTIME_DELIVERY_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson_runtime_delivery_gate_audit_v1.json');
const EXPECTED_UPLOAD_EVIDENCE_PATH = path.join(SERVER_DIR, 'fr_lesson_server_upload_evidence_v1.json');
const GATE_PATH = path.join(SERVER_DIR, 'fr_lesson_server_upload_evidence_gate_v1.json');
const AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson_server_upload_evidence_gate_audit_v1.json');

const SOURCE_LOCALES = ['ru', 'uk'];
const DENIED_REMOTE_PATH_TOKENS = ['course-packs/en/', 'uiLocale', 'sourceLocale', '..', 'card_packs/', 'community_packs/'];
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

function inspectUploadEvidence(entry, evidenceByPackId) {
  const evidence = evidenceByPackId.get(entry.packId);
  const expectedPrefix = `course-packs/fr/${entry.sourceLocale}/${entry.surface}/`;
  const expectedShaReal = /^[a-f0-9]{64}$/.test(entry.sha256 || '') && entry.sha256 !== ZERO_SHA;
  const expectedByteSizeReal = Number(entry.byteSize || 0) > 1;
  const evidenceRemotePath = evidence?.remotePath || '';
  const remotePathSourceScoped = evidenceRemotePath.startsWith(expectedPrefix);
  const remotePathDenied = DENIED_REMOTE_PATH_TOKENS.some((token) => evidenceRemotePath.includes(token));
  const remoteShaMatches = evidence?.sha256 === entry.sha256 && expectedShaReal;
  const remoteByteSizeMatches = Number(evidence?.byteSize || 0) === Number(entry.byteSize || 0) && expectedByteSizeReal;
  const uploadReceiptValid = typeof evidence?.uploadReceiptId === 'string' && evidence.uploadReceiptId.startsWith('fr-upload-');
  const rollbackHashLockIdValid = typeof evidence?.rollbackHashLockId === 'string' && evidence.rollbackHashLockId.startsWith(`fr.${entry.sourceLocale}.${entry.surface}.`);
  const accepted =
    Boolean(evidence) &&
    entry.studyTarget === 'fr' &&
    SOURCE_LOCALES.includes(entry.sourceLocale) &&
    remotePathSourceScoped &&
    !remotePathDenied &&
    remoteShaMatches &&
    remoteByteSizeMatches &&
    uploadReceiptValid &&
    rollbackHashLockIdValid &&
    evidence.activationApproved === false;

  return {
    packId: entry.packId,
    studyTarget: entry.studyTarget,
    sourceLocale: entry.sourceLocale,
    surface: entry.surface,
    expectedRemotePathPrefix: expectedPrefix,
    expectedSha256: entry.sha256,
    expectedByteSize: entry.byteSize,
    evidencePresent: Boolean(evidence),
    evidenceRemotePath,
    remotePathSourceScoped,
    remotePathDenied,
    remoteShaMatches,
    remoteByteSizeMatches,
    uploadReceiptValid,
    rollbackHashLockIdValid,
    activationApprovedFalse: evidence?.activationApproved === false,
    accepted,
    errors: [
      ...(evidence ? [] : ['upload evidence missing']),
      ...(remotePathSourceScoped ? [] : ['remote path is not sourceLocale scoped']),
      ...(!remotePathDenied ? [] : ['remote path contains denied token']),
      ...(remoteShaMatches ? [] : ['remote sha does not match manifest or manifest sha is placeholder']),
      ...(remoteByteSizeMatches ? [] : ['remote byteSize does not match manifest or manifest byteSize is placeholder']),
      ...(uploadReceiptValid ? [] : ['upload receipt missing or invalid']),
      ...(rollbackHashLockIdValid ? [] : ['rollback hash-lock id missing or invalid']),
      ...(evidence?.activationApproved === false ? [] : ['activationApproved must remain false in upload evidence']),
    ],
  };
}

function main() {
  const generatedAt = new Date().toISOString();
  const serverManifest = readJson(SERVER_MANIFEST_PATH);
  const uploadPolicyAudit = readJson(UPLOAD_POLICY_AUDIT_PATH);
  const boundaryAudit = readJson(BOUNDARY_AUDIT_PATH);
  const runtimeDeliveryAudit = readJson(RUNTIME_DELIVERY_AUDIT_PATH);
  const evidenceExists = fs.existsSync(EXPECTED_UPLOAD_EVIDENCE_PATH);
  const evidence = evidenceExists ? readJson(EXPECTED_UPLOAD_EVIDENCE_PATH) : null;

  const structuralBlockers = [];
  if (serverManifest.schemaVersion !== 'gustav-fr-lesson-server-pack-manifest-v1') structuralBlockers.push('SERVER_MANIFEST_SCHEMA_MISMATCH');
  if (uploadPolicyAudit.schemaVersion !== 'gustav-fr-lesson-server-upload-policy-gate-audit-v1') structuralBlockers.push('UPLOAD_POLICY_AUDIT_SCHEMA_MISMATCH');
  if (boundaryAudit.schemaVersion !== 'gustav-fr-lesson-manifest-writer-apply-boundary-gate-audit-v1') structuralBlockers.push('BOUNDARY_AUDIT_SCHEMA_MISMATCH');
  if (runtimeDeliveryAudit.schemaVersion !== 'gustav-fr-lesson-runtime-delivery-gate-audit-v1') structuralBlockers.push('RUNTIME_DELIVERY_AUDIT_SCHEMA_MISMATCH');
  if (evidence && evidence.schemaVersion !== 'gustav-fr-lesson-server-upload-evidence-v1') structuralBlockers.push('UPLOAD_EVIDENCE_SCHEMA_MISMATCH');

  const evidenceByPackId = new Map((evidence?.objects || []).map((item) => [item.packId, item]));
  const entries = Array.isArray(serverManifest.entries) ? serverManifest.entries : [];
  const objectEvidenceInspections = entries.map((entry) => inspectUploadEvidence(entry, evidenceByPackId));

  const allObjectsAccepted = objectEvidenceInspections.length > 0 && objectEvidenceInspections.every((item) => item.accepted);
  const uploadPolicyReady = uploadPolicyAudit.summary?.uploadExecutionAllowed === true;
  const boundaryReady = boundaryAudit.summary?.serverUploadAllowed === true;
  const uploadEvidenceReady = evidenceExists && allObjectsAccepted && uploadPolicyReady && boundaryReady;

  const productionBlockers = [];
  if (!evidenceExists) productionBlockers.push('UPLOAD_EVIDENCE_FILE_MISSING');
  if (!allObjectsAccepted) productionBlockers.push('UPLOAD_OBJECT_EVIDENCE_INCOMPLETE_OR_INVALID');
  if (!uploadPolicyReady) productionBlockers.push('UPLOAD_POLICY_NOT_READY_FOR_EXECUTION');
  if (!boundaryReady) productionBlockers.push('MANIFEST_WRITER_APPLY_BOUNDARY_NOT_READY');
  productionBlockers.push('RUNTIME_DELIVERY_CLOSED_UNTIL_UPLOAD_EVIDENCE_PASS');

  const summary = {
    expectedObjects: entries.length,
    uploadEvidenceFileExists: evidenceExists,
    uploadEvidenceSchemaValid: evidence?.schemaVersion === 'gustav-fr-lesson-server-upload-evidence-v1',
    evidenceObjects: evidence?.objects?.length || 0,
    acceptedObjects: objectEvidenceInspections.filter((item) => item.accepted).length,
    missingEvidenceObjects: objectEvidenceInspections.filter((item) => !item.evidencePresent).length,
    sourceLocaleScopedRemoteObjects: objectEvidenceInspections.filter((item) => item.remotePathSourceScoped).length,
    deniedRemotePathHits: objectEvidenceInspections.filter((item) => item.remotePathDenied).length,
    shaMatchedObjects: objectEvidenceInspections.filter((item) => item.remoteShaMatches).length,
    byteSizeMatchedObjects: objectEvidenceInspections.filter((item) => item.remoteByteSizeMatches).length,
    uploadReceiptValidObjects: objectEvidenceInspections.filter((item) => item.uploadReceiptValid).length,
    rollbackHashLockValidObjects: objectEvidenceInspections.filter((item) => item.rollbackHashLockIdValid).length,
    uploadPolicyReady,
    boundaryReady,
    uploadEvidenceReady,
    runtimeDeliveryMayOpen: false,
    runtimeDownloadsEnabled: false,
    activationApproved: false,
    readyForRuntimeDelivery: false,
    readyForApply: false,
    structuralBlockers: structuralBlockers.length,
    productionBlockers: productionBlockers.length,
  };

  const gate = {
    schemaVersion: 'gustav-fr-lesson-server-upload-evidence-gate-v1',
    generatedAt,
    status: structuralBlockers.length > 0 ? 'BLOCK' : 'HOLD_UPLOAD_EVIDENCE_MISSING',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    activationApproved: false,
    sourceArtifacts: {
      serverManifest: rel(SERVER_MANIFEST_PATH),
      uploadPolicyAudit: rel(UPLOAD_POLICY_AUDIT_PATH),
      manifestWriterApplyBoundaryAudit: rel(BOUNDARY_AUDIT_PATH),
      runtimeDeliveryAudit: rel(RUNTIME_DELIVERY_AUDIT_PATH),
      expectedUploadEvidence: rel(EXPECTED_UPLOAD_EVIDENCE_PATH),
    },
    requiredEvidenceContract: {
      expectedUploadEvidence: rel(EXPECTED_UPLOAD_EVIDENCE_PATH),
      expectedSchemaVersion: 'gustav-fr-lesson-server-upload-evidence-v1',
      remoteObjectPathsMustStartWith: ['course-packs/fr/ru/', 'course-packs/fr/uk/'],
      deniedRemotePathTokens: DENIED_REMOTE_PATH_TOKENS,
      requiresManifestShaMatch: true,
      requiresManifestByteSizeMatch: true,
      requiresUploadReceiptId: true,
      requiresRollbackHashLockId: true,
      requiresActivationApprovedFalse: true,
      mayOpenRuntimeDelivery: false,
    },
    objectEvidenceInspections,
    summary,
    productionBlockers,
    safety: {
      readOnly: true,
      firebaseOrServerUploadStarted: false,
      uploadEvidenceWrittenByThisScript: false,
      runtimeIndexModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };
  writeJson(GATE_PATH, gate);

  const audit = {
    schemaVersion: 'gustav-fr-lesson-server-upload-evidence-gate-audit-v1',
    generatedAt,
    status: structuralBlockers.length > 0 ? 'BLOCK' : 'HOLD',
    activationApproved: false,
    sourceArtifacts: gate.sourceArtifacts,
    hashes: {
      serverManifestSha256: sha256(SERVER_MANIFEST_PATH),
      uploadPolicyAuditSha256: sha256(UPLOAD_POLICY_AUDIT_PATH),
      manifestWriterApplyBoundaryAuditSha256: sha256(BOUNDARY_AUDIT_PATH),
      runtimeDeliveryAuditSha256: sha256(RUNTIME_DELIVERY_AUDIT_PATH),
      uploadEvidenceSha256: sha256(EXPECTED_UPLOAD_EVIDENCE_PATH),
      gateSha256: sha256(GATE_PATH),
    },
    summary,
    structuralBlockers,
    productionBlockers,
    safety: gate.safety,
    nextRequiredGates: [
      'complete_llm_official_source_review_decisions',
      'audio_tts_generation_gate',
      'audio_checksum_gate',
      'server_payload_materialization_gate',
      'manifest_rewrite_hash_lock_gate',
      'server_upload_policy_gate',
      'server_upload_evidence_gate',
      'runtime_delivery_gate',
      'explicit_activation_approval_gate',
    ],
  };
  writeJson(AUDIT_PATH, audit);

  console.log(`Gustav French lesson server upload evidence gate: ${audit.status}`);
  console.log(`Upload evidence objects accepted: ${summary.acceptedObjects}/${summary.expectedObjects}`);
  console.log(`Upload evidence file exists: ${summary.uploadEvidenceFileExists}`);
  console.log(`Runtime delivery may open: ${summary.runtimeDeliveryMayOpen}`);
  console.log(rel(AUDIT_PATH));

  if (structuralBlockers.length > 0) process.exitCode = 1;
}

main();
