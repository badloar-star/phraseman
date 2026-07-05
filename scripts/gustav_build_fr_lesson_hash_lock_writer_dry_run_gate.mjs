import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server');

const SERVER_MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson_server_pack_manifest_v1.json');
const PAYLOAD_MATERIALIZATION_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson_server_payload_materialization_gate_audit_v1.json');
const MANIFEST_REWRITE_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson_manifest_rewrite_hash_lock_gate_audit_v1.json');
const HASH_LOCK_CONTRACT_PATH = path.join(SERVER_DIR, 'fr_lesson_hash_lock_materialization_contract_v1.json');
const HASH_LOCK_CONTRACT_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson_hash_lock_materialization_contract_audit_v1.json');
const EXPECTED_HASH_LOCK_MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson_server_manifest_hash_lock_v1.json');
const DRY_RUN_PATH = path.join(SERVER_DIR, 'fr_lesson_hash_lock_writer_dry_run_v1.json');
const AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson_hash_lock_writer_dry_run_gate_audit_v1.json');

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

function buildPreviewLock(expectedLock, entriesByPackId, hashes) {
  const entry = entriesByPackId.get(expectedLock.packId);
  const payloadSha256 = entry?.sha256 || ZERO_SHA;
  const payloadByteSize = Number(entry?.byteSize || 0);
  const serverPath = entry?.serverPath || '';
  const serverPathScoped = serverPath.startsWith(expectedLock.requiredServerPathPrefix);
  const payloadShaReal = /^[a-f0-9]{64}$/.test(payloadSha256) && payloadSha256 !== ZERO_SHA;
  const payloadByteSizeReal = payloadByteSize > 1;
  const serverPathUsesPayloadSha = payloadShaReal && serverPath.includes(`/${payloadSha256}.json`);
  const lockWritable =
    entry?.studyTarget === 'fr' &&
    SOURCE_LOCALES.includes(entry?.sourceLocale) &&
    serverPathScoped &&
    payloadShaReal &&
    payloadByteSizeReal &&
    serverPathUsesPayloadSha;

  return {
    lockId: expectedLock.lockId,
    packId: expectedLock.packId,
    studyTarget: 'fr',
    sourceLocale: expectedLock.sourceLocale,
    surface: expectedLock.surface,
    contentVersion: expectedLock.contentVersion,
    payloadSha256,
    payloadByteSize,
    serverPath,
    rollbackScope: expectedLock.requiredRollbackScope,
    serverManifestSha256BeforeUpload: hashes.serverManifestSha256,
    payloadMaterializationAuditSha256: hashes.payloadMaterializationAuditSha256,
    uploadPolicyAuditSha256: expectedLock.requiredUploadPolicyAuditSha256,
    manifestRewriteGateAuditSha256: hashes.manifestRewriteGateAuditSha256,
    activationApproved: false,
    serverPathScoped,
    payloadShaReal,
    payloadByteSizeReal,
    serverPathUsesPayloadSha,
    lockWritable,
    errors: [
      ...(entry ? [] : ['server manifest entry missing']),
      ...(serverPathScoped ? [] : ['server path is not sourceLocale scoped']),
      ...(payloadShaReal ? [] : ['payload sha is still placeholder or invalid']),
      ...(payloadByteSizeReal ? [] : ['payload byteSize is not real']),
      ...(serverPathUsesPayloadSha ? [] : ['server path does not contain real payload sha']),
    ],
  };
}

function main() {
  const generatedAt = new Date().toISOString();
  const serverManifest = readJson(SERVER_MANIFEST_PATH);
  const payloadMaterializationAudit = readJson(PAYLOAD_MATERIALIZATION_AUDIT_PATH);
  const manifestRewriteAudit = readJson(MANIFEST_REWRITE_AUDIT_PATH);
  const hashLockContract = readJson(HASH_LOCK_CONTRACT_PATH);
  const hashLockContractAudit = readJson(HASH_LOCK_CONTRACT_AUDIT_PATH);
  const existingHashLockManifestExists = fs.existsSync(EXPECTED_HASH_LOCK_MANIFEST_PATH);

  const structuralBlockers = [];
  if (serverManifest.schemaVersion !== 'gustav-fr-lesson-server-pack-manifest-v1') {
    structuralBlockers.push('SERVER_MANIFEST_SCHEMA_MISMATCH');
  }
  if (payloadMaterializationAudit.schemaVersion !== 'gustav-fr-lesson-server-payload-materialization-gate-audit-v1') {
    structuralBlockers.push('PAYLOAD_MATERIALIZATION_AUDIT_SCHEMA_MISMATCH');
  }
  if (manifestRewriteAudit.schemaVersion !== 'gustav-fr-lesson-manifest-rewrite-hash-lock-gate-audit-v1') {
    structuralBlockers.push('MANIFEST_REWRITE_AUDIT_SCHEMA_MISMATCH');
  }
  if (hashLockContract.schemaVersion !== 'gustav-fr-lesson-hash-lock-materialization-contract-v1') {
    structuralBlockers.push('HASH_LOCK_CONTRACT_SCHEMA_MISMATCH');
  }
  if (hashLockContractAudit.schemaVersion !== 'gustav-fr-lesson-hash-lock-materialization-contract-audit-v1') {
    structuralBlockers.push('HASH_LOCK_CONTRACT_AUDIT_SCHEMA_MISMATCH');
  }

  const hashes = {
    serverManifestSha256: sha256(SERVER_MANIFEST_PATH),
    payloadMaterializationAuditSha256: sha256(PAYLOAD_MATERIALIZATION_AUDIT_PATH),
    manifestRewriteGateAuditSha256: sha256(MANIFEST_REWRITE_AUDIT_PATH),
    hashLockContractAuditSha256: sha256(HASH_LOCK_CONTRACT_AUDIT_PATH),
    existingHashLockManifestSha256: sha256(EXPECTED_HASH_LOCK_MANIFEST_PATH),
  };

  const entriesByPackId = new Map((serverManifest.entries || []).map((entry) => [entry.packId, entry]));
  const previewLocks = (hashLockContract.expectedLocks || []).map((expectedLock) =>
    buildPreviewLock(expectedLock, entriesByPackId, hashes)
  );

  const payloadMaterializationReady = payloadMaterializationAudit.summary?.payloadsReadyForManifest === previewLocks.length;
  const manifestRewriteReady = manifestRewriteAudit.summary?.manifestRewriteReady === true;
  const hashLockContractReady = hashLockContractAudit.summary?.hashLockMaterializationReady === true;
  const allPreviewLocksWritable = previewLocks.length > 0 && previewLocks.every((lock) => lock.lockWritable);
  const writerExecutionAllowed =
    payloadMaterializationReady &&
    manifestRewriteReady &&
    hashLockContractReady &&
    allPreviewLocksWritable &&
    false;

  const productionBlockers = [];
  if (!payloadMaterializationReady) productionBlockers.push('PAYLOAD_MATERIALIZATION_GATE_NOT_READY');
  if (!manifestRewriteReady) productionBlockers.push('MANIFEST_REWRITE_GATE_NOT_READY');
  if (!hashLockContractReady) productionBlockers.push('HASH_LOCK_CONTRACT_NOT_READY');
  if (!allPreviewLocksWritable) productionBlockers.push('PREVIEW_LOCKS_NOT_WRITABLE');
  productionBlockers.push('HASH_LOCK_WRITER_EXECUTION_CLOSED');

  const dryRun = {
    schemaVersion: 'gustav-fr-lesson-hash-lock-writer-dry-run-v1',
    generatedAt,
    status: structuralBlockers.length > 0 ? 'BLOCK' : 'HOLD_WRITER_CLOSED',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    activationApproved: false,
    wouldWritePath: rel(EXPECTED_HASH_LOCK_MANIFEST_PATH),
    wouldWriteHashLockManifest: false,
    previewManifest: {
      schemaVersion: 'gustav-fr-lesson-server-manifest-hash-lock-v1',
      studyTarget: 'fr',
      targetContentLang: 'fr',
      sourceLocales: SOURCE_LOCALES,
      activationApproved: false,
      serverManifestSha256BeforeUpload: hashes.serverManifestSha256,
      payloadMaterializationAuditSha256: hashes.payloadMaterializationAuditSha256,
      manifestRewriteGateAuditSha256: hashes.manifestRewriteGateAuditSha256,
      hashLockContractAuditSha256: hashes.hashLockContractAuditSha256,
      locks: previewLocks,
    },
    sourceArtifacts: {
      serverManifest: rel(SERVER_MANIFEST_PATH),
      payloadMaterializationAudit: rel(PAYLOAD_MATERIALIZATION_AUDIT_PATH),
      manifestRewriteGateAudit: rel(MANIFEST_REWRITE_AUDIT_PATH),
      hashLockContract: rel(HASH_LOCK_CONTRACT_PATH),
      hashLockContractAudit: rel(HASH_LOCK_CONTRACT_AUDIT_PATH),
      expectedHashLockManifest: rel(EXPECTED_HASH_LOCK_MANIFEST_PATH),
    },
    summary: {
      expectedLocks: previewLocks.length,
      previewLocksWritable: previewLocks.filter((lock) => lock.lockWritable).length,
      previewLocksBlocked: previewLocks.filter((lock) => !lock.lockWritable).length,
      payloadShaRealLocks: previewLocks.filter((lock) => lock.payloadShaReal).length,
      payloadByteSizeRealLocks: previewLocks.filter((lock) => lock.payloadByteSizeReal).length,
      sourceLocaleScopedLocks: previewLocks.filter((lock) => lock.serverPathScoped).length,
      serverPathUsesPayloadShaLocks: previewLocks.filter((lock) => lock.serverPathUsesPayloadSha).length,
      existingHashLockManifestExists,
      payloadMaterializationReady,
      manifestRewriteReady,
      hashLockContractReady,
      allPreviewLocksWritable,
      writerExecutionAllowed,
      hashLockManifestWrittenByThisScript: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      structuralBlockers: structuralBlockers.length,
      productionBlockers: productionBlockers.length,
    },
    productionBlockers,
    safety: {
      readOnly: true,
      hashLockManifestWrittenByThisScript: false,
      dryRunPreviewWrittenByThisScript: true,
      serverManifestModifiedByThisScript: false,
      payloadFilesWrittenByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };
  writeJson(DRY_RUN_PATH, dryRun);

  const audit = {
    schemaVersion: 'gustav-fr-lesson-hash-lock-writer-dry-run-gate-audit-v1',
    generatedAt,
    status: structuralBlockers.length > 0 ? 'BLOCK' : 'HOLD',
    activationApproved: false,
    sourceArtifacts: dryRun.sourceArtifacts,
    hashes: {
      ...hashes,
      dryRunSha256: sha256(DRY_RUN_PATH),
    },
    summary: dryRun.summary,
    structuralBlockers,
    productionBlockers,
    safety: dryRun.safety,
    nextRequiredGates: [
      'complete_llm_official_source_review_decisions',
      'audio_tts_generation_gate',
      'audio_checksum_gate',
      'server_payload_materialization_gate',
      'manifest_rewrite_with_real_sha_and_bytes',
      'hash_lock_writer_execute_after_all_inputs_ready',
      'server_upload_policy_gate',
      'runtime_delivery_gate',
      'explicit_activation_approval_gate',
    ],
  };
  writeJson(AUDIT_PATH, audit);

  console.log(`Gustav French lesson hash-lock writer dry-run gate: ${audit.status}`);
  console.log(`Preview locks writable: ${dryRun.summary.previewLocksWritable}/${dryRun.summary.expectedLocks}`);
  console.log(`Would write hash-lock manifest: ${dryRun.wouldWriteHashLockManifest}`);
  console.log(`Writer execution allowed: ${dryRun.summary.writerExecutionAllowed}`);
  console.log(rel(AUDIT_PATH));

  if (structuralBlockers.length > 0) process.exitCode = 1;
}

main();
