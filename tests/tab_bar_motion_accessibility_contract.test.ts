import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.resolve(__dirname, '..', 'app', '(tabs)', '_layout.tsx'), 'utf8');

describe('tab bar motion and accessibility', () => {
  test('exposes selected tab semantics without delaying navigation', () => {
    expect(source).toContain('accessibilityRole="tab"');
    expect(source).toContain('accessibilityState={{ selected: visuallyFocused }}');
    // Visible items may skip a logical tab (tournaments is temporarily hidden),
    // so navigation must use the preserved logical index rather than bar position.
    expect(source).toContain('onPress={() => goToTab(tab.logicalIdx)}');
  });

  test('keeps event-driven native-driver feedback', () => {
    expect(source).toContain('useNativeDriver: true');
    expect(source).toContain('tabHighlightAnim');
    expect(source).toContain('Animated.spring(tabHighlightAnim');
    expect(source).toContain('Animated.spring(tabPressAnim');
    expect(source).not.toMatch(/Animated\.loop\([^)]*tabPress/s);
  });

  test('uses fill and shadow without tabbar or active-tab outlines', () => {
    expect(source).not.toContain('borderWidth: isSagePorcelainTabChrome ? 1 : 0');
    expect(source).not.toContain("borderColor: isSagePorcelainTabChrome ? t.btnShadow : 'transparent'");
    expect(source).not.toContain('const tabActiveBorder =');
    expect(source).not.toContain('borderColor: tabActiveBorder');
    expect(source).not.toContain('tabActivePill: {\n    position: \'absolute\',\n    width: TAB_ACTIVE_PILL_WIDTH,\n    height: TAB_ACTIVE_PILL_HEIGHT,\n    borderRadius: TAB_ACTIVE_PILL_HEIGHT / 2,\n    borderWidth: 1,');
  });
});
