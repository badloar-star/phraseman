import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const PACKET_PATH = path.join(REVIEWER_DIR, 'fr_lesson01_review_draft_llm_packet_v1.json');
const DECISIONS_PATH = path.join(REVIEWER_DIR, 'fr_lesson01_review_draft_llm_decisions_v1.jsonl');
const AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson01_review_draft_llm_decision_gate_audit_v1.json');
const MD_PATH = path.join(REVIEWER_DIR, 'fr_lesson01_review_draft_llm_decision_gate_audit_v1.md');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

const REQUIRED_ROWS = 50;
const ACCEPT_DECISION = 'accept_review_draft';
const REQUIRED_GATES = [
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
const ALLOWED_DECISION_KEYS = [
  'schemaVersion',
  'requestId',
  'reviewerDecision',
  'gateReviewerDecisions',
  'gateEvidenceNotes',
  'reviewerNotes',
  'correctedFrench',
  'correctedRussian',
  'correctedUkrainian',
  'correctedWordsFr',
  'reviewerImportAllowed',
  'productionApplyAllowed',
  'activationApproved',
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJsonlIfPresent(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const body = fs.readFileSync(filePath, 'utf8').trim();
  if (!body) return [];
  return body.split(/\r?\n/).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      return { __parseError: `line ${index + 1}: ${error.message}` };
    }
  });
}

function buildMarkdown(audit) {
  const lines = [
    '# French Lesson 1 Review Draft LLM Decision Gate',
    '',
    `Status: ${audit.status}`,
    `Decisions present: ${audit.decisionsPresent}`,
    `Decision rows: ${audit.decisionRows}`,
    `Accepted rows: ${audit.acceptedRows}`,
    '',
    '## Blockers',
    '',
    ...(audit.blockers.length ? audit.blockers.map((item) => `- ${item}`) : ['- none']),
    '',
    '## Safety',
    '',
    `- readyForMaterialization: ${audit.readyForMaterialization}`,
    `- readyForApply: ${audit.readyForApply}`,
    `- activationApproved: ${audit.activationApproved}`,
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function main() {
  const generatedAt = new Date().toISOString();
  const packet = readJson(PACKET_PATH);
  const decisions = readJsonlIfPresent(DECISIONS_PATH);
  const blockers = [];

  if (packet.schemaVersion !== 'gustav-fr-lesson01-review-draft-llm-packet-v1') blockers.push('review packet schema mismatch');
  if (packet.status !== 'HOLD_READY_FOR_LLM_REVIEW') blockers.push('review packet is not ready for LLM review');
  if (!decisions) blockers.push('decisions_file_missing');

  const expectedRequestIds = new Set(packet.rowRequests.map((request) => request.requestId));
  const seenRequestIds = new Set();
  let acceptedRows = 0;
  let openedImportApplyActivationRows = 0;
  let parseErrors = 0;
  let rowsWithGateFailures = 0;
  let rowsWithCorrections = 0;
  let rowsWithSchemaExtraKeys = 0;
  let rowsWithMissingGateNotes = 0;

  for (const decision of decisions ?? []) {
    if (decision.__parseError) {
      parseErrors += 1;
      blockers.push(decision.__parseError);
      continue;
    }
    if (decision.schemaVersion !== 'gustav-fr-lesson01-review-draft-llm-row-decision-v1') blockers.push(`${decision.requestId ?? 'unknown'}: schemaVersion mismatch`);
    const extraKeys = Object.keys(decision).filter((key) => !ALLOWED_DECISION_KEYS.includes(key));
    if (extraKeys.length > 0) {
      rowsWithSchemaExtraKeys += 1;
      blockers.push(`${decision.requestId ?? 'unknown'}: unexpected decision keys ${extraKeys.join(',')}`);
    }
    if (!expectedRequestIds.has(decision.requestId)) blockers.push(`${decision.requestId ?? 'unknown'}: unexpected requestId`);
    if (seenRequestIds.has(decision.requestId)) blockers.push(`${decision.requestId}: duplicate decision`);
    seenRequestIds.add(decision.requestId);

    if (decision.reviewerImportAllowed || decision.productionApplyAllowed || decision.activationApproved) openedImportApplyActivationRows += 1;
    const gateValues = Object.values(decision.gateReviewerDecisions ?? {});
    if (gateValues.length !== 11 || gateValues.some((value) => value !== 'pass')) rowsWithGateFailures += 1;
    const gateNoteKeys = Object.keys(decision.gateEvidenceNotes ?? {});
    const missingGateNotes = REQUIRED_GATES.filter((gateId) => !gateNoteKeys.includes(gateId) || String(decision.gateEvidenceNotes[gateId] ?? '').trim().length === 0);
    if (missingGateNotes.length > 0) rowsWithMissingGateNotes += 1;
    if (decision.correctedFrench || decision.correctedRussian || decision.correctedUkrainian || (decision.correctedWordsFr ?? []).length > 0) rowsWithCorrections += 1;
    if (decision.reviewerDecision === ACCEPT_DECISION) acceptedRows += 1;
  }

  if (decisions && decisions.length !== REQUIRED_ROWS) blockers.push(`expected_${REQUIRED_ROWS}_decision_rows_got_${decisions.length}`);
  if (decisions && seenRequestIds.size !== REQUIRED_ROWS) blockers.push(`expected_${REQUIRED_ROWS}_unique_request_ids_got_${seenRequestIds.size}`);
  if (decisions && acceptedRows !== REQUIRED_ROWS) blockers.push(`expected_${REQUIRED_ROWS}_accepted_rows_got_${acceptedRows}`);
  if (openedImportApplyActivationRows > 0) blockers.push(`${openedImportApplyActivationRows}_rows_opened_import_apply_or_activation`);
  if (parseErrors > 0) blockers.push(`${parseErrors}_parse_errors`);
  if (rowsWithGateFailures > 0) blockers.push(`${rowsWithGateFailures}_rows_have_non_pass_gates`);
  if (rowsWithMissingGateNotes > 0) blockers.push(`${rowsWithMissingGateNotes}_rows_have_missing_gate_notes`);
  if (rowsWithSchemaExtraKeys > 0) blockers.push(`${rowsWithSchemaExtraKeys}_rows_have_schema_extra_keys`);
  if (rowsWithCorrections > 0) blockers.push(`${rowsWithCorrections}_accepted_decision_rows_include_corrections_or_unresolved_changes`);

  const readyForMaterialization = blockers.length === 0 && acceptedRows === REQUIRED_ROWS;
  const audit = {
    schemaVersion: 'gustav-fr-lesson01-review-draft-llm-decision-gate-audit-v1',
    generatedAt,
    status: readyForMaterialization ? 'PASS_READY_FOR_MATERIALIZATION_CONTRACT' : 'HOLD',
    blockers,
    studyTarget: 'fr',
    sourcePacket: rel(PACKET_PATH),
    decisionsPath: rel(DECISIONS_PATH),
    decisionsPresent: Boolean(decisions),
    decisionRows: decisions?.length ?? 0,
    acceptedRows,
    uniqueRequestIds: seenRequestIds.size,
    openedImportApplyActivationRows,
    rowsWithGateFailures,
    rowsWithMissingGateNotes,
    rowsWithSchemaExtraKeys,
    rowsWithCorrections,
    readyForMaterialization,
    readyForApply: false,
    productionApplyApproved: false,
    activationApproved: false,
  };

  writeJson(AUDIT_PATH, audit);
  fs.writeFileSync(MD_PATH, buildMarkdown(audit), 'utf8');

  if (fs.existsSync(STATE_PATH)) {
    const state = readJson(STATE_PATH);
    state.lesson01ReviewDraftLlmDecisionGateAudit = rel(AUDIT_PATH);
    state.lesson01ReviewDraftLlmDecisionGateStatus = audit.status;
    state.lesson01ReviewDraftLlmDecisionGateSummary = {
      decisionsPresent: audit.decisionsPresent,
      decisionRows: audit.decisionRows,
      acceptedRows: audit.acceptedRows,
      readyForMaterialization: audit.readyForMaterialization,
      readyForApply: audit.readyForApply,
      activationApproved: audit.activationApproved,
      blockers: audit.blockers,
    };
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`${audit.status} ${rel(AUDIT_PATH)} decisions=${audit.decisionRows} accepted=${audit.acceptedRows} blockers=${audit.blockers.length}`);
  if (readyForMaterialization === false) process.exitCode = 0;
}

main();
