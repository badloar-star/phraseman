import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const REQUESTS_JSONL_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_requests_v1.jsonl');
const DECISIONS_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_decisions_v1.jsonl');
const SCHEMA_GATE_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_decision_schema_gate_audit_v1.json');
const OUT_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_decision_import_dry_run_audit_v1.json');
const OUT_MD_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_decision_import_dry_run_audit_v1.md');

const EXPECTED_ROWS = 1600;
const ACCEPT_DECISION = 'accept_quality_gates';
const REGEN_DECISIONS = new Set(['needs_regeneration', 'needs_llm_regeneration_review']);
const REJECT_DECISION = 'reject_candidate';
const SKIP_DECISION = 'skip_for_later';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseJsonlIfExists(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).map((line) => JSON.parse(line));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(filePath) {
  return fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : '';
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function renderMarkdown(report) {
  const lines = [
    '# Gustav French Lesson Review Decision Import Dry Run',
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Schema gate ready: ${report.summary.schemaGateReady ? 'yes' : 'no'}`,
    `- Request rows: ${report.summary.requestRows}`,
    `- Decision rows: ${report.summary.decisionRows}`,
    `- Accepted rows: ${report.summary.acceptedRows}`,
    `- Regeneration rows: ${report.summary.regenerationRows}`,
    `- Rejected rows: ${report.summary.rejectedRows}`,
    `- Skipped rows: ${report.summary.skippedRows}`,
    `- Would import reviewed statuses: ${report.summary.wouldImportReviewedStatuses ? 'yes' : 'no'}`,
    `- Would materialize accepted ledger: ${report.summary.wouldMaterializeAcceptedLedger ? 'yes' : 'no'}`,
    `- Ready for audio manifest gate: ${report.summary.readyForAudioManifestGate ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    for (const finding of report.findings) lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}`);
  }
  lines.push('', '## Safety', '');
  lines.push('- This is a dry-run report only.');
  lines.push('- It does not write reviewer decisions into lesson ledgers.');
  lines.push('- It does not materialize accepted packs.');
  lines.push('- It does not upload server/Firebase packs.');
  lines.push('- It does not enable runtime downloads or approve activation.');
  lines.push('');
  return lines.join('\n');
}

function main() {
  const generatedAt = new Date().toISOString();
  const schemaGate = readJson(SCHEMA_GATE_AUDIT_PATH);
  const requests = parseJsonlIfExists(REQUESTS_JSONL_PATH);
  const decisions = parseJsonlIfExists(DECISIONS_PATH);
  const findings = [];

  const schemaGateReady = schemaGate.summary?.readyForDecisionImportDryRun === true;
  if (!schemaGateReady) {
    findings.push({
      severity: 'info',
      code: 'schema_gate_not_ready',
      message: 'LLM review decisions are not schema-valid and complete yet; import dry-run remains HOLD.',
    });
  }
  if (requests.length !== EXPECTED_ROWS) {
    findings.push({
      severity: 'blocker',
      code: 'request_row_count_invalid',
      message: `Expected ${EXPECTED_ROWS} request rows, found ${requests.length}.`,
    });
  }
  if (schemaGateReady && decisions.length !== EXPECTED_ROWS) {
    findings.push({
      severity: 'blocker',
      code: 'decision_row_count_invalid',
      message: `Expected ${EXPECTED_ROWS} decision rows when schema gate is ready, found ${decisions.length}.`,
    });
  }

  const acceptedRows = decisions.filter((row) => row.reviewerDecision === ACCEPT_DECISION).length;
  const regenerationRows = decisions.filter((row) => REGEN_DECISIONS.has(row.reviewerDecision)).length;
  const rejectedRows = decisions.filter((row) => row.reviewerDecision === REJECT_DECISION).length;
  const skippedRows = decisions.filter((row) => row.reviewerDecision === SKIP_DECISION).length;
  const openedProductionRows = decisions.filter((row) =>
    row.reviewerImportAllowed || row.productionApplyAllowed || row.activationApproved,
  ).length;
  if (openedProductionRows > 0) {
    findings.push({
      severity: 'blocker',
      code: 'decision_opened_production_flags',
      message: `${openedProductionRows} decisions opened import/apply/activation flags.`,
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const allRowsAccepted = schemaGateReady && blockers === 0 && decisions.length === EXPECTED_ROWS && acceptedRows === EXPECTED_ROWS;
  const allRowsReviewedButSomeNeedWork =
    schemaGateReady &&
    blockers === 0 &&
    decisions.length === EXPECTED_ROWS &&
    acceptedRows < EXPECTED_ROWS &&
    acceptedRows + regenerationRows + rejectedRows + skippedRows === EXPECTED_ROWS;
  const status = blockers > 0 ? 'BLOCK' : schemaGateReady ? 'PASS' : 'HOLD';

  const report = {
    schemaVersion: 'gustav-fr-lesson-review-decision-import-dry-run-audit-v1',
    generatedAt,
    status,
    activationApproved: false,
    inputs: {
      requestsJsonl: rel(REQUESTS_JSONL_PATH),
      decisionsJsonl: rel(DECISIONS_PATH),
      schemaGateAudit: rel(SCHEMA_GATE_AUDIT_PATH),
    },
    hashes: {
      requestsJsonlSha256: sha256(REQUESTS_JSONL_PATH),
      decisionsJsonlSha256: sha256(DECISIONS_PATH),
      schemaGateAuditSha256: sha256(SCHEMA_GATE_AUDIT_PATH),
    },
    summary: {
      schemaGateReady,
      requestRows: requests.length,
      decisionRows: decisions.length,
      acceptedRows,
      regenerationRows,
      rejectedRows,
      skippedRows,
      openedProductionRows,
      allRowsAccepted,
      allRowsReviewedButSomeNeedWork,
      wouldImportReviewedStatuses: schemaGateReady && blockers === 0,
      wouldMaterializeAcceptedLedger: allRowsAccepted,
      wouldCreateRegenerationQueue: allRowsReviewedButSomeNeedWork,
      readyForAudioManifestGate: allRowsAccepted,
      readyForServerPackManifestGate: false,
      readyForRuntimeDeliveryGate: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      blockers,
      warnings,
    },
    dryRunPlan: schemaGateReady
      ? [
          'Map every LLM decision back to source request identity and lesson ledger row.',
          'Mark accepted rows as reviewed-only candidates, never active production rows.',
          'Route needs_regeneration and needs_llm_regeneration_review rows to regeneration work orders.',
          'Keep rejected and skipped rows out of audio/server pack materialization.',
          'Open audio manifest gate only when all 1600 rows are accepted.',
        ]
      : [
          'Wait for fr_lesson_llm_review_decisions_v1.jsonl produced from the request packet.',
          'Run scripts/gustav_validate_fr_lesson_llm_review_decisions.mjs until schema gate is PASS.',
          'Rerun this dry-run before any ledger materialization, audio manifest or server pack work.',
        ],
    safety: {
      dryRunOnly: true,
      reviewerDecisionsImportedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      acceptedLedgersMaterializedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
    findings,
    nextRequiredGates: allRowsAccepted
      ? [
          'audio_manifest_gate',
          'server_pack_manifest_gate',
          'runtime_delivery_gate',
          'admin_parity_gate',
          'storage_cloud_isolation_gate',
          'rollback_gate',
          'explicit_activation_approval_gate',
        ]
      : [
          'execute_llm_official_source_review_requests',
          'llm_review_decision_schema_gate',
          'review_decision_import_dry_run_gate',
          'regenerate_or_reject_non_accepted_rows_gate',
          'audio_manifest_gate',
          'server_pack_manifest_gate',
          'runtime_delivery_gate',
          'admin_parity_gate',
          'storage_cloud_isolation_gate',
          'rollback_gate',
          'explicit_activation_approval_gate',
        ],
  };

  writeJson(OUT_AUDIT_PATH, report);
  fs.writeFileSync(OUT_MD_PATH, renderMarkdown(report), 'utf8');

  console.log(`Gustav French lesson review decision import dry-run: ${report.status}`);
  console.log(`Schema gate ready: ${schemaGateReady ? 'yes' : 'no'}`);
  console.log(`Accepted rows: ${acceptedRows}/${EXPECTED_ROWS}`);
  console.log(`Would materialize accepted ledger: ${report.summary.wouldMaterializeAcceptedLedger ? 'yes' : 'no'}`);
  console.log(`Ready for apply: no`);
  console.log(rel(OUT_AUDIT_PATH));

  if (status === 'BLOCK') process.exitCode = 1;
}

main();
