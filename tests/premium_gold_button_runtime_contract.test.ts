import fs from 'fs';
import path from 'path';

const read = (file: string) => fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');

describe('PremiumGoldButton runtime ownership', () => {
  it('requires both screen runtime and explicit owner visibility', () => {
    const button = read('components/PremiumGoldButton.tsx');
    const noEnergy = read('components/NoEnergyModal.tsx');
    const arenaLimit = read('components/ArenaLimitModal.tsx');

    expect(button).toContain('active: boolean');
    expect(button).toContain('active && premiumButtonRuntimeActive');
    expect(noEnergy).toMatch(/<PremiumGoldButton\s+active=\{modalVisible\}/);
    expect(arenaLimit).toMatch(/<PremiumGoldButton\s+active=\{visible\}/);
  });
});
