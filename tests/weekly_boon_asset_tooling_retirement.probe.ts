import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
assert.ok(!existsSync(path.join(root, 'scripts/refit_weekly_boon_icons.mjs')));
for (const file of ['scripts/generate_business_line_icons.mjs', 'scripts/asset-hygiene-safe.mjs', 'scripts/qa/responsive-source-files.json']) {
  const source = readFileSync(path.join(root, file), 'utf8');
  assert.ok(!/weekly_boon|WeeklyBoon|BoonActivatedHybrid|BoonChestHybrid/.test(source), `${file} retains retired asset tooling`);
}
console.log('weekly boon asset tooling retired');
