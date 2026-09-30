import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'daily_analytics_sync.ts'), 'utf8');
for (const marker of ['myXp7', 'weekXp', 'daily7xp', 'xp: null', 'totalUsers']) {
  assert.equal(source.includes(marker), false, `Local analytics still has ${marker}`);
}
assert.equal(source.includes('getLast7DaysTimeMs'), true);
assert.equal(source.includes('daily7timeMs: null'), true);
