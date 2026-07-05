import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server');
const ADMIN_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'admin');

const SERVER_MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson_server_pack_manifest_v1.json');
const PAYLOAD_MATERIALIZATION_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson_server_payload_materialization_gate_audit_v1.json');
const UPLOAD_POLICY_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson_server_upload_policy_gate_audit_v1.json');
const MANIFEST_REWRITE_GATE_PATH = path.join(SERVER_DIR, 'fr_lesson_manifest_rewrite_hash_lock_gate_v1.json');
const MANIFEST_REWRITE_GATE_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson_manifest_rewrite_hash_lock_gate_audit_v1.json');
const ACTIVATION_ROLLBACK_GATE_AUDIT_PATH = path.join(ADMIN_DIR, 'fr_admin_activation_rollback_gate_audit_v1.json');
const EXPECTED_HASH_LOCK_MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson_server_manifest_hash_lock_v1.json');
const CONTRACT_PATH = path.join(SERVER_DIR, 'fr_lesson_hash_lock_materialization_contract_v1.json');
const AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson_hash_lock_materialization_contract_audit_v1.json');

const SOURCE_LOCALES = ['ru', 'uk'];
const ALLOWED_ROLLBACK_SCOPES = ['course-packs/fr/ru/', 'course-packs/fr/uk/'];
const DENIED_ROLLBACK_SCOPES = [
  'course-packs/fr/',
  'course-packs/en/',
  'course-packs/fr/uiLocale/',
  'course-packs/fr/sourceLocale/',
  'card_packs/',
  'community_packs/',
];

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

function buildExpectedLock(expectedLock, hashes, manifestEntry) {
  return {
    lockId: expectedLock.lockId,
    packId: expectedLock.packId,
    studyTarget: 'fr',
    sourceLocale: expectedLock.sourceLocale,
    surface: expectedLock.surface,
    contentVersion: manifestEntry?.contentVersion || '',
    requiredRollbackScope: expectedLock.requiredRollbackScope,
    requiredServerPathPrefix: expectedLock.requiredServerPathPrefix,
    requiredServerManifestSha256BeforeUpload: hashes.serverManifestSha256,
    requiredPayloadMaterializationAuditSha256: hashes.payloadMaterializationAuditSha256,
    requiredUploadPolicyAuditSha256: hashes.uploadPolicyAuditSha256,
    requiredManifestRewriteGateAuditSha256: hashes.manifestRewriteGateAuditSha256,
    requiredActivationApproved: false,
    requiredFields: expectedLock.requiredFields,
  };
}

function inspectExistingLock(lock, expected) {
  if (!lock) {
    return {
      lockId: expected.lockId,
      exists: false,
      accepted: false,
      errors: ['hash lock entry missing'],
    };
  }

  const errors = [];
  if (lock.lockId !== expected.lockId) errors.push('lockId mismatch');
  if (lock.packId !== expected.packId) errors.push('packId mismatch');
  if (lock.studyTarget !== 'fr') errors.push('studyTarget must be fr');
  if (lock.sourceLocale !== expected.sourceLocale) errors.push('sourceLocale mismatch');
  if (!SOURCE_LOCALES.includes(lock.sourceLocale)) errors.push('sourceLocale must be ru|uk');
  if (lock.surface !== expected.surface) errors.push('surface mismatch');
  if (lock.activationApproved !== false) errors.push('activationApproved must remain false');
  if (lock.rollbackScope !== expected.requiredRollbackScope) errors.push('rollbackScope mismatch');
  if (!ALLOWED_ROLLBACK_SCOPES.includes(lock.rollbackScope)) errors.push('rollbackScope not allowlisted');
  if (DENIED_ROLLBACK_SCOPES.includes(lock.rollbackScope)) errors.push('rollbackScope denied');
  if (!String(lock.serverPath || '').startsWith(expected.requiredServerPathPrefix)) errors.push('serverPath prefix mismatch');
  if (lock.serverManifestSha256BeforeUpload !== expected.requiredServerManifestSha256BeforeUpload) {
    errors.push('serverManifestSha256BeforeUpload mismatch');
  }
  if (lock.payloadMaterializationAuditSha256 !== expected.requiredPayloadMaterializationAuditSha256) {
    errors.push('payloadMaterializationAuditSha256 mismatch');
  }
  if (lock.uploadPolicyAuditSha256 !== expected.requiredUploadPolicyAuditSha256) {
    errors.push('uploadPolicyAuditSha256 mismatch');
  }
  if (lock.manifestRewriteGateAuditSha256 !== expected.requiredManifestRewriteGateAuditSha256) {
    errors.push('manifestRewriteGateAuditSha256 mismatch');
  }
  if (!/^[a-f0-9]{64}$/.test(lock.payloadSha256 || '')) errors.push('payloadSha256 must be 64 hex');
  if (Number(lock.payloadByteSize || 0) <= 1) errors.push('payloadByteSize must be > 1');

  return {
    lockId: expected.lockId,
    exists: true,
    accepted: errors.length === 0,
    errors,
  };
}

function main() {
  const generatedAt = new Date().toISOString();
  const serverManifest = readJson(SERVER_MANIFEST_PATH);
  const payloadMaterializationAudit = readJson(PAYLOAD_MATERIALIZATION_AUDIT_PATH);
  const uploadPolicyAudit = readJson(UPLOAD_POLICY_AUDIT_PATH);
  const manifestRewriteGate = readJson(MANIFEST_REWRITE_GATE_PATH);
  const manifestRewriteGateAudit = readJson(MANIFEST_REWRITE_GATE_AUDIT_PATH);
  const activationRollbackGateAudit = readJson(ACTIVATION_ROLLBACK_GATE_AUDIT_PATH);
  const hashLockManifestExists = fs.existsSync(EXPECTED_HASH_LOCK_MANIFEST_PATH);
  const hashLockManifest = hashLockManifestExists ? readJson(EXPECTED_HASH_LOCK_MANIFEST_PATH) : null;

  const structuralBlockers = [];
  if (serverManifest.schemaVersion !== 'gustav-fr-lesson-server-pack-manifest-v1') {
    structuralBlockers.push('SERVER_MANIFEST_SCHEMA_MISMATCH');
  }
  if (payloadMaterializationAudit.schemaVersion !== 'gustav-fr-lesson-server-payload-materialization-gate-audit-v1') {
    structuralBlockers.push('PAYLOAD_MATERIALIZATION_AUDIT_SCHEMA_MISMATCH');
  }
  if (uploadPolicyAudit.schemaVersion !== 'gustav-fr-lesson-server-upload-policy-gate-audit-v1') {
    structuralBlockers.push('UPLOAD_POLICY_AUDIT_SCHEMA_MISMATCH');
  }
  if (manifestRewriteGate.schemaVersion !== 'gustav-fr-lesson-manifest-rewrite-hash-lock-gate-v1') {
    structuralBlockers.push('MANIFEST_REWRITE_GATE_SCHEMA_MISMATCH');
  }
  if (manifestRewriteGateAudit.schemaVersion !== 'gustav-fr-lesson-manifest-rewrite-hash-lock-gate-audit-v1') {
    structuralBlockers.push('MANIFEST_REWRITE_GATE_AUDIT_SCHEMA_MISMATCH');
  }
  if (activationRollbackGateAudit.schemaVersion !== 'gustav-fr-admin-activation-rollback-gate-audit-v1') {
    structuralBlockers.push('ACTIVATION_ROLLBACK_GATE_AUDIT_SCHEMA_MISMATCH');
  }

  const hashes = {
    serverManifestSha256: sha256(SERVER_MANIFEST_PATH),
    payloadMaterializationAuditSha256: sha256(PAYLOAD_MATERIALIZATION_AUDIT_PATH),
    uploadPolicyAuditSha256: sha256(UPLOAD_POLICY_AUDIT_PATH),
    manifestRewriteGateAuditSha256: sha256(MANIFEST_REWRITE_GATE_AUDIT_PATH),
    activationRollbackGateAuditSha256: sha256(ACTIVATION_ROLLBACK_GATE_AUDIT_PATH),
    existingHashLockManifestSha256: sha256(EXPECTED_HASH_LOCK_MANIFEST_PATH),
  };

  const entriesByPackId = new Map((serverManifest.entries || []).map((entry) => [entry.packId, entry]));
  const expectedLocks = (manifestRewriteGate.expectedHashLocks || []).map((expectedLock) =>
    buildExpectedLock(expectedLock, hashes, entriesByPackId.get(expectedLock.packId))
  );
  const existingLocksById = new Map((hashLockManifest?.locks || []).map((lock) => [lock.lockId, lock]));
  const lockInspections = expectedLocks.map((expected) => inspectExistingLock(existingLocksById.get(expected.lockId), expected));

  const allExpectedLocksPresent = lockInspections.length > 0 && lockInspections.every((lock) => lock.exists);
  const allExpectedLocksAccepted = lockInspections.length > 0 && lockInspections.every((lock) => lock.accepted);
  const materializationReady = payloadMaterializationAudit.summary?.payloadsReadyForManifest === expectedLocks.length;
  const rewriteGateReady = manifestRewriteGateAudit.summary?.manifestRewriteReady === true;
  const activationHashLockReady = activationRollbackGateAudit.summary?.activeHashLockManifestExists === true;
  const hashLockMaterializationReady =
    hashLockManifestExists &&
    hashLockManifest?.schemaVersion === 'gustav-fr-lesson-server-manifest-hash-lock-v1' &&
    hashLockManifest?.activationApproved === false &&
    allExpectedLocksAccepted &&
    materializationReady &&
    rewriteGateReady &&
    activationHashLockReady;

  const productionBlockers = [];
  if (!hashLockManifestExists) productionBlockers.push('HASH_LOCK_MANIFEST_FILE_MISSING');
  if (!allExpectedLocksPresent) productionBlockers.push('EXPECTED_HASH_LOCKS_MISSING');
  if (!allExpectedLocksAccepted) productionBlockers.push('EXPECTED_HASH_LOCKS_NOT_ACCEPTED');
  if (!materializationReady) productionBlockers.push('PAYLOAD_MATERIALIZATION_GATE_NOT_READY');
  if (!rewriteGateReady) productionBlockers.push('MANIFEST_REWRITE_GATE_NOT_READY');
  if (!activationHashLockReady) productionBlockers.push('ACTIVATION_HASH_LOCK_NOT_READY');
  productionBlockers.push('HASH_LOCK_MATERIALIZATION_EXECUTION_CLOSED');

  const summary = {
    expectedLocks: expectedLocks.length,
    hashLockManifestExists,
    hashLockManifestSchemaValid: hashLockManifest?.schemaVersion === 'gustav-fr-lesson-server-manifest-hash-lock-v1',
    existingLocks: hashLockManifest?.locks?.length || 0,
    allExpectedLocksPresent,
    acceptedLocks: lockInspections.filter((lock) => lock.accepted).length,
    rejectedLocks: lockInspections.filter((lock) => lock.exists && !lock.accepted).length,
    missingLocks: lockInspections.filter((lock) => !lock.exists).length,
    allowedRollbackScopes: ALLOWED_ROLLBACK_SCOPES,
    deniedRollbackScopes: DENIED_ROLLBACK_SCOPES,
    materializationReady,
    rewriteGateReady,
    activationHashLockReady,
    hashLockMaterializationReady,
    hashLockMaterializationExecutionAllowed: false,
    firebaseUploadAllowed: false,
    runtimeDownloadsEnabled: false,
    activationApproved: false,
    readyForManifestRewrite: false,
    readyForServerUpload: false,
    readyForRuntimeDelivery: false,
    readyForApply: false,
    structuralBlockers: structuralBlockers.length,
    productionBlockers: productionBlockers.length,
  };

  const contract = {
    schemaVersion: 'gustav-fr-lesson-hash-lock-materialization-contract-v1',
    generatedAt,
    status: structuralBlockers.length > 0 ? 'BLOCK' : 'HOLD_HASH_LOCK_MATERIALIZATION_CLOSED',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    activationApproved: false,
    sourceArtifacts: {
      serverManifest: rel(SERVER_MANIFEST_PATH),
      payloadMaterializationAudit: rel(PAYLOAD_MATERIALIZATION_AUDIT_PATH),
      uploadPolicyAudit: rel(UPLOAD_POLICY_AUDIT_PATH),
      manifestRewriteGate: rel(MANIFEST_REWRITE_GATE_PATH),
      manifestRewriteGateAudit: rel(MANIFEST_REWRITE_GATE_AUDIT_PATH),
      activationRollbackGateAudit: rel(ACTIVATION_ROLLBACK_GATE_AUDIT_PATH),
      expectedHashLockManifest: rel(EXPECTED_HASH_LOCK_MANIFEST_PATH),
    },
    materializationRules: {
      expectedHashLockManifest: rel(EXPECTED_HASH_LOCK_MANIFEST_PATH),
      hashLockManifestWrittenByThisScript: false,
      appBundleWritesAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      allowedRollbackScopes: ALLOWED_ROLLBACK_SCOPES,
      deniedRollbackScopes: DENIED_ROLLBACK_SCOPES,
      requiresActivationApprovedFalse: true,
      requiresPayloadSha256: true,
      requiresPayloadByteSize: true,
      requiresPreUploadServerManifestSha256: true,
      requiresPayloadMaterializationAuditSha256: true,
      requiresUploadPolicyAuditSha256: true,
      requiresManifestRewriteGateAuditSha256: true,
    },
    expectedLocks,
    lockInspections,
    summary,
    productionBlockers,
    safety: {
      readOnly: true,
      hashLockManifestWrittenByThisScript: false,
      serverManifestModifiedByThisScript: false,
      payloadFilesWrittenByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };
  writeJson(CONTRACT_PATH, contract);

  const audit = {
    schemaVersion: 'gustav-fr-lesson-hash-lock-materialization-contract-audit-v1',
    generatedAt,
    status: structuralBlockers.length > 0 ? 'BLOCK' : 'HOLD',
    activationApproved: false,
    sourceArtifacts: contract.sourceArtifacts,
    hashes: {
      ...hashes,
      contractSha256: sha256(CONTRACT_PATH),
    },
    summary,
    structuralBlockers,
    productionBlockers,
    safety: contract.safety,
    nextRequiredGates: [
      'complete_llm_official_source_review_decisions',
      'audio_tts_generation_gate',
      'audio_checksum_gate',
      'server_payload_materialization_gate',
      'server_manifest_hash_lock_materialization',
      'manifest_rewrite_with_real_sha_and_bytes',
      'server_upload_policy_gate',
      'runtime_delivery_gate',
      'explicit_activation_approval_gate',
    ],
  };
  writeJson(AUDIT_PATH, audit);

  console.log(`Gustav French lesson hash-lock materialization contract: ${audit.status}`);
  console.log(`Expected locks: ${summary.expectedLocks}`);
  console.log(`Existing locks: ${summary.existingLocks}/${summary.expectedLocks}`);
  console.log(`Accepted locks: ${summary.acceptedLocks}/${summary.expectedLocks}`);
  console.log(`Hash-lock materialization ready: ${summary.hashLockMaterializationReady}`);
  console.log(rel(AUDIT_PATH));

  if (structuralBlockers.length > 0) process.exitCode = 1;
}

main();
