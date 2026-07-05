import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'core_lessons_32');
const PLAN_PATH = path.join(OUT_DIR, 'fr_lesson_cefr_reclassification_plan_v1.json');
const APP_LEVEL_GATE_PATH = path.join(OUT_DIR, 'fr_app_level_parity_gate_audit_v1.json');
const SURFACE_PLAN_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'english_blueprint', 'fr_blueprint_surface_parity_plan_v1.json');

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

function recommendedInternalBand(lessonId, appCourseLevel) {
  if (appCourseLevel === 'A1') return lessonId <= 4 ? 'A1.1' : 'A1.2';
  if (appCourseLevel === 'A2') return lessonId <= 13 ? 'A2.1' : 'A2.2';
  if (appCourseLevel === 'B1') return lessonId <= 23 ? 'B1.1' : 'B1.2';
  if (appCourseLevel === 'B2') return lessonId <= 30 ? 'B2.1' : 'B2.2';
  return null;
}

function buildMetadataPatch(row) {
  const recommendedBand = recommendedInternalBand(row.lessonId, row.appCourseLevel);
  const advancedCoverageRequired = row.appCourseLevel === 'B1' || row.appCourseLevel === 'B2';
  const currentBandTooLow =
    advancedCoverageRequired &&
    typeof row.internalFrenchBand === 'string' &&
    /^(A1|A2)\b/.test(row.internalFrenchBand);
  const blueprintParityStatus = currentBandTooLow
    ? 'hold_rebuild_or_evidence_required_for_app_level'
    : 'hold_pending_llm_source_review_and_surface_parity';

  return {
    lessonId: row.lessonId,
    ledgerPath: row.ledgerPath,
    materializationAllowedNow: false,
    currentMetadata: {
      internalFrenchBand: row.internalFrenchBand,
      ledgerAppMetadataPresent: row.ledgerAppMetadataPresent,
      cefrEvidencePresent: row.cefrEvidencePresent,
    },
    metadataToMaterialize: {
      appCourseLevel: row.appCourseLevel,
      appLevelRange: row.appLevelRange,
      internalFrenchBand: row.internalFrenchBand,
      recommendedInternalFrenchBand: recommendedBand,
      cefrEvidence: {
        required: true,
        source: 'existing sourceEvidence plus B1/B2 trusted source audit before apply',
      },
      blueprintParityStatus,
    },
    advancedCoverageRequired,
    reclassificationRequired: currentBandTooLow || !row.ledgerAppMetadataPresent,
    rebuildOrEvidenceRequired: currentBandTooLow,
    nextAction: currentBandTooLow
      ? 'review_or_rebuild_lesson_against_app_level_b1_b2'
      : 'materialize_app_level_metadata_after_review_gates',
  };
}

function main() {
  const generatedAt = new Date().toISOString();
  const appLevelGate = readJson(APP_LEVEL_GATE_PATH);
  const surfacePlan = readJson(SURFACE_PLAN_PATH);
  const blockers = [];
  const productionBlockers = [];

  if (appLevelGate.schemaVersion !== 'gustav-fr-app-level-parity-gate-audit-v1') blockers.push('APP_LEVEL_GATE_WRONG_SCHEMA');
  if (!Array.isArray(appLevelGate.lessonMappings) || appLevelGate.lessonMappings.length !== 32) blockers.push('APP_LEVEL_GATE_NOT_32_LESSONS');
  if (surfacePlan.schemaVersion !== 'gustav-fr-blueprint-surface-parity-plan-v1') blockers.push('SURFACE_PARITY_PLAN_WRONG_SCHEMA');

  const metadataPlan = (appLevelGate.lessonMappings ?? []).map(buildMetadataPatch);
  const materializationAllowedRows = metadataPlan.filter((row) => row.materializationAllowedNow).length;
  const reclassificationRequiredRows = metadataPlan.filter((row) => row.reclassificationRequired).length;
  const b1b2Rows = metadataPlan.filter((row) => row.advancedCoverageRequired).length;
  const b1b2RebuildOrEvidenceRows = metadataPlan.filter((row) => row.rebuildOrEvidenceRequired).length;

  if (materializationAllowedRows > 0) blockers.push('MATERIALIZATION_OPENED_UNEXPECTEDLY');
  if (reclassificationRequiredRows > 0) {
    productionBlockers.push({
      blockerId: 'FRENCH_LESSON_METADATA_RECLASSIFICATION_NOT_MATERIALIZED',
      lessonIds: metadataPlan.filter((row) => row.reclassificationRequired).map((row) => row.lessonId),
      requiredFields: ['appCourseLevel', 'appLevelRange', 'internalFrenchBand', 'cefrEvidence', 'blueprintParityStatus'],
    });
  }
  if (b1b2RebuildOrEvidenceRows > 0) {
    productionBlockers.push({
      blockerId: 'FRENCH_LESSONS_19_32_NEED_B1_B2_REBUILD_OR_EVIDENCE',
      lessonIds: metadataPlan.filter((row) => row.rebuildOrEvidenceRequired).map((row) => row.lessonId),
      evidence: 'Current internal French bands are lower than app B1/B2 expectations for lessons 19-32.',
    });
  }

  const plan = {
    schemaVersion: 'gustav-fr-lesson-cefr-reclassification-plan-v1',
    generatedAt,
    status: blockers.length > 0 ? 'BLOCK' : 'HOLD',
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    readyForApply: false,
    inputs: {
      appLevelParityGate: rel(APP_LEVEL_GATE_PATH),
      surfaceParityPlan: rel(SURFACE_PLAN_PATH),
    },
    policy: {
      thisScriptDoesNotModifyLedgers: true,
      materializationRequiresAcceptedRowsAndSurfaceGates: true,
      appCourseLevelIsProductContract: true,
      internalFrenchBandIsSecondaryMetadata: true,
    },
    metadataPlan,
    summary: {
      lessonCount: metadataPlan.length,
      materializationAllowedRows,
      reclassificationRequiredRows,
      b1b2Rows,
      b1b2RebuildOrEvidenceRows,
      blockers: blockers.length,
      productionBlockers: productionBlockers.length,
      activationApproved: false,
      readyForApply: false,
    },
    blockers,
    productionBlockers,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      frenchLedgersModifiedByThisScript: false,
      appApplyStarted: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(PLAN_PATH, plan);
  console.log(`${plan.status} ${rel(PLAN_PATH)} reclass=${reclassificationRequiredRows} b1b2=${b1b2Rows} rebuildOrEvidence=${b1b2RebuildOrEvidenceRows}`);
}

main();
