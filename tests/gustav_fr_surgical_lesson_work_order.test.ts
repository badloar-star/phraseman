import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const WORK_ORDER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'core_lessons_32', 'fr_surgical_lesson_work_order_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_surgical_lesson_work_order.mjs');

describe('Gustav French surgical lesson work order', () => {
  it('turns the English surgical blueprint into strict no-generation work orders for all 32 French lessons', () => {
    const workOrder = JSON.parse(fs.readFileSync(WORK_ORDER_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('surgicalBeforeGeneration');
    expect(script).toContain('MUST_COMPLETE_SURGICAL_REVIEW_BEFORE_GENERATION');
    expect(script).toContain('requiredFrenchConcept');

    expect(workOrder.schemaVersion).toBe('gustav-fr-surgical-lesson-work-order-v1');
    expect(workOrder.status).toBe('HOLD');
    expect(workOrder.studyTarget).toBe('fr');
    expect(workOrder.sourceStudyTarget).toBe('en');
    expect(workOrder.activationApproved).toBe(false);
    expect(workOrder.readyForApply).toBe(false);
    expect(workOrder.policy).toMatchObject({
      surgicalBeforeGeneration: true,
      inspectEnglish50RowsPerLesson: true,
      copyProductShapeOnly: true,
      rebuildFrenchNatively: true,
      noDirectAppBundleProductionContent: true,
      noServerUploadOrRuntimeActivation: true,
    });

    expect(workOrder.lessonWorkOrders).toHaveLength(32);
    expect(workOrder.summary).toMatchObject({
      lessonCount: 32,
      phraseRowsTarget: 1600,
      generationAllowedRows: 0,
      materializationAllowedRows: 0,
      blockers: 0,
      activationApproved: false,
      readyForApply: false,
    });
    expect(workOrder.summary.p0Lessons).toEqual(expect.arrayContaining([19, 29, 30, 31, 32]));
    expect(workOrder.summary.lessonsRequiringB1B2RebuildOrEvidence).toHaveLength(14);

    const lesson1 = workOrder.lessonWorkOrders.find((row: { lessonId: number }) => row.lessonId === 1);
    expect(lesson1).toMatchObject({
      appCourseLevel: 'A1',
      englishTopic: 'Pronouns and to be affirmative',
      generationAllowedNow: false,
      materializationAllowedNow: false,
    });
    expect(lesson1.mustInspectBeforeWriting.allEnglish50Phrases).toBe(true);
    expect(lesson1.frenchMustCreate.phraseRows).toBe(50);
    expect(lesson1.frenchMustCreate.distractors).toEqual(expect.arrayContaining([
      'same French grammatical slot',
      'no sourceLocale words inside French target slots',
    ]));

    const lesson29 = workOrder.lessonWorkOrders.find((row: { lessonId: number }) => row.lessonId === 29);
    expect(lesson29).toMatchObject({
      appCourseLevel: 'B2',
      buildPriority: 'P0_B2_REBUILD_OR_EVIDENCE',
      rebuildOrEvidenceRequired: true,
    });
    expect(lesson29.requiredFrenchConcept).toContain('imparfait');
    expect(lesson29.productionBlockers).toContain('B1_B2_REBUILD_OR_EVIDENCE_REQUIRED');

    const lesson31 = workOrder.lessonWorkOrders.find((row: { lessonId: number }) => row.lessonId === 31);
    expect(lesson31.mustInspectBeforeWriting.englishWordSlotSource).toBe('words_fallback');
    expect(lesson31.requiredFrenchConcept).toContain('faire');

    expect(workOrder.drillWorkOrders.frenchConjugationReplacementForEnglishIrregulars.requiredFrenchReplacement).toContain('French conjugation families');
    expect(workOrder.drillWorkOrders.frenchPrepositionReplacementForEnglishPrepositions.requiredFrenchReplacement).toContain('French prepositions');
    expect(workOrder.productionBlockers).toEqual(expect.arrayContaining([
      'FRENCH_GENERATION_HOLD_UNTIL_SURGICAL_WORK_ORDER_IS_REVIEWED',
      'FRENCH_B1_B2_REBUILD_OR_EVIDENCE_REQUIRED_FOR_LESSONS_19_32',
      'FRENCH_DISTRACTOR_THEORY_VOCAB_DRILL_GATES_NOT_COMPLETE',
    ]));
    expect(workOrder.safety).toMatchObject({
      productionAppFilesModifiedByThisScript: false,
      frenchContentModifiedByThisScript: false,
      appApplyStarted: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });
  });
});
