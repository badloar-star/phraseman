import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = fs.readFileSync('components/home/v2/HomeV2TodayCard.tsx', 'utf8');

test('V2 Today keeps every active task title and subtitle readable', () => {
  assert.doesNotMatch(source, /<Text\s+numberOfLines=\{1\}\s+style=\{\[s\.taskTitle/);
  assert.doesNotMatch(source, /<Text\s+numberOfLines=\{1\}\s+style=\{\[s\.taskSubtitle/);
  assert.match(source, /minHeight:\s*58/);
  assert.match(source, /accessibilityLabel=\{`\$\{task\.title\}/);
});
