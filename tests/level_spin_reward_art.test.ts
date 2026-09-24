import fs from 'fs';
import path from 'path';

describe('LevelSpinRewardArt', () => {
  test('renders raster rewards and vector energy without baking a visible label into the component', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components', 'LevelSpinRewardArt.tsx'),
      'utf8',
    );

    expect(source).toContain("import { Image } from 'expo-image'");
    expect(source).toContain('levelSpinRewardImageSource(rewardId)');
    expect(source).toContain("rewardId === 'energy_full'");
    expect(source).toContain('name="flash-outline"');
    expect(source).toContain("rewardId === 'energy_full' ? '#9187FF' : '#F5C451'");
    expect(source).toContain('contentFit="contain"');
    expect(source).toContain('accessibilityLabel={accessibilityLabel}');
    expect(source).toContain('width: size, height: size');
    expect(source).not.toContain('<Text');
  });

  // зачем (PM-046, владелец): второй тест сторожил components/LevelSpinFinishLine.tsx
  // (барабан экрана /level_reward_spin) — файл удалён вместе с экраном.
  // LevelSpinRewardArt остаётся: им всё ещё рисуются старые/оплаченные
  // спин-подарки в app/level_gifts_inventory.tsx (см. отчёт PM-046/047).
});
