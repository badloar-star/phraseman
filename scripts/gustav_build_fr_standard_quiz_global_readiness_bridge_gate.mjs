import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const RUN_ID = '2026-07-04_fr_standard_quizzes_production_readiness_v1';
const RUN_BUILD = path.join(ROOT, 'docs', 'gustav', 'runs', RUN_ID, 'build');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'quizzes');
const OUT_PATH = path.join(OUT_DIR, 'fr_standard_quiz_global_readiness_bridge_gate_v1.json');

const FINAL_GATE_PATH = path.join(RUN_BUILD, 'fr_standard_quizzes_production_final_gate.json');
const PROGRESS_PATH = path.join(RUN_BUILD, 'fr_standard_quizzes_production_progress_report.json');
const RU_PAYLOAD_PATH = path.join(RUN_BUILD, 'fr_standard_quizzes_runtime_payload_ru.dryrun.json');
const UK_PAYLOAD_PATH = path.join(RUN_BUILD, 'fr_standard_quizzes_runtime_payload_uk.dryrun.json');
const LESSON_REVIEW_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review');

const MOJIBAKE_PATTERN = /(Ð|Ñ|Ã|â€™|â€œ|â€|�)/u;
const PLACEHOLDER_PATTERN = /(placeholder|coming soon|not ready|на проверке|не готов|заглуш)/iu;

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizePhrase(value) {
  return String(value || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\s\p{P}]+/gu, ' ')
    .trim();
}

function loadLessonPhraseSet() {
  const phrases = new Set();
  for (const name of fs.readdirSync(LESSON_REVIEW_DIR)) {
    if (!/^lesson\d+_blueprint_rebuild_candidate_v1\.json$/.test(name)) continue;
    const candidate = readJson(path.join(LESSON_REVIEW_DIR, name));
    for (const row of candidate.rows || []) {
      const normalized = normalizePhrase(row.phraseFr || row.targetText || row.phrase);
      if (normalized) phrases.add(normalized);
    }
  }
  return phrases;
}

function validatePayload(payload, expectedSourceLocale, lessonPhrases) {
  const issues = [];
  const levels = {};
  const difficulties = {};
  let overlapWithLessons = 0;
  const overlapSamples = [];

  if (payload.studyTarget !== 'fr') issues.push('PAYLOAD_STUDY_TARGET_NOT_FR');
  if (payload.sourceLocale !== expectedSourceLocale) issues.push(`PAYLOAD_SOURCE_LOCALE_NOT_${expectedSourceLocale.toUpperCase()}`);
  if (payload.surface !== 'quiz') issues.push('PAYLOAD_SURFACE_NOT_QUIZ');
  if (payload.section !== 'standard') issues.push('PAYLOAD_SECTION_NOT_STANDARD');
  if (payload.activationApproved !== false) issues.push('PAYLOAD_ACTIVATION_NOT_FALSE');
  if (!Array.isArray(payload.entries) || payload.entries.length !== 840) issues.push('PAYLOAD_ENTRY_COUNT_NOT_840');

  for (const [index, row] of (payload.entries || []).entries()) {
    const id = row.questionId || row.entryId || `row-${index + 1}`;
    levels[row.level] = (levels[row.level] || 0) + 1;
    difficulties[row.difficulty] = (difficulties[row.difficulty] || 0) + 1;
    const choices = Array.isArray(row.choices) ? row.choices : [];
    const explanationsRu = Array.isArray(row.explanations_ru) ? row.explanations_ru : row.explanations;
    const explanationsUk = Array.isArray(row.explanations_uk) ? row.explanations_uk : row.explanationsUK;
    const textBlob = [
      row.sourcePrompt_ru,
      row.sourcePrompt_uk,
      row.targetText,
      row.answer,
      ...choices,
      ...(Array.isArray(explanationsRu) ? explanationsRu : []),
      ...(Array.isArray(explanationsUk) ? explanationsUk : []),
    ].join('\n');

    if (row.studyTarget !== 'fr') issues.push(`${id}:STUDY_TARGET_NOT_FR`);
    if (row.sourceLocale !== expectedSourceLocale) issues.push(`${id}:SOURCE_LOCALE_MISMATCH`);
    if (row.surface !== 'quiz' || row.section !== 'standard') issues.push(`${id}:SURFACE_SECTION_MISMATCH`);
    if (row.quizItemType !== 'standard_mcq_full_sentence') issues.push(`${id}:NOT_FULL_SENTENCE`);
    if (choices.length !== 4) issues.push(`${id}:CHOICES_NOT_4`);
    if (!Number.isInteger(row.correct) || row.correct < 0 || row.correct >= choices.length) issues.push(`${id}:CORRECT_INDEX_INVALID`);
    if (choices.length === 4 && row.answer !== choices[row.correct]) issues.push(`${id}:ANSWER_DOES_NOT_MATCH_CORRECT_CHOICE`);
    if (!Array.isArray(explanationsRu) || explanationsRu.length !== 4) issues.push(`${id}:RU_EXPLANATIONS_NOT_4`);
    if (!Array.isArray(explanationsUk) || explanationsUk.length !== 4) issues.push(`${id}:UK_EXPLANATIONS_NOT_4`);
    if (!Array.isArray(row.officialSourceCoverage) || row.officialSourceCoverage.length === 0) issues.push(`${id}:OFFICIAL_SOURCE_COVERAGE_MISSING`);
    if (row.activationApproved !== false) issues.push(`${id}:ROW_ACTIVATION_NOT_FALSE`);
    if (MOJIBAKE_PATTERN.test(textBlob)) issues.push(`${id}:MOJIBAKE`);
    if (PLACEHOLDER_PATTERN.test(textBlob)) issues.push(`${id}:PLACEHOLDER_TEXT`);

    const normalizedTarget = normalizePhrase(row.targetText);
    if (lessonPhrases.has(normalizedTarget)) {
      overlapWithLessons += 1;
      if (overlapSamples.length < 10) overlapSamples.push(row.targetText);
    }
  }

  return {
    sourceLocale: expectedSourceLocale,
    entries: payload.entries?.length ?? 0,
    levels,
    difficulties,
    overlapWithLessons,
    overlapSamples,
    issues: issues.slice(0, 50),
    issueCount: issues.length,
  };
}

function main() {
  const generatedAt = new Date().toISOString();
  const finalGate = readJson(FINAL_GATE_PATH);
  const progress = readJson(PROGRESS_PATH);
  const ruPayload = readJson(RU_PAYLOAD_PATH);
  const ukPayload = readJson(UK_PAYLOAD_PATH);
  const lessonPhrases = loadLessonPhraseSet();
  const ruValidation = validatePayload(ruPayload, 'ru', lessonPhrases);
  const ukValidation = validatePayload(ukPayload, 'uk', lessonPhrases);
  const blockers = [];

  if (finalGate.status !== 'READY_FOR_EXPLICIT_ACTIVATION_APPROVAL') blockers.push('QUIZ_FINAL_GATE_NOT_READY_FOR_EXPLICIT_APPROVAL');
  if (finalGate.productionReady !== true) blockers.push('QUIZ_FINAL_GATE_PRODUCTION_READY_NOT_TRUE');
  if (finalGate.activationApproved !== false) blockers.push('QUIZ_FINAL_GATE_ACTIVATION_NOT_FALSE');
  if (progress.summary?.contentRows !== 840 || progress.summary?.contentRowsAccepted !== 840) blockers.push('QUIZ_PROGRESS_COUNTS_NOT_840_ACCEPTED');
  if (ruValidation.issueCount > 0) blockers.push('RU_PAYLOAD_HARD_VALIDATION_FAILED');
  if (ukValidation.issueCount > 0) blockers.push('UK_PAYLOAD_HARD_VALIDATION_FAILED');
  if (ruValidation.overlapWithLessons > 0 || ukValidation.overlapWithLessons > 0) blockers.push('QUIZ_PAYLOAD_OVERLAPS_CORE_LESSON_PHRASES');

  const gate = {
    schemaVersion: 'gustav-fr-standard-quiz-global-readiness-bridge-gate-v1',
    generatedAt,
    status: blockers.length === 0 ? 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD' : 'BLOCK',
    studyTarget: 'fr',
    surface: 'quiz',
    section: 'standard',
    runId: RUN_ID,
    activationApproved: false,
    globalFrenchActivationApproved: false,
    readyForAppApply: false,
    inputs: {
      finalGate: rel(FINAL_GATE_PATH),
      progress: rel(PROGRESS_PATH),
      ruPayload: rel(RU_PAYLOAD_PATH),
      ukPayload: rel(UK_PAYLOAD_PATH),
      lessonReviewDir: rel(LESSON_REVIEW_DIR),
    },
    summary: {
      quizRowsPerLocale: 840,
      totalRuntimeRows: 1680,
      acceptedContentRows: progress.summary?.contentRowsAccepted,
      lessonPhrasesCompared: lessonPhrases.size,
      ruOverlapWithCoreLessons: ruValidation.overlapWithLessons,
      ukOverlapWithCoreLessons: ukValidation.overlapWithLessons,
      ruIssueCount: ruValidation.issueCount,
      ukIssueCount: ukValidation.issueCount,
      finalGateStatus: finalGate.status,
      quizSurfaceProductionReadyForApproval: finalGate.productionReady === true,
      activationApproved: false,
      globalFrenchStillHold: true,
    },
    validations: {
      ru: ruValidation,
      uk: ukValidation,
    },
    invariants: {
      noLessonRowFanout: ruValidation.overlapWithLessons === 0 && ukValidation.overlapWithLessons === 0,
      fullSentenceMcqOnly: true,
      fourChoicesAndFourExplanations: ruValidation.issueCount === 0 && ukValidation.issueCount === 0,
      sourceLocaleSeparated: true,
      officialSourceCoverageRequired: true,
      noMojibakeOrPlaceholders: ruValidation.issueCount === 0 && ukValidation.issueCount === 0,
      activationRemainsClosed: true,
    },
    blockers,
    nextRequiredGlobalSteps: [
      'Keep French global activation HOLD until lessons/audio/server/runtime/admin/storage/cloud/AI/non-lesson surfaces all pass.',
      'Use this gate as evidence that standard quiz banks can be removed from the native-bank-not-materialized blocker list.',
      'Do not upload or enable runtime downloads from this gate alone.',
    ],
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(gate, null, 2)}\n`, 'utf8');
  console.log(`${gate.status} ${rel(OUT_PATH)} rows=${gate.summary.totalRuntimeRows} overlap=${ruValidation.overlapWithLessons + ukValidation.overlapWithLessons} issues=${ruValidation.issueCount + ukValidation.issueCount}`);
}

main();
