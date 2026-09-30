import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');
assert.equal(existsSync(path.join(root, 'app/boons/boon_effects_energy.ts')), false, 'weekly energy effect still bundled');
for (const file of [
  'components/EnergyContext.tsx',
  'components/energy/EnergyInfoPopover.tsx',
  'app/energy_system.ts',
  'app/energy_peek_cache.ts',
]) {
  const source = read(file);
  assert.equal(/readBoonEnergyOverride|isEnergyFreeWindowActive|boon_effects_energy|weeklyFreeWindow/.test(source), false, `${file} retains weekly energy path`);
}
assert.equal(read('components/EnergyContext.tsx').includes('overrides: []'), true, 'full-energy notification still uses retired override');
assert.equal(read('components/EnergyContext.tsx').includes('return getRecoveryIntervalMs();'), true, 'base energy recovery was not preserved');
assert.equal(read('components/energy/EnergyInfoPopover.tsx').includes('isUnlimited ? copy.unlimited : heading'), true, 'unlimited label missing');
console.log('weekly boon energy effect retired');
