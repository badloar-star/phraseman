// зачем: бонусная энергия снята (D07/D09, ENERGY_BONUS_CAPACITY_LIMIT = 0, 00d854736) — после миграции схемы v2 любое количество читается как 0; ожидания 60/200 описывали живой бонус и устарели.
import assert from 'node:assert/strict';

import { parseBonusEnergyStorageValue } from '../app/spin_gift_storage_integrity';

const NOW = 1_800_000_000_000;
const EXPIRES_AT = NOW + 60_000;

assert.deepEqual(
  parseBonusEnergyStorageValue(JSON.stringify({ amount: 3, capacity: 3, expiresAt: EXPIRES_AT }), NOW),
  {
    status: 'valid',
    migrated: true,
    value: { schemaVersion: 2, amount: 0, capacity: 0, expiresAt: EXPIRES_AT },
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
    value: { schemaVersion: 2, amount: 0, capacity: 0, expiresAt: EXPIRES_AT },
  },
);
assert.deepEqual(
  parseBonusEnergyStorageValue(JSON.stringify({ amount: 20, capacity: 20, expiresAt: EXPIRES_AT }), NOW),
  {
    status: 'valid',
    migrated: true,
    value: { schemaVersion: 2, amount: 0, capacity: 0, expiresAt: EXPIRES_AT },
  },
);

console.log('BONUS ENERGY MIGRATION PROBE: PASS');
