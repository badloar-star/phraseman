import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

const TSX_FILES = [
  'app/arena_results.tsx',
  'app/arena_room.tsx',
  'app/flashcards_swipe.tsx',
  'app/lesson_help.tsx',
  'app/lesson_irregular_verbs.tsx',
  'app/(tabs)/friends.tsx',
  'app/(tabs)/lessons.tsx',
  'app/(tabs)/settings.tsx',
];

describe('Animated.event scroll handlers', () => {
  it('are attached to Animated.ScrollView instead of plain ScrollView', () => {
    for (const file of TSX_FILES) {
      const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
      const eventMatches = [...source.matchAll(/onScroll=\{Animated\.event/g)];

      for (const match of eventMatches) {
        const before = source.slice(0, match.index);
        const lastAnimated = before.lastIndexOf('<Animated.ScrollView');
        const lastPlain = before.lastIndexOf('<ScrollView');

        expect(lastAnimated).toBeGreaterThan(lastPlain);
      }
    }
  });
});
