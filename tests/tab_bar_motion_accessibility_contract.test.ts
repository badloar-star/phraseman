import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.resolve(__dirname, '..', 'app', '(tabs)', '_layout.tsx'), 'utf8');

describe('tab bar motion and accessibility', () => {
  test('exposes selected tab semantics without delaying navigation', () => {
    expect(source).toContain('accessibilityRole="tab"');
    expect(source).toContain('accessibilityState={{ selected: visuallyFocused }}');
    expect(source).toContain('onPress={() => { goToTab(i); }}');
  });

  test('keeps event-driven native-driver feedback', () => {
    expect(source).toContain('useNativeDriver: true');
    expect(source).not.toMatch(/Animated\.loop\([^)]*tabPress/s);
  });
});
