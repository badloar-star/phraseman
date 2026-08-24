import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.resolve(__dirname, '..', 'app', '(tabs)', '_layout.tsx'), 'utf8');

describe('tab bar motion and accessibility', () => {
  test('exposes selected tab semantics without delaying navigation', () => {
    // The four navigation destinations are tabs; the optional centre action
    // opens a route and is therefore correctly exposed as a button.
    expect(source).toContain("accessibilityRole={tab.center ? 'button' : 'tab'}");
    expect(source).toContain('accessibilityState={tab.center ? undefined : { selected: visuallyFocused }}');
    // Navigation uses the explicit model index shared with the swipe pager,
    // after the centre-route branch has been handled synchronously.
    expect(source).toContain('goToTab(tab.logicalIdx);');
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
