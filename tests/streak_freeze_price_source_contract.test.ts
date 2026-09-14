import fs from 'fs';
import path from 'path';

const home = fs.readFileSync(path.join(process.cwd(), 'app', '(tabs)', 'home.tsx'), 'utf8');
const stats = fs.readFileSync(path.join(process.cwd(), 'app', 'streak_stats.tsx'), 'utf8');

test('both streak-freeze purchase surfaces use Remote Config', () => {
  expect(home).toContain('getStreakFreezeCostShards()');
  expect(stats).toContain('getStreakFreezeCostShards()');
  expect(stats).not.toContain('const FREEZE_COST_SHARDS = 10;');
});
