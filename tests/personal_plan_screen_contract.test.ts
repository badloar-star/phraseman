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

  it('renders the active plan before slow due counters finish loading', () => {
    expect(source).toContain('INSTANT_PLAN_DUE_COUNT');
    expect(source).toContain('const completedTasks = await readCompletedPlanTasks();');
    expect(source).toContain('setLoaded({');
    expect(source.indexOf('setLoaded({')).toBeLessThan(source.indexOf('await Promise.all(['));
    expect(source).toContain('duePracticeCount: INSTANT_PLAN_DUE_COUNT');
  });

  it('never auto-activates a plan or shows the no-plan fallback from the plan screen', () => {
    expect(source).not.toContain('activatePersonalPlan');
    expect(source).not.toContain('getPlanDefaultMinutes');
    expect(source).toContain("router.replace('/personal_plan_setup' as any)");
    expect(source).not.toContain('План пока не выбран');
    expect(source).not.toContain('Здесь появятся задания на день.');
    expect(source).not.toContain('Открыть DEV-календарь');
  });

  it('opens plan tasks through the correct lesson shells and dedicated exercise destinations', () => {
    expect(navSource).toContain("pathname: '/lesson_menu'");
    expect(navSource).toContain("pathname: '/lesson1'");
    expect(navSource).toContain("pathname: '/personal_plan_exercise'");
    expect(navSource).not.toContain("pathname: '/quizzes_screen'");
    expect(source).toContain('openPersonalPlanTask(router, loaded.plan, loaded.runtime.visibleDay, task, loaded.state.planInstanceId)');
  });

  it('registers the real personal plan route and keeps dev calendar separate', () => {
    expect(layoutSource).toContain('<Stack.Screen name="personal_plan" options={{ headerShown: false }} />');
    expect(layoutSource).toContain('<Stack.Screen name="personal_plan_dev" options={{ headerShown: false }} />');
    expect(source).toContain("router.push('/personal_plan_dev' as any)");
    expect(source).toContain('>DEV</Text>');
  });

  it('does not use scene wording for plan tasks', () => {
    expect(source.toLowerCase()).not.toContain('сцен');
    expect(navSource.toLowerCase()).not.toContain('scene');
  });
  it('shows progress for the currently visible task slice', () => {
    expect(source).toContain('const visibleProgressPct = visibleTasks.length > 0');
    expect(source).toContain('<ProgressRing pct={visibleProgressPct} chrome={chrome} lang={lang} />');
    expect(source).toContain('{visibleProgressPct}%');
  });

  it('renders the active day in a compact progress hero without a competing day rail', () => {
    expect(source).toContain('function ProgressRing');
    expect(source).toContain("ru: `День ${day.dayIndex}`");
    expect(source).toContain('{plan.horizonWeeks * 7} дней');
    expect(source).not.toContain('dayRailRef');
  });

  it('renders plan tasks as compact workout-style rows with tiny generated icons', () => {
    expect(source).toContain('getPersonalPlanTaskVisual');
    expect(source).toContain('styles.taskRow');
    expect(source).toContain('styles.taskIcon');
    expect(source).toContain('styles.taskImage');
    expect(source).toContain('styles.taskCopy');
    expect(source).toContain('styles.taskRight');
    expect(source).not.toContain('styles.taskTimelineRow');
    expect(source).not.toContain('styles.timelineRail');
    expect(source).not.toContain('styles.timelineDot');
    expect(source).not.toContain('styles.timelineLine');
    expect(source).not.toContain('styles.taskArtPanel');
    expect(source).toContain('visual.asset');
  });

  it('lets task row titles and subtitles wrap instead of truncating after one line', () => {
    const titleStart = source.indexOf('styles.taskTitle');
    const subStart = source.indexOf('styles.taskSub');
    const titleText = source.slice(titleStart, titleStart + 120);
    const subText = source.slice(subStart, subStart + 120);

    expect(titleStart).toBeGreaterThan(-1);
    expect(subStart).toBeGreaterThan(-1);
    expect(titleText).not.toContain('numberOfLines={1}');
    expect(subText).not.toContain('numberOfLines={1}');
    expect(titleText).toContain('numberOfLines={2}');
    expect(subText).toContain('numberOfLines={3}');
  });

  it('keeps the first unfinished task on the persistent hero action', () => {
    expect(source).toContain('const nextTask = visibleTasks.find');
    expect(source).toContain('style={styles.heroButtonWrap}');
    expect(source).toContain('style={styles.heroButton}');
    expect(source).toContain('openTask(nextTask)');
  });

  it('offers one more task whenever unrevealed tasks remain without forcing next dock to hidden work early', () => {
    expect(source).toContain('nextTaskAfterVisibleSlice');
    expect(source).toContain('extraVisibleTaskCount');
    expect(source).toContain('setExtraVisibleTaskCount');
    expect(source).toContain('const visibleTasksDone = visibleTasks.length > 0 && visibleTasks.every');
    expect(source).toContain('const canAddMoreTasks = Boolean(addMoreTask)');
    expect(source).toContain('?? (visibleTasksDone && addMoreTask ? addMoreTask : visibleTasks[0])');
    expect(source).toContain('Добавить ещё задание');
    expect(source).toContain('canAddMoreTasks');
  });

  it('does not render the removed top hero summary card above daily tasks', () => {
    expect(source).not.toContain('PlanArtHero');
    expect(source).not.toContain('styles.console');
    expect(source).not.toContain('styles.heroImageBackdrop');
  });

  it('keeps plan task actions large enough for confident mobile taps', () => {
    expect(source).toContain('minHeight: 70');
    expect(source).toContain('height: 62, borderRadius: 14');
  });
});
