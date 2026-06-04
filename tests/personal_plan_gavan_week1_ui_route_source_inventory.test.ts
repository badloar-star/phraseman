import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1QuizAdapterDesign,
} from '../tools/personal_plan_gavan_week1_quiz_adapter_design';
import {
  buildGavanWeek1UiRouteSourceInventory,
  GAVAN_WEEK1_UI_ROUTE_SOURCE_INVENTORY_PATH,
  writeGavanWeek1UiRouteSourceInventory,
} from '../tools/personal_plan_gavan_week1_ui_route_source_inventory';

const GENERATED_AT = '2026-06-03T08:05:00.000Z';
const BROKEN_ENCODING_RE = /[\u00d0\u00c2\u00e2\ufffd]/;

function quizAdapterDesign(): GavanWeek1QuizAdapterDesign {
  return {
    kind: 'gavan_week1_quiz_adapter_design',
    generatedAt: GENERATED_AT,
    planId: 'gavan',
    weekId: 'gavan-week1',
    status: 'quiz_adapter_design_blocked_not_applied',
    sourceInventoryStatus: 'quiz_source_inventory_blocked_not_applied',
    blockingDependency: 'missing_signature:product_copy',
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    quizSourceEdited: false,
    routeRegistrationAllowed: false,
    quizRouteRegistrationAllowed: false,
    liveEditsAllowed: false,
    perDayQuizRouteDesigns: Array.from({ length: 6 }, (_, index) => ({
      quizId: `gavan-week1-day${index + 2}-quiz`,
      dayId: `gavan-week1-day${index + 2}`,
      dayIndex: index + 2,
      requiredQuestionCount: 10,
      coverageRequirement: {
        required: true,
        source: 'approved_day_phrase_coverage',
        minimumCoveredPlanPhrases: 5,
        status: 'not_allowed_until_signature',
      },
      taskCopyRequirement: {
        required: true,
        modes: ['choice', 'typing'],
        languages: ['ru', 'uk', 'es'],
        status: 'not_allowed_until_signature',
      },
      legacyExceptionIsolation: {
        legacyIds: ['gavan_day1_identity', 'gavan_day2_address'],
        mustNotReuse: true,
        status: 'not_allowed_until_signature',
      },
      status: 'not_allowed_until_signature',
      routeRegistered: false,
      playable: false,
    })),
    futureLiveQuizAcceptanceCriteria: [],
    quizAdapterPolicy: {
      dryRunOnly: true,
      liveQuizRegistryEdited: false,
      routeRegistrationAllowed: false,
    },
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
    },
  } as unknown as GavanWeek1QuizAdapterDesign;
}

function readSource(sourcePath: string): string {
  return readFileSync(path.join(process.cwd(), sourcePath), 'utf8');
}

function uiSources() {
  return [
    {
      sourcePath: 'components/PersonalPlanHomeRouteCard.tsx',
      source: readSource('components/PersonalPlanHomeRouteCard.tsx'),
    },
    {
      sourcePath: 'app/personal_plan.tsx',
      source: readSource('app/personal_plan.tsx'),
    },
    {
      sourcePath: 'app/personal_plan_navigation.ts',
      source: readSource('app/personal_plan_navigation.ts'),
    },
    {
      sourcePath: 'app/personal_plan_day_open_actions.ts',
      source: readSource('app/personal_plan_day_open_actions.ts'),
    },
    {
      sourcePath: 'app/personal_plan_day_task_surface_entrypoint.ts',
      source: readSource('app/personal_plan_day_task_surface_entrypoint.ts'),
    },
    {
      sourcePath: 'app/personal_plan_day_task_surface_bundle.ts',
      source: readSource('app/personal_plan_day_task_surface_bundle.ts'),
    },
    {
      sourcePath: 'app/personal_plan_task_surface_api.ts',
      source: readSource('app/personal_plan_task_surface_api.ts'),
    },
  ];
}

describe('Gavan week 1 UI route source inventory', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_UI_ROUTE_SOURCE_INVENTORY_PATH)) {
      rmSync(GAVAN_WEEK1_UI_ROUTE_SOURCE_INVENTORY_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1UiRouteSourceInventory(quizAdapterDesign(), uiSources(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_UI_ROUTE_SOURCE_INVENTORY_PATH,
    });
  });

  it('builds a blocked read-only UI source inventory from the quiz adapter design', () => {
    const result = buildGavanWeek1UiRouteSourceInventory(quizAdapterDesign(), uiSources(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.inventory).toEqual(expect.objectContaining({
      kind: 'gavan_week1_ui_route_source_inventory',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'ui_route_source_inventory_blocked_not_applied',
      sourceQuizAdapterDesignStatus: 'quiz_adapter_design_blocked_not_applied',
      blockingDependency: 'missing_signature:product_copy',
      routeRegistrationAllowed: false,
      uiRouteRegistrationAllowed: false,
      sourceWritesUsed: false,
      uiSourceEdited: false,
      liveEditsAllowed: false,
    }));
    expect(result.inventory?.phaseWriteTargets).toEqual([]);
  });

  it('reports likely source surfaces for Home card plan screen task open helper and task surface API', () => {
    const result = buildGavanWeek1UiRouteSourceInventory(quizAdapterDesign(), uiSources(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.inventory?.sourceSurfaceFindings).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'home_route_card', present: true }),
      expect.objectContaining({ id: 'plan_screen', present: true }),
      expect.objectContaining({ id: 'task_open_helper', present: true }),
      expect.objectContaining({ id: 'day_open_actions', present: true }),
      expect.objectContaining({ id: 'task_surface_entrypoint', present: true }),
      expect.objectContaining({ id: 'task_surface_bundle', present: true }),
      expect.objectContaining({ id: 'task_surface_api', present: true }),
    ]));
  });

  it('reports route abilities for lessons quizzes plan exercises and dev plan entrypoint without opening routes', () => {
    const result = buildGavanWeek1UiRouteSourceInventory(quizAdapterDesign(), uiSources(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.inventory?.routeAbilityFindings).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'open_plan_screen', detected: true, routeRegistrationAllowed: false }),
      expect.objectContaining({ id: 'open_dev_plan_screen', detected: true, routeRegistrationAllowed: false }),
      expect.objectContaining({ id: 'open_lesson_menu', detected: true, routeRegistrationAllowed: false }),
      expect.objectContaining({ id: 'open_plan_phrase_lesson', detected: true, routeRegistrationAllowed: false }),
      expect.objectContaining({ id: 'open_quiz_screen', detected: true, routeRegistrationAllowed: false }),
      expect.objectContaining({ id: 'open_plan_renderer', detected: true, routeRegistrationAllowed: false }),
      expect.objectContaining({ id: 'open_lesson_shell', detected: true, routeRegistrationAllowed: false }),
    ]));
  });

  it('reports preservation risks for Home onboarding Premium and self-guided paths', () => {
    const result = buildGavanWeek1UiRouteSourceInventory(quizAdapterDesign(), uiSources(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.inventory?.preservationRisks).toEqual([
      expect.objectContaining({ id: 'home_route_card', status: 'must_preserve_not_modified' }),
      expect.objectContaining({ id: 'onboarding_flow', status: 'must_preserve_not_modified' }),
      expect.objectContaining({ id: 'premium_flow', status: 'must_preserve_not_modified' }),
      expect.objectContaining({ id: 'self_guided_paths', status: 'must_preserve_not_modified' }),
    ]);
  });

  it('records the current UI encoding scan result without copying source text to output', () => {
    const result = buildGavanWeek1UiRouteSourceInventory(quizAdapterDesign(), uiSources(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.inventory?.descriptiveFindings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ui_source_encoding_markers_not_detected' }),
    ]));
    expect(result.inventory?.sourceSummary.some((entry: { containsBrokenEncoding: boolean }) =>
      entry.containsBrokenEncoding,
    )).toBe(false);
    expect(JSON.stringify(result.inventory)).not.toMatch(BROKEN_ENCODING_RE);
  });

  it('rejects unsafe or unblocked quiz adapter designs instead of opening UI route work', () => {
    const unsafeDesign = {
      ...quizAdapterDesign(),
      sourceWritesUsed: true,
      phaseWriteTargets: ['app/personal_plan.tsx'],
    } as unknown as GavanWeek1QuizAdapterDesign;
    const unblockedDesign = {
      ...quizAdapterDesign(),
      routeRegistrationAllowed: true,
      quizRouteRegistrationAllowed: true,
    } as unknown as GavanWeek1QuizAdapterDesign;

    const unsafeResult = buildGavanWeek1UiRouteSourceInventory(unsafeDesign, uiSources(), {
      generatedAt: GENERATED_AT,
    });
    const unblockedResult = buildGavanWeek1UiRouteSourceInventory(unblockedDesign, uiSources(), {
      generatedAt: GENERATED_AT,
    });

    expect(unsafeResult.valid).toBe(false);
    expect(unsafeResult.inventory).toBeUndefined();
    expect(unsafeResult.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'source_writes_not_allowed' }),
    ]));
    expect(unblockedResult.valid).toBe(false);
    expect(unblockedResult.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'quiz_adapter_design_not_blocked' }),
    ]));
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const result = writeGavanWeek1UiRouteSourceInventory(quizAdapterDesign(), uiSources(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_UI_ROUTE_SOURCE_INVENTORY_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-ui-route-source-inventory.json',
    ));
    expect(existsSync(GAVAN_WEEK1_UI_ROUTE_SOURCE_INVENTORY_PATH)).toBe(true);

    const serialized = readFileSync(GAVAN_WEEK1_UI_ROUTE_SOURCE_INVENTORY_PATH, 'utf8');
    expect(serialized).not.toMatch(BROKEN_ENCODING_RE);
    const parsed = JSON.parse(serialized);
    expect(parsed.kind).toBe('gavan_week1_ui_route_source_inventory');
    expect(parsed.status).toBe('ui_route_source_inventory_blocked_not_applied');
    expect(parsed.uiSourceEdited).toBe(false);
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1UiRouteSourceInventory(quizAdapterDesign(), uiSources(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-ui-route-source-inventory.json'),
    });
    const toolsResult = writeGavanWeek1UiRouteSourceInventory(quizAdapterDesign(), uiSources(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-ui-route-source-inventory.json'),
    });
    const testsResult = writeGavanWeek1UiRouteSourceInventory(quizAdapterDesign(), uiSources(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-ui-route-source-inventory.json'),
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
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_ui_route_source_inventory.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
