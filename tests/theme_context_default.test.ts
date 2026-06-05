import fs from 'fs';
import path from 'path';

describe('ThemeContext default theme', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'ThemeContext.tsx'), 'utf8');

  it('uses Compass as the first-run and fallback app theme', () => {
    expect(source).toContain("const DEFAULT_THEME_MODE: ThemeMode = 'compass'");
    expect(source).toContain('useState<ThemeMode>(DEFAULT_THEME_MODE)');
    expect(source).toContain("void AsyncStorage.setItem('app_theme', DEFAULT_THEME_MODE)");
    expect(source).not.toContain("const defaultThemeMode: ThemeMode = 'minimalDark'");
  });
});
