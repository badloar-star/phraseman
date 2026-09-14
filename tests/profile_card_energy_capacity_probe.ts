import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  ENERGY_BASE_CAPACITY,
  ENERGY_PERMANENT_CAPACITY_LIMIT,
  profileCardEnergyCapacity,
} from '../app/energy_contract';
import { createFullEnergyState, settleEnergyState } from '../app/energy_state_v2';

const read = (file: string): string => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

assert.equal(profileCardEnergyCapacity(0), 100);
assert.equal(profileCardEnergyCapacity(1), 110);
assert.equal(profileCardEnergyCapacity(5), 150);
assert.equal(profileCardEnergyCapacity(99), ENERGY_PERMANENT_CAPACITY_LIMIT);

const emptyAtOne = { ...createFullEnergyState(1, 110), current: 100 };
const recovered = settleEnergyState(emptyAtOne, {
  nowMs: 61 * 60_000 + 1,
  unitMs: 6 * 60_000,
  maxEnergy: 110,
  bonusEnergy: 0,
  bonusCapacity: 0,
  bonusExpiresAt: 0,
});
assert.equal(recovered.state.current, 110, 'profile-card capacity must be recoverable');
assert.equal(ENERGY_BASE_CAPACITY, 100);

const context = read('components/EnergyContext.tsx');
assert.ok(context.includes("AsyncStorage.getItem('profile_card_level')"));
assert.ok(context.includes('profileCardEnergyCapacity(rawProfileCardLevel'));
assert.ok(context.includes("DeviceEventEmitter.addListener('energy_reload'"));

const profileSystem = read('app/profile_card_system.ts');
assert.ok(profileSystem.includes("emitAppEvent('energy_reload')"), 'upgrade must refresh the live energy capacity');

const card = read('components/PlayerProfileModal.tsx');
assert.ok(card.includes('profile-card-energy-upgrade-bonus'));
assert.ok(card.includes('<EnergyIcon'));
assert.ok(card.includes("'+10'"));

console.log('PROFILE CARD ENERGY CAPACITY PROBE: PASS');
