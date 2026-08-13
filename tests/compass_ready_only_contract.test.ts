import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const exists = (relativePath: string): boolean => fs.existsSync(path.join(ROOT, relativePath));

function blockBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, Math.max(0, startIndex + start.length));
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
}

describe('Compass ready-only retirement boundary', () => {
  const surface = read('components/compass/CompassSurface.tsx');
  const host = read('components/compass/CompassCenterHost.tsx');
  const context = read('components/compass/CompassCenterContext.tsx');
  const page = read('components/compass/CompassPage.tsx');
  const tabsLayout = read('app/(tabs)/_layout.tsx');
  const devSeeds = read('components/dev/compassDevSeeds.ts');
  const devPreview = read('components/dev/CompassDevPreview.tsx');
  const devRegistry = read('components/dev/devToolRegistry.ts');
  const devHub = read('components/dev/DevHubSheet.tsx');

  test('the production surface accepts only a ready recommendation', () => {
    expect(surface).toMatch(/recommendation\s*:\s*CompassSurfaceRecommendation\s*;/);
    expect(surface).not.toMatch(/recommendation\s*:\s*CompassSurfaceRecommendation\s*\|\s*null/);
    expect(surface).not.toContain('recommendation?.');
    expect(surface).not.toMatch(/\bloading\??\s*:/);
    expect(surface).not.toContain('SkeletonBlock');
    expect(surface).not.toContain('SkeletonShimmer');
    expect(surface).not.toMatch(/loadingTitle|loadingBody|loadingContent/i);
    expect(surface).not.toMatch(/insufficientTitle|insufficientBody/i);
    expect(surface).not.toMatch(/\bchoose\s*:/);
    expect(surface).not.toMatch(/nextTitle|nextBody|nextPanel|nextCopy|nextIcon/);
    expect(surface).not.toContain('Что будет дальше');
  });

  test('Home, overlay and page entry cannot expose Compass before it is ready', () => {
    const triggerIndex = host.indexOf('testID="compass-home-control"');
    expect(triggerIndex).toBeGreaterThan(0);
    const triggerGate = host.slice(Math.max(0, triggerIndex - 500), triggerIndex);
    expect(triggerGate).toMatch(/hasSafeDailyStep|readyPresentation|recommendation|compass(?:Ready|Eligible|Available)|hasReadyCompass/i);

    const overlayCall = host.match(/useOverlayVisible\(\s*['"]compassBriefing['"]\s*,[\s\S]{0,180}?\)/)?.[0] ?? '';
    expect(overlayCall).toMatch(/hasSafeDailyStep|readyPresentation|recommendation|compass(?:Ready|Eligible|Available)|hasReadyCompass/i);
    expect(host).not.toMatch(/\bloading=\{/);
    expect(page).not.toMatch(/\bloading=\{/);

    const requestSheet = blockBetween(context, 'const requestSheet', 'const requestClose');
    expect(requestSheet).toMatch(/status\s*!==?\s*['"]ready['"]|readyPresentation|compass(?:Ready|Eligible|Available)|hasReadyCompass/i);
    expect(context).not.toContain("{ pathname: '/lessons_list' as const }");

    // The hidden physical page must be gated at navigation/gesture level. Merely
    // hiding its children after a completed swipe still exposes an empty frame.
    const tabSlider = read('app/TabSlider.tsx');
    expect(tabsLayout).toMatch(/<TabSlider[\s\S]{0,300}?minIndex=\{\s*compassReady\s*\?\s*0\s*:\s*1\s*\}/);
    expect(tabSlider).toContain('minIndex?: number');
    expect(tabSlider).toContain('currentIdx.value > minimumIdx.value');
    expect(page).toMatch(/if\s*\([\s\S]{0,100}?(?:recommendation|readyPresentation|compass(?:Ready|Eligible|Available)|hasReadyCompass|status\s*!==?\s*['"]ready['"])[\s\S]{0,100}?return\s+null/i);
  });

  test('retired Personal Plan and overdue signals cannot return through Compass', () => {
    const productionCompass = [
      'app/compass_recommendation.ts',
      'app/compass_recommendation_adapters.ts',
      'app/compass_recommendation_loader.ts',
      'app/compass_presenter.ts',
      'components/compass/CompassCenterContext.tsx',
      'components/compass/CompassCenterHost.tsx',
      'components/compass/CompassPage.tsx',
      'components/compass/CompassSurface.tsx',
    ].map(read).join('\n');

    expect(productionCompass).not.toMatch(/personal_plan|PersonalPlan|personalPlan|personal-plan/);
    expect(productionCompass).not.toMatch(/\boverdue\b|trainer_overdue/);
  });

  test('DEV Hub previews only recommendations that are already ready', () => {
    const compassRegistrySection = blockBetween(devRegistry, "id: 'compass'", "id: 'league'");
    for (const retiredSeed of ['loading', 'insufficient', 'personal-plan']) {
      expect(devRegistry).not.toContain(`preview-compass-${retiredSeed}`);
      expect(devHub).not.toContain(`preview-compass-${retiredSeed}`);
    }
    expect(devSeeds).not.toMatch(/['"]loading['"]|['"]insufficient['"]|['"]personal-plan['"]/);
    expect(devSeeds).not.toMatch(/personal_plan|PersonalPlan|personalPlan/);
    expect(`${devSeeds}\n${devPreview}\n${compassRegistrySection}`).not.toMatch(/\boverdue\b|trainer_overdue/);
    expect(devPreview).not.toMatch(/\bloading=\{/);
    expect(devSeeds).not.toMatch(/recommendation\s*:\s*[^;\n]*\|\s*null/);
  });

  test('Personal Plans remain a standalone live product', () => {
    for (const relativePath of [
      'app/personal_plan.tsx',
      'app/personal_plan_state.ts',
      'app/personal_plan_catalog.ts',
      'app/personal_plan_exercise.tsx',
      'components/PersonalPlanHomeRouteCard.tsx',
    ]) {
      expect(exists(relativePath)).toBe(true);
    }

    const rootLayout = read('app/_layout.tsx');
    expect(rootLayout).toContain('name="personal_plan"');
    expect(rootLayout).toContain('name="personal_plan_quiz"');
    expect(rootLayout).toContain('name="personal_plan_complete"');

    const personalPlanScreen = read('app/personal_plan.tsx');
    expect(personalPlanScreen).toContain("from './personal_plan_state'");
    expect(personalPlanScreen).toContain("from './personal_plan_catalog'");
  });
});
