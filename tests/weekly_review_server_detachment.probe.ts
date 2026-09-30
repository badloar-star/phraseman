import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'functions', 'src', 'index.ts'), 'utf8');
const packageJson = fs.readFileSync(path.join(root, 'functions', 'package.json'), 'utf8');
const leaderboard = fs.readFileSync(path.join(root, 'functions', 'src', 'leaderboard.ts'), 'utf8');

for (const callable of ['weeklyReviewGenerate', 'statsInsightsGenerate', 'leaderboardUpdateDailyAnalytics']) {
  assert.equal(index.includes(callable), false, `${callable} is still exported`);
  assert.equal(packageJson.includes(`functions:${callable}`), false, `Deploy manifest still selects ${callable}`);
}
assert.equal(index.includes('exports.progressSubmitEvent'), true, 'Progress sync export must remain');
// зачем: deploy:safe удалён при ретайре; вебхук покупок остаётся экспортом и уходит полным `deploy` (без --only), поэтому проверяем экспорт, а не устаревший список целей
assert.equal(index.includes('revenueCatShardsWebhook'), true, 'Purchase webhook must remain exported');
assert.equal(index.includes('exports.nameReserve'), true, 'Name reservation must remain');
assert.equal(leaderboard.includes('leaderboardUpdateDailyAnalytics'), false, 'Retired XP analytics callable must not remain in source');
assert.equal(leaderboard.includes('daily7xp'), false, 'Retired XP analytics field must not remain in leaderboard source');
assert.equal(leaderboard.includes('export const nameReserve'), true, 'Name reservation implementation must remain');
assert.equal(leaderboard.includes('export const nameCheckAvailability'), true, 'Name availability implementation must remain');
