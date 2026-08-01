import fs from 'node:fs';
import path from 'node:path';

import { ALL_TASKS, dailyTaskAvailableForStudyTarget, filterDailyTasksForStudyTarget } from '../app/daily_tasks';

describe('daily task language availability', () => {
  it('hides challenges that require a second study language until it is available', () => {
    const polyglot = ALL_TASKS.find((task) => task.id === 'pg1');

    expect(polyglot).toBeDefined();
    expect(dailyTaskAvailableForStudyTarget(polyglot!, 'en')).toBe(false);
    expect(dailyTaskAvailableForStudyTarget(polyglot!, 'fr')).toBe(false);
    expect(filterDailyTasksForStudyTarget([polyglot!], 'en')).toEqual([]);
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
