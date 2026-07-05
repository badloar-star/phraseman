import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const WORK_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'work_orders');
const REQUESTS_JSONL_PATH = path.join(WORK_DIR, 'fr_lesson_correction_candidate_review_requests_v1.jsonl');
const REQUESTS_AUDIT_PATH = path.join(WORK_DIR, 'fr_lesson_correction_candidate_review_requests_audit_v1.json');
const DECISIONS_PATH = path.join(WORK_DIR, 'fr_lesson_correction_candidate_review_decisions_v1.jsonl');
const OUT_AUDIT_PATH = path.join(WORK_DIR, 'fr_lesson_correction_candidate_review_decision_schema_gate_audit_v1.json');
const OUT_MD_PATH = path.join(WORK_DIR, 'fr_lesson_correction_candidate_review_decision_schema_gate_audit_v1.md');

const EXPECTED_ROWS = 290;
const EXPECTED_GATES = [
  'language_field_isolation_gate',
  'source_locale_coverage_gate',
  'official_source_evidence_gate',
  'target_sequence_fit_gate',
  'anti_calque_gate',
  'grammar_cluster_gate',
  'naturalness_register_gate',
  'source_meaning_parity_gate',
  'quiz_one_correct_answer_gate',
  'distractor_quality_gate',
  'no_mojibake_or_placeholder_gate',
];
const DECISION_KEYS = [
  'schemaVersion',
  'requestId',
  'reviewScope',
  'sourceQueueIndex',
  'batchId',
  'lessonId',
  'phraseId',
  'studyTarget',
  'sourceLocaleCoverage',
  'reviewerDecision',
  'gateReviewerDecisions',
  'gateEvidenceNotes',
  'reviewerNotes',
  'reviewerName',
  'reviewedAt',
  'correctedTargetText',
  'correctedQuizBlank',
  'correctedQuizCorrect',
  'correctedQuizDistractors',
  'reviewerImportAllowed',
  'productionApplyAllowed',
  'activationApproved',
];
const ALLOWED_DECISIONS = [
  'accept_quality_gates',
  'needs_regeneration',
  'needs_llm_regeneration_review',
  'reject_candidate',
  'skip_for_later',
];
const ALLOWED_GATE_DECISIONS = ['pass', 'fail', 'needs_source_check'];
const CORRECTABLE_DECISIONS = new Set(['needs_llm_regeneration_review']);
const NON_ACCEPT_DECISIONS = new Set(['needs_regeneration', 'needs_llm_regeneration_review', 'reject_candidate', 'skip_for_later']);

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
  return text.split(/\r?\n/).filter(Boolean).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`Invalid JSONL at line ${index + 1}: ${error.message}`);
    }
  });
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

function sameArray(left, right) {
  return Array.isArray(left) && JSON.stringify(left) === JSON.stringify(right);
}

function sameKeySet(object, expectedKeys) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) return false;
  return JSON.stringify(Object.keys(object).sort()) === JSON.stringify([...expectedKeys].sort());
}

function requestKey(row) {
  return `${row.requestId}:${row.sourceQueueIndex}:${row.lessonId}:${row.phraseId}`;
}

function hasCorrectionPayload(row) {
  return Boolean(
    String(row.correctedTargetText || '').trim() ||
    String(row.correctedQuizBlank || '').trim() ||
    String(row.correctedQuizCorrect || '').trim() ||
    (Array.isArray(row.correctedQuizDistractors) && row.correctedQuizDistractors.length > 0),
  );
}

function addFinding(findings, severity, code, message, row) {
  findings.push({
    severity,
    code,
    message,
    ...(row
      ? {
          requestId: row.requestId,
          sourceQueueIndex: row.sourceQueueIndex,
          lessonId: row.lessonId,
          phraseId: row.phraseId,
        }
      : {}),
  });
}

function validateDecisionRow(row, request, findings) {
  let blockers = 0;
  const fail = (code, message) => {
    blockers += 1;
    addFinding(findings, 'blocker', code, message, row);
  };

  if (!sameKeySet(row, DECISION_KEYS)) fail('decision_key_set_invalid', 'Decision row must contain exactly the V1 required key set.');
  if (row.schemaVersion !== 'gustav-fr-lesson-llm-official-source-review-decision-v1') fail('schema_version_invalid', 'Decision schemaVersion is invalid.');
  if (row.reviewScope !== 'lesson_row') fail('review_scope_invalid', 'Decision reviewScope must be lesson_row.');
  if (row.studyTarget !== 'fr') fail('study_target_invalid', 'Decision studyTarget must be fr.');
  if (!sameArray(row.sourceLocaleCoverage, ['ru', 'uk'])) fail('source_locale_coverage_invalid', 'Decision sourceLocaleCoverage must be exactly ru,uk.');
  if (row.reviewerName !== 'llm_official_source_judge') fail('reviewer_name_invalid', 'reviewerName must be llm_official_source_judge.');
  if (!String(row.reviewedAt || '').trim()) fail('reviewed_at_missing', 'reviewedAt is required.');
  if (!String(row.reviewerNotes || '').trim()) fail('reviewer_notes_missing', 'reviewerNotes is required.');

  if (!request) {
    fail('decision_has_no_matching_correction_request', 'Decision row does not match any correction-candidate review request.');
  } else {
    for (const key of ['requestId', 'sourceQueueIndex', 'batchId', 'lessonId', 'phraseId']) {
      if (row[key] !== request[key]) fail('decision_identity_mismatch', `Decision ${key} does not match the correction request.`);
    }
  }

  if (!ALLOWED_DECISIONS.includes(row.reviewerDecision)) fail('reviewer_decision_invalid', 'reviewerDecision is not allowed.');
  if (!sameKeySet(row.gateReviewerDecisions, EXPECTED_GATES)) fail('gate_decision_key_set_invalid', 'gateReviewerDecisions must contain exactly the 11 required gates.');
  if (!sameKeySet(row.gateEvidenceNotes, EXPECTED_GATES)) fail('gate_evidence_notes_key_set_invalid', 'gateEvidenceNotes must contain exactly the 11 required gates.');

  const gateValues = EXPECTED_GATES.map((gateId) => row.gateReviewerDecisions?.[gateId]);
  for (const gateId of EXPECTED_GATES) {
    const gateDecision = row.gateReviewerDecisions?.[gateId];
    const gateNote = row.gateEvidenceNotes?.[gateId];
    if (!ALLOWED_GATE_DECISIONS.includes(gateDecision)) fail('gate_decision_invalid', `Gate ${gateId} is invalid.`);
    if (!String(gateNote || '').trim()) fail('gate_evidence_note_missing', `Gate ${gateId} must include evidence notes.`);
  }

  if (row.reviewerImportAllowed !== false || row.productionApplyAllowed !== false || row.activationApproved !== false) {
    fail('decision_opened_import_apply_or_activation', 'Correction decisions must keep reviewerImportAllowed, productionApplyAllowed and activationApproved false.');
  }

  const correctionPayload = hasCorrectionPayload(row);
  if (row.reviewerDecision === 'accept_quality_gates') {
    if (!gateValues.every((value) => value === 'pass')) fail('accept_with_non_pass_gate', 'accept_quality_gates requires all 11 gates to be pass.');
    if (correctionPayload) fail('accept_with_correction_payload', 'accept_quality_gates must not include corrected fields.');
  }
  if (NON_ACCEPT_DECISIONS.has(row.reviewerDecision) && gateValues.every((value) => value === 'pass')) {
    fail('non_accept_with_all_gates_passed', 'Non-accept decisions must include at least one fail or needs_source_check gate.');
  }
  if (!CORRECTABLE_DECISIONS.has(row.reviewerDecision) && correctionPayload) {
    fail('correction_payload_for_wrong_decision', 'Corrected fields are only allowed with needs_llm_regeneration_review.');
  }
  if (row.reviewerDecision === 'needs_llm_regeneration_review' && !correctionPayload) {
    fail('needs_llm_regeneration_review_without_correction', 'needs_llm_regeneration_review requires at least one corrected field.');
  }
  if (row.reviewerDecision === 'skip_for_later' && !gateValues.includes('needs_source_check')) {
    fail('skip_without_source_check_gate', 'skip_for_later requires at least one needs_source_check gate.');
  }

  return blockers;
}

function makeValidDecision(request) {
  return {
    schemaVersion: 'gustav-fr-lesson-llm-official-source-review-decision-v1',
    requestId: request.requestId,
    reviewScope: 'lesson_row',
    sourceQueueIndex: request.sourceQueueIndex,
    batchId: request.batchId,
    lessonId: request.lessonId,
    phraseId: request.phraseId,
    studyTarget: 'fr',
    sourceLocaleCoverage: ['ru', 'uk'],
    reviewerDecision: 'accept_quality_gates',
    gateReviewerDecisions: Object.fromEntries(EXPECTED_GATES.map((gateId) => [gateId, 'pass'])),
    gateEvidenceNotes: Object.fromEntries(EXPECTED_GATES.map((gateId) => [gateId, `probe note cites ${request.trustedSourceContext.requiredEvidenceIds[0] || 'trusted_source'}`])),
    reviewerNotes: 'Probe correction accept row: all required gates pass with trusted-source evidence.',
    reviewerName: 'llm_official_source_judge',
    reviewedAt: '2026-07-04T00:00:00.000Z',
    correctedTargetText: '',
    correctedQuizBlank: '',
    correctedQuizCorrect: '',
    correctedQuizDistractors: [],
    reviewerImportAllowed: false,
    productionApplyAllowed: false,
    activationApproved: false,
  };
}

function runFixtureProbes(request) {
  if (!request) return [];
  const probes = [];
  const makeProbe = (id, expectedValid, mutate) => {
    const row = makeValidDecision(request);
    mutate(row);
    const probeFindings = [];
    const blockers = validateDecisionRow(row, request, probeFindings);
    const accepted = blockers === 0;
    probes.push({ id, expectedValid, accepted, blockers, passed: accepted === expectedValid, findingCodes: probeFindings.map((finding) => finding.code) });
  };
  makeProbe('valid_correction_accept_all_gates_passes', true, () => {});
  makeProbe('wrong_request_identity_rejected', false, (row) => { row.requestId = row.requestId.replace('correction_candidate', 'wrong'); });
  makeProbe('wrong_source_locale_rejected', false, (row) => { row.sourceLocaleCoverage = ['en']; });
  makeProbe('activation_attempt_rejected', false, (row) => { row.activationApproved = true; });
  makeProbe('accept_with_non_pass_gate_rejected', false, (row) => { row.gateReviewerDecisions.language_field_isolation_gate = 'fail'; });
  makeProbe('accept_with_correction_payload_rejected', false, (row) => { row.correctedTargetText = 'not allowed on accept'; });
  makeProbe('needs_review_without_correction_rejected', false, (row) => { row.reviewerDecision = 'needs_llm_regeneration_review'; row.gateReviewerDecisions.anti_calque_gate = 'fail'; });
  makeProbe('extra_key_rejected', false, (row) => { row.unexpectedField = 'not allowed'; });
  return probes;
}

function renderMarkdown(report) {
  const lines = [
    '# Gustav French Correction Candidate Decision Schema Gate',
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Request rows: ${report.summary.requestRows}`,
    `- Decision file present: ${report.summary.decisionFilePresent ? 'yes' : 'no'}`,
    `- Decision rows: ${report.summary.decisionRows}`,
    `- Accepted rows: ${report.summary.acceptedRows}`,
    `- Non-accepted rows: ${report.summary.nonAcceptedRows}`,
    `- Missing decision rows: ${report.summary.missingDecisionRows}`,
    `- Invalid decision rows: ${report.summary.invalidDecisionRows}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Ready for accept-only import dry-run: ${report.summary.readyForAcceptOnlyImportDryRun ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) lines.push('- None.');
  else for (const finding of report.findings.slice(0, 80)) lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.requestId ? ` (${finding.requestId})` : ''}`);
  lines.push('', '## Safety', '');
  lines.push('- This gate validates correction-candidate decision files only.');
  lines.push('- It does not import decisions into lesson ledgers.');
  lines.push('- It does not write app bundle content, server packs, audio, runtime downloads or activation.');
  lines.push('');
  return lines.join('\n');
}

function main() {
  const generatedAt = new Date().toISOString();
  const requestAudit = readJson(REQUESTS_AUDIT_PATH);
  const requests = parseJsonlIfExists(REQUESTS_JSONL_PATH);
  const decisions = parseJsonlIfExists(DECISIONS_PATH);
  const decisionFilePresent = fs.existsSync(DECISIONS_PATH);
  const findings = [];

  if (requestAudit.summary?.readyForExternalReview !== true) {
    addFinding(findings, 'blocker', 'correction_requests_not_ready', 'Correction-candidate requests must be ready for external review first.');
  }
  if (requests.length !== EXPECTED_ROWS) {
    addFinding(findings, 'blocker', 'request_count_invalid', `Expected ${EXPECTED_ROWS} correction requests, found ${requests.length}.`);
  }
  if (!decisionFilePresent) {
    addFinding(findings, 'info', 'decision_file_missing', 'No correction-candidate decision file exists yet; gate remains HOLD.');
  }

  const requestByKey = new Map(requests.map((request) => [requestKey(request), request]));
  const requestKeys = new Set(requestByKey.keys());
  const seenDecisionKeys = new Set();
  let reviewedRows = 0;
  let acceptedRows = 0;
  let nonAcceptedRows = 0;
  let duplicateDecisionRows = 0;
  let invalidDecisionRows = 0;
  let extraDecisionRows = 0;
  let openedImportApplyActivationRows = 0;
  const decisionCounts = Object.fromEntries(ALLOWED_DECISIONS.map((decision) => [decision, 0]));

  for (const row of decisions) {
    const key = requestKey(row);
    if (seenDecisionKeys.has(key)) {
      duplicateDecisionRows += 1;
      addFinding(findings, 'blocker', 'duplicate_decision_row', 'Duplicate correction decision identity.', row);
    }
    seenDecisionKeys.add(key);
    if (!requestByKey.has(key)) {
      extraDecisionRows += 1;
      addFinding(findings, 'blocker', 'extra_decision_row', 'Correction decision row has no matching request identity.', row);
    }
    const rowBlockers = validateDecisionRow(row, requestByKey.get(key), findings);
    if (rowBlockers > 0) invalidDecisionRows += 1;
    if (row.reviewerImportAllowed || row.productionApplyAllowed || row.activationApproved) openedImportApplyActivationRows += 1;
    if (ALLOWED_DECISIONS.includes(row.reviewerDecision)) {
      reviewedRows += 1;
      decisionCounts[row.reviewerDecision] += 1;
      if (row.reviewerDecision === 'accept_quality_gates') acceptedRows += 1;
      else nonAcceptedRows += 1;
    }
  }

  let missingDecisionRows = 0;
  for (const key of requestKeys) if (!seenDecisionKeys.has(key)) missingDecisionRows += 1;
  if (decisionFilePresent && decisions.length !== EXPECTED_ROWS) {
    addFinding(findings, 'blocker', 'decision_count_invalid', `Expected ${EXPECTED_ROWS} correction decision rows, found ${decisions.length}.`);
  }

  const fixtureProbes = runFixtureProbes(requests[0]);
  const fixtureProbesPassed = fixtureProbes.filter((probe) => probe.passed).length;
  for (const probe of fixtureProbes) {
    if (!probe.passed) addFinding(findings, 'blocker', 'fixture_probe_failed', `Fixture probe failed: ${probe.id}.`);
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const readyForAcceptOnlyImportDryRun =
    decisionFilePresent &&
    blockers === 0 &&
    decisions.length === EXPECTED_ROWS &&
    reviewedRows === EXPECTED_ROWS &&
    missingDecisionRows === 0 &&
    extraDecisionRows === 0 &&
    duplicateDecisionRows === 0 &&
    invalidDecisionRows === 0 &&
    openedImportApplyActivationRows === 0;
  const status = blockers > 0 ? 'BLOCK' : readyForAcceptOnlyImportDryRun ? 'PASS' : 'HOLD';

  const report = {
    schemaVersion: 'gustav-fr-lesson-correction-candidate-review-decision-schema-gate-audit-v1',
    generatedAt,
    status,
    activationApproved: false,
    inputs: {
      requestsJsonl: rel(REQUESTS_JSONL_PATH),
      requestsAudit: rel(REQUESTS_AUDIT_PATH),
      decisionsJsonl: rel(DECISIONS_PATH),
    },
    hashes: {
      requestsJsonlSha256: sha256(REQUESTS_JSONL_PATH),
      requestsAuditSha256: sha256(REQUESTS_AUDIT_PATH),
      decisionsJsonlSha256: sha256(DECISIONS_PATH),
    },
    summary: {
      requestRows: requests.length,
      decisionFilePresent,
      decisionRows: decisions.length,
      reviewedRows,
      acceptedRows,
      nonAcceptedRows,
      missingDecisionRows,
      extraDecisionRows,
      duplicateDecisionRows,
      invalidDecisionRows,
      openedImportApplyActivationRows,
      decisionCounts,
      fixtureProbesPassed,
      fixtureProbes: fixtureProbes.length,
      blockers,
      warnings,
      readyForAcceptOnlyImportDryRun,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    safety: {
      dryRunOnly: true,
      reviewerDecisionsImportedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      audioGeneratedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
    fixtureProbes,
    findings,
    nextRequiredGates: readyForAcceptOnlyImportDryRun
      ? [
          'correction_candidate_accept_only_import_dry_run_gate',
          'rerun_non_accepted_rows_gate',
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

  console.log(`Gustav French correction decision schema gate: ${report.status}`);
  console.log(`Decision file present: ${decisionFilePresent ? 'yes' : 'no'}`);
  console.log(`Reviewed rows: ${reviewedRows}/${EXPECTED_ROWS}`);
  console.log(`Accepted rows: ${acceptedRows}/${EXPECTED_ROWS}`);
  console.log(`Ready for accept-only import dry-run: ${readyForAcceptOnlyImportDryRun ? 'yes' : 'no'}`);
  console.log(`Ready for apply: no`);
  console.log(rel(OUT_AUDIT_PATH));

  if (status === 'BLOCK') process.exitCode = 1;
}

main();
