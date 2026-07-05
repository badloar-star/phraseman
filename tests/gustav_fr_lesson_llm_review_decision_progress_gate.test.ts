import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_llm_review_decision_progress_gate_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_llm_review_decision_progress_gate.mjs');

describe('Gustav French lesson LLM review decision progress gate', () => {
  it('tracks partial decision coverage and next resume point without opening production gates', () => {
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('openAiCallsMadeByThisScript: false');
    expect(script).toContain('reviewerDecisionsWrittenByThisScript: false');
    expect(script).toContain('firebaseOrServerUploadStarted: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('validateDecisionForProgress');
    expect(script).toContain('decision_opened_import_apply_or_activation');
    expect(script).toContain('gateReviewerDecisions must contain exactly the 11 required gates');

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-llm-review-decision-progress-gate-audit-v1');
    expect(audit.status).toBe('HOLD_PARTIAL_OR_EMPTY');
    expect(audit.activationApproved).toBe(false);
    expect(audit.studyTarget).toBe('fr');
    expect(audit.sourceLocales).toEqual(['ru', 'uk']);
    expect(audit.targetContentLang).toBe('fr');
    expect(audit.aiOutputLang).toBe('fr');

    expect(audit.summary.requestRows).toBe(1600);
    expect(typeof audit.summary.decisionFilePresent).toBe('boolean');
    expect(audit.summary.decisionRows).toBeGreaterThanOrEqual(0);
    expect(audit.summary.decisionRows).toBeLessThanOrEqual(1600);
    expect(audit.summary.matchedDecisionRows).toBe(audit.summary.validDecisionRows);
    expect(audit.summary.missingDecisionRows).toBe(1600 - audit.summary.validDecisionRows);
    expect(audit.summary.duplicateDecisionRows).toBe(0);
    expect(audit.summary.extraDecisionRows).toBe(0);
    expect(audit.summary.invalidDecisionRows).toBe(0);
    expect(audit.summary.openedImportApplyActivationRows).toBe(0);
    expect(audit.summary.validDecisionRows).toBeGreaterThanOrEqual(0);
    expect(audit.summary.contiguousReviewedPrefixRows).toBe(audit.summary.validDecisionRows);
    expect(audit.summary.nextResumeStartIndex).toBe(audit.summary.validDecisionRows + 1);
    expect(audit.summary.completedBatches).toBeGreaterThanOrEqual(0);
    expect(audit.summary.partiallyCompletedBatches).toBeGreaterThanOrEqual(0);
    expect(audit.summary.remainingBatches).toBeGreaterThan(0);
    expect(audit.summary.nextBatchStartIndex).toBe(audit.summary.nextResumeStartIndex);
    expect(audit.summary.nextBatchLimit).toBeGreaterThan(0);
    expect(audit.summary.nextBatchLimit).toBeLessThanOrEqual(25);
    expect(audit.summary.nextBatchExecuteCommand).toContain(`--start-index ${audit.summary.nextResumeStartIndex} --limit ${audit.summary.nextBatchLimit} --execute --validate-after`);
    expect(audit.summary.readyForFullSchemaGate).toBe(false);
    expect(audit.summary.readyForDecisionImportDryRun).toBe(false);
    expect(audit.summary.readyForAudioManifestGate).toBe(false);
    expect(audit.summary.readyForServerPackManifestGate).toBe(false);
    expect(audit.summary.readyForRuntimeDeliveryGate).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.summary.blockers).toBe(0);

    if (!audit.summary.decisionFilePresent) {
      expect(audit.findings).toEqual(expect.arrayContaining([
        expect.objectContaining({
          severity: 'info',
          code: 'decisions_file_missing',
        }),
      ]));
    }
    expect(audit.safety).toMatchObject({
      openAiCallsMadeByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });
    expect(audit.nextRequiredGates).toEqual(expect.arrayContaining([
      'execute_remaining_llm_review_batches',
      'decision_progress_gate',
      'llm_review_decision_schema_gate',
      'review_decision_import_dry_run_gate',
      'explicit_activation_approval_gate',
    ]));
  });
});
