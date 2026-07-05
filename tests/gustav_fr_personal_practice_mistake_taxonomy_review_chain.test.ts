import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const HANDOFF_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'personal_practice', 'fr_personal_practice_mistake_taxonomy_review_external_handoff_v1.json');
const EXECUTION_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'personal_practice', 'fr_personal_practice_mistake_taxonomy_review_execution_audit_v1.json');
const SCHEMA_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'personal_practice', 'fr_personal_practice_mistake_taxonomy_review_decision_schema_gate_v1.json');
const IMPORT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'personal_practice', 'fr_personal_practice_mistake_taxonomy_review_import_dry_run_v1.json');
const EXECUTOR_SCRIPT = path.join(ROOT, 'scripts', 'gustav_execute_fr_personal_practice_mistake_taxonomy_review_batch.mjs');
const HANDOFF_SCRIPT = path.join(ROOT, 'scripts', 'gustav_build_fr_personal_practice_mistake_taxonomy_review_external_handoff.mjs');
const SCHEMA_SCRIPT = path.join(ROOT, 'scripts', 'gustav_validate_fr_personal_practice_mistake_taxonomy_review_decisions.mjs');
const IMPORT_SCRIPT = path.join(ROOT, 'scripts', 'gustav_fr_personal_practice_mistake_taxonomy_review_import_dry_run.mjs');

describe('Gustav French personal practice mistake taxonomy review chain', () => {
  it('prepares external execution and keeps taxonomy import on HOLD until decisions exist', () => {
    const handoff = JSON.parse(fs.readFileSync(HANDOFF_PATH, 'utf8'));
    const execution = JSON.parse(fs.readFileSync(EXECUTION_PATH, 'utf8'));
    const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
    const importDryRun = JSON.parse(fs.readFileSync(IMPORT_PATH, 'utf8'));
    const executorScript = fs.readFileSync(EXECUTOR_SCRIPT, 'utf8');
    const handoffScript = fs.readFileSync(HANDOFF_SCRIPT, 'utf8');
    const schemaScript = fs.readFileSync(SCHEMA_SCRIPT, 'utf8');
    const importScript = fs.readFileSync(IMPORT_SCRIPT, 'utf8');

    expect(executorScript).toContain('requireOpenAiDevSpendGuard');
    expect(executorScript).toContain('reviewerDecisionsPreAppendValidated: true');
    expect(executorScript).toContain('mistakeId');
    expect(handoffScript).toContain('Refusing to run OpenAI Responses review inside a Codex session');
    expect(schemaScript).toContain('decision_has_no_matching_request');
    expect(schemaScript).toContain('correctedMistakeId');
    expect(schemaScript).toContain('french_mistake_family_fit_gate');
    expect(importScript).toContain('mistakeTaxonomyStagedByThisScript: false');

    expect(handoff.schemaVersion).toBe('gustav-fr-personal-practice-mistake-taxonomy-review-external-handoff-v1');
    expect(handoff.status).toBe('HOLD_EXTERNAL_MISTAKE_TAXONOMY_REVIEW_HANDOFF_READY');
    expect(handoff.summary).toMatchObject({
      requestRows: 56,
      existingDecisionRows: 0,
      pendingRows: 56,
      plannedBatches: 3,
      batchSize: 25,
      estimatedPendingCostUsd: 0.14,
      firstBatchStartIndex: 1,
      firstBatchEndIndex: 25,
      firstBatchLimit: 25,
      firstBatchEstimatedCostUsd: 0.0625,
      readyForApply: false,
    });
    expect(handoff.batches.at(-1)).toMatchObject({
      batchNumber: 3,
      startIndex: 51,
      endIndex: 56,
      limit: 6,
      estimatedCostUsd: 0.015,
    });
    expect(handoff.safety).toMatchObject({
      openAiCallsMadeByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      appBundleModifiedByThisScript: false,
      serverUploadStarted: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
    });

    expect(execution.schemaVersion).toBe('gustav-fr-personal-practice-mistake-taxonomy-review-execution-audit-v1');
    expect(execution.status).toBe('HOLD_DRY_RUN');
    expect(execution.summary).toMatchObject({
      mode: 'dry-run',
      requestRows: 56,
      existingDecisionRows: 0,
      decisionRowsAfterRun: 0,
      pendingRows: 56,
      selectedRows: 25,
      executedRows: 0,
      readyForApply: false,
    });

    expect(schema.schemaVersion).toBe('gustav-fr-personal-practice-mistake-taxonomy-review-decision-schema-gate-v1');
    expect(schema.status).toBe('HOLD');
    expect(schema.summary).toMatchObject({
      requestRows: 56,
      decisionFilePresent: false,
      decisionRows: 0,
      acceptedRows: 0,
      missingDecisionRows: 56,
      readyForImportDryRun: false,
      readyForApply: false,
    });

    expect(importDryRun.schemaVersion).toBe('gustav-fr-personal-practice-mistake-taxonomy-review-import-dry-run-v1');
    expect(importDryRun.status).toBe('HOLD');
    expect(importDryRun.summary).toMatchObject({
      schemaGateReady: false,
      taxonomyRows: 56,
      requestRows: 56,
      decisionRows: 0,
      acceptedRows: 0,
      wouldStageAcceptedTaxonomy: false,
      wouldOpenProblemCoach: false,
      readyForRuntimeEnable: false,
      readyForApply: false,
    });
    expect(importDryRun.safety).toMatchObject({
      dryRunOnly: true,
      reviewerDecisionsImportedByThisScript: false,
      mistakeTaxonomyStagedByThisScript: false,
      problemCoachOpenedByThisScript: false,
      appBundleModifiedByThisScript: false,
      serverUploadStarted: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
    });
  });
});
