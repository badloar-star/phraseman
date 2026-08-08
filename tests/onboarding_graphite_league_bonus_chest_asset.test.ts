import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('removed graphite league bonus asset', () => {
  test('league bonus registry removes deleted theme chests and falls back to Indigo', () => {
    const source = fs.readFileSync(path.join(ROOT, 'constants/leagueBonusGiftImages.ts'), 'utf8');

    expect(source).not.toContain('onboarding-graphite');
    expect(source).toContain("const DEFAULT_THEME: LeagueBonusGiftImageTheme = 'indigo'");
    expect(source).not.toContain('minimalDark-chest.webp');
    expect(source).not.toContain('candyBlue-chest.webp');
  });

  test('league bonus minimalDark palette is no longer the old amber onboarding graphite chrome', () => {
    const source = fs.readFileSync(path.join(ROOT, 'constants/leagueBonusPalette.ts'), 'utf8');
    const minimalStart = source.indexOf('  minimalDark: {');
    const darkStart = source.indexOf('  dark: {', minimalStart);
    const block = source.slice(minimalStart, darkStart);

    expect(block).not.toContain("accent: '#F2B84B'");
    expect(block).toContain('#6EA8FF');
  });
});
