import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const source = fs
  .readFileSync(path.join(ROOT, 'app/personal_plan_next_task.ts'), 'utf8')
  .replace(/\r\n/g, '\n');

describe('personal plan next-task failure integrity', () => {
  it('does not convert mandatory material-load failures into empty queues', () => {
    expect(source).toContain('Promise.allSettled([');
    expect(source).toContain('UNKNOWN_MATERIAL_IS_AVAILABLE');
    expect(source).toContain("practiceResult.status === 'fulfilled'");
    expect(source).toContain("trainerResult.status === 'fulfilled'");
    expect(source).toContain("weakSpotResult.status === 'fulfilled'");
    expect(source).toContain("flashcardsResult.status === 'fulfilled'");

    expect(source).not.toContain('countDueItemsToday(input.studyTarget).catch');
    expect(source).not.toContain('getTrainerCounts(input.studyTarget).catch');
    expect(source).not.toContain("{ words: 0, phrases: 0, arena: 0 }");
  });

  it('keeps an in-session completion guard so an A → B → A loop cannot re-open completed tasks', () => {
    expect(source).toContain('const sessionCompletedTaskKeys = new Set<string>();');
    expect(source).toContain('rememberSessionCompletion(completedKey);');
    expect(source).toContain('sessionCompletedTaskKeys.has(key)');
    expect(source).toContain('task.id !== input.completedTaskId');
    expect(source).toContain('!isDone(task)');
  });

  it('does not wrap to earlier tasks when the persisted completion map failed to load', () => {
    expect(source).toContain("completedResult.status === 'rejected' && currentIndex >= 0");
    expect(source).toContain('visible.slice(currentIndex + 1)');
  });
});
