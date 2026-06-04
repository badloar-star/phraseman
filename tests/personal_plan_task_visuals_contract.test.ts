import { PERSONAL_PLAN_CATALOG } from '../app/personal_plan_catalog';
import {
  PERSONAL_PLAN_TASK_VISUAL_SOURCES,
  getPersonalPlanTaskVisual,
  getPersonalPlanTaskVisualAsset,
} from '../app/personal_plan_task_visuals';

describe('personal plan task visuals', () => {
  const gavan = PERSONAL_PLAN_CATALOG.find((plan) => plan.id === 'gavan')!;
  const day1Tasks = gavan.days[0].tasks;

  it('gives each day 1 task type a distinct visual source', () => {
    const visuals = day1Tasks.map((task) => getPersonalPlanTaskVisual(task, gavan.id));

    expect(visuals.map((visual) => visual.source)).toEqual([
      'core_lesson',
      'route_phrase',
      'practice',
      'quiz',
    ]);
    expect(new Set(visuals.map((visual) => visual.icon)).size).toBe(4);
    expect(new Set(visuals.map((visual) => visual.artStyle)).size).toBe(4);
  });

  it('keeps task visual copy short, user-facing, and non-technical', () => {
    for (const task of day1Tasks) {
      const visual = getPersonalPlanTaskVisual(task, gavan.id);
      const text = `${visual.label} ${visual.intent}`.toLowerCase();

      expect(visual.label.length).toBeLessThanOrEqual(18);
      expect(visual.intent.length).toBeLessThanOrEqual(54);
      expect(text).not.toMatch(/dev|source|destination|constructor|debug|сцена|черновик|маршрут/);
    }
  });

  it('has prepared image assets for every possible task source', () => {
    for (const source of PERSONAL_PLAN_TASK_VISUAL_SOURCES) {
      expect(getPersonalPlanTaskVisualAsset(source)).toBeTruthy();
    }
  });

  it('supports plan-specific route phrase art without changing the task contract', () => {
    const routeTask = day1Tasks.find((task) => task.destination.type === 'plan_phrase_lesson')!;

    const gavanVisual = getPersonalPlanTaskVisual(routeTask, 'gavan');
    const voyazhVisual = getPersonalPlanTaskVisual(routeTask, 'voyazh');

    expect(gavanVisual.source).toBe('route_phrase');
    expect(voyazhVisual.source).toBe('route_phrase');
    expect(gavanVisual.assetKey).toBe('gavan_route_phrase');
    expect(voyazhVisual.assetKey).toBe('voyazh_route_phrase');
    expect(gavanVisual.assetKey).not.toBe(voyazhVisual.assetKey);
  });
});
