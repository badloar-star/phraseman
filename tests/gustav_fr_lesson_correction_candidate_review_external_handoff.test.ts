import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const HANDOFF_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'work_orders', 'fr_lesson_correction_candidate_review_external_handoff_v1.json');
const HANDOFF_MD_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'work_orders', 'fr_lesson_correction_candidate_review_external_handoff_v1.md');
const HANDOFF_PS1_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'work_orders', 'fr_lesson_correction_candidate_review_external_handoff_run_next_batch.ps1');
const EXECUTION_AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'work_orders', 'fr_lesson_correction_candidate_review_execution_audit_v1.json');
const HANDOFF_SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_correction_candidate_review_external_handoff.mjs');
const RUNNER_SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_execute_fr_lesson_llm_review_batch.mjs');

describe('Gustav French correction candidate review external handoff', () => {
  it('creates a safe outside-Codex runner for the separate correction review ledger', () => {
    const handoff = JSON.parse(fs.readFileSync(HANDOFF_PATH, 'utf8'));
    const executionAudit = JSON.parse(fs.readFileSync(EXECUTION_AUDIT_PATH, 'utf8'));
    const ps1 = fs.readFileSync(HANDOFF_PS1_PATH, 'utf8');
    const md = fs.readFileSync(HANDOFF_MD_PATH, 'utf8');
    const handoffScript = fs.readFileSync(HANDOFF_SCRIPT_PATH, 'utf8');
    const runnerScript = fs.readFileSync(RUNNER_SCRIPT_PATH, 'utf8');

    expect(handoffScript).toContain('originalDecisionQueueModifiedByThisScript: false');
    expect(handoffScript).toContain('openAiCallsMadeByThisScript: false');
    expect(runnerScript).toContain('--requests-jsonl');
    expect(runnerScript).toContain('--requests-audit');
    expect(runnerScript).toContain('--required-total-rows');
    expect(runnerScript).toContain('--post-gate-mode');
    expect(runnerScript).toContain('supportsSeparateRequestAndDecisionLedgers: true');

    expect(handoff.schemaVersion).toBe('gustav-fr-lesson-correction-candidate-review-external-handoff-v1');
    expect(handoff.status).toBe('HOLD_EXTERNAL_CORRECTION_REVIEW_HANDOFF_READY');
    expect(handoff.studyTarget).toBe('fr');
    expect(handoff.sourceLocales).toEqual(['ru', 'uk']);
    expect(handoff.activationApproved).toBe(false);
    expect(handoff.summary).toMatchObject({
      requestRows: 290,
      existingDecisionRows: 0,
      pendingRows: 290,
      plannedBatches: 12,
      batchSize: 25,
      estimatedPendingCostUsd: 0.725,
      firstBatchNumber: 1,
      firstBatchStartIndex: 1,
      firstBatchEndIndex: 25,
      firstBatchLimit: 25,
      firstBatchEstimatedCostUsd: 0.0625,
      runnerSupportsSeparateLedgers: true,
      readyForApply: false,
    });
    expect(handoff.outputs.runNextBatchPowerShell).toBe('docs/gustav/generated/fr/reviewer/work_orders/fr_lesson_correction_candidate_review_external_handoff_run_next_batch.ps1');
    expect(handoff.batches).toHaveLength(12);
    expect(handoff.batches[0]).toMatchObject({
      batchNumber: 1,
      startIndex: 1,
      endIndex: 25,
      limit: 25,
      estimatedCostUsd: 0.0625,
      decisionsOutput: 'docs/gustav/generated/fr/reviewer/work_orders/fr_lesson_correction_candidate_review_decisions_v1.jsonl',
      externalPowerShellCommand: 'powershell -ExecutionPolicy Bypass -File docs\\gustav\\generated\\fr\\reviewer\\work_orders\\fr_lesson_correction_candidate_review_external_handoff_run_next_batch.ps1 -BatchNumber 1',
    });
    expect(handoff.batches.at(-1)).toMatchObject({
      batchNumber: 12,
      startIndex: 276,
      endIndex: 290,
      limit: 15,
      estimatedCostUsd: 0.0375,
    });

    expect(ps1).toContain('if ($env:CODEX_THREAD_ID)');
    expect(ps1).toContain('Refusing to run OpenAI Responses review inside a Codex session');
    expect(ps1).toContain('PHRASEMAN_ALLOW_OPENAI_DEV_SPEND');
    expect(ps1).toContain('--requests-jsonl docs\\gustav\\generated\\fr\\reviewer\\work_orders\\fr_lesson_correction_candidate_review_requests_v1.jsonl');
    expect(ps1).toContain('--requests-audit docs\\gustav\\generated\\fr\\reviewer\\work_orders\\fr_lesson_correction_candidate_review_requests_audit_v1.json');
    expect(ps1).toContain('--required-total-rows 290');
    expect(ps1).toContain('--post-gate-mode none --execute --validate-after');
    expect(ps1).toContain('$startIndex = 1');
    expect(ps1).toContain('$limit = 25');
    expect(ps1).toContain('12 {');
    expect(ps1).toContain('$startIndex = 276');
    expect(ps1).toContain('$limit = 15');

    expect(md).toContain('separate correction-candidate review ledger');
    expect(md).toContain('fr_lesson_correction_candidate_review_external_handoff_run_next_batch.ps1 -BatchNumber 1');

    expect(executionAudit.schemaVersion).toBe('gustav-fr-lesson-llm-review-execution-audit-v1');
    expect(executionAudit.status).toBe('HOLD_DRY_RUN');
    expect(executionAudit.inputs.requestsJsonl).toBe('docs/gustav/generated/fr/reviewer/work_orders/fr_lesson_correction_candidate_review_requests_v1.jsonl');
    expect(executionAudit.inputs.decisionsJsonl).toBe('docs/gustav/generated/fr/reviewer/work_orders/fr_lesson_correction_candidate_review_decisions_v1.jsonl');
    expect(executionAudit.summary).toMatchObject({
      mode: 'dry-run',
      requestRows: 290,
      requiredTotalRows: 290,
      existingDecisionRows: 0,
      decisionRowsAfterRun: 0,
      pendingRows: 290,
      selectedRows: 25,
      postGateMode: 'none',
      executedRows: 0,
      estimatedSelectedCostUsd: 0.0625,
      readyForApply: false,
    });
    expect(executionAudit.safety).toMatchObject({
      dryRunDefault: true,
      supportsSeparateRequestAndDecisionLedgers: true,
      reviewerDecisionsImportedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });

    expect(handoff.safety).toMatchObject({
      openAiCallsMadeByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      originalDecisionQueueModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      audioGeneratedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      storageCloudMigrationStarted: false,
      activationApproved: false,
    });
  });
});
