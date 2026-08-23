import fs from 'fs';
import path from 'path';

describe('ThemeContext default theme', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'ThemeContext.tsx'), 'utf8');
  const settingsThemesSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'settings_themes.tsx'), 'utf8');
  const themeSource = fs.readFileSync(path.join(__dirname, '..', 'constants', 'theme.ts'), 'utf8');

  it('uses Indigo as the first-run and fallback app theme', () => {
    expect(source).toContain("const DEFAULT_THEME_MODE: ThemeMode = 'indigo'");
    expect(source).toContain('useState<ThemeMode>(DEFAULT_THEME_MODE)');
    expect(source).toContain("void AsyncStorage.setItem('app_theme', DEFAULT_THEME_MODE)");
    expect(source).not.toContain("const DEFAULT_THEME_MODE: ThemeMode = 'compass'");
  });

  it('keeps Indigo and Sage Porcelain free, Midnight premium-grandfathered, and Gold reward-only', () => {
    expect(source).toContain("from '../app/theme_access_policy';");
    expect(source).not.toContain('const PREMIUM_ONLY_THEMES');
    expect(settingsThemesSource).toMatch(/\{\s*mode: 'midnight'[^}]*\}/);
    expect(settingsThemesSource).toContain('isThemePlusOnly(candidate)');
    expect(source).toContain('const valid = isSelectableThemeMode(migrated);');
    expect(source).toContain("'minimalDark', 'candyBlue'");
    expect(settingsThemesSource).not.toMatch(/\{\s*mode: '(?:minimalDark|candyBlue)'/);
    expect(settingsThemesSource).toContain('isThemeRewardOnly(item.mode)');
  });

  it('removes Coral and migrates its persisted value to Indigo', () => {
    expect(themeSource).not.toMatch(/export const CORAL\b/);
    expect(themeSource).not.toMatch(/export type ThemeMode\s*=.*'coral'/);
    expect(source).toMatch(/REMOVED_THEME_MODES[^\n]*'coral'/);
    expect(source).not.toContain("migrated === 'coral'");
    expect(settingsThemesSource).not.toMatch(/\{\s*mode: 'coral'/);
    // зачем без расширения: иконки тем переведены png→webp (2026-08-23). Проверка на
    // одно лишь «coral.png» стала бы дырявой — вернувшийся coral.webp прошёл бы мимо.
    expect(settingsThemesSource).not.toContain("theme-icons/coral");
  });

  it('removes Coral theme assets while preserving independent Coral Sunset card backs', () => {
    const assetsRoot = path.join(__dirname, '..', 'assets');
    const coralAssets: string[] = [];
    const visit = (directory: string) => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const absolutePath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          visit(absolutePath);
        } else {
          const relativePath = path.relative(assetsRoot, absolutePath).replace(/\\/g, '/');
          if (/coral/i.test(relativePath)) coralAssets.push(relativePath);
        }
      }
    };
    visit(assetsRoot);

    expect(coralAssets.sort()).toEqual([
      'images/flashcard_backs/community_02_coral_sunset.webp',
      'images/flashcard_backs/community_02_coral_sunset_fan.webp',
    ]);
  });

  it('preserves every Midnight grandfather exception', () => {
    expect(source).toContain("const grandfathered = pairs[2]?.[1] === '1' || themeStr === 'midnight';");
    expect(source).toContain("const premiumLocked = isThemePlusOnly(t) && !(t === 'midnight' && grandfathered);");
    expect(source).toContain("if (m === 'midnight' && midnightGrandfathered) {");
    expect(source).toContain("if (mode === 'midnight' && midnightGrandfathered) return true;");
  });
});
