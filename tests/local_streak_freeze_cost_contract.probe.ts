import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
const home = fs.readFileSync(path.join(root, 'app', '(tabs)', 'home.tsx'), 'utf8');
const stats = fs.readFileSync(path.join(root, 'app', 'streak_stats.tsx'), 'utf8');
const flags = fs.readFileSync(path.join(root, 'app', 'remote_flags.ts'), 'utf8');
// home.tsx — зона «Дизайна»: платная заморозка там ещё живёт до их правки (D101).
assert.match(home, /FREEZE_COST_SHARDS\s*=\s*10/u);
// D101: экран статистики больше не продаёт заморозку за жемчуг.
assert.doesNotMatch(stats, /FREEZE_COST_SHARDS/u);
for (const source of [home, stats]) {
  assert.doesNotMatch(source, /getStreakFreezeCostShards|streak_freeze_cost_shards/u);
}
assert.doesNotMatch(flags, /getStreakFreezeCostShards|streak_freeze_cost_shards/u);
console.log('LOCAL STREAK FREEZE COST: PASS');
