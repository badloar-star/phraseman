import crypto from 'node:crypto';
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
const OUT_AUDIT = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_review_decision_schema_gate_v1.json');
const OUT_MD = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_review_decision_schema_gate_v1.md');
const EXPECTED_ROWS = 56;
const ALLOWED_DECISIONS = ['accept_quality_gates', 'needs_regeneration', 'needs_llm_regeneration_review', 'reject_candidate', 'skip_for_later'];
const ALLOWED_GATES = ['pass', 'fail', 'needs_source_check'];

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

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(filePath) {
  return fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : '';
}

function rowIdentity(row) {
  return `${row.requestId}:${row.sourceQueueIndex}:${row.frenchTrainingId}:${row.mistakeId}`;
}

function sameKeySet(object, keys) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) return false;
  return JSON.stringify(Object.keys(object).sort()) === JSON.stringify([...keys].sort());
}

function hasCorrectionPayload(row) {
  return Boolean(
    String(row.correctedMistakeId || '').trim() ||
    String(row.correctedMistakeFamily || '').trim() ||
    (Array.isArray(row.correctedPromptIds) && row.correctedPromptIds.length > 0),
  );
}

function addFinding(findings, severity, code, message, row) {
  findings.push({ severity, code, message, ...(row ? { requestId: row.requestId, sourceQueueIndex: row.sourceQueueIndex, frenchTrainingId: row.frenchTrainingId } : {}) });
}

function validateDecision(row, request, findings) {
  let blockers = 0;
  const fail = (code, message) => {
    blockers += 1;
    addFinding(findings, 'blocker', code, message, row);
  };
  if (!request) {
    fail('decision_has_no_matching_request', 'Decision has no matching mistake-taxonomy review request.');
    return blockers;
  }
  const expectedKeys = Object.keys(request.blankResponseTemplate);
  const expectedGates = Object.keys(request.blankResponseTemplate.gateReviewerDecisions);
  if (!sameKeySet(row, expectedKeys)) fail('decision_key_set_invalid', 'Decision keys must exactly match request blankResponseTemplate.');
  for (const key of ['schemaVersion', 'requestId', 'reviewScope', 'sourceQueueIndex', 'frenchTrainingId', 'mistakeId', 'studyTarget']) {
    if (row[key] !== request.blankResponseTemplate[key]) fail('decision_identity_mismatch', `${key} does not match request.`);
  }
  if (JSON.stringify(row.sourceLocaleCoverage) !== JSON.stringify(['ru', 'uk'])) fail('source_locale_coverage_invalid', 'sourceLocaleCoverage must be ru,uk.');
  if (!ALLOWED_DECISIONS.includes(row.reviewerDecision)) fail('reviewer_decision_invalid', 'reviewerDecision is invalid.');
  if (row.reviewerName !== 'llm_official_source_judge') fail('reviewer_name_invalid', 'reviewerName invalid.');
  if (!String(row.reviewedAt || '').trim()) fail('reviewed_at_missing', 'reviewedAt required.');
  if (!String(row.reviewerNotes || '').trim()) fail('reviewer_notes_missing', 'reviewerNotes required.');
  if (!sameKeySet(row.gateReviewerDecisions, expectedGates)) fail('gate_decision_key_set_invalid', 'Gate decision keys mismatch.');
  if (!sameKeySet(row.gateEvidenceNotes, expectedGates)) fail('gate_evidence_key_set_invalid', 'Gate evidence keys mismatch.');
  const gateValues = expectedGates.map((gateId) => row.gateReviewerDecisions?.[gateId]);
  for (const gateId of expectedGates) {
    if (!ALLOWED_GATES.includes(row.gateReviewerDecisions?.[gateId])) fail('gate_decision_invalid', `${gateId} invalid.`);
    if (!String(row.gateEvidenceNotes?.[gateId] || '').trim()) fail('gate_evidence_note_missing', `${gateId} evidence missing.`);
  }
  if (row.reviewerImportAllowed || row.productionApplyAllowed || row.activationApproved) fail('decision_opened_import_apply_or_activation', 'Flags must remain false.');
  const correctionPayload = hasCorrectionPayload(row);
  if (row.reviewerDecision === 'accept_quality_gates') {
    if (!gateValues.every((value) => value === 'pass')) fail('accept_with_non_pass_gate', 'Accept requires all gates pass.');
    if (correctionPayload) fail('accept_with_correction_payload', 'Accept cannot include corrections.');
  }
  if (row.reviewerDecision !== 'accept_quality_gates' && gateValues.every((value) => value === 'pass')) fail('non_accept_with_all_gates_passed', 'Non-accept needs non-pass gate.');
  if (row.reviewerDecision === 'needs_llm_regeneration_review' && !correctionPayload) fail('needs_review_without_correction_payload', 'Correction payload required.');
  if (row.reviewerDecision !== 'needs_llm_regeneration_review' && correctionPayload) fail('correction_payload_for_wrong_decision', 'Correction payload only allowed for needs_llm_regeneration_review.');
  return blockers;
}

function makeValidDecision(request) {
  const gates = Object.keys(request.blankResponseTemplate.gateReviewerDecisions);
  return {
    ...request.blankResponseTemplate,
    reviewerDecision: 'accept_quality_gates',
    gateReviewerDecisions: Object.fromEntries(gates.map((gate) => [gate, 'pass'])),
    gateEvidenceNotes: Object.fromEntries(gates.map((gate) => [gate, `trusted source evidence for ${gate}`])),
    reviewerNotes: 'Fixture accept decision.',
    reviewedAt: '2026-07-04T00:00:00.000Z',
  };
}

function runFixtureProbes(request) {
  if (!request) return [];
  const probes = [];
  const add = (id, expectedValid, mutate) => {
    const row = makeValidDecision(request);
    mutate(row);
    const findings = [];
    const blockers = validateDecision(row, request, findings);
    probes.push({ id, expectedValid, accepted: blockers === 0, blockers, passed: (blockers === 0) === expectedValid, findingCodes: findings.map((item) => item.code) });
  };
  add('valid_accept_all_gates_passes', true, () => {});
  add('wrong_training_id_rejected', false, (row) => { row.frenchTrainingId = 'fr_wrong'; });
  add('activation_attempt_rejected', false, (row) => { row.activationApproved = true; });
  add('accept_with_non_pass_gate_rejected', false, (row) => { row.gateReviewerDecisions.language_field_isolation_gate = 'fail'; });
  add('accept_with_correction_payload_rejected', false, (row) => { row.correctedMistakeId = 'fr_mistake_correction'; });
  add('needs_review_without_payload_rejected', false, (row) => { row.reviewerDecision = 'needs_llm_regeneration_review'; row.gateReviewerDecisions.french_mistake_family_fit_gate = 'fail'; });
  return probes;
}

function main() {
  const generatedAt = new Date().toISOString();
  const requestAudit = readJson(REQUESTS_AUDIT_PATH);
  const requests = readJsonl(REQUESTS_PATH);
  const decisions = readJsonl(DECISIONS_PATH);
  const decisionFilePresent = fs.existsSync(DECISIONS_PATH);
  const findings = [];
  if (requestAudit.summary?.readyForExternalReview !== true) addFinding(findings, 'blocker', 'requests_not_ready', 'Review requests are not ready.');
  if (requests.length !== EXPECTED_ROWS) addFinding(findings, 'blocker', 'request_count_invalid', `Expected ${EXPECTED_ROWS}, found ${requests.length}.`);
  if (!decisionFilePresent) addFinding(findings, 'info', 'decision_file_missing', 'No mistake-taxonomy review decision file exists yet.');
  const requestByIdentity = new Map(requests.map((request) => [rowIdentity(request), request]));
  const seen = new Set();
  let acceptedRows = 0;
  let nonAcceptedRows = 0;
  let invalidDecisionRows = 0;
  let duplicateDecisionRows = 0;
  let openedFlagsRows = 0;
  for (const decision of decisions) {
    const identity = rowIdentity(decision);
    if (seen.has(identity)) {
      duplicateDecisionRows += 1;
      addFinding(findings, 'blocker', 'duplicate_decision_row', 'Duplicate decision identity.', decision);
    }
    seen.add(identity);
    const blockers = validateDecision(decision, requestByIdentity.get(identity), findings);
    if (blockers > 0) invalidDecisionRows += 1;
    if (decision.reviewerImportAllowed || decision.productionApplyAllowed || decision.activationApproved) openedFlagsRows += 1;
    if (decision.reviewerDecision === 'accept_quality_gates') acceptedRows += 1;
    else if (ALLOWED_DECISIONS.includes(decision.reviewerDecision)) nonAcceptedRows += 1;
  }
  const missingDecisionRows = requests.filter((request) => !seen.has(rowIdentity(request))).length;
  if (decisionFilePresent && decisions.length !== EXPECTED_ROWS) addFinding(findings, 'blocker', 'decision_count_invalid', `Expected ${EXPECTED_ROWS}, found ${decisions.length}.`);
  const fixtureProbes = runFixtureProbes(requests[0]);
  for (const probe of fixtureProbes) if (!probe.passed) addFinding(findings, 'blocker', 'fixture_probe_failed', probe.id);
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const readyForImportDryRun = decisionFilePresent && blockers === 0 && decisions.length === EXPECTED_ROWS && missingDecisionRows === 0 && invalidDecisionRows === 0 && duplicateDecisionRows === 0 && openedFlagsRows === 0;
  const report = {
    schemaVersion: 'gustav-fr-personal-practice-mistake-taxonomy-review-decision-schema-gate-v1',
    generatedAt,
    status: blockers > 0 ? 'BLOCK' : readyForImportDryRun ? 'PASS' : 'HOLD',
    activationApproved: false,
    inputs: {
      requestsJsonl: rel(REQUESTS_PATH),
      requestsAudit: rel(REQUESTS_AUDIT_PATH),
      decisionsJsonl: rel(DECISIONS_PATH),
    },
    hashes: {
      requestsJsonlSha256: sha256(REQUESTS_PATH),
      decisionsJsonlSha256: sha256(DECISIONS_PATH),
    },
    summary: {
      requestRows: requests.length,
      decisionFilePresent,
      decisionRows: decisions.length,
      acceptedRows,
      nonAcceptedRows,
      missingDecisionRows,
      invalidDecisionRows,
      duplicateDecisionRows,
      openedFlagsRows,
      fixtureProbes: fixtureProbes.length,
      fixtureProbesPassed: fixtureProbes.filter((probe) => probe.passed).length,
      readyForImportDryRun,
      readyForApply: false,
    },
    safety: {
      dryRunOnly: true,
      reviewerDecisionsImportedByThisScript: false,
      appBundleModifiedByThisScript: false,
      serverUploadStarted: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
    },
    fixtureProbes,
    findings,
  };
  writeJson(OUT_AUDIT, report);
  fs.writeFileSync(OUT_MD, `# French Personal Practice Mistake Taxonomy Decision Schema Gate\n\nStatus: ${report.status}\n\nDecision rows: ${decisions.length}/${requests.length}\n\nActivation approved: false\n`, 'utf8');
  console.log(`Gustav French personal-practice mistake-taxonomy decision schema gate: ${report.status}`);
  console.log(`Decision rows: ${decisions.length}/${requests.length}`);
  console.log(rel(OUT_AUDIT));
  if (report.status === 'BLOCK') process.exitCode = 1;
}

main();

