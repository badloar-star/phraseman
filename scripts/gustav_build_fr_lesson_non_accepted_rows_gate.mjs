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
const OUTCOME_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_outcome_routing_gate_audit_v1.json');
const MATERIALIZED_INTEGRITY_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_materialized_integrity_gate_audit_v1.json');
const OUT_CONTRACT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_non_accepted_rows_work_order_contract_v1.json');
const OUT_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_non_accepted_rows_gate_audit_v1.json');
const OUT_MD_PATH = path.join(REVIEWER_DIR, 'fr_lesson_non_accepted_rows_gate_audit_v1.md');

const EXPECTED_ROWS = 1600;
const NON_ACCEPTED_DECISIONS = [
  'needs_regeneration',
  'needs_llm_regeneration_review',
  'reject_candidate',
  'skip_for_later',
];

const ROUTES = {
  missing_decision: 'docs/gustav/generated/fr/reviewer/missing/fr_lesson_missing_review_decisions_v1.jsonl',
  needs_regeneration: 'docs/gustav/generated/fr/reviewer/regeneration/fr_lesson_regeneration_queue_v1.jsonl',
  needs_llm_regeneration_review: 'docs/gustav/generated/fr/reviewer/regeneration/fr_lesson_regeneration_queue_v1.jsonl',
  reject_candidate: 'docs/gustav/generated/fr/reviewer/rejected/fr_lesson_rejected_rows_v1.jsonl',
  skip_for_later: 'docs/gustav/generated/fr/reviewer/skipped/fr_lesson_skipped_rows_v1.jsonl',
};

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function sha256(filePath) {
  return fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : '';
}

function readJsonIfPresent(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

function countByDecision(decisions) {
  return {
    needs_regeneration: decisions.filter((row) => row.reviewerDecision === 'needs_regeneration').length,
    needs_llm_regeneration_review: decisions.filter((row) => row.reviewerDecision === 'needs_llm_regeneration_review').length,
    reject_candidate: decisions.filter((row) => row.reviewerDecision === 'reject_candidate').length,
    skip_for_later: decisions.filter((row) => row.reviewerDecision === 'skip_for_later').length,
  };
}

function buildMarkdown(audit) {
  const lines = [
    '# Gustav French Lesson Non-Accepted Rows Gate',
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Decision rows: ${audit.summary.decisionRows}`,
    `- Missing decision rows: ${audit.summary.missingDecisionRows}`,
    `- Non-accepted rows: ${audit.summary.nonAcceptedRows}`,
    `- Regeneration rows: ${audit.summary.regenerationRows}`,
    `- Rejected rows: ${audit.summary.rejectedRows}`,
    `- Skipped rows: ${audit.summary.skippedRows}`,
    `- Work order materialization allowed: ${audit.summary.workOrderMaterializationAllowed ? 'yes' : 'no'}`,
    `- Audio blocked by non-accepted rows: ${audit.summary.audioBlockedByNonAcceptedRows ? 'yes' : 'no'}`,
    `- Ready for audio manifest gate: ${audit.summary.readyForAudioManifestGate ? 'yes' : 'no'}`,
    `- Ready for apply: ${audit.summary.readyForApply ? 'yes' : 'no'}`,
    '',
    '## Blockers',
    '',
  ];
  if (audit.productionBlockers.length === 0) lines.push('- None.');
  else for (const blocker of audit.productionBlockers) lines.push(`- \`${blocker}\``);
  lines.push('', '## Safety', '');
  lines.push('- This gate does not write regeneration/rejected/skipped queues.');
  lines.push('- This gate does not regenerate lesson content.');
  lines.push('- This gate does not generate audio, upload packs, enable downloads or approve activation.');
  lines.push('');
  return lines.join('\n');
}

function main() {
  const generatedAt = new Date().toISOString();
  const requests = parseJsonlIfPresent(REQUESTS_JSONL_PATH);
  const decisions = parseJsonlIfPresent(DECISIONS_JSONL_PATH);
  const outcomeAudit = readJsonIfPresent(OUTCOME_AUDIT_PATH);
  const materializedIntegrityAudit = readJsonIfPresent(MATERIALIZED_INTEGRITY_AUDIT_PATH);
  const counts = countByDecision(decisions);
  const decisionByRequestId = new Map(decisions.map((row) => [row.requestId, row]));
  const missingRequests = requests.filter((request) => !decisionByRequestId.has(request.requestId));
  const nonAcceptedRows = NON_ACCEPTED_DECISIONS.reduce((sum, decision) => sum + counts[decision], 0);
  const acceptedRows = decisions.filter((row) => row.reviewerDecision === 'accept_quality_gates').length;
  const requestRows = requests.length || EXPECTED_ROWS;
  const decisionsComplete = requestRows === EXPECTED_ROWS && decisions.length === EXPECTED_ROWS && missingRequests.length === 0;
  const outcomeRoutingReady = outcomeAudit?.status === 'PASS_READY_FOR_ROUTE_MATERIALIZATION_PLAN';
  const integrityReady = materializedIntegrityAudit?.status === 'PASS_MATERIALIZED_INTEGRITY_READY';
  const workOrderMaterializationAllowed = outcomeRoutingReady && decisionsComplete && nonAcceptedRows > 0;
  const allAccepted = decisionsComplete && acceptedRows === EXPECTED_ROWS;
  const audioBlockedByNonAcceptedRows = nonAcceptedRows > 0 || !allAccepted;

  const routeRows = [
    {
      reviewerDecision: 'missing_decision',
      rowCount: missingRequests.length,
      route: ROUTES.missing_decision,
      requiresFreshGeneration: false,
      requiresLlmTrustedSourceReview: true,
      blocksAudioServerRuntime: true,
    },
    ...NON_ACCEPTED_DECISIONS.map((decision) => ({
    reviewerDecision: decision,
    rowCount: counts[decision],
    route: ROUTES[decision],
    requiresFreshGeneration: decision === 'needs_regeneration' || decision === 'needs_llm_regeneration_review',
    requiresLlmTrustedSourceReview: decision === 'skip_for_later',
    blocksAudioServerRuntime: true,
    })),
  ];

  const perLesson = Array.from({ length: 32 }, (_, index) => {
    const lessonId = index + 1;
    const lessonRequests = requests.filter((row) => row.lessonId === lessonId);
    const lessonDecisions = decisions.filter((row) => row.lessonId === lessonId);
    return {
      lessonId,
      requestRows: lessonRequests.length,
      decisionRows: lessonDecisions.length,
      acceptedRows: lessonDecisions.filter((row) => row.reviewerDecision === 'accept_quality_gates').length,
      regenerationRows: lessonDecisions.filter((row) => row.reviewerDecision === 'needs_regeneration' || row.reviewerDecision === 'needs_llm_regeneration_review').length,
      rejectedRows: lessonDecisions.filter((row) => row.reviewerDecision === 'reject_candidate').length,
      skippedRows: lessonDecisions.filter((row) => row.reviewerDecision === 'skip_for_later').length,
      missingDecisionRows: lessonRequests.filter((request) => !decisionByRequestId.has(request.requestId)).length,
    };
  });
  const firstBlockedLessons = perLesson
    .filter((lesson) => lesson.missingDecisionRows > 0 || lesson.regenerationRows > 0 || lesson.rejectedRows > 0 || lesson.skippedRows > 0)
    .slice(0, 12);
  const missingDecisionBatches = [];
  for (let i = 0; i < missingRequests.length; i += 25) {
    const batch = missingRequests.slice(i, i + 25);
    missingDecisionBatches.push({
      batchNumber: i / 25 + 1,
      startIndex: batch[0]?.sourceQueueIndex ?? null,
      limit: batch.length,
      lessonRange: [
        Math.min(...batch.map((row) => row.lessonId)),
        Math.max(...batch.map((row) => row.lessonId)),
      ],
      dryRunCommand: `node scripts/gustav_execute_fr_lesson_llm_review_batch.mjs --start-index ${batch[0]?.sourceQueueIndex ?? 0} --limit ${batch.length} --validate-after`,
      executeCommand: `node scripts/gustav_execute_fr_lesson_llm_review_batch.mjs --start-index ${batch[0]?.sourceQueueIndex ?? 0} --limit ${batch.length} --execute --validate-after`,
    });
  }

  const productionBlockers = [];
  if (!fs.existsSync(REQUESTS_JSONL_PATH)) productionBlockers.push('REQUESTS_FILE_MISSING');
  if (!fs.existsSync(DECISIONS_JSONL_PATH)) productionBlockers.push('DECISIONS_FILE_MISSING');
  if (!decisionsComplete) productionBlockers.push('DECISIONS_NOT_COMPLETE');
  if (missingRequests.length > 0) productionBlockers.push('MISSING_DECISION_ROWS_REMAIN');
  if (!outcomeRoutingReady) productionBlockers.push('OUTCOME_ROUTING_NOT_READY');
  if (!integrityReady) productionBlockers.push('MATERIALIZED_INTEGRITY_NOT_READY');
  if (audioBlockedByNonAcceptedRows) productionBlockers.push('AUDIO_BLOCKED_UNTIL_ALL_ROWS_ACCEPTED');

  const contract = {
    schemaVersion: 'gustav-fr-lesson-non-accepted-rows-work-order-contract-v1',
    generatedAt,
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    rule: 'Non-accepted rows must be routed to isolated reviewer work orders. They cannot be used for audio generation, server pack materialization, runtime downloads or activation.',
    nonAcceptedDecisions: NON_ACCEPTED_DECISIONS,
    routes: routeRows,
    missingDecisionBatches: missingDecisionBatches.slice(0, 20),
    firstBlockedLessons,
    workOrderMaterializationAllowed,
    outputRoot: 'docs/gustav/generated/fr/reviewer/',
    forbiddenOutputs: [
      'app/',
      'admin/',
      'functions/',
      'docs/gustav/generated/fr/audio/',
      'docs/gustav/generated/fr/server/',
      'docs/gustav/generated/fr/runtime/',
      'course-packs/',
    ],
  };

  const audit = {
    schemaVersion: 'gustav-fr-lesson-non-accepted-rows-gate-audit-v1',
    generatedAt,
    status: productionBlockers.length === 0 ? 'PASS_NO_NON_ACCEPTED_ROWS_AUDIO_CAN_CONTINUE' : 'HOLD',
    activationApproved: false,
    inputs: {
      decisionsJsonl: rel(DECISIONS_JSONL_PATH),
      requestsJsonl: rel(REQUESTS_JSONL_PATH),
      outcomeRoutingAudit: rel(OUTCOME_AUDIT_PATH),
      materializedIntegrityAudit: rel(MATERIALIZED_INTEGRITY_AUDIT_PATH),
    },
    hashes: {
      requestsJsonlSha256: sha256(REQUESTS_JSONL_PATH),
      decisionsJsonlSha256: sha256(DECISIONS_JSONL_PATH),
      outcomeRoutingAuditSha256: sha256(OUTCOME_AUDIT_PATH),
      materializedIntegrityAuditSha256: sha256(MATERIALIZED_INTEGRITY_AUDIT_PATH),
    },
    summary: {
      requestRows,
      decisionRows: decisions.length,
      acceptedRows,
      missingDecisionRows: missingRequests.length,
      nonAcceptedRows,
      regenerationRows: counts.needs_regeneration + counts.needs_llm_regeneration_review,
      rejectedRows: counts.reject_candidate,
      skippedRows: counts.skip_for_later,
      decisionsComplete,
      sourceLocaleCoverageRows: requests.filter((row) =>
        Array.isArray(row.sourceLocaleCoverage) &&
        row.sourceLocaleCoverage.includes('ru') &&
        row.sourceLocaleCoverage.includes('uk')).length,
      outcomeRoutingReady,
      materializedIntegrityReady: integrityReady,
      workOrderMaterializationAllowed,
      audioBlockedByNonAcceptedRows,
      readyForAudioManifestGate: productionBlockers.length === 0 && allAccepted,
      readyForServerPackManifestGate: false,
      readyForRuntimeDeliveryGate: false,
      readyForApply: false,
      productionBlockers,
    },
    routeRows,
    perLesson,
    missingDecisionBatches,
    firstBlockedLessons,
    productionBlockers,
    safety: {
      dryRunOnly: true,
      workOrdersWrittenByThisScript: false,
      regenerationRowsGeneratedByThisScript: false,
      rejectedRowsWrittenByThisScript: false,
      skippedRowsWrittenByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      adminUiModifiedByThisScript: false,
      functionsModifiedByThisScript: false,
      audioGeneratedByThisScript: false,
      serverPackManifestModifiedByThisScript: false,
      runtimeDownloadsEnabled: false,
      firebaseOrServerUploadStarted: false,
      productionApplyApproved: false,
    },
    nextRequiredGates: productionBlockers.length === 0
      ? [
          'audio_manifest_gate',
          'server_pack_manifest_gate',
          'runtime_delivery_gate',
          'admin_activation_rollback_gate',
          'explicit_activation_approval_gate',
        ]
      : [
          'complete_llm_review_decisions',
          'outcome_routing_gate',
          'materialized_integrity_gate',
          'non_accepted_rows_gate',
        ],
  };

  writeJson(OUT_CONTRACT_PATH, contract);
  writeJson(OUT_AUDIT_PATH, audit);
  fs.writeFileSync(OUT_MD_PATH, buildMarkdown(audit), 'utf8');

  console.log(`Gustav French lesson non-accepted rows gate: ${audit.status}`);
  console.log(`Non-accepted rows: ${nonAcceptedRows}`);
  console.log(`Audio blocked: ${audit.summary.audioBlockedByNonAcceptedRows ? 'yes' : 'no'}`);
  console.log(rel(OUT_AUDIT_PATH));
}

main();
