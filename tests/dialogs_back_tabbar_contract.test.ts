import fs from 'fs';
import path from 'path';
import { tabIconOpacity } from '../app/tab_icon_visibility';

const source = (relativePath: string) => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('dialogs back and tab chrome navigation contract', () => {
  it('returns internal Lessons pages to the lessons list before leaving the screen', () => {
    // зачем 2026-08-02: таб «Уроки» стал push-маршрутом — «назад» ведёт через
    // safeRouterBack (честная история), но внутренние страницы (Диалоги/V2)
    // по-прежнему сначала возвращаются на список, а не выкидывают с экрана.
    const lessons = source(path.join('app', '(tabs)', 'lessons.tsx'));

    expect(lessons).toMatch(
      /const handleLessonsBack = useCallback\(\(\) => \{\s*if \(page !== 'lessons'\) \{\s*setPage\('lessons'\);\s*return;\s*\}[\s\S]*?safeRouterBack\(router, HOME_BACK_FALLBACK as any\);\s*\}, \[page, router\]\);/,
    );
    expect(lessons).toContain('onPress={handleLessonsBack}');
    expect(lessons).not.toContain('onPress={() => goHome()}');
  });

  it('expands tab chrome for every actual visual tab change, including context navigation', () => {
    const layout = source(path.join('app', '(tabs)', '_layout.tsx'));

    expect(layout).toMatch(
      /const previousVisualTabIdxRef = useRef\(visualIdx\);[\s\S]*?useLayoutEffect\(\(\) => \{\s*if \(previousVisualTabIdxRef\.current === visualIdx\) return;\s*previousVisualTabIdxRef\.current = visualIdx;\s*tabScrollLastYRef\.current = 0;\s*tabScrollAnchorYRef\.current = 0;\s*tabScrollDrivenRef\.current = false;\s*animateTabChrome\(false, true\);\s*\}, \[animateTabChrome, visualIdx\]\);/,
    );
  });

  it('keeps the focused icon opaque across collapsed and expanded chrome', () => {
    expect(tabIconOpacity(false, 1)).toBe(0);
    expect(tabIconOpacity(true, 1)).toBe(1);
    expect(tabIconOpacity(false, 0)).toBe(1);

    const layout = source(path.join('app', '(tabs)', '_layout.tsx'));
    expect(layout).toContain('function TabBarIcon(');
    expect(layout).toContain('style={tabIconVisibilityStyle}');
    expect(layout).not.toContain('visuallyFocused ? undefined : tabInactiveIconStyle');
  });
});
