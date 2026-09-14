import assert from 'node:assert/strict';

import { parseBonusEnergyStorageValue } from '../app/spin_gift_storage_integrity';

const NOW = 1_800_000_000_000;
const EXPIRES_AT = NOW + 60_000;

assert.deepEqual(
  parseBonusEnergyStorageValue(JSON.stringify({ amount: 3, capacity: 3, expiresAt: EXPIRES_AT }), NOW),
  {
    status: 'valid',
    migrated: true,
    value: { schemaVersion: 2, amount: 60, capacity: 60, expiresAt: EXPIRES_AT },
  },
);
assert.deepEqual(
  parseBonusEnergyStorageValue(JSON.stringify({
    schemaVersion: 2,
    amount: 60,
    capacity: 60,
    expiresAt: EXPIRES_AT,
  }), NOW),
  {
    status: 'valid',
    migrated: false,
    value: { schemaVersion: 2, amount: 60, capacity: 60, expiresAt: EXPIRES_AT },
  },
);
assert.deepEqual(
  parseBonusEnergyStorageValue(JSON.stringify({ amount: 20, capacity: 20, expiresAt: EXPIRES_AT }), NOW),
  {
    status: 'valid',
    migrated: true,
    value: { schemaVersion: 2, amount: 200, capacity: 200, expiresAt: EXPIRES_AT },
  },
);

console.log('BONUS ENERGY MIGRATION PROBE: PASS');
