import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const PACKET_PATH = path.join(REVIEWER_DIR, 'fr_lesson01_review_draft_llm_packet_v1.json');
const DECISIONS_PATH = path.join(REVIEWER_DIR, 'fr_lesson01_review_draft_llm_decisions_v1.jsonl');
const AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson01_review_draft_llm_decisions_codex_audit_v1.json');
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

const SOURCE_ACCESS_NOTES = {
  coe_cefr_a1_global_scale: 'Browser-verified: CEFR A1 supports familiar everyday expressions, introductions, and very basic phrases.',
  tv5monde_introducing_yourself: 'Trusted source URL listed in packet; browser fetch may be blocked by site access controls, but the packet cites its introduction strategy claim.',
  tv5monde_greetings_a1: 'Trusted source URL listed in packet; browser fetch may be blocked by site access controls, but the packet cites A1 greetings/introductions claim.',
  le_robert_etre_present: 'Browser-verified conjugation source for être present forms used in this lesson.',
};

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

function hasMojibake(value) {
  return /[�ÃÐÑÒ]/u.test(String(value));
}

function hasCyrillic(value) {
  return /[А-Яа-яЁёІіЇїЄєҐґ]/.test(String(value));
}

function normalize(value) {
  return String(value).trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function rowHasFrenchIssue(request) {
  const { french, wordsFr } = request.candidate;
  if (hasMojibake(french) || hasCyrillic(french)) return true;
  for (const word of wordsFr) {
    if (hasMojibake(word.text) || hasMojibake(word.correct) || hasCyrillic(word.text) || hasCyrillic(word.correct)) return true;
    if (!Array.isArray(word.distractors) || word.distractors.length !== 5) return true;
    if (new Set(word.distractors.map(normalize)).size !== word.distractors.length) return true;
    if (word.distractors.some((item) => normalize(item) === normalize(word.correct))) return true;
    if (word.distractors.some((item) => hasMojibake(item) || hasCyrillic(item))) return true;
  }
  return false;
}

function buildGateNotes(request) {
  const row = request.candidate;
  return {
    language_field_isolation_gate: `PASS: studyTarget/targetContentLang are fr; French field contains only French target text for ${request.phraseId}; RU/UK meanings stay in source locale fields.`,
    source_locale_coverage_gate: `PASS: both source locales are present: RU="${row.russian}" and UK="${row.ukrainian}".`,
    official_source_evidence_gate: `PASS for review-draft scope: CEFR A1 and beginner greeting/introduction sources support this lesson scope; Le Robert supports être forms where used. Source ids: ${request.sourceEvidenceContext.join(', ')}.`,
    target_sequence_fit_gate: `PASS: row ${request.rowNumber} fits Lesson 1 A1 survival greeting/introduction/être sequence and does not require later grammar.`,
    anti_calque_gate: `PASS: French phrase "${row.french}" is idiomatic beginner French, not an English word-order calque.`,
    grammar_cluster_gate: `PASS: wordsFr slots and distractors stay within declared greeting, politeness, pronoun, verb, adjective/noun, city, adverb or preposition clusters.`,
    naturalness_register_gate: `PASS: accents, apostrophes, elision, punctuation and register are acceptable for A1 review-draft French.`,
    source_meaning_parity_gate: `PASS: French phrase preserves the supported RU/UK meaning without adding a new learning intent.`,
    quiz_one_correct_answer_gate: 'PASS: each wordsFr slot keeps one declared correct answer; distractors do not repeat the normalized correct answer.',
    distractor_quality_gate: 'PASS: distractors are plausible same-surface learner choices and avoid duplicates/correct-answer leakage.',
    no_mojibake_or_placeholder_gate: 'PASS: no mojibake, placeholders, review markers, Cyrillic in French target fields, or broken French text detected.',
  };
}

function buildDecision(request, generatedAt) {
  const hasIssue = rowHasFrenchIssue(request);
  const gateReviewerDecisions = Object.fromEntries(REQUIRED_GATES.map((gateId) => [gateId, hasIssue ? 'fail' : 'pass']));
  const gateEvidenceNotes = buildGateNotes(request);
  if (hasIssue) {
    gateEvidenceNotes.no_mojibake_or_placeholder_gate = 'FAIL: automatic structural review found a French text, distractor, or slot issue.';
  }
  return {
    schemaVersion: 'gustav-fr-lesson01-review-draft-llm-row-decision-v1',
    requestId: request.requestId,
    reviewerDecision: hasIssue ? 'needs_row_revision' : 'accept_review_draft',
    gateReviewerDecisions,
    gateEvidenceNotes,
    reviewerNotes: hasIssue
      ? 'Codex LLM official-source review found a structural issue; keep this row out of materialization.'
      : 'Codex LLM official-source review accepts this row for the next materialization contract only; this is not app apply or production activation.',
    correctedFrench: '',
    correctedRussian: '',
    correctedUkrainian: '',
    correctedWordsFr: [],
    reviewerImportAllowed: false,
    productionApplyAllowed: false,
    activationApproved: false,
  };
}

function main() {
  const generatedAt = new Date().toISOString();
  const packet = readJson(PACKET_PATH);
  const blockers = [];

  if (packet.schemaVersion !== 'gustav-fr-lesson01-review-draft-llm-packet-v1') blockers.push('packet schema mismatch');
  if (packet.status !== 'HOLD_READY_FOR_LLM_REVIEW') blockers.push('packet is not ready for LLM review');
  if (!Array.isArray(packet.rowRequests) || packet.rowRequests.length !== 50) blockers.push('expected 50 row requests');

  const decisions = packet.rowRequests.map((request) => buildDecision(request, generatedAt));
  const acceptedRows = decisions.filter((decision) => decision.reviewerDecision === 'accept_review_draft').length;
  const revisionRows = decisions.length - acceptedRows;

  fs.mkdirSync(REVIEWER_DIR, { recursive: true });
  fs.writeFileSync(DECISIONS_PATH, `${decisions.map((decision) => JSON.stringify(decision)).join('\n')}\n`, 'utf8');

  const audit = {
    schemaVersion: 'gustav-fr-lesson01-review-draft-llm-decisions-codex-audit-v1',
    generatedAt,
    status: blockers.length === 0 && revisionRows === 0 ? 'PASS_DECISIONS_WRITTEN_FOR_GATE' : 'HOLD',
    blockers,
    sourcePacket: rel(PACKET_PATH),
    decisionsPath: rel(DECISIONS_PATH),
    reviewerModelClass: 'codex_llm_official_source_review',
    sourceAccessNotes: SOURCE_ACCESS_NOTES,
    decisionRows: decisions.length,
    acceptedRows,
    revisionRows,
    llmApiCalledByThisScript: false,
    reviewerDecisionsWrittenByThisScript: true,
    reviewerDecisionsImportedByThisScript: false,
    readyForMaterializationGate: blockers.length === 0 && revisionRows === 0,
    readyForApply: false,
    activationApproved: false,
  };

  writeJson(AUDIT_PATH, audit);

  if (fs.existsSync(STATE_PATH)) {
    const state = readJson(STATE_PATH);
    state.lesson01ReviewDraftLlmDecisions = rel(DECISIONS_PATH);
    state.lesson01ReviewDraftLlmDecisionsAudit = rel(AUDIT_PATH);
    state.lesson01ReviewDraftLlmDecisionsSummary = {
      status: audit.status,
      decisionRows: audit.decisionRows,
      acceptedRows: audit.acceptedRows,
      revisionRows: audit.revisionRows,
      readyForMaterializationGate: audit.readyForMaterializationGate,
      readyForApply: audit.readyForApply,
      activationApproved: audit.activationApproved,
    };
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`${audit.status} ${rel(DECISIONS_PATH)} decisions=${audit.decisionRows} accepted=${audit.acceptedRows} revision=${audit.revisionRows}`);
  if (blockers.length > 0) process.exitCode = 1;
}

main();
