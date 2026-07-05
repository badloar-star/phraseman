import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const BLUEPRINT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'english_blueprint', 'english_lesson_surgical_blueprint_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_english_lesson_surgical_blueprint.mjs');

describe('Gustav English lesson surgical blueprint', () => {
  it('analyzes every English lesson, vocabulary slot, distractor shape, theory page, and drill family before French rebuild', () => {
    const blueprint = JSON.parse(fs.readFileSync(BLUEPRINT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('PEDAGOGY_NOTES');
    expect(script).toContain('parseWordSlots');
    expect(script).toContain('analyzeDistractors');
    expect(script).toContain('analyzeIrregularVerbs');
    expect(script).toContain('analyzePrepositions');

    expect(blueprint.schemaVersion).toBe('gustav-english-lesson-surgical-blueprint-v1');
    expect(blueprint.status).toBe('PASS');
    expect(blueprint.studyTarget).toBe('fr');
    expect(blueprint.sourceStudyTarget).toBe('en');
    expect(blueprint.activationApproved).toBe(false);
    expect(blueprint.readyForApply).toBe(false);

    expect(blueprint.lessons).toHaveLength(32);
    expect(blueprint.summary).toMatchObject({
      lessonCount: 32,
      lessonsWith50Rows: 32,
      totalPhraseRows: 1600,
      blockers: 0,
      activationApproved: false,
      readyForApply: false,
    });
    expect(blueprint.summary.totalWordsEnSlots).toBeGreaterThan(4000);
    expect(blueprint.summary.totalDistractorSlots).toBe(blueprint.summary.totalAnalyzedWordSlots);
    expect(blueprint.summary.lessonsUsingWordsFallback).toEqual([31]);
    expect(blueprint.summary.theoryLessons).toBe(32);
    expect(blueprint.summary.theorySections).toBeGreaterThan(100);

    const lesson1 = blueprint.lessons.find((lesson: { lessonId: number }) => lesson.lessonId === 1);
    expect(lesson1).toMatchObject({
      appCourseLevel: 'A1',
      englishTopic: 'Pronouns and to be affirmative',
    });
    expect(lesson1.sequencingReason).toContain('subject + am/is/are');
    expect(lesson1.phraseBlueprint.phraseRows).toBe(50);
    expect(lesson1.phraseBlueprint.sampleEnglishPhrases).toEqual(expect.arrayContaining(['I am here']));
    expect(lesson1.phraseBlueprint.categoryDistribution).toHaveProperty('pronoun');
    expect(lesson1.distractorBlueprint.averageDistractorsPerSlot).toBeGreaterThanOrEqual(4);

    const lesson29 = blueprint.lessons.find((lesson: { lessonId: number }) => lesson.lessonId === 29);
    expect(lesson29).toMatchObject({
      appCourseLevel: 'B2',
      englishTopic: 'Used to',
    });
    expect(lesson29.frenchNativeTransferRule).toContain('imparfait');
    expect(lesson29.phraseBlueprint.phraseRows).toBe(50);

    const theory29 = blueprint.theory.find((lesson: { lessonId: number }) => lesson.lessonId === 29);
    expect(theory29.sectionCount).toBeGreaterThan(0);
    expect(theory29.blockKinds).toHaveProperty('examples');
    expect(theory29.shapePrinciple).toContain('French theory must keep the same structured section');

    expect(blueprint.drills.irregularVerbs.glossaryCount).toBeGreaterThan(40);
    expect(blueprint.drills.irregularVerbs.portionSize).toBe(6);
    expect(blueprint.drills.irregularVerbs.principle).toContain('French must replace this with conjugation-family');

    expect(blueprint.drills.prepositions.taggedSlotDetection).toBe(true);
    expect(blueprint.drills.prepositions.autoOccurrenceDetection).toBe(true);
    expect(blueprint.drills.prepositions.explanationRules).toBeGreaterThan(10);
    expect(blueprint.drills.prepositions.principle).toContain('French prepositions');

    expect(blueprint.globalPrinciplesForFrench).toEqual(expect.arrayContaining([
      'Replace English irregular verbs and prepositions with French conjugation/preposition systems.',
    ]));
    expect(blueprint.productionBlockers).toEqual(expect.arrayContaining([
      'FRENCH_32_LESSON_CONTENT_MUST_BE_REBUILT_FROM_SURGICAL_BLUEPRINT',
      'FRENCH_WORDS_AND_DISTRACTORS_MUST_BE_NATIVE_PER_LESSON',
      'FRENCH_THEORY_MUST_BE_WRITTEN_IN_THE_SAME_SHAPE_FOR_32_LESSONS',
    ]));
    expect(blueprint.safety).toMatchObject({
      productionAppFilesModifiedByThisScript: false,
      frenchContentModifiedByThisScript: false,
      appApplyStarted: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });
  });
});
