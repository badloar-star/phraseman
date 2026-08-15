import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'components', 'PressableScale.tsx'), 'utf8');

describe('canonical PressableScale motion contract', () => {
  test('offers the four approved interaction variants', () => {
    expect(source).toContain("export type PressableScaleVariant = 'icon' | 'flat' | 'card' | 'primary'");
    expect(source).toContain('variant?: PressableScaleVariant');
    expect(source).toContain("const pressedScale = scaleTo ?? (variant ? VARIANT_SCALE[variant] : 0.94)");
  });

  test('keeps feedback event-driven, accessible, and reduced-motion aware', () => {
    expect(source).toContain('useReduceMotion');
    expect(source).toContain('mergeAccessibilityDisabled');
    expect(source).toContain('busy?: boolean');
    expect(source).toContain('silent?: boolean');
    expect(source).not.toMatch(/Animated\.loop|setInterval|withRepeat/);
    expect(source).not.toMatch(/Animated\.(timing|spring)\([^)]*(width|height|margin|padding)/s);
    expect(source).toContain('scale.stopAnimation()');
    expect(source).toContain('opacity.stopAnimation()');
  });

  test('does not emit haptic feedback for unavailable actions', () => {
    expect(source).toContain('const unavailable = Boolean(disabled || busy)');
    expect(source).toContain('if (!silent && !unavailable && withHaptic) hapticTap()');
    const unavailableBlock = source.slice(source.indexOf('if (unavailable)'), source.indexOf('if (reduceMotion)'));
    expect(unavailableBlock).not.toContain('hapticTap()');
    expect(source).toContain('disabled={unavailable}');
  });
});
