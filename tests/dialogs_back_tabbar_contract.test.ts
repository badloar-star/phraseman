import fs from 'fs';
import path from 'path';

const source = (relativePath: string) => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('dialogs back and tab chrome navigation contract', () => {
  it('returns internal Lessons pages to the lessons list before leaving the screen', () => {
    // зачем 2026-08-02: таб «Уроки» стал push-маршрутом — «назад» ведёт через
    // safeRouterBack (честная история), но внутренние страницы (Диалоги/V2)
    // по-прежнему сначала возвращаются на список, а не выкидывают с экрана.
    const lessons = source(path.join('app', '(tabs)', 'lessons.tsx'));

    expect(lessons).toContain("if (isRetainedTab) {");
    expect(lessons).toContain('goHome();');
    expect(lessons).toContain('safeRouterBack(router, HOME_BACK_FALLBACK as any);');
    expect(lessons).toContain('onPress={handleLessonsBack}');
  });

  it('expands tab chrome for every actual visual tab change, including context navigation', () => {
    const layout = source(path.join('app', '(tabs)', '_layout.tsx'));

    expect(layout).toMatch(
      /const previousVisualTabIdxRef = useRef\(visualIdx\);[\s\S]*?useLayoutEffect\(\(\) => \{\s*if \(previousVisualTabIdxRef\.current === visualIdx\) return;\s*previousVisualTabIdxRef\.current = visualIdx;\s*tabScrollLastYRef\.current = 0;\s*animateTabChrome\(false, true\);\s*\}, \[animateTabChrome, visualIdx\]\);/,
    );
  });

  it('keeps every icon visible while the whole capsule compacts', () => {
    const layout = source(path.join('app', '(tabs)', '_layout.tsx'));
    expect(layout).toContain('<Ionicons name={visuallyFocused ? tab.active : tab.icon}');
    expect(layout).not.toContain('tabIconOpacity');
    expect(layout).not.toContain('tabIconVisibilityStyle');
    expect(layout).not.toContain('tab-collapsed-orb');
  });
});
