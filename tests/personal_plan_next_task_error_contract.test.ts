import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const source = fs
  .readFileSync(path.join(ROOT, 'app/personal_plan_next_task.ts'), 'utf8')
  .replace(/\r\n/g, '\n');

describe('personal plan next-task failure integrity', () => {
  it('does not convert mandatory material-load failures into empty queues', () => {
    expect(source).toContain('countDueItemsToday(input.studyTarget)');
    expect(source).toContain('getTrainerCounts(input.studyTarget)');
    expect(source).toContain('resolvePersonalPlanTrainerWeakSpotDueCount({');
    expect(source).toContain('resolvePersonalPlanFlashcardsReviewCount(input.studyTarget)');

    expect(source).not.toContain('countDueItemsToday(input.studyTarget).catch');
    expect(source).not.toContain('getTrainerCounts(input.studyTarget).catch');
    expect(source).not.toContain('resolvePersonalPlanTrainerWeakSpotDueCount({ planInstanceId');
    expect(source).not.toContain('resolvePersonalPlanFlashcardsReviewCount(input.studyTarget).catch');
    expect(source).not.toContain("{ words: 0, phrases: 0, arena: 0 }");
  });

  it('still excludes the task that was just completed and persisted tasks already marked done', () => {
    expect(source).toContain('task.id !== input.completedTaskId');
    expect(source).toContain('!isDone(task)');
  });
});
