import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'components', 'TonalSurface.tsx'), 'utf8');

describe('TonalSurface gradient container contract', () => {
  it('keeps the shared static surface layer theme-driven', () => {
    expect(SOURCE).toContain("type TonalSurfaceTone = 'card' | 'subtle' | 'raised'");
    expect(SOURCE).toContain("import { LinearGradient } from './SafeLinearGradient'");
    expect(SOURCE).toContain('t.cardGradient');
    expect(SOURCE).toContain('t.accent');
    expect(SOURCE).toContain('gradientLocations');
  });

  it('does not add runtime-heavy visual effects', () => {
    expect(SOURCE).not.toMatch(/BlurView|backdropFilter|filter:\s*['"]?blur/);
    expect(SOURCE).not.toMatch(/withRepeat|Animated\.loop|setInterval|setTimeout/);
  });

  it('preserves a borderless container implementation', () => {
    const componentBody = SOURCE.slice(SOURCE.indexOf('function TonalSurface'));
    expect(componentBody).toContain("overflow: 'hidden'");
    expect(componentBody).not.toMatch(/borderWidth|borderColor|borderTopWidth|borderLeftWidth|borderRightWidth|borderBottomWidth/);
  });
});
