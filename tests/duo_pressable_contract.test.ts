import { readFileSync } from 'fs';
import path from 'path';

const source = readFileSync(path.join(__dirname, '..', 'components', 'DuoPressable.tsx'), 'utf8');
const popupSource = readFileSync(path.join(__dirname, '..', 'components', 'PopUpActionButton.tsx'), 'utf8');

describe('DuoPressable contract', () => {
  it('draws a static edge layer only when edgeColor is passed, and reserves layout space for it', () => {
    expect(source).toContain('hasEdge ? (');
    expect(source).toContain("hasEdge ? { paddingBottom: edgeHeight } : null");
    expect(source).toContain('backgroundColor: edgeColor');
  });

  it('keeps caller opacity on the wrapper while the face animates press feedback', () => {
    expect(source).toContain('surfaceOpacityStyle');
    expect(source).toContain('surfaceBaseStyle');
    expect(source).toContain('const { opacity: _opacity, ...restStyle }');
    expect(source).toContain('style={[styles.wrap, hasEdge ? { paddingBottom: edgeHeight } : null, surfaceOpacityStyle, wrapStyle]}');
  });

  it('presses via translateY only — no scale, no opacity drop (real keycap physics, not a squish)', () => {
    expect(source).toContain('const travel = hasEdge ? edgeHeight : FLAT_PRESS_TRANSLATE_Y');
    expect(source).toContain('transform: [{ translateY: depth * travel }]');
    expect(source).not.toContain('scale: interpolate');
    expect(source).not.toContain('opacity: interpolate');
    expect(source).toContain(
      '<Reanimated.View style={[styles.surface, surfaceBaseStyle, gradientColors ? styles.surfaceClip : null, faceStyle]}',
    );
  });

  it('reduce motion snaps instantly instead of springing', () => {
    expect(source).toContain('useReduceMotion');
    expect(source).toContain('reduceMotion ? 1 : withTiming(1');
    expect(source).toContain('reduceMotion ? 0 : withSpring(0');
  });

  it('starts visual press feedback immediately and before the native haptic bridge', () => {
    expect(source).toContain('delayPressIn = 0');
    expect(source).toContain('unstable_pressDelay={delayPressIn}');
    const pressInBlock = source.slice(source.indexOf('const pressIn = useCallback'), source.indexOf('const pressOut = useCallback'));
    expect(pressInBlock.indexOf('press.value = withSpring')).toBeLessThan(pressInBlock.indexOf('hapticTap()'));
  });

  it('uses a dark foreground on bright green bottom actions', () => {
    expect(popupSource).toContain("textColor = '#07110A'");
  });
});
