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

  // зачем (владелец 24.09, V2TabBar «Тёплая кромка»): капсула вынесена в components/v2/V2TabBar, ref переименован —
  // смысл тот же: любая смена видимой вкладки сразу разворачивает сжатую капсулу.
  it('expands tab chrome for every actual visual tab change, including context navigation', () => {
    const layout = source(path.join('app', '(tabs)', '_layout.tsx'));

    expect(layout).toMatch(
      /const previousVisualIdxRef = useRef\(visualIdx\);[\s\S]*?useLayoutEffect\(\(\) => \{\s*if \(previousVisualIdxRef\.current === visualIdx\) return;\s*previousVisualIdxRef\.current = visualIdx;\s*tabScrollLastYRef\.current = 0;\s*animateTabChrome\(false, true\);\s*\}, \[animateTabChrome, visualIdx\]\);/,
    );
  });

  // зачем: значки рисует V2TabBar; при сжатии сжимается вся капсула (scale/translate), значки не прячутся.
  it('keeps every icon visible while the whole capsule compacts', () => {
    const layout = source(path.join('app', '(tabs)', '_layout.tsx'));
    const bar = source(path.join('components', 'v2', 'V2TabBar.tsx'));
    expect(bar).toContain('<Ionicons name={on ? item.activeIcon : item.icon}');
    expect(layout).toContain("collapseStyle={{ transformOrigin: '50% 100%', transform: [{ translateY: tabScrollTranslateY }, { scale: tabScrollScale }] }}");
    for (const src of [layout, bar]) {
      expect(src).not.toContain('tabIconOpacity');
      expect(src).not.toContain('tabIconVisibilityStyle');
      expect(src).not.toContain('tab-collapsed-orb');
    }
  });
});
