import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { PERSONAL_PLAN_CATALOG } from '../app/personal_plan_catalog';
import {
  PERSONAL_PLAN_TASK_VISUAL_THEMES,
  PERSONAL_PLAN_TASK_VISUAL_SOURCES,
  getPersonalPlanTaskVisual,
  getPersonalPlanTaskVisualAsset,
} from '../app/personal_plan_task_visuals';

const ROOT = path.resolve(__dirname, '..');
const visualSource = fs.readFileSync(path.join(ROOT, 'app', 'personal_plan_task_visuals.ts'), 'utf8');
const planScreenSource = fs.readFileSync(path.join(ROOT, 'app', 'personal_plan.tsx'), 'utf8');
const planDevSource = fs.readFileSync(path.join(ROOT, 'app', 'personal_plan_dev.tsx'), 'utf8');
const PLAN_IDS = ['gavan', 'voyazh', 'mitap', 'impuls', 'echo'] as const;

describe('personal plan task visuals', () => {
  const gavan = PERSONAL_PLAN_CATALOG.find((plan) => plan.id === 'gavan')!;
  const day1Tasks = gavan.days[0].tasks;

  it('gives each day 1 task type a mode-specific visual source', () => {
    const visuals = day1Tasks.map((task) => getPersonalPlanTaskVisual(task, gavan.id));

    expect(visuals.map((visual) => visual.source)).toEqual([
      'route_phrase',
      'practice',
      'recall',
      'speaking',
      'choice',
      'listening',
      'sentence_build',
      'quiz',
    ]);
    expect(new Set(visuals.map((visual) => visual.icon)).size).toBe(8);
    expect(new Set(visuals.map((visual) => visual.assetKey)).size).toBe(8);
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

  it('wires small theme-specific WebP assets for every task source and plan route', () => {
    for (const theme of PERSONAL_PLAN_TASK_VISUAL_THEMES) {
      for (const source of PERSONAL_PLAN_TASK_VISUAL_SOURCES) {
        const assetName = source === 'route_phrase' ? 'route_gavan' : source;
        expect(visualSource).toContain(`personal_plan_tasks_fit/${theme}/${assetName}.webp`);
        expect(getPersonalPlanTaskVisualAsset(source, undefined, theme)).toBeTruthy();
      }

      for (const planId of PLAN_IDS) {
        expect(visualSource).toContain(`personal_plan_tasks_fit/${theme}/route_${planId}.webp`);
        expect(getPersonalPlanTaskVisualAsset('route_phrase', planId, theme)).toBeTruthy();
      }
    }

    expect(visualSource).not.toMatch(/personal_plan_tasks(?:_fit)?\/[^'"]+\.png/);
  });

  it('keeps personal plan task art square and non-cropping', async () => {
    const assetNames = [
      'core_lesson',
      'recall',
      'quiz',
      'practice',
      'choice',
      'listening',
      'sentence_build',
      'speaking',
      'trainer',
      'flashcards',
      ...PLAN_IDS.map((planId) => `route_${planId}`),
    ];

    const invalidFiles: string[] = [];
    for (const theme of PERSONAL_PLAN_TASK_VISUAL_THEMES) {
      for (const assetName of assetNames) {
        const file = path.join(ROOT, 'assets', 'images', 'personal_plan_tasks_fit', theme, `${assetName}.webp`);
        const meta = await sharp(file).metadata();
        if (meta.width !== 512 || meta.height !== 512) {
          invalidFiles.push(`${theme}/${assetName}.webp`);
        }
      }
    }

    expect(invalidFiles).toEqual([]);
    expect(planScreenSource).toContain('contentFit="contain"');
    expect(planDevSource).toContain('contentFit="contain"');
    expect(planScreenSource).toContain('taskImage: { width: 48, height: 48 }');
    expect(planDevSource).toContain('taskArtImage: { width: 104, height: 104 }');
    expect(planScreenSource).not.toContain('contentFit="cover" transition={120}');
    expect(planDevSource).not.toContain('contentFit="cover" transition={120}');
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
