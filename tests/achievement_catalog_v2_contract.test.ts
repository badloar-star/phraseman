import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'app', 'achievements.ts'), 'utf8');

test('removed legacy catalog entries are physically absent', () => {
  expect(source).not.toContain('LEGACY_LEARNING_ACHIEVEMENT_PREFIXES');
  expect(source).not.toContain('ACTIVE_FOUNDATION_ACHIEVEMENT_IDS');
  for (const id of [
    'lesson_1',
    'gem_a1_ruby',
    'exam_first',
    'flashcards_session',
    'mistake_corrected_first',
    'daily_phrase_first',
    'diagnosis',
  ]) {
    expect(source).not.toContain(`id: '${id}'`);
  }
});

test('events for definitions absent from the catalog cannot create orphan unlocks', () => {
  const unlockDispatch = source.match(/const u = \(id: string\) => \{[\s\S]*?\n    \};/)?.[0] ?? '';

  expect(unlockDispatch).toContain('if (!def || def.retired) return;');
  expect(source).toContain('if (!FOUNDATION_ACHIEVEMENT_EVENT_TYPES.has(event.type)) return [];');
});
