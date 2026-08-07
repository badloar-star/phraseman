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

  it('does not keep a second task-type switch or a second target-gate layer', () => {
  const start = source.indexOf('const handleTaskNav');
  const end = source.indexOf('// Сортировка:', start);
  const handler = source.slice(start, end);

  expect(handler).not.toContain('switch (task.type)');
  expect(handler).not.toContain('GateCopy');
  expect(handler).not.toContain('source_gate');
});
});
