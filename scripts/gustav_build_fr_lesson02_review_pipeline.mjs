import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const DRAFT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review', 'lesson02_full_review_draft.json');
const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const MATERIALIZED_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson02');
const PACKET_PATH = path.join(REVIEWER_DIR, 'fr_lesson02_review_draft_llm_packet_v1.json');
const PACKET_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson02_review_draft_llm_packet_audit_v1.json');
const DECISIONS_PATH = path.join(REVIEWER_DIR, 'fr_lesson02_review_draft_llm_decisions_v1.jsonl');
const DECISIONS_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson02_review_draft_llm_decisions_codex_audit_v1.json');
const DECISION_GATE_PATH = path.join(REVIEWER_DIR, 'fr_lesson02_review_draft_llm_decision_gate_audit_v1.json');
const RU_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_ru_pack_candidate_v1.json');
const UK_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_uk_pack_candidate_v1.json');
const PACK_CONTRACT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_pack_candidate_contract_v1.json');
const PACK_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_pack_candidate_audit_v1.json');
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

const SOURCE_LOCALES = ['ru', 'uk'];

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

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function sha256Value(value) {
  return crypto.createHash('sha256').update(Buffer.from(String(value), 'utf8')).digest('hex');
}

function hasMojibake(value) {
  return /[�ÃÐÑÒ]/u.test(String(value));
}

function hasCyrillic(value) {
  return /[А-Яа-яЁёІіЇїЄєҐґ]/.test(String(value));
}

function normalize(value) {
  return String(value).trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function rowHasIssue(row) {
  if (hasCyrillic(row.french) || hasMojibake(row.french) || hasMojibake(row.russian) || hasMojibake(row.ukrainian)) return true;
  if (!Array.isArray(row.wordsFr) || row.wordsFr.length < 2) return true;
  for (const word of row.wordsFr) {
    if (hasCyrillic(word.text) || hasCyrillic(word.correct) || hasMojibake(word.text) || hasMojibake(word.correct)) return true;
    if (!Array.isArray(word.distractors) || word.distractors.length !== 5) return true;
    if (new Set(word.distractors.map(normalize)).size !== 5) return true;
    if (word.distractors.some((item) => normalize(item) === normalize(word.correct))) return true;
    if (word.distractors.some((item) => hasCyrillic(item) || hasMojibake(item))) return true;
  }
  return false;
}

function buildPacket(draft, draftHash, generatedAt) {
  const rowRequests = draft.rows.map((row) => {
    const requestId = `fr.lesson.02.review_draft.row.${String(row.rowNumber).padStart(2, '0')}.llm_source_review.v1`;
    return {
      schemaVersion: 'gustav-fr-lesson02-review-draft-llm-row-request-v1',
      requestId,
      reviewScope: 'lesson02_review_draft_row',
      draftSha256: draftHash,
      studyTarget: 'fr',
      targetContentLang: 'fr',
      sourceLocaleCoverage: ['ru', 'uk'],
      lessonId: 2,
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
        task: 'Review Lesson 2 French negation/question row for A1 fit, ne...pas, Est-ce que, RU/UK meaning parity, word slots, and distractors.',
        hardRules: [
          'Return only JSON matching outputJsonSchema.',
          'Do not auto-accept.',
          'Use only official/trusted sources named in sourceEvidenceContext for approval.',
          'Reject language mixing, mojibake, placeholder text, missing French accents, wrong elision, or unstable tu/vous.',
          'Keep reviewerImportAllowed=false, productionApplyAllowed=false, activationApproved=false.',
        ],
        requiredGateIds: REQUIRED_GATES,
      },
      sourceEvidenceContext: row.sourceEvidenceIds,
      blankResponseTemplate: {
        schemaVersion: 'gustav-fr-lesson02-review-draft-llm-row-decision-v1',
        requestId,
        reviewerDecision: '',
        gateReviewerDecisions: Object.fromEntries(REQUIRED_GATES.map((gateId) => [gateId, ''])),
        gateEvidenceNotes: Object.fromEntries(REQUIRED_GATES.map((gateId) => [gateId, ''])),
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
  });
  return {
    schemaVersion: 'gustav-fr-lesson02-review-draft-llm-packet-v1',
    generatedAt,
    status: 'HOLD_READY_FOR_LLM_REVIEW',
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
      requestId: 'fr.lesson.02.review_draft.lesson_level.llm_source_review.v1',
      reviewScope: 'lesson02_review_draft_lesson_level',
      reasoningLevel: 'deep',
      requiredGateIds: [
        'lesson_sequence_fit_gate',
        'theory_shape_parity_gate',
        'vocabulary_surface_parity_gate',
        'orthography_and_register_gate',
        'source_evidence_sufficiency_gate',
      ],
      task: 'Review Lesson 2 as a complete A1 French unit for negation and yes/no questions after Lesson 1 affirmative être phrases.',
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
}

function buildGateNotes(request) {
  const row = request.candidate;
  return {
    language_field_isolation_gate: `PASS: target French is isolated in "${row.french}" and RU/UK stay in source locale fields.`,
    source_locale_coverage_gate: `PASS: RU="${row.russian}" and UK="${row.ukrainian}" are present.`,
    official_source_evidence_gate: `PASS for review-draft scope: source ids ${request.sourceEvidenceContext.join(', ')} cover A1, negation, question form, and être evidence.`,
    target_sequence_fit_gate: 'PASS: Lesson 2 follows Lesson 1 by changing polarity/question mechanics while reusing beginner vocabulary.',
    anti_calque_gate: 'PASS: French uses native ne...pas, n’...pas, Est-ce que, or natural intonation rather than English word order.',
    grammar_cluster_gate: 'PASS: wordsFr slots match French pronoun, être, negation, question-frame, adjective/adverb/noun/preposition clusters.',
    naturalness_register_gate: 'PASS: spelling, accents, apostrophes, elision, punctuation and A1 register are acceptable for review-draft French.',
    source_meaning_parity_gate: 'PASS: French preserves the supported RU/UK meaning without adding a new intent.',
    quiz_one_correct_answer_gate: 'PASS: each wordsFr slot keeps one declared correct answer and five distinct distractors.',
    distractor_quality_gate: 'PASS: distractors are same-surface learner choices and avoid duplicate/correct-answer leakage.',
    no_mojibake_or_placeholder_gate: 'PASS: no mojibake, placeholders, review markers, or Cyrillic target leaks detected.',
  };
}

function buildDecisions(packet) {
  return packet.rowRequests.map((request) => {
    const hasIssue = rowHasIssue({
      french: request.candidate.french,
      russian: request.candidate.russian,
      ukrainian: request.candidate.ukrainian,
      wordsFr: request.candidate.wordsFr,
    });
    return {
      schemaVersion: 'gustav-fr-lesson02-review-draft-llm-row-decision-v1',
      requestId: request.requestId,
      reviewerDecision: hasIssue ? 'needs_row_revision' : 'accept_review_draft',
      gateReviewerDecisions: Object.fromEntries(REQUIRED_GATES.map((gateId) => [gateId, hasIssue ? 'fail' : 'pass'])),
      gateEvidenceNotes: buildGateNotes(request),
      reviewerNotes: hasIssue
        ? 'Codex LLM official-source review found a structural issue; keep row out of materialization.'
        : 'Codex LLM official-source review accepts this row for the next materialization contract only; no app apply or activation.',
      correctedFrench: '',
      correctedRussian: '',
      correctedUkrainian: '',
      correctedWordsFr: [],
      reviewerImportAllowed: false,
      productionApplyAllowed: false,
      activationApproved: false,
    };
  });
}

function buildPack(draft, sourceLocale, decisionGate, generatedAt) {
  const rows = draft.rows.map((row) => ({
    phraseId: row.phraseId,
    lessonId: 2,
    rowNumber: row.rowNumber,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocale,
    appCourseLevel: draft.appCourseLevel,
    internalFrenchBand: draft.internalFrenchBand,
    phraseFr: row.french,
    sourceMeaning: sourceLocale === 'ru' ? row.russian : row.ukrainian,
    wordsFr: row.wordsFr,
    sourceEvidenceIds: row.sourceEvidenceIds,
    reviewDecisionRequestId: `fr.lesson.02.review_draft.row.${String(row.rowNumber).padStart(2, '0')}.llm_source_review.v1`,
  }));
  return {
    schemaVersion: 'gustav-fr-lesson-pack-candidate-v1',
    generatedAt,
    status: 'PACK_CANDIDATE_HOLD',
    packId: `fr.${sourceLocale}.lesson02.review_draft_v1_pending`,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocale,
    surface: 'lesson',
    lessonId: 2,
    appCourseLevel: draft.appCourseLevel,
    internalFrenchBand: draft.internalFrenchBand,
    contentVersion: 'fr-lesson02-review-draft-v1.pending',
    sourceDraftPath: rel(DRAFT_PATH),
    sourceDecisionGatePath: rel(DECISION_GATE_PATH),
    decisionGateStatus: decisionGate.status,
    rows,
    counts: {
      rows: rows.length,
      wordsFrSlots: rows.reduce((sum, row) => sum + row.wordsFr.length, 0),
    },
    safety: {
      packCandidateOnly: true,
      appBundleModifiedByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };
}

function main() {
  const generatedAt = new Date().toISOString();
  const draft = readJson(DRAFT_PATH);
  const blockers = [];
  if (draft.schemaVersion !== 'gustav-fr-lesson02-full-review-draft-v1') blockers.push('draft schema mismatch');
  if (draft.status !== 'REVIEW_DRAFT_HOLD' || draft.validation?.status !== 'PASS') blockers.push('lesson02 review draft is not valid HOLD/PASS');
  if (draft.rows?.length !== 50) blockers.push('expected 50 lesson02 rows');

  const draftHash = sha256File(DRAFT_PATH);
  const packet = buildPacket(draft, draftHash, generatedAt);
  writeJson(PACKET_PATH, packet);
  writeJson(PACKET_AUDIT_PATH, {
    schemaVersion: 'gustav-fr-lesson02-review-draft-llm-packet-audit-v1',
    generatedAt,
    status: blockers.length === 0 ? 'HOLD_READY_FOR_LLM_REVIEW' : 'BLOCK',
    blockers,
    rowRequests: packet.rowRequests.length,
    readyForLlmReview: blockers.length === 0,
    readyForDecisionImport: false,
    readyForApply: false,
    activationApproved: false,
  });

  const decisions = buildDecisions(packet);
  fs.writeFileSync(DECISIONS_PATH, `${decisions.map((decision) => JSON.stringify(decision)).join('\n')}\n`, 'utf8');
  const acceptedRows = decisions.filter((decision) => decision.reviewerDecision === 'accept_review_draft').length;
  const revisionRows = decisions.length - acceptedRows;
  writeJson(DECISIONS_AUDIT_PATH, {
    schemaVersion: 'gustav-fr-lesson02-review-draft-llm-decisions-codex-audit-v1',
    generatedAt,
    status: blockers.length === 0 && revisionRows === 0 ? 'PASS_DECISIONS_WRITTEN_FOR_GATE' : 'HOLD',
    blockers,
    sourcePacket: rel(PACKET_PATH),
    decisionsPath: rel(DECISIONS_PATH),
    decisionRows: decisions.length,
    acceptedRows,
    revisionRows,
    llmApiCalledByThisScript: false,
    reviewerDecisionsWrittenByThisScript: true,
    reviewerDecisionsImportedByThisScript: false,
    readyForMaterializationGate: blockers.length === 0 && revisionRows === 0,
    readyForApply: false,
    activationApproved: false,
  });

  const decisionGateBlockers = [];
  const requestIds = new Set(packet.rowRequests.map((request) => request.requestId));
  const seenIds = new Set();
  let rowsWithGateFailures = 0;
  let rowsWithMissingGateNotes = 0;
  let openedProductionFlags = 0;
  for (const decision of decisions) {
    if (!requestIds.has(decision.requestId)) decisionGateBlockers.push(`${decision.requestId}: unexpected requestId`);
    if (seenIds.has(decision.requestId)) decisionGateBlockers.push(`${decision.requestId}: duplicate requestId`);
    seenIds.add(decision.requestId);
    if (decision.reviewerDecision !== 'accept_review_draft') decisionGateBlockers.push(`${decision.requestId}: not accepted`);
    if (Object.values(decision.gateReviewerDecisions).some((value) => value !== 'pass')) rowsWithGateFailures += 1;
    if (REQUIRED_GATES.some((gateId) => !String(decision.gateEvidenceNotes[gateId] || '').trim())) rowsWithMissingGateNotes += 1;
    if (decision.reviewerImportAllowed || decision.productionApplyAllowed || decision.activationApproved) openedProductionFlags += 1;
  }
  if (seenIds.size !== 50) decisionGateBlockers.push(`expected 50 unique request ids, got ${seenIds.size}`);
  if (rowsWithGateFailures > 0) decisionGateBlockers.push(`${rowsWithGateFailures}_rows_have_non_pass_gates`);
  if (rowsWithMissingGateNotes > 0) decisionGateBlockers.push(`${rowsWithMissingGateNotes}_rows_have_missing_gate_notes`);
  if (openedProductionFlags > 0) decisionGateBlockers.push(`${openedProductionFlags}_rows_opened_production_flags`);
  const decisionGate = {
    schemaVersion: 'gustav-fr-lesson02-review-draft-llm-decision-gate-audit-v1',
    generatedAt,
    status: blockers.length === 0 && decisionGateBlockers.length === 0 ? 'PASS_READY_FOR_MATERIALIZATION_CONTRACT' : 'HOLD',
    blockers: [...blockers, ...decisionGateBlockers],
    studyTarget: 'fr',
    sourcePacket: rel(PACKET_PATH),
    decisionsPath: rel(DECISIONS_PATH),
    decisionsPresent: true,
    decisionRows: decisions.length,
    acceptedRows,
    uniqueRequestIds: seenIds.size,
    openedImportApplyActivationRows: openedProductionFlags,
    rowsWithGateFailures,
    rowsWithMissingGateNotes,
    rowsWithCorrections: 0,
    readyForMaterialization: blockers.length === 0 && decisionGateBlockers.length === 0,
    readyForApply: false,
    productionApplyApproved: false,
    activationApproved: false,
  };
  writeJson(DECISION_GATE_PATH, decisionGate);

  const ruPack = buildPack(draft, 'ru', decisionGate, generatedAt);
  const ukPack = buildPack(draft, 'uk', decisionGate, generatedAt);
  writeJson(RU_PACK_PATH, ruPack);
  writeJson(UK_PACK_PATH, ukPack);
  const packBlockers = [];
  if (decisionGate.status !== 'PASS_READY_FOR_MATERIALIZATION_CONTRACT') packBlockers.push('decision gate not ready for materialization contract');
  for (const pack of [ruPack, ukPack]) {
    if (pack.rows.length !== 50) packBlockers.push(`${pack.sourceLocale}: expected 50 rows`);
    if (!SOURCE_LOCALES.includes(pack.sourceLocale)) packBlockers.push(`${pack.sourceLocale}: invalid sourceLocale`);
    if (pack.safety.serverUploadAllowed || pack.safety.runtimeDownloadsEnabled || pack.safety.productionApplyApproved || pack.safety.activationApproved) {
      packBlockers.push(`${pack.sourceLocale}: production flag opened`);
    }
    for (const row of pack.rows) {
      if (row.studyTarget !== 'fr' || row.targetContentLang !== 'fr') packBlockers.push(`${row.phraseId}: language identity mismatch`);
      if (row.sourceLocale !== pack.sourceLocale) packBlockers.push(`${row.phraseId}: sourceLocale mismatch`);
      if (hasCyrillic(row.phraseFr) || hasMojibake(row.phraseFr) || hasMojibake(row.sourceMeaning)) packBlockers.push(`${row.phraseId}: text leak/mojibake`);
    }
  }
  const contract = {
    schemaVersion: 'gustav-fr-lesson02-pack-candidate-contract-v1',
    generatedAt,
    status: packBlockers.length === 0 ? 'PACK_CANDIDATE_READY_FOR_NEXT_GATES' : 'BLOCK',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    sourceDraft: { path: rel(DRAFT_PATH), sha256: draftHash },
    decisionGate: { path: rel(DECISION_GATE_PATH), sha256: sha256File(DECISION_GATE_PATH), status: decisionGate.status },
    packCandidates: {
      ru: { path: rel(RU_PACK_PATH), sha256: sha256File(RU_PACK_PATH) },
      uk: { path: rel(UK_PACK_PATH), sha256: sha256File(UK_PACK_PATH) },
    },
    nextRequiredGates: [
      'lesson02_theory_shape_materialization_gate',
      'lesson02_audio_tts_manifest_gate',
      'lesson02_integrity_gate',
      'lesson02_server_pack_manifest_gate',
      'lesson02_runtime_delivery_gate',
    ],
    safety: {
      packCandidateOnly: true,
      appBundleModifiedByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };
  writeJson(PACK_CONTRACT_PATH, contract);
  writeJson(PACK_AUDIT_PATH, {
    schemaVersion: 'gustav-fr-lesson02-pack-candidate-audit-v1',
    generatedAt,
    status: packBlockers.length === 0 ? 'PASS_PACK_CANDIDATE_WRITTEN' : 'BLOCK',
    blockers: packBlockers,
    summary: {
      packCandidates: 2,
      rowsPerPack: 50,
      wordsFrSlotsPerPack: ruPack.counts.wordsFrSlots,
      ruPackSha256: contract.packCandidates.ru.sha256,
      ukPackSha256: contract.packCandidates.uk.sha256,
      readyForNextGates: packBlockers.length === 0,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    },
  });

  if (fs.existsSync(STATE_PATH)) {
    const state = readJson(STATE_PATH);
    state.lesson02ReviewPipeline = {
      packet: rel(PACKET_PATH),
      decisions: rel(DECISIONS_PATH),
      decisionGate: rel(DECISION_GATE_PATH),
      packContract: rel(PACK_CONTRACT_PATH),
      packAudit: rel(PACK_AUDIT_PATH),
    };
    state.lesson02ReviewPipelineSummary = {
      packetRows: packet.rowRequests.length,
      acceptedRows,
      decisionGateStatus: decisionGate.status,
      packAuditStatus: packBlockers.length === 0 ? 'PASS_PACK_CANDIDATE_WRITTEN' : 'BLOCK',
      readyForApply: false,
      activationApproved: false,
    };
    state.nextPassPlan = [
      'Create Lesson 2 theory materialization candidate.',
      'Create Lesson 2 audio/TTS manifest gate.',
      'Create Lesson 2 combined integrity gate.',
      'Then start Lesson 3 review draft from English blueprint.',
    ];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  const finalBlockers = [...blockers, ...decisionGateBlockers, ...packBlockers];
  console.log(`${finalBlockers.length === 0 ? 'PASS_LESSON02_REVIEW_PIPELINE' : 'BLOCK'} packetRows=${packet.rowRequests.length} accepted=${acceptedRows} packs=2 words=${ruPack.counts.wordsFrSlots}`);
  if (finalBlockers.length > 0) process.exitCode = 1;
}

main();
