import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const exists = (relativePath: string): boolean => fs.existsSync(path.join(ROOT, relativePath));
const read = (relativePath: string): string => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

const FUTURE_ONLY_FILES = [
  'app/compass_ai_explanation.ts',
  'app/compass_auto_open.ts',
  'app/compass_presenter.ts',
  'app/compass_recommendation.ts',
  'app/compass_recommendation_adapters.ts',
  'app/compass_recommendation_loader.ts',
  'app/compass_sheet_lifecycle.ts',
  'app/compass_surface_model.ts',
  'components/dev/CompassDevPreview.tsx',
  'components/dev/compassDevSeeds.ts',
  'functions/src/compass_ai_explanation.ts',
] as const;

describe('Compass Center release boundary', () => {
  test('future Compass implementation is absent from the release tree', () => {
    for (const relativePath of FUTURE_ONLY_FILES) {
      expect(exists(relativePath)).toBe(false);
    }
    const componentDirectory = path.join(ROOT, 'components', 'compass');
    expect(
      fs.existsSync(componentDirectory)
        ? fs.readdirSync(componentDirectory).filter((name) => !name.startsWith('.'))
        : [],
    ).toEqual([]);
  });

  test('tabs and Dev Lab cannot open or preview Compass', () => {
    const layout = read('app/(tabs)/_layout.tsx');
    const tabContext = read('app/TabContext.tsx');
    const pageModel = read('app/tab_page_model.ts');
    const devHub = read('components/dev/DevHubSheet.tsx');
    const devRegistry = read('components/dev/devToolRegistry.ts');
    const forbidden = /CompassCenter|CompassQuickSheet|CompassPage|compassReady|compassPageVisible|onOpenCompass|preview-compass|compassDevSeeds|key="compass"/;

    expect(layout).not.toMatch(forbidden);
    expect(tabContext).not.toMatch(forbidden);
    expect(devHub).not.toMatch(forbidden);
    expect(devRegistry).not.toMatch(forbidden);
    expect(pageModel).toContain("PHYSICAL_PAGE_IDS = [...LOGICAL_TAB_IDS]");
    expect(pageModel).not.toMatch(/PHYSICAL_PAGE_IDS[^\n]*compass/i);
  });

  test('Compass callable cannot be exported or deployed', () => {
    const functionsIndex = read('functions/src/index.ts');
    expect(functionsIndex).not.toMatch(/compassExplainWhyNow|compass_ai_explanation/);
  });

  test('closed Compass data tombstones stay deny-only', () => {
    const rules = read('firestore.rules');
    for (const collection of [
      'compass_why_cache',
      'compass_why_rate_limits',
      'compass_why_daily_budget',
      'compass_why_billing',
    ]) {
      expect(rules).toMatch(
        new RegExp(`match \\/${collection}\\/{docId\\} \\{\\s*allow read, write: if false;\\s*\\}`),
      );
    }
  });

  test('legacy overlay safety remains intact', () => {
    const overlay = read('components/overlay_arbiter_core.ts');
    expect(overlay).toContain("'compassBriefing'");
  });
});
