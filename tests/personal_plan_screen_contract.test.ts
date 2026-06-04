import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan screen contract', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app', 'personal_plan.tsx'), 'utf8');
  const layoutSource = fs.readFileSync(path.join(ROOT, 'app', '_layout.tsx'), 'utf8');
  const navSource = fs.readFileSync(path.join(ROOT, 'app', 'personal_plan_navigation.ts'), 'utf8');

  it('uses the active runtime plan instead of a preview day', () => {
    expect(source).toContain('readPersonalPlanState');
    expect(source).toContain('buildTodayPlanRuntime');
    expect(source).toContain('buildPersonalPlanSnapshot');
    expect(source).not.toContain('ACTIVE_PLAN_PREVIEW');
  });

  it('opens plan tasks through the shared lesson and quiz destinations', () => {
    expect(navSource).toContain("pathname: '/lesson_menu'");
    expect(navSource).toContain("pathname: '/lesson1'");
    expect(navSource).toContain("pathname: '/quizzes_screen'");
    expect(source).toContain('openPersonalPlanTask(router, loaded.plan, loaded.runtime.visibleDay, task, loaded.state.planInstanceId)');
  });

  it('registers the real personal plan route and keeps dev calendar separate', () => {
    expect(layoutSource).toContain('<Stack.Screen name="personal_plan" options={{ headerShown: false }} />');
    expect(layoutSource).toContain('<Stack.Screen name="personal_plan_dev" options={{ headerShown: false }} />');
    expect(source).toContain('DEV · все планы и дни');
  });

  it('does not use scene wording for plan tasks', () => {
    expect(source.toLowerCase()).not.toContain('сцен');
    expect(navSource.toLowerCase()).not.toContain('scene');
  });
  it('shows visible day progress on the plan screen instead of rounded long-route progress', () => {
    expect(source).toContain('{snapshot.dayProgressPct}%');
    expect(source).toContain('styles.headerPct');
  });

  it('renders plan tasks as a guided timeline with typed visual cards', () => {
    expect(source).toContain('getPersonalPlanTaskVisual');
    expect(source).toContain('styles.taskTimelineRow');
    expect(source).toContain('styles.timelineDot');
    expect(source).toContain('styles.taskArtPanel');
    expect(source).toContain('visual.artStyle');
  });

  it('gives plan cards and buttons visible liquid-glass depth', () => {
    expect(source).toContain('styles.glassTopSheen');
    expect(source).toContain('styles.glassBottomShade');
    expect(source).toContain('styles.artGlassSheen');
    expect(source).toContain('styles.buttonGlassSheen');
    expect(source).toContain('elevation: 8');
    expect(source).toContain('shadowOpacity');
  });

  it('does not render the removed top hero summary card above daily tasks', () => {
    expect(source).not.toContain('PlanArtHero');
    expect(source).not.toContain('styles.console');
    expect(source).not.toContain('styles.heroImageBackdrop');
  });

  it('keeps plan task actions large enough for confident mobile taps', () => {
    expect(source).toContain('hitSlop={8}');
    expect(source).toContain('minHeight: 62');
  });
});
