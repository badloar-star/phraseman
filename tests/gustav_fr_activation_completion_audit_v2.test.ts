import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'activation', 'fr_activation_completion_audit_v2.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_activation_completion_audit_v2.mjs');

describe('Gustav French activation completion audit v2', () => {
  it('keeps French production activation on HOLD until every content, audio, server, runtime, storage and admin blocker is closed', () => {
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('requiredForProductionDecisions');
    expect(script).toContain('fr_lesson_rebuild_candidate_audit.json');
    expect(script).toContain('fr_lesson_llm_review_decision_progress_gate_audit_v1.json');
    expect(script).toContain('fr_lesson_llm_review_launch_contract_audit_v1.json');
    expect(script).toContain('fr_lesson_decision_staging_gate_audit_v1.json');
    expect(script).toContain('fr_lesson_decision_import_source_gate_audit_v1.json');
    expect(script).toContain('fr_lesson_audio_checksum_gate_audit_v1.json');
    expect(script).toContain('fr_lesson_server_upload_evidence_gate_audit_v1.json');
    expect(script).toContain('fr_lesson_runtime_delivery_gate_audit_v1.json');
    expect(script).toContain('fr_admin_activation_rollback_gate_audit_v1.json');
    expect(script).toContain('activationApproved = false');
    expect(script).not.toContain('productionApplyApproved: true');
    expect(script).not.toContain('runtimeDownloadsEnabled: true');
    expect(script).not.toContain('serverUploadStartedByThisScript: true');

    expect(audit.schemaVersion).toBe('gustav-fr-activation-completion-audit-v2');
    expect(audit.status).toBe('HOLD');
    expect(audit.studyTarget).toBe('fr');
    expect(audit.targetContentLang).toBe('fr');
    expect(audit.sourceLocales).toEqual(['ru', 'uk']);
    expect(audit.activationApproved).toBe(false);

    expect(audit.reasoningPolicy).toMatchObject({
      requiredForProductionDecisions: 'deep',
      requiredForContentAndResearchReview: 'deep',
      requiredForLanguageIsolationAndCacheStorageGates: 'deep',
      requiredForServerRuntimeAdminActivation: 'deep',
      allowedForMechanicalReportRegeneration: 'standard',
    });

    expect(audit.summary.expectedRows).toBe(1600);
    expect(audit.summary.expectedServerObjects).toBe(4);
    expect(audit.summary.requirementsTotal).toBeGreaterThanOrEqual(20);
    expect(audit.summary.requirementsPassed).toBeLessThan(audit.summary.requirementsTotal);
    expect(audit.summary.hardBlockersTotal).toBeGreaterThan(0);
    expect(audit.summary.deepReasoningRequirements).toBeGreaterThan(0);
    expect(audit.summary.lessonCandidateLedgersPresentGate).toBe('PASS');
    expect(audit.summary.lessonScopeSequenceReconciliationGate).toBe('PASS');
    expect(audit.summary.lessonPreRebuildRequired).toBeGreaterThan(0);
    expect(audit.summary.lessonPostRebuildMismatches).toBe(0);
    expect(audit.summary.lessonReconciliationRequiredLedgers).toBe(0);
    expect(audit.summary.decisionRows).toBeGreaterThanOrEqual(0);
    expect(audit.summary.decisionRows).toBeLessThanOrEqual(1600);
    expect(audit.summary.missingDecisionRows).toBe(1600 - audit.summary.decisionRows);
    expect(audit.summary.llmReviewLaunchContractReady).toBe(true);
    expect(audit.summary.decisionStagingReady).toBe(false);
    expect(audit.summary.decisionImportSourceAccepted).toBe(false);
    expect(audit.summary.acceptedRows).toBeGreaterThanOrEqual(0);
    expect(audit.summary.acceptedRows).toBeLessThanOrEqual(audit.summary.decisionRows);
    expect(audit.summary.audioChecksumReadySlots).toBe(0);
    expect(audit.summary.uploadEvidenceAcceptedObjects).toBe(0);
    expect(audit.summary.uploadEvidenceExpectedObjects).toBe(4);
    expect(audit.summary.runtimeDeliveryReady).toBe(false);
    expect(audit.summary.adminActivationReadyForApply).toBe(false);
    expect(audit.summary.explicitApprovalReceiptExists).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.summary.readyForProductionActivation).toBe(false);
    expect(audit.summary.activationApproved).toBe(false);

    const requirementsById = Object.fromEntries(
      audit.hardRequirements.map((item: { id: string }) => [item.id, item]),
    ) as Record<string, { passed: boolean; blockerCode: string; requiredReasoningLevel: string }>;

    expect(requirementsById.lesson_scope_sequence_reconciled).toMatchObject({
      passed: true,
      blockerCode: '',
      requiredReasoningLevel: 'deep',
    });
    expect(requirementsById.llm_review_decisions_complete).toMatchObject({
      passed: false,
      blockerCode: 'LLM_REVIEW_DECISIONS_INCOMPLETE',
      requiredReasoningLevel: 'deep',
    });
    expect(requirementsById.llm_review_launch_contract_ready).toMatchObject({
      passed: true,
      blockerCode: '',
      requiredReasoningLevel: 'deep',
    });
    expect(requirementsById.audio_checksums_ready).toMatchObject({
      passed: false,
      blockerCode: 'AUDIO_CHECKSUMS_NOT_READY',
    });
    expect(requirementsById.decision_import_source_ready).toMatchObject({
      passed: false,
      blockerCode: 'DECISION_IMPORT_SOURCE_NOT_READY',
      requiredReasoningLevel: 'deep',
    });
    expect(requirementsById.decision_staging_or_canonical_source_ready).toMatchObject({
      passed: false,
      blockerCode: 'DECISION_STAGING_OR_CANONICAL_SOURCE_NOT_READY',
      requiredReasoningLevel: 'deep',
    });
    expect(requirementsById.server_upload_evidence_ready).toMatchObject({
      passed: false,
      blockerCode: 'SERVER_UPLOAD_EVIDENCE_NOT_READY',
      requiredReasoningLevel: 'deep',
    });
    expect(requirementsById.runtime_delivery_ready).toMatchObject({
      passed: false,
      blockerCode: 'RUNTIME_DELIVERY_NOT_READY',
      requiredReasoningLevel: 'deep',
    });
    expect(requirementsById.admin_activation_rollback_ready).toMatchObject({
      passed: false,
      blockerCode: 'ADMIN_ACTIVATION_ROLLBACK_NOT_READY',
      requiredReasoningLevel: 'deep',
    });
    expect(requirementsById.explicit_activation_receipt_present).toMatchObject({
      passed: false,
      blockerCode: 'EXPLICIT_ACTIVATION_RECEIPT_MISSING',
      requiredReasoningLevel: 'deep',
    });
    expect(requirementsById.activation_approved_true).toMatchObject({
      passed: false,
      blockerCode: 'ACTIVATION_APPROVED_FALSE',
      requiredReasoningLevel: 'deep',
    });

    expect(audit.hardBlockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'LLM_REVIEW_DECISIONS_INCOMPLETE' }),
      expect.objectContaining({ code: 'DECISION_STAGING_OR_CANONICAL_SOURCE_NOT_READY' }),
      expect.objectContaining({ code: 'DECISION_IMPORT_SOURCE_NOT_READY' }),
      expect.objectContaining({ code: 'REVIEW_IMPORT_NOT_ACCEPTED' }),
      expect.objectContaining({ code: 'AUDIO_TTS_NOT_READY' }),
      expect.objectContaining({ code: 'AUDIO_CHECKSUMS_NOT_READY' }),
      expect.objectContaining({ code: 'SERVER_UPLOAD_EVIDENCE_NOT_READY' }),
      expect.objectContaining({ code: 'RUNTIME_DELIVERY_NOT_READY' }),
      expect.objectContaining({ code: 'ADMIN_ACTIVATION_ROLLBACK_NOT_READY' }),
      expect.objectContaining({ code: 'EXPLICIT_ACTIVATION_RECEIPT_MISSING' }),
      expect.objectContaining({ code: 'ACTIVATION_APPROVED_FALSE' }),
    ]));

    expect(audit.nextRequiredActions.join('\n')).not.toContain('Close lesson scope-sequence reconciliation');
    expect(audit.nextRequiredActions.join('\n')).toContain('1600-row LLM official-source review');
    expect(audit.nextRequiredActions.join('\n')).toContain('1600 French mp3 files');
    expect(audit.nextRequiredActions.join('\n')).toContain('remote upload evidence');

    expect(audit.safety).toMatchObject({
      readOnly: true,
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchContentModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      audioFilesGeneratedByThisScript: false,
      serverUploadStartedByThisScript: false,
      runtimeDownloadsEnabled: false,
      storageCloudMigrationOpened: false,
      productionApplyApproved: false,
      activationApprovedWrittenByThisScript: false,
    });
  });
});
