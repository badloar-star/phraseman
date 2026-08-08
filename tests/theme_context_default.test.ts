import fs from 'fs';
import path from 'path';

describe('ThemeContext default theme', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'ThemeContext.tsx'), 'utf8');
  const settingsThemesSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'settings_themes.tsx'), 'utf8');

  it('uses Indigo as the first-run and fallback app theme', () => {
    expect(source).toContain("const DEFAULT_THEME_MODE: ThemeMode = 'indigo'");
    expect(source).toContain('useState<ThemeMode>(DEFAULT_THEME_MODE)');
    expect(source).toContain("void AsyncStorage.setItem('app_theme', DEFAULT_THEME_MODE)");
    expect(source).not.toContain("const DEFAULT_THEME_MODE: ThemeMode = 'compass'");
  });

  it('keeps Indigo and Sage Porcelain free, Midnight premium-grandfathered, and Gold reward-only', () => {
    const premiumOnly = source.match(/const PREMIUM_ONLY_THEMES: ThemeMode\[\] = \[([^\]]*)\]/)?.[1] ?? '';
    const premiumThemes = Array.from(premiumOnly.matchAll(/'([^']+)'/g)).map((match) => match[1]);
    expect(premiumThemes).toEqual(['dark', 'coral', 'midnight', 'ember', 'aurora', 'volt']);
    expect(premiumThemes).not.toContain('indigo');
    expect(premiumThemes).not.toContain('sagePorcelain');
    expect(settingsThemesSource).toMatch(/\{\s*mode: 'midnight'[^}]*\}/);
    expect(settingsThemesSource).toMatch(/\{\s*mode: 'midnight'[^}]*premiumOnly: true/);
    expect(source).toContain("migrated === 'indigo'");
    expect(source).toContain("migrated === 'sagePorcelain'");
    expect(source).toContain("'minimalDark', 'candyBlue'");
    expect(settingsThemesSource).not.toMatch(/\{\s*mode: '(?:minimalDark|candyBlue)'/);
    expect(settingsThemesSource).toMatch(/\{\s*mode: 'gold'[^}]*rewardOnly: true/);
  });

  it('preserves every Midnight grandfather exception', () => {
    expect(source).toContain("const grandfathered = pairs[2]?.[1] === '1' || themeStr === 'midnight';");
    expect(source).toContain("const premiumLocked = PREMIUM_ONLY_THEMES.includes(t) && !(t === 'midnight' && grandfathered);");
    expect(source).toContain("if (m === 'midnight' && midnightGrandfathered) {");
    expect(source).toContain("if (mode === 'midnight' && midnightGrandfathered) return true;");
  });
});
