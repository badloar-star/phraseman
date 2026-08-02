import fs from 'fs';
import path from 'path';

describe('home learning CTA contract', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app', '(tabs)', 'home.tsx'), 'utf8');

  it('keeps the existing-plan cards before the free continue-lesson CTA', () => {
    const planSnapshotIndex = source.indexOf('<PersonalPlanHomeRouteCard');
    const activePlanIndex = source.indexOf('testID="home-personal-plan-card"');
    const continueLessonIndex = source.indexOf('testID="home-continue-lesson"');

    expect(planSnapshotIndex).toBeGreaterThan(0);
    expect(activePlanIndex).toBeGreaterThan(planSnapshotIndex);
    expect(continueLessonIndex).toBeGreaterThan(activePlanIndex);
  });

  // зачем: владелец убрал с главной плашку «Выбрать свой план обучения» —
  // она вытесняла карточку «Продолжить урок». Вход в создание плана остался
  // в других местах, на главной его быть не должно.
  it('does not advertise plan setup on home anymore', () => {
    expect(source).not.toContain('testID="home-choose-personal-plan"');
    expect(source).not.toContain('Выбрать свой план обучения');
    expect(source).not.toContain("router.push('/personal_plan_setup' as any)");
  });

  it('keeps the free-tier current lesson CTA intact', () => {
    expect(source).toContain('testID="home-continue-lesson"');
    expect(source).toContain("router.push({ pathname: '/lesson_menu', params: { id: lastLesson.id } } as any)");
  });

  it('keeps the current personal plan visible while the home snapshot reloads', () => {
    expect(source).toContain("onAppEvent('personal_plan_updated', (payload)");
    expect(source).toContain('setPersonalPlanSnapshot(payload.snapshot)');
    expect(source).toContain('setPersonalPlanSnapshot((previous) => planSnapshot ?? (nextHasActivePersonalPlan ? previous : null))');
  });
});
