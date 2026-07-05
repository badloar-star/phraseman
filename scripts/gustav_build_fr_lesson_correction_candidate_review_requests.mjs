import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const WORK_DIR = path.join(REVIEWER_DIR, 'work_orders');
const ORIGINAL_REQUESTS_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_requests_v1.jsonl');
const CANDIDATE_QUEUE_PATH = path.join(WORK_DIR, 'fr_lesson_correction_candidate_queue_v1.jsonl');
const CANDIDATE_AUDIT_PATH = path.join(WORK_DIR, 'fr_lesson_correction_candidate_work_order_audit_v1.json');
const OUT_REQUESTS_PATH = path.join(WORK_DIR, 'fr_lesson_correction_candidate_review_requests_v1.jsonl');
const OUT_MANIFEST_PATH = path.join(WORK_DIR, 'fr_lesson_correction_candidate_review_requests_manifest_v1.json');
const OUT_AUDIT_PATH = path.join(WORK_DIR, 'fr_lesson_correction_candidate_review_requests_audit_v1.json');
const OUT_MD_PATH = path.join(WORK_DIR, 'fr_lesson_correction_candidate_review_requests_v1.md');
const FUTURE_DECISIONS_PATH = path.join(WORK_DIR, 'fr_lesson_correction_candidate_review_decisions_v1.jsonl');

const EXPECTED_CANDIDATE_ROWS = 290;
const BATCH_SIZE = 25;
const GATE_DECISIONS = ['pass', 'fail', 'needs_source_check'];
const ROW_DECISIONS = [
  'accept_quality_gates',
  'needs_regeneration',
  'needs_llm_regeneration_review',
  'reject_candidate',
  'skip_for_later',
];

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function sha256(value) {
  const body = Buffer.isBuffer(value) ? value : Buffer.from(String(value), 'utf8');
  return crypto.createHash('sha256').update(body).digest('hex');
}

function fileSha256(filePath) {
  return fs.existsSync(filePath) ? sha256(fs.readFileSync(filePath)) : '';
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

function writeJsonl(filePath, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''), 'utf8');
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function constString(value) {
  return { type: 'string', const: value };
}

function constInteger(value) {
  return { type: 'integer', const: value };
}

function constBoolean(value) {
  return { type: 'boolean', const: value };
}

function constStringArray(values) {
  return {
    type: 'array',
    minItems: values.length,
    maxItems: values.length,
    items: { type: 'string', enum: values },
    description: `Must be exactly: ${values.join(', ')}.`,
  };
}

function enumString(values) {
  return { type: 'string', enum: values };
}

function blankMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, '']));
}

function buildOutputSchema({ requestId, correctionQueueIndex, batchId, row, requiredGateIds }) {
  return {
    type: 'object',
    additionalProperties: false,
    required: [
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
    ],
    properties: {
      schemaVersion: constString('gustav-fr-lesson-llm-official-source-review-decision-v1'),
      requestId: constString(requestId),
      reviewScope: constString('lesson_row'),
      sourceQueueIndex: constInteger(correctionQueueIndex),
      batchId: constString(batchId),
      lessonId: constInteger(row.lessonId),
      phraseId: constString(row.phraseId),
      studyTarget: constString('fr'),
      sourceLocaleCoverage: constStringArray(['ru', 'uk']),
      reviewerDecision: enumString(ROW_DECISIONS),
      gateReviewerDecisions: {
        type: 'object',
        required: requiredGateIds,
        additionalProperties: false,
        properties: Object.fromEntries(requiredGateIds.map((gateId) => [gateId, enumString(GATE_DECISIONS)])),
      },
      gateEvidenceNotes: {
        type: 'object',
        required: requiredGateIds,
        additionalProperties: false,
        properties: Object.fromEntries(requiredGateIds.map((gateId) => [gateId, { type: 'string', minLength: 1 }])),
      },
      reviewerNotes: { type: 'string', minLength: 1 },
      reviewerName: constString('llm_official_source_judge'),
      reviewedAt: { type: 'string', minLength: 1 },
      correctedTargetText: {
        type: 'string',
        description: 'Use an empty string unless reviewerDecision is needs_llm_regeneration_review.',
      },
      correctedQuizBlank: {
        type: 'string',
        description: 'Use an empty string unless reviewerDecision is needs_llm_regeneration_review.',
      },
      correctedQuizCorrect: {
        type: 'string',
        description: 'Use an empty string unless reviewerDecision is needs_llm_regeneration_review.',
      },
      correctedQuizDistractors: {
        type: 'array',
        items: { type: 'string' },
        description: 'Use an empty array unless reviewerDecision is needs_llm_regeneration_review.',
      },
      reviewerImportAllowed: constBoolean(false),
      productionApplyAllowed: constBoolean(false),
      activationApproved: constBoolean(false),
    },
  };
}

function buildBlankResponse({ requestId, correctionQueueIndex, batchId, row, requiredGateIds }) {
  return {
    schemaVersion: 'gustav-fr-lesson-llm-official-source-review-decision-v1',
    requestId,
    reviewScope: 'lesson_row',
    sourceQueueIndex: correctionQueueIndex,
    batchId,
    lessonId: row.lessonId,
    phraseId: row.phraseId,
    studyTarget: 'fr',
    sourceLocaleCoverage: ['ru', 'uk'],
    reviewerDecision: '',
    gateReviewerDecisions: blankMap(requiredGateIds),
    gateEvidenceNotes: blankMap(requiredGateIds),
    reviewerNotes: '',
    reviewerName: 'llm_official_source_judge',
    reviewedAt: '',
    correctedTargetText: '',
    correctedQuizBlank: '',
    correctedQuizCorrect: '',
    correctedQuizDistractors: [],
    reviewerImportAllowed: false,
    productionApplyAllowed: false,
    activationApproved: false,
  };
}

function buildRequest(row, originalRequest, correctionQueueIndex, correctionQueueSha256) {
  const requestId = `fr.lesson.${String(row.lessonId).padStart(2, '0')}.row.${String(row.rowNumber).padStart(2, '0')}.correction_candidate_review_request.v1`;
  const batchNumber = Math.ceil(correctionQueueIndex / BATCH_SIZE);
  const batchId = `fr-correction-candidates-review-v1-batch-${String(batchNumber).padStart(2, '0')}`;
  const requiredGateIds = Object.keys(originalRequest.blankResponseTemplate.gateReviewerDecisions);
  const gateRubrics = Object.fromEntries(
    requiredGateIds.map((gateId) => [gateId, originalRequest.instructions.gateRubrics[gateId]]),
  );
  const schemaArgs = { requestId, correctionQueueIndex, batchId, row, requiredGateIds };

  return {
    schemaVersion: 'gustav-fr-lesson-llm-official-source-review-request-v1',
    requestId,
    reviewScope: 'lesson_row',
    sourceQueueIndex: correctionQueueIndex,
    batchId,
    lessonId: row.lessonId,
    rowNumber: row.rowNumber,
    phraseId: row.phraseId,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    aiOutputLang: 'fr',
    sourceLocaleCoverage: ['ru', 'uk'],
    reviewPriority: 'correction_candidate',
    sourceQueueSha256: correctionQueueSha256,
    sourceIdentity: {
      ...cloneJson(row.sourceIdentity),
      originalRequestId: row.requestId,
      originalSourceQueueIndex: row.sourceQueueIndex,
      correctionQueueIndex,
      originalSourceQueueSha256: originalRequest.sourceQueueSha256,
      originalCandidateSha256: row.hashes.originalCandidateSha256,
      candidateAfterCorrectionSha256: row.hashes.candidateAfterCorrectionSha256,
      correctionCandidateQueuePath: rel(CANDIDATE_QUEUE_PATH),
    },
    correctionReviewContext: {
      originalRequestId: row.requestId,
      originalSourceQueueIndex: row.sourceQueueIndex,
      originReviewerDecision: row.originReviewerDecision,
      action: row.action,
      appliedFields: row.appliedFields,
      failedGateIds: row.failedGateIds,
      correctionPayload: row.correctionPayload,
      originalCandidateSha256: row.hashes.originalCandidateSha256,
      candidateAfterCorrectionSha256: row.hashes.candidateAfterCorrectionSha256,
      priorCandidateWasNotAccepted: true,
      previousCorrectionIsNotApproval: true,
      decisionsMustBeWrittenToSeparateFile: rel(FUTURE_DECISIONS_PATH),
    },
    candidate: cloneJson(row.candidateAfterCorrection),
    trustedSourceContext: cloneJson(originalRequest.trustedSourceContext),
    instructions: {
      ...cloneJson(originalRequest.instructions),
      task:
        'Review this corrected French lesson row candidate against trusted sources and PhraseMan language-isolation rules. Treat the prior correction only as a proposal; it is not approval. Do not review neighboring rows.',
      hardRules: [
        ...originalRequest.instructions.hardRules,
        'This correction candidate starts from a previously non-accepted row; do not auto-accept it because a correction payload exists.',
        'Run every gate fresh against candidateAfterCorrection and trusted source evidence.',
        'Write decisions only for this correction-candidate request identity, not for the original 1600-row decision queue.',
        'Keep reviewerImportAllowed=false, productionApplyAllowed=false and activationApproved=false for every correction-candidate result.',
      ],
      gateRubrics,
      decisionPolicy: {
        ...cloneJson(originalRequest.instructions.decisionPolicy),
        accept_quality_gates:
          'Use only when the corrected candidate passes every gate fresh and no further correction is needed.',
      },
    },
    outputJsonSchema: buildOutputSchema(schemaArgs),
    blankResponseTemplate: buildBlankResponse(schemaArgs),
    safety: {
      requestOnly: true,
      correctionCandidateRequestOnly: true,
      llmDecisionAlreadyFilled: false,
      reviewerDecisionsImportedByThisRequest: false,
      originalDecisionQueueModifiedByThisRequest: false,
      appBundleModifiedByThisRequest: false,
      generatedFrenchLedgersModifiedByThisRequest: false,
      audioGeneratedByThisRequest: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
    },
  };
}

function buildBatches(requests) {
  const batches = [];
  for (let start = 1; start <= requests.length; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE - 1, requests.length);
    batches.push({
      batchNumber: batches.length + 1,
      batchId: `fr-correction-candidates-review-v1-batch-${String(batches.length + 1).padStart(2, '0')}`,
      startCorrectionQueueIndex: start,
      endCorrectionQueueIndex: end,
      rows: end - start + 1,
      decisionsOutput: rel(FUTURE_DECISIONS_PATH),
    });
  }
  return batches;
}

function buildMarkdown(audit) {
  return [
    '# French Correction Candidate Review Requests',
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Review requests: ${audit.summary.reviewRequestRows}`,
    `- Planned batches: ${audit.summary.plannedBatches}`,
    `- Original queue untouched: ${audit.safety.originalDecisionQueueModifiedByThisScript ? 'no' : 'yes'}`,
    `- Ready for external LLM review: ${audit.summary.readyForExternalReview ? 'yes' : 'no'}`,
    `- Ready for import/apply: no`,
    '',
    '## Rule',
    '',
    'These requests review isolated corrected candidates only. They do not approve content, import decisions, write app/server/audio files, or open activation.',
    '',
  ].join('\n');
}

function main() {
  const generatedAt = new Date().toISOString();
  const candidateAudit = readJson(CANDIDATE_AUDIT_PATH);
  const candidateRows = readJsonl(CANDIDATE_QUEUE_PATH);
  const originalRequests = readJsonl(ORIGINAL_REQUESTS_PATH);
  const originalById = new Map(originalRequests.map((request) => [request.requestId, request]));
  const blockers = [];
  const warnings = [];

  if (candidateAudit.schemaVersion !== 'gustav-fr-lesson-correction-candidate-work-order-audit-v1') {
    blockers.push('CORRECTION_CANDIDATE_AUDIT_SCHEMA_MISMATCH');
  }
  if (!candidateAudit.summary?.readyForReviewRequestBuild) blockers.push('CORRECTION_CANDIDATES_NOT_READY_FOR_REVIEW_REQUEST_BUILD');
  if (candidateRows.length !== EXPECTED_CANDIDATE_ROWS) blockers.push(`EXPECTED_${EXPECTED_CANDIDATE_ROWS}_CORRECTION_CANDIDATE_ROWS`);
  if (candidateRows.length !== candidateAudit.summary?.correctionCandidateRows) blockers.push('CANDIDATE_QUEUE_AUDIT_COUNT_MISMATCH');

  const missingOriginalRows = candidateRows.filter((row) => !originalById.has(row.requestId));
  if (missingOriginalRows.length > 0) blockers.push(`${missingOriginalRows.length}_CORRECTION_CANDIDATES_MISSING_ORIGINAL_REVIEW_REQUESTS`);

  const correctionQueueSha256 = fileSha256(CANDIDATE_QUEUE_PATH);
  const requests = candidateRows.map((row, index) => buildRequest(row, originalById.get(row.requestId), index + 1, correctionQueueSha256));
  const batches = buildBatches(requests);

  const duplicateRequestIds = requests.length - new Set(requests.map((request) => request.requestId)).size;
  const duplicateCorrectionQueueIndexes = requests.length - new Set(requests.map((request) => request.sourceQueueIndex)).size;
  const blankTemplateRows = requests.filter((request) => request.blankResponseTemplate.reviewerDecision === '').length;
  const openedApplyRows = requests.filter((request) =>
    request.blankResponseTemplate.reviewerImportAllowed ||
    request.blankResponseTemplate.productionApplyAllowed ||
    request.blankResponseTemplate.activationApproved ||
    request.safety.activationApproved,
  ).length;
  const deepReasoningRows = requests.filter((request) => request.instructions.reasoningLevel === 'deep').length;
  const sourceLocaleSafeRows = requests.filter((request) =>
    JSON.stringify(request.sourceLocaleCoverage) === JSON.stringify(['ru', 'uk']) &&
    request.studyTarget === 'fr' &&
    request.targetContentLang === 'fr' &&
    request.aiOutputLang === 'fr',
  ).length;
  const candidateHashPreservedRows = requests.filter((request) =>
    request.sourceIdentity.candidateAfterCorrectionSha256 === sha256(JSON.stringify(request.candidate)) &&
    request.correctionReviewContext.originalCandidateSha256 === request.sourceIdentity.originalCandidateSha256,
  ).length;

  if (duplicateRequestIds > 0) blockers.push(`${duplicateRequestIds}_DUPLICATE_CORRECTION_REVIEW_REQUEST_IDS`);
  if (duplicateCorrectionQueueIndexes > 0) blockers.push(`${duplicateCorrectionQueueIndexes}_DUPLICATE_CORRECTION_QUEUE_INDEXES`);
  if (blankTemplateRows !== requests.length) blockers.push('EVERY_CORRECTION_REQUEST_MUST_KEEP_BLANK_TEMPLATE_UNDECIDED');
  if (openedApplyRows > 0) blockers.push(`${openedApplyRows}_CORRECTION_REQUESTS_OPENED_APPLY_FLAGS`);
  if (deepReasoningRows !== requests.length) blockers.push('EVERY_CORRECTION_REQUEST_MUST_USE_DEEP_REASONING');
  if (sourceLocaleSafeRows !== requests.length) blockers.push('CORRECTION_REQUEST_LANGUAGE_ISOLATION_FIELDS_NOT_SAFE');
  if (candidateHashPreservedRows !== requests.length) blockers.push('CORRECTION_CANDIDATE_HASH_PRESERVATION_FAILED');

  writeJsonl(OUT_REQUESTS_PATH, requests);

  const summary = {
    correctionCandidateRows: candidateRows.length,
    reviewRequestRows: requests.length,
    plannedBatches: batches.length,
    batchSize: BATCH_SIZE,
    blankResponseTemplateRows: blankTemplateRows,
    openedImportApplyActivationRows: openedApplyRows,
    deepReasoningRows,
    sourceLocaleSafeRows,
    duplicateRequestIds,
    duplicateCorrectionQueueIndexes,
    candidateHashPreservedRows,
    readyForExternalReview: blockers.length === 0,
    readyForDecisionImport: false,
    readyForAudioManifestGate: false,
    readyForApply: false,
    estimatedCorrectionReviewCostUsd: Number((requests.length * 0.0025).toFixed(4)),
  };

  const manifest = {
    schemaVersion: 'gustav-fr-lesson-correction-candidate-review-requests-manifest-v1',
    generatedAt,
    status: blockers.length === 0 ? 'HOLD_READY_FOR_CORRECTION_CANDIDATE_LLM_REVIEW' : 'BLOCK',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    requestRows: requests.length,
    batches,
    rowDecisionAllowedValues: ROW_DECISIONS,
    gateDecisionAllowedValues: GATE_DECISIONS,
    inputs: {
      originalReviewRequests: rel(ORIGINAL_REQUESTS_PATH),
      correctionCandidateQueue: rel(CANDIDATE_QUEUE_PATH),
      correctionCandidateAudit: rel(CANDIDATE_AUDIT_PATH),
    },
    outputs: {
      requestsJsonl: rel(OUT_REQUESTS_PATH),
      audit: rel(OUT_AUDIT_PATH),
      futureDecisionsJsonl: rel(FUTURE_DECISIONS_PATH),
    },
    hashes: {
      originalReviewRequestsSha256: fileSha256(ORIGINAL_REQUESTS_PATH),
      correctionCandidateQueueSha256: correctionQueueSha256,
      requestsJsonlSha256: fileSha256(OUT_REQUESTS_PATH),
    },
    safety: {
      requestOnly: true,
      llmApiCalledByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      originalDecisionQueueModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      audioGeneratedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
    },
  };
  writeJson(OUT_MANIFEST_PATH, manifest);

  const audit = {
    schemaVersion: 'gustav-fr-lesson-correction-candidate-review-requests-audit-v1',
    generatedAt,
    status: blockers.length === 0 ? 'HOLD' : 'BLOCK',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    aiOutputLang: 'fr',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    summary,
    inputs: manifest.inputs,
    outputs: {
      requestsJsonl: rel(OUT_REQUESTS_PATH),
      manifest: rel(OUT_MANIFEST_PATH),
      markdown: rel(OUT_MD_PATH),
      futureDecisionsJsonl: rel(FUTURE_DECISIONS_PATH),
    },
    hashes: {
      originalReviewRequestsSha256: fileSha256(ORIGINAL_REQUESTS_PATH),
      correctionCandidateQueueSha256: correctionQueueSha256,
      requestsJsonlSha256: fileSha256(OUT_REQUESTS_PATH),
      manifestSha256: fileSha256(OUT_MANIFEST_PATH),
    },
    blockers,
    warnings,
    productionBlockers: [
      'CORRECTION_CANDIDATE_LLM_REVIEW_NOT_EXECUTED',
      'CORRECTION_CANDIDATE_DECISIONS_NOT_IMPORTED',
      'MISSING_DECISION_ROWS_REMAIN',
      'NON_ACCEPTED_ROWS_REMAIN',
      'AUDIO_BLOCKED_UNTIL_ALL_ROWS_ACCEPTED',
    ],
    safety: manifest.safety,
    nextRequiredGates: [
      'execute_correction_candidate_llm_trusted_source_review',
      'correction_candidate_decision_schema_gate',
      'correction_candidate_accept_only_import_dry_run_gate',
      'rerun_non_accepted_rows_gate',
      'audio_manifest_gate_after_all_1600_rows_accepted',
    ],
  };
  writeJson(OUT_AUDIT_PATH, audit);
  fs.writeFileSync(OUT_MD_PATH, `${buildMarkdown(audit)}\n`, 'utf8');

  console.log(`${audit.status} ${rel(OUT_AUDIT_PATH)} requests=${requests.length} batches=${batches.length} readyForExternalReview=${summary.readyForExternalReview ? 'yes' : 'no'}`);

  if (blockers.length > 0) {
    throw new Error(`French correction candidate review request generation failed:\n${blockers.join('\n')}`);
  }
}

main();
