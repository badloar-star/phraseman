import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.join(__dirname, '..');

describe('Onboarding Graphite league bonus chest asset', () => {
  test('minimalDark league bonus chest exists as generated transparent 512x512 WebP', async () => {
    const file = path.join(
      ROOT,
      'assets/images/league_bonus',
      'onboarding-graphite-chest.webp',
    );
    expect(fs.existsSync(file)).toBe(true);
    const metadata = await sharp(file).metadata();
    expect(metadata.width).toBe(512);
    expect(metadata.height).toBe(512);
    expect(metadata.format).toBe('webp');
    expect(metadata.hasAlpha).toBe(true);
  });

  test('league bonus registry points minimalDark to onboarding-graphite chest', () => {
    const source = fs.readFileSync(path.join(ROOT, 'constants/leagueBonusGiftImages.ts'), 'utf8');
    expect(source).toContain(
      "minimalDark: require('../assets/images/league_bonus/onboarding-graphite-chest.webp')",
    );
  });

  test('league bonus minimalDark palette uses onboarding graphite amber chrome', () => {
    const source = fs.readFileSync(path.join(ROOT, 'constants/leagueBonusPalette.ts'), 'utf8');
    const minimalStart = source.indexOf('  minimalDark: {');
    const darkStart = source.indexOf('  dark: {', minimalStart);
    const block = source.slice(minimalStart, darkStart);

    expect(block).toContain("accent: '#F2B84B'");
    expect(block).toContain("readyAccent: '#FFF1B8'");
    expect(block).toContain("fill: ['#BBA46F', '#E4A936', '#F2B84B']");
    expect(block).toContain("frame: ['#FFF1B8', '#F2B84B', '#BBA46F']");
    expect(block).toContain("primary: ['#FFF1B8', '#F2B84B', '#BBA46F']");
    expect(block).not.toContain('#6EA8FF');
    expect(block).not.toContain('#7BD7FF');
    expect(block).not.toContain('#53E7D4');
  });
});
