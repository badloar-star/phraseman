import assert from 'node:assert/strict';

import { resolveEnergyRuntimeConfig } from '../app/energy_contract';

assert.deepEqual(resolveEnergyRuntimeConfig(false, 5, 30 * 60 * 1000), {
  maxEnergy: 5,
  recoveryIntervalMs: 30 * 60 * 1000,
});
assert.deepEqual(resolveEnergyRuntimeConfig(true, 5, 30 * 60 * 1000), {
  maxEnergy: 100,
  recoveryIntervalMs: 6 * 60 * 1000,
});

console.log('ENERGY REMOTE ROLLOUT PROBE: PASS');
