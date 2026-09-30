import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (name: string) => fs.readFileSync(path.join(__dirname, '..', 'app', name), 'utf8');
const cache = read('statsCache.ts');
const screen = read('streak_stats.tsx');
for (const token of [
  'clubBoostMultiplier', 'clubBoostExpiresAt', 'giftMultiplier',
  'giftExpiresAt', 'giftXpBankRemaining', 'weekPoints', 'engineLeagueId',
]) {
  assert.equal(cache.includes(token), false, `retired stats cache field remains: ${token}`);
}
for (const token of ['weekPoints', 'engineLeague', "from './league_engine'"]) {
  assert.equal(screen.includes(token), false, `retired stats screen league state remains: ${token}`);
}
