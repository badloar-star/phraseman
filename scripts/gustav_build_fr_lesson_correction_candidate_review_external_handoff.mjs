import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const WORK_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'work_orders');
const REQUESTS_PATH = path.join(WORK_DIR, 'fr_lesson_correction_candidate_review_requests_v1.jsonl');
const REQUESTS_AUDIT_PATH = path.join(WORK_DIR, 'fr_lesson_correction_candidate_review_requests_audit_v1.json');
const REQUESTS_MANIFEST_PATH = path.join(WORK_DIR, 'fr_lesson_correction_candidate_review_requests_manifest_v1.json');
const DECISIONS_PATH = path.join(WORK_DIR, 'fr_lesson_correction_candidate_review_decisions_v1.jsonl');
const EXECUTION_AUDIT_PATH = path.join(WORK_DIR, 'fr_lesson_correction_candidate_review_execution_audit_v1.json');
const EXECUTION_MD_PATH = path.join(WORK_DIR, 'fr_lesson_correction_candidate_review_execution_audit_v1.md');
const OUT_JSON = path.join(WORK_DIR, 'fr_lesson_correction_candidate_review_external_handoff_v1.json');
const OUT_MD = path.join(WORK_DIR, 'fr_lesson_correction_candidate_review_external_handoff_v1.md');
const OUT_PS1 = path.join(WORK_DIR, 'fr_lesson_correction_candidate_review_external_handoff_run_next_batch.ps1');

const BATCH_SIZE = 25;
const REQUIRED_TOTAL_ROWS = 290;
const ESTIMATED_COST_PER_ROW_USD = 0.0025;

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8').trim();
  return text ? text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)) : [];
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, 'utf8');
}

function requestIdentity(row) {
  return [row.requestId, row.sourceQueueIndex, row.batchId, row.phraseId].join('|');
}

function makePendingBatches(requests, decisions) {
  const decided = new Set(decisions.map(requestIdentity));
  const pending = requests.filter((request) => !decided.has(requestIdentity(request)));
  const batches = [];
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const rows = pending.slice(i, i + BATCH_SIZE);
    const first = rows[0];
    const last = rows[rows.length - 1];
    batches.push({
      batchNumber: batches.length + 1,
      startIndex: first.sourceQueueIndex,
      endIndex: last.sourceQueueIndex,
      limit: rows.length,
      firstRequestId: first.requestId,
      lastRequestId: last.requestId,
      lessonRange: [first.lessonId, last.lessonId],
      estimatedCostUsd: Number((rows.length * ESTIMATED_COST_PER_ROW_USD).toFixed(4)),
    });
  }
  return { pending, batches };
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
    'Write-Host "Running Gustav French correction-candidate LLM review batch $BatchNumber (start-index $startIndex, limit $limit, estimated cost `$${expectedCost})"',
    'node scripts/gustav_execute_fr_lesson_llm_review_batch.mjs --requests-jsonl docs\\gustav\\generated\\fr\\reviewer\\work_orders\\fr_lesson_correction_candidate_review_requests_v1.jsonl --requests-audit docs\\gustav\\generated\\fr\\reviewer\\work_orders\\fr_lesson_correction_candidate_review_requests_audit_v1.json --required-total-rows 290 --start-index $startIndex --limit $limit --out docs\\gustav\\generated\\fr\\reviewer\\work_orders\\fr_lesson_correction_candidate_review_decisions_v1.jsonl --execution-audit docs\\gustav\\generated\\fr\\reviewer\\work_orders\\fr_lesson_correction_candidate_review_execution_audit_v1.json --execution-md docs\\gustav\\generated\\fr\\reviewer\\work_orders\\fr_lesson_correction_candidate_review_execution_audit_v1.md --post-gate-mode none --execute --validate-after',
    'Write-Host "Correction-candidate batch complete. Return to Codex and ask it to continue validation."',
    '',
  ].join('\n');
}

function makeMarkdown(handoff) {
  return [
    '# Gustav French Correction Candidate Review External Handoff',
    '',
    `Status: \`${handoff.status}\``,
    '',
    `Generated at: ${handoff.generatedAt}`,
    '',
    '## Current State',
    '',
    `- Requests: ${handoff.summary.requestRows}`,
    `- Existing decisions: ${handoff.summary.existingDecisionRows}`,
    `- Pending rows: ${handoff.summary.pendingRows}`,
    `- Planned batches: ${handoff.summary.plannedBatches}`,
    `- Estimated pending cost: $${handoff.summary.estimatedPendingCostUsd}`,
    '',
    '## Run Next Batch Outside Codex',
    '',
    '```powershell',
    'Set-Location C:\\appsprojects\\phraseman',
    '$env:OPENAI_API_KEY="<your key>"',
    '$env:PHRASEMAN_ALLOW_OPENAI_DEV_SPEND="1"',
    'powershell -ExecutionPolicy Bypass -File docs\\gustav\\generated\\fr\\reviewer\\work_orders\\fr_lesson_correction_candidate_review_external_handoff_run_next_batch.ps1 -BatchNumber 1',
    '```',
    '',
    '## Safety',
    '',
    '- This is a separate correction-candidate review ledger.',
    '- The original 1600-row decision queue is not modified by this handoff.',
    '- No app bundle, audio, server upload, runtime download, storage/cloud migration, or activation approval is opened.',
    '',
  ].join('\n');
}

function main() {
  const generatedAt = new Date().toISOString();
  const requestAudit = readJson(REQUESTS_AUDIT_PATH);
  const requestManifest = readJson(REQUESTS_MANIFEST_PATH);
  const requests = readJsonl(REQUESTS_PATH);
  const decisions = readJsonl(DECISIONS_PATH);
  const { pending, batches } = makePendingBatches(requests, decisions);
  const firstBatch = batches[0] || null;
  const estimatedPendingCostUsd = Number((pending.length * ESTIMATED_COST_PER_ROW_USD).toFixed(4));

  const blockers = [];
  if (requestAudit.summary?.readyForExternalReview !== true) blockers.push('CORRECTION_REVIEW_REQUESTS_NOT_READY_FOR_EXTERNAL_REVIEW');
  if (requests.length !== REQUIRED_TOTAL_ROWS) blockers.push('CORRECTION_REVIEW_REQUEST_COUNT_INVALID');
  if (requestManifest.requestRows !== REQUIRED_TOTAL_ROWS) blockers.push('CORRECTION_REVIEW_MANIFEST_COUNT_INVALID');

  const handoff = {
    schemaVersion: 'gustav-fr-lesson-correction-candidate-review-external-handoff-v1',
    generatedAt,
    status: blockers.length > 0 ? 'BLOCK' : firstBatch ? 'HOLD_EXTERNAL_CORRECTION_REVIEW_HANDOFF_READY' : 'PASS_NO_PENDING_CORRECTION_REVIEW_BATCHES',
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    targetContentLang: 'fr',
    aiOutputLang: 'fr',
    activationApproved: false,
    inputs: {
      requestsJsonl: rel(REQUESTS_PATH),
      requestsAudit: rel(REQUESTS_AUDIT_PATH),
      requestsManifest: rel(REQUESTS_MANIFEST_PATH),
      decisionsJsonl: rel(DECISIONS_PATH),
    },
    outputs: {
      handoffJson: rel(OUT_JSON),
      handoffMarkdown: rel(OUT_MD),
      runNextBatchPowerShell: rel(OUT_PS1),
      executionAudit: rel(EXECUTION_AUDIT_PATH),
      executionMarkdown: rel(EXECUTION_MD_PATH),
    },
    summary: {
      requestRows: requests.length,
      existingDecisionRows: decisions.length,
      pendingRows: pending.length,
      plannedBatches: batches.length,
      batchSize: BATCH_SIZE,
      estimatedPendingCostUsd,
      firstBatchNumber: firstBatch?.batchNumber ?? null,
      firstBatchStartIndex: firstBatch?.startIndex ?? null,
      firstBatchEndIndex: firstBatch?.endIndex ?? null,
      firstBatchLimit: firstBatch?.limit ?? 0,
      firstBatchEstimatedCostUsd: firstBatch?.estimatedCostUsd ?? 0,
      runnerSupportsSeparateLedgers: true,
      readyForApply: false,
    },
    batches: batches.map((batch) => ({
      ...batch,
      externalPowerShellCommand: `powershell -ExecutionPolicy Bypass -File docs\\gustav\\generated\\fr\\reviewer\\work_orders\\fr_lesson_correction_candidate_review_external_handoff_run_next_batch.ps1 -BatchNumber ${batch.batchNumber}`,
      decisionsOutput: rel(DECISIONS_PATH),
      postReturnValidationGates: [
        'node scripts/gustav_execute_fr_lesson_llm_review_batch.mjs --post-gate-mode none dry-run evidence is written by the external run',
        'build correction-candidate decision schema gate',
        'build correction-candidate accept-only import dry-run gate',
        'rerun non-accepted rows gate',
        'rerun full surface closeout',
      ],
    })),
    blockers,
    safety: {
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
    },
    nextAfterExternalBatch: [
      'node scripts/gustav_build_fr_lesson_correction_candidate_review_external_handoff.mjs',
      'build correction-candidate decision schema gate',
      'build correction-candidate accept-only import dry-run gate',
      'node scripts/gustav_build_fr_lesson_non_accepted_rows_gate.mjs',
      'node scripts/gustav_build_fr_full_surface_closeout_work_order.mjs',
    ],
  };

  writeText(OUT_JSON, `${JSON.stringify(handoff, null, 2)}\n`);
  writeText(OUT_MD, `${makeMarkdown(handoff)}\n`);
  writeText(OUT_PS1, makePowerShell(batches));

  console.log(`${handoff.status} ${rel(OUT_JSON)} batches=${handoff.summary.plannedBatches} pending=${handoff.summary.pendingRows}`);

  if (blockers.length > 0) process.exitCode = 1;
}

main();
