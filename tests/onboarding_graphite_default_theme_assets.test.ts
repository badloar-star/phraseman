import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const HOME_MENU_DIR = path.join(ROOT, 'assets', 'images', 'home_menu', 'onboarding-graphite');
const HOME_MENU_SOURCE = path.join(ROOT, 'app', 'home_menu_icons.ts');
const THEME_SOURCE = path.join(ROOT, 'constants', 'theme.ts');

const HOME_MENU_ASSETS = [
  'home-onboarding-graphite-lessons.webp',
  'home-onboarding-graphite-quizzes.webp',
  'home-onboarding-graphite-cards.webp',
  'home-onboarding-graphite-daily-tasks.webp',
  'home-onboarding-graphite-league.webp',
  'home-onboarding-graphite-diagnostic-test.webp',
  'home-onboarding-graphite-practice.webp',
  'home-onboarding-graphite-arena.webp',
  'home-onboarding-graphite-exam.webp',
  'home-onboarding-graphite-shop.webp',
  'home-onboarding-graphite-hero-map.webp',
] as const;

describe('Onboarding Graphite default free theme assets', () => {
  test('minimalDark uses generated onboarding-graphite home menu assets instead of onboarding icons', async () => {
    const homeMenuSource = fs.readFileSync(HOME_MENU_SOURCE, 'utf8');

    for (const asset of HOME_MENU_ASSETS) {
      expect(homeMenuSource).toContain(`assets/images/home_menu/onboarding-graphite/${asset}`);
      const filePath = path.join(HOME_MENU_DIR, asset);
      expect(fs.existsSync(filePath)).toBe(true);

      const meta = await sharp(filePath).metadata();
      expect(meta.width).toBe(384);
      expect(meta.height).toBe(384);
      expect(meta.hasAlpha).toBe(true);
    }

    const minimalDarkBranch = homeMenuSource.slice(
      homeMenuSource.indexOf("if (themeMode === 'minimalDark')"),
      homeMenuSource.indexOf("if (themeMode === 'gold')"),
    );
    expect(minimalDarkBranch).not.toContain('assets/images/onboarding/');
  });

  test('minimalDark palette matches onboarding graphite free theme tokens', () => {
    const themeSource = fs.readFileSync(THEME_SOURCE, 'utf8');
    const minimalDarkBlock = themeSource.slice(
      themeSource.indexOf('export const MINIMAL_DARK = {'),
      themeSource.indexOf('export type ThemeMode'),
    );

    expect(minimalDarkBlock).toContain("bgPrimary:   '#020304'");
    expect(minimalDarkBlock).toContain("bgCard:      '#111213'");
    expect(minimalDarkBlock).toContain("textPrimary: '#FFF8E8'");
    expect(minimalDarkBlock).toContain("accent:      '#F2B84B'");
    expect(minimalDarkBlock).toContain("correctText: '#151008'");
  });

  test('minimalDark uses a squarer radius scale than the old rounded free theme', () => {
    const themeContextSource = fs.readFileSync(path.join(ROOT, 'components', 'ThemeContext.tsx'), 'utf8');

    expect(themeContextSource).toContain("themeMode === 'minimalDark'");
    expect(themeContextSource).toContain("{ md: 8, lg: 10, xl: 12, xxl: 14 }");
  });
});
