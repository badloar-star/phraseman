import fs from 'fs';
import path from 'path';

const screenPath = path.resolve(__dirname, '../app/daily_tasks_screen.tsx');

test('an incomplete daily task navigates on the first card press', () => {
  const source = fs.readFileSync(screenPath, 'utf8');
  const handler = source.match(
    /const handleTaskCardPress = \(task: DailyTask\) => \{([\s\S]*?)\n\s*\};/,
  )?.[1];

  expect(handler).toBeDefined();
  expect(handler).toContain('hapticTap();');
  expect(handler).toContain('void handleTaskNav(task);');
  expect(handler).not.toContain('getDailyTaskCardPressIntent');
  expect(handler).not.toContain("intent === 'expand'");
  expect(handler).not.toContain('return;');
});
