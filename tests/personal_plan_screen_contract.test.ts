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

  it('opens plan tasks through dedicated plan destinations without lesson routes', () => {
    expect(navSource).not.toContain("pathname: '/lesson_menu'");
    expect(navSource).not.toContain("pathname: '/lesson1'");
    expect(navSource).toContain("pathname: '/personal_plan_exercise'");
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

  it('renders a centered horizontal day rail with per-day progress and unlock state', () => {
    expect(source).toContain('dayRailRef');
    expect(source).toContain('DAY_CARD_WIDTH');
    expect(source).toContain('styles.dayRailBlock');
    expect(source).toContain('styles.dayCard');
    expect(source).toContain('ОБЩИЙ ПРОГРЕСС');
    expect(source).toContain('const DAY_CARD_WIDTH = 106');
    expect(source).toContain('fontSize: 44');
    expect(source).toContain("borderColor: item.isCurrent ? '#F2C48D'");
    expect(source).toContain('currentProgressPct >= 50');
    expect(source).toContain('scrollTo({ x: Math.max(0, centeredOffset), animated: true })');
  });

  it('renders plan tasks as compact workout-style rows with tiny generated icons', () => {
    expect(source).toContain('getPersonalPlanTaskVisual');
    expect(source).toContain('styles.taskListRow');
    expect(source).toContain('styles.taskWorkoutRow');
    expect(source).toContain('styles.taskIconRing');
    expect(source).toContain('styles.taskSmallIconImage');
    expect(source).toContain('styles.taskWorkoutActions');
    expect(source).not.toContain('styles.taskTimelineRow');
    expect(source).not.toContain('styles.timelineRail');
    expect(source).not.toContain('styles.timelineDot');
    expect(source).not.toContain('styles.timelineLine');
    expect(source).not.toContain('styles.taskArtPanel');
    expect(source).toContain('visual.artStyle');
  });

  it('lets task row titles and subtitles wrap instead of truncating after one line', () => {
    const titleStart = source.indexOf('styles.taskWorkoutTitle');
    const subStart = source.indexOf('styles.taskWorkoutSub');
    const titleText = source.slice(titleStart, titleStart + 120);
    const subText = source.slice(subStart, subStart + 120);

    expect(titleStart).toBeGreaterThan(-1);
    expect(subStart).toBeGreaterThan(-1);
    expect(titleText).not.toContain('numberOfLines={1}');
    expect(subText).not.toContain('numberOfLines={1}');
    expect(source).toContain("alignItems: 'flex-start'");
    expect(source).toContain('paddingTop: 8');
  });

  it('keeps a persistent bottom next dock for the first unfinished task', () => {
    expect(source).toContain('const nextTask = visibleTasks.find');
    expect(source).toContain('styles.nextDockWrap');
    expect(source).toContain('styles.nextDockButton');
    expect(source).toContain('Следующее');
    expect(source).toContain('openTask(nextTask)');
    expect(source).toContain('elevation: 14');
    expect(source).toContain('shadowOpacity');
  });

  it('offers one more task whenever unrevealed tasks remain without forcing next dock to hidden work early', () => {
    expect(source).toContain('nextTaskAfterVisibleSlice');
    expect(source).toContain('extraVisibleTaskCount');
    expect(source).toContain('setExtraVisibleTaskCount');
    expect(source).toContain('const visibleTasksDone = visibleTasks.length > 0 && visibleTasks.every');
    expect(source).toContain('const canAddMoreTasks = Boolean(addMoreTask)');
    expect(source).toContain('?? (visibleTasksDone && addMoreTask ? addMoreTask : visibleTasks[0])');
    expect(source).toContain('Добавить еще задание');
    expect(source).toContain('canAddMoreTasks');
  });

  it('does not render the removed top hero summary card above daily tasks', () => {
    expect(source).not.toContain('PlanArtHero');
    expect(source).not.toContain('styles.console');
    expect(source).not.toContain('styles.heroImageBackdrop');
  });

  it('keeps plan task actions large enough for confident mobile taps', () => {
    expect(source).toContain('hitSlop={8}');
    expect(source).toContain('minHeight: 64');
    expect(source).toContain('minHeight: 78');
  });
});
