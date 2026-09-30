import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const home = readFileSync(path.join(root, 'app/(tabs)/home.tsx'), 'utf8');
const hydration = readFileSync(path.join(root, 'app/home_screen_hydration.ts'), 'utf8');

for (const dead of ['const totalXP = 0', 'setTotalXP', 'totalXP: 0', 'totalXPMulti: 1', 'experimentalStatusLevelLabel', 'level={1}', 'weekly_pb_v1']) {
  assert.equal(home.includes(dead), false, `Home retains ${dead}`);
}
for (const dead of ['totalXP:', 'totalXPMulti:', 'resolveHomeStorageStats']) {
  assert.equal(hydration.includes(dead), false, `Home hydration retains ${dead}`);
}
console.log('Home XP stubs retired');
