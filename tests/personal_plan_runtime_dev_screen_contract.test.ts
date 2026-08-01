import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

function readAppFile(fileName: string): string {
  return fs.readFileSync(path.join(ROOT, 'app', fileName), 'utf8');
}

describe('personal plan runtime dev screen contract', () => {
  const runtimeSource = readAppFile('personal_plan_runtime_dev.tsx');
  const devSource = readAppFile('personal_plan_dev.tsx');
  const layoutSource = readAppFile('_layout.tsx');
  const devRoutesSource = fs.readFileSync(path.join(ROOT, 'constants', 'devRoutes.ts'), 'utf8');

  it('registers the runtime dev route without replacing existing plan routes', () => {
    expect(layoutSource).toContain('<Stack.Screen name="personal_plan" options={{ headerShown: false }} />');
    expect(layoutSource).toContain('<Stack.Screen name="personal_plan_dev" options={{ headerShown: false }} />');
    expect(layoutSource).toContain('<Stack.Screen name="personal_plan_runtime_dev" options={{ headerShown: false }} />');
  });

  it('allows Maestro warm deep links into runtime dev without duplicating Stack registration', () => {
    expect(layoutSource).toContain('PERSONAL_PLAN_RUNTIME_DEV_ROUTE');
    expect(layoutSource).toContain('function isDevOnlyRuntimeRoutePath');
    expect(layoutSource).toContain('path.startsWith(PERSONAL_PLAN_RUNTIME_DEV_ROUTE)');
    expect(devRoutesSource).toContain('PERSONAL_PLAN_RUNTIME_DEV_ROUTE_NAME');
    expect(devRoutesSource).toContain('PERSONAL_PLAN_RUNTIME_DEV_ROUTE');
    expect(devRoutesSource).toContain('PERSONAL_PLAN_RUNTIME_DEV_ROUTE,');
    expect(devRoutesSource).not.toContain('PERSONAL_PLAN_RUNTIME_DEV_ROUTE_NAME,');
  });

  it('exposes the runtime screen from the existing dev calendar only', () => {
    expect(devSource).toContain("router.push('/personal_plan_runtime_dev' as any)");
    expect(devSource).toContain('Открыть новый runtime заданий');
    expect(devSource).toContain('Runtime');
  });

  it('uses the new runtime controller and scoped AsyncStorage adapter', () => {
    expect(runtimeSource).toContain('createPlanDayRuntimeScreenController');
    expect(runtimeSource).toContain('createAsyncStoragePlanDayRuntimeStorageAdapter');
    expect(runtimeSource).toContain('buildGavanWeek1CanonicalRuntimeBridge');
    expect(runtimeSource).toContain('buildGavanWeek1CanonicalRuntimeBundles');
    expect(runtimeSource).toContain('dev-runtime-gavan-week1-day');
    expect(runtimeSource).toContain("planId: 'gavan'");
    expect(runtimeSource).toContain('dayIndex');
  });

  it('does not use the old plan task renderer or production activation flow', () => {
    expect(runtimeSource).not.toContain('openPersonalPlanTask');
    expect(runtimeSource).not.toContain('markPersonalPlanTaskCompleted');
    expect(runtimeSource).not.toContain('submitAndStorePlanExerciseAnswer');
    expect(runtimeSource).not.toContain('activatePersonalPlan');
    expect(runtimeSource).not.toContain('readPersonalPlanState');
  });

  it('supports the first runtime exercise modes with large mobile actions', () => {
    expect(runtimeSource).toContain('current.freeInputExpected');
    expect(runtimeSource).toContain('current.choices.map');
    expect(runtimeSource).toContain('controller.answer');
    expect(runtimeSource).toContain('controller.persist');
    expect(runtimeSource).toContain('controller.reset');
    expect(runtimeSource).toContain('testID="plan-runtime-dev-screen"');
    expect(runtimeSource).toContain('testID={`plan-runtime-day-${choice}`}');
    expect(runtimeSource).toContain('testID={`plan-runtime-choice-${index + 1}`}');
    expect(runtimeSource).toContain('testID="plan-runtime-submit"');
    expect(runtimeSource).toContain('testID="plan-runtime-reset"');
    expect(runtimeSource).toContain('minHeight: 62');
    expect(runtimeSource).toContain('minHeight: 56');
  });

  it('keeps the runtime section shell intact while giving each exercise mode its own card interface', () => {
    expect(runtimeSource).toContain('testID="plan-runtime-active-exercise"');
    expect(runtimeSource).toContain("current?.exerciseType === 'plan_choose_natural_phrase'");
    expect(runtimeSource).toContain("current?.exerciseType === 'plan_missing_word'");
    expect(runtimeSource).toContain("current?.exerciseType === 'plan_phrase_recall'");
    expect(runtimeSource).toContain('styles.modeSurface');
    expect(runtimeSource).toContain('styles.meaningHeadline');
    expect(runtimeSource).toContain('styles.blankSentence');
    expect(runtimeSource).toContain('isMissingWordMode ? styles.choiceChipGrid : styles.choiceList');
    expect(runtimeSource).toContain('selectedBuildTiles.map');
    expect(runtimeSource).toContain('testID={`plan-runtime-selected-tile-${index + 1}`}');
    expect(runtimeSource).toContain('removeSelectedTile(index)');
    expect(runtimeSource).toContain('Слова появятся здесь');
    expect(runtimeSource).toContain('Введи английскую фразу');
  });

  it('keeps screen copy clean for the new runtime route', () => {
    expect(runtimeSource).not.toMatch(/[ÃÂÐÑâ]/);
    expect(runtimeSource.toLowerCase()).not.toContain('placeholder renderer');
    expect(runtimeSource.toLowerCase()).not.toContain('draft copy');
    expect(runtimeSource.toLowerCase()).not.toContain('черновик');
  });
});
