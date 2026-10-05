import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = fs.readFileSync('components/home/v2/HomeV2TodayCard.tsx', 'utf8');

// зачем (координатор 05.10): после 01.10 (Q90) в «Сегодня» появилась отдельная строка опроса (surveyRow) с numberOfLines={1};
// сторож охраняет задачи дня (блок tasks.map), а не строку опроса. Код Главной не менялся — обновлён только тест.
const tasksBlock = source.slice(source.indexOf('tasks.map('), source.indexOf('{surveyRow ?'));

test('V2 Today keeps every active task title and subtitle readable', () => {
  assert.ok(tasksBlock.length > 100, 'блок задач дня найден');
  assert.doesNotMatch(tasksBlock, /<Text\s+numberOfLines=\{1\}\s+style=\{\[s\.taskTitle/);
  assert.doesNotMatch(tasksBlock, /<Text\s+numberOfLines=\{1\}\s+style=\{\[s\.taskSubtitle/);
  assert.match(source, /minHeight:\s*58/);
  assert.match(source, /accessibilityLabel=\{`\$\{task\.title\}/);
});
