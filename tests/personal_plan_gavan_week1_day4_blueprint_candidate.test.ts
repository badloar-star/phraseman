import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import {
  buildGavanWeek1ExpansionStandards,
} from '../tools/personal_plan_gavan_week1_expansion_standards';
import {
  buildGavanWeek1Day4BlueprintCandidate,
  GAVAN_WEEK1_DAY4_BLUEPRINT_CANDIDATE_PATH,
  validateGavanWeek1Day4BlueprintCandidate,
  writeGavanWeek1Day4BlueprintCandidate,
} from '../tools/personal_plan_gavan_week1_day4_blueprint_candidate';

const GENERATED_AT = '2026-06-02T20:00:00.000Z';
const BROKEN_ENCODING_RE = /[\u00d0\u00d1\u00c2\u00e2\ufffd]/;

function standards() {
  return buildGavanWeek1ExpansionStandards({
    generatedAt: GENERATED_AT,
  });
}

describe('Gavan week 1 day 4 blueprint candidate', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_DAY4_BLUEPRINT_CANDIDATE_PATH)) {
      rmSync(GAVAN_WEEK1_DAY4_BLUEPRINT_CANDIDATE_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1Day4BlueprintCandidate(standards(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_DAY4_BLUEPRINT_CANDIDATE_PATH,
    });
  });

  it('builds a non-live day 4 only blueprint candidate from the week standards', () => {
    const candidate = buildGavanWeek1Day4BlueprintCandidate(standards(), {
      generatedAt: GENERATED_AT,
    });

    expect(candidate).toEqual(expect.objectContaining({
      kind: 'gavan_week1_day4_blueprint_candidate',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      dayId: 'gavan-week1-day4',
      dayIndex: 4,
      liveIntegration: false,
      candidateStatus: 'blueprint_candidate_not_final_exercises',
    }));
    expect(candidate.contentUnits).toHaveLength(4);
    expect(candidate.finalExerciseCopyWritten).toBe(false);
  });

  it('keeps day 4 universal and free of personal or narrow relocation anchors', () => {
    const candidate = buildGavanWeek1Day4BlueprintCandidate(standards(), {
      generatedAt: GENERATED_AT,
    });
    const serializedContent = JSON.stringify(candidate.contentUnits).toLowerCase();

    expect(candidate.socialSafety).toBe('universal_public_everyday');
    expect(candidate.mustAvoidPersonalIdentityData).toBe(true);
    expect(serializedContent).not.toMatch(
      /phone|email|apartment|rent|document|doctor|bank|087|@|\balex\b|beta8958/,
    );
    expect(serializedContent).not.toMatch(BROKEN_ENCODING_RE);
    expect(candidate.forbiddenAnchors).toEqual(expect.arrayContaining([
      'exact_name',
      'phone_number',
      'email_address',
      'apartment_viewing',
      'rent_documents',
      'doctor_appointment',
      'bank_card_problem',
    ]));
  });

  it('uses practical day 4 phrase candidates for asking for simple visible help', () => {
    const candidate = buildGavanWeek1Day4BlueprintCandidate(standards(), {
      generatedAt: GENERATED_AT,
    });

    expect(candidate.contentUnits.map((unit) => unit.english)).toEqual([
      'Could you help me with this?',
      "I'm not sure what to do.",
      'Is this the right place?',
      'Could you point me in the right direction?',
    ]);
    expect(candidate.contentUnits.every((unit) => unit.finalCopyApproved === false)).toBe(true);
  });

  it('includes varied day 4 exercise formats without claiming final exercises', () => {
    const candidate = buildGavanWeek1Day4BlueprintCandidate(standards(), {
      generatedAt: GENERATED_AT,
    });
    const exerciseTypes = candidate.exerciseBlueprints.map((exercise) => exercise.exerciseType);

    expect(exerciseTypes).toEqual(expect.arrayContaining([
      'phrase_build',
      'natural_choice',
      'pronunciation_shadow',
      'active_recall',
    ]));
    expect(candidate.exerciseBlueprints.every((exercise) => exercise.finalExerciseBuilt === false)).toBe(true);
    expect(candidate.exerciseBlueprints.every((exercise) => (
      exercise.wrongAnswerPolicy.mustReferenceOnlyPresentedOptions === true &&
      exercise.wrongAnswerPolicy.mustNotInventUnseenOptions === true
    ))).toBe(true);
  });

  it('requires explanation coverage for every new word and first-seen construction', () => {
    const candidate = buildGavanWeek1Day4BlueprintCandidate(standards(), {
      generatedAt: GENERATED_AT,
    });

    candidate.contentUnits.forEach((unit) => {
      const covered = new Set(unit.explanationCards.flatMap((card) => card.covers));
      [...unit.newWords, ...unit.firstSeenConstructions].forEach((target) => {
        expect(covered.has(target)).toBe(true);
      });
      expect(unit.explanationCards.every((card) => card.tone === 'plain_supportive_human')).toBe(true);
      expect(unit.explanationCards.every((card) => card.wrongAnswerSafe === true)).toBe(true);
    });
  });

  it('supports only the four onboarding minute choices', () => {
    const candidate = buildGavanWeek1Day4BlueprintCandidate(standards(), {
      generatedAt: GENERATED_AT,
    });

    expect(Object.keys(candidate.loadByMinutes)).toEqual(['5', '10', '15', '20']);
    expect(candidate.loadByMinutes[5].contentUnitCount).toBeLessThan(candidate.loadByMinutes[20].contentUnitCount);
    expect(candidate.loadByMinutes[5].exerciseBlueprintCount).toBeLessThan(candidate.loadByMinutes[20].exerciseBlueprintCount);
  });

  it('keeps audio and pronunciation honest', () => {
    const candidate = buildGavanWeek1Day4BlueprintCandidate(standards(), {
      generatedAt: GENERATED_AT,
    });

    expect(candidate.mediaClaims.audioAssetStatus).toBe('not_generated');
    expect(candidate.mediaClaims.pronunciationScoringStatus).toBe('not_built');
    expect(candidate.mediaClaims.finalAudioReady).toBe(false);
    expect(candidate.mediaClaims.finalPronunciationScoringReady).toBe(false);
  });

  it('passes its own quality gate and catches corrupted candidates', () => {
    const candidate = buildGavanWeek1Day4BlueprintCandidate(standards(), {
      generatedAt: GENERATED_AT,
    });

    expect(validateGavanWeek1Day4BlueprintCandidate(candidate, standards())).toEqual({
      valid: true,
      issues: [],
    });

    const corrupted = {
      ...candidate,
      dayId: 'gavan-week1-day3',
      contentUnits: [
        {
          ...candidate.contentUnits[0],
          english: 'My bank card is not working.',
          explanationCards: [],
        },
      ],
      exerciseBlueprints: candidate.exerciseBlueprints.filter((exercise) =>
        exercise.exerciseType !== 'pronunciation_shadow',
      ),
      mediaClaims: {
        ...candidate.mediaClaims,
        finalPronunciationScoringReady: true,
      },
    };

    const result = validateGavanWeek1Day4BlueprintCandidate(corrupted, standards());
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'wrong_day_id' }),
      expect.objectContaining({ code: 'forbidden_anchor_present' }),
      expect.objectContaining({ code: 'missing_required_exercise_type' }),
      expect.objectContaining({ code: 'missing_explanation_coverage' }),
      expect.objectContaining({ code: 'fake_final_pronunciation_claim' }),
    ]));
  });

  it('writes deterministic day 4 candidate JSON only under temp or report roots', () => {
    const result = writeGavanWeek1Day4BlueprintCandidate(standards(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_DAY4_BLUEPRINT_CANDIDATE_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-day4-blueprint-candidate.json',
    ));
    expect(existsSync(GAVAN_WEEK1_DAY4_BLUEPRINT_CANDIDATE_PATH)).toBe(true);

    const parsed = JSON.parse(readFileSync(GAVAN_WEEK1_DAY4_BLUEPRINT_CANDIDATE_PATH, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_day4_blueprint_candidate');
    expect(parsed.dayId).toBe('gavan-week1-day4');
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1Day4BlueprintCandidate(standards(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-day4-blueprint.json'),
    });
    const toolsResult = writeGavanWeek1Day4BlueprintCandidate(standards(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-day4-blueprint.json'),
    });
    const testsResult = writeGavanWeek1Day4BlueprintCandidate(standards(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-day4-blueprint.json'),
    });

    expect(appResult.valid).toBe(false);
    expect(toolsResult.valid).toBe(false);
    expect(testsResult.valid).toBe(false);
    expect(appResult.issues[0].code).toBe('target_path_not_allowed');
    expect(toolsResult.issues[0].code).toBe('target_path_not_allowed');
    expect(testsResult.issues[0].code).toBe('target_path_not_allowed');
  });

  it('does not import live catalog quiz UI storage audio scoring or navigation', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_day4_blueprint_candidate.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
