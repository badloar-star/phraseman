import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const BATCH_PLAN_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_batch_plan_v1.json');
const BATCH_PLAN_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_batch_plan_audit_v1.json');
const READINESS_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_execution_readiness_gate_audit_v1.json');
const EXECUTION_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_execution_audit_v1.json');
const OUT_JSON = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_external_handoff_v1.json');
const OUT_MD = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_external_handoff_v1.md');
const OUT_PS1 = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_external_handoff_run_next_batch.ps1');

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, 'utf8');
}

function makePowerShell(batches) {
  const batchCases = batches.map((batch) => [
    `  ${batch.batchNumber} {`,
    `    $startIndex = ${batch.startIndex}`,
    `    $limit = ${batch.limit}`,
    `    $expectedCost = "${batch.estimatedCostUsd.toFixed(4)}"`,
    '    break',
    '  }',
  ].join('\n')).join('\n');

  return [
    'param(',
    '  [int]$BatchNumber = 1',
    ')',
    '',
    '$ErrorActionPreference = "Stop"',
    '$projectRoot = "C:\\appsprojects\\phraseman"',
    '',
    'if ($env:CODEX_THREAD_ID) {',
    '  throw "Refusing to run OpenAI Responses review inside a Codex session. Open a normal PowerShell terminal."',
    '}',
    '',
    'if (-not $env:OPENAI_API_KEY) {',
    '  throw "OPENAI_API_KEY is required. Set `$env:OPENAI_API_KEY before running this handoff."',
    '}',
    '',
    'if ($env:PHRASEMAN_ALLOW_OPENAI_DEV_SPEND -ne "1") {',
    '  throw "PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 is required after reviewing the estimated batch cost."',
    '}',
    '',
    'switch ($BatchNumber) {',
    batchCases,
    '  default { throw "Unknown BatchNumber $BatchNumber. Valid range is 1-' + batches.length + '." }',
    '}',
    '',
    'Set-Location $projectRoot',
    'Write-Host "Running Gustav French LLM review batch $BatchNumber (start-index $startIndex, limit $limit, estimated cost `$${expectedCost})"',
    'node scripts/gustav_execute_fr_lesson_llm_review_batch.mjs --start-index $startIndex --limit $limit --execute --validate-after',
    'Write-Host "Batch complete. Return to Codex and ask it to continue validation."',
    '',
  ].join('\n');
}

function makeMarkdown(handoff) {
  const lines = [
    '# Gustav French Lesson LLM Review External Handoff',
    '',
    `Status: \`${handoff.status}\``,
    '',
    `Generated at: ${handoff.generatedAt}`,
    '',
    '## Why This Exists',
    '',
    'Codex sessions may prepare and validate the reviewer pipeline, but they may not call OpenAI `/v1/responses` for lesson review. Run the paid review batch from a normal project terminal, then return to Codex for validation.',
    '',
    '## Current State',
    '',
    `- Decisions: ${handoff.summary.existingDecisionRows}/1600`,
    `- Pending rows: ${handoff.summary.pendingRows}`,
    `- Planned batches: ${handoff.summary.plannedBatches}`,
    `- Estimated remaining cost: $${handoff.summary.estimatedPendingCostUsd}`,
    `- First batch: rows ${handoff.summary.firstBatchStartIndex}-${handoff.summary.firstBatchEndIndex}, limit ${handoff.summary.firstBatchLimit}, estimated cost $${handoff.summary.firstBatchEstimatedCostUsd}`,
    '',
    '## Run Next Batch Outside Codex',
    '',
    '```powershell',
    'Set-Location C:\\appsprojects\\phraseman',
    '$env:OPENAI_API_KEY="<your key>"',
    '$env:PHRASEMAN_ALLOW_OPENAI_DEV_SPEND="1"',
    'powershell -ExecutionPolicy Bypass -File docs\\gustav\\generated\\fr\\reviewer\\fr_lesson_llm_review_external_handoff_run_next_batch.ps1 -BatchNumber 1',
    '```',
    '',
    '## After The Batch',
    '',
    'Return to Codex and run/ask for validation. The pipeline must rerun decision progress, partial quarantine, schema gate, import dry-run, non-accepted rows gate, and core closeout before audio/server/runtime can move.',
    '',
    '## Safety',
    '',
    '- No OpenAI calls are made by the handoff builder.',
    '- No reviewer decisions are imported by the handoff builder.',
    '- No app bundle files, Firebase/server uploads, runtime downloads, storage/cloud migration, or activation approval are opened.',
    '',
  ];
  return lines.join('\n');
}

function main() {
  const generatedAt = new Date().toISOString();
  const batchPlan = readJson(BATCH_PLAN_PATH);
  const batchPlanAudit = readJson(BATCH_PLAN_AUDIT_PATH);
  const readinessAudit = readJson(READINESS_AUDIT_PATH);
  const executionAudit = readJson(EXECUTION_AUDIT_PATH);
  const firstBatch = batchPlan.batches[0] || null;

  const handoff = {
    schemaVersion: 'gustav-fr-lesson-llm-review-external-handoff-v1',
    generatedAt,
    status: firstBatch ? 'HOLD_EXTERNAL_REVIEW_HANDOFF_READY' : 'PASS_NO_PENDING_REVIEW_BATCHES',
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    targetContentLang: 'fr',
    aiOutputLang: 'fr',
    activationApproved: false,
    inputs: {
      batchPlan: rel(BATCH_PLAN_PATH),
      batchPlanAudit: rel(BATCH_PLAN_AUDIT_PATH),
      readinessAudit: rel(READINESS_AUDIT_PATH),
      executionAudit: rel(EXECUTION_AUDIT_PATH),
    },
    outputs: {
      handoffJson: rel(OUT_JSON),
      handoffMarkdown: rel(OUT_MD),
      runNextBatchPowerShell: rel(OUT_PS1),
    },
    summary: {
      requestRows: batchPlanAudit.summary.requestRows,
      existingDecisionRows: batchPlanAudit.summary.existingDecisionRows,
      pendingRows: batchPlanAudit.summary.pendingRows,
      plannedBatches: batchPlanAudit.summary.plannedBatches,
      estimatedPendingCostUsd: batchPlanAudit.summary.estimatedPendingCostUsd,
      firstBatchNumber: firstBatch?.batchNumber ?? null,
      firstBatchStartIndex: firstBatch?.startIndex ?? null,
      firstBatchEndIndex: firstBatch?.endIndex ?? null,
      firstBatchLimit: firstBatch?.limit ?? 0,
      firstBatchEstimatedCostUsd: firstBatch?.estimatedCostUsd ?? 0,
      externalTerminalRequired: readinessAudit.summary.liveExecutionEnvironment.externalTerminalExecutionRequired,
      codexResponsesApiAllowed: readinessAudit.summary.liveExecutionEnvironment.responsesApiAllowedInCurrentProcess,
      openaiApiKeyPresentInCodexEnv: readinessAudit.summary.liveCredentialState.openaiApiKeyPresent,
      spendGuardOpenInCodexEnv: readinessAudit.summary.liveCredentialState.spendGuardOpen,
      latestExecutionAuditStatus: executionAudit.status,
      readyForApply: false,
    },
    batches: batchPlan.batches.map((batch) => ({
      batchNumber: batch.batchNumber,
      startIndex: batch.startIndex,
      endIndex: batch.endIndex,
      limit: batch.limit,
      lessonRange: batch.lessonRange,
      phraseRange: batch.phraseRange,
      estimatedCostUsd: batch.estimatedCostUsd,
      externalPowerShellCommand: `powershell -ExecutionPolicy Bypass -File docs\\gustav\\generated\\fr\\reviewer\\fr_lesson_llm_review_external_handoff_run_next_batch.ps1 -BatchNumber ${batch.batchNumber}`,
      executeCommand: batch.executeCommand,
      postReturnValidationGates: batch.postBatchGates,
    })),
    safety: {
      openAiCallsMadeByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      storageCloudMigrationStarted: false,
      activationApproved: false,
    },
    nextAfterExternalBatch: [
      'node scripts/gustav_build_fr_lesson_llm_review_execution_readiness_gate.mjs',
      'node scripts/gustav_build_fr_lesson_llm_review_batch_plan.mjs',
      'node scripts/gustav_build_fr_lesson_non_accepted_rows_gate.mjs',
      'node scripts/gustav_build_fr_core_lesson_delivery_closeout_bridge_gate.mjs',
      'node scripts/gustav_build_fr_full_surface_closeout_work_order.mjs',
    ],
  };

  writeText(OUT_JSON, `${JSON.stringify(handoff, null, 2)}\n`);
  writeText(OUT_MD, `${makeMarkdown(handoff)}\n`);
  writeText(OUT_PS1, makePowerShell(batchPlan.batches));

  console.log(`${handoff.status} ${rel(OUT_JSON)} batches=${handoff.summary.plannedBatches} pending=${handoff.summary.pendingRows}`);
}

main();
