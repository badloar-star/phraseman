import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server');
const RUNTIME_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime');
const ADMIN_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'admin');

const SERVER_MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson_server_pack_manifest_v1.json');
const PAYLOAD_MATERIALIZATION_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson_server_payload_materialization_gate_audit_v1.json');
const MANIFEST_REWRITE_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson_manifest_rewrite_hash_lock_gate_audit_v1.json');
const HASH_LOCK_WRITER_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson_hash_lock_writer_dry_run_gate_audit_v1.json');
const UPLOAD_POLICY_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson_server_upload_policy_gate_audit_v1.json');
const RUNTIME_DELIVERY_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson_runtime_delivery_gate_audit_v1.json');
const ACTIVATION_ROLLBACK_AUDIT_PATH = path.join(ADMIN_DIR, 'fr_admin_activation_rollback_gate_audit_v1.json');
const BOUNDARY_PATH = path.join(SERVER_DIR, 'fr_lesson_manifest_writer_apply_boundary_gate_v1.json');
const AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson_manifest_writer_apply_boundary_gate_audit_v1.json');

const TRANSITION_STEPS = [
  'review_import_all_1600_rows_accepted',
  'audio_checksum_all_1600_slots_ready',
  'server_payloads_materialized_with_real_sha_and_bytes',
  'server_manifest_rewrite_with_real_sha_and_bytes',
  'server_manifest_hash_lock_written_and_validated',
  'server_upload_policy_passes',
  'server_upload_evidence_passes',
  'runtime_delivery_index_and_cache_keys_pass',
  'admin_activation_rollback_receipt_and_hash_locks_pass',
  'explicit_activation_approval_sets_activationApproved_true',
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

function gatePassed(audit, readyKey) {
  return audit.status === 'PASS' && audit.summary?.[readyKey] === true;
}

function main() {
  const generatedAt = new Date().toISOString();
  const serverManifest = readJson(SERVER_MANIFEST_PATH);
  const payloadAudit = readJson(PAYLOAD_MATERIALIZATION_AUDIT_PATH);
  const manifestRewriteAudit = readJson(MANIFEST_REWRITE_AUDIT_PATH);
  const hashLockWriterAudit = readJson(HASH_LOCK_WRITER_AUDIT_PATH);
  const uploadPolicyAudit = readJson(UPLOAD_POLICY_AUDIT_PATH);
  const runtimeDeliveryAudit = readJson(RUNTIME_DELIVERY_AUDIT_PATH);
  const activationRollbackAudit = readJson(ACTIVATION_ROLLBACK_AUDIT_PATH);

  const structuralBlockers = [];
  if (serverManifest.schemaVersion !== 'gustav-fr-lesson-server-pack-manifest-v1') structuralBlockers.push('SERVER_MANIFEST_SCHEMA_MISMATCH');
  if (payloadAudit.schemaVersion !== 'gustav-fr-lesson-server-payload-materialization-gate-audit-v1') structuralBlockers.push('PAYLOAD_AUDIT_SCHEMA_MISMATCH');
  if (manifestRewriteAudit.schemaVersion !== 'gustav-fr-lesson-manifest-rewrite-hash-lock-gate-audit-v1') structuralBlockers.push('MANIFEST_REWRITE_AUDIT_SCHEMA_MISMATCH');
  if (hashLockWriterAudit.schemaVersion !== 'gustav-fr-lesson-hash-lock-writer-dry-run-gate-audit-v1') structuralBlockers.push('HASH_LOCK_WRITER_AUDIT_SCHEMA_MISMATCH');
  if (uploadPolicyAudit.schemaVersion !== 'gustav-fr-lesson-server-upload-policy-gate-audit-v1') structuralBlockers.push('UPLOAD_POLICY_AUDIT_SCHEMA_MISMATCH');
  if (runtimeDeliveryAudit.schemaVersion !== 'gustav-fr-lesson-runtime-delivery-gate-audit-v1') structuralBlockers.push('RUNTIME_DELIVERY_AUDIT_SCHEMA_MISMATCH');
  if (activationRollbackAudit.schemaVersion !== 'gustav-fr-admin-activation-rollback-gate-audit-v1') structuralBlockers.push('ACTIVATION_ROLLBACK_AUDIT_SCHEMA_MISMATCH');

  const transitionMatrix = [
    {
      step: TRANSITION_STEPS[0],
      status: 'BLOCKED_UPSTREAM',
      evidence: 'review_decision_import_dry_run_gate',
      allowedNow: false,
      reason: 'not re-opened by this boundary gate',
    },
    {
      step: TRANSITION_STEPS[1],
      status: 'BLOCKED_UPSTREAM',
      evidence: 'audio_checksum_gate',
      allowedNow: false,
      reason: 'not re-opened by this boundary gate',
    },
    {
      step: TRANSITION_STEPS[2],
      status: payloadAudit.summary?.payloadsReadyForManifest === payloadAudit.summary?.expectedPayloads ? 'READY' : 'HOLD',
      evidence: rel(PAYLOAD_MATERIALIZATION_AUDIT_PATH),
      allowedNow: false,
      reason: payloadAudit.summary?.payloadsReadyForManifest === payloadAudit.summary?.expectedPayloads
        ? 'payload audit claims ready but boundary still requires separate manifest rewrite step'
        : 'payloads are not materialized with real sha/bytes',
    },
    {
      step: TRANSITION_STEPS[3],
      status: manifestRewriteAudit.summary?.manifestRewriteReady === true ? 'READY' : 'HOLD',
      evidence: rel(MANIFEST_REWRITE_AUDIT_PATH),
      allowedNow: false,
      reason: 'manifest rewrite must happen only after payload materialization PASS and cannot imply upload/runtime/apply',
    },
    {
      step: TRANSITION_STEPS[4],
      status: hashLockWriterAudit.summary?.writerExecutionAllowed === true ? 'READY' : 'HOLD',
      evidence: rel(HASH_LOCK_WRITER_AUDIT_PATH),
      allowedNow: false,
      reason: 'hash-lock writer is dry-run only until all preview locks are writable',
    },
    {
      step: TRANSITION_STEPS[5],
      status: uploadPolicyAudit.summary?.uploadExecutionAllowed === true ? 'READY' : 'HOLD',
      evidence: rel(UPLOAD_POLICY_AUDIT_PATH),
      allowedNow: false,
      reason: 'upload policy cannot PASS until manifest/hash-lock/audio gates are PASS',
    },
    {
      step: TRANSITION_STEPS[6],
      status: 'MISSING_GATE',
      evidence: 'server_upload_evidence_gate',
      allowedNow: false,
      reason: 'server upload evidence gate has not been created yet',
    },
    {
      step: TRANSITION_STEPS[7],
      status: runtimeDeliveryAudit.summary?.readyForRuntimeDelivery === true ? 'READY' : 'HOLD',
      evidence: rel(RUNTIME_DELIVERY_AUDIT_PATH),
      allowedNow: false,
      reason: 'runtime index/download/cache changes are blocked until upload evidence PASS',
    },
    {
      step: TRANSITION_STEPS[8],
      status: activationRollbackAudit.summary?.readyForApply === true ? 'READY' : 'HOLD',
      evidence: rel(ACTIVATION_ROLLBACK_AUDIT_PATH),
      allowedNow: false,
      reason: 'approval receipt/hash locks/upstream gates are not ready',
    },
    {
      step: TRANSITION_STEPS[9],
      status: 'FINAL_ONLY',
      evidence: 'explicit_activation_approval_gate',
      allowedNow: false,
      reason: 'activationApproved=true is forbidden before all previous steps are PASS',
    },
  ];

  const illegalOneStepTransitionProbes = [
    {
      id: 'rewrite_manifest_and_upload_same_step_rejected',
      requestedTransitions: ['server_manifest_rewrite_with_real_sha_and_bytes', 'server_upload_policy_passes'],
      accepted: false,
      reason: 'manifest rewrite and upload require separate PASS artifacts',
    },
    {
      id: 'hash_lock_write_and_runtime_index_same_step_rejected',
      requestedTransitions: ['server_manifest_hash_lock_written_and_validated', 'runtime_delivery_index_and_cache_keys_pass'],
      accepted: false,
      reason: 'hash-lock validation and runtime delivery require upload evidence between them',
    },
    {
      id: 'upload_and_activation_same_step_rejected',
      requestedTransitions: ['server_upload_policy_passes', 'explicit_activation_approval_sets_activationApproved_true'],
      accepted: false,
      reason: 'activation requires runtime/admin/rollback gates after upload evidence',
    },
    {
      id: 'runtime_downloads_before_upload_evidence_rejected',
      requestedTransitions: ['runtime_delivery_index_and_cache_keys_pass'],
      accepted: false,
      reason: 'server_upload_evidence_gate is missing',
    },
  ];

  const allTransitionsClosed = transitionMatrix.every((step) => step.allowedNow === false);
  const noProductionFlagsOpen =
    serverManifest.activationApproved === false &&
    serverManifest.serverDelivery?.serverUploadAllowed === false &&
    serverManifest.serverDelivery?.firebaseUploadAllowed === false &&
    serverManifest.serverDelivery?.runtimeDownloadsEnabled === false &&
    serverManifest.serverDelivery?.productionApplyApproved === false &&
    uploadPolicyAudit.summary?.firebaseUploadAllowed === false &&
    uploadPolicyAudit.summary?.runtimeDownloadsEnabled === false &&
    runtimeDeliveryAudit.summary?.runtimeDownloadAllowedRows === 0 &&
    activationRollbackAudit.summary?.activationApproved === false;

  const productionBlockers = [
    'REVIEW_DECISIONS_NOT_COMPLETE',
    'AUDIO_CHECKSUM_GATE_NOT_READY',
    'PAYLOAD_MATERIALIZATION_GATE_NOT_READY',
    'MANIFEST_REWRITE_GATE_NOT_READY',
    'HASH_LOCK_WRITER_NOT_READY',
    'SERVER_UPLOAD_EVIDENCE_GATE_MISSING',
    'RUNTIME_DELIVERY_GATE_NOT_READY',
    'EXPLICIT_ACTIVATION_APPROVAL_MISSING',
  ];

  const summary = {
    transitionSteps: transitionMatrix.length,
    transitionsAllowedNow: transitionMatrix.filter((step) => step.allowedNow).length,
    transitionsClosed: transitionMatrix.filter((step) => !step.allowedNow).length,
    illegalOneStepTransitionProbes: illegalOneStepTransitionProbes.length,
    illegalOneStepTransitionProbesRejected: illegalOneStepTransitionProbes.filter((probe) => probe.accepted === false).length,
    allTransitionsClosed,
    noProductionFlagsOpen,
    serverManifestRewriteAllowed: false,
    hashLockWriteAllowed: false,
    serverUploadAllowed: false,
    firebaseUploadAllowed: false,
    runtimeIndexMutationAllowed: false,
    runtimeDownloadsEnabled: false,
    productionApplyApproved: false,
    activationApproved: false,
    readyForServerUpload: false,
    readyForRuntimeDelivery: false,
    readyForApply: false,
    structuralBlockers: structuralBlockers.length,
    productionBlockers: productionBlockers.length,
  };

  const boundary = {
    schemaVersion: 'gustav-fr-lesson-manifest-writer-apply-boundary-gate-v1',
    generatedAt,
    status: structuralBlockers.length > 0 ? 'BLOCK' : 'HOLD_BOUNDARY_CLOSED',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    sourceArtifacts: {
      serverManifest: rel(SERVER_MANIFEST_PATH),
      payloadMaterializationAudit: rel(PAYLOAD_MATERIALIZATION_AUDIT_PATH),
      manifestRewriteAudit: rel(MANIFEST_REWRITE_AUDIT_PATH),
      hashLockWriterAudit: rel(HASH_LOCK_WRITER_AUDIT_PATH),
      uploadPolicyAudit: rel(UPLOAD_POLICY_AUDIT_PATH),
      runtimeDeliveryAudit: rel(RUNTIME_DELIVERY_AUDIT_PATH),
      activationRollbackAudit: rel(ACTIVATION_ROLLBACK_AUDIT_PATH),
    },
    boundaryRules: {
      oneStepProductionPromotionAllowed: false,
      serverManifestRewriteAllowed: false,
      hashLockWriteAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeIndexMutationAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
      requiredTransitionOrder: TRANSITION_STEPS,
    },
    transitionMatrix,
    illegalOneStepTransitionProbes,
    summary,
    productionBlockers,
    safety: {
      readOnly: true,
      serverManifestModifiedByThisScript: false,
      hashLockManifestWrittenByThisScript: false,
      runtimeIndexModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };
  writeJson(BOUNDARY_PATH, boundary);

  const audit = {
    schemaVersion: 'gustav-fr-lesson-manifest-writer-apply-boundary-gate-audit-v1',
    generatedAt,
    status: structuralBlockers.length > 0 ? 'BLOCK' : 'HOLD',
    activationApproved: false,
    sourceArtifacts: boundary.sourceArtifacts,
    hashes: {
      serverManifestSha256: sha256(SERVER_MANIFEST_PATH),
      payloadMaterializationAuditSha256: sha256(PAYLOAD_MATERIALIZATION_AUDIT_PATH),
      manifestRewriteAuditSha256: sha256(MANIFEST_REWRITE_AUDIT_PATH),
      hashLockWriterAuditSha256: sha256(HASH_LOCK_WRITER_AUDIT_PATH),
      uploadPolicyAuditSha256: sha256(UPLOAD_POLICY_AUDIT_PATH),
      runtimeDeliveryAuditSha256: sha256(RUNTIME_DELIVERY_AUDIT_PATH),
      activationRollbackAuditSha256: sha256(ACTIVATION_ROLLBACK_AUDIT_PATH),
      boundarySha256: sha256(BOUNDARY_PATH),
    },
    summary,
    structuralBlockers,
    productionBlockers,
    safety: boundary.safety,
    nextRequiredGates: [
      'complete_llm_official_source_review_decisions',
      'audio_tts_generation_gate',
      'audio_checksum_gate',
      'server_upload_evidence_gate',
      'runtime_delivery_gate',
      'explicit_activation_approval_gate',
    ],
  };
  writeJson(AUDIT_PATH, audit);

  console.log(`Gustav French lesson manifest writer/apply boundary gate: ${audit.status}`);
  console.log(`Transitions allowed now: ${summary.transitionsAllowedNow}/${summary.transitionSteps}`);
  console.log(`Illegal one-step probes rejected: ${summary.illegalOneStepTransitionProbesRejected}/${summary.illegalOneStepTransitionProbes}`);
  console.log(`Production flags open: ${summary.noProductionFlagsOpen ? 'no' : 'yes'}`);
  console.log(rel(AUDIT_PATH));

  if (structuralBlockers.length > 0) process.exitCode = 1;
}

main();
