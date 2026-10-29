import assert from 'node:assert/strict';

import { ENERGY_PASSIVE_UNIT_MS, resolveEnergyRuntimeConfig } from '../app/energy_contract';

// зачем (замок владельца 28.10: +1 энергия за 30 минут): интервал всегда из контракта, удалённое значение его не меняет.
// Удалённым передаём заведомо другое число (10 минут), чтобы проверка «удалённое игнорируется» оставалась настоящей.
assert.equal(ENERGY_PASSIVE_UNIT_MS, 30 * 60 * 1000);
assert.deepEqual(resolveEnergyRuntimeConfig(false, 5, 10 * 60 * 1000), {
  maxEnergy: 5,
  recoveryIntervalMs: ENERGY_PASSIVE_UNIT_MS,
});
assert.deepEqual(resolveEnergyRuntimeConfig(true, 5, 10 * 60 * 1000), {
  maxEnergy: 5,
  recoveryIntervalMs: ENERGY_PASSIVE_UNIT_MS,
});

console.log('ENERGY REMOTE ROLLOUT PROBE: PASS');
