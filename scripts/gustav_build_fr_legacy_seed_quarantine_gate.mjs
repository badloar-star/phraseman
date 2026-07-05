import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'core_lessons_32');
const OUT_PATH = path.join(OUT_DIR, 'fr_legacy_seed_quarantine_gate_v1.json');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

const BLUEPRINT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'english_blueprint', 'english_lesson_surgical_blueprint_v1.json');
const WORK_ORDER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'core_lessons_32', 'fr_surgical_lesson_work_order_v1.json');
const REVIEW_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review');
const LESSONS_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons');
const MATERIALIZED_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized');

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

function exists(filePath) {
  return fs.existsSync(filePath);
}

function fileInfo(filePath) {
  if (!exists(filePath)) {
    return { path: rel(filePath), exists: false };
  }
  const stat = fs.statSync(filePath);
  return {
    path: rel(filePath),
    exists: true,
    bytes: stat.size,
    updatedAt: stat.mtime.toISOString(),
  };
}

function countRows(filePath) {
  if (!exists(filePath)) return 0;
  const json = readJson(filePath);
  if (Array.isArray(json)) return json.length;
  if (Array.isArray(json.rows)) return json.rows.length;
  if (Array.isArray(json.phrases)) return json.phrases.length;
  if (Array.isArray(json.items)) return json.items.length;
  return 0;
}

function listFiles(dirPath, predicate) {
  if (!exists(dirPath)) return [];
  return fs.readdirSync(dirPath, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(dirPath, entry.name);
      if (entry.isDirectory()) return listFiles(full, predicate);
      return predicate(full) ? [full] : [];
    })
    .sort();
}

function main() {
  const generatedAt = new Date().toISOString();
  const blockers = [];

  const blueprint = exists(BLUEPRINT_PATH) ? readJson(BLUEPRINT_PATH) : null;
  const workOrder = exists(WORK_ORDER_PATH) ? readJson(WORK_ORDER_PATH) : null;
  if (!blueprint || blueprint.schemaVersion !== 'gustav-english-lesson-surgical-blueprint-v1') {
    blockers.push('ENGLISH_SURGICAL_BLUEPRINT_MISSING');
  }
  if (!workOrder || workOrder.schemaVersion !== 'gustav-fr-surgical-lesson-work-order-v1') {
    blockers.push('FR_SURGICAL_WORK_ORDER_MISSING');
  }
  if (workOrder?.summary?.generationAllowedRows !== 0 || workOrder?.summary?.materializationAllowedRows !== 0) {
    blockers.push('SURGICAL_WORK_ORDER_UNEXPECTEDLY_ALLOWS_GENERATION_OR_MATERIALIZATION');
  }

  const reviewDrafts = [
    path.join(REVIEW_DIR, 'lesson01_full_review_draft.json'),
    path.join(REVIEW_DIR, 'lesson02_full_review_draft.json'),
  ].map((filePath) => ({
    ...fileInfo(filePath),
    rowCount: countRows(filePath),
    quarantineReason: 'Created before strict per-lesson English blueprint dissection; useful as evidence only, not final French lesson content.',
    productionUseAllowed: false,
    rebuildRequired: true,
  }));

  const ledgerFiles = listFiles(LESSONS_DIR, (filePath) => /lesson\d+_row_ledger\.json$/u.test(path.basename(filePath)));
  const materializedFiles = listFiles(MATERIALIZED_DIR, (filePath) => /lesson0[12].*\.(json|md)$/u.test(rel(filePath)));

  const totalLegacyLedgerRows = ledgerFiles.reduce((sum, filePath) => sum + countRows(filePath), 0);
  const expectedLegacyLedgerRows = 1600;
  if (ledgerFiles.length !== 32) blockers.push('LEGACY_LEDGER_SET_NOT_32_FILES');
  if (totalLegacyLedgerRows !== expectedLegacyLedgerRows) blockers.push('LEGACY_LEDGER_ROWS_NOT_1600');
  if (reviewDrafts.some((draft) => !draft.exists || draft.rowCount !== 50)) blockers.push('LEGACY_REVIEW_DRAFTS_NOT_PRESENT_WITH_50_ROWS');

  const quarantinedGroups = [
    {
      id: 'legacy_32_lesson_seed_ledgers',
      status: 'QUARANTINED_LEGACY_SEED',
      files: ledgerFiles.map(fileInfo),
      fileCount: ledgerFiles.length,
      rowCount: totalLegacyLedgerRows,
      productionUseAllowed: false,
      reason: 'Current 1600-row French seed set was not built from the completed surgical English blueprint and feature parity pass.',
    },
    {
      id: 'lesson01_02_review_and_materialized_candidates',
      status: 'QUARANTINED_LEGACY_SEED',
      files: [...reviewDrafts, ...materializedFiles.map(fileInfo)],
      fileCount: reviewDrafts.length + materializedFiles.length,
      rowCount: reviewDrafts.reduce((sum, draft) => sum + draft.rowCount, 0),
      productionUseAllowed: false,
      reason: 'Lesson 1/2 drafts and pack candidates are technical contour artifacts only; they must not be treated as final French course content.',
    },
  ];

  const nextRequiredBuild = {
    lessonId: 1,
    mode: 'BLUEPRINT_FIRST_REBUILD',
    mustInspectBeforeWriting: [
      'All 50 English lesson 1 rows.',
      'Every English lesson 1 word slot and distractor set.',
      'English lesson 1 theory/intro/vocabulary behavior.',
      'Trusted French A1 source evidence for native Lesson 1 sequencing.',
    ],
    mustCreateAfterInspection: [
      '50 new French-native phrases, not a translation pass.',
      'French wordsFr slots per phrase.',
      'French distractors by grammatical slot.',
      'RU and UK support meanings.',
      'Theory in the same product shape as English but explaining French.',
      'Vocabulary/drill hooks and review gates.',
    ],
    outputExpectationForUserReview: 'One readable Lesson 1 file with phrases, words, distractors, vocabulary/theory notes, and blockers before any app/server apply.',
  };

  const audit = {
    schemaVersion: 'gustav-fr-legacy-seed-quarantine-gate-v1',
    generatedAt,
    status: blockers.length > 0 ? 'BLOCK' : 'HOLD_QUARANTINED_LEGACY_SEED',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    activationApproved: false,
    readyForApply: false,
    verdict: 'Existing French lesson drafts are not production course content.',
    inputs: {
      englishSurgicalBlueprint: rel(BLUEPRINT_PATH),
      frenchSurgicalWorkOrder: rel(WORK_ORDER_PATH),
    },
    quarantinePolicy: {
      legacySeedMayBeReadAsEvidence: true,
      legacySeedMayBeUsedAsFinalLessonContent: false,
      legacySeedMayBeUploadedToServer: false,
      legacySeedMayBeUsedForAudioGeneration: false,
      legacySeedMayBeEnabledInRuntime: false,
      legacySeedMaySetActivationApproved: false,
      lessonRebuildMustStartFromEnglishBlueprint: true,
      copyProductShapeOnly: true,
      rebuildFrenchNatively: true,
    },
    quarantinedGroups,
    nextRequiredBuild,
    summary: {
      quarantinedGroups: quarantinedGroups.length,
      legacyLedgerFiles: ledgerFiles.length,
      legacyLedgerRows: totalLegacyLedgerRows,
      expectedLegacyLedgerRows,
      reviewDraftsChecked: reviewDrafts.length,
      reviewDraftRows: reviewDrafts.reduce((sum, draft) => sum + draft.rowCount, 0),
      materializedCandidateFilesQuarantined: materializedFiles.length,
      generationAllowedRows: 0,
      materializationAllowedRows: 0,
      audioGenerationAllowedRows: 0,
      serverUploadAllowedRows: 0,
      runtimeActivationAllowedRows: 0,
      activationApproved: false,
      readyForApply: false,
    },
    blockers,
    productionBlockers: [
      'FRENCH_LEGACY_SEED_CONTENT_QUARANTINED',
      'LESSON01_MUST_BE_REBUILT_FROM_SURGICAL_ENGLISH_BLUEPRINT',
      'LESSON02_MUST_BE_REBUILT_AFTER_LESSON01_PATTERN_IS_ACCEPTED',
      'NO_AUDIO_SERVER_RUNTIME_OR_ACTIVATION_FROM_LEGACY_SEED',
    ],
    safety: {
      productionAppFilesModifiedByThisScript: false,
      frenchRuntimeContentModifiedByThisScript: false,
      appApplyStarted: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };

  writeJson(OUT_PATH, audit);

  if (exists(STATE_PATH)) {
    const state = readJson(STATE_PATH);
    state.legacySeedQuarantineGate = rel(OUT_PATH);
    state.legacySeedQuarantineStatus = audit.status;
    state.legacySeedQuarantineSummary = audit.summary;
    state.lesson01FullReviewDraftStatus = 'QUARANTINED_LEGACY_SEED';
    state.lesson02FullReviewDraftStatus = 'QUARANTINED_LEGACY_SEED';
    state.nextPassPlan = [
      'Rebuild Lesson 1 from the surgical English blueprint, not from legacy French seed rows.',
      'Produce one readable Lesson 1 review file with 50 French-native phrases, wordsFr slots, distractors, RU/UK meanings, vocabulary notes, theory shape, and blockers.',
      'Run a Lesson 1 blueprint-parity gate before any audio, server pack, runtime delivery, app apply, or activation.',
    ];
    writeJson(STATE_PATH, state);
  }

  console.log(`${audit.status} ${rel(OUT_PATH)} legacyRows=${totalLegacyLedgerRows} materializedFiles=${materializedFiles.length}`);
  if (blockers.length > 0) process.exitCode = 1;
}

main();
