import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
for (const name of ['TodaysBoonStrip', 'WeeklyBoonDetailModal']) {
  assert.equal(existsSync(path.join(root, 'components', `${name}.tsx`)), false, `${name} still bundled`);
}

const showcase = readFileSync(path.join(root, 'components/dev/motion_showcase/sections/celebrations.tsx'), 'utf8');
assert.equal(showcase.includes('WeeklyBoonDetailModal'), false, 'weekly boon detail still in DEV showcase');
assert.equal(showcase.includes('celebrations-weekly-boon-detail'), false, 'weekly boon detail entry still in DEV showcase');
console.log('weekly boon presentation retired');
