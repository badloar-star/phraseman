import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const source = fs
  .readFileSync(path.join(ROOT, 'app/daily_tasks_screen.tsx'), 'utf8')
  .replace(/\r\n/g, '\n');

describe('Daily Challenges screen navigation', () => {
  it('delegates every task start to the central route resolver', () => {
    expect(source).toContain("import { navigateDailyTask } from './daily_task_navigation';");
    expect(source).toContain('await navigateDailyTask({ lang, router, studyTarget, task });');
    expect(source).toContain('void handleTaskNav(taskToStart);');
  });

  it('does not keep a second task-type switch or French-specific route gates', () => {
    const start = source.indexOf('const handleTaskNav');
    const end = source.indexOf('// Сортировка:', start);
    const handler = source.slice(start, end);

    expect(handler).not.toContain('switch (task.type)');
    expect(handler).not.toMatch(/french/i);
    expect(source).not.toContain('openLessonOrFrenchGate');
    expect(source).not.toContain('openTrainerOrFrenchGate');
    expect(source).not.toContain('frenchLessonRuntimeAvailableForTarget');
    expect(source).not.toContain('trainerSessionContentAvailableForTarget');
  });
});
