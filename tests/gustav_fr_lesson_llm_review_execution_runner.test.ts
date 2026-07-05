import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_llm_review_execution_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_execute_fr_lesson_llm_review_batch.mjs');
const DECISIONS_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_llm_review_decisions_v1.jsonl');

describe('Gustav French lesson LLM review execution runner', () => {
  it('defaults to dry-run and keeps LLM spending, decision writes and production gates closed', () => {
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('requireOpenAiDevSpendGuard');
    expect(script).toContain('MAX_ROWS_PER_LIVE_LAUNCH');
    expect(script).toContain('MAX_COST_PER_LIVE_LAUNCH_USD');
    expect(script).toContain('validate_after_required_for_live_execution');
    expect(script).toContain('live_launch_row_limit_exceeded');
    expect(script).toContain('live_launch_cost_limit_exceeded');
    expect(script).toContain('validateExistingDecisionLedgerBeforeExecution');
    expect(script).toContain('existing_decision_ledger_invalid');
    expect(script).toContain('validateDecisionBeforeAppend');
    expect(script).toContain('llm_decision_rejected_before_append');
    expect(script).toContain('appendIdentities');
    expect(script).toContain('llm_decision_duplicate_identity_before_append');
    expect(script).toContain('OPENAI_API_KEY is required to execute LLM review calls.');
    expect(script).toContain('requiresExecuteFlagForLlmCalls: true');
    expect(script).toContain('reviewerDecisionsPreAppendValidated: true');
    expect(script).toContain("postGateMode: 'standard'");
    expect(script).toContain("if (!['standard', 'none'].includes(args.postGateMode))");
    expect(script).toContain('supportsSeparateRequestAndDecisionLedgers: true');
    expect(script).toContain("validateAfterRunsProgressAndPartialQuarantineGates: args.postGateMode === 'standard'");
    expect(script).toContain('Decision consistency checklist before final JSON');
    expect(script).toContain('non-accept reviewerDecision => at least one gateReviewerDecisions value must be fail or needs_source_check');
    expect(script).toContain('OPENAI_MAX_ATTEMPTS');
    expect(script).toContain('isRetryableOpenAiError');
    expect(script).toContain('fetch failed');
    expect(script).toContain('reviewerDecisionsImportedByThisScript: false');
    expect(script).toContain('firebaseOrServerUploadStarted: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-llm-review-execution-audit-v1');
    expect(['HOLD_DRY_RUN', 'HOLD_EXECUTED_BATCH', 'BLOCK']).toContain(audit.status);
    expect(audit.activationApproved).toBe(false);
    expect(['dry-run', 'execute']).toContain(audit.summary.mode);
    expect(typeof audit.summary.apiKeyPresent).toBe('boolean');
    expect(audit.summary.requestRows).toBe(1600);
    expect(audit.summary.existingDecisionRows).toBeGreaterThanOrEqual(0);
    expect(audit.summary.existingDecisionRows).toBeLessThanOrEqual(1600);
    expect(audit.summary.existingDecisionLedgerValid).toBe(true);
    expect(audit.summary.existingDecisionLedgerErrors).toBe(0);
    expect(audit.summary.existingDecisionLedgerUniqueIdentities).toBe(audit.summary.existingDecisionRows);
    expect(audit.summary.decisionRowsAfterRun).toBeGreaterThanOrEqual(audit.summary.existingDecisionRows);
    expect(audit.summary.pendingRows).toBeLessThanOrEqual(1600);
    expect(audit.summary.selectedRows).toBeGreaterThanOrEqual(0);
    expect(audit.summary.selectedRows).toBeLessThanOrEqual(25);
    expect(audit.summary.maxRowsPerLiveLaunch).toBe(25);
    expect(audit.summary.maxCostPerLiveLaunchUsd).toBe(0.0625);
    expect(audit.summary.requiredTotalRows).toBe(1600);
    expect(audit.summary.selectedRowsWithinLiveLimit).toBe(true);
    expect(audit.summary.selectedCostWithinLiveLimit).toBe(true);
    expect(audit.summary.validateAfterRequiredForLive).toBe(true);
    expect(audit.summary.validateAfterPresent).toBe(true);
    expect(audit.summary.postGateMode).toBe('standard');
    expect(audit.summary.executedRows).toBeGreaterThanOrEqual(0);
    expect(audit.summary.preAppendRejectedRows).toBeGreaterThanOrEqual(0);
    expect(audit.summary.failedRows).toBeGreaterThanOrEqual(0);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.summary.mayModifyProductionAppFiles).toBe(false);
    expect(audit.safety).toMatchObject({
      dryRunDefault: true,
      requiresExecuteFlagForLlmCalls: true,
      requiresOpenAiApiKeyForLlmCalls: true,
      requiresSpendGuardForLlmCalls: true,
      requiresValidateAfterForLiveExecution: true,
      enforcesMaxRowsPerLiveLaunch: true,
      enforcesMaxCostPerLiveLaunch: true,
      reviewerDecisionsWrittenOnlyWhenExecute: true,
      reviewerDecisionsPreAppendValidated: true,
      existingReviewerDecisionLedgerValidatedBeforeAppend: true,
      supportsSeparateRequestAndDecisionLedgers: true,
      validateAfterRunsProgressAndPartialQuarantineGates: true,
      reviewerDecisionsImportedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });
    expect([0, 5]).toContain(audit.gateResults.length);
    if (audit.gateResults.length > 0) {
      expect(audit.gateResults.map((gate: any) => gate.script)).toEqual(expect.arrayContaining([
        'scripts/gustav_build_fr_lesson_llm_review_batch_plan.mjs',
        'scripts/gustav_build_fr_lesson_llm_review_decision_progress_gate.mjs',
        'scripts/gustav_build_fr_lesson_llm_review_partial_quarantine_gate.mjs',
        'scripts/gustav_validate_fr_lesson_llm_review_decisions.mjs',
        'scripts/gustav_fr_lesson_review_decision_import_dry_run.mjs',
      ]));
    }
    expect(audit.existingLedgerValidation).toMatchObject({
      valid: true,
      checkedRows: audit.summary.existingDecisionRows,
      uniqueIdentities: audit.summary.existingDecisionRows,
      errors: [],
    });
    if (audit.summary.mode === 'dry-run') {
      expect(audit.findings).toEqual(expect.arrayContaining([
        expect.objectContaining({
          severity: 'info',
          code: 'dry_run_only',
        }),
      ]));
    }
    expect(fs.existsSync(DECISIONS_PATH)).toBe(audit.summary.decisionRowsAfterRun > 0);
  });
});
