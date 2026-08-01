import fs from 'fs';
import path from 'path';
import { SAGE_PORCELAIN } from '../constants/theme';
import { SAGE_PORCELAIN_CHROME, sagePorcelainShadow } from '../constants/sagePorcelainChrome';

describe('Sage Porcelain ThemeContext contract', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'ThemeContext.tsx'), 'utf8');

  it('wires Sage Porcelain into the free runtime theme policy', () => {
    expect(source).toContain('sagePorcelain: SAGE_PORCELAIN');
    expect(source).toMatch(/const CYCLE: ThemeMode\[\] = \['indigo', 'sagePorcelain',/);
    expect(source).not.toMatch(/PREMIUM_ONLY_THEMES[^\n]*sagePorcelain/);
    expect(source).not.toMatch(/REMOVED_THEME_MODES[^\n]*sagePorcelain/);
    expect(source).toContain("migrated === 'sagePorcelain'");
    expect(source).toContain("const isDark = !isLightThemeMode(themeMode);");
    expect(source).toContain('const statusBarLight = isDark;');
    expect(source).toContain("const isFlat = themeMode === 'business' || themeMode === 'businessLight';");
  });

  it('uses the approved quiet shadow levels', () => {
    expect(sagePorcelainShadow(1)).toEqual({
      shadowColor: '#23322B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    });
    expect(sagePorcelainShadow(2)).toEqual({
      shadowColor: '#23322B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 12, elevation: 4,
    });
    expect(sagePorcelainShadow(3)).toEqual({
      shadowColor: '#23322B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 20, elevation: 7,
    });
    expect(source).toContain("if (themeMode === 'sagePorcelain') return sagePorcelainShadow(level);");
    expect(SAGE_PORCELAIN.shadowDark).toBe('#23322B');
  });

  it('exports the approved Sage Porcelain chrome tokens', () => {
    expect(SAGE_PORCELAIN_CHROME).toEqual({
      accentHover: '#294E43',
      accentPressed: '#223F37',
      focusRing: '#8FC0AA',
      info: '#2E5366',
      infoBg: '#DDEBF0',
      disabledBg: '#D1D9D1',
      disabledText: '#61706A',
    });
  });
});
