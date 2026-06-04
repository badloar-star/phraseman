import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1QuizSourceInventory,
} from '../tools/personal_plan_gavan_week1_quiz_source_inventory';
import {
  buildGavanWeek1QuizAdapterDesign,
  GAVAN_WEEK1_QUIZ_ADAPTER_DESIGN_PATH,
  writeGavanWeek1QuizAdapterDesign,
} from '../tools/personal_plan_gavan_week1_quiz_adapter_design';

const GENERATED_AT = '2026-06-03T07:35:00.000Z';

function inventory(): GavanWeek1QuizSourceInventory {
  return JSON.parse(readFileSync(
    path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-quiz-source-inventory.json',
    ),
    'utf8',
  ));
}

describe('Gavan week 1 quiz adapter design', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_QUIZ_ADAPTER_DESIGN_PATH)) {
      rmSync(GAVAN_WEEK1_QUIZ_ADAPTER_DESIGN_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1QuizAdapterDesign(inventory(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_QUIZ_ADAPTER_DESIGN_PATH,
    });
  });

  it('builds a blocked non-live quiz adapter design from the quiz source inventory', () => {
    const result = buildGavanWeek1QuizAdapterDesign(inventory(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.design).toEqual(expect.objectContaining({
      kind: 'gavan_week1_quiz_adapter_design',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'quiz_adapter_design_blocked_not_applied',
      sourceInventoryStatus: 'quiz_source_inventory_blocked_not_applied',
      blockingDependency: 'missing_signature:product_copy',
      routeRegistrationAllowed: false,
      quizRouteRegistrationAllowed: false,
      quizSourceEdited: false,
      sourceWritesUsed: false,
      liveEditsAllowed: false,
    }));
    expect(result.design?.phaseWriteTargets).toEqual([]);
  });

  it('designs six dedicated 10-question day quiz routes without registering them', () => {
    const result = buildGavanWeek1QuizAdapterDesign(inventory(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.design?.perDayQuizRouteDesigns).toHaveLength(6);
    expect(result.design?.perDayQuizRouteDesigns.map((route: { quizId: string }) => route.quizId)).toEqual([
      'gavan-week1-day2-quiz',
      'gavan-week1-day3-quiz',
      'gavan-week1-day4-quiz',
      'gavan-week1-day5-quiz',
      'gavan-week1-day6-quiz',
      'gavan-week1-day7-quiz',
    ]);
    expect(result.design?.perDayQuizRouteDesigns).toEqual(expect.arrayContaining([
      expect.objectContaining({
        quizId: 'gavan-week1-day2-quiz',
        dayId: 'gavan-week1-day2',
        dayIndex: 2,
        requiredQuestionCount: 10,
        routeRegistered: false,
        playable: false,
        status: 'not_allowed_until_signature',
      }),
    ]));
  });

  it('requires coverage links task copy modes and legacy exception isolation for every quiz', () => {
    const result = buildGavanWeek1QuizAdapterDesign(inventory(), {
      generatedAt: GENERATED_AT,
    });

    for (const route of result.design?.perDayQuizRouteDesigns ?? []) {
      expect(route.coverageRequirement).toEqual({
        required: true,
        source: 'approved_day_phrase_coverage',
        minimumCoveredPlanPhrases: 5,
        status: 'not_allowed_until_signature',
      });
      expect(route.taskCopyRequirement).toEqual({
        required: true,
        modes: ['choice', 'typing'],
        languages: ['ru', 'uk', 'es'],
        status: 'not_allowed_until_signature',
      });
      expect(route.legacyExceptionIsolation).toEqual({
        legacyIds: ['gavan_day1_identity', 'gavan_day2_address'],
        mustNotReuse: true,
        status: 'not_allowed_until_signature',
      });
    }
  });

  it('keeps future live quiz route acceptance criteria blocked until signature exists', () => {
    const result = buildGavanWeek1QuizAdapterDesign(inventory(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.design?.futureLiveQuizAcceptanceCriteria).toEqual([
      expect.objectContaining({ id: 'content_quality_signature_present', status: 'not_allowed_until_signature' }),
      expect.objectContaining({ id: 'quiz_ids_registered', status: 'not_allowed_until_signature' }),
      expect.objectContaining({ id: 'each_day_has_10_questions', status: 'not_allowed_until_signature' }),
      expect.objectContaining({ id: 'coverage_links_approved_phrases', status: 'not_allowed_until_signature' }),
      expect.objectContaining({ id: 'choice_and_typing_copy_present', status: 'not_allowed_until_signature' }),
      expect.objectContaining({ id: 'legacy_exceptions_isolated', status: 'not_allowed_until_signature' }),
      expect.objectContaining({ id: 'quiz_route_regression_passes', status: 'not_allowed_until_signature' }),
    ]);
  });

  it('rejects unsafe or unblocked inventories instead of opening quiz adapter work', () => {
    const unsafeInventory = {
      ...inventory(),
      sourceWritesUsed: true,
      phaseWriteTargets: ['app/personal_plan_quizzes.ts'],
    } as unknown as GavanWeek1QuizSourceInventory;
    const unblockedInventory = {
      ...inventory(),
      quizRouteRegistrationAllowed: true,
      routeRegistrationAllowed: true,
    } as unknown as GavanWeek1QuizSourceInventory;

    const unsafeResult = buildGavanWeek1QuizAdapterDesign(unsafeInventory, {
      generatedAt: GENERATED_AT,
    });
    const unblockedResult = buildGavanWeek1QuizAdapterDesign(unblockedInventory, {
      generatedAt: GENERATED_AT,
    });

    expect(unsafeResult.valid).toBe(false);
    expect(unsafeResult.design).toBeUndefined();
    expect(unsafeResult.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'source_writes_not_allowed' }),
    ]));
    expect(unblockedResult.valid).toBe(false);
    expect(unblockedResult.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'quiz_inventory_not_blocked' }),
    ]));
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const result = writeGavanWeek1QuizAdapterDesign(inventory(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_QUIZ_ADAPTER_DESIGN_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-quiz-adapter-design.json',
    ));
    expect(existsSync(GAVAN_WEEK1_QUIZ_ADAPTER_DESIGN_PATH)).toBe(true);

    const parsed = JSON.parse(readFileSync(GAVAN_WEEK1_QUIZ_ADAPTER_DESIGN_PATH, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_quiz_adapter_design');
    expect(parsed.status).toBe('quiz_adapter_design_blocked_not_applied');
    expect(parsed.quizSourceEdited).toBe(false);
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1QuizAdapterDesign(inventory(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-quiz-adapter-design.json'),
    });
    const toolsResult = writeGavanWeek1QuizAdapterDesign(inventory(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-quiz-adapter-design.json'),
    });
    const testsResult = writeGavanWeek1QuizAdapterDesign(inventory(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-quiz-adapter-design.json'),
    });

    expect(appResult.valid).toBe(false);
    expect(toolsResult.valid).toBe(false);
    expect(testsResult.valid).toBe(false);
    expect(appResult.issues[0].code).toBe('target_path_not_allowed');
    expect(toolsResult.issues[0].code).toBe('target_path_not_allowed');
    expect(testsResult.issues[0].code).toBe('target_path_not_allowed');
  });

  it('does not import or mutate live catalog quiz UI storage audio scoring or navigation', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_quiz_adapter_design.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
