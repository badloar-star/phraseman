import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'components', 'LevelGiftModal.tsx'),
  'utf8',
);

describe('level gift modal active-theme contract', () => {
  it('uses the active theme for modal chrome and the primary action', () => {
    expect(source).toContain('const modalAccent = rewardModalAccentColor(themeMode, t)');
    expect(source).toContain('const primaryButtonColors = rewardModalPrimaryButtonColors(themeMode)');
    expect(source).toContain('const primaryButtonText = rewardModalPrimaryButtonText(themeMode)');
    expect(source).toContain('colors={primaryButtonColors}');
    expect(source).toContain('color: primaryButtonText');
    expect(source).not.toContain('colors={[palette.panelTop, palette.panelBottom]}');
    expect(source).not.toContain('colors={palette.button}');
  });

  it('keeps rarity colors scoped to the gift itself', () => {
    expect(source).toContain('const rarityPalette = paletteForRarity(rarity)');
    expect(source).toContain('palette={rarityPalette}');
    expect(source).toContain('backgroundColor: rarityPalette.accentSoft');
  });

  it('uses theme-aware text colors on both dark and light themes', () => {
    expect(source).toContain("<Text style={{ color: t.textPrimary, fontSize: f.numMd + 2");
    expect(source).toContain("<Text style={{ color: t.textPrimary, fontSize: f.h2 + 4");
  });
});
