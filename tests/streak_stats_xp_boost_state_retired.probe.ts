import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'streak_stats.tsx'), 'utf8');
for (const token of [
  'clubBoostMultiplier',
  'leagueBoostMultiplier',
  'leagueGroupBoostMultiplier',
  'giftMultiplier',
  'giftXpBankRemaining',
  'formatStatsBoostTimeLeft',
  'useVisibleWallClock',
  "onAppEvent('xp_changed'",
]) {
  assert.equal(source.includes(token), false, `retired XP boost state remains: ${token}`);
}
// зачем (04.10): заморозка стала асинхронной (бесплатная заморозка Plus пишет в хранилище; D101 убрал платную) — сторожим сам обработчик, а не форму без async.
assert.equal(source.includes('const handleFreezeStreak = async () =>'), true);
