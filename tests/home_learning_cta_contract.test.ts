import fs from 'fs';
import path from 'path';

describe('home learning CTA contract', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app', '(tabs)', 'home.tsx'), 'utf8');

  it('keeps a dedicated premium-without-plan CTA before the free continue-lesson CTA', () => {
    const planSnapshotIndex = source.indexOf('personalPlanSnapshot ? (');
    const activePlanIndex = source.indexOf(': hasActivePersonalPlan ?');
    const choosePlanIndex = source.indexOf(': hasPremiumAccess ?');
    const continueLessonIndex = source.indexOf(': lastLesson != null ?');

    expect(planSnapshotIndex).toBeGreaterThan(0);
    expect(activePlanIndex).toBeGreaterThan(planSnapshotIndex);
    expect(choosePlanIndex).toBeGreaterThan(activePlanIndex);
    expect(continueLessonIndex).toBeGreaterThan(choosePlanIndex);
  });

  it('routes premium users without an active plan into the themed plan setup flow', () => {
    expect(source).toContain('testID="home-choose-personal-plan"');
    expect(source).toContain("router.push('/personal_plan_setup' as any)");
    expect(source).toContain('Выбрать свой план обучения');
    expect(source).toContain('3 вопроса');
  });

  it('keeps the free-tier current lesson CTA intact', () => {
    expect(source).toContain('testID="home-continue-lesson"');
    expect(source).toContain("router.push({ pathname: '/lesson_menu', params: { id: lastLesson.id } })");
  });

  it('keeps the current personal plan visible while the home snapshot reloads', () => {
    expect(source).toContain("onAppEvent('personal_plan_updated', (payload)");
    expect(source).toContain('setPersonalPlanSnapshot(payload.snapshot)');
    expect(source).toContain('setPersonalPlanSnapshot((previous) => planSnapshot ?? (nextHasActivePersonalPlan ? previous : null))');
  });
});
