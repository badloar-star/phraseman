import fs from 'node:fs';
import path from 'node:path';

import { ALL_TASKS, dailyTaskAvailableForStudyTarget, filterDailyTasksForStudyTarget } from '../app/daily_tasks';

describe('daily task language availability', () => {
  it('contains no legacy challenge that requires a second study language', () => {
    const removedType = ['poly', 'glot', 'day'].join('_');
    const removedId = ['p', 'g', '1'].join('');
    expect(ALL_TASKS.some((task) => task.id === removedId || task.type === removedType)).toBe(false);

    const sample = ALL_TASKS.slice(0, 3);
    expect(sample.every((task) => dailyTaskAvailableForStudyTarget(task, 'en'))).toBe(true);
    expect(filterDailyTasksForStudyTarget(sample, 'en')).toEqual(sample);
  });

  it('renders task art large and without a coloured icon container', () => {
    const root = path.join(__dirname, '..');
    const card = fs.readFileSync(path.join(root, 'components', 'daily-tasks', 'DailyTaskCard.tsx'), 'utf8');
    const screen = fs.readFileSync(path.join(root, 'app', 'daily_tasks_screen.tsx'), 'utf8');

    expect(card).toContain('icon: { width: 72, minHeight: 72, borderWidth: 0');
    expect(screen).toContain('width: 68');
    expect(screen).toContain('height: 68');
    expect(screen).not.toContain('iconStyle={{ backgroundColor: taskIconPlateBg');
  });
});
