import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const cache = fs.readFileSync(path.join(__dirname, '..', 'app', 'statsCache.ts'), 'utf8');
const screen = fs.readFileSync(path.join(__dirname, '..', 'app', 'streak_stats.tsx'), 'utf8');
for (const token of ['extractPoints', 'totalPoints', 'points: number;']) {
  assert.equal(cache.includes(token), false, `XP stats-cache token remains: ${token}`);
}
// зачем (04.10): вызов получил текущую дату и последний засчитанный день — отметки недели следуют за счётчиком серии (жалоба «серия висит»); сторожим сам источник строк.
assert.equal(cache.includes('buildStatsActivityRows(statsMap, fgDaily, currentStreak, new Date(), lastActiveRaw)'), true);
assert.equal(cache.includes("AsyncStorage.getItem('daily_stats')"), true, 'streak history stays readable');
assert.equal(screen.includes('    points: number;'), false, 'screen day model must not carry XP points');
