import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const WORK_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'work_orders');
const REQUESTS_JSONL_PATH = path.join(WORK_DIR, 'fr_lesson_correction_candidate_review_requests_v1.jsonl');
const CANDIDATES_JSONL_PATH = path.join(WORK_DIR, 'fr_lesson_correction_candidate_queue_v1.jsonl');
const DECISIONS_JSONL_PATH = path.join(WORK_DIR, 'fr_lesson_correction_candidate_review_decisions_v1.jsonl');
const SCHEMA_GATE_AUDIT_PATH = path.join(WORK_DIR, 'fr_lesson_correction_candidate_review_decision_schema_gate_audit_v1.json');
const OUT_AUDIT_PATH = path.join(WORK_DIR, 'fr_lesson_correction_candidate_review_import_dry_run_audit_v1.json');
const OUT_MD_PATH = path.join(WORK_DIR, 'fr_lesson_correction_candidate_review_import_dry_run_audit_v1.md');

const EXPECTED_ROWS = 290;
const ACCEPT_DECISION = 'accept_quality_gates';
const REGEN_DECISIONS = new Set(['needs_regeneration', 'needs_llm_regeneration_review']);
const REJECT_DECISION = 'reject_candidate';
const SKIP_DECISION = 'skip_for_later';

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseJsonlIfExists(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
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

function requestKey(row) {
  return `${row.requestId}:${row.sourceQueueIndex}:${row.lessonId}:${row.phraseId}`;
}

function renderMarkdown(report) {
  const lines = [
    '# Gustav French Correction Candidate Import Dry Run',
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Schema gate ready: ${report.summary.schemaGateReady ? 'yes' : 'no'}`,
    `- Request rows: ${report.summary.requestRows}`,
    `- Candidate rows: ${report.summary.candidateRows}`,
    `- Decision rows: ${report.summary.decisionRows}`,
    `- Accepted corrections: ${report.summary.acceptedCorrectionRows}`,
    `- Needs more work: ${report.summary.nonAcceptedCorrectionRows}`,
    `- Would stage accepted corrections: ${report.summary.wouldStageAcceptedCorrections ? 'yes' : 'no'}`,
    `- Would write lesson ledgers: ${report.summary.wouldWriteLessonLedgers ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    '',
    '## Safety',
    '',
    '- This is a dry-run report only.',
    '- It does not write accepted corrections into lesson ledgers.',
    '- It does not generate audio, server packs, runtime downloads, app bundle content or activation.',
    '',
  ];
  if (report.findings.length > 0) {
    lines.push('## Findings', '');
    for (const finding of report.findings) lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}`);
    lines.push('');
  }
  return lines.join('\n');
}

function main() {
  const generatedAt = new Date().toISOString();
  const schemaGate = readJson(SCHEMA_GATE_AUDIT_PATH);
  const requests = parseJsonlIfExists(REQUESTS_JSONL_PATH);
  const candidates = parseJsonlIfExists(CANDIDATES_JSONL_PATH);
  const decisions = parseJsonlIfExists(DECISIONS_JSONL_PATH);
  const findings = [];

  const schemaGateReady = schemaGate.summary?.readyForAcceptOnlyImportDryRun === true;
  if (!schemaGateReady) {
    findings.push({
      severity: 'info',
      code: 'schema_gate_not_ready',
      message: 'Correction-candidate decisions are not schema-valid and complete yet; import dry-run remains HOLD.',
    });
  }
  if (requests.length !== EXPECTED_ROWS) {
    findings.push({ severity: 'blocker', code: 'request_row_count_invalid', message: `Expected ${EXPECTED_ROWS} request rows, found ${requests.length}.` });
  }
  if (candidates.length !== EXPECTED_ROWS) {
    findings.push({ severity: 'blocker', code: 'candidate_row_count_invalid', message: `Expected ${EXPECTED_ROWS} candidate rows, found ${candidates.length}.` });
  }
  if (schemaGateReady && decisions.length !== EXPECTED_ROWS) {
    findings.push({ severity: 'blocker', code: 'decision_row_count_invalid', message: `Expected ${EXPECTED_ROWS} decision rows when schema gate is ready, found ${decisions.length}.` });
  }

  const requestByKey = new Map(requests.map((request) => [requestKey(request), request]));
  const candidateByOriginalRequestId = new Map(candidates.map((candidate) => [candidate.requestId, candidate]));
  const acceptedDecisions = decisions.filter((row) => row.reviewerDecision === ACCEPT_DECISION);
  const nonAcceptedDecisions = decisions.filter((row) => row.reviewerDecision !== ACCEPT_DECISION);
  const acceptedCorrectionRows = acceptedDecisions.length;
  const regenerationRows = decisions.filter((row) => REGEN_DECISIONS.has(row.reviewerDecision)).length;
  const rejectedRows = decisions.filter((row) => row.reviewerDecision === REJECT_DECISION).length;
  const skippedRows = decisions.filter((row) => row.reviewerDecision === SKIP_DECISION).length;
  const openedProductionRows = decisions.filter((row) => row.reviewerImportAllowed || row.productionApplyAllowed || row.activationApproved).length;
  const acceptedRowsWithCandidate = acceptedDecisions.filter((decision) => {
    const request = requestByKey.get(requestKey(decision));
    return request && candidateByOriginalRequestId.has(request.sourceIdentity.originalRequestId);
  }).length;

  if (openedProductionRows > 0) {
    findings.push({ severity: 'blocker', code: 'decision_opened_production_flags', message: `${openedProductionRows} decisions opened import/apply/activation flags.` });
  }
  if (schemaGateReady && acceptedRowsWithCandidate !== acceptedCorrectionRows) {
    findings.push({ severity: 'blocker', code: 'accepted_decision_missing_candidate', message: `${acceptedCorrectionRows - acceptedRowsWithCandidate} accepted decisions have no source correction candidate.` });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const wouldStageAcceptedCorrections = schemaGateReady && blockers === 0 && acceptedCorrectionRows > 0;
  const allCorrectionRowsAccepted = schemaGateReady && blockers === 0 && decisions.length === EXPECTED_ROWS && acceptedCorrectionRows === EXPECTED_ROWS;
  const status = blockers > 0 ? 'BLOCK' : schemaGateReady ? 'PASS' : 'HOLD';

  const report = {
    schemaVersion: 'gustav-fr-lesson-correction-candidate-review-import-dry-run-audit-v1',
    generatedAt,
    status,
    activationApproved: false,
    inputs: {
      requestsJsonl: rel(REQUESTS_JSONL_PATH),
      candidatesJsonl: rel(CANDIDATES_JSONL_PATH),
      decisionsJsonl: rel(DECISIONS_JSONL_PATH),
      schemaGateAudit: rel(SCHEMA_GATE_AUDIT_PATH),
    },
    hashes: {
      requestsJsonlSha256: sha256(REQUESTS_JSONL_PATH),
      candidatesJsonlSha256: sha256(CANDIDATES_JSONL_PATH),
      decisionsJsonlSha256: sha256(DECISIONS_JSONL_PATH),
      schemaGateAuditSha256: sha256(SCHEMA_GATE_AUDIT_PATH),
    },
    summary: {
      schemaGateReady,
      requestRows: requests.length,
      candidateRows: candidates.length,
      decisionRows: decisions.length,
      acceptedCorrectionRows,
      nonAcceptedCorrectionRows: nonAcceptedDecisions.length,
      regenerationRows,
      rejectedRows,
      skippedRows,
      acceptedRowsWithCandidate,
      openedProductionRows,
      wouldStageAcceptedCorrections,
      wouldRouteNonAcceptedCorrections: schemaGateReady && nonAcceptedDecisions.length > 0,
      wouldWriteLessonLedgers: false,
      wouldGenerateAudio: false,
      allCorrectionRowsAccepted,
      readyForNonAcceptedRowsRerun: schemaGateReady && blockers === 0,
      readyForAudioManifestGate: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      blockers,
      warnings,
    },
    dryRunPlan: schemaGateReady
      ? [
          'Map each accepted correction decision to its isolated correction candidate and original request identity.',
          'Stage accepted corrections only as reviewed repair candidates, not active lesson rows.',
          'Route non-accepted correction decisions back to regeneration/source-check queues.',
          'Rerun the full non-accepted row gate before audio or server pack planning.',
        ]
      : [
          'Run the external correction-candidate LLM review batches.',
          'Run the correction-candidate decision schema gate until it is PASS.',
          'Rerun this accept-only dry-run before any reviewed repair staging.',
        ],
    safety: {
      dryRunOnly: true,
      reviewerDecisionsImportedByThisScript: false,
      acceptedCorrectionsStagedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      audioGeneratedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
    findings,
    nextRequiredGates: schemaGateReady
      ? [
          'rerun_non_accepted_rows_gate',
          'merge_only_accepted_corrections_after_full_schema_pass',
          'audio_manifest_gate_after_all_1600_rows_accepted',
        ]
      : [
          'execute_correction_candidate_llm_trusted_source_review',
          'correction_candidate_decision_schema_gate',
          'correction_candidate_accept_only_import_dry_run_gate',
          'rerun_non_accepted_rows_gate',
        ],
  };

  writeJson(OUT_AUDIT_PATH, report);
  fs.writeFileSync(OUT_MD_PATH, renderMarkdown(report), 'utf8');

  console.log(`Gustav French correction import dry-run: ${report.status}`);
  console.log(`Schema gate ready: ${schemaGateReady ? 'yes' : 'no'}`);
  console.log(`Accepted corrections: ${acceptedCorrectionRows}/${EXPECTED_ROWS}`);
  console.log(`Would stage accepted corrections: ${wouldStageAcceptedCorrections ? 'yes' : 'no'}`);
  console.log(`Ready for apply: no`);
  console.log(rel(OUT_AUDIT_PATH));

  if (status === 'BLOCK') process.exitCode = 1;
}

main();
