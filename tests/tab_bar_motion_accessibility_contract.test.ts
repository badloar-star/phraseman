import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.resolve(__dirname, '..', 'app', '(tabs)', '_layout.tsx'), 'utf8');

// зачем (2.0, D39/D43): таббар стал панелью «иконка + подпись» без бегущей
// подсветки. Сторож держит то, что важно человеку: семантика вкладок, мгновенная
// навигация и отклик нажатия на нативном драйвере, без бесконечных циклов.
describe('tab bar motion and accessibility', () => {
  test('exposes selected tab semantics without delaying navigation', () => {
    expect(source).toContain('accessibilityRole="tab"');
    expect(source).toContain('accessibilityState={{ selected: visuallyFocused }}');
    expect(source).toContain('accessibilityLabel={label}');
    expect(source).toContain('goToTab(tab.logicalIdx);');
  });

  test('keeps event-driven native-driver feedback', () => {
    expect(source).toContain('useNativeDriver: true');
    expect(source).toContain('Animated.spring(tabPressAnim');
    expect(source).not.toMatch(/Animated\.loop\([^)]*tabPress/s);
  });

  test('keeps the active tab readable without a highlight capsule', () => {
    expect(source).toContain('const color = visuallyFocused ? v2.text : v2.textSecondary;');
    expect(source).not.toContain('tabActivePill');
    expect(source).not.toContain('const tabActiveBorder =');
  });
});
