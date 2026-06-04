import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import {
  buildGavanWeek1ExpansionStandards,
} from '../tools/personal_plan_gavan_week1_expansion_standards';
import {
  buildGavanWeek1Day6BlueprintCandidate,
} from '../tools/personal_plan_gavan_week1_day6_blueprint_candidate';
import {
  buildGavanWeek1Day6ReviewerExport,
  GAVAN_WEEK1_DAY6_REVIEWER_EXPORT_PATH,
  validateGavanWeek1Day6ReviewerExport,
  writeGavanWeek1Day6ReviewerExport,
} from '../tools/personal_plan_gavan_week1_day6_reviewer_export';

const GENERATED_AT = '2026-06-03T00:25:00.000Z';
const BROKEN_ENCODING_RE = /[\u00d0\u00d1\u00c2\u00e2\ufffd]/;

function candidate() {
  return buildGavanWeek1Day6BlueprintCandidate(
    buildGavanWeek1ExpansionStandards({ generatedAt: GENERATED_AT }),
    { generatedAt: GENERATED_AT },
  );
}

describe('Gavan week 1 day 6 reviewer export', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_DAY6_REVIEWER_EXPORT_PATH)) {
      rmSync(GAVAN_WEEK1_DAY6_REVIEWER_EXPORT_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1Day6ReviewerExport(candidate(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_DAY6_REVIEWER_EXPORT_PATH,
    });
  });

  it('exports every day 6 content unit and explanation card for manual review', () => {
    const blueprint = candidate();
    const reviewExport = buildGavanWeek1Day6ReviewerExport(blueprint, {
      generatedAt: GENERATED_AT,
    });

    expect(reviewExport.kind).toBe('gavan_week1_day6_reviewer_export');
    expect(reviewExport.dayId).toBe('gavan-week1-day6');
    expect(reviewExport.dayIndex).toBe(6);
    expect(reviewExport.liveIntegration).toBe(false);
    expect(reviewExport.reviewStatus).toBe('needs_manual_review');
    expect(reviewExport.summary.contentUnits).toBe(blueprint.contentUnits.length);
    expect(reviewExport.summary.explanationCards).toBe(
      blueprint.contentUnits.reduce((sum, unit) => sum + unit.explanationCards.length, 0),
    );
    expect(reviewExport.contentUnitRows.map((row) => row.contentUnitId)).toEqual(
      blueprint.contentUnits.map((unit) => unit.id),
    );
    expect(reviewExport.explanationRows.map((row) => row.explanationId)).toEqual(
      blueprint.contentUnits.flatMap((unit) => unit.explanationCards.map((card) => card.id)),
    );
    expect(validateGavanWeek1Day6ReviewerExport(reviewExport, blueprint)).toEqual({
      valid: true,
      issues: [],
    });
  });

  it('keeps day 6 media and pronunciation claims honest for a non-final blueprint', () => {
    const reviewExport = buildGavanWeek1Day6ReviewerExport(candidate(), {
      generatedAt: GENERATED_AT,
    });

    expect(reviewExport.mediaClaims).toEqual({
      audioAssetStatus: 'not_generated',
      pronunciationScoringStatus: 'not_built',
      finalAudioReady: false,
      finalPronunciationScoringReady: false,
    });
    expect(reviewExport.summary.finalAudioClaims).toBe(0);
    expect(reviewExport.summary.finalPronunciationClaims).toBe(0);
  });

  it('proves forbidden anchors and corrupted copy are absent from exported visible copy', () => {
    const reviewExport = buildGavanWeek1Day6ReviewerExport(candidate(), {
      generatedAt: GENERATED_AT,
    });
    const visibleCopy = JSON.stringify({
      contentUnitRows: reviewExport.contentUnitRows,
      explanationRows: reviewExport.explanationRows,
      exerciseRows: reviewExport.exerciseRows,
    });

    expect(reviewExport.forbiddenAnchorCheck).toEqual({
      valid: true,
      found: [],
    });
    expect(visibleCopy).not.toMatch(
      /phone|email|apartment|rent|document|doctor|bank|087|@|\balex\b|beta8958/i,
    );
    expect(visibleCopy).not.toMatch(BROKEN_ENCODING_RE);
  });

  it('exports day 6 exercise blueprint coverage without pretending exercises are built', () => {
    const blueprint = candidate();
    const reviewExport = buildGavanWeek1Day6ReviewerExport(blueprint, {
      generatedAt: GENERATED_AT,
    });

    expect(reviewExport.exerciseRows.map((row) => row.exerciseType)).toEqual([
      'active_recall',
      'error_repair',
      'pronunciation_shadow',
      'natural_choice',
    ]);
    expect(reviewExport.exerciseCoverage).toEqual({
      requiredTypes: ['active_recall', 'error_repair', 'pronunciation_shadow', 'natural_choice'],
      presentTypes: ['active_recall', 'error_repair', 'pronunciation_shadow', 'natural_choice'],
      valid: true,
    });
    expect(reviewExport.exerciseRows.every((row) => row.finalExerciseBuilt === false)).toBe(true);
    expect(reviewExport.summary.exerciseBlueprints).toBe(blueprint.exerciseBlueprints.length);
  });

  it('catches missing rows fake media claims forbidden anchors and missing exercise coverage', () => {
    const blueprint = candidate();
    const reviewExport = buildGavanWeek1Day6ReviewerExport(blueprint, {
      generatedAt: GENERATED_AT,
    });

    const corrupted = {
      ...reviewExport,
      contentUnitRows: reviewExport.contentUnitRows.slice(1),
      explanationRows: reviewExport.explanationRows.slice(1),
      exerciseRows: reviewExport.exerciseRows.filter((row) => row.exerciseType !== 'error_repair'),
      exerciseCoverage: {
        ...reviewExport.exerciseCoverage,
        presentTypes: reviewExport.exerciseCoverage.presentTypes.filter((type) => type !== 'error_repair'),
        valid: false,
      },
      forbiddenAnchorCheck: {
        valid: false,
        found: ['phone'],
      },
      mediaClaims: {
        ...reviewExport.mediaClaims,
        finalPronunciationScoringReady: true,
      },
    };

    const result = validateGavanWeek1Day6ReviewerExport(corrupted, blueprint);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'missing_content_unit_export' }),
      expect.objectContaining({ code: 'missing_explanation_card_export' }),
      expect.objectContaining({ code: 'missing_exercise_blueprint_export' }),
      expect.objectContaining({ code: 'missing_exercise_coverage' }),
      expect.objectContaining({ code: 'forbidden_anchor_present' }),
      expect.objectContaining({ code: 'fake_final_pronunciation_claim' }),
    ]));
  });

  it('writes deterministic day 6 reviewer JSON only under temp or report roots', () => {
    const result = writeGavanWeek1Day6ReviewerExport(candidate(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_DAY6_REVIEWER_EXPORT_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-day6-reviewer-export.json',
    ));
    expect(existsSync(GAVAN_WEEK1_DAY6_REVIEWER_EXPORT_PATH)).toBe(true);

    const serialized = readFileSync(GAVAN_WEEK1_DAY6_REVIEWER_EXPORT_PATH, 'utf8');
    expect(serialized).not.toMatch(BROKEN_ENCODING_RE);

    const parsed = JSON.parse(serialized);
    expect(parsed.kind).toBe('gavan_week1_day6_reviewer_export');
    expect(parsed.dayId).toBe('gavan-week1-day6');
    expect(parsed.summary).toEqual(expect.objectContaining({
      contentUnits: 4,
      explanationCards: 8,
      exerciseBlueprints: 4,
    }));
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1Day6ReviewerExport(candidate(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-day6-reviewer-export.json'),
    });
    const toolsResult = writeGavanWeek1Day6ReviewerExport(candidate(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-day6-reviewer-export.json'),
    });
    const testsResult = writeGavanWeek1Day6ReviewerExport(candidate(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-day6-reviewer-export.json'),
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
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_day6_reviewer_export.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
