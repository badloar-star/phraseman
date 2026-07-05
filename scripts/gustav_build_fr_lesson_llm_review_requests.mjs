import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const TRUSTED_SOURCES_PATH = path.join(ROOT, 'docs', 'gustav', 'trusted_sources', 'fr_trusted_sources.json');
const QUEUE_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_queue_v1.json');
const QUEUE_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_queue_audit_v1.json');
const REQUESTS_JSONL_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_requests_v1.jsonl');
const REQUESTS_MANIFEST_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_requests_manifest_v1.json');
const REQUESTS_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_requests_audit_v1.json');

const EXPECTED_ROWS = 1600;
const EXPECTED_BATCHES = 32;

const GATE_DECISIONS = ['pass', 'fail', 'needs_source_check'];
const ROW_DECISIONS = [
  'accept_quality_gates',
  'needs_regeneration',
  'needs_llm_regeneration_review',
  'reject_candidate',
  'skip_for_later',
];

const GATE_RUBRICS = {
  language_field_isolation_gate:
    'Verify studyTarget, targetContentLang and aiOutputLang are French; sourceLocale fields stay RU/UK only and no UI/source language leaks into French target fields.',
  source_locale_coverage_gate:
    'Verify both RU and UK source meanings are present and are used only as meaning support, not as French output.',
  official_source_evidence_gate:
    'Verify the grammar, vocabulary, register or CEFR claim is backed by the cited trusted source ids; if the cited ids are not enough, mark needs_source_check.',
  target_sequence_fit_gate:
    'Verify this item fits the French lesson sequence, CEFR level and grammar cluster instead of copying English lesson order blindly.',
  anti_calque_gate:
    'Check that the French is idiomatic and not a literal calque from English/Russian/Ukrainian when French requires another construction.',
  grammar_cluster_gate:
    'Check the candidate, blank, correct answer and distractors match the declared French grammar/vocabulary cluster.',
  naturalness_register_gate:
    'Check spelling, accents, elision, punctuation, politeness/register and common French usage.',
  source_meaning_parity_gate:
    'Check the French candidate preserves the intended meaning of the English base and RU/UK source meanings without adding or dropping content.',
  quiz_one_correct_answer_gate:
    'Check exactly one quiz answer is correct and the blank can only be completed by the declared correct answer.',
  distractor_quality_gate:
    'Check distractors are plausible, same broad part of speech/register where appropriate, but not synonyms or alternate correct answers.',
  no_mojibake_or_placeholder_gate:
    'Check there are no placeholders, needs-review markers, broken encoding, missing accents caused by mojibake or malformed text.',
};

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

function fileSha256(filePath) {
  return sha256(fs.readFileSync(filePath));
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function blankGateMap(gateIds) {
  return Object.fromEntries(gateIds.map((gateId) => [gateId, '']));
}

function blankGateNotes(gateIds) {
  return Object.fromEntries(gateIds.map((gateId) => [gateId, '']));
}

function selectTrustedSources(row, sourceById) {
  return row.researchEvidenceIds.map((sourceId) => {
    const source = sourceById.get(sourceId);
    return source
      ? {
          id: source.id,
          title: source.title,
          url: source.url,
          sourceType: source.sourceType,
          trustTier: source.trustTier,
          covers: source.covers,
          allowedUses: source.allowedUses,
        }
      : {
          id: sourceId,
          missingFromTrustedSourceLibrary: true,
        };
  });
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

function buildOutputSchema(row) {
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
      requestId: constString(`fr.lesson.${String(row.lessonId).padStart(2, '0')}.row.${String(row.rowNumber).padStart(2, '0')}.llm_review_request.v1`),
      reviewScope: constString('lesson_row'),
      sourceQueueIndex: constInteger(row.sourceQueueIndex),
      batchId: constString(row.batchId),
      lessonId: constInteger(row.lessonId),
      phraseId: constString(row.phraseId),
      studyTarget: constString('fr'),
      sourceLocaleCoverage: constStringArray(['ru', 'uk']),
      reviewerDecision: enumString(ROW_DECISIONS),
      gateReviewerDecisions: {
        type: 'object',
        required: row.requiredGateIds,
        additionalProperties: false,
        properties: Object.fromEntries(row.requiredGateIds.map((gateId) => [gateId, enumString(GATE_DECISIONS)])),
      },
      gateEvidenceNotes: {
        type: 'object',
        required: row.requiredGateIds,
        additionalProperties: false,
        properties: Object.fromEntries(row.requiredGateIds.map((gateId) => [gateId, { type: 'string', minLength: 1 }])),
      },
      reviewerNotes: { type: 'string', minLength: 1 },
      reviewerName: constString('llm_official_source_judge'),
      reviewedAt: { type: 'string', minLength: 1 },
      correctedTargetText: { type: 'string', description: 'Use an empty string unless reviewerDecision is needs_llm_regeneration_review.' },
      correctedQuizBlank: { type: 'string', description: 'Use an empty string unless reviewerDecision is needs_llm_regeneration_review.' },
      correctedQuizCorrect: { type: 'string', description: 'Use an empty string unless reviewerDecision is needs_llm_regeneration_review.' },
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

function buildRequest(row, sourceById, queueHash) {
  const requestId = `fr.lesson.${String(row.lessonId).padStart(2, '0')}.row.${String(row.rowNumber).padStart(2, '0')}.llm_review_request.v1`;
  const trustedSources = selectTrustedSources(row, sourceById);
  return {
    schemaVersion: 'gustav-fr-lesson-llm-official-source-review-request-v1',
    requestId,
    reviewScope: 'lesson_row',
    sourceQueueIndex: row.sourceQueueIndex,
    batchId: row.batchId,
    lessonId: row.lessonId,
    rowNumber: row.rowNumber,
    phraseId: row.phraseId,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    aiOutputLang: 'fr',
    sourceLocaleCoverage: ['ru', 'uk'],
    reviewPriority: row.reviewPriority,
    sourceQueueSha256: queueHash,
    sourceIdentity: {
      schemaRowId: row.schemaRowId,
      qualityRowId: row.qualityRowId,
      sourceMeaningHash: row.sourceMeaningHash,
      lessonLedgerPath: row.lessonLedgerPath,
    },
    candidate: {
      sourceGraphEnglishBase: row.sourceGraphEnglishBase,
      sourceMeanings: row.sourceMeanings,
      targetText: row.candidateTargetText,
      quiz: row.candidateQuiz,
      grammarClusterId: row.grammarClusterId,
      secondaryGrammarClusterIds: row.secondaryGrammarClusterIds,
      requiredTransformationType: row.requiredTransformationType,
    },
    trustedSourceContext: {
      requiredEvidenceIds: row.researchEvidenceIds,
      sourceEvidenceClaims: row.sourceEvidence,
      trustedSources,
      policy: {
        officialOrTrustedEvidenceRequired: true,
        mayUseUnofficialSourcesForApproval: false,
        ifEvidenceInsufficientUseGateDecision: 'needs_source_check',
        citeSourceIdsInGateEvidenceNotes: true,
      },
    },
    instructions: {
      role: 'You are the LLM official-source judge replacing human review for PhraseMan French lesson content.',
      reasoningLevel: 'deep',
      task: 'Review exactly this one French lesson row against trusted sources and PhraseMan language-isolation rules. Do not review neighboring rows.',
      hardRules: [
        'Do not auto-accept.',
        'Do not use the English base as permission to copy English grammar order into French.',
        'Do not approve if French target text, quiz blank, correct answer or distractors mix languages or source locales.',
        'Do not approve if any required gate is unverified.',
        'Do not approve using unofficial sources; mark needs_source_check when trusted evidence is insufficient.',
        'Return only JSON matching outputJsonSchema.',
        'If reviewerDecision=accept_quality_gates, every gateReviewerDecisions value must be pass and all corrected* fields must be empty strings, except correctedQuizDistractors must be an empty array.',
        'If reviewerDecision is not accept_quality_gates, at least one gateReviewerDecisions value must be fail or needs_source_check.',
        'Only reviewerDecision=needs_llm_regeneration_review may include corrected* fields, and then at least one corrected field must be non-empty.',
        'If reviewerDecision=skip_for_later, at least one gateReviewerDecisions value must be needs_source_check.',
        'Keep reviewerImportAllowed=false, productionApplyAllowed=false and activationApproved=false for every result.',
      ],
      gateRubrics: Object.fromEntries(row.requiredGateIds.map((gateId) => [gateId, GATE_RUBRICS[gateId] || 'Review this gate using the row context and trusted source evidence.'])),
      decisionPolicy: {
        accept_quality_gates: 'Use only when all gates are pass and no correction is needed.',
        needs_regeneration: 'Use when the row is wrong enough that Gustav must regenerate it from source intent.',
        needs_llm_regeneration_review: 'Use when a corrected target/quiz can be proposed but must be reviewed again before import.',
        reject_candidate: 'Use when the row is unsafe, incoherent, not French, or cannot be fixed from the provided context.',
        skip_for_later: 'Use only when the row cannot be judged from the available trusted evidence in this pass.',
      },
    },
    outputJsonSchema: buildOutputSchema(row),
    blankResponseTemplate: {
      schemaVersion: 'gustav-fr-lesson-llm-official-source-review-decision-v1',
      requestId,
      reviewScope: 'lesson_row',
      sourceQueueIndex: row.sourceQueueIndex,
      batchId: row.batchId,
      lessonId: row.lessonId,
      phraseId: row.phraseId,
      studyTarget: 'fr',
      sourceLocaleCoverage: ['ru', 'uk'],
      reviewerDecision: '',
      gateReviewerDecisions: blankGateMap(row.requiredGateIds),
      gateEvidenceNotes: blankGateNotes(row.requiredGateIds),
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
    },
    safety: {
      requestOnly: true,
      llmDecisionAlreadyFilled: false,
      reviewerDecisionsImportedByThisRequest: false,
      appBundleModifiedByThisRequest: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
    },
  };
}

function main() {
  const generatedAt = new Date().toISOString();
  const queue = readJson(QUEUE_PATH);
  const queueAudit = readJson(QUEUE_AUDIT_PATH);
  const trustedLibrary = readJson(TRUSTED_SOURCES_PATH);
  const sourceById = new Map(trustedLibrary.sources.map((source) => [source.id, source]));
  const blockers = [];
  const warnings = [];

  if (queue.schemaVersion !== 'gustav-fr-lesson-review-queue-v1') blockers.push('review queue schemaVersion mismatch');
  if (queue.activationApproved !== false || queue.readyForApply !== false || queue.mayModifyProductionAppFiles !== false) {
    blockers.push('review queue safety flags must remain closed');
  }
  if (!queue.readyForLlmOfficialSourceReviewV2) blockers.push('review queue is not ready for LLM official-source review requests');
  if (queueAudit.status !== 'HOLD' || queueAudit.reviewRows !== EXPECTED_ROWS) blockers.push('review queue audit must be HOLD with 1600 rows');
  if (!Array.isArray(queue.rows) || queue.rows.length !== EXPECTED_ROWS) blockers.push(`expected ${EXPECTED_ROWS} queue rows`);
  if (!Array.isArray(queue.batches) || queue.batches.length !== EXPECTED_BATCHES) blockers.push(`expected ${EXPECTED_BATCHES} queue batches`);

  const queueHash = fileSha256(QUEUE_PATH);
  const requests = queue.rows.map((row) => buildRequest(row, sourceById, queueHash));
  const missingTrustedSourceRows = requests.filter((request) =>
    request.trustedSourceContext.trustedSources.some((source) => source.missingFromTrustedSourceLibrary),
  );
  if (missingTrustedSourceRows.length > 0) blockers.push(`${missingTrustedSourceRows.length} requests reference unknown trusted source ids`);

  const blankDecisionRows = requests.filter((request) => request.blankResponseTemplate.reviewerDecision === '').length;
  const openedApplyRows = requests.filter((request) =>
    request.blankResponseTemplate.reviewerImportAllowed ||
    request.blankResponseTemplate.productionApplyAllowed ||
    request.blankResponseTemplate.activationApproved ||
    request.safety.activationApproved,
  ).length;
  if (blankDecisionRows !== EXPECTED_ROWS) blockers.push('every request must keep the blank response template undecided');
  if (openedApplyRows > 0) blockers.push(`${openedApplyRows} requests opened import/apply/activation flags`);

  const missingGateRubricRows = requests.filter((request) =>
    queue.requiredGateIds.some((gateId) => !request.instructions.gateRubrics[gateId]),
  ).length;
  if (missingGateRubricRows > 0) blockers.push(`${missingGateRubricRows} requests are missing gate rubrics`);

  const priorityCounts = requests.reduce((acc, request) => {
    acc[request.reviewPriority] = (acc[request.reviewPriority] || 0) + 1;
    return acc;
  }, {});
  const reasoningCounts = requests.reduce((acc, request) => {
    acc[request.instructions.reasoningLevel] = (acc[request.instructions.reasoningLevel] || 0) + 1;
    return acc;
  }, {});
  if ((reasoningCounts.deep || 0) !== EXPECTED_ROWS || Object.keys(reasoningCounts).some((level) => level !== 'deep')) {
    blockers.push('all French production LLM review requests must use deep reasoning');
  }

  fs.mkdirSync(REVIEWER_DIR, { recursive: true });
  fs.writeFileSync(REQUESTS_JSONL_PATH, `${requests.map((request) => JSON.stringify(request)).join('\n')}\n`, 'utf8');

  const manifest = {
    schemaVersion: 'gustav-fr-lesson-llm-review-requests-manifest-v1',
    generatedAt,
    status: blockers.length === 0 ? 'HOLD_READY_FOR_LLM_EXECUTION' : 'BLOCK',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    requestRows: requests.length,
    batches: queue.batches.length,
    rowDecisionAllowedValues: ROW_DECISIONS,
    gateDecisionAllowedValues: GATE_DECISIONS,
    requiredGateIds: queue.requiredGateIds,
    priorityCounts,
    reasoningCounts,
    trustedSourceLibrary: rel(TRUSTED_SOURCES_PATH),
    sourceQueue: rel(QUEUE_PATH),
    sourceQueueAudit: rel(QUEUE_AUDIT_PATH),
    outputs: {
      requestsJsonl: rel(REQUESTS_JSONL_PATH),
      audit: rel(REQUESTS_AUDIT_PATH),
    },
    hashes: {
      sourceQueueSha256: queueHash,
      trustedSourcesSha256: fileSha256(TRUSTED_SOURCES_PATH),
      requestsJsonlSha256: fileSha256(REQUESTS_JSONL_PATH),
    },
    safety: {
      requestOnly: true,
      llmApiCalledByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };
  writeJson(REQUESTS_MANIFEST_PATH, manifest);

  const audit = {
    schemaVersion: 'gustav-fr-lesson-llm-review-requests-audit-v1',
    generatedAt,
    status: blockers.length === 0 ? 'HOLD' : 'BLOCK',
    activationApproved: false,
    requestRows: requests.length,
    batches: queue.batches.length,
    requiredGateCount: queue.requiredGateIds.length,
    blankResponseTemplateRows: blankDecisionRows,
    openedImportApplyActivationRows: openedApplyRows,
    missingTrustedSourceRows: missingTrustedSourceRows.length,
    missingGateRubricRows,
    priorityCounts,
    reasoningCounts,
    readyForLlmOfficialSourceExecution: blockers.length === 0,
    readyForDecisionImportV2: false,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
    outputs: {
      requestsJsonl: rel(REQUESTS_JSONL_PATH),
      manifest: rel(REQUESTS_MANIFEST_PATH),
    },
    hashes: {
      sourceQueueSha256: queueHash,
      requestsJsonlSha256: fileSha256(REQUESTS_JSONL_PATH),
      manifestSha256: fileSha256(REQUESTS_MANIFEST_PATH),
    },
    blockers,
    warnings,
    nextRequiredGates: [
      'execute_llm_official_source_review_requests',
      'llm_review_decision_schema_gate',
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
  writeJson(REQUESTS_AUDIT_PATH, audit);

  console.log(`Gustav French lesson LLM review requests: ${audit.status}`);
  console.log(`Requests: ${audit.requestRows}`);
  console.log(`Batches: ${audit.batches}`);
  console.log(`Ready for LLM official-source execution: ${audit.readyForLlmOfficialSourceExecution ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${audit.readyForApply ? 'yes' : 'no'}`);
  console.log(rel(REQUESTS_AUDIT_PATH));

  if (blockers.length > 0) {
    throw new Error(`French lesson LLM review request generation failed:\n${blockers.join('\n')}`);
  }
}

main();
