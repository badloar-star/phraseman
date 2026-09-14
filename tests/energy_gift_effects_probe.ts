import assert from 'node:assert/strict';

import {
  applyEnergyCapacityGift,
  energyGiftEffectForRewardId,
  expireEnergyGift,
  fillEnergyToActiveCap,
} from '../app/energy_gift_effects';

const MIDNIGHT = 1_800_028_800_000;
assert.deepEqual(
  applyEnergyCapacityGift({ base: 34, bonus: 0, capacity: 0, expiresAt: 0 }, 20, MIDNIGHT),
  { base: 100, bonus: 20, capacity: 20, expiresAt: MIDNIGHT },
);
assert.deepEqual(
  applyEnergyCapacityGift({ base: 90, bonus: 180, capacity: 180, expiresAt: MIDNIGHT }, 60, MIDNIGHT),
  { base: 100, bonus: 200, capacity: 200, expiresAt: MIDNIGHT },
);
assert.deepEqual(
  fillEnergyToActiveCap({ base: 41, bonus: 2, capacity: 40, expiresAt: MIDNIGHT }),
  { base: 100, bonus: 40, capacity: 40, expiresAt: MIDNIGHT },
);
assert.deepEqual(
  applyEnergyCapacityGift(
    { base: 150, bonus: 200, capacity: 200, expiresAt: MIDNIGHT, maxEnergy: 999 },
    60,
    MIDNIGHT,
  ),
  { base: 150, bonus: 200, capacity: 200, expiresAt: MIDNIGHT },
);
assert.deepEqual(
  expireEnergyGift({ base: 83, bonus: 40, capacity: 40, expiresAt: MIDNIGHT }),
  { base: 83, bonus: 0, capacity: 0, expiresAt: 0 },
);
assert.deepEqual(energyGiftEffectForRewardId('energy_plus3'), { kind: 'capacity', amount: 60 });

console.log('ENERGY GIFT EFFECTS PROBE: PASS');
