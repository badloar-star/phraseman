import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', '_layout.tsx'), 'utf8');

describe('onboarding finish navigation', () => {
  it('keeps the app stack mounted behind onboarding instead of returning only onboarding', () => {
    expect(source).not.toContain('if (effectiveShowOnboarding) {\n    return (');
    expect(source).toContain('{ready && effectiveShowOnboarding && (');
    expect(source.indexOf('<Stack')).toBeLessThan(source.indexOf('{ready && effectiveShowOnboarding && ('));
  });

  it('replaces the stack with home before removing the onboarding overlay', () => {
    const finishStart = source.indexOf('const handleOnboardingDone = useCallback(async () => {');
    // зачем (координатор §46, 2026-10-01): каст `as any` снят (типизированные
    // маршруты), в зависимости добавлены lang/premium — конец берём по началу
    // массива зависимостей. Порядок «сначала Главная, потом снять оверлей» прежний.
    const finishEnd = source.indexOf('}, [armPostOnboardingGoldBridge', finishStart);
    const finishBody = source.slice(finishStart, finishEnd);
    const replaceHome = finishBody.search(/router\.replace\('\/\(tabs\)\/home'(?: as any)?\);/);

    expect(finishStart).toBeGreaterThan(-1);
    expect(finishEnd).toBeGreaterThan(finishStart);
    expect(replaceHome).toBeGreaterThan(-1);
    expect(replaceHome).toBeLessThan(finishBody.indexOf('setShow(false);'));
    expect(finishBody).toMatch(/setTimeout\(\(\) => router\.replace\('\/\(tabs\)\/home'(?: as any)?\), 120\);/);
  });
});
