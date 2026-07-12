import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'app/arena_results.tsx'), 'utf8');

test('arena result leaderboards use tonal surfaces without container borders', () => {
  expect((source.match(/testID="arena-results-leaderboard-surface"/g) ?? []).length).toBeGreaterThanOrEqual(3);
  expect(source).toContain('arenaLeaderboardSurface');
  expect(source).toContain('borderWidth: 0');
  expect(source).not.toContain('backdropFilter');
  expect(source).not.toContain('<BlurView');
});
