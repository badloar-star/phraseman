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
const BATCH_PLAN_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_batch_plan_v1.json');
const OUT_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_decision_progress_gate_audit_v1.json');
const OUT_MD_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_decision_progress_gate_audit_v1.md');

const EXPECTED_ROWS = 1600;
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
const ALLOWED_DECISIONS = new Set([
  'accept_quality_gates',
  'needs_regeneration',
  'needs_llm_regeneration_review',
  'reject_candidate',
  'skip_for_later',
]);
const NON_ACCEPT_DECISIONS = new Set([
  'needs_regeneration',
  'needs_llm_regeneration_review',
  'reject_candidate',
  'skip_for_later',
]);
const ALLOWED_GATE_DECISIONS = new Set(['pass', 'fail', 'needs_source_check']);
const CORRECTABLE_DECISIONS = new Set(['needs_llm_regeneration_review']);
const RESUME_BATCH_SIZE = 25;

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

function parseJsonlIfPresent(filePath, findings) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8').trim();
  if (!text) return [];
  const rows = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    try {
      rows.push(JSON.parse(line));
    } catch (error) {
      findings.push({
        severity: 'blocker',
        code: 'decision_jsonl_parse_error',
        message: `Invalid JSONL at line ${index + 1}: ${error.message}`,
      });
    }
  }
  return rows;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function identity(row) {
  return `${row.requestId}:${row.sourceQueueIndex}:${row.lessonId}:${row.phraseId}`;
}

function sameArray(left, right) {
  return Array.isArray(left) && JSON.stringify(left) === JSON.stringify(right);
}

function sameKeySet(object, expectedKeys) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) return false;
  return JSON.stringify(Object.keys(object).sort()) === JSON.stringify([...expectedKeys].sort());
}

function hasCorrectionPayload(row) {
  return Boolean(
    String(row.correctedTargetText || '').trim() ||
    String(row.correctedQuizBlank || '').trim() ||
    String(row.correctedQuizCorrect || '').trim() ||
    (Array.isArray(row.correctedQuizDistractors) && row.correctedQuizDistractors.length > 0),
  );
}

function validateDecisionForProgress(decision, request) {
  const errors = [];
  const fail = (code, message) => errors.push({ code, message });
  if (!decision || typeof decision !== 'object' || Array.isArray(decision)) {
    return [{ code: 'decision_not_object', message: 'Decision row is not a JSON object.' }];
  }
  if (!sameKeySet(decision, DECISION_KEYS)) fail('decision_key_set_invalid', 'Decision row must contain exactly the V1 required key set.');
  if (decision.schemaVersion !== 'gustav-fr-lesson-llm-official-source-review-decision-v1') fail('schema_version_invalid', 'Decision schemaVersion is invalid.');
  if (decision.reviewScope !== 'lesson_row') fail('review_scope_invalid', 'Decision reviewScope must be lesson_row.');
  if (decision.studyTarget !== 'fr') fail('study_target_invalid', 'Decision studyTarget must be fr.');
  if (!sameArray(decision.sourceLocaleCoverage, ['ru', 'uk'])) fail('source_locale_coverage_invalid', 'Decision sourceLocaleCoverage must be exactly ru,uk.');
  if (decision.reviewerName !== 'llm_official_source_judge') fail('reviewer_name_invalid', 'reviewerName must be llm_official_source_judge.');
  if (!String(decision.reviewedAt || '').trim()) fail('reviewed_at_missing', 'reviewedAt is required.');
  if (!String(decision.reviewerNotes || '').trim()) fail('reviewer_notes_missing', 'reviewerNotes is required.');
  if (!request) {
    fail('decision_has_no_matching_request', 'Decision row has no matching request.');
  } else {
    for (const key of ['requestId', 'sourceQueueIndex', 'batchId', 'lessonId', 'phraseId']) {
      if (decision[key] !== request[key]) fail('decision_identity_mismatch', `Decision ${key} does not match the source request.`);
    }
  }
  if (!ALLOWED_DECISIONS.has(decision.reviewerDecision)) fail('reviewer_decision_invalid', 'reviewerDecision is not allowed.');
  if (!sameKeySet(decision.gateReviewerDecisions, EXPECTED_GATES)) fail('gate_decision_key_set_invalid', 'gateReviewerDecisions must contain exactly the 11 required gates.');
  if (!sameKeySet(decision.gateEvidenceNotes, EXPECTED_GATES)) fail('gate_evidence_notes_key_set_invalid', 'gateEvidenceNotes must contain exactly the 11 required gates.');

  const gateValues = EXPECTED_GATES.map((gateId) => decision.gateReviewerDecisions?.[gateId]);
  for (const gateId of EXPECTED_GATES) {
    const gateDecision = decision.gateReviewerDecisions?.[gateId];
    const gateNote = decision.gateEvidenceNotes?.[gateId];
    if (!ALLOWED_GATE_DECISIONS.has(gateDecision)) fail('gate_decision_invalid', `Gate ${gateId} has invalid decision.`);
    if (!String(gateNote || '').trim()) fail('gate_evidence_note_missing', `Gate ${gateId} evidence note is missing.`);
  }
  if (decision.reviewerImportAllowed !== false || decision.productionApplyAllowed !== false || decision.activationApproved !== false) {
    fail('decision_opened_import_apply_or_activation', 'Decision attempted to open import, apply or activation.');
  }
  const correctionPayload = hasCorrectionPayload(decision);
  if (decision.reviewerDecision === 'accept_quality_gates') {
    if (!gateValues.every((value) => value === 'pass')) fail('accept_with_non_pass_gate', 'accept_quality_gates requires all gates to pass.');
    if (correctionPayload) fail('accept_with_correction_payload', 'accept_quality_gates cannot include corrected fields.');
  }
  if (NON_ACCEPT_DECISIONS.has(decision.reviewerDecision) && gateValues.every((value) => value === 'pass')) {
    fail('non_accept_with_all_gates_passed', 'Non-accept decisions require at least one fail or needs_source_check gate.');
  }
  if (!CORRECTABLE_DECISIONS.has(decision.reviewerDecision) && correctionPayload) {
    fail('correction_payload_for_wrong_decision', 'Corrected fields are only allowed with needs_llm_regeneration_review.');
  }
  if (decision.reviewerDecision === 'needs_llm_regeneration_review' && !correctionPayload) {
    fail('needs_llm_regeneration_review_without_correction', 'needs_llm_regeneration_review requires at least one corrected field.');
  }
  if (decision.reviewerDecision === 'skip_for_later' && !gateValues.includes('needs_source_check')) {
    fail('skip_without_source_check_gate', 'skip_for_later requires at least one needs_source_check gate.');
  }
  return errors;
}

function buildMarkdown(report) {
  const lines = [
    '# Gustav French Lesson LLM Review Decision Progress Gate',
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Request rows: ${report.summary.requestRows}`,
    `- Decision rows: ${report.summary.decisionRows}`,
    `- Matched decisions: ${report.summary.matchedDecisionRows}`,
    `- Missing decisions: ${report.summary.missingDecisionRows}`,
    `- Duplicate decisions: ${report.summary.duplicateDecisionRows}`,
    `- Extra decisions: ${report.summary.extraDecisionRows}`,
    `- Invalid decisions: ${report.summary.invalidDecisionRows}`,
    `- Valid decisions: ${report.summary.validDecisionRows}`,
    `- Open import/apply/activation flags: ${report.summary.openedImportApplyActivationRows}`,
    `- Contiguous reviewed prefix: ${report.summary.contiguousReviewedPrefixRows}`,
    `- Next resume start index: ${report.summary.nextResumeStartIndex}`,
    `- Completed batches: ${report.summary.completedBatches}`,
    `- Remaining batches: ${report.summary.remainingBatches}`,
    `- Ready for full schema gate: ${report.summary.readyForFullSchemaGate ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    '',
    '## Next Command',
    '',
    report.summary.nextBatchExecuteCommand ? `\`${report.summary.nextBatchExecuteCommand}\`` : 'No next batch command.',
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) lines.push('- None.');
  else for (const finding of report.findings) lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}`);
  lines.push('', '## Safety', '');
  lines.push('- This gate does not call OpenAI.');
  lines.push('- This gate does not write reviewer decisions.');
  lines.push('- This gate does not import decisions, upload packs, enable runtime downloads or approve activation.');
  lines.push('');
  return lines.join('\n');
}

function main() {
  const generatedAt = new Date().toISOString();
  const findings = [];
  const requests = parseJsonlIfPresent(REQUESTS_JSONL_PATH, findings);
  const decisions = parseJsonlIfPresent(DECISIONS_JSONL_PATH, findings);
  const batchPlan = readJsonIfPresent(BATCH_PLAN_PATH);

  const requestByIdentity = new Map(requests.map((request) => [identity(request), request]));
  const decisionsByIdentity = new Map();
  const validDecisionIdentities = new Set();
  const invalidDecisionRows = [];
  const openedImportApplyActivationRows = [];
  const duplicateDecisionRows = [];
  const extraDecisionRows = [];

  for (const decision of decisions) {
    const key = identity(decision);
    const request = requestByIdentity.get(key);
    if (!request) extraDecisionRows.push(decision);
    if (decisionsByIdentity.has(key)) duplicateDecisionRows.push(decision);
    decisionsByIdentity.set(key, decision);
    const rowErrors = validateDecisionForProgress(decision, request);
    if (rowErrors.length > 0) {
      invalidDecisionRows.push({ decision, errors: rowErrors });
    } else if (!duplicateDecisionRows.includes(decision)) {
      validDecisionIdentities.add(key);
    }
    if (decision.reviewerImportAllowed || decision.productionApplyAllowed || decision.activationApproved) {
      openedImportApplyActivationRows.push(decision);
    }
  }

  const missingRequests = requests.filter((request) => !validDecisionIdentities.has(identity(request)));
  const matchedDecisionRows = validDecisionIdentities.size;
  let contiguousReviewedPrefixRows = 0;
  for (const request of [...requests].sort((a, b) => a.sourceQueueIndex - b.sourceQueueIndex)) {
    if (!validDecisionIdentities.has(identity(request))) break;
    contiguousReviewedPrefixRows += 1;
  }

  const batches = Array.isArray(batchPlan?.batches) ? batchPlan.batches : [];
  const completedBatches = batches.filter((batch) => {
    const rows = requests.filter((request) => request.sourceQueueIndex >= batch.startIndex && request.sourceQueueIndex <= batch.endIndex);
    return rows.length === batch.limit && rows.every((request) => validDecisionIdentities.has(identity(request)));
  }).length;
  const partiallyCompletedBatches = batches.filter((batch) => {
    const rows = requests.filter((request) => request.sourceQueueIndex >= batch.startIndex && request.sourceQueueIndex <= batch.endIndex);
    const reviewed = rows.filter((request) => validDecisionIdentities.has(identity(request))).length;
    return reviewed > 0 && reviewed < rows.length;
  }).length;
  const nextResumeStartIndex = missingRequests[0]?.sourceQueueIndex || null;
  const nextBatch = batches.find((batch) => nextResumeStartIndex && nextResumeStartIndex >= batch.startIndex && nextResumeStartIndex <= batch.endIndex) || null;
  const nextBatchLimit = nextResumeStartIndex
    ? Math.min(RESUME_BATCH_SIZE, EXPECTED_ROWS - nextResumeStartIndex + 1)
    : 0;
  const nextBatchDryRunCommand = nextResumeStartIndex
    ? `node scripts/gustav_execute_fr_lesson_llm_review_batch.mjs --start-index ${nextResumeStartIndex} --limit ${nextBatchLimit} --validate-after`
    : '';
  const nextBatchExecuteCommand = nextResumeStartIndex
    ? `node scripts/gustav_execute_fr_lesson_llm_review_batch.mjs --start-index ${nextResumeStartIndex} --limit ${nextBatchLimit} --execute --validate-after`
    : '';

  if (requests.length !== EXPECTED_ROWS) {
    findings.push({
      severity: 'blocker',
      code: 'request_count_invalid',
      message: `Expected ${EXPECTED_ROWS} requests, found ${requests.length}.`,
    });
  }
  if (!fs.existsSync(DECISIONS_JSONL_PATH)) {
    findings.push({
      severity: 'info',
      code: 'decisions_file_missing',
      message: 'No LLM decision JSONL exists yet; progress remains at 0 decisions.',
    });
  }
  if (duplicateDecisionRows.length > 0) {
    findings.push({
      severity: 'blocker',
      code: 'duplicate_decision_rows',
      message: `${duplicateDecisionRows.length} duplicate decision rows found.`,
    });
  }
  if (extraDecisionRows.length > 0) {
    findings.push({
      severity: 'blocker',
      code: 'extra_decision_rows',
      message: `${extraDecisionRows.length} decision rows do not match any request.`,
    });
  }
  if (invalidDecisionRows.length > 0) {
    findings.push({
      severity: 'blocker',
      code: 'invalid_decision_rows',
      message: `${invalidDecisionRows.length} decision rows failed strict progress validation.`,
      examples: invalidDecisionRows.slice(0, 5).map((item) => ({
        requestId: item.decision.requestId || '',
        sourceQueueIndex: item.decision.sourceQueueIndex || null,
        codes: item.errors.map((error) => error.code),
      })),
    });
  }
  if (openedImportApplyActivationRows.length > 0) {
    findings.push({
      severity: 'blocker',
      code: 'decision_opened_import_apply_or_activation',
      message: `${openedImportApplyActivationRows.length} decision rows attempted to open import/apply/activation flags.`,
    });
  }
  if (!batchPlan) {
    findings.push({
      severity: 'blocker',
      code: 'batch_plan_missing',
      message: 'Batch plan is missing; resume commands cannot be proven.',
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const readyForFullSchemaGate =
    blockers === 0 &&
    requests.length === EXPECTED_ROWS &&
    decisions.length === EXPECTED_ROWS &&
    matchedDecisionRows === EXPECTED_ROWS &&
    missingRequests.length === 0;

  const report = {
    schemaVersion: 'gustav-fr-lesson-llm-review-decision-progress-gate-audit-v1',
    generatedAt,
    status: readyForFullSchemaGate ? 'PASS_READY_FOR_FULL_SCHEMA_GATE' : blockers > 0 ? 'BLOCK' : 'HOLD_PARTIAL_OR_EMPTY',
    activationApproved: false,
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    targetContentLang: 'fr',
    aiOutputLang: 'fr',
    inputs: {
      requestsJsonl: rel(REQUESTS_JSONL_PATH),
      decisionsJsonl: rel(DECISIONS_JSONL_PATH),
      batchPlan: rel(BATCH_PLAN_PATH),
    },
    hashes: {
      requestsJsonlSha256: sha256(REQUESTS_JSONL_PATH),
      decisionsJsonlSha256: sha256(DECISIONS_JSONL_PATH),
      batchPlanSha256: sha256(BATCH_PLAN_PATH),
    },
    summary: {
      requestRows: requests.length,
      decisionFilePresent: fs.existsSync(DECISIONS_JSONL_PATH),
      decisionRows: decisions.length,
      matchedDecisionRows,
      missingDecisionRows: missingRequests.length,
      duplicateDecisionRows: duplicateDecisionRows.length,
      extraDecisionRows: extraDecisionRows.length,
      invalidDecisionRows: invalidDecisionRows.length,
      openedImportApplyActivationRows: openedImportApplyActivationRows.length,
      validDecisionRows: validDecisionIdentities.size,
      contiguousReviewedPrefixRows,
      nextResumeStartIndex,
      completedBatches,
      partiallyCompletedBatches,
      remainingBatches: Math.max(0, batches.length - completedBatches),
      nextBatchNumber: nextBatch?.batchNumber || null,
      nextBatchStartIndex: nextResumeStartIndex,
      nextBatchLimit,
      nextBatchDryRunCommand,
      nextBatchExecuteCommand,
      readyForFullSchemaGate,
      readyForDecisionImportDryRun: false,
      readyForAudioManifestGate: false,
      readyForServerPackManifestGate: false,
      readyForRuntimeDeliveryGate: false,
      readyForApply: false,
      blockers,
      warnings: findings.filter((finding) => finding.severity === 'warning').length,
    },
    safety: {
      openAiCallsMadeByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
    findings,
    nextRequiredGates: readyForFullSchemaGate
      ? [
          'llm_review_decision_schema_gate',
          'review_decision_import_dry_run_gate',
          'audio_manifest_gate',
          'server_pack_manifest_gate',
          'runtime_delivery_gate',
          'admin_activation_rollback_gate',
          'explicit_activation_approval_gate',
        ]
      : [
          'execute_remaining_llm_review_batches',
          'decision_progress_gate',
          'llm_review_decision_schema_gate',
          'review_decision_import_dry_run_gate',
          'audio_manifest_gate',
          'server_pack_manifest_gate',
          'runtime_delivery_gate',
          'admin_activation_rollback_gate',
          'explicit_activation_approval_gate',
        ],
  };

  writeJson(OUT_AUDIT_PATH, report);
  fs.writeFileSync(OUT_MD_PATH, buildMarkdown(report), 'utf8');

  console.log(`Gustav French lesson LLM review decision progress gate: ${report.status}`);
  console.log(`Decisions: ${report.summary.decisionRows}/${EXPECTED_ROWS}`);
  console.log(`Next resume start index: ${report.summary.nextResumeStartIndex || 'none'}`);
  console.log(`Ready for full schema gate: ${report.summary.readyForFullSchemaGate ? 'yes' : 'no'}`);
  console.log(rel(OUT_AUDIT_PATH));
}

main();
