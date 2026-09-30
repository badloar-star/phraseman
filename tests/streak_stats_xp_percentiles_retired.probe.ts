import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'streak_stats.tsx'), 'utf8');
for (const token of ['myXp7', 'daily7xp', 'weekXp', 'Суммарный опыт', 'Опыт за 7 дней']) {
  assert.equal(source.includes(token), false, `XP percentile token remains: ${token}`);
}
assert.equal(source.includes("label: triLang(lang, { ru: 'Время за 7 дней'"), true);
