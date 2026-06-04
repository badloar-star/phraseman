import fs from 'fs';
import path from 'path';

import type { GavanWeek1CatalogAdapterDesign } from '../tools/personal_plan_gavan_week1_catalog_adapter_design';
import type { GavanWeek1QuizAdapterDesign } from '../tools/personal_plan_gavan_week1_quiz_adapter_design';
import type { GavanWeek1UiRouteSourceInventory } from '../tools/personal_plan_gavan_week1_ui_route_source_inventory';
import {
  buildGavanWeek1UiRouteAdapterDesign,
  GAVAN_WEEK1_UI_ROUTE_ADAPTER_DESIGN_PATH,
  writeGavanWeek1UiRouteAdapterDesign,
} from '../tools/personal_plan_gavan_week1_ui_route_adapter_design';

const GENERATED_AT = '2026-06-03T08:45:00.000Z';
const BROKEN_ENCODING_RE = /[\u00d0\u00c2\u00e2\ufffd]/;

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8')) as T;
}

function uiInventory(): GavanWeek1UiRouteSourceInventory {
  return {
    kind: 'gavan_week1_ui_route_source_inventory',
    generatedAt: GENERATED_AT,
    planId: 'gavan',
    weekId: 'gavan-week1',
    status: 'ui_route_source_inventory_blocked_not_applied',
    sourceQuizAdapterDesignStatus: 'quiz_adapter_design_blocked_not_applied',
    blockingDependency: 'missing_signature:product_copy',
    routeRegistrationAllowed: false,
    uiRouteRegistrationAllowed: false,
    liveEditsAllowed: false,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    uiSourceEdited: false,
    sourceSummary: [],
    sourceSurfaceFindings: [
      'home_route_card',
      'plan_screen',
      'task_open_helper',
      'day_open_actions',
      'task_surface_entrypoint',
      'task_surface_bundle',
      'task_surface_api',
    ].map((id) => ({
      id,
      present: true,
      sourcePath: `fixtures/${id}.ts`,
      writeActionAllowed: false,
      note: `${id} detected for non-live route design.`,
    })),
    routeAbilityFindings: [
      'open_plan_screen',
      'open_dev_plan_screen',
      'open_lesson_menu',
      'open_plan_phrase_lesson',
      'open_quiz_screen',
      'open_plan_renderer',
      'open_lesson_shell',
    ].map((id) => ({
      id,
      detected: true,
      routeRegistrationAllowed: false,
      note: `${id} detected but not registered.`,
    })),
    preservationRisks: [],
    descriptiveFindings: [],
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
    },
  } as GavanWeek1UiRouteSourceInventory;
}

function catalogDesign(): GavanWeek1CatalogAdapterDesign {
  return {
    kind: 'gavan_week1_catalog_adapter_design',
    generatedAt: GENERATED_AT,
    planId: 'gavan',
    weekId: 'gavan-week1',
    status: 'catalog_adapter_design_blocked_not_applied',
    sourceCatalogInventoryStatus: 'catalog_source_inventory_blocked_not_applied',
    blockingDependency: 'missing_signature:product_copy',
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    catalogSourceEdited: false,
    routeRegistrationAllowed: false,
    liveEditsAllowed: false,
    proposedDayMappings: Array.from({ length: 6 }, (_, index) => ({
      dayId: `gavan-week1-day${index + 2}`,
      dayIndex: index + 2,
      approvedArtifactPath: `.codex-tmp/personal-plans/gavan-week1-day${index + 2}-approved.json`,
      currentCatalogPresence: 'missing',
      futureRouteAction: 'replace_scaffold_day_after_signature',
      status: 'not_allowed_until_signature',
      productionRouteRegistered: false,
      playable: false,
    })),
    compatibilityFindings: [],
    futureLiveAcceptanceCriteria: [],
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
    },
  } as unknown as GavanWeek1CatalogAdapterDesign;
}

function quizDesign(): GavanWeek1QuizAdapterDesign {
  return {
    kind: 'gavan_week1_quiz_adapter_design',
    generatedAt: GENERATED_AT,
    planId: 'gavan',
    weekId: 'gavan-week1',
    status: 'quiz_adapter_design_blocked_not_applied',
    sourceQuizInventoryStatus: 'quiz_source_inventory_blocked_not_applied',
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
    futureLiveAcceptanceCriteria: [],
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
    },
  } as unknown as GavanWeek1QuizAdapterDesign;
}

describe('Gavan week 1 UI route adapter design', () => {
  it('builds a blocked non-live UI route adapter design from dry-run inputs', () => {
    const result = buildGavanWeek1UiRouteAdapterDesign(
      uiInventory(),
      catalogDesign(),
      quizDesign(),
      { generatedAt: GENERATED_AT },
    );

    expect(result.valid).toBe(true);
    expect(result.design).toEqual(expect.objectContaining({
      kind: 'gavan_week1_ui_route_adapter_design',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'ui_route_adapter_design_blocked_not_applied',
      sourceUiInventoryStatus: 'ui_route_source_inventory_blocked_not_applied',
      sourceCatalogAdapterStatus: 'catalog_adapter_design_blocked_not_applied',
      sourceQuizAdapterStatus: 'quiz_adapter_design_blocked_not_applied',
      blockingDependency: 'missing_signature:product_copy',
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      uiSourceEdited: false,
      routeRegistrationAllowed: false,
      uiRouteRegistrationAllowed: false,
      liveEditsAllowed: false,
    }));
  });

  it('defines future opening contracts for lesson quiz renderer and shell tasks', () => {
    const result = buildGavanWeek1UiRouteAdapterDesign(
      uiInventory(),
      catalogDesign(),
      quizDesign(),
      { generatedAt: GENERATED_AT },
    );

    expect(result.design?.openingContracts).toHaveLength(5);
    expect(result.design?.openingContracts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'lesson_task_opening',
        taskFamily: 'lesson',
        requiredSurfaceIds: expect.arrayContaining(['task_open_helper', 'day_open_actions']),
        requiredRouteAbilityIds: expect.arrayContaining(['open_lesson_menu']),
        status: 'not_allowed_until_signature',
        routeRegistered: false,
        playable: false,
      }),
      expect.objectContaining({
        id: 'plan_phrase_task_opening',
        taskFamily: 'plan_phrase',
        requiredSurfaceIds: expect.arrayContaining(['task_open_helper', 'task_surface_entrypoint']),
        requiredRouteAbilityIds: expect.arrayContaining(['open_plan_phrase_lesson']),
        status: 'not_allowed_until_signature',
        routeRegistered: false,
        playable: false,
      }),
      expect.objectContaining({
        id: 'dedicated_quiz_task_opening',
        taskFamily: 'quiz',
        requiredSurfaceIds: expect.arrayContaining(['task_open_helper']),
        requiredRouteAbilityIds: expect.arrayContaining(['open_quiz_screen']),
        linkedQuizDesignCount: 6,
        requiredQuestionCount: 10,
        status: 'not_allowed_until_signature',
        routeRegistered: false,
        playable: false,
      }),
      expect.objectContaining({
        id: 'plan_renderer_task_opening',
        taskFamily: 'plan_renderer',
        requiredSurfaceIds: expect.arrayContaining(['day_open_actions', 'task_surface_bundle']),
        requiredRouteAbilityIds: expect.arrayContaining(['open_plan_renderer']),
        status: 'not_allowed_until_signature',
      }),
      expect.objectContaining({
        id: 'lesson_shell_task_opening',
        taskFamily: 'lesson_shell',
        requiredSurfaceIds: expect.arrayContaining(['day_open_actions', 'task_surface_api']),
        requiredRouteAbilityIds: expect.arrayContaining(['open_lesson_shell']),
        status: 'not_allowed_until_signature',
      }),
    ]));
  });

  it('links every opening contract to detected P3.79 source surfaces and route abilities', () => {
    const result = buildGavanWeek1UiRouteAdapterDesign(
      uiInventory(),
      catalogDesign(),
      quizDesign(),
      { generatedAt: GENERATED_AT },
    );

    for (const contract of result.design?.openingContracts ?? []) {
      expect(contract.sourceSurfaceCoverage).toBe('all_required_surfaces_detected');
      expect(contract.routeAbilityCoverage).toBe('all_required_abilities_detected');
      expect(contract.missingSurfaceIds).toEqual([]);
      expect(contract.missingRouteAbilityIds).toEqual([]);
      expect(contract.writeActionAllowed).toBe(false);
    }
  });

  it('defines regression gates for protected user paths before any live UI work', () => {
    const result = buildGavanWeek1UiRouteAdapterDesign(
      uiInventory(),
      catalogDesign(),
      quizDesign(),
      { generatedAt: GENERATED_AT },
    );

    expect(result.design?.regressionGates.map((gate: { id: string }) => gate.id)).toEqual([
      'home_entrypoint_preserved',
      'onboarding_flow_preserved',
      'premium_flow_preserved',
      'self_guided_lessons_preserved',
      'self_guided_quizzes_preserved',
      'plan_task_carryover_preserved',
      'completed_day_state_preserved',
    ]);
    expect(result.design?.regressionGates.every((gate: {
      status: string;
      requiredBeforeLive: boolean;
      writeActionAllowed: boolean;
    }) =>
      gate.status === 'not_allowed_until_signature' &&
      gate.requiredBeforeLive === true &&
      gate.writeActionAllowed === false,
    )).toBe(true);
  });

  it('requires catalog and quiz contracts to remain blocked and compatible', () => {
    const result = buildGavanWeek1UiRouteAdapterDesign(
      uiInventory(),
      catalogDesign(),
      quizDesign(),
      { generatedAt: GENERATED_AT },
    );

    expect(result.design?.dependencySummary).toEqual({
      catalogDayMappings: 6,
      quizRouteDesigns: 6,
      catalogRouteRegistrationAllowed: false,
      quizRouteRegistrationAllowed: false,
      allDependenciesBlocked: true,
      liveBridgeAllowed: false,
    });
  });

  it('rejects unsafe or unblocked inputs instead of designing live UI routes', () => {
    const unsafeUi = {
      ...uiInventory(),
      routeRegistrationAllowed: true,
    } as unknown as GavanWeek1UiRouteSourceInventory;
    const unsafeCatalog = {
      ...catalogDesign(),
      routeRegistrationAllowed: true,
    } as unknown as GavanWeek1CatalogAdapterDesign;
    const unsafeQuiz = {
      ...quizDesign(),
      quizRouteRegistrationAllowed: true,
    } as unknown as GavanWeek1QuizAdapterDesign;

    expect(buildGavanWeek1UiRouteAdapterDesign(
      unsafeUi,
      catalogDesign(),
      quizDesign(),
      { generatedAt: GENERATED_AT },
    ).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ui_inventory_not_blocked' }),
    ]));
    expect(buildGavanWeek1UiRouteAdapterDesign(
      uiInventory(),
      unsafeCatalog,
      quizDesign(),
      { generatedAt: GENERATED_AT },
    ).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'catalog_design_not_blocked' }),
    ]));
    expect(buildGavanWeek1UiRouteAdapterDesign(
      uiInventory(),
      catalogDesign(),
      unsafeQuiz,
      { generatedAt: GENERATED_AT },
    ).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'quiz_design_not_blocked' }),
    ]));
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const targetPath = path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-ui-route-adapter-design.json',
    );
    const result = writeGavanWeek1UiRouteAdapterDesign(
      uiInventory(),
      catalogDesign(),
      quizDesign(),
      { generatedAt: GENERATED_AT, targetPath },
    );

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(targetPath);
    expect(result.bytesWritten).toBeGreaterThan(1000);
    expect(fs.existsSync(GAVAN_WEEK1_UI_ROUTE_ADAPTER_DESIGN_PATH)).toBe(true);

    const written = readJson<unknown>('.codex-tmp/personal-plans/gavan-week1-ui-route-adapter-design.json');
    expect(written).toEqual(result.design);
    expect(JSON.stringify(written)).not.toMatch(BROKEN_ENCODING_RE);
  });

  it('rejects app tools tests and root config write targets', () => {
    for (const targetPath of [
      path.join(process.cwd(), 'app', 'personal_plan.tsx'),
      path.join(process.cwd(), 'components', 'PersonalPlanHomeRouteCard.tsx'),
      path.join(process.cwd(), 'tools', 'unsafe-ui-route-adapter.json'),
      path.join(process.cwd(), 'tests', 'unsafe-ui-route-adapter.json'),
      path.join(process.cwd(), 'package.json'),
    ]) {
      const result = writeGavanWeek1UiRouteAdapterDesign(
        uiInventory(),
        catalogDesign(),
        quizDesign(),
        { generatedAt: GENERATED_AT, targetPath },
      );

      expect(result.valid).toBe(false);
      expect(result.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'target_path_not_allowed' }),
      ]));
    }
  });

  it('does not import or mutate live catalog quiz UI storage audio scoring or navigation', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'tools/personal_plan_gavan_week1_ui_route_adapter_design.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
