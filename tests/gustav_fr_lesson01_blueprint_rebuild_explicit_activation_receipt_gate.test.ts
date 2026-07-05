import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const ACTIVATION_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'activation', 'lesson01_blueprint_rebuild');
const GATE_PATH = path.join(ACTIVATION_DIR, 'fr_lesson01_blueprint_rebuild_explicit_activation_receipt_gate_v1.json');
const AUDIT_PATH = path.join(ACTIVATION_DIR, 'fr_lesson01_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json');
const MD_PATH = path.join(ACTIVATION_DIR, 'fr_lesson01_blueprint_rebuild_explicit_activation_receipt_gate_v1.md');
const RECEIPT_PATH = path.join(ACTIVATION_DIR, 'fr_lesson01_blueprint_rebuild_explicit_activation_receipt_v1.json');
const RECEIPT_HASH_LOCK_PATH = path.join(ACTIVATION_DIR, 'fr_lesson01_blueprint_rebuild_explicit_activation_receipt_hash_lock_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson01_blueprint_rebuild_explicit_activation_receipt_gate.mjs');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

describe('Gustav French lesson 1 blueprint rebuild explicit activation receipt gate', () => {
  it('requires LLM/source review plus all delivery gates before any activation receipt can approve production', () => {
    const gate = JSON.parse(fs.readFileSync(GATE_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const markdown = fs.readFileSync(MD_PATH, 'utf8');
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));

    expect(script).toContain('humanReviewRequired: false');
    expect(script).toContain('codex_llm_trusted_source_review');
    expect(script).toContain('activationReceiptWrittenByThisScript: false');
    expect(script).toContain('activationReceiptHashLockWrittenByThisScript: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('activationApproved: false');

    expect(fs.existsSync(RECEIPT_PATH)).toBe(false);
    expect(fs.existsSync(RECEIPT_HASH_LOCK_PATH)).toBe(false);

    expect(gate.schemaVersion).toBe('gustav-fr-lesson01-blueprint-rebuild-explicit-activation-receipt-gate-v1');
    expect(gate.status).toBe('HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING');
    expect(gate.studyTarget).toBe('fr');
    expect(gate.targetContentLang).toBe('fr');
    expect(gate.sourceLocales).toEqual(['ru', 'uk']);
    expect(gate.lessonId).toBe(1);
    expect(gate.expectedActivationArtifacts).toMatchObject({
      activationReceipt: 'docs/gustav/generated/fr/activation/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_explicit_activation_receipt_v1.json',
      activationReceiptHashLock: 'docs/gustav/generated/fr/activation/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_explicit_activation_receipt_hash_lock_v1.json',
      receiptSha256: '',
      receiptHashLockSha256: '',
    });
    expect(gate.requiredReceiptContract).toMatchObject({
      schemaVersion: 'gustav-fr-lesson01-blueprint-rebuild-explicit-activation-receipt-v1',
      activationDecision: 'APPROVE_PRODUCTION_ACTIVATION_AFTER_ALL_GATES',
      activationApprovedMayBecomeTrueOnlyInsideValidatedReceipt: true,
      requiresLlmTrustedSourceReview: true,
      humanReviewRequired: false,
      requiresAudioChecksums: true,
      requiresPayloadHashLock: true,
      requiresRollbackReady: true,
      requiresServerUploadEvidence: true,
      requiresRuntimeDelivery: true,
      requiresRuntimeCacheIntegrity: true,
      requiresFull32LessonParityBeforeGlobalFrenchActivation: true,
    });
    expect(gate.requiredReceiptContract.requiredFields).toEqual(expect.arrayContaining([
      'schemaVersion',
      'studyTarget',
      'targetContentLang',
      'sourceLocales',
      'lessonId',
      'contentVersion',
      'reviewGateSha256',
      'audioAuditSha256',
      'serverManifestGateAuditSha256',
      'payloadHashLockGateAuditSha256',
      'rollbackGateAuditSha256',
      'uploadEvidenceGateAuditSha256',
      'runtimeDeliveryGateAuditSha256',
      'runtimeCacheIntegrityGateAuditSha256',
      'activationDecision',
      'activationApproved',
      'createdBy',
      'createdAt',
    ]));

    expect(gate.prerequisiteGates).toHaveLength(10);
    const prerequisiteById = Object.fromEntries(gate.prerequisiteGates.map((item: any) => [item.id, item]));
    expect(prerequisiteById.llm_trusted_source_review).toMatchObject({
      status: 'PASS_LESSON1_REVIEW_ACCEPTED_FOR_NEXT_GATE',
      passed: true,
    });
    expect(prerequisiteById.pack_draft).toMatchObject({ status: 'PASS_PACK_DRAFT_WRITTEN', passed: true });
    expect(prerequisiteById.theory_vocab_pack).toMatchObject({ status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', passed: true });
    expect(prerequisiteById.server_manifest_upload_closed).toMatchObject({
      status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED',
      passed: true,
    });
    expect(prerequisiteById.audio_checksums.passed).toBe(false);
    expect(prerequisiteById.payload_hash_lock_materialized.passed).toBe(false);
    expect(prerequisiteById.rollback_execution_ready.passed).toBe(false);
    expect(prerequisiteById.server_upload_evidence_ready.passed).toBe(false);
    expect(prerequisiteById.runtime_delivery_ready.passed).toBe(false);
    expect(prerequisiteById.runtime_cache_integrity_ready.passed).toBe(false);

    expect(gate.receiptInspection).toMatchObject({
      schemaValid: false,
      requiredFieldsPresent: false,
      lineageHashesMatch: false,
      sourceLocalesScoped: false,
      decisionApprovesActivation: false,
      activationApprovedTrueOnlyInReceipt: false,
      errors: ['activation receipt missing'],
    });
    expect(gate.summary).toMatchObject({
      prerequisiteGatesTotal: 10,
      prerequisiteGatesPassed: 4,
      llmTrustedSourceReviewDone: true,
      humanReviewRequired: false,
      activationReceiptExists: false,
      activationReceiptHashLockExists: false,
      activationReceiptSchemaValid: false,
      activationReceiptLineageHashesMatch: false,
      activationReceiptSourceLocalesScoped: false,
      activationReceiptDecisionApprovesActivation: false,
      readyForActivationReceiptCreation: false,
      readyForProductionActivation: false,
      productionApplyApproved: false,
      activationApproved: false,
    });
    expect(gate.summary.missingOrHoldPrerequisiteGates).toEqual(expect.arrayContaining([
      'audio_checksums',
      'payload_hash_lock_materialized',
      'rollback_execution_ready',
      'server_upload_evidence_ready',
      'runtime_delivery_ready',
      'runtime_cache_integrity_ready',
    ]));

    expect(audit.schemaVersion).toBe('gustav-fr-lesson01-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1');
    expect(audit.status).toBe('HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING');
    expect(audit.blockers).toEqual(expect.arrayContaining([
      'EXPLICIT_ACTIVATION_RECEIPT_MISSING',
      'EXPLICIT_ACTIVATION_RECEIPT_HASH_LOCK_MISSING',
      'PREREQUISITE_GATES_NOT_ALL_PASS',
    ]));
    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'EXPLICIT_ACTIVATION_RECEIPT_MISSING',
      'EXPLICIT_ACTIVATION_RECEIPT_HASH_LOCK_MISSING',
      'AUDIO_CHECKSUMS_NOT_READY',
      'PAYLOAD_HASH_LOCK_NOT_MATERIALIZED',
      'ROLLBACK_NOT_EXECUTION_READY',
      'SERVER_UPLOAD_EVIDENCE_NOT_READY',
      'RUNTIME_DELIVERY_NOT_READY',
      'RUNTIME_CACHE_INTEGRITY_NOT_READY_FOR_USE',
      'FULL_32_LESSON_PARITY_NOT_DONE',
    ]));
    expect(audit.safety).toMatchObject({
      readOnly: true,
      activationReceiptWrittenByThisScript: false,
      activationReceiptHashLockWrittenByThisScript: false,
      firebaseOrServerMutationStarted: false,
      runtimeDownloadsEnabled: false,
      storageOrCloudMigrationStarted: false,
      productionApplyApproved: false,
      activationApproved: false,
    });

    expect(markdown).toContain('Status: HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING');
    expect(markdown).toContain('Receipt exists: false');
    expect(markdown).toContain('Prerequisite gates passed: 4/10');
    expect(markdown).toContain('Activation approved: false');

    expect(state.lesson01BlueprintRebuildExplicitActivationReceiptStatus).toBe('HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING');
    expect(state.lesson01BlueprintRebuildExplicitActivationReceiptGateAudit).toBe('docs/gustav/generated/fr/activation/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json');
    expect(state.lesson01BlueprintRebuildExplicitActivationReceiptSummary).toMatchObject({
      prerequisiteGatesTotal: 10,
      prerequisiteGatesPassed: 4,
      activationReceiptExists: false,
      activationReceiptHashLockExists: false,
      activationApproved: false,
    });
  });
});
