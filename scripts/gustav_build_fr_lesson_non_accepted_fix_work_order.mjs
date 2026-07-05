import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const OUT_DIR = path.join(REVIEWER_DIR, 'work_orders');
const REQUESTS_JSONL_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_requests_v1.jsonl');
const DECISIONS_JSONL_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_decisions_v1.jsonl');
const NON_ACCEPTED_GATE_PATH = path.join(REVIEWER_DIR, 'fr_lesson_non_accepted_rows_gate_audit_v1.json');

const OUT_WORK_ORDER = path.join(OUT_DIR, 'fr_lesson_non_accepted_fix_work_order_v1.json');
const OUT_AUDIT = path.join(OUT_DIR, 'fr_lesson_non_accepted_fix_work_order_audit_v1.json');
const OUT_MD = path.join(OUT_DIR, 'fr_lesson_non_accepted_fix_work_order_v1.md');
const OUT_REGEN_JSONL = path.join(OUT_DIR, 'fr_lesson_non_accepted_regeneration_queue_v1.jsonl');
const OUT_SOURCE_RECHECK_JSONL = path.join(OUT_DIR, 'fr_lesson_non_accepted_source_recheck_queue_v1.jsonl');

const BATCH_SIZE = 25;
const FIXABLE_DECISIONS = new Set(['needs_regeneration', 'needs_llm_regeneration_review']);
const SOURCE_RECHECK_DECISIONS = new Set(['skip_for_later']);

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function sha256(filePath) {
  return fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : '';
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeJsonl(filePath, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''), 'utf8');
}

function hasCorrectionPayload(decision) {
  return Boolean(
    String(decision.correctedTargetText || '').trim() ||
    String(decision.correctedQuizBlank || '').trim() ||
    String(decision.correctedQuizCorrect || '').trim() ||
    (Array.isArray(decision.correctedQuizDistractors) && decision.correctedQuizDistractors.length > 0),
  );
}

function failedGates(decision) {
  return Object.entries(decision.gateReviewerDecisions || {})
    .filter(([, value]) => value === 'fail' || value === 'needs_source_check')
    .map(([gateId, value]) => ({
      gateId,
      decision: value,
      note: decision.gateEvidenceNotes?.[gateId] || '',
    }));
}

function actionFor(decision) {
  if (decision.reviewerDecision === 'needs_llm_regeneration_review' && hasCorrectionPayload(decision)) {
    return 'apply_reviewer_correction_then_re_review';
  }
  if (decision.reviewerDecision === 'needs_llm_regeneration_review') {
    return 'regenerate_from_source_intent_then_re_review';
  }
  if (decision.reviewerDecision === 'needs_regeneration') {
    return 'regenerate_from_source_intent_then_re_review';
  }
  if (decision.reviewerDecision === 'skip_for_later') {
    return 'trusted_source_recheck_then_re_review';
  }
  return 'manual_route_required';
}

function buildQueueRow(decision, request, queueType) {
  const gates = failedGates(decision);
  return {
    schemaVersion: 'gustav-fr-lesson-non-accepted-fix-work-order-row-v1',
    queueType,
    requestId: decision.requestId,
    sourceQueueIndex: decision.sourceQueueIndex,
    lessonId: decision.lessonId,
    rowNumber: request?.rowNumber ?? null,
    phraseId: decision.phraseId,
    reviewerDecision: decision.reviewerDecision,
    action: actionFor(decision),
    failedGates: gates,
    failedGateIds: gates.map((gate) => gate.gateId),
    sourceIdentity: request?.sourceIdentity ?? null,
    candidate: request?.candidate ?? null,
    reviewerNotes: decision.reviewerNotes,
    correctionPayload: {
      correctedTargetText: decision.correctedTargetText || '',
      correctedQuizBlank: decision.correctedQuizBlank || '',
      correctedQuizCorrect: decision.correctedQuizCorrect || '',
      correctedQuizDistractors: decision.correctedQuizDistractors || [],
      hasCorrectionPayload: hasCorrectionPayload(decision),
    },
    requiredAfterFix: [
      'generate_candidate_patch_in_isolated_reviewer_work_area',
      'rebuild_request_for_fixed_row',
      'run_llm_trusted_source_review_again',
      'accept_only_if_all_gates_pass',
    ],
    safety: {
      requestOnly: true,
      appBundleModified: false,
      audioGenerated: false,
      serverPackModified: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
    },
  };
}

function batchRows(rows, type) {
  const batches = [];
  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const slice = rows.slice(offset, offset + BATCH_SIZE);
    const first = slice[0];
    const last = slice[slice.length - 1];
    batches.push({
      batchNumber: batches.length + 1,
      type,
      startIndex: first?.sourceQueueIndex ?? null,
      endIndex: last?.sourceQueueIndex ?? null,
      rowCount: slice.length,
      lessonRange: [
        Math.min(...slice.map((row) => row.lessonId)),
        Math.max(...slice.map((row) => row.lessonId)),
      ],
      firstRequestId: first?.requestId ?? null,
      lastRequestId: last?.requestId ?? null,
      outputQueue: type === 'regeneration' ? rel(OUT_REGEN_JSONL) : rel(OUT_SOURCE_RECHECK_JSONL),
    });
  }
  return batches;
}

function countBy(rows, fn) {
  return rows.reduce((acc, row) => {
    const key = fn(row);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function buildMarkdown(workOrder) {
  return [
    '# French Lesson Non-Accepted Fix Work Order',
    '',
    `Status: \`${workOrder.status}\``,
    '',
    `Generated at: ${workOrder.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Decisions: ${workOrder.summary.decisionRows}/1600`,
    `- Non-accepted rows known now: ${workOrder.summary.nonAcceptedRows}`,
    `- Regeneration/fix rows: ${workOrder.summary.regenerationRows}`,
    `- Source recheck rows: ${workOrder.summary.sourceRecheckRows}`,
    `- Regeneration batches: ${workOrder.summary.regenerationBatches}`,
    `- Source recheck batches: ${workOrder.summary.sourceRecheckBatches}`,
    `- Ready for audio: ${workOrder.summary.readyForAudioManifestGate ? 'yes' : 'no'}`,
    '',
    '## Rule',
    '',
    'These rows are not production content. They are reviewer work orders only. Any fixed row must be reviewed again by the LLM trusted-source gate before it can be imported or used for audio/server/runtime.',
    '',
    '## Outputs',
    '',
    `- Regeneration queue: \`${workOrder.outputs.regenerationQueue}\``,
    `- Source recheck queue: \`${workOrder.outputs.sourceRecheckQueue}\``,
    '',
  ].join('\n');
}

function main() {
  const generatedAt = new Date().toISOString();
  const requests = parseJsonl(REQUESTS_JSONL_PATH);
  const decisions = parseJsonl(DECISIONS_JSONL_PATH);
  const nonAcceptedGate = readJson(NON_ACCEPTED_GATE_PATH);
  const requestById = new Map(requests.map((request) => [request.requestId, request]));
  const nonAcceptedDecisions = decisions.filter((decision) =>
    FIXABLE_DECISIONS.has(decision.reviewerDecision) || SOURCE_RECHECK_DECISIONS.has(decision.reviewerDecision));

  const regenerationRows = nonAcceptedDecisions
    .filter((decision) => FIXABLE_DECISIONS.has(decision.reviewerDecision))
    .map((decision) => buildQueueRow(decision, requestById.get(decision.requestId), 'regeneration'));
  const sourceRecheckRows = nonAcceptedDecisions
    .filter((decision) => SOURCE_RECHECK_DECISIONS.has(decision.reviewerDecision))
    .map((decision) => buildQueueRow(decision, requestById.get(decision.requestId), 'source_recheck'));
  const correctionRows = regenerationRows.filter((row) => row.correctionPayload.hasCorrectionPayload);
  const regenerationBatches = batchRows(regenerationRows, 'regeneration');
  const sourceRecheckBatches = batchRows(sourceRecheckRows, 'source_recheck');

  const workOrder = {
    schemaVersion: 'gustav-fr-lesson-non-accepted-fix-work-order-v1',
    generatedAt,
    status: 'HOLD_NON_ACCEPTED_FIX_WORK_ORDER_READY',
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    inputs: {
      requestsJsonl: rel(REQUESTS_JSONL_PATH),
      decisionsJsonl: rel(DECISIONS_JSONL_PATH),
      nonAcceptedGate: rel(NON_ACCEPTED_GATE_PATH),
    },
    outputs: {
      workOrder: rel(OUT_WORK_ORDER),
      audit: rel(OUT_AUDIT),
      markdown: rel(OUT_MD),
      regenerationQueue: rel(OUT_REGEN_JSONL),
      sourceRecheckQueue: rel(OUT_SOURCE_RECHECK_JSONL),
    },
    summary: {
      requestRows: requests.length,
      decisionRows: decisions.length,
      nonAcceptedRows: nonAcceptedGate.summary.nonAcceptedRows,
      regenerationRows: regenerationRows.length,
      sourceRecheckRows: sourceRecheckRows.length,
      correctionPayloadRows: correctionRows.length,
      noCorrectionRegenerationRows: regenerationRows.length - correctionRows.length,
      regenerationBatches: regenerationBatches.length,
      sourceRecheckBatches: sourceRecheckBatches.length,
      firstRegenerationSourceQueueIndex: regenerationRows[0]?.sourceQueueIndex ?? null,
      firstSourceRecheckSourceQueueIndex: sourceRecheckRows[0]?.sourceQueueIndex ?? null,
      readyForAudioManifestGate: false,
      readyForApply: false,
    },
    decisionCounts: countBy(nonAcceptedDecisions, (row) => row.reviewerDecision),
    failedGateCounts: countBy([...regenerationRows, ...sourceRecheckRows].flatMap((row) => row.failedGateIds), (gateId) => gateId),
    batches: {
      regeneration: regenerationBatches,
      sourceRecheck: sourceRecheckBatches,
    },
    firstRows: {
      regeneration: regenerationRows.slice(0, 10),
      sourceRecheck: sourceRecheckRows.slice(0, 10),
    },
    requiredSequence: [
      'complete_missing_llm_review_decisions_first',
      'materialize_fix_candidates_only_in_reviewer_work_area',
      'rebuild_llm_review_requests_for_fixed_rows',
      'rerun_llm_trusted_source_review',
      'import_only_rows_with_accept_quality_gates',
      'rerun_non_accepted_rows_gate_until_zero',
    ],
    safety: {
      openAiCallsMadeByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      fixedFrenchRowsGeneratedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      adminUiModifiedByThisScript: false,
      audioGeneratedByThisScript: false,
      serverPackManifestModifiedByThisScript: false,
      runtimeDownloadsEnabled: false,
      firebaseOrServerUploadStarted: false,
      activationApproved: false,
    },
  };

  const audit = {
    schemaVersion: 'gustav-fr-lesson-non-accepted-fix-work-order-audit-v1',
    generatedAt,
    status: workOrder.status,
    activationApproved: false,
    hashes: {
      requestsJsonlSha256: sha256(REQUESTS_JSONL_PATH),
      decisionsJsonlSha256: sha256(DECISIONS_JSONL_PATH),
      nonAcceptedGateSha256: sha256(NON_ACCEPTED_GATE_PATH),
      regenerationQueueSha256: '',
      sourceRecheckQueueSha256: '',
    },
    summary: workOrder.summary,
    outputs: workOrder.outputs,
    productionBlockers: [
      'FIX_WORK_ORDER_IS_NOT_FIXED_CONTENT',
      'MISSING_DECISION_ROWS_REMAIN',
      'FIXED_ROWS_REQUIRE_FRESH_LLM_TRUSTED_SOURCE_REVIEW',
      'AUDIO_BLOCKED_UNTIL_ALL_ROWS_ACCEPTED',
    ],
    safety: workOrder.safety,
  };

  writeJsonl(OUT_REGEN_JSONL, regenerationRows);
  writeJsonl(OUT_SOURCE_RECHECK_JSONL, sourceRecheckRows);
  audit.hashes.regenerationQueueSha256 = sha256(OUT_REGEN_JSONL);
  audit.hashes.sourceRecheckQueueSha256 = sha256(OUT_SOURCE_RECHECK_JSONL);
  writeJson(OUT_WORK_ORDER, workOrder);
  writeJson(OUT_AUDIT, audit);
  fs.writeFileSync(OUT_MD, `${buildMarkdown(workOrder)}\n`, 'utf8');

  console.log(`${workOrder.status} ${rel(OUT_WORK_ORDER)} regeneration=${regenerationRows.length} sourceRecheck=${sourceRecheckRows.length}`);
}

main();
