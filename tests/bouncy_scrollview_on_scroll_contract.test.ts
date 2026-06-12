import fs from 'fs';
import path from 'path';

describe('BouncyScrollView onScroll contract', () => {
  const source = fs.readFileSync(path.join(__dirname, '../components/BouncyScrollView.tsx'), 'utf8');
  const sourceWithoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  it('documents the locked v9 architecture so native-only regressions are obvious', () => {
    expect(source).toContain('АРХИТЕКТУРА v9');
    expect(source).toContain('iOS native bounce + Android edge-pull fallback');
    expect(source).toContain('native ScrollView часто клампит contentOffset');
  });

  it('does not blindly call non-function Animated.event objects as functions', () => {
    expect(source).toContain('function dispatchScrollProp');
    expect(source).not.toContain('(onScroll as ((e: NativeSyntheticEvent<NativeScrollEvent>) => void) | undefined)?.(e);');
  });

  it('does not depend on Android overscroll contentOffset escaping the scroll bounds', () => {
    expect(source).toContain("import { rubberBand, BOUNCE_SPRING } from './bounceMath';");
    expect(sourceWithoutComments).toContain("Gesture.Pan()");
    expect(sourceWithoutComments).toContain('.enabled(isAndroid)');
    expect(sourceWithoutComments).toContain('applyEdgePull(stretch, scrollY, layoutHeight, contentHeight, e.translationY, dim);');
    expect(sourceWithoutComments).toContain("React.cloneElement(child as React.ReactElement<any>, { overScrollMode: 'never' })");
    expect(sourceWithoutComments).not.toContain('const target = bounceOffset(y, layoutH, contentH, dim);');
    expect(sourceWithoutComments).not.toContain("overScrollMode={Platform.OS === 'android' ? 'always' : 'never'}");
    expect(sourceWithoutComments).toContain('overScrollMode="never"');
  });

  it('guards against the old glitchy pan wrapper', () => {
    expect(sourceWithoutComments).toContain('Gesture.Native()');
    expect(sourceWithoutComments).toContain('.simultaneousWithExternalGesture(nativeGesture)');
    expect(sourceWithoutComments).toContain('Gesture.Simultaneous(nativeGesture, pan)');
    expect(sourceWithoutComments).toContain('.failOffsetX([-18, 18])');
    expect(sourceWithoutComments).toContain("if (!isAndroid) {\n        return <Animated.View style={[{ flex: 1 }, style]}>{scrollChild}</Animated.View>;");
    expect(sourceWithoutComments).not.toContain('onTouchMove={handleTouchMove}');
  });
});
