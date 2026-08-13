import fs from 'fs';
import path from 'path';
import { BG_GRADIENTS } from '../constants/screenBackground';

describe('Sage Porcelain background contract', () => {
  const screenGradient = fs.readFileSync(path.join(__dirname, '..', 'components', 'ScreenGradient.tsx'), 'utf8');

  it('uses the approved calm porcelain gradient stops', () => {
    expect(BG_GRADIENTS.sagePorcelain).toEqual(['#E7EAE2', '#DCE1D8', '#CDD5C7']);
  });

  it('omits cinema bloom and orbs instead of making them invisible', () => {
    expect(screenGradient).toContain('bloomMode: ThemeMode | null;');
    expect(screenGradient).toMatch(/const bloomMode = themeMode === 'sagePorcelain' \|\| themeMode === 'olive' \? null : themeMode;/);
    expect(screenGradient).toMatch(/sagePorcelain:\s*\[\]/);
    expect(screenGradient).toMatch(/layer\.bloomMode\s*\?\s*\(\s*<CinemaBloom mode=\{layer\.bloomMode\} reduceMotion=\{reduceMotion\} \/>\s*\)/s);
  });

  it('keeps Sage explicit in every exhaustive background map', () => {
    expect(screenGradient).toMatch(/sagePorcelain:\s*1,/);
    expect(screenGradient).toMatch(/sagePorcelain:\s*\{ bloomA: '#D9E9E1', bloomB: '#DCE1D8' \},/);
    expect(screenGradient).toMatch(/sagePorcelain:\s*\[\],/);
  });
});
