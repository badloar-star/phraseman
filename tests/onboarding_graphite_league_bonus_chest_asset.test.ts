import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('legacy onboarding graphite league bonus asset', () => {
  test('league bonus registry uses minimalDark chest and rejects onboarding-graphite leftovers', () => {
    const source = fs.readFileSync(path.join(ROOT, 'constants/leagueBonusGiftImages.ts'), 'utf8');

    expect(source).not.toContain('onboarding-graphite');
    expect(source).toContain("minimalDark: require('../assets/images/league_bonus/minimalDark-chest.webp')");
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
