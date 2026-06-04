import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1CatalogSourceInventory,
} from '../tools/personal_plan_gavan_week1_catalog_source_inventory';
import {
  buildGavanWeek1CatalogAdapterDesign,
  GAVAN_WEEK1_CATALOG_ADAPTER_DESIGN_PATH,
  writeGavanWeek1CatalogAdapterDesign,
} from '../tools/personal_plan_gavan_week1_catalog_adapter_design';
import {
  blockedCatalogSourceInventory,
} from './personal_plan_gavan_week1_route_chain_fixtures';

const GENERATED_AT = '2026-06-03T06:35:00.000Z';

function inventory(): GavanWeek1CatalogSourceInventory {
  return blockedCatalogSourceInventory();
}

describe('Gavan week 1 catalog adapter design', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_CATALOG_ADAPTER_DESIGN_PATH)) {
      rmSync(GAVAN_WEEK1_CATALOG_ADAPTER_DESIGN_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1CatalogAdapterDesign(inventory(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_CATALOG_ADAPTER_DESIGN_PATH,
    });
  });

  it('builds a blocked non-live adapter design from the source inventory', () => {
    const result = buildGavanWeek1CatalogAdapterDesign(inventory(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.design).toEqual(expect.objectContaining({
      kind: 'gavan_week1_catalog_adapter_design',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'catalog_adapter_design_blocked_not_applied',
      sourceInventoryStatus: 'catalog_source_inventory_blocked_not_applied',
      catalogRoutePlanningBlocked: true,
      blockingDependency: 'missing_signature:product_copy',
      canOpenCatalogRouteTask: false,
      catalogSourceEdited: false,
      sourceWritesUsed: false,
      liveEditsAllowed: false,
      routeRegistrationAllowed: false,
    }));
    expect(result.design?.phaseWriteTargets).toEqual([]);
  });

  it('maps proposed approved day ids without marking them registered or playable', () => {
    const result = buildGavanWeek1CatalogAdapterDesign(inventory(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.design?.proposedDayMappings).toHaveLength(6);
    expect(result.design?.proposedDayMappings.map((mapping: { dayId: string }) => mapping.dayId)).toEqual([
      'gavan-week1-day2',
      'gavan-week1-day3',
      'gavan-week1-day4',
      'gavan-week1-day5',
      'gavan-week1-day6',
      'gavan-week1-day7',
    ]);
    expect(result.design?.proposedDayMappings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        dayIndex: 2,
        currentCatalogPresence: 'missing',
        futureRouteAction: 'replace_scaffold_day_after_signature',
        productionRouteRegistered: false,
        playable: false,
      }),
    ]));
    expect(result.design?.proposedDayMappings.every((mapping: { status: string }) =>
      mapping.status === 'not_allowed_until_signature',
    )).toBe(true);
  });

  it('records compatibility findings for scaffold minute-load task-destination and old-catalog behavior', () => {
    const result = buildGavanWeek1CatalogAdapterDesign(inventory(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.design?.compatibilityFindings).toEqual([
      expect.objectContaining({
        id: 'current_scaffold_days',
        status: 'requires_preservation_plan',
        releaseRisk: 'old_generated_days_must_not_disappear_silently',
      }),
      expect.objectContaining({
        id: 'minute_load_behavior',
        status: 'requires_adapter_contract',
        releaseRisk: 'time_choice_must_keep_5_10_15_20_minute_behavior',
      }),
      expect.objectContaining({
        id: 'task_destination_behavior',
        status: 'requires_adapter_contract',
        releaseRisk: 'tasks_must_open_existing_lessons_quizzes_or_plan_exercises_correctly',
      }),
      expect.objectContaining({
        id: 'legacy_catalog_preservation',
        status: 'requires_regression_tests',
        releaseRisk: 'self-guided_and_existing_plan_paths_must_not_change',
      }),
    ]);
  });

  it('keeps future live-route acceptance criteria blocked until product-copy signature exists', () => {
    const result = buildGavanWeek1CatalogAdapterDesign(inventory(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.design?.futureLiveRouteAcceptanceCriteria).toEqual([
      expect.objectContaining({
        id: 'content_quality_signature_present',
        status: 'not_allowed_until_signature',
      }),
      expect.objectContaining({
        id: 'approved_day_ids_registered',
        status: 'not_allowed_until_signature',
      }),
      expect.objectContaining({
        id: 'minute_choices_preserved',
        status: 'not_allowed_until_signature',
      }),
      expect.objectContaining({
        id: 'legacy_catalog_regression_passes',
        status: 'not_allowed_until_signature',
      }),
      expect.objectContaining({
        id: 'route_playability_verified',
        status: 'not_allowed_until_signature',
      }),
    ]);
  });

  it('rejects unsafe inventory instead of opening route registration', () => {
    const unsafeInventory = {
      ...inventory(),
      sourceWritesUsed: true,
      phaseWriteTargets: ['app/personal_plan_catalog.ts'],
    } as unknown as GavanWeek1CatalogSourceInventory;
    const unblockedInventory = {
      ...inventory(),
      catalogRoutePlanningBlocked: false,
      canOpenCatalogRouteTask: true,
    } as unknown as GavanWeek1CatalogSourceInventory;

    const unsafeResult = buildGavanWeek1CatalogAdapterDesign(unsafeInventory, {
      generatedAt: GENERATED_AT,
    });
    const unblockedResult = buildGavanWeek1CatalogAdapterDesign(unblockedInventory, {
      generatedAt: GENERATED_AT,
    });

    expect(unsafeResult.valid).toBe(false);
    expect(unsafeResult.design).toBeUndefined();
    expect(unsafeResult.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'source_writes_not_allowed' }),
    ]));
    expect(unblockedResult.valid).toBe(false);
    expect(unblockedResult.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'inventory_not_blocked' }),
    ]));
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const result = writeGavanWeek1CatalogAdapterDesign(inventory(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_CATALOG_ADAPTER_DESIGN_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-catalog-adapter-design.json',
    ));
    expect(existsSync(GAVAN_WEEK1_CATALOG_ADAPTER_DESIGN_PATH)).toBe(true);

    const parsed = JSON.parse(readFileSync(GAVAN_WEEK1_CATALOG_ADAPTER_DESIGN_PATH, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_catalog_adapter_design');
    expect(parsed.status).toBe('catalog_adapter_design_blocked_not_applied');
    expect(parsed.routeRegistrationAllowed).toBe(false);
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1CatalogAdapterDesign(inventory(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-catalog-adapter-design.json'),
    });
    const toolsResult = writeGavanWeek1CatalogAdapterDesign(inventory(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-catalog-adapter-design.json'),
    });
    const testsResult = writeGavanWeek1CatalogAdapterDesign(inventory(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-catalog-adapter-design.json'),
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
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_catalog_adapter_design.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
