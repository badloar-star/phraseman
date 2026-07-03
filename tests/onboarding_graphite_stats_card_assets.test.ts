import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('legacy onboarding graphite stats card assets', () => {
  test('stats cards and chrome reject onboarding-graphite leftovers', () => {
    const cardSource = fs.readFileSync(path.join(ROOT, 'components/StatsCardArtSurface.tsx'), 'utf8');
    const chromeSource = fs.readFileSync(path.join(ROOT, 'constants/statsThemeChrome.ts'), 'utf8');

    expect(cardSource).not.toContain('onboarding-graphite');
    expect(chromeSource).not.toContain('onboarding-graphite');
    expect(chromeSource).toContain("minimalDark: '#6EA8FF'");
    expect(chromeSource).not.toContain("minimalDark: '#F2B84B'");
    expect(fs.existsSync(path.join(ROOT, 'assets/images/statistics/cards/onboarding-graphite'))).toBe(false);
  });
});
