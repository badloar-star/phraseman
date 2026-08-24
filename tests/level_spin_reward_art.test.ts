import fs from 'fs';
import path from 'path';

describe('LevelSpinRewardArt', () => {
  test('renders universal reward art without baking a visible label into the component', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components', 'LevelSpinRewardArt.tsx'),
      'utf8',
    );

    expect(source).toContain("import { Image } from 'expo-image'");
    expect(source).toContain('levelSpinRewardImageSource(rewardId)');
    expect(source).toContain('contentFit="contain"');
    expect(source).toContain('accessibilityLabel={accessibilityLabel}');
    expect(source).toContain('width: size, height: size');
    expect(source).not.toContain('<Text');
  });

  test('keeps the aura gift in the fixed Finish Line stream and out of visible text markup', () => {
    const finishLine = fs.readFileSync(
      path.join(process.cwd(), 'components', 'LevelSpinFinishLine.tsx'),
      'utf8',
    );
    expect(finishLine).toContain("'cosmetic_avatar_aura'");
    expect(finishLine).toContain('<LevelSpinRewardArt');
  });
});
