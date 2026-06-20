import { readFileSync } from 'fs';
import path from 'path';

const source = readFileSync(path.join(__dirname, '..', 'components', 'DuoPressable.tsx'), 'utf8');

describe('DuoPressable contract', () => {
  it('keeps the original 3D edge geometry for button volume', () => {
    expect(source).toContain("import { Pressable, PressableProps, StyleProp, StyleSheet, View, ViewStyle }");
    expect(source).toContain('styles.edge,');
    expect(source).toContain('{ top: edgeHeight }');
    expect(source).toContain('top: 0');
    expect(source).toContain('bottom: 0');
    expect(source).toContain('borderRadius: 16');
    expect(source).not.toContain('styles.edgeBottomStrip');
  });

  it('moves surface opacity to the wrapper so the edge cannot show through as an inner rectangle', () => {
    expect(source).toContain('surfaceOpacityStyle');
    expect(source).toContain('surfaceBaseStyle');
    expect(source).toContain('const { opacity: _opacity, ...restStyle }');
    expect(source).toContain('style={[styles.wrap, { paddingBottom: edgeHeight }, surfaceOpacityStyle, wrapStyle]}');
    expect(source).not.toContain('style={[styles.surface, style, gradientColors ? styles.surfaceClip : null, surfaceStyle]}');
  });

  it('keeps the original press depth animation on the visible surface', () => {
    expect(source).toContain('transform: [{ translateY: interpolate(depth, [0, 1], [0, edgeHeight]) }]');
    expect(source).toContain(
      '<Reanimated.View style={[styles.surface, surfaceBaseStyle, gradientColors ? styles.surfaceClip : null, surfaceStyle]}',
    );
  });
});
