import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const PLAN_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'english_blueprint', 'fr_blueprint_surface_parity_plan_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_blueprint_surface_parity_gate.mjs');

describe('Gustav French blueprint surface parity plan', () => {
  it('maps every English surface to a French-native build plan without approving production', () => {
    const plan = JSON.parse(fs.readFileSync(PLAN_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('SURFACE_PLANS');
    expect(script).toContain('Do not translate or fan out English rows as final French content.');
    expect(script).toContain('serverPackDeliveryRequiredBeforeProduction');

    expect(plan.schemaVersion).toBe('gustav-fr-blueprint-surface-parity-plan-v1');
    expect(plan.status).toBe('HOLD');
    expect(plan.studyTarget).toBe('fr');
    expect(plan.sourceStudyTarget).toBe('en');
    expect(plan.activationApproved).toBe(false);
    expect(plan.readyForApply).toBe(false);

    expect(plan.invariants).toMatchObject({
      copyShapeNotEnglishContent: true,
      rebuildFrenchNatively: true,
      appLevelsMustRemainA1A2B1B2: true,
      internalFrenchBandsAreMetadataOnly: true,
      noLessonRowFanoutAsFeatureParity: true,
      serverPackDeliveryRequiredBeforeProduction: true,
    });
    expect(plan.summary.surfacesTotal).toBe(12);
    expect(plan.summary.surfacesPlanned).toBe(12);
    expect(plan.summary.englishBlueprintSurfacesMapped).toBe(12);
    expect(plan.summary.productionBlockers).toBeGreaterThanOrEqual(12);
    expect(plan.summary.blockers).toBe(0);

    const coreLessons = plan.surfacePlan.find((surface: { id: string }) => surface.id === 'core_lessons');
    expect(coreLessons).toMatchObject({
      englishBlueprintStatus: 'MAPPED',
      parityStatus: 'PLANNED_HOLD',
      forbiddenShortcut: 'Do not translate or fan out English rows as final French content.',
    });
    expect(coreLessons.copyProductContract).toEqual(expect.arrayContaining(['32 lessons', '50 rows per lesson']));
    expect(coreLessons.rebuildNatively).toEqual(expect.arrayContaining(['French scope and sequence', 'French phrases', 'French distractors']));
    expect(coreLessons.productionBlockers).toEqual(expect.arrayContaining([
      'LLM_OFFICIAL_SOURCE_REVIEW_INCOMPLETE',
      'B1_B2_COVERAGE_NOT_PROVEN',
    ]));

    const quiz = plan.surfacePlan.find((surface: { id: string }) => surface.id === 'quiz_surfaces');
    expect(quiz.rebuildNatively).toEqual(expect.arrayContaining(['French-native quiz banks']));
    expect(quiz.productionBlockers).toContain('FRENCH_QUIZZES_NOT_PROVEN_AS_NATIVE_BANKS');

    const prompts = plan.surfacePlan.find((surface: { id: string }) => surface.id === 'ai_prompt_surfaces');
    expect(prompts.copyProductContract).toEqual(expect.arrayContaining(['target-language cache keys', 'rejected-output blocking']));
    expect(prompts.rebuildNatively).toEqual(expect.arrayContaining(['French prompt variants', 'French grammar rubric']));

    expect(plan.productionBlockers).toEqual(expect.arrayContaining([
      'FRENCH_THEORY_NOT_MATERIALIZED_FOR_32_LESSONS',
      'FRENCH_ARENA_QUESTION_BANK_NOT_MATERIALIZED',
      'FRENCH_AI_PROMPT_PACKS_NOT_MATERIALIZED_FOR_ALL_SURFACES',
      'SERVER_RUNTIME_ADMIN_STORAGE_CLOUD_NOT_READY_FOR_APPLY',
    ]));
    expect(plan.safety).toMatchObject({
      productionAppFilesModifiedByThisScript: false,
      frenchContentModifiedByThisScript: false,
      appApplyStarted: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });
  });
});
