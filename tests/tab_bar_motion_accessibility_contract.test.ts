import fs from 'fs';
import path from 'path';

const layout = fs.readFileSync(path.resolve(__dirname, '..', 'app', '(tabs)', '_layout.tsx'), 'utf8');
const bar = fs.readFileSync(path.resolve(__dirname, '..', 'components', 'v2', 'V2TabBar.tsx'), 'utf8');

// зачем (2.0, D39/D43; перенацелено 2026-09-30): таббар переехал из _layout в
// components/v2/V2TabBar.tsx (капсула Liquid Glass по макету system.html). Сторож
// держит то, что важно человеку: семантика вкладок, мгновенная навигация, отклик
// нажатия на нативном драйвере без бесконечных циклов и точка «есть новое».
describe('tab bar motion and accessibility', () => {
  test('exposes selected tab semantics without delaying navigation', () => {
    expect(bar).toContain('accessibilityRole="tab"');
    expect(bar).toContain('accessibilityState={{ selected: on }}');
    expect(bar).toContain('accessibilityLabel={item.label}');
    expect(layout).toContain('goToTab(tab.logicalIdx);');
  });

  test('keeps event-driven native-driver feedback', () => {
    expect(bar).toContain('useNativeDriver: true');
    expect(bar).not.toMatch(/Animated\.loop\(/);
  });

  test('community dot comes from the local notification cache, not a new listener', () => {
    expect(bar).toContain('testID={`tab-${item.key}-badge`}');
    expect(layout).toContain("badge: tab.key === 'community' && communityDot");
    const hook = fs.readFileSync(path.resolve(__dirname, '..', 'hooks', 'use_community_tab_dot.ts'), 'utf8');
    expect(hook).toContain('readCachedUserNotifications');
    expect(hook).not.toMatch(/onSnapshot|getFirestore|refreshUserNotificationsOnce/);
  });
});
