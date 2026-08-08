import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

describe('removed graphite theme assets', () => {
  test('legacy theme ids resolve to Indigo without their own home-menu assets', () => {
    const homeMenuSource = fs.readFileSync(path.join(ROOT, 'app', 'home_menu_icons.ts'), 'utf8');

    expect(homeMenuSource).not.toContain('assets/images/home_menu/onboarding-graphite');
    expect(fs.existsSync(path.join(ROOT, 'assets', 'images', 'home_menu', 'onboarding-graphite'))).toBe(false);
    expect(homeMenuSource).toContain("themeMode === 'minimalDark' || themeMode === 'candyBlue' || themeMode === 'indigo'");
    expect(homeMenuSource).toContain('assets/images/home_menu/indigo/home-indigo-lessons.webp');
    expect(homeMenuSource).not.toContain('assets/images/home_menu/home-minimal-dark');
    expect(homeMenuSource).not.toContain('assets/images/home_menu/candyBlue');
  });

  test('minimalDark palette is the app graphite theme, not the old onboarding amber theme', () => {
    const themeSource = fs.readFileSync(path.join(ROOT, 'constants', 'theme.ts'), 'utf8');
    const minimalDarkBlock = themeSource.slice(
      themeSource.indexOf('export const MINIMAL_DARK = {'),
      themeSource.indexOf('export type ThemeMode'),
    );

    expect(minimalDarkBlock).toContain("bgPrimary:   '#0B0B0C'");
    expect(minimalDarkBlock).toContain("accent:      '#6EA8FF'");
    expect(minimalDarkBlock).not.toContain("accent:      '#F2B84B'");
  });
});
