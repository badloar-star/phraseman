import assert from 'node:assert/strict';

import {
  coerceEnergyStateV2,
  migrateLegacyEnergyState,
  settleEnergyAcrossRateSegments,
  settleEnergyState,
  timeUntilEnergyAtLeast,
} from '../app/energy_state_v2';

const NOW = 1_800_000_000_000;
const migratedHalf = migrateLegacyEnergyState(
  { current: 3, lastRecoveryTime: NOW - 15 * 60_000 },
  NOW,
);
assert.equal(migratedHalf.schemaVersion, 2);
assert.equal(migratedHalf.current, 70);
assert.equal(migratedHalf.recoveryCreditMicrounits, 0);

const migratedFraction = migrateLegacyEnergyState(
  { current: 3, lastRecoveryTime: NOW - 60_000 },
  NOW,
);
assert.equal(migratedFraction.current, 60);
assert.equal(migratedFraction.recoveryCreditMicrounits, 666_666);

const settled = settleEnergyState({
  schemaVersion: 2,
  current: 86,
  lastSettledAt: NOW,
  recoveryCreditMicrounits: 0,
  recoveryDivisionRemainder: 0,
}, {
  nowMs: NOW + 14 * 6 * 60_000,
  unitMs: 6 * 60_000,
  bonusEnergy: 0,
  bonusCapacity: 0,
  bonusExpiresAt: 0,
});
assert.equal(settled.state.current, 100);

assert.equal(timeUntilEnergyAtLeast({
  current: 8,
  required: 20,
  unitMs: 360_000,
  recoveryCreditMicrounits: 0,
  recoveryDivisionRemainder: 0,
}), 12 * 360_000);

const acrossRates = settleEnergyAcrossRateSegments({
  state: {
    schemaVersion: 2,
    current: 0,
    lastSettledAt: NOW,
    recoveryCreditMicrounits: 0,
    recoveryDivisionRemainder: 0,
  },
  bonusEnergy: 0,
  bonusCapacity: 0,
  bonusExpiresAt: 0,
}, [
  { endAtMs: NOW + 3 * 60_000, unitMs: 6 * 60_000 },
  { endAtMs: NOW + 3 * 60_000 + 18_000, unitMs: 36_000 },
]);
assert.equal(acrossRates.state.current, 1);

const coercedLegacy = coerceEnergyStateV2(
  { current: 3, lastRecoveryTime: NOW - 15 * 60_000 },
  NOW,
);
assert.equal(coercedLegacy.current, 70);
assert.deepEqual(coerceEnergyStateV2(coercedLegacy, NOW + 1), coercedLegacy);

console.log('ENERGY STATE V2 PROBE: PASS');
