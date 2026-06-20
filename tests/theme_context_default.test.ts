import fs from 'fs';
import path from 'path';

describe('ThemeContext default theme', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'ThemeContext.tsx'), 'utf8');
  const settingsThemesSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'settings_themes.tsx'), 'utf8');

  it('uses Midnight as the first-run and fallback app theme', () => {
    expect(source).toContain("const DEFAULT_THEME_MODE: ThemeMode = 'midnight'");
    expect(source).toContain('useState<ThemeMode>(DEFAULT_THEME_MODE)');
    expect(source).toContain("void AsyncStorage.setItem('app_theme', DEFAULT_THEME_MODE)");
    expect(source).not.toContain("const DEFAULT_THEME_MODE: ThemeMode = 'compass'");
  });

  it('keeps Midnight free, moves other non-reward themes behind Premium, and leaves Gold reward-only', () => {
    expect(source).toContain("const PREMIUM_ONLY_THEMES: ThemeMode[] = ['dark', 'coral', 'minimalDark', 'ember', 'aurora', 'volt']");
    expect(settingsThemesSource).toMatch(/\{\s*mode: 'midnight'[^}]*\}/);
    expect(settingsThemesSource).not.toMatch(/\{\s*mode: 'midnight'[^}]*premiumOnly: true/);
    expect(settingsThemesSource).toMatch(/\{\s*mode: 'minimalDark'[^}]*premiumOnly: true/);
    expect(settingsThemesSource).toMatch(/\{\s*mode: 'gold'[^}]*rewardOnly: true/);
  });
});
