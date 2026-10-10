import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'components', 'PressableScale.tsx'), 'utf8');

describe('canonical PressableScale motion contract', () => {
  test('offers the four approved interaction variants', () => {
    expect(source).toContain("export type PressableScaleVariant = 'icon' | 'flat' | 'card' | 'primary'");
    expect(source).toContain('variant?: PressableScaleVariant');
    expect(source).toContain("const pressedScale = pressScaleTo ?? scaleTo ?? (variant ? VARIANT_SCALE[variant] : KIT_PRESS_SCALE)");
  });

  // зачем (координатор 10.10, гейт «приложение = макет»): три общие обёртки нажатия держат ОДНО движение кита
  // (kit.css `.t`: вдавливание 90 мс до .97 + opacity .86, отпускание 240 мс cubic-bezier(.3,1.4,.5,1)) через constants/kitPress.
  test('all shared press wrappers use the single kit press motion (no per-wrapper springs)', () => {
    const kit = fs.readFileSync(path.join(ROOT, 'constants', 'kitPress.ts'), 'utf8');
    expect(kit).toContain('KIT_MOTION.pressDownMs');
    expect(kit).toContain('KIT_MOTION.pressMs');
    expect(kit).toContain('KIT_MOTION.pressEase');
    expect(kit).toContain('KIT_MOTION.pressOpacity');
    for (const file of ['PressableScale.tsx', 'TapScale.tsx', 'PressableHybrid.tsx']) {
      const wrapper = fs.readFileSync(path.join(ROOT, 'components', file), 'utf8');
      expect(wrapper).toContain("from '../constants/kitPress'");
      expect(wrapper).toContain('...KIT_PRESS_DOWN');
      expect(wrapper).toContain('...KIT_PRESS_UP');
      expect(wrapper).not.toContain('Animated.spring');
    }
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
