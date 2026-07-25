import fs from 'fs';
import path from 'path';

const layoutPath = path.join(__dirname, '..', 'app', '(tabs)', '_layout.tsx');

function readLayout(): string {
  return fs.readFileSync(layoutPath, 'utf8');
}

describe('tabbar scroll chrome contract', () => {
  it('keeps directional native animation instead of per-pixel scaling', () => {
    const source = readLayout();

    expect(source).toContain('const TAB_SCROLL_COLLAPSE_TRIGGER_Y = 36;');
    expect(source).toContain('const TAB_SCROLL_EXPAND_TRIGGER_Y = 10;');
    expect(source).toContain('const TAB_SCROLL_TOGGLE_COOLDOWN_MS = 140;');
    expect(source).toContain('const tabScrollProgress = useRef(new Animated.Value(0)).current;');
    expect(source).toContain('Animated.timing(tabScrollProgress');
    expect(source).toContain('useNativeDriver: true');
    expect(source).toContain('Easing.out(Easing.cubic)');

    expect(source).not.toContain('const tabScrollScale = topFadeScroll?.scrollY.interpolate');
    expect(source).not.toContain('const tabScrollOpacity = topFadeScroll?.scrollY.interpolate');
    expect(source).not.toContain('LESSONS_TAB_IDX');
  });

  // 2026-07-25: осознанная замена «gentle compact» (scale 0.9 / translateY 8 / opacity 0.94)
  // на Bevel-режим по решению владельца: капсула схлопывается в круглый орб слева.
  it('collapses to a single left orb via crossfade, never layout animation', () => {
    const source = readLayout();

    expect(source).toContain('const TAB_CAPSULE_EXIT_SCALE = 0.92;');
    expect(source).toContain('const TAB_COLLAPSED_ORB_ENTER_SCALE = 0.9;');
    expect(source).toContain('const TAB_ORB_HIT_SLOP');
    expect(source).toContain('tabChromeCollapsed');
    expect(source).toContain('testID="tab-collapsed-orb"');
    // Тап по орбу только разворачивает — навигации нет.
    expect(source).toContain('// contract: collapsed-tap-expands-only');
    // Свайп и программная смена таба разворачивают немедленно.
    expect(source).toContain('handleSwipeStartChrome');
    expect(source).toContain('goToTabExpanded');
    // Ни одна анимация таббара не сходит с нативного драйвера.
    expect(source).not.toContain('useNativeDriver: false');
    // Старый «gentle»-режим удалён, а не сосуществует второй веткой.
    expect(source).not.toContain('TAB_SCROLL_COLLAPSED_OPACITY');
  });

  it('keeps swipe tab chrome responsive without moving route state early', () => {
    const source = readLayout();

    expect(source).toContain('const [visualIdx, setVisualIdx]');
    expect(source).toContain('const visualTabIdx = visualIdx;');
    expect(source).toContain('setVisualIdx(idx);');
    expect(source).toContain('visualIdx={visualIdx}');
    expect(source).toContain('а реальный activeIdx/URL переключаются после UI-thread анимации.');
  });
});
