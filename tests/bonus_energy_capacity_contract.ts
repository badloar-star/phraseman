import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { parseBonusEnergyStorageValue } from '../app/spin_gift_storage_integrity';

const now = Date.parse('2026-08-26T10:00:00.000Z');
const expiresAt = now + 60_000;

assert.deepEqual(
  parseBonusEnergyStorageValue(JSON.stringify({ amount: 3, capacity: 3, expiresAt }), now),
  { status: 'valid', value: { amount: 3, capacity: 3, expiresAt } },
  'a +3 gift must persist three current units and three temporary capacity slots',
);

assert.deepEqual(
  parseBonusEnergyStorageValue(JSON.stringify({ amount: 0, capacity: 3, expiresAt }), now),
  { status: 'valid', value: { amount: 0, capacity: 3, expiresAt } },
  'spending the bonus must not erase its temporary maximum before midnight',
);

assert.deepEqual(
  parseBonusEnergyStorageValue(JSON.stringify({ amount: 2, expiresAt }), now),
  { status: 'valid', value: { amount: 2, capacity: 2, expiresAt } },
  'legacy bonus snapshots migrate with capacity equal to their remaining amount',
);

const root = process.cwd();
const read = (file: string): string => fs.readFileSync(path.join(root, file), 'utf8');
const home = read('app/(tabs)/home.tsx');
const context = read('components/EnergyContext.tsx');
const energyBar = read('components/EnergyBar.tsx');
const gifts = read('app/level_gift_system.ts');

assert.match(context, /bonusEnergyCapacity:\s*number/);
assert.match(home, /energyMax\s*\+\s*energyBonusCapacity/);
assert.match(energyBar, /maxEnergy\s*\+\s*activeBonusCapacity/);
assert.match(energyBar, /const MAX_RENDERED_ENERGY_SLOTS = 32/);
assert.match(energyBar, /length:\s*renderedBonusCapacity/);
assert.match(gifts, /capacity:\s*\(existing\?\.capacity\s*\?\?\s*0\)\s*\+\s*n/);

console.log('BONUS ENERGY CAPACITY CONTRACT: PASS');
