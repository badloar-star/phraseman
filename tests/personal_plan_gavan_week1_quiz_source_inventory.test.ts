import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1CatalogAdapterDesign,
} from '../tools/personal_plan_gavan_week1_catalog_adapter_design';
import {
  buildGavanWeek1QuizSourceInventory,
  GAVAN_WEEK1_QUIZ_SOURCE_INVENTORY_PATH,
  writeGavanWeek1QuizSourceInventory,
} from '../tools/personal_plan_gavan_week1_quiz_source_inventory';
import {
  blockedCatalogAdapterDesign,
} from './personal_plan_gavan_week1_route_chain_fixtures';

const GENERATED_AT = '2026-06-03T07:05:00.000Z';

function adapterDesign(): GavanWeek1CatalogAdapterDesign {
  return blockedCatalogAdapterDesign();
}

function quizSource(): string {
  return readFileSync(path.join(process.cwd(), 'app', 'personal_plan_quizzes.ts'), 'utf8');
}

describe('Gavan week 1 quiz source inventory', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_QUIZ_SOURCE_INVENTORY_PATH)) {
      rmSync(GAVAN_WEEK1_QUIZ_SOURCE_INVENTORY_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1QuizSourceInventory(adapterDesign(), quizSource(), {
      generatedAt: GENERATED_AT,
      sourcePath: 'app/personal_plan_quizzes.ts',
      targetPath: GAVAN_WEEK1_QUIZ_SOURCE_INVENTORY_PATH,
    });
  });

  it('builds a blocked read-only quiz inventory from the catalog adapter design', () => {
    const result = buildGavanWeek1QuizSourceInventory(adapterDesign(), quizSource(), {
      generatedAt: GENERATED_AT,
      sourcePath: 'app/personal_plan_quizzes.ts',
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.inventory).toEqual(expect.objectContaining({
      kind: 'gavan_week1_quiz_source_inventory',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'quiz_source_inventory_blocked_not_applied',
      sourceAdapterDesignStatus: 'catalog_adapter_design_blocked_not_applied',
      blockingDependency: 'missing_signature:product_copy',
      routeRegistrationAllowed: false,
      quizRouteRegistrationAllowed: false,
      sourceWritesUsed: false,
      quizSourceEdited: false,
      liveEditsAllowed: false,
    }));
    expect(result.inventory?.phaseWriteTargets).toEqual([]);
  });

  it('reports future dedicated day quiz ids as missing from quiz source', () => {
    const result = buildGavanWeek1QuizSourceInventory(adapterDesign(), quizSource(), {
      generatedAt: GENERATED_AT,
      sourcePath: 'app/personal_plan_quizzes.ts',
    });

    expect(result.inventory?.quizFindings.proposedQuizIds).toEqual([
      'gavan-week1-day2-quiz',
      'gavan-week1-day3-quiz',
      'gavan-week1-day4-quiz',
      'gavan-week1-day5-quiz',
      'gavan-week1-day6-quiz',
      'gavan-week1-day7-quiz',
    ]);
    expect(result.inventory?.quizFindings.existingProposedQuizIds).toEqual([]);
    expect(result.inventory?.quizFindings.missingProposedQuizIds).toHaveLength(6);
    expect(result.inventory?.proposedQuizRoutes.every((route: { status: string }) =>
      route.status === 'not_allowed_until_signature',
    )).toBe(true);
  });

  it('detects quiz source surfaces and legacy Gavan exceptions without using them as new routes', () => {
    const result = buildGavanWeek1QuizSourceInventory(adapterDesign(), quizSource(), {
      generatedAt: GENERATED_AT,
      sourcePath: 'app/personal_plan_quizzes.ts',
    });

    expect(result.inventory?.quizFindings.containsQuizFactory).toBe(true);
    expect(result.inventory?.quizFindings.containsQuizRegistry).toBe(true);
    expect(result.inventory?.quizFindings.containsCoverageRegistry).toBe(true);
    expect(result.inventory?.quizFindings.containsTaskCopyRegistry).toBe(true);
    expect(result.inventory?.quizFindings.containsPhraseGetter).toBe(true);
    expect(result.inventory?.quizFindings.containsCoverageGetter).toBe(true);
    expect(result.inventory?.quizFindings.containsTaskCopyGetter).toBe(true);
    expect(result.inventory?.quizFindings.containsLegacyGavanExceptions).toBe(true);
    expect(result.inventory?.descriptiveFindings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'quiz_source_surfaces_present' }),
      expect.objectContaining({ code: 'legacy_gavan_quiz_exceptions_present' }),
      expect.objectContaining({ code: 'proposed_quiz_ids_missing' }),
    ]));
  });

  it('records the dedicated 10-question day quiz requirement as non-live', () => {
    const result = buildGavanWeek1QuizSourceInventory(adapterDesign(), quizSource(), {
      generatedAt: GENERATED_AT,
      sourcePath: 'app/personal_plan_quizzes.ts',
    });

    expect(result.inventory?.dedicatedQuizRequirement).toEqual({
      perDayDedicatedQuizRequired: true,
      requiredQuestionCount: 10,
      source: 'plan_day_quiz_requirement',
      status: 'not_allowed_until_signature',
      writeActionAllowed: false,
    });
  });

  it('rejects unsafe or unblocked adapter designs instead of opening quiz route work', () => {
    const unsafeDesign = {
      ...adapterDesign(),
      sourceWritesUsed: true,
      phaseWriteTargets: ['app/personal_plan_quizzes.ts'],
    } as unknown as GavanWeek1CatalogAdapterDesign;
    const unblockedDesign = {
      ...adapterDesign(),
      routeRegistrationAllowed: true,
      canOpenCatalogRouteTask: true,
    } as unknown as GavanWeek1CatalogAdapterDesign;

    const unsafeResult = buildGavanWeek1QuizSourceInventory(unsafeDesign, quizSource(), {
      generatedAt: GENERATED_AT,
      sourcePath: 'app/personal_plan_quizzes.ts',
    });
    const unblockedResult = buildGavanWeek1QuizSourceInventory(unblockedDesign, quizSource(), {
      generatedAt: GENERATED_AT,
      sourcePath: 'app/personal_plan_quizzes.ts',
    });

    expect(unsafeResult.valid).toBe(false);
    expect(unsafeResult.inventory).toBeUndefined();
    expect(unsafeResult.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'source_writes_not_allowed' }),
    ]));
    expect(unblockedResult.valid).toBe(false);
    expect(unblockedResult.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'adapter_design_not_blocked' }),
    ]));
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const result = writeGavanWeek1QuizSourceInventory(adapterDesign(), quizSource(), {
      generatedAt: GENERATED_AT,
      sourcePath: 'app/personal_plan_quizzes.ts',
      targetPath: GAVAN_WEEK1_QUIZ_SOURCE_INVENTORY_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-quiz-source-inventory.json',
    ));
    expect(existsSync(GAVAN_WEEK1_QUIZ_SOURCE_INVENTORY_PATH)).toBe(true);

    const parsed = JSON.parse(readFileSync(GAVAN_WEEK1_QUIZ_SOURCE_INVENTORY_PATH, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_quiz_source_inventory');
    expect(parsed.status).toBe('quiz_source_inventory_blocked_not_applied');
    expect(parsed.quizSourceEdited).toBe(false);
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1QuizSourceInventory(adapterDesign(), quizSource(), {
      generatedAt: GENERATED_AT,
      sourcePath: 'app/personal_plan_quizzes.ts',
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-quiz-source-inventory.json'),
    });
    const toolsResult = writeGavanWeek1QuizSourceInventory(adapterDesign(), quizSource(), {
      generatedAt: GENERATED_AT,
      sourcePath: 'app/personal_plan_quizzes.ts',
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-quiz-source-inventory.json'),
    });
    const testsResult = writeGavanWeek1QuizSourceInventory(adapterDesign(), quizSource(), {
      generatedAt: GENERATED_AT,
      sourcePath: 'app/personal_plan_quizzes.ts',
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-quiz-source-inventory.json'),
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
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_quiz_source_inventory.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
