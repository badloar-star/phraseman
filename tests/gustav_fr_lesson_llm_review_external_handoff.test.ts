import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const HANDOFF_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_llm_review_external_handoff_v1.json');
const HANDOFF_MD_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_llm_review_external_handoff_v1.md');
const HANDOFF_PS1_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_llm_review_external_handoff_run_next_batch.ps1');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_llm_review_external_handoff.mjs');

describe('Gustav French lesson LLM review external handoff', () => {
  it('creates a safe outside-Codex execution handoff for pending review batches', () => {
    const handoff = JSON.parse(fs.readFileSync(HANDOFF_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const ps1 = fs.readFileSync(HANDOFF_PS1_PATH, 'utf8');
    const md = fs.readFileSync(HANDOFF_MD_PATH, 'utf8');

    expect(script).toContain('openAiCallsMadeByThisScript: false');
    expect(script).toContain('reviewerDecisionsImportedByThisScript: false');
    expect(script).toContain('externalTerminalRequired');
    expect(script).toContain('codexResponsesApiAllowed');

    expect(handoff.schemaVersion).toBe('gustav-fr-lesson-llm-review-external-handoff-v1');
    expect(handoff.status).toBe('HOLD_EXTERNAL_REVIEW_HANDOFF_READY');
    expect(handoff.studyTarget).toBe('fr');
    expect(handoff.sourceLocales).toEqual(['ru', 'uk']);
    expect(handoff.activationApproved).toBe(false);
    expect(handoff.summary).toMatchObject({
      requestRows: 1600,
      existingDecisionRows: 1263,
      pendingRows: 337,
      plannedBatches: 14,
      estimatedPendingCostUsd: 0.8425,
      firstBatchNumber: 1,
      firstBatchStartIndex: 1264,
      firstBatchEndIndex: 1288,
      firstBatchLimit: 25,
      firstBatchEstimatedCostUsd: 0.0625,
      externalTerminalRequired: true,
      codexResponsesApiAllowed: false,
      readyForApply: false,
    });
    expect(handoff.outputs.runNextBatchPowerShell).toBe('docs/gustav/generated/fr/reviewer/fr_lesson_llm_review_external_handoff_run_next_batch.ps1');
    expect(handoff.batches).toHaveLength(14);
    expect(handoff.batches[0]).toMatchObject({
      batchNumber: 1,
      startIndex: 1264,
      endIndex: 1288,
      limit: 25,
      estimatedCostUsd: 0.0625,
      externalPowerShellCommand: 'powershell -ExecutionPolicy Bypass -File docs\\gustav\\generated\\fr\\reviewer\\fr_lesson_llm_review_external_handoff_run_next_batch.ps1 -BatchNumber 1',
    });
    expect(handoff.batches.at(-1)).toMatchObject({
      batchNumber: 14,
      startIndex: 1589,
      endIndex: 1600,
      limit: 12,
      estimatedCostUsd: 0.03,
    });
    expect(handoff.batches[0].postReturnValidationGates).toEqual(expect.arrayContaining([
      'node scripts/gustav_build_fr_lesson_llm_review_decision_progress_gate.mjs',
      'node scripts/gustav_build_fr_lesson_llm_review_partial_quarantine_gate.mjs',
      'node scripts/gustav_validate_fr_lesson_llm_review_decisions.mjs',
      'node scripts/gustav_fr_lesson_review_decision_import_dry_run.mjs',
      'node scripts/gustav_build_fr_lesson_llm_review_execution_readiness_gate.mjs',
    ]));

    expect(ps1).toContain('if ($env:CODEX_THREAD_ID)');
    expect(ps1).toContain('Refusing to run OpenAI Responses review inside a Codex session');
    expect(ps1).toContain('if (-not $env:OPENAI_API_KEY)');
    expect(ps1).toContain('PHRASEMAN_ALLOW_OPENAI_DEV_SPEND');
    expect(ps1).toContain('--start-index $startIndex --limit $limit --execute --validate-after');
    expect(ps1).toContain('estimated cost `$${expectedCost}');
    expect(ps1).toContain('1 {');
    expect(ps1).toContain('$startIndex = 1264');
    expect(ps1).toContain('$limit = 25');
    expect(ps1).toContain('14 {');
    expect(ps1).toContain('$startIndex = 1589');
    expect(ps1).toContain('$limit = 12');

    expect(md).toContain('Codex sessions may prepare and validate');
    expect(md).toContain('powershell -ExecutionPolicy Bypass -File docs\\gustav\\generated\\fr\\reviewer\\fr_lesson_llm_review_external_handoff_run_next_batch.ps1 -BatchNumber 1');

    expect(handoff.safety).toMatchObject({
      openAiCallsMadeByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      storageCloudMigrationStarted: false,
      activationApproved: false,
    });
  });
});
