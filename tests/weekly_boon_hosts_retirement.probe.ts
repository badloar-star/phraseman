import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const layout = readFileSync(path.join(root, 'app/_layout.tsx'), 'utf8');

for (const name of ['BoonActivatedHost', 'MysteryMondayHost', 'PerfectWeekHost']) {
  assert.equal(existsSync(path.join(root, 'components', `${name}.tsx`)), false, `${name} still bundled`);
  assert.equal(layout.includes(`<${name}`), false, `${name} still mounted`);
}
console.log('weekly boon hosts retired');
