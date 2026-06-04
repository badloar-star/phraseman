import fs from 'fs';
import path from 'path';

import type { GavanWeek1CatalogAdapterDesign } from '../tools/personal_plan_gavan_week1_catalog_adapter_design';
import type { GavanWeek1QuizAdapterDesign } from '../tools/personal_plan_gavan_week1_quiz_adapter_design';
import type { GavanWeek1UiRouteAdapterDesign } from '../tools/personal_plan_gavan_week1_ui_route_adapter_design';
import {
  buildGavanWeek1AggregateRouteReadinessGate,
  GAVAN_WEEK1_AGGREGATE_ROUTE_READINESS_GATE_PATH,
  writeGavanWeek1AggregateRouteReadinessGate,
} from '../tools/personal_plan_gavan_week1_aggregate_route_readiness_gate';

const GENERATED_AT = '2026-06-03T09:20:00.000Z';
const BROKEN_ENCODING_RE = /[\u00d0\u00c2\u00e2\ufffd]/;

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8')) as T;
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

function uiDesign(): GavanWeek1UiRouteAdapterDesign {
  const openingFamilies = [
    'lesson',
    'plan_phrase',
    'quiz',
    'plan_renderer',
    'lesson_shell',
  ] as const;
  const openingIds = [
    'lesson_task_opening',
    'plan_phrase_task_opening',
    'dedicated_quiz_task_opening',
    'plan_renderer_task_opening',
    'lesson_shell_task_opening',
  ] as const;
  const regressionGateIds = [
    'home_entrypoint_preserved',
    'onboarding_flow_preserved',
    'premium_flow_preserved',
    'self_guided_lessons_preserved',
    'self_guided_quizzes_preserved',
    'plan_task_carryover_preserved',
    'completed_day_state_preserved',
  ] as const;

  return {
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
    openingContracts: openingFamilies.map((taskFamily, index) => ({
      id: openingIds[index],
      taskFamily,
      requiredSurfaceIds: [],
      requiredRouteAbilityIds: [],
      sourceSurfaceCoverage: 'all_required_surfaces_detected',
      routeAbilityCoverage: 'all_required_abilities_detected',
      missingSurfaceIds: [],
      missingRouteAbilityIds: [],
      status: 'not_allowed_until_signature',
      routeRegistered: false,
      playable: false,
      writeActionAllowed: false,
      liveAcceptanceStatus: 'not_allowed_until_signature',
    })),
    regressionGates: regressionGateIds.map((id) => ({
      id,
      status: 'not_allowed_until_signature',
      requiredBeforeLive: true,
      writeActionAllowed: false,
      requiredEvidence: `${id} must pass before live route work.`,
    })),
    dependencySummary: {
      catalogDayMappings: 6,
      quizRouteDesigns: 6,
      catalogRouteRegistrationAllowed: false,
      quizRouteRegistrationAllowed: false,
      allDependenciesBlocked: true,
      liveBridgeAllowed: false,
    },
    futureLiveAcceptanceCriteria: [],
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
    },
  } as unknown as GavanWeek1UiRouteAdapterDesign;
}

describe('Gavan week 1 aggregate route readiness gate', () => {
  it('builds a blocked aggregate readiness gate from catalog quiz and UI designs', () => {
    const result = buildGavanWeek1AggregateRouteReadinessGate(
      catalogDesign(),
      quizDesign(),
      uiDesign(),
      { generatedAt: GENERATED_AT },
    );

    expect(result.valid).toBe(true);
    expect(result.gate).toEqual(expect.objectContaining({
      kind: 'gavan_week1_aggregate_route_readiness_gate',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'aggregate_route_readiness_blocked_not_applied',
      sourceCatalogAdapterStatus: 'catalog_adapter_design_blocked_not_applied',
      sourceQuizAdapterStatus: 'quiz_adapter_design_blocked_not_applied',
      sourceUiRouteAdapterStatus: 'ui_route_adapter_design_blocked_not_applied',
      blockingDependency: 'missing_signature:product_copy',
      readyForLive: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      liveEditsAllowed: false,
      catalogRouteRegistrationAllowed: false,
      quizRouteRegistrationAllowed: false,
      uiRouteRegistrationAllowed: false,
    }));
  });

  it('checks catalog day ids count and blocked mapping state', () => {
    const result = buildGavanWeek1AggregateRouteReadinessGate(
      catalogDesign(),
      quizDesign(),
      uiDesign(),
      { generatedAt: GENERATED_AT },
    );

    expect(result.gate?.readinessMatrix.catalog).toEqual({
      dayMappingCount: 6,
      expectedDayMappingCount: 6,
      blockedMappingCount: 6,
      registeredMappingCount: 0,
      playableMappingCount: 0,
      status: 'not_allowed_until_signature',
      readyForLive: false,
    });
    expect(result.gate?.catalogDayIds).toEqual([
      'gavan-week1-day2',
      'gavan-week1-day3',
      'gavan-week1-day4',
      'gavan-week1-day5',
      'gavan-week1-day6',
      'gavan-week1-day7',
    ]);
  });

  it('checks quiz route designs count ten-question requirement and blocked state', () => {
    const result = buildGavanWeek1AggregateRouteReadinessGate(
      catalogDesign(),
      quizDesign(),
      uiDesign(),
      { generatedAt: GENERATED_AT },
    );

    expect(result.gate?.readinessMatrix.quiz).toEqual({
      quizRouteDesignCount: 6,
      expectedQuizRouteDesignCount: 6,
      blockedQuizCount: 6,
      tenQuestionQuizCount: 6,
      registeredQuizCount: 0,
      playableQuizCount: 0,
      status: 'not_allowed_until_signature',
      readyForLive: false,
    });
    expect(result.gate?.quizIds).toEqual([
      'gavan-week1-day2-quiz',
      'gavan-week1-day3-quiz',
      'gavan-week1-day4-quiz',
      'gavan-week1-day5-quiz',
      'gavan-week1-day6-quiz',
      'gavan-week1-day7-quiz',
    ]);
  });

  it('checks UI opening contracts and protected regression gates', () => {
    const result = buildGavanWeek1AggregateRouteReadinessGate(
      catalogDesign(),
      quizDesign(),
      uiDesign(),
      { generatedAt: GENERATED_AT },
    );

    expect(result.gate?.readinessMatrix.ui).toEqual(expect.objectContaining({
      openingContractCount: 5,
      expectedOpeningContractCount: 5,
      blockedOpeningContractCount: 5,
      coveredOpeningContractCount: 5,
      regressionGateCount: 7,
      blockedRegressionGateCount: 7,
      status: 'not_allowed_until_signature',
      readyForLive: false,
    }));
    expect(result.gate?.uiOpeningFamilies).toEqual([
      'lesson',
      'plan_phrase',
      'quiz',
      'plan_renderer',
      'lesson_shell',
    ]);
    expect(result.gate?.regressionGateIds).toEqual([
      'home_entrypoint_preserved',
      'onboarding_flow_preserved',
      'premium_flow_preserved',
      'self_guided_lessons_preserved',
      'self_guided_quizzes_preserved',
      'plan_task_carryover_preserved',
      'completed_day_state_preserved',
    ]);
  });

  it('keeps every blocker and live acceptance criterion blocked until signature', () => {
    const result = buildGavanWeek1AggregateRouteReadinessGate(
      catalogDesign(),
      quizDesign(),
      uiDesign(),
      { generatedAt: GENERATED_AT },
    );

    expect(result.gate?.routeBlockers.map((blocker: { id: string }) => blocker.id)).toEqual([
      'missing_signature:product_copy',
      'catalog_routes_not_registered',
      'quiz_routes_not_registered',
      'ui_routes_not_registered',
      'live_regression_not_run',
    ]);
    expect(result.gate?.routeBlockers.every((blocker: { status: string }) =>
      blocker.status === 'not_allowed_until_signature',
    )).toBe(true);
    expect(result.gate?.futureLiveAcceptanceCriteria.every((criterion: { status: string }) =>
      criterion.status === 'not_allowed_until_signature',
    )).toBe(true);
  });

  it('rejects unsafe or unblocked inputs instead of producing readiness', () => {
    const unsafeCatalog = {
      ...catalogDesign(),
      routeRegistrationAllowed: true,
    } as unknown as GavanWeek1CatalogAdapterDesign;
    const unsafeQuiz = {
      ...quizDesign(),
      quizRouteRegistrationAllowed: true,
    } as unknown as GavanWeek1QuizAdapterDesign;
    const unsafeUi = {
      ...uiDesign(),
      uiRouteRegistrationAllowed: true,
    } as unknown as GavanWeek1UiRouteAdapterDesign;

    expect(buildGavanWeek1AggregateRouteReadinessGate(
      unsafeCatalog,
      quizDesign(),
      uiDesign(),
      { generatedAt: GENERATED_AT },
    ).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'catalog_design_not_blocked' }),
    ]));
    expect(buildGavanWeek1AggregateRouteReadinessGate(
      catalogDesign(),
      unsafeQuiz,
      uiDesign(),
      { generatedAt: GENERATED_AT },
    ).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'quiz_design_not_blocked' }),
    ]));
    expect(buildGavanWeek1AggregateRouteReadinessGate(
      catalogDesign(),
      quizDesign(),
      unsafeUi,
      { generatedAt: GENERATED_AT },
    ).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ui_design_not_blocked' }),
    ]));
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const targetPath = path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-aggregate-route-readiness-gate.json',
    );
    const result = writeGavanWeek1AggregateRouteReadinessGate(
      catalogDesign(),
      quizDesign(),
      uiDesign(),
      { generatedAt: GENERATED_AT, targetPath },
    );

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(targetPath);
    expect(result.bytesWritten).toBeGreaterThan(1000);
    expect(fs.existsSync(GAVAN_WEEK1_AGGREGATE_ROUTE_READINESS_GATE_PATH)).toBe(true);

    const written = readJson<unknown>('.codex-tmp/personal-plans/gavan-week1-aggregate-route-readiness-gate.json');
    expect(written).toEqual(result.gate);
    expect(JSON.stringify(written)).not.toMatch(BROKEN_ENCODING_RE);
  });

  it('rejects app tools tests and root config write targets', () => {
    for (const targetPath of [
      path.join(process.cwd(), 'app', 'personal_plan.tsx'),
      path.join(process.cwd(), 'components', 'PersonalPlanHomeRouteCard.tsx'),
      path.join(process.cwd(), 'tools', 'unsafe-route-readiness.json'),
      path.join(process.cwd(), 'tests', 'unsafe-route-readiness.json'),
      path.join(process.cwd(), 'package.json'),
    ]) {
      const result = writeGavanWeek1AggregateRouteReadinessGate(
        catalogDesign(),
        quizDesign(),
        uiDesign(),
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
      path.join(process.cwd(), 'tools/personal_plan_gavan_week1_aggregate_route_readiness_gate.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
