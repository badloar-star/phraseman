import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const WORK_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'work_orders');
const FIX_WORK_ORDER_PATH = path.join(WORK_DIR, 'fr_lesson_non_accepted_fix_work_order_v1.json');
const REGEN_QUEUE_PATH = path.join(WORK_DIR, 'fr_lesson_non_accepted_regeneration_queue_v1.jsonl');
const OUT_JSONL = path.join(WORK_DIR, 'fr_lesson_correction_candidate_queue_v1.jsonl');
const OUT_AUDIT = path.join(WORK_DIR, 'fr_lesson_correction_candidate_work_order_audit_v1.json');
const OUT_MD = path.join(WORK_DIR, 'fr_lesson_correction_candidate_work_order_v1.md');

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function sha256Text(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function sha256File(filePath) {
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

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function applyCorrection(candidate, correctionPayload) {
  const patched = cloneJson(candidate);
  const appliedFields = [];

  if (hasText(correctionPayload.correctedTargetText)) {
    patched.targetText = correctionPayload.correctedTargetText;
    appliedFields.push('targetText');
  }

  if (!patched.quiz || typeof patched.quiz !== 'object') patched.quiz = {};
  if (hasText(correctionPayload.correctedQuizBlank)) {
    patched.quiz.blank = correctionPayload.correctedQuizBlank;
    appliedFields.push('quiz.blank');
  }
  if (hasText(correctionPayload.correctedQuizCorrect)) {
    patched.quiz.correct = correctionPayload.correctedQuizCorrect;
    appliedFields.push('quiz.correct');
  }
  if (Array.isArray(correctionPayload.correctedQuizDistractors) && correctionPayload.correctedQuizDistractors.length > 0) {
    patched.quiz.distractors = correctionPayload.correctedQuizDistractors;
    appliedFields.push('quiz.distractors');
  }

  return { patched, appliedFields };
}

function hasMojibake(value) {
  return /(?:Ã|Â|Ð|Ñ|\ufffd)/u.test(JSON.stringify(value));
}

function isFrenchOutputShapeSafe(candidate) {
  return Boolean(
    candidate &&
    typeof candidate.targetText === 'string' &&
    candidate.quiz &&
    typeof candidate.quiz.blank === 'string' &&
    typeof candidate.quiz.correct === 'string' &&
    Array.isArray(candidate.quiz.distractors) &&
    candidate.quiz.distractors.length === 3 &&
    candidate.quiz.distractors.every((item) => typeof item === 'string' && item.trim().length > 0),
  );
}

function buildMarkdown(audit) {
  return [
    '# French Lesson Correction Candidate Work Order',
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Correction candidates: ${audit.summary.correctionCandidateRows}`,
    `- Output shape safe: ${audit.summary.outputShapeSafeRows}`,
    `- Mojibake suspects: ${audit.summary.mojibakeSuspectRows}`,
    `- Ready for import: ${audit.summary.readyForImport ? 'yes' : 'no'}`,
    '',
    '## Rule',
    '',
    'These are isolated repair candidates only. They are not accepted content, not audio input, not server-pack input, and not app bundle content. Every row must be reviewed again by LLM trusted-source gates before import.',
    '',
  ].join('\n');
}

function main() {
  const generatedAt = new Date().toISOString();
  const fixWorkOrder = readJson(FIX_WORK_ORDER_PATH);
  const regenRows = parseJsonl(REGEN_QUEUE_PATH);
  const sourceRowsWithCorrection = regenRows.filter((row) => row.correctionPayload?.hasCorrectionPayload === true);

  const candidates = sourceRowsWithCorrection.map((row) => {
    const before = row.candidate;
    const { patched, appliedFields } = applyCorrection(before, row.correctionPayload);
    return {
      schemaVersion: 'gustav-fr-lesson-correction-candidate-row-v1',
      requestId: row.requestId,
      sourceQueueIndex: row.sourceQueueIndex,
      lessonId: row.lessonId,
      rowNumber: row.rowNumber,
      phraseId: row.phraseId,
      studyTarget: 'fr',
      sourceLocales: ['ru', 'uk'],
      originReviewerDecision: row.reviewerDecision,
      action: row.action,
      appliedFields,
      failedGateIds: row.failedGateIds,
      sourceIdentity: row.sourceIdentity,
      originalCandidate: before,
      correctionPayload: row.correctionPayload,
      candidateAfterCorrection: patched,
      hashes: {
        originalCandidateSha256: sha256Text(JSON.stringify(before)),
        candidateAfterCorrectionSha256: sha256Text(JSON.stringify(patched)),
      },
      validation: {
        hasAppliedCorrection: appliedFields.length > 0,
        outputShapeSafe: isFrenchOutputShapeSafe(patched),
        mojibakeSuspect: hasMojibake(patched),
      },
      requiredNextReview: {
        mustRebuildReviewRequest: true,
        mustRunLlmTrustedSourceReview: true,
        mayImportOnlyAfterAcceptQualityGates: true,
        reviewerImportAllowedNow: false,
        productionApplyAllowedNow: false,
        activationApproved: false,
      },
      safety: {
        isolatedReviewerWorkAreaOnly: true,
        appBundleModified: false,
        generatedFrenchLedgersModified: false,
        audioGenerated: false,
        serverPackModified: false,
        runtimeDownloadsEnabled: false,
        activationApproved: false,
      },
    };
  });

  const outputShapeSafeRows = candidates.filter((row) => row.validation.outputShapeSafe).length;
  const mojibakeSuspectRows = candidates.filter((row) => row.validation.mojibakeSuspect).length;
  const candidateRowsByLesson = candidates.reduce((acc, row) => {
    acc[row.lessonId] = (acc[row.lessonId] || 0) + 1;
    return acc;
  }, {});
  const appliedFieldCounts = candidates.flatMap((row) => row.appliedFields).reduce((acc, field) => {
    acc[field] = (acc[field] || 0) + 1;
    return acc;
  }, {});

  const audit = {
    schemaVersion: 'gustav-fr-lesson-correction-candidate-work-order-audit-v1',
    generatedAt,
    status: 'HOLD_CORRECTION_CANDIDATES_READY_FOR_REVIEW_REQUEST_BUILD',
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    inputs: {
      fixWorkOrder: rel(FIX_WORK_ORDER_PATH),
      regenerationQueue: rel(REGEN_QUEUE_PATH),
    },
    outputs: {
      correctionCandidateQueue: rel(OUT_JSONL),
      audit: rel(OUT_AUDIT),
      markdown: rel(OUT_MD),
    },
    hashes: {
      fixWorkOrderSha256: sha256File(FIX_WORK_ORDER_PATH),
      regenerationQueueSha256: sha256File(REGEN_QUEUE_PATH),
      correctionCandidateQueueSha256: '',
    },
    summary: {
      regenerationRows: fixWorkOrder.summary.regenerationRows,
      correctionPayloadRows: fixWorkOrder.summary.correctionPayloadRows,
      correctionCandidateRows: candidates.length,
      outputShapeSafeRows,
      mojibakeSuspectRows,
      lessonsWithCorrectionCandidates: Object.keys(candidateRowsByLesson).length,
      readyForReviewRequestBuild: candidates.length === fixWorkOrder.summary.correctionPayloadRows && outputShapeSafeRows === candidates.length,
      readyForImport: false,
      readyForAudioManifestGate: false,
      readyForApply: false,
    },
    candidateRowsByLesson,
    appliedFieldCounts,
    firstCandidates: candidates.slice(0, 10),
    productionBlockers: [
      'CORRECTION_CANDIDATES_REQUIRE_FRESH_LLM_TRUSTED_SOURCE_REVIEW',
      'MISSING_DECISION_ROWS_REMAIN',
      'NON_ACCEPTED_ROWS_REMAIN',
      'AUDIO_BLOCKED_UNTIL_ALL_ROWS_ACCEPTED',
    ],
    safety: {
      openAiCallsMadeByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      appBundleModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      audioGeneratedByThisScript: false,
      serverPackManifestModifiedByThisScript: false,
      runtimeDownloadsEnabled: false,
      firebaseOrServerUploadStarted: false,
      activationApproved: false,
    },
    nextRequiredGates: [
      'build_review_requests_for_correction_candidates',
      'run_llm_trusted_source_review_for_correction_candidates',
      'import_only_accept_quality_gates',
      'rerun_non_accepted_rows_gate',
    ],
  };

  writeJsonl(OUT_JSONL, candidates);
  audit.hashes.correctionCandidateQueueSha256 = sha256File(OUT_JSONL);
  writeJson(OUT_AUDIT, audit);
  fs.writeFileSync(OUT_MD, `${buildMarkdown(audit)}\n`, 'utf8');

  console.log(`${audit.status} ${rel(OUT_AUDIT)} candidates=${candidates.length} shapeSafe=${outputShapeSafeRows} mojibakeSuspects=${mojibakeSuspectRows}`);
}

main();
