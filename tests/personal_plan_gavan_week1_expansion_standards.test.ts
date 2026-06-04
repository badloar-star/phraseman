import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import {
  buildGavanWeek1ExpansionStandards,
  GAVAN_WEEK1_EXPANSION_STANDARDS_PATH,
  validateGavanWeek1ExpansionStandards,
  writeGavanWeek1ExpansionStandards,
} from '../tools/personal_plan_gavan_week1_expansion_standards';

const GENERATED_AT = '2026-06-02T13:30:00.000Z';

describe('Gavan week 1 days 2-7 expansion standards', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_EXPANSION_STANDARDS_PATH)) {
      rmSync(GAVAN_WEEK1_EXPANSION_STANDARDS_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1ExpansionStandards({
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_EXPANSION_STANDARDS_PATH,
    });
  });

  it('builds a non-live standards artifact for Gavan week 1 days 2-7', () => {
    const standards = buildGavanWeek1ExpansionStandards({
      generatedAt: GENERATED_AT,
    });

    expect(standards).toEqual(expect.objectContaining({
      kind: 'gavan_week1_expansion_standards',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      liveIntegration: false,
      contentStatus: 'standards_only_not_final_exercises',
    }));
    expect(standards.days.map((day) => day.dayIndex)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(standards.days.every((day) => day.finalExerciseCopyWritten === false)).toBe(true);
  });

  it('keeps the week universal socially safe and not anchored to personal data or narrow scenarios', () => {
    const standards = buildGavanWeek1ExpansionStandards({
      generatedAt: GENERATED_AT,
    });

    const allForbidden = standards.days.flatMap((day) => day.forbiddenAnchors);
    expect(allForbidden).toEqual(expect.arrayContaining([
      'exact_name',
      'phone_number',
      'email_address',
      'apartment_viewing',
      'rent_documents',
      'doctor_appointment',
      'bank_card_problem',
    ]));
    expect(standards.days.every((day) => day.socialSafety === 'universal_public_everyday')).toBe(true);
    expect(standards.days.every((day) => day.mustAvoidPersonalIdentityData)).toBe(true);
  });

  it('requires varied exercise formats across days 2-7', () => {
    const standards = buildGavanWeek1ExpansionStandards({
      generatedAt: GENERATED_AT,
    });

    const exerciseTypes = new Set(
      standards.days.flatMap((day) => day.exerciseSlots.map((slot) => slot.exerciseType)),
    );
    expect(exerciseTypes.size).toBeGreaterThanOrEqual(7);
    expect(exerciseTypes).toEqual(expect.anything());
    expect([...exerciseTypes]).toEqual(expect.arrayContaining([
      'phrase_build',
      'missing_word',
      'natural_choice',
      'active_recall',
      'listening_choice',
      'pronunciation_shadow',
      'micro_dialogue',
    ]));
  });

  it('supports only the four onboarding minute choices with progressive load', () => {
    const standards = buildGavanWeek1ExpansionStandards({
      generatedAt: GENERATED_AT,
    });

    standards.days.forEach((day) => {
      expect(Object.keys(day.loadByMinutes)).toEqual(['5', '10', '15', '20']);
      expect(day.loadByMinutes[5].targetMinutes).toBeLessThanOrEqual(5);
      expect(day.loadByMinutes[10].targetMinutes).toBeLessThanOrEqual(10);
      expect(day.loadByMinutes[15].targetMinutes).toBeLessThanOrEqual(15);
      expect(day.loadByMinutes[20].targetMinutes).toBeLessThanOrEqual(20);
      expect(day.loadByMinutes[5].slotCount).toBeLessThan(day.loadByMinutes[20].slotCount);
    });
  });

  it('marks audio and pronunciation as required but not generated', () => {
    const standards = buildGavanWeek1ExpansionStandards({
      generatedAt: GENERATED_AT,
    });

    standards.days.forEach((day) => {
      expect(day.audioPolicy.required).toBe(true);
      expect(day.audioPolicy.assetStatus).toBe('not_generated');
      expect(day.pronunciationPolicy.required).toBe(true);
      expect(day.pronunciationPolicy.scoringStatus).toBe('not_built');
      expect(day.pronunciationPolicy.mustNotClaimFinalScoring).toBe(true);
    });
  });

  it('requires explanation cards for every new word and first-seen construction', () => {
    const standards = buildGavanWeek1ExpansionStandards({
      generatedAt: GENERATED_AT,
    });

    standards.days.forEach((day) => {
      expect(day.explanationPolicy.requiredForEveryNewWord).toBe(true);
      expect(day.explanationPolicy.requiredForEveryFirstSeenConstruction).toBe(true);
      expect(day.explanationPolicy.mustNotExplainUnknownWrongOptions).toBe(true);
      expect(day.prerequisitePolicy.mustReferenceKnownLessonBeforeNewConstruction).toBe(true);
      expect(day.prerequisitePolicy.allowedPrerequisiteSource).toEqual([
        'lesson_1_to_be_intro',
        'gavan_day1_certified_basics',
      ]);
    });
  });

  it('passes its own quality gate and catches corrupted standards', () => {
    const standards = buildGavanWeek1ExpansionStandards({
      generatedAt: GENERATED_AT,
    });

    expect(validateGavanWeek1ExpansionStandards(standards)).toEqual({
      valid: true,
      issues: [],
    });

    const corrupted = {
      ...standards,
      days: standards.days.map((day, index) => (
        index === 0
          ? {
            ...day,
            forbiddenAnchors: [],
            exerciseSlots: [
              {
                id: 'only-one-format',
                exerciseType: 'phrase_build',
                purpose: 'Too thin.',
                finalCopyAllowed: false,
              },
            ],
            audioPolicy: {
              ...day.audioPolicy,
              assetStatus: 'generated',
            },
          }
          : day
      )),
    };

    const result = validateGavanWeek1ExpansionStandards(corrupted);
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'missing_forbidden_anchor' }),
      expect.objectContaining({ code: 'exercise_variety_too_low' }),
      expect.objectContaining({ code: 'audio_marked_generated' }),
    ]));
  });

  it('writes deterministic standards JSON only under temp or report roots', () => {
    const result = writeGavanWeek1ExpansionStandards({
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_EXPANSION_STANDARDS_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-days2-7-expansion-standards.json',
    ));
    expect(existsSync(GAVAN_WEEK1_EXPANSION_STANDARDS_PATH)).toBe(true);

    const parsed = JSON.parse(readFileSync(GAVAN_WEEK1_EXPANSION_STANDARDS_PATH, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_expansion_standards');
    expect(parsed.days).toHaveLength(6);
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1ExpansionStandards({
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-standards.json'),
    });
    const toolsResult = writeGavanWeek1ExpansionStandards({
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-standards.json'),
    });
    const testsResult = writeGavanWeek1ExpansionStandards({
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-standards.json'),
    });

    expect(appResult.valid).toBe(false);
    expect(toolsResult.valid).toBe(false);
    expect(testsResult.valid).toBe(false);
    expect(appResult.issues[0].code).toBe('target_path_not_allowed');
    expect(toolsResult.issues[0].code).toBe('target_path_not_allowed');
    expect(testsResult.issues[0].code).toBe('target_path_not_allowed');
  });

  it('does not import or mutate live app routes catalog quiz UI storage audio scoring or navigation', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_expansion_standards.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz/);
  });
});
