import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const PLAN_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'core_lessons_32', 'fr_lesson_cefr_reclassification_plan_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_cefr_reclassification_plan.mjs');

describe('Gustav French lesson CEFR reclassification plan', () => {
  it('creates a no-apply metadata plan for all 32 French lessons and flags B1/B2 gaps', () => {
    const plan = JSON.parse(fs.readFileSync(PLAN_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('recommendedInternalBand');
    expect(script).toContain('materializationAllowedNow: false');
    expect(script).toContain('FRENCH_LESSONS_19_32_NEED_B1_B2_REBUILD_OR_EVIDENCE');

    expect(plan.schemaVersion).toBe('gustav-fr-lesson-cefr-reclassification-plan-v1');
    expect(plan.status).toBe('HOLD');
    expect(plan.studyTarget).toBe('fr');
    expect(plan.activationApproved).toBe(false);
    expect(plan.readyForApply).toBe(false);
    expect(plan.policy).toMatchObject({
      thisScriptDoesNotModifyLedgers: true,
      materializationRequiresAcceptedRowsAndSurfaceGates: true,
      appCourseLevelIsProductContract: true,
      internalFrenchBandIsSecondaryMetadata: true,
    });

    expect(plan.metadataPlan).toHaveLength(32);
    expect(plan.summary).toMatchObject({
      lessonCount: 32,
      materializationAllowedRows: 0,
      b1b2Rows: 14,
      blockers: 0,
      activationApproved: false,
      readyForApply: false,
    });
    expect(plan.summary.reclassificationRequiredRows).toBeGreaterThan(0);
    expect(plan.summary.b1b2RebuildOrEvidenceRows).toBeGreaterThan(0);

    expect(plan.metadataPlan.find((row: { lessonId: number }) => row.lessonId === 1).metadataToMaterialize).toMatchObject({
      appCourseLevel: 'A1',
      appLevelRange: [1, 8],
      recommendedInternalFrenchBand: 'A1.1',
    });
    expect(plan.metadataPlan.find((row: { lessonId: number }) => row.lessonId === 19).metadataToMaterialize).toMatchObject({
      appCourseLevel: 'B1',
      appLevelRange: [19, 28],
      recommendedInternalFrenchBand: 'B1.1',
      blueprintParityStatus: 'hold_rebuild_or_evidence_required_for_app_level',
    });
    expect(plan.metadataPlan.find((row: { lessonId: number }) => row.lessonId === 29).metadataToMaterialize).toMatchObject({
      appCourseLevel: 'B2',
      appLevelRange: [29, 32],
      recommendedInternalFrenchBand: 'B2.1',
      blueprintParityStatus: 'hold_rebuild_or_evidence_required_for_app_level',
    });

    expect(plan.productionBlockers.map((blocker: { blockerId: string }) => blocker.blockerId)).toEqual(expect.arrayContaining([
      'FRENCH_LESSON_METADATA_RECLASSIFICATION_NOT_MATERIALIZED',
      'FRENCH_LESSONS_19_32_NEED_B1_B2_REBUILD_OR_EVIDENCE',
    ]));
    expect(plan.safety).toMatchObject({
      productionAppFilesModifiedByThisScript: false,
      frenchLedgersModifiedByThisScript: false,
      appApplyStarted: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });
  });
});
