import fs from 'fs';
import path from 'path';

const read = (file: string) => fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');

describe('PremiumGoldButton runtime ownership', () => {
  it('requires both screen runtime and explicit owner visibility', () => {
    const noEnergy = read('components/NoEnergyModal.tsx');
    // зачем (01.10): золотая кнопка удалена целиком (не импортировалась) — стиль 2.0 без золота.
    expect(fs.existsSync(path.resolve(__dirname, '..', 'components/PremiumGoldButton.tsx'))).toBe(false);

    // зачем: NoEnergyModal перенесён на Liquid Glass — золотая кнопка заменена светлой CTA темы,
    // золотой перелив теперь остаётся только у PremiumGoldButton на других экранах.
    expect(noEnergy).not.toContain('PremiumGoldButton');
  });
});
