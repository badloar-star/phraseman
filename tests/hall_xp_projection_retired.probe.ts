import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'hall_of_fame_utils.ts'), 'utf8');
for (const token of [
  'addOrUpdateScoreUnsafe',
  'enqueueSecondaryXpProjection',
  'pendingSecondaryXpProjections',
  "AsyncStorage.setItem('daily_stats'",
]) {
  assert.equal(source.includes(token), false, `retired XP writer remains: ${token}`);
}
assert.equal(source.includes('export const updateStreakOnActivity = async ('), true);
