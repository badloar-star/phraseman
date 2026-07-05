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
const PAYLOAD_MATERIALIZATION_CONTRACT_PATH = path.join(SERVER_DIR, 'fr_lesson_server_payload_materialization_gate_v1.json');
const PAYLOAD_MATERIALIZATION_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson_server_payload_materialization_gate_audit_v1.json');
const UPLOAD_POLICY_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson_server_upload_policy_gate_audit_v1.json');
const ACTIVATION_ROLLBACK_GATE_AUDIT_PATH = path.join(ADMIN_DIR, 'fr_admin_activation_rollback_gate_audit_v1.json');
const EXPECTED_HASH_LOCK_PATH = path.join(SERVER_DIR, 'fr_lesson_server_manifest_hash_lock_v1.json');
const CONTRACT_PATH = path.join(SERVER_DIR, 'fr_lesson_manifest_rewrite_hash_lock_gate_v1.json');
const AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson_manifest_rewrite_hash_lock_gate_audit_v1.json');

const SOURCE_LOCALES = ['ru', 'uk'];
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

function inspectManifestEntry(entry, expectedPayloadsByPackId) {
  const payload = expectedPayloadsByPackId.get(entry.packId);
  const expectedPrefix = `course-packs/fr/${entry.sourceLocale}/${entry.surface}/`;
  const sourceLocaleScoped = SOURCE_LOCALES.includes(entry.sourceLocale) && entry.serverPath.startsWith(expectedPrefix);
  const shaIsReal = /^[a-f0-9]{64}$/.test(entry.sha256 || '') && entry.sha256 !== ZERO_SHA;
  const byteSizeIsReal = Number(entry.byteSize || 0) > 1;
  const serverPathUsesManifestSha = shaIsReal && entry.serverPath.includes(`/${entry.sha256}.json`);
  const payloadExists = payload?.exists === true;
  const payloadShaMatches = payload?.manifestShaMatchesPayload === true;
  const payloadBytesMatch = payload?.manifestByteSizeMatchesPayload === true;

  return {
    packId: entry.packId,
    studyTarget: entry.studyTarget,
    sourceLocale: entry.sourceLocale,
    surface: entry.surface,
    serverPath: entry.serverPath,
    sourceLocaleScoped,
    shaIsPlaceholder: entry.sha256 === ZERO_SHA,
    shaIsReal,
    byteSizeIsReal,
    serverPathUsesManifestSha,
    payloadExpected: Boolean(payload),
    payloadExists,
    payloadShaMatches,
    payloadBytesMatch,
    rewriteReady: (
      entry.studyTarget === 'fr' &&
      sourceLocaleScoped &&
      shaIsReal &&
      byteSizeIsReal &&
      serverPathUsesManifestSha &&
      payloadExists &&
      payloadShaMatches &&
      payloadBytesMatch
    ),
  };
}

function buildHashLockExpectation(entry) {
  return {
    lockId: `fr.${entry.sourceLocale}.${entry.surface}.manifest_hash_lock_v1`,
    packId: entry.packId,
    studyTarget: 'fr',
    sourceLocale: entry.sourceLocale,
    surface: entry.surface,
    requiredServerPathPrefix: `course-packs/fr/${entry.sourceLocale}/${entry.surface}/`,
    requiredRollbackScope: `course-packs/fr/${entry.sourceLocale}/`,
    requiredFields: [
      'packId',
      'studyTarget',
      'sourceLocale',
      'surface',
      'contentVersion',
      'payloadSha256',
      'payloadByteSize',
      'serverPath',
      'serverManifestSha256BeforeUpload',
      'payloadMaterializationAuditSha256',
      'uploadPolicyAuditSha256',
      'createdAt',
      'activationApproved:false',
    ],
  };
}

function main() {
  const generatedAt = new Date().toISOString();
  const serverManifest = readJson(SERVER_MANIFEST_PATH);
  const payloadMaterializationContract = readJson(PAYLOAD_MATERIALIZATION_CONTRACT_PATH);
  const payloadMaterializationAudit = readJson(PAYLOAD_MATERIALIZATION_AUDIT_PATH);
  const uploadPolicyAudit = readJson(UPLOAD_POLICY_AUDIT_PATH);
  const activationRollbackGateAudit = readJson(ACTIVATION_ROLLBACK_GATE_AUDIT_PATH);
  const hashLockExists = fs.existsSync(EXPECTED_HASH_LOCK_PATH);
  const hashLock = hashLockExists ? readJson(EXPECTED_HASH_LOCK_PATH) : null;

  const structuralBlockers = [];
  if (serverManifest.schemaVersion !== 'gustav-fr-lesson-server-pack-manifest-v1') {
    structuralBlockers.push('SERVER_MANIFEST_SCHEMA_MISMATCH');
  }
  if (payloadMaterializationContract.schemaVersion !== 'gustav-fr-lesson-server-payload-materialization-gate-v1') {
    structuralBlockers.push('PAYLOAD_MATERIALIZATION_CONTRACT_SCHEMA_MISMATCH');
  }
  if (payloadMaterializationAudit.schemaVersion !== 'gustav-fr-lesson-server-payload-materialization-gate-audit-v1') {
    structuralBlockers.push('PAYLOAD_MATERIALIZATION_AUDIT_SCHEMA_MISMATCH');
  }
  if (uploadPolicyAudit.schemaVersion !== 'gustav-fr-lesson-server-upload-policy-gate-audit-v1') {
    structuralBlockers.push('UPLOAD_POLICY_AUDIT_SCHEMA_MISMATCH');
  }
  if (activationRollbackGateAudit.schemaVersion !== 'gustav-fr-admin-activation-rollback-gate-audit-v1') {
    structuralBlockers.push('ACTIVATION_ROLLBACK_GATE_AUDIT_SCHEMA_MISMATCH');
  }

  const expectedPayloads = Array.isArray(payloadMaterializationContract.expectedPayloads)
    ? payloadMaterializationContract.expectedPayloads
    : [];
  const expectedPayloadsByPackId = new Map(expectedPayloads.map((payload) => [payload.packId, payload]));
  const entries = Array.isArray(serverManifest.entries) ? serverManifest.entries : [];
  const entryRewriteChecks = entries.map((entry) => inspectManifestEntry(entry, expectedPayloadsByPackId));
  const expectedHashLocks = entries.map(buildHashLockExpectation);

  const payloadMaterializationReady = payloadMaterializationAudit.summary?.payloadsReadyForManifest === entries.length;
  const uploadPolicyReady = uploadPolicyAudit.summary?.uploadExecutionAllowed === true;
  const rollbackHashLocksReady =
    activationRollbackGateAudit.summary?.activeHashLockManifestExists === true &&
    hashLockExists &&
    hashLock?.schemaVersion === 'gustav-fr-lesson-server-manifest-hash-lock-v1';
  const manifestRewriteReady =
    entryRewriteChecks.length > 0 &&
    entryRewriteChecks.every((entry) => entry.rewriteReady) &&
    payloadMaterializationReady &&
    rollbackHashLocksReady;

  const productionBlockers = [];
  if (!payloadMaterializationReady) productionBlockers.push('PAYLOAD_MATERIALIZATION_GATE_NOT_READY');
  if (!manifestRewriteReady) productionBlockers.push('SERVER_MANIFEST_STILL_HAS_PLACEHOLDER_SHA_OR_BYTES');
  if (!rollbackHashLocksReady) productionBlockers.push('HASH_LOCK_MANIFEST_NOT_READY');
  if (!uploadPolicyReady) productionBlockers.push('UPLOAD_POLICY_NOT_READY_FOR_EXECUTION');
  productionBlockers.push('MANIFEST_REWRITE_EXECUTION_CLOSED');

  const summary = {
    serverManifestEntries: entries.length,
    expectedPayloads: expectedPayloads.length,
    sourceLocaleScopedEntries: entryRewriteChecks.filter((entry) => entry.sourceLocaleScoped).length,
    placeholderShaEntries: entryRewriteChecks.filter((entry) => entry.shaIsPlaceholder).length,
    realShaEntries: entryRewriteChecks.filter((entry) => entry.shaIsReal).length,
    realByteSizeEntries: entryRewriteChecks.filter((entry) => entry.byteSizeIsReal).length,
    serverPathUsesManifestShaEntries: entryRewriteChecks.filter((entry) => entry.serverPathUsesManifestSha).length,
    payloadExistsEntries: entryRewriteChecks.filter((entry) => entry.payloadExists).length,
    payloadShaMatchEntries: entryRewriteChecks.filter((entry) => entry.payloadShaMatches).length,
    payloadByteSizeMatchEntries: entryRewriteChecks.filter((entry) => entry.payloadBytesMatch).length,
    rewriteReadyEntries: entryRewriteChecks.filter((entry) => entry.rewriteReady).length,
    expectedHashLocks: expectedHashLocks.length,
    hashLockManifestExists: hashLockExists,
    hashLockManifestReady: rollbackHashLocksReady,
    payloadMaterializationReady,
    uploadPolicyReady,
    manifestRewriteReady,
    manifestRewriteExecutionAllowed: false,
    firebaseUploadAllowed: false,
    runtimeDownloadsEnabled: false,
    activationApproved: false,
    readyForServerUpload: false,
    readyForRuntimeDelivery: false,
    readyForApply: false,
    structuralBlockers: structuralBlockers.length,
    productionBlockers: productionBlockers.length,
  };

  const contract = {
    schemaVersion: 'gustav-fr-lesson-manifest-rewrite-hash-lock-gate-v1',
    generatedAt,
    status: structuralBlockers.length > 0 ? 'BLOCK' : 'HOLD_REWRITE_AND_HASH_LOCK_CLOSED',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    activationApproved: false,
    sourceArtifacts: {
      serverManifest: rel(SERVER_MANIFEST_PATH),
      payloadMaterializationContract: rel(PAYLOAD_MATERIALIZATION_CONTRACT_PATH),
      payloadMaterializationAudit: rel(PAYLOAD_MATERIALIZATION_AUDIT_PATH),
      uploadPolicyAudit: rel(UPLOAD_POLICY_AUDIT_PATH),
      activationRollbackGateAudit: rel(ACTIVATION_ROLLBACK_GATE_AUDIT_PATH),
      expectedHashLockManifest: rel(EXPECTED_HASH_LOCK_PATH),
    },
    rewriteRules: {
      serverManifestModifiedByThisScript: false,
      expectedHashLockManifest: rel(EXPECTED_HASH_LOCK_PATH),
      manifestRewriteExecutionAllowed: false,
      appBundleWritesAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      requiresRealPayloadSha256: true,
      requiresPayloadByteSize: true,
      requiresServerPathToContainPayloadSha: true,
      requiresPayloadMaterializationGatePass: true,
      requiresUploadPolicyGatePass: true,
      requiresHashLockManifest: true,
    },
    entryRewriteChecks,
    expectedHashLocks,
    summary,
    productionBlockers,
    safety: {
      readOnly: true,
      serverManifestModifiedByThisScript: false,
      hashLockManifestWrittenByThisScript: false,
      payloadFilesWrittenByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };
  writeJson(CONTRACT_PATH, contract);

  const audit = {
    schemaVersion: 'gustav-fr-lesson-manifest-rewrite-hash-lock-gate-audit-v1',
    generatedAt,
    status: structuralBlockers.length > 0 ? 'BLOCK' : 'HOLD',
    activationApproved: false,
    sourceArtifacts: contract.sourceArtifacts,
    hashes: {
      serverManifestSha256: sha256(SERVER_MANIFEST_PATH),
      payloadMaterializationContractSha256: sha256(PAYLOAD_MATERIALIZATION_CONTRACT_PATH),
      payloadMaterializationAuditSha256: sha256(PAYLOAD_MATERIALIZATION_AUDIT_PATH),
      uploadPolicyAuditSha256: sha256(UPLOAD_POLICY_AUDIT_PATH),
      activationRollbackGateAuditSha256: sha256(ACTIVATION_ROLLBACK_GATE_AUDIT_PATH),
      expectedHashLockManifestSha256: sha256(EXPECTED_HASH_LOCK_PATH),
      rewriteContractSha256: sha256(CONTRACT_PATH),
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
      'manifest_rewrite_with_real_sha_and_bytes',
      'hash_lock_manifest_materialization',
      'server_upload_policy_gate',
      'runtime_delivery_gate',
      'explicit_activation_approval_gate',
    ],
  };
  writeJson(AUDIT_PATH, audit);

  console.log(`Gustav French lesson manifest rewrite/hash-lock gate: ${audit.status}`);
  console.log(`Placeholder sha entries: ${summary.placeholderShaEntries}/${summary.serverManifestEntries}`);
  console.log(`Rewrite-ready entries: ${summary.rewriteReadyEntries}/${summary.serverManifestEntries}`);
  console.log(`Hash-lock manifest ready: ${summary.hashLockManifestReady}`);
  console.log(`Manifest rewrite execution allowed: ${summary.manifestRewriteExecutionAllowed}`);
  console.log(rel(AUDIT_PATH));

  if (structuralBlockers.length > 0) process.exitCode = 1;
}

main();
