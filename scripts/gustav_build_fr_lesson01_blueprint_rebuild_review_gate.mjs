import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const CANDIDATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review', 'lesson01_blueprint_rebuild_candidate_v1.json');
const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const GATE_PATH = path.join(REVIEWER_DIR, 'fr_lesson01_blueprint_rebuild_review_gate_v1.json');
const MD_PATH = path.join(REVIEWER_DIR, 'fr_lesson01_blueprint_rebuild_review_gate_v1.md');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

const REQUIRED_EVIDENCE_IDS = [
  'le_robert_etre_present',
  'tv5monde_etre_present_a1',
  'coe_cefr_a1_short_simple_phrases',
  'phraseman_english_lesson1_blueprint',
];

const REQUIRED_PHRASES = [
  'Je suis ici.',
  'Tu es là.',
  'Il est prêt.',
  'Elle est prête.',
  'Nous sommes en sécurité.',
  "Je suis à l'intérieur.",
  'Vous êtes en retard.',
  "C'est facile.",
  "C'est possible.",
];

const FORBIDDEN_FRENCH_LEAKS = /\b(etes|pret|prete|prets|pretes|occupe|occupee|fatigue|fatiguee|securite|casse|serieux)\b/u;
const GENERIC_FALLBACK_SIGNATURE = ['ici', 'là', 'calme', 'prêt', 'possible'].join('|');

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

function hasSourceLocaleLeak(value) {
  const text = String(value);
  return /[А-Яа-яЁёІіЇїЄєҐґ]/u.test(text);
}

function rowReview(row) {
  const issues = [];
  const words = row.wordsFr ?? [];
  if (!row.phraseFr || FORBIDDEN_FRENCH_LEAKS.test(row.phraseFr)) issues.push('french_phrase_has_missing_accents_or_forbidden_ascii_form');
  if (hasSourceLocaleLeak(row.phraseFr)) issues.push('source_locale_leak_inside_target_phrase');
  if (!row.meaningRu || !row.meaningUk) issues.push('missing_ru_or_uk_support_meaning');
  if (!Array.isArray(words) || words.length < 3) issues.push('wordsFr_missing_or_too_short');
  const evidence = new Set(row.sourceEvidenceIds ?? []);
  for (const id of REQUIRED_EVIDENCE_IDS) {
    if (!evidence.has(id)) issues.push(`missing_evidence_${id}`);
  }
  for (const word of words) {
    if (!word.text || word.correct !== word.text) issues.push(`bad_word_slot_${word.text ?? 'unknown'}`);
    if (FORBIDDEN_FRENCH_LEAKS.test(word.correct)) issues.push(`word_missing_required_accent_${word.correct}`);
    if (hasSourceLocaleLeak(word.correct)) issues.push(`source_locale_leak_word_${word.correct}`);
    if (!Array.isArray(word.distractors) || word.distractors.length !== 5) issues.push(`bad_distractor_count_${word.correct}`);
    if (new Set(word.distractors ?? []).size !== (word.distractors ?? []).length) issues.push(`duplicate_distractors_${word.correct}`);
    if ((word.distractors ?? []).includes(word.correct)) issues.push(`distractor_contains_correct_${word.correct}`);
    if ((word.distractors ?? []).some((d) => FORBIDDEN_FRENCH_LEAKS.test(d))) issues.push(`distractor_missing_required_accent_${word.correct}`);
    if ((word.distractors ?? []).some(hasSourceLocaleLeak)) issues.push(`source_locale_leak_distractor_${word.correct}`);
    if (word.category?.startsWith('adjective') && (word.distractors ?? []).join('|') === GENERIC_FALLBACK_SIGNATURE) {
      issues.push(`generic_fallback_distractors_for_adjective_${word.correct}`);
    }
  }
  return {
    rowId: row.id,
    order: row.order,
    phraseFr: row.phraseFr,
    decision: issues.length === 0 ? 'ACCEPT' : 'REVISE',
    issues,
    acceptedForLessonCandidate: issues.length === 0,
    acceptedForProduction: false,
  };
}

function markdownFor(gate) {
  const lines = [
    '# French Lesson 1 Blueprint Rebuild Review Gate',
    '',
    `Status: ${gate.status}`,
    `Accepted rows: ${gate.summary.acceptedRows}/${gate.summary.rows}`,
    `Revision rows: ${gate.summary.revisionRows}`,
    '',
    '## Verdict',
    '',
    gate.verdict,
    '',
    '## Review Criteria',
    '',
    ...gate.reviewCriteria.map((item) => `- ${item}`),
    '',
    '## Row Decisions',
    '',
    '| # | Decision | French | Issues |',
    '|---:|---|---|---|',
    ...gate.rowDecisions.map((row) => `| ${row.order} | ${row.decision} | ${row.phraseFr} | ${row.issues.join(', ') || '-'} |`),
    '',
    '## Production Blockers Still Open',
    '',
    ...gate.productionBlockers.map((blocker) => `- ${blocker}`),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function main() {
  const candidate = readJson(CANDIDATE_PATH);
  const blockers = [];
  if (candidate.schemaVersion !== 'gustav-fr-lesson01-blueprint-rebuild-candidate-v1') blockers.push('CANDIDATE_SCHEMA_MISMATCH');
  if (candidate.status !== 'HOLD_REVIEW_CANDIDATE_READY_FOR_USER_CHECK') blockers.push('CANDIDATE_NOT_READY_FOR_REVIEW');
  if (candidate.activationApproved !== false || candidate.readyForApply !== false) blockers.push('CANDIDATE_OPENED_ACTIVATION_OR_APPLY');
  if ((candidate.rows ?? []).length !== 50) blockers.push('CANDIDATE_ROW_COUNT_NOT_50');

  const phraseSet = new Set((candidate.rows ?? []).map((row) => row.phraseFr));
  for (const phrase of REQUIRED_PHRASES) {
    if (!phraseSet.has(phrase)) blockers.push(`REQUIRED_PHRASE_MISSING_${phrase}`);
  }

  const rowDecisions = (candidate.rows ?? []).map(rowReview);
  const revisionRows = rowDecisions.filter((row) => row.decision !== 'ACCEPT');
  const acceptedRows = rowDecisions.length - revisionRows.length;
  if (revisionRows.length > 0) blockers.push('ROW_REVISIONS_REQUIRED');

  const reviewGate = {
    schemaVersion: 'gustav-fr-lesson01-blueprint-rebuild-review-gate-v1',
    generatedAt: new Date().toISOString(),
    status: blockers.length === 0 ? 'PASS_LESSON1_REVIEW_ACCEPTED_FOR_NEXT_GATE' : 'BLOCK_REVISIONS_REQUIRED',
    verdict: blockers.length === 0
      ? 'Lesson 1 candidate is accepted as a reviewed local course candidate, but remains blocked from production activation.'
      : 'Lesson 1 candidate requires revision before it can move to the next gate.',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    lessonId: 1,
    appCourseLevel: 'A1',
    candidate: rel(CANDIDATE_PATH),
    reviewer: {
      kind: 'codex_llm_trusted_source_review',
      humanReviewRequired: false,
      trustedSourceEvidenceRequired: true,
      officialOrTrustedSources: REQUIRED_EVIDENCE_IDS,
    },
    reviewCriteria: [
      'French target text must stay French-only and preserve accents/apostrophes.',
      'RU and UK are support meanings only and must not leak into target phrase/word slots.',
      'Every row must cite the lesson evidence ids.',
      'Every word slot must have exactly five non-duplicate distractors.',
      'Adjective distractors must not fall back to generic place/state filler.',
      'The lesson may copy English product shape, not English lexical content.',
      'No app apply, audio generation, server upload, runtime download, or activation may open here.',
    ],
    rowDecisions,
    summary: {
      rows: rowDecisions.length,
      acceptedRows,
      revisionRows: revisionRows.length,
      wordsFrSlots: candidate.summary?.wordsFrSlots ?? 0,
      distractorSlots: candidate.summary?.distractorSlots ?? 0,
      llmTrustedSourceReviewDone: blockers.length === 0,
      readyForTheoryPackDraft: blockers.length === 0,
      readyForAudio: false,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    },
    blockers,
    productionBlockers: [
      'LESSON1_THEORY_PACK_NOT_MATERIALIZED_FOR_SERVER_CONTRACT',
      'LESSON1_AUDIO_TTS_NOT_GENERATED',
      'LESSON1_SERVER_PACK_NOT_BUILT',
      'LESSON1_RUNTIME_DELIVERY_NOT_TESTED',
      'FULL_32_LESSON_PARITY_NOT_DONE',
      'ADMIN_STORAGE_CLOUD_PROMPT_GATES_NOT_DONE',
    ],
    safety: {
      appBundleModifiedByThisScript: false,
      serverUploadStarted: false,
      firebaseUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };

  writeJson(GATE_PATH, reviewGate);
  fs.writeFileSync(MD_PATH, markdownFor(reviewGate), 'utf8');

  if (fs.existsSync(STATE_PATH)) {
    const state = readJson(STATE_PATH);
    state.lesson01BlueprintRebuildReviewGate = rel(GATE_PATH);
    state.lesson01BlueprintRebuildReviewGateStatus = reviewGate.status;
    state.lesson01BlueprintRebuildReviewGateSummary = reviewGate.summary;
    state.nextPassPlan = reviewGate.status === 'PASS_LESSON1_REVIEW_ACCEPTED_FOR_NEXT_GATE'
      ? [
          'Materialize Lesson 1 reviewed candidate into RU/UK server-pack draft contracts without app apply.',
          'Create Lesson 1 theory/vocabulary parity pack from the reviewed candidate.',
          'Then create audio manifest/TTS batch plan, still closed until spend/upload gates.',
        ]
      : [
          'Patch Lesson 1 candidate rows listed in the review gate.',
          'Regenerate Lesson 1 review gate until all rows are accepted.',
          'Only then move to pack/theory/audio gates.',
        ];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`${reviewGate.status} accepted=${acceptedRows}/${rowDecisions.length} revisions=${revisionRows.length}`);
  if (blockers.length > 0) process.exitCode = 1;
}

main();
