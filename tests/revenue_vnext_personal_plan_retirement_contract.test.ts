import fs from 'fs';
import path from 'path';

const read = (relativePath: string): string => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('Revenue VNext retired Personal Plan acquisition', () => {
  const lessons = read('app/(tabs)/lessons.tsx');
  const setup = read('app/personal_plan_setup.tsx');
  const guard = read('components/personal_plan_sunset_guard.tsx');

  test.each([
    ['app/(tabs)/lessons.tsx', lessons],
    ['app/personal_plan_setup.tsx', setup],
    ['components/personal_plan_sunset_guard.tsx', guard],
  ])('%s never opens Plus acquisition under the retired context', (_file, source) => {
    expect(source).not.toMatch(/premium_modal[\s\S]{0,180}context:\s*['"]personal_plan['"]/);
    expect(source).toContain('redirectRetiredPersonalPlan');
  });

  test('all three active entry points use the same truthful non-paywall fallback', () => {
    expect(lessons).toContain('redirectRetiredPersonalPlan(router);');
    expect(setup).toContain('redirectRetiredPersonalPlan(router);');
    expect(guard).toContain('redirectRetiredPersonalPlan(router);');
  });

  test('every known non-grandfathered setup/guard decision emits the truthful localized explanation', () => {
    expect((setup.match(/redirectRetiredPersonalPlan\(router\);/g) ?? [])).toHaveLength(2);
    expect((guard.match(/redirectRetiredPersonalPlan\(router\);/g) ?? [])).toHaveLength(3);

    const setupEligibilityCatch = setup.slice(
      setup.indexOf('assertPersonalPlanActivationAllowed'),
      setup.indexOf('if (!canActivatePlan'),
    );
    expect(setupEligibilityCatch).toContain('redirectRetiredPersonalPlan(router);');
    expect(setupEligibilityCatch).not.toContain('router.replace(PERSONAL_PLAN_SUNSET_FALLBACK_ROUTE');

    const guardEligibilityChecks = guard.match(/if \([^)]*status === 'not_grandfathered'[^)]*\) \{[\s\S]*?\n\s*\}/g) ?? [];
    expect(guardEligibilityChecks).toHaveLength(2);
    guardEligibilityChecks.forEach((branch) => {
      expect(branch).toContain('redirectRetiredPersonalPlan(router);');
      expect(branch).not.toContain('redirectToFallback();');
    });
  });
});
