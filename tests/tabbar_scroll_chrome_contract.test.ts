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

  it('preserves the gentle compact visual target', () => {
    const source = readLayout();

    expect(source).toContain('const TAB_SCROLL_COLLAPSED_SCALE = 0.9;');
    expect(source).toContain('const TAB_SCROLL_COLLAPSED_TRANSLATE_Y = 8;');
    expect(source).toContain('const TAB_SCROLL_COLLAPSED_OPACITY = 0.94;');
  });

  it('keeps All Lessons as the second tab and never replaces the bar with an orb', () => {
    const source = readLayout();

    expect(source).toMatch(/const TABS: TabDef\[\] = \[\s*\{ key: 'home'[\s\S]*?\{ key: 'lessons',\s+icon: 'book-outline'/);
    expect(source).toContain("1: '/(tabs)/lessons'");
    expect(source).toContain('key="lessons"');
    expect(source).toContain("placeholder('ph-lessons')");
    expect(source).not.toContain('tab-collapsed-orb');
    expect(source).not.toContain('TAB_ORB_HIT_SLOP');
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
