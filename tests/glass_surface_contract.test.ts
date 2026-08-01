import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'components', 'GlassSurface.tsx'), 'utf8');
const FILL_SOURCE = fs.readFileSync(path.join(ROOT, 'constants', 'glassSurfaceFill.ts'), 'utf8');

describe('GlassSurface premium tonal contract', () => {
  it('keeps exactly three static tonal levels and the wrapper-free fill helper', () => {
    expect(SOURCE).toContain("export type GlassTone = 'card' | 'subtle' | 'raised'");
    expect(SOURCE).toContain("export { glassFill } from '../constants/glassSurfaceFill'");
    expect(FILL_SOURCE).toContain('export function glassFill');
    expect(SOURCE).toContain('backgroundColor');
    expect(SOURCE).toContain('isLightThemeMode(themeMode)');
    expect(SOURCE).toContain('sagePorcelainShadow');
  });

  it('does not add runtime-heavy visual effects', () => {
    expect(SOURCE).not.toMatch(/BlurView|backdropFilter|withRepeat|Animated\.loop/);
    expect(SOURCE).not.toMatch(/LinearGradient/);
  });

  it('allows only the optional top highlight instead of a closed border', () => {
    expect(SOURCE).toContain('borderTopWidth: 1');
    expect(SOURCE).not.toMatch(/borderLeftWidth|borderRightWidth|borderBottomWidth/);
  });
});
