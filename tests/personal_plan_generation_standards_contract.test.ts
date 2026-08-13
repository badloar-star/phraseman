import fs from 'fs';
import path from 'path';

import { PERSONAL_PLAN_CATALOG } from '../app/personal_plan_catalog';
import {
  PERSONAL_PLAN_GENERATION_STANDARDS_VERSION,
  buildPersonalPlanDayPassport,
  validatePersonalPlanDay,
} from '../app/personal_plan_quality';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan generation standards', () => {
  const standardsPath = path.join(ROOT, 'docs', 'personal-plans-generation-standards.md');
  const standards = fs.readFileSync(standardsPath, 'utf8');
  const gavan = PERSONAL_PLAN_CATALOG.find((plan) => plan.id === 'gavan')!;
  const day1 = gavan.days[0];

  it('documents the standards that every future generated plan day must follow', () => {
    const normalizedStandards = standards.toLowerCase();

    expect(PERSONAL_PLAN_GENERATION_STANDARDS_VERSION).toBe('2026-05-31.after-answer-recall-v1');
    expect(normalizedStandards).toContain('обязателен для всех следующих генераций');
    expect(normalizedStandards).toContain('первое задание дня всегда открывает обычный урок');
    expect(normalizedStandards).toContain('плановые фразы');
    expect(normalizedStandards).toContain('не вводят новую конструкцию раньше урока');
    expect(normalizedStandards).toContain('plan_phrase_recall');
    expect(normalizedStandards).toContain('без подсказок');
    expect(normalizedStandards).toContain('10 вопросов');
    expect(standards).toContain('teachingNote');
    expect(normalizedStandards).toContain('ключевые слова ситуации');
  });

  it('treats live Gavan day 1 as ready, but still blocks untouched scaffold days', () => {
    const passport = buildPersonalPlanDayPassport(gavan, day1);
    const scaffoldEntry = PERSONAL_PLAN_CATALOG
      .flatMap((plan) => plan.days.map((day) => ({ plan, day })))
      .find(({ plan, day }) => buildPersonalPlanDayPassport(plan, day).issues
        .some((issue) => issue.code === 'scaffold_day'));

    expect(scaffoldEntry).toBeDefined();
    const scaffoldPassport = buildPersonalPlanDayPassport(
      scaffoldEntry!.plan,
      scaffoldEntry!.day,
    );

    expect(passport.ready).toBe(true);
    expect(passport.issues).toEqual([]);
    expect(scaffoldPassport.ready).toBe(false);
    expect(scaffoldPassport.issues.map((issue) => issue.code)).toContain('scaffold_day');
    expect(passport.standardVersion).toBe(PERSONAL_PLAN_GENERATION_STANDARDS_VERSION);
  });

  it('rejects future days that skip lesson-first order, use bad copy, or ship phrase lessons without teaching notes', () => {
    const brokenDay = {
      ...day1,
      focus: 'Сначала применяем конструкцию в маршруте.',
      tasks: [
        day1.tasks[1],
        day1.tasks[0],
        ...day1.tasks.slice(2),
      ],
    };

    const issues = validatePersonalPlanDay(gavan, brokenDay as any);
    const codes = issues.map((issue) => issue.code);

    expect(codes).toEqual(expect.arrayContaining([
      'invalid_task_order',
      'bad_copy',
    ]));
  });
});
