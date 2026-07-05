import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'activation');
const AUDIT_PATH = path.join(OUT_DIR, 'fr_activation_completion_audit_v2.json');
const MD_PATH = path.join(OUT_DIR, 'fr_activation_completion_audit_v2.md');

const INPUTS = {
  lessonRebuildCandidateAudit: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'fr_lesson_rebuild_candidate_audit.json'),
  llmReviewDecisionProgressGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_llm_review_decision_progress_gate_audit_v1.json'),
  llmReviewLaunchContract: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_llm_review_launch_contract_audit_v1.json'),
  decisionStagingGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_decision_staging_gate_audit_v1.json'),
  decisionImportSourceGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_decision_import_source_gate_audit_v1.json'),
  reviewDecisionImportDryRun: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_review_decision_import_dry_run_audit_v1.json'),
  audioManifestGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'fr_lesson_audio_manifest_gate_audit_v1.json'),
  audioTtsBatchPlan: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'fr_lesson_audio_tts_batch_plan_audit_v1.json'),
  audioChecksumGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'fr_lesson_audio_checksum_gate_audit_v1.json'),
  serverPackManifestGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_server_pack_manifest_gate_audit_v1.json'),
  serverPayloadMaterializationGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_server_payload_materialization_gate_audit_v1.json'),
  manifestRewriteHashLockGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_manifest_rewrite_hash_lock_gate_audit_v1.json'),
  hashLockMaterializationContract: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_hash_lock_materialization_contract_audit_v1.json'),
  hashLockWriterDryRunGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_hash_lock_writer_dry_run_gate_audit_v1.json'),
  manifestWriterApplyBoundaryGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_manifest_writer_apply_boundary_gate_audit_v1.json'),
  serverUploadPolicyGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_server_upload_policy_gate_audit_v1.json'),
  serverUploadEvidenceGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_server_upload_evidence_gate_audit_v1.json'),
  runtimeDeliveryGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', 'fr_lesson_runtime_delivery_gate_audit_v1.json'),
  storageCloudIsolationGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'storage', 'fr_storage_cloud_isolation_gate_audit_v1.json'),
  adminParityIsolationGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'admin', 'fr_admin_parity_isolation_gate_audit_v1.json'),
  adminActivationRollbackGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'admin', 'fr_admin_activation_rollback_gate_audit_v1.json'),
};

const EXPECTED_ROWS = 1600;
const EXPECTED_SERVER_OBJECTS = 4;
const EXPLICIT_APPROVAL_RECEIPT = path.join(OUT_DIR, 'fr_explicit_activation_approval_receipt_v1.json');
const ACTIVE_HASH_LOCK_MANIFEST = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_server_manifest_hash_lock_v1.json');

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sha256(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function bool(value) {
  return value === true;
}

function req(id, name, audit, passed, blockerCode, currentEvidence, extra = {}) {
  return {
    id,
    name,
    evidenceArtifact: audit ? rel(audit.path) : '',
    evidenceStatus: audit?.json?.status || 'MISSING',
    passed: Boolean(passed),
    blockerCode: passed ? '' : blockerCode,
    currentEvidence,
    ...extra,
  };
}

function renderMarkdown(audit) {
  const lines = [
    '# French Activation Completion Audit V2',
    '',
    `Verdict: \`${audit.status}\``,
    `Activation approved: \`${audit.activationApproved}\``,
    `Ready for production activation: \`${audit.summary.readyForProductionActivation}\``,
    '',
    '## Reasoning Policy',
    '',
    `Required level for production decisions: \`${audit.reasoningPolicy.requiredForProductionDecisions}\``,
    `Required level for content/research review: \`${audit.reasoningPolicy.requiredForContentAndResearchReview}\``,
    `Allowed for mechanical report regeneration: \`${audit.reasoningPolicy.allowedForMechanicalReportRegeneration}\``,
    '',
    '## Hard Requirements',
    '',
    ...audit.hardRequirements.map((item) => `- ${item.passed ? 'PASS' : 'HOLD'}: \`${item.id}\` (${item.blockerCode || 'ok'})`),
    '',
    '## Next Required Actions',
    '',
    ...audit.nextRequiredActions.map((action) => `- ${action}`),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function main() {
  const generatedAt = new Date().toISOString();
  const audits = Object.fromEntries(Object.entries(INPUTS).map(([key, filePath]) => [
    key,
    { path: filePath, exists: fs.existsSync(filePath), json: fs.existsSync(filePath) ? readJson(filePath) : null },
  ]));

  const progress = audits.llmReviewDecisionProgressGate.json || {};
  const launch = audits.llmReviewLaunchContract.json || {};
  const staging = audits.decisionStagingGate.json || {};
  const importSource = audits.decisionImportSourceGate.json || {};
  const reviewImport = audits.reviewDecisionImportDryRun.json || {};
  const audioManifest = audits.audioManifestGate.json || {};
  const ttsPlan = audits.audioTtsBatchPlan.json || {};
  const audioChecksum = audits.audioChecksumGate.json || {};
  const serverManifest = audits.serverPackManifestGate.json || {};
  const payload = audits.serverPayloadMaterializationGate.json || {};
  const rewrite = audits.manifestRewriteHashLockGate.json || {};
  const hashLock = audits.hashLockMaterializationContract.json || {};
  const hashWriter = audits.hashLockWriterDryRunGate.json || {};
  const writerBoundary = audits.manifestWriterApplyBoundaryGate.json || {};
  const uploadPolicy = audits.serverUploadPolicyGate.json || {};
  const uploadEvidence = audits.serverUploadEvidenceGate.json || {};
  const runtime = audits.runtimeDeliveryGate.json || {};
  const storage = audits.storageCloudIsolationGate.json || {};
  const adminParity = audits.adminParityIsolationGate.json || {};
  const adminActivation = audits.adminActivationRollbackGate.json || {};
  const lessonRebuild = audits.lessonRebuildCandidateAudit.json || {};

  const explicitApprovalReceiptExists = fs.existsSync(EXPLICIT_APPROVAL_RECEIPT);
  const activeHashLockManifestExists = fs.existsSync(ACTIVE_HASH_LOCK_MANIFEST);
  const activationApproved = false;

  const hardRequirements = [
    req(
      'lesson_scope_sequence_reconciled',
      'All 32 French lesson ledgers are reconciled against the target-specific French scope sequence before LLM/audio/server work can imply readiness.',
      audits.lessonRebuildCandidateAudit,
      lessonRebuild.gates?.scope_sequence_reconciliation_gate === 'PASS' &&
        (lessonRebuild.reconciliationRequiredLedgers || []).length === 0,
      'LESSON_SCOPE_SEQUENCE_RECONCILIATION_HOLD',
      {
        candidateLedgersPresentGate: lessonRebuild.gates?.candidate_ledgers_present_gate || 'MISSING',
        scopeSequenceReconciliationGate: lessonRebuild.gates?.scope_sequence_reconciliation_gate || 'MISSING',
        preRebuildRequired: lessonRebuild.reconciliationSummary?.rebuildRequired || 0,
        needsReview: lessonRebuild.reconciliationSummary?.needsReview || 0,
        postRebuildMismatches: lessonRebuild.postRebuildScopeReconciliation?.mismatchCount || 0,
        reconciliationRequiredLedgers: (lessonRebuild.reconciliationRequiredLedgers || []).length,
      },
      { requiredReasoningLevel: 'deep' },
    ),
    req(
      'llm_review_decisions_complete',
      'All 1600 French lesson rows have LLM official-source review decisions.',
      audits.llmReviewDecisionProgressGate,
      progress.summary?.decisionRows === EXPECTED_ROWS && progress.summary?.missingDecisionRows === 0 && bool(progress.summary?.readyForDecisionImportDryRun),
      'LLM_REVIEW_DECISIONS_INCOMPLETE',
      {
        requestRows: progress.summary?.requestRows || 0,
        decisionRows: progress.summary?.decisionRows || 0,
        missingDecisionRows: progress.summary?.missingDecisionRows || EXPECTED_ROWS,
        remainingBatches: progress.summary?.remainingBatches || 0,
      },
      { requiredReasoningLevel: 'deep' },
    ),
    req(
      'llm_review_launch_contract_ready',
      'Live LLM review launch is bounded by batch size, cost, resume, dry-run and validation rules.',
      audits.llmReviewLaunchContract,
      launch.summary?.nextBatchWithinLimits === true &&
        launch.summary?.existingLedgerValid === true &&
        launch.summary?.preAppendValidatorReady === true,
      'LLM_REVIEW_LAUNCH_CONTRACT_NOT_READY',
      {
        nextBatchWithinLimits: Boolean(launch.summary?.nextBatchWithinLimits),
        maxRowsPerLiveLaunch: launch.summary?.maxRowsPerLiveLaunch || 0,
        maxCostPerLiveLaunchUsd: launch.summary?.maxCostPerLiveLaunchUsd || 0,
        existingLedgerValid: Boolean(launch.summary?.existingLedgerValid),
        preAppendValidatorReady: Boolean(launch.summary?.preAppendValidatorReady),
        canExecuteLiveNow: Boolean(launch.summary?.canExecuteLiveNow),
      },
      { requiredReasoningLevel: 'deep' },
    ),
    req(
      'decision_staging_or_canonical_source_ready',
      'A 1600-row canonical decision source exists, or a structurally valid candidate is ready for canonical staging.',
      audits.decisionStagingGate,
      staging.summary?.readyForCanonicalDecisionSource === true,
      'DECISION_STAGING_OR_CANONICAL_SOURCE_NOT_READY',
      {
        candidateProvided: Boolean(staging.summary?.candidateProvided),
        candidateReadyForCanonicalStaging: Boolean(staging.summary?.candidateReadyForCanonicalStaging),
        canonicalSourceAlreadyReady: Boolean(staging.summary?.canonicalSourceAlreadyReady),
        readyForCanonicalDecisionSource: Boolean(staging.summary?.readyForCanonicalDecisionSource),
      },
      { requiredReasoningLevel: 'deep' },
    ),
    req(
      'decision_import_source_ready',
      'Reviewer import may read only the canonical French decision JSONL after schema gate PASS.',
      audits.decisionImportSourceGate,
      importSource.summary?.importSourceAccepted === true && importSource.summary?.schemaGateReady === true,
      'DECISION_IMPORT_SOURCE_NOT_READY',
      {
        canonicalDecisionSourceExists: Boolean(importSource.summary?.canonicalDecisionSourceExists),
        decisionRows: importSource.summary?.decisionRows || 0,
        schemaGateReady: Boolean(importSource.summary?.schemaGateReady),
        importSourceAccepted: Boolean(importSource.summary?.importSourceAccepted),
        importExecutionAllowed: Boolean(importSource.summary?.importExecutionAllowed),
      },
      { requiredReasoningLevel: 'deep' },
    ),
    req(
      'review_import_all_rows_accepted',
      'Review import dry-run proves every row is accepted before any downstream materialization.',
      audits.reviewDecisionImportDryRun,
      reviewImport.summary?.acceptedRows === EXPECTED_ROWS && bool(reviewImport.summary?.allRowsAccepted) && bool(reviewImport.summary?.readyForAudioManifestGate),
      'REVIEW_IMPORT_NOT_ACCEPTED',
      {
        acceptedRows: reviewImport.summary?.acceptedRows || 0,
        rejectedRows: reviewImport.summary?.rejectedRows || 0,
        regenerationRows: reviewImport.summary?.regenerationRows || 0,
        allRowsAccepted: bool(reviewImport.summary?.allRowsAccepted),
      },
      { requiredReasoningLevel: 'deep' },
    ),
    req(
      'audio_manifest_ready_for_tts',
      'Audio manifest allows all French phrase slots to be generated by the target TTS path.',
      audits.audioManifestGate,
      audioManifest.summary?.ttsGenerationAllowedSlots === EXPECTED_ROWS && bool(audioManifest.summary?.readyForTtsGeneration),
      'AUDIO_MANIFEST_NOT_READY_FOR_TTS',
      {
        audioSlots: audioManifest.summary?.audioSlots || 0,
        ttsGenerationAllowedSlots: audioManifest.summary?.ttsGenerationAllowedSlots || 0,
        ttsProvider: audioManifest.summary?.ttsProvider || '',
        ttsModel: audioManifest.summary?.ttsModel || '',
      },
      { requiredReasoningLevel: 'deep' },
    ),
    req(
      'audio_tts_batches_complete',
      'Live TTS execution has completed and all planned audio batches have evidence.',
      audits.audioTtsBatchPlan,
      ttsPlan.summary?.ttsGenerationAllowedSlots === EXPECTED_ROWS && bool(ttsPlan.summary?.readyForAudioChecksumGate),
      'AUDIO_TTS_NOT_READY',
      {
        plannedBatches: ttsPlan.summary?.plannedBatches || 0,
        ttsGenerationAllowedSlots: ttsPlan.summary?.ttsGenerationAllowedSlots || 0,
        ttsGenerationBlockedSlots: ttsPlan.summary?.ttsGenerationBlockedSlots || EXPECTED_ROWS,
        spendGuardOpen: bool(ttsPlan.summary?.spendGuardOpen),
        canExecuteLiveTtsNow: bool(ttsPlan.summary?.canExecuteLiveTtsNow),
      },
      { requiredReasoningLevel: 'deep' },
    ),
    req(
      'audio_checksums_ready',
      'All mp3 files exist, have valid signatures, and match locked checksums.',
      audits.audioChecksumGate,
      audioChecksum.summary?.checksumReadySlots === EXPECTED_ROWS && bool(audioChecksum.summary?.allChecksumsReady),
      'AUDIO_CHECKSUMS_NOT_READY',
      {
        audioSlots: audioChecksum.summary?.audioSlots || 0,
        existingAudioFiles: audioChecksum.summary?.existingAudioFiles || 0,
        missingAudioFiles: audioChecksum.summary?.missingAudioFiles || EXPECTED_ROWS,
        checksumReadySlots: audioChecksum.summary?.checksumReadySlots || 0,
      },
      { requiredReasoningLevel: 'deep' },
    ),
    req(
      'server_pack_manifest_ready',
      'Server pack manifest is source-locale scoped and ready for upload.',
      audits.serverPackManifestGate,
      serverManifest.summary?.serverUploadAllowedEntries === EXPECTED_SERVER_OBJECTS && bool(serverManifest.summary?.readyForServerUpload),
      'SERVER_PACK_MANIFEST_NOT_READY',
      {
        serverManifestEntries: serverManifest.summary?.serverManifestEntries || 0,
        sourceLocaleScopedEntries: serverManifest.summary?.sourceLocaleScopedEntries || 0,
        serverUploadAllowedEntries: serverManifest.summary?.serverUploadAllowedEntries || 0,
      },
      { requiredReasoningLevel: 'deep' },
    ),
    req(
      'payload_materialization_ready',
      'Server payload files exist with real bytes and real hashes before manifest rewrite.',
      audits.serverPayloadMaterializationGate,
      payload.summary?.payloadsReadyForManifest === EXPECTED_SERVER_OBJECTS && bool(payload.summary?.readyForServerUpload),
      'PAYLOAD_MATERIALIZATION_NOT_READY',
      {
        expectedPayloads: payload.summary?.expectedPayloads || 0,
        existingPayloadFiles: payload.summary?.existingPayloadFiles || 0,
        payloadsReadyForManifest: payload.summary?.payloadsReadyForManifest || 0,
        materializationAllowedNow: bool(payload.summary?.materializationAllowedNow),
      },
      { requiredReasoningLevel: 'deep' },
    ),
    req(
      'manifest_rewrite_ready',
      'Manifest rewrite has replaced placeholder sha/bytes with locked real payload evidence.',
      audits.manifestRewriteHashLockGate,
      bool(rewrite.summary?.manifestRewriteReady) && bool(rewrite.summary?.hashLockManifestReady),
      'MANIFEST_REWRITE_NOT_READY',
      {
        placeholderShaEntries: rewrite.summary?.placeholderShaEntries || 0,
        realShaEntries: rewrite.summary?.realShaEntries || 0,
        realByteSizeEntries: rewrite.summary?.realByteSizeEntries || 0,
        hashLockManifestReady: bool(rewrite.summary?.hashLockManifestReady),
      },
      { requiredReasoningLevel: 'deep' },
    ),
    req(
      'hash_lock_materialization_ready',
      'Hash-lock manifest exists and accepts every expected French server object.',
      audits.hashLockMaterializationContract,
      bool(hashLock.summary?.hashLockMaterializationReady) && hashLock.summary?.acceptedLocks === EXPECTED_SERVER_OBJECTS,
      'HASH_LOCK_MATERIALIZATION_NOT_READY',
      {
        expectedLocks: hashLock.summary?.expectedLocks || 0,
        existingLocks: hashLock.summary?.existingLocks || 0,
        acceptedLocks: hashLock.summary?.acceptedLocks || 0,
        missingLocks: hashLock.summary?.missingLocks || EXPECTED_SERVER_OBJECTS,
      },
      { requiredReasoningLevel: 'deep' },
    ),
    req(
      'hash_lock_writer_ready',
      'Hash-lock writer dry-run proves the final write can happen only after every input is ready.',
      audits.hashLockWriterDryRunGate,
      bool(hashWriter.summary?.allPreviewLocksWritable) && bool(hashWriter.summary?.writerExecutionAllowed),
      'HASH_LOCK_WRITER_NOT_READY',
      {
        previewLocksWritable: hashWriter.summary?.previewLocksWritable || 0,
        previewLocksBlocked: hashWriter.summary?.previewLocksBlocked || EXPECTED_SERVER_OBJECTS,
        writerExecutionAllowed: bool(hashWriter.summary?.writerExecutionAllowed),
      },
      { requiredReasoningLevel: 'deep' },
    ),
    req(
      'manifest_writer_apply_boundary_ready',
      'Manifest writer cannot cross into production apply in one step.',
      audits.manifestWriterApplyBoundaryGate,
      writerBoundary.summary?.closedProductionTransitions === writerBoundary.summary?.productionTransitions &&
        writerBoundary.summary?.illegalOneStepPromotionProbesRejected === writerBoundary.summary?.illegalOneStepPromotionProbes,
      'MANIFEST_WRITER_APPLY_BOUNDARY_NOT_READY',
      {
        productionTransitions: writerBoundary.summary?.productionTransitions || 0,
        closedProductionTransitions: writerBoundary.summary?.closedProductionTransitions || 0,
        illegalOneStepPromotionProbesRejected: writerBoundary.summary?.illegalOneStepPromotionProbesRejected || 0,
      },
      { requiredReasoningLevel: 'deep' },
    ),
    req(
      'server_upload_policy_ready',
      'Upload policy allows only safe course-packs/fr/<sourceLocale>/ objects after all prerequisites pass.',
      audits.serverUploadPolicyGate,
      bool(uploadPolicy.summary?.uploadExecutionAllowed) && bool(uploadPolicy.summary?.readyForRuntimeDelivery),
      'SERVER_UPLOAD_POLICY_NOT_READY',
      {
        allowedUploadTargetEntries: uploadPolicy.summary?.allowedUploadTargetEntries || 0,
        deniedUploadTargetHits: uploadPolicy.summary?.deniedUploadTargetHits || 0,
        uploadExecutionAllowed: bool(uploadPolicy.summary?.uploadExecutionAllowed),
      },
      { requiredReasoningLevel: 'deep' },
    ),
    req(
      'server_upload_evidence_ready',
      'Remote server upload evidence proves every expected object exists with the locked bytes/hash.',
      audits.serverUploadEvidenceGate,
      bool(uploadEvidence.summary?.uploadEvidenceReady) &&
        uploadEvidence.summary?.acceptedObjects === EXPECTED_SERVER_OBJECTS,
      'SERVER_UPLOAD_EVIDENCE_NOT_READY',
      {
        expectedObjects: uploadEvidence.summary?.expectedObjects || uploadEvidence.summary?.uploadEvidenceExpectedObjects || EXPECTED_SERVER_OBJECTS,
        acceptedObjects: uploadEvidence.summary?.acceptedObjects || uploadEvidence.summary?.uploadEvidenceAcceptedObjects || 0,
        uploadEvidenceReady: bool(uploadEvidence.summary?.uploadEvidenceReady),
      },
      { requiredReasoningLevel: 'deep' },
    ),
    req(
      'runtime_delivery_ready',
      'Runtime loader/index/cache can download French packs without English fallback or language leakage.',
      audits.runtimeDeliveryGate,
      bool(runtime.summary?.readyForRuntimeDelivery) && runtime.summary?.runtimeDownloadAllowedRows === EXPECTED_SERVER_OBJECTS,
      'RUNTIME_DELIVERY_NOT_READY',
      {
        readinessRows: runtime.summary?.readinessRows || 0,
        runtimeDownloadAllowedRows: runtime.summary?.runtimeDownloadAllowedRows || 0,
        uploadEvidenceReady: bool(runtime.summary?.uploadEvidenceReady),
        readyForRuntimeDelivery: bool(runtime.summary?.readyForRuntimeDelivery),
      },
      { requiredReasoningLevel: 'deep' },
    ),
    req(
      'storage_cloud_isolation_ready',
      'Storage/cloud keys are target-aware and production migration/apply can be opened safely.',
      audits.storageCloudIsolationGate,
      bool(storage.summary?.readyForApply) && bool(storage.summary?.storageMigrationAllowed) && bool(storage.summary?.cloudSyncMigrationAllowed),
      'STORAGE_CLOUD_ISOLATION_NOT_READY',
      {
        missingFrenchFactoryRefs: storage.summary?.missingFrenchFactoryRefs || 0,
        storageMigrationAllowed: bool(storage.summary?.storageMigrationAllowed),
        cloudSyncMigrationAllowed: bool(storage.summary?.cloudSyncMigrationAllowed),
        readyForApply: bool(storage.summary?.readyForApply),
      },
      { requiredReasoningLevel: 'deep' },
    ),
    req(
      'admin_parity_isolation_ready',
      'Admin/index surfaces expose French status, reviewer, activation, rollback and diagnostics without opening writes early.',
      audits.adminParityIsolationGate,
      bool(adminParity.summary?.readyForApply) &&
        adminParity.summary?.observedOfficialFrenchAdminSurfaces === adminParity.summary?.requiredOfficialFrenchAdminSurfaces,
      'ADMIN_PARITY_ISOLATION_NOT_READY',
      {
        requiredOfficialFrenchAdminSurfaces: adminParity.summary?.requiredOfficialFrenchAdminSurfaces || 0,
        observedOfficialFrenchAdminSurfaces: adminParity.summary?.observedOfficialFrenchAdminSurfaces || 0,
        missingOfficialFrenchAdminSurfaces: adminParity.summary?.missingOfficialFrenchAdminSurfaces || 0,
        readyForApply: bool(adminParity.summary?.readyForApply),
      },
      { requiredReasoningLevel: 'deep' },
    ),
    req(
      'admin_activation_rollback_ready',
      'Admin activation/rollback gate has all upstream hashes, rollback scope and approval fields ready.',
      audits.adminActivationRollbackGate,
      bool(adminActivation.summary?.allUpstreamReady) &&
        bool(adminActivation.summary?.activeApprovalReceiptExists) &&
        bool(adminActivation.summary?.activeHashLockManifestExists) &&
        bool(adminActivation.summary?.readyForApply),
      'ADMIN_ACTIVATION_ROLLBACK_NOT_READY',
      {
        allUpstreamReady: bool(adminActivation.summary?.allUpstreamReady),
        activeApprovalReceiptExists: bool(adminActivation.summary?.activeApprovalReceiptExists),
        activeHashLockManifestExists: bool(adminActivation.summary?.activeHashLockManifestExists),
        readyForApply: bool(adminActivation.summary?.readyForApply),
      },
      { requiredReasoningLevel: 'deep' },
    ),
    req(
      'explicit_activation_receipt_present',
      'A final explicit activation receipt exists after every upstream gate passes.',
      null,
      explicitApprovalReceiptExists,
      'EXPLICIT_ACTIVATION_RECEIPT_MISSING',
      {
        receiptPath: rel(EXPLICIT_APPROVAL_RECEIPT),
        exists: explicitApprovalReceiptExists,
      },
      { requiredReasoningLevel: 'deep' },
    ),
    req(
      'active_hash_lock_manifest_present',
      'Active hash-lock manifest exists and is ready to pin server delivery.',
      null,
      activeHashLockManifestExists && bool(hashLock.summary?.hashLockMaterializationReady),
      'ACTIVE_HASH_LOCK_MANIFEST_MISSING',
      {
        hashLockManifestPath: rel(ACTIVE_HASH_LOCK_MANIFEST),
        exists: activeHashLockManifestExists,
        hashLockMaterializationReady: bool(hashLock.summary?.hashLockMaterializationReady),
      },
      { requiredReasoningLevel: 'deep' },
    ),
    req(
      'activation_approved_true',
      'Final activationApproved flag is true only after every hard requirement passes.',
      audits.adminActivationRollbackGate,
      activationApproved === true,
      'ACTIVATION_APPROVED_FALSE',
      {
        activationApproved,
        adminGateActivationApproved: bool(adminActivation.summary?.activationApproved),
      },
      { requiredReasoningLevel: 'deep' },
    ),
  ];

  const hardBlockers = hardRequirements.filter((item) => !item.passed).map((item) => ({
    requirementId: item.id,
    code: item.blockerCode,
    evidenceArtifact: item.evidenceArtifact,
  }));
  const deepReasoningRequirements = hardRequirements.filter((item) => item.requiredReasoningLevel === 'deep').length;
  const passedRequirements = hardRequirements.filter((item) => item.passed).length;
  const readyForProductionActivation = hardRequirements.every((item) => item.passed) && activationApproved === true;

  const audit = {
    schemaVersion: 'gustav-fr-activation-completion-audit-v2',
    generatedAt,
    status: readyForProductionActivation ? 'PASS' : 'HOLD',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: ['ru', 'uk'],
    activationApproved,
    reasoningPolicy: {
      requiredForProductionDecisions: 'deep',
      requiredForContentAndResearchReview: 'deep',
      requiredForLanguageIsolationAndCacheStorageGates: 'deep',
      requiredForServerRuntimeAdminActivation: 'deep',
      allowedForMechanicalReportRegeneration: 'standard',
      rule: 'Any decision that can accept content, enable runtime delivery, open server upload, change storage/cloud state, or set activationApproved must use deep reasoning and evidence artifacts; mechanical dry-run report regeneration may use standard reasoning.',
    },
    sourceArtifacts: Object.fromEntries(Object.entries(INPUTS).map(([key, filePath]) => [key, rel(filePath)])),
    hashes: Object.fromEntries(Object.entries(INPUTS).map(([key, filePath]) => [`${key}Sha256`, sha256(filePath)])),
    summary: {
      expectedRows: EXPECTED_ROWS,
      expectedServerObjects: EXPECTED_SERVER_OBJECTS,
      requirementsTotal: hardRequirements.length,
      requirementsPassed: passedRequirements,
      requirementsBlocked: hardRequirements.length - passedRequirements,
      hardBlockersTotal: hardBlockers.length,
      deepReasoningRequirements,
      lessonCandidateLedgersPresentGate: lessonRebuild.gates?.candidate_ledgers_present_gate || 'MISSING',
      lessonScopeSequenceReconciliationGate: lessonRebuild.gates?.scope_sequence_reconciliation_gate || 'MISSING',
      lessonPreRebuildRequired: lessonRebuild.reconciliationSummary?.rebuildRequired || 0,
      lessonPostRebuildMismatches: lessonRebuild.postRebuildScopeReconciliation?.mismatchCount || 0,
      lessonReconciliationRequiredLedgers: (lessonRebuild.reconciliationRequiredLedgers || []).length,
      decisionRows: progress.summary?.decisionRows || 0,
      missingDecisionRows: progress.summary?.missingDecisionRows || EXPECTED_ROWS,
      llmReviewLaunchContractReady: Boolean(
        launch.summary?.nextBatchWithinLimits === true &&
        launch.summary?.existingLedgerValid === true &&
        launch.summary?.preAppendValidatorReady === true,
      ),
      decisionStagingReady: Boolean(staging.summary?.readyForCanonicalDecisionSource),
      decisionImportSourceAccepted: Boolean(importSource.summary?.importSourceAccepted),
      acceptedRows: reviewImport.summary?.acceptedRows || 0,
      audioSlots: audioChecksum.summary?.audioSlots || audioManifest.summary?.audioSlots || 0,
      existingAudioFiles: audioChecksum.summary?.existingAudioFiles || 0,
      audioChecksumReadySlots: audioChecksum.summary?.checksumReadySlots || 0,
      serverManifestEntries: serverManifest.summary?.serverManifestEntries || 0,
      payloadsReadyForManifest: payload.summary?.payloadsReadyForManifest || 0,
      hashLockAcceptedLocks: hashLock.summary?.acceptedLocks || 0,
      uploadEvidenceAcceptedObjects: uploadEvidence.summary?.acceptedObjects || uploadEvidence.summary?.uploadEvidenceAcceptedObjects || 0,
      uploadEvidenceExpectedObjects: uploadEvidence.summary?.expectedObjects || uploadEvidence.summary?.uploadEvidenceExpectedObjects || EXPECTED_SERVER_OBJECTS,
      runtimeDownloadAllowedRows: runtime.summary?.runtimeDownloadAllowedRows || 0,
      runtimeDeliveryReady: bool(runtime.summary?.readyForRuntimeDelivery),
      storageCloudReadyForApply: bool(storage.summary?.readyForApply),
      adminParityReadyForApply: bool(adminParity.summary?.readyForApply),
      adminActivationReadyForApply: bool(adminActivation.summary?.readyForApply),
      explicitApprovalReceiptExists,
      activeHashLockManifestExists,
      readyForApply: false,
      readyForProductionActivation,
      activationApproved,
    },
    hardRequirements,
    hardBlockers,
    nextRequiredActions: [
      ...(lessonRebuild.gates?.scope_sequence_reconciliation_gate === 'PASS' ? [] : [
        'Close lesson scope-sequence reconciliation: rebuild/reconcile all French lesson ledgers still listed by fr_lesson_rebuild_candidate_audit before treating lesson content as review-ready.',
      ]),
      'Run or import the 1600-row LLM official-source review decision JSONL, then rerun schema and import dry-run gates.',
      'Only after every row is accepted, open the guarded TTS path and generate/verify 1600 French mp3 files with checksums.',
      'Materialize French server payloads, rewrite manifest hashes/bytes, create hash-lock manifest, and keep apply boundary closed.',
      'Upload only after upload policy and hash-locks pass, then produce remote upload evidence for all 4 expected objects.',
      'Rerun runtime delivery, storage/cloud isolation, admin parity, activation/rollback, and this completion audit before any explicit activation receipt.',
    ],
    safety: {
      readOnly: true,
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchContentModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      audioFilesGeneratedByThisScript: false,
      serverPayloadFilesWrittenByThisScript: false,
      serverManifestModifiedByThisScript: false,
      serverUploadStartedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      storageCloudMigrationOpened: false,
      adminWritesOpened: false,
      productionApplyApproved: false,
      activationApprovedWrittenByThisScript: false,
    },
  };

  writeJson(AUDIT_PATH, audit);
  fs.writeFileSync(MD_PATH, renderMarkdown(audit), 'utf8');
  console.log(JSON.stringify({
    audit: rel(AUDIT_PATH),
    status: audit.status,
    requirementsPassed: audit.summary.requirementsPassed,
    requirementsTotal: audit.summary.requirementsTotal,
    hardBlockersTotal: audit.summary.hardBlockersTotal,
    readyForProductionActivation: audit.summary.readyForProductionActivation,
  }, null, 2));
}

main();
