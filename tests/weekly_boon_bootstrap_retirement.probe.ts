import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const home = readFileSync(path.join(root, 'app/(tabs)/home.tsx'), 'utf8');

assert.equal(existsSync(path.join(root, 'app/boons/boon_bootstrap.ts')), false);
assert.equal(home.includes('applyTodaysBoonsOnAppOpen'), false);
assert.equal(home.includes('applyMonthlyPremiumFreezeAllowance().catch(() => {})'), true);
console.log('weekly boon bootstrap retired; Plus freeze preserved');
