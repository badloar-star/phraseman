import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');
assert.equal(existsSync(path.join(root, 'app/boons/boon_feature_grants.ts')), false);
for (const file of ['app/feature_gates.ts', 'components/PremiumContext.tsx']) {
  assert.equal(read(file).includes('isFeatureGrantedByWeeklyBoon'), false, `${file} retains retired grant`);
}
assert.equal(read('app/feature_gates.ts').includes('return isFeaturePremiumGated(feature);'), true);
assert.equal(read('components/PremiumContext.tsx').includes('return hasPremiumAccess || access.freeForAll;'), true);
console.log('weekly boon feature grant retired');
