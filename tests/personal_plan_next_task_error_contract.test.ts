import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const source = fs
  .readFileSync(path.join(ROOT, 'app/personal_plan_next_task.ts'), 'utf8')
  .replace(/\r\n/g, '\n');

function resolveNextTaskBody(): string {
  const start = source.indexOf('export async function resolveNextPlanTask');
  const end = source.indexOf('\n}', start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end + 2);
}

describe('personal plan next-task failure integrity', () => {
  it('does not convert mandatory material-load failures into empty queues', () => {
    const body = resolveNextTaskBody();

    expect(body).toContain('countDueItemsToday(input.studyTarget)');
    expect(body).toContain('getTrainerCounts(input.studyTarget)');
    expect(body).toContain('resolvePersonalPlanTrainerWeakSpotDueCount({');
    expect(body).toContain('resolvePersonalPlanFlashcardsReviewCount(input.studyTarget)');

    expect(body).not.toContain('countDueItemsToday(input.studyTarget).catch');
    expect(body).not.toContain('getTrainerCounts(input.studyTarget).catch');
    expect(body).not.toContain('resolvePersonalPlanTrainerWeakSpotDueCount({ planInstanceId');
    expect(body).not.toContain('resolvePersonalPlanFlashcardsReviewCount(input.studyTarget).catch');
    expect(body).not.toContain("{ words: 0, phrases: 0, arena: 0 }");
  });

  it('still excludes the task that was just completed', () => {
    const body = resolveNextTaskBody();
    expect(body).toContain('task.id !== input.completedTaskId');
    expect(body).toContain('!isDone(task)');
  });
});
