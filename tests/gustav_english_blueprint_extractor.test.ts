import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const INVENTORY_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'english_blueprint', 'english_blueprint_inventory_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_english_blueprint_inventory.mjs');

describe('Gustav English blueprint extractor', () => {
  it('materializes the English app blueprint before French content parity can pass', () => {
    const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('FEATURE_SURFACES');
    expect(script).toContain('frenchBuildRule');
    expect(script).toContain('activationApproved: false');

    expect(inventory.schemaVersion).toBe('gustav-english-blueprint-inventory-v1');
    expect(inventory.status).toBe('PASS');
    expect(inventory.studyTarget).toBe('fr');
    expect(inventory.sourceStudyTarget).toBe('en');
    expect(inventory.activationApproved).toBe(false);
    expect(inventory.readyForApply).toBe(false);

    expect(inventory.courseLevels.levels).toEqual(['A1', 'A2', 'B1', 'B2']);
    expect(inventory.courseLevels.ranges).toEqual({
      A1: [1, 8],
      A2: [9, 18],
      B1: [19, 28],
      B2: [29, 32],
    });
    expect(inventory.lessonNameCounts).toMatchObject({ ru: 32, uk: 32, es: 32 });
    expect(inventory.lessonRows).toHaveLength(32);
    expect(inventory.summary.totalPhraseRowsObserved).toBe(1600);
    expect(inventory.summary.lessonsWith50Rows).toBe(32);
    expect(inventory.summary.lessonsWithPhraseExports).toBe(32);
    expect(inventory.summary.theoryLessonCount).toBe(32);
    expect(inventory.summary.mappedFeatureSurfaces).toBe(inventory.summary.featureSurfacesTotal);

    const coreLessons = inventory.featureSurfaces.find((surface: { id: string }) => surface.id === 'core_lessons');
    expect(coreLessons).toMatchObject({
      status: 'MAPPED',
      frenchBuildRule: expect.stringContaining('rebuild French phrases'),
    });
    expect(coreLessons.observedMarkers).toMatchObject({
      'english:': true,
      'russian:': true,
      'ukrainian:': true,
      wordsEn: true,
      distractors: true,
    });

    const aiPrompts = inventory.featureSurfaces.find((surface: { id: string }) => surface.id === 'ai_prompt_surfaces');
    expect(aiPrompts.status).toBe('MAPPED');
    expect(aiPrompts.frenchBuildRule).toContain('studyTarget=fr');

    expect(inventory.productionBlockers).toEqual(expect.arrayContaining([
      'FRENCH_BLUEPRINT_PLAN_NOT_MATERIALIZED_FOR_ALL_SURFACES',
      'FRENCH_CONTENT_NOT_YET_REBUILT_AGAINST_THIS_BLUEPRINT',
      'FRENCH_ACTIVATION_MUST_REMAIN_HOLD',
    ]));
    expect(inventory.safety).toMatchObject({
      productionAppFilesModifiedByThisScript: false,
      frenchContentModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    });
  });
});
