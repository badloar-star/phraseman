import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'personal_practice');
const REQUESTS_PATH = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_review_requests_v1.jsonl');
const REQUESTS_AUDIT_PATH = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_review_requests_audit_v1.json');
const DECISIONS_PATH = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_review_decisions_v1.jsonl');
const OUT_JSON = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_review_external_handoff_v1.json');
const OUT_MD = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_review_external_handoff_v1.md');
const OUT_PS1 = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_review_external_handoff_run_next_batch.ps1');

const BATCH_SIZE = 25;
const EXPECTED_ROWS = 56;
const COST_PER_ROW = 0.0025;

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

function rowIdentity(row) {
  return `${row.requestId}:${row.sourceQueueIndex}:${row.frenchTrainingId}:${row.mistakeId}`;
}

function makeBatches(requests, decisions) {
  const decided = new Set(decisions.map(rowIdentity));
  const pending = requests.filter((request) => !decided.has(rowIdentity(request)));
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
      estimatedCostUsd: Number((rows.length * COST_PER_ROW).toFixed(4)),
    });
  }
  return { pending, batches };
}

function makePowerShell(batches) {
  const cases = batches.map((batch) => [
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
    'if ($env:CODEX_THREAD_ID) {',
    '  throw "Refusing to run OpenAI Responses review inside a Codex session. Open a normal PowerShell terminal."',
    '}',
    'if (-not $env:OPENAI_API_KEY) { throw "OPENAI_API_KEY is required." }',
    'if ($env:PHRASEMAN_ALLOW_OPENAI_DEV_SPEND -ne "1") { throw "PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 is required after reviewing batch cost." }',
    'switch ($BatchNumber) {',
    cases,
    '  default { throw "Unknown BatchNumber $BatchNumber. Valid range is 1-' + batches.length + '." }',
    '}',
    'Set-Location $projectRoot',
    'Write-Host "Running French personal-practice mistake-taxonomy review batch $BatchNumber (start-index $startIndex, limit $limit, estimated cost `$${expectedCost})"',
    'node scripts/gustav_execute_fr_personal_practice_mistake_taxonomy_review_batch.mjs --start-index $startIndex --limit $limit --execute --validate-after',
    'Write-Host "Batch complete. Return to Codex and ask it to continue validation."',
    '',
  ].join('\n');
}

function main() {
  const generatedAt = new Date().toISOString();
  const requestAudit = readJson(REQUESTS_AUDIT_PATH);
  const requests = readJsonl(REQUESTS_PATH);
  const decisions = readJsonl(DECISIONS_PATH);
  const { pending, batches } = makeBatches(requests, decisions);
  const blockers = [];
  if (requestAudit.summary?.readyForExternalReview !== true) blockers.push('REQUESTS_NOT_READY_FOR_EXTERNAL_REVIEW');
  if (requests.length !== EXPECTED_ROWS) blockers.push('REQUEST_COUNT_INVALID');

  const handoff = {
    schemaVersion: 'gustav-fr-personal-practice-mistake-taxonomy-review-external-handoff-v1',
    generatedAt,
    status: blockers.length > 0 ? 'BLOCK' : batches.length > 0 ? 'HOLD_EXTERNAL_MISTAKE_TAXONOMY_REVIEW_HANDOFF_READY' : 'PASS_NO_PENDING_MISTAKE_TAXONOMY_REVIEW_BATCHES',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    inputs: {
      requestsJsonl: rel(REQUESTS_PATH),
      requestsAudit: rel(REQUESTS_AUDIT_PATH),
      decisionsJsonl: rel(DECISIONS_PATH),
    },
    outputs: {
      handoffJson: rel(OUT_JSON),
      handoffMarkdown: rel(OUT_MD),
      runNextBatchPowerShell: rel(OUT_PS1),
    },
    summary: {
      requestRows: requests.length,
      existingDecisionRows: decisions.length,
      pendingRows: pending.length,
      plannedBatches: batches.length,
      batchSize: BATCH_SIZE,
      estimatedPendingCostUsd: Number((pending.length * COST_PER_ROW).toFixed(4)),
      firstBatchNumber: batches[0]?.batchNumber ?? null,
      firstBatchStartIndex: batches[0]?.startIndex ?? null,
      firstBatchEndIndex: batches[0]?.endIndex ?? null,
      firstBatchLimit: batches[0]?.limit ?? 0,
      firstBatchEstimatedCostUsd: batches[0]?.estimatedCostUsd ?? 0,
      readyForApply: false,
    },
    batches: batches.map((batch) => ({
      ...batch,
      externalPowerShellCommand: `powershell -ExecutionPolicy Bypass -File docs\\gustav\\generated\\fr\\personal_practice\\fr_personal_practice_mistake_taxonomy_review_external_handoff_run_next_batch.ps1 -BatchNumber ${batch.batchNumber}`,
    })),
    blockers,
    safety: {
      openAiCallsMadeByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      appBundleModifiedByThisScript: false,
      serverUploadStarted: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
    },
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(handoff, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUT_MD, `# French Personal Practice Mistake Taxonomy External Handoff\n\nStatus: ${handoff.status}\n\nPending rows: ${pending.length}\n\nActivation approved: false\n`, 'utf8');
  fs.writeFileSync(OUT_PS1, makePowerShell(batches), 'utf8');
  console.log(`${handoff.status} ${rel(OUT_JSON)} batches=${batches.length} pending=${pending.length}`);
  if (blockers.length > 0) process.exitCode = 1;
}

main();

