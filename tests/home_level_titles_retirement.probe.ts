import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
const home = fs.readFileSync(path.join(root, 'app', '(tabs)', 'home.tsx'), 'utf8');
const titles = fs.readFileSync(path.join(root, 'constants', 'titles.ts'), 'utf8');

for (const marker of ['levelTitleRows', 'fallbackLevelTitle', 'getTitleString', 'kind: \'level\'']) {
  assert.equal(home.includes(marker), false, `Home still contains ${marker}`);
}
for (const marker of ['export const TITLES', 'getTitleForLevel', 'getTitleColor', 'getTitleString', 'minLevel', 'maxLevel']) {
  assert.equal(titles.includes(marker), false, `Titles still contain ${marker}`);
}
assert.equal(home.includes('SPECIAL_TITLES.map'), true, 'Special titles must remain on Home');
assert.equal(titles.includes("id: 'iron_habit'"), true, 'Streak title must remain');
