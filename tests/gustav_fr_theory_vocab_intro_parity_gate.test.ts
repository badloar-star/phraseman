import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'theory', 'fr_theory_vocab_intro_parity_gate_v1.json');
const INTRO_PACK_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'intros', 'fr_lesson_intro_pack_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_theory_vocab_intro_parity_gate.mjs');
const APP_INTRO_FR_PATH = path.join(ROOT, 'app', 'lesson_intro_screens_fr.ts');

describe('Gustav French theory/vocabulary/intro parity gate', () => {
  it('proves all 32 lessons have French theory, vocabulary and server-pack intro candidates without app apply', () => {
    const gate = JSON.parse(fs.readFileSync(GATE_PATH, 'utf8'));
    const introPack = JSON.parse(fs.readFileSync(INTRO_PACK_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const appIntroSource = fs.readFileSync(APP_INTRO_FR_PATH, 'utf8');

    expect(script).toContain('server-pack-candidate');
    expect(script).toContain('appBundleIntroRegistryStillEmptyByDesign');
    expect(script).toContain('MOJIBAKE_PATTERN');

    expect(gate.schemaVersion).toBe('gustav-fr-theory-vocab-intro-parity-gate-v1');
    expect(gate.status).toBe('PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD');
    expect(gate.studyTarget).toBe('fr');
    expect(gate.activationApproved).toBe(false);
    expect(gate.globalFrenchActivationApproved).toBe(false);
    expect(gate.readyForAppApply).toBe(false);
    expect(gate.summary).toMatchObject({
      lessonsTotal: 32,
      lessonsPassing: 32,
      introScreensTotal: 96,
      serverPackCandidateWritten: true,
      appBundleIntroRegistryStillEmptyByDesign: true,
      activationApproved: false,
      globalFrenchStillHold: true,
    });
    expect(gate.summary.theorySectionsTotal).toBeGreaterThanOrEqual(160);
    expect(gate.summary.vocabularyItemsTotal).toBeGreaterThanOrEqual(2000);
    expect(gate.blockers).toEqual([]);

    for (const lesson of gate.lessons) {
      expect(lesson.status).toBe('PASS');
      expect(lesson.theorySections).toBeGreaterThanOrEqual(5);
      expect(lesson.vocabularyItems).toBeGreaterThanOrEqual(20);
      expect(lesson.introScreens).toBe(3);
      expect(lesson.candidateRows).toBe(50);
      expect(['A1', 'A2', 'B1', 'B2']).toContain(lesson.appCourseLevel);
    }

    expect(introPack).toMatchObject({
      schemaVersion: 'gustav-fr-lesson-intro-pack-v1',
      studyTarget: 'fr',
      targetContentLang: 'fr',
      surface: 'lesson_intro',
      delivery: 'server-pack-candidate',
      productionReady: false,
      activationApproved: false,
    });
    expect(introPack.screens).toHaveLength(96);
    expect(introPack.screens[0]).toMatchObject({
      lessonId: 1,
      screenId: 'fr_lesson_1_intro_1_concept',
      kind: 'concept',
      order: 1,
    });
    expect(introPack.screens[95]).toMatchObject({
      lessonId: 32,
      screenId: 'fr_lesson_32_intro_3_practice',
      kind: 'practice',
      order: 3,
    });
    for (const screen of introPack.screens) {
      expect(screen.titleRU).toBeTruthy();
      expect(screen.titleUK).toBeTruthy();
      expect(screen.linesRU.length).toBeGreaterThan(0);
      expect(screen.linesUK.length).toBeGreaterThan(0);
      expect(screen.examples.length).toBeGreaterThan(0);
      expect(screen.titleES).toBeUndefined();
      expect(screen.textES).toBeUndefined();
      expect(screen.linesES).toBeUndefined();
    }

    expect(appIntroSource).toContain('FRENCH_INTRO_SCREENS: Record<number, LessonIntroScreen[]> = {}');
    expect(gate.invariants).toMatchObject({
      theoryVocabFromFrenchNativeLessonPacks: true,
      introScreensGeneratedAsServerPackCandidate: true,
      appBundleNotModified: true,
      noEsUiFieldsForFrenchIntro: true,
      sourceLocaleSeparatedRuUk: true,
      noPlaceholdersOrMojibake: true,
      activationRemainsClosed: true,
    });
  });
});
