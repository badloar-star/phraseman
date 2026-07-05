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
const SCHEMA_GATE_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_decision_schema_gate_audit_v1.json');
const IMPORT_DRY_RUN_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_decision_import_dry_run_audit_v1.json');
const PROGRESS_GATE_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_decision_progress_gate_audit_v1.json');
const OUT_PLAN_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_outcome_routing_plan_v1.json');
const OUT_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_outcome_routing_gate_audit_v1.json');
const OUT_MD_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_outcome_routing_gate_audit_v1.md');

const EXPECTED_ROWS = 1600;
const ACCEPT_DECISION = 'accept_quality_gates';
const REGEN_DECISIONS = new Set(['needs_regeneration', 'needs_llm_regeneration_review']);
const REJECT_DECISION = 'reject_candidate';
const SKIP_DECISION = 'skip_for_later';

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

function decisionIdentity(row) {
  return `${row.requestId}:${row.sourceQueueIndex}:${row.lessonId}:${row.phraseId}`;
}

function requestIdentity(row) {
  return `${row.requestId}:${row.sourceQueueIndex}:${row.lessonId}:${row.phraseId}`;
}

function countOutcomes(decisions) {
  const accepted = decisions.filter((row) => row.reviewerDecision === ACCEPT_DECISION).length;
  const regeneration = decisions.filter((row) => REGEN_DECISIONS.has(row.reviewerDecision)).length;
  const rejected = decisions.filter((row) => row.reviewerDecision === REJECT_DECISION).length;
  const skipped = decisions.filter((row) => row.reviewerDecision === SKIP_DECISION).length;
  const unknown = decisions.length - accepted - regeneration - rejected - skipped;
  return { accepted, regeneration, rejected, skipped, unknown };
}

function buildMarkdown(audit) {
  const lines = [
    '# Gustav French Lesson Review Outcome Routing Gate',
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Schema gate ready: ${audit.summary.schemaGateReady ? 'yes' : 'no'}`,
    `- Import dry-run ready: ${audit.summary.importDryRunReady ? 'yes' : 'no'}`,
    `- Decision rows: ${audit.summary.decisionRows}`,
    `- Accepted: ${audit.summary.outcomes.accepted}`,
    `- Regeneration: ${audit.summary.outcomes.regeneration}`,
    `- Rejected: ${audit.summary.outcomes.rejected}`,
    `- Skipped: ${audit.summary.outcomes.skipped}`,
    `- Would materialize accepted ledger: ${audit.summary.routes.acceptedLedgerMaterialization.allowed ? 'yes' : 'no'}`,
    `- Would create regeneration queue: ${audit.summary.routes.regenerationQueue.allowed ? 'yes' : 'no'}`,
    `- Ready for audio manifest gate: ${audit.summary.readyForAudioManifestGate ? 'yes' : 'no'}`,
    `- Ready for apply: ${audit.summary.readyForApply ? 'yes' : 'no'}`,
    '',
    '## Blockers',
    '',
  ];
  if (audit.productionBlockers.length === 0) lines.push('- None.');
  else for (const blocker of audit.productionBlockers) lines.push(`- \`${blocker}\``);
  lines.push('', '## Safety', '');
  lines.push('- This gate does not write accepted ledgers.');
  lines.push('- This gate does not write regeneration queues.');
  lines.push('- This gate does not generate audio, upload server packs, enable runtime downloads or approve activation.');
  lines.push('');
  return lines.join('\n');
}

function main() {
  const generatedAt = new Date().toISOString();
  const requests = parseJsonlIfPresent(REQUESTS_JSONL_PATH);
  const decisions = parseJsonlIfPresent(DECISIONS_JSONL_PATH);
  const schemaGate = readJsonIfPresent(SCHEMA_GATE_AUDIT_PATH);
  const importDryRun = readJsonIfPresent(IMPORT_DRY_RUN_AUDIT_PATH);
  const progressGate = readJsonIfPresent(PROGRESS_GATE_AUDIT_PATH);
  const requestIds = new Set(requests.map(requestIdentity));
  const decisionIds = new Set(decisions.map(decisionIdentity));
  const matchedDecisionRows = decisions.filter((decision) => requestIds.has(decisionIdentity(decision))).length;
  const missingDecisionRows = requests.filter((request) => !decisionIds.has(requestIdentity(request))).length;
  const outcomes = countOutcomes(decisions);

  const schemaGateReady = schemaGate?.summary?.readyForDecisionImportDryRun === true;
  const importDryRunReady = importDryRun?.summary?.wouldImportReviewedStatuses === true;
  const allRowsReviewed = requests.length === EXPECTED_ROWS && matchedDecisionRows === EXPECTED_ROWS && missingDecisionRows === 0;
  const allRowsAccepted = allRowsReviewed && outcomes.accepted === EXPECTED_ROWS;
  const allRowsRouted =
    allRowsReviewed &&
    outcomes.unknown === 0 &&
    outcomes.accepted + outcomes.regeneration + outcomes.rejected + outcomes.skipped === EXPECTED_ROWS;

  const productionBlockers = [];
  if (requests.length !== EXPECTED_ROWS) productionBlockers.push('REQUEST_COUNT_NOT_1600');
  if (!fs.existsSync(DECISIONS_JSONL_PATH)) productionBlockers.push('DECISIONS_FILE_MISSING');
  if (!allRowsReviewed) productionBlockers.push('DECISIONS_NOT_COMPLETE');
  if (!schemaGateReady) productionBlockers.push('SCHEMA_GATE_NOT_READY');
  if (!importDryRunReady) productionBlockers.push('IMPORT_DRY_RUN_NOT_READY');
  if (outcomes.unknown > 0) productionBlockers.push('UNKNOWN_REVIEWER_OUTCOMES');

  const routes = {
    acceptedLedgerMaterialization: {
      allowed: schemaGateReady && importDryRunReady && allRowsAccepted,
      rowCount: outcomes.accepted,
      plannedOutput: 'docs/gustav/generated/fr/reviewer/materialized/fr_lesson_accepted_reviewed_ledgers_v1/',
      blocker: allRowsAccepted ? '' : 'requires_all_1600_rows_accepted',
    },
    regenerationQueue: {
      allowed: schemaGateReady && importDryRunReady && allRowsRouted && outcomes.regeneration > 0,
      rowCount: outcomes.regeneration,
      plannedOutput: 'docs/gustav/generated/fr/reviewer/regeneration/fr_lesson_regeneration_queue_v1.jsonl',
      blocker: outcomes.regeneration > 0 ? '' : 'no_regeneration_rows_yet',
    },
    rejectedRowsLedger: {
      allowed: schemaGateReady && importDryRunReady && allRowsRouted && outcomes.rejected > 0,
      rowCount: outcomes.rejected,
      plannedOutput: 'docs/gustav/generated/fr/reviewer/rejected/fr_lesson_rejected_rows_v1.jsonl',
      blocker: outcomes.rejected > 0 ? '' : 'no_rejected_rows_yet',
    },
    skippedRowsLedger: {
      allowed: schemaGateReady && importDryRunReady && allRowsRouted && outcomes.skipped > 0,
      rowCount: outcomes.skipped,
      plannedOutput: 'docs/gustav/generated/fr/reviewer/skipped/fr_lesson_skipped_rows_v1.jsonl',
      blocker: outcomes.skipped > 0 ? '' : 'no_skipped_rows_yet',
    },
  };

  const plan = {
    schemaVersion: 'gustav-fr-lesson-review-outcome-routing-plan-v1',
    generatedAt,
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    targetContentLang: 'fr',
    aiOutputLang: 'fr',
    activationApproved: false,
    rule: 'LLM decisions route to accepted/regeneration/rejected/skipped buckets only after full schema and import dry-run gates pass. Partial decisions never unlock audio, server packs, runtime downloads or apply.',
    routes,
    postRouteGates: [
      'regeneration_or_reject_non_accepted_rows_gate',
      'audio_manifest_gate_only_if_all_1600_accepted',
      'server_pack_manifest_gate',
      'runtime_delivery_gate',
      'admin_activation_rollback_gate',
      'explicit_activation_approval_gate',
    ],
  };

  const audit = {
    schemaVersion: 'gustav-fr-lesson-review-outcome-routing-gate-audit-v1',
    generatedAt,
    status: productionBlockers.length > 0 ? 'HOLD' : 'PASS_READY_FOR_ROUTE_MATERIALIZATION_PLAN',
    activationApproved: false,
    inputs: {
      requestsJsonl: rel(REQUESTS_JSONL_PATH),
      decisionsJsonl: rel(DECISIONS_JSONL_PATH),
      schemaGateAudit: rel(SCHEMA_GATE_AUDIT_PATH),
      importDryRunAudit: rel(IMPORT_DRY_RUN_AUDIT_PATH),
      progressGateAudit: rel(PROGRESS_GATE_AUDIT_PATH),
    },
    hashes: {
      requestsJsonlSha256: sha256(REQUESTS_JSONL_PATH),
      decisionsJsonlSha256: sha256(DECISIONS_JSONL_PATH),
      schemaGateAuditSha256: sha256(SCHEMA_GATE_AUDIT_PATH),
      importDryRunAuditSha256: sha256(IMPORT_DRY_RUN_AUDIT_PATH),
      progressGateAuditSha256: sha256(PROGRESS_GATE_AUDIT_PATH),
    },
    summary: {
      requestRows: requests.length,
      decisionFilePresent: fs.existsSync(DECISIONS_JSONL_PATH),
      decisionRows: decisions.length,
      matchedDecisionRows,
      missingDecisionRows,
      progressGateStatus: progressGate?.status || 'missing',
      schemaGateReady,
      importDryRunReady,
      allRowsReviewed,
      allRowsAccepted,
      allRowsRouted,
      outcomes,
      routes,
      readyForAudioManifestGate: routes.acceptedLedgerMaterialization.allowed,
      readyForServerPackManifestGate: false,
      readyForRuntimeDeliveryGate: false,
      readyForApply: false,
      productionBlockers,
    },
    productionBlockers,
    safety: {
      dryRunOnly: true,
      acceptedLedgersMaterializedByThisScript: false,
      regenerationQueueWrittenByThisScript: false,
      rejectedRowsWrittenByThisScript: false,
      skippedRowsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
    nextRequiredGates: productionBlockers.length > 0
      ? [
          'execute_or_import_complete_llm_review_decisions',
          'decision_progress_gate',
          'llm_review_decision_schema_gate',
          'review_decision_import_dry_run_gate',
        ]
      : [
          'route_materialization_gate',
          'regeneration_or_reject_non_accepted_rows_gate',
          'audio_manifest_gate',
          'server_pack_manifest_gate',
          'runtime_delivery_gate',
          'admin_activation_rollback_gate',
          'explicit_activation_approval_gate',
        ],
  };

  writeJson(OUT_PLAN_PATH, plan);
  writeJson(OUT_AUDIT_PATH, audit);
  fs.writeFileSync(OUT_MD_PATH, buildMarkdown(audit), 'utf8');

  console.log(`Gustav French lesson review outcome routing gate: ${audit.status}`);
  console.log(`Decisions: ${decisions.length}/${EXPECTED_ROWS}`);
  console.log(`Accepted/regeneration/rejected/skipped: ${outcomes.accepted}/${outcomes.regeneration}/${outcomes.rejected}/${outcomes.skipped}`);
  console.log(`Ready for audio manifest gate: ${audit.summary.readyForAudioManifestGate ? 'yes' : 'no'}`);
  console.log(rel(OUT_AUDIT_PATH));
}

main();
