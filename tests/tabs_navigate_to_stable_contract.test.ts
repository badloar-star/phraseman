// зачем (координатор 14.10, каскад [TABS-RENDER] после крестика пейвола, патч TABS_RENDER_1): navigateTo зависел от pathname/segments/router,
// и каждая смена маршрута пересоздавала handleTabChange/handleSwipeComplete → новый TabContext.value → перерисовка всех потребителей useTabNav.
// Сторож: navigateTo со стабильной ссылкой (пустые зависимости, маршрут из ref), обработчики вкладок не зависят от маршрута.
import { readSource } from './helpers/read_source';

const source = readSource('app/(tabs)/_layout.tsx');

function callbackBlock(name: string): string {
  const start = source.indexOf(`const ${name} = useCallback(`);
  if (start < 0) throw new Error(`${name} not found`);
  const end = source.indexOf('\n  }, [', start);
  const depsEnd = source.indexOf(']);', end);
  return source.slice(start, depsEnd + 3);
}

describe('tabs layout: navigateTo has a stable identity across route changes', () => {
  it('navigateTo reads the route from refs and has no dependencies', () => {
    const block = callbackBlock('navigateTo');
    expect(block).toMatch(/\n {2}\}, \[\]\);$/);
    expect(block).toContain('routerShowsTab(pathnameRef.current, segmentsRef.current, idx)');
    expect(block).toContain('routerRef.current.navigate(target as any)');
    expect(block).not.toMatch(/routerShowsTab\(pathname, segments/);
    expect(block).not.toMatch(/\brouter\.navigate\(/);
    expect(block).toContain("console.warn('[TABS-NAV] navigateTo: no route for tab', idx)");
  });

  it('the route refs are refreshed on every render', () => {
    expect(source).toContain('const pathnameRef = useRef(pathname);\n  pathnameRef.current = pathname;');
    expect(source).toContain('const segmentsRef = useRef(segments);\n  segmentsRef.current = segments;');
    expect(source).toContain('routerRef.current = router;');
  });

  it('tab handlers passed to TabProvider do not depend on the route', () => {
    for (const name of ['handleTabChange', 'handleSwipeComplete']) {
      const deps = callbackBlock(name).match(/\n {2}\}, \[([^\]]*)\]\);$/);
      expect(deps).not.toBeNull();
      const list = (deps?.[1] ?? '').split(',').map((d) => d.trim()).filter(Boolean);
      expect(list).toEqual(['mountNow', 'navigateTo', 'rememberVisitedTab']);
    }
    expect(callbackBlock('mountNow')).toMatch(/\}, \[\]\);$/);
    expect(callbackBlock('rememberVisitedTab')).toMatch(/\}, \[\]\);$/);
  });
});
