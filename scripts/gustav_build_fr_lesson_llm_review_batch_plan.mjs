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
const READINESS_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_execution_readiness_gate_audit_v1.json');
const OUT_PLAN_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_batch_plan_v1.json');
const OUT_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_batch_plan_audit_v1.json');
const OUT_MD_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_batch_plan_v1.md');

const REQUIRED_TOTAL_ROWS = 1600;
const DEFAULT_BATCH_SIZE = 25;
const ESTIMATED_COST_PER_ROW_USD = 0.0025;

function parseArgs(argv) {
  const args = {
    batchSize: DEFAULT_BATCH_SIZE,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--batch-size') args.batchSize = Number(argv[++i] || DEFAULT_BATCH_SIZE);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Number.isInteger(args.batchSize) || args.batchSize < 1 || args.batchSize > 200) {
    throw new Error('--batch-size must be an integer from 1 to 200');
  }
  return args;
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
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

function readJsonIfPresent(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function decisionIdentity(decision) {
  return `${decision.requestId}:${decision.sourceQueueIndex}:${decision.lessonId}:${decision.phraseId}`;
}

function requestIdentity(request) {
  return `${request.requestId}:${request.sourceQueueIndex}:${request.lessonId}:${request.phraseId}`;
}

function countByReasoningLevel(rows) {
  return rows.reduce((acc, row) => {
    const level = row.instructions?.reasoningLevel || row.reasoningLevel || 'missing';
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {});
}

function buildBatches(pendingRows, batchSize) {
  const batches = [];
  for (let offset = 0; offset < pendingRows.length; offset += batchSize) {
    const rows = pendingRows.slice(offset, offset + batchSize);
    const first = rows[0];
    const last = rows[rows.length - 1];
    batches.push({
      batchNumber: batches.length + 1,
      startIndex: first.sourceQueueIndex,
      endIndex: last.sourceQueueIndex,
      limit: rows.length,
      lessonRange: {
        firstLessonId: first.lessonId,
        lastLessonId: last.lessonId,
      },
      phraseRange: {
        firstPhraseId: first.phraseId,
        lastPhraseId: last.phraseId,
      },
      reasoningLevels: countByReasoningLevel(rows),
      estimatedCostUsd: Number((rows.length * ESTIMATED_COST_PER_ROW_USD).toFixed(4)),
      dryRunCommand: `node scripts/gustav_execute_fr_lesson_llm_review_batch.mjs --start-index ${first.sourceQueueIndex} --limit ${rows.length} --validate-after`,
      executeCommand: `node scripts/gustav_execute_fr_lesson_llm_review_batch.mjs --start-index ${first.sourceQueueIndex} --limit ${rows.length} --execute --validate-after`,
      postBatchGates: [
        'node scripts/gustav_build_fr_lesson_llm_review_decision_progress_gate.mjs',
        'node scripts/gustav_build_fr_lesson_llm_review_partial_quarantine_gate.mjs',
        'node scripts/gustav_validate_fr_lesson_llm_review_decisions.mjs',
        'node scripts/gustav_fr_lesson_review_decision_import_dry_run.mjs',
        'node scripts/gustav_build_fr_lesson_llm_review_execution_readiness_gate.mjs',
      ],
    });
  }
  return batches;
}

function buildMarkdown(plan, audit) {
  const lines = [
    '# Gustav French Lesson LLM Review Batch Plan',
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Request rows: ${audit.summary.requestRows}`,
    `- Existing decisions: ${audit.summary.existingDecisionRows}`,
    `- Pending rows: ${audit.summary.pendingRows}`,
    `- Batch size: ${audit.summary.batchSize}`,
    `- Planned batches: ${audit.summary.plannedBatches}`,
    `- Estimated pending cost: $${audit.summary.estimatedPendingCostUsd}`,
    `- Spend guard open: ${audit.summary.spendGuardOpen ? 'yes' : 'no'}`,
    `- Can execute live now: ${audit.summary.canExecuteLiveNow ? 'yes' : 'no'}`,
    '',
    '## First Batches',
    '',
  ];
  for (const batch of plan.batches.slice(0, 8)) {
    lines.push(`- Batch ${batch.batchNumber}: rows ${batch.startIndex}-${batch.endIndex}, lessons ${batch.lessonRange.firstLessonId}-${batch.lessonRange.lastLessonId}, cost $${batch.estimatedCostUsd}`);
  }
  lines.push('', '## Safety', '');
  lines.push('- This script does not call OpenAI.');
  lines.push('- This script does not write reviewer decisions.');
  lines.push('- Live execution still requires PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 at command runtime.');
  lines.push('- Review decisions do not unlock production; schema/import/audio/server/runtime/admin/rollback gates still decide promotion.');
  lines.push('');
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const requests = parseJsonlIfPresent(REQUESTS_JSONL_PATH);
  const decisions = parseJsonlIfPresent(DECISIONS_JSONL_PATH);
  const decisionIds = new Set(decisions.map(decisionIdentity));
  const pendingRows = requests.filter((request) => !decisionIds.has(requestIdentity(request)));
  const batches = buildBatches(pendingRows, args.batchSize);
  const readinessAudit = readJsonIfPresent(READINESS_AUDIT_PATH);
  const spendGuardOpen = process.env.PHRASEMAN_ALLOW_OPENAI_DEV_SPEND === '1';
  const openaiApiKeyPresent = Boolean(readinessAudit?.summary?.liveCredentialState?.openaiApiKeyPresent);
  const responsesApiAllowedInCurrentProcess = readinessAudit?.summary?.liveExecutionEnvironment?.responsesApiAllowedInCurrentProcess !== false;
  const externalTerminalExecutionRequired = readinessAudit?.summary?.liveExecutionEnvironment?.externalTerminalExecutionRequired === true;
  const canExecuteLiveNow = openaiApiKeyPresent && spendGuardOpen && responsesApiAllowedInCurrentProcess && pendingRows.length > 0;

  const plan = {
    schemaVersion: 'gustav-fr-lesson-llm-review-batch-plan-v1',
    generatedAt,
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    targetContentLang: 'fr',
    aiOutputLang: 'fr',
    activationApproved: false,
    batchSize: args.batchSize,
    estimatedCostPerRowUsd: ESTIMATED_COST_PER_ROW_USD,
    requestsJsonl: rel(REQUESTS_JSONL_PATH),
    decisionsJsonl: rel(DECISIONS_JSONL_PATH),
    batches,
  };

  const blockers = [];
  if (requests.length !== REQUIRED_TOTAL_ROWS) blockers.push('REQUEST_COUNT_NOT_1600');
  if (!openaiApiKeyPresent) blockers.push('OPENAI_API_KEY_NOT_DETECTED_BY_READINESS_GATE');
  if (!spendGuardOpen) blockers.push('PHRASEMAN_ALLOW_OPENAI_DEV_SPEND_NOT_SET');
  if (decisions.length < REQUIRED_TOTAL_ROWS) blockers.push('DECISIONS_INCOMPLETE');

  const audit = {
    schemaVersion: 'gustav-fr-lesson-llm-review-batch-plan-audit-v1',
    generatedAt,
    status: pendingRows.length === 0 ? 'PASS_ALL_DECISIONS_PRESENT' : 'HOLD_BATCH_PLAN_READY',
    activationApproved: false,
    inputs: {
      requestsJsonl: rel(REQUESTS_JSONL_PATH),
      decisionsJsonl: rel(DECISIONS_JSONL_PATH),
      readinessAudit: rel(READINESS_AUDIT_PATH),
    },
    hashes: {
      requestsJsonlSha256: sha256(REQUESTS_JSONL_PATH),
      decisionsJsonlSha256: sha256(DECISIONS_JSONL_PATH),
      readinessAuditSha256: sha256(READINESS_AUDIT_PATH),
    },
    summary: {
      requestRows: requests.length,
      existingDecisionRows: decisions.length,
      pendingRows: pendingRows.length,
      reasoningLevelsPending: countByReasoningLevel(pendingRows),
      batchSize: args.batchSize,
      plannedBatches: batches.length,
      firstBatchStartIndex: batches[0]?.startIndex || null,
      firstBatchLimit: batches[0]?.limit || 0,
      estimatedPendingCostUsd: Number((pendingRows.length * ESTIMATED_COST_PER_ROW_USD).toFixed(4)),
      openaiApiKeyPresent,
      spendGuardOpen,
      responsesApiAllowedInCurrentProcess,
      externalTerminalExecutionRequired,
      canExecuteLiveNow,
      readyForApply: false,
      blockers,
    },
    safety: {
      openAiCallsMadeByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
    nextRequiredGates: [
      'execute_batch_plan_until_1600_decisions_exist',
      'llm_review_decision_schema_gate',
      'review_decision_import_dry_run_gate',
      'audio_manifest_gate',
      'server_pack_manifest_gate',
      'runtime_delivery_gate',
      'admin_activation_rollback_gate',
      'explicit_activation_approval_gate',
    ],
  };

  writeJson(OUT_PLAN_PATH, plan);
  writeJson(OUT_AUDIT_PATH, audit);
  fs.writeFileSync(OUT_MD_PATH, buildMarkdown(plan, audit), 'utf8');

  console.log(`Gustav French lesson LLM review batch plan: ${audit.status}`);
  console.log(`Pending rows: ${pendingRows.length}/${REQUIRED_TOTAL_ROWS}`);
  console.log(`Planned batches: ${batches.length}`);
  console.log(`Estimated pending cost: $${audit.summary.estimatedPendingCostUsd}`);
  console.log(`Can execute live now: ${canExecuteLiveNow ? 'yes' : 'no'}`);
  console.log(rel(OUT_PLAN_PATH));
}

main();
