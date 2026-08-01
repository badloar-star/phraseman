import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
const onboarding = read('components/CleanOnboarding.tsx');
const admin = read('admin/v2/legacy.html');
const functionsIndex = read('functions/src/index.ts');

describe('privacy-safe aggregate onboarding funnel contract', () => {
  it('records start once after onboarding state restoration and never gates it on analytics consent', () => {
    expect(onboarding).toContain("import { recordOnboardingFunnelCompletion, recordOnboardingFunnelStart } from '../app/onboarding_funnel';");
    expect(onboarding).toMatch(/if \(!restored\) return;[\s\S]*?recordOnboardingFunnelStart\(\)/);
    expect(onboarding).not.toMatch(/if \(analyticsAllowed\)[\s\S]{0,180}recordOnboardingFunnelStart/);
  });

  it('records completion only inside the successful finish path after local completion is persisted', () => {
    const finishStart = onboarding.indexOf('const finish = useCallback(async () => {');
    const doneWrite = onboarding.indexOf("[DONE_KEY, '1']", finishStart);
    const completion = onboarding.indexOf('recordOnboardingFunnelCompletion()', finishStart);
    const onDone = onboarding.indexOf('onDone();', finishStart);

    expect(finishStart).toBeGreaterThanOrEqual(0);
    expect(doneWrite).toBeGreaterThan(finishStart);
    expect(completion).toBeGreaterThan(doneWrite);
    expect(onDone).toBeGreaterThan(completion);
  });

  it('exports both callables from the deployed functions entry point', () => {
    expect(functionsIndex).toContain("export { recordOnboardingFunnelEvent, adminGetOnboardingFunnel } from './onboarding_funnel';");
  });

  it('shows aggregate-only Started, Completed, and Conversion metrics with 7/28/90 and platform filters', () => {
    expect(admin).toContain('id="onboarding-funnel-range"');
    expect(admin).toContain('<option value="7">7 дней</option>');
    expect(admin).toContain('<option value="28" selected>28 дней</option>');
    expect(admin).toContain('<option value="90">90 дней</option>');
    expect(admin).toContain('id="onboarding-funnel-platform"');
    expect(admin).toContain('Начали');
    expect(admin).toContain('Завершили');
    expect(admin).toContain('Конверсия');
    expect(admin).toContain("httpsCallable(functionsUs, 'adminGetOnboardingFunnel')");
  });

  it('labels the new totals as server aggregates rather than app_activity totals', () => {
    expect(admin).toContain('Серверные агрегаты с момента запуска счётчика');
    expect(admin).toContain('app_activity не используется');
  });
});
