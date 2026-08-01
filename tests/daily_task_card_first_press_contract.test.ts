import fs from 'fs';
import path from 'path';

const screenPath = path.resolve(__dirname, '../app/daily_tasks_screen.tsx');

test('an incomplete daily task opens its explanation sheet on the first card press', () => {
  const source = fs.readFileSync(screenPath, 'utf8');
  const handler = source.match(
    /const handleTaskCardPress = \(task: DailyTask\) => \{([\s\S]*?)\n\s*\};/,
  )?.[1];

  expect(handler).toBeDefined();
  expect(handler).toContain('hapticTap();');
  expect(handler).toContain('setSelectedQuest(task);');
  expect(handler).not.toContain('void handleTaskNav(task);');
  expect(handler).not.toContain('getDailyTaskCardPressIntent');
  expect(handler).not.toContain("intent === 'expand'");
  expect(handler).not.toContain('return;');
});

test('the explanation sheet contains the task description and an explicit start action', () => {
  const source = fs.readFileSync(screenPath, 'utf8');

  expect(source).toContain('visible={selectedQuest !== null}');
  expect(source).toContain('localizedDailyTaskStrings(lang, selectedQuest)');
  expect(source).toContain('void handleTaskNav(taskToStart);');
});
