import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1CatalogRoutePreflight,
} from '../tools/personal_plan_gavan_week1_catalog_route_preflight';
import {
  buildGavanWeek1CatalogSourceInventory,
  GAVAN_WEEK1_CATALOG_SOURCE_INVENTORY_PATH,
  writeGavanWeek1CatalogSourceInventory,
} from '../tools/personal_plan_gavan_week1_catalog_source_inventory';
import {
  blockedCatalogRoutePreflight,
} from './personal_plan_gavan_week1_route_chain_fixtures';

const GENERATED_AT = '2026-06-03T06:05:00.000Z';
const BROKEN_ENCODING_RE = /[\u00d0\u00c2\u00e2\ufffd]/;

function preflight(): GavanWeek1CatalogRoutePreflight {
  return blockedCatalogRoutePreflight();
}

function catalogSource(): string {
  return readFileSync(path.join(process.cwd(), 'app', 'personal_plan_catalog.ts'), 'utf8');
}

describe('Gavan week 1 catalog source inventory', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_CATALOG_SOURCE_INVENTORY_PATH)) {
      rmSync(GAVAN_WEEK1_CATALOG_SOURCE_INVENTORY_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1CatalogSourceInventory(preflight(), catalogSource(), {
      generatedAt: GENERATED_AT,
      sourcePath: 'app/personal_plan_catalog.ts',
      targetPath: GAVAN_WEEK1_CATALOG_SOURCE_INVENTORY_PATH,
    });
  });

  it('builds a blocked read-only inventory from the catalog route preflight', () => {
    const result = buildGavanWeek1CatalogSourceInventory(preflight(), catalogSource(), {
      generatedAt: GENERATED_AT,
      sourcePath: 'app/personal_plan_catalog.ts',
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.inventory).toEqual(expect.objectContaining({
      kind: 'gavan_week1_catalog_source_inventory',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'catalog_source_inventory_blocked_not_applied',
      sourcePreflightStatus: 'catalog_route_preflight_blocked_by_product_copy_signature_not_applied',
      catalogRoutePlanningBlocked: true,
      blockingDependency: 'missing_signature:product_copy',
      canOpenCatalogRouteTask: false,
      catalogSourceEdited: false,
      sourceWritesUsed: false,
    }));
    expect(result.inventory?.phaseWriteTargets).toEqual([]);
  });

  it('reports proposed day ids as missing from the current catalog source', () => {
    const result = buildGavanWeek1CatalogSourceInventory(preflight(), catalogSource(), {
      generatedAt: GENERATED_AT,
      sourcePath: 'app/personal_plan_catalog.ts',
    });

    expect(result.inventory?.sourceFindings.proposedDayIds).toEqual([
      'gavan-week1-day2',
      'gavan-week1-day3',
      'gavan-week1-day4',
      'gavan-week1-day5',
      'gavan-week1-day6',
      'gavan-week1-day7',
    ]);
    expect(result.inventory?.sourceFindings.existingProposedDayIds).toEqual([]);
    expect(result.inventory?.sourceFindings.missingProposedDayIds).toHaveLength(6);
  });

  it('captures descriptive source findings without inventing broken encoding in clean source', () => {
    const result = buildGavanWeek1CatalogSourceInventory(preflight(), catalogSource(), {
      generatedAt: GENERATED_AT,
      sourcePath: 'app/personal_plan_catalog.ts',
    });

    expect(result.inventory?.sourceFindings.containsPlanIdGavan).toBe(true);
    expect(result.inventory?.sourceFindings.containsGeneratedDayFactory).toBe(true);
    expect(result.inventory?.sourceFindings.containsTasksForMinutes).toBe(true);
    expect(result.inventory?.sourceFindings.containsBrokenEncoding).toBe(false);
    expect(result.inventory?.descriptiveFindings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'catalog_has_generated_scaffold' }),
      expect.objectContaining({ code: 'proposed_day_ids_missing' }),
    ]));
    expect(result.inventory?.descriptiveFindings).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'catalog_has_broken_encoding_markers' }),
    ]));
    expect(JSON.stringify(result.inventory)).not.toMatch(BROKEN_ENCODING_RE);
  });

  it('detects broken encoding markers in a synthetic source without copying the bad text', () => {
    const result = buildGavanWeek1CatalogSourceInventory(
      preflight(),
      `${catalogSource()}\nconst broken = '${String.fromCharCode(0x00d0)}';\n`,
      {
        generatedAt: GENERATED_AT,
        sourcePath: 'app/personal_plan_catalog.ts',
      },
    );

    expect(result.inventory?.sourceFindings.containsBrokenEncoding).toBe(true);
    expect(result.inventory?.descriptiveFindings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'catalog_has_broken_encoding_markers' }),
    ]));
    expect(JSON.stringify(result.inventory)).not.toMatch(BROKEN_ENCODING_RE);
  });

  it('rejects unsafe or unblocked preflights instead of opening catalog work', () => {
    const unsafePreflight = {
      ...preflight(),
      sourceWritesUsed: true,
      phaseWriteTargets: ['app/personal_plan_catalog.ts'],
    } as unknown as GavanWeek1CatalogRoutePreflight;
    const unblockedPreflight = {
      ...preflight(),
      catalogRoutePlanningBlocked: false,
      canOpenCatalogRouteTask: true,
    } as unknown as GavanWeek1CatalogRoutePreflight;

    const unsafeResult = buildGavanWeek1CatalogSourceInventory(unsafePreflight, catalogSource(), {
      generatedAt: GENERATED_AT,
      sourcePath: 'app/personal_plan_catalog.ts',
    });
    const unblockedResult = buildGavanWeek1CatalogSourceInventory(unblockedPreflight, catalogSource(), {
      generatedAt: GENERATED_AT,
      sourcePath: 'app/personal_plan_catalog.ts',
    });

    expect(unsafeResult.valid).toBe(false);
    expect(unsafeResult.inventory).toBeUndefined();
    expect(unsafeResult.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'source_writes_not_allowed' }),
    ]));
    expect(unblockedResult.valid).toBe(false);
    expect(unblockedResult.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'catalog_preflight_not_blocked' }),
    ]));
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const result = writeGavanWeek1CatalogSourceInventory(preflight(), catalogSource(), {
      generatedAt: GENERATED_AT,
      sourcePath: 'app/personal_plan_catalog.ts',
      targetPath: GAVAN_WEEK1_CATALOG_SOURCE_INVENTORY_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-catalog-source-inventory.json',
    ));
    expect(existsSync(GAVAN_WEEK1_CATALOG_SOURCE_INVENTORY_PATH)).toBe(true);

    const serialized = readFileSync(GAVAN_WEEK1_CATALOG_SOURCE_INVENTORY_PATH, 'utf8');
    expect(serialized).not.toMatch(BROKEN_ENCODING_RE);

    const parsed = JSON.parse(serialized);
    expect(parsed.kind).toBe('gavan_week1_catalog_source_inventory');
    expect(parsed.status).toBe('catalog_source_inventory_blocked_not_applied');
    expect(parsed.catalogSourceEdited).toBe(false);
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1CatalogSourceInventory(preflight(), catalogSource(), {
      generatedAt: GENERATED_AT,
      sourcePath: 'app/personal_plan_catalog.ts',
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-catalog-source-inventory.json'),
    });
    const toolsResult = writeGavanWeek1CatalogSourceInventory(preflight(), catalogSource(), {
      generatedAt: GENERATED_AT,
      sourcePath: 'app/personal_plan_catalog.ts',
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-catalog-source-inventory.json'),
    });
    const testsResult = writeGavanWeek1CatalogSourceInventory(preflight(), catalogSource(), {
      generatedAt: GENERATED_AT,
      sourcePath: 'app/personal_plan_catalog.ts',
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-catalog-source-inventory.json'),
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
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_catalog_source_inventory.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
