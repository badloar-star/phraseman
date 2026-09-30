import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
for (const name of ['boon_engine', 'boon_types', 'first_day_silence']) {
  assert.equal(existsSync(path.join(root, 'app/boons', `${name}.ts`)), false, `${name} still bundled`);
}
const layout = readFileSync(path.join(root, 'app/_layout.tsx'), 'utf8');
assert.equal(layout.includes("import('./boons/first_day_silence')"), false, 'retired first-day bonus priming remains');
assert.equal(layout.includes("AsyncStorage.setItem('install_date'"), true, 'install date recording was removed');
console.log('weekly boon engine retired');
