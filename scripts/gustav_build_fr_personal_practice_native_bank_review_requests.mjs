import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'personal_practice');
const BANK_PATH = path.join(OUT_DIR, 'fr_personal_practice_native_bank_candidate_v1.json');
const BANK_AUDIT_PATH = path.join(OUT_DIR, 'fr_personal_practice_native_bank_candidate_gate_v1.json');
const OUT_REQUESTS = path.join(OUT_DIR, 'fr_personal_practice_native_bank_review_requests_v1.jsonl');
const OUT_AUDIT = path.join(OUT_DIR, 'fr_personal_practice_native_bank_review_requests_audit_v1.json');
const OUT_MD = path.join(OUT_DIR, 'fr_personal_practice_native_bank_review_requests_v1.md');
const FUTURE_DECISIONS = path.join(OUT_DIR, 'fr_personal_practice_native_bank_review_decisions_v1.jsonl');

const EXPECTED_ROWS = 56;
const GATES = [
  'language_field_isolation_gate',
  'source_locale_coverage_gate',
  'official_source_evidence_gate',
  'french_native_skill_fit_gate',
  'english_shape_only_gate',
  'mistake_taxonomy_fit_gate',
  'ru_uk_prompt_contract_gate',
  'training_shape_gate',
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
      'studyTarget',
      'sourceLocaleCoverage',
      'reviewerDecision',
      'gateReviewerDecisions',
      'gateEvidenceNotes',
      'reviewerNotes',
      'reviewerName',
      'reviewedAt',
      'correctedFrenchSkillName',
      'correctedContrastSet',
      'correctedMistakeTaxonomyIds',
      'reviewerImportAllowed',
      'productionApplyAllowed',
      'activationApproved',
    ],
    properties: {
      schemaVersion: constString('gustav-fr-personal-practice-native-bank-review-decision-v1'),
      requestId: constString(requestId),
      reviewScope: constString('personal_practice_native_bank_row'),
      sourceQueueIndex: constInteger(row.slotIndex),
      frenchTrainingId: constString(row.frenchTrainingId),
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
      correctedFrenchSkillName: { type: 'string', description: 'Use empty string unless reviewerDecision is needs_llm_regeneration_review.' },
      correctedContrastSet: { type: 'string', description: 'Use empty string unless reviewerDecision is needs_llm_regeneration_review.' },
      correctedMistakeTaxonomyIds: { type: 'array', items: { type: 'string' }, description: 'Use empty array unless reviewerDecision is needs_llm_regeneration_review.' },
      reviewerImportAllowed: constBoolean(false),
      productionApplyAllowed: constBoolean(false),
      activationApproved: constBoolean(false),
    },
  };
}

function blankResponse(requestId, row) {
  return {
    schemaVersion: 'gustav-fr-personal-practice-native-bank-review-decision-v1',
    requestId,
    reviewScope: 'personal_practice_native_bank_row',
    sourceQueueIndex: row.slotIndex,
    frenchTrainingId: row.frenchTrainingId,
    studyTarget: 'fr',
    sourceLocaleCoverage: ['ru', 'uk'],
    reviewerDecision: '',
    gateReviewerDecisions: Object.fromEntries(GATES.map((gate) => [gate, ''])),
    gateEvidenceNotes: Object.fromEntries(GATES.map((gate) => [gate, ''])),
    reviewerNotes: '',
    reviewerName: 'llm_official_source_judge',
    reviewedAt: '',
    correctedFrenchSkillName: '',
    correctedContrastSet: '',
    correctedMistakeTaxonomyIds: [],
    reviewerImportAllowed: false,
    productionApplyAllowed: false,
    activationApproved: false,
  };
}

function buildRequest(row, bankHash) {
  const requestId = `fr.personal_practice.native_bank.${String(row.slotIndex).padStart(2, '0')}.review_request.v1`;
  return {
    schemaVersion: 'gustav-fr-personal-practice-native-bank-review-request-v1',
    requestId,
    reviewScope: 'personal_practice_native_bank_row',
    sourceQueueIndex: row.slotIndex,
    frenchTrainingId: row.frenchTrainingId,
    sourceEnglishTrainingId: row.sourceEnglishTrainingId,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    aiOutputLang: 'fr',
    sourceLocaleCoverage: ['ru', 'uk'],
    sourceQueueSha256: bankHash,
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
      role: 'You are the LLM official-source judge replacing human review for PhraseMan French personal practice.',
      reasoningLevel: 'deep',
      task: 'Review exactly this one French personal-practice native-bank candidate row. Verify it is French-native, source-backed, shaped like the English product slot but not translated from English content.',
      hardRules: [
        'Do not auto-accept.',
        'Do not approve if the English diagnosis slot is reused as French content instead of product shape.',
        'Do not approve if French target content mixes English, Russian, Ukrainian, UI locale or source locale text.',
        'Do not approve if RU and UK prompt contracts are not separated.',
        'Do not approve without trusted source ids in gate evidence notes.',
        'Return only JSON matching outputJsonSchema.',
        'Keep reviewerImportAllowed=false, productionApplyAllowed=false and activationApproved=false.',
      ],
      gateRubrics: {
        language_field_isolation_gate: 'studyTarget, targetContentLang and aiOutputLang must be fr; source locales only ru/uk.',
        source_locale_coverage_gate: 'RU and UK explanation/prompt contracts must both be represented and separated.',
        official_source_evidence_gate: 'The French grammar/usage focus must cite trusted source ids supplied in requiredEvidenceIds.',
        french_native_skill_fit_gate: 'The candidate must be a French-native skill focus, not a literal copy of English grammar.',
        english_shape_only_gate: 'The English training id may define only product slot/shape, never translated content.',
        mistake_taxonomy_fit_gate: 'Mistake taxonomy ids must match the French focus and be usable by personal practice.',
        ru_uk_prompt_contract_gate: 'Prompt contracts must keep Russian and Ukrainian learner explanations separate.',
        training_shape_gate: 'Required training shape must be compatible with diagnosis training: intro blocks, steps, smart trainer.',
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
  const bank = readJson(BANK_PATH);
  const bankAudit = readJson(BANK_AUDIT_PATH);
  const blockers = [];
  if (bank.status !== 'HOLD_CANDIDATE_READY_FOR_LLM_TRUSTED_SOURCE_REVIEW') blockers.push('BANK_CANDIDATE_NOT_READY');
  if (bankAudit.summary?.readyForLlmTrustedSourceReview !== true) blockers.push('BANK_GATE_NOT_READY_FOR_REVIEW');
  if (!Array.isArray(bank.rows) || bank.rows.length !== EXPECTED_ROWS) blockers.push('BANK_ROW_COUNT_INVALID');

  const bankHash = sha256(BANK_PATH);
  const requests = bank.rows.map((row) => buildRequest(row, bankHash));
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
    schemaVersion: 'gustav-fr-personal-practice-native-bank-review-requests-audit-v1',
    generatedAt,
    status: blockers.length === 0 ? 'HOLD_READY_FOR_LLM_TRUSTED_SOURCE_REVIEW' : 'BLOCK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    inputs: {
      bankCandidate: rel(BANK_PATH),
      bankCandidateGate: rel(BANK_AUDIT_PATH),
    },
    outputs: {
      requestsJsonl: rel(OUT_REQUESTS),
      futureDecisionsJsonl: rel(FUTURE_DECISIONS),
      audit: rel(OUT_AUDIT),
      markdown: rel(OUT_MD),
    },
    hashes: {
      bankCandidateSha256: bankHash,
      requestsJsonlSha256: sha256(OUT_REQUESTS),
    },
    summary: {
      bankCandidateRows: bank.rows.length,
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
      'execute_personal_practice_native_bank_llm_review',
      'personal_practice_native_bank_decision_schema_gate',
      'personal_practice_native_bank_import_dry_run',
      'problem_coach_prompt_ru_uk_contract_review',
    ],
  };
  writeJson(OUT_AUDIT, audit);
  fs.writeFileSync(OUT_MD, `# French Personal Practice Native Bank Review Requests\n\nStatus: ${audit.status}\n\nRows: ${requests.length}\n\nActivation approved: false\n`, 'utf8');

  console.log(`${audit.status} ${rel(OUT_AUDIT)} requests=${requests.length} blockers=${blockers.length}`);
  if (blockers.length > 0) process.exitCode = 1;
}

main();
