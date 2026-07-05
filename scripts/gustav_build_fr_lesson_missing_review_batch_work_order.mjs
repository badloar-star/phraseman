import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const REQUESTS_JSONL_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_requests_v1.jsonl');
const DECISIONS_JSONL_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_decisions_v1.jsonl');
const NON_ACCEPTED_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_non_accepted_rows_gate_audit_v1.json');
const BATCH_PLAN_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_batch_plan_v1.json');
const OUT_DIR = path.join(REVIEWER_DIR, 'missing_review_batches');
const OUT_WORK_ORDER_PATH = path.join(REVIEWER_DIR, 'fr_lesson_missing_review_batch_work_order_v1.json');
const OUT_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_missing_review_batch_work_order_audit_v1.json');
const OUT_MD_PATH = path.join(REVIEWER_DIR, 'fr_lesson_missing_review_batch_work_order_v1.md');

const EXPECTED_ROWS = 1600;
const MAX_BATCH_ROWS = 25;
const ESTIMATED_COST_PER_ROW_USD = 0.0025;

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sha256(filePath) {
  return fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : '';
}

function parseJsonlIfPresent(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function requestIdentity(row) {
  return `${row.requestId}:${row.sourceQueueIndex}:${row.lessonId}:${row.phraseId}`;
}

function decisionIdentity(row) {
  return `${row.requestId}:${row.sourceQueueIndex}:${row.lessonId}:${row.phraseId}`;
}

function makeBatchId(index) {
  return `fr-missing-review-batch-${String(index).padStart(3, '0')}`;
}

function summarizeByLesson(rows) {
  return Array.from({ length: 32 }, (_, index) => {
    const lessonId = index + 1;
    const lessonRows = rows.filter((row) => row.lessonId === lessonId);
    return {
      lessonId,
      missingReviewRows: lessonRows.length,
      firstSourceQueueIndex: lessonRows[0]?.sourceQueueIndex ?? null,
      lastSourceQueueIndex: lessonRows.at(-1)?.sourceQueueIndex ?? null,
    };
  }).filter((row) => row.missingReviewRows > 0);
}

function renderMarkdown(workOrder, audit) {
  const lines = [
    '# French Lesson Missing Review Batch Work Order',
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Request rows: ${audit.summary.requestRows}`,
    `- Decision rows: ${audit.summary.decisionRows}`,
    `- Missing review rows: ${audit.summary.missingReviewRows}`,
    `- Batch files: ${audit.summary.batchArtifacts}`,
    `- First batch command: \`${workOrder.batches[0]?.executeCommand ?? '-'}\``,
    `- Estimated remaining review cost: $${audit.summary.estimatedMissingReviewCostUsd}`,
    `- Activation approved: ${audit.activationApproved}`,
    '',
    '## First Batches',
    '',
  ];
  for (const batch of workOrder.batches.slice(0, 8)) {
    lines.push(`- \`${batch.batchId}\`: rows ${batch.startIndex}-${batch.endIndex}, lessons ${batch.lessonRange.firstLessonId}-${batch.lessonRange.lastLessonId}, artifact \`${batch.artifact}\``);
  }
  lines.push('', '## Safety', '');
  lines.push('- This work order writes only generated reviewer work-order artifacts.');
  lines.push('- It does not call OpenAI, append decisions, import decisions, generate audio, upload packs, enable runtime downloads, or approve activation.');
  lines.push('');
  return lines.join('\n');
}

function main() {
  const generatedAt = new Date().toISOString();
  const requests = parseJsonlIfPresent(REQUESTS_JSONL_PATH);
  const decisions = parseJsonlIfPresent(DECISIONS_JSONL_PATH);
  const nonAcceptedAudit = readJson(NON_ACCEPTED_AUDIT_PATH);
  const batchPlan = readJson(BATCH_PLAN_PATH);
  const decided = new Set(decisions.map(decisionIdentity));
  const missingRows = requests.filter((row) => !decided.has(requestIdentity(row)));
  const batches = [];

  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (let offset = 0; offset < missingRows.length; offset += MAX_BATCH_ROWS) {
    const rows = missingRows.slice(offset, offset + MAX_BATCH_ROWS);
    const batchNumber = batches.length + 1;
    const batchId = makeBatchId(batchNumber);
    const batchPath = path.join(OUT_DIR, `${batchId}.json`);
    const first = rows[0];
    const last = rows.at(-1);
    const batchArtifact = {
      schemaVersion: 'gustav-fr-lesson-missing-review-batch-v1',
      generatedAt,
      batchId,
      batchNumber,
      studyTarget: 'fr',
      sourceLocales: ['ru', 'uk'],
      targetContentLang: 'fr',
      aiOutputLang: 'fr',
      activationApproved: false,
      startIndex: first.sourceQueueIndex,
      endIndex: last.sourceQueueIndex,
      rowCount: rows.length,
      lessonRange: {
        firstLessonId: first.lessonId,
        lastLessonId: last.lessonId,
      },
      estimatedCostUsd: Number((rows.length * ESTIMATED_COST_PER_ROW_USD).toFixed(4)),
      executeCommand: `node scripts/gustav_execute_fr_lesson_llm_review_batch.mjs --start-index ${first.sourceQueueIndex} --limit ${rows.length} --execute --validate-after`,
      dryRunCommand: `node scripts/gustav_execute_fr_lesson_llm_review_batch.mjs --start-index ${first.sourceQueueIndex} --limit ${rows.length} --validate-after`,
      requests: rows,
      safety: {
        requestOnly: true,
        openAiCallsMadeByThisScript: false,
        reviewerDecisionsWrittenByThisScript: false,
        reviewerDecisionsImportedByThisScript: false,
        appBundleModifiedByThisScript: false,
        firebaseOrServerUploadStarted: false,
        runtimeDownloadsEnabled: false,
        activationApproved: false,
      },
    };
    writeJson(batchPath, batchArtifact);
    batches.push({
      batchId,
      batchNumber,
      artifact: rel(batchPath),
      startIndex: first.sourceQueueIndex,
      endIndex: last.sourceQueueIndex,
      rowCount: rows.length,
      lessonRange: batchArtifact.lessonRange,
      estimatedCostUsd: batchArtifact.estimatedCostUsd,
      dryRunCommand: batchArtifact.dryRunCommand,
      executeCommand: batchArtifact.executeCommand,
      requestIds: rows.map((row) => row.requestId),
    });
  }

  const blockers = [];
  if (requests.length !== EXPECTED_ROWS) blockers.push('REQUEST_ROWS_NOT_1600');
  if (missingRows.length !== (nonAcceptedAudit.summary?.missingDecisionRows ?? -1)) {
    blockers.push('MISSING_REVIEW_ROWS_DO_NOT_MATCH_NON_ACCEPTED_GATE');
  }
  if (batches.length !== (batchPlan.batches?.length ?? -1)) {
    blockers.push('BATCH_COUNT_DOES_NOT_MATCH_BATCH_PLAN');
  }
  if (batches.some((batch) => batch.rowCount > MAX_BATCH_ROWS)) blockers.push('BATCH_ROW_LIMIT_EXCEEDED');
  if (batches.some((batch, index) => batch.startIndex !== batchPlan.batches?.[index]?.startIndex)) {
    blockers.push('BATCH_START_INDEX_DOES_NOT_MATCH_BATCH_PLAN');
  }

  const workOrder = {
    schemaVersion: 'gustav-fr-lesson-missing-review-batch-work-order-v1',
    generatedAt,
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    targetContentLang: 'fr',
    aiOutputLang: 'fr',
    activationApproved: false,
    maxBatchRows: MAX_BATCH_ROWS,
    estimatedCostPerRowUsd: ESTIMATED_COST_PER_ROW_USD,
    requestsJsonl: rel(REQUESTS_JSONL_PATH),
    decisionsJsonl: rel(DECISIONS_JSONL_PATH),
    batches,
    missingByLesson: summarizeByLesson(missingRows),
    nextRequiredWork: [
      batches[0]?.executeCommand ?? 'No missing review batches remain.',
      'After each executed batch, rerun decision progress, schema, import dry-run, non-accepted rows and core closeout gates.',
      'Do not generate TTS/audio until all 1600 rows are reviewed and accepted.',
    ],
    safety: {
      workOrderOnly: true,
      openAiCallsMadeByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  const audit = {
    schemaVersion: 'gustav-fr-lesson-missing-review-batch-work-order-audit-v1',
    generatedAt,
    status: blockers.length === 0 ? 'HOLD_MISSING_REVIEW_BATCH_WORK_ORDER_READY' : 'BLOCK',
    activationApproved: false,
    inputs: {
      requestsJsonl: rel(REQUESTS_JSONL_PATH),
      decisionsJsonl: rel(DECISIONS_JSONL_PATH),
      nonAcceptedRowsGate: rel(NON_ACCEPTED_AUDIT_PATH),
      batchPlan: rel(BATCH_PLAN_PATH),
    },
    hashes: {
      requestsJsonlSha256: sha256(REQUESTS_JSONL_PATH),
      decisionsJsonlSha256: sha256(DECISIONS_JSONL_PATH),
      nonAcceptedRowsGateSha256: sha256(NON_ACCEPTED_AUDIT_PATH),
      batchPlanSha256: sha256(BATCH_PLAN_PATH),
    },
    summary: {
      requestRows: requests.length,
      decisionRows: decisions.length,
      missingReviewRows: missingRows.length,
      batchArtifacts: batches.length,
      maxBatchRows: MAX_BATCH_ROWS,
      firstBatchStartIndex: batches[0]?.startIndex ?? null,
      firstBatchLimit: batches[0]?.rowCount ?? 0,
      lastBatchEndIndex: batches.at(-1)?.endIndex ?? null,
      missingLessons: workOrder.missingByLesson.length,
      estimatedMissingReviewCostUsd: Number((missingRows.length * ESTIMATED_COST_PER_ROW_USD).toFixed(4)),
      readyForApply: false,
      blockers,
    },
    blockers,
    safety: workOrder.safety,
  };

  writeJson(OUT_WORK_ORDER_PATH, workOrder);
  writeJson(OUT_AUDIT_PATH, audit);
  fs.writeFileSync(OUT_MD_PATH, renderMarkdown(workOrder, audit), 'utf8');

  console.log(`Gustav French missing review batch work order: ${audit.status}`);
  console.log(`Missing review rows: ${audit.summary.missingReviewRows}`);
  console.log(`Batch artifacts: ${audit.summary.batchArtifacts}`);
  console.log(`First batch: ${workOrder.batches[0]?.executeCommand ?? 'none'}`);
  console.log(rel(OUT_WORK_ORDER_PATH));
  if (blockers.length > 0) process.exitCode = 1;
}

main();
