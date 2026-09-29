import fs from 'fs';
import path from 'path';

const read = (file: string) => fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');

describe('PremiumGoldButton runtime ownership', () => {
  it('requires both screen runtime and explicit owner visibility', () => {
    const button = read('components/PremiumGoldButton.tsx');
    const noEnergy = read('components/NoEnergyModal.tsx');

    expect(button).toContain('active: boolean');
    expect(button).toContain('active && premiumButtonRuntimeActive');
    // зачем: NoEnergyModal перенесён на Liquid Glass — золотая кнопка заменена светлой CTA темы,
    // золотой перелив теперь остаётся только у PremiumGoldButton на других экранах.
    expect(noEnergy).not.toContain('PremiumGoldButton');
  });
});
