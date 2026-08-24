import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'components', 'CleanOnboarding.tsx'), 'utf8');

describe('onboarding motion and window geometry', () => {
  it('uses live window dimensions instead of module-load geometry', () => {
    expect(source).toContain('useWindowDimensions');
    expect(source).not.toContain("Dimensions.get('window')");
    expect(source).not.toContain('const PHONE_MOCK_WIDTH =');
    expect(source).not.toContain('const PHONE_MOCK_HEIGHT =');
  });

  it('honors the system reduced-motion setting for ambient and large motion', () => {
    expect(source).toContain("import { useReduceMotion } from '../hooks/use_reduce_motion';");
    expect(source).toContain('if (reduceMotion) {');
    expect(source).toContain('if (reduceMotion) return null;');
    expect(source).toContain('if (!isFocused || reduceMotion)');
  });

  it('uses the shared hybrid motion vocabulary for touched timings', () => {
    expect(source).toContain("from '../constants/motionHybrid'");
    expect(source).toContain('LUM.contentMs');
    expect(source).toContain('LUM.exitMs');
    expect(source).toContain('SUITE.idleFloatMs');
  });
});
