import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'personal_practice');
const TAXONOMY_PATH = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_candidate_v1.json');
const TAXONOMY_AUDIT_PATH = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_candidate_gate_v1.json');
const OUT_REQUESTS = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_review_requests_v1.jsonl');
const OUT_AUDIT = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_review_requests_audit_v1.json');
const OUT_MD = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_review_requests_v1.md');
const FUTURE_DECISIONS = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_review_decisions_v1.jsonl');

const EXPECTED_ROWS = 56;
const GATES = [
  'language_field_isolation_gate',
  'source_locale_coverage_gate',
  'official_source_evidence_gate',
  'native_bank_link_gate',
  'french_mistake_family_fit_gate',
  'prompt_id_ru_uk_separation_gate',
  'no_english_taxonomy_copy_gate',
  'problem_coach_feedback_contract_gate',
  'no_runtime_apply_gate',
  'no_placeholder_or_mojibake_gate',
];
const GATE_DECISIONS = ['pass', 'fail', 'needs_source_check'];
const REVIEWER_DECISIONS = ['accept_quality_gates', 'needs_regeneration', 'needs_llm_regeneration_review', 'reject_candidate', 'skip_for_later'];

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeJsonl(filePath, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''), 'utf8');
}

function sha256(filePath) {
  return fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : '';
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

function buildOutputSchema(requestId, row) {
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'schemaVersion',
      'requestId',
      'reviewScope',
      'sourceQueueIndex',
      'frenchTrainingId',
      'mistakeId',
      'studyTarget',
      'sourceLocaleCoverage',
      'reviewerDecision',
      'gateReviewerDecisions',
      'gateEvidenceNotes',
      'reviewerNotes',
      'reviewerName',
      'reviewedAt',
      'correctedMistakeId',
      'correctedPromptIds',
      'correctedMistakeFamily',
      'reviewerImportAllowed',
      'productionApplyAllowed',
      'activationApproved',
    ],
    properties: {
      schemaVersion: constString('gustav-fr-personal-practice-mistake-taxonomy-review-decision-v1'),
      requestId: constString(requestId),
      reviewScope: constString('personal_practice_mistake_taxonomy_row'),
      sourceQueueIndex: constInteger(row.taxonomyIndex),
      frenchTrainingId: constString(row.frenchTrainingId),
      mistakeId: constString(row.mistakeId),
      studyTarget: constString('fr'),
      sourceLocaleCoverage: {
        type: 'array',
        minItems: 2,
        maxItems: 2,
        items: { type: 'string', enum: ['ru', 'uk'] },
      },
      reviewerDecision: { type: 'string', enum: REVIEWER_DECISIONS },
      gateReviewerDecisions: {
        type: 'object',
        required: GATES,
        additionalProperties: false,
        properties: Object.fromEntries(GATES.map((gate) => [gate, { type: 'string', enum: GATE_DECISIONS }])),
      },
      gateEvidenceNotes: {
        type: 'object',
        required: GATES,
        additionalProperties: false,
        properties: Object.fromEntries(GATES.map((gate) => [gate, { type: 'string', minLength: 1 }])),
      },
      reviewerNotes: { type: 'string', minLength: 1 },
      reviewerName: constString('llm_official_source_judge'),
      reviewedAt: { type: 'string', minLength: 1 },
      correctedMistakeId: { type: 'string', description: 'Use empty string unless reviewerDecision is needs_llm_regeneration_review.' },
      correctedPromptIds: { type: 'array', items: { type: 'string' }, description: 'Use empty array unless reviewerDecision is needs_llm_regeneration_review.' },
      correctedMistakeFamily: { type: 'string', description: 'Use empty string unless reviewerDecision is needs_llm_regeneration_review.' },
      reviewerImportAllowed: constBoolean(false),
      productionApplyAllowed: constBoolean(false),
      activationApproved: constBoolean(false),
    },
  };
}

function blankResponse(requestId, row) {
  return {
    schemaVersion: 'gustav-fr-personal-practice-mistake-taxonomy-review-decision-v1',
    requestId,
    reviewScope: 'personal_practice_mistake_taxonomy_row',
    sourceQueueIndex: row.taxonomyIndex,
    frenchTrainingId: row.frenchTrainingId,
    mistakeId: row.mistakeId,
    studyTarget: 'fr',
    sourceLocaleCoverage: ['ru', 'uk'],
    reviewerDecision: '',
    gateReviewerDecisions: Object.fromEntries(GATES.map((gate) => [gate, ''])),
    gateEvidenceNotes: Object.fromEntries(GATES.map((gate) => [gate, ''])),
    reviewerNotes: '',
    reviewerName: 'llm_official_source_judge',
    reviewedAt: '',
    correctedMistakeId: '',
    correctedPromptIds: [],
    correctedMistakeFamily: '',
    reviewerImportAllowed: false,
    productionApplyAllowed: false,
    activationApproved: false,
  };
}

function buildRequest(row, taxonomyHash) {
  const requestId = `fr.personal_practice.mistake_taxonomy.${String(row.taxonomyIndex).padStart(2, '0')}.review_request.v1`;
  return {
    schemaVersion: 'gustav-fr-personal-practice-mistake-taxonomy-review-request-v1',
    requestId,
    reviewScope: 'personal_practice_mistake_taxonomy_row',
    sourceQueueIndex: row.taxonomyIndex,
    frenchTrainingId: row.frenchTrainingId,
    sourceEnglishTrainingId: row.sourceEnglishTrainingId,
    mistakeId: row.mistakeId,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    aiOutputLang: 'fr',
    sourceLocaleCoverage: ['ru', 'uk'],
    sourceQueueSha256: taxonomyHash,
    candidate: row,
    trustedSourceContext: {
      requiredEvidenceIds: row.sourceEvidenceIds,
      policy: {
        officialOrTrustedEvidenceRequired: true,
        mayUseUnofficialSourcesForApproval: false,
        citeSourceIdsInGateEvidenceNotes: true,
      },
    },
    instructions: {
      role: 'You are the LLM official-source judge replacing human review for PhraseMan French personal-practice mistake taxonomy.',
      reasoningLevel: 'deep',
      task: 'Review exactly this one French mistake-taxonomy candidate row. Verify the mistake id, family, RU/UK prompt separation and feedback contract are French-native and safe for problem coach import later.',
      hardRules: [
        'Do not auto-accept.',
        'Do not approve if the English diagnosis id is reused as French mistake taxonomy.',
        'Do not approve if the row can return English, Russian or Ukrainian as a target answer.',
        'Do not approve if RU and UK learner explanation prompts are merged or ambiguous.',
        'Do not approve without trusted source ids in gate evidence notes.',
        'Return only JSON matching outputJsonSchema.',
        'Keep reviewerImportAllowed=false, productionApplyAllowed=false and activationApproved=false.',
      ],
      gateRubrics: {
        language_field_isolation_gate: 'studyTarget, targetContentLang and aiOutputLang must be fr; source locales only ru/uk.',
        source_locale_coverage_gate: 'RU and UK explanation contracts must both be represented and separated.',
        official_source_evidence_gate: 'The French mistake focus must cite trusted source ids supplied in requiredEvidenceIds.',
        native_bank_link_gate: 'The row must link back to exactly one French-native bank slot.',
        french_mistake_family_fit_gate: 'The mistake family must match the French skill, not the English category blindly.',
        prompt_id_ru_uk_separation_gate: 'Prompt ids must have separate RU and UK contracts for the same French target skill.',
        no_english_taxonomy_copy_gate: 'English ids may define shape only; they cannot be accepted as French mistake ids or content.',
        problem_coach_feedback_contract_gate: 'Problem coach may explain in RU/UK but target answers and examples must remain French.',
        no_runtime_apply_gate: 'No import/runtime/apply/activation flag may be opened.',
        no_placeholder_or_mojibake_gate: 'No placeholder, mojibake, broken accent, or needs-review text may appear as accepted content.',
      },
    },
    outputJsonSchema: buildOutputSchema(requestId, row),
    blankResponseTemplate: blankResponse(requestId, row),
    safety: {
      requestOnly: true,
      llmDecisionAlreadyFilled: false,
      reviewerDecisionsImportedByThisRequest: false,
      appBundleModifiedByThisRequest: false,
      serverUploadStarted: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
    },
  };
}

function main() {
  const generatedAt = new Date().toISOString();
  const taxonomy = readJson(TAXONOMY_PATH);
  const taxonomyAudit = readJson(TAXONOMY_AUDIT_PATH);
  const blockers = [];

  if (taxonomy.status !== 'HOLD_CANDIDATE_READY_FOR_LLM_TRUSTED_SOURCE_REVIEW') blockers.push('TAXONOMY_CANDIDATE_NOT_READY');
  if (taxonomyAudit.summary?.readyForLlmTrustedSourceReview !== true) blockers.push('TAXONOMY_GATE_NOT_READY_FOR_REVIEW');
  if (!Array.isArray(taxonomy.rows) || taxonomy.rows.length !== EXPECTED_ROWS) blockers.push('TAXONOMY_ROW_COUNT_INVALID');

  const taxonomyHash = sha256(TAXONOMY_PATH);
  const requests = (taxonomy.rows ?? []).map((row) => buildRequest(row, taxonomyHash));
  const duplicateRequestIds = requests.length - new Set(requests.map((request) => request.requestId)).size;
  const unsafeRows = requests.filter((request) =>
    request.blankResponseTemplate.reviewerImportAllowed ||
    request.blankResponseTemplate.productionApplyAllowed ||
    request.blankResponseTemplate.activationApproved ||
    request.safety.activationApproved,
  ).length;
  const deepReasoningRows = requests.filter((request) => request.instructions.reasoningLevel === 'deep').length;
  const sourceSafeRows = requests.filter((request) =>
    request.studyTarget === 'fr' &&
    request.targetContentLang === 'fr' &&
    request.aiOutputLang === 'fr' &&
    JSON.stringify(request.sourceLocaleCoverage) === JSON.stringify(['ru', 'uk']),
  ).length;

  if (duplicateRequestIds > 0) blockers.push('DUPLICATE_REVIEW_REQUEST_IDS');
  if (unsafeRows > 0) blockers.push('REQUESTS_OPENED_UNSAFE_FLAGS');
  if (deepReasoningRows !== requests.length) blockers.push('REQUESTS_NOT_DEEP_REASONING');
  if (sourceSafeRows !== requests.length) blockers.push('REQUESTS_LANGUAGE_ISOLATION_NOT_SAFE');

  writeJsonl(OUT_REQUESTS, requests);
  const audit = {
    schemaVersion: 'gustav-fr-personal-practice-mistake-taxonomy-review-requests-audit-v1',
    generatedAt,
    status: blockers.length === 0 ? 'HOLD_READY_FOR_LLM_TRUSTED_SOURCE_REVIEW' : 'BLOCK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    inputs: {
      mistakeTaxonomyCandidate: rel(TAXONOMY_PATH),
      mistakeTaxonomyCandidateGate: rel(TAXONOMY_AUDIT_PATH),
    },
    outputs: {
      requestsJsonl: rel(OUT_REQUESTS),
      futureDecisionsJsonl: rel(FUTURE_DECISIONS),
      audit: rel(OUT_AUDIT),
      markdown: rel(OUT_MD),
    },
    hashes: {
      mistakeTaxonomyCandidateSha256: taxonomyHash,
      requestsJsonlSha256: sha256(OUT_REQUESTS),
    },
    summary: {
      mistakeTaxonomyRows: taxonomy.rows.length,
      reviewRequestRows: requests.length,
      duplicateRequestIds,
      unsafeRows,
      deepReasoningRows,
      sourceSafeRows,
      readyForExternalReview: blockers.length === 0,
      readyForDecisionImport: false,
      readyForRuntimeEnable: false,
      readyForApply: false,
    },
    blockers,
    safety: {
      requestOnly: true,
      llmApiCalledByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      appBundleModifiedByThisScript: false,
      serverUploadStarted: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
    },
    nextRequiredGates: [
      'execute_personal_practice_mistake_taxonomy_llm_review',
      'personal_practice_mistake_taxonomy_decision_schema_gate',
      'personal_practice_mistake_taxonomy_import_dry_run',
      'problem_coach_prompt_ru_uk_contract_review',
    ],
  };
  writeJson(OUT_AUDIT, audit);
  fs.writeFileSync(OUT_MD, `# French Personal Practice Mistake Taxonomy Review Requests\n\nStatus: ${audit.status}\n\nRows: ${requests.length}\n\nActivation approved: false\n`, 'utf8');

  console.log(`${audit.status} ${rel(OUT_AUDIT)} requests=${requests.length} blockers=${blockers.length}`);
  if (blockers.length > 0) process.exitCode = 1;
}

main();
