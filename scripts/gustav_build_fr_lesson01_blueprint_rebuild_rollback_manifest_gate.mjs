import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'lesson01_blueprint_rebuild');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

const PAYLOAD_HASH_LOCK_CONTRACT_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_payload_hash_lock_gate_v1.json');
const PAYLOAD_HASH_LOCK_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json');
const SERVER_MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_server_pack_manifest_v1.json');
const ROLLBACK_MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_rollback_manifest_draft_v1.json');
const AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_rollback_manifest_gate_audit_v1.json');
const MD_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_rollback_manifest_gate_v1.md');

const SOURCE_LOCALES = ['ru', 'uk'];
const DENIED_ROLLBACK_SCOPES = [
  'course-packs/fr/',
  'course-packs/fr/uiLocale/',
  'course-packs/fr/sourceLocale/',
  'course-packs/en/',
  'card_packs',
  'community_packs',
];

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

function rollbackScopeFor(sourceLocale) {
  return `course-packs/fr/${sourceLocale}/`;
}

function isSafeRollbackScope(scope) {
  return /^course-packs\/fr\/(?:ru|uk)\/$/.test(scope);
}

function buildRollbackEntry(lock, serverManifestSha256, payloadHashLockGateAuditSha256) {
  return {
    rollbackId: `rollback.${lock.lockId}`,
    lockId: lock.lockId,
    packId: lock.packId,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocale: lock.sourceLocale,
    surface: lock.surface,
    lessonId: 1,
    contentVersion: lock.contentVersion,
    rollbackScope: lock.requiredRollbackScope,
    targetServerPath: lock.requiredServerPath,
    expectedPayloadSha256: lock.requiredPayloadSha256,
    expectedPayloadByteSize: lock.requiredPayloadByteSize,
    serverManifestSha256BeforeUpload: serverManifestSha256,
    payloadHashLockGateAuditSha256,
    remotePreUploadState: 'no_upload_evidence_yet',
    rollbackAction: 'delete_uploaded_object_or_restore_previous_hash_locked_object',
    rollbackExecutionAllowedNow: false,
    serverDeleteAllowedNow: false,
    serverRestoreAllowedNow: false,
    runtimeCacheInvalidationAllowedNow: false,
    activationApproved: false,
    blockers: ['blocked_pending_hash_lock_manifest_upload_evidence_and_activation_receipt'],
  };
}

function markdownFor(audit) {
  const lines = [
    '# French Lesson 1 Blueprint Rebuild Rollback Manifest Gate',
    '',
    `Status: ${audit.status}`,
    `Rollback entries: ${audit.summary.rollbackEntries}`,
    `Safe rollback scopes: ${audit.summary.safeRollbackScopes}`,
    `Rollback executable entries: ${audit.summary.rollbackExecutionAllowedEntries}`,
    '',
    '## Current Hold',
    '',
    ...audit.blockers.map((blocker) => `- ${blocker}`),
    '',
    '## Safety',
    '',
    `- rollbackManifestDraftOnly: ${audit.safety.rollbackManifestDraftOnly}`,
    `- serverDeleteAllowed: ${audit.safety.serverDeleteAllowed}`,
    `- runtimeDownloadsEnabled: ${audit.safety.runtimeDownloadsEnabled}`,
    `- activationApproved: ${audit.safety.activationApproved}`,
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function main() {
  const generatedAt = new Date().toISOString();
  const payloadContract = readJson(PAYLOAD_HASH_LOCK_CONTRACT_PATH);
  const payloadAudit = readJson(PAYLOAD_HASH_LOCK_AUDIT_PATH);
  const serverManifest = readJson(SERVER_MANIFEST_PATH);
  const blockers = [];

  if (payloadContract.schemaVersion !== 'gustav-fr-lesson01-blueprint-rebuild-payload-hash-lock-gate-v1') {
    blockers.push('PAYLOAD_HASH_LOCK_CONTRACT_SCHEMA_MISMATCH');
  }
  if (payloadAudit.status !== 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED') {
    blockers.push('PAYLOAD_HASH_LOCK_GATE_NOT_CLOSED_HOLD');
  }
  if (serverManifest.schemaVersion !== 'gustav-fr-lesson01-blueprint-rebuild-server-pack-manifest-v1') {
    blockers.push('SERVER_MANIFEST_SCHEMA_MISMATCH');
  }
  if (!Array.isArray(payloadContract.expectedHashLocks) || payloadContract.expectedHashLocks.length !== 4) {
    blockers.push('EXPECTED_4_HASH_LOCK_EXPECTATIONS');
  }
  if (!Array.isArray(serverManifest.entries) || serverManifest.entries.length !== 4) {
    blockers.push('EXPECTED_4_SERVER_MANIFEST_ENTRIES');
  }

  const serverManifestSha256 = sha256File(SERVER_MANIFEST_PATH);
  const payloadHashLockAuditSha256 = sha256File(PAYLOAD_HASH_LOCK_AUDIT_PATH);
  const rollbackEntries = (payloadContract.expectedHashLocks || []).map((lock) =>
    buildRollbackEntry(lock, serverManifestSha256, payloadHashLockAuditSha256),
  );

  for (const locale of SOURCE_LOCALES) {
    if (!rollbackEntries.some((entry) => entry.sourceLocale === locale && entry.surface === 'lesson')) {
      blockers.push(`MISSING_ROLLBACK_ENTRY_${locale}_lesson`);
    }
    if (!rollbackEntries.some((entry) => entry.sourceLocale === locale && entry.surface === 'audio_metadata')) {
      blockers.push(`MISSING_ROLLBACK_ENTRY_${locale}_audio_metadata`);
    }
  }

  for (const entry of rollbackEntries) {
    if (entry.studyTarget !== 'fr' || entry.targetContentLang !== 'fr') blockers.push(`${entry.rollbackId}: language identity mismatch`);
    if (!SOURCE_LOCALES.includes(entry.sourceLocale)) blockers.push(`${entry.rollbackId}: invalid sourceLocale`);
    if (!isSafeRollbackScope(entry.rollbackScope)) blockers.push(`${entry.rollbackId}: unsafe rollback scope`);
    if (!entry.targetServerPath.startsWith(`course-packs/fr/${entry.sourceLocale}/${entry.surface}/lesson01_blueprint_rebuild/`)) {
      blockers.push(`${entry.rollbackId}: target server path not source-locale scoped`);
    }
    if (DENIED_ROLLBACK_SCOPES.includes(entry.rollbackScope)) blockers.push(`${entry.rollbackId}: denied rollback scope used`);
    if (
      entry.rollbackExecutionAllowedNow ||
      entry.serverDeleteAllowedNow ||
      entry.serverRestoreAllowedNow ||
      entry.runtimeCacheInvalidationAllowedNow ||
      entry.activationApproved
    ) {
      blockers.push(`${entry.rollbackId}: rollback execution flag opened`);
    }
  }

  const rollbackScopes = [...new Set(rollbackEntries.map((entry) => entry.rollbackScope))].sort();
  const manifest = {
    schemaVersion: 'gustav-fr-lesson01-blueprint-rebuild-rollback-manifest-draft-v1',
    generatedAt,
    status: blockers.length === 0 ? 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED' : 'BLOCK_ROLLBACK_MANIFEST_DRAFT_INVALID',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: 1,
    sourceArtifacts: {
      payloadHashLockContract: rel(PAYLOAD_HASH_LOCK_CONTRACT_PATH),
      payloadHashLockAudit: rel(PAYLOAD_HASH_LOCK_AUDIT_PATH),
      serverManifest: rel(SERVER_MANIFEST_PATH),
    },
    rollbackPolicy: {
      rollbackScopes,
      deniedRollbackScopes: DENIED_ROLLBACK_SCOPES,
      requiresHashLockManifest: true,
      requiresServerUploadEvidence: true,
      requiresRuntimeCacheIntegrityGate: true,
      requiresExplicitActivationReceipt: true,
      rollbackManifestDraftOnly: true,
      rollbackExecutionAllowedNow: false,
      serverDeleteAllowedNow: false,
      serverRestoreAllowedNow: false,
      runtimeCacheInvalidationAllowedNow: false,
      activationApproved: false,
    },
    entries: rollbackEntries,
    safety: {
      rollbackManifestDraftOnly: true,
      rollbackManifestWrittenByThisScript: true,
      serverDeleteAllowed: false,
      serverRestoreAllowed: false,
      firebaseOrServerMutationStarted: false,
      runtimeCacheInvalidationAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };
  writeJson(ROLLBACK_MANIFEST_PATH, manifest);

  const audit = {
    schemaVersion: 'gustav-fr-lesson01-blueprint-rebuild-rollback-manifest-gate-audit-v1',
    generatedAt,
    status: manifest.status,
    blockers: blockers.length === 0 ? ['blocked_pending_hash_lock_manifest_upload_evidence_and_activation_receipt'] : blockers,
    sourceArtifacts: {
      rollbackManifestDraft: rel(ROLLBACK_MANIFEST_PATH),
      payloadHashLockContract: rel(PAYLOAD_HASH_LOCK_CONTRACT_PATH),
      payloadHashLockAudit: rel(PAYLOAD_HASH_LOCK_AUDIT_PATH),
      serverManifest: rel(SERVER_MANIFEST_PATH),
    },
    hashes: {
      rollbackManifestDraftSha256: sha256File(ROLLBACK_MANIFEST_PATH),
      payloadHashLockContractSha256: sha256File(PAYLOAD_HASH_LOCK_CONTRACT_PATH),
      payloadHashLockAuditSha256,
      serverManifestSha256,
    },
    summary: {
      rollbackEntries: rollbackEntries.length,
      rollbackScopes: rollbackScopes.length,
      safeRollbackScopes: rollbackScopes.filter(isSafeRollbackScope).length,
      deniedRollbackScopeHits: rollbackEntries.filter((entry) => DENIED_ROLLBACK_SCOPES.includes(entry.rollbackScope)).length,
      sourceLocaleScopedTargets: rollbackEntries.filter((entry) => entry.targetServerPath.startsWith(`course-packs/fr/${entry.sourceLocale}/${entry.surface}/lesson01_blueprint_rebuild/`)).length,
      rollbackExecutionAllowedEntries: rollbackEntries.filter((entry) => entry.rollbackExecutionAllowedNow).length,
      serverDeleteAllowedEntries: rollbackEntries.filter((entry) => entry.serverDeleteAllowedNow).length,
      serverRestoreAllowedEntries: rollbackEntries.filter((entry) => entry.serverRestoreAllowedNow).length,
      runtimeCacheInvalidationAllowedEntries: rollbackEntries.filter((entry) => entry.runtimeCacheInvalidationAllowedNow).length,
      activationApprovedEntries: rollbackEntries.filter((entry) => entry.activationApproved).length,
      readyForRollbackExecution: false,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    },
    productionBlockers: [
      'HASH_LOCK_MANIFEST_NOT_WRITTEN',
      'SERVER_UPLOAD_EVIDENCE_NOT_READY',
      'RUNTIME_CACHE_INTEGRITY_GATE_NOT_READY',
      'EXPLICIT_ACTIVATION_RECEIPT_MISSING',
      'ROLLBACK_EXECUTION_CLOSED',
      'FULL_32_LESSON_PARITY_NOT_DONE',
    ],
    safety: manifest.safety,
    nextRequiredGates: [
      'audio_checksum_gate',
      'payload_materialization_execution_gate',
      'hash_lock_manifest_materialization_gate',
      'server_upload_evidence_gate',
      'runtime_cache_integrity_gate',
      'explicit_activation_approval_gate',
    ],
  };
  writeJson(AUDIT_PATH, audit);
  fs.writeFileSync(MD_PATH, markdownFor(audit), 'utf8');

  if (fs.existsSync(STATE_PATH)) {
    const state = readJson(STATE_PATH);
    state.lesson01BlueprintRebuildRollbackManifest = rel(ROLLBACK_MANIFEST_PATH);
    state.lesson01BlueprintRebuildRollbackManifestGateAudit = rel(AUDIT_PATH);
    state.lesson01BlueprintRebuildRollbackManifestStatus = audit.status;
    state.lesson01BlueprintRebuildRollbackManifestSummary = audit.summary;
    state.nextPassPlan = [
      'Create Lesson 1 server upload evidence gate that remains closed until payload/hash-lock/audio pass.',
      'Create Lesson 1 runtime cache integrity gate tied to rollback manifest.',
      'Then start Lesson 2 blueprint-first rebuild using Lesson 1 gates as template.',
    ];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`${audit.status} rollbackEntries=${rollbackEntries.length} rollbackExecution=0 activation=false blockers=${blockers.length}`);
  if (audit.status === 'BLOCK_ROLLBACK_MANIFEST_DRAFT_INVALID') process.exitCode = 1;
}

main();
