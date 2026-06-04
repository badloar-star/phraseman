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

  it('registers the runtime dev route without replacing existing plan routes', () => {
    expect(layoutSource).toContain('<Stack.Screen name="personal_plan" options={{ headerShown: false }} />');
    expect(layoutSource).toContain('<Stack.Screen name="personal_plan_dev" options={{ headerShown: false }} />');
    expect(layoutSource).toContain('<Stack.Screen name="personal_plan_runtime_dev" options={{ headerShown: false }} />');
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

  it('keeps screen copy clean for the new runtime route', () => {
    expect(runtimeSource).not.toMatch(/[ÃÂÐÑâ]/);
    expect(runtimeSource.toLowerCase()).not.toContain('placeholder renderer');
    expect(runtimeSource.toLowerCase()).not.toContain('draft copy');
    expect(runtimeSource.toLowerCase()).not.toContain('черновик');
  });
});
