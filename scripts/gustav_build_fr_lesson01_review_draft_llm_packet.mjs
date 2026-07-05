import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const DRAFT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review', 'lesson01_full_review_draft.json');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const PACKET_PATH = path.join(OUT_DIR, 'fr_lesson01_review_draft_llm_packet_v1.json');
const AUDIT_PATH = path.join(OUT_DIR, 'fr_lesson01_review_draft_llm_packet_audit_v1.json');
const MD_PATH = path.join(OUT_DIR, 'fr_lesson01_review_draft_llm_packet_v1.md');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

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

const LESSON_LEVEL_GATES = [
  'lesson_sequence_fit_gate',
  'theory_shape_parity_gate',
  'vocabulary_surface_parity_gate',
  'orthography_and_register_gate',
  'source_evidence_sufficiency_gate',
];

const ROW_DECISIONS = [
  'accept_review_draft',
  'needs_row_revision',
  'needs_source_check',
  'reject_row',
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(value) {
  return crypto.createHash('sha256').update(Buffer.from(String(value), 'utf8')).digest('hex');
}

function fileSha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function blankGateMap(gateIds) {
  return Object.fromEntries(gateIds.map((gateId) => [gateId, '']));
}

function rowRequest(row, draftHash) {
  const requestId = `fr.lesson.01.review_draft.row.${String(row.rowNumber).padStart(2, '0')}.llm_source_review.v1`;
  return {
    schemaVersion: 'gustav-fr-lesson01-review-draft-llm-row-request-v1',
    requestId,
    reviewScope: 'lesson01_review_draft_row',
    draftSha256: draftHash,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocaleCoverage: ['ru', 'uk'],
    lessonId: 1,
    appCourseLevel: 'A1',
    internalFrenchBand: 'A1.1',
    rowNumber: row.rowNumber,
    phraseId: row.phraseId,
    candidate: {
      french: row.french,
      russian: row.russian,
      ukrainian: row.ukrainian,
      wordsFr: row.wordsFr,
      sourceEvidenceIds: row.sourceEvidenceIds,
    },
    instructions: {
      role: 'You are the LLM official-source judge replacing human review for PhraseMan French review-draft content.',
      reasoningLevel: 'deep',
      task: 'Review this one Lesson 1 French row. Judge French naturalness, A1 fit, RU/UK meaning parity, word slots, and distractor quality.',
      hardRules: [
        'Return only JSON matching outputJsonSchema.',
        'Do not auto-accept.',
        'Use only official/trusted sources named in sourceEvidenceContext for approval.',
        'If evidence is insufficient, choose needs_source_check.',
        'Reject any language mixing, mojibake, placeholder text, missing French accents, or wrong elision.',
        'Keep reviewerImportAllowed=false, productionApplyAllowed=false, activationApproved=false.',
      ],
      requiredGateIds: REQUIRED_GATES,
    },
    sourceEvidenceContext: row.sourceEvidenceIds,
    outputJsonSchema: {
      type: 'object',
      additionalProperties: false,
      required: [
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
      ],
      properties: {
        schemaVersion: { type: 'string', const: 'gustav-fr-lesson01-review-draft-llm-row-decision-v1' },
        requestId: { type: 'string', const: requestId },
        reviewerDecision: { type: 'string', enum: ROW_DECISIONS },
        gateReviewerDecisions: {
          type: 'object',
          required: REQUIRED_GATES,
          additionalProperties: false,
          properties: Object.fromEntries(REQUIRED_GATES.map((gateId) => [gateId, { type: 'string', enum: ['pass', 'fail', 'needs_source_check'] }])),
        },
        gateEvidenceNotes: {
          type: 'object',
          required: REQUIRED_GATES,
          additionalProperties: false,
          properties: Object.fromEntries(REQUIRED_GATES.map((gateId) => [gateId, { type: 'string', minLength: 1 }])),
        },
        reviewerNotes: { type: 'string', minLength: 1 },
        correctedFrench: { type: 'string' },
        correctedRussian: { type: 'string' },
        correctedUkrainian: { type: 'string' },
        correctedWordsFr: { type: 'array' },
        reviewerImportAllowed: { type: 'boolean', const: false },
        productionApplyAllowed: { type: 'boolean', const: false },
        activationApproved: { type: 'boolean', const: false },
      },
    },
    blankResponseTemplate: {
      schemaVersion: 'gustav-fr-lesson01-review-draft-llm-row-decision-v1',
      requestId,
      reviewerDecision: '',
      gateReviewerDecisions: blankGateMap(REQUIRED_GATES),
      gateEvidenceNotes: blankGateMap(REQUIRED_GATES),
      reviewerNotes: '',
      correctedFrench: '',
      correctedRussian: '',
      correctedUkrainian: '',
      correctedWordsFr: [],
      reviewerImportAllowed: false,
      productionApplyAllowed: false,
      activationApproved: false,
    },
    safety: {
      requestOnly: true,
      llmApiCalledByThisScript: false,
      reviewerDecisionWrittenByThisScript: false,
      reviewerImportAllowed: false,
      productionApplyAllowed: false,
      activationApproved: false,
    },
  };
}

function buildMarkdown(packet, audit) {
  const lines = [
    '# French Lesson 1 Review Draft LLM Packet',
    '',
    `Status: ${audit.status}`,
    `Draft: ${packet.sourceDraft.path}`,
    `Rows: ${packet.rowRequests.length}`,
    '',
    '## Purpose',
    '',
    'This packet replaces human review for Lesson 1 review-draft content. It does not call an LLM, import decisions, modify app files, upload packs, enable runtime downloads, or approve activation.',
    '',
    '## Required Gates',
    '',
    ...REQUIRED_GATES.map((gateId) => `- ${gateId}`),
    '',
    '## Lesson-Level Gates',
    '',
    ...LESSON_LEVEL_GATES.map((gateId) => `- ${gateId}`),
    '',
    '## First Row Preview',
    '',
    `- ${packet.rowRequests[0].candidate.french}`,
    `- RU: ${packet.rowRequests[0].candidate.russian}`,
    `- UK: ${packet.rowRequests[0].candidate.ukrainian}`,
    '',
    '## Safety',
    '',
    `- llmApiCalledByThisScript: ${packet.safety.llmApiCalledByThisScript}`,
    `- reviewerDecisionsImportedByThisScript: ${packet.safety.reviewerDecisionsImportedByThisScript}`,
    `- appBundleModifiedByThisScript: ${packet.safety.appBundleModifiedByThisScript}`,
    `- firebaseOrServerUploadStarted: ${packet.safety.firebaseOrServerUploadStarted}`,
    `- runtimeDownloadsEnabled: ${packet.safety.runtimeDownloadsEnabled}`,
    `- activationApproved: ${packet.safety.activationApproved}`,
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function main() {
  const generatedAt = new Date().toISOString();
  const draft = readJson(DRAFT_PATH);
  const draftHash = fileSha256(DRAFT_PATH);
  const blockers = [];

  if (draft.schemaVersion !== 'gustav-fr-lesson01-full-review-draft-v2') blockers.push('lesson 1 review draft must be v2 accented/native draft');
  if (draft.status !== 'REVIEW_DRAFT_HOLD') blockers.push('lesson 1 review draft must remain HOLD');
  if (draft.activationApproved !== false || draft.readyForApply !== false) blockers.push('lesson 1 review draft opened activation/apply flags');
  if (!Array.isArray(draft.rows) || draft.rows.length !== 50) blockers.push('lesson 1 review draft must contain exactly 50 rows');
  if (draft.validation?.status !== 'PASS') blockers.push('lesson 1 review draft validation must pass before review-packet generation');

  const rowRequests = draft.rows.map((row) => rowRequest(row, draftHash));
  const rowRequestHash = sha256(JSON.stringify(rowRequests));

  const packet = {
    schemaVersion: 'gustav-fr-lesson01-review-draft-llm-packet-v1',
    generatedAt,
    status: blockers.length === 0 ? 'HOLD_READY_FOR_LLM_REVIEW' : 'BLOCK',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocaleCoverage: ['ru', 'uk'],
    sourceDraft: {
      path: rel(DRAFT_PATH),
      sha256: draftHash,
      schemaVersion: draft.schemaVersion,
      status: draft.status,
    },
    sourceEvidence: draft.sourceEvidence,
    lessonLevelReviewRequest: {
      requestId: 'fr.lesson.01.review_draft.lesson_level.llm_source_review.v1',
      reviewScope: 'lesson01_review_draft_lesson_level',
      reasoningLevel: 'deep',
      requiredGateIds: LESSON_LEVEL_GATES,
      task: 'Review Lesson 1 as a complete French-native A1 unit against English blueprint shape, French beginner pedagogy, theory, vocabulary, distractor strategy, source evidence, and language isolation.',
      outputDecisionAllowedValues: ['accept_lesson_draft', 'needs_lesson_revision', 'needs_source_check', 'reject_lesson_draft'],
      reviewerImportAllowed: false,
      productionApplyAllowed: false,
      activationApproved: false,
    },
    rowRequests,
    safety: {
      requestOnly: true,
      llmApiCalledByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };

  const audit = {
    schemaVersion: 'gustav-fr-lesson01-review-draft-llm-packet-audit-v1',
    generatedAt,
    status: packet.status,
    blockers,
    studyTarget: packet.studyTarget,
    sourceDraft: packet.sourceDraft,
    rowRequests: rowRequests.length,
    rowRequestHash,
    requiredGateCount: REQUIRED_GATES.length,
    lessonLevelGateCount: LESSON_LEVEL_GATES.length,
    blankDecisionRows: rowRequests.filter((request) => request.blankResponseTemplate.reviewerDecision === '').length,
    openedImportApplyActivationRows: rowRequests.filter((request) =>
      request.blankResponseTemplate.reviewerImportAllowed ||
      request.blankResponseTemplate.productionApplyAllowed ||
      request.blankResponseTemplate.activationApproved ||
      request.safety.activationApproved,
    ).length,
    readyForLlmReview: blockers.length === 0,
    readyForDecisionImport: false,
    readyForApply: false,
    activationApproved: false,
    nextRequiredArtifact: 'fr_lesson01_review_draft_llm_decisions_v1.jsonl',
  };

  writeJson(PACKET_PATH, packet);
  writeJson(AUDIT_PATH, audit);
  fs.writeFileSync(MD_PATH, buildMarkdown(packet, audit), 'utf8');

  if (fs.existsSync(STATE_PATH)) {
    const state = readJson(STATE_PATH);
    state.lesson01ReviewDraftLlmPacket = rel(PACKET_PATH);
    state.lesson01ReviewDraftLlmPacketAudit = rel(AUDIT_PATH);
    state.lesson01ReviewDraftLlmPacketStatus = audit.status;
    state.lesson01ReviewDraftLlmPacketSummary = {
      rowRequests: audit.rowRequests,
      requiredGateCount: audit.requiredGateCount,
      lessonLevelGateCount: audit.lessonLevelGateCount,
      readyForLlmReview: audit.readyForLlmReview,
      readyForDecisionImport: audit.readyForDecisionImport,
      activationApproved: audit.activationApproved,
      nextRequiredArtifact: audit.nextRequiredArtifact,
    };
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`${audit.status} ${rel(PACKET_PATH)} rowRequests=${audit.rowRequests} gates=${audit.requiredGateCount}+${audit.lessonLevelGateCount}`);
  if (blockers.length > 0) process.exitCode = 1;
}

main();
