import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'core_lessons_32');
const AUDIT_PATH = path.join(OUT_DIR, 'fr_app_level_parity_gate_audit_v1.json');

const SOURCE_PATHS = {
  courseLevels: path.join(ROOT, 'app', 'course_levels.ts'),
  builderInputs: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'core_lessons_32', 'fr_lesson_builder_inputs_v1.json'),
};

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function extractCourseLevels(source) {
  const levelsMatch = source.match(/COURSE_LEVELS\s*=\s*\[([^\]]+)\]/);
  const levels = levelsMatch
    ? [...levelsMatch[1].matchAll(/'([^']+)'/g)].map((match) => match[1])
    : [];
  const ranges = {};
  for (const match of source.matchAll(/\b(A1|A2|B1|B2)\s*:\s*\[(\d+),\s*(\d+)\]/g)) {
    ranges[match[1]] = [Number(match[2]), Number(match[3])];
  }
  return { levels, ranges };
}

function appLevelForLesson(lessonId, ranges) {
  for (const [level, [from, to]] of Object.entries(ranges)) {
    if (lessonId >= from && lessonId <= to) return level;
  }
  return null;
}

function hasAnyKeyDeep(value, keys) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some((item) => hasAnyKeyDeep(item, keys));
  for (const key of Object.keys(value)) {
    if (keys.includes(key)) return true;
    if (hasAnyKeyDeep(value[key], keys)) return true;
  }
  return false;
}

function main() {
  const generatedAt = new Date().toISOString();
  const courseLevelSource = readText(SOURCE_PATHS.courseLevels);
  const builderInputs = readJson(SOURCE_PATHS.builderInputs);
  const appLevels = extractCourseLevels(courseLevelSource);
  const expectedRanges = { A1: [1, 8], A2: [9, 18], B1: [19, 28], B2: [29, 32] };

  const blockers = [];
  const productionBlockers = [];
  const lessonMappings = [];

  if (JSON.stringify(appLevels.levels) !== JSON.stringify(['A1', 'A2', 'B1', 'B2'])) blockers.push('APP_LEVEL_LIST_MISMATCH');
  if (JSON.stringify(appLevels.ranges) !== JSON.stringify(expectedRanges)) blockers.push('APP_LEVEL_RANGE_MISMATCH');
  if (builderInputs.studyTarget !== 'fr') blockers.push('BUILDER_INPUT_STUDY_TARGET_NOT_FR');
  if (!Array.isArray(builderInputs.lessons) || builderInputs.lessons.length !== 32) blockers.push('FRENCH_BUILDER_INPUTS_NOT_32_LESSONS');

  for (const lesson of builderInputs.lessons ?? []) {
    const lessonId = Number(lesson.lessonId);
    const ledgerPath = path.join(ROOT, lesson.outputLedgerPath ?? '');
    const ledgerExists = fs.existsSync(ledgerPath);
    const ledger = ledgerExists ? readJson(ledgerPath) : null;
    const rows = Array.isArray(ledger?.rows) ? ledger.rows : [];
    const appCourseLevel = appLevelForLesson(lessonId, appLevels.ranges);
    const appLevelRange = appCourseLevel ? appLevels.ranges[appCourseLevel] : null;
    const internalFrenchBand = lesson.cefrBand ?? ledger?.cefrBand ?? null;
    const ledgerAppMetadataPresent = ledger ? hasAnyKeyDeep(ledger, ['appCourseLevel', 'appLevelRange', 'internalFrenchBand', 'blueprintParityStatus']) : false;
    const sourceEvidenceCount = Array.isArray(ledger?.sourceEvidence) ? ledger.sourceEvidence.length : 0;
    const cefrEvidencePresent = sourceEvidenceCount > 0 || hasAnyKeyDeep(ledger, ['cefrEvidence']);
    const appLevelRequiresAdvancedProof = appCourseLevel === 'B1' || appCourseLevel === 'B2';
    const internalBandLooksLowerThanAppLevel =
      appLevelRequiresAdvancedProof && typeof internalFrenchBand === 'string' && /^(A1|A2)\b/.test(internalFrenchBand);

    lessonMappings.push({
      lessonId,
      appCourseLevel,
      appLevelRange,
      internalFrenchBand,
      builderAction: lesson.action ?? null,
      targetConcepts: lesson.targetConcepts ?? [],
      targetGrammarFocus: lesson.targetGrammarFocus ?? [],
      targetVocabularyFocus: lesson.targetVocabularyFocus ?? [],
      ledgerPath: lesson.outputLedgerPath ?? null,
      ledgerExists,
      ledgerRows: rows.length,
      expectedLedgerRows: 50,
      ledgerAppMetadataPresent,
      cefrEvidencePresent,
      sourceEvidenceCount,
      blueprintParityStatus: ledgerAppMetadataPresent ? 'metadata_materialized' : 'metadata_missing_in_ledger',
      advancedCoverageStatus: internalBandLooksLowerThanAppLevel ? 'needs_b1_b2_rebuild_or_evidence' : 'not_blocked_by_internal_band',
    });
  }

  const missingLedgers = lessonMappings.filter((row) => !row.ledgerExists);
  const incompleteRowCounts = lessonMappings.filter((row) => row.ledgerRows !== 50);
  const missingAppLevels = lessonMappings.filter((row) => !row.appCourseLevel);
  const missingLedgerAppMetadata = lessonMappings.filter((row) => !row.ledgerAppMetadataPresent);
  const advancedNotProven = lessonMappings.filter((row) => row.advancedCoverageStatus === 'needs_b1_b2_rebuild_or_evidence');
  const missingCefrEvidence = lessonMappings.filter((row) => !row.cefrEvidencePresent);

  if (missingLedgers.length > 0) blockers.push('FRENCH_LEDGER_FILE_MISSING');
  if (incompleteRowCounts.length > 0) blockers.push('FRENCH_LEDGER_ROW_COUNT_NOT_50');
  if (missingAppLevels.length > 0) blockers.push('FRENCH_APP_LEVEL_MAPPING_MISSING');

  if (missingLedgerAppMetadata.length > 0) {
    productionBlockers.push({
      blockerId: 'FRENCH_LEDGER_APP_LEVEL_METADATA_NOT_MATERIALIZED',
      lessonIds: missingLedgerAppMetadata.map((row) => row.lessonId),
      requiredFields: ['appCourseLevel', 'appLevelRange', 'internalFrenchBand', 'cefrEvidence', 'blueprintParityStatus'],
      nextUnblockArtifact: 'fr_lesson_cefr_reclassification',
    });
  }
  if (advancedNotProven.length > 0) {
    productionBlockers.push({
      blockerId: 'B1_B2_FRENCH_ADVANCED_COVERAGE_NOT_PROVEN',
      lessonIds: advancedNotProven.map((row) => row.lessonId),
      evidence: 'App levels B1/B2 map to lessons 19-32, but current internal French bands are still A1/A2 labels.',
      nextUnblockArtifact: 'fr_lesson_19_32_advanced_coverage_review',
    });
  }
  if (missingCefrEvidence.length > 0) {
    productionBlockers.push({
      blockerId: 'FRENCH_CEFR_EVIDENCE_NOT_MATERIALIZED_FOR_ALL_LESSONS',
      lessonIds: missingCefrEvidence.map((row) => row.lessonId),
      nextUnblockArtifact: 'fr_lesson_cefr_evidence_index',
    });
  }

  const status = blockers.length > 0 ? 'BLOCK' : productionBlockers.length > 0 ? 'HOLD' : 'PASS';
  const audit = {
    schemaVersion: 'gustav-fr-app-level-parity-gate-audit-v1',
    generatedAt,
    status,
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    readyForApply: false,
    appLevels,
    expectedAppLevels: expectedRanges,
    lessonMappings,
    summary: {
      lessonCount: lessonMappings.length,
      totalLedgerRows: lessonMappings.reduce((sum, row) => sum + row.ledgerRows, 0),
      lessonsWith50Rows: lessonMappings.filter((row) => row.ledgerRows === 50).length,
      appLevelMappingPresent: missingAppLevels.length === 0,
      lessonsMappedToA1: lessonMappings.filter((row) => row.appCourseLevel === 'A1').length,
      lessonsMappedToA2: lessonMappings.filter((row) => row.appCourseLevel === 'A2').length,
      lessonsMappedToB1: lessonMappings.filter((row) => row.appCourseLevel === 'B1').length,
      lessonsMappedToB2: lessonMappings.filter((row) => row.appCourseLevel === 'B2').length,
      b1B2AppLessons: lessonMappings.filter((row) => row.appCourseLevel === 'B1' || row.appCourseLevel === 'B2').length,
      b1B2InternalBandNotProven: advancedNotProven.length,
      lessonsWithLedgerAppMetadata: lessonMappings.filter((row) => row.ledgerAppMetadataPresent).length,
      lessonsWithCefrEvidence: lessonMappings.filter((row) => row.cefrEvidencePresent).length,
      blockers: blockers.length,
      productionBlockers: productionBlockers.length,
      activationApproved: false,
      readyForApply: false,
    },
    blockers,
    productionBlockers,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      frenchContentModifiedByThisScript: false,
      appApplyStarted: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      storageMigrationAllowed: false,
      cloudSyncMigrationAllowed: false,
      productionApplyApproved: false,
    },
  };

  writeJson(AUDIT_PATH, audit);
  console.log(`${audit.status} ${rel(AUDIT_PATH)} blockers=${blockers.length} productionBlockers=${productionBlockers.length}`);
}

main();
