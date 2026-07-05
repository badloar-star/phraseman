import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const LESSONS_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons');
const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const AUDIT_PATH = path.join(LESSONS_DIR, 'fr_lesson_rebuild_candidate_audit.json');
const QUEUE_JSON_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_queue_v1.json');
const QUEUE_JSONL_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_queue_v1.jsonl');
const QUEUE_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_queue_audit_v1.json');
const LEGACY_DECISION_SCHEMA_PATH =
  'docs/gustav/runs/2026-05-19_fr_inventory_v0a1/generated/fr/reviewer/reviewer_workflow_v2_decision_schema.json';

const EXPECTED_LESSONS = 32;
const EXPECTED_ROWS_PER_LESSON = 50;
const EXPECTED_ROWS = EXPECTED_LESSONS * EXPECTED_ROWS_PER_LESSON;

const REQUIRED_GATE_IDS = [
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

const ALLOWED_REVIEWER_DECISIONS = [
  'accept_quality_gates',
  'needs_regeneration',
  'needs_llm_regeneration_review',
  'reject_candidate',
  'skip_for_later',
];

const MOJIBAKE_RE = /(?:Ãƒ|Ã|Ã‘|ï¿½|Ã¯Â¿Â½|Ã‚|Ã¢â‚¬)/;
const PLACEHOLDER_RE = /\b(?:TODO|TBD|PLACEHOLDER|needs[-_ ]?review)\b/i;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(value) {
  const body = Buffer.isBuffer(value) ? value : Buffer.from(String(value), 'utf8');
  return crypto.createHash('sha256').update(body).digest('hex');
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function gateDecisionMap() {
  return Object.fromEntries(REQUIRED_GATE_IDS.map((gateId) => [gateId, 'unreviewed']));
}

function sourceMeaningHash(row) {
  return sha256(
    JSON.stringify({
      englishBase: row.englishBase,
      ru: row.russianMeaning,
      uk: row.ukrainianMeaning,
      fr: row.proposedFrench,
    }),
  );
}

function buildReviewPriority(row) {
  const category = row.wordsFr?.[0]?.category || '';
  if (/subjunctive|conditionnel|faire_causative|double_pronoun|relative|dont|passe_compose|imparfait/.test(category)) {
    return 'high';
  }
  if (/pronoun|preposition|negative|question|article|adjective/.test(category)) return 'medium';
  return 'normal';
}

function deterministicPrefilter(row) {
  const problems = [];
  const word = row.wordsFr?.[0];
  const textBlob = JSON.stringify(row);
  if (row.studyTarget !== 'fr') problems.push('studyTarget must be fr');
  if (row.targetContentLang !== 'fr') problems.push('targetContentLang must be fr');
  if (row.aiOutputLang !== 'fr') problems.push('aiOutputLang must be fr');
  if (JSON.stringify(row.sourceLocales) !== JSON.stringify(['ru', 'uk'])) problems.push('sourceLocales must be ru,uk');
  if (!row.russianMeaning || !row.ukrainianMeaning || !row.proposedFrench) problems.push('source/target meanings must be present');
  if (!word || !word.text || !word.correct || !Array.isArray(word.distractors)) problems.push('quiz word payload is incomplete');
  if (word && word.distractors.length !== 3) problems.push('quiz must have exactly 3 distractors');
  if (word && word.distractors.includes(word.correct)) problems.push('distractors must not include correct answer');
  if (MOJIBAKE_RE.test(textBlob)) problems.push('mojibake detected');
  if (PLACEHOLDER_RE.test(textBlob)) problems.push('placeholder/review marker detected');
  if (!Array.isArray(row.evidenceClaimIds) || row.evidenceClaimIds.length < 2) problems.push('at least two evidence claim ids are required');
  if (row.activationStatus !== 'blocked') problems.push('row activationStatus must remain blocked');
  return {
    status: problems.length === 0 ? 'PASS' : 'BLOCK',
    problems,
  };
}

function buildQueueRow(row, sourceQueueIndex, ledgerPath) {
  const word = row.wordsFr[0];
  const prefilter = deterministicPrefilter(row);
  const requiredGateIds = [...REQUIRED_GATE_IDS];
  return {
    reviewScope: 'lesson_row',
    sourceQueueIndex,
    batchId: `fr-lesson-${String(row.lessonId).padStart(2, '0')}-review-v1`,
    lessonId: row.lessonId,
    rowNumber: row.rowNumber,
    phraseId: row.phraseId,
    schemaRowId: `fr.lesson.${String(row.lessonId).padStart(2, '0')}.row.${String(row.rowNumber).padStart(2, '0')}.schema.v1`,
    qualityRowId: `fr.lesson.${String(row.lessonId).padStart(2, '0')}.row.${String(row.rowNumber).padStart(2, '0')}.quality.v1`,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    aiOutputLang: 'fr',
    sourceLocaleCoverage: ['ru', 'uk'],
    sourceGraphEnglishBase: row.englishBase,
    sourceMeanings: {
      ru: row.russianMeaning,
      uk: row.ukrainianMeaning,
    },
    candidateTargetText: row.proposedFrench,
    candidateQuiz: {
      blank: word.text,
      correct: word.correct,
      distractors: word.distractors,
      category: word.category,
    },
    lessonLedgerPath: rel(ledgerPath),
    sourceMeaningHash: sourceMeaningHash(row),
    grammarClusterId: word.category,
    secondaryGrammarClusterIds: row.targetConcepts || [],
    requiredTransformationType: word.category,
    researchEvidenceIds: row.evidenceClaimIds,
    sourceEvidence: row.sourceEvidence,
    requiredGateIds,
    gateReviewerDecisions: gateDecisionMap(),
    deterministicPrefilter: prefilter,
    reviewPriority: buildReviewPriority(row),
    reviewerDecision: '',
    correctedTargetText: '',
    correctedQuizBlank: '',
    correctedQuizCorrect: '',
    correctedQuizDistractors: [],
    reviewerNotes: '',
    reviewerName: 'llm_official_source_judge_pending',
    reviewedAt: '',
    currentReviewerStatus: 'needs_quality_review',
    currentActivationStatus: 'blocked',
    reviewerImportAllowed: false,
    productionApplyAllowed: false,
    activationApproved: false,
  };
}

function main() {
  const generatedAt = new Date().toISOString();
  const audit = readJson(AUDIT_PATH);
  const problems = [];
  if (audit.activationApproved !== false) problems.push('lesson rebuild audit activationApproved must be false');
  if (!Array.isArray(audit.ledgers) || audit.ledgers.length !== EXPECTED_LESSONS) problems.push('expected 32 lesson ledgers');
  if (Array.isArray(audit.nextRequiredLedgers) && audit.nextRequiredLedgers.length !== 0) problems.push('nextRequiredLedgers must be empty before review queue');

  const rows = [];
  const batchSummaries = [];
  for (const lessonId of Array.from({ length: EXPECTED_LESSONS }, (_, index) => index + 1)) {
    const ledgerPath = path.join(LESSONS_DIR, `lesson${lessonId}_row_ledger.json`);
    const ledger = readJson(ledgerPath);
    if (ledger.lessonId !== lessonId) problems.push(`lesson ${lessonId} ledger id mismatch`);
    if (ledger.activationApproved !== false || ledger.activeAppSeedAllowed !== false) {
      problems.push(`lesson ${lessonId} activation flags must remain false`);
    }
    if (!Array.isArray(ledger.rows) || ledger.rows.length !== EXPECTED_ROWS_PER_LESSON) {
      problems.push(`lesson ${lessonId} expected 50 rows`);
      continue;
    }
    const firstIndex = rows.length + 1;
    for (const row of ledger.rows) rows.push(buildQueueRow(row, rows.length + 1, ledgerPath));
    batchSummaries.push({
      batchId: `fr-lesson-${String(lessonId).padStart(2, '0')}-review-v1`,
      lessonId,
      queueStartIndex: firstIndex,
      queueEndIndex: rows.length,
      rowCount: rows.length - firstIndex + 1,
      status: 'needs_quality_review',
      activationApproved: false,
    });
  }

  if (rows.length !== EXPECTED_ROWS) problems.push(`expected ${EXPECTED_ROWS} review rows, got ${rows.length}`);
  const blockedPrefilters = rows.filter((row) => row.deterministicPrefilter.status !== 'PASS');
  if (blockedPrefilters.length > 0) problems.push(`${blockedPrefilters.length} rows failed deterministic prefilter`);

  const queue = {
    schemaVersion: 'gustav-fr-lesson-review-queue-v1',
    generatedAt,
    status: problems.length === 0 ? 'HOLD_READY_FOR_LLM_SOURCE_REVIEW' : 'BLOCK',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    readyForLlmOfficialSourceReviewV2: problems.length === 0,
    readyForDecisionImportV2: false,
    readyForGenerationV2: false,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
    reviewerWorkflowSchemaPath: LEGACY_DECISION_SCHEMA_PATH,
    allowedReviewerDecisions: ALLOWED_REVIEWER_DECISIONS,
    requiredGateIds: REQUIRED_GATE_IDS,
    acceptancePolicy: {
      everyRequiredGateMustBeReviewed: true,
      rejectWrongLanguageOutput: true,
      rejectSourceLocaleLeak: true,
      rejectEnglishOrderCopyWithoutFrenchEvidence: true,
      rejectMojibakeOrPlaceholder: true,
      rejectMultipleCorrectQuizAnswers: true,
      rejectUnsupportedGrammarClaim: true,
      acceptedRowsMayNotActivateProduction: true,
    },
    batches: batchSummaries,
    rows,
    safety: {
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  const jsonl = rows.map((row) => JSON.stringify(row)).join('\n') + '\n';
  fs.mkdirSync(REVIEWER_DIR, { recursive: true });
  writeJson(QUEUE_JSON_PATH, queue);
  fs.writeFileSync(QUEUE_JSONL_PATH, jsonl, 'utf8');

  const queueJsonHash = sha256(fs.readFileSync(QUEUE_JSON_PATH));
  const queueJsonlHash = sha256(fs.readFileSync(QUEUE_JSONL_PATH));
  const auditOut = {
    schemaVersion: 'gustav-fr-lesson-review-queue-audit-v1',
    generatedAt,
    status: problems.length === 0 ? 'HOLD' : 'BLOCK',
    activationApproved: false,
    lessonLedgers: EXPECTED_LESSONS,
    reviewRows: rows.length,
    batches: batchSummaries.length,
    rowsPerLesson: EXPECTED_ROWS_PER_LESSON,
    requiredGateCount: REQUIRED_GATE_IDS.length,
    readyForLlmOfficialSourceReviewV2: problems.length === 0,
    readyForDecisionImportV2: false,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
    deterministicPrefilter: {
      passRows: rows.length - blockedPrefilters.length,
      blockRows: blockedPrefilters.length,
    },
    reviewerDecisionState: {
      blankReviewerDecisions: rows.filter((row) => row.reviewerDecision === '').length,
      unreviewedGateDecisionRows: rows.filter((row) => Object.values(row.gateReviewerDecisions).every((value) => value === 'unreviewed')).length,
      importAllowedRows: rows.filter((row) => row.reviewerImportAllowed).length,
      productionApplyAllowedRows: rows.filter((row) => row.productionApplyAllowed).length,
      activationApprovedRows: rows.filter((row) => row.activationApproved).length,
    },
    outputs: {
      queueJson: rel(QUEUE_JSON_PATH),
      queueJsonl: rel(QUEUE_JSONL_PATH),
    },
    hashes: {
      queueJsonSha256: queueJsonHash,
      queueJsonlSha256: queueJsonlHash,
    },
    blockers: problems,
    nextRequiredGates: [
      'llm_official_source_row_review_gate',
      'review_decision_import_dry_run_gate',
      'audio_manifest_gate',
      'server_pack_manifest_gate',
      'runtime_delivery_gate',
      'admin_parity_gate',
      'storage_cloud_isolation_gate',
      'rollback_gate',
      'explicit_activation_approval_gate',
    ],
  };
  writeJson(QUEUE_AUDIT_PATH, auditOut);

  if (problems.length > 0) {
    throw new Error(`French lesson review queue failed:\n${problems.join('\n')}`);
  }
  console.log(`Gustav French lesson review queue: HOLD`);
  console.log(`Rows: ${rows.length}`);
  console.log(`Batches: ${batchSummaries.length}`);
  console.log(`readyForLlmOfficialSourceReviewV2: true`);
  console.log(rel(QUEUE_AUDIT_PATH));
}

main();
