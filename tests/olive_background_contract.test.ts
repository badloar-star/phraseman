import fs from 'fs';
import path from 'path';
import { BG_GRADIENTS } from '../constants/screenBackground';

describe('Olive Noir background contract', () => {
  const screenGradient = fs.readFileSync(path.join(__dirname, '..', 'components', 'ScreenGradient.tsx'), 'utf8');

  it('uses static olive-to-piano-black depth without cinema particles or decorative orbs', () => {
    expect(BG_GRADIENTS.olive).toEqual(['#1A1E12', '#0B0D08', '#030303']);
    expect(screenGradient).toContain("olive: []");
    expect(screenGradient).toContain("themeMode === 'sagePorcelain' || themeMode === 'olive' ? null : themeMode");
  });
});
