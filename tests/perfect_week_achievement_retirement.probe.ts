import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
for (const file of ['app/achievements.ts', 'app/hall_of_fame_utils.ts', 'scripts/gustav_achievement_taxonomy.ts', 'scripts/gustav_storage_inventory.ts']) {
  const source = readFileSync(path.join(root, file), 'utf8');
  assert.ok(!source.includes('perfect_week'), `${file} retains perfect_week`);
}
const hall = readFileSync(path.join(root, 'app/hall_of_fame_utils.ts'), 'utf8');
for (const key of ['week_days_done', 'week_days_week_key']) {
  assert.ok(!hall.includes(key), `hall of fame retains ${key}`);
}
console.log('perfect week achievement and daily markers retired');
