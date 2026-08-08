import fs from 'fs';
import path from 'path';
import { DARK, GOLD } from '../constants/theme';
import { statsAccent, statsThemeAccent } from '../constants/statsThemeChrome';

const SOURCE = fs.readFileSync(path.resolve(__dirname, '..', 'constants', 'statsThemeChrome.ts'), 'utf8');

describe('statistics active-theme accent', () => {
  it('uses the active theme accent for the primary statistics color', () => {
    expect(SOURCE).toContain('DARK,');
    expect(SOURCE).toContain('dark: DARK.accent');
    expect(SOURCE).toContain('gold: GOLD.accent');
    expect(statsThemeAccent('dark')).toBe(DARK.accent);
    expect(statsThemeAccent('gold')).toBe(GOLD.accent);
    expect(statsAccent('dark', 'freeze')).toBe(DARK.accent);
  });
});
