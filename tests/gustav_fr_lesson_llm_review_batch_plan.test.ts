import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const PLAN_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_llm_review_batch_plan_v1.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_llm_review_batch_plan_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_llm_review_batch_plan.mjs');

describe('Gustav French lesson LLM review batch plan', () => {
  it('plans resumable paid-review batches without calling OpenAI or opening production gates', () => {
    const plan = JSON.parse(fs.readFileSync(PLAN_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('openAiCallsMadeByThisScript: false');
    expect(script).toContain('reviewerDecisionsWrittenByThisScript: false');
    expect(script).toContain('PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1');
    expect(script).toContain('responsesApiAllowedInCurrentProcess');
    expect(script).toContain('externalTerminalExecutionRequired');

    expect(plan.schemaVersion).toBe('gustav-fr-lesson-llm-review-batch-plan-v1');
    expect(plan.studyTarget).toBe('fr');
    expect(plan.sourceLocales).toEqual(['ru', 'uk']);
    expect(plan.targetContentLang).toBe('fr');
    expect(plan.aiOutputLang).toBe('fr');
    expect(plan.activationApproved).toBe(false);
    expect(plan.batchSize).toBe(25);
    expect(plan.estimatedCostPerRowUsd).toBe(0.0025);
    expect(plan.batches.length).toBeGreaterThan(0);
    expect(plan.batches.length).toBeLessThanOrEqual(64);
    expect(plan.batches[0]).toMatchObject({
      batchNumber: 1,
      limit: 25,
      estimatedCostUsd: 0.0625,
    });
    expect(plan.batches[0].startIndex).toBe(audit.summary.firstBatchStartIndex);
    expect(plan.batches[0].endIndex).toBe(audit.summary.firstBatchStartIndex + 24);
    expect(plan.batches.at(-1)).toMatchObject({
      endIndex: 1600,
    });
    expect(plan.batches[0].executeCommand).toContain(`--start-index ${audit.summary.firstBatchStartIndex} --limit 25 --execute --validate-after`);
    expect(plan.batches[0].postBatchGates).toEqual(expect.arrayContaining([
      'node scripts/gustav_build_fr_lesson_llm_review_decision_progress_gate.mjs',
      'node scripts/gustav_build_fr_lesson_llm_review_partial_quarantine_gate.mjs',
      'node scripts/gustav_validate_fr_lesson_llm_review_decisions.mjs',
      'node scripts/gustav_fr_lesson_review_decision_import_dry_run.mjs',
      'node scripts/gustav_build_fr_lesson_llm_review_execution_readiness_gate.mjs',
    ]));

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-llm-review-batch-plan-audit-v1');
    expect(audit.status).toBe('HOLD_BATCH_PLAN_READY');
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary.requestRows).toBe(1600);
    expect(audit.summary.existingDecisionRows).toBeGreaterThanOrEqual(0);
    expect(audit.summary.pendingRows).toBe(1600 - audit.summary.existingDecisionRows);
    expect(audit.summary.reasoningLevelsPending.deep).toBe(audit.summary.pendingRows);
    expect(audit.summary.plannedBatches).toBe(plan.batches.length);
    expect(audit.summary.estimatedPendingCostUsd).toBe(Number((audit.summary.pendingRows * 0.0025).toFixed(4)));
    expect(typeof audit.summary.openaiApiKeyPresent).toBe('boolean');
    expect(audit.summary.spendGuardOpen).toBe(false);
    expect(audit.summary.responsesApiAllowedInCurrentProcess).toBe(false);
    expect(audit.summary.externalTerminalExecutionRequired).toBe(true);
    expect(audit.summary.canExecuteLiveNow).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.summary.blockers).toEqual(expect.arrayContaining([
      'PHRASEMAN_ALLOW_OPENAI_DEV_SPEND_NOT_SET',
      'DECISIONS_INCOMPLETE',
    ]));
    expect(audit.safety).toMatchObject({
      openAiCallsMadeByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });
  });
});
