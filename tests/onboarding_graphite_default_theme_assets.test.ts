import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

describe('legacy onboarding graphite default theme assets', () => {
  test('home menu minimalDark no longer depends on onboarding-graphite asset folders', () => {
    const homeMenuSource = fs.readFileSync(path.join(ROOT, 'app', 'home_menu_icons.ts'), 'utf8');

    expect(homeMenuSource).not.toContain('assets/images/home_menu/onboarding-graphite');
    expect(fs.existsSync(path.join(ROOT, 'assets', 'images', 'home_menu', 'onboarding-graphite'))).toBe(false);
    expect(homeMenuSource).toContain('assets/images/home_menu/home-minimal-dark-lessons.webp');
    expect(homeMenuSource).toContain('assets/images/home_menu/home-minimal-dark-quizzes.webp');
  });

  test('minimalDark palette is the app graphite theme, not the old onboarding amber theme', () => {
    const themeSource = fs.readFileSync(path.join(ROOT, 'constants', 'theme.ts'), 'utf8');
    const minimalDarkBlock = themeSource.slice(
      themeSource.indexOf('export const MINIMAL_DARK = {'),
      themeSource.indexOf('export type ThemeMode'),
    );

    expect(minimalDarkBlock).toContain("bgPrimary:   '#121212'");
    expect(minimalDarkBlock).toContain("accent:      '#6EA8FF'");
    expect(minimalDarkBlock).not.toContain("accent:      '#F2B84B'");
  });
});
